
import argparse
import csv
import os
import re
from pathlib import Path
from datetime import datetime

import psycopg2
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent

CSV_FILE = BASE_DIR / "all_india_city_mapping_cleaned_353.csv"

BACKUP_FILE = BASE_DIR / (
    "all_india_city_backup_"
    + datetime.now().strftime("%Y%m%d_%H%M%S")
    + ".csv"
)


def connect_db():
    load_dotenv(BASE_DIR / ".env")

    url = os.getenv("DATABASE_URL")

    if url:
        url = url.replace(
            "postgresql+psycopg://",
            "postgresql://",
            1
        )
        url = url.replace(
            "postgresql+psycopg2://",
            "postgresql://",
            1
        )
        return psycopg2.connect(url)

    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432")
    )


def normalize_code(value):
    value = str(value).strip()

    if not value:
        raise ValueError("Empty institute code")

    if not re.fullmatch(r"\d+(\.0)?", value):
        raise ValueError(f"Invalid institute code: {value}")

    value = value.split(".")[0]

    return value.zfill(5)


def load_csv():
    if not CSV_FILE.exists():
        raise FileNotFoundError(
            f"CSV not found: {CSV_FILE}"
        )

    records = []
    seen_codes = set()

    with CSV_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        required = {
            "institute_code",
            "city_verified"
        }

        if not required.issubset(
            set(reader.fieldnames or [])
        ):
            raise ValueError(
                "CSV must contain institute_code "
                "and city_verified columns."
            )

        for row in reader:
            code = normalize_code(
                row["institute_code"]
            )

            city = (
                row["city_verified"] or ""
            ).strip()

            if not city:
                raise ValueError(
                    f"Empty city for institute {code}"
                )

            if code in seen_codes:
                raise ValueError(
                    f"Duplicate institute code: {code}"
                )

            seen_codes.add(code)

            records.append({
                "code": code,
                "city": city
            })

    return records


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to PostgreSQL"
    )

    args = parser.parse_args()

    records = load_csv()

    print("\n========== CSV VALIDATION ==========")
    print("CSV records:", len(records))
    print(
        "Unique institute codes:",
        len(set(r["code"] for r in records))
    )
    print(
        "Unique city labels:",
        len(set(r["city"] for r in records))
    )

    if len(records) != 353:
        raise RuntimeError(
            "Expected exactly 353 records. "
            "Database update cancelled."
        )

    conn = connect_db()

    try:
        with conn.cursor() as cur:

            # Read existing college records.
            cur.execute("""
                SELECT
                    LPAD(institute_code::text, 5, '0'),
                    institute_name,
                    city
                FROM all_india.ai_colleges
            """)

            db_rows = cur.fetchall()

            db_map = {
                row[0]: {
                    "name": row[1],
                    "city": row[2]
                }
                for row in db_rows
            }

            csv_codes = {
                record["code"]
                for record in records
            }

            db_codes = set(db_map.keys())

            missing = sorted(csv_codes - db_codes)
            extra = sorted(db_codes - csv_codes)

            print("\n========== DATABASE VALIDATION ==========")
            print("Database colleges:", len(db_rows))
            print("Matching codes:", len(csv_codes & db_codes))
            print("CSV codes missing in DB:", len(missing))
            print("DB codes missing in CSV:", len(extra))

            if missing:
                print("Missing codes:", missing)

            if extra:
                print("Extra codes:", extra)

            if missing or extra or len(db_rows) != 353:
                raise RuntimeError(
                    "Institute code validation failed. "
                    "No database changes made."
                )

            # Show a preview.
            print("\n========== PREVIEW ==========")

            for record in records[:10]:
                print(
                    record["code"],
                    "->",
                    record["city"]
                )

            if not args.apply:
                print("\nDRY RUN SUCCESSFUL.")
                print(
                    "No database values were changed."
                )
                print(
                    "Run with --apply after reviewing."
                )
                return

            # Backup all existing city values first.
            with BACKUP_FILE.open(
                "w",
                newline="",
                encoding="utf-8-sig"
            ) as backup:

                writer = csv.writer(backup)

                writer.writerow([
                    "institute_code",
                    "institute_name",
                    "old_city"
                ])

                for code in sorted(db_map):
                    writer.writerow([
                        code,
                        db_map[code]["name"],
                        db_map[code]["city"]
                    ])

            print("\nBackup created:", BACKUP_FILE)

            # Update only the city column.
            update_sql = """
                UPDATE all_india.ai_colleges
                SET city = %s
                WHERE LPAD(
                    institute_code::text,
                    5,
                    '0'
                ) = %s
            """

            cur.executemany(
                update_sql,
                [
                    (record["city"], record["code"])
                    for record in records
                ]
            )

            if cur.rowcount != 353:
                raise RuntimeError(
                    f"Expected 353 updates, "
                    f"got {cur.rowcount}. "
                    "Transaction will be rolled back."
                )

        # Commit only after all checks pass.
        conn.commit()

        print("\n========== UPDATE SUCCESS ==========")
        print("Rows updated:", 353)
        print("Table: all_india.ai_colleges")
        print("Column updated: city")
        print("Backup:", BACKUP_FILE)
        print("Transaction committed.")

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    main()
