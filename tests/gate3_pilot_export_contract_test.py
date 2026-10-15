import csv
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "test-results" / "gate3-pilot-browser-export.csv"
output = ROOT / "test-results" / "gate3-pilot-browser-merged.csv"
summary = ROOT / "test-results" / "gate3-pilot-browser-summary.json"

if not source.is_file():
    raise SystemExit("run gate3_pilot_ops_browser_test.mjs first")

process = subprocess.run(
    [sys.executable, str(ROOT / "tools" / "merge_gate3_pilot_exports.py"), str(source), "--output", str(output), "--summary", str(summary)],
    capture_output=True,
    text=True,
    encoding="utf-8",
)
assert process.returncode == 0, process.stderr
with output.open(encoding="utf-8-sig", newline="") as handle:
    row = next(csv.DictReader(handle))
result = json.loads(summary.read_text(encoding="utf-8"))
assert row["t1_seconds"] == "30" and row["t8_seconds"] == "30"
assert row["record_status"] == "complete"
assert row["validation_errors"] == ""
assert row["exported_at"]
assert result["participants_entered"] == 1 and result["participants_valid"] == 1
print("PASS  actual browser export is accepted by the merge tool")
print("PASS  browser timing fields map to canonical analyzer fields")
print("PASS  export audit metadata survives merge and analysis")
