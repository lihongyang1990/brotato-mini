// ============================================================================
// 🕯️ 《烬塔残响：第999次救赎》高清原画贴图缓存引擎（4帧动作精灵表 + 左侧半身对话立绘 + 宽银幕剧场CG）
// 性能优化核心：异步 Image 解码 + 一次性离屏预烘焙高分辨率透明贴图与纯白受击剪影，
// 局内单帧百怪仅需极速 ctx.drawImage 批绘（0 实时滤镜 / 0 radialGradient / 0 shadowBlur）！
// 同时兼容 window.__SPIRE_INLINE_ASSETS__（单文件离线版自动直连内存资源）。
// ============================================================================

const SPIRE_STORY_PACK = {
  arenaMaps: {
    foundry:   'assets/spire/scene_1_arena.jpg',
    glacier:   'assets/spire/scene_2_arena.jpg',
    wasteland: 'assets/spire/scene_3_arena.jpg',
    desert:    'assets/spire/scene_4_arena.jpg'
  },
  vistaMaps: {
    foundry:   'assets/spire/scene_1_vista.jpg',
    glacier:   'assets/spire/scene_2_vista.jpg',
    wasteland: 'assets/spire/scene_3_vista.jpg',
    desert:    'assets/spire/scene_4_vista.jpg'
  },
  cutscenes: {},
  // 适配 16 层四幕攀登的 15 段青羽行商层间私语（第 1→2 层 至 第 15→16 层逐层推进伏笔）
  witchWhispers: [
    '青羽轻拂帽檐风翎：「提灯少女，欢迎来到风语行商……哪怕失去了记忆，你的手指依然记得握铳的姿势呢。」',
    '青羽递来一杯温茶：「听见桥头的雨声了吗？第 4 层守桥的红衣剑姬叫烬羽，她戴着半截白狐面，只是怕你看见她哭红的眼眶。」',
    '青羽凝视魂灯青焰：「前方便是第一幕终战了。两把同名同阶的守誓兵装可以共鸣升阶，整备妥当再去赴她的约吧。」',
    '青羽将那枚滚烫的红绳系上你的灯柄：「烬羽终于能睡个好觉了……往上走吧，第二幕永冻冰窟的风雪会更冷一些。」',
    '青羽哈出一口白雾：「第 6 层有极北冰骑统领巡弋，多备些高穿甲或元素兵装，别被寒霜冻住了脚步。」',
    '青羽指尖掠过柜台古卷：「艾丝特莉亚胸前那块停在子夜的银怀表，其实是千年前你亲手托付给她的信物。」',
    '青羽轻叹一声：「第 8 层的冰晶王座就在眼前了……去敲碎那座冰棺吧，她已经独自在暴风雪里站了一千年。」',
    '青羽微笑着替你拂去肩头碎雪：「两把温柔的锁都化作了你的灯火。踏入第三幕倒悬钟楼后，小心空间裂隙机关。」',
    '青羽望向逆转的黄金齿轮：「第 10 层有暗雷统领设伏。伽蓝那孩子嘴硬心软，总把最好的发条核心偷偷塞进我的货箱里。」',
    '青羽整理着羽毛披肩：「伽蓝把自己改造成不会老去的人偶，只为在每一次轮回里亲手测量你的剑与铳够不够快。」',
    '青羽神色肃然：「前面第 12 层就是星晷断罪台了……接住伽蓝的最后一课吧，别让那孩子的漫长等待白费。」',
    '青羽仰望塔顶倒悬的黑日：「三把锁尽数解开，我们已踏入终幕·日蚀镜界。脚下的黑水，映出的全是过往九百九十八具白衣残影。」',
    '青羽将一枚青翠风翎别在你领口：「第 14 层的黑金重盾统领是镜界最后的卫戍。握紧提灯，别让黑日低语动摇心神。」',
    '青羽眼眶微红却笑着眨眼：「你知道吗？我们四个从来不是被困在塔里的怪物——而是自愿替你锁住黑日诅咒的四把钥匙呀。」',
    '青羽深深向你行了一礼：「推开第 16 层那扇黑曜石门吧，零号白衣！斩碎镜中的『日蚀圣女』，我们在第一千道破晓重逢！」'
  ]
};

