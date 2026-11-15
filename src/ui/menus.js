// 《烬塔残响：第999次救赎》黑曜镌金主殿、人物选择选项卡、档案/整备多维选项卡与输入控制
let menuStage = 'home'; // 'home' | 'story' | 'endless'
let selectedEndlessCls = 'brawler';
let heroDossierTab = 'traits'; // 'traits' | 'combat'
let endlessPrepTab = 'diff';   // 'diff' | 'scene'
let moreStoryDifficulties = false;

const HERO_SHORT_NAMES = {
  allrounder: '零号·白衣',
  brawler: '烬羽',
  ranger: '艾丝特莉亚',
  engineer: '伽蓝',
  ghost: '青羽',
  multitasker: '日蚀圣女'
};

function _menuAssetUrl(relPath) {
  if (!relPath) return '';
  if (typeof SpireAssets !== 'undefined' && typeof SpireAssets.resolve === 'function') {
    return SpireAssets.resolve(relPath);
  }
  return relPath;
}

function setHeroDossierTab(tab) {
  heroDossierTab = tab === 'combat' ? 'combat' : 'traits';
  beep(470, 0.03, 'triangle', 0.025);
  initMenuUI();
}

function setEndlessPrepTab(tab) {
  endlessPrepTab = tab === 'scene' ? 'scene' : 'diff';
  beep(490, 0.035, 'triangle', 0.028);
  initMenuUI();
}

function _renderDiffButtons(containerId, descId) {
  const dt = document.getElementById(containerId);
  if (dt) {
    dt.innerHTML = '';
    DIFFS.forEach(d => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `diff-btn tone-${d.tone || 'gold'}${d.id === selectedDiff ? ' active' : ''}`;
      if (containerId === 'storyDiffTabs' && d.id > 2 && !moreStoryDifficulties && selectedDiff <= 2) b.classList.add('hidden');
      b.setAttribute('aria-pressed', String(d.id === selectedDiff));
      b.innerHTML = `
        <span class="diff-btn-top">
          <span class="diff-dot"></span>
          <span class="diff-code">${d.code || ('D' + d.id)}</span>
          <span class="diff-roman">${d.roman || ''}</span>
        </span>
        <span class="diff-name">${d.short || d.name}</span>`;
      b.onclick = () => { selectedDiff = d.id; beep(480, 0.04, 'triangle'); initMenuUI(); };
      dt.appendChild(b);
    });
  }
  const dd = document.getElementById(descId);
  const activeDiff = DIFFS[selectedDiff] || DIFFS[1] || DIFFS[0];
  if (dd && activeDiff) {
    dd.innerHTML = `<span class="desc-title">${activeDiff.badge} · ${activeDiff.name}</span><span class="desc-body">${activeDiff.desc}</span>`;
  }
}

let _outfitModalNextStage = '';

function _buildZeroOutfitStripHtml(compact) {
  if (typeof ZERO_OUTFITS === 'undefined') return '';
  const curId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
  const ids = ['witch', 'crimson', 'astral', 'default'];
  const btns = ids.map(id => {
    const o = ZERO_OUTFITS[id];
    if (!o) return '';
    const act = id === curId ? ' active' : '';
    return `<button type="button" class="zero-outfit-pill${act}" data-outfit="${id}" onclick="selectZeroOutfitFromUI('${id}')">${o.shortName}</button>`;
  }).join('');
  const zoomBtn = compact ? '' : `<button type="button" class="zero-outfit-pill preview-btn" onclick="openZeroOutfitModal()" title="打开全尺寸三套战装预览">✦ 换装鉴赏</button>`;
  return `<div class="zero-outfit-strip" role="group" aria-label="主角战装切换">${btns}${zoomBtn}</div>`;
}

function syncZeroOutfitUI() {
  if (typeof ZERO_OUTFITS === 'undefined') return;
  const curId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
  const cur = ZERO_OUTFITS[curId] || ZERO_OUTFITS.witch;
  const portUrl = _menuAssetUrl(cur.portrait);

  // 1) Update Story Hero Showcase IN-PLACE so .prep-zero-portrait DOM node identity never changes!
  const storyBox = document.getElementById('storyHeroShowcase');
  if (storyBox && storyBox.dataset.heroId) {
    const imgEl = storyBox.querySelector('.prep-zero-portrait');
    if (imgEl && imgEl.getAttribute('data-outfit-id') !== curId) {
      imgEl.setAttribute('data-outfit-id', curId);
      imgEl.src = portUrl;
    }
    const sufEl = storyBox.querySelector('.prep-outfit-suffix');
    if (sufEl) sufEl.textContent = cur.captionSuffix || ' · 白衣';
    const pills = storyBox.querySelectorAll('.zero-outfit-pill[data-outfit]');
    for (let i = 0; i < pills.length; i++) {
      pills[i].classList.toggle('active', pills[i].getAttribute('data-outfit') === curId);
    }
  }

  // 2) Update Outfit Modal cards if open
  const grid = document.getElementById('outfitModalGrid');
  if (grid && grid.children.length > 0) {
    const cards = grid.querySelectorAll('.outfit-pick-card');
    for (let i = 0; i < cards.length; i++) {
      const cid = cards[i].getAttribute('data-outfit');
      const isSel = cid === curId;
      cards[i].classList.toggle('active', isSel);
      cards[i].setAttribute('aria-checked', isSel ? 'true' : 'false');
      const badge = cards[i].querySelector('.outfit-pick-state');
      if (badge) badge.textContent = isSel ? '◆ 当前穿戴' : '点击换装';
    }
  }
  const defBtn = document.getElementById('outfitDefaultToggle');
  if (defBtn) {
    defBtn.classList.toggle('gold', curId === 'default');
    defBtn.classList.toggle('active', curId === 'default');
    defBtn.textContent = curId === 'default' ? '◆ 当前穿戴：初始守誓白衣' : '切换为经典形象：初始守誓白衣';
  }
  const cfmBtn = document.getElementById('outfitConfirmBtn');
  if (cfmBtn) {
    cfmBtn.textContent = _outfitModalNextStage === 'story'
      ? `◆ 身披「${cur.shortName}」· 提灯启程 →`
      : `◆ 确认穿戴「${cur.shortName}」`;
  }

  // 3) Update Home Footer button label & Endless Zero showcase if active
  const homeBtn = document.getElementById('homeOutfitBtn');
  if (homeBtn) {
    homeBtn.innerHTML = `<span aria-hidden="true">✦</span> 战装 · ${cur.shortName}`;
  }
  if (typeof menuStage !== 'undefined' && menuStage === 'endless') {
    const cg = document.getElementById('classGrid');
    if (cg) {
      const zeroAvatarImg = cg.querySelector('.roster-avatar[data-cls="allrounder"] .roster-avatar-img');
      if (zeroAvatarImg) zeroAvatarImg.src = portUrl;
    }
    if (selectedEndlessCls === 'allrounder') {
      const zeroObj = CLASSES.find(c => c.id === 'allrounder');
      if (zeroObj) _renderHeroSpotlight('endlessHeroShowcase', zeroObj, false);
    }
  }
}

function selectZeroOutfitFromUI(outfitId) {
  if (typeof setSelectedZeroOutfit === 'function') {
    setSelectedZeroOutfit(outfitId, true);
    beep(560, 0.04, 'triangle', 0.035);
  }
}

function openZeroOutfitModal(opts) {
  const options = opts || {};
  _outfitModalNextStage = options.nextStage || '';
  const modal = document.getElementById('outfitModal');
  const grid = document.getElementById('outfitModalGrid');
  if (!modal || !grid || typeof ZERO_OUTFITS === 'undefined') {
    if (_outfitModalNextStage) openMenuStage(_outfitModalNextStage);
    return;
  }
  const curId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
  grid.innerHTML = ZERO_PRIMARY_OUTFIT_IDS.map(id => {
    const o = ZERO_OUTFITS[id];
    const isSel = id === curId;
    const pUrl = _menuAssetUrl(o.portrait);
    const cUrl = _menuAssetUrl(o.chibi);
    return `
      <button type="button" class="outfit-pick-card${isSel ? ' active' : ''}" role="radio" aria-checked="${isSel ? 'true' : 'false'}" data-outfit="${id}" style="--outfit-accent:${o.accent}" onclick="selectZeroOutfitFromUI('${id}')">
        <div class="outfit-pick-art">
          <img src="${pUrl}" alt="${o.name}" class="outfit-pick-portrait" decoding="async">
          <div class="outfit-pick-chibi-box" title="实机四帧动作形态">
            <img src="${cUrl}" alt="${o.shortName} 实机精灵" class="outfit-pick-chibi" decoding="async">
            <span>实机形态</span>
          </div>
          <span class="outfit-pick-code">${o.code}</span>
        </div>
        <div class="outfit-pick-meta">
          <div class="outfit-pick-top">
            <span class="outfit-pick-badge">${o.badge}</span>
            <span class="outfit-pick-state">${isSel ? '◆ 当前穿戴' : '点击换装'}</span>
          </div>
          <div class="outfit-pick-name">${o.name}</div>
          <p class="outfit-pick-desc">${o.desc}</p>
        </div>
      </button>`;
  }).join('');
  modal.classList.remove('hidden');
  syncZeroOutfitUI();
  beep(500, 0.045, 'triangle', 0.035);
}

function closeZeroOutfitModal() {
  const modal = document.getElementById('outfitModal');
  if (modal) modal.classList.add('hidden');
  _outfitModalNextStage = '';
}

