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

function stepMenuDiff(delta) {
  const len = DIFFS.length;
  selectedDiff = ((selectedDiff + (delta < 0 ? -1 : 1)) % len + len) % len;
  beep(480, 0.04, 'triangle', 0.03);
  initMenuUI();
}
globalThis.stepMenuDiff = stepMenuDiff;

function stepMenuOutfit(delta) {
  if (typeof ZERO_OUTFITS === 'undefined') return;
  const order = ['witch', 'crimson', 'astral', 'default'];
  const curId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
  const idx = Math.max(0, order.indexOf(curId));
  const nextId = order[((idx + (delta < 0 ? -1 : 1)) % order.length + order.length) % order.length];
  selectZeroOutfitFromUI(nextId);
}
globalThis.stepMenuOutfit = stepMenuOutfit;

function stepMenuScene(delta) {
  const ids = ['random', ...SCENES.map(s => s.id)];
  const curIdx = Math.max(0, ids.indexOf(selectedScene));
  const nextId = ids[((curIdx + (delta < 0 ? -1 : 1)) % ids.length + ids.length) % ids.length];
  selectedScene = nextId;
  if (nextId !== 'random') {
    curScene = SCENES.find(x => x.id === nextId) || SCENES[0];
    sceneSeed = (1009 + nextId.charCodeAt(0) * 271) >>> 0;
    if (bootReady) syncArenaAndZoom(true);
    if (typeof SpireAudio !== 'undefined') SpireAudio.syncScene(nextId);
  } else {
    curScene = SCENES[0];
    sceneSeed = 1024;
    if (bootReady) syncArenaAndZoom(true);
    if (typeof SpireAudio !== 'undefined') SpireAudio.syncScene('foundry');
  }
  beep(510, 0.04, 'triangle', 0.03);
  initMenuUI();
}
globalThis.stepMenuScene = stepMenuScene;

function _renderStoryP5Bars() {
  const wrap = document.getElementById('storyPrepBars');
  if (!wrap) return;
  const activeDiff = DIFFS[selectedDiff] || DIFFS[1] || DIFFS[0];
  const curOutfitId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
  const curOutfit = (typeof ZERO_OUTFITS !== 'undefined' && (ZERO_OUTFITS[curOutfitId] || ZERO_OUTFITS.witch)) || { name: '提灯战装', shortName: '灰羽魔女', desc: '' };
  const headCn = document.getElementById('storyHeroHeadCn');
  if (headCn) headCn.textContent = `零 · 提灯人${curOutfit.captionSuffix || ''}`;

  const diffIdx = Math.max(0, DIFFS.indexOf(activeDiff)) + 1;
  const outfitKeys = typeof ZERO_OUTFITS !== 'undefined' ? Object.keys(ZERO_OUTFITS) : ['default', 'witch', 'crimson', 'astral'];
  const outIdx = Math.max(0, outfitKeys.indexOf(curOutfitId)) + 1;
  wrap.innerHTML = `
    <div class="p5-row is-sel" onclick="stepMenuDiff(1)">
      <div class="p5-ico-edge"><div class="p5-ico-inner">🕯️</div></div>
      <div class="p5-notch" aria-hidden="true"></div>
      <div class="p5-bar-edge">
        <div class="p5-bar-fill">
          <div class="p5-bar-top">
            <div class="p5-title-group">
              <span class="p5-bar-title">${activeDiff.badge} · ${activeDiff.name}</span>
            </div>
            <div class="p5-stepper" onclick="event.stopPropagation()">
              <button type="button" class="p5-tri-btn prev" onclick="stepMenuDiff(-1)" aria-label="上一难度"><i></i></button>
              <span class="p5-step-idx">${diffIdx}/${DIFFS.length}</span>
              <button type="button" class="p5-tri-btn next" onclick="stepMenuDiff(1)" aria-label="下一难度"><i></i></button>
            </div>
          </div>
          <div class="p5-bar-cat">${activeDiff.desc}</div>
        </div>
      </div>
    </div>

    <div class="p5-row" onclick="openZeroOutfitModal()">
      <div class="p5-ico-edge"><div class="p5-ico-inner">✦</div></div>
      <div class="p5-notch" aria-hidden="true"></div>
      <div class="p5-bar-edge">
        <div class="p5-bar-fill">
          <div class="p5-bar-top">
            <div class="p5-title-group">
              <span class="p5-bar-title">战装 · ${curOutfit.name}</span>
            </div>
            <div class="p5-stepper" onclick="event.stopPropagation()">
              <button type="button" class="p5-tri-btn prev" onclick="stepMenuOutfit(-1)" aria-label="上一套战装"><i></i></button>
              <span class="p5-step-idx">${outIdx}/${outfitKeys.length}</span>
              <button type="button" class="p5-tri-btn next" onclick="stepMenuOutfit(1)" aria-label="下一套战装"><i></i></button>
            </div>
          </div>
          <div class="p5-bar-cat">${curOutfit.desc || '同步切换立绘、实机四帧精灵与剧情演出形象'}</div>
        </div>
      </div>
    </div>

    <div class="p5-row is-static">
      <div class="p5-ico-edge"><div class="p5-ico-inner">⚔️</div></div>
      <div class="p5-notch" aria-hidden="true"></div>
      <div class="p5-bar-edge">
        <div class="p5-bar-fill">
          <div class="p5-bar-top">
            <span class="p5-bar-title">初始兵装 · 封魂短铳 + 守誓残杖</span>
            <span class="p5-gold-note">命定天赋</span>
          </div>
          <div class="p5-bar-cat">瞬步·青焰净魂震退归晶 · 16 层四幕抵达新层自动存档</div>
        </div>
      </div>
    </div>`;
}