const SpireAssets = (function () {
  const _imgCache = Object.create(null);
  const _spriteBank = Object.create(null);
  const _sheetBank = Object.create(null);

  // 角色单帧立绘兜底映射
  const HERO_MAP = {
    allrounder:    'assets/spire/hero_zero.png',
    zero:          'assets/spire/hero_zero.png',
    zero_witch:    'assets/spire/hero_zero_witch.png',
    zero_crimson:  'assets/spire/hero_zero_crimson.png',
    zero_astral:   'assets/spire/hero_zero_astral.png',
    brawler:       'assets/spire/hero_jinyu.png',
    ranger:        'assets/spire/hero_astria.png',
    engineer:      'assets/spire/hero_jialan.png',
    ghost:         'assets/spire/hero_qingyu.png',
    multitasker:   'assets/spire/hero_eclipse.png',
    vampire:       'assets/spire/hero_jinyu.png',
    bull:          'assets/spire/hero_jialan.png'
  };

  // 已做质心与脚底基线严密对齐的 1024×256 四帧横版透明精灵表（F0待机 / F1左迈步 / F2右迈步 / F3招牌挥击）
  const HERO_SHEET_MAP = {
    zero:          'assets/spire/hero_zero_sheet.png',
    zero_witch:    'assets/spire/hero_zero_witch_sheet.png',
    zero_crimson:  'assets/spire/hero_zero_crimson_sheet.png',
    zero_astral:   'assets/spire/hero_zero_astral_sheet.png',
    allrounder:    'assets/spire/hero_zero_sheet.png',
    jinyu:         'assets/spire/hero_jinyu_sheet.png',
    brawler:       'assets/spire/hero_jinyu_sheet.png',
    vampire:       'assets/spire/hero_jinyu_sheet.png',
    butcher:       'assets/spire/hero_jinyu_sheet.png',
    astria:        'assets/spire/hero_astria_sheet.png',
    ranger:        'assets/spire/hero_astria_sheet.png',
    frost_queen:   'assets/spire/hero_astria_sheet.png',
    jialan:        'assets/spire/hero_jialan_sheet.png',
    engineer:      'assets/spire/hero_jialan_sheet.png',
    bull:          'assets/spire/hero_jialan_sheet.png',
    void_weaver:   'assets/spire/hero_jialan_sheet.png',
    qingyu:        'assets/spire/hero_qingyu_sheet.png',
    ghost:         'assets/spire/hero_qingyu_sheet.png',
    plague_empress:'assets/spire/hero_qingyu_sheet.png',
    eclipse:       'assets/spire/hero_eclipse_sheet.png',
    multitasker:   'assets/spire/hero_eclipse_sheet.png',
    solar_seraph:  'assets/spire/hero_eclipse_sheet.png'
  };

  // 二阶段觉醒形态 1024×256 四帧横版透明精灵表（原版二头身 Q 版画风 1:1 呼应一阶段，半血实时切换）
  const HERO_P2_SHEET_MAP = {
    jinyu:          'assets/spire/hero_jinyu_p2_sheet.png',
    butcher:        'assets/spire/hero_jinyu_p2_sheet.png',
    astria:         'assets/spire/hero_astria_p2_sheet.png',
    frost_queen:    'assets/spire/hero_astria_p2_sheet.png',
    jialan:         'assets/spire/hero_jialan_p2_sheet.png',
    void_weaver:    'assets/spire/hero_jialan_p2_sheet.png',
    mech_colossus:  'assets/spire/boss_mech_colossus_p2_sheet.png',
    crimson_lord:   'assets/spire/sb_crimson_lord_p2_sheet.png',
    qingyu:         'assets/spire/hero_qingyu_p2_sheet.png',
    plague_empress: 'assets/spire/hero_qingyu_p2_sheet.png',
    eclipse:        'assets/spire/hero_eclipse_p2_sheet.png',
    solar_seraph:   'assets/spire/hero_eclipse_p2_sheet.png'
  };

  // 设定集【左栏二次元半身立绘】高清映射（兼容角色 ID 与首领 variant ID）
  const PORTRAIT_MAP = {
    zero:             'assets/spire/port_zero.jpg',
    zero_witch:       'assets/spire/port_zero_witch.jpg',
    zero_crimson:     'assets/spire/port_zero_crimson.jpg',
    zero_astral:      'assets/spire/port_zero_astral.jpg',
    allrounder:       'assets/spire/port_zero.jpg',
    jinyu:            'assets/spire/port_jinyu.jpg',
    brawler:          'assets/spire/port_jinyu.jpg',
    butcher:          'assets/spire/port_jinyu.jpg',
    crimson_lord:     'assets/spire/port_crimson_lord.jpg',
    pyro_lord:        'assets/spire/port_jinyu.jpg',
    vanguard:         'assets/spire/port_jinyu.jpg',
    astria:           'assets/spire/port_astria.jpg',
    ranger:           'assets/spire/port_astria.jpg',
    frost_queen:      'assets/spire/port_astria.jpg',
    glacial_valkyrie: 'assets/spire/port_astria.jpg',
    jialan:           'assets/spire/port_jialan.jpg',
    engineer:         'assets/spire/port_jialan.jpg',
    void_weaver:      'assets/spire/port_jialan.jpg',
    mech_colossus:    'assets/spire/port_colossus.jpg',
    shadow_stalker:   'assets/spire/port_jialan.jpg',
    storm_siren:      'assets/spire/port_jialan.jpg',
    golden_golem:     'assets/spire/port_jialan.jpg',
    qingyu:           'assets/spire/port_qingyu.jpg',
    ghost:            'assets/spire/port_qingyu.jpg',
    plague_empress:   'assets/spire/port_qingyu.jpg',
    venom_matriarch:  'assets/spire/port_qingyu.jpg',
    eclipse:          'assets/spire/port_eclipse.jpg',
    multitasker:      'assets/spire/port_eclipse.jpg',
    solar_seraph:     'assets/spire/port_eclipse.jpg',
    iron_warden:      'assets/spire/port_eclipse.jpg',
    abyss_devourer:   'assets/spire/port_eclipse.jpg'
  };

  // 二阶段觉醒形态高清半身立绘映射（#161c26 暗石板金框原版画风统一）
  const PORTRAIT_P2_MAP = {
    jinyu:          'assets/spire/port_jinyu_p2.jpg',
    butcher:        'assets/spire/port_jinyu_p2.jpg',
    crimson_lord:   'assets/spire/port_crimson_lord_p2.jpg',
    astria:         'assets/spire/port_astria_p2.jpg',
    frost_queen:    'assets/spire/port_astria_p2.jpg',
    jialan:         'assets/spire/port_jialan_p2.jpg',
    void_weaver:    'assets/spire/port_jialan_p2.jpg',
    mech_colossus:  'assets/spire/port_colossus_p2.jpg',
    qingyu:         'assets/spire/port_qingyu_p2.jpg',
    plague_empress: 'assets/spire/port_qingyu_p2.jpg',
    eclipse:        'assets/spire/port_eclipse_p2.jpg',
    solar_seraph:   'assets/spire/port_eclipse_p2.jpg'
  };

  const PROP_MAP = {
    foundry:   'assets/spire/prop_s1_lantern.png',
    glacier:   'assets/spire/prop_s2_crystal.png',
    wasteland: 'assets/spire/prop_s3_pillar.png',
    desert:    'assets/spire/prop_s4_monolith.png'
  };

  // 全 25 种普通怪与层域专属精英怪 1:1 独立高清贴图映射（零复用、造型与攻击机制严密对应）
  const MONSTER_SPRITE_MAP = {
    chaser:        'assets/spire/mob_s1_ronin.png',
    swarmer:       'assets/spire/mob_swarmer.png',
    stalker:       'assets/spire/mob_stalker.png',
    magma_imp:     'assets/spire/mob_s1_umbrella.png',
    shielder:      'assets/spire/mob_shielder.png',
    iron_guard:    'assets/spire/mob_s1_guard.png',
    shooter:       'assets/spire/mob_s2_prism.png',
    charger:       'assets/spire/mob_charger.png',
    frost_knight:  'assets/spire/mob_s2_knight.png',
    sniper_bug:    'assets/spire/mob_sniper_bug.png',
    frost_wisp:    'assets/spire/mob_frost_wisp.png',
    bomber:        'assets/spire/mob_bomber.png',
    spinner:       'assets/spire/mob_spinner.png',
    mortar:        'assets/spire/mob_mortar.png',
    rad_scorpion:  'assets/spire/mob_rad_scorpion.png',
    blade_duelist: 'assets/spire/mob_s3_duelist.png',
    splitter:      'assets/spire/mob_splitter.png',
    mini_slime:    'assets/spire/mob_mini_slime.png',
    summoner:      'assets/spire/mob_summoner.png',
    healer:        'assets/spire/mob_healer.png',
    brute:         'assets/spire/mob_brute.png',
    juggernaut:    'assets/spire/mob_juggernaut.png',
    sand_worm:     'assets/spire/mob_sand_worm.png',
    shadow_reaper: 'assets/spire/mob_s4_shade.png',
    spore_mother:  'assets/spire/mob_s5_reliquary.png'
  };

  // 全 16 位守誓主宰、先锋统领与无尽祭坛首领 1:1 独立贴图映射（零复用）
  const BOSS_SPRITE_MAP = {
    butcher:          'assets/spire/hero_jinyu.png',
    frost_queen:      'assets/spire/hero_astria.png',
    void_weaver:      'assets/spire/hero_jialan.png',
    mech_colossus:    'assets/spire/boss_mech_colossus.png',
    plague_empress:   'assets/spire/hero_qingyu.png',
    solar_seraph:     'assets/spire/hero_eclipse.png',
    crimson_lord:     'assets/spire/sb_crimson_lord.png',
    golden_golem:     'assets/spire/sb_golden_golem.png',
    abyss_devourer:   'assets/spire/sb_abyss_devourer.png',
    vanguard:         'assets/spire/mb_vanguard.png',
    pyro_lord:        'assets/spire/mb_pyro_lord.png',
    glacial_valkyrie: 'assets/spire/mb_glacial_valkyrie.png',
    shadow_stalker:   'assets/spire/mb_shadow_stalker.png',
    storm_siren:      'assets/spire/mb_storm_siren.png',
    venom_matriarch:  'assets/spire/mb_venom_matriarch.png',
    iron_warden:      'assets/spire/mb_iron_warden.png'
  };

  // 七大主宰/记忆祭坛传说首领二阶段觉醒单帧高清贴图映射（含倒悬机神裂胸巨锯魔神态 & 荒祠古祟血月黑角夜叉王）
  const BOSS_P2_SPRITE_MAP = {
    butcher:        'assets/spire/hero_jinyu_p2.png',
    crimson_lord:   'assets/spire/sb_crimson_lord_p2.png',
    frost_queen:    'assets/spire/hero_astria_p2.png',
    void_weaver:    'assets/spire/hero_jialan_p2.png',
    mech_colossus:  'assets/spire/boss_mech_colossus_p2.png',
    plague_empress: 'assets/spire/hero_qingyu_p2.png',
    solar_seraph:   'assets/spire/hero_eclipse_p2.png'
  };

  function _isCompactDevice() {
    if (typeof window === 'undefined') return false;
    if (typeof isTrueMobileDevice === 'function' && isTrueMobileDevice()) return true;
    const vw = window.innerWidth || 9999;
    const vh = window.innerHeight || 9999;
    return Math.min(vw, vh) <= 920;
  }

  function fastStoryPath(relPath) {
    if (typeof relPath === 'string' && /^assets\/spire\/v[23]\/(?!.*-reference\.png$).+\.png$/i.test(relPath)) {
      return relPath.slice(0, -4) + '.jpg';
    }
    return relPath;
  }

  function resolve(relPath) {
    if (!relPath) return '';
    const fast = fastStoryPath(relPath);
    const inline = typeof window !== 'undefined' && window.__SPIRE_INLINE_ASSETS__;
    if (inline) {
      if (inline[fast]) return inline[fast];
      if (inline[relPath]) return inline[relPath];
    }
    if (!/^data:|\?/.test(fast) && typeof APP_VERSION === 'string' && APP_VERSION) {
      return fast + '?v=' + encodeURIComponent(APP_VERSION);
    }
    return fast;
  }

  // 移动端双优先级防拥塞加载器：屏上急需贴图 LIFO 插队抢占 + 严控并发槽位防蜂窝队头阻塞 + 14秒看门狗与保留缓存重试 + 常驻引用防 GC 回收
  const _hiQueue = [];
  const _loQueue = [];
  const _pinnedImages = [];
  let _inflightHi = 0;
  let _inflightLo = 0;

  function _pinDecodedImage(img) {
    if (!img) return;
    if (_pinnedImages.indexOf(img) === -1) _pinnedImages.push(img);
    if (typeof img.decode === 'function') {
      try {
        const dp = img.decode();
        if (dp && typeof dp.catch === 'function') dp.catch(function () {});
      } catch (_) {}
    }
  }

  function hasPendingHiLoads() {
    return _inflightHi > 0 || _hiQueue.length > 0;
  }

  function _pumpLoadQueue() {
    const compact = _isCompactDevice();
    const hiLimit = compact ? 4 : 16;
    const loLimit = compact ? 2 : 6;
    while ((_inflightHi + _inflightLo) < hiLimit && _hiQueue.length > 0) {
      const item = _hiQueue.shift();
      if (item && item.fn) item.fn();
    }
    // 高优战斗贴图排队或高并发拉取期间，暂停启动新的低优大图下载，杜绝 500KB 剧情图阻塞 50KB 怪物贴图
    const allowLo = _hiQueue.length === 0 && _inflightHi <= (compact ? 1 : 6);
    while (allowLo && _inflightLo < loLimit && (_inflightHi + _inflightLo) < hiLimit && _loQueue.length > 0) {
      const item = _loQueue.shift();
      if (item && item.fn) item.fn();
    }
  }

  function _promoteQueuedLoad(relPath) {
    for (let i = 0; i < _hiQueue.length; i++) {
      if (_hiQueue[i] && _hiQueue[i].relPath === relPath) {
        if (i > 0) {
          const picked = _hiQueue.splice(i, 1)[0];
          _hiQueue.unshift(picked);
        }
        return true;
      }
    }
    for (let j = 0; j < _loQueue.length; j++) {
      if (_loQueue[j] && _loQueue[j].relPath === relPath) {
        const picked = _loQueue.splice(j, 1)[0];
        picked.isHi = true;
        _hiQueue.unshift(picked);
        _pumpLoadQueue();
        return true;
      }
    }
    return false;
  }

  function loadImage(relPath, onReady, onFail, highPriority) {
    if (!relPath || typeof Image === 'undefined') return null;
    const urgent = highPriority === 'urgent';
    const isHi = urgent || !!highPriority || /^assets\/spire\/(?:mob_|boss_|sb_|mb_|hero_|prop_)/i.test(relPath);
    let rec = _imgCache[relPath];
    if (rec) {
      if (rec.ready) {
        if (onReady) {
          try { onReady(rec.img); } catch (err) { if (typeof logWarn === 'function') logWarn('ASSET_CB', String(err)); }
        }
        return rec.img;
      }
      if (rec.loading) {
        if (onReady) rec.cbs.push(onReady);
        if (onFail) rec.failCbs.push(onFail);
        if (urgent) _promoteQueuedLoad(relPath);
        return null;
      }
      if (!urgent && rec.failed && Date.now() < (rec.retryAfter || 0)) {
        if (onFail) {
          try { onFail(); } catch (_) {}
        }
        return null;
      }
    } else {
      rec = { img: null, ready: false, loading: false, failed: false, retryAfter: 0, cbs: [], failCbs: [] };
      _imgCache[relPath] = rec;
    }

    if (onReady) rec.cbs.push(onReady);
    if (onFail) rec.failCbs.push(onFail);
    rec.loading = true;
    rec.failed = false;

    const baseUrl = resolve(relPath);
    const isDataUri = /^data:/i.test(baseUrl);

    const startAttempt = function (attempt, slotIsHi) {
      let settled = false;
      let watchdog = null;
      const img = new Image();
      rec.img = img;
      if (!slotIsHi) img.decoding = 'async';
      if (slotIsHi) {
        try { img.fetchPriority = 'high'; } catch (_) {}
      }

      const releaseSlot = function () {
        if (watchdog !== null) {
          clearTimeout(watchdog);
          watchdog = null;
        }
        if (!isDataUri) {
          if (slotIsHi) _inflightHi = Math.max(0, _inflightHi - 1);
          else _inflightLo = Math.max(0, _inflightLo - 1);
          _pumpLoadQueue();
        }
      };

      img.onload = function () {
        if (settled) return;
        settled = true;
        releaseSlot();
        const nw = img.naturalWidth || img.width || 0;
        const nh = img.naturalHeight || img.height || 0;
        if (nw > 0 && nh > 0) {
          if (!img.width) img.width = nw;
          if (!img.height) img.height = nh;
          _pinDecodedImage(img);
          rec.ready = true;
          rec.loading = false;
          rec.failed = false;
          rec.failCbs.length = 0;
          const list = rec.cbs.splice(0, rec.cbs.length);
          for (let i = 0; i < list.length; i++) {
            try {
              list[i](img);
            } catch (err) {
              if (typeof logWarn === 'function') logWarn('ASSET_CB', relPath + ': ' + String(err));
            }
          }
        } else if (!isDataUri && attempt < 3) {
          _enqueueAttempt(attempt + 1);
        } else {
          _handleFinalFailure();
        }
      };

      img.onerror = function () {
        if (settled) return;
        settled = true;
        releaseSlot();
        if (!isDataUri && attempt < 3) {
          _enqueueAttempt(attempt + 1);
        } else {
          _handleFinalFailure();
        }
      };

      if (!isDataUri) {
        if (slotIsHi) _inflightHi++;
        else _inflightLo++;
      }
      // 前两次尝试保持标准版本化 URL 以充分利用浏览器与 SW 缓存；第 3 次起附带确定性重试序号破除坏缓存
      if (attempt <= 1 || isDataUri) {
        img.src = baseUrl;
      } else {
        const clean = fastStoryPath(relPath).split('?')[0];
        const verTag = (typeof APP_VERSION === 'string' && APP_VERSION) ? APP_VERSION : '1';
        img.src = clean + '?v=' + encodeURIComponent(verTag) + '&_retry=' + attempt;
      }

      if (!settled && !isDataUri && typeof setTimeout === 'function') {
        const timeoutMs = slotIsHi ? 14000 : 20000;
        watchdog = setTimeout(function () {
          if (settled) return;
          settled = true;
          img.onload = null;
          img.onerror = null;
          try { img.src = ''; } catch (_) {}
          releaseSlot();
          if (attempt < 3) {
            _enqueueAttempt(attempt + 1);
          } else {
            _handleFinalFailure();
          }
        }, timeoutMs);
      }
    };

    function _handleFinalFailure() {
      rec.loading = false;
      rec.ready = false;
      rec.failed = true;
      rec.retryAfter = Date.now() + 800;
      rec.cbs.length = 0;
      const fList = rec.failCbs.splice(0, rec.failCbs.length);
      for (let i = 0; i < fList.length; i++) {
        try { fList[i](); } catch (_) {}
      }
      if (typeof logWarn === 'function') {
        logWarn('ASSET_LOAD', '贴图加载暂未成功，将在冷却后自动重试: ' + relPath);
      }
    }

    function _enqueueAttempt(attempt) {
      if (isDataUri) {
        startAttempt(attempt, isHi);
        return;
      }
      const run = function () {
        const compact = _isCompactDevice();
        const hiLimit = compact ? 4 : 16;
        const loLimit = compact ? 2 : 6;
        const qItem = { relPath, isHi, fn: null };
        qItem.fn = function () { startAttempt(attempt, qItem.isHi); };
        if (isHi) {
          if ((_inflightHi + _inflightLo) < hiLimit && (_hiQueue.length === 0 || urgent)) {
            startAttempt(attempt, true);
          } else if (urgent) {
            _hiQueue.unshift(qItem);
          } else {
            _hiQueue.push(qItem);
          }
        } else {
          const allowLo = _hiQueue.length === 0 && _inflightHi <= (compact ? 1 : 6);
          if (allowLo && _inflightLo < loLimit && (_inflightHi + _inflightLo) < hiLimit) {
            startAttempt(attempt, false);
          } else {
            _loQueue.push(qItem);
          }
        }
      };
      if (attempt > 0 && typeof setTimeout === 'function') {
        setTimeout(run, attempt === 1 ? 180 : (attempt === 2 ? 480 : 900));
      } else {
        run();
      }
    }

    _enqueueAttempt(0);
    return rec.ready ? rec.img : null;
  }

  // 离屏染色画布 LRU 池：严控手机 WebKit 活跃 2D Canvas 数量（<=12），驱逐时归零尺寸立即释放 GPU IOSurface，彻底根除 iOS 画布超限引发的贴图静默空白！
  const _tintLru = [];
  function _allocPooledCanvas(w, h, holder, prop) {
    if (typeof document === 'undefined') return null;
    const maxPool = _isCompactDevice() ? 12 : 64;
    while (_tintLru.length >= maxPool) {
      const oldest = _tintLru.shift();
      if (oldest) {
        if (oldest.holder && oldest.prop && oldest.holder[oldest.prop] && oldest.holder[oldest.prop].canvas === oldest.canvas) {
          oldest.holder[oldest.prop] = null;
        }
        try { oldest.canvas.width = 0; oldest.canvas.height = 0; } catch (_) {}
      }
    }
    try {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      if (!g || !(c.width > 0 && c.height > 0)) {
        try { c.width = 0; c.height = 0; } catch (_) {}
        return null;
      }
      if (holder && prop) {
        _tintLru.push({ canvas: c, holder, prop });
      }
      return { canvas: c, ctx: g };
    } catch (_) {
      return null;
    }
  }

  // 高清精灵贴图缓存：直接以常驻解码 HTMLImageElement 作为 normalView（0 常驻离屏 Canvas 开销，彻底消除移动端 45 张 Canvas 撑爆 GPU 上限导致贴图消失）
  function ensureSpriteEntry(relPath, maxPx, urgent) {
    if (!relPath || typeof document === 'undefined') return null;
    const cap = maxPx || 256;
    const cacheKey = relPath + '@' + cap;
    let entry = _spriteBank[cacheKey];
    if (entry) {
      if (entry.ready) return entry;
      if (entry._loading) {
        if (urgent) loadImage(relPath, null, null, 'urgent');
        return null;
      }
    } else {
      entry = { ready: false, _loading: false, rawImg: null, normal: null, flash: null, normalView: null, flashView: null, w: cap, h: cap };
      _spriteBank[cacheKey] = entry;
    }
    entry._loading = true;
    loadImage(relPath, function (img) {
      const nw = img.naturalWidth || img.width || 256;
      const nh = img.naturalHeight || img.height || 256;
      entry.rawImg = img;
      const compact = _isCompactDevice();
      const effCap = compact ? Math.min(cap, cap > 256 ? 176 : 144) : cap;
      const scale = Math.min(1, effCap / Math.max(nw, nh));
      const tw = Math.max(16, Math.round(nw * scale));
      const th = Math.max(16, Math.round(nh * scale));

      entry.normal = img;
      entry.w = nw;
      entry.h = nh;
      entry.tintW = tw;
      entry.tintH = th;
      entry.normalView = { canvas: img, rawImg: img, w: nw, h: nh };
      entry._loading = false;
      entry.ready = true;
    }, function () {
      entry._loading = false;
    }, urgent ? 'urgent' : true);
    return entry.ready ? entry : null;
  }

  // 原生 1024×256（单格 256×256）四帧精灵表缓存：常规态直绘解码原图（零额外大画布开销），受击态按需惰性构建并带完备回退
  function ensureSheetEntry(relPath, urgent) {
    if (!relPath || typeof document === 'undefined') return null;
    let entry = _sheetBank[relPath];
    if (entry) {
      if (entry.ready) return entry;
      if (entry._loading) {
        if (urgent) loadImage(relPath, null, null, 'urgent');
        return null;
      }
    } else {
      entry = { ready: false, _loading: false, normal: null, flash: null, normalView: null, flashView: null, cellW: 256, cellH: 256, frames: 4, nw: 1024, nh: 256 };
      _sheetBank[relPath] = entry;
    }
    entry._loading = true;
    loadImage(relPath, function (img) {
      const nw = img.naturalWidth || img.width || 1024;
      const nh = img.naturalHeight || img.height || 256;
      if (!img.width) img.width = nw;
      if (!img.height) img.height = nh;
      const frames = nw >= nh * 3 ? 4 : 1;
      const cellW = Math.max(32, Math.floor(nw / frames));
      const cellH = Math.max(32, nh);

      entry.normal = img;
      entry.nw = nw;
      entry.nh = nh;
      entry.cellW = cellW;
      entry.cellH = cellH;
      entry.frames = frames;
      entry.normalView = { canvas: img, rawImg: img, cellW, cellH, frames };
      entry._loading = false;
      entry.ready = true;
    }, function () {
      entry._loading = false;
    }, urgent ? 'urgent' : true);
    return entry.ready ? entry : null;
  }

  function _getSheetFlashView(entry) {
    if (!entry || !entry.normal) return null;
    if (entry.flashView) return entry.flashView;
    const nw = entry.nw || 1024;
    const nh = entry.nh || 256;
    const pair = _allocPooledCanvas(nw, nh, entry, 'flashView');
    if (!pair) return entry.normalView;
    try {
      const gf = pair.ctx;
      gf.imageSmoothingEnabled = true;
      gf.drawImage(entry.normal, 0, 0, nw, nh);
      gf.globalCompositeOperation = 'source-atop';
      gf.fillStyle = 'rgba(255, 250, 240, 0.32)';
      gf.fillRect(0, 0, nw, nh);
      entry.flash = pair.canvas;
      entry.flashView = { canvas: pair.canvas, cellW: entry.cellW, cellH: entry.cellH, frames: entry.frames };
      return entry.flashView;
    } catch (_) {
      try { pair.canvas.width = 0; pair.canvas.height = 0; } catch (_e) {}
      return entry.normalView;
    }
  }

  function _resolveZeroOutfitSheetKey(keyOrCls) {
    if (keyOrCls === 'allrounder' && typeof getActiveZeroOutfit === 'function') {
      return getActiveZeroOutfit().sheetKey || 'zero';
    }
    return keyOrCls;
  }

  function getHeroSheet(keyOrCls, flash, urgent) {
    const isUrgent = urgent !== false;
    const effKey = _resolveZeroOutfitSheetKey(keyOrCls);
    const rel = HERO_SHEET_MAP[effKey] || HERO_SHEET_MAP[keyOrCls];
    if (!rel) return null;
    let ent = ensureSheetEntry(rel, isUrgent);
    if (!ent && effKey !== 'zero' && keyOrCls === 'allrounder') {
      ent = ensureSheetEntry(HERO_SHEET_MAP.zero, isUrgent);
    }
    if (!ent) return null;
    return flash ? _getSheetFlashView(ent) : ent.normalView;
  }

  function getBossSheet(variant, flash, urgent, isPhase2) {
    if (!variant) return null;
    const isUrgent = urgent !== false;
    const sprMap = (isPhase2 && BOSS_P2_SPRITE_MAP[variant]) ? BOSS_P2_SPRITE_MAP : BOSS_SPRITE_MAP;
    if (sprMap[variant]) {
      ensureSpriteEntry(sprMap[variant], 300, isUrgent);
    }
    if (isPhase2 && HERO_P2_SHEET_MAP[variant]) {
      const p2Ent = ensureSheetEntry(HERO_P2_SHEET_MAP[variant], isUrgent);
      if (p2Ent) {
        return flash ? _getSheetFlashView(p2Ent) : p2Ent.normalView;
      }
    }
    if (HERO_SHEET_MAP[variant]) {
      return getHeroSheet(variant, flash, isUrgent);
    }
    return null;
  }

  function getHeroSprite(cls, flash) {
    const effKey = _resolveZeroOutfitSheetKey(cls);
    const rel = HERO_MAP[effKey] || HERO_MAP[cls] || HERO_MAP.allrounder;
    let ent = ensureSpriteEntry(rel, 256, true);
    if (!ent && effKey !== 'zero' && cls === 'allrounder') {
      ent = ensureSpriteEntry(HERO_MAP.allrounder, 256, true);
    }
    if (!ent) return null;
    return flash ? (_buildTintedView(ent, 'flashView', 'rgba(255, 250, 240, 0.32)') || ent.normalView) : ent.normalView;
  }

  function warmZeroOutfit(outfitId) {
    if (typeof Image === 'undefined') return;
    const o = (typeof ZERO_OUTFITS !== 'undefined' && ZERO_OUTFITS[outfitId]) ? ZERO_OUTFITS[outfitId] : null;
    if (!o) return;
    ensureSheetEntry(HERO_SHEET_MAP[o.sheetKey] || HERO_SHEET_MAP.zero, false);
    ensureSpriteEntry(HERO_MAP[o.sheetKey] || HERO_MAP.allrounder, 256, false);
    loadImage(o.portrait);
  }

  function getPropSprite(sceneId, flash) {
    const rel = PROP_MAP[sceneId] || PROP_MAP.foundry;
    const ent = ensureSpriteEntry(rel, 224, true);
    if (!ent) return null;
    return flash ? (_buildTintedView(ent, 'flashView', 'rgba(255, 250, 240, 0.32)') || ent.normalView) : ent.normalView;
  }

  function pickMonsterPath(e) {
    if (!e) return MONSTER_SPRITE_MAP.chaser;
    if ((e.type === 'boss' || e.type === 'mini_boss' || e.type === 'special_boss') && e.variant) {
      if (e.mythicPhase2 && !e._ruptureHoldP1 && BOSS_P2_SPRITE_MAP[e.variant]) {
        return BOSS_P2_SPRITE_MAP[e.variant];
      }
      if (BOSS_SPRITE_MAP[e.variant]) {
        return BOSS_SPRITE_MAP[e.variant];
      }
    }
    if (e.type && MONSTER_SPRITE_MAP[e.type]) {
      return MONSTER_SPRITE_MAP[e.type];
    }
    return MONSTER_SPRITE_MAP.chaser;
  }

  function _buildTintedView(entry, cacheProp, tintCss) {
    if (!entry || !entry.normal) return null;
    const cached = entry[cacheProp];
    if (cached && cached.canvas && (!(cached.canvas.tagName === 'CANVAS') || (cached.canvas.width > 0 && cached.canvas.height > 0))) {
      return cached;
    }
    const tw = entry.tintW || entry.w || 144;
    const th = entry.tintH || entry.h || 144;
    const pair = _allocPooledCanvas(tw, th, entry, cacheProp);
    if (!pair) return entry.normalView;
    try {
      const gt = pair.ctx;
      gt.imageSmoothingEnabled = true;
      gt.drawImage(entry.normal, 0, 0, tw, th);
      gt.globalCompositeOperation = 'source-atop';
      gt.fillStyle = tintCss;
      gt.fillRect(0, 0, tw, th);
      entry[cacheProp] = { canvas: pair.canvas, rawImg: entry.rawImg || entry.normal, w: tw, h: th };
      return entry[cacheProp];
    } catch (_) {
      try { pair.canvas.width = 0; pair.canvas.height = 0; } catch (_e) {}
      return entry.normalView;
    }
  }

  function getMonsterSprite(e, flash) {
    const rel = pickMonsterPath(e);
    const isBig = e && (e.type === 'boss' || e.type === 'special_boss' || e.type === 'mini_boss' || e.type === 'juggernaut');
    const ent = ensureSpriteEntry(rel, isBig ? 300 : 256, true);
    if (!ent) return null;
    if (flash) return _buildTintedView(ent, 'flashView', 'rgba(255, 250, 240, 0.32)') || ent.normalView;
    if (e && e.elite && !isBig) {
      if (e.eliteKind === 'frenzy') {
        return _buildTintedView(ent, 'frenzyView', 'rgba(255, 52, 86, 0.27)') || ent.normalView;
      }
      return _buildTintedView(ent, 'deathrattleView', 'rgba(251, 191, 36, 0.27)') || ent.normalView;
    }
    return ent.normalView;
  }

  const _arenaHooked = Object.create(null);
  function getArenaBg(sceneId) {
    const rel = SPIRE_STORY_PACK.arenaMaps[sceneId] || SPIRE_STORY_PACK.arenaMaps.foundry;
    const cached = _imgCache[rel];
    if (cached && cached.ready) return cached.img;
    if (_arenaHooked[sceneId]) return loadImage(rel, null, null, true);
    _arenaHooked[sceneId] = true;
    return loadImage(rel, function () {
      _arenaHooked[sceneId] = false;
      if (typeof curScene !== 'undefined' && curScene && curScene.id === sceneId) {
        if (typeof bakedSceneKey !== 'undefined') bakedSceneKey = '';
        if (typeof bootReady !== 'undefined' && bootReady && typeof buildFloorTexture === 'function') {
          buildFloorTexture();
        }
      }
    }, function () {
      _arenaHooked[sceneId] = false;
    }, true);
  }

  function getPortrait(keyOrVariant, isPhase2) {
    const rel = (isPhase2 && PORTRAIT_P2_MAP[keyOrVariant]) ? PORTRAIT_P2_MAP[keyOrVariant] : (PORTRAIT_MAP[keyOrVariant] || 'assets/spire/port_zero.jpg');
    return loadImage(rel);
  }

  function getPortraitSrc(keyOrVariant, isPhase2) {
    const rel = (isPhase2 && PORTRAIT_P2_MAP[keyOrVariant]) ? PORTRAIT_P2_MAP[keyOrVariant] : (PORTRAIT_MAP[keyOrVariant] || 'assets/spire/port_zero.jpg');
    return resolve(rel);
  }

  function getCutscene(variant) {
    let actKey = 'act1';
    if (variant === 'frost_queen' || variant === 'glacial_valkyrie') actKey = 'act2';
    else if (variant === 'void_weaver' || variant === 'mech_colossus' || variant === 'shadow_stalker' || variant === 'storm_siren' || variant === 'golden_golem') actKey = 'act3';
    else if (variant === 'solar_seraph' || variant === 'iron_warden' || variant === 'abyss_devourer') actKey = 'act4';
    const pack = SPIRE_STORY_PACK.cutscenes[actKey];
    if (!pack) return null;
    const imgs = pack.frames.map(src => loadImage(src));
    return {
      actKey: pack.actKey,
      chapter: pack.chapter,
      speaker: pack.speaker,
      lines: pack.lines,
      imgs
    };
  }

  function warmWave(waveNum, sceneId) {
    if (typeof Image === 'undefined') return;
    const w = Math.max(1, Number(waveNum) || 1);
    const sc = sceneId || (w <= 4 ? 'foundry' : (w <= 8 ? 'glacier' : (w <= 12 ? 'wasteland' : 'desert')));
    getArenaBg(sc);
    ensureSpriteEntry(PROP_MAP[sc] || PROP_MAP.foundry, 224, false);

    const mobs = ['chaser', 'stalker', 'swarmer', 'splitter', 'mini_slime', 'shooter'];
    if (w >= 2) mobs.push('charger', 'shielder', 'iron_guard', 'rad_scorpion');
    if (w >= 3) mobs.push('sand_worm', 'bomber', 'frost_knight', 'blade_duelist', 'frost_wisp', 'sniper_bug');
    if (w >= 4) mobs.push('brute', 'magma_imp', 'spinner', 'mortar');
    if (w >= 5) mobs.push('shadow_reaper', 'summoner', 'spore_mother');
    if (w >= 6) mobs.push('juggernaut', 'healer');

    for (let i = 0; i < mobs.length; i++) {
      const mKey = mobs[i];
      if (MONSTER_SPRITE_MAP[mKey]) {
        ensureSpriteEntry(MONSTER_SPRITE_MAP[mKey], mKey === 'juggernaut' ? 300 : 256, false);
      }
    }

    // 仅按当前层数按需预热即将登场的统领/首领，彻底告别首屏并发拉取 64 张立绘阻塞小怪贴图！
    if (w === 2 || w === 6 || w === 10 || w === 14 || w > 16) {
      const miniByAct = w <= 4 ? ['vanguard', 'pyro_lord'] : (w <= 8 ? ['glacial_valkyrie', 'venom_matriarch'] : (w <= 12 ? ['shadow_stalker', 'storm_siren'] : ['iron_warden']));
      for (let j = 0; j < miniByAct.length; j++) {
        getBossSheet(miniByAct[j], false, false);
      }
    }
    if (w === 3 || w === 4 || w === 7 || w === 8 || w === 11 || w === 12 || w === 15 || w >= 16) {
      const actBoss = w <= 4 ? 'butcher' : (w <= 8 ? 'frost_queen' : (w <= 12 ? 'void_weaver' : 'solar_seraph'));
      getBossSheet(actBoss, false, false, false);
      getBossSheet(actBoss, false, false, true);
      getPortrait(actBoss, true);
      if (w > 16) {
        getBossSheet('mech_colossus', false, false, false);
        getBossSheet('mech_colossus', false, false, true);
        getPortrait('mech_colossus', true);
        getBossSheet('plague_empress', false, false, false);
        getBossSheet('plague_empress', false, false, true);
        getPortrait('plague_empress', true);
      }
    }
  }

  function warmup() {
    if (typeof Image === 'undefined') return;
    // 第一优先级：主角精灵表与第 1 层核心小怪贴图立刻进入高优绿色通道并发拉取，彻底消除进战初期怪变圆球
    ensureSheetEntry(HERO_SHEET_MAP.zero, true);
    if (typeof getActiveZeroOutfit === 'function') {
      const ao = getActiveZeroOutfit();
      if (ao && ao.sheetKey && ao.sheetKey !== 'zero') ensureSheetEntry(HERO_SHEET_MAP[ao.sheetKey], false);
    }
    ensureSpriteEntry(PROP_MAP.foundry, 224, false);
    const wave1Mobs = ['chaser', 'swarmer', 'stalker', 'splitter', 'mini_slime', 'magma_imp', 'shielder', 'shooter'];
    for (let i = 0; i < wave1Mobs.length; i++) {
      ensureSpriteEntry(MONSTER_SPRITE_MAP[wave1Mobs[i]], 256, false);
    }

    // 第二优先级：序章首屏背景图与竞技场底图在空闲帧平缓预热，绝不抢占小怪并发槽位
    const jobs = [
      () => loadImage('assets/spire/v3/awakening-coffin.jpg', null, null, false),
      () => loadImage('assets/spire/v3/awakening-lantern.jpg', null, null, false),
      () => loadImage('assets/spire/scene_1_vista.jpg', null, null, false),
      () => getArenaBg('foundry')
    ];
    const idle = typeof requestIdleCallback === 'function'
      ? cb => requestIdleCallback(cb, { timeout: 1200 })
      : cb => setTimeout(cb, 90);
    const next = () => { const job = jobs.shift(); if (job) { job(); if (jobs.length) idle(next); } };
    idle(next);
  }

  warmup();

  function getBossCutoutSourcePath(variant, isMythic) {
    if (isMythic && BOSS_P2_SPRITE_MAP[variant]) return BOSS_P2_SPRITE_MAP[variant];
    return BOSS_SPRITE_MAP[variant] || HERO_MAP[variant] || 'assets/spire/hero_jinyu.png';
  }

  return {
    fastStoryPath,
    resolve,
    loadImage,
    hasPendingHiLoads,
    getHeroSheet,
    getBossSheet,
    getHeroSprite,
    warmZeroOutfit,
    warmWave,
    getPropSprite,
    pickMonsterPath,
    getMonsterSprite,
    getBossCutoutSourcePath,
    getArenaBg,
    getPortrait,
    getPortraitSrc,
    getCutscene
  };
})();