function confirmZeroOutfitModal() {
  const curId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
  if (typeof setSelectedZeroOutfit === 'function') setSelectedZeroOutfit(curId, true);
  const next = _outfitModalNextStage;
  closeZeroOutfitModal();
  if (next) openMenuStage(next);
}

function handleStoryPortalClick() {
  if (typeof bootIntegrityPassed !== 'undefined' && !bootIntegrityPassed) {
    if (typeof SpireBootGate !== 'undefined' && SpireBootGate) SpireBootGate.runFullCheck('user_guard');
    return;
  }
  if (typeof hasChosenZeroOutfit === 'function' && !hasChosenZeroOutfit()) {
    openZeroOutfitModal({ nextStage: 'story' });
    return;
  }
  openMenuStage('story');
}

function _renderHeroSpotlight(containerId, clsObj, isStoryLocked) {
  const box = document.getElementById(containerId);
  if (!box || !clsObj) return;
  const isZero = clsObj.id === 'allrounder' && typeof getActiveZeroOutfit === 'function';
  const activeOutfit = isZero ? getActiveZeroOutfit() : null;
  const portUrl = _menuAssetUrl(activeOutfit ? activeOutfit.portrait : clsObj.portrait);
  if (isStoryLocked) {
    // The story hero never changes. Keep the decoded portrait when only the
    // difficulty or outfit selection changes instead of replacing the image element.
    if (box.dataset.heroId === clsObj.id) {
      syncZeroOutfitUI();
      return;
    }
    box.dataset.heroId = clsObj.id;
    const outfitId = activeOutfit ? activeOutfit.id : 'default';
    const suf = activeOutfit ? activeOutfit.captionSuffix : ' · 白衣';
    box.innerHTML = `<img src="${portUrl}" data-outfit-id="${outfitId}" alt="零，白衣提灯少女" class="prep-zero-portrait" decoding="async"><div class="prep-hero-caption"><span>提灯人</span><h2>零<span class="prep-outfit-suffix">${suf}</span></h2><p>她忘记了自己的名字。<br>手中的灯，却仍为某个人亮着。</p>${_buildZeroOutfitStripHtml(false)}</div>`;
    return;
  }
  const chibiUrl = _menuAssetUrl(activeOutfit ? activeOutfit.chibi : clsObj.chibi);
  const roleTag = isStoryLocked ? '唯一主角 · 提灯人' : (activeOutfit ? activeOutfit.badge : clsObj.tag);
  const traitsArr = Array.isArray(clsObj.traits) ? clsObj.traits : [];
  const negTxt = clsObj.negTrait || '';
  const bioTxt = isStoryLocked
    ? '第九百九十九次于塔底石棺苏醒的白衣提灯人。唯有亲自执灯登临十六层四幕高塔，方能依次唤醒并救赎昔日守誓挚友。'
    : (clsObj.bio || '');
  const weaponsArr = Array.isArray(clsObj.weaponsList) ? clsObj.weaponsList : [clsObj.loadout || ''];
  const isTraitsTab = heroDossierTab !== 'combat';

  const traitChipsHtml = traitsArr.map(t => `<span class="trait-chip pos">${t}</span>`).join('') +
    (negTxt ? `<span class="trait-chip neg">${negTxt}</span>` : '');
  const weaponChipsHtml = weaponsArr.map(w => `<span class="weapon-spec-pill">◆ ${w}</span>`).join('');

  box.innerHTML = `
    <div class="spotlight-art-col">
      <img src="${portUrl}" alt="${clsObj.name}" class="spotlight-portrait" loading="eager" decoding="async">
      <div class="spotlight-art-shade"></div>
      <div class="spotlight-chibi-frame" title="实机战斗精灵形态">
        <img src="${chibiUrl}" alt="${clsObj.name} 实机精灵" class="spotlight-chibi" loading="eager" decoding="async">
        <span class="chibi-cap">实机形态</span>
      </div>
    </div>
    <div class="spotlight-info-col">
      <div class="spotlight-header-block">
        <div class="spotlight-role-row">
          <span class="spotlight-en">${clsObj.enTitle || clsObj.code || ''}</span>
          <span class="spotlight-tag">${roleTag}</span>
        </div>
        <div class="spotlight-name">${clsObj.name}</div>
      </div>
      ${isZero ? _buildZeroOutfitStripHtml(true) : ''}

      <div class="dossier-tabs" role="tablist" aria-label="角色档案选项卡">
        <button type="button" class="dossier-tab${isTraitsTab ? ' active' : ''}" onclick="setHeroDossierTab('traits')">契约特质</button>
        <button type="button" class="dossier-tab${!isTraitsTab ? ' active' : ''}" onclick="setHeroDossierTab('combat')">兵装与瞬步</button>
      </div>

      ${isTraitsTab ? `
        <div class="dossier-pane">
          <div class="trait-chip-grid">${traitChipsHtml}</div>
          <p class="spotlight-bio">${bioTxt}</p>
          <div class="spotlight-quick-strip">
            <span class="sq-item"><b>初始兵装</b> ${clsObj.loadout}</span>
            ${clsObj.dashName ? `<span class="sq-item"><b>主动战技</b> ${clsObj.dashName}</span>` : ''}
          </div>
        </div>
      ` : `
        <div class="dossier-pane">
          <div class="combat-spec-box">
            <div class="cs-label">STARTING ARMAMENTS  ·  初始随身兵装</div>
            <div class="weapon-spec-row">${weaponChipsHtml}</div>
          </div>
          ${clsObj.dashName ? `
          <div class="combat-spec-box dash-box">
            <div class="cs-label">SOUL DASH [SPACE / 右键] & AWAKENING [E]  ·  ${clsObj.dashName}</div>
            <div class="cs-desc">${clsObj.dashDesc || ''} · 按 [E] 随主修武器流派释放专属觉醒奥义（霹雳一闪残心/剑雨/黑洞/镇岳臼炮）</div>
          </div>` : ''}
        </div>
      `}
    </div>`;
}

function openMenuStage(stage) {
  if ((stage === 'story' || stage === 'endless') && typeof bootIntegrityPassed !== 'undefined' && !bootIntegrityPassed) {
    if (typeof SpireBootGate !== 'undefined' && SpireBootGate) SpireBootGate.runFullCheck('user_guard');
    return;
  }
  menuStage = (stage === 'story' || stage === 'endless') ? stage : 'home';
  const sm = document.getElementById('startMenu');
  if (sm && sm.setAttribute) sm.setAttribute('data-stage', menuStage);
  const hv = document.getElementById('menuHomeView');
  const sv = document.getElementById('menuStoryView');
  const ev = document.getElementById('menuEndlessView');
  if (hv) hv.classList.toggle('hidden', menuStage !== 'home');
  if (sv) sv.classList.toggle('hidden', menuStage !== 'story');
  if (ev) ev.classList.toggle('hidden', menuStage !== 'endless');
  const keyArtEl = document.getElementById('heroKeyArtBg');
  if (keyArtEl) {
    const bgRel = menuStage === 'endless' ? 'assets/spire/scene_1_vista.jpg' : 'assets/spire/v2/title-clean.png';
    keyArtEl.style.backgroundImage = `url('${_menuAssetUrl(bgRel)}')`;
  }
  beep(menuStage === 'home' ? 420 : 520, 0.04, 'triangle', 0.035);
  initMenuUI();
}

function selectEndlessHero(clsId) {
  if (!CLASSES.some(c => c.id === clsId)) return;
  selectedEndlessCls = clsId;
  beep(500, 0.035, 'triangle', 0.03);
  initMenuUI();
}

function startStoryMode() {
  if (typeof SpireSave !== 'undefined' && SpireSave.load() && typeof confirmSpireNewRun === 'function') {
    confirmSpireNewRun();
    return;
  }
  selectedScene = 'random';
  startGame('allrounder', { mode: 'story' });
}

function toggleMoreStoryDifficulties() {
  moreStoryDifficulties = !moreStoryDifficulties;
  const b = document.getElementById('moreDifficultyBtn');
  if (b) { b.setAttribute('aria-expanded', String(moreStoryDifficulties)); b.textContent = moreStoryDifficulties ? '收起难度 −' : '更多难度 ＋'; }
  _renderDiffButtons('storyDiffTabs', 'storyDiffDesc');
}

function startEndlessMode(clsId) {
  const target = (clsId && CLASSES.some(c => c.id === clsId)) ? clsId : (selectedEndlessCls || 'brawler');
  startGame(target, { mode: 'endless' });
}