function _renderEndlessP5Stage(activeEndlessHero, activeDiffObj, activeSceneOpt) {
  if (!activeEndlessHero) return;
  if (typeof SpireAssets !== 'undefined' && SpireAssets && typeof SpireAssets.getHeroSheet === 'function') {
    SpireAssets.getHeroSheet(activeEndlessHero.id, false, true);
  }
  const isZero = activeEndlessHero.id === 'allrounder' && typeof getActiveZeroOutfit === 'function';
  const activeOutfit = isZero ? getActiveZeroOutfit() : null;
  const portUrl = typeof getHeroUiBustUrl === 'function'
    ? getHeroUiBustUrl(activeEndlessHero.id, activeOutfit ? activeOutfit.id : undefined)
    : _menuAssetUrl(activeOutfit ? (activeOutfit.uiBust || activeOutfit.portrait) : activeEndlessHero.portrait);
  const chibiUrl = _menuAssetUrl(activeOutfit ? activeOutfit.chibi : activeEndlessHero.chibi);

  const pFrame = document.getElementById('endlessPortraitFrame');
  if (pFrame) {
    pFrame.innerHTML = `
      <div class="pcf-back-slash" aria-hidden="true"></div>
      <img src="${portUrl}" alt="${activeEndlessHero.name}" class="bust-full spotlight-portrait" decoding="async">
      <div class="pcf-chibi-badge" title="实机战斗精灵形态">
        <img src="${chibiUrl}" alt="${activeEndlessHero.name} 实机精灵" decoding="async">
        <span>${activeEndlessHero.shortRole || '实机'}</span>
      </div>`;
  }

  const enEl = document.getElementById('endlessHeroEn');
  const cnEl = document.getElementById('endlessHeroCn');
  const trEl = document.getElementById('endlessTraitLine');
  if (enEl) enEl.textContent = `${activeEndlessHero.code || 'HERO'} · ${activeEndlessHero.enTitle || 'ASHEN VOW'}`;
  if (cnEl) cnEl.textContent = `${activeEndlessHero.name} · ${activeOutfit ? activeOutfit.shortName : (activeEndlessHero.shortRole || activeEndlessHero.tag)}`;
  if (trEl) {
    const posTxt = Array.isArray(activeEndlessHero.traits) ? activeEndlessHero.traits.join(' · ') : (activeEndlessHero.perks || '');
    const negTxt = activeEndlessHero.negTrait ? ` ｜ ${activeEndlessHero.negTrait}` : '';
    trEl.textContent = `✦ ${posTxt}${negTxt}`;
  }

  const barsEl = document.getElementById('endlessPrepBars');
  if (barsEl && activeDiffObj && activeSceneOpt) {
    const diffIdx = Math.max(0, DIFFS.indexOf(activeDiffObj)) + 1;
    const scList = ['random', ...(typeof SCENES !== 'undefined' ? SCENES.map(s => s.id) : [])];
    const scIdx = Math.max(0, scList.indexOf(selectedScene)) + 1;
    const outfitKeys = typeof ZERO_OUTFITS !== 'undefined' ? Object.keys(ZERO_OUTFITS) : ['default', 'witch', 'crimson', 'astral'];
    const curOutfitId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
    const outIdx = Math.max(0, outfitKeys.indexOf(curOutfitId)) + 1;
    const outfitCtrl = isZero
      ? `<div class="p5-stepper" onclick="event.stopPropagation()">
           <button type="button" class="p5-tri-btn prev" onclick="stepMenuOutfit(-1)" aria-label="上一套战装"><i></i></button>
           <span class="p5-step-idx">${outIdx}/${outfitKeys.length}</span>
           <button type="button" class="p5-tri-btn next" onclick="stepMenuOutfit(1)" aria-label="下一套战装"><i></i></button>
         </div>`
      : `<span class="p5-gold-note">命定天赋</span>`;
    barsEl.innerHTML = `
      <div class="p5-row is-sel" onclick="stepMenuDiff(1)">
        <div class="p5-ico-edge"><div class="p5-ico-inner">🕯️</div></div>
        <div class="p5-notch" aria-hidden="true"></div>
        <div class="p5-bar-edge">
          <div class="p5-bar-fill">
            <div class="p5-bar-top">
              <span class="p5-bar-title">${activeDiffObj.badge} · ${activeDiffObj.name}</span>
              <div class="p5-stepper" onclick="event.stopPropagation()">
                <button type="button" class="p5-tri-btn prev" onclick="stepMenuDiff(-1)" aria-label="上一难度"><i></i></button>
                <span class="p5-step-idx">${diffIdx}/${DIFFS.length}</span>
                <button type="button" class="p5-tri-btn next" onclick="stepMenuDiff(1)" aria-label="下一难度"><i></i></button>
              </div>
            </div>
            <div class="p5-bar-cat">${activeDiffObj.desc}</div>
          </div>
        </div>
      </div>

      <div class="p5-row" onclick="stepMenuScene(1)">
        <div class="p5-ico-edge"><div class="p5-ico-inner">🗺️</div></div>
        <div class="p5-notch" aria-hidden="true"></div>
        <div class="p5-bar-edge">
          <div class="p5-bar-fill">
            <div class="p5-bar-top">
              <span class="p5-bar-title">层域 · ${activeSceneOpt.name}</span>
              <div class="p5-stepper" onclick="event.stopPropagation()">
                <button type="button" class="p5-tri-btn prev" onclick="stepMenuScene(-1)" aria-label="上一层域"><i></i></button>
                <span class="p5-step-idx">${scIdx}/${scList.length}</span>
                <button type="button" class="p5-tri-btn next" onclick="stepMenuScene(1)" aria-label="下一层域"><i></i></button>
              </div>
            </div>
            <div class="p5-bar-cat">${activeSceneOpt.sub}</div>
          </div>
        </div>
      </div>

      <div class="p5-row is-static">
        <div class="p5-ico-edge"><div class="p5-ico-inner">⚔️</div></div>
        <div class="p5-notch" aria-hidden="true"></div>
        <div class="p5-bar-edge">
          <div class="p5-bar-fill">
            <div class="p5-bar-top">
              <span class="p5-bar-title">初始兵装 · ${activeEndlessHero.loadout}</span>
              ${outfitCtrl}
            </div>
            <div class="p5-bar-cat">${activeEndlessHero.dashDesc || activeEndlessHero.perks || ''}</div>
          </div>
        </div>
      </div>`;
  }
}

