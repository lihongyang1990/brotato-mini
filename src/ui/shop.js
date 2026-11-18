// 波次结算流转、战利品宝箱、记忆信物与风亭整备。
// 一个楼层只接受一种最终结果，异步演出回调也必须属于同一个玩家/楼层实例。
let spireFloorFlow = null;
let spireFloorSerial = 0;
const SPIRE_MEMENTO_KEYS = ['jinyu', 'astria', 'jialan', 'qingyu'];

function getSpireStoryProgress() {
  if (!player) return null;
  if (!player.story || typeof player.story !== 'object') player.story = {};
  const story = player.story;
  if (!story.mementos || typeof story.mementos !== 'object') story.mementos = {};
  if (!story.memories || typeof story.memories !== 'object') story.memories = {};
  if (!story.clearedFloors || typeof story.clearedFloors !== 'object') story.clearedFloors = {};
  return story;
}

function grantSpireMemento(key) {
  if (endlessMode || !SPIRE_MEMENTO_KEYS.includes(key)) return false;
  const story = getSpireStoryProgress();
  if (!story) return false;
  story.mementos[key] = true;
  return true;
}

function rememberSpireMemento(key) {
  const story = getSpireStoryProgress();
  if (endlessMode || !story || !SPIRE_MEMENTO_KEYS.includes(key) || !story.mementos[key]) return false;
  story.memories[key] = true;
  return true;
}

function hasSpireTrueEnding() {
  const story = getSpireStoryProgress();
  return !!story && SPIRE_MEMENTO_KEYS.every(key => story.mementos[key] && story.memories[key]);
}

function beginSpireFloor(floor, isRetry) {
  spireFloorFlow = {
    serial: ++spireFloorSerial, floor, player, result: 'active', rewardsGranted: false,
    awaitingChoice: !endlessMode && floor === MAX_WAVE
  };
  if (!endlessMode) {
    const story = getSpireStoryProgress();
    story.ending = null;
    if (floor === 15 && isRetry) grantSpireMemento('qingyu');
    if (floor === MAX_WAVE) {
      const canResumeFight = isRetry && story.finalChoice === 'refuse' && hasSpireTrueEnding();
      spireFloorFlow.awaitingChoice = !canResumeFight;
      if (!canResumeFight) story.finalChoice = null;
    }
  }
}

function isCurrentSpireFlow(flow) {
  return !!flow && flow === spireFloorFlow && flow.player === player && flow.floor === wave;
}

function isSpireCombatSuspended() {
  return !!spireFloorFlow && isCurrentSpireFlow(spireFloorFlow) &&
    (spireFloorFlow.result !== 'active' || spireFloorFlow.awaitingChoice);
}

function stopSpireCombat(flow, result) {
  if (!isCurrentSpireFlow(flow) || flow.result !== 'active') return false;
  flow.result = result;
  flow.awaitingChoice = false;
  state = 'story';
  resetJoy();
  for (const key in keys) keys[key] = false;
  eBullets.length = 0;
  bullets.length = 0;
  hazards.length = 0;
  spawns.length = 0;
  if (typeof survivalFissures !== 'undefined') survivalFissures.length = 0;
  if (typeof survivalSkyVolleys !== 'undefined') survivalSkyVolleys.length = 0;
  bossCutscene = null;
  if (typeof phase2ShatterFx !== 'undefined') phase2ShatterFx = null;
  if (typeof pendingBossCutscene !== 'undefined') pendingBossCutscene = null;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
  return true;
}

function resolveSpireBossDefeat(enemy) {
  const flow = spireFloorFlow;
  if (!player || player.hp <= 0 || !isCurrentSpireFlow(flow) || flow.result !== 'active') return;
  // 一阶绝不能从这里通过：护栏也覆盖调试/外部伤害入口。
  if (enemy.storyPhaseBoss && enemy.storyStage !== 2 && !enemy.mythicPhase2) {
    enemy._storyDefeatQueued = false;
    triggerBossMythicPhase2(enemy);
    return;
  }
  // 第 4 / 8 / 12 层主线首领若在波次倒计时结束前被提前击败：
  // 立即爆出首领晶石与秘宝箱，清空残留首领弹幕，保留剩余波次时间继续刷小怪攒钱，待倒计时归零再进告别演出与商店！
  if (wave < MAX_WAVE && !overtime && waveTime > 0.6) {
    flow.bossDefeated = true;
    flow.defeatedBossVariant = enemy.variant;
    eBullets.length = 0;
    hazards.length = 0;
    bossCutscene = null;
  if (typeof phase2ShatterFx !== 'undefined') phase2ShatterFx = null;
    if (typeof pendingBossCutscene !== 'undefined') pendingBossCutscene = null;
    player.invuln = 0;
    awardEnemyRewards(enemy);
    return;
  }
  if (!stopSpireCombat(flow, 'boss-defeated')) return;
  flow.bossDefeated = true;
  enemies.forEach(other => { if (other !== enemy) other.hp = 0; });
  player.invuln = 0;
  const memento = ({ 4: 'jinyu', 8: 'astria', 12: 'jialan' })[wave];
  if (memento) grantSpireMemento(memento);
  const finish = () => {
    if (!isCurrentSpireFlow(flow) || flow.result !== 'boss-defeated' || flow.rewardsGranted || player.hp <= 0) return;
    if (wave < MAX_WAVE) awardEnemyRewards(enemy);
    else if (!enemy._rewarded) { enemy._rewarded = true; player.kills++; }
    settleSpireFloor(flow);
  };
  if (typeof SpireDirector !== 'undefined' && typeof SpireDirector.onBossDefeated === 'function') {
    SpireDirector.onBossDefeated(wave, enemy.variant, finish);
  } else finish();
}

function resolveSpireFinalChoice(choice) {
  const flow = spireFloorFlow;
  if (endlessMode || wave !== MAX_WAVE || !isCurrentSpireFlow(flow) || flow.result !== 'active' ||
      !flow.awaitingChoice || !player || player.hp <= 0) return false;
  if (choice === 'refuse') {
    if (!hasSpireTrueEnding()) return false;
    getSpireStoryProgress().finalChoice = 'refuse';
    // 镜前补完的记忆与选择进入同层检查点；重试不会丢失刚亲自确认的约定。
    if (waveCheckpoint && waveCheckpoint.wave === wave && waveCheckpoint.player) {
      waveCheckpoint.player.story = JSON.parse(JSON.stringify(getSpireStoryProgress()));
      if (typeof SpireSave !== 'undefined' && SpireSave) SpireSave.write(waveCheckpoint);
    }
    flow.awaitingChoice = false;
    state = 'wave';
    document.getElementById('hud').classList.remove('hidden');
    return true;
  }
  if (choice === 'accept') {
    getSpireStoryProgress().finalChoice = 'accept';
    if (!stopSpireCombat(flow, 'ending')) return false;
    playSpireEnding('A', flow);
    return true;
  }
  return false;
}

function playSpireEnding(ending, flow) {
  if (!isCurrentSpireFlow(flow) || flow.endingStarted) return;
  if (ending === 'B' && (!flow.bossDefeated || !hasSpireTrueEnding() || getSpireStoryProgress().finalChoice !== 'refuse')) return;
  flow.endingStarted = true;
  flow.result = 'ending';
  state = 'story';
  const story = getSpireStoryProgress();
  story.ending = ending;
  const done = () => {
    if (!isCurrentSpireFlow(flow) || flow.result !== 'ending') return;
    flow.result = 'ended';
    try {
      const records = JSON.parse(localStorage.getItem('spire-endings-v2') || '{}');
      records[ending] = true;
      localStorage.setItem('spire-endings-v2', JSON.stringify(records));
    } catch (_) { /* Private browsing may disallow storage; the ending still completes. */ }
    if (typeof SpireSave !== 'undefined' && SpireSave) SpireSave.clear();
    waveCheckpoint = null;
    showSpireEndMenu(true, ending);
  };
  if (typeof SpireDirector !== 'undefined' && typeof SpireDirector.playEnding === 'function') {
    SpireDirector.playEnding(ending, done);
  } else done();
}

function settleSpireFloor(flow) {
  if (!isCurrentSpireFlow(flow) || flow.rewardsGranted || !player || player.hp <= 0) return;
  flow.rewardsGranted = true;
  const story = !endlessMode ? getSpireStoryProgress() : null;
  if (story) story.clearedFloors[wave] = true;
  if (!endlessMode && wave === MAX_WAVE) {
    if (story.finalChoice === 'refuse' && hasSpireTrueEnding()) playSpireEnding('B', flow);
    return;
  }
  // 无论剧情或无尽模式，结算前统一自动回收地上未拾取战利品箱（首领/神话箱不受普通箱上限限制；普通精英箱独立计入上限 3）。
  for (const drop of drops) {
    if (drop.kind !== 'crate') continue;
    const specialQueued = (player.mythicCratesQueued || 0) + (player.bossCratesQueued || 0)
      + (player.survivalCratesQueued || 0) + (player.survivalGoldCratesQueued || 0);
    const regularCratesQueued = Math.max(0, pendingCrates - specialQueued);
    if (drop.isMythic || drop.isBoss || regularCratesQueued < 3) {
      pendingCrates++;
      if (drop.isMythic) player.mythicCratesQueued = (player.mythicCratesQueued || 0) + 1;
      else if (drop.isBoss) player.bossCratesQueued = (player.bossCratesQueued || 0) + 1;
    } else {
      player.mats += Math.round((16 + wave * 3) * 1.10);
    }
  }
  settleWaveRewards();
  flow.result = 'settled';
  drops.length = 0;
  advancePostWave();
}

// 波次结算流转、战利品宝箱、基因强化、五阶神话二选一进化与军火商店交互
const WEAPON_TIER_COST_MUL = [0, 1, 1.9, 3.0, 4.4, 6.4];
let _evoResumeCb = null;
let _evoUiSerial = 0;

function resetWeaponEvolutionUI() {
  _evoUiSerial++;
  _evoResumeCb = null;
  const modal = typeof document !== 'undefined' ? document.getElementById('evoModal') : null;
  if (modal) modal.classList.add('hidden');
}

function _wpnEmblem(id, tier, evoId, fallbackIcon) {
  if (typeof renderWeaponEmblemHtml === 'function') {
    return renderWeaponEmblemHtml(id, tier, evoId || '', fallbackIcon);
  }
  return fallbackIcon || '⚔️';
}

function _itmEmblem(itemObj, fallbackTier = 1) {
  if (typeof renderItemEmblemHtml === 'function') {
    return renderItemEmblemHtml(itemObj, fallbackTier, (itemObj && itemObj.icon) || '✨');
  }
  return (itemObj && itemObj.icon) || '✨';
}

function _wpnDispName(wOrId, tierArg, evoArg) {
  if (wOrId && typeof wOrId === 'object') {
    const tpl = WEAPONS[wOrId.id];
    if (wOrId.tier >= 5 && wOrId.evoName) return wOrId.evoName;
    if (wOrId.tier >= 5 && wOrId.evo && tpl && Array.isArray(tpl.evos)) {
      const hit = tpl.evos.find(e => e.id === wOrId.evo);
      if (hit) return hit.name;
    }
    return tpl ? tpl.name : (wOrId.id || '');
  }
  const tpl = WEAPONS[wOrId];
  if (!tpl) return String(wOrId || '');
  const t = Number(tierArg) || 1;
  if (t >= 5 && evoArg && Array.isArray(tpl.evos)) {
    const hit = tpl.evos.find(e => e.id === evoArg);
    if (hit) return hit.name;
  }
  return tpl.name;
}

function _rarityPill(tier, extraCls = '') {
  if (typeof renderRarityPillHtml === 'function') {
    return renderRarityPillHtml(tier, extraCls);
  }
  const t = Math.max(1, Math.min(5, Number(tier) || 1));
  return `<span class="t-rarity-pill tp-${t}${extraCls ? ' ' + extraCls : ''}">${TIER_NAMES[t] || ('阶' + t)}</span>`;
}

function _syncChoiceStandee(standeeId, subtitleTxt, vistaId = '', matId = '') {
  if (typeof document === 'undefined') return;
  const hudEl = document.getElementById('hud');
  if (hudEl && state !== 'wave') hudEl.classList.add('hidden');
  const clsId = (player && player.cls) || 'allrounder';
  const clsObj = (typeof CLASSES !== 'undefined' && Array.isArray(CLASSES)) ? CLASSES.find(c => c.id === clsId) : null;
  const heroName = clsObj ? clsObj.name : '零 · 提灯人';
  if (vistaId) {
    const vEl = document.getElementById(vistaId);
    if (vEl && vEl.style) {
      const sceneUrl = typeof getHeroMasterSceneUrl === 'function'
        ? getHeroMasterSceneUrl(clsId)
        : ((typeof curScene !== 'undefined' && curScene && curScene.vistaImg) ? curScene.vistaImg : 'assets/spire/scene_1_vista.jpg');
      vEl.style.backgroundImage = `url('${sceneUrl}')`;
    }
  }
  if (matId) {
    const mEl = document.getElementById(matId);
    if (mEl) mEl.textContent = `◇ ${player ? (player.mats || 0) : 0}`;
  }
  const el = document.getElementById(standeeId);
  if (!el) return;
  if (el.style) el.style.backgroundImage = '';
  const bustUrl = typeof getHeroUiBustUrl === 'function' ? getHeroUiBustUrl(clsId) : '';
  el.innerHTML = `
    <div class="dhs-frame">
      ${bustUrl ? `<img src="${bustUrl}" alt="${heroName}" class="dhs-bust-img" decoding="async">` : ''}
      <div class="dss-quote">
        <b>${heroName}</b>
        <span>${subtitleTxt || ''}</span>
      </div>
    </div>`;
}

let shopHubTab = 'shop';
let ovRelicCols = 2;

function setShopHubTab(tab) {
  shopHubTab = tab === 'overview' ? 'overview' : 'shop';
  beep(495, 0.035, 'triangle', 0.03);
  if (state === 'shop') renderShop();
}

function setOverviewRelicCols(cols) {
  ovRelicCols = cols === 1 ? 1 : 2;
  beep(470, 0.03, 'triangle', 0.025);
  const g = typeof document !== 'undefined' ? document.getElementById('ovRelicGrid') : null;
  if (g && g.classList) {
    g.classList.toggle('cols-2', ovRelicCols === 2);
    g.classList.toggle('cols-1', ovRelicCols === 1);
  }
  const b2 = typeof document !== 'undefined' ? document.getElementById('ovColBtn2') : null;
  const b1 = typeof document !== 'undefined' ? document.getElementById('ovColBtn1') : null;
  if (b2 && b2.classList) b2.classList.toggle('on', ovRelicCols === 2);
  if (b1 && b1.classList) b1.classList.toggle('on', ovRelicCols === 1);
}

function countMergeableWeaponPairs() {
  if (!player || !Array.isArray(player.weapons)) return 0;
  const map = {};
  for (let i = 0; i < player.weapons.length; i++) {
    const w = player.weapons[i];
    if (!w || w.tier >= 5) continue;
    const k = `${w.id}_${w.tier}`;
    map[k] = (map[k] || 0) + 1;
  }
  let pairs = 0;
  for (const k of Object.keys(map)) pairs += Math.floor(map[k] / 2);
  return pairs;
}

function quickMergeAllWeapons() {
  if (!player || !Array.isArray(player.weapons)) return 0;
  if (typeof closeWeaponSlotModal === 'function') closeWeaponSlotModal(true);
  let mergedCount = 0;
  let guard = 0;
  while (guard++ < 24) {
    let didOne = false;
    for (let i = 0; i < player.weapons.length; i++) {
      const w = player.weapons[i];
      if (!w || w.tier >= 5) continue;
      const j = player.weapons.findIndex((x, idx) => idx > i && x && x.id === w.id && x.tier === w.tier);
      if (j !== -1) {
        w.tier++;
        player.weapons.splice(j, 1);
        mergedCount++;
        didOne = true;
        break;
      }
    }
    if (!didOne) break;
  }
  if (mergedCount > 0) {
    player._sbCache = null;
    syncSetHp();
    beep(820, 0.12, 'triangle', 0.07);
    logInfo('SHOP', `一键共鸣合阶完成 ×${mergedCount} 次`);
    if (state === 'shop') renderShop();
    checkPendingWeaponEvolutions();
  }
  return mergedCount;
}

const _SET_MODAL_TIERS = {
  primitive: { icon: '🌿', fx: ['最大生命 +8', '最大生命 +18', '最大生命 +30'] },
  precise:   { icon: '🎯', fx: ['暴击率 +6%', '暴击率 +12%', '暴击率 +20%'] },
  gun:       { icon: '🔫', fx: ['攻击范围 +45 · 攻速 +8%', '攻击范围 +95 · 攻速 +16%', '攻击范围 +155 · 攻速 +25%'] },
  heavy:     { icon: '🛡️', fx: ['护甲 +2 · 爆破范围 +20%', '护甲 +5 · 爆破范围 +20%', '护甲 +8 · 爆破范围 +20%'] },
  elemental: { icon: '🔥', fx: ['元素与反应伤害 +18%', '元素与反应伤害 +38%', '元素与反应伤害 +62%'] },
  tech:      { icon: '⚙️', fx: ['工程伤害 +25% · 建筑攻速 +8%', '工程伤害 +52% · 建筑攻速 +16%', '工程伤害 +85% · 建筑攻速 +25%'] }
};
function openShopSynergyModal(setKey) {
  const def = SET_DEFS && SET_DEFS[setKey];
  const modal = typeof document !== 'undefined' ? document.getElementById('weaponActionModal') : null;
  const card = typeof document !== 'undefined' ? document.getElementById('weaponActionCard') : null;
  if (!def || !modal || !card) return false;
  selectedWeaponSlotIdx = -1;
  beep(500, 0.035, 'triangle', 0.03);
  const sb = getSetBonuses();
  const curCnt = (sb && sb.counts && sb.counts[setKey]) || 0;
  const meta = _SET_MODAL_TIERS[setKey] || { icon: '✦', fx: [] };
  const steps = Array.isArray(def.steps) ? def.steps : [];
  const tierRows = steps.map((need, idx) => {
    const unlocked = curCnt >= need;
    const fxTxt = meta.fx[idx] || def.desc;
    return `<div style="padding:8px 11px;border:1px solid ${unlocked ? '#f2ede6' : 'rgba(242,237,230,0.22)'};background:${unlocked ? 'linear-gradient(92deg,rgba(140,25,43,0.78),rgba(54,10,18,0.88))' : 'rgba(255,255,255,0.04)'};display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12.5px">
      <b>${unlocked ? '★ 已激活' : '◇ 需凑齐'} (${need} 把)</b>
      <span style="color:${unlocked ? '#ffe3aa' : '#cfd5e4'}">${fxTxt}</span>
    </div>`;
  }).join('');
  const memberNames = Object.entries(WEAPONS)
    .filter(([, w]) => w.set === setKey)
    .map(([, w]) => w.name)
    .join(' · ');
  card.className = 'wpn-action-card t3';
  card.innerHTML = `
    <div class="wpn-act-head">
      <div class="item-emblem t3">${meta.icon || '✦'}</div>
      <div class="card-meta" style="flex:1;min-width:0">
        <div class="p5-title-group">
          <div class="wpn-act-title">${def.label} · 套装羁绊详情</div>
        </div>
        <div class="card-badges">
          <span class="tag tag-owned">当前随身 ${curCnt} 把</span>
          <span class="tag">激活阶梯 ${def.steps.join(' / ')}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:7px;margin:6px 0">${tierRows}</div>
    <div class="wpn-act-set-line">✦ 所属兵装：${memberNames}</div>
    <div class="wpn-act-btns">
      <div class="wpn-act-btns-row">
        <button type="button" class="btn btn-go" style="flex:1;justify-content:center" onclick="closeWeaponSlotModal()">明了</button>
      </div>
    </div>`;
  modal.classList.remove('hidden');
  return true;
}

