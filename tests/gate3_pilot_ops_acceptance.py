import csv
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "pilot.html").read_text(encoding="utf-8")
JS = (ROOT / "assets" / "pilot-v1.js").read_text(encoding="utf-8")
CSS = (ROOT / "assets" / "pilot-v1.css").read_text(encoding="utf-8")
MERGER = (ROOT / "tools" / "merge_gate3_pilot_exports.py").read_text(encoding="utf-8")

checks = []


class LabelAudit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.label_depth = 0
        self.unlabeled = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "label":
            self.label_depth += 1
        if tag in {"input", "select", "textarea"} and attrs.get("type") != "hidden":
            if not self.label_depth and not attrs.get("aria-label") and not attrs.get("aria-labelledby"):
                self.unlabeled.append(attrs.get("id") or tag)

    def handle_endtag(self, tag):
        if tag == "label":
            self.label_depth -= 1


def check(name, condition):
    checks.append((name, bool(condition)))
    print(("PASS" if condition else "FAIL") + "  " + name)


check("pilot page is clearly identified as Gate 3 evidence", "V4.1.11 · GATE 3 PILOT" in HTML)
check("pilot page declares local-only collection", "不会自动上传" in HTML and "no network submission" in JS)
check("pilot page does not load Supabase", "supabase" not in HTML.lower() and "fetch(" not in JS)
check("participant ID is constrained to P01-P20", "P(?:0[1-9]|1\\d|20)" in JS)
check("segment is assigned by participant ID", "segmentFor" in JS and "n<=10?'beginner'" in JS)
check("all eight tasks are present", all(f"t{i}_" in JS for i in range(1, 9)))
check("task timer controls have accessible names", "aria-label=\"T${index+1}" in JS)
check("ten SUS questions are present", JS.count("我觉得") >= 5 and "sus_q'+(i+1)" in JS)
check("strict score and count validation exists", "n<0||n>100" in JS and "必须是非负整数" in JS)
check("incomplete CSV can be exported after ID and consent checks", "record_status:result.errors.length?'incomplete':'complete'" in JS and "if(result.errors.length)return" not in JS)
check("incomplete CSV retains validation errors", "validation_errors:result.errors.join(' | ')" in JS and "EXPORT_HEADERS" in JS)
check("draft persistence is participant-scoped", "systemESG:gate3-pilot:" in JS)
audit = LabelAudit()
audit.feed(HTML)
check("static form controls have visible labels", not audit.unlabeled)
check("390px responsive rules exist", "@media(max-width:430px)" in CSS and "@media(max-width:760px)" in CSS)
check("merge tool rejects duplicate identifiers", "duplicate participant_id" in MERGER)
check("merge tool automatically runs Gate 3 analyzer", "analyze_gate3_pilot.py" in MERGER and "Gate 3 decision" in MERGER)

with (ROOT / "data" / "gate3-pilot-invites.csv").open(encoding="utf-8-sig", newline="") as handle:
    invitations = list(csv.DictReader(handle))
check("twenty anonymous pilot links are prepared", len(invitations) == 20 and len({row["participant_id"] for row in invitations}) == 20)
check("pilot links provide ten participants per fixed segment", sum(row["segment"] == "beginner" for row in invitations) == 10 and sum(row["segment"] == "practitioner" for row in invitations) == 10)
check("pilot links target isolated staging", all("/esgtestsystem/pilot.html?participant=" in row["pilot_url"] for row in invitations))
check("each pilot slot has a staging account", all(row["account_assigned"] == f"gate3-{row['participant_id'].lower()}@pilot.invalid" for row in invitations))

account_evidence_text = (ROOT / "test-results" / "gate3-pilot-accounts-validation.json").read_text(encoding="utf-8")
account_evidence = json.loads(account_evidence_text)
check(
    "twenty unique staging accounts passed login and learner-role checks",
    account_evidence.get("participant_count") == 20
    and account_evidence.get("unique_user_count") == 20
    and account_evidence.get("login_pass_count") == 20
    and account_evidence.get("role_pass_count") == 20,
)
check(
    "tracked account evidence contains no credentials",
    account_evidence.get("credentials_in_git_or_zip") is False
    and all(token not in account_evidence_text.lower() for token in ("password", "service_role", "sb_secret_")),
)

for script in [ROOT / "assets" / "pilot-v1.js"]:
    result = subprocess.run(["node", "--check", str(script)], capture_output=True, text=True)
    check(f"JavaScript syntax: {script.name}", result.returncode == 0)

passed = sum(ok for _, ok in checks)
print(f"\n{passed}/{len(checks)} checks passed")
if passed != len(checks):
    sys.exit(1)