function initMenuUI() {
  refreshUIPrefControls();
  const vp = document.getElementById('startVersionPill');
  if (vp && typeof APP_VERSION !== 'undefined') {
    vp.textContent = `ECHOES OF THE ASHEN SPIRE  ·  ${APP_VERSION}`;
  }
  const appIconEl = document.getElementById('brandAppIcon');
  if (appIconEl) appIconEl.src = _menuAssetUrl('assets/spire/app_icon.jpg');
  const keyArtEl = document.getElementById('heroKeyArtBg');
  if (keyArtEl) {
    const bgRel = menuStage === 'endless' ? 'assets/spire/scene_1_vista.jpg' : 'assets/spire/v2/title-clean.png';
    keyArtEl.style.backgroundImage = `url('${_menuAssetUrl(bgRel)}')`;
  }

  if (typeof SpireAudio !== 'undefined') SpireAudio.refreshButtons();

  if (typeof refreshSpireHome === 'function') refreshSpireHome();
  // Build only the visible preparation screen. Opening the title/story menu
  // must not load six hidden portraits and rebuild every endless-mode card.
  if (menuStage === 'home') return;
  if (menuStage === 'story') {
    _renderDiffButtons('storyDiffTabs', 'storyDiffDesc');
    const zeroObj = CLASSES.find(c => c.id === 'allrounder') || CLASSES[0];
    _renderHeroSpotlight('storyHeroShowcase', zeroObj, true);
    return;
  }
  _renderDiffButtons('diffTabs', 'diffDesc');

  // 无尽模式：试炼整备双栏选项卡状态同步（轮回厄度 vs 起始层域）
  const diffTabBtn = document.getElementById('prepTabDiffBtn');
  const sceneTabBtn = document.getElementById('prepTabSceneBtn');
  const diffPane = document.getElementById('endlessDiffPane');
  const scenePane = document.getElementById('endlessScenePane');
  if (diffTabBtn) diffTabBtn.classList.toggle('active', endlessPrepTab !== 'scene');
  if (sceneTabBtn) sceneTabBtn.classList.toggle('active', endlessPrepTab === 'scene');
  if (diffPane) diffPane.classList.toggle('hidden', endlessPrepTab === 'scene');
  if (scenePane) scenePane.classList.toggle('hidden', endlessPrepTab !== 'scene');

  const activeDiffObj = DIFFS[selectedDiff] || DIFFS[1] || DIFFS[0];
  const prepDiffTag = document.getElementById('prepDiffSummaryTag');
  if (prepDiffTag && activeDiffObj) prepDiffTag.textContent = activeDiffObj.badge;

  // 无尽模式：层域生态 1 + 2×2 原画选项卡
  const sceneOpts = [
    { id: 'random', code: 'ALL ACTS', name: '四幕轮转', sub: '循序踏入四大层域生态演进', vistaImg: 'assets/spire/logo_banner.jpg', wide: true },
    ...SCENES.map((s, idx) => ({
      id: s.id,
      code: `ACT ${['I', 'II', 'III', 'IV'][idx] || (idx + 1)}`,
      name: s.name.replace(/^.+·/, ''),
      sub: s.terrainSummary ? s.terrainSummary.replace(/^[^\s]+\s*/, '') : s.bossHint,
      vistaImg: s.vistaImg,
      wide: false
    }))
  ];
  const activeSceneOpt = sceneOpts.find(x => x.id === selectedScene) || sceneOpts[0];
  const prepSceneTag = document.getElementById('prepSceneSummaryTag');
  if (prepSceneTag && activeSceneOpt) prepSceneTag.textContent = activeSceneOpt.name;

  const st = document.getElementById('sceneTabs');
  if (st) {
    st.innerHTML = '';
    sceneOpts.forEach(sc => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `scene-btn${sc.wide ? ' wide' : ''}${sc.id === selectedScene ? ' active' : ''}`;
      const bgUrl = _menuAssetUrl(sc.vistaImg);
      b.innerHTML = `
        <span class="scene-btn-bg" style="background-image:url('${bgUrl}')"></span>
        <span class="scene-btn-txt">
          <span class="scene-code">${sc.code}</span>
          <span class="scene-name">${sc.name}</span>
        </span>`;
      b.onclick = () => {
        selectedScene = sc.id;
        if (sc.id !== 'random') {
          curScene = SCENES.find(x => x.id === sc.id) || SCENES[0];
          sceneSeed = (1009 + sc.id.charCodeAt(0) * 271) >>> 0;
          if (bootReady) syncArenaAndZoom(true);
          if (typeof SpireAudio !== 'undefined') SpireAudio.syncScene(sc.id);
        } else {
          curScene = SCENES[0];
          sceneSeed = 1024;
          if (bootReady) syncArenaAndZoom(true);
          if (typeof SpireAudio !== 'undefined') SpireAudio.syncScene('foundry');
        }
        beep(510, 0.04, 'triangle');
        initMenuUI();
      };
      st.appendChild(b);
    });
  }
  const sd = document.getElementById('sceneDesc');
  if (sd && activeSceneOpt) {
    sd.innerHTML = `<span class="desc-title">${activeSceneOpt.code} · ${activeSceneOpt.name}</span><span class="desc-body">${activeSceneOpt.sub}</span>`;
  }

  // 无尽模式：6 位誓约者高定人物选择选项卡 + 角色档案舞台
  const cg = document.getElementById('classGrid');
  if (cg) {
    cg.innerHTML = '';
    CLASSES.forEach((c, idx) => {
      const isAct = c.id === selectedEndlessCls;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
      btn.setAttribute('data-cls', c.id);
      btn.className = 'roster-avatar' + (isAct ? ' active' : '');
      const portUrl = _menuAssetUrl((c.id === 'allrounder' && typeof getActiveZeroOutfit === 'function') ? getActiveZeroOutfit().portrait : c.portrait);
      const shortLbl = HERO_SHORT_NAMES[c.id] || c.name;
      btn.innerHTML = `
        <span class="ctab-head">
          <span class="ctab-code">${c.code || ('0' + (idx + 1))}</span>
          <span class="ctab-role">${c.shortRole || c.tag}</span>
        </span>
        <span class="ctab-port-wrap">
          <img src="${portUrl}" alt="${c.name}" class="roster-avatar-img" loading="eager" decoding="async">
          <span class="ctab-shade"></span>
        </span>
        <span class="roster-avatar-name"><span class="ctab-gem">◆</span>${shortLbl}</span>`;
      btn.onclick = () => selectEndlessHero(c.id);
      cg.appendChild(btn);
    });
  }
  const activeEndlessHero = CLASSES.find(c => c.id === selectedEndlessCls) || CLASSES[1] || CLASSES[0];
  _renderHeroSpotlight('endlessHeroShowcase', activeEndlessHero, false);
  const shortHeroName = activeEndlessHero ? (HERO_SHORT_NAMES[activeEndlessHero.id] || activeEndlessHero.name) : '烬羽';
  const sumLine = document.getElementById('endlessSummaryLine');
  if (sumLine && activeDiffObj && activeSceneOpt) {
    sumLine.textContent = `出击契约：${shortHeroName}  ·  ${activeDiffObj.badge}  ·  ${activeSceneOpt.name}`;
  }
  const goBtn = document.getElementById('startEndlessBtn');
  if (goBtn) {
    goBtn.textContent = `◆  以「${shortHeroName}」开启无尽试炼  →`;
  }
}
initMenuUI();

const keys = {};
window.addEventListener('keydown', e => {
  const k = (e && typeof e.key === 'string') ? e.key.toLowerCase() : '';
  if (!k) return;
  if (typeof SpireDirector !== 'undefined' && SpireDirector.isBlockingGameplay()) return;
  const presentation = document.getElementById('presentationModal');
  if (presentation && !presentation.classList.contains('hidden')) return;
  if (k === 'escape') {
    const om = document.getElementById('outfitModal');
    if (om && !om.classList.contains('hidden')) { if (e.preventDefault) e.preventDefault(); closeZeroOutfitModal(); return; }
    const cm = document.getElementById('codexModal');
    if (cm && !cm.classList.contains('hidden')) { if (e.preventDefault) e.preventDefault(); closeCodex(); return; }
    const clm = document.getElementById('changelogModal');
    if (clm && !clm.classList.contains('hidden')) { if (e.preventDefault) e.preventDefault(); closeChangelogModal(); return; }
    const lm = document.getElementById('logModal');
    if (lm && !lm.classList.contains('hidden')) { if (e.preventDefault) e.preventDefault(); closeLogModal(); return; }
    if (state === 'menu' && menuStage !== 'home') { if (e.preventDefault) e.preventDefault(); openMenuStage('home'); return; }
  }
  // 无尽模式人物选择选项卡支持左右方向键与数字键 1-6 快速切换角色
  if (state === 'menu' && menuStage === 'endless') {
    const cm = document.getElementById('codexModal');
    const modalOpen = cm && !cm.classList.contains('hidden');
    if (!modalOpen) {
      if (k === 'arrowleft' || k === 'arrowright') {
        const curIdx = Math.max(0, CLASSES.findIndex(c => c.id === selectedEndlessCls));
        const nextIdx = (curIdx + (k === 'arrowright' ? 1 : -1) + CLASSES.length) % CLASSES.length;
        selectEndlessHero(CLASSES[nextIdx].id);
        return;
      }
      if (k >= '1' && k <= '6') {
        const idx = parseInt(k, 10) - 1;
        if (CLASSES[idx]) selectEndlessHero(CLASSES[idx].id);
        return;
      }
    }
  }
  if (k === 'enter' && bossCutscene) {
    const fadeDur = bossCutscene.fadeDur || 0.85;
    if ((bossCutscene.maxT - bossCutscene.t) > 0.60 && bossCutscene.t > fadeDur) {
      bossCutscene.t = fadeDur;
    }
    return;
  }
  if (k === 'escape' && typeof isAudioModalOpen === 'function' && isAudioModalOpen()) {
    if (e.preventDefault) e.preventDefault();
    closeAudioModal();
    return;
  }
  if (k === 'escape') {
    if (state === 'wave' || state === 'paused') { if (e.preventDefault) e.preventDefault(); togglePause(); return; }
  } else if (k === ' ' && state === 'paused') {
    if (e.preventDefault) e.preventDefault();
    resumeGame();
    return;
  }
  if ((k === ' ' || k === 'shift') && state === 'wave' && player && !bossCutscene &&
      !(typeof SpireDirector !== 'undefined' && SpireDirector && SpireDirector.isBlockingGameplay())) {
    if (e.preventDefault) e.preventDefault();
    if (typeof triggerSoulDash === 'function') triggerSoulDash();
    return;
  }
  if (k === 'e' && state === 'wave' && player && !bossCutscene &&
      !(typeof SpireDirector !== 'undefined' && SpireDirector && SpireDirector.isBlockingGameplay())) {
    if (e.preventDefault) e.preventDefault();
    if (typeof triggerUltimateSkill === 'function') triggerUltimateSkill();
    return;
  }
  keys[k] = true;
});
window.addEventListener('keyup', e => {
  const k = (e && typeof e.key === 'string') ? e.key.toLowerCase() : '';
  if (k) keys[k] = false;
});
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; resetJoy(); });
if (document.addEventListener) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'wave') pauseGame();
  });
}

