from __future__ import annotations

import ast
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = (ROOT / "assets/app-core-v41.js").read_text(encoding="utf-8")
GATE2 = (ROOT / "assets/gate2-v415.js").read_text(encoding="utf-8")
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
TRIAL = (ROOT / "trial.html").read_text(encoding="utf-8")
TRIAL_JS = (ROOT / "assets/trial-v1.js").read_text(encoding="utf-8")
STYLES = (ROOT / "assets/styles.css").read_text(encoding="utf-8")

checks: list[tuple[str, bool]] = []


def check(name: str, condition: bool) -> None:
    checks.append((name, bool(condition)))


def js_array(name: str):
    match = re.search(rf"const {name}=\[(.*?)\n\];", CORE, re.S)
    if not match:
        raise AssertionError(f"Cannot locate {name}")
    return ast.literal_eval("[" + re.sub(r"\bnull\b", "None", match.group(1)) + "]")


questions = js_array("V32_Q")
case_match = re.search(r"const V33_CASE=(\[.*?\]);", CORE, re.S)
assert case_match
case_literal = re.sub(r"\bnull\b", "None", case_match.group(1))
case_literal = re.sub(r"([{,])([A-Za-z_]\w*):", r"\1'\2':", case_literal)
questions.append(ast.literal_eval(case_literal))

source_pattern = re.compile(
    r"\{source_id:'(?P<id>[^']+)',source_title:'(?P<title>[^']+)',"
    r"source_authority:'(?P<authority>[^']+)',source_version:'(?P<version>[^']+)',"
    r"source_clause:'(?P<clause>[^']+)',valid_from:'(?P<valid_from>[^']+)',"
    r"jurisdiction:'(?P<jurisdiction>[^']+)',region:'(?P<region>[^']+)',"
    r"url:'(?P<url>[^']+)',review_status:'(?P<status>[^']+)'\}"
)
sources = {match.group("id"): match.groupdict() for match in source_pattern.finditer(CORE)}
types = {row[4] for row in questions}
question_sources = {row[2] for row in questions}
expected_types = {
    "scenario_single", "scenario_multiple", "calculation", "error_detection",
    "decision_order", "form_interpretation", "integrated_case",
}

check("7 question types have approved real records", types == expected_types)
check("every approved source is exercised by a real question", set(sources) == question_sources)
check("every source has authority/version/clause/date", all(
    row["authority"] and row["version"] and row["clause"] and row["valid_from"]
    for row in sources.values()
))
check("all source records are approved", all(row["status"] == "approved" for row in sources.values()))
check("all approved questions have answer basis", all(bool(row[9]) for row in questions))

check("V4.1.5 layer is loaded last", INDEX.rfind("gate2-v415.js") > INDEX.rfind("gate1-v41.js"))
check("Gate 2 base is retained in V4.1.11 release", ("V4.1.11 Technical Acceptance Candidate" in INDEX or "V4.1.11 正式版" in INDEX) and "V4.1.5 Gate 2 Revalidation" in GATE2)
check("home CTA says start practice", ">开始练习</button>" in INDEX and "startApprovedPractice415" in GATE2)
check("home practice uses approved pool", "question.review_status === 'approved'" in GATE2 and "question.verified === true" in GATE2)
check("practice type options map enum values", "GT_TYPES.map(type =>" in GATE2 and "typeLabels415" in GATE2)
check("practice sources use source_id", "sourceOf415" in GATE2 and "question.source_id" in GATE2)
check("filter result count exists", "practiceFilterCount415" in GATE2 and "符合条件" in GATE2)
check("empty filter state can clear filters", "clearPracticeFilters415" in GATE2 and "resetFilters415" in GATE2)
check("approved trust fields are displayed", all(field in GATE2 for field in ["source_authority", "source_version", "source_clause", "review_status"]))
check("fixed pending-source label removed", "来源待审核" not in CORE + GATE2 + INDEX)
check("unsupported product claims removed", not any(term in CORE + GATE2 + INDEX for term in ["能力评估", "能力诊断", "能力证明", "人才认证"]))
check("learning report explains empty state", "完成练习后产生能力追踪资料" in GATE2 and "reportPractice415" in GATE2)
check("personalized learning is module-first", "learn-module-summary415" in GATE2 and "aria-expanded" in GATE2)
check("personalized learning defaults to approved-only", 'id="approvedOnly415" type="checkbox" checked' in GATE2)
check("personalized learning paginates", "learnPageSize415" in GATE2 and "learnNext415" in GATE2)
check("clickable learning/dashboard cards are buttons", '<button class="card kp"' in GATE2 and '<button class="card module"' in GATE2)
check("navigation exposes current location", "aria-current" in GATE2 and 'aria-current="page"' in INDEX)
check("controls receive accessible names", "setAttribute('aria-label'" in GATE2)
check("keyboard focus is visible", ":focus-visible" in STYLES)
check("zero-wrong practice is disabled with alternative", "wrongNormalPractice415" in GATE2 and "button.disabled = count === 0" in GATE2)
check("initial login does not show account-switch warning", "if (!before && after" in GATE2 and "请选择条件并开始练习" in GATE2)
check("390px layout rules exist", "@media(max-width:390px)" in STYLES)
check("trial has next knowledge point", "nextLesson" in TRIAL_JS and "下一知识点" in TRIAL_JS)
check("trial has related practice", "relatedPractice" in TRIAL_JS and "练习相关题目" in TRIAL_JS)
check("fixed guidance is not called AI coach", "AI 教练" not in TRIAL + TRIAL_JS + (ROOT / "assets/past-exams-v37.js").read_text(encoding="utf-8"))

for script in [
    "app-core-v41.js", "simplify-v35.js", "mobile-v38.js", "venture-v39.js",
    "past-exams-v37.js", "gate1-v41.js", "gate2-v415.js", "trial-v1.js",
]:
    result = subprocess.run(
        ["node", "--check", str(ROOT / "assets" / script)],
        capture_output=True, text=True, encoding="utf-8",
    )
    check(f"JavaScript syntax: {script}", result.returncode == 0)

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(f"{'PASS' if ok else 'FAIL'}  {name}")
print(f"\n{len(checks) - len(failed)}/{len(checks)} checks passed")
if failed:
    raise SystemExit("Failed: " + "; ".join(failed))
