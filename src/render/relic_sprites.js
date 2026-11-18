// ============================================================================
// 🎨 《烬塔残响：第999次救赎》138 件圣遗物 / 秘髓补给 / 记忆刻印高精矢量圣徽烘焙器
// 复用单张 192×192 离屏画布按需导出 DataURL 缓存：0 新增常驻 Canvas 上下文、0 createRadialGradient、0 shadowBlur！
// 彻底杜绝任何「斗篷用斧头、砺剑石用斧头、披风用老鹰、钟摆用蜗牛」等贴图错位问题。
// ============================================================================

const _relicDataUrlCache = new Map();
let _sharedRelicUrlCanvas = null;

// [archetype, variant, primaryHex, secondaryHex, accentHex]
const RELIC_ART_SPECS = {
  // --- T1 普通遗物 (42) ---
  worm:               ['core_sphere', 'chrysalis', '#84cc16', '#15803d', '#fef08a'],
  glasses:            ['optics',      'glasses',   '#38bdf8', '#0f172a', '#f6d379'],
  coffee:             ['vessel',      'teacup',    '#dc2626', '#f8fafc', '#fde68a'],
  bell:               ['tag_bell',    'bell',      '#64748b', '#1e293b', '#f6d379'],
  fertilizer:         ['vessel',      'flask',     '#4ade80', '#14532d', '#bbf7d0'],
  hedgehog:           ['gauntlet',    'bone',      '#e2e8f0', '#475569', '#f8fafc'],
  whetstone:          ['whetstone',   'stone',     '#94a3b8', '#334155', '#fde047'],
  blade_gaiters:      ['footwear',    'greave',    '#34d399', '#0f172a', '#fde68a'],
  toolbox:            ['clockwork',   'box',       '#f59e0b', '#78350f', '#fef3c7'],
  gear_oil:           ['vessel',      'oilcan',    '#fbbf24', '#78350f', '#38bdf8'],
  blueprint_scroll:   ['tome_scroll', 'scroll',    '#38bdf8', '#1e3a8a', '#f6d379'],
  mana_wick:          ['curio',       'wick',      '#2dd4bf', '#0f766e', '#fef08a'],
  heavy_greaves:      ['footwear',    'greave',    '#64748b', '#1e293b', '#f6d379'],
  gunpowder:          ['explosive',   'keg',       '#ea580c', '#431407', '#fde047'],
  spiked_collar:      ['tag_bell',    'collar',    '#eab308', '#713f12', '#fef9c3'],
  leech_fang:         ['tag_bell',    'fang',      '#e11d48', '#4c0519', '#fda4af'],
  coupon:             ['tag_bell',    'plaque',    '#d97706', '#451a03', '#fef3c7'],
  recycler:           ['timepiece',   'hourglass', '#2dd4bf', '#134e4a', '#f6d379'],
  lumber:             ['cloak',       'hood',      '#16a34a', '#052e16', '#f6d379'],
  magnet:             ['curio',       'magnet',    '#38bdf8', '#dc2626', '#e0f2fe'],
  plate:              ['armor',       'cuirass',   '#475569', '#0f172a', '#cbd5e1'],
  clover:             ['tag_bell',    'dogtag',    '#cbd5e1', '#334155', '#f6d379'],
  boots:              ['footwear',    'boot',      '#34d399', '#064e3b', '#fef3c7'],
  hawk_eye:           ['optics',      'prism',     '#38bdf8', '#1d4ed8', '#ffffff'],
  venom_gland:        ['vessel',      'flask',     '#a3e635', '#365314', '#d9f99d'],
  soul_lure_bell:     ['tag_bell',    'bell',      '#a855f7', '#3b0764', '#72efdd'],
  merchant_pouch:     ['curio',       'pouch',     '#10b981', '#064e3b', '#fde047'],
  cracked_mask:       ['mask',        'cracked',   '#f1f5f9', '#475569', '#f43f5e'],
  greed_censer:       ['curio',       'urn',       '#f59e0b', '#78350f', '#72efdd'],
  notched_core:       ['ammo_quiver', 'bullet',    '#fbbf24', '#78350f', '#f8fafc'],
  light_mag:          ['ammo_quiver', 'mag',       '#64748b', '#1e293b', '#38bdf8'],
  rifled_brace:       ['ammo_quiver', 'brace',     '#94a3b8', '#334155', '#f6d379'],
  brass_recoil_spring:['clockwork',   'spring',    '#eab308', '#451a03', '#fef08a'],
  fox_fang_charm:     ['tag_bell',    'fang',      '#f8fafc', '#9f1239', '#fb7185'],
  weakness_atlas:     ['tome_scroll', 'book',      '#be123c', '#4c0519', '#fde68a'],
  keen_monocle:       ['optics',      'glasses',   '#fbbf24', '#1e293b', '#7dd3fc'],
  wind_leaf_talisman: ['wing_feather','leaf',      '#34d399', '#065f46', '#fef08a'],
  mirage_bracer:      ['gauntlet',    'silk',      '#67e8f9', '#155e75', '#ffffff'],
  feather_anklet:     ['footwear',    'anklet',    '#e2e8f0', '#0f766e', '#5eead4'],
  blood_thorn_ring:   ['ring',        'crimson',   '#f43f5e', '#881337', '#fda4af'],
  night_rat_pipe:     ['curio',       'flute',     '#e2e8f0', '#4c0519', '#fb7185'],
  mithril_staff_ring: ['ring',        'arcane',    '#7dd3fc', '#1e3a8a', '#e0f2fe'],
  astral_scroll:      ['tome_scroll', 'scroll',    '#c084fc', '#3b0764', '#fde68a'],
  black_powder_fuse:  ['explosive',   'keg',       '#f97316', '#1e293b', '#fef08a'],

  // --- T2 精良遗物 (40) ---
  scope:              ['optics',      'scope',     '#38bdf8', '#1e293b', '#fde047'],
  hawkeye_quiver:     ['ammo_quiver', 'quiver',    '#10b981', '#78350f', '#fef08a'],
  buckshot_bandolier: ['belt',        'bandolier', '#f97316', '#1e293b', '#fde047'],
  twin_feeder:        ['ammo_quiver', 'mag',       '#38bdf8', '#0f172a', '#fde047'],
  crit_gauntlet:      ['gauntlet',    'claw',      '#f43f5e', '#1e293b', '#fde68a'],
  brawler_pauldron:   ['armor',       'pauldron',  '#94a3b8', '#1e293b', '#f6d379'],
  azure_kote:         ['gauntlet',    'silk',      '#2dd4bf', '#0f172a', '#fde68a'],
  crescent_tassel:    ['tag_bell',    'tassel',    '#fb7185', '#1e293b', '#fde047'],
  landmine_pack:      ['explosive',   'mine',      '#38bdf8', '#1e293b', '#ff2a55'],
  mine_magnet:        ['curio',       'magnet',    '#38bdf8', '#eab308', '#72efdd'],
  repair_drone:       ['clockwork',   'drone',     '#fbbf24', '#1e293b', '#72efdd'],
  shock_pylon:        ['clockwork',   'turret',    '#c084fc', '#312e81', '#72efdd'],
  astrologer_hat:     ['headgear',    'wizhat',    '#6366f1', '#1e1b4b', '#fde047'],
  elemental_ring:     ['ring',        'tri',       '#38bdf8', '#f97316', '#a855f7'],
  shrapnel_vest:      ['belt',        'bandolier', '#ea580c', '#451a03', '#fde047'],
  crimson_pact:       ['tag_bell',    'tassel',    '#e11d48', '#4c0519', '#fde68a'],
  butterfly:          ['wing_feather','feather',   '#2dd4bf', '#065f46', '#a7f3d0'],
  snail:              ['timepiece',   'pendulum',  '#eab308', '#422006', '#72efdd'],
  jetpack:            ['cloak',       'shawl',     '#2dd4bf', '#064e3b', '#e0f2fe'],
  thorns:             ['armor',       'spiked',    '#84cc16', '#1e293b', '#d9f99d'],
  cyberball:          ['core_sphere', 'orb',       '#a855f7', '#3b0764', '#fde047'],
  bat:                ['cloak',       'cape',      '#9f1239', '#0f172a', '#fda4af'],
  medkit:             ['vessel',      'flask',     '#fb7185', '#881337', '#ffffff'],
  turret:             ['clockwork',   'turret',    '#f59e0b', '#1e293b', '#72efdd'],
  adren:              ['curio',       'heart',     '#f43f5e', '#4c0519', '#72efdd'],
  napalm:             ['vessel',      'flask',     '#ff6b35', '#7c2d12', '#fde047'],
  cryo:               ['vessel',      'flask',     '#38bdf8', '#0c4a6e', '#e0f2fe'],
  barrier:            ['core_sphere', 'shield_orb','#38bdf8', '#0f172a', '#72efdd'],
  crown:              ['headgear',    'crown',     '#fbbf24', '#78350f', '#38bdf8'],
  kinetic_ricochet:   ['optics',      'prism',     '#2dd4bf', '#0f766e', '#fef08a'],
  aegis_capacitor:    ['clockwork',   'battery',   '#38bdf8', '#1e293b', '#fde047'],
  afterimage_boots:   ['footwear',    'boot',      '#38bdf8', '#0f172a', '#72efdd'],
  padding_lining:     ['armor',       'vest',      '#eab308', '#1e293b', '#fef08a'],
  gargoyle_carving:   ['curio',       'gargoyle',  '#94a3b8', '#1e293b', '#72efdd'],
  spicy_alch_oil:     ['vessel',      'flask',     '#ef4444', '#7f1d1d', '#fde047'],
  spirit_bonsai:      ['curio',       'bonsai',    '#4ade80', '#78350f', '#fb7185'],
  tungsten_bolts:     ['ammo_quiver', 'quiver',    '#38bdf8', '#1e293b', '#e2e8f0'],
  executioner_hook:   ['blade_relic', 'hook',      '#e11d48', '#1e293b', '#fda4af'],
  phantom_adrenaline: ['vessel',      'syringe',   '#2dd4bf', '#0f172a', '#bef264'],
  mirage_wind_blades: ['blade_relic', 'windblade', '#2dd4bf', '#064e3b', '#e0f2fe'],
  crimson_frenzy_vial:['vessel',      'flask',     '#e11d48', '#4c0519', '#fde047'],
  pocket_factory:     ['clockwork',   'box',       '#fbbf24', '#1e293b', '#72efdd'],
  arcane_echo_stone:  ['optics',      'prism',     '#c084fc', '#3b0764', '#72efdd'],
  gravity_collapser:  ['core_sphere', 'orb',       '#8b5cf6', '#090514', '#fde68a'],
  silver_medal:       ['tag_bell',    'dogtag',    '#e2e8f0', '#334155', '#38bdf8'],
  blindfold_band:     ['headgear',    'bandana',   '#1e293b', '#090d16', '#72efdd'],
  ore_compass:        ['timepiece',   'watch',     '#fbbf24', '#1e3a8a', '#72efdd'],
  amber_tonic:        ['vessel',      'flask',     '#f59e0b', '#78350f', '#fef08a'],
  silver_boss_slug:   ['ammo_quiver', 'bullet',    '#e2e8f0', '#1e293b', '#38bdf8'],
  iron_wrist_weight:  ['gauntlet',    'bone',      '#64748b', '#0f172a', '#f59e0b'],
  gale_knuckle:       ['gauntlet',    'claw',      '#38bdf8', '#0f766e', '#fef08a'],
  dual_grindstone:    ['whetstone',   'stone',     '#cbd5e1', '#1e293b', '#fb7185'],
  arcane_inkwell:     ['vessel',      'flask',     '#c084fc', '#1e1b4b', '#fbbf24'],
  charred_bracer:     ['gauntlet',    'silk',      '#fb923c', '#7c2d12', '#fde047'],
  tungsten_firing_pin:['ammo_quiver', 'brace',     '#38bdf8', '#334155', '#fbbf24'],

  // --- T3 史诗遗物 (49) ---
  bandana:            ['headgear',    'bandana',   '#e11d48', '#4c0519', '#fde68a'],
  prism:              ['optics',      'prism',     '#60a5fa', '#1e3a8a', '#ffffff'],
  dragon_piercer_ammo:['ammo_quiver', 'bullet',    '#f43f5e', '#1e1b4b', '#fde047'],
  tentacle:           ['curio',       'tentacle',  '#a855f7', '#3b0764', '#f43f5e'],
  sniper_cloak:       ['cloak',       'cape',      '#38bdf8', '#0c4a6e', '#f8fafc'],
  overseer_chip:      ['clockwork',   'spring',    '#fbbf24', '#78350f', '#c084fc'],
  arcane_conduit:     ['core_sphere', 'shield_orb','#c084fc', '#1e1b4b', '#72efdd'],
  clockwork_citadel:  ['clockwork',   'turret',    '#f59e0b', '#312e81', '#fde68a'],
  grimoire_ash:       ['tome_scroll', 'book',      '#dc2626', '#450a0a', '#fde047'],
  absolute_zero_orb:  ['optics',      'eye',       '#38bdf8', '#082f49', '#ffffff'],
  blood_thorn_heart:  ['curio',       'heart',     '#e11d48', '#14532d', '#84cc16'],
  whirlwind_belt:     ['belt',        'sash',      '#fb7185', '#4c0519', '#fde68a'],
  asura_wardrum:      ['belt',        'sash',      '#dc2626', '#1e1b4b', '#fde047'],
  titan_heart:        ['curio',       'heart',     '#f97316', '#7c2d12', '#fef08a'],
  fortress_plate:     ['armor',       'spiked',    '#64748b', '#090d16', '#f6d379'],
  tesla:              ['clockwork',   'fork',      '#c084fc', '#1e1b4b', '#72efdd'],
  warhead:            ['explosive',   'warhead',   '#ef4444', '#450a0a', '#fde047'],
  berserk:            ['tome_scroll', 'scroll',    '#e11d48', '#4c0519', '#fde047'],
  blood_chalice:      ['vessel',      'chalice',   '#e11d48', '#881337', '#fde68a'],
  chrono_watch:       ['timepiece',   'watch',     '#cbd5e1', '#0f172a', '#38bdf8'],
  overclock_core:     ['clockwork',   'battery',   '#c084fc', '#1e1b4b', '#72efdd'],
  frost_prism:        ['optics',      'prism',     '#7dd3fc', '#0369a1', '#ffffff'],
  plague_flask:       ['vessel',      'flask',     '#4ade80', '#3b0764', '#bef264'],
  assassin_crest:     ['mask',        'fox',       '#ffffff', '#e11d48', '#fde68a'],
  turret_link_core:   ['clockwork',   'spring',    '#38bdf8', '#1e293b', '#fbbf24'],
  alchemist_reactor:  ['core_sphere', 'orb',       '#fb923c', '#4c1d95', '#72efdd'],
  juggernaut_pauldron:['armor',       'pauldron',  '#a855f7', '#0f172a', '#fbbf24'],
  sacrifice_crown:    ['headgear',    'thorncrown','#e11d48', '#450a0a', '#fde047'],
  golden_scale:       ['curio',       'scale',     '#fbbf24', '#78350f', '#fef9c3'],
  fate_roulette:      ['curio',       'dice',      '#c084fc', '#3b0764', '#fde047'],
  phantom_cylinder:   ['ammo_quiver', 'cylinder',  '#a855f7', '#1e1b4b', '#72efdd'],
  reaper_scope:       ['optics',      'scope',     '#c084fc', '#0f172a', '#fb7185'],
  hunting_trophy:     ['wing_feather','feather',   '#fbbf24', '#78350f', '#ffffff'],
  giant_slayer_belt:  ['belt',        'sash',      '#eab308', '#1e1b4b', '#38bdf8'],
  wind_dynamo:        ['clockwork',   'battery',   '#2dd4bf', '#064e3b', '#fde047'],
  blood_covenant:     ['tome_scroll', 'seal',      '#e11d48', '#4c0519', '#fde68a'],
  glass_cannon_core:  ['optics',      'prism',     '#f43f5e', '#31102f', '#fde047'],
  wisdom_scroll:      ['tome_scroll', 'scroll',    '#38bdf8', '#1e1b4b', '#fde047'],
  lone_war_banner:    ['tag_bell',    'tassel',    '#ef4444', '#450a0a', '#fbbf24'],
  vigilante_ring:     ['ring',        'arcane',    '#fde047', '#312e81', '#72efdd'],
  mithril_alloy:      ['whetstone',   'stone',     '#7dd3fc', '#312e81', '#fde047'],
  abyss_twin_embryo:  ['curio',       'heart',     '#a855f7', '#064e3b', '#4ade80'],
  emerald_fourleaf:   ['wing_feather','leaf',      '#10b981', '#064e3b', '#fde047'],
  shark_dorsal_fin:   ['blade_relic', 'windblade', '#38bdf8', '#0c4a6e', '#f43f5e'],
  peacock_plume_crown:['headgear',    'crown',     '#2dd4bf', '#1e3a8a', '#fde047'],
  mastery_codex:      ['tome_scroll', 'book',      '#f59e0b', '#451a03', '#fef08a'],
  compound_ledger:    ['tome_scroll', 'book',      '#eab308', '#0f172a', '#4ade80'],
  ironblood_grit:     ['armor',       'cuirass',   '#dc2626', '#1e293b', '#fde047'],
  flow_metronome:     ['timepiece',   'pendulum',  '#c084fc', '#0f172a', '#72efdd'],

  // --- T4 传说遗物 (24) ---
  reactor:            ['core_sphere', 'orb',       '#fde047', '#b45309', '#ffffff'],
  anvil:              ['curio',       'anvil',     '#94a3b8', '#1e293b', '#fbbf24'],
  cornucopia:         ['vessel',      'chalice',   '#fbbf24', '#78350f', '#4ade80'],
  soul_harvester:     ['blade_relic', 'scythe',    '#c084fc', '#0f172a', '#72efdd'],
  aegis_core:         ['clockwork',   'box',       '#72efdd', '#0f172a', '#fde047'],
  hermes_wings:       ['wing_feather','wings',     '#2dd4bf', '#065f46', '#fef08a'],
  star_crown:         ['headgear',    'crown',     '#fde047', '#1e3a8a', '#7dd3fc'],
  doom_edge:          ['blade_relic', 'shard',     '#f43f5e', '#090514', '#fde047'],
  omega_factory:      ['clockwork',   'turret',    '#fb923c', '#1e293b', '#fde047'],
  architect_soul:     ['clockwork',   'spring',    '#fde047', '#451a03', '#72efdd'],
  archmage_crown:     ['headgear',    'crown',     '#c084fc', '#1e1b4b', '#fde047'],
  doomsday_warhead:   ['explosive',   'warhead',   '#fb923c', '#090514', '#fde047'],
  titan_breaker:      ['blade_relic', 'sword',     '#fb7185', '#4c0519', '#fde047'],
  fox_parry_sheath:   ['blade_relic', 'sheath',    '#e11d48', '#0f172a', '#fde68a'],
  kenshin_scroll:     ['tome_scroll', 'scroll',    '#fb7185', '#4c0519', '#fde047'],
  trinity_orb:        ['core_sphere', 'orb',       '#38bdf8', '#c084fc', '#fb923c'],
  twin_hourglass:     ['timepiece',   'hourglass', '#fde047', '#3b0764', '#72efdd'],
  infinite_bandolier: ['belt',        'bandolier', '#fde047', '#78350f', '#38bdf8'],
  celestial_arsenal_box:['clockwork', 'box',       '#38bdf8', '#1e1b4b', '#fde047'],
  astral_god_eye:     ['optics',      'eye',       '#fde047', '#1e1b4b', '#72efdd'],
  qingyu_hoodie:      ['cloak',       'hood',      '#10b981', '#090d16', '#fde047'],
  crimson_grail:      ['vessel',      'chalice',   '#f43f5e', '#4c0519', '#fde047'],
  phoenix_blood_feather:['wing_feather','feather', '#fb923c', '#991b1b', '#fde047'],
  forbidden_codex:    ['tome_scroll', 'book',      '#a855f7', '#090514', '#fde047'],

  // --- 秘髓补给 (CRATE_SUPPLIES & 兜底) ---
  sup_titan:          ['vessel',      'flask',     '#4ade80', '#064e3b', '#fde047'],
  sup_hyper:          ['clockwork',   'spring',    '#38bdf8', '#0f172a', '#fde047'],
  sup_aegis:          ['armor',       'cuirass',   '#72efdd', '#0f172a', '#fde047'],
  sup_gems:           ['optics',      'prism',     '#fde047', '#78350f', '#ffffff'],
  sup_mythic_dragon:  ['curio',       'heart',     '#ff2a55', '#450a0a', '#fde047'],
  sup_fallback_core:  ['core_sphere', 'orb',       '#72efdd', '#0f172a', '#fde047']
};

