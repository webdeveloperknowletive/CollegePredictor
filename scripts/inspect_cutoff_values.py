
import pandas as pd
from pathlib import Path

data_folder = Path("data/raw")

files = sorted(data_folder.glob("*cutoffs*.xlsx"))

categories_to_check = [
    "GOPENS",
    "GOBCS",
    "GSCS",
    "GSTS",
    "EWS",
    "TFWS",
    "DEFOBCS",
]

for file_path in files:
    print("\n" + "=" * 70)
    print("FILE:", file_path.name)

    df = pd.read_excel(file_path, sheet_name="Sheet1")

    for category in categories_to_check:
        if category not in df.columns:
            print(f"\n{category}: Column not present")
            continue

        values = df[category].dropna().head(5).tolist()

        print(f"\n{category}:")
        print("Sample values:", values)
        print("Missing values:", int(df[category].isna().sum()))
