// 📖 《烬塔残响》圣典全图鉴交互与原画展示引擎（1:1 复刻 ui_p5_final.html #s-codex · 常驻左右翻页箭头 + P5 不规则黑底白边横条）
let codexTab = 'weapons', codexFilter = 'all', codexPrevState = 'menu', codexSynergyOpen = false;
let _codexTrackBound = false;

function toggleCodexSynergy() {
  codexSynergyOpen = !codexSynergyOpen;
  beep(475, 0.03, 'triangle', 0.025);
  renderCodex();
}
globalThis.toggleCodexSynergy = toggleCodexSynergy;

function _spireImgUrl(relPath) {
  if (!relPath) return '';
  if (typeof SpireAssets !== 'undefined' && typeof SpireAssets.resolve === 'function') {
    return SpireAssets.resolve(relPath);
  }
  return relPath;
}

function syncCodexFilterArrows() {
  const track = typeof document !== 'undefined' ? document.getElementById('codexFilters') : null;
  const prevBtn = typeof document !== 'undefined' ? document.getElementById('codexPrevBtn') : null;
  const nextBtn = typeof document !== 'undefined' ? document.getElementById('codexNextBtn') : null;
  if (!track || !prevBtn || !nextBtn) return;
  const maxScroll = Math.max(0, (track.scrollWidth || 0) - (track.clientWidth || 0));
  const sl = track.scrollLeft || 0;
  if (maxScroll <= 4) {
    const btns = track.querySelectorAll ? track.querySelectorAll('.codex-filter') : [];
    let actIdx = -1;
    for (let i = 0; i < btns.length; i++) {
      if (btns[i].classList && btns[i].classList.contains('active')) { actIdx = i; break; }
    }
    prevBtn.classList.toggle('at-end', actIdx <= 0);
    nextBtn.classList.toggle('at-end', btns.length <= 1 || actIdx >= btns.length - 1);
    return;
  }
  prevBtn.classList.toggle('at-end', sl <= 2);
  nextBtn.classList.toggle('at-end', sl >= maxScroll - 2);
}
globalThis.syncCodexFilterArrows = syncCodexFilterArrows;

function scrollCodexFilters(dir) {
  const track = typeof document !== 'undefined' ? document.getElementById('codexFilters') : null;
  if (!track) return false;
  const step = dir < 0 ? -1 : 1;
  const maxScroll = Math.max(0, (track.scrollWidth || 0) - (track.clientWidth || 0));
  beep(485, 0.028, 'triangle', 0.024);
  if (maxScroll > 4) {
    const nextLeft = Math.max(0, Math.min(maxScroll, (track.scrollLeft || 0) + step * 210));
    track.scrollLeft = nextLeft;
    syncCodexFilterArrows();
    return true;
  }
  const btns = track.querySelectorAll ? Array.from(track.querySelectorAll('.codex-filter')) : [];
  if (btns.length <= 1) return false;
  let actIdx = btns.findIndex(b => b.classList && b.classList.contains('active'));
  if (actIdx < 0) actIdx = 0;
  const targetIdx = Math.max(0, Math.min(btns.length - 1, actIdx + step));
  if (targetIdx !== actIdx && btns[targetIdx]) {
    btns[targetIdx].click();
    return true;
  }
  syncCodexFilterArrows();
  return false;
}
globalThis.scrollCodexFilters = scrollCodexFilters;

function _bindCodexFilterTrackEvents() {
  if (_codexTrackBound || typeof document === 'undefined') return;
  const track = document.getElementById('codexFilters');
  if (!track || !track.addEventListener) return;
  _codexTrackBound = true;
  track.addEventListener('scroll', () => syncCodexFilterArrows(), { passive: true });
  track.addEventListener('wheel', ev => {
    if (!ev) return;
    const dy = ev.deltaY || 0;
    const dx = ev.deltaX || 0;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 0) {
      if (ev.preventDefault) ev.preventDefault();
      track.scrollLeft = (track.scrollLeft || 0) + dy;
      syncCodexFilterArrows();
    }
  }, { passive: false });
}

