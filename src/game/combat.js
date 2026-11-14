// 战斗数值结算、连锁闪电、范围爆炸、护甲闪避、战利品掉落与双轨清晰提示系统
// 每帧高频特效与飘字预算节流器（彻底根除后期群怪元素连锁、吸血、冲刺时的同帧渲染与结算尖峰）
let _frameHitTexts = 0;
let _frameSparks = 0;
let _frameHitBeeps = 0;
let _frameExplosions = 0;
let _frameReactRings = 0;
let _framePlagueSpreads = 0;
let _frameCyberBolts = 0;
let _activeWeaponId = '';
let _activeEnemyActor = null;
const LIFESTEAL_ICD_SEC = 0.12;
let _monsterMetaCache = null;

function resetCombatFrameBudgets() {
  _frameHitTexts = 0;
  _frameSparks = 0;
  _frameHitBeeps = 0;
  _frameExplosions = 0;
  _frameReactRings = 0;
  _framePlagueSpreads = 0;
  _frameCyberBolts = 0;
  _activeWeaponId = '';
  _activeEnemyActor = null;
}

const _EXTRA_PLAYER_DMG_META = {
  soul_dash:          { name: '青焰瞬步战技', icon: '◆' },
  turret_gun:         { name: '自律发条炮阵', icon: '🛰️' },
  turret_laser:       { name: '贯日浮游激光塔', icon: '🛸' },
  turret_shock:       { name: '紫电震波塔桩', icon: '🗼' },
  turret_totem:       { name: '秘法共鸣图腾塔', icon: '🔮' },
  landmine:           { name: '发条感应星雷', icon: '💣' },
  elemental_dot:      { name: '灼烧·风毒蚀伤', icon: '🔥' },
  elemental_reaction: { name: '四象聚变与星陨', icon: '⚛️' },
  relic_proc:         { name: '遗物反震与共鸣', icon: '✨' },
  bull_nova:          { name: '蛮牛烈焰冲撞', icon: '🐂' }
};

function _getMonsterMetaMap() {
  if (_monsterMetaCache) return _monsterMetaCache;
  const map = {};
  if (typeof BOSS_DEFS === 'object' && BOSS_DEFS) {
    for (const [k, v] of Object.entries(BOSS_DEFS)) {
      if (v) map[k] = { id: k, name: v.name, icon: v.icon || '👑' };
    }
  }
  if (typeof MINI_BOSS_DEFS === 'object' && MINI_BOSS_DEFS) {
    for (const [k, v] of Object.entries(MINI_BOSS_DEFS)) {
      if (v) map[k] = { id: k, name: v.name, icon: v.icon || '⚔️' };
    }
  }
  if (typeof SPECIAL_RELICS !== 'undefined' && Array.isArray(SPECIAL_RELICS)) {
    for (let i = 0; i < SPECIAL_RELICS.length; i++) {
      const sr = SPECIAL_RELICS[i];
      if (sr && sr.bossId) map[sr.bossId] = { id: sr.bossId, name: sr.bossName, icon: sr.bossIcon || '👁️' };
    }
  }
  if (typeof MONSTER_CODEX !== 'undefined' && Array.isArray(MONSTER_CODEX)) {
    for (let i = 0; i < MONSTER_CODEX.length; i++) {
      const m = MONSTER_CODEX[i];
      if (m && m.id && !map[m.id]) map[m.id] = { id: m.id, name: m.name, icon: m.icon || '👾' };
    }
  }
  map.mini_slime = { id: 'mini_slime', name: '分裂孢子幼体', icon: '🟢' };
  map.trap_sky_lance = { id: 'trap_sky_lance', name: '蚀界·天外贯星梭', icon: '☄️' };
  map.trap_fissure = { id: 'trap_fissure', name: '蚀界·地脉撕裂裂缝', icon: '🌋' };
  map.trap_corridor = { id: 'trap_corridor', name: '蚀界·天劫平行剑阵', icon: '⚔️' };
  map.trap_ring = { id: 'trap_ring', name: '蚀界·终末风眼环震', icon: '⭕' };
  map.trap_cross_star = { id: 'trap_cross_star', name: '蚀界·旋星十字裂光', icon: '✴️' };
  map.trap_meteor = { id: 'trap_meteor', name: '蚀界·连环坠星轰击', icon: '🌠' };
  map.trap_void_orb = { id: 'trap_void_orb', name: '蚀界·游弋冥渊雷涡', icon: '🌀' };
  map.terrain_lava = { id: 'terrain_lava', name: '地形·锻炉熔火方槽', icon: '🔥' };
  map.terrain_swamp = { id: 'terrain_swamp', name: '地形·翡翠秘毒方渠', icon: '🧪' };
  _monsterMetaCache = map;
  return map;
}

function recordWeaponDamage(srcId, amount, killed = false) {
  if (!player || !Number.isFinite(amount) || amount <= 0) return;
  if (!player.runStats) player.runStats = { weaponDmg: {}, dmgTaken: {}, totalDealt: 0, totalTaken: 0 };
  const rs = player.runStats;
  const key = srcId || _activeWeaponId || 'relic_proc';
  let entry = rs.weaponDmg[key];
  const tpl = typeof WEAPONS !== 'undefined' && WEAPONS ? WEAPONS[key] : null;
  if (!entry) {
    const ext = _EXTRA_PLAYER_DMG_META[key];
    entry = {
      id: key,
      name: tpl ? tpl.name : (ext ? ext.name : '共鸣残响伤害'),
      icon: tpl ? tpl.icon : (ext ? ext.icon : '✨'),
      tier: tpl ? 1 : 0,
      evoName: '',
      isWeapon: !!tpl,
      dmg: 0,
      hits: 0,
      kills: 0
    };
    rs.weaponDmg[key] = entry;
  }
  if (tpl && Array.isArray(player.weapons)) {
    for (let i = 0; i < player.weapons.length; i++) {
      const pw = player.weapons[i];
      if (pw && pw.id === key) {
        if ((pw.tier || 1) >= (entry.tier || 1)) {
          entry.tier = pw.tier || 1;
          if (pw.evoName) entry.evoName = pw.evoName;
        }
      }
    }
  }
  entry.dmg += amount;
  entry.hits += 1;
  if (killed) entry.kills += 1;
  rs.totalDealt = (rs.totalDealt || 0) + amount;
}

function resolveEnemySourceMeta(src) {
  const map = _getMonsterMetaMap();
  if (!src) src = _activeEnemyActor;
  if (!src) {
    // 兜底：若为未知弹幕或接触，就近匹配最近存活魔物/首领
    if (player && typeof enemies !== 'undefined' && enemies.length > 0) {
      let best = null, bestD = Infinity;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e) continue;
        const d = (e.x - player.x) * (e.x - player.x) + (e.y - player.y) * (e.y - player.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) src = best;
    }
  }
  if (typeof src === 'string') {
    if (map[src]) return map[src];
    return { id: src, name: src, icon: '👾' };
  }
  if (src && typeof src === 'object') {
    if (src.id && src.name) return { id: src.id, name: src.name, icon: src.icon || '👾' };
    const k = src.srcKey || src.variant || src.type || 'unknown_mob';
    if (map[k]) return map[k];
    if (src.bossTitle) {
      const cleanTitle = String(src.bossTitle).replace(/^⚡\s*/, '').replace(/\s*·\s*第[一二]阶段$/, '').replace(/\s*·\s*神话二阶段$/, '');
      return { id: k, name: cleanTitle, icon: '👑' };
    }
    return { id: k, name: '深渊魔物袭击', icon: '👾' };
  }
  return { id: 'abyss_attack', name: '深渊魔物袭击', icon: '👾' };
}

function recordDamageTaken(src, amount, isFatal = false) {
  if (!player || !Number.isFinite(amount) || amount <= 0) return;
  if (!player.runStats) player.runStats = { weaponDmg: {}, dmgTaken: {}, totalDealt: 0, totalTaken: 0 };
  const rs = player.runStats;
  const meta = resolveEnemySourceMeta(src);
  const key = meta.id || 'abyss_attack';
  let entry = rs.dmgTaken[key];
  if (!entry) {
    entry = { id: key, name: meta.name, icon: meta.icon || '👾', dmg: 0, hits: 0, maxHit: 0, fatal: false };
    rs.dmgTaken[key] = entry;
  }
  entry.dmg += amount;
  entry.hits += 1;
  if (amount > (entry.maxHit || 0)) entry.maxHit = amount;
  if (isFatal) entry.fatal = true;
  rs.totalTaken = (rs.totalTaken || 0) + amount;
}

// 双轨飘字分级：只有本体关键状态/奇遇/地形/首领/升级提示（important=true 或 customDur>=1.25）才带深色胶囊底并持久停留；
// 怪物普通反馈与高频数值飘字（important=false）纯文本轻快上浮（禁用彩色 Emoji 杜绝 DirectWrite 描边卡顿）。
function addText(x, y, txt, color = '#fff', size = 16, customDur = 0, forceImportant = null) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const s = String(txt);
  const isNumericHit = /^[+-]?\d+!?$/.test(s);
  const important = forceImportant !== null
    ? !!forceImportant
    : (customDur > 0 ? customDur >= 1.25 : !isNumericHit);
  const dur = customDur > 0 ? customDur : (important ? 1.85 : 0.56);
  const cap = isTouch ? 36 : 54;
  if (texts.length >= cap) {
    // 优先淘汰普通伤害/轻提示，绝不让高频弹幕把角色头顶的关键状态/奇遇提示挤掉
    let dropIdx = -1;
    for (let i = 0; i < texts.length; i++) {
      if (!texts[i].important) { dropIdx = i; break; }
    }
    if (dropIdx === -1) dropIdx = 0;
    texts.splice(dropIdx, 1);
  }
  texts.push({
    x: x + (Math.random() - 0.5) * (important ? 10 : 16), y,
    vx: (Math.random() - 0.5) * (important ? 12 : 44),
    vy: important ? (-30 - Math.random() * 8) : (-118 - Math.random() * 38),
    txt: s, color, size, t: dur, maxT: dur, important,
    isCritPop: isNumericHit && s.endsWith('!'),
    _baseW: -1
  });
}

// 屏幕上方战术事件持久横幅播报（停留 3.2~4.2 秒，清晰易读不挡操作）
function announce(txt, color = '#ffd166', dur = 3.4) {
  if (typeof banners === 'undefined') return;
  const s = String(txt);
  const existing = banners.find(b => b.txt === s);
  if (existing) {
    existing.t = Math.max(existing.t, dur);
    existing.maxT = Math.max(existing.maxT, dur);
    existing.color = color;
    return;
  }
  if (banners.length >= 2) banners.shift();
  banners.push({ txt: s, color, t: dur, maxT: dur, _tw: 0, _fSize: 0 });
}

let _partWriteIdx = 0, _sparkWriteIdx = 0;
function pushParticle(p) {
  const cap = isTouch ? 72 : 112;
  if (particles.length < cap) {
    particles.push(p);
  } else {
    particles[_partWriteIdx++ % cap] = p;
  }
}

function pushSpark(sp) {
  const cap = isTouch ? 38 : 58;
  if (sparks.length < cap) {
    sparks.push(sp);
  } else {
    sparks[_sparkWriteIdx++ % cap] = sp;
  }
}

