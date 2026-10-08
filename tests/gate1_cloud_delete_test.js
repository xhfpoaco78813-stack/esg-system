const fs = require('fs');
const gate = fs.readFileSync('assets/gate1-v41.js', 'utf8');
const sync = fs.readFileSync('assets/sync-v40.js', 'utf8');

function check(name, condition) {
  if (!condition) throw new Error(name);
  console.log(`PASS  ${name}`);
}

check('legacy cloud-delete onclick is removed', gate.includes('cloudDelete.onclick = null'));
check('only one V4.1 delete RPC call exists in UI layer', (gate.match(/esg_delete_my_learning_data_v41/g) || []).length === 1);
check('sync is paused before cloud delete RPC', gate.indexOf('pauseAndWait()') < gate.indexOf("rpc('esg_delete_my_learning_data_v41')"));
check('pause revokes consent before waiting', sync.indexOf("localStorage.setItem(consentKey40(), 'false')") < sync.indexOf('while ((syncing40 || draftOps40 > 0)'));
check('pause waits for progress and draft operations', sync.includes('syncing40 || draftOps40 > 0'));
check('sync remains disabled after deletion', gate.includes('云端同步已关闭，本机资料仍保留'));
