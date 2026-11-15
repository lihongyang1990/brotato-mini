// 伪随机种子与《烬塔残响》四大层域高清战场底图预烘焙引擎（彻底移除旧土豆贴图与工业铆钉墙）
function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSceneForWave(wNum) {
  if (selectedScene !== 'random') {
    curScene = SCENES.find(s => s.id === selectedScene) || SCENES[0];
  } else {
    // 严格按《烬塔残响》四幕十六层爬塔叙事递进：1~4层雨夜长桥，5~8层永冻冰窟，9~12层倒悬钟楼，13~16层日蚀镜界
    if (wNum <= 4) curScene = SCENES.find(s => s.id === 'foundry') || SCENES[0];
    else if (wNum <= 8) curScene = SCENES.find(s => s.id === 'glacier') || SCENES[1];
    else if (wNum <= 12) curScene = SCENES.find(s => s.id === 'wasteland') || SCENES[2];
    else if (wNum <= 16) curScene = SCENES.find(s => s.id === 'desert') || SCENES[3];
    else {
      const idx = Math.floor((wNum - 17) / 2) % SCENES.length;
      curScene = SCENES[idx] || SCENES[0];
    }
  }
  sceneSeed = (wNum * 7919 + curScene.id.charCodeAt(0) * 313 + (Date.now() & 0xffff)) >>> 0;
}

const floorCanvas = document.createElement('canvas');
const vigNormal = document.createElement('canvas');
const vigLowHp = document.createElement('canvas');
const soulFogMaps = {};
const vfxSprites = {};
if (typeof globalThis !== 'undefined') globalThis.vfxSprites = vfxSprites;

function drawVfxGlow(ctx, key, x, y, r, alpha = 1) {
  const sp = vfxSprites[key];
  if (!sp || !ctx || r <= 0 || alpha <= 0.005) return;
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * Math.min(1, alpha);
  ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prevA;
}
if (typeof globalThis !== 'undefined') globalThis.drawVfxGlow = drawVfxGlow;

const SOUL_FOG_PALETTE = {
  foundry: [5, 8, 15],
  glacier: [5, 11, 20],
  wasteland: [8, 6, 14],
  desert: [7, 5, 12]
};