function openShopRelicModal(itemId) {
  const it = ITEMS.find(x => x && x.id === itemId);
  const modal = typeof document !== 'undefined' ? document.getElementById('weaponActionModal') : null;
  const card = typeof document !== 'undefined' ? document.getElementById('weaponActionCard') : null;
  if (!it || !modal || !card) return false;
  selectedWeaponSlotIdx = -1;
  beep(505, 0.035, 'triangle', 0.03);
  const ownedCnt = (player && player.items && player.items[it.id]) || 0;
  card.className = `wpn-action-card t${it.tier}`;
  card.innerHTML = `
    <div class="wpn-act-head">
      <div class="item-emblem t${it.tier}">${_itmEmblem(it, it.tier)}</div>
      <div class="card-meta" style="flex:1;min-width:0">
        <div class="p5-title-group">
          <div class="wpn-act-title">${it.name}</div>
          ${_rarityPill(it.tier)}
        </div>
        <div class="card-badges">
          <span class="tag tag-owned">当前持有 ×${ownedCnt}</span>
          ${typeof renderRelicScopeBadgesHtml === 'function' ? renderRelicScopeBadgesHtml(it) : ''}
          ${it.maxCount ? `<span class="tag">${it.maxCount === 1 ? '唯一遗物' : '上限 ×' + it.maxCount}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="wpn-act-desc">${it.desc}</div>
    <div class="wpn-act-set-line">💎 商店基准价值：◇${it.cost}</div>
    <div class="wpn-act-btns">
      <div class="wpn-act-btns-row">
        <button type="button" class="btn btn-go" style="flex:1;justify-content:center" onclick="closeWeaponSlotModal()">关闭</button>
      </div>
    </div>`;
  modal.classList.remove('hidden');
  return true;
}

if (typeof globalThis !== 'undefined') {
  globalThis.setShopHubTab = setShopHubTab;
  globalThis.setOverviewRelicCols = setOverviewRelicCols;
  globalThis.quickMergeAllWeapons = quickMergeAllWeapons;
  globalThis.openShopSynergyModal = openShopSynergyModal;
  globalThis.openShopRelicModal = openShopRelicModal;
}

function getPendingEvoWeapon() {
  if (!player || !Array.isArray(player.weapons)) return null;
  for (let i = 0; i < player.weapons.length; i++) {
    const w = player.weapons[i];
    const tpl = w && WEAPONS[w.id];
    if (w && w.tier >= 5 && !w.evo && tpl && Array.isArray(tpl.evos) && tpl.evos.length >= 2) {
      return w;
    }
  }
  return null;
}

function applyWeaponEvolution(w, evoIdx) {
  if (!w) return null;
  const tpl = WEAPONS[w.id];
  if (!tpl || !Array.isArray(tpl.evos) || !tpl.evos.length) return null;
  const opt = tpl.evos[evoIdx] || tpl.evos[0];
  w.tier = 5;
  w.evo = opt.id;
  w.evoName = opt.name;
  w.evoColor = opt.color || '#ff5c8a';
  w.evoTag = opt.tag || '神话进化';
  if (player) player._sbCache = null;
  syncSetHp();
  logInfo('EVO', `兵装五阶神话进化：${tpl.name} -> 【${opt.name}】(${opt.tag})`);
  return opt;
}

function checkPendingWeaponEvolutions(onAllResolved) {
  if (typeof onAllResolved === 'function') _evoResumeCb = onAllResolved;
  const serial = ++_evoUiSerial;
  const owner = player;
  const ownerWave = wave;
  const targetW = getPendingEvoWeapon();
  const modal = typeof document !== 'undefined' ? document.getElementById('evoModal') : null;
  if (!targetW) {
    if (modal) modal.classList.add('hidden');
    const cb = _evoResumeCb;
    _evoResumeCb = null;
    if (typeof cb === 'function') cb();
    return false;
  }
  if (!modal) {
    // 无弹窗节点兜底自动觉醒第一分支，防止任何环境下流程阻塞
    applyWeaponEvolution(targetW, 0);
    return checkPendingWeaponEvolutions();
  }

  const tpl = WEAPONS[targetW.id];
  const preEvoName = _wpnDispName(targetW.id, 4);
  _syncChoiceStandee('evoHeroStandee', 'MYTHIC AWAKENING · 五阶神话二选一觉醒', 'evoVistaBg', 'evoMat');
  const titleEl = document.getElementById('evoTitle');
  const subEl = document.getElementById('evoSub');
  const box = document.getElementById('evoChoices');
  if (titleEl) titleEl.textContent = `${preEvoName} · 五阶神话二选一`;
  if (subEl) subEl.textContent = tpl.melee
    ? '择定唯一神话觉醒方向，永久重塑兵装圣徽并额外觉醒 20% 概率斩碎敌弹！'
    : '择定唯一神话觉醒方向，永久重塑兵装圣徽外观与专属战斗机制';
  _selectedEvoIdx = 0;
  _evoPickHandlers = [];
  if (box) {
    box.innerHTML = '';
    const sLabel = SET_DEFS[tpl.set] ? SET_DEFS[tpl.set].label : '';
    const evoOpts = tpl.evos.slice(0, 2);
    const syncEvoSel = nextIdx => {
      _selectedEvoIdx = Math.max(0, Math.min(evoOpts.length - 1, nextIdx));
      Array.from(box.children).forEach((ch, ci) => ch.classList.toggle('is-sel', ci === _selectedEvoIdx));
      const cfm = document.getElementById('evoConfirmMainBtn');
      if (cfm && evoOpts[_selectedEvoIdx]) {
        cfm.textContent = `◆ 觉醒「${evoOpts[_selectedEvoIdx].name}」 →`;
      }
    };
    evoOpts.forEach((opt, idx) => {
      const card = document.createElement('div');
      card.className = 'p5-row t5 evo-choice-card' + (idx === 0 ? ' is-sel' : '');
      const artHtml = _wpnEmblem(targetW.id, 5, opt.id, tpl.icon);
      card.innerHTML = `
        <div class="p5-ico-edge"><div class="p5-ico-inner">${artHtml}</div></div>
        <div class="p5-notch" aria-hidden="true"></div>
        <div class="p5-bar-edge">
          <div class="p5-bar-fill">
            <div class="p5-bar-top">
              <div class="p5-title-group">
                <span class="p5-bar-title" style="color:${opt.color || '#ffd6e5'}" title="${opt.name}">★ ${opt.name}</span>
                ${_rarityPill(5)}
              </div>
              <div class="sr-contract-hidden"><button type="button" class="evo-pick-btn">觉醒</button></div>
            </div>
            <div class="p5-bar-cat">${opt.desc}</div>
            <div class="p5-bar-foot">
              <span class="bar-prog-badge ready">★ ${sLabel ? sLabel + ' · ' : ''}神话分支 ${idx === 0 ? 'I' : 'II'} · ${opt.tag || '终极质变'}</span>
            </div>
          </div>
        </div>`;
      const pick = () => {
        if (serial !== _evoUiSerial || player !== owner || wave !== ownerWave ||
            targetW !== getPendingEvoWeapon()) return;
        applyWeaponEvolution(targetW, idx);
        beep(880, 0.14, 'triangle', 0.08);
        if (state === 'shop') renderShop();
        checkPendingWeaponEvolutions();
      };
      _evoPickHandlers[idx] = pick;
      const btn = card.querySelector('.evo-pick-btn');
      if (btn) btn.onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); pick(); };
      card.onclick = () => {
        if (_selectedEvoIdx === idx) { pick(); return; }
        beep(520, 0.035, 'triangle', 0.03);
        syncEvoSel(idx);
      };
      box.appendChild(card);
    });
    syncEvoSel(0);
  }
  modal.classList.remove('hidden');
  modal.scrollTop = 0;
  return true;
}

function advancePostWave() {
  if (getPendingEvoWeapon()) {
    const flow = spireFloorFlow;
    checkPendingWeaponEvolutions(() => {
      if (isCurrentSpireFlow(flow) && flow.result === 'settled') advancePostWave();
    });
    return;
  }
  const cm = document.getElementById('crateMenu');
  const lm = document.getElementById('levelMenu');
  if (pendingCrates > 0) {
    if (lm) lm.classList.add('hidden');
    showCrateMenu();
  } else if (pendingLevels > 0) {
    if (cm) cm.classList.add('hidden');
    showLevelUp();
  } else {
    if (cm) cm.classList.add('hidden');
    if (lm) lm.classList.add('hidden');
    openShop(true);
  }
}

function canOfferSurvivalTrialForWave(targetWave) {
  if (!player || !Number.isFinite(targetWave) || targetWave < 2) return false;
  // 严格保护每 4 层固定首领战（4, 8, 12, 16, 20...）不被覆盖
  if (targetWave >= 4 && targetWave % 4 === 0) return false;
  // 严格保护幕中先锋统领战（剧情 6/10/14 层，无尽 6/10/14/18... 层）不被覆盖
  const isStoryClimb = !endlessMode && targetWave <= MAX_WAVE;
  const isElite = diff && diff.midElite && (
    (isStoryClimb && (targetWave === 6 || targetWave === 10 || targetWave === 14)) ||
    (endlessMode && targetWave >= 6 && targetWave % 4 === 2)
  );
  if (isElite) return false;
  // 每 4 层幕间周期最多通关 1 次蚀界生存试炼（未通关或取消前仍可在本幕后续符合条件的楼层开启）
  const actSlot = Math.floor((targetWave - 1) / 4);
  if (player.survivalActsCleared && player.survivalActsCleared[actSlot]) return false;
  return true;
}

function toggleSurvivalTrial() {
  const nextFloorNum = wave + 1;
  if (!canOfferSurvivalTrialForWave(nextFloorNum)) {
    survivalTrialQueued = false;
    if (state === 'shop') renderShop();
    return false;
  }
  survivalTrialQueued = !survivalTrialQueued;
  beep(survivalTrialQueued ? 740 : 420, 0.08, 'triangle', 0.055);
  logInfo('SHOP', `${survivalTrialQueued ? '缔结' : '解除'}蚀界生存试炼契约 -> 第 ${nextFloorNum} 层`);
  if (state === 'shop') renderShop();
  return survivalTrialQueued;
}

function calcSurvivalTrialGoldComp(waveNum, hits = 0, p = player) {
  const crystalMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.77;
  const wv = Math.max(1, Number(waveNum) || 1);
  const harvestMul = Math.max(1, Math.min(2.2, (p && p.harvest) || 1));
  // 丰厚渡劫金币补偿：足额弥补 40 秒 70% 刷怪削减与器物缺口，并额外发放身法评级赏金
  const baseBounty = Math.max(32, Math.round((38 + wv * 8.4) * crystalMul * (0.65 + 0.35 * harvestMul)));
  const masterBonus = hits === 0
    ? Math.max(18, Math.round((22 + wv * 3.8) * crystalMul))
    : (hits <= 2
        ? Math.max(11, Math.round((14 + wv * 2.4) * crystalMul))
        : Math.max(6, Math.round((8 + wv * 1.3) * crystalMul)));
  return { baseBounty, masterBonus, total: baseBounty + masterBonus };
}
globalThis.calcSurvivalTrialGoldComp = calcSurvivalTrialGoldComp;

function completeSurvivalTrial() {
  if (!player || !survivalTrialWave) return;
  survivalTrialWave = false;
  const actSlot = Math.floor((wave - 1) / 4);
  if (!player.survivalActsCleared || typeof player.survivalActsCleared !== 'object') {
    player.survivalActsCleared = {};
  }
  player.survivalActsCleared[actSlot] = true;

  // 清退场上残存追猎怪，达成 40 秒绝境渡劫即刻清场
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i] && enemies[i].hp > 0) enemies[i].hp = 0;
  }

  // 经济与等级差额津贴（丰厚补偿 40 秒 70% 削减怪物的晶石与经验产出，外加身法评级赏金）
  const comp = calcSurvivalTrialGoldComp(wave, survivalTrialHits, player);
  const totalMatGain = comp.total;
  player.mats += totalMatGain;

  const xpComp = Math.max(10, Math.round((11 + wave * 3.0) * (player.harvest || 1)));
  player.xp += xpComp;
  let lvGuard = 0;
  while (player.xp >= player.xpNeed && lvGuard++ < 25) {
    player.xp -= player.xpNeed;
    player.lv++;
    player.xpNeed = Math.max(10, Math.round(player.xpNeed * 1.36 + 6));
    player.maxHp += 1;
    player.hp += 1;
    pendingLevels++;
  }

  // 渡劫魂火回春 + 无瑕身法微祝（最多累计 2 次 +2% 永久闪避）
  const healAmt = Math.max(6, Math.round(player.maxHp * 0.35));
  player.hp = Math.min(player.maxHp, player.hp + healAmt);
  let dodgeBlessed = false;
  if (survivalTrialHits === 0 && (player.survivalFlawlessCnt || 0) < 2) {
    player.survivalFlawlessCnt = (player.survivalFlawlessCnt || 0) + 1;
    player.dodge = Math.min(player.dodgeCap || 0.80, (player.dodge || 0) + 0.02);
    dodgeBlessed = true;
  }

  // 100% 必得【蚀界渡劫秘匣】（剧情与无尽通用，开启必出紫色 3 阶史诗或金色 4 阶传说的兵装 + 遗物！）
  pendingCrates++;
  const isGoldGrade = survivalTrialHits <= 2;
  if (isGoldGrade) {
    player.survivalGoldCratesQueued = (player.survivalGoldCratesQueued || 0) + 1;
  } else {
    player.survivalCratesQueued = (player.survivalCratesQueued || 0) + 1;
  }

  beep(880, 0.16, 'triangle', 0.075);
  logInfo('SURVIVAL', `第 ${wave} 层蚀界生存试炼通关 · 受击=${survivalTrialHits}次 · 赏金+${totalMatGain}💎 · 经验+${xpComp} · 秘匣=${isGoldGrade ? '无瑕圣匣(高金率)' : '渡劫秘匣(紫+保底)'}${dodgeBlessed ? ' · 无伤闪避+2%' : ''}`);
}

function finishWave() {
  if (!player || player.hp <= 0 || state !== 'wave') return;
  const flow = spireFloorFlow;
  if (!isCurrentSpireFlow(flow) || flow.result !== 'active' || flow.rewardsGranted || flow.awaitingChoice) return;
  // 首领层必须先完成首领第二阶段讨伐，绝不能靠计时归零绕过首领；击败首领后刷完剩余小怪计时归零即可正常结算！
  if (!endlessMode && wave % 4 === 0 && !flow.bossDefeated) return;
  const wasSurvivalTrial = !!survivalTrialWave;
  if (!stopSpireCombat(flow, 'floor-cleared')) return;
  if (wasSurvivalTrial) {
    completeSurvivalTrial();
  }
  if (!endlessMode && wave < MAX_WAVE && wave % 4 === 0 && flow.bossDefeated) {
    const memento = ({ 4: 'jinyu', 8: 'astria', 12: 'jialan' })[wave];
    if (memento) grantSpireMemento(memento);
  }
  const done = () => {
    if (!isCurrentSpireFlow(flow) || flow.result !== 'floor-cleared') return;
    settleSpireFloor(flow);
  };
  if (!endlessMode && typeof SpireDirector !== 'undefined') {
    if (wave < MAX_WAVE && wave % 4 === 0 && flow.bossDefeated && typeof SpireDirector.onBossDefeated === 'function') {
      SpireDirector.onBossDefeated(wave, flow.defeatedBossVariant || null, done);
      return;
    }
    if (typeof SpireDirector.onFloorCleared === 'function') {
      SpireDirector.onFloorCleared(wave, done);
      return;
    }
  }
  done();
}

function settleWaveRewards() {
  resetJoy();
  beep(660, 0.18, 'triangle', 0.07);
  let leftoverMats = 0;
  for (let i = 0; i < drops.length; i++) {
    if (drops[i].kind === 'mat') leftoverMats += (drops[i].val || 1);
  }
  const crystalMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.77;
  const matRate = typeof getWaveMatRate === 'function' ? getWaveMatRate(wave) : (0.92 * crystalMul / (1 + Math.min(5, Math.max(0, wave - 1)) * 0.14 + Math.max(0, wave - 6) * 0.075));
  const sweepRate = typeof UNCOLLECTED_MAT_SWEEP_RATE === 'number' ? UNCOLLECTED_MAT_SWEEP_RATE : 0.50;
  // 自动回收地上 50% 未拾取晶石（由 70% 回调还原至 50%） + 适度通关津贴 + 【收获】成长分红 + 【理财冠】利息
  const leftover = Math.round(leftoverMats * matRate * sweepRate);
  const interestCap = Math.round((24 + wave * 9) * crystalMul);
  const interestGain = player.interest > 0 ? Math.min(interestCap, Math.round(player.mats * player.interest)) : 0;
  const clearBonus = Math.max(2, Math.round((4 + Math.floor(wave * 1.5)) * crystalMul));
  const harvestGain = Math.max(0, Math.round((player.harvestFlat || 0) * crystalMul));
  player.mats += leftover + clearBonus + interestGain + harvestGain;
  if (harvestGain > 0) {
    player.xp += Math.round(harvestGain * 0.70);
    let lvGuard = 0;
    while (player.xp >= player.xpNeed && lvGuard++ < 25) {
      player.xp -= player.xpNeed; player.lv++;
      player.xpNeed = Math.max(10, Math.round(player.xpNeed * 1.36 + 6));
      player.maxHp += 1; player.hp += 1;
      pendingLevels++;
    }
    // 复刻原版《土豆兄弟》收获复利：每波结算后收获值自动递增 +8%！
    player.harvestFlat = Math.round((player.harvestFlat || 0) * 1.08 * 10) / 10;
  }
  logInfo('WAVE_END', `第 ${wave} 波通关 · 结算晶石=${player.mats} (回收+${leftover}, 津贴+${clearBonus}, 收获+${harvestGain}, 利息+${interestGain}, 宝箱=${pendingCrates}) · 击杀=${player.kills}`);
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
}

// 严格受控的战利品与商店品质概率曲线（稀有/史诗/传说装备出率适度收敛，突出高阶神装珍稀感）
function rollShopTier(waveNum, luck) {
  const luckF = Math.min(1, Math.max(0, luck || 0) / 95);
  const p4 = waveNum < 5 ? 0 : Math.min(0.095, 0.008 + (waveNum - 5) * 0.0072 + luckF * 0.024);
  const p3 = waveNum < 3 ? 0 : Math.min(0.23, 0.030 + (waveNum - 3) * 0.0165 + luckF * 0.038);
  const p2 = waveNum < 2 ? 0 : Math.min(0.42, 0.17 + (waveNum - 2) * 0.028 + luckF * 0.035);
  const u = Math.random();
  if (u < p4) return 4;
  if (u < p4 + p3) return 3;
  if (u < p4 + p3 + p2) return 2;
  return 1;
}

function rollCrateTier(waveNum, luck, isBossCrate = false) {
  const luckF = Math.min(1, Math.max(0, luck || 0) / 95);
  const p4 = waveNum < 5 ? 0 : Math.min(isBossCrate ? 0.17 : 0.11, (isBossCrate ? 0.035 : 0.011) + (waveNum - 5) * 0.0078 + luckF * 0.026);
  const p3 = waveNum < 3 ? 0 : Math.min(isBossCrate ? 0.31 : 0.24, (isBossCrate ? 0.125 : 0.048) + (waveNum - 3) * 0.0175 + luckF * 0.042);
  const p2 = waveNum < 2 ? (isBossCrate ? 0.44 : 0.20) : Math.min(0.45, 0.26 + (waveNum - 2) * 0.022);
  const u = Math.random();
  if (u < p4) return 4;
  if (u < p4 + p3) return 3;
  if (u < p4 + p3 + p2) return 2;
  return (isBossCrate && waveNum >= 4) ? 2 : 1;
}

function isItemAvailable(it, excludeSet = null, checkWaveMin = false) {
  if (!it || (excludeSet && excludeSet.has(it.id))) return false;
  if (checkWaveMin && ((it.tier >= 4 && wave < 5) || (it.tier >= 3 && wave < 3))) return false;
  const ownedCnt = (player && player.items && player.items[it.id]) || 0;
  if (it.maxCount && ownedCnt >= it.maxCount) return false;
  return true;
}

// 流派倾向隐藏概率暗增系统：当主角明显走某一流派（武器/遗物/专精成型度跨过阈值）时，对应流派兵装与遗物刷新权重暗增，最高严格封顶 +20%（1.20x）！
const ARCHETYPE_HIDDEN_BOOST_MAX = 0.20;

function getArchetypeAffinityBoosts(p = player) {
  const boosts = {
    tech: 0, staff: 0, elemental: 0, melee: 0, ranged: 0,
    tank: 0, crit: 0, dodge: 0, vampire: 0, explosive: 0, econ: 0
  };
  if (!p) return boosts;

  let techW = 0, staffW = 0, elemW = 0, meleeW = 0, rangedW = 0, heavyW = 0, preciseW = 0;
  for (const w of (p.weapons || [])) {
    const tpl = w && WEAPONS[w.id];
    if (!tpl) continue;
    const tierWeight = 1 + Math.max(0, (w.tier || 1) - 1) * 0.15;
    if (tpl.isStaff) staffW += tierWeight;
    else if (tpl.melee) meleeW += tierWeight;
    else rangedW += tierWeight;
    if (tpl.set === 'tech' || tpl.deploysTotem) techW += tierWeight;
    if (tpl.set === 'elemental') elemW += tierWeight;
    if (tpl.set === 'heavy') heavyW += tierWeight;
    if (tpl.set === 'precise') preciseW += tierWeight;
  }

  const constructCnt = (p.bonusTurrets || 0) + (p.laserTurrets || 0) + (p.mineLayers || 0) + (p.shockTurrets || 0) + (p.totemTurrets || 0);
  const bonusSpd = Math.max(0, (p.spdMul || 1) - 1.08);
  const rawScores = {
    tech: (p.cls === 'engineer' ? 0.26 : 0) + techW * 0.26 + constructCnt * 0.25 + (p.techBonus || 0) * 1.35 + ((p.turretAspdBonus || 0) + (p.mineHaste || 0)) * 0.9 + (p.pocketFactory ? 0.28 : 0),
    staff: staffW * 0.34 + ((p.staffVolley || 0) + (p.staffPierce || 0)) * 0.26 + (p.staffHaste || 0) * 1.25 + (p.archmageMeteor ? 0.36 : 0) + Math.max(0, (p.staffRange || 0)) * 0.006 + (p.staffZoneScale || 0) * 0.9,
    elemental: elemW * 0.26 + staffW * 0.12 + (p.elemBonus || 0) * 1.45 + ((p.burnChance || 0) + (p.chillChance || 0) + (p.poisonChance || 0)) * 0.78 + (p.dotHaste || 0) * 1.15 + (p.elemCrit ? 0.28 : 0),
    melee: (p.cls === 'brawler' ? 0.26 : 0) + meleeW * 0.25 + (p.meleeBonus || 0) * 1.45 + (p.meleeSweepBonus || 0) * 0.20,
    ranged: (p.cls === 'ranger' ? 0.26 : 0) + rangedW * 0.25 + (p.rangedBonus || 0) * 1.45 + ((p.bounceBonus || 0) + (p.pierceBonus || 0) + (p.rangedPelletsBonus || 0)) * 0.20,
    tank: (p.cls === 'bull' ? 0.36 : 0) + heavyW * 0.24 + Math.max(0, p.armor || 0) * 0.055 + Math.max(0, (p.maxHp || 30) - 36) * 0.014 + (p.maxShield || 0) * 0.028,
    crit: preciseW * 0.25 + Math.max(0, (p.crit || 0) - 0.06) * 1.65 + Math.max(0, p.critDmg || 0) * 0.55,
    dodge: (p.cls === 'ghost' ? 0.26 : 0) + Math.max(0, (p.dodge || 0) - 0.04) * 1.65 + bonusSpd * 1.25 + (p.dashSurge ? 0.26 : 0),
    vampire: (p.cls === 'vampire' ? 0.28 : 0) + Math.max(0, p.lifesteal || 0) * 2.50,
    explosive: (p.blastChance || 0) * 1.65 + Math.max(0, (p.explosionScale || 1) - 1) * 1.35 + heavyW * 0.12,
    econ: Math.max(0, (p.harvestFlat || 0) - 8) * 0.022 + (p.interest || 0) * 2.2 + Math.max(0, (p.luck || 0) - 10) * 0.018
  };

  for (const k of Object.keys(boosts)) {
    const s = rawScores[k] || 0;
    // 成型度 >= 0.35 判定为明显走该流派，线性暗增至最高 +20%（0.20）封顶
    boosts[k] = s < 0.35 ? 0 : Math.min(ARCHETYPE_HIDDEN_BOOST_MAX, ((s - 0.35) / 0.85) * ARCHETYPE_HIDDEN_BOOST_MAX);
  }
  return boosts;
}

function getItemArchetypeWeightMul(it, boosts = null) {
  if (!it || !Array.isArray(it.tags) || !it.tags.length) return 1.0;
  const b = boosts || getArchetypeAffinityBoosts(player);
  let best = 0;
  for (let i = 0; i < it.tags.length; i++) {
    const tg = it.tags[i];
    if (b[tg] && b[tg] > best) best = b[tg];
  }
  return 1 + Math.min(ARCHETYPE_HIDDEN_BOOST_MAX, Math.max(0, best));
}

function getWeaponArchetypeWeightMul(wId, boosts = null) {
  const tpl = WEAPONS[wId];
  if (!tpl) return 1.0;
  const b = boosts || getArchetypeAffinityBoosts(player);
  let best = 0;
  const check = k => { if (b[k] && b[k] > best) best = b[k]; };
  if (tpl.isStaff) check('staff');
  else if (tpl.melee) check('melee');
  else check('ranged');
  if (tpl.set === 'tech' || tpl.deploysTotem) check('tech');
  if (tpl.set === 'elemental') check('elemental');
  if (tpl.set === 'heavy') { check('tank'); check('explosive'); }
  if (tpl.set === 'precise') check('crit');
  return 1 + Math.min(ARCHETYPE_HIDDEN_BOOST_MAX, Math.max(0, best));
}

function pickWeightedWeaponKey(keys, boosts = null) {
  if (!Array.isArray(keys) || !keys.length) return null;
  if (keys.length === 1) return keys[0];
  const b = boosts || getArchetypeAffinityBoosts(player);
  let total = 0;
  const ws = new Array(keys.length);
  for (let i = 0; i < keys.length; i++) {
    const w = getWeaponArchetypeWeightMul(keys[i], b);
    ws[i] = w;
    total += w;
  }
  let r = Math.random() * total;
  for (let i = 0; i < keys.length; i++) {
    r -= ws[i];
    if (r <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}

globalThis.getArchetypeAffinityBoosts = getArchetypeAffinityBoosts;
globalThis.getItemArchetypeWeightMul = getItemArchetypeWeightMul;
globalThis.getWeaponArchetypeWeightMul = getWeaponArchetypeWeightMul;

function getPlayerBuildAffinities() {
  const tags = new Set();
  const b = getArchetypeAffinityBoosts(player);
  for (const k of Object.keys(b)) {
    if (b[k] > 0) tags.add(k);
  }
  return tags;
}

function pickWeightedItem(targetTier, excludeSet = new Set(), checkWaveMin = false, minTierFloor = 1) {
  const floorT = Math.max(1, Math.min(4, minTierFloor || 1));
  const clampedTarget = Math.max(floorT, Math.min(4, targetTier || floorT));
  const tierOrder = [];
  for (let t = clampedTarget; t >= floorT; t--) tierOrder.push(t);
  for (let t = clampedTarget + 1; t <= 4; t++) tierOrder.push(t);
  for (let t = floorT - 1; t >= 1; t--) {
    if (floorT === 1) tierOrder.push(t);
  }

  const isWeaponless = player && player.maxSlots === 0;
  let pool = [];
  for (const t of tierOrder) {
    pool = ITEMS.filter(it => it.tier === t && (!isWeaponless || !it.weaponOnly) && isItemAvailable(it, excludeSet, checkWaveMin));
    if (pool.length > 0) break;
  }
  if (!pool.length && floorT > 1) {
    pool = ITEMS.filter(it => it.tier >= floorT && (!isWeaponless || !it.weaponOnly) && isItemAvailable(it, excludeSet, false));
  }
  if (!pool.length && floorT > 1) {
    pool = ITEMS.filter(it => it.tier >= floorT && isItemAvailable(it, excludeSet, false));
  }
  if (!pool.length) {
    pool = ITEMS.filter(it => (!isWeaponless || !it.weaponOnly) && isItemAvailable(it, excludeSet, false));
  }
  if (!pool.length) {
    pool = ITEMS.filter(it => isItemAvailable(it, excludeSet, false));
  }
  if (!pool.length) return null;

  const recent = (player && player.recentCrateIds) || [];
  const boosts = getArchetypeAffinityBoosts(player);
  let totalW = 0;
  const weights = pool.map(it => {
    const ownedCnt = (player && player.items && player.items[it.id]) || 0;
    const recentPenalty = recent.includes(it.id) ? 2.6 : 0;
    const affinityMul = getItemArchetypeWeightMul(it, boosts);
    const w = affinityMul / (1 + ownedCnt * 1.15 + recentPenalty);
    totalW += w;
    return w;
  });

  let r = Math.random() * totalW;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function recordCrateHistory(itemId) {
  if (!player || !itemId) return;
  if (!Array.isArray(player.recentCrateIds)) player.recentCrateIds = [];
  player.recentCrateIds.push(itemId);
  if (player.recentCrateIds.length > 6) player.recentCrateIds.shift();
}

function buildCrateWeaponChoice(isBossCrate, forcedTier = 0, minTierFloor = 1) {
  if (!player || player.maxSlots <= 0) return null;
  const floorT = Math.max(1, Math.min(4, minTierFloor || 1));
  const rawTier = forcedTier > 0 ? forcedTier : rollCrateTier(wave, player.luck || 0, isBossCrate);
  let wTier = Math.max(floorT, Math.min(4, rawTier));

  const tryTiers = floorT >= 3 ? (wTier === 4 ? [4, 3] : [3, 4]) : [wTier];
  let wKeys = [];
  let chosenTier = wTier;
  let autoReplaceLowest = false;
  for (const candT of tryTiers) {
    const cands = Object.keys(WEAPONS).filter(k => {
      const effT = Math.max(candT, WEAPONS[k].minTier || 1);
      return effT >= floorT && effT <= 4 && (WEAPONS[k].minTier || 1) <= candT && canBuyWeapon(k, effT);
    });
    if (cands.length > 0) {
      wKeys = cands;
      chosenTier = candT;
      break;
    }
  }
  // 当兵装槽已满且全为低阶（无可合成紫/金槽位）时，针对保底紫+试炼秘匣仍强制提供紫/金兵装，拾取时自动熔炼替换最低阶兵装
  if (!wKeys.length && floorT >= 3) {
    wKeys = Object.keys(WEAPONS).filter(k => {
      const effT = Math.max(wTier, WEAPONS[k].minTier || 1);
      return effT >= floorT && effT <= 4 && (WEAPONS[k].minTier || 1) <= wTier;
    });
    chosenTier = wTier;
    autoReplaceLowest = wKeys.length > 0;
  }
  if (!wKeys.length) return null;
  wTier = chosenTier;

  const wBoosts = getArchetypeAffinityBoosts(player);
  let pickedId = pickWeightedWeaponKey(wKeys, wBoosts);
  if (player.weapons.length && Math.random() < 0.44) {
    const mergeCands = wKeys.filter(k => {
      const effT = Math.max(wTier, WEAPONS[k].minTier || 1);
      return player.weapons.some(w => w.id === k && w.tier === effT && w.tier < 5);
    });
    if (mergeCands.length && Math.random() < 0.65) {
      pickedId = pickWeightedWeaponKey(mergeCands, wBoosts);
    }
  }

  const tpl = WEAPONS[pickedId];
  const effTier = Math.min(4, Math.max(floorT, wTier, tpl.minTier || 1));
  const tierMul = WEAPON_TIER_COST_MUL[effTier] || 4.4;
  const crystalMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.77;
  const recycleVal = Math.max(6, Math.round(tpl.cost * tierMul * getShopScale() * 0.48 * crystalMul));
  const canMergeNow = player.weapons.some(w => w.id === pickedId && w.tier === effTier && w.tier < 5);
  return { kind: 'weapon', id: pickedId, tpl, tier: effTier, recycleVal, canMergeNow, autoReplaceLowest };
}

function showCrateMenu() {
  state = 'crate';
  const cm = document.getElementById('crateMenu');
  if (!cm) {
    pendingCrates = 0;
    if (player) {
      player.bossCratesQueued = 0;
      player.mythicCratesQueued = 0;
      player.survivalCratesQueued = 0;
      player.survivalGoldCratesQueued = 0;
    }
    advancePostWave();
    return;
  }
  cm.classList.remove('hidden');
  cm.scrollTop = 0;

  const isMythicCrate = (player.mythicCratesQueued || 0) > 0;
  const isSurvivalGoldCrate = !isMythicCrate && (player.survivalGoldCratesQueued || 0) > 0;
  const isSurvivalCrate = isSurvivalGoldCrate || (!isMythicCrate && (player.survivalCratesQueued || 0) > 0);
  const isBossCrate = isMythicCrate || isSurvivalCrate || (player.bossCratesQueued || 0) > 0;
  const ct = document.getElementById('crateTitle');
  if (ct) {
    const titlePrefix = isMythicCrate
      ? '开启神骸二阶段秘匣 · 必得传说'
      : (isSurvivalGoldCrate
          ? '开启蚀界无瑕圣匣 · 必出紫/金兵装与遗物'
          : (isSurvivalCrate
              ? '开启蚀界渡劫秘匣 · 保底紫色及以上双飨'
              : (isBossCrate ? '开启守誓主宰秘匣' : '开启守誓遗物匣')));
    ct.textContent = `${titlePrefix}（剩余 ${pendingCrates}）`;
  }

  const luck = player.luck || 0;
  const luckF = Math.min(1, Math.max(0, luck) / 95);
  const crystalMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.77;
  const excludeIds = new Set();
  const choices = [];

  // 选项 1：防重复加权战利品道具（神话二阶段宝箱必出 T4 传说；蚀界生存秘匣 100% 保底紫色 T3 史诗或金色 T4 传说！）
  const survivalP4 = (isSurvivalGoldCrate ? 0.42 : 0.20) + luckF * 0.12;
  const t1 = isMythicCrate
    ? 4
    : (isSurvivalCrate ? (Math.random() < survivalP4 ? 4 : 3) : rollCrateTier(wave, luck, isBossCrate));
  const item1 = pickWeightedItem(t1, excludeIds, !(isMythicCrate || isSurvivalCrate), isSurvivalCrate ? 3 : 1);
  if (item1) {
    excludeIds.add(item1.id);
    recordCrateHistory(item1.id);
    choices.push({
      kind: 'item',
      item: item1,
      tier: item1.tier,
      recycleVal: Math.max(6, Math.round(item1.cost * getShopScale() * 0.52 * crystalMul))
    });
  }

  // 选项 2：蚀界生存秘匣 100% 同步提供一把紫色(T3)或金色(T4)兵装（无武器角色则提供第二件紫色/金色遗物）！
  const modeR = Math.random();
  let secondChoice = null;
  if (isSurvivalCrate) {
    const wpnTier = Math.random() < survivalP4 ? 4 : 3;
    if (player.maxSlots > 0) {
      secondChoice = buildCrateWeaponChoice(true, wpnTier, 3);
    }
    if (!secondChoice) {
      const item2 = pickWeightedItem(wpnTier, excludeIds, false, 3);
      if (item2) {
        excludeIds.add(item2.id);
        recordCrateHistory(item2.id);
        secondChoice = {
          kind: 'item',
          item: item2,
          tier: item2.tier,
          recycleVal: Math.max(8, Math.round(item2.cost * getShopScale() * 0.52 * crystalMul))
        };
      }
    }
  } else if (isMythicCrate) {
    const item2 = pickWeightedItem(4, excludeIds, false, 4);
    if (item2 && item2.tier === 4 && Math.random() < 0.65) {
      excludeIds.add(item2.id);
      recordCrateHistory(item2.id);
      secondChoice = {
        kind: 'item',
        item: item2,
        tier: 4,
        recycleVal: Math.max(12, Math.round(item2.cost * getShopScale() * 0.55 * crystalMul))
      };
    } else {
      secondChoice = {
        kind: 'supply',
        supply: {
          id: 'sup_mythic_dragon', name: '神话真红神髓', icon: '🐉', tier: 4, cost: 72,
          desc: '【二阶段神话秘宝】全体伤害永久 +22%，暴击伤害 +45%，并立即回满全部生命！',
          apply: p => { p.dmgMul += 0.22; p.critDmg = (p.critDmg || 0) + 0.45; p.hp = p.maxHp; }
        },
        tier: 4,
        recycleVal: Math.max(16, Math.round(42 * getShopScale() * crystalMul))
      };
    }
  } else if (player.maxSlots > 0 && modeR < 0.42) {
    secondChoice = buildCrateWeaponChoice(isBossCrate);
  } else if (modeR < 0.76 && typeof CRATE_SUPPLIES !== 'undefined' && CRATE_SUPPLIES.length > 0) {
    const sup = CRATE_SUPPLIES[Math.floor(Math.random() * CRATE_SUPPLIES.length)];
    secondChoice = {
      kind: 'supply',
      supply: sup,
      tier: sup.tier || 2,
      recycleVal: Math.max(7, Math.round((sup.cost || 28) * getShopScale() * 0.50 * crystalMul))
    };
  }
  if (!secondChoice) {
    const t2 = isSurvivalCrate ? 3 : rollCrateTier(wave, luck, isBossCrate);
    const item2 = pickWeightedItem(t2, excludeIds, !isSurvivalCrate, isSurvivalCrate ? 3 : 1);
    if (item2) {
      excludeIds.add(item2.id);
      recordCrateHistory(item2.id);
      secondChoice = {
        kind: 'item',
        item: item2,
        tier: item2.tier,
        recycleVal: Math.max(6, Math.round(item2.cost * getShopScale() * 0.52 * crystalMul))
      };
    }
  }
  if (secondChoice) choices.push(secondChoice);
  if (!choices.length) {
    // 极端深无尽全唯一道具拿满时的兜底补给核，彻底杜绝开箱界面无选项卡死
    const fbSup = (typeof CRATE_SUPPLIES !== 'undefined' && CRATE_SUPPLIES.length > 0)
      ? CRATE_SUPPLIES[Math.floor(Math.random() * CRATE_SUPPLIES.length)]
      : { id: 'sup_fallback_core', name: '超载能量晶核', icon: '⚡', tier: 3, cost: 36, desc: '全体伤害永久 +10%，最大生命 +6，并恢复满状态！', apply: p => { p.dmgMul += 0.10; p.maxHp += 6; p.hp = p.maxHp; } };
    choices.push({
      kind: 'supply',
      supply: fbSup,
      tier: Math.max(isSurvivalCrate ? 3 : 1, fbSup.tier || 3),
      recycleVal: Math.max(10, Math.round((fbSup.cost || 32) * getShopScale() * 0.55 * crystalMul))
    });
  }

  const consumeCrate = () => {
    if ((player.crateMatBonus || 0) > 0) {
      player.mats += player.crateMatBonus;
    }
    if (isMythicCrate && player.mythicCratesQueued > 0) player.mythicCratesQueued--;
    else if (isSurvivalGoldCrate && player.survivalGoldCratesQueued > 0) player.survivalGoldCratesQueued--;
    else if (isSurvivalCrate && player.survivalCratesQueued > 0) player.survivalCratesQueued--;
    else if (isBossCrate && player.bossCratesQueued > 0) player.bossCratesQueued--;
    pendingCrates--;
    syncSetHp();
    advancePostWave();
  };

  _syncChoiceStandee('crateHeroStandee', 'RELIC RELIQUARY · 主宰秘匣抉择', 'crateVistaBg', 'crateMat');
  const box = document.getElementById('crateBox');
  box.innerHTML = '';
  box.classList.toggle('single', choices.length <= 1);
  _selectedCrateIdx = 0;
  _crateTakeHandlers = [];
  _crateRecycleHandlers = [];
  _crateRecycleVals = [];
  const setB = getSetBonuses();

  const syncCrateSel = nextIdx => {
    _selectedCrateIdx = Math.max(0, Math.min(choices.length - 1, nextIdx));
    Array.from(box.children).forEach((ch, ci) => ch.classList.toggle('is-sel', ci === _selectedCrateIdx));
    const meltBtn = document.getElementById('crateMeltBtn');
    if (meltBtn) {
      const rv = _crateRecycleVals[_selectedCrateIdx] || 0;
      meltBtn.textContent = `♻️ 熔炼折现 +◇${rv}`;
    }
  };

  choices.forEach((c, idx) => {
    const el = document.createElement('div');
    el.className = `p5-row t${c.tier}${idx === 0 ? ' is-sel' : ''}`;
    let icon = '🏮', title = '', descTxt = '', footBadgeTxt = '', footReady = false, onFootClick = '';

    if (c.kind === 'item') {
      const it = c.item;
      const ownedCnt = (player.items && player.items[it.id]) || 0;
      icon = _itmEmblem(it, it.tier);
      title = it.name;
      descTxt = it.desc;
      footBadgeTxt = ownedCnt > 0 ? `🏺 ${TIER_NAMES[it.tier]}圣遗物 · 已持有 ×${ownedCnt}` : `🏺 ${TIER_NAMES[it.tier]}圣遗物 · 点此查阅词条`;
      footReady = it.tier >= 3;
      onFootClick = `event.stopPropagation();openShopRelicModal('${it.id}')`;
    } else if (c.kind === 'weapon') {
      const tpl = c.tpl;
      const sDef = SET_DEFS[tpl.set];
      const setLabel = (sDef && sDef.label) || '随身兵装';
      const curCnt = (setB && setB.counts && tpl.set) ? (setB.counts[tpl.set] || 0) : 0;
      const nextStep = sDef ? (sDef.steps.find(s => s > curCnt) || sDef.steps[2]) : 2;
      const willHit = sDef && (curCnt + 1 === nextStep) && curCnt < nextStep;
      icon = _wpnEmblem(c.id, c.tier, '', tpl.icon);
      title = _wpnDispName(c.id, c.tier);
      descTxt = tpl.desc;
      footReady = !!(c.canMergeNow || willHit);
      footBadgeTxt = c.canMergeNow
        ? `${setLabel} (${curCnt}/${nextStep}) · ${c.tier === 4 ? '拾取觉醒5阶神话!' : '可直接共鸣升阶!'}`
        : `${setLabel} (${curCnt}/${nextStep})${willHit ? ' ➔ 凑齐激活!' : ''}`;
      onFootClick = tpl.set ? `event.stopPropagation();openShopSynergyModal('${tpl.set}')` : '';
    } else if (c.kind === 'supply') {
      const sup = c.supply;
      icon = _itmEmblem(sup, c.tier);
      title = sup.name;
      descTxt = sup.desc;
      footBadgeTxt = '✨ 魂灯秘髓补给 · 即刻生效';
      footReady = true;
    }
    _crateRecycleVals[idx] = c.recycleVal || 0;

    el.innerHTML = `
      <div class="p5-ico-edge"><div class="p5-ico-inner">${icon}</div></div>
      <div class="p5-notch" aria-hidden="true"></div>
      <div class="p5-bar-edge">
        <div class="p5-bar-fill">
          <div class="p5-bar-top">
            <div class="p5-title-group">
              <span class="p5-bar-title" title="${title}">${title}</span>
              ${_rarityPill(c.tier)}
            </div>
            <div class="p5-bar-right">
              ${c.kind === 'item' ? `<button type="button" class="p5-detail-mini" onclick="event.stopPropagation();openShopRelicModal('${c.item.id}')">详情</button>` : (c.kind === 'weapon' && c.tpl && c.tpl.set ? `<button type="button" class="p5-detail-mini" onclick="event.stopPropagation();openShopSynergyModal('${c.tpl.set}')">羁绊</button>` : '')}
              <span class="sr-contract-hidden">
                <button type="button" class="take-btn">收归</button>
                <button type="button" class="recycle-btn">熔炼</button>
              </span>
            </div>
          </div>
          <div class="p5-bar-cat">${descTxt}</div>
          <div class="p5-bar-foot">
            <span class="bar-prog-badge${footReady ? ' ready' : ''}" ${onFootClick ? `onclick="${onFootClick}"` : ''}>${footBadgeTxt}</span>
          </div>
        </div>
      </div>`;

    const doTake = () => {
      if (c.kind === 'item') {
        player.items[c.item.id] = (player.items[c.item.id] || 0) + 1;
        c.item.apply(player);
        logInfo('CRATE', `收下战利品道具 ${c.item.name} (T${c.tier}${isBossCrate ? ', 首领箱' : ''})`);
      } else if (c.kind === 'weapon') {
        if (!canBuyWeapon(c.id, c.tier) && player.weapons.length >= player.maxSlots && player.weapons.length > 0) {
          let lowIdx = 0;
          for (let wi = 1; wi < player.weapons.length; wi++) {
            if ((player.weapons[wi].tier || 1) < (player.weapons[lowIdx].tier || 1)) lowIdx = wi;
          }
          const oldW = player.weapons[lowIdx];
          const oldTpl = oldW && WEAPONS[oldW.id];
          const oldMul = WEAPON_TIER_COST_MUL[(oldW && oldW.tier) || 1] || 1;
          const refund = oldTpl ? Math.max(4, Math.round(oldTpl.cost * oldMul * getShopScale() * 0.35)) : 4;
          player.mats += refund;
          player.weapons.splice(lowIdx, 1);
          if (player) player._sbCache = null;
        }
        addOrMergeWeapon(c.id, c.tier);
        logInfo('CRATE', `收下空投武器 ${_wpnDispName(c.id, c.tier)} Lv.${c.tier}`);
      } else if (c.kind === 'supply') {
        c.supply.apply(player, wave);
        logInfo('CRATE', `激活战术补给 ${c.supply.name}`);
      }
      syncSetHp();
      beep(660, 0.09, 'triangle');
      consumeCrate();
    };
    const doRecycle = () => {
      player.mats += c.recycleVal;
      beep(480, 0.07, 'sine');
      logInfo('CRATE', `熔炼补给 ${title} (+${c.recycleVal}💎)`);
      consumeCrate();
    };
    _crateTakeHandlers[idx] = doTake;
    _crateRecycleHandlers[idx] = doRecycle;
    el.querySelector('.take-btn').onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); doTake(); };
    el.querySelector('.recycle-btn').onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); doRecycle(); };
    el.onclick = () => {
      if (_selectedCrateIdx === idx) { doTake(); return; }
      beep(510, 0.035, 'triangle', 0.03);
      syncCrateSel(idx);
    };
    box.appendChild(el);
  });
  syncCrateSel(0);
}

let _selectedEvoIdx = 0, _evoPickHandlers = [];
let _selectedCrateIdx = 0, _crateTakeHandlers = [], _crateRecycleHandlers = [], _crateRecycleVals = [];
let _selectedLvlIdx = 0, _lvlPickHandlers = [], _lvlRerollCount = 0;

function confirmSelectedEvolution() {
  const fn = _evoPickHandlers[_selectedEvoIdx] || _evoPickHandlers[0];
  if (typeof fn === 'function') fn();
}
function takeSelectedCrateChoice() {
  const fn = _crateTakeHandlers[_selectedCrateIdx] || _crateTakeHandlers[0];
  if (typeof fn === 'function') fn();
}
function recycleSelectedCrateChoice() {
  const fn = _crateRecycleHandlers[_selectedCrateIdx] || _crateRecycleHandlers[0];
  if (typeof fn === 'function') fn();
}
function _calcLvlRerollCost() {
  if (!player) return 6;
  if (typeof freeRerollsLeft !== 'undefined' && freeRerollsLeft > 0) return 0;
  const base = Math.max(4, Math.round(5 * (1 + Math.max(0, wave - 1) * 0.14) + _lvlRerollCount * 3));
  return calcDiscountedShopCost(base, 2);
}
function confirmSelectedLevelUp() {
  const fn = _lvlPickHandlers[_selectedLvlIdx] || _lvlPickHandlers[0];
  if (typeof fn === 'function') fn();
}
function rerollLevelUpChoices() {
  if (state !== 'levelup' || !player) return;
  const cost = _calcLvlRerollCost();
  if (cost > 0 && player.mats < cost) {
    beep(220, 0.06, 'sawtooth', 0.04);
    return;
  }
  if (cost === 0 && typeof freeRerollsLeft !== 'undefined' && freeRerollsLeft > 0) {
    freeRerollsLeft--;
  } else if (cost > 0) {
    player.mats -= cost;
    _lvlRerollCount++;
  }
  beep(460, 0.05, 'triangle', 0.04);
  _renderLevelUpPool();
}

function _renderLevelUpPool() {
  _syncChoiceStandee('lvlHeroStandee', `SOUL RESONANCE · Lv.${player ? player.lv : 1} 魂灯晋升共鸣`, 'lvlVistaBg', 'lvlMat');
  const topLbl = document.getElementById('lvlTopLabel');
  if (topLbl) topLbl.textContent = `✦ 魂灯晋升 · Lv.${player ? player.lv : 1}`;
  const titleEl = document.getElementById('lvlTitle');
  if (titleEl) {
    titleEl.textContent = pendingLevels > 1 ? `择一铭刻共鸣（余 ${pendingLevels} 次）` : '择一铭刻共鸣';
  }
  const rBtn = document.getElementById('lvlRerollBtn');
  if (rBtn && player) {
    const rCost = _calcLvlRerollCost();
    rBtn.textContent = rCost === 0 ? `↻ 免费重铸 (${freeRerollsLeft})` : `↻ 重铸刻印 · ◇${rCost}`;
    rBtn.disabled = rCost > 0 && player.mats < rCost;
  }
  const pool = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 4);
  const box = document.getElementById('lvlCards');
  box.innerHTML = '';
  _selectedLvlIdx = 0;
  _lvlPickHandlers = [];
  const syncLvlSel = nextIdx => {
    _selectedLvlIdx = Math.max(0, Math.min(pool.length - 1, nextIdx));
    Array.from(box.children).forEach((ch, ci) => ch.classList.toggle('is-sel', ci === _selectedLvlIdx));
  };
  pool.forEach((u, idx) => {
    const uTier = u.tier || 2;
    const el = document.createElement('div');
    el.className = `p5-row t${uTier}${idx === 0 ? ' is-sel' : ''}`;
    const plainScope = (u.scopeLabel || '').trim();
    const footTxt = plainScope || '✦ 魂灯全局共鸣刻印';
    el.innerHTML = `
      <div class="p5-ico-edge"><div class="p5-ico-inner">${u.icon}</div></div>
      <div class="p5-notch" aria-hidden="true"></div>
      <div class="p5-bar-edge">
        <div class="p5-bar-fill">
          <div class="p5-bar-top">
            <div class="p5-title-group">
              <span class="p5-bar-title" title="${u.name}">${u.name}</span>
              ${_rarityPill(uTier)}
            </div>
            <div class="sr-contract-hidden"><button type="button" class="lvl-pick-btn">铭刻</button></div>
          </div>
          <div class="p5-bar-cat">${u.desc}</div>
          <div class="p5-bar-foot"><span class="bar-prog-badge ready">${footTxt}</span></div>
        </div>
      </div>`;
    const pick = () => {
      u.apply(player); syncSetHp(); beep(580, 0.07, 'triangle');
      logInfo('LEVELUP', `选择强化 ${u.name} (Lv.${player.lv})`);
      pendingLevels--;
      advancePostWave();
    };
    _lvlPickHandlers[idx] = pick;
    el.querySelector('button').onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); pick(); };
    el.onclick = () => {
      if (_selectedLvlIdx === idx) { pick(); return; }
      beep(510, 0.035, 'triangle', 0.03);
      syncLvlSel(idx);
    };
    box.appendChild(el);
  });
  syncLvlSel(0);
}

function showLevelUp() {
  state = 'levelup';
  _lvlRerollCount = 0;
  const lm = document.getElementById('levelMenu');
  lm.classList.remove('hidden');
  lm.scrollTop = 0;
  _renderLevelUpPool();
}

// 商店波次通胀系数（严密对齐精简后期怪量后的单波晶石收益，保证 D0~D5 每波稳定购置与合成装备）
function getShopScale() {
  const endlessMul = wave > MAX_WAVE ? Math.pow(1.16, wave - MAX_WAVE) : 1;
  return (1 + (wave - 1) * 0.18 + Math.pow(Math.max(0, wave - 1), 1.22) * 0.028) * endlessMul * (diff.shopTax || 1);
}

let rerollRawCost = 1;

function calcDiscountedShopCost(rawCost, minFloor = 2) {
  const base = Math.max(minFloor, Math.round(rawCost || 0));
  const disc = Math.min(0.40, Math.max(0, (player && player.shopDiscount) || 0));
  if (disc <= 0.001) return base;
  const stacks = Math.max(1, Math.round(disc / 0.10));
  const discounted = Math.min(base - stacks, Math.floor(base * (1 - disc) + 1e-6));
  return Math.max(minFloor, discounted);
}

function syncShopOfferDiscounts() {
  if (Array.isArray(shopOffers)) {
    for (let i = 0; i < shopOffers.length; i++) {
      const o = shopOffers[i];
      if (!o) continue;
      if (!Number.isFinite(o.rawCost) || o.rawCost <= 0) {
        o.rawCost = Math.max(2, o.cost || 2);
      }
      o.cost = calcDiscountedShopCost(o.rawCost, 2);
    }
  }
  if (freeRerollsLeft > 0) {
    rerollCost = 0;
  } else {
    const rawReroll = Math.max(1, Number.isFinite(rerollRawCost) ? rerollRawCost : rerollBase);
    rerollCost = calcDiscountedShopCost(rawReroll, 1);
  }
}

function rollOffers() {
  const locked = shopOffers.filter(o => o && o.locked);
  const wKeys = Object.keys(WEAPONS);
  const usedItems = new Set(locked.filter(o => o.kind === 'item').map(o => o.item.id));
  const shopScale = getShopScale();
  const luck = player.luck || 0;
  let guard = 0;
  while (locked.length < 4 && guard++ < 40) {
    const isWeapon = player.maxSlots > 0 && Math.random() < 0.54;
    const tier = rollShopTier(wave, luck);

    if (isWeapon) {
      const validW = wKeys.filter(k => (WEAPONS[k].minTier || 1) <= tier);
      if (!validW.length) continue;
      const wBoosts = getArchetypeAffinityBoosts(player);
      // 结合流派倾向隐藏暗增（最高 +20%）与同名未满阶合成保底，既尊重流派成型又不锁死刷池
      let id = pickWeightedWeaponKey(validW, wBoosts);
      if (player.weapons.length && Math.random() < 0.30) {
        const upgradable = player.weapons.filter(w => w.tier < 5 && validW.includes(w.id));
        if (upgradable.length) {
          id = upgradable[Math.floor(Math.random() * upgradable.length)].id;
        }
      }
      const tpl = WEAPONS[id];
      const effTier = Math.max(tier, tpl.minTier || 1);
      const tierMul = WEAPON_TIER_COST_MUL[effTier] || 4.4;
      const rawCost = Math.max(2, Math.round(tpl.cost * tierMul * shopScale));
      const cost = calcDiscountedShopCost(rawCost, 2);
      locked.push({ kind: 'weapon', id, tier: effTier, rawCost, cost, locked: false });
    } else {
      const it = pickWeightedItem(tier, usedItems, true);
      if (!it) continue;
      usedItems.add(it.id);
      const ownedCnt = (player.items && player.items[it.id]) || 0;
      const rawCost = Math.max(2, Math.round(it.cost * shopScale * (1 + ownedCnt * 0.22)));
      const cost = calcDiscountedShopCost(rawCost, 2);
      locked.push({ kind: 'item', item: it, tier: it.tier, rawCost, cost, locked: false });
    }
  }
  // 前 1~3 层开荒平滑保底：若 4 个槽位全部未出现武器或 T1 通用/经济遗物，将末位柔和保底为 T1 经济/通用遗物
  if (wave <= 3 && locked.length === 4 && !locked.some(o => o && (o.locked || o.kind === 'weapon' || (o.item && o.item.tier === 1 && Array.isArray(o.item.tags) && (o.item.tags.includes('econ') || o.item.tags.includes('general')))))) {
    const econPool = ITEMS.filter(it => it.tier === 1 && Array.isArray(it.tags) && (it.tags.includes('econ') || it.tags.includes('general')) && isItemAvailable(it, usedItems, true));
    if (econPool.length > 0) {
      const pick = econPool[Math.floor(Math.random() * econPool.length)];
      const ownedCnt = (player.items && player.items[pick.id]) || 0;
      const rawCost = Math.max(2, Math.round(pick.cost * shopScale * (1 + ownedCnt * 0.22)));
      locked[3] = { kind: 'item', item: pick, tier: 1, rawCost, cost: calcDiscountedShopCost(rawCost, 2), locked: false };
    }
  }
  shopOffers = locked;
  syncShopOfferDiscounts();
}

function openShop(fresh) {
  state = 'shop';
  confirmSellIdx = -1;
  if (typeof closeWeaponSlotModal === 'function') closeWeaponSlotModal(true);
  syncSetHp();
  if (fresh) {
    if (typeof SpireAudio !== 'undefined' && SpireAudio && SpireAudio.phase2Active) {
      SpireAudio.syncScene((typeof curScene !== 'undefined' && curScene && curScene.id) || SpireAudio.activeSceneId, false);
    }
    survivalTrialQueued = false;
    // 跨波累进刷新定价：首店 1💎 起刷，每次付费刷新固定 +2💎；仅第 3 / 6 / 9 / 12 四大回合整备降低 50%（×0.50），其余回合降低 20%（×0.80，保底 1💎）
    freeRerollsLeft = player.freeRerolls || 0;
    rerollStep = typeof SHOP_REROLL_STEP === 'number' ? SHOP_REROLL_STEP : 2;
    const initCost = typeof SHOP_REROLL_INIT_COST === 'number' ? SHOP_REROLL_INIT_COST : 1;
    const recMul = typeof getShopRerollRecoveryMul === 'function'
      ? getShopRerollRecoveryMul(wave)
      : ((wave === 3 || wave === 6 || wave === 9 || wave === 12) ? 0.50 : 0.80);
    if ((player.shopVisits || 0) === 0) {
      rerollRawCost = initCost;
    } else {
      const prevRaw = Math.max(initCost, Number.isFinite(player.shopRerollRaw) ? player.shopRerollRaw : (Number.isFinite(rerollRawCost) ? rerollRawCost : initCost));
      rerollRawCost = Math.max(initCost, Math.round(prevRaw * recMul));
    }
    rerollBase = rerollRawCost;
    player.shopRerollRaw = rerollRawCost;
    player.shopVisits = (player.shopVisits || 0) + 1;
    rerollCost = freeRerollsLeft > 0 ? 0 : calcDiscountedShopCost(rerollRawCost, 1);
    anvilUpgradedMsg = '';
    if (player.hasAnvil && player.weapons.length > 0) {
      const upgradable = player.weapons.filter(w => w.tier < 5);
      if (upgradable.length > 0) {
        const uw = upgradable[Math.floor(Math.random() * upgradable.length)];
        uw.tier++;
        if (player) player._sbCache = null;
        syncSetHp();
        const uwName = _wpnDispName(uw);
        anvilUpgradedMsg = ` · ⚒️ 神砧免费升阶【${uwName}】!`;
        logInfo('SHOP', `铁匠神砧自动升阶 ${uwName} -> Lv.${uw.tier}`);
      }
    }
    mobDrawerOpen = false;
    shopHubTab = 'shop';
    rollOffers();
  }
  const sm = document.getElementById('shopMenu');
  sm.classList.toggle('drawer-open', mobDrawerOpen);
  const arr = document.getElementById('mobDrawerArrow');
  if (arr) arr.textContent = mobDrawerOpen ? '收起 ▴' : '详情 ▾';
  sm.classList.remove('hidden');
  sm.scrollTop = 0;
  renderShop();
  checkPendingWeaponEvolutions();
}

function canBuyWeapon(id, tier) {
  if (player.maxSlots <= 0) return false;
  if (player.weapons.length < player.maxSlots) return true;
  return player.weapons.some(w => w.id === id && w.tier === tier && w.tier < 5);
}

function addOrMergeWeapon(id, tier) {
  const safeT = Math.min(5, Math.max(1, tier | 0));
  const matchIdx = safeT < 5 ? player.weapons.findIndex(w => w.id === id && w.tier === safeT && w.tier < 5) : -1;
  if (matchIdx !== -1 && player.weapons.length >= player.maxSlots) {
    player.weapons.splice(matchIdx, 1);
    addOrMergeWeapon(id, safeT + 1);
    return;
  }
  player.weapons.push(makeWeapon(id, safeT));
  if (player) player._sbCache = null;
  syncSetHp();
}

function mergeSlot(idx) {
  const w = player.weapons[idx];
  if (!w || w.tier >= 5) return false;
  const other = player.weapons.findIndex((x, i) => i !== idx && x.id === w.id && x.tier === w.tier);
  if (other === -1) return false;
  w.tier++;
  player.weapons.splice(other, 1);
  if (player) player._sbCache = null;
  syncSetHp();
  beep(w.tier >= 5 ? 860 : 760, 0.11, 'triangle');
  checkPendingWeaponEvolutions();
  return true;
}

function buyOffer(i) {
  const o = shopOffers[i];
  if (!o || !player || player.mats < o.cost) return false;
  if (typeof closeWeaponSlotModal === 'function') closeWeaponSlotModal(true);
  if (o.kind === 'weapon') {
    const tpl = WEAPONS[o.id];
    if (!tpl || !canBuyWeapon(o.id, o.tier)) return false;
    confirmSellIdx = -1;
    player.mats -= o.cost;
    addOrMergeWeapon(o.id, o.tier);
    logInfo('SHOP', `购入武器 ${tpl.name} Lv.${o.tier} (-${o.cost}💎, 剩余=${player.mats}💎)`);
    shopOffers[i] = null;
    syncShopOfferDiscounts();
    beep(520, 0.07, 'triangle');
    renderShop();
    checkPendingWeaponEvolutions();
    return true;
  }
  const it = o.item;
  if (!it) return false;
  confirmSellIdx = -1;
  player.mats -= o.cost;
  player.items[it.id] = (player.items[it.id] || 0) + 1;
  it.apply(player);
  if (it.id === 'recycler') {
    freeRerollsLeft++;
    rerollCost = 0;
  }
  syncSetHp();
  logInfo('SHOP', `购入道具 ${it.name} (-${o.cost}💎, 剩余=${player.mats}💎)`);
  shopOffers[i] = null;
  syncShopOfferDiscounts();
  beep(520, 0.07, 'triangle');
  renderShop();
  return true;
}

function _renderWeaponSlotGrid(containerEl, isOverview) {
  if (!containerEl || !player) return;
  containerEl.innerHTML = '';
  if (player.maxSlots === 0) return;
  const isMobPortrait = !isOverview && typeof uiMode !== 'undefined' && uiMode === 'mobile-portrait';
  const miniPillCls = isMobPortrait ? 'mini' : '';
  player.weapons.forEach((w, idx) => {
    const tpl = WEAPONS[w.id];
    if (!tpl) return;
    const hasPair = w.tier < 5 && player.weapons.some((x, j) => j !== idx && x.id === w.id && x.tier === w.tier);
    const needsEvo = w.tier >= 5 && !w.evo && Array.isArray(tpl.evos) && tpl.evos.length >= 2;
    const activeEvoObj = (w.evo && Array.isArray(tpl.evos)) ? tpl.evos.find(ev => ev.id === w.evo) : null;
    const dispName = _wpnDispName(w);
    const shortName = dispName.includes('·') ? dispName.split('·').pop() : (dispName.length > 5 && isMobPortrait ? dispName.slice(0, 4) : dispName);
    const liveDmg = typeof calcWeaponPreviewDmg === 'function'
      ? calcWeaponPreviewDmg(w.id, tpl, w.tier, activeEvoObj)
      : Math.round(tpl.dmg * (1 + (w.tier - 1) * 0.55) * getEffectiveDmgMul());
    const sellVal = typeof getWeaponSellPrice === 'function' ? getWeaponSellPrice(w) : Math.max(4, Math.round(12 * w.tier));
    const sLabel = SET_DEFS[tpl.set] ? SET_DEFS[tpl.set].label.replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, '') : '';
    const d = document.createElement('button');
    d.type = 'button';
    d.className = `nw-slot t${w.tier}${(hasPair || needsEvo) ? ' mergeable' : ''}${selectedWeaponSlotIdx === idx ? ' is-selected' : ''}`;
    const mergePillHtml = needsEvo
      ? '<i class="nw-merge-pill">觉醒!</i>'
      : (hasPair ? `<i class="nw-merge-pill">${w.tier === 4 ? '升5阶' : '可合'}</i>` : '');
    const deskTagTxt = needsEvo ? '★ 觉醒' : (hasPair ? '✦ 合阶' : `◇${sellVal}`);
    d.innerHTML = `
      <div class="nw-slot-in">
        <span class="nw-ico">${_wpnEmblem(w.id, w.tier, w.evo || '', tpl.icon)}</span>
        <div class="nw-info">
          <div class="nw-name-row">
            <span class="nw-name nw-full-name" title="${dispName}">${isMobPortrait ? shortName : dispName}</span>
            ${_rarityPill(w.tier, miniPillCls)}
          </div>
          <span class="nw-meta">${sLabel}·${w.tier}阶<em class="nw-desk-stat"> · 威力${liveDmg}</em>${mergePillHtml}</span>
        </div>
        <span class="nw-desk-tag">${deskTagTxt}</span>
      </div>`;
    d.onclick = () => { openWeaponSlotModal(idx); };
    containerEl.appendChild(d);
  });
  const showMax = Math.max(player.weapons.length, Math.min(player.maxSlots, 6));
  for (let k = player.weapons.length; k < showMax; k++) {
    const emp = document.createElement('div');
    emp.className = 'nw-slot empty';
    emp.innerHTML = `<div class="nw-slot-in">+ 空槽 ${k + 1}</div>`;
    containerEl.appendChild(emp);
  }
}

function _renderShopOverviewPane(floorBadgeTxt, mergePairs) {
  if (!player) return;
  const heroCard = document.getElementById('ovHeroCard');
  const setB = getSetBonuses();
  if (heroCard) {
    const clsObj = (typeof CLASSES !== 'undefined' && Array.isArray(CLASSES)) ? CLASSES.find(c => c.id === player.cls) : null;
    const bustUrl = typeof getHeroUiBustUrl === 'function' ? getHeroUiBustUrl(player.cls) : '';
    const traitsTxt = clsObj && Array.isArray(clsObj.traits) ? clsObj.traits.slice(0, 2).join(' · ') : '';
    const synPills = Object.entries(SET_DEFS).map(([key, def]) => {
      const c = (setB.counts && setB.counts[key]) || 0;
      if (c <= 0) return '';
      const nextStep = def.steps.find(s => s > c) || def.steps[2];
      const active = c >= def.steps[0];
      return `<button type="button" class="ov-syn-pill${active ? ' active' : ''}" onclick="openShopSynergyModal('${key}')">${def.label} ${c}/${nextStep}</button>`;
    }).filter(Boolean).join('');
    heroCard.innerHTML = `
      <div class="ov-hero-row">
        ${bustUrl ? `<div class="ov-bust-wrap"><img src="${bustUrl}" alt="${clsObj ? clsObj.name : '角色立绘'}"></div>` : ''}
        <div class="ov-hero-info">
          <div class="ov-hero-name-row">
            <span class="ov-hero-name">${clsObj ? clsObj.name : '提灯人·零'}</span>
            <span class="ov-lvl-badge">Lv.${player.lv} · ${floorBadgeTxt}</span>
          </div>
          ${traitsTxt ? `<div style="font-size:11.5px;color:#cfd5e4">${traitsTxt}</div>` : ''}
          <div style="font-size:11px;color:var(--p5-gold);margin-top:2px">✦ 已装备流派羁绊（点按查看激活阈值）：</div>
          <div class="ov-syn-wrap">${synPills || '<span style="font-size:11px;color:#9aa2b4">暂未装备流派兵装</span>'}</div>
        </div>
      </div>`;
  }

  const ovWpnTitle = document.getElementById('ovWpnTitle');
  if (ovWpnTitle) {
    ovWpnTitle.textContent = `⚔️ 随身主武器 (${player.weapons.length}/${player.maxSlots}) · 点槽直接合成/回收`;
  }
  const ovQm = document.getElementById('ovQuickMergeBtn');
  if (ovQm) {
    ovQm.classList.toggle('hidden', mergePairs <= 0);
    ovQm.textContent = `✦ 一键合阶 (${mergePairs})`;
  }
  _renderWeaponSlotGrid(document.getElementById('ovWeaponSlots'), true);

  const st12El = document.getElementById('ovStats12Grid');
  if (st12El) {
    const arm = getTotalArmor(), mit = Math.round(getArmorMitigation() * 100);
    const dmgPct = Math.round(getEffectiveDmgMul() * 100);
    const aspdScale = typeof PLAYER_ASPD_SCALE === 'number' ? PLAYER_ASPD_SCALE : 0.70;
    const aspdPct = Math.round((player.atkSpd + setB.aspd) * aspdScale * 100);
    const critPct = Math.round(getEffectiveCrit() * 100);
    const critDmgPct = Math.round((typeof getEffectiveCritMult === 'function' ? getEffectiveCritMult() : (1.95 + (player.critDmg || 0) + (setB.critDmg || 0))) * 100);
    const rng = getTotalRangeBonus();
    const dodgePct = Math.round(Math.min(player.dodgeCap || 0.80, Math.max(0, player.dodge || 0)) * 100);
    const spdPct = Math.round(getEffectiveSpdMul() * 100);
    const harv = Math.round(player.harvestFlat || 0);
    const cells = [
      ['生命上限', `${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`, true],
      ['护甲减伤', `${arm} (${mit >= 0 ? '-' : '+'}${Math.abs(mit)}%)`, arm > 0],
      ['生命再生', `${player.regen.toFixed(1)}/s`, false],
      ['猩红汲血', `${Math.round((player.lifesteal || 0) * 100)}%`, (player.lifesteal || 0) > 0],
      ['全体伤害', `${dmgPct}%`, true],
      ['攻击急速', `${aspdPct}%`, aspdPct > 100],
      ['暴击几率', `${critPct}%`, critPct >= 20],
      ['暴击伤害', `${critDmgPct}%`, critDmgPct > 200],
      ['索敌射程', `${rng >= 0 ? '+' + rng : rng}`, false],
      ['灵巧闪避', `${dodgePct}%`, dodgePct >= 20],
      ['移动速度', `${spdPct}%`, false],
      ['幸运/收获', `${player.luck || 0} / ${harv}`, (player.luck || 0) > 0 || harv > 0]
    ];
    st12El.innerHTML = cells.map(([lbl, val, hi]) =>
      `<div class="ov-st-cell${hi ? ' hi' : ''}"><span>${lbl}</span><b>${val}</b></div>`
    ).join('');
  }

  const relicGrid = document.getElementById('ovRelicGrid');
  const relicTitle = document.getElementById('ovRelicTitle');
  if (relicGrid) {
    relicGrid.classList.toggle('cols-2', ovRelicCols === 2);
    relicGrid.classList.toggle('cols-1', ovRelicCols === 1);
    const ownedEntries = [];
    let totalPieces = 0;
    if (player.items && typeof player.items === 'object') {
      for (const [iid, cnt] of Object.entries(player.items)) {
        if (!cnt || cnt <= 0) continue;
        totalPieces += cnt;
        const meta = ITEMS.find(x => x && x.id === iid);
        if (meta) ownedEntries.push({ meta, cnt });
      }
      ownedEntries.sort((a, b) => (b.meta.tier - a.meta.tier) || (b.cnt - a.cnt));
    }
    if (relicTitle) relicTitle.textContent = `🎒 已购记忆遗物 (${totalPieces} 件 · ${ownedEntries.length} 种)`;
    if (!ownedEntries.length) {
      relicGrid.innerHTML = `<div style="grid-column:1/-1;padding:18px;text-align:center;color:#9aa2b4;font-size:12.5px">本局暂未购入记忆遗物 · 可切回【🛒 行商购物】选购圣遗物</div>`;
    } else {
      relicGrid.innerHTML = ownedEntries.map(({ meta, cnt }) => `
        <div class="ov-relic-item" onclick="openShopRelicModal('${meta.id}')" title="点击查看【${meta.name}】完整效果">
          <div class="ov-relic-ico">${_itmEmblem(meta, meta.tier)}</div>
          <div class="ov-relic-txt">
            <div class="ov-relic-row1">
              <div class="ov-relic-name-wrap">
                <span class="ov-relic-name">${meta.name}</span>
                ${cnt > 1 ? `<em class="ov-qty-badge">×${cnt}</em>` : ''}
              </div>
              ${_rarityPill(meta.tier)}
            </div>
            <div class="ov-relic-sub">${meta.desc}</div>
          </div>
        </div>`).join('');
    }
  }
}

function renderShop() {
  syncShopOfferDiscounts();
  renderBuildSummary('statsRow', 'setRow');

  const hudHideEl = document.getElementById('hud');
  if (hudHideEl && state === 'shop') hudHideEl.classList.add('hidden');
  const smEl = document.getElementById('shopMenu');
  if (smEl && smEl.setAttribute) smEl.setAttribute('data-hub-tab', shopHubTab);
  const paneMain = document.getElementById('shopPaneMain');
  const paneOv = document.getElementById('shopPaneOverview');
  if (paneMain && paneMain.classList) paneMain.classList.toggle('is-active', shopHubTab !== 'overview');
  if (paneOv && paneOv.classList) paneOv.classList.toggle('is-active', shopHubTab === 'overview');
  const tabBtnShop = document.getElementById('hubTabShopBtn');
  const tabBtnOv = document.getElementById('hubTabOverviewBtn');
  if (tabBtnShop && tabBtnShop.classList) tabBtnShop.classList.toggle('on', shopHubTab !== 'overview');
  if (tabBtnOv && tabBtnOv.classList) tabBtnOv.classList.toggle('on', shopHubTab === 'overview');

  const bgSceneEl = document.getElementById('shopBgScene');
  if (bgSceneEl && bgSceneEl.style) {
    let sceneBgUrl = '';
    if (shopHubTab === 'overview') {
      const vRel = (typeof curScene !== 'undefined' && curScene && curScene.vistaImg) ? curScene.vistaImg : 'assets/spire/scene_1_vista.jpg';
      sceneBgUrl = (typeof SpireAssets !== 'undefined' && typeof SpireAssets.resolve === 'function') ? SpireAssets.resolve(vRel) : vRel;
    } else if (typeof uiMode !== 'undefined' && uiMode === 'mobile-portrait') {
      const pavRel = 'assets/spire/v2/wind-pavilion.jpg';
      sceneBgUrl = (typeof SpireAssets !== 'undefined' && typeof SpireAssets.resolve === 'function') ? SpireAssets.resolve(pavRel) : pavRel;
    } else {
      sceneBgUrl = typeof getShopQingyuSceneUrl === 'function' ? getShopQingyuSceneUrl() : 'assets/spire/ui_art/ui_shop_qingyu_scene.jpg';
    }
    bgSceneEl.style.backgroundImage = `url('${sceneBgUrl}')`;
  }
  const atmoEl = document.getElementById('shopQingyuAtmo');
  if (atmoEl && atmoEl.style) {
    const qBust = typeof getHeroUiBustUrl === 'function' ? getHeroUiBustUrl('ghost') : 'assets/spire/ui_art/ui_bust_qingyu.png';
    atmoEl.style.backgroundImage = `url('${qBust}')`;
  }

  const witchImgEl = document.getElementById('shopMerchantPortrait');
  const plaqueEl = document.getElementById('shopQingyuPlaque');
  const bindQingyuTalk = el => {
    if (!el || el._chatBound) return;
    el._chatBound = true;
    el.style.cursor = 'pointer';
    const bonusTalks = [
      '雨还没停。先暖暖手，再看看缺什么。',
      '看见地上的预警就先让开。瞬步可以穿过弹雨，但要留一点余地。',
      '同名、同阶的兵装能合在一起。带得趁手，比带得多更要紧。',
      '想留的东西，替它扣上小锁。下次来，我还给你留着。'
    ];
    let talkIdx = 0;
    el.onclick = () => {
      beep(640, 0.05, 'triangle', 0.035);
      const sEl = document.getElementById('shopSub');
      if (sEl) {
        sEl.textContent = bonusTalks[talkIdx % bonusTalks.length];
        talkIdx++;
      }
    };
  };
  if (witchImgEl) {
    witchImgEl.alt = !endlessMode && wave < 15 ? '青羽 · 风亭行商' : '青羽 · 记忆的守望者';
    witchImgEl.title = '与青羽交谈';
    if (typeof SpireAssets !== 'undefined' && typeof SpireAssets.resolve === 'function') {
      const resolvedSrc = SpireAssets.resolve('assets/spire/port_qingyu.jpg');
      if (witchImgEl._resolvedSrc !== resolvedSrc) {
        witchImgEl.src = resolvedSrc;
        witchImgEl._resolvedSrc = resolvedSrc;
      }
    }
    bindQingyuTalk(witchImgEl);
  }
  bindQingyuTalk(plaqueEl);

  const nextFloorNum = wave + 1;
  const nextIsBoss = (nextFloorNum >= 4 && nextFloorNum % 4 === 0);
  const floorBadgeTxt = endlessMode ? `无尽第 ${wave} 层` : `第 ${wave} / ${MAX_WAVE} 层`;
  document.getElementById('shopTitle').textContent = uiMode !== 'desktop'
    ? `${floorBadgeTxt}整备${anvilUpgradedMsg ? ' · 已升阶' : ''}`
    : `${floorBadgeTxt}整备  —  青羽的风语行商（${diff.badge}）`;
  const subEl = document.getElementById('shopSub');
  if (subEl) {
    const storyWhispers = [
      '我叫青羽。做些补给生意，也替人认认遗失的东西。',
      '桥上的雨太凉。带一块干布，灯别淋灭了。',
      '旧编号，不是名字。那块铭牌先收好。',
      '烬羽的剑穗，还是你以前系的样子。别弄丢了。',
      '冰里的人还在呼吸。灯举低一些。',
      '有些声音会让灯自己亮起来。你要留意它照向哪里。',
      '那段曲子还没弹完。见到她，再听一听。',
      '画像是证据。你仔细看她的手，她也怕弄疼你。',
      '这里的钟总往回走。你脚下的路却可以往前。',
      '她不肯让你看手上的裂缝。你看到了，就替她记着。',
      '有些事记不起了，手还会记得。',
      '那道“阻止我”的指令，是你留下的。现在你亲自听见了。',
      '先看清脚下，再去听镜里的声音。',
      '我在这里。门后的话，你可以慢慢想。',
      '四件旧物都在了。进门之前，把我们的约定想完整。',
      '茶快凉了。'
    ];
    const whisper = endlessMode ? '' : storyWhispers[Math.max(0, Math.min(15, wave - 1))];
    subEl.textContent = whisper
      ? `${whisper}${anvilUpgradedMsg}`
      : `${diff.badge}  ·  ${curScene.name}  ·  同名同阶兵装可共鸣升阶${anvilUpgradedMsg}`;
  }
  document.getElementById('shopMat').textContent = `◇ ${player.mats}`;
  const actualReroll = freeRerollsLeft > 0 ? 0 : rerollCost;
  const rerollTxt = actualReroll === 0 ? `↻ 免费刷新 (${freeRerollsLeft})` : `↻ 刷新 (${actualReroll})`;
  const rb = document.getElementById('rerollBtn');
  if (rb) {
    rb.textContent = rerollTxt;
    rb.disabled = player.mats < actualReroll;
  }
  const mrb = document.getElementById('mobRerollBtn');
  if (mrb) {
    mrb.textContent = rerollTxt;
    mrb.disabled = player.mats < actualReroll;
  }

  const canTrial = canOfferSurvivalTrialForWave(nextFloorNum);
  if (!canTrial) survivalTrialQueued = false;
  const trialSec = typeof getSurvivalTrialDuration === 'function' ? getSurvivalTrialDuration(diff) : 30;
  const trialBar = document.getElementById('shopTrialBar');
  if (trialBar) {
    if (!canTrial) {
      trialBar.classList.add('hidden');
      trialBar.classList.remove('is-armed');
      trialBar.innerHTML = '';
    } else {
      trialBar.classList.remove('hidden');
      trialBar.classList.toggle('is-armed', !!survivalTrialQueued);
      const actNum = Math.floor((nextFloorNum - 1) / 4) + 1;
      const actLabel = endlessMode ? `轮回第 ${actNum} 幕限 1 次` : `第 ${actNum} 幕限 1 次`;
      const minGoldComp = calcSurvivalTrialGoldComp(nextFloorNum, 3, player).total;
      const maxGoldComp = calcSurvivalTrialGoldComp(nextFloorNum, 0, player).total;
      const titleTxt = survivalTrialQueued
        ? `🕯️ 已签蚀界契约 · 第 ${nextFloorNum} 层 (${trialSec}s 渡劫)`
        : `🕯️ 蚀界生存试炼 · 第 ${nextFloorNum} 层改为 ${trialSec}s 身法关`;
      const mobTitleTxt = survivalTrialQueued
        ? `🕯️ 已签第${nextFloorNum}层(${trialSec}s) · 奖◇${minGoldComp}~${maxGoldComp}+紫金匣`
        : `🕯️ 蚀界试炼(${trialSec}s身法关) · 奖◇${minGoldComp}~${maxGoldComp}+紫金匣`;
      const btnTxt = survivalTrialQueued ? '✓ 已开启（点此取消）' : '🕯️ 开启试炼';
      const mobBtnTxt = survivalTrialQueued ? '✓ 已开启' : '🕯️ 开启试炼';
      trialBar.innerHTML = `
        <div class="shop-trial-info">
          <div class="shop-trial-desk">
            <div class="shop-trial-head">
              <span class="shop-trial-title">${titleTxt}</span>
              <span class="shop-trial-pill">${actLabel}</span>
              <span class="shop-trial-pill gold">奖 ◇${minGoldComp}~${maxGoldComp} + 必出紫/金秘匣</span>
            </div>
          </div>
          <div class="shop-trial-mob">${mobTitleTxt}</div>
        </div>
        <button type="button" id="shopTrialToggleBtn" class="shop-trial-toggle${survivalTrialQueued ? ' is-armed' : ''}" onclick="toggleSurvivalTrial()"><span class="shop-trial-btn-desk">${btnTxt}</span><span class="shop-trial-btn-mob">${mobBtnTxt}</span></button>`;
    }
  }
  const inlineTrialWrap = document.getElementById('shopInlineTrialWrap');
  const inlineTrialBtn = document.getElementById('shopInlineTrialBtn');
  if (inlineTrialWrap && inlineTrialBtn) {
    inlineTrialWrap.classList.toggle('hidden', !canTrial);
    inlineTrialWrap.classList.toggle('is-armed', !!(canTrial && survivalTrialQueued));
    if (canTrial) {
      inlineTrialBtn.textContent = survivalTrialQueued ? '✓ 已开试炼' : '🕯️ 开启试炼';
      inlineTrialBtn.classList.toggle('is-armed', !!survivalTrialQueued);
    }
  }

  const nextLabel = (canTrial && survivalTrialQueued)
    ? `🕯️ 踏入第 ${nextFloorNum} 层 · 蚀界试炼 (${trialSec}s) →`
    : (!endlessMode && nextFloorNum === 16 ? '准备好了，推开终门 →' : nextIsBoss
        ? `◆ 迎战第 ${nextFloorNum} 层守誓首领 →`
        : `◆ 登往第 ${nextFloorNum} 层 →`);
  const mobDockNextLabel = (canTrial && survivalTrialQueued)
    ? '🕯️ 前往试炼 →'
    : (!endlessMode && nextFloorNum === 16 ? '◆ 推开终门 →' : '◆ 前往下一层 →');
  const dnb = document.getElementById('deskNextBtn');
  if (dnb) {
    dnb.textContent = nextLabel;
    dnb.classList.toggle('btn-trial-go', !!(canTrial && survivalTrialQueued));
  }
  const mnb = document.getElementById('mobNextBtn');
  if (mnb) {
    mnb.textContent = mobDockNextLabel;
    mnb.classList.toggle('btn-trial-go', !!(canTrial && survivalTrialQueued));
  }
  const dockNb = document.getElementById('dockNextBtn');
  const dockNLbl = document.getElementById('dockNextLabel');
  if (dockNb && dockNLbl) {
    dockNLbl.textContent = mobDockNextLabel;
    dockNb.classList.toggle('is-trial-armed', !!(canTrial && survivalTrialQueued));
  }

  const totalRange = getTotalRangeBonus();
  const setB = getSetBonuses();
  const briefEl = document.getElementById('shopBriefStats');
  if (briefEl && player) {
    const armVal = getTotalArmor();
    const dmgPctVal = Math.round(getEffectiveDmgMul() * 100);
    const aspdScaleVal = typeof PLAYER_ASPD_SCALE === 'number' ? PLAYER_ASPD_SCALE : 0.70;
    const aspdPctVal = Math.round((player.atkSpd + setB.aspd) * aspdScaleVal * 100);
    const critPctVal = Math.round(getEffectiveCrit() * 100);
    briefEl.innerHTML = `<div class="sbs-items"><span>生命<b>${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}</b></span><span>护甲<b>${armVal}</b></span><span>伤害<b class="gold">${dmgPctVal}%</b></span><span>攻速<b>${aspdPctVal}%</b></span><span>暴击<b class="gold">${critPctVal}%</b></span></div><span class="sbs-more">行囊总览 ▸</span>`;
  }
  if (typeof window._shopSelOfferIdx !== 'number' || !shopOffers[window._shopSelOfferIdx]) {
    const firstLive = shopOffers.findIndex(Boolean);
    window._shopSelOfferIdx = firstLive >= 0 ? firstLive : 0;
  }
  const box = document.getElementById('shopCards');
  if (box) {
    box.innerHTML = '';
    shopOffers.forEach((o, i) => {
      const el = document.createElement('div');
      if (!o) {
        el.className = 'p5-row sold-out sold-out-row';
        el.innerHTML = `
          <div class="p5-ico-edge"><div class="p5-ico-inner">✓</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge"><div class="p5-bar-fill"><span class="sold-stamp">✓ 已收入行囊</span></div></div>`;
        box.appendChild(el);
        return;
      }
      const offerTier = o.tier || (o.item && o.item.tier) || 1;
      const isRowSel = window._shopSelOfferIdx === i;
      el.className = `p5-row t${offerTier}${isRowSel ? ' is-sel' : ''}${o.locked ? ' is-locked' : ''}`;
      if (o.kind === 'weapon') {
        const wid = o.id || o.weaponId;
        const tpl = WEAPONS[wid];
        if (!tpl) return;
        const dispName = _wpnDispName(wid, offerTier);
        const sDef = SET_DEFS[tpl.set];
        const sLabel = sDef ? sDef.label : '';
        const curCnt = (setB && setB.counts && tpl.set) ? (setB.counts[tpl.set] || 0) : 0;
        const nextStep = sDef ? (sDef.steps.find(s => s > curCnt) || sDef.steps[2]) : 2;
        const willHitStep = sDef && (curCnt + 1 === nextStep) && curCnt < nextStep;
        const dmg = typeof calcWeaponPreviewDmg === 'function'
          ? calcWeaponPreviewDmg(wid, tpl, offerTier, null)
          : Math.round(tpl.dmg * (1 + (offerTier - 1) * 0.55) * getEffectiveDmgMul());
        const effRange = typeof calcWeaponEffectiveRange === 'function'
          ? calcWeaponEffectiveRange(tpl, offerTier, null, totalRange)
          : tpl.range;
        const effCd = (tpl.cd / Math.max(0.18, getEffectiveAtkSpd() * (tpl.isStaff ? (1 + (player.staffHaste || 0)) : 1) * (tpl.spdScale ? (1 + Math.max(0, getEffectiveSpdMul() - 1) * 0.45) : 1) * (1 + (offerTier - 1) * 0.08))).toFixed(2);
        const ok = player.mats >= o.cost && canBuyWeapon(wid, offerTier);
        const hasMergePair = offerTier < 5 && player.weapons.some(w => w.id === wid && w.tier === offerTier);
        const willAwakenT5 = hasMergePair && offerTier === 4;
        const totalShowPellets = (tpl.burstShots ? tpl.burstShots : (tpl.pellets ? tpl.pellets + (!tpl.isStaff && !tpl.melee && !tpl.isFlame ? (player.rangedPelletsBonus || 0) : 0) : 0));
        const pelletsTxt = totalShowPellets > 1 ? `×${totalShowPellets}` : '';
        const priceHtml = (o.rawCost && o.rawCost > o.cost)
          ? `<s style="opacity:.55;font-size:.82em;margin-right:2px">${o.rawCost}</s>◇ ${o.cost}`
          : `◇ ${o.cost}`;
        const synFootTxt = `${sLabel} (${curCnt}/${nextStep})${willAwakenT5 ? ' · 购入觉醒5阶!' : (hasMergePair ? ` · 可直接合阶 T${offerTier + 1}` : (willHitStep ? ' ➔ 凑齐激活!' : ''))}`;

        el.innerHTML = `
          <div class="p5-ico-edge"><div class="p5-ico-inner">${_wpnEmblem(wid, offerTier, '', tpl.icon)}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge">
            <div class="p5-bar-fill">
              <div class="p5-bar-top">
                <div class="p5-title-group">
                  <span class="p5-bar-title" title="${dispName}">${dispName}</span>
                  ${_rarityPill(offerTier)}
                </div>
                <div class="p5-bar-right">
                  <button type="button" class="p5-lock-btn lock${o.locked ? ' is-locked' : ''}" title="${o.locked ? '点击解锁' : '锁定保留至下一层'}">${o.locked ? '🔒' : '🔓'}</button>
                  <button type="button" class="p5-price-tag p5-buy-btn buy${hasMergePair ? ' merge-ready' : ''}" ${ok ? '' : 'disabled'}>${willAwakenT5 ? '觉醒 ' : (hasMergePair ? '合阶 ' : '')}${priceHtml}</button>
                </div>
              </div>
              <div class="p5-bar-subwrap">
                <div class="p5-bar-cat">威力 ${dmg}${pelletsTxt} · 间隔 ${effCd}s · 射程 ${effRange}</div>
                <div class="p5-bar-foot">
                  <span class="bar-prog-badge${(hasMergePair || willHitStep) ? ' ready' : ''}" onclick="event.stopPropagation();openShopSynergyModal('${tpl.set}')">${synFootTxt}</span>
                </div>
              </div>
            </div>
          </div>`;
        el.querySelector('.buy').onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); buyOffer(i); };
        el.onclick = () => {
          window._shopSelOfferIdx = i;
          if (ok) { buyOffer(i); return; }
          renderShop();
        };
      } else {
        const it = o.item;
        if (!it) return;
        const ok = player.mats >= o.cost;
        const ownedCnt = (player.items && player.items[it.id]) || 0;
        const priceHtml = (o.rawCost && o.rawCost > o.cost)
          ? `<s style="opacity:.55;font-size:.82em;margin-right:2px">${o.rawCost}</s>◇ ${o.cost}`
          : `◇ ${o.cost}`;
        const relicHint = ownedCnt > 0 ? `已持有 ×${ownedCnt}` : ((it.scopeLabel || '').trim() || '全流派圣遗物');
        el.innerHTML = `
          <div class="p5-ico-edge"><div class="p5-ico-inner">${_itmEmblem(it, offerTier)}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge">
            <div class="p5-bar-fill">
              <div class="p5-bar-top">
                <div class="p5-title-group">
                  <span class="p5-bar-title" title="${it.name}">${it.name}</span>
                  ${_rarityPill(offerTier)}
                </div>
                <div class="p5-bar-right">
                  <button type="button" class="p5-lock-btn lock${o.locked ? ' is-locked' : ''}" title="${o.locked ? '点击解锁' : '锁定保留至下一层'}">${o.locked ? '🔒' : '🔓'}</button>
                  <button type="button" class="p5-price-tag p5-buy-btn buy" ${ok ? '' : 'disabled'}>${priceHtml}</button>
                </div>
              </div>
              <div class="p5-bar-subwrap">
                <div class="p5-bar-cat">${it.desc}</div>
                <div class="p5-bar-foot">
                  <span class="bar-prog-badge${ownedCnt > 0 ? ' ready' : ''}" onclick="event.stopPropagation();openShopRelicModal('${it.id}')">🏺 ${relicHint}</span>
                </div>
              </div>
            </div>
          </div>`;
        el.querySelector('.buy').onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); buyOffer(i); };
        el.onclick = () => {
          window._shopSelOfferIdx = i;
          if (ok) { buyOffer(i); return; }
          openShopRelicModal(it.id);
          renderShop();
        };
      }
      el.querySelector('.lock').onclick = e => {
        if (e && e.stopPropagation) e.stopPropagation();
        window._shopSelOfferIdx = i;
        confirmSellIdx = -1; o.locked = !o.locked; renderShop();
      };
      box.appendChild(el);
    });
  }

  const mergePairs = countMergeableWeaponPairs();
  const qmBtn = document.getElementById('shopQuickMergeBtn');
  if (qmBtn) {
    qmBtn.classList.toggle('hidden', mergePairs <= 0);
    qmBtn.textContent = `✦ 一键合阶 (${mergePairs})`;
  }

  const sBox = document.getElementById('weaponSlots');
  const slotHintEl = document.getElementById('slotHint');
  if (player.maxSlots === 0) {
    if (sBox) sBox.innerHTML = '';
    if (slotHintEl) slotHintEl.textContent = '🐂 蛮牛铁卫：不可携带武器，堆叠生命与护甲强化冲撞震波';
  } else {
    if (slotHintEl) {
      slotHintEl.innerHTML = `⚔️ 随身主武器 (<b>${player.weapons.length}</b>/${player.maxSlots}) · 点槽合成/回收`;
    }
    _renderWeaponSlotGrid(sBox, false);
  }

  let totalRelicPieces = 0;
  if (player.items && typeof player.items === 'object') {
    for (const cnt of Object.values(player.items)) {
      if (cnt > 0) totalRelicPieces += cnt;
    }
  }
  const ovTabLbl = document.getElementById('hubTabOverviewLabel');
  if (ovTabLbl) {
    const mergeDotHtml = mergePairs > 0 ? '<i class="hub-merge-dot" title="有同名同阶武器可合成"></i>' : '';
    ovTabLbl.innerHTML = `<span class="hub-lbl-desk">🎒 角色与行囊 (${player.weapons.length}/${player.maxSlots} · ${totalRelicPieces}饰品)</span><span class="hub-lbl-mob">🎒 行囊</span>${mergeDotHtml}`;
  }
  _renderShopOverviewPane(floorBadgeTxt, mergePairs);
}

