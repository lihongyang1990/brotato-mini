// 60FPS 核心战术状态机主更新循环（移动、武器开火、投射物、怪物与首领 AI）
function compactAliveEnemies() {
  let w = 0;
  for (let r = 0; r < enemies.length; r++) { if (enemies[r] && enemies[r].hp > 0) enemies[w++] = enemies[r]; }
  enemies.length = w;
}
function hasBulletHit(b, target) { return b.lastHit === target || (b.hit ? b.hit.has(target) : false); }
function markBulletHit(b, target) {
  if (!b.lastHit) { b.lastHit = target; return; }
  if (b.lastHit === target) return;
  if (!b.hit) { b.hit = new Set(); b.hit.add(b.lastHit); }
  b.hit.add(target);
}
function unmarkBulletHitForBounce(b, nextTarget, curHit) {
  if (b.hit) b.hit.delete(nextTarget);
  if (curHit) {
    if (b.lastHit && b.lastHit !== curHit) { if (!b.hit) b.hit = new Set(); b.hit.add(b.lastHit); }
    b.lastHit = curHit;
    if (b.hit) b.hit.add(curHit);
  }
}
const _meleeTargets = [];
// 远程投射物严格「先弹射、后穿透」核心索敌器
function bounceBulletToNearest(b, curEnemy) {
  if (!(b.bounces > 0)) return false;
  let nextE = null, nextDSq = 410 * 410, reusedHit = false;
  for (let ci = 0; ci < enemies.length; ci++) {
    const cand = enemies[ci];
    if (cand && cand !== curEnemy && cand.hp > 0 && !cand.primed && !hasBulletHit(b, cand)) {
      const cdx = cand.x - b.x, cdy = cand.y - b.y;
      if (cdx >= 410 || cdx <= -410 || cdy >= 410 || cdy <= -410) continue;
      const cdSq = cdx * cdx + cdy * cdy;
      if (cdSq < nextDSq) { nextDSq = cdSq; nextE = cand; }
    }
  }
  if (!nextE && curEnemy) {
    nextDSq = 385 * 385;
    for (let ci = 0; ci < enemies.length; ci++) {
      const cand = enemies[ci];
      if (cand && cand !== curEnemy && cand.hp > 0 && !cand.primed) {
        const cdx = cand.x - b.x, cdy = cand.y - b.y;
        if (cdx >= 385 || cdx <= -385 || cdy >= 385 || cdy <= -385) continue;
        const cdSq = cdx * cdx + cdy * cdy;
        if (cdSq < nextDSq) { nextDSq = cdSq; nextE = cand; reusedHit = true; }
      }
    }
  }
  if (!nextE) return false;
  if (reusedHit) unmarkBulletHitForBounce(b, nextE, curEnemy);
  if (b.isGrenade) triggerExplosion(b.x, b.y, b.blastR || 76, b.dmg * 0.72, false, 0, '#ff9f1c', false);
  const spd = Math.max(240, Math.hypot(b.vx, b.vy)), na = Math.atan2(nextE.y - b.y, nextE.x - b.x);
  b.vx = Math.cos(na) * spd; b.vy = Math.sin(na) * spd; b.angle = na;
  b.x += Math.cos(na) * 4; b.y += Math.sin(na) * 4;
  b.bounces--;
  b.dmg *= Math.min(1.0, Math.max(0.45, 0.74 + (player.falloffMitigation || 0)));
  const flightNeed = (Math.sqrt(nextDSq) + 135) / spd;
  b.life = Math.max(b.life, Math.min(1.35, Math.max(0.52, flightNeed)));
  b.maxLife = Math.max(b.maxLife || b.life, b.life);
  if (typeof _frameSparks !== 'undefined' && _frameSparks < 14) { _frameSparks++; addSparks(b.x, b.y, na, b.isGrenade ? '#ff9f1c' : (b.isPebble ? '#e2e8f0' : '#72efdd'), 2); }
  if (typeof _frameHitBeeps !== 'undefined' && _frameHitBeeps < 2) { _frameHitBeeps++; beep(b.isPebble ? 490 : 610, 0.022, 'triangle', 0.018); }
  return true;
}


let _bossHudSeq = 0;

function spawnPlayerSpellZone(spec) {
  if (!spec || typeof spellZones === 'undefined') return null;
  const zoneScale = 1 + ((typeof player !== 'undefined' && player && player.staffZoneScale) ? player.staffZoneScale : 0);
  const zoneDurMul = 1 + ((typeof player !== 'undefined' && player && player.staffZoneDurBonus) ? player.staffZoneDurBonus : 0);
  const effR = (spec.r || 84) * zoneScale;
  const effLife = (spec.life || 3.2) * (spec.isMeteorTrail ? 1 : zoneDurMul);
  const mergeDist = spec.mergeDist !== undefined ? spec.mergeDist : 34;
  // 若同类型法阵在极近位置已存在，则刷新并强化，防止多把同法杖同点无意义叠百层粒子
  for (let i = 0; i < spellZones.length; i++) {
    const z = spellZones[i];
    if (z && z.kind === spec.kind && Math.hypot(z.x - spec.x, z.y - spec.y) < mergeDist) {
      z.life = Math.max(z.life, effLife);
      z.maxLife = Math.max(z.maxLife, effLife);
      z.r = Math.max(z.r, effR);
      z.dmg = Math.max(z.dmg, spec.dmg || 10);
      if (spec.collapseDmg) z.collapseDmg = Math.max(z.collapseDmg || 0, spec.collapseDmg);
      return z;
    }
  }
  if (spellZones.length >= 28) spellZones.shift();
  const dur = effLife;
  const zone = {
    kind: spec.kind || 'fire_patch',
    x: Math.max(54, Math.min(WORLD.w - 54, spec.x)),
    y: Math.max(54, Math.min(WORLD.h - 54, spec.y)),
    r: effR,
    life: dur,
    maxLife: dur,
    tick: spec.tickInterval || 0.40,
    tickInterval: spec.tickInterval || 0.40,
    dmg: spec.dmg || 10,
    critChance: spec.critChance || 0.08,
    critMult: spec.critMult || 1.95,
    srcId: spec.srcId || '',
    color: spec.color || '#ff6b35',
    freezeChance: spec.freezeChance || 0,
    forceBurn: !!spec.forceBurn,
    forcePoison: !!spec.forcePoison,
    collapseDmg: spec.collapseDmg || 0,
    isMeteorTrail: !!spec.isMeteorTrail,
    trailAng: Number.isFinite(spec.trailAng) ? spec.trailAng : 0,
    spin: Math.random() * 6.28,
    seed: Math.random() * 100
  };
  spellZones.push(zone);
  return zone;
}
if (typeof globalThis !== 'undefined') globalThis.spawnPlayerSpellZone = spawnPlayerSpellZone;

function detonateStaffFireball(b) {
  if (!b || b._fireballDetonated) return;
  b._fireballDetonated = true;
  const blastR = b.fireballBlastR || b.impactR || 76;
  const prevAct = _activeWeaponId;
  _activeWeaponId = b.srcId || 'ember_staff';
  try {
    triggerExplosion(b.x, b.y, blastR, b.dmg * 0.58, false, 0, b.color || '#ff6b35', true, 0, b.srcId || 'ember_staff');
    if (rings.length < 38) {
      rings.push({ x: b.x, y: b.y, r: blastR * 1.12, color: b.purgatoryMeteor ? '#5eead4' : '#ffd166', t: 0.28, maxT: 0.28, kind: 'star' });
    }
    spawnPlayerSpellZone({
      kind: 'fire_patch',
      x: b.x, y: b.y,
      r: Math.max(52, (b.trailR || blastR * 0.78)),
      life: 2.55,
      tickInterval: 0.42,
      dmg: b.dmg * 0.24,
      critChance: b.critChance || 0.08,
      critMult: b.critMult || 1.95,
      srcId: b.srcId || 'ember_staff',
      color: b.color || '#ff6b35',
      forceBurn: true,
      forcePoison: !!b.firePatchPoison,
      isMeteorTrail: true,
      trailAng: b.angle || 0,
      mergeDist: 20
    });
  } finally {
    _activeWeaponId = prevAct;
  }
}

// ☄️ Dota2 卡尔式【混沌陨石 (Chaos Meteor)】着陆爆震与翻滚碾压火海状态机
function touchdownChaosMeteor(b) {
  if (!b || b._landed) return;
  b._landed = true;
  b.meteorFallT = 0;
  const rollSpd = b.rollSpd || 236;
  b.vx = Math.cos(b.angle) * rollSpd;
  b.vy = Math.sin(b.angle) * rollSpd;
  b.life = b.rollDur || 1.28;
  b.maxLife = b.life;
  b.crushCd = 0.02;
  b.trailAcc = 0;
  b._expectX = b.x;
  b._expectY = b.y;
  beep(116, 0.15, 'sawtooth', 0.056);
  shake = Math.max(shake, 3.0);
  addBurst(b.x, b.y, b.purgatoryMeteor ? '#5eead4' : '#ff9f1c', 9, 155);
  detonateStaffFireball(b);
}

function tickChaosMeteor(b, idx, dt) {
  // 若外部（如单元测试）直接改动了坐标，立即触发着陆并生成熔火焦土轨迹
  if (!b._landed) {
    if (Number.isFinite(b._expectX) && Math.hypot(b.x - b._expectX, b.y - b._expectY) > 0.5) {
      b.meteorFallT = 0;
    } else {
      b.meteorFallT = (b.meteorFallT || 0) - dt;
      b.rollRot = (b.rollRot || 0) + dt * 5.2;
      b.smokeT = (b.smokeT || 0) - dt;
      if (b.smokeT <= 0) {
        b.smokeT = 0.032;
        const fallRatio = Math.max(0, Math.min(1, (b.meteorFallT || 0) / Math.max(0.05, b.meteorFallMax || 0.28)));
        const alt = fallRatio * 265;
        const sx = b.x - Math.cos(b.angle) * (alt * 0.48);
        const sy = b.y - alt - Math.sin(b.angle) * (alt * 0.20);
        pushParticle({
          x: sx + (Math.random() - 0.5) * 14,
          y: sy + (Math.random() - 0.5) * 14,
          vx: Math.cos(b.angle) * 45 + (Math.random() - 0.5) * 35,
          vy: 110 + Math.random() * 65,
          r: 4.8 + Math.random() * 3.8,
          color: b.purgatoryMeteor ? (Math.random() < 0.5 ? '#ccfbf1' : '#14b8a6') : (Math.random() < 0.5 ? '#fde047' : '#ff5400'),
          t: 0.22, maxT: 0.22
        });
      }
    }
    if ((b.meteorFallT || 0) <= 0) {
      touchdownChaosMeteor(b);
      if (state !== 'wave') return true;
    }
    return false;
  }

  // 已着陆：巨型熔岩陨石沿施法向量沉重向前翻滚碾压，并铺开整条焦土火海长廊！
  b.px = b.x; b.py = b.y;
  const stepX = b.vx * dt, stepY = b.vy * dt;
  b.x += stepX;
  b.y += stepY;
  b.life -= dt;
  b.rollRot = (b.rollRot || 0) + dt * 8.2;

  let hitArenaWall = false;
  if (b.x < 46) { b.x = 46; hitArenaWall = true; }
  else if (b.x > WORLD.w - 46) { b.x = WORLD.w - 46; hitArenaWall = true; }
  if (b.y < 46) { b.y = 46; hitArenaWall = true; }
  else if (b.y > WORLD.h - 46) { b.y = WORLD.h - 46; hitArenaWall = true; }
  b._expectX = b.x; b._expectY = b.y;

  // 翻滚扬起的滚烫火星与黑曜烟尘
  b.smokeT = (b.smokeT || 0) - dt;
  if (b.smokeT <= 0) {
    b.smokeT = 0.036;
    const perpA = b.angle + Math.PI * 0.5;
    const side = (Math.random() - 0.5) * b.r * 1.4;
    pushParticle({
      x: b.x - Math.cos(b.angle) * (b.r * 0.55) + Math.cos(perpA) * side,
      y: b.y - Math.sin(b.angle) * (b.r * 0.55) + Math.sin(perpA) * side,
      vx: -b.vx * 0.18 + (Math.random() - 0.5) * 42,
      vy: -b.vy * 0.18 - 18 + (Math.random() - 0.5) * 34,
      r: 4.5 + Math.random() * 4.2,
      color: b.purgatoryMeteor
        ? (Math.random() < 0.45 ? '#ecfeff' : '#2dd4bf')
        : (Math.random() < 0.42 ? '#fef08a' : (Math.random() < 0.75 ? '#ff6b35' : '#7f1d1d')),
      t: 0.28, maxT: 0.28
    });
  }

  // 每向前翻滚 42px 铺设一段相连的【焦土熔火长廊】节点
  b.trailAcc = (b.trailAcc || 0) + Math.hypot(stepX, stepY);
  if (b.trailAcc >= 42) {
    b.trailAcc -= 42;
    spawnPlayerSpellZone({
      kind: 'fire_patch',
      x: b.x - Math.cos(b.angle) * 10,
      y: b.y - Math.sin(b.angle) * 10,
      r: b.trailR || 54,
      life: 2.45,
      tickInterval: 0.42,
      dmg: b.dmg * 0.30,
      critChance: b.critChance || 0.08,
      critMult: b.critMult || 1.95,
      srcId: b.srcId || 'ember_staff',
      color: b.color || '#ff6b35',
      forceBurn: true,
      forcePoison: !!b.firePatchPoison,
      isMeteorTrail: true,
      trailAng: b.angle,
      mergeDist: 22
    });
  }

  // 陨石翻滚碾压晶树
  const crushR = b.crushR || 54;
  for (let tIdx = trees.length - 1; tIdx >= 0; tIdx--) {
    const tr = trees[tIdx];
    if (!tr || tr.hp <= 0 || hasBulletHit(b, tr)) continue;
    const tdx = tr.x - b.x, tdy = tr.y - b.y, thit = tr.r + crushR;
    if (tdx * tdx + tdy * tdy <= thit * thit) {
      markBulletHit(b, tr);
      hurtTree(tr, b.dmg * 0.9);
    }
  }

  // 周期性陨石本体翻滚接触碾压主伤害（每 0.26s 对触碰巨石的全体魔物结算一次重碾 + 顺向推挤 + 挂灼烧！）
  b.crushCd = (b.crushCd || 0) - dt;
  if (b.crushCd <= 0) {
    b.crushCd = 0.36;
    const prevActM = _activeWeaponId;
    _activeWeaponId = b.srcId || 'ember_staff';
    try {
      let crushedAny = false;
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (!e || e.hp <= 0 || e.primed) continue;
        const edx = e.x - b.x, edy = e.y - b.y, elim = crushR + e.r;
        if (edx * edx + edy * edy <= elim * elim) {
          crushedAny = true;
          const isCrit = Math.random() < (b.critChance || 0.08);
          const cDmg = b.dmg * 0.52 * (isCrit ? (b.critMult || 1.95) : 1);
          if (b.firePatchPoison) applyPoison(e, 1);
          hurtEnemy(e, cDmg, isCrit, b.angle, true, {
            srcId: b.srcId || 'ember_staff',
            knockMult: 0.85,
            forceBurn: true,
            forcePoison: !!b.firePatchPoison,
            silentHit: enemies.length > 24
          });
          if (state !== 'wave') return true;
        }
      }
      if (crushedAny && rings.length < 36) {
        rings.push({ x: b.x, y: b.y, r: crushR * 0.95, color: b.purgatoryMeteor ? '#2dd4bf' : '#ff9f1c', t: 0.16, maxT: 0.16 });
      }
    } finally {
      _activeWeaponId = prevActM;
    }
  }

  // 翻滚结束或撞击外墙：陨石崩裂终爆！
  if (b.life <= 0 || hitArenaWall) {
    const prevActEnd = _activeWeaponId;
    _activeWeaponId = b.srcId || 'ember_staff';
    try {
      triggerExplosion(b.x, b.y, (b.impactR || 72) * 0.82, b.dmg * 0.48, false, 0, b.color || '#ff6b35', true, 0, b.srcId || 'ember_staff');
      spawnPlayerSpellZone({
        kind: 'fire_patch',
        x: b.x, y: b.y,
        r: (b.trailR || 54) * 1.06,
        life: 2.35,
        tickInterval: 0.42,
        dmg: b.dmg * 0.30,
        critChance: b.critChance || 0.08,
        critMult: b.critMult || 1.95,
        srcId: b.srcId || 'ember_staff',
        color: b.color || '#ff6b35',
        forceBurn: true,
        forcePoison: !!b.firePatchPoison,
        isMeteorTrail: true,
        trailAng: b.angle,
        mergeDist: 18
      });
      addBurst(b.x, b.y, b.purgatoryMeteor ? '#99f6e4' : '#fde047', 8, 140);
    } finally {
      _activeWeaponId = prevActEnd;
    }
    if (state !== 'wave') return true;
    bullets.splice(idx, 1);
  }
  return false;
}

