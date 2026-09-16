/* System-ESG V3.5 simplified authenticated entry. */
(() => {
  const removedViews = new Set(['sources', 'engine', 'ground', 'readiness32', 'privacy32', 'account']);
  titles.dash = ['学习总览', '查看你的学习进度、练习成果与能力诊断。'];
  const versionLabel35 = document.querySelector('#dash .hero .k');
  if (versionLabel35) versionLabel35.textContent = 'V3.6 账号管理版';
  const nav = el('nav');
  [...nav.querySelectorAll('button')].forEach(button => {
    const view = button.dataset.view;
    const text = button.textContent || '';
    if (removedViews.has(view) || /官方资料库|题库说明|V3\.1 学习闭环|登录与管理|上线准备度|隐私与资料/.test(text)) button.remove();
  });

  const gate = document.createElement('div');
  gate.id = 'loginGate35';
  gate.className = 'login-gate35';
  gate.innerHTML = `<section class="login-story35"><div class="login-mark35">ESG</div><h1>ESG 学习测验系统</h1><p>以知识学习、情境练习与模拟测验，建立可持续发展及碳管理能力。</p><div class="login-points35"><span>知识学习</span><span>刷题训练</span><span>能力诊断</span><span>错题回补</span></div></section><section class="login-panel35"><div class="login-card35"><div id="loginMode35"><h2>登入系统</h2><form id="loginForm35" class="login-form35"><label for="loginEmail35">电子邮箱</label><input class="search" id="loginEmail35" type="email" autocomplete="username" required placeholder="name@example.com"><label for="loginPassword35">密码</label><input class="search" id="loginPassword35" type="password" autocomplete="current-password" required placeholder="请输入密码"><button class="btn primary" id="loginSubmit35" type="submit">登入</button></form></div><div id="recoveryMode35" hidden><h2>设定新密码</h2><p>请输入至少 12 位的新密码，完成后请重新登入。</p><form id="recoveryForm35" class="login-form35"><label for="recoveryPassword35">新密码</label><input class="search" id="recoveryPassword35" type="password" autocomplete="new-password" minlength="12" required><label for="recoveryConfirm35">确认新密码</label><input class="search" id="recoveryConfirm35" type="password" autocomplete="new-password" minlength="12" required><button class="btn primary" id="recoverySubmit35" type="submit">更新密码</button></form></div><p id="loginStatus35" class="login-status35" aria-live="polite">正在检查登入状态…</p></div></section>`;
  document.body.insertBefore(gate, document.body.firstChild);

  const top = document.querySelector('.top');
  const oldBadge = el('trackBadge');
  const topActions = document.createElement('div');
  topActions.className = 'top-actions35';
  topActions.innerHTML = `<span class="top-user35" id="topUser35"></span><button class="btn soft admin-entry35" id="adminEntry35" hidden>管理后台</button><button class="btn soft" id="logout35">退出登入</button>`;
  oldBadge?.replaceWith(topActions);
  const governanceCard = el('account')?.querySelectorAll('.card')[1];
  governanceCard?.insertAdjacentHTML('afterbegin', '<div class="controls"><button class="btn soft" id="readinessEntry35" type="button">查看上线准备度</button></div><hr>');
  el('readinessEntry35')?.addEventListener('click', () => go('readiness32'));

  const status = (message, kind = '') => {
    const node = el('loginStatus35');
    node.textContent = message;
    node.className = `login-status35 ${kind}`.trim();
  };
  const setRecovery = active => {
    el('loginMode35').hidden = active;
    el('recoveryMode35').hidden = !active;
    if (active) status('邮件连结已验证，请设定新密码。', 'success');
  };
  const showGate = (message = '请先登入后使用系统。') => {
    document.body.classList.remove('auth-pending');
    document.body.classList.add('auth-required');
    gate.hidden = false;
    setRecovery(Boolean(recovery31 && user31));
    if (!(recovery31 && user31)) status(message);
  };
  const showApp = () => {
    gate.hidden = true;
    document.body.classList.remove('auth-pending', 'auth-required');
    el('topUser35').textContent = user31?.email || '';
    const canManage = ['admin', 'reviewer'].includes(role31) && aal32 === 'aal2';
    el('adminEntry35').hidden = !canManage;
    go('dash');
  };

  el('loginForm35').addEventListener('submit', async event => {
    event.preventDefault();
    if (!sb31) return status('登入服务暂时无法连接，请稍后再试。', 'error');
    const button = el('loginSubmit35');
    button.disabled = true;
    status('正在登入…');
    try {
      const { error } = await sb31.auth.signInWithPassword({ email: el('loginEmail35').value.trim(), password: el('loginPassword35').value });
      if (error) throw error;
      el('loginPassword35').value = '';
    } catch (error) {
      console.error('Login failed', error);
      status('登入失败，请检查邮箱与密码。', 'error');
    } finally { button.disabled = false; }
  });

  el('recoveryForm35').addEventListener('submit', async event => {
    event.preventDefault();
    const password = el('recoveryPassword35').value;
    if (password.length < 12) return status('新密码至少需要 12 位。', 'error');
    if (password !== el('recoveryConfirm35').value) return status('两次输入的密码不一致。', 'error');
    const button = el('recoverySubmit35');
    button.disabled = true;
    try {
      const { error } = await sb31.auth.updateUser({ password });
      if (error) throw error;
      recovery31 = false;
      await sb31.auth.signOut();
      setRecovery(false);
      el('recoveryForm35').reset();
      status('密码已更新，请使用新密码登入。', 'success');
    } catch (error) {
      console.error('Password update failed', error);
      status('密码更新失败，请重新开启重设邮件中的连结。', 'error');
    } finally { button.disabled = false; }
  });

  el('logout35').addEventListener('click', async () => {
    try { if (sb31) await sb31.auth.signOut(); }
    catch (error) { console.error('Logout failed', error); }
    await applySession31(null);
  });
  el('adminEntry35').addEventListener('click', () => {
    el('account').classList.add('backend35');
    go('account');
  });

  const priorApplySession35 = applySession31;
  applySession31 = async function (session) {
    await priorApplySession35(session);
    if (recovery31 && user31) return showGate();
    if (!user31) return showGate();
    showApp();
  };

  // Resolve sessions that may have completed while this final UI layer loaded.
  (async () => {
    if (!sb31) return showGate('登入服务暂时无法连接，请稍后重新整理页面。');
    try {
      const { data, error } = await sb31.auth.getSession();
      if (error) throw error;
      await applySession31(data.session);
    } catch (error) {
      console.error('Session check failed', error);
      showGate('无法确认登入状态，请稍后重新整理页面。');
    }
  })();
})();

