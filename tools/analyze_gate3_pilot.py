import argparse
import csv
import json
from pathlib import Path

TASKS = [f"t{i}_{name}_success" for i, name in [
    (1, "login"), (2, "learning"), (3, "practice"), (4, "wrong_created"),
    (5, "wrong_recovery"), (6, "report"), (7, "resume"), (8, "sync")
]]

def number(row, key):
    value = (row.get(key) or "").strip()
    return float(value) if value else None

def truth(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "y", "pass", "成功", "通過"}

def sus(row):
    scores = [number(row, f"sus_q{i}") for i in range(1, 11)]
    if any(score is None or score < 1 or score > 5 for score in scores):
        return None
    adjusted = [(score - 1) if index % 2 == 1 else (5 - score) for index, score in enumerate(scores, 1)]
    return sum(adjusted) * 2.5

parser = argparse.ArgumentParser(description="Analyze System-ESG Gate 3 human pilot data")
parser.add_argument("csv_path")
parser.add_argument("--output")
args = parser.parse_args()

with Path(args.csv_path).open(encoding="utf-8-sig", newline="") as handle:
    rows = [row for row in csv.DictReader(handle) if (row.get("participant_id") or "").strip() and any(str(value or "").strip() for key, value in row.items() if key not in {"participant_id", None})]

valid = []
for row in rows:
    pre, post, score = number(row, "pre_score"), number(row, "post_score"), sus(row)
    if pre is not None and post is not None and score is not None and all((row.get(task) or "").strip() for task in TASKS):
        valid.append((row, pre, post, score))

task_total = len(valid) * len(TASKS)
task_pass = sum(truth(row[task]) for row, *_ in valid for task in TASKS)
completion = (task_pass / task_total * 100) if task_total else 0
improvements = [post - pre for _, pre, post, _ in valid]
sus_scores = [score for *_, score in valid]
data_loss = sum(int(number(row, "data_loss_count") or 0) for row, *_ in valid)
blocks = sum(int(number(row, "unrecoverable_block_count") or 0) for row, *_ in valid)
p0 = sum(int(number(row, "p0_count") or 0) for row, *_ in valid)
p1 = sum(int(number(row, "p1_count") or 0) for row, *_ in valid)
segments = sorted({row["segment"].strip() for row, *_ in valid if row["segment"].strip()})
result = {
    "participants_entered": len(rows), "participants_valid": len(valid), "segments": segments,
    "core_task_pass": task_pass, "core_task_total": task_total,
    "core_task_completion_percent": round(completion, 2),
    "average_improvement_percentage_points": round(sum(improvements) / len(improvements), 2) if improvements else None,
    "average_sus": round(sum(sus_scores) / len(sus_scores), 2) if sus_scores else None,
    "data_loss_count": data_loss, "unrecoverable_block_count": blocks, "p0_count": p0, "p1_count": p1,
}
checks = {
    "sample_at_least_10": len(valid) >= 10,
    "both_target_segments": len(segments) >= 2,
    "task_completion_at_least_95": completion >= 95,
    "data_loss_zero": data_loss == 0,
    "unrecoverable_blocks_zero": blocks == 0,
    "average_improvement_at_least_15pp": bool(improvements) and sum(improvements) / len(improvements) >= 15,
    "average_sus_at_least_70": bool(sus_scores) and sum(sus_scores) / len(sus_scores) >= 70,
    "p0_zero": p0 == 0,
    "p1_zero": p1 == 0,
}
result["checks"] = checks
result["decision"] = "PASS" if all(checks.values()) else "HOLD"
encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
if args.output:
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(encoded, encoding="utf-8")
print(encoded, end="")