// 手机端双指独立解耦操控：专属 Touch.identifier 摇杆锁定 + 0ms 瞬发瞬步键 + 右手辅助轻点瞬步 + 防误触捏合缩放
const joy = {
  id: null, ox: 0, oy: 0, cx: 0, cy: 0, dx: 0, dy: 0, mag: 0,
  active: false, lockedMove: false, maxR: 56,
  lastDx: 0, lastDy: 0, lastAt: 0
};
let pinchDist = 0, pinchStartDist = 0, pinching = false, confirmSellIdx = -1;
let _lastTouchDashAt = 0;
let _auxDashTap = null;
let _dashBtnTouch = null;
let _lastTouchUltAt = 0;

function resetJoy() {
  joy.id = null; joy.active = false; joy.lockedMove = false;
  joy.dx = 0; joy.dy = 0; joy.mag = 0;
  pinchDist = 0; pinchStartDist = 0; pinching = false;
  _auxDashTap = null; _dashBtnTouch = null;
  const dtBtn = typeof document !== 'undefined' && document.getElementById ? document.getElementById('dashTouchBtn') : null;
  if (dtBtn && dtBtn.classList) dtBtn.classList.remove('is-pressed');
  const utBtn = typeof document !== 'undefined' && document.getElementById ? document.getElementById('ultTouchBtn') : null;
  if (utBtn && utBtn.classList) utBtn.classList.remove('is-pressed');
}

function handleDashTouchClick(btn) {
  if (btn && typeof btn.blur === 'function') btn.blur();
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (now - _lastTouchDashAt < 450) return false;
  return typeof triggerSoulDash === 'function' ? triggerSoulDash() : false;
}

function handleUltTouchClick(btn) {
  if (btn && typeof btn.blur === 'function') btn.blur();
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (now - _lastTouchUltAt < 450) return false;
  return typeof triggerUltimateSkill === 'function' ? triggerUltimateSkill() : false;
}

if (window.addEventListener) {
  window.addEventListener('touchstart', () => {
    if (!isTouch) {
      isTouch = true;
      if (uiPref === 'auto' && uiMode === 'desktop' && typeof bootReady !== 'undefined' && bootReady) resize();
    }
  }, { passive: true });
}

if (cv.addEventListener) {
  const canvasTouches = list => Array.from(list || []).filter(t => !t.target || t.target === cv);
  const canTouchBattle = () => state === 'wave' && !bossCutscene &&
    !(typeof SpireDirector !== 'undefined' && SpireDirector.isBlockingGameplay());
  const nowMs = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  const adoptTouchAsJoy = t => {
    if (!t) return;
    joy.id = t.identifier;
    joy.ox = joy.cx = t.clientX;
    joy.oy = joy.cy = t.clientY;
    joy.dx = 0; joy.dy = 0; joy.mag = 0;
    joy.active = true;
    joy.lockedMove = false;
  };

  const updateJoyFromTouch = t => {
    const rx = t.clientX - joy.ox, ry = t.clientY - joy.oy;
    const dist = Math.hypot(rx, ry);
    const clamped = Math.min(joy.maxR, dist);
    const ang = Math.atan2(ry, rx);
    joy.cx = joy.ox + Math.cos(ang) * clamped;
    joy.cy = joy.oy + Math.sin(ang) * clamped;
    if (dist > joy.maxR * 1.35) {
      joy.ox += (t.clientX - joy.cx) * 0.45;
      joy.oy += (t.clientY - joy.cy) * 0.45;
    }
    if (dist > 6) {
      joy.dx = rx / dist;
      joy.dy = ry / dist;
      joy.mag = Math.min(1, dist / (joy.maxR * 0.75));
      if (dist > 10) joy.lockedMove = true;
      if (joy.mag > 0.10) {
        joy.lastDx = joy.dx;
        joy.lastDy = joy.dy;
        joy.lastAt = nowMs();
      }
    } else {
      joy.dx = 0; joy.dy = 0; joy.mag = 0;
    }
  };

  const isNearDashTouchBtn = (cx, cy) => {
    const btn = typeof document !== 'undefined' && document.getElementById ? document.getElementById('dashTouchBtn') : null;
    if (!btn || typeof btn.getBoundingClientRect !== 'function') return false;
    const r = btn.getBoundingClientRect();
    if (!r || r.width < 10 || r.height < 10) return false;
    const bx = r.left + r.width * 0.5, by = r.top + r.height * 0.5;
    return Math.hypot(cx - bx, cy - by) <= Math.max(88, r.width * 1.25);
  };

  const dashBtnEl = typeof document !== 'undefined' && document.getElementById ? document.getElementById('dashTouchBtn') : null;
  if (dashBtnEl && dashBtnEl.addEventListener) {
    dashBtnEl.addEventListener('touchstart', e => {
      isTouch = true;
      if (!canTouchBattle()) return;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      _lastTouchDashAt = nowMs();
      if (dashBtnEl.classList) dashBtnEl.classList.add('is-pressed');
      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || null;
      if (t && !joy.active) {
        _dashBtnTouch = { id: t.identifier, ox: t.clientX, oy: t.clientY, handedOff: false };
      }
      if (typeof triggerSoulDash === 'function') triggerSoulDash();
    }, { passive: false });

    dashBtnEl.addEventListener('touchmove', e => {
      if (!canTouchBattle()) return;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      if (!_dashBtnTouch || !e.touches) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === _dashBtnTouch.id) {
          if (!_dashBtnTouch.handedOff && !joy.active && Math.hypot(t.clientX - _dashBtnTouch.ox, t.clientY - _dashBtnTouch.oy) > 10) {
            _dashBtnTouch.handedOff = true;
            joy.id = t.identifier;
            joy.ox = _dashBtnTouch.ox;
            joy.oy = _dashBtnTouch.oy;
            joy.cx = t.clientX;
            joy.cy = t.clientY;
            joy.active = true;
            joy.lockedMove = true;
            if (dashBtnEl.classList) dashBtnEl.classList.remove('is-pressed');
          }
          if (joy.active && joy.id === t.identifier) {
            updateJoyFromTouch(t);
          }
          break;
        }
      }
    }, { passive: false });

    const endDashBtnTouch = e => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (dashBtnEl.classList) dashBtnEl.classList.remove('is-pressed');
      if (_dashBtnTouch) {
        let stillOnScreen = false;
        const allT = (e && e.touches) ? e.touches : [];
        for (let i = 0; i < allT.length; i++) {
          if (allT[i].identifier === _dashBtnTouch.id) { stillOnScreen = true; break; }
        }
        if (!stillOnScreen) {
          if (joy.active && joy.id === _dashBtnTouch.id) {
            joy.id = null; joy.active = false; joy.lockedMove = false;
            joy.dx = 0; joy.dy = 0; joy.mag = 0;
          }
          _dashBtnTouch = null;
        }
      }
    };
    dashBtnEl.addEventListener('touchend', endDashBtnTouch, { passive: true });
    dashBtnEl.addEventListener('touchcancel', endDashBtnTouch, { passive: true });
  }

  const ultBtnEl = typeof document !== 'undefined' && document.getElementById ? document.getElementById('ultTouchBtn') : null;
  if (ultBtnEl && ultBtnEl.addEventListener) {
    ultBtnEl.addEventListener('touchstart', e => {
      isTouch = true;
      if (!canTouchBattle()) return;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      _lastTouchUltAt = nowMs();
      if (ultBtnEl.classList) ultBtnEl.classList.add('is-pressed');
      if (typeof triggerUltimateSkill === 'function') triggerUltimateSkill();
    }, { passive: false });
    const endUltBtnTouch = e => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (ultBtnEl.classList) ultBtnEl.classList.remove('is-pressed');
    };
    ultBtnEl.addEventListener('touchend', endUltBtnTouch, { passive: true });
    ultBtnEl.addEventListener('touchcancel', endUltBtnTouch, { passive: true });
  }

  cv.addEventListener('mousedown', e => {
    if (bossCutscene && bossCutscene._skipRect) {
      const fadeDur = bossCutscene.fadeDur || 0.85;
      const r = bossCutscene._skipRect;
      const cx = e && typeof e.clientX === 'number' ? e.clientX : -1;
      const cy = e && typeof e.clientY === 'number' ? e.clientY : -1;
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h && bossCutscene.t > fadeDur) {
        bossCutscene.t = fadeDur;
      }
    }
  });
  cv.addEventListener('contextmenu', e => {
    if (state === 'wave') {
      if (e.preventDefault) e.preventDefault();
      if (player && !bossCutscene && !(typeof SpireDirector !== 'undefined' && SpireDirector && SpireDirector.isBlockingGameplay()) && typeof triggerSoulDash === 'function') {
        triggerSoulDash();
      }
    }
  });
  cv.addEventListener('touchstart', e => {
    isTouch = true;
    if (bossCutscene && bossCutscene._skipRect && e.changedTouches && e.changedTouches.length > 0) {
      const fadeDur = bossCutscene.fadeDur || 0.85;
      const r = bossCutscene._skipRect;
      const t0 = e.changedTouches[0];
      if (t0.clientX >= r.x && t0.clientX <= r.x + r.w && t0.clientY >= r.y && t0.clientY <= r.y + r.h && bossCutscene.t > fadeDur) {
        bossCutscene.t = fadeDur;
      }
    }
    if (!canTouchBattle()) { resetJoy(); return; }
    e.preventDefault();
    const touches = canvasTouches(e.touches);
    const changed = canvasTouches(e.changedTouches);

    if (!joy.active && !pinching && changed.length > 0) {
      adoptTouchAsJoy(changed[0]);
      if (touches.length >= 2) {
        pinchStartDist = pinchDist = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
      }
      return;
    }

    // 摇杆已在工作时落下第二根手指：绝不重置摇杆！若落在瞬步键边缘光环内则 0ms 瞬发瞬步，否则记录辅助轻点瞬步（仅当摇杆未推动且双指明显拉开才进入缩放）
    for (let i = 0; i < changed.length; i++) {
      const ct = changed[i];
      if (joy.active && ct.identifier === joy.id) continue;
      if (isNearDashTouchBtn(ct.clientX, ct.clientY)) {
        _lastTouchDashAt = nowMs();
        if (typeof triggerSoulDash === 'function') triggerSoulDash();
        return;
      }
      if (joy.active && (joy.lockedMove || joy.mag > 0.06)) {
        _auxDashTap = { id: ct.identifier, sx: ct.clientX, sy: ct.clientY, t0: nowMs(), moved: false };
      } else if (touches.length >= 2) {
        pinchStartDist = pinchDist = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
        _auxDashTap = { id: ct.identifier, sx: ct.clientX, sy: ct.clientY, t0: nowMs(), moved: false };
      }
    }
  }, { passive: false });

  cv.addEventListener('touchmove', e => {
    if (!canTouchBattle()) { resetJoy(); return; }
    e.preventDefault();
    const touches = canvasTouches(e.touches);

    if (_auxDashTap) {
      for (let i = 0; i < touches.length; i++) {
        const at = touches[i];
        if (at.identifier === _auxDashTap.id) {
          if (Math.hypot(at.clientX - _auxDashTap.sx, at.clientY - _auxDashTap.sy) > 24) _auxDashTap.moved = true;
          break;
        }
      }
    }

    // 仅当第一指尚未锁定走位且双指间距变化超过 18px 时，才真正进入双指缩放视野（杜绝边走边点瞬步误触缩放与断触）
    if (touches.length >= 2 && (!joy.active || (!joy.lockedMove && joy.mag <= 0.06) || pinching)) {
      const d = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
      if (!pinching && pinchStartDist > 10 && Math.abs(d - pinchStartDist) > 18) {
        pinching = true;
        joy.id = null; joy.active = false; joy.lockedMove = false;
        joy.dx = 0; joy.dy = 0; joy.mag = 0;
        _auxDashTap = null;
      }
      if (pinching && pinchDist > 10) {
        userZoomed = true;
        camZoom = Math.max(0.38, Math.min(1.95, camZoom * (d / pinchDist)));
        if (bootReady) clampCam();
      }
      pinchDist = d;
      if (pinching) return;
    }

    if (joy.active) {
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        if (t.identifier === joy.id) {
          updateJoyFromTouch(t);
          break;
        }
      }
    }
  }, { passive: false });

  const endTouch = e => {
    const allTouches = Array.from((e && e.touches) || []);
    const touches = canvasTouches(e && e.touches);
    const changed = canvasTouches(e && e.changedTouches);
    const isCancel = !!(e && e.type === 'touchcancel');

    if (_auxDashTap && changed.length > 0) {
      for (let i = 0; i < changed.length; i++) {
        if (changed[i].identifier === _auxDashTap.id) {
          if (!isCancel && !_auxDashTap.moved && !pinching && (nowMs() - _auxDashTap.t0) <= 260 && canTouchBattle()) {
            _lastTouchDashAt = nowMs();
            if (typeof triggerSoulDash === 'function') triggerSoulDash();
          }
          _auxDashTap = null;
          break;
        }
      }
    }

    const wasPinching = pinching;
    if (touches.length < 2) {
      pinchDist = 0;
      pinchStartDist = 0;
      pinching = false;
    }

    if (joy.active) {
      let stillDown = false;
      for (let i = 0; i < allTouches.length; i++) {
        if (allTouches[i].identifier === joy.id) { stillDown = true; break; }
      }
      if (!stillDown) {
        joy.id = null; joy.active = false; joy.lockedMove = false;
        joy.dx = 0; joy.dy = 0; joy.mag = 0;
        // 若另一根留在画布上的手指仍在按住，平滑继承为新摇杆锚点，杜绝“抬起一指后另一指失效罚站”
        if (!wasPinching && touches.length === 1 && canTouchBattle()) {
          adoptTouchAsJoy(touches[0]);
        }
      }
    } else if (!wasPinching && touches.length === 1 && canTouchBattle()) {
      adoptTouchAsJoy(touches[0]);
    }
  };
  cv.addEventListener('touchend', endTouch, { passive: true });
  cv.addEventListener('touchcancel', endTouch, { passive: true });
}

