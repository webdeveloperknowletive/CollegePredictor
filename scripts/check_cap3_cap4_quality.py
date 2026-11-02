
import re
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "raw" / "2026"
FILES = ["CAP3_2026.xlsx", "CAP4_2026.xlsx"]

percentile_pattern = re.compile(r"\(\s*\d+(?:\.\d+)?\s*\)")

for filename in FILES:
    path = DATA_DIR / filename
    df = pd.read_excel(path, sheet_name="Cutoffs (Wide)").dropna(how="all")

    # Use the actual 92 cutoff category columns.
    cutoff_start = df.columns.get_loc("GOPENS")
    cutoff_end = df.columns.get_loc("Source PDF Page")
    cutoff_columns = list(df.columns[cutoff_start:cutoff_end])

    status = df["Status"].fillna("").astype(str)
    suspicious = status.str.contains(percentile_pattern, na=False)
    cutoff_count = df[cutoff_columns].notna().sum(axis=1)

    has_cutoffs = suspicious & cutoff_count.gt(0)
    no_cutoffs = suspicious & cutoff_count.eq(0)

    print("\n" + "=" * 65)
    print(filename)
    print("=" * 65)
    print("Total rows:", len(df))
    print("Status with percentile text:", int(suspicious.sum()))
    print("Those rows with cutoff values:", int(has_cutoffs.sum()))
    print("Those rows without cutoff values:", int(no_cutoffs.sum()))

    if no_cutoffs.any():
        columns = [
            "College Code",
            "College Name",
            "Branch Code",
            "Branch Name",
            "Status",
            "Level",
            "Stage",
            "Source PDF Page",
        ]
        print("\nExamples with no cutoff values:")
        print(df.loc[no_cutoffs, columns].head(8).to_string(index=False))
