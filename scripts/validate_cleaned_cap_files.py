"""Validate cleaned 2026 CAP3/CAP4 Excel workbooks against originals.

Run from the College Predictor project root:
    backend\venv\Scripts\python.exe scripts\validate_cleaned_cap_files.py

This script is read-only: it does not change Excel files or the database.
It verifies workbook shape/columns, checks that every non-Status cell is
unchanged, summarizes Status edits, and validates the format of non-empty
cutoff cells. It does NOT prove the values match the official PDFs.
"""
from __future__ import annotations

import math
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "raw" / "2026"
SHEET_NAME = "Cutoffs (Wide)"
WORKBOOKS = [
    ("CAP3_2026.xlsx", "CAP3_2026_CLEANED.xlsx", 6348),
    ("CAP4_2026.xlsx", "CAP4_2026_CLEANED.xlsx", 5604),
]

# Recognizes values such as 12345 (98.7654%).
CUTOFF_RE = re.compile(r"([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)")
EMPTY_MARKERS = {"", "-", "—", "–", "na", "n/a", "nil", "none", "nan"}


def is_empty(value) -> bool:
    if pd.isna(value):
        return True
    return str(value).strip().casefold() in EMPTY_MARKERS


def normalize(value):
    """Normalize Excel scalar values for reliable original-vs-cleaned comparison."""
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        number = float(value)
        if math.isfinite(number) and number.is_integer():
            return str(int(number))
        return str(value).strip()
    return str(value).strip()


def is_valid_cutoff(value) -> bool:
    if is_empty(value):
        return True
    match = CUTOFF_RE.fullmatch(str(value).strip())
    if not match:
        return False
    try:
        rank = int(match.group(1).replace(",", ""))
        percentile = float(match.group(2))
    except ValueError:
        return False
    return rank >= 0 and math.isfinite(percentile) and 0 <= percentile <= 100