function pushStain(st) {
  const maxStains = isTouch ? 14 : 20;
  if (stains.length >= maxStains) stains.splice(0, 6);
  stains.push(st);
}

function pickRandomAliveEnemy(exclude = null) {
  let count = 0, chosen = null;
  for (let i = 0; i < enemies.length; i++) {
    const o = enemies[i];
    if (o && o !== exclude && o.hp > 0 && !o.primed) {
      count++;
      if (Math.random() * count < 1) chosen = o;
    }
  }
  return chosen;
}

function addBurst(x, y, color, n = 6, speed = 135) {
  const cnt = isTouch ? Math.max(4, Math.ceil(n * 0.78)) : n;
  for (let i = 0; i < cnt; i++) {
    const a = Math.random() * Math.PI * 2, s = 35 + Math.random() * speed;
    const dur = 0.26 + Math.random() * 0.18;
    pushParticle({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 2.6 + Math.random() * 3.2, color, t: dur, maxT: dur });
  }
}

// 利落明亮的方向性受击火花（白炽内芯 + 彩芒拖尾，预存单位向量免除渲染帧 hypot 开销）
function addSparks(x, y, baseA, color = '#ffe8a3', n = 3) {
  const cnt = isTouch ? Math.max(2, Math.ceil(n * 0.8)) : n;
  for (let i = 0; i < cnt; i++) {
    const a = baseA + (Math.random() - 0.5) * 1.15;
    const ca = Math.cos(a), sa = Math.sin(a);
    const spd = 165 + Math.random() * 210;
    pushSpark({ x, y, vx: ca * spd, vy: sa * spd, ux: ca, uy: sa, len: 9 + Math.random() * 8, color, t: 0.19, maxT: 0.19 });
  }
}

// 连锁闪电弹跳逻辑（电击枪、紫电法杖 & 特斯拉线圈共用）
function castChainLightning(sx, sy, firstTarget, jumps, rawDmg, critChance, srcId = '') {
  const visited = new Set();
  const useSrc = srcId || _activeWeaponId || 'taser';
  let curX = sx, curY = sy, target = firstTarget;
  for (let step = 0; step < jumps && target; step++) {
    visited.add(target);
    const pts = [{ x: curX, y: curY }];
    const segs = 4;
    for (let s = 1; s < segs; s++) {
      const f = s / segs;
      const jx = (Math.random() - 0.5) * 18, jy = (Math.random() - 0.5) * 18;
      pts.push({ x: curX + (target.x - curX) * f + jx, y: curY + (target.y - curY) * f + jy });
    }
    pts.push({ x: target.x, y: target.y });
    if (lightnings.length < 35) {
      lightnings.push({ pts, color: step === 0 ? '#72efdd' : '#4cc9f0', t: 0.14, maxT: 0.14 });
    }

    const isCrit = Math.random() < critChance;
    const falloff = Math.pow(0.88, step);
    const cmul = getEffectiveCritMult(1.85);
    hurtEnemy(target, rawDmg * falloff * (isCrit ? cmul : 1), isCrit, Math.atan2(target.y - curY, target.x - curX), true, { forceChill: true, srcId: useSrc });
    if (state !== 'wave') break;
    curX = target.x; curY = target.y;

    let next = null, bestDSq = 195 * 195;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e && e.hp > 0 && !e.primed && !visited.has(e)) {
        const dx = e.x - curX, dy = e.y - curY;
        const dSq = dx * dx + dy * dy;
        if (dSq < bestDSq) { bestDSq = dSq; next = e; }
      }
    }
    target = next;
  }
}

// 冲击波/爆炸逻辑（支持常规爆破与 innerSafeR > 0 的「贴身内圈安全外环震波」，带递归熔断与群怪同帧节流）
let blastDepth = 0;
function triggerExplosion(x, y, radius, enemyDmg, hurtPlayerToo = false, playerDmg = 0, ringColor = '#ff595e', leaveScorch = true, innerSafeR = 0, srcMeta = null) {
  if (blastDepth > 2 || !Number.isFinite(x) || !Number.isFinite(y)) return;
  blastDepth++;
  _frameExplosions++;
  try {
    radius = Math.max(8, radius || 40);
    const crowded = _frameExplosions > 1 || enemies.length > 26;
    if (rings.length < 30) rings.push({ x, y, r: radius, innerR: innerSafeR || 0, color: ringColor, t: 0.28, maxT: 0.28, fill: false });
    if (leaveScorch && !innerSafeR && !crowded && stains.length < 12) {
      pushStain({ x, y, r: radius * 0.36, color: '#14101c', kind: 'scorch' });
    }
    if (_frameExplosions <= 2) beep(135, 0.11, 'sawtooth', 0.05);
    addBurst(x, y, ringColor, crowded ? 5 : 10, crowded ? 165 : 205);
    if (!crowded) addSparks(x, y, Math.random() * 6.28, '#ffd166', 4);
    const expSrcId = (typeof srcMeta === 'string' ? srcMeta : (srcMeta && srcMeta.srcId)) || _activeWeaponId || 'relic_proc';
    if (enemyDmg > 0) {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e || e.hp <= 0 || e.primed) continue;
        const dx = e.x - x, dy = e.y - y;
        const outerR = radius + e.r;
        const dSq = dx * dx + dy * dy;
        if (dSq <= outerR * outerR && (!innerSafeR || dSq >= Math.max(0, innerSafeR - e.r) * Math.max(0, innerSafeR - e.r))) {
          const applyNapalm = !hurtPlayerToo && player && player.napalmBlast;
          hurtEnemy(e, enemyDmg, false, Math.atan2(dy, dx), true, { noProc: true, isExplosion: true, silentHit: true, knockMult: 1.4, forceBurn: applyNapalm, srcId: expSrcId });
          if (state !== 'wave') break;
        }
      }
      if (state !== 'wave') return;
      for (let i = trees.length - 1; i >= 0; i--) {
        const tr = trees[i];
        if (!tr || tr.hp <= 0) continue;
        const dx = tr.x - x, dy = tr.y - y, lim = radius + tr.r;
        if (dx * dx + dy * dy <= lim * lim) {
          hurtTree(tr, enemyDmg * 0.6);
        }
      }
    }
    if (hurtPlayerToo && player && state === 'wave') {
      const dP = Math.hypot(player.x - x, player.y - y);
      if (innerSafeR > 0 && dP < innerSafeR - 4) {
        if (player.terrainHintT <= 0) {
          player.terrainHintT = 1.6;
          addText(player.x, player.y - 38, '贴身风眼无伤规避!', '#72efdd', 15, 1.5);
        }
      } else if (dP <= radius + player.r - 6) {
        hurtPlayer(playerDmg, false, srcMeta || _activeEnemyActor);
      }
    }
  } finally {
    blastDepth--;
  }
}

function getTotalArmor() { return (player ? player.armor : 0) + getSetBonuses().armor + getRockCount(); }
function getTotalRangeBonus() {
  const scale = typeof PLAYER_RANGE_SCALE === 'number' ? PLAYER_RANGE_SCALE : 0.80;
  return Math.round(((player ? player.rangeBonus : 0) + getSetBonuses().range) * scale);
}
// 参照《土豆兄弟 (Brotato)》线性等效生命 (Linear EHP) 递减护甲曲线：
// 正护甲减伤 = a / (a + 20) 且硬上限 60%（5甲=20%, 10甲=33%, 20甲=50%, 30甲=60%），负护甲承受额外增伤 a / (15 - a)
function calcBrotatoArmorMitigation(armorVal) {
  const a = Number(armorVal) || 0;
  return a >= 0 ? Math.min(0.60, a / (a + 20)) : Math.max(-0.65, a / (15 - a));
}
globalThis.calcBrotatoArmorMitigation = calcBrotatoArmorMitigation;

function getArmorMitigation() {
  return calcBrotatoArmorMitigation(getTotalArmor());
}
function getEffectiveDmgMul() {
  if (!player) return 1;
  const penalty = player.cls === 'multitasker' ? player.weapons.length * 0.04 : 0;
  const rangeConvert = player.rangeToDmg ? Math.max(0, Math.floor(getTotalRangeBonus() / 12)) * 0.01 : 0;
  const hpConvert = (player.hpToDmg || 0) > 0 ? Math.max(0, Math.floor(player.maxHp / 5)) * 0.02 * player.hpToDmg : 0;
  const armorConvert = (player.armorToDmg || 0) > 0 ? Math.max(0, getTotalArmor()) * 0.015 * player.armorToDmg : 0;
  const regenConvert = (player.regenToDmg && !player.noRegen && player.regen > 0) ? player.regen * 0.025 : 0;
  const dashSurgeBonus = (player.dashSurgeT || 0) > 0 ? 0.22 : 0;
  return Math.max(0.25, player.dmgMul - penalty + rangeConvert + hpConvert + armorConvert + regenConvert + dashSurgeBonus);
}
function getEffectiveAtkSpd() {
  const scale = typeof PLAYER_ASPD_SCALE === 'number' ? PLAYER_ASPD_SCALE : 0.70;
  if (!player) return scale;
  const missingBonus = player.cls === 'vampire' ? (1 - Math.max(0, player.hp) / Math.max(1, player.maxHp)) * 0.9 : 0;
  const sporeBonus = player.inSpore ? 0.14 : 0;
  const auraBonus = (player._inTurretAura && (player.turretAuraHeal || 0) > 0) ? 0.14 : 0;
  const dashBonus = ((player.dashHasteT || 0) > 0 ? 0.20 : 0) + ((player.dashSurgeT || 0) > 0 ? 0.18 : 0);
  return Math.max(0.18, (player.atkSpd + getSetBonuses().aspd + missingBonus + sporeBonus + auraBonus + dashBonus) * scale);
}
function getEffectiveCrit() { return (player ? player.crit : 0) + getSetBonuses().crit; }
function getEffectiveCritMult(baseMult = 1.95) { return baseMult + (player ? (player.critDmg || 0) : 0); }
function getElemMul() { return 1 + (player ? player.elemBonus : 0) + getSetBonuses().elem; }
function getTechMul() {
  const bastionBonus = (player && (player.turretBastion || 0) > 0 && typeof turrets !== 'undefined')
    ? Math.min(5, turrets.length) * 0.06 * player.turretBastion
    : 0;
  const elemInherit = (player && player.turretElemInherit) ? Math.max(0, (player.elemBonus || 0) + getSetBonuses().elem) * 0.55 : 0;
  return 1 + (player ? (player.techBonus || 0) : 0) + getSetBonuses().tech + bastionBonus + elemInherit;
}
function getBlastScale() { return (player ? player.explosionScale : 1) + getSetBonuses().blast; }
function getEffectiveSpdMul() {
  if (!player) return 1;
  const dashSpd = (player.dashHasteT || 0) > 0 ? 0.26 : 0;
  const raw = player.spdMul + dashSpd;
  return player.noSlow ? Math.max(1.0, raw) : Math.max(0.72, raw);
}

