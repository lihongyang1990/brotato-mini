// V2.1 story director. Scene motion is compositor-only and never runs during combat.
const SpireDirector = (function () {
  'use strict';
  const D = SpireStoryV2, A = 'assets/spire/v2/', V3 = 'assets/spire/v3/', VERSION = D.version;
  const CAST = {
    zero: { name: '零', roleTag: '第九百九十九夜的提灯人', accent: '#a9d9dc' },
    qingyu: { name: '青羽', roleTag: '风亭行商', accent: '#9dc7b6' },
    jinyu: { name: '烬羽', roleTag: '雨桥守誓剑姬', accent: '#dba5ae' },
    astria: { name: '艾丝特莉亚', roleTag: '永冻护城星使', accent: '#aed3e9' },
    jialan: { name: '伽蓝', roleTag: '倒悬钟楼守望者', accent: '#c1b2dc' },
    eclipse: { name: '日蚀圣女', roleTag: '镜中的黑日半身', accent: '#dcc79f' }
  };
  Object.keys(CAST).forEach(k => { CAST[k].id = k; CAST[k].portrait = k === 'zero' ? 'assets/spire/ui_art/port_zero_bust.png' : ('assets/spire/ui_art/ui_bust_' + k + '.png'); });
  const BOSS = ['jinyu', 'astria', 'jialan', 'eclipse'];
  const ACTS = ['雨夜长桥', '永冻冰窟', '倒悬钟楼', '日蚀镜界'];
  const MEMORY = {
    jinyu: [
      '褪色守誓剑穗',
      '那是一个还没有落下冷雨的傍晚。你蹲在风亭的青石阶上，笨拙地替烬羽系上这条绯红剑穗。系到第三回仍是个歪歪扭扭的死结，她偏过头嫌你手慢，你却笑着又勒紧了一分：“丑一点才好，刀挥得再快也甩不掉。”',
      '后来灾厄降临，她的佩刀在九百九十八次守桥之战里崩断过无数回，鬓侧的白狐半面也添了裂痕，唯有刀柄末端那个歪斜的死结，穿过漫天夜雨始终未曾拆动半分。'
    ],
    astria: [
      '冻停银怀表',
      '掀开的银怀表内侧，嵌着一幅泛暖的旧日小像——尚未知晓灾厄的你正依偎在艾丝特莉亚肩畔微笑。而表针永远冻停的那一夜，黑日裂空，失控的魂灯化作吞噬生灵魂魄的灾厄，整座王城都在哀鸣。',
      '是你死死攥住艾丝特莉亚的衣袖，哭着求她降下永冻之咒，将全城百姓封入静止的时间。她含泪应下了这份孤寂的托付：“我会替你护住他们的呼吸，一个也不放弃——直到你找到终结长夜的那一天。”'
    ],
    jialan: [
      '逆转黄金发条',
      '封塔前的最后一夜，你站在倒悬钟楼的工作台旁，替左颊添上小小补丁的少年人偶调校好机芯，将这卷黄金发条装入他的心核，录下了近乎残忍的死令：“如果有一天我忘了所有事，又提着灯回来……请拦住我。哪怕我求你，也别替我开门。”',
      '向来沉默守序的伽蓝怔了很久，才轻轻握了一下你的指尖。你忍着泪水又重复了一遍：“答应我。”从此九百九十八个长夜，他一面拧紧脑后的发条钥锁死上行铁门，一面在每一处悬空险境默默护住你的性命。'
    ],
    qingyu: [
      '苍翠记忆风翎',
      '走入塔底石棺之前，你将所有的真相与后路托付给青羽，指着铜壶里尚未饮尽的甜茶轻声许诺：“等我醒来，一定回来把这杯茶喝完。”她摘下尖顶帽间最珍爱的苍翠风翎放进你掌心，笑着说风亭的黄铜风灯会一直为你亮着。',
      '这一等便是九百九十八次轮回。她一次次看着陌生的你淋雨走过桥头，一次次将粗陶杯没有缺口的一侧转到你手边，却从不强行替你做决定——直到第九百九十九夜，你终于重新唤出了她的名字。'
    ]
  };
  let queue = [], cur = null, ui = null, seen = {}, read = {}, history = [];
  let preview = false, replayDone = null, previousFocus = null;
  let auto = false, skipRead = false, hidden = false, logOpen = false, focused = true;
  let hitstop = 0, lastText = '', lastHint = '', lastNext = '', soundT = 0;
  let motion = [], cameraMotion = null, artSignature = '', motionPreset = 'still', artScale = 1, cameraMaxScale = 1;
  let lastPortraitSpeaker = null;
  let pointerTrack = null, suppressDragClick = false;
  const systemReduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let prefs = { textScale: 1, instantText: false, reducedMotion: systemReduce, typeSound: false, textSpeed: 34 };
  try {
    if (window.localStorage) {
      Object.assign(prefs, JSON.parse(window.localStorage.getItem('spire-reading-v2') || '{}'));
      read = JSON.parse(window.localStorage.getItem('spire-read-lines-v2') || '{}');
    }
  } catch (_) {}
  const once = fn => { let done = false; return () => { if (!done) { done = true; if (fn) fn(); } }; };
  const _artCache = Object.create(null);
  function fastStoryPath(path) {
    if (typeof path === 'string' && /^assets\/spire\/v[23]\/(?!.*-reference\.png$).+\.png$/i.test(path)) {
      return path.slice(0, -4) + '.jpg';
    }
    return path;
  }
  function source(path) {
    if (!path) return '';
    if (typeof SpireAssets !== 'undefined' && SpireAssets && typeof SpireAssets.resolve === 'function') {
      return SpireAssets.resolve(path);
    }
    const fast = fastStoryPath(path);
    const inline = window.__SPIRE_INLINE_ASSETS__;
    if (inline) return inline[fast] || inline[path] || path;
    return fast;
  }
  function warmArtPath(path, highPriority) {
    if (!path || typeof Image === 'undefined') return null;
    if (typeof SpireAssets !== 'undefined' && SpireAssets && typeof SpireAssets.loadImage === 'function') {
      const cachedImg = SpireAssets.loadImage(path, null, null, !!highPriority);
      return cachedImg ? { img: cachedImg, ready: true, decoded: true } : { img: null, ready: false, decoded: false };
    }
    const url = source(path);
    if (!url) return null;
    let entry = _artCache[url];
    if (!entry) {
      const img = new Image();
      img.decoding = 'async';
      if (highPriority) { try { img.fetchPriority = 'high'; } catch (_) {} }
      entry = { img, ready: false, decoded: false };
      _artCache[url] = entry;
      const markReady = () => {
        entry.ready = true;
        if (!entry.decoded && typeof img.decode === 'function') {
          entry.decoded = true;
          try { const p = img.decode(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
        }
      };
      img.onload = markReady;
      img.src = url;
      if (img.complete && (img.naturalWidth || img.width)) markReady();
    } else if (highPriority && !entry.ready) {
      try { entry.img.fetchPriority = 'high'; } catch (_) {}
    }
    return entry;
  }
  const isStory = () => !(typeof endlessMode !== 'undefined' && endlessMode);
  const floorData = n => D.floors[Math.max(0, Math.min(15, Number(n) - 1))];
  const bossKey = n => BOSS[Math.max(0, Math.min(3, Math.ceil(Number(n) / 4) - 1))];
  const vista = n => ({ path: 'assets/spire/scene_' + (Math.floor((n - 1) / 4) + 1) + '_vista.jpg' });
  const pavilion = () => ({ path: A + 'wind-pavilion.png' });
  function atlas(file, panel) {
    const cols = file === 'qingyu-atlas.png' ? 3 : 2;
    const rows = file === 'qingyu-atlas.png' || file === 'endings-atlas.png' ? 1 : 2;
    return { path: A + file, cols, rows, panel: panel || 0, safe: cols === 3 ? [.015, .006, .970, .875] : rows === 1 ? [.012, .065, .976, .923] : [.012, .110, .976, .878] };
  }
  const cg = (file, fallback, mood) => ({ path: V3 + file + '.png', fallback, mood: mood || 'still', standalone: true });
  const cgJpg = (file, fallback, mood) => ({ path: V3 + file + '.jpg', fallback, mood: mood || 'still', standalone: true });
  const PHASE2_FORMS = {
    jinyu:   { over: '誓约解封 · 绯夜燃魂', title: '烬羽 · 双刀烬羽织',       sub: '第二阶段 · 封鞘胁差出鞘 & 燃烬羽织展开' },
    astria:  { over: '誓约解封 · 碎冕极光', title: '艾丝特莉亚 · 六翼凛冬礼装', sub: '第二阶段 · 八音盒化翼 & 护心怀表苏醒' },
    jialan:  { over: '第十三响 · 逆时神枢', title: '伽蓝 · 星晷超载少主装',   sub: '第二阶段 · 赤金发条过载 & 时针分针双剑' },
    eclipse: { over: '破镜真我 · 宿命同源', title: '日蚀圣女 · 黑曜金纹镜像礼装', sub: '第二阶段 · 半幅焚纱露瞳 & 黑金双生神装' }
  };
  function phase2ShotArts(key) {
    const fb = atlas(key + '-atlas.png', 2);
    if (key === 'jinyu') return [
      cg('jinyu-clash', fb, 'tension'),
      cgJpg('jinyu-p2-unsheathe', fb, 'rupture'),
      cgJpg('jinyu-p2-awaken', fb, 'rupture')
    ];
    if (key === 'astria') return [
      cgJpg('astria-p2-tear', fb, 'frozen'),
      cgJpg('astria-p2-prism', fb, 'rupture'),
      cg('astria-wings', fb, 'frozen')
    ];
    if (key === 'jialan') return [
      Object.assign(fb, { mood: 'time' }),
      cgJpg('jialan-p2-windkey', fb, 'rupture'),
      cgJpg('jialan-p2-awaken', fb, 'time')
    ];
    return [
      cg('eclipse-mirror', fb, 'mirror'),
      cgJpg('eclipse-p2-unveil', fb, 'rupture'),
      cgJpg('eclipse-p2-awaken', fb, 'mirror')
    ];
  }
  function bossArt(key, stage) {
    const panel = { first_meeting: 0, pre_battle: 1, phase2: 2, boss_defeated: 3 }[stage];
    const fallback = atlas(key + '-atlas.png', panel);
    if (stage === 'phase2') return phase2ShotArts(key)[2];
    if (key === 'jinyu' && stage === 'pre_battle') return cg('jinyu-clash', fallback, 'tension');
    if (key === 'jinyu' && stage === 'boss_defeated') return cg('jinyu-farewell', fallback, 'grief');
    if (key === 'jialan' && stage === 'boss_defeated') return cg('jialan-clock', fallback, 'time');
    if (key === 'eclipse' && (stage === 'first_meeting' || stage === 'pre_battle')) return cg('eclipse-mirror', fallback, 'mirror');
    return Object.assign(fallback, { mood: stage === 'boss_defeated' ? 'grief' : 'still' });
  }
  function memoryArt(key) {
    if (key === 'qingyu') return cg('qingyu-rain', atlas('qingyu-atlas.png', 2), 'reunion');
    if (key === 'jinyu') return cg('jinyu-farewell', atlas('jinyu-atlas.png', 3), 'grief');
    if (key === 'jialan') return cg('jialan-clock', atlas('jialan-atlas.png', 3), 'memory');
    // Objects in the original farewell frames matter more here than the transformation CG.
    return Object.assign(atlas(key + '-atlas.png', 3), { mood: 'memory' });
  }
  function speakerId(name) { return Object.keys(CAST).find(k => CAST[k].name === name) || null; }
  function castPortraitPath(key) {
    if (key === 'zero' && typeof getActiveZeroOutfit === 'function') {
      const o = getActiveZeroOutfit();
      if (o && (o.uiBust || o.portrait)) return o.uiBust || o.portrait;
    }
    if (key && key !== 'zero' && cur && cur.id && /\.phase2\b/.test(cur.id)) {
      return 'assets/spire/port_' + key + '_p2.jpg';
    }
    return CAST[key].portrait;
  }
  const lineKey = (line, id, i) => VERSION + ':' + (line.lineId || id + '.line.' + i) + ':' + line.text;
  function persistRead() { try { if (window.localStorage) window.localStorage.setItem('spire-read-lines-v2', JSON.stringify(read)); } catch (_) {} }
  function css(el, key, value) { if (el.style.setProperty) el.style.setProperty(key, value); else el.style[key] = value; }
  function node(tag, cls, parent, textValue) {
    const el = document.createElement(tag); if (cls) el.className = cls;
    if (textValue !== undefined) el.textContent = textValue;
    if (parent) parent.appendChild(el); return el;
  }
  function button(label, cls, parent, fn, aria) {
    const el = node('button', cls, parent, label); el.type = 'button';
    if (aria) el.setAttribute('aria-label', aria);
    el.addEventListener('click', ev => { if (ev.stopPropagation) ev.stopPropagation(); fn(); }); return el;
  }
  function focus(el) { if (el && el.focus) el.focus({ preventScroll: true }); }
  function ensureUi() {
    if (ui) return;
    const root = node('section', 'spire-narrative hidden', document.body); root.id = 'spireNarrative'; root.tabIndex = -1;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', '剧情演出');
    const frame = node('div', 'story-film-frame', root), backdrop = node('div', 'story-art-backdrop', frame), artWindow = node('div', 'story-art-window', frame), camera = node('div', 'story-camera', artWindow), image = node('img', 'story-scene-image', camera);
    image.alt = ''; image.draggable = false; image.decoding = 'async'; image.loading = 'eager';
    try { image.fetchPriority = 'high'; } catch (_) {}
    backdrop.style.backgroundImage = 'url("' + source(A + 'title-clean.png') + '")';
    image.addEventListener('load', () => {
      artWindow.classList.remove('art-loading');
      if (image.src) backdrop.style.backgroundImage = 'url("' + image.src + '")';
      fitArt();
    });
    image.addEventListener('error', () => {
      const art = image._storyArt;
      if (art && art.fallback) setArt(art.fallback);
      else { artWindow.classList.remove('art-loading'); frame.classList.add('art-unavailable'); }
    });
    const atmosphere = node('div', 'story-atmosphere', frame), particles = [];
    for (let i = 0; i < 8; i++) particles.push(node('i', 'story-particle', atmosphere));
    const light = node('div', 'story-ambient-light', frame), shutter = node('div', 'story-scene-transition', frame);
    node('div', 'story-film-shade', root);
    const left = node('img', 'story-portrait story-portrait-left', root), right = node('img', 'story-portrait story-portrait-right', root);
    left.alt = right.alt = ''; left.draggable = right.draggable = false;
    left.decoding = right.decoding = 'async'; left.loading = right.loading = 'eager';
    const toolbar = node('div', 'story-toolbar', root), chapterWrap = node('div', 'story-chapter-wrap', toolbar), actBadge = node('span', 'story-p5-act-badge', chapterWrap, 'STORY'), chapter = node('div', 'story-chapter', chapterWrap), controls = node('div', 'story-controls', toolbar);
    actBadge.setAttribute('aria-hidden', 'true');
    const logBtn = button('回看', '', controls, toggleLog, '回看已显示的对白');
    const autoBtn = button('自动', '', controls, toggleAutoPlay, '切换自动阅读');
    button('隐藏', '', controls, () => setHidden(true), '隐藏界面，下一次点击恢复');
    const skipBtn = button('跳过已读', '', controls, () => { skipRead = !skipRead; syncControls(); }, '只跳过已经读过的台词');
    const sizeBtn = button('字 100%', 'story-compact-control', controls, () => { const sizes = [1, 1.15, 1.3]; setPreferences({ textScale: sizes[(sizes.indexOf(prefs.textScale) + 1) % 3] }); });
    const closeBtn = button('退出预览', 'story-exit-preview', controls, closeReplay);
    const dialog = node('div', 'story-dialogue', root); dialog.setAttribute('data-speaker-side', 'left');
    const p5Ghost = node('div', 'story-p5-ghost', dialog), p5Tail = node('div', 'story-p5-tail', dialog);
    p5Ghost.setAttribute('aria-hidden', 'true'); p5Tail.setAttribute('aria-hidden', 'true');
    const nameRow = node('div', 'story-name-row', dialog);
    const listener = node('img', 'story-listener-avatar', nameRow); listener.alt = ''; listener.draggable = false;
    const name = node('span', 'story-speaker', nameRow), role = node('span', 'story-speaker-role', nameRow), progress = node('span', 'story-line-count', nameRow);
    const p5Shell = node('div', 'story-p5-shell', dialog), p5Fill = node('div', 'story-p5-fill', p5Shell);
    const text = node('p', 'story-dialogue-text', p5Fill); text.setAttribute('aria-hidden', 'true');
    const accessible = node('p', 'story-sr-only', root); accessible.setAttribute('aria-live', 'polite'); accessible.setAttribute('aria-atomic', 'true');
    const footer = node('div', 'story-dialogue-footer', p5Fill), readHint = node('span', 'story-read-hint', footer);
    const nextBtn = button('▶ 继续', 'story-next', footer, () => advanceOrSkip(false));
    const cinematic = node('div', 'story-cinematic-caption', root); cinematic.setAttribute('data-speaker-side', 'none');
    const cinGhost = node('div', 'story-p5-ghost', cinematic); cinGhost.setAttribute('aria-hidden', 'true');
    const cinNameRow = node('div', 'story-name-row story-cin-name-row', cinematic);
    const cinName = node('span', 'story-cinematic-speaker story-speaker', cinNameRow), cinRole = node('span', 'story-speaker-role', cinNameRow), cinProgress = node('span', 'story-line-count', cinNameRow);
    const cinShell = node('div', 'story-p5-shell', cinematic), cinFill = node('div', 'story-p5-fill', cinShell);
    const cinText = node('p', 'story-dialogue-text story-cinematic-text', cinFill); cinText.setAttribute('aria-hidden', 'true');
    const cinFooter = node('div', 'story-dialogue-footer', cinFill), cinReadHint = node('span', 'story-read-hint', cinFooter);
    const cinNext = button('▶ 继续', 'story-cinematic-next', cinFooter, () => advanceOrSkip(false));
    const titleCard = node('div', 'story-title-card', root), overline = node('span', 'story-title-overline', titleCard), title = node('h2', '', titleCard), subtitle = node('p', '', titleCard);
    const choices = node('div', 'story-choice-panel', root); choices.setAttribute('aria-label', '剧情选项');
    const restore = button('◆ 显示界面', 'story-restore', root, () => setHidden(false));
    const log = node('div', 'story-log hidden', root); log.setAttribute('role', 'dialog'); log.setAttribute('aria-label', '对白回看');
    const logHead = node('div', 'story-log-head', log); node('h2', '', logHead, 'BACKLOG · 对白回看');
    const logClose = button('✕ 返回剧情', '', logHead, toggleLog), logList = node('div', 'story-log-list', log); logList.tabIndex = 0;
    ui = { root, frame, artWindow, backdrop, camera, image, atmosphere, particles, light, shutter, left, right, toolbar, actBadge, chapter, logBtn, autoBtn, skipBtn, sizeBtn, closeBtn, dialog, p5Tail, p5Shell, p5Fill, nameRow, listener, name, role, progress, text, accessible, readHint, nextBtn, cinematic, cinNameRow, cinName, cinRole, cinProgress, cinText, cinReadHint, cinNext, titleCard, overline, title, subtitle, choices, restore, log, logList, logClose };
    // A reading gesture must never become a "next line" click after native scrolling.
    root.addEventListener('pointerdown', ev => { pointerTrack = { id: ev.pointerId, x: ev.clientX, y: ev.clientY }; suppressDragClick = false; if (cur) cur.readHold = 1.2; }, { passive: true });
    root.addEventListener('pointermove', ev => { if (pointerTrack && pointerTrack.id === ev.pointerId && Math.hypot(ev.clientX - pointerTrack.x, ev.clientY - pointerTrack.y) > 8) { suppressDragClick = true; if (cur) cur.readHold = 1.2; } }, { passive: true });
    root.addEventListener('pointerup', () => { pointerTrack = null; }, { passive: true });
    root.addEventListener('pointercancel', () => { pointerTrack = null; suppressDragClick = true; }, { passive: true });
    root.addEventListener('click', ev => { if (!suppressDragClick || ev.detail === 0) return; suppressDragClick = false; if (ev.preventDefault) ev.preventDefault(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }, true);
    // 全屏触屏任意处继续：除顶栏按钮、选项面板、对白回看与恢复按钮外，点击画幅/台词框/黑边任意区域均推进剧情
    root.addEventListener('click', ev => {
      if (hidden) {
        if (ev.target !== restore) setHidden(false);
        return;
      }
      const tgt = ev && ev.target;
      if (tgt && (toolbar.contains(tgt) || choices.contains(tgt) || log.contains(tgt) || restore.contains(tgt) || (tgt.tagName && /^(BUTTON|INPUT|SELECT)$/i.test(tgt.tagName)))) return;
      advanceOrSkip(false);
    });
    for (const paragraph of [text, cinText]) paragraph.addEventListener('scroll', () => { if (cur) { cur.readHold = 1.2; cur.wait = 0; } refreshReadingScroll(); }, { passive: true });
    // viewport.js coalesces window/visualViewport changes and calls onResize once.
    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('pointerup', () => { pointerTrack = null; }, true);
    window.addEventListener('blur', () => { focused = false; pointerTrack = null; suppressDragClick = true; syncMotionState(); }); window.addEventListener('focus', () => { focused = true; syncMotionState(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { focused = false; pointerTrack = null; suppressDragClick = true; } else focused = !document.hasFocus || document.hasFocus(); syncMotionState(); });
    applyPreferences();
  }
  function handleKey(ev) {
    if (!isActive()) return;
    if (isRuptureHold()) {
      const rk = (ev.key || '').toLowerCase();
      if ([' ', 'enter', 'escape', 'a', 'h', 'l'].includes(rk)) {
        if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        if (ev.preventDefault) ev.preventDefault();
      }
      return;
    }
    const k = (ev.key || '').toLowerCase();
    if (k === 'tab') {
      if (hidden) { if (ev.preventDefault) ev.preventDefault(); focus(ui.restore); return; }
      if (!ui.root.querySelectorAll) return;
      const within = logOpen ? ui.log : ui.root;
      const items = Array.from(within.querySelectorAll('button:not([disabled]), [tabindex="0"]')).filter(el => el.offsetParent !== null);
      if (!items.length) return;
      if (ev.shiftKey && (document.activeElement === items[0] || document.activeElement === ui.root)) { ev.preventDefault(); focus(items[items.length - 1]); }
      else if (!ev.shiftKey && document.activeElement === items[items.length - 1]) { ev.preventDefault(); focus(items[0]); }
      return;
    }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!['escape', ' ', 'enter', 'a', 'h', 'l', 's', 'w', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) return;
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); else if (ev.stopPropagation) ev.stopPropagation();
    const isButton = ev.target && /^(BUTTON|INPUT|SELECT)$/.test(ev.target.tagName || '');
    if ((k === 'enter' || k === ' ') && isButton && !hidden) return;
    if (ev.preventDefault) ev.preventDefault(); if (ev.repeat) return;
    if (hidden) { setHidden(false); return; }
    if (logOpen) { if (k === 'escape' || k === 'l') toggleLog(); return; }
    if (k === 'escape') { if (preview) closeReplay(); else setHidden(true); }
    else if (k === 'l') toggleLog(); else if (k === 'h') setHidden(true); else if (k === 'a') toggleAutoPlay();
    else if (k === ' ' || k === 'enter') advanceOrSkip(false);
  }
  function setPreferences(values) {
    values = values || {};
    if ('textScale' in values) prefs.textScale = Math.max(1, Math.min(1.3, Number(values.textScale) || 1));
    if ('textSpeed' in values) prefs.textSpeed = Math.max(12, Math.min(70, Number(values.textSpeed) || 34));
    for (const k of ['instantText', 'reducedMotion', 'typeSound']) if (k in values) prefs[k] = !!values[k];
    try { if (window.localStorage) window.localStorage.setItem('spire-reading-v2', JSON.stringify(prefs)); } catch (_) {}
    applyPreferences(); return getPreferences();
  }
  function getPreferences() { return Object.assign({}, prefs); }
  function applyPreferences() {
    if (!ui) return; css(ui.root, '--story-text-scale', String(prefs.textScale));
    ui.root.classList.toggle('story-reduced-motion', !!prefs.reducedMotion); ui.sizeBtn.textContent = '字 ' + Math.round(prefs.textScale * 100) + '%';
    if (prefs.instantText && cur) reveal();
    if (prefs.reducedMotion) stopMotion(); else if (cur && !motion.length) startSceneMotion(false);
    syncMotionState();
    refreshReadingScroll();
  }
  function syncControls() {
    if (!ui) return;
    ui.autoBtn.textContent = auto ? '自动 · 开' : '自动'; ui.autoBtn.setAttribute('aria-pressed', String(auto));
    ui.skipBtn.textContent = skipRead ? '正在跳过已读' : '跳过已读'; ui.skipBtn.setAttribute('aria-pressed', String(skipRead));
    ui.closeBtn.classList.toggle('hidden', !preview); ui.autoBtn.disabled = ui.skipBtn.disabled = !!(cur && cur.kind === 'choice');
  }
  function focusAdvanceTarget() {
    if (!ui) return;
    if (cur && cur.kind === 'choice') {
      const opt = ui.choices.querySelector('button:not([disabled])');
      if (opt) { focus(opt); return; }
    }
    const btn = (cur && cur.kind === 'cinematic') ? ui.cinNext : ui.nextBtn;
    focus((btn && btn.offsetParent !== null) ? btn : ui.root);
  }
  function setHidden(value) { hidden = !!value; if (ui) ui.root.classList.toggle('story-ui-hidden', hidden); syncMotionState(); if (!hidden) focusAdvanceTarget(); }
  function toggleLog() {
    if (!cur || hidden) return; logOpen = !logOpen; ui.log.classList.toggle('hidden', !logOpen);
    if (logOpen) {
      ui.logList.innerHTML = ''; if (!history.length) node('p', '', ui.logList, '已完整显示的对白会留在这里。');
      for (const entry of history) { const row = node('div', 'story-log-row', ui.logList); node('span', '', row, entry.speaker || '旁白'); node('p', '', row, entry.text); }
      ui.logList.scrollTop = ui.logList.scrollHeight; focus(ui.logClose);
    } else focusAdvanceTarget();
    syncMotionState();
  }
  function setAutoPlay(value) { auto = !!value; if (cur && cur.kind === 'choice') auto = false; syncControls(); }
  function toggleAutoPlay() { setAutoPlay(!auto); return auto; }
  // Only scene changes create animations. update() never touches the camera or particles.
  function animate(el, frames, options, role) {
    if (!el || !el.animate || prefs.reducedMotion || !cur) return null;
    const animation = el.animate(frames, options); motion.push({ animation, role: role || 'scene' }); return animation;
  }
  function stopRole(role) {
    motion = motion.filter(item => { if (item.role !== role) return true; item.animation.cancel(); return false; });
  }
  function stopMotion() {
    for (const item of motion) item.animation.cancel(); motion = []; cameraMotion = null;
    if (ui) { ui.camera.style.transform = ''; ui.shutter.style.opacity = '0'; ui.atmosphere.classList.add('hidden'); ui.light.style.opacity = '0'; }
  }
  function motionPaused() { return !cur || !focused || !!document.hidden || logOpen || hidden || prefs.reducedMotion; }
  function syncMotionState() {
    if (!ui) return; const paused = motionPaused(); ui.root.classList.toggle('story-motion-paused', paused);
    for (const item of motion) {
      if (paused && item.animation.playState === 'running') item.animation.pause();
      else if (!paused && item.animation.playState === 'paused') item.animation.play();
    }
  }
  function startSceneMotion(transition) {
    stopMotion(); if (!cur || !ui || !ui.image._storyArt) return;
    const art = ui.image._storyArt;
    motionPreset = art.mood || (cur.id && cur.id.indexOf('player.defeat') === 0 ? 'grief' : 'quiet');
    ui.root.setAttribute('data-mood', motionPreset);
    cameraMaxScale = art.cols ? 1 : 1.08;
    if (prefs.reducedMotion) { syncMotionState(); return; }
    const preset = {
      wake: ['translate3d(0,0.5%,0) scale(1.015)', 'translate3d(0,-0.5%,0) scale(1.065)', 18000, 'dust'],
      lantern: ['translate3d(-0.5%,0,0) scale(1.025)', 'translate3d(0.3%,0,0) scale(1.06)', 21000, 'dust'],
      reunion: ['translate3d(0.55%,0,0) scale(1.035)', 'translate3d(-0.55%,0,0) scale(1.065)', 25000, 'rain'],
      tension: ['translate3d(0.2%,0,0) scale(1.025)', 'translate3d(-0.2%,-0.2%,0) scale(1.08)', 16000, 'rain'],
      rupture: ['translate3d(0,0.4%,0) scale(1.08)', 'translate3d(0,-0.2%,0) scale(1.025)', 9000, 'embers'],
      grief: ['translate3d(0,-0.2%,0) scale(1.065)', 'translate3d(0,0.2%,0) scale(1.015)', 25000, 'rain'],
      frozen: ['translate3d(-0.65%,0,0) scale(1.04)', 'translate3d(0.65%,-0.2%,0) scale(1.075)', 23000, 'snow'],
      time: ['translate3d(0.5%,0.2%,0) scale(1.035)', 'translate3d(-0.5%,-0.3%,0) scale(1.075)', 23000, 'dust'],
      mirror: ['translate3d(0,0,0) scale(1.01)', 'translate3d(0,-0.25%,0) scale(1.065)', 26000, 'dust'],
      dawn: ['translate3d(0,-0.4%,0) scale(1.065)', 'translate3d(0,0,0) scale(1.005)', 30000, 'dust'],
      memory: ['scale(1.01)', 'scale(1.045)', 24000, 'dust'],
      quiet: ['translate3d(0.25%,0,0) scale(1.025)', 'translate3d(-0.25%,0,0) scale(1.045)', 28000, 'none'],
      still: ['scale(1)', 'scale(1)', 18000, 'none']
    }[motionPreset] || ['scale(1.01)', 'scale(1.045)', 24000, 'none'];
    // Atlas panels keep their entire safe rectangle; portrait framed CGs use gentle centered breathing so horizontal edges never clip.
    const isPortraitCam = (ui.root.clientHeight || window.innerHeight) > (ui.root.clientWidth || window.innerWidth);
    const camFrom = isPortraitCam ? 'scale(1)' : preset[0];
    const camTo = isPortraitCam ? 'scale(1.02)' : preset[1];
    if (!art.cols && motionPreset !== 'still') cameraMotion = animate(ui.camera, [{ transform: camFrom }, { transform: camTo }], { duration: preset[2], easing: 'cubic-bezier(.2,.45,.35,1)', fill: 'both' }, 'camera');
    const weather = preset[3]; ui.atmosphere.setAttribute('data-weather', weather); ui.atmosphere.classList.toggle('hidden', weather === 'none');
    const count = weather === 'rain' ? 8 : weather === 'none' ? 0 : 5;
    const h = ui.frame.getBoundingClientRect().height || window.innerHeight;
    for (let i = 0; i < ui.particles.length; i++) {
      const particle = ui.particles[i]; particle.classList.toggle('hidden', i >= count); if (i >= count) continue;
      particle.style.left = (8 + (i * 17.31) % 88) + '%'; particle.style.top = (weather === 'rain' ? -70 : 19 + (i * 23) % 70) + (weather === 'rain' ? 'px' : '%');
      const rain = weather === 'rain', duration = rain ? 1700 + i * 237 : 9000 + i * 1380;
      animate(particle, rain ? [{ transform: 'translate3d(35px,0,0) rotate(12deg)', opacity: 0 }, { opacity: .2, offset: .18 }, { opacity: .13, offset: .8 }, { transform: 'translate3d(-90px,' + (h + 120) + 'px,0) rotate(12deg)', opacity: 0 }] : [{ transform: 'translate3d(0,20px,0)', opacity: 0 }, { opacity: .28, offset: .3 }, { opacity: .16, offset: .7 }, { transform: 'translate3d(' + (i % 2 ? 34 : -24) + 'px,-80px,0)', opacity: 0 }], { duration, delay: -(i * duration / count), iterations: Infinity, easing: 'linear' }, 'atmosphere');
    }
    if (art.standalone && !['grief', 'mirror'].includes(motionPreset)) animate(ui.light, [{ opacity: 0 }, { opacity: .1 }, { opacity: .025 }], { duration: 11000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }, 'light');
    if (transition) animate(ui.shutter, [{ opacity: .38 }, { opacity: 0 }], { duration: motionPreset === 'rupture' ? 280 : motionPreset === 'grief' ? 680 : 420, easing: 'ease-out', fill: 'both' }, 'transition');
    syncMotionState();
  }
  function setArt(art) {
    if (!ui || !art) return; const signature = art.path + ':' + (art.panel || 0) + ':' + (art.mood || 'quiet'), changed = signature !== artSignature;
    ui.frame.classList.remove('art-unavailable'); ui.image._storyArt = art; artSignature = signature;
    ui.root.setAttribute('data-art-format', art.cols ? 'atlas' : art.standalone ? 'cg' : 'background');
    const resolved = source(art.path);
    warmArtPath(art.path, true);
    if (ui.image.getAttribute('data-art-path') !== art.path || (ui.image.complete && !ui.image.naturalWidth)) {
      ui.artWindow.classList.add('art-loading');
      ui.image.setAttribute('data-art-path', art.path);
      ui.image.src = resolved;
    }
    if (ui.image.complete && ui.image.naturalWidth > 0) {
      ui.artWindow.classList.remove('art-loading');
      if (ui.image.src) ui.backdrop.style.backgroundImage = 'url("' + ui.image.src + '")';
    }
    fitArt(); if (changed || !motion.length) startSceneMotion(changed); else syncMotionState();
  }
  function fitArt() {
    if (!ui || !ui.image._storyArt) return;
    const stageRect = ui.root.getBoundingClientRect(), vw = stageRect.width || window.innerWidth, vh = stageRect.height || window.innerHeight;
    const a = ui.image._storyArt, rect = ui.frame.getBoundingClientRect();
    const fw = rect.width || window.innerWidth, fh = rect.height || window.innerHeight;
    const iw = ui.image.naturalWidth || 1672, ih = ui.image.naturalHeight || 941;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (a.cols) { sx = iw * ((a.panel % a.cols) + a.safe[0]) / a.cols; sy = ih * (Math.floor(a.panel / a.cols) + a.safe[1]) / a.rows; sw = iw * a.safe[2] / a.cols; sh = ih * a.safe[3] / a.rows; }
    const isPortrait = vh > vw || !!(document.body && document.body.classList && document.body.classList.contains('m-portrait'));
    const hasStandees = !!(cur && cur.kind === 'dialogue' && cur.portraits !== false && !a.standalone && !a.cols);
    // 竖屏模式下所有横向剧情CG、过场分镜、信物回忆、结局与报幕插画均按完整宽银幕比例展示，绝不左右裁切
    const portraitWidescreen = isPortrait && sw > sh * 1.02 && !hasStandees;
    const mobileSplit = !isPortrait && vh <= 540 && vw > vh && cur && (cur.kind === 'cinematic' || (cur.kind === 'dialogue' && cur.portraits === false));
    ui.artWindow.classList.toggle('is-portrait-framed', portraitWidescreen);
    let scale, aw, ah, leftPos, topPos;
    if (portraitWidescreen) {
      const maxW = a.cols ? fw * 0.96 : fw;
      const topPad = Math.max(74, Math.round(fh * 0.095));
      const botLimit = cur && (cur.kind === 'dialogue' || cur.kind === 'cinematic')
        ? Math.round(fh * 0.65)
        : (cur && cur.kind === 'choice' ? Math.round(fh * 0.44) : Math.round(fh * 0.86));
      const bandH = Math.max(150, botLimit - topPad);
      scale = Math.min(maxW / sw, bandH / sh, a.cols ? 1.25 : 2.0);
      aw = Math.round(sw * scale);
      ah = Math.round(sh * scale);
      leftPos = Math.round((fw - aw) / 2);
      topPos = (cur && cur.kind === 'title')
        ? Math.round((fh - ah) * 0.44)
        : Math.round(topPad + Math.max(0, bandH - ah) * 0.45);
    } else {
      const availableH = a.cols ? fh * (cur && cur.kind === 'dialogue' ? .61 : cur && cur.kind === 'cinematic' ? .72 : .88) : fh;
      scale = a.cols ? Math.min(fw * .94 / sw, availableH / sh, 1.25) : mobileSplit ? Math.min(fw / sw, fh / sh) : Math.max(fw / sw, fh / sh);
      aw = a.cols || mobileSplit ? sw * scale : fw;
      ah = a.cols || mobileSplit ? sh * scale : fh;
      leftPos = (fw - aw) / 2;
      topPos = a.cols ? Math.max(58, (fh * .78 - ah) / 2) : (fh - ah) / 2;
    }
    artScale = scale;
    ui.artWindow.style.width = aw + 'px'; ui.artWindow.style.height = ah + 'px';
    ui.artWindow.style.left = leftPos + 'px'; ui.artWindow.style.top = topPos + 'px';
    ui.image.style.width = iw * scale + 'px'; ui.image.style.height = ih * scale + 'px';
    ui.image.style.left = (aw - sw * scale) / 2 - sx * scale + 'px'; ui.image.style.top = (ah - sh * scale) / 2 - sy * scale + 'px';
    refreshReadingScroll();
  }
  function refreshReadingScroll() {
    if (!cur || !cur.revealed || !ui || !['dialogue', 'cinematic'].includes(cur.kind)) return;
    const paragraph = cur.kind === 'cinematic' ? ui.cinText : ui.text;
    const waiting = paragraph.clientHeight > 0 && paragraph.scrollHeight - paragraph.clientHeight - paragraph.scrollTop > 3;
    if (cur.awaitingScroll !== waiting) { cur.awaitingScroll = waiting; syncText(); }
  }
  function resetInput() { if (typeof resetJoy === 'function') resetJoy(); if (typeof keys !== 'undefined' && keys) for (const k of Object.keys(keys)) keys[k] = false; }
  function warmSceneItem(item, highPriority) {
    if (!item || item.kind === 'callback') return;
    const art = item.art || vista(item.floor || 1);
    if (art && art.path) warmArtPath(art.path, highPriority);
    if (art && art.fallback && art.fallback.path && !highPriority) warmArtPath(art.fallback.path, false);
    if (item.kind === 'dialogue' && item.portraits !== false && Array.isArray(item.lines)) {
      warmArtPath(castPortraitPath('zero'), false);
      for (let i = 0; i < item.lines.length; i++) {
        const sid = speakerId(item.lines[i] && item.lines[i].speaker);
        if (sid && sid !== 'zero') { warmArtPath(castPortraitPath(sid), false); break; }
      }
    }
  }
  function preloadUpcoming() {
    if (cur) warmSceneItem(cur, true);
    const limit = Math.min(queue.length, 5);
    for (let i = 0; i < limit; i++) warmSceneItem(queue[i], i < 2);
  }
  function preloadStoryEntry(floorNum) {
    const n = Math.max(1, Math.min(16, Math.floor(Number(floorNum) || 1)));
    warmArtPath(A + 'title-clean.png', false);
    if (n === 1) {
      const op = openingScenes();
      for (let i = 0; i < op.length; i++) warmSceneItem(op[i], i < 3);
      const q0 = qingyuScenes(D.qingyu_arc.stages[0]);
      for (let i = 0; i < q0.length; i++) warmSceneItem(q0[i], false);
    }
    warmArtPath(vista(n).path, n > 1);
    const fb = floorBefore(n);
    for (let i = 0; i < fb.length; i++) warmSceneItem(fb[i], n > 1);
    if (n % 4 === 0) {
      const p2s = bossScenes(bossKey(n), 'phase2');
      for (let j = 0; j < p2s.length; j++) warmSceneItem(p2s[j], false);
    }
  }
  function enqueue(items, done) {
    if (typeof done === 'function') items = items.concat([{ kind: 'callback', callback: once(done) }]);
    queue.push.apply(queue, items); preloadUpcoming(); if (!cur) next();
  }
  function isRuptureHold() {
    return !preview && typeof phase2ShatterFx !== 'undefined' && !!(phase2ShatterFx && phase2ShatterFx.stage === 'rupture');
  }
  function syncRuptureHoldDom() {
    if (!ui || !ui.root) return;
    if (isRuptureHold()) {
      ui.root.style.opacity = '0';
      ui.root.style.pointerEvents = 'none';
    } else {
      if (ui.root.style.opacity === '0') ui.root.style.opacity = '';
      if (ui.root.style.pointerEvents === 'none') ui.root.style.pointerEvents = '';
    }
  }
  function releaseRuptureHold() {
    syncRuptureHoldDom();
    if (cur && ui) {
      syncMotionState();
      focusAdvanceTarget();
    }
  }
  function next() {
    if (cur) return;
    while (queue.length && queue[0].kind === 'callback') { queue.shift().callback(); if (cur) return; }
    if (!queue.length) { hideStage(); return; }
    cur = queue.shift(); lastPortraitSpeaker = null;
    Object.assign(cur, { idx: 0, elapsed: 0, lineElapsed: 0, wait: 0, readHold: 0, awaitingScroll: false, revealed: false, logged: false });
    preloadUpcoming();
    ensureUi(); resetInput(); if (ui.root.classList.contains('hidden')) previousFocus = document.activeElement;
    ui.root.classList.remove('hidden'); document.body.classList.add('story-presenting');
    syncRuptureHoldDom();
    hidden = logOpen = false; ui.log.classList.add('hidden'); ui.root.classList.remove('story-ui-hidden');
    if (cur.kind === 'choice') auto = skipRead = false;
    syncScene(); if (!isRuptureHold()) focusAdvanceTarget();
  }
  function hideStage() {
    if (ui) {
      ui.root.style.opacity = '';
      ui.root.style.pointerEvents = '';
      ui.root.classList.add('hidden');
      document.body.classList.remove('story-presenting');
    }
    stopMotion(); lastPortraitSpeaker = null; pointerTrack = null; suppressDragClick = false;
    hidden = logOpen = skipRead = false; if (!preview) persistRead(); resetInput();
    const afterReplay = preview ? replayDone : null;
    if (preview) { preview = false; replayDone = null; }
    const restoreTo = previousFocus; previousFocus = null;
    syncMotionState(); focus(restoreTo);
    // The callback may open a new modal. Its focus must be the final focus action.
    if (afterReplay) afterReplay();
  }
  function finish() { if (!cur) return; const old = cur; cur = null; if (old.onDone) old.onDone(); next(); }
  const line = () => cur && cur.lines && cur.lines[cur.idx];
  function markRead() {
    const ln = line(); if (!ln || !ln.text.trim() || cur.logged) return; cur.logged = true;
    if (!preview) read[lineKey(ln, cur.id, cur.idx)] = true;
    history.push({ speaker: ln.speaker || '', text: ln.text }); if (history.length > 400) history.shift();
  }
  function reveal() { if (!cur) return; cur.revealed = true; cur.wait = 0; markRead(); syncText(); refreshReadingScroll(); }
  function advanceLine() {
    if (!cur) return; markRead();
    if (cur.lines && cur.idx + 1 < cur.lines.length) { cur.idx++; cur.lineElapsed = cur.wait = 0; cur.revealed = cur.logged = false; syncLine(); }
    else finish();
  }
  function advanceOrSkip(force) {
    if (!cur) return false;
    if (!force && isRuptureHold()) return false;
    if (force && isRuptureHold()) {
      if (phase2ShatterFx.boss) phase2ShatterFx.boss._ruptureHoldP1 = false;
      phase2ShatterFx = null;
      syncRuptureHoldDom();
    }
    if (hidden) { setHidden(false); return true; }
    if (logOpen || cur.kind === 'choice') return false;
    // Force is a programmatic replay/test transport. No UI button is bound to it.
    if (force || cur.kind === 'title') { finish(); return true; }
    if (!cur.revealed) reveal(); else advanceLine(); return true;
  }
  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return; hitstop = Math.max(0, hitstop - dt);
    if (isRuptureHold()) { syncRuptureHoldDom(); return; }
    syncRuptureHoldDom();
    if (!cur || !focused || document.hidden || logOpen || hidden) return; cur.elapsed += dt; cur.readHold = Math.max(0, (cur.readHold || 0) - dt);
    if (cur.kind === 'choice') return;
    if (cur.kind === 'title') { if (cur.elapsed >= (cur.duration || 2)) finish(); return; }
    const ln = line(); if (!ln) { finish(); return; }
    if (skipRead) { if (read[lineKey(ln, cur.id, cur.idx)]) { advanceLine(); return; } skipRead = false; syncControls(); }
    cur.lineElapsed += dt;
    if (!cur.revealed && (prefs.instantText || Math.floor(cur.lineElapsed * prefs.textSpeed) >= ln.text.length)) reveal();
    else if (!cur.revealed) {
      syncText(); soundT += dt;
      if (prefs.typeSound && soundT >= .095 && typeof beep === 'function') { soundT = 0; try { beep(520, .012, 'sine', .012); } catch (_) {} }
    }
    if (cur && cur.revealed) {
      cur.wait += dt; const hold = Math.max(1.4, ln.text.length * .085), duration = Math.max(hold, (cur.duration || 0) / Math.max(1, cur.lines.length));
      if (!cur.awaitingScroll && !pointerTrack && !cur.readHold && ((cur.kind === 'cinematic' && cur.lineElapsed >= duration) || (auto && cur.wait >= hold))) advanceLine();
    }
  }
  function syncScene() {
    if (!cur || !ui) return; const kind = cur.kind;
    ui.root.setAttribute('data-kind', kind); ui.root.setAttribute('data-event', cur.id || ''); ui.root.classList.toggle('story-previewing', preview);
    ui.root.classList.toggle('story-illustrated', cur.portraits === false || kind === 'cinematic');
    const fl = Number(cur.floor) || 0;
    const actRoman = fl > 0 ? ['I', 'II', 'III', 'IV'][Math.max(0, Math.min(3, Math.floor((fl - 1) / 4)))] : '';
    if (ui.actBadge) ui.actBadge.textContent = preview ? 'PREVIEW' : (kind === 'choice' ? 'DESTINY' : (fl > 0 ? ('ACT ' + actRoman + ' · ' + fl + 'F') : 'CHRONICLE'));
    ui.chapter.textContent = (preview ? '演出预览 / ' : '') + (cur.chapter || '烬塔残响');
    ui.dialog.classList.toggle('hidden', kind !== 'dialogue'); ui.cinematic.classList.toggle('hidden', kind !== 'cinematic');
    ui.titleCard.classList.toggle('hidden', kind !== 'title'); ui.choices.classList.toggle('hidden', kind !== 'choice');
    if (kind !== 'dialogue') ui.root.setAttribute('data-speaker-side', 'none');
    ui.left.classList.add('hidden'); ui.right.classList.add('hidden'); setArt(cur.art || vista(cur.floor || 1));
    if (kind === 'title') { ui.overline.textContent = cur.overline || ''; ui.title.textContent = cur.title || ''; ui.subtitle.textContent = cur.subtitle || ''; }
    else if (kind === 'choice') renderChoices(); else syncLine(); syncControls(); syncMotionState();
  }
  function syncLine() {
    const ln = line(); if (!ln || !ui) return; lastText = '';
    cur.awaitingScroll = false; cur.readHold = 0; ui.text.scrollTop = ui.cinText.scrollTop = 0;
    const id = speakerId(ln.speaker), cast = id && CAST[id], isNarration = !ln.speaker || ln.speaker === '旁白';
    const speakerSide = (!isNarration && cast) ? (id === 'zero' ? 'left' : 'right') : 'none';
    ui.dialog.setAttribute('data-speaker-side', speakerSide);
    ui.root.setAttribute('data-speaker-side', speakerSide);
    ui.accessible.textContent = (ln.speaker ? ln.speaker + '：' : '') + ln.text;
    ui.name.textContent = isNarration ? '' : (ln.speaker || ''); ui.cinName.textContent = ui.name.textContent;
    ui.cinematic.classList.toggle('story-silent', !ln.text.trim());
    const roleLabel = cast ? (id === 'qingyu' && (cur.floor || 1) >= 15 ? '旧日同伴 · 记忆的保管者' : cast.roleTag) : (ln.speaker === '神秘女声' ? '高塔深处的回响' : ln.speaker === '倒悬机神' ? '第三幕神枢巨像' : ln.speaker === '旧日记忆' ? '守誓者的信物' : '');
    ui.role.textContent = ui.cinRole.textContent = roleLabel;
    ui.nameRow.classList.toggle('story-narration', isNarration);
    ui.cinNameRow.classList.toggle('story-narration', isNarration);
    ui.dialog.classList.toggle('story-is-narration', isNarration);
    ui.cinematic.classList.toggle('story-is-narration', isNarration);
    const progLabel = (cur.idx + 1) + ' / ' + cur.lines.length;
    ui.progress.textContent = ui.cinProgress.textContent = progLabel; css(ui.root, '--story-accent', cast ? cast.accent : '#c9d2d3');
    const sceneSpeakers = cur.kind === 'dialogue' && cur.portraits !== false ? cur.lines.map(row => speakerId(row.speaker)).filter(Boolean) : [];
    if (cur.kind === 'dialogue' && cur.portraits !== false && (cast || (isNarration && sceneSpeakers.length))) {
      const other = sceneSpeakers.find(k => k !== 'zero') || null;
      const rightId = id === 'zero' ? other : (cast ? id : other);
      for (const pair of [[ui.left, 'zero'], [ui.right, rightId]]) {
        const el = pair[0], key = pair[1], entering = el.classList.contains('hidden') || el.getAttribute('data-character') !== key;
        const active = !!cast && key === id;
        el.classList.toggle('hidden', !key); el.classList.toggle('speaking', active);
        if (key) {
          const path = castPortraitPath(key), role = el === ui.left ? 'portrait-left' : 'portrait-right';
          el.setAttribute('data-phase2', /\.jpg$/i.test(path) ? '1' : '0');
          if (el.getAttribute('data-portrait') !== path) { el.setAttribute('data-portrait', path); el.src = source(path); } el.alt = CAST[key].name; el.setAttribute('data-character', key);
          const targetOpacity = active ? 1 : .42;
          if (entering || lastPortraitSpeaker !== (id || 'narration')) {
            stopRole(role);
            animate(el, entering ? [{ opacity: 0, transform: 'translate3d(' + (el === ui.left ? '-12' : '12') + 'px,5px,0)' }, { opacity: targetOpacity, transform: 'translate3d(0,0,0)' }] : [{ opacity: active ? .42 : 1 }, { opacity: targetOpacity }], { duration: entering ? 720 : 360, easing: 'ease-out', fill: 'both' }, role);
          }
        }
      }
      const listenerId = !cast ? null : id === 'zero' ? other : 'zero'; ui.listener.classList.toggle('hidden', !listenerId);
      if (listenerId) { const path = castPortraitPath(listenerId); if (ui.listener.getAttribute('data-portrait') !== path) { ui.listener.setAttribute('data-portrait', path); ui.listener.src = source(path); } ui.listener.alt = CAST[listenerId].name + '在听'; }
      lastPortraitSpeaker = id || 'narration';
    } else {
      ui.left.classList.add('hidden'); ui.right.classList.add('hidden'); ui.listener.classList.add('hidden');
      lastPortraitSpeaker = null;
    }
    syncMotionState();
    if (prefs.instantText) reveal(); else syncText();
  }
  function syncText() {
    const ln = line(); if (!ln || !ui) return;
    const shown = cur.revealed ? ln.text : ln.text.slice(0, Math.floor(cur.lineElapsed * prefs.textSpeed));
    // Clearing on every new line also clears a previous line when the first typed frame is empty.
    if (shown !== lastText || !shown) { (cur.kind === 'cinematic' ? ui.cinText : ui.text).textContent = shown; lastText = shown; }
    const nextLabel = cur.revealed ? '▶ 继续' : '▶ 全文';
    if (nextLabel !== lastNext) { ui.nextBtn.textContent = ui.cinNext.textContent = nextLabel; lastNext = nextLabel; }
    const compact = (document.body && document.body.classList && document.body.classList.contains('m-ui')) || window.innerWidth <= 900 || window.innerHeight <= 540;
    const hint = cur.awaitingScroll ? '上滑阅读余下内容' : auto ? '自动阅读中 · 遇到选项暂停' : cur.revealed ? (compact ? '轻触屏幕任意处继续' : 'SPACE / 点击任意处推进') : (compact ? '轻触屏幕显示全文' : '点击先显示完整句子');
    if (hint !== lastHint) { ui.readHint.textContent = ui.cinReadHint.textContent = hint; lastHint = hint; }
  }
  function renderChoices() {
    ui.choices.innerHTML = ''; ui.choices.scrollTop = 0; node('span', 'story-choice-eyebrow', ui.choices, cur.eyebrow || '由你决定');
    node('h2', 'story-choice-title', ui.choices, cur.title || '把灯拿好'); if (cur.text) node('p', 'story-choice-copy', ui.choices, cur.text);
    for (const option of cur.options) {
      const el = button('', 'story-option', ui.choices, () => choose(option.id)); node('span', 'story-option-label', el, option.label);
      if (option.detail) node('small', '', el, option.detail); el.disabled = !!option.disabled; el.setAttribute('data-choice', option.id);
    }
    node('span', 'story-choice-footnote', ui.choices, '等待你的选择 · 不会自动提交');
  }
  function choose(id) {
    if (!cur || cur.kind !== 'choice' || hidden || logOpen) return false;
    const option = cur.options.find(o => o.id === id); if (!option || option.disabled) return false;
    const old = cur; cur = null; auto = skipRead = false; if (old.onChoose) old.onChoose(id); if (old.onDone) old.onDone(); next(); return true;
  }
  const dlg = (id, chapter, lines, art, floor, portraits) => ({ id, kind: 'dialogue', chapter, lines, art, floor, portraits });
  const cin = (id, chapter, lines, art, duration, floor) => ({ id, kind: 'cinematic', chapter, lines: lines.length ? lines : [{ speaker: '', text: ' ' }], art, duration, floor, portraits: false });
  const titleCard = (id, title, art, duration, subtitle, overline) => ({ id, kind: 'title', title, art, duration: duration || 2, subtitle: subtitle || '', overline: overline || '' });
  function openingScenes() {
    const o = D.opening, rows = o.dialogue, panels = [0, 0, 1, 2, 3, 3];
    return o.shots.map((s, i) => {
      const first = rows.findIndex(r => s.line && r.text === s.line.text), ns = o.shots[i + 1];
      const end = ns && ns.line ? rows.findIndex(r => r.text === ns.line.text) : rows.length;
      const fallback = atlas('awakening-atlas.png', panels[i]);
      const art = i < 2 ? cg('awakening-coffin', fallback, 'wake') : i < 4 ? cg('awakening-lantern', fallback, 'lantern') : Object.assign(fallback, { mood: 'wake' });
      return cin(s.shotId, '序章 · 在石棺里醒来', rows.slice(Math.max(0, first), end < 0 ? rows.length : end), art, s.seconds, 1);
    });
  }
  function qingyuScenes(s) {
    const illustrated = s === D.qingyu_arc.stages[0] || s.floor === 5;
    return [dlg(s.stageId, s.title, s.dialogue, illustrated ? cg('qingyu-rain', pavilion(), 'reunion') : pavilion(), s.floor || 1, !illustrated)];
  }
  function bossScenes(key, stageKey) {
    const b = D.boss_stages[key], s = b[stageKey];
    const art = bossArt(key, stageKey), name = CAST[key].name, f = stageKey === 'first_meeting' ? b.first_meeting_floor : b.floor;
    if (stageKey === 'first_meeting') return [cin(s.stageId + '.establish', name, [], art, 2.1, f), dlg(s.stageId, '第 ' + f + ' 层 · ' + floorData(f).title, s.dialogue, key === 'eclipse' ? art : vista(f), f, key !== 'eclipse')];
    if (stageKey === 'pre_battle') return [dlg(s.stageId + '.dialogue', name, s.dialogue.slice(0, -1), key === 'eclipse' ? art : vista(f), f, key !== 'eclipse'), cin(s.stageId, name, s.dialogue.slice(-1), art, 4.2, f), titleCard(s.stageId + '.phase', name, art, 1.4, '第一阶段', '守誓之战')];
    if (stageKey === 'phase2') {
      const p2Arts = phase2ShotArts(key), p2Meta = PHASE2_FORMS[key];
      const shotItems = (s.shots || []).map((sh, idx) => {
        const ln = s.dialogue[idx] || sh.line;
        return cin(sh.shotId || (s.stageId + '.shot.0' + (idx + 1)), name + ' · ' + s.title, ln ? [ln] : [], p2Arts[Math.min(p2Arts.length - 1, idx)], sh.seconds || 3.4, f);
      });
      if (preview) {
        shotItems.push(titleCard(s.stageId + '.phase', p2Meta ? p2Meta.title : name, p2Arts[2] || art, 1.45, p2Meta ? p2Meta.sub : '第二阶段', p2Meta ? p2Meta.over : '誓约解封'));
      }
      return shotItems;
    }
    return [cin(s.stageId + '.silence', name, [], art, 2.8, f), dlg(s.stageId, name, s.dialogue, art, f, false)];
  }
  function floorBefore(n) {
    const f = floorData(n), first = BOSS.find(k => D.boss_stages[k].first_meeting_floor === n);
    if (first) return bossScenes(first, 'first_meeting'); if (n % 4 === 0) return bossScenes(bossKey(n), 'pre_battle');
    const item = dlg('floor.' + String(n).padStart(2, '0') + '.before', '第 ' + n + ' 层 · ' + f.title, f.before, f.before.some(r => r.speaker === '青羽') ? pavilion() : vista(n), n, true);
    if (n === 15) item.onDone = () => { if (!preview && typeof grantSpireMemento === 'function') grantSpireMemento('qingyu'); };
    return [item];
  }
  function progress() {
    if (preview) return { mementos: { jinyu: true, astria: true, jialan: true, qingyu: true }, memories: { jinyu: true, astria: true, jialan: true, qingyu: true } };
    return (typeof getSpireStoryProgress === 'function' && getSpireStoryProgress()) || { mementos: {}, memories: {} };
  }
  function memoryReader(key, returnScene) {
    const mem = MEMORY[key], art = memoryArt(key);
    const hasReturn = typeof returnScene === 'function';
    const pages = mem.slice(1).map((txt, idx) => ({ speaker: '旧日记忆', text: txt, lineId: 'memory.' + key + '.description.' + (idx + 1) }));
    return [dlg('memory.' + key, mem[0], pages, art, 15, false),
      { id: 'memory.' + key + '.confirm', kind: 'choice', title: mem[0], text: '旧物的温度与亲眼所见的证据彼此印证，尘封的誓约正在掌心苏醒。', art,
        options: hasReturn
          ? [{ id: 'remember', label: '铭记这段守誓之约', detail: '将这份托付镌刻于心，不再遗忘' }, { id: 'back', label: '先贴身收好', detail: '稍后仍可在风亭或镜前回想' }]
          : [{ id: 'remember', label: '铭记这段守誓之约', detail: '镌刻于心并贴身收好，继续登塔' }, { id: 'back', label: '暂且贴身收好，继续登塔', detail: '稍后仍可在风亭或终门前翻阅回想' }],
        onChoose: id => {
          if (id === 'remember' && !preview && typeof rememberSpireMemento === 'function') rememberSpireMemento(key);
          if (hasReturn) queue.unshift(returnScene());
        }
      }];
  }
  function memoryMenu(returnScene) {
    const p = progress();
    return { id: 'memory.review', kind: 'choice', chapter: '守誓者的信物', title: '拼合四段失落的约定', text: '每一件旧物背后，都藏着他们宁肯拦住你、也要护你周全的理由。', art: pavilion(),
      options: ['jinyu', 'astria', 'jialan', 'qingyu'].map(k => ({ id: k, label: MEMORY[k][0], detail: !p.mementos[k] ? '尚未寻获此信物' : p.memories[k] ? '已铭记于心 · 可再次翻阅' : '轻触旧物，唤醒尘封记忆', disabled: !p.mementos[k] })).concat([{ id: 'back', label: '返回当前场景' }]),
      onChoose: id => { if (id === 'back') queue.unshift(returnScene()); else queue.unshift.apply(queue, memoryReader(id, () => memoryMenu(returnScene))); }
    };
  }
  function prepareChoice() {
    return { id: 'floor.15.prepare', kind: 'choice', chapter: '第 15 层 · 终门前的风亭', title: '推开终门之前，把约定想完整', text: '青羽替你温满了最后一盏甜茶。檐外便是零号圣所的黑曜石巨镜，她安静地等你自己做出决定。', art: pavilion(),
      options: [{ id: 'memories', label: '翻阅四件信物与约定', detail: '逐一唤醒并铭记烬羽、星使、伽蓝与青羽的记忆' }, { id: 'ready', label: '已经记牢了，走向终门', detail: '完成第十五层整备后，踏入零号圣所' }],
      onChoose: id => { if (id === 'memories') queue.unshift(memoryMenu(prepareChoice)); }
    };
  }
  function rewardChoice(key, n) {
    const make = () => ({ id: 'memento.' + key, kind: 'choice', chapter: '第 ' + n + ' 层 · 守誓者的托付', title: '收下 · ' + MEMORY[key][0], text: '微凉的旧物静静躺在掌心，似乎只要闭上眼触碰它，就能听见灾厄降临前那晚的声音。', art: memoryArt(key),
      options: [{ id: 'memory', label: '触碰信物，唤醒旧日记忆', detail: '倾听这件信物背后的真实往事' }, { id: 'continue', label: '贴身收好，继续登塔', detail: '稍后仍可在终门前翻阅回想' }],
      onChoose: id => { if (id === 'memory') queue.unshift.apply(queue, memoryReader(key, null)); }
    }); return make();
  }
  function finalChoiceScene(onChoice) {
    const p = progress(), complete = preview || (typeof hasSpireTrueEnding === 'function' ? hasSpireTrueEnding() : ['jinyu', 'astria', 'jialan', 'qingyu'].every(k => p.mementos[k] && p.memories[k]));
    const make = () => finalChoiceScene(onChoice);
    return { id: 'final.choice', kind: 'choice', chapter: '第 16 层 · 黑曜石巨镜前', title: '第九百九十九夜的抉择', text: '裂镜中的日蚀圣女隔着覆眼黑纱向你伸出手，静静等待你交出魂灯；而灯环上的旧物正传来微弱却坚定的暖意。', art: bossArt('eclipse', 'first_meeting'),
      options: [{ id: 'accept', label: '顺从镜中的呼唤 · 交出魂灯', detail: '走近镜面，与被封印的另一半真身合掌' }, { id: 'memories', label: '低头回想同伴的约定', detail: '在最终抉择前，再次确认四件信物中的记忆' }, { id: 'refuse', label: '拒绝交灯 · 携四人之约斩碎黑日', detail: complete ? '握紧剑穗、怀表、发条与风翎，亲手终结这场轮回' : '需集齐四件信物并铭记全部四段约定方可开启', disabled: !complete }],
      onChoose: id => {
        if (id === 'memories') queue.unshift(memoryMenu(make));
        else if (id === 'accept') queue.unshift({ id: 'final.accept.confirm', kind: 'choice', chapter: '镜前 · 伸出的手', title: '真的要把魂灯交给镜中的她吗？', text: '魂灯是自内部解开烬塔封印的唯一钥匙。一旦交出，被锁在塔顶的黑日灾厄将瞬间重临世间。', art: bossArt('eclipse', 'first_meeting'),
          options: [{ id: 'back', label: '收回手 · 我还要再想一想' }, { id: 'confirm', label: '确认交出魂灯' }], onChoose: choice => { if (choice === 'back') queue.unshift(make()); else onChoice('accept'); } });
        else onChoice('refuse');
      }
    };
  }
  function endingScenes(key) {
    const end = D.endings[key], art = key === 'B' ? cg('dawn', atlas('endings-atlas.png', 1), 'dawn') : atlas('endings-atlas.png', 0);
    return [cin(end.stageId, end.title, end.dialogue, art, Math.max(18, end.dialogue.length * 4.4), 16), titleCard(end.stageId + '.final', end.final_text, art, 4, '', key === 'A' ? '神座加冕' : '守誓者的破晓')];
  }
  function playOpeningSequence(replay) { if (replay) return replayEvent('opening.awakening'); if (seen.opening) return false; seen.opening = true; enqueue(openingScenes()); return true; }
  function onWaveStart(n, scene, variant, isRetry) {
    n = Math.floor(Number(n) || 1); if (!isStory() || n > 16) return false;
    const p = progress(), canRetryFinal = n !== 16 || (p.finalChoice === 'refuse' && (typeof hasSpireTrueEnding !== 'function' || hasSpireTrueEnding()));
    const completed = !!seen['floor.' + n + '.complete'];
    if (isRetry && canRetryFinal && (completed || (n === 16 && p.finalChoice === 'refuse'))) { enqueue([titleCard('retry.' + n, '第 ' + n + ' 层 · 重新准备', vista(n), 1, n % 4 === 0 ? '第一阶段' : floorData(n).title)]); return true; }
    if (seen['floor.' + n] && !isRetry) return false; seen['floor.' + n] = true;
    const items = [];
    if (n === 1 && !seen.opening) { seen.opening = true; items.push.apply(items, openingScenes()); items.push.apply(items, qingyuScenes(D.qingyu_arc.stages[0])); }
    if ([1, 5, 9, 13].includes(n)) items.push(titleCard('act.' + n, ACTS[Math.floor((n - 1) / 4)], vista(n), 2.4, '第 ' + n + ' — ' + (n + 3) + ' 层', ['第一幕', '第二幕', '第三幕', '终幕'][Math.floor((n - 1) / 4)]));
    items.push.apply(items, floorBefore(n));
    if (n === 16 && !(isRetry && canRetryFinal)) items.push(finalChoiceScene(choice => {
      if (choice === 'refuse') enqueue(bossScenes('eclipse', 'pre_battle'), () => { if (typeof resolveSpireFinalChoice === 'function') resolveSpireFinalChoice('refuse'); });
      else if (typeof resolveSpireFinalChoice === 'function') resolveSpireFinalChoice('accept');
    }));
    enqueue(items, () => { seen['floor.' + n + '.complete'] = true; }); return true;
  }
  function specialBossPhase2Scenes(kind) {
    if (kind === 'crimson_lord' || kind === 'crimson') {
      const fb = vista(1), chap = '荒祠古祟 · 血月夜叉';
      const items = [
        cin('boss.crimson.phase2.shot.01', chap, [{ lineId: 'boss.crimson.phase2.01', speaker: '绯狱妖主', text: '镇魂石碑腐朽，符锁寸断……沉睡千载，终有提灯的活人踏进这座水底荒祠了。' }], cgJpg('crimson-p2-lantern', fb, 'rupture'), 3.1, 4),
        cin('boss.crimson.phase2.shot.02', chap, [{ lineId: 'boss.crimson.phase2.02', speaker: '绯狱妖主', text: '区区白瓷镇魂面，再锁不住吾之凶骨——破龛裂面，黑角归位！' }], cgJpg('crimson-p2-unsheathe', fb, 'rupture'), 3.2, 4),
        cin('boss.crimson.phase2.shot.03', chap, [{ lineId: 'boss.crimson.phase2.03', speaker: '绯狱妖主', text: '血月当空，万冢妖刀齐鸣——用你的魂火，祭吾苏醒后的第一场夜宴！' }], cgJpg('crimson-p2-awaken', fb, 'rupture'), 3.4, 4)
      ];
      if (preview) items.push(titleCard('boss.crimson.phase2.phase', '荒祠古祟 · 血月黑角夜叉王', cgJpg('crimson-p2-awaken', fb, 'rupture'), 1.45, '第二阶段 · 荒祠破封 & 万冢妖刀解禁', '千载破龛 · 血月临世'));
      return items;
    }
    if (kind === 'colossus' || kind === 'mech_colossus') {
      const fb = vista(9), chap = '倒悬机神 · 歼灭神枢';
      const items = [
        cin('boss.colossus.phase2.shot.01', chap, [{ lineId: 'boss.colossus.phase2.01', speaker: '倒悬机神', text: '【神枢警报：黑曜重甲损毁逾半……正在强制熔断第三重发条限速锁——】' }], fb, 3.1, 9),
        cin('boss.colossus.phase2.shot.02', chap, [{ lineId: 'boss.colossus.phase2.02', speaker: '倒悬机神', text: '【警告：神枢炉心超载 300% —— 裂胸开膛，双翼熔岩巨锯全功率解封！】' }], cgJpg('colossus-p2-furnace', fb, 'rupture'), 3.2, 9),
        cin('boss.colossus.phase2.shot.03', chap, [{ lineId: 'boss.colossus.phase2.03', speaker: '倒悬机神', text: '【终焉歼灭协议已激活：凡踏入倒悬钟楼禁区者——尽归炉心焦土！】' }], cgJpg('colossus-p2-awaken', fb, 'rupture'), 3.4, 9)
      ];
      if (preview) items.push(titleCard('boss.colossus.phase2.phase', '倒悬机神 · 裂胸巨锯魔神态', cgJpg('colossus-p2-awaken', fb, 'rupture'), 1.45, '第二阶段 · 裂胸炉心 & 双翼熔岩巨锯全开', '神枢超载 · 终焉魔神'));
      return items;
    }
    const fb = atlas('qingyu-atlas.png', 2), chap = '青羽试炼影 · 千夜苍岚';
    const items = [
      cin('boss.qingyu.phase2.shot.01', chap, [{ lineId: 'boss.qingyu.phase2.01', speaker: '青羽', text: '步法不再犹豫，连我的翠玉羽扇也逼不出你的破绽……看来寻常微风，已经考不住你了呢。' }], cg('qingyu-rain', fb, 'reunion'), 3.2, 5),
      cin('boss.qingyu.phase2.shot.02', chap, [{ lineId: 'boss.qingyu.phase2.02', speaker: '青羽', text: '那便合扇为弓吧，小零——且看这柄曾射落千夜风雪的「苍岚神风羽弓」！' }], cgJpg('qingyu-p2-fan', fb, 'rupture'), 3.3, 5),
      cin('boss.qingyu.phase2.shot.03', chap, [{ lineId: 'boss.qingyu.phase2.03', speaker: '青羽', text: '弦满风起！穿过我这一箭「千夜苍岚」，去推开属于你自己的最后一扇门吧！' }], cgJpg('qingyu-p2-awaken', fb, 'reunion'), 3.5, 5)
    ];
    if (preview) items.push(titleCard('boss.qingyu.phase2.phase', '青羽试炼影 · 神风羽弓魔女装', cgJpg('qingyu-p2-awaken', fb, 'reunion'), 1.45, '第二阶段 · 化扇为弓 & 苍岚风矢解封', '试炼解封 · 千夜苍岚'));
    return items;
  }
  function onBossPhase2(n, bossEntity) {
    if (!isStory() || n > 16) return false; const key = 'phase2.' + n, bk = bossKey(n);
    const launchShatter = () => {
      if (!preview && typeof startPhase2ShatterSequence === 'function') {
        startPhase2ShatterSequence(bossEntity || bk, 'story');
      }
    };
    if (seen[key]) {
      if (!isRuptureHold()) launchShatter();
    } else {
      seen[key] = true;
      enqueue(bossScenes(bk, 'phase2'), launchShatter);
    }
    return true;
  }
  function onSpecialBossPhase2(variantOrKey, bossEntity) {
    const isCrimson = variantOrKey === 'crimson_lord' || variantOrKey === 'crimson';
    const isColossus = variantOrKey === 'mech_colossus' || variantOrKey === 'colossus';
    const sk = isCrimson ? 'crimson' : (isColossus ? 'colossus' : 'qingyu');
    const fallbackVariant = isCrimson ? 'crimson_lord' : (isColossus ? 'mech_colossus' : 'plague_empress');
    const seenKey = 'phase2.special.' + sk;
    const launchShatter = () => {
      if (!preview && typeof startPhase2ShatterSequence === 'function') {
        startPhase2ShatterSequence(bossEntity || fallbackVariant, 'story');
      }
    };
    if (seen[seenKey]) {
      if (!isRuptureHold()) launchShatter();
    } else {
      seen[seenKey] = true;
      enqueue(specialBossPhase2Scenes(sk), launchShatter);
    }
    return true;
  }
  function onBossDefeated(n, variant, done) {
    if (!isStory() || n > 16) { if (done) done(); return false; }
    if (seen['defeat.' + n]) { enqueue([], done); return false; } seen['defeat.' + n] = true;
    const key = bossKey(n), items = bossScenes(key, 'boss_defeated'), q = D.qingyu_arc.stages.find(s => s.floor === n && [8, 12].includes(n));
    if (q) items.push.apply(items, qingyuScenes(q)); if (n < 16) items.push(rewardChoice(key, n)); enqueue(items, done); return true;
  }
  function onFloorCleared(n, done) {
    if (!isStory() || n > 16) { if (done) done(); return false; } if (n % 4 === 0) return onBossDefeated(n, null, done);
    if (seen['cleared.' + n]) { enqueue([], done); return false; } seen['cleared.' + n] = true;
    const f = floorData(n), items = [dlg('floor.' + String(n).padStart(2, '0') + '.after', '第 ' + n + ' 层 · ' + f.title, f.after, f.after.some(r => r.speaker === '青羽') ? pavilion() : vista(n), n, true)];
    if (n === 5) items.push.apply(items, qingyuScenes(D.qingyu_arc.stages.find(s => s.floor === 5))); if (n === 15) items.push(prepareChoice()); enqueue(items, done); return true;
  }
  function onPlayerDefeated(n, done) { queue = []; cur = null; auto = skipRead = false; enqueue([cin('player.defeat', '第 ' + n + ' 层 · 魂灯未熄', D.player_defeat.dialogue, n <= 4 ? { path: A + 'player-defeat-clean.png' } : vista(n), 5.2, n)], done); return true; }
  function playEnding(key, done) { enqueue(endingScenes(key === 'A' ? 'A' : 'B'), done); return true; }
  function onFinalChoice(fn) { enqueue([finalChoiceScene(fn)]); return true; }
  function getReplayEvents() {
    const result = [{ id: 'opening.awakening', title: '序章 · 在石棺里醒来', section: '苏醒与青羽', thumbnail: V3 + 'awakening-coffin.png' }];
    for (const q of D.qingyu_arc.stages) result.push({ id: q.stageId, title: q.title, section: '苏醒与青羽', thumbnail: V3 + 'qingyu-rain.png' });
    for (const f of D.floors) for (const moment of ['before', 'after']) result.push({ id: 'floor.' + f.floor + '.' + moment, title: String(f.floor).padStart(2, '0') + ' · ' + f.title + (moment === 'before' ? ' / 入场' : ' / 战后'), section: '十六层对白' });
    for (const key of BOSS) for (const sk of ['first_meeting', 'pre_battle', 'phase2', 'boss_defeated']) { const s = D.boss_stages[key][sk]; result.push({ id: s.stageId, title: CAST[key].name + ' / ' + s.title, section: '四位首领', thumbnail: bossArt(key, sk).path }); }
    result.push(
      { id: 'boss.qingyu.phase2', title: '青羽试炼影 / 第二阶段 · 千夜翠岚', section: '四位首领', thumbnail: V3 + 'qingyu-p2-awaken.jpg' },
      { id: 'boss.colossus.phase2', title: '倒悬机神 / 第二阶段 · 裂胸巨锯魔神', section: '四位首领', thumbnail: V3 + 'colossus-p2-awaken.jpg' },
      { id: 'boss.crimson.phase2', title: '荒祠古祟·绯狱妖主 / 第二阶段 · 血月黑角夜叉王', section: '四位首领', thumbnail: V3 + 'crimson-p2-awaken.jpg' }
    );
    result.push({ id: 'final.choice', title: '镜前的选择（预览）', section: '败北与结局' }, { id: 'player.defeat', title: '玩家败北 · 魂灯未熄', section: '败北与结局', thumbnail: A + 'player-defeat-clean.png' });
    for (const key of ['A', 'B']) result.push({ id: 'ending.' + key, title: D.endings[key].title, section: '败北与结局' }); return result;
  }
  function replayEvent(id, done) {
    if (isActive()) return false; let items = [];
    // Set preview before constructing choices; a preview must never inspect or gate on a live save.
    preview = true;
    if (id === 'opening.awakening') items = openingScenes();
    else if (id === 'boss.qingyu.phase2') items = specialBossPhase2Scenes('qingyu');
    else if (id === 'boss.colossus.phase2') items = specialBossPhase2Scenes('colossus');
    else if (id === 'boss.crimson.phase2') items = specialBossPhase2Scenes('crimson');
    else if (id === 'final.choice') items = [finalChoiceScene(choice => enqueue(endingScenes(choice === 'accept' ? 'A' : 'B')))];
    else if (id === 'player.defeat') items = [cin(id, '第 4 层 · 魂灯未熄', D.player_defeat.dialogue, { path: A + 'player-defeat-clean.png' }, 5.2, 4)];
    else if (/^ending\.[AB]$/.test(id)) items = endingScenes(id.slice(-1));
    else {
      const q = D.qingyu_arc.stages.find(s => s.stageId === id); if (q) items = qingyuScenes(q);
      const bm = /^boss\.(jinyu|astria|jialan|eclipse)\.(first_meeting|pre_battle|phase2|boss_defeated)$/.exec(id); if (bm) items = bossScenes(bm[1], bm[2]);
      const fm = /^floor\.(\d+)\.(before|after)$/.exec(id);
      if (fm) { const n = Number(fm[1]), f = floorData(n); items = fm[2] === 'before' ? floorBefore(n) : n % 4 === 0 ? bossScenes(bossKey(n), 'boss_defeated') : [dlg(id, '第 ' + n + ' 层 · ' + f.title, f.after, f.after.some(r => r.speaker === '青羽') ? pavilion() : vista(n), n, true)]; }
    }
    if (!items.length) { preview = false; return false; } replayDone = once(done); auto = skipRead = false; enqueue(items); return true;
  }
  function closeReplay() { if (!preview) return false; queue = []; cur = null; hideStage(); return true; }
  // Abort transport without completing queued callbacks or changing run progress.
  // Retry/menu callers from the combat layer use this compatibility interface.
  function abortActive() {
    if (typeof phase2ShatterFx !== 'undefined' && phase2ShatterFx && phase2ShatterFx.boss) {
      phase2ShatterFx.boss._ruptureHoldP1 = false;
    }
    queue = []; cur = null; auto = skipRead = false; hitstop = 0; hideStage();
  }
  function resetForNewRun() { seen = {}; history = []; abortActive(); }
  function getState() {
    const ln = line(); return { active: isActive(), kind: cur && cur.kind, eventId: cur && cur.id, lineIndex: cur && cur.idx, text: ln ? ln.text : '', speaker: ln ? ln.speaker : '', portraitId: ln ? speakerId(ln.speaker) : null,
      revealed: !!(cur && cur.revealed), awaitingScroll: !!(cur && cur.awaitingScroll), preview, hiddenUi: hidden, logOpen, auto, skipRead, history: history.map(x => Object.assign({}, x)),
      artPath: ui && ui.image._storyArt ? ui.image._storyArt.path : null, artFormat: ui ? ui.root.getAttribute('data-art-format') : null, artScale, cameraMaxScale,
      motion: { enabled: !prefs.reducedMotion, paused: motionPaused(), running: !!cur && !motionPaused() && motion.some(item => item.animation.playState === 'running'), preset: motionPreset, animationCount: motion.length },
      choices: cur && cur.kind === 'choice' ? cur.options.map(o => ({ id: o.id, label: o.label, disabled: !!o.disabled })) : [], queued: queue.filter(s => s.kind !== 'callback').length };
  }
  function isActive() { return !!(cur || queue.length); }
  function triggerHitstop(t) { if (!prefs.reducedMotion) hitstop = Math.max(hitstop, Math.min(.09, Number(t) || .03)); }
  function getRunState() { return { seen: Object.assign({}, seen) }; }
  function restoreRunState(value) { seen = Object.assign({}, value && value.seen || {}); }
  return { CHAR_CAST: CAST, onResize: fitArt, abortActive, resetForNewRun, triggerHitstop, toggleAutoPlay, setAutoPlay, isAutoPlay: () => auto,
    playOpeningSequence, preloadStoryEntry, onWaveStart, onBossPhase2, onSpecialBossPhase2, releaseRuptureHold, onBossDefeated, onFloorCleared, onPlayerDefeated, onFinalChoice, playEnding,
    advanceOrSkip, update, render: function () {}, isBlockingGameplay: isActive, isActive, getTimeScale: () => hitstop > 0 ? .04 : 1,
    replayEvent, getReplayEvents, closeReplay, getPreferences, setPreferences, getState, choose, getRunState, restoreRunState,
    toggleLog, setHidden, setSkipRead: value => { skipRead = !!value; syncControls(); } };
})();
if (typeof globalThis !== 'undefined') globalThis.SpireDirector = SpireDirector;
