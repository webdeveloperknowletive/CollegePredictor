
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "raw"

MASTER_FILE = "Master Data - Engineering .xlsx"

CAP_FILES = [
    "Egg Cap 1 cutoffs 2025.xlsx",
    "Egg Cap 2 cutoffs 2025.xlsx",
    "Egg Cap 3 cutoffs 2025.xlsx",
    "Egg Cap 4 cutoffs 2025.xlsx",
]


def normalize_code(value):
    """Normalize numeric codes for comparison only."""
    if pd.isna(value):
        return None

    code = str(value).strip()

    if code.endswith(".0"):
        code = code[:-2]

    if code.isdigit():
        return str(int(code))

    return code.upper()


def main():
    master_path = DATA_DIR / MASTER_FILE

    master = pd.read_excel(
        master_path,
        sheet_name="Sheet1",
        dtype=object,
    )

    master["normalized_code"] = master["Institute Code "].apply(
        normalize_code
    )

    master = master.dropna(subset=["normalized_code"])

    master_codes = set(master["normalized_code"])

    print("\nMASTER DATA AUDIT")
    print("Master records:", len(master))
    print("Unique normalized codes:", len(master_codes))

    for filename in CAP_FILES:
        path = DATA_DIR / filename

        cap = pd.read_excel(
            path,
            sheet_name="Sheet1",
            dtype=object,
        )

        cap["normalized_code"] = cap["college_code"].apply(
            normalize_code
        )

        cap = cap.dropna(subset=["normalized_code"])

        cap_codes = set(cap["normalized_code"])

        missing_in_master = sorted(cap_codes - master_codes)
        missing_in_cap = sorted(master_codes - cap_codes)

        print("\n" + "=" * 75)
        print("FILE:", filename)
        print("Rows:", len(cap))
        print("Unique normalized college codes:", len(cap_codes))
        print("Codes not found in master:", len(missing_in_master))
        print("Unmatched CAP codes:", missing_in_master[:20])
        print("Master codes absent from this round:", len(missing_in_cap))
        print("Examples:", missing_in_cap[:20])

        # Check repeated college-branch combinations.
        key_columns = ["college_code", "dept_code"]

        if all(column in cap.columns for column in key_columns):
            duplicates = cap.duplicated(
                subset=key_columns,
                keep=False,
            )

            print(
                "Repeated college-branch rows:",
                int(duplicates.sum()),
            )

        # Show sample cutoff values, excluding descriptive columns.
        metadata = {
            "Sr No",
            "college_code",
            "college_name",
            "dept_code",
            "dept_name",
            "status",
            "level",
            "stage",
            "normalized_code",
        }

        print("Sample cutoff values:")

        shown = 0

        for column in cap.columns:
            if column in metadata:
                continue

            values = cap[column].dropna()

            if not values.empty:
                print(f"  {column}: {values.iloc[0]!r}")
                shown += 1

            if shown >= 5:
                break

    print("\nNORMALIZED CODE AUDIT COMPLETED")


if __name__ == "__main__":
    main()