function openCodex(initialTab) {
  if (state === 'wave') pauseGame();
  if (state !== 'codex') codexPrevState = state;
  if (initialTab) { codexTab = initialTab; codexFilter = 'all'; }
  codexSynergyOpen = false;
  beep(520, 0.05, 'triangle', 0.04);
  const standeeImg = typeof document !== 'undefined' ? document.getElementById('codexStandeeImg') : null;
  if (standeeImg) {
    standeeImg.src = typeof getHeroUiBustUrl === 'function' ? getHeroUiBustUrl('ghost') : _spireImgUrl('assets/spire/ui_art/ui_bust_qingyu.png');
  }
  const vistaBg = typeof document !== 'undefined' ? document.getElementById('codexVistaBg') : null;
  if (vistaBg && vistaBg.style) {
    vistaBg.style.backgroundImage = `url('${_spireImgUrl('assets/spire/ui_art/ui_shop_qingyu_scene.jpg')}')`;
  }
  renderCodex();
  const modal = document.getElementById('codexModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.scrollTop = 0;
  }
  syncCodexFilterArrows();
}

function closeCodex() {
  const modal = document.getElementById('codexModal');
  if (modal) modal.classList.add('hidden');
  beep(380, 0.04, 'triangle', 0.035);
}

function setCodexTab(tab) {
  codexTab = tab;
  codexFilter = 'all';
  codexSynergyOpen = false;
  beep(490, 0.035, 'triangle', 0.03);
  renderCodex();
  const sc = document.getElementById('codexScroll');
  if (sc) sc.scrollTop = 0;
  const track = document.getElementById('codexFilters');
  if (track) track.scrollLeft = 0;
  syncCodexFilterArrows();
}

function setCodexFilter(f) {
  codexFilter = f;
  if (SET_DEFS && SET_DEFS[f]) codexSynergyOpen = false;
  beep(460, 0.03, 'triangle', 0.025);
  renderCodex();
  const sc = document.getElementById('codexScroll');
  if (sc) sc.scrollTop = 0;
  const track = document.getElementById('codexFilters');
  if (track && track.querySelector) {
    const actBtn = track.querySelector('.codex-filter.active');
    if (actBtn && typeof actBtn.scrollIntoView === 'function') {
      try { actBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) { actBtn.scrollIntoView(); }
    }
  }
  syncCodexFilterArrows();
}

function _codexRarityPill(tier, extraCls = '') {
  if (typeof renderRarityPillHtml === 'function') return renderRarityPillHtml(tier, extraCls);
  const t = Math.max(1, Math.min(5, Number(tier) || 1));
  return `<span class="t-rarity-pill tp-${t}${extraCls ? ' ' + extraCls : ''}">${(typeof TIER_NAMES !== 'undefined' && TIER_NAMES[t]) || ('阶' + t)}</span>`;
}

function openCodexWeaponDetail(wId) {
  const w = WEAPONS && WEAPONS[wId];
  const modal = typeof document !== 'undefined' ? document.getElementById('weaponActionModal') : null;
  const card = typeof document !== 'undefined' ? document.getElementById('weaponActionCard') : null;
  if (!w || !modal || !card) return;
  beep(515, 0.035, 'triangle', 0.03);
  const minT = w.minTier || 1;
  const wpnArt = (typeof renderWeaponEmblemHtml === 'function') ? renderWeaponEmblemHtml(wId, Math.max(3, minT), '', w.icon) : w.icon;
  const setLabel = SET_DEFS[w.set] ? SET_DEFS[w.set].label : w.set;
  const scaleBadges = typeof renderWeaponScalingBadgesHtml === 'function' ? renderWeaponScalingBadgesHtml(w, wId) : '';
  const evoHtml = Array.isArray(w.evos) && w.evos.length
    ? `<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
        <div style="font-size:11.5px;font-weight:900;color:var(--p5-gold)">◆ 五阶神话 · 二选一超限觉醒分支：</div>
        ${w.evos.map(ev => `<div style="padding:7px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,92,138,0.45)">
          <div class="p5-title-group" style="margin-bottom:3px">
            <b style="color:${ev.color || '#ff8ca6'};font-size:12.5px">★ ${ev.name}</b>
            ${_codexRarityPill(5, 'mini')}
            <span class="tag">${ev.tag || '神话进化'}</span>
          </div>
          <div style="font-size:11.5px;color:#dad4e4;line-height:1.45">${ev.desc}</div>
        </div>`).join('')}
      </div>`
    : '';
  card.className = `wpn-action-card p5-modal-card t${minT}`;
  card.innerHTML = `
    <div class="wpn-act-head">
      <div class="item-emblem t${Math.max(3, minT)}">${wpnArt}</div>
      <div class="card-meta" style="flex:1;min-width:0">
        <div class="p5-title-group">
          <div class="wpn-act-title">${w.name}</div>
          ${_codexRarityPill(minT)}
        </div>
        <div class="card-badges">
          <span class="tag">${setLabel}</span>
          ${scaleBadges}
        </div>
      </div>
    </div>
    <div class="stat-chips">
      <span class="stat-chip">伤害 ${w.dmg}${w.pellets ? '×' + w.pellets : ''}</span>
      <span class="stat-chip">冷却 ${w.cd}s</span>
      <span class="stat-chip">射程 ${w.range}</span>
      <span class="stat-chip">基准 ◇${w.cost}</span>
    </div>
    <div class="wpn-act-desc">${w.desc}</div>
    ${evoHtml}
    <div class="wpn-act-btns" style="margin-top:10px">
      <div class="wpn-act-btns-row">
        <button type="button" class="btn btn-go" style="flex:1;justify-content:center" onclick="closeWeaponSlotModal(true)">关闭档案</button>
      </div>
    </div>`;
  modal.classList.remove('hidden');
}
globalThis.openCodexWeaponDetail = openCodexWeaponDetail;

