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
        : (tr.kind === 'ice_sheet' ? '🧊 寒晶方砖台 (寒缓冰封)' : '🕳️ 石砌断层渊 (阻挡通行)'));
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

let _lastFloorArtProbeAt = 0;

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

  // 若首帧烘焙时竞技场底图仍在蜂窝网络下载中，每 450ms 自动探测并在就绪瞬间重烘焙一次
  if (typeof floorBakedWithArenaArt !== 'undefined' && !floorBakedWithArenaArt && now - _lastFloorArtProbeAt > 450) {
    _lastFloorArtProbeAt = now;
    const probeScId = (curScene && curScene.id) || 'foundry';
    if (typeof getSpireArenaBgImage === 'function' && getSpireArenaBgImage(probeScId) && typeof buildFloorTexture === 'function') {
      buildFloorTexture();
    }
  }

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

    // 稀有地图奇遇召唤圣物（扩容巨型双环六芒星召唤祭坛 + 冲天圣辉光柱 + 脉冲声呐环 + 站立读条进度环）
    for (let i = 0; i < relics.length; i++) {
      const rel = relics[i];
      const rr = Math.max(28, rel.r || 88);
      const col = (rel.def && rel.def.color) || '#ffd166';
      const bName = (rel.def && (rel.def.bossName || rel.def.name)) || '秘境主宰';
      const prog = Math.max(0, Math.min(1, (rel.charge || 0) / Math.max(0.1, rel.need || 1.1)));
      drawVfxGlow(ctx, 'glowGold', rel.x, rel.y, rr * 1.32, 0.34 + prog * 0.22);
      ctx.save();
      ctx.translate(rel.x, rel.y);
      // 向外扩散的声呐脉冲唤醒环，远距离一眼锁定祭坛方位
      const sonarP = (rel.pulse * 0.42) % 1;
      ctx.globalAlpha = (1 - sonarP) * 0.46;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, rr * (1.02 + sonarP * 0.56), 0, Math.PI * 2); ctx.stroke();

      ctx.globalAlpha = 0.16 + Math.sin(rel.pulse) * 0.05 + prog * 0.12;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
      // 冲天圣辉光柱（纯多边形叠层，0 实时渐变）
      ctx.globalAlpha = 0.16 + Math.sin(rel.pulse * 1.8) * 0.05 + prog * 0.16;
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(-22, 0); ctx.lineTo(-10, -150); ctx.lineTo(10, -150); ctx.lineTo(22, 0);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.24 + prog * 0.20;
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.moveTo(-9, 0); ctx.lineTo(-3, -150); ctx.lineTo(3, -150); ctx.lineTo(9, 0);
      ctx.closePath(); ctx.fill();

      // 外圈顺时针铭文虚线阵
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = col;
      ctx.lineWidth = 3.0;
      ctx.save();
      ctx.rotate(rel.pulse * 0.32);
      ctx.setLineDash([14, 8]);
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      for (let k = 0; k < 6; k++) {
        const ka = (Math.PI * 2 * k) / 6;
        const px = Math.cos(ka) * (rr * 0.94), py = Math.sin(ka) * (rr * 0.94);
        ctx.fillStyle = '#1b1429';
        ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      // 内圈逆时针六芒星秘法副环
      ctx.save();
      ctx.rotate(-rel.pulse * 0.45);
      ctx.globalAlpha = 0.62 + prog * 0.30;
      ctx.strokeStyle = '#ffe8a3';
      ctx.lineWidth = 2.0;
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
        ctx.globalAlpha = 0.96;
        ctx.strokeStyle = '#ffe8a3';
        ctx.lineWidth = 6.5;
        ctx.beginPath(); ctx.arc(0, 0, rr + 6, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.68;
        ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.arc(0, 0, rr * 0.66, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
      }
      const bobY = Math.sin(rel.pulse * 1.5) * 4.5;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1b1429';
      ctx.strokeStyle = col;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(0, -24 + bobY); ctx.lineTo(21, bobY); ctx.lineTo(0, 24 + bobY); ctx.lineTo(-21, bobY);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = '23px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((rel.def && rel.def.icon) || '✨', 0, bobY + 1);
      // 祭坛头顶高对比胶囊铭牌
      ctx.font = '800 13.5px -apple-system, sans-serif';
      const lbl = prog > 0.03
        ? `⚡ 正在唤醒【${bName}】 ${Math.round(prog * 100)}%`
        : `⛩️ 隐藏Boss祭坛：【${bName}】（踏阵召唤）`;
      const ltw = Math.max(180, ctx.measureText(lbl).width + 24);
      const lby = -rr - 32;
      ctx.fillStyle = 'rgba(15, 11, 26, 0.86)';
      ctx.strokeStyle = prog > 0.03 ? '#ffd166' : col;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(-ltw * 0.5, lby, ltw, 24, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.fillText(lbl, 0, lby + 12.5);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    drawWorldZonesAndTelegraphs(vL, vR, vT, vB, now, fogCullActive, fogWorldCutR);

    for (let i = 0; i < spawns.length; i++) {
      const s = spawns[i];
      if (s.x < vL || s.x > vR || s.y < vT || s.y > vB) continue;
      if (fogCullActive && Math.hypot(s.x - player.x, s.y - player.y) >= fogWorldCutR) continue;
      const p = Math.max(0, Math.min(1, 1 - s.t / Math.max(0.01, s.maxT)));
      const isBig = s.type === 'boss' || s.type === 'mini_boss' || s.type === 'special_boss';
      const sz = Math.max(4, (isBig ? 31 : 13) * (0.8 + Math.sin(p * Math.PI * 4) * 0.15));
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

      // 隐藏首领召唤祭坛：角色脚下贴身黄金罗盘箭头 + 流动引魂金线（玩家视线聚焦主角时 0 延迟一眼看清方向！）
      if (relics.length > 0) {
        const rel = relics[0];
        const dxR = rel.x - player.x, dyR = rel.y - player.y;
        const distR = Math.hypot(dxR, dyR);
        const relR = rel.r || 88;
        if (distR > relR + 18) {
          const angR = Math.atan2(dyR, dxR);
          const ux = dxR / distR, uy = dyR / distR;
          const orbitR = 68 + Math.sin(now * 0.008) * 4;
          const ax = player.x + ux * orbitR, ay = player.y + uy * orbitR;
          const lineEndDist = Math.max(orbitR + 18, distR - relR - 6);
          // 1) 流动金色虚线牵引轨
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 209, 102, 0.42)';
          ctx.lineWidth = 2.4;
          ctx.setLineDash([12, 10]);
          ctx.lineDashOffset = -((now * 0.085) % 22);
          ctx.beginPath();
          ctx.moveTo(player.x + ux * (orbitR + 14), player.y + uy * (orbitR + 14));
          ctx.lineTo(player.x + ux * lineEndDist, player.y + uy * lineEndDist);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          // 2) 角色身畔高对比金色双翼罗盘锋矢
          drawVfxGlow(ctx, 'glowGold', ax, ay, 24, 0.52);
          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(angR);
          ctx.fillStyle = '#ffd166';
          ctx.strokeStyle = '#1b1429';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(15, 0);
          ctx.lineTo(-8, -9.5);
          ctx.lineTo(-3, 0);
          ctx.lineTo(-8, 9.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fffbeb';
          ctx.beginPath();
          ctx.moveTo(11, 0); ctx.lineTo(-2, -3.5); ctx.lineTo(-2, 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          // 3) 箭头旁距离微铭牌
          const stepsM = Math.max(1, Math.round((distR - relR) / 28));
          const tagY = ay + (uy > 0.25 ? 20 : -16);
          ctx.save();
          ctx.font = '800 11.5px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const tagTxt = `⛩️召唤Boss ${stepsM}m`;
          const tagW = Math.max(78, ctx.measureText(tagTxt).width + 12);
          ctx.fillStyle = 'rgba(15, 11, 26, 0.78)';
          ctx.strokeStyle = 'rgba(255, 209, 102, 0.85)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.roundRect(ax - tagW * 0.5, tagY - 9, tagW, 18, 9); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fde68a';
          ctx.fillText(tagTxt, ax, tagY + 0.5);
          ctx.restore();
        }
      }
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
      const bPad = b.isChaosMeteor ? 320 : 0;
      if (b.x + bPad < vL || b.x - bPad > vR || b.y + bPad < vT || b.y - bPad > vB) continue;
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
        if (b.isChaosMeteor) {
          // ☄️ 赤烬魂灯杖 · Dota2 卡尔式【混沌陨石 (Chaos Meteor)】：九霄斜坠轰击 -> 3D 龟裂熔岩巨石向前翻滚碾压！
          const isPurg = !!b.purgatoryMeteor;
          const boulderSp = (typeof vfxSprites !== 'undefined' && vfxSprites)
            ? (isPurg ? vfxSprites.chaosMeteorPurgatory : vfxSprites.chaosMeteorSolar)
            : null;
          if (!b._landed) {
            const fallRatio = Math.max(0, Math.min(1, (b.meteorFallT || 0) / Math.max(0.05, b.meteorFallMax || 0.28)));
            const impP = 1 - fallRatio;
            const impR = b.impactR || 72;
            // 1) 地面落点：卡尔火球日冕星盘 + 迫近阴影 + 翻滚推进方向三连锋矢
            drawVfxGlow(ctx, isPurg ? 'glowCyan' : 'glowOrange', b.x, b.y, impR * (0.68 + impP * 0.48), 0.36 + impP * 0.42);
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.fillStyle = `rgba(8, 6, 14, ${0.18 + impP * 0.42})`;
            ctx.beginPath();
            ctx.ellipse(0, 4, br * (0.55 + impP * 0.68), br * (0.34 + impP * 0.42), 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.rotate(now * 0.0042);
            ctx.strokeStyle = isPurg ? '#5eead4' : '#ffd166';
            ctx.lineWidth = 2.2;
            ctx.globalAlpha = 0.55 + impP * 0.40;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            ctx.arc(0, 0, impR * (1.12 - impP * 0.24), 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            ctx.rotate(b.angle || 0);
            ctx.strokeStyle = isPurg ? '#2dd4bf' : '#ff9f1c';
            ctx.lineWidth = 2.4;
            ctx.globalAlpha = 0.52 + impP * 0.36;
            for (let ck = 0; ck < 3; ck++) {
              const cx = impR * 0.42 + ck * 26;
              ctx.beginPath();
              ctx.moveTo(cx - 8, -9); ctx.lineTo(cx + 2, 0); ctx.lineTo(cx - 8, 9);
              ctx.stroke();
            }
            ctx.restore();

            // 2) 高空斜坠陨石本体 + 三层大气层等离子燃烧长尾
            const alt = fallRatio * 265;
            const sx = b.x - Math.cos(b.angle || 0) * (alt * 0.48);
            const sy = b.y - alt - Math.sin(b.angle || 0) * (alt * 0.20);
            const fallAng = Math.atan2(b.y - sy, b.x - sx);
            drawVfxGlow(ctx, isPurg ? 'glowCyan' : 'glowOrange', sx, sy, br * 2.85, 0.88);
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(fallAng);
            const tailL = br * 5.2;
            const flk = Math.sin(now * 0.045 + i) * 5;
            ctx.fillStyle = isPurg ? 'rgba(13, 148, 136, 0.72)' : 'rgba(220, 38, 38, 0.76)';
            ctx.beginPath();
            ctx.moveTo(br * 0.2, -br * 1.05);
            ctx.quadraticCurveTo(-tailL * 0.48, -br * 0.72 + flk * 0.4, -tailL, flk);
            ctx.quadraticCurveTo(-tailL * 0.48, br * 0.72 + flk * 0.4, br * 0.2, br * 1.05);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = isPurg ? '#5eead4' : '#ff9f1c';
            ctx.beginPath();
            ctx.moveTo(br * 0.35, -br * 0.72);
            ctx.quadraticCurveTo(-tailL * 0.32, -br * 0.38, -tailL * 0.68, flk * 0.55);
            ctx.quadraticCurveTo(-tailL * 0.32, br * 0.38, br * 0.35, br * 0.72);
            ctx.closePath();
            ctx.fill();

            ctx.save();
            ctx.rotate(b.rollRot || 0);
            if (boulderSp) {
              const bSz = br * 2.35;
              ctx.drawImage(boulderSp, -bSz * 0.5, -bSz * 0.5, bSz, bSz);
            } else {
              ctx.fillStyle = '#fb5607';
              ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            ctx.restore();
          } else {
            // 已着陆翻滚阶段：沉重贴地阴影 + 烈焰尾流 + 高速自转龟裂黑曜熔岩巨石 + 前缘犁地熔火激波弧！
            const remP = Math.max(0.15, Math.min(1, (b.life || 0) / 0.22));
            drawVfxGlow(ctx, isPurg ? 'glowCyan' : 'glowOrange', b.x, b.y, br * 2.95, 0.88 * remP);
            drawVfxGlow(ctx, isPurg ? 'glowGreen' : 'glowRed', b.x, b.y, br * 1.95, 0.58 * remP);

            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.globalAlpha = remP;
            // 巨石贴地碾压重影
            ctx.fillStyle = 'rgba(7, 5, 12, 0.54)';
            ctx.beginPath();
            ctx.ellipse(0, br * 0.52, br * 1.16, br * 0.54, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.rotate(b.angle || 0);
            // 巨石后方翻腾拖曳的烈焰尾羽
            const wFlick = Math.sin(now * 0.038 + i * 1.7) * 5.5;
            ctx.fillStyle = isPurg ? 'rgba(15, 118, 110, 0.78)' : 'rgba(185, 28, 28, 0.80)';
            ctx.beginPath();
            ctx.moveTo(br * 0.15, -br * 1.02);
            ctx.quadraticCurveTo(-br * 1.65, -br * 0.78 + wFlick * 0.35, -br * 3.1, wFlick);
            ctx.quadraticCurveTo(-br * 1.65, br * 0.78 + wFlick * 0.35, br * 0.15, br * 1.02);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = isPurg ? '#2dd4bf' : '#ff9f1c';
            ctx.beginPath();
            ctx.moveTo(br * 0.25, -br * 0.72);
            ctx.quadraticCurveTo(-br * 1.15, -br * 0.42, -br * 2.15, wFlick * 0.5);
            ctx.quadraticCurveTo(-br * 1.15, br * 0.42, br * 0.25, br * 0.72);
            ctx.closePath();
            ctx.fill();

            // 沉重颠簸自转的 3D 龟裂熔岩巨石本体
            const bounceSq = 1 + 0.045 * Math.sin(now * 0.042 + i);
            ctx.save();
            ctx.scale(bounceSq, 2 - bounceSq);
            ctx.rotate(b.rollRot || 0);
            if (boulderSp) {
              const bSz = br * 2.48;
              ctx.drawImage(boulderSp, -bSz * 0.5, -bSz * 0.5, bSz, bSz);
            } else {
              ctx.fillStyle = '#fb5607';
              ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();

            // 巨石正前方破阵推挤的炽白熔火犁浪新月弧
            ctx.strokeStyle = isPurg ? '#ccfbf1' : '#fff3b0';
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.arc(br * 0.28, 0, br * 1.05, -0.88, 0.88);
            ctx.stroke();
            ctx.strokeStyle = isPurg ? '#2dd4bf' : '#ff6b35';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(br * 0.44, 0, br * 1.15, -0.68, 0.68);
            ctx.stroke();

            ctx.restore();
          }
        } else {
          // 兼容常规陨炎火球弹体渲染
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
        }
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

  drawBattleScreenOverlays(now, sx, sy);
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