function buildVignettes() {
  [ [vigNormal, 'rgba(6, 9, 16, 0.46)'], [vigLowHp, 'rgba(159, 18, 57, 0.44)'] ].forEach(([c, edge]) => {
    c.width = 256; c.height = 256;
    const vg = c.getContext('2d');
    const gr = vg.createRadialGradient(128, 128, 62, 128, 128, 182);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, edge);
    vg.fillStyle = gr;
    vg.fillRect(0, 0, 256, 256);
  });

  // 预烘焙【法术区域 / 首领奥术预警 / 黑洞视界奇点】离屏发光贴图（战斗渲染 0 createRadialGradient / 0 shadowBlur）
  const glowSpecs = {
    sanctuaryGlow: ['rgba(255, 244, 184, 0.88)', 'rgba(245, 158, 11, 0.36)', 'rgba(245, 158, 11, 0)'],
    glowRed:       ['rgba(255, 112, 138, 0.84)', 'rgba(225, 29, 72, 0.34)',  'rgba(159, 18, 57, 0)'],
    glowOrange:    ['rgba(255, 232, 148, 0.90)', 'rgba(251, 86, 7, 0.40)',   'rgba(194, 65, 12, 0)'],
    glowGold:      ['rgba(254, 249, 195, 0.88)', 'rgba(234, 179, 8, 0.36)',  'rgba(161, 98, 7, 0)'],
    glowCyan:      ['rgba(224, 247, 255, 0.88)', 'rgba(14, 165, 233, 0.38)', 'rgba(3, 105, 161, 0)'],
    glowViolet:    ['rgba(243, 232, 255, 0.86)', 'rgba(147, 51, 234, 0.40)', 'rgba(88, 28, 135, 0)'],
    glowGreen:     ['rgba(209, 250, 229, 0.82)', 'rgba(16, 185, 129, 0.36)', 'rgba(6, 95, 70, 0)']
  };
  Object.keys(glowSpecs).forEach(k => {
    const gc = document.createElement('canvas');
    gc.width = 128; gc.height = 128;
    const gg = gc.getContext('2d');
    if (gg) {
      const [c0, c1, c2] = glowSpecs[k];
      const gr = gg.createRadialGradient(64, 64, 4, 64, 64, 62);
      gr.addColorStop(0, c0);
      gr.addColorStop(0.45, c1);
      gr.addColorStop(1, c2);
      gg.fillStyle = gr;
      gg.fillRect(0, 0, 128, 128);
    }
    vfxSprites[k] = gc;
  });

  // 预烘焙【黑日引力奇点 · 事件视界核心与相对论吸积盘】256×256 高精离屏贴图
  const bh = document.createElement('canvas');
  bh.width = 256; bh.height = 256;
  const bg = bh.getContext('2d');
  if (bg) {
    const outer = bg.createRadialGradient(128, 128, 30, 128, 128, 126);
    outer.addColorStop(0, 'rgba(2, 0, 8, 1)');
    outer.addColorStop(0.28, 'rgba(4, 1, 14, 0.99)');
    outer.addColorStop(0.35, 'rgba(255, 243, 176, 0.96)');
    outer.addColorStop(0.43, 'rgba(255, 159, 28, 0.84)');
    outer.addColorStop(0.55, 'rgba(199, 125, 255, 0.62)');
    outer.addColorStop(0.74, 'rgba(114, 9, 183, 0.32)');
    outer.addColorStop(1, 'rgba(18, 4, 36, 0)');
    bg.fillStyle = outer;
    bg.fillRect(0, 0, 256, 256);
    // 纯黑事件视界深渊核
    bg.fillStyle = '#020008';
    bg.beginPath();
    bg.arc(128, 128, 41, 0, Math.PI * 2);
    bg.fill();
    // 视界临界光子金环
    bg.strokeStyle = 'rgba(255, 248, 214, 0.95)';
    bg.lineWidth = 2.6;
    bg.beginPath();
    bg.arc(128, 128, 42.5, 0, Math.PI * 2);
    bg.stroke();
  }
  vfxSprites.blackHoleCore = bh;

  // 预烘焙【首领剧毒龙息 · 多瓣立体毒雾云团贴图】128×128（消除扁平圆球与单调波浪线，战斗帧 0 实时渐变）
  const vcp = document.createElement('canvas');
  vcp.width = 128; vcp.height = 128;
  const vcg = vcp.getContext('2d');
  if (vcg) {
    const lobes = [
      [60, 66, 56, 'rgba(6, 95, 70, 0.52)', 'rgba(88, 28, 135, 0.22)', 'rgba(6, 78, 59, 0)'],
      [52, 56, 44, 'rgba(16, 185, 129, 0.62)', 'rgba(5, 150, 105, 0.28)', 'rgba(5, 150, 105, 0)'],
      [74, 68, 42, 'rgba(101, 163, 13, 0.64)', 'rgba(16, 185, 129, 0.26)', 'rgba(16, 185, 129, 0)'],
      [66, 58, 34, 'rgba(217, 249, 157, 0.85)', 'rgba(163, 230, 53, 0.48)', 'rgba(132, 204, 22, 0)']
    ];
    for (let li = 0; li < lobes.length; li++) {
      const [lx, ly, lr, c0, c1, c2] = lobes[li];
      const lg = vcg.createRadialGradient(lx, ly, 2, lx, ly, lr);
      lg.addColorStop(0, c0);
      lg.addColorStop(0.48, c1);
      lg.addColorStop(1, c2);
      vcg.fillStyle = lg;
      vcg.beginPath();
      vcg.arc(lx, ly, lr, 0, Math.PI * 2);
      vcg.fill();
    }
  }
  vfxSprites.venomCloudPuff = vcp;

  // 预烘焙【首领剧毒龙息 · 高压雾化羽化锥幕贴图】256×224（柔边流体扇幕，告别生硬三角扇片）
  const vjc = document.createElement('canvas');
  vjc.width = 256; vjc.height = 224;
  const vjg = vjc.getContext('2d');
  if (vjg) {
    vjg.save();
    vjg.beginPath();
    vjg.moveTo(10, 100);
    vjg.quadraticCurveTo(118, 46, 248, 12);
    vjg.arc(10, 112, 240, -0.425, 0.425);
    vjg.quadraticCurveTo(118, 178, 10, 124);
    vjg.closePath();
    vjg.clip();

    const axial = vjg.createLinearGradient(10, 112, 250, 112);
    axial.addColorStop(0, 'rgba(247, 254, 231, 0.95)');
    axial.addColorStop(0.18, 'rgba(190, 242, 100, 0.86)');
    axial.addColorStop(0.48, 'rgba(132, 204, 22, 0.64)');
    axial.addColorStop(0.78, 'rgba(16, 185, 129, 0.36)');
    axial.addColorStop(1, 'rgba(6, 78, 59, 0)');
    vjg.fillStyle = axial;
    vjg.fillRect(0, 0, 256, 224);

    // 侧翼柔化渐隐遮罩，消除扇形硬边
    vjg.globalCompositeOperation = 'destination-in';
    const lat = vjg.createLinearGradient(0, 8, 0, 216);
    lat.addColorStop(0, 'rgba(0, 0, 0, 0)');
    lat.addColorStop(0.18, 'rgba(0, 0, 0, 0.72)');
    lat.addColorStop(0.5, 'rgba(0, 0, 0, 1)');
    lat.addColorStop(0.82, 'rgba(0, 0, 0, 0.72)');
    lat.addColorStop(1, 'rgba(0, 0, 0, 0)');
    vjg.fillStyle = lat;
    vjg.fillRect(0, 0, 256, 224);
    vjg.restore();
  }
  vfxSprites.venomJetCone = vjc;

  // 预烘焙【赤烬魂灯杖 · 混沌陨石 3D 龟裂黑曜熔岩巨石贴图】128×128（还原 Dota2 卡尔陨石翻滚质感，战斗帧 0 实时渐变）
  [
    ['chaosMeteorSolar', '#1c1016', '#33181e', '#b91c1c', '#ff5400', '#ffbe0b', '#fffbeb'],
    ['chaosMeteorPurgatory', '#0a1821', '#132a38', '#0f766e', '#14b8a6', '#72efdd', '#ecfeff']
  ].forEach(([key, rockDark, rockMid, lavaDeep, lavaMid, lavaHot, lavaCore]) => {
    const mc = document.createElement('canvas');
    mc.width = 128; mc.height = 128;
    const mg = mc.getContext('2d');
    if (mg) {
      // 外圈炽热火冕光晕
      const aura = mg.createRadialGradient(64, 64, 34, 64, 64, 63);
      aura.addColorStop(0, lavaMid);
      aura.addColorStop(0.55, key === 'chaosMeteorPurgatory' ? 'rgba(20, 184, 166, 0.34)' : 'rgba(255, 84, 0, 0.36)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mg.fillStyle = aura;
      mg.fillRect(0, 0, 128, 128);

      // 不规则多棱火山陨铁岩体轮廓
      const rPts = [49, 45, 51, 47, 44, 50, 46, 51, 45, 48, 50, 44, 49, 46];
      mg.save();
      mg.translate(64, 64);
      mg.beginPath();
      for (let k = 0; k < rPts.length; k++) {
        const a = (k / rPts.length) * Math.PI * 2;
        const rr = rPts[k];
        if (k === 0) mg.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else mg.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      mg.closePath();
      mg.clip();

      // 陨石内部熔融岩浆球体底色
      const coreGr = mg.createRadialGradient(-8, -8, 6, 0, 0, 52);
      coreGr.addColorStop(0, lavaCore);
      coreGr.addColorStop(0.32, lavaHot);
      coreGr.addColorStop(0.68, lavaMid);
      coreGr.addColorStop(1, lavaDeep);
      mg.fillStyle = coreGr;
      mg.fillRect(-60, -60, 120, 120);

      // 7 块厚重黑曜焦岩板块（板块缝隙间透出滚烫熔岩裂谷！）
      const plates = [
        [[-42, -16], [-12, -46], [8, -28], [-10, -6], [-38, -2]],
        [[14, -44], [44, -20], [36, 4], [12, -2], [6, -24]],
        [[-46, 8], [-14, 2], [-4, 24], [-26, 44], [-46, 28]],
        [[8, 6], [42, 10], [44, 34], [16, 46], [2, 26]],
        [[-16, -24], [6, -18], [10, 0], [-8, 6], [-20, -8]],
        [[-30, -38], [-8, -48], [6, -36], [-14, -26]],
        [[-12, 30], [10, 28], [14, 48], [-16, 48]]
      ];
      mg.fillStyle = rockDark;
      mg.strokeStyle = rockMid;
      mg.lineWidth = 2.2;
      for (let pi = 0; pi < plates.length; pi++) {
        const pl = plates[pi];
        mg.beginPath();
        for (let vi = 0; vi < pl.length; vi++) {
          if (vi === 0) mg.moveTo(pl[vi][0], pl[vi][1]);
          else mg.lineTo(pl[vi][0], pl[vi][1]);
        }
        mg.closePath();
        mg.fill();
        mg.stroke();
      }

      // 炽白熔岩裂隙高光核点
      mg.strokeStyle = lavaCore;
      mg.lineWidth = 2.0;
      mg.beginPath();
      mg.moveTo(-32, -3); mg.lineTo(-6, -3); mg.lineTo(10, -24);
      mg.moveTo(-6, -3); mg.lineTo(4, 22); mg.lineTo(28, 8);
      mg.moveTo(-22, 18); mg.lineTo(4, 22);
      mg.stroke();
      mg.restore();
    }
    vfxSprites[key] = mc;
  });

  // 预烘焙【蚀界生存试炼 · 沉浸浓雾提灯遮罩】（离屏一次性生成，战斗帧 0 createRadialGradient / 0 shadowBlur，外圈 100% 纯黑不透怪）
  Object.keys(SOUL_FOG_PALETTE).forEach(scId => {
    const [mr, mg, mb] = SOUL_FOG_PALETTE[scId];
    const fc = document.createElement('canvas');
    fc.width = 512; fc.height = 512;
    const fg = fc.getContext('2d');
    if (fg) {
      fg.fillStyle = `rgb(${mr}, ${mg}, ${mb})`;
      fg.fillRect(0, 0, 512, 512);
      fg.globalCompositeOperation = 'destination-out';
      const cut = fg.createRadialGradient(256, 256, 138, 256, 256, 212);
      cut.addColorStop(0, 'rgba(0, 0, 0, 1)');
      cut.addColorStop(0.24, 'rgba(0, 0, 0, 0.82)');
      cut.addColorStop(0.52, 'rgba(0, 0, 0, 0.42)');
      cut.addColorStop(0.78, 'rgba(0, 0, 0, 0.10)');
      cut.addColorStop(1, 'rgba(0, 0, 0, 0)');
      fg.fillStyle = cut;
      fg.fillRect(0, 0, 512, 512);
      fg.globalCompositeOperation = 'source-over';
      // 边缘叠烘焙一层团簇暗雾肌理，与实时流雾气旋融为一体
      for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2 + (i % 3) * 0.19;
        const dist = 176 + (i % 4) * 8;
        const px = 256 + Math.cos(ang) * dist;
        const py = 256 + Math.sin(ang) * dist;
        const pr = 30 + (i % 3) * 9;
        const pGr = fg.createRadialGradient(px, py, 2, px, py, pr);
        pGr.addColorStop(0, `rgba(${mr}, ${mg}, ${mb}, 0.36)`);
        pGr.addColorStop(0.65, `rgba(${mr}, ${mg}, ${mb}, 0.16)`);
        pGr.addColorStop(1, `rgba(${mr}, ${mg}, ${mb}, 0)`);
        fg.fillStyle = pGr;
        fg.beginPath();
        fg.arc(px, py, pr, 0, Math.PI * 2);
        fg.fill();
      }
    }
    soulFogMaps[scId] = fc;
  });
}
buildVignettes();

