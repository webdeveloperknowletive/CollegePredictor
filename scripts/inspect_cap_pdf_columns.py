
from pathlib import Path
import pdfplumber

pdf_path = Path("data/raw/2026/2026ENGG_CAP3_MH_CutOff.pdf")

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[0]

    print("PDF:", pdf_path.name)
    print("Page:", 1)
    print("\nExtracted words with horizontal positions:")
    print("-" * 100)

    words = page.extract_words(
        x_tolerance=2,
        y_tolerance=3,
        keep_blank_chars=False
    )

    for word in words:
        text = word["text"]

        # Focus on the first course and its table.
        if word["top"] < 350:
            print(
                f"x0={word['x0']:7.2f} "
                f"x1={word['x1']:7.2f} "
                f"y={word['top']:7.2f} "
                f"text={text}"
            )