function syncZeroOutfitUI() {
  if (typeof ZERO_OUTFITS === 'undefined') return;
  const curId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
  const cur = ZERO_OUTFITS[curId] || ZERO_OUTFITS.witch;
  const portUrl = typeof getZeroUiBustUrl === 'function' ? getZeroUiBustUrl(curId) : _menuAssetUrl(cur.uiBust || cur.portrait);
  const chibiUrl = _menuAssetUrl(cur.chibi);

  // 1) Update Story Hero Showcase IN-PLACE so .prep-zero-portrait DOM node identity never changes!
  const storyBox = document.getElementById('storyHeroShowcase');
  if (storyBox && storyBox.dataset.heroId) {
    const imgEl = storyBox.querySelector('.prep-zero-portrait');
    if (imgEl && imgEl.getAttribute('data-outfit-id') !== curId) {
      imgEl.setAttribute('data-outfit-id', curId);
      imgEl.src = portUrl;
    }
    const chibiEl = storyBox.querySelector('.prep-zero-chibi');
    if (chibiEl) chibiEl.src = chibiUrl;
  }
  if (typeof menuStage !== 'undefined' && menuStage === 'story') {
    const keyArtEl = document.getElementById('heroKeyArtBg');
    if (keyArtEl) {
      keyArtEl.style.backgroundImage = `url('${_menuAssetUrl('assets/spire/scene_1_vista.jpg')}')`;
    }
    _renderStoryP5Bars();
  }

  // 2) Update Outfit Modal Big Portrait + 3 Primary P5 Rows + Default Row
  const bigPort = document.getElementById('outfitBigPort');
  if (bigPort) bigPort.src = portUrl;
  const bigChibi = document.getElementById('outfitBigChibi');
  if (bigChibi) bigChibi.src = chibiUrl;

  const grid = document.getElementById('outfitModalGrid');
  if (grid && grid.children.length > 0) {
    const cards = grid.querySelectorAll('.outfit-pick-card');
    for (let i = 0; i < cards.length; i++) {
      const cid = cards[i].getAttribute('data-outfit');
      const isSel = cid === curId;
      cards[i].classList.toggle('active', isSel);
      cards[i].classList.toggle('is-sel', isSel);
      cards[i].setAttribute('aria-checked', isSel ? 'true' : 'false');
      const badge = cards[i].querySelector('.outfit-pick-state');
      if (badge) {
        badge.textContent = isSel ? '◆ 当前穿戴' : '点击换装';
        badge.classList.toggle('ready', isSel);
      }
    }
  }
  const defBtn = document.getElementById('outfitDefaultToggle');
  if (defBtn) {
    const isDef = curId === 'default';
    defBtn.classList.toggle('gold', isDef);
    defBtn.classList.toggle('active', isDef);
    defBtn.classList.toggle('is-sel', isDef);
    const defState = document.getElementById('outfitDefaultState');
    if (defState) {
      defState.textContent = isDef ? '◆ 当前穿戴' : '点击换装';
      defState.classList.toggle('ready', isDef);
    }
  }
  const cfmBtn = document.getElementById('outfitConfirmBtn');
  if (cfmBtn) {
    cfmBtn.textContent = _outfitModalNextStage === 'story'
      ? `◆ 身披「${cur.shortName}」· 提灯启程 →`
      : `◆ 确认穿戴「${cur.shortName}」`;
  }

  // 3) Update Endless Zero showcase if active
  if (typeof menuStage !== 'undefined' && menuStage === 'endless') {
    const cg = document.getElementById('classGrid');
    if (cg) {
      const zeroAvatarImg = cg.querySelector('.roster-avatar[data-cls="allrounder"] .roster-avatar-img');
      if (zeroAvatarImg) zeroAvatarImg.src = portUrl;
    }
    if (selectedEndlessCls === 'allrounder') {
      const zeroObj = CLASSES.find(c => c.id === 'allrounder');
      if (zeroObj) {
        _renderHeroSpotlight('endlessHeroShowcase', zeroObj, false);
        const activeDiffObj = DIFFS[selectedDiff] || DIFFS[1] || DIFFS[0];
        const curScObj = selectedScene === 'random'
          ? { id: 'random', code: 'ALL ACTS', name: '四幕轮转', sub: '循序踏入四大层域生态演进' }
          : (() => {
              const s = SCENES.find(x => x.id === selectedScene) || SCENES[0];
              return { id: s.id, code: 'SCENE', name: s.name.replace(/^.+·/, ''), sub: s.terrainSummary || s.bossHint };
            })();
        _renderEndlessP5Stage(zeroObj, activeDiffObj, curScObj);
      }
    }
  }
}

