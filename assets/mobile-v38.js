/* System-ESG V3.8 mobile usability and resumable exam layer. */
(() => {
  const $ = id => document.getElementById(id);
  const mobileNav = document.createElement('nav');
  mobileNav.id = 'mobileNav38';
  mobileNav.className = 'mobile-nav38';
  mobileNav.setAttribute('aria-label', '手机主要功能');
  mobileNav.innerHTML = `
    <button type="button" data-mobile-view38="dash"><span>🏠</span><b>总览</b></button>
    <button type="button" data-mobile-view38="learn"><span>📚</span><b>学习</b></button>
    <button type="button" data-mobile-view38="practice"><span>📝</span><b>刷题</b></button>
    <button type="button" data-mobile-view38="past37"><span>🗂️</span><b>历届题</b></button>
    <button type="button" id="mobileMoreButton38" aria-expanded="false"><span>•••</span><b>更多</b></button>`;
  document.body.append(mobileNav);

  const moreSheet = document.createElement('div');
  moreSheet.id = 'mobileMore38';
  moreSheet.className = 'mobile-more38';
  moreSheet.hidden = true;
  moreSheet.innerHTML = `<button class="mobile-more-backdrop38" type="button" aria-label="关闭更多功能"></button><section role="dialog" aria-modal="true" aria-labelledby="mobileMoreTitle38"><div><b id="mobileMoreTitle38">更多功能</b><button type="button" id="mobileMoreClose38" aria-label="关闭">×</button></div><button type="button" data-mobile-view38="exam">⏱️ 模拟考试</button><button type="button" data-mobile-view38="wrong">🔁 错题回补</button><button type="button" data-mobile-view38="ability">🎯 能力评估</button>${$('feedback34') ? '<button type="button" data-mobile-view38="feedback34">💬 意见反馈</button>' : ''}<small>账号管理建议使用电脑操作。</small></section>`;
  document.body.append(moreSheet);

  function closeMore38() {
    moreSheet.hidden = true;
    $('mobileMoreButton38').setAttribute('aria-expanded', 'false');
  }
  function syncMobileNav38() {
    const current = document.querySelector('.view.active')?.id;
    mobileNav.querySelectorAll('[data-mobile-view38]').forEach(button => button.classList.toggle('active', button.dataset.mobileView38 === current));
    $('mobileMoreButton38').classList.toggle('active', ['exam','wrong','ability','feedback34','privacy32','account'].includes(current));
  }
  document.querySelectorAll('[data-mobile-view38]').forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.mobileView38;
    if (view && $(view)) go(view);
    closeMore38();
    syncMobileNav38();
  }));
  $('mobileMoreButton38').addEventListener('click', () => {
    moreSheet.hidden = false;
    $('mobileMoreButton38').setAttribute('aria-expanded', 'true');
  });
  $('mobileMoreClose38').addEventListener('click', closeMore38);
  moreSheet.querySelector('.mobile-more-backdrop38').addEventListener('click', closeMore38);

  document.querySelectorAll('#loginGate35 input[type="password"]').forEach(input => {
    const wrap = document.createElement('div');
    wrap.className = 'password-wrap38';
    input.parentNode.insertBefore(wrap, input);
    wrap.append(input);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle38';
    toggle.textContent = '显示';
    toggle.setAttribute('aria-label', '显示密码');
    toggle.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.textContent = show ? '隐藏' : '显示';
      toggle.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
    });
    wrap.append(toggle);
  });

  const draftPrefix38 = 'systemESG38:exam:';
  const draftKey38 = () => `${draftPrefix38}${user31?.id || 'anonymous'}`;
  function clearExamDraft38() {
    try { localStorage.removeItem(draftKey38()); } catch {}
    $('examResume38')?.remove();
    document.dispatchEvent(new CustomEvent('esg:exam-draft-cleared'));
  }
  function readExamDraft38() {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey38()) || 'null');
      if (!draft || draft.version !== 1 || !Array.isArray(draft.ids) || !draft.ids.length) return null;
      if (!Number.isFinite(draft.end) || draft.end <= Date.now()) { clearExamDraft38(); return null; }
      return draft;
    } catch { clearExamDraft38(); return null; }
  }
  function persistExamDraft38() {
    if (!user31 || !exam?.qs?.length) return;
    if (exam.completed || (!$('examResult')?.classList.contains('hidden') && $('examRun')?.classList.contains('hidden'))) return clearExamDraft38();
    try {
      if (typeof captureExam31 === 'function') captureExam31();
      const draft = { version:1, ids:exam.qs.map(question => question.id), i:exam.i || 0, ans:exam.ans || {}, end:exam.end, savedAt:Date.now() };
      localStorage.setItem(draftKey38(), JSON.stringify(draft));
      document.dispatchEvent(new CustomEvent('esg:exam-draft-changed', { detail:draft }));
    } catch (error) { console.warn('Exam draft save failed', error); }
  }
  function renderExamResume38() {
    $('examResume38')?.remove();
    const draft = readExamDraft38();
    if (!draft || !user31) return;
    const card = document.createElement('div');
    card.id = 'examResume38';
    card.className = 'card exam-resume38';
    const minutes = Math.max(1, Math.ceil((draft.end - Date.now()) / 60000));
    card.innerHTML = `<div><span>发现未完成的模拟考试</span><b>已完成至第 ${Math.min(draft.i + 1, draft.ids.length)} / ${draft.ids.length} 题，剩余约 ${minutes} 分钟</b></div><div><button class="btn soft" id="discardExam38" type="button">放弃记录</button><button class="btn primary" id="resumeExam38" type="button">继续考试</button></div>`;
    $('examSetup')?.prepend(card);
    $('discardExam38').addEventListener('click', clearExamDraft38);
    $('resumeExam38').addEventListener('click', () => {
      const questions = draft.ids.map(id => QUESTIONS.find(question => question.id === id)).filter(Boolean);
      if (questions.length !== draft.ids.length) { clearExamDraft38(); return toast('题库已更新，请重新开始考试'); }
      if (exam.timer) clearInterval(exam.timer);
      go('exam');
      exam = { qs:questions, i:Math.min(draft.i, questions.length-1), ans:draft.ans || {}, end:draft.end, timer:null, completed:false };
      $('examSetup').classList.add('hidden');
      $('examResult').classList.add('hidden');
      $('examRun').classList.remove('hidden');
      renderExamQ();
      exam.timer = setInterval(tick, 1000);
      tick();
      toast('已恢复上次考试进度');
    });
  }

  document.addEventListener('change', event => { if (event.target.closest('#examRun')) setTimeout(persistExamDraft38, 0); });
  document.addEventListener('click', event => {
    if (event.target.closest('#exam, [data-view="exam"], [data-mobile-view38="exam"]')) setTimeout(() => { persistExamDraft38(); renderExamResume38(); syncMobileNav38(); }, 0);
    else setTimeout(syncMobileNav38, 0);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistExamDraft38(); });
  window.addEventListener('pagehide', persistExamDraft38);
  setInterval(() => { persistExamDraft38(); syncMobileNav38(); }, 2000);

  const priorApplySession38 = applySession31;
  applySession31 = async function(session) {
    await priorApplySession38(session);
    renderExamResume38();
    syncMobileNav38();
  };
  window.esgExamDraft38 = {
    key:draftKey38,
    read:readExamDraft38,
    render:renderExamResume38,
    clear:clearExamDraft38,
    applyRemote(draft) {
      if (!draft || draft.deleted) {
        try { localStorage.removeItem(draftKey38()); } catch {}
        $('examResume38')?.remove();
        return;
      }
      try { localStorage.setItem(draftKey38(), JSON.stringify(draft)); } catch { return; }
      renderExamResume38();
    }
  };
  renderExamResume38();
  syncMobileNav38();
})();
