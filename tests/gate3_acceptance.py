from pathlib import Path
import csv
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')
TRIAL = (ROOT / 'trial.html').read_text(encoding='utf-8')
GATE3 = (ROOT / 'assets/gate3-v419.js').read_text(encoding='utf-8')
GATE1 = (ROOT / 'assets/gate1-v41.js').read_text(encoding='utf-8')
CORE = (ROOT / 'assets/app-core-v41.js').read_text(encoding='utf-8')
VENTURE = (ROOT / 'assets/venture-v39.js').read_text(encoding='utf-8')
ADMIN = (ROOT / 'assets/account-admin-v36.js').read_text(encoding='utf-8')
FEEDBACK = (ROOT / 'assets/feedback.js').read_text(encoding='utf-8')
RUNTIME = (ROOT / 'assets/runtime-config.js').read_text(encoding='utf-8')

checks = []
def check(name, condition):
    checks.append((name, bool(condition)))
    print(('PASS' if condition else 'FAIL') + '  ' + name)

check('version marked V4.1.9 Gate 3 candidate', 'V4.1.9 Gate 3 Revalidation Candidate' in INDEX and 'V4.1.9' in GATE3)
check('Gate 3 layer loaded last', INDEX.rfind('gate3-v419.js') > INDEX.rfind('gate2-v415.js'))
check('formal wrong-answer name is navigation label', '>错题回补<' in INDEX)
check('venture title no longer says wrong-answer diagnosis', "titles.wrong = ['错题回补'" in VENTURE and '错题诊断' not in VENTURE)
check('Gate 3 dynamic language guard exists', "titles.wrong = ['错题回补'" in GATE3 and "replaceAll('错题诊断', '错题回补')" in GATE3)
check('desktop favicon declared', 'rel="icon" href="assets/favicon.svg"' in INDEX)
check('trial favicon declared', 'rel="icon" href="assets/favicon.svg"' in TRIAL)
check('favicon asset exists', (ROOT / 'assets/favicon.svg').is_file())
check('staging runtime is isolated from production', 'cytyjqucdrvjppmimmjs.supabase.co' in RUNTIME and 'tfkfeatlyxngycazqhyg' not in RUNTIME)
check('runtime uses publishable key only', 'sb_publishable_' in RUNTIME and 'service_role' not in RUNTIME and 'sb_secret_' not in RUNTIME)
check('fresh-project roles prerequisite is first migration', (ROOT / 'supabase/migrations/202609140001_v33_roles_prerequisite.sql').is_file())
check('migration prerequisite creates editor function', 'create or replace function public.esg_is_editor()' in (ROOT / 'supabase/migrations/202609140001_v33_roles_prerequisite.sql').read_text(encoding='utf-8'))
check('two required Edge Functions are present', all((ROOT / f'supabase/functions/{name}/index.ts').is_file() for name in ['account-admin','question-bank-v41']))

for control_id, label in [
    ('accountEmail36','使用者邮箱'),('accountName36','显示名称'),('accountPassword36','临时密码'),
    ('accountRole36','账号角色'),('accountSearch36','搜索账号'),('mfaCode36','验证器动态码')
]:
    check(f'admin control {control_id} has associated label', bool(re.search(fr'<label[^>]+for="{control_id}"[^>]*>{re.escape(label)}</label>', ADMIN)))
check('dynamic role controls have aria-label', 'data-role-id=' in ADMIN and 'aria-label=' in ADMIN)
check('feedback status filter has associated label', 'for="feedbackFilter34">意见状态</label>' in FEEDBACK)
check('dynamic feedback controls have names', "status.setAttribute('aria-label'" in FEEDBACK and "note.setAttribute('aria-label'" in FEEDBACK)
check('all conditional controls receive fallback programmatic names', "querySelectorAll('input:not([type=\"hidden\"]), select, textarea')" in GATE3 and "setAttribute('aria-label'" in GATE3)
check('privacy entry does not call removed cloud-delete configurator', 'configureCloudDelete41' not in GATE1 and 'refreshConsent41();' in GATE1)
check('privacy status has a safe initial message', 'id="privacyStatus32" aria-live="polite">请先登入' in CORE)

pilot_files = [
    'docs/GATE3-PILOT-PROTOCOL.md','docs/GATE3-PILOT-ASSESSMENT.md',
    'data/gate3-pilot-raw.csv','tools/analyze_gate3_pilot.py'
]
check('all pilot toolkit files exist', all((ROOT / item).is_file() for item in pilot_files))
protocol = (ROOT / pilot_files[0]).read_text(encoding='utf-8')
check('pilot covers eight required tasks', all(f'T{i}' in protocol for i in range(1,9)))
check('pilot includes SUS and Gate thresholds', 'SUS' in protocol and '≥95%' in protocol and '≥70' in protocol and '≥15' in protocol)
with (ROOT / 'data/gate3-pilot-raw.csv').open(encoding='utf-8-sig', newline='') as handle:
    reader = csv.DictReader(handle)
    headers = set(reader.fieldnames or [])
    rows = list(reader)
required_headers = {'participant_id','pilot_started','segment','device','browser','browser_version','pre_score','post_score','operation_error_count','help_count','data_loss_count','unrecoverable_block_count','feedback','notes'} | {f'sus_q{i}' for i in range(1,11)}
check('pilot raw data contains required fields', required_headers <= headers)
check('pilot template provides 20 participant rows', len(rows) == 20)
analyzer = (ROOT / 'tools/analyze_gate3_pilot.py').read_text(encoding='utf-8')
check('pilot denominator includes every started participant', 'task_total = len(rows) * len(TASKS)' in analyzer)
check('incomplete pilot records force HOLD', 'all_started_participants_have_complete_records' in analyzer)
check('pilot uses fixed segment codes and five-person floors', 'SEGMENTS = {"beginner", "practitioner"}' in analyzer and 'beginner_at_least_5' in analyzer and 'practitioner_at_least_5' in analyzer)
check('pilot validates ranges and emits validation errors', 'validation_errors' in analyzer and 'minimum=0, maximum=100' in analyzer and 'minimum=0, integer=True' in analyzer)
check('pilot activity cannot disappear behind a blank identifier', 'has_pilot_activity' in analyzer and 'if not participant_id:' in analyzer)
check('pilot validation errors identify the source row', '"row_number": row.get("_row_number")' in analyzer)
check('pilot analyzer adversarial regression exists', (ROOT / 'tests/gate3_pilot_analyzer_test.py').is_file())
check('staging concurrency test is included', (ROOT / 'tests/gate3_staging_api_test.ps1').is_file())

scripts = sorted((ROOT / 'assets').glob('*.js'))
for script in scripts:
    result = subprocess.run(['node','--check',str(script)], capture_output=True, text=True)
    check(f'JavaScript syntax: {script.name}', result.returncode == 0)

passed = sum(ok for _, ok in checks)
print(f'\n{passed}/{len(checks)} checks passed')
if passed != len(checks): sys.exit(1)
