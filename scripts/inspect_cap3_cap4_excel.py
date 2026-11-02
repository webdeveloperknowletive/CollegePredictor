
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "raw" / "2026"

for filename in ["CAP3_2026.xlsx", "CAP4_2026.xlsx"]:
    path = DATA_DIR / filename
    df = pd.read_excel(path, sheet_name="Cutoffs (Wide)").dropna(how="all")

    print("\n" + "=" * 90)
    print(filename, "- Government College of Engineering, Amravati")
    print("=" * 90)

    # Locate the college by name, avoiding assumptions about code formatting.
    mask = df["College Name"].astype(str).str.contains(
        "Government College of Engineering, Amravati",
        case=False,
        regex=False,
        na=False,
    )
    college = df.loc[mask]

    if college.empty:
        print("College not found.")
        continue

    metadata = {
        "sr no", "college code", "college name", "branch code",
        "branch name", "status", "home university", "level",
        "stage", "source pdf page",
    }
    cutoff_cols = [
        c for c in df.columns
        if str(c).strip().casefold() not in metadata
    ]

    for _, row in college.head(12).iterrows():
        print("\nBranch:", row.get("Branch Name"))
        print("Branch Code:", row.get("Branch Code"))
        print("Status:", row.get("Status"))
        print("Level:", row.get("Level"))
        print("Stage:", row.get("Stage"))
        print("Source PDF Page:", row.get("Source PDF Page"))

        values = []
        for col in cutoff_cols:
            value = row[col]
            if pd.notna(value) and str(value).strip() not in {"", "-", "â€”", "â€“"}:
                values.append(f"{col} = {value}")

        print("Cutoffs:")
        print("\n".join(values) if values else "[No cutoff values]")