let selectedWeaponSlotIdx = -1;

function isWeaponSlotModalOpen() {
  const m = typeof document !== 'undefined' ? document.getElementById('weaponActionModal') : null;
  return !!(m && !m.classList.contains('hidden'));
}

function closeWeaponSlotModal(silent = false) {
  selectedWeaponSlotIdx = -1;
  confirmSellIdx = -1;
  const m = typeof document !== 'undefined' ? document.getElementById('weaponActionModal') : null;
  if (m) m.classList.add('hidden');
  if (!silent && state === 'shop') {
    beep(360, 0.03, 'triangle', 0.025);
    renderShop();
  }
}

function combineWeaponSlotFromModal(idx) {
  if (!player || !Array.isArray(player.weapons)) return false;
  const w = player.weapons[idx];
  const tpl = w && WEAPONS[w.id];
  if (!w || !tpl) return false;
  const needsEvo = w.tier >= 5 && !w.evo && Array.isArray(tpl.evos) && tpl.evos.length >= 2;
  closeWeaponSlotModal(true);
  if (needsEvo) {
    checkPendingWeaponEvolutions();
    renderShop();
    return true;
  }
  const ok = mergeSlot(idx);
  renderShop();
  return ok;
}

function recycleWeaponSlotFromModal(idx) {
  if (!player || !Array.isArray(player.weapons) || player.weapons.length <= 1) return false;
  const w = player.weapons[idx];
  const tpl = w && WEAPONS[w.id];
  if (!w || !tpl) return false;
  const dispName = _wpnDispName(w);
  const tierMul = WEAPON_TIER_COST_MUL[w.tier] || 6.4;
  const refund = Math.max(4, Math.round(tpl.cost * tierMul * getShopScale() * 0.35));
  closeWeaponSlotModal(true);
  player.mats += refund;
  player.weapons.splice(idx, 1);
  player._sbCache = null;
  syncSetHp();
  beep(320, 0.06);
  logInfo('SHOP', `回收武器 ${dispName} Lv.${w.tier} (+${refund}💎)`);
  renderShop();
  return true;
}