// v2.5.0 【青焰瞬步 · Soul Dash】全角色通用极速闪避 + 六大角色专属派生战技
function triggerSoulDash() {
  if (!player || state !== 'wave' || player.hp <= 0 || bossCutscene) return false;
  if (typeof SpireDirector !== 'undefined' && SpireDirector && SpireDirector.isBlockingGameplay()) return false;
  if ((player.iceFreezeT || 0) > 0) return false;
  if ((player.dashCd || 0) > 0.01 || (player.dashT || 0) > 0) return false;

  const prevWpnId = _activeWeaponId;
  _activeWeaponId = 'soul_dash';
  try {
  let dx = 0, dy = 0;
  if (typeof keys !== 'undefined') {
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
  }
  if (typeof joy !== 'undefined' && joy.active && joy.mag > 0.08) {
    dx += joy.dx;
    dy += joy.dy;
  }
  if (dx === 0 && dy === 0 && (Math.hypot(player.vx || 0, player.vy || 0) > 25)) {
    dx = player.vx;
    dy = player.vy;
  }
  if (dx === 0 && dy === 0) {
    const la = Number.isFinite(player.lookA) ? player.lookA : ((player.faceDir || 1) > 0 ? 0 : Math.PI);
    dx = Math.cos(la);
    dy = Math.sin(la);
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;

  const ox = player.x, oy = player.y;
  const cdMax = Math.max(1.15, (player.cls === 'ghost' ? 2.5 : 3.2) * (player.dashCdMul || 1));
  player.dashMaxCd = cdMax;
  player.dashCd = cdMax;
  player.dashT = 0.17;
  const dashSpd = 960;
  player.dashVx = dx * dashSpd;
  player.dashVy = dy * dashSpd;
  player.lookA = Math.atan2(dy, dx);
  if (Math.abs(dx) > 0.08) player.faceDir = dx > 0 ? 1 : -1;
  player.invuln = 0;
  player.magnetPulseT = Math.max(player.magnetPulseT || 0, 1.15);
  if (player.dashSurge) player.dashSurgeT = 2.6;
  if (typeof survivalTrialWave !== 'undefined' && survivalTrialWave && typeof survivalTrialState !== 'undefined' && survivalTrialState) {
    survivalTrialState.lanternBoostT = 1.25;
  }

  // 瞬步起手即斩碎近身敌方弹幕（无全局无敌帧下依靠主动身法与斩弹操作规避伤害）
  for (let bi = eBullets.length - 1; bi >= 0; bi--) {
    const eb = eBullets[bi];
    if (eb && Math.hypot(eb.x - ox, eb.y - oy) <= 54 + (eb.r || 5)) {
      addSparks(eb.x, eb.y, Math.random() * 6.28, '#72efdd', 2);
      eBullets.splice(bi, 1);
    }
  }

  beep(680, 0.065, 'triangle', 0.048);
  addBurst(ox, oy, '#72efdd', 9, 185);
  if (rings.length < 40) rings.push({ x: ox, y: oy, r: 48, color: '#72efdd', t: 0.20, maxT: 0.20 });

  if (player.dashFreezeNova && player.cls !== 'ranger') {
    if (rings.length < 40) rings.push({ x: ox, y: oy, r: 112, color: '#7dd3fc', t: 0.22, maxT: 0.22 });
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e && e.hp > 0 && !e.primed && Math.hypot(e.x - ox, e.y - oy) <= 115 + e.r) {
        applyFreeze(e, 1.15);
      }
    }
  }
  if (player.turretSalvo) triggerTurretSalvo();

  const cls = player.cls || 'allrounder';
  const baseDmg = (22 + wave * 4.6) * getEffectiveDmgMul();
  const dashCrowded = enemies.length > 14;

  if (cls === 'brawler') {
    // 烬羽 · 断刃一闪：向前劈出大弧度绯红居合刀波，高暴击斩穿路径敌群并切碎沿途敌弹
    const slashA = Math.atan2(dy, dx);
    const sx = ox + dx * 62, sy = oy + dy * 62;
    if (slashes.length < 36) {
      slashes.push({ x: sx, y: sy, angle: slashA, r: 138, color: '#fb7185', mode: 'crescent', t: 0.22, maxT: 0.22 });
    }
    for (let bi = eBullets.length - 1; bi >= 0; bi--) {
      const eb = eBullets[bi];
      if (eb && Math.hypot(eb.x - sx, eb.y - sy) <= 112 + (eb.r || 5)) {
        addSparks(eb.x, eb.y, slashA, '#fb7185', 2);
        eBullets.splice(bi, 1);
      }
    }
    const sDmg = baseDmg * 1.42 * (1 + (player.meleeBonus || 0));
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e || e.hp <= 0 || e.primed) continue;
      const ex = e.x - sx, ey = e.y - sy;
      if (ex * ex + ey * ey <= (146 + e.r) * (146 + e.r)) {
        const isCrit = Math.random() < Math.min(0.95, getEffectiveCrit() + 0.35);
        hurtEnemy(e, sDmg * (isCrit ? getEffectiveCritMult() : 1), isCrit, slashA, true, { isMelee: true, knockMult: 1.5, silentHit: dashCrowded, noProc: dashCrowded, srcId: 'soul_dash' });
      }
    }
    addText(ox, oy - 30, '断刃一闪!', '#fb7185', 14, 0.58, false);
  } else if (cls === 'ranger') {
    // 艾丝特莉亚 · 碎冕霜步：原地冻结霜环 + 向后齐射3枚穿透寒霜冰锥
    if (rings.length < 30) rings.push({ x: ox, y: oy, r: 102, color: '#7dd3fc', t: 0.22, maxT: 0.22, fill: false });
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e || e.hp <= 0 || e.primed) continue;
      if (Math.hypot(e.x - ox, e.y - oy) <= 104 + e.r) {
        applyFreeze(e, 1.35);
        hurtEnemy(e, baseDmg * 0.92 * getElemMul(), false, Math.atan2(e.y - oy, e.x - ox), true, { forceChill: true, silentHit: true, noProc: dashCrowded, srcId: 'soul_dash' });
      }
    }
    const backA = Math.atan2(-dy, -dx);
    for (let k = -1; k <= 1 && bullets.length < 220; k++) {
      const ba = backA + k * 0.24;
      const isCrit = Math.random() < Math.min(0.95, getEffectiveCrit() + 0.20);
      bullets.push({
        x: ox, y: oy, px: ox, py: oy,
        vx: Math.cos(ba) * 620, vy: Math.sin(ba) * 620,
        dmg: baseDmg * 0.88 * getElemMul() * (isCrit ? getEffectiveCritMult() : 1),
        isCrit, angle: ba, pierce: 2, bounces: player.bounceBonus || 0,
        isIce: true, freezeHit: 0.45, srcId: 'soul_dash',
        life: 0.62, maxLife: 0.62, color: '#72efdd', r: 5.5,
        hit: null, lastHit: null
      });
    }
    addText(ox, oy - 30, '碎冕霜步', '#7dd3fc', 14, 0.58, false);
  } else if (cls === 'engineer') {
    // 伽蓝 · 逆时超频：全场炮台超频 +75% 射速，并在残影处布下高能时滞感应雷
    player.turretOverclockT = 2.8;
    if (mines.length < 18) {
      mines.push({
        x: ox, y: oy, r: 15, triggerR: 60,
        blastR: 112 * getBlastScale(),
        dmg: baseDmg * 1.38 * getTechMul(),
        srcId: 'soul_dash',
        armT: 0.12, pulse: 0, life: 18
      });
    }
    if (player.maxShield > 0) {
      player.shield = Math.min(player.maxShield, (player.shield || 0) + 3);
    }
    addText(ox, oy - 30, '逆时超频!', '#fde68a', 14, 0.58, false);
  } else if (cls === 'ghost') {
    // 青羽 · 苍岚风羽：短CD瞬步 + 疾风攻移速增益 + 5枚翠岚弹射风羽镖
    player.dashHasteT = 2.0;
    for (let k = 0; k < 5 && bullets.length < 220; k++) {
      const target = pickRandomAliveEnemy(null);
      const ba = target ? Math.atan2(target.y - oy, target.x - ox) + (k - 2) * 0.09 : (k / 5) * Math.PI * 2;
      const isCrit = Math.random() < Math.min(0.95, getEffectiveCrit() + 0.15);
      bullets.push({
        x: ox, y: oy, px: ox, py: oy,
        vx: Math.cos(ba) * 590, vy: Math.sin(ba) * 590,
        dmg: baseDmg * 0.78 * getElemMul() * (isCrit ? getEffectiveCritMult() : 1),
        isCrit, angle: ba, pierce: 1, bounces: 1 + (player.bounceBonus || 0),
        isDart: true, poisonHit: 0.85, srcId: 'soul_dash',
        life: 0.78, maxLife: 0.78, color: '#6ee7b7', r: 5.2,
        hit: null, lastHit: null
      });
    }
    addText(ox, oy - 30, '苍岚风羽', '#6ee7b7', 14, 0.58, false);
  } else if (cls === 'multitasker') {
    // 日蚀圣女 · 黑日天罚：瞬步引落最多3道黑日金雷轰击附近敌群
    const wBonus = 1 + (player.weapons ? player.weapons.length : 2) * 0.06;
    let struck = 0;
    for (let i = 0; i < enemies.length && struck < 3; i++) {
      const e = enemies[i];
      if (!e || e.hp <= 0 || e.primed) continue;
      if (Math.hypot(e.x - ox, e.y - oy) <= 310) {
        struck++;
        if (lightnings.length < 35) {
          lightnings.push({
            pts: [{ x: e.x + (struck - 2) * 14, y: Math.max(12, e.y - 210) }, { x: e.x, y: e.y }],
            color: '#fde68a', t: 0.22, maxT: 0.22
          });
        }
        hurtEnemy(e, baseDmg * 0.95 * wBonus, true, null, true, { forceBurn: true, srcId: 'soul_dash' });
      }
    }
    if (rings.length < 30) rings.push({ x: ox, y: oy, r: 92, color: '#fde68a', t: 0.20, maxT: 0.20 });
    addText(ox, oy - 30, '黑日天罚!', '#fde68a', 14, 0.58, false);
  } else {
    // 零号 · 青焰净魂：原地绽放青焰魂灯净化新星，灼烧近身敌群并微幅稳固心火
    if (rings.length < 30) rings.push({ x: ox, y: oy, r: 108, color: '#5eead4', t: 0.22, maxT: 0.22, fill: false });
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e || e.hp <= 0 || e.primed) continue;
      if (Math.hypot(e.x - ox, e.y - oy) <= 110 + e.r) {
        hurtEnemy(e, baseDmg * 1.05 * getElemMul(), false, Math.atan2(e.y - oy, e.x - ox), true, { forceBurn: true, knockMult: 1.3, silentHit: true, noProc: dashCrowded, srcId: 'soul_dash' });
      }
    }
    if (player.hp > 0 && player.hp < player.maxHp && !player.noRegen && Math.random() < 0.55) {
      player.hp = Math.min(player.maxHp, player.hp + 1);
    }
    addText(ox, oy - 30, '青焰净魂', '#5eead4', 14, 0.58, false);
  }
  return true;
  } finally {
    _activeWeaponId = prevWpnId;
  }
}
// 对齐中后期 <=80 同屏怪上限后的单怪晶石购买力曲线（全局晶石/金币获取上调 +10%，CRYSTAL_YIELD_MUL=0.77）
function getWaveMatRate(w) {
  const wv = Math.max(1, w || 1);
  const yieldMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.77;
  return (0.92 * yieldMul) / (1 + Math.min(5, Math.max(0, wv - 1)) * 0.14 + Math.max(0, wv - 6) * 0.075);
}

