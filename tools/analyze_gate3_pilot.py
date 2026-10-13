import argparse
import csv
import json
import math
from collections import Counter
from pathlib import Path

SEGMENTS = {"beginner", "practitioner"}
TASKS = [f"t{i}_{name}_success" for i, name in [
    (1, "login"), (2, "learning"), (3, "practice"), (4, "wrong_created"),
    (5, "wrong_recovery"), (6, "report"), (7, "resume"), (8, "sync")
]]
TASK_SECONDS = [f"t{i}_seconds" for i in range(1, 9)]
COUNT_FIELDS = [
    "operation_error_count", "help_count", "data_loss_count",
    "unrecoverable_block_count", "p0_count", "p1_count",
]
REQUIRED_TEXT_FIELDS = ["segment", "device", "os", "browser", "browser_version"]
PILOT_ACTIVITY_FIELDS = set(TASKS + TASK_SECONDS + COUNT_FIELDS + REQUIRED_TEXT_FIELDS + [
    "pre_score", "post_score", "feedback", "notes",
] + [f"sus_q{i}" for i in range(1, 11)])


def text(row, key):
    return str(row.get(key) or "").strip()


def add_error(errors, row, field, code, message):
    errors.append({
        "row_number": row.get("_row_number"),
        "participant_id": text(row, "participant_id"),
        "field": field,
        "code": code,
        "value": text(row, field),
        "message": message,
    })


def finite_number(row, key, errors, minimum=None, maximum=None, integer=False):
    raw = text(row, key)
    if not raw:
        add_error(errors, row, key, "required", "欄位不可留空")
        return None
    try:
        value = float(raw)
    except ValueError:
        add_error(errors, row, key, "not_numeric", "必須是數字")
        return None
    if not math.isfinite(value):
        add_error(errors, row, key, "not_finite", "必須是有限數字")
        return None
    if integer and not value.is_integer():
        add_error(errors, row, key, "not_integer", "必須是整數")
        return None
    if minimum is not None and value < minimum:
        add_error(errors, row, key, "below_minimum", f"不得小於 {minimum}")
        return None
    if maximum is not None and value > maximum:
        add_error(errors, row, key, "above_maximum", f"不得大於 {maximum}")
        return None
    return int(value) if integer else value


def validate_row(row, duplicate_ids):
    errors = []
    participant_id = text(row, "participant_id")
    if not participant_id:
        add_error(errors, row, "participant_id", "required", "參與者編號不可留空")
    if participant_id in duplicate_ids:
        add_error(errors, row, "participant_id", "duplicate", "參與者編號不得重複")
    if text(row, "pilot_started").lower() != "yes":
        add_error(errors, row, "pilot_started", "invalid_choice", "已開始試點者必須填 yes")
    for field in REQUIRED_TEXT_FIELDS:
        if not text(row, field):
            add_error(errors, row, field, "required", "欄位不可留空")
    if text(row, "segment") not in SEGMENTS:
        add_error(errors, row, "segment", "invalid_choice", "分組只能是 beginner 或 practitioner")
    for field in TASKS:
        if text(row, field).lower() not in {"pass", "fail"}:
            add_error(errors, row, field, "invalid_choice", "任務結果只能是 pass 或 fail")
    for field in TASK_SECONDS:
        finite_number(row, field, errors, minimum=0)
    pre = finite_number(row, "pre_score", errors, minimum=0, maximum=100)
    post = finite_number(row, "post_score", errors, minimum=0, maximum=100)
    sus_answers = [finite_number(row, f"sus_q{i}", errors, minimum=1, maximum=5, integer=True) for i in range(1, 11)]
    counts = {field: finite_number(row, field, errors, minimum=0, integer=True) for field in COUNT_FIELDS}
    sus_score = None
    if all(score is not None for score in sus_answers):
        adjusted = [(score - 1) if index % 2 == 1 else (5 - score) for index, score in enumerate(sus_answers, 1)]
        sus_score = sum(adjusted) * 2.5
    return {
        "row": row,
        "errors": errors,
        "pre": pre,
        "post": post,
        "sus": sus_score,
        "counts": counts,
    }


parser = argparse.ArgumentParser(description="Analyze System-ESG Gate 3 human pilot data")
parser.add_argument("csv_path")
parser.add_argument("--output")
args = parser.parse_args()

with Path(args.csv_path).open(encoding="utf-8-sig", newline="") as handle:
    source_rows = list(csv.DictReader(handle))

# Untouched template rows contain only a reserved participant_id and are ignored.
# Once a row contains pilot_started or any substantive pilot datum it is included,
# even if participant_id/pilot_started was cleared. Invalid started rows therefore
# cannot disappear from the denominator or bypass validation.
for row_number, row in enumerate(source_rows, start=2):
    row["_row_number"] = row_number


def has_pilot_activity(row):
    return bool(text(row, "pilot_started") or any(text(row, field) for field in PILOT_ACTIVITY_FIELDS))


rows = [row for row in source_rows if has_pilot_activity(row)]
id_counts = Counter(text(row, "participant_id") for row in rows if text(row, "participant_id"))
duplicate_ids = {participant_id for participant_id, count in id_counts.items() if count > 1}
assessments = [validate_row(row, duplicate_ids) for row in rows]
validation_errors = [error for item in assessments for error in item["errors"]]
valid = [item for item in assessments if not item["errors"]]

task_total = len(rows) * len(TASKS)
task_pass = sum(text(row, task).lower() == "pass" for row in rows for task in TASKS)
completion = (task_pass / task_total * 100) if task_total else 0
improvements = [item["post"] - item["pre"] for item in valid]
sus_scores = [item["sus"] for item in valid]
data_loss = sum(item["counts"]["data_loss_count"] or 0 for item in assessments)
blocks = sum(item["counts"]["unrecoverable_block_count"] or 0 for item in assessments)
p0 = sum(item["counts"]["p0_count"] or 0 for item in assessments)
p1 = sum(item["counts"]["p1_count"] or 0 for item in assessments)
segments = sorted({text(row, "segment") for row in rows if text(row, "segment")})
valid_segment_counts = Counter(text(item["row"], "segment") for item in valid)
incomplete_ids = [
    text(item["row"], "participant_id") or f"row:{item['row'].get('_row_number')}"
    for item in assessments if item["errors"]
]

result = {
    "participants_entered": len(rows),
    "participants_valid": len(valid),
    "participants_incomplete": len(rows) - len(valid),
    "incomplete_participant_ids": incomplete_ids,
    "segments": segments,
    "valid_segment_counts": {segment: valid_segment_counts.get(segment, 0) for segment in sorted(SEGMENTS)},
    "core_task_pass": task_pass,
    "core_task_total": task_total,
    "core_task_completion_percent": round(completion, 2),
    "average_improvement_percentage_points": round(sum(improvements) / len(improvements), 2) if improvements else None,
    "average_sus": round(sum(sus_scores) / len(sus_scores), 2) if sus_scores else None,
    "data_loss_count": data_loss,
    "unrecoverable_block_count": blocks,
    "p0_count": p0,
    "p1_count": p1,
    "validation_errors": validation_errors,
}
checks = {
    "input_data_valid": not validation_errors,
    "sample_between_10_and_20": 10 <= len(rows) <= 20,
    "beginner_at_least_5": valid_segment_counts.get("beginner", 0) >= 5,
    "practitioner_at_least_5": valid_segment_counts.get("practitioner", 0) >= 5,
    "all_started_participants_have_complete_records": len(valid) == len(rows),
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
