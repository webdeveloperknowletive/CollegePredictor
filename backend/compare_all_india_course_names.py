import os
import pandas as pd
from sqlalchemy import text
from app.database import engine

BASE_DIR = r"D:\college-predictor\data\raw\all_india\2025"

FILES = {
    "CAP 1": ("cap1_2025.xlsx", "AI Quota Cutoff (Round 1)"),
    "CAP 2": ("cap2_2025.xlsx", "AI-MI Quota Cutoff (Round 2)"),
    "CAP 3": ("cap3_2025.xlsx", "AI-MI Quota Cutoff (Round 3)"),
    "CAP 4": ("cap4_2025.xlsx", "Raw Data"),
}

PATTERNS = [
    "%Computer Science and Engineering (Artificial%",
    "%Computer Science and Engineering (Cyber%",
    "%Computer Science and Engineering (Internet of%",
    "%Electronics and Communication(Advanced%",
    "%Electronics Engineering ( VLSI Design and%",
]

# Read affected database records
conditions = " OR ".join(
    ["course_name ILIKE :p" + str(i) for i in range(len(PATTERNS))]
)

query = text(f"""
    SELECT DISTINCT choice_code, course_name
    FROM all_india.ai_branches
    WHERE {conditions}
    ORDER BY choice_code
""")

params = {
    "p" + str(i): pattern
    for i, pattern in enumerate(PATTERNS)
}

with engine.connect() as connection:
    db_records = connection.execute(
        query, params
    ).mappings().all()

affected_codes = {
    str(row["choice_code"]).strip(): row["course_name"]
    for row in db_records
}

print("Affected choice codes:", len(affected_codes))

results = []

for round_name, (filename, sheet_name) in FILES.items():

    filepath = os.path.join(BASE_DIR, filename)

    print(f"\nReading {round_name}: {filename}")

    df = pd.read_excel(
        filepath,
        sheet_name=sheet_name,
        dtype=str
    )

    # Support different column names in CAP 4
    code_column = next(
        col for col in df.columns
        if col.strip().lower() == "choice code"
    )

    course_column = next(
        col for col in df.columns
        if col.strip().lower() in [
            "department / course",
            "course / department"
        ]
    )

    df[code_column] = df[code_column].str.strip()

    matched = df[
        df[code_column].isin(affected_codes.keys())
    ]

    print("Matching rows:", len(matched))

    for _, row in matched.iterrows():

        code = str(row[code_column]).strip()
        source_name = str(row[course_column]).strip()

        results.append({
            "choice_code": code,
            "database_course_name": affected_codes[code],
            "source_round": round_name,
            "source_course_name": source_name,
            "source_name_length": len(source_name),
        })

output = pd.DataFrame(results)

output_path = os.path.join(
    os.getcwd(),
    "all_india_course_name_source_audit.csv"
)

output.to_csv(
    output_path,
    index=False,
    encoding="utf-8-sig"
)

print("\nComparison completed.")
print("Total matching source rows:", len(output))
print("Unique choice codes found:", output["choice_code"].nunique())
print("Output file:", output_path)

print("\n--- SOURCE COURSE NAME COMPARISON ---")

for code, group in output.groupby("choice_code"):

    print("\nChoice Code:", code)
    print("Database:", affected_codes[code])

    for _, row in group.iterrows():
        print(
            row["source_round"],
            "=>",
            row["source_course_name"]
        )