let state = 'menu', wave = 1, waveTime = 30, waveMaxTime = 30, lastUrgentSec = -1, spawnAcc = 0, shake = 0, diff = DIFFS[1];
let endlessMode = false, overtime = false, overtimeMeteorT = 1.6, hordeWave = false;
let survivalTrialQueued = false, survivalTrialWave = false, survivalTrialHits = 0;
let survivalFissures = [], survivalSkyVolleys = [];
let survivalTrialState = {
  fogIntroP: 0, lanternBoostT: 0,
  volleyCd: 0.95, fissureCd: 1.75, corridorCd: 8.2, meteorCd: 13.8,
  crossCd: 6.2, chainCd: 9.8, vortexCd: 4.8,
  phase2Announced: false, phase3Announced: false
};
let cam = { x: WORLD.w / 2, y: WORLD.h / 2 };
let player, enemies = [], bullets = [], eBullets = [], hazards = [], drops = [], spawns = [], turrets = [], mines = [], rings = [], trees = [];
let relics = [], sporeZones = [], spellZones = [], terrains = [], portals = [], portalPairCd = 0, banners = [], bossCutscene = null;
let relicSpawnT = -1, activeSceneEvent = null, sceneEventT = 0, sandGustT = 0, sceneMobEnabled = false;
let lastBossVariant = '', lastMiniBossVariant = '';
let texts = [], particles = [], sparks = [], lightnings = [], slashes = [], beams = [], stains = [], shells = [];
let pendingLevels = 0, pendingCrates = 0, treeSpawnT = 3.2, shopOffers = [];
let rerollCost = 1, rerollBase = 1, rerollStep = 2, freeRerollsLeft = 0, anvilUpgradedMsg = '', inHurtPlayer = false;
let hudAcc = 0, last = performance.now();
const hudCache = {}, hudEls = {}, renderList = [];
function setHudText(id, val) {
  if (hudCache[id] === val) return;
  hudCache[id] = val;
  const el = hudEls[id] || (hudEls[id] = document.getElementById(id));
  if (el) el.textContent = val;
}
function setHudWidth(id, val) {
  const k = id + '_w';
  if (hudCache[k] === val) return;
  hudCache[k] = val;
  const el = hudEls[id] || (hudEls[id] = document.getElementById(id));
  if (el) el.style.width = val;
}
bootReady = true;
if (typeof SpireBootGate !== 'undefined' && SpireBootGate) {
  SpireBootGate.setStep(38, '主殿交互就绪 · 正在装载刷怪与战斗结算模块…');
}
resize();
cam.x = WORLD.w / 2; cam.y = WORLD.h / 2;
clampCam();

function makeWeapon(id, tier = 1) {
  return { id, tier, cd: Math.random() * 0.25, thrust: 0, recoil: 0, angle: 0 };
}

const _EMPTY_SET_BONUSES = {
  counts: { primitive: 0, precise: 0, gun: 0, heavy: 0, elemental: 0, tech: 0 },
  hp: 0, crit: 0, range: 0, aspd: 0, armor: 0, blast: 0, elem: 0, tech: 0, turretAspd: 0,
  rocks: 0, sticks: 0, meleeCnt: 0, staffCnt: 0, totemCnt: 0, screwdrivers: 0, maxMineTier: 1, doubleMines: 0
};
const _PRIM_STEPS = [2, 4, 6], _PREC_STEPS = [2, 3, 5], _GUN_STEPS = [2, 4, 6];
const _HVY_STEPS = [2, 3, 5], _ELEM_STEPS = [2, 3, 5], _TECH_STEPS = [2, 3, 5];
const _HP_TIERS = [0, 8, 18, 30], _CRIT_TIERS = [0, 0.06, 0.12, 0.20], _RNG_TIERS = [0, 45, 95, 155];
const _ASPD_TIERS = [0, 0.08, 0.16, 0.25], _ARM_TIERS = [0, 2, 5, 8], _ELEM_TIERS = [0, 0.18, 0.38, 0.62], _TECH_TIERS = [0, 0.25, 0.52, 0.85], _TECH_ASPD_TIERS = [0, 0.08, 0.16, 0.25];

