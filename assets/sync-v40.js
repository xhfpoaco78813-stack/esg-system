/* System-ESG V4.0 conflict-safe account sync across computers and phones. */
(() => {
  const $ = id => document.getElementById(id);
  const deviceKey40 = 'systemESG40:deviceId';
  let deviceId40 = localStorage.getItem(deviceKey40);
  if (!deviceId40) { deviceId40 = crypto.randomUUID(); localStorage.setItem(deviceKey40, deviceId40); }
  let syncing40 = false;
  let dirty40 = false;
  let revision40 = 0;
  let timer40 = 0;
  let draftTimer40 = 0;
  let lastDraftJson40 = '';
  let cloudVersion40 = 0;
  let draftOps40 = 0;
  const consentKey40 = () => `systemESG41:cloudConsent:${user31?.id || 'anonymous'}`;
  const hasConsent40 = () => user31 && localStorage.getItem(consentKey40()) === 'true';

  const status40 = document.createElement('span');
  status40.id = 'syncStatus40';
  status40.className = 'sync-status40 local';
  status40.textContent = '仅本机';
  document.querySelector('.top-actions35')?.prepend(status40);
  function setStatus40(text, kind = '') {
    status40.textContent = text;
    status40.className = `sync-status40 ${kind}`.trim();
    status40.title = text === '已同步' ? '此账号的学习资料已同步至其他装置' : text;
  }
  function validState40(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
      && value.answered && typeof value.answered === 'object'
      && value.learned && typeof value.learned === 'object'
      && value.wrong && typeof value.wrong === 'object'
      && Array.isArray(value.exams) && Array.isArray(value.attempts)
      && value.past37 && typeof value.past37 === 'object'
      && value.past37.answers && typeof value.past37.answers === 'object';
  }
  function cloneState40() {
    return JSON.parse(JSON.stringify({
      answered:state.answered || {},
      learned:state.learned || {},
      wrong:state.wrong || {},
      exams:state.exams || [],
      attempts:state.attempts || [],
      past37:state.past37 || { answers:{} },
      schema_version:4.1
    }));
  }

  const saveBase40 = save;
  let applyingRemote40 = false;
  save = function() {
    saveBase40();
    if (applyingRemote40 || !user31) return;
    dirty40 = true;
    revision40++;
    if (!hasConsent40()) { setStatus40('同步未开启', 'local'); return; }
    setStatus40(navigator.onLine ? '等待同步' : '离线保存', navigator.onLine ? 'pending' : 'offline');
    scheduleSync40();
  };
  function applyRemote40(payload) {
    if (!validState40(payload)) return;
    applyingRemote40 = true;
    state = payload;
    saveBase40();
    renderLearnList();
    if (typeof renderMastery31 === 'function') renderMastery31();
    if (typeof renderCompetency39 === 'function') renderCompetency39();
    applyingRemote40 = false;
  }
  function scheduleSync40(delay = 700) {
    clearTimeout(timer40);
    timer40 = setTimeout(() => syncProgress40('change'), delay);
  }
  async function syncProgress40(reason = 'poll') {
    if (syncing40 || !sb31 || !user31 || !navigator.onLine || !hasConsent40()) return;
    if (reason === 'poll' && !dirty40) return pullProgress40();
    syncing40 = true;
    const startedRevision = revision40;
    const snapshot = cloneState40();
    setStatus40('同步中…', 'pending');
    try {
      const { data, error } = await sb31.rpc('esg_merge_learning_state_v40', {
        p_payload:snapshot,
        p_device_id:deviceId40
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !validState40(row.payload)) throw Error('云端返回的进度格式不正确');
      cloudVersion40 = Number(row.version || cloudVersion40);
      if (revision40 === startedRevision) {
        applyRemote40(row.payload);
        dirty40 = false;
      } else {
        dirty40 = true;
        scheduleSync40(250);
      }
      localStorage.setItem('systemESG40:lastSync', row.updated_at || new Date().toISOString());
      setStatus40(dirty40 ? '等待同步' : '已同步', dirty40 ? 'pending' : 'ok');
    } catch (error) {
      console.warn('Cross-device progress sync failed', error);
      dirty40 = true;
      setStatus40('同步待重试', 'error');
    } finally { syncing40 = false; }
  }
  async function pullProgress40() {
    if (syncing40 || !sb31 || !user31 || !navigator.onLine || !hasConsent40()) return;
    syncing40 = true;
    try {
      const { data, error } = await sb31.from('esg_progress_v40').select('payload,version,updated_at').eq('user_id', user31.id).maybeSingle();
      if (error) throw error;
      if (data && Number(data.version) > cloudVersion40 && validState40(data.payload)) {
        cloudVersion40 = Number(data.version);
        applyRemote40(data.payload);
        localStorage.setItem('systemESG40:lastSync', data.updated_at || new Date().toISOString());
      }
      setStatus40('已同步', 'ok');
    } catch (error) {
      console.warn('Cross-device progress pull failed', error);
      setStatus40('同步待重试', 'error');
    } finally { syncing40 = false; }
  }

  async function syncDraft40(localDraft = window.esgExamDraft38?.read?.()) {
    if (!sb31 || !user31 || !navigator.onLine || !window.esgExamDraft38 || !hasConsent40()) return;
    draftOps40++;
    try {
      const json = JSON.stringify(localDraft || null);
      const { data, error } = await sb31.rpc('esg_sync_exam_draft_v40', {
        p_payload:localDraft,
        p_device_id:deviceId40,
        p_delete:false
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.payload?.deleted) {
        lastDraftJson40 = JSON.stringify(row.payload);
        window.esgExamDraft38.applyRemote(null);
      } else if (row?.payload) {
        const remoteJson = JSON.stringify(row.payload);
        lastDraftJson40 = remoteJson;
        if (remoteJson !== json) window.esgExamDraft38.applyRemote(row.payload);
      }
    } catch (error) { console.warn('Cross-device exam draft sync failed', error); }
    finally { draftOps40--; }
  }
  async function deleteDraft40() {
    if (!sb31 || !user31 || !navigator.onLine || !hasConsent40()) return;
    draftOps40++;
    try {
      const { error } = await sb31.rpc('esg_sync_exam_draft_v40', {
        p_payload:null,
        p_device_id:deviceId40,
        p_delete:true
      });
      if (error) throw error;
      lastDraftJson40 = JSON.stringify({ deleted:true });
    } catch (error) { console.warn('Cloud exam draft deletion failed', error); }
    finally { draftOps40--; }
  }
  async function pauseAndWait40() {
    if (!user31) throw Error('请先登录');
    localStorage.setItem(consentKey40(), 'false');
    clearTimeout(timer40);
    clearTimeout(draftTimer40);
    setStatus40('同步已暂停', 'local');
    const deadline = Date.now() + 10000;
    while ((syncing40 || draftOps40 > 0) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    if (syncing40 || draftOps40 > 0) throw Error('同步仍在进行，请稍后重试删除');
  }
  document.addEventListener('esg:exam-draft-changed', event => {
    clearTimeout(draftTimer40);
    draftTimer40 = setTimeout(() => syncDraft40(event.detail), 600);
  });
  document.addEventListener('esg:exam-draft-cleared', () => {
    clearTimeout(draftTimer40);
    draftTimer40 = setTimeout(deleteDraft40, 100);
  });

  const applySessionBase40 = applySession31;
  applySession31 = async function(session) {
    await applySessionBase40(session);
    if (!user31) { setStatus40('仅本机', 'local'); return; }
    dirty40 = true;
    if (!hasConsent40()) { setStatus40('同步未开启', 'local'); return; }
    setStatus40('读取云端…', 'pending');
    await syncProgress40('login');
    await syncDraft40();
  };
  window.addEventListener('online', () => { if (!hasConsent40()) return setStatus40('同步未开启', 'local'); setStatus40('重新连线…', 'pending'); syncProgress40('online'); syncDraft40(); });
  window.addEventListener('offline', () => setStatus40('离线保存', 'offline'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { syncProgress40('visible'); syncDraft40(); }
    else if (dirty40) syncProgress40('hidden');
  });
  setInterval(() => {
    if (user31 && navigator.onLine && hasConsent40()) { syncProgress40('poll'); syncDraft40(); }
  }, 10000);

  // Resolve a session that may have completed before this final layer loaded.
  (async () => {
    if (!sb31) return;
    try {
      const { data, error } = await sb31.auth.getSession();
      if (error) throw error;
      if (data.session) await applySession31(data.session);
    } catch (error) { console.warn('Initial cross-device sync failed', error); }
  })();

  window.esgSync40 = {
    hasConsent:hasConsent40,
    consentKey:consentKey40,
    async setConsent(enabled) {
      if (!user31) throw Error('请先登录');
      if (!enabled) { await pauseAndWait40(); setStatus40('同步未开启', 'local'); return; }
      localStorage.setItem(consentKey40(), 'true');
      dirty40 = true;
      setStatus40('读取云端…', 'pending');
      await syncProgress40('consent');
      await syncDraft40();
    },
    pauseAndWait:pauseAndWait40,
    syncNow:async()=>{ await syncProgress40('manual'); await syncDraft40(); },
    setStatus:setStatus40
  };
})();
