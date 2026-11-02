
import os
import time
from io import StringIO

import pandas as pd
import requests

from sqlalchemy import text
from app.database import engine


OUTPUT_FILE = "all_india_official_course_verification.csv"
ERROR_FILE = "all_india_official_course_fetch_errors.csv"

BASE_URL = (
    "https://fe2025.mahacet.org/StaticPages/"
    "frmInstituteSummary?InstituteCode="
)

PATTERNS = [
    "%Computer Science and Engineering (Artificial%",
    "%Computer Science and Engineering (Cyber%",
    "%Computer Science and Engineering (Internet of%",
    "%Electronics and Communication(Advanced%",
    "%Electronics Engineering ( VLSI Design and%",
]


# 1. Fetch affected records
conditions = " OR ".join(
    f"b.course_name ILIKE :p{i}"
    for i in range(len(PATTERNS))
)

query = text(f"""
    SELECT DISTINCT
        c.institute_code,
        c.institute_name,
        b.choice_code,
        b.course_name
    FROM all_india.ai_branches b
    JOIN all_india.ai_cutoffs ac ON ac.branch_id = b.id
    JOIN all_india.ai_colleges c ON c.id = ac.college_id
    WHERE {conditions}
    ORDER BY c.institute_code, b.choice_code
""")

params = {
    f"p{i}": pattern
    for i, pattern in enumerate(PATTERNS)
}

with engine.connect() as connection:
    records = connection.execute(
        query, params
    ).mappings().all()

df = pd.DataFrame(records)

if df.empty:
    print("No affected records found.")
    raise SystemExit

df["institute_code"] = (
    df["institute_code"].astype(str).str.strip()
)

df["choice_code"] = (
    df["choice_code"].astype(str).str.strip()
)

print("Affected records:", len(df))
print("Unique institutes:", df["institute_code"].nunique())


# 2. HTTP session
session = requests.Session()

session.headers.update({
    "User-Agent": "Mozilla/5.0"
})


# 3. Extract official course table
def extract_course_table(html):

    tables = pd.read_html(StringIO(html))

    for table in tables:

        table = table.copy()

        for index, row in table.iterrows():

            headers = [
                str(value).strip()
                for value in row.tolist()
            ]

            if (
                "Choice Code" in headers
                and "Course Name" in headers
            ):

                table.columns = headers
                return table.iloc[index + 1:].copy()

    return None


# 4. Fetch official records
results = []
errors = []

institutes = sorted(df["institute_code"].unique())

for raw_code in institutes:

    # CET Cell institute codes are five digits
    institute_code = str(raw_code).strip().zfill(5)

    url = BASE_URL + institute_code

    print("Checking:", institute_code)

    try:

        response = session.get(url, timeout=30)
        response.raise_for_status()

        course_table = extract_course_table(response.text)

        if course_table is None:
            errors.append({
                "institute_code": institute_code,
                "reason": "Official course table not found"
            })
            continue

        institute_records = df[
            df["institute_code"] == str(raw_code)
        ]

        for _, db_row in institute_records.iterrows():

            choice_code = str(
                db_row["choice_code"]
            ).strip()

            matches = course_table[
                course_table["Choice Code"]
                .astype(str)
                .str.strip()
                == choice_code
            ]

            for _, official_row in matches.iterrows():

                official_name = str(
                    official_row["Course Name"]
                ).strip()

                if official_name.lower() in ("nan", "", "none"):
                    continue

                results.append({
                    "institute_code": institute_code,
                    "institute_name": db_row["institute_name"],
                    "choice_code": choice_code,
                    "database_course_name": db_row["course_name"],
                    "official_course_name": official_name,
                    "name_changed": (
                        official_name != db_row["course_name"]
                    ),
                    "source_url": url
                })

        time.sleep(0.3)

    except Exception as error:

        errors.append({
            "institute_code": institute_code,
            "reason": str(error)[:300]
        })

        print("Error:", str(error)[:150])


# 5. Save results
columns = [
    "institute_code",
    "institute_name",
    "choice_code",
    "database_course_name",
    "official_course_name",
    "name_changed",
    "source_url"
]

output = pd.DataFrame(results, columns=columns)

output.to_csv(
    OUTPUT_FILE,
    index=False,
    encoding="utf-8-sig"
)

pd.DataFrame(
    errors,
    columns=["institute_code", "reason"]
).to_csv(
    ERROR_FILE,
    index=False,
    encoding="utf-8-sig"
)


# 6. Final report
print("\n========================================")
print("OFFICIAL COURSE VERIFICATION")
print("========================================")

print("Affected database records:", len(df))
print("Official matched rows:", len(output))

if not output.empty:
    print(
        "Unique matched choice codes:",
        output["choice_code"].nunique()
    )
    print(
        "Names requiring correction:",
        output["name_changed"].sum()
    )

print("Failed institutes:", len(errors))
print("Verification CSV:", os.path.abspath(OUTPUT_FILE))
print("Error CSV:", os.path.abspath(ERROR_FILE))

print("\nDatabase was NOT modified.")