function _tierOfSet(c, steps) {
  return c >= steps[2] ? 3 : (c >= steps[1] ? 2 : (c >= steps[0] ? 1 : 0));
}

function getSetBonuses() {
  if (!player || !Array.isArray(player.weapons)) return _EMPTY_SET_BONUSES;
  const ws = player.weapons;
  let cache = player._sbCache;
  if (cache && cache._len === ws.length) {
    let match = true;
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      if (!w || cache._ids[i] !== w.id || cache._tiers[i] !== w.tier || cache._evos[i] !== (w.evo || '')) { match = false; break; }
    }
    if (match) return cache;
  }
  if (!cache) {
    cache = {
      counts: { primitive: 0, precise: 0, gun: 0, heavy: 0, elemental: 0, tech: 0 },
      hp: 0, crit: 0, range: 0, aspd: 0, armor: 0, blast: 0, elem: 0, tech: 0, turretAspd: 0,
      rocks: 0, sticks: 0, meleeCnt: 0, staffCnt: 0, totemCnt: 0, screwdrivers: 0, maxMineTier: 1, doubleMines: 0,
      _len: 0, _ids: [], _tiers: [], _evos: []
    };
    player._sbCache = cache;
  }
  const counts = cache.counts;
  counts.primitive = 0; counts.precise = 0; counts.gun = 0; counts.heavy = 0; counts.elemental = 0; counts.tech = 0;
  let rocks = 0, sticks = 0, meleeCnt = 0, staffCnt = 0, totemCnt = 0, screwdrivers = 0, maxMineTier = 1, doubleMines = 0;
  cache._len = ws.length;
  cache._ids.length = ws.length;
  cache._tiers.length = ws.length;
  cache._evos.length = ws.length;
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    if (!w) { cache._ids[i] = ''; cache._tiers[i] = 0; cache._evos[i] = ''; continue; }
    cache._ids[i] = w.id;
    cache._tiers[i] = w.tier;
    cache._evos[i] = w.evo || '';
    const tpl = WEAPONS[w.id];
    if (!tpl) continue;
    if (tpl.set && counts[tpl.set] !== undefined) counts[tpl.set]++;
    if (tpl.melee) meleeCnt++;
    if (tpl.isStaff) staffCnt++;
    if (tpl.deploysTotem) {
      totemCnt += 1;
      const evT = typeof getWeaponEvo === 'function' ? getWeaponEvo(w) : null;
      if (evT && evT.extraTotem) totemCnt += evT.extraTotem;
    }
    if (w.id === 'rock') rocks++;
    else if (w.id === 'stick') sticks++;
    else if (w.id === 'screwdriver') {
      screwdrivers++;
      if (w.tier > maxMineTier) maxMineTier = w.tier;
      const ev = typeof getWeaponEvo === 'function' ? getWeaponEvo(w) : null;
      if (ev && ev.doubleMine) doubleMines++;
    }
  }
  const tPrim = _tierOfSet(counts.primitive, _PRIM_STEPS);
  const tPrec = _tierOfSet(counts.precise,   _PREC_STEPS);
  const tGun  = _tierOfSet(counts.gun,       _GUN_STEPS);
  const tHvy  = _tierOfSet(counts.heavy,     _HVY_STEPS);
  const tElem = _tierOfSet(counts.elemental, _ELEM_STEPS);
  const tTech = _tierOfSet(counts.tech,      _TECH_STEPS);
  cache.hp    = _HP_TIERS[tPrim];
  cache.crit  = _CRIT_TIERS[tPrec];
  cache.range = _RNG_TIERS[tGun];
  cache.aspd  = _ASPD_TIERS[tGun];
  cache.armor = _ARM_TIERS[tHvy];
  cache.blast = tHvy > 0 ? 0.20 : 0;
  cache.elem  = _ELEM_TIERS[tElem];
  cache.tech  = _TECH_TIERS[tTech];
  cache.turretAspd = _TECH_ASPD_TIERS[tTech];
  cache.rocks = rocks;
  cache.sticks = sticks;
  cache.meleeCnt = meleeCnt;
  cache.staffCnt = staffCnt;
  cache.totemCnt = totemCnt;
  cache.screwdrivers = screwdrivers;
  cache.maxMineTier = maxMineTier;
  cache.doubleMines = doubleMines;
  return cache;
}

function getRockCount() {
  return getSetBonuses().rocks;
}

function syncSetHp() {
  if (!player) return;
  const sb = getSetBonuses();
  const targetBonusHp = sb.hp + getRockCount() * 3;
  const delta = targetBonusHp - (player._setHp || 0);
  if (delta !== 0) {
    player.maxHp = Math.max(1, player.maxHp + delta);
    player.hp = Math.min(player.maxHp, Math.max(1, player.hp + Math.max(0, delta)));
    player._setHp = targetBonusHp;
  }
}

let waveCratesDropped = 0, waveCheckpoint = null;

function startGame(cls, opts) {
  if (typeof bootIntegrityPassed !== 'undefined' && !bootIntegrityPassed) {
    if (typeof SpireBootGate !== 'undefined' && SpireBootGate) SpireBootGate.runFullCheck('user_guard');
    return;
  }
  if (typeof resetWeaponEvolutionUI === 'function') resetWeaponEvolutionUI();
  const options = opts || {};
  const reqMode = options.mode ? options.mode : ((cls && cls !== 'allrounder') ? 'endless' : 'story');
  const runEndless = reqMode === 'endless' || !!options.endless;
  // 严格规则：剧情模式只能使用主角「零号·白衣」(allrounder)，无尽模式可自由选择其他角色及全员
  const resolvedCls = runEndless
    ? (CLASSES.some(c => c.id === cls) ? cls : (selectedEndlessCls || 'brawler'))
    : 'allrounder';
  if (!runEndless) selectedScene = 'random';
  cls = resolvedCls;

  beep(520, 0.08, 'triangle');
  diff = DIFFS[selectedDiff] || DIFFS[1] || DIFFS[0];
  inHurtPlayer = false;
  player = {
    cls, outfit: cls === 'allrounder' && typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : '',
    x: WORLD.w / 2, y: WORLD.h / 2, r: 24.2, faceDir: 1, lookA: 0, moveA: 0,
    vx: 0, vy: 0, _leanA: 0, _hsCd: 0,
    dashCd: 0, dashMaxCd: cls === 'ghost' ? 2.5 : 3.2, dashT: 0, dashVx: 0, dashVy: 0,
    dashHasteT: 0, turretOverclockT: 0, magnetPulseT: 0,
    hp: 30, maxHp: 30, _setHp: 0, regen: 0.5, regenAcc: 0, noRegen: false, lifesteal: 0, _lifestealCd: 0,
    armor: 0, maxShield: 0, shield: 0, shieldRegenT: 0, shieldHitT: 0,
    spd: 194, spdMul: 1, dmgMul: 1, meleeBonus: 0, rangedBonus: 0, elemBonus: 0, techBonus: 0, atkSpd: 0.90, crit: 0.05, critDmg: 0,
    dodge: 0, dodgeCap: 0.80, maxSlots: 6, bonusTurrets: 0, laserTurrets: 0, shockTurrets: 0, totemTurrets: 0, mineLayers: 0, mineCd: 1.4,
    turretAspdBonus: 0, turretBastion: 0, mineHaste: 0, mineRadiusBonus: 0, turretAuraHeal: 0, turretElemInherit: false, turretMissile: false, _inTurretAura: false,
    turretCrit: false, turretElem: false, turretSalvo: false, _salvoCd: 0, bullCd: 0,
    staffHaste: 0, staffPierce: 0, staffRange: 0, dotHaste: 0, staffVolley: 0, elemCrit: false, archmageMeteor: false, _reactionCount: 0,
    magnet: typeof BASE_PICKUP_MAGNET === 'number' ? BASE_PICKUP_MAGNET : 143, harvest: 1, harvestFlat: 0, luck: 0, rangeBonus: 0, _displayRange: 140,
    pierceBonus: 0, bounceBonus: 0, bounceAmpDmg: 0, farShotBonus: 0, shopDiscount: 0, freeRerolls: 0, shopVisits: 0, shopRerollRaw: 1, bonusTrees: 0,
    enemySlow: 0, thorns: 0, cyberball: 0, critHeal: 0, critMeleeHeal: false, ailmentLeech: 0, rangeToDmg: false, hpToDmg: 0, armorToDmg: 0, regenToDmg: false, hasAnvil: false, healBonus: 0,
    burnChance: 0, chillChance: 0, chillDmgBonus: 0, freezeChance: 0, freezeDeathNova: false, poisonChance: 0, maxPoisonStacks: 8, plagueSpread: false, elemSynergy: false, reactionBlast: false,
    meleeBossGuard: 0, meleeSweepBonus: 0, meleeKnockBonus: 0, meleeShockwave: false, meleeBulletCutChance: 0, meleeSunder: false, strideQuake: false, _strideDist: 0, blastChance: 0, explosionScale: 1, napalmBlast: false, bloodNova: false,
    interest: 0, teslaCount: 0, teslaCd: 1.0, healDropBonus: 0, chillSlowT: 0, inSpore: false,
    dashCdMul: 1, dashFreezeNova: false, dashSurge: false, dashSurgeT: 0, shieldPulseNova: false, executeLowHp: 0,
    invulnBonus: 0, fastShield: false, soulBolt: false, noSlow: false, bossCratesQueued: 0, mythicCratesQueued: 0,
    survivalActsCleared: {}, survivalCratesQueued: 0, survivalGoldCratesQueued: 0, survivalFlawlessCnt: 0,
    _fissureHitCd: 0, _fissureLeapHintCd: 0, recentCrateIds: [],
    ultCd: 0, ultMaxCd: 15.0, ultInvulnT: 0,
    rarePortraitShown: false, shownBossPortraits: {}, mythicAwakenedCount: 0, waveMythicAwakened: false, waveBossCrateDropped: false, retryCount: 0,
    lavaExposure: 0, lavaTick: 0, terrainHintT: 0, terrainSpdMul: 1,
    lv: 1, xp: 0, xpNeed: 10, mats: Math.round(diff.matBonus * (typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.77)), kills: 0, invuln: 0, hurtFlashT: 0, walkT: 0, dustT: 0, moving: false,
    runStats: { weaponDmg: {}, dmgTaken: {}, totalDealt: 0, totalTaken: 0 },
    weapons: [], items: {}
  };
  if (cls === 'allrounder') {
    player.maxHp += 6; player.hp += 6; player.spdMul += 0.04; player.dmgMul += 0.08; player.harvestFlat += 4;
    player.weapons.push(makeWeapon('pistol', 1), makeWeapon('stick', 1));
  } else if (cls === 'ranger') {
    player.spdMul += 0.08; player.dodge += 0.06; player.atkSpd += 0.20; player.crit += 0.12; player.rangeBonus += 65;
    player.weapons.push(makeWeapon('smg', 1), makeWeapon('icicle', 1));
  } else if (cls === 'brawler') {
    player.maxHp += 8; player.hp += 8; player.armor += 1; player.regen += 1.1; player.meleeBonus = 0.16; player.rangeBonus -= 10;
    player.weapons.push(makeWeapon('katana', 1), makeWeapon('stick', 1));
  } else if (cls === 'engineer') {
    player.armor += 2; player.regen += 1.8; player.techBonus = 0.15; player.bonusTurrets = 2;
    player.weapons.push(makeWeapon('wrench', 1), makeWeapon('pistol', 1));
  } else if (cls === 'multitasker') {
    player.maxSlots = 12;
    player.weapons.push(makeWeapon('stick', 1), makeWeapon('stick', 1), makeWeapon('pistol', 1));
  } else if (cls === 'ghost') {
    player.maxHp -= 6; player.hp -= 6; player.dodgeCap = 0.80; player.dodge = 0.28; player.luck += 8;
    player.weapons.push(makeWeapon('knife', 1), makeWeapon('shuriken', 1));
  } else {
    player.weapons.push(makeWeapon('pistol', 1), makeWeapon('stick', 1));
  }
  syncSetHp();
  wave = 1; endlessMode = runEndless; pendingLevels = 0; pendingCrates = 0; freeRerollsLeft = 0; rerollBase = 1; rerollStep = 2; rerollCost = 1; if (typeof rerollRawCost !== 'undefined') rerollRawCost = 1; anvilUpgradedMsg = ''; shopOffers = []; waveCheckpoint = null;
  survivalTrialQueued = false; survivalTrialWave = false; survivalTrialHits = 0; survivalFissures = []; survivalSkyVolleys = []; spellZones = [];
  if (typeof closeZeroOutfitModal === 'function') closeZeroOutfitModal();
  logInfo('GAME', `开局 ver=${typeof APP_VERSION !== 'undefined' ? APP_VERSION : '-'}, mode=${runEndless ? 'endless' : 'story'}, cls=${cls}, outfit=${player.outfit || '-'}, diff=${diff.badge}, sceneMode=${selectedScene}, ui=${uiMode}, world=${WORLD.w}x${WORLD.h}`);
  document.getElementById('startMenu').classList.add('hidden');
  document.getElementById('endMenu').classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
  const cm = document.getElementById('crateMenu');
  if (cm) cm.classList.add('hidden');
  if (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.resetForNewRun === 'function') {
    SpireDirector.resetForNewRun();
  }
  beginWave();
}