// 冰冻与剧毒元素状态施加函数（怪物周身自带清晰六棱冰晶护壳渲染，移除群怪冰冻 Emoji 飘字防卡顿）
function applyFreeze(e, dur = 1.2) {
  if (!e || e.hp <= 0 || e.primed) return;
  const isBossLike = e.type === 'boss' || e.type === 'special_boss' || e.type === 'mini_boss';
  const actualDur = isBossLike ? 0.55 : dur;
  e.freezeT = Math.max(e.freezeT || 0, actualDur);
  e.chillT = Math.max(e.chillT || 0, actualDur + 1.4);
}

function applyPoison(e, addStacks = 1) {
  if (!e || e.hp <= 0 || e.primed) return;
  const maxS = (player && player.maxPoisonStacks) || 8;
  e.poisonStacks = Math.min(maxS, (e.poisonStacks || 0) + addStacks);
  e.poisonT = 4.2;
  if (!e.poisonTick || e.poisonTick <= 0) e.poisonTick = 0.46;
}

// 主线固定第二阶段剧情死战，无尽保留 33% 神话觉醒与额外战利品（血量再提升 50% + 攻击力提升 30% + 纯死战不加冗余时间）
function triggerBossMythicPhase2(e) {
  if (!e || e.mythicPhase2) return false;
  const storyPhase = !!e.storyPhaseBoss && !endlessMode;
  if (!storyPhase && player && player.waveMythicAwakened) {
    e.canPhase2 = false;
    return false;
  }
  if (player) {
    player.waveMythicAwakened = true;
    if (!storyPhase) player.mythicAwakenedCount = (player.mythicAwakenedCount || 0) + 1;
  }
  e.mythicPhase2 = true;
  if (storyPhase) e.storyStage = 2;
  e.canPhase2 = false;
  e.maxHp = Math.max(450, Math.round(e.maxHp * 1.50));
  e.hp = e.maxHp;
  e.r = Math.round(e.r * 1.14);
  e.dmg = Math.round(e.dmg * 1.30);
  e.spd *= 1.10;
  e.exposeT = 0;
  e.p2SkillT = 1.85;
  e.p2WindupT = 0;
  if (storyPhase) {
    e.bossTitle = String(e.bossTitle || '守誓者').replace(/ · 第一阶段$/, '') + ' · 第二阶段';
  } else if (!String(e.bossTitle || '').includes('神话')) {
    e.bossTitle = `⚡ ${e.bossTitle || '深渊首领'} · 神话二阶段`;
  }

  // 清空玩家身边密集敌弹，保证二阶段转场公平且充满史诗仪式感（已取消主角全局无敌帧）
  if (player) {
    player.invuln = 0;
    for (let i = eBullets.length - 1; i >= 0; i--) {
      if (Math.hypot(eBullets[i].x - player.x, eBullets[i].y - player.y) < 260) eBullets.splice(i, 1);
    }
  }
  beep(155, 0.32, 'sawtooth', 0.09);
  if (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.triggerHitstop === 'function') {
    SpireDirector.triggerHitstop(0.055);
  }
  if (rings.length < 30) {
    rings.push({ x: e.x, y: e.y, r: 240, color: '#ffd166', t: 0.42, maxT: 0.42, fill: false });
    rings.push({ x: e.x, y: e.y, r: 165, color: '#ff2a55', t: 0.34, maxT: 0.34 });
  }
  addBurst(e.x, e.y, '#ffd166', 24, 250);
  if (lightnings.length < 35) {
    for (let k = -1; k <= 1; k++) {
      lightnings.push({ pts: [{ x: e.x + k * 42, y: Math.max(10, e.y - 320) }, { x: e.x + k * 18, y: e.y - 140 }, { x: e.x, y: e.y }], color: k === 0 ? '#ffd166' : '#ff2a55', t: 0.35, maxT: 0.35 });
    }
  }
  const bw = document.getElementById('bossBarWrap');
  if (bw) { bw.classList.remove('hidden'); bw.classList.add('mythic'); }
  if (storyPhase && typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.onBossPhase2 === 'function') {
    SpireDirector.onBossPhase2(wave, e);
  }
  // 随机觉醒立绘横幅属于无尽模式；主线由剧情导演演出，不叠加横幅或神话掉落承诺。
  if (endlessMode) {
    const p2Title = (e.bossTitle || '神话首领').replace(/^⚡\s*/, '');
    const p2Sub = '宿命死战 · 二阶段专属隐藏立绘与专属终式解封！';
    const p2Tag = '不加冗余时间 · 解锁二阶段专属终极杀招 · 击败必爆【传说圣遗物匣】与永久赐福！';
    const p2Dur = (typeof BOSS_CUTSCENE_TOTAL_SEC === 'number') ? BOSS_CUTSCENE_TOTAL_SEC : 4.85;
    const dirBlocking = (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.isBlockingGameplay === 'function' && SpireDirector.isBlockingGameplay());
    if (dirBlocking && typeof queueBossCutscene === 'function') {
      queueBossCutscene('mythic_phase2', e.variant, p2Title, p2Sub, p2Tag, '#ff2a55', '#ffd166', p2Dur);
    } else if (typeof startBossCutscene === 'function') {
      startBossCutscene('mythic_phase2', e.variant, p2Title, p2Sub, p2Tag, '#ff2a55', '#ffd166', p2Dur);
    }
  }
  if (storyPhase) {
    logInfo('STORY_PHASE2', `${e.bossTitle} · HP=${e.maxHp} · DMG=${e.dmg} · 不发放胜利奖励`);
  } else {
    if (player) addText(player.x, player.y - 52, '◆ 二阶段觉醒！专属终极技能解封！', '#ffd166', 21, 2.8);
    announce('◆ 逆天异变！首领觉醒【隐藏神话二阶段】并解锁专属二阶终式，击败必掉传说神装！', '#ffd166', 4.5);
    logInfo('MYTHIC_PHASE2', `首领触发隐藏二阶段死战觉醒 ${e.bossTitle} · HP=${e.maxHp} · DMG=${e.dmg}`);
  }
  return true;
}

// D5（第999次神罚）专属二阶段首领【10秒临死挣扎】常量与状态触发器（整场首领战仅触发一次：10s 无敌 + 攻速+20% + 每次伤害到玩家回血 10%）
const D5_LAST_STAND_DURATION_SEC = 10.0;
const D5_LAST_STAND_ASPD_MUL = 1.20;
const D5_LAST_STAND_HEAL_RATIO = 0.10;

function canTriggerD5BossLastStand(e) {
  return !!(
    e &&
    e.type === 'boss' &&
    e.mythicPhase2 &&
    !e._d5LastStandUsed &&
    !(e.d5LastStandT > 0) &&
    typeof diff !== 'undefined' &&
    diff &&
    diff.id === 5
  );
}

function triggerBossD5LastStand(e) {
  if (!canTriggerD5BossLastStand(e)) return false;
  e._d5LastStandUsed = true;
  e.hp = 1;
  e.d5LastStandMaxT = D5_LAST_STAND_DURATION_SEC;
  e.d5LastStandT = D5_LAST_STAND_DURATION_SEC;
  e.exposeT = 0;
  e.freezeT = 0;
  e.chillT = 0;
  e.hitFlash = 0.16;
  shake = Math.max(shake, 7.5);
  beep(165, 0.24, 'sawtooth', 0.085);
  beep(520, 0.16, 'triangle', 0.065);
  if (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.triggerHitstop === 'function') {
    SpireDirector.triggerHitstop(0.055);
  }
  if (rings.length < 42) {
    rings.push({ x: e.x, y: e.y, r: 195, color: '#ff2a55', t: 0.40, maxT: 0.40, kind: 'star' });
    rings.push({ x: e.x, y: e.y, r: 138, color: '#ffd166', t: 0.34, maxT: 0.34, kind: 'hex' });
  }
  addBurst(e.x, e.y, '#ff2a55', 22, 235);
  if (lightnings.length < 36) {
    for (let k = -1; k <= 1; k++) {
      lightnings.push({
        pts: [
          { x: e.x + k * 36, y: Math.max(12, e.y - 290) },
          { x: e.x + k * 14, y: e.y - 125 },
          { x: e.x, y: e.y }
        ],
        color: k === 0 ? '#ffd166' : '#ff2a55', t: 0.34, maxT: 0.34
      });
    }
  }
  addText(e.x, e.y - e.r - 28, '◆ 临死挣扎 · 10秒无敌狂暴!', '#ffd166', 19, 2.2, true);
  announce('◆ 蚀日神罚·临死挣扎！首领进入 10 秒不灭状态（无敌 · 攻速+20% · 命中玩家回血10%）！', '#ff4d6d', 4.2);
  logInfo('D5_LAST_STAND', `${e.bossTitle || e.variant} 触发 D5 二阶段 10s 临死挣扎`);
  return true;
}

if (typeof globalThis !== 'undefined') {
  globalThis.D5_LAST_STAND_DURATION_SEC = D5_LAST_STAND_DURATION_SEC;
  globalThis.D5_LAST_STAND_ASPD_MUL = D5_LAST_STAND_ASPD_MUL;
  globalThis.D5_LAST_STAND_HEAL_RATIO = D5_LAST_STAND_HEAL_RATIO;
  globalThis.canTriggerD5BossLastStand = canTriggerD5BossLastStand;
  globalThis.triggerBossD5LastStand = triggerBossD5LastStand;
}

function primeBomber(e) {
  if (!e || e.primed) return;
  e.primed = true;
  e.hp = 1;
  e.fuseT = 1.25;
  e.maxFuseT = 1.25;
  beep(520, 0.06, 'sawtooth', 0.032);
  addText(e.x, e.y - e.r - 10, '自爆预警!', '#ffbe0b', 13, 0.62, false);
}

