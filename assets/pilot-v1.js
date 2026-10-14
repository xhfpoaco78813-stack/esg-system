/* System-ESG Gate 3 controlled human-pilot recorder. Local-only; no network submission. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const TASKS=[
  ['t1_login','登入','使用指定 staging 帐号登入并看到学习总览'],
  ['t2_learning','指定学习','打开指定模块、展开知识点并标记完成'],
  ['t3_practice','情境练习','完成至少 3 道核准题，包含一题情境题'],
  ['t4_wrong_created','建立错题','依主持人要求故意答错一题，错题数增加'],
  ['t5_wrong_recovery','错题回补','重答正确后，错题数减少'],
  ['t6_report','学习报告','打开学习报告并说明一个可见指标'],
  ['t7_resume','重新续接','重载或重新登入，确认进度仍存在'],
  ['t8_sync','跨装置同步','在另一装置登入，确认已同意同步的进度一致']
];
const SUS=[
  '我愿意经常使用这个系统。','我觉得这个系统不必要地复杂。','我觉得这个系统容易使用。','我需要技术人员协助才能使用这个系统。','我觉得各项功能整合良好。','我觉得系统有太多不一致之处。','我认为大多数人能很快学会使用。','我觉得系统操作很笨重。','我使用这个系统时感到有信心。','我需要先学很多东西才能开始使用。'
];
const HEADERS=['participant_id','pilot_started','segment','device','os','browser','browser_version',...TASKS.flatMap(([id])=>[id+'_success',id+'_seconds']),'operation_error_count','help_count','pre_score','post_score',...SUS.map((_,i)=>'sus_q'+(i+1)),'data_loss_count','unrecoverable_block_count','p0_count','p1_count','feedback','notes'];
const timers={};
let currentKey='';

function browserInfo(){const ua=navigator.userAgent;let browser='Other',version='';for(const [name,re] of [['Edge',/Edg\/([\d.]+)/],['Chrome',/Chrome\/([\d.]+)/],['Firefox',/Firefox\/([\d.]+)/],['Safari',/Version\/([\d.]+).*Safari/]]){const m=ua.match(re);if(m){browser=name;version=m[1];break;}}let os='Other';if(/Windows NT 10/.test(ua))os='Windows 10/11';else if(/Android/.test(ua))os='Android';else if(/iPhone|iPad/.test(ua))os='iOS/iPadOS';else if(/Mac OS X/.test(ua))os='macOS';else if(/Linux/.test(ua))os='Linux';return {browser,version,os};}
function segmentFor(id){const n=Number(String(id).replace('P',''));return n>=1&&n<=10?'beginner':n>=11&&n<=20?'practitioner':'';}
function storageKey(id){return id?'systemESG:gate3-pilot:'+id:'';}
function taskMarkup([id,title,desc],index){return `<div class="task-row"><div class="task-copy"><b>T${index+1} ${title}</b><span>${desc}</span></div><label>结果<select id="${id}_success" required><option value="">请选择</option><option value="pass">成功</option><option value="fail">失败</option></select></label><label>用时（秒）<input id="${id}_seconds" type="number" min="0" step="1" inputmode="numeric" required></label><button class="timer-button" type="button" data-timer="${id}" aria-label="T${index+1} ${title} 开始或停止计时">开始计时</button></div>`;}
function susMarkup(text,index){return `<div class="sus-row"><fieldset><legend>${index+1}. ${text}</legend>${[1,2,3,4,5].map(n=>`<label class="sus-choice"><input type="radio" name="sus_q${index+1}" value="${n}" required><span>${n}</span></label>`).join('')}</fieldset></div>`;}
function allControls(){return [...document.querySelectorAll('#pilotForm input,#pilotForm select,#pilotForm textarea')];}
function value(id){return ($(id)?.value||'').trim();}
function setValue(id,val){const node=$(id);if(node&&val!==undefined&&val!==null)node.value=String(val);}
function collect(){const row={};for(const h of HEADERS){if(h==='pilot_started'){row[h]=value('participant_id')?'yes':'';continue;}if(h.startsWith('sus_q')){row[h]=document.querySelector(`[name="${h}"]:checked`)?.value||'';continue;}row[h]=value(h);}return row;}
function persist(){const id=value('participant_id');if(!id)return;const draft={row:collect(),consent:$('pilotConsent').checked,saved_at:new Date().toISOString()};localStorage.setItem(storageKey(id),JSON.stringify(draft));currentKey=storageKey(id);$('saveState').textContent='已保存于本机 · '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});updateProgress();}
function load(id){allControls().forEach(node=>{if(node.type==='radio'||node.type==='checkbox')node.checked=false;else if(!['operation_error_count','help_count','data_loss_count','unrecoverable_block_count','p0_count','p1_count'].includes(node.id))node.value='';});for(const key of ['operation_error_count','help_count','data_loss_count','unrecoverable_block_count','p0_count','p1_count'])setValue(key,0);setValue('participant_id',id);setValue('segment',segmentFor(id));const info=browserInfo();setValue('browser',info.browser);setValue('browser_version',info.version);setValue('os',info.os);setValue('device',innerWidth<=600?'mobile':'desktop');const saved=JSON.parse(localStorage.getItem(storageKey(id))||'null');if(saved?.row){for(const [key,val] of Object.entries(saved.row)){if(key.startsWith('sus_q')){const radio=document.querySelector(`[name="${key}"][value="${CSS.escape(String(val))}"]`);if(radio)radio.checked=true;}else setValue(key,val);}setValue('segment',segmentFor(id));$('pilotConsent').checked=Boolean(saved.consent);$('saveState').textContent='已恢复本机草稿';}else $('saveState').textContent='尚未保存';currentKey=storageKey(id);updateProgress();}
function requiredValues(){const row=collect();return [row.participant_id,row.segment,row.device,row.os,row.browser,row.browser_version,...TASKS.flatMap(([id])=>[row[id+'_success'],row[id+'_seconds']]),row.pre_score,row.post_score,...SUS.map((_,i)=>row['sus_q'+(i+1)]),row.operation_error_count,row.help_count,row.data_loss_count,row.unrecoverable_block_count,row.p0_count,row.p1_count];}
function updateProgress(){const values=requiredValues(),complete=values.filter(v=>String(v)!=='').length+($('pilotConsent').checked?1:0),total=values.length+1;$('completionPercent').textContent=Math.round(complete/total*100)+'%';}
function nonnegativeInteger(row,key,errors){const raw=row[key];if(!/^\d+$/.test(raw))errors.push(`${key} 必须是非负整数`);}
function validate(){const row=collect(),errors=[];if(!/^P(?:0[1-9]|1\d|20)$/.test(row.participant_id))errors.push('请选择有效参与者编号 P01–P20');if(!$('pilotConsent').checked)errors.push('必须确认试点记录同意');if(row.segment!==segmentFor(row.participant_id))errors.push('参与者分组与编号不一致');for(const key of ['device','os','browser','browser_version'])if(!row[key])errors.push(`${key} 不可留空`);for(const [id] of TASKS){if(!['pass','fail'].includes(row[id+'_success']))errors.push(`${id} 结果必须为 pass 或 fail`);nonnegativeInteger(row,id+'_seconds',errors);}for(const key of ['pre_score','post_score']){const n=Number(row[key]);if(row[key]===''||!Number.isFinite(n)||n<0||n>100)errors.push(`${key} 必须是 0–100`);}for(let i=1;i<=10;i++)if(!/^[1-5]$/.test(row['sus_q'+i]))errors.push(`sus_q${i} 必须选择 1–5`);for(const key of ['operation_error_count','help_count','data_loss_count','unrecoverable_block_count','p0_count','p1_count'])nonnegativeInteger(row,key,errors);const box=$('validationResult');box.className='validation '+(errors.length?'error':'success');box.innerHTML=errors.length?`<b>尚有 ${errors.length} 项需修正：</b><ul>${errors.map(e=>`<li>${escapeHtml(e)}</li>`).join('')}</ul>`:'<b>资料完整。</b>可以下载个人 CSV 交给主持人。';box.focus?.();return {row,errors};}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function csvCell(v){const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}
function download(){const result=validate();if(result.errors.length)return;persist();const csv='\ufeff'+HEADERS.map(csvCell).join(',')+'\r\n'+HEADERS.map(h=>csvCell(result.row[h])).join(',')+'\r\n',blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`gate3-pilot-${result.row.participant_id}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('saveState').textContent='CSV 已下载 · 请交给主持人';}
function toggleTimer(button){const id=button.dataset.timer;if(timers[id]){const seconds=Math.max(0,Math.round((Date.now()-timers[id])/1000));setValue(id+'_seconds',seconds);delete timers[id];button.textContent='重新计时';button.classList.remove('running');persist();}else{timers[id]=Date.now();button.textContent='停止计时';button.classList.add('running');}}
function reset(){const id=value('participant_id');if(!id)return;if(!confirm(`确定清除 ${id} 在这台装置的试点记录？`))return;localStorage.removeItem(storageKey(id));load(id);$('validationResult').className='validation';$('validationResult').textContent='本机记录已清除。';}

for(let i=1;i<=20;i++){const id='P'+String(i).padStart(2,'0'),option=document.createElement('option');option.value=id;option.textContent=`${id} · ${i<=10?'初学者组':'实务人员组'}`;$('participant_id').append(option);}
$('taskList').innerHTML=TASKS.map(taskMarkup).join('');$('susList').innerHTML=SUS.map(susMarkup).join('');
$('participant_id').addEventListener('change',e=>load(e.target.value));$('pilotForm').addEventListener('input',()=>{persist();updateProgress();});$('pilotForm').addEventListener('change',()=>{persist();updateProgress();});document.querySelectorAll('[data-timer]').forEach(button=>button.addEventListener('click',()=>toggleTimer(button)));$('validatePilot').addEventListener('click',validate);$('exportPilot').addEventListener('click',download);$('resetPilot').addEventListener('click',reset);
const queryId=new URLSearchParams(location.search).get('participant');if(/^P(?:0[1-9]|1\d|20)$/.test(queryId||''))load(queryId);else{const info=browserInfo();setValue('browser',info.browser);setValue('browser_version',info.version);setValue('os',info.os);setValue('device',innerWidth<=600?'mobile':'desktop');updateProgress();}
window.SystemESGPilot={HEADERS,TASKS,validate,collect,segmentFor};
})();
