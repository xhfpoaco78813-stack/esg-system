const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'sync-v40.js'), 'utf8');
const emptyState = () => ({answered:{},learned:{},wrong:{},exams:[],attempts:[],past37:{answers:{}},cloud_reset_version:0});

function setup() {
  const storage = new Map([
    ['systemESG41:cloudConsent:A', 'true'],
    ['systemESG41:cloudConsent:B', 'true'],
  ]);
  const pending = [];
  const saves = [];
  const context = {
    console,
    crypto:{randomUUID:()=>'account-isolation-test'},
    navigator:{onLine:true},
    user31:{id:'A'},
    state:emptyState(),
    save(){saves.push({user:context.user31?.id,state:JSON.parse(JSON.stringify(context.state))});},
    renderLearnList(){},
    setTimeout:()=>1,
    clearTimeout(){},
    setInterval(){},
    document:{createElement:()=>({}),querySelector:()=>null,addEventListener(){}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    window:{addEventListener(){},esgExamDraft38:{read:()=>null,applyRemote(){}}},
    applySession31:async session=>{context.user31=session?.user||null;context.state=emptyState();},
    sb31:{
      auth:{getSession:()=>new Promise(()=>{})},
      rpc:(name,args)=>new Promise(resolve=>pending.push({name,args,resolve})),
      from(){throw Error('unexpected pull');},
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return {context,pending,saves};
}

async function flush(){for(let index=0;index<8;index++)await Promise.resolve();}
function check(name, condition){if(!condition)throw Error(name);console.log(`PASS  ${name}`);}

(async()=>{
  const account = setup();
  account.context.state.answered['ACCOUNT-A-PRIVATE']={correct:true};
  account.context.window.esgSync40.syncNow();
  await flush();
  account.context.applySession31({user:{id:'B'}});
  await flush();
  const accountARequest = account.pending[0];
  accountARequest.resolve({data:{payload:{...emptyState(),answered:{'ACCOUNT-A-PRIVATE':{correct:true}}},version:8},error:null});
  await flush();
  check('an A response cannot enter B local state', !account.context.state.answered['ACCOUNT-A-PRIVATE']);
  check('an A response cannot be saved under B', !account.saves.some(item=>item.user==='B'&&item.state.answered['ACCOUNT-A-PRIVATE']));

  const deletion = setup();
  deletion.context.state.answered.OLD={correct:true};
  deletion.context.window.esgSync40.syncNow();
  await flush();
  await deletion.context.window.esgSync40.pauseAndWait();
  deletion.context.state={...emptyState(),cloud_reset_version:1};
  deletion.pending[0].resolve({data:{payload:{...emptyState(),answered:{OLD:{correct:true}}},version:8},error:null});
  await flush();
  check('a pre-deletion response remains revoked', !deletion.context.state.answered.OLD);
})().catch(error=>{console.error(error);process.exitCode=1;});