function renderCodex() {
  const tabsEl = document.getElementById('codexTabs');
  const filterBarEl = document.getElementById('codexFilterBar');
  const filtersEl = document.getElementById('codexFilters');
  const bannerEl = document.getElementById('codexBanner');
  const gridEl = document.getElementById('codexGrid');
  if (!tabsEl || !gridEl || !filtersEl) return;
  _bindCodexFilterTrackEvents();

  const supCount = ((typeof CRATE_SUPPLIES !== 'undefined' && Array.isArray(CRATE_SUPPLIES)) ? CRATE_SUPPLIES.length : 0) +
    ((typeof UPGRADES !== 'undefined' && Array.isArray(UPGRADES)) ? UPGRADES.length : 0);

  const tabs = [
    { id: 'weapons',  ico: '⚔️', title: '兵装', count: Object.keys(WEAPONS).length },
    { id: 'items',    ico: '💍', title: '遗物', count: ITEMS.length },
    { id: 'heroes',   ico: '🕯️', title: '角色', count: CLASSES.length },
    { id: 'monsters', ico: '👹', title: '魔物', count: MONSTER_CODEX.length },
    { id: 'world',    ico: '🗺️', title: '生态', count: SCENES.length + (typeof TERRAIN_CODEX !== 'undefined' ? TERRAIN_CODEX.length : 0) + SPECIAL_RELICS.length },
    { id: 'supplies', ico: '📜', title: '刻印', count: supCount }
  ];
  tabsEl.innerHTML = '';
  tabs.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.className = 'hub-tab-btn codex-tab' + (codexTab === t.id ? ' on active' : '');
    b.innerHTML = `<span>${t.ico} ${t.title}(${t.count})</span>`;
    b.onclick = () => setCodexTab(t.id);
    tabsEl.appendChild(b);
  });

  filtersEl.innerHTML = '';
  bannerEl.innerHTML = '';
  bannerEl.classList.remove('is-weapons-banner', 'is-synergy-open');
  gridEl.innerHTML = '';

  const buildFilterBar = opts => {
    if (filterBarEl) filterBarEl.classList.toggle('is-empty', !opts || opts.length === 0);
    (opts || []).forEach(o => {
      const wrap = document.createElement('div');
      wrap.className = 'p5-chip-wrap';
      const fb = document.createElement('button');
      fb.type = 'button';
      fb.setAttribute('data-filter', o.id);
      const isAct = codexFilter === o.id;
      fb.className = 'p5-chip codex-filter' + (isAct ? ' on active' : '');
      fb.textContent = o.label;
      fb.onclick = () => setCodexFilter(o.id);
      wrap.appendChild(fb);
      filtersEl.appendChild(wrap);
    });
    syncCodexFilterArrows();
  };

  if (codexTab === 'weapons') {
    const wEntries = Object.entries(WEAPONS);
    const setCounts = {};
    wEntries.forEach(([, w]) => { setCounts[w.set] = (setCounts[w.set] || 0) + 1; });
    buildFilterBar([
      { id: 'all', label: `全部(${wEntries.length})` },
      ...Object.entries(SET_DEFS).map(([k, v]) => ({
        id: k,
        label: `${v.label.replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, '')}(${setCounts[k] || 0})`
      })),
      { id: 'melee', label: '近战斩击' },
      { id: 'ranged', label: '远程射击' },
      { id: 'staff_only', label: '法杖秘术' }
    ]);
    bannerEl.classList.toggle('is-synergy-open', !!codexSynergyOpen);
    bannerEl.classList.toggle('is-weapons-banner', true);
    if (SET_DEFS[codexFilter]) {
      const selSet = SET_DEFS[codexFilter];
      bannerEl.innerHTML = `
        <div class="codex-syn-bar">
          <span><b>${selSet.label} (${setCounts[codexFilter] || 0}把)</b> · ${selSet.desc}</span>
          <button type="button" class="sys-mini-btn" onclick="setCodexFilter('all')">全部兵装 ✕</button>
        </div>`;
    } else {
      const setEntries = Object.entries(SET_DEFS);
      const pillsHtml = setEntries
        .map(([k, s]) => `<span class="set-pill" role="button" tabindex="0" onclick="setCodexFilter('${k}')"><b>${s.label} (${setCounts[k] || 0})</b> ${s.desc}</span>`)
        .join('');
      bannerEl.innerHTML = `
        <button type="button" class="codex-syn-bar" onclick="toggleCodexSynergy()">
          <span class="codex-syn-summary">✦ 六大守誓兵装羁绊（古誓 · 星芒 · 封魂铳 · 黑曜重装 · 四象元素 · 发条机巧 · 点击词条查看五阶觉醒）</span>
          <span class="codex-syn-pill">${codexSynergyOpen ? '收起 ▴' : '展开羁绊 ▾'}</span>
        </button>
        <div class="codex-syn-list">${pillsHtml}</div>`;
    }
    wEntries.forEach(([id, w]) => {
      if (codexFilter === 'melee' && !w.melee) return;
      if (codexFilter === 'ranged' && (w.melee || w.isStaff)) return;
      if (codexFilter === 'staff_only' && !w.isStaff) return;
      if (SET_DEFS[codexFilter] && w.set !== codexFilter) return;
      const minT = w.minTier || 1;
      const wpnArt = (typeof renderWeaponEmblemHtml === 'function')
        ? renderWeaponEmblemHtml(id, Math.max(3, minT), '', w.icon)
        : w.icon;
      const evoNames = Array.isArray(w.evos) ? w.evos.map(e => `★${e.name}`).join(' / ') : '';
      const setLbl = SET_DEFS[w.set] ? SET_DEFS[w.set].label : w.set;
      const row = document.createElement('div');
      row.className = `p5-row codex-card t${minT}`;
      row.onclick = () => openCodexWeaponDetail(id);
      row.innerHTML = `
        <div class="p5-ico-edge"><div class="p5-ico-inner">${wpnArt}</div></div>
        <div class="p5-notch" aria-hidden="true"></div>
        <div class="p5-bar-edge">
          <div class="p5-bar-fill">
            <div class="p5-bar-top">
              <div class="p5-title-group">
                <span class="p5-bar-title codex-card-title" title="${w.name}">${w.name}</span>
                ${_codexRarityPill(minT)}
              </div>
              <div class="p5-bar-right">
                <span class="bar-prog-badge">${setLbl}</span>
                <span class="bar-prog-badge ready">◇${w.cost}</span>
              </div>
            </div>
            <div class="p5-bar-cat">伤害 ${w.dmg}${w.pellets ? '×' + w.pellets : ''} · 间隔 ${w.cd}s · 射程 ${w.range} · ${w.desc}</div>
            <div class="p5-bar-foot">
              <span class="bar-prog-badge">${evoNames || '点按查看神话分支'}</span>
              <span class="p5-foot-tags">${typeof renderWeaponScalingBadgesHtml === 'function' ? renderWeaponScalingBadgesHtml(w, id) : ''}</span>
            </div>
          </div>
        </div>`;
      gridEl.appendChild(row);
    });
  } else if (codexTab === 'items') {
    const tCnt = { 1: 0, 2: 0, 3: 0, 4: 0 };
    ITEMS.forEach(it => { tCnt[it.tier] = (tCnt[it.tier] || 0) + 1; });
    buildFilterBar([
      { id: 'all', label: `全部遗物(${ITEMS.length})` },
      { id: '1', label: `普通(${tCnt[1]})` },
      { id: '2', label: `精良(${tCnt[2]})` },
      { id: '3', label: `史诗(${tCnt[3]})` },
      { id: '4', label: `传说(${tCnt[4]})` }
    ]);
    bannerEl.innerHTML = `<span>◆ 全部 <b>${ITEMS.length} 件记忆遗物</b> · 点击任意遗物横条可调阅完整效果与叠加上限档案。</span>`;
    ITEMS.forEach(it => {
      if (codexFilter !== 'all' && String(it.tier) !== codexFilter) return;
      const row = document.createElement('div');
      row.className = `p5-row codex-card t${it.tier}`;
      const itemArt = typeof renderItemEmblemHtml === 'function' ? renderItemEmblemHtml(it) : it.icon;
      row.onclick = () => { if (typeof openShopRelicModal === 'function') openShopRelicModal(it.id); };
      row.innerHTML = `
        <div class="p5-ico-edge"><div class="p5-ico-inner">${itemArt}</div></div>
        <div class="p5-notch" aria-hidden="true"></div>
        <div class="p5-bar-edge">
          <div class="p5-bar-fill">
            <div class="p5-bar-top">
              <div class="p5-title-group">
                <span class="p5-bar-title codex-card-title" title="${it.name}">${it.name}</span>
                ${_codexRarityPill(it.tier)}
              </div>
              <div class="p5-bar-right">
                ${it.maxCount ? `<span class="bar-prog-badge">${it.maxCount === 1 ? '唯一' : '上限×' + it.maxCount}</span>` : ''}
                <span class="bar-prog-badge ready">◇${it.cost}</span>
              </div>
            </div>
            <div class="p5-bar-cat">${it.desc}</div>
            <div class="p5-bar-foot">
              <span class="bar-prog-badge">记忆圣遗物</span>
              <span class="p5-foot-tags">${typeof renderRelicScopeBadgesHtml === 'function' ? renderRelicScopeBadgesHtml(it) : ''}</span>
            </div>
          </div>
        </div>`;
      gridEl.appendChild(row);
    });
  } else if (codexTab === 'heroes') {
    buildFilterBar([]);
    bannerEl.innerHTML = `<span>◆ 六位誓约者均配备无框去背半身立绘、实机四帧精灵与独立【青焰瞬步】主动战技。</span>`;
    CLASSES.forEach(c => {
      const portSrc = typeof getHeroUiBustUrl === 'function' ? getHeroUiBustUrl(c.id) : _spireImgUrl(c.portrait);
      const row = document.createElement('div');
      row.className = 'p5-row codex-card t4';
      row.innerHTML = `
        <div class="p5-ico-edge"><div class="p5-ico-inner">${portSrc ? `<img src="${portSrc}" alt="${c.name}">` : c.icon}</div></div>
        <div class="p5-notch" aria-hidden="true"></div>
        <div class="p5-bar-edge">
          <div class="p5-bar-fill">
            <div class="p5-bar-top">
              <div class="p5-title-group">
                <span class="p5-bar-title codex-card-title">${c.name}</span>
                <span class="t-rarity-pill tp-4">${c.tag}</span>
              </div>
              <span class="bar-prog-badge ready">${c.dashName || '青焰瞬步'}</span>
            </div>
            <div class="p5-bar-cat">${c.perks}${c.dashDesc ? ` · 战技：${c.dashDesc}` : ''}</div>
            <div class="p5-bar-foot">
              <span class="bar-prog-badge">初始兵装 · ${c.loadout}</span>
            </div>
          </div>
        </div>`;
      gridEl.appendChild(row);
    });
  } else if (codexTab === 'monsters') {
    buildFilterBar([
      { id: 'all', label: `全部魔物(${MONSTER_CODEX.length})` },
      { id: 'normal', label: '层域傀儡' },
      { id: 'scene', label: '层域精英' },
      { id: 'boss', label: '统领与守誓主宰' },
      { id: 'special', label: '无尽祭坛首领' }
    ]);
    bannerEl.innerHTML = `<span>◆ 第 6 / 10 / 14 层刷新先锋统领，第 4 / 8 / 12 / 16 层迎战四幕双阶段守誓主宰。</span>`;
    MONSTER_CODEX.forEach(m => {
      if (codexFilter !== 'all' && m.cat !== codexFilter) return;
      const tierNum = m.cat === 'special' ? 4 : (m.cat === 'boss' ? 3 : (m.cat === 'scene' ? 2 : 1));
      const sprUrl = _spireImgUrl(m.sprite);
      const row = document.createElement('div');
      row.className = `p5-row codex-card t${tierNum}`;
      row.innerHTML = `
        <div class="p5-ico-edge"><div class="p5-ico-inner">${sprUrl ? `<img src="${sprUrl}" alt="${m.name}">` : m.icon}</div></div>
        <div class="p5-notch" aria-hidden="true"></div>
        <div class="p5-bar-edge">
          <div class="p5-bar-fill">
            <div class="p5-bar-top">
              <div class="p5-title-group">
                <span class="p5-bar-title codex-card-title">${m.name}</span>
                ${_codexRarityPill(tierNum)}
              </div>
              <span class="bar-prog-badge">${m.wave}</span>
            </div>
            <div class="p5-bar-cat">${m.desc}</div>
            <div class="p5-bar-foot">
              <span class="bar-prog-badge">${m.badge}</span>
              <span class="p5-foot-tags"><span class="tag">${m.stats}</span></span>
            </div>
          </div>
        </div>`;
      gridEl.appendChild(row);
    });
  } else if (codexTab === 'world') {
    buildFilterBar([
      { id: 'all', label: '全部奇观' },
      { id: 'scene', label: '四大烬塔层域' },
      { id: 'terrain', label: '层域标志机关' },
      { id: 'relic', label: '无尽共鸣祭坛' }
    ]);
    bannerEl.innerHTML = `<span>◆ 依次穿越<b>雨夜长桥 → 永冻冰窟 → 倒悬钟楼 → 日蚀镜界</b>，每幕配备专属环境音景与地形机关。</span>`;
    if (codexFilter === 'all' || codexFilter === 'scene') {
      SCENES.forEach(sc => {
        const row = document.createElement('div');
        row.className = 'p5-row codex-card t3';
        row.innerHTML = `
          <div class="p5-ico-edge"><div class="p5-ico-inner">${sc.icon}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge">
            <div class="p5-bar-fill">
              <div class="p5-bar-top">
                <div class="p5-title-group">
                  <span class="p5-bar-title codex-card-title">${sc.name}</span>
                  ${_codexRarityPill(3)}
                </div>
                <span class="bar-prog-badge ready">${sc.eventIcon} ${sc.eventName}</span>
              </div>
              <div class="p5-bar-cat">${sc.eventDesc}</div>
              <div class="p5-bar-foot">
                <span class="bar-prog-badge">${sc.exclMobName}</span>
                <span class="p5-foot-tags"><span class="tag">${sc.terrainSummary || ''}</span></span>
              </div>
            </div>
          </div>`;
        gridEl.appendChild(row);
      });
    }
    if ((codexFilter === 'all' || codexFilter === 'terrain') && typeof TERRAIN_CODEX !== 'undefined') {
      TERRAIN_CODEX.forEach(tr => {
        const row = document.createElement('div');
        row.className = 'p5-row codex-card t2';
        row.innerHTML = `
          <div class="p5-ico-edge"><div class="p5-ico-inner">${tr.icon}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge">
            <div class="p5-bar-fill">
              <div class="p5-bar-top">
                <div class="p5-title-group">
                  <span class="p5-bar-title codex-card-title">【层域机关】${tr.name}</span>
                  ${_codexRarityPill(2)}
                </div>
                <span class="bar-prog-badge">${tr.scenes}</span>
              </div>
              <div class="p5-bar-cat">${tr.desc}</div>
            </div>
          </div>`;
        gridEl.appendChild(row);
      });
    }
    if (codexFilter === 'all' || codexFilter === 'relic') {
      SPECIAL_RELICS.forEach(rel => {
        const row = document.createElement('div');
        row.className = 'p5-row codex-card t4';
        row.innerHTML = `
          <div class="p5-ico-edge"><div class="p5-ico-inner">${rel.icon}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge">
            <div class="p5-bar-fill">
              <div class="p5-bar-top">
                <div class="p5-title-group">
                  <span class="p5-bar-title codex-card-title">【记忆祭坛】${rel.name}</span>
                  ${_codexRarityPill(4)}
                </div>
                <span class="bar-prog-badge ready">唤醒 ${rel.bossIcon} ${rel.bossName}</span>
              </div>
              <div class="p5-bar-cat">无尽模式第 17 层起现世 · 驻留 1.1 秒唤醒记忆首领 · ${rel.rewardDesc}</div>
            </div>
          </div>`;
        gridEl.appendChild(row);
      });
    }
  } else if (codexTab === 'supplies') {
    const suppliesArr = (typeof CRATE_SUPPLIES !== 'undefined' && Array.isArray(CRATE_SUPPLIES)) ? CRATE_SUPPLIES : [];
    const upgradesArr = (typeof UPGRADES !== 'undefined' && Array.isArray(UPGRADES)) ? UPGRADES : [];
    buildFilterBar([
      { id: 'all', label: `全部(${suppliesArr.length + upgradesArr.length})` },
      { id: 'supply', label: `秘匣补给(${suppliesArr.length})` },
      { id: 'upgrade', label: `升级刻印(${upgradesArr.length})` }
    ]);
    bannerEl.innerHTML = `<span>◆ 收录遗物匣 <b>${suppliesArr.length} 种魂灯秘髓补给</b> 与升级共鸣 <b>${upgradesArr.length} 枚记忆刻印</b>。</span>`;
    if (codexFilter === 'all' || codexFilter === 'supply') {
      suppliesArr.forEach(sup => {
        const t = sup.tier || 3;
        const supArt = typeof renderItemEmblemHtml === 'function' ? renderItemEmblemHtml(sup, t) : sup.icon;
        const row = document.createElement('div');
        row.className = `p5-row codex-card t${t}`;
        row.innerHTML = `
          <div class="p5-ico-edge"><div class="p5-ico-inner">${supArt}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge">
            <div class="p5-bar-fill">
              <div class="p5-bar-top">
                <div class="p5-title-group">
                  <span class="p5-bar-title codex-card-title">${sup.name}</span>
                  ${_codexRarityPill(t)}
                </div>
                <span class="bar-prog-badge ready">秘匣补给</span>
              </div>
              <div class="p5-bar-cat">${sup.desc}</div>
            </div>
          </div>`;
        gridEl.appendChild(row);
      });
    }
    if (codexFilter === 'all' || codexFilter === 'upgrade') {
      upgradesArr.forEach(u => {
        const row = document.createElement('div');
        row.className = 'p5-row codex-card t2';
        row.innerHTML = `
          <div class="p5-ico-edge"><div class="p5-ico-inner">${u.icon}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge">
            <div class="p5-bar-fill">
              <div class="p5-bar-top">
                <div class="p5-title-group">
                  <span class="p5-bar-title codex-card-title">${u.name}</span>
                  ${_codexRarityPill(2)}
                </div>
                <span class="bar-prog-badge">升级记忆刻印</span>
              </div>
              <div class="p5-bar-cat">${u.desc}</div>
            </div>
          </div>`;
        gridEl.appendChild(row);
      });
    }
  }
  syncCodexFilterArrows();
}