function hurtEnemy(e, rawDmg, isCrit, knockA = null, ignoreShield = false, opts = {}) {
  if (!e || e.hp <= 0 || e.primed || !Number.isFinite(rawDmg)) return;
  if (!player || player.hp <= 0 || state !== 'wave') return;
  if (typeof isSpireCombatSuspended === 'function' && isSpireCombatSuspended()) return;
  if (typeof SpireDirector !== 'undefined' && SpireDirector.isBlockingGameplay()) return;
  if (!Number.isFinite(e.hp)) { e.hp = 0; return; }

  // D5 二阶段首领【10秒临死挣扎】无敌金身：持续期间完全免疫伤害（仅节流弹出金红护体反馈，结束后方可斩杀）
  if ((e.d5LastStandT || 0) > 0) {
    if (!opts.isDot) {
      if (_frameHitBeeps < 2) { _frameHitBeeps++; beep(920, 0.022, 'triangle', 0.024); }
      if (_frameSparks < 14) { _frameSparks++; addSparks(e.x, e.y, knockA !== null ? knockA + Math.PI : Math.random() * 6.28, '#ffd166', 3); }
      if (!e._lsTxtCd || e._lsTxtCd <= 0) {
        e._lsTxtCd = 0.42;
        addText(e.x, e.y - e.r - 18, `◈ 临死挣扎·无敌 ${e.d5LastStandT.toFixed(1)}s`, '#ffd166', 13, 0.45, false);
      }
    }
    return;
  }

  // 首领共鸣阵眼棱柱护佑减伤（场上存在存活阵眼时减免 28% 非破盾伤害，引导玩家优先转火击破阵眼）
  if (e.type === 'boss' && (e._pylonShieldCnt || 0) > 0 && !ignoreShield) {
    rawDmg *= 0.72;
    if (!opts.isDot && (!e._pylonTxtCd || e._pylonTxtCd <= 0)) {
      e._pylonTxtCd = 0.65;
      addText(e.x, e.y - e.r - 14, '⚡ 阵眼棱障 -28%（击破棱柱破防）', '#72efdd', 12, 0.45, false);
    }
  }

  // 铁甲圣甲虫正面举盾减伤 55% + 金属格挡火星（格挡轻提示 0.38s 快隐 + 0.35s 节流防刷屏）
  const faceA = Number.isFinite(e.faceA) ? e.faceA : 0;
  if (e.type === 'shielder' && !ignoreShield && knockA !== null && Math.cos(knockA - faceA) < -0.25) {
    rawDmg *= 0.45;
    if (_frameHitBeeps < 2) { _frameHitBeeps++; beep(880, 0.025, 'triangle', 0.025); }
    if (_frameSparks < 14) { _frameSparks++; addSparks(e.x + Math.cos(faceA) * e.r, e.y + Math.sin(faceA) * e.r, faceA, '#90e0ef', 3); }
    if (!e._blkTxtCd || e._blkTxtCd <= 0) {
      e._blkTxtCd = 0.35;
      addText(e.x, e.y - e.r - 12, '格挡', '#90e0ef', 12, 0.38, false);
    }
  }

  // 潜渊骨蛇遁地期间减免 45% 非破盾擦伤
  if (e.type === 'sand_worm' && (e.burrowT || 0) > 0 && !ignoreShield) {
    rawDmg *= 0.55;
  }

  // 远近战公平性与流派专精增伤联动：
  // 1) 近战武器对首领/统领自带 1.28x 破甲加成，且对重甲血牛怪（镇狱像/重锤卫/盾卫/铁卫）享有 1.18x 碎甲加成，杜绝近战打重装吃亏
  const isBossTarget = e.type === 'boss' || e.type === 'special_boss' || e.type === 'mini_boss';
  if (opts.isMelee) {
    if (isBossTarget) rawDmg *= 1.28;
    else if (e.type === 'juggernaut' || e.type === 'brute' || e.type === 'shielder' || e.type === 'iron_guard') rawDmg *= 1.18;
  }
  // 1b) 【精钢磨刀石】近战破甲易伤印记：受破甲目标承受全源伤害 +12%
  if ((e.sunderT || 0) > 0) rawDmg *= 1.12;
  if (opts.isMelee && player && player.meleeSunder) e.sunderT = 3.2;
  // 2) 首领大招后的【破绽暴露】窗口期承受额外高额伤害（近战 +25%，远程 +15%）
  if (e.exposeT > 0) rawDmg *= (opts.isMelee ? 1.25 : 1.15);
  // 3) 【剧毒】叠层腐蚀易伤：每层使目标承受伤害 +3%（若仅踩泥沼地形则易伤减半为 +1.5%）
  if (e.poisonT > 0 && e.poisonStacks > 0) rawDmg *= (1 + e.poisonStacks * 0.03);
  else if ((e.swampDotT || 0) > 0) rawDmg *= 1.015;
  // 3b) 【液氮冷却罐】霜蚀增伤：对冰缓/冰冻敌人直接造成额外伤害（不绑定暴击）
  if (player && (player.chillDmgBonus || 0) > 0 && ((e.chillT || 0) > 0 || (e.freezeT || 0) > 0)) {
    rawDmg *= (1 + player.chillDmgBonus);
  }
  // 4) 【冰冻碎裂】：对冰冻态敌人暴击额外 +22% 伤害
  const shatterCrit = isCrit && ((e.freezeT || 0) > 0 || (player && player.freezeChance > 0 && (e.chillT || 0) > 0));
  if (shatterCrit) rawDmg *= 1.22;
  // 5) 【三象元素秘典】元素共鸣：目标身上每存在 1 种元素异常（灼烧/冰缓或冰冻/剧毒），额外承受 +12% 伤害
  if (player && player.elemSynergy) {
    const ailCnt = ((e.burnT || 0) > 0 ? 1 : 0) + (((e.chillT || 0) > 0 || (e.freezeT || 0) > 0) ? 1 : 0) + ((e.poisonT || 0) > 0 ? 1 : 0);
    if (ailCnt > 0) rawDmg *= (1 + ailCnt * 0.12);
  }

  const prevHp = Math.max(0, e.hp);
  const dmg = Math.max(1, Math.round(rawDmg));
  e.hp -= dmg;
  // 【噬魂死神镰】斩魂处决：常规与精英敌人生命低于阈值时直接斩杀
  if (e.hp > 0 && !isBossTarget && player && (player.executeLowHp || 0) > 0 && e.hp <= e.maxHp * player.executeLowHp) {
    e.hp = 0;
    if (_frameHitTexts < 20) {
      _frameHitTexts++;
      addText(e.x, e.y - e.r - 14, '斩魂!', '#e0aaff', 13, 0.46, false);
    }
  }
  const effectiveDealt = Math.max(1, Math.round(prevHp - Math.max(0, e.hp)));
  const willTrueDie = e.hp <= 0 && !(e.type === 'bomber' && !e.primed) && !(isBossTarget && e.canPhase2 && !e.mythicPhase2) && !canTriggerD5BossLastStand(e);
  const attribSrc = opts.srcId || (opts.isDot ? 'elemental_dot' : (_activeWeaponId || 'relic_proc'));
  recordWeaponDamage(attribSrc, effectiveDealt, willTrueDie);

  if (!opts.isDot && !(e._flashCd > 0)) {
    e.hitFlash = 0.042;
    e._flashCd = 0.11;
  }

  if (knockA !== null && e.type !== 'boss' && e.type !== 'mini_boss' && e.type !== 'special_boss') {
    const baseKb = e.type === 'juggernaut' ? 0.5 : ((e.type === 'brute' || e.type === 'shielder') ? 2.5 : (e.type === 'charger' || e.type === 'iron_guard' ? 4.2 : 10));
    const kb = baseKb * (opts.knockMult || 1) * (opts.isMelee && player ? (1 + (player.meleeKnockBonus || 0)) : 1);
    e.x += Math.cos(knockA) * kb; e.y += Math.sin(knockA) * kb;
  }

  // 黄金晶石巨神受击阶段掉钻特性（每损耗 20% 血量喷发一波高能晶石，超量斩杀亦全额结算）
  if (e.variant === 'golden_golem' && e.goldStage > 0) {
    const safeMax = Math.max(1, e.maxHp || 1);
    while (e.goldStage > 0 && Math.max(0, e.hp) / safeMax <= e.goldStage * 0.2) {
      e.goldStage--;
      dropCrystals(e.x, e.y, 6, true);
      addText(e.x, e.y - e.r - 14, '◆ 黄金碎晶 +6!', '#ffd166', 15, 1.5, true);
    }
  }

  if (opts.isDot) {
    if (_frameHitTexts < 14) {
      _frameHitTexts++;
      addText(e.x, e.y - e.r - 2, dmg, opts.dotColor || '#ff9f1c', 12, 0.48, false);
    }
  } else {
    const hitCol = shatterCrit ? '#72efdd' : (isCrit ? '#ffd166' : '#ffffff');
    if (!opts.silentHit && _frameSparks < 16) {
      _frameSparks++;
      addSparks(e.x, e.y, knockA !== null ? knockA + Math.PI : Math.random() * 6.28, isCrit ? '#ffd166' : '#fff3b0', isCrit ? 4 : 2);
    }
    if (isBossTarget || isCrit || (!opts.silentHit && _frameHitTexts < 22)) {
      _frameHitTexts++;
      addText(e.x, e.y - e.r - 4, isCrit ? dmg + '!' : dmg, hitCol, isCrit ? 21 : 15, 0.56, false);
    }
    if ((!opts.silentHit || isCrit) && _frameHitBeeps < 2) {
      _frameHitBeeps++;
      beep(isCrit ? 360 : 240, 0.026, 'sawtooth', 0.024);
    }
    if (isCrit && (shatterCrit || isBossTarget || dmg >= 42) && player && (!player._hsCd || player._hsCd <= 0) && enemies.length < 32) {
      player._hsCd = 0.28;
      if (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.triggerHitstop === 'function') {
        SpireDirector.triggerHitstop(0.016);
      }
    }

    // 攻击附带【灼烧 / 冰冻与冰缓 / 风蚀剧毒 / 四象元素反应】判定（带同帧预算与冷却保护，彻底杜绝群怪卡顿）
    const hadBurn = (e.burnT || 0) > 0.1;
    const hadCryo = (e.chillT || 0) > 0.1 || (e.freezeT || 0) > 0.1;
    const hadWind = (e.poisonT || 0) > 0.1 && (e.poisonStacks || 0) > 0;
    const procBurn = opts.forceBurn || (player.burnChance > 0 && Math.random() < player.burnChance);
    const procFreeze = opts.forceFreeze || (player.freezeChance > 0 && Math.random() < player.freezeChance);
    const procChill = !procFreeze && (opts.forceChill || (player.chillChance > 0 && Math.random() < player.chillChance));
    const procPoison = opts.forcePoison || (player.poisonChance > 0 && Math.random() < player.poisonChance);
    if (procBurn) {
      e.burnT = 3.0;
      e.burnDmg = Math.max(e.burnDmg || 0, Math.max(2, (4.0 + wave * 1.25) * getElemMul() * getEffectiveDmgMul()));
      if (!e.burnTick || e.burnTick <= 0) e.burnTick = 0.42;
    }
    if (procFreeze) {
      applyFreeze(e, 1.2);
    } else if (procChill) {
      e.chillT = Math.max(e.chillT || 0, 2.1);
    }
    if (procPoison) {
      applyPoison(e, 1);
    }
    if (!opts.noProc && (!e._reactCd || e._reactCd <= 0)) {
      let reactLabel = '', reactColor = '';
      if ((hadBurn && (procFreeze || procChill)) || (hadCryo && procBurn)) {
        e._reactCd = 0.72;
        reactLabel = '融毁!';
        reactColor = '#fb923c';
      } else if (shatterCrit) {
        e._reactCd = 0.72;
        reactLabel = '超导碎冰!';
        reactColor = '#72efdd';
      } else if (hadWind && (procBurn || procFreeze || procChill)) {
        e._reactCd = 0.76;
        reactLabel = '扩散共鸣!';
        reactColor = '#5ef29b';
      }
      if (reactLabel && player) {
        player._reactionCount = (player._reactionCount || 0) + 1;
        const canBlastNow = player.reactionBlast && _frameExplosions < 2 && !(player._procBlastCd > 0);
        if (_frameReactRings < 2) {
          _frameReactRings++;
          if (!canBlastNow && rings.length < 28) {
            rings.push({ x: e.x, y: e.y, r: e.r + 32, color: reactColor, t: 0.20, maxT: 0.20 });
          }
          addText(e.x, e.y - e.r - 14, reactLabel, reactColor === '#fb923c' ? '#fde68a' : reactColor, 13, 0.48, false);
        }
        if (canBlastNow) {
          player._procBlastCd = 0.075;
          triggerExplosion(e.x, e.y, 84 * getBlastScale(), (20 + wave * 4.2) * getElemMul() * getEffectiveDmgMul(), false, 0, '#fde68a', false, 0, 'elemental_reaction');
        }
        if (player.archmageMeteor && player._reactionCount % 4 === 0 && _frameExplosions < 2) {
          const mTarget = (e && e.hp > 0) ? e : pickRandomAliveEnemy(null);
          if (mTarget) {
            if (lightnings.length < 34) {
              lightnings.push({ pts: [{ x: mTarget.x - 28, y: Math.max(8, mTarget.y - 240) }, { x: mTarget.x, y: mTarget.y }], color: '#c084fc', t: 0.26, maxT: 0.26 });
            }
            addText(mTarget.x, mTarget.y - mTarget.r - 22, '星穹天陨!', '#e9d5ff', 14, 0.72, false);
            triggerExplosion(mTarget.x, mTarget.y, 102 * getBlastScale(), (32 + wave * 6.0) * getElemMul() * getEffectiveDmgMul(), false, 0, '#c084fc', false, 0, 'elemental_reaction');
          }
        }
        if (player.turretSalvo) {
          triggerTurretSalvo();
        }
      }
    }
    if (!opts.noProc && player.blastChance > 0 && _frameExplosions < 2 && !(player._procBlastCd > 0) && Math.random() < player.blastChance) {
      player._procBlastCd = 0.075;
      triggerExplosion(e.x, e.y, 68 * getBlastScale(), dmg * 0.62 * getElemMul(), false, 0, '#ff9f1c', false, 0, attribSrc);
    }

    // 参照《土豆兄弟 (Brotato)》重做汲血机制：
    // 1) 仅玩家本体直接攻击命中可触发（炮台/爆炸/持续异常跳字不可触发）；
    // 2) 全局 0.12s 汲血内置冷却（LIFESTEAL_ICD_SEC = 0.12），杜绝散射/穿透单帧狂回十几血；
    // 3) 总生命窃取触发率硬上限 32%（单次固定恢复 1 点生命）。
    if (!opts.noProc && !opts.isTurret && !opts.isExplosion && !opts.isDot && player.hp > 0 && player.hp < player.maxHp && (player._lifestealCd || 0) <= 0) {
      let healCol = '';
      const hasAilment = (e.burnT || 0) > 0 || (e.chillT || 0) > 0 || (e.freezeT || 0) > 0 || (e.poisonStacks || 0) > 0;
      const effLifesteal = Math.min(0.32, (player.lifesteal || 0) + ((player.ailmentLeech || 0) > 0 && hasAilment ? player.ailmentLeech : 0));
      if (effLifesteal > 0 && Math.random() < effLifesteal) {
        player.hp = Math.min(player.maxHp, player.hp + 1);
        healCol = '#ff4d6d';
      } else if (isCrit && player.critHeal > 0 && Math.random() < Math.min(0.25, player.critHeal)) {
        player.hp = Math.min(player.maxHp, player.hp + 1);
        healCol = '#5ef29b';
      } else if (isCrit && opts.isMelee && player.critMeleeHeal && Math.random() < 0.20) {
        player.hp = Math.min(player.maxHp, player.hp + 1);
        healCol = '#ffd166';
      }
      if (healCol) {
        player._lifestealCd = LIFESTEAL_ICD_SEC;
        player._healTxtAcc = (player._healTxtAcc || 0) + 1;
        if (!(player._healTxtCd > 0)) {
          player._healTxtCd = 0.28;
          addText(player.x, player.y - 24, '+' + player._healTxtAcc, healCol, 14, 0.52, false);
          player._healTxtAcc = 0;
        }
        if (player.bloodNova && !(player._bloodNovaCd > 0) && Math.random() < 0.48) {
          player._bloodNovaCd = 0.45;
          const novaR = 96 * getBlastScale();
          const novaDmg = (15 + wave * 3.0) * getEffectiveDmgMul();
          if (rings.length < 28) rings.push({ x: player.x, y: player.y, r: novaR, color: '#ff2a55', t: 0.22, maxT: 0.22, fill: false });
          for (let k = enemies.length - 1; k >= 0; k--) {
            const nb = enemies[k];
            if (!nb || nb.hp <= 0 || nb.primed) continue;
            const dx = nb.x - player.x, dy = nb.y - player.y, lim = novaR + nb.r;
            if (dx * dx + dy * dy <= lim * lim) {
              hurtEnemy(nb, novaDmg, false, Math.atan2(dy, dx), true, { noProc: true, silentHit: true, srcId: 'relic_proc' });
            }
          }
        }
      }
    }
  }

  if (e.hp <= 0) {
    if (e.type === 'bomber' && !e.primed) {
      primeBomber(e);
      return;
    }
    if ((e.type === 'boss' || e.type === 'special_boss' || e.type === 'mini_boss') && e.canPhase2 && !e.mythicPhase2) {
      if (triggerBossMythicPhase2(e)) return;
    }
    if (canTriggerD5BossLastStand(e)) {
      if (triggerBossD5LastStand(e)) return;
    }
    killEnemyRewards(e);
  }
}

