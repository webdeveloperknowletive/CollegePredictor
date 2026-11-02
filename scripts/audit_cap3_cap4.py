
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "raw" / "2026"

FILES = [
    ("CAP3_2026.xlsx", 3),
    ("CAP4_2026.xlsx", 4),
]

META = {
    "sr no",
    "college code",
    "college name",
    "branch code",
    "branch name",
    "status",
    "home university",
    "level",
    "stage",
    "source pdf page",
}


def main():
    for filename, round_number in FILES:
        path = DATA_DIR / filename

        print("\n" + "=" * 65)
        print(f"CAP ROUND {round_number}: {filename}")
        print("=" * 65)

        if not path.exists():
            print(f"ERROR: File not found: {path}")
            continue

        df = pd.read_excel(
            path,
            sheet_name="Cutoffs (Wide)",
        ).dropna(how="all")

        categories = [
            col for col in df.columns
            if str(col).strip().casefold() not in META
        ]

        print(f"Rows: {len(df)}")
        print(f"Columns: {len(df.columns)}")
        print(f"Cutoff category columns: {len(categories)}")

        required = [
            "College Code",
            "College Name",
            "Branch Code",
            "Branch Name",
            "Status",
            "Level",
        ]

        missing = [col for col in required if col not in df.columns]
        print(f"Missing required columns: {missing}")

        print("\nMissing values in important fields:")
        for col in required:
            if col in df.columns:
                print(f"  {col}: {df[col].isna().sum()}")

        print("\nStage distribution:")
        if "Stage" in df.columns:
            print(df["Stage"].value_counts(dropna=False).to_string())
        else:
            print("Stage column not found")

        print("\nSource PDF page distribution:")
        if "Source PDF Page" in df.columns:
            print(
                df["Source PDF Page"]
                .value_counts(dropna=False)
                .sort_index()
                .head(20)
                .to_string()
            )
        else:
            print("Source PDF Page column not found")

        print("\nCutoff cell audit:")
        populated = 0
        blank = 0
        unsupported = []

        import re

        pattern = re.compile(
            r"([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)"
        )

        for col in categories:
            for excel_index, value in df[col].items():
                if pd.isna(value):
                    blank += 1
                    continue

                value_text = str(value).strip()

                if value_text in {"", "-", "—", "–"}:
                    blank += 1
                    continue

                if pattern.fullmatch(value_text):
                    populated += 1
                else:
                    unsupported.append(
                        (excel_index + 2, col, value_text)
                    )

        print(f"Recognized cutoff cells: {populated}")
        print(f"Blank/empty cutoff cells: {blank}")
        print(f"Unsupported non-empty cells: {len(unsupported)}")

        if unsupported:
            print("\nFirst 20 unsupported cells:")
            for row_number, category, value in unsupported[:20]:
                print(
                    f"  Excel row {row_number}, "
                    f"{category}: {value!r}"
                )

        print("\nFirst 10 rows for manual inspection:")
        display_cols = [
            col for col in [
                "College Code",
                "College Name",
                "Branch Code",
                "Branch Name",
                "Status",
                "Level",
                "Stage",
                "Source PDF Page",
            ]
            if col in df.columns
        ]

        if display_cols:
            print(df[display_cols].head(10).to_string(index=False))


if __name__ == "__main__":
    main()