def main() -> int:
    all_ok = True

    for original_name, cleaned_name, expected_rows in WORKBOOKS:
        original_path = DATA_DIR / original_name
        cleaned_path = DATA_DIR / cleaned_name
        print("\n" + "=" * 72)
        print(f"Checking {original_name} against {cleaned_name}")

        if not original_path.exists() or not cleaned_path.exists():
            print("FAIL: Missing file(s):")
            if not original_path.exists():
                print(f"  - {original_path}")
            if not cleaned_path.exists():
                print(f"  - {cleaned_path}")
            all_ok = False
            continue

        try:
            original = pd.read_excel(original_path, sheet_name=SHEET_NAME, dtype=object)
            cleaned = pd.read_excel(cleaned_path, sheet_name=SHEET_NAME, dtype=object)
        except Exception as exc:
            print(f"FAIL: Could not read workbook/sheet: {exc}")
            all_ok = False
            continue

        print(f"Original shape: {original.shape[0]} rows x {original.shape[1]} columns")
        print(f"Cleaned shape:  {cleaned.shape[0]} rows x {cleaned.shape[1]} columns")

        workbook_ok = True
        if len(original) != expected_rows or len(cleaned) != expected_rows:
            print(f"FAIL: Expected {expected_rows} data rows in both files.")
            workbook_ok = False
        if list(original.columns) != list(cleaned.columns):
            print("FAIL: Column names/order differ between original and cleaned file.")
            print("Original columns:", list(original.columns))
            print("Cleaned columns: ", list(cleaned.columns))
            workbook_ok = False

        if list(original.columns) != list(cleaned.columns) or len(original) != len(cleaned):
            print("Cannot compare cells safely because shape/columns differ.")
            all_ok = False
            continue

        if "Status" not in original.columns:
            print("FAIL: Required 'Status' column not found.")
            all_ok = False
            continue

        # Check that all columns other than Status are unchanged, cell by cell.
        non_status_differences = []
        for column in original.columns:
            if column == "Status":
                continue
            left = original[column].tolist()
            right = cleaned[column].tolist()
            for row_index, (old, new) in enumerate(zip(left, right), start=2):
                if normalize(old) != normalize(new):
                    non_status_differences.append((row_index, column, old, new))
                    if len(non_status_differences) >= 10:
                        break
            if len(non_status_differences) >= 10:
                break

        if non_status_differences:
            print("FAIL: Non-Status cell changes found (showing up to 10):")
            for row_num, col, old, new in non_status_differences:
                print(f"  Excel row {row_num}, {col!r}: {old!r} -> {new!r}")
            workbook_ok = False
        else:
            print("PASS: All non-Status columns match the original cell by cell.")

        # Summarize Status changes; do not assume clearing them is correct.
        status_changes = []
        cleared_status = 0
        changed_status = 0
        for row_index, (old, new) in enumerate(
            zip(original["Status"].tolist(), cleaned["Status"].tolist()), start=2
        ):
            old_norm, new_norm = normalize(old), normalize(new)
            if old_norm != new_norm:
                changed_status += 1
                if new_norm is None:
                    cleared_status += 1
                if len(status_changes) < 8:
                    status_changes.append((row_index, old, new))

        print(f"Status cells changed: {changed_status}")
        print(f"Status cells cleared: {cleared_status}")
        if status_changes:
            print("Sample Status changes (up to 8):")
            for row_num, old, new in status_changes:
                print(f"  Excel row {row_num}: {old!r} -> {new!r}")
        else:
            print("No Status changes found.")

        # Identify cutoff columns by excluding known metadata columns.
        metadata = {
            "sr no", "college code", "college name", "branch code", "branch name",
            "status", "home university", "level", "stage", "source pdf page",
        }
        cutoff_columns = [
            col for col in original.columns if str(col).strip().casefold() not in metadata
        ]

        invalid_cutoffs = []
        original_nonempty = 0
        cleaned_nonempty = 0
        cutoff_cell_differences = []
        for column in cutoff_columns:
            for row_index, (old, new) in enumerate(
                zip(original[column].tolist(), cleaned[column].tolist()), start=2
            ):
                if not is_empty(old):
                    original_nonempty += 1
                if not is_empty(new):
                    cleaned_nonempty += 1
                if normalize(old) != normalize(new):
                    cutoff_cell_differences.append((row_index, column, old, new))
                    if len(cutoff_cell_differences) >= 10:
                        break
                if not is_valid_cutoff(new):
                    invalid_cutoffs.append((row_index, column, new))
                    if len(invalid_cutoffs) >= 10:
                        break
            if len(cutoff_cell_differences) >= 10 or len(invalid_cutoffs) >= 10:
                break

        print(f"Cutoff category columns: {len(cutoff_columns)}")
        print(f"Non-empty cutoff cells in original: {original_nonempty}")
        print(f"Non-empty cutoff cells in cleaned:  {cleaned_nonempty}")

        if cutoff_cell_differences:
            print("FAIL: Cutoff cells changed (showing up to 10):")
            for row_num, col, old, new in cutoff_cell_differences:
                print(f"  Excel row {row_num}, {col!r}: {old!r} -> {new!r}")
            workbook_ok = False
        else:
            print("PASS: Cutoff cells match the original (checked cell by cell).")

        if invalid_cutoffs:
            print("FAIL: Invalid non-empty cutoff values (showing up to 10):")
            for row_num, col, value in invalid_cutoffs:
                print(f"  Excel row {row_num}, {col!r}: {value!r}")
            workbook_ok = False
        else:
            print("PASS: Non-empty cutoff cells use the expected rank/percentile format.")

        if workbook_ok:
            print("WORKBOOK CHECK: PASS (Status edits still require semantic review).")
        else:
            print("WORKBOOK CHECK: FAIL")
            all_ok = False

    print("\n" + "=" * 72)
    if all_ok:
        print("VALIDATION PASSED for workbook structure and cutoff-cell preservation.")
        print("IMPORTANT: This does NOT verify cutoff accuracy against the official PDFs,")
        print("and does NOT certify that clearing Status values was appropriate.")
        print("No files or database records were changed.")
        return 0

    print("VALIDATION FAILED. Do not import until the reported issues are resolved.")
    print("No files or database records were changed.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
