
from pathlib import Path
import re
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"

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
    "Sr No",
}


def normalize_code(value):
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return str(int(value))
    value = str(value).strip()
    return value[:-2] if value.endswith(".0") else value


def parse_cutoff(value):
    if pd.isna(value):
        return None, None

    original = str(value).strip()
    match = re.fullmatch(
        r"([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)",
        original,
    )

    if not match:
        return None, None

    rank = int(match.group(1).replace(",", ""))
    percentile = float(match.group(2))
    return rank, percentile


def main():
    for filename, round_number in CAP_FILES:
        path = RAW_DIR / filename

        if not path.exists():
            raise FileNotFoundError(f"Missing CAP file: {path}")

        df = pd.read_excel(path, sheet_name="Sheet1")

        required = {
            "college_code",
            "college_name",
            "dept_code",
            "dept_name",
            "level",
            "stage",
        }

        missing = required - set(df.columns)
        if missing:
            raise ValueError(
                f"{filename}: missing columns {sorted(missing)}"
            )

        category_columns = [
            column for column in df.columns
            if column not in METADATA_COLUMNS
        ]

        valid_codes = df["college_code"].dropna().map(normalize_code)
        valid_branches = df["dept_code"].dropna().map(normalize_code)

        parsed_values = 0
        nonempty_values = 0
        unparsed_examples = []

        for column in category_columns:
            for value in df[column].dropna():
                nonempty_values += 1
                rank, percentile = parse_cutoff(value)

                if rank is not None:
                    parsed_values += 1
                elif len(unparsed_examples) < 5:
                    unparsed_examples.append((column, str(value)))

        print(f"\nCAP Round {round_number}: {filename}")
        print(f"Source rows: {len(df)}")
        print(f"Unique college codes: {valid_codes.nunique()}")
        print(f"Unique branch codes: {valid_branches.nunique()}")
        print(f"Category columns: {len(category_columns)}")
        print(f"Non-empty category values: {nonempty_values}")
        print(f"Successfully parsed values: {parsed_values}")
        print(f"Unparsed non-empty values: {nonempty_values - parsed_values}")

        if unparsed_examples:
            print("Examples to inspect:")
            for category, value in unparsed_examples:
                print(f"  {category}: {value}")

    print("\nDRY RUN COMPLETE — no database records were changed.")


if __name__ == "__main__":
    main()