// 超清层域石板地坪烘焙引擎：采样原画中段色彩光影基底，并叠加 2.0x+ Retina 矢量精雕错缝石砖、倒角灰缝、裂纹与生态镶嵌（拉满视野依然纤毫毕现）
const SCENE_MASONRY_STYLE = {
  foundry: {
    baseDark: '#121824', baseMid: '#182131', mortar: 'rgba(5, 8, 15, 0.86)',
    bevelHi: 'rgba(148, 197, 224, 0.20)', bevelLo: 'rgba(4, 7, 13, 0.55)',
    slabTintA: 'rgba(56, 86, 114, 0.14)', slabTintB: 'rgba(18, 27, 42, 0.20)',
    crack: 'rgba(7, 11, 19, 0.68)', crackHi: 'rgba(137, 196, 212, 0.16)',
    inlay: 'rgba(72, 187, 150, 0.24)', sheen: 'rgba(114, 239, 221, 0.08)'
  },
  glacier: {
    baseDark: '#101d2d', baseMid: '#16293f', mortar: 'rgba(6, 13, 24, 0.84)',
    bevelHi: 'rgba(186, 238, 255, 0.26)', bevelLo: 'rgba(5, 12, 24, 0.52)',
    slabTintA: 'rgba(72, 202, 228, 0.13)', slabTintB: 'rgba(20, 42, 68, 0.22)',
    crack: 'rgba(8, 20, 36, 0.66)', crackHi: 'rgba(190, 244, 255, 0.24)',
    inlay: 'rgba(142, 236, 245, 0.28)', sheen: 'rgba(186, 230, 253, 0.10)'
  },
  wasteland: {
    baseDark: '#171321', baseMid: '#211b30', mortar: 'rgba(8, 6, 14, 0.88)',
    bevelHi: 'rgba(238, 198, 122, 0.22)', bevelLo: 'rgba(6, 4, 11, 0.58)',
    slabTintA: 'rgba(180, 130, 70, 0.12)', slabTintB: 'rgba(28, 20, 42, 0.22)',
    crack: 'rgba(9, 6, 16, 0.70)', crackHi: 'rgba(223, 192, 132, 0.20)',
    inlay: 'rgba(223, 192, 132, 0.28)', sheen: 'rgba(199, 125, 255, 0.08)'
  },
  desert: {
    baseDark: '#14111b', baseMid: '#1d1828', mortar: 'rgba(6, 5, 11, 0.90)',
    bevelHi: 'rgba(242, 213, 152, 0.24)', bevelLo: 'rgba(4, 3, 9, 0.62)',
    slabTintA: 'rgba(212, 163, 92, 0.11)', slabTintB: 'rgba(22, 16, 32, 0.24)',
    crack: 'rgba(7, 5, 13, 0.72)', crackHi: 'rgba(246, 211, 121, 0.22)',
    inlay: 'rgba(246, 211, 121, 0.30)', sheen: 'rgba(255, 159, 28, 0.07)'
  }
};