function replayOpeningCutscene() {
  if (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.playOpeningSequence === 'function') {
    SpireDirector.playOpeningSequence(true);
  }
}

function showStart() {
  if (typeof resetWeaponEvolutionUI === 'function') resetWeaponEvolutionUI();
  if (typeof closeEndSummaryDetail === 'function') closeEndSummaryDetail();
  state = 'menu';
  resetJoy();
  if (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.resetForNewRun === 'function') {
    SpireDirector.resetForNewRun();
  }
  document.getElementById('endMenu').classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
  document.getElementById('shopMenu').classList.add('hidden');
  document.getElementById('levelMenu').classList.add('hidden');
  const cm = document.getElementById('crateMenu');
  if (cm) cm.classList.add('hidden');
  const cdx = document.getElementById('codexModal');
  if (cdx) cdx.classList.add('hidden');
  const clm = document.getElementById('changelogModal');
  if (clm) clm.classList.add('hidden');
  const am = document.getElementById('audioModal');
  if (am) am.classList.add('hidden');
  if (typeof SpireAudio !== 'undefined') {
    if (SpireAudio.phase2Active && typeof SpireAudio.syncScene === 'function') {
      SpireAudio.syncScene('foundry', false);
    } else if (SpireAudio.refreshButtons) {
      SpireAudio.refreshButtons();
    }
  }
  bossCutscene = null;
  if (typeof pendingBossCutscene !== 'undefined') pendingBossCutscene = null;
  survivalTrialQueued = false;
  survivalTrialWave = false;
  survivalTrialHits = 0;
  survivalFissures = [];
  survivalSkyVolleys = [];
  if (typeof resetUltEffects === 'function') resetUltEffects();
  waveCheckpoint = null;
  document.getElementById('hud').classList.add('hidden');
  const sm = document.getElementById('startMenu');
  sm.classList.remove('hidden');
  sm.scrollTop = 0;
  openMenuStage('home');
}

function renderBuildSummary(statsId, setsId) {
  if (!player) return;
  syncSetHp();
  const setB = getSetBonuses();
  const arm = getTotalArmor(), mit = Math.round(getArmorMitigation() * 100);
  const dmgPct = Math.round(getEffectiveDmgMul() * 100);
  const aspdScale = typeof PLAYER_ASPD_SCALE === 'number' ? PLAYER_ASPD_SCALE : 0.70;
  const aspdPct = Math.round((player.atkSpd + setB.aspd) * aspdScale * 100);
  const critPct = Math.round(getEffectiveCrit() * 100);
  const critDmgPct = Math.round((1.95 + (player.critDmg || 0)) * 100);
  const rng = getTotalRangeBonus();
  const rngTxt = rng >= 0 ? `+${rng}` : `${rng}`;
  const harv = Math.round(player.harvestFlat || 0);
  const tAspdBase = typeof TURRET_BASE_ASPD_MUL === 'number' ? TURRET_BASE_ASPD_MUL : 1.20;
  const turretAspdBonusTotal = (player.turretAspdBonus || 0) + (setB.turretAspd || 0);
  const showTurretAspd = turretAspdBonusTotal > 0 || (setB.counts && setB.counts.tech > 0) ||
    ((player.bonusTurrets || 0) + (player.laserTurrets || 0) + (player.shockTurrets || 0) + (player.totemTurrets || 0)) > 0;
  const turretAspdPct = Math.round(tAspdBase * (1 + turretAspdBonusTotal) * 100);
  const stEl = document.getElementById(statsId);
  if (stEl) {
    stEl.innerHTML =
      `<span>生命 <b>${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}</b>${player.maxShield ? ` <small style="color:#89c4d4">(+${Math.ceil(player.shield)}护盾)</small>` : ''}</span>` +
      `<span>护甲 <b>${arm}</b> <small>(${mit >= 0 ? '-' : '+'}${Math.abs(mit)}%伤)</small></span>` +
      `<span>再生 <b>${player.regen.toFixed(1)}/s</b></span>` +
      `<span>汲血 <b>${Math.round(player.lifesteal * 100)}%</b></span>` +
      `<span>伤害 <b>${dmgPct}%</b></span>` +
      `<span>攻速 <b>${aspdPct}%</b></span>` +
      (showTurretAspd ? `<span>建筑攻速 <b>${turretAspdPct}%</b></span>` : '') +
      `<span>范围 <b>${rngTxt}</b></span>` +
      `<span>暴击 <b>${critPct}%</b> <small style="color:#dfc084">(${critDmgPct}%)</small></span>` +
      `<span>闪避 <b>${Math.round(Math.min(player.dodgeCap || 0.80, player.dodge) * 100)}%</b></span>` +
      `<span>移速 <b>${Math.round(getEffectiveSpdMul() * 100)}%</b></span>` +
      `<span>幸运 <b>${player.luck || 0}</b></span>` +
      `<span>收获 <b>${harv}</b></span>`;
  }
  const mqEl = document.getElementById('mobQuickStats');
  if (mqEl) {
    mqEl.innerHTML =
      `<span>生命 <b>${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}</b></span>` +
      `<span>护甲 <b>${arm}</b></span>` +
      `<span>伤害 <b>${dmgPct}%</b></span>` +
      `<span>攻速 <b>${aspdPct}%</b></span>` +
      `<span>范围 <b>${rngTxt}</b></span>` +
      `<span>暴击 <b>${critPct}%</b></span>`;
  }
  const srEl = document.getElementById(setsId);
  if (srEl) {
    const setPills = [];
    for (const [key, def] of Object.entries(SET_DEFS)) {
      const c = setB.counts[key];
      if (c > 0) {
        const nextStep = def.steps.find(s => s > c) || def.steps[2];
        const active = c >= def.steps[0];
        setPills.push(`<span class="set-pill${active ? ' active' : ''}" title="${def.desc}">${def.label} ${c}/${nextStep} · ${def.desc}</span>`);
      }
    }
    if (player.items) {
      for (const [iid, cnt] of Object.entries(player.items)) {
        if (cnt > 0) {
          const meta = ITEMS.find(x => x.id === iid);
          if (meta) setPills.push(`<span class="set-pill" title="${meta.desc}">${meta.icon} ${meta.name}${cnt > 1 ? ' ×' + cnt : ''}</span>`);
        }
      }
    }
    srEl.innerHTML = setPills.join('');
  }
}

