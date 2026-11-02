
import pandas as pd
from pathlib import Path

file_path = Path("data/raw/Master Data - Engineering .xlsx")

excel = pd.ExcelFile(file_path)

print("Available sheets:", excel.sheet_names)

for sheet in excel.sheet_names:
    df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)

    print("\n" + "=" * 70)
    print("SHEET:", sheet)
    print("COLUMNS:", len(df.columns))

    for column in df.columns:
        print(repr(column))

    print("\nSample rows:")
    print(df.head(2).to_string(index=False))
