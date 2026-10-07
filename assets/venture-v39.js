/* System-ESG V3.9 positioning and competency layer. Data collection remains disabled. */
(() => {
  const $ = id => document.getElementById(id);
  const esc39 = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const domains39 = [
    ['碳管理',['chinaETS','ghgorg','scope','pcf','factor']],
    ['揭露准则',['esg','ifrs']],
    ['供应链',['mfg','scope','cbam']],
    ['治理与核查',['verify','esg']],
    ['政策法规',['chinaETS','cbam','esg']],
    ['实务应用',['mfg','verify','factor','pcf']]
  ];
  function competency39() {
    const attempts = state.attempts || [];
    return domains39.map(([label, modules]) => {
      const rows = attempts.filter(attempt => modules.includes(attempt.module_id));
      return { label, attempts:rows.length, score:rows.length ? Math.round(rows.filter(attempt => attempt.correct).length / rows.length * 100) : 0 };
    });
  }
  function recommendation39(rows) {
    const attempted = rows.filter(row => row.attempts);
    if (!attempted.length) return '先完成一次能力诊断，系统会建立个人能力基线。';
    const weakest = [...attempted].sort((a,b) => a.score - b.score || a.attempts - b.attempts)[0];
    return `目前优先提升「${weakest.label}」。建议先复习相关知识点，再完成 10 道实务情境题。`;
  }
  function renderCompetency39() {
    let panel = $('competency39');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'competency39';
      panel.className = 'card competency39';
      $('ability')?.prepend(panel);
    }
    const rows = competency39();
    panel.innerHTML = `<div class="head"><div><div class="k">个人能力模型</div><h3>六项制造业 ESG 实战能力</h3></div><span>依当前账号的实际作答更新</span></div><div class="competency-grid39">${rows.map(row => `<div><span>${esc39(row.label)}</span><b>${row.score}%</b><div class="bar"><i style="width:${row.score}%"></i></div><small>${row.attempts ? `${row.attempts} 次有效作答` : '尚未建立基线'}</small></div>`).join('')}</div><p class="recommendation39"><b>下一步：</b>${esc39(recommendation39(rows))}</p>`;
  }
  function installPositioning39() {
    document.title = 'System-ESG｜中国制造业 ESG 实战能力平台';
    const loginTitle = document.querySelector('.login-story35 h1');
    const loginText = document.querySelector('.login-story35 p');
    if (loginTitle) loginTitle.textContent = '中国制造业 ESG 实战能力平台';
    if (loginText) loginText.textContent = '从能力诊断、实务训练到人才能力证明，服务台资、外贸与供应链企业。';
    titles.dash = ['实战能力总览', '从能力诊断到实务训练，建立可验证的制造业 ESG 能力。'];
    titles.learn = ['个性化学习', '依能力弱点学习法规、标准与制造业工作知识。'];
    titles.practice = ['实务情境训练', '以碳盘查、披露、供应链与客户稽核情境训练判断能力。'];
    titles.wrong = ['错题诊断', '分析知识缺口并安排针对性回补。'];
    titles.ability = ['能力证明', '持续追踪六项实战能力与下一步学习建议。'];
    const hero = document.querySelector('#dash .hero');
    if (hero) hero.innerHTML = `<div><div class="k" style="color:#a8d8c8">V3.9 市场验证版</div><h2>中国制造业 ESG 实战能力与人才认证平台</h2><p>面向台资、外贸与供应链企业中的 ESG、碳管理、稽核及永续从业者。</p><button class="btn" style="margin-top:13px;background:#fff;color:#103b30" data-onclick="go('exam')">开始能力诊断</button></div><div class="big" id="heroProg">0%</div>`;
    const journey = document.createElement('section');
    journey.className = 'venture39 section';
    journey.innerHTML = `<div class="audience39"><span>主要使用者：ESG／碳管理／稽核从业者</span><span>购买者：人资／永续／培训负责人</span><span>决策者：企业管理层</span></div><div class="head"><div><div class="k">CORE MVP</div><h3>一条可验证的能力提升路径</h3></div><span>先验证效果，再扩充功能</span></div><div class="journey39"><button data-v39="exam"><i>01</i><b>能力诊断</b><small>建立起始基线</small></button><button data-v39="learn"><i>02</i><b>弱点学习</b><small>按知识缺口推荐</small></button><button data-v39="practice"><i>03</i><b>实务训练</b><small>企业情境题</small></button><button data-v39="wrong"><i>04</i><b>错题诊断</b><small>识别错误原因</small></button><button data-v39="ability"><i>05</i><b>能力提升</b><small>形成能力证明</small></button></div><div class="scenario-grid39"><article><b>碳盘查与 Scope 1/2/3</b><span>边界、数据、因子与证据链</span></article><article><b>CBAM 与客户要求</b><span>出口资料、申报与供应链协作</span></article><article><b>披露与稽核改善</b><span>GRI、ISSB、中国披露及现场缺失</span></article></div>`;
    hero?.insertAdjacentElement('afterend', journey);
    journey.querySelectorAll('[data-v39]').forEach(button => button.onclick = () => go(button.dataset.v39));
    const verified = GT.questions.filter(question => question.verified && question.review_status === 'approved').length;
    const sources = new Set(GT.sources.map(source => source.source_id)).size;
    const trust = document.createElement('section');
    trust.className = 'card trust39 section';
    trust.innerHTML = `<div><div class="k">ESG KNOWLEDGE VERSION CONTROL</div><h3>专业依据与版本治理</h3><p>知识点与核准题目记录来源、版本、生效日期、适用地区、引用条款及审核状态。</p></div><div class="trust-metrics39"><span><b>${sources}</b> 项来源</span><span><b>${verified}</b> 道核准题</span><span><b>CN／EU／INTL</b> 适用地区</span></div>`;
    journey.insertAdjacentElement('afterend', trust);
  }
  function reorderNavigation39() {
    const nav = document.querySelector('.nav');
    const order = ['dash','ability','learn','practice','wrong','past37','exam','feedback34'];
    const labels = {dash:'🏠 实战总览',ability:'🎯 能力诊断',learn:'📚 个性化学习',practice:'🧩 实务训练',wrong:'🔁 错题诊断',past37:'🗂️ 历届考题',exam:'⏱️ 模拟考试',feedback34:'💬 意见反馈'};
    order.forEach((id,index) => {
      const button = nav?.querySelector(`[data-view="${id}"]`);
      if (!button) return;
      button.innerHTML = labels[id];
      if (index === 5) button.classList.add('advanced39');
      nav.append(button);
    });
  }
  function installValidationPlan39() {
    const section = document.createElement('section');
    section.id = 'pilot39';
    section.className = 'card pilot39 section';
    section.innerHTML = `<div class="pilot-copy39"><div class="k">COMMERCIAL VALIDATION</div><h3>企业试点与人才能力分析</h3><p>商业优先顺序为 B2B 企业版，再验证 Pro 个人版。正式扩充前，以真实试用、访谈、询价及预购作为通过证据。</p><div class="tier39"><span>免费版<br><small>基础课程与有限题库</small></span><span>Pro 个人版<br><small>完整题库、诊断与学习路径</small></span><span class="focus">B2B 企业版<br><small>员工账号、任务、Dashboard 与人才报告</small></span></div></div><div><div class="k">PAYMENT VALIDATION GATE</div><h3>进入规模开发前必须取得</h3><ol><li>10–20 名目标从业者完成真实试用与访谈</li><li>记录学习动机、现行方法、痛点与替代工具</li><li>取得可接受价格、询价或预购证据</li><li>至少出现一笔真实付费，再扩大功能与题库</li></ol><button class="btn primary" id="pilotFeedback39" type="button">透过意见反馈登记试点意向</button><p><small>自动行为追踪与独立联络资料收集目前维持关闭。</small></p></div>`;
    $('dash').append(section);
    $('pilotFeedback39').onclick = () => go('feedback34');
  }
  function installAdminGate39() {
    const account = $('account');
    if (!account) return;
    const panel = document.createElement('section');
    panel.className = 'card section metrics-admin39';
    panel.innerHTML = `<div class="head"><div><div class="k">VENTURE VALIDATION</div><h3>产品验证 Gate</h3></div><span>Validation Stage</span></div><div class="metric-grid39"><article><span>目标访谈</span><b>10–20</b></article><article><span>真实询价</span><b>待验证</b></article><article><span>预购／付款</span><b>待验证</b></article><article><span>规模开发</span><b>未解锁</b></article></div><p>访客、完成率、留存、诊断使用率与付费转化的数据表已经建立；前端自动收集会在取得明确授权后启用。</p>`;
    account.append(panel);
  }
  installPositioning39();
  reorderNavigation39();
  installValidationPlan39();
  installAdminGate39();
  renderCompetency39();
  const goBase39 = go;
  go = function(id) { goBase39(id); if (id === 'ability') renderCompetency39(); };
  const finishExamBase39 = finishExam;
  finishExam = function() { finishExamBase39(); renderCompetency39(); };
})();