function selectZeroOutfitFromUI(outfitId) {
  if (typeof setSelectedZeroOutfit === 'function') {
    setSelectedZeroOutfit(outfitId, true);
    beep(560, 0.04, 'triangle', 0.035);
  }
}

function handleZeroOutfitRowClick(outfitId) {
  const curId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
  if (curId === outfitId) {
    confirmZeroOutfitModal();
    return;
  }
  selectZeroOutfitFromUI(outfitId);
}
globalThis.handleZeroOutfitRowClick = handleZeroOutfitRowClick;

function openZeroOutfitModal(opts) {
  const options = opts || {};
  _outfitModalNextStage = options.nextStage || '';
  const modal = document.getElementById('outfitModal');
  const grid = document.getElementById('outfitModalGrid');
  if (!modal || !grid || typeof ZERO_OUTFITS === 'undefined') {
    if (_outfitModalNextStage) openMenuStage(_outfitModalNextStage);
    return;
  }
  const vistaBg = document.getElementById('outfitVistaBg');
  if (vistaBg && vistaBg.style) {
    vistaBg.style.backgroundImage = `url('${_menuAssetUrl('assets/spire/v2/wind-pavilion.jpg')}')`;
  }
  const curId = typeof getActiveZeroOutfitId === 'function' ? getActiveZeroOutfitId() : 'witch';
  grid.innerHTML = ZERO_PRIMARY_OUTFIT_IDS.map(id => {
    const o = ZERO_OUTFITS[id];
    const isSel = id === curId;
    const pUrl = typeof getZeroUiBustUrl === 'function' ? getZeroUiBustUrl(id) : _menuAssetUrl(o.uiBust || o.portrait);
    return `
      <button type="button" class="p5-row outfit-pick-card${isSel ? ' active is-sel' : ''}" role="radio" aria-checked="${isSel ? 'true' : 'false'}" data-outfit="${id}" onclick="handleZeroOutfitRowClick('${id}')">
        <span class="p5-ico-edge">
          <span class="p5-ico-inner is-portrait">
            <img src="${pUrl}" alt="${o.name}" class="outfit-pick-portrait" decoding="async">
          </span>
        </span>
        <span class="p5-notch" aria-hidden="true"></span>
        <span class="p5-bar-edge">
          <span class="p5-bar-fill">
            <span class="p5-bar-top">
              <span class="p5-title-group">
                <span class="p5-bar-title outfit-pick-name">${o.name}</span>
                <span class="t-rarity-pill tp-4">${o.code}</span>
              </span>
              <span class="bar-prog-badge outfit-pick-state${isSel ? ' ready' : ''}">${isSel ? '◆ 当前穿戴' : '点击换装'}</span>
            </span>
            <span class="p5-bar-cat outfit-pick-desc">${o.desc}</span>
          </span>
        </span>
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
  const portUrl = typeof getHeroUiBustUrl === 'function'
    ? getHeroUiBustUrl(clsObj.id, activeOutfit ? activeOutfit.id : undefined)
    : _menuAssetUrl(activeOutfit ? (activeOutfit.uiBust || activeOutfit.portrait) : clsObj.portrait);
  const chibiUrl = _menuAssetUrl(activeOutfit ? activeOutfit.chibi : clsObj.chibi);
  if (isStoryLocked) {
    if (box.dataset.heroId === clsObj.id) {
      syncZeroOutfitUI();
      return;
    }
    box.dataset.heroId = clsObj.id;
    const outfitId = activeOutfit ? activeOutfit.id : 'default';
    box.innerHTML = `
      <div class="portrait-card-frame">
        <div class="pcf-back-slash" aria-hidden="true"></div>
        <img src="${portUrl}" data-outfit-id="${outfitId}" alt="零，白衣提灯少女" class="prep-zero-portrait bust-full" decoding="async">
        <div class="pcf-chibi-badge" title="实机四帧战斗精灵">
          <img src="${chibiUrl}" alt="零 实机精灵" class="prep-zero-chibi" decoding="async">
          <span>均衡</span>
        </div>
      </div>`;
    _renderStoryP5Bars();
    return;
  }
  const roleTag = activeOutfit ? activeOutfit.badge : clsObj.tag;
  const traitsArr = Array.isArray(clsObj.traits) ? clsObj.traits : [];
  const negTxt = clsObj.negTrait || '';
  const bioTxt = clsObj.bio || '';
  const weaponsArr = Array.isArray(clsObj.weaponsList) ? clsObj.weaponsList : [clsObj.loadout || ''];
  const isTraitsTab = heroDossierTab !== 'combat';

  const traitChipsHtml = traitsArr.map(t => `<span class="trait-chip pos">${t}</span>`).join('') +
    (negTxt ? `<span class="trait-chip neg">${negTxt}</span>` : '');
  const weaponChipsHtml = weaponsArr.map(w => `<span class="weapon-spec-pill">◆ ${w}</span>`).join('');

  box.innerHTML = `
    <div class="spotlight-info-col">
      <div class="spotlight-name">${clsObj.name} · ${roleTag}</div>
      ${isTraitsTab ? `
        <div class="dossier-pane">
          <div class="trait-chip-grid">${traitChipsHtml}</div>
          <p class="spotlight-bio">${bioTxt}</p>
        </div>
      ` : `
        <div class="dossier-pane">
          <div class="combat-spec-box">
            <div class="cs-label">STARTING ARMAMENTS  ·  初始随身兵装</div>
            <div class="weapon-spec-row">${weaponChipsHtml}</div>
          </div>
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
  const hudEl = document.getElementById('hud');
  if (hudEl) hudEl.classList.add('hidden');
  const bossWrapEl = document.getElementById('bossBarWrap');
  if (bossWrapEl) bossWrapEl.classList.add('hidden');
  const sm = document.getElementById('startMenu');
  if (sm && sm.setAttribute) sm.setAttribute('data-stage', menuStage);
  const hv = document.getElementById('menuHomeView');
  const sv = document.getElementById('menuStoryView');
  const ev = document.getElementById('menuEndlessView');
  if (hv) hv.classList.toggle('hidden', menuStage !== 'home');
  if (sv) sv.classList.toggle('hidden', menuStage !== 'story');
  if (ev) ev.classList.toggle('hidden', menuStage !== 'endless');
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
    vp.innerHTML = `<span class="ver-dot" aria-hidden="true">✦ </span><span class="ver-num">${APP_VERSION}</span>`;
    vp.setAttribute('aria-label', `当前版本 ${APP_VERSION}，点击查看版本更新记录`);
  }
  const appIconEl = document.getElementById('brandAppIcon');
  if (appIconEl) appIconEl.src = _menuAssetUrl('assets/spire/app_icon.jpg');
  const keyArtEl = document.getElementById('heroKeyArtBg');
  if (keyArtEl) {
    let bgRel = 'assets/spire/v2/title-clean.jpg';
    if (menuStage === 'story') {
      bgRel = 'assets/spire/scene_1_vista.jpg';
    } else if (menuStage === 'endless') {
      const scObj = (typeof SCENES !== 'undefined' && Array.isArray(SCENES) && selectedScene !== 'random')
        ? SCENES.find(x => x.id === selectedScene)
        : null;
      if (scObj && scObj.vistaImg) {
        bgRel = scObj.vistaImg;
      } else {
        const heroVistaMap = { allrounder: 'assets/spire/scene_1_vista.jpg', brawler: 'assets/spire/scene_1_vista.jpg', ranger: 'assets/spire/scene_2_vista.jpg', engineer: 'assets/spire/scene_3_vista.jpg', ghost: 'assets/spire/scene_3_vista.jpg', multitasker: 'assets/spire/scene_4_vista.jpg' };
        bgRel = heroVistaMap[selectedEndlessCls] || 'assets/spire/scene_1_vista.jpg';
      }
    }
    keyArtEl.style.backgroundImage = `url('${_menuAssetUrl(bgRel)}')`;
  }

  if (typeof SpireAudio !== 'undefined') SpireAudio.refreshButtons();
  if (typeof refreshSpireHome === 'function') refreshSpireHome();


  if ((menuStage === 'home' || menuStage === 'story') && typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.preloadStoryEntry === 'function') {
    const savedRun = (typeof SpireSave !== 'undefined' && SpireSave && typeof SpireSave.load === 'function') ? SpireSave.load() : null;
    const targetFloor = (menuStage === 'home' && savedRun && savedRun.checkpoint && savedRun.checkpoint.wave) ? savedRun.checkpoint.wave : 1;
    SpireDirector.preloadStoryEntry(targetFloor);
  }
  if (menuStage === 'home') return;
  if (menuStage === 'story') {
    _renderDiffButtons('storyDiffTabs', 'storyDiffDesc');
    const zeroObj = CLASSES.find(c => c.id === 'allrounder') || CLASSES[0];
    _renderHeroSpotlight('storyHeroShowcase', zeroObj, true);
    _renderStoryP5Bars();
    return;
  }
  _renderDiffButtons('diffTabs', 'diffDesc');

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
      b.innerHTML = `<span class="scene-code">${sc.code}</span><span class="scene-name">${sc.name}</span>`;
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

  const cg = document.getElementById('classGrid');
  if (cg) {
    cg.innerHTML = '';
    CLASSES.forEach(c => {
      const isAct = c.id === selectedEndlessCls;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
      btn.setAttribute('data-cls', c.id);
      btn.className = 'hm-item roster-avatar' + (isAct ? ' active on' : '');
      const rawPort = (c.id === 'allrounder' && typeof getActiveZeroOutfit === 'function') ? getActiveZeroOutfit().portrait : c.portrait;
      const portUrl = rawPort ? _menuAssetUrl(rawPort) : (typeof getHeroUiBustUrl === 'function' ? getHeroUiBustUrl(c.id) : '');
      const shortLbl = HERO_SHORT_NAMES[c.id] || c.name;
      btn.innerHTML = `<span class="hm-inner"><img src="${portUrl}" alt="${c.name}" class="roster-avatar-img" loading="eager" decoding="async"><span class="roster-avatar-name">${shortLbl}</span></span>`;
      btn.onclick = () => selectEndlessHero(c.id);
      cg.appendChild(btn);
    });
  }
  const activeEndlessHero = CLASSES.find(c => c.id === selectedEndlessCls) || CLASSES[1] || CLASSES[0];
  _renderHeroSpotlight('endlessHeroShowcase', activeEndlessHero, false);
  _renderEndlessP5Stage(activeEndlessHero, activeDiffObj, activeSceneOpt);
  const shortHeroName = activeEndlessHero ? (HERO_SHORT_NAMES[activeEndlessHero.id] || activeEndlessHero.name) : '烬羽';
  const sumLine = document.getElementById('endlessSummaryLine');
  if (sumLine && activeDiffObj && activeSceneOpt) {
    sumLine.textContent = `出击契约：${shortHeroName}  ·  ${activeDiffObj.badge}  ·  ${activeSceneOpt.name}`;
  }
  const goBtn = document.getElementById('startEndlessBtn');
  if (goBtn) {
    goBtn.textContent = `◆ 以「${shortHeroName}」开启无尽试炼 →`;
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
    if (typeof isWeaponSlotModalOpen === 'function' && isWeaponSlotModalOpen()) {
      if (e.preventDefault) e.preventDefault();
      closeWeaponSlotModal();
      return;
    }
    if (typeof isAudioModalOpen === 'function' && isAudioModalOpen()) {
      if (e.preventDefault) e.preventDefault();
      closeAudioModal();
      return;
    }
    const clm = document.getElementById('changelogModal');
    if (clm && !clm.classList.contains('hidden')) { if (e.preventDefault) e.preventDefault(); closeChangelogModal(); return; }
    const lm = document.getElementById('logModal');
    if (lm && !lm.classList.contains('hidden')) { if (e.preventDefault) e.preventDefault(); closeLogModal(); return; }
    const cm = document.getElementById('codexModal');
    if (cm && !cm.classList.contains('hidden')) { if (e.preventDefault) e.preventDefault(); closeCodex(); return; }
    const om = document.getElementById('outfitModal');
    if (om && !om.classList.contains('hidden')) { if (e.preventDefault) e.preventDefault(); closeZeroOutfitModal(); return; }
    if (state === 'shop' && typeof shopHubTab !== 'undefined' && shopHubTab === 'overview') {
      if (e.preventDefault) e.preventDefault();
      if (typeof setShopHubTab === 'function') setShopHubTab('shop');
      return;
    }
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
  if ((k === 'enter' || k === ' ') && typeof phase2ShatterFx !== 'undefined' && phase2ShatterFx && phase2ShatterFx.stage === 'nameplate') {
    if (e.preventDefault) e.preventDefault();
    if (typeof advancePhase2ShatterToArena === 'function') advancePhase2ShatterToArena();
    return;
  }
  if (k === 'enter' && bossCutscene) {
    const fadeDur = bossCutscene.fadeDur || 0.85;
    if ((bossCutscene.maxT - bossCutscene.t) > 0.60 && bossCutscene.t > fadeDur) {
      bossCutscene.t = fadeDur;
    }
    return;
  }
  if (k === 'escape') {
    if (state === 'wave' || state === 'paused') { if (e.preventDefault) e.preventDefault(); togglePause(); return; }
  } else if (k === ' ' && state === 'paused') {
    const subModalOpen = ['codexModal', 'audioModal', 'logModal', 'changelogModal'].some(id => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    });
    if (subModalOpen) return;
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

function resetJoy() {
  joy.id = null; joy.active = false; joy.lockedMove = false;
  joy.dx = 0; joy.dy = 0; joy.mag = 0;
  pinchDist = 0; pinchStartDist = 0; pinching = false;
  _auxDashTap = null; _dashBtnTouch = null;
  const dtBtn = typeof document !== 'undefined' && document.getElementById ? document.getElementById('dashTouchBtn') : null;
  if (dtBtn && dtBtn.classList) dtBtn.classList.remove('is-pressed');
}

function handleDashTouchClick(btn) {
  if (btn && typeof btn.blur === 'function') btn.blur();
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (now - _lastTouchDashAt < 450) return false;
  return typeof triggerSoulDash === 'function' ? triggerSoulDash() : false;
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
    !(typeof phase2ShatterFx !== 'undefined' && phase2ShatterFx && (phase2ShatterFx.stage === 'nameplate' || phase2ShatterFx.stage === 'rupture')) &&
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
    if (!r || r.width < 10 || r.height < 10 || r.width > 180 || r.height > 180) return false;
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

  cv.addEventListener('mousedown', e => {
    if (typeof phase2ShatterFx !== 'undefined' && phase2ShatterFx && phase2ShatterFx.stage === 'nameplate') {
      if (typeof advancePhase2ShatterToArena === 'function') advancePhase2ShatterToArena();
      return;
    }
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
    if (typeof phase2ShatterFx !== 'undefined' && phase2ShatterFx && phase2ShatterFx.stage === 'nameplate') {
      if (e.preventDefault) e.preventDefault();
      if (typeof advancePhase2ShatterToArena === 'function') advancePhase2ShatterToArena();
      return;
    }
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
        if (touches.length === 1 && canTouchBattle()) {
          adoptTouchAsJoy(touches[0]);
        }
      }
    } else if (touches.length === 1 && canTouchBattle()) {
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
let relics = [], sporeZones = [], spellZones = [], terrains = [], portals = [], portalPairCd = 0, banners = [], bossCutscene = null, phase2ShatterFx = null;
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
const _ASPD_TIERS = [0, 0.08, 0.16, 0.25], _ARM_TIERS = [0, 2, 5, 8], _ELEM_TIERS = [0, 0.12, 0.24, 0.38], _TECH_TIERS = [0, 0.14, 0.28, 0.44], _TECH_ASPD_TIERS = [0, 0.05, 0.10, 0.16];

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
  const padCnt = player.paddingStacks || 0;
  const padHp = padCnt > 0 ? Math.min(36 * padCnt, Math.floor(Math.max(0, player.mats || 0) / 60) * padCnt) : 0;
  const targetBonusHp = sb.hp + getRockCount() * 3 + padHp;
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
    spd: 194, spdMul: 1, dmgMul: 1, flatMelee: 0, flatRanged: 0, flatElem: 0, flatTech: 0, meleeBonus: 0, rangedBonus: 0, elemBonus: 0, techBonus: 0, atkSpd: 0.90, crit: 0.05, critDmg: 0,
    dodge: 0, dodgeCap: 0.80, maxSlots: 6, bonusTurrets: 0, laserTurrets: 0, shockTurrets: 0, totemTurrets: 0, mineLayers: 0, mineCd: 1.4,
    turretAspdBonus: 0, turretBastion: 0, mineHaste: 0, mineRadiusBonus: 0, turretAuraHeal: 0, turretElemInherit: false, turretMissile: false, _inTurretAura: false,
    turretCrit: false, turretCritScale: 0, turretElem: false, turretSalvo: false, _salvoCd: 0, bullCd: 0,
    staffHaste: 0, staffPierce: 0, staffRange: 0, dotHaste: 0, staffVolley: 0, staffBoltEvery4: false, elemCrit: false, archmageMeteor: false, _reactionCount: 0,
    magnet: typeof BASE_PICKUP_MAGNET === 'number' ? BASE_PICKUP_MAGNET : 143, harvest: 1, harvestFlat: 0, luck: 0, rangeBonus: 0, _displayRange: 140,
    pierceBonus: 0, bounceBonus: 0, bounceAmpDmg: 0, falloffMitigation: 0, farShotBonus: 0, closeShotBonus: 0, rangedBossAmp: 0, shopDiscount: 0, freeRerolls: 0, shopVisits: 0, shopRerollRaw: 1, bonusTrees: 0,
    enemySlow: 0, thorns: 0, cyberball: 0, critHeal: 0, critMeleeHeal: false, ailmentLeech: 0, rangeToDmg: false, hpToDmg: 0, minorHpToDmg: false, armorToDmg: 0, minorArmorToDmg: false, regenToDmg: false, hasAnvil: false, healBonus: 0,
    burnChance: 0, chillChance: 0, chillDmgBonus: 0, freezeChance: 0, freezeDeathNova: false, poisonChance: 0, maxPoisonStacks: 8, plagueSpread: false, elemSynergy: false, reactionBlast: false, minorReactionBlast: false,
    meleeBossGuard: 0, meleeSweepBonus: 0, meleeKnockBonus: 0, meleeShockwave: false, meleeBulletCutChance: 0, meleeSunder: false, meleeShieldEvery12: 0, _meleeHitAcc: 0, meleeHitSpd: false, meleeHitSpdT: 0, kenshinFourthSlash: false, kenshinFifthSlash: false, _meleeSwingSeq: 0, strideQuake: false, _strideDist: 0, blastChance: 0, explosionScale: 1, napalmBlast: false, bloodNova: false,
    interest: 0, teslaCount: 0, teslaCd: 1.0, healDropBonus: 0, chillSlowT: 0, inSpore: false,
    dashCdMul: 1, dashFreezeNova: false, dashSurge: false, dashSurgeT: 0, shieldPulseNova: false, executeLowHp: 0,
    invulnBonus: 0, fastShield: false, soulBolt: false, noSlow: false, bossCratesQueued: 0, mythicCratesQueued: 0,
    mobSpawnBonus: 0, crateMatBonus: 0, matHealEvery25: 0, _matPickAcc: 0, paddingStacks: 0, standStillBuff: false, _stillTime: 0,
    spicySauce: false, gardenPlots: 0, _gardenCd: 11, sacrificeCrown: false, _sacTick: 0, harvestToDmg: false, luckyRerollChance: 0, luckToCritDmg: false,
    bossCritAmp: 0, critMatChance: 0, _waveCritMats: 0, giantBelt: false, critBounce: false, overflowCritConvert: false,
    rangedPelletsBonus: 0, extraShotChance: 0, rangedKillDashRefund: 0, celestialRailEvery14: false, _rangedShotsAcc: 0, dodgeHealChance: 0, spdToDmg: false, minorSpdToDmg: false, dodgeWindBlades: false, _dodgeBladeCd: 0, dodgeToAspd: false,
    lowHpFrenzy: false, lifestealToDmg: false, minorLeechToDmg: false, lifestealIcdMul: 1, bloodShield: false, _bloodShieldPool: 0, phoenixFeather: false, _phoenixUsedWave: -1,
    staffZoneScale: 0, staffZoneDurBonus: 0, pocketFactory: false, _pocketTurretsSpawned: 0, blastPull: false, staffDoubleCastChance: 0,
    doubleMatChance: 0, healSpdBoost: false, healSpdT: 0, allBossAmp: 0, wisdomRamp: false, _waveElapsed: 0, crowdAspdBanner: false, vigilanteStacks: 0, vigilanteGained: 0, xpGainBonus: 0, harvestCompoundBoost: false, ironbloodGrit: false,
    survivalActsCleared: {}, survivalCratesQueued: 0, survivalGoldCratesQueued: 0, survivalFlawlessCnt: 0,
    _fissureHitCd: 0, _fissureLeapHintCd: 0, recentCrateIds: [],
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
    player.spdMul += 0.08; player.dodge += 0.06; player.atkSpd += 0.20; player.crit += 0.12; player.rangeBonus += 65; player.flatRanged = 1; player.flatElem = 1;
    player.weapons.push(makeWeapon('smg', 1), makeWeapon('icicle', 1));
  } else if (cls === 'brawler') {
    player.maxHp += 8; player.hp += 8; player.armor += 1; player.regen += 1.1; player.flatMelee = 2; player.meleeBonus = 0.08; player.rangeBonus -= 10;
    player.weapons.push(makeWeapon('katana', 1), makeWeapon('stick', 1));
  } else if (cls === 'engineer') {
    player.armor += 2; player.regen += 1.5; player.flatTech = 2; player.techBonus = 0.06; player.bonusTurrets = 1;
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
  if (typeof closeWeaponSlotModal === 'function') closeWeaponSlotModal(true);
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
  phase2ShatterFx = null;
  if (typeof pendingBossCutscene !== 'undefined') pendingBossCutscene = null;
  survivalTrialQueued = false;
  survivalTrialWave = false;
  survivalTrialHits = 0;
  survivalFissures = [];
  survivalSkyVolleys = [];
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
  const critDmgPct = Math.round((typeof getEffectiveCritMult === 'function' ? getEffectiveCritMult() : (1.95 + (player.critDmg || 0))) * 100);
  const rng = getTotalRangeBonus();
  const rngTxt = rng >= 0 ? `+${rng}` : `${rng}`;
  const harv = Math.round(player.harvestFlat || 0);
  const tAspdBase = typeof TURRET_BASE_ASPD_MUL === 'number' ? TURRET_BASE_ASPD_MUL : 1.20;
  const turretAspdBonusTotal = (player.turretAspdBonus || 0) + (setB.turretAspd || 0);
  const showTurretAspd = turretAspdBonusTotal > 0 || (setB.counts && setB.counts.tech > 0) ||
    ((player.bonusTurrets || 0) + (player.laserTurrets || 0) + (player.shockTurrets || 0) + (player.totemTurrets || 0)) > 0;
  const turretAspdPct = Math.round(tAspdBase * (1 + turretAspdBonusTotal) * 100);
  const fMel = player.flatMelee || 0, fRng = player.flatRanged || 0, fElm = player.flatElem || 0, fTec = player.flatTech || 0;
  const flatStatSpans =
    `<span>近战 <b>+${fMel}</b></span>` +
    `<span>远程 <b>+${fRng}</b></span>` +
    `<span>元素 <b>+${fElm}</b></span>` +
    `<span>工程 <b>+${fTec}</b></span>`;
  const stEl = document.getElementById(statsId);
  if (stEl) {
    stEl.innerHTML =
      `<span>生命 <b>${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}</b>${player.maxShield ? ` <small style="color:#89c4d4">(+${Math.ceil(player.shield)}护盾)</small>` : ''}</span>` +
      `<span>护甲 <b>${arm}</b> <small>(${mit >= 0 ? '-' : '+'}${Math.abs(mit)}%伤)</small></span>` +
      `<span>再生 <b>${player.regen.toFixed(1)}/s</b></span>` +
      `<span>汲血 <b>${Math.round(player.lifesteal * 100)}%</b></span>` +
      `<span>全伤 <b>${dmgPct}%</b></span>` +
      flatStatSpans +
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
        setPills.push(`<span class="set-pill${active ? ' active' : ''}" style="cursor:pointer" title="${def.desc}" onclick="openShopSynergyModal('${key}')">${def.label} ${c}/${nextStep} · ${def.desc}</span>`);
      }
    }
    if (player.items) {
      for (const [iid, cnt] of Object.entries(player.items)) {
        if (cnt > 0) {
          const meta = ITEMS.find(x => x.id === iid);
          if (meta) {
            const pillIco = typeof renderItemEmblemHtml === 'function' ? renderItemEmblemHtml(meta, meta.tier, meta.icon, 'pill-art-ico') : meta.icon;
            const rPill = typeof renderRarityPillHtml === 'function' ? renderRarityPillHtml(meta.tier, 'mini') : '';
            setPills.push(`<span class="set-pill" style="cursor:pointer" title="${meta.desc}" onclick="openShopRelicModal('${iid}')">${pillIco} ${meta.name}${cnt > 1 ? ' ×' + cnt : ''} ${rPill}</span>`);
          }
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
