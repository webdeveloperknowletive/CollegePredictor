
import pandas as pd
from pathlib import Path

data_folder = Path("data/raw")

metadata_columns = {
    "college_code",
    "college_name",
    "dept_code",
    "dept_name",
    "status",
    "level",
    "stage",
}

for file_path in sorted(data_folder.glob("*cutoffs*.xlsx")):
    print("\n" + "=" * 70)
    print("FILE:", file_path.name)

    df = pd.read_excel(file_path, sheet_name="Sheet1", nrows=0)

    columns = [
        col for col in df.columns
        if str(col).strip().lower() not in metadata_columns
    ]

    print("Total columns:", len(df.columns))
    print("Cutoff/category columns:", len(columns))

    for column in columns:
        print(column)
