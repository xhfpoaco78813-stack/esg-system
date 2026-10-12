import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const credentials = JSON.parse(await readFile(path.join(root, '.tools', 'staging-validator.json'), 'utf8'));
const edge = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const webPort = 8796;
const artifactDir = path.join(root, 'test-results');
await mkdir(artifactDir, { recursive:true });
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    response.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream','cache-control':'no-store'}).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(webPort, '127.0.0.1', resolve); });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function openDevice(name, port, width, height, mobile, binary) {
  const profile = path.join(root, `.browser-gate3-device-${name}-${Date.now()}`);
  const processHandle = spawn(binary, ['--headless=new','--disable-gpu','--disable-quic','--no-first-run','--disable-breakpad','--remote-allow-origins=*',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'], {stdio:'ignore'});
  let target;
  for (let i=0;i<80;i++) { try { target=(await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json())).find(x=>x.type==='page'); if(target)break; } catch {} await delay(100); }
  if (!target) throw new Error(`${name} did not start`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let sequence=0;
  const pending=new Map(), httpFailures=[], networkFailures=[], consoleProblems=[], responses=[];
  ws.onmessage = event => {
    const message=JSON.parse(event.data);
    if(message.method==='Network.responseReceived') { const response=message.params.response;responses.push({url:response.url,status:response.status});if(response.status>=400)httpFailures.push({url:response.url,status:response.status}); }
    if(message.method==='Network.loadingFailed') networkFailures.push({error:message.params.errorText,blocked_reason:message.params.blockedReason||'',canceled:Boolean(message.params.canceled)});
    if(message.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(message.params.type)) consoleProblems.push(message.params.args.map(x=>x.value||x.description).join(' '));
    if(message.method==='Runtime.exceptionThrown') consoleProblems.push(message.params.exceptionDetails.text);
    if(!message.id)return;
    const waiter=pending.get(message.id);if(!waiter)return;pending.delete(message.id);message.error?waiter.reject(new Error(message.error.message)):waiter.resolve(message.result);
  };
  const send=(method,params={})=>{const id=++sequence;ws.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));};
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const waitFor=async(expression,label,attempts=140)=>{for(let i=0;i<attempts;i++){try{if(await evaluate(expression))return;}catch{}await delay(150);}throw new Error(`${name} timeout: ${label}`);};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
  const version=await send('Browser.getVersion');
  return {name,width,height,mobile,profile,processHandle,ws,send,evaluate,waitFor,httpFailures,networkFailures,consoleProblems,responses,version};
}
async function login(device) {
  await device.send('Page.navigate',{url:`http://127.0.0.1:${webPort}/index.html?device=${device.name}&t=${Date.now()}`});
  await device.waitFor(`document.readyState==='complete'&&Boolean(document.getElementById('loginEmail35'))&&Boolean(window.esgSync40)`,'application ready');
  await device.evaluate(`(()=>{const email=document.getElementById('loginEmail35'),password=document.getElementById('loginPassword35');email.value=${JSON.stringify(credentials.email)};password.value=${JSON.stringify(credentials.password)};document.getElementById('loginForm35').requestSubmit();return true;})()`);
  await device.waitFor(`typeof user31!=='undefined'&&Boolean(user31?.id)&&!document.body.classList.contains('auth-required')`,'authenticated');
}
async function enableConsent(device) {
  await device.evaluate(`window.esgSync40.setConsent(true)`);
  await device.waitFor(`Boolean(window.esgSync40?.hasConsent())`,'cloud consent');
  await device.evaluate(`window.esgSync40.syncNow()`);
}
async function closeDevice(device) {
  device.ws.close();
  const exited=new Promise(resolve=>device.processHandle.once('exit',resolve));
  device.processHandle.kill();
  await Promise.race([exited,delay(2000)]);
  await rm(device.profile,{recursive:true,force:true}).catch(()=>{});
}