function pauseGame() {
  if (state !== 'wave' || !player) return;
  state = 'paused';
  for (const k in keys) keys[k] = false;
  resetJoy();
  beep(360, 0.05, 'triangle', 0.04);
  const clsObj = CLASSES.find(c => c.id === player.cls);
  const baseWaveTag = endlessMode ? `无尽第 ${wave} 层` : `第 ${wave} / ${MAX_WAVE} 层`;
  const waveTag = survivalTrialWave ? `${baseWaveTag} · 🕯️蚀界试炼` : baseWaveTag;
  const timeTxt = overtime ? '超时死斗' : `剩余 ${Math.ceil(waveTime)}s`;
  document.getElementById('pauseInfo').innerHTML =
    `<b>${diff.badge}</b>  ·  层域：<b>${curScene.name}</b>  ·  登塔者：<b>${clsObj ? clsObj.name : ''}</b>  ·  进度：<b>${waveTag}（${timeTxt}）</b>  ·  等级：<b>Lv.${player.lv}</b>  ·  晶石：<b style="color:#dfc084">◇ ${player.mats}</b>`;
  renderBuildSummary('pauseStats', 'pauseSets');
  refreshUIPrefControls();
  if (typeof SpireAudio !== 'undefined' && SpireAudio.refreshButtons) SpireAudio.refreshButtons();
  const pm = document.getElementById('pauseMenu');
  pm.classList.remove('hidden');
  pm.scrollTop = 0;
}

function resumeGame() {
  if (state !== 'paused') return;
  state = 'wave';
  for (const k in keys) keys[k] = false;
  resetJoy();
  if (document.activeElement && typeof document.activeElement.blur === 'function' && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
  last = performance.now();
  beep(540, 0.05, 'triangle', 0.04);
  document.getElementById('pauseMenu').classList.add('hidden');
}

function togglePause() {
  if (state === 'wave') pauseGame();
  else if (state === 'paused') resumeGame();
}

function restartRun() {
  document.getElementById('pauseMenu').classList.add('hidden');
  if (player && player.cls) startGame(player.cls, { mode: endlessMode ? 'endless' : 'story' });
  else showStart();
}

function quitToMenu() {
  beep(320, 0.06, 'triangle', 0.04);
  showStart();
}

function clonePlayerForCheckpoint(p) {
  if (!p) return null;
  const copy = Object.assign({}, p);
  copy.weapons = Array.isArray(p.weapons)
    ? p.weapons.map(w => Object.assign({}, w, { cd: Math.random() * 0.25, thrust: 0, recoil: 0 }))
    : [];
  copy.items = Object.assign({}, p.items || {});
  copy.recentCrateIds = Array.isArray(p.recentCrateIds) ? p.recentCrateIds.slice() : [];
  copy.shownBossPortraits = Object.assign({}, p.shownBossPortraits || {});
  copy.survivalActsCleared = Object.assign({}, p.survivalActsCleared || {});
  copy.runStats = p.runStats ? JSON.parse(JSON.stringify(p.runStats)) : { weaponDmg: {}, dmgTaken: {}, totalDealt: 0, totalTaken: 0 };
  copy.story = p.story ? JSON.parse(JSON.stringify(p.story)) : null;
  copy._sbCache = null;
  return copy;
}

function saveWaveCheckpoint(extraMeta = null) {
  if (!player) return;
  waveCheckpoint = Object.assign({
    wave,
    endlessMode,
    selectedDiff,
    selectedScene,
    sceneId: curScene ? curScene.id : 'foundry',
    lastBossVariant,
    lastMiniBossVariant,
    rerollCost,
    rerollBase,
    rerollStep,
    rerollRawCost: typeof rerollRawCost === 'number' ? rerollRawCost : rerollBase,
    freeRerollsLeft,
    anvilUpgradedMsg,
    isSurvivalTrial: !!survivalTrialWave,
    shopOffers: Array.isArray(shopOffers) ? shopOffers.map(o => o ? Object.assign({}, o) : null).filter(Boolean) : [],
    player: clonePlayerForCheckpoint(player)
  }, extraMeta || {});
  if (!endlessMode && typeof SpireSave !== 'undefined') SpireSave.write(waveCheckpoint);
}

function retryFailedWave(options) {
  const isResume = !!(options && options.resume);
  if (!waveCheckpoint || !waveCheckpoint.player) {
    if (player && player.cls) startGame(player.cls, { mode: endlessMode ? 'endless' : 'story' });
    else showStart();
    return;
  }
  beep(580, 0.09, 'triangle', 0.06);
  const mergedPortraits = Object.assign(
    {},
    waveCheckpoint.player.shownBossPortraits || {},
    (player && player.shownBossPortraits) || {}
  );
  const nextRetryCount = Math.max(
    (player && player.retryCount) || 0,
    (waveCheckpoint.player && waveCheckpoint.player.retryCount) || 0
  ) + (isResume ? 0 : 1);

  wave = waveCheckpoint.wave;
  endlessMode = !!waveCheckpoint.endlessMode;
  selectedDiff = waveCheckpoint.selectedDiff;
  diff = DIFFS[selectedDiff] || DIFFS[1] || DIFFS[0];
  selectedScene = waveCheckpoint.selectedScene;
  lastBossVariant = waveCheckpoint.lastBossVariant || '';
  lastMiniBossVariant = waveCheckpoint.lastMiniBossVariant || '';
  pendingLevels = 0;
  pendingCrates = 0;
  rerollCost = waveCheckpoint.rerollCost;
  rerollBase = waveCheckpoint.rerollBase;
  rerollStep = waveCheckpoint.rerollStep;
  if (typeof rerollRawCost !== 'undefined' && Number.isFinite(waveCheckpoint.rerollRawCost)) {
    rerollRawCost = waveCheckpoint.rerollRawCost;
  }
  freeRerollsLeft = waveCheckpoint.freeRerollsLeft || 0;
  anvilUpgradedMsg = waveCheckpoint.anvilUpgradedMsg || '';
  shopOffers = Array.isArray(waveCheckpoint.shopOffers)
    ? waveCheckpoint.shopOffers.map(o => Object.assign({}, o))
    : [];

  player = clonePlayerForCheckpoint(waveCheckpoint.player);
  if (player.cls === 'allrounder') {
    if (player.outfit && typeof ZERO_OUTFITS !== 'undefined' && ZERO_OUTFITS[player.outfit]) {
      selectedZeroOutfit = player.outfit;
    } else if (typeof getActiveZeroOutfitId === 'function') {
      player.outfit = getActiveZeroOutfitId();
    }
  }
  player.shownBossPortraits = mergedPortraits;
  player.rarePortraitShown = Object.keys(mergedPortraits).length > 0;
  player.retryCount = nextRetryCount;
  player.invuln = 0;
  player.hurtFlashT = 0;
  inHurtPlayer = false;
  player.ultCd = 0;
  player.ultInvulnT = 0;
  if (typeof resetUltEffects === 'function') resetUltEffects();

  for (const k in keys) keys[k] = false;
  resetJoy();
  last = performance.now();
  if (typeof closeEndSummaryDetail === 'function') closeEndSummaryDetail();
  document.getElementById('endMenu').classList.add('hidden');
  document.getElementById('startMenu').classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
  document.getElementById('shopMenu').classList.add('hidden');
  document.getElementById('levelMenu').classList.add('hidden');
  const cm = document.getElementById('crateMenu');
  if (cm) cm.classList.add('hidden');

  logInfo('RETRY', `战败回溯重开第 ${wave} 波 (累计重开 ${nextRetryCount} 次) · Lv=${player.lv} · 💎=${player.mats}`);
  beginWave({
    isRetry: !isResume,
    sceneId: waveCheckpoint.sceneId,
    isSurvivalTrial: !!waveCheckpoint.isSurvivalTrial,
    waveBossIds: Array.isArray(waveCheckpoint.waveBossIds) ? waveCheckpoint.waveBossIds.slice() : null
  });
}

function abandonAndRestart() {
  beep(420, 0.08, 'triangle', 0.05);
  const targetCls = player && player.cls ? player.cls : null;
  waveCheckpoint = null;
  for (const k in keys) keys[k] = false;
  resetJoy();
  last = performance.now();
  if (typeof closeEndSummaryDetail === 'function') closeEndSummaryDetail();
  document.getElementById('endMenu').classList.add('hidden');
  logInfo('RESTART', `放弃当前进度并从第 1 波重头开始 · cls=${targetCls || '-'}`);
  if (targetCls) startGame(targetCls, { mode: endlessMode ? 'endless' : 'story' });
  else showStart();
}