function getSpireArenaBgImage(sceneId) {
  return SpireAssets.getArenaBg(sceneId);
}

// ============================================================================
// 👑 全 16 大首领（6 守誓主宰 + 7 先锋统领 + 3 记忆祭坛首领）专属一阶段/二阶段破框半身立绘库
// 一阶段：33% 概率触发登场横幅展示夏装半身立绘（440×516 高清无锯齿透明抠图）
// 二阶段：按难度阶梯 D1=30% -> D5=50% 概率觉醒神话二阶段，且觉醒时 100% 必出二阶段专属隐藏换装立绘横幅！
// ============================================================================
const BOSS_PORTRAIT_DATA = {
  butcher: {
    w: 440, h: 516,
    personaName: '烬羽 · 绯红断刃剑姬',
    summerTitle: '绯雨守桥 · 单刀试剑常服',
    mythicTitle: '绯夜燃魂 · 双刀烬羽织'
  },
  frost_queen: {
    w: 440, h: 516,
    personaName: '艾丝特莉亚 · 永冻星使',
    summerTitle: '捧盒孤王 · 午夜蓝宫廷裙',
    mythicTitle: '碎冕极光 · 六翼凛冬礼装'
  },
  mech_colossus: {
    w: 440, h: 516,
    personaName: '倒悬机神 · 神枢重装巨像',
    summerTitle: '黑铁铆钉 · 封闭守卫态',
    mythicTitle: '歼灭神枢 · 裂胸巨锯魔神态'
  },
  void_weaver: {
    w: 440, h: 516,
    personaName: '伽蓝 · 紫电弦月少主',
    summerTitle: '守礼发条 · 紫金燕尾常服',
    mythicTitle: '逆时神枢 · 星晷超载少主装'
  },
  plague_empress: {
    w: 440, h: 516,
    personaName: '青羽 · 残羽风语魔女',
    summerTitle: '提灯引路 · 墨绿短披肩',
    mythicTitle: '千夜苍岚 · 神风羽弓魔女装'
  },
  solar_seraph: {
    w: 440, h: 516,
    personaName: '日蚀圣女 · 镜中真我',
    summerTitle: '盲眼纯白 · 隔镜司祭长裙',
    mythicTitle: '破镜真我 · 黑曜金纹镜像礼装'
  },
  crimson_lord: {
    w: 440, h: 516,
    personaName: '荒祠古祟 · 绯狱妖主',
    summerTitle: '封龛半醒 · 镇魂白瓷缚灵态',
    mythicTitle: '破龛真身 · 血月黑角夜叉王'
  },
  golden_golem: {
    w: 440, h: 516,
    personaName: '黄金发条圣柜巨神',
    summerTitle: '封魂齿轮 · 黄金圣柜守卫态',
    mythicTitle: '超载崩裂 · 曜金星盘巨神态'
  },
  abyss_devourer: {
    w: 440, h: 516,
    personaName: '零号容器 · 饥饿黑影',
    summerTitle: '残镜暗涌 · 闭合蚀影魔茧',
    mythicTitle: '魔瞳全开 · 裂星归墟古神态'
  },
  vanguard: {
    w: 440, h: 516,
    personaName: '碎誓先锋 · 守桥重铠统领',
    summerTitle: '玄铁重盾 · 孤桥卫戍战铠',
    mythicTitle: '破甲燃魂 · 狂厄赤焰统领态'
  },
  pyro_lord: {
    w: 440, h: 516,
    personaName: '灰烬督军 · 赤伞焚灯炎魔',
    summerTitle: '烬火暗敛 · 守灯重甲督军',
    mythicTitle: '熔火冲霄 · 业火流金狂战态'
  },
  shadow_stalker: {
    w: 440, h: 516,
    personaName: '无面影狩 · 紫电斩首统领',
    summerTitle: '敛息潜影 · 双刃暗夜猎装',
    mythicTitle: '雷影千裂 · 暗雷破界刺客态'
  },
  venom_matriarch: {
    w: 440, h: 516,
    personaName: '腐花园主 · 苍翠荆棘守碑姬',
    summerTitle: '枯蔓缠碑 · 沉眠毒棘战衣',
    mythicTitle: '万蛊盛放 · 碧鳞蚀骨毒后态'
  },
  glacial_valkyrie: {
    w: 440, h: 516,
    personaName: '霜誓近卫 · 眠冬圣枪女武神',
    summerTitle: '寒铁覆面 · 极北冰骑银铠',
    mythicTitle: '碎冰展翼 · 极光霜枪战神态'
  },
  iron_warden: {
    w: 440, h: 516,
    personaName: '齿轮典狱长 · 黑曜镇狱统领',
    summerTitle: '重锁封门 · 黑金盾徽重甲',
    mythicTitle: '熔炉解禁 · 曜铁锁链审判态'
  },
  storm_siren: {
    w: 440, h: 516,
    personaName: '逆钟歌姬 · 苍雷星律塞壬',
    summerTitle: '静默弦音 · 星律苍羽礼装',
    mythicTitle: '狂雷奏鸣 · 天罚风暴神女态'
  }
};

