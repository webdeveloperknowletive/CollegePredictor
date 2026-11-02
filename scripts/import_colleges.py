
from pathlib import Path
import sys
import json
import math
import pandas as pd
from sqlalchemy import text

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
MASTER_FILE = RAW_DIR / "Master Data - Engineering .xlsx"

sys.path.insert(0, str(ROOT / "backend"))
from app.database import engine


def clean_value(value):
    if value is None:
        return None

    if hasattr(value, "item"):
        value = value.item()

    if pd.isna(value):
        return None

    if isinstance(value, float) and not math.isfinite(value):
        return None

    if isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def normalize_code(value):
    if pd.isna(value):
        return None

    if isinstance(value, (int, float)):
        return str(int(value))

    value = str(value).strip()

    if value.endswith(".0"):
        value = value[:-2]

    return value


def main():
    df = pd.read_excel(MASTER_FILE, sheet_name="Sheet1")
    df = df.dropna(subset=["Institute Code ", "College Name "]).copy()

    df["normalized_code"] = df["Institute Code "].apply(normalize_code)

    if df["normalized_code"].duplicated().any():
        raise ValueError("Duplicate institute codes found. Import cancelled.")

    inserted = 0
    updated = 0

    sql = text("""
        INSERT INTO colleges (
            institute_code,
            institute_name,
            master_data
        )
        VALUES (
            :institute_code,
            :institute_name,
            CAST(:master_data AS JSONB)
        )
        ON CONFLICT (institute_code)
        DO UPDATE SET
            institute_name = EXCLUDED.institute_name,
            master_data = EXCLUDED.master_data
        RETURNING (xmax = 0) AS was_inserted
    """)

    with engine.begin() as connection:
        for _, row in df.iterrows():
            master_data = {
                str(column).strip(): clean_value(row[column])
                for column in df.columns
                if column != "normalized_code"
            }

            result = connection.execute(
                sql,
                {
                    "institute_code": row["normalized_code"],
                    "institute_name": str(row["College Name "]).strip(),
                    "master_data": json.dumps(master_data, ensure_ascii=False),
                },
            )

            if result.scalar_one():
                inserted += 1
            else:
                updated += 1

    print("College import completed successfully.")
    print(f"New colleges inserted: {inserted}")
    print(f"Existing colleges updated: {updated}")

    with engine.connect() as connection:
        total = connection.execute(
            text("SELECT COUNT(*) FROM colleges")
        ).scalar_one()

    print(f"Total colleges currently in database: {total}")


if __name__ == "__main__":
    main()