function openWeaponSlotModal(idx) {
  if (!player || !Array.isArray(player.weapons)) return false;
  const w = player.weapons[idx];
  const tpl = w && WEAPONS[w.id];
  if (!w || !tpl) return false;
  const modal = typeof document !== 'undefined' ? document.getElementById('weaponActionModal') : null;
  const card = typeof document !== 'undefined' ? document.getElementById('weaponActionCard') : null;
  if (!modal || !card) return false;

  selectedWeaponSlotIdx = idx;
  confirmSellIdx = -1;
  beep(510, 0.035, 'triangle', 0.03);

  const hasPair = w.tier < 5 && player.weapons.some((x, j) => j !== idx && x.id === w.id && x.tier === w.tier);
  const needsEvo = w.tier >= 5 && !w.evo && Array.isArray(tpl.evos) && tpl.evos.length >= 2;
  const canRecycle = player.weapons.length > 1;
  const tierMul = WEAPON_TIER_COST_MUL[w.tier] || 6.4;
  const refund = Math.max(4, Math.round(tpl.cost * tierMul * getShopScale() * 0.35));

  const activeEvoObj = (w.evo && Array.isArray(tpl.evos)) ? tpl.evos.find(ev => ev.id === w.evo) : null;
  const isEvoDone = w.tier >= 5 && !!activeEvoObj;
  const dispName = _wpnDispName(w);
  const nameColor = isEvoDone ? (activeEvoObj.color || TIER_COLORS[5]) : '#f4f0ea';
  const sDef = SET_DEFS[tpl.set];
  const sLabel = sDef ? sDef.label : '';
  const sb = getSetBonuses();
  const curSetCnt = (sb && sb.counts && tpl.set) ? (sb.counts[tpl.set] || 0) : 0;

  const totalRange = getTotalRangeBonus();
  const liveDmg = typeof calcWeaponPreviewDmg === 'function'
    ? calcWeaponPreviewDmg(w.id, tpl, w.tier, activeEvoObj)
    : Math.round(tpl.dmg * (1 + (w.tier - 1) * 0.55) * getEffectiveDmgMul());
  const liveRange = typeof calcWeaponEffectiveRange === 'function'
    ? calcWeaponEffectiveRange(tpl, w.tier, activeEvoObj, totalRange)
    : tpl.range;
  const liveCd = (tpl.cd * (activeEvoObj && activeEvoObj.cdMul ? activeEvoObj.cdMul : 1) / Math.max(0.18, getEffectiveAtkSpd() * (tpl.isStaff ? (1 + (player.staffHaste || 0)) : 1) * (tpl.spdScale ? (1 + Math.max(0, getEffectiveSpdMul() - 1) * 0.45) : 1) * (1 + (w.tier - 1) * 0.08))).toFixed(2);
  const bonusMoveSpd = Math.max(0, getEffectiveSpdMul() - 1);
  const critPct = Math.min(100, Math.round((getEffectiveCrit() + (tpl.critBonus || 0) + (tpl.spdScale ? bonusMoveSpd * 0.15 : 0) + (w.tier - 1) * 0.03 + (activeEvoObj && activeEvoObj.critAdd ? activeEvoObj.critAdd : 0)) * 100));
  const totalPellets = tpl.burstShots
    ? (tpl.burstShots + ((activeEvoObj && activeEvoObj.burstAdd) || 0))
    : (tpl.pellets ? (tpl.pellets + ((activeEvoObj && activeEvoObj.pelletsAdd) || 0) + (!tpl.isStaff && !tpl.melee && !tpl.isFlame ? (player.rangedPelletsBonus || 0) : 0)) : 0);
  const pelletsTxt = totalPellets > 1 ? `×${totalPellets}` : '';
  const runRec = player.runStats && player.runStats.weaponDmg && player.runStats.weaponDmg[w.id];
  const scaleBadges = typeof renderWeaponScalingBadgesHtml === 'function' ? renderWeaponScalingBadgesHtml(tpl, w.id) : '';


  let evoHintHtml = '';
  if (activeEvoObj) {
    evoHintHtml = `<div class="wpn-act-evo-hint"><b style="color:${activeEvoObj.color || '#ff5c8a'}">★ 已觉醒神话：【${activeEvoObj.name}】</b><br>${activeEvoObj.desc}</div>`;
  } else if (Array.isArray(tpl.evos) && tpl.evos.length >= 2) {
    evoHintHtml = `<div class="wpn-act-evo-hint"><b>◆ 5阶神话进化预览：</b>★${tpl.evos[0].name} ／ ★${tpl.evos[1].name}</div>`;
  }

  let combineBtnHtml = '';
  if (needsEvo) {
    combineBtnHtml = `<button type="button" id="wpnActCombineBtn" class="btn btn-go" style="justify-content:center" onclick="combineWeaponSlotFromModal(${idx})">★ 择定五阶神话进化</button>`;
  } else if (hasPair) {
    const nextTierLbl = TIER_NAMES[w.tier + 1] || `${w.tier + 1}阶`;
    combineBtnHtml = `<button type="button" id="wpnActCombineBtn" class="btn merge-ready" style="justify-content:center" onclick="combineWeaponSlotFromModal(${idx})">◆ ${w.tier === 4 ? '共鸣合成并觉醒五阶神话!' : `共鸣合成 ➔ 【${nextTierLbl} · ${tpl.name}】`}</button>`;
  }

  card.className = `wpn-action-card t${w.tier}`;
  card.innerHTML = `
    <div class="wpn-act-head">
      <div class="item-emblem t${w.tier}">${_wpnEmblem(w.id, w.tier, w.evo || '', tpl.icon)}</div>
      <div class="card-meta" style="flex:1;min-width:0">
        <div class="p5-title-group">
          <div class="wpn-act-title" style="color:${nameColor}" title="${dispName}">${dispName}</div>
          ${_rarityPill(w.tier)}
        </div>
        <div class="card-badges">
          ${scaleBadges}
          ${sLabel ? `<span class="tag">${sLabel} (${curSetCnt})</span>` : ''}
        </div>
      </div>
    </div>
    <div class="stat-chips">
      <span class="stat-chip">伤害 ${liveDmg}${pelletsTxt}</span>
      <span class="stat-chip">间隔 ${liveCd}s</span>
      <span class="stat-chip">射程 ${liveRange}</span>
      <span class="stat-chip">暴击 ${critPct}%</span>
      ${runRec && runRec.dmg > 0 ? `<span class="stat-chip">本局输出 ${_fmtRunNum(runRec.dmg)} (${runRec.kills || 0}斩)</span>` : ''}
    </div>
    <div class="wpn-act-desc">${tpl.desc}</div>
    ${sDef ? `<div class="wpn-act-set-line">✦ 羁绊【${sLabel}】（当前 ${curSetCnt} 把）：${sDef.desc}</div>` : ''}
    ${evoHintHtml}
    <div class="wpn-act-btns">
      ${combineBtnHtml}
      <div class="wpn-act-btns-row">
        <button type="button" id="wpnActRecycleBtn" class="btn btn-recycle-danger" ${canRecycle ? '' : 'disabled'} onclick="recycleWeaponSlotFromModal(${idx})">${canRecycle ? `♻️ 熔炼回收 (+◇${refund})` : '♻️ 至少保留 1 把兵装'}</button>
        <button type="button" id="wpnActCancelBtn" class="btn btn-sec" onclick="closeWeaponSlotModal()">✕ 取消</button>
      </div>
    </div>`;

  modal.classList.remove('hidden');
  renderShop();
  return true;
}