const _bossCutoutCache = Object.create(null);
const _bossCutoutOrder = [];

// 直接基于各首领原生高清透明 PNG 贴图烘焙 440×516 破框立绘（彻底淘汰 64 张旧版冗余/夏装错位 bp_* 双通道图，省去 destination-in 双图遮罩合成与 4.5MB 内存占用）
function _bakeBossCutoutSlot(cacheKey, w, h, srcRel, isMythic) {
  let rec = _bossCutoutCache[cacheKey];
  if (rec) {
    if (rec.ready) return rec.canvas;
    if (rec._loading) return null;
  } else {
    if (typeof document === 'undefined' || !srcRel) return null;
    rec = { ready: false, _loading: false, canvas: null };
    _bossCutoutCache[cacheKey] = rec;
  }
  if (typeof document === 'undefined' || !srcRel) return null;
  rec._loading = true;

  SpireAssets.loadImage(srcRel, function (img) {
    const iw = img && (img.naturalWidth || img.width || 0);
    const ih = img && (img.naturalHeight || img.height || 0);
    if (!(iw > 0) || !(ih > 0)) {
      rec._loading = false;
      return;
    }
    while (_bossCutoutOrder.length >= 32) {
      const oldKey = _bossCutoutOrder.shift();
      const oldRec = oldKey ? _bossCutoutCache[oldKey] : null;
      if (oldRec && oldRec !== rec) {
        if (oldRec.canvas && typeof oldRec.canvas.getContext === 'function') {
          try { oldRec.canvas.width = 0; oldRec.canvas.height = 0; } catch (_) {}
        }
        delete _bossCutoutCache[oldKey];
      }
    }
    try {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      if (g && c.width > 0) {
        g.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
        g.clearRect(0, 0, w, h);
        if (isMythic) {
          g.save();
          g.strokeStyle = 'rgba(225, 29, 72, 0.72)';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(w * 0.16, h * 0.84);
          g.lineTo(w * 0.50, h * 0.10);
          g.lineTo(w * 0.84, h * 0.84);
          g.closePath();
          g.stroke();
          g.restore();
        }
        const pad = isMythic ? 12 : 24;
        const sc = Math.min((w - pad * 2) / iw, (h - pad * 2) / ih);
        const dw = iw * sc, dh = ih * sc;
        g.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.54, dw, dh);
        rec.canvas = c;
        _bossCutoutOrder.push(cacheKey);
      } else {
        rec.canvas = img;
      }
    } catch (_) {
      rec.canvas = img;
    }
    rec.ready = !!rec.canvas;
    rec._loading = false;
  }, function () {
    rec._loading = false;
  }, true);

  return rec.ready ? rec.canvas : null;
}