function drawCrispArenaArt(g, bgArt, ox, oy, w, h, sceneId, rnd) {
  const pal = SCENE_MASONRY_STYLE[sceneId] || SCENE_MASONRY_STYLE.foundry;

  g.save();
  // 1. 深邃石质底色 + 原画核心石板区氛围光影（剔除原画上下边缘低清拉伸栏杆带，改由矢量精雕石砖与实时栏杆完整接管）
  g.fillStyle = pal.baseDark;
  g.fillRect(ox, oy, w, h);

  if (bgArt) {
    const sw = bgArt.naturalWidth || bgArt.width || 1376;
    const sh = bgArt.naturalHeight || bgArt.height || 768;
    const cropX = Math.round(sw * 0.08);
    const cropY = Math.round(sh * 0.24);
    const cropW = Math.max(64, sw - cropX * 2);
    const cropH = Math.max(64, sh - cropY * 2);
    g.globalAlpha = 0.42;
    g.drawImage(bgArt, cropX, cropY, cropW, cropH, ox, oy, w, h);
    g.globalAlpha = 1;
  }

  // 2. 高精度矢量错缝石板矩阵（每块石板独立色阶微差 + 1px 锐利倒角高光/暗槽 + 手工凿刻石纹裂隙）
  const tileW = 96, tileH = 64;
  const rows = Math.ceil(h / tileH);
  g.beginPath();
  g.rect(ox, oy, w, h);
  g.clip();

  for (let r = 0; r < rows; r++) {
    const ty = oy + r * tileH;
    const th = Math.min(tileH, oy + h - ty);
    const rowShift = (r % 2 === 1) ? -48 : 0;
    for (let tx = ox + rowShift; tx < ox + w; tx += tileW) {
      const x0 = Math.max(ox, tx);
      const x1 = Math.min(ox + w, tx + tileW);
      const cw = x1 - x0;
      if (cw <= 2 || th <= 2) continue;
      const roll = rnd();
      // 石板岩面明暗微差
      g.fillStyle = roll < 0.45 ? pal.slabTintA : (roll < 0.82 ? pal.slabTintB : pal.sheen);
      g.fillRect(x0 + 1, ty + 1, cw - 2, th - 2);

      // 顶/左 凿石受光倒角（适度加宽避免镜头移动产生亚像素闪烁摩尔纹）
      g.strokeStyle = pal.bevelHi;
      g.lineWidth = 1.35;
      g.beginPath();
      g.moveTo(x0 + 1.8, ty + th - 1.8);
      g.lineTo(x0 + 1.8, ty + 1.8);
      g.lineTo(x0 + cw - 1.8, ty + 1.8);
      g.stroke();

      // 底/右 背光石棱
      g.strokeStyle = pal.bevelLo;
      g.beginPath();
      g.moveTo(x0 + 1.8, ty + th - 1.6);
      g.lineTo(x0 + cw - 1.6, ty + th - 1.6);
      g.lineTo(x0 + cw - 1.6, ty + 1.8);
      g.stroke();

      // 随机天然石板折线裂纹与生态细节（青苔/冰脉/发条铆钉/金缮星纹）
      if (roll > 0.72 && cw > 44 && th > 36) {
        const cx = x0 + cw * (0.28 + rnd() * 0.44);
        const cy = ty + th * (0.26 + rnd() * 0.46);
        const a1 = rnd() * Math.PI * 2;
        const l1 = 10 + rnd() * 14;
        const mx = cx + Math.cos(a1) * l1 * 0.55;
        const my = cy + Math.sin(a1) * l1 * 0.55;
        const ex = mx + Math.cos(a1 + (rnd() - 0.5) * 0.9) * l1 * 0.55;
        const ey = my + Math.sin(a1 + (rnd() - 0.5) * 0.9) * l1 * 0.55;
        g.strokeStyle = pal.crack;
        g.lineWidth = 1.15;
        g.beginPath();
        g.moveTo(cx, cy); g.lineTo(mx, my); g.lineTo(ex, ey);
        g.stroke();
        g.strokeStyle = pal.crackHi;
        g.lineWidth = 0.75;
        g.beginPath();
        g.moveTo(cx + 0.8, cy - 0.8); g.lineTo(mx + 0.8, my - 0.8);
        g.stroke();
      } else if (roll < 0.18 && cw > 50 && th > 36) {
        if (sceneId === 'foundry') {
          // 雨夜石缝青苔簇与湿润反光斑
          g.fillStyle = pal.inlay;
          g.beginPath();
          g.arc(x0 + 6, ty + th - 5, 3.2, 0, Math.PI * 2);
          g.arc(x0 + 10.5, ty + th - 4, 2.2, 0, Math.PI * 2);
          g.fill();
        } else if (sceneId === 'glacier') {
          // 永冻冰窟碎晶星芒纹
          const ix = x0 + cw * 0.5, iy = ty + th * 0.5;
          g.strokeStyle = pal.inlay;
          g.lineWidth = 0.9;
          g.beginPath();
          g.moveTo(ix - 6, iy); g.lineTo(ix + 6, iy);
          g.moveTo(ix, iy - 5); g.lineTo(ix, iy + 5);
          g.stroke();
        } else if (sceneId === 'wasteland') {
          // 倒悬钟楼四角黄铜铆钉与暗槽
          g.fillStyle = pal.inlay;
          g.fillRect(x0 + 4, ty + 4, 2.4, 2.4);
          g.fillRect(x1 - 6.4, ty + 4, 2.4, 2.4);
          g.fillRect(x0 + 4, ty + th - 6.4, 2.4, 2.4);
          g.fillRect(x1 - 6.4, ty + th - 6.4, 2.4, 2.4);
        } else {
          // 日蚀镜界黑曜金丝菱纹
          const ix = x0 + cw * 0.5, iy = ty + th * 0.5;
          g.strokeStyle = pal.inlay;
          g.lineWidth = 0.95;
          g.beginPath();
          g.moveTo(ix, iy - 6); g.lineTo(ix + 8, iy); g.lineTo(ix, iy + 6); g.lineTo(ix - 8, iy);
          g.closePath();
          g.stroke();
        }
      }
    }
    // 整行深色石砖灰缝槽
    g.strokeStyle = pal.mortar;
    g.lineWidth = 2.0;
    g.beginPath();
    g.moveTo(ox, ty); g.lineTo(ox + w, ty);
    g.stroke();
    for (let tx = ox + rowShift; tx <= ox + w; tx += tileW) {
      if (tx <= ox || tx >= ox + w) continue;
      g.beginPath();
      g.moveTo(tx, ty); g.lineTo(tx, ty + th);
      g.stroke();
    }
  }

  // 3. 内圈哥特回廊排水石渠镶边线（与四面实时精雕石栏杆严丝合缝衔接）
  const gutterPad = 36;
  g.strokeStyle = pal.mortar;
  g.lineWidth = 2.4;
  g.strokeRect(ox + gutterPad, oy + gutterPad, w - gutterPad * 2, h - gutterPad * 2);
  g.strokeStyle = pal.inlay;
  g.lineWidth = 1.4;
  g.strokeRect(ox + gutterPad + 4, oy + gutterPad + 4, w - (gutterPad + 4) * 2, h - (gutterPad + 4) * 2);

  g.restore();
}

