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
        "os": "Windows 11",
        "pre_score": "50",
        "post_score": "70",
        "operation_error_count": "0",
        "help_count": "0",
        "data_loss_count": "0",
        "unrecoverable_block_count": "0",
        "p0_count": "0",
        "p1_count": "0",
    })
    for index in range(1, 9):
        task = next(field for field in fieldnames if field.startswith(f"t{index}_") and field.endswith("_success"))
        row[task] = "pass"
        row[f"t{index}_seconds"] = "30"
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
    completed_row(fields, f"P{index:02d}", "beginner" if index <= 5 else "practitioner")
    for index in range(1, 11)
]
pass_result = analyze(complete, fields)
assert pass_result["decision"] == "PASS"
assert pass_result["core_task_completion_percent"] == 100

mixed = complete + [
    {**completed_row(fields, f"P{index:02d}", "practitioner"), **{
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

wrong_segments = [
    completed_row(fields, f"S{index:02d}", "beginner" if index <= 9 else "arbitrary-group")
    for index in range(1, 11)
]
segment_result = analyze(wrong_segments, fields)
assert segment_result["valid_segment_counts"] == {"beginner": 9, "practitioner": 0}
assert segment_result["checks"]["practitioner_at_least_5"] is False
assert any(error["field"] == "segment" for error in segment_result["validation_errors"])
assert segment_result["decision"] == "HOLD"

invalid_values = [
    completed_row(fields, f"V{index:02d}", "beginner" if index <= 5 else "practitioner")
    for index in range(1, 11)
]
invalid_values[0].update({"pre_score": "-100", "post_score": "200", "t1_seconds": "-5"})
for offset, field in enumerate([
    "operation_error_count", "help_count", "data_loss_count",
    "unrecoverable_block_count", "p0_count", "p1_count",
], start=1):
    invalid_values[offset][field] = "-1"
invalid_values[7]["sus_q4"] = "6"
invalid_values[8]["t8_seconds"] = "not-a-number"
value_result = analyze(invalid_values, fields)
assert value_result["checks"]["input_data_valid"] is False
assert {error["field"] for error in value_result["validation_errors"]} >= {
    "pre_score", "post_score", "t1_seconds", "t8_seconds", "sus_q4",
    "operation_error_count", "help_count", "data_loss_count",
    "unrecoverable_block_count", "p0_count", "p1_count",
}
assert value_result["decision"] == "HOLD"

oversized_result = analyze([
    completed_row(fields, f"L{index:02d}", "beginner" if index <= 11 else "practitioner")
    for index in range(1, 22)
], fields)
assert oversized_result["checks"]["sample_between_10_and_20"] is False
assert oversized_result["decision"] == "HOLD"

print("PASS  complete 10-person pilot can satisfy all Gate 3 thresholds")
print("PASS  incomplete participants remain in the task-completion denominator")
print("PASS  10 completed plus 10 incomplete participants returns HOLD")
print("PASS  arbitrary segment labels cannot satisfy the two-group gate")
print("PASS  each fixed segment requires at least five valid participants")
print("PASS  out-of-range scores, SUS, time, and counts produce validation_errors and HOLD")
print("PASS  samples larger than 20 participants return HOLD")