function _rGrad(g, x0, y0, x1, y1, c0, c1, c2) {
  const grd = g.createLinearGradient(x0, y0, x1, y1);
  grd.addColorStop(0, c0);
  if (c2) {
    grd.addColorStop(0.52, c1);
    grd.addColorStop(1, c2);
  } else {
    grd.addColorStop(1, c1);
  }
  return grd;
}

function _rStar(g, x, y, r, col) {
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

function _paintRelicArt(g, id, tier = 1) {
  const spec = RELIC_ART_SPECS[id] || ['core_sphere', 'orb', '#72efdd', '#1e293b', '#f6d379'];
  const [arch, variant, c1, c2, c3] = spec;
  const trim = tier >= 4 ? '#fde047' : (tier === 3 ? '#d8b4fe' : (tier === 2 ? '#7dd3fc' : '#cbd5e1'));

  // 品阶底徽光环（纯多边形与圆弧，0 radialGradient / 0 shadowBlur）
  g.save();
  g.globalAlpha = 0.14 + Math.min(4, tier) * 0.04;
  g.fillStyle = c1;
  g.beginPath(); g.arc(0, 1, 24, 0, Math.PI * 2); g.fill();
  if (tier >= 3) {
    g.globalAlpha = tier >= 4 ? 0.62 : 0.40;
    g.strokeStyle = trim;
    g.lineWidth = 1.15;
    g.beginPath(); g.arc(0, 1, 25.5, -Math.PI * 0.8, Math.PI * 0.8); g.stroke();
  }
  g.restore();

  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = 1.75;
  g.strokeStyle = '#090710';

  if (arch === 'cloak') {
    // 斗篷 / 连帽衫 / 观星披风 / 风语披肩（带尖顶风帽或毛领、衣褶刻线与黄金领扣，彻底告别斧头错图！）
    g.fillStyle = _rGrad(g, -18, -22, 18, 24, c1, c2);
    g.beginPath();
    if (variant === 'hood') {
      // 尖顶猎林/暗影连帽斗篷
      g.moveTo(0, -25);
      g.quadraticCurveTo(11, -20, 12, -9);
      g.quadraticCurveTo(21, 4, 22, 21);
      g.quadraticCurveTo(11, 24, 3, 21);
      g.lineTo(0, 8);
      g.lineTo(-3, 21);
      g.quadraticCurveTo(-11, 24, -22, 21);
      g.quadraticCurveTo(-21, 4, -12, -9);
      g.quadraticCurveTo(-11, -20, 0, -25);
    } else if (variant === 'shawl') {
      // 青岚风语轻盈羽披肩
      g.moveTo(-14, -15);
      g.quadraticCurveTo(0, -20, 14, -15);
      g.quadraticCurveTo(24, -2, 21, 16);
      g.lineTo(13, 12); g.lineTo(8, 20); g.lineTo(0, 10);
      g.lineTo(-8, 20); g.lineTo(-13, 12); g.lineTo(-21, 16);
      g.quadraticCurveTo(-24, -2, -14, -15);
    } else {
      // 皇家高领长披风
      g.moveTo(-13, -18);
      g.lineTo(-16, -23); g.quadraticCurveTo(0, -19, 16, -23); g.lineTo(13, -18);
      g.quadraticCurveTo(22, 2, 23, 22);
      g.quadraticCurveTo(0, 26, -23, 22);
      g.quadraticCurveTo(-22, 2, -13, -18);
    }
    g.closePath(); g.fill(); g.stroke();
    if (variant === 'hood') {
      g.fillStyle = '#090710';
      g.beginPath(); g.ellipse(0, -11, 6.2, 7.5, 0, 0, Math.PI * 2); g.fill();
    }
    // 垂坠衣褶高光与金色领扣
    g.strokeStyle = 'rgba(255,255,255,0.34)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-9, -4); g.lineTo(-14, 17); g.moveTo(9, -4); g.lineTo(14, 17); g.stroke();
    g.strokeStyle = '#090710'; g.lineWidth = 1.5;
    g.fillStyle = c3;
    g.beginPath(); g.moveTo(0, -7); g.lineTo(4.5, -3); g.lineTo(0, 1); g.lineTo(-4.5, -3); g.closePath(); g.fill(); g.stroke();
  } else if (arch === 'whetstone') {
    // 守桥砺剑石：双层斜切青灰油石底座 + 斜搭寒光刀锋与磨刃金星
    g.fillStyle = _rGrad(g, -22, -4, 20, 18, c1, c2);
    g.beginPath();
    g.moveTo(-22, 6); g.lineTo(6, -8); g.lineTo(22, 0); g.lineTo(-6, 14); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#1e293b';
    g.beginPath();
    g.moveTo(-22, 6); g.lineTo(-6, 14); g.lineTo(22, 0); g.lineTo(22, 6); g.lineTo(-6, 20); g.lineTo(-22, 12); g.closePath();
    g.fill(); g.stroke();
    // 磨砺中的钢刃局部与火花
    g.fillStyle = _rGrad(g, -16, -20, 14, 2, '#ffffff', '#cbd5e1', '#64748b');
    g.beginPath(); g.moveTo(-16, -18); g.lineTo(14, -3); g.lineTo(8, 2); g.lineTo(-19, -12); g.closePath(); g.fill(); g.stroke();
    _rStar(g, 4, -5, 5.2, c3);
    _rStar(g, -5, -9, 3.4, '#ffffff');
  } else if (arch === 'headgear') {
    if (variant === 'bandana') {
      g.fillStyle = _rGrad(g, -22, -8, 22, 10, c1, c2);
      g.beginPath();
      g.moveTo(-20, -4); g.quadraticCurveTo(0, -11, 20, -4);
      g.lineTo(18, 5); g.quadraticCurveTo(0, -1, -18, 5); g.closePath();
      g.fill(); g.stroke();
      g.beginPath(); g.moveTo(15, 1); g.lineTo(25, 12); g.lineTo(19, 15); g.lineTo(11, 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.roundRect(-7, -6.5, 14, 7.5, 2); g.fill(); g.stroke();
    } else if (variant === 'wizhat') {
      g.fillStyle = _rGrad(g, -22, -22, 22, 16, c1, c2);
      g.beginPath(); g.ellipse(0, 12, 23, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath();
      g.moveTo(-13, 11); g.quadraticCurveTo(-7, -10, 7, -23);
      g.quadraticCurveTo(4, -7, 13, 11); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = c3;
      g.fillRect(-12, 6, 24, 4); g.strokeRect(-12, 6, 24, 4);
      _rStar(g, 2, -6, 4.2, c3);
    } else if (variant === 'thorncrown') {
      g.strokeStyle = c2; g.lineWidth = 5.5;
      g.beginPath(); g.ellipse(0, 2, 18, 11, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = c1; g.lineWidth = 3.0;
      g.beginPath(); g.ellipse(0, 2, 18, 11, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#090710'; g.lineWidth = 1.5; g.fillStyle = c3;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI * 2) / 8;
        const x = Math.cos(a) * 18, y = 2 + Math.sin(a) * 11;
        g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6 - 3); g.lineTo(x + 2, y); g.closePath(); g.fill(); g.stroke();
      }
    } else {
      g.fillStyle = _rGrad(g, -20, -16, 20, 14, '#fffbeb', c1, c2);
      g.beginPath();
      g.moveTo(-18, 13); g.lineTo(-20, -6); g.lineTo(-10, 3); g.lineTo(0, -16);
      g.lineTo(10, 3); g.lineTo(20, -6); g.lineTo(18, 13); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.moveTo(0, -4); g.lineTo(4, 2); g.lineTo(0, 8); g.lineTo(-4, 2); g.closePath(); g.fill(); g.stroke();
    }
  } else if (arch === 'mask') {
    g.fillStyle = _rGrad(g, -16, -20, 16, 20, '#ffffff', c1, '#cbd5e1');
    g.beginPath();
    if (variant === 'fox') {
      g.moveTo(-15, -6); g.lineTo(-17, -23); g.lineTo(-5, -14);
      g.quadraticCurveTo(0, -15, 5, -14);
      g.lineTo(17, -23); g.lineTo(15, -6);
      g.quadraticCurveTo(17, 10, 0, 21);
      g.quadraticCurveTo(-17, 10, -15, -6);
    } else {
      g.ellipse(0, 0, 16, 21, 0, 0, Math.PI * 2);
    }
    g.closePath(); g.fill(); g.stroke();
    // 狐面红纹 / 裂纹瓷面
    g.strokeStyle = c2; g.lineWidth = 2.0;
    g.beginPath();
    g.moveTo(-10, -2); g.lineTo(-4, 0); g.moveTo(10, -2); g.lineTo(4, 0);
    if (variant === 'cracked') {
      g.moveTo(3, -20); g.lineTo(-2, -6); g.lineTo(4, 4); g.lineTo(-1, 20);
    }
    g.stroke();
  } else if (arch === 'armor') {
    g.fillStyle = _rGrad(g, -20, -20, 20, 22, c1, c2);
    g.beginPath();
    g.moveTo(-12, -19); g.lineTo(-22, -12); g.lineTo(-17, 2); g.lineTo(-13, 20);
    g.lineTo(0, 23); g.lineTo(13, 20); g.lineTo(17, 2); g.lineTo(22, -12); g.lineTo(12, -19);
    g.quadraticCurveTo(0, -13, -12, -19);
    g.closePath(); g.fill(); g.stroke();
    if (variant === 'spiked') {
      g.fillStyle = c3;
      for (const sx of [-19, 19]) {
        g.beginPath(); g.moveTo(sx, -13); g.lineTo(sx + (sx < 0 ? -7 : 7), -21); g.lineTo(sx * 0.7, -17); g.closePath(); g.fill(); g.stroke();
      }
    }
    g.strokeStyle = c3; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(0, -13); g.lineTo(0, 18); g.moveTo(-10, -3); g.lineTo(10, -3); g.stroke();
  } else if (arch === 'footwear') {
    if (variant === 'anklet') {
      g.strokeStyle = c1; g.lineWidth = 4.2;
      g.beginPath(); g.ellipse(0, -2, 16, 9, -0.15, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#090710'; g.lineWidth = 1.5;
      g.fillStyle = c3;
      for (const bx of [-7, 7]) {
        g.beginPath(); g.arc(bx, 10, 4.8, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    } else {
      g.fillStyle = _rGrad(g, -14, -20, 18, 20, c1, c2);
      g.beginPath();
      g.moveTo(-11, -19); g.lineTo(4, -19); g.lineTo(6, 5);
      g.quadraticCurveTo(20, 8, 21, 18); g.lineTo(-14, 18); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.moveTo(-11, -9); g.lineTo(-21, -15); g.lineTo(-12, -2); g.closePath(); g.fill(); g.stroke();
    }
  } else if (arch === 'gauntlet') {
    g.fillStyle = _rGrad(g, -16, -18, 16, 18, c1, c2);
    g.beginPath(); g.roundRect(-12, -14, 24, 28, 6); g.fill(); g.stroke();
    g.fillStyle = c3;
    for (const sy of [-8, 0, 8]) {
      g.beginPath(); g.moveTo(11, sy - 3); g.lineTo(22, sy); g.lineTo(11, sy + 3); g.closePath(); g.fill(); g.stroke();
    }
  } else if (arch === 'belt') {
    if (variant === 'bandolier') {
      g.fillStyle = _rGrad(g, -20, -20, 20, 20, c2, '#1c1917');
      g.beginPath(); g.moveTo(-22, -14); g.lineTo(-13, -22); g.lineTo(22, 13); g.lineTo(13, 22); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c3;
      for (let k = -2; k <= 2; k++) {
        g.save(); g.translate(k * 6.2, k * 6.2); g.rotate(-Math.PI * 0.25);
        g.beginPath(); g.roundRect(-2.4, -7, 4.8, 14, 2); g.fill(); g.stroke();
        g.restore();
      }
    } else {
      g.fillStyle = _rGrad(g, -23, -8, 23, 8, c1, c2);
      g.beginPath(); g.roundRect(-23, -7, 46, 14, 4); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.moveTo(0, -11); g.lineTo(10, 0); g.lineTo(0, 11); g.lineTo(-10, 0); g.closePath(); g.fill(); g.stroke();
    }
  } else if (arch === 'wing_feather') {
    g.fillStyle = _rGrad(g, -20, -20, 20, 20, '#ffffff', c1, c2);
    if (variant === 'wings') {
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * 2, 6); g.quadraticCurveTo(sx * 22, -22, sx * 24, -4);
        g.quadraticCurveTo(sx * 18, 12, sx * 3, 15); g.closePath(); g.fill(); g.stroke();
      }
    } else {
      g.beginPath();
      g.moveTo(-16, 18); g.quadraticCurveTo(-14, -8, 16, -20);
      g.quadraticCurveTo(12, 10, -16, 18); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = c3; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-18, 20); g.lineTo(13, -17); g.stroke();
    }
  } else if (arch === 'optics') {
    if (variant === 'prism') {
      g.fillStyle = _rGrad(g, -16, -20, 16, 20, '#ffffff', c1, c2);
      g.beginPath();
      g.moveTo(0, -22); g.lineTo(17, -5); g.lineTo(11, 20); g.lineTo(-11, 20); g.lineTo(-17, -5);
      g.closePath(); g.fill(); g.stroke();
      _rStar(g, -4, -6, 4.5, '#ffffff');
    } else if (variant === 'eye') {
      g.fillStyle = _rGrad(g, -22, -12, 22, 12, c2, c1);
      g.beginPath(); g.moveTo(-23, 0); g.quadraticCurveTo(0, -18, 23, 0); g.quadraticCurveTo(0, 18, -23, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.arc(0, 0, 8.5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#090710';
      g.beginPath(); g.ellipse(0, 0, 2.8, 6.8, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = _rGrad(g, -16, -16, 16, 16, '#e0f2fe', c1, c2);
      g.beginPath(); g.arc(0, -1, 15, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = c3; g.lineWidth = 2.6;
      g.beginPath(); g.arc(0, -1, 15, 0, Math.PI * 2); g.stroke();
      if (variant === 'scope') {
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-19, -1); g.lineTo(19, -1); g.moveTo(0, -20); g.lineTo(0, 18); g.stroke();
      }
    }
  } else if (arch === 'ammo_quiver') {
    if (variant === 'cylinder') {
      g.fillStyle = _rGrad(g, -18, -18, 18, 18, c1, c2);
      g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = c3;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI * 2) / 6;
        g.beginPath(); g.arc(Math.cos(a) * 10, Math.sin(a) * 10, 3.6, 0, Math.PI * 2); g.fill(); g.stroke();
      }
    } else if (variant === 'quiver') {
      g.fillStyle = _rGrad(g, -14, -14, 14, 20, c2, '#292524');
      g.beginPath(); g.moveTo(-12, -6); g.lineTo(6, -12); g.lineTo(14, 18); g.lineTo(-4, 21); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = c3; g.lineWidth = 2.2;
      for (const ax of [-7, 0, 7]) {
        g.beginPath(); g.moveTo(ax - 3, -21); g.lineTo(ax + 2, -6); g.stroke();
      }
    } else {
      g.fillStyle = _rGrad(g, -10, -22, 12, 22, '#fef08a', c1, c2);
      g.beginPath();
      g.moveTo(0, -23); g.quadraticCurveTo(9, -12, 9, -2); g.lineTo(9, 19); g.lineTo(-9, 19); g.lineTo(-9, -2);
      g.quadraticCurveTo(-9, -12, 0, -23); g.closePath(); g.fill(); g.stroke();
    }
  } else if (arch === 'tag_bell') {
    if (variant === 'bell') {
      g.fillStyle = _rGrad(g, -16, -18, 16, 18, c1, c2);
      g.beginPath();
      g.moveTo(-10, -14); g.quadraticCurveTo(0, -22, 10, -14);
      g.lineTo(18, 13); g.lineTo(-18, 13); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.arc(0, 16, 4.8, 0, Math.PI * 2); g.fill(); g.stroke();
    } else if (variant === 'dogtag' || variant === 'plaque') {
      g.fillStyle = _rGrad(g, -14, -20, 14, 20, '#ffffff', c1, c2);
      g.beginPath(); g.roundRect(-13, -18, 26, 36, 5); g.fill(); g.stroke();
      g.fillStyle = '#090710';
      g.beginPath(); g.arc(0, -12, 2.6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c3; g.lineWidth = 2.0;
      g.beginPath(); g.moveTo(-7, -2); g.lineTo(7, -2); g.moveTo(-7, 5); g.lineTo(7, 5); g.stroke();
    } else if (variant === 'collar') {
      g.strokeStyle = c1; g.lineWidth = 5.5;
      g.beginPath(); g.arc(0, 1, 16, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#090710'; g.lineWidth = 1.6;
      g.beginPath(); g.arc(0, 1, 18.8, 0, Math.PI * 2); g.stroke();
    } else {
      g.fillStyle = _rGrad(g, -12, -20, 12, 22, '#ffffff', c1, c2);
      g.beginPath();
      g.moveTo(0, -21); g.quadraticCurveTo(14, -4, 3, 21); g.quadraticCurveTo(-12, -2, 0, -21);
      g.closePath(); g.fill(); g.stroke();
    }
  } else if (arch === 'ring') {
    g.strokeStyle = '#090710'; g.lineWidth = 7.2;
    g.beginPath(); g.ellipse(0, 4, 16, 11, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = trim; g.lineWidth = 4.2;
    g.beginPath(); g.ellipse(0, 4, 16, 11, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#090710'; g.lineWidth = 1.6;
    g.fillStyle = _rGrad(g, -8, -19, 8, -3, '#ffffff', c1, c2);
    g.beginPath(); g.moveTo(0, -20); g.lineTo(9, -10); g.lineTo(0, -2); g.lineTo(-9, -10); g.closePath(); g.fill(); g.stroke();
  } else if (arch === 'timepiece') {
    if (variant === 'hourglass') {
      g.fillStyle = _rGrad(g, -14, -20, 14, 20, '#ffffff', c1, c2);
      g.beginPath();
      g.moveTo(-14, -18); g.lineTo(14, -18); g.lineTo(3, 0); g.lineTo(14, 18); g.lineTo(-14, 18); g.lineTo(-3, 0);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.fillRect(-16, -21, 32, 4); g.strokeRect(-16, -21, 32, 4);
      g.fillRect(-16, 17, 32, 4); g.strokeRect(-16, 17, 32, 4);
    } else if (variant === 'pendulum') {
      g.strokeStyle = c3; g.lineWidth = 3.0;
      g.beginPath(); g.moveTo(-6, -22); g.lineTo(4, 8); g.stroke();
      g.strokeStyle = '#090710'; g.lineWidth = 1.6;
      g.fillStyle = _rGrad(g, -8, 0, 16, 22, '#fef08a', c1, c2);
      g.beginPath(); g.arc(5, 11, 11, 0, Math.PI * 2); g.fill(); g.stroke();
    } else {
      g.fillStyle = _rGrad(g, -18, -16, 18, 18, '#f8fafc', c1, c2);
      g.beginPath(); g.arc(0, 2, 17, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#0f172a';
      g.beginPath(); g.arc(0, 2, 12.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c3; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(0, 2); g.lineTo(0, -6); g.moveTo(0, 2); g.lineTo(7, 4); g.stroke();
    }
  } else if (arch === 'clockwork') {
    if (variant === 'box') {
      g.fillStyle = _rGrad(g, -18, -14, 18, 18, c1, c2);
      g.beginPath(); g.roundRect(-19, -13, 38, 28, 4); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.arc(0, 1, 6, 0, Math.PI * 2); g.fill(); g.stroke();
    } else if (variant === 'fork') {
      g.strokeStyle = c1; g.lineWidth = 4.2;
      g.beginPath(); g.moveTo(-9, -20); g.lineTo(-9, 2); g.quadraticCurveTo(0, 10, 9, 2); g.lineTo(9, -20); g.moveTo(0, 7); g.lineTo(0, 22); g.stroke();
      _rStar(g, 0, -14, 5.2, c3);
    } else if (variant === 'turret') {
      g.fillStyle = _rGrad(g, -16, -18, 16, 20, c1, c2);
      g.beginPath(); g.moveTo(-16, 19); g.lineTo(-10, -2); g.lineTo(10, -2); g.lineTo(16, 19); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -6, 9.5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.fillRect(6, -10, 14, 5); g.strokeRect(6, -10, 14, 5);
    } else if (variant === 'drone') {
      g.fillStyle = '#e0f2fe';
      for (const sx of [-1, 1]) {
        g.beginPath(); g.ellipse(sx * 13, -7, 10, 4.5, sx * -0.35, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.fillStyle = _rGrad(g, -10, -12, 10, 14, c1, c2);
      g.beginPath(); g.ellipse(0, 2, 10, 13, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      _rStar(g, 0, 1, 4.5, c3);
    } else if (variant === 'battery') {
      g.fillStyle = _rGrad(g, -13, -18, 13, 18, c2, '#090d16');
      g.beginPath(); g.roundRect(-13, -16, 26, 34, 4); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.fillRect(-6, -21, 12, 5); g.strokeRect(-6, -21, 12, 5);
      g.fillStyle = c1;
      for (const by of [-8, 1, 10]) g.fillRect(-8, by - 3, 16, 5.5);
    } else {
      g.fillStyle = _rGrad(g, -18, -18, 18, 18, '#fef9c3', c1, c2);
      g.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI * 2) / 16;
        const r = k % 2 === 0 ? 18.5 : 13.5;
        if (k === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#0f172a';
      g.beginPath(); g.arc(0, 0, 6.5, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  } else if (arch === 'blade_relic') {
    g.fillStyle = _rGrad(g, -18, -20, 18, 20, '#ffffff', c1, c2);
    if (variant === 'scythe') {
      g.strokeStyle = c3; g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(-14, 21); g.lineTo(8, -18); g.stroke();
      g.strokeStyle = '#090710'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(6, -18); g.quadraticCurveTo(-18, -18, -21, 2); g.quadraticCurveTo(-8, -9, 9, -11); g.closePath(); g.fill(); g.stroke();
    } else if (variant === 'hook') {
      g.beginPath();
      g.moveTo(-6, -20); g.quadraticCurveTo(18, -18, 15, 4); g.quadraticCurveTo(12, 19, -8, 16);
      g.quadraticCurveTo(6, 12, 7, 1); g.quadraticCurveTo(9, -10, -6, -12); g.closePath(); g.fill(); g.stroke();
    } else if (variant === 'sheath') {
      g.fillStyle = _rGrad(g, -18, -18, 18, 18, c1, c2);
      g.beginPath(); g.moveTo(-18, 15); g.quadraticCurveTo(0, 2, 16, -18); g.lineTo(21, -13); g.quadraticCurveTo(4, 8, -13, 20); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.arc(10, -8, 5, 0, Math.PI * 2); g.fill(); g.stroke();
    } else if (variant === 'shard') {
      g.beginPath(); g.moveTo(0, -23); g.lineTo(14, -4); g.lineTo(5, 22); g.lineTo(-13, 8); g.lineTo(-7, -12); g.closePath(); g.fill(); g.stroke();
      _rStar(g, 2, -4, 5.2, c3);
    } else {
      g.beginPath(); g.moveTo(-16, 16); g.lineTo(16, -20); g.lineTo(20, -14); g.lineTo(-10, 20); g.closePath(); g.fill(); g.stroke();
      _rStar(g, 12, -14, 4.6, c3);
    }
  } else if (arch === 'vessel') {
    if (variant === 'teacup') {
      g.fillStyle = _rGrad(g, -16, -8, 16, 16, '#ffffff', '#e2e8f0');
      g.beginPath(); g.moveTo(-15, -6); g.lineTo(15, -6); g.quadraticCurveTo(13, 14, 0, 14); g.quadraticCurveTo(-13, 14, -15, -6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c1;
      g.beginPath(); g.ellipse(0, -6, 13, 3.8, 0, 0, Math.PI * 2); g.fill();
    } else if (variant === 'chalice') {
      g.fillStyle = _rGrad(g, -15, -18, 15, 20, '#fef08a', c1, c2);
      g.beginPath();
      g.moveTo(-15, -18); g.lineTo(15, -18); g.quadraticCurveTo(12, 1, 3, 4);
      g.lineTo(3, 15); g.lineTo(11, 19); g.lineTo(-11, 19); g.lineTo(-3, 15); g.lineTo(-3, 4);
      g.quadraticCurveTo(-12, 1, -15, -18); g.closePath(); g.fill(); g.stroke();
    } else if (variant === 'syringe') {
      g.save(); g.rotate(-Math.PI * 0.25);
      g.fillStyle = _rGrad(g, -6, -16, 6, 16, '#e0f2fe', c1, c2);
      g.beginPath(); g.roundRect(-5.5, -12, 11, 24, 2.5); g.fill(); g.stroke();
      g.strokeStyle = c3; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(0, -12); g.lineTo(0, -23); g.moveTo(-6, 18); g.lineTo(6, 18); g.moveTo(0, 12); g.lineTo(0, 18); g.stroke();
      g.restore();
    } else if (variant === 'oilcan') {
      g.fillStyle = _rGrad(g, -18, -6, 14, 18, '#fef08a', c1, c2);
      g.beginPath(); g.moveTo(-16, 17); g.lineTo(-12, -4); g.lineTo(8, -4); g.lineTo(12, 17); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = c1; g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(8, 2); g.lineTo(22, -12); g.stroke();
    } else {
      g.fillStyle = _rGrad(g, -14, -8, 14, 20, '#ffffff', c1, c2);
      g.beginPath();
      g.moveTo(-5, -19); g.lineTo(5, -19); g.lineTo(5, -9);
      g.quadraticCurveTo(17, 0, 15, 16); g.quadraticCurveTo(0, 22, -15, 16);
      g.quadraticCurveTo(-17, 0, -5, -9); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fde68a';
      g.fillRect(-6, -22, 12, 4); g.strokeRect(-6, -22, 12, 4);
    }
  } else if (arch === 'tome_scroll') {
    if (variant === 'scroll') {
      g.fillStyle = _rGrad(g, -16, -18, 16, 18, '#fef3c7', '#fde68a', '#d97706');
      g.beginPath(); g.roundRect(-13, -17, 26, 34, 3); g.fill(); g.stroke();
      g.fillStyle = c1;
      g.fillRect(-16, -20, 32, 5); g.strokeRect(-16, -20, 32, 5);
      g.fillRect(-16, 15, 32, 5); g.strokeRect(-16, 15, 32, 5);
      _rStar(g, 0, 0, 5.5, c1);
    } else if (variant === 'seal') {
      g.fillStyle = _rGrad(g, -18, -18, 18, 18, '#fda4af', c1, c2);
      g.beginPath(); g.arc(0, 0, 17.5, 0, Math.PI * 2); g.fill(); g.stroke();
      _rStar(g, 0, 0, 9.5, c3);
    } else {
      g.fillStyle = _rGrad(g, -16, -20, 16, 20, c1, c2);
      g.beginPath(); g.roundRect(-15, -19, 30, 38, 3.5); g.fill(); g.stroke();
      g.fillStyle = '#fef3c7';
      g.fillRect(11, -17, 4, 34);
      _rStar(g, -1, 0, 6.5, c3);
    }
  } else if (arch === 'explosive') {
    if (variant === 'mine') {
      g.fillStyle = _rGrad(g, -16, -16, 16, 16, c2, '#090d16');
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4 + Math.PI / 8;
        if (k === 0) g.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
        else g.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
      }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.arc(0, 0, 6.2, 0, Math.PI * 2); g.fill(); g.stroke();
    } else if (variant === 'warhead') {
      g.fillStyle = _rGrad(g, -12, -22, 12, 20, c3, c1, c2);
      g.beginPath();
      g.moveTo(0, -23); g.quadraticCurveTo(12, -8, 10, 14); g.lineTo(16, 21); g.lineTo(-16, 21); g.lineTo(-10, 14);
      g.quadraticCurveTo(-12, -8, 0, -23); g.closePath(); g.fill(); g.stroke();
    } else {
      g.fillStyle = _rGrad(g, -16, -16, 16, 18, c1, c2);
      g.beginPath(); g.arc(0, 3, 15.5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = c3; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(4, -12); g.quadraticCurveTo(12, -20, 18, -16); g.stroke();
      _rStar(g, 19, -16, 4.8, '#fde047');
    }
  } else if (arch === 'curio') {
    if (variant === 'heart') {
      g.fillStyle = _rGrad(g, -16, -16, 16, 20, '#fda4af', c1, c2);
      g.beginPath();
      g.moveTo(0, 19); g.bezierCurveTo(-22, 4, -20, -18, 0, -8);
      g.bezierCurveTo(20, -18, 22, 4, 0, 19); g.closePath(); g.fill(); g.stroke();
    } else if (variant === 'anvil') {
      g.fillStyle = _rGrad(g, -22, -10, 22, 18, '#e2e8f0', c1, c2);
      g.beginPath();
      g.moveTo(-23, -8); g.lineTo(18, -8); g.lineTo(15, 1); g.lineTo(7, 4);
      g.lineTo(13, 18); g.lineTo(-14, 18); g.lineTo(-8, 4); g.quadraticCurveTo(-18, 0, -23, -8);
      g.closePath(); g.fill(); g.stroke();
      _rStar(g, 0, -14, 5.0, c3);
    } else if (variant === 'scale') {
      g.strokeStyle = c1; g.lineWidth = 3.0;
      g.beginPath(); g.moveTo(0, -19); g.lineTo(0, 19); g.moveTo(-18, -10); g.lineTo(18, -10); g.moveTo(-10, 19); g.lineTo(10, 19); g.stroke();
      g.strokeStyle = '#090710'; g.lineWidth = 1.5; g.fillStyle = c3;
      for (const sx of [-16, 16]) {
        g.beginPath(); g.arc(sx, 5, 6.5, 0, Math.PI, false); g.closePath(); g.fill(); g.stroke();
      }
    } else if (variant === 'dice') {
      g.fillStyle = _rGrad(g, -16, -16, 16, 16, '#ffffff', c1, c2);
      g.beginPath(); g.roundRect(-15, -15, 30, 30, 5); g.fill(); g.stroke();
      g.fillStyle = c3;
      for (const [dx, dy] of [[-7, -7], [7, -7], [0, 0], [-7, 7], [7, 7]]) {
        g.beginPath(); g.arc(dx, dy, 2.6, 0, Math.PI * 2); g.fill();
      }
    } else if (variant === 'flute') {
      g.save(); g.rotate(-Math.PI * 0.22);
      g.fillStyle = _rGrad(g, -22, -4, 22, 4, '#ffffff', c1, '#94a3b8');
      g.beginPath(); g.roundRect(-22, -4, 44, 8, 3.5); g.fill(); g.stroke();
      g.fillStyle = c2;
      for (const hx of [-10, -2, 6, 14]) { g.beginPath(); g.arc(hx, 0, 1.8, 0, Math.PI * 2); g.fill(); }
      g.restore();
    } else if (variant === 'tentacle') {
      g.strokeStyle = c1; g.lineWidth = 6.5;
      g.beginPath(); g.moveTo(-14, 19); g.bezierCurveTo(-18, -4, 16, 6, 12, -19); g.stroke();
      g.strokeStyle = c3; g.lineWidth = 2.0;
      g.beginPath(); g.moveTo(-14, 19); g.bezierCurveTo(-18, -4, 16, 6, 12, -19); g.stroke();
    } else if (variant === 'wick') {
      g.fillStyle = _rGrad(g, -8, -4, 8, 20, '#fef3c7', '#cbd5e1');
      g.beginPath(); g.roundRect(-7, 0, 14, 19, 2.5); g.fill(); g.stroke();
      g.fillStyle = _rGrad(g, -8, -22, 8, -2, '#ffffff', c1, c2);
      g.beginPath(); g.moveTo(0, -23); g.quadraticCurveTo(10, -10, 0, -2); g.quadraticCurveTo(-10, -10, 0, -23); g.closePath(); g.fill(); g.stroke();
    } else if (variant === 'gargoyle') {
      g.fillStyle = _rGrad(g, -18, -18, 18, 20, c1, c2);
      g.beginPath();
      g.moveTo(-12, -10); g.lineTo(-20, -22); g.lineTo(-5, -15); g.lineTo(5, -15); g.lineTo(20, -22); g.lineTo(12, -10);
      g.lineTo(15, 10); g.lineTo(0, 21); g.lineTo(-15, 10); g.closePath(); g.fill(); g.stroke();
      _rStar(g, -6, -1, 3.2, c3); _rStar(g, 6, -1, 3.2, c3);
    } else if (variant === 'bonsai') {
      g.fillStyle = c2;
      g.beginPath(); g.moveTo(-13, 10); g.lineTo(13, 10); g.lineTo(10, 20); g.lineTo(-10, 20); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c1;
      g.beginPath(); g.arc(0, -5, 13, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = c3;
      g.beginPath(); g.arc(-5, -6, 3.2, 0, Math.PI * 2); g.arc(6, -3, 3.2, 0, Math.PI * 2); g.fill();
    } else if (variant === 'pouch' || variant === 'urn') {
      g.fillStyle = _rGrad(g, -15, -14, 15, 20, c1, c2);
      g.beginPath();
      g.moveTo(-8, -15); g.lineTo(8, -15); g.quadraticCurveTo(19, 2, 14, 18);
      g.quadraticCurveTo(0, 22, -14, 18); g.quadraticCurveTo(-19, 2, -8, -15);
      g.closePath(); g.fill(); g.stroke();
      _rStar(g, 0, 3, 5.2, c3);
    } else if (variant === 'magnet') {
      g.strokeStyle = '#090710'; g.lineWidth = 8.5;
      g.beginPath(); g.arc(0, 2, 14, Math.PI, 0, false); g.lineTo(14, 16); g.moveTo(-14, 2); g.lineTo(-14, 16); g.stroke();
      g.strokeStyle = c1; g.lineWidth = 5.2;
      g.beginPath(); g.arc(0, 2, 14, Math.PI, 0, false); g.lineTo(14, 16); g.moveTo(-14, 2); g.lineTo(-14, 16); g.stroke();
    } else {
      g.fillStyle = _rGrad(g, -16, -16, 16, 16, '#ffffff', c1, c2);
      g.beginPath(); g.moveTo(0, -21); g.lineTo(18, 0); g.lineTo(0, 21); g.lineTo(-18, 0); g.closePath(); g.fill(); g.stroke();
      _rStar(g, 0, 0, 5.5, c3);
    }
  } else if (arch === 'core_sphere' && variant === 'chrysalis') {
    g.fillStyle = _rGrad(g, -12, -20, 12, 20, '#fef08a', c1, c2);
    g.beginPath(); g.ellipse(0, 1, 11.5, 20, 0.2, 0, Math.PI * 2); g.fill(); g.stroke();
    _rStar(g, 8, -12, 4.5, c3);
  } else if (arch === 'core_sphere' && variant === 'shield_orb') {
    g.fillStyle = _rGrad(g, -18, -20, 18, 20, '#ffffff', c1, c2);
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 - Math.PI / 2;
      if (k === 0) g.moveTo(Math.cos(a) * 19, Math.sin(a) * 19);
      else g.lineTo(Math.cos(a) * 19, Math.sin(a) * 19);
    }
    g.closePath(); g.fill(); g.stroke();
    _rStar(g, 0, 0, 6.2, c3);
  } else {
    g.fillStyle = _rGrad(g, -16, -16, 16, 16, '#ffffff', c1, c2);
    g.beginPath(); g.arc(0, 0, 16.5, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = c3; g.lineWidth = 2.0;
    g.beginPath(); g.ellipse(0, 0, 22, 8, -0.45, 0, Math.PI * 2); g.stroke();
    _rStar(g, -4, -4, 4.5, '#ffffff');
  }
}

function getItemArtDataUrl(id, tier = 1) {
  if (!id) return '';
  const safeTier = Math.max(1, Math.min(5, tier | 0));
  const key = `${id}|${safeTier}`;
  if (_relicDataUrlCache.has(key)) return _relicDataUrlCache.get(key);
  if (typeof document === 'undefined') return '';

  let url = '';
  try {
    if (!_sharedRelicUrlCanvas) {
      _sharedRelicUrlCanvas = document.createElement('canvas');
      _sharedRelicUrlCanvas.width = 192;
      _sharedRelicUrlCanvas.height = 192;
    }
    const g = _sharedRelicUrlCanvas.getContext('2d');
    if (g) {
      g.clearRect(0, 0, 192, 192);
      g.save();
      g.translate(96, 96);
      g.scale(2.75, 2.75);
      _paintRelicArt(g, id, safeTier);
      g.restore();
      if (typeof _sharedRelicUrlCanvas.toDataURL === 'function') {
        url = _sharedRelicUrlCanvas.toDataURL();
      }
    }
  } catch (_) {
    url = '';
  }

  if (url && url.indexOf('data:image/') === 0) {
    if (_relicDataUrlCache.size >= 260) {
      const oldestKey = _relicDataUrlCache.keys().next().value;
      _relicDataUrlCache.delete(oldestKey);
    }
    _relicDataUrlCache.set(key, url);
  }
  return url;
}

function renderItemEmblemHtml(itemOrId, fallbackTier = 1, fallbackIcon = '✨', imgCls = 'wpn-art-ico') {
  const id = typeof itemOrId === 'string' ? itemOrId : (itemOrId && (itemOrId.id || itemOrId.id_alias));
  const tier = (typeof itemOrId === 'object' && itemOrId && itemOrId.tier) ? itemOrId.tier : fallbackTier;
  const fb = (typeof itemOrId === 'object' && itemOrId && itemOrId.icon) ? itemOrId.icon : fallbackIcon;
  const url = id ? getItemArtDataUrl(id, tier) : '';
  if (url && url.indexOf('data:image/') === 0) {
    return `<img src="${url}" alt="" class="${imgCls}" decoding="async">`;
  }
  return fb || '✨';
}

if (typeof globalThis !== 'undefined') {
  globalThis.RELIC_ART_SPECS = RELIC_ART_SPECS;
  globalThis.getItemArtDataUrl = getItemArtDataUrl;
  globalThis.renderItemEmblemHtml = renderItemEmblemHtml;
}