function update(dt) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  if (typeof SpireAudio !== 'undefined') SpireAudio.tick(dt);
  // 第一拍（0.72s）：一阶段首领在战场上迸发巨型扩散破防光圈 + 强烈震屏，播完后再揭开三镜分镜帷幕！
  if (state === 'wave' && typeof phase2ShatterFx !== 'undefined' && phase2ShatterFx && phase2ShatterFx.stage === 'rupture') {
    const rfx = phase2ShatterFx;
    rfx.t += dt;
    rfx.fxShake = Math.max(0, (rfx.fxShake || 0) - dt * 42);
    rfx.flashT = Math.max(0, (rfx.flashT || 0) - dt);
    if (shake > 0) shake = Math.max(0, shake - dt * 32);
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].t -= dt * 0.85;
      if (rings[i].t <= 0) rings.splice(i, 1);
    }
    for (let i = lightnings.length - 1; i >= 0; i--) {
      lightnings[i].t -= dt * 0.85;
      if (lightnings[i].t <= 0) lightnings.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.t -= dt * 0.9;
      if (p.t <= 0) particles.splice(i, 1);
    }
    if (rfx.t >= (rfx.dur || 0.72)) {
      if (rfx.boss) rfx.boss._ruptureHoldP1 = false;
      if (typeof SpireDirector !== 'undefined' && SpireDirector && SpireDirector.isActive()) {
        phase2ShatterFx = null;
        if (typeof SpireDirector.releaseRuptureHold === 'function') SpireDirector.releaseRuptureHold();
      } else if (typeof startPhase2ShatterSequence === 'function') {
        startPhase2ShatterSequence(rfx.boss || rfx.variant, rfx.afterRuptureMode || 'story');
      } else {
        phase2ShatterFx = null;
      }
    }
    return;
  }
  if (typeof SpireDirector !== 'undefined' && SpireDirector) {
    SpireDirector.update(dt);
    if (SpireDirector.isBlockingGameplay()) {
      // 剧情、选项与回看期间连刷怪预警也冻结，镜前作决定时不提前启动战斗。
      return;
    }
    const ts = typeof SpireDirector.getTimeScale === 'function' ? SpireDirector.getTimeScale() : 1;
    if (ts <= 0.001) return;
    dt *= ts;
  }
  if (state !== 'wave' || !player) return;
  if (typeof isSpireCombatSuspended === 'function' && isSpireCombatSuspended()) return;
  if (typeof isAudioModalOpen === 'function' && isAudioModalOpen()) return;
  if (typeof resetCombatFrameBudgets === 'function') resetCombatFrameBudgets();
  if (shake > 0) shake = Math.max(0, shake - dt * 28);
  if (player._atkPoseT > 0) player._atkPoseT = Math.max(0, player._atkPoseT - dt);
  if ((player._bhPullT || 0) > 0) player._bhPullT = Math.max(0, player._bhPullT - dt);
  player._waveElapsed = (player._waveElapsed || 0) + dt;
  if ((player.healSpdT || 0) > 0) player.healSpdT = Math.max(0, player.healSpdT - dt);
  if (typeof pendingBossCutscene !== 'undefined' && pendingBossCutscene && !bossCutscene && typeof startBossCutscene === 'function') {
    const pc = pendingBossCutscene;
    pendingBossCutscene = null;
    startBossCutscene(pc.mode, pc.variant, pc.title, pc.subtitle, pc.extraTag, pc.color, pc.accent, pc.dur, { fadeDur: pc.fadeDur });
  }
  // 二阶段「分镜碎裂 ➔ 斜切立绘名牌亮相 ➔ 二次碎裂切入战场」推进（名牌展示期暂停波次计时与敌弹，二次碎入战场立即恢复实机交锋！）
  if (typeof phase2ShatterFx !== 'undefined' && phase2ShatterFx) {
    const fx = phase2ShatterFx;
    fx.t += dt;
    fx.fxShake = Math.max(0, (fx.fxShake || 0) - dt * 42);
    fx.flashT = Math.max(0, (fx.flashT || 0) - dt);
    if (Array.isArray(fx.shards)) {
      for (let i = fx.shards.length - 1; i >= 0; i--) {
        const s = fx.shards[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 420 * dt;
        s.rot += s.vrot * dt;
        s.alpha -= dt * 1.12;
        if (s.alpha <= 0) fx.shards.splice(i, 1);
      }
    }
    if (fx.stage === 'nameplate') {
      if (fx.t >= (fx.dur || 1.75)) {
        if (typeof advancePhase2ShatterToArena === 'function') advancePhase2ShatterToArena();
      }
      return;
    } else {
      fx.hudT = Math.max(0, (fx.hudT || 0) - dt);
      if ((!fx.shards || fx.shards.length === 0) && fx.hudT <= 0) {
        phase2ShatterFx = null;
      }
    }
  }
  // 首领召唤 / 终局降临 / 隐藏神话二阶段全屏静止登场演出
  if (bossCutscene && bossCutscene.t > 0) {
    bossCutscene.t -= dt;
    for (let i = spawns.length - 1; i >= 0; i--) {
      const sp = spawns[i];
      if (sp.type === 'boss' || sp.type === 'special_boss' || sp.type === 'mini_boss') {
        sp.t -= dt;
        if (sp.t <= 0) {
          createEnemy(sp.x, sp.y, sp.type, sp.variant);
          spawns.splice(i, 1);
        }
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].t -= dt * 0.65;
      if (rings[i].t <= 0) rings.splice(i, 1);
    }
    for (let i = lightnings.length - 1; i >= 0; i--) {
      lightnings[i].t -= dt * 0.65;
      if (lightnings[i].t <= 0) lightnings.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt * 0.4;
      p.y += p.vy * dt * 0.4;
      p.t -= dt * 0.6;
      if (p.t <= 0) particles.splice(i, 1);
    }
    if (bossCutscene.t <= 0) bossCutscene = null;
    return;
  }
  if (player.bullCd > 0) player.bullCd -= dt;
  if (player._hsCd > 0) player._hsCd = Math.max(0, player._hsCd - dt);
  if (player._procBlastCd > 0) player._procBlastCd = Math.max(0, player._procBlastCd - dt);
  if (player._bloodNovaCd > 0) player._bloodNovaCd = Math.max(0, player._bloodNovaCd - dt);
  if (player._iceNovaCd > 0) player._iceNovaCd = Math.max(0, player._iceNovaCd - dt);
  if (player._plagueRingCd > 0) player._plagueRingCd = Math.max(0, player._plagueRingCd - dt);
  if (player._healTxtCd > 0) {
    player._healTxtCd = Math.max(0, player._healTxtCd - dt);
    if (player._healTxtCd <= 0 && (player._healTxtAcc || 0) > 0) {
      addText(player.x, player.y - 24, '+' + player._healTxtAcc, '#ff4d6d', 14, 0.50, false);
      player._healTxtAcc = 0;
    }
  }
  if (player.dashCd > 0) player.dashCd = Math.max(0, player.dashCd - dt);
  if (player.dashHasteT > 0) player.dashHasteT = Math.max(0, player.dashHasteT - dt);
  if (player.dashSurgeT > 0) player.dashSurgeT = Math.max(0, player.dashSurgeT - dt);
  if (player.meleeHitSpdT > 0) player.meleeHitSpdT = Math.max(0, player.meleeHitSpdT - dt);
  if (player._salvoCd > 0) player._salvoCd = Math.max(0, player._salvoCd - dt);
  if (player._lifestealCd > 0) player._lifestealCd = Math.max(0, player._lifestealCd - dt);
  if (player.turretOverclockT > 0) player.turretOverclockT = Math.max(0, player.turretOverclockT - dt);
  const envDmgMul = (typeof MONSTER_DMG_MUL === 'number' ? MONSTER_DMG_MUL : 1.20) *
    (typeof getMidLateWaveDmgMul === 'function' ? getMidLateWaveDmgMul(wave) : 1.0);
  if (player.magnetPulseT > 0) player.magnetPulseT = Math.max(0, player.magnetPulseT - dt);
  if (player.shieldHitT > 0) player.shieldHitT -= dt;
  if (player.chillSlowT > 0) player.chillSlowT = Math.max(0, player.chillSlowT - dt);
  if (sandGustT > 0) sandGustT = Math.max(0, sandGustT - dt);
  if (player.terrainHintT > 0) player.terrainHintT = Math.max(0, player.terrainHintT - dt);
  if (portalPairCd > 0) portalPairCd = Math.max(0, portalPairCd - dt);
  for (let i = banners.length - 1; i >= 0; i--) {
    banners[i].t -= dt;
    if (banners[i].t <= 0) banners.splice(i, 1);
  }
  for (let i = 0; i < terrains.length; i++) {
    if (terrains[i].pulse !== undefined) terrains[i].pulse += dt * 2.4;
  }
  for (let i = 0; i < portals.length; i++) {
    portals[i].pulse += dt * 3.0;
  }

  // 战场单一主题地形块判定（岩浆灼烫减速、毒泥沼阻滞腐蚀、寒冰台 D1=4s -> D5=2s 渐进减速累计至冰封 · 离冰 1秒后开始消退）
  let onLava = false, onSwamp = false, onIce = false;
  for (let i = 0; i < terrains.length; i++) {
    const tr = terrains[i];
    if (tr.kind === 'chasm') continue;
    if (isPointInTerrain(tr, player.x, player.y, player.r * 0.35)) {
      if (tr.kind === 'lava') onLava = true;
      else if (tr.kind === 'swamp') onSwamp = true;
      else if (tr.kind === 'ice_sheet') onIce = true;
    }
  }

  // 碎冕寒晶方砖台 / 翡翠毒沼 / 锻炉熔火槽状态机（D1 保持不变；D2->D5 阶梯递增地形对玩家影响最高 +30%）
  const terrainImpactMul = typeof getDiffTerrainImpactMul === 'function' ? getDiffTerrainImpactMul(diff) : 1.00;
  if ((player.frostThawImmT || 0) > 0) player.frostThawImmT = Math.max(0, player.frostThawImmT - dt);
  if ((player.iceFreezeT || 0) > 0) {
    player.iceFreezeT -= dt;
    if (player.iceFreezeT <= 0) {
      player.iceFreezeT = 0;
      player.frostGauge = 0;
      player.frostLeaveGrace = 0;
      player.frostThawImmT = 0.35;
      addBurst(player.x, player.y, '#bae6fd', 8, 125);
      addText(player.x, player.y - 38, '破冰解冻!', '#e0f2fe', 15, 1.1);
    }
  } else if (player.noSlow) {
    player.frostGauge = 0;
    player.frostLeaveGrace = 0;
  } else if (onIce && !(player.frostThawImmT > 0)) {
    player.frostLeaveGrace = 1.0;
    const prevGauge = player.frostGauge || 0;
    const iceTriggerSec = typeof getIceFreezeTriggerSec === 'function' ? getIceFreezeTriggerSec(diff) : 4.0;
    const iceFillRate = 5.0 / Math.max(0.5, iceTriggerSec);
    player.frostGauge = Math.min(5.0, prevGauge + dt * iceFillRate);
    if (prevGauge <= 0.05 && player.terrainHintT <= 0) {
      player.terrainHintT = 2.4;
      addText(player.x, player.y - 36, '寒霜侵蚀 · 渐进冰缓!', '#7dd3fc', 15, 1.6);
    }
    if (player.frostGauge >= 5.0) {
      player.frostGauge = 0;
      player.frostLeaveGrace = 0;
      player.iceFreezeT = +(1.0 * terrainImpactMul).toFixed(2);
      player.dashT = 0;
      beep(620, 0.14, 'triangle', 0.055);
      if (rings.length < 34) rings.push({ x: player.x, y: player.y, r: 54, color: '#7dd3fc', t: 0.30, maxT: 0.30, kind: 'hex' });
      addText(player.x, player.y - 42, `❄️ 寒霜满溢 · 冰封${player.iceFreezeT.toFixed(1).replace(/\.0$/, '')}秒!`, '#7dd3fc', 17, 1.5, true);
    }
  } else if ((player.frostGauge || 0) > 0) {
    if ((player.frostLeaveGrace || 0) > 0) {
      player.frostLeaveGrace = Math.max(0, player.frostLeaveGrace - dt);
    } else {
      player.frostGauge = Math.max(0, player.frostGauge - dt * 1.65);
    }
  }

  const frostRatio = (!player.noSlow && (player.frostGauge || 0) > 0) ? Math.min(1, player.frostGauge / 5.0) : 0;
  const frostSpdMul = frostRatio > 0 ? Math.max(0.68, 1 - frostRatio * 0.20 * terrainImpactMul) : 1;
  const swampSpdMul = Math.max(0.55, +(1 - 0.30 * terrainImpactMul).toFixed(3));
  const lavaSpdMul = Math.max(0.74, +(1 - 0.15 * terrainImpactMul).toFixed(3));
  player.terrainSpdMul = (player.iceFreezeT || 0) > 0
    ? 0
    : (frostRatio > 0
      ? frostSpdMul
      : ((onSwamp && !player.noSlow) ? swampSpdMul : ((onLava && !player.noSlow) ? lavaSpdMul : 1)));
  if (player.terrainHintT <= 0) {
    if (onSwamp && !player.noSlow) {
      player.terrainHintT = 2.8;
      addText(player.x, player.y - 36, `毒沼深陷 -${Math.round((1 - swampSpdMul) * 100)}%移速`, '#a3e635', 15, 1.8);
    } else if (onLava && !player.noSlow) {
      player.terrainHintT = 2.8;
      addText(player.x, player.y - 36, `熔岩灼足 -${Math.round((1 - lavaSpdMul) * 100)}%移速`, '#ff6b35', 15, 1.8);
    }
  }
  if (onLava && !player.noSlow) {
    player.lavaExposure = (player.lavaExposure || 0) + dt * terrainImpactMul;
    if (player.lavaExposure >= 0.26) {
      player.lavaTick = (player.lavaTick || 0) - dt;
      if (player.lavaTick <= 0) {
        player.lavaTick = 0.62;
        addText(player.x, player.y - 38, '岩浆灼烫!', '#ff6b35', 16, 1.6);
        hurtPlayer(Math.max(3, Math.round((3.0 + wave * 0.50) * envDmgMul * terrainImpactMul)), false, 'terrain_lava');
        if (state !== 'wave') return;
      }
    }
  } else {
    player.lavaExposure = Math.max(0, (player.lavaExposure || 0) - dt * 2.2);
    player.lavaTick = 0;
  }
  if (onSwamp && !player.noSlow) {
    player.swampExposure = (player.swampExposure || 0) + dt * terrainImpactMul;
    if (player.swampExposure >= 0.55) {
      player.swampTick = (player.swampTick || 0) - dt;
      if (player.swampTick <= 0) {
        player.swampTick = 0.85;
        addText(player.x, player.y - 38, '毒沼腐蚀!', '#a3e635', 15, 1.5);
        hurtPlayer(Math.max(2, Math.round((2.0 + wave * 0.35) * envDmgMul * terrainImpactMul)), false, 'terrain_swamp');
        if (state !== 'wave') return;
      }
    }
  } else {
    player.swampExposure = Math.max(0, (player.swampExposure || 0) - dt * 2.0);
    player.swampTick = 0;
  }

  // 🕯️ 蚀界生存试炼（D1=30s -> D5=45s 阶梯渡劫：七类机关陷阱密度提升 +50%、伤害提升 +20%）
  if (typeof survivalTrialWave !== 'undefined' && survivalTrialWave && !overtime) {
    const st = survivalTrialState || (survivalTrialState = {
      fogIntroP: 0, lanternBoostT: 0,
      volleyCd: 0.85, fissureCd: 1.55, corridorCd: 6.4, meteorCd: 11.5,
      crossCd: 3.4, chainCd: 4.8, vortexCd: 2.8
    });
    st.fogIntroP = Math.min(1, (st.fogIntroP || 0) + dt / 0.72);
    if ((st.lanternBoostT || 0) > 0) st.lanternBoostT = Math.max(0, st.lanternBoostT - dt);
    if ((player._fissureHitCd || 0) > 0) player._fissureHitCd = Math.max(0, player._fissureHitCd - dt);
    if ((player._fissureLeapHintCd || 0) > 0) player._fissureLeapHintCd = Math.max(0, player._fissureLeapHintCd - dt);

    const trialTotal = (typeof waveMaxTime === 'number' && waveMaxTime > 0)
      ? waveMaxTime
      : (typeof getSurvivalTrialDuration === 'function' ? getSurvivalTrialDuration(diff) : 30);
    const p1Cut = trialTotal * (2 / 3);
    const p2Cut = trialTotal * (1 / 3);
    const phase = waveTime > p1Cut ? 1 : (waveTime > p2Cut ? 2 : 3);
    if (phase >= 2 && !st.phase2Announced) {
      st.phase2Announced = true;
      announce('⚡ 蚀界裂变加剧 · 旋星十字裂光、连环坠星与交错裂隙降临！', '#c084fc', 2.8);
    } else if (phase >= 3 && !st.phase3Announced) {
      st.phase3Announced = true;
      announce(`🔥 最后 ${Math.max(8, Math.round(p2Cut))} 秒终末渡劫 · 剑阵走廊与冥渊雷涡全面狂暴！`, '#ffd166', 3.0);
    }

    if (waveTime > 0.85) {
      st.volleyCd = (st.volleyCd !== undefined ? st.volleyCd : 1.0) - dt;
      if (st.volleyCd <= 0) {
        st.volleyCd = phase === 1 ? 1.52 : (phase === 2 ? 1.25 : 1.02);
        if (typeof spawnSurvivalCelestialVolley === 'function') spawnSurvivalCelestialVolley(phase);
      }
      st.fissureCd = (st.fissureCd !== undefined ? st.fissureCd : 1.8) - dt;
      if (st.fissureCd <= 0) {
        st.fissureCd = phase === 1 ? 2.85 : (phase === 2 ? 2.35 : 2.05);
        if (typeof spawnSurvivalFissure === 'function') spawnSurvivalFissure(phase);
      }
      st.crossCd = (st.crossCd !== undefined ? st.crossCd : 3.4) - dt;
      if (st.crossCd <= 0) {
        st.crossCd = phase === 1 ? 6.4 : (phase === 2 ? 5.0 : 4.0);
        if (typeof spawnSurvivalCrossJudgment === 'function') spawnSurvivalCrossJudgment(phase);
      }
      st.chainCd = (st.chainCd !== undefined ? st.chainCd : 4.8) - dt;
      if (st.chainCd <= 0) {
        st.chainCd = phase === 1 ? 7.2 : (phase === 2 ? 5.6 : 4.5);
        if (typeof spawnSurvivalMeteorChain === 'function') spawnSurvivalMeteorChain(phase);
      }
      st.vortexCd = (st.vortexCd !== undefined ? st.vortexCd : 2.8) - dt;
      if (st.vortexCd <= 0) {
        st.vortexCd = phase === 1 ? 5.6 : (phase === 2 ? 4.4 : 3.6);
        if (typeof spawnSurvivalAbyssVortex === 'function') spawnSurvivalAbyssVortex(phase);
      }
      if (waveTime <= trialTotal - 5.5) {
        st.corridorCd = (st.corridorCd !== undefined ? st.corridorCd : 4.2) - dt;
        if (st.corridorCd <= 0) {
          st.corridorCd = phase === 1 ? 6.4 : (phase === 2 ? 5.2 : 4.2);
          if (typeof spawnSurvivalCorridor === 'function') spawnSurvivalCorridor(phase);
          addText(player.x, player.y - 44, '🗡️ 天劫剑阵走廊 · 站入光轨间隙!', '#fde68a', 15, 1.45, true);
        }
      }
      if (phase >= 2 && waveTime > 1.35) {
        st.meteorCd = (st.meteorCd !== undefined ? st.meteorCd : 3.2) - dt;
        if (st.meteorCd <= 0) {
          st.meteorCd = phase === 2 ? 5.4 : 3.4;
          const sTheme = typeof getSurvivalTrialTheme === 'function' ? getSurvivalTrialTheme() : { lanceCol: '#f6d379' };
          const mx = Math.max(130, Math.min(WORLD.w - 130, player.x + (Math.random() - 0.5) * 95));
          const my = Math.max(130, Math.min(WORLD.h - 130, player.y + (Math.random() - 0.5) * 95));
          const mDmg = typeof getSurvivalHazardBaseDmg === 'function' ? getSurvivalHazardBaseDmg() : Math.max(6, Math.round(8.4 * envDmgMul));
          spawnHazard(mx, my, 196, mDmg, 1.12, { innerSafeR: 68, color: sTheme.lanceCol, srcKey: 'trap_ring' });
        }
      }
    }

    for (let i = survivalSkyVolleys.length - 1; i >= 0; i--) {
      const v = survivalSkyVolleys[i];
      if (!v) { survivalSkyVolleys.splice(i, 1); continue; }
      v.windupT -= dt;
      if (v.windupT <= 0) {
        if (v.kind === 'corridor_beam') {
          if (beams.length < 36) {
            beams.push({ x1: v.sx, y1: v.sy, x2: v.ex, y2: v.ey, color: v.color || '#fde68a', t: 0.30, maxT: 0.30, width: (v.halfW || 17) * 1.9 });
          }
          beep(340, 0.06, 'sawtooth', 0.03);
          const seg = pointSegClosest(player.x, player.y, v.sx, v.sy, v.ex, v.ey);
          const lim = (v.halfW || 17) + player.r - 4;
          if (seg.dSq <= lim * lim) {
            hurtPlayer(v.dmg, true, 'trap_corridor');
            if (state !== 'wave') return;
          }
        } else {
          if (eBullets.length < 185) {
            eBullets.push({
              x: v.sx, y: v.sy, px: v.sx, py: v.sy,
              vx: Math.cos(v.ang) * v.spd, vy: Math.sin(v.ang) * v.spd,
              life: 2.35,
              dmg: v.dmg,
              r: 8.6, hitR: 6.2,
              color: v.color || '#fb7185',
              coreColor: v.coreColor || '#ffffff',
              shape: 'celestial_lance',
              isCelestial: true,
              srcKey: 'trap_sky_lance'
            });
          }
          if (typeof _frameHitBeeps === 'undefined' || _frameHitBeeps < 2) {
            if (typeof _frameHitBeeps !== 'undefined') _frameHitBeeps++;
            beep(520, 0.035, 'triangle', 0.025);
          }
        }
        survivalSkyVolleys.splice(i, 1);
      }
    }

    for (let i = survivalFissures.length - 1; i >= 0; i--) {
      const f = survivalFissures[i];
      if (!f) { survivalFissures.splice(i, 1); continue; }
      if (f.windupT > 0) {
        f.windupT -= dt;
        if (f.windupT <= 0) {
          f.windupT = 0;
          shake = Math.max(shake, 2.0);
          beep(165, 0.08, 'sawtooth', 0.038);
          addBurst((f.x1 + f.x2) * 0.5, (f.y1 + f.y2) * 0.5, f.color || '#ff6b35', 7, 130);
        }
      } else {
        f.activeT -= dt;
        const seg = pointSegClosest(player.x, player.y, f.x1, f.y1, f.x2, f.y2);
        const lim = (f.halfW || 20) + player.r - 5;
        if (seg.dSq <= lim * lim) {
          if ((player.dashT || 0) > 0) {
            if (!(player._fissureLeapHintCd > 0)) {
              player._fissureLeapHintCd = 1.1;
              addText(player.x, player.y - 38, '◆ 瞬步跃裂隙!', '#72efdd', 15, 1.25, true);
            }
          } else {
            if (!player.noSlow) player.terrainSpdMul = Math.min(player.terrainSpdMul || 1, 0.82);
            if (!(player._fissureHitCd > 0)) {
              player._fissureHitCd = 0.48;
              addText(player.x, player.y - 36, '地脉裂隙灼蚀!', f.color || '#ff6b35', 15, 1.1);
              hurtPlayer(f.dmg, false, 'trap_fissure');
              if (state !== 'wave') return;
            }
          }
        }
        if (f.activeT <= 0) survivalFissures.splice(i, 1);
      }
    }
  } else if (typeof isD5Floor16Phase2FogActive === 'function' && isD5Floor16Phase2FogActive()) {
    const st = survivalTrialState || (survivalTrialState = { fogIntroP: 0, lanternBoostT: 0 });
    st.fogIntroP = Math.min(1, (st.fogIntroP || 0) + dt / 0.85);
    if ((st.lanternBoostT || 0) > 0) st.lanternBoostT = Math.max(0, st.lanternBoostT - dt);
  } else if (typeof survivalTrialState === 'object' && survivalTrialState && (survivalTrialState.fogIntroP || 0) > 0 && !(typeof survivalTrialWave !== 'undefined' && survivalTrialWave)) {
    survivalTrialState.fogIntroP = Math.max(0, survivalTrialState.fogIntroP - dt / 0.65);
    if ((survivalTrialState.lanternBoostT || 0) > 0) survivalTrialState.lanternBoostT = Math.max(0, survivalTrialState.lanternBoostT - dt);
  }

  // 双生虚空传送门 A ↔ B 折跃判定
  if (portals.length >= 2 && portalPairCd <= 0) {
    for (let idx = 0; idx < 2; idx++) {
      const p = portals[idx];
      const hitR = (p.r || 34) + player.r * 0.42;
      const dxP = player.x - p.x, dyP = player.y - p.y;
      if (dxP * dxP + dyP * dyP < hitR * hitR) {
        const dest = portals[idx === 0 ? 1 : 0];
        portalPairCd = 4.5;
        if (rings.length < 30) rings.push({ x: p.x, y: p.y, r: 68, color: p.color, t: 0.26, maxT: 0.26, fill: false });
        player.x = dest.x;
        player.y = dest.y;
        player.invuln = 0;
        cam.x += (dest.x - cam.x) * 0.68;
        cam.y += (dest.y - cam.y) * 0.68;
        clampCam();
        beep(720, 0.12, 'sine', 0.06);
        if (rings.length < 30) rings.push({ x: dest.x, y: dest.y, r: 115, color: dest.color, t: 0.28, maxT: 0.28, fill: false });
        addBurst(dest.x, dest.y, dest.color, 10, 180);
        const warpDmg = (16 + wave * 3) * getEffectiveDmgMul();
        for (let k = 0; k < enemies.length; k++) {
          const ce = enemies[k];
          if (!ce || ce.hp <= 0 || ce.primed) continue;
          if (Math.hypot(ce.x - dest.x, ce.y - dest.y) <= 115 + ce.r) {
            hurtEnemy(ce, warpDmg, false, Math.atan2(ce.y - dest.y, ce.x - dest.x), true, { noProc: true, silentHit: true, knockMult: 1.8 });
          }
        }
        addText(player.x, player.y - 42, '◆ 虚空跃迁！震退周身', '#e0aaff', 18, 2.0);
        announce(`🌀 虚空传送门 ${p.label} → ${dest.label} 跃迁成功！（充能冷却 4.5s）`, '#e0aaff', 2.8);
        break;
      }
    }
  }

  // 异星晶树随战斗定时生长 + 首领可破坏共鸣阵眼棱柱更新（脉冲星刺 / 磁暴引力牵引 / 万蛊酸液孢子）
  let normalTreeCnt = 0;
  for (let i = 0; i < trees.length; i++) {
    if (trees[i] && !trees[i].isBossPylon && trees[i].hp > 0) normalTreeCnt++;
  }
  if (!overtime && waveTime > 3 && normalTreeCnt < 4) {
    treeSpawnT -= dt;
    if (treeSpawnT <= 0) {
      treeSpawnT = Math.max(8.0, 14.5 - (player.bonusTrees || 0) * 2.2);
      spawnTree();
    }
  }
  for (let i = trees.length - 1; i >= 0; i--) {
    const tr = trees[i];
    if (tr.hp <= 0 || (tr.isBossPylon && (!tr.owner || tr.owner.hp <= 0))) { trees.splice(i, 1); continue; }
    if (tr.hitFlash > 0) tr.hitFlash -= dt;
    if (tr._flashCd > 0) tr._flashCd -= dt;
    tr.sway += dt * 2.4;
    if (tr.isBossPylon && player && state === 'wave') {
      const ownerBoss = tr.owner;
      const pRate = (ownerBoss && (ownerBoss.d5LastStandT || 0) > 0) ? 1.20 : 1.0;
      if (tr.pylonKind === 'magnet_core' && !(player.dashT > 0)) {
        const dxM = tr.x - player.x, dyM = tr.y - player.y;
        const dM = Math.hypot(dxM, dyM);
        if (dM > 32 && dM < 238) {
          const pullM = 44 * pRate * dt;
          const mx2 = Math.max(player.r + 10, Math.min(WORLD.w - player.r - 10, player.x + (dxM / dM) * pullM));
          const my2 = Math.max(player.r + 10, Math.min(WORLD.h - player.r - 10, player.y + (dyM / dM) * pullM));
          if (!isBlockedByTerrain(mx2, my2, player.r)) { player.x = mx2; player.y = my2; }
        }
      }
      tr.pulseT = (tr.pulseT || 1.7) - dt * pRate;
      if (tr.pulseT <= 0) {
        tr.pulseT = tr.pylonKind === 'magnet_core' ? 2.15 : 1.95;
        const bDmg = Math.max(4, Math.round((ownerBoss ? ownerBoss.dmg : 8) * 0.68));
        const bSrc = ownerBoss ? (ownerBoss.variant || 'boss') : 'boss';
        if (tr.pylonKind === 'cryo_obelisk') {
          if (rings.length < 40) rings.push({ x: tr.x, y: tr.y, r: 54, color: '#72efdd', t: 0.24, maxT: 0.24, kind: 'hex' });
          for (let k = 0; k < 4 && eBullets.length < 172; k++) {
            const ba = tr.sway * 0.6 + k * (Math.PI * 0.5);
            eBullets.push({ x: tr.x, y: tr.y, px: tr.x, py: tr.y, vx: Math.cos(ba) * 132, vy: Math.sin(ba) * 132, dmg: bDmg, r: 5.4, color: '#7dd3fc', shape: 'shard', chillPlayer: true, srcKey: bSrc, bossOwner: ownerBoss });
          }
        } else if (tr.pylonKind === 'magnet_core') {
          if (rings.length < 40) rings.push({ x: tr.x, y: tr.y, r: 108, color: '#ff9f1c', t: 0.28, maxT: 0.28, kind: 'star' });
          if (Math.hypot(player.x - tr.x, player.y - tr.y) <= 98 + player.r) {
            hurtPlayer(bDmg, true, ownerBoss || bSrc);
            if (state !== 'wave') return;
          }
        } else if (tr.pylonKind === 'venom_cocoon') {
          const aimP = Math.atan2(player.y - tr.y, player.x - tr.x);
          for (let k = -1; k <= 1 && eBullets.length < 172; k += 2) {
            const ba = aimP + k * 0.22;
            eBullets.push({ x: tr.x, y: tr.y, px: tr.x, py: tr.y, vx: Math.cos(ba) * 128, vy: Math.sin(ba) * 128, dmg: bDmg, r: 5.5, color: '#5ef29b', shape: 'acid', chillPlayer: true, srcKey: bSrc, bossOwner: ownerBoss });
          }
        }
      }
    }
  }

  // 稀有地图奇遇圣物刷出与读条共鸣召唤特殊 Boss
  if (!overtime && relicSpawnT > 0 && waveTime > 6) {
    relicSpawnT -= dt;
    if (relicSpawnT <= 0) {
      relicSpawnT = -1;
      spawnSpecialRelic();
    }
  }
  for (let i = relics.length - 1; i >= 0; i--) {
    const rel = relics[i];
    rel.pulse += dt * 3.2;
    const dRel = Math.hypot(player.x - rel.x, player.y - rel.y);
    if (dRel <= rel.r + player.r) {
      rel.charge += dt;
      if (rel.charge >= rel.need) {
        relics.splice(i, 1);
        summonSpecialBoss(rel);
        continue;
      }
    } else if (rel.charge > 0) {
      rel.charge = Math.max(0, rel.charge - dt * 0.65);
    }
  }

  // 场景专属环境异象（第 3 波起概率出现，随轮次逐步解锁）与菌林治愈灵泉更新
  player.inSpore = false;
  for (let i = sporeZones.length - 1; i >= 0; i--) {
    const sz = sporeZones[i];
    sz.t -= dt;
    sz.pulse = (sz.pulse || 0) + dt * 2.5;
    if (sz.t <= 0) { sporeZones.splice(i, 1); continue; }
    if (Math.hypot(player.x - sz.x, player.y - sz.y) <= sz.r + player.r) {
      player.inSpore = true;
      sz.healAcc = (sz.healAcc || 0) + dt * 2.0;
      if (sz.healAcc >= 1) {
        const h = Math.floor(sz.healAcc);
        sz.healAcc -= h;
        if (player.hp > 0 && player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + h);
          addText(player.x, player.y - 26, `+${h} 🍄`, '#5ef29b', 13, 0.62, false);
        }
      }
    }
  }
  if (activeSceneEvent && !overtime && waveTime > 2.5) {
    sceneEventT -= dt;
    if (sceneEventT <= 0) {
      if (activeSceneEvent === 'rad_meteor') {
        sceneEventT = 7.0;
        const mx = Math.max(110, Math.min(WORLD.w - 110, player.x + (Math.random() - 0.5) * 340));
        const my = Math.max(110, Math.min(WORLD.h - 110, player.y + (Math.random() - 0.5) * 340));
        spawnHazard(mx, my, 82, (8 + wave * 1.1) * diff.dmgMul * envDmgMul, 1.35, { enemyDmg: (38 + wave * 7) * diff.hpMul, dropMat: 4, color: '#c084fc', style: 'thunder_sigil' });
        addText(mx, my - 30, '星晷紫雷坠落!', '#e9d5ff', 15, 2.0);
        announce('⚡ 紫电星晷碎块即将轰落！可重创灰塔傀儡并迸裂封魂晶石', '#e9d5ff', 2.8);
      } else if (activeSceneEvent === 'sandstorm') {
        sceneEventT = 8.0;
        sandGustT = 3.2;
        addText(player.x, player.y - 42, '苍岚顺风：移速+14% · 敌弹减速!', '#f4a261', 15, 2.1);
        announce('🌪️ 环境异象【苍岚顺风】：移速+14%，敌方弹幕减速 22%', '#f4a261', 3.0);
        if (rings.length < 40) rings.push({ x: player.x, y: player.y, r: 95, color: '#f4a261', t: 0.35, maxT: 0.35, kind: 'hex' });
      } else if (activeSceneEvent === 'blizzard') {
        sceneEventT = 8.0;
        for (const e of enemies) {
          if (e && e.hp > 0) e.chillT = Math.max(e.chillT || 0, 2.5);
        }
        const bx = Math.max(110, Math.min(WORLD.w - 110, player.x + (Math.random() - 0.5) * 300));
        const by = Math.max(110, Math.min(WORLD.h - 110, player.y + (Math.random() - 0.5) * 300));
        spawnHazard(bx, by, 72, (7 + wave * 1.0) * diff.dmgMul * envDmgMul, 1.30, { enemyDmg: (32 + wave * 6) * diff.hpMul, color: '#38bdf8', style: 'frost_hex' });
        if (rings.length < 40) rings.push({ x: player.x, y: player.y, r: 260, color: '#72efdd', t: 0.4, maxT: 0.4, kind: 'hex' });
        addText(player.x, player.y - 42, '极寒霜潮：全场傀儡冻结减速!', '#72efdd', 15, 2.1);
        announce('❄️ 环境异象【极寒霜潮】：全场守塔傀儡集体冻结减速并凝结六棱冰晶！', '#72efdd', 3.0);
      } else if (activeSceneEvent === 'geysers') {
        sceneEventT = 6.6;
        for (let g = 0; g < 2; g++) {
          const gx = Math.max(110, Math.min(WORLD.w - 110, player.x + (Math.random() - 0.5) * 380));
          const gy = Math.max(110, Math.min(WORLD.h - 110, player.y + (Math.random() - 0.5) * 380));
          spawnHazard(gx, gy, 74, (9 + wave * 1.2) * diff.dmgMul * envDmgMul, 1.30, { enemyDmg: (45 + wave * 8) * diff.hpMul, color: '#ff6b35', style: 'flame_pillar' });
        }
        announce('🔥 环境异象【熔炉余烬】：地面八芒熔火柱即将喷涌（可重创敌群）', '#ff6b35', 2.8);
      } else if (activeSceneEvent === 'spore_tide') {
        sceneEventT = 8.5;
        if (sporeZones.length < 2) {
          const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 140;
          const sx = Math.max(110, Math.min(WORLD.w - 110, player.x + Math.cos(ang) * dist));
          const sy = Math.max(110, Math.min(WORLD.h - 110, player.y + Math.sin(ang) * dist));
          sporeZones.push({ x: sx, y: sy, r: 86, t: 6.5, maxT: 6.5, pulse: 0, healAcc: 0 });
          if (rings.length < 40) rings.push({ x: sx, y: sy, r: 92, color: '#5ef29b', t: 0.35, maxT: 0.35 });
          addText(sx, sy - 24, '🍄 治愈灵泉生成!', '#5ef29b', 15, 2.2);
          announce('🍄 环境异象【治愈灵泉】：站入翠绿孢子法阵可持续回血！', '#5ef29b', 3.2);
        }
      }
    }
  }

  // 首领层与普通层统一正常倒计时：提前击败首领保留剩余时间刷满小怪收割晶石，倒计时归零若首领未死则转入超时死战！
  waveTime -= dt;
  if (!overtime && waveTime > 0 && waveTime <= 5) {
    const sec = Math.ceil(waveTime);
    if (sec !== lastUrgentSec) {
      lastUrgentSec = sec;
      beep(860, 0.035, 'sine', 0.028);
    }
  }
  if (waveTime <= 0) {
    const bossAlive = enemies.some(e => (e.type === 'boss' || e.type === 'special_boss' || e.type === 'mini_boss') && e.hp > 0) ||
      spawns.some(s => s.type === 'boss' || s.type === 'special_boss' || s.type === 'mini_boss');
    if (bossAlive) {
      waveTime = 0;
      if (!overtime) {
        overtime = true;
        beep(210, 0.25, 'sawtooth', 0.08);
        addText(player.x, player.y - 54, '◆ 超时死战开启！击败首领即刻过关！', '#ff3b6b', 21, 2.6);
        announce('◆ 超时死战开启！不加冗余时间，击败首领即刻决出胜负！', '#ff3b6b', 4.0);
      }
      overtimeMeteorT -= dt;
      if (overtimeMeteorT <= 0) {
        overtimeMeteorT = 3.6;
        spawnHazard(player.x + (Math.random() - 0.5) * 210, player.y + (Math.random() - 0.5) * 210, 74, 11 * diff.dmgMul * envDmgMul, 1.25);
      }
    } else {
      finishWave();
      return;
    }
  }

  // 能量护盾自动回充（7秒未受击恢复 50% 护盾，不朽神盾核缩短冷却）
  if (player.maxShield > 0 && player.shield < player.maxShield) {
    player.shieldRegenT -= dt;
    if (player.shieldRegenT <= 0) {
      player.shield = Math.min(player.maxShield, player.shield + Math.ceil(player.maxShield * 0.5));
      player.shieldRegenT = player.fastShield ? 3.2 : 5.0;
      if (rings.length < 40) rings.push({ x: player.x, y: player.y, r: 34, color: '#4cc9f0', t: 0.22, maxT: 0.22 });
      addText(player.x, player.y - 28, '+护盾', '#72efdd', 13, 0.65, false);
      if (player.shieldPulseNova && typeof triggerShieldPulse === 'function') triggerShieldPulse();
    }
  }

  // 特斯拉线圈自动电弧攻击（享受攻击范围加成）
  const totalRange = getTotalRangeBonus();
  if (player.teslaCount > 0 && enemies.length > 0) {
    player.teslaCd -= dt;
    if (player.teslaCd <= 0) {
      player.teslaCd = Math.max(0.45, 1.7 / (1 + (player.teslaCount - 1) * 0.55));
      const maxTD = Math.max(120, 240 + Math.round(totalRange * 0.5));
      let near = null, nearDSq = maxTD * maxTD;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e || e.hp <= 0 || e.primed) continue;
        const dxT = e.x - player.x, dyT = e.y - player.y;
        const dSq = dxT * dxT + dyT * dyT;
        if (dSq < nearDSq) { nearDSq = dSq; near = e; }
      }
      if (near) {
        beep(680, 0.045, 'sine', 0.03);
        const tdmg = (12 + wave * 2.2) * getEffectiveDmgMul() * getElemMul();
        castChainLightning(player.x, player.y - 12, near, 2 + player.teslaCount, tdmg, getEffectiveCrit(), 'elem_chain');
        if (state !== 'wave') return;
      }
    }
  }

  // 复刻《土豆兄弟》波次节拍脉冲刷怪：固定编组节拍（1.22s~1.55s/批，杜绝死一补一0秒秒刷），降低同屏拥挤度并由单怪厚实度与掉落补偿维持总压力守恒
  spawnAcc -= dt;
  const onBossWave = (wave >= 4 && wave % 4 === 0);
  const bossDuelActive = onBossWave && (
    enemies.some(e => (e.type === 'boss' || e.type === 'special_boss') && e.hp > 0) ||
    spawns.some(s => s.type === 'boss' || s.type === 'special_boss')
  );
  const hordeBoost = hordeWave ? (wave <= 4 ? 1.14 : 1.18) : 1;
  const earlySpawnMul = wave === 1 ? 0.92 : (wave <= 3 ? 0.96 : 1.0);
  const mobCountMul = (typeof isMobileCombatBalance === 'function' && isMobileCombatBalance())
    ? (typeof MOBILE_MOB_COUNT_MUL === 'number' ? MOBILE_MOB_COUNT_MUL : 0.80)
    : 1.0;
  const baseMaxActive = isTouch
    ? (bossDuelActive ? (wave >= 12 ? 18 : 15) : Math.min(46, Math.round((26 + wave * 1.45) * earlySpawnMul)))
    : (bossDuelActive ? (wave >= 12 ? 22 : (wave <= 4 ? 16 : 19)) : Math.min(58, Math.round((34 + wave * 1.75) * earlySpawnMul)));
  const lureMul = (!bossDuelActive && !survivalTrialWave) ? (1 + Math.min(0.32, player.mobSpawnBonus || 0)) : 1.0;
  const diffCapMul = (!bossDuelActive && (diff.spawnMul || 1) < 1) ? diff.spawnMul : 1.0;
  const rawMaxActive = Math.max(4, Math.round((mobCountMul < 1 ? Math.max(4, Math.round(baseMaxActive * mobCountMul)) : baseMaxActive) * diffCapMul * lureMul));
  const maxActiveEnemies = survivalTrialWave ? Math.max(3, Math.round(rawMaxActive * 0.30)) : rawMaxActive;
  if (!overtime && spawnAcc <= 0 && waveTime > 1.5) {
    const minInterval = bossDuelActive ? 1.95 : (wave <= 4 ? 1.28 : (wave <= 9 ? 1.24 : 1.18));
    spawnAcc = Math.max(minInterval, (1.44 - Math.min(wave, 12) * 0.022) / Math.pow(diff.spawnMul * hordeBoost, 0.35));
    const room = Math.max(0, maxActiveEnemies - (enemies.length + spawns.length));
    if (room > 0) {
      const baseCount = bossDuelActive ? (wave >= 12 ? 2.3 : 1.8) : ((wave <= 4 ? 3.1 : 2.6) + Math.min(16, wave) * 0.24);
      const fullExactCnt = baseCount * (bossDuelActive ? 1.0 : earlySpawnMul) * diff.spawnMul * hordeBoost * mobCountMul * lureMul;
      const exactCnt = survivalTrialWave ? (fullExactCnt * 0.30) : fullExactCnt;
      const bernoulliCnt = Math.floor(exactCnt) + (Math.random() < (exactCnt - Math.floor(exactCnt)) ? 1 : 0);
      const rawCnt = (survivalTrialWave || mobCountMul < 1) ? bernoulliCnt : Math.max(1, bernoulliCnt);
      const count = Math.min(rawCnt, room);
      const early = selectedDiff >= 3 ? 1 : 0;
      let sqA = 0, sqD = 220, sqT = 'chaser';
      for (let i = 0; i < count; i++) {
        if (i % 3 === 0) { sqA = Math.random() * Math.PI * 2; sqD = wave <= 5 ? (188 + Math.random() * 165) : (220 + Math.random() * 255); sqT = pickWaveEnemyType(wave + early); }
        const jx = (i % 3 === 0) ? 0 : (Math.random() - 0.5) * 90, jy = (i % 3 === 0) ? 0 : (Math.random() - 0.5) * 90;
        const x = Math.max(60, Math.min(WORLD.w - 60, player.x + Math.cos(sqA) * sqD + jx));
        const y = Math.max(60, Math.min(WORLD.h - 60, player.y + Math.sin(sqA) * sqD + jy));
        spawnWarning(x, y, (i % 3 === 2 && wave >= 3) ? pickWaveEnemyType(wave + early) : sqT);
      }
    }
  }

  // 多形态地面与空间预警机关倒计时引爆（彻底告别千篇一律圆圈爆炸：十字棱镜激光、次元裂空斩、高抛子母榴弹、落雷星印、六棱碎冰、八芒熔火柱）
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    if (!h) continue;
    h.t -= dt;
    // 旋转类地面机关在引爆前最后 0.30s 锁定角度不再转动，保证近战走位落点不被临时甩中
    if (h.rotSpd && h.t > 0.30) h.angle = (h.angle || 0) + h.rotSpd * dt;
    if (h.t <= 0) {
      const hCol = h.color || '#ff3b6b';
      const st = h.style || 'circle';
      const hSrc = h.bossOwner || h.srcKey || 'hazard';
      const prevEnemyAct = typeof _activeEnemyActor !== 'undefined' ? _activeEnemyActor : null;
      _activeEnemyActor = hSrc;
      try {
      if (st === 'cross_beam') {
        // 蚀忆魂灯龛专属：紫晶十字裂变棱镜迸发双向交叉光轨（非圆形判定，四角象限完全安全！）
        const span = h.halfLen || 130;
        const hw = h.halfW || 14;
        beep(590, 0.08, 'sawtooth', 0.04);
        addBurst(h.x, h.y, hCol, 7, 135);
        let hitCross = false;
        for (let k = 0; k < 2; k++) {
          const la = (h.angle || 0) + k * (Math.PI * 0.5);
          const x1 = h.x - Math.cos(la) * span, y1 = h.y - Math.sin(la) * span;
          const x2 = h.x + Math.cos(la) * span, y2 = h.y + Math.sin(la) * span;
          if (beams.length < 44) beams.push({ x1, y1, x2, y2, color: hCol, thin: true, t: 0.26, maxT: 0.26 });
          if (!hitCross && player && state === 'wave') {
            const seg = pointSegClosest(player.x, player.y, x1, y1, x2, y2);
            if (seg.dSq <= (hw + player.r - 3) * (hw + player.r - 3)) hitCross = true;
          }
        }
        if (hitCross) hurtPlayer(h.dmg, true, hSrc);
      } else if (st === 'void_slash') {
        // 蚀日唤灵师 / 绯夜八荒剑狱：次元裂空斩痕撕开紫金雷电剑隙（必保刀光贴图不丢失）
        const span = h.halfLen || 94;
        const hw = h.halfW || 14;
        const la = h.angle || 0;
        const x1 = h.x - Math.cos(la) * span, y1 = h.y - Math.sin(la) * span;
        const x2 = h.x + Math.cos(la) * span, y2 = h.y + Math.sin(la) * span;
        beep(360, 0.09, 'sawtooth', 0.042);
        if (beams.length >= 44) beams.shift();
        beams.push({ x1, y1, x2, y2, color: hCol, thin: false, t: 0.26, maxT: 0.26 });
        pushBossSlash({ x: h.x, y: h.y, angle: la, r: span, color: '#fde68a', mode: 'stab', isBoss: true, t: 0.24, maxT: 0.24 });
        if (lightnings.length < 38) {
          const nx = -Math.sin(la), ny = Math.cos(la);
          lightnings.push({
            pts: [
              { x: x1, y: y1 },
              { x: h.x - Math.cos(la) * span * 0.35 + nx * 10, y: h.y - Math.sin(la) * span * 0.35 + ny * 10 },
              { x: h.x + Math.cos(la) * span * 0.35 - nx * 10, y: h.y + Math.sin(la) * span * 0.35 - ny * 10 },
              { x: x2, y: y2 }
            ],
            color: '#e9d5ff', t: 0.22, maxT: 0.22
          });
        }
        if (player && state === 'wave') {
          const seg = pointSegClosest(player.x, player.y, x1, y1, x2, y2);
          if (seg.dSq <= (hw + player.r - 3) * (hw + player.r - 3)) hurtPlayer(h.dmg, true, hSrc);
        }
      } else {
        if (st === 'thunder_sigil' && lightnings.length < 34) {
          lightnings.push({
            pts: [
              { x: h.x + (Math.random() - 0.5) * 24, y: Math.max(16, h.y - 230) },
              { x: h.x - 14, y: h.y - 115 },
              { x: h.x + 12, y: h.y - 48 },
              { x: h.x, y: h.y }
            ],
            color: hCol, t: 0.24, maxT: 0.24
          });
          if (rings.length < 34) rings.push({ x: h.x, y: h.y, r: h.r * 1.08, color: '#fef08a', t: 0.24, maxT: 0.24, kind: 'hex' });
        } else if (st === 'frost_hex') {
          if (rings.length < 34) rings.push({ x: h.x, y: h.y, r: h.r * 1.06, color: '#bae6fd', t: 0.26, maxT: 0.26, kind: 'hex' });
          addSparks(h.x, h.y, 0, '#e0f2fe', 5);
        } else if (st === 'flame_pillar' || st === 'mortar_shell') {
          if (rings.length < 34) rings.push({ x: h.x, y: h.y, r: h.r * 1.08, color: '#fde047', t: 0.25, maxT: 0.25, kind: 'star' });
        }
        triggerExplosion(h.x, h.y, h.r, h.enemyDmg || 0, true, h.dmg, hCol, !h.innerSafeR, h.innerSafeR || 0);
        if (h.shrapnel > 0 && eBullets.length < 168) {
          const baseS = (h.angle || 0) + Math.PI * 0.25;
          for (let sk = 0; sk < h.shrapnel && eBullets.length < 170; sk++) {
            const sa = baseS + (sk / h.shrapnel) * Math.PI * 2;
            eBullets.push({
              x: h.x, y: h.y, px: h.x, py: h.y,
              vx: Math.cos(sa) * 132, vy: Math.sin(sa) * 132,
              life: 0.56,
              dmg: Math.max(3, Math.round(h.dmg * 0.68)), r: 5.2, hitR: 4.5, color: '#fb923c', shape: 'fire',
              isCelestial: (h.srcKey === 'trap_meteor'),
              srcKey: hSrc
            });
          }
        }
      }
      } finally {
        _activeEnemyActor = prevEnemyAct;
      }
      if (h.dropMat > 0) dropCrystals(h.x, h.y, h.dropMat);
      hazards.splice(i, 1);
      if (state !== 'wave') return;
    }
  }

  for (let i = spawns.length - 1; i >= 0; i--) {
    const sp = spawns[i];
    if (!sp) continue;
    sp.t -= dt;
    if (sp.t <= 0) {
      createEnemy(sp.x, sp.y, sp.type, sp.variant);
      spawns.splice(i, 1);
    }
  }

  // 玩家移动（v2.5.0 丝滑微惯性响应 + 青焰瞬步极速斩弹位移 + 镜头前瞻平滑跟随）
  let kdx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
  let kdy = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
  let dx = kdx, dy = kdy, moveScale = 1;
  if (!dx && !dy && joy.active && joy.mag > 0) {
    dx = joy.dx; dy = joy.dy; moveScale = joy.mag;
  }
  if (dx || dy) {
    player.moveA = Math.atan2(dy, dx);
  }
  const prevPx = player.x, prevPy = player.y;
  if ((player.iceFreezeT || 0) > 0) {
    player.dashT = 0;
    player.moving = false;
    player.vx = 0;
    player.vy = 0;
    player._leanA = (player._leanA || 0) * Math.max(0, 1 - dt * 14);
    if (terrains.length > 0) pushOutOfChasms(player);
  } else if ((player.dashT || 0) > 0) {
    player.dashT = Math.max(0, player.dashT - dt);
    player.moving = true;
    player.x += (player.dashVx || 0) * dt;
    player.y += (player.dashVy || 0) * dt;
    pushOutOfChasms(player);
    player.x = Math.max(player.r + 8, Math.min(WORLD.w - player.r - 8, player.x));
    player.y = Math.max(player.r + 8, Math.min(WORLD.h - player.r - 8, player.y));
    player.vx = (player.dashVx || 0) * 0.36;
    player.vy = (player.dashVy || 0) * 0.36;
    player._leanA = ((player.dashVx || 0) >= 0 ? 1 : -1) * 0.15;
    player.walkT += dt * 22;
    // 瞬步残影穿梭时自动斩碎擦身敌弹，提升极限穿弹爽感
    for (let bi = eBullets.length - 1; bi >= 0; bi--) {
      const eb = eBullets[bi];
      const bdx = eb.x - player.x, bdy = eb.y - player.y;
      if (bdx * bdx + bdy * bdy <= 44 * 44) {
        addSparks(eb.x, eb.y, Math.atan2(player.dashVy || 0, player.dashVx || 1), '#72efdd', 2);
        eBullets.splice(bi, 1);
      }
    }
    if (Math.random() < 0.75) {
      pushParticle({
        x: player.x + (Math.random() - 0.5) * 14,
        y: player.y + (Math.random() - 0.5) * 14,
        vx: -(player.dashVx || 0) * 0.12, vy: -(player.dashVy || 0) * 0.12,
        r: 3.8, color: '#72efdd', t: 0.20, maxT: 0.20
      });
    }
  } else {
    player.moving = !!(dx || dy);
    let tvx = 0, tvy = 0;
    if (player.moving) {
      if (Math.abs(dx) > 0.08) player.faceDir = dx > 0 ? 1 : -1;
      const len = Math.hypot(dx, dy) || 1;
      const chillMul = (player.chillSlowT > 0 && !player.noSlow) ? 0.85 : 1;
      const envSpdMul = (sandGustT > 0 ? 1.14 : 1) * chillMul * (player.terrainSpdMul !== undefined ? player.terrainSpdMul : 1);
      const fearSpdActive = typeof isBossLastStandFearActive === 'function' && isBossLastStandFearActive();
      const fearSpdMul = fearSpdActive ? (typeof D5_LAST_STAND_FEAR_SPD_MUL === 'number' ? D5_LAST_STAND_FEAR_SPD_MUL : 0.85) : 1;
      const rawSpdMul = getEffectiveSpdMul();
      const unfearedSpdMul = fearSpdActive ? (rawSpdMul / fearSpdMul) : rawSpdMul;
      const minSpdFloor = player.noSlow ? 1.0 : 0.68;
      const effSpd = Math.max(minSpdFloor, unfearedSpdMul * envSpdMul) * fearSpdMul;
      const v = player.spd * effSpd * moveScale;
      tvx = (dx / len) * v;
      tvy = (dy / len) * v;
      player.walkT += dt * 13.5 * moveScale;
      player.dustT -= dt;
      if (player.dustT <= 0) {
        player.dustT = 0.1;
        pushParticle({ x: player.x + (Math.random() - 0.5) * 12, y: player.y + 18, vx: -(dx / len) * 25, vy: -10 - Math.random() * 14, r: 3.5 + Math.random() * 2.5, color: 'rgba(190,180,205,0.38)', t: 0.25, maxT: 0.25 });
      }
    }
    const accelRate = player.moving ? 26 : 32;
    const blend = Math.min(1, accelRate * dt);
    player.vx = (player.vx || 0) + (tvx - (player.vx || 0)) * blend;
    player.vy = (player.vy || 0) + (tvy - (player.vy || 0)) * blend;
    if (player.vx * player.vx + player.vy * player.vy > 4) {
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      pushOutOfChasms(player);
      player.x = Math.max(player.r + 8, Math.min(WORLD.w - player.r - 8, player.x));
      player.y = Math.max(player.r + 8, Math.min(WORLD.h - player.r - 8, player.y));
    } else {
      player.vx = 0;
      player.vy = 0;
      if (terrains.length > 0) pushOutOfChasms(player);
    }
    const targetLean = Math.max(-0.11, Math.min(0.11, (player.vx / Math.max(160, player.spd)) * 0.085));
    player._leanA = (player._leanA || 0) + (targetLean - (player._leanA || 0)) * Math.min(1, dt * 16);
  }
  const movedStep = Math.hypot(player.x - prevPx, player.y - prevPy);
  if (movedStep < 1.2 && !player.moving && !(player.dashT > 0)) {
    player._stillTime = Math.min(5, (player._stillTime || 0) + dt);
  } else {
    player._stillTime = 0;
  }
  if ((player._dodgeBladeCd || 0) > 0) player._dodgeBladeCd -= dt;
  if (player.sacrificeCrown && player.hp > Math.max(4, player.maxHp * 0.25 + 1)) {
    player._sacTick = (player._sacTick || 0) + dt;
    if (player._sacTick >= 1.2) {
      player._sacTick -= 1.2;
      player.hp = Math.max(1, player.hp - 1);
      if (typeof triggerThornsNova === 'function') triggerThornsNova();
      if (state !== 'wave') return;
    }
  }
  if ((player.gardenPlots || 0) > 0 && drops.length < 64) {
    player._gardenCd = (player._gardenCd === undefined ? 11 : player._gardenCd) - dt;
    if (player._gardenCd <= 0) {
      player._gardenCd = Math.max(3.8, 11 / player.gardenPlots);
      const ga = Math.random() * Math.PI * 2, gd = 42 + Math.random() * 68;
      const gx = Math.max(48, Math.min(WORLD.w - 48, player.x + Math.cos(ga) * gd));
      const gy = Math.max(48, Math.min(WORLD.h - 48, player.y + Math.sin(ga) * gd));
      drops.push({ x: gx, y: gy, kind: 'heal', bob: 0 });
      if (rings.length < 36) rings.push({ x: gx, y: gy, r: 28, color: '#5ef29b', t: 0.24, maxT: 0.24, kind: 'cross_pulse' });
    }
  }
  if (player.strideQuake && movedStep > 0.1 && !(player.dashT > 0)) {
    player._strideDist = (player._strideDist || 0) + movedStep;
    if (player._strideDist >= 175) {
      player._strideDist -= 175;
      const qRad = 128 * getBlastScale();
      const qDmg = (20 + Math.max(0, getTotalArmor()) * 3.8 + player.maxHp * 0.35) * getEffectiveDmgMul();
      if (rings.length < 28) rings.push({ x: player.x, y: player.y, r: qRad, color: '#fbbf24', t: 0.22, maxT: 0.22, fill: false });
      beep(145, 0.055, 'triangle', 0.036);
      for (let qi = enemies.length - 1; qi >= 0; qi--) {
        const qe = enemies[qi];
        if (!qe || qe.hp <= 0 || qe.primed) continue;
        const qdx = qe.x - player.x, qdy = qe.y - player.y, qlim = qRad + qe.r;
        if (qdx * qdx + qdy * qdy <= qlim * qlim) {
          hurtEnemy(qe, qDmg, false, Math.atan2(qdy, qdx), true, { isMelee: true, knockMult: 1.4, noProc: true, silentHit: true });
          if (state !== 'wave') return;
        }
      }
    }
  }
  const moveInvLen = (dx || dy) ? 1 / (Math.hypot(dx, dy) || 1) : 0;
  const targetCamX = player.x + (dx ? dx * moveInvLen * 36 : (player.vx || 0) * 0.08);
  const targetCamY = player.y + (dy ? dy * moveInvLen * 28 : (player.vy || 0) * 0.06);
  cam.x += (targetCamX - cam.x) * Math.min(1, dt * 9.2);
  cam.y += (targetCamY - cam.y) * Math.min(1, dt * 9.2);
  clampCam();

  player.invuln = 0;
  if (player.hurtFlashT > 0) player.hurtFlashT -= dt;
  // 建筑流光环联动：检测玩家是否身处任意机关 175px 协防圈内（激活修缮无人机灵雾回血与攻速增幅）
  let nearAnyTurret = false;
  if (turrets.length > 0) {
    for (let ti = 0; ti < turrets.length; ti++) {
      const tr = turrets[ti];
      const dxT = player.x - tr.x, dyT = player.y - tr.y;
      if (dxT * dxT + dyT * dyT <= 175 * 175) { nearAnyTurret = true; break; }
    }
  }
  player._inTurretAura = nearAnyTurret;
  const bastionRegen = (player.turretBastion || 0) > 0 ? Math.min(5, turrets.length) * 0.8 * player.turretBastion : 0;
  const auraRegen = (nearAnyTurret && (player.turretAuraHeal || 0) > 0) ? 1.5 * player.turretAuraHeal : 0;
  const gritRegenMul = (player.ironbloodGrit && player.hp < player.maxHp * 0.70) ? 2 : 1;
  const totalRegen = Math.max(0, ((player.regen || 0) + bastionRegen + auraRegen) * gritRegenMul);
  if (totalRegen > 0 && player.hp > 0 && player.hp < player.maxHp) {
    player.regenAcc += totalRegen * dt;
    if (player.regenAcc >= 1) {
      const heal = Math.floor(player.regenAcc);
      player.regenAcc -= heal;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      addText(player.x, player.y - 26, '+' + heal, auraRegen > 0 ? '#72efdd' : '#6ede8a', 14, 0.58, false);
    }
  }

  let nearestE = null, nearestDSq = 9999 * 9999;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e || e.hp <= 0) continue;
    const dxN = e.x - player.x, dyN = e.y - player.y;
    const dSq = dxN * dxN + dyN * dyN;
    if (dSq < nearestDSq) { nearestDSq = dSq; nearestE = e; }
  }
  if (nearestE) player.lookA = Math.atan2(nearestE.y - player.y, nearestE.x - player.x);

  // 36 把武器自动索敌、攻击范围加成与全流派差异化攻击表现（全面复用缓存，零临时数组分配）
  const setB = getSetBonuses();
  const stickCount = setB.sticks || 0;
  const effDmg = getEffectiveDmgMul(), effAspd = getEffectiveAtkSpd(), baseCrit = getEffectiveCrit(), elemMul = getElemMul(), techMul = getTechMul(), flatTech = player.flatTech || 0;
  const bldDmgMul = (1 + (effDmg - 1) * 0.45) * techMul * (wave >= 9 ? (1 + Math.min(0.24, (wave - 8) * 0.03)) : 1);
  const nW = player.weapons.length;
  let maxEquipRange = player.cls === 'bull' ? Math.round(165 * getBlastScale()) : 0;

  // 工程流自动布设感应地雷（螺丝刀武器 + 感应地雷匣 + 引信磁铁 + 欧米茄机械母巢 + 5阶子母星雷针双生布雷）
  const totalMineLayers = (setB.screwdrivers || 0) + (player.mineLayers || 0);
  if (totalMineLayers > 0 && mines.length < 22) {
    player.mineCd = (player.mineCd === undefined ? 1.2 : player.mineCd) - dt;
    if (player.mineCd <= 0) {
      const mineHasteMul = 1 + (player.mineHaste || 0);
      player.mineCd = Math.max(0.45, 3.10 / ((1 + (totalMineLayers - 1) * 0.45) * mineHasteMul));
      let maxMineTier = setB.maxMineTier || 1;
      if ((player.mineLayers || 0) >= 2 && maxMineTier < 3) maxMineTier = 3;
      const layCount = (setB.doubleMines || 0) > 0 ? 2 : 1;
      const radBonus = 1 + (player.mineRadiusBonus || 0);
      const mineSrcId = (setB.screwdrivers || 0) > 0 ? 'screwdriver' : 'landmine';
      for (let lk = 0; lk < layCount && mines.length < 22; lk++) {
        const ma = Math.random() * Math.PI * 2, md = 28 + Math.random() * 62;
        const dummy = {
          x: Math.max(68, Math.min(WORLD.w - 68, player.x + Math.cos(ma) * md)),
          y: Math.max(68, Math.min(WORLD.h - 68, player.y + Math.sin(ma) * md)),
          r: 15
        };
        pushOutOfChasms(dummy);
        mines.push({
          x: dummy.x, y: dummy.y, r: 15, triggerR: Math.round(56 * radBonus),
          blastR: (86 + (maxMineTier - 1) * 14) * getBlastScale() * radBonus,
          dmg: (15 + wave * 2.5 + flatTech * 3.8) * (1 + (maxMineTier - 1) * 0.42) * bldDmgMul,
          srcId: mineSrcId,
          armT: 0.24, pulse: Math.random() * 6.28, life: 22
        });
      }
      beep(540, 0.03, 'triangle', 0.02);
    }
  }
  for (let mIdx = mines.length - 1; mIdx >= 0; mIdx--) {
    const m = mines[mIdx];
    if (!m) continue;
    m.pulse += dt * 4.8;
    m.life -= dt;
    if (m.armT > 0) m.armT -= dt;
    if (m.life <= 0) { mines.splice(mIdx, 1); continue; }
    if (m.armT <= 0) {
      let triggered = false;
      for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
        const e = enemies[eIdx];
        if (!e || e.hp <= 0 || e.primed) continue;
        const dxM = e.x - m.x, dyM = e.y - m.y, lim = m.triggerR + e.r;
        if (dxM * dxM + dyM * dyM <= lim * lim) {
          triggered = true; break;
        }
      }
      if (triggered) {
        const mCrit = player.turretCrit && Math.random() < baseCrit * (player.turretCritScale || 0.85);
        const mDmg = m.dmg * (mCrit ? getEffectiveCritMult(1.85) : 1);
        const mSrc = m.srcId || 'landmine';
        mines.splice(mIdx, 1);
        const prevActW = _activeWeaponId;
        _activeWeaponId = mSrc;
        try {
          triggerExplosion(m.x, m.y, m.blastR, mDmg, false, 0, '#4cc9f0', true);
        } finally {
          _activeWeaponId = prevActW;
        }
        if (state !== 'wave') return;
      }
    }
  }

  const nowOrbitBase = performance.now() * 0.0009;
  _meleeTargets.length = 0;
  try {
  for (let idx = 0; idx < nW; idx++) {
    const w = player.weapons[idx];
    const tpl = w && WEAPONS[w.id];
    if (!tpl) continue;
    _activeWeaponId = w.id;
    const orbitR = nW > 6 ? 44 : 38;
    const orbitA = (idx / Math.max(1, nW)) * Math.PI * 2 + nowOrbitBase;
    const cosOrbit = Math.cos(orbitA), sinOrbit = Math.sin(orbitA);
    const baseWx = player.x + cosOrbit * orbitR;
    const baseWy = player.y + sinOrbit * (orbitR * 0.9);
    const evo = typeof getWeaponEvo === 'function' ? getWeaponEvo(w) : null;
    const maxR = typeof calcWeaponEffectiveRange === 'function'
      ? calcWeaponEffectiveRange(tpl, w.tier, evo, totalRange)
      : Math.max(tpl.melee ? 74 : 54, tpl.range + (tpl.melee ? Math.round(totalRange * 0.56 + (player.meleeSweepBonus || 0) * 16) : totalRange) + (evo ? (evo.rangeAdd || 0) : 0) + (w.tier - 1) * (tpl.melee ? 8 : 13));
    if (maxR > maxEquipRange) maxEquipRange = maxR;

    let best = null, bestScore = Infinity, bestIsTree = false;
    if (tpl.melee) {
      // 近战智能索敌：消除武器环绕半径盲区（兼顾玩家本体距离与武器挂点距离）+ 威胁优先 + 多武器侧翼自动分流防鞭尸
      const pReach = Math.max(64, maxR - 4);
      const checkSpread = w.cd <= 0.08 && _meleeTargets.length > 0;
      for (let ei = 0; ei < enemies.length; ei++) {
        const e = enemies[ei];
        if (!e || e.hp <= 0 || e.primed) continue;
        const er = e.r || 15;
        const dxW = e.x - baseWx, dyW = e.y - baseWy;
        const dxP = e.x - player.x, dyP = e.y - player.y;
        const limW = maxR + er, limP = pReach + er;
        const inW = dxW > -limW && dxW < limW && dyW > -limW && dyW < limW && (dxW * dxW + dyW * dyW <= limW * limW);
        const dSqP = dxP * dxP + dyP * dyP;
        const inP = dSqP <= limP * limP;
        if (!inW && !inP) continue;
        const rawDP = Math.sqrt(dSqP);
        const edgeDP = rawDP - er;
        const flankDot = (dxP * cosOrbit + dyP * sinOrbit) / Math.max(14, rawDP);
        let score = edgeDP - flankDot * 16;
        if (checkSpread && e.type !== 'boss' && e.type !== 'special_boss' && e.type !== 'mini_boss') {
          let assigned = 0;
          for (let mi = 0; mi < _meleeTargets.length; mi++) {
            if (_meleeTargets[mi] === e) assigned++;
          }
          if (assigned > 0) score += assigned * 48;
        }
        if (score < bestScore) { bestScore = score; best = e; bestIsTree = false; }
      }
      if (best && w.cd <= 0.08) _meleeTargets.push(best);
      if (!best && tpl.throwsBoomerang) {
        let bestBoomD = maxR * 1.95;
        for (let ei = 0; ei < enemies.length; ei++) {
          const e = enemies[ei];
          if (!e || e.hp <= 0 || e.primed) continue;
          const d = Math.hypot(e.x - baseWx, e.y - baseWy) - (e.r || 15);
          if (d < bestBoomD) { bestBoomD = d; best = e; bestIsTree = false; }
        }
      }
    } else {
      let bestD = maxR;
      for (let ei = 0; ei < enemies.length; ei++) {
        const e = enemies[ei];
        if (!e || e.hp <= 0 || e.primed) continue;
        const dxE = e.x - baseWx, lim = bestD + e.r;
        if (dxE >= lim || dxE <= -lim) continue;
        const dyE = e.y - baseWy;
        if (dyE >= lim || dyE <= -lim) continue;
        const dSq = dxE * dxE + dyE * dyE;
        if (dSq >= lim * lim) continue;
        const d = Math.sqrt(dSq) - e.r;
        if (d < bestD) { bestD = d; best = e; bestIsTree = false; }
      }
    }
    // 若射程内存在首领共鸣阵眼棱柱（或射程内无怪物时的普通封魂晶碑），武器会智能优先转火击破阵眼！
    if (trees.length > 0) {
      let bestPylon = null, bestPD = maxR;
      for (let ti = 0; ti < trees.length; ti++) {
        const tr = trees[ti];
        if (!tr || !tr.isBossPylon || tr.hp <= 0) continue;
        const dxT = tr.x - baseWx, dyT = tr.y - baseWy, limT = bestPD + tr.r;
        const dSqT = dxT * dxT + dyT * dyT;
        if (dSqT >= limT * limT) continue;
        const d = Math.sqrt(dSqT) - tr.r;
        if (d < bestPD) { bestPD = d; bestPylon = tr; }
      }
      if (bestPylon && (!best || best.type === 'boss' || bestPD < Math.hypot(best.x - baseWx, best.y - baseWy) - 18)) {
        best = bestPylon;
        bestIsTree = true;
      }
    }
    if (!best && trees.length > 0) {
      let bestTD = maxR;
      for (let ti = 0; ti < trees.length; ti++) {
        const tr = trees[ti];
        if (!tr || tr.hp <= 0) continue;
        const dxT = tr.x - baseWx, dyT = tr.y - baseWy, limT = bestTD + tr.r;
        const dSqT = dxT * dxT + dyT * dyT;
        if (dSqT >= limT * limT) continue;
        const d = Math.sqrt(dSqT) - tr.r;
        if (d < bestTD) { bestTD = d; best = tr; bestIsTree = true; }
      }
    }
    if (best) {
      const targetA = Math.atan2(best.y - baseWy, best.x - baseWx);
      w.angle = (!tpl.melee || w.cd <= dt * 1.5) ? targetA : _lerpAngle(w.angle, targetA, Math.min(1, dt * 26));
    } else if (tpl.melee) {
      const preAimLim = maxR * 1.75 + 75;
      const idleTargetA = (nearestE && nearestDSq <= preAimLim * preAimLim)
        ? Math.atan2(nearestE.y - baseWy, nearestE.x - baseWx)
        : (Number.isFinite(player.lookA) ? player.lookA : (player.faceDir > 0 ? 0 : Math.PI));
      w.angle = _lerpAngle(w.angle, idleTargetA, Math.min(1, dt * 12));
    } else {
      w.angle = player.faceDir > 0 ? 0 : Math.PI;
    }

    w.cd -= dt;
    if (w.thrust > 0) w.thrust = Math.max(0, w.thrust - dt * (w.id === 'spear' ? 4.8 : 5.8));
    if (w.recoil > 0) w.recoil = Math.max(0, w.recoil - dt * 8);

    if (best && w.cd <= 0) {
      w.angle = Math.atan2(best.y - baseWy, best.x - baseWx);
      const tierScale = typeof calcWeaponTierScale === 'function' ? calcWeaponTierScale(tpl, w.tier) : ((1 + (w.tier - 1) * 0.55) * (w.tier >= 5 ? 1.04 : 1));
      const bonusMoveSpd = Math.max(0, getEffectiveSpdMul() - 1);
      const aspdBonusDmg = tpl.aspdScale ? Math.max(0, effAspd - 1) * 9 : 0;
      const rangeBonusDmg = tpl.rangeScale ? Math.max(0, totalRange) * tpl.rangeScale : 0;
      const hpBonusDmg = tpl.hpScale ? Math.max(0, player.maxHp) * tpl.hpScale : 0;
      const armBonusDmg = tpl.armorScale ? Math.max(0, getTotalArmor()) * tpl.armorScale : 0;
      const blastBonusDmg = tpl.blastScaleDmg ? Math.max(0, getBlastScale() - 1) * tpl.dmg * tpl.blastScaleDmg : 0;
      const spdBonusDmg = tpl.spdScale ? bonusMoveSpd * tpl.dmg * tpl.spdScale : 0;
      const flatDmgAdd = typeof calcWeaponFlatDmgAdd === 'function' ? calcWeaponFlatDmgAdd(w.id, tpl, w.tier) : 0;
      const base = ((tpl.dmg + aspdBonusDmg + rangeBonusDmg + hpBonusDmg + armBonusDmg + blastBonusDmg + spdBonusDmg) * tierScale + flatDmgAdd + (w.id === 'stick' ? Math.max(0, stickCount - 1) * 4.8 : 0)) * (evo && evo.dmgMul ? evo.dmgMul : 1);
      const finalMul = calcWeaponFinalMul(tpl, effDmg, setB);
      const swingSeq = tpl.melee ? (player._meleeSwingSeq = (player._meleeSwingSeq || 0) + 1) : 0;
      const forceKenshin = !!(tpl.melee && player.kenshinFourthSlash && (swingSeq % 4 === 0));
      const procFifthWave = !!(tpl.melee && !forceKenshin && player.kenshinFifthSlash && (swingSeq % 5 === 0));
      const critChance = forceKenshin ? 1.0 : (baseCrit + (tpl.critBonus || 0) + (tpl.spdScale ? bonusMoveSpd * 0.15 : 0) + (w.tier - 1) * 0.03 + (evo && evo.critAdd ? evo.critAdd : 0));
      const critMult = getEffectiveCritMult((tpl.critMult || 1.95) + (evo && evo.critMultAdd ? evo.critMultAdd : 0));
      const evoCdMul = (evo && evo.cdMul) ? evo.cdMul : 1;
      const staffCdHaste = tpl.isStaff ? (1 + (player.staffHaste || 0)) : 1;
      const spdCdHaste = tpl.spdScale ? (1 + bonusMoveSpd * 0.45) : 1;
      w.cd = (tpl.cd * evoCdMul) / Math.max(0.18, effAspd * staffCdHaste * spdCdHaste * (1 + (w.tier - 1) * 0.08));
      const staffDblCh = Math.min(0.30, (player.staffDoubleCastChance || 0) + (player.extraShotChance || 0));
      if (tpl.isStaff && staffDblCh > 0 && !w._echoQueued && Math.random() < staffDblCh) {
        w._echoQueued = true;
        w.cd = Math.min(w.cd, 0.14);
        addText(player.x, player.y - 34, '奥术双重咏唱!', '#c084fc', 13, 0.52, false);
      } else {
        w._echoQueued = false;
      }
      player._atkPoseT = Math.max(player._atkPoseT || 0, tpl.melee ? 0.21 : 0.14);
      player._atkAimX = Math.cos(w.angle);
      player._atkAngle = w.angle;

      if (tpl.melee) {
        w.thrust = 1;
        beep(w.id === 'hammer' || w.id === 'rock' || w.id === 'spiked_shield' ? 130 : (w.id === 'katana' || w.id === 'magma_blade' ? 330 : (w.id === 'knife' || w.id === 'claws' ? 295 : 195)), 0.055, 'triangle', 0.045);
        const sColor = (evo && evo.color) ? evo.color : (TIER_COLORS[w.tier] === '#e2deec' ? tpl.arcColor : TIER_COLORS[w.tier]);
        const evoBurn = !!(tpl.burnSlash || (evo && evo.forceBurn));
        const evoFreezeChance = (evo && evo.forceFreeze) ? evo.forceFreeze : 0;
        const evoChains = (evo && evo.chainOnHit) ? evo.chainOnHit : 0;
        // 收束武器环绕外扩触及补偿，确保近战与远程交战距离清晰拉开
        const effReach = Math.max(maxR, Math.min(maxR + orbitR * 0.35, Math.hypot(best.x - baseWx, best.y - baseWy) + 12));
        // 近战斩弹几率减半调优（-50%）：T1~T4 普通近战无法直接抹除弹道；仅佩戴 T4 唯一饰品【断刃狐月鞘】(17.5%) 或晋升 T5 神话近战武器 (20%，叠加软上限 30%) 时按概率斩碎敌弹！
        const cutChance = Math.min(0.30, (w.tier >= 5 ? 0.20 : 0) + (player.meleeBulletCutChance || 0));

        if (tpl.mode === 'spear') {
          // 长矛 / 5阶沧溟三叉戟 / 冈格尼尔超距雷霆枪
          const prongs = (evo && evo.tridentThrust) ? [-0.22, 0, 0.22] : [0];
          const hitEnemies = prongs.length > 1 ? new Set() : null;
          let chainFired = false;
          for (let pi = 0; pi < prongs.length; pi++) {
            const pAng = w.angle + prongs[pi];
            const ex = baseWx + Math.cos(pAng) * effReach, ey = baseWy + Math.sin(pAng) * effReach;
            if (slashes.length < 36) slashes.push({ x: baseWx, y: baseWy, angle: pAng, r: effReach, color: sColor, mode: 'spear', t: 0.16, maxT: 0.16 });
            const l2 = effReach * effReach;
            for (let i = enemies.length - 1; i >= 0; i--) {
              const e = enemies[i];
              if (e.hp <= 0 || (hitEnemies && hitEnemies.has(e))) continue;
              const proj = Math.max(0, Math.min(1, ((e.x - baseWx) * (ex - baseWx) + (e.y - baseWy) * (ey - baseWy)) / l2));
              const px = baseWx + proj * (ex - baseWx), py = baseWy + proj * (ey - baseWy);
              if (Math.hypot(e.x - px, e.y - py) <= e.r + 24) {
                if (hitEnemies) hitEnemies.add(e);
                const isCrit = Math.random() < critChance;
                hurtEnemy(e, base * finalMul * (isCrit ? critMult : 1), isCrit, pAng, evoBurn, {
                  isMelee: true,
                  forceBurn: evoBurn,
                  forceFreeze: evoFreezeChance > 0 && Math.random() < evoFreezeChance
                });
                if (state !== 'wave') return;
                if (evoChains > 0 && !chainFired && e.hp > 0) {
                  chainFired = true;
                  castChainLightning(e.x, e.y, e, evoChains, base * finalMul * 0.62, critChance * 0.6);
                  if (state !== 'wave') return;
                }
              }
            }
            for (let i = trees.length - 1; i >= 0; i--) {
              const tr = trees[i];
              if (tr.hp <= 0) continue;
              const proj = Math.max(0, Math.min(1, ((tr.x - baseWx) * (ex - baseWx) + (tr.y - baseWy) * (ey - baseWy)) / l2));
              const px = baseWx + proj * (ex - baseWx), py = baseWy + proj * (ey - baseWy);
              if (Math.hypot(tr.x - px, tr.y - py) <= tr.r + 20) hurtTree(tr, base * finalMul);
            }
          }
          if (cutChance > 0 && eBullets.length > 0) {
            let slicedSpear = 0;
            const spearCap = prongs.length > 1 ? 3 : 2;
            const ex0 = baseWx + Math.cos(w.angle) * effReach, ey0 = baseWy + Math.sin(w.angle) * effReach;
            for (let bi = eBullets.length - 1; bi >= 0 && slicedSpear < spearCap; bi--) {
              const eb = eBullets[bi];
              if (!eb || eb.isCelestial) continue;
              const proj = Math.max(0, Math.min(1, ((eb.x - baseWx) * (ex0 - baseWx) + (eb.y - baseWy) * (ey0 - baseWy)) / (effReach * effReach)));
              const px = baseWx + proj * (ex0 - baseWx), py = baseWy + proj * (ey0 - baseWy);
              if (Math.hypot(eb.x - px, eb.y - py) <= (eb.r || 5) + (prongs.length > 1 ? 30 : 18) && Math.random() < cutChance) {
                addSparks(eb.x, eb.y, w.angle, '#ffd166', 2);
                eBullets.splice(bi, 1);
                slicedSpear++;
              }
            }
          }
        } else if (tpl.mode === 'stab') {
          // 匕首 / 螺丝刀：精准高速前刺寒芒走廊 + 贴身护卫弧度判定（解决旧版刀光与扇形判定错位）
          const ex = baseWx + Math.cos(w.angle) * effReach, ey = baseWy + Math.sin(w.angle) * effReach;
          const l2 = effReach * effReach;
          if (slashes.length < 36) {
            slashes.push({
              x: baseWx + Math.cos(w.angle) * 12, y: baseWy + Math.sin(w.angle) * 12,
              angle: w.angle, r: effReach, color: evo ? sColor : (tpl.burnSlash ? '#ff6b35' : sColor),
              mode: 'stab', t: 0.15, maxT: 0.15
            });
          }
          if (cutChance > 0 && eBullets.length > 0) {
            let slicedCnt = 0;
            const sliceCap = w.tier >= 5 ? 2 : 1;
            for (let bi = eBullets.length - 1; bi >= 0 && slicedCnt < sliceCap; bi--) {
              const eb = eBullets[bi];
              if (!eb || eb.isCelestial) continue;
              const proj = Math.max(0, Math.min(1, ((eb.x - baseWx) * (ex - baseWx) + (eb.y - baseWy) * (ey - baseWy)) / l2));
              const px = baseWx + proj * (ex - baseWx), py = baseWy + proj * (ey - baseWy);
              if (Math.hypot(eb.x - px, eb.y - py) <= (eb.r || 5) + 22 && Math.random() < cutChance) {
                addSparks(eb.x, eb.y, w.angle, '#ffd166', 2);
                eBullets.splice(bi, 1);
                slicedCnt++;
              }
            }
          }
          let stabChainFired = false;
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (!e || e.hp <= 0) continue;
            const proj = Math.max(0, Math.min(1, ((e.x - baseWx) * (ex - baseWx) + (e.y - baseWy) * (ey - baseWy)) / l2));
            const px = baseWx + proj * (ex - baseWx), py = baseWy + proj * (ey - baseWy);
            let hitStab = Math.hypot(e.x - px, e.y - py) <= e.r + 26;
            if (!hitStab) {
              const dxE = e.x - baseWx, dyE = e.y - baseWy, closeLim = effReach * 0.56 + e.r;
              if (dxE * dxE + dyE * dyE <= closeLim * closeLim) {
                let da = Math.abs(Math.atan2(dyE, dxE) - w.angle) % (Math.PI * 2);
                if (da > Math.PI) da = Math.PI * 2 - da;
                if (da < 0.78) hitStab = true;
              }
            }
            if (hitStab) {
              const isCrit = Math.random() < critChance;
              hurtEnemy(e, base * finalMul * (isCrit ? critMult : 1), isCrit, w.angle, evoBurn, {
                isMelee: true,
                knockMult: tpl.knockMult || 1,
                forceBurn: evoBurn,
                forceFreeze: evoFreezeChance > 0 && Math.random() < evoFreezeChance
              });
              if (state !== 'wave') return;
              if (evoChains > 0 && !stabChainFired && e.hp > 0) {
                stabChainFired = true;
                castChainLightning(e.x, e.y, e, evoChains, base * finalMul * 0.60, critChance * 0.55);
                if (state !== 'wave') return;
              }
            }
          }
          for (let i = trees.length - 1; i >= 0; i--) {
            const tr = trees[i];
            if (!tr || tr.hp <= 0) continue;
            const proj = Math.max(0, Math.min(1, ((tr.x - baseWx) * (ex - baseWx) + (tr.y - baseWy) * (ey - baseWy)) / l2));
            const px = baseWx + proj * (ex - baseWx), py = baseWy + proj * (ey - baseWy);
            if (Math.hypot(tr.x - px, tr.y - py) <= tr.r + 22) hurtTree(tr, base * finalMul);
          }
        } else {
          // 刀剑横扫 / 守誓残杖阔扫 / 利爪撕裂 / 居合太刀 / 巨石钝击 / 裂地战锤 / 尖刺重盾 / 黑曜流星链枷 / 熔岩重刃 + 5阶神话进化
          const arcSpan = (tpl.fullCircleFlail ? 2.25 : (tpl.mode === 'crescent' ? 1.18 : (w.id === 'stick' ? 1.08 : 0.96))) + (player.meleeSweepBonus || 0) * 0.16 + (evo ? 0.14 : 0);
          if (slashes.length < 36) {
            slashes.push({
              x: baseWx + Math.cos(w.angle) * 18, y: baseWy + Math.sin(w.angle) * 18,
              angle: w.angle, r: effReach, color: evo ? sColor : (tpl.burnSlash ? '#ff6b35' : sColor),
              mode: tpl.mode || 'arc', t: 0.16, maxT: 0.16
            });
          }
          if (cutChance > 0 && eBullets.length > 0) {
            let slicedCnt = 0;
            const sliceCap = w.tier >= 5 ? 3 : 2;
            const sliceLim = Math.min(176, effReach * 0.94);
            const sliceLimSq = sliceLim * sliceLim;
            for (let bi = eBullets.length - 1; bi >= 0 && slicedCnt < sliceCap; bi--) {
              const eb = eBullets[bi];
              if (!eb || eb.isCelestial) continue;
              const dxB = eb.x - baseWx, dyB = eb.y - baseWy;
              if (dxB * dxB + dyB * dyB > sliceLimSq) continue;
              let daB = Math.abs(Math.atan2(dyB, dxB) - w.angle) % (Math.PI * 2);
              if (daB > Math.PI) daB = Math.PI * 2 - daB;
              if (daB < arcSpan && Math.random() < cutChance) {
                addSparks(eb.x, eb.y, w.angle, '#ffd166', 2);
                eBullets.splice(bi, 1);
                slicedCnt++;
              }
            }
          }
          let critChainTriggered = false;
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (!e || e.hp <= 0) continue;
            const dxE = e.x - baseWx, dyE = e.y - baseWy, limE = effReach + e.r;
            const dSqE = dxE * dxE + dyE * dyE;
            if (dSqE > limE * limE) continue;
            let da = Math.abs(Math.atan2(dyE, dxE) - w.angle) % (Math.PI * 2);
            if (da > Math.PI) da = Math.PI * 2 - da;
            const closeGuardSq = (46 + e.r) * (46 + e.r);
            if (da < arcSpan || (dSqE <= closeGuardSq && da < arcSpan + 0.34)) {
              const isCrit = Math.random() < critChance;
              hurtEnemy(e, base * finalMul * (isCrit ? critMult : 1), isCrit, w.angle, evoBurn, {
                isMelee: true,
                knockMult: tpl.knockMult || 1,
                forceBurn: evoBurn,
                forceFreeze: evoFreezeChance > 0 && Math.random() < evoFreezeChance
              });
              if (state !== 'wave') return;
              const wantChains = evoChains > 0 ? evoChains : ((tpl.burnSlash && (isCrit || Math.random() < 0.35)) ? 3 : 0);
              if (wantChains > 0 && !critChainTriggered && e.hp > 0) {
                critChainTriggered = true;
                castChainLightning(e.x, e.y, e, wantChains, base * finalMul * 0.60, critChance * 0.55);
                if (state !== 'wave') return;
              }
            }
          }
          for (let i = trees.length - 1; i >= 0; i--) {
            const tr = trees[i];
            if (!tr || tr.hp <= 0) continue;
            const dxT = tr.x - baseWx, dyT = tr.y - baseWy, limT = effReach + tr.r;
            if (dxT * dxT + dyT * dyT > limT * limT) continue;
            let da = Math.abs(Math.atan2(dyT, dxT) - w.angle) % (Math.PI * 2);
            if (da > Math.PI) da = Math.PI * 2 - da;
            if (da < arcSpan) hurtTree(tr, base * finalMul);
          }
          if (tpl.slam || (evo && evo.slam)) {
            const hx = baseWx + Math.cos(w.angle) * (effReach * 0.68), hy = baseWy + Math.sin(w.angle) * (effReach * 0.68);
            const sr = 68 * ((evo && evo.slamScale) ? evo.slamScale : 1) * getBlastScale();
            const slamCol = (evo && evo.color) ? evo.color : (w.id === 'spiked_shield' ? '#94a3b8' : '#f4a261');
            if (rings.length < 30) rings.push({ x: hx, y: hy, r: sr, color: slamCol, t: 0.22, maxT: 0.22, fill: false });
            if (enemies.length <= 28 && stains.length < 12) pushStain({ x: hx, y: hy, r: 22, color: '#14101c', kind: 'scorch' });
            for (let i = enemies.length - 1; i >= 0; i--) {
              const e = enemies[i];
              if (!e || e.hp <= 0) continue;
              const dxS = e.x - hx, dyS = e.y - hy, limS = sr + e.r;
              if (dxS * dxS + dyS * dyS <= limS * limS) {
                const slamPull = !!(evo && evo.pullSlam && e.type !== 'boss' && e.type !== 'special_boss' && e.type !== 'mini_boss');
                if (slamPull) {
                  const sDist = Math.sqrt(dxS * dxS + dyS * dyS) || 1;
                  e.x -= (dxS / sDist) * Math.min(28, sDist * 0.40);
                  e.y -= (dyS / sDist) * Math.min(28, sDist * 0.40);
                }
                hurtEnemy(e, base * finalMul * (evo && evo.slam ? 0.65 : 0.52), false, Math.atan2(dyS, dxS), true, {
                  isMelee: true,
                  knockMult: slamPull ? 0.2 : 1.5,
                  forceBurn: evoBurn,
                  forceFreeze: evoFreezeChance > 0 && Math.random() < evoFreezeChance,
                  noProc: !evo,
                  silentHit: true
                });
                if (state !== 'wave') return;
              }
            }
          }
        }
        // 【苍骨回旋战刃】掷出折返旋转骨轮：飞出至远端后调头追向玩家位置，往返两段独立命中！
        if (tpl.throwsBoomerang && bullets.length < (isTouch ? 180 : 250)) {
          const bmCount = (evo && evo.boomerangCount) ? evo.boomerangCount : 1;
          const bmSpd = 610;
          const outDur = Math.max(0.32, Math.min(0.62, (maxR * 1.95) / bmSpd));
          const bmCol = (evo && evo.color) ? evo.color : '#e2e8f0';
          for (let bk = 0; bk < bmCount && bullets.length < (isTouch ? 180 : 250); bk++) {
            const bmAng = w.angle + (bmCount > 1 ? (bk - (bmCount - 1) * 0.5) * 0.28 : 0);
            const isCrit = Math.random() < critChance;
            bullets.push({
              x: baseWx + Math.cos(bmAng) * 18, y: baseWy + Math.sin(bmAng) * 18,
              px: baseWx, py: baseWy, ox: baseWx, oy: baseWy, srcId: w.id,
              vx: Math.cos(bmAng) * bmSpd, vy: Math.sin(bmAng) * bmSpd,
              dmg: base * finalMul * 0.78 * (isCrit ? critMult : 1), isCrit, angle: bmAng,
              pierce: 3 + ((evo && evo.pierceAdd) || 0) + (player.pierceBonus || 0), bounces: 0,
              isStar: true, isBoomerang: true, isWaveArc: true,
              bmAge: 0, returnAt: outDur, bmSpd,
              poisonHit: (evo && evo.forcePoison) ? 1.0 : 0,
              life: outDur * 2.15, maxLife: outDur * 2.15,
              color: bmCol, r: evo ? 10.5 : 8.8, spin: Math.random() * 6.28,
              hit: null, lastHit: null
            });
          }
        }
        // 近战剑气波（【绯红九百九十九斩】遗物 或 5 阶兵装进化 waveCount 多道扇形月轮剑波，同步享受先弹射后穿透！）
        const evoWaves = (evo && evo.waveCount) ? evo.waveCount : 0;
        const totalWaves = evoWaves > 0 ? evoWaves : ((player.meleeShockwave || forceKenshin || procFifthWave) ? 1 : 0);
        if (totalWaves > 0 && bullets.length < (isTouch ? 180 : 250)) {
          const wSpd = 565;
          const waveCol = (evo && evo.color) ? evo.color : (forceKenshin ? '#fb7185' : (procFifthWave && !player.meleeShockwave ? '#72efdd' : '#ffd166'));
          const sharedWaveHit = totalWaves > 1 ? new Set() : null;
          const wDmgMul = evoWaves > 0 ? 0.52 : ((player.meleeShockwave || forceKenshin) ? 0.48 : 0.42);
          for (let wk = 0; wk < totalWaves && bullets.length < (isTouch ? 180 : 250); wk++) {
            const wAng = w.angle + (totalWaves > 1 ? (wk - (totalWaves - 1) * 0.5) * 0.22 : 0);
            bullets.push({
              x: baseWx + Math.cos(wAng) * 20, y: baseWy + Math.sin(wAng) * 20,
              px: baseWx, py: baseWy, ox: baseWx, oy: baseWy, srcId: w.id,
              vx: Math.cos(wAng) * wSpd, vy: Math.sin(wAng) * wSpd,
              dmg: base * finalMul * wDmgMul, isCrit: forceKenshin, angle: wAng,
              pierce: Math.max(0, (evoWaves > 0 ? 3 : 2) + player.pierceBonus), bounces: player.bounceBonus || 0, isWaveArc: true,
              isFlame: evoBurn,
              life: 0.48, maxLife: 0.48, color: waveCol, r: evoWaves > 0 ? 11 : 9.5, hit: sharedWaveHit, lastHit: null
            });
          }
        }
      } else if (tpl.isChain) {
        // 电击枪：跳跃连锁闪电 + 5阶万雷天牢/超导雷暴星核
        w.recoil = 1;
        beep(640, 0.055, 'sawtooth', 0.036);
        const mx = baseWx + Math.cos(w.angle) * 16, my = baseWy + Math.sin(w.angle) * 16;
        if (bestIsTree) {
          lightnings.push({ pts: [{ x: mx, y: my }, { x: best.x, y: best.y }], color: (evo && evo.color) || '#72efdd', t: 0.14, maxT: 0.14 });
          hurtTree(best, base * finalMul);
        } else {
          const totalChains = tpl.chains + (w.tier >= 3 ? 1 : 0) + (w.tier >= 5 ? 1 : 0) + (evo && evo.chainsAdd ? evo.chainsAdd : 0) + (player.bounceBonus || 0);
          castChainLightning(mx, my, best, totalChains, base * finalMul, critChance);
          if (state !== 'wave') return;
          if (evo && evo.blastAdd) {
            triggerExplosion(best.x, best.y, evo.blastAdd * getBlastScale(), base * finalMul * 0.58, false, 0, evo.color || '#60a5fa', false);
            if (state !== 'wave') return;
            if (evo.forceFreeze && Math.random() < evo.forceFreeze && best.hp > 0) best.freezeT = Math.max(best.freezeT || 0, 1.35);
          }
        }
      } else if (tpl.isBeam || tpl.isSniper || tpl.isEmpBeam) {
        // 激光枪 / 狙击枪 / 电磁轨道炮 瞬发射线（严格遵循「先弹射折射、耗尽弹射后再直线贯穿」！）
        w.recoil = 1;
        beep(tpl.isSniper ? 205 : (tpl.isEmpBeam ? 260 : 720), 0.075, 'sawtooth', tpl.isSniper || tpl.isEmpBeam ? 0.055 : 0.038);
        const beamCount = 1 + ((evo && evo.pelletsAdd) ? evo.pelletsAdd : 0);
        const beamCol = (evo && evo.color) ? evo.color : (tpl.isEmpBeam ? '#4cc9f0' : (tpl.isSniper ? '#ffe8a3' : TIER_COLORS[Math.max(2, w.tier)]));
        const beamDur = tpl.isSniper || tpl.isEmpBeam ? 0.22 : 0.16;
        const beamThin = !!tpl.isSniper && !evo;
        if (tpl.isSniper && shells.length < 60) {
          const sa = w.angle - Math.PI * 0.5;
          shells.push({ x: baseWx, y: baseWy, vx: Math.cos(sa) * 110, vy: Math.sin(sa) * 110 - 35, rot: 0, t: 0.5 });
        }
        const maxPierceHits = Math.max(1, (tpl.pierce || 3) + player.pierceBonus + ((evo && evo.pierceAdd) ? evo.pierceAdd : 0));
        const rayBounces = (tpl.bounce || 0) + (player.bounceBonus || 0) + ((evo && evo.bounceAdd) ? evo.bounceAdd : 0);
        const hitPad = (tpl.isEmpBeam ? 15 : 9) + (evo ? 3 : 0);
        for (let bIdx = 0; bIdx < beamCount; bIdx++) {
          const bAng = w.angle + (beamCount > 1 ? (bIdx - (beamCount - 1) * 0.5) * 0.16 : 0);
          const ex = baseWx + Math.cos(bAng) * maxR, ey = baseWy + Math.sin(bAng) * maxR;
          const l2 = maxR * maxR || 1;
          const cands = [];
          for (let ei = 0; ei < enemies.length; ei++) {
            const e = enemies[ei];
            if (!e || e.hp <= 0 || e.primed) continue;
            const proj = Math.max(0, Math.min(1, ((e.x - baseWx) * (ex - baseWx) + (e.y - baseWy) * (ey - baseWy)) / l2));
            const px = baseWx + proj * (ex - baseWx), py = baseWy + proj * (ey - baseWy);
            const dxP = e.x - px, dyP = e.y - py, limP = e.r + hitPad;
            if (dxP * dxP + dyP * dyP <= limP * limP) cands.push({ e, proj });
          }
          cands.sort((a, b) => a.proj - b.proj);
          let lastHitE = null;

          if (rayBounces > 0 && cands.length > 0 && !bestIsTree) {
            // 先弹射折射、后直线贯穿：命中首个目标即折向邻近敌人，全部弹射次数打完后末段射线再执行剩余贯穿！
            let curE = cands[0].e;
            let curAng = bAng;
            let rayDmg = base * finalMul;
            const rayVisited = new Set([curE]);
            if (beams.length < 36) {
              beams.push({ x1: baseWx + Math.cos(bAng) * 18, y1: baseWy + Math.sin(bAng) * 18, x2: curE.x, y2: curE.y, color: beamCol, thin: beamThin, t: beamDur, maxT: beamDur });
            }
            const firstCrit = Math.random() < critChance;
            lastHitE = curE;
            hurtEnemy(curE, rayDmg * (firstCrit ? critMult : 1), firstCrit, bAng, !tpl.isSniper || !!evo, {
              knockMult: tpl.isSniper ? 1.8 : 1.2,
              forceBurn: !!(evo && evo.forceBurn),
              forceChill: !!tpl.isEmpBeam,
              forceFreeze: !!(evo && evo.forceFreeze && Math.random() < evo.forceFreeze)
            });
            if (state !== 'wave') return;

            let bouncedCount = 0;
            for (let rb = 0; rb < rayBounces; rb++) {
              let nextRayE = null, nextRayDSq = 410 * 410;
              for (let ci = 0; ci < enemies.length; ci++) {
                const cand = enemies[ci];
                if (cand && cand !== curE && cand.hp > 0 && !cand.primed && !rayVisited.has(cand)) {
                  const cdx = cand.x - curE.x, cdy = cand.y - curE.y;
                  if (cdx * cdx + cdy * cdy < nextRayDSq) { nextRayDSq = cdx * cdx + cdy * cdy; nextRayE = cand; }
                }
              }
              if (!nextRayE) {
                nextRayDSq = 385 * 385;
                for (let ci = 0; ci < enemies.length; ci++) {
                  const cand = enemies[ci];
                  if (cand && cand !== curE && cand.hp > 0 && !cand.primed) {
                    const cdx = cand.x - curE.x, cdy = cand.y - curE.y;
                    if (cdx * cdx + cdy * cdy < nextRayDSq) { nextRayDSq = cdx * cdx + cdy * cdy; nextRayE = cand; }
                  }
                }
              }
              if (!nextRayE) break;
              bouncedCount++;
              curAng = Math.atan2(nextRayE.y - curE.y, nextRayE.x - curE.x);
              rayDmg *= (0.92 + (player.bounceAmpDmg || 0));
              if (beams.length < 36) {
                beams.push({ x1: curE.x, y1: curE.y, x2: nextRayE.x, y2: nextRayE.y, color: beamCol, thin: beamThin, t: beamDur, maxT: beamDur });
              }
              const bCrit = Math.random() < critChance;
              lastHitE = nextRayE;
              rayVisited.add(nextRayE);
              hurtEnemy(nextRayE, rayDmg * (bCrit ? critMult : 1), bCrit, curAng, !tpl.isSniper || !!evo, {
                knockMult: tpl.isSniper ? 1.6 : 1.1,
                forceBurn: !!(evo && evo.forceBurn),
                forceChill: !!tpl.isEmpBeam,
                forceFreeze: !!(evo && evo.forceFreeze && Math.random() < evo.forceFreeze)
              });
              if (state !== 'wave') return;
              curE = nextRayE;
            }

            // 弹射次数结算完毕后，沿末段方向释放剩余贯穿（pierce）！
            const remPierce = Math.max(0, maxPierceHits - 1);
            if (remPierce > 0 && curE) {
              const tailLen = bouncedCount > 0 ? maxR * 0.78 : maxR;
              const tx2 = curE.x + Math.cos(curAng) * tailLen, ty2 = curE.y + Math.sin(curAng) * tailLen;
              const tl2 = tailLen * tailLen || 1;
              const tailCands = [];
              for (let ei = 0; ei < enemies.length; ei++) {
                const te = enemies[ei];
                if (!te || te === curE || te.hp <= 0 || te.primed || rayVisited.has(te)) continue;
                const proj = ((te.x - curE.x) * (tx2 - curE.x) + (te.y - curE.y) * (ty2 - curE.y)) / tl2;
                if (proj <= 0 || proj > 1) continue;
                const px = curE.x + proj * (tx2 - curE.x), py = curE.y + proj * (ty2 - curE.y);
                const dxP = te.x - px, dyP = te.y - py, limP = te.r + hitPad;
                if (dxP * dxP + dyP * dyP <= limP * limP) tailCands.push({ e: te, proj });
              }
              tailCands.sort((a, b) => a.proj - b.proj);
              if (tailCands.length > 0 || bouncedCount === 0) {
                if (beams.length < 36) {
                  beams.push({ x1: curE.x, y1: curE.y, x2: tx2, y2: ty2, color: beamCol, thin: beamThin, t: beamDur, maxT: beamDur });
                }
                for (let k = 0; k < Math.min(remPierce, tailCands.length); k++) {
                  const pCrit = Math.random() < critChance;
                  lastHitE = tailCands[k].e;
                  hurtEnemy(lastHitE, rayDmg * (pCrit ? critMult : 1), pCrit, curAng, !tpl.isSniper || !!evo, {
                    knockMult: tpl.isSniper ? 1.6 : 1.1,
                    forceBurn: !!(evo && evo.forceBurn),
                    forceChill: !!tpl.isEmpBeam,
                    forceFreeze: !!(evo && evo.forceFreeze && Math.random() < evo.forceFreeze)
                  });
                  if (state !== 'wave') return;
                }
              }
            }
          } else {
            if (beams.length < 36) {
              beams.push({
                x1: baseWx + Math.cos(bAng) * 18, y1: baseWy + Math.sin(bAng) * 18, x2: ex, y2: ey,
                color: beamCol, thin: beamThin, t: beamDur, maxT: beamDur
              });
            }
            for (let k = 0; k < Math.min(maxPierceHits, cands.length); k++) {
              const isCrit = Math.random() < critChance;
              lastHitE = cands[k].e;
              hurtEnemy(lastHitE, base * finalMul * (isCrit ? critMult : 1), isCrit, bAng, !tpl.isSniper || !!evo, {
                knockMult: tpl.isSniper ? 1.8 : 1.2,
                forceBurn: !!(evo && evo.forceBurn),
                forceChill: !!tpl.isEmpBeam,
                forceFreeze: !!(evo && evo.forceFreeze && Math.random() < evo.forceFreeze)
              });
              if (state !== 'wave') return;
            }
          }

          if (lastHitE && (tpl.isEmpBeam || (evo && (evo.blastAdd || evo.chainOnHit)))) {
            if (tpl.isEmpBeam) {
              const empR = (88 + (evo && evo.blastAdd ? evo.blastAdd * 0.45 : 0)) * getBlastScale();
              if (rings.length < 30) rings.push({ x: lastHitE.x, y: lastHitE.y, r: empR, color: beamCol, t: 0.24, maxT: 0.24 });
              for (let ei = 0; ei < enemies.length; ei++) {
                const nb = enemies[ei];
                if (!nb || nb.hp <= 0) continue;
                const dxN = nb.x - lastHitE.x, dyN = nb.y - lastHitE.y, limN = empR + nb.r;
                if (dxN * dxN + dyN * dyN <= limN * limN) {
                  nb.chillT = Math.max(nb.chillT || 0, 2.4);
                  if (evo && evo.forceFreeze && Math.random() < evo.forceFreeze * 0.7) nb.freezeT = Math.max(nb.freezeT || 0, 1.25);
                }
              }
            }
            if (evo && evo.blastAdd && bIdx === Math.floor(beamCount * 0.5)) {
              triggerExplosion(lastHitE.x, lastHitE.y, evo.blastAdd * getBlastScale(), base * finalMul * 0.62, false, 0, beamCol, !!(evo.forceBurn));
              if (state !== 'wave') return;
            }
            if (evo && evo.chainOnHit && bIdx === 0 && lastHitE.hp > 0) {
              castChainLightning(lastHitE.x, lastHitE.y, lastHitE, evo.chainOnHit, base * finalMul * 0.55, critChance * 0.5);
              if (state !== 'wave') return;
            }
          }
          for (let i = trees.length - 1; i >= 0; i--) {
            const tr = trees[i];
            if (tr.hp <= 0) continue;
            const proj = Math.max(0, Math.min(1, ((tr.x - baseWx) * (ex - baseWx) + (tr.y - baseWy) * (ey - baseWy)) / l2));
            const px = baseWx + proj * (ex - baseWx), py = baseWy + proj * (ey - baseWy);
            const dxT = tr.x - px, dyT = tr.y - py, limT = tr.r + hitPad;
            if (dxT * dxT + dyT * dyT <= limT * limT) hurtTree(tr, base * finalMul);
          }
        }
      } else {
        // 投射物与【秘术法杖】吟唱系统（含赤烬魂灯杖、永冻星辉杖、紫电星轨杖、发条共鸣法杖及全5阶进化分支）
        w.recoil = tpl.isFlame ? 0.3 : (tpl.isStaff ? 0.65 : (w.id === 'minigun' || w.id === 'nailgun' ? 0.55 : 1));
        w.shots = (w.shots || 0) + 1;
        const sixthShot = !!(tpl.sixthCrit && (w.shots % 6 === 0));
        if (sixthShot) addText(player.x, player.y - 32, '第六发必暴!', '#ffd166', 13, 0.62, false);
        const pellets = (tpl.pellets || 1) + ((evo && evo.pelletsAdd) ? evo.pelletsAdd : 0);
        if ((!tpl.isFlame && w.id !== 'minigun' && w.id !== 'nailgun') || Math.random() < 0.35) {
          beep(tpl.isStaff ? 520 : (tpl.isRocket || tpl.isGrenade ? 145 : (tpl.isPlasma ? 310 : (tpl.isFlame ? 110 : (tpl.isStar || tpl.isIce || tpl.isDart ? 560 : (w.id === 'shotgun' ? 160 : 430))))), 0.04, tpl.isStaff ? 'sine' : (tpl.isFlame ? 'sawtooth' : 'square'), tpl.isFlame ? 0.018 : 0.03);
        }
        const mx = baseWx + Math.cos(w.angle) * 18, my = baseWy + Math.sin(w.angle) * 18;
        if ((tpl.isStaff || tpl.set === 'elemental') && (((player.staffVolley || 0) > 0 && (w.shots % 3 === 0)) || (player.staffBoltEvery4 && (w.shots % 4 === 0)))) {
          const extraT = pickRandomAliveEnemy(null) || best;
          if (extraT && extraT.hp > 0 && enemies.includes(extraT)) {
            const isMajorVolley = (player.staffVolley || 0) > 0 && (w.shots % 3 === 0);
            castChainLightning(mx, my, extraT, isMajorVolley ? (2 + Math.min(2, player.staffVolley)) : 1, base * finalMul * (isMajorVolley ? 0.56 : 0.45), critChance * 0.7, w.id, {
              arcane: true, mainColor: '#e9d5ff', arcColor: (evo && evo.color) || '#c084fc', dur: 0.22
            });
            if (state !== 'wave') return;
          }
        }
        if (tpl.isStaff) {
          // 🪄 四大秘术法杖真法术技能系统：【陨炎火球术】【极寒暴风雪】【奥术连锁闪电】【万蛊蚀骨毒雾】
          const staffGlowCol = (evo && evo.color) ? evo.color : (tpl.isEmberStaff ? '#ff6b35' : (tpl.isFrostStaff ? '#38bdf8' : (tpl.isStormStaff ? '#c084fc' : (tpl.isBloodStaff ? '#f43f5e' : (tpl.isGravityStaff ? '#a855f7' : '#52b788')))));
          const sPierce = (player.staffPierce || 0) + (player.pierceBonus || 0);
          pushParticle({ x: mx, y: my, vx: 0, vy: 0, r: 11.5, color: staffGlowCol, t: 0.14, maxT: 0.14, muzzle: true, angle: w.angle });
          if (evo && evo.commandSalvo && (w.shots % 2 === 0) && typeof triggerTurretSalvo === 'function') {
            triggerTurretSalvo(true);
          }

          if (tpl.isEmberStaff) {
            // 1) 赤烬魂灯杖 -> Dota2 卡尔式【混沌陨石 (Chaos Meteor)】：天外巨型黑曜熔岩陨石斜坠轰击，随后沿施法方向一路翻滚碾压并犁出整条【焦土熔火长廊】！
            const isPurgatory = !!(evo && evo.id === 'staff_purgatory');
            const isSolar = !!(evo && evo.id === 'staff_solar');
            const impactR = ((tpl.blastR || 72) + ((evo && evo.blastAdd) || 0) + sPierce * 8) * getBlastScale();
            const boulderR = (evo ? 31 : 26) * Math.min(1.32, getBlastScale());
            const crushR = Math.max(48, impactR * 0.72);
            const trailR = Math.max(46, impactR * 0.68);
            const distToBest = Math.hypot(best.x - player.x, best.y - player.y);
            const landDist = Math.max(48, Math.min(maxR * 0.78, distToBest - 30));
            const perpA = w.angle + Math.PI * 0.5;
            beep(288, 0.08, 'triangle', 0.04);
            for (let p = 0; p < pellets; p++) {
              if (bullets.length >= (isTouch ? 185 : 275)) break;
              const laneOff = pellets > 1 ? (p - (pellets - 1) * 0.5) * 62 : 0;
              const spAng = pellets > 1 ? (p - (pellets - 1) * 0.5) * 0.06 : 0;
              const a = w.angle + spAng;
              const lx = Math.max(58, Math.min(WORLD.w - 58, player.x + Math.cos(w.angle) * landDist + Math.cos(perpA) * laneOff));
              const ly = Math.max(58, Math.min(WORLD.h - 58, player.y + Math.sin(w.angle) * landDist + Math.sin(perpA) * laneOff));
              bullets.push({
                x: lx, y: ly, px: lx, py: ly, ox: mx, oy: my,
                _expectX: lx, _expectY: ly,
                srcId: w.id,
                vx: 0, vy: 0,
                dmg: base * finalMul,
                isCrit: false,
                angle: a,
                critChance, critMult,
                pierce: 999,
                bounces: 0,
                isFireball: true,
                isChaosMeteor: true,
                purgatoryMeteor: isPurgatory,
                isStaffOrb: 'ember',
                impactR,
                fireballBlastR: impactR,
                crushR,
                trailR,
                rollSpd: isPurgatory ? 276 : 236,
                rollDur: isSolar ? 1.46 : (isPurgatory ? 1.24 : 1.28),
                meteorFallT: 0.28,
                meteorFallMax: 0.28,
                _landed: false,
                firePatchPoison: !!(evo && evo.forcePoison),
                forceEvoBurn: true,
                rollRot: Math.random() * 6.28,
                spin: Math.random() * 6.28,
                smokeT: 0,
                life: 1.85, maxLife: 1.85,
                color: (evo && evo.color) ? evo.color : '#ff6b35',
                r: boulderR,
                hit: null, lastHit: null
              });
            }
          } else if (tpl.isFrostStaff) {
            // 2) 永冻星辉杖 -> 【极寒暴风雪】：直接在目标区域召唤旋转六芒冰暴法阵，密集降下冰雹减速并周期冻结！
            const zR = (96 + ((evo && evo.blastAdd) || 0) + sPierce * 9) * getBlastScale();
            const zDur = (evo && evo.id === 'staff_glacier') ? 3.8 : 3.2;
            const freezeCh = Math.min(0.65, 0.18 + ((evo && evo.forceFreeze) || 0) + (player.freezeChance || 0) * 0.5);
            for (let p = 0; p < pellets; p++) {
              const perpA = w.angle + Math.PI * 0.5;
              const off = pellets > 1 ? (p - (pellets - 1) * 0.5) * 86 : 0;
              const zx = Math.max(64, Math.min(WORLD.w - 64, best.x + Math.cos(perpA) * off));
              const zy = Math.max(64, Math.min(WORLD.h - 64, best.y + Math.sin(perpA) * off));
              if (beams.length < 38) {
                beams.push({ x1: mx, y1: my, x2: zx, y2: zy, color: '#7dd3fc', thin: true, t: 0.18, maxT: 0.18 });
              }
              if (rings.length < 38) {
                rings.push({ x: zx, y: zy, r: zR, color: '#38bdf8', t: 0.28, maxT: 0.28, kind: 'hex' });
              }
              addBurst(zx, zy, '#bae6fd', 7, 135);
              // 暴风雪降临首击寒霜冲击
              for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const e = enemies[ei];
                if (!e || e.hp <= 0 || e.primed) continue;
                const dxE = e.x - zx, dyE = e.y - zy, limE = zR + e.r;
                if (dxE * dxE + dyE * dyE <= limE * limE) {
                  const isCrit = Math.random() < critChance;
                  hurtEnemy(e, base * finalMul * 0.68 * (isCrit ? critMult : 1), isCrit, Math.atan2(dyE, dxE), true, {
                    srcId: w.id, forceChill: true, forceFreeze: Math.random() < freezeCh * 0.85, silentHit: enemies.length > 22
                  });
                  if (state !== 'wave') return;
                }
              }
              for (let ti = trees.length - 1; ti >= 0; ti--) {
                const tr = trees[ti];
                if (tr && tr.hp > 0 && Math.hypot(tr.x - zx, tr.y - zy) <= zR + tr.r) hurtTree(tr, base * finalMul * 0.7);
              }
              spawnPlayerSpellZone({
                kind: 'blizzard', x: zx, y: zy, r: zR, life: zDur, tickInterval: 0.38,
                dmg: base * finalMul * 0.42, critChance, critMult, srcId: w.id,
                color: (evo && evo.color) ? evo.color : '#38bdf8',
                freezeChance: freezeCh
              });
            }
          } else if (tpl.isStormStaff) {
            // 3) 紫电星轨杖 -> 【奥术连锁闪电】：无需飞行弹道，直接引落天罚主雷并在敌群间瞬发高压分叉连锁闪电！
            const jumps = (tpl.chainOnHit || 5) + ((evo && evo.chainsAdd) || 0) + sPierce + Math.floor((w.tier - 1) * 0.5);
            const boltCol = (evo && evo.color) ? evo.color : '#c084fc';
            for (let p = 0; p < pellets; p++) {
              const strikeTarget = (p === 0) ? best : (pickRandomAliveEnemy(best) || best);
              if (!strikeTarget || strikeTarget.hp <= 0) continue;
              if (lightnings.length < 48) {
                const dxF = strikeTarget.x - mx, dyF = strikeTarget.y - my;
                lightnings.push({
                  pts: [
                    { x: mx, y: my },
                    { x: mx + dxF * 0.36 + (Math.random() - 0.5) * 16, y: my + dyF * 0.36 + (Math.random() - 0.5) * 16 },
                    { x: mx + dxF * 0.72 + (Math.random() - 0.5) * 16, y: my + dyF * 0.72 + (Math.random() - 0.5) * 16 },
                    { x: strikeTarget.x, y: strikeTarget.y }
                  ],
                  color: boltCol, coreColor: '#ffffff', width: 3.2, t: 0.22, maxT: 0.22
                });
              }
              if (enemies.includes(strikeTarget)) {
                castChainLightning(mx, my, strikeTarget, jumps, base * finalMul, critChance, w.id, {
                  arcane: true,
                  skyStrike: true,
                  jumpRange: 275 + (player.staffRange || 0) * 0.5,
                  mainColor: boltCol,
                  arcColor: '#38bdf8',
                  dur: 0.26,
                  freezeChance: (evo && evo.forceFreeze) || 0.08,
                  forceBurn: !!(evo && evo.forceBurn)
                });
                if (state !== 'wave') return;
                if (evo && evo.blastAdd) {
                  triggerExplosion(strikeTarget.x, strikeTarget.y, evo.blastAdd * getBlastScale(), base * finalMul * 0.58, false, 0, boltCol, false, 0, w.id);
                  if (state !== 'wave') return;
                }
              } else {
                hurtTree(strikeTarget, base * finalMul);
              }
            }
          } else if (tpl.isBloodStaff) {
            // 5) 猩红渴血魔杖 -> 【猩红渴血法阵】：在敌群脚下张开猩红祭血阵，高频汲血伤害并概率回血/叠血盾！
            const zR = (92 + ((evo && evo.blastAdd) || 0) + sPierce * 9) * getBlastScale();
            const bloodCol = (evo && evo.color) ? evo.color : '#f43f5e';
            for (let p = 0; p < pellets; p++) {
              const perpA = w.angle + Math.PI * 0.5;
              const off = pellets > 1 ? (p - (pellets - 1) * 0.5) * 82 : 0;
              const zx = Math.max(64, Math.min(WORLD.w - 64, best.x + Math.cos(perpA) * off));
              const zy = Math.max(64, Math.min(WORLD.h - 64, best.y + Math.sin(perpA) * off));
              if (beams.length < 38) beams.push({ x1: mx, y1: my, x2: zx, y2: zy, color: bloodCol, thin: true, t: 0.18, maxT: 0.18 });
              if (rings.length < 38) rings.push({ x: zx, y: zy, r: zR, color: bloodCol, t: 0.28, maxT: 0.28, kind: 'star' });
              addBurst(zx, zy, '#fda4af', 6, 125);
              for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const e = enemies[ei];
                if (!e || e.hp <= 0 || e.primed) continue;
                const dxE = e.x - zx, dyE = e.y - zy, limE = zR + e.r;
                if (dxE * dxE + dyE * dyE <= limE * limE) {
                  const isCrit = Math.random() < critChance;
                  hurtEnemy(e, base * finalMul * 0.68 * (isCrit ? critMult : 1), isCrit, Math.atan2(dyE, dxE), true, {
                    srcId: w.id, forcePoison: !!(evo && evo.forcePoison), silentHit: enemies.length > 22
                  });
                  if (state !== 'wave') return;
                }
              }
              for (let ti = trees.length - 1; ti >= 0; ti--) {
                const tr = trees[ti];
                if (tr && tr.hp > 0 && Math.hypot(tr.x - zx, tr.y - zy) <= zR + tr.r) hurtTree(tr, base * finalMul * 0.72);
              }
              spawnPlayerSpellZone({
                kind: 'blood_siphon', x: zx, y: zy, r: zR, life: 3.4, tickInterval: 0.38,
                dmg: base * finalMul * 0.44, critChance, critMult, srcId: w.id,
                color: bloodCol, forcePoison: !!(evo && evo.forcePoison)
              });
            }
          } else if (tpl.isGravityStaff) {
            // 6) 星蚀引力权杖 -> 【星蚀黑洞奇点】：召唤向心引力漩涡持续聚怪切割，消散瞬间引发毁灭坍缩爆破！
            const zR = (98 + ((evo && evo.blastAdd) || 0) + sPierce * 9) * getBlastScale();
            const gravCol = (evo && evo.color) ? evo.color : '#a855f7';
            for (let p = 0; p < pellets; p++) {
              const perpA = w.angle + Math.PI * 0.5;
              const off = pellets > 1 ? (p - (pellets - 1) * 0.5) * 88 : 0;
              const zx = Math.max(64, Math.min(WORLD.w - 64, best.x + Math.cos(perpA) * off));
              const zy = Math.max(64, Math.min(WORLD.h - 64, best.y + Math.sin(perpA) * off));
              if (beams.length < 38) beams.push({ x1: mx, y1: my, x2: zx, y2: zy, color: gravCol, thin: true, t: 0.20, maxT: 0.20 });
              if (rings.length < 38) rings.push({ x: zx, y: zy, r: zR, color: gravCol, t: 0.30, maxT: 0.30, kind: 'hex' });
              let seedE = null;
              for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const e = enemies[ei];
                if (!e || e.hp <= 0 || e.primed) continue;
                const dxE = e.x - zx, dyE = e.y - zy, limE = zR + e.r;
                if (dxE * dxE + dyE * dyE <= limE * limE) {
                  if (!seedE) seedE = e;
                  if (e.type !== 'boss' && e.type !== 'special_boss' && e.type !== 'mini_boss') {
                    const d = Math.hypot(dxE, dyE) || 1;
                    e.x -= (dxE / d) * Math.min(28, d * 0.42);
                    e.y -= (dyE / d) * Math.min(28, d * 0.42);
                  }
                  const isCrit = Math.random() < critChance;
                  hurtEnemy(e, base * finalMul * 0.60 * (isCrit ? critMult : 1), isCrit, null, true, {
                    srcId: w.id, forceBurn: !!(evo && evo.forceBurn),
                    forceFreeze: !!(evo && evo.forceFreeze && Math.random() < evo.forceFreeze),
                    silentHit: enemies.length > 22
                  });
                  if (state !== 'wave') return;
                }
              }
              if (evo && evo.chainOnHit && seedE && seedE.hp > 0) {
                castChainLightning(zx, zy, seedE, evo.chainOnHit, base * finalMul * 0.56, critChance, w.id, {
                  arcane: true, mainColor: '#38bdf8', arcColor: gravCol, dur: 0.24
                });
                if (state !== 'wave') return;
              }
              for (let ti = trees.length - 1; ti >= 0; ti--) {
                const tr = trees[ti];
                if (tr && tr.hp > 0 && Math.hypot(tr.x - zx, tr.y - zy) <= zR + tr.r) hurtTree(tr, base * finalMul * 0.72);
              }
              spawnPlayerSpellZone({
                kind: 'micro_singularity', x: zx, y: zy, r: zR, life: 2.9, tickInterval: 0.36,
                dmg: base * finalMul * 0.38, collapseDmg: base * finalMul * 1.18,
                critChance, critMult, srcId: w.id,
                color: gravCol, forceBurn: !!(evo && evo.forceBurn),
                freezeChance: (evo && evo.forceFreeze) || 0
              });
            }
          } else {
            // 4) 发条共鸣法杖 -> 【万蛊蚀骨毒雾】：在目标群脚下弥漫翻涌蚀骨毒瘴，瞬时叠毒并持续腐蚀增伤！
            const zR = (94 + ((evo && evo.blastAdd) || 0) + sPierce * 9) * getBlastScale();
            const mistCol = (evo && evo.color) ? evo.color : '#52b788';
            for (let p = 0; p < pellets; p++) {
              const perpA = w.angle + Math.PI * 0.5;
              const off = pellets > 1 ? (p - (pellets - 1) * 0.5) * 84 : 0;
              const zx = Math.max(64, Math.min(WORLD.w - 64, best.x + Math.cos(perpA) * off));
              const zy = Math.max(64, Math.min(WORLD.h - 64, best.y + Math.sin(perpA) * off));
              if (beams.length < 38) {
                beams.push({ x1: mx, y1: my, x2: zx, y2: zy, color: '#6ee7b7', thin: true, t: 0.18, maxT: 0.18 });
              }
              if (rings.length < 38) {
                rings.push({ x: zx, y: zy, r: zR, color: '#52b788', t: 0.28, maxT: 0.28 });
              }
              addBurst(zx, zy, '#80ed99', 6, 120);
              let chainSeedE = null;
              for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const e = enemies[ei];
                if (!e || e.hp <= 0 || e.primed) continue;
                const dxE = e.x - zx, dyE = e.y - zy, limE = zR + e.r;
                if (dxE * dxE + dyE * dyE <= limE * limE) {
                  if (!chainSeedE) chainSeedE = e;
                  applyPoison(e, 2);
                  const isCrit = Math.random() < critChance;
                  hurtEnemy(e, base * finalMul * 0.62 * (isCrit ? critMult : 1), isCrit, Math.atan2(dyE, dxE), true, {
                    srcId: w.id, forcePoison: true, silentHit: enemies.length > 22
                  });
                  if (state !== 'wave') return;
                }
              }
              if (evo && evo.chainOnHit && chainSeedE && chainSeedE.hp > 0) {
                castChainLightning(zx, zy, chainSeedE, evo.chainOnHit, base * finalMul * 0.56, critChance, w.id, {
                  arcane: true, mainColor: '#38bdf8', arcColor: '#6ee7b7', dur: 0.24
                });
                if (state !== 'wave') return;
              }
              for (let ti = trees.length - 1; ti >= 0; ti--) {
                const tr = trees[ti];
                if (tr && tr.hp > 0 && Math.hypot(tr.x - zx, tr.y - zy) <= zR + tr.r) hurtTree(tr, base * finalMul * 0.68);
              }
              spawnPlayerSpellZone({
                kind: 'poison_mist', x: zx, y: zy, r: zR, life: 3.6, tickInterval: 0.40,
                dmg: base * finalMul * 0.40, critChance, critMult, srcId: w.id,
                color: mistCol, forcePoison: true
              });
            }
          }
        } else {
        if (!tpl.isStar && !tpl.isFlame && !tpl.isPebble && !tpl.isIce && !tpl.isDart) {
          pushParticle({ x: mx, y: my, vx: 0, vy: 0, r: w.id === 'shotgun' || tpl.isRocket || tpl.isGrenade || tpl.isPlasma ? 12 : 8.5, color: (evo && evo.color) ? evo.color : (tpl.isPlasma ? '#c77dff' : (tpl.techScale ? '#72efdd' : '#ffd166')), t: 0.085, maxT: 0.085, muzzle: true, angle: w.angle });
        }
        if (tpl.set === 'gun' && shells.length < 60 && (w.id !== 'minigun' || Math.random() < 0.45)) {
          const sa = w.angle - Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
          shells.push({ x: baseWx, y: baseWy, vx: Math.cos(sa) * 95, vy: Math.sin(sa) * 95 - 30, rot: Math.random() * 6, t: 0.45 });
        }
        const extraRangedPellets = (!tpl.isFlame ? (player.rangedPelletsBonus || 0) : 0)
          + ((!tpl.isFlame && (player.extraShotChance || 0) > 0 && Math.random() < player.extraShotChance) ? 1 : 0);
        const effPellets = pellets + extraRangedPellets;
        const pelletSplitDamp = extraRangedPellets > 0 ? ((pellets + extraRangedPellets * 0.32) / effPellets) : 1.0;
        const burstLen = tpl.burstShots ? (tpl.burstShots + ((evo && evo.burstAdd) || 0)) : 1;
        for (let bStep = 0; bStep < burstLen; bStep++) {
        const isFinalBurst = tpl.burstShots && (bStep === burstLen - 1);
        for (let p = 0; p < effPellets; p++) {
          if (bullets.length >= (isTouch ? 185 : 275)) break;
          let sp = 0;
          if (tpl.spread) {
            sp = (Math.random() - 0.5) * (tpl.spread + (effPellets > (tpl.pellets || 1) ? 0.08 : 0));
          } else if (effPellets > 1) {
            sp = (p - (effPellets - 1) * 0.5) * 0.13;
          }
          const a = w.angle + sp;
          const isCrit = sixthShot || Math.random() < critChance;
          const bSpd = tpl.spd * (tpl.isFlame ? (0.85 + Math.random() * 0.3) : (1 - bStep * 0.045));
          const startBack = bStep * 17;
          const sxB = mx - Math.cos(a) * startBack, syB = my - Math.sin(a) * startBack;
          const maxLife = (maxR + startBack) / bSpd + (tpl.isFlame ? 0.02 : 0.07);
          const extraCritPierce = ((w.id === 'crossbow' && isCrit) ? 2 : 0) + (sixthShot ? 2 : 0);
          const evoPierce = (evo && evo.pierceAdd) ? evo.pierceAdd : 0;
          const evoBounce = (evo && evo.bounceAdd) ? evo.bounceAdd : 0;
          const baseBlast = (tpl.blastR || 0) + ((evo && (tpl.blastR || tpl.isRocket || tpl.isGrenade || tpl.isPlasma)) ? (evo.blastAdd || 0) : 0);
          const evoImpactBlast = (evo && evo.blastAdd && !tpl.isRocket && !tpl.isGrenade && !tpl.isPlasma && !tpl.shredBlast && (!tpl.burstShots || isFinalBurst)) ? evo.blastAdd * getBlastScale() : 0;
          const burstAmp = isFinalBurst ? 1.35 : 1.0;
          bullets.push({
            x: sxB, y: syB, px: sxB, py: syB, ox: mx, oy: my, srcId: w.id,
            vx: Math.cos(a) * bSpd, vy: Math.sin(a) * bSpd,
            dmg: base * finalMul * pelletSplitDamp * burstAmp * (isCrit ? critMult : 1), isCrit, angle: a,
            pierce: Math.max(0, (tpl.pierce || 0) + evoPierce + extraCritPierce + (tpl.isRocket || tpl.isGrenade ? 0 : player.pierceBonus)),
            bounces: (tpl.bounce || 0) + evoBounce + (tpl.isRocket || tpl.isFlame ? 0 : player.bounceBonus) + (tpl.isStar && isCrit ? 1 : 0) + (player.critBounce && isCrit && !tpl.isRocket && !tpl.isFlame ? 1 : 0),
            isStar: !!tpl.isStar, isFlame: !!tpl.isFlame, isRocket: !!tpl.isRocket, isGrenade: !!tpl.isGrenade,
            isPebble: !!tpl.isPebble, isIce: !!tpl.isIce, isPlasma: !!tpl.isPlasma, isBolt: !!(tpl.isBolt || w.id === 'crossbow'),
            isDart: !!tpl.isDart, isNail: !!(tpl.isNail || tpl.isPulseBurst),
            isThirdPulse: !!isFinalBurst,
            shredBlast: tpl.shredBlast ? (evo ? 1.0 : tpl.shredBlast) : 0,
            evoBlastR: evoImpactBlast,
            evoChain: ((evo && evo.chainOnHit) || tpl.chainOnHit) ? ((evo && evo.chainOnHit) || tpl.chainOnHit) : 0,
            forceEvoBurn: !!(evo && evo.forceBurn),
            freezeHit: Math.max(tpl.freezeHit || 0, (evo && evo.forceFreeze) ? evo.forceFreeze : 0),
            poisonHit: (evo && evo.forcePoison) ? 1.0 : (tpl.poisonHit || 0),
            blastR: baseBlast ? baseBlast * getBlastScale() : 0,
            spin: Math.random() * 6.28, smokeT: 0,
            life: maxLife, maxLife,
            color: (evo && evo.color) ? evo.color : (isFinalBurst ? '#38bdf8' : (tpl.isFlame ? '#ff9f1c' : (tpl.isPlasma ? '#c77dff' : (tpl.isIce ? '#72efdd' : (tpl.isDart ? '#a3e635' : (tpl.isNail || tpl.isPulseBurst ? '#4cc9f0' : (tpl.isGrenade ? '#f97316' : (tpl.isPebble ? '#cbd5e1' : (tpl.isStar ? '#e0fbfc' : (isCrit ? '#ffd166' : '#fff3b0')))))))))),
            r: (tpl.isPlasma ? 8.5 : (tpl.isGrenade ? 6.8 : (tpl.isFlame ? 7 : (tpl.isRocket ? 6 : (tpl.isStar ? 6.5 : (tpl.isPebble ? 5.2 : (isFinalBurst ? 5.8 : (w.id === 'shotgun' ? 4.2 : 4.6)))))))) * (evo ? 1.15 : 1),
            hit: null, lastHit: null
          });
        }
        }
        if (player.celestialRailEvery14 && !tpl.isFlame && bullets.length < (isTouch ? 185 : 275)) {
          player._rangedShotsAcc = (player._rangedShotsAcc || 0) + 1;
          while (player._rangedShotsAcc >= 14 && bullets.length < (isTouch ? 185 : 275)) {
            player._rangedShotsAcc -= 14;
            bullets.push({
              x: mx, y: my, px: mx, py: my, ox: mx, oy: my, srcId: w.id,
              vx: Math.cos(w.angle) * 860, vy: Math.sin(w.angle) * 860,
              dmg: Math.max(22, base * finalMul * 1.65), isCrit: true, angle: w.angle,
              pierce: 2, bounces: 0, isNail: true, life: 0.55, maxLife: 0.55, color: '#fde047', r: 6.4, hit: null, lastHit: null
            });
          }
        }
        }
      }
    }
    const offset = w.thrust * (w.id === 'spear' ? 58 : (w.id === 'stick' ? 48 : 40)) - w.recoil * 7;
    w.wx = baseWx + Math.cos(w.angle) * offset;
    w.wy = baseWy + Math.sin(w.angle) * offset;
  }
  } finally {
    _activeWeaponId = '';
  }
  player._displayRange = maxEquipRange > 0 ? maxEquipRange : Math.max(68, 104 + totalRange);

  // 自动机炮塔、浮游激光塔、紫电震波塔与秘法共鸣图腾塔索敌开火
  // （参照《土豆兄弟》建筑机制：角色自身 atkSpd 与工程学 techMul 绝不加速塔开火，仅受独立【建筑攻速】、图腾共鸣与瞬步超频影响，基础塔攻速还原并额外 +20%！）
  const turretMaxR = Math.max(148, 316 + Math.round(totalRange * 0.5));
  for (let ti = 0; ti < turrets.length; ti++) {
    const t = turrets[ti];
    t.pulsePhase = (t.pulsePhase || 0) + dt * 3.6;
    // 检测周围 220px 内是否有【秘法共鸣图腾塔】提供 +18% 独立建筑攻速光环
    let totemHaste = 1;
    for (let oi = 0; oi < turrets.length; oi++) {
      const ot = turrets[oi];
      if (ot && ot !== t && ot.kind === 'totem') {
        const dxO = ot.x - t.x, dyO = ot.y - t.y;
        if (dxO * dxO + dyO * dyO <= 220 * 220) { totemHaste = 1.18; break; }
      }
    }
    t.cd -= dt;
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 8);
    const searchR = t.kind === 'shock' ? Math.round(165 * getBlastScale()) : turretMaxR;
    let best = null, bestDSq = searchR * searchR;
    for (let ei = 0; ei < enemies.length; ei++) {
      const e = enemies[ei];
      if (!e || e.hp <= 0 || e.primed) continue;
      const dxE = e.x - t.x, dyE = e.y - t.y;
      const dSq = dxE * dxE + dyE * dyE;
      if (dSq < bestDSq) { bestDSq = dSq; best = e; }
    }
    if (best) {
      t.angle = Math.atan2(best.y - t.y, best.x - t.x);
      if (t.cd <= 0) {
        const isCrit = !!(player.turretCrit && Math.random() < baseCrit * (player.turretCritScale || 0.85));
        const cMul = isCrit ? getEffectiveCritMult(1.85) : 1;
        const tAspd = typeof getEffectiveTurretAspdMul === 'function'
          ? getEffectiveTurretAspdMul(totemHaste)
          : (1.20 * (1 + (player.turretAspdBonus || 0)) * totemHaste * ((player.turretOverclockT || 0) > 0 ? 1.55 : 1));
        const tSrc = t.kind === 'laser' ? 'turret_laser' : (t.kind === 'shock' ? 'turret_shock' : (t.kind === 'totem' ? 'turret_totem' : 'turret_gun'));
        if (t.kind === 'shock') {
          t.cd = Math.max(0.58, 1.68 / tAspd);
          t.recoil = 1;
          const shockR = Math.round(162 * getBlastScale());
          const sdmg = (13.5 + wave * 1.85 + flatTech * 2.75) * (1 + (t.tier - 1) * 0.42) * bldDmgMul * cMul;
          if (rings.length < 34) rings.push({ x: t.x, y: t.y, r: shockR, color: '#c084fc', t: 0.24, maxT: 0.24, kind: 'hex' });
          beep(390, 0.05, 'triangle', 0.028);
          for (let ei = enemies.length - 1; ei >= 0; ei--) {
            const e = enemies[ei];
            if (!e || e.hp <= 0 || e.primed) continue;
            const dxS = e.x - t.x, dyS = e.y - t.y, limS = shockR + e.r;
            if (dxS * dxS + dyS * dyS <= limS * limS) {
              hurtEnemy(e, sdmg, isCrit, Math.atan2(dyS, dxS), true, {
                isTurret: true, srcId: tSrc, knockMult: 1.45, forceChill: true,
                noProc: !player.turretElem, silentHit: enemies.length > 24
              });
              if (state !== 'wave') return;
            }
          }
        } else if (t.kind === 'laser') {
          const tierAspd = 1 + (t.tier - 1) * 0.12;
          t.cd = Math.max(0.30, 0.90 / (tAspd * tierAspd));
          t.recoil = 1;
          const ldmg = (10.5 + wave * 1.50 + flatTech * 2.15) * (1 + (t.tier - 1) * 0.45) * bldDmgMul * cMul;
          if ((player.bounceBonus || 0) > 0) {
            if (beams.length < 30) {
              beams.push({ x1: t.x + Math.cos(t.angle) * 14, y1: t.y + Math.sin(t.angle) * 14, x2: best.x, y2: best.y, color: isCrit ? '#ffd166' : '#c77dff', thin: true, t: 0.14, maxT: 0.14 });
            }
            hurtEnemy(best, ldmg, isCrit, t.angle, true, { isTurret: true, srcId: tSrc, noProc: !player.turretElem, silentHit: enemies.length > 24 });
            if (state !== 'wave') return;
            let bNext = null, bDSq = 360 * 360;
            for (let ei = 0; ei < enemies.length; ei++) {
              const cand = enemies[ei];
              if (cand && cand !== best && cand.hp > 0 && !cand.primed) {
                const cdx = cand.x - best.x, cdy = cand.y - best.y;
                if (cdx * cdx + cdy * cdy < bDSq) { bDSq = cdx * cdx + cdy * cdy; bNext = cand; }
              }
            }
            if (bNext) {
              const ba2 = Math.atan2(bNext.y - best.y, bNext.x - best.x);
              if (beams.length < 30) beams.push({ x1: best.x, y1: best.y, x2: bNext.x, y2: bNext.y, color: isCrit ? '#ffd166' : '#c77dff', thin: true, t: 0.14, maxT: 0.14 });
              hurtEnemy(bNext, ldmg * (0.92 + (player.bounceAmpDmg || 0)), isCrit, ba2, true, { isTurret: true, srcId: tSrc, noProc: !player.turretElem, silentHit: enemies.length > 24 });
              if (state !== 'wave') return;
            }
          } else {
            const ex = t.x + Math.cos(t.angle) * turretMaxR, ey = t.y + Math.sin(t.angle) * turretMaxR;
            if (beams.length < 30) {
              beams.push({ x1: t.x + Math.cos(t.angle) * 14, y1: t.y + Math.sin(t.angle) * 14, x2: ex, y2: ey, color: isCrit ? '#ffd166' : '#c77dff', thin: true, t: 0.14, maxT: 0.14 });
            }
            const l2 = turretMaxR * turretMaxR || 1;
            let hits = 0, maxH = 3 + (t.tier >= 3 ? 1 : 0);
            for (let ei = 0; ei < enemies.length; ei++) {
              const e = enemies[ei];
              if (!e || e.hp <= 0 || e.primed || hits >= maxH) continue;
              const proj = Math.max(0, Math.min(1, ((e.x - t.x) * (ex - t.x) + (e.y - t.y) * (ey - t.y)) / l2));
              const px = t.x + proj * (ex - t.x), py = t.y + proj * (ey - t.y);
              const dxP = e.x - px, dyP = e.y - py, limP = e.r + 9;
              if (dxP * dxP + dyP * dyP <= limP * limP) {
                hits++;
                hurtEnemy(e, ldmg, isCrit, t.angle, true, { isTurret: true, srcId: tSrc, noProc: !player.turretElem, silentHit: enemies.length > 24 });
                if (state !== 'wave') return;
              }
            }
          }
        } else if (bullets.length < (isTouch ? 180 : 260)) {
          const isTotem = t.kind === 'totem';
          const tierAspd = 1 + (t.tier - 1) * 0.12;
          t.cd = Math.max(isTotem ? 0.28 : 0.22, (isTotem ? 0.68 : 0.54) / (tAspd * tierAspd));
          t.recoil = 1;
          const tdmg = (isTotem ? (10.4 + wave * 1.45 + flatTech * 2.05) : (6.6 + wave * 1.02 + flatTech * 1.50)) * (1 + (t.tier - 1) * 0.45) * bldDmgMul * cMul;
          const tSpd = isTotem ? 640 : 690;
          const bLife = turretMaxR / tSpd;
          bullets.push({
            x: t.x + Math.cos(t.angle) * 16, y: t.y + Math.sin(t.angle) * 16,
            px: t.x, py: t.y, ox: t.x, oy: t.y, srcId: tSrc,
            vx: Math.cos(t.angle) * tSpd, vy: Math.sin(t.angle) * tSpd,
            dmg: tdmg, isCrit, angle: t.angle,
            pierce: (isTotem ? 2 : (t.tier >= 3 ? 2 : (t.tier >= 2 ? 1 : 0))) + (player.pierceBonus > 0 ? 1 : 0),
            bounces: (player.bounceBonus || 0) > 0 ? 1 : 0,
            turretShot: true,
            isStaffOrb: isTotem ? 'chrono' : '',
            life: bLife, maxLife: bLife, color: isCrit ? '#ffd166' : (isTotem ? '#fbbf24' : '#72efdd'), r: isTotem ? 5.6 : 4.2, hit: null, lastHit: null
          });
        }
        // 【构筑师灵枢·万械星核】机关开火 24% 概率协同发射制导星能飞弹
        if (player.turretMissile && bullets.length < (isTouch ? 180 : 260) && Math.random() < 0.24) {
          const mAng = t.angle + (Math.random() - 0.5) * 0.24;
          const mDmg = (11.0 + wave * 1.6 + flatTech * 1.8) * bldDmgMul;
          bullets.push({
            x: t.x, y: t.y, px: t.x, py: t.y, ox: t.x, oy: t.y, srcId: tSrc,
            vx: Math.cos(mAng) * 740, vy: Math.sin(mAng) * 740,
            dmg: mDmg, isCrit: false, angle: mAng,
            pierce: 1, bounces: 1, turretShot: true, isStaffOrb: 'arcane',
            life: 0.65, maxLife: 0.65, color: '#fde68a', r: 5.2, hit: null, lastHit: null
          });
        }
      }
    }
  }

  // 玩家投射物更新（严格遵循「先弹射 bounces、耗尽弹射后再穿透 pierce」）
  let eEnvMinX = Infinity, eEnvMaxX = -Infinity, eEnvMinY = Infinity, eEnvMaxY = -Infinity;
  for (let ei = 0; ei < enemies.length; ei++) {
    const e = enemies[ei];
    if (!e || e.hp <= 0 || e.primed) continue;
    const er = e.r || 20;
    if (e.x - er < eEnvMinX) eEnvMinX = e.x - er;
    if (e.x + er > eEnvMaxX) eEnvMaxX = e.x + er;
    if (e.y - er < eEnvMinY) eEnvMinY = e.y - er;
    if (e.y + er > eEnvMaxY) eEnvMaxY = e.y + er;
  }
  const hasEnemyEnvelope = eEnvMinX <= eEnvMaxX;
  let gridSnapLen = enemies.length;
  let gridActive = hasEnemyEnvelope ? SpirePerf.rebuildEnemyGrid(enemies, WORLD.w, WORLD.h) : 0;
  const gridQueryBuf = SpirePerf.getQueryBuffer();

  for (let i = bullets.length - 1; i >= 0; i--) {
    if (state !== 'wave') return;
    const b = bullets[i];
    if (!b) continue;
    if (b.isChaosMeteor) {
      if (tickChaosMeteor(b, i, dt)) return;
      continue;
    }
    b.px = b.x; b.py = b.y;
    if (b.isBoomerang) {
      b.bmAge = (b.bmAge || 0) + dt;
      if (!b._bmReturning && b.bmAge >= (b.returnAt || 0.42)) {
        b._bmReturning = true;
        b.hit = null;
        b.lastHit = null;
        b.pierce = Math.max(b.pierce || 0, 4);
      }
      if (b._bmReturning && player) {
        const dxP = player.x - b.x, dyP = player.y - b.y;
        const dP = Math.hypot(dxP, dyP) || 1;
        if (dP < 24) { SpirePerf.swapPop(bullets, i); continue; }
        const retSpd = (b.bmSpd || 610) * 1.14;
        b.vx = (dxP / dP) * retSpd;
        b.vy = (dyP / dP) * retSpd;
        b.angle = Math.atan2(dyP, dxP);
      }
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.isStar || b.isGrenade || b.isFireball) b.spin += dt * (b.isFireball ? 11 : (b.isGrenade ? 14 : 22));
    if (b.isFlame) { b.vx *= (1 - dt * 1.6); b.vy *= (1 - dt * 1.6); b.r += dt * 20; }
    if (b.isFireball) {
      b.smokeT -= dt;
      if (b.smokeT <= 0) {
        b.smokeT = 0.036;
        pushParticle({
          x: b.x - Math.cos(b.angle) * 10 + (Math.random() - 0.5) * 8,
          y: b.y - Math.sin(b.angle) * 10 + (Math.random() - 0.5) * 8,
          vx: -b.vx * 0.14 + (Math.random() - 0.5) * 28,
          vy: -b.vy * 0.14 + (Math.random() - 0.5) * 28,
          r: 4.2 + Math.random() * 2.6,
          color: Math.random() < 0.45 ? '#fde047' : (b.color || '#ff6b35'),
          t: 0.22, maxT: 0.22
        });
      }
    } else if (b.isRocket || b.isGrenade) {
      b.smokeT -= dt;
      if (b.smokeT <= 0) {
        b.smokeT = b.isGrenade ? 0.065 : 0.045;
        pushParticle({ x: b.x - Math.cos(b.angle) * 8, y: b.y - Math.sin(b.angle) * 8, vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18, r: 3.0 + Math.random() * 2.0, color: 'rgba(205, 198, 218, 0.32)', t: 0.20, maxT: 0.20 });
      }
    }

    const outBounds = b.x < 0 || b.x > WORLD.w || b.y < 0 || b.y > WORLD.h;
    if (b.life <= 0 || outBounds) {
      const prevActB = _activeWeaponId;
      _activeWeaponId = b.srcId || '';
      try {
        if (b.isFireball) detonateStaffFireball(b);
        else if (b.isRocket || b.isGrenade) triggerExplosion(b.x, b.y, b.blastR || 76, b.dmg * (b.isGrenade ? 0.85 : elemMul), false, 0, '#ff9f1c', true);
        else if (b.isPlasma) triggerExplosion(b.x, b.y, b.blastR || 82, b.dmg * 0.85 * elemMul, false, 0, '#c77dff', false);
      } finally {
        _activeWeaponId = prevActB;
      }
      if (state !== 'wave') return;
      SpirePerf.swapPop(bullets, i); continue;
    }

    // 子弹命中异星晶树（同样严格先弹射向附近敌人，无弹射时再消耗穿透）
    for (let tIdx = trees.length - 1; tIdx >= 0; tIdx--) {
      const tr = trees[tIdx];
      if (!tr || tr.hp <= 0 || hasBulletHit(b, tr)) continue;
      const tdx = tr.x - b.x, tdy = tr.y - b.y, thit = tr.r + b.r;
      if (tdx * tdx + tdy * tdy < thit * thit) {
        markBulletHit(b, tr);
        hurtTree(tr, b.dmg);
        if (b.isFireball && b.pierce <= 0) {
          detonateStaffFireball(b);
          if (state !== 'wave') return;
          b.life = -1; break;
        }
        if (b.isRocket) {
          const prevActT = _activeWeaponId;
          _activeWeaponId = b.srcId || '';
          try {
            triggerExplosion(b.x, b.y, b.blastR || 76, b.dmg * elemMul, false, 0, '#ff9f1c', true);
          } finally {
            _activeWeaponId = prevActT;
          }
          if (state !== 'wave') return;
          b.life = -1; break;
        }
        if (b.bounces > 0 && bounceBulletToNearest(b, null)) {
          if (state !== 'wave') return;
          break;
        }
        if (b.isGrenade) {
          const prevActG = _activeWeaponId;
          _activeWeaponId = b.srcId || '';
          try {
            triggerExplosion(b.x, b.y, b.blastR || 76, b.dmg * 0.85, false, 0, '#ff9f1c', true);
          } finally {
            _activeWeaponId = prevActG;
          }
          if (state !== 'wave') return;
          b.life = -1; break;
        }
        if (b.pierce <= 0) { b.life = -1; break; }
        b.pierce--;
      }
    }
    if (b.life <= 0) {
      if (b.isPlasma) {
        const prevActP = _activeWeaponId;
        _activeWeaponId = b.srcId || '';
        try {
          triggerExplosion(b.x, b.y, b.blastR || 82, b.dmg * 0.85 * elemMul, false, 0, '#c77dff', false);
        } finally {
          _activeWeaponId = prevActP;
        }
      }
      if (state !== 'wave') return;
      SpirePerf.swapPop(bullets, i); continue;
    }

    const br = b.r || 4;
    if (enemies.length !== gridSnapLen) {
      gridSnapLen = enemies.length;
      gridActive = SpirePerf.rebuildEnemyGrid(enemies, WORLD.w, WORLD.h);
    }
    if (gridActive > 0 && b.x + br >= eEnvMinX && b.x - br <= eEnvMaxX && b.y + br >= eEnvMinY && b.y - br <= eEnvMaxY) {
      let candCnt = SpirePerf.queryEnemiesNear(b.x, b.y, br);
      for (let q = 0; q < candCnt; q++) {
        const j = gridQueryBuf[q];
        const e = enemies[j];
        if (!e || e.hp <= 0 || e.primed) continue;
        const hitR = e.r + br;
        const bdx = e.x - b.x;
        if (bdx >= hitR || bdx <= -hitR) continue;
        const bdy = e.y - b.y;
        if (bdy >= hitR || bdy <= -hitR) continue;
        if (bdx * bdx + bdy * bdy < hitR * hitR && !hasBulletHit(b, e)) {
          markBulletHit(b, e);
          const prevActH = _activeWeaponId;
          _activeWeaponId = b.srcId || '';
          try {
            if (b.isRocket) {
              triggerExplosion(b.x, b.y, b.blastR, b.dmg, false, 0, b.color || '#ff9f1c', true);
              if (state !== 'wave') return;
              if (b.evoChain > 0 && e.hp > 0) {
                castChainLightning(b.x, b.y, e, b.evoChain, b.dmg * 0.55, 0.25);
                if (state !== 'wave') return;
              }
              b.life = -1; break;
            }
            let hitDmg = b.dmg;
            if (!b.turretShot && ((player.farShotBonus || 0) > 0 || (player.closeShotBonus || 0) > 0)) {
              const ox = b.ox !== undefined ? b.ox : player.x;
              const oy = b.oy !== undefined ? b.oy : player.y;
              const fdx = e.x - ox, fdy = e.y - oy, dSqShot = fdx * fdx + fdy * fdy;
              if ((player.farShotBonus || 0) > 0 && dSqShot > 180 * 180) hitDmg *= (1 + player.farShotBonus);
              else if ((player.closeShotBonus || 0) > 0 && dSqShot < 180 * 180) hitDmg *= (1 + player.closeShotBonus);
            }
            hurtEnemy(e, hitDmg, b.isCrit, b.angle, b.isFlame || b.isPlasma || b.isWaveArc || b.forceEvoBurn || !!b.isStaffOrb, {
              isMelee: !!b.isWaveArc,
              isTurret: !!b.turretShot,
              srcId: b.srcId || '',
              noProc: !!(b.noProc || (b.turretShot && !player.turretElem)),
              silentHit: !!(b.noProc || (b.turretShot && enemies.length > 26)),
              forceBurn: b.isFlame || b.forceEvoBurn,
              forceChill: b.isIce,
              forceFreeze: b.freezeHit > 0 && Math.random() < b.freezeHit,
              forcePoison: b.poisonHit > 0 && Math.random() < b.poisonHit,
              knockMult: b.isFlame ? 0.15 : (b.isBolt ? 1.35 : 1)
            });
            if (state !== 'wave') return;
            if (b.isThirdPulse && e.hp > 0) {
              e.sunderT = Math.max(e.sunderT || 0, 3.2);
              if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: 34, color: '#38bdf8', t: 0.16, maxT: 0.16, kind: 'hex' });
            }
            // 【赤烬魂灯杖】命中首目标绽放赤烬炎环
            if (b.staffEmberBlast > 0 && !b._emberBlasted) {
              b._emberBlasted = true;
              triggerExplosion(b.x, b.y, b.staffEmberBlast, hitDmg * 0.62, false, 0, b.color || '#ff6b35', true);
              if (state !== 'wave') return;
            }
            // 【永冻星辉杖】命中首目标向后方扇形迸裂多枚贯穿碎冰星屑
            if (b.frostShards > 0 && !b._shattered) {
              b._shattered = true;
              const shardCnt = b.frostShards;
              for (let sk = 0; sk < shardCnt && bullets.length < (isTouch ? 185 : 275); sk++) {
                const sa = b.angle + (sk - (shardCnt - 1) * 0.5) * 0.28;
                const sHit = new Set([e]);
                bullets.push({
                  x: e.x + Math.cos(sa) * 10, y: e.y + Math.sin(sa) * 10,
                  px: e.x, py: e.y, ox: e.x, oy: e.y, srcId: b.srcId || 'frost_scepter',
                  vx: Math.cos(sa) * 650, vy: Math.sin(sa) * 650,
                  dmg: hitDmg * 0.48, isCrit: false, angle: sa,
                  pierce: 1 + (player.staffPierce || 0), bounces: 0,
                  isIce: true, noProc: true,
                  life: 0.34, maxLife: 0.34, color: '#bae6fd', r: 4.8, hit: sHit, lastHit: e
                });
              }
            }
            // 【紫电星轨杖】命中必发多跳奥术连锁雷弧
            if (b.staffChains > 0 && !b._staffChained) {
              b._staffChained = true;
              castChainLightning(e.x, e.y, e, b.staffChains, hitDmg * 0.66, 0.22);
              if (state !== 'wave') return;
            }
            if (b.shredBlast > 0 && Math.random() < b.shredBlast) {
              triggerExplosion(b.x, b.y, (b.blastR || 64 * getBlastScale()), hitDmg * 0.65, false, 0, b.color || '#ff9f1c', false);
              if (state !== 'wave') return;
            } else if (b.evoBlastR > 0 && !b._evoBlasted) {
              b._evoBlasted = true;
              triggerExplosion(b.x, b.y, b.evoBlastR, hitDmg * 0.58, false, 0, b.color || '#ffd166', false);
              if (state !== 'wave') return;
            }
            if (b.evoChain > 0 && !b._evoChained && e.hp > 0 && (!b.isFlame && Math.random() < 0.55)) {
              b._evoChained = true;
              castChainLightning(e.x, e.y, e, b.evoChain, hitDmg * 0.52, 0.20);
              if (state !== 'wave') return;
            }

            // 第一优先级：弹射（bounces > 0 时优先折射至邻近敌人，不扣除 pierce！）
            if (b.bounces > 0 && bounceBulletToNearest(b, e)) {
              if (state !== 'wave') return;
              break;
            }
            // 第二优先级：弹射耗尽（或场上仅剩唯一目标无处可弹）后，再结算穿透（pierce）！
            if (b.pierce <= 0) {
              if (b.isFireball) {
                detonateStaffFireball(b);
                if (state !== 'wave') return;
              } else if (b.isGrenade) {
                triggerExplosion(b.x, b.y, b.blastR || 76, hitDmg * 0.85, false, 0, '#ff9f1c', true);
                if (state !== 'wave') return;
              }
              b.life = -1; break;
            } else if (b.isFireball && !b._midFireBurst) {
              b._midFireBurst = true;
              triggerExplosion(b.x, b.y, (b.fireballBlastR || 72) * 0.72, hitDmg * 0.52, false, 0, b.color || '#ff6b35', false, 0, b.srcId || 'ember_staff');
              if (state !== 'wave') return;
            }
            b.pierce--;
            b.dmg *= (b.isStaffOrb || b.isWaveArc || b.isFlame) ? 0.86 : Math.min(1.0, Math.max(0.42, 0.70 + (player.falloffMitigation || 0)));
            if (player.bounceAmpDmg > 0) b.dmg *= (1 + player.bounceAmpDmg);
            if (enemies.length !== gridSnapLen) {
              gridSnapLen = enemies.length;
              gridActive = SpirePerf.rebuildEnemyGrid(enemies, WORLD.w, WORLD.h);
              candCnt = gridActive > 0 ? SpirePerf.queryEnemiesNear(b.x, b.y, br) : 0;
              q = -1;
            }
          } finally {
            _activeWeaponId = prevActH;
          }
        }
      }
    }
    if (b.life <= 0 && !b.isRocket && !b.isGrenade) {
      if (b.isFireball) {
        detonateStaffFireball(b);
        if (state !== 'wave') return;
      } else if (b.isPlasma) {
        const prevActE = _activeWeaponId;
        _activeWeaponId = b.srcId || '';
        try {
          triggerExplosion(b.x, b.y, b.blastR || 82, b.dmg * 0.85 * elemMul, false, 0, '#c77dff', false);
        } finally {
          _activeWeaponId = prevActE;
        }
        if (state !== 'wave') return;
      }
      SpirePerf.swapPop(bullets, i);
    } else if (b.life <= 0) {
      SpirePerf.swapPop(bullets, i);
    }
  }

  // 🪄 玩家法杖持续法术区域结算（【熔火燎原炎海】fire_patch / 【极寒暴风雪】blizzard / 【万蛊蚀骨毒雾】poison_mist）
  if (typeof spellZones !== 'undefined' && spellZones.length > 0) {
    const zoneRateMul = 1 + (player.dotHaste || 0) * 0.5;
    for (let zi = spellZones.length - 1; zi >= 0; zi--) {
      if (state !== 'wave') return;
      const z = spellZones[zi];
      if (!z) { spellZones.splice(zi, 1); continue; }
      z.life -= dt;
      z.spin = (z.spin || 0) + dt * (z.kind === 'blizzard' || z.kind === 'micro_singularity' ? 2.8 : 1.15);
      if (z.life <= 0) {
        if (z.kind === 'micro_singularity' && (z.collapseDmg || 0) > 0) {
          const prevCol = _activeWeaponId;
          _activeWeaponId = z.srcId || 'singularity_scepter';
          try {
            triggerExplosion(z.x, z.y, z.r * 1.08, z.collapseDmg, false, 0, z.color || '#a855f7', true, 0, _activeWeaponId);
          } finally {
            _activeWeaponId = prevCol;
          }
        }
        spellZones.splice(zi, 1);
        if (state !== 'wave') return;
        continue;
      }
      z.tick -= dt * zoneRateMul;
      if (z.tick <= 0) {
        z.tick = z.tickInterval || 0.40;
        const prevActZ = _activeWeaponId;
        _activeWeaponId = z.srcId || '';
        try {
          let bloodHitAny = false;
          const zNowMs = typeof performance !== 'undefined' ? performance.now() : 0;
          for (let ei = enemies.length - 1; ei >= 0; ei--) {
            const e = enemies[ei];
            if (!e || e.hp <= 0 || e.primed) continue;
            const dxZ = e.x - z.x, dyZ = e.y - z.y, limZ = z.r + e.r;
            if (dxZ * dxZ + dyZ * dyZ <= limZ * limZ) {
              const isCrit = Math.random() < (z.critChance || 0.08);
              const zOverlapMul = (e._zKind === z.kind && zNowMs - (e._zMs || 0) < 320) ? 0.60 : 1.0;
              e._zKind = z.kind; e._zMs = zNowMs;
              const zDmg = z.dmg * zOverlapMul * (isCrit ? (z.critMult || 1.95) : 1);
              if (z.kind === 'blizzard') {
                e.chillT = Math.max(e.chillT || 0, 1.45);
                const doFreeze = (z.freezeChance || 0) > 0 && Math.random() < z.freezeChance;
                hurtEnemy(e, zDmg, isCrit, null, true, {
                  srcId: z.srcId || 'frost_scepter', forceChill: true, forceFreeze: doFreeze, silentHit: true, noProc: enemies.length > 26
                });
              } else if (z.kind === 'poison_mist') {
                applyPoison(e, 1);
                e.chillT = Math.max(e.chillT || 0, 0.75);
                hurtEnemy(e, zDmg, isCrit, null, true, {
                  srcId: z.srcId || 'chrono_staff', forcePoison: true, silentHit: true, noProc: enemies.length > 26
                });
              } else if (z.kind === 'blood_siphon') {
                bloodHitAny = true;
                if (z.forcePoison) applyPoison(e, 1);
                hurtEnemy(e, zDmg, isCrit, null, true, {
                  srcId: z.srcId || 'crimson_siphon_staff', forcePoison: !!z.forcePoison, silentHit: true, noProc: enemies.length > 26
                });
              } else if (z.kind === 'micro_singularity') {
                if (e.type !== 'boss' && e.type !== 'special_boss' && e.type !== 'mini_boss') {
                  const distZ = Math.hypot(dxZ, dyZ) || 1;
                  e.x -= (dxZ / distZ) * Math.min(20, distZ * 0.32);
                  e.y -= (dyZ / distZ) * Math.min(20, distZ * 0.32);
                }
                const doFreeze = (z.freezeChance || 0) > 0 && Math.random() < z.freezeChance;
                hurtEnemy(e, zDmg, isCrit, null, true, {
                  srcId: z.srcId || 'singularity_scepter', forceBurn: !!z.forceBurn, forceFreeze: doFreeze, silentHit: true, noProc: enemies.length > 26
                });
              } else {
                hurtEnemy(e, zDmg, isCrit, null, true, {
                  srcId: z.srcId || 'ember_staff', forceBurn: true, forcePoison: !!z.forcePoison, silentHit: true, noProc: enemies.length > 26
                });
              }
              if (state !== 'wave') return;
            }
          }
          if (bloodHitAny && player.hp > 0 && (player._lifestealCd || 0) <= 0 && Math.random() < Math.min(0.45, 0.20 + (player.lifesteal || 0))) {
            player._lifestealCd = 0.12 * (player.lifestealIcdMul || 1);
            if (player.hp < player.maxHp) {
              player.hp = Math.min(player.maxHp, player.hp + 1);
            } else if (player.bloodShield) {
              const bCap = Math.max(4, Math.ceil(player.maxHp * 0.35));
              player._bloodShieldPool = Math.min(bCap, (player._bloodShieldPool || 0) + 1);
            }
          }
        } finally {
          _activeWeaponId = prevActZ;
        }
      }
    }
  }
  compactAliveEnemies();

  if (!updateEnemiesAndBosses(dt, effDmg, baseCrit, elemMul, dx, dy)) return;

  // 敌方差异化轨迹弹幕引擎（支持逆时回旋月刃 rewindAt、弧线包抄 curve、加减速长矛/星雷球 accel、S形双螺旋交织波 waveAmp、飞盘自转与友好擦弹判定）
  const ebSpdMul = sandGustT > 0 ? 0.78 : 1;
  for (let i = eBullets.length - 1; i >= 0; i--) {
    if (state !== 'wave') return;
    const b = eBullets[i];
    if (!b) continue;
    if (typeof ensureEnemyBulletScale === 'function') ensureEnemyBulletScale(b);
    if (b.life !== undefined) {
      b.life -= dt;
      if (b.life <= 0) { SpirePerf.swapPop(eBullets, i); continue; }
    }
    b.px = b.x; b.py = b.y;
    b.age = (b.age || 0) + dt * ebSpdMul;
    if (b.rewindAt > 0 && !b._rewound && b.age >= b.rewindAt) {
      b._rewound = true;
      const ro = (b.rewindOwner && b.rewindOwner.hp > 0) ? b.rewindOwner : null;
      const spdR = Math.max(152, Math.hypot(b.vx, b.vy) * 1.06);
      const revA = ro ? Math.atan2(ro.y - b.y, ro.x - b.x) : (Math.atan2(b.vy, b.vx) + Math.PI);
      b.vx = Math.cos(revA) * spdR;
      b.vy = Math.sin(revA) * spdR;
      b.color = '#fde68a';
      addSparks(b.x, b.y, revA, '#fde68a', 2);
    }
    if (b.waveAmp && b.baseAng !== undefined) {
      const fSpd = b.baseSpd || 148;
      const latSpd = Math.cos(b.age * (b.waveFreq || 6.4)) * b.waveAmp * (b.waveSign || 1);
      const ca = Math.cos(b.baseAng), sa = Math.sin(b.baseAng);
      b.vx = ca * fSpd - sa * latSpd;
      b.vy = sa * fSpd + ca * latSpd;
    } else {
      if (b.curve) {
        const dAng = b.curve * ebSpdMul * dt;
        const c = Math.cos(dAng), s = Math.sin(dAng);
        const nvx = b.vx * c - b.vy * s, nvy = b.vx * s + b.vy * c;
        b.vx = nvx; b.vy = nvy;
      }
      if (b.accel) {
        const curSpd = Math.hypot(b.vx, b.vy) || 1;
        const nextSpd = Math.max(b.minSpd || 42, Math.min(b.maxSpd || 320, curSpd + b.accel * ebSpdMul * dt));
        const ratio = nextSpd / curSpd;
        b.vx *= ratio; b.vy *= ratio;
      }
    }
    b.x += b.vx * ebSpdMul * dt; b.y += b.vy * ebSpdMul * dt;
    if (b.shape === 'disc' || b.shape === 'orb') b.rot = (b.rot || 0) + dt * (b.shape === 'disc' ? 14 : 5);
    const oobPad = b.isCelestial ? 640 : 16;
    if (b.x < -oobPad || b.x > WORLD.w + oobPad || b.y < -oobPad || b.y > WORLD.h + oobPad) { SpirePerf.swapPop(eBullets, i); continue; }
    const effHitR = b.hitR || b.r || 6.2;
    const bx0 = b.px !== undefined ? b.px : b.x;
    const by0 = b.py !== undefined ? b.py : b.y;
    const svx = b.x - bx0, svy = b.y - by0;
    const svLenSq = svx * svx + svy * svy;
    // 兼顾角色下半身躯干 (player.x, player.y) 与上半身胸首立绘中心 (player.x, player.y - 20) 的扫掠线段受击胶囊判定，彻底根治子弹穿过角色上半身不掉血的问题
    let tLow = 0, tHigh = 0;
    if (svLenSq > 0.0001) {
      tLow = Math.max(0, Math.min(1, ((player.x - bx0) * svx + (player.y - by0) * svy) / svLenSq));
      tHigh = Math.max(0, Math.min(1, ((player.x - bx0) * svx + ((player.y - 20) - by0) * svy) / svLenSq));
    }
    const dxLow = player.x - (bx0 + svx * tLow), dyLow = player.y - (by0 + svy * tLow);
    const dxHigh = player.x - (bx0 + svx * tHigh), dyHigh = (player.y - 20) - (by0 + svy * tHigh);
    const hitRLow = Math.max(6, player.r + effHitR - 2.0);
    const hitRHigh = Math.max(6, player.r * 0.88 + effHitR - 2.0);
    if (dxLow * dxLow + dyLow * dyLow < hitRLow * hitRLow || dxHigh * dxHigh + dyHigh * dyHigh < hitRHigh * hitRHigh) {
      if (b.chillPlayer && !player.noSlow) player.chillSlowT = 1.25;
      hurtPlayer(b.dmg, true, b.bossOwner || b.srcKey || (b.isVortexTrap ? 'trap_void_orb' : (b.isCelestial ? 'trap_sky_lance' : 'enemy_proj')));
      SpirePerf.swapPop(eBullets, i);
      if (state !== 'wave') return;
    }
  }

  // 掉落晶石 / 血包果实 / 战利品宝箱散射弹跳与指数级魂灯磁吸结算
  const effMag = player.magnet + ((player.magnetPulseT || 0) > 0 ? 135 : 0);
  const magSq = effMag * effMag;
  const pickR = player.r + 14, pickSq = pickR * pickR;
  for (let i = drops.length - 1; i >= 0; i--) {
    if (state !== 'wave') return;
    const d = drops[i];
    if (!d) continue;
    d.bob += dt * 5;
    if ((d.popT || 0) > 0) {
      d.popT -= dt;
      d.x = Math.max(22, Math.min(WORLD.w - 22, d.x + (d.vx || 0) * dt));
      d.y = Math.max(22, Math.min(WORLD.h - 22, d.y + (d.vy || 0) * dt));
      d.vx = (d.vx || 0) * Math.max(0, 1 - dt * 7.5);
      d.vy = (d.vy || 0) * Math.max(0, 1 - dt * 7.5);
    }
    const ddx = player.x - d.x, ddy = player.y - d.y;
    const distSq = ddx * ddx + ddy * ddy;
    if ((d.popT || 0) <= 0.04 && distSq < magSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const pullSpd = 560 + (effMag - dist) * 2.5;
      d.x += (ddx / dist) * pullSpd * dt; d.y += (ddy / dist) * pullSpd * dt;
    }
    if (distSq < pickSq) {
      if (d.kind === 'mat') {
        const v = (d.val || 1) * ((player.doubleMatChance || 0) > 0 && Math.random() < player.doubleMatChance ? 2 : 1);
        const xpScale = (wave === 1 ? 0.68 : (wave >= 7 ? 0.58 : 0.54)) * (1 + (player.xpGainBonus || 0));
        const rawXp = v * (d.xpMul || 1) * xpScale * player.harvest;
        const xpGain = Math.floor(rawXp) + (Math.random() < (rawXp % 1) ? 1 : 0);
        const matRate = typeof getWaveMatRate === 'function' ? getWaveMatRate(wave) : ((0.92 * 0.77) / (1 + Math.min(5, Math.max(0, wave - 1)) * 0.14 + Math.max(0, wave - 6) * 0.075));
        const rawMat = v * player.harvest * matRate;
        const matGain = Math.floor(rawMat) + (Math.random() < (rawMat % 1) ? 1 : 0);
        player.mats += matGain; player.xp += xpGain;
        if (player.paddingStacks > 0 && matGain > 0) syncSetHp();
        if ((player.matHealEvery25 || 0) > 0 && matGain > 0) {
          player._matPickAcc = (player._matPickAcc || 0) + matGain;
          if (player._matPickAcc >= 25) {
            const ticks = Math.floor(player._matPickAcc / 25);
            player._matPickAcc -= ticks * 25;
            if (player.hp < player.maxHp) {
              const gHeal = Math.min(player.maxHp - player.hp, ticks * player.matHealEvery25);
              player.hp += gHeal;
              addText(player.x, player.y - 26, `+${gHeal} 聚宝回春`, '#6ede8a', 13, 0.58, false);
            }
          }
        }
        if (typeof _frameHitBeeps === 'undefined' || _frameHitBeeps < 2) {
          if (typeof _frameHitBeeps !== 'undefined') _frameHitBeeps++;
          beep(780, 0.020, 'sine', 0.020);
        }
        // 【幸运弹珠】拾取晶石概率落雷轰击场上随机怪物（零临时数组分配 + 瞬步真空吸钻时同帧节流防卡顿）
        if (player.cyberball > 0 && enemies.length > 0 && (typeof _frameCyberBolts === 'undefined' || _frameCyberBolts < 2) && Math.random() < Math.min(0.60, (0.16 + (player.luck || 0) * 0.005) * player.cyberball)) {
          const te = pickRandomAliveEnemy(null);
          if (te) {
            if (typeof _frameCyberBolts !== 'undefined') _frameCyberBolts++;
            const cbDmg = (12 + wave * 2.5 + (player.luck || 0) * 0.35) * effDmg;
            if (lightnings.length < 30) lightnings.push({ pts: [{ x: player.x, y: player.y - 10 }, { x: te.x, y: te.y }], color: '#ffd166', t: 0.14, maxT: 0.14 });
            hurtEnemy(te, cbDmg, false, null, true, { noProc: true, silentHit: true });
            if (state !== 'wave') return;
          }
        }
        let lvGuard = 0;
        while (player.xp >= player.xpNeed && lvGuard++ < 25) {
          player.xp -= player.xpNeed; player.lv++;
          player.xpNeed = Math.max(10, Math.round(player.xpNeed * 1.36 + 6));
          player.maxHp += 2; player.hp += 2;
          pendingLevels++;
          addText(player.x, player.y - 36, 'LEVEL UP!', '#ffd166', 22, 1.9, true);
          beep(920, 0.12, 'triangle', 0.06);
        }
      } else if (d.kind === 'crate') {
        const specialQueued = (player.mythicCratesQueued || 0) + (player.bossCratesQueued || 0)
          + (player.survivalCratesQueued || 0) + (player.survivalGoldCratesQueued || 0);
        const regularCratesQueued = Math.max(0, pendingCrates - specialQueued);
        if (d.isMythic || d.isBoss || regularCratesQueued < 3) {
          pendingCrates++;
          if (d.isMythic) {
            player.mythicCratesQueued = (player.mythicCratesQueued || 0) + 1;
            addText(player.x, player.y - 36, '◆ 神话传说秘宝 +1!', '#ffd166', 21, 2.2, true);
            announce('◆ 拾取神话二阶段秘宝舱！波次结算时必出红色传说神装！', '#ffd166', 3.4);
          } else {
            if (d.isBoss) player.bossCratesQueued = (player.bossCratesQueued || 0) + 1;
            addText(player.x, player.y - 34, d.isBoss ? '◆ 首领秘宝 +1' : '◆ 宝箱 +1', '#ffd166', 19, 2.0, true);
            announce(d.isBoss ? '◆ 拾取首领秘宝箱！波次结算时可二选一开启' : '◆ 拾取异星战利品箱！波次结算时可二选一开启', '#ffd166', 2.8);
          }
          beep(880, 0.11, 'triangle', 0.06);
        } else {
          const yieldMul = typeof CRYSTAL_YIELD_MUL === 'number' ? CRYSTAL_YIELD_MUL : 0.77;
          const bonusMat = Math.max(8, Math.round((16 + wave * 3) * yieldMul));
          player.mats += bonusMat;
          player.hp = Math.min(player.maxHp, player.hp + 6);
          addText(player.x, player.y - 34, `满载折算 +${bonusMat}晶石 +6HP`, '#ffd166', 17, 2.0, true);
          beep(780, 0.09, 'sine', 0.05);
        }
      } else {
        const healAmt = 5 + (player.healBonus || 0);
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        if (player.healSpdBoost) player.healSpdT = 2.6;
        addText(player.x, player.y - 28, `+${healAmt} HP`, '#6ede8a', 17, 0.75, false);
        beep(640, 0.08, 'sine', 0.05);
        if (player.spicySauce) {
          triggerExplosion(player.x, player.y, 118 * getBlastScale(), Math.max(18, player.maxHp * 2.2) * effDmg * elemMul, false, 0, '#fb923c', false, 0, 'relic_proc');
          if (state !== 'wave') return;
        }
      }
      SpirePerf.swapPop(drops, i);
    }
  }

  // 特效生命周期更新（高频粒子与火花采用原地紧缩，零 splice 位移开销）
  let pw = 0;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.t -= dt;
    if (p.t > 0) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      particles[pw++] = p;
    }
  }
  particles.length = pw;

  let sw = 0;
  for (let i = 0; i < sparks.length; i++) {
    const sp = sparks[i];
    sp.t -= dt;
    if (sp.t > 0) {
      sp.x += sp.vx * dt; sp.y += sp.vy * dt;
      sparks[sw++] = sp;
    }
  }
  sparks.length = sw;

  for (let i = lightnings.length - 1; i >= 0; i--) { lightnings[i].t -= dt; if (lightnings[i].t <= 0) SpirePerf.swapPop(lightnings, i); }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t -= dt; if (rings[i].t <= 0) SpirePerf.swapPop(rings, i); }
  for (let i = slashes.length - 1; i >= 0; i--) { slashes[i].t -= dt; if (slashes[i].t <= 0) SpirePerf.swapPop(slashes, i); }
  for (let i = beams.length - 1; i >= 0; i--) { beams[i].t -= dt; if (beams[i].t <= 0) SpirePerf.swapPop(beams, i); }
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt; s.rot += 12 * dt; s.t -= dt;
    if (s.t <= 0) SpirePerf.swapPop(shells, i);
  }
  let tw = 0;
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    t.t -= dt;
    if (t.t > 0) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      if (t.important) t.vy *= Math.max(0, 1 - dt * 1.2);
      else t.vy += 240 * dt;
      texts[tw++] = t;
    }
  }
  texts.length = tw;

  // 更新高清 HUD（节流 + 脏值比对，避免每帧强制触发手机 DOM 重排）
  hudAcc += dt;
  if (hudAcc >= 0.08) {
    hudAcc = 0;
    const safeMaxHp = Math.max(1, player.maxHp || 1);
    const safeXpNeed = Math.max(1, player.xpNeed || 10);
    const totalVisShield = (player.shield || 0) + (player._bloodShieldPool || 0);
    setHudWidth('hpFill', Math.max(0, Math.round((player.hp / safeMaxHp) * 1000) / 10) + '%');
    setHudWidth('shFill', totalVisShield > 0 ? Math.min(100, Math.round((totalVisShield / safeMaxHp) * 1000) / 10) + '%' : '0%');
    const shTxt = totalVisShield > 0
      ? ((player._bloodShieldPool || 0) > 0 && !(player.maxShield > 0) ? ` · 血盾 ${Math.ceil(totalVisShield)}` : ` · 护盾 ${Math.ceil(totalVisShield)}`)
      : '';
    setHudText('hpText', `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}${shTxt}`);
    setHudWidth('xpFill', Math.min(100, Math.round((player.xp / safeXpNeed) * 1000) / 10) + '%');
    setHudText('xpText', `Lv.${player.lv}${pendingLevels ? ' (+' + pendingLevels + ')' : ''}`);
    setHudText('hudKills', `净化 ${player.kills}`);
    const crateTxt = pendingCrates > 0 ? ` · 遗匣×${pendingCrates}` : '';
    setHudText('hudWeapons', player.maxSlots === 0 ? `铁卫形态${crateTxt}` : `兵装 ${player.weapons.length}/${player.maxSlots}${turrets.length ? ' · 机关×' + turrets.length : ''}${crateTxt}`);
    const isFixedBossFloor = (!endlessMode && wave <= MAX_WAVE && wave % 4 === 0);
    const waveTag = survivalTrialWave
      ? (endlessMode ? `无尽 ${wave} 层 · 🕯️蚀界渡劫` : `第 ${wave} 层 · 🕯️蚀界渡劫`)
      : (endlessMode
          ? `无尽第 ${wave} 层`
          : (wave === MAX_WAVE
              ? `第 ${wave} 层 · 终幕真我`
              : (isFixedBossFloor
                  ? `第 ${wave} 层 · 守誓决战`
                  : (hordeWave ? `潮涌 ${wave}/${MAX_WAVE} 层` : `第 ${wave} / ${MAX_WAVE} 层`))));
    setHudText('waveTitle', uiMode === 'desktop' ? `${diff.badge}  ·  ${curScene.name}  ·  ${waveTag}` : `${diff.badge}  ·  ${waveTag}`);
    const isDeathmatchHud = overtime;
    setHudText('waveTimer', isDeathmatchHud ? '死战' : String(Math.ceil(Math.max(0, waveTime))));
    const timerPct = isDeathmatchHud ? 100 : Math.max(0, Math.min(100, (waveTime / Math.max(1, waveMaxTime)) * 100));
    setHudWidth('timerFill', timerPct.toFixed(1) + '%');
    const tcEl = hudEls.timerCapsule || (hudEls.timerCapsule = document.getElementById('timerCapsule'));
    if (tcEl) {
      const isUrgent = isDeathmatchHud || waveTime <= 5;
      const isWarn = !isUrgent && waveTime <= 10;
      const timerState = (isDeathmatchHud ? 'overtime:' : '') + (isUrgent ? 'urgent' : (isWarn ? 'warn' : 'normal'));
      if (hudCache.timerState !== timerState) {
        hudCache.timerState = timerState;
        tcEl.classList.toggle('warn', isWarn);
        tcEl.classList.toggle('urgent', isUrgent);
        tcEl.classList.toggle('is-overtime', !!isDeathmatchHud);
      }
    }
    setHudText('matText', `◇ ${player.mats}`);

    // 同步桌面端青焰瞬步充能条 & 移动端拇指瞬步键冷却状态
    const dCd = player.dashCd || 0;
    const dMax = Math.max(0.5, player.dashMaxCd || 3.2);
    const dashCooling = dCd > 0.02;
    const dashPct = dashCooling ? Math.max(0, Math.min(100, (1 - dCd / dMax) * 100)) : 100;
    const hudFearActive = typeof isBossLastStandFearActive === 'function' && isBossLastStandFearActive();
    setHudWidth('hudDashFill', dashPct.toFixed(1) + '%');
    setHudText('hudDashText', dashCooling
      ? (hudFearActive ? `恐惧冷却 ${dCd.toFixed(1)}s (+50%)` : `瞬步冷却 ${dCd.toFixed(1)}s`)
      : (hudFearActive ? '😱 瞬步就绪 [恐惧+50%CD]' : '◆ 瞬步就绪 [Space]'));
    setHudText('dashTouchLabel', dashCooling ? `${dCd.toFixed(1)}s` : (hudFearActive ? '瞬步!' : '瞬步'));
    if (hudCache.dashCooling !== dashCooling) {
      hudCache.dashCooling = dashCooling;
      const dwEl = hudEls.hudDashWrap || (hudEls.hudDashWrap = document.getElementById('hudDashWrap'));
      if (dwEl) dwEl.classList.toggle('cooling', dashCooling);
      const dtEl = hudEls.dashTouchBtn || (hudEls.dashTouchBtn = document.getElementById('dashTouchBtn'));
      if (dtEl) dtEl.classList.toggle('cooling', dashCooling);
    }

    const aliveBosses = [];
    let anyMythicBoss = false, activeCastLabel = '';
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if ((e.type === 'boss' || e.type === 'mini_boss' || e.type === 'special_boss') && e.hp > 0) {
        if (!e._bossHudOrder) e._bossHudOrder = ++_bossHudSeq;
        aliveBosses.push(e);
        if (e.mythicPhase2) anyMythicBoss = true;
        if ((e.d5LastStandT || 0) > 0) {
          anyMythicBoss = true;
          activeCastLabel = `🩸 临死挣扎 · 无敌 ${e.d5LastStandT.toFixed(1)}s（恐惧：移速-15% · 瞬步冷却+50% · 伤敌汲血10%）`;
        } else if (!activeCastLabel) {
          if ((e.p2WindupT || 0) > 0 && e.p2Label) {
            activeCastLabel = `⚠️ 二阶终式蓄力 · ${e.p2Label}`;
          } else if (e.eclipseSingularity) {
            activeCastLabel = (e.eclipseSingularity.windupT || 0) > 0
              ? `⚠️ 黑洞引力奇点预警 (${e.eclipseSingularity.windupT.toFixed(1)}s后开启吸力 · 速进金色晨曦庇护印)`
              : `🌑 黑洞引力奇点 (${e.eclipseSingularity.t.toFixed(1)}s · 冲入金色晨曦庇护印抗衡吸力)`;
          } else if (e.chronoAnchor) {
            activeCastLabel = `⏳ 逆时回溯锚点 (${e.chronoAnchor.t.toFixed(1)}s · 踏入断时阵解锚)`;
          } else if (e.duelRing) {
            activeCastLabel = `⚔️ 血誓决斗剑域 (${e.duelRing.t.toFixed(1)}s · 圈内应战破防)`;
          } else if ((e._alivePylonCnt || 0) > 0) {
            activeCastLabel = `⚡ 共鸣阵眼×${e._alivePylonCnt}（优先击破棱柱 · 触发20s首领破防承伤+20%）`;
          } else if ((e.venomBreathT || 0) > 0) {
            activeCastLabel = e.venomTwin ? '☠️ 释放二阶终式 · 双龙万蛊毒息' : '☠️ 高压横扫 · 剧毒龙息喷流';
          } else if (e.castLabel && ((e.sigWindupT || 0) > 0 || (e.castEndT || 0) > 0)) {
            activeCastLabel = (e.sigWindupT || 0) > 0 ? `⚠️ 蓄力咏唱 · ${e.castLabel}` : `💥 释放杀招 · ${e.castLabel}`;
          } else if ((e.pylonBrokenT || 0) > 0) {
            activeCastLabel = `◈ 真实破防中 · 首领承伤 +20%（${e.pylonBrokenT.toFixed(1)}s 后重召阵眼）`;
          }
        }
      }
    }
    if (aliveBosses.length > 1) {
      aliveBosses.sort((a, b) => (a._bossHudOrder || 0) - (b._bossHudOrder || 0));
    }
    const bossCnt = aliveBosses.length;
    const pendingBossSpawn = spawns.some(s => s.type === 'boss' || s.type === 'mini_boss' || s.type === 'special_boss');
    const bwEl = hudEls.bossBarWrap || (hudEls.bossBarWrap = document.getElementById('bossBarWrap'));
    const bprEl = hudEls.bossPrimaryRow || (hudEls.bossPrimaryRow = document.getElementById('bossPrimaryRow'));
    const bexEl = hudEls.bossExtraBars || (hudEls.bossExtraBars = document.getElementById('bossExtraBars'));
    const bcsEl = hudEls.bossCastSub || (hudEls.bossCastSub = document.getElementById('bossCastSub'));
    if (bossCnt > 0) {
      const b0 = aliveBosses[0];
      const b0Mythic = !!(b0.mythicPhase2 || (b0.d5LastStandT || 0) > 0);
      SpirePerf.setBossBarVisible(true);
      if (bwEl) {
        if (bwEl.classList.contains('hidden')) bwEl.classList.remove('hidden');
        if (hudCache.bossWrapMythic !== anyMythicBoss) {
          hudCache.bossWrapMythic = anyMythicBoss;
          bwEl.classList.toggle('mythic', anyMythicBoss);
        }
      }
      if (bprEl && hudCache.bossPrimaryMythic !== b0Mythic) {
        hudCache.bossPrimaryMythic = b0Mythic;
        bprEl.classList.toggle('mythic', b0Mythic);
      }
      if (bcsEl) {
        if (activeCastLabel) {
          if (bcsEl.classList.contains('hidden')) bcsEl.classList.remove('hidden');
          setHudText('bossCastSub', activeCastLabel);
        } else if (!bcsEl.classList.contains('hidden')) {
          bcsEl.classList.add('hidden');
        }
      }
      const b0Name = b0.bossTitle || (b0.type === 'mini_boss' ? '⚔️ 雨夜守桥重铠武者' : '👑 绯红断刃剑姬 · 烬羽');
      if (hudCache.bossName !== b0Name) {
        hudCache.bossName = b0Name;
        const bnEl = hudEls.bossName || (hudEls.bossName = document.querySelector('#bossPrimaryRow .boss-name') || document.querySelector('.boss-name'));
        if (bnEl) bnEl.textContent = b0Name;
      }
      const b0Cur = Math.max(0, b0.hp), b0Tot = Math.max(1, b0.maxHp);
      const b0Pct = Math.max(0, Math.min(100, Math.round((b0Cur / b0Tot) * 1000) / 10));
      setHudWidth('bossFill', b0Pct + '%');
      setHudText('bossHpText', `${Math.ceil(b0Cur)} / ${Math.ceil(b0Tot)} (${Math.round(b0Pct)}%)`);

      // 双首领 / 多首领同台时：每个首领独立渲染各自的血条、血量数值与二阶段金框状态！
      const extraCnt = Math.max(0, bossCnt - 1);
      if (bexEl) {
        const rows = hudEls.extraBossRows || (hudEls.extraBossRows = []);
        while (rows.length > extraCnt) {
          const rem = rows.pop();
          if (rem && rem.row && rem.row.parentNode) rem.row.parentNode.removeChild(rem.row);
        }
        while (rows.length < extraCnt) {
          const row = document.createElement('div');
          row.className = 'boss-p5-row boss-sub-row';
          const head = document.createElement('div');
          head.className = 'boss-p5-head';
          const nm = document.createElement('span');
          nm.className = 'boss-name';
          const txt = document.createElement('span');
          txt.className = 'boss-hp-text';
          head.appendChild(nm);
          head.appendChild(txt);
          const bar = document.createElement('div');
          bar.className = 'boss-p5-track';
          const fill = document.createElement('div');
          fill.className = 'boss-p5-fill';
          fill.style.width = '100%';
          bar.appendChild(fill);
          row.appendChild(head);
          row.appendChild(bar);
          bexEl.appendChild(row);
          rows.push({ row, nm, fill, txt, lastNm: '', lastW: '', lastTxt: '', lastMythic: false });
        }
        for (let k = 0; k < extraCnt; k++) {
          const bk = aliveBosses[k + 1];
          const slot = rows[k];
          const bkMythic = !!(bk.mythicPhase2 || (bk.d5LastStandT || 0) > 0);
          if (slot.lastMythic !== bkMythic) {
            slot.lastMythic = bkMythic;
            slot.row.classList.toggle('mythic', bkMythic);
          }
          const bkName = bk.bossTitle || (bk.type === 'mini_boss' ? '⚔️ 守誓统领' : '👑 深渊主宰');
          if (slot.lastNm !== bkName) {
            slot.lastNm = bkName;
            slot.nm.textContent = bkName;
          }
          const bkCur = Math.max(0, bk.hp), bkTot = Math.max(1, bk.maxHp);
          const bkPct = Math.max(0, Math.min(100, Math.round((bkCur / bkTot) * 1000) / 10));
          const wStr = bkPct + '%';
          if (slot.lastW !== wStr) {
            slot.lastW = wStr;
            slot.fill.style.width = wStr;
          }
          const tStr = `${Math.ceil(bkCur)} / ${Math.ceil(bkTot)} (${Math.round(bkPct)}%)`;
          if (slot.lastTxt !== tStr) {
            slot.lastTxt = tStr;
            slot.txt.textContent = tStr;
          }
        }
      }
    } else if (!pendingBossSpawn) {
      SpirePerf.setBossBarVisible(false);
      setHudWidth('bossFill', '0%');
      setHudText('bossHpText', '');
      if (bexEl && hudEls.extraBossRows && hudEls.extraBossRows.length > 0) {
        hudEls.extraBossRows.length = 0;
        bexEl.innerHTML = '';
      }
      if (bprEl && hudCache.bossPrimaryMythic) {
        hudCache.bossPrimaryMythic = false;
        bprEl.classList.remove('mythic');
      }
      if (bcsEl && !bcsEl.classList.contains('hidden')) bcsEl.classList.add('hidden');
      if (bwEl) {
        if (hudCache.bossWrapMythic) {
          hudCache.bossWrapMythic = false;
          bwEl.classList.remove('mythic');
        }
        if (!bwEl.classList.contains('hidden')) bwEl.classList.add('hidden');
      }
    }
  }
}
