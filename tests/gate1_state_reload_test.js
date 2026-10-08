const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('assets/app-core-v41.js', 'utf8');
const match = source.match(/function readState\(key\)\{[^\n]+\}/);
if (!match) throw new Error('readState was not found');

const storage = new Map();
const sandbox = {
  JSON,
  localStorage:{ getItem:key => storage.get(key) ?? null },
  result:null
};
vm.createContext(sandbox);
vm.runInContext(`${match[0]};`, sandbox);

const seeded = {
  answered:{Q1:{correct:true,at:'2026-10-09T00:00:00Z'}},
  learned:{'esg|重大性评估':true}, wrong:{}, exams:[], attempts:[],
  past37:{answers:{'PE22-01':{selected:1,correct:true,at:'2026-10-09T01:00:00Z'}}}
};
storage.set('reload', JSON.stringify(seeded));
const reloaded = vm.runInContext(`readState('reload')`, sandbox);
if (!reloaded.past37?.answers?.['PE22-01']?.correct) throw new Error('past37 was lost after reload');
if (reloaded.schema_version !== 4.1) throw new Error('state schema was not upgraded to 4.1');

storage.set('legacy', JSON.stringify({answered:{},learned:{},wrong:{},exams:[],attempts:[]}));
const legacy = vm.runInContext(`readState('legacy')`, sandbox);
if (!legacy.past37 || Object.keys(legacy.past37.answers).length) throw new Error('legacy state did not receive a safe past37 default');

console.log('PASS  past37 survives local reload');
console.log('PASS  legacy state upgrades to V4.1 without data loss');
