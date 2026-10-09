setTimeout(() => {
  const results = {};
  try {
    document.body.classList.remove('auth-pending', 'auth-required');
    if (document.getElementById('loginGate35')) document.getElementById('loginGate35').hidden = true;
    startApprovedPractice415();
    results.practiceQuestion = Boolean(document.querySelector('#practiceCard .q'));
    results.approvedLabel = document.getElementById('practiceCard')?.textContent.includes('已核准');
    results.sourceDetail = Boolean(document.querySelector('#practiceCard .source-trust415 span')?.textContent.trim());
    results.questionCount = Number(document.getElementById('practiceFilterCount415')?.textContent.match(/\d+/)?.[0] || 0);
    document.getElementById('jurisdiction').value = 'ALL';
    document.getElementById('jurisdiction').dispatchEvent(new Event('change', {bubbles:true}));
    const filterIds = ['pModule', 'pLevel', 'pType', 'pOrigin'];
    results.filterMatrix = {};
    for (const filterId of filterIds) {
      const select = document.getElementById(filterId);
      results.filterMatrix[filterId] = [...select.options].filter(option => option.value).every(option => {
        filterIds.forEach(id => { document.getElementById(id).value = ''; });
        select.value = option.value;
        startPractice();
        if (!pool.length) return Boolean(document.getElementById('clearPracticeFilters415'));
        const field = filterId === 'pModule' ? 'module_id' : filterId === 'pLevel' ? 'difficulty' : filterId === 'pType' ? 'question_type' : 'source_id';
        return pool.every(question => (question[field] || question[field === 'module_id' ? 'module' : field === 'difficulty' ? 'level' : '']) === option.value);
      });
    }
    filterIds.forEach(id => { document.getElementById(id).value = ''; });
    startPractice();
    go('learn');
    results.moduleFirst = Boolean(document.querySelector('.learn-module-summary415'));
    results.flatKnowledgePoints = document.querySelectorAll('#kpList > .kp').length;
    go('ability');
    results.reportCTA = Boolean(document.getElementById('reportPractice415') || document.getElementById('reportContinue415'));
    results.currentLocation = Boolean(document.querySelector('[data-view="ability"][aria-current="page"]'));
    results.nativeCards = !document.querySelector('.module:not(button), .learn-kp-grid415 .kp:not(button)');
    results.viewport = `${innerWidth}x${innerHeight}`;
  } catch (error) {
    window.gate2BrowserErrors.push(String(error.stack || error));
  }
  results.consoleErrors = window.gate2BrowserErrors;
  const passed = results.practiceQuestion && results.approvedLabel && results.sourceDetail
    && results.questionCount > 0 && Object.values(results.filterMatrix).every(Boolean)
    && results.moduleFirst && results.flatKnowledgePoints === 0
    && results.reportCTA && results.currentLocation && results.nativeCards
    && results.consoleErrors.length === 0;
  document.documentElement.dataset.gate2Result = passed ? 'PASS' : 'FAIL';
  document.documentElement.dataset.gate2Details = JSON.stringify(results);
}, 1200);
