import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "data" / "gate3-pilot-raw.csv"
ANALYZER = ROOT / "tools" / "analyze_gate3_pilot.py"


def read_one(path, required_headers):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = set(reader.fieldnames or [])
        rows = list(reader)
    missing = required_headers - headers
    if missing:
        raise ValueError(f"{path.name}: missing headers: {', '.join(sorted(missing))}")
    if len(rows) != 1:
        raise ValueError(f"{path.name}: expected exactly one participant row, found {len(rows)}")
    return rows[0]


parser = argparse.ArgumentParser(description="Merge individual System-ESG Gate 3 pilot CSV exports")
parser.add_argument("inputs", nargs="+", help="Participant CSV files or directories containing gate3-pilot-P*.csv")
parser.add_argument("--output", default=str(ROOT / "data" / "gate3-pilot-collected.csv"))
parser.add_argument("--summary", default=str(ROOT / "test-results" / "gate3-pilot-summary.json"))
args = parser.parse_args()

with TEMPLATE.open(encoding="utf-8-sig", newline="") as handle:
    fieldnames = csv.DictReader(handle).fieldnames or []
required = set(fieldnames)

paths = []
for raw in args.inputs:
    candidate = Path(raw)
    if candidate.is_dir():
        paths.extend(sorted(candidate.glob("gate3-pilot-P*.csv")))
    elif candidate.is_file():
        paths.append(candidate)
    else:
        raise SystemExit(f"input not found: {candidate}")
paths = list(dict.fromkeys(path.resolve() for path in paths))
if not paths:
    raise SystemExit("no participant CSV files found")

rows = []
ids = set()
try:
    for path in paths:
        row = read_one(path, required)
        participant_id = str(row.get("participant_id") or "").strip()
        if not participant_id:
            raise ValueError(f"{path.name}: participant_id is blank")
        if participant_id in ids:
            raise ValueError(f"duplicate participant_id: {participant_id}")
        ids.add(participant_id)
        rows.append({field: row.get(field, "") for field in fieldnames})
except ValueError as error:
    raise SystemExit(str(error))

output = Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
with output.open("w", encoding="utf-8-sig", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(sorted(rows, key=lambda row: row["participant_id"]))

summary = Path(args.summary).resolve()
summary.parent.mkdir(parents=True, exist_ok=True)
process = subprocess.run(
    [sys.executable, str(ANALYZER), str(output), "--output", str(summary)],
    capture_output=True,
    text=True,
)
if process.returncode:
    sys.stderr.write(process.stderr)
    raise SystemExit(process.returncode)
result = json.loads(process.stdout)
print(f"PASS merged {len(rows)} unique participant exports -> {output}")
print(f"Gate 3 decision: {result['decision']}")
print(f"Summary: {summary}")

