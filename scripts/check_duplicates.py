
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "raw"

FILES = [
    "Egg Cap 1 cutoffs 2025.xlsx",
    "Egg Cap 2 cutoffs 2025.xlsx",
    "Egg Cap 3 cutoffs 2025.xlsx",
    "Egg Cap 4 cutoffs 2025.xlsx",
]


def main():
    for filename in FILES:
        path = DATA_DIR / filename
        df = pd.read_excel(path, sheet_name="Sheet1", dtype=object)

        print("\n" + "=" * 85)
        print("FILE:", filename)
        print("=" * 85)

        # Check rows that are identical across every column.
        exact_duplicates = df.duplicated(keep=False)
        print(
            "Rows involved in exact duplicates:",
            int(exact_duplicates.sum()),
        )

        # Check repeated college-branch combinations.
        keys = ["college_code", "dept_code"]
        repeated = df.duplicated(subset=keys, keep=False)

        print(
            "Rows involved in repeated college-branch keys:",
            int(repeated.sum()),
        )

        repeated_rows = df.loc[repeated].copy()

        if repeated_rows.empty:
            print("No repeated college-branch keys found.")
            continue

        # Show the most frequently repeated combinations.
        counts = (
            repeated_rows.groupby(keys, dropna=False)
            .size()
            .reset_index(name="row_count")
            .sort_values("row_count", ascending=False)
        )

        print("\nMost frequently repeated combinations:")
        print(counts.head(10).to_string(index=False))

        # Display examples, including cutoff and descriptive columns.
        sample_key = counts.iloc[0]
        mask = (
            df["college_code"].eq(sample_key["college_code"])
            & df["dept_code"].eq(sample_key["dept_code"])
        )

        sample = df.loc[mask]

        print("\nExample repeated combination:")
        print("College code:", sample_key["college_code"])
        print("Branch code:", sample_key["dept_code"])
        print("Rows:", len(sample))

        print("\nColumns that differ in this example:")
        for column in df.columns:
            values = sample[column].drop_duplicates()

            if len(values) > 1:
                print(f"  {column}: {values.tolist()[:5]}")

        print("\nExample records:")
        print(sample.head(5).to_string(index=False, max_cols=15))

    print("\nDUPLICATE INVESTIGATION COMPLETED")


if __name__ == "__main__":
    main()
