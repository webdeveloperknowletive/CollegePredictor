

from pathlib import Path

import sys

import re

import math

import pandas as pd

from sqlalchemy import text



ROOT = Path(__file__).resolve().parent.parent

RAW_DIR = ROOT / "data" / "raw"



sys.path.insert(0, str(ROOT / "backend"))

from app.database import engine



CAP_FILES = [

    ("Egg Cap 1 cutoffs 2025.xlsx", 1),

    ("Egg Cap 2 cutoffs 2025.xlsx", 2),

    ("Egg Cap 3 cutoffs 2025.xlsx", 3),

    ("Egg Cap 4 cutoffs 2025.xlsx", 4),

]



METADATA_COLUMNS = {

    "college_code",

    "college_name",

    "dept_code",

    "dept_name",

    "status",

    "level",

    "stage",

    "sr no",

}





def clean_code(value):

    """Normalize numeric Excel codes without leading zeroes."""

    if pd.isna(value):

        return None



    if isinstance(value, (int, float)):

        return str(int(value))



    value = str(value).strip()



    if value.endswith(".0"):

        value = value[:-2]



    return value





def clean_text(value):

    if pd.isna(value):

        return None

    return str(value).strip()





def parse_cutoff(value):

    """Return rank, percentile and original value."""

    if pd.isna(value):

        return None



    original = str(value).strip()



    match = re.fullmatch(
        r"([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)",
        original,
    )




    if not match:

        raise ValueError(f"Unrecognized cutoff value: {original!r}")



    rank = int(match.group(1).replace(",", ""))

    percentile = float(match.group(2))



    if not math.isfinite(percentile) or not 0 <= percentile <= 100:

        raise ValueError(f"Invalid percentile: {original!r}")



    return {

        "rank": rank,

        "percentile": percentile,

        "original": original,

    }





