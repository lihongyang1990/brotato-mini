// ============================================================================
// 🎨 《烬塔残响：第999次救赎》极速精灵渲染管线（角色 / 分层域怪物 / 场景器物 / 兵装 / 立绘特写）
// 彻底删除原版土豆椭圆躯干、异星甲虫矢量与蘑菇树，100% 替换为预烘焙高清透明 Q 版贴图！
// ============================================================================

let _frameNow = 0;
function _syncNow() {
  return _frameNow || performance.now();
}

// 32 把守誓兵装高精矢量原画离线烘焙管线（192×192 超采样金属渐变 + 墨线描边 + 血槽/铭文/瞄具 + 5阶神话进化圣徽，彻底告别像素/色块感）
const _weaponSpriteCache = new Map();
const _weaponDataUrlCache = new Map();

function _wpnGrad(g, x0, y0, x1, y1, c0, c1, c2) {
  const grd = g.createLinearGradient(x0, y0, x1, y1);
  grd.addColorStop(0, c0);
  if (c2) {
    grd.addColorStop(0.5, c1);
    grd.addColorStop(1, c2);
  } else {
    grd.addColorStop(1, c1);
  }
  return grd;
}

function _wpnSpark(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - r);
  g.lineTo(x + r * 0.28, y - r * 0.28);
  g.lineTo(x + r, y);
  g.lineTo(x + r * 0.28, y + r * 0.28);
  g.lineTo(x, y + r);
  g.lineTo(x - r * 0.28, y + r * 0.28);
  g.lineTo(x - r, y);
  g.lineTo(x - r * 0.28, y - r * 0.28);
  g.closePath();
  g.fill();
}

function _wpnWrapGrip(g, x, y, w, h, baseDark, baseLight, bandCol) {
  g.fillStyle = _wpnGrad(g, x, y, x, y + h, baseLight, baseDark);
  g.beginPath(); g.roundRect(x, y, w, h, Math.min(3, h * 0.42)); g.fill(); g.stroke();
  g.strokeStyle = bandCol || 'rgba(246,211,121,0.55)';
  g.lineWidth = 1.05;
  const step = Math.max(3.2, w / 4.2);
  for (let gx = x + 2.2; gx < x + w - 1.8; gx += step) {
    g.beginPath(); g.moveTo(gx, y + 0.8); g.lineTo(gx + 1.8, y + h - 0.8); g.stroke();
  }
  g.strokeStyle = '#090710';
  g.lineWidth = 1.65;
}

function _resolveEvoColor(id, tier, evoId) {
  if (evoId && typeof WEAPONS !== 'undefined' && WEAPONS[id] && Array.isArray(WEAPONS[id].evos)) {
    for (let i = 0; i < WEAPONS[id].evos.length; i++) {
      if (WEAPONS[id].evos[i].id === evoId) return WEAPONS[id].evos[i].color || '#ff5c8a';
    }
  }
  if (tier >= 5) return '#ff5c8a';
  return (typeof TIER_COLORS !== 'undefined' && TIER_COLORS[tier]) ? TIER_COLORS[tier] : '#cbd5e1';
}

