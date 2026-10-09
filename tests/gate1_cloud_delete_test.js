const fs = require('fs');
const gate = fs.readFileSync('assets/gate1-v41.js', 'utf8');
const sync = fs.readFileSync('assets/sync-v40.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/202610090002_gate1_v412_concurrency.sql', 'utf8');

function check(name, condition) {
  if (!condition) throw new Error(name);
  console.log(`PASS  ${name}`);
}

check('legacy cloud-delete onclick is removed', gate.includes('cloudDelete.onclick = null'));
check('only one V4.1 delete RPC call exists in UI layer', (gate.match(/esg_delete_my_learning_data_v41/g) || []).length === 1);
check('sync is paused before cloud delete RPC', gate.indexOf('pauseAndWait()') < gate.indexOf("rpc('esg_delete_my_learning_data_v41')"));
check('pause revokes consent before waiting', sync.indexOf("localStorage.setItem(consentKey40(), 'false')") < sync.indexOf('while ((syncing40 || draftOps40 > 0)'));
check('pause waits for progress and draft operations', sync.includes('syncing40 || draftOps40 > 0'));
check('cloud deletion clears the active local generation', gate.includes('state = {schema_version:4.1,cloud_reset_version:resetVersion'));
check('other devices receive the reset generation', sync.includes('remoteReset > Number(state.cloud_reset_version || 0)'));
check('stale exam drafts use the reset-aware RPC', sync.includes("rpc('esg_sync_exam_draft_v41'"));
check('stale progress no longer overwrites server state with an empty payload', migration.includes('stale caller receives') && !migration.includes('if v_client_reset < v_reset_version then\n    v_merged := jsonb_build_object'));
check('legacy draft RPC execute privilege is revoked', migration.includes('from public,anon,authenticated'));
check('draft sync and delete serialize on the reset row', (migration.match(/where r\.user_id=v_uid for update/g) || []).length >= 3);