if (typeof globalThis !== 'undefined') {
  globalThis.isWeaponSlotModalOpen = isWeaponSlotModalOpen;
  globalThis.openWeaponSlotModal = openWeaponSlotModal;
  globalThis.closeWeaponSlotModal = closeWeaponSlotModal;
  globalThis.combineWeaponSlotFromModal = combineWeaponSlotFromModal;
  globalThis.recycleWeaponSlotFromModal = recycleWeaponSlotFromModal;
}

function rerollShop() {
  const actualCost = freeRerollsLeft > 0 ? 0 : rerollCost;
  if (player.mats < actualCost) return;
  closeWeaponSlotModal(true);
  if (mobDrawerOpen) {
    mobDrawerOpen = false;
    const sm = document.getElementById('shopMenu');
    if (sm) sm.classList.remove('drawer-open');
    const arr = document.getElementById('mobDrawerArrow');
    if (arr) arr.textContent = '详情 ▾';
  }
  player.mats -= actualCost;
  if (actualCost > 0 && (player.luckyRerollChance || 0) > 0 && Math.random() < Math.min(0.50, player.luckyRerollChance)) {
    player.mats += actualCost;
  }
  if (player.paddingStacks > 0) syncSetHp();
  if (freeRerollsLeft > 0) {
    freeRerollsLeft--;
    rerollCost = freeRerollsLeft > 0 ? 0 : calcDiscountedShopCost(rerollRawCost, 1);
  } else {
    const stepAdd = typeof SHOP_REROLL_STEP === 'number' ? SHOP_REROLL_STEP : 2;
    rerollRawCost = Math.max(1, Number.isFinite(rerollRawCost) ? rerollRawCost : rerollBase) + stepAdd;
    if (player) player.shopRerollRaw = rerollRawCost;
    rerollCost = calcDiscountedShopCost(rerollRawCost, 1);
  }
  shopOffers = shopOffers.map(o => (o && o.locked) ? o : null).filter(Boolean);
  rollOffers(); beep(440, 0.05); renderShop();
}

