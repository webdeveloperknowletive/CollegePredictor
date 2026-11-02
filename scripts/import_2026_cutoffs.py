"""Safely import only Maharashtra 2026 CAP 3 and CAP 4 cutoff data.

Run from project root:
    backend\venv\Scripts\python.exe scripts\import_2026_cutoffs.py --dry-run

Only after validating cleaned Excel data against official PDFs:
    backend\venv\Scripts\python.exe scripts\import_2026_cutoffs.py --commit

This script does not re-import CAP 1, CAP 2, or any 2025 rounds.
A dry run validates workbook structure and cutoff formatting; it does NOT
prove that every value matches the official PDF.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
import sys

import pandas as pd
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.database import engine  # noqa: E402

# Deliberately limited to the cleaned CAP3/CAP4 candidate workbooks.
FILES = [
    (ROOT / "data" / "raw" / "2026" / "CAP3_2026_CLEANED.xlsx", 3),
    (ROOT / "data" / "raw" / "2026" / "CAP4_2026_CLEANED.xlsx", 4),
]

META = {
    "sr no", "college code", "college name", "branch code", "branch name",
    "status", "home university", "level", "stage", "source pdf page",
}


def clean_code(value):
    """Normalize college/branch codes without converting missing values to text."""
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if not math.isfinite(float(value)):
            return None
        if float(value).is_integer():
            return str(int(value))
        return str(value).strip()
    result = str(value).strip()
    if result.endswith(".0") and result[:-2].isdigit():
        result = result[:-2]
    return result or None


def clean_text(value):
    """Trim text and normalize blank/NaN values to None."""
    if pd.isna(value):
        return None
    result = str(value).strip()
    if not result or result.casefold() in {"nan", "none"}:
        return None
    return result


def parse_cutoff(value):
    """Parse a cutoff cell like '12345 (98.7654%)'; never guess unsupported data."""
    if pd.isna(value):
        return None
    original = str(value).strip()
    if (
        not original
        or original in {"-", "—", "–"}
        or original.casefold() in {"na", "n/a", "nil", "none"}
    ):
        return None

    match = re.fullmatch(r"([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)", original)
    if not match:
        raise ValueError(f"Unsupported cutoff cell: {original!r}")

    rank = int(match.group(1).replace(",", ""))
    percentile = float(match.group(2))
    if not math.isfinite(percentile) or not 0 <= percentile <= 100:
        raise ValueError(f"Invalid percentile: {original!r}")
    return rank, percentile, original


def load_source_files():
    frames = []
    problems = []
    total_values = 0

    for path, round_number in FILES:
        if not path.exists():
            raise FileNotFoundError(f"Expected cleaned Excel file not found: {path}")

        df = pd.read_excel(
            path,
            sheet_name="Cutoffs (Wide)",
            dtype={"College Code": str, "Branch Code": str},
        )
        required_columns = {
            "College Code", "College Name", "Branch Code", "Branch Name",
            "Status", "Level",
        }
        missing = required_columns - set(df.columns)
        if missing:
            raise ValueError(f"{path.name} is missing columns: {sorted(missing)}")

        df = df.dropna(how="all")
        categories = [
            column for column in df.columns
            if str(column).strip().casefold() not in META
        ]
        parsed_rows = []

        for index, row in df.iterrows():
            college_code = clean_code(row["College Code"])
            college_name = clean_text(row["College Name"])
            branch_code = clean_code(row["Branch Code"])
            branch_name = clean_text(row["Branch Name"])

            if not all([college_code, college_name, branch_code, branch_name]):
                problems.append(
                    f"{path.name}, row {index + 2}: missing college or branch code/name"
                )

            values = []
            for category in categories:
                try:
                    parsed = parse_cutoff(row[category])
                except ValueError as error:
                    problems.append(
                        f"{path.name}, row {index + 2}, column {category}: {error}"
                    )
                    continue
                if parsed is not None:
                    values.append((str(category).strip(), parsed))
                    total_values += 1

            parsed_rows.append({
                "row_num": int(index + 2),
                "college_code": college_code,
                "college_name": college_name,
                "branch_code": branch_code,
                "branch_name": branch_name,
                "status": clean_text(row.get("Status")),
                "level": clean_text(row.get("Level")),
                "stage": clean_text(row.get("Stage")),
                "values": values,
            })

        frames.append({"path": path, "round": round_number, "rows": parsed_rows})
        print(
            f"{path.name}: {len(df)} rows | parsed cutoff values so far: {total_values}"
        )

    return frames, problems


def main():
    parser = argparse.ArgumentParser(
        description="Import only cleaned 2026 CAP 3 and CAP 4 cutoff workbooks."
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Validate only; do not write to DB.")
    mode.add_argument("--commit", action="store_true", help="Write validated CAP3/CAP4 data to PostgreSQL.")
    parser.add_argument(
        "--confirm-pdf-validated",
        action="store_true",
        help="Required with --commit after you have compared the cleaned cutoff values against the official CAP3/CAP4 PDFs.",
    )
    args = parser.parse_args()

    if args.commit and not args.confirm_pdf_validated:
        print("\nCOMMIT BLOCKED: first compare the cleaned cutoff values against the official CAP3/CAP4 PDFs.")
        print("When that verification is complete, rerun with --commit --confirm-pdf-validated.")
        return 2

    frames, problems = load_source_files()

    if problems:
        print(f"\nVALIDATION ISSUES: {len(problems)} (showing up to 30)")
        for problem in problems[:30]:
            print(" -", problem)
        if args.commit:
            print("\nABORTED: resolve validation issues first. No database changes were made.")
            return 2

    if args.dry_run:
        if problems:
            print("\nDRY RUN FAILED. No database changes were made.")
            return 2
        print("\nDRY RUN PASSED. No database changes were made.")
        print("Scope: cleaned 2026 CAP 3 and CAP 4 only.")
        print("Reminder: compare values against official PDFs before --commit.")
        return 0

    if problems:
        return 2

    inserted_colleges = 0
    inserted_branches = 0
    linked = 0
    written_rows = 0
    written_values = 0
    deleted_values = 0

    try:
        # All database writes are in one transaction; exceptions roll everything back.
        with engine.begin() as con:
            columns = {
                result[0]
                for result in con.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'cap_cutoffs'
                """))
            }
            required_db = {
                "college_branch_id", "academic_year", "cap_round", "level",
                "stage", "source_row_number", "source_file",
            }
            if not required_db.issubset(columns):
                missing = sorted(required_db - columns)
                raise RuntimeError(f"cap_cutoffs is missing columns: {missing}")
            has_status = "status" in columns

            college_ids = {
                str(row[1]).strip(): row[0]
                for row in con.execute(text("SELECT id, institute_code FROM colleges"))
            }
            source_colleges = {}
            for frame in frames:
                for row in frame["rows"]:
                    source_colleges.setdefault(row["college_code"], row["college_name"])

            for code, name in source_colleges.items():
                if code not in college_ids:
                    result = con.execute(text("""
                        INSERT INTO colleges (institute_code, institute_name, master_data)
                        VALUES (:code, :name, CAST(:metadata AS JSONB))
                        ON CONFLICT (institute_code) DO NOTHING
                        RETURNING id
                    """), {
                        "code": code,
                        "name": name,
                        "metadata": json.dumps({"source": "2026 CAP cleaned Excel"}),
                    }).first()
                    if result:
                        inserted_colleges += 1

            college_ids = {
                str(row[1]).strip(): row[0]
                for row in con.execute(text("SELECT id, institute_code FROM colleges"))
            }

            branch_rows = con.execute(
                text("SELECT id, branch_code, branch_name FROM branches")
            ).fetchall()
            branch_by_code = {
                str(row[1]).strip(): (row[0], str(row[2]).strip())
                for row in branch_rows
            }
            source_branches = {}
            for frame in frames:
                for row in frame["rows"]:
                    source_branches.setdefault((row["branch_code"], row["branch_name"]), None)

            branch_ids = {}
            for source_code, name in source_branches:
                existing = branch_by_code.get(source_code)
                if existing and existing[1] == name:
                    branch_ids[(source_code, name)] = existing[0]
                    continue

                target_code = source_code
                if existing and existing[1] != name:
                    suffix = hashlib.sha1(f"{source_code}|{name}".encode()).hexdigest()[:8]
                    target_code = f"{source_code[:20]}_{suffix}"[:30]

                found = con.execute(text("""
                    SELECT id, branch_name FROM branches WHERE branch_code = :code
                """), {"code": target_code}).first()
                if found and str(found[1]).strip() == name:
                    branch_ids[(source_code, name)] = found[0]
                    continue
                if found:
                    raise RuntimeError(f"Could not safely resolve branch {source_code!r} / {name!r}")

                branch_id = con.execute(text("""
                    INSERT INTO branches (branch_code, branch_name)
                    VALUES (:code, :name) RETURNING id
                """), {"code": target_code, "name": name}).scalar_one()
                inserted_branches += 1
                branch_ids[(source_code, name)] = branch_id

            cb_ids = {}
            for frame in frames:
                for row in frame["rows"]:
                    key = (row["college_code"], row["branch_code"], row["branch_name"])
                    if key in cb_ids:
                        continue
                    college_id = college_ids.get(row["college_code"])
                    if college_id is None:
                        raise RuntimeError(f"College code not found: {row['college_code']!r}")
                    branch_id = branch_ids[(row["branch_code"], row["branch_name"])]
                    result = con.execute(text("""
                        INSERT INTO college_branches (college_id, branch_id)
                        VALUES (:college_id, :branch_id)
                        ON CONFLICT (college_id, branch_id) DO NOTHING
                        RETURNING id
                    """), {"college_id": college_id, "branch_id": branch_id}).first()
                    if result:
                        cb_id = result[0]
                        linked += 1
                    else:
                        cb_id = con.execute(text("""
                            SELECT id FROM college_branches
                            WHERE college_id = :college_id AND branch_id = :branch_id
                        """), {"college_id": college_id, "branch_id": branch_id}).scalar_one()
                    cb_ids[key] = cb_id

            # Only rows from these two cleaned source filenames are inserted/updated.
            for frame in frames:
                source_file = frame["path"].name
                round_number = frame["round"]
                for row in frame["rows"]:
                    link_key = (row["college_code"], row["branch_code"], row["branch_name"])
                    params = {
                        "cb": cb_ids[link_key], "year": "2026", "rnd": round_number,
                        "level": row["level"], "stage": row["stage"],
                        "row": row["row_num"], "file": source_file,
                    }
                    if has_status:
                        sql = text("""
                            INSERT INTO cap_cutoffs (
                                college_branch_id, academic_year, cap_round, status,
                                level, stage, source_row_number, source_file
                            ) VALUES (
                                :cb, :year, :rnd, :status, :level, :stage, :row, :file
                            )
                            ON CONFLICT (source_file, source_row_number)
                            DO UPDATE SET
                                college_branch_id = EXCLUDED.college_branch_id,
                                academic_year = EXCLUDED.academic_year,
                                cap_round = EXCLUDED.cap_round,
                                status = EXCLUDED.status,
                                level = EXCLUDED.level,
                                stage = EXCLUDED.stage
                            RETURNING id
                        """)
                        params["status"] = row["status"]
                    else:
                        sql = text("""
                            INSERT INTO cap_cutoffs (
                                college_branch_id, academic_year, cap_round,
                                level, stage, source_row_number, source_file
                            ) VALUES (
                                :cb, :year, :rnd, :level, :stage, :row, :file
                            )
                            ON CONFLICT (source_file, source_row_number)
                            DO UPDATE SET
                                college_branch_id = EXCLUDED.college_branch_id,
                                academic_year = EXCLUDED.academic_year,
                                cap_round = EXCLUDED.cap_round,
                                level = EXCLUDED.level,
                                stage = EXCLUDED.stage
                            RETURNING id
                        """)

                    cutoff_id = con.execute(sql, params).scalar_one()
                    written_rows += 1

                    # Synchronize categories for this source row: remove stale categories
                    # not present in the current cleaned workbook, then upsert current ones.
                    current_categories = {category for category, _ in row["values"]}
                    existing_categories = con.execute(text("""
                        SELECT category_code FROM cutoff_values WHERE cap_cutoff_id = :id
                    """), {"id": cutoff_id}).scalars().all()
                    for existing_category in existing_categories:
                        if existing_category not in current_categories:
                            con.execute(text("""
                                DELETE FROM cutoff_values
                                WHERE cap_cutoff_id = :id AND category_code = :category
                            """), {"id": cutoff_id, "category": existing_category})
                            deleted_values += 1

                    for category, parsed in row["values"]:
                        rank, percentile, original = parsed
                        con.execute(text("""
                            INSERT INTO cutoff_values (
                                cap_cutoff_id, category_code, closing_rank, percentile, original_value
                            ) VALUES (:id, :category, :rank, :percentile, :original)
                            ON CONFLICT (cap_cutoff_id, category_code)
                            DO UPDATE SET
                                closing_rank = EXCLUDED.closing_rank,
                                percentile = EXCLUDED.percentile,
                                original_value = EXCLUDED.original_value
                        """), {
                            "id": cutoff_id, "category": category, "rank": rank,
                            "percentile": percentile, "original": original,
                        })
                        written_values += 1

        print("\nIMPORT COMMITTED")
        print(f"New colleges: {inserted_colleges}; new branches: {inserted_branches}; new college-branch links: {linked}")
        print(f"2026 CAP 3/4 rows processed: {written_rows}; cutoff values processed: {written_values}")
        print(f"Stale cutoff values removed from imported rows: {deleted_values}")

        with engine.connect() as con:
            print("\nDATABASE COUNTS BY YEAR/ROUND:")
            result = con.execute(text("""
                SELECT academic_year, cap_round, COUNT(*)
                FROM cap_cutoffs
                GROUP BY academic_year, cap_round
                ORDER BY academic_year, cap_round
            """))
            for db_row in result:
                print(tuple(db_row))

    except Exception as error:
        print("IMPORT FAILED; transaction rolled back:", repr(error))
        raise

    return 0


if __name__ == "__main__":
    raise SystemExit(main())