// 晶石掉落控制：中后期小怪改为概率掉落单枚小晶石（绝不爆一地大号金币堆），仅首领/秘藏允许合成金色大晶石
function dropCrystals(x, y, totalMat, allowBigChunks = false) {
  const rawTotal = Math.max(0, +(totalMat || 0));
  if (rawTotal <= 0) return;

  if (!allowBigChunks) {
    const isLate = (typeof wave === 'number' && wave >= 5);
    const unitVal = isLate ? 3.2 : 1.85;
    const xpComp = (typeof wave === 'number' && wave >= 6) ? 1.25 : 1.0;
    let coinCount = 0;
    let perCoinVal = 1;
    if (rawTotal <= unitVal * 1.05) {
      const dropProb = Math.min(0.78, Math.max(0.12, rawTotal / unitVal));
      if (Math.random() >= dropProb) return;
      coinCount = 1;
      perCoinVal = +(rawTotal / dropProb).toFixed(2);
    } else {
      const estCnt = rawTotal / unitVal;
      const whole = Math.floor(estCnt);
      const frac = estCnt - whole;
      coinCount = Math.min(2, Math.max(1, whole + (Math.random() < frac ? 1 : 0)));
      perCoinVal = +(rawTotal / coinCount).toFixed(2);
    }
    for (let k = 0; k < coinCount; k++) {
      if (drops.length >= 68) {
        let merged = false;
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          if (d.kind === 'mat' && !d.bigCoin) {
            d.val = +(+(d.val || 1) + perCoinVal).toFixed(2);
            merged = true;
            break;
          }
        }
        if (merged) continue;
      }
      const a = Math.random() * Math.PI * 2, dist = Math.random() * 12;
      const popSpd = 64 + Math.random() * 72;
      drops.push({
        x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist,
        vx: Math.cos(a) * popSpd, vy: Math.sin(a) * popSpd, popT: 0.17,
        kind: 'mat', val: perCoinVal, xpMul: xpComp, bigCoin: false, bob: Math.random() * 6.28
      });
    }
    return;
  }

  let rem = Math.min(500, Math.max(0, Math.round(rawTotal)));
  const chunk = rem >= 15 ? 5 : (rem >= 4 ? 2 : 1);
  let guard = 0;
  while (rem > 0 && guard++ < 120) {
    const val = Math.min(rem, chunk);
    rem -= val;
    if (drops.length >= 68) {
      let merged = false;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        if (d.kind === 'mat') {
          d.val = (d.val || 1) + val;
          merged = true;
          break;
        }
      }
      if (merged) continue;
    }
    const a = Math.random() * Math.PI * 2, dist = Math.random() * 16;
    const popSpd = 72 + Math.random() * 86;
    drops.push({
      x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist,
      vx: Math.cos(a) * popSpd, vy: Math.sin(a) * popSpd, popT: 0.18,
      kind: 'mat', val, bigCoin: val >= 5, bob: Math.random() * 6.28
    });
  }
}

function killEnemyRewards(e) {
  if (!e || e._rewarded || e._storyDefeatQueued || !player || player.hp <= 0 || state !== 'wave') return;
  if (typeof isSpireCombatSuspended === 'function' && isSpireCombatSuspended()) return;
  if (e.type === 'boss' && typeof trees !== 'undefined' && Array.isArray(trees)) {
    for (let ti = trees.length - 1; ti >= 0; ti--) {
      const tr = trees[ti];
      if (tr && tr.isBossPylon && tr.owner === e) {
        addBurst(tr.x, tr.y, tr.pylonColor || '#72efdd', 8, 120);
        trees.splice(ti, 1);
      }
    }
  }
  const isStoryActBoss = !endlessMode && e.type === 'boss' && wave <= MAX_WAVE && wave % 4 === 0;
  if (isStoryActBoss && typeof resolveSpireBossDefeat === 'function') {
    // 本帧立即锁定结果；之后的弹丸/反伤不得同时把本层结算为玩家失败。
    e.hp = 0;
    e._storyDefeatQueued = true;
    resolveSpireBossDefeat(e);
    return;
  }
  awardEnemyRewards(e);
}

