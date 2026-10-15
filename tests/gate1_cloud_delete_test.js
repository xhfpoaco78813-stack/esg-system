const fs = require('fs');
const core = fs.readFileSync('assets/app-core-v41.js', 'utf8');
const sync = fs.readFileSync('assets/sync-v40.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/202610090002_gate1_v412_concurrency.sql', 'utf8');

function check(name, condition) {
  if (!condition) throw new Error(name);
  console.log(`PASS  ${name}`);
}

check('cloud delete has one explicit V4.1 handler', (core.match(/privacyCloudDelete32'\)\.onclick/g) || []).length === 1);
check('only one V4.1 delete RPC call exists in UI layer', (core.match(/esg_delete_my_learning_data_v41/g) || []).length === 1);
check('sync is paused before cloud delete RPC', core.indexOf('pauseAndWait()') < core.indexOf("rpc('esg_delete_my_learning_data_v41')"));
check('pause revokes consent before invalidating active work', sync.indexOf("localStorage.setItem(consentKey40(), 'false')") < sync.indexOf('syncEpoch40++'));
check('pause invalidates active responses instead of waiting on the network', sync.includes('syncEpoch40++') && !sync.includes('while ((syncing40 || draftOps40 > 0)'));
check('progress and draft responses reject a stale pause epoch and account', (sync.match(/operationCurrent40\(operationEpoch, operationUserId\)/g) || []).length >= 4);
check('cloud deletion clears the active local generation', core.includes('state={schema_version:4.1,cloud_reset_version:resetVersion'));
check('other devices receive the reset generation', sync.includes('remoteReset > localReset') && sync.includes('applyRemote40(emptyState40(remoteReset))'));
check('stale exam drafts use the reset-aware RPC', sync.includes("rpc('esg_sync_exam_draft_v41'"));
check('stale progress no longer overwrites server state with an empty payload', migration.includes('stale caller receives') && !migration.includes('if v_client_reset < v_reset_version then\n    v_merged := jsonb_build_object'));
check('legacy draft RPC execute privilege is revoked', migration.includes('from public,anon,authenticated'));
check('draft sync and delete serialize on the reset row', (migration.match(/where r\.user_id=v_uid for update/g) || []).length >= 3);
