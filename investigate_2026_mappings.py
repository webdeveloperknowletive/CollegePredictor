
import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("backend/.env")

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL was not found in backend/.env")

engine = create_engine(database_url)

try:
    query = text("""
        SELECT
            c.institute_code,
            c.institute_name,
            b.branch_code,
            b.branch_name
        FROM college_branches cb
        JOIN colleges c ON c.id = cb.college_id
        JOIN branches b ON b.id = cb.branch_id
    """)

    with engine.connect() as connection:
        db = pd.read_sql(query, connection)

    for col in ["institute_code", "branch_code"]:
        db[col] = db[col].astype(str).str.strip()

    college_codes = set(db["institute_code"])
    branch_codes = set(db["branch_code"])

    all_unmatched = []

    for filename in ["CAP1_2026.xlsx", "CAP2_2026.xlsx"]:
        path = os.path.join("data", "raw", "2026", filename)

        df = pd.read_excel(
            path,
            sheet_name="Cutoffs (Wide)",
            dtype={"College Code": str, "Branch Code": str},
        )

        for col in ["College Code", "Branch Code"]:
            df[col] = df[col].astype(str).str.strip()

        pairs = df[
            ["College Code", "College Name", "Branch Code", "Branch Name"]
        ].drop_duplicates()

        matched = pairs.merge(
            db[["institute_code", "branch_code"]].drop_duplicates(),
            left_on=["College Code", "Branch Code"],
            right_on=["institute_code", "branch_code"],
            how="left",
            indicator=True,
        )

        unmatched = matched.loc[matched["_merge"].eq("left_only"), ["College Code", "College Name", "Branch Code", "Branch Name"]].copy()

        unmatched["source_file"] = filename
        unmatched["college_code_exists"] = unmatched[
            "College Code"
        ].isin(college_codes)
        unmatched["branch_code_exists"] = unmatched[
            "Branch Code"
        ].isin(branch_codes)

        all_unmatched.append(unmatched)

        print(f"\n{filename}")
        print("Unmatched pairs:", len(unmatched))
        print("\nFirst 20 unmatched records:")
        print(unmatched.head(20).to_string(index=False))

        print("\nCollege code exists in database:")
        print(unmatched["college_code_exists"].value_counts().to_string())

        print("\nBranch code exists in database:")
        print(unmatched["branch_code_exists"].value_counts().to_string())

    report = pd.concat(all_unmatched, ignore_index=True)
    output_path = "data/reports/2026/unmatched_mapping_report.csv"
    report.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"\nReport saved to: {output_path}")

finally:
    engine.dispose()
