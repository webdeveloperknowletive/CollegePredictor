"""Safe importer for 2026 Maharashtra CAP 1 and CAP 2 wide cutoff Excel files.

Default is DRY RUN. Add --commit to write to PostgreSQL.
Expected files: data/raw/2026/CAP1_2026.xlsx and CAP2_2026.xlsx
Run from backend venv: python ..\scripts\import_2026_cutoffs.py --dry-run
"""
from pathlib import Path
import argparse, math, re, sys, json, hashlib
import pandas as pd
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
from app.database import engine

FILES = [(ROOT / "data" / "raw" / "2026" / "CAP1_2026.xlsx", 1),
         (ROOT / "data" / "raw" / "2026" / "CAP2_2026.xlsx", 2)]
META = {"sr no", "college code", "college name", "branch code", "branch name", "status", "home university", "level", "stage"}

def clean_code(v):
    if pd.isna(v): return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if not math.isfinite(float(v)): return None
        return str(int(v)) if float(v).is_integer() else str(v).strip()
    s = str(v).strip()
    if s.endswith('.0') and s[:-2].isdigit(): s = s[:-2]
    return s or None

def clean_text(v):
    if pd.isna(v): return None
    s = str(v).strip()
    return s if s and s.casefold() not in {"nan", "none"} else None

def parse_cutoff(v):
    if pd.isna(v): return None
    s = str(v).strip()
    if not s or s in {"-", "—", "–"} or s.casefold() in {"na", "n/a", "nil", "none"}: return None
    m = re.fullmatch(r"([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)", s)
    if not m:
        # A few workbooks may expose a numeric merit/rank only; do not guess its percentile.
        raise ValueError(f"Unsupported cutoff cell: {s!r}")
    rank = int(m.group(1).replace(',', ''))
    percentile = float(m.group(2))
    if not math.isfinite(percentile) or not 0 <= percentile <= 100:
        raise ValueError(f"Invalid percentile: {s!r}")
    return rank, percentile, s

