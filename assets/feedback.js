// V3.4 feedback channel: public submission and MFA-protected admin review.
(() => {
  const categories = new Set(['content', 'feature', 'usability', 'bug', 'other']);
  const statuses = new Set(['new', 'reviewing', 'planned', 'resolved', 'closed']);
  const categoryLabels = { content: '内容或题目', feature: '功能建议', usability: '操作体验', bug: '问题回报', other: '其他' };
  const statusLabels = { new: '新留言', reviewing: '处理中', planned: '已纳入计划', resolved: '已解决', closed: '已关闭' };

  const navButton = document.createElement('button');
  navButton.dataset.view = 'feedback34';
  navButton.title = '意见反馈';
  navButton.innerHTML = '💬 <span class="lab">意见反馈</span>';
  navButton.addEventListener('click', () => go('feedback34'));
  el('nav').append(navButton);
  titles.feedback34 = ['意见反馈', '提出内容、功能与使用体验建议，帮助系统持续改善。'];

  const section = document.createElement('section');
  section.className = 'view';
  section.id = 'feedback34';
  section.innerHTML = `<div class="grid g2 feedback-layout"><div class="card"><h3>提交建议</h3><p>登入与访客都可以留言。请勿填写密码、证件号码或其他敏感资料。</p><form id="feedbackForm34"><label for="feedbackCategory34"><b>意见类型</b></label><select class="sel feedback-field" id="feedbackCategory34" required><option value="content">内容或题目</option><option value="feature">功能建议</option><option value="usability">操作体验</option><option value="bug">问题回报</option><option value="other">其他</option></select><label for="feedbackMessage34"><b>建议内容</b></label><textarea class="search feedback-textarea" id="feedbackMessage34" minlength="10" maxlength="3000" required placeholder="请说明遇到的情况、希望改善的方式，至少10个字。"></textarea><div class="mrow"><small id="feedbackCount34">0 / 3000</small><button class="btn primary" id="feedbackSubmit34" type="submit">送出意见</button></div></form><p id="feedbackStatus34" class="feedback-status" aria-live="polite"></p></div><div class="card"><h3>我们如何处理</h3><p>意见会进入管理后台，依序标记为新留言、处理中、已纳入计划、已解决或已关闭。</p><p>留言仅用于产品改善；一般使用者无法读取其他人的内容。登入者的账号识别码只用于管理重复问题与后续追踪。</p></div></div>`;
  document.querySelector('main.main').append(section);

  const messageInput = el('feedbackMessage34');
  const form = el('feedbackForm34');
  const submitButton = el('feedbackSubmit34');
  const setFeedbackStatus = (message, kind = '') => {
    const node = el('feedbackStatus34');
    node.textContent = message;
    node.className = `feedback-status ${kind}`.trim();
  };
  messageInput.addEventListener('input', () => { el('feedbackCount34').textContent = `${messageInput.value.length} / 3000`; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const category = el('feedbackCategory34').value;
    const message = messageInput.value.trim();
    if (!categories.has(category) || message.length < 10 || message.length > 3000) {
      setFeedbackStatus('请填写10至3000字的有效建议。', 'error');
      return;
    }
    if (!sb31) {
      setFeedbackStatus('意见服务尚未连接，请先到「登录与管理」连接 Supabase。', 'error');
      return;
    }
    submitButton.disabled = true;
    setFeedbackStatus('正在送出…');
    try {
      const { error } = await sb31.from('esg_feedback').insert({ category, message, user_id: user31?.id || null, page_path: location.pathname.slice(0, 500) });
      if (error) throw error;
      form.reset();
      el('feedbackCount34').textContent = '0 / 3000';
      setFeedbackStatus('意见已送出，谢谢你帮助我们改善系统。', 'success');
    } catch (error) {
      console.error('Feedback submission failed', error);
      setFeedbackStatus('暂时无法送出，请稍后再试。', 'error');
    } finally { submitButton.disabled = false; }
  });

  const adminPanel = document.createElement('div');
  adminPanel.className = 'feedback-admin34';
  adminPanel.innerHTML = `<hr><div class="head"><h3>使用者意见</h3><span>仅管理角色可阅览</span></div><div class="controls"><select class="sel" id="feedbackFilter34"><option value="">全部状态</option><option value="new">新留言</option><option value="reviewing">处理中</option><option value="planned">已纳入计划</option><option value="resolved">已解决</option><option value="closed">已关闭</option></select><button class="btn soft" id="feedbackReload34" type="button">读取意见</button></div><p id="feedbackAdminStatus34" aria-live="polite"></p><div id="feedbackList34"></div>`;
  el('admin31').append(adminPanel);

  function makeFeedbackRow(row) {
    const article = document.createElement('article');
    article.className = 'feedback-row';
    const meta = document.createElement('div');
    meta.className = 'mrow';
    const title = document.createElement('b');
    title.textContent = `${categoryLabels[row.category] || row.category} · ${statusLabels[row.status] || row.status}`;
    const date = document.createElement('small');
    date.textContent = new Date(row.created_at).toLocaleString('zh-CN');
    meta.append(title, date);
    const body = document.createElement('p');
    body.className = 'feedback-body';
    body.textContent = row.message;
    const owner = document.createElement('small');
    owner.textContent = row.user_id ? `登入使用者：${row.user_id}` : '匿名访客';
    const controls = document.createElement('div');
    controls.className = 'feedback-review-controls';
    const status = document.createElement('select');
    status.className = 'sel';
    Object.entries(statusLabels).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value; option.textContent = label; option.selected = row.status === value; status.append(option);
    });
    const note = document.createElement('textarea');
    note.className = 'search'; note.maxLength = 2000; note.placeholder = '内部处理备注（选填）'; note.value = row.admin_note || '';
    const save = document.createElement('button');
    save.className = 'btn soft'; save.type = 'button'; save.textContent = '保存处理结果';
    save.addEventListener('click', async () => {
      if (!statuses.has(status.value)) return;
      save.disabled = true;
      try {
        const { error } = await sb31.from('esg_feedback').update({ status: status.value, admin_note: note.value.trim() || null, reviewed_by: user31.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('feedback_id', row.feedback_id);
        if (error) throw error;
        el('feedbackAdminStatus34').textContent = '处理结果已保存。';
        await loadFeedbackAdmin34();
      } catch (error) {
        console.error('Feedback update failed', error);
        el('feedbackAdminStatus34').textContent = '保存失败，请检查权限或稍后再试。';
      } finally { save.disabled = false; }
    });
    controls.append(status, note, save);
    article.append(meta, body, owner, controls);
    return article;
  }

  async function loadFeedbackAdmin34() {
    const list = el('feedbackList34');
    if (!sb31 || !user31 || !['admin', 'reviewer'].includes(role31) || aal32 !== 'aal2') {
      list.replaceChildren();
      el('feedbackAdminStatus34').textContent = '需要管理角色及 MFA 验证后才能读取意见。';
      return;
    }
    el('feedbackAdminStatus34').textContent = '正在读取…';
    let query = sb31.from('esg_feedback').select('feedback_id,user_id,category,message,status,admin_note,created_at,updated_at').order('created_at', { ascending: false }).limit(100);
    const filter = el('feedbackFilter34').value;
    if (filter) query = query.eq('status', filter);
    const { data, error } = await query;
    if (error) {
      console.error('Feedback load failed', error);
      list.replaceChildren();
      el('feedbackAdminStatus34').textContent = '读取失败，请检查资料表与权限设置。';
      return;
    }
    list.replaceChildren(...(data || []).map(makeFeedbackRow));
    el('feedbackAdminStatus34').textContent = data?.length ? `显示最近 ${data.length} 则意见。` : '目前没有符合条件的意见。';
  }
  el('feedbackReload34').addEventListener('click', loadFeedbackAdmin34);
  el('feedbackFilter34').addEventListener('change', loadFeedbackAdmin34);

  const priorApplySession34 = applySession31;
  applySession31 = async function (session) {
    await priorApplySession34(session);
    if (user31 && ['admin', 'reviewer'].includes(role31) && aal32 === 'aal2') await loadFeedbackAdmin34();
  };
})();
