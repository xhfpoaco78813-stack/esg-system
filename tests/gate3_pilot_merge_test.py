import csv
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MERGER = ROOT / "tools" / "merge_gate3_pilot_exports.py"
TEMPLATE = ROOT / "data" / "gate3-pilot-raw.csv"


def completed_row(fields, participant_id, segment):
    row = {field: "" for field in fields}
    row.update({
        "participant_id": participant_id, "pilot_started": "yes", "segment": segment,
        "device": "desktop", "os": "Windows 11", "browser": "Edge", "browser_version": "155",
        "operation_error_count": "0", "help_count": "0", "pre_score": "50", "post_score": "70",
        "data_loss_count": "0", "unrecoverable_block_count": "0", "p0_count": "0", "p1_count": "0",
    })
    for index in range(1, 9):
        task = next(field for field in fields if field.startswith(f"t{index}_") and field.endswith("_success"))
        row[task] = "pass"
        row[f"t{index}_seconds"] = "30"
    for index in range(1, 11):
        row[f"sus_q{index}"] = "5" if index % 2 else "1"
    return row


def write_one(path, fields, row):
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerow(row)


with TEMPLATE.open(encoding="utf-8-sig", newline="") as handle:
    fields = csv.DictReader(handle).fieldnames

with tempfile.TemporaryDirectory(dir=ROOT / "test-results") as directory:
    folder = Path(directory)
    paths = []
    for index in range(1, 11):
        path = folder / f"gate3-pilot-P{index:02d}.csv"
        write_one(path, fields, completed_row(fields, f"P{index:02d}", "beginner" if index <= 5 else "practitioner"))
        paths.append(path)
    output = folder / "combined.csv"
    summary = folder / "summary.json"
    merged = subprocess.run(
        [sys.executable, str(MERGER), str(folder), "--output", str(output), "--summary", str(summary)],
        capture_output=True, text=True,
    )
    assert merged.returncode == 0, merged.stderr
    result = json.loads(summary.read_text(encoding="utf-8"))
    assert result["participants_entered"] == 10
    assert result["decision"] == "PASS"
    with output.open(encoding="utf-8-sig", newline="") as handle:
        combined = list(csv.DictReader(handle))
    assert len(combined) == 10 and list(combined[0]) == fields

    duplicate = folder / "gate3-pilot-P20.csv"
    write_one(duplicate, fields, completed_row(fields, "P01", "beginner"))
    duplicate_result = subprocess.run(
        [sys.executable, str(MERGER), *map(str, paths), str(duplicate), "--output", str(folder / "duplicate.csv"), "--summary", str(folder / "duplicate.json")],
        capture_output=True, text=True,
    )
    assert duplicate_result.returncode != 0 and "duplicate participant_id" in duplicate_result.stderr

print("PASS  ten individual participant exports merge without field loss")
print("PASS  merged participant IDs remain unique")
print("PASS  merged output preserves the canonical CSV field order")
print("PASS  merged valid pilot data is analyzed as PASS")
print("PASS  duplicate participant exports are rejected")