// 真正的奖励只由击败流程调用一次。主线首领在告别演出结束后才抵达这里。
function awardEnemyRewards(e) {
  if (!e || e._rewarded || !player || player.hp <= 0) return;
  e._rewarded = true;
  e.hp = 0;
  player.kills++;
  if (player && (player.dashCd || 0) > 0) {
    if (e.type === 'boss' || e.type === 'special_boss' || e.type === 'mini_boss') {
      player.dashCd = Math.max(0, player.dashCd - 1.5);
    } else if (e.elite) {
      player.dashCd = Math.max(0, player.dashCd - 0.65);
    }
  }
  const isBigBoss = e.type === 'boss' || e.type === 'special_boss';
  const eliteFxCol = e.elite ? (e.eliteKind === 'frenzy' ? '#ff4d6d' : '#fbbf24') : e.color;
  // 移除普通小怪阵亡时的地面残留血圈与死亡扩散圈（仅精英/统领/首领保留击破光环，彻底消除群怪阵亡满地出圈与卡顿）
  if ((isBigBoss || e.type === 'mini_boss' || e.elite) && rings.length < 28) {
    rings.push({ x: e.x, y: e.y, r: e.r * 1.65, color: eliteFxCol, t: 0.20, maxT: 0.20 });
  }
  if ((isBigBoss || e.type === 'mini_boss') && typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.triggerHitstop === 'function') {
    SpireDirector.triggerHitstop(isBigBoss ? 0.062 : 0.030);
  }
  addBurst(e.x, e.y, eliteFxCol, isBigBoss ? 24 : (enemies.length > 26 ? 3 : 5), isBigBoss ? 240 : 145);

  // 狂化精英双形态结算：仅【亡语形态 (deathrattle · 隐隐泛黄)】阵亡时迸射 4 枚黄色亡语金梭小箭头；【血怒形态 (frenzy · 隐隐发红)】不产亡语弹
  if (e.elite && e.eliteKind !== 'frenzy') {
    const baseA = Math.random() * Math.PI * 2;
    for (let k = 0; k < 4 && eBullets.length < 170; k++) {
      const ba = baseA + (k / 4) * Math.PI * 2;
      eBullets.push({ x: e.x, y: e.y, px: e.x, py: e.y, vx: Math.cos(ba) * 132, vy: Math.sin(ba) * 132, dmg: Math.max(3, Math.round(e.dmg * 0.72 * 1.10)), r: 6.28, hitR: 5.50, color: '#fbbf24', shape: 'lance', srcKey: e.variant || e.type });
    }
  }

  if (enemies.length < 190) {
    if (e.type === 'splitter') {
      if (_frameHitTexts < 18) { _frameHitTexts++; addText(e.x, e.y - e.r - 8, '分裂×3', '#74c69d', 12, 0.48, false); }
      for (let sk = 0; sk < 3; sk++) {
        const sa = (sk / 3) * Math.PI * 2 + (e.phase || 0);
        const child = createEnemy(e.x + Math.cos(sa) * 18, e.y + Math.sin(sa) * 18, 'mini_slime');
        if (child) {
          child.vx = Math.cos(sa) * 128;
          child.vy = Math.sin(sa) * 128;
        }
      }
    } else if (e.type === 'spore_mother') {
      if (_frameHitTexts < 18) { _frameHitTexts++; addText(e.x, e.y - e.r - 8, '孢裂×2', '#c77dff', 12, 0.48, false); }
      createEnemy(e.x - 16, e.y, 'mini_slime');
      createEnemy(e.x + 16, e.y, 'mini_slime');
    }
  }
  if (e.type === 'magma_imp' && hazards.length < 4) {
    let nearHaz = false;
    for (let hi = 0; hi < hazards.length; hi++) {
      const hz = hazards[hi];
      const hdx = hz.x - e.x, hdy = hz.y - e.y;
      if (hdx * hdx + hdy * hdy < 95 * 95) { nearHaz = true; break; }
    }
    if (!nearHaz) {
      spawnHazard(e.x, e.y, 62, e.dmg * 1.05, 1.15, { enemyDmg: (22 + wave * 4) * diff.hpMul, color: '#fb5607', srcKey: 'magma_imp' });
    }
  }

  dropCrystals(e.x, e.y, e.mat, isBigBoss || e.type === 'mini_boss');

  // 【碎冕冰封星核】冰爆亡语：节流释放精炼高伤寒霜冰锥，杜绝清场时单帧暴发百枚穿透弹引发递归雪崩
  if (player && player.freezeDeathNova && !(player._iceNovaCd > 0) && ((e.freezeT || 0) > 0 || (e.chillT || 0) > 0)) {
    player._iceNovaCd = 0.24;
    const baseA = Math.random() * Math.PI * 2;
    const iceDmg = (20 + wave * 4.2) * getEffectiveDmgMul() * getElemMul();
    for (let k = 0; k < 4 && bullets.length < 180; k++) {
      const ba = baseA + (k / 4) * Math.PI * 2;
      bullets.push({
        x: e.x, y: e.y, px: e.x, py: e.y,
        vx: Math.cos(ba) * 540, vy: Math.sin(ba) * 540,
        dmg: iceDmg, isCrit: false, angle: ba, pierce: 1, bounces: player.bounceBonus || 0,
        isIce: true, freezeHit: 0.25, noProc: true, srcId: 'relic_proc',
        life: 0.50, maxLife: 0.50, color: '#72efdd', r: 4.8,
        hit: null, lastHit: null
      });
    }
  }

  // 【风蚀扩散圣瓶】毒杀/灼烧亡语传染：同帧节流传染且移除每个死怪原地的重复绿圈堆叠
  if (player.plagueSpread && ((e.poisonStacks || 0) > 0 || (e.burnT || 0) > 0) && _framePlagueSpreads < 3) {
    _framePlagueSpreads++;
    if (!(player._plagueRingCd > 0) && rings.length < 28) {
      player._plagueRingCd = 0.35;
      rings.push({ x: e.x, y: e.y, r: 96, color: '#a3e635', t: 0.18, maxT: 0.18 });
    }
    for (let k = 0; k < enemies.length; k++) {
      const nb = enemies[k];
      if (!nb || nb === e || nb.hp <= 0 || nb.primed) continue;
      const dx = nb.x - e.x, dy = nb.y - e.y, lim = 112 + nb.r;
      if (dx * dx + dy * dy <= lim * lim) {
        applyPoison(nb, 2);
        nb.burnT = Math.max(nb.burnT || 0, 2.2);
        nb.burnDmg = Math.max(nb.burnDmg || 0, (5 + wave * 1.4) * getElemMul() * getEffectiveDmgMul());
        if (!nb.burnTick || nb.burnTick <= 0) nb.burnTick = 0.42;
      }
    }
  }

  // 【噬魂死神镰】击杀敌人概率降下噬魂雷击（零数组分配随机抽样 + 同帧上限保护）
  if (player.soulBolt && enemies.length > 0 && _frameCyberBolts < 3 && Math.random() < 0.28) {
    const te = pickRandomAliveEnemy(e);
    if (te) {
      _frameCyberBolts++;
      const sbDmg = (18 + wave * 3.5) * getEffectiveDmgMul();
      if (lightnings.length < 30) lightnings.push({ pts: [{ x: e.x, y: e.y }, { x: te.x, y: te.y }], color: '#c77dff', t: 0.16, maxT: 0.16 });
      hurtEnemy(te, sbDmg, false, null, true, { noProc: true, silentHit: true, srcId: 'relic_proc' });
    }
  }

  // 若击败的是【隐藏二阶段·真红神话形态】首领，额外爆出必出传说装的【神话秘宝舱】与永久弑神赐福！
  if (e.mythicPhase2 && !e.storyPhaseBoss) {
    dropCrystals(e.x, e.y, 36, true);
    player.dmgMul += 0.15;
    player.critDmg = (player.critDmg || 0) + 0.25;
    drops.push({ x: e.x + 14, y: e.y, kind: 'crate', isBoss: true, isMythic: true, bob: 0 });
    addText(e.x, e.y - e.r - 36, '◆ 弑神秘宝！全伤+15% 暴伤+25% + 传说舱!', '#ffd166', 19, 2.8);
    announce('◆ 成功讨伐隐藏二阶段首领！获永久弑神赐福并掉落【传说秘宝舱】！', '#ffd166', 4.5);
  }

  if (e.type === 'special_boss') {
    beep(840, 0.16, 'triangle', 0.07);
    if (e.variant === 'crimson_lord') {
      player.hp = player.maxHp;
      drops.push({ x: e.x, y: e.y, kind: 'crate', isBoss: true, bob: 0 });
      addText(e.x, e.y - e.r - 22, '◆ 鲜血赐福：满血恢复 + 首领秘宝！', '#ff4d6d', 18, 2.5);
      announce('◆ 击败猩红血主！已恢复满生命并掉落首领秘宝箱', '#ff758f', 3.8);
    } else if (e.variant === 'golden_golem') {
      drops.push({ x: e.x, y: e.y, kind: 'crate', isBoss: true, bob: 0 });
      addText(e.x, e.y - e.r - 22, '◆ 黄金秘宝崩裂：巨量晶石 + 首领秘宝！', '#ffd166', 18, 2.5);
      announce('◆ 击败黄金巨神！爆出海量晶石与首领秘宝箱', '#ffd166', 3.8);
    } else {
      player.dmgMul += 0.12;
      drops.push({ x: e.x, y: e.y, kind: 'crate', isBoss: true, bob: 0 });
      addText(e.x, e.y - e.r - 22, '◆ 虚空赐福：全伤永久+12% + 首领秘宝！', '#c77dff', 18, 2.5);
      announce('◆ 击败深渊噬界者！全体伤害永久 +12% 并掉首领秘宝箱', '#e0aaff', 3.8);
    }
    logInfo('SPECIAL_BOSS', `击杀特殊首领 ${e.bossTitle || e.variant}`);
  } else {
    const luck = Math.min(90, Math.max(0, player.luck || 0));
    let cratesOnMap = 0;
    for (let di = 0; di < drops.length; di++) if (drops[di].kind === 'crate') cratesOnMap++;
    const maxWaveCrates = 1 + (luck >= 72 ? 1 : 0);
    if ((e.type === 'boss' || e.type === 'mini_boss') && cratesOnMap < 4) {
      drops.push({ x: e.x, y: e.y, kind: 'crate', isBoss: true, bob: 0 });
      addText(e.x, e.y - e.r - 16, '◆ 首领秘宝箱!', '#ffd166', 16, 1.65, true);
    } else if (e.elite && waveCratesDropped < maxWaveCrates && cratesOnMap < 2 && Math.random() < Math.min(0.12, 0.045 + luck * 0.0010)) {
      waveCratesDropped++;
      drops.push({ x: e.x, y: e.y, kind: 'crate', bob: 0 });
      addText(e.x, e.y - e.r - 16, '◆ 战利品箱!', '#ffd166', 16, 1.65, true);
    } else if (Math.random() < Math.min(0.22, 0.032 + player.healDropBonus + luck * 0.0006)) {
      drops.push({ x: e.x, y: e.y, kind: 'heal', bob: 0 });
    }
  }

  if (e.type === 'boss' || e.type === 'special_boss' || e.type === 'mini_boss') {
    if (typeof pendingBossCutscene !== 'undefined' && pendingBossCutscene && pendingBossCutscene.variant === e.variant) {
      pendingBossCutscene = null;
    }
    if (typeof bossCutscene !== 'undefined' && bossCutscene && bossCutscene.variant === e.variant) {
      bossCutscene = null;
    }
  }
  if (e.type === 'boss' || e.type === 'special_boss' || e.type === 'mini_boss') {
    // 主线终幕（第 16 层）的清场、对白和结局由 resolveSpireBossDefeat 直接串联。
    if (!endlessMode && e.type === 'boss' && wave === MAX_WAVE) return;
    const otherBoss = enemies.some(o => o !== e && (o.type === 'boss' || o.type === 'special_boss' || o.type === 'mini_boss') && o.hp > 0);
    if (!otherBoss && !spawns.some(s => s.type === 'boss' || s.type === 'special_boss' || s.type === 'mini_boss')) {
      if (e.type === 'boss' || e.type === 'special_boss' || overtime) {
        eBullets.length = 0;
        hazards.length = 0;
      }
      if (player) player.invuln = 0;
      if (overtime) {
        // 倒计时已归零进入超时死战后击杀首领：立即通关，不拖延时间
        overtime = false;
        waveTime = 0;
      } else if (e.type === 'boss' && waveTime > 1.2) {
        // 倒计时结束前提前击破首领：保留剩余波次时间继续刷小怪收割晶石，绝不强制提前结束导致亏钱！
        announce('◆ 首领已击破！剩余时间继续清剿小怪收割封魂晶石！', '#72efdd', 3.4);
      }
    }
  }
}

function triggerThornsNova() {
  if (!player || !player.thorns) return;
  const rad = 140 * getBlastScale();
  const tdmg = (14 + Math.max(0, getTotalArmor()) * 4) * player.thorns * getEffectiveDmgMul();
  if (rings.length < 28) rings.push({ x: player.x, y: player.y, r: rad, color: '#a3e635', t: 0.20, maxT: 0.20 });
  addSparks(player.x, player.y, Math.random() * 6.28, '#a3e635', 4);
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e || e.hp <= 0 || e.primed) continue;
    const dx = e.x - player.x, dy = e.y - player.y, lim = rad + e.r;
    if (dx * dx + dy * dy <= lim * lim) {
      hurtEnemy(e, tdmg, false, Math.atan2(dy, dx), true, { noProc: true, silentHit: true, knockMult: 1.2, srcId: 'relic_proc' });
    }
  }
}