function nextWave() {
  if (state !== 'shop' || !player) return;
  if (typeof SpireDirector !== 'undefined' && SpireDirector.isBlockingGameplay()) return;
  if (getPendingEvoWeapon()) {
    const currentPlayer = player, currentWave = wave;
    checkPendingWeaponEvolutions(() => {
      if (player === currentPlayer && wave === currentWave) nextWave();
    });
    return;
  }
  resetWeaponEvolutionUI();
  closeWeaponSlotModal(true);
  wave++;
  beginWave();
}

function endGame(win) {
  if (!player || state === 'end') return;
  const flow = spireFloorFlow;
  if (!isCurrentSpireFlow(flow)) return;
  if (win) {
    if (!endlessMode && wave === MAX_WAVE && flow.bossDefeated && getSpireStoryProgress().finalChoice === 'refuse' && hasSpireTrueEnding()) {
      playSpireEnding('B', flow);
    }
    return;
  }
  if (!stopSpireCombat(flow, 'player-defeated')) return;
  const done = () => {
    if (!isCurrentSpireFlow(flow) || flow.result !== 'player-defeated') return;
    flow.result = 'ended';
    showSpireEndMenu(false);
  };
  if (!endlessMode && typeof SpireDirector !== 'undefined' && typeof SpireDirector.onPlayerDefeated === 'function') {
    SpireDirector.onPlayerDefeated(wave, done);
  } else done();
}

function showSpireEndMenu(win, ending = '') {
  state = 'end';
  resetJoy();
  resetWeaponEvolutionUI();
  if (!win) {
    bossCutscene = null;
  if (typeof phase2ShatterFx !== 'undefined') phase2ShatterFx = null;
    if (typeof pendingBossCutscene !== 'undefined') pendingBossCutscene = null;
    if (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.abortActive === 'function') {
      SpireDirector.abortActive();
    }
  }
  document.getElementById('hud').classList.add('hidden');
  const bossWrapEnd = document.getElementById('bossBarWrap');
  if (bossWrapEnd) bossWrapEnd.classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
  const cm = document.getElementById('crateMenu');
  if (cm) cm.classList.add('hidden');
  const em = document.getElementById('endMenu');
  if (typeof em.setAttribute === 'function') em.setAttribute('data-result', win ? `ending-${ending}` : 'defeat');
  const actIndex = Math.max(1, Math.min(4, Math.ceil(wave / 4)));
  const heroSceneUrl = typeof getHeroMasterSceneUrl === 'function' ? getHeroMasterSceneUrl(player ? player.cls : 'allrounder') : `assets/spire/scene_${actIndex}_vista.jpg`;
  const background = (win && ending === 'B')
    ? 'assets/spire/ui_art/ui_scene_dawn_end.jpg'
    : (!win && wave === 4 ? 'assets/spire/v2/player-defeat-clean.jpg' : heroSceneUrl);
  const imageUrl = (typeof SpireAssets !== 'undefined' && SpireAssets && typeof SpireAssets.resolve === 'function') ? SpireAssets.resolve(background) :
    (typeof resolveSpireAssetUrl === 'function' ? resolveSpireAssetUrl(background) :
    ((typeof window !== 'undefined' && window.__SPIRE_INLINE_ASSETS__ && window.__SPIRE_INLINE_ASSETS__[background]) || background));
  if (em.style && typeof em.style.setProperty === 'function') em.style.setProperty('--ending-art', `url("${imageUrl}")`);
  const endVistaEl = document.getElementById('endVistaBg');
  if (endVistaEl && endVistaEl.style) endVistaEl.style.backgroundImage = `url('${imageUrl}')`;
  const waveLabel = endlessMode ? `无尽第 ${wave} 层` : `第 ${wave} / ${MAX_WAVE} 层`;
  _syncChoiceStandee('endHeroStandee', win ? 'DAWN OF THE 1000TH · 轮回终章战绩铭刻' : `ASHEN CYCLE · ${waveLabel} 战绩铭刻`, '', '');
  const ransomEnEl = document.getElementById('endRansomEn');
  if (ransomEnEl) ransomEnEl.textContent = win ? 'CLEAR!!' : 'ASHEN CYCLE';
  em.classList.remove('hidden');
  em.scrollTop = 0;
  const showEndlessNext = !!(win && ending === 'B');
  document.getElementById('endlessBtn').classList.toggle('hidden', !showEndlessNext);
  const endEndlessWrap = document.getElementById('endEndlessWrap');
  if (endEndlessWrap) endEndlessWrap.classList.toggle('hidden', !showEndlessNext);
  const retryBtn = document.getElementById('retryWaveBtn');
  const endRetryWrap = document.getElementById('endRetryWrap');
  if (retryBtn) {
    const canRetry = !win && typeof waveCheckpoint !== 'undefined' && !!(waveCheckpoint && waveCheckpoint.player);
    retryBtn.classList.toggle('hidden', !canRetry);
    retryBtn.textContent = '↻ 重试本层 →';
    if (endRetryWrap) endRetryWrap.classList.toggle('hidden', !canRetry);
  }
  const abandonBtn = document.getElementById('abandonRestartBtn');
  if (abandonBtn) {
    abandonBtn.classList.add('hidden');
    abandonBtn.textContent = '放弃并从头开始';
  }
  const mainBtn = document.getElementById('endMainMenuBtn');
  if (mainBtn) {
    mainBtn.textContent = win && ending === 'A' ? '← 再次提灯启程' : '← 返回主殿';
  }
  const clsObj = CLASSES.find(c => c.id === player.cls);
  const retries = (player && player.retryCount) || 0;
  logInfo('END', `${win ? (ending === 'A' ? '神座加冕' : '守誓者的破晓') : '本层败北'} · 角色=${clsObj ? clsObj.name : player.cls} · 波次=${wave} · Lv=${player.lv} · 击杀=${player.kills} · 重开=${retries}`);
  document.getElementById('endTitle').textContent = win ? (ending === 'A' ? '神座加冕' : '第一千道黎明') : '魂灯未熄';
  const storyNote = win
    ? (ending === 'A'
      ? '<br><span class="ending-story-note">你与镜中圣女合一，黑日吞没了世界。第一千次轮回开始了。</span>'
      : '<br><span class="ending-story-note">四位同伴的温暖残影与你斩碎了黑镜。长桥雨停，冰城苏醒，钟声终于向前。</span>')
    : `<br><span class="ending-story-note">你倒在了${['雨夜长桥', '永冻冰窟', '倒悬钟楼', '日蚀镜界'][actIndex - 1]}。可从第 ${wave} 层起点重新握紧提灯。</span>`;
  document.getElementById('endDesc').innerHTML =
    `厄度：<b>${diff.badge}</b>  ·  登塔者：<b>${clsObj ? clsObj.name : ''}</b>  ·  抵达：<b>${waveLabel}</b>  ·  共鸣：<b>Lv.${player.lv}</b>  ·  净化：<b>${player.kills}</b>` +
    (retries > 0 ? `  ·  回溯：<b>${retries} 次</b>` : '') + storyNote;
  renderEndRunSummary(win);
}

let _endSummaryTab = 'all';
let _endSummaryState = null;
let _activeEndDetail = null;

