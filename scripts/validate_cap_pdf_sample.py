
from pathlib import Path
import re
import pandas as pd
import pdfplumber

BASE_DIR = Path(__file__).resolve().parents[1]

PDF_PATH = (
    BASE_DIR
    / "data"
    / "raw"
    / "2026"
    / "2026ENGG_CAP3_MH_CutOff.pdf"
)

EXCEL_PATH = (
    BASE_DIR
    / "data"
    / "raw"
    / "2026"
    / "CAP3_2026_CLEANED.xlsx"
)

# First course shown on PDF page 1.
COLLEGE_CODE = "01002"
BRANCH_CODE = "0100219110"
STAGE = "I"

CATEGORIES = [
    "GOPENS",
    "GSCS",
    "GVJS",
    "GOBCS",
    "TFWS",
    "ORPHANI",
    "EWS",
]


def normalize_code(value, width):
    """Normalize Excel numeric/string codes without losing leading zeros."""
    if pd.isna(value):
        return ""

    text = str(value).strip()

    if text.endswith(".0"):
        text = text[:-2]

    return text.zfill(width)


def parse_cutoff(value):
    """Parse a cell such as '31460 (92.5616727%)'."""
    if pd.isna(value):
        return None, None

    text = str(value).strip()

    match = re.fullmatch(
        r"(\d+)\s*\(\s*([\d.]+)\s*%?\s*\)",
        text,
    )

    if not match:
        return None, None

    return int(match.group(1)), float(match.group(2))


def main():
    df = pd.read_excel(
        EXCEL_PATH,
        sheet_name="Cutoffs (Wide)",
        dtype={"College Code": str, "Branch Code": str},
    )

    df["College Code"] = df["College Code"].map(
        lambda value: normalize_code(value, 5)
    )
    df["Branch Code"] = df["Branch Code"].map(
        lambda value: normalize_code(value, 10)
    )
    df["Stage"] = df["Stage"].astype(str).str.strip()

    rows = df[
        (df["College Code"] == COLLEGE_CODE)
        & (df["Branch Code"] == BRANCH_CODE)
        & (df["Stage"] == STAGE)
    ]

    if rows.empty:
        print("ERROR: Matching course/stage not found in Excel.")
        print("Inspect the workbook's code and stage formats.")
        return

    if len(rows) > 1:
        print(f"WARNING: Found {len(rows)} matching Excel rows.")

    excel_row = rows.iloc[0]

    print("PDF:", PDF_PATH.name)
    print("Excel:", EXCEL_PATH.name)
    print(
        f"Course: {COLLEGE_CODE} / {BRANCH_CODE} / Stage {STAGE}"
    )
    print()
    print(
        f"{'CATEGORY':<12} {'PDF RANK':>10} "
        f"{'PDF %':>12} {'EXCEL RANK':>12} "
        f"{'EXCEL %':>12} {'RESULT':>12}"
    )
    print("-" * 76)

    with pdfplumber.open(PDF_PATH) as pdf:
        page = pdf.pages[0]

        # Extract rank and percentile pairs from the table area
        # for the first course, before the next course begins.
        words = page.extract_words(
            x_tolerance=2,
            y_tolerance=3,
        )

        ranks = {}
        percentiles = {}

        category_positions = {}

        for word in words:
            if 150 <= word["top"] <= 175:
                if word["text"] in CATEGORIES:
                    category_positions[word["text"]] = word["x0"]

        for word in words:
            if not (180 <= word["top"] <= 235):
                continue

            text = word["text"]
            x = word["x0"]

            for category, category_x in category_positions.items():
                if abs(x - category_x) < 15:
                    if re.fullmatch(r"\d+", text):
                        ranks[category] = int(text)

                    percentile_match = re.fullmatch(
                        r"\(([\d.]+)\)",
                        text,
                    )

                    if percentile_match:
                        percentiles[category] = float(
                            percentile_match.group(1)
                        )

    mismatches = 0

    for category in CATEGORIES:
        pdf_rank = ranks.get(category)
        pdf_percentile = percentiles.get(category)

        excel_rank, excel_percentile = parse_cutoff(
            excel_row.get(category)
        )

        if (
            pdf_rank == excel_rank
            and (
                (pdf_percentile is None and excel_percentile is None)
                or (
                    pdf_percentile is not None
                    and excel_percentile is not None
                    and abs(pdf_percentile - excel_percentile) < 0.0000001
                )
            )
        ):
            result = "MATCH"
        else:
            result = "CHECK"
            mismatches += 1

        print(
            f"{category:<12} "
            f"{str(pdf_rank):>10} "
            f"{str(pdf_percentile):>12} "
            f"{str(excel_rank):>12} "
            f"{str(excel_percentile):>12} "
            f"{result:>12}"
        )

    print()
    if mismatches:
        print(
            f"{mismatches} categories need inspection. "
            "Do not import yet."
        )
    else:
        print("All selected categories match for this sample.")


if __name__ == "__main__":
    main()
