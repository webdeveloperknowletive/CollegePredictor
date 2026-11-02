
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "data" / "raw" / "2026"

FILES = [
    "2026ENGG_CAP3_MH_CutOff.pdf",
    "2026ENGG_CAP4_MH_CutOff.pdf",
]

for filename in FILES:
    pdf_path = PDF_DIR / filename

    print("\n" + "=" * 80)
    print(f"FILE: {filename}")
    print("=" * 80)

    if not pdf_path.exists():
        print(f"ERROR: PDF not found: {pdf_path}")
        continue

    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")

        # Inspect the first 3 pages only.
        for page_number, page in enumerate(pdf.pages[:3], start=1):
            text = page.extract_text() or ""

            print(f"\n--- PAGE {page_number} ---")
            print(text[:5000] if text else "[No selectable text found]")
