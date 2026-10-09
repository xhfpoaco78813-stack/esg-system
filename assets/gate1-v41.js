/* System-ESG V4.1 Gate 1 remediation UI and consent controls. */
(() => {
  const init41 = () => {
  const $ = id => document.getElementById(id);
  const escape41 = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  document.querySelector('.brand small').textContent = 'V4.1.3 Gate 1 复验版';
  const heroVersion = document.querySelector('#dash .hero .k');
  if (heroVersion) heroVersion.textContent = 'V4.1.3 SQL 并发保护版';

  // Restore a learner-facing privacy entry after the simplified shell removed it.
  if (!$('nav').querySelector('[data-view="privacy32"]')) {
    const button = document.createElement('button');
    button.dataset.view = 'privacy32';
    button.innerHTML = '🛡️ <span class="lab">隐私与同步</span>';
    button.addEventListener('click', () => go('privacy32'));
    $('nav').append(button);
  }
  if (!$('privacyTop41')) {
    const button = document.createElement('button');
    button.id = 'privacyTop41';
    button.className = 'btn soft';
    button.type = 'button';
    button.textContent = '隐私与同步';
    button.addEventListener('click', () => go('privacy32'));
    document.querySelector('.top-actions35')?.insertBefore(button, $('logout35'));
  }
  const ensureMobilePrivacy41 = () => {
    const mobileMore = document.querySelector('#mobileMore38 section');
    if (!mobileMore || mobileMore.querySelector('[data-mobile-view38="privacy32"]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.mobileView38 = 'privacy32';
    button.textContent = '🛡️ 隐私与同步';
    button.addEventListener('click', () => { go('privacy32'); $('#mobileMore38').hidden = true; });
    mobileMore.insertBefore(button, mobileMore.querySelector('small'));
  };
  ensureMobilePrivacy41();

  function approvedPool41UI() {
    return QUESTIONS.filter(question => question.verified === true && question.review_status === 'approved' && allowed31(question));
  }
  function renderExamAvailability41() {
    const setup = $('#examSetup');
    if (!setup) return;
    const available = approvedPool41UI().length;
    let note = $('examAvailability41');
    if (!note) {
      note = document.createElement('div');
      note.id = 'examAvailability41';
      note.className = 'note exam-availability41';
      setup.prepend(note);
    }
    const region = $('#jurisdiction')?.value || 'CN';
    note.innerHTML = `<b>当前可组卷：${available} 道核准题</b><br>法域：${escape41(region)}。只有题量不超过核准题池时才可开始；系统不会重复题目或以待审题补足。`;
    setup.querySelectorAll('[data-onclick^="startExam("]').forEach(button => {
      const count = Number(button.getAttribute('data-onclick').match(/startExam\((\d+)/)?.[1] || 0);
      const disabled = count > available;
      button.disabled = disabled;
      button.setAttribute('aria-disabled', String(disabled));
      button.title = disabled ? `当前只有 ${available} 道核准题，无法建立 ${count} 题模考` : '';
      const card = button.closest('.card');
      let status = card.querySelector('.exam-gate41');
      if (!status) { status = document.createElement('small'); status.className = 'exam-gate41'; card.append(status); }
      status.textContent = disabled ? `题量不足，需 ${count} 题` : '可开始';
      status.classList.toggle('blocked', disabled);
    });
  }

  function refreshConsent41() {
    const checkbox = $('#cloudConsent32');
    if (!checkbox) return;
    checkbox.checked = Boolean(user31 && window.esgSync40?.hasConsent());
    checkbox.disabled = !user31;
    $('#privacyStatus32').textContent = user31
      ? (checkbox.checked ? '云端同步已开启；学习进度、历届考题与考试草稿可跨装置同步。' : '云端同步未开启；资料只保存在本机。')
      : '请先登入，再决定是否开启云端同步。';
  }
  const changeConsent41 = async event => {
    event.target.disabled = true;
    try {
      await window.esgSync40.setConsent(event.target.checked);
      $('#privacyStatus32').textContent = event.target.checked
        ? '已同意并开启云端同步。'
        : '已关闭云端同步；现有云端资料不会自动删除。';
    } catch (error) {
      event.target.checked = false;
      $('#privacyStatus32').textContent = error.message || '无法更新同步设置。';
    } finally { event.target.disabled = !user31; }
  };

  const configureCloudDelete41 = () => {
    const cloudDelete = $('#privacyCloudDelete32');
    if (!cloudDelete) return false;
    // app-core contains the legacy V3.2 handler. Remove it and keep one delegated V4.1 path.
    cloudDelete.onclick = null;
    cloudDelete.dataset.gate1Delete = 'ready';
    return true;
  };
  async function deleteCloud41() {
    if (!sb31 || !user31) { $('#privacyStatus32').textContent = '请先登入。'; return; }
    if (!confirm('确定删除当前账号的云端资料及此装置的本机学习资料？其他装置的旧资料会在连线时清空，此操作无法撤销。')) return;
    const button = $('#privacyCloudDelete32');
    button.disabled = true;
    try {
      await window.esgSync40.pauseAndWait();
      const { data, error } = await sb31.rpc('esg_delete_my_learning_data_v41');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const resetVersion = Number(row?.reset_version || 0);
      state = {schema_version:4.1,cloud_reset_version:resetVersion,answered:{},learned:{},wrong:{},exams:[],attempts:[],past37:{answers:{}}};
      save();
      renderLearnList();
      if (typeof renderMastery31 === 'function') renderMastery31();
      if (typeof renderCompetency39 === 'function') renderCompetency39();
      window.esgExamDraft38?.applyRemote(null);
      refreshConsent41();
      $('#privacyStatus32').textContent = '云端及本机学习资料已删除；其他装置的旧版本资料会在连线时清空，无法重新上传。';
    } catch (error) {
      console.error('Cloud data deletion failed', error);
      $('#privacyStatus32').textContent = '云端删除失败；请确认 V4.1 migration 已部署。';
    } finally { button.disabled = false; }
  }
  if (!configureCloudDelete41()) document.addEventListener('DOMContentLoaded', configureCloudDelete41, { once:true });

  const priorApplySession41 = applySession31;
  applySession31 = async function(session) {
    await priorApplySession41(session);
    refreshConsent41();
    renderExamAvailability41();
  };
  $('#jurisdiction')?.addEventListener('change', () => {
    updateDash();
    renderLearnList();
    renderExamAvailability41();
  });
  document.addEventListener('click', event => {
    if (event.target.closest('#privacyCloudDelete32')) { event.preventDefault(); deleteCloud41(); return; }
    if (event.target.closest('[data-view="privacy32"], [data-mobile-view38="privacy32"], #privacyTop41')) {
      setTimeout(() => { configureCloudDelete41(); refreshConsent41(); }, 0);
    }
    if (event.target.closest('[data-view="exam"], [data-mobile-view38="exam"]')) setTimeout(renderExamAvailability41, 0);
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'cloudConsent32') changeConsent41(event);
  });

  const style = document.createElement('style');
  style.textContent = '.muted41,.practice-unavailable41,.exam-gate41.blocked{color:#7b625a}.practice-unavailable41{display:inline-block;padding:9px 12px;border:1px solid var(--line);border-radius:9px}.exam-gate41{display:block;margin-top:6px;color:#147252}.exam-availability41{margin-bottom:14px}.examsetup button:disabled{cursor:not-allowed;opacity:.45}';
  document.head.append(style);
  refreshConsent41();
  renderExamAvailability41();
  let lateChecks41 = 0;
  const lateTimer41 = setInterval(() => {
    ensureMobilePrivacy41();
    configureCloudDelete41();
    refreshConsent41();
    renderExamAvailability41();
    lateChecks41++;
    if (($('#privacyCloudDelete32') && $('#mobileMore38')) || lateChecks41 >= 20) clearInterval(lateTimer41);
  }, 50);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init41, { once:true });
  else init41();
})();