function _drawMythicCrest(g, accent, isEvo) {
  g.save();
  // 外层黑曜圣环与双翼残响纹章（纯线性渐变与多边形，0 radialGradient / 0 shadowBlur）
  g.globalAlpha = isEvo ? 0.26 : 0.18;
  g.fillStyle = accent;
  g.beginPath(); g.ellipse(3, 0, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = isEvo ? 0.72 : 0.48;
  g.strokeStyle = accent;
  g.lineWidth = 1.25;
  g.beginPath(); g.arc(2, 0, 21, -Math.PI * 0.78, Math.PI * 0.78); g.stroke();
  g.strokeStyle = '#fff3c4';
  g.lineWidth = 0.8;
  g.beginPath(); g.arc(2, 0, 17.5, -Math.PI * 0.55, Math.PI * 0.55); g.stroke();
  if (isEvo) {
    g.fillStyle = _wpnGrad(g, -18, -16, 12, 16, '#fff8dc', accent, '#3b0764');
    for (const sy of [-1, 1]) {
      g.beginPath();
      g.moveTo(-6, sy * 4);
      g.quadraticCurveTo(-18, sy * 15, -27, sy * 11);
      g.quadraticCurveTo(-17, sy * 8, -12, sy * 2.5);
      g.closePath();
      g.fill();
    }
    _wpnSpark(g, 24, -11, 4.2, '#fff9db');
    _wpnSpark(g, -16, -12, 3.2, accent);
  }
  g.restore();
}

function _paintWeaponArt(g, id, tier, evoId) {
  const accent = _resolveEvoColor(id, tier, evoId);
  const hiTier = tier >= 3;
  const isMythic = tier >= 5 || !!evoId;
  const trimGold = isMythic ? '#fff0b3' : (tier >= 4 ? '#f6d379' : (tier === 3 ? '#d8b4fe' : '#94a3b8'));
  const bladeHi = isMythic ? '#ffffff' : '#f8fafc';
  const bladeMid = tier >= 2 ? accent : '#cbd5e1';
  const bladeDark = '#334155';

  if (isMythic) {
    _drawMythicCrest(g, accent, !!evoId);
  } else if (tier >= 2) {
    g.save();
    g.globalAlpha = 0.12 + tier * 0.04;
    g.fillStyle = accent;
    g.beginPath(); g.ellipse(4, 0, 23, 11.5, 0, 0, Math.PI * 2); g.fill();
    if (tier === 4) {
      g.globalAlpha = 0.45;
      g.strokeStyle = '#f6d379';
      g.lineWidth = 1.0;
      g.beginPath(); g.arc(3, 0, 18, -1.2, 1.2); g.stroke();
    }
    g.restore();
  }

  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = 1.65;
  g.strokeStyle = '#090710';

  if (id === 'stick') {
    // 守夜灵木法杖：盘虬古木杖身 + 金箍束环 + 悬浮青焰魂晶
    g.fillStyle = _wpnGrad(g, -20, -5, 18, 6, '#b07d52', '#6f4528', '#3d2314');
    g.beginPath();
    g.moveTo(-22, -2.6); g.quadraticCurveTo(-4, -4.4, 14, -3.2);
    g.lineTo(19, -5.8); g.lineTo(20, -1.5); g.lineTo(15, 2.8);
    g.quadraticCurveTo(-3, 4.2, -22, 2.8); g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,235,200,0.35)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(-18, -1.2); g.quadraticCurveTo(-2, -2.5, 13, -1.4); g.stroke();
    g.strokeStyle = '#090710'; g.lineWidth = 1.5;
    g.fillStyle = trimGold;
    g.fillRect(-5, -3.8, 4.5, 7.6); g.strokeRect(-5, -3.8, 4.5, 7.6);
    const gemCol = isMythic ? accent : '#72efdd';
    g.fillStyle = _wpnGrad(g, 15, -8, 27, 5, '#ffffff', gemCol, '#0f766e');
    g.beginPath(); g.moveTo(16, 0); g.lineTo(21.5, -6.8); g.lineTo(28.5, 0); g.lineTo(21.5, 6.8); g.closePath();
    g.fill(); g.stroke();
    _wpnSpark(g, 22, -2, 3.2, '#ffffff');
  } else if (id === 'rock') {
    // 棱面符文陨星核：多切面黑曜晶石 + 内嵌发光裂隙铭文
    const coreCol = tier >= 2 ? accent : '#38bdf8';
    g.fillStyle = _wpnGrad(g, -14, -13, 16, 13, '#94a3b8', '#475569', '#1e293b');
    g.beginPath();
    g.moveTo(-13, -5); g.lineTo(-3, -13.5); g.lineTo(11, -11);
    g.lineTo(18, -1.5); g.lineTo(12, 11.5); g.lineTo(-4, 13); g.lineTo(-15, 4.5);
    g.closePath(); g.fill(); g.stroke();
    // 棱面受光切面
    g.fillStyle = 'rgba(248,250,252,0.28)';
    g.beginPath(); g.moveTo(-11, -4.5); g.lineTo(-3, -12); g.lineTo(8, -9.5); g.lineTo(1, -1); g.closePath(); g.fill();
    // 裂隙能量脉络
    g.strokeStyle = coreCol; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(-7, -2); g.lineTo(1, -4); g.lineTo(9, 2); g.moveTo(1, -4); g.lineTo(-1, 6); g.stroke();
    _wpnSpark(g, 2, -3, 3.5, '#ffffff');
  } else if (id === 'spear') {
    // 红缨破阵龙枪：乌木金属长杆 + 绯红流苏枪缨 + 双血槽菱形银枪尖
    g.fillStyle = _wpnGrad(g, -26, -3, -26, 3, '#a47148', '#582f0e');
    g.beginPath(); g.roundRect(-27, -2.3, 38, 4.6, 2); g.fill(); g.stroke();
    g.fillStyle = trimGold;
    g.fillRect(8, -3.6, 5, 7.2); g.strokeRect(8, -3.6, 5, 7.2);
    // 飘逸红缨
    g.fillStyle = isMythic ? accent : '#e11d48';
    g.beginPath();
    g.moveTo(10, -3.2); g.quadraticCurveTo(3, -10.5, -3, -8.2); g.quadraticCurveTo(4, -5, 9, -2.5);
    g.moveTo(10, 3.2); g.quadraticCurveTo(3, 10.5, -2, 8.0); g.quadraticCurveTo(4, 5, 9, 2.5);
    g.fill(); g.stroke();
    // 双切面枪刃
    g.fillStyle = _wpnGrad(g, 13, -7, 34, 7, bladeHi, bladeMid, bladeDark);
    g.beginPath();
    g.moveTo(13, 0); g.lineTo(17, -6.5); g.lineTo(34, 0); g.lineTo(17, 6.5); g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.82)'; g.lineWidth = 1.0;
    g.beginPath(); g.moveTo(15, 0); g.lineTo(30, 0); g.stroke();
  } else if (id === 'slingshot') {
    // 猎魔复合弹弓：精雕胡桃木护手 + 鎏金分叉臂 + 紧绷晶弦与弹丸
    _wpnWrapGrip(g, -18, -3.2, 14, 6.4, '#4a2c11', '#9c6644', trimGold);
    g.fillStyle = _wpnGrad(g, -5, -12, 14, 12, trimGold, '#7f4f24', '#3b210c');
    g.beginPath();
    g.moveTo(-5, -3.2); g.quadraticCurveTo(4, -4, 13, -12); g.lineTo(16, -9.2);
    g.quadraticCurveTo(7, -1.5, 2, 0);
    g.quadraticCurveTo(7, 1.5, 16, 9.2); g.lineTo(13, 12);
    g.quadraticCurveTo(4, 4, -5, 3.2); g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = isMythic ? accent : '#72efdd'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(14.5, -10.2); g.lineTo(-1, 0); g.lineTo(14.5, 10.2); g.stroke();
    g.strokeStyle = '#090710'; g.lineWidth = 1.4;
    g.fillStyle = _wpnGrad(g, -4, -3, 3, 3, '#ffffff', accent);
    g.beginPath(); g.arc(0.5, 0, 3.4, 0, Math.PI * 2); g.fill(); g.stroke();
  } else if (id === 'blowgun') {
    // 淬毒翠竹吹箭筒：节竹金箍长管 + 羽饰瞄准环 + 幽绿剧毒吹针
    g.fillStyle = _wpnGrad(g, -22, -3.5, 20, 3.5, '#34d399', '#059669', '#064e3b');
    g.beginPath(); g.roundRect(-23, -3.2, 42, 6.4, 3); g.fill(); g.stroke();
    for (const bx of [-12, 0, 11]) {
      g.fillStyle = trimGold;
      g.fillRect(bx, -3.9, 2.8, 7.8); g.strokeRect(bx, -3.9, 2.8, 7.8);
    }
    // 毒芒针尖
    const pCol = isMythic ? accent : '#a7f3d0';
    g.fillStyle = pCol;
    g.beginPath(); g.moveTo(19, -2.0); g.lineTo(31, 0); g.lineTo(19, 2.0); g.closePath(); g.fill(); g.stroke();
    _wpnSpark(g, 28, 0, 2.8, '#ecfdf5');
  } else if (id === 'knife') {
    // 暗影刺客短匕：宝石尾锤 + 缠柄护手 + 曲刃反光开血槽匕身
    _wpnWrapGrip(g, -18, -2.8, 11, 5.6, '#1e293b', '#475569', trimGold);
    g.fillStyle = trimGold;
    g.beginPath(); g.arc(-19.5, 0, 2.8, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-7, -7.8); g.lineTo(-3.5, -5.5); g.lineTo(-3.5, 5.5); g.lineTo(-7, 7.8); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = _wpnGrad(g, -3, -6, 26, 6, bladeHi, bladeMid, '#1e293b');
    g.beginPath();
    g.moveTo(-3.5, -4.8); g.lineTo(13, -5.2); g.quadraticCurveTo(22, -3.2, 27, 0.5);
    g.quadraticCurveTo(17, 5.8, -3.5, 4.6); g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = isMythic ? accent : '#f43f5e'; g.lineWidth = 1.15;
    g.beginPath(); g.moveTo(0, -0.5); g.lineTo(16, -0.2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(-2, -3.6); g.lineTo(22, -0.5); g.stroke();
  } else if (id === 'claws') {
    // 猩红猎魔钩爪：暗金护拳甲 + 三道新月弧光利刃
    g.fillStyle = _wpnGrad(g, -16, -10, -3, 10, '#4c1d95', '#1e1b4b');
    g.beginPath(); g.roundRect(-16, -9.5, 11, 19, 4); g.fill(); g.stroke();
    g.fillStyle = trimGold;
    for (const ky of [-5.5, 0, 5.5]) {
      g.beginPath(); g.arc(-5.5, ky, 2.1, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    const clawGrad = _wpnGrad(g, -4, -9, 26, 9, '#ffffff', tier >= 2 ? accent : '#fb7185', '#881337');
    for (const cy of [-6.2, 0, 6.2]) {
      g.fillStyle = clawGrad;
      g.strokeStyle = '#090710'; g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-4, cy - 2.1);
      g.quadraticCurveTo(12, cy - 4.4, 26 - Math.abs(cy) * 0.45, cy + 0.6);
      g.quadraticCurveTo(11, cy + 0.8, -4, cy + 1.9);
      g.closePath();
      g.fill(); g.stroke();
    }
  } else if (id === 'katana') {
    // 绯樱居合太刀：菱纹缠柄 + 镂空金锷 + 沸腾刃纹弧形长刀
    _wpnWrapGrip(g, -26, -2.6, 14, 5.2, '#0f172a', '#334155', '#f43f5e');
    g.fillStyle = trimGold;
    g.beginPath(); g.roundRect(-12.5, -7.2, 3.6, 14.4, 1.5); g.fill(); g.stroke();
    g.fillStyle = _wpnGrad(g, -9, -5, 34, 4, '#ffffff', tier >= 2 ? accent : '#fda4af', '#475569');
    g.beginPath();
    g.moveTo(-9, -3.2);
    g.quadraticCurveTo(13, -5.2, 35, -1.6);
    g.lineTo(31.5, 2.8);
    g.quadraticCurveTo(12, 1.8, -9, 2.6);
    g.closePath();
    g.fill(); g.stroke();
    // 居合沸腾刃纹 (Hamon)
    g.strokeStyle = 'rgba(255,255,255,0.86)'; g.lineWidth = 0.95;
    g.beginPath(); g.moveTo(-7, 0.4); g.quadraticCurveTo(4, -1.5, 14, 0.3); g.quadraticCurveTo(23, -1.2, 31, 0.6); g.stroke();
  } else if (id === 'crossbow') {
    // 猎魔机械连弩：精钢滑轨枪托 + 双翼反曲钢弓 + 蓄势发光弩箭
    g.fillStyle = _wpnGrad(g, -20, -4, 16, 5, '#9c6644', '#582f0e');
    g.beginPath(); g.roundRect(-21, -3.2, 33, 6.4, 2.2); g.fill(); g.stroke();
    // 反曲双翼弓臂
    g.strokeStyle = '#090710'; g.lineWidth = 4.6;
    g.beginPath(); g.moveTo(6, -2); g.quadraticCurveTo(13, -13, 2, -17); g.moveTo(6, 2); g.quadraticCurveTo(13, 13, 2, 17); g.stroke();
    g.strokeStyle = tier >= 2 ? accent : '#e2e8f0'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(6, -2); g.quadraticCurveTo(13, -13, 2, -17); g.moveTo(6, 2); g.quadraticCurveTo(13, 13, 2, 17); g.stroke();
    // 弓弦与上膛弩矢
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(2, -16.5); g.lineTo(-9, 0); g.lineTo(2, 16.5); g.stroke();
    g.strokeStyle = '#090710'; g.lineWidth = 1.4;
    g.fillStyle = isMythic ? accent : '#72efdd';
    g.beginPath(); g.moveTo(15, -3.5); g.lineTo(27, 0); g.lineTo(15, 3.5); g.lineTo(17.5, 0); g.closePath(); g.fill(); g.stroke();
  } else if (id === 'shuriken') {
    // 四方风魔手里剑：中心镂空咒印环 + 四枚弧形切风钢刃
    const shCol = tier >= 2 ? accent : '#72efdd';
    g.fillStyle = _wpnGrad(g, -16, -16, 16, 16, '#ffffff', shCol, '#1e293b');
    g.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI * 0.5;
      const aMid = a + 0.42;
      const ox = Math.cos(a) * 16.5, oy = Math.sin(a) * 16.5;
      const ix = Math.cos(aMid) * 5.6, iy = Math.sin(aMid) * 5.6;
      if (k === 0) g.moveTo(ox, oy); else g.lineTo(ox, oy);
      g.quadraticCurveTo(Math.cos(a + 0.18) * 10.5, Math.sin(a + 0.18) * 10.5, ix, iy);
    }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#090710';
    g.beginPath(); g.arc(0, 0, 3.8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = trimGold; g.lineWidth = 1.3;
    g.beginPath(); g.arc(0, 0, 4.2, 0, Math.PI * 2); g.stroke();
  } else if (id === 'sniper') {
    // 苍穹反器材狙击步枪：镂空战术枪托 + 超长浮置凹槽枪管 + 双镜片高倍光学镜 + 制退器
    g.fillStyle = _wpnGrad(g, -26, -3, -8, 8, '#7f4f24', '#3b210c');
    g.beginPath();
    g.moveTo(-26, -3.5); g.lineTo(-9, -3.5); g.lineTo(-6, 4.5); g.lineTo(-12, 4.5); g.lineTo(-15, 1.5); g.lineTo(-26, 3.5);
    g.closePath(); g.fill(); g.stroke();
    // 机匣与超长枪管
    g.fillStyle = _wpnGrad(g, -10, -5, 30, 4, bladeHi, bladeMid, '#1e293b');
    g.beginPath(); g.roundRect(-10, -4.6, 20, 6.8, 1.8); g.fill(); g.stroke();
    g.fillRect(10, -3.0, 21, 3.6); g.strokeRect(10, -3.0, 21, 3.6);
    // 枪口制退器
    g.fillStyle = trimGold;
    g.beginPath(); g.roundRect(30, -4.4, 5.5, 6.4, 1.2); g.fill(); g.stroke();
    // 高倍瞄准镜
    g.fillStyle = '#1e293b';
    g.beginPath(); g.roundRect(-5, -10.5, 16, 4.6, 1.8); g.fill(); g.stroke();
    g.fillStyle = isMythic ? accent : '#72efdd';
    g.fillRect(9, -10, 2.2, 3.6); g.fillRect(-4.6, -10, 1.8, 3.6);
  } else if (id === 'pistol') {
    // 守誓制式战术手枪：防滑斜纹握把 + 双色切削套筒 + 荧光准星
    _wpnWrapGrip(g, -12, 1, 7.5, 10.5, '#1e293b', '#475569', trimGold);
    g.strokeStyle = '#334155'; g.lineWidth = 1.3;
    g.beginPath(); g.strokeRect(-4.8, 1.5, 5.2, 4.2);
    g.strokeStyle = '#090710'; g.lineWidth = 1.65;
    g.fillStyle = _wpnGrad(g, -14, -6.5, 18, 2, bladeHi, bladeMid, '#1e293b');
    g.beginPath(); g.roundRect(-14, -6.2, 31, 7.8, 2.2); g.fill(); g.stroke();
    // 抛壳窗与散热斜槽
    g.fillStyle = '#0f172a'; g.fillRect(-2, -4.8, 6.5, 2.6);
    g.strokeStyle = 'rgba(15,23,42,0.75)'; g.lineWidth = 1.1;
    for (const sx of [-11, -9, -7]) { g.beginPath(); g.moveTo(sx, -5.0); g.lineTo(sx - 1, -0.5); g.stroke(); }
    g.fillStyle = isMythic ? accent : '#72efdd';
    g.fillRect(14, -7.8, 2.4, 1.8);
  } else if (id === 'revolver') {
    // 审判者左轮手枪：雕花胡桃木弯柄 + 六发黄金转轮弹巢 + 长肋条重型枪管
    _wpnWrapGrip(g, -17, 0.5, 8.5, 11, '#431407', '#9a3412', trimGold);
    g.fillStyle = _wpnGrad(g, -9, -6, 26, 3, '#fff8dc', tier >= 2 ? accent : '#f6d379', '#78350f');
    g.beginPath(); g.roundRect(-9, -5.8, 34, 6.4, 1.8); g.fill(); g.stroke();
    // 转轮弹巢
    g.fillStyle = _wpnGrad(g, -8, -4.5, 2, 4.5, '#fef08a', '#b45309');
    g.beginPath(); g.roundRect(-7.5, -4.6, 9.5, 7.4, 2); g.fill(); g.stroke();
    g.fillStyle = '#1c1917';
    for (const cy of [-2.4, 0.8]) { g.fillRect(-5.8, cy, 6, 1.5); }
    _wpnSpark(g, 24, -2.8, 2.8, '#ffffff');
  } else if (id === 'smg') {
    // 疾风战术冲锋枪：加长弧形弹匣 + 紧凑折叠托机匣 + 全息红点镜 + 消焰枪口
    g.fillStyle = '#1e293b';
    g.beginPath();
    g.moveTo(1, 2); g.quadraticCurveTo(3, 10, 6.5, 14.5); g.lineTo(11, 13.2); g.quadraticCurveTo(7.5, 8.5, 6, 2);
    g.closePath(); g.fill(); g.stroke();
    _wpnWrapGrip(g, -11, 2, 6.5, 9, '#0f172a', '#334155', trimGold);
    g.fillStyle = _wpnGrad(g, -16, -6.5, 20, 3, bladeHi, bladeMid, '#1e293b');
    g.beginPath(); g.roundRect(-16, -6.2, 34, 8.6, 2.5); g.fill(); g.stroke();
    g.fillStyle = '#0f172a';
    for (const vx of [4, 8, 12]) g.fillRect(vx, -3.8, 2.2, 2.8);
    // 全息瞄具与枪口
    g.fillStyle = isMythic ? accent : '#fb7185';
    g.beginPath(); g.roundRect(-6, -10.2, 7.5, 4, 1.2); g.fill(); g.stroke();
    g.fillStyle = '#334155';
    g.fillRect(18, -4.2, 6.5, 4.4); g.strokeRect(18, -4.2, 6.5, 4.4);
  } else if (id === 'shotgun') {
    // 雷霆泵动式重霰弹：核桃木枪托 + 上下双联重管 + 金色护木滑块
    g.fillStyle = _wpnGrad(g, -24, -3, -8, 7, '#9c6644', '#431407');
    g.beginPath();
    g.moveTo(-24, -2); g.lineTo(-9, -4); g.lineTo(-7, 3.5); g.lineTo(-23, 6.5); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = _wpnGrad(g, -9, -6.5, 25, 3, bladeHi, bladeMid, '#1e293b');
    g.beginPath(); g.roundRect(-9, -6.0, 33, 5.2, 1.6); g.fill(); g.stroke();
    g.fillStyle = '#334155';
    g.beginPath(); g.roundRect(-4, -0.8, 24, 3.8, 1.4); g.fill(); g.stroke();
    // 泵动护木
    g.fillStyle = _wpnGrad(g, 2, -1.5, 15, 4.5, trimGold, '#92400e');
    g.beginPath(); g.roundRect(2, -1.4, 13, 5.2, 1.8); g.fill(); g.stroke();
  } else if (id === 'shredder') {
    // 爆裂碎甲发射器：厚重装甲机匣 + 炽热熔炉核心窗 + 锯齿破片膛口
    g.fillStyle = _wpnGrad(g, -18, -7, 20, 7, '#64748b', '#1e293b');
    g.beginPath(); g.roundRect(-18, -7, 36, 13, 3); g.fill(); g.stroke();
    const coreC = isMythic ? accent : '#fb923c';
    g.fillStyle = _wpnGrad(g, -4, -4, 12, 4, '#fff7ed', coreC, '#9a3412');
    g.beginPath(); g.roundRect(-4, -4.2, 15, 7.2, 2); g.fill(); g.stroke();
    g.fillStyle = trimGold;
    g.beginPath();
    g.moveTo(18, -7.5); g.lineTo(25, -5); g.lineTo(21, -2); g.lineTo(25, 0); g.lineTo(21, 2); g.lineTo(25, 5); g.lineTo(18, 7.5);
    g.closePath(); g.fill(); g.stroke();
  } else if (id === 'hammer') {
    // 碎星重装战锤：镌金长柄 + 双面斜面破甲锤头 + 核心符文晶石
    _wpnWrapGrip(g, -26, -2.6, 34, 5.2, '#431407', '#9c6644', trimGold);
    g.fillStyle = _wpnGrad(g, 4, -15, 22, 15, bladeHi, bladeMid, '#1e293b');
    g.beginPath();
    g.moveTo(5, -13.5); g.lineTo(20, -15.5); g.lineTo(23.5, -9); g.lineTo(23.5, 9); g.lineTo(20, 15.5); g.lineTo(5, 13.5); g.lineTo(3, 0);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = trimGold;
    g.fillRect(10, -14.2, 5.5, 28.4); g.strokeRect(10, -14.2, 5.5, 28.4);
    _wpnSpark(g, 12.8, 0, 4.2, isMythic ? '#ffffff' : accent);
  } else if (id === 'spiked_shield') {
    // 荆棘壁垒鸢盾：哥特弧面重甲盾 + 鎏金十字脊 + 三枚破阵钢刺
    g.fillStyle = _wpnGrad(g, -12, -15, 18, 15, bladeHi, bladeMid, '#1e293b');
    g.beginPath();
    g.moveTo(-9, -14.5); g.quadraticCurveTo(9, -14, 19, 0); g.quadraticCurveTo(9, 14, -9, 14.5);
    g.quadraticCurveTo(-5, 0, -9, -14.5);
    g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = trimGold; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(-5, 0); g.lineTo(15, 0); g.moveTo(3, -11); g.lineTo(3, 11); g.stroke();
    g.strokeStyle = '#090710'; g.lineWidth = 1.4;
    g.fillStyle = trimGold;
    for (const sy of [-9, 0, 9]) {
      const sx = sy === 0 ? 18 : 13;
      g.beginPath(); g.moveTo(sx, sy - 2.6); g.lineTo(sx + 7.5, sy); g.lineTo(sx, sy + 2.6); g.closePath(); g.fill(); g.stroke();
    }
  } else if (id === 'grenade_launcher') {
    // 六连发转轮榴弹炮：重型大口径炮管 + 橙焰转轮弹鼓 + 战术提把
    _wpnWrapGrip(g, -20, 1, 8, 9.5, '#1e293b', '#475569', trimGold);
    g.fillStyle = _wpnGrad(g, -18, -6.5, 26, 5, '#94a3b8', '#334155');
    g.beginPath(); g.roundRect(-18, -6.2, 42, 9.2, 2.5); g.fill(); g.stroke();
    const drumC = isMythic ? accent : '#f97316';
    g.fillStyle = _wpnGrad(g, -6, -8, 10, 8, '#ffedd5', drumC, '#9a3412');
    g.beginPath(); g.roundRect(-5.5, -7.8, 14, 13.6, 3.5); g.fill(); g.stroke();
    g.strokeStyle = '#090710'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-5, -1); g.lineTo(8, -1); g.moveTo(-5, 3); g.lineTo(8, 3); g.stroke();
  } else if (id === 'minigun') {
    // 毁灭六管加特林：重装电机机匣 + 四根平行旋转钢制枪管 + 双金箍束环
    g.fillStyle = _wpnGrad(g, -22, -9, -2, 9, '#475569', '#0f172a');
    g.beginPath(); g.roundRect(-22, -8.5, 18, 17, 3.5); g.fill(); g.stroke();
    for (const by of [-6, -2, 2, 6]) {
      g.fillStyle = _wpnGrad(g, -4, by - 1.4, 26, by + 1.4, bladeHi, bladeMid, '#334155');
      g.fillRect(-4, by - 1.35, 30, 2.7); g.strokeRect(-4, by - 1.35, 30, 2.7);
    }
    g.fillStyle = trimGold;
    for (const rx of [9, 20]) {
      g.fillRect(rx, -7.8, 3.4, 15.6); g.strokeRect(rx, -7.8, 3.4, 15.6);
    }
  } else if (id === 'rocket') {
    // 咆哮重型火箭筒：军绿/黑曜发射筒 + 尾焰喷口护罩 + 探出绯红弹头
    g.fillStyle = _wpnGrad(g, -25, -7.5, 20, 7.5, bladeMid, '#334155', '#0f172a');
    g.beginPath(); g.roundRect(-24, -6.8, 40, 13.6, 3); g.fill(); g.stroke();
    g.fillStyle = trimGold;
    g.fillRect(-26, -8.2, 4.5, 16.4); g.strokeRect(-26, -8.2, 4.5, 16.4);
    g.fillRect(12, -7.8, 4, 15.6); g.strokeRect(12, -7.8, 4, 15.6);
    const whCol = isMythic ? accent : '#f43f5e';
    g.fillStyle = _wpnGrad(g, 16, -6, 31, 6, '#ffe4e6', whCol, '#881337');
    g.beginPath(); g.moveTo(16, -5.8); g.quadraticCurveTo(25, -5.2, 32, 0); g.quadraticCurveTo(25, 5.2, 16, 5.8); g.closePath();
    g.fill(); g.stroke();
  } else if (id === 'magma_blade') {
    // 熔岩裂地巨剑：黑曜锯齿宽刃 + 炽白岩浆核心裂纹 + 恶魔角护手
    _wpnWrapGrip(g, -25, -3, 12, 6, '#1c1917', '#44403c', trimGold);
    g.fillStyle = trimGold;
    g.beginPath(); g.moveTo(-13, -10); g.lineTo(-8, -5); g.lineTo(-8, 5); g.lineTo(-13, 10); g.lineTo(-10, 0); g.closePath(); g.fill(); g.stroke();
    const magC = isMythic ? accent : '#fb5607';
    g.fillStyle = _wpnGrad(g, -8, -9, 34, 9, '#292524', magC, '#fff7ed');
    g.beginPath();
    g.moveTo(-8, -6.8); g.lineTo(8, -8.8); g.lineTo(6, -6.2); g.lineTo(22, -8.2); g.lineTo(35, 0);
    g.lineTo(21, 8.2); g.lineTo(-8, 6.8); g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = '#fef08a'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-5, 0); g.lineTo(6, -1.8); g.lineTo(16, 1.5); g.lineTo(28, 0); g.stroke();
  } else if (id === 'icicle') {
    // 极寒冰魄棱枪：多面折射永恒冰晶 + 星霜护手翼
    const iceC = isMythic ? accent : '#72efdd';
    g.fillStyle = _wpnGrad(g, -18, -9, 32, 9, '#ffffff', iceC, '#0284c7');
    g.beginPath();
    g.moveTo(-18, 0); g.lineTo(-7, -8.8); g.lineTo(-2, -4.5); g.lineTo(33, 0);
    g.lineTo(-2, 4.5); g.lineTo(-7, 8.8); g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.88)'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(-12, 0); g.lineTo(28, 0); g.moveTo(-6, -6); g.lineTo(10, 0); g.stroke();
    _wpnSpark(g, 8, -2, 3.4, '#ffffff');
  } else if (id === 'laser') {
    // 棱镜聚焦激光枪：靛蓝科幻枪身 + 透明充能导光腔 + 聚焦晶状体膛口
    _wpnWrapGrip(g, -16, 1.5, 7, 9, '#1e1b4b', '#312e81', trimGold);
    g.fillStyle = _wpnGrad(g, -18, -7, 22, 6, '#6366f1', '#1e1b4b');
    g.beginPath(); g.roundRect(-18, -6.8, 36, 11.2, 3); g.fill(); g.stroke();
    const lCol = isMythic ? accent : '#72efdd';
    g.fillStyle = _wpnGrad(g, -10, -3.5, 16, 2.5, '#ffffff', lCol);
    g.beginPath(); g.roundRect(-10, -3.4, 24, 4.6, 2); g.fill();
    g.fillStyle = lCol;
    g.beginPath(); g.moveTo(18, -5.2); g.lineTo(27, 0); g.lineTo(18, 5.2); g.closePath(); g.fill(); g.stroke();
  } else if (id === 'flamer') {
    // 炼狱龙息喷火器：下挂高压红燃料罐 + 散热孔防烫罩 + 点火引燃嘴
    g.fillStyle = _wpnGrad(g, -16, 2, -1, 12, '#fb7185', '#9f1239');
    g.beginPath(); g.roundRect(-16, 2.2, 15, 8.8, 4); g.fill(); g.stroke();
    g.fillStyle = _wpnGrad(g, -18, -6.5, 22, 4, bladeHi, bladeMid, '#1e293b');
    g.beginPath(); g.roundRect(-18, -6.2, 38, 8.8, 2.5); g.fill(); g.stroke();
    g.fillStyle = '#0f172a';
    for (const hx of [2, 7, 12]) { g.beginPath(); g.arc(hx, -1.8, 1.4, 0, Math.PI * 2); g.fill(); }
    const flC = isMythic ? accent : '#fb923c';
    g.fillStyle = _wpnGrad(g, 20, -4, 30, 4, '#fef08a', flC);
    g.beginPath(); g.moveTo(20, -3.2); g.quadraticCurveTo(28, -4, 30, 0); g.quadraticCurveTo(27, 4, 20, 3.2); g.closePath(); g.fill(); g.stroke();
  } else if (id === 'taser') {
    // 雷神电弧脉冲器：紫晶电容腔 + 双极金属放电叉 + 跃动闪电链
    g.fillStyle = _wpnGrad(g, -16, -6.5, 14, 6.5, '#7e22ce', '#2e1065');
    g.beginPath(); g.roundRect(-16, -6.5, 28, 13, 3.5); g.fill(); g.stroke();
    g.fillStyle = trimGold;
    g.fillRect(12, -5.8, 9, 2.8); g.strokeRect(12, -5.8, 9, 2.8);
    g.fillRect(12, 3.0, 9, 2.8); g.strokeRect(12, 3.0, 9, 2.8);
    g.strokeStyle = isMythic ? accent : '#72efdd'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(20, -4.4); g.lineTo(25, -1.5); g.lineTo(21, 1.2); g.lineTo(25, 4.4); g.stroke();
  } else if (id === 'plasma') {
    // 虚空等离子重炮：分体悬浮导轨翼 + 中央超新星等离子球
    g.fillStyle = _wpnGrad(g, -18, -8, 16, 8, '#581c87', '#1e1b4b');
    g.beginPath();
    g.moveTo(-18, -6); g.lineTo(16, -8.5); g.lineTo(14, -3.5); g.lineTo(-6, -3);
    g.lineTo(-6, 3); g.lineTo(14, 3.5); g.lineTo(16, 8.5); g.lineTo(-18, 6); g.closePath();
    g.fill(); g.stroke();
    const plC = isMythic ? accent : '#c084fc';
    g.fillStyle = _wpnGrad(g, 8, -6, 23, 6, '#ffffff', plC, '#4c1d95');
    g.beginPath(); g.arc(16, 0, 6.2, 0, Math.PI * 2); g.fill(); g.stroke();
    _wpnSpark(g, 14.5, -2, 3.2, '#ffffff');
  } else if (id === 'wrench') {
    // 枢机齿轮重扳手：黄铜液压握柄 + 精密咬合开口钳头 + 齿轮铆钉
    _wpnWrapGrip(g, -22, -3.5, 26, 7, '#78350f', tier >= 2 ? accent : '#f6d379', '#fef08a');
    g.fillStyle = _wpnGrad(g, 4, -10, 25, 10, '#fffbeb', tier >= 2 ? accent : '#f59e0b', '#78350f');
    g.beginPath();
    g.arc(15, 0, 9.8, 0.58, Math.PI * 2 - 0.58);
    g.lineTo(11, -3.8); g.lineTo(11, 3.8); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#1e293b';
    g.beginPath(); g.arc(6, 0, 2.3, 0, Math.PI * 2); g.fill();
  } else if (id === 'screwdriver') {
    // 爆破工程改锥：琥珀绝缘棱纹手柄 + 铬钒合金长杆 + 磁化一字刃尖
    g.fillStyle = _wpnGrad(g, -22, -5.5, -4, 5.5, '#fde047', '#d97706', '#78350f');
    g.beginPath(); g.roundRect(-22, -5.4, 18, 10.8, 4); g.fill(); g.stroke();
    g.fillStyle = '#1e293b';
    g.fillRect(-18, -3.4, 10, 2); g.fillRect(-18, 1.4, 10, 2);
    g.fillStyle = _wpnGrad(g, -4, -2.5, 26, 2.5, '#ffffff', bladeMid, '#475569');
    g.beginPath(); g.moveTo(-4, -2.2); g.lineTo(21, -2.0); g.lineTo(27, -3.2); g.lineTo(27, 3.2); g.lineTo(21, 2.0); g.lineTo(-4, 2.2); g.closePath();
    g.fill(); g.stroke();
  } else if (id === 'nailgun') {
    // 高压气动射钉枪：工程黄工业机身 + 倾斜排钉弹匣 + 安全顶针枪嘴
    g.fillStyle = '#334155';
    g.beginPath(); g.moveTo(0, 3); g.lineTo(6, 13.5); g.lineTo(12, 12); g.lineTo(7, 3); g.closePath(); g.fill(); g.stroke();
    _wpnWrapGrip(g, -15, 2.5, 7, 9.5, '#1e293b', '#475569', trimGold);
    g.fillStyle = _wpnGrad(g, -17, -7, 18, 5, '#fef08a', tier >= 2 ? accent : '#eab308', '#854d0e');
    g.beginPath(); g.roundRect(-17, -6.8, 33, 10.5, 3); g.fill(); g.stroke();
    g.fillStyle = '#cbd5e1';
    g.fillRect(16, -3.5, 8, 4.2); g.strokeRect(16, -3.5, 8, 4.2);
  } else if (id === 'drone_bay') {
    // 浮游蜂巢母舰舱：双翼战术挂架 + 六角能量核心 + 环绕发光无人机光点
    g.fillStyle = _wpnGrad(g, -16, -12, 18, 12, '#475569', '#0f172a');
    g.beginPath();
    g.moveTo(-15, -11); g.lineTo(11, -11); g.lineTo(21, -3.5); g.lineTo(12, -2);
    g.lineTo(12, 2); g.lineTo(21, 3.5); g.lineTo(11, 11); g.lineTo(-15, 11); g.lineTo(-11, 0);
    g.closePath(); g.fill(); g.stroke();
    const drC = isMythic ? accent : '#72efdd';
    g.fillStyle = _wpnGrad(g, -4, -6, 10, 6, '#ffffff', drC, '#0e7490');
    g.beginPath(); g.arc(3, 0, 5.6, 0, Math.PI * 2); g.fill(); g.stroke();
    _wpnSpark(g, 24, 0, 4.0, drC);
  } else if (id === 'emp_cannon') {
    // 天基电磁轨道炮：上下对称磁轨导臂 + 蓝白充能等离子狭缝
    g.fillStyle = _wpnGrad(g, -20, -9, 6, 9, '#312e81', '#0f172a');
    g.beginPath(); g.roundRect(-20, -8.5, 22, 17, 3.5); g.fill(); g.stroke();
    const empC = isMythic ? accent : '#72efdd';
    g.fillStyle = _wpnGrad(g, 0, -2, 28, 2, '#ffffff', empC);
    g.fillRect(0, -2.2, 27, 4.4);
    for (const ry of [-7.5, 3.2]) {
      g.fillStyle = _wpnGrad(g, 2, ry, 28, ry + 4.3, bladeHi, bladeMid, '#1e293b');
      g.beginPath(); g.roundRect(2, ry, 26, 4.3, 1.4); g.fill(); g.stroke();
    }
    _wpnSpark(g, 28, 0, 3.8, '#ffffff');
  } else if (id === 'ember_staff') {
    // 赤烬魂灯杖：玄铁鎏金盘龙长杖 + 弯钩提灯杖首 + 赤金烈焰魂核
    _wpnWrapGrip(g, -25, -2.6, 35, 5.2, '#451a03', trimGold, '#fef08a');
    g.strokeStyle = trimGold; g.lineWidth = 2.4;
    g.beginPath(); g.arc(14, -3.5, 7.5, Math.PI * 0.85, Math.PI * 2.15); g.stroke();
    const emC = isMythic ? accent : '#ff6b35';
    g.fillStyle = _wpnGrad(g, 11, -7, 25, 9, '#fff7ed', '#ffd166', emC);
    g.beginPath();
    g.moveTo(18, -8.5); g.lineTo(24.5, 0); g.lineTo(18, 9.5); g.lineTo(11.5, 0);
    g.closePath(); g.fill(); g.stroke();
    _wpnSpark(g, 18, 0.5, 4.2, '#ffffff');
  } else if (id === 'frost_scepter') {
    // 永冻星辉杖：秘银寒玉杖身 + 双翼冰晶护鄂 + 六棱寒星王冠核
    _wpnWrapGrip(g, -25, -2.4, 34, 4.8, '#0f172a', '#38bdf8', '#e0f2fe');
    const frC = isMythic ? accent : '#72efdd';
    g.fillStyle = _wpnGrad(g, 7, -11, 22, 11, '#ffffff', frC, '#0369a1');
    g.beginPath();
    g.moveTo(9, 0); g.lineTo(14, -10.5); g.lineTo(19, -4.5); g.lineTo(27, 0);
    g.lineTo(19, 4.5); g.lineTo(14, 10.5);
    g.closePath(); g.fill(); g.stroke();
    _wpnSpark(g, 18, 0, 4.5, '#ffffff');
  } else if (id === 'storm_rod') {
    // 紫电星轨杖：黑曜绝缘法杖 + 双环磁暴星轨 + 雷耀紫晶球
    _wpnWrapGrip(g, -25, -2.5, 34, 5.0, '#1e1b4b', '#a855f7', '#f3e8ff');
    const stC = isMythic ? accent : '#c084fc';
    g.strokeStyle = '#fde047'; g.lineWidth = 2.0;
    g.beginPath(); g.ellipse(17, 0, 9.5, 5.2, 0.52, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(17, 0, 9.5, 5.2, -0.52, 0, Math.PI * 2); g.stroke();
    g.fillStyle = _wpnGrad(g, 11, -6, 23, 6, '#ffffff', stC, '#4c1d95');
    g.beginPath(); g.arc(17, 0, 5.6, 0, Math.PI * 2); g.fill(); g.stroke();
    _wpnSpark(g, 17, 0, 3.8, '#fef08a');
  } else if (id === 'chrono_staff') {
    // 发条共鸣法杖：黄铜精密长杆 + 星盘齿轮外环 + 翡翠枢机指针核
    _wpnWrapGrip(g, -25, -2.6, 33, 5.2, '#78350f', '#f59e0b', '#fef3c7');
    const chC = isMythic ? accent : '#f6d379';
    g.fillStyle = _wpnGrad(g, 7, -10, 27, 10, '#fef9c3', chC, '#92400e');
    g.beginPath(); g.arc(17, 0, 9.4, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#0f172a';
    g.beginPath(); g.arc(17, 0, 5.6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#72efdd'; g.lineWidth = 2.0;
    g.beginPath(); g.moveTo(17, 0); g.lineTo(21, -2.5); g.moveTo(17, 0); g.lineTo(15, 3.5); g.stroke();
    _wpnSpark(g, 17, 0, 3.4, '#72efdd');
  } else if (id === 'bone_boomerang') {
    // 苍骨回旋战刃：弯折龙骨双翼刃 + 黑曜皮缠中心握把 + 骨刺铭文
    const bnC = isMythic ? accent : '#f1f5f9';
    g.fillStyle = _wpnGrad(g, -18, -18, 20, 18, '#ffffff', bnC, '#94a3b8');
    g.beginPath();
    g.moveTo(8, 0);
    g.quadraticCurveTo(2, -12, -16, -18);
    g.quadraticCurveTo(-8, -22, 6, -14);
    g.quadraticCurveTo(20, -6, 22, 0);
    g.quadraticCurveTo(20, 6, 6, 14);
    g.quadraticCurveTo(-8, 22, -16, 18);
    g.quadraticCurveTo(2, 12, 8, 0);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = _wpnGrad(g, 7, -6, 21, 6, trimGold, '#334155');
    g.beginPath(); g.roundRect(9, -5.2, 9.5, 10.4, 2.5); g.fill(); g.stroke();
    _wpnSpark(g, -10, -16, 3.2, isMythic ? accent : '#72efdd');
  } else if (id === 'pulse_carbine') {
    // 断界三连脉冲步铳：无托战术步铳枪身 + 三联青蓝脉冲电容槽 + 全息瞄具
    _wpnWrapGrip(g, -15, 3, 7, 9.5, '#0f172a', '#334155', trimGold);
    g.fillStyle = _wpnGrad(g, -22, -7, 22, 6, '#64748b', '#1e293b', '#090d16');
    g.beginPath();
    g.moveTo(-22, -5.5); g.lineTo(16, -6.5); g.lineTo(23, -3.2); g.lineTo(23, 3.5);
    g.lineTo(8, 5.2); g.lineTo(-22, 4.8); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = trimGold;
    g.beginPath(); g.roundRect(-8, -10.8, 12, 4.2, 1.5); g.fill(); g.stroke();
    const pcC = isMythic ? accent : '#38bdf8';
    g.fillStyle = pcC;
    for (const cx of [-3, 3, 9]) {
      g.fillRect(cx, -3.2, 3.4, 4.6);
    }
    g.fillStyle = '#cbd5e1';
    g.fillRect(22, -2.4, 7.5, 4.4); g.strokeRect(22, -2.4, 7.5, 4.4);
    _wpnSpark(g, 29, -0.2, 3.4, pcC);
  } else if (id === 'obsidian_flail') {
    // 黑曜链枷流星锤：金箍重铁柄 + 紧绷铁索环 + 多棱尖刺黑曜流星重球
    _wpnWrapGrip(g, -26, -3.0, 18, 6.0, '#1e1b4b', '#6d28d9', trimGold);
    g.strokeStyle = trimGold; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(1, -5, 8, -1); g.stroke();
    g.strokeStyle = '#090710'; g.lineWidth = 1.6;
    const flC = isMythic ? accent : '#a855f7';
    g.fillStyle = _wpnGrad(g, 6, -13, 28, 13, '#e9d5ff', flC, '#1e1b4b');
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI * 2) / 16;
      const rad = k % 2 === 0 ? 13.5 : 8.2;
      const px = 17 + Math.cos(a) * rad, py = Math.sin(a) * rad;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill(); g.stroke();
    _wpnSpark(g, 17, 0, 4.0, '#fef08a');
  } else if (id === 'gale_twinbow') {
    // 追风双弦猎弓：苍翠羽翼反曲长弓 + 双重发光风弦 + 并列双矢
    const bwC = isMythic ? accent : '#2dd4bf';
    g.strokeStyle = '#090710'; g.lineWidth = 5.2;
    g.beginPath(); g.moveTo(-4, -19); g.quadraticCurveTo(13, -10, 9, 0); g.quadraticCurveTo(13, 10, -4, 19); g.stroke();
    g.strokeStyle = bwC; g.lineWidth = 2.8;
    g.beginPath(); g.moveTo(-4, -19); g.quadraticCurveTo(13, -10, 9, 0); g.quadraticCurveTo(13, 10, -4, 19); g.stroke();
    g.strokeStyle = '#ecfeff'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(-4, -18.5); g.lineTo(-12, 0); g.lineTo(-4, 18.5); g.moveTo(-2, -16.5); g.lineTo(-9, 0); g.lineTo(-2, 16.5); g.stroke();
    g.strokeStyle = '#090710'; g.lineWidth = 1.4;
    for (const ay of [-3.2, 3.2]) {
      g.fillStyle = trimGold;
      g.fillRect(-10, ay - 1, 30, 2);
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(20, ay - 3); g.lineTo(28, ay); g.lineTo(20, ay + 3); g.closePath(); g.fill(); g.stroke();
    }
  } else if (id === 'crimson_siphon_staff') {
    // 猩红渴血魔杖：暗银荆棘杖杆 + 蝙蝠双翼圣爵托 + 璀璨鲜血红宝石核
    _wpnWrapGrip(g, -25, -2.5, 34, 5.0, '#310a16', '#9f1239', trimGold);
    const blC = isMythic ? accent : '#f43f5e';
    g.fillStyle = _wpnGrad(g, 6, -13, 20, 13, '#fecdd3', '#be123c', '#4c0519');
    for (const sy of [-1, 1]) {
      g.beginPath();
      g.moveTo(9, sy * 2); g.quadraticCurveTo(13, sy * 13, 23, sy * 11); g.quadraticCurveTo(17, sy * 5, 14, sy * 1.5);
      g.closePath(); g.fill(); g.stroke();
    }
    g.fillStyle = _wpnGrad(g, 12, -7, 27, 7, '#ffffff', blC, '#881337');
    g.beginPath(); g.moveTo(12, 0); g.lineTo(19.5, -7); g.lineTo(27.5, 0); g.lineTo(19.5, 7); g.closePath(); g.fill(); g.stroke();
    _wpnSpark(g, 20, -1, 4.0, '#fff1f2');
  } else if (id === 'singularity_scepter') {
    // 星蚀引力权杖：黑曜鎏金帝杖 + 倾斜金色视界吸积盘 + 纯黑奇点日核
    _wpnWrapGrip(g, -25, -2.7, 33, 5.4, '#0f172a', '#7e22ce', trimGold);
    const sgC = isMythic ? accent : '#c084fc';
    g.strokeStyle = trimGold; g.lineWidth = 2.4;
    g.beginPath(); g.ellipse(18, 0, 11.5, 4.8, -0.45, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = sgC; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(18, 0, 9.5, 10.5, 0.35, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#05020d'; g.strokeStyle = '#fde68a'; g.lineWidth = 1.8;
    g.beginPath(); g.arc(18, 0, 6.2, 0, Math.PI * 2); g.fill(); g.stroke();
    _wpnSpark(g, 23, -5, 3.6, '#fde68a');
  } else {
    g.fillStyle = _wpnGrad(g, -14, -5, 22, 5, bladeHi, bladeMid, '#1e293b');
    g.beginPath(); g.roundRect(-14, -4.5, 34, 9, 3); g.fill(); g.stroke();
  }
}

let _sharedWeaponUrlCanvas = null;

function getBakedWeaponSprite(id, tier = 1, evoId = '') {
  const safeTier = Math.max(1, Math.min(5, tier | 0));
  const key = `${id}|${safeTier}|${evoId || ''}`;
  let cvCached = _weaponSpriteCache.get(key);
  if (cvCached) return cvCached;
  if (typeof document === 'undefined') return null;

  const off = document.createElement('canvas');
  off.width = 192;
  off.height = 192;
  const g = off.getContext('2d');
  if (!g) {
    try { off.width = 0; off.height = 0; } catch (_) {}
    return null;
  }
  g.save();
  g.translate(96, 96);
  g.scale(2.55, 2.55);
  _paintWeaponArt(g, id, safeTier, evoId || '');
  g.restore();

  // 角色同屏最多装备 6 把兵装：将常驻离屏武器画布上限从 145 收敛至 24 并主动归零淘汰画布，大幅节省手机 WebKit 2D Context 配额！
  while (_weaponSpriteCache.size >= 24) {
    const oldestKey = _weaponSpriteCache.keys().next().value;
    const oldCv = _weaponSpriteCache.get(oldestKey);
    _weaponSpriteCache.delete(oldestKey);
    if (oldCv && oldCv !== off) {
      try { oldCv.width = 0; oldCv.height = 0; } catch (_) {}
    }
  }
  _weaponSpriteCache.set(key, off);
  return off;
}

function getWeaponArtDataUrl(id, tier = 1, evoId = '') {
  const safeTier = Math.max(1, Math.min(5, tier | 0));
  const key = `${id}|${safeTier}|${evoId || ''}`;
  if (_weaponDataUrlCache.has(key)) return _weaponDataUrlCache.get(key);
  if (typeof document === 'undefined') return '';

  // 复用唯一一张共享临时画布导出圣典/行商图标 DataURL，0 新增常驻 Canvas 上下文占用！
  let url = '';
  try {
    if (!_sharedWeaponUrlCanvas) {
      _sharedWeaponUrlCanvas = document.createElement('canvas');
      _sharedWeaponUrlCanvas.width = 192;
      _sharedWeaponUrlCanvas.height = 192;
    }
    const g = _sharedWeaponUrlCanvas.getContext('2d');
    if (g) {
      g.clearRect(0, 0, 192, 192);
      g.save();
      g.translate(96, 96);
      g.scale(2.55, 2.55);
      _paintWeaponArt(g, id, safeTier, evoId || '');
      g.restore();
      if (typeof _sharedWeaponUrlCanvas.toDataURL === 'function') {
        url = _sharedWeaponUrlCanvas.toDataURL();
      }
    }
  } catch (_) {
    url = '';
  }

  if (url && url.indexOf('data:image/') === 0) {
    if (_weaponDataUrlCache.size >= 160) {
      const oldestKey = _weaponDataUrlCache.keys().next().value;
      _weaponDataUrlCache.delete(oldestKey);
    }
    _weaponDataUrlCache.set(key, url);
  }
  return url;
}

function renderWeaponEmblemHtml(id, tier = 1, evoId = '', fallbackIcon = '⚔️') {
  const url = getWeaponArtDataUrl(id, tier, evoId);
  if (url && url.indexOf('data:image/') === 0) {
    return `<img src="${url}" alt="" class="wpn-art-ico" decoding="async">`;
  }
  return fallbackIcon || '⚔️';
}

function drawWeaponSprite(w) {
  const id = w.id;
  const now = _syncNow();
  ctx.save();
  ctx.translate(w.wx, w.wy);
  ctx.rotate(w.angle);
  if (Math.cos(w.angle) < 0) ctx.scale(1, -1);
  if (id === 'shuriken') ctx.rotate(now * 0.0085);

  const baked = getBakedWeaponSprite(id, w.tier || 1, w.evo || '');
  if (baked) {
    ctx.drawImage(baked, -37.5, -37.5, 75, 75);
  } else {
    ctx.save();
    const fallbackScale = (75 / 192) * 2.55;
    ctx.scale(fallbackScale, fallbackScale);
    _paintWeaponArt(ctx, id, Math.max(1, Math.min(5, (w.tier || 1) | 0)), w.evo || '');
    ctx.restore();
  }
  ctx.restore();
}

// 🗼 四大层域专属可破坏封魂器物 & 首领共鸣阵眼棱柱（零 createRadialGradient / 零 shadowBlur）
function drawTreeSprite(tr) {
  const sw = Math.sin(tr.sway || 0) * 0.04;
  const flash = tr.hitFlash > 0;
  if (tr.isBossPylon) {
    const now = _syncNow();
    const pk = tr.pylonKind || 'cryo_obelisk';
    const col = flash ? '#ffffff' : (tr.pylonColor || '#72efdd');
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.fillStyle = 'rgba(0,0,0,0.46)';
    ctx.beginPath(); ctx.ellipse(0, 18, 25, 9.5, 0, 0, Math.PI * 2); ctx.fill();
    if (pk === 'magnet_core') {
      ctx.strokeStyle = 'rgba(255, 159, 28, 0.28)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(0, 4, 98, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.arc(0, 6, 26, now * 0.004, now * 0.004 + Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    const bob = Math.sin(now * 0.006 + (tr.sway || 0)) * 3.2;
    ctx.fillStyle = pk === 'cryo_obelisk' ? '#0c4a6e' : (pk === 'magnet_core' ? '#431407' : '#064e3b');
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -34 + bob);
    ctx.lineTo(15, -10 + bob);
    ctx.lineTo(11, 16);
    ctx.lineTo(-11, 16);
    ctx.lineTo(-15, -10 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -24 + bob);
    ctx.lineTo(6, -10 + bob);
    ctx.lineTo(0, 4 + bob);
    ctx.lineTo(-6, -10 + bob);
    ctx.closePath();
    ctx.fill();
    const bw = 44;
    ctx.fillStyle = 'rgba(6,9,16,0.88)';
    ctx.fillRect(-bw * 0.5, -50, bw, 6);
    ctx.fillStyle = col;
    ctx.fillRect(-bw * 0.5 + 1, -49, (bw - 2) * Math.max(0, tr.hp / Math.max(1, tr.maxHp)), 4);
    ctx.font = '800 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('击破破防+20%', 0, -55);
    ctx.restore();
    return;
  }
  const scId = (typeof curScene !== 'undefined' && curScene && curScene.id) ? curScene.id : 'foundry';

  ctx.fillStyle = 'rgba(0,0,0,0.44)';
  ctx.beginPath(); ctx.ellipse(tr.x, tr.y + 18, 22, 8.5, 0, 0, Math.PI * 2); ctx.fill();

  const spr = (typeof SpireAssets !== 'undefined') ? SpireAssets.getPropSprite(scId, flash) : null;
  if (spr && spr.canvas) {
    const targetH = 68;
    const scale = targetH / Math.max(16, spr.h);
    const dw = spr.w * scale, dh = spr.h * scale;
    ctx.save();
    ctx.translate(tr.x, tr.y + 18);
    if (sw) ctx.rotate(sw);
    ctx.drawImage(spr.canvas, -dw * 0.5, -dh, dw, dh);
    ctx.restore();
  } else {
    // 首帧贴图未就绪时的哥特封魂晶碑极简兜底
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.fillStyle = flash ? '#475569' : '#1e293b';
    ctx.strokeStyle = '#f6d379';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -28); ctx.lineTo(14, -10); ctx.lineTo(11, 18); ctx.lineTo(-11, 18); ctx.lineTo(-14, -10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  if (tr.hp < tr.maxHp) {
    const bw = 36;
    ctx.fillStyle = 'rgba(6,9,16,0.82)';
    ctx.fillRect(tr.x - bw / 2, tr.y - 46, bw, 5);
    ctx.fillStyle = '#72efdd';
    ctx.fillRect(tr.x - bw / 2 + 1, tr.y - 45, (bw - 2) * Math.max(0, tr.hp / Math.max(1, tr.maxHp)), 3);
  }
}

// 发条机炮塔与浮游贯日激光塔绘制
function drawTurretSprite(t) {
  const now = _syncNow();
  const overclocked = !!(typeof player !== 'undefined' && player && (player.turretOverclockT || 0) > 0);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(t.x, t.y + 14, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (overclocked) {
    ctx.save();
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.78)';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(t.x, t.y + 4, 20, now * 0.006, now * 0.006 + Math.PI * 1.8); ctx.stroke();
    ctx.restore();
  }

  if (t.kind === 'laser') {
    const bob = Math.sin(now * 0.006 + t.x) * 2.5;
    ctx.save();
    ctx.translate(t.x, t.y + bob);
    ctx.strokeStyle = '#14101a'; ctx.lineWidth = 2.4;
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      k === 0 ? ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13) : ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(t.angle);
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(4, -7); ctx.lineTo(-5, 0); ctx.lineTo(4, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#72efdd';
    ctx.beginPath(); ctx.arc(2, 0, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }

  if (t.kind === 'shock') {
    // 磁暴电弧线圈塔：八角黑曜绝缘底座 + 双层紫电电容环 + 青白雷球塔尖
    const pulse = 1 + Math.sin(now * 0.011 + t.x) * 0.12;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.4;
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath(); ctx.arc(0, 6, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.ellipse(0, 1, 10.5, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -5, 8.2, 3.6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(0, -10, 5.2 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -10, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }

  if (t.kind === 'totem') {
    // 奥术共鸣方尖碑 / 发条法阵图腾：165px 共鸣金环 + 悬浮旋转符文棱晶
    const bob = Math.sin(now * 0.0055 + t.y) * 3.0;
    ctx.save();
    ctx.strokeStyle = 'rgba(246, 211, 121, 0.24)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(t.x, t.y + 4, 165, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(t.x, t.y + bob);
    ctx.fillStyle = '#78350f'; ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(0, -17); ctx.lineTo(10, -3); ctx.lineTo(7, 11); ctx.lineTo(-7, 11); ctx.lineTo(-10, -3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(5.5, -3); ctx.lineTo(0, 6); ctx.lineTo(-5.5, -3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#72efdd';
    ctx.beginPath(); ctx.arc(0, -3, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }

  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.6;
  ctx.fillStyle = '#475569';
  ctx.beginPath(); ctx.arc(t.x, t.y + 6, 11.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  ctx.save();
  ctx.translate(t.x - Math.cos(t.angle) * t.recoil * 4, t.y - Math.sin(t.angle) * t.recoil * 4);
  ctx.rotate(t.angle);
  ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.2;
  ctx.fillRect(4, -4, 16, 8); ctx.strokeRect(4, -4, 16, 8);
  ctx.fillStyle = TIER_COLORS[t.tier] === '#e2deec' ? '#f6d379' : TIER_COLORS[t.tier];
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#72efdd';
  ctx.beginPath(); ctx.arc(2, 0, 3.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 4 拍丝滑步态帧序列：左迈步(F1) -> 中立过渡(F0) -> 右迈步(F2) -> 中立过渡(F0)
const _HERO_STRIDE_SEQ = [1, 0, 2, 0];

function _stepEntityAnim(ent, now, isMoving, targetFace, forceAttackPose) {
  const dt = Math.min(0.05, Math.max(0.001, (now - (ent._animMs || now)) * 0.001));
  ent._animMs = now;

  const prevX = ent._animPrevX !== undefined ? ent._animPrevX : ent.x;
  const prevY = ent._animPrevY !== undefined ? ent._animPrevY : ent.y;
  const disp = Math.hypot(ent.x - prevX, ent.y - prevY);
  ent._animPrevX = ent.x;
  ent._animPrevY = ent.y;
  const instSpd = Math.min(900, disp / dt);
  ent._smoothSpd = (ent._smoothSpd || 0) + (instSpd - (ent._smoothSpd || 0)) * Math.min(1, dt * 15);

  const desiredFlip = targetFace < 0 ? -1 : 1;
  if (ent._visFlip === undefined) ent._visFlip = desiredFlip;
  ent._visFlip += (desiredFlip - ent._visFlip) * Math.min(1, dt * 18);

  const movingNow = isMoving || ent._smoothSpd > 22;
  if (movingNow) {
    const rate = Math.max(5.8, Math.min(14.5, ent._smoothSpd * 0.042));
    ent._strideT = ((ent._strideT || 0) + dt * rate) % 4;
    ent._moveBlend = Math.min(1, (ent._moveBlend || 0) + dt * 12);
  } else {
    ent._moveBlend = Math.max(0, (ent._moveBlend || 0) - dt * 10);
  }

  let frameIdx = 0;
  if (forceAttackPose) {
    frameIdx = 3;
  } else if (ent._moveBlend > 0.18) {
    frameIdx = _HERO_STRIDE_SEQ[((ent._strideT || 0) | 0) & 3];
  }
  ent._curFrameIdx = frameIdx;
  return dt;
}

function _pushGhostTrail(ent, now, frameIdx, flipSign, intervalMs, startAlpha) {
  if (!ent._ghostRing) {
    ent._ghostRing = [
      { x: 0, y: 0, f: 0, dir: 1, a: 0 },
      { x: 0, y: 0, f: 0, dir: 1, a: 0 }
    ];
    ent._ghostHead = 0;
    ent._ghostLastMs = 0;
  }
  if (now - ent._ghostLastMs >= intervalMs) {
    ent._ghostLastMs = now;
    const slot = ent._ghostRing[ent._ghostHead];
    slot.x = ent.x;
    slot.y = ent.y;
    slot.f = frameIdx;
    slot.dir = flipSign;
    slot.a = startAlpha || 0.36;
    ent._ghostHead = (ent._ghostHead + 1) % 2;
  }
}

function _decayAndDrawGhostTrail(ent, dt, sheet, drawSize, yAnchorOffset) {
  const ring = ent._ghostRing;
  if (!ring || !sheet || !sheet.canvas) return;
  const cw = sheet.cellW, ch = sheet.cellH;
  for (let i = 0; i < ring.length; i++) {
    const g = ring[i];
    if (g.a <= 0.02) continue;
    g.a = Math.max(0, g.a - dt * 2.5);
    if (g.a <= 0.02) continue;
    ctx.save();
    ctx.globalAlpha = g.a;
    ctx.translate(g.x, g.y + yAnchorOffset);
    ctx.scale(g.dir < 0 ? -1 : 1, 1);
    const sx = Math.min(sheet.frames - 1, Math.max(0, g.f)) * cw;
    ctx.drawImage(sheet.canvas, sx, 0, cw, ch, -drawSize * 0.5, -drawSize * 0.93, drawSize, drawSize);
    ctx.restore();
  }
}

// 👑 首领与统领施法/蓄力/出招时的专属背部异象与神装展开（零渐变、零滤镜，纯几何矢量羽翼/剑匣/星晷/炉芯，彻底告别呆板站桩）
function _drawBossCastPhenomena(e, r, now, drawX, drawY, power) {
  if (power <= 0.04) return;
  const v = e.variant || 'butcher';
  const alpha = Math.min(0.92, 0.28 + power * 0.62);
  ctx.save();
  ctx.translate(drawX, drawY - r * 0.28);
  ctx.globalAlpha = alpha;

  if (v === 'frost_queen' || v === 'glacial_valkyrie') {
    // 碎冕霜女皇 / 凛霜圣枪：背后展开六翼极光冰晶棱羽 + 头顶旋转六芒冰冠
    const spread = 0.68 + power * 0.42 + Math.sin(now * 0.016) * 0.06;
    const wingLen = r * (1.28 + power * 0.48);
    for (let side = -1; side <= 1; side += 2) {
      for (let wi = 0; wi < 3; wi++) {
        const wa = (side < 0 ? Math.PI : 0) - side * (-0.38 + wi * 0.42) * spread;
        const wl = wingLen * (1 - wi * 0.14);
        const perp = wa + Math.PI * 0.5;
        ctx.fillStyle = wi === 1 ? 'rgba(224, 242, 254, 0.78)' : 'rgba(56, 189, 248, 0.56)';
        ctx.strokeStyle = '#72efdd';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(side * r * 0.28, -4 + wi * 4);
        ctx.lineTo(Math.cos(wa) * wl * 0.55 + Math.cos(perp) * 8, Math.sin(wa) * wl * 0.55 + Math.sin(perp) * 8);
        ctx.lineTo(Math.cos(wa) * wl, Math.sin(wa) * wl);
        ctx.lineTo(Math.cos(wa) * wl * 0.55 - Math.cos(perp) * 8, Math.sin(wa) * wl * 0.55 - Math.sin(perp) * 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    const crownY = -r * 1.18;
    const rot = now * 0.004;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.8;
    for (let k = 0; k < 3; k++) {
      const ca = rot + (k * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ca) * 12, crownY + Math.sin(ca) * 12);
      ctx.lineTo(-Math.cos(ca) * 12, crownY - Math.sin(ca) * 12);
      ctx.stroke();
    }
  } else if (v === 'void_weaver' || v === 'shadow_stalker') {
    // 逆时星晷主宰 / 幽影统领：背后展开逆转黄金星晷齿轮时针阵
    const dialR = r * (1.18 + power * 0.34);
    const spin = -now * 0.0045;
    ctx.strokeStyle = v === 'shadow_stalker' ? '#72efdd' : '#fde68a';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(0, 0, dialR, spin, spin + Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, dialR * 0.72, 0, Math.PI * 2); ctx.stroke();
    // 逆时针与分针双指针高速走字
    const hA = -now * 0.008, mA = now * 0.019;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(Math.cos(hA) * dialR * 0.64, Math.sin(hA) * dialR * 0.64);
    ctx.moveTo(0, 0); ctx.lineTo(Math.cos(mA) * dialR * 0.94, Math.sin(mA) * dialR * 0.94);
    ctx.stroke();
  } else if (v === 'solar_seraph') {
    // 终焉日蚀圣女：展开金乌耀金与黑日紫曜交错的六翼炽天圣羽 + 头顶黑日蚀冕
    const beat = Math.sin(now * 0.018) * 0.10;
    const wingLen = r * (1.36 + power * 0.50);
    for (let side = -1; side <= 1; side += 2) {
      for (let wi = 0; wi < 3; wi++) {
        const wa = (side < 0 ? Math.PI : 0) - side * (-0.45 + wi * 0.44 + beat);
        const wl = wingLen * (1 - wi * 0.13);
        const perp = wa + Math.PI * 0.5;
        ctx.fillStyle = wi === 1 ? 'rgba(192, 132, 252, 0.72)' : 'rgba(253, 224, 71, 0.75)';
        ctx.strokeStyle = wi === 1 ? '#e9d5ff' : '#fffbeb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(side * r * 0.26, -6 + wi * 5);
        ctx.quadraticCurveTo(
          Math.cos(wa) * wl * 0.58 + Math.cos(perp) * (11 * side),
          Math.sin(wa) * wl * 0.58 + Math.sin(perp) * (11 * side),
          Math.cos(wa) * wl,
          Math.sin(wa) * wl
        );
        ctx.lineTo(Math.cos(wa) * wl * 0.48 - Math.cos(perp) * (5 * side), Math.sin(wa) * wl * 0.48 - Math.sin(perp) * (5 * side));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    const sunY = -r * 1.24;
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, sunY, 12 + power * 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (v === 'mech_colossus' || v === 'pyro_lord' || v === 'golden_golem' || v === 'iron_warden') {
    // 欧米茄 / 重装统领：超载旋转熔核齿轮光环 + 双肩高压等离子喷焰翼
    const gearR = r * (1.12 + power * 0.28);
    const gRot = now * 0.007;
    ctx.strokeStyle = v === 'golden_golem' || v === 'iron_warden' ? '#ffd166' : '#fb923c';
    ctx.lineWidth = 3.2;
    ctx.setLineDash([10, 7]);
    ctx.beginPath(); ctx.arc(0, 4, gearR, gRot, gRot + Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    const jetH = r * (0.85 + power * 0.55) + Math.sin(now * 0.04) * 6;
    for (let side = -1; side <= 1; side += 2) {
      ctx.fillStyle = 'rgba(251, 146, 60, 0.78)';
      ctx.beginPath();
      ctx.moveTo(side * r * 0.62, -r * 0.22);
      ctx.lineTo(side * (r * 0.95 + jetH * 0.42), -r * 0.65 - jetH * 0.55);
      ctx.lineTo(side * r * 0.42, -r * 0.48);
      ctx.closePath();
      ctx.fill();
    }
  } else if (v === 'plague_empress' || v === 'venom_matriarch' || v === 'abyss_devourer' || v === 'storm_siren') {
    // 苍岚毒皇 / 风暴统领 / 噬界者：振翅扇动的翡翠蝶翼 / 苍雷虚空灵翼
    const isStorm = v === 'storm_siren';
    const isVoid = v === 'abyss_devourer';
    const flap = Math.sin(now * 0.022) * 0.16;
    const wSpan = r * (1.30 + power * 0.44);
    ctx.fillStyle = isStorm ? 'rgba(56, 189, 248, 0.62)' : (isVoid ? 'rgba(192, 132, 252, 0.62)' : 'rgba(110, 231, 183, 0.60)');
    ctx.strokeStyle = isStorm ? '#bae6fd' : (isVoid ? '#e9d5ff' : '#a3e635');
    ctx.lineWidth = 1.8;
    for (let side = -1; side <= 1; side += 2) {
      for (let wi = 0; wi < 2; wi++) {
        const wa = (side < 0 ? Math.PI : 0) - side * (-0.36 + wi * 0.56 + flap);
        const wl = wSpan * (wi === 0 ? 1.0 : 0.78);
        const perp = wa + Math.PI * 0.5;
        ctx.beginPath();
        ctx.moveTo(side * r * 0.24, wi * 8 - 4);
        ctx.quadraticCurveTo(
          Math.cos(wa) * wl * 0.65 + Math.cos(perp) * (16 * side),
          Math.sin(wa) * wl * 0.65 + Math.sin(perp) * (16 * side),
          Math.cos(wa) * wl,
          Math.sin(wa) * wl
        );
        ctx.quadraticCurveTo(
          Math.cos(wa) * wl * 0.45 - Math.cos(perp) * (8 * side),
          Math.sin(wa) * wl * 0.45 - Math.sin(perp) * (8 * side),
          side * r * 0.20,
          wi * 8 + 4
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  } else {
    // 断刃守誓者·烬羽 / 猩红伯爵 / 裂地统领：背后交叉出鞘的绯金幻影双剑与冲天剑气弧
    const bLen = r * (1.34 + power * 0.46);
    const tilt = 0.58 + Math.sin(now * 0.02) * 0.06;
    for (let side = -1; side <= 1; side += 2) {
      const ba = -Math.PI * 0.5 + side * tilt;
      const perp = ba + Math.PI * 0.5;
      ctx.fillStyle = 'rgba(255, 42, 85, 0.75)';
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(side * 6, 8);
      ctx.lineTo(Math.cos(ba) * bLen * 0.72 + Math.cos(perp) * 6, Math.sin(ba) * bLen * 0.72 + Math.sin(perp) * 6);
      ctx.lineTo(Math.cos(ba) * bLen, Math.sin(ba) * bLen);
      ctx.lineTo(Math.cos(ba) * bLen * 0.72 - Math.cos(perp) * 6, Math.sin(ba) * bLen * 0.72 - Math.sin(perp) * 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// 👾 12 种《烬塔残响》分层域 Q 版怪物 & 四幕守誓首领 4 帧动作精灵渲染
function drawEnemySprite(e) {
  const now = _syncNow();
  const r = Math.max(6, e.r || 15);
  const isBoss = e.type === 'boss' || e.type === 'special_boss';
  const isMini = e.type === 'mini_boss';
  const flash = e.hitFlash > 0 || (e.primed && ((now * 0.014) | 0) % 2 === 1);

  // 潜渊骨蛇遁地期间隐藏地面躯体，仅渲染黑水暗金潜行地波裂痕
  if (e.type === 'sand_worm' && (e.burrowT || 0) > 0) {
    ctx.save();
    ctx.translate(e.x, e.y + 4);
    ctx.fillStyle = 'rgba(8, 10, 18, 0.76)';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * 0.52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -2); ctx.lineTo(-r * 0.25, 5); ctx.lineTo(r * 0.3, -4); ctx.lineTo(r * 0.95, 3);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 1. 地面接触阴影与首领/双形态狂化精英/神话二阶段清晰气场底环
  ctx.fillStyle = 'rgba(0,0,0,0.44)';
  ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.88, r * 0.96, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();

  const showP2Visual = !!(e.mythicPhase2 && !e._ruptureHoldP1);
  if (isBoss && showP2Visual) {
    const p2SigilCols = {
      butcher: ['#e8563f', '#f0b865'],
      frost_queen: ['#5cc8ff', '#ffd88a'],
      void_weaver: ['#9d6bff', '#f2c15a'],
      mech_colossus: ['#f08c2b', '#ffd470'],
      plague_empress: ['#38d9a9', '#a3f7d8'],
      solar_seraph: ['#eab354', '#ffe29a']
    }[e.variant] || ['#fb7185', '#fde68a'];
    ctx.save();
    ctx.translate(e.x, e.y + r * 0.62);
    ctx.scale(1, 0.38);
    ctx.rotate(now * 0.0016);
    ctx.strokeStyle = p2SigilCols[0];
    ctx.lineWidth = 3.8;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.50, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = p2SigilCols[1];
    for (let k = 0; k < 4; k++) {
      const ka = k * Math.PI * 0.5;
      const kx = Math.cos(ka) * r * 1.50, ky = Math.sin(ka) * r * 1.50;
      ctx.fillRect(kx - 4, ky - 4, 8, 8);
    }
    ctx.rotate(-now * 0.0034);
    ctx.strokeStyle = p2SigilCols[1];
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  } else if (showP2Visual) {
    ctx.strokeStyle = 'rgba(246, 211, 121, 0.90)';
    ctx.lineWidth = 3.0;
    ctx.beginPath(); ctx.arc(e.x, e.y + 2, r + 14 + Math.sin(now * 0.014) * 3, 0, Math.PI * 2); ctx.stroke();
  } else if (e.elite) {
    // 双形态狂化精英高辨识度微光气场：
    // - frenzy（血怒狂化：攻速/移速/血量 +20%）-> 隐隐发红呼吸微光 + 双翼赤色疾风纹
    // - deathrattle（金梭亡语：死后迸射 4 枚黄色小箭头）-> 隐隐泛黄呼吸微光 + 四角金色小箭菱标
    const ep = 0.5 + 0.5 * Math.sin(now * 0.008 + (e.phase || 0));
    const isFrenzy = e.eliteKind === 'frenzy';
    ctx.fillStyle = isFrenzy
      ? `rgba(255, 52, 86, ${(0.11 + ep * 0.07).toFixed(3)})`
      : `rgba(251, 191, 36, ${(0.11 + ep * 0.07).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(e.x, e.y - r * 0.14, r * 1.18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = isFrenzy ? 'rgba(255, 77, 109, 0.80)' : 'rgba(251, 191, 36, 0.80)';
    ctx.lineWidth = 2.3;
    const er = r + 5 + ep * 1.5;
    ctx.beginPath(); ctx.arc(e.x, e.y + 3, er, 0, Math.PI * 2); ctx.stroke();
    if (isFrenzy) {
      ctx.strokeStyle = '#ff758f';
      ctx.lineWidth = 1.8;
      for (let side = -1; side <= 1; side += 2) {
        const cx = e.x + side * (er + 3.5), cy = e.y + 1 - ep * 2;
        ctx.beginPath();
        ctx.moveTo(cx - side * 3, cy + 4);
        ctx.lineTo(cx, cy - 2);
        ctx.lineTo(cx + side * 2.5, cy + 3);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#fde68a';
      for (let k = 0; k < 4; k++) {
        const pa = Math.PI * 0.25 + k * Math.PI * 0.5 + now * 0.0018;
        const px = e.x + Math.cos(pa) * (er + 2.5);
        const py = e.y + 3 + Math.sin(pa) * (er + 2.5);
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    }
  } else if (isBoss) {
    ctx.strokeStyle = (e.hp < e.maxHp * 0.55 || overtime) ? 'rgba(251, 113, 133, 0.85)' : 'rgba(229, 184, 105, 0.58)';
    ctx.lineWidth = 3.0;
    ctx.beginPath(); ctx.arc(e.x, e.y + 4, r + 9, 0, Math.PI * 2); ctx.stroke();
  }

  // 首领直线突进蓄力聚气环（提前给玩家清晰的起手视觉信号）
  const isWindingUp = e.lockedAim !== undefined && !e.dashing;
  if (isWindingUp) {
    ctx.strokeStyle = e.dashWarnColor || '#ffd166';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(e.x, e.y, r + 8 + Math.sin(now * 0.03) * 3, 0, Math.PI * 2); ctx.stroke();
  }

  if ((e.pylonBrokenT || 0) > 0) {
    ctx.save();
    ctx.strokeStyle = '#72efdd';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([10, 5]);
    ctx.beginPath(); ctx.arc(e.x, e.y, r + 15, now * 0.0022, now * 0.0022 + Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(e.x, e.y, r + 10, -now * 0.0028, -now * 0.0028 + Math.PI * 2); ctx.stroke();
    ctx.restore();
  } else if (e.exposeT > 0) {
    ctx.save();
    ctx.strokeStyle = '#f6d379';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(e.x, e.y, r + 12, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // 2. 首领与统领全技能施法动作解算（浮空咏唱 / 蓄势屈膝 / 挥刃前扑 / 炮口后坐 / 重踏下砸 / 相位分身）
  const bossSheet = (isBoss && e.variant && typeof SpireAssets !== 'undefined' && (SpireAssets.getBossSheet || SpireAssets.getHeroSheet))
    ? (SpireAssets.getBossSheet ? SpireAssets.getBossSheet(e.variant, flash, true, showP2Visual) : SpireAssets.getHeroSheet(e.variant, flash))
    : null;
  let aimHintA = e.lockedAim;
  if (aimHintA === undefined && (e._actPoseT || 0) > 0 && Number.isFinite(e._actAng)) aimHintA = e._actAng;
  if (aimHintA === undefined && (e.venomWindupT > 0 || e.venomBreathT > 0) && Number.isFinite(e.venomAimA)) aimHintA = e.venomAimA;
  const targetFace = aimHintA !== undefined
    ? (Math.cos(aimHintA) < 0 ? -1 : 1)
    : ((player && player.x < e.x - 4) ? -1 : 1);

  let poseOffX = 0, poseOffY = 0, poseSx = 1, poseSy = 1, poseTilt = 0, castPower = 0;
  let bossCastingOrActing = false;
  if (isBoss || isMini) {
    const isHeavySig = (e.sigWindupT || 0) > 0 && (e.sigKind === 'crimson_cross' || e.sigKind === 'omega_cross_beam');
    const isHeavyP2 = (e.p2WindupT || 0) > 0 && (e.p2Kind === 'p2_crimson_prison' || e.p2Kind === 'p2_omega_storm');
    const isMagicWindup = (((e.sigWindupT || 0) > 0 && !isHeavySig) || ((e.p2WindupT || 0) > 0 && !isHeavyP2) || (e.beamWindupT || 0) > 0 || (e.tpWindupT || 0) > 0);
    const isHeavyWindup = isWindingUp || isHeavySig || isHeavyP2 || (e.venomWindupT || 0) > 0;
    const isChanneling = (e.beamSweepT || 0) > 0 || (e.venomBreathT || 0) > 0 || (e.laserGridT || 0) > 0 || !!e.duelRing || !!e.eclipseSingularity || (e.burstLeft || 0) > 0;
    const actRatio = (e._actPoseT || 0) > 0 ? Math.max(0, Math.min(1, e._actPoseT / Math.max(0.12, e._actPoseMax || 0.48))) : 0;
    const actBurst = Math.sin(actRatio * Math.PI);
    bossCastingOrActing = !!(e.dashing || isMagicWindup || isHeavyWindup || isChanneling || actRatio > 0.05);

    if (isMagicWindup) {
      const wMax = (e.p2WindupT || 0) > 0 ? (e.p2WindupMax || 0.9) : ((e.sigWindupT || 0) > 0 ? (e.sigMaxW || 0.9) : ((e.beamWindupT || 0) > 0 ? (e.beamWindupMax || 0.55) : (e.tpWindupMax || 0.6)));
      const wCur = (e.p2WindupT || 0) > 0 ? e.p2WindupT : ((e.sigWindupT || 0) > 0 ? e.sigWindupT : ((e.beamWindupT || 0) > 0 ? e.beamWindupT : (e.tpWindupT || 0)));
      const prog = Math.max(0, Math.min(1, 1 - wCur / Math.max(0.15, wMax)));
      poseOffY -= (6 + prog * 9) + Math.sin(now * 0.018) * 2.8;
      poseSx *= 1 - prog * 0.05;
      poseSy *= 1 + prog * 0.08;
      poseTilt += Math.sin(now * 0.015) * 0.05;
      castPower = Math.max(castPower, 0.35 + prog * 0.65);
    } else if (isHeavyWindup) {
      poseOffX += Math.sin(now * 0.085) * 1.8;
      poseOffY += 5.5;
      poseSx *= 1.09;
      poseSy *= 0.89;
      poseTilt -= 0.06;
      castPower = Math.max(castPower, 0.72);
    }
    if (isChanneling) {
      if ((e.venomBreathT || 0) > 0) {
        const va = e.venomAimA || 0;
        poseOffX += Math.cos(va) * 6;
        poseOffY += Math.sin(va) * 4;
        poseTilt += 0.09;
      } else if ((e.burstLeft || 0) > 0) {
        poseOffX += Math.sin(now * 0.09) * 2.4;
      } else {
        poseOffY -= 8.5 + Math.sin(now * 0.015) * 3.0;
        poseSy *= 1.05;
      }
      castPower = Math.max(castPower, 0.82);
    }
    if (e.dashing) {
      poseSx *= 1.10;
      poseSy *= 0.93;
      poseTilt += 0.11;
      castPower = Math.max(castPower, 0.78);
    }
    if (actRatio > 0.01) {
      const aa = Number.isFinite(e._actAng) ? e._actAng : (e.faceA || 0);
      const ak = e._actKind || 'cast_up';
      castPower = Math.max(castPower, actBurst * 0.95);
      if (ak === 'slash' || ak === 'thrust') {
        poseOffX += Math.cos(aa) * 14 * actBurst;
        poseOffY += Math.sin(aa) * 10 * actBurst;
        poseSx *= 1 + 0.12 * actBurst;
        poseSy *= 1 - 0.06 * actBurst;
        poseTilt += 0.16 * actBurst;
      } else if (ak === 'cast_up') {
        poseOffY -= 13 * actBurst;
        poseSx *= 1 - 0.05 * actBurst;
        poseSy *= 1 + 0.11 * actBurst;
      } else if (ak === 'slam') {
        if (actRatio > 0.55) {
          const lift = Math.sin(((actRatio - 0.55) / 0.45) * Math.PI);
          poseOffY -= 13 * lift;
          poseSx *= 1 - 0.06 * lift;
          poseSy *= 1 + 0.10 * lift;
        } else {
          const crush = Math.sin((actRatio / 0.55) * Math.PI);
          poseOffY += 6.5 * crush;
          poseSx *= 1 + 0.14 * crush;
          poseSy *= 1 - 0.12 * crush;
        }
      } else if (ak === 'recoil') {
        poseOffX -= Math.cos(aa) * 8.5 * actBurst;
        poseOffY -= Math.sin(aa) * 6.0 * actBurst;
        poseSx *= 1 + 0.07 * actBurst;
        poseSy *= 1 - 0.05 * actBurst;
        poseTilt -= 0.08 * actBurst;
      } else if (ak === 'spin') {
        poseOffX += Math.cos(now * 0.036) * 7 * actBurst;
        poseOffY -= 6 * actBurst;
        poseTilt += Math.sin(now * 0.04) * 0.18 * actBurst;
      }
    }
    if (castPower > 0.04) {
      _drawBossCastPhenomena(e, r, now, e.x + poseOffX, e.y + poseOffY, castPower);
    }
  }

  if (bossSheet && bossSheet.canvas) {
    // 传入 false 让 _stepEntityAnim 完全依据真实位移速度 (_smoothSpd > 22) 驱动迈步，站桩施法时绝不假跑，且施法/蓄力/出招全程切入第 4 帧出招立绘！
    const dt = _stepEntityAnim(e, now, false, targetFace, bossCastingOrActing);
    const drawSize = Math.max(209, r * 3.20);
    const footOffset = r * 0.90;
    const visFlip = Math.abs(e._visFlip) < 0.24 ? (e._visFlip < 0 ? -0.24 : 0.24) : e._visFlip;

    if (e.dashing || (e.tpWindupT || 0) > 0 || ((e._actPoseT || 0) > 0.15 && (e._actKind === 'slash' || e._actKind === 'thrust' || e._actKind === 'spin'))) {
      _pushGhostTrail(e, now, e._curFrameIdx, visFlip < 0 ? -1 : 1, 38);
    }
    _decayAndDrawGhostTrail(e, dt, (SpireAssets.getBossSheet ? SpireAssets.getBossSheet(e.variant, false, true, showP2Visual) : SpireAssets.getHeroSheet(e.variant, false)) || bossSheet, drawSize, footOffset);

    // 伽蓝相位折跃蓄力期间额外浮现左右裂相残影分身，直观传达“即将空间折跃”
    if ((e.tpWindupT || 0) > 0) {
      const splitOff = (1 - Math.min(1, e.tpWindupT / Math.max(0.15, e.tpWindupMax || 0.6))) * 22;
      const cw0 = bossSheet.cellW, ch0 = bossSheet.cellH;
      const cellX0 = Math.min(bossSheet.frames - 1, Math.max(0, e._curFrameIdx || 0)) * cw0;
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.translate(e.x - splitOff, e.y + footOffset + poseOffY);
      ctx.scale(visFlip * poseSx, poseSy);
      ctx.drawImage(bossSheet.canvas, cellX0, 0, cw0, ch0, -drawSize * 0.5, -drawSize * 0.93, drawSize, drawSize);
      ctx.restore();
    }

    const strideBob = e._moveBlend * Math.abs(Math.sin((e._strideT || 0) * Math.PI * 0.5)) * 4.2;
    const turnHop = (1 - Math.min(1, Math.abs(e._visFlip))) * 3.0;
    const idleBreath = bossCastingOrActing ? 1 : (1 + Math.sin(now * 0.005 + e.phase) * 0.022);

    ctx.save();
    ctx.translate(e.x + poseOffX, e.y + footOffset - strideBob - turnHop + poseOffY);
    if (poseTilt) ctx.rotate(poseTilt * (visFlip < 0 ? -1 : 1));
    ctx.scale(visFlip * poseSx, poseSy * idleBreath);
    const cw = bossSheet.cellW, ch = bossSheet.cellH;
    const cellX = Math.min(bossSheet.frames - 1, Math.max(0, e._curFrameIdx || 0)) * cw;
    ctx.drawImage(bossSheet.canvas, cellX, 0, cw, ch, -drawSize * 0.5, -drawSize * 0.93, drawSize, drawSize);
    ctx.restore();
  } else {
    const pulse = e.primed ? (1 + Math.sin(now * 0.036) * 0.14) : 1;
    const bob = (isBoss || isMini) && bossCastingOrActing ? 0 : (Math.abs(Math.sin(e.phase * 0.9)) * (isBoss ? 3.5 : 2.4));
    const tilt = (!isBoss && !isMini) ? Math.sin(e.phase * 0.9) * 0.048 : (poseTilt * targetFace);
    const spr = (typeof SpireAssets !== 'undefined') ? SpireAssets.getMonsterSprite(e, flash) : null;

    if ((isBoss || isMini) && spr && spr.canvas && (e.dashing || (e.tpWindupT || 0) > 0 || (e._actPoseT || 0) > 0.18)) {
      const ghostSize = isBoss ? Math.max(199, r * 3.20) : Math.max(161, r * 3.08);
      const gsc = ghostSize / Math.max(16, Math.max(spr.w, spr.h));
      const gdw = spr.w * gsc, gdh = spr.h * gsc;
      const backA = e.dashing ? (e.dashAng || 0) : (e._actAng || e.faceA || 0);
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.translate(e.x - Math.cos(backA) * 16, e.y - Math.sin(backA) * 12);
      ctx.scale(targetFace * poseSx, poseSy);
      ctx.drawImage(spr.canvas, -gdw * 0.5, -gdh * 0.56, gdw, gdh);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(e.x + poseOffX, e.y - bob + poseOffY);
    if (tilt) ctx.rotate(tilt);
    ctx.scale(targetFace * pulse * poseSx, pulse * poseSy);

    if (spr && spr.canvas) {
      const targetSize = isBoss
        ? Math.max(199, r * 3.20)
        : (isMini ? Math.max(161, r * 3.08) : Math.max(60, r * 3.22));
      const sc = targetSize / Math.max(16, Math.max(spr.w, spr.h));
      const dw = spr.w * sc, dh = spr.h * sc;
      try {
        ctx.drawImage(spr.canvas, -dw * 0.5, -dh * 0.56, dw, dh);
      } catch (_) {
        if (spr.rawImg && spr.rawImg !== spr.canvas) {
          try { ctx.drawImage(spr.rawImg, -dw * 0.5, -dh * 0.56, dw, dh); } catch (_e) {}
        }
      }
    } else {
      // 极端弱网贴图流式解码过渡期：绘制哥特暗影魔偶剪影（斗篷肩甲+双角+魂瞳），彻底告别纯色圆球占位
      const bodyCol = flash ? '#f8d7da' : '#161d2e';
      const trimCol = flash ? '#ffffff' : (e.color || '#be123c');
      ctx.fillStyle = bodyCol;
      ctx.strokeStyle = trimCol;
      ctx.lineWidth = Math.max(1.8, r * 0.11);
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.18);
      ctx.lineTo(r * 0.68, -r * 0.36);
      ctx.lineTo(r * 0.92, r * 0.72);
      ctx.lineTo(r * 0.34, r * 0.46);
      ctx.lineTo(0, r * 0.84);
      ctx.lineTo(-r * 0.34, r * 0.46);
      ctx.lineTo(-r * 0.92, r * 0.72);
      ctx.lineTo(-r * 0.68, -r * 0.36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 双角/冠冕与发光魂瞳
      ctx.beginPath();
      ctx.moveTo(-r * 0.36, -r * 0.82); ctx.lineTo(-r * 0.64, -r * 1.32); ctx.lineTo(-r * 0.12, -r * 0.98);
      ctx.moveTo(r * 0.36, -r * 0.82);  ctx.lineTo(r * 0.64, -r * 1.32);  ctx.lineTo(r * 0.12, -r * 0.98);
      ctx.fillStyle = trimCol;
      ctx.fill();
      ctx.fillStyle = flash ? '#090d16' : '#fde68a';
      ctx.fillRect(-r * 0.32, -r * 0.42, Math.max(2.2, r * 0.22), Math.max(2, r * 0.14));
      ctx.fillRect(r * 0.10, -r * 0.42, Math.max(2.2, r * 0.22), Math.max(2, r * 0.14));
    }
    ctx.restore();
  }

  // 首领挥斩/突刺/炮击瞬间的前向锋芒冲击弧（强化出招瞬间打击张力）
  if ((isBoss || isMini) && (e._actPoseT || 0) > 0 && (e._actKind === 'slash' || e._actKind === 'thrust' || e._actKind === 'recoil')) {
    const ar = Math.max(0, Math.min(1, e._actPoseT / Math.max(0.12, e._actPoseMax || 0.48)));
    const aa = Number.isFinite(e._actAng) ? e._actAng : (e.faceA || 0);
    ctx.save();
    ctx.globalAlpha = Math.sin(ar * Math.PI) * 0.82;
    ctx.translate(e.x + poseOffX, e.y + poseOffY);
    ctx.rotate(aa);
    ctx.strokeStyle = e._actCol || '#fde68a';
    ctx.lineWidth = 3.0;
    if (e._actKind === 'thrust') {
      ctx.beginPath();
      ctx.moveTo(r * 0.45, -8); ctx.lineTo(r * 1.48, 0); ctx.lineTo(r * 0.45, 8);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(4, 0, r + 14 * (1 - ar * 0.35), -0.95, 0.95);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. 四象元素异常状态高辨识度清爽叠层（仅在存在元素异常时开启画布状态栈，节省高频 save/restore）
  if (((e.freezeT > 0 || e.chillT > 0) && !flash) || e.burnT > 0) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.freezeT > 0 && !flash) {
      ctx.fillStyle = 'rgba(114, 239, 221, 0.34)';
      ctx.strokeStyle = '#e0fbfc';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ia = (k * Math.PI) / 3 - Math.PI / 6;
        const ir = r * 1.12;
        k === 0 ? ctx.moveTo(Math.cos(ia) * ir, Math.sin(ia) * ir) : ctx.lineTo(Math.cos(ia) * ir, Math.sin(ia) * ir);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (e.chillT > 0 && !flash) {
      ctx.fillStyle = 'rgba(114, 239, 221, 0.20)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2); ctx.fill();
    }

    if (e.burnT > 0) {
      const flk = Math.sin(now * 0.026 + e.phase) * 2.5;
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(-5, -r * 0.7); ctx.quadraticCurveTo(0, -r - 13 + flk, 5, -r * 0.7);
      ctx.fill();
    }
    ctx.restore();
  }

  if (e.type === 'shielder') {
    ctx.strokeStyle = '#72efdd'; ctx.lineWidth = 5.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(e.x, e.y, r + 5, e.faceA - 0.85, e.faceA + 0.85); ctx.stroke();
  }

  if ((e.d5LastStandT || 0) > 0 && isBoss) {
    const lsRatio = Math.max(0, Math.min(1, e.d5LastStandT / Math.max(0.1, e.d5LastStandMaxT || 10.0)));
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.strokeStyle = 'rgba(255, 42, 85, 0.86)';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.arc(0, 0, r + 16, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * lsRatio);
    ctx.stroke();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([9, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 23, now * 0.005, now * 0.005 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '900 12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const lsTxt = `🩸 临死挣扎·无敌 ${e.d5LastStandT.toFixed(1)}s`;
    const lw = 166;
    const ly = -r - 56;
    ctx.fillStyle = 'rgba(42, 6, 18, 0.50)';
    ctx.strokeStyle = 'rgba(255, 77, 109, 0.70)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-lw * 0.5, ly - 12, lw, 20, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.fillText(lsTxt, 0, ly + 2);
    ctx.restore();
  }

  const activeWindup = (e.p2WindupT || 0) > 0 ? e.p2WindupT : (e.sigWindupT || 0);
  const activeMaxW = (e.p2WindupT || 0) > 0 ? (e.p2WindupMax || 0.78) : (e.sigMaxW || 0.88);
  const activeBadgeTxt = (e.p2WindupT || 0) > 0 ? (e.p2Label || e.castLabel) : e.castLabel;
  if (activeWindup > 0 && activeBadgeTxt && (isBoss || isMini)) {
    const wProg = Math.max(0, Math.min(1, 1 - activeWindup / Math.max(0.1, activeMaxW)));
    ctx.save();
    ctx.font = '900 12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const cw = Math.max(132, Math.min(238, activeBadgeTxt.length * 13 + 24));
    const cy = e.y - r - 34;
    ctx.fillStyle = (e.p2WindupT || 0) > 0 ? 'rgba(34, 8, 20, 0.50)' : 'rgba(12, 9, 22, 0.48)';
    ctx.strokeStyle = (e.p2WindupT || 0) > 0 ? 'rgba(255, 209, 102, 0.72)' : 'rgba(253, 230, 138, 0.68)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(e.x - cw * 0.5, cy - 12, cw, 20, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(251, 113, 133, 0.44)';
    ctx.fillRect(e.x - cw * 0.5 + 3, cy + 4, Math.max(2, (cw - 6) * wProg), 2.5);
    ctx.fillStyle = '#fef08a';
    ctx.fillText(activeBadgeTxt, e.x, cy + 2);
    ctx.restore();
  } else if ((e.pylonBrokenT || 0) > 0 && (isBoss || e.type === 'special_boss')) {
    ctx.font = '800 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`破防承伤+20% (${Math.ceil(e.pylonBrokenT)}s)`, e.x, e.y + r + 20);
  } else if (e.exposeT > 0 && isBoss) {
    ctx.font = '800 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6d379';
    ctx.fillText('破绽易伤', e.x, e.y + r + 20);
  }
  if (e.poisonT > 0 && e.poisonStacks >= 2 && (isBoss || isMini || e.elite)) {
    ctx.font = '800 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a3e635';
    ctx.fillText(`毒×${e.poisonStacks}`, e.x, e.y - r - 24);
  }

  // 双首领 / 多主宰同屏时，每位首领头顶同步绘制精致独立血条（一阶绯红 / 二阶神话鎏金），一眼锁定集火目标
  if (isBoss || isMini) {
    let multiBossAlive = 0;
    if (typeof enemies !== 'undefined') {
      for (let bi = 0; bi < enemies.length; bi++) {
        const be = enemies[bi];
        if (be.hp > 0 && (be.type === 'boss' || be.type === 'mini_boss' || be.type === 'special_boss')) {
          multiBossAlive++;
          if (multiBossAlive >= 2) break;
        }
      }
    }
    if (multiBossAlive >= 2) {
      const bw = Math.max(76, r * 1.95);
      const barY = e.y - Math.max(r + 18, r * 1.85);
      const hpRatio = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
      ctx.save();
      ctx.fillStyle = 'rgba(8, 10, 18, 0.84)';
      ctx.strokeStyle = e.mythicPhase2 ? '#ffd166' : 'rgba(251, 113, 133, 0.78)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.roundRect(e.x - bw * 0.5, barY, bw, 7, 3.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = e.mythicPhase2 ? '#ffd166' : (e.type === 'special_boss' ? '#c77dff' : '#ff3b6b');
      if (hpRatio > 0.005) {
        ctx.fillRect(e.x - bw * 0.5 + 1.5, barY + 1.5, Math.max(2, (bw - 3) * hpRatio), 4);
      }
      ctx.restore();
    }
  } else if (e.type === 'brute' || e.type === 'juggernaut' || e.type === 'iron_guard' || e.elite || e.hp < e.maxHp) {
    const bw = Math.max(30, r * 1.85);
    const barY = e.y - Math.max(r + 16, r * 1.48);
    ctx.fillStyle = 'rgba(6,9,16,0.82)';
    ctx.fillRect(e.x - bw / 2, barY, bw, 5.5);
    const eliteBarCol = e.eliteKind === 'frenzy' ? '#ff4d6d' : '#fbbf24';
    ctx.fillStyle = e.freezeT > 0 ? '#72efdd' : (e.poisonStacks > 0 ? '#a3e635' : (e.burnT > 0 ? '#fb923c' : (e.elite ? eliteBarCol : '#fb7185')));
    ctx.fillRect(e.x - bw / 2 + 1, barY + 1, (bw - 2) * Math.max(0, e.hp / e.maxHp), 3.5);
    if (e.elite) {
      const isFrenzy = e.eliteKind === 'frenzy';
      const tagX = e.x - bw / 2 - 12;
      ctx.fillStyle = isFrenzy ? 'rgba(136, 19, 55, 0.92)' : 'rgba(120, 53, 15, 0.92)';
      ctx.fillRect(tagX, barY - 2.5, 11, 10.5);
      ctx.strokeStyle = isFrenzy ? '#ff4d6d' : '#fbbf24';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(tagX, barY - 2.5, 11, 10.5);
      ctx.font = '900 8.5px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isFrenzy ? '#ffe4e6' : '#fef3c7';
      ctx.fillText(isFrenzy ? '狂' : '亡', tagX + 5.5, barY + 5.5);
    }
  }
}

// 🕯️ 6 位《烬塔残响》登塔角色 1024×256 四帧丝滑动作渲染（速度同步步频 + 柔顺转身 + 招牌出招帧 + 清晰受击判定光圈）
function drawPotatoHero() {
  const p = player;
  if (!p) return;
  const it = p.items || {};
  const now = _syncNow();

  // 1. 地面接触阴影与脚底轻量站位底椭圆（主角视觉模型与受伤判定半径同步提升 +15%）
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 25, 23, 8.6, 0, 0, Math.PI * 2); ctx.fill();

  const zeroRingCol = (p.cls === 'allrounder' && typeof getActiveZeroOutfit === 'function')
    ? (getActiveZeroOutfit().id === 'crimson' ? 'rgba(251, 113, 133, 0.48)' : (getActiveZeroOutfit().id === 'witch' ? 'rgba(192, 132, 252, 0.48)' : (getActiveZeroOutfit().id === 'astral' ? 'rgba(96, 165, 250, 0.48)' : 'rgba(114, 239, 221, 0.42)')))
    : 'rgba(114, 239, 221, 0.42)';
  ctx.strokeStyle = it.berserk ? 'rgba(251, 113, 133, 0.50)' : zeroRingCol;
  ctx.lineWidth = 1.9;
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 24, 24.2, 9.0, 0, 0, Math.PI * 2); ctx.stroke();

  // 2. 4 帧动作精灵表状态机与柔顺插值绘制（仅真实扣血受击时柔和微闪，瞬步/过场无敌态不闪白）
  const hurtFlash = (p.hurtFlashT || 0) > 0 && (((p.hurtFlashT * 16) | 0) % 2 === 0);
  const inAtkPose = (p._atkPoseT || 0) > 0;
  const desiredFace = (inAtkPose && p._atkAimX !== undefined && Math.abs(p._atkAimX) > 0.16)
    ? (p._atkAimX < 0 ? -1 : 1)
    : (p.faceDir || 1);
  const dt = _stepEntityAnim(p, now, !!p.moving, desiredFace, inAtkPose);

  const heroSheet = (typeof SpireAssets !== 'undefined' && SpireAssets.getHeroSheet)
    ? SpireAssets.getHeroSheet(p.cls, hurtFlash)
    : null;

  const drawSize = 94;
  const footAnchorY = 26;
  const visFlip = Math.abs(p._visFlip) < 0.24 ? (p._visFlip < 0 ? -0.24 : 0.24) : p._visFlip;

  if (heroSheet && heroSheet.canvas) {
    // 仅在主动灵魂瞬步（inDash）期间绘制精简残影，移除后期高移速常驻精灵表重绘开销
    const inDash = (p.dashT || 0) > 0;
    if (inDash) {
      _pushGhostTrail(p, now, 3, visFlip < 0 ? -1 : 1, 32, 0.42);
    }
    _decayAndDrawGhostTrail(p, dt, SpireAssets.getHeroSheet(p.cls, false) || heroSheet, drawSize, footAnchorY);

    if (inDash || (p.dashHasteT || 0) > 0) {
      ctx.save();
      ctx.strokeStyle = inDash ? 'rgba(114, 239, 221, 0.85)' : 'rgba(110, 231, 183, 0.52)';
      ctx.lineWidth = inDash ? 2.9 : 1.9;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 22, inDash ? 32.2 : 27.6, inDash ? 12.1 : 10.4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    const strideBob = p._moveBlend * Math.abs(Math.sin((p._strideT || 0) * Math.PI * 0.5)) * 4.4
      + (1 - p._moveBlend) * Math.sin(now * 0.0042) * 1.6;
    const turnHop = (1 - Math.min(1, Math.abs(p._visFlip))) * 3.1;
    const tilt = (p._leanA || 0) + p._moveBlend * Math.sin((p._strideT || 0) * Math.PI * 0.5) * 0.048;
    const lungeP = inAtkPose ? Math.min(1, (p._atkPoseT || 0) * 6.0) : 0;
    const lungeX = lungeP ? Math.cos(p._atkAngle || 0) * 4.2 * lungeP : 0;
    const lungeY = lungeP ? Math.sin(p._atkAngle || 0) * 2.7 * lungeP : 0;
    const sxScale = inDash ? 1.07 : (inAtkPose ? (1 + 0.045 * lungeP) : 1);
    const syScale = inDash ? 0.93 : (inAtkPose ? (1 - 0.032 * lungeP) : (1 + (1 - p._moveBlend) * Math.sin(now * 0.0042) * 0.018));

    ctx.save();
    ctx.translate(p.x + lungeX, p.y + footAnchorY + lungeY - strideBob - turnHop);
    if (tilt) ctx.rotate(tilt);
    ctx.scale(visFlip * sxScale, syScale);
    if (p.cls === 'ghost') ctx.globalAlpha = 0.93;
    const cw = heroSheet.cellW, ch = heroSheet.cellH;
    const sx = Math.min(heroSheet.frames - 1, Math.max(0, p._curFrameIdx || 0)) * cw;
    ctx.drawImage(heroSheet.canvas, sx, 0, cw, ch, -drawSize * 0.5, -drawSize * 0.93, drawSize, drawSize);
    ctx.restore();
  } else {
    const bounce = p.moving ? Math.abs(Math.sin(p.walkT)) * 4.6 : Math.sin(now * 0.004) * 1.8;
    const tilt = p.moving ? Math.sin(p.walkT) * 0.06 : 0;
    const spr = (typeof SpireAssets !== 'undefined') ? SpireAssets.getHeroSprite(p.cls, hurtFlash) : null;

    ctx.save();
    ctx.translate(p.x, p.y + 25 - bounce);
    ctx.rotate(tilt);
    ctx.scale(visFlip, 1);
    if (p.cls === 'ghost') ctx.globalAlpha = 0.92;

    if (spr && spr.canvas) {
      const targetH = 87;
      const sc = targetH / Math.max(16, spr.h);
      const dw = spr.w * sc, dh = spr.h * sc;
      ctx.drawImage(spr.canvas, -dw * 0.5, -dh, dw, dh);
    } else {
      ctx.fillStyle = hurtFlash ? '#fff7ed' : '#f1efe7';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-18.4, 0); ctx.lineTo(-13.8, -50.6); ctx.quadraticCurveTo(0, -66.7, 13.8, -50.6); ctx.lineTo(18.4, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // 4. 魂灯能量护盾罩与环绕四象元素法球
  if (p.shield > 0) {
    const sr = p.r + 12;
    ctx.fillStyle = p.shieldHitT > 0 ? 'rgba(255, 255, 255, 0.24)' : 'rgba(114, 239, 221, 0.10)';
    ctx.beginPath(); ctx.arc(p.x, p.y - 4, sr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.shieldHitT > 0 ? '#ffffff' : 'rgba(114, 239, 221, 0.68)';
    ctx.lineWidth = 2.1;
    for (let k = 0; k < 3; k++) {
      const sa = now * 0.0025 + (k * Math.PI * 2) / 3;
      ctx.beginPath(); ctx.arc(p.x, p.y - 4, sr, sa, sa + 1.5); ctx.stroke();
    }
  }

  let orbMask = 0;
  if (p.teslaCount > 0) orbMask |= 1;
  if (it.napalm || it.warhead) orbMask |= 2;
  if (it.cryo || it.frost_prism) orbMask |= 4;
  if (it.venom_gland || it.plague_flask) orbMask |= 8;
  if (it.prism || it.cyberball || it.doom_edge) orbMask |= 16;

  if (orbMask !== 0) {
    const orbCols = [];
    if (orbMask & 1) orbCols.push('#72efdd');
    if (orbMask & 2) orbCols.push('#fb923c');
    if (orbMask & 4) orbCols.push('#38bdf8');
    if (orbMask & 8) orbCols.push('#a3e635');
    if (orbMask & 16) orbCols.push('#c084fc');
    for (let i = 0; i < orbCols.length; i++) {
      const oa = now * 0.0032 + (i * Math.PI * 2) / orbCols.length;
      const ox = p.x + Math.cos(oa) * 36, oy = p.y - 8 + Math.sin(oa) * 22.5;
      ctx.fillStyle = orbCols[i]; ctx.strokeStyle = '#090d16'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(ox, oy, 4.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  // 5. 寒冰地形渐进冰封状态视觉反馈（D1=4s -> D5=2s 寒霜进度条 + 冰封蓝宝石冰晶棱罩）
  if ((p.iceFreezeT || 0) > 0) {
    ctx.save();
    ctx.translate(p.x, p.y - 8);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.36)';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -39);
    ctx.lineTo(25, -16);
    ctx.lineTo(21, 25);
    ctx.lineTo(0, 34);
    ctx.lineTo(-21, 25);
    ctx.lineTo(-25, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.font = '900 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText(`❄️ 冰封 ${p.iceFreezeT.toFixed(1)}s`, 0, -45);
    ctx.restore();
  } else if ((p.frostGauge || 0) > 0.05) {
    const fPct = Math.max(0, Math.min(1, p.frostGauge / 5.0));
    const inGrace = (p.frostLeaveGrace || 0) > 0 && fPct > 0;
    const bw = 46, barY = p.y - 54;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 14, 24, 0.85)';
    ctx.strokeStyle = fPct >= 0.75 ? '#38bdf8' : 'rgba(125, 211, 252, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(p.x - bw * 0.5, barY, bw, 6, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = fPct >= 0.78 ? '#7dd3fc' : (inGrace ? '#38bdf8' : '#93c5fd');
    ctx.fillRect(p.x - bw * 0.5 + 1.5, barY + 1.5, Math.max(2, (bw - 3) * fPct), 3);
    ctx.restore();
  }

  // 最后 5 秒倒计时徽标
  if (state === 'wave' && !overtime && waveTime > 0 && waveTime <= 5) {
    const sec = Math.ceil(waveTime);
    ctx.save();
    ctx.translate(p.x, p.y - 68);
    ctx.fillStyle = 'rgba(28, 10, 20, 0.88)';
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-26, -13, 52, 24, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 15px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${sec}s`, 0, 4.5);
    ctx.restore();
  }
}

// 👑 首领登场 & 神话二阶段觉醒破框半身立绘系统（440×516 透明抠图 + 双旋星盘法阵 + 二阶六翼神辉，0 radialGradient / 0 shadowBlur）
function drawBossPortrait(variant, cx, cy, scale, isMythic) {
  const now = _syncNow();
  const s = scale || 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const RING_COLORS = {
    butcher: '#ff4d6d',
    frost_queen: '#72efdd',
    mech_colossus: '#ff9f1c',
    void_weaver: '#c77dff',
    plague_empress: '#52b788',
    solar_seraph: '#ffd166',
    crimson_lord: '#fb7185',
    golden_golem: '#ffd166',
    abyss_devourer: '#c77dff',
    vanguard: '#f72585',
    pyro_lord: '#fb5607',
    shadow_stalker: '#06d6a0',
    venom_matriarch: '#80ed99',
    glacial_valkyrie: '#48cae4',
    iron_warden: '#eab308',
    storm_siren: '#38bdf8'
  };
  const ringCol = isMythic ? '#ffd166' : (RING_COLORS[variant] || '#ff4d6d');
  const subCol = isMythic ? '#ff3b6b' : '#f6d379';

  // 神话二阶段专属：背后六翼炽金神辉羽刃 + 圣芒背环
  if (isMythic) {
    const wingPulse = Math.sin(now * 0.0042) * 3.5;
    ctx.fillStyle = 'rgba(255, 42, 85, 0.28)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.2;
    for (const dir of [-1, 1]) {
      for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        ctx.moveTo(dir * 10, 2 - w * 12);
        ctx.lineTo(dir * (132 - w * 14), -74 + w * 30 + wingPulse * (w === 0 ? -1 : 0.5));
        ctx.lineTo(dir * (96 - w * 11), -24 + w * 32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -10, 96, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 背后曜黑星芒法阵圆盘（角色头冠、长发与裙摆自然上下破框突出）
  ctx.fillStyle = isMythic ? 'rgba(34, 7, 19, 0.90)' : 'rgba(11, 14, 28, 0.88)';
  ctx.strokeStyle = ringCol;
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(0, -8, 82, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 外环顺时针断续星轨 + 内环逆时针符文刻线
  ctx.save();
  ctx.translate(0, -8);
  ctx.rotate(now * 0.0009);
  ctx.strokeStyle = subCol;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([18, 9, 4, 9]);
  ctx.beginPath();
  ctx.arc(0, 0, 90, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(-now * 0.0021);
  ctx.strokeStyle = isMythic ? 'rgba(255, 209, 102, 0.52)' : 'rgba(255, 255, 255, 0.34)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 左右悬浮四角星芒点缀
  ctx.fillStyle = isMythic ? '#ffd166' : ringCol;
  for (const dir of [-1, 1]) {
    const sx = dir * 94, sy = -42 + Math.sin(now * 0.003 + dir) * 3.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 7);
    ctx.lineTo(sx + 2.4, sy - 2.4);
    ctx.lineTo(sx + 7, sy);
    ctx.lineTo(sx + 2.4, sy + 2.4);
    ctx.lineTo(sx, sy + 7);
    ctx.lineTo(sx - 2.4, sy + 2.4);
    ctx.lineTo(sx - 7, sy);
    ctx.lineTo(sx - 2.4, sy - 2.4);
    ctx.closePath();
    ctx.fill();
  }

  // 绘制高清半身破框立绘（440×516 黄金半身比例：一阶段专属夏装 / 二阶段专属隐藏泳装换装）
  const animeImg = typeof getBossAnimePortrait === 'function' ? getBossAnimePortrait(variant, !!isMythic) : null;
  if (animeImg) {
    const iw = animeImg.width || animeImg.naturalWidth || 440;
    const ih = animeImg.height || animeImg.naturalHeight || 516;
    const isTallFallback = ih > iw * 1.3;
    const breath = Math.sin(now * 0.0024) * 2.2;
    const sway = Math.cos(now * 0.0015) * 1.0;
    ctx.imageSmoothingEnabled = true;
    if (isTallFallback) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -8, 78, 0, Math.PI * 2);
      ctx.clip();
      const sc = 166 / Math.min(iw, ih);
      const dw = iw * sc, dh = ih * sc;
      ctx.drawImage(animeImg, -dw * 0.5, -dh * 0.44, dw, dh);
      ctx.restore();
    } else {
      const dw = 192, dh = 225;
      ctx.drawImage(animeImg, -dw * 0.5 + sway, -dh * 0.52 + breath, dw, dh);
    }

    // 底部双层鎏金棱钻托座铭纹（优雅承接半身立绘柔化下缘）
    ctx.strokeStyle = ringCol;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-58, 96);
    ctx.lineTo(0, 104);
    ctx.lineTo(58, 96);
    ctx.stroke();
    ctx.fillStyle = subCol;
    ctx.beginPath();
    ctx.moveTo(0, 99);
    ctx.lineTo(5.5, 104);
    ctx.lineTo(0, 109);
    ctx.lineTo(-5.5, 104);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// 🩸 预烘焙「八荒血月斩」刀波离屏精灵（零 createRadialGradient / 零 shadowBlur，首帧立即可用永不漏贴图！）
let _bloodMoonWaveCanvas = null;
function getBloodMoonWaveSprite() {
  if (_bloodMoonWaveCanvas) return _bloodMoonWaveCanvas;
  if (typeof document === 'undefined') return null;
  const off = document.createElement('canvas');
  off.width = 96;
  off.height = 96;
  const g = off.getContext('2d');
  if (g) {
    g.save();
    g.translate(48, 48);
    // 外层暗红血雾残弧
    g.fillStyle = 'rgba(225, 29, 72, 0.36)';
    g.beginPath();
    g.arc(-6, 0, 36, -1.24, 1.24);
    g.quadraticCurveTo(8, 0, -6 + Math.cos(-1.24) * 36, Math.sin(-1.24) * 36);
    g.closePath();
    g.fill();
    // 主体绯红弯月刃身
    g.fillStyle = '#fb7185';
    g.strokeStyle = '#881337';
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(-4, 0, 30, -1.16, 1.16);
    g.quadraticCurveTo(11, 0, -4 + Math.cos(-1.16) * 30, Math.sin(-1.16) * 30);
    g.closePath();
    g.fill();
    g.stroke();
    // 内层赤金锋芒亮脊
    g.fillStyle = '#fde68a';
    g.beginPath();
    g.arc(-1, 0, 24, -0.96, 0.96);
    g.quadraticCurveTo(12, 0, -1 + Math.cos(-0.96) * 24, Math.sin(-0.96) * 24);
    g.closePath();
    g.fill();
    // 刀尖纯白破空高光
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(23, 0); g.lineTo(15, -5); g.lineTo(18, 0); g.lineTo(15, 5);
    g.closePath();
    g.fill();
    g.restore();
  }
  _bloodMoonWaveCanvas = off;
  return _bloodMoonWaveCanvas;
}
globalThis.getBloodMoonWaveSprite = getBloodMoonWaveSprite;
