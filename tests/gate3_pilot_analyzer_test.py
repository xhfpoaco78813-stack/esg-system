import csv
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ANALYZER = ROOT / "tools" / "analyze_gate3_pilot.py"
TEMPLATE = ROOT / "data" / "gate3-pilot-raw.csv"


def completed_row(fieldnames, participant_id, segment):
    row = {field: "" for field in fieldnames}
    row.update({
        "participant_id": participant_id,
        "pilot_started": "yes",
        "segment": segment,
        "device": "desktop",
        "browser": "Edge",
        "browser_version": "140",
        "pre_score": "50",
        "post_score": "70",
        "data_loss_count": "0",
        "unrecoverable_block_count": "0",
        "p0_count": "0",
        "p1_count": "0",
    })
    for index in range(1, 9):
        task = next(field for field in fieldnames if field.startswith(f"t{index}_") and field.endswith("_success"))
        row[task] = "pass"
    for index in range(1, 11):
        row[f"sus_q{index}"] = "5" if index % 2 else "1"
    return row


def analyze(rows, fieldnames):
    with tempfile.TemporaryDirectory(dir=ROOT / "test-results") as directory:
        csv_path = Path(directory) / "pilot.csv"
        with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        process = subprocess.run(
            [sys.executable, str(ANALYZER), str(csv_path)],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(process.stdout)


with TEMPLATE.open(encoding="utf-8-sig", newline="") as handle:
    fields = csv.DictReader(handle).fieldnames

complete = [
    completed_row(fields, f"P{index:02d}", "ESG 初學者" if index <= 5 else "ESG 實務人員")
    for index in range(1, 11)
]
pass_result = analyze(complete, fields)
assert pass_result["decision"] == "PASS"
assert pass_result["core_task_completion_percent"] == 100

mixed = complete + [
    {**completed_row(fields, f"P{index:02d}", "ESG 實務人員"), **{
        "pre_score": "", "post_score": "", "sus_q1": "", "t8_sync_success": ""
    }}
    for index in range(11, 21)
]
hold_result = analyze(mixed, fields)
assert hold_result["participants_entered"] == 20
assert hold_result["participants_valid"] == 10
assert hold_result["participants_incomplete"] == 10
assert hold_result["core_task_completion_percent"] == 93.75
assert hold_result["checks"]["all_started_participants_have_complete_records"] is False
assert hold_result["decision"] == "HOLD"

print("PASS  complete 10-person pilot can satisfy all Gate 3 thresholds")
print("PASS  incomplete participants remain in the task-completion denominator")
print("PASS  10 completed plus 10 incomplete participants returns HOLD")