const evidence={started_at:new Date().toISOString(),frontend_url:`http://127.0.0.1:${webPort}/index.html`,staging_backend:'https://cytyjqucdrvjppmimmjs.supabase.co',checks:{},devices:[],events:[]};
const check=(name,value)=>{evidence.checks[name]=Boolean(value);if(!value)throw new Error(`check failed: ${name}`);};
let a,b,exitCode=0;
try {
  a=await openDevice('A-desktop-Chrome',9363,1280,900,false,chrome);await delay(500);
  b=await openDevice('B-mobile-Edge',9364,390,844,true,edge);
  await login(a);await login(b);await enableConsent(a);await enableConsent(b);
  evidence.devices=[{name:a.name,viewport:'1280x900',browser:a.version.product,userAgent:a.version.userAgent},{name:b.name,viewport:'390x844',browser:b.version.product,userAgent:b.version.userAgent}];
  const firstId=await a.evaluate(`(()=>{startApprovedPractice415();const q=pool[0];choosePractice(q.correct_answer??q.answer);return q.id;})()`);
  await a.evaluate(`window.esgSync40.syncNow()`);await b.evaluate(`window.esgSync40.syncNow()`);
  check('a_answer_visible_on_b',await b.evaluate(`Boolean(state.answered[${JSON.stringify(firstId)}])`));
  evidence.events.push({event:'A answered; B pulled',question_id:firstId,at:new Date().toISOString()});
  const deleteControl=await a.evaluate(`(()=>{state.answered['G3-UI-RACE']={correct:false,at:Date.now(),module:'esg',kp:'race'};state.wrong['G3-UI-RACE']=true;save();window.esgSync40.syncNow().catch(()=>{});window.confirm=()=>true;go('privacy32');const button=document.getElementById('privacyCloudDelete32');const detail={disabled:button.disabled,handler:typeof button.onclick,gate1:button.dataset.gate1Delete||''};if(typeof button.onclick==='function')button.onclick(new MouseEvent('click',{bubbles:true,cancelable:true}));return detail;})()`);
  evidence.events.push({event:'A invoked the visible cloud-delete control during sync',control:deleteControl,at:new Date().toISOString()});
  check('cloud_delete_control_ready',!deleteControl.disabled&&deleteControl.handler==='function');
  await a.waitFor(`document.getElementById('privacyStatus32').textContent.includes('已删除')||document.getElementById('privacyStatus32').textContent.includes('删除失败')`,'cloud delete completed');
  check('cloud_delete_rpc_succeeded',await a.evaluate(`document.getElementById('privacyStatus32').textContent.includes('已删除')`));
  await b.evaluate(`window.esgSync40.syncNow()`);
  check('b_old_progress_cleared_after_delete',await b.evaluate(`Object.keys(state.answered||{}).length===0&&Object.keys(state.wrong||{}).length===0`));
  evidence.events.push({event:'A delete during sync; B applied reset',at:new Date().toISOString()});
  await enableConsent(a);
  await a.evaluate(`(()=>{state.answered['G3-UI-NEW']={correct:true,at:Date.now(),module:'esg',kp:'new-generation'};delete state.wrong['G3-UI-NEW'];save();return window.esgSync40.syncNow();})()`);
  await b.evaluate(`window.esgSync40.syncNow()`);
  check('b_loads_new_generation',await b.evaluate(`Boolean(state.answered['G3-UI-NEW']?.correct)&&!state.answered['G3-UI-RACE']`));
  await b.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await b.evaluate(`(()=>{state.answered['G3-OFFLINE']={correct:true,at:Date.now(),module:'scope',kp:'offline'};save();return true;})()`);
  check('offline_change_kept_locally',await b.evaluate(`Boolean(state.answered['G3-OFFLINE'])&&document.getElementById('syncStatus40').textContent.includes('离线')`));
  await b.send('Network.emulateNetworkConditions',{offline:false,latency:20,downloadThroughput:5000000,uploadThroughput:2000000});
  await b.evaluate(`(()=>{window.dispatchEvent(new Event('online'));return window.esgSync40.syncNow();})()`);await a.evaluate(`window.esgSync40.syncNow()`);
  check('offline_change_syncs_after_reconnect',await a.evaluate(`Boolean(state.answered['G3-OFFLINE']?.correct)`));
  evidence.events.push({event:'B offline answer; reconnect; A pulled',at:new Date().toISOString()});
  await b.send('Page.reload',{ignoreCache:true});await b.waitFor(`typeof user31!=='undefined'&&Boolean(user31?.id)&&Boolean(state.answered['G3-OFFLINE'])`,'reload resume');
  check('reload_preserves_synced_progress',await b.evaluate(`Boolean(state.answered['G3-UI-NEW'])&&Boolean(state.answered['G3-OFFLINE'])`));
  await b.evaluate(`sb31.auth.signOut()`);await b.waitFor(`document.body.classList.contains('auth-required')`,'signed out');
  await b.evaluate(`(()=>{localStorage.removeItem(LS);location.reload();return true;})()`);await b.waitFor(`document.readyState==='complete'&&Boolean(document.getElementById('loginEmail35'))&&Boolean(window.esgSync40)`,'clean login form');
  await b.evaluate(`(()=>{document.getElementById('loginEmail35').value=${JSON.stringify(credentials.email)};document.getElementById('loginPassword35').value=${JSON.stringify(credentials.password)};document.getElementById('loginForm35').requestSubmit();return true;})()`);
  await b.waitFor(`typeof user31!=='undefined'&&Boolean(user31?.id)&&Boolean(state.answered['G3-OFFLINE'])`,'re-login resume');
  check('relogin_preserves_synced_progress',await b.evaluate(`Boolean(state.answered['G3-UI-NEW'])&&Boolean(state.answered['G3-OFFLINE'])`));
  check('no_duplicate_answer_keys',await b.evaluate(`Object.keys(state.answered).length===new Set(Object.keys(state.answered)).size`));
  check('desktop_no_overflow',await a.evaluate(`document.documentElement.scrollWidth<=innerWidth`));check('mobile_no_overflow',await b.evaluate(`document.documentElement.scrollWidth<=innerWidth`));
  const screenshotA=await a.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}),screenshotB=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await Promise.all([writeFile(path.join(artifactDir,'gate3-device-a-desktop.png'),Buffer.from(screenshotA.data,'base64')),writeFile(path.join(artifactDir,'gate3-device-b-mobile.png'),Buffer.from(screenshotB.data,'base64'))]);
  check('javascript_console_error_warning_zero',a.consoleProblems.length===0&&b.consoleProblems.length===0);
  check('unhandled_http_4xx_5xx_zero',a.httpFailures.length===0&&b.httpFailures.length===0);
  evidence.result='PASS';
} catch(error) { evidence.result='FAIL';evidence.error=String(error.stack||error);exitCode=1; }
finally { if(a)await closeDevice(a);if(b)await closeDevice(b);await new Promise(resolve=>server.close(resolve)); }
evidence.finished_at=new Date().toISOString();
evidence.staging_requests=[...(a?.responses||[]),...(b?.responses||[])].filter(item=>item.url.includes('.supabase.co'));
evidence.http_failures={device_a:a?.httpFailures||[],device_b:b?.httpFailures||[]};evidence.network_failures={device_a:a?.networkFailures||[],device_b:b?.networkFailures||[]};evidence.console_problems={device_a:a?.consoleProblems||[],device_b:b?.consoleProblems||[]};
await writeFile(path.join(artifactDir,'gate3-two-browser.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(`${evidence.result}  ${Object.values(evidence.checks).filter(Boolean).length}/${Object.keys(evidence.checks).length} checks`);for(const [name,passed] of Object.entries(evidence.checks))console.log(`${passed?'PASS':'FAIL'}  ${name}`);if(evidence.error)console.error(evidence.error);process.exitCode=exitCode;