function triggerShieldPulse() {
  if (!player || !player.shieldPulseNova) return;
  const rad = 122 * getBlastScale();
  const pdmg = (15 + wave * 3.0) * getEffectiveDmgMul() * getElemMul();
  if (rings.length < 28) rings.push({ x: player.x, y: player.y, r: rad, color: '#72efdd', t: 0.22, maxT: 0.22, fill: false });
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e || e.hp <= 0 || e.primed) continue;
    const dx = e.x - player.x, dy = e.y - player.y, lim = rad + e.r;
    if (dx * dx + dy * dy <= lim * lim) {
      e.chillT = Math.max(e.chillT || 0, 2.0);
      hurtEnemy(e, pdmg, false, Math.atan2(dy, dx), true, { noProc: true, silentHit: true, knockMult: 1.35, srcId: 'relic_proc' });
    }
  }
}

function triggerTurretSalvo(forceCommand = false) {
  if (!player || (!player.turretSalvo && !forceCommand) || (player._salvoCd || 0) > 0 || !turrets.length) return;
  player._salvoCd = forceCommand ? 0.45 : 0.85;
  const salvoDmg = (13 + wave * 2.8) * getEffectiveDmgMul() * getTechMul();
  for (let ti = 0; ti < turrets.length; ti++) {
    const t = turrets[ti];
    const target = pickRandomAliveEnemy(null);
    if (!target) break;
    const baseA = Math.atan2(target.y - t.y, target.x - t.x);
    t.angle = baseA;
    t.recoil = 6;
    const tSrc = t.kind === 'laser' ? 'turret_laser' : (t.kind === 'shock' ? 'turret_shock' : (t.kind === 'totem' ? 'turret_totem' : 'turret_gun'));
    for (let k = -1; k <= 1; k += 2) {
      if (bullets.length >= 220) break;
      const ba = baseA + k * 0.08;
      bullets.push({
        x: t.x, y: t.y, px: t.x, py: t.y,
        vx: Math.cos(ba) * 680, vy: Math.sin(ba) * 680,
        dmg: salvoDmg, isCrit: false, angle: ba, pierce: 1, bounces: player.bounceBonus > 0 ? 1 : 0,
        turretShot: true, srcId: tSrc,
        life: 0.68, maxLife: 0.68, color: '#fde68a', r: 4.8,
        hit: null, lastHit: null
      });
    }
  }
}

function triggerBullNova() {
  if (!player || player.cls !== 'bull' || player.bullCd > 0) return;
  player.bullCd = 0.34;
  const novaDmg = (26 + player.maxHp * 0.65 + player.regen * 4) * getEffectiveDmgMul() * getElemMul();
  triggerExplosion(player.x, player.y, 165 * getBlastScale(), novaDmg, false, 0, '#ff9f1c', true, 0, 'bull_nova');
}

// D5 二阶段首领【临死挣扎】命中玩家回血结算：每次真实伤害到玩家（未被闪避），恢复首领 10% 最大生命值
function _applyD5BossLastStandSiphon(dmgSrc) {
  if (typeof diff === 'undefined' || !diff || diff.id !== 5 || !Array.isArray(enemies)) return;
  let targetBoss = null;
  if (dmgSrc && typeof dmgSrc === 'object' && dmgSrc.type === 'boss' && dmgSrc.hp > 0 && (dmgSrc.d5LastStandT || 0) > 0) {
    targetBoss = dmgSrc;
  } else if (_activeEnemyActor && typeof _activeEnemyActor === 'object' && _activeEnemyActor.type === 'boss' && _activeEnemyActor.hp > 0 && (_activeEnemyActor.d5LastStandT || 0) > 0) {
    targetBoss = _activeEnemyActor;
  } else {
    const srcKey = typeof dmgSrc === 'string' ? dmgSrc : (typeof _activeEnemyActor === 'string' ? _activeEnemyActor : '');
    if (srcKey && !srcKey.startsWith('terrain_') && !srcKey.startsWith('trap_')) {
      for (let i = 0; i < enemies.length; i++) {
        const be = enemies[i];
        if (be && be.hp > 0 && be.type === 'boss' && (be.d5LastStandT || 0) > 0 && (be.variant === srcKey || srcKey === 'boss')) {
          targetBoss = be;
          break;
        }
      }
    }
  }
  if (!targetBoss) return;
  const healAmt = Math.max(1, Math.round(targetBoss.maxHp * D5_LAST_STAND_HEAL_RATIO));
  targetBoss.hp = Math.min(targetBoss.maxHp, targetBoss.hp + healAmt);
  if (player && beams.length < 40) {
    beams.push({ x1: player.x, y1: player.y - 10, x2: targetBoss.x, y2: targetBoss.y - 12, color: '#ff2a55', t: 0.28, maxT: 0.28 });
  }
  if (rings.length < 42) {
    rings.push({ x: targetBoss.x, y: targetBoss.y, r: targetBoss.r + 34, color: '#ff4d6d', t: 0.26, maxT: 0.26, kind: 'hex' });
  }
  addText(targetBoss.x, targetBoss.y - targetBoss.r - 24, `◆ 噬血回春 +10% (+${healAmt})`, '#ff4d6d', 16, 1.15, true);
}

// 全面加固受击结算（参照《土豆兄弟》收敛隐性叠乘减伤并设 66% 非闪避减伤上限 + 记录精准承伤来源）
function hurtPlayer(rawDmg, isProjectile = false, dmgSrc = null) {
  if (!player || state !== 'wave' || player.hp <= 0 || inHurtPlayer) return;
  if (typeof isSpireCombatSuspended === 'function' && isSpireCombatSuspended()) return;
  if (typeof SpireDirector !== 'undefined' && SpireDirector.isBlockingGameplay()) return;
  if (!Number.isFinite(rawDmg) || rawDmg <= 0) return;
  inHurtPlayer = true;
  try {
    player.invuln = 0;
    if (Math.random() < Math.min(player.dodgeCap || 0.80, player.dodge || 0)) {
      addText(player.x, player.y - 28, '闪避!', '#4cc9f0', 17, 0.65, false);
      if ((player.dashCd || 0) > 0) player.dashCd = Math.max(0, player.dashCd - 0.6);
      if (player.thorns > 0) triggerThornsNova();
      if (player.cls === 'ghost') {
        triggerExplosion(player.x, player.y, 135 * getBlastScale(), (18 + player.lv * 4) * getEffectiveDmgMul() * getElemMul(), false, 0, '#72efdd', false, 0, 'relic_proc');
      }
      return;
    }

    // 收敛多重隐性减伤叠乘，并与线性 EHP 护甲合并设定 <= 66% 非闪避总减伤封顶，防止重甲流无脑站撸不掉血
    let closeGuard = 0;
    const meleeCnt = getSetBonuses().meleeCnt || 0;
    const meleeParry = Math.min(0.08, meleeCnt * 0.018);
    const meleeProjGuard = (isProjectile && (meleeCnt >= 2 || player.cls === 'brawler'))
      ? Math.min(0.08, Math.max(2, meleeCnt) * 0.02)
      : 0;
    if (meleeCnt >= 2 || player.cls === 'brawler' || player.cls === 'bull' || (player.meleeBossGuard || 0) > 0) {
      let bossNear = false;
      for (let bi = 0; bi < enemies.length; bi++) {
        const be = enemies[bi];
        if (be && be.hp > 0 && (be.type === 'boss' || be.type === 'special_boss' || be.type === 'mini_boss')) {
          const bdx = be.x - player.x, bdy = be.y - player.y;
          if (bdx * bdx + bdy * bdy < 210 * 210) { bossNear = true; break; }
        }
      }
      if (bossNear) {
        closeGuard = Math.min(0.14, (meleeCnt >= 2 || player.cls === 'brawler' || player.cls === 'bull' ? 0.06 : 0) + (player.meleeBossGuard || 0));
      }
    }
    const armorMit = getArmorMitigation();
    const rawRemainFactor = (1 - armorMit) * (1 - meleeParry) * (1 - meleeProjGuard) * (1 - closeGuard);
    const clampedRemainFactor = armorMit >= 0 ? Math.max(0.34, rawRemainFactor) : rawRemainFactor;
    let dmg = Math.max(1, Math.round(rawDmg * clampedRemainFactor));
    // 第 4/8/12/16 层首领战防满血瞬秒保护（含剧情模式与无尽前16层）：单次受击扣血不超过最大生命值的 42%
    if (wave <= MAX_WAVE && wave % 4 === 0) {
      dmg = Math.min(dmg, Math.max(2, Math.round(player.maxHp * 0.42)));
    }
    // 蚀界生存试炼防暴毙容错保护（陷阱伤害提升 +20% 后同步校准单次受击上限至最大生命的 31%）
    if (typeof survivalTrialWave !== 'undefined' && survivalTrialWave) {
      dmg = Math.min(dmg, Math.max(2, Math.round(player.maxHp * 0.31)));
      survivalTrialHits = (survivalTrialHits || 0) + 1;
    }
    player.shieldRegenT = player.fastShield ? 4.5 : 7.0;

    let totalAbsorbed = 0;
    // 能量护盾优先吸收伤害
    if (player.shield > 0) {
      const absorbed = Math.min(player.shield, dmg);
      player.shield -= absorbed;
      dmg -= absorbed;
      totalAbsorbed = absorbed;
      player.shieldHitT = 0.25;
      if (rings.length < 40) rings.push({ x: player.x, y: player.y, r: 42, color: '#72efdd', t: 0.2, maxT: 0.2 });
      addSparks(player.x, player.y, Math.random() * 6.28, '#72efdd', 5);
      beep(540, 0.06, 'sine', 0.05);
      if (player.shieldPulseNova) triggerShieldPulse();
      if (dmg <= 0) {
        recordDamageTaken(dmgSrc || _activeEnemyActor, Math.round(totalAbsorbed), false);
        _applyD5BossLastStandSiphon(dmgSrc);
        addText(player.x, player.y - 28, `护盾 -${absorbed}`, '#72efdd', 15, 0.72, false);
        if (player.thorns > 0) triggerThornsNova();
        triggerBullNova();
        return;
      }
    }

    const hpLost = Math.min(Math.max(0, player.hp), dmg);
    player.hp -= dmg;
    const isFatal = player.hp <= 0;
    recordDamageTaken(dmgSrc || _activeEnemyActor, Math.max(1, Math.round(totalAbsorbed + hpLost)), isFatal);
    _applyD5BossLastStandSiphon(dmgSrc);
    player.hurtFlashT = 0.22;
    shake = 4.5;
    beep(115, 0.15, 'sawtooth', 0.08);
    addBurst(player.x, player.y, '#ff4d6d', 10, 175);
    addText(player.x, player.y - 30, '-' + dmg, '#ff4d6d', 20, 0.72, false);
    if (isFatal) {
      player.hp = 0;
      endGame(false);
      return;
    }
    if (player.thorns > 0) triggerThornsNova();
    triggerBullNova();
  } finally {
    inHurtPlayer = false;
  }
}