function openChangelogModal() {
  if (state === 'wave') pauseGame();
  beep(510, 0.045, 'triangle', 0.04);
  const titleEl = document.getElementById('changelogTitle');
  if (titleEl && typeof APP_VERSION !== 'undefined') {
    titleEl.textContent = `烬塔纪元志  ·  ${APP_VERSION}`;
  }
  const listEl = document.getElementById('changelogList');
  if (listEl && typeof CHANGELOG_HISTORY !== 'undefined') {
    listEl.innerHTML = '';
    CHANGELOG_HISTORY.forEach((entry, idx) => {
      const card = document.createElement('div');
      card.className = 'cl-card' + (idx === 0 ? ' latest' : '');
      card.innerHTML = `
        <div class="cl-head">
          <span class="cl-ver">${entry.ver}</span>
          <span class="cl-tag">${entry.tag || '版本更新'}</span>
          <span class="cl-date">${entry.date}</span>
        </div>
        <div class="cl-title">${entry.title}</div>
        <ul class="cl-items">${(entry.items || []).map(line => `<li>${line}</li>`).join('')}</ul>`;
      listEl.appendChild(card);
    });
    listEl.scrollTop = 0;
  }
  const modal = document.getElementById('changelogModal');
  if (modal) modal.classList.remove('hidden');
}

function closeChangelogModal() {
  const modal = document.getElementById('changelogModal');
  if (modal) modal.classList.add('hidden');
  beep(380, 0.04, 'triangle', 0.035);
}

(function bindChangelogBackdrop() {
  const modal = document.getElementById('changelogModal');
  if (modal && modal.addEventListener) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeChangelogModal();
    });
  }
})();