def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--dry-run', action='store_true')
    mode.add_argument('--commit', action='store_true')
    args = parser.parse_args()

    frames=[]; problems=[]; total_values=0
    for path, round_no in FILES:
        if not path.exists():
            raise FileNotFoundError(f"Expected file not found: {path}")
        df = pd.read_excel(path, sheet_name="Cutoffs (Wide)", dtype={"College Code": str, "Branch Code": str})
        required = {"College Code", "College Name", "Branch Code", "Branch Name", "Status", "Level"}
        missing = required - set(df.columns)
        if missing: raise ValueError(f"{path.name} missing columns: {sorted(missing)}")
        df = df.dropna(how="all")
        cats=[c for c in df.columns if str(c).strip().casefold() not in META]
        parsed_rows=[]
        for idx, row in df.iterrows():
            college_code=clean_code(row["College Code"]); college_name=clean_text(row["College Name"])
            branch_code=clean_code(row["Branch Code"]); branch_name=clean_text(row["Branch Name"])
            if not all([college_code, college_name, branch_code, branch_name]):
                problems.append(f"{path.name} row {idx+2}: missing college/branch code or name")
            vals=[]
            for cat in cats:
                v=row[cat]
                try: p=parse_cutoff(v)
                except ValueError as e:
                    problems.append(f"{path.name} row {idx+2}, {cat}: {e}")
                    continue
                if p:
                    vals.append((str(cat).strip(), p)); total_values+=1
            parsed_rows.append({"row_num": int(idx+2), "college_code": college_code, "college_name": college_name,
                "branch_code": branch_code, "branch_name": branch_name, "status": clean_text(row.get("Status")),
                "level": clean_text(row.get("Level")), "stage": clean_text(row.get("Stage")), "values": vals})
        frames.append({"path":path,"round":round_no,"rows":parsed_rows})
        print(f"{path.name}: {len(df)} rows | parsed cutoff values so far: {total_values}")

    if problems:
        print(f"\nVALIDATION ISSUES: {len(problems)} (showing up to 30)")
        for p in problems[:30]: print(" -", p)
        if args.commit:
            print("\nABORTED: fix/inspect validation issues first. No database changes made.")
            return 2
    if not problems and args.dry_run:
        print("\nDRY RUN PASSED. No database changes were made.")
        print("Run with --commit only after checking the totals above.")
    if args.dry_run: return 0
    if problems: return 2

    inserted_colleges=inserted_branches=linked=written_rows=written_values=0
    try:
      with engine.begin() as con:
        # Ensure required columns exist and preserve old data.
        cols={r[0] for r in con.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='cap_cutoffs'"))}
        required_db={"college_branch_id","academic_year","cap_round","level","stage","source_row_number","source_file"}
        if not required_db.issubset(cols): raise RuntimeError(f"cap_cutoffs schema missing columns: {sorted(required_db-cols)}")
        has_status="status" in cols
        college_ids={str(r[1]).strip():r[0] for r in con.execute(text("SELECT id,institute_code FROM colleges"))}
        # Add genuinely absent college codes from 2026 source; never fuzzy-map to a different code.
        source_colleges={}
        for fr in frames:
          for r in fr['rows']: source_colleges.setdefault(r['college_code'],r['college_name'])
        for code,name in source_colleges.items():
          if code not in college_ids:
            res=con.execute(text("INSERT INTO colleges (institute_code,institute_name,master_data) VALUES (:c,:n,CAST(:j AS JSONB)) ON CONFLICT (institute_code) DO NOTHING RETURNING id"),{"c":code,"n":name,"j":json.dumps({"source":"2026 CAP Excel"})}).first()
            if res: inserted_colleges+=1
        college_ids={str(r[1]).strip():r[0] for r in con.execute(text("SELECT id,institute_code FROM colleges"))}
        # Keep existing branch names untouched. Resolve a source branch by exact code+name;
        # if code is occupied by another name, create a deterministic source-specific code.
        branch_rows=con.execute(text("SELECT id,branch_code,branch_name FROM branches")).fetchall()
        branch_by_code={str(r[1]).strip():(r[0],str(r[2]).strip()) for r in branch_rows}
        source_branches={}
        for fr in frames:
          for r in fr['rows']: source_branches.setdefault((r['branch_code'],r['branch_name']),(r['branch_code'],r['branch_name']))
        branch_ids={}
        for (src_code,name) in source_branches:
          existing=branch_by_code.get(src_code)
          if existing and existing[1]==name:
            branch_ids[(src_code,name)]=existing[0]; continue
          target_code=src_code
          if existing and existing[1]!=name:
            suffix=hashlib.sha1((src_code+'|'+name).encode()).hexdigest()[:8]
            target_code=(src_code[:20]+'_'+suffix)[:30]
          found=con.execute(text("SELECT id,branch_name FROM branches WHERE branch_code=:c"),{"c":target_code}).first()
          if found and str(found[1]).strip()==name:
            branch_ids[(src_code,name)]=found[0]; continue
          if found:
            raise RuntimeError(f"Could not safely resolve branch code {src_code!r} / {name!r}")
          res=con.execute(text("INSERT INTO branches (branch_code,branch_name) VALUES (:c,:n) RETURNING id"),{"c":target_code,"n":name}).scalar_one()
          inserted_branches+=1; branch_ids[(src_code,name)]=res
        # Create college-branch links and cache ids.
        cb_ids={}
        for fr in frames:
          for r in fr['rows']:
            key=(r['college_code'],r['branch_code'],r['branch_name'])
            if key in cb_ids: continue
            college_id=college_ids.get(r['college_code'])
            branch_id=branch_ids[(r['branch_code'],r['branch_name'])]
            res=con.execute(text("INSERT INTO college_branches (college_id,branch_id) VALUES (:c,:b) ON CONFLICT (college_id,branch_id) DO NOTHING RETURNING id"),{"c":college_id,"b":branch_id}).first()
            if res: cbid=res[0]; linked+=1
            else: cbid=con.execute(text("SELECT id FROM college_branches WHERE college_id=:c AND branch_id=:b"),{"c":college_id,"b":branch_id}).scalar_one()
            cb_ids[key]=cbid
        # Use unique source filenames to avoid touching 2025 rows.
        for fr in frames:
          path=fr['path']; rnd=fr['round']; source_file=path.name
          for r in fr['rows']:
            cbid=cb_ids[(r['college_code'],r['branch_code'],r['branch_name'])]
            params={"cb":cbid,"year":"2026","rnd":rnd,"level":r['level'],"stage":r['stage'],"row":r['row_num'],"file":source_file}
            if has_status:
              sql="""INSERT INTO cap_cutoffs (college_branch_id,academic_year,cap_round,status,level,stage,source_row_number,source_file) VALUES (:cb,:year,:rnd,:status,:level,:stage,:row,:file) ON CONFLICT (source_file,source_row_number) DO UPDATE SET college_branch_id=EXCLUDED.college_branch_id,academic_year=EXCLUDED.academic_year,cap_round=EXCLUDED.cap_round,status=EXCLUDED.status,level=EXCLUDED.level,stage=EXCLUDED.stage RETURNING id"""
              params['status']=r['status']
            else:
              sql="""INSERT INTO cap_cutoffs (college_branch_id,academic_year,cap_round,level,stage,source_row_number,source_file) VALUES (:cb,:year,:rnd,:level,:stage,:row,:file) ON CONFLICT (source_file,source_row_number) DO UPDATE SET college_branch_id=EXCLUDED.college_branch_id,academic_year=EXCLUDED.academic_year,cap_round=EXCLUDED.cap_round,level=EXCLUDED.level,stage=EXCLUDED.stage RETURNING id"""
            cutoff_id=con.execute(text(sql),params).scalar_one(); written_rows+=1
            for cat,p in r['values']:
              rank,pct,original=p
              con.execute(text("INSERT INTO cutoff_values (cap_cutoff_id,category_code,closing_rank,percentile,original_value) VALUES (:id,:cat,:rank,:pct,:orig) ON CONFLICT (cap_cutoff_id,category_code) DO UPDATE SET closing_rank=EXCLUDED.closing_rank,percentile=EXCLUDED.percentile,original_value=EXCLUDED.original_value"),{"id":cutoff_id,"cat":cat,"rank":rank,"pct":pct,"orig":original})
              written_values+=1
      print("\nIMPORT COMMITTED")
      print(f"New colleges: {inserted_colleges}; new branches: {inserted_branches}; new college-branch links: {linked}")
      print(f"2026 CAP rows processed: {written_rows}; cutoff values processed: {written_values}")
      with engine.connect() as con:
        print("\nDATABASE COUNTS BY YEAR/ROUND:")
        for row in con.execute(text("SELECT academic_year,cap_round,COUNT(*) FROM cap_cutoffs GROUP BY academic_year,cap_round ORDER BY academic_year,cap_round")):
          print(tuple(row))
    except Exception as e:
      print("IMPORT FAILED; transaction rolled back:",repr(e)); raise
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
