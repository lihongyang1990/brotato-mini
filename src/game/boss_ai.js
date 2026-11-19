// 怪物与首领多维战术 AI、直线冲锋锁定、二阶段大招与场地机关状态机（自 update.js 模块化拆分）
function _lerpAngle(cur, target, t) {
  if (!Number.isFinite(cur)) return target;
  let diffA = (target - cur) % (Math.PI * 2);
  if (diffA > Math.PI) diffA -= Math.PI * 2;
  else if (diffA < -Math.PI) diffA += Math.PI * 2;
  return cur + diffA * t;
}

const _activePoolTerrains = [];

// 确保首领核心斩击特效（如八荒血月斩、绯夜八荒剑狱）绝不因玩家高频近战填满 slashes 上限而丢失贴图
function pushBossSlash(s) {
  if (!s) return;
  if (slashes.length >= 48) {
    let dropIdx = 0;
    for (let k = 0; k < slashes.length; k++) {
      if (!slashes[k] || !slashes[k].isBoss) { dropIdx = k; break; }
    }
    slashes.splice(dropIdx, 1);
  }
  slashes.push(s);
}

// 第 10 层（幽影雷刃统领）与第 12 层（逆时星晷主宰·伽蓝）传送折跃预警时长：
// D1 -> D5 逐步递减（1.08s -> 0.945s -> 0.81s -> 0.675s -> 0.54s），D5 恰好为 D1 的 50%！
function getBossTeleportWarnSec(overrideDiffId) {
  const id = (typeof overrideDiffId === 'number')
    ? overrideDiffId
    : ((typeof diff !== 'undefined' && diff && typeof diff.id === 'number') ? diff.id : 1);
  if (id <= 0) return 1.24;
  const d1 = 1.08;
  const step = Math.min(1, Math.max(0, (id - 1) / 4));
  return +(d1 * (1 - 0.50 * step)).toFixed(4);
}
if (typeof globalThis !== 'undefined') {
  globalThis.getBossTeleportWarnSec = getBossTeleportWarnSec;
}

// 计算直线冲锋在地图边界内的真实可达预警长度（确保预警虚线终点 === 100% 实际冲刺落点）
function computeDashAllowedLen(x, y, ang, desiredLen, r) {
  const pad = (r || 20) + 6;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  let maxLen = desiredLen;
  if (ca > 1e-4) maxLen = Math.min(maxLen, (WORLD.w - pad - x) / ca);
  else if (ca < -1e-4) maxLen = Math.min(maxLen, (pad - x) / ca);
  if (sa > 1e-4) maxLen = Math.min(maxLen, (WORLD.h - pad - y) / sa);
  else if (sa < -1e-4) maxLen = Math.min(maxLen, (pad - y) / sa);
  return Math.max(48, Math.round(maxLen));
}

function lockLinearDash(e, ang, desiredLen, windupMax, dashColor = '', dashStyle = 'corridor') {
  e.lockedAim = ang;
  e.dashWindupMax = windupMax;
  e.dashWarnLen = computeDashAllowedLen(e.x, e.y, ang, desiredLen, e.r);
  e.dashWarnColor = dashColor || '';
  e.dashStyle = dashStyle || 'corridor';
}

function startLinearDash(e, fallbackAng, desiredLen, dashDur) {
  const ca = e.lockedAim !== undefined ? e.lockedAim : fallbackAng;
  const dist = e.dashWarnLen || computeDashAllowedLen(e.x, e.y, ca, desiredLen, e.r);
  const dashSpdMul = typeof MONSTER_SPD_MUL === 'number' ? MONSTER_SPD_MUL : 0.80;
  e.dashing = true;
  e.dashAng = ca;
  e.dashWarnLen = dist;
  e.dashRem = dist;
  e.dashSpd = (dist / Math.max(0.18, dashDur)) * dashSpdMul;
  e.vx = Math.cos(ca) * e.dashSpd;
  e.vy = Math.sin(ca) * e.dashSpd;
  return ca;
}

function advanceLinearDash(e, dt) {
  const step = Math.min(e.dashRem || 0, (e.dashSpd || 700) * dt);
  const ca = e.dashAng !== undefined ? e.dashAng : (e.lockedAim || 0);
  e.x += Math.cos(ca) * step;
  e.y += Math.sin(ca) * step;
  e.dashRem = (e.dashRem || 0) - step;
  return e.dashRem > 0.5;
}

function finishLinearDash(e, nextCd) {
  e.dashing = false;
  e.lockedAim = undefined;
  e.dashWarnLen = undefined;
  e.dashWindupMax = undefined;
  e.dashWarnColor = undefined;
  e.dashStyle = undefined;
  e.dashRem = 0;
  e.dashT = nextCd;
}

// 首领与统领出招身体动态姿态脉冲（驱动 sprites.js 渲染前扑挥斩、浮空咏唱、重踏震地、炮口后坐与旋舞残影，告别呆板站桩施法）
function triggerBossActionPose(e, kind, angle, dur = 0.48, col = '') {
  if (!e) return;
  e._actKind = kind || 'cast_up';
  e._actAng = Number.isFinite(angle) ? angle : (e.faceA || 0);
  e._actPoseMax = Math.max(0.12, dur || 0.48);
  e._actPoseT = e._actPoseMax;
  if (col) e._actCol = col;
}
if (typeof globalThis !== 'undefined') {
  globalThis.triggerBossActionPose = triggerBossActionPose;
}

function _turnAngleBounded(cur, target, maxStep) {
  let diffA = (target - cur + Math.PI) % (Math.PI * 2);
  if (diffA < 0) diffA += Math.PI * 2;
  diffA -= Math.PI;
  if (Math.abs(diffA) <= maxStep) return target;
  return cur + (diffA > 0 ? maxStep : -maxStep);
}

// 首领高压扇形喷毒吐息状态机（扇面预警 -> 缓速有界偏转横扫毒雾喷流 + 酸液飞沫 + 扇区腐蚀判定，预留近战绕侧窗口）
function tickBossVenomBreath(e, dt, aimToPlayer, paceMult) {
  const canVenom = (
    e.variant === 'plague_empress' ||
    e.variant === 'void_weaver' ||
    e.variant === 'venom_matriarch' ||
    (e.type === 'special_boss' && e.variant === 'abyss_devourer')
  );
  if (!canVenom && !(e.venomWindupT > 0) && !(e.venomBreathT > 0)) return false;

  const lsRate = (e.d5LastStandT || 0) > 0 ? 1.20 : 1.0;
  if ((e.venomWindupT || 0) > 0) {
    e.venomWindupT -= dt * lsRate;
    // 蓄力最后 0.24s 锁定喷射方向不再跟转，保证近战提前侧移绕后 100% 有效
    if (e.venomWindupT > 0.24) {
      e.venomAimA = _turnAngleBounded(e.venomAimA !== undefined ? e.venomAimA : aimToPlayer, aimToPlayer, 1.15 * dt);
    }
    if (e.venomWindupT <= 0) {
      e.venomWindupT = 0;
      e.venomBreathMax = e.venomTwin ? 1.75 : 1.50;
      e.venomBreathT = e.venomBreathMax;
      e._venomPulseCd = 0;
      e._venomHitCd = 0;
      triggerBossActionPose(e, e.venomTwin ? 'spin' : 'thrust', e.venomAimA || aimToPlayer, 0.56, '#a3e635');
      beep(195, 0.16, 'sawtooth', 0.06);
      addText(e.x, e.y - e.r - 20, e.venomTwin ? '☠️ 双龙万蛊毒息横扫!' : '☠️ 剧毒龙息喷流!', '#a3e635', 14, 1.35, true);
    }
    return false;
  }

  if ((e.venomBreathT || 0) > 0) {
    e.venomBreathT -= dt;
    // 严格限制最大旋转角速度（约 27°~32°/s），杜绝贴脸甩头秒跟近战玩家
    const maxTurnRate = e.venomTwin ? 0.46 : 0.54;
    e.venomAimA = _turnAngleBounded(e.venomAimA !== undefined ? e.venomAimA : aimToPlayer, aimToPlayer, maxTurnRate * dt);
    const vLen = e.venomLen || 278;
    const vSpan = e.venomSpan || 0.42;
    const nozzles = e.venomTwin ? [0, Math.PI] : [0];

    e._venomPulseCd = (e._venomPulseCd || 0) - dt;
    if (e._venomPulseCd <= 0) {
      e._venomPulseCd = 0.12;
      for (let ni = 0; ni < nozzles.length; ni++) {
        const na = (e.venomAimA || 0) + nozzles[ni];
        for (let pk = 0; pk < 4; pk++) {
          const pa = na + (Math.random() - 0.5) * vSpan * 1.82;
          const pSpd = 175 + Math.random() * 165;
          pushParticle({
            x: e.x + Math.cos(na) * (e.r * 0.62) + (Math.random() - 0.5) * 10,
            y: e.y + Math.sin(na) * (e.r * 0.62) + (Math.random() - 0.5) * 10,
            vx: Math.cos(pa) * pSpd,
            vy: Math.sin(pa) * pSpd,
            r: 4.8 + Math.random() * 4.6,
            color: pk === 0 ? '#bef264' : (pk === 1 ? '#10b981' : (pk === 2 ? '#84cc16' : '#a855f7')),
            t: 0.38, maxT: 0.38
          });
        }
        if (eBullets.length < 168) {
          const ba = na + (Math.random() - 0.5) * vSpan * 1.35;
          const bSpd = 152 + Math.random() * 36;
          eBullets.push({
            x: e.x + Math.cos(na) * (e.r * 0.62),
            y: e.y + Math.sin(na) * (e.r * 0.62),
            px: e.x, py: e.y,
            vx: Math.cos(ba) * bSpd, vy: Math.sin(ba) * bSpd,
            life: 1.55,
            dmg: Math.max(4, Math.round(e.dmg * 0.72)),
            r: 5.8, hitR: 5.0,
            color: ni === 0 ? '#84cc16' : '#34d399',
            shape: 'acid',
            chillPlayer: true
          });
        }
      }
    }

    e._venomHitCd = Math.max(0, (e._venomHitCd || 0) - dt);
    if (player && state === 'wave' && e._venomHitCd <= 0) {
      const dxP = player.x - e.x, dyP = player.y - e.y;
      const dP = Math.hypot(dxP, dyP);
      if (dP <= vLen + player.r - 4 && dP > 6) {
        const angP = Math.atan2(dyP, dxP);
        for (let ni = 0; ni < nozzles.length; ni++) {
          const na = (e.venomAimA || 0) + nozzles[ni];
          let da = Math.abs(angP - na) % (Math.PI * 2);
          if (da > Math.PI) da = Math.PI * 2 - da;
          if (da <= vSpan) {
            e._venomHitCd = 0.34;
            if (!player.noSlow) player.chillSlowT = Math.max(player.chillSlowT || 0, 0.95);
            addText(player.x, player.y - 36, '剧毒喷流腐蚀!', '#a3e635', 14, 0.9);
            hurtPlayer(Math.max(4, Math.round(e.dmg * 0.86)));
            if (state !== 'wave') return true;
            break;
          }
        }
      }
    }

    if (e.venomBreathT <= 0) {
      e.venomBreathT = 0;
      const endA = e.venomAimA || aimToPlayer;
      spawnHazard(e.x + Math.cos(endA) * (vLen * 0.76), e.y + Math.sin(endA) * (vLen * 0.76), 64, e.dmg * 1.02, 1.15, { color: '#52b788', style: 'venom_mire' });
      e.venomTwin = false;
      e.exposeT = Math.max(e.exposeT || 0, 1.15);
    }
    return false;
  }

  if (!e.dashing && !(e.sigWindupT > 0) && !(e.p2WindupT > 0)) {
    e.venomCd = (e.venomCd !== undefined ? e.venomCd : 4.5) - dt * paceMult;
    if (e.venomCd <= 0) {
      e.venomCd = e.variant === 'plague_empress' ? 5.8 : (e.variant === 'venom_matriarch' ? 6.0 : 6.8);
      e.venomWindupMax = 0.68;
      e.venomWindupT = 0.68;
      e.venomAimA = aimToPlayer;
      e.venomSpan = 0.40;
      const vBeamMul = typeof getBossBeamLenMul === 'function' ? getBossBeamLenMul() : 1.0;
      e.venomLen = Math.round((e.type === 'mini_boss' ? 248 : 276) * vBeamMul);
      e.venomTwin = false;
      beep(330, 0.08, 'triangle', 0.048);
      addText(e.x, e.y - e.r - 18, '☠️ 高压剧毒喷流蓄力!', '#a3e635', 14, 1.1, true);
    }
  }
  return false;
}

// 隐藏神话二阶段 / 终幕二阶段【专属额外终极技能】状态机（突出二阶段首领压迫感与独立能力）
function tickBossPhase2Skill(e, dt, aimToPlayer, paceMult) {
  if (!e.mythicPhase2) return false;
  const lsRate = (e.d5LastStandT || 0) > 0 ? 1.20 : 1.0;
  if ((e.p2WindupT || 0) > 0) {
    e.p2WindupT -= dt * lsRate;
    if (e.p2WindupT <= 0) {
      e.p2WindupT = 0;
      e.castEndT = 1.15;
      e.exposeT = Math.max(e.exposeT || 0, 1.35);
      const baseA = Number.isFinite(e.p2BaseA) ? e.p2BaseA : aimToPlayer;
      const p2BeamMul = typeof getBossBeamLenMul === 'function' ? getBossBeamLenMul() : 1.0;
      beep(215, 0.18, 'sawtooth', 0.07);
      if (e.p2Kind === 'p2_absolute_zero') {
        triggerBossActionPose(e, 'cast_up', baseA, 0.62, '#72efdd');
        e.beamSweepQuad = true;
        e.beamSweepMaxT = 1.80;
        e.beamSweepT = 1.80;
        e.beamSweepA = baseA;
        if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 175, color: '#72efdd', t: 0.34, maxT: 0.34, kind: 'hex' });
        for (let k = 0; k < 8 && eBullets.length < 170; k++) {
          const ba = baseA + (k / 8) * Math.PI * 2 + 0.39;
          eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 148, vy: Math.sin(ba) * 148, dmg: Math.max(4, Math.round(e.dmg * 0.80)), r: 6.0, color: '#7dd3fc', shape: 'trident', chillPlayer: true });
        }
      } else if (e.p2Kind === 'p2_chrono_octa') {
        triggerBossActionPose(e, 'cast_up', baseA, 0.62, '#fde68a');
        const gx = Number.isFinite(e.p2TargetX) ? e.p2TargetX : player.x;
        const gy = Number.isFinite(e.p2TargetY) ? e.p2TargetY : player.y;
        const span = Math.round(540 * p2BeamMul);
        if (rings.length < 40) rings.push({ x: gx, y: gy, r: 120, color: '#fde68a', t: 0.32, maxT: 0.32, kind: 'star' });
        for (let k = 0; k < 4; k++) {
          const la = baseA + k * (Math.PI * 0.25);
          const x1 = gx - Math.cos(la) * span, y1 = gy - Math.sin(la) * span;
          const x2 = gx + Math.cos(la) * span, y2 = gy + Math.sin(la) * span;
          if (beams.length < 32) beams.push({ x1, y1, x2, y2, color: k % 2 === 0 ? '#fde68a' : '#c084fc', t: 0.34, maxT: 0.34 });
          if (player && state === 'wave') {
            const seg = pointSegClosest(player.x, player.y, x1, y1, x2, y2);
            if (seg.dSq <= (10 + player.r - 2) * (10 + player.r - 2)) {
              hurtPlayer(Math.round(e.dmg * 1.12));
              if (state !== 'wave') return true;
            }
          }
        }
      } else if (e.p2Kind === 'p2_omega_storm') {
        triggerBossActionPose(e, 'slam', baseA, 0.58, '#fb923c');
        if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 165, color: '#fb923c', t: 0.32, maxT: 0.32, kind: 'star' });
        for (let k = 0; k < 6 && eBullets.length < 170; k++) {
          const ba = baseA + (k / 6) * Math.PI * 2;
          eBullets.push({
            x: e.x, y: e.y, px: e.x, py: e.y,
            vx: Math.cos(ba) * 132, vy: Math.sin(ba) * 132,
            curve: 0.28, life: 2.7,
            dmg: Math.max(4, Math.round(e.dmg * 0.82)), r: 8.0, color: '#ffd166', shape: 'disc', rot: 0
          });
        }
        for (let k = 0; k < 4; k++) {
          const ha = baseA + k * (Math.PI * 0.5) + 0.39;
          spawnHazard(e.x + Math.cos(ha) * 175, e.y + Math.sin(ha) * 175, 58, e.dmg * 1.10, 1.15, { color: '#fb5607', style: 'flame_pillar' });
        }
      } else if (e.p2Kind === 'p2_twin_venom') {
        triggerBossActionPose(e, 'spin', baseA, 0.62, '#a3e635');
        e.venomTwin = true;
        e.venomAimA = baseA;
        e.venomSpan = 0.36;
        e.venomLen = Math.round(278 * p2BeamMul);
        e.venomBreathMax = 1.75;
        e.venomBreathT = 1.75;
        e._venomPulseCd = 0;
        e._venomHitCd = 0;
        if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 158, color: '#a3e635', t: 0.32, maxT: 0.32, kind: 'hex' });
      } else if (e.p2Kind === 'p2_eclipse_apocalypse') {
        triggerBossActionPose(e, 'cast_up', baseA, 0.64, '#ffd166');
        const tx = Number.isFinite(e.p2TargetX) ? e.p2TargetX : player.x;
        const ty = Number.isFinite(e.p2TargetY) ? e.p2TargetY : player.y;
        if (rings.length < 40) rings.push({ x: tx, y: ty, r: 195, color: '#fde68a', t: 0.36, maxT: 0.36, kind: 'hex' });
        for (let k = 0; k < 6; k++) {
          const ha = baseA + (k / 6) * Math.PI * 2;
          spawnHazard(tx + Math.cos(ha) * 135, ty + Math.sin(ha) * 135, 62, e.dmg * 1.15, 0.98, { color: '#ffd166', style: 'thunder_sigil' });
        }
        for (let k = 0; k < 10 && eBullets.length < 170; k++) {
          const ba = baseA + (k / 10) * Math.PI * 2;
          eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 172, vy: Math.sin(ba) * 172, dmg: Math.max(5, Math.round(e.dmg * 0.82)), r: 6.4, color: k % 2 === 0 ? '#ffd166' : '#c084fc', shape: 'lance' });
        }
      } else {
        // p2_crimson_prison：绯夜八荒剑狱（双十字裂空剑隙 + 八方绯月回旋斩，必保贴图完整渲染）
        triggerBossActionPose(e, 'slash', baseA, 0.60, '#ff2a55');
        const tx = Number.isFinite(e.p2TargetX) ? e.p2TargetX : player.x;
        const ty = Number.isFinite(e.p2TargetY) ? e.p2TargetY : player.y;
        const slashHalfLen = Math.round(138 * p2BeamMul);
        for (let k = 0; k < 2; k++) {
          spawnHazard(tx, ty, 30, e.dmg * 1.12, 0.85, {
            color: '#fb7185', style: 'void_slash',
            angle: baseA + k * (Math.PI * 0.5) + 0.39, halfLen: slashHalfLen, halfW: 15,
            srcKey: e.variant || e.type
          });
        }
        for (let k = 0; k < 8; k++) {
          const ba = baseA + (k / 8) * Math.PI * 2;
          pushBossSlash({ x: e.x, y: e.y, angle: ba, r: 156, color: '#ff2a55', coreColor: '#fde68a', mode: 'blood_moon', isBoss: true, t: 0.32, maxT: 0.32 });
          if (eBullets.length >= 215) eBullets.shift();
          eBullets.push({ x: e.x, y: e.y, px: e.x, py: e.y, vx: Math.cos(ba) * 178, vy: Math.sin(ba) * 178, dmg: Math.max(4, Math.round(e.dmg * 0.82)), r: 9.0, hitR: 7.8, color: '#ff4d6d', shape: 'blood_crescent', srcKey: e.variant || e.type });
        }
      }
    }
    return false;
  }

  if (!e.dashing && !(e.sigWindupT > 0) && !(e.venomWindupT > 0) && !(e.venomBreathT > 0) && !(e.beamWindupT > 0) && !(e.beamSweepT > 0)) {
    e.p2SkillT = (e.p2SkillT !== undefined ? e.p2SkillT : 3.2) - dt * paceMult;
    if (e.p2SkillT <= 0) {
      e.p2SkillT = 6.5;
      const v = e.variant || 'butcher';
      const isQuadIce = (v === 'frost_queen' || v === 'glacial_valkyrie');
      const isOctaGrid = (v === 'void_weaver' || v === 'shadow_stalker' || v === 'storm_siren');
      e.p2WindupMax = isOctaGrid ? 1.05 : (isQuadIce ? 0.96 : 0.88);
      e.p2WindupT = e.p2WindupMax;
      // 十字冰束初始角度自动与玩家错开 45° 象限中心，避免蓄力结束瞬间直接贴脸命中心脏位
      e.p2BaseA = isQuadIce ? (aimToPlayer + Math.PI * 0.25) : aimToPlayer;
      e.p2TargetX = player.x;
      e.p2TargetY = player.y;
      if (isQuadIce) {
        e.p2Kind = 'p2_absolute_zero';
        e.p2Label = '⚡ 二阶终式·绝对零度四翼星环';
      } else if (isOctaGrid) {
        e.p2Kind = 'p2_chrono_octa';
        e.p2Label = '⚡ 二阶终式·逆时米字断罪光网';
      } else if (v === 'mech_colossus' || v === 'pyro_lord' || v === 'golden_golem' || v === 'iron_warden') {
        e.p2Kind = 'p2_omega_storm';
        e.p2Label = '⚡ 二阶终式·末日熔核锯刃风暴';
      } else if (v === 'plague_empress' || v === 'venom_matriarch') {
        e.p2Kind = 'p2_twin_venom';
        e.p2Label = '⚡ 二阶终式·双龙万蛊毒息';
      } else if (v === 'solar_seraph' || v === 'abyss_devourer') {
        e.p2Kind = 'p2_eclipse_apocalypse';
        e.p2Label = '⚡ 二阶终式·黑日神罚天体崩落';
      } else {
        e.p2Kind = 'p2_crimson_prison';
        e.p2Label = '⚡ 二阶终式·绯夜八荒剑狱';
      }
      e.castLabel = e.p2Label;
      beep(480, 0.10, 'triangle', 0.055);
      addText(e.x, e.y - e.r - 24, e.p2Label + '!', '#ffd166', 15, 1.45, true);
    }
  }
  return false;
}

