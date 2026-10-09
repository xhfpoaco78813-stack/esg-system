/* System-ESG V4.1.5 Gate 2 product and UX remediation. Local revalidation build only. */
(() => {
  const init415 = () => {
    const $ = id => document.getElementById(id);
    const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const typeLabels415 = Object.fromEntries(GT_TYPES.map((value, index) => [value, GT_LABELS[index]]));
    const reviewLabels415 = {approved:'已核准',pending:'审核中',draft:'草稿',rejected:'已退回'};
    let learnPage415 = 1;
    const learnPageSize415 = 3;

    function approved415() {
      return QUESTIONS.filter(question => question.verified === true && question.review_status === 'approved' && allowed31(question));
    }
    function moduleOf415(question) { return question.module_id || question.module || ''; }
    function levelOf415(question) { return question.difficulty || question.level || ''; }
    function typeOf415(question) { return question.question_type || type31(question); }
    function sourceOf415(question) { return question.source_id || ''; }
    function practiceMatches415(question, filters = {}) {
      return (!filters.module || moduleOf415(question) === filters.module)
        && (!filters.level || levelOf415(question) === filters.level)
        && (!filters.type || typeOf415(question) === filters.type)
        && (!filters.source || sourceOf415(question) === filters.source);
    }
    window.esgGate2Test415 = { approved415, practiceMatches415, typeLabels415 };

    function selectedFilters415() {
      return {module:$('pModule')?.value || '', level:$('pLevel')?.value || '', type:$('pType')?.value || '', source:$('pOrigin')?.value || ''};
    }
    function filtered415() { const filters = selectedFilters415(); return approved415().filter(question => practiceMatches415(question, filters)); }
    function updateFilterCount415() {
      const count = filtered415().length;
      const output = $('practiceFilterCount415');
      if (output) output.textContent = `符合条件：${count} 道核准题`;
      return count;
    }
    function resetFilters415() {
      ['pModule','pLevel','pType','pOrigin'].forEach(id => { if ($(id)) $(id).value = ''; });
      populateSources415();
      updateFilterCount415();
      $('practiceCard').innerHTML = '<div class="empty">筛选已清除。点击“开始练习”从当前法域核准题开始。</div>';
    }
    function populateSources415() {
      const select = $('pOrigin');
      if (!select) return;
      const current = select.value;
      const rows = [...new Map(approved415().map(question => [sourceOf415(question), question])).values()].filter(question => sourceOf415(question));
      select.innerHTML = '<option value="">全部来源</option>' + rows.map(question => {
        const label = [question.source_authority || question.source_title || question.source_id, question.source_version].filter(Boolean).join(' · ');
        return `<option value="${safe(question.source_id)}">${safe(label)}</option>`;
      }).join('');
      if ([...select.options].some(option => option.value === current)) select.value = current;
    }
    function configurePracticeFilters415() {
      const typeSelect = $('pType');
      if (typeSelect) typeSelect.innerHTML = '<option value="">全部题型</option>' + GT_TYPES.map(type => `<option value="${type}">${safe(typeLabels415[type])}</option>`).join('');
      populateSources415();
      const controls = document.querySelector('#practice .controls');
      if (controls && !$('practiceFilterCount415')) {
        const count = document.createElement('output');
        count.id = 'practiceFilterCount415';
        count.className = 'filter-count415';
        count.setAttribute('aria-live', 'polite');
        controls.append(count);
      }
      const oldStart = controls?.querySelector('[data-onclick^="startPractice"]');
      if (oldStart) {
        oldStart.removeAttribute('data-onclick');
        oldStart.id = 'practiceStart415';
        oldStart.textContent = '开始练习';
        oldStart.type = 'button';
        oldStart.onclick = () => startPractice();
      }
      ['pModule','pLevel','pType','pOrigin'].forEach(id => $(id)?.addEventListener('change', updateFilterCount415));
      updateFilterCount415();
    }

    const priorStartPractice415 = startPractice;
    startPractice = function(custom) {
      const rows = (Array.isArray(custom) ? custom : filtered415())
        .filter(question => question.verified === true && question.review_status === 'approved' && allowed31(question));
      const count = $('practiceFilterCount415');
      if (count) count.textContent = `本次练习：${rows.length} 道核准题`;
      if (!rows.length) {
        pool = [];
        $('practiceCard').innerHTML = '<div class="empty"><p>目前没有符合这些条件的核准题。</p><button class="btn soft" id="clearPracticeFilters415" type="button">清除筛选</button></div>';
        $('clearPracticeFilters415').onclick = resetFilters415;
        return;
      }
      priorStartPractice415(rows);
    };
    function startApprovedPractice415() {
      ['pModule','pLevel','pType','pOrigin'].forEach(id => { if ($(id)) $(id).value = ''; });
      populateSources415();
      go('practice');
      startPractice();
    }
    window.startApprovedPractice415 = startApprovedPractice415;

    renderPractice = function() {
      if (!pool.length) {
        $('practiceCard').innerHTML = '<div class="empty"><p>目前没有符合这些条件的核准题。</p><button class="btn soft" id="clearPracticeFilters415" type="button">清除筛选</button></div>';
        $('clearPracticeFilters415').onclick = resetFilters415;
        return;
      }
      const question = pool[pi % pool.length];
      selected = null;
      const status = reviewLabels415[question.review_status] || '状态未标示';
      const sourceDetail = question.review_status === 'approved'
        ? [question.source_authority || question.source_title, question.source_version, question.source_clause].filter(Boolean).join(' · ')
        : (question.source_title || question.source_id || '来源资料未提供');
      $('practiceCard').innerHTML = `<div class="tags"><span class="pill">${safe(question.kp)}</span><span class="pill">${safe(levelOf415(question))}</span><span class="pill">${safe(typeLabels415[typeOf415(question)] || typeOf415(question))}</span><span class="pill ${question.review_status === 'approved' ? 'o' : ''}">${safe(status)}</span></div><div class="source-trust415"><b>题目依据</b><span>${safe(sourceDetail)}</span></div><div class="q" id="practiceQuestion415">${safe(question.q || question.question)}</div><div class="opts" aria-labelledby="practiceQuestion415">${controls31(question)}</div><p><button class="btn primary" id="typedSubmit" type="button">提交答案</button></p><div id="pAnswer" class="answer" role="status" aria-live="polite"></div><div class="qnav"><small>${pi + 1}/${pool.length}</small><button class="btn primary" id="nextPractice415" type="button">下一题</button></div>`;
      const typed = $('typed');
      if (typed) typed.setAttribute('aria-label', typeOf415(question) === 'calculation' ? '计算答案' : '作答顺序');
      $('typedSubmit').onclick = () => { try { choosePractice(readTyped31(question)); } catch (error) { toast(error.message); } };
      $('nextPractice415').onclick = () => nextPractice();
    };

    function learningReport415() {
      const target = $('ability');
      if (!target) return;
      const attempts = Array.isArray(state.attempts) ? state.attempts : [];
      const answered = Object.keys(state.answered || {}).length;
      if (!attempts.length && !answered) {
        target.innerHTML = '<div class="card report-empty415"><div class="k">学习报告</div><h2>完成练习后产生能力追踪资料</h2><p>系统会依据核准题作答，整理各模块的练习量、正确率与待加强方向。至少完成一题后即可开始累积报告。</p><button class="btn primary" id="reportPractice415" type="button">开始练习</button></div>';
        $('reportPractice415').onclick = startApprovedPractice415;
        return;
      }
      const rows = MODULES.map(module => {
        const stats = moduleStats(module.id);
        return `<div class="report-row415"><div class="mrow"><span>${module.icon} ${safe(module.name)}<small> · 已作答 ${stats.ans} 题</small></span><b>${stats.acc}%</b></div><div class="bar"><i style="width:${stats.acc}%"></i></div></div>`;
      }).filter((row, index) => moduleStats(MODULES[index].id).ans > 0).join('');
      target.innerHTML = `<div class="card"><div class="head"><div><div class="k">学习报告</div><h3>能力追踪</h3></div><span>依据核准题真实作答持续更新</span></div>${rows || '<div class="empty">已有学习记录，但尚未形成核准题统计。</div>'}<p><button class="btn soft" id="reportContinue415" type="button">继续练习</button></p></div>`;
      $('reportContinue415').onclick = startApprovedPractice415;
    }
    renderAbility = learningReport415;

    function recommendationScore415(module) {
      const stats = moduleStats(module.id);
      if (!stats.q) return 9999;
      if (!stats.ans) return -1000 - stats.q;
      return stats.acc;
    }
    function configureLearnControls415() {
      const controls = document.querySelector('#learn .controls');
      if (!controls) return;
      const oldButton = controls.querySelector('[data-onclick^="renderLearnList"]');
      if (oldButton) {
        oldButton.removeAttribute('data-onclick');
        oldButton.id = 'applyLearnFilters415';
        oldButton.type = 'button';
        oldButton.onclick = () => { learnPage415 = 1; renderLearnList(); };
      }
      if (!$('approvedOnly415')) {
        const label = document.createElement('label');
        label.className = 'approved-only415';
        label.innerHTML = '<input id="approvedOnly415" type="checkbox" checked> 仅显示有核准题';
        controls.insertBefore(label, oldButton || null);
        $('approvedOnly415').addEventListener('change', () => { learnPage415 = 1; renderLearnList(); });
      }
      $('learnModule')?.addEventListener('change', () => { learnPage415 = 1; renderLearnList(); });
      $('learnSearch')?.addEventListener('input', () => { learnPage415 = 1; renderLearnList(); });
    }
    renderLearnList = function() {
      const selectedModule = $('learnModule')?.value || '';
      const query = ($('learnSearch')?.value || '').trim().toLowerCase();
      const approvedOnly = $('approvedOnly415')?.checked !== false;
      const modules = MODULES.map(module => {
        const points = module.nodes.map((node, index) => ({node, index, count:approvedForKP41(module.id, node[0]).length}))
          .filter(item => (!query || item.node.join(' ').toLowerCase().includes(query)) && (!approvedOnly || item.count > 0));
        const approvedCount = points.reduce((total, item) => total + item.count, 0);
        return {module, points, approvedCount};
      }).filter(row => (!selectedModule || row.module.id === selectedModule) && row.points.length)
        .sort((a, b) => recommendationScore415(a.module) - recommendationScore415(b.module));
      const totalPages = Math.max(1, Math.ceil(modules.length / learnPageSize415));
      learnPage415 = Math.min(learnPage415, totalPages);
      const pageRows = modules.slice((learnPage415 - 1) * learnPageSize415, learnPage415 * learnPageSize415);
      $('kpDetail').classList.add('hidden');
      $('kpList').className = 'section learn-modules415';
      $('kpList').innerHTML = pageRows.length ? `<div class="learn-recommendation415"><b>推荐学习</b><span>优先显示有核准题且尚未作答或正确率较低的模块。</span></div>${pageRows.map((row, pageIndex) => {
        const stats = moduleStats(row.module.id);
        const regionId = `learnModuleRegion415_${pageIndex}`;
        return `<section class="learn-module415"><button class="learn-module-summary415" type="button" aria-expanded="${pageIndex === 0}" aria-controls="${regionId}" data-learn-toggle415="${pageIndex}"><span><i>${row.module.icon}</i><b>${safe(row.module.name)}</b><small>${safe(row.module.desc)}</small></span><span><strong>${row.approvedCount}</strong> 道核准题<br><small>作答 ${stats.ans} · 正确率 ${stats.acc}%</small></span></button><div class="learn-kp-grid415" id="${regionId}" ${pageIndex === 0 ? '' : 'hidden'}>${row.points.map(item => {
          const key = `${row.module.id}|${item.node[0]}`;
          return `<button class="card kp" type="button" data-open-kp415="${safe(row.module.id)}" data-kp-index415="${item.index}"><div class="mrow"><span class="pill">${safe(row.module.icon)} ${safe(row.module.name)}</span><span>${state.learned[key] ? '✅' : '◻️'}</span></div><h4>${safe(item.node[0])}</h4><p>${safe(item.node[1])}</p><div class="foot"><small>${item.count} 道核准题</small><b>查看知识 →</b></div></button>`;
        }).join('')}</div></section>`;
      }).join('')}<div class="learn-pagination415"><button class="btn soft" id="learnPrev415" type="button" ${learnPage415 <= 1 ? 'disabled' : ''}>上一页</button><span>第 ${learnPage415} / ${totalPages} 页 · ${modules.length} 个模块</span><button class="btn soft" id="learnNext415" type="button" ${learnPage415 >= totalPages ? 'disabled' : ''}>下一页</button></div>` : '<div class="empty">没有符合条件且具备核准题的知识内容。请调整筛选条件。</div>';
      document.querySelectorAll('[data-learn-toggle415]').forEach(button => button.onclick = () => {
        const region = document.getElementById(button.getAttribute('aria-controls'));
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        region.hidden = expanded;
      });
      document.querySelectorAll('[data-open-kp415]').forEach(button => button.onclick = () => openKP(button.dataset.openKp415, Number(button.dataset.kpIndex415)));
      $('learnPrev415')?.addEventListener('click', () => { learnPage415--; renderLearnList(); });
      $('learnNext415')?.addEventListener('click', () => { learnPage415++; renderLearnList(); });
    };

    updateDash = function() {
      $('mKp').textContent = MODULES.reduce((total, module) => total + module.nodes.length, 0);
      const approved = approved415();
      $('mQ').textContent = approved.length.toLocaleString();
      $('mQ').nextElementSibling.textContent = '当前法域核准题';
      const answered = Object.keys(state.answered || {}).length;
      const correct = Object.values(state.answered || {}).filter(row => row.correct).length;
      const wrong = Object.keys(state.wrong || {}).length;
      const learned = Object.keys(state.learned || {}).length;
      const total = MODULES.reduce((sum, module) => sum + module.nodes.length, 0);
      $('mDone').textContent = answered;
      $('mWrong').textContent = wrong;
      $('mAcc').textContent = `正确率 ${answered ? Math.round(correct / answered * 100) : 0}%`;
      $('heroProg').textContent = Math.round(learned / total * 100) + '%';
      $('moduleCards').innerHTML = MODULES.map(module => {
        const stats = moduleStats(module.id);
        const progress = Math.round(stats.learned / stats.total * 100);
        return `<button class="card module" type="button" data-open-module415="${safe(module.id)}"><div class="mrow"><div>${stats.q ? `<span class="pill">${stats.q} 道核准题</span>` : '<span class="pill muted41">暂无核准练习题</span>'}<h3>${module.icon} ${safe(module.name)}</h3></div><b>${progress}%</b></div><p>${safe(module.desc)}</p><div class="bar"><i style="width:${progress}%"></i></div><small>已学 ${stats.learned}/${stats.total} · 作答 ${stats.ans} · 正确率 ${stats.acc}%</small></button>`;
      }).join('');
      document.querySelectorAll('[data-open-module415]').forEach(button => button.onclick = () => openModule(button.dataset.openModule415));
    };

    const priorRenderWrong415 = renderWrong;
    renderWrong = function() {
      priorRenderWrong415();
      const count = Object.keys(state.wrong || {}).length;
      const button = document.querySelector('#wrong .g3 .card:last-child button');
      if (button) {
        button.removeAttribute('data-onclick');
        button.type = 'button';
        button.disabled = count === 0;
        button.setAttribute('aria-disabled', String(count === 0));
        button.title = count === 0 ? '目前没有错题' : '';
        button.onclick = count ? () => practiceWrong() : null;
      }
      if (!count && !$('wrongNormalPractice415')) {
        const empty = document.querySelector('#wrongList .empty');
        if (empty) empty.innerHTML = '<p>目前没有错题，可以继续一般练习。</p><button class="btn primary" id="wrongNormalPractice415" type="button">开始普通练习</button>';
        $('wrongNormalPractice415')?.addEventListener('click', startApprovedPractice415);
      }
    };

    function updateCurrentLocation415(id) {
      document.querySelectorAll('[data-view], [data-mobile-view38]').forEach(button => {
        const current = (button.dataset.view || button.dataset.mobileView38) === id;
        if (current) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
      });
    }
    const priorGo415 = go;
    go = function(id) {
      priorGo415(id);
      updateCurrentLocation415(id);
      if (id === 'ability') learningReport415();
      if (id === 'learn') renderLearnList();
      if (id === 'wrong') renderWrong();
      if (id === 'practice') updateFilterCount415();
    };

    function rewriteProductLanguage415() {
      document.querySelector('.brand small').textContent = 'V4.1.5 Gate 2 复验版';
      document.title = 'System-ESG｜中国制造业 ESG 实战学习平台';
      titles.dash = ['学习总览', '查看学习进度、练习成果与能力追踪。'];
      titles.ability = ['学习报告', '以核准题作答持续追踪各模块学习表现。'];
      document.querySelectorAll('[data-view="ability"] .lab').forEach(label => label.textContent = '学习报告');
      document.querySelectorAll('[data-mobile-view38="ability"]').forEach(button => button.innerHTML = '🎯 学习报告');
      const loginText = document.querySelector('.login-story35 p');
      if (loginText) loginText.textContent = '从知识学习、核准题练习到学习报告，逐步建立制造业 ESG 实务能力。';
      const points = document.querySelectorAll('.login-points35 span');
      if (points[2]) points[2].textContent = '能力追踪';
      const hero = document.querySelector('#dash .hero');
      if (hero) hero.innerHTML = '<div><div class="k" style="color:#a8d8c8">V4.1.5 Gate 2 Revalidation</div><h2>中国制造业 ESG 实战学习平台</h2><p>通过核准题练习、个性化学习与错题回补，持续追踪实务能力。</p><button class="btn" id="heroPractice415" type="button">开始练习</button></div><div class="big" id="heroProg">0%</div>';
      $('heroPractice415').onclick = startApprovedPractice415;
      const journey = document.querySelector('.journey39');
      if (journey) {
        journey.innerHTML = '<button type="button" data-v415="practice"><i>01</i><b>开始练习</b><small>使用核准题建立记录</small></button><button type="button" data-v415="learn"><i>02</i><b>个性化学习</b><small>按知识缺口推荐</small></button><button type="button" data-v415="practice"><i>03</i><b>实务训练</b><small>企业情境题</small></button><button type="button" data-v415="wrong"><i>04</i><b>错题回补</b><small>识别错误原因</small></button><button type="button" data-v415="ability"><i>05</i><b>学习报告</b><small>持续追踪学习表现</small></button>';
        journey.querySelectorAll('[data-v415]').forEach(button => button.onclick = () => button.dataset.v415 === 'practice' ? startApprovedPractice415() : go(button.dataset.v415));
      }
      const journeyTitle = document.querySelector('.journey39')?.previousElementSibling?.querySelector('h3');
      if (journeyTitle) journeyTitle.textContent = '一条可验证的学习提升路径';
      document.querySelectorAll('.recommendation39').forEach(box => {
        if (box.textContent.includes('基线')) box.textContent = '先完成一次核准题练习，系统会建立个人学习基线。';
      });
    }

    function accessibility415() {
      const labels = {learnModule:'学习模块',learnSearch:'搜索知识点',pModule:'练习模块',pLevel:'练习难度',pType:'练习题型',pOrigin:'题目来源',pastYear37:'历届考题年度',pastTopic37:'历届考题主题'};
      Object.entries(labels).forEach(([id, label]) => $(id)?.setAttribute('aria-label', label));
      document.querySelectorAll('.nav button').forEach(button => button.type = 'button');
      updateCurrentLocation415('dash');
    }

    const priorApplySession415 = applySession31;
    applySession31 = async function(session) {
      const before = user31?.id || null;
      await priorApplySession415(session);
      const after = user31?.id || null;
      const prompt = $('practiceCard');
      if (!before && after && prompt?.textContent.trim() === '用户已切换，请重新开始练习。') {
        prompt.innerHTML = '<div class="empty">请选择条件并开始练习。</div>';
      }
      if (before && after && before !== after && prompt) prompt.innerHTML = '<div class="empty">账号已切换，请重新开始练习。</div>';
      populateSources415();
      updateFilterCount415();
    };

    rewriteProductLanguage415();
    configurePracticeFilters415();
    configureLearnControls415();
    accessibility415();
    updateDash();
    renderLearnList();
    learningReport415();
    if ($('practiceCard')?.textContent.trim() === '用户已切换，请重新开始练习。') $('practiceCard').innerHTML = '<div class="empty">请选择条件并开始练习。</div>';
    $('jurisdiction')?.addEventListener('change', () => { populateSources415(); learnPage415 = 1; updateFilterCount415(); renderLearnList(); updateDash(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init415, {once:true});
  else init415();
})();
