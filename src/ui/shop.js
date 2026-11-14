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
  if (typeof pendingBossCutscene !== 'undefined') pendingBossCutscene = null;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
  return true;
}

function resolveSpireBossDefeat(enemy) {
  const flow = spireFloorFlow;
  if (!player || player.hp <= 0 || !isCurrentSpireFlow(flow) || flow.result !== 'active') return;
  // 一阶绝不能从这里通过：护栏也覆盖调试/外部伤害入口。
  if (enemy.storyPhaseBoss && enemy.storyStage !== 2) {
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
  // 剧场关闭后再回收战利品，避免箱子/奖励卡压在告别台词上。
  if (!endlessMode) {
    for (const drop of drops) {
      if (drop.kind !== 'crate') continue;
      if (drop.isMythic || pendingCrates < 3) {
        pendingCrates++;
        if (drop.isMythic) player.mythicCratesQueued = (player.mythicCratesQueued || 0) + 1;
        else if (drop.isBoss) player.bossCratesQueued = (player.bossCratesQueued || 0) + 1;
      } else player.mats += 16 + wave * 3;
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
  const titleEl = document.getElementById('evoTitle');
  const subEl = document.getElementById('evoSub');
  const box = document.getElementById('evoChoices');
  if (titleEl) titleEl.textContent = `【${tpl.name}】晋升五阶神话 · 二选一终极进化`;
  if (subEl) subEl.textContent = tpl.melee
    ? '择定唯一神话觉醒方向，永久重塑兵装圣徽并额外觉醒 20% 概率斩碎敌弹！'
    : '择定唯一神话觉醒方向，永久重塑兵装圣徽外观与专属战斗机制';
  if (box) {
    box.innerHTML = '';
    const sLabel = SET_DEFS[tpl.set] ? SET_DEFS[tpl.set].label.replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, '') : '';
    tpl.evos.slice(0, 2).forEach((opt, idx) => {
      const card = document.createElement('div');
      card.className = 'card t5 evo-choice-card';
      card.style.borderColor = opt.color || '#ff5c8a';
      if (card.style && typeof card.style.setProperty === 'function') {
        card.style.setProperty('--evo-accent', opt.color || '#ff5c8a');
      }
      const artHtml = _wpnEmblem(targetW.id, 5, opt.id, tpl.icon);
      card.innerHTML = `
        <div class="evo-branch-ribbon">BRANCH ${idx === 0 ? 'I' : 'II'} · 二选一神话分支</div>
        <div class="evo-art-stage">
          <div class="item-emblem t5 evo-emblem" style="border-color:${opt.color || '#ff5c8a'}">${artHtml}</div>
          <div class="evo-meta">
            <div class="evo-name" style="color:${opt.color || '#ffd6e5'}">${opt.name}</div>
            <div class="card-badges">
              <span class="tag t5">${opt.tag || '神话进化'}</span>
              ${sLabel ? `<span class="tag">${sLabel}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="card-desc evo-desc">${opt.desc}</div>
          <div class="card-actions">
            <button type="button" class="btn btn-go evo-pick-btn">◆ 觉醒「${opt.name}」</button>
          </div>
        </div>`;
      const pick = () => {
        // 已销毁的卡片与双击均不能修改新一局或覆盖已经选定的分支。
        if (serial !== _evoUiSerial || player !== owner || wave !== ownerWave ||
            targetW !== getPendingEvoWeapon()) return;
        applyWeaponEvolution(targetW, idx);
        beep(880, 0.14, 'triangle', 0.08);
        if (state === 'shop') renderShop();
        checkPendingWeaponEvolutions();
      };
      const btn = card.querySelector('.evo-pick-btn');
      if (btn) btn.onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); pick(); };
      if (uiMode !== 'desktop') card.onclick = pick;
      box.appendChild(card);
    });
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

  // 经济与等级差额津贴（精准补偿 40 秒 70% 削减怪物的晶石与经验产出，外加身法评级赏金）
  const crystalMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.70;
  const baseBounty = Math.max(14, Math.round((19 + wave * 4.3) * crystalMul));
  const masterBonus = survivalTrialHits === 0
    ? Math.max(10, Math.round((13 + wave * 2.5) * crystalMul))
    : (survivalTrialHits <= 2 ? Math.max(6, Math.round((7 + wave * 1.5) * crystalMul)) : 0);
  const totalMatGain = baseBounty + masterBonus;
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
  const crystalMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.70;
  const matRate = typeof getWaveMatRate === 'function' ? getWaveMatRate(wave) : (0.92 * crystalMul / (1 + Math.min(5, Math.max(0, wave - 1)) * 0.14 + Math.max(0, wave - 6) * 0.075));
  // 自动回收地上 50% 未拾取晶石 + 适度通关津贴 + 【收获】成长分红 + 【理财冠】利息（整体晶石产出下调 30%）
  const leftover = Math.round(leftoverMats * matRate * 0.50);
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

// 流派倾向隐藏概率暗增系统：当主角明显走某一流派（武器/遗物/专精成型度跨过阈值）时，对应流派兵装与遗物刷新权重暗增，最高严格封顶 +10%（1.10x）！
const ARCHETYPE_HIDDEN_BOOST_MAX = 0.10;

function getArchetypeAffinityBoosts(p = player) {
  const boosts = {
    tech: 0, staff: 0, elemental: 0, melee: 0, ranged: 0,
    tank: 0, crit: 0, dodge: 0, vampire: 0, explosive: 0
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
  const rawScores = {
    tech: (p.cls === 'engineer' ? 0.26 : 0) + techW * 0.26 + constructCnt * 0.25 + (p.techBonus || 0) * 1.35 + ((p.turretAspdBonus || 0) + (p.mineHaste || 0)) * 0.9,
    staff: staffW * 0.34 + ((p.staffVolley || 0) + (p.staffPierce || 0)) * 0.26 + (p.staffHaste || 0) * 1.25 + (p.archmageMeteor ? 0.36 : 0) + Math.max(0, (p.staffRange || 0)) * 0.006,
    elemental: elemW * 0.26 + staffW * 0.12 + (p.elemBonus || 0) * 1.45 + ((p.burnChance || 0) + (p.chillChance || 0) + (p.poisonChance || 0)) * 0.78 + (p.dotHaste || 0) * 1.15 + (p.elemCrit ? 0.28 : 0),
    melee: (p.cls === 'brawler' ? 0.26 : 0) + meleeW * 0.25 + (p.meleeBonus || 0) * 1.45 + (p.meleeSweepBonus || 0) * 0.20,
    ranged: (p.cls === 'ranger' ? 0.26 : 0) + rangedW * 0.25 + (p.rangedBonus || 0) * 1.45 + ((p.bounceBonus || 0) + (p.pierceBonus || 0)) * 0.20,
    tank: (p.cls === 'bull' ? 0.36 : 0) + heavyW * 0.24 + Math.max(0, p.armor || 0) * 0.055 + Math.max(0, (p.maxHp || 30) - 36) * 0.014 + (p.maxShield || 0) * 0.028,
    crit: preciseW * 0.25 + Math.max(0, (p.crit || 0) - 0.06) * 1.65 + Math.max(0, p.critDmg || 0) * 0.55,
    dodge: (p.cls === 'ghost' ? 0.26 : 0) + Math.max(0, (p.dodge || 0) - 0.04) * 1.65 + (p.dashSurge ? 0.26 : 0),
    vampire: (p.cls === 'vampire' ? 0.28 : 0) + Math.max(0, p.lifesteal || 0) * 2.50,
    explosive: (p.blastChance || 0) * 1.65 + Math.max(0, (p.explosionScale || 1) - 1) * 1.35 + heavyW * 0.12
  };

  for (const k of Object.keys(boosts)) {
    const s = rawScores[k] || 0;
    // 成型度 >= 0.35 判定为明显走该流派，线性暗增至最高 +10%（0.10）封顶
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
  const crystalMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.70;
  const recycleVal = Math.max(6, Math.round(tpl.cost * tierMul * getShopScale() * 0.48 * crystalMul));
  const canMergeNow = player.weapons.some(w => w.id === pickedId && w.tier === effTier && w.tier < 5);
  return { kind: 'weapon', id: pickedId, tpl, tier: effTier, recycleVal, canMergeNow, autoReplaceLowest };
}

function showCrateMenu() {
  state = 'crate';
  const cm = document.getElementById('crateMenu');
  if (!cm) { pendingCrates = 0; advancePostWave(); return; }
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
  const crystalMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.70;
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
    if (isMythicCrate && player.mythicCratesQueued > 0) player.mythicCratesQueued--;
    else if (isSurvivalGoldCrate && player.survivalGoldCratesQueued > 0) player.survivalGoldCratesQueued--;
    else if (isSurvivalCrate && player.survivalCratesQueued > 0) player.survivalCratesQueued--;
    else if (isBossCrate && player.bossCratesQueued > 0) player.bossCratesQueued--;
    pendingCrates--;
    advancePostWave();
  };

  const box = document.getElementById('crateBox');
  box.innerHTML = '';
  box.classList.toggle('single', choices.length <= 1);

  choices.forEach(c => {
    const el = document.createElement('div');
    el.className = `card t${c.tier}`;
    let icon = '🏮', title = '', badgesHtml = '', descHtml = '';
    if (isMythicCrate) badgesHtml += `<span class="tag t4">神骸二阶段</span>`;
    else if (isSurvivalGoldCrate) badgesHtml += `<span class="tag t4">蚀界无瑕秘宝</span>`;
    else if (isSurvivalCrate) badgesHtml += `<span class="tag t3">蚀界渡劫秘宝</span>`;
    else if (isBossCrate) badgesHtml += `<span class="tag tag-merge">主宰秘宝</span>`;

    if (c.kind === 'item') {
      const it = c.item;
      const ownedCnt = (player.items && player.items[it.id]) || 0;
      icon = it.icon;
      title = it.name;
      badgesHtml += `<span class="tag t${it.tier}">${TIER_NAMES[it.tier]}遗物</span>`;
      if (it.maxCount) badgesHtml += `<span class="tag">${it.maxCount === 1 ? '唯一' : '上限×' + it.maxCount}</span>`;
      if (ownedCnt > 0) badgesHtml += `<span class="tag tag-owned">已持有 ×${ownedCnt}</span>`;
      descHtml = `<div class="card-desc">${it.desc}</div>`;
    } else if (c.kind === 'weapon') {
      const tpl = c.tpl;
      const setLabel = ((SET_DEFS[tpl.set] && SET_DEFS[tpl.set].label) || '').replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, '');
      icon = _wpnEmblem(c.id, c.tier, '', tpl.icon);
      title = `${tpl.name} · 阶${c.tier}`;
      badgesHtml += `<span class="tag t${c.tier}">${TIER_NAMES[c.tier]}兵装</span>`;
      if (tpl.isStaff) badgesHtml += `<span class="tag">🪄法杖秘术</span>`;
      if (setLabel) badgesHtml += `<span class="tag">${setLabel}</span>`;
      if (c.canMergeNow) badgesHtml += c.tier === 4 ? `<span class="tag t5">可觉醒5阶神话</span>` : `<span class="tag tag-merge">可共鸣升阶</span>`;
      descHtml = `<div class="card-desc">${tpl.desc}</div>`;
    } else if (c.kind === 'supply') {
      const sup = c.supply;
      icon = sup.icon;
      title = sup.name;
      badgesHtml += `<span class="tag t${c.tier}">魂灯秘髓</span>`;
      descHtml = `<div class="card-desc">${sup.desc}</div>`;
    }

    el.innerHTML = `
      <div class="card-head" style="padding-right:0">
        <div class="item-emblem t${c.tier}">${icon}</div>
        <div class="card-meta">
          <div class="card-title">${title}</div>
          <div class="card-badges">${badgesHtml}</div>
        </div>
      </div>
      <div class="card-body">
        ${descHtml}
        <div class="crate-btns">
          <button class="btn take-btn" style="justify-content:center">◆ 收归行囊</button>
          <button class="btn btn-sec recycle-btn" style="justify-content:center">熔炼 (+◇${c.recycleVal})</button>
        </div>
      </div>`;

    el.querySelector('.take-btn').onclick = () => {
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
        logInfo('CRATE', `收下空投武器 ${c.tpl.name} Lv.${c.tier}`);
      } else if (c.kind === 'supply') {
        c.supply.apply(player, wave);
        logInfo('CRATE', `激活战术补给 ${c.supply.name}`);
      }
      syncSetHp();
      beep(660, 0.09, 'triangle');
      consumeCrate();
    };
    el.querySelector('.recycle-btn').onclick = () => {
      player.mats += c.recycleVal;
      beep(480, 0.07, 'sine');
      logInfo('CRATE', `熔炼补给 ${title} (+${c.recycleVal}💎)`);
      consumeCrate();
    };
    box.appendChild(el);
  });
}

function showLevelUp() {
  state = 'levelup';
  const lm = document.getElementById('levelMenu');
  lm.classList.remove('hidden');
  lm.scrollTop = 0;
  document.getElementById('lvlTitle').textContent = `魂灯共鸣 · 择定记忆刻印（余 ${pendingLevels} 次）`;
  const pool = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 4);
  const box = document.getElementById('lvlCards');
  box.innerHTML = '';
  pool.forEach(u => {
    const el = document.createElement('div');
    el.className = 'card t2';
    el.innerHTML = `
      <div class="card-head" style="padding-right:0">
        <div class="item-emblem t2">${u.icon}</div>
        <div class="card-meta">
          <div class="card-title">${u.name}</div>
          <div class="card-badges"><span class="tag t2">记忆刻印</span></div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-desc">${u.desc}</div>
        <div class="card-actions"><button class="btn" style="justify-content:center">◆ 铭刻共鸣</button></div>
      </div>`;
    const pick = () => {
      u.apply(player); syncSetHp(); beep(580, 0.07, 'triangle');
      logInfo('LEVELUP', `选择强化 ${u.name} (Lv.${player.lv})`);
      pendingLevels--;
      advancePostWave();
    };
    el.querySelector('button').onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); pick(); };
    if (uiMode !== 'desktop') el.onclick = pick;
    box.appendChild(el);
  });
}

// 商店波次通胀系数（严密对齐精简后期怪量后的单波晶石收益，保证 D0~D5 每波稳定购置与合成装备）
function getShopScale() {
  const endlessMul = wave > MAX_WAVE ? Math.pow(1.16, wave - MAX_WAVE) : 1;
  return (1 + (wave - 1) * 0.18 + Math.pow(Math.max(0, wave - 1), 1.22) * 0.028) * endlessMul * (diff.shopTax || 1);
}

let rerollRawCost = 2;

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
      // 结合流派倾向隐藏暗增（最高 +10%）与同名未满阶合成保底，既尊重流派成型又不锁死刷池
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
  shopOffers = locked;
  syncShopOfferDiscounts();
}

function openShop(fresh) {
  state = 'shop';
  confirmSellIdx = -1;
  syncSetHp();
  if (fresh) {
    survivalTrialQueued = false;
    // 亲民刷新定价（对齐原版《土豆兄弟》：第 1 波仅需 1💎 起刷、第 2 波 2💎，前期每次仅递增 +1💎）
    freeRerollsLeft = player.freeRerolls || 0;
    rerollBase = Math.max(1, Math.floor(wave * 0.75) + 1);
    rerollStep = Math.max(1, Math.floor(wave * 0.45) + 1);
    rerollRawCost = rerollBase;
    rerollCost = freeRerollsLeft > 0 ? 0 : calcDiscountedShopCost(rerollRawCost, 1);
    anvilUpgradedMsg = '';
    if (player.hasAnvil && player.weapons.length > 0) {
      const upgradable = player.weapons.filter(w => w.tier < 5);
      if (upgradable.length > 0) {
        const uw = upgradable[Math.floor(Math.random() * upgradable.length)];
        uw.tier++;
        if (player) player._sbCache = null;
        syncSetHp();
        const uwName = (WEAPONS[uw.id] && WEAPONS[uw.id].name) || uw.id;
        anvilUpgradedMsg = ` · ⚒️ 神砧免费升阶【${uwName} Lv${uw.tier}】!`;
        logInfo('SHOP', `铁匠神砧自动升阶 ${uwName} -> Lv.${uw.tier}`);
      }
    }
    mobDrawerOpen = false;
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

function renderShop() {
  syncShopOfferDiscounts();
  renderBuildSummary('statsRow', 'setRow');
  const witchImgEl = document.getElementById('shopMerchantPortrait');
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
    if (!witchImgEl._chatBound) {
      witchImgEl._chatBound = true;
      witchImgEl.style.cursor = 'pointer';
      const bonusTalks = [
        '雨还没停。先暖暖手，再看看缺什么。',
        '看见地上的预警就先让开。瞬步可以穿过弹雨，但要留一点余地。',
        '同名、同阶的兵装能合在一起。带得趁手，比带得多更要紧。',
        '想留的东西，替它扣上小锁。下次来，我还给你留着。'
      ];
      let talkIdx = 0;
      witchImgEl.onclick = () => {
        beep(640, 0.05, 'triangle', 0.035);
        const sEl = document.getElementById('shopSub');
        if (sEl) {
          sEl.textContent = bonusTalks[talkIdx % bonusTalks.length];
          talkIdx++;
        }
      };
    }
  }
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
  const rerollTxt = actualReroll === 0 ? `免费刷新 (${freeRerollsLeft})` : `刷新 (${actualReroll})`;
  const rb = document.getElementById('rerollBtn');
  rb.textContent = rerollTxt;
  rb.disabled = player.mats < actualReroll;
  const mrb = document.getElementById('mobRerollBtn');
  if (mrb) {
    mrb.textContent = rerollTxt;
    mrb.disabled = player.mats < actualReroll;
  }
  const canTrial = canOfferSurvivalTrialForWave(nextFloorNum);
  if (!canTrial) survivalTrialQueued = false;
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
      const titleTxt = survivalTrialQueued
        ? `🕯️ 已缔结蚀界契约 · 第 ${nextFloorNum} 层化为 40 秒绝境渡劫`
        : `🕯️ 蚀界生存试炼 · 将第 ${nextFloorNum} 层改为 40 秒身法躲避关`;
      const btnTxt = survivalTrialQueued ? '✓ 已开启试炼（点击取消）' : '🕯️ 踏入蚀界试炼';
      trialBar.innerHTML = `
        <div class="shop-trial-info">
          <div class="shop-trial-head">
            <span class="shop-trial-title">${titleTxt}</span>
            <span class="shop-trial-pill">${actLabel}</span>
            <span class="shop-trial-pill gold">必得紫色史诗/金色传说兵装+遗物匣</span>
          </div>
          <div class="shop-trial-desc">七类天外弹道与蚀界裂隙来袭 · 怪物仅留 <b>30%</b> · 浓雾提灯视野（瞬步跃裂隙/扩灯圈） · 撑满 <b>40秒</b> 必出<b>紫/金武器与道具</b>！</div>
        </div>
        <button type="button" id="shopTrialToggleBtn" class="shop-trial-toggle${survivalTrialQueued ? ' is-armed' : ''}" onclick="toggleSurvivalTrial()">${btnTxt}</button>`;
    }
  }

  const nextLabel = (canTrial && survivalTrialQueued)
    ? `🕯️ 踏入第 ${nextFloorNum} 层 · 蚀界试炼 (40s) →`
    : (!endlessMode && nextFloorNum === 16 ? '准备好了，推开终门 →' : nextIsBoss
        ? `◆ 迎战第 ${nextFloorNum} 层守誓首领 →`
        : `◆ 登往第 ${nextFloorNum} 层 →`);
  const dnb = document.getElementById('deskNextBtn');
  if (dnb) {
    dnb.textContent = nextLabel;
    dnb.classList.toggle('btn-trial-go', !!(canTrial && survivalTrialQueued));
  }
  const mnb = document.getElementById('mobNextBtn');
  if (mnb) {
    mnb.textContent = nextLabel;
    mnb.classList.toggle('btn-trial-go', !!(canTrial && survivalTrialQueued));
  }

  const totalRange = getTotalRangeBonus();
  const box = document.getElementById('shopCards');
  box.innerHTML = '';
  shopOffers.forEach((o, i) => {
    const el = document.createElement('div');
    if (!o) {
      el.className = 'card sold-out';
      el.innerHTML = `<span class="sold-stamp">✓ 已收入囊中</span>`;
      box.appendChild(el); return;
    }
    el.className = `card t${o.tier}${o.locked ? ' is-locked' : ''}`;
    if (o.kind === 'weapon') {
      const tpl = WEAPONS[o.id];
      if (!tpl) return;
      const sLabel = SET_DEFS[tpl.set] ? SET_DEFS[tpl.set].label.replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, '') : '';
      const scale = tpl.set === 'elemental' ? getElemMul() : (tpl.techScale ? getTechMul() : 1);
      const aspdBonus = tpl.aspdScale ? Math.max(0, getEffectiveAtkSpd() - 1) * 9 : 0;
      const rngBonus = tpl.rangeScale ? Math.max(0, totalRange) * tpl.rangeScale : 0;
      const hpBonus = tpl.hpScale ? Math.max(0, player.maxHp) * tpl.hpScale : 0;
      const armBonus = tpl.armorScale ? Math.max(0, getTotalArmor()) * tpl.armorScale : 0;
      const stickBonus = o.id === 'stick' ? Math.max(0, (getSetBonuses().sticks || 0)) * 4.8 : 0;
      const dmg = Math.round(((tpl.dmg + aspdBonus + rngBonus + hpBonus + armBonus) * (1 + (o.tier - 1) * 0.55) + stickBonus) * (getEffectiveDmgMul() + (tpl.melee ? player.meleeBonus : (tpl.isStaff ? 0 : (player.rangedBonus || 0)))) * scale);
      const effRange = typeof calcWeaponEffectiveRange === 'function'
        ? calcWeaponEffectiveRange(tpl, o.tier, null, totalRange)
        : Math.max(tpl.melee ? 74 : 54, tpl.range + (tpl.melee ? Math.round(totalRange * 0.56 + (player.meleeSweepBonus || 0) * 16) : totalRange) + (o.tier - 1) * (tpl.melee ? 8 : 13));
      const effCd = (tpl.cd / Math.max(0.18, getEffectiveAtkSpd() * (tpl.isStaff ? (1 + (player.staffHaste || 0)) : 1) * (1 + (o.tier - 1) * 0.08))).toFixed(2);
      const ok = player.mats >= o.cost && canBuyWeapon(o.id, o.tier);
      const hasMergePair = o.tier < 5 && player.weapons.some(w => w.id === o.id && w.tier === o.tier);
      const willAwakenT5 = hasMergePair && o.tier === 4;
      const pelletsTxt = tpl.pellets ? `×${tpl.pellets}` : '';
      const priceHtml = (o.rawCost && o.rawCost > o.cost)
        ? `<s style="opacity:.55;font-size:.82em;margin-right:3px">${o.rawCost}</s>◇ ${o.cost}`
        : `◇ ${o.cost}`;
      el.innerHTML = `
        <div class="card-main">
          <div class="card-head">
            <div class="item-emblem t${o.tier}">${_wpnEmblem(o.id, o.tier, '', tpl.icon)}</div>
            <div class="card-meta">
              <div class="card-title">${tpl.name}</div>
              <div class="card-badges">
                <span class="tag t${o.tier}">${TIER_NAMES[o.tier]}兵装</span>
                ${tpl.isStaff ? '<span class="tag">🪄法杖秘术</span>' : ''}
                <span class="tag">${sLabel}</span>
                ${willAwakenT5 ? '<span class="tag t5">合成觉醒5阶!</span>' : (hasMergePair ? '<span class="tag tag-merge">可升阶</span>' : '')}
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="card-desc">${tpl.desc}</div>
            <div class="stat-chips">
              <span class="stat-chip">伤害 ${dmg}${pelletsTxt}</span>
              <span class="stat-chip">间隔 ${effCd}s</span>
              <span class="stat-chip">射程 ${effRange}</span>
            </div>
          </div>
        </div>
        <div class="card-side">
          <button class="lock-pin lock${o.locked ? ' is-locked' : ''}" title="${o.locked ? '点击解锁商品' : '锁定保留至下一层'}"><span>${o.locked ? '已锁定' : '保留'}</span></button>
          <div class="card-actions">
            <button class="btn buy${hasMergePair ? ' merge-ready' : ''}" ${ok ? '' : 'disabled'}>
              <span>${willAwakenT5 ? '觉醒五阶' : (hasMergePair ? (uiMode !== 'desktop' ? '共鸣升阶' : '购入升阶') : '购入')}</span>
              <span class="buy-price">${priceHtml}</span>
            </button>
          </div>
        </div>`;
      el.querySelector('.buy').onclick = () => {
        confirmSellIdx = -1;
        player.mats -= o.cost;
        addOrMergeWeapon(o.id, o.tier);
        logInfo('SHOP', `购入武器 ${tpl.name} Lv.${o.tier} (-${o.cost}💎, 剩余=${player.mats}💎)`);
        shopOffers[i] = null;
        beep(520, 0.07, 'triangle');
        renderShop();
        checkPendingWeaponEvolutions();
      };
    } else {
      const it = o.item;
      if (!it) return;
      const ok = player.mats >= o.cost;
      const ownedCnt = (player.items && player.items[it.id]) || 0;
      const priceHtml = (o.rawCost && o.rawCost > o.cost)
        ? `<s style="opacity:.55;font-size:.82em;margin-right:3px">${o.rawCost}</s>◇ ${o.cost}`
        : `◇ ${o.cost}`;
      el.innerHTML = `
        <div class="card-main">
          <div class="card-head">
            <div class="item-emblem t${o.tier}">${it.icon}</div>
            <div class="card-meta">
              <div class="card-title">${it.name}</div>
              <div class="card-badges">
                <span class="tag t${o.tier}">${TIER_NAMES[o.tier]}遗物</span>
                ${ownedCnt > 0 ? `<span class="tag tag-owned">已持有 ×${ownedCnt}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="card-desc">${it.desc}</div>
          </div>
        </div>
        <div class="card-side">
          <button class="lock-pin lock${o.locked ? ' is-locked' : ''}" title="${o.locked ? '点击解锁商品' : '锁定保留至下一层'}"><span>${o.locked ? '已锁定' : '保留'}</span></button>
          <div class="card-actions">
            <button class="btn buy" ${ok ? '' : 'disabled'}>
              <span>购入</span>
              <span class="buy-price">${priceHtml}</span>
            </button>
          </div>
        </div>`;
      el.querySelector('.buy').onclick = () => {
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
      };
    }
    el.querySelector('.lock').onclick = e => {
      if (e && e.stopPropagation) e.stopPropagation();
      confirmSellIdx = -1; o.locked = !o.locked; renderShop();
    };
    box.appendChild(el);
  });

  const sBox = document.getElementById('weaponSlots');
  sBox.innerHTML = '';
  if (player.maxSlots === 0) {
    document.getElementById('slotHint').textContent = '🐂 蛮牛铁卫特性：不可携带武器，堆叠生命、护甲、护盾与元素装备即可强化碰撞烈焰震荡波！';
  } else {
    const sellTipText = isTouch ? '双击单把可熔炼回收' : '点击单把可熔炼回收';
    document.getElementById('slotHint').innerHTML = `随身守誓兵装席 (<b>${player.weapons.length}</b>/${player.maxSlots})  ·  最高<b>5阶神话二选一进化</b>，同名同阶点击升阶，${sellTipText}`;
    player.weapons.forEach((w, idx) => {
      const tpl = WEAPONS[w.id];
      if (!tpl) return;
      const hasPair = w.tier < 5 && player.weapons.some((x, j) => j !== idx && x.id === w.id && x.tier === w.tier);
      const needsEvo = w.tier >= 5 && !w.evo && Array.isArray(tpl.evos) && tpl.evos.length >= 2;
      const tierMul = WEAPON_TIER_COST_MUL[w.tier] || 6.4;
      const refund = Math.max(4, Math.round(tpl.cost * tierMul * getShopScale() * 0.35));
      const confirming = !hasPair && !needsEvo && confirmSellIdx === idx && player.weapons.length > 1;
      const d = document.createElement('div');
      d.className = `slot t${w.tier}${confirming ? ' confirming' : ''}`;
      const isEvoDone = w.tier >= 5 && !!w.evoName;
      const dispName = isEvoDone ? w.evoName : `${tpl.name} · 阶${w.tier}`;
      const nameColor = isEvoDone ? (w.evoColor || TIER_COLORS[5]) : TIER_COLORS[w.tier];
      const badgeHtml = needsEvo
        ? '<span class="merge-badge evo-badge">觉醒!</span>'
        : (hasPair
          ? `<span class="merge-badge${w.tier === 4 ? ' evo-badge' : ''}">${w.tier === 4 ? '升5阶' : '升阶'}</span>`
          : (isEvoDone ? '<span class="merge-badge evo-badge">★神话</span>' : ''));
      const mobSub = needsEvo ? '点此二选一进化' : (hasPair ? (w.tier === 4 ? '点此觉醒5阶' : '点此升阶') : (player.weapons.length > 1 ? `回收 +◇${refund}` : '主兵装'));
      const tipTxt = needsEvo ? '点击择定进化' : (hasPair ? (w.tier === 4 ? '点击觉醒5阶神话' : '点击升阶') : (confirming ? '确认回收 +◇' + refund : '回收 +◇' + refund));
      d.innerHTML = `${badgeHtml}
        <div class="slot-icon">${_wpnEmblem(w.id, w.tier, w.evo || '', tpl.icon)}</div>
        <div class="slot-name" style="color:${nameColor}" title="${dispName}">${dispName}</div>
        <div class="slot-sub m-only">${mobSub}</div>
        <div class="sell-tip">${tipTxt}</div>`;
      d.onclick = () => {
        if (needsEvo) {
          confirmSellIdx = -1;
          checkPendingWeaponEvolutions();
          return;
        }
        if (hasPair) {
          confirmSellIdx = -1;
          mergeSlot(idx);
        } else if (player.weapons.length > 1) {
          if (isTouch && confirmSellIdx !== idx) {
            confirmSellIdx = idx;
            beep(400, 0.03, 'triangle');
            renderShop();
            return;
          }
          confirmSellIdx = -1;
          player.mats += refund; player.weapons.splice(idx, 1);
          if (player) player._sbCache = null;
          syncSetHp(); beep(320, 0.06);
          logInfo('SHOP', `回收武器 ${tpl.name} Lv.${w.tier} (+${refund}💎)`);
        }
        renderShop();
      };
      sBox.appendChild(d);
    });
    const showMax = Math.min(player.maxSlots, 6);
    for (let k = player.weapons.length; k < showMax; k++) {
      const emp = document.createElement('div');
      emp.className = 'slot-empty';
      emp.innerHTML = `<span>+ 空槽</span>`;
      sBox.appendChild(emp);
    }
  }
}

function rerollShop() {
  const actualCost = freeRerollsLeft > 0 ? 0 : rerollCost;
  if (player.mats < actualCost) return;
  confirmSellIdx = -1;
  if (mobDrawerOpen) {
    mobDrawerOpen = false;
    const sm = document.getElementById('shopMenu');
    if (sm) sm.classList.remove('drawer-open');
    const arr = document.getElementById('mobDrawerArrow');
    if (arr) arr.textContent = '详情 ▾';
  }
  player.mats -= actualCost;
  if (freeRerollsLeft > 0) {
    freeRerollsLeft--;
    rerollRawCost = rerollBase;
    rerollCost = freeRerollsLeft > 0 ? 0 : calcDiscountedShopCost(rerollRawCost, 1);
  } else {
    rerollRawCost = Math.max(rerollBase, (Number.isFinite(rerollRawCost) ? rerollRawCost : rerollBase)) + rerollStep;
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
    if (typeof pendingBossCutscene !== 'undefined') pendingBossCutscene = null;
    if (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.abortActive === 'function') {
      SpireDirector.abortActive();
    }
  }
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('pauseMenu').classList.add('hidden');
  const cm = document.getElementById('crateMenu');
  if (cm) cm.classList.add('hidden');
  const em = document.getElementById('endMenu');
  if (typeof em.setAttribute === 'function') em.setAttribute('data-result', win ? `ending-${ending}` : 'defeat');
  const actIndex = Math.max(1, Math.min(4, Math.ceil(wave / 4)));
  const background = !win && wave === 4
    ? 'assets/spire/v2/player-defeat-clean.png'
    : `assets/spire/scene_${actIndex}_vista.jpg`;
  const imageUrl = typeof resolveSpireAssetUrl === 'function' ? resolveSpireAssetUrl(background) :
    ((typeof window !== 'undefined' && window.__SPIRE_INLINE_ASSETS__ && window.__SPIRE_INLINE_ASSETS__[background]) || background);
  if (em.style && typeof em.style.setProperty === 'function') em.style.setProperty('--ending-art', `url("${imageUrl}")`);
  em.classList.remove('hidden');
  em.scrollTop = 0;
  document.getElementById('endlessBtn').classList.toggle('hidden', !win || ending !== 'B');
  const waveLabel = endlessMode ? `无尽第 ${wave} 层` : `第 ${wave} / ${MAX_WAVE} 层`;
  const retryBtn = document.getElementById('retryWaveBtn');
  if (retryBtn) {
    const canRetry = !win && typeof waveCheckpoint !== 'undefined' && !!(waveCheckpoint && waveCheckpoint.player);
    retryBtn.classList.toggle('hidden', !canRetry);
    retryBtn.textContent = '重试本层';
  }
  const abandonBtn = document.getElementById('abandonRestartBtn');
  if (abandonBtn) {
    abandonBtn.classList.add('hidden');
    abandonBtn.textContent = '放弃并从头开始';
  }
  const mainBtn = document.getElementById('endMainMenuBtn');
  if (mainBtn) {
    mainBtn.className = win ? 'btn btn-go' : 'btn btn-sec';
    mainBtn.textContent = win && ending === 'A' ? '再次提灯启程' : '返回主殿';
  }
  const clsObj = CLASSES.find(c => c.id === player.cls);
  const retries = (player && player.retryCount) || 0;
  logInfo('END', `${win ? (ending === 'A' ? '神座加冕' : '守誓者的破晓') : '本层败北'} · 角色=${clsObj ? clsObj.name : player.cls} · 波次=${wave} · Lv=${player.lv} · 击杀=${player.kills} · 重开=${retries}`);
  document.getElementById('endTitle').textContent = win ? (ending === 'A' ? '神座加冕' : '第一千道黎明') : '魂灯未熄';
  const storyNote = win
    ? (ending === 'A'
      ? '<br><span class="ending-story-note">你与镜中圣女合一，黑日吞没了世界。无边的孤寂中，记忆再次崩散。第一千次轮回开始了。</span>'
      : '<br><span class="ending-story-note">四位同伴的温暖残影与你斩碎了黑镜。长桥雨停，冰城苏醒，钟声终于向前。她们留在旧物、晨光与你的记忆里。</span>')
    : `<br><span class="ending-story-note">你倒在了${['雨夜长桥', '永冻冰窟', '倒悬钟楼', '日蚀镜界'][actIndex - 1]}。可以从第 ${wave} 层起点重新握紧提灯。</span>`;
  document.getElementById('endDesc').innerHTML =
    `厄度：<b>${diff.badge}</b>  ·  登塔者：<b>${clsObj ? clsObj.name : ''}</b>  ·  抵达：<b>${waveLabel}</b>  ·  共鸣：<b>Lv.${player.lv}</b>  ·  净化：<b>${player.kills}</b>` +
    (retries > 0 ? `  ·  回溯：<b>${retries} 次</b>` : '') + storyNote;
  renderEndRunSummary(win);
}

let _endSummaryTab = 'all';

function _fmtRunNum(val) {
  const n = Math.max(0, Math.round(val || 0));
  if (n >= 100000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 10000) return `${(n / 10000).toFixed(2)}万`;
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function _escRunHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const _EXTRA_DMG_META = {
  turret_gun: { name: '工程机炮塔', icon: '🏗️' },
  turret_laser: { name: '浮游贯日激光塔', icon: '🛸' },
  turret_shock: { name: '磁暴电弧线圈塔', icon: '⚡' },
  turret_totem: { name: '奥术共鸣方尖碑', icon: '🗿' },
  mine_blast: { name: '感应破片地雷', icon: '💣' },
  bull_charge: { name: '蛮牛烈焰冲撞', icon: '🐂' },
  thorns_reflect: { name: '黑曜反伤甲刺', icon: '🦔' },
  archmage_meteor: { name: '大魔导星陨天罚', icon: '☄️' },
  cyberball_bolt: { name: '幸运弹珠天雷', icon: '🔮' },
  elem_chain: { name: '元素共鸣电弧', icon: '⚡' },
  item_proc: { name: '遗物共鸣特效', icon: '✨' }
};

function setEndSummaryTab(tab) {
  _endSummaryTab = tab || 'all';
  const panel = typeof document !== 'undefined' ? document.getElementById('endSummaryPanel') : null;
  if (!panel) return;
  if (typeof panel.setAttribute === 'function') panel.setAttribute('data-view', _endSummaryTab);
  const btns = panel.querySelectorAll ? panel.querySelectorAll('.end-sum-tab') : [];
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    if (b && b.classList) b.classList.toggle('active', b.getAttribute('data-tab') === _endSummaryTab);
  }
}
globalThis.setEndSummaryTab = setEndSummaryTab;

function renderEndRunSummary(win = false) {
  const panel = typeof document !== 'undefined' ? document.getElementById('endSummaryPanel') : null;
  if (!panel || !player) return;
  const rs = (player.runStats && typeof player.runStats === 'object') ? player.runStats : { weaponDmg: {}, dmgTaken: {}, totalDealt: 0, totalTaken: 0 };
  const wMap = Object.assign({}, rs.weaponDmg || {});
  const tMap = Object.assign({}, rs.dmgTaken || {});

  // 合并玩家当前随身兵装（即使刚购入尚未打出伤害也能展示在赛后面板中）
  const bestEquipped = {};
  for (const w of (player.weapons || [])) {
    if (!w || !WEAPONS[w.id]) continue;
    const prev = bestEquipped[w.id];
    if (!prev || (w.tier || 1) > (prev.tier || 1) || (w.evo && !prev.evo)) {
      bestEquipped[w.id] = w;
    }
    if (!wMap[w.id]) wMap[w.id] = { dmg: 0, kills: 0 };
  }

  const wEntries = Object.keys(wMap).map(id => {
    const rec = wMap[id] || { dmg: 0, kills: 0 };
    const tpl = WEAPONS[id];
    const eq = bestEquipped[id];
    const extra = _EXTRA_DMG_META[id];
    let name = tpl ? tpl.name : (rec.name || (extra ? extra.name : id));
    let badge = '';
    let iconHtml = rec.icon || (extra ? extra.icon : '⚔️');
    if (tpl) {
      const showTier = eq ? (eq.tier || 1) : Math.max(rec.tier || 1, tpl.minTier || 1);
      const showEvo = eq && eq.evo ? eq.evo : '';
      const evoTitle = (eq && eq.evoName) || rec.evoName || '';
      if (evoTitle) badge = `★${evoTitle}`;
      else if (eq || rec.tier) badge = `阶${showTier}`;
      iconHtml = _wpnEmblem(id, showTier, showEvo, tpl.icon);
    } else {
      badge = '构装/战技';
    }
    return { id, name, badge, iconHtml, dmg: Math.max(0, Math.round(rec.dmg || 0)), kills: Math.max(0, Math.round(rec.kills || 0)) };
  }).filter(e => e.dmg > 0 || bestEquipped[e.id]).sort((a, b) => (b.dmg - a.dmg) || (b.kills - a.kills));

  const sumDealt = wEntries.reduce((acc, e) => acc + e.dmg, 0);
  const totalDealt = Math.max(sumDealt, Math.round(rs.totalDealt || 0));

  const tEntries = Object.keys(tMap).map(key => {
    const rec = tMap[key] || {};
    return {
      key,
      name: rec.name || '未知威胁',
      icon: rec.icon || '👾',
      dmg: Math.max(0, Math.round(rec.dmg || 0)),
      hits: Math.max(0, Math.round(rec.hits || 0)),
      fatal: !!rec.fatal
    };
  }).filter(e => e.dmg > 0).sort((a, b) => (b.dmg - a.dmg) || (b.hits - a.hits));

  const sumTaken = tEntries.reduce((acc, e) => acc + e.dmg, 0);
  const totalTaken = Math.max(sumTaken, Math.round(rs.totalTaken || 0));

  const wRowsHtml = wEntries.length
    ? wEntries.map(e => {
        const pct = totalDealt > 0 ? Math.min(100, (e.dmg / totalDealt) * 100) : 0;
        const pctTxt = totalDealt > 0 ? `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%` : '0%';
        return `<div class="end-sum-row">
          <div class="end-sum-ico">${e.iconHtml}</div>
          <div class="end-sum-main">
            <div class="end-sum-line">
              <span class="end-sum-name">${_escRunHtml(e.name)}${e.badge ? `<em class="end-sum-tag">${_escRunHtml(e.badge)}</em>` : ''}</span>
              <span class="end-sum-val"><b>${_fmtRunNum(e.dmg)}</b> <small>(${pctTxt}${e.kills > 0 ? ` · 斩${e.kills}` : ''})</small></span>
            </div>
            <div class="end-sum-track"><div class="end-sum-fill dealt" style="width:${Math.max(pct > 0 ? 2 : 0, pct).toFixed(1)}%"></div></div>
          </div>
        </div>`;
      }).join('')
    : `<div class="end-sum-empty">本局尚未造成兵装伤害记录</div>`;

  const tRowsHtml = tEntries.length
    ? tEntries.map(e => {
        const pct = totalTaken > 0 ? Math.min(100, (e.dmg / totalTaken) * 100) : 0;
        const pctTxt = totalTaken > 0 ? `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%` : '0%';
        return `<div class="end-sum-row${e.fatal && !win ? ' is-fatal' : ''}">
          <div class="end-sum-ico emoji">${_escRunHtml(e.icon)}</div>
          <div class="end-sum-main">
            <div class="end-sum-line">
              <span class="end-sum-name">${_escRunHtml(e.name)}${e.fatal && !win ? '<em class="end-sum-fatal">致命</em>' : ''}</span>
              <span class="end-sum-val taken"><b>-${_fmtRunNum(e.dmg)}</b> <small>(${pctTxt} · 受击${e.hits}次)</small></span>
            </div>
            <div class="end-sum-track"><div class="end-sum-fill taken" style="width:${Math.max(pct > 0 ? 2 : 0, pct).toFixed(1)}%"></div></div>
          </div>
        </div>`;
      }).join('')
    : `<div class="end-sum-empty flawless">✨ 全程零受伤 · 无瑕身法记录！</div>`;

  const armorVal = typeof getTotalArmor === 'function' ? getTotalArmor() : (player.armor || 0);
  const armorMit = typeof calcBrotatoArmorMitigation === 'function' ? Math.round(calcBrotatoArmorMitigation(armorVal) * 100) : 0;
  const dodgePct = Math.round(Math.min(player.dodgeCap || 0.80, Math.max(0, player.dodge || 0)) * 100);
  const lsPct = Math.round(Math.min(0.32, Math.max(0, player.lifesteal || 0)) * 100);

  _endSummaryTab = (typeof uiMode !== 'undefined' && uiMode !== 'desktop') ? 'dealt' : 'all';
  if (typeof panel.setAttribute === 'function') panel.setAttribute('data-view', _endSummaryTab);
  panel.innerHTML = `
    <div class="end-sum-topbar">
      <div class="end-sum-kpis">
        <span>⚔️ 整局总输出 <b>${_fmtRunNum(totalDealt)}</b></span>
        <span>🩸 整局总承伤 <b class="taken">${_fmtRunNum(totalTaken)}</b></span>
        <span>🛡️ 护甲 <b>${armorVal}</b> (${armorMit >= 0 ? '减伤' + armorMit : '易伤' + Math.abs(armorMit)}%) · 闪避 <b>${dodgePct}%</b> · 吸血 <b>${lsPct}%</b></span>
      </div>
      <div class="end-sum-tabs">
        <button type="button" class="end-sum-tab${_endSummaryTab === 'all' ? ' active' : ''}" data-tab="all" onclick="setEndSummaryTab('all')">双栏总览</button>
        <button type="button" class="end-sum-tab${_endSummaryTab === 'dealt' ? ' active' : ''}" data-tab="dealt" onclick="setEndSummaryTab('dealt')">⚔️ 兵装输出</button>
        <button type="button" class="end-sum-tab${_endSummaryTab === 'taken' ? ' active' : ''}" data-tab="taken" onclick="setEndSummaryTab('taken')">🩸 魔物承伤</button>
      </div>
    </div>
    <div class="end-sum-grid">
      <div class="end-sum-col col-dealt">
        <div class="end-sum-col-head"><span>⚔️ 武器与构装输出统计</span><span>共 ${wEntries.length} 项</span></div>
        <div class="end-sum-list">${wRowsHtml}</div>
      </div>
      <div class="end-sum-col col-taken">
        <div class="end-sum-col-head"><span>🩸 魔物与机关承伤明细</span><span>共 ${tEntries.length} 源</span></div>
        <div class="end-sum-list">${tRowsHtml}</div>
      </div>
    </div>`;
}
globalThis.renderEndRunSummary = renderEndRunSummary;

function continueEndless() {
  if (state !== 'end' || !player || getSpireStoryProgress().ending !== 'B') return;
  endlessMode = true;
  beep(620, 0.09, 'triangle');
  document.getElementById('endMenu').classList.add('hidden');
  // 真结局后由第 17 层继续；没有把结局演出当成普通宝箱结算。
  pendingCrates = 0;
  pendingLevels = 0;
  wave = MAX_WAVE + 1;
  beginWave();
}
