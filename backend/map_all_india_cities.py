
"""
All India College City Mapping
Maharashtra CET Cell 2025-26

Commands:
    python map_all_india_cities.py fetch
    python map_all_india_cities.py apply

FETCH:
    Reads college codes from all_india.ai_colleges.
    Fetches official institute summaries.
    Creates all_india_city_review.csv.

APPLY:
    Updates ONLY all_india.ai_colleges.city
    using manually reviewed city_verified values.
"""

import argparse
import csv
import os
import re
import sys
import time
from pathlib import Path

import requests
import psycopg2
from bs4 import BeautifulSoup
from dotenv import load_dotenv


BASE_URL = (
    "https://fe2025.mahacet.org/StaticPages/"
    "frmInstituteSummary?InstituteCode={}"
)

OUTPUT_CSV = (
    Path(__file__).resolve().parent
    / "all_india_city_review.csv"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


# --------------------------------------------------
# DATABASE CONNECTION
# --------------------------------------------------

def db_connect():

    load_dotenv(
        Path(__file__).resolve().parent / ".env"
    )

    database_url = os.getenv("DATABASE_URL")

    if database_url:

        # FIX: Convert SQLAlchemy URL to psycopg2 URL
        database_url = database_url.replace(
            "postgresql+psycopg://",
            "postgresql://",
            1
        )

        database_url = database_url.replace(
            "postgresql+psycopg2://",
            "postgresql://",
            1
        )

        return psycopg2.connect(database_url)

    required = [
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD"
    ]

    missing = [
        key for key in required
        if not os.getenv(key)
    ]

    if missing:
        raise RuntimeError(
            "Missing database settings: "
            + ", ".join(missing)
        )

    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432")
    )


# --------------------------------------------------
# HTML EXTRACTION
# --------------------------------------------------

def get_table_rows(html):

    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    rows = []

    for tr in soup.find_all("tr"):

        cells = [
            cell.get_text(" ", strip=True)
            for cell in tr.find_all(["td", "th"])
        ]

        if cells:
            rows.append(cells)

    return rows


def extract_value(rows, label):

    label = label.strip().lower()

    for cells in rows:

        for index, value in enumerate(cells):

            current = value.strip().rstrip(":").lower()

            if current == label:

                if index + 1 < len(cells):
                    return cells[index + 1].strip()

    return ""


def extract_summary(html):

    rows = get_table_rows(html)

    code = extract_value(
        rows,
        "Institute Code"
    )

    name = extract_value(
        rows,
        "Institute Name"
    )

    address = extract_value(
        rows,
        "Institute Address"
    )

    region = extract_value(
        rows,
        "Region"
    )

    district = extract_value(
        rows,
        "District"
    )

    return {
        "official_code": code,
        "official_name": name,
        "official_address": address,
        "official_region": region,
        "official_district": district
    }


# --------------------------------------------------
# CITY CANDIDATE
# --------------------------------------------------

def city_hint(address):

    if not address:
        return ""

    parts = [
        part.strip(" .")
        for part in address.split(",")
        if part.strip(" .")
    ]

    cleaned = []

    for part in parts:

        part = re.sub(
            r"\b\d{6}\b",
            "",
            part
        ).strip(" ,-")

        if not part:
            continue

        if part.lower() in [
            "maharashtra",
            "india",
            "m.s."
        ]:
            continue

        cleaned.append(part)

    if cleaned:
        return cleaned[-1]

    return ""


# --------------------------------------------------
# FETCH OFFICIAL COLLEGE INFORMATION
# --------------------------------------------------

