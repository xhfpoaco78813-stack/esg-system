/* System-ESG V3.7 formal past-exam coaching area. */
(() => {
  const pastQuestions37 = [
    { id:'PE22-01', year:'2022', topic:'ESG基础', difficulty:'L1', q:'企业同时评估其活动对环境社会的影响，以及可持续议题对企业财务的影响，最符合哪个概念？', options:['单一财务重要性','双重重要性','范围三盘查','情境分析'], answer:1, focus:'辨认双重重要性的两个观察方向。', concept:'影响重要性关注企业对人和环境的影响；财务重要性关注可持续议题对企业价值和财务表现的影响。', trap:'看到题干出现“财务”就选单一重要性，忽略题目同时描述企业对外部的影响。', steps:['圈出题干中的两个影响方向','判断是否同时出现由内向外与由外向内','两个方向同时存在时选择双重重要性'], transfer:'若题目只问气候风险对现金流的影响，则重点转向财务重要性。' },
    { id:'PE22-02', year:'2022', topic:'碳盘查', difficulty:'L1', q:'制造企业向第三方物流公司购买运输服务，该运输活动的排放通常归入采购方哪个范围？', options:['范围一','范围二','范围三','不纳入盘查'], answer:2, focus:'根据控制关系区分直接排放与价值链间接排放。', concept:'非企业拥有或控制的运输来源，若属于价值链活动，通常归入范围三相关类别。', trap:'因为运输直接服务企业就误判为范围一；判断关键是排放源是否由企业拥有或控制。', steps:['确认车辆的拥有与控制关系','判断活动是否发生在企业价值链','第三方运输通常属于价值链间接排放'], transfer:'若车辆改为企业自有且由企业控制，燃油排放通常转为范围一。' },
    { id:'PE22-03', year:'2022', topic:'碳计算', difficulty:'L2', q:'某设施燃料用量为 2,000 kg，排放因子为 3 kgCO₂e/kg。计算结果是多少？', options:['600 kgCO₂e','2,003 kgCO₂e','5,000 kgCO₂e','6,000 kgCO₂e'], answer:3, focus:'掌握活动数据乘以排放因子的基本结构与单位约分。', concept:'排放量 = 活动数据 × 排放因子；kg × kgCO₂e/kg = kgCO₂e。', trap:'把两个数相加，或忽略单位造成数量级错误。', steps:['写出活动数据乘以排放因子','代入 2,000 × 3','检查单位约分后保留 kgCO₂e'], transfer:'若结果需以 tCO₂e 表示，再除以 1,000，得到 6 tCO₂e。' },
    { id:'PE23-01', year:'2023', topic:'治理与披露', difficulty:'L2', q:'ESG 报告发布前发现关键能耗数据异常，治理上最恰当的处理是？', options:['删除异常值且不留记录','改用较好看的估计值','追查来源与口径、记录修正依据并完成复核','继续发布，之后再说明'], answer:2, focus:'考查数据治理、内部复核与可追溯性。', concept:'异常数据应经过来源核对、口径确认、修正记录与适当复核，确保披露可追溯。', trap:'为了时程或表现而跳过验证，会扩大错误与漂绿风险。', steps:['暂停使用尚未核验的数据','追查来源口径与转换过程','记录修正依据并由适当人员复核'], transfer:'若无法及时完成核验，应评估是否延后披露或透明说明限制。' },
    { id:'PE23-02', year:'2023', topic:'转型计划', difficulty:'L2', q:'下列哪项最能证明企业的净零目标具有执行基础？', options:['发布一句长期愿景','设定基准年、中期目标、行动、预算与责任人','每年更换盘查边界','只揭露减排成果、不揭露方法'], answer:1, focus:'分辨目标宣示与可执行转型计划。', concept:'可信计划通常包含边界、基准、阶段目标、行动、资源、责任与追踪机制。', trap:'把宏大的长期目标误当成完整行动计划。', steps:['先找可衡量的基准与中期节点','再找行动所需资源和责任分工','最后确认能否持续追踪与问责'], transfer:'若只有 2050 目标而没有 2030 节点，应继续追问近期路径与资源配置。' },
    { id:'PE23-03', year:'2023', topic:'供应链', difficulty:'L3', q:'供应商发生重大污染并造成供货中断，采购企业最完整的第一轮处理方式是？', options:['只要求降价补偿','停止记录以避免负面信息','评估环境与供应链风险、要求改善并持续追踪','完全交由公关部门处理'], answer:2, focus:'识别环境事件与供应链营运风险的连动。', concept:'事件同时涉及环境影响、合规、供货连续性与供应商管理，需要跨部门评估和改善追踪。', trap:'只从价格或公关角度处理，遗漏实质风险与责任链。', steps:['确认事件事实与影响范围','评估环境合规及供货风险','设定改善要求责任期限与追踪机制'], transfer:'若供应商拒绝改善，应依风险等级启动替代采购或退出机制。' },
    { id:'PE24-01', year:'2024', topic:'中国双碳', difficulty:'L2', q:'企业提出“积极响应双碳”但没有基准年、排放边界与责任人，最关键的问题是什么？', options:['文字不够长','缺乏可衡量与可追踪的实施基础','没有使用英文','没有制作宣传影片'], answer:1, focus:'判断减排承诺是否具备可验证的管理基础。', concept:'目标需要基准、边界、阶段节点、责任及数据，才能被衡量、执行和验证。', trap:'把传播形式误当成目标质量。', steps:['确认目标是否有基准与边界','检查责任人与行动是否明确','检查是否能以数据持续追踪'], transfer:'若边界发生重大并购变化，还要评估基准年是否需要重算。' },
    { id:'PE24-02', year:'2024', topic:'范围二', difficulty:'L2', q:'盘查表列出“外购电力 80 MWh”，应优先归入哪个排放范围？', options:['范围一','范围二','范围三','不属于温室气体盘查'], answer:1, focus:'辨识购入能源间接排放。', concept:'外购电力的排放发生在发电端，但由用电企业报告相关范围二排放。', trap:'因为发电厂不属于企业就判断无需报告，忽略范围二的购入能源逻辑。', steps:['先判断是否为企业直接拥有的排放源','确认是否属于购入电力热力蒸汽或冷量','购入电力通常归入范围二'], transfer:'若题目改为企业自有燃气发电机，则燃烧排放通常属于范围一。' },
    { id:'PE24-03', year:'2024', topic:'目标与漂绿', difficulty:'L3', q:'企业宣称产品“零碳”，但只购买抵消量且未说明产品边界与剩余排放，主要风险是什么？', options:['员工人数不足','可能形成误导或漂绿风险','一定违反所有国家法律','产品无法销售'], answer:1, focus:'判断环境宣称是否透明、完整且有证据。', concept:'环境宣称应说明边界、方法、实际减排与抵消用途，避免让使用者误解产品本身没有排放。', trap:'把购买抵消等同于产品全过程绝对零排放。', steps:['检查宣称覆盖的产品与生命周期边界','区分实际减排与抵消','确认是否透明说明剩余排放与依据'], transfer:'较稳健的表达会分别说明盘查结果、减排行动及抵消的范围和限制。' },
    { id:'PE25-01', year:'2025', topic:'CBAM', difficulty:'L2', q:'出口企业收到客户的 CBAM 数据要求，最适合优先确认哪一项？', options:['购买多少自愿碳权','产品适用范围、申报期间与数据边界','公司的公益活动金额','竞争对手的平均排放'], answer:1, focus:'辨识 CBAM 准备工作的正确起点。', concept:'应先确认产品和期间是否适用、所需数据边界与计算规则，再组织设施及产品数据。', trap:'过早购买碳权或引用行业平均，跳过适用性与数据要求判断。', steps:['确认产品是否落入适用范围','确认申报主体期间与规则版本','建立活动数据排放因子和计算证据链'], transfer:'完成适用性判断后，再与进口商确认数据格式、验证及交付时点。' },
    { id:'PE25-02', year:'2025', topic:'气候披露', difficulty:'L3', q:'企业识别出洪水可能中断主要厂区生产。下列哪组信息最能支持有用的气候披露？', options:['只说明“存在风险”','风险期间、影响路径、应对措施及财务影响评估','只列出厂区地址','只公布年度营收'], answer:1, focus:'把气候风险连接到期间、影响、行动与财务结果。', concept:'有用披露需要说明风险如何影响企业、何时可能发生、如何应对，以及财务影响或评估方法。', trap:'停留在风险名称清单，没有解释企业特定影响。', steps:['辨识风险与受影响资产','说明影响发生的期间和路径','连接应对措施及财务影响评估'], transfer:'若量化仍有高度不确定性，应说明估计方法、假设与限制。' },
    { id:'PE25-03', year:'2025', topic:'决策排序', difficulty:'L3', q:'企业准备建立 ESG 数据治理流程，第一项最合理的动作是什么？', options:['先设计宣传图','明确指标口径、数据来源、责任人与审批流程','直接复制同业报告数值','等外部核查时再补资料'], answer:1, focus:'掌握数据治理建立顺序。', concept:'先明确口径、来源、责任和控制流程，后续采集、复核、披露与审计才有一致基础。', trap:'先做呈现或等年末补资料，会让错误难以追溯。', steps:['定义指标和统计边界','指定数据来源与责任人','建立复核批准版本及留痕要求'], transfer:'系统上线后还应设置异常检查、权限与变更控制。' }
  ];

  titles.past37 = ['历届考题', '按年度与主题复习高频考点，由 AI 教练逐步引导。'];
  let pastIndex37 = 0;
  let pastSelected37 = null;
  let pastHint37 = 0;
  const safe37 = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const ensure37 = () => { state.past37 ||= { answers:{} }; state.past37.answers ||= {}; };
  const visible37 = () => pastQuestions37.filter(question => (!el('pastYear37').value || question.year === el('pastYear37').value) && (!el('pastTopic37').value || question.topic === el('pastTopic37').value));

  function renderStats37() {
    ensure37();
    const answers = Object.entries(state.past37.answers).map(([id, answer]) => ({ question:pastQuestions37.find(item => item.id === id), ...answer })).filter(item => item.question);
    const correct = answers.filter(answer => answer.correct).length;
    const wrongTopics = new Map();
    answers.filter(answer => !answer.correct).forEach(answer => wrongTopics.set(answer.question.topic, (wrongTopics.get(answer.question.topic) || 0) + 1));
    const weak = [...wrongTopics].sort((a,b) => b[1] - a[1])[0]?.[0] || '尚未发现';
    el('pastDone37').textContent = `${answers.length} / ${pastQuestions37.length}`;
    el('pastAccuracy37').textContent = `${answers.length ? Math.round(correct / answers.length * 100) : 0}%`;
    el('pastWeak37').textContent = answers.length ? weak : '尚未作答';
  }

  function renderList37() {
    ensure37();
    const rows = visible37();
    if (pastIndex37 >= rows.length) pastIndex37 = 0;
    el('pastList37').innerHTML = rows.map((question, index) => `<button class="past-item37 ${index === pastIndex37 ? 'active' : ''} ${state.past37.answers[question.id] ? 'done' : ''}" data-past-index37="${index}"><span>${safe37(question.year)} · ${safe37(question.difficulty)}</span><b>${safe37(question.topic)}</b><small>${safe37(question.id)}</small></button>`).join('') || '<div class="empty">没有符合筛选条件的题目。</div>';
    el('pastList37').querySelectorAll('[data-past-index37]').forEach(button => button.addEventListener('click', () => { pastIndex37 = Number(button.dataset.pastIndex37); pastSelected37 = null; pastHint37 = 0; renderList37(); renderCard37(); }));
  }

  function renderCard37() {
    ensure37();
    const rows = visible37();
    const question = rows[pastIndex37];
    if (!question) return el('pastCard37').innerHTML = '<div class="empty">请选择其他筛选条件。</div>';
    const saved = state.past37.answers[question.id];
    const answered = Boolean(saved);
    if (answered) pastSelected37 = saved.selected;
    const hintRows = question.steps.slice(0, pastHint37).map((step,index) => `<li><b>步骤 ${index+1}</b>${safe37(step)}</li>`).join('');
    el('pastCard37').innerHTML = `<div class="past-meta37"><span>${safe37(question.year)} 年度考点</span><b>${safe37(question.topic)} · ${safe37(question.difficulty)}</b></div><div class="ai-guide37"><span class="ai-avatar37">AI</span><div><strong>本题命题重点</strong><p>${safe37(question.focus)}</p>${hintRows ? `<ol>${hintRows}</ol>` : ''}${!answered && pastHint37 < question.steps.length ? '<button id="pastHint37">给我下一步提示</button>' : ''}</div></div><h2>${safe37(question.q)}</h2><div class="opts past-options37">${question.options.map((option,index) => `<button class="opt ${pastSelected37 === index ? 'chosen' : ''} ${answered && index === question.answer ? 'good' : ''} ${answered && pastSelected37 === index && index !== question.answer ? 'bad' : ''}" data-past-option37="${index}" ${answered ? 'disabled' : ''}>${String.fromCharCode(65+index)}. ${safe37(option)}</button>`).join('')}</div>${answered ? `<div class="ai-review37"><div class="ai-review-title37"><span class="ai-avatar37">AI</span><strong>${saved.correct ? '判断正确，抓到考点了' : '这题需要调整判断路径'}</strong></div><dl><div><dt>观念要点</dt><dd>${safe37(question.concept)}</dd></div><div><dt>常见陷阱</dt><dd>${safe37(question.trap)}</dd></div><div><dt>解题路径</dt><dd>${question.steps.map(safe37).join(' → ')}</dd></div><div><dt>迁移练习</dt><dd>${safe37(question.transfer)}</dd></div></dl></div>` : ''}<div class="qnav past-actions37"><small>第 ${pastIndex37+1} / ${rows.length} 题</small><div><button class="btn soft" id="pastPrev37">上一题</button> <button class="btn primary" id="pastSubmit37">${answered ? '下一题' : '提交给 AI 教练'}</button></div></div>`;
    el('pastHint37')?.addEventListener('click', () => { pastHint37++; renderCard37(); });
    el('pastCard37').querySelectorAll('[data-past-option37]').forEach(button => button.addEventListener('click', () => { pastSelected37 = Number(button.dataset.pastOption37); el('pastCard37').querySelectorAll('[data-past-option37]').forEach(option => option.classList.toggle('chosen', option === button)); }));
    el('pastPrev37').addEventListener('click', () => { pastIndex37 = (pastIndex37 - 1 + rows.length) % rows.length; pastSelected37 = null; pastHint37 = 0; renderList37(); renderCard37(); });
    el('pastSubmit37').addEventListener('click', () => {
      if (answered) { pastIndex37 = (pastIndex37 + 1) % rows.length; pastSelected37 = null; pastHint37 = 0; renderList37(); return renderCard37(); }
      if (pastSelected37 === null) return toast('请先选择答案');
      state.past37.answers[question.id] = { selected:pastSelected37, correct:pastSelected37 === question.answer, hints:pastHint37, at:new Date().toISOString() };
      save(); renderStats37(); renderList37(); renderCard37();
    });
  }

  function renderPast37() { ensure37(); renderStats37(); renderList37(); renderCard37(); }
  [...new Set(pastQuestions37.map(question => question.year))].forEach(year => el('pastYear37').insertAdjacentHTML('beforeend', `<option value="${safe37(year)}">${safe37(year)} 年</option>`));
  [...new Set(pastQuestions37.map(question => question.topic))].forEach(topic => el('pastTopic37').insertAdjacentHTML('beforeend', `<option value="${safe37(topic)}">${safe37(topic)}</option>`));
  ['pastYear37','pastTopic37'].forEach(id => el(id).addEventListener('change', () => { pastIndex37 = 0; pastSelected37 = null; pastHint37 = 0; renderPast37(); }));
  el('pastReset37').addEventListener('click', () => { if (!confirm('要清除目前账号在历届考题区的复习记录吗？')) return; state.past37 = { answers:{} }; save(); pastIndex37 = 0; pastSelected37 = null; pastHint37 = 0; renderPast37(); toast('历届考题进度已重置'); });

  const priorGo37 = go;
  go = function(id) { priorGo37(id); if (id === 'past37') renderPast37(); };
  const priorApplySessionPast37 = applySession31;
  applySession31 = async function(session) { await priorApplySessionPast37(session); ensure37(); renderPast37(); };
  renderPast37();
})();

