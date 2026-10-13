setTimeout(async () => {
  const results = {};
  try {
    document.body.classList.remove('auth-pending', 'auth-required');
    if (document.getElementById('loginGate35')) document.getElementById('loginGate35').hidden = true;
    startApprovedPractice415();
    results.practiceQuestion = Boolean(document.querySelector('#practiceCard .q'));
    go('wrong');
    results.wrongTitle = document.getElementById('title')?.textContent === '错题回补';
    results.noWrongDiagnosis = !document.body.textContent.includes('错题诊断');
    results.wrongNav = document.querySelector('[data-view="wrong"]')?.textContent.includes('错题回补');
    results.privacyTopPresent = Boolean(document.getElementById('privacyTop41'));
    document.getElementById('privacyTop41')?.click();
    results.privacyOpened = document.getElementById('privacy32')?.classList.contains('active') === true;
    document.getElementById('accountAdmin36').hidden = false;
    document.getElementById('mfaModal36').hidden = false;
    window.esgGate3V418?.labelControls(document);
    const hasName = control => {
      if (control.getAttribute('aria-label') || control.getAttribute('aria-labelledby')) return true;
      if (control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`)) return true;
      return Boolean(control.closest('label'));
    };
    results.unlabeledControls = [...document.querySelectorAll('input:not([type="hidden"]),select,textarea')]
      .filter(control => !hasName(control)).map(control => control.id || control.outerHTML.slice(0,80));
    results.faviconHref = document.querySelector('link[rel~="icon"]')?.getAttribute('href') || '';
    results.version = document.querySelector('#dash .hero .k')?.textContent || document.querySelector('.brand small')?.textContent || '';
    results.viewport = `${innerWidth}x${innerHeight}`;
    await new Promise(resolve => setTimeout(resolve, 50));
    results.privacyStatus = document.getElementById('privacyStatus32')?.textContent || '';
    results.privacyRefresh = document.documentElement.dataset.privacyRefresh41 || '';
  } catch (error) {
    window.gate3BrowserErrors.push(String(error.stack || error));
  }
  results.consoleErrors = window.gate3BrowserErrors;
  results.consoleWarnings = window.gate3BrowserWarnings;
  const passed = results.practiceQuestion && results.wrongTitle && results.noWrongDiagnosis && results.wrongNav
    && results.privacyTopPresent && results.privacyOpened && results.privacyStatus.length > 0 && results.privacyRefresh === 'complete'
    && results.unlabeledControls.length === 0 && results.faviconHref === 'assets/favicon.svg'
    && results.version.includes('V4.1.8') && results.consoleErrors.length === 0 && results.consoleWarnings.length === 0;
  document.documentElement.dataset.gate3Result = passed ? 'PASS' : 'FAIL';
  document.documentElement.dataset.gate3Details = JSON.stringify(results);
}, 1500);
