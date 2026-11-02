
import pandas as pd
from pathlib import Path

data_dir = Path("data/raw/2026")

key_columns = [
    "College Code",
    "Branch Code",
    "Level",
    "Stage",
    "Source PDF Page",
]

for filename in ["CAP3_2026.xlsx", "CAP4_2026.xlsx"]:
    df = pd.read_excel(
        data_dir / filename,
        sheet_name="Cutoffs (Wide)",
    ).dropna(how="all")

    print("\n" + "=" * 60)
    print(filename)
    print("=" * 60)

    print("First 15 rows:")
    print(df[key_columns].head(15).to_string(index=False))

    duplicate_count = int(df.duplicated(key_columns).sum())
    print("\nDuplicate key rows:", duplicate_count)

    duplicate_rows = df[df.duplicated(key_columns, keep=False)]

    if not duplicate_rows.empty:
        print("\nFirst 10 duplicate groups:")
        print(
            duplicate_rows[key_columns]
            .head(10)
            .to_string(index=False)
        )
