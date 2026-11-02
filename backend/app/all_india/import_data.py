
import argparse
import json
import re
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from app.database import engine


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent

DATA_DIR = PROJECT_DIR / "data" / "raw" / "all_india" / "2025"

FILES = {
    1: ("cap1_2025.xlsx", "AI Quota Cutoff (Round 1)"),
    2: ("cap2_2025.xlsx", "AI-MI Quota Cutoff (Round 2)"),
    3: ("cap3_2025.xlsx", "AI-MI Quota Cutoff (Round 3)"),
    4: ("cap4_2025.xlsx", "Raw Data"),
}

YEAR = "2025"


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def clean(value):
    if pd.isna(value):
        return None
    value = str(value).strip()
    return value if value else None


def clean_code(value):
    value = clean(value)
    if value is None:
        return None

    # Excel sometimes reads codes as numbers ending in .0
    if re.fullmatch(r"\d+\.0", value):
        value = value[:-2]

    return value


def clean_rank(value):
    if pd.isna(value):
        return None

    try:
        number = float(str(value).replace(",", "").strip())
        if number.is_integer() and number > 0:
            return int(number)
    except (ValueError, TypeError):
        pass

    return None


def clean_percentile(value):
    if pd.isna(value):
        return None

    try:
        return float(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def json_safe(row):
    result = {}

    for key, value in row.items():
        if pd.isna(value):
            result[str(key)] = None
        elif hasattr(value, "item"):
            result[str(key)] = value.item()
        else:
            result[str(key)] = value

    return json.dumps(result, ensure_ascii=False, default=str)


def get_value(row, *names):
    for name in names:
        if name in row.index:
            return clean(row[name])
    return None


# --------------------------------------------------
# SOURCE MAPPING
# --------------------------------------------------

def map_record(row, round_number):
    if round_number in (1, 2, 3):
        college_code = clean_code(row["College Code"])
        college_name = clean(row["College Name"])
        choice_code = clean_code(row["Choice Code"])
        course_name = clean(row["Department / Course"])

        merit_exam = clean(row["Merit Exam"])
        rank = clean_rank(row["All India Merit Rank"])
        percentile = clean_percentile(row["Score/Percentile"])

        allotment_type = clean(row["Allotment Type"])
        seat_type = clean(row["Category (Seat Type)"])

    else:
        college_code = clean_code(row["Institute Code"])
        college_name = clean(row["Institute Name"])
        choice_code = clean_code(row["Choice Code"])
        course_name = clean(row["Course / Department"])

        merit_exam = clean(row["Merit Exam"])
        rank = clean_rank(row["All India Merit Rank"])
        percentile = clean_percentile(row["Score / Percentile"])

        allotment_type = clean(row["Candidature Type (code)"])

        seat_code = clean(row["Seat Category Code"])
        seat_meaning = clean(row["Seat Category (caste/category) Meaning"])

        seat_type = (
            f"{seat_code} - {seat_meaning}"
            if seat_code and seat_meaning
            else seat_code or seat_meaning
        )

    if not college_code or not college_name:
        raise ValueError("Missing college/institute code or name")

    if not choice_code or not course_name:
        raise ValueError("Missing choice code or course name")

    return {
        "college_code": college_code,
        "college_name": college_name,
        "choice_code": choice_code,
        "course_name": course_name,
        "merit_exam": merit_exam,
        "rank": rank,
        "percentile": percentile,
        "allotment_type": allotment_type,
        "seat_type": seat_type,
        "raw_data": json_safe(row),
    }


# --------------------------------------------------
# DATABASE INSERTION
# --------------------------------------------------

def get_or_create_college(connection, code, name):
    connection.execute(
        text("""
            INSERT INTO all_india.ai_colleges
                (institute_code, institute_name)
            VALUES (:code, :name)
            ON CONFLICT (institute_code)
            DO UPDATE SET institute_name = EXCLUDED.institute_name
        """),
        {"code": code, "name": name},
    )

    return connection.execute(
        text("""
            SELECT id
            FROM all_india.ai_colleges
            WHERE institute_code = :code
        """),
        {"code": code},
    ).scalar_one()


def get_or_create_branch(connection, choice_code, course_name):
    connection.execute(
        text("""
            INSERT INTO all_india.ai_branches
                (choice_code, course_name)
            VALUES (:code, :name)
            ON CONFLICT (choice_code)
            DO UPDATE SET course_name = EXCLUDED.course_name
        """),
        {"code": choice_code, "name": course_name},
    )

    return connection.execute(
        text("""
            SELECT id
            FROM all_india.ai_branches
            WHERE choice_code = :code
        """),
        {"code": choice_code},
    ).scalar_one()


def import_round(round_number, dry_run):
    filename, sheet_name = FILES[round_number]
    filepath = DATA_DIR / filename

    if not filepath.exists():
        raise FileNotFoundError(f"Excel file not found: {filepath}")

    print(f"\nReading CAP Round {round_number}: {filename}")

    dataframe = pd.read_excel(
        filepath,
        sheet_name=sheet_name,
        engine="openpyxl",
    )

    print(f"Source rows: {len(dataframe)}")

    required_columns = (
        [
            "College Code",
            "College Name",
            "Choice Code",
            "Department / Course",
            "Merit Exam",
            "All India Merit Rank",
            "Score/Percentile",
            "Allotment Type",
            "Category (Seat Type)",
        ]
        if round_number in (1, 2, 3)
        else [
            "Choice Code",
            "Institute Code",
            "Institute Name",
            "Course / Department",
            "Merit Exam",
            "All India Merit Rank",
            "Score / Percentile",
            "Candidature Type (meaning)",
            "Seat Category Code",
            "Seat Category (caste/category) Meaning",
        ]
    )

    missing_columns = [
        column for column in required_columns
        if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(
            f"CAP {round_number} missing columns: {missing_columns}"
        )

    records = []
    issues = []

    for index, row in dataframe.iterrows():
        try:
            record = map_record(row, round_number)
            record["source_row_number"] = int(index) + 2
            records.append(record)

            if record["rank"] is None or record["percentile"] is None:
                issues.append({
                    "row_number": int(index) + 2,
                    "issue_type": "MISSING_RANK_OR_PERCENTILE",
                    "description": "Rank or percentile is missing",
                    "raw_data": record["raw_data"],
                })

        except Exception as exc:
            issues.append({
                "row_number": int(index) + 2,
                "issue_type": "INVALID_SOURCE_ROW",
                "description": str(exc),
                "raw_data": json_safe(row),
            })

    print(f"Valid rows: {len(records)}")
    print(f"Rows with quality issues: {len(issues)}")

    if dry_run:
        print("DRY RUN: No database records inserted.")
        return

    source_file = filename

    # Each round is handled in its own transaction.
    # Re-running replaces only this year's same CAP round
    # inside the isolated all_india schema.
    with engine.begin() as connection:

        connection.execute(
            text("""
                DELETE FROM all_india.ai_cutoffs
                WHERE academic_year = :year
                  AND cap_round = :round
            """),
            {"year": YEAR, "round": round_number},
        )

        connection.execute(
            text("""
                DELETE FROM all_india.ai_data_quality_issues
                WHERE cap_round = :round
            """),
            {"round": round_number},
        )

        connection.execute(
            text("""
                DELETE FROM all_india.ai_import_batches
                WHERE academic_year = :year
                  AND cap_round = :round
            """),
            {"year": YEAR, "round": round_number},
        )

        for record in records:
            college_id = get_or_create_college(
                connection,
                record["college_code"],
                record["college_name"],
            )

            branch_id = get_or_create_branch(
                connection,
                record["choice_code"],
                record["course_name"],
            )

            connection.execute(
                text("""
                    INSERT INTO all_india.ai_cutoffs (
                        academic_year,
                        cap_round,
                        college_id,
                        branch_id,
                        all_india_merit_rank,
                        percentile,
                        merit_exam,
                        allotment_type,
                        seat_type,
                        source_row_number,
                        source_file,
                        raw_data
                    )
                    VALUES (
                        :year, :round, :college_id, :branch_id,
                        :rank, :percentile, :exam, :allotment,
                        :seat, :row_number, :source_file,
                        CAST(:raw_data AS JSONB)
                    )
                """),
                {
                    "year": YEAR,
                    "round": round_number,
                    "college_id": college_id,
                    "branch_id": branch_id,
                    "rank": record["rank"],
                    "percentile": record["percentile"],
                    "exam": record["merit_exam"],
                    "allotment": record["allotment_type"],
                    "seat": record["seat_type"],
                    "row_number": record["source_row_number"],
                    "source_file": source_file,
                    "raw_data": record["raw_data"],
                },
            )

        for issue in issues:
            connection.execute(
                text("""
                    INSERT INTO all_india.ai_data_quality_issues (
                        cap_round,
                        source_row_number,
                        issue_type,
                        issue_description,
                        raw_data
                    )
                    VALUES (
                        :round, :row_number, :issue_type,
                        :description, CAST(:raw_data AS JSONB)
                    )
                """),
                {
                    "round": round_number,
                    "row_number": issue["row_number"],
                    "issue_type": issue["issue_type"],
                    "description": issue["description"],
                    "raw_data": issue["raw_data"],
                },
            )

        connection.execute(
            text("""
                INSERT INTO all_india.ai_import_batches (
                    academic_year,
                    cap_round,
                    source_file,
                    total_rows,
                    imported_rows,
                    rejected_rows
                )
                VALUES (
                    :year, :round, :source_file,
                    :total, :imported, :rejected
                )
            """),
            {
                "year": YEAR,
                "round": round_number,
                "source_file": source_file,
                "total": len(dataframe),
                "imported": len(records),
                "rejected": len(issues),
            },
        )

    print(f"CAP {round_number} imported successfully.")


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Import 2025 All India CAP cutoff data"
    )

    parser.add_argument(
        "--commit",
        action="store_true",
        help="Actually write records to the database",
    )

    parser.add_argument(
        "--round",
        type=int,
        choices=[1, 2, 3, 4],
        help="Import only one CAP round",
    )

    args = parser.parse_args()

    dry_run = not args.commit

    print("=" * 55)
    print("2025 ALL INDIA CAP DATA IMPORTER")
    print("=" * 55)
    print("Database mode:", "COMMIT" if args.commit else "DRY RUN")
    print("Source folder:", DATA_DIR)

    rounds = [args.round] if args.round else [1, 2, 3, 4]

    for round_number in rounds:
        import_round(round_number, dry_run)

    print("\nAll selected rounds processed.")
    if dry_run:
        print("No database changes were made.")
        print("Review the output before using --commit.")


if __name__ == "__main__":
    main()
