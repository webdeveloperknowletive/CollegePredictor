
import os
import re
import difflib
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("backend/.env")
database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError("DATABASE_URL not found in backend/.env")

def normalize(value):
    value = str(value or "").strip().lower()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()

engine = create_engine(database_url)

try:
    with engine.connect() as conn:
        colleges = pd.read_sql(
            text("""
                SELECT id, institute_code, institute_name
                FROM colleges
            """),
            conn,
        )

        branches = pd.read_sql(
            text("""
                SELECT id, branch_code, branch_name
                FROM branches
            """),
            conn,
        )

        links = pd.read_sql(
            text("""
                SELECT
                    cb.college_id,
                    cb.branch_id,
                    c.institute_code,
                    c.institute_name,
                    b.branch_code,
                    b.branch_name
                FROM college_branches cb
                JOIN colleges c ON c.id = cb.college_id
                JOIN branches b ON b.id = cb.branch_id
            """),
            conn,
        )

    for df, cols in [
        (colleges, ["institute_code", "institute_name"]),
        (branches, ["branch_code", "branch_name"]),
        (links, ["institute_code", "branch_code"]),
    ]:
        for col in cols:
            df[col] = df[col].astype(str).str.strip()

    colleges["normalized_name"] = colleges[
        "institute_name"
    ].map(normalize)

    branches["normalized_name"] = branches[
        "branch_name"
    ].map(normalize)

    links["normalized_college"] = links[
        "institute_name"
    ].map(normalize)

    links["normalized_branch"] = links[
        "branch_name"
    ].map(normalize)

    output = []

    for filename in ["CAP1_2026.xlsx", "CAP2_2026.xlsx"]:
        path = os.path.join("data", "raw", "2026", filename)

        df = pd.read_excel(
            path,
            sheet_name="Cutoffs (Wide)",
            dtype={"College Code": str, "Branch Code": str},
        )

        for col in ["College Code", "Branch Code"]:
            df[col] = df[col].astype("string").str.strip()

        pairs = df[
            ["College Code", "College Name", "Branch Code", "Branch Name"]
        ].drop_duplicates()

        merged = pairs.merge(
            links[["institute_code", "branch_code"]],
            left_on=["College Code", "Branch Code"],
            right_on=["institute_code", "branch_code"],
            how="left",
            indicator=True,
        )

        unmatched = merged.loc[merged['_merge'].eq('left_only'), ['College Code', 'College Name', 'Branch Code', 'Branch Name']].copy()

        for _, row in unmatched.iterrows():
            college_code = str(row["College Code"]).strip()
            branch_code = str(row["Branch Code"]).strip()
            college_name = str(row["College Name"]).strip()
            branch_name = str(row["Branch Name"]).strip()

            existing_college = colleges[
                colleges["institute_code"].eq(college_code)
            ]

            same_name_colleges = colleges[
                colleges["normalized_name"].eq(
                    normalize(college_name)
                )
            ]

            same_code_branches = branches[
                branches["branch_code"].eq(branch_code)
            ]

            same_name_branches = branches[
                branches["normalized_name"].eq(
                    normalize(branch_name)
                )
            ]

            # Rank possible branch-name candidates for inspection.
            target = normalize(branch_name)
            candidates = []

            for _, b in branches.iterrows():
                score = difflib.SequenceMatcher(
                    None, target, b["normalized_name"]
                ).ratio()

                if score >= 0.60:
                    candidates.append(
                        (score, b["branch_code"], b["branch_name"])
                    )

            candidates.sort(reverse=True)
            top_candidates = candidates[:3]

            output.append({
                "source_file": filename,
                "source_college_code": college_code,
                "source_college_name": college_name,
                "source_branch_code": branch_code,
                "source_branch_name": branch_name,
                "college_code_exists": not existing_college.empty,
                "exact_college_name_matches": len(same_name_colleges),
                "exact_branch_code_exists": not same_code_branches.empty,
                "exact_branch_name_matches": len(same_name_branches),
                "existing_college_names": " | ".join(
                    existing_college["institute_name"].head(5).tolist()
                ),
                "same_name_college_codes": " | ".join(
                    same_name_colleges["institute_code"].head(5).tolist()
                ),
                "same_name_branch_codes": " | ".join(
                    same_name_branches["branch_code"].head(10).tolist()
                ),
                "candidate_1": (
                    f"{top_candidates[0][1]} | {top_candidates[0][2]} "
                    f"| score {top_candidates[0][0]:.2f}"
                    if len(top_candidates) > 0 else ""
                ),
                "candidate_2": (
                    f"{top_candidates[1][1]} | {top_candidates[1][2]} "
                    f"| score {top_candidates[1][0]:.2f}"
                    if len(top_candidates) > 1 else ""
                ),
                "candidate_3": (
                    f"{top_candidates[2][1]} | {top_candidates[2][2]} "
                    f"| score {top_candidates[2][0]:.2f}"
                    if len(top_candidates) > 2 else ""
                ),
            })

    report = pd.DataFrame(output)
    out_dir = "data/reports/2026"
    os.makedirs(out_dir, exist_ok=True)

    out_path = os.path.join(
        out_dir, "reconciliation_candidates.csv"
    )
    report.to_csv(out_path, index=False, encoding="utf-8-sig")

    print("Reconciliation candidate report created.")
    print("Unmatched source pairs reviewed:", len(report))
    print("Output:", out_path)
    print("\nCollege-code existence summary:")
    print(report["college_code_exists"].value_counts().to_string())
    print("\nExact branch-name match summary:")
    print(report["exact_branch_name_matches"].gt(0).value_counts().to_string())
    print("\nFirst 15 rows:")
    print(report.head(15).to_string(index=False))
    print("\nNo database records were inserted or modified.")

finally:
    engine.dispose()