def fetch_mode():

    print("\nConnecting to PostgreSQL...")

    conn = db_connect()

    try:

        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    institute_code,
                    institute_name
                FROM all_india.ai_colleges
                ORDER BY institute_code
            """)

            colleges = cur.fetchall()

    finally:
        conn.close()

    total = len(colleges)

    print(f"Total colleges found: {total}")

    session = requests.Session()

    session.headers.update(HEADERS)

    output_rows = []

    for index, (institute_code, db_name) in enumerate(
        colleges,
        start=1
    ):

        code = str(institute_code).strip()

        code5 = code.zfill(5)

        url = BASE_URL.format(code5)

        record = {
            "institute_code": code,
            "database_institute_name": db_name or "",
            "official_institute_name": "",
            "official_address": "",
            "official_region": "",
            "official_district": "",
            "city_candidate": "",
            "city_verified": "",
            "source_url": url,
            "fetch_status": ""
        }

        try:

            response = session.get(
                url,
                timeout=30
            )

            response.raise_for_status()

            details = extract_summary(
                response.text
            )

            name = details["official_name"]
            address = details["official_address"]

            if not name and not address:

                record["fetch_status"] = (
                    "NOT_FOUND_OR_PAGE_FORMAT_CHANGED"
                )

            else:

                record["official_institute_name"] = name

                record["official_address"] = address

                record["official_region"] = (
                    details["official_region"]
                )

                record["official_district"] = (
                    details["official_district"]
                )

                record["city_candidate"] = city_hint(
                    address
                )

                record["fetch_status"] = (
                    "FETCHED_REVIEW_CITY"
                )

        except Exception as error:

            record["fetch_status"] = (
                f"FETCH_ERROR: {type(error).__name__}: {error}"
            )

        output_rows.append(record)

        print(
            f"[{index}/{total}] "
            f"{code5}: {record['fetch_status']}"
        )

        # Avoid sending too many requests quickly
        time.sleep(0.25)

    fieldnames = [
        "institute_code",
        "database_institute_name",
        "official_institute_name",
        "official_address",
        "official_region",
        "official_district",
        "city_candidate",
        "city_verified",
        "source_url",
        "fetch_status"
    ]

    with OUTPUT_CSV.open(
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames
        )

        writer.writeheader()

        writer.writerows(output_rows)

    successful = sum(
        1 for row in output_rows
        if row["fetch_status"] == "FETCHED_REVIEW_CITY"
    )

    print("\n========== FETCH SUMMARY ==========")

    print("Total colleges:", total)

    print("Successfully fetched:", successful)

    print("Not fetched:", total - successful)

    print("CSV generated:", OUTPUT_CSV)

    print(
        "\nIMPORTANT: city_candidate is only a hint. "
        "Verify official_address and fill city_verified."
    )


# --------------------------------------------------
# APPLY VERIFIED CITY VALUES
# --------------------------------------------------

def apply_mode():

    if not OUTPUT_CSV.exists():

        raise FileNotFoundError(
            "Review CSV not found. Run fetch first."
        )

    updates = []

    with OUTPUT_CSV.open(
        "r",
        newline="",
        encoding="utf-8-sig"
    ) as file:

        reader = csv.DictReader(file)

        required_columns = {
            "institute_code",
            "city_verified"
        }

        if not required_columns.issubset(
            set(reader.fieldnames or [])
        ):

            raise RuntimeError(
                "Required columns missing from review CSV."
            )

        for row in reader:

            code = (
                row.get("institute_code") or ""
            ).strip()

            city = (
                row.get("city_verified") or ""
            ).strip()

            if code and city:

                updates.append(
                    (city, code, code)
                )

    if not updates:

        print(
            "No verified cities found. Database unchanged."
        )

        return

    print(
        f"\nVerified city records ready: {len(updates)}"
    )

    conn = db_connect()

    try:

        with conn:

            with conn.cursor() as cur:

                cur.executemany("""
                    UPDATE all_india.ai_colleges
                    SET city = %s
                    WHERE institute_code::text = %s
                       OR LPAD(
                            institute_code::text,
                            5,
                            '0'
                       ) = LPAD(%s, 5, '0')
                """, updates)

                affected = cur.rowcount

        print("\n========== DATABASE UPDATE ==========")

        print("Rows updated:", affected)

        print(
            "Updated table: all_india.ai_colleges"
        )

        print(
            "Updated column: city"
        )

        print(
            "Other tables were not modified."
        )

    finally:

        conn.close()


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():

    parser = argparse.ArgumentParser(
        description="All India College City Mapping"
    )

    parser.add_argument(
        "mode",
        choices=["fetch", "apply"]
    )

    args = parser.parse_args()

    if args.mode == "fetch":

        fetch_mode()

    elif args.mode == "apply":

        apply_mode()


if __name__ == "__main__":

    try:

        main()

    except Exception as error:

        print(
            f"\nERROR: {error}",
            file=sys.stderr
        )

        sys.exit(1)
