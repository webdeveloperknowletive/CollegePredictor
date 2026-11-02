
from pathlib import Path
import pdfplumber

pdf_files = [
    Path("data/raw/2026/2026ENGG_CAP3_MH_CutOff.pdf"),
    Path("data/raw/2026/2026ENGG_CAP4_MH_CutOff.pdf"),
]

for path in pdf_files:
    print("\n" + "=" * 80)
    print("FILE:", path.name)
    print("=" * 80)

    if not path.exists():
        print("ERROR: PDF not found")
        continue

    with pdfplumber.open(path) as pdf:
        print("Total pages:", len(pdf.pages))

        # Inspect representative pages without modifying any files.
        page_indexes = sorted(
            set([0, 1, 2, len(pdf.pages) // 2, len(pdf.pages) - 1])
        )

        for index in page_indexes:
            if index < 0 or index >= len(pdf.pages):
                continue

            page = pdf.pages[index]
            text = page.extract_text()

            print(f"\n--- PAGE {index + 1} ---")
            print(text[:3500] if text else "[No text extracted from this page]")

print("\nPDF inspection complete. No database changes were made.")
