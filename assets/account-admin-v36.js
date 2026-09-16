/* System-ESG V3.6 administrator account management. */
(() => {
  const account = el('account');
  if (!account) return;
  const panel = document.createElement('div');
  panel.className = 'card section account-admin36';
  panel.id = 'accountAdmin36';
  panel.hidden = true;
  panel.innerHTML = `<div class="head"><h3>账号管理</h3><span id="accountCount36">等待读取</span></div><p>建立、停用或调整系统账号。密码只在建立或重设当下显示一次。</p><form id="accountCreate36" class="account-create36"><input class="search" id="accountEmail36" type="email" required placeholder="使用者邮箱"><input class="search" id="accountName36" maxlength="80" placeholder="显示名称"><input class="search" id="accountPassword36" type="text" minlength="12" required placeholder="临时密码（至少12位）"><select class="sel" id="accountRole36"><option value="learner">一般使用者</option><option value="reviewer">内容审核员</option><option value="admin">管理员</option></select><button class="btn primary" type="submit">新增账号</button></form><div class="controls section"><input class="search" id="accountSearch36" placeholder="搜索邮箱或名称"><button class="btn soft" id="accountReload36" type="button">重新读取</button></div><p id="accountStatus36" class="feedback-status" aria-live="polite"></p><div class="table-scroll36"><table class="table account-table36"><thead><tr><th>账号</th><th>角色</th><th>状态</th><th>最后登入</th><th>操作</th></tr></thead><tbody id="accountRows36"></tbody></table></div>`;
  account.append(panel);

  const mfa = document.createElement('div');
  mfa.id = 'mfaModal36';
  mfa.className = 'mfa-modal36';
  mfa.hidden = true;
  mfa.innerHTML = `<div class="mfa-card36"><button class="mfa-close36" id="mfaClose36" type="button" aria-label="关闭">×</button><h2>管理员双重验证</h2><p>管理账号需完成验证器动态码，才能进入后台。</p><div id="mfaEnroll36" hidden><img id="mfaQr36" alt="验证器 QR Code"><p><code id="mfaSecret36"></code></p></div><input class="search" id="mfaCode36" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="输入6位动态码"><p><button class="btn primary" id="mfaVerify36" type="button">验证并进入后台</button></p><p id="mfaStatus36" class="feedback-status" aria-live="polite"></p></div>`;
  document.body.append(mfa);

  let users36 = [];
  let factor36 = null;
  const setAccountStatus36 = (message, kind = '') => { const node = el('accountStatus36'); node.textContent = message; node.className = `feedback-status ${kind}`.trim(); };
  const escape36 = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const date36 = value => value ? new Date(value).toLocaleString('zh-CN') : '尚未登入';
  const randomPassword36 = () => {
    const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%'];
    const all = groups.join(''), pick = chars => chars[crypto.getRandomValues(new Uint8Array(1))[0] % chars.length];
    const result = groups.map(pick).concat(Array.from({ length: 12 }, () => pick(all)));
    for (let index = result.length - 1; index > 0; index--) { const swap = crypto.getRandomValues(new Uint8Array(1))[0] % (index + 1); [result[index], result[swap]] = [result[swap], result[index]]; }
    return result.join('');
  };

  async function invoke36(action, payload = {}) {
    if (!sb31 || !user31) throw Error('请先登入');
    const { data, error } = await sb31.functions.invoke('account-admin', { body: { action, ...payload } });
    if (error) throw error;
    if (!data?.ok) throw Error(data?.error || '账号服务暂时无法处理');
    return data;
  }
  function renderUsers36() {
    const term = el('accountSearch36').value.trim().toLowerCase();
    const rows = users36.filter(user => !term || `${user.email} ${user.name || ''}`.toLowerCase().includes(term));
    el('accountCount36').textContent = `共 ${users36.length} 个账号`;
    el('accountRows36').innerHTML = rows.map(user => `<tr><td><b>${escape36(user.email)}</b><br><small>${escape36(user.name || '')}</small></td><td><select class="sel" data-role-id="${user.id}" ${user.self ? 'disabled' : ''}><option value="learner" ${user.role === 'learner' ? 'selected' : ''}>一般使用者</option><option value="reviewer" ${user.role === 'reviewer' ? 'selected' : ''}>内容审核员</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option></select></td><td><span class="pill ${user.disabled ? 's' : 'o'}">${user.disabled ? '已停用' : '使用中'}</span></td><td>${escape36(date36(user.last_sign_in_at))}</td><td><button class="btn soft" data-reset-id="${user.id}">重设密码</button> <button class="btn ${user.disabled ? 'soft' : 'danger'}" data-status-id="${user.id}" data-disabled="${user.disabled}" ${user.self ? 'disabled' : ''}>${user.disabled ? '启用' : '停用'}</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">没有符合条件的账号。</td></tr>';
    el('accountRows36').querySelectorAll('[data-role-id]').forEach(select => select.addEventListener('change', async () => {
      try { await invoke36('set_role', { user_id: select.dataset.roleId, role: select.value }); setAccountStatus36('角色已更新。', 'success'); await loadUsers36(); }
      catch (error) { setAccountStatus36(error.message, 'error'); await loadUsers36(); }
    }));
    el('accountRows36').querySelectorAll('[data-status-id]').forEach(button => button.addEventListener('click', async () => {
      button.disabled = true;
      try { await invoke36('set_disabled', { user_id: button.dataset.statusId, disabled: button.dataset.disabled !== 'true' }); setAccountStatus36('账号状态已更新。', 'success'); await loadUsers36(); }
      catch (error) { setAccountStatus36(error.message, 'error'); button.disabled = false; }
    }));
    el('accountRows36').querySelectorAll('[data-reset-id]').forEach(button => button.addEventListener('click', async () => {
      const password = randomPassword36();
      button.disabled = true;
      try { await invoke36('reset_password', { user_id: button.dataset.resetId, password }); setAccountStatus36(`临时密码：${password}（请立即安全交付，离开本页后不再显示）`, 'success'); }
      catch (error) { setAccountStatus36(error.message, 'error'); }
      finally { button.disabled = false; }
    }));
  }
  async function loadUsers36() {
    setAccountStatus36('正在读取账号…');
    try { const data = await invoke36('list'); users36 = data.users || []; renderUsers36(); setAccountStatus36('账号清单已更新。', 'success'); }
    catch (error) { users36 = []; renderUsers36(); setAccountStatus36(error.message, 'error'); }
  }
  el('accountCreate36').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    try {
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(el('accountPassword36').value)) throw Error('临时密码需至少12位，并包含大小写字母、数字及符号。');
      await invoke36('create', { email: el('accountEmail36').value.trim(), name: el('accountName36').value.trim(), password: el('accountPassword36').value, role: el('accountRole36').value });
      const createdEmail = el('accountEmail36').value.trim(), createdPassword = el('accountPassword36').value;
      el('accountCreate36').reset(); setAccountStatus36(`账号已建立：${createdEmail}；临时密码：${createdPassword}`, 'success'); await loadUsers36();
    } catch (error) { setAccountStatus36(error.message, 'error'); }
    finally { button.disabled = false; }
  });
  el('accountSearch36').addEventListener('input', renderUsers36);
  el('accountReload36').addEventListener('click', loadUsers36);

  async function openMfa36() {
    mfa.hidden = false; factor36 = null; el('mfaEnroll36').hidden = true; el('mfaStatus36').textContent = '正在检查验证器…';
    try {
      const { data, error } = await sb31.auth.mfa.listFactors(); if (error) throw error;
      factor36 = data?.totp?.find(item => item.status === 'verified') || null;
      if (!factor36) {
        const unfinished = data?.totp?.find(item => item.status !== 'verified');
        if (unfinished) {
          const { error: removeError } = await sb31.auth.mfa.unenroll({ factorId: unfinished.id });
          if (removeError) throw removeError;
        }
        const { data: enrolled, error: enrollError } = await sb31.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'System-ESG 管理后台' }); if (enrollError) throw enrollError;
        factor36 = enrolled; el('mfaQr36').src = enrolled.totp.qr_code; el('mfaSecret36').textContent = enrolled.totp.secret; el('mfaEnroll36').hidden = false;
        el('mfaStatus36').textContent = '请使用验证器扫描 QR Code，再输入动态码。';
      } else el('mfaStatus36').textContent = '请输入验证器目前显示的动态码。';
    } catch (error) { el('mfaStatus36').textContent = error.message || '无法启动双重验证。'; }
  }
  el('mfaClose36').addEventListener('click', () => { mfa.hidden = true; });
  el('mfaVerify36').addEventListener('click', async () => {
    const code = el('mfaCode36').value.trim(); if (!factor36 || !/^\d{6,8}$/.test(code)) return el('mfaStatus36').textContent = '请输入有效动态码。';
    try {
      const { data: challenge, error: challengeError } = await sb31.auth.mfa.challenge({ factorId: factor36.id }); if (challengeError) throw challengeError;
      const { error } = await sb31.auth.mfa.verify({ factorId: factor36.id, challengeId: challenge.id, code }); if (error) throw error;
      const { data } = await sb31.auth.getSession(); await applySession31(data.session); mfa.hidden = true; el('mfaCode36').value = '';
    } catch (error) { el('mfaStatus36').textContent = '验证失败，请确认动态码后重试。'; }
  });
  window.addEventListener('esg-admin-auth-request', openMfa36);

  const priorApplySession36 = applySession31;
  applySession31 = async function (session) {
    await priorApplySession36(session);
    const isManager = Boolean(user31 && ['admin', 'reviewer'].includes(role31));
    const verified = isManager && aal32 === 'aal2';
    const oldButton = el('adminEntry35');
    if (oldButton) {
      const button = oldButton.cloneNode(true); oldButton.replaceWith(button);
      button.hidden = !isManager; button.textContent = verified ? '管理后台' : '管理员验证';
      button.addEventListener('click', () => verified ? (account.classList.add('backend35'), go('account'), panel.hidden = role31 !== 'admin', role31 === 'admin' && loadUsers36()) : openMfa36());
    }
    panel.hidden = !verified || role31 !== 'admin';
  };
  Promise.resolve(sb31?.auth?.getSession?.()).then(result => {
    if (result?.data?.session) return applySession31(result.data.session);
  }).catch(() => {});
})();

