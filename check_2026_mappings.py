
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
        SELECT c.institute_code, b.branch_code
        FROM college_branches cb
        JOIN colleges c ON c.id = cb.college_id
        JOIN branches b ON b.id = cb.branch_id
    """)

    with engine.connect() as connection:
        db = pd.read_sql(query, connection)

    for column in ["institute_code", "branch_code"]:
        db[column] = db[column].astype(str).str.strip()

    db_pairs = db.drop_duplicates(
        ["institute_code", "branch_code"]
    )

    print("Unique database mappings:", len(db_pairs))

    for filename in ["CAP1_2026.xlsx", "CAP2_2026.xlsx"]:
        path = os.path.join("data", "raw", "2026", filename)

        df = pd.read_excel(
            path,
            sheet_name="Cutoffs (Wide)",
            dtype={"College Code": str, "Branch Code": str},
        )

        for column in ["College Code", "Branch Code"]:
            df[column] = df[column].str.strip()

        pairs = df[["College Code", "Branch Code"]].drop_duplicates()

        comparison = pairs.merge(
            db_pairs,
            left_on=["College Code", "Branch Code"],
            right_on=["institute_code", "branch_code"],
            how="left",
            indicator=True,
        )

        matched = comparison["_merge"].eq("both").sum()
        unmatched = comparison["_merge"].eq("left_only").sum()

        print(f"\nFile: {filename}")
        print("Unique source pairs:", len(pairs))
        print("Matched pairs:", matched)
        print("Unmatched pairs:", unmatched)

        if unmatched:
            print("Unmatched examples:")
            print(
                comparison.loc[
                    comparison["_merge"].eq("left_only"),
                    ["College Code", "Branch Code"],
                ].head(10).to_string(index=False)
            )

finally:
    engine.dispose()