function _fmtRunNum(val) {
  const n = Math.max(0, Math.round(val || 0));
  if (n >= 100000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 10000) return `${(n / 10000).toFixed(2)}万`;
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function _escRunHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _escRunAttr(s) {
  return _escRunHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const _EXTRA_DMG_META = {
  soul_dash:          { name: '青焰瞬步战技', icon: '◆', cat: '角色瞬步战技', scale: '随角色等级、全体伤害与瞬步遗物强化成长', desc: '发动【青焰瞬步】穿越敌群或弹幕时释放的专属职业残响战技伤害，兼具无敌帧规避与战术爆发。' },
  turret_gun:         { name: '自律发条炮阵', icon: '🛰️', cat: '工程构装火力', scale: '受【工程学 / 构装伤害】与【炮台攻速】加成', desc: '战场自动索敌射击的发条机炮塔，可继承【弹药导热回路】元素异常并响应【发条共鸣法杖 / 齿轮指令信标】协同齐射。' },
  turret_laser:       { name: '贯日浮游激光塔', icon: '🛸', cat: '工程构装火力', scale: '受【工程学 / 构装伤害】与【炮台攻速】加成', desc: '发射高能贯穿光束的浮游激光塔，对直线上的复数魔物与首领造成稳定穿透打击。' },
  turret_shock:       { name: '磁暴电弧线圈塔', icon: '🗼', cat: '工程构装火力', scale: '受【工程学】与【元素伤害】双重加成', desc: '由【电弧感应线圈】部署的高压磁暴塔桩，周期性向周围敌群释放环形连锁电弧脉冲。' },
  turret_totem:       { name: '奥术共鸣方尖碑', icon: '🔮', cat: '秘术构装图腾', scale: '受【工程学】与【元素/法杖】属性加成', desc: '由【发条共鸣法杖】或【奥术共鸣方尖碑】树立的秘法图腾塔，发射追踪星弹并为周围友方构装提供攻速共鸣光环。' },
  landmine:           { name: '发条感应星雷', icon: '💣', cat: '工程爆破构装', scale: '受【工程学】、【爆炸范围】与【布雷急速】加成', desc: '自动布设于战场的感应破片星雷，魔物踏入触发大范围高伤爆破。' },
  mine_blast:         { name: '感应破片地雷', icon: '💣', cat: '工程爆破构装', scale: '受【工程学】与【爆炸伤害/范围】加成', desc: '战场自动布设的高爆感应地雷造成的范围破片杀伤。' },
  elemental_dot:      { name: '灼烧·风毒蚀伤', icon: '🔥', cat: '元素持续异常', scale: '受【元素伤害】、【异常急速】与【元素暴击】加成', desc: '烈焰灼烧与剧毒腐蚀每秒跳动的持续异常伤害，高层数叠加可稳定融化高甲重卫与首领。' },
  elemental_reaction: { name: '四象聚变与星陨', icon: '⚛️', cat: '高阶元素聚变', scale: '受【元素伤害】、【全体伤害】与对应法杖/遗物加成', desc: '冰火融毁、超导磁暴、毒火爆燃及【大魔导星陨王冠】等触发的高阶元素范围聚变伤害。' },
  elem_chain:         { name: '元素共鸣电弧', icon: '⚡', cat: '元素连锁反应', scale: '受【元素伤害】与【连锁弹射】加成', desc: '攻击或异常触发的跨目标跳跃雷弧伤害，擅长清理成群涌来的纸灵与追猎傀儡。' },
  relic_proc:         { name: '遗物反震与共鸣', icon: '✨', cat: '记忆遗物特效', scale: '受【全体伤害】、【幸运】或【护甲/最大生命】加成', desc: '由黑曜反伤甲刺、幸运弹珠天雷、受击新星等记忆遗物被动触发的额外共鸣伤害。' },
  item_proc:          { name: '遗物共鸣特效', icon: '✨', cat: '记忆遗物特效', scale: '受角色综合面板属性加成', desc: '记忆遗物被动特效在战斗中触发的附加伤害。' },
  bull_nova:          { name: '蛮牛烈焰冲撞', icon: '🐂', cat: '角色专属重装震波', scale: '受【最大生命】、【护甲】、【护盾】与【元素伤害】加成', desc: '蛮牛铁卫与魔物近身碰撞时迸发的烈焰震荡波，堆叠肉度与元素即可化作移动熔炉。' },
  bull_charge:        { name: '蛮牛烈焰冲撞', icon: '🐂', cat: '角色专属重装震波', scale: '受【最大生命】与【护甲】加成', desc: '重装冲撞触发的近身范围烈焰震击。' },
  thorns_reflect:     { name: '黑曜反伤甲刺', icon: '🦔', cat: '重装反击特效', scale: '受【护甲】与【最大生命】加成', desc: '受击时向周围敌群迸射的黑曜甲刺反震伤害。' },
  archmage_meteor:    { name: '大魔导星陨天罚', icon: '☄️', cat: '法杖传说秘术', scale: '受【元素伤害】与【法杖施法频率】加成', desc: '佩戴【大魔导星陨王冠】后施法累积召唤的天外星陨轰炸伤害。' },
  cyberball_bolt:     { name: '幸运弹珠天雷', icon: '🔮', cat: '幸运共鸣落雷', scale: '受【幸运】与【全体伤害】加成', desc: '拾取封魂晶石时按幸运值概率劈向随机魔物的金色天雷。' }
};

const _SPECIAL_THREAT_DOSSIERS = {
  mini_slime: {
    name: '分裂孢子幼体', icon: '🟢', sprite: 'assets/spire/mob_mini_slime.png',
    badge: '🟢 分裂衍生魔物', wave: '击碎弹性软泥后分裂', roleTag: '高速近身幼体',
    stats: '❤️偏脆 · 📏极小 · 👟高速扑咬 · 💥轻度接触伤',
    desc: '大型弹性软泥被击破瞬间一分为二弹出的小型孢子体，移速较快但血量较低。',
    counterTip: '利用穿透、弹射或范围灼烧即可顺带清扫，切勿在狭窄墙角被多只幼体合围卡位。',
    codexTab: 'monsters'
  },
  trap_sky_lance: {
    name: '蚀界·天外贯星梭', icon: '☄️', sprite: '',
    badge: '🕯️ 蚀界渡劫天劫', wave: '生存试炼专属机关', roleTag: '高速直线狙杀梭',
    stats: '⚡高速贯穿 · 📏窄长光轨 · 🎯预判封路',
    desc: '从浓雾天穹斜切坠入提灯视野的天外贯星长梭，沿锁定光轨高速贯穿全场。',
    counterTip: '看到地面细长预警线亮起时横向小步垂直挪开即可规避，切忌顺着光轨同向直线奔跑。',
    codexTab: 'world'
  },
  trap_fissure: {
    name: '蚀界·地脉撕裂裂缝', icon: '🌋', sprite: '',
    badge: '🕯️ 蚀界渡劫天劫', wave: '生存试炼专属机关', roleTag: '地面延时裂谷爆破',
    stats: '🌋长条裂隙 · ⏱️蓄力喷发 · 💥高额区域伤',
    desc: '大地被蚀界之力撕开的炽热裂隙带，短暂蓄力震颤后沿整条裂缝喷发毁灭能量。',
    counterTip: '观察裂隙两侧边缘及时跨出判定带；被逼入死角时可发动【青焰瞬步】无伤跃过裂缝！',
    codexTab: 'world'
  },
  trap_corridor: {
    name: '蚀界·天劫平行剑阵', icon: '⚔️', sprite: '',
    badge: '🕯️ 蚀界渡劫天劫', wave: '生存试炼专属机关', roleTag: '多轨平行剑气走廊',
    stats: '⚔️多道平行轨 · 📐留有安全巷道 · 💥齐射斩击',
    desc: '横跨战场的数道平行天劫剑气走廊，封锁大面积走位空间并同步轰击。',
    counterTip: '第一时间站入两道红线之间的安全缝隙静候剑阵掠过，或用瞬步直接穿过危险轨。',
    codexTab: 'world'
  },
  trap_ring: {
    name: '蚀界·终末风眼环震', icon: '⭕', sprite: '',
    badge: '🕯️ 蚀界渡劫天劫', wave: '生存试炼专属机关', roleTag: '外环坍缩·内圈风眼安全',
    stats: '⭕巨型外环爆破 · 🛡️圆心风眼无伤 · 💥高额环震',
    desc: '外围环形区域剧烈坍缩引爆的终末风眼阵，唯有圆心风眼内圈属于绝对安全区。',
    counterTip: '切勿盲目往外逃跑！看清内圈高亮安全环边界，果断踏入风眼中心即可安然渡劫。',
    codexTab: 'world'
  },
  trap_cross_star: {
    name: '蚀界·旋星十字裂光', icon: '✴️', sprite: '',
    badge: '🕯️ 蚀界渡劫天劫', wave: '生存试炼专属机关', roleTag: '十字/米字裂空星芒',
    stats: '✴️十字交叉光轨 · ⏱️短促蓄力 · 💥交叉高伤',
    desc: '锁定角色周边象限绽放的蚀界旋星十字裂光，瞬间切裂纵横四个方向。',
    counterTip: '向 45° 斜角象限空当迈步即可轻松避开十字交汇点。',
    codexTab: 'world'
  },
  trap_meteor: {
    name: '蚀界·连环坠星轰击', icon: '🌠', sprite: '',
    badge: '🕯️ 蚀界渡劫天劫', wave: '生存试炼专属机关', roleTag: '步进连环星陨圈',
    stats: '🌠多连环步进落点 · 💥范围冲击波',
    desc: '紧咬角色移动轨迹连续砸落的蚀界天外陨星阵，形成连环圆形爆破区。',
    counterTip: '保持折线或绕弧移动引诱落点偏离，不要原地折返踩入上一颗刚蓄满的陨星圈。',
    codexTab: 'world'
  },
  trap_void_orb: {
    name: '蚀界·游弋冥渊雷涡', icon: '🌀', sprite: '',
    badge: '🕯️ 蚀界渡劫天劫', wave: '生存试炼专属机关', roleTag: '弧线游弋暗雷球',
    stats: '🌀雾缘切入 · ↪️弧线偏转 · ⚡大体积雷涡',
    desc: '从魂灯浓雾边缘缓缓沿弧线切入照明区的巨型自转暗雷星涡球，压迫灯圈内走位。',
    counterTip: '留意雷涡球弧线弯曲方向，从其外弧侧逆向绕过，或利用瞬步拉远提灯中心。',
    codexTab: 'world'
  },
  terrain_lava: {
    name: '地形·锻炉熔火方槽', icon: '🔥', sprite: '',
    badge: '🧱 层域元素地形', wave: '一层·雨夜长桥 / 熔火区', roleTag: '地面持续灼烧石槽',
    stats: '🔥踏入减速并灼烧 · 👹同样灼烧踏入的魔物',
    desc: '嵌于竞技场石板中的赤红熔火石砌方槽，长时间踩踏会持续损失生命并略微减速。',
    counterTip: '绕开石槽边缘拉扯敌群，可故意引诱追击魔物踩入熔火槽借地形消耗敌方血量！',
    codexTab: 'world'
  },
  terrain_swamp: {
    name: '地形·翡翠秘毒方渠', icon: '🧪', sprite: '',
    badge: '🧱 层域元素地形', wave: '三层·倒悬钟楼 / 秘毒区', roleTag: '地面叠毒易伤石渠',
    stats: '🧪浸染叠层毒伤 · ⚠️微幅提高受击易伤',
    desc: '蓄满炼金秘毒的嵌地石砌方渠，持续停留会叠加浸染毒蚀并小幅放大受到的伤害。',
    counterTip: '避免站在毒渠内硬吃弹幕，利用折角石渠地形卡住大型近战怪的追击路线。',
    codexTab: 'world'
  }
};

function _resolveThreatDossier(key, fallbackName = '未知威胁', fallbackIcon = '👾') {
  const resolveImg = rel => {
    if (!rel) return '';
    if (typeof SpireAssets !== 'undefined' && SpireAssets && typeof SpireAssets.resolve === 'function') {
      return SpireAssets.resolve(rel);
    }
    return rel;
  };
  const codexHit = (typeof MONSTER_CODEX !== 'undefined' && Array.isArray(MONSTER_CODEX))
    ? MONSTER_CODEX.find(m => m && m.id === key)
    : null;
  const bossHit = (typeof BOSS_DEFS === 'object' && BOSS_DEFS) ? BOSS_DEFS[key] : null;
  const miniHit = (typeof MINI_BOSS_DEFS === 'object' && MINI_BOSS_DEFS) ? MINI_BOSS_DEFS[key] : null;
  const specialHit = (typeof SPECIAL_RELICS !== 'undefined' && Array.isArray(SPECIAL_RELICS))
    ? SPECIAL_RELICS.find(sr => sr && sr.bossId === key)
    : null;
  const specialDoc = _SPECIAL_THREAT_DOSSIERS[key] || null;

  if (bossHit) {
    return {
      key,
      name: bossHit.name || (codexHit && codexHit.name) || fallbackName,
      epithet: bossHit.epithet || '',
      icon: bossHit.icon || fallbackIcon,
      spriteUrl: resolveImg(bossHit.sprite || (codexHit && codexHit.sprite) || ''),
      portraitUrl: resolveImg(bossHit.portrait || ''),
      badge: (codexHit && codexHit.badge) || '👑 守层灾厄主宰',
      wave: (codexHit && codexHit.wave) || '第 4 / 8 / 12 / 16 层镇守',
      roleTag: '四幕守誓主宰 Boss',
      stats: (codexHit && codexHit.stats) || '❤️首领级巨量生命 · 🔥双阶段形态觉醒 · 💥复合弹幕与专属地形',
      desc: bossHit.desc || (codexHit && codexHit.desc) || '',
      counterTip: '观察首领冲刺导轨、传送落点收束环与外环安全风眼提示，善用【青焰瞬步】穿越高危斩线并在技能后摇集中爆发。',
      tierCls: 't4',
      codexTab: 'monsters'
    };
  }
  if (miniHit) {
    return {
      key,
      name: miniHit.name || (codexHit && codexHit.name) || fallbackName,
      epithet: miniHit.epithet || '',
      icon: miniHit.icon || fallbackIcon,
      spriteUrl: resolveImg(miniHit.sprite || (codexHit && codexHit.sprite) || ''),
      portraitUrl: '',
      badge: (codexHit && codexHit.badge) || '⚔️ 层域先锋统领',
      wave: (codexHit && codexHit.wave) || '第 6 / 10 / 14 层及无尽统领波',
      roleTag: '幕中先锋统领',
      stats: (codexHit && codexHit.stats) || '❤️统领级厚甲 · ⚡专属走廊突袭与范围杀招',
      desc: miniHit.desc || (codexHit && codexHit.desc) || '',
      counterTip: '统领发动长走廊冲锋或瞬影侧袭前均有明显导轨/星环预警，横向拉出轨迹即可反打。',
      tierCls: 't3',
      codexTab: 'monsters'
    };
  }
  if (specialHit) {
    return {
      key,
      name: specialHit.bossName || (codexHit && codexHit.name) || fallbackName,
      epithet: specialHit.epithet || '',
      icon: specialHit.bossIcon || fallbackIcon,
      spriteUrl: resolveImg((codexHit && codexHit.sprite) || ''),
      portraitUrl: '',
      badge: '🌑 记忆祭坛首领',
      wave: '激活战场共鸣祭坛召唤',
      roleTag: '无尽奇遇祭坛首领',
      stats: (codexHit && codexHit.stats) || '❤️奇遇首领 · 🎁击败必爆丰厚晶石与守誓遗物匣',
      desc: specialHit.bossDesc || (codexHit && codexHit.desc) || '',
      counterTip: specialHit.rewardDesc || '量力而行择机唤醒祭坛，击败后可获巨额晶石与遗物秘匣回报。',
      tierCls: 't4',
      codexTab: 'monsters'
    };
  }
  if (codexHit) {
    const tierCls = codexHit.cat === 'special' ? 't4' : (codexHit.cat === 'boss' ? 't3' : (codexHit.cat === 'scene' ? 't2' : 't1'));
    return {
      key,
      name: codexHit.name || fallbackName,
      epithet: '',
      icon: codexHit.icon || fallbackIcon,
      spriteUrl: resolveImg(codexHit.sprite || ''),
      portraitUrl: '',
      badge: codexHit.badge || '层域魔物',
      wave: codexHit.wave || '各层出没',
      roleTag: codexHit.cat === 'scene' ? '层域专属精英傀儡' : '常规层域傀儡',
      stats: codexHit.stats || '',
      desc: codexHit.desc || '',
      counterTip: '留意其攻击前摇光效与弹道轨迹，优先清理远程射手、自爆球与治疗/召唤单位。',
      tierCls,
      codexTab: 'monsters'
    };
  }
  if (specialDoc) {
    return {
      key,
      name: specialDoc.name || fallbackName,
      epithet: '',
      icon: specialDoc.icon || fallbackIcon,
      spriteUrl: resolveImg(specialDoc.sprite || ''),
      portraitUrl: '',
      badge: specialDoc.badge,
      wave: specialDoc.wave,
      roleTag: specialDoc.roleTag,
      stats: specialDoc.stats,
      desc: specialDoc.desc,
      counterTip: specialDoc.counterTip,
      tierCls: key.startsWith('trap_') ? 't3' : 't2',
      codexTab: specialDoc.codexTab || 'world'
    };
  }
  return {
    key,
    name: fallbackName || '深渊魔物袭击',
    epithet: '',
    icon: fallbackIcon || '👾',
    spriteUrl: '',
    portraitUrl: '',
    badge: '⚠️ 深渊威胁',
    wave: '本局交锋记录',
    roleTag: '战场敌方伤源',
    stats: '💥 近身接触或混合弹幕伤害',
    desc: '来自烬塔深渊傀儡或战场环境造成的伤害记录。',
    counterTip: '合理搭配护甲、闪避与移速词条，保持中距离环绕走位可显著减少受击频率。',
    tierCls: 't2',
    codexTab: 'monsters'
  };
}

function setEndSummaryTab(tab) {
  _endSummaryTab = tab || 'dealt';
  const panel = typeof document !== 'undefined' ? document.getElementById('endSummaryPanel') : null;
  if (!panel) return;
  if (typeof panel.setAttribute === 'function') panel.setAttribute('data-view', _endSummaryTab);
  const btns = panel.querySelectorAll ? panel.querySelectorAll('.end-sum-tab') : [];
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    if (b && b.classList) {
      const isMatch = b.getAttribute('data-tab') === _endSummaryTab;
      b.classList.toggle('active', isMatch);
      b.classList.toggle('on', isMatch);
    }
  }
}
globalThis.setEndSummaryTab = setEndSummaryTab;

function closeEndSummaryDetail() {
  _activeEndDetail = null;
  const modal = typeof document !== 'undefined' ? document.getElementById('endDetailModal') : null;
  if (modal && modal.classList) modal.classList.add('hidden');
  const panel = typeof document !== 'undefined' ? document.getElementById('endSummaryPanel') : null;
  if (panel && panel.querySelectorAll) {
    const rows = panel.querySelectorAll('.end-sum-row');
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].classList) rows[i].classList.remove('is-selected');
    }
  }
}
globalThis.closeEndSummaryDetail = closeEndSummaryDetail;

function jumpEndDetailToCodex(tab) {
  closeEndSummaryDetail();
  if (typeof openCodex === 'function') {
    openCodex(tab || 'weapons');
  }
}
globalThis.jumpEndDetailToCodex = jumpEndDetailToCodex;

function stepEndSummaryDetail(delta) {
  if (!_endSummaryState || !_activeEndDetail) return;
  const kind = _activeEndDetail.kind;
  const list = kind === 'dealt'
    ? _endSummaryState.wEntries
    : (kind === 'taken' ? _endSummaryState.tEntries : _endSummaryState.iEntries);
  if (!Array.isArray(list) || list.length <= 1) return;
  const curId = _activeEndDetail.id;
  let idx = list.findIndex(x => (x.id || x.key) === curId);
  if (idx < 0) idx = 0;
  const nextIdx = (idx + (delta >= 0 ? 1 : -1) + list.length) % list.length;
  const target = list[nextIdx];
  if (target) openEndSummaryDetail(kind, target.id || target.key);
}
globalThis.stepEndSummaryDetail = stepEndSummaryDetail;

