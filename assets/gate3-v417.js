/* System-ESG V4.1.7 Gate 3 revalidation remediation layer. Staging candidate only. */
(() => {
  const $ = id => document.getElementById(id);
  const controlNames416 = {
    learnSearch:'搜索知识点', sbUrl:'Supabase 项目网址', sbKey:'Supabase 公开密钥',
    email31:'电子邮箱', password31:'密码', newPassword31:'新密码',
    accountEmail36:'使用者邮箱', accountName36:'显示名称', accountPassword36:'临时密码',
    accountRole36:'账号角色', accountSearch36:'搜索账号', mfaCode36:'双重验证动态码',
    feedbackFilter34:'意见状态', feedbackCategory34:'意见类型', feedbackMessage34:'建议内容',
    cloudConsent32:'云端同步同意', labMode32:'待审实验题模式', restoreProgress:'恢复进度备份',
    demoInput:'演示题答案', demoAction:'演示题下一步', jurisdiction:'学习法域'
  };

  function hasProgrammaticName416(control) {
    if (control.getAttribute('aria-label') || control.getAttribute('aria-labelledby')) return true;
    if (control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`)) return true;
    return Boolean(control.closest('label'));
  }
  function labelControls416(root = document) {
    root.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(control => {
      if (hasProgrammaticName416(control)) return;
      const fallback = controlNames416[control.id]
        || control.getAttribute('placeholder')
        || control.getAttribute('name')
        || (control.tagName === 'SELECT' ? '选择项目' : '输入内容');
      control.setAttribute('aria-label', fallback);
    });
    root.querySelectorAll('[data-role-id]').forEach(control => {
      if (!hasProgrammaticName416(control)) control.setAttribute('aria-label', '账号角色');
    });
  }
  function unifyWrongAnswerLanguage416() {
    if (window.titles) titles.wrong = ['错题回补', '复习错题并完成针对性回补。'];
    document.querySelectorAll('[data-view="wrong"]').forEach(button => {
      const label = button.querySelector('.lab');
      if (label) label.textContent = '错题回补';
      else if (button.textContent.includes('错题诊断')) button.textContent = button.textContent.replace('错题诊断', '错题回补');
      button.setAttribute('aria-label', '错题回补');
    });
    document.querySelectorAll('[data-mobile-view38="wrong"]').forEach(node => {
      node.setAttribute('aria-label', '错题回补');
      if (node.textContent.includes('错题诊断')) node.textContent = node.textContent.replace('错题诊断', '错题回补');
    });
    document.querySelectorAll('button, h1, h2, h3, p, span, small').forEach(node => {
      if (node.childElementCount === 0 && node.textContent.includes('错题诊断')) {
        node.textContent = node.textContent.replaceAll('错题诊断', '错题回补');
      }
    });
  }
  function setVersion416() {
    const brand = document.querySelector('.brand small');
    if (brand) brand.textContent = 'V4.1.7 Gate 3 复验候选版';
    const version = document.querySelector('#dash .hero .k');
    if (version) version.textContent = 'V4.1.7 Gate 3 Revalidation Candidate';
  }
  function init416() {
    unifyWrongAnswerLanguage416();
    labelControls416();
    setVersion416();
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        labelControls416(node.matches?.('input,select,textarea') ? node.parentElement || node : node);
        unifyWrongAnswerLanguage416();
      }
    }))).observe(document.body, {childList:true, subtree:true});
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-view="wrong"], [data-mobile-view38="wrong"]');
      if (target) requestAnimationFrame(unifyWrongAnswerLanguage416);
    });
  }
  window.esgGate3V417 = {labelControls:labelControls416, unifyLanguage:unifyWrongAnswerLanguage416};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init416, {once:true});
  else init416();
})();