// ============================================================================
// 👑 六大守誓主宰【创新交互机制状态机】（告别单纯躲圈：决斗剑域见切破招 / 可破坏双生极光共鸣柱 / 逆时回溯锚点与断时阵 / 黑日引力奇点与晨曦庇护区 / 磁暴引力桩 / 万蛊共生母苞）
// ============================================================================
function tickBossArenaMechanic(e, dt, aimToPlayer, distP, enraged, bossMult) {
  if (!e || (e.type !== 'boss' && e.type !== 'special_boss') || !player || state !== 'wave') return false;
  if (!Number.isFinite(distP)) distP = Math.hypot(player.x - e.x, player.y - e.y);
  if (!Number.isFinite(aimToPlayer)) aimToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
  if (!Number.isFinite(bossMult)) bossMult = 1;
  const vId = e.variant || 'butcher';

  // 统计当前首领场上存活的共鸣阵眼棱柱（供减伤棱障与双柱冰弦连接使用）
  let pylonA = null, pylonB = null, pylonCnt = 0;
  if (typeof trees !== 'undefined') {
    for (let ti = 0; ti < trees.length; ti++) {
      const tr = trees[ti];
      if (tr && tr.isBossPylon && tr.owner === e && tr.hp > 0) {
        pylonCnt++;
        if (!pylonA) pylonA = tr;
        else if (!pylonB) pylonB = tr;
      }
    }
  }
  e._alivePylonCnt = pylonCnt;
  e._pylonShieldCnt = (vId === 'frost_queen' || vId === 'plague_empress') ? pylonCnt : 0;

  // 双生极光冰棱柱同时存在时，两柱之间拉起寒霜极光冰弦（碰触减速并受寒霜切割，击破任一柱即刻瓦解！）
  if (vId === 'frost_queen' && pylonA && pylonB) {
    e._tetherHitCd = Math.max(0, (e._tetherHitCd || 0) - dt);
    if (e._tetherHitCd <= 0) {
      const seg = pointSegClosest(player.x, player.y, pylonA.x, pylonA.y, pylonB.x, pylonB.y);
      if (seg.dSq <= (player.r + 7) * (player.r + 7)) {
        e._tetherHitCd = 0.52;
        if (!player.noSlow) player.chillSlowT = Math.max(player.chillSlowT || 0, 1.0);
        addText(player.x, player.y - 34, '❄️ 极光冰弦切割!', '#7dd3fc', 14, 0.85);
        hurtPlayer(Math.max(4, Math.round(e.dmg * 0.78)), true, e);
        if (state !== 'wave') return true;
      }
    }
  }

  // 1) 烬羽（butcher）：【血誓·宿命决斗剑域】进行态
  if (e.duelRing) {
    const dr = e.duelRing;
    dr.t -= dt;
    dr.bladeA = (dr.bladeA || 0) + dt * (enraged ? 2.65 : 2.25);
    dr._rimHitCd = Math.max(0, (dr._rimHitCd || 0) - dt);
    const dRing = Math.hypot(player.x - dr.x, player.y - dr.y);

    // 剑域外缘 2 柄游龙血刃高速环绕：擦碰环绕刃尖受创
    if (dr._rimHitCd <= 0) {
      for (let bk = 0; bk < 2; bk++) {
        const ba = dr.bladeA + bk * Math.PI;
        const bx = dr.x + Math.cos(ba) * dr.r;
        const by = dr.y + Math.sin(ba) * dr.r;
        if (Math.hypot(player.x - bx, player.y - by) <= player.r + 16) {
          dr._rimHitCd = 0.45;
          hurtPlayer(Math.max(4, Math.round(e.dmg * 0.85)), true, e);
          if (state !== 'wave') return true;
          break;
        }
      }
    }

    // 剑域中段触发一次【心眼·十字裂空斩】试炼（四角安全，引导走位见切）
    if (!dr.slashSpawned && dr.t <= dr.maxT * 0.62) {
      dr.slashSpawned = true;
      const sa = Math.atan2(player.y - dr.y, player.x - dr.x) + Math.PI * 0.25;
      triggerBossActionPose(e, 'slash', sa, 0.48, '#fb7185');
      for (let k = 0; k < 2; k++) {
        spawnHazard(dr.x, dr.y, 26, e.dmg * 0.96, 0.82, {
          color: '#fb7185', style: 'void_slash',
          angle: sa + k * (Math.PI * 0.5), halfLen: dr.r - 18, halfW: 13,
          srcKey: e.variant, bossOwner: e
        });
      }
    }

    // 若玩家逃出决斗剑域（超出 r + 24）：剑域碎裂，烬羽立刻锁定高速【违誓追魂一闪】！
    if (dRing > dr.r + 24) {
      e.duelRing = null;
      beep(240, 0.12, 'sawtooth', 0.06);
      if (rings.length < 40) rings.push({ x: dr.x, y: dr.y, r: dr.r, color: '#ff2a55', t: 0.28, maxT: 0.28 });
      addText(player.x, player.y - 40, '⚠️ 脱离决斗圈 · 违誓追魂斩!', '#ff4d6d', 15, 1.35, true);
      if (!e.dashing) {
        lockLinearDash(e, aimToPlayer, Math.min(430, Math.max(290, distP + 65)), 0.36, '#ff2a55', 'iai_slash');
        e.dashT = 0.36;
      }
    } else if (dr.t <= 0) {
      // 坚守决斗剑域至期满：见切破招成功！刷新玩家瞬步、赋予攻速移速增益并令烬羽陷入长破绽！
      e.duelRing = null;
      e.exposeT = Math.max(e.exposeT || 0, 2.25);
      player.dashCd = 0;
      player.dashHasteT = Math.max(player.dashHasteT || 0, 2.2);
      beep(760, 0.12, 'triangle', 0.065);
      if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 145, color: '#72efdd', t: 0.32, maxT: 0.32, kind: 'hex' });
      addText(player.x, player.y - 42, '⚔️ 决斗见切成功！瞬步刷新 + 首领破防!', '#72efdd', 15, 1.65, true);
    }
  }

  // 2) 伽蓝（void_weaver）：【逆钟·时空回溯锚点 + 断时解锚阵】进行态
  if (e.chronoAnchor) {
    const ca = e.chronoAnchor;
    ca.t -= dt;
    ca.spin = (ca.spin || 0) + dt * 3.4;
    // 玩家踏入青金【断时解锚阵】：斩断时间锁链，反噬伽蓝暴露破绽！
    if (Math.hypot(player.x - ca.dx, player.y - ca.dy) <= ca.dr + player.r * 0.55) {
      e.chronoAnchor = null;
      e.exposeT = Math.max(e.exposeT || 0, 2.0);
      player.dashHasteT = Math.max(player.dashHasteT || 0, 1.8);
      beep(780, 0.11, 'triangle', 0.06);
      if (rings.length < 40) rings.push({ x: ca.dx, y: ca.dy, r: 88, color: '#72efdd', t: 0.30, maxT: 0.30, kind: 'hex' });
      if (lightnings.length < 36) {
        lightnings.push({ pts: [{ x: ca.dx, y: ca.dy }, { x: e.x, y: e.y }], color: '#72efdd', t: 0.28, maxT: 0.28 });
      }
      addText(player.x, player.y - 42, '✨ 断时解锚成功！逆钟反噬破防!', '#72efdd', 15, 1.55, true);
    } else if (ca.t <= 0) {
      // 未及时解锚：强制时空倒流拽回锚点 72% 位移，并在锚点降下十字次元裂空斩！
      e.chronoAnchor = null;
      const oldPx = player.x, oldPy = player.y;
      const nx = Math.max(player.r + 16, Math.min(WORLD.w - player.r - 16, oldPx + (ca.ax - oldPx) * 0.72));
      const ny = Math.max(player.r + 16, Math.min(WORLD.h - player.r - 16, oldPy + (ca.ay - oldPy) * 0.72));
      if (!isBlockedByTerrain(nx, ny, player.r)) {
        player.x = nx; player.y = ny;
      }
      beep(310, 0.14, 'sawtooth', 0.065);
      if (beams.length < 38) beams.push({ x1: oldPx, y1: oldPy, x2: player.x, y2: player.y, color: '#fde68a', t: 0.30, maxT: 0.30 });
      if (rings.length < 40) rings.push({ x: player.x, y: player.y, r: 82, color: '#c084fc', t: 0.30, maxT: 0.30, kind: 'hex' });
      addText(player.x, player.y - 42, '⏳ 时空强制回溯！速闪避裂空斩!', '#fde68a', 15, 1.35, true);
      for (let k = 0; k < 2; k++) {
        spawnHazard(ca.ax, ca.ay, 28, e.dmg * 1.04, 0.62, {
          color: '#c084fc', style: 'void_slash',
          angle: Math.PI * 0.25 + k * (Math.PI * 0.5), halfLen: 125, halfW: 13,
          srcKey: e.variant, bossOwner: e
        });
      }
    }
  }

  // 3) 日蚀圣女（solar_seraph）/ 饥饿黑影（abyss_devourer）/ 伽蓝二阶（void_weaver）：【超巨型黑洞引力奇点 & 晨曦庇护圣印】（含 1.0s 高能蓄力预警 + 进行态）
  const BLACK_HOLE_WINDUP_SEC = 1.0;
  if (e.eclipseSingularity) {
    const es = e.eclipseSingularity;
    if ((es.windupT || 0) > 0) {
      // 1.0 秒前置高能预警阶段：尚不施加任何吸力，提前标出黑洞范围与双生晨曦庇护印供玩家从容走位！
      es.windupT -= dt;
      es.spin = (es.spin || 0) + dt * 2.2;
      if (es.windupT <= 0) {
        es.windupT = 0;
        beep(250, 0.16, 'sawtooth', 0.068);
        shake = Math.max(shake, 3.6);
        if (rings.length < 44) {
          rings.push({ x: e.x, y: e.y, r: Math.round((es.r || 440) * 0.45), color: '#c084fc', t: 0.30, maxT: 0.30, kind: 'star' });
        }
      }
    } else {
      es.t -= dt;
      es.spin = (es.spin || 0) + dt * 4.1;
      const pullRange = es.pullRange || Math.max(760, (es.r || 440) + 320);
      const inSealNow = Math.hypot(player.x - es.s1x, player.y - es.s1y) <= es.safeR + player.r * 0.45
        || Math.hypot(player.x - es.s2x, player.y - es.s2y) <= es.safeR + player.r * 0.45;
      // 全场黑洞吸积引力（吸引力削弱 60%，即 ×0.40：保留清晰引力拖拽感同时确保玩家可凭走位与瞬步脱离或踏入晨曦庇护印）
      const BLACK_HOLE_PULL_MUL = 0.40;
      if (distP > 34 && distP < pullRange && !(player.dashT > 0)) {
        const prox = 1 - Math.min(1, distP / pullRange);
        const rawPullSpd = ((enraged ? 178 : 162) + prox * 68) * BLACK_HOLE_PULL_MUL;
        const pull = (inSealNow ? rawPullSpd * 0.15 : rawPullSpd) * dt;
        const swirl = (inSealNow ? 0 : 28 * BLACK_HOLE_PULL_MUL) * dt;
        const caP = Math.cos(aimToPlayer), saP = Math.sin(aimToPlayer);
        const px2 = Math.max(player.r + 10, Math.min(WORLD.w - player.r - 10, player.x - caP * pull + saP * swirl));
        const py2 = Math.max(player.r + 10, Math.min(WORLD.h - player.r - 10, player.y - saP * pull - caP * swirl));
        if (!isBlockedByTerrain(px2, py2, player.r)) {
          player.x = px2; player.y = py2;
        }
        player._bhPullT = inSealNow ? 0 : 0.14;
        player._bhSrcX = e.x;
        player._bhSrcY = e.y;
        if (!inSealNow) shake = Math.max(shake, 0.5 + prox * 0.6);
      }
      if (es.t <= 0) {
        e.eclipseSingularity = null;
        const inSeal1 = Math.hypot(player.x - es.s1x, player.y - es.s1y) <= es.safeR + player.r * 0.45;
        const inSeal2 = Math.hypot(player.x - es.s2x, player.y - es.s2y) <= es.safeR + player.r * 0.45;
        beep(175, 0.22, 'sawtooth', 0.085);
        shake = Math.max(shake, 8.2);
        if (rings.length < 44) {
          rings.push({ x: e.x, y: e.y, r: es.r, color: '#c084fc', t: 0.42, maxT: 0.42, kind: 'star' });
          rings.push({ x: e.x, y: e.y, r: Math.round(es.r * 0.62), color: '#fde68a', t: 0.34, maxT: 0.34, kind: 'hex' });
          rings.push({ x: es.s1x, y: es.s1y, r: es.safeR, color: '#fde68a', t: 0.32, maxT: 0.32, kind: 'hex' });
          rings.push({ x: es.s2x, y: es.s2y, r: es.safeR, color: '#fde68a', t: 0.32, maxT: 0.32, kind: 'hex' });
        }
        if (inSeal1 || inSeal2) {
          e.exposeT = Math.max(e.exposeT || 0, 2.35);
          player.chillSlowT = 0;
          player.dashHasteT = Math.max(player.dashHasteT || 0, 2.4);
          beep(820, 0.12, 'triangle', 0.06);
          addText(player.x, player.y - 44, '☀️ 晨曦庇护抵御黑洞坍缩！疾风赐福 + 首领破防!', '#fde68a', 15, 1.75, true);
        } else if (Math.hypot(player.x - e.x, player.y - e.y) <= es.r + player.r) {
          addText(player.x, player.y - 40, '🌑 未入庇护印 · 超巨黑洞奇点坍缩重创!', '#e0aaff', 16, 1.45, true);
          hurtPlayer(Math.round(e.dmg * 1.18), true, e);
          if (state !== 'wave') return true;
        }
      }
    }
  }

  // 触发冷却推进（蓄力大招/冲刺时不抢占节奏；召唤柱系首领在场上仍有柱子存活或处于击破后 20 秒真实冷却期内绝不提前重召）
  if (e.dashing || (e.sigWindupT || 0) > 0 || (e.p2WindupT || 0) > 0 || e.duelRing || e.chronoAnchor || e.eclipseSingularity) {
    return false;
  }
  const isPylonBoss = vId === 'frost_queen' || vId === 'mech_colossus' || vId === 'plague_empress';
  if (isPylonBoss && (pylonCnt > 0 || (e.pylonRespawnCd || 0) > 0)) {
    return false;
  }
  e.arenaMechCd = (e.arenaMechCd !== undefined ? e.arenaMechCd : 5.2) - dt * bossMult;
  if (e.arenaMechCd > 0) return false;

  if (vId === 'butcher') {
    e.arenaMechCd = enraged ? 8.2 : 9.6;
    const midX = Math.max(235, Math.min(WORLD.w - 235, (e.x + player.x) * 0.5));
    const midY = Math.max(235, Math.min(WORLD.h - 235, (e.y + player.y) * 0.5));
    // 确保开启瞬间玩家在决斗圈内部，公平给予完整见切博弈空间
    const dToMid = Math.hypot(player.x - midX, player.y - midY);
    const cx = dToMid > 165 ? Math.max(235, Math.min(WORLD.w - 235, player.x + (e.x - player.x) * 0.30)) : midX;
    const cy = dToMid > 165 ? Math.max(235, Math.min(WORLD.h - 235, player.y + (e.y - player.y) * 0.30)) : midY;
    e.duelRing = { x: cx, y: cy, r: 215, t: 3.3, maxT: 3.3, bladeA: aimToPlayer + Math.PI * 0.5, slashSpawned: false, _rimHitCd: 0.35 };
    triggerBossActionPose(e, 'slash', aimToPlayer, 0.55, '#fb7185');
    beep(440, 0.11, 'triangle', 0.055);
    if (rings.length < 40) rings.push({ x: cx, y: cy, r: 215, color: '#fb7185', t: 0.34, maxT: 0.34, kind: 'hex' });
    addText(cx, cy - 36, '⚔️ 血誓决斗剑域！圈内应战破防 · 逃圈遭追斩!', '#fb7185', 14, 1.75, true);
  } else if (vId === 'frost_queen') {
    if (pylonCnt === 0 && typeof spawnBossPylon === 'function') {
      const perp = aimToPlayer + Math.PI * 0.5;
      const s1 = spawnBossPylon(e, 'cryo_obelisk', e.x + Math.cos(perp) * 176, e.y + Math.sin(perp) * 176);
      const s2 = spawnBossPylon(e, 'cryo_obelisk', e.x - Math.cos(perp) * 176, e.y - Math.sin(perp) * 176);
      e.arenaMechCd = (s1 || s2) ? 0 : 3.0;
      triggerBossActionPose(e, 'cast_up', aimToPlayer, 0.60, '#72efdd');
      beep(560, 0.12, 'sine', 0.055);
      addText(e.x, e.y - e.r - 28, '❄️ 双生极光棱柱已升起 · 击破触发20s破防!', '#72efdd', 14.5, 1.85, true);
    } else {
      e.arenaMechCd = 3.0;
    }
  } else if (vId === 'void_weaver') {
    e._arenaCastSeq = (e._arenaCastSeq || 0) + 1;
    if (e.mythicPhase2 && (e._arenaCastSeq % 2 === 0)) {
      e.arenaMechCd = enraged ? 8.6 : 10.0;
      const perp = aimToPlayer + (Math.random() < 0.5 ? 1.05 : -1.05);
      const s1x = Math.max(125, Math.min(WORLD.w - 125, e.x + Math.cos(perp) * 218));
      const s1y = Math.max(125, Math.min(WORLD.h - 125, e.y + Math.sin(perp) * 218));
      const s2x = Math.max(125, Math.min(WORLD.w - 125, e.x - Math.cos(perp) * 218));
      const s2y = Math.max(125, Math.min(WORLD.h - 125, e.y - Math.sin(perp) * 218));
      e.eclipseSingularity = { windupT: BLACK_HOLE_WINDUP_SEC, maxWindupT: BLACK_HOLE_WINDUP_SEC, t: 3.20, maxT: 3.20, r: 430, pullRange: 760, safeR: 72, s1x, s1y, s2x, s2y, spin: 0 };
      triggerBossActionPose(e, 'cast_up', aimToPlayer, 1.0, '#c084fc');
      beep(520, 0.14, 'triangle', 0.06);
      shake = Math.max(shake, 2.2);
      addText(e.x, e.y - e.r - 28, '⚠️ 1.0s 预警 · 黑洞引力奇点即将开启!', '#fde68a', 15, 1.95, true);
    } else {
      e.arenaMechCd = enraged ? 8.4 : 9.8;
      const padAng = aimToPlayer + (Math.random() < 0.5 ? 1.15 : -1.15);
      const dx = Math.max(115, Math.min(WORLD.w - 115, player.x + Math.cos(padAng) * 152));
      const dy = Math.max(115, Math.min(WORLD.h - 115, player.y + Math.sin(padAng) * 152));
      e.chronoAnchor = { ax: player.x, ay: player.y, dx, dy, dr: 52, t: 2.65, maxT: 2.65, spin: 0 };
      triggerBossActionPose(e, 'cast_up', aimToPlayer, 0.56, '#fde68a');
      beep(610, 0.10, 'triangle', 0.055);
      if (rings.length < 40) rings.push({ x: player.x, y: player.y, r: 64, color: '#fde68a', t: 0.28, maxT: 0.28, kind: 'hex' });
      addText(player.x, player.y - 44, '⏳ 逆时锚点锁定！速踏青色【断时阵】解锚破防!', '#fde68a', 14, 1.75, true);
    }
  } else if (vId === 'solar_seraph' || vId === 'abyss_devourer') {
    e.arenaMechCd = enraged ? 7.8 : 9.2;
    const perp = aimToPlayer + (Math.random() < 0.5 ? 1.05 : -1.05);
    const s1x = Math.max(125, Math.min(WORLD.w - 125, e.x + Math.cos(perp) * 218));
    const s1y = Math.max(125, Math.min(WORLD.h - 125, e.y + Math.sin(perp) * 218));
    const s2x = Math.max(125, Math.min(WORLD.w - 125, e.x - Math.cos(perp) * 218));
    const s2y = Math.max(125, Math.min(WORLD.h - 125, e.y - Math.sin(perp) * 218));
    e.eclipseSingularity = { windupT: BLACK_HOLE_WINDUP_SEC, maxWindupT: BLACK_HOLE_WINDUP_SEC, t: 3.25, maxT: 3.25, r: 440, pullRange: 780, safeR: 72, s1x, s1y, s2x, s2y, spin: 0 };
    triggerBossActionPose(e, 'cast_up', aimToPlayer, 1.0, '#fde68a');
    beep(520, 0.14, 'triangle', 0.065);
    shake = Math.max(shake, 2.4);
    addText(e.x, e.y - e.r - 28, '⚠️ 1.0s 预警 · 超巨黑洞奇点即将开启!', '#fde68a', 15, 1.95, true);
  } else if (vId === 'mech_colossus') {
    if (pylonCnt === 0 && typeof spawnBossPylon === 'function') {
      const ma = aimToPlayer + (Math.random() < 0.5 ? 0.85 : -0.85);
      const s1 = spawnBossPylon(e, 'magnet_core', player.x + Math.cos(ma) * 145, player.y + Math.sin(ma) * 145);
      e.arenaMechCd = s1 ? 0 : 3.0;
      triggerBossActionPose(e, 'slam', aimToPlayer, 0.52, '#38bdf8');
      beep(310, 0.11, 'sawtooth', 0.05);
      addText(e.x, e.y - e.r - 28, '⚙️ 磁暴引力桩已部署 · 击破触发20s破防!', '#ff9f1c', 14.5, 1.85, true);
    } else {
      e.arenaMechCd = 3.0;
    }
  } else if (vId === 'plague_empress') {
    if (pylonCnt === 0 && typeof spawnBossPylon === 'function') {
      const perp = aimToPlayer + Math.PI * 0.5;
      const s1 = spawnBossPylon(e, 'venom_cocoon', e.x + Math.cos(perp) * 168, e.y + Math.sin(perp) * 168);
      const s2 = spawnBossPylon(e, 'venom_cocoon', e.x - Math.cos(perp) * 168, e.y - Math.sin(perp) * 168);
      e.arenaMechCd = (s1 || s2) ? 0 : 3.0;
      triggerBossActionPose(e, 'spin', aimToPlayer, 0.54, '#a3e635');
      beep(420, 0.10, 'triangle', 0.05);
      addText(e.x, e.y - e.r - 28, '🍃 万蛊共生母苞已培植 · 击破触发20s破防!', '#5ef29b', 14.5, 1.85, true);
    } else {
      e.arenaMechCd = 3.0;
    }
  }
  return false;
}

