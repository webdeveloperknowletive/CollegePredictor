
from pathlib import Path
import pandas as pd

root = Path("data/raw")

files = [
    "Egg Cap 1 cutoffs 2025.xlsx",
    "Egg Cap 2 cutoffs 2025.xlsx",
    "Egg Cap 3 cutoffs 2025.xlsx",
    "Egg Cap 4 cutoffs 2025.xlsx",
]

frames = []

for filename in files:
    df = pd.read_excel(root / filename, sheet_name="Sheet1",
                       usecols=["dept_code", "dept_name"])
    frames.append(df)

all_branches = pd.concat(frames, ignore_index=True)
all_branches["dept_code"] = all_branches["dept_code"].astype(str).str.replace(r"\.0$", "", regex=True).str.strip()
all_branches["dept_name"] = all_branches["dept_name"].astype(str).str.strip()

mapping_counts = all_branches.groupby("dept_code")["dept_name"].nunique()
conflicts = mapping_counts[mapping_counts > 1]

print("Unique branch codes:", all_branches["dept_code"].nunique())
print("Branch codes with conflicting names:", len(conflicts))

if not conflicts.empty:
    print("\nConflicting mappings:")
    print(
        all_branches[all_branches["dept_code"].isin(conflicts.index)]
        .drop_duplicates()
        .sort_values("dept_code")
        .to_string(index=False)
    )
else:
    print("All branch codes map consistently to one branch name.")