// 严格将离屏地坪长宽限制在 <=3840px（低于浏览器 4096px GPU 硬件纹理上限，杜绝显卡纹理回退导致的整屏闪烁）
function computeFloorBakeScale(worldW, worldH, mobilePerf, deviceDpr) {
  const pad = FLOOR_PAD;
  const maxSpan = Math.max(1, (worldW || 2200) + pad * 2, (worldH || 1500) + pad * 2);
  const maxTexDim = mobilePerf ? 2560 : 3840;
  const capScale = Math.floor((maxTexDim / maxSpan) * 100) / 100;
  const rawScale = mobilePerf
    ? Math.min(1.40, Math.max(1.15, (deviceDpr || 1) * 0.90))
    : Math.min(1.80, Math.max(1.64, deviceDpr || 1));
  return Math.max(0.85, Math.min(capScale, Math.round(rawScale * 100) / 100));
}

function buildFloorTexture() {
  const sc = curScene || SCENES[0];
  const pad = FLOOR_PAD;
  const mobilePerf = (typeof uiMode !== 'undefined' && uiMode !== 'desktop');
  curFloorScale = mobilePerf ? 0.90 : 1.0;
  floorBakeScale = computeFloorBakeScale(WORLD.w, WORLD.h, mobilePerf, typeof dpr === 'number' ? dpr : 1);

  const fullW = WORLD.w + pad * 2, fullH = WORLD.h + pad * 2;
  const targetCW = Math.round(fullW * floorBakeScale);
  const targetCH = Math.round(fullH * floorBakeScale);
  if (floorCanvas.width !== targetCW) floorCanvas.width = targetCW;
  if (floorCanvas.height !== targetCH) floorCanvas.height = targetCH;

  // 与 viewport.js 中 wantKey 100% 严格对齐，彻底根除每次校验反复分配大画布重绘的性能陷阱
  bakedSceneKey = `${WORLD.w}x${WORLD.h}_${floorBakeScale}_${sc.id}_${sceneSeed}`;

  const bgArt = (typeof getSpireArenaBgImage === 'function') ? getSpireArenaBgImage(sc.id) : null;
  const g = floorCanvas.getContext('2d', { alpha: false });
  g.setTransform(floorBakeScale, 0, 0, floorBakeScale, 0, 0);
  g.imageSmoothingEnabled = true;
  try { g.imageSmoothingQuality = 'high'; } catch (_) {}
  const rnd = mulberry32(sceneSeed);

  g.fillStyle = sc.voidBg;
  g.fillRect(0, 0, fullW, fullH);

  const ox = pad, oy = pad;
  drawCrispArenaArt(g, bgArt, ox, oy, WORLD.w, WORLD.h, sc.id, rnd);

  // 外侧精致黑曜细金收边线与四角星芒铆扣（严格位于石栏外侧，绝不遮挡手绘护栏细节）
  g.strokeStyle = 'rgba(4, 6, 12, 0.82)';
  g.lineWidth = 6;
  g.strokeRect(ox - 9, oy - 9, WORLD.w + 18, WORLD.h + 18);

  g.strokeStyle = sc.rivetCol;
  g.globalAlpha = 0.72;
  g.lineWidth = 1.6;
  g.strokeRect(ox - 5, oy - 5, WORLD.w + 10, WORLD.h + 10);
  g.strokeRect(ox - 13, oy - 13, WORLD.w + 26, WORLD.h + 26);
  g.globalAlpha = 1;

  const corners = [
    [ox - 5, oy - 5],
    [ox + WORLD.w + 5, oy - 5],
    [ox - 5, oy + WORLD.h + 5],
    [ox + WORLD.w + 5, oy + WORLD.h + 5]
  ];
  g.fillStyle = sc.rivetCol;
  g.strokeStyle = '#070a12';
  g.lineWidth = 1.4;
  for (let i = 0; i < corners.length; i++) {
    const [kx, ky] = corners[i];
    g.beginPath();
    g.moveTo(kx, ky - 9); g.lineTo(kx + 9, ky); g.lineTo(kx, ky + 9); g.lineTo(kx - 9, ky);
    g.closePath();
    g.fill();
    g.stroke();
  }
}
