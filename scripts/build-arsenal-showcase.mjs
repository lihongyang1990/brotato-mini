#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const readSrc = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').trim();

const arsenalCode = readSrc('src/data/arsenal.js');
const relicSpritesCode = readSrc('src/render/relic_sprites.js');
const spritesFull = readSrc('src/render/sprites.js');
const drawWeaponIdx = spritesFull.indexOf('function drawWeaponSprite(');
const weaponSpritesCode = drawWeaponIdx !== -1 ? spritesFull.slice(0, drawWeaponIdx).trim() : spritesFull;
const baseCss = readSrc('styles/base.css');
const svgRaw = readSrc('assets/icon.svg');
const svgDataUri = `data:image/svg+xml,${encodeURIComponent(svgRaw)}`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>烬塔残响 v2.2.2 · 彩色吃伤标签 & 138遗物重绘贴图 & Brotato式兵装栏独立检视台</title>
  <link rel="icon" type="image/svg+xml" href="${svgDataUri}">
  <style>
${baseCss}

    /* 独立检视台外层布局覆盖（允许自由滚动浏览全部卡片） */
    html, body {
      overflow-y: auto !important;
      overflow-x: hidden !important;
      height: auto !important;
      min-height: 100vh;
      user-select: text !important;
      -webkit-user-select: text !important;
      background: radial-gradient(circle at 50% 0%, #161d31 0%, #080b13 55%) fixed !important;
    }
    .studio-top {
      position: sticky;
      top: 0;
      z-index: 60;
      background: rgba(10, 14, 24, 0.94);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(223, 192, 132, 0.30);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .studio-brand { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .studio-kicker {
      background: linear-gradient(90deg, #dfc084, #f6d379);
      color: #161006;
      font-weight: 900;
      font-size: 11px;
      padding: 3px 9px;
      border-radius: 4px;
      letter-spacing: 0.08em;
    }
    .studio-brand h1 {
      font-family: var(--font-serif);
      font-size: 19px;
      font-weight: 800;
      color: var(--ivory);
      margin: 0;
    }
    .studio-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .studio-tab {
      background: rgba(18, 24, 38, 0.9);
      border: 1px solid rgba(223, 192, 132, 0.26);
      color: #cbd5e1;
      padding: 7px 15px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .studio-tab:hover { border-color: rgba(223, 192, 132, 0.6); color: #fff; }
    .studio-tab.active {
      background: linear-gradient(180deg, rgba(223, 192, 132, 0.24), rgba(223, 192, 132, 0.10));
      border-color: var(--gold-bright);
      color: var(--gold-bright);
      box-shadow: 0 0 16px rgba(223, 192, 132, 0.18);
    }
    .studio-main {
      max-width: 1440px;
      margin: 0 auto;
      padding: 22px 24px 64px;
    }
    .studio-pane { display: none; flex-direction: column; gap: 18px; }
    .studio-pane.active { display: flex; }

    /* 彩色标签图例灯牌栏 */
    .legend-banner {
      background: rgba(13, 18, 30, 0.92);
      border: 1px solid rgba(223, 192, 132, 0.28);
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .legend-row { display: flex; flex-wrap: wrap; gap: 7px 10px; align-items: center; font-size: 12.5px; color: #cbd5e1; }
    .legend-lbl { font-weight: 800; color: var(--gold-bright); margin-right: 4px; }

    /* 实机行商沙盒舞台 */
    .mock-shop-stage {
      background: linear-gradient(180deg, rgba(14, 19, 32, 0.96), rgba(9, 12, 21, 0.98));
      border: 1.5px solid rgba(223, 192, 132, 0.36);
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .mock-shop-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 12px;
    }
    .mock-shop-cards {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    @media (max-width: 1100px) {
      .mock-shop-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .mock-shop-cards { grid-template-columns: 1fr; }
    }
    .mock-slots-wrap {
      background: rgba(7, 10, 18, 0.72);
      border: 1px solid rgba(223, 192, 132, 0.24);
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .mock-slots-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .mock-slots-bar .slot:hover .sell-tip { opacity: 1; }

    /* 筛选工具条与展示网格 */
    .filter-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      align-items: center;
      background: rgba(12, 17, 28, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 9px;
      padding: 11px 14px;
    }
    .filter-chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      border-radius: 5px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.12s;
    }
    .filter-chip:hover { border-color: rgba(223, 192, 132, 0.5); color: #fff; }
    .filter-chip.active {
      background: rgba(223, 192, 132, 0.20);
      border-color: var(--gold-bright);
      color: var(--gold-bright);
    }
    .search-inp {
      margin-left: auto;
      background: rgba(6, 9, 16, 0.9);
      border: 1px solid rgba(223, 192, 132, 0.32);
      color: #f8fafc;
      border-radius: 6px;
      padding: 5px 11px;
      font-size: 12.5px;
      min-width: 210px;
      outline: none;
    }
    .showcase-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 13px;
    }
    .sc-card {
      background: linear-gradient(180deg, rgba(16, 22, 35, 0.96), rgba(10, 14, 24, 0.98));
      border: 1px solid rgba(223, 192, 132, 0.24);
      border-radius: 10px;
      padding: 13px 14px;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .sc-card.t2 { border-color: rgba(137, 196, 212, 0.42); }
    .sc-card.t3 { border-color: rgba(176, 124, 232, 0.48); }
    .sc-card.t4 { border-color: rgba(223, 192, 132, 0.65); }
    .sc-evo-strip {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-top: 2px;
    }
    .sc-evo-box {
      background: rgba(7, 10, 18, 0.72);
      border: 1px solid rgba(255, 92, 138, 0.25);
      border-radius: 7px;
      padding: 7px 8px;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font-size: 11.5px;
      line-height: 1.4;
      color: #cbd5e1;
    }
    .sc-evo-box .item-emblem { width: 38px; height: 38px; flex-shrink: 0; }
    .matrix-tbl {
      width: 100%;
      border-collapse: collapse;
      background: rgba(12, 17, 28, 0.94);
      border: 1px solid rgba(223, 192, 132, 0.28);
      border-radius: 10px;
      overflow: hidden;
      font-size: 13px;
    }
    .matrix-tbl th, .matrix-tbl td {
      padding: 10px 13px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      text-align: left;
    }
    .matrix-tbl th {
      background: rgba(223, 192, 132, 0.12);
      color: var(--gold-bright);
      font-weight: 800;
    }
    .matrix-tbl tr:hover td { background: rgba(255, 255, 255, 0.03); }
    .wpn-action-modal.hidden { display: none !important; }
    .evo-demo-modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(5, 8, 15, 0.82);
      backdrop-filter: blur(6px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding: 20px;
    }
    .evo-demo-modal.hidden { display: none !important; }
  </style>
</head>
<body>
  <header class="studio-top">
    <div class="studio-brand">
      <span class="studio-kicker">OUT-OF-GAME UI & ART STUDIO · v2.2.2</span>
      <h1>烬塔残响 · 彩色吃伤标签 / Brotato式兵装操作 / 138圣遗物贴图检视台</h1>
    </div>
    <nav class="studio-tabs">
      <button type="button" class="studio-tab active" data-pane="shop" onclick="switchPane('shop')">🛒 商店卡片 & Brotato式兵装栏实操</button>
      <button type="button" class="studio-tab" data-pane="weapons" onclick="switchPane('weapons')">⚔️ 全部 42 把兵装标签 & 84 进化贴图</button>
      <button type="button" class="studio-tab" data-pane="relics" onclick="switchPane('relics')">🎒 全部 138 件遗物新贴图 & 配对标签</button>
      <button type="button" class="studio-tab" data-pane="matrix" onclick="switchPane('matrix')">📊 四大类属性作用速查表</button>
    </nav>
  </header>

  <main class="studio-main">
    <!-- 顶部全局彩色标签速懂灯牌 -->
    <section class="legend-banner">
      <div class="legend-row">
        <span class="legend-lbl">◆ 同色标签配对法则（看颜色买装备绝不踩坑）：</span>
        <span class="tag tag-scale ts-ranged">🔫远程 / 🔫远程有效</span>
        <span class="tag tag-scale ts-melee">⚔️近战 / ⚔️近战有效</span>
        <span class="tag tag-scale ts-staff">🪄法杖 / 🪄法杖专属 (不吃远程!)</span>
        <span class="tag tag-scale ts-elem">🔥元素 / 🔥元素加成</span>
        <span class="tag tag-scale ts-tech">⚙️工程 / ⚙️工程·建筑</span>
        <span class="tag tag-scale ts-hp">❤️生命</span>
        <span class="tag tag-scale ts-armor">🛡️护甲</span>
        <span class="tag tag-scale ts-blast">💥爆破</span>
        <span class="tag tag-scale ts-spd">💨移速</span>
        <span class="tag tag-scale ts-leech">🩸汲血</span>
        <span class="tag tag-scale ts-aspd">⚡攻速</span>
        <span class="tag tag-scale ts-range">📏范围</span>
        <span class="tag tag-scale ts-all">✦全系通用</span>
      </div>
      <div class="legend-row" style="font-size:12px;color:#94a3b8">
        💡 例：【碎冕寒冰棱】标有 <span class="tag tag-scale ts-ranged">🔫远程</span> <span class="tag tag-scale ts-elem">🔥元素</span> ➔ 同时吃远程与元素双加成；【赤烬魂灯杖】标有 <span class="tag tag-scale ts-staff">🪄法杖</span> <span class="tag tag-scale ts-elem">🔥元素</span>（无🔫远程标）➔ 吃元素与全伤，不吃远程加成！
      </div>
    </section>

    <!-- PANE 1: 实机商店卡片 + Brotato 式兵装槽点击操作演示 -->
    <section id="pane-shop" class="studio-pane active">
      <div class="mock-shop-stage">
        <div class="mock-shop-top">
          <div>
            <div style="font-size:16.5px;font-weight:800;color:var(--ivory)">第 8 / 16 层整备 — 青羽的风语行商（局外 1:1 真实渲染与交互沙盒）</div>
            <div style="font-size:12.5px;color:#94a3b8;margin-top:3px">直接点击下方【随身兵装槽】即可体验 Brotato 式「详情检视 / 共鸣合成 / 五阶进化 / 熔炼回收」浮窗，绝不会单击误卖！</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span id="demoWallet" class="wallet-pill">◇ 320</span>
            <button type="button" class="btn btn-sec" onclick="rerollDemoShop()">🔄 刷新货架示例</button>
            <button type="button" class="btn btn-sec" onclick="resetDemoLoadout()">↺ 重置演示随身兵装</button>
          </div>
        </div>

        <div id="demoShopCards" class="mock-shop-cards"></div>

        <div class="mock-slots-wrap">
          <div id="demoSlotHint" class="slot-hint"></div>
          <div id="demoWeaponSlots" class="mock-slots-bar"></div>
        </div>
      </div>
    </section>

    <!-- PANE 2: 42 把武器全量展示 -->
    <section id="pane-weapons" class="studio-pane">
      <div class="filter-toolbar" id="wpnFilterBar"></div>
      <div class="showcase-grid" id="wpnGrid"></div>
    </section>

    <!-- PANE 3: 138 件遗物 + 补给 + 刻印展示 -->
    <section id="pane-relics" class="studio-pane">
      <div class="filter-toolbar" id="relicFilterBar"></div>
      <div class="showcase-grid" id="relicGrid"></div>
    </section>

    <!-- PANE 4: 四大体系速查表 -->
    <section id="pane-matrix" class="studio-pane">
      <table class="matrix-tbl">
        <thead>
          <tr>
            <th>属性 / 词条类型</th>
            <th>⚔️ 近战兵装 (15把)</th>
            <th>🔫 常规远程 (21把)</th>
            <th>🪄 秘术法杖 (6把)</th>
            <th>⚙️ 建筑 (炮台/图腾/地雷)</th>
            <th>核心规则说明</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><b>全体伤害 (dmgMul)</b></td><td>✅ 100%</td><td>✅ 100%</td><td>✅ 100% (独立乘区)</td><td>✅ 100% (独立乘区)</td><td>全游戏通用增伤（含移速/吸血/生命/护甲/收获转化出的全伤）</td></tr>
          <tr><td><b>近战伤害 (meleeBonus)</b></td><td>✅ 100%</td><td>❌</td><td>❌</td><td>❌</td><td>仅标有【⚔️近战】的兵装生效（含苍骨回旋战刃、黄金扳手、磁暴针）</td></tr>
          <tr><td><b>远程伤害 (rangedBonus)</b></td><td>❌</td><td>✅ 100%</td><td>❌ 不生效</td><td>❌ 不生效</td><td>仅标有【🔫远程】的常规枪弓飞镖生效；6把秘术法杖与建筑均不吃</td></tr>
          <tr><td><b>元素伤害 (elemBonus)</b></td><td>🔸 劫火紫电刃</td><td>🔸 5把元素远程</td><td>✅ 主力加成(85%~130%)</td><td>🔸 秘法导流塔座继承55%</td><td>标有【🔥元素】的兵装全吃，并提高所有灼烧、风毒与元素反应伤害</td></tr>
          <tr><td><b>工程伤害 (techBonus)</b></td><td>🔸 扳手/磁暴针(45%)</td><td>🔸 钉铳/灯枢/磁轨炮</td><td>🔸 发条共鸣法杖(90%)</td><td>✅ 100% 主力加成</td><td>标有【⚙️工程】的兵装按比例享受联动增伤，全部建筑100%享受</td></tr>
          <tr><td><b>角色攻速 (atkSpd)</b></td><td>✅ 100%</td><td>✅ 100%</td><td>✅ 100% (+法杖冷却缩减)</td><td>❌ 完全不吃</td><td>建筑开火仅吃独立【建筑攻速】、图腾光环与伽蓝瞬步超频</td></tr>
          <tr><td><b>暴击率 & 暴击伤害</b></td><td>✅ 100%</td><td>✅ 100%</td><td>✅ 100% (含持续法阵)</td><td>🔸 需【逆转黄金发条】</td><td>拿到【逆转黄金发条】后炮台与地雷解锁暴击</td></tr>
          <tr><td><b>穿透 / 弹射 / 额外子弹</b></td><td>❌</td><td>✅ 全面生效</td><td>🔸 改吃法杖专属词条</td><td>🔸 穿透/弹射最高+1</td><td>法杖连发靠T4【万法归宗·禁忌法典】(35%双重咏唱)，范围靠爆炸范围与尖帽</td></tr>
          <tr><td><b>爆炸范围 (explosionScale)</b></td><td>🔸 流星锤/震地波</td><td>🔸 榴弹/火箭/爆破铳</td><td>✅ 扩大所有法杖法阵半径</td><td>✅ 地雷 + 震波塔</td><td>所有法杖的陨石、暴风雪、毒雾、渴血阵、引力奇点半径都吃爆炸范围！</td></tr>
        </tbody>
      </table>
    </section>
  </main>

  <!-- 与游戏内 100% 同构的 Brotato 式随身兵装操作浮窗 -->
  <div id="weaponActionModal" class="wpn-action-modal hidden" style="position:fixed;inset:0" onclick="if(event.target===this)closeDemoSlotModal()">
    <div id="weaponActionCard" class="wpn-action-card"></div>
  </div>

  <!-- 五阶神话二选一演示浮窗 -->
  <div id="demoEvoModal" class="evo-demo-modal hidden" onclick="if(event.target===this)document.getElementById('demoEvoModal').classList.add('hidden')">
    <span class="kicker-pill">MYTHIC AWAKENING · 五阶神话二选一进化演示</span>
    <h2 id="demoEvoTitle" style="color:var(--ivory);margin:0"></h2>
    <div id="demoEvoChoices" class="crate-card-wrap evo-card-wrap" style="max-width:860px;width:100%"></div>
  </div>

  <script>
    if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        const rad = Math.min(typeof r === 'number' ? r : 4, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
        this.moveTo(x + rad, y);
        this.arcTo(x + w, y, x + w, y + h, rad);
        this.arcTo(x + w, y + h, x, y + h, rad);
        this.arcTo(x, y + h, x, y, rad);
        this.arcTo(x, y, x + w, y, rad);
        this.closePath();
        return this;
      };
    }
    const TIER_COLORS = ['', '#e2deec', '#4cc9f0', '#c77dff', '#ffd166', '#ff3b6b'];
    const TIER_NAMES  = ['', '普通', '精良', '史诗', '传说', '神话'];
    const WEAPON_TIER_COST_MUL = [0, 1, 1.85, 3.1, 4.6, 6.4];

${arsenalCode}

${relicSpritesCode}

${weaponSpritesCode}

    // 模拟玩家角色面板以驱动真实预览伤害计算
    const player = {
      mats: 320, maxSlots: 6, maxHp: 68, hp: 68,
      dmgMul: 1.25, meleeBonus: 0.24, rangedBonus: 0.28, elemBonus: 0.35, techBonus: 0.30,
      atkSpd: 1.22, spdMul: 1.18, crit: 0.18, critDmg: 0.35, lifesteal: 0.08,
      staffHaste: 0.12, meleeSweepBonus: 0, rangedPelletsBonus: 0, rangeBonus: 50,
      explosionScale: 1.16, armor: 5,
      weapons: [],
      runStats: { weaponDmg: { icicle: { dmg: 4280, kills: 36 }, ember_staff: { dmg: 6910, kills: 52 }, obsidian_flail: { dmg: 3150, kills: 24 }, wrench: { dmg: 2890, kills: 19 } } }
    };
    function getTotalRangeBonus() { return player.rangeBonus; }
    function getEffectiveAtkSpd() { return player.atkSpd; }
    function getEffectiveSpdMul() { return player.spdMul; }
    function getTotalArmor() { return player.armor; }
    function getBlastScale() { return player.explosionScale; }
    function getEffectiveDmgMul() { return player.dmgMul; }
    function getEffectiveCrit() { return player.crit; }
    function getElemMul() { return 1 + player.elemBonus; }
    function getTechMul() { return 1 + player.techBonus; }
    function getSetBonuses() {
      const counts = { primitive: 0, precise: 0, gun: 0, heavy: 0, elemental: 0, tech: 0 };
      let sticks = 0;
      for (const w of player.weapons) {
        const t = WEAPONS[w.id];
        if (t && counts[t.set] !== undefined) counts[t.set]++;
        if (w.id === 'stick') sticks++;
      }
      return { counts, elem: counts.elemental >= 2 ? 0.18 : 0, tech: counts.tech >= 2 ? 0.25 : 0, sticks };
    }

    function switchPane(id) {
      document.querySelectorAll('.studio-tab').forEach(b => b.classList.toggle('active', b.dataset.pane === id));
      document.querySelectorAll('.studio-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + id));
    }

    // =========================================================================
    // TAB 1: 行商货架 + Brotato 式随身兵装点击浮窗交互演示
    // =========================================================================
    const DEMO_PRESET_OFFERS = [
      [
        { kind: 'weapon', id: 'icicle', tier: 2, cost: 34 },
        { kind: 'weapon', id: 'ember_staff', tier: 3, cost: 58 },
        { kind: 'item', id: 'glasses', tier: 1, cost: 13 },
        { kind: 'item', id: 'grimoire_ash', tier: 3, cost: 43 }
      ],
      [
        { kind: 'weapon', id: 'nailgun', tier: 2, cost: 30 },
        { kind: 'weapon', id: 'obsidian_flail', tier: 3, cost: 56 },
        { kind: 'item', id: 'notched_core', tier: 1, cost: 16 },
        { kind: 'item', id: 'arcane_conduit', tier: 3, cost: 43 }
      ],
      [
        { kind: 'weapon', id: 'crimson_siphon_staff', tier: 3, cost: 60 },
        { kind: 'weapon', id: 'gale_twinbow', tier: 2, cost: 34 },
        { kind: 'weapon', id: 'bone_boomerang', tier: 2, cost: 30 },
        { kind: 'item', id: 'forbidden_codex', tier: 4, cost: 72 }
      ]
    ];
    let demoOfferPage = 0;
    let demoOffers = [];
    let demoSelectedSlot = -1;

    function resetDemoLoadout() {
      player.mats = 320;
      const w5 = { id: 'wrench', tier: 5, evo: 'wrench_fortress', evoName: '钟楼巨匠·双联机炮神扳', evoColor: '#fbbf24' };
      player.weapons = [
        { id: 'icicle', tier: 2 },
        { id: 'icicle', tier: 2 },
        { id: 'ember_staff', tier: 4 },
        { id: 'ember_staff', tier: 4 },
        { id: 'obsidian_flail', tier: 3 },
        w5
      ];
      demoSelectedSlot = -1;
      closeDemoSlotModal();
      demoOffers = DEMO_PRESET_OFFERS[demoOfferPage % DEMO_PRESET_OFFERS.length].map(x => Object.assign({}, x));
      renderDemoShop();
    }

    function rerollDemoShop() {
      demoOfferPage++;
      if (demoOfferPage < DEMO_PRESET_OFFERS.length) {
        demoOffers = DEMO_PRESET_OFFERS[demoOfferPage].map(x => Object.assign({}, x));
      } else {
        const wKeys = Object.keys(WEAPONS);
        demoOffers = [
          { kind: 'weapon', id: wKeys[(demoOfferPage * 5) % wKeys.length], tier: 2, cost: 32 },
          { kind: 'weapon', id: wKeys[(demoOfferPage * 7 + 3) % wKeys.length], tier: 3, cost: 54 },
          { kind: 'item', id: ITEMS[(demoOfferPage * 11) % ITEMS.length].id, tier: ITEMS[(demoOfferPage * 11) % ITEMS.length].tier, cost: ITEMS[(demoOfferPage * 11) % ITEMS.length].cost },
          { kind: 'item', id: ITEMS[(demoOfferPage * 13 + 5) % ITEMS.length].id, tier: ITEMS[(demoOfferPage * 13 + 5) % ITEMS.length].tier, cost: ITEMS[(demoOfferPage * 13 + 5) % ITEMS.length].cost }
        ];
      }
      renderDemoShop();
    }

    function renderDemoShop() {
      document.getElementById('demoWallet').textContent = '◇ ' + player.mats;
      const box = document.getElementById('demoShopCards');
      box.innerHTML = '';
      demoOffers.forEach((o, i) => {
        const el = document.createElement('div');
        if (!o) {
          el.className = 'card sold-out';
          el.innerHTML = '<span class="sold-stamp">✓ 已收入囊中</span>';
          box.appendChild(el);
          return;
        }
        el.className = 'card t' + o.tier;
        if (o.kind === 'weapon') {
          const tpl = WEAPONS[o.id];
          const sLabel = SET_DEFS[tpl.set].label.replace(/^[^\\u4e00-\\u9fa5A-Za-z0-9]+/, '');
          const dmg = calcWeaponPreviewDmg(o.id, tpl, o.tier, null);
          const hasPair = o.tier < 5 && player.weapons.some(w => w.id === o.id && w.tier === o.tier);
          const canFit = player.weapons.length < player.maxSlots || hasPair;
          el.innerHTML = \`
            <div class="card-main">
              <div class="card-head">
                <div class="item-emblem t\${o.tier}">\${renderWeaponEmblemHtml(o.id, o.tier, '', tpl.icon)}</div>
                <div class="card-meta">
                  <div class="card-title">\${tpl.name}</div>
                  <div class="card-badges">
                    <span class="tag t\${o.tier}">\${TIER_NAMES[o.tier]}</span>
                    \${renderWeaponScalingBadgesHtml(tpl, o.id)}
                    <span class="tag">\${sLabel}</span>
                    \${hasPair ? '<span class="tag tag-merge">可升阶</span>' : ''}
                  </div>
                </div>
              </div>
              <div class="card-body">
                <div class="card-desc">\${tpl.desc}</div>
                <div class="stat-chips">
                  <span class="stat-chip">伤害 \${dmg}\${tpl.pellets ? '×' + tpl.pellets : (tpl.burstShots ? '×' + tpl.burstShots : '')}</span>
                  <span class="stat-chip">间隔 \${tpl.cd}s</span>
                  <span class="stat-chip">射程 \${tpl.range}</span>
                </div>
              </div>
            </div>
            <div class="card-side">
              <div class="card-actions">
                <button class="btn buy" \${player.mats >= o.cost && canFit ? '' : 'disabled'}>
                  <span>\${hasPair ? '购入升阶' : (canFit ? '购入演示' : '槽位已满')}</span>
                  <span class="buy-price">◇ \${o.cost}</span>
                </button>
              </div>
            </div>\`;
          el.querySelector('.buy').onclick = () => {
            if (player.mats < o.cost || !canFit) return;
            player.mats -= o.cost;
            const pairIdx = player.weapons.findIndex(w => w.id === o.id && w.tier === o.tier && w.tier < 5);
            if (pairIdx !== -1 && player.weapons.length >= player.maxSlots) {
              player.weapons[pairIdx].tier++;
              if (player.weapons[pairIdx].tier === 5) openDemoEvoChoice(pairIdx);
            } else {
              player.weapons.push({ id: o.id, tier: o.tier });
            }
            demoOffers[i] = null;
            renderDemoShop();
          };
        } else {
          const it = ITEMS.find(x => x.id === o.id) || ITEMS[0];
          el.innerHTML = \`
            <div class="card-main">
              <div class="card-head">
                <div class="item-emblem t\${it.tier}">\${renderItemEmblemHtml(it, it.tier)}</div>
                <div class="card-meta">
                  <div class="card-title">\${it.name}</div>
                  <div class="card-badges">
                    <span class="tag t\${it.tier}">\${TIER_NAMES[it.tier]}遗物</span>
                    \${renderRelicScopeBadgesHtml(it)}
                  </div>
                </div>
              </div>
              <div class="card-body">
                <div class="card-desc">\${it.desc}</div>
              </div>
            </div>
            <div class="card-side">
              <div class="card-actions">
                <button class="btn buy" \${player.mats >= o.cost ? '' : 'disabled'}>
                  <span>购入演示</span>
                  <span class="buy-price">◇ \${o.cost}</span>
                </button>
              </div>
            </div>\`;
          el.querySelector('.buy').onclick = () => {
            if (player.mats < o.cost) return;
            player.mats -= o.cost;
            demoOffers[i] = null;
            renderDemoShop();
          };
        }
        box.appendChild(el);
      });

      document.getElementById('demoSlotHint').innerHTML =
        \`随身守誓兵装席 (<b>\${player.weapons.length}</b>/\${player.maxSlots})  ·  👆 <b>点击任意下方兵装槽</b>，即可弹出 Brotato 式详情与「共鸣合成 / 熔炼回收 / 取消」浮窗：\`;
      const sBox = document.getElementById('demoWeaponSlots');
      sBox.innerHTML = '';
      player.weapons.forEach((w, idx) => {
        const tpl = WEAPONS[w.id];
        const hasPair = w.tier < 5 && player.weapons.some((x, j) => j !== idx && x.id === w.id && x.tier === w.tier);
        const needsEvo = w.tier >= 5 && !w.evo;
        const isEvoDone = w.tier >= 5 && !!w.evoName;
        const dispName = isEvoDone ? w.evoName : \`\${tpl.name} · 阶\${w.tier}\`;
        const nameColor = isEvoDone ? (w.evoColor || TIER_COLORS[5]) : TIER_COLORS[w.tier];
        const badgeHtml = needsEvo
          ? '<span class="merge-badge evo-badge">觉醒!</span>'
          : (hasPair
            ? \`<span class="merge-badge\${w.tier === 4 ? ' evo-badge' : ''}">\${w.tier === 4 ? '升5阶' : '可合成'}</span>\`
            : (isEvoDone ? '<span class="merge-badge evo-badge">★神话</span>' : ''));
        const tipTxt = needsEvo ? '◆ 择定神话分支' : (hasPair ? '◆ 合成 / 操作' : '◆ 查看 / 操作');
        const d = document.createElement('div');
        d.className = \`slot t\${w.tier}\${demoSelectedSlot === idx ? ' is-selected' : ''}\`;
        d.innerHTML = \`\${badgeHtml}
          <div class="slot-icon">\${renderWeaponEmblemHtml(w.id, w.tier, w.evo || '', tpl.icon)}</div>
          <div class="slot-name" style="color:\${nameColor}" title="\${dispName}">\${dispName}</div>
          \${renderWeaponSlotScaleHtml(tpl, w.id)}
          <div class="sell-tip">\${tipTxt}</div>\`;
        d.onclick = () => openDemoSlotModal(idx);
        sBox.appendChild(d);
      });
      for (let k = player.weapons.length; k < player.maxSlots; k++) {
        const emp = document.createElement('div');
        emp.className = 'slot-empty';
        emp.innerHTML = '<span>+ 空槽</span>';
        sBox.appendChild(emp);
      }
    }

    function closeDemoSlotModal() {
      demoSelectedSlot = -1;
      document.getElementById('weaponActionModal').classList.add('hidden');
      renderDemoShop();
    }

    function openDemoEvoChoice(idx) {
      const w = player.weapons[idx];
      if (!w) return;
      const tpl = WEAPONS[w.id];
      const modal = document.getElementById('demoEvoModal');
      document.getElementById('demoEvoTitle').textContent = \`【\${tpl.name}】晋升五阶神话 · 二选一终极进化\`;
      const box = document.getElementById('demoEvoChoices');
      box.innerHTML = '';
      const sLabel = SET_DEFS[tpl.set].label.replace(/^[^\\u4e00-\\u9fa5A-Za-z0-9]+/, '');
      tpl.evos.slice(0, 2).forEach(opt => {
        const c = document.createElement('div');
        c.className = 'card t5 evo-choice-card';
        c.style.borderColor = opt.color || '#ff5c8a';
        c.innerHTML = \`
          <div class="evo-art-stage">
            <div class="item-emblem t5 evo-emblem" style="border-color:\${opt.color || '#ff5c8a'}">\${renderWeaponEmblemHtml(w.id, 5, opt.id, tpl.icon)}</div>
            <div class="evo-meta">
              <div class="evo-name" style="color:\${opt.color || '#ffd6e5'}">\${opt.name}</div>
              <div class="card-badges">
                <span class="tag t5">\${opt.tag}</span>
                \${renderWeaponScalingBadgesHtml(tpl, w.id)}
                <span class="tag">\${sLabel}</span>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="card-desc evo-desc">\${opt.desc}</div>
            <div class="card-actions"><button type="button" class="btn btn-go">◆ 觉醒「\${opt.name}」</button></div>
          </div>\`;
        c.querySelector('button').onclick = () => {
          w.evo = opt.id;
          w.evoName = opt.name;
          w.evoColor = opt.color;
          modal.classList.add('hidden');
          renderDemoShop();
        };
        box.appendChild(c);
      });
      modal.classList.remove('hidden');
    }

    function openDemoSlotModal(idx) {
      const w = player.weapons[idx];
      if (!w) return;
      const tpl = WEAPONS[w.id];
      demoSelectedSlot = idx;
      const hasPair = w.tier < 5 && player.weapons.some((x, j) => j !== idx && x.id === w.id && x.tier === w.tier);
      const needsEvo = w.tier >= 5 && !w.evo;
      const canRecycle = player.weapons.length > 1;
      const refund = Math.max(4, Math.round(tpl.cost * (WEAPON_TIER_COST_MUL[w.tier] || 6.4) * 1.6 * 0.35));
      const activeEvoObj = (w.evo && Array.isArray(tpl.evos)) ? tpl.evos.find(ev => ev.id === w.evo) : null;
      const dispName = activeEvoObj ? activeEvoObj.name : \`\${tpl.name} · 阶\${w.tier}\`;
      const nameColor = activeEvoObj ? (activeEvoObj.color || TIER_COLORS[5]) : TIER_COLORS[w.tier];
      const sDef = SET_DEFS[tpl.set];
      const sLabel = sDef.label.replace(/^[^\\u4e00-\\u9fa5A-Za-z0-9]+/, '');
      const curSetCnt = getSetBonuses().counts[tpl.set] || 0;
      const liveDmg = calcWeaponPreviewDmg(w.id, tpl, w.tier, activeEvoObj);
      const runRec = player.runStats.weaponDmg[w.id];

      const evoHintHtml = activeEvoObj
        ? \`<div class="wpn-act-evo-hint"><b style="color:\${activeEvoObj.color || '#ff5c8a'}">★ 已觉醒神话：【\${activeEvoObj.name}】</b><br>\${activeEvoObj.desc}</div>\`
        : \`<div class="wpn-act-evo-hint"><b>◆ 5阶神话进化预览：</b>★\${tpl.evos[0].name} ／ ★\${tpl.evos[1].name}</div>\`;

      const combineBtnHtml = needsEvo
        ? \`<button type="button" class="btn btn-go" style="justify-content:center" id="demoCombineBtn">★ 择定五阶神话进化</button>\`
        : (hasPair
          ? \`<button type="button" class="btn merge-ready" style="justify-content:center" id="demoCombineBtn">◆ \${w.tier === 4 ? '共鸣合成并觉醒五阶神话!' : '共鸣合成 (升至阶' + (w.tier + 1) + ')'}</button>\`
          : '');

      const card = document.getElementById('weaponActionCard');
      card.className = \`wpn-action-card t\${w.tier}\`;
      card.innerHTML = \`
        <div class="wpn-act-head">
          <div class="item-emblem t\${w.tier}">\${renderWeaponEmblemHtml(w.id, w.tier, w.evo || '', tpl.icon)}</div>
          <div class="card-meta" style="flex:1">
            <div class="wpn-act-title" style="color:\${nameColor}">\${dispName}</div>
            <div class="card-badges">
              <span class="tag t\${w.tier}">\${TIER_NAMES[w.tier]}兵装</span>
              \${renderWeaponScalingBadgesHtml(tpl, w.id)}
              <span class="tag">\${sLabel} (\${curSetCnt})</span>
            </div>
          </div>
        </div>
        <div class="stat-chips">
          <span class="stat-chip">伤害 \${liveDmg}\${tpl.pellets ? '×' + tpl.pellets : (tpl.burstShots ? '×' + tpl.burstShots : '')}</span>
          <span class="stat-chip">间隔 \${(tpl.cd / 1.22).toFixed(2)}s</span>
          <span class="stat-chip">射程 \${tpl.range + 50}</span>
          <span class="stat-chip">暴击 \${Math.round((0.18 + (tpl.critBonus || 0)) * 100)}%</span>
          \${runRec ? \`<span class="stat-chip">本局输出 \${runRec.dmg} (\${runRec.kills}斩)</span>\` : ''}
        </div>
        <div class="wpn-act-desc">\${tpl.desc}</div>
        <div class="wpn-act-set-line">✦ 羁绊【\${sLabel}】（当前 \${curSetCnt} 把）：\${sDef.desc}</div>
        \${evoHintHtml}
        <div class="wpn-act-btns">
          \${combineBtnHtml}
          <div class="wpn-act-btns-row">
            <button type="button" id="demoRecycleBtn" class="btn btn-recycle-danger" \${canRecycle ? '' : 'disabled'}>\${canRecycle ? '♻️ 熔炼回收 (+◇' + refund + ')' : '♻️ 至少保留 1 把兵装'}</button>
            <button type="button" class="btn btn-sec" onclick="closeDemoSlotModal()">✕ 取消</button>
          </div>
        </div>\`;

      const cmb = document.getElementById('demoCombineBtn');
      if (cmb) {
        cmb.onclick = () => {
          if (needsEvo) {
            closeDemoSlotModal();
            openDemoEvoChoice(idx);
            return;
          }
          const other = player.weapons.findIndex((x, j) => j !== idx && x.id === w.id && x.tier === w.tier);
          if (other !== -1) {
            w.tier++;
            player.weapons.splice(other, 1);
            const newIdx = player.weapons.indexOf(w);
            closeDemoSlotModal();
            if (w.tier === 5) openDemoEvoChoice(newIdx);
          }
        };
      }
      document.getElementById('demoRecycleBtn').onclick = () => {
        if (player.weapons.length <= 1) return;
        player.mats += refund;
        player.weapons.splice(idx, 1);
        closeDemoSlotModal();
      };

      document.getElementById('weaponActionModal').classList.remove('hidden');
      renderDemoShop();
    }

    // =========================================================================
    // TAB 2: 全部 42 把兵装彩色标签 + T5 双分支进化贴图展示
    // =========================================================================
    const WPN_FILTERS = [
      { id: 'all', label: '全部兵装 (42)' },
      { id: 'ts-ranged', label: '🔫 远程' },
      { id: 'ts-melee', label: '⚔️ 近战' },
      { id: 'ts-staff', label: '🪄 秘术法杖' },
      { id: 'ts-elem', label: '🔥 元素' },
      { id: 'ts-tech', label: '⚙️ 工程' },
      { id: 'ts-hp', label: '❤️ 生命' },
      { id: 'ts-armor', label: '🛡️ 护甲' },
      { id: 'ts-blast', label: '💥 爆破' },
      { id: 'ts-spd', label: '💨 移速' },
      { id: 'ts-leech', label: '🩸 汲血' },
      { id: 'ts-summon', label: '🗼 产建筑' },
      { id: 'dual', label: '✦ 双重/多重吃伤兵装' }
    ];
    let curWpnFilter = 'all', curWpnQuery = '';

    function buildWeaponGallery() {
      const bar = document.getElementById('wpnFilterBar');
      bar.innerHTML = '';
      WPN_FILTERS.forEach(f => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'filter-chip' + (curWpnFilter === f.id ? ' active' : '');
        b.textContent = f.label;
        b.onclick = () => { curWpnFilter = f.id; buildWeaponGallery(); };
        bar.appendChild(b);
      });
      const inp = document.createElement('input');
      inp.className = 'search-inp';
      inp.placeholder = '搜索武器名 / 属性 / 神话分支…';
      inp.value = curWpnQuery;
      inp.oninput = e => { curWpnQuery = e.target.value.trim(); renderWeaponGrid(); };
      bar.appendChild(inp);
      renderWeaponGrid();
    }

    function renderWeaponGrid() {
      const grid = document.getElementById('wpnGrid');
      grid.innerHTML = '';
      for (const [id, w] of Object.entries(WEAPONS)) {
        const tags = getWeaponScalingTags(w, id);
        if (curWpnFilter === 'dual') {
          if (tags.filter(t => t.cls !== 'ts-summon').length < 2) continue;
        } else if (curWpnFilter !== 'all') {
          if (!tags.some(t => t.cls === curWpnFilter)) continue;
        }
        if (curWpnQuery) {
          const hay = [w.name, w.desc, ...tags.map(t => t.label), ...(w.evos || []).map(ev => ev.name + ev.desc)].join(' ');
          if (!hay.toLowerCase().includes(curWpnQuery.toLowerCase())) continue;
        }
        const sLabel = SET_DEFS[w.set].label.replace(/^[^\\u4e00-\\u9fa5A-Za-z0-9]+/, '');
        const minT = w.minTier || 1;
        const card = document.createElement('div');
        card.className = 'sc-card t' + Math.max(2, minT);
        card.innerHTML = \`
          <div style="display:flex;gap:11px;align-items:center">
            <div class="item-emblem t3" style="width:52px;height:52px;flex-shrink:0">\${renderWeaponEmblemHtml(id, 3, '', w.icon)}</div>
            <div style="min-width:0;flex:1">
              <div style="font-size:15.5px;font-weight:800;color:var(--ivory)">\${w.name}</div>
              <div class="card-badges" style="margin-top:4px">
                \${renderWeaponScalingBadgesHtml(w, id)}
                <span class="tag">\${sLabel}</span>
                \${minT > 1 ? \`<span class="tag t\${minT}">最低T\${minT}</span>\` : ''}
              </div>
            </div>
          </div>
          <div class="stat-chips">
            <span class="stat-chip">基础伤 \${w.dmg}\${w.pellets ? '×' + w.pellets : (w.burstShots ? '×' + w.burstShots : '')}</span>
            <span class="stat-chip">冷却 \${w.cd}s</span>
            <span class="stat-chip">范围 \${w.range}</span>
            <span class="stat-chip">基准 ◇\${w.cost}</span>
          </div>
          <div style="font-size:12.5px;color:#cbd5e1;line-height:1.5">\${w.desc}</div>
          <div class="sc-evo-strip">
            \${(w.evos || []).map(ev => \`
              <div class="sc-evo-box" style="border-color:\${ev.color || '#ff5c8a'}55">
                <div class="item-emblem t5" style="border-color:\${ev.color || '#ff5c8a'}">\${renderWeaponEmblemHtml(id, 5, ev.id, w.icon)}</div>
                <div style="min-width:0">
                  <div style="font-weight:800;color:\${ev.color || '#ffd6e5'}">★ \${ev.name}</div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:2px">\${ev.desc}</div>
                </div>
              </div>\`).join('')}
          </div>\`;
        grid.appendChild(card);
      }
    }

    // =========================================================================
    // TAB 3: 全部 138 件遗物 + 补给 + 刻印新贴图与配对标签展示
    // =========================================================================
    const RELIC_FILTERS = [
      { id: 'all', label: '全部遗物 (138)' },
      { id: 't1', label: 'T1 普通 (42)' },
      { id: 't2', label: 'T2 精良 (40)' },
      { id: 't3', label: 'T3 史诗 (34)' },
      { id: 't4', label: 'T4 传说 (22)' },
      { id: 'ts-ranged', label: '🔫 远程有效' },
      { id: 'ts-melee', label: '⚔️ 近战有效' },
      { id: 'ts-staff', label: '🪄 法杖专属' },
      { id: 'ts-elem', label: '🔥 元素加成' },
      { id: 'ts-tech', label: '⚙️ 工程/建筑' },
      { id: 'ts-all', label: '✦ 全系通用' },
      { id: 'cloaks', label: '🧥 修正贴图重点检视(斗篷/砺剑石/面具等)' }
    ];
    let curRelicFilter = 'all', curRelicQuery = '';

    function buildRelicGallery() {
      const bar = document.getElementById('relicFilterBar');
      bar.innerHTML = '';
      RELIC_FILTERS.forEach(f => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'filter-chip' + (curRelicFilter === f.id ? ' active' : '');
        b.textContent = f.label;
        b.onclick = () => { curRelicFilter = f.id; buildRelicGallery(); };
        bar.appendChild(b);
      });
      const inp = document.createElement('input');
      inp.className = 'search-inp';
      inp.placeholder = '搜索遗物名称 / 效果（如：斗篷、血盾、闪避）…';
      inp.value = curRelicQuery;
      inp.oninput = e => { curRelicQuery = e.target.value.trim(); renderRelicGrid(); };
      bar.appendChild(inp);
      renderRelicGrid();
    }

    const SPOTLIGHT_FIXED_IDS = new Set(['lumber', 'whetstone', 'sniper_cloak', 'jetpack', 'bat', 'qingyu_hoodie', 'snail', 'overseer_chip', 'assassin_crest', 'clover', 'bell', 'chrono_watch', 'crimson_grail', 'phoenix_blood_feather', 'twin_hourglass', 'forbidden_codex']);

    function renderRelicGrid() {
      const grid = document.getElementById('relicGrid');
      grid.innerHTML = '';
      for (const it of ITEMS) {
        const scopes = getRelicScopeTags(it);
        if (curRelicFilter === 'cloaks') {
          if (!SPOTLIGHT_FIXED_IDS.has(it.id)) continue;
        } else if (/^t[1-4]$/.test(curRelicFilter)) {
          if ('t' + it.tier !== curRelicFilter) continue;
        } else if (curRelicFilter !== 'all') {
          if (!scopes.some(s => s.cls === curRelicFilter)) continue;
        }
        if (curRelicQuery) {
          const hay = (it.name + ' ' + it.desc + ' ' + it.id + ' ' + scopes.map(s => s.label).join(' ')).toLowerCase();
          if (!hay.includes(curRelicQuery.toLowerCase())) continue;
        }
        const spec = RELIC_ART_SPECS[it.id] || [];
        const card = document.createElement('div');
        card.className = 'sc-card t' + it.tier;
        card.innerHTML = \`
          <div style="display:flex;gap:12px;align-items:center">
            <div class="item-emblem t\${it.tier}" style="width:52px;height:52px;flex-shrink:0">\${renderItemEmblemHtml(it, it.tier)}</div>
            <div style="min-width:0;flex:1">
              <div style="font-size:15px;font-weight:800;color:var(--ivory)">\${it.name}</div>
              <div class="card-badges" style="margin-top:4px">
                <span class="tag t\${it.tier}">T\${it.tier} \${TIER_NAMES[it.tier]}</span>
                \${renderRelicScopeBadgesHtml(it)}
                \${it.maxCount ? \`<span class="tag tag-merge">\${it.maxCount === 1 ? '唯一' : '上限×' + it.maxCount}</span>\` : ''}
                <span class="tag">◇\${it.cost}</span>
              </div>
            </div>
          </div>
          <div style="font-size:12.5px;color:#cbd5e1;line-height:1.5">\${it.desc}</div>
          <div style="font-size:11px;color:#64748b">贴图器型：\${spec[0] || '-'} / \${spec[1] || '-'} · ID: \${it.id}</div>\`;
        grid.appendChild(card);
      }
    }

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeDemoSlotModal();
        document.getElementById('demoEvoModal').classList.add('hidden');
      }
    });

    resetDemoLoadout();
    buildWeaponGallery();
    buildRelicGallery();
  </script>
</body>
</html>
`;

const outRoot = path.resolve(ROOT, '../brotato_arsenal_tags_showcase.html');
const outTools = path.join(ROOT, 'tools/dev_arsenal_showcase.html');
fs.mkdirSync(path.dirname(outTools), { recursive: true });
fs.writeFileSync(outRoot, html, 'utf8');
fs.writeFileSync(outTools, html, 'utf8');

console.log(`Built standalone arsenal & tags showcase -> ${outRoot} (${(html.length / 1024).toFixed(1)} KB)`);
console.log(`Built standalone arsenal & tags showcase -> ${outTools} (${(html.length / 1024).toFixed(1)} KB)`);
