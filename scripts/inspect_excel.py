
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "raw"

FILES = [
    "Egg Cap 1 cutoffs 2025.xlsx",
    "Egg Cap 2 cutoffs 2025.xlsx",
    "Egg Cap 3 cutoffs 2025.xlsx",
    "Egg Cap 4 cutoffs 2025.xlsx",
    "Master Data - Engineering .xlsx",
]

def main():
    for filename in FILES:
        path = DATA_DIR / filename

        print("\n" + "=" * 80)
        print("FILE:", filename)
        print("=" * 80)

        if not path.exists():
            print("FILE NOT FOUND:", path)
            continue

        try:
            excel = pd.ExcelFile(path)
            print("Sheets:", excel.sheet_names)

            for sheet in excel.sheet_names:
                df = pd.read_excel(path, sheet_name=sheet, dtype=object)

                print(f"\nSHEET: {sheet}")
                print("Rows:", len(df))
                print("Columns:", len(df.columns))

                print("\nColumn names:")
                for column in df.columns:
                    print(repr(column))

                print("\nMissing values:")
                print(df.isna().sum().to_string())

                print("\nDuplicate rows:", df.duplicated().sum())
                print("\nFirst 3 rows:")
                print(df.head(3).to_string(index=False, max_cols=10))

        except Exception as error:
            print("ERROR:", error)

    print("\nExcel inspection completed.")

if __name__ == "__main__":
    main()
