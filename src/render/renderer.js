// 绘制嵌地石砌方砖真地形块（细长矩石槽 / 折角L型块 / T型拼接块 / 错位阶梯双拼块 / 重型方砖池 / 石砌断层深渊，0渐变0滤镜）
function tracePolygon(verts) {
  if (!verts || !verts.length) return;
  ctx.beginPath();
  for (let k = 0; k < verts.length; k++) {
    if (k === 0) ctx.moveTo(verts[k].x, verts[k].y);
    else ctx.lineTo(verts[k].x, verts[k].y);
  }
  ctx.closePath();
}

function tracePolygonOffset(verts, ox = 0, oy = 0) {
  if (!verts || !verts.length) return;
  ctx.beginPath();
  for (let k = 0; k < verts.length; k++) {
    const px = verts[k].x + ox, py = verts[k].y + oy;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function _strokeSegList(segs) {
  if (!segs || !segs.length) return;
  ctx.beginPath();
  for (let i = 0; i < segs.length; i++) {
    const sg = segs[i];
    ctx.moveTo(sg.x1, sg.y1);
    ctx.lineTo(sg.x2, sg.y2);
  }
  ctx.stroke();
}

function drawSingleTerrain(tr, showLabel = false) {
  if (!tr) return;
  if (typeof ensureTerrainGeometry === 'function') ensureTerrainGeometry(tr);
  ctx.save();
  if (tr.kind === 'chasm') {
    // 嵌地石砌断层深渊槽：切角花岗石外框 + 砖缝刻线 + 三阶下沉石阶 + 紫晶次元裂口
    if (tr.outerCliff && tr.outerCliff.length >= 4) {
      ctx.fillStyle = 'rgba(4, 6, 14, 0.46)';
      tracePolygonOffset(tr.outerCliff, 3, 5);
      ctx.fill();

      ctx.fillStyle = '#2d2542';
      tracePolygon(tr.outerCliff);
      ctx.fill();
      ctx.strokeStyle = '#090712';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      if (tr.curbJoints && tr.curbJoints.length) {
        ctx.strokeStyle = '#120d1d';
        ctx.lineWidth = 1.5;
        _strokeSegList(tr.curbJoints);
      }
      if (tr.litEdges && tr.litEdges.length) {
        ctx.strokeStyle = 'rgba(233, 213, 255, 0.42)';
        ctx.lineWidth = 1.6;
        _strokeSegList(tr.litEdges);
      }

      ctx.fillStyle = '#191227';
      tracePolygon(tr.midCliff);
      ctx.fill();
      ctx.strokeStyle = '#0c0816';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.fillStyle = '#05030b';
      tracePolygon(tr.abyssPoly);
      ctx.fill();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.62)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (tr.voidCore && tr.voidCore.length >= 3) {
        ctx.fillStyle = 'rgba(192, 132, 252, 0.22)';
        tracePolygon(tr.voidCore);
        ctx.fill();
      }
      if (tr.spine && tr.spine.length >= 2) {
        ctx.strokeStyle = 'rgba(233, 213, 255, 0.72)';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        for (let s = 0; s < tr.spine.length; s++) {
          if (s === 0) ctx.moveTo(tr.spine[s].x, tr.spine[s].y);
          else ctx.lineTo(tr.spine[s].x, tr.spine[s].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  } else {
    const verts = tr.verts || [];
    const outerRim = tr.outerRim || verts;
    const midRim = tr.midRim || verts;
    const wobX = Math.sin(tr.pulse || 0) * 1.2, wobY = Math.cos(tr.pulse || 0) * 1.0;

    // 1. 石砌外框贴地投影 + 哥特雕石路缘砖框（与石砖地面浑然一体，告别浮空泥团）
    ctx.fillStyle = 'rgba(4, 7, 15, 0.44)';
    tracePolygonOffset(outerRim, 3, 5);
    ctx.fill();

    ctx.fillStyle = tr.kind === 'lava' ? '#252f42' : (tr.kind === 'swamp' ? '#1e2e3d' : '#1c364d');
    tracePolygon(outerRim);
    ctx.fill();
    ctx.strokeStyle = '#070b14';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    ctx.strokeStyle = tr.kind === 'lava'
      ? 'rgba(251, 146, 60, 0.24)'
      : (tr.kind === 'swamp' ? 'rgba(110, 231, 183, 0.24)' : 'rgba(186, 230, 253, 0.30)');
    ctx.lineWidth = 1.4;
    tracePolygon(midRim);
    ctx.stroke();

    if (tr.curbJoints && tr.curbJoints.length) {
      ctx.strokeStyle = '#0b111d';
      ctx.lineWidth = 1.5;
      _strokeSegList(tr.curbJoints);
    }
    if (tr.litEdges && tr.litEdges.length) {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.42)';
      ctx.lineWidth = 1.6;
      _strokeSegList(tr.litEdges);
    }

    // 2. 下沉凹槽石壁与元素方槽内芯（严格裁剪于石槽内口，呈现真实嵌地凹坑立体感）
    if (verts.length >= 3) {
      ctx.save();
      tracePolygon(verts);
      ctx.clip();

      if (tr.kind === 'lava') {
        // 嵌石熔火方槽：深岩下沉池壁 + 几何金红炽热锻炉岩浆 + 切角黑曜浮板
        ctx.fillStyle = '#160b12';
        tracePolygon(verts);
        ctx.fill();

        ctx.fillStyle = '#b91c1c';
        tracePolygon(tr.sunkenPoly || verts);
        ctx.fill();

        if (tr.gridSegs && tr.gridSegs.length) {
          ctx.strokeStyle = 'rgba(254, 215, 170, 0.28)';
          ctx.lineWidth = 1.3;
          _strokeSegList(tr.gridSegs);
        }
        if (tr.inner1 && tr.inner1.length >= 3) {
          ctx.fillStyle = '#ea580c';
          tracePolygonOffset(tr.inner1, wobX * 0.4, 4.5 + wobY * 0.3);
          ctx.fill();
        }
        if (tr.inner2 && tr.inner2.length >= 3) {
          ctx.fillStyle = '#f97316';
          tracePolygonOffset(tr.inner2, -wobX * 0.4, 4.5 - wobY * 0.3);
          ctx.fill();
        }
        if (tr.inner3 && tr.inner3.length >= 3) {
          ctx.fillStyle = '#fde047';
          tracePolygonOffset(tr.inner3, wobX * 0.5, 4.5);
          ctx.fill();
        }
        if (tr.accents && tr.accents.length) {
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < tr.accents.length; i++) {
            const ac = tr.accents[i];
            const hw = ac.w * 0.5, hh = ac.h * 0.5, ch = 3;
            ctx.save();
            ctx.translate(ac.x + Math.sin((tr.pulse || 0) * 0.7 + i) * 1.2, ac.y);
            ctx.rotate(ac.rot);
            ctx.beginPath();
            ctx.moveTo(-hw + ch, -hh); ctx.lineTo(hw - ch, -hh); ctx.lineTo(hw, -hh + ch);
            ctx.lineTo(hw, hh - ch); ctx.lineTo(hw - ch, hh); ctx.lineTo(-hw + ch, hh);
            ctx.lineTo(-hw, hh - ch); ctx.lineTo(-hw, -hh + ch);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
          }
        }
        ctx.strokeStyle = '#fdba74';
        ctx.lineWidth = 1.6;
        tracePolygon(tr.sunkenPoly || verts);
        ctx.stroke();
      } else if (tr.kind === 'swamp') {
        // 嵌石翡翠秘毒方渠：青石下沉渠壁 + 剔透祖母绿炼金毒液 + 菱晶毒芒（零暗褐烂泥色！）
        ctx.fillStyle = '#041f1e';
        tracePolygon(verts);
        ctx.fill();

        ctx.fillStyle = '#064e3b';
        tracePolygon(tr.sunkenPoly || verts);
        ctx.fill();

        if (tr.gridSegs && tr.gridSegs.length) {
          ctx.strokeStyle = 'rgba(110, 231, 183, 0.22)';
          ctx.lineWidth = 1.2;
          _strokeSegList(tr.gridSegs);
        }
        if (tr.inner1 && tr.inner1.length >= 3) {
          ctx.fillStyle = '#047857';
          tracePolygonOffset(tr.inner1, wobX * 0.5, 4.5 + wobY * 0.4);
          ctx.fill();
        }
        if (tr.inner2 && tr.inner2.length >= 3) {
          ctx.fillStyle = '#10b981';
          tracePolygonOffset(tr.inner2, -wobX * 0.5, 4.5 - wobY * 0.3);
          ctx.fill();
        }
        if (tr.inner3 && tr.inner3.length >= 3) {
          ctx.fillStyle = 'rgba(110, 231, 183, 0.58)';
          tracePolygonOffset(tr.inner3, wobX * 0.4, 4.5);
          ctx.fill();
        }
        if (tr.accents && tr.accents.length) {
          ctx.lineWidth = 1.3;
          for (let i = 0; i < tr.accents.length; i++) {
            const ac = tr.accents[i];
            const rx = ac.h * 0.65, ry = ac.h * 0.42;
            ctx.save();
            ctx.translate(ac.x, ac.y + Math.cos((tr.pulse || 0) * 0.9 + i) * 1.2);
            ctx.fillStyle = ac.alt ? '#c4b5fd' : '#a7f3d0';
            ctx.strokeStyle = '#042f2e';
            ctx.beginPath();
            ctx.moveTo(0, -ry); ctx.lineTo(rx, 0); ctx.lineTo(0, ry); ctx.lineTo(-rx, 0);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
          }
        }
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 1.6;
        tracePolygon(tr.sunkenPoly || verts);
        ctx.stroke();
      } else if (tr.kind === 'ice_sheet') {
        // 嵌石寒晶方砖台：冰岩下沉石框 + 蓝宝石冰砖网格 + 斜向镜面高光带
        ctx.fillStyle = '#082032';
        tracePolygon(verts);
        ctx.fill();

        ctx.fillStyle = 'rgba(14, 116, 144, 0.62)';
        tracePolygon(tr.sunkenPoly || verts);
        ctx.fill();

        if (tr.inner1 && tr.inner1.length >= 3) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
          tracePolygonOffset(tr.inner1, 0, 3.5);
          ctx.fill();
        }
        if (tr.inner2 && tr.inner2.length >= 3) {
          ctx.fillStyle = 'rgba(186, 230, 253, 0.30)';
          tracePolygonOffset(tr.inner2, 0, 3.5);
          ctx.fill();
        }
        if (tr.gridSegs && tr.gridSegs.length) {
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.42)';
          ctx.lineWidth = 1.25;
          _strokeSegList(tr.gridSegs);
        }
        if (tr.accents && tr.accents.length) {
          for (let i = 0; i < tr.accents.length; i++) {
            const gl = tr.accents[i], gw = gl.w * 1.45;
            ctx.save();
            ctx.translate(gl.x, gl.y - 1.5);
            ctx.rotate(gl.rot);
            ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.36)' : 'rgba(224, 242, 254, 0.24)';
            ctx.beginPath();
            ctx.moveTo(-gw * 0.72, -4.5); ctx.lineTo(gw * 0.56, -4.5);
            ctx.lineTo(gw * 0.72, 4.5); ctx.lineTo(-gw * 0.56, 4.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.8;
        tracePolygon(tr.sunkenPoly || verts);
        ctx.stroke();
      }

      ctx.restore();

      // 石槽内口硬朗切石暗边
      ctx.strokeStyle = '#090e1a';
      ctx.lineWidth = 2.2;
      tracePolygon(verts);
      ctx.stroke();
    }
  }

  if (showLabel) {
    const tLabel = tr.kind === 'lava'
      ? '🌋 嵌石熔火槽 (灼烧减速)'
      : (tr.kind === 'swamp'
        ? '🧪 翡翠秘毒渠 (阻滞腐蚀)'
        : (tr.kind === 'ice_sheet' ? '🧊 寒晶方砖台 (疾滑加速)' : '🕳️ 石砌断层渊 (阻挡通行)'));
    const midPt = (tr.spine && tr.spine.length) ? tr.spine[Math.floor(tr.spine.length * 0.5)] : tr;
    const lx = midPt.x, ly = tr.kind === 'chasm' ? midPt.y - 6 : midPt.y - 46;
    ctx.font = '800 11.5px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(14, 10, 24, 0.82)';
    ctx.beginPath(); ctx.roundRect(lx - 68, ly - 11, 136, 16, 6); ctx.fill();
    ctx.fillStyle = '#f1ecff';
    ctx.fillText(tLabel, lx, ly + 1);
  }
  ctx.restore();
}

// 绘制单个菱晶次元裂隙传送门（星芒裂口 + 环绕浮游棱晶碎片，无规则圆环）
function drawSinglePortal(p, partner, cooling, cdRemain) {
  const pr = Math.max(18, p.r || 36);
  ctx.save();
  ctx.translate(p.x, p.y);

  // 底层交叉次元裂隙星芒
  ctx.save();
  ctx.rotate((p.pulse || 0) * (cooling ? 0.18 : 0.55));
  ctx.globalAlpha = cooling ? 0.34 : 0.88;
  ctx.fillStyle = '#130924';
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const rad = k % 2 === 0 ? pr * 1.18 : pr * 0.54;
    if (k === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  // 内层旋转菱晶核心
  ctx.save();
  ctx.rotate(-(p.pulse || 0) * 0.8);
  ctx.globalAlpha = cooling ? 0.25 : 0.72;
  ctx.fillStyle = p.color;
  const inR = pr * (0.64 + Math.sin(p.pulse || 0) * 0.07);
  ctx.beginPath();
  ctx.moveTo(0, -inR * 1.15); ctx.lineTo(inR * 0.82, 0); ctx.lineTo(0, inR * 1.15); ctx.lineTo(-inR * 0.82, 0);
  ctx.closePath(); ctx.fill();
  if (!cooling) {
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -pr * 0.34); ctx.lineTo(pr * 0.24, 0); ctx.lineTo(0, pr * 0.34); ctx.lineTo(-pr * 0.24, 0);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // 外围环绕浮游棱晶残片
  const shards = Array.isArray(p.shards) ? p.shards.length : (p.shards || 5);
  ctx.globalAlpha = cooling ? 0.32 : 0.92;
  ctx.fillStyle = p.color;
  ctx.strokeStyle = '#140c24';
  ctx.lineWidth = 1.5;
  for (let s = 0; s < shards; s++) {
    const sa = (s / shards) * Math.PI * 2 + (p.pulse || 0) * 0.45;
    const sx = Math.cos(sa) * (pr + 7), sy = Math.sin(sa) * (pr + 7);
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(sa);
    ctx.beginPath();
    ctx.moveTo(6, 0); ctx.lineTo(0, -3.5); ctx.lineTo(-5, 0); ctx.lineTo(0, 3.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  if (partner) {
    const linkA = Math.atan2(partner.y - p.y, partner.x - p.x);
    ctx.save();
    ctx.rotate(linkA);
    ctx.globalAlpha = cooling ? 0.35 : 0.92;
    ctx.fillStyle = partner.color || '#ffd166';
    ctx.beginPath(); ctx.moveTo(pr + 16, 0); ctx.lineTo(pr + 7, -5.5); ctx.lineTo(pr + 7, 5.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.font = '800 12px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const pTxt = cooling ? `⏳ 充能 ${(cdRemain || 0).toFixed(1)}s` : `🌀 晶裂门 ${p.label}`;
  ctx.fillStyle = 'rgba(14, 10, 24, 0.80)';
  ctx.beginPath(); ctx.roundRect(-50, -pr - 26, 100, 17, 6); ctx.fill();
  ctx.fillStyle = cooling ? '#cbd5e1' : '#f8f5ff';
  ctx.fillText(pTxt, 0, -pr - 13);
  ctx.restore();
}

// 实时视口裁剪超清矢量石砖微倒角 + 四面哥特精雕护栏/石灯柱（与弹道、岩浆同级原生设备像素光栅化，拉到最大视野依然 100% 锐利不糊，0 径向渐变 / 0 shadowBlur）
const BALUSTRADE_THEMES = {
  foundry: {
    plinth: '#161f2e', railDark: '#1f2b3d', railMid: '#2d3e56', railHi: '#89c4d4',
    outline: '#060911', spindle: '#394e6a', accent: '#52b788',
    pierBase: '#1b2638', pierCap: '#334763', lanternFrame: '#0d131f',
    flameOuter: 'rgba(76, 201, 240, 0.30)', flameMid: '#4cc9f0', flameCore: '#fff3b0'
  },
  glacier: {
    plinth: '#112236', railDark: '#19334f', railMid: '#274c73', railHi: '#bae6fd',
    outline: '#06101d', spindle: '#4895ef', accent: '#90e0ef',
    pierBase: '#162d47', pierCap: '#2e5984', lanternFrame: '#0b1829',
    flameOuter: 'rgba(144, 224, 239, 0.32)', flameMid: '#72efdd', flameCore: '#f8fafc'
  },
  wasteland: {
    plinth: '#1b1526', railDark: '#2a2038', railMid: '#463556', railHi: '#f3d599',
    outline: '#08050f', spindle: '#c89b54', accent: '#dfc084',
    pierBase: '#241b31', pierCap: '#594269', lanternFrame: '#120d1c',
    flameOuter: 'rgba(199, 125, 255, 0.30)', flameMid: '#c77dff', flameCore: '#ffe8a3'
  },
  desert: {
    plinth: '#15111d', railDark: '#221b2e', railMid: '#362b47', railHi: '#f6d379',
    outline: '#06040b', spindle: '#d4a656', accent: '#ff9f1c',
    pierBase: '#1d1628', pierCap: '#47385c', lanternFrame: '#0d0914',
    flameOuter: 'rgba(255, 159, 28, 0.30)', flameMid: '#ff9f1c', flameCore: '#fff8dc'
  }
};

let _lowHpVigAlpha = 0;

function _drawPierLantern(px, py, sz, th, sceneId, pulse) {
  const hs = sz * 0.5;
  // 石柱投影
  ctx.fillStyle = 'rgba(4, 6, 12, 0.52)';
  ctx.fillRect(px - hs - 3, py - hs + 4, sz + 6, sz + 4);
  // 石柱外基座与倒角顶盖
  ctx.fillStyle = th.pierBase;
  ctx.strokeStyle = th.outline;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(px - hs, py - hs, sz, sz, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = th.pierCap;
  ctx.beginPath();
  ctx.roundRect(px - hs + 2.5, py - hs + 2.5, sz - 5, sz - 5, 2);
  ctx.fill();
  ctx.strokeStyle = th.railHi;
  ctx.lineWidth = 0.95;
  ctx.strokeRect(px - hs + 3, py - hs + 3, sz - 6, sz - 6);

  if (sceneId === 'wasteland') {
    // 钟楼黄铜发条十字栓
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(px, py, hs * 0.48, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 柱顶魂灯发光核（纯多层几何光晕，0 径向渐变 / 0 shadowBlur）
  const rPulse = 1 + Math.sin(pulse + (px + py) * 0.015) * 0.12;
  ctx.fillStyle = th.flameOuter;
  ctx.beginPath();
  ctx.arc(px, py, sz * 0.46 * rPulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = th.lanternFrame;
  ctx.strokeStyle = th.accent;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(px, py - 6.5);
  ctx.lineTo(px + 6.5, py);
  ctx.lineTo(px, py + 6.5);
  ctx.lineTo(px - 6.5, py);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = th.flameMid;
  ctx.beginPath();
  ctx.arc(px, py, 3.6 * rPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = th.flameCore;
  ctx.beginPath();
  ctx.arc(px, py, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrispArenaBalustrade(vL, vR, vT, vB, sceneId) {
  const th = BALUSTRADE_THEMES[sceneId] || BALUSTRADE_THEMES.foundry;
  const W = WORLD.w, H = WORLD.h;
  const pulse = ((typeof _frameNow === 'number' ? _frameNow : 0) * 0.0042);
  const step = 36, pierStep = 180;

  ctx.save();

  // 1. 场地四周内侧路缘投影与石阶排水渠（仅当镜头靠近对应边界时绘制）
  ctx.fillStyle = 'rgba(3, 5, 11, 0.48)';
  if (vT < 26) ctx.fillRect(Math.max(0, vL), 0, Math.min(W, vR) - Math.max(0, vL), 16);
  if (vB > H - 26) ctx.fillRect(Math.max(0, vL), H - 14, Math.min(W, vR) - Math.max(0, vL), 14);
  if (vL < 26) ctx.fillRect(0, Math.max(0, vT), 15, Math.min(H, vB) - Math.max(0, vT));
  if (vR > W - 26) ctx.fillRect(W - 15, Math.max(0, vT), 15, Math.min(H, vB) - Math.max(0, vT));

  // 2. 上下水平哥特石雕护栏带（y = 0 与 y = H）
  const hEdges = [];
  if (vT < 34) hEdges.push({ yBase: -24, dir: 1 });
  if (vB > H - 34) hEdges.push({ yBase: H - 4, dir: -1 });

  for (let ei = 0; ei < hEdges.length; ei++) {
    const { yBase } = hEdges[ei];
    const x0 = Math.max(-24, vL - 36), x1 = Math.min(W + 24, vR + 36);
    if (x1 <= x0) continue;

    // 底层石质基座梁
    ctx.fillStyle = th.plinth;
    ctx.strokeStyle = th.outline;
    ctx.lineWidth = 1.8;
    ctx.fillRect(x0, yBase, x1 - x0, 28);
    ctx.strokeRect(x0, yBase, x1 - x0, 28);

    // 栏杆镂空立柱群（每 36px 一根精雕立柱 + 场景特色花饰）
    const sStart = Math.max(step, Math.floor(x0 / step) * step);
    const sEnd = Math.min(W - step, Math.ceil(x1 / step) * step);
    for (let sx = sStart; sx <= sEnd; sx += step) {
      if (sx % pierStep === 0) continue;
      // 镂空暗窗底衬
      ctx.fillStyle = '#070a12';
      ctx.fillRect(sx - 12, yBase + 6, 24, 16);

      // 双立柱雕花芯
      ctx.fillStyle = th.spindle;
      ctx.strokeStyle = th.outline;
      ctx.lineWidth = 1.1;
      ctx.fillRect(sx - 4.5, yBase + 5, 9, 18);
      ctx.strokeRect(sx - 4.5, yBase + 5, 9, 18);

      // 立柱受光金属/石棱高光
      ctx.fillStyle = th.railHi;
      ctx.fillRect(sx - 3, yBase + 6, 2, 16);

      if (sceneId === 'foundry') {
        // 雨夜长桥：哥特尖拱券与石栏青苔斑
        ctx.strokeStyle = th.railMid;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(sx - 12, yBase + 13);
        ctx.lineTo(sx, yBase + 7);
        ctx.lineTo(sx + 12, yBase + 13);
        ctx.stroke();
        if ((sx / step) % 2 === 0) {
          ctx.fillStyle = th.accent;
          ctx.fillRect(sx - 5, yBase + 20, 6, 2.2);
        }
      } else if (sceneId === 'glacier') {
        // 永冻冰窟：棱晶冰枪尖刺雕花
        ctx.fillStyle = th.accent;
        ctx.beginPath();
        ctx.moveTo(sx, yBase + 6.5);
        ctx.lineTo(sx + 5, yBase + 14);
        ctx.lineTo(sx, yBase + 21.5);
        ctx.lineTo(sx - 5, yBase + 14);
        ctx.closePath();
        ctx.fill();
      } else if (sceneId === 'wasteland') {
        // 倒悬钟楼：咬合黄铜齿轮环
        ctx.strokeStyle = th.accent;
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.arc(sx, yBase + 14, 5.2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 日蚀镜界：黑曜金弦月徽记
        ctx.strokeStyle = th.accent;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(sx, yBase + 14, 5.0, -0.7, Math.PI + 0.7);
        ctx.stroke();
      }
    }

    // 上下双层倒角压顶扶手石梁（锐利 1px 受光边）
    ctx.fillStyle = th.railMid;
    ctx.fillRect(x0, yBase, x1 - x0, 6.5);
    ctx.fillStyle = th.railDark;
    ctx.fillRect(x0, yBase + 22, x1 - x0, 6);

    ctx.strokeStyle = th.railHi;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x0, yBase + 1.5); ctx.lineTo(x1, yBase + 1.5);
    ctx.moveTo(x0, yBase + 23.2); ctx.lineTo(x1, yBase + 23.2);
    ctx.stroke();

    ctx.strokeStyle = th.outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, yBase + 6.5); ctx.lineTo(x1, yBase + 6.5);
    ctx.moveTo(x0, yBase + 22); ctx.lineTo(x1, yBase + 22);
    ctx.stroke();
  }

  // 3. 左右垂直哥特石雕护栏带（x = 0 与 x = W）
  const vEdges = [];
  if (vL < 34) vEdges.push({ xBase: -24 });
  if (vR > W - 34) vEdges.push({ xBase: W - 4 });

  for (let ei = 0; ei < vEdges.length; ei++) {
    const { xBase } = vEdges[ei];
    const y0 = Math.max(-24, vT - 36), y1 = Math.min(H + 24, vB + 36);
    if (y1 <= y0) continue;

    ctx.fillStyle = th.plinth;
    ctx.strokeStyle = th.outline;
    ctx.lineWidth = 1.8;
    ctx.fillRect(xBase, y0, 28, y1 - y0);
    ctx.strokeRect(xBase, y0, 28, y1 - y0);

    const sStart = Math.max(step, Math.floor(y0 / step) * step);
    const sEnd = Math.min(H - step, Math.ceil(y1 / step) * step);
    for (let sy = sStart; sy <= sEnd; sy += step) {
      if (sy % pierStep === 0) continue;
      ctx.fillStyle = '#070a12';
      ctx.fillRect(xBase + 6, sy - 12, 16, 24);

      ctx.fillStyle = th.spindle;
      ctx.strokeStyle = th.outline;
      ctx.lineWidth = 1.1;
      ctx.fillRect(xBase + 5, sy - 4.5, 18, 9);
      ctx.strokeRect(xBase + 5, sy - 4.5, 18, 9);

      ctx.fillStyle = th.railHi;
      ctx.fillRect(xBase + 6, sy - 3, 16, 2);

      if (sceneId === 'wasteland' || sceneId === 'desert') {
        ctx.strokeStyle = th.accent;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(xBase + 14, sy, 4.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (sceneId === 'glacier') {
        ctx.fillStyle = th.accent;
        ctx.fillRect(xBase + 11, sy - 2.5, 6, 5);
      }
    }

    ctx.fillStyle = th.railMid;
    ctx.fillRect(xBase, y0, 6.5, y1 - y0);
    ctx.fillStyle = th.railDark;
    ctx.fillRect(xBase + 22, y0, 6, y1 - y0);

    ctx.strokeStyle = th.railHi;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(xBase + 1.5, y0); ctx.lineTo(xBase + 1.5, y1);
    ctx.moveTo(xBase + 23.2, y0); ctx.lineTo(xBase + 23.2, y1);
    ctx.stroke();

    ctx.strokeStyle = th.outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(xBase + 6.5, y0); ctx.lineTo(xBase + 6.5, y1);
    ctx.moveTo(xBase + 22, y0); ctx.lineTo(xBase + 22, y1);
    ctx.stroke();
  }

  // 4. 每隔 180px 耸立的精雕石灯柱与四角重装镇界塔台（视口裁剪）
  if (vT < 42) {
    const p0 = Math.max(pierStep, Math.floor((vL - 30) / pierStep) * pierStep);
    const p1 = Math.min(W - pierStep, Math.ceil((vR + 30) / pierStep) * pierStep);
    for (let px = p0; px <= p1; px += pierStep) _drawPierLantern(px, -10, 28, th, sceneId, pulse);
  }
  if (vB > H - 42) {
    const p0 = Math.max(pierStep, Math.floor((vL - 30) / pierStep) * pierStep);
    const p1 = Math.min(W - pierStep, Math.ceil((vR + 30) / pierStep) * pierStep);
    for (let px = p0; px <= p1; px += pierStep) _drawPierLantern(px, H + 10, 28, th, sceneId, pulse);
  }
  if (vL < 42) {
    const p0 = Math.max(pierStep, Math.floor((vT - 30) / pierStep) * pierStep);
    const p1 = Math.min(H - pierStep, Math.ceil((vB + 30) / pierStep) * pierStep);
    for (let py = p0; py <= p1; py += pierStep) _drawPierLantern(-10, py, 28, th, sceneId, pulse);
  }
  if (vR > W - 42) {
    const p0 = Math.max(pierStep, Math.floor((vT - 30) / pierStep) * pierStep);
    const p1 = Math.min(H - pierStep, Math.ceil((vB + 30) / pierStep) * pierStep);
    for (let py = p0; py <= p1; py += pierStep) _drawPierLantern(W + 10, py, 28, th, sceneId, pulse);
  }

  // 四角镇界主石柱台
  const cornerBastions = [[-10, -10], [W + 10, -10], [-10, H + 10], [W + 10, H + 10]];
  for (let ci = 0; ci < 4; ci++) {
    const [cx, cy] = cornerBastions[ci];
    if (cx + 32 < vL || cx - 32 > vR || cy + 32 < vT || cy - 32 > vB) continue;
    _drawPierLantern(cx, cy, 38, th, sceneId, pulse);
  }

  ctx.restore();
}

// 战场主相机裁剪渲染、首领预警提示、悬浮摇杆绘制与 RAF 主循环
function draw() {
  const now = performance.now();
  if (typeof _frameNow !== 'undefined') _frameNow = now;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = (curScene && curScene.voidBg) || '#110e17';
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
  const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
  ctx.translate(viewW / 2 + sx, viewH / 2 + sy);
  ctx.scale(camZoom, camZoom);
  ctx.translate(-cam.x, -cam.y);

  const halfW = (viewW / camZoom) * 0.5;
  const halfH = (viewH / camZoom) * 0.5;
  const vL = cam.x - halfW - 64, vR = cam.x + halfW + 64;
  const vT = cam.y - halfH - 64, vB = cam.y + halfH + 64;

  // 直接绘制常驻 GPU 硬件纹理的 <=3840px 超清地坪贴图（消除每帧动态子矩形取整与双网格叠加引起的闪烁抖动）
  if (floorCanvas.width > 2 && floorCanvas.height > 2) {
    ctx.drawImage(floorCanvas, -FLOOR_PAD, -FLOOR_PAD, WORLD.w + FLOOR_PAD * 2, WORLD.h + FLOOR_PAD * 2);
  }

  const activeSceneId = (curScene && curScene.id) || 'foundry';
  drawCrispArenaBalustrade(vL, vR, vT, vB, activeSceneId);

  if (state !== 'menu') {
    // 蚀界生存试炼 & D5 第 16 层二阶段蚀日浓雾 · 魂灯迷雾世界空间视野半径（严密剔除雾外全部怪物、怪血条、刷怪红叉与普通敌弹，外圈浓雾 100% 不可透视怪物！）
    const _d5P2Fog = typeof isD5Floor16Phase2FogActive === 'function' && isD5Floor16Phase2FogActive();
    const _anyFogWave = !!((typeof survivalTrialWave !== 'undefined' && survivalTrialWave) || _d5P2Fog);
    const _stFog = (player && typeof survivalTrialState === 'object' && survivalTrialState && (_anyFogWave || (survivalTrialState.fogIntroP || 0) > 0.01)) ? survivalTrialState : null;
    const _fogIntroP = _stFog ? Math.max(_anyFogWave ? 0.05 : 0, Math.min(1, _stFog.fogIntroP || 0)) : (_anyFogWave ? 1 : 0);
    const _fogBoostP = (_stFog && _stFog.lanternBoostT > 0) ? Math.min(1, _stFog.lanternBoostT / 1.25) : 0;
    const _fogBaseWorldR = _d5P2Fog ? 268 : 238;
    const _fogTargetWorldR = (_fogBaseWorldR + _fogBoostP * 72) + Math.sin(now * 0.0042) * 3.5;
    const _fogScreenClearR = Math.max(64, (Math.hypot(viewW, viewH) * (1 - _fogIntroP)) + (_fogTargetWorldR * camZoom) * _fogIntroP);
    const fogEffWorldR = _fogScreenClearR / Math.max(0.25, camZoom);
    const fogCullActive = !!(player && _fogIntroP > 0.35);
    const fogWorldInnerR = fogEffWorldR * 0.90;
    const fogWorldCutR = fogEffWorldR * 1.25;

    for (let i = 0; i < stains.length; i++) {
      const st = stains[i];
      if (st.x < vL || st.x > vR || st.y < vT || st.y > vB) continue;
      ctx.globalAlpha = st.kind === 'scorch' ? 0.34 : 0.22;
      ctx.fillStyle = st.color;
      ctx.beginPath(); ctx.arc(st.x, st.y, Math.max(1, st.r), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < shells.length; i++) {
      const s = shells[i];
      if (s.x < vL || s.x > vR || s.y < vT || s.y > vB) continue;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      ctx.fillStyle = '#f4a261'; ctx.fillRect(-3, -1.5, 6, 3);
      ctx.restore();
    }

    // 多形态真地形块渲染（斜长熔岩裂脉、蜿蜒剧毒泥沼、多棱寒霜冰带、断层裂谷）
    for (let i = 0; i < terrains.length; i++) {
      const tr = terrains[i];
      const pad = Math.max(tr.boundR || 0, (tr.halfLen || 0) + (tr.r || 68)) + 42;
      if (tr.x + pad < vL || tr.x - pad > vR || tr.y + pad < vT || tr.y - pad > vB) continue;
      let showLbl = false;
      if (player) {
        if (tr.kind === 'chasm' && typeof closestOnChasm === 'function') {
          const ch = closestOnChasm(tr, player.x, player.y);
          showLbl = !!(ch && ch.gap < 115);
        } else if (typeof isPointInTerrain === 'function') {
          showLbl = isPointInTerrain(tr, player.x, player.y, 110);
        } else {
          showLbl = Math.hypot(player.x - tr.x, player.y - tr.y) < (tr.halfLen || tr.r || 68) + 150;
        }
      }
      drawSingleTerrain(tr, showLbl);
    }

    // 双生菱晶裂隙传送门 A ↔ B 渲染
    for (let i = 0; i < portals.length; i++) {
      const p = portals[i];
      const pr = Math.max(18, p.r || 36);
      if (p.x + pr + 42 < vL || p.x - pr - 42 > vR || p.y + pr + 42 < vT || p.y - pr - 42 > vB) continue;
      const partner = portals[i === 0 ? 1 : 0];
      drawSinglePortal(p, partner, portalPairCd > 0, portalPairCd);
    }

    // 工程流感应地雷渲染（八角装甲雷体 + 脉冲索敌感应线 + 呼吸指示灯）
    if (typeof mines !== 'undefined' && mines.length > 0) {
      for (let i = 0; i < mines.length; i++) {
        const m = mines[i];
        if (m.x + 60 < vL || m.x - 60 > vR || m.y + 60 < vT || m.y - 60 > vB) continue;
        ctx.save();
        ctx.translate(m.x, m.y);
        if (m.armT <= 0) {
          ctx.strokeStyle = 'rgba(76, 201, 240, 0.26)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([7, 6]);
          ctx.beginPath(); ctx.arc(0, 0, m.triggerR || 54, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4 + Math.PI / 8;
          if (k === 0) ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
          else ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        const blink = Math.sin(m.pulse || 0) > 0;
        ctx.fillStyle = m.armT > 0 ? '#94a3b8' : (blink ? '#ff2a55' : '#4cc9f0');
        ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // 幽光菌林专属异象：治愈孢子灵泉区域渲染
    for (let i = 0; i < sporeZones.length; i++) {
      const sz = sporeZones[i];
      const sr = Math.max(12, sz.r || 86);
      if (sz.x + sr + 16 < vL || sz.x - sr - 16 > vR || sz.y + sr + 16 < vT || sz.y - sr - 16 > vB) continue;
      const fade = Math.min(1, Math.max(0.15, sz.t / 1.2));
      ctx.save();
      ctx.globalAlpha = 0.16 * fade;
      ctx.fillStyle = '#5ef29b';
      ctx.beginPath(); ctx.arc(sz.x, sz.y, sr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.68 * fade;
      ctx.strokeStyle = '#5ef29b';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(sz.x, sz.y, sr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#c77dff';
      for (let k = 0; k < 4; k++) {
        const sa = (sz.pulse || 0) * 0.7 + (k * Math.PI) / 2;
        ctx.beginPath(); ctx.arc(sz.x + Math.cos(sa) * (sr * 0.55), sz.y + Math.sin(sa) * (sr * 0.55), 3.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // 稀有地图奇遇召唤圣物（扩容巨型双环六芒星召唤祭坛 + 六方符文柱 + 站立读条进度环）
    for (let i = 0; i < relics.length; i++) {
      const rel = relics[i];
      const rr = Math.max(28, rel.r || 88);
      const col = (rel.def && rel.def.color) || '#ffd166';
      const prog = Math.max(0, Math.min(1, (rel.charge || 0) / Math.max(0.1, rel.need || 1.1)));
      ctx.save();
      ctx.translate(rel.x, rel.y);
      ctx.globalAlpha = 0.13 + Math.sin(rel.pulse) * 0.04 + prog * 0.10;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
      // 外圈顺时针铭文虚线阵
      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.8;
      ctx.save();
      ctx.rotate(rel.pulse * 0.32);
      ctx.setLineDash([14, 8]);
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      for (let k = 0; k < 6; k++) {
        const ka = (Math.PI * 2 * k) / 6;
        const px = Math.cos(ka) * (rr * 0.94), py = Math.sin(ka) * (rr * 0.94);
        ctx.fillStyle = '#1b1429';
        ctx.beginPath(); ctx.arc(px, py, 5.2, 0, Math.PI * 2); ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      // 内圈逆时针六芒星秘法副环
      ctx.save();
      ctx.rotate(-rel.pulse * 0.45);
      ctx.globalAlpha = 0.56 + prog * 0.30;
      ctx.strokeStyle = '#ffe8a3';
      ctx.lineWidth = 1.8;
      const inR = rr * 0.66;
      ctx.beginPath(); ctx.arc(0, 0, inR, 0, Math.PI * 2); ctx.stroke();
      for (let t = 0; t < 2; t++) {
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const ha = t * (Math.PI / 3) + (Math.PI * 2 * k) / 3;
          const hx = Math.cos(ha) * inR, hy = Math.sin(ha) * inR;
          if (k === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
      if (prog > 0.01) {
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#ffe8a3';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(0, 0, rr + 6, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, rr * 0.66, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
      }
      const bobY = Math.sin(rel.pulse * 1.5) * 4.5;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1b1429';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(0, -22 + bobY); ctx.lineTo(19, bobY); ctx.lineTo(0, 22 + bobY); ctx.lineTo(-19, bobY);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = '22px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((rel.def && rel.def.icon) || '✨', 0, bobY + 1);
      ctx.textBaseline = 'alphabetic';
      ctx.font = '800 13.5px -apple-system, sans-serif';
      ctx.fillStyle = '#120d18';
      const lbl = prog > 0.03 ? `⚡ 召唤共鸣 ${Math.round(prog * 100)}%` : `✨ ${rel.def ? rel.def.name : '奇遇圣物'} (站入阵内召唤Boss)`;
      ctx.fillText(lbl, 1.5, -rr - 12 + 1.5);
      ctx.fillStyle = prog > 0.03 ? '#ffd166' : '#f8f5ff';
      ctx.fillText(lbl, 0, -rr - 12);
      ctx.restore();
    }

    // 蚀界生存试炼差异化地面/弹道预警（地脉锯齿分叉裂谷 vs 曜金双轨斜纹激光走廊 vs 绯红虚线流光飞矢，0渐变0模糊）
    if (typeof survivalFissures !== 'undefined' && survivalFissures.length > 0) {
      const fNow = (typeof _frameNow !== 'undefined' ? _frameNow : performance.now()) * 0.001;
      for (let i = 0; i < survivalFissures.length; i++) {
        const f = survivalFissures[i];
        if (!f) continue;
        const minFX = Math.min(f.x1, f.x2) - 48, maxFX = Math.max(f.x1, f.x2) + 48;
        const minFY = Math.min(f.y1, f.y2) - 48, maxFY = Math.max(f.y1, f.y2) + 48;
        if (maxFX < vL || minFX > vR || maxFY < vT || minFY > vB) continue;
        const fCol = f.color || '#ff7b29';
        const deepCol = f.deepColor || '#450a0a';
        const dx = f.x2 - f.x1, dy = f.y2 - f.y1;
        const len = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / len, uy = dy / len;
        const nx = -dy / len, ny = dx / len;
        const hw = Math.max(8, f.halfW || 20);
        const jags = f.jags;
        const jagCnt = Array.isArray(jags) ? jags.length : 0;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (f.windupT > 0) {
          const p = Math.max(0, Math.min(1, 1 - f.windupT / Math.max(0.05, f.maxWindup || 0.9)));
          const trem = Math.sin(fNow * 42 + i) * 2.4 * p;
          const rimW = hw * (0.55 + p * 0.45);
          // 1) 不规则锯齿断层包络带（绝非笔直激光条，呈现大地崩裂边缘）
          ctx.globalAlpha = 0.16 + p * 0.22;
          ctx.fillStyle = deepCol;
          ctx.beginPath();
          ctx.moveTo(f.x1 + nx * trem, f.y1 + ny * trem);
          for (let k = 0; k < jagCnt; k++) {
            const t = (k + 1) / (jagCnt + 1);
            const off = jags[k] * hw * 0.42 + rimW;
            ctx.lineTo(f.x1 + dx * t + nx * (off + trem), f.y1 + dy * t + ny * (off + trem));
          }
          ctx.lineTo(f.x2 + nx * trem, f.y2 + ny * trem);
          for (let k = jagCnt - 1; k >= 0; k--) {
            const t = (k + 1) / (jagCnt + 1);
            const off = jags[k] * hw * 0.42 - rimW;
            ctx.lineTo(f.x1 + dx * t + nx * (off + trem), f.y1 + dy * t + ny * (off + trem));
          }
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 0.56 + p * 0.30;
          ctx.strokeStyle = fCol;
          ctx.lineWidth = 1.9;
          ctx.setLineDash([7, 5]);
          ctx.stroke();
          ctx.setLineDash([]);

          // 2) 横向蔓延碎地支脉裂纹（清晰区分于平滑飞矢与走廊光栅）
          ctx.globalAlpha = 0.62 + p * 0.30;
          ctx.strokeStyle = fCol;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let k = 0; k < jagCnt; k++) {
            const t = (k + 1) / (jagCnt + 1);
            const cOff = jags[k] * hw * 0.52 + trem;
            const bx = f.x1 + dx * t + nx * cOff;
            const by = f.y1 + dy * t + ny * cOff;
            const side = k % 2 === 0 ? 1 : -1;
            const ribLen = hw * (0.62 + p * 0.52);
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + (nx * side + ux * 0.36) * ribLen, by + (ny * side + uy * 0.36) * ribLen);
          }
          ctx.stroke();

          // 3) 中央硫黄地脉主锯齿裂痕 + 首尾震源菱桩
          ctx.globalAlpha = 0.80 + p * 0.20;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.4 + p * 1.8;
          ctx.beginPath();
          ctx.moveTo(f.x1, f.y1);
          for (let k = 0; k < jagCnt; k++) {
            const t = (k + 1) / (jagCnt + 1);
            const off = jags[k] * hw * 0.55;
            ctx.lineTo(f.x1 + dx * t + nx * (off + trem), f.y1 + dy * t + ny * (off + trem));
          }
          ctx.lineTo(f.x2, f.y2);
          ctx.stroke();

          const stakeR = 5.5 + p * 2.5;
          ctx.fillStyle = '#fde047';
          for (let ep = 0; ep < 2; ep++) {
            const ex = ep === 0 ? f.x1 : f.x2;
            const ey = ep === 0 ? f.y1 : f.y2;
            ctx.beginPath();
            ctx.moveTo(ex + ux * stakeR, ey + uy * stakeR);
            ctx.lineTo(ex + nx * stakeR * 0.72, ey + ny * stakeR * 0.72);
            ctx.lineTo(ex - ux * stakeR, ey - uy * stakeR);
            ctx.lineTo(ex - nx * stakeR * 0.72, ey - ny * stakeR * 0.72);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          const remP = Math.max(0, Math.min(1, (f.activeT || 0) / Math.max(0.1, f.maxActive || 3.8)));
          const fade = remP < 0.18 ? (remP / 0.18) : 1;
          const pulse = 0.92 + Math.sin(fNow * 9.5 + i * 1.7) * 0.08;
          ctx.globalAlpha = 0.28 * fade;
          ctx.strokeStyle = fCol;
          ctx.lineWidth = hw * 2.35 * pulse;
          ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();

          ctx.globalAlpha = 0.92 * fade;
          ctx.strokeStyle = deepCol;
          ctx.lineWidth = hw * 1.52;
          ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();

          ctx.globalAlpha = 0.94 * fade;
          ctx.strokeStyle = fCol;
          ctx.lineWidth = 5.4 * pulse;
          ctx.beginPath();
          ctx.moveTo(f.x1, f.y1);
          for (let k = 0; k < jagCnt; k++) {
            const t = (k + 1) / (jagCnt + 1);
            const off = jags[k] * hw * 0.48;
            ctx.lineTo(f.x1 + dx * t + nx * off, f.y1 + dy * t + ny * off);
          }
          ctx.lineTo(f.x2, f.y2);
          ctx.stroke();

          ctx.strokeStyle = '#fff7ed';
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    if (typeof survivalSkyVolleys !== 'undefined' && survivalSkyVolleys.length > 0) {
      const svNow = (typeof _frameNow !== 'undefined' ? _frameNow : performance.now()) * 0.001;
      for (let i = 0; i < survivalSkyVolleys.length; i++) {
        const v = survivalSkyVolleys[i];
        if (!v) continue;
        const minVX = Math.min(v.sx, v.ex) - 36, maxVX = Math.max(v.sx, v.ex) + 36;
        const minVY = Math.min(v.sy, v.ey) - 36, maxVY = Math.max(v.sy, v.ey) + 36;
        if (maxVX < vL || minVX > vR || maxVY < vT || minVY > vB) continue;
        const p = Math.max(0, Math.min(1, 1 - (v.windupT || 0) / Math.max(0.05, v.maxWindup || 0.8)));
        const dx = v.ex - v.sx, dy = v.ey - v.sy;
        const len = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / len, uy = dy / len;
        const nx = -uy, ny = ux;
        ctx.save();
        if (v.kind === 'corridor_beam') {
          // 【平行天罚光栅走廊】：曜金双实线硬边界 + 斜向封锁警示条纹 + 向心充能快门（瞬爆宽激光墙）
          const vCol = v.color || '#fbbf24';
          const hw = Math.max(8, v.halfW || 18);
          ctx.lineCap = 'butt';
          ctx.globalAlpha = 0.09 + p * 0.16;
          ctx.strokeStyle = vCol;
          ctx.lineWidth = hw * 2;
          ctx.beginPath(); ctx.moveTo(v.sx, v.sy); ctx.lineTo(v.ex, v.ey); ctx.stroke();

          // 向心收拢快门能量芯（p->1 时填满整个走廊宽度）
          ctx.globalAlpha = 0.22 + p * 0.34;
          ctx.strokeStyle = v.coreColor || '#fef9c3';
          ctx.lineWidth = Math.max(2, hw * 2 * p);
          ctx.beginPath(); ctx.moveTo(v.sx, v.sy); ctx.lineTo(v.ex, v.ey); ctx.stroke();

          // 两侧实线封锁导轨（精确标示安全走廊边界）
          ctx.globalAlpha = 0.72 + p * 0.26;
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(v.sx + nx * hw, v.sy + ny * hw);
          ctx.lineTo(v.ex + nx * hw, v.ey + ny * hw);
          ctx.moveTo(v.sx - nx * hw, v.sy - ny * hw);
          ctx.lineTo(v.ex - nx * hw, v.ey - ny * hw);
          ctx.stroke();

          // 视野内斜向警示斑马纹（一眼区分于弹道飞矛）
          const step = 64;
          ctx.globalAlpha = 0.34 + p * 0.24;
          ctx.strokeStyle = vCol;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (let d = 32; d < len - 32; d += step) {
            const cx = v.sx + ux * d, cy = v.sy + uy * d;
            if (cx < vL - 50 || cx > vR + 50 || cy < vT - 50 || cy > vB + 50) continue;
            ctx.moveTo(cx - nx * hw * 0.85 - ux * 11, cy - ny * hw * 0.85 - uy * 11);
            ctx.lineTo(cx + nx * hw * 0.85 + ux * 11, cy + ny * hw * 0.85 + uy * 11);
          }
          ctx.stroke();
        } else {
          // 【天外贯星剑梭】：绯红窄虚线弹道轨 + 顺向推进流光尖矢（提示飞矛即将沿此方向高速射过）
          const vCol = v.color || '#ff4d6d';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.48 + p * 0.42;
          ctx.strokeStyle = vCol;
          ctx.lineWidth = 2.1;
          ctx.setLineDash([12, 9]);
          ctx.beginPath(); ctx.moveTo(v.sx, v.sy); ctx.lineTo(v.ex, v.ey); ctx.stroke();
          ctx.setLineDash([]);

          // 沿飞行方向动态推进的流光尖矢 › › ›
          const chevSpacing = 98;
          const travel = (svNow * 250) % chevSpacing;
          const wingBack = 9.5, wingW = 6.2;
          ctx.globalAlpha = 0.58 + p * 0.40;
          ctx.strokeStyle = v.coreColor || '#ffe4e6';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (let d = travel + 24; d < len - 24; d += chevSpacing) {
            const tipX = v.sx + ux * d, tipY = v.sy + uy * d;
            if (tipX < vL - 30 || tipX > vR + 30 || tipY < vT - 30 || tipY > vB + 30) continue;
            ctx.moveTo(tipX - ux * wingBack + nx * wingW, tipY - uy * wingBack + ny * wingW);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(tipX - ux * wingBack - nx * wingW, tipY - uy * wingBack - ny * wingW);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 法杖四大元素专精地面持续领域渲染（熔火燎原炎海 / 极寒暴风雪冰封阵 / 万蛊蚀骨剧毒迷雾，预烘焙辉光贴图 + 零实时渐变）
    if (typeof spellZones !== 'undefined' && spellZones.length > 0) {
      for (let zi = 0; zi < spellZones.length; zi++) {
        const z = spellZones[zi];
        const zr = Math.max(24, z.r || 92);
        if (z.x + zr + 32 < vL || z.x - zr - 32 > vR || z.y + zr + 32 < vT || z.y - zr - 32 > vB) continue;
        const elapsed = Math.max(0, (z.maxT || 2.4) - (z.t || 0));
        const fade = Math.max(0.08, Math.min(1, elapsed / 0.22) * Math.min(1, (z.t || 0) / 0.32));
        const seed = z.seed || (zi * 1.37);
        if (z.kind === 'fire_patch') {
          drawVfxGlow(ctx, 'glowOrange', z.x, z.y, zr * 1.24, 0.52 * fade);
          drawVfxGlow(ctx, 'glowRed', z.x, z.y, zr * 0.86, 0.38 * fade);
          ctx.save();
          ctx.translate(z.x, z.y);
          ctx.globalAlpha = 0.22 * fade;
          ctx.fillStyle = '#9a031e';
          ctx.beginPath(); ctx.arc(0, 0, zr * 0.96, 0, Math.PI * 2); ctx.fill();
          // 旋转八芒熔火日冕阵环
          const rotA = now * 0.0016 + seed;
          ctx.save();
          ctx.rotate(rotA);
          ctx.globalAlpha = 0.78 * fade;
          ctx.strokeStyle = '#ff6b35';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          for (let k = 0; k < 16; k++) {
            const ka = (Math.PI * 2 * k) / 16;
            const rr = k % 2 === 0 ? zr : zr * 0.80;
            k === 0 ? ctx.moveTo(Math.cos(ka) * rr, Math.sin(ka) * rr) : ctx.lineTo(Math.cos(ka) * rr, Math.sin(ka) * rr);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 1.7;
          ctx.beginPath(); ctx.arc(0, 0, zr * 0.62, 0, Math.PI * 2); ctx.stroke();
          // 地表熔岩裂纹
          for (let k = 0; k < 5; k++) {
            const ca = (Math.PI * 2 * k) / 5 + 0.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ca) * 8, Math.sin(ca) * 8);
            ctx.lineTo(Math.cos(ca + 0.16) * (zr * 0.44), Math.sin(ca + 0.16) * (zr * 0.44));
            ctx.lineTo(Math.cos(ca - 0.08) * (zr * 0.78), Math.sin(ca - 0.08) * (zr * 0.78));
            ctx.stroke();
          }
          ctx.restore();
          // 升腾跳跃的烈焰火舌与火星
          for (let fk = 0; fk < 7; fk++) {
            const cyc = ((now * 0.0024 + fk * 0.143 + seed) % 1);
            const fa = fk * 0.897 + seed * 2.1;
            const fd = zr * (0.18 + ((fk * 37) % 62) * 0.01);
            const fx = Math.cos(fa) * fd;
            const fy = Math.sin(fa) * fd - cyc * 18;
            const fh = (11 + (fk % 3) * 5) * (1 - cyc * 0.45);
            const fw = (5.5 + (fk % 2) * 2.5) * (1 - cyc * 0.35);
            ctx.globalAlpha = (1 - cyc * 0.75) * 0.86 * fade;
            ctx.fillStyle = cyc < 0.42 ? '#fff3b0' : (cyc < 0.74 ? '#ff9f1c' : '#e63946');
            ctx.beginPath();
            ctx.moveTo(fx - fw, fy + 4);
            ctx.quadraticCurveTo(fx - fw * 0.4, fy - fh * 0.6, fx + Math.sin(now * 0.015 + fk) * 3, fy - fh);
            ctx.quadraticCurveTo(fx + fw * 0.4, fy - fh * 0.6, fx + fw, fy + 4);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        } else if (z.kind === 'blizzard') {
          drawVfxGlow(ctx, 'glowCyan', z.x, z.y, zr * 1.26, 0.50 * fade);
          ctx.save();
          ctx.translate(z.x, z.y);
          ctx.globalAlpha = 0.18 * fade;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath(); ctx.arc(0, 0, zr * 0.98, 0, Math.PI * 2); ctx.fill();
          // 外层顺时针六棱冰晶法阵 + 内层逆时针雪花星芒
          ctx.save();
          ctx.rotate(now * 0.0014 + seed);
          ctx.globalAlpha = 0.82 * fade;
          ctx.strokeStyle = '#72efdd';
          ctx.lineWidth = 2.3;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ka = (Math.PI * 2 * k) / 6;
            k === 0 ? ctx.moveTo(Math.cos(ka) * zr, Math.sin(ka) * zr) : ctx.lineTo(Math.cos(ka) * zr, Math.sin(ka) * zr);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.strokeStyle = '#e0fbfc';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let k = 0; k < 3; k++) {
            const ka = (Math.PI * k) / 3;
            ctx.moveTo(Math.cos(ka) * -zr * 0.84, Math.sin(ka) * -zr * 0.84);
            ctx.lineTo(Math.cos(ka) * zr * 0.84, Math.sin(ka) * zr * 0.84);
          }
          ctx.stroke();
          ctx.restore();
          // 呼啸盘旋的暴风寒流气旋弧
          ctx.lineCap = 'round';
          for (let wk = 0; wk < 3; wk++) {
            const wa = -now * 0.0052 + wk * ((Math.PI * 2) / 3) + seed;
            const wr = zr * (0.38 + wk * 0.22);
            ctx.globalAlpha = 0.64 * fade;
            ctx.strokeStyle = wk % 2 === 0 ? '#bae6fd' : '#67e8f9';
            ctx.lineWidth = 2.6 - wk * 0.4;
            ctx.beginPath();
            ctx.arc(0, 0, wr, wa, wa + 1.65);
            ctx.stroke();
          }
          // 高速斜掠坠落的暴风雪冰雹流线与晶莹雪花
          for (let hk = 0; hk < 10; hk++) {
            const cyc = ((now * 0.0034 + hk * 0.103 + seed) % 1);
            const lane = ((hk * 29) % 100) / 100 - 0.5;
            const sx = lane * zr * 1.45 + (1 - cyc) * 26 - 13;
            const sy = (cyc - 0.5) * zr * 1.35;
            if (sx * sx + sy * sy > zr * zr * 0.96) continue;
            ctx.globalAlpha = (1 - Math.abs(cyc - 0.5) * 1.5) * 0.92 * fade;
            ctx.strokeStyle = '#f0f9ff';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(sx + 9, sy - 16);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        } else if (z.kind === 'poison_mist') {
          drawVfxGlow(ctx, 'glowGreen', z.x, z.y, zr * 1.26, 0.48 * fade);
          drawVfxGlow(ctx, 'glowViolet', z.x, z.y, zr * 0.80, 0.28 * fade);
          ctx.save();
          ctx.translate(z.x, z.y);
          // 翻涌交叠的浓稠万蛊剧毒云团
          for (let pk = 0; pk < 6; pk++) {
            const pa = now * 0.0009 * (pk % 2 === 0 ? 1 : -1) + (Math.PI * 2 * pk) / 6 + seed;
            const pd = zr * (0.32 + (pk % 2) * 0.16);
            const px = Math.cos(pa) * pd, py = Math.sin(pa) * pd;
            const pr = zr * (0.46 + 0.06 * Math.sin(now * 0.004 + pk));
            ctx.globalAlpha = 0.22 * fade;
            ctx.fillStyle = pk % 3 === 0 ? '#7209b7' : (pk % 2 === 0 ? '#10b981' : '#52b788');
            ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
          }
          // 炼金蚀骨咒文外环
          ctx.save();
          ctx.rotate(-now * 0.0012 + seed);
          ctx.globalAlpha = 0.74 * fade;
          ctx.strokeStyle = '#80ed99';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([12, 7]);
          ctx.beginPath(); ctx.arc(0, 0, zr * 0.94, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          // 咕嘟上浮破裂的荧光毒泡
          for (let bk = 0; bk < 8; bk++) {
            const cyc = ((now * 0.0019 + bk * 0.125 + seed) % 1);
            const ba = bk * 0.785 + seed * 1.7;
            const bd = zr * (0.16 + ((bk * 41) % 68) * 0.01);
            const bx = Math.cos(ba) * bd;
            const by = Math.sin(ba) * bd - cyc * 14;
            const br2 = (3.2 + (bk % 3) * 2.1) * (0.65 + cyc * 0.65);
            ctx.globalAlpha = (1 - cyc * 0.70) * 0.85 * fade;
            ctx.fillStyle = bk % 2 === 0 ? '#bef264' : '#c77dff';
            ctx.strokeStyle = '#ecfccb';
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(bx, by, br2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          ctx.restore();
        }
      }
    }

    // 差异化多形态地面预警与弹着点特效（十字棱镜光轨 / 次元裂空斩痕 / 高抛榴弹八角准星 / 冰晶六棱 / 烈阳八芒 / 天雷菱印 / 腐殖毒蕾 / 首领风眼）
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      const hr = Math.max(4, h.r || 40);
      const st = h.style || 'circle';
      const boundR = Math.max(hr, h.halfLen || 0) + (st === 'mortar_shell' ? 150 : 28);
      if (h.x + boundR < vL || h.x - boundR > vR || h.y + boundR < vT || h.y - boundR > vB) continue;
      const p = Math.max(0, Math.min(1, 1 - (h.t || 0) / Math.max(0.01, h.maxT || 1)));
      const hCol = h.color || '#ff3b6b';
      if (h.innerSafeR && h.innerSafeR > 8 && hr > h.innerSafeR + 6) {
        const inR = h.innerSafeR;
        const curOuter = inR + (hr - inR) * p;
        const bandW = Math.max(1.5, curOuter - inR);
        drawVfxGlow(ctx, 'glowRed', h.x, h.y, hr * 1.12, 0.24 + p * 0.24);
        drawVfxGlow(ctx, 'glowCyan', h.x, h.y, inR * 1.06, 0.26);
        ctx.save();
        ctx.globalAlpha = 0.18 + p * 0.28;
        ctx.strokeStyle = hCol;
        ctx.lineWidth = bandW;
        ctx.beginPath(); ctx.arc(h.x, h.y, inR + bandW * 0.5, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.90;
        ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.arc(h.x, h.y, hr, 0, Math.PI * 2); ctx.stroke();
        // 外环旋转毁灭刃齿刻度
        const spinT = now * 0.0022;
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        for (let tk = 0; tk < 12; tk++) {
          const ta = spinT + (Math.PI * 2 * tk) / 12;
          ctx.moveTo(h.x + Math.cos(ta) * (hr - 9), h.y + Math.sin(ta) * (hr - 9));
          ctx.lineTo(h.x + Math.cos(ta + 0.08) * (hr + 5), h.y + Math.sin(ta + 0.08) * (hr + 5));
        }
        ctx.stroke();
        ctx.strokeStyle = '#72efdd';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.arc(h.x, h.y, inR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '800 12px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#72efdd';
        ctx.fillText('✨内圈风眼安全', h.x, h.y + inR - 10);
        ctx.restore();
      } else if (st === 'cross_beam') {
        // 魂灯龛：旋转紫晶十字裂变棱镜光轨（非圆圈，四角象限安全）
        const hLen = Math.max(60, h.halfLen || hr);
        const hW = Math.max(10, h.halfW || 22);
        const baseAng = h.angle || 0;
        drawVfxGlow(ctx, 'glowViolet', h.x, h.y, Math.min(135, hLen * 0.55), 0.34 + p * 0.28);
        ctx.save();
        ctx.translate(h.x, h.y);
        for (let k = 0; k < 2; k++) {
          ctx.save();
          ctx.rotate(baseAng + k * Math.PI * 0.5);
          const curW = hW * (0.28 + p * 0.72);
          ctx.globalAlpha = 0.13 + p * 0.24;
          ctx.fillStyle = hCol;
          ctx.fillRect(-hLen, -curW, hLen * 2, curW * 2);
          ctx.globalAlpha = 0.84;
          ctx.strokeStyle = hCol;
          ctx.lineWidth = 2.0;
          ctx.setLineDash([10, 6]);
          ctx.beginPath();
          ctx.moveTo(-hLen, -hW); ctx.lineTo(hLen, -hW);
          ctx.moveTo(-hLen, hW); ctx.lineTo(hLen, hW);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.52 + p * 0.46;
          ctx.strokeStyle = '#f3d9fa';
          ctx.lineWidth = 1.8 + p * 2.6;
          ctx.beginPath();
          ctx.moveTo(-hLen, 0); ctx.lineTo(hLen, 0);
          ctx.stroke();
          ctx.restore();
        }
        if (Math.abs(h.rotSpd || 0) > 0.01) {
          const rotDir = h.rotSpd > 0 ? 1 : -1;
          const arcR = Math.min(hLen * 0.46, 76);
          ctx.globalAlpha = 0.62 + p * 0.32;
          ctx.strokeStyle = '#e9d5ff';
          ctx.fillStyle = '#f3e8ff';
          ctx.lineWidth = 1.8;
          for (let q = 0; q < 4; q++) {
            const qa = baseAng + q * Math.PI * 0.5 + Math.PI * 0.25;
            const a0 = qa - rotDir * 0.24;
            const a1 = qa + rotDir * 0.24;
            ctx.beginPath();
            ctx.arc(0, 0, arcR, a0, a1, rotDir < 0);
            ctx.stroke();
            const tx = Math.cos(a1) * arcR, ty = Math.sin(a1) * arcR;
            const tanA = a1 + rotDir * Math.PI * 0.5;
            const pxA = -Math.sin(tanA), pyA = Math.cos(tanA);
            ctx.beginPath();
            ctx.moveTo(tx + Math.cos(tanA) * 6.5, ty + Math.sin(tanA) * 6.5);
            ctx.lineTo(tx - Math.cos(tanA) * 3.5 + pxA * 4.0, ty - Math.sin(tanA) * 3.5 + pyA * 4.0);
            ctx.lineTo(tx - Math.cos(tanA) * 3.5 - pxA * 4.0, ty - Math.sin(tanA) * 3.5 - pyA * 4.0);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.rotate(baseAng + Math.PI * 0.25);
        const cSz = 9 + p * 6;
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = '#240046';
        ctx.strokeStyle = '#f3d9fa';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.rect(-cSz, -cSz, cSz * 2, cSz * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (st === 'void_slash') {
        // 唤灵师：次元裂空斜斩痕（梭形裂隙 + 锯齿紫电，非圆圈）
        const hLen = Math.max(60, h.halfLen || hr);
        const hW = Math.max(12, h.halfW || 26);
        drawVfxGlow(ctx, 'glowViolet', h.x, h.y, Math.min(125, hLen * 0.50), 0.30 + p * 0.28);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle || 0);
        ctx.globalAlpha = 0.16 + p * 0.28;
        ctx.fillStyle = hCol;
        ctx.beginPath();
        ctx.moveTo(-hLen, 0);
        ctx.quadraticCurveTo(0, -hW * 1.32 * p, hLen, 0);
        ctx.quadraticCurveTo(0, hW * 1.32 * p, -hLen, 0);
        ctx.fill();
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = hCol;
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.moveTo(-hLen, 0);
        ctx.quadraticCurveTo(0, -hW * 1.32, hLen, 0);
        ctx.quadraticCurveTo(0, hW * 1.32, -hLen, 0);
        ctx.stroke();
        ctx.globalAlpha = 0.68 + p * 0.32;
        ctx.strokeStyle = '#f8f0fc';
        ctx.lineWidth = 2.0 + p * 2.2;
        ctx.beginPath();
        ctx.moveTo(-hLen, 0);
        for (let s = 1; s < 6; s++) {
          const sx = -hLen + (hLen * 2 * s) / 6;
          const sy = (s % 2 === 0 ? 1 : -1) * (3 + p * 6);
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(hLen, 0);
        ctx.stroke();
        ctx.restore();
      } else if (st === 'mortar_shell') {
        // 发条臼炮：八角机械火控准星 + 空中高抛榴弹实体飞行轨迹
        drawVfxGlow(ctx, 'glowOrange', h.x, h.y, hr * 1.18, 0.24 + p * 0.28);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.globalAlpha = 0.12 + p * 0.22;
        ctx.fillStyle = hCol;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const ka = (Math.PI * 2 * k) / 8 + Math.PI / 8;
          const ox = Math.cos(ka) * hr * p, oy = Math.sin(ka) * hr * p;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = hCol;
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const ka = (Math.PI * 2 * k) / 8 + Math.PI / 8;
          const ox = Math.cos(ka) * hr, oy = Math.sin(ka) * hr;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.stroke();
        const lockR = Math.max(6, hr * (1 - p * 0.72));
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-hr * 1.06, 0); ctx.lineTo(-hr * 0.62, 0);
        ctx.moveTo(hr * 0.62, 0); ctx.lineTo(hr * 1.06, 0);
        ctx.moveTo(0, -hr * 1.06); ctx.lineTo(0, -hr * 0.62);
        ctx.moveTo(0, hr * 0.62); ctx.lineTo(0, hr * 1.06);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(-lockR * 0.55, -lockR * 0.55, lockR * 1.1, lockR * 1.1);
        ctx.stroke();
        ctx.restore();
        if (Number.isFinite(h.srcX) && Number.isFinite(h.srcY)) {
          const arcH = 138;
          const bx = h.srcX + (h.x - h.srcX) * p;
          const by = h.srcY + (h.y - h.srcY) * p - Math.sin(p * Math.PI) * arcH;
          const prevP = Math.max(0, p - 0.09);
          const px0 = h.srcX + (h.x - h.srcX) * prevP;
          const py0 = h.srcY + (h.y - h.srcY) * prevP - Math.sin(prevP * Math.PI) * arcH;
          const bAng = Math.atan2(by - py0, bx - px0);
          ctx.save();
          ctx.globalAlpha = 0.62;
          ctx.strokeStyle = '#ffbe0b';
          ctx.lineWidth = 3.2;
          ctx.setLineDash([6, 5]);
          ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(bx, by); ctx.stroke();
          ctx.setLineDash([]);
          ctx.translate(bx, by);
          ctx.rotate(bAng);
          ctx.globalAlpha = 0.96;
          ctx.fillStyle = '#ff6b35';
          ctx.strokeStyle = '#fff3b0';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(11, 0);
          ctx.quadraticCurveTo(3, -6.5, -8, -5);
          ctx.lineTo(-10, 0);
          ctx.lineTo(-8, 5);
          ctx.quadraticCurveTo(3, 6.5, 11, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      } else if (st === 'frost_hex') {
        // 极寒冰晶六棱星盘阵（柔青冰霜辉光 + 双层旋冰棱 + 顶点冰钻）
        drawVfxGlow(ctx, 'glowCyan', h.x, h.y, hr * 1.28, 0.30 + p * 0.34);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(p * 0.28);
        ctx.globalAlpha = 0.15 + p * 0.24;
        ctx.fillStyle = hCol;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ka = (Math.PI * 2 * k) / 6;
          const ox = Math.cos(ka) * hr * p, oy = Math.sin(ka) * hr * p;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.90;
        ctx.strokeStyle = hCol;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ka = (Math.PI * 2 * k) / 6;
          const ox = Math.cos(ka) * hr, oy = Math.sin(ka) * hr;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 0.62 + p * 0.35;
        ctx.strokeStyle = '#e0fbfc';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const ka = (Math.PI * k) / 3;
          ctx.moveTo(Math.cos(ka) * -hr * 0.82, Math.sin(ka) * -hr * 0.82);
          ctx.lineTo(Math.cos(ka) * hr * 0.82, Math.sin(ka) * hr * 0.82);
        }
        ctx.stroke();
        ctx.fillStyle = '#f0f9ff';
        for (let k = 0; k < 6; k++) {
          const ka = (Math.PI * 2 * k) / 6;
          ctx.beginPath(); ctx.arc(Math.cos(ka) * hr, Math.sin(ka) * hr, 2.8 + p * 1.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      } else if (st === 'flame_pillar') {
        // 熔火烈阳八芒圣柱阵（炽橙烈焰辉光 + 双旋日冕纹 + 曜金核环）
        drawVfxGlow(ctx, 'glowOrange', h.x, h.y, hr * 1.30, 0.34 + p * 0.36);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(p * 0.65);
        ctx.globalAlpha = 0.16 + p * 0.26;
        ctx.fillStyle = hCol;
        ctx.beginPath();
        for (let k = 0; k < 16; k++) {
          const ka = (Math.PI * 2 * k) / 16;
          const rad = (k % 2 === 0 ? hr : hr * 0.66) * p;
          const ox = Math.cos(ka) * rad, oy = Math.sin(ka) * rad;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.90;
        ctx.strokeStyle = hCol;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let k = 0; k < 16; k++) {
          const ka = (Math.PI * 2 * k) / 16;
          const rad = k % 2 === 0 ? hr : hr * 0.68;
          const ox = Math.cos(ka) * rad, oy = Math.sin(ka) * rad;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(4, hr * 0.42 * p), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (st === 'thunder_sigil') {
        // 天雷落雷星芒菱印（金紫雷耀辉光 + 旋转雷篆方阵 + 聚雷光针）
        drawVfxGlow(ctx, 'glowGold', h.x, h.y, hr * 1.28, 0.32 + p * 0.36);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(-p * 0.75);
        ctx.globalAlpha = 0.15 + p * 0.26;
        ctx.fillStyle = hCol;
        ctx.beginPath();
        ctx.moveTo(0, -hr * p); ctx.lineTo(hr * p, 0); ctx.lineTo(0, hr * p); ctx.lineTo(-hr * p, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.92;
        ctx.strokeStyle = hCol;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, -hr); ctx.lineTo(hr, 0); ctx.lineTo(0, hr); ctx.lineTo(-hr, 0);
        ctx.closePath();
        ctx.stroke();
        const sq = hr * 0.68;
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.rect(-sq, -sq, sq * 2, sq * 2);
        ctx.moveTo(-hr * 0.45, 0); ctx.lineTo(hr * 0.45, 0);
        ctx.moveTo(0, -hr * 0.45); ctx.lineTo(0, hr * 0.45);
        ctx.stroke();
        ctx.restore();
      } else if (st === 'venom_mire') {
        // 剧毒腐殖花瓣泥潭（翡绿蛊雾辉光 + 蠕动毒蕾波纹 + 中心毒核）
        drawVfxGlow(ctx, 'glowGreen', h.x, h.y, hr * 1.28, 0.32 + p * 0.30);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.globalAlpha = 0.16 + p * 0.24;
        ctx.fillStyle = hCol;
        ctx.beginPath();
        for (let k = 0; k < 24; k++) {
          const ka = (Math.PI * 2 * k) / 24;
          const wob = 0.86 + 0.14 * Math.sin(k * 2 + p * 6);
          const ox = Math.cos(ka) * hr * p * wob, oy = Math.sin(ka) * hr * p * wob;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = hCol;
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        for (let k = 0; k < 24; k++) {
          const ka = (Math.PI * 2 * k) / 24;
          const wob = 0.88 + 0.12 * Math.sin(k * 2 + p * 6);
          const ox = Math.cos(ka) * hr * wob, oy = Math.sin(ka) * hr * wob;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#d9f99d';
        ctx.globalAlpha = 0.55 + p * 0.35;
        for (let bk = 0; bk < 3; bk++) {
          const ba = p * 3.2 + bk * 2.09;
          ctx.beginPath(); ctx.arc(Math.cos(ba) * hr * 0.36, Math.sin(ba) * hr * 0.36, 3.0 + p * 2.0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      } else {
        // 首领通用奥术轰击圆阵：元素柔光晕 + 外圈符文虚线环 + 四向内敛星芒准星（告别简陋单圆圈）
        const glowKey = (hCol.includes('72ef') || hCol.includes('38bd') || hCol.includes('48ca')) ? 'glowCyan'
          : ((hCol.includes('c77d') || hCol.includes('c084') || hCol.includes('9d4e') || hCol.includes('e879')) ? 'glowViolet'
          : ((hCol.includes('ffd1') || hCol.includes('fde6') || hCol.includes('fbbf')) ? 'glowGold'
          : ((hCol.includes('52b7') || hCol.includes('80ed') || hCol.includes('a3e6')) ? 'glowGreen' : 'glowRed')));
        drawVfxGlow(ctx, glowKey, h.x, h.y, hr * 1.24, 0.26 + p * 0.30);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.globalAlpha = 0.14 + p * 0.24;
        ctx.fillStyle = hCol;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0.5, hr * p), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = hCol;
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(0, 0, hr, 0, Math.PI * 2); ctx.stroke();
        ctx.rotate(now * 0.0020 + i * 0.7);
        ctx.globalAlpha = 0.66 + p * 0.28;
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 6]);
        ctx.beginPath(); ctx.arc(0, 0, Math.max(4, hr * 0.76), 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        const tickIn = hr * (0.92 - p * 0.30);
        ctx.beginPath();
        for (let tk = 0; tk < 4; tk++) {
          const ta = tk * Math.PI * 0.5;
          ctx.moveTo(Math.cos(ta) * (hr + 4), Math.sin(ta) * (hr + 4));
          ctx.lineTo(Math.cos(ta) * tickIn, Math.sin(ta) * tickIn);
        }
        ctx.stroke();
        ctx.restore();
      }
      if (h.chainStep > 0) {
        ctx.save();
        if (Number.isFinite(h.prevX) && Number.isFinite(h.prevY)) {
          ctx.globalAlpha = 0.52 + p * 0.30;
          ctx.strokeStyle = hCol;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([7, 6]);
          ctx.beginPath();
          ctx.moveTo(h.prevX, h.prevY);
          ctx.lineTo(h.x, h.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const fallRem = Math.max(0, 1 - p);
        const fallX = h.x + fallRem * 36;
        const fallY = h.y - fallRem * 92;
        ctx.globalAlpha = 0.45 + p * 0.48;
        ctx.strokeStyle = h.shrapnel > 0 ? '#fef08a' : '#bae6fd';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(fallX + 14, fallY - 34);
        ctx.lineTo(fallX, fallY);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fallX, fallY, 3.2 + p * 2.0, 0, Math.PI * 2);
        ctx.fill();
        if (h.shrapnel > 0) {
          ctx.globalAlpha = 0.86;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.4;
          for (let sk = 0; sk < 4; sk++) {
            const sa = sk * Math.PI * 0.5;
            ctx.beginPath();
            ctx.moveTo(h.x + Math.cos(sa) * (hr + 2), h.y + Math.sin(sa) * (hr + 2));
            ctx.lineTo(h.x + Math.cos(sa) * (hr + 13), h.y + Math.sin(sa) * (hr + 13));
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 0.92;
        ctx.font = '800 13px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 3.2;
        const stepTxt = h.shrapnel > 0 ? `★${h.chainStep}` : `${h.chainStep}`;
        ctx.strokeText(stepTxt, h.x, h.y);
        ctx.fillStyle = h.shrapnel > 0 ? '#fef08a' : '#e0f2fe';
        ctx.fillText(stepTxt, h.x, h.y);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hp <= 0) continue;
      if (fogCullActive && Math.hypot(e.x - player.x, e.y - player.y) - (e.r || 0) >= fogWorldCutR) continue;
      if (e.type === 'bomber' && e.primed) {
        const br = Math.max(12, e.blastR || 86);
        const p = Math.max(0, Math.min(1, 1 - e.fuseT / Math.max(0.05, e.maxFuseT || 1.25)));
        ctx.fillStyle = `rgba(255, 190, 11, ${0.12 + p * 0.24})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(0.5, br * p), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 77, 109, 0.88)';
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(e.x, e.y, br, 0, Math.PI * 2); ctx.stroke();
      } else if (e.aimA !== undefined) {
        // 寒晶狙击蛛高辨识度三层红外锁定走廊（外层绯红警戒光带 + 高亮金红准星轴线 + 枪口蓄力环，一眼看清弹道！）
        const aimMax = e.aimMaxT || 0.72;
        const aimProg = Math.max(0.10, Math.min(1, 1 - Math.max(0, e.shotT || 0) / aimMax));
        const aimLen = 420;
        const ax2 = e.x + Math.cos(e.aimA) * aimLen, ay2 = e.y + Math.sin(e.aimA) * aimLen;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(255, 42, 85, ${0.15 + aimProg * 0.20})`;
        ctx.lineWidth = 12;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(ax2, ay2); ctx.stroke();
        ctx.strokeStyle = aimProg > 0.68 ? '#ffd166' : '#ff4d6d';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([10, 6]);
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(ax2, ay2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(8, (e.r + 10) * (1.25 - aimProg * 0.35)), 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ff2a55';
        ctx.beginPath(); ctx.arc(ax2, ay2, 7.5, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if ((e.sigWindupT || 0) > 0) {
        // 四幕固定守誓首领与无尽主宰标志性杀招奥术星盘法阵（预烘焙离屏辉光贴图 + 双旋符文阵环 + 能量聚核，告别生硬几何块）
        const sProg = Math.max(0.05, Math.min(1, 1 - e.sigWindupT / Math.max(0.1, e.sigMaxW || 0.88)));
        const baseA = Number.isFinite(e.sigBaseA) ? e.sigBaseA : 0;
        ctx.save();
        ctx.lineCap = 'round';
        if (e.sigKind === 'frost_prism') {
          // 艾丝特莉亚 · 六棱极光冰晶大星阵
          drawVfxGlow(ctx, 'glowCyan', e.x, e.y, 210 * (0.45 + sProg * 0.55), 0.42 + sProg * 0.28);
          ctx.strokeStyle = `rgba(125, 211, 252, ${0.34 + sProg * 0.55})`;
          ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.arc(e.x, e.y, 172 * sProg, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.52)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([10, 6]);
          ctx.beginPath(); ctx.arc(e.x, e.y, 186, now * 0.002, now * 0.002 + Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          for (let tri = 0; tri < 2; tri++) {
            ctx.strokeStyle = tri === 0 ? '#7dd3fc' : '#e0f2fe';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            for (let k = 0; k < 3; k++) {
              const pa = baseA + tri * (Math.PI / 3) + (k * Math.PI * 2) / 3 + (tri === 0 ? sProg * 0.16 : -sProg * 0.16);
              const px = e.x + Math.cos(pa) * 172, py = e.y + Math.sin(pa) * 172;
              k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();
          }
          for (let k = 0; k < 6; k++) {
            const ha = baseA + (k / 6) * Math.PI * 2;
            const hx = e.x + Math.cos(ha) * 172, hy = e.y + Math.sin(ha) * 172;
            drawVfxGlow(ctx, 'glowCyan', hx, hy, 26 + sProg * 18, 0.55);
            ctx.fillStyle = '#f0f9ff';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(hx, hy - 9); ctx.lineTo(hx + 7, hy); ctx.lineTo(hx, hy + 9); ctx.lineTo(hx - 7, hy);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          }
        } else if (e.sigKind === 'chrono_dial') {
          // 伽蓝 · 十二刻星晷逆时针天体仪法盘
          const dialR = 168;
          drawVfxGlow(ctx, 'glowViolet', e.x, e.y, dialR * 1.18, 0.36 + sProg * 0.24);
          drawVfxGlow(ctx, 'glowGold', e.x, e.y, dialR * 0.72 * sProg, 0.42);
          ctx.strokeStyle = `rgba(253, 230, 138, ${0.40 + sProg * 0.52})`;
          ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.arc(e.x, e.y, dialR, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = 'rgba(233, 213, 255, 0.68)';
          ctx.lineWidth = 1.7;
          ctx.setLineDash([8, 6]);
          ctx.beginPath(); ctx.arc(e.x, e.y, dialR - 22, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(8, dialR * sProg), 0, Math.PI * 2); ctx.stroke();
          for (let k = 0; k < 12; k++) {
            const ta = baseA + (k / 12) * Math.PI * 2;
            ctx.strokeStyle = k % 3 === 0 ? '#fde68a' : 'rgba(192, 132, 252, 0.85)';
            ctx.lineWidth = k % 3 === 0 ? 3.2 : 1.9;
            ctx.beginPath();
            ctx.moveTo(e.x + Math.cos(ta) * (dialR - 18), e.y + Math.sin(ta) * (dialR - 18));
            ctx.lineTo(e.x + Math.cos(ta) * (dialR + 9), e.y + Math.sin(ta) * (dialR + 9));
            ctx.stroke();
          }
          const handA = baseA - sProg * Math.PI * 2;
          ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 3.4;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + Math.cos(handA) * (dialR - 12), e.y + Math.sin(handA) * (dialR - 12));
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + Math.cos(-handA * 0.5) * (dialR * 0.54), e.y + Math.sin(-handA * 0.5) * (dialR * 0.54));
          ctx.stroke();
        } else if (e.sigKind === 'eclipse_lances') {
          // 日蚀圣女 · 黑日圣枪外环星轨信标
          const tx = Number.isFinite(e.sigTargetX) ? e.sigTargetX : e.x;
          const ty = Number.isFinite(e.sigTargetY) ? e.sigTargetY : e.y;
          drawVfxGlow(ctx, 'glowGold', tx, ty, 120 * sProg, 0.32);
          ctx.strokeStyle = `rgba(253, 230, 138, ${0.34 + sProg * 0.55})`;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([9, 7]);
          ctx.beginPath(); ctx.arc(tx, ty, 230, 0, Math.PI * 2); ctx.stroke();
          for (let k = 0; k < 6; k++) {
            const ba = baseA + (k / 6) * Math.PI * 2;
            const sx = Math.max(48, Math.min(WORLD.w - 48, tx + Math.cos(ba) * 230));
            const sy = Math.max(48, Math.min(WORLD.h - 48, ty + Math.sin(ba) * 230));
            const fireA = Math.atan2(ty - sy, tx - sx) + (k % 2 === 0 ? 0.22 : -0.22);
            drawVfxGlow(ctx, 'glowGold', sx, sy, 28, 0.65);
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.24)';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(fireA) * 320 * sProg, sy + Math.sin(fireA) * 320 * sProg);
            ctx.stroke();
            ctx.setLineDash([9, 7]);
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(fireA) * 320 * sProg, sy + Math.sin(fireA) * 320 * sProg);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#fffbeb';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.0;
            ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          ctx.setLineDash([]);
        } else if (e.sigKind === 'omega_cross_beam') {
          // 欧米茄 · 十字重型等离子歼灭主炮充能导轨（炮口聚变辉光 + 等离子束核）
          const innerOff = (e.r || 42) + 18;
          drawVfxGlow(ctx, 'glowOrange', e.x, e.y, innerOff * 1.55, 0.45 + sProg * 0.35);
          for (let k = 0; k < 4; k++) {
            const ba = baseA + k * (Math.PI * 0.5);
            const sx = e.x + Math.cos(ba) * innerOff, sy = e.y + Math.sin(ba) * innerOff;
            const ex = e.x + Math.cos(ba) * 460, ey = e.y + Math.sin(ba) * 460;
            const curLen = innerOff + (460 - innerOff) * sProg;
            drawVfxGlow(ctx, 'glowOrange', sx, sy, 26 + sProg * 14, 0.68);
            ctx.strokeStyle = `rgba(251, 146, 60, ${0.18 + sProg * 0.26})`;
            ctx.lineWidth = 24;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
            ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.x + Math.cos(ba) * curLen, e.y + Math.sin(ba) * curLen); ctx.stroke();
            ctx.strokeStyle = '#fffbeb';
            ctx.lineWidth = 2.8;
            ctx.setLineDash([12, 8]);
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.x + Math.cos(ba) * curLen, e.y + Math.sin(ba) * curLen); ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2.8;
          ctx.beginPath(); ctx.arc(e.x, e.y, innerOff, 0, Math.PI * 2); ctx.stroke();
        } else if (e.sigKind === 'venom_vortex') {
          // 苍岚毒皇 · 万蛊翠岚龙卷阵
          drawVfxGlow(ctx, 'glowGreen', e.x, e.y, 195 * (0.45 + sProg * 0.55), 0.44 + sProg * 0.26);
          ctx.strokeStyle = `rgba(110, 231, 183, ${0.36 + sProg * 0.52})`;
          ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.arc(e.x, e.y, 168 * sProg, 0, Math.PI * 2); ctx.stroke();
          for (let k = 0; k < 10; k++) {
            const ba = baseA + (k / 10) * Math.PI * 2 + sProg * 0.65;
            ctx.strokeStyle = k % 2 === 0 ? '#bef264' : '#6ee7b7';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(e.x + Math.cos(ba) * 36, e.y + Math.sin(ba) * 36);
            ctx.quadraticCurveTo(
              e.x + Math.cos(ba + 0.22) * 108 * sProg,
              e.y + Math.sin(ba + 0.22) * 108 * sProg,
              e.x + Math.cos(ba + 0.44) * 176 * sProg,
              e.y + Math.sin(ba + 0.44) * 176 * sProg
            );
            ctx.stroke();
          }
        } else {
          // 烬羽 · 断刃·八荒血月斩法阵（绯红血月辉光 + 弧月剑气刃芒）
          const ways = (e.hp < e.maxHp * 0.55 || overtime || e.mythicPhase2) ? 8 : 4;
          drawVfxGlow(ctx, 'glowRed', e.x, e.y, 185 * (0.45 + sProg * 0.55), 0.42 + sProg * 0.30);
          ctx.strokeStyle = 'rgba(253, 164, 175, 0.58)';
          ctx.lineWidth = 2.0;
          ctx.setLineDash([10, 6]);
          ctx.beginPath(); ctx.arc(e.x, e.y, 108 + sProg * 48, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          for (let k = 0; k < ways; k++) {
            const ba = baseA + (k / ways) * Math.PI * 2;
            const ex = e.x + Math.cos(ba) * 235, ey = e.y + Math.sin(ba) * 235;
            ctx.strokeStyle = `rgba(251, 113, 133, ${0.18 + sProg * 0.24})`;
            ctx.lineWidth = 18;
            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(e.x + Math.cos(ba) * 24, e.y + Math.sin(ba) * 24);
            ctx.lineTo(e.x + Math.cos(ba) * 235 * sProg, e.y + Math.sin(ba) * 235 * sProg);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      // 第 10 层幽影雷刃统领 & 第 12 层逆时星晷主宰：相位传送落点预警法阵（D1->D5 阶梯紧缩倒计时星环 + 虚线跃迁轨 + 幻影锚点）
      if ((e.tpWindupT || 0) > 0 && Number.isFinite(e.tpDestX) && Number.isFinite(e.tpDestY)) {
        const tpMax = Math.max(0.15, e.tpWindupMax || 0.85);
        const tpRem = Math.max(0, Math.min(1, e.tpWindupT / tpMax));
        const tpProg = 1 - tpRem;
        const tpCol = e.tpWarnColor || '#c77dff';
        const tx = e.tpDestX, ty = e.tpDestY;
        const destR = Math.max(30, (e.r || 28) * 1.18);
        drawVfxGlow(ctx, 'glowViolet', tx, ty, destR * 1.45, 0.34 + tpProg * 0.36);
        ctx.save();
        ctx.lineCap = 'round';
        // 1) 起跳点残相坍缩环与跃迁牵引虚线
        ctx.globalAlpha = 0.45 + tpProg * 0.35;
        ctx.strokeStyle = tpCol;
        ctx.lineWidth = 2.0;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, (e.r || 28) * (0.95 + tpRem * 0.35), 0, Math.PI * 2);
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
        // 2) 落点底盘警示暗圈 + 随剩余预警时间快速收束的倒计时外环
        ctx.globalAlpha = 0.16 + tpProg * 0.22;
        ctx.fillStyle = tpCol;
        ctx.beginPath(); ctx.arc(tx, ty, destR, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.90;
        ctx.strokeStyle = tpCol;
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(tx, ty, destR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(tx, ty, destR * (1 + tpRem * 0.85), 0, Math.PI * 2); ctx.stroke();
        // 3) 落点旋转星晷十字准星与半透明虚影轮廓
        ctx.translate(tx, ty);
        ctx.rotate(now * 0.0055 * (e.variant === 'void_weaver' ? -1 : 1));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.9;
        for (let k = 0; k < 4; k++) {
          const ka = k * Math.PI * 0.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ka) * (destR * 0.35), Math.sin(ka) * (destR * 0.35));
          ctx.lineTo(Math.cos(ka) * (destR * 0.92), Math.sin(ka) * (destR * 0.92));
          ctx.stroke();
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, 4.2 + tpProg * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // 艾丝特莉亚 / 凛霜统领先导轨预警后缓旋的双翼/四翼极光冰束（枪口冰耀辉光 + 螺旋寒晶流粒子）
      if ((e.beamWindupT || 0) > 0 || (e.beamSweepT || 0) > 0) {
        const innerOff = (e.r || 36) + (e.type === 'mini_boss' ? 18 : 20);
        const bLen = e.type === 'mini_boss' ? 325 : (e.beamSweepQuad ? 380 : 345);
        const beamCnt = e.beamSweepQuad ? 4 : 2;
        const ba0 = e.beamSweepA || 0;
        ctx.save();
        ctx.lineCap = 'round';
        if ((e.beamWindupT || 0) > 0) {
          const wProg = Math.max(0.1, Math.min(1, 1 - e.beamWindupT / Math.max(0.1, e.beamWindupMax || 0.55)));
          drawVfxGlow(ctx, 'glowCyan', e.x, e.y, innerOff * 1.35, 0.34 + wProg * 0.28);
          for (let bi = 0; bi < beamCnt; bi++) {
            const ba = ba0 + (bi / beamCnt) * Math.PI * 2;
            const bx1 = e.x + Math.cos(ba) * innerOff, by1 = e.y + Math.sin(ba) * innerOff;
            const bx2 = e.x + Math.cos(ba) * bLen, by2 = e.y + Math.sin(ba) * bLen;
            const curL = innerOff + (bLen - innerOff) * wProg;
            drawVfxGlow(ctx, 'glowCyan', bx1, by1, 24, 0.58);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.16 + wProg * 0.22})`;
            ctx.lineWidth = 18;
            ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 2.6;
            ctx.setLineDash([9, 6]);
            ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(e.x + Math.cos(ba) * curL, e.y + Math.sin(ba) * curL); ctx.stroke();
            ctx.setLineDash([]);
          }
        } else {
          drawVfxGlow(ctx, 'glowCyan', e.x, e.y, innerOff * 1.48, 0.52);
          for (let bi = 0; bi < beamCnt; bi++) {
            const ba = ba0 + (bi / beamCnt) * Math.PI * 2;
            const ca = Math.cos(ba), sa = Math.sin(ba);
            const bx1 = e.x + ca * innerOff, by1 = e.y + sa * innerOff;
            const bx2 = e.x + ca * bLen, by2 = e.y + sa * bLen;
            drawVfxGlow(ctx, 'glowCyan', bx1, by1, 34, 0.72);
            drawVfxGlow(ctx, 'glowCyan', bx2, by2, 28, 0.52);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.30)';
            ctx.lineWidth = 22;
            ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
            ctx.strokeStyle = '#7dd3fc';
            ctx.lineWidth = 9.0;
            ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3.2;
            ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
            // 沿激光束奔涌的寒霜等离子光点
            ctx.fillStyle = '#f0f9ff';
            for (let pk = 0; pk < 4; pk++) {
              const pf = ((now * 0.0042 + pk * 0.25) % 1);
              const pd = innerOff + (bLen - innerOff) * pf;
              const wob = Math.sin(now * 0.02 + pk * 2.1) * 5;
              ctx.beginPath();
              ctx.arc(e.x + ca * pd - sa * wob, e.y + sa * pd + ca * wob, 3.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }
      // 首领高压扇形【剧毒吐息喷流】蓄力扇面预警与多层雾化毒息特效（支持单向横扫与二阶段双龙双向毒息！）
      if ((e.venomWindupT || 0) > 0 || (e.venomBreathT || 0) > 0) {
        const vLen = e.venomLen || 278;
        const vSpan = e.venomSpan || 0.46;
        const nozzles = e.venomTwin ? [0, Math.PI] : [0];
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if ((e.venomWindupT || 0) > 0) {
          const vProg = Math.max(0.06, Math.min(1, 1 - e.venomWindupT / Math.max(0.1, e.venomWindupMax || 0.56)));
          for (let ni = 0; ni < nozzles.length; ni++) {
            const na = (e.venomAimA || 0) + nozzles[ni];
            ctx.fillStyle = `rgba(132, 204, 22, ${0.12 + vProg * 0.16})`;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.arc(e.x, e.y, vLen, na - vSpan, na + vSpan);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(163, 230, 53, 0.24)';
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.arc(e.x, e.y, vLen * vProg, na - vSpan * 0.92, na + vSpan * 0.92);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#bef264';
            ctx.lineWidth = 2.2;
            ctx.setLineDash([9, 6]);
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + Math.cos(na - vSpan) * vLen, e.y + Math.sin(na - vSpan) * vLen);
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + Math.cos(na + vSpan) * vLen, e.y + Math.sin(na + vSpan) * vLen);
            ctx.arc(e.x, e.y, vLen, na - vSpan, na + vSpan);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else {
          const bAlpha = Math.min(1, (e.venomBreathT || 0) / 0.22);
          for (let ni = 0; ni < nozzles.length; ni++) {
            const na = (e.venomAimA || 0) + nozzles[ni];
            const mx = e.x + Math.cos(na) * (e.r * 0.56);
            const my = e.y + Math.sin(na) * (e.r * 0.56);
            drawVfxGlow(ctx, 'glowGreen', mx, my, 42, 0.65 * bAlpha);
            // 1) 外层翻涌祖母绿毒雾锥幕
            ctx.globalAlpha = 0.28 * bAlpha;
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.arc(e.x, e.y, vLen, na - vSpan, na + vSpan);
            ctx.closePath();
            ctx.fill();
            // 2) 中层高压荧光毒液喷射扇流
            ctx.globalAlpha = 0.46 * bAlpha;
            ctx.fillStyle = '#84cc16';
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.arc(e.x, e.y, vLen * 0.93, na - vSpan * 0.62, na + vSpan * 0.62);
            ctx.closePath();
            ctx.fill();
            // 3) 内芯蜿蜒高压酸液激流线
            ctx.globalAlpha = 0.92 * bAlpha;
            ctx.strokeStyle = '#ecfccb';
            ctx.lineWidth = 7.5;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            for (let s = 1; s <= 5; s++) {
              const frac = s / 5;
              const wag = Math.sin(now * 0.022 - s * 1.35 + ni) * (10 * frac);
              const px = e.x + Math.cos(na) * (vLen * 0.88 * frac) - Math.sin(na) * wag;
              const py = e.y + Math.sin(na) * (vLen * 0.88 * frac) + Math.cos(na) * wag;
              ctx.lineTo(px, py);
            }
            ctx.stroke();
            // 4) 扇区内高速飞溅的毒泡气团，营造饱满立体喷毒流体质感
            for (let pk = 0; pk < 7; pk++) {
              const tFlow = ((now * 0.0036 + pk * 0.143) % 1);
              const spreadA = na + Math.sin(pk * 2.3 + now * 0.005) * (vSpan * 0.78);
              const distFlow = e.r * 0.6 + tFlow * (vLen - e.r * 0.6);
              const bx = e.x + Math.cos(spreadA) * distFlow;
              const by = e.y + Math.sin(spreadA) * distFlow;
              const bubR = (3.5 + (pk % 3) * 2.2) * (0.65 + tFlow * 0.75);
              ctx.globalAlpha = (1 - tFlow * 0.58) * 0.82 * bAlpha;
              ctx.fillStyle = pk % 2 === 0 ? '#bef264' : '#34d399';
              ctx.beginPath(); ctx.arc(bx, by, bubR, 0, Math.PI * 2); ctx.fill();
            }
          }
        }
        ctx.restore();
      }
      // 隐藏二阶段【专属额外终式】地面高辨识度神话圣辉蓄力大法阵
      if ((e.p2WindupT || 0) > 0) {
        const p2Prog = Math.max(0.08, Math.min(1, 1 - e.p2WindupT / Math.max(0.1, e.p2WindupMax || 0.78)));
        const baseA = Number.isFinite(e.p2BaseA) ? e.p2BaseA : 0;
        ctx.save();
        ctx.lineCap = 'round';
        if (e.p2Kind === 'p2_chrono_octa') {
          const gx = Number.isFinite(e.p2TargetX) ? e.p2TargetX : e.x;
          const gy = Number.isFinite(e.p2TargetY) ? e.p2TargetY : e.y;
          const span = 520;
          drawVfxGlow(ctx, 'glowGold', gx, gy, 145 * (0.5 + p2Prog * 0.5), 0.52);
          drawVfxGlow(ctx, 'glowViolet', gx, gy, 95, 0.45);
          for (let k = 0; k < 4; k++) {
            const la = baseA + k * (Math.PI * 0.25);
            const x1 = gx - Math.cos(la) * span, y1 = gy - Math.sin(la) * span;
            const x2 = gx + Math.cos(la) * span, y2 = gy + Math.sin(la) * span;
            ctx.strokeStyle = `rgba(253, 230, 138, ${0.16 + p2Prog * 0.24})`;
            ctx.lineWidth = 22;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.strokeStyle = k % 2 === 0 ? '#fde68a' : '#e879f9';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([10, 7]);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.arc(gx, gy, 68 * (1.2 - p2Prog * 0.45), 0, Math.PI * 2); ctx.stroke();
        } else if (e.p2Kind === 'p2_absolute_zero') {
          const innerOff = (e.r || 36) + (e.type === 'mini_boss' ? 18 : 20);
          drawVfxGlow(ctx, 'glowCyan', e.x, e.y, 135 * (0.5 + p2Prog * 0.5), 0.55);
          for (let k = 0; k < 4; k++) {
            const ba = baseA + k * (Math.PI * 0.5);
            const sx = e.x + Math.cos(ba) * innerOff, sy = e.y + Math.sin(ba) * innerOff;
            const ex = e.x + Math.cos(ba) * 380, ey = e.y + Math.sin(ba) * 380;
            drawVfxGlow(ctx, 'glowCyan', sx, sy, 28, 0.62);
            ctx.strokeStyle = `rgba(125, 211, 252, ${0.18 + p2Prog * 0.24})`;
            ctx.lineWidth = 20;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 2.6; ctx.setLineDash([9, 6]);
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.setLineDash([]);
          }
        } else if (e.p2Kind === 'p2_twin_venom') {
          drawVfxGlow(ctx, 'glowGreen', e.x, e.y, 128 * (0.5 + p2Prog * 0.5), 0.50);
          for (let ni = 0; ni < 2; ni++) {
            const na = baseA + ni * Math.PI;
            ctx.fillStyle = `rgba(163, 230, 53, ${0.15 + p2Prog * 0.18})`;
            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, 278, na - 0.36, na + 0.36); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#d9f99d'; ctx.lineWidth = 2.4; ctx.setLineDash([8, 6]);
            ctx.beginPath(); ctx.arc(e.x, e.y, 278 * p2Prog, na - 0.36, na + 0.36); ctx.stroke(); ctx.setLineDash([]);
          }
        } else {
          const cx = (e.p2Kind === 'p2_eclipse_apocalypse' || e.p2Kind === 'p2_crimson_prison') && Number.isFinite(e.p2TargetX) ? e.p2TargetX : e.x;
          const cy = (e.p2Kind === 'p2_eclipse_apocalypse' || e.p2Kind === 'p2_crimson_prison') && Number.isFinite(e.p2TargetY) ? e.p2TargetY : e.y;
          const rad = 148 * (0.45 + p2Prog * 0.55);
          drawVfxGlow(ctx, e.p2Kind === 'p2_crimson_prison' ? 'glowRed' : 'glowGold', cx, cy, rad * 1.28, 0.52);
          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 3.0;
          ctx.setLineDash([12, 6]);
          ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = '#fffbeb';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const ka = now * 0.0025 + (Math.PI * 2 * k) / 8;
            const rr = k % 2 === 0 ? rad * 0.88 : rad * 0.54;
            k === 0 ? ctx.moveTo(cx + Math.cos(ka) * rr, cy + Math.sin(ka) * rr) : ctx.lineTo(cx + Math.cos(ka) * rr, cy + Math.sin(ka) * rr);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }
      if ((e.laserGridT || 0) > 0) {
        const gProg = Math.max(0.08, Math.min(1, 1 - e.laserGridT / Math.max(0.1, e.laserGridMaxT || 0.85)));
        const gx = e.laserGridX, gy = e.laserGridY, ga = e.laserGridA || 0;
        const span = 560;
        drawVfxGlow(ctx, 'glowViolet', gx, gy, 115, 0.42 + gProg * 0.30);
        ctx.save();
        ctx.lineCap = 'round';
        for (let k = 0; k < 2; k++) {
          const la = ga + k * (Math.PI * 0.5);
          const x1 = gx - Math.cos(la) * span, y1 = gy - Math.sin(la) * span;
          const x2 = gx + Math.cos(la) * span, y2 = gy + Math.sin(la) * span;
          ctx.strokeStyle = `rgba(199, 125, 255, ${0.16 + gProg * 0.28})`;
          ctx.lineWidth = 24;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 2.6;
          ctx.setLineDash([10, 7]);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.strokeStyle = '#e0aaff'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(gx, gy, Math.max(12, 54 * (1 - gProg * 0.6)), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (e.lockedAim !== undefined && !e.dashing && !((e.sigWindupT || 0) > 0) && !e.aimA) {
        // 5 大差异化冲刺招式奥术流光预警（起点蓄势光晕 + 终点落点圣印 + 动感能量流）
        const warnLen = Math.max(48, e.dashWarnLen || 255);
        const ca = Math.cos(e.lockedAim), sa = Math.sin(e.lockedAim);
        const nx = -sa, ny = ca;
        const endX = e.x + ca * warnLen, endY = e.y + sa * warnLen;
        const wMax = Math.max(0.1, e.dashWindupMax || 0.55);
        const prog = Math.max(0, Math.min(1, 1 - Math.max(0, e.dashT || 0) / wMax));
        const dStyle = e.dashStyle || 'corridor';
        const mainCol = e.dashWarnColor || '#ff4d6d';
        const bandW = Math.max(14, e.r * 1.12);
        const dashGlowKey = dStyle === 'frost_rail' ? 'glowCyan' : (dStyle === 'spear_conduit' ? 'glowGold' : (dStyle === 'horn_wedge' ? 'glowOrange' : 'glowRed'));
        drawVfxGlow(ctx, dashGlowKey, e.x, e.y, (e.r || 32) * 1.45, 0.30 + prog * 0.35);
        drawVfxGlow(ctx, dashGlowKey, endX, endY, 38 + prog * 18, 0.28 + prog * 0.32);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (dStyle === 'horn_wedge') {
          // 1) 眠冬破阵骑：前窄后张的多级尖角楔阵冲锋轨 + 终点新月挑击弧预警
          const w0 = Math.max(10, e.r * 0.48), w1 = Math.max(20, e.r * 0.96);
          ctx.fillStyle = `rgba(251, 146, 60, ${0.14 + prog * 0.16})`;
          ctx.beginPath();
          ctx.moveTo(e.x + nx * w0, e.y + ny * w0);
          ctx.lineTo(endX + nx * w1, endY + ny * w1);
          ctx.lineTo(endX - nx * w1, endY - ny * w1);
          ctx.lineTo(e.x - nx * w0, e.y - ny * w0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fdba74';
          ctx.lineWidth = 2.4;
          for (let ck = 1; ck <= 4; ck++) {
            const cf = ((ck * 0.22 + prog * 0.35) % 0.96);
            const cx = e.x + ca * (warnLen * cf), cy = e.y + sa * (warnLen * cf);
            const cw = w0 + (w1 - w0) * cf;
            ctx.beginPath();
            ctx.moveTo(cx - ca * 12 + nx * cw, cy - sa * 12 + ny * cw);
            ctx.lineTo(cx + ca * 8, cy + sa * 8);
            ctx.lineTo(cx - ca * 12 - nx * cw, cy - sa * 12 - ny * cw);
            ctx.stroke();
          }
          ctx.strokeStyle = '#fed7aa';
          ctx.lineWidth = 2.6;
          ctx.setLineDash([7, 5]);
          ctx.beginPath(); ctx.arc(endX, endY, 54, e.lockedAim - 0.95, e.lockedAim + 0.95); ctx.stroke();
          ctx.setLineDash([]);
        } else if (dStyle === 'iai_slash') {
          // 2) 烬羽 / 提线斩首偶：极细居合拔刀寒芒斩线 + 刀镡十字星芒 + 落点 X 斩印
          ctx.strokeStyle = mainCol;
          ctx.globalAlpha = 0.28 + prog * 0.25;
          ctx.lineWidth = 9;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(endX, endY); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + ca * warnLen * Math.max(0.18, prog), e.y + sa * warnLen * Math.max(0.18, prog)); ctx.stroke();
          ctx.strokeStyle = mainCol;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([14, 6]);
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(endX, endY); ctx.stroke();
          ctx.setLineDash([]);
          const xr = 15;
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(endX - xr, endY - xr); ctx.lineTo(endX + xr, endY + xr);
          ctx.moveTo(endX + xr, endY - xr); ctx.lineTo(endX - xr, endY + xr);
          ctx.stroke();
        } else if (dStyle === 'frost_rail') {
          // 3) 艾丝特莉亚 / 碎晶圣枪骑：平行双轨冰晶导轨 + 沿途六角霜晶节点
          const hw = Math.max(11, e.r * 0.56);
          ctx.strokeStyle = mainCol;
          ctx.globalAlpha = 0.22 + prog * 0.16;
          ctx.lineWidth = hw * 1.9;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(endX, endY); ctx.stroke();
          ctx.globalAlpha = 0.92;
          ctx.lineWidth = 2.3;
          ctx.beginPath();
          ctx.moveTo(e.x + nx * hw, e.y + ny * hw); ctx.lineTo(endX + nx * hw, endY + ny * hw);
          ctx.moveTo(e.x - nx * hw, e.y - ny * hw); ctx.lineTo(endX - nx * hw, endY - ny * hw);
          ctx.stroke();
          ctx.fillStyle = '#e0f2fe';
          for (let nk = 1; nk <= 3; nk++) {
            const nf = nk * 0.25;
            if (nf <= prog + 0.15) {
              const px = e.x + ca * (warnLen * nf), py = e.y + sa * (warnLen * nf);
              ctx.beginPath();
              ctx.moveTo(px + ca * 6, py + sa * 6);
              ctx.lineTo(px + nx * 6, py + ny * 6);
              ctx.lineTo(px - ca * 6, py - sa * 6);
              ctx.lineTo(px - nx * 6, py - ny * 6);
              ctx.closePath(); ctx.fill();
            }
          }
        } else if (dStyle === 'battering_ram') {
          // 4) 重铠武者统领：攻城铁门枕木横梁走廊 + 重盾撞角前端
          const hw = Math.max(15, e.r * 0.72);
          ctx.fillStyle = `rgba(247, 37, 133, ${0.13 + prog * 0.14})`;
          ctx.beginPath();
          ctx.moveTo(e.x + nx * hw, e.y + ny * hw);
          ctx.lineTo(endX + nx * hw, endY + ny * hw);
          ctx.lineTo(endX - nx * hw, endY - ny * hw);
          ctx.lineTo(e.x - nx * hw, e.y - ny * hw);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = mainCol;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(e.x + nx * hw, e.y + ny * hw); ctx.lineTo(endX + nx * hw, endY + ny * hw);
          ctx.moveTo(e.x - nx * hw, e.y - ny * hw); ctx.lineTo(endX - nx * hw, endY - ny * hw);
          for (let rk = 1; rk <= 4; rk++) {
            const rf = rk * 0.22;
            const rx = e.x + ca * (warnLen * rf), ry = e.y + sa * (warnLen * rf);
            ctx.moveTo(rx + nx * (hw - 2), ry + ny * (hw - 2));
            ctx.lineTo(rx - nx * (hw - 2), ry - ny * (hw - 2));
          }
          ctx.stroke();
          const ramX = e.x + ca * (warnLen * Math.max(0.16, prog)), ramY = e.y + sa * (warnLen * Math.max(0.16, prog));
          ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(ramX - ca * 8 + nx * hw, ramY - sa * 8 + ny * hw);
          ctx.lineTo(ramX + ca * 10, ramY + sa * 10);
          ctx.lineTo(ramX - ca * 8 - nx * hw, ramY - sa * 8 - ny * hw);
          ctx.stroke();
        } else if (dStyle === 'spear_conduit') {
          // 5) 日蚀圣女 / 星律奏鸣偶：双轨雷电圣枪导轨 + 折线电弧中芯 + 三叉枪尖落点
          const hw = Math.max(10, e.r * 0.48);
          ctx.strokeStyle = mainCol;
          ctx.globalAlpha = 0.24 + prog * 0.18;
          ctx.lineWidth = hw * 1.8;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(endX, endY); ctx.stroke();
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          for (let zk = 1; zk <= 6; zk++) {
            const zf = zk / 6;
            const side = zk === 6 ? 0 : ((zk % 2 === 0 ? 1 : -1) * 7);
            ctx.lineTo(e.x + ca * (warnLen * zf) + nx * side, e.y + sa * (warnLen * zf) + ny * side);
          }
          ctx.stroke();
          ctx.strokeStyle = mainCol; ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(endX - ca * 14 + nx * 11, endY - sa * 14 + ny * 11);
          ctx.lineTo(endX + ca * 6, endY + sa * 6);
          ctx.lineTo(endX - ca * 14 - nx * 11, endY - sa * 14 - ny * 11);
          ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(255, 77, 109, ${0.14 + prog * 0.14})`;
          ctx.lineWidth = bandW;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(endX, endY); ctx.stroke();
          ctx.strokeStyle = 'rgba(255, 190, 11, 0.90)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([10, 6]);
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(endX, endY); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
      // 近战丰富兵种专属地面招式预警（潜渊骨蛇遁地裂波 / 铁卫160°半月横扫 / 冰骑寒枪直刺 / 双刃剑客旋风锯环 / 勾魂镰卫瞬步暗镰 / 重锤卫90°扇形裂地 / 镇狱像十字地裂）
      if (e.type === 'sand_worm' && ((e.burrowWindup || 0) > 0 || (e.burrowT || 0) > 0)) {
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.arc(e.x, e.y, (e.burrowT || 0) > 0 ? 52 : 34, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (e.type === 'iron_guard' && (e.cleaveWindup || 0) > 0) {
        const ca = e._cleaveA !== undefined ? e._cleaveA : (e.faceA || 0);
        const cp = Math.max(0.1, Math.min(1, 1 - e.cleaveWindup / Math.max(0.1, e.cleaveWindupMax || 0.46)));
        ctx.save();
        ctx.fillStyle = `rgba(225, 29, 72, ${0.14 + cp * 0.18})`;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, 104, ca - 1.38, ca + 1.38); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fda4af'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(e.x, e.y, 104 * cp, ca - 1.38, ca + 1.38); ctx.stroke();
        ctx.restore();
      } else if (e.type === 'frost_knight' && (e.thrustWindup || 0) > 0) {
        const ta = e._thrustA !== undefined ? e._thrustA : (e.faceA || 0);
        const ex = e.x + Math.cos(ta) * 132, ey = e.y + Math.sin(ta) * 132;
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)'; ctx.lineWidth = 16; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.restore();
      } else if (e.type === 'blade_duelist' && ((e.whirlWindup || 0) > 0 || (e.whirlT || 0) > 0)) {
        const sp = Number.isFinite(e.whirlSpin) ? e.whirlSpin : (now * 0.02);
        ctx.save();
        if ((e.whirlWindup || 0) > 0) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
          ctx.lineWidth = 2.0;
          ctx.setLineDash([6, 5]);
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 18, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.translate(e.x, e.y); ctx.rotate(sp);
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3.2;
          for (let k = 0; k < 2; k++) {
            const ba = k * Math.PI;
            ctx.beginPath(); ctx.arc(0, 0, e.r + 18, ba, ba + 2.1); ctx.stroke();
          }
        }
        ctx.restore();
      } else if (e.type === 'shadow_reaper' && (e.reapWindup || 0) > 0) {
        const rx = e._reapX || e.x, ry = e._reapY || e.y;
        ctx.save();
        ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2.0; ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(rx, ry); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, ry, 72, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (e.type === 'brute' && (e.slamWindup || 0) > 0) {
        const sa = e._slamA !== undefined ? e._slamA : (e.faceA || 0);
        const sp = Math.max(0.1, Math.min(1, 1 - e.slamWindup / Math.max(0.1, e.slamWindupMax || 0.48)));
        ctx.save();
        ctx.fillStyle = `rgba(168, 85, 247, ${0.15 + sp * 0.20})`;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, 132, sa - 0.78, sa + 0.78); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, 132 * sp, sa - 0.78, sa + 0.78); ctx.closePath(); ctx.stroke();
        ctx.restore();
      } else if (e.type === 'juggernaut' && (e.slamWindup || 0) > 0) {
        const sa = e._slamA !== undefined ? e._slamA : 0;
        const innerOff = (e.r || 54) * 0.74;
        const sp = Math.max(0.1, Math.min(1, 1 - e.slamWindup / Math.max(0.1, e.slamWindupMax || 0.68)));
        ctx.save();
        ctx.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const ba = sa + k * (Math.PI * 0.5);
          const sx = e.x + Math.cos(ba) * innerOff, sy = e.y + Math.sin(ba) * innerOff;
          const ex = e.x + Math.cos(ba) * 168, ey = e.y + Math.sin(ba) * 168;
          const curL = innerOff + (168 - innerOff) * sp;
          ctx.strokeStyle = `rgba(226, 232, 240, ${0.16 + sp * 0.20})`; ctx.lineWidth = 18;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2.4; ctx.setLineDash([8, 5]);
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.x + Math.cos(ba) * curL, e.y + Math.sin(ba) * curL); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
      // 首领与召唤祭坛秘境主宰创新交互机关地面法阵渲染（血誓决斗剑域 / 逆时锚点与断时解锚阵 / 超巨黑洞引力奇点与晨曦庇护圣印）
      if (e.type === 'boss' || e.type === 'special_boss') {
        if (e.duelRing) {
          const dr = e.duelRing;
          const drRatio = Math.max(0, Math.min(1, dr.t / Math.max(0.1, dr.maxT || 3.3)));
          drawVfxGlow(ctx, 'glowRed', dr.x, dr.y, dr.r * 0.68, 0.26);
          ctx.save();
          ctx.strokeStyle = 'rgba(251, 113, 133, 0.85)';
          ctx.lineWidth = 3.2;
          ctx.setLineDash([14, 8]);
          ctx.beginPath(); ctx.arc(dr.x, dr.y, dr.r, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.arc(dr.x, dr.y, dr.r - 9, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * drRatio); ctx.stroke();
          for (let bk = 0; bk < 2; bk++) {
            const ba = (dr.bladeA || 0) + bk * Math.PI;
            const bx = dr.x + Math.cos(ba) * dr.r, by = dr.y + Math.sin(ba) * dr.r;
            drawVfxGlow(ctx, 'glowRed', bx, by, 26, 0.62);
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(ba + Math.PI * 0.5);
            ctx.fillStyle = '#ff2a55';
            ctx.strokeStyle = '#fde68a';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(20, 0); ctx.lineTo(-11, -9); ctx.lineTo(-4, 0); ctx.lineTo(-11, 9);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
        }
        if (e.chronoAnchor) {
          const ca = e.chronoAnchor;
          drawVfxGlow(ctx, 'glowGold', ca.ax, ca.ay, 44, 0.45);
          drawVfxGlow(ctx, 'glowCyan', ca.dx, ca.dy, ca.dr * 1.38, 0.48);
          ctx.save();
          if (player) {
            ctx.strokeStyle = 'rgba(253, 230, 138, 0.78)';
            ctx.lineWidth = 2.2;
            ctx.setLineDash([7, 5]);
            ctx.beginPath(); ctx.moveTo(ca.ax, ca.ay); ctx.lineTo(player.x, player.y); ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.arc(ca.ax, ca.ay, 30, 0, Math.PI * 2); ctx.stroke();
          const hAng = ca.spin || 0;
          ctx.beginPath();
          ctx.moveTo(ca.ax, ca.ay); ctx.lineTo(ca.ax + Math.cos(hAng) * 23, ca.ay + Math.sin(hAng) * 23);
          ctx.moveTo(ca.ax, ca.ay); ctx.lineTo(ca.ax + Math.cos(-hAng * 0.4) * 16, ca.ay + Math.sin(-hAng * 0.4) * 16);
          ctx.stroke();
          ctx.fillStyle = 'rgba(114, 239, 221, 0.22)';
          ctx.strokeStyle = '#72efdd';
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          for (let hk = 0; hk < 6; hk++) {
            const ha = (Math.PI * 2 * hk) / 6 + (ca.spin || 0) * 0.25;
            const hx = ca.dx + Math.cos(ha) * ca.dr, hy = ca.dy + Math.sin(ha) * ca.dr;
            if (hk === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.font = '900 12px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#72efdd';
          ctx.fillText('✨ 断时解锚阵', ca.dx, ca.dy + 4);
          ctx.restore();
        }
        if (e.eclipseSingularity) {
          // 🌌 超巨黑日引力奇点（全场吸积盘旋臂 + 坍缩引力透镜波 + 纯黑事件视界巨核 + 玩家引力流线 + 晨曦庇护圣印）
          const es = e.eclipseSingularity;
          const ep = Math.max(0, Math.min(1, 1 - es.t / Math.max(0.1, es.maxT || 3.25)));
          const esR = Math.max(180, es.r || 440);
          const pullRMax = es.pullRange || Math.max(540, esR * 1.72);
          const spin = (es.spin || 0) + now * 0.0022;
          drawVfxGlow(ctx, 'glowViolet', e.x, e.y, esR * 1.04, 0.48 + ep * 0.26);
          ctx.save();
          ctx.lineCap = 'round';
          // 1) 超远外围引力牵引视界虚线圈与向心吞噬星尘流线
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.30)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([16, 14]);
          ctx.beginPath(); ctx.arc(e.x, e.y, pullRMax, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          for (let sk = 0; sk < 14; sk++) {
            const cyc = ((now * 0.0017 + sk * 0.0714) % 1);
            const sa = sk * 0.4488 - spin * 0.35;
            const rOuter = pullRMax * (1 - cyc * 0.72);
            const rInner = Math.max(48, rOuter - 58 - cyc * 34);
            ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.65;
            ctx.strokeStyle = sk % 3 === 0 ? '#fde68a' : '#d8b4fe';
            ctx.lineWidth = 1.8 + cyc * 1.2;
            ctx.beginPath();
            ctx.moveTo(e.x + Math.cos(sa) * rOuter, e.y + Math.sin(sa) * rOuter);
            ctx.lineTo(e.x + Math.cos(sa + 0.14) * rInner, e.y + Math.sin(sa + 0.14) * rInner);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          // 2) 黑洞湮灭杀伤区边界日蚀符文巨环
          ctx.fillStyle = `rgba(18, 4, 38, ${0.26 + ep * 0.22})`;
          ctx.beginPath(); ctx.arc(e.x, e.y, esR, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(216, 180, 254, 0.88)';
          ctx.lineWidth = 3.2;
          ctx.beginPath(); ctx.arc(e.x, e.y, esR, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 2.0;
          ctx.setLineDash([18, 10]);
          ctx.beginPath(); ctx.arc(e.x, e.y, esR - 10, -spin * 0.4, -spin * 0.4 + Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          // 3) 6 条高速卷入奇点的相对论紫金吸积盘旋臂
          for (let arm = 0; arm < 6; arm++) {
            const a0 = spin * 1.35 + (arm * Math.PI * 2) / 6;
            ctx.strokeStyle = arm % 2 === 0 ? 'rgba(253, 230, 138, 0.72)' : 'rgba(192, 132, 252, 0.78)';
            ctx.lineWidth = arm % 2 === 0 ? 3.4 : 4.2;
            ctx.beginPath();
            for (let seg = 0; seg <= 10; seg++) {
              const frac = seg / 10;
              const rad = esR * (0.92 - frac * 0.76);
              const ang = a0 + frac * 2.15;
              const px = e.x + Math.cos(ang) * rad;
              const py = e.y + Math.sin(ang) * rad;
              seg === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
          // 4) 3 道持续向中心急速坍缩的引力透镜波环
          for (let rw = 0; rw < 3; rw++) {
            const cyc = ((ep * 2.8 + rw * 0.333) % 1);
            const waveR = Math.max(44, esR * (1 - cyc * 0.84));
            ctx.globalAlpha = (1 - cyc * 0.45) * 0.68;
            ctx.strokeStyle = rw === 0 ? '#fef08a' : '#e9d5ff';
            ctx.lineWidth = 2.8 - rw * 0.4;
            ctx.beginPath(); ctx.arc(e.x, e.y, waveR, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          // 5) 预烘焙超巨纯黑事件视界深渊核与光子金环（直径近 300px，震撼全场）
          const bhCoreR = Math.min(168, Math.max(116, esR * 0.35)) * (0.90 + ep * 0.18);
          if (typeof vfxSprites !== 'undefined' && vfxSprites.blackHoleCore) {
            ctx.drawImage(vfxSprites.blackHoleCore, e.x - bhCoreR, e.y - bhCoreR, bhCoreR * 2, bhCoreR * 2);
          } else {
            ctx.fillStyle = '#020008';
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3.2;
            ctx.beginPath(); ctx.arc(e.x, e.y, bhCoreR * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          // 6) 对主角的直观引力拖拽流线（让玩家清晰看见自己正被黑洞强力拉扯！）
          if (player && player.hp > 0) {
            const pdx = e.x - player.x, pdy = e.y - player.y;
            const pDist = Math.hypot(pdx, pdy);
            if (pDist > 36 && pDist < pullRMax) {
              const pux = pdx / pDist, puy = pdy / pDist;
              const pnx = -puy, pny = pux;
              for (let lk = -1; lk <= 1; lk++) {
                const flow = ((now * 0.0045 + (lk + 1) * 0.31) % 1);
                const startOff = 18 + flow * Math.min(180, pDist * 0.55);
                const endOff = Math.min(pDist - 24, startOff + 48);
                if (endOff > startOff + 8) {
                  const lat = lk * 13 * (1 - flow * 0.5);
                  ctx.globalAlpha = (1 - flow * 0.65) * 0.82;
                  ctx.strokeStyle = lk === 0 ? '#fde68a' : '#c084fc';
                  ctx.lineWidth = lk === 0 ? 2.6 : 1.9;
                  ctx.beginPath();
                  ctx.moveTo(player.x + pux * startOff + pnx * lat, player.y + puy * startOff + pny * lat);
                  ctx.lineTo(player.x + pux * endOff + pnx * lat * 0.4, player.y + puy * endOff + pny * lat * 0.4);
                  ctx.stroke();
                }
              }
              ctx.globalAlpha = 1;
            }
          }
          // 7) 双生【☀️ 晨曦庇护圣印】（站在金印内完全免疫黑洞引力拖拽与坍缩湮灭）
          const seals = [[es.s1x, es.s1y], [es.s2x, es.s2y]];
          for (let sk = 0; sk < 2; sk++) {
            const sx0 = seals[sk][0], sy0 = seals[sk][1];
            const sr = Math.max(48, es.safeR || 72);
            drawVfxGlow(ctx, 'sanctuaryGlow', sx0, sy0, sr * 1.52, 0.74);
            ctx.save();
            ctx.translate(sx0, sy0);
            ctx.fillStyle = 'rgba(254, 240, 138, 0.24)';
            ctx.strokeStyle = '#fde68a';
            ctx.lineWidth = 3.0;
            ctx.beginPath(); ctx.arc(0, 0, sr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.save();
            ctx.rotate(-now * 0.0022 + sk);
            ctx.strokeStyle = '#fffbeb';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let rk = 0; rk < 16; rk++) {
              const ra = (Math.PI * 2 * rk) / 16;
              const rr = rk % 2 === 0 ? sr * 0.88 : sr * 0.64;
              rk === 0 ? ctx.moveTo(Math.cos(ra) * rr, Math.sin(ra) * rr) : ctx.lineTo(Math.cos(ra) * rr, Math.sin(ra) * rr);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
            ctx.font = '900 13px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#1c1008';
            ctx.lineWidth = 3.2;
            ctx.strokeText('☀️ 晨曦庇护', 0, 5);
            ctx.fillStyle = '#fffbeb';
            ctx.fillText('☀️ 晨曦庇护', 0, 5);
            ctx.restore();
          }
          ctx.restore();
        }
      }
    }

    // 首领共鸣阵眼棱柱能量连线与双生极光冰弦绘制
    if (trees.length > 0) {
      let cryoA = null, cryoB = null;
      ctx.save();
      for (let ti = 0; ti < trees.length; ti++) {
        const tr = trees[ti];
        if (!tr || !tr.isBossPylon || tr.hp <= 0 || !tr.owner || tr.owner.hp <= 0) continue;
        const pCol = tr.pylonColor || '#72efdd';
        ctx.strokeStyle = pCol;
        ctx.globalAlpha = 0.58;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(tr.x, tr.y - 6); ctx.lineTo(tr.owner.x, tr.owner.y - 8); ctx.stroke();
        ctx.setLineDash([]);
        if (tr.pylonKind === 'cryo_obelisk') {
          if (!cryoA) cryoA = tr;
          else if (!cryoB && tr.owner === cryoA.owner) cryoB = tr;
        }
      }
      if (cryoA && cryoB) {
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 5.0;
        ctx.beginPath(); ctx.moveTo(cryoA.x, cryoA.y - 4); ctx.lineTo(cryoB.x, cryoB.y - 4); ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(cryoA.x, cryoA.y - 4); ctx.lineTo(cryoB.x, cryoB.y - 4); ctx.stroke();
      }
      ctx.restore();
    }

    // 地面扩散冲击圈与多形态震波阵（圆环 / 六棱星芒 / 八芒烈焰 / 翡翠十字圣愈脉冲，零大面积圆盘过绘）
    for (let i = 0; i < rings.length; i++) {
      const rg = rings[i];
      if (rg.x + rg.r + 12 < vL || rg.x - rg.r - 12 > vR || rg.y + rg.r + 12 < vT || rg.y - rg.r - 12 > vB) continue;
      const p = Math.max(0, Math.min(1, 1 - rg.t / Math.max(0.01, rg.maxT)));
      const curR = Math.max(1, rg.r * (0.24 + p * 0.76));
      if (rg.innerR && rg.innerR > 4) {
        const band = Math.max(4, Math.max(rg.innerR + 6, curR) - rg.innerR);
        ctx.globalAlpha = Math.max(0.02, (1 - p) * 0.55);
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = band;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.innerR + band * 0.5, 0, Math.PI * 2); ctx.stroke();
      } else if (rg.kind === 'hex') {
        ctx.globalAlpha = Math.max(0.02, (1 - p) * 0.90);
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = Math.max(1.2, 5.2 * (1 - p) + 1.5);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ka = (Math.PI * 2 * k) / 6 + p * 0.25;
          const ox = rg.x + Math.cos(ka) * curR, oy = rg.y + Math.sin(ka) * curR;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.stroke();
        if (p < 0.65 && curR > 20) {
          ctx.globalAlpha = Math.max(0.02, (1 - p / 0.65) * 0.50);
          ctx.strokeStyle = '#f8f0fc';
          ctx.lineWidth = Math.max(1, 2.0 * (1 - p));
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ka = (Math.PI * 2 * k) / 6 - p * 0.25;
            const ox = rg.x + Math.cos(ka) * curR * 0.60, oy = rg.y + Math.sin(ka) * curR * 0.60;
            if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
          }
          ctx.closePath();
          ctx.stroke();
        }
      } else if (rg.kind === 'star') {
        ctx.globalAlpha = Math.max(0.02, (1 - p) * 0.90);
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = Math.max(1.2, 4.8 * (1 - p) + 1.5);
        ctx.beginPath();
        for (let k = 0; k < 16; k++) {
          const ka = (Math.PI * 2 * k) / 16 + p * 0.2;
          const rad = k % 2 === 0 ? curR : curR * 0.68;
          const ox = rg.x + Math.cos(ka) * rad, oy = rg.y + Math.sin(ka) * rad;
          if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (rg.kind === 'cross_pulse') {
        ctx.globalAlpha = Math.max(0.02, (1 - p) * 0.85);
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = Math.max(1.2, 3.8 * (1 - p) + 1.4);
        ctx.setLineDash([12, 8]);
        ctx.beginPath(); ctx.arc(rg.x, rg.y, curR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        const cSz = Math.max(4, 9 * (1 - p * 0.4));
        ctx.strokeStyle = '#d8f3dc';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const ka = (Math.PI * 0.5) * k + p * 0.35;
          const cx = rg.x + Math.cos(ka) * (curR * 0.68), cy = rg.y + Math.sin(ka) * (curR * 0.68);
          ctx.moveTo(cx - cSz, cy); ctx.lineTo(cx + cSz, cy);
          ctx.moveTo(cx, cy - cSz); ctx.lineTo(cx, cy + cSz);
        }
        ctx.stroke();
      } else {
        ctx.globalAlpha = Math.max(0.02, (1 - p) * 0.88);
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = Math.max(1, 5.8 * (1 - p) + 1.6);
        ctx.beginPath(); ctx.arc(rg.x, rg.y, curR, 0, Math.PI * 2); ctx.stroke();
        if (p < 0.62 && curR > 18) {
          ctx.globalAlpha = Math.max(0.02, (1 - p / 0.62) * 0.48);
          ctx.strokeStyle = '#fff3b0';
          ctx.lineWidth = Math.max(1, 2.2 * (1 - p));
          ctx.beginPath(); ctx.arc(rg.x, rg.y, curR * 0.58, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < spawns.length; i++) {
      const s = spawns[i];
      if (s.x < vL || s.x > vR || s.y < vT || s.y > vB) continue;
      if (fogCullActive && Math.hypot(s.x - player.x, s.y - player.y) >= fogWorldCutR) continue;
      const p = Math.max(0, Math.min(1, 1 - s.t / Math.max(0.01, s.maxT)));
      const isBig = s.type === 'boss' || s.type === 'mini_boss' || s.type === 'special_boss';
      const sz = Math.max(4, (isBig ? 26 : 13) * (0.8 + Math.sin(p * Math.PI * 4) * 0.15));
      const sCol = s.type === 'special_boss' ? '#ffd166' : '#ff3b6b';
      ctx.globalAlpha = 0.14 + p * 0.18;
      ctx.fillStyle = sCol;
      ctx.beginPath(); ctx.arc(s.x, s.y, sz * 1.45, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = sCol; ctx.lineWidth = isBig ? 5 : 3.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x - sz, s.y - sz); ctx.lineTo(s.x + sz, s.y + sz);
      ctx.moveTo(s.x + sz, s.y - sz); ctx.lineTo(s.x - sz, s.y + sz);
      ctx.stroke();
    }

    // 角色浅浅的收集（磁吸拾取）范围地面光圈（仅显示轻量细线收集圈，零实心填充过绘，不显示攻击射程圈）
    if (state === 'wave' && player && player.hp > 0) {
      const pulseActive = (player.magnetPulseT || 0) > 0;
      const targetMagR = Math.max(28, (player.magnet || 143) + (pulseActive ? 135 : 0));
      player._visMagR = player._visMagR === undefined
        ? targetMagR
        : player._visMagR + (targetMagR - player._visMagR) * 0.20;
      const magR = player._visMagR;
      ctx.save();
      ctx.strokeStyle = pulseActive ? 'rgba(114, 239, 221, 0.26)' : 'rgba(148, 210, 226, 0.15)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(player.x, player.y, magR, 0, Math.PI * 2);
      ctx.stroke();
      if (typeof isBossLastStandFearActive === 'function' && isBossLastStandFearActive()) {
        const fPulse = Math.sin(now * 0.012);
        const fRad = 32 + fPulse * 2.5;
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.58)';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(player.x, player.y + 4, fRad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // 晶石、血包与异星战利品箱绘制
    ctx.strokeStyle = '#14281d';
    ctx.lineWidth = 1.7;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (d.x < vL || d.x > vR || d.y < vT || d.y > vB) continue;
      const by = Math.sin(d.bob) * 2.2;
      if (d.kind === 'mat') {
        const v = d.val || 1;
        const isBig = !!d.bigCoin;
        const sz = isBig ? 8.5 : (v >= 2 ? 7.2 : 6.4);
        const gx = d.x, gy = d.y + by;
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(gx - 4, d.y + 6, 8, 3);
        ctx.fillStyle = isBig ? '#ffd166' : (v >= 2 ? '#4cc9f0' : '#52b788');
        ctx.beginPath();
        ctx.moveTo(gx, gy - sz); ctx.lineTo(gx + sz * 0.85, gy); ctx.lineTo(gx, gy + sz); ctx.lineTo(gx - sz * 0.85, gy);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else if (d.kind === 'crate') {
        ctx.save(); ctx.translate(d.x, d.y + by);
        if (d.isMythic) {
          ctx.strokeStyle = 'rgba(255, 77, 109, 0.85)'; ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.strokeStyle = d.isMythic ? '#ffd166' : 'rgba(255, 209, 102, 0.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = d.isMythic ? '#d90429' : (d.isBoss ? '#9d4edd' : '#7209b7');
        ctx.strokeStyle = '#1d1128'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.roundRect(-9.5, -8.5, 19, 17, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-9.5, -2, 19, 4);
        ctx.fillRect(-2, -8.5, 4, 17);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#14281d'; ctx.lineWidth = 1.7;
      } else {
        ctx.save(); ctx.translate(d.x, d.y + by);
        ctx.fillStyle = '#ff4d6d'; ctx.strokeStyle = '#220910'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(-8, -8, 16, 16, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-2, -5, 4, 10); ctx.fillRect(-5, -2, 10, 4);
        ctx.restore();
        ctx.strokeStyle = '#14281d'; ctx.lineWidth = 1.7;
      }
    }

    // 异星晶树、炮台、怪物、土豆英雄按 Y 轴深度排序渲染（零闭包分配 + 视锥剔除）
    renderList.length = 0;
    for (let i = 0; i < trees.length; i++) {
      const tr = trees[i];
      const tPad = tr.isBossPylon ? 110 : 40;
      if (tr.hp <= 0 || tr.x + tPad < vL || tr.x - tPad > vR || tr.y + tPad < vT || tr.y - tPad > vB) continue;
      tr._rk = 3;
      renderList.push(tr);
    }
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const padR = e.r + 36;
      if (e.x + padR < vL || e.x - padR > vR || e.y + padR < vT || e.y - padR > vB) continue;
      if (fogCullActive) {
        const dFog = Math.hypot(e.x - player.x, e.y - player.y) - (e.r || 0) * 0.40;
        if (dFog >= fogWorldCutR) continue;
        e._fogAlpha = dFog <= fogWorldInnerR ? 1 : Math.max(0, 1 - (dFog - fogWorldInnerR) / Math.max(12, fogWorldCutR - fogWorldInnerR));
      } else {
        e._fogAlpha = 1;
      }
      e._rk = 0;
      renderList.push(e);
    }
    for (let i = 0; i < turrets.length; i++) {
      const t = turrets[i];
      const tPad = t.kind === 'totem' ? 170 : 36;
      if (t.x + tPad < vL || t.x - tPad > vR || t.y + tPad < vT || t.y - tPad > vB) continue;
      t._rk = 1;
      renderList.push(t);
    }
    if (player) {
      player._rk = 2;
      renderList.push(player);
    }
    renderList.sort((a, b) => a.y - b.y);
    for (let i = 0; i < renderList.length; i++) {
      const it = renderList[i];
      if (it._rk === 0) {
        if (it._fogAlpha !== undefined && it._fogAlpha < 0.995) {
          ctx.save();
          ctx.globalAlpha = it._fogAlpha;
          drawEnemySprite(it);
          ctx.restore();
        } else {
          drawEnemySprite(it);
        }
      }
      else if (it._rk === 1) drawTurretSprite(it);
      else if (it._rk === 3) drawTreeSprite(it);
      else drawPotatoHero();
    }

    if (player) {
      for (const w of player.weapons) {
        if (w.wx !== undefined) drawWeaponSprite(w);
      }
    }

    // 近战差异化刀光（长矛突刺枪芒 / 匕首寒芒 / 利爪三连撕痕 / 重武器钝击波 / 太刀居合月牙，干净利落零滤镜）
    for (let si = 0; si < slashes.length; si++) {
      const sl = slashes[si];
      const slPad = (sl.r || 80) + 20;
      if (sl.x + slPad < vL || sl.x - slPad > vR || sl.y + slPad < vT || sl.y - slPad > vB) continue;
      const alpha = Math.max(0.05, sl.t / Math.max(0.01, sl.maxT));
      ctx.save();
      ctx.translate(sl.x, sl.y); ctx.rotate(sl.angle);
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      if (sl.mode === 'spear') {
        ctx.fillStyle = sl.color;
        ctx.beginPath(); ctx.moveTo(6, -8 * alpha); ctx.lineTo(sl.r + 6, 0); ctx.lineTo(6, 8 * alpha); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(14, -3.2 * alpha); ctx.lineTo(sl.r + 2, 0); ctx.lineTo(14, 3.2 * alpha); ctx.closePath(); ctx.fill();
      } else if (sl.mode === 'stab') {
        ctx.fillStyle = sl.color;
        ctx.beginPath(); ctx.moveTo(-10, -7.5 * alpha); ctx.lineTo(sl.r * 0.94, 0); ctx.lineTo(-10, 7.5 * alpha); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4 * alpha;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(sl.r * 0.88, 0); ctx.stroke();
      } else if (sl.mode === 'claw') {
        const rad = Math.max(14, sl.r * 0.84);
        for (let k = -1; k <= 1; k++) {
          const oy = k * 8.5;
          const rK = Math.max(8, rad - Math.abs(k) * 4);
          ctx.strokeStyle = sl.color;
          ctx.lineWidth = 3.2 * alpha;
          ctx.beginPath(); ctx.arc(-10, oy, rK, -0.58, 0.58); ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2 * alpha;
          ctx.beginPath(); ctx.arc(-9, oy, rK, -0.46, 0.46); ctx.stroke();
        }
      } else if (sl.mode === 'blunt') {
        const rad = Math.max(12, sl.r * 0.82);
        ctx.strokeStyle = sl.color;
        ctx.lineWidth = 9.5 * alpha;
        ctx.beginPath(); ctx.arc(-10, 0, rad, -0.72, 0.72); ctx.stroke();
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 2.6 * alpha;
        ctx.beginPath(); ctx.arc(-10, 0, rad + 3.5 * alpha, -0.60, 0.60); ctx.stroke();
      } else if (sl.mode === 'blood_moon') {
        // 首领专属【八荒血月斩】近身巨幅赤月斩弧：外层绯红血气 + 鎏金内刃 + 纯白锋脊
        const rad = Math.max(24, sl.r * 0.86);
        const inR = Math.max(10, rad - 13 * alpha);
        const outR = rad + 11 * alpha;
        ctx.fillStyle = sl.color || '#fb7185';
        ctx.beginPath();
        ctx.arc(-14, 0, outR, -0.96, 0.96);
        ctx.arc(-4, 0, inR, 0.96, -0.96, true);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3.8 * alpha;
        ctx.beginPath(); ctx.arc(-12, 0, rad + 4 * alpha, -0.82, 0.82); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.0 * alpha;
        ctx.beginPath(); ctx.arc(-11, 0, rad + 6 * alpha, -0.58, 0.58); ctx.stroke();
      } else {
        const span = sl.mode === 'crescent' ? 1.05 : 0.82;
        const rad = Math.max(12, sl.r * (sl.mode === 'crescent' ? 0.86 : 0.82));
        const inR = Math.max(6, rad - 8 * alpha);
        const outR = Math.max(inR + 2, rad + 8 * alpha);
        ctx.fillStyle = sl.color;
        ctx.beginPath();
        ctx.arc(-12, 0, outR, -span, span);
        ctx.arc(-4, 0, inR, span, -span, true);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = (sl.mode === 'crescent' ? 3.4 : 2.4) * alpha;
        ctx.beginPath(); ctx.arc(-11, 0, Math.max(8, rad + 4 * alpha), -span * 0.88, span * 0.88); ctx.stroke();
      }
      ctx.restore();
    }

    // 激光束与狙击枪高能贯穿轨迹（外层电浆辉光 + 白炽内芯 + 命中光斑 + 视口包围盒裁剪）
    for (let i = 0; i < beams.length; i++) {
      const bm = beams[i];
      if ((bm.x1 < vL && bm.x2 < vL) || (bm.x1 > vR && bm.x2 > vR) || (bm.y1 < vT && bm.y2 < vT) || (bm.y1 > vB && bm.y2 > vB)) continue;
      const alpha = Math.max(0.04, bm.t / Math.max(0.01, bm.maxT));
      const baseW = bm.width ? bm.width : (bm.thin ? 9 : 18);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha * 0.38;
      ctx.strokeStyle = bm.color;
      ctx.lineWidth = baseW * alpha;
      ctx.beginPath(); ctx.moveTo(bm.x1, bm.y1); ctx.lineTo(bm.x2, bm.y2); ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = baseW * 0.48 * alpha;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.6, baseW * 0.20) * alpha;
      ctx.stroke();
      ctx.restore();
    }

    // 连锁电弧与九霄落雷（支持法杖粗壮奥术雷柱 + 落点紫金电光晕 + 白芯折线 + 视口裁剪）
    for (let i = 0; i < lightnings.length; i++) {
      const lt = lightnings[i];
      const pts = lt.pts;
      if (!pts || !pts.length) continue;
      const p0 = pts[0], pN = pts[pts.length - 1];
      if ((p0.x < vL && pN.x < vL) || (p0.x > vR && pN.x > vR) || (p0.y < vT && pN.y < vT) || (p0.y > vB && pN.y > vB)) continue;
      const alpha = Math.max(0.04, lt.t / Math.max(0.01, lt.maxT));
      const baseW = lt.width || 3.5;
      if (baseW >= 4.2) {
        drawVfxGlow(ctx, 'glowViolet', pN.x, pN.y, 34, alpha * 0.55);
      }
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.globalAlpha = alpha * 0.45;
      ctx.strokeStyle = lt.color; ctx.lineWidth = baseW * 2.4 * alpha;
      ctx.beginPath();
      for (let idx = 0; idx < pts.length; idx++) {
        idx === 0 ? ctx.moveTo(pts[idx].x, pts[idx].y) : ctx.lineTo(pts[idx].x, pts[idx].y);
      }
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = baseW * alpha;
      ctx.stroke();
      ctx.strokeStyle = lt.coreColor || '#ffffff';
      ctx.lineWidth = Math.max(1.5, baseW * 0.44);
      ctx.stroke();
      ctx.restore();
    }

    // 投射物绘制（火焰气流、电浆球、陨炎大火球、冰锥、弹弓圆石、旋转手里剑、火箭弹头、带辉光曳光弹）
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (b.x < vL || b.x > vR || b.y < vT || b.y > vB) continue;
      const br = Math.max(1.5, b.r || 4);
      if (b.isFlame) {
        const lifeP = Math.max(0, b.life / Math.max(0.01, b.maxLife));
        ctx.globalAlpha = lifeP * 0.58;
        ctx.fillStyle = lifeP > 0.55 ? '#ffd166' : (lifeP > 0.28 ? '#ff9f1c' : '#e63946');
        ctx.beginPath(); ctx.arc(b.x, b.y, br, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (b.isPlasma) {
        ctx.fillStyle = 'rgba(199, 125, 255, 0.34)';
        ctx.beginPath(); ctx.arc(b.x, b.y, br * 1.65, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c77dff'; ctx.strokeStyle = '#72efdd'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(b.x, b.y, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(b.x, b.y, br * 0.45, 0, Math.PI * 2); ctx.fill();
      } else if (b.isFireball) {
        // 赤烬魂灯杖【陨炎火球术】：炽橙预烘焙辉光 + 狂暴拖曳彗尾 + 旋转熔火日冕 + 炽白炎核
        drawVfxGlow(ctx, 'glowOrange', b.x, b.y, br * 2.95, 0.80);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle || 0);
        const tailFlick = Math.sin(now * 0.035 + i * 1.7) * 3.5;
        ctx.fillStyle = 'rgba(230, 57, 70, 0.78)';
        ctx.beginPath();
        ctx.moveTo(br * 0.3, -br * 0.98);
        ctx.quadraticCurveTo(-br * 1.9, -br * 0.65 + tailFlick * 0.4, -br * 3.5, tailFlick);
        ctx.quadraticCurveTo(-br * 1.9, br * 0.65 + tailFlick * 0.4, br * 0.3, br * 0.98);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.moveTo(br * 0.45, -br * 0.68);
        ctx.quadraticCurveTo(-br * 1.25, -br * 0.32, -br * 2.35, tailFlick * 0.55);
        ctx.quadraticCurveTo(-br * 1.25, br * 0.32, br * 0.45, br * 0.68);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fb5607';
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath(); ctx.arc(br * 0.16, 0, br * 0.50, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (b.isStaffOrb) {
        // 法杖秘术奥术星弹：柔彩元素法环 + 旋转四芒符文核 + 纯白星芯
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.globalAlpha = 0.30;
        ctx.fillStyle = b.color || '#ffd166';
        ctx.beginPath(); ctx.arc(0, 0, br * 1.75, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = b.color || '#ffd166';
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.rotate(now * 0.009 + i);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(br * 0.95, 0); ctx.lineTo(0, -br * 0.42); ctx.lineTo(-br * 0.95, 0); ctx.lineTo(0, br * 0.42);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (b.isIce) {
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.angle);
        ctx.fillStyle = '#72efdd'; ctx.strokeStyle = '#03045e'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-1, -4.2); ctx.lineTo(10, 0); ctx.lineTo(-1, 4.2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else if (b.isPebble) {
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.42)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.fillStyle = '#cbd5e1'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(b.x, b.y, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (b.isStar) {
        ctx.strokeStyle = 'rgba(114, 239, 221, 0.45)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.spin);
        ctx.fillStyle = '#e0fbfc'; ctx.strokeStyle = '#14101a'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI * 0.5;
          ctx.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5);
          ctx.lineTo(Math.cos(a + 0.45) * 3.2, Math.sin(a + 0.45) * 3.2);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else if (b.isGrenade) {
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.spin || 0);
        ctx.fillStyle = '#334155'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.roundRect(-6.5, -5, 13, 10, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-2, -5, 4, 10);
        ctx.restore();
      } else if (b.isWaveArc) {
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.angle);
        ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4.2;
        ctx.beginPath(); ctx.arc(-6, 0, 14, -0.75, 0.75); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(-5, 0, 14, -0.58, 0.58); ctx.stroke();
        ctx.restore();
      } else if (b.isDart) {
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.angle);
        ctx.fillStyle = '#a3e635'; ctx.strokeStyle = '#14281d'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -3); ctx.lineTo(-3, 0); ctx.lineTo(-6, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else if (b.isRocket) {
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.angle);
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath(); ctx.arc(-8, 0, 4.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e5e5e5'; ctx.strokeStyle = '#14101a'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.roundRect(-6, -3.5, 11, 7, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ef233c';
        ctx.beginPath(); ctx.moveTo(5, -3.5); ctx.lineTo(10, 0); ctx.lineTo(5, 3.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else {
        ctx.globalAlpha = 0.36;
        ctx.strokeStyle = b.color; ctx.lineWidth = br * 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = br * 1.35;
        ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(b.x, b.y, br * 0.72, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 敌方高辨识度流光弹幕系统（告别粗黑描边与生硬折线几何：柔光外晕 + 纤细暗曜衬边 + 贝塞尔流线晶体/水滴/涡轮造型 + 璀璨白炽内核，零渐变零卡顿）
    const rimCol = 'rgba(7, 9, 16, 0.72)';
    for (let i = 0; i < eBullets.length; i++) {
      const b = eBullets[i];
      if (typeof ensureEnemyBulletScale === 'function') ensureEnemyBulletScale(b);
      const cullPad = b.isCelestial ? 86 : 36;
      if (b.x < vL - cullPad || b.x > vR + cullPad || b.y < vT - cullPad || b.y > vB + cullPad) continue;
      if (fogCullActive && !b.isCelestial && Math.hypot(b.x - player.x, b.y - player.y) >= fogWorldCutR * 1.06) continue;
      const bCol = b.color || '#ff3b6b';
      const br = Math.max(2.2, b.r || 5.8);
      const vr = Math.max(5.8, br * 1.08);
      const shp = b.shape;
      if (shp === 'celestial_lance') {
        // 蚀界生存试炼：【天外贯星梭】修长彗尾光羽 + 锋锐菱枪主体 + 白炽星核（高辨识度屏外破空巨梭）
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = bCol;
        ctx.beginPath();
        ctx.moveTo(-vr * 5.2, 0);
        ctx.lineTo(vr * 0.4, -vr * 1.45);
        ctx.lineTo(vr * 2.55, 0);
        ctx.lineTo(vr * 0.4, vr * 1.45);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = bCol;
        ctx.strokeStyle = rimCol;
        ctx.lineWidth = 1.45;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(vr * 2.4, 0);
        ctx.lineTo(vr * 0.45, -vr * 0.92);
        ctx.lineTo(-vr * 2.15, -vr * 0.34);
        ctx.lineTo(-vr * 1.35, 0);
        ctx.lineTo(-vr * 2.15, vr * 0.34);
        ctx.lineTo(vr * 0.45, vr * 0.92);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = b.coreColor || '#ffffff';
        ctx.beginPath();
        ctx.moveTo(vr * 1.92, 0);
        ctx.lineTo(vr * 0.36, -vr * 0.38);
        ctx.lineTo(-vr * 1.10, 0);
        ctx.lineTo(vr * 0.36, vr * 0.38);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (shp === 'stinger') {
        // 发条毒蝎 & 万蛊花刺：【翠毒流光弯钩刺】柔绿丝带尾迹 + 流线弧面毒牙 + 亮白萤芯
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = bCol;
        ctx.beginPath();
        ctx.moveTo(-vr * 2.5, 0);
        ctx.quadraticCurveTo(0, -vr * 1.18, vr * 1.95, 0);
        ctx.quadraticCurveTo(0, vr * 1.18, -vr * 2.5, 0);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = bCol; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(vr * 1.78, 0);
        ctx.quadraticCurveTo(vr * 0.28, -vr * 0.88, -vr * 1.15, -vr * 0.34);
        ctx.lineTo(-vr * 0.62, 0);
        ctx.lineTo(-vr * 1.15, vr * 0.34);
        ctx.quadraticCurveTo(vr * 0.28, vr * 0.88, vr * 1.78, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f7fee7';
        ctx.beginPath();
        ctx.moveTo(vr * 1.28, 0);
        ctx.quadraticCurveTo(vr * 0.22, -vr * 0.36, -vr * 0.35, 0);
        ctx.quadraticCurveTo(vr * 0.22, vr * 0.36, vr * 1.28, 0);
        ctx.fill();
        ctx.restore();
      } else if (shp === 'frost_bolt') {
        // 眠冬冰冠亡灵：【寒霜六棱冰魄梭】晶莹渐隐冰雾尾 + 修长双锥六棱冰晶 + 极光折射棱线
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.globalAlpha = 0.26;
        ctx.fillStyle = bCol;
        ctx.beginPath();
        ctx.moveTo(-vr * 2.75, 0); ctx.lineTo(vr * 0.2, -vr * 0.85); ctx.lineTo(vr * 1.9, 0); ctx.lineTo(vr * 0.2, vr * 0.85);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#7dd3fc'; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(vr * 1.76, 0);
        ctx.lineTo(vr * 0.42, -vr * 0.72);
        ctx.lineTo(-vr * 0.72, -vr * 0.52);
        ctx.lineTo(-vr * 1.42, 0);
        ctx.lineTo(-vr * 0.72, vr * 0.52);
        ctx.lineTo(vr * 0.42, vr * 0.72);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(vr * 1.26, 0); ctx.lineTo(vr * 0.2, -vr * 0.30); ctx.lineTo(-vr * 0.58, 0); ctx.lineTo(vr * 0.2, vr * 0.30);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (shp === 'trident') {
        // 首领皇室极光三叉冰戟：雕塑感中锋冰矛 + 两侧掠翼弯月副刃（取代旧版生硬折线叉子）
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = bCol;
        ctx.beginPath();
        ctx.moveTo(-vr * 2.5, 0); ctx.lineTo(vr * 0.4, -vr * 1.42); ctx.lineTo(vr * 2.25, 0); ctx.lineTo(vr * 0.4, vr * 1.42);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = bCol; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.35; ctx.lineJoin = 'round';
        // 掠翼双副刃
        ctx.beginPath();
        ctx.moveTo(vr * 1.48, -vr * 0.92);
        ctx.quadraticCurveTo(vr * 0.35, -vr * 1.32, -vr * 0.65, -vr * 0.52);
        ctx.quadraticCurveTo(vr * 0.15, -vr * 0.68, vr * 1.48, -vr * 0.92);
        ctx.moveTo(vr * 1.48, vr * 0.92);
        ctx.quadraticCurveTo(vr * 0.35, vr * 1.32, -vr * 0.65, vr * 0.52);
        ctx.quadraticCurveTo(vr * 0.15, vr * 0.68, vr * 1.48, vr * 0.92);
        ctx.fill(); ctx.stroke();
        // 中央主锋棱枪
        ctx.beginPath();
        ctx.moveTo(vr * 2.15, 0);
        ctx.lineTo(vr * 0.32, -vr * 0.56);
        ctx.lineTo(-vr * 1.35, 0);
        ctx.lineTo(vr * 0.32, vr * 0.56);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(vr * 1.68, 0); ctx.lineTo(vr * 0.25, -vr * 0.25); ctx.lineTo(-vr * 0.55, 0); ctx.lineTo(vr * 0.25, vr * 0.25);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (shp === 'blood_crescent') {
        // 烬羽【断刃·八荒血月斩】预烘焙刀波精灵：首帧即现、零异步贴图缺失、高辨识度绯红鎏金新月斩波
        const ang = Math.atan2(b.vy, b.vx);
        const bmSpr = typeof getBloodMoonWaveSprite === 'function' ? getBloodMoonWaveSprite() : null;
        const sz = Math.max(30, vr * 4.2);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang);
        if (bmSpr) {
          ctx.drawImage(bmSpr, -sz * 0.5, -sz * 0.5, sz, sz);
        } else {
          ctx.fillStyle = bCol; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(-vr * 0.35, 0, vr * 1.95, -1.14, 1.14, false);
          ctx.arc(-vr * 0.95, 0, vr * 1.62, 0.96, -0.96, true);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      } else if (shp === 'crescent') {
        // 蚀月流光弯刀波：柔紫刀气外晕 + 锐利渐收新月刃弧 + 亮白刃口高光
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.globalAlpha = 0.24;
        ctx.strokeStyle = bCol; ctx.lineWidth = 4.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-vr * 0.36, 0, vr * 1.62, -1.04, 1.04, false); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = bCol; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(-vr * 0.34, 0, vr * 1.56, -1.08, 1.08, false);
        ctx.arc(-vr * 0.92, 0, vr * 1.38, 0.92, -0.92, true);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-vr * 0.36, 0, vr * 1.34, -0.72, 0.72, false); ctx.stroke();
        ctx.restore();
      } else if (shp === 'disc') {
        // 旋刃陀螺偶：【六刃弧齿鎏金涡轮轮】柔金动态残影环 + 六片弯刀涡轮刃 + 曜金轴承白芯
        const dvr = Math.max(7.2, br * 1.08);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = bCol;
        ctx.beginPath(); ctx.arc(0, 0, dvr * 1.42, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.rotate(b.rot || 0);
        ctx.fillStyle = bCol; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a0 = (k / 6) * Math.PI * 2;
          const a1 = a0 + 0.42;
          const a2 = a0 + (Math.PI * 2) / 6;
          if (k === 0) ctx.moveTo(Math.cos(a0) * (dvr * 0.56), Math.sin(a0) * (dvr * 0.56));
          ctx.quadraticCurveTo(
            Math.cos(a0 + 0.14) * (dvr * 1.36), Math.sin(a0 + 0.14) * (dvr * 1.36),
            Math.cos(a1) * (dvr * 1.32), Math.sin(a1) * (dvr * 1.32)
          );
          ctx.lineTo(Math.cos(a2) * (dvr * 0.56), Math.sin(a2) * (dvr * 0.56));
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1e1b2e';
        ctx.beginPath(); ctx.arc(0, 0, dvr * 0.46, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, Math.max(2.0, dvr * 0.28), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (shp === 'lance' || shp === 'needle') {
        // 寒晶狙击蛛 & 精英亡语：【流光贯魂棱梭】丝滑渐收彗星尾翼 + 流线星芒梭头 + 纯白晶芯
        const ang = Math.atan2(b.vy, b.vx);
        const lvr = Math.max(6.4, br * 1.12);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = bCol;
        ctx.beginPath();
        ctx.moveTo(-lvr * 3.15, 0); ctx.lineTo(0, -lvr * 0.62); ctx.lineTo(lvr * 1.2, 0); ctx.lineTo(0, lvr * 0.62);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.68;
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.moveTo(-lvr * 2.05, 0); ctx.lineTo(0, -lvr * 0.24); ctx.lineTo(0, lvr * 0.24);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = bCol; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.35; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lvr * 2.05, 0);
        ctx.quadraticCurveTo(lvr * 0.35, -lvr * 0.84, -lvr * 0.92, -lvr * 0.36);
        ctx.lineTo(-lvr * 0.48, 0);
        ctx.lineTo(-lvr * 0.92, lvr * 0.36);
        ctx.quadraticCurveTo(lvr * 0.35, lvr * 0.84, lvr * 2.05, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(lvr * 1.48, 0); ctx.lineTo(0, -lvr * 0.30); ctx.lineTo(-lvr * 0.32, 0); ctx.lineTo(0, lvr * 0.30);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (shp === 'shard') {
        // 镇狱巨像：【棱镜碎星晶刺】
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = bCol;
        ctx.beginPath();
        ctx.moveTo(-vr * 2.2, 0); ctx.lineTo(0, -vr * 0.95); ctx.lineTo(vr * 1.8, 0); ctx.lineTo(0, vr * 0.95);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = bCol; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.35; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(vr * 1.68, 0); ctx.lineTo(vr * 0.12, -vr * 0.86); ctx.lineTo(-vr * 1.18, 0); ctx.lineTo(vr * 0.12, vr * 0.86);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(vr * 1.15, 0); ctx.lineTo(vr * 0.10, -vr * 0.34); ctx.lineTo(-vr * 0.52, 0); ctx.lineTo(vr * 0.10, vr * 0.34);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (shp === 'orb') {
        // 蚀忆魂灯龛 & 凝晶重球：【星芒魂灯宝珠】柔和呼吸外晕 + 内层星轨细环 + 自转凹弧四芒星芯
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = bCol;
        ctx.beginPath(); ctx.arc(0, 0, vr * 1.46, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = bCol; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.35;
        ctx.beginPath(); ctx.arc(0, 0, vr * 0.96, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(0, 0, vr * 0.66, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.rotate(b.rot || 0);
        ctx.fillStyle = '#ffffff';
        const sr = vr * 0.72;
        ctx.beginPath();
        ctx.moveTo(sr, 0);
        ctx.quadraticCurveTo(0, 0, 0, -sr);
        ctx.quadraticCurveTo(0, 0, -sr, 0);
        ctx.quadraticCurveTo(0, 0, 0, sr);
        ctx.quadraticCurveTo(0, 0, sr, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (shp === 'acid' || shp === 'fire') {
        // 霜晶浮灵 / 分裂软泥 / 熔核火弹：【一体贝塞尔流光水滴魂焰弹】（彻底告别生硬三角拼圆球！）
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = bCol;
        ctx.beginPath();
        ctx.moveTo(-vr * 2.55, 0);
        ctx.quadraticCurveTo(vr * 0.28, -vr * 1.34, vr * 1.24, 0);
        ctx.quadraticCurveTo(vr * 0.28, vr * 1.34, -vr * 2.55, 0);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = bCol; ctx.strokeStyle = rimCol; ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-vr * 2.05, 0);
        ctx.quadraticCurveTo(vr * 0.26, -vr * 1.02, vr * 1.00, 0);
        ctx.quadraticCurveTo(vr * 0.26, vr * 1.02, -vr * 2.05, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = shp === 'fire' ? '#fef9c3' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-vr * 0.65, 0);
        ctx.quadraticCurveTo(vr * 0.34, -vr * 0.48, vr * 0.72, 0);
        ctx.quadraticCurveTo(vr * 0.34, vr * 0.48, -vr * 0.65, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (b.isVortexTrap) {
        // 蚀界生存试炼：【游弋冥渊雷涡】自转三叶暗雷星涡弧翼 + 渊紫旋环 + 炽白雷核
        const spin = (b.rot || 0) + now * 0.0052;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = bCol;
        ctx.beginPath(); ctx.arc(0, 0, vr * 1.72, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = bCol;
        ctx.lineWidth = 2.0;
        for (let k = 0; k < 3; k++) {
          const sa = spin + k * ((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.arc(0, 0, vr * 1.32, sa, sa + 1.25);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = bCol;
        ctx.strokeStyle = rimCol;
        ctx.lineWidth = 1.45;
        ctx.beginPath(); ctx.arc(0, 0, vr * 0.92, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, Math.max(2.4, vr * 0.44), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        // 默认高净度弹幕宝珠：柔和同色光晕 + 纤细衬边弹体 + 纯白高光核
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = bCol;
        ctx.beginPath(); ctx.arc(b.x, b.y, vr * 1.44, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = rimCol; ctx.lineWidth = 1.35;
        ctx.fillStyle = bCol;
        ctx.beginPath(); ctx.arc(b.x, b.y, vr * 0.96, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(b.x + vr * 0.14, b.y - vr * 0.12, Math.max(1.9, vr * 0.42), 0, Math.PI * 2); ctx.fill();
      }
    }

    // 枪口十字火舌、爆裂粒子与方向性白芯受击火花
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.x < vL || p.x > vR || p.y < vT || p.y > vB) continue;
      const life = Math.max(0, Math.min(1, p.t / Math.max(0.01, p.maxT)));
      ctx.globalAlpha = life;
      const pr = Math.max(1, p.r || 2);
      if (p.muzzle) {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0);
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.moveTo(pr * 1.5, 0); ctx.lineTo(0, -pr * 0.55); ctx.lineTo(-pr * 0.4, 0); ctx.lineTo(0, pr * 0.55);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(2, 0, Math.max(0.5, pr * 0.36), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, pr * (0.45 + life * 0.55)), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < sparks.length; i++) {
      const sp = sparks[i];
      if (sp.x < vL || sp.x > vR || sp.y < vT || sp.y > vB) continue;
      const life = Math.max(0, sp.t / sp.maxT);
      let ux = sp.ux, uy = sp.uy;
      if (ux === undefined) {
        const spd = Math.hypot(sp.vx, sp.vy) || 1;
        ux = sp.vx / spd; uy = sp.vy / spd;
        sp.ux = ux; sp.uy = uy;
      }
      const reach = sp.len * life;
      const dx = ux * reach, dy = uy * reach;
      ctx.globalAlpha = life;
      ctx.strokeStyle = sp.color; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - dx, sp.y - dy); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - dx * 0.5, sp.y - dy * 0.5); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    let lastFontSize = -1;
    const denseTexts = texts.length > 18;
    const desktopTextScale = isTouch ? 1.0 : 1.18;
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if (t.x < vL || t.x > vR || t.y < vT || t.y > vB) continue;
      const life = Math.max(0, t.t / Math.max(0.01, t.maxT));
      const scale = (t.important
        ? (life > 0.90 ? 1 + (1 - life) * 2.2 : 1)
        : (t.isCritPop
            ? (life > 0.76 ? 1 + Math.sin(((1 - life) / 0.24) * Math.PI) * 0.42 : 1)
            : (life > 0.8 ? 1 + (1 - life) * 1.7 : 1))) * desktopTextScale;
      ctx.globalAlpha = t.important ? Math.min(1, life / 0.22) : Math.min(1, life * 1.9);
      const fSize = (Math.max(11, Math.round(t.size * scale)) + 1) & ~1;
      if (fSize !== lastFontSize) {
        lastFontSize = fSize;
        ctx.font = `900 ${fSize}px -apple-system, sans-serif`;
      }
      if (t.important) {
        const padX = 11, pillH = fSize + 10;
        if (!(t._baseW > 0)) {
          t._baseW = ctx.measureText(t.txt).width / Math.max(0.5, scale);
        }
        const tw = Math.min(400, Math.max(48, t._baseW * scale + padX * 2));
        ctx.fillStyle = 'rgba(15, 11, 26, 0.78)';
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(t.x - tw * 0.5, t.y - fSize + 1, tw, pillH, 7);
        ctx.fill();
        ctx.stroke();
      }
      if (isTouch || (denseTexts && !t.important)) {
        ctx.fillStyle = '#120d18';
        ctx.fillText(t.txt, t.x + 1.5, t.y + 1.5);
        ctx.fillStyle = t.color;
        ctx.fillText(t.txt, t.x, t.y);
      } else {
        ctx.lineWidth = 3.6; ctx.strokeStyle = '#120d18';
        ctx.strokeText(t.txt, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.txt, t.x, t.y);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  ctx.restore();

  // 蚀界生存试炼 & D5 第 16 层二阶段蚀日浓雾 · 沉浸浓雾提灯视野系统（预烘焙 100% 纯黑不透怪外圈遮罩 + 动态翻涌迷雾云团 + 机关幽芒预警与灯圈来袭/首领方位箭头，战斗帧 0 渐变 / 0 模糊）
  const _d5P2FogOverlay = typeof isD5Floor16Phase2FogActive === 'function' && isD5Floor16Phase2FogActive();
  const _hasResidualFog = !!(typeof survivalTrialState === 'object' && survivalTrialState && (survivalTrialState.fogIntroP || 0) > 0.015);
  if (((typeof survivalTrialWave !== 'undefined' && survivalTrialWave) || _d5P2FogOverlay || _hasResidualFog) && player && state !== 'menu' && viewW > 40 && viewH > 40) {
    const st = (typeof survivalTrialState === 'object' && survivalTrialState) ? survivalTrialState : null;
    const activeFogNow = !!((typeof survivalTrialWave !== 'undefined' && survivalTrialWave) || _d5P2FogOverlay);
    const introP = st ? Math.max(activeFogNow ? 0.05 : 0, Math.min(1, st.fogIntroP || 0)) : 1;
    const boostP = (st && st.lanternBoostT > 0) ? Math.min(1, st.lanternBoostT / 1.25) : 0;
    const fNow = (typeof _frameNow !== 'undefined' ? _frameNow : performance.now()) * 0.001;
    const lx = viewW * 0.5 + sx + (player.x - cam.x) * camZoom;
    const ly = viewH * 0.5 + sy + (player.y - cam.y) * camZoom;
    const diag = Math.hypot(viewW, viewH);
    const baseWorldR = _d5P2FogOverlay ? 268 : 238;
    const targetWorldR = (baseWorldR + boostP * 72) + Math.sin(fNow * 4.2) * 3.5;
    const clearR = Math.max(64, (diag * (1 - introP)) + (targetWorldR * camZoom) * introP);
    const scId = (curScene && curScene.id) || 'foundry';
    const fogRgb = (typeof SOUL_FOG_PALETTE !== 'undefined' && SOUL_FOG_PALETTE[scId]) || [5, 8, 15];
    const mr = fogRgb[0], mg = fogRgb[1], mb = fogRgb[2];
    const solidFogFill = `rgb(${mr}, ${mg}, ${mb})`;
    const fogTex = (typeof soulFogMaps !== 'undefined' && soulFogMaps) ? (soulFogMaps[scId] || soulFogMaps.foundry) : null;
    const rimAccent = boostP > 0.05 ? '#72efdd' : (scId === 'glacier' ? '#7dd3fc' : '#f6d379');

    ctx.save();
    const r0 = Math.max(48, clearR);
    // soulFogMaps 中心半径占比 138/256 ≈ 0.539，外圈 ≥ 212/256 为 alpha=1.0 100% 纯实心浓雾，外圈彻底不透任何底图或怪物！
    const apHalf = Math.max(92, r0 / 0.5390625);
    const ax0 = lx - apHalf, ay0 = ly - apHalf;
    const ax1 = lx + apHalf, ay1 = ly + apHalf;
    ctx.globalAlpha = introP;
    ctx.fillStyle = solidFogFill;
    if (fogTex) {
      // 四周屏外扩展纯实心遮挡矩形 + 中央预烘焙柔化浓雾贴图无缝拼接
      if (ay0 > -8) ctx.fillRect(-8, -8, viewW + 16, ay0 + 9);
      if (ay1 < viewH + 8) ctx.fillRect(-8, ay1 - 1, viewW + 16, viewH + 10 - ay1);
      const midTop = Math.max(-8, ay0);
      const midH = Math.max(0, Math.min(viewH + 8, ay1) - midTop);
      if (midH > 0) {
        if (ax0 > -8) ctx.fillRect(-8, midTop, ax0 + 9, midH);
        if (ax1 < viewW + 8) ctx.fillRect(ax1 - 1, midTop, viewW + 10 - ax1, midH);
      }
      ctx.drawImage(fogTex, ax0, ay0, apHalf * 2, apHalf * 2);
    } else {
      // 无离屏贴图兜底（如单元测试 Mock 环境）：内层羽化过渡 + 外圈 100% 纯实心完全遮蔽
      const rMid = r0 * 1.18;
      const rSolid = r0 * 1.38;
      ctx.globalAlpha = 0.52 * introP;
      ctx.beginPath(); ctx.rect(-8, -8, viewW + 16, viewH + 16); ctx.arc(lx, ly, r0, 0, Math.PI * 2, true); ctx.fill('evenodd');
      ctx.globalAlpha = 0.78 * introP;
      ctx.beginPath(); ctx.rect(-8, -8, viewW + 16, viewH + 16); ctx.arc(lx, ly, rMid, 0, Math.PI * 2, true); ctx.fill('evenodd');
      ctx.globalAlpha = introP;
      ctx.beginPath(); ctx.rect(-8, -8, viewW + 16, viewH + 16); ctx.arc(lx, ly, rSolid, 0, Math.PI * 2, true); ctx.fill('evenodd');
    }

    // 动态翻涌迷雾效果（双层逆向漂移暗雾云团 + 魂灯边缘游丝雾霭，0 渐变 0 分配，营造真实流动迷雾质感）
    const cloudFillOuter = `rgb(${Math.min(255, mr + 16)}, ${Math.min(255, mg + 22)}, ${Math.min(255, mb + 36)})`;
    const cloudFillInner = scId === 'glacier'
      ? 'rgb(125, 211, 252)'
      : (scId === 'wasteland' ? 'rgb(192, 132, 252)' : 'rgb(226, 214, 192)');
    ctx.fillStyle = cloudFillOuter;
    for (let k = 0; k < 14; k++) {
      const dir = (k & 1) === 0 ? 1 : -1;
      const ang = (k / 14) * Math.PI * 2 + fNow * (0.14 + (k % 3) * 0.04) * dir;
      const breath = Math.sin(fNow * 1.35 + k * 1.7) * (r0 * 0.045);
      const dist = r0 * (1.10 + (k % 4) * 0.065) + breath;
      const cx = lx + Math.cos(ang) * dist;
      const cy = ly + Math.sin(ang) * dist;
      const rx = r0 * (0.28 + (k % 3) * 0.055);
      const ry = r0 * (0.14 + ((k + 1) % 3) * 0.032);
      ctx.globalAlpha = (0.24 + 0.08 * Math.sin(fNow * 1.8 + k)) * introP;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, ang + Math.PI * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = cloudFillInner;
    for (let k = 0; k < 9; k++) {
      const ang = (k / 9) * Math.PI * 2 - fNow * (0.21 + (k % 2) * 0.06);
      const dist = r0 * (0.98 + (k % 3) * 0.055) + Math.cos(fNow * 1.6 + k * 2.1) * (r0 * 0.03);
      const cx = lx + Math.cos(ang) * dist;
      const cy = ly + Math.sin(ang) * dist;
      ctx.globalAlpha = (0.065 + boostP * 0.045 + 0.025 * Math.sin(fNow * 2.3 + k)) * introP;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r0 * 0.21, r0 * 0.075, ang + Math.PI * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }

    // 魂灯微光刻度环（清晰标示照明安全圈边界）
    ctx.globalAlpha = (0.36 + boostP * 0.26) * introP;
    ctx.strokeStyle = rimAccent;
    ctx.lineWidth = 1.6 + boostP * 0.9;
    ctx.beginPath();
    ctx.arc(lx, ly, r0, 0, Math.PI * 2);
    ctx.stroke();

    // 迷雾机关幽芒预警：差异化透出锯齿地脉裂谷、双轨光栅、虚线剑梭与旋转紫晶十字，绝不透出任何怪物！
    if (typeof survivalFissures !== 'undefined' && survivalFissures.length > 0) {
      ctx.lineCap = 'round';
      for (let i = 0; i < survivalFissures.length; i++) {
        const f = survivalFissures[i];
        if (!f) continue;
        const sx1 = viewW * 0.5 + sx + (f.x1 - cam.x) * camZoom;
        const sy1 = viewH * 0.5 + sy + (f.y1 - cam.y) * camZoom;
        const sx2 = viewW * 0.5 + sx + (f.x2 - cam.x) * camZoom;
        const sy2 = viewH * 0.5 + sy + (f.y2 - cam.y) * camZoom;
        const dxs = sx2 - sx1, dys = sy2 - sy1;
        const slen = Math.hypot(dxs, dys) || 1;
        const snx = -dys / slen, sny = dxs / slen;
        const jags = f.jags;
        ctx.globalAlpha = (f.windupT > 0 ? 0.44 : 0.38) * introP;
        ctx.strokeStyle = f.color || '#ff7b29';
        ctx.lineWidth = Math.max(2.2, (f.windupT > 0 ? 2.8 : 4.2) * camZoom);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        if (jags && jags.length > 2) {
          const nPts = jags.length;
          for (let k = 1; k < nPts - 1; k++) {
            const t = k / (nPts - 1);
            const off = jags[k] * 11 * camZoom;
            ctx.lineTo(sx1 + dxs * t + snx * off, sy1 + dys * t + sny * off);
          }
        }
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }
    }
    if (typeof survivalSkyVolleys !== 'undefined' && survivalSkyVolleys.length > 0) {
      ctx.lineCap = 'round';
      for (let i = 0; i < survivalSkyVolleys.length; i++) {
        const v = survivalSkyVolleys[i];
        if (!v) continue;
        const sx1 = viewW * 0.5 + sx + (v.sx - cam.x) * camZoom;
        const sy1 = viewH * 0.5 + sy + (v.sy - cam.y) * camZoom;
        const sx2 = viewW * 0.5 + sx + (v.ex - cam.x) * camZoom;
        const sy2 = viewH * 0.5 + sy + (v.ey - cam.y) * camZoom;
        const vp = Math.max(0, Math.min(1, 1 - (v.windupT || 0) / Math.max(0.05, v.maxWindup || 0.8)));
        ctx.globalAlpha = (0.28 + vp * 0.28) * introP;
        ctx.strokeStyle = v.color || (v.kind === 'corridor_beam' ? '#fbbf24' : '#ff4d6d');
        if (v.kind === 'corridor_beam') {
          const dxs = sx2 - sx1, dys = sy2 - sy1;
          const slen = Math.hypot(dxs, dys) || 1;
          const hwPx = Math.max(4, (v.halfW || 25) * camZoom);
          const ox = (-dys / slen) * hwPx, oy = (dxs / slen) * hwPx;
          ctx.lineWidth = Math.max(1.8, 2.4 * camZoom);
          ctx.beginPath();
          ctx.moveTo(sx1 + ox, sy1 + oy); ctx.lineTo(sx2 + ox, sy2 + oy);
          ctx.moveTo(sx1 - ox, sy1 - oy); ctx.lineTo(sx2 - ox, sy2 - oy);
          ctx.stroke();
        } else {
          ctx.lineWidth = 2.1;
          ctx.setLineDash([8, 7]);
          ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    if (typeof hazards !== 'undefined' && hazards.length > 0) {
      ctx.lineCap = 'round';
      for (let i = 0; i < hazards.length; i++) {
        const h = hazards[i];
        if (!h || h.style !== 'cross_beam') continue;
        const hcx = viewW * 0.5 + sx + (h.x - cam.x) * camZoom;
        const hcy = viewH * 0.5 + sy + (h.y - cam.y) * camZoom;
        const spanPx = (h.halfLen || 190) * camZoom;
        ctx.globalAlpha = 0.36 * introP;
        ctx.strokeStyle = h.color || '#c084fc';
        ctx.lineWidth = Math.max(1.8, 2.4 * camZoom);
        for (let k = 0; k < 2; k++) {
          const la = (h.angle || 0) + k * Math.PI * 0.5;
          ctx.beginPath();
          ctx.moveTo(hcx - Math.cos(la) * spanPx, hcy - Math.sin(la) * spanPx);
          ctx.lineTo(hcx + Math.cos(la) * spanPx, hcy + Math.sin(la) * spanPx);
          ctx.stroke();
        }
      }
    }

    // 提灯灯圈边缘差异化来袭标识（▲ 绯红燕尾梭=天外贯星剑梭，❖ 青紫旋涡星芒=游弋冥渊雷涡）
    const chevR = Math.max(28, r0 - 10);
    if (typeof survivalSkyVolleys !== 'undefined' && survivalSkyVolleys.length > 0) {
      for (let i = 0; i < survivalSkyVolleys.length; i++) {
        const v = survivalSkyVolleys[i];
        if (!v || v.kind === 'corridor_beam') continue;
        const dxV = v.sx - player.x, dyV = v.sy - player.y;
        const angToSrc = Math.atan2(dyV, dxV);
        const cxA = lx + Math.cos(angToSrc) * chevR;
        const cyA = ly + Math.sin(angToSrc) * chevR;
        const vp = Math.max(0, Math.min(1, 1 - (v.windupT || 0) / Math.max(0.05, v.maxWindup || 0.8)));
        ctx.save();
        ctx.translate(cxA, cyA);
        ctx.rotate(angToSrc);
        ctx.globalAlpha = (0.58 + vp * 0.38) * introP;
        ctx.fillStyle = '#fda4af';
        ctx.strokeStyle = '#4c0519';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(8.8, 0);
        ctx.lineTo(-4.6, -5.0);
        ctx.lineTo(-2.0, 0);
        ctx.lineTo(-4.6, 5.0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    if (typeof eBullets !== 'undefined' && eBullets.length > 0) {
      const worldClearR = r0 / Math.max(0.25, camZoom);
      const spinT = ((typeof _frameNow !== 'undefined' ? _frameNow : performance.now()) * 0.0045);
      for (let i = 0; i < eBullets.length; i++) {
        const b = eBullets[i];
        if (!b || !b.isCelestial) continue;
        const dxB = b.x - player.x, dyB = b.y - player.y;
        const distB = Math.hypot(dxB, dyB);
        if (distB <= worldClearR * 0.92 || distB > 660) continue;
        // 仅提示朝向玩家半平面逼近的屏外天外弹道与冥渊雷涡
        if (dxB * b.vx + dyB * b.vy >= 0) continue;
        const angToB = Math.atan2(dyB, dxB);
        const cxB = lx + Math.cos(angToB) * chevR;
        const cyB = ly + Math.sin(angToB) * chevR;
        ctx.save();
        ctx.translate(cxB, cyB);
        ctx.globalAlpha = 0.94 * introP;
        if (b.isVortexTrap) {
          ctx.strokeStyle = '#2dd4bf';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 7.6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.rotate(spinT + i * 0.9);
          ctx.fillStyle = '#a855f7';
          ctx.strokeStyle = '#f0fdfa';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const kr = (k % 2 === 0) ? 7.2 : 2.6;
            const ka = (Math.PI * k) / 4;
            if (k === 0) ctx.moveTo(Math.cos(ka) * kr, Math.sin(ka) * kr);
            else ctx.lineTo(Math.cos(ka) * kr, Math.sin(ka) * kr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.rotate(angToB);
          ctx.fillStyle = '#ff4d6d';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(10.5, 0);
          ctx.lineTo(-5.0, -5.8);
          ctx.lineTo(-2.2, 0);
          ctx.lineTo(-5.0, 5.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    if (_d5P2FogOverlay && typeof enemies !== 'undefined' && enemies.length > 0) {
      const worldClearR = r0 / Math.max(0.25, camZoom);
      for (let i = 0; i < enemies.length; i++) {
        const be = enemies[i];
        if (!be || be.hp <= 0 || (be.type !== 'boss' && be.type !== 'special_boss')) continue;
        if (be.eclipseSingularity && Array.isArray(be.eclipseSingularity.sanctuaries)) {
          const sancts = be.eclipseSingularity.sanctuaries;
          for (let sk = 0; sk < sancts.length; sk++) {
            const sc = sancts[sk];
            const dxs = sc.x - player.x, dys = sc.y - player.y;
            if (Math.hypot(dxs, dys) > worldClearR * 0.85) {
              const angS = Math.atan2(dys, dxs);
              ctx.save();
              ctx.translate(lx + Math.cos(angS) * (chevR - 3), ly + Math.sin(angS) * (chevR - 3));
              ctx.rotate(angS);
              ctx.globalAlpha = 0.88 * introP;
              ctx.fillStyle = '#fde047';
              ctx.strokeStyle = '#78350f';
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.moveTo(7.5, 0); ctx.lineTo(0, -5.2); ctx.lineTo(-5.5, 0); ctx.lineTo(0, 5.2);
              ctx.closePath();
              ctx.fill(); ctx.stroke();
              ctx.restore();
            }
          }
        }
        const dxE = be.x - player.x, dyE = be.y - player.y;
        const distE = Math.hypot(dxE, dyE);
        if (distE > worldClearR * 0.86) {
          const angE = Math.atan2(dyE, dxE);
          ctx.save();
          ctx.translate(lx + Math.cos(angE) * chevR, ly + Math.sin(angE) * chevR);
          ctx.rotate(angE);
          ctx.globalAlpha = 0.94 * introP;
          ctx.fillStyle = (be.d5LastStandT || 0) > 0 ? '#ffd166' : '#ff2a55';
          ctx.strokeStyle = '#fffbeb';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(12.2, 0);
          ctx.lineTo(-5.8, -6.8);
          ctx.lineTo(-2.4, 0);
          ctx.lineTo(-5.8, 6.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  // v2.5.0 四幕层域实时动态微粒音景氛围层（黑铁雨丝 / 极光飘雪 / 发条金尘 / 日蚀余烬，0分配0渐变）
  if (state === 'wave' && viewW > 40 && viewH > 40) {
    const scId = (curScene && curScene.id) || 'foundry';
    const wt = ((typeof _frameNow !== 'undefined' ? _frameNow : performance.now()) * 0.001);
    const moteCnt = isTouch ? 12 : 20;
    ctx.save();
    if (scId === 'foundry') {
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.22)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i < moteCnt; i++) {
        const mx = ((i * 173 + wt * 110) % (viewW + 60)) - 30;
        const my = ((i * 97 + wt * 390) % (viewH + 60)) - 30;
        ctx.moveTo(mx, my);
        ctx.lineTo(mx - 7, my + 20);
      }
      ctx.stroke();
    } else if (scId === 'glacier') {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.34)';
      for (let i = 0; i < moteCnt; i++) {
        const mx = ((i * 157 + Math.sin(wt * 1.3 + i) * 26 + wt * 28) % viewW + viewW) % viewW;
        const my = ((i * 113 + wt * 68) % viewH);
        ctx.beginPath(); ctx.arc(mx, my, 1.6 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
      }
    } else if (scId === 'wasteland') {
      ctx.fillStyle = 'rgba(253, 230, 138, 0.28)';
      for (let i = 0; i < moteCnt; i++) {
        const mx = ((i * 149 + Math.cos(wt + i) * 20) % viewW + viewW) % viewW;
        const my = viewH - ((i * 89 + wt * 46) % viewH);
        ctx.fillRect(mx, my, 2.4, 2.4);
      }
    } else {
      ctx.fillStyle = 'rgba(246, 211, 121, 0.26)';
      for (let i = 0; i < moteCnt; i++) {
        const mx = ((i * 163 + Math.sin(wt * 0.9 + i) * 24) % viewW + viewW) % viewW;
        const my = viewH - ((i * 101 + wt * 54) % viewH);
        ctx.beginPath(); ctx.arc(mx, my, 1.5 + (i % 2) * 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // 屏幕四周电影感暗角（平滑过渡残血红晕，杜绝吸血/再生在 32% 阈值反复横跳引起的红黑闪屏）
  const wantLowHp = (player && state === 'wave' && (player.hp / Math.max(1, player.maxHp) < 0.32)) ? 1 : 0;
  _lowHpVigAlpha += (wantLowHp - _lowHpVigAlpha) * 0.12;
  if (_lowHpVigAlpha < 0.98) {
    ctx.drawImage(vigNormal, 0, 0, viewW, viewH);
  }
  if (_lowHpVigAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, _lowHpVigAlpha);
    ctx.drawImage(vigLowHp, 0, 0, viewW, viewH);
    ctx.restore();
  }

  // 屏幕顶部战术事件持久播报横幅（停留 3~4 秒，带剩余时间条，确保玩家不错过任何奇遇/环境异象）
  if (state === 'wave' && typeof banners !== 'undefined' && banners.length > 0) {
    const baseY = uiMode === 'mobile-portrait' ? 148 : (uiMode === 'mobile-landscape' ? 68 : 118);
    const fSize = uiMode === 'desktop' ? 16.5 : 12.5;
    ctx.save();
    ctx.font = `800 ${fSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      const maxT = Math.max(0.2, b.maxT || 3.2);
      const elapsed = maxT - b.t;
      const enterP = Math.min(1, elapsed / 0.16);
      const exitP = Math.min(1, Math.max(0, b.t / 0.45));
      const alpha = enterP * exitP;
      if (alpha <= 0.02) continue;
      const maxW = Math.max(200, viewW - 28);
      if (!b._tw || b._fSize !== fSize) {
        b._tw = ctx.measureText(b.txt).width;
        b._fSize = fSize;
      }
      const tw = Math.min(maxW, Math.max(220, b._tw + 40));
      const bh = uiMode === 'desktop' ? 37 : 28;
      const bx = viewW * 0.5 - tw * 0.5;
      const by = baseY + i * (bh + 7) - (1 - enterP) * 8;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(17, 13, 29, 0.48)';
      ctx.strokeStyle = b.color || '#ffd166';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(bx, by, tw, bh, 9);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.66;
      ctx.stroke();
      const progW = Math.max(0, (tw - 14) * Math.max(0, Math.min(1, b.t / maxT)));
      if (progW > 1) {
        ctx.globalAlpha = alpha * 0.56;
        ctx.fillStyle = b.color || '#ffd166';
        ctx.fillRect(bx + 7, by + bh - 3.5, progW, 2);
      }
      ctx.globalAlpha = alpha * 0.94;
      ctx.strokeStyle = 'rgba(5, 7, 15, 0.85)';
      ctx.lineWidth = 3.2;
      ctx.strokeText(b.txt, viewW * 0.5, by + bh * 0.5 - 0.5, tw - 18);
      ctx.fillStyle = '#f8f5ff';
      ctx.fillText(b.txt, viewW * 0.5, by + bh * 0.5 - 0.5, tw - 18);
    }
    ctx.restore();
  }

  // 地图奇遇圣物在视野外时，于屏幕边缘绘制醒目方向指引信标
  if (state === 'wave' && relics.length > 0) {
    const rel = relics[0];
    const rxScreen = (rel.x - cam.x) * camZoom + viewW * 0.5;
    const ryScreen = (rel.y - cam.y) * camZoom + viewH * 0.5;
    const pad = 42;
    if (rxScreen < pad || rxScreen > viewW - pad || ryScreen < 84 || ryScreen > viewH - pad) {
      const ang = Math.atan2(ryScreen - viewH * 0.5, rxScreen - viewW * 0.5);
      const px = Math.max(54, Math.min(viewW - 54, rxScreen));
      const py = Math.max(96, Math.min(viewH - 56, ryScreen));
      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = 'rgba(24, 16, 36, 0.88)';
      ctx.strokeStyle = (rel.def && rel.def.color) || '#ffd166';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(19, -6); ctx.lineTo(19, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.font = '16px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((rel.def && rel.def.icon) || '✨', 0, 1);
      ctx.restore();
    }
  }

  // 触屏设备：全屏动态悬浮虚拟摇杆（竖屏常驻拇指托盘锚点 + 拖动跟随 + 清晰大字引导）
  if (state === 'wave' && (isTouch || uiMode !== 'desktop')) {
    ctx.save();
    if (joy.active) {
      ctx.fillStyle = 'rgba(18, 15, 26, 0.36)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(joy.ox, joy.oy, joy.maxR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(joy.ox, joy.oy); ctx.lineTo(joy.cx, joy.cy); ctx.stroke();

      ctx.fillStyle = 'rgba(255, 209, 102, 0.82)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.90)';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(joy.cx, joy.cy, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (uiMode === 'mobile-portrait') {
      const gx = viewW * 0.5, gy = viewH - Math.min(135, viewH * 0.18);
      ctx.globalAlpha = wave === 1 && waveTime > 18 ? 0.65 : 0.24;
      ctx.fillStyle = 'rgba(18, 15, 26, 0.35)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gx, gy, 44, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 209, 102, 0.72)';
      ctx.beginPath(); ctx.arc(gx, gy, 15, 0, Math.PI * 2); ctx.fill();
      if (wave === 1 && waveTime > 18) {
        ctx.fillStyle = '#f5f2eb';
        ctx.font = '800 14.5px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('按住屏幕任意位置滑动走位 · 双指缩放', gx, gy + 68);
        ctx.textAlign = 'left';
      }
    }
    ctx.restore();
  }

  // 👑 首领登场 / 神话二阶段觉醒 / D5 临死挣扎（主线与无尽均强制展示立绘）半透明斜向破框立绘横幅
  // 完整展示后进入 0.85 秒丝滑上浮消逝动画（0 渐变分配 / 0 模糊滤镜 · 高透光不挡走位与弹幕）
  if (state === 'wave' &&
      typeof bossCutscene !== 'undefined' && bossCutscene && bossCutscene.t > 0 &&
      (endlessMode || bossCutscene.mode === 'last_stand') &&
      !(typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.isBlockingGameplay === 'function' && SpireDirector.isBlockingGameplay())) {
    const bc = bossCutscene;
    const fadeDur = Math.max(0.35, bc.fadeDur || 0.85);
    const maxT = Math.max(fadeDur + 0.5, bc.maxT || 4.85);
    const showDur = Math.max(0.5, maxT - fadeDur);
    const elapsed = Math.max(0, maxT - bc.t);
    const rawEnter = Math.min(1, elapsed / 0.30);
    const enterP = 1 - Math.pow(1 - rawEnter, 3);
    const rawExit = Math.min(1, Math.max(0, bc.t / fadeDur));
    const exitP = rawExit * rawExit * (3 - 2 * rawExit);
    const alpha = enterP * exitP;
    const dissolveLift = (1 - exitP) * 20;
    const isLastStand = bc.mode === 'last_stand';
    const isMythic = bc.mode === 'mythic_phase2' || isLastStand;
    const mainCol = isMythic ? '#ff2a55' : (bc.color || '#e11d48');
    const accCol = isMythic ? '#ffd166' : (bc.accent || '#f6d379');
    const portraitPortrait = viewW < 620;
    const isShortLand = !portraitPortrait && viewH < 500;
    const personaSpec = (typeof BOSS_PORTRAIT_DATA !== 'undefined' && BOSS_PORTRAIT_DATA) ? BOSS_PORTRAIT_DATA[bc.variant] : null;

    if (alpha > 0.008) {
      ctx.save();
      // 1. 全屏清透氛围衬底（大幅降低遮挡度，确保玩家与弹幕清晰可见）+ 破晓微闪
      ctx.globalAlpha = 0.26 * alpha;
      ctx.fillStyle = isMythic ? '#13040b' : '#060913';
      ctx.fillRect(0, 0, viewW, viewH);
      if (elapsed < 0.12) {
        ctx.globalAlpha = (1 - elapsed / 0.12) * 0.16;
        ctx.fillStyle = isMythic ? '#ffd166' : '#ffffff';
        ctx.fillRect(0, 0, viewW, viewH);
      }

      // 2. 上下电影级半透黑金封幅与中央棱钻饰纹
      const barH = Math.round(Math.min(isShortLand ? 38 : 54, viewH * 0.082) * enterP * (0.35 + 0.65 * exitP));
      ctx.globalAlpha = 0.48 * alpha;
      ctx.fillStyle = '#04060c';
      ctx.fillRect(0, 0, viewW, barH);
      ctx.fillRect(0, viewH - barH, viewW, barH);
      ctx.fillStyle = accCol;
      ctx.fillRect(0, Math.max(0, barH - 1.8), viewW, 1.8);
      ctx.fillRect(0, viewH - barH, viewW, 1.8);

      // 3. 双层斜切半透战幕横幅（底层主题色错位衬带 + 主层半透曜黑渐变带 + 内嵌细金线）
      const cy = viewH * 0.5 - dissolveLift * 0.45;
      const bandBaseH = portraitPortrait ? 252 : (isShortLand ? 168 : 210);
      const bandH = bandBaseH * (0.86 + 0.14 * exitP);
      const slant = portraitPortrait ? 18 : (isShortLand ? 24 : 34);
      const xL = -24, xR = viewW + 24;

      // 3a. 错位主题色暗影斜带
      ctx.globalAlpha = 0.18 * alpha;
      ctx.fillStyle = mainCol;
      ctx.beginPath();
      ctx.moveTo(xL, cy - bandH * 0.5 + slant + 8);
      ctx.lineTo(xR, cy - bandH * 0.5 - slant + 8);
      ctx.lineTo(xR, cy + bandH * 0.5 - slant + 10);
      ctx.lineTo(xL, cy + bandH * 0.5 + slant + 10);
      ctx.closePath();
      ctx.fill();

      // 3b. 主战幕斜带（半透金属暗泽渐变，透过战幕可直视战场与敌弹）
      ctx.globalAlpha = 0.54 * alpha;
      const ribGrad = ctx.createLinearGradient(0, cy - bandH * 0.5, viewW, cy + bandH * 0.5);
      if (isMythic) {
        ribGrad.addColorStop(0, '#14040c');
        ribGrad.addColorStop(0.35, '#2b0818');
        ribGrad.addColorStop(0.72, '#380b1f');
        ribGrad.addColorStop(1, '#12040a');
      } else {
        ribGrad.addColorStop(0, '#070b16');
        ribGrad.addColorStop(0.36, '#141129');
        ribGrad.addColorStop(0.72, '#1b1533');
        ribGrad.addColorStop(1, '#080c18');
      }
      ctx.fillStyle = ribGrad;
      ctx.beginPath();
      ctx.moveTo(xL, cy - bandH * 0.5 + slant);
      ctx.lineTo(xR, cy - bandH * 0.5 - slant);
      ctx.lineTo(xR, cy + bandH * 0.5 - slant);
      ctx.lineTo(xL, cy + bandH * 0.5 + slant);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isMythic ? '#ffd166' : mainCol;
      ctx.lineWidth = 3.0;
      ctx.stroke();

      // 3c. 横幅内部裁剪层：巨幅英文暗纹、平行流光切线、飘散金红余烬星尘与内嵌双金线
      ctx.save();
      ctx.clip();

      const inset = 6;
      ctx.globalAlpha = 0.42 * alpha;
      ctx.strokeStyle = accCol;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(xL, cy - bandH * 0.5 + slant + inset);
      ctx.lineTo(xR, cy - bandH * 0.5 - slant + inset);
      ctx.moveTo(xL, cy + bandH * 0.5 + slant - inset);
      ctx.lineTo(xR, cy + bandH * 0.5 - slant - inset);
      ctx.stroke();

      // 背景水印排印
      ctx.globalAlpha = 0.065 * alpha;
      ctx.fillStyle = isMythic ? '#ffd166' : '#ffffff';
      ctx.font = `italic 900 ${portraitPortrait ? 44 : 74}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(isLastStand ? 'LAST STAND · UNDYING DREAD' : (isMythic ? 'PHASE II · AWAKENING' : 'PHASE I · SOVEREIGN'), viewW - 24, cy + (portraitPortrait ? 86 : 58));

      // 斜向流光速度线
      const slope = (-2 * slant) / Math.max(1, xR - xL);
      ctx.globalAlpha = 0.30 * alpha;
      ctx.strokeStyle = accCol;
      ctx.lineWidth = 1.8;
      for (let s = 0; s < 6; s++) {
        const laneOff = -bandH * 0.36 + s * (bandH * 0.145);
        const sx0 = ((elapsed * 380 + s * 175) % (viewW + 260)) - 130;
        const sy0 = cy + laneOff + (sx0 - viewW * 0.5) * slope;
        const len = 95 + (s % 3) * 48;
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx0 + len, sy0 + len * slope);
        ctx.stroke();
      }

      // 浮游棱钻星烬微粒（消逝阶段加速上飘散逸）
      const moteCount = portraitPortrait ? 10 : 16;
      for (let m = 0; m < moteCount; m++) {
        const mx = ((m * 137 + elapsed * (52 + (m % 4) * 18)) % (viewW + 80)) - 40;
        const my = cy + Math.sin(elapsed * 1.9 + m * 1.7) * (bandH * 0.36) - (1 - exitP) * (18 + (m % 5) * 9);
        const mr = 2.2 + (m % 3) * 1.2;
        ctx.globalAlpha = (0.28 + (m % 3) * 0.14) * alpha;
        ctx.fillStyle = (m % 2 === 0) ? accCol : mainCol;
        ctx.beginPath();
        ctx.moveTo(mx, my - mr);
        ctx.lineTo(mx + mr, my);
        ctx.lineTo(mx, my + mr);
        ctx.lineTo(mx - mr, my);
        ctx.closePath();
        ctx.fill();
      }

      // 横幅下沿 5.0 秒鎏金展示进度丝线（满 5 秒归零后进入柔化消逝）
      const holdRemain = Math.max(0, Math.min(1, 1 - elapsed / showDur));
      if (holdRemain > 0.005) {
        const progEnd = viewW * holdRemain;
        const pyL = cy + bandH * 0.5 + slant - 3.2;
        const pyR = pyL + progEnd * slope;
        ctx.globalAlpha = 0.88 * alpha;
        ctx.strokeStyle = isMythic ? '#ffd166' : accCol;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(0, pyL);
        ctx.lineTo(progEnd, pyR);
        ctx.stroke();
      }
      ctx.restore();

      // 4. 破框半身立绘（一阶段夏装 / 二阶段隐藏泳装）与主宰铭文排印
      ctx.globalAlpha = 0.84 * alpha;
      const slideOffset = (1 - enterP) * 64;
      const phaseBadgeTxt = isLastStand
        ? '🩸 D5 绝境死战 · 临死挣扎'
        : (isMythic ? '⚡ PHASE II · 神话二阶立绘解封' : '👑 PHASE I · 首领降临立绘');
      const personaShort = personaSpec ? personaSpec.personaName.split(' · ')[0] : '';
      const skinTitle = personaSpec
        ? (isLastStand
          ? `🩸 不灭死战 · ${personaShort}「${personaSpec.mythicTitle || personaSpec.summerTitle}」`
          : (isMythic
            ? `🔥 隐藏二阶 · ${personaShort}「${personaSpec.mythicTitle || personaSpec.summerTitle}」`
            : `✨ 一阶夏装 · ${personaShort}「${personaSpec.summerTitle}」`))
        : (bc.subtitle || '🕯️ 守誓主宰显圣');

      if (portraitPortrait) {
        const pScale = Math.min(0.92, viewW / 430);
        drawBossPortrait(bc.variant, viewW * 0.5 - slideOffset * 0.65, cy - 52 - dissolveLift * 0.55, pScale, isMythic);

        ctx.textAlign = 'center';
        const pillW = Math.min(viewW - 36, 248);
        const pillY = cy + 36;
        ctx.fillStyle = isMythic ? 'rgba(225, 29, 72, 0.28)' : 'rgba(15, 23, 42, 0.48)';
        ctx.strokeStyle = accCol;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(viewW * 0.5 - pillW * 0.5, pillY, pillW, 21, 10.5);
        ctx.fill();
        ctx.stroke();
        ctx.font = '800 11px -apple-system, sans-serif';
        ctx.fillStyle = '#fde68a';
        ctx.fillText(phaseBadgeTxt, viewW * 0.5, pillY + 14.5, pillW - 16);

        ctx.font = '800 12px -apple-system, sans-serif';
        ctx.fillStyle = isMythic ? '#fda4af' : '#72efdd';
        ctx.fillText(skinTitle, viewW * 0.5, cy + 73, viewW - 28);

        ctx.font = '900 22px -apple-system, sans-serif';
        ctx.strokeStyle = '#05070f';
        ctx.lineWidth = 5;
        ctx.strokeText(bc.title || '守层主宰', viewW * 0.5, cy + 99, viewW - 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(bc.title || '守层主宰', viewW * 0.5, cy + 99, viewW - 24);

        if (bc.extraTag || bc.subtitle) {
          ctx.font = '700 11.5px -apple-system, sans-serif';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText((bc.extraTag || bc.subtitle || '').slice(0, 30), viewW * 0.5, cy + 119, viewW - 24);
        }
      } else {
        const portScale = isShortLand ? 0.90 : 1.16;
        const portX = Math.max(isShortLand ? 138 : 186, viewW * 0.255) - slideOffset;
        const textX = portX + (isShortLand ? 124 : 162) + slideOffset * 1.15;
        const maxTxtW = Math.max(180, viewW - textX - 42);

        drawBossPortrait(bc.variant, portX, cy - (isShortLand ? 4 : 8) - dissolveLift * 0.55, portScale, isMythic);

        ctx.textAlign = 'left';
        // 阶段铭牌胶囊 + 专属换装立绘副题
        const badgeW = isMythic ? 206 : 184;
        const badgeH = isShortLand ? 21 : 24;
        const badgeY = cy - (isShortLand ? 54 : 66);
        ctx.fillStyle = isMythic ? 'rgba(225, 29, 72, 0.36)' : 'rgba(114, 239, 221, 0.14)';
        ctx.strokeStyle = accCol;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(textX, badgeY, badgeW, badgeH, badgeH * 0.5);
        ctx.fill();
        ctx.stroke();
        ctx.font = `800 ${isShortLand ? 11 : 12}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isMythic ? '#ffd166' : '#72efdd';
        ctx.fillText(phaseBadgeTxt, textX + badgeW * 0.5, badgeY + badgeH * 0.68);

        ctx.textAlign = 'left';
        ctx.font = `800 ${isShortLand ? 12.5 : 14.5}px -apple-system, sans-serif`;
        ctx.fillStyle = accCol;
        ctx.fillText(skinTitle, textX + badgeW + 12, badgeY + badgeH * 0.70, Math.max(90, maxTxtW - badgeW - 12));

        // 首领真名巨字排印
        const titleSize = isShortLand ? 26 : 36;
        const titleY = cy - (isShortLand ? 10 : 12);
        ctx.font = `900 ${titleSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.strokeStyle = '#05070f';
        ctx.lineWidth = 6.5;
        ctx.strokeText(bc.title || '守层主宰', textX, titleY, maxTxtW);
        ctx.fillStyle = isMythic ? '#fffbeb' : '#ffffff';
        ctx.fillText(bc.title || '守层主宰', textX, titleY, maxTxtW);

        // 鎏金分割饰线 + 棱钻端头
        const divY = cy + (isShortLand ? 4 : 6);
        const divW = Math.min(maxTxtW, 380);
        ctx.strokeStyle = isMythic ? '#fb7185' : accCol;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(textX + 8, divY);
        ctx.lineTo(textX + divW, divY);
        ctx.stroke();
        ctx.fillStyle = accCol;
        ctx.beginPath();
        ctx.moveTo(textX, divY);
        ctx.lineTo(textX + 4.5, divY - 4.5);
        ctx.lineTo(textX + 9, divY);
        ctx.lineTo(textX + 4.5, divY + 4.5);
        ctx.closePath();
        ctx.fill();

        // 称号副标
        ctx.font = `800 ${isShortLand ? 13 : 15.5}px "Songti SC", "PingFang SC", serif`;
        ctx.fillStyle = '#e0fbfc';
        ctx.fillText(bc.subtitle || '🕯️ 守誓主宰显圣', textX, cy + (isShortLand ? 24 : 30), maxTxtW);

        // 战术博弈提示条
        if (bc.extraTag) {
          const tipH = isShortLand ? 24 : 29;
          const tipY = cy + (isShortLand ? 34 : 44);
          const tipW = Math.min(maxTxtW, Math.max(240, bc.extraTag.length * (isShortLand ? 12.5 : 14) + 28));
          ctx.fillStyle = isMythic ? 'rgba(217, 4, 41, 0.28)' : 'rgba(15, 23, 42, 0.46)';
          ctx.strokeStyle = isMythic ? '#ffd166' : 'rgba(246, 211, 121, 0.55)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.roundRect(textX, tipY, tipW, tipH, 7);
          ctx.fill();
          ctx.stroke();
          ctx.font = `800 ${isShortLand ? 11.5 : 13}px -apple-system, sans-serif`;
          ctx.fillStyle = isMythic ? '#ffd166' : '#f8fafc';
          ctx.fillText(bc.extraTag, textX + 12, tipY + tipH * 0.68, tipW - 22);
        }
      }

      // 5. 右下角防误触手动跳过胶囊（避免走位摇杆或空格闪避误关 4 秒立绘演出）
      if (elapsed > 0.60 && bc.t > fadeDur + 0.05) {
        const skW = portraitPortrait ? 132 : 164;
        const skH = 26;
        const skX = viewW - skW - 18;
        const skY = Math.max(viewH - Math.max(barH, 36) + (Math.max(barH, 36) - skH) * 0.5, viewH - 36);
        bc._skipRect = { x: skX - 8, y: skY - 8, w: skW + 16, h: skH + 16 };
        ctx.globalAlpha = 0.82 * exitP;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(246, 211, 121, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(skX, skY, skW, skH, 13);
        ctx.fill();
        ctx.stroke();
        ctx.font = '700 11.5px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e2e8f0';
        const remSec = Math.max(0, Math.ceil(showDur - elapsed));
        const skipTxt = portraitPortrait ? `跳过立绘 (${remSec}s) ▸` : `点击跳过 / Enter (${remSec}s) ▸`;
        ctx.fillText(skipTxt, skX + skW * 0.5, skY + 17);
      } else {
        bc._skipRect = null;
      }
      ctx.restore();
    }
  }
}

logInfo('BOOT', `引擎启动完成 · view=${viewW}x${viewH}(dpr=${dpr}) · ui=${uiMode} · world=${WORLD.w}x${WORLD.h}(scale=${curFloorScale})`);
last = performance.now();
// Full-screen HTML menus and the narrative stage cover the battlefield entirely.
// Keep the last battle frame on pause; never repaint thousands of hidden sprites.
function shouldRenderBattlefield() {
  return state === 'wave' && !(typeof SpireDirector !== 'undefined' && SpireDirector.isBlockingGameplay());
}

let framePacingRemainder = 0;
let previousLoopMode = '';
let battleUpdateCostMs = 0, battleDrawCostMs = 0, battleCostSamples = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const safeNow = Number.isFinite(now) ? now : performance.now();
  if (document.hidden) { last = safeNow; framePacingRemainder = 0; resetBattleFrameSample(); return; }
  const playing = shouldRenderBattlefield();
  const storytelling = typeof SpireDirector !== 'undefined' && SpireDirector.isActive();
  // Target 60 FPS in battle; prose needs at most 30 updates/s, static menus 10.
  // The elapsed time is accumulated until work runs, so throttling never slows time.
  const frameBudget = playing ? (1000 / 60) : (storytelling ? (1000 / 30) : 100);
  const loopMode = playing ? 'battle' : (storytelling ? 'story' : 'idle');
  if (loopMode !== previousLoopMode) {
    framePacingRemainder = 0;
    previousLoopMode = loopMode;
    resetBattleFrameSample();
    // The first frame includes time spent on a different screen.
    battleUpdateCostMs = battleDrawCostMs = battleCostSamples = 0;
    perfLogAcc = 0;
  }
  if (safeNow - last + framePacingRemainder < frameBudget - 0.75) return;
  const rawMs = Math.max(0, safeNow - last);
  // Carry the fractional interval over: dropping it halves the effective
  // frame rate on 75/90 Hz displays and produces uneven pacing on 144 Hz.
  framePacingRemainder = Math.max(0, rawMs + framePacingRemainder - frameBudget) % frameBudget;
  const dt = Math.min(playing ? 0.05 : 0.15, rawMs / 1000);
  last = safeNow;

  if (playing && rawMs > 180 && rawMs < 5000) {
    logSpikeCount++;
    logWarn('STALL', `帧耗时峰值 ${Math.round(rawMs)}ms · w=${wave} E=${enemies.length} B=${bullets.length} P=${particles.length}`);
  }

  if (playing) {
    const sampleMs = Math.min(250, rawMs);
    fpsFrames++;
    fpsAcc += sampleMs;
    if (rawMs < 5000 && rawMs > maxFrameMsWindow) maxFrameMsWindow = rawMs;
    if (fpsAcc >= 500) {
      fpsVal = Math.max(1, Math.min(240, Math.round((fpsFrames * 1000) / fpsAcc)));
      fpsFrames = 0;
      fpsAcc = 0;
    }
    perfLogAcc += dt;
    if (perfLogAcc >= 5.0) {
      perfLogAcc = 0;
      const samples = Math.max(1, battleCostSamples);
      logInfo('PERF', `FPS=${fpsVal} maxFrame=${Math.round(maxFrameMsWindow)}ms update=${(battleUpdateCostMs / samples).toFixed(1)}ms draw=${(battleDrawCostMs / samples).toFixed(1)}ms dpr=${dpr.toFixed(2)} w=${wave}(${Math.ceil(waveTime)}s) E=${enemies.length} B=${bullets.length} D=${drops.length}`);
      maxFrameMsWindow = 0;
      battleUpdateCostMs = battleDrawCostMs = battleCostSamples = 0;
    }
  } else {
    // Menu/story throttling is intentional and is not a battle FPS sample.
    fpsFrames = 0;
    fpsAcc = 0;
    maxFrameMsWindow = 0;
  }

  if (playing && !bossCutscene) recordBattleFrame(rawMs);
  const updateStart = playing ? performance.now() : 0;
  try {
    update(dt);
  } catch (err) {
    logError('UPDATE_ERR', err);
  }
  if (playing) battleUpdateCostMs += performance.now() - updateStart;
  if (shouldRenderBattlefield()) {
    const drawStart = performance.now();
    try {
      draw();
    } catch (err) {
      logError('DRAW_ERR', err);
      try { ctx.restore(); } catch (_) {}
    }
    battleDrawCostMs += performance.now() - drawStart;
    battleCostSamples++;
  }
  if (typeof SpireDirector !== 'undefined' && SpireDirector && typeof SpireDirector.render === 'function') {
    try {
      SpireDirector.render();
    } catch (err) {
      logError('DIRECTOR_DRAW_ERR', err);
    }
  }
}
if (typeof SpireBootGate !== 'undefined' && SpireBootGate && typeof SpireBootGate.runFullCheck === 'function') {
  SpireBootGate.runFullCheck('renderer_tail');
}
requestAnimationFrame(loop);