function updateEnemiesAndBosses(dt, effDmg, baseCrit, elemMul, dx, dy) {
  if (effDmg === undefined) effDmg = getEffectiveDmgMul();
  if (baseCrit === undefined) baseCrit = getEffectiveCrit();
  if (elemMul === undefined) elemMul = getElemMul();
  if (dx === undefined || dy === undefined) {
    if (player && player.moving && Number.isFinite(player.moveA)) {
      dx = Math.cos(player.moveA);
      dy = Math.sin(player.moveA);
    } else {
      dx = 0;
      dy = 0;
    }
  }
  // 预筛有效地面池沼地形（无地面池沼时百怪循环 0 地形遍历开销）
  _activePoolTerrains.length = 0;
  for (let tIdx = 0; tIdx < terrains.length; tIdx++) {
    const tr = terrains[tIdx];
    if (tr && tr.kind !== 'chasm') _activePoolTerrains.push(tr);
  }
  const poolTerrainCnt = _activePoolTerrains.length;

  // 怪物 AI 与三系元素异常（灼烧 DoT、冰冻禁锢/冻缓、剧毒叠层腐蚀）& 首领多维战术循环
  const globalSlow = Math.max(0.5, 1 - (player.enemySlow || 0));
  let activeFinalBosses = 0;
  for (let bi = 0; bi < enemies.length; bi++) {
    const be = enemies[bi];
    if (be && be.hp > 0 && be.type === 'boss') activeFinalBosses++;
  }
  const twinBossPace = activeFinalBosses > 1 ? 0.84 : 1;
  const dotRateMul = 1 + (player.dotHaste || 0);
  const canDotCrit = !!player.elemCrit;
  const dotCritMult = canDotCrit ? (1 + Math.max(0.35, (getEffectiveCritMult(1.95) - 1) * 0.5)) : 1;
  let prevActorKey = '';
  let prevActorObj = null;
  let prevEbLen = eBullets.length;
  try {
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (prevActorKey && eBullets.length > prevEbLen) {
      for (let bi = prevEbLen; bi < eBullets.length; bi++) {
        if (eBullets[bi]) {
          if (!eBullets[bi].srcKey) eBullets[bi].srcKey = prevActorKey;
          if (!eBullets[bi].bossOwner && prevActorObj && prevActorObj.type === 'boss') eBullets[bi].bossOwner = prevActorObj;
        }
      }
    }
    prevEbLen = eBullets.length;
    const e = enemies[i];
    if (!e || e.hp <= 0) { prevActorKey = ''; prevActorObj = null; continue; }
    _activeEnemyActor = e;
    prevActorKey = e.variant || e.type;
    prevActorObj = e;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e._flashCd > 0) e._flashCd -= dt;
    if (e._blkTxtCd > 0) e._blkTxtCd -= dt;
    if (e._lsTxtCd > 0) e._lsTxtCd -= dt;
    if (e._dodgeTxtCd > 0) e._dodgeTxtCd -= dt;
    if (e._pylonTxtCd > 0) e._pylonTxtCd -= dt;
    if (e._reactCd > 0) e._reactCd -= dt;
    if ((e.d5LastStandT || 0) > 0) {
      e.d5LastStandT -= dt;
      if (e.d5LastStandT <= 0) {
        e.d5LastStandT = 0;
        e.exposeT = Math.max(e.exposeT || 0, 1.85);
        beep(720, 0.14, 'triangle', 0.065);
        if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 145, color: '#72efdd', t: 0.34, maxT: 0.34, kind: 'hex' });
        addText(e.x, e.y - e.r - 24, '✨ 临死挣扎结束 · 不灭金身瓦解!', '#72efdd', 16, 1.65, true);
        announce('✨ 首领 10 秒临死挣扎结束！恐惧威压消散，无敌状态已解除，速速斩杀！', '#72efdd', 3.2);
      }
    }

    // 灼烧持续伤害（享余烬魔典 dotHaste 频率加速与绝对零度 elemCrit 暴击）
    if (e.burnT > 0) {
      e.burnT -= dt;
      e.burnTick -= dt * dotRateMul;
      if (e.burnTick <= 0) {
        e.burnTick = 0.45;
        const dCrit = canDotCrit && Math.random() < baseCrit * 0.75;
        hurtEnemy(e, e.burnDmg * 0.45 * (dCrit ? dotCritMult : 1), dCrit, null, true, { isDot: true, dotColor: '#ff9f1c', noProc: true });
        if (state !== 'wave') return false;
        if (e.hp <= 0) continue;
      }
    }
    // 剧毒持续腐蚀伤害（叠层结算，同步享 dotHaste 与 elemCrit）
    if (e.poisonT > 0 && e.poisonStacks > 0) {
      e.poisonT -= dt;
      e.poisonTick = (e.poisonTick || 0.25) - dt * dotRateMul;
      if (e.poisonTick <= 0) {
        e.poisonTick = 0.48;
        const dCrit = canDotCrit && Math.random() < baseCrit * 0.75;
        const pDmg = (2.3 + wave * 0.78) * e.poisonStacks * elemMul * effDmg * 0.48 * (dCrit ? dotCritMult : 1);
        hurtEnemy(e, pDmg, dCrit, null, true, { isDot: true, dotColor: '#a3e635', noProc: true });
        if (state !== 'wave') return false;
        if (e.hp <= 0) continue;
      }
      if (e.poisonT <= 0) e.poisonStacks = 0;
    }
    // 泥沼地形对怪物的轻微毒蚀（伤害与易伤均严格减半，主要针对玩家）
    if ((e.swampDotT || 0) > 0) {
      e.swampDotT -= dt;
      if (!(e.poisonT > 0 && e.poisonStacks > 0)) {
        e.swampDotTick = (e.swampDotTick || 0.25) - dt;
        if (e.swampDotTick <= 0) {
          e.swampDotTick = 0.48;
          const sDmg = (1.15 + wave * 0.39) * elemMul * effDmg * 0.48;
          hurtEnemy(e, sDmg, false, null, true, { isDot: true, dotColor: '#a3e635', noProc: true });
          if (state !== 'wave') return false;
          if (e.hp <= 0) continue;
        }
      }
    }

    if (e.chillT > 0) e.chillT -= dt;
    if (e.freezeT > 0) e.freezeT = Math.max(0, e.freezeT - dt);
    if (e.exposeT > 0) e.exposeT = Math.max(0, e.exposeT - dt);
    if (e.pylonBrokenT > 0) e.pylonBrokenT = Math.max(0, e.pylonBrokenT - dt);
    if (e.pylonRespawnCd > 0) e.pylonRespawnCd = Math.max(0, e.pylonRespawnCd - dt);
    if (e._vulnTxtCd > 0) e._vulnTxtCd = Math.max(0, e._vulnTxtCd - dt);
    if (e.sunderT > 0) e.sunderT = Math.max(0, e.sunderT - dt);
    if (e._touchCd > 0) e._touchCd = Math.max(0, e._touchCd - dt);
    if (e._actPoseT > 0) e._actPoseT = Math.max(0, e._actPoseT - dt);

    const isBossUnit = e.type === 'boss' || e.type === 'special_boss';
    const eliteAspd = (!isBossUnit && e.type !== 'mini_boss' && e.elite && e.eliteKind === 'frenzy')
      ? (e.eliteAspdMul || 1.20)
      : 1.0;
    const isFrozenLocked = !isBossUnit && e.type !== 'mini_boss' && e.freezeT > 0;
    // 战场地形对怪物的伤害与减速减益严格减半（熔岩减速 -18%→-9% 且灼烧减半；泥沼减速 -38%→-19% 且毒蚀减半；冰面减速 -15%→-7.5%）
    let eTerrainSpd = 1;
    for (let tIdx = 0; tIdx < poolTerrainCnt; tIdx++) {
      const tr = _activePoolTerrains[tIdx];
      if (isPointInTerrain(tr, e.x, e.y, e.r * 0.38)) {
        if (tr.kind === 'lava') {
          eTerrainSpd = Math.min(eTerrainSpd, 0.91);
          if (!e.burnT || e.burnT < 0.45) {
            e.burnT = 0.70;
            e.burnDmg = Math.max(e.burnDmg || 0, (6 + wave * 1.4) * diff.hpMul);
            if (!e.burnTick || e.burnTick <= 0) e.burnTick = 0.25;
          }
        } else if (tr.kind === 'swamp') {
          eTerrainSpd = Math.min(eTerrainSpd, 0.81);
          if ((!e.swampDotT || e.swampDotT < 0.40) && !isBossUnit) {
            e.swampDotT = 0.75;
          }
        } else if (tr.kind === 'ice_sheet') {
          // 小怪踏入冷冻地形仅承受 20% 减速，绝不会被冰封禁锢
          eTerrainSpd = Math.min(eTerrainSpd, 0.80);
        }
      }
    }
    const terrainFactor = isBossUnit ? Math.max(0.91, eTerrainSpd) : eTerrainSpd;
    e._terrainSpdMul = terrainFactor;
    const freezeSlow = e.freezeT > 0 ? (isBossUnit ? 0.72 : 0.62) : 1;
    const exposeSlow = e.exposeT > 0 ? 0.68 : 1;
    const slowFactor = (e.chillT > 0 ? (isBossUnit ? 0.82 : 0.68) : 1) * freezeSlow * exposeSlow * globalSlow * terrainFactor;
    // 首领在蓄力或引导旋转十字激光 / 喷毒横扫 / 终式法阵 / 传送相位锚定期间原地驻足，确保预警清晰可读
    const isChannelingStationary = (isBossUnit || e.type === 'mini_boss') && (
      (e.beamWindupT || 0) > 0 ||
      (e.beamSweepT || 0) > 0 ||
      (e.venomWindupT || 0) > 0 ||
      (e.venomBreathT || 0) > 0 ||
      (e.sigWindupT || 0) > 0 ||
      (e.p2WindupT || 0) > 0 ||
      (e.tpWindupT || 0) > 0 ||
      !!e.eclipseSingularity
    );
    const curSpd = isFrozenLocked ? 0 : (isChannelingStationary ? e.spd * slowFactor * 0.10 : e.spd * slowFactor);

    if (!isFrozenLocked) {
      e.phase += dt * (e.type === 'swarmer' ? 18 : 7) * slowFactor;
    }
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    if (!isFrozenLocked) {
      e.faceA = e.dashing && e.dashAng !== undefined ? e.dashAng : (e.lockedAim !== undefined ? e.lockedAim : a);
    }
    const distP = Math.hypot(player.x - e.x, player.y - e.y);

    if (isFrozenLocked) {
      // ❄️ 冰封禁锢：普通与精英怪完全冻结停止移动与出招（引爆自爆虫仍保留物理位置）
    } else if (e.type === 'bomber') {
      if (!e.primed && distP < 58) primeBomber(e);
      if (e.primed) {
        e.fuseT -= dt;
        if (e.fuseT <= 0) {
          killEnemyRewards(e);
          triggerExplosion(e.x, e.y, e.blastR || 86, (34 + wave * 6) * diff.hpMul, true, e.dmg, '#ff4d6d');
          if (state !== 'wave') return false;
          continue;
        }
      } else {
        e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt;
      }
    } else if (e.type === 'boss' || (e.type === 'special_boss' && (e.variant === 'mech_colossus' || e.variant === 'plague_empress'))) {
      const enraged = (e.hp < e.maxHp * 0.55) || overtime || !!e.mythicPhase2;
      const lastStandAspd = (e.d5LastStandT || 0) > 0 ? 1.20 : 1.0;
      const bossMult = (enraged ? 1.15 : 1) * (e.mythicPhase2 ? 1.12 : 1) * twinBossPace * lastStandAspd;

      if (tickBossArenaMechanic(e, dt, a, distP, enraged, bossMult)) return false;
      if (tickBossVenomBreath(e, dt, a, bossMult)) return false;
      if (tickBossPhase2Skill(e, dt, a, bossMult)) return false;

      // 首领地形灾变改写（按首领元素属性改变局部地貌，取消原先千篇一律的通用外环与通用红圈轰炸，改为六大首领完全独立的招牌技能组！）
      e.terrainCd = (e.terrainCd !== undefined ? e.terrainCd : 6.8) - dt * bossMult;
      if (e.terrainCd <= 0) {
        e.terrainCd = e.mythicPhase2 ? 7.0 : 8.6;
        const tKind = e.variant === 'frost_queen'
          ? 'ice_sheet'
          : ((e.variant === 'mech_colossus' || e.variant === 'solar_seraph')
            ? 'lava'
            : (e.variant === 'void_weaver' ? 'chasm' : 'swamp'));
        const ta = Math.random() * Math.PI * 2, td = 115 + Math.random() * 115;
        spawnBossTerrain(tKind, e.x + Math.cos(ta) * td, e.y + Math.sin(ta) * td, 64);
      }

      // 六大主宰专属咏唱终极奥义（高辨识度地面几何预警 + 专属形态弹幕/光炮 + 1.45s 破绽窗口）
      if (e.sigSkillT === undefined) e.sigSkillT = 3.4;
      if ((e.sigWindupT || 0) > 0) {
        e.sigWindupT -= dt * lastStandAspd;
        if (e.sigWindupT <= 0) {
          e.sigWindupT = 0;
          e.castEndT = 1.15;
          e.exposeT = Math.max(e.exposeT || 0, 1.45);
          beep(245, 0.14, 'sawtooth', 0.065);
          const baseA = Number.isFinite(e.sigBaseA) ? e.sigBaseA : a;
          if (e.sigKind === 'frost_prism') {
            triggerBossActionPose(e, 'cast_up', baseA, 0.60, '#7dd3fc');
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 162, color: '#7dd3fc', t: 0.34, maxT: 0.34 });
            for (let k = 0; k < 12 && eBullets.length < 170; k++) {
              const ba = baseA + (k / 12) * Math.PI * 2;
              const spd = k % 2 === 0 ? 172 : 122;
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * spd, vy: Math.sin(ba) * spd, dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: 6.0, color: k % 2 === 0 ? '#7dd3fc' : '#e0f2fe', shape: k % 2 === 0 ? 'trident' : 'shard', chillPlayer: true });
            }
            for (let k = 0; k < 6; k++) {
              const ha = baseA + (k / 6) * Math.PI * 2;
              spawnHazard(e.x + Math.cos(ha) * 176, e.y + Math.sin(ha) * 176, 62, e.dmg * 1.08, 0.95, { color: '#38bdf8', style: 'frost_hex' });
            }
          } else if (e.sigKind === 'chrono_dial') {
            triggerBossActionPose(e, 'spin', baseA, 0.60, '#fde68a');
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 175, color: '#fde68a', t: 0.34, maxT: 0.34 });
            for (let k = 0; k < 12 && eBullets.length < 170; k++) {
              const ba = baseA + (k / 12) * Math.PI * 2;
              const spd = 128 + (k % 3) * 28;
              const isRewindBlade = (k % 3 === 0);
              eBullets.push({
                x: e.x, y: e.y, px: e.x, py: e.y,
                vx: Math.cos(ba) * spd, vy: Math.sin(ba) * spd,
                dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: 6.2,
                color: k % 2 === 0 ? '#fde68a' : '#c084fc',
                shape: isRewindBlade ? 'crescent' : 'lance',
                rewindAt: isRewindBlade ? 0.88 : 0,
                rewindOwner: isRewindBlade ? e : null,
                life: isRewindBlade ? 2.45 : undefined
              });
            }
            for (let k = 0; k < 3 && lightnings.length < 35; k++) {
              const la = baseA + (k / 3) * Math.PI * 2;
              lightnings.push({ pts: [{ x: e.x, y: e.y }, { x: e.x + Math.cos(la) * 210, y: e.y + Math.sin(la) * 210 }], color: '#fde68a', t: 0.28, maxT: 0.28 });
            }
          } else if (e.sigKind === 'eclipse_lances') {
            triggerBossActionPose(e, 'cast_up', baseA, 0.60, '#fde68a');
            const tx = Number.isFinite(e.sigTargetX) ? e.sigTargetX : player.x;
            const ty = Number.isFinite(e.sigTargetY) ? e.sigTargetY : player.y;
            if (rings.length < 40) rings.push({ x: tx, y: ty, r: 224, color: '#fde68a', t: 0.34, maxT: 0.34 });
            const lanceCnt = enraged ? 8 : 6;
            for (let k = 0; k < lanceCnt && eBullets.length < 170; k++) {
              const ba = baseA + (k / lanceCnt) * Math.PI * 2;
              const sx = Math.max(48, Math.min(WORLD.w - 48, tx + Math.cos(ba) * 232));
              const sy = Math.max(48, Math.min(WORLD.h - 48, ty + Math.sin(ba) * 232));
              const fireA = Math.atan2(ty - sy, tx - sx) + (k % 2 === 0 ? 0.20 : -0.20);
              addBurst(sx, sy, '#fde68a', 4, 90);
              eBullets.push({ x: sx, y: sy, vx: Math.cos(fireA) * 188, vy: Math.sin(fireA) * 188, dmg: Math.max(5, Math.round(e.dmg * 0.82)), r: 6.4, color: '#fde68a', shape: 'trident' });
            }
          } else if (e.sigKind === 'omega_cross_beam') {
            triggerBossActionPose(e, 'recoil', baseA, 0.58, '#fb923c');
            // 欧米茄：十字重型等离子歼灭主炮（4 向贯通激光炮轨，发射口外移避开体心重叠，随难度 D1 1.0x -> D5 +30% 延长臂长）
            const innerOff = (e.r || 42) + 18;
            const beamLen = Math.round(460 * (typeof getBossBeamLenMul === 'function' ? getBossBeamLenMul() : 1.0));
            for (let k = 0; k < 4; k++) {
              const ba = baseA + k * (Math.PI * 0.5);
              const bx1 = e.x + Math.cos(ba) * innerOff, by1 = e.y + Math.sin(ba) * innerOff;
              const bx2 = e.x + Math.cos(ba) * beamLen, by2 = e.y + Math.sin(ba) * beamLen;
              if (beams.length < 24) beams.push({ x1: bx1, y1: by1, x2: bx2, y2: by2, color: '#fb923c', t: 0.36, maxT: 0.36 });
              const seg = pointSegClosest(player.x, player.y, bx1, by1, bx2, by2);
              if (seg.dSq <= (player.r + 12) * (player.r + 12)) {
                hurtPlayer(Math.round(e.dmg * 1.15));
                if (state !== 'wave') return false;
              }
              const discA = ba + Math.PI * 0.25;
              if (eBullets.length < 170) {
                eBullets.push({ x: e.x, y: e.y, vx: Math.cos(discA) * 142, vy: Math.sin(discA) * 142, dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: 7.8, color: '#ffd166', shape: 'disc', rot: 0 });
              }
            }
            shake = Math.max(shake, 5.5);
          } else if (e.sigKind === 'venom_vortex') {
            triggerBossActionPose(e, 'spin', baseA, 0.58, '#6ee7b7');
            // 苍岚毒皇：万蛊翠岚风刃三叉阵
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 168, color: '#6ee7b7', t: 0.32, maxT: 0.32 });
            for (let k = 0; k < 10 && eBullets.length < 170; k++) {
              const ba = baseA + (k / 10) * Math.PI * 2;
              const isTri = k % 2 === 0;
              const spd = isTri ? 174 : 132;
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * spd, vy: Math.sin(ba) * spd, dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: isTri ? 6.2 : 7.5, color: isTri ? '#a3e635' : '#6ee7b7', shape: isTri ? 'trident' : 'crescent' });
            }
          } else {
            // butcher · 断刃·八荒血月斩（严格对齐地面预警方向数，全方向必保血月斩光与预烘焙血月刃波完整释放！）
            triggerBossActionPose(e, 'slash', baseA, 0.58, '#ff2a55');
            const ways = (e.hp / Math.max(1, e.maxHp) < 0.55 || enraged || e.mythicPhase2) ? 8 : 4;
            shake = Math.max(shake, 4.5);
            if (rings.length < 44) rings.push({ x: e.x, y: e.y, r: 164, color: '#ff2a55', t: 0.32, maxT: 0.32 });
            addBurst(e.x, e.y, '#fb7185', 14, 195);
            for (let k = 0; k < ways; k++) {
              const ba = baseA + (k / ways) * Math.PI * 2;
              pushBossSlash({ x: e.x, y: e.y, angle: ba, r: 168, color: '#ff2a55', coreColor: '#fde68a', mode: 'blood_moon', isBoss: true, t: 0.34, maxT: 0.34 });
              if (eBullets.length >= 215) eBullets.shift();
              eBullets.push({
                x: e.x, y: e.y, px: e.x, py: e.y,
                vx: Math.cos(ba) * 184, vy: Math.sin(ba) * 184,
                dmg: Math.max(4, Math.round(e.dmg * 0.82)),
                r: 9.2, hitR: 8.0, color: '#fb7185', shape: 'blood_crescent',
                srcKey: e.variant || e.type
              });
            }
          }
        }
      } else if (!e.dashing) {
        if (e.castEndT > 0) {
          e.castEndT -= dt;
          if (e.castEndT <= 0) e.castLabel = '';
        }
        const vId = e.variant || 'butcher';
        e.sigSkillT -= dt * bossMult;
        if (e.sigSkillT <= 0 && !(e.beamWindupT > 0) && !(e.beamSweepT > 0) && !(e.p2WindupT > 0)) {
          e.sigSkillT = enraged ? 6.2 : 7.6;
          e.sigMaxW = vId === 'mech_colossus' ? 0.98 : 0.90;
          e.sigWindupT = e.sigMaxW;
          // 欧米茄十字主炮初始与玩家错开 45° 象限，给近战留出充裕侧闪空间
          e.sigBaseA = vId === 'mech_colossus' ? (a + Math.PI * 0.25) : a;
          e.sigTargetX = player.x;
          e.sigTargetY = player.y;
          if (vId === 'frost_queen') {
            e.sigKind = 'frost_prism';
            e.castLabel = '❄️ 碎冕·六棱极光阵';
          } else if (vId === 'void_weaver') {
            e.sigKind = 'chrono_dial';
            e.castLabel = '⚙️ 星晷·十二刻逆时针';
          } else if (vId === 'solar_seraph') {
            e.sigKind = 'eclipse_lances';
            e.castLabel = '🌑 终焉·黑日圣枪阵';
          } else if (vId === 'mech_colossus') {
            e.sigKind = 'omega_cross_beam';
            e.castLabel = '🔥 欧米茄·十字歼灭炮';
          } else if (vId === 'plague_empress') {
            e.sigKind = 'venom_vortex';
            e.castLabel = '🍃 万蛊·翠岚龙卷阵';
          } else {
            e.sigKind = 'crimson_cross';
            e.castLabel = '⚔️ 断刃·八荒血月斩';
          }
          beep(420, 0.085, 'triangle', 0.048);
          addText(e.x, e.y - e.r - 22, e.castLabel + '!', '#fde68a', 15, 1.35, true);
        }
      }

      if (e.variant === 'frost_queen') {
        // 【碎冕霜女皇 · 艾丝特莉亚】机制特征：先导轨预警后缓旋的双翼/二阶四翼极光冰束（近战可从容顺时针伴行挥砍） + 寒渊三叉冰戟 + 六合冰牢
        if ((e.beamWindupT || 0) > 0) {
          e.beamWindupT -= dt * lastStandAspd;
          if (e.beamWindupT <= 0) {
            e.beamWindupT = 0;
            e.beamSweepT = e.beamSweepMaxT || 1.65;
            triggerBossActionPose(e, 'cast_up', e.beamSweepA || a, 0.56, '#7dd3fc');
            addText(e.x, e.y - e.r - 18, '❄️ 极光双翼冰束扫射!', '#7dd3fc', 14, 1.25);
            beep(520, 0.12, 'sine', 0.05);
          }
        } else if ((e.beamSweepT || 0) > 0) {
          e.beamSweepT -= dt;
          // 大幅下调十字/双翼旋转角速度（四翼仅 0.48 rad/s ≈ 27.5°/s，双翼 0.56~0.66 rad/s），近战在 140px 处线速度仅 ~70px/s，可轻松边走边砍
          const sweepSpd = e.beamSweepQuad ? 0.48 : (enraged ? 0.66 : 0.56);
          e.beamSweepA = (e.beamSweepA || 0) + dt * sweepSpd;
          e._beamHitCd = Math.max(0, (e._beamHitCd || 0) - dt);
          const innerOff = (e.r || 42) + 20;
          const beamLenMul = typeof getBossBeamLenMul === 'function' ? getBossBeamLenMul() : 1.0;
          const bLen = Math.round((e.beamSweepQuad ? 380 : 345) * beamLenMul);
          const beamCnt = e.beamSweepQuad ? 4 : 2;
          for (let bi = 0; bi < beamCnt; bi++) {
            const ba = e.beamSweepA + (bi / beamCnt) * Math.PI * 2;
            const bx1 = e.x + Math.cos(ba) * innerOff, by1 = e.y + Math.sin(ba) * innerOff;
            const bx2 = e.x + Math.cos(ba) * bLen, by2 = e.y + Math.sin(ba) * bLen;
            const seg = pointSegClosest(player.x, player.y, bx1, by1, bx2, by2);
            if (e._beamHitCd <= 0 && seg.dSq <= (player.r + 9) * (player.r + 9)) {
              e._beamHitCd = 0.42;
              if (!player.noSlow) player.chillSlowT = Math.max(player.chillSlowT || 0, 0.75);
              hurtPlayer(Math.round(e.dmg * 0.90));
              if (state !== 'wave') return false;
            }
          }
          if (e.beamSweepT <= 0) {
            e.beamSweepQuad = false;
            e.exposeT = Math.max(e.exposeT || 0, 1.25);
          }
        } else if (e.dashing) {
          if (!advanceLinearDash(e, dt)) {
            finishLinearDash(e, enraged ? 3.4 : 4.1);
            // 冲刺落地先给出 0.55s 冰晶导轨虚线预警（且初始角度与玩家错开 ~52° 安全区），绝不无前摇糊近战一脸！
            e.beamSweepQuad = false;
            e.beamWindupMax = 0.55;
            e.beamWindupT = 0.55;
            e.beamSweepMaxT = 1.65;
            e.beamSweepA = a + 0.90;
            addText(e.x, e.y - e.r - 18, '❄️ 极光双翼冰束蓄力!', '#7dd3fc', 14, 1.25);
            beep(460, 0.09, 'triangle', 0.045);
          }
        } else {
          e.dashT -= dt * slowFactor * bossMult;
          if (e.dashT <= 0.50 && e.dashT > 0 && e.lockedAim === undefined) {
            lockLinearDash(e, a, 275, 0.50, '#72efdd', 'frost_rail');
          }
          if (e.dashT <= 0) {
            startLinearDash(e, a, 275, 0.36);
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 82, color: '#72efdd', t: 0.28, maxT: 0.28 });
            advanceLinearDash(e, dt);
          } else if (e.dashT > 0.50 && distP > 165) {
            e.x += Math.cos(a) * curSpd * bossMult * dt; e.y += Math.sin(a) * curSpd * bossMult * dt;
          }
        }
        // 专属弹幕：皇室寒渊三叉冰戟齐射（明显的三叉戟弹头！）
        e.shotT = (e.shotT || 1.7) - dt * bossMult;
        if (e.shotT <= 0) {
          e.shotT = enraged ? 1.75 : 2.15;
          triggerBossActionPose(e, 'thrust', a, 0.44, '#72efdd');
          const fan = enraged ? 2 : 1;
          for (let k = -fan; k <= fan && eBullets.length < 170; k++) {
            const ba = a + k * 0.22;
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 168, vy: Math.sin(ba) * 168, dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: 6.2, color: '#72efdd', shape: 'trident', chillPlayer: true });
          }
        }
        // 专属控场：围绕玩家构筑六边形寒冰牢笼（留有突围缺口，极具视觉辨识度）
        e.meteorT = (e.meteorT || 4.6) - dt * bossMult;
        if (e.meteorT <= 0) {
          e.meteorT = enraged ? 4.4 : 5.4;
          triggerBossActionPose(e, 'cast_up', a, 0.52, '#38bdf8');
          const gapIdx = Math.floor(Math.random() * 6);
          addText(player.x, player.y - 44, '🧊 寒霜六合冰牢! 寻缺口突围', '#7dd3fc', 14, 1.3);
          for (let b = 0; b < 6; b++) {
            if (b === gapIdx) continue;
            const ba = (b / 6) * Math.PI * 2 + e.phase * 0.25;
            spawnHazard(player.x + Math.cos(ba) * 128, player.y + Math.sin(ba) * 128, 56, e.dmg * 1.06, 1.18, { color: '#38bdf8', style: 'frost_hex' });
          }
        }
        e.sumT = (e.sumT || 6.6) - dt * bossMult;
        if (e.sumT <= 0 && enemies.length < 70) {
          e.sumT = enraged ? 6.4 : 7.6;
          spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 190)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 190)), 'frost_wisp');
        }
      } else if (e.variant === 'mech_colossus') {
        // 【熔核机械巨像 · 欧米茄】机制特征：扇形横扫加特林火舌 + 3×2 钢铁矩阵地毯轰炸 + 重装回旋锯盘阵
        e.x += Math.cos(a) * curSpd * bossMult * dt; e.y += Math.sin(a) * curSpd * bossMult * dt;
        e.shotT = (e.shotT || 2.0) - dt * bossMult;
        if (e.shotT <= 0) {
          e.shotT = enraged ? 2.3 : 2.9;
          e.burstLeft = enraged ? 9 : 7;
          e.burstCd = 0.02;
          e._sweepBaseA = a - 0.48;
          addText(e.x, e.y - e.r - 16, '🔥 熔核加特林横扫!', '#ff9f1c', 13, 1.1);
        }
        if (e.burstLeft > 0) {
          e.burstCd -= dt * lastStandAspd;
          if (e.burstCd <= 0) {
            e.burstCd = 0.10;
            const idxShot = (enraged ? 9 : 7) - e.burstLeft;
            e.burstLeft--;
            const sa = (e._sweepBaseA !== undefined ? e._sweepBaseA : a - 0.4) + idxShot * 0.13;
            triggerBossActionPose(e, 'recoil', sa, 0.18, '#ff9f1c');
            if (eBullets.length < 170) {
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 184, vy: Math.sin(sa) * 184, dmg: Math.max(4, Math.round(e.dmg * 0.76)), r: 6.2, color: '#ff9f1c', shape: 'fire' });
            }
          }
        }
        // 重踏释放 6 枚重型自转锯盘
        e.dashT = (e.dashT || 3.4) - dt * bossMult;
        if (e.dashT <= 0) {
          e.dashT = enraged ? 3.2 : 4.0;
          e.exposeT = Math.max(e.exposeT || 0, 1.1);
          triggerBossActionPose(e, 'slam', a, 0.54, '#fb5607');
          if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 126, color: '#fb5607', t: 0.3, maxT: 0.3 });
          const discCnt = enraged ? 8 : 6;
          for (let k = 0; k < discCnt && eBullets.length < 170; k++) {
            const ba = (k / discCnt) * Math.PI * 2 + e.phase * 0.35;
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 145, vy: Math.sin(ba) * 145, dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: 8.4, color: '#ffd166', shape: 'disc', rot: 0 });
          }
        }
        // 3×2 钢铁矩阵排炮地毯轰炸（整齐列阵推进，绝非随机散点）
        e.meteorT = (e.meteorT || 4.2) - dt * bossMult;
        if (e.meteorT <= 0) {
          e.meteorT = enraged ? 4.0 : 4.9;
          triggerBossActionPose(e, 'cast_up', a, 0.52, '#fb5607');
          const axisA = a;
          const perpA = axisA + Math.PI * 0.5;
          addText(e.x, e.y - e.r - 18, '🚀 钢铁矩阵排炮轰炸!', '#fb5607', 14, 1.3);
          for (let row = -1; row <= 1; row++) {
            for (let col = -1; col <= 1; col += 2) {
              const hx = player.x + Math.cos(axisA) * (row * 112) + Math.cos(perpA) * (col * 64);
              const hy = player.y + Math.sin(axisA) * (row * 112) + Math.sin(perpA) * (col * 64);
              spawnHazard(hx, hy, 58, e.dmg * 1.12, 1.05 + (row + 1) * 0.16, { color: '#fb5607', style: 'flame_pillar' });
            }
          }
        }
        e.sumT = (e.sumT || 6.8) - dt * bossMult;
        if (e.sumT <= 0 && enemies.length < 70) {
          e.sumT = enraged ? 6.4 : 7.8;
          spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 200)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 200)), 'spinner');
        }
      } else if (e.variant === 'void_weaver') {
        // 【逆时星晷主宰 · 伽蓝】机制特征：十字/X形次元裁决激光网锁定 + 双生残影折跃交叉弯刃 + 刀锋刺客召唤
        if (distP > 155) { e.x += Math.cos(a) * curSpd * bossMult * dt; e.y += Math.sin(a) * curSpd * bossMult * dt; }
        if ((e.laserGridT || 0) > 0) {
          e.laserGridT -= dt * lastStandAspd;
          if (e.laserGridT <= 0) {
            e.laserGridT = 0;
            const gx = e.laserGridX, gy = e.laserGridY, ga = e.laserGridA || 0;
            triggerBossActionPose(e, 'slash', ga, 0.50, '#c77dff');
            const span = Math.round(560 * (typeof getBossBeamLenMul === 'function' ? getBossBeamLenMul() : 1.0));
            beep(310, 0.16, 'sawtooth', 0.065);
            if (rings.length < 40) rings.push({ x: gx, y: gy, r: 95, color: '#e0aaff', t: 0.28, maxT: 0.28, fill: true });
            for (let k = 0; k < 2; k++) {
              const la = ga + k * (Math.PI * 0.5);
              const x1 = gx - Math.cos(la) * span, y1 = gy - Math.sin(la) * span;
              const x2 = gx + Math.cos(la) * span, y2 = gy + Math.sin(la) * span;
              if (beams.length < 24) beams.push({ x1, y1, x2, y2, color: '#c77dff', t: 0.34, maxT: 0.34 });
              const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
              const proj = Math.max(0, Math.min(1, ((player.x - x1) * (x2 - x1) + (player.y - y1) * (y2 - y1)) / l2));
              const px = x1 + proj * (x2 - x1), py = y1 + proj * (y2 - y1);
              if (Math.hypot(player.x - px, player.y - py) <= player.r + 15) {
                hurtPlayer(Math.round(e.dmg * 1.15));
                if (state !== 'wave') return false;
              }
            }
          }
        }
        e.meteorT = (e.meteorT || 3.6) - dt * bossMult;
        if (e.meteorT <= 0 && !(e.laserGridT > 0)) {
          e.meteorT = enraged ? 4.0 : 4.9;
          e.laserGridMaxT = 0.98;
          e.laserGridT = 0.98;
          e.laserGridX = player.x;
          e.laserGridY = player.y;
          e.laserGridA = ((e._gridFlip = !e._gridFlip) ? 0 : Math.PI * 0.25);
          triggerBossActionPose(e, 'cast_up', a, 0.48, '#e0aaff');
          addText(player.x, player.y - 44, e._gridFlip ? '🌌 十字次元光轨锁定!' : '🌌 X字次元光轨锁定!', '#e0aaff', 14, 1.15);
          beep(620, 0.08, 'triangle', 0.045);
        }
        // 第 12 层首领【逆时星晷主宰·伽蓝】双生残影相位折跃（带 D1->D5 阶梯递减落点预警，D5 预警时长为 D1 的 50%！）
        if ((e.tpWindupT || 0) > 0) {
          e.tpWindupT -= dt * lastStandAspd;
          if (e.tpWindupT <= 0) {
            e.tpWindupT = 0;
            e.exposeT = Math.max(e.exposeT || 0, 1.15);
            const oldX = e.x, oldY = e.y;
            if (rings.length < 40) rings.push({ x: oldX, y: oldY, r: 78, color: '#fde68a', t: 0.30, maxT: 0.30 });
            const oldAim = Math.atan2(player.y - oldY, player.x - oldX);
            for (let k = -1; k <= 1 && eBullets.length < 185; k++) {
              const ba = oldAim + k * 0.22;
              eBullets.push({ x: oldX, y: oldY, px: oldX, py: oldY, vx: Math.cos(ba) * 165, vy: Math.sin(ba) * 165, dmg: Math.max(4, Math.round(e.dmg * 0.74)), r: 6.8, color: '#fde68a', shape: 'crescent', rewindAt: 0.84, rewindOwner: e, life: 2.35, srcKey: e.variant || e.type, bossOwner: e });
            }
            e.x = Number.isFinite(e.tpDestX) ? e.tpDestX : e.x;
            e.y = Number.isFinite(e.tpDestY) ? e.tpDestY : e.y;
            e.tpDestX = undefined;
            e.tpDestY = undefined;
            beep(540, 0.08, 'triangle', 0.045);
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 86, color: '#c77dff', t: 0.32, maxT: 0.32, fill: true });
            const newAim = Math.atan2(player.y - e.y, player.x - e.x);
            triggerBossActionPose(e, 'slash', newAim, 0.50, '#c77dff');
            for (let k = -2; k <= 2 && eBullets.length < 185; k++) {
              const ba = newAim + k * 0.20;
              eBullets.push({ x: e.x, y: e.y, px: e.x, py: e.y, vx: Math.cos(ba) * 165, vy: Math.sin(ba) * 165, dmg: Math.max(4, Math.round(e.dmg * 0.74)), r: 6.8, color: '#c77dff', shape: 'crescent', srcKey: e.variant || e.type });
            }
          }
        } else {
          e.blinkT = (e.blinkT || 3.1) - dt * bossMult;
          if (e.blinkT <= 0 && !(e.sigWindupT > 0) && !(e.p2WindupT > 0)) {
            e.blinkT = enraged ? 3.1 : 3.9;
            const ta = Math.random() * Math.PI * 2, td = 175 + Math.random() * 55;
            e.tpOriginX = e.x;
            e.tpOriginY = e.y;
            e.tpDestX = Math.max(100, Math.min(WORLD.w - 100, player.x + Math.cos(ta) * td));
            e.tpDestY = Math.max(100, Math.min(WORLD.h - 100, player.y + Math.sin(ta) * td));
            e.tpWarnColor = '#c77dff';
            e.tpWindupMax = getBossTeleportWarnSec();
            e.tpWindupT = e.tpWindupMax;
            beep(660, 0.06, 'sine', 0.036);
            addText(e.tpDestX, e.tpDestY - 34, '⏳ 相位折跃落点!', '#e0aaff', 13, Math.min(1.1, e.tpWindupMax + 0.15));
          }
        }
        e.sumT = (e.sumT || 6.4) - dt * bossMult;
        if (e.sumT <= 0 && enemies.length < 70) {
          e.sumT = enraged ? 6.0 : 7.2;
          spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 200)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 200)), 'stalker');
        }
      } else if (e.variant === 'plague_empress') {
        // 【苍岚万蛊毒皇 · 青羽】机制特征：疾风掠影毒爆冲刺 + 五联剧毒三叉戟扇射 + 双螺旋毒液花瓣 + 分裂母体潮
        if (e.dashing) {
          if (!advanceLinearDash(e, dt)) {
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 92, color: '#6ee7b7', t: 0.26, maxT: 0.26 });
            spawnHazard(e.x, e.y, 72, e.dmg * 1.05, 1.05, { color: '#52b788' });
            finishLinearDash(e, enraged ? 3.0 : 3.7);
            e.exposeT = Math.max(e.exposeT || 0, 1.05);
          }
        } else {
          e.dashT = (e.dashT || 3.4) - dt * slowFactor * bossMult;
          if (e.dashT <= 0.46 && e.dashT > 0 && e.lockedAim === undefined) {
            lockLinearDash(e, a, 310, 0.46, '#6ee7b7', 'frost_rail');
          }
          if (e.dashT <= 0) {
            startLinearDash(e, a, 310, 0.34);
            triggerBossActionPose(e, 'thrust', a, 0.44, '#a3e635');
            spawnHazard(e.x, e.y, 66, e.dmg * 1.02, 1.05, { color: '#a3e635' });
            // 疾风起跳同步向玩家扇射 5 枚剧毒三叉戟！
            for (let k = -2; k <= 2 && eBullets.length < 170; k++) {
              const sa = a + k * 0.20;
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 176, vy: Math.sin(sa) * 176, dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: 6.0, color: '#a3e635', shape: 'trident' });
            }
            advanceLinearDash(e, dt);
          } else if (e.dashT > 0.46 && distP > 150) {
            const weaveA = a + Math.sin(e.phase * 0.5) * 0.45;
            e.x += Math.cos(weaveA) * curSpd * bossMult * dt; e.y += Math.sin(weaveA) * curSpd * bossMult * dt;
          }
        }
        // 双螺旋逆旋万蛊酸液弹幕
        e.shotT = (e.shotT || 1.75) - dt * bossMult;
        if (e.shotT <= 0) {
          e.shotT = enraged ? 1.65 : 2.05;
          triggerBossActionPose(e, 'spin', a, 0.46, '#52b788');
          const arms = enraged ? 6 : 4;
          for (let k = 0; k < arms && eBullets.length < 170; k++) {
            const ba1 = (k / arms) * Math.PI * 2 + e.phase * 0.85;
            const ba2 = (k / arms) * Math.PI * 2 - e.phase * 0.65;
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba1) * 152, vy: Math.sin(ba1) * 152, dmg: Math.max(4, Math.round(e.dmg * 0.72)), r: 5.6, color: '#52b788', shape: 'acid' });
            if (eBullets.length < 170) {
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba2) * 124, vy: Math.sin(ba2) * 124, dmg: Math.max(4, Math.round(e.dmg * 0.72)), r: 5.8, color: '#80ed99', shape: 'stinger' });
            }
          }
        }
        e.sumT = (e.sumT || 6.0) - dt * bossMult;
        if (e.sumT <= 0 && enemies.length < 70) {
          e.sumT = enraged ? 5.8 : 7.0;
          const sType = Math.random() < 0.50 ? 'splitter' : 'spore_mother';
          spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 200)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 200)), sType);
        }
      } else if (e.variant === 'solar_seraph') {
        // 【终焉日蚀圣女 · 曦】机制特征：阴阳双曜（先内圈耀斑远离 → 后外环黑日贴身）连携技 + 贯日冲锋黄金三叉戟 + 三连追猎天罚柱
        e.ringCd = (e.ringCd !== undefined ? e.ringCd : 4.5) - dt * bossMult;
        if (e.ringCd <= 0) {
          e.ringCd = e.mythicPhase2 ? 5.4 : 6.6;
          triggerBossActionPose(e, 'cast_up', a, 0.56, '#ffd166');
          // 第一拍：内圈实心耀斑核爆（逼迫玩家远离）
          spawnHazard(e.x, e.y, 142, e.dmg * 1.18, 1.02, { color: '#ff9f1c' });
          e._eclipseFollowT = 1.06;
          addText(e.x, e.y - e.r - 20, '☀️ 阴阳双曜·先远离耀斑，再贴近黑日!', '#ffd166', 14, 1.8);
        }
        if ((e._eclipseFollowT || 0) > 0) {
          e._eclipseFollowT -= dt;
          if (e._eclipseFollowT <= 0) {
            // 第二拍：外环黑日蚀灭风暴（内圈 118px 安全，奖励回身贴脸输出！）
            triggerBossActionPose(e, 'slam', a, 0.54, '#fde68a');
            spawnHazard(e.x, e.y, 262, e.dmg * 1.22, 1.08, { innerSafeR: 118, color: '#fde68a' });
            e.exposeT = 1.75;
            addText(e.x, e.y - e.r - 18, '🌑 黑日环蚀! 贴近内圈风眼反击!', '#fde68a', 14, 1.3);
          }
        }
        const seraphDist = enraged ? 380 : 350;
        if (e.dashing) {
          if (!advanceLinearDash(e, dt)) {
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 96, color: '#ffd166', t: 0.28, maxT: 0.28 });
            const fan = enraged ? 3 : 2;
            const aimNow = Math.atan2(player.y - e.y, player.x - e.x);
            triggerBossActionPose(e, 'thrust', aimNow, 0.46, '#ffd166');
            for (let k = -fan; k <= fan && eBullets.length < 170; k++) {
              const ba = aimNow + k * 0.21;
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 178, vy: Math.sin(ba) * 178, dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: 6.2, color: '#ffd166', shape: 'trident' });
            }
            finishLinearDash(e, enraged ? 2.45 : 2.95);
            e.exposeT = Math.max(e.exposeT || 0, 1.05);
          }
        } else {
          e.dashT -= dt * slowFactor * bossMult;
          if (e.dashT <= 0.54 && e.dashT > 0 && e.lockedAim === undefined) {
            lockLinearDash(e, a, seraphDist, 0.54, '#ffd166', 'spear_conduit');
          }
          if (e.dashT <= 0) {
            startLinearDash(e, a, seraphDist, 0.40);
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 80, color: '#ff9f1c', t: 0.26, maxT: 0.26 });
            advanceLinearDash(e, dt);
          } else if (e.dashT > 0.54 && distP > 135) {
            e.x += Math.cos(a) * curSpd * bossMult * dt; e.y += Math.sin(a) * curSpd * bossMult * dt;
          }
        }
        // 三连渐进式追猎天罚圣柱（沿玩家移动前方依次降下，迫使折返变向）
        e.meteorT = (e.meteorT || 4.2) - dt * bossMult;
        if (e.meteorT <= 0) {
          e.meteorT = enraged ? 3.8 : 4.8;
          triggerBossActionPose(e, 'cast_up', a, 0.52, '#ffd166');
          const stepX = (dx || Math.cos(a)) * 78, stepY = (dy || Math.sin(a)) * 78;
          for (let b = 0; b < 3; b++) {
            spawnHazard(player.x + stepX * b, player.y + stepY * b, 66, e.dmg * 1.12, 0.92 + b * 0.24, { color: '#ffd166', style: 'thunder_sigil' });
          }
        }
        e.sumT = (e.sumT || 6.6) - dt * bossMult;
        if (e.sumT <= 0 && enemies.length < 70) {
          e.sumT = enraged ? 6.2 : 7.6;
          spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 200)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 200)), 'magma_imp');
        }
      } else {
        // 【断刃守誓者 · 烬羽】机制特征：二/三段连环疾风居合冲刺 + 巨型绯红弯月剑气扇 + 贴身血眼环斩
        const butcherDist = enraged ? 365 : 335;
        if (e.dashing) {
          if (!advanceLinearDash(e, dt)) {
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 92, color: '#e63946', t: 0.26, maxT: 0.26 });
            const aimNow = Math.atan2(player.y - e.y, player.x - e.x);
            triggerBossActionPose(e, 'slash', aimNow, 0.44, '#fb7185');
            for (let k = -1; k <= 1 && eBullets.length < 170; k++) {
              const ba = aimNow + k * 0.28;
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 176, vy: Math.sin(ba) * 176, dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: 8.2, color: '#fb7185', shape: 'crescent' });
            }
            if ((e.comboDashesLeft || 0) > 0) {
              e.comboDashesLeft--;
              finishLinearDash(e, 0.44);
              lockLinearDash(e, aimNow, butcherDist * 0.88, 0.44, '#fb7185', 'iai_slash');
            } else {
              finishLinearDash(e, enraged ? 2.55 : 3.15);
              e.exposeT = Math.max(e.exposeT || 0, 1.35);
            }
          }
        } else {
          e.dashT -= dt * slowFactor * bossMult;
          if (e.dashT <= 0.54 && e.dashT > 0 && e.lockedAim === undefined) {
            e.comboDashesLeft = enraged ? 2 : 1; // 二连 / 狂暴三连疾风居合斩！
            lockLinearDash(e, a, butcherDist, 0.54, '#ff2a55', 'iai_slash');
            addText(e.x, e.y - e.r - 16, enraged ? '⚔️ 三连疾风居合!' : '⚔️ 二连疾风居合!', '#fb7185', 14, 1.2);
          }
          if (e.dashT <= 0) {
            const ca = startLinearDash(e, a, butcherDist, 0.38);
            triggerBossActionPose(e, 'slash', ca, 0.42, '#fb7185');
            if (slashes.length < 36) slashes.push({ x: e.x + Math.cos(ca) * 36, y: e.y + Math.sin(ca) * 36, angle: ca, r: 108, color: '#fb7185', mode: 'crescent', t: 0.22, maxT: 0.22 });
            advanceLinearDash(e, dt);
          } else if (e.dashT > 0.54) {
            e.x += Math.cos(a) * curSpd * bossMult * dt; e.y += Math.sin(a) * curSpd * bossMult * dt;
          }
        }
        // 烬羽专属：血眼环斩（内圈 112px 风眼安全，鼓励近战拼刀！）
        e.ringCd = (e.ringCd !== undefined ? e.ringCd : 4.8) - dt * bossMult;
        if (e.ringCd <= 0) {
          e.ringCd = enraged ? 5.0 : 6.0;
          triggerBossActionPose(e, 'spin', a, 0.56, '#fb7185');
          spawnHazard(e.x, e.y, 236, e.dmg * 1.15, 1.28, { innerSafeR: 112, color: '#fb7185' });
          e.exposeT = Math.max(e.exposeT || 0, 1.55);
          addText(e.x, e.y - e.r - 18, '🩸 血眼回天斩! 贴近内圈破招', '#fb7185', 14, 1.4);
        }
        e.sumT -= dt * bossMult;
        if (e.sumT <= 0 && enemies.length < 70) {
          e.sumT = enraged ? 6.0 : 7.4;
          const sType = Math.random() < 0.40 ? 'charger' : 'stalker';
          spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 220)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 220)), sType);
        }
      }
    } else if (e.type === 'mini_boss') {
      const mbPace = e.mythicPhase2 ? 1.12 : 1.0;
      if (tickBossVenomBreath(e, dt, a, mbPace)) return false;
      if (tickBossPhase2Skill(e, dt, a, mbPace)) return false;
      if (e.variant === 'pyro_lord') {
        // 炽焰重炮统领：四臂缓旋烈焰风车喷射（放缓射频与偏转角，留出近战切入象限空隙）+ 十字熔火柱轰击
        if (distP > 170) { e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt; }
        e.shotT = (e.shotT || 0.95) - dt * slowFactor;
        if (e.shotT <= 0) {
          e.shotT = 0.92;
          e._wheelA = (e._wheelA || 0) + 0.28;
          triggerBossActionPose(e, 'recoil', e._wheelA, 0.30, '#ff6b35');
          for (let k = 0; k < 4 && eBullets.length < 170; k++) {
            const sa = e._wheelA + k * (Math.PI * 0.5);
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 134, vy: Math.sin(sa) * 134, dmg: Math.max(4, Math.round(e.dmg * 0.70)), r: 5.6, color: '#ff6b35', shape: 'fire' });
          }
        }
        e.meteorT = (e.meteorT || 4.6) - dt;
        if (e.meteorT <= 0) {
          e.meteorT = 4.8;
          triggerBossActionPose(e, 'slam', a, 0.48, '#ff9f1c');
          addText(e.x, e.y - e.r - 14, '🔥 十字熔火裂地!', '#ff9f1c', 13, 1.1);
          for (let b = 0; b < 4; b++) {
            const ha = a + b * (Math.PI * 0.5);
            spawnHazard(player.x + Math.cos(ha) * 78, player.y + Math.sin(ha) * 78, 56, e.dmg * 1.06, 1.18, { color: '#ff9f1c', style: 'flame_pillar' });
          }
        }
      } else if (e.variant === 'shadow_stalker') {
        // 第 10 层首领【幽影雷刃统领】：瞬影侧袭闪现（带 D1->D5 阶梯递减落点预警，D5 预警时长为 D1 的 50%）+ X形双生弯月斩 + 高速雷刃突刺
        if ((e.tpWindupT || 0) > 0) {
          e.tpWindupT -= dt;
          if (e.tpWindupT <= 0) {
            e.tpWindupT = 0;
            const oldX = e.x, oldY = e.y;
            if (rings.length < 40) rings.push({ x: oldX, y: oldY, r: 54, color: '#72efdd', t: 0.20, maxT: 0.20 });
            e.x = Number.isFinite(e.tpDestX) ? e.tpDestX : e.x;
            e.y = Number.isFinite(e.tpDestY) ? e.tpDestY : e.y;
            e.tpDestX = undefined;
            e.tpDestY = undefined;
            beep(590, 0.07, 'triangle', 0.042);
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 68, color: '#72efdd', t: 0.24, maxT: 0.24, fill: true });
            const aimP = Math.atan2(player.y - e.y, player.x - e.x);
            triggerBossActionPose(e, 'slash', aimP, 0.46, '#72efdd');
            for (let k = -1; k <= 1; k += 2) {
              if (eBullets.length < 185) {
                const sa = aimP + k * 0.16;
                eBullets.push({ x: e.x, y: e.y, px: e.x, py: e.y, vx: Math.cos(sa) * 182, vy: Math.sin(sa) * 182, dmg: Math.max(4, Math.round(e.dmg * 0.78)), r: 7.4, color: '#72efdd', shape: 'crescent', srcKey: e.variant || e.type });
              }
            }
            addText(e.x, e.y - e.r - 14, '⚡ 幽影侧袭斩!', '#72efdd', 13, 1.0);
          }
        } else {
          e.skillT = (e.skillT || 3.4) - dt * slowFactor;
          if (!e.dashing && !(e.p2WindupT > 0) && e.skillT <= 0) {
            e.skillT = 4.2;
            const ba = a + (Math.random() < 0.5 ? 1.35 : -1.35);
            e.tpOriginX = e.x;
            e.tpOriginY = e.y;
            e.tpDestX = Math.max(90, Math.min(WORLD.w - 90, player.x + Math.cos(ba) * 165));
            e.tpDestY = Math.max(90, Math.min(WORLD.h - 90, player.y + Math.sin(ba) * 165));
            e.tpWarnColor = '#72efdd';
            e.tpWindupMax = getBossTeleportWarnSec();
            e.tpWindupT = e.tpWindupMax;
            beep(680, 0.06, 'sine', 0.035);
            addText(e.tpDestX, e.tpDestY - 32, '⏳ 幽影瞬袭落点!', '#72efdd', 13, Math.min(1.05, e.tpWindupMax + 0.15));
          }
        }
        if (e.dashing) {
          if (!advanceLinearDash(e, dt)) {
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 66, color: '#72efdd', t: 0.22, maxT: 0.22 });
            finishLinearDash(e, 2.35);
          }
        } else if (!((e.tpWindupT || 0) > 0)) {
          e.dashT -= dt * slowFactor;
          if (e.dashT <= 0.46 && e.dashT > 0 && e.lockedAim === undefined) {
            lockLinearDash(e, a, 300, 0.46, '#72efdd', 'iai_slash');
          }
          if (e.dashT <= 0) {
            startLinearDash(e, a, 300, 0.34);
            for (let k = 0; k < 6 && eBullets.length < 170; k++) {
              const ba = (k / 6) * Math.PI * 2 + e.phase;
              eBullets.push({ x: e.x, y: e.y, px: e.x, py: e.y, vx: Math.cos(ba) * 156, vy: Math.sin(ba) * 156, dmg: Math.max(4, Math.round(e.dmg * 0.70)), r: 6.2, color: '#72efdd', shape: 'lance' });
            }
            advanceLinearDash(e, dt);
          } else if (e.dashT > 0.46) {
            e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt;
          }
        }
      } else if (e.variant === 'venom_matriarch') {
        // 碧鳞剧毒统领：三联剧毒三叉戟扇射 + 腐蚀毒沼连环圈 + 孵化分裂软泥
        if (distP > 160) { e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt; }
        e.shotT = (e.shotT || 1.9) - dt * slowFactor;
        if (e.shotT <= 0) {
          e.shotT = 2.15;
          triggerBossActionPose(e, 'thrust', a, 0.42, '#80ed99');
          for (let k = -1; k <= 1 && eBullets.length < 170; k++) {
            const sa = a + k * 0.24;
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 165, vy: Math.sin(sa) * 165, dmg: Math.max(4, Math.round(e.dmg * 0.76)), r: 6.0, color: '#80ed99', shape: 'trident' });
          }
        }
        e.meteorT = (e.meteorT || 4.4) - dt;
        if (e.meteorT <= 0) {
          e.meteorT = 4.7;
          triggerBossActionPose(e, 'cast_up', a, 0.46, '#52b788');
          for (let b = 0; b < 2; b++) {
            spawnHazard(player.x + (Math.random() - 0.5) * 170, player.y + (Math.random() - 0.5) * 170, 68, e.dmg * 1.05, 1.22, { color: '#52b788', style: 'venom_mire' });
          }
          if (enemies.length < 70) {
            spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 140)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 140)), 'splitter');
          }
        }
      } else if (e.variant === 'glacial_valkyrie') {
        // 凛霜圣枪统领：极北寒霜圣枪双轨导轨冲锋 + 落点三联寒霜三叉戟 + 直线冰川推进（二阶段支援缓旋四翼极光束，友好适配近战）
        if ((e.beamWindupT || 0) > 0) {
          e.beamWindupT -= dt;
          if (e.beamWindupT <= 0) {
            e.beamWindupT = 0;
            e.beamSweepT = e.beamSweepMaxT || 1.65;
          }
        } else if ((e.beamSweepT || 0) > 0) {
          e.beamSweepT -= dt;
          e.beamSweepA = (e.beamSweepA || 0) + dt * (e.beamSweepQuad ? 0.48 : 0.56);
          e._beamHitCd = Math.max(0, (e._beamHitCd || 0) - dt);
          const innerOff = (e.r || 32) + 18;
          const bLen = Math.round(325 * (typeof getBossBeamLenMul === 'function' ? getBossBeamLenMul() : 1.0));
          const beamCnt = e.beamSweepQuad ? 4 : 2;
          for (let bi = 0; bi < beamCnt; bi++) {
            const ba = e.beamSweepA + (bi / beamCnt) * Math.PI * 2;
            const bx1 = e.x + Math.cos(ba) * innerOff, by1 = e.y + Math.sin(ba) * innerOff;
            const bx2 = e.x + Math.cos(ba) * bLen, by2 = e.y + Math.sin(ba) * bLen;
            const seg = pointSegClosest(player.x, player.y, bx1, by1, bx2, by2);
            if (e._beamHitCd <= 0 && seg.dSq <= (player.r + 9) * (player.r + 9)) {
              e._beamHitCd = 0.42;
              hurtPlayer(Math.round(e.dmg * 0.88));
              if (state !== 'wave') return false;
            }
          }
          if (e.beamSweepT <= 0) e.beamSweepQuad = false;
        }
        if (e.dashing) {
          if (!advanceLinearDash(e, dt)) {
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 74, color: '#48cae4', t: 0.24, maxT: 0.24 });
            const aimP = Math.atan2(player.y - e.y, player.x - e.x);
            for (let k = -1; k <= 1 && eBullets.length < 170; k++) {
              const ba = aimP + k * 0.22;
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 168, vy: Math.sin(ba) * 168, dmg: Math.max(4, Math.round(e.dmg * 0.76)), r: 6.0, color: '#72efdd', shape: 'trident', chillPlayer: true });
            }
            finishLinearDash(e, 2.45);
          }
        } else {
          e.dashT -= dt * slowFactor;
          if (e.dashT <= 0.50 && e.dashT > 0 && e.lockedAim === undefined) {
            lockLinearDash(e, a, 305, 0.50, '#48cae4', 'frost_rail');
          }
          if (e.dashT <= 0) {
            startLinearDash(e, a, 305, 0.36);
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 62, color: '#48cae4', t: 0.24, maxT: 0.24 });
            advanceLinearDash(e, dt);
          } else if (e.dashT > 0.50) {
            e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt;
          }
        }
        e.meteorT = (e.meteorT || 4.6) - dt;
        if (e.meteorT <= 0) {
          e.meteorT = 4.9;
          for (let step = 1; step <= 3; step++) {
            spawnHazard(e.x + Math.cos(a) * (step * 95), e.y + Math.sin(a) * (step * 95), 54, e.dmg * 1.06, 0.85 + step * 0.20, { color: '#38bdf8', style: 'frost_hex' });
          }
        }
      } else if (e.variant === 'iron_warden') {
        // 曜铁圣盾统领：十字重型旋转金锯盘 + 三段直线裂地重锤波
        if (distP > 130) { e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt; }
        e.shotT = (e.shotT || 2.1) - dt * slowFactor;
        if (e.shotT <= 0) {
          e.shotT = 2.45;
          triggerBossActionPose(e, 'spin', a, 0.44, '#ffd166');
          if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 78, color: '#ffd166', t: 0.24, maxT: 0.24 });
          for (let k = 0; k < 4 && eBullets.length < 170; k++) {
            const sa = a + k * (Math.PI * 0.5);
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 148, vy: Math.sin(sa) * 148, dmg: Math.max(4, Math.round(e.dmg * 0.76)), r: 7.8, color: '#ffd166', shape: 'disc', rot: 0 });
          }
        }
        e.meteorT = (e.meteorT || 4.4) - dt;
        if (e.meteorT <= 0) {
          e.meteorT = 4.8;
          triggerBossActionPose(e, 'slam', a, 0.50, '#ffd166');
          addText(e.x, e.y - e.r - 14, '🛡️ 重锤裂地三连击!', '#ffd166', 13, 1.1);
          for (let step = 1; step <= 3; step++) {
            spawnHazard(e.x + Math.cos(a) * (step * 88), e.y + Math.sin(a) * (step * 88), 60, e.dmg * 1.12, 0.82 + step * 0.22, { color: '#eab308', style: 'thunder_sigil' });
          }
        }
      } else if (e.variant === 'storm_siren') {
        // 苍雷风暴统领：雷光长距疾闪冲刺 + 五向苍雷三叉戟 + 三角电磁雷网
        if (e.dashing) {
          if (!advanceLinearDash(e, dt)) {
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 68, color: '#38bdf8', t: 0.22, maxT: 0.22 });
            finishLinearDash(e, 2.50);
          }
        } else {
          e.dashT -= dt * slowFactor;
          if (e.dashT <= 0.48 && e.dashT > 0 && e.lockedAim === undefined) {
            lockLinearDash(e, a, 295, 0.48, '#38bdf8', 'spear_conduit');
          }
          if (e.dashT <= 0) {
            startLinearDash(e, a, 295, 0.35);
            for (let k = -2; k <= 2 && eBullets.length < 170; k++) {
              const sa = a + k * 0.20;
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 166, vy: Math.sin(sa) * 166, dmg: Math.max(4, Math.round(e.dmg * 0.72)), r: 5.8, color: '#38bdf8', shape: 'trident' });
            }
            advanceLinearDash(e, dt);
          } else if (e.dashT > 0.48 && distP > 140) {
            e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt;
          }
        }
        e.meteorT = (e.meteorT || 4.6) - dt;
        if (e.meteorT <= 0) {
          e.meteorT = 4.9;
          const pts = [];
          for (let b = 0; b < 3; b++) {
            const ba = (b / 3) * Math.PI * 2 + e.phase * 0.3;
            const lx = player.x + Math.cos(ba) * 96, ly = player.y + Math.sin(ba) * 96;
            pts.push({ x: lx, y: ly });
            spawnHazard(lx, ly, 60, e.dmg * 1.05, 1.20, { color: '#38bdf8', style: 'thunder_sigil' });
          }
          if (lightnings.length < 35 && pts.length === 3) {
            lightnings.push({ pts: [pts[0], pts[1], pts[2], pts[0]], color: '#38bdf8', t: 0.34, maxT: 0.34 });
          }
        }
      } else {
        // 狂厄裂地统领：二连重甲蛮牛折返冲撞 + 绯红弯月裂地斩
        if (e.dashing) {
          if (!advanceLinearDash(e, dt)) {
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 78, color: '#f72585', t: 0.25, maxT: 0.25 });
            if ((e._vanguardCombo || 0) > 0) {
              e._vanguardCombo--;
              const reAim = Math.atan2(player.y - e.y, player.x - e.x);
              finishLinearDash(e, 0.46);
              lockLinearDash(e, reAim, 285, 0.46, '#f72585', 'battering_ram');
            } else {
              finishLinearDash(e, 2.75);
            }
          }
        } else {
          e.dashT -= dt * slowFactor;
          if (e.dashT <= 0.56 && e.dashT > 0 && e.lockedAim === undefined) {
            e._vanguardCombo = 1;
            lockLinearDash(e, a, 310, 0.56, '#f72585', 'battering_ram');
          }
          if (e.dashT <= 0) {
            startLinearDash(e, a, 310, 0.38);
            for (let k = -1; k <= 1 && eBullets.length < 170; k++) {
              const ba = a + k * 0.30;
              eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 162, vy: Math.sin(ba) * 162, dmg: Math.max(4, Math.round(e.dmg * 0.74)), r: 7.2, color: '#f72585', shape: 'crescent' });
            }
            advanceLinearDash(e, dt);
          } else if (e.dashT > 0.56) {
            e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt;
          }
        }
      }
    } else if (e.type === 'special_boss') {
      // 地图奇遇隐藏首领：彻底差异化技能演出（猩红居合一闪斩 / 黄金锯盘晶柱阵 / 噬界超巨黑洞引力奇点+剧毒龙息）
      const enraged = (e.hp < e.maxHp * 0.5) || overtime || !!e.mythicPhase2;
      const sbMult = (enraged ? 1.15 : 1) * (e.mythicPhase2 ? 1.12 : 1);

      if (tickBossArenaMechanic(e, dt, a, distP, enraged, sbMult)) return false;
      if (tickBossVenomBreath(e, dt, a, sbMult)) return false;
      if (tickBossPhase2Skill(e, dt, a, sbMult)) return false;

      e.terrainCd = (e.terrainCd !== undefined ? e.terrainCd : 6.8) - dt * sbMult;
      if (e.terrainCd <= 0) {
        e.terrainCd = e.mythicPhase2 ? 6.8 : 8.4;
        const tKind = e.variant === 'golden_golem' ? 'chasm' : (e.variant === 'crimson_lord' ? 'lava' : 'swamp');
        const ta = Math.random() * Math.PI * 2, td = 110 + Math.random() * 110;
        spawnBossTerrain(tKind, e.x + Math.cos(ta) * td, e.y + Math.sin(ta) * td, 60);
      }

      if (e.variant === 'crimson_lord') {
        // 猩红鲜血伯爵：疾速血影冲刺 + 五连猩红弯月血刃扇 + 贴身血环斩
        e.ringCd = (e.ringCd !== undefined ? e.ringCd : 4.8) - dt * sbMult;
        if (e.ringCd <= 0) {
          e.ringCd = 5.8;
          triggerBossActionPose(e, 'spin', a, 0.52, '#ff4d6d');
          spawnHazard(e.x, e.y, 228, e.dmg * 1.14, 1.26, { innerSafeR: 108, color: '#ff4d6d' });
          e.exposeT = 1.65;
          addText(e.x, e.y - e.r - 16, '🩸 猩红血环! 贴近风眼', '#ff4d6d', 14, 1.3);
        }
        if (e.dashing) {
          if (!advanceLinearDash(e, dt)) {
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 80, color: '#ff4d6d', t: 0.24, maxT: 0.24 });
            finishLinearDash(e, enraged ? 2.25 : 2.75);
            e.exposeT = Math.max(e.exposeT || 0, 0.95);
          }
        } else {
          e.dashT -= dt * slowFactor * sbMult;
          if (e.dashT <= 0.48 && e.dashT > 0 && e.lockedAim === undefined) {
            lockLinearDash(e, a, 335, 0.48, '#ff4d6d', 'iai_slash');
          }
          if (e.dashT <= 0) {
            startLinearDash(e, a, 335, 0.36);
            triggerBossActionPose(e, 'slash', a, 0.44, '#ff4d6d');
            if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 72, color: '#ff4d6d', t: 0.25, maxT: 0.25 });
            advanceLinearDash(e, dt);
          } else if (e.dashT > 0.48) {
            e.x += Math.cos(a) * curSpd * sbMult * dt; e.y += Math.sin(a) * curSpd * sbMult * dt;
          }
        }
        e.shotT = (e.shotT || 1.9) - dt * sbMult;
        if (e.shotT <= 0) {
          e.shotT = enraged ? 1.80 : 2.25;
          triggerBossActionPose(e, 'slash', a, 0.44, '#ff4d6d');
          const cnt = enraged ? 7 : 5;
          const half = (cnt - 1) / 2;
          for (let k = 0; k < cnt && eBullets.length < 170; k++) {
            const sa = a + (k - half) * 0.19;
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 168, vy: Math.sin(sa) * 168, dmg: Math.max(4, Math.round(e.dmg * 0.76)), r: 7.0, color: '#ff4d6d', shape: 'crescent' });
          }
        }
        e.sumT = (e.sumT || 6.0) - dt * sbMult;
        if (e.sumT <= 0 && enemies.length < 70) {
          e.sumT = 6.6;
          spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 170)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 170)), 'swarmer');
        }
      } else if (e.variant === 'golden_golem') {
        // 黄金晶石巨神：重装黄金锯盘与晶矛交错环 + 八方晶柱十字阵
        e.x += Math.cos(a) * curSpd * sbMult * dt; e.y += Math.sin(a) * curSpd * sbMult * dt;
        e.shotT = (e.shotT || 2.1) - dt * sbMult;
        if (e.shotT <= 0) {
          e.shotT = enraged ? 1.95 : 2.45;
          triggerBossActionPose(e, 'slam', a, 0.50, '#ffd166');
          if (rings.length < 40) rings.push({ x: e.x, y: e.y, r: 98, color: '#ffd166', t: 0.28, maxT: 0.28 });
          const cnt = enraged ? 10 : 8;
          for (let k = 0; k < cnt && eBullets.length < 170; k++) {
            const ba = (k / cnt) * Math.PI * 2 + e.phase * 0.45;
            const isDisc = k % 2 === 0;
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * (isDisc ? 140 : 165), vy: Math.sin(ba) * (isDisc ? 140 : 165), dmg: Math.max(4, Math.round(e.dmg * 0.76)), r: isDisc ? 7.8 : 6.0, color: '#ffd166', shape: isDisc ? 'disc' : 'trident', rot: 0 });
          }
        }
        e.meteorT = (e.meteorT || 4.2) - dt * sbMult;
        if (e.meteorT <= 0) {
          e.meteorT = enraged ? 3.8 : 4.6;
          triggerBossActionPose(e, 'cast_up', a, 0.48, '#ffd166');
          for (let b = 0; b < 4; b++) {
            const ha = (e.phase * 0.2) + b * (Math.PI * 0.5);
            spawnHazard(player.x + Math.cos(ha) * 86, player.y + Math.sin(ha) * 86, 62, e.dmg * 1.10, 1.22, { color: '#ffd166' });
          }
        }
        e.sumT = (e.sumT || 6.6) - dt * sbMult;
        if (e.sumT <= 0 && enemies.length < 70) {
          e.sumT = 7.4;
          spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 180)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 180)), 'shielder');
        }
      } else {
        // 深渊噬界者（零号容器 · 饥饿黑影）：黑洞引力牵引玩家（吸引力同步削弱 60% 即 ×0.40，且开启超巨黑洞奇点期间驻足锚定、不双重叠加） + 正反双旋虚空月刃弹幕 + 分裂泥召唤
        if (!e.eclipseSingularity && distP > 150) { e.x += Math.cos(a) * curSpd * sbMult * dt; e.y += Math.sin(a) * curSpd * sbMult * dt; }
        if (!e.eclipseSingularity && distP > 75 && distP < 360 && !(player.dashT > 0)) {
          const pull = 38 * 0.40 * sbMult * dt;
          const px2 = Math.max(player.r + 8, Math.min(WORLD.w - player.r - 8, player.x - Math.cos(a) * pull));
          const py2 = Math.max(player.r + 8, Math.min(WORLD.h - player.r - 8, player.y - Math.sin(a) * pull));
          if (!isBlockedByTerrain(px2, py2, player.r)) {
            player.x = px2; player.y = py2;
          }
        }
        e.shotT = (e.shotT || 1.8) - dt * sbMult;
        if (e.shotT <= 0) {
          e.shotT = enraged ? 1.60 : 2.0;
          triggerBossActionPose(e, 'spin', a, 0.46, '#c77dff');
          const cnt = enraged ? 8 : 6;
          for (let k = 0; k < cnt && eBullets.length < 170; k++) {
            const ba = (k / cnt) * Math.PI * 2 + e.phase * 0.85;
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 154, vy: Math.sin(ba) * 154, dmg: Math.max(4, Math.round(e.dmg * 0.76)), r: 6.8, color: '#c77dff', shape: 'crescent' });
          }
        }
        e.ringCd = (e.ringCd !== undefined ? e.ringCd : 4.6) - dt * sbMult;
        if (e.ringCd <= 0) {
          e.ringCd = 5.6;
          triggerBossActionPose(e, 'slam', a, 0.52, '#9d4edd');
          spawnHazard(e.x, e.y, 138, e.dmg * 1.15, 1.18, { color: '#9d4edd' });
          addText(e.x, e.y - e.r - 16, '🌌 奇点坍缩! 速撤离黑洞核心!', '#e0aaff', 14, 1.3);
        }
        e.sumT = (e.sumT || 6.4) - dt * sbMult;
        if (e.sumT <= 0 && enemies.length < 70) {
          e.sumT = 7.2;
          spawnWarning(Math.max(80, Math.min(WORLD.w - 80, e.x + (Math.random() - 0.5) * 180)), Math.max(80, Math.min(WORLD.h - 80, e.y + (Math.random() - 0.5) * 180)), 'splitter');
        }
      }
    } else if (e.type === 'charger') {
      // 眠冬寒枪破阵骑：尖角多级楔阵冲锋轨 + 冲刺收招前挑新月斩（告别单调不同颜色方框预警！）
      const chargeDist = 295;
      const windupSec = 0.54;
      if (e.dashing) {
        if (!advanceLinearDash(e, dt)) {
          const finA = e.dashAng !== undefined ? e.dashAng : a;
          if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: 68, color: '#fb923c', t: 0.22, maxT: 0.22 });
          if (slashes.length < 36) {
            slashes.push({ x: e.x + Math.cos(finA) * 26, y: e.y + Math.sin(finA) * 26, angle: finA, r: 66, color: '#fdba74', mode: 'crescent', t: 0.22, maxT: 0.22 });
          }
          const dxC = player.x - e.x, dyC = player.y - e.y, dC = Math.hypot(dxC, dyC);
          if (dC <= 76 + player.r) {
            let daC = Math.abs(Math.atan2(dyC, dxC) - finA) % (Math.PI * 2);
            if (daC > Math.PI) daC = Math.PI * 2 - daC;
            if (daC < 1.05) {
              hurtPlayer(Math.round(e.dmg * 0.92));
              if (state !== 'wave') return false;
            }
          }
          finishLinearDash(e, 2.25);
        }
      } else {
        e.dashT -= dt * slowFactor * eliteAspd;
        if (e.dashT <= windupSec && e.dashT > 0 && e.lockedAim === undefined) {
          lockLinearDash(e, a, chargeDist, windupSec, '#fb923c', 'horn_wedge');
        }
        if (e.dashT <= 0) {
          const ca = startLinearDash(e, a, chargeDist, 0.33);
          addSparks(e.x, e.y, ca + Math.PI, '#fdba74', 4);
          advanceLinearDash(e, dt);
        } else if (e.dashT > windupSec) {
          e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt;
        }
      }
    } else if (e.type === 'sand_worm') {
      // 蚀影潜渊骨蛇：彻底重做为【遁地潜行破土奇袭】（不再复用直线冲刺走廊！潜地黑影游走 -> 脚下八角裂纹破土冲出 + 斜十字骨刺迸射）
      if ((e.burrowWindup || 0) > 0) {
        e.burrowWindup -= dt * slowFactor * eliteAspd;
        if (e.burrowWindup <= 0) {
          e.burrowWindup = 0;
          e.burrowT = 0.62;
          e.burrowMaxT = 0.62;
          e._burrowA = a;
          if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: 44, color: '#f59e0b', t: 0.22, maxT: 0.22, kind: 'hex' });
          addBurst(e.x, e.y, '#78350f', 6, 95);
        }
      } else if ((e.burrowT || 0) > 0) {
        e.burrowT -= dt;
        e._burrowA = _lerpAngle(e._burrowA !== undefined ? e._burrowA : a, a, Math.min(1, dt * 3.8));
        const bSpd = curSpd * 2.38;
        e.x += Math.cos(e._burrowA) * bSpd * dt;
        e.y += Math.sin(e._burrowA) * bSpd * dt;
        if (Math.random() < dt * 18) {
          pushParticle({ x: e.x + (Math.random() - 0.5) * 18, y: e.y + (Math.random() - 0.5) * 18, vx: 0, vy: -14, r: 4.5, color: '#fbbf24', t: 0.24, maxT: 0.24 });
        }
        if (e.burrowT <= 0) {
          e.burrowT = 0;
          e.burrowCd = 2.35 + Math.random() * 0.45;
          beep(175, 0.09, 'sawtooth', 0.042);
          if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: 72, color: '#fbbf24', t: 0.28, maxT: 0.28, kind: 'hex' });
          addBurst(e.x, e.y, '#f59e0b', 9, 135);
          for (let k = 0; k < 3 && eBullets.length < 170; k++) {
            const ba = (k / 3) * Math.PI * 2 + 0.52;
            eBullets.push({
              x: e.x, y: e.y, px: e.x, py: e.y,
              vx: Math.cos(ba) * 140, vy: Math.sin(ba) * 140,
              life: 0.65,
              dmg: Math.max(3, Math.round(e.dmg * 0.78 * 1.10)), r: 5.94, hitR: 5.28, color: '#fde68a', shape: 'stinger'
            });
          }
          if (Math.hypot(player.x - e.x, player.y - e.y) <= 66 + player.r) {
            hurtPlayer(Math.round(e.dmg * 1.05));
            if (state !== 'wave') return false;
          }
        }
      } else {
        e.burrowCd = (e.burrowCd === undefined ? 2.1 : e.burrowCd) - dt * slowFactor * eliteAspd;
        if (e.burrowCd <= 0 && distP < 310 && distP > 64) {
          e.burrowWindup = 0.38;
          e._burrowA = a;
        } else {
          const slitherA = a + Math.sin(e.phase * 0.9) * 0.42;
          e.x += Math.cos(slitherA) * curSpd * dt; e.y += Math.sin(slitherA) * curSpd * dt;
        }
      }
    } else if (e.type === 'stalker') {
      // 刀锋疾行螳：凌厉 Z 字折线切角走位（每 0.42s 急折 ±50° 并迸射翠光火星） + 近身双镰十字斩
      e.zigT = (e.zigT === undefined ? 0.38 : e.zigT) - dt * slowFactor;
      if (e.zigT <= 0) {
        e.zigT = 0.38 + Math.random() * 0.14;
        e.zigDir = -(e.zigDir || 1);
        addSparks(e.x, e.y, a + Math.PI * 0.5 * e.zigDir, '#06d6a0', 2);
      }
      const zigAngle = distP < 58 ? a : (a + (e.zigDir || 1) * 0.88);
      const zigSpd = distP < 58 ? 1.28 : 1.35;
      e.faceA = zigAngle;
      e.x += Math.cos(zigAngle) * curSpd * zigSpd * dt;
      e.y += Math.sin(zigAngle) * curSpd * zigSpd * dt;
      e.slashCd = (e.slashCd || 0) - dt * slowFactor * eliteAspd;
      if (distP < 68 && e.slashCd <= 0) {
        e.slashCd = 0.92;
        if (slashes.length < 36) slashes.push({ x: e.x + Math.cos(a) * 14, y: e.y + Math.sin(a) * 14, angle: a, r: 46, color: '#06d6a0', mode: 'claw', t: 0.16, maxT: 0.16 });
      }
    } else if (e.type === 'sniper_bug') {
      // 【差异化远程 1 · 寒晶狙击蛛】：0.72s 高对比双层红外激光锁定 -> 射出渐进加速的醒目重型猩红贯日长矛（绝非看不清的小细针；近身被贴脸时后撤且开火后硬直，利好近战突袭）
      if ((e.recoilT || 0) > 0) e.recoilT -= dt * eliteAspd;
      if (e.aimA === undefined && !(e.recoilT > 0)) {
        if (distP > 365) { e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt; }
        else if (distP < 185) { e.x -= Math.cos(a) * curSpd * 0.82 * dt; e.y -= Math.sin(a) * curSpd * 0.82 * dt; }
      }
      e.shotT -= dt * slowFactor * eliteAspd;
      const aimWin = e.aimMaxT || 0.72;
      if (e.shotT <= aimWin && e.shotT > 0 && e.aimA === undefined) {
        if (distP < 95) {
          // 被近战贴脸压制时被迫重架枪口，给近战输出空间
          e.shotT = 0.95;
        } else {
          e.aimA = a;
        }
      } else if (e.shotT <= 0) {
        const sa = e.aimA !== undefined ? e.aimA : a;
        e.aimA = undefined;
        e.recoilT = 0.52;
        e.shotT = 3.05;
        addSparks(e.x + Math.cos(sa) * e.r, e.y + Math.sin(sa) * e.r, sa, '#ffd166', 4);
        if (eBullets.length < 170) {
          eBullets.push({
            x: e.x, y: e.y, px: e.x, py: e.y,
            vx: Math.cos(sa) * 158, vy: Math.sin(sa) * 158,
            accel: 190, maxSpd: 286,
            dmg: e.dmg, r: 6.0, hitR: 5.2, color: '#ff3366', shape: 'lance'
          });
        }
      }
    } else if (e.type === 'spinner') {
      // 【差异化远程 2 · 旋刃陀螺偶】：投掷双翼大弧度六刃鎏金涡轮盘（两侧外扩包抄，正中留出宽敞近战突脸走廊！）
      if (distP > 250) {
        e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt;
      } else {
        const oa = a + (e.orbitDir || 1) * 1.18;
        e.x += Math.cos(oa) * curSpd * 0.85 * dt; e.y += Math.sin(oa) * curSpd * 0.85 * dt;
      }
      e.shotT -= dt * slowFactor * eliteAspd;
      if (e.shotT <= 0) {
        e.shotT = 2.80;
        for (const side of [-1, 1]) {
          if (eBullets.length >= 170) break;
          const la = a + side * 0.54;
          eBullets.push({
            x: e.x, y: e.y, px: e.x, py: e.y,
            vx: Math.cos(la) * 148, vy: Math.sin(la) * 148,
            curve: -side * 0.76, life: 2.55,
            dmg: Math.max(3, Math.round(e.dmg * 0.90)), r: 7.8, hitR: 7.0, color: '#fbbf24', shape: 'disc', rot: 0
          });
        }
      }
    } else if (e.type === 'rad_scorpion') {
      // 【差异化远程 3 · 发条毒蝎】：尾针蓄芒迸射【雁形楔阵翠毒弯钩刺】（主锋快、两翼慢形成立体楔形毒芒，流线精致）
      if (distP > 235) {
        const scorpA = a + Math.sin(e.phase * 0.7) * 0.36;
        e.x += Math.cos(scorpA) * curSpd * dt; e.y += Math.sin(scorpA) * curSpd * dt;
      } else if (distP < 140) {
        e.x -= Math.cos(a) * curSpd * 0.45 * dt; e.y -= Math.sin(a) * curSpd * 0.45 * dt;
      }
      e.shotT -= dt * slowFactor * eliteAspd;
      if (e.shotT <= 0) {
        e.shotT = 2.55;
        addSparks(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, a, '#4ade80', 3);
        for (let k = -1; k <= 1 && eBullets.length < 170; k++) {
          const sa = a + k * 0.30;
          const spd = k === 0 ? 174 : 144;
          eBullets.push({
            x: e.x, y: e.y, px: e.x, py: e.y,
            vx: Math.cos(sa) * spd, vy: Math.sin(sa) * spd,
            dmg: Math.max(3, Math.round(e.dmg * 0.88)), r: 5.8, hitR: 5.2, color: '#4ade80', shape: 'stinger'
          });
        }
      }
    } else if (e.type === 'frost_wisp') {
      // 【差异化远程 4 · 眠冬冰冠亡灵】：双生反向正弦交织 S 波【寒霜六棱冰魄梭】（双螺旋蛇行轨迹，晶莹剔透易预判）
      if (distP > 235) {
        e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt;
      } else {
        const oa = a + (e.orbitDir || 1) * 1.15;
        e.x += Math.cos(oa) * curSpd * 0.72 * dt; e.y += Math.sin(oa) * curSpd * 0.72 * dt;
      }
      e.shotT -= dt * slowFactor * eliteAspd;
      if (e.shotT <= 0) {
        e.shotT = 2.85;
        const cnt = e.elite ? 2 : 1;
        for (let k = 0; k < cnt && eBullets.length < 170; k++) {
          const wSign = k === 0 ? 1 : -1;
          eBullets.push({
            x: e.x, y: e.y, px: e.x, py: e.y,
            baseAng: a, baseSpd: 148,
            vx: Math.cos(a) * 148, vy: Math.sin(a) * 148,
            waveAmp: 46, waveFreq: 6.4, waveSign: wSign, life: 3.1,
            dmg: e.dmg, r: 5.8, hitR: 5.2, color: '#38bdf8', shape: 'frost_bolt', chillPlayer: true
          });
        }
      }
    } else if (e.type === 'spore_mother') {
      // 【差异化远程 5 · 蚀忆魂灯龛】：取消同质化地面圆圈！改为架设旋转【紫晶十字裂变棱镜光轨】（四角象限留白安全）+ 4 向悬停星芒宝珠
      if (distP > 240) { e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt; }
      e.shotT -= dt * slowFactor * eliteAspd;
      if (e.shotT <= 0) {
        e.shotT = 3.25;
        if (distP > 92 && hazards.length < 28) {
          spawnHazard(player.x + (Math.random() - 0.5) * 56, player.y + (Math.random() - 0.5) * 56, 32, e.dmg, 1.30, {
            color: '#c084fc',
            style: 'cross_beam',
            angle: (e.phase || 0) * 0.4 + Math.PI * 0.25,
            rotSpd: 0.24,
            halfLen: e.elite ? 140 : 122,
            halfW: 12
          });
        }
        const rot0 = e.phase * 0.5;
        for (let k = 0; k < 4 && eBullets.length < 170; k++) {
          const ba = rot0 + k * (Math.PI * 0.5);
          eBullets.push({
            x: e.x, y: e.y, px: e.x, py: e.y,
            vx: Math.cos(ba) * 102, vy: Math.sin(ba) * 102,
            accel: -14, minSpd: 54, curve: 0.28, life: 3.3,
            dmg: Math.max(3, Math.round(e.dmg * 0.84)), r: 7.4, hitR: 6.2, color: '#e0aaff', shape: 'orb'
          });
        }
      }
    } else if (e.type === 'shooter') {
      // 【差异化远程 6 · 折光霜晶浮灵】：双轨外弧钳形弹（左右张开 ±20° 弧形包夹，正面 135px 中路完全留空，近战直线冲脸绝不被糊脸！）
      if (distP > 245) { e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt; }
      else if (distP < 145) { e.x -= Math.cos(a) * curSpd * 0.55 * dt; e.y -= Math.sin(a) * curSpd * 0.55 * dt; }
      else {
        const strafeA = a + Math.sin(e.phase * 0.45) * 1.25;
        e.x += Math.cos(strafeA) * curSpd * 0.52 * dt; e.y += Math.sin(strafeA) * curSpd * 0.52 * dt;
      }
      e.shotT -= dt * slowFactor * eliteAspd;
      if (e.shotT <= 0) {
        e.shotT = 2.50;
        const leadX = player.x + (player.moving ? dx * 10 : 0);
        const leadY = player.y + (player.moving ? dy * 10 : 0);
        const sa = Math.atan2(leadY - e.y, leadX - e.x);
        addSparks(e.x + Math.cos(sa) * e.r, e.y + Math.sin(sa) * e.r, sa, '#00f5d4', 2);
        for (const side of [-1, 1]) {
          if (eBullets.length >= 169) break;
          const la = sa + side * 0.34;
          eBullets.push({
            x: e.x, y: e.y, px: e.x, py: e.y,
            vx: Math.cos(la) * 162, vy: Math.sin(la) * 162,
            curve: -side * 0.46, life: 2.7,
            dmg: e.dmg, r: 6.2, hitR: 5.3, color: '#00f5d4', shape: 'acid'
          });
        }
        if ((wave >= 8 || e.elite) && eBullets.length < 169) {
          // 高波/精英追加一枚慢速重型尾随凝晶球，形成快慢双层节奏而非无脑散弹糊脸
          eBullets.push({
            x: e.x, y: e.y, px: e.x, py: e.y,
            vx: Math.cos(sa) * 112, vy: Math.sin(sa) * 112,
            life: 2.8,
            dmg: e.dmg, r: 6.8, hitR: 5.6, color: '#38bdf8', shape: 'orb'
          });
        }
      }
    } else if (e.type === 'splitter') {
      // 黑水三核裂影怪：纯近战“蓄蹲停顿—猛然蛙跃”脉冲逼近 + 击杀分裂 3 只高速子嗣（不再发射粘液弹，严控场上远程密度）
      if ((e.vx || e.vy) && (Math.abs(e.vx) > 4 || Math.abs(e.vy) > 4)) {
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.vx *= Math.max(0, 1 - dt * 6); e.vy *= Math.max(0, 1 - dt * 6);
      }
      e.hopT = (e.hopT === undefined ? 0.9 : e.hopT) - dt * slowFactor * eliteAspd;
      if (e.hopT <= 0) {
        e.hopT = 1.05 + Math.random() * 0.22;
        e.hopBurstT = 0.32;
        if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: e.r + 14, color: '#74c69d', t: 0.18, maxT: 0.18 });
      }
      let hopMul = 0.34;
      if ((e.hopBurstT || 0) > 0) {
        e.hopBurstT -= dt;
        hopMul = 2.48;
      }
      const hopA = a + Math.sin(e.phase * 0.5) * 0.24;
      e.x += Math.cos(hopA) * curSpd * hopMul * dt;
      e.y += Math.sin(hopA) * curSpd * hopMul * dt;
    } else if (e.type === 'mortar') {
      // 【差异化远程 7 · 发条星陨臼炮】：可见高抛榴弹升空弧线 + 八角机械火控准星 + 落地迸裂四向余烬霰片（告别凭空刷两个重复红圈！）
      if (distP > 360) { e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt; }
      else if (distP < 190) { e.x -= Math.cos(a) * curSpd * 0.65 * dt; e.y -= Math.sin(a) * curSpd * 0.65 * dt; }
      e.shotT -= dt * slowFactor * eliteAspd;
      if (e.shotT <= 0 && distP > 112) {
        e.shotT = 3.40;
        if (rings.length < 34) rings.push({ x: e.x, y: e.y, r: 34, color: '#ff9f1c', t: 0.22, maxT: 0.22, kind: 'star' });
        addSparks(e.x, e.y - 10, -Math.PI * 0.5, '#ffd166', 4);
        const leadX = player.moving ? dx * 44 : (Math.random() - 0.5) * 26;
        const leadY = player.moving ? dy * 44 : (Math.random() - 0.5) * 26;
        const rHaz = e.elite ? 74 : 64;
        spawnHazard(player.x + leadX, player.y + leadY, rHaz, e.dmg, 1.28, {
          color: '#ff9f1c',
          style: 'mortar_shell',
          srcX: e.x,
          srcY: e.y - 10,
          angle: a,
          shrapnel: (e.elite || wave >= 8) ? 4 : 0
        });
      }
    } else if (e.type === 'summoner') {
      // 【差异化远程 8 · 蚀日六翼唤灵师】：六芒唤灵法阵 + 次元裂空斜斩痕（线性裂缝，非圆圈！） + X 形双弧暗月镰
      if (distP > 320) { e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt; }
      else if (distP < 180) { e.x -= Math.cos(a) * curSpd * 0.7 * dt; e.y -= Math.sin(a) * curSpd * 0.7 * dt; }
      e.sumT -= dt * slowFactor * eliteAspd;
      if (e.sumT <= 0 && enemies.length < 48) {
        e.sumT = 5.4;
        if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: 62, color: '#c77dff', t: 0.36, maxT: 0.36, kind: 'hex' });
        spawnWarning(Math.max(70, Math.min(WORLD.w - 70, e.x + (Math.random() - 0.5) * 130)), Math.max(70, Math.min(WORLD.h - 70, e.y + (Math.random() - 0.5) * 130)), 'swarmer');
      }
      e.boltT = (e.boltT || 2.5) - dt * slowFactor * eliteAspd;
      if (e.boltT <= 0) {
        e.boltT = 3.05;
        e._castFlip = !e._castFlip;
        if (e._castFlip && distP > 88 && hazards.length < 28) {
          spawnHazard(player.x + (Math.random() - 0.5) * 40, player.y + (Math.random() - 0.5) * 40, 28, e.dmg, 1.08, {
            color: '#d8b4fe',
            style: 'void_slash',
            angle: a + (Math.random() < 0.5 ? 0.68 : -0.68),
            halfLen: e.elite ? 108 : 92,
            halfW: 14
          });
        }
        for (const side of [-1, 1]) {
          if (eBullets.length < 170) {
            const la = a + side * 0.36;
            eBullets.push({
              x: e.x, y: e.y, px: e.x, py: e.y,
              vx: Math.cos(la) * 136, vy: Math.sin(la) * 136,
              curve: -side * 0.48, life: 2.9,
              dmg: e.dmg, r: 7.0, hitR: 6.0, color: '#e0aaff', shape: 'crescent'
            });
          }
        }
      }
    } else if (e.type === 'healer') {
      // 【翠羽祝祷师】：告别单调绿圆圈，改为翡翠十字圣辉脉冲 + 可见实体翠绿治愈光链直连受伤友军！
      if (distP > 210) { e.x += Math.cos(a) * curSpd * dt; e.y += Math.sin(a) * curSpd * dt; }
      e.healT -= dt * slowFactor * eliteAspd;
      if (e.healT <= 0) {
        e.healT = 2.8;
        if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: 175, color: '#34d399', t: 0.36, maxT: 0.36, kind: 'cross_pulse' });
        let beamLinked = 0;
        for (let ai = 0; ai < enemies.length; ai++) {
          const ally = enemies[ai];
          if (!ally || ally === e || ally.hp <= 0 || ally.hp >= ally.maxHp) continue;
          const adx = ally.x - e.x, ady = ally.y - e.y;
          if (adx * adx + ady * ady <= 190 * 190) {
            const h = Math.round(ally.maxHp * 0.14 + 4);
            ally.hp = Math.min(ally.maxHp, ally.hp + h);
            if (beamLinked < 4 && beams.length < 34) {
              beams.push({ x1: e.x, y1: e.y - 6, x2: ally.x, y2: ally.y - 4, color: '#5ef29b', thin: true, t: 0.28, maxT: 0.28 });
              beamLinked++;
            }
            addText(ally.x, ally.y - ally.r, '+' + h, '#52b788', 12, 0.45, false);
          }
        }
      }
    } else {
      // 丰富近战生态：铁卫 160°半月横扫戟 / 冰骑寒枪直刺 / 双刃剑客旋风剑舞 / 勾魂镰卫瞬步暗镰 / 塔盾卫重盾猛击 / 重锤卫残血狂暴+90°扇形裂地锤 / 泰坦巨像十字地裂震波
      let moveMul = 1;
      let moveA = a;
      if (e.type === 'swarmer' || e.type === 'mini_slime') {
        if ((e.vx || e.vy) && (Math.abs(e.vx) > 4 || Math.abs(e.vy) > 4)) {
          e.x += e.vx * dt; e.y += e.vy * dt;
          e.vx *= Math.max(0, 1 - dt * 7); e.vy *= Math.max(0, 1 - dt * 7);
        }
        moveA = a + Math.sin(e.phase * 0.45) * 0.62;
      } else if (e.type === 'magma_imp') {
        moveA = a + Math.sin(e.phase * 0.85) * 0.55;
        if (Math.random() < dt * 8) {
          pushParticle({ x: e.x + (Math.random() - 0.5) * 10, y: e.y + 4, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, r: 3, color: '#ff9f1c', t: 0.22, maxT: 0.22 });
        }
      } else if (e.type === 'chaser') {
        e.lungeCd = (e.lungeCd || 1.7) - dt * slowFactor * eliteAspd;
        if (e.lungeCd <= 0 && distP < 148 && distP > 34) {
          e.lungeCd = 2.10;
          e.lungeBoostT = 0.28;
          e._lungeA = a;
          addSparks(e.x, e.y, a + Math.PI, '#ff758f', 3);
          if (slashes.length < 36) slashes.push({ x: e.x + Math.cos(a) * 16, y: e.y + Math.sin(a) * 16, angle: a, r: 38, color: '#ff758f', mode: 'spear', t: 0.18, maxT: 0.18 });
        }
        if (e.lungeBoostT > 0) {
          e.lungeBoostT -= dt;
          moveMul = 2.45;
          if (e._lungeA !== undefined) moveA = e._lungeA;
        } else {
          moveA = a + Math.sin(e.phase * 0.5) * 0.24;
        }
      } else if (e.type === 'iron_guard') {
        // 重戟守桥铁卫：稳步压迫 -> 近身亮起 160° 宽幅半月斩区横扫长戟
        if ((e.cleaveWindup || 0) > 0) {
          e.cleaveWindup -= dt * slowFactor * eliteAspd;
          moveMul = 0.12;
          moveA = e._cleaveA !== undefined ? e._cleaveA : a;
          if (e.cleaveWindup <= 0) {
            e.cleaveWindup = 0;
            const ca = e._cleaveA !== undefined ? e._cleaveA : a;
            const reach = 104;
            beep(180, 0.06, 'sawtooth', 0.036);
            if (slashes.length < 36) slashes.push({ x: e.x + Math.cos(ca) * 18, y: e.y + Math.sin(ca) * 18, angle: ca, r: reach, color: '#fb7185', mode: 'crescent', t: 0.22, maxT: 0.22 });
            if (distP <= reach + player.r - 4) {
              let da = Math.abs(Math.atan2(player.y - e.y, player.x - e.x) - ca) % (Math.PI * 2);
              if (da > Math.PI) da = Math.PI * 2 - da;
              if (da <= 1.38) {
                hurtPlayer(Math.round(e.dmg * 1.08));
                if (state !== 'wave') return false;
              }
            }
          }
        } else {
          e.cleaveCd = (e.cleaveCd || 2.1) - dt * slowFactor * eliteAspd;
          if (distP < 102 && e.cleaveCd <= 0) {
            e.cleaveCd = 2.45;
            e.cleaveWindup = 0.46;
            e.cleaveWindupMax = 0.46;
            e._cleaveA = a;
          }
        }
      } else if (e.type === 'frost_knight') {
        // 寒鸦冰枪死骑：中近距锁定细长寒冰刺线 -> 凌厉滑步直刺穿刺！
        if ((e.thrustWindup || 0) > 0) {
          e.thrustWindup -= dt * slowFactor * eliteAspd;
          moveMul = 0.10;
          moveA = e._thrustA !== undefined ? e._thrustA : a;
          if (e.thrustWindup <= 0) {
            e.thrustWindup = 0;
            const ta = e._thrustA !== undefined ? e._thrustA : a;
            const reach = 132;
            e._lungeThrustT = 0.20;
            beep(460, 0.06, 'triangle', 0.036);
            if (slashes.length < 36) slashes.push({ x: e.x + Math.cos(ta) * 18, y: e.y + Math.sin(ta) * 18, angle: ta, r: reach, color: '#7dd3fc', mode: 'spear', t: 0.20, maxT: 0.20 });
            const ex = e.x + Math.cos(ta) * reach, ey = e.y + Math.sin(ta) * reach;
            const seg = pointSegClosest(player.x, player.y, e.x, e.y, ex, ey);
            if (seg.dSq <= (16 + player.r - 3) * (16 + player.r - 3)) {
              if (!player.noSlow) player.chillSlowT = Math.max(player.chillSlowT || 0, 1.1);
              hurtPlayer(Math.round(e.dmg * 1.05));
              if (state !== 'wave') return false;
            }
          }
        } else if ((e._lungeThrustT || 0) > 0) {
          e._lungeThrustT -= dt;
          moveMul = 2.65;
          moveA = e._thrustA !== undefined ? e._thrustA : a;
        } else {
          e.thrustCd = (e.thrustCd || 1.9) - dt * slowFactor * eliteAspd;
          if (distP < 142 && distP > 36 && e.thrustCd <= 0) {
            e.thrustCd = 2.25;
            e.thrustWindup = 0.42;
            e.thrustWindupMax = 0.42;
            e._thrustA = a;
          }
        }
      } else if (e.type === 'blade_duelist') {
        // 发条双刃剑客：高速绕侧逼近 -> 0.34s 十字架刃蓄力提示 -> 开启黄金双刃剑刃风暴旋斩追击（留给近战侧闪节奏）！
        if ((e.whirlWindup || 0) > 0) {
          e.whirlWindup -= dt * slowFactor * eliteAspd;
          moveMul = 0.22;
          if (e.whirlWindup <= 0) {
            e.whirlWindup = 0;
            e.whirlT = 0.85;
            e.whirlSpin = e.whirlSpin || 0;
            e._whirlHitCd = 0;
          }
        } else if ((e.whirlT || 0) > 0) {
          e.whirlT -= dt;
          e.whirlSpin = (e.whirlSpin || 0) + dt * 15;
          moveMul = 1.36;
          e._whirlHitCd = Math.max(0, (e._whirlHitCd || 0) - dt);
          if (e._whirlHitCd <= 0 && distP <= e.r + player.r + 18) {
            e._whirlHitCd = 0.46 / eliteAspd;
            hurtPlayer(Math.round(e.dmg * 0.92));
            if (state !== 'wave') return false;
          }
        } else {
          e.whirlCd = (e.whirlCd || 2.1) - dt * slowFactor * eliteAspd;
          if (distP < 175 && e.whirlCd <= 0) {
            e.whirlCd = 2.85;
            e.whirlWindup = 0.34;
            e.whirlSpin = e.whirlSpin || 0;
            addSparks(e.x, e.y, a, '#fde68a', 4);
          } else if (distP > 95) {
            moveA = a + (e.orbitDir || 1) * 0.48;
          }
        }
      } else if (e.type === 'shadow_reaper') {
        // 蚀影勾魂镰卫：锁定玩家侧翼暗影瞬步折跃 -> 现身刹那挥出紫黑暗月环斩！
        if ((e.reapWindup || 0) > 0) {
          e.reapWindup -= dt * slowFactor * eliteAspd;
          moveMul = 0.08;
          if (e.reapWindup <= 0) {
            e.reapWindup = 0;
            if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: 36, color: '#a855f7', t: 0.20, maxT: 0.20 });
            e.x = Math.max(e.r + 12, Math.min(WORLD.w - e.r - 12, e._reapX || e.x));
            e.y = Math.max(e.r + 12, Math.min(WORLD.h - e.r - 12, e._reapY || e.y));
            pushOutOfChasms(e);
            const reapR = 72;
            beep(290, 0.07, 'sawtooth', 0.038);
            if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: reapR, color: '#c084fc', t: 0.24, maxT: 0.24, kind: 'hex' });
            if (slashes.length < 36) slashes.push({ x: e.x, y: e.y, angle: Math.atan2(player.y - e.y, player.x - e.x), r: reapR, color: '#d8b4fe', mode: 'crescent', t: 0.22, maxT: 0.22 });
            if (Math.hypot(player.x - e.x, player.y - e.y) <= reapR + player.r - 5) {
              hurtPlayer(Math.round(e.dmg * 1.05));
              if (state !== 'wave') return false;
            }
          }
        } else {
          e.blinkCd = (e.blinkCd || 2.6) - dt * slowFactor * eliteAspd;
          if (distP < 255 && distP > 75 && e.blinkCd <= 0) {
            e.blinkCd = 3.25;
            e.reapWindup = 0.42;
            e.reapWindupMax = 0.42;
            const flankA = a + (Math.random() < 0.5 ? 0.95 : -0.95);
            e._reapX = Math.max(64, Math.min(WORLD.w - 64, player.x - Math.cos(flankA) * 58));
            e._reapY = Math.max(64, Math.min(WORLD.h - 64, player.y - Math.sin(flankA) * 58));
          }
        }
      } else if (e.type === 'shielder') {
        // 重铠符盾守桥卫（紧凑高甲体型 r=28）：近身发动短距【重盾猛击】钝击震退！
        if ((e.bashWindup || 0) > 0) {
          e.bashWindup -= dt * slowFactor * eliteAspd;
          moveMul = 0.15;
          if (e.bashWindup <= 0) {
            e.bashWindup = 0;
            const bashA = e._bashA !== undefined ? e._bashA : a;
            e.x += Math.cos(bashA) * 22;
            e.y += Math.sin(bashA) * 22;
            if (rings.length < 36) rings.push({ x: e.x + Math.cos(bashA) * 16, y: e.y + Math.sin(bashA) * 16, r: 58, color: '#90e0ef', t: 0.22, maxT: 0.22 });
            if (Math.hypot(player.x - (e.x + Math.cos(bashA) * 14), player.y - (e.y + Math.sin(bashA) * 14)) <= 56 + player.r) {
              hurtPlayer(Math.round(e.dmg * 1.02));
              if (state !== 'wave') return false;
            }
          }
        } else {
          e.bashCd = (e.bashCd || 2.2) - dt * slowFactor * eliteAspd;
          if (distP < 78 && e.bashCd <= 0) {
            e.bashCd = 2.65;
            e.bashWindup = 0.36;
            e._bashA = a;
          }
        }
      } else if (e.type === 'brute') {
        // 镇塔黑曜重锤卫（r=39 高大狂战士）：生命低于 65% 红眼狂暴提速 1.36x + 前向 90° 扇形锥区裂地重锤（告别普通圆圈！）
        const berserk = e.hp < e.maxHp * 0.65;
        if (berserk) {
          moveMul = 1.36;
          if (Math.random() < dt * 7) pushParticle({ x: e.x + (Math.random() - 0.5) * 16, y: e.y - 8, vx: 0, vy: -22, r: 3.2, color: '#f43f5e', t: 0.22, maxT: 0.22 });
        }
        if (e.slamWindup > 0) {
          e.slamWindup -= dt * slowFactor * eliteAspd;
          moveMul = 0.12;
          moveA = e._slamA !== undefined ? e._slamA : a;
          if (e.slamWindup <= 0) {
            e.slamWindup = 0;
            const sa = e._slamA !== undefined ? e._slamA : a;
            const coneLen = 132;
            beep(140, 0.09, 'sawtooth', 0.045);
            if (slashes.length < 36) slashes.push({ x: e.x + Math.cos(sa) * 26, y: e.y + Math.sin(sa) * 26, angle: sa, r: coneLen * 0.92, color: '#c084fc', mode: 'crescent', t: 0.24, maxT: 0.24 });
            if (rings.length < 36) rings.push({ x: e.x + Math.cos(sa) * 58, y: e.y + Math.sin(sa) * 58, r: 68, color: '#c77dff', t: 0.24, maxT: 0.24, kind: 'star' });
            const dxB = player.x - e.x, dyB = player.y - e.y, dB = Math.hypot(dxB, dyB);
            if (dB <= coneLen + player.r - 4) {
              let daB = Math.abs(Math.atan2(dyB, dxB) - sa) % (Math.PI * 2);
              if (daB > Math.PI) daB = Math.PI * 2 - daB;
              if (daB <= 0.78 || dB <= 44 + player.r) {
                hurtPlayer(Math.round(e.dmg * 1.16));
                if (state !== 'wave') return false;
              }
            }
          }
        } else {
          e.bargeCd = (e.bargeCd === undefined ? 2.1 : e.bargeCd) - dt * slowFactor * eliteAspd;
          if ((e.bargeT || 0) <= 0 && e.bargeCd <= 0 && distP < 210 && distP > 92) {
            e.bargeCd = berserk ? 2.5 : 3.2;
            e.bargeT = 0.34;
            e._bargeA = a;
            addSparks(e.x, e.y, a + Math.PI, '#c77dff', 4);
          }
          if ((e.bargeT || 0) > 0) {
            e.bargeT -= dt;
            moveMul = 2.20;
            if (e._bargeA !== undefined) moveA = e._bargeA;
          }
          e.slamCd = (e.slamCd || 2.5) - dt * slowFactor * eliteAspd;
          if (distP < 112 && e.slamCd <= 0) {
            e.slamCd = berserk ? 2.25 : 2.75;
            e.slamWindup = 0.48;
            e.slamWindupMax = 0.48;
            e._slamA = a;
          }
        }
      } else if (e.type === 'juggernaut') {
        // 黑曜金锁镇狱像（r=54 山岳泰坦巨像，极沉缓 spd=34）：重踏轰出十字四向地裂冲击光轨 + 六方碎晶！
        if (e.slamWindup > 0) {
          e.slamWindup -= dt * slowFactor * eliteAspd;
          moveMul = 0.08;
          moveA = e._slamA !== undefined ? e._slamA : a;
          if (e.slamWindup <= 0) {
            e.slamWindup = 0;
            const sa = e._slamA !== undefined ? e._slamA : a;
            const innerOff = e.r * 0.74;
            const armLen = 168;
            beep(115, 0.12, 'sawtooth', 0.05);
            if (rings.length < 36) rings.push({ x: e.x, y: e.y, r: 96, color: '#e2e8f0', t: 0.28, maxT: 0.28, kind: 'hex' });
            for (let k = 0; k < 4; k++) {
              const ba = sa + k * (Math.PI * 0.5);
              const bx1 = e.x + Math.cos(ba) * innerOff, by1 = e.y + Math.sin(ba) * innerOff;
              const bx2 = e.x + Math.cos(ba) * armLen, by2 = e.y + Math.sin(ba) * armLen;
              if (beams.length < 32) beams.push({ x1: bx1, y1: by1, x2: bx2, y2: by2, color: '#f8fafc', t: 0.28, maxT: 0.28 });
              const seg = pointSegClosest(player.x, player.y, bx1, by1, bx2, by2);
              if (seg.dSq <= (14 + player.r - 3) * (14 + player.r - 3)) {
                hurtPlayer(Math.round(e.dmg * 1.15));
                if (state !== 'wave') return false;
              }
            }
            for (let k = 0; k < 4 && eBullets.length < 170; k++) {
              const ba = (k / 4) * Math.PI * 2 + sa + Math.PI * 0.25;
              eBullets.push({ x: e.x, y: e.y, px: e.x, py: e.y, vx: Math.cos(ba) * 124, vy: Math.sin(ba) * 124, dmg: Math.max(4, Math.round(e.dmg * 0.75)), r: 6.2, hitR: 5.4, color: '#f8fafc', shape: 'shard' });
            }
          }
        } else {
          e.slamCd = (e.slamCd || 3.1) - dt * slowFactor * eliteAspd;
          if (distP < 146 && e.slamCd <= 0) {
            e.slamCd = 3.55;
            e.slamWindup = 0.68;
            e.slamWindupMax = 0.68;
            e._slamA = a;
          }
        }
      }
      e.faceA = moveA;
      e.x += Math.cos(moveA) * curSpd * moveMul * dt; e.y += Math.sin(moveA) * curSpd * moveMul * dt;
    }

    // 软碰撞排斥（包围盒快速剪枝 + 平方距离预筛，120 怪同屏亦零卡顿）
    for (let j = i - 1; j >= 0; j--) {
      const o = enemies[j];
      if (!o || o.hp <= 0) continue;
      const minD = (e.r + o.r) * 0.82;
      const dx2 = o.x - e.x;
      if (dx2 >= minD || dx2 <= -minD) continue;
      const dy2 = o.y - e.y;
      if (dy2 >= minD || dy2 <= -minD) continue;
      const dSq = dx2 * dx2 + dy2 * dy2;
      if (dSq > 0.01 && dSq < minD * minD) {
        const d2 = Math.sqrt(dSq);
        const push = (minD - d2) * 0.32;
        const nx = dx2 / d2, ny = dy2 / d2;
        // 正在高速直线冲锋的单位直接撞开普通小怪，绝不被杂兵软碰撞顶回吞掉冲刺距离！
        if (e.dashing && !o.dashing) {
          o.x += nx * push * 2; o.y += ny * push * 2;
        } else if (o.dashing && !e.dashing) {
          e.x -= nx * push * 2; e.y -= ny * push * 2;
        } else {
          e.x -= nx * push; e.y -= ny * push;
          o.x += nx * push; o.y += ny * push;
        }
      }
    }

    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { e.x = WORLD.w * 0.5; e.y = WORLD.h * 0.5; }
    if (!isBossUnit && terrains.length > 0) pushOutOfChasms(e);
    e.x = Math.max(e.r + 6, Math.min(WORLD.w - e.r - 6, e.x));
    e.y = Math.max(e.r + 6, Math.min(WORLD.h - e.r - 6, e.y));
    if (!e.primed && !(e.burrowT > 0)) {
      const pdx = player.x - e.x, pdy = player.y - e.y, pHitR = player.r + e.r * 0.85 - 3;
      if (pdx * pdx + pdy * pdy < pHitR * pHitR && !(e._touchCd > 0)) {
        e._touchCd = (e.dashing ? 0.36 : 0.50) / eliteAspd;
        if (player.cls === 'bull') triggerBullNova();
        hurtPlayer(e.dmg);
        if (state !== 'wave') return false;
      }
    }
  }
  } finally {
    if (prevActorKey && eBullets.length > prevEbLen) {
      for (let bi = prevEbLen; bi < eBullets.length; bi++) {
        if (eBullets[bi]) {
          if (!eBullets[bi].srcKey) eBullets[bi].srcKey = prevActorKey;
          if (!eBullets[bi].bossOwner && prevActorObj && prevActorObj.type === 'boss') eBullets[bi].bossOwner = prevActorObj;
        }
      }
    }
    _activeEnemyActor = null;
  }
  compactAliveEnemies();
  return true;
}
