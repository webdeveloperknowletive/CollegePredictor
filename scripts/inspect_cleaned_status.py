from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "data/raw/2026/CAP3_2026_CLEANED.xlsx",
    ROOT / "data/raw/2026/CAP4_2026_CLEANED.xlsx",
]

for path in FILES:
    print("\n" + "=" * 65)
    print(path.name)

    df = pd.read_excel(path, sheet_name="Cutoffs (Wide)")

    print("\nStatus value counts:")
    print(df["Status"].fillna("<BLANK>").value_counts().head(30).to_string())

    print("\nDistinct non-empty Status values:")
    values = sorted(
        df["Status"].dropna().astype(str).str.strip().unique()
    )
    print(values[:100])
    print(f"Total distinct non-empty values: {len(values)}")