function openEndSummaryDetail(kind, id) {
  if (!_endSummaryState || !id) return false;
  const modal = typeof document !== 'undefined' ? document.getElementById('endDetailModal') : null;
  const kickerEl = typeof document !== 'undefined' ? document.getElementById('endDetailKicker') : null;
  const titleEl = typeof document !== 'undefined' ? document.getElementById('endDetailTitle') : null;
  const bodyEl = typeof document !== 'undefined' ? document.getElementById('endDetailBody') : null;
  const footEl = typeof document !== 'undefined' ? document.getElementById('endDetailFoot') : null;
  if (!modal || !bodyEl) return false;

  const st = _endSummaryState;
  _activeEndDetail = { kind, id: String(id) };
  beep(560, 0.045, 'triangle', 0.038);

  // 同步高亮赛后面板中被选中的条目
  const panel = typeof document !== 'undefined' ? document.getElementById('endSummaryPanel') : null;
  if (panel && panel.querySelectorAll) {
    const rows = panel.querySelectorAll('.end-sum-row');
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r.classList) continue;
      const match = r.getAttribute('data-sum-kind') === kind && r.getAttribute('data-sum-id') === String(id);
      r.classList.toggle('is-selected', match);
    }
  }

  let listLen = 0;
  let codexTarget = 'weapons';

  if (kind === 'dealt') {
    listLen = st.wEntries.length;
    const entry = st.wEntries.find(e => e.id === id);
    if (!entry) return false;
    const tpl = WEAPONS[id];
    const pct = st.totalDealt > 0 ? Math.min(100, (entry.dmg / st.totalDealt) * 100) : 0;
    const pctTxt = st.totalDealt > 0 ? `${pct >= 10 ? pct.toFixed(1) : pct.toFixed(1)}%` : '0%';
    const avgHit = entry.hits > 0 ? (entry.dmg / entry.hits).toFixed(1) : '0';

    if (kickerEl) kickerEl.textContent = tpl ? 'ARMAMENT COMBAT DOSSIER · 守誓兵装实战档案' : 'CONSTRUCT & SKILL DOSSIER · 构装与战技档案';
    if (titleEl) titleEl.textContent = `${entry.name} · 战绩与机制详情`;

    if (tpl) {
      codexTarget = 'weapons';
      const showTier = entry.tier || 1;
      const showEvo = entry.evo || '';
      const setLabel = (SET_DEFS[tpl.set] && SET_DEFS[tpl.set].label)
        ? SET_DEFS[tpl.set].label.replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, '')
        : '';
      const setDesc = (SET_DEFS[tpl.set] && SET_DEFS[tpl.set].desc) || '';
      const typeLabel = tpl.melee ? '⚔️ 近战挥砍' : (tpl.isStaff ? '🪄 秘术法杖' : '🏹 远程射击');
      const totalRange = typeof getTotalRangeBonus === 'function' ? getTotalRangeBonus() : (player ? player.range || 0 : 0);
      const activeEvoObj = (showEvo && Array.isArray(tpl.evos)) ? tpl.evos.find(ev => ev.id === showEvo) : null;
      const liveDmg = typeof calcWeaponPreviewDmg === 'function'
        ? calcWeaponPreviewDmg(id, tpl, showTier, activeEvoObj)
        : Math.round(tpl.dmg * (1 + (showTier - 1) * 0.55) * getEffectiveDmgMul());
      const liveRange = typeof calcWeaponEffectiveRange === 'function'
        ? calcWeaponEffectiveRange(tpl, showTier, activeEvoObj, totalRange)
        : tpl.range;
      const liveCd = (tpl.cd * (activeEvoObj && activeEvoObj.cdMul ? activeEvoObj.cdMul : 1) / Math.max(0.18, getEffectiveAtkSpd() * (tpl.isStaff ? (1 + (player.staffHaste || 0)) : 1) * (tpl.spdScale ? (1 + Math.max(0, getEffectiveSpdMul() - 1) * 0.45) : 1) * (1 + (showTier - 1) * 0.08))).toFixed(2);
      const pelletsTxt = tpl.burstShots ? `×${tpl.burstShots + ((activeEvoObj && activeEvoObj.burstAdd) || 0)}` : (tpl.pellets ? `×${tpl.pellets + ((activeEvoObj && activeEvoObj.pelletsAdd) || 0)}` : '');
      const detailScaleBadges = typeof renderWeaponScalingBadgesHtml === 'function'
        ? renderWeaponScalingBadgesHtml(tpl, id)
        : `<span class="tag">${typeLabel}</span>`;

      let evoSectionHtml = '';
      if (activeEvoObj) {
        evoSectionHtml = `
          <div class="end-detail-section evo-awakened">
            <div class="end-detail-sec-title" style="color:${activeEvoObj.color || '#ff5c8a'}">★ 本局已觉醒五阶神话：【${_escRunHtml(activeEvoObj.name)}】（${_escRunHtml(activeEvoObj.tag || '神话进化')}）</div>
            <div class="end-detail-desc">${_escRunHtml(activeEvoObj.desc)}</div>
          </div>`;
      } else if (Array.isArray(tpl.evos) && tpl.evos.length > 0) {
        evoSectionHtml = `
          <div class="end-detail-section">
            <div class="end-detail-sec-title">◆ 五阶神话 · 二选一进化分支预览</div>
            <div class="end-detail-evo-grid">
              ${tpl.evos.map(ev => `
                <div class="end-detail-evo-card">
                  <div class="end-detail-evo-head">
                    <b style="color:${ev.color || '#ff5c8a'}">★ ${_escRunHtml(ev.name)}</b>
                    <span class="tag t5">${_escRunHtml(ev.tag || '神话')}</span>
                  </div>
                  <div class="end-detail-evo-desc">${_escRunHtml(ev.desc)}</div>
                </div>`).join('')}
            </div>
          </div>`;
      }

      const detailDispName = _wpnDispName(id, showTier, showEvo);
      const baseProtoTag = detailDispName !== tpl.name ? `<span class="tag">原型：${_escRunHtml(tpl.name)}</span>` : '';
      bodyEl.innerHTML = `
        <div class="end-detail-hero">
          <div class="item-emblem t${showTier} end-detail-emblem">${entry.iconHtml}</div>
          <div class="end-detail-hero-info">
            <div class="p5-title-group">
              <div class="end-detail-name">${_escRunHtml(detailDispName)}</div>
              ${_rarityPill(showTier)}
            </div>
            <div class="card-badges">
              ${baseProtoTag}
              ${detailScaleBadges}
              ${setLabel ? `<span class="tag">${_escRunHtml(setLabel)}</span>` : ''}
              ${entry.ownedCount > 0 ? `<span class="tag tag-owned">结算随身 ×${entry.ownedCount}</span>` : '<span class="tag">曾出战记录</span>'}
            </div>
          </div>
        </div>
        <div class="end-detail-kpis">
          <div class="end-detail-kpi">
            <span class="edk-label">整局总输出</span>
            <b class="edk-val gold">${_fmtRunNum(entry.dmg)}</b>
            <small class="edk-sub">输出占比 ${pctTxt}</small>
          </div>
          <div class="end-detail-kpi">
            <span class="edk-label">累计有效命中</span>
            <b class="edk-val">${_fmtRunNum(entry.hits)} 次</b>
            <small class="edk-sub">单次均伤 ${avgHit}</small>
          </div>
          <div class="end-detail-kpi">
            <span class="edk-label">累计净化魔物</span>
            <b class="edk-val cyan">${_fmtRunNum(entry.kills)} 斩</b>
            <small class="edk-sub">最后一击终结</small>
          </div>
          <div class="end-detail-kpi">
            <span class="edk-label">结算实战面板</span>
            <b class="edk-val">伤 ${liveDmg}${pelletsTxt}</b>
            <small class="edk-sub">间隔 ${liveCd}s · 射程 ${liveRange}</small>
          </div>
        </div>
        <div class="end-detail-section">
          <div class="end-detail-sec-title">◆ 兵装机制与属性加成</div>
          <div class="end-detail-desc">${_escRunHtml(tpl.desc)}</div>
          ${setDesc ? `<div class="end-detail-note">羁绊【${_escRunHtml(setLabel)}】：${_escRunHtml(setDesc)}</div>` : ''}
        </div>
        ${evoSectionHtml}`;
    } else {
      codexTarget = 'items';
      const ext = _EXTRA_DMG_META[id] || { name: entry.name, icon: '✨', cat: '构装/共鸣特效', scale: '受角色综合属性加成', desc: '本局由工程构装、瞬步战技或遗物共鸣造成的附加战斗伤害。' };
      bodyEl.innerHTML = `
        <div class="end-detail-hero">
          <div class="item-emblem t3 end-detail-emblem">${entry.iconHtml}</div>
          <div class="end-detail-hero-info">
            <div class="end-detail-name">${_escRunHtml(entry.name)}</div>
            <div class="card-badges">
              <span class="tag t3">${_escRunHtml(ext.cat || '构装与战技')}</span>
              <span class="tag">自动协同伤害源</span>
            </div>
          </div>
        </div>
        <div class="end-detail-kpis">
          <div class="end-detail-kpi">
            <span class="edk-label">整局总输出</span>
            <b class="edk-val gold">${_fmtRunNum(entry.dmg)}</b>
            <small class="edk-sub">输出占比 ${pctTxt}</small>
          </div>
          <div class="end-detail-kpi">
            <span class="edk-label">累计触发命中</span>
            <b class="edk-val">${_fmtRunNum(entry.hits)} 次</b>
            <small class="edk-sub">单次均伤 ${avgHit}</small>
          </div>
          <div class="end-detail-kpi">
            <span class="edk-label">累计净化魔物</span>
            <b class="edk-val cyan">${_fmtRunNum(entry.kills)} 斩</b>
            <small class="edk-sub">最后一击终结</small>
          </div>
          <div class="end-detail-kpi">
            <span class="edk-label">核心加成维度</span>
            <b class="edk-val">工程/元素/全局</b>
            <small class="edk-sub">随遗物层数叠加</small>
          </div>
        </div>
        <div class="end-detail-section">
          <div class="end-detail-sec-title">◆ 伤害来源与加成机制</div>
          <div class="end-detail-desc">${_escRunHtml(ext.desc)}</div>
          <div class="end-detail-note">📈 强化途径：${_escRunHtml(ext.scale)}</div>
        </div>`;
    }
  } else if (kind === 'taken') {
    listLen = st.tEntries.length;
    const entry = st.tEntries.find(e => e.key === id);
    if (!entry) return false;
    const dos = entry.dossier || _resolveThreatDossier(entry.key, entry.name, entry.icon);
    codexTarget = dos.codexTab || 'monsters';
    const pct = st.totalTaken > 0 ? Math.min(100, (entry.dmg / st.totalTaken) * 100) : 0;
    const pctTxt = st.totalTaken > 0 ? `${pct.toFixed(1)}%` : '0%';
    const avgTaken = entry.hits > 0 ? (entry.dmg / entry.hits).toFixed(1) : String(entry.dmg);
    const isFatal = !!(entry.fatal && !st.win);

    if (kickerEl) kickerEl.textContent = 'THREAT & DAMAGE DOSSIER · 魔物与机关承伤档案';
    if (titleEl) titleEl.textContent = `${dos.name} · 招式与承伤拆解`;

    const artHtml = dos.spriteUrl
      ? `<img src="${dos.spriteUrl}" alt="${_escRunAttr(dos.name)}" class="end-detail-mob-img">`
      : `<span class="end-detail-emoji">${_escRunHtml(dos.icon)}</span>`;

    bodyEl.innerHTML = `
      <div class="end-detail-hero">
        <div class="item-emblem ${dos.tierCls || 't2'} end-detail-emblem">${artHtml}</div>
        <div class="end-detail-hero-info">
          <div class="end-detail-name">${_escRunHtml(dos.name)}${dos.epithet ? ` <span class="end-detail-evo-sub">· ${_escRunHtml(dos.epithet)}</span>` : ''}</div>
          <div class="card-badges">
            <span class="tag ${dos.tierCls || 't2'}">${_escRunHtml(dos.badge)}</span>
            <span class="tag">${_escRunHtml(dos.wave)}</span>
            ${isFatal ? '<span class="tag t5">💀 本局致命终结源</span>' : ''}
          </div>
        </div>
        ${dos.portraitUrl ? `<img src="${dos.portraitUrl}" alt="${_escRunAttr(dos.name)}" class="end-detail-boss-port">` : ''}
      </div>
      <div class="end-detail-kpis">
        <div class="end-detail-kpi">
          <span class="edk-label">累计造成伤害</span>
          <b class="edk-val crimson">-${_fmtRunNum(entry.dmg)}</b>
          <small class="edk-sub">承伤占比 ${pctTxt}</small>
        </div>
        <div class="end-detail-kpi">
          <span class="edk-label">命中主角次数</span>
          <b class="edk-val">${_fmtRunNum(entry.hits)} 次</b>
          <small class="edk-sub">单次均伤 ${avgTaken}</small>
        </div>
        <div class="end-detail-kpi">
          <span class="edk-label">单次最高重击</span>
          <b class="edk-val crimson">-${_fmtRunNum(entry.maxHit || Math.round(entry.dmg / Math.max(1, entry.hits)))}</b>
          <small class="edk-sub">本局受击峰值</small>
        </div>
        <div class="end-detail-kpi">
          <span class="edk-label">威胁定位</span>
          <b class="edk-val">${isFatal ? '💀 致命一击' : '⚔️ 交锋威胁'}</b>
          <small class="edk-sub">${_escRunHtml(dos.roleTag)}</small>
        </div>
      </div>
      ${dos.stats ? `<div class="stat-chips" style="margin-bottom:2px"><span class="stat-chip">${_escRunHtml(dos.stats)}</span></div>` : ''}
      <div class="end-detail-section">
        <div class="end-detail-sec-title">◆ 生态特征与招式机制</div>
        <div class="end-detail-desc">${_escRunHtml(dos.desc)}</div>
        ${dos.counterTip ? `<div class="end-detail-note">💡 应对提示：${_escRunHtml(dos.counterTip)}</div>` : ''}
      </div>`;
  } else if (kind === 'item') {
    listLen = st.iEntries.length;
    const entry = st.iEntries.find(e => e.id === id);
    if (!entry || !entry.item) return false;
    codexTarget = 'items';
    const it = entry.item;
    const tagMap = {
      tech: '⚙️ 构装科技', staff: '🪄 秘术法杖', elemental: '🔥 元素异常',
      melee: '⚔️ 近战锋刃', ranged: '🏹 远程弹道', tank: '🛡️ 重装铁壁',
      crit: '🎯 精准暴击', dodge: '👟 灵巧闪避', vampire: '🩸 猩红汲取', explosive: '💥 爆破轰击'
    };
    const tagBadges = Array.isArray(it.tags)
      ? it.tags.map(tg => tagMap[tg] ? `<span class="tag">${tagMap[tg]}</span>` : '').join('')
      : '';
    if (kickerEl) kickerEl.textContent = 'MEMORY RELIC DOSSIER · 记忆遗物档案';
    if (titleEl) titleEl.textContent = `${it.name} · 遗物详情`;
    bodyEl.innerHTML = `
      <div class="end-detail-hero">
        <div class="item-emblem t${it.tier} end-detail-emblem">${_itmEmblem(it, it.tier)}</div>
        <div class="end-detail-hero-info">
          <div class="end-detail-name">${_escRunHtml(it.name)}</div>
          <div class="card-badges">
            <span class="tag t${it.tier}">${_escRunHtml(TIER_NAMES[it.tier] || ('T' + it.tier))}遗物</span>
            <span class="tag tag-owned">本局持有 ×${entry.count}</span>
            ${it.maxCount ? `<span class="tag">${it.maxCount === 1 ? '唯一遗物' : '叠加上限 ×' + it.maxCount}</span>` : ''}
            ${tagBadges}
          </div>
        </div>
      </div>
      <div class="end-detail-section">
        <div class="end-detail-sec-title">◆ 遗物效果说明</div>
        <div class="end-detail-desc">${_escRunHtml(it.desc)}</div>
        <div class="end-detail-note">💎 商店基准价值：◇${it.cost} · 本局共收入行囊 ${entry.count} 件</div>
      </div>`;
  } else {
    return false;
  }

  if (footEl) {
    const navHtml = listLen > 1
      ? `<button type="button" class="btn btn-sec" onclick="stepEndSummaryDetail(-1)">◀ 上一项</button>
         <button type="button" class="btn btn-sec" onclick="stepEndSummaryDetail(1)">下一项 ▶</button>`
      : '';
    footEl.innerHTML = `
      ${navHtml}
      <button type="button" class="btn btn-sec" onclick="jumpEndDetailToCodex('${codexTarget}')">📖 在圣典中查阅</button>
      <button type="button" class="btn btn-go" onclick="closeEndSummaryDetail()">完成</button>`;
  }

  modal.classList.remove('hidden');
  modal.scrollTop = 0;
  return true;
}
globalThis.openEndSummaryDetail = openEndSummaryDetail;

if (typeof window !== 'undefined' && window.addEventListener && !window.__endDetailEscBound) {
  window.__endDetailEscBound = true;
  window.addEventListener('keydown', ev => {
    if (!ev || ev.key !== 'Escape') return;
    const modal = typeof document !== 'undefined' ? document.getElementById('endDetailModal') : null;
    if (modal && modal.classList && !modal.classList.contains('hidden')) {
      if (ev.preventDefault) ev.preventDefault();
      if (ev.stopPropagation) ev.stopPropagation();
      closeEndSummaryDetail();
    }
  });
}

function renderEndRunSummary(win = false) {
  closeEndSummaryDetail();
  const panel = typeof document !== 'undefined' ? document.getElementById('endSummaryPanel') : null;
  if (!panel || !player) return;
  const rs = (player.runStats && typeof player.runStats === 'object') ? player.runStats : { weaponDmg: {}, dmgTaken: {}, totalDealt: 0, totalTaken: 0 };
  const wMap = Object.assign({}, rs.weaponDmg || {});
  const tMap = Object.assign({}, rs.dmgTaken || {});

  // 合并玩家当前随身兵装（即使刚购入尚未打出伤害也能展示在赛后面板中）
  const bestEquipped = {};
  const equippedCounts = {};
  for (const w of (player.weapons || [])) {
    if (!w || !WEAPONS[w.id]) continue;
    equippedCounts[w.id] = (equippedCounts[w.id] || 0) + 1;
    const prev = bestEquipped[w.id];
    if (!prev || (w.tier || 1) > (prev.tier || 1) || (w.evo && !prev.evo)) {
      bestEquipped[w.id] = w;
    }
    if (!wMap[w.id]) wMap[w.id] = { dmg: 0, hits: 0, kills: 0 };
  }

  const wEntries = Object.keys(wMap).map(id => {
    const rec = wMap[id] || { dmg: 0, hits: 0, kills: 0 };
    const tpl = WEAPONS[id];
    const eq = bestEquipped[id];
    const extra = _EXTRA_DMG_META[id];
    let name = tpl ? tpl.name : (rec.name || (extra ? extra.name : id));
    let badge = '';
    let iconHtml = rec.icon || (extra ? extra.icon : '⚔️');
    let showTier = 1;
    let showEvo = '';
    if (tpl) {
      showTier = eq ? (eq.tier || 1) : Math.max(rec.tier || 1, tpl.minTier || 1);
      showEvo = eq && eq.evo ? eq.evo : '';
      name = _wpnDispName(id, showTier, showEvo);
      badge = TIER_NAMES[showTier] || `阶${showTier}`;
      iconHtml = _wpnEmblem(id, showTier, showEvo, tpl.icon);
    } else {
      badge = (extra && extra.cat) ? extra.cat.slice(0, 4) : '构装/战技';
    }
    return {
      id,
      name,
      badge,
      iconHtml,
      tier: showTier,
      evo: showEvo,
      ownedCount: equippedCounts[id] || 0,
      dmg: Math.max(0, Math.round(rec.dmg || 0)),
      hits: Math.max(0, Math.round(rec.hits || 0)),
      kills: Math.max(0, Math.round(rec.kills || 0))
    };
  }).filter(e => e.dmg > 0 || bestEquipped[e.id]).sort((a, b) => (b.dmg - a.dmg) || (b.kills - a.kills));

  const sumDealt = wEntries.reduce((acc, e) => acc + e.dmg, 0);
  const totalDealt = Math.max(sumDealt, Math.round(rs.totalDealt || 0));

  const tEntries = Object.keys(tMap).map(key => {
    const rec = tMap[key] || {};
    const dossier = _resolveThreatDossier(key, rec.name || '未知威胁', rec.icon || '👾');
    return {
      key,
      name: dossier.name || rec.name || '未知威胁',
      icon: dossier.icon || rec.icon || '👾',
      dossier,
      dmg: Math.max(0, Math.round(rec.dmg || 0)),
      hits: Math.max(0, Math.round(rec.hits || 0)),
      maxHit: Math.max(0, Math.round(rec.maxHit || 0)),
      fatal: !!rec.fatal
    };
  }).filter(e => e.dmg > 0).sort((a, b) => (b.dmg - a.dmg) || (b.hits - a.hits));

  const sumTaken = tEntries.reduce((acc, e) => acc + e.dmg, 0);
  const totalTaken = Math.max(sumTaken, Math.round(rs.totalTaken || 0));

  const iEntries = [];
  if (player.items && typeof player.items === 'object') {
    for (const [iid, cnt] of Object.entries(player.items)) {
      if (!cnt || cnt <= 0) continue;
      const itObj = ITEMS.find(x => x && x.id === iid);
      if (itObj) iEntries.push({ id: iid, item: itObj, count: cnt, tier: itObj.tier || 1 });
    }
    iEntries.sort((a, b) => (b.tier - a.tier) || (b.count - a.count));
  }

  _endSummaryState = { win: !!win, totalDealt, totalTaken, wEntries, tEntries, iEntries };

  const wRowsHtml = wEntries.length
    ? wEntries.map((e, idx) => {
        const pct = totalDealt > 0 ? Math.min(100, (e.dmg / totalDealt) * 100) : 0;
        const pctTxt = totalDealt > 0 ? `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%` : '0%';
        const safeId = _escRunAttr(e.id);
        const pillHtml = WEAPONS[e.id] ? _rarityPill(e.tier) : `<span class="bar-prog-badge">${_escRunHtml(e.badge)}</span>`;
        return `<div class="p5-row end-sum-row is-clickable${idx === 0 ? ' is-sel' : ''}" role="button" tabindex="0" data-sum-kind="dealt" data-sum-id="${safeId}" title="点击查看【${_escRunAttr(e.name)}】详情" onclick="openEndSummaryDetail('dealt','${safeId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEndSummaryDetail('dealt','${safeId}');}">
          <div class="p5-ico-edge"><div class="p5-ico-inner">${e.iconHtml}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge"><div class="p5-bar-fill">
            <div class="p5-bar-top">
              <div class="p5-title-group"><span class="p5-bar-title">${_escRunHtml(e.name)}</span>${pillHtml}</div>
              <div class="p5-bar-right"><span class="end-p5-val">${_fmtRunNum(e.dmg)} <small>(${pctTxt})</small></span></div>
            </div>
            <div class="p5-bar-cat">命中 ${e.hits} 次${e.kills > 0 ? ` · 净化 ${e.kills}` : ''} · 点击查看机制档案 ›</div>
          </div></div>
        </div>`;
      }).join('')
    : `<div class="end-sum-empty">本局尚未造成兵装伤害记录</div>`;

  const tRowsHtml = tEntries.length
    ? tEntries.map(e => {
        const pct = totalTaken > 0 ? Math.min(100, (e.dmg / totalTaken) * 100) : 0;
        const pctTxt = totalTaken > 0 ? `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%` : '0%';
        const safeKey = _escRunAttr(e.key);
        const thumbHtml = e.dossier && e.dossier.spriteUrl
          ? `<img src="${e.dossier.spriteUrl}" alt="${_escRunAttr(e.name)}" class="wpn-art-ico">`
          : _escRunHtml(e.icon);
        return `<div class="p5-row end-sum-row is-clickable${e.fatal && !win ? ' is-sel is-fatal' : ''}" role="button" tabindex="0" data-sum-kind="taken" data-sum-id="${safeKey}" title="点击查看【${_escRunAttr(e.name)}】招式与承伤详情" onclick="openEndSummaryDetail('taken','${safeKey}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEndSummaryDetail('taken','${safeKey}');}">
          <div class="p5-ico-edge"><div class="p5-ico-inner">${thumbHtml}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge"><div class="p5-bar-fill">
            <div class="p5-bar-top">
              <div class="p5-title-group"><span class="p5-bar-title">${_escRunHtml(e.name)}</span>${e.fatal && !win ? '<span class="t-rarity-pill tp-5">致命一击</span>' : ''}</div>
              <div class="p5-bar-right"><span class="end-p5-val taken">-${_fmtRunNum(e.dmg)} <small>(${pctTxt})</small></span></div>
            </div>
            <div class="p5-bar-cat">受击 ${e.hits} 次 · 单次最高 -${e.maxHit} · 点击查看招式对策 ›</div>
          </div></div>
        </div>`;
      }).join('')
    : `<div class="end-sum-empty flawless">✨ 全程零受伤 · 无瑕身法记录！</div>`;

  const iRowsHtml = iEntries.length
    ? iEntries.map(e => {
        const it = e.item;
        const safeId = _escRunAttr(e.id);
        const itIcoHtml = _itmEmblem(it, it.tier);
        return `<div class="p5-row end-sum-row is-clickable" role="button" tabindex="0" data-sum-kind="item" data-sum-id="${safeId}" title="点击查看【${_escRunAttr(it.name)}】详情" onclick="openEndSummaryDetail('item','${safeId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEndSummaryDetail('item','${safeId}');}">
          <div class="p5-ico-edge"><div class="p5-ico-inner">${itIcoHtml}</div></div>
          <div class="p5-notch" aria-hidden="true"></div>
          <div class="p5-bar-edge"><div class="p5-bar-fill">
            <div class="p5-bar-top">
              <div class="p5-title-group"><span class="p5-bar-title">${_escRunHtml(it.name)}</span>${_rarityPill(it.tier)}</div>
              <div class="p5-bar-right"><span class="end-p5-val">×${e.count}</span></div>
            </div>
            <div class="p5-bar-cat">${_escRunHtml(it.desc)}</div>
          </div></div>
        </div>`;
      }).join('')
    : `<div class="end-sum-empty">本局尚未获取记忆遗物</div>`;

  const armorVal = typeof getTotalArmor === 'function' ? getTotalArmor() : (player.armor || 0);
  const armorMit = typeof calcBrotatoArmorMitigation === 'function' ? Math.round(calcBrotatoArmorMitigation(armorVal) * 100) : 0;
  const dodgePct = Math.round(Math.min(player.dodgeCap || 0.80, Math.max(0, player.dodge || 0)) * 100);
  const lsPct = Math.round(Math.min(0.32, Math.max(0, player.lifesteal || 0)) * 100);

  _endSummaryTab = !win && tEntries.length ? 'taken' : 'dealt';
  if (typeof panel.setAttribute === 'function') panel.setAttribute('data-view', _endSummaryTab);
  panel.innerHTML = `
    <div class="end-p5-topbar">
      <div class="end-p5-kpis">
        <span>⚔️ 总输出 <b>${_fmtRunNum(totalDealt)}</b></span>
        <span>🩸 总承伤 <b class="taken">${_fmtRunNum(totalTaken)}</b></span>
        <span>🛡️ 护甲 <b>${armorVal}</b>(${armorMit >= 0 ? '-' + armorMit : '+' + Math.abs(armorMit)}%) · 闪避 <b>${dodgePct}%</b> · 汲血 <b>${lsPct}%</b></span>
      </div>
      <div class="end-p5-tabs">
        <div class="p5-chip-wrap"><button type="button" class="p5-chip end-sum-tab${_endSummaryTab === 'dealt' ? ' active on' : ''}" data-tab="dealt" onclick="setEndSummaryTab('dealt')"><span>⚔️ 兵装输出 (${wEntries.length})</span></button></div>
        <div class="p5-chip-wrap"><button type="button" class="p5-chip end-sum-tab${_endSummaryTab === 'taken' ? ' active on' : ''}" data-tab="taken" onclick="setEndSummaryTab('taken')"><span>🩸 魔物承伤 (${tEntries.length})</span></button></div>
        <div class="p5-chip-wrap"><button type="button" class="p5-chip end-sum-tab${_endSummaryTab === 'items' ? ' active on' : ''}" data-tab="items" onclick="setEndSummaryTab('items')"><span>🏺 本局遗物 (${iEntries.length})</span></button></div>
      </div>
    </div>
    <div class="end-sum-grid end-p5-lists">
      <div class="end-sum-col col-dealt p5-vstack">${wRowsHtml}</div>
      <div class="end-sum-col col-taken p5-vstack">${tRowsHtml}</div>
      <div class="end-sum-col col-items p5-vstack">${iRowsHtml}</div>
    </div>`;
}
globalThis.renderEndRunSummary = renderEndRunSummary;

function continueEndless() {
  if (state !== 'end' || !player || getSpireStoryProgress().ending !== 'B') return;
  closeEndSummaryDetail();
  endlessMode = true;
  beep(620, 0.09, 'triangle');
  document.getElementById('endMenu').classList.add('hidden');
  // 真结局后由第 17 层继续；没有把结局演出当成普通宝箱结算。
  pendingCrates = 0;
  player.bossCratesQueued = 0;
  player.mythicCratesQueued = 0;
  player.survivalCratesQueued = 0;
  player.survivalGoldCratesQueued = 0;
  pendingLevels = 0;
  wave = MAX_WAVE + 1;
  beginWave();
}
