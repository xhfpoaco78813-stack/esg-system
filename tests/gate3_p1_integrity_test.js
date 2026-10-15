const fs = require('fs');

const pilot = fs.readFileSync('assets/pilot-v1.js', 'utf8');
const sync = fs.readFileSync('assets/sync-v40.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/202610090002_gate1_v412_concurrency.sql', 'utf8');

function check(name, condition) {
  if (!condition) throw new Error(name);
  console.log(`PASS  ${name}`);
}

check('incomplete pilot records have an explicit export status', pilot.includes("record_status:result.errors.length?'incomplete':'complete'"));
check('incomplete pilot exports preserve validation errors', pilot.includes("validation_errors:result.errors.join(' | ')"));
check('partial export is allowed after participant ID and consent checks', pilot.includes('allowed=/^P(?:0[1-9]|1\\d|20)$/.test(result.row.participant_id)') && !pilot.includes('if(result.errors.length)return'));
check('pilot export exposes a testable preparation path', pilot.includes('prepareExport') && pilot.includes('EXPORT_HEADERS'));
check('cloud pause invalidates the client sync epoch', sync.includes('syncEpoch40++'));
check('cloud pause has no network wait loop', !sync.includes('Date.now() + 10000') && !sync.includes('同步仍在进行，请稍后重试删除'));
check('stale progress and draft responses are discarded', (sync.match(/operationCurrent40\(operationEpoch, operationUserId\)/g) || []).length >= 4);
check('new sync generation can run while an old response is pending', sync.includes('activeProgressEpoch40 === syncEpoch40'));
check('server reset-row locking remains the deletion race authority', (migration.match(/where r\.user_id=v_uid for update/g) || []).length >= 3);
check('account changes invalidate pending sync work before applying the new session', sync.includes('previousUserId !== nextUserId') && sync.indexOf('previousUserId !== nextUserId') < sync.lastIndexOf('await applySessionBase40(session)'));
check('async responses are bound to the user that started the operation', (sync.match(/operationUserId = currentUserId40\(\)/g) || []).length >= 4 && sync.includes('currentUserId40() === userId'));