def main():

    # Read and validate every source file before opening a transaction.

    frames = []

    required_columns = {

        "college_code",

        "college_name",

        "dept_code",

        "dept_name",

        "status",

        "level",

        "stage",

    }



    for filename, round_number in CAP_FILES:

        path = RAW_DIR / filename



        if not path.exists():

            raise FileNotFoundError(f"CAP file not found: {path}")



        df = pd.read_excel(path, sheet_name="Sheet1")



        missing = required_columns - set(df.columns)

        if missing:

            raise ValueError(

                f"{filename} is missing columns: {sorted(missing)}"

            )



        if df["college_code"].isna().any():

            raise ValueError(f"{filename} has rows without college codes")



        if df["dept_code"].isna().any():

            raise ValueError(f"{filename} has rows without branch codes")



        category_columns = [

            column for column in df.columns

            if str(column).strip().casefold() not in METADATA_COLUMNS

        ]



        # Parse all non-empty values before writing anything.

        cutoff_count = 0

        for column in category_columns:

            for value in df[column]:

                if not pd.isna(value):

                    parse_cutoff(value)

                    cutoff_count += 1



        frames.append({

            "filename": filename,

            "round": round_number,

            "df": df,

            "categories": category_columns,

        })



        print(

            f"Validated CAP {round_number}: "

            f"{len(df)} rows, {cutoff_count} cutoff values"

        )



    # Build a consistent branch-code-to-name mapping.

    branch_names = {}



    for frame in frames:

        df = frame["df"]



        for _, row in df[["dept_code", "dept_name"]].drop_duplicates().iterrows():

            code = clean_code(row["dept_code"])

            name = clean_text(row["dept_name"])



            if not code or not name:

                raise ValueError("Found a missing branch code or name")



            if code in branch_names and branch_names[code] != name:

                raise ValueError(

                    f"Branch code {code} has conflicting names: "

                    f"{branch_names[code]!r} and {name!r}"

                )



            branch_names[code] = name



    print(f"\nUnique branches to process: {len(branch_names)}")



    colleges_inserted = 0

    college_branches_added = 0

    cutoff_rows_processed = 0

    cutoff_values_processed = 0



    # All database writes occur in one transaction.

    # Any error causes the transaction to roll back.

    with engine.begin() as connection:



        # Load the existing college code-to-ID mapping.

        college_rows = connection.execute(

            text("SELECT id, institute_code FROM colleges")

        ).fetchall()



        college_ids = {

            clean_code(row.institute_code): row.id

            for row in college_rows

        }



        # Check every source college code before inserting data.

        source_college_codes = set()



        for frame in frames:

            source_college_codes.update(

                clean_code(value)

                for value in frame["df"]["college_code"]

            )



        missing_colleges = sorted(

            code for code in source_college_codes

            if code not in college_ids

        )



        if missing_colleges:

            raise ValueError(

                "CAP files reference college codes missing from the "

                f"colleges table: {missing_colleges[:20]}"

            )



        # Insert branches. Existing branch codes are updated safely.

        branch_sql = text("""

            INSERT INTO branches (branch_code, branch_name)

            VALUES (:code, :name)

            ON CONFLICT (branch_code)

            DO UPDATE SET branch_name = EXCLUDED.branch_name

        """)



        for code, name in branch_names.items():

            connection.execute(

                branch_sql,

                {"code": code, "name": name},

            )



        branch_rows = connection.execute(

            text("SELECT id, branch_code FROM branches")

        ).fetchall()



        branch_ids = {

            clean_code(row.branch_code): row.id

            for row in branch_rows

        }



        # Connect every college to its branches.

        link_sql = text("""

            INSERT INTO college_branches (college_id, branch_id)

            VALUES (:college_id, :branch_id)

            ON CONFLICT (college_id, branch_id) DO NOTHING

        """)



        linked_pairs = set()



        for frame in frames:

            df = frame["df"]



            pairs = df[["college_code", "dept_code"]].drop_duplicates()



            for _, row in pairs.iterrows():

                college_code = clean_code(row["college_code"])

                branch_code = clean_code(row["dept_code"])

                pair = (college_code, branch_code)



                if pair in linked_pairs:

                    continue



                linked_pairs.add(pair)



                result = connection.execute(

                    link_sql,

                    {

                        "college_id": college_ids[college_code],

                        "branch_id": branch_ids[branch_code],

                    },

                )



                college_branches_added += result.rowcount



        # SQL statements for CAP rows and category cutoffs.

        cutoff_sql = text("""
            INSERT INTO cap_cutoffs (
                college_branch_id,
                academic_year,
                cap_round,
                status,
                level,
                stage,
                source_row_number,
                source_file
            )
            VALUES (
                :college_branch_id,
                :academic_year,
                :cap_round,
                :status,
                :level,
                :stage,
                :source_row_number,
                :source_file
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

        value_sql = text("""

            INSERT INTO cutoff_values (

                cap_cutoff_id,

                category_code,

                closing_rank,

                percentile,

                original_value

            )

            VALUES (

                :cap_cutoff_id,

                :category_code,

                :closing_rank,

                :percentile,

                :original_value

            )

            ON CONFLICT (cap_cutoff_id, category_code)

            DO UPDATE SET

                closing_rank = EXCLUDED.closing_rank,

                percentile = EXCLUDED.percentile,

                original_value = EXCLUDED.original_value

        """)



        # Cache college-branch links to avoid repeated SELECT queries.

        college_branch_rows = connection.execute(

            text("""

                SELECT cb.id, c.institute_code, b.branch_code

                FROM college_branches cb

                JOIN colleges c ON c.id = cb.college_id

                JOIN branches b ON b.id = cb.branch_id

            """)

        ).fetchall()



        college_branch_ids = {

            (clean_code(row.institute_code), clean_code(row.branch_code)): row.id

            for row in college_branch_rows

        }



        for frame in frames:

            filename = frame["filename"]

            round_number = frame["round"]

            df = frame["df"]

            categories = frame["categories"]



            for index, row in df.iterrows():

                college_code = clean_code(row["college_code"])

                branch_code = clean_code(row["dept_code"])



                cb_key = (college_code, branch_code)



                if cb_key not in college_branch_ids:

                    raise ValueError(

                        f"Missing college-branch link: {cb_key}"

                    )



                cutoff_result = connection.execute(

                    cutoff_sql,

                    {

                        "college_branch_id": college_branch_ids[cb_key],

                        "academic_year": "2025",

                        "cap_round": round_number,

                        "status": clean_text(row["status"]),

                        "level": clean_text(row["level"]),

                        "stage": clean_text(row["stage"]),

                        # Excel row 1 is the header; first data row is 2.

                        "source_row_number": index + 2,

                        "source_file": filename,

                    },

                )



                cutoff_id = cutoff_result.scalar_one()

                cutoff_rows_processed += 1



                for category in categories:

                    value = row[category]



                    if pd.isna(value):

                        continue



                    parsed = parse_cutoff(value)



                    connection.execute(

                        value_sql,

                        {

                            "cap_cutoff_id": cutoff_id,

                            "category_code": str(category).strip(),

                            "closing_rank": parsed["rank"],

                            "percentile": parsed["percentile"],

                            "original_value": parsed["original"],

                        },

                    )



                    cutoff_values_processed += 1



    # Transaction committed successfully.

    print("\nIMPORT COMPLETED SUCCESSFULLY")

    print(f"Branches available: {len(branch_names)}")

    print(f"New college-branch links: {college_branches_added}")

    print(f"CAP source rows processed: {cutoff_rows_processed}")

    print(f"Cutoff values processed: {cutoff_values_processed}")



    with engine.connect() as connection:

        for table in [

            "colleges",

            "branches",

            "college_branches",

            "cap_cutoffs",

            "cutoff_values",

        ]:

            total = connection.execute(

                text(f"SELECT COUNT(*) FROM {table}")

            ).scalar_one()



            print(f"{table}: {total}")





if __name__ == "__main__":

    main()