function getBossAnimePortrait(variant, isMythic = false) {
  const key = variant && BOSS_PORTRAIT_DATA[variant] ? variant : 'butcher';
  const spec = BOSS_PORTRAIT_DATA[key];
  if (spec && typeof SpireAssets.getBossCutoutSourcePath === 'function') {
    if (isMythic) {
      const p2 = _bakeBossCutoutSlot(key + '__p2', spec.w, spec.h, SpireAssets.getBossCutoutSourcePath(key, true), true);
      if (p2) return p2;
    }
    const p1 = _bakeBossCutoutSlot(key + '__p1', spec.w, spec.h, SpireAssets.getBossCutoutSourcePath(key, false), false);
    if (p1) return p1;
  }
  return SpireAssets.getPortrait(key);
}

// 仅按需预热指定首领抠像（首领预警阶段提前 0.9s 触发），不再在开机瞬间并发拉取全部 64 张大图抢占移动端带宽与画布内存！
function preloadAllBossCutoutPortraits(onlyVariant) {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return;
  if (onlyVariant && BOSS_PORTRAIT_DATA[onlyVariant]) {
    getBossAnimePortrait(onlyVariant, false);
    getBossAnimePortrait(onlyVariant, true);
  }
}

function getSpireCutscenePack(variant) {
  return SpireAssets.getCutscene(variant);
}

if (typeof globalThis !== 'undefined') {
  globalThis.SPIRE_STORY_PACK = SPIRE_STORY_PACK;
  globalThis.BOSS_PORTRAIT_DATA = BOSS_PORTRAIT_DATA;
  globalThis.SpireAssets = SpireAssets;
  globalThis.getSpireArenaBgImage = getSpireArenaBgImage;
  globalThis.getBossAnimePortrait = getBossAnimePortrait;
  globalThis.getSpireCutscenePack = getSpireCutscenePack;
}
