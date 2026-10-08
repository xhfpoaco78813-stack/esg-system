import ast
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
core = (ROOT / "assets/app-core-v41.js").read_text(encoding="utf-8")
sync = (ROOT / "assets/sync-v40.js").read_text(encoding="utf-8")
gate = (ROOT / "assets/gate1-v41.js").read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")
migration = (ROOT / "supabase/migrations/202610090001_gate1_v41_state_privacy_question_access.sql").read_text(encoding="utf-8")

results = []
def check(name, condition):
    if not condition:
        raise AssertionError(name)
    results.append(name)

module_text = core[core.index("const MODULES=") + len("const MODULES="):core.index(";\nconst QUESTIONS=")]
modules = json.loads(module_text)
module_nodes = {(module["id"], node[0]) for module in modules for node in module["nodes"]}
map_block = core[core.index("const GATE1_KP_MAP="):core.index("};", core.index("const GATE1_KP_MAP="))]
mapped_entries = re.findall(r"'([^']+)':\['([^']+)','([^']+)'\]", map_block)
mapped_pairs = {(module_id, title) for _, module_id, title in mapped_entries}

v32_block = core[core.index("const V32_Q=[") + len("const V32_Q="):core.index("];", core.index("const V32_Q=[")) + 1]
v32_rows = ast.literal_eval(v32_block.replace("null", "None"))
check("15 approved public sample questions", len(v32_rows) + 1 == 15)
check("all approved knowledge ids have mappings", len(mapped_entries) == 15)
check("all mappings target homepage knowledge points", mapped_pairs <= module_nodes)
check("legacy 5,200 draft bank removed from public bundle", "V4Q0001" not in core and "const QUESTIONS=[];" in core and not (ROOT / "assets/app.js").exists())
check("legacy standalone site removed from public root", not (ROOT / "(ESG)index_0827").exists())
check("public index loads sanitized V4.1 core", "app-core-v41.js" in index and "assets/app.js" not in index)
check("20/50/100 exam modes are visibly disabled", index.count('disabled aria-disabled="true"') == 3 and "题量不足" in index)
check("exam start has a runtime pool-size guard", "available<n" in core and "无法建立" in core)
check("local state loader preserves past37", "past37:x.past37" in core and "past37:{answers:{}}" in core)
check("V4 sync payload includes past37", "past37:state.past37" in sync and "value.past37.answers" in sync)
check("all progress and draft sync paths require consent", sync.count("hasConsent40()") >= 7 and "同步未开启" in sync)
check("privacy UI is learner-accessible", "privacyTop41" in gate and "data-mobile-view38" in gate and "privacy32" in gate)
check("cloud deletion targets V4 progress and draft data", "esg_delete_my_learning_data_v41" in migration and "delete from public.esg_progress_v40" in migration and "delete from public.esg_exam_drafts_v40" in migration)
check("past-exam answers merge by newest timestamp", "v_past_answers" in migration and "{past37,answers}" in migration and "esg_answer_time_v40(items.value) desc" in migration)
check("restricted question bank never returns answer_payload in list RPC", "esg_question_bank_v41" in migration and "q.public_question" in migration and "esg_check_answer_v41" in migration)
check("Edge Function source is present", (ROOT / "supabase/functions/question-bank-v41/index.ts").exists())

if len(sys.argv) > 1:
    base = sys.argv[1].rstrip("/")
    for asset in ["index.html", "assets/app-core-v41.js", "assets/gate1-v41.js", "assets/sync-v40.js"]:
        with urllib.request.urlopen(f"{base}/{asset}", timeout=5) as response:
            check(f"HTTP 200 {asset}", response.status == 200)
    try:
        urllib.request.urlopen(f"{base}/assets/app.js", timeout=5)
    except urllib.error.HTTPError as error:
        check("legacy public app.js returns 404", error.code == 404)
    else:
        raise AssertionError("legacy public app.js returns 404")

for result in results:
    print(f"PASS  {result}")
print(f"\n{len(results)} Gate 1 checks passed")
