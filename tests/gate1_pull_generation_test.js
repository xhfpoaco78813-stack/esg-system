const fs = require('fs');

const source = fs.readFileSync('assets/sync-v40.js', 'utf8');
const start = source.indexOf('function choosePull40(');
const end = source.indexOf('  function cloneState40()', start);
if (start < 0 || end < 0) throw new Error('choosePull40 source not found');
const choosePull40 = new Function(`${source.slice(start, end)}; return choosePull40;`)();

function state(reset, answers = {}) {
  return {
    schema_version:4.1,
    cloud_reset_version:reset,
    answered:answers,
    learned:{}, wrong:{}, exams:[], attempts:[], past37:{answers:{}}
  };
}
function row(reset, version, answers = {}) {
  return { version, payload:state(reset, answers), updated_at:'2026-10-10T00:00:00Z' };
}
function check(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`PASS  ${label}`);
}

const newGeneration = row(1, 1, { NEW:{correct:true,at:300} });
check('new-generation progress wins when reset and progress arrive together', choosePull40(newGeneration,1,0,9,true) === 'progress');
check('empty state is used only when the new generation has no valid progress', choosePull40(null,1,0,9,false) === 'reset');
check('old-generation payload cannot bypass a newer reset', choosePull40(row(0,12,{OLD:{}}),1,0,9,true) === 'reset');
check('first progress row remains loadable after an earlier reset-only poll', choosePull40(newGeneration,1,1,0,true) === 'progress');
check('already-applied progress version is not reloaded', choosePull40(newGeneration,1,1,1,true) === 'none');

let deviceB = state(0,{OLD:{correct:false,at:100}});
let cloudVersion = 9;
const decision = choosePull40(newGeneration,1,deviceB.cloud_reset_version,cloudVersion,true);
if (decision === 'progress') {
  deviceB = structuredClone(newGeneration.payload);
  cloudVersion = newGeneration.version;
}
check('A delete plus new progress becomes visible on polling B', Boolean(deviceB.answered.NEW));
check('B does not revive its old-generation answer', !deviceB.answered.OLD);
check('B records the new progress version only after applying it', cloudVersion === 1);
