// V2.3 runtime dialogue & cinematic script — visual-aligned mature narrative edition.
// Single-source offline narrative data for SpireDirector.
const SpireStoryV2 = {
  "version": "2.3.0",
  "title": "烬塔残响：第九百九十九夜的提灯人 · 剧情与演出剧本 V2.3",
  "opening": {
    "stageId": "opening.awakening",
    "eventId": "event.opening.awakening",
    "title": "序章 · 在石棺里醒来",
    "dialogue": [
      {
        "speaker": "零",
        "text": "……好冷。夜雨一直落进石棺里……这里有人吗？",
        "lineId": "opening.awakening.line.01"
      },
      {
        "speaker": "零",
        "text": "我想不起自己的名字，只剩这袭残破的白兜帽，和黑裙上的金纹。",
        "lineId": "opening.awakening.line.02"
      },
      {
        "speaker": "零",
        "text": "棺边的残碑刻着“九百九十八”……碑下只有这盏亮着青火的提灯。",
        "lineId": "opening.awakening.line.03"
      },
      {
        "speaker": "神秘女声",
        "text": "醒了吗？握紧灯环，别让冷雨浇灭了灯芯。",
        "lineId": "opening.awakening.line.04"
      },
      {
        "speaker": "零",
        "text": "是谁在说话？四周明明只有雨声……",
        "lineId": "opening.awakening.line.05"
      },
      {
        "speaker": "神秘女声",
        "text": "看长桥尽头那座黑日下的高塔。提灯走上来，你遗落的名字就在我这里。",
        "lineId": "opening.awakening.line.06"
      },
      {
        "speaker": "零",
        "text": "桥畔插满了折断的旧剑……既然无处可归，我就提灯去塔顶问个明白。",
        "lineId": "opening.awakening.line.07"
      }
    ],
    "shots": [
      {
        "seconds": 8,
        "shotId": "opening.awakening.shot.01",
        "line": {
          "speaker": "零",
          "text": "……好冷。夜雨一直落进石棺里……这里有人吗？"
        }
      },
      {
        "seconds": 7,
        "shotId": "opening.awakening.shot.02",
        "line": {
          "speaker": "零",
          "text": "我想不起自己的名字，只剩这袭残破的白兜帽，和黑裙上的金纹。"
        }
      },
      {
        "seconds": 8,
        "shotId": "opening.awakening.shot.03",
        "line": {
          "speaker": "零",
          "text": "棺边的残碑刻着“九百九十八”……碑下只有这盏亮着青火的提灯。"
        }
      },
      {
        "seconds": 8,
        "shotId": "opening.awakening.shot.04",
        "line": {
          "speaker": "神秘女声",
          "text": "醒了吗？握紧灯环，别让冷雨浇灭了灯芯。"
        }
      },
      {
        "seconds": 9,
        "shotId": "opening.awakening.shot.05",
        "line": {
          "speaker": "神秘女声",
          "text": "看长桥尽头那座黑日下的高塔。提灯走上来，你遗落的名字就在我这里。"
        }
      },
      {
        "seconds": 8,
        "shotId": "opening.awakening.shot.06",
        "line": {
          "speaker": "零",
          "text": "桥畔插满了折断的旧剑……既然无处可归，我就提灯去塔顶问个明白。"
        }
      }
    ]
  },
  "floors": [
    {
      "floor": 1,
      "title": "雨桥横刀的人",
      "act": "第一幕 · 雨夜长桥",
      "location": "长桥入口",
      "objective": "穿过雨夜长桥走向高塔，弄清鬓侧斜戴白狐半面的黑甲剑姬为何识得自己。",
      "before": [
        {
          "speaker": "烬羽",
          "text": "桥头到此为止。把手里那盏青灯放下，退回风亭去。",
          "lineId": "floor.01.before.line.01"
        },
        {
          "speaker": "零",
          "text": "看清我的脸时，你按刀的手明明抖了一下……你认识我，对吗？",
          "lineId": "floor.01.before.line.02"
        },
        {
          "speaker": "烬羽",
          "text": "认错人了。长桥只拦提灯入塔的闯入者，不叙旧情。",
          "lineId": "floor.01.before.line.03"
        },
        {
          "speaker": "零",
          "text": "既然你不肯把话说清，那我只能越过你的刀锋，自己去塔里找答案了。",
          "lineId": "floor.01.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "刚才交手时，你的刀锋在最后一寸偏开了。你根本不想伤我。",
          "lineId": "floor.01.after.line.01"
        },
        {
          "speaker": "烬羽",
          "text": "……少多想，只是雨夜石滑。别追太紧，前面的桥砖早就松了。",
          "lineId": "floor.01.after.line.02"
        }
      ],
      "stageId": "floor.01",
      "eventId": "event.floor.01.enter"
    },
    {
      "floor": 2,
      "title": "苔碑与未熄红灯",
      "act": "第一幕 · 雨夜长桥",
      "location": "旧卫桥廊",
      "objective": "走过覆苔残碑与红灯映照的雾桥，察觉失却神智的旧卫仍在凭本能守护故主。",
      "before": [
        {
          "speaker": "零",
          "text": "苔碑旁还点着一盏红灯，连雾里的旧卫看见我都放低了长矛。",
          "lineId": "floor.02.before.line.01"
        },
        {
          "speaker": "烬羽",
          "text": "站远些，别碰它们的残甲。那些旧卫早就忘了姓名，只剩守桥的本能。",
          "lineId": "floor.02.before.line.02"
        },
        {
          "speaker": "零",
          "text": "可它们望着这袭白兜帽的眼神，不像看敌人，倒像在等什么人回来。",
          "lineId": "floor.02.before.line.03"
        },
        {
          "speaker": "烬羽",
          "text": "……连腐朽的铁甲都还记得故人，偏偏提灯的人自己忘得一干二净。",
          "lineId": "floor.02.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "雾散之后，那具旧卫退回石碑旁了，像是在替我守着身后的路。",
          "lineId": "floor.02.after.line.01"
        },
        {
          "speaker": "烬羽",
          "text": "别回头看了。很久以前，桥头那盏红灯旁本就是它的哨位。",
          "lineId": "floor.02.after.line.02"
        }
      ],
      "stageId": "floor.02",
      "eventId": "event.floor.02.enter"
    },
    {
      "floor": 3,
      "title": "风亭炉上的甜茶",
      "act": "第一幕 · 雨夜长桥",
      "location": "古碑旁的风亭",
      "objective": "在悬着黄铜风灯的风亭与青羽重逢，询问棺畔残碑上“998”的来历。",
      "before": [
        {
          "speaker": "青羽",
          "text": "手套都湿透了。快坐到小火炉边，铜壶里的茶刚煮开。",
          "lineId": "floor.03.before.line.01"
        },
        {
          "speaker": "零",
          "text": "青羽，我醒来时石棺旁的残碑上刻着“九百九十八”，那是什么意思？",
          "lineId": "floor.03.before.line.02"
        },
        {
          "speaker": "青羽",
          "text": "……只是旧时代留下的计数刻痕，风吹雨打太久，旁边的字早磨平了。",
          "lineId": "floor.03.before.line.03"
        },
        {
          "speaker": "零",
          "text": "可我提起这个数字时，你翻旧手札的动作停住了。你见过那座石碑？",
          "lineId": "floor.03.before.line.04"
        },
        {
          "speaker": "青羽",
          "text": "只是想起一位总爱逞强的故人。先暖暖身子吧，前面的封门不好过。",
          "lineId": "floor.03.before.line.05"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "茶里兑了蜜，一点也不苦……你怎么知道我喝不惯苦茶？",
          "lineId": "floor.03.after.line.01"
        },
        {
          "speaker": "青羽",
          "text": "淋了半宿冷雨，总该喝口甜的缓一缓。小心烫，慢点咽。",
          "lineId": "floor.03.after.line.02"
        },
        {
          "speaker": "零",
          "text": "如果穿过桥门以后我还想不通……往上走还能再见到你吗？",
          "lineId": "floor.03.after.line.03"
        },
        {
          "speaker": "青羽",
          "text": "只要柱上的黄铜风灯还亮着，你就进来歇脚。茶一直给你温着。",
          "lineId": "floor.03.after.line.04"
        }
      ],
      "stageId": "floor.03",
      "eventId": "event.floor.03.enter"
    },
    {
      "floor": 4,
      "title": "余烬里的红剑穗",
      "act": "第一幕 · 雨夜长桥",
      "location": "守桥封门",
      "objective": "在桥门迎战守誓剑姬烬羽，接过打着歪斜死结的褪色红剑穗。",
      "before": [
        {
          "speaker": "烬羽",
          "text": "再往前一步就是塔门。把那盏灯留在这里，这是我最后一次劝你。",
          "lineId": "floor.04.before.line.01"
        },
        {
          "speaker": "零",
          "text": "你明明一路都在护着我，为什么唯独进塔这件事，半句实话都不肯说？",
          "lineId": "floor.04.before.line.02"
        },
        {
          "speaker": "烬羽",
          "text": "因为你知道真相也只会再选一次绝路——看刀吧，这一步我绝不退！",
          "lineId": "floor.04.before.line.03"
        }
      ],
      "after": [
        {
          "speaker": "烬羽",
          "text": "……别靠太近，先把提灯放远半步。它的青光太冷了。",
          "lineId": "floor.04.after.line.01"
        },
        {
          "speaker": "零",
          "text": "断刀旁这条褪色的红剑穗……上面歪歪扭扭的死结，为什么这么眼熟？",
          "lineId": "floor.04.after.line.02"
        },
        {
          "speaker": "烬羽",
          "text": "你在风亭石阶上系了三回才打牢的，我一直没拆……拿着吧，别弄丢了。",
          "lineId": "floor.04.after.line.03"
        },
        {
          "speaker": "零",
          "text": "掌心还留着余烬的暖意……我答应你，不拆开它，一定带着它平安走出去。",
          "lineId": "floor.04.after.line.04"
        }
      ],
      "stageId": "floor.04",
      "eventId": "event.floor.04.enter"
    },
    {
      "floor": 5,
      "title": "冰柱里的微息",
      "act": "第二幕 · 永冻冰窟",
      "location": "冰封圣堂长廊",
      "objective": "踏入封存着城民的冰封拱廊，发现严寒并非杀戮，而是护住生机的冬眠。",
      "before": [
        {
          "speaker": "零",
          "text": "整排冰柱里封着的都是城里的百姓……看，那孩子的眼睫还在微动！",
          "lineId": "floor.05.before.line.01"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "把提灯压低，别让青光照进冰层！……提灯人，你不该踏进这座圣堂。",
          "lineId": "floor.05.before.line.02"
        },
        {
          "speaker": "零",
          "text": "他们没有死，只是睡在冰里……整座城的人，全是你亲手封住的吗？",
          "lineId": "floor.05.before.line.03"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "是我降下的永冻之咒。若想问罪，便随我到远离冰棺的拱廊外来。",
          "lineId": "floor.05.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "隔着冰层还能看见极浅的白雾，他们真的都在安稳呼吸。",
          "lineId": "floor.05.after.line.01"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "只要灯火不靠近，这场冬眠就不会碎。趁风雪未起，从侧廊离开吧。",
          "lineId": "floor.05.after.line.02"
        }
      ],
      "stageId": "floor.05",
      "eventId": "event.floor.05.enter"
    },
    {
      "floor": 6,
      "title": "索取温热的青火",
      "act": "第二幕 · 永冻冰窟",
      "location": "极光冰原拱廊",
      "objective": "在极光下的冰原亲眼目睹魂灯渴求生灵魂光的异动，识破耳畔女声的挑拨。",
      "before": [
        {
          "speaker": "零",
          "text": "怎么回事？我没催动灯芯，青火却自己朝拱廊里的冰棺扑过去了！",
          "lineId": "floor.06.before.line.01"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "退后！是魂灯在索取活人的温热，别让火舌舔破冰层！",
          "lineId": "floor.06.before.line.02"
        },
        {
          "speaker": "零",
          "text": "我在往回拽了，可灯焰像受了牵引一样，拼命往沉睡的人身上缠！",
          "lineId": "floor.06.before.line.03"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "抓紧灯环，随我用霜障把灯罩压住——绝不能让它惊醒城民！",
          "lineId": "floor.06.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "灯罩里凝出的那点蓝芒……竟然和冰原上散落的寒晶一模一样？",
          "lineId": "floor.06.after.line.01"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "现在你亲眼看见了。每当耳边的声音催你往上走，先想想这盏灯在吸什么。",
          "lineId": "floor.06.after.line.02"
        },
        {
          "speaker": "神秘女声",
          "text": "别听她危言耸听。将活人封入玄冰的是她，照亮你前路的却是我。",
          "lineId": "floor.06.after.line.03"
        }
      ],
      "stageId": "floor.06",
      "eventId": "event.floor.06.enter"
    },
    {
      "floor": 7,
      "title": "未奏完的冰晶琴音",
      "act": "第二幕 · 永冻冰窟",
      "location": "旧圣堂外庭",
      "objective": "听见艾丝特莉亚手中冰晶八音盒停驻的旋律，凭本能哼出遗落的尾音。",
      "before": [
        {
          "speaker": "零",
          "text": "你捧着的冰晶八音盒，怎么停在倒数第二个音了？后面明明还有两声……",
          "lineId": "floor.07.before.line.01"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "……别往下哼了。求你，让我先把琴盒合上。",
          "lineId": "floor.07.before.line.02"
        },
        {
          "speaker": "零",
          "text": "你的指尖在发抖……是我接错了调子，惹你不高兴了吗？",
          "lineId": "floor.07.before.line.03"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "分毫不差。只是从前一起听曲时，你总嫌尾音太冷清，从不肯听完。",
          "lineId": "floor.07.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "如果从前是我半途逃开了……这一次，我想留下来把整首曲子听完。",
          "lineId": "floor.07.after.line.01"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "若穿过风雪你还记得这句话，就来圣堂看一眼我怀表里的旧像吧。",
          "lineId": "floor.07.after.line.02"
        }
      ],
      "stageId": "floor.07",
      "eventId": "event.floor.07.enter"
    },
    {
      "floor": 8,
      "title": "冻停于灾夜的怀表",
      "act": "第二幕 · 永冻冰窟",
      "location": "永冻圣堂中央",
      "objective": "迎战六翼霜冕的艾丝特莉亚，从银怀表内侧的双人旧像中读懂冰封王城的真相。",
      "before": [
        {
          "speaker": "艾丝特莉亚",
          "text": "圣堂尽头便是通往钟楼的石阶。我不能让这盏魂灯越过冰障半步。",
          "lineId": "floor.08.before.line.01"
        },
        {
          "speaker": "零",
          "text": "我已经把灯火压住了。让我看看那枚怀表，告诉我当年究竟发生了什么！",
          "lineId": "floor.08.before.line.02"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "你上次也是这样攥紧灯环说能控制它……退后吧，琴盒合上之前我不会让路！",
          "lineId": "floor.08.before.line.03"
        }
      ],
      "after": [
        {
          "speaker": "艾丝特莉亚",
          "text": "冰冠落了也好……来，表扣有些冻涩，隔着手套用拇指轻轻抵住这里。",
          "lineId": "floor.08.after.line.01"
        },
        {
          "speaker": "零",
          "text": "表盖弹开了……里面并肩笑着的两个人，靠在你肩畔的那个，是我？",
          "lineId": "floor.08.after.line.02"
        },
        {
          "speaker": "艾丝特莉亚",
          "text": "那晚魂灯失控吞噬王城，是你抓紧我的衣袖，哭着求我把所有人冻进时间里。",
          "lineId": "floor.08.after.line.03"
        },
        {
          "speaker": "零",
          "text": "原来你独自守在永夜的寒冰里，是在替我护住整座城的呼吸……对不起。",
          "lineId": "floor.08.after.line.04"
        }
      ],
      "stageId": "floor.08",
      "eventId": "event.floor.08.enter"
    },
    {
      "floor": 9,
      "title": "悬停的雨滴与巨钟",
      "act": "第三幕 · 倒悬钟楼",
      "location": "钟楼下层石阶",
      "objective": "踏入雨滴悬停的倒悬钟楼，查明少年人偶伽蓝一面锁门、一面护人周全的缘由。",
      "before": [
        {
          "speaker": "零",
          "text": "雨滴停在半空了，连巨钟的指针都在倒着颤动……露台上有人？",
          "lineId": "floor.09.before.line.01"
        },
        {
          "speaker": "伽蓝",
          "text": "别往台阶外侧踩，那里的石栏早就松了。不想摔进云海就退后半步。",
          "lineId": "floor.09.before.line.02"
        },
        {
          "speaker": "零",
          "text": "谢谢你出声提醒……可上面那道通往塔顶的齿轮门，也是你刚刚锁死的吧？",
          "lineId": "floor.09.before.line.03"
        },
        {
          "speaker": "伽蓝",
          "text": "是我锁的。先在平台上站稳了，再跟我谈该不该放行。",
          "lineId": "floor.09.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "一面锁死大门拦我的路，一面又怕我踩空坠落……你到底想怎样？",
          "lineId": "floor.09.after.line.01"
        },
        {
          "speaker": "伽蓝",
          "text": "拦你是不准你上去送死，提醒你也是不准你死。这两件事并不冲突。",
          "lineId": "floor.09.after.line.02"
        }
      ],
      "stageId": "floor.09",
      "eventId": "event.floor.09.enter"
    },
    {
      "floor": 10,
      "title": "比记忆更熟的发条",
      "act": "第三幕 · 倒悬钟楼",
      "location": "星环云海露台",
      "objective": "在金色星环高悬的钟塔露台与伽蓝对峙，察觉自己的双手仍记得他机芯的极限刻度。",
      "before": [
        {
          "speaker": "伽蓝",
          "text": "别再往前逼近了。头顶星环的逆时力场很重，再走连你的呼吸都会停滞。",
          "lineId": "floor.10.before.line.01"
        },
        {
          "speaker": "零",
          "text": "可你右颊的瓷纹裂开了，脑后那枚大发条每转一下，关节都在漏出紫电！",
          "lineId": "floor.10.before.line.02"
        },
        {
          "speaker": "伽蓝",
          "text": "人偶的磨损不必你操心。只要还能抬手，我就不会替提灯人开门。",
          "lineId": "floor.10.before.line.03"
        },
        {
          "speaker": "零",
          "text": "别硬撑着逆拧发条了！再转半格，你胸口的主簧片会崩断的！",
          "lineId": "floor.10.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "伽蓝",
          "text": "……你怎么知道再转半格会伤到主簧片？这套机芯，外人根本看不懂。",
          "lineId": "floor.10.after.line.01"
        },
        {
          "speaker": "零",
          "text": "我也不知道……只是听见齿轮卡涩的声音，手指就像认得它一样揪紧了。",
          "lineId": "floor.10.after.line.02"
        },
        {
          "speaker": "伽蓝",
          "text": "……别用那种眼神看我。调校扳手我早就收起来了，用不着你修。",
          "lineId": "floor.10.after.line.03"
        }
      ],
      "stageId": "floor.10",
      "eventId": "event.floor.10.enter"
    },
    {
      "floor": 11,
      "title": "怕自己走到塔顶的人",
      "act": "第三幕 · 倒悬钟楼",
      "location": "尖顶钟塔外廊",
      "objective": "穿过只驱离而不伤人的机关防线，追问伽蓝究竟受谁所托镇守孤塔。",
      "before": [
        {
          "speaker": "零",
          "text": "钟塔里的机关傀儡每次扑过来，都只逼我往楼梯下退，从不肯劈向我的要害。",
          "lineId": "floor.11.before.line.01"
        },
        {
          "speaker": "伽蓝",
          "text": "它们听从的也是同一道死令——驱离提灯者，但绝不可伤及你的性命。",
          "lineId": "floor.11.before.line.02"
        },
        {
          "speaker": "零",
          "text": "连你左颊贴着胶布的样子都像被谁细心补过……给你下令的人，究竟是谁？",
          "lineId": "floor.11.before.line.03"
        },
        {
          "speaker": "伽蓝",
          "text": "别再问了。我答应过那个人，哪怕守到发条锈死，也绝不泄露天机。",
          "lineId": "floor.11.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "那个人既然这么怕我受伤，为什么偏偏不许我走到塔顶？",
          "lineId": "floor.11.after.line.01"
        },
        {
          "speaker": "伽蓝",
          "text": "……因为那个人最害怕的，从来不是死在半途，而是自己活着提灯推开终门。",
          "lineId": "floor.11.after.line.02"
        }
      ],
      "stageId": "floor.11",
      "eventId": "event.floor.11.enter"
    },
    {
      "floor": 12,
      "title": "断针上的黄金发条",
      "act": "第三幕 · 倒悬钟楼",
      "location": "星晷断罪台",
      "objective": "击败逆拧发条的守望者伽蓝，在巨钟断针上接过黄金发条，听见自己留下的遗令。",
      "before": [
        {
          "speaker": "伽蓝",
          "text": "星晷台后的十二道门栓已全部焊死。从这里往上，再无通路。",
          "lineId": "floor.12.before.line.01"
        },
        {
          "speaker": "零",
          "text": "把你心核里封存的那道原声放给我听吧，伽蓝。我想知道自己在替谁赎罪。",
          "lineId": "floor.12.before.line.02"
        },
        {
          "speaker": "伽蓝",
          "text": "除非你放下魂灯——否则就算拧断脑后的发条钥，我也要拦住你！",
          "lineId": "floor.12.before.line.03"
        }
      ],
      "after": [
        {
          "speaker": "伽蓝",
          "text": "断针太窄，别再往前迈了……把手伸过来，黄金发条里的留声快要散了。",
          "lineId": "floor.12.after.line.01"
        },
        {
          "speaker": "记忆中的零",
          "text": "如果有一天我忘了所有事，又提着灯回来……请拦住我。哪怕我求你，也别开门。",
          "lineId": "floor.12.after.line.02"
        },
        {
          "speaker": "伽蓝",
          "text": "这座塔是你锁住灾厄的囚笼，而你手里的灯，正是从内部解封的钥匙。",
          "lineId": "floor.12.after.line.03"
        },
        {
          "speaker": "零",
          "text": "原来把你困在断针与雷暴里九百九十八夜的人……一直都是我自己。",
          "lineId": "floor.12.after.line.04"
        }
      ],
      "stageId": "floor.12",
      "eventId": "event.floor.12.enter"
    },
    {
      "floor": 13,
      "title": "黑日下的无波浅水",
      "act": "第四幕 · 日蚀镜界",
      "location": "黑水镜原",
      "objective": "踏上高悬黑日下的死寂黑水，在尽头孤立的黑门前知晓九百九十八次轮回的真相。",
      "before": [
        {
          "speaker": "零",
          "text": "水面黑得像镜子一样没有波纹，头顶那轮黑日……一直在拉扯手里的灯火。",
          "lineId": "floor.13.before.line.01"
        },
        {
          "speaker": "神秘女声",
          "text": "看见水面尽头那扇黑门了吗？前九百九十八次，你都在半途停下了脚步。",
          "lineId": "floor.13.before.line.02"
        },
        {
          "speaker": "零",
          "text": "棺边残碑上的“九百九十八”……原来每一次在雨里提灯走上来的，全都是我？",
          "lineId": "floor.13.before.line.03"
        },
        {
          "speaker": "神秘女声",
          "text": "不必回头细数失败的夜。往前走吧，你遗落的名字就在门后等你。",
          "lineId": "floor.13.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "走了九百九十八遍同样的夜路……难怪烬羽和艾丝特莉亚看我的眼神那么疼。",
          "lineId": "floor.13.after.line.01"
        },
        {
          "speaker": "神秘女声",
          "text": "只要跨进前面那扇门，他们和你都不必再受轮回之苦了。",
          "lineId": "floor.13.after.line.02"
        }
      ],
      "stageId": "floor.13",
      "eventId": "event.floor.13.enter"
    },
    {
      "floor": 14,
      "title": "令灯火安静的旧物",
      "act": "第四幕 · 日蚀镜界",
      "location": "黑门长道",
      "objective": "顶住耳畔低语走向黑门，发现同伴托付的三件信物能够平息魂灯的躁动。",
      "before": [
        {
          "speaker": "神秘女声",
          "text": "剑穗湿透了，怀表和发条也早已停摆。把那些沉重的旧物丢进水里吧。",
          "lineId": "floor.14.before.line.01"
        },
        {
          "speaker": "零",
          "text": "绝不。那里有烬羽的余温、星使的旧像，还有伽蓝守到最后的诺言。",
          "lineId": "floor.14.before.line.02"
        },
        {
          "speaker": "神秘女声",
          "text": "他们只会用愧疚困住你的脚步，从来不敢让你见一见真正的自己。",
          "lineId": "floor.14.before.line.03"
        },
        {
          "speaker": "零",
          "text": "奇怪……我一按住腰间的旧物，你的声音就变远了。原来你在害怕它们？",
          "lineId": "floor.14.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "把剑穗、怀表和黄金发条贴近灯环，躁动的青火立刻安静下来了。",
          "lineId": "floor.14.after.line.01"
        },
        {
          "speaker": "零",
          "text": "我不会在这里退回去。我要带着大家的托付走到镜前，当面做个了断。",
          "lineId": "floor.14.after.line.02"
        }
      ],
      "stageId": "floor.14",
      "eventId": "event.floor.14.enter"
    },
    {
      "floor": 15,
      "title": "终门前的苍翠风翎",
      "act": "第四幕 · 日蚀镜界",
      "location": "终门前的风亭",
      "objective": "从粗陶杯缺口的细节认出第四位同伴青羽，将苍翠风翎系上灯环，集齐四段誓约。",
      "before": [
        {
          "speaker": "零",
          "text": "从桥头初见到现在，你每次递粗陶杯，都会把没有缺口的一侧转到我手边。",
          "lineId": "floor.15.before.line.01"
        },
        {
          "speaker": "青羽",
          "text": "……到底是从前一起喝茶留下的老习惯，装了这么久行商，还是露馅啦。",
          "lineId": "floor.15.before.line.02"
        },
        {
          "speaker": "零",
          "text": "你就是站在画框外替大家温茶的第四位同伴……对不起，每一次我都把你忘了。",
          "lineId": "floor.15.before.line.03"
        },
        {
          "speaker": "青羽",
          "text": "傻话，能看你平安坐在这里就够了。重新认识一下吧——我是青羽，你的同伴。",
          "lineId": "floor.15.before.line.04"
        },
        {
          "speaker": "青羽",
          "text": "把我帽间这枚苍翠风翎也系在灯环上吧。门后的路，这一次由你自己决定。",
          "lineId": "floor.15.before.line.05"
        }
      ],
      "after": [
        {
          "speaker": "零",
          "text": "刚才重逢的话，在过去的漫长雨夜里，你是不是已经练习过很多遍了？",
          "lineId": "floor.15.after.line.01"
        },
        {
          "speaker": "青羽",
          "text": "数不清啦。不过这一回你肯安静听完，我就陪你把炉火守到最后一刻。",
          "lineId": "floor.15.after.line.02"
        },
        {
          "speaker": "零",
          "text": "再等我片刻。推开终门之前，我想把四件信物里的约定再完整记牢一遍。",
          "lineId": "floor.15.after.line.03"
        }
      ],
      "stageId": "floor.15",
      "eventId": "event.floor.15.enter"
    },
    {
      "floor": 16,
      "title": "裂镜与覆眼黑纱",
      "act": "第四幕 · 日蚀镜界",
      "location": "零号圣所 · 黑曜石巨镜",
      "objective": "直面裂镜中蒙着黑纱的日蚀圣女，在交出魂灯重坠轮回与携四人之约斩碎黑日之间做出抉择。",
      "before": [
        {
          "speaker": "日蚀圣女",
          "text": "醒了吗？握紧灯环……这一次，你终于走到镜前了。",
          "lineId": "floor.16.before.line.01"
        },
        {
          "speaker": "零",
          "text": "和石棺旁一模一样的声音……镜子裂痕里映着我的脸，你究竟是谁？",
          "lineId": "floor.16.before.line.02"
        },
        {
          "speaker": "日蚀圣女",
          "text": "我是被你剥离在塔顶的黑日半身。把手里的魂灯交给我，我们便能重归完整。",
          "lineId": "floor.16.before.line.03"
        },
        {
          "speaker": "零",
          "text": "你用黑纱蒙住双眼，是不敢看如今的我，还是不敢看被黑日吞没的王城？",
          "lineId": "floor.16.before.line.04"
        }
      ],
      "after": [
        {
          "speaker": "日蚀圣女",
          "text": "镜面碎了……明明每次醒来连名字都忘了，你究竟是怎么留住他们的？",
          "lineId": "floor.16.after.line.01"
        },
        {
          "speaker": "零",
          "text": "红剑穗、银怀表、黄金发条、苍翠风翎……他们把我的心意一件件替我留好了。",
          "lineId": "floor.16.after.line.02"
        },
        {
          "speaker": "零",
          "text": "睡吧，另一个我。镜子后面……天已经开始亮了。",
          "lineId": "floor.16.after.line.03"
        }
      ],
      "stageId": "floor.16",
      "eventId": "event.floor.16.enter"
    }
  ],
  "boss_stages": {
    "jinyu": {
      "character": "烬羽",
      "floor": 4,
      "first_meeting_floor": 1,
      "first_meeting": {
        "stageId": "boss.jinyu.first_meeting",
        "eventId": "event.boss.jinyu.first_meeting",
        "title": "初见 · 雨桥横刀的人",
        "dialogue": [
          {
            "speaker": "烬羽",
            "text": "桥头到此为止。把手里那盏青灯放下，退回风亭去。",
            "lineId": "boss.jinyu.first_meeting.line.01"
          },
          {
            "speaker": "零",
            "text": "看清我的脸时，你按刀的手明明抖了一下……你认识我，对吗？",
            "lineId": "boss.jinyu.first_meeting.line.02"
          },
          {
            "speaker": "烬羽",
            "text": "认错人了。长桥只拦提灯入塔的闯入者，不叙旧情。",
            "lineId": "boss.jinyu.first_meeting.line.03"
          },
          {
            "speaker": "零",
            "text": "既然你不肯把话说清，那我只能越过你的刀锋，自己去塔里找答案了。",
            "lineId": "boss.jinyu.first_meeting.line.04"
          }
        ],
        "shots": [
          {
            "seconds": 5,
            "shotId": "boss.jinyu.first_meeting.shot.01",
            "line": {
              "speaker": "烬羽",
              "text": "桥头到此为止。把手里那盏青灯放下，退回风亭去。"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.jinyu.first_meeting.shot.02",
            "line": {
              "speaker": "零",
              "text": "看清我的脸时，你按刀的手明明抖了一下……你认识我，对吗？"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.jinyu.first_meeting.shot.03",
            "line": {
              "speaker": "烬羽",
              "text": "认错人了。长桥只拦提灯入塔的闯入者，不叙旧情。"
            }
          }
        ]
      },
      "pre_battle": {
        "stageId": "boss.jinyu.pre_battle",
        "eventId": "event.boss.jinyu.pre_battle",
        "title": "开战 · 绝不退让的桥门",
        "dialogue": [
          {
            "speaker": "烬羽",
            "text": "再往前一步就是塔门。把那盏灯留在这里，这是我最后一次劝你。",
            "lineId": "boss.jinyu.pre_battle.line.01"
          },
          {
            "speaker": "零",
            "text": "你明明一路都在护着我，为什么唯独进塔这件事，半句实话都不肯说？",
            "lineId": "boss.jinyu.pre_battle.line.02"
          },
          {
            "speaker": "烬羽",
            "text": "因为你知道真相也只会再选一次绝路——看刀吧，这一步我绝不退！",
            "lineId": "boss.jinyu.pre_battle.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 4,
            "shotId": "boss.jinyu.pre_battle.shot.01",
            "line": {
              "speaker": "烬羽",
              "text": "再往前一步就是塔门。把那盏灯留在这里，这是我最后一次劝你。"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.jinyu.pre_battle.shot.02",
            "line": {
              "speaker": "零",
              "text": "你明明一路都在护着我，为什么唯独进塔这件事，半句实话都不肯说？"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.jinyu.pre_battle.shot.03",
            "line": {
              "speaker": "烬羽",
              "text": "因为你知道真相也只会再选一次绝路——看刀吧，这一步我绝不退！"
            }
          }
        ]
      },
      "phase2": {
        "stageId": "boss.jinyu.phase2",
        "eventId": "event.boss.jinyu.phase2",
        "title": "二阶段 · 双刀解封与燃烬羽织",
        "dialogue": [
          {
            "speaker": "烬羽",
            "text": "……这一剑够重了。重到连替故人遮脸的白狐冷瓷，都压不住骨头里的余烬。",
            "lineId": "boss.jinyu.phase2.line.01"
          },
          {
            "speaker": "烬羽",
            "text": "左腰这把封尘胁差，我原本发誓不再出鞘——今日解封，只为替你把前路的冷雨烧干！",
            "lineId": "boss.jinyu.phase2.line.02"
          },
          {
            "speaker": "烬羽",
            "text": "来吧，零！接下我倾尽残魂的双刀之火——跨不过这座断桥，便休想踏上第二重塔阶！",
            "lineId": "boss.jinyu.phase2.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 3.2,
            "shotId": "boss.jinyu.phase2.shot.01",
            "line": {
              "speaker": "烬羽",
              "text": "……这一剑够重了。重到连替故人遮脸的白狐冷瓷，都压不住骨头里的余烬。"
            }
          },
          {
            "seconds": 3.4,
            "shotId": "boss.jinyu.phase2.shot.02",
            "line": {
              "speaker": "烬羽",
              "text": "左腰这把封尘胁差，我原本发誓不再出鞘——今日解封，只为替你把前路的冷雨烧干！"
            }
          },
          {
            "seconds": 3.8,
            "shotId": "boss.jinyu.phase2.shot.03",
            "line": {
              "speaker": "烬羽",
              "text": "来吧，零！接下我倾尽残魂的双刀之火——跨不过这座断桥，便休想踏上第二重塔阶！"
            }
          }
        ]
      },
      "boss_defeated": {
        "stageId": "boss.jinyu.boss_defeated",
        "eventId": "event.boss.jinyu.boss_defeated",
        "title": "败北托付 · 余烬与歪结剑穗",
        "dialogue": [
          {
            "speaker": "烬羽",
            "text": "……别靠太近，先把提灯放远半步。它的青光太冷了。",
            "lineId": "boss.jinyu.boss_defeated.line.01"
          },
          {
            "speaker": "零",
            "text": "断刀旁这条褪色的红剑穗……上面歪歪扭扭的死结，为什么这么眼熟？",
            "lineId": "boss.jinyu.boss_defeated.line.02"
          },
          {
            "speaker": "烬羽",
            "text": "你在风亭石阶上系了三回才打牢的，我一直没拆……拿着吧，别弄丢了。",
            "lineId": "boss.jinyu.boss_defeated.line.03"
          },
          {
            "speaker": "零",
            "text": "掌心还留着余烬的暖意……我答应你，不拆开它，一定带着它平安走出去。",
            "lineId": "boss.jinyu.boss_defeated.line.04"
          }
        ],
        "shots": [
          {
            "seconds": 5,
            "shotId": "boss.jinyu.boss_defeated.shot.01",
            "line": {
              "speaker": "烬羽",
              "text": "……别靠太近，先把提灯放远半步。它的青光太冷了。"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.jinyu.boss_defeated.shot.02",
            "line": {
              "speaker": "零",
              "text": "断刀旁这条褪色的红剑穗……上面歪歪扭扭的死结，为什么这么眼熟？"
            }
          },
          {
            "seconds": 6,
            "shotId": "boss.jinyu.boss_defeated.shot.03",
            "line": {
              "speaker": "烬羽",
              "text": "你在风亭石阶上系了三回才打牢的，我一直没拆……拿着吧，别弄丢了。"
            }
          }
        ]
      }
    },
    "astria": {
      "character": "艾丝特莉亚",
      "floor": 8,
      "first_meeting_floor": 5,
      "first_meeting": {
        "stageId": "boss.astria.first_meeting",
        "eventId": "event.boss.astria.first_meeting",
        "title": "初见 · 冰柱里的微息",
        "dialogue": [
          {
            "speaker": "零",
            "text": "整排冰柱里封着的都是城里的百姓……看，那孩子的眼睫还在微动！",
            "lineId": "boss.astria.first_meeting.line.01"
          },
          {
            "speaker": "艾丝特莉亚",
            "text": "把提灯压低，别让青光照进冰层！……提灯人，你不该踏进这座圣堂。",
            "lineId": "boss.astria.first_meeting.line.02"
          },
          {
            "speaker": "零",
            "text": "他们没有死，只是睡在冰里……整座城的人，全是你亲手封住的吗？",
            "lineId": "boss.astria.first_meeting.line.03"
          },
          {
            "speaker": "艾丝特莉亚",
            "text": "是我降下的永冻之咒。若想问罪，便随我到远离冰棺的拱廊外来。",
            "lineId": "boss.astria.first_meeting.line.04"
          }
        ],
        "shots": [
          {
            "seconds": 5,
            "shotId": "boss.astria.first_meeting.shot.01",
            "line": {
              "speaker": "零",
              "text": "整排冰柱里封着的都是城里的百姓……看，那孩子的眼睫还在微动！"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.astria.first_meeting.shot.02",
            "line": {
              "speaker": "艾丝特莉亚",
              "text": "把提灯压低，别让青光照进冰层！……提灯人，你不该踏进这座圣堂。"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.astria.first_meeting.shot.03",
            "line": {
              "speaker": "艾丝特莉亚",
              "text": "是我降下的永冻之咒。若想问罪，便随我到远离冰棺的拱廊外来。"
            }
          }
        ]
      },
      "pre_battle": {
        "stageId": "boss.astria.pre_battle",
        "eventId": "event.boss.astria.pre_battle",
        "title": "开战 · 琴盒与圣堂冰障",
        "dialogue": [
          {
            "speaker": "艾丝特莉亚",
            "text": "圣堂尽头便是通往钟楼的石阶。我不能让这盏魂灯越过冰障半步。",
            "lineId": "boss.astria.pre_battle.line.01"
          },
          {
            "speaker": "零",
            "text": "我已经把灯火压住了。让我看看那枚怀表，告诉我当年究竟发生了什么！",
            "lineId": "boss.astria.pre_battle.line.02"
          },
          {
            "speaker": "艾丝特莉亚",
            "text": "你上次也是这样攥紧灯环说能控制它……退后吧，琴盒合上之前我不会让路！",
            "lineId": "boss.astria.pre_battle.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 4,
            "shotId": "boss.astria.pre_battle.shot.01",
            "line": {
              "speaker": "艾丝特莉亚",
              "text": "圣堂尽头便是通往钟楼的石阶。我不能让这盏魂灯越过冰障半步。"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.astria.pre_battle.shot.02",
            "line": {
              "speaker": "零",
              "text": "我已经把灯火压住了。让我看看那枚怀表，告诉我当年究竟发生了什么！"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.astria.pre_battle.shot.03",
            "line": {
              "speaker": "艾丝特莉亚",
              "text": "你上次也是这样攥紧灯环说能控制它……退后吧，琴盒合上之前我不会让路！"
            }
          }
        ]
      },
      "phase2": {
        "stageId": "boss.astria.phase2",
        "eventId": "event.boss.astria.phase2",
        "title": "二阶段 · 碎冕极光与六翼凛冬礼装",
        "dialogue": [
          {
            "speaker": "艾丝特莉亚",
            "text": "……连最后一只替我封存歌声的水晶八音盒，也要碎在你的剑风里了吗？",
            "lineId": "boss.astria.phase2.line.01"
          },
          {
            "speaker": "艾丝特莉亚",
            "text": "也好……既然盒子留不住旧日回响，那便让这些碎裂的音符，化作送行的六翼冰棱！",
            "lineId": "boss.astria.phase2.line.02"
          },
          {
            "speaker": "艾丝特莉亚",
            "text": "胸口这枚银怀表还在发烫……若你的灯火融不化这顶霜冠，便留在极光里替我守夜吧！",
            "lineId": "boss.astria.phase2.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 3.2,
            "shotId": "boss.astria.phase2.shot.01",
            "line": {
              "speaker": "艾丝特莉亚",
              "text": "……连最后一只替我封存歌声的水晶八音盒，也要碎在你的剑风里了吗？"
            }
          },
          {
            "seconds": 3.4,
            "shotId": "boss.astria.phase2.shot.02",
            "line": {
              "speaker": "艾丝特莉亚",
              "text": "也好……既然盒子留不住旧日回响，那便让这些碎裂的音符，化作送行的六翼冰棱！"
            }
          },
          {
            "seconds": 3.8,
            "shotId": "boss.astria.phase2.shot.03",
            "line": {
              "speaker": "艾丝特莉亚",
              "text": "胸口这枚银怀表还在发烫……若你的灯火融不化这顶霜冠，便留在极光里替我守夜吧！"
            }
          }
        ]
      },
      "boss_defeated": {
        "stageId": "boss.astria.boss_defeated",
        "eventId": "event.boss.astria.boss_defeated",
        "title": "败北托付 · 坠落的冰冠与双人旧像",
        "dialogue": [
          {
            "speaker": "艾丝特莉亚",
            "text": "冰冠落了也好……来，表扣有些冻涩，隔着手套用拇指轻轻抵住这里。",
            "lineId": "boss.astria.boss_defeated.line.01"
          },
          {
            "speaker": "零",
            "text": "表盖弹开了……里面并肩笑着的两个人，靠在你肩畔的那个，是我？",
            "lineId": "boss.astria.boss_defeated.line.02"
          },
          {
            "speaker": "艾丝特莉亚",
            "text": "那晚魂灯失控吞噬王城，是你抓紧我的衣袖，哭着求我把所有人冻进时间里。",
            "lineId": "boss.astria.boss_defeated.line.03"
          },
          {
            "speaker": "零",
            "text": "原来你独自守在永夜的寒冰里，是在替我护住整座城的呼吸……对不起。",
            "lineId": "boss.astria.boss_defeated.line.04"
          }
        ],
        "shots": [
          {
            "seconds": 5,
            "shotId": "boss.astria.boss_defeated.shot.01",
            "line": {
              "speaker": "艾丝特莉亚",
              "text": "冰冠落了也好……来，表扣有些冻涩，隔着手套用拇指轻轻抵住这里。"
            }
          },
          {
            "seconds": 6,
            "shotId": "boss.astria.boss_defeated.shot.02",
            "line": {
              "speaker": "零",
              "text": "表盖弹开了……里面并肩笑着的两个人，靠在你肩畔的那个，是我？"
            }
          },
          {
            "seconds": 6,
            "shotId": "boss.astria.boss_defeated.shot.03",
            "line": {
              "speaker": "零",
              "text": "原来你独自守在永夜的寒冰里，是在替我护住整座城的呼吸……对不起。"
            }
          }
        ]
      }
    },
    "jialan": {
      "character": "伽蓝",
      "floor": 12,
      "first_meeting_floor": 9,
      "first_meeting": {
        "stageId": "boss.jialan.first_meeting",
        "eventId": "event.boss.jialan.first_meeting",
        "title": "初见 · 悬停的雨滴与巨钟",
        "dialogue": [
          {
            "speaker": "零",
            "text": "雨滴停在半空了，连巨钟的指针都在倒着颤动……露台上有人？",
            "lineId": "boss.jialan.first_meeting.line.01"
          },
          {
            "speaker": "伽蓝",
            "text": "别往台阶外侧踩，那里的石栏早就松了。不想摔进云海就退后半步。",
            "lineId": "boss.jialan.first_meeting.line.02"
          },
          {
            "speaker": "零",
            "text": "谢谢你出声提醒……可上面那道通往塔顶的齿轮门，也是你刚刚锁死的吧？",
            "lineId": "boss.jialan.first_meeting.line.03"
          },
          {
            "speaker": "伽蓝",
            "text": "是我锁的。先在平台上站稳了，再跟我谈该不该放行。",
            "lineId": "boss.jialan.first_meeting.line.04"
          }
        ],
        "shots": [
          {
            "seconds": 5,
            "shotId": "boss.jialan.first_meeting.shot.01",
            "line": {
              "speaker": "零",
              "text": "雨滴停在半空了，连巨钟的指针都在倒着颤动……露台上有人？"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.jialan.first_meeting.shot.02",
            "line": {
              "speaker": "伽蓝",
              "text": "别往台阶外侧踩，那里的石栏早就松了。不想摔进云海就退后半步。"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.jialan.first_meeting.shot.03",
            "line": {
              "speaker": "伽蓝",
              "text": "是我锁的。先在平台上站稳了，再跟我谈该不该放行。"
            }
          }
        ]
      },
      "pre_battle": {
        "stageId": "boss.jialan.pre_battle",
        "eventId": "event.boss.jialan.pre_battle",
        "title": "开战 · 逆拧的黄铜发条钥",
        "dialogue": [
          {
            "speaker": "伽蓝",
            "text": "星晷台后的十二道门栓已全部焊死。从这里往上，再无通路。",
            "lineId": "boss.jialan.pre_battle.line.01"
          },
          {
            "speaker": "零",
            "text": "把你心核里封存的那道原声放给我听吧，伽蓝。我想知道自己在替谁赎罪。",
            "lineId": "boss.jialan.pre_battle.line.02"
          },
          {
            "speaker": "伽蓝",
            "text": "除非你放下魂灯——否则就算拧断脑后的发条钥，我也要拦住你！",
            "lineId": "boss.jialan.pre_battle.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 4,
            "shotId": "boss.jialan.pre_battle.shot.01",
            "line": {
              "speaker": "伽蓝",
              "text": "星晷台后的十二道门栓已全部焊死。从这里往上，再无通路。"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.jialan.pre_battle.shot.02",
            "line": {
              "speaker": "零",
              "text": "把你心核里封存的那道原声放给我听吧，伽蓝。我想知道自己在替谁赎罪。"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.jialan.pre_battle.shot.03",
            "line": {
              "speaker": "伽蓝",
              "text": "除非你放下魂灯——否则就算拧断脑后的发条钥，我也要拦住你！"
            }
          }
        ]
      },
      "phase2": {
        "stageId": "boss.jialan.phase2",
        "eventId": "event.boss.jialan.phase2",
        "title": "二阶段 · 赤金发条与第十三响",
        "dialogue": [
          {
            "speaker": "伽蓝",
            "text": "咔哒……咔哒……体面的贵族剑礼已经用完了，再慢半拍，我就会停摆在这里。",
            "lineId": "boss.jialan.phase2.line.01"
          },
          {
            "speaker": "伽蓝",
            "text": "既然停下来就是变成废铁——那便把脑后这根发条拧到烧红为止，哪怕烧烫心口的主游丝！",
            "lineId": "boss.jialan.phase2.line.02"
          },
          {
            "speaker": "伽蓝",
            "text": "欢迎来到没有明天的『第十三响』，零！在这座逆转星晷里，每一秒都由我双剑断罪！",
            "lineId": "boss.jialan.phase2.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 3.2,
            "shotId": "boss.jialan.phase2.shot.01",
            "line": {
              "speaker": "伽蓝",
              "text": "咔哒……咔哒……体面的贵族剑礼已经用完了，再慢半拍，我就会停摆在这里。"
            }
          },
          {
            "seconds": 3.4,
            "shotId": "boss.jialan.phase2.shot.02",
            "line": {
              "speaker": "伽蓝",
              "text": "既然停下来就是变成废铁——那便把脑后这根发条拧到烧红为止，哪怕烧烫心口的主游丝！"
            }
          },
          {
            "seconds": 3.8,
            "shotId": "boss.jialan.phase2.shot.03",
            "line": {
              "speaker": "伽蓝",
              "text": "欢迎来到没有明天的『第十三响』，零！在这座逆转星晷里，每一秒都由我双剑断罪！"
            }
          }
        ]
      },
      "boss_defeated": {
        "stageId": "boss.jialan.boss_defeated",
        "eventId": "event.boss.jialan.boss_defeated",
        "title": "败北托付 · 断针之上的黄金发条",
        "dialogue": [
          {
            "speaker": "伽蓝",
            "text": "断针太窄，别再往前迈了……把手伸过来，黄金发条里的留声快要散了。",
            "lineId": "boss.jialan.boss_defeated.line.01"
          },
          {
            "speaker": "记忆中的零",
            "text": "如果有一天我忘了所有事，又提着灯回来……请拦住我。哪怕我求你，也别开门。",
            "lineId": "boss.jialan.boss_defeated.line.02"
          },
          {
            "speaker": "伽蓝",
            "text": "这座塔是你锁住灾厄的囚笼，而你手里的灯，正是从内部解封的钥匙。",
            "lineId": "boss.jialan.boss_defeated.line.03"
          },
          {
            "speaker": "零",
            "text": "原来把你困在断针与雷暴里九百九十八夜的人……一直都是我自己。",
            "lineId": "boss.jialan.boss_defeated.line.04"
          }
        ],
        "shots": [
          {
            "seconds": 5,
            "shotId": "boss.jialan.boss_defeated.shot.01",
            "line": {
              "speaker": "伽蓝",
              "text": "断针太窄，别再往前迈了……把手伸过来，黄金发条里的留声快要散了。"
            }
          },
          {
            "seconds": 6,
            "shotId": "boss.jialan.boss_defeated.shot.02",
            "line": {
              "speaker": "记忆中的零",
              "text": "如果有一天我忘了所有事，又提着灯回来……请拦住我。哪怕我求你，也别开门。"
            }
          },
          {
            "seconds": 6,
            "shotId": "boss.jialan.boss_defeated.shot.03",
            "line": {
              "speaker": "零",
              "text": "原来把你困在断针与雷暴里九百九十八夜的人……一直都是我自己。"
            }
          }
        ]
      }
    },
    "eclipse": {
      "character": "日蚀圣女",
      "floor": 16,
      "first_meeting_floor": 16,
      "first_meeting": {
        "stageId": "boss.eclipse.first_meeting",
        "eventId": "event.boss.eclipse.first_meeting",
        "title": "初见 · 裂镜与覆眼黑纱",
        "dialogue": [
          {
            "speaker": "日蚀圣女",
            "text": "醒了吗？握紧灯环……这一次，你终于走到镜前了。",
            "lineId": "boss.eclipse.first_meeting.line.01"
          },
          {
            "speaker": "零",
            "text": "和石棺旁一模一样的声音……镜子裂痕里映着我的脸，你究竟是谁？",
            "lineId": "boss.eclipse.first_meeting.line.02"
          },
          {
            "speaker": "日蚀圣女",
            "text": "我是被你剥离在塔顶的黑日半身。把手里的魂灯交给我，我们便能重归完整。",
            "lineId": "boss.eclipse.first_meeting.line.03"
          },
          {
            "speaker": "零",
            "text": "你用黑纱蒙住双眼，是不敢看如今的我，还是不敢看被黑日吞没的王城？",
            "lineId": "boss.eclipse.first_meeting.line.04"
          }
        ],
        "shots": [
          {
            "seconds": 5,
            "shotId": "boss.eclipse.first_meeting.shot.01"
          },
          {
            "seconds": 6,
            "shotId": "boss.eclipse.first_meeting.shot.02",
            "line": {
              "speaker": "日蚀圣女",
              "text": "醒了吗？握紧灯环……这一次，你终于走到镜前了。"
            }
          },
          {
            "seconds": 6,
            "shotId": "boss.eclipse.first_meeting.shot.03",
            "line": {
              "speaker": "零",
              "text": "和石棺旁一模一样的声音……镜子裂痕里映着我的脸，你究竟是谁？"
            }
          }
        ]
      },
      "pre_battle": {
        "stageId": "boss.eclipse.pre_battle",
        "eventId": "event.boss.eclipse.pre_battle",
        "title": "开战 · 拒绝交出的提灯",
        "dialogue": [
          {
            "speaker": "零",
            "text": "我已经答应过他们了。这盏从内部解开封印的魂灯，绝不会交到你手里。",
            "lineId": "boss.eclipse.pre_battle.line.01"
          },
          {
            "speaker": "日蚀圣女",
            "text": "他们明明认得你，却忍心看你一次次失忆，孤零零地从冷棺里爬出来？",
            "lineId": "boss.eclipse.pre_battle.line.02"
          },
          {
            "speaker": "零",
            "text": "可每一次接住我的都是他们——而只想借我的手放出黑日的，一直都是你！",
            "lineId": "boss.eclipse.pre_battle.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 4,
            "shotId": "boss.eclipse.pre_battle.shot.01",
            "line": {
              "speaker": "零",
              "text": "我已经答应过他们了。这盏从内部解开封印的魂灯，绝不会交到你手里。"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.eclipse.pre_battle.shot.02",
            "line": {
              "speaker": "日蚀圣女",
              "text": "他们明明认得你，却忍心看你一次次失忆，孤零零地从冷棺里爬出来？"
            }
          },
          {
            "seconds": 5,
            "shotId": "boss.eclipse.pre_battle.shot.03",
            "line": {
              "speaker": "零",
              "text": "可每一次接住我的都是他们——而只想借我的手放出黑日的，一直都是你！"
            }
          }
        ]
      },
      "phase2": {
        "stageId": "boss.eclipse.phase2",
        "eventId": "event.boss.eclipse.phase2",
        "title": "二阶段 · 破镜焚纱与黑金真我",
        "dialogue": [
          {
            "speaker": "日蚀圣女",
            "text": "你带着她们的火、霜与发条走到镜前……可你敢敲碎这面黑镜，看清里面究竟是谁吗？",
            "lineId": "boss.eclipse.phase2.line.01"
          },
          {
            "speaker": "日蚀圣女",
            "text": "看清楚吧，零——黑纱后这只与你同源的眼睛，从来不是神明，而是先一步绝望的你自己！",
            "lineId": "boss.eclipse.phase2.line.02"
          },
          {
            "speaker": "零",
            "text": "连这身黑曜金纹礼装都与我同源……那这一次，我就亲手跨过昨日之影，与你一同终结长夜！",
            "lineId": "boss.eclipse.phase2.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 3.4,
            "shotId": "boss.eclipse.phase2.shot.01",
            "line": {
              "speaker": "日蚀圣女",
              "text": "你带着她们的火、霜与发条走到镜前……可你敢敲碎这面黑镜，看清里面究竟是谁吗？"
            }
          },
          {
            "seconds": 3.6,
            "shotId": "boss.eclipse.phase2.shot.02",
            "line": {
              "speaker": "日蚀圣女",
              "text": "看清楚吧，零——黑纱后这只与你同源的眼睛，从来不是神明，而是先一步绝望的你自己！"
            }
          },
          {
            "seconds": 3.8,
            "shotId": "boss.eclipse.phase2.shot.03",
            "line": {
              "speaker": "零",
              "text": "连这身黑曜金纹礼装都与我同源……那这一次，我就亲手跨过昨日之影，与你一同终结长夜！"
            }
          }
        ]
      },
      "boss_defeated": {
        "stageId": "boss.eclipse.boss_defeated",
        "eventId": "event.boss.eclipse.boss_defeated",
        "title": "败北终幕 · 碎镜后的晨光",
        "dialogue": [
          {
            "speaker": "日蚀圣女",
            "text": "镜面碎了……明明每次醒来连名字都忘了，你究竟是怎么留住他们的？",
            "lineId": "boss.eclipse.boss_defeated.line.01"
          },
          {
            "speaker": "零",
            "text": "红剑穗、银怀表、黄金发条、苍翠风翎……他们把我的心意一件件替我留好了。",
            "lineId": "boss.eclipse.boss_defeated.line.02"
          },
          {
            "speaker": "零",
            "text": "睡吧，另一个我。镜子后面……天已经开始亮了。",
            "lineId": "boss.eclipse.boss_defeated.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 5,
            "shotId": "boss.eclipse.boss_defeated.shot.01",
            "line": {
              "speaker": "日蚀圣女",
              "text": "镜面碎了……明明每次醒来连名字都忘了，你究竟是怎么留住他们的？"
            }
          },
          {
            "seconds": 6,
            "shotId": "boss.eclipse.boss_defeated.shot.02",
            "line": {
              "speaker": "零",
              "text": "红剑穗、银怀表、黄金发条、苍翠风翎……他们把我的心意一件件替我留好了。"
            }
          },
          {
            "seconds": 6,
            "shotId": "boss.eclipse.boss_defeated.shot.03",
            "line": {
              "speaker": "零",
              "text": "睡吧，另一个我。镜子后面……天已经开始亮了。"
            }
          }
        ]
      }
    }
  },
  "qingyu_arc": {
    "stages": [
      {
        "stageId": "qingyu.first_contact",
        "eventId": "event.qingyu.first_contact",
        "title": "桥头初遇 · 风亭檐下的行商",
        "floor": 1,
        "dialogue": [
          {
            "speaker": "青羽",
            "text": "斗篷下摆都沾着石苔，刚从塔底淋雨上来吧？先接杯热茶暖暖手。",
            "lineId": "qingyu.first_contact.line.01"
          },
          {
            "speaker": "零",
            "text": "谢谢……我连自己的名字都想不起来了。你是守在桥头的人吗？",
            "lineId": "qingyu.first_contact.line.02"
          },
          {
            "speaker": "青羽",
            "text": "我叫青羽，只是个在风亭歇脚的行商。粗陶杯口有个小缺，喝时慢些。",
            "lineId": "qingyu.first_contact.line.03"
          }
        ],
        "shots": [
          {
            "seconds": 8,
            "shotId": "qingyu.first_contact.shot.01",
            "line": {
              "speaker": "青羽",
              "text": "斗篷下摆都沾着石苔，刚从塔底淋雨上来吧？先接杯热茶暖暖手。"
            }
          }
        ]
      },
      {
        "stageId": "qingyu.introduction",
        "eventId": "event.qingyu.introduction",
        "title": "三层夜话 · 残碑上的九百九十八",
        "floor": 3,
        "dialogue": [
          {
            "speaker": "青羽",
            "text": "手套都湿透了。快坐到小火炉边，铜壶里的茶刚煮开。",
            "lineId": "qingyu.introduction.line.01"
          },
          {
            "speaker": "零",
            "text": "青羽，我醒来时石棺旁的残碑上刻着“九百九十八”，那是什么意思？",
            "lineId": "qingyu.introduction.line.02"
          },
          {
            "speaker": "青羽",
            "text": "……只是旧时代留下的计数刻痕，风吹雨打太久，旁边的字早磨平了。",
            "lineId": "qingyu.introduction.line.03"
          },
          {
            "speaker": "零",
            "text": "可我提起这个数字时，你翻旧手札的动作停住了。你见过那座石碑？",
            "lineId": "qingyu.introduction.line.04"
          },
          {
            "speaker": "青羽",
            "text": "只是想起一位总爱逞强的故人。先暖暖身子吧，前面的封门不好过。",
            "lineId": "qingyu.introduction.line.05"
          }
        ],
        "shots": [
          {
            "seconds": 7,
            "shotId": "qingyu.introduction.shot.01",
            "line": {
              "speaker": "青羽",
              "text": "手套都湿透了。快坐到小火炉边，铜壶里的茶刚煮开。"
            }
          }
        ]
      },
      {
        "stageId": "qingyu.ribbon_evidence",
        "eventId": "event.qingyu.ribbon_evidence",
        "title": "五层重逢 · 歪结剑穗认旧主",
        "floor": 5,
        "dialogue": [
          {
            "speaker": "零",
            "text": "青羽，这是烬羽在桥门交给我的红剑穗。她说，上面的结是我系的。",
            "lineId": "qingyu.ribbon_evidence.line.01"
          },
          {
            "speaker": "青羽",
            "text": "这个歪歪扭扭的死结果然还在……这么久的风雨，她真的一回也没拆过。",
            "lineId": "qingyu.ribbon_evidence.line.02"
          },
          {
            "speaker": "零",
            "text": "你也认得它？可我握着它的时候，只觉得心里发酸，还是想不起那天。",
            "lineId": "qingyu.ribbon_evidence.line.03"
          },
          {
            "speaker": "青羽",
            "text": "那天你系了三次才打紧，她嘴上嫌丑，转头却宝贝似的护在刀柄上呢。",
            "lineId": "qingyu.ribbon_evidence.line.04"
          }
        ],
        "shots": [
          {
            "seconds": 7,
            "shotId": "qingyu.ribbon_evidence.shot.01",
            "line": {
              "speaker": "零",
              "text": "青羽，这是烬羽在桥门交给我的红剑穗。她说，上面的结是我系的。"
            }
          }
        ]
      },
      {
        "stageId": "qingyu.photo_evidence",
        "eventId": "event.qingyu.photo_evidence",
        "title": "八层炉火 · 画框之外的温茶人",
        "floor": 8,
        "dialogue": [
          {
            "speaker": "零",
            "text": "艾丝特莉亚把银怀表交给我了。表盖的小像里，我和她笑得那样安心。",
            "lineId": "qingyu.photo_evidence.line.01"
          },
          {
            "speaker": "青羽",
            "text": "那天风很暖，烬羽还在旁边替你们守着茶炉，生怕茶凉了呢。",
            "lineId": "qingyu.photo_evidence.line.02"
          },
          {
            "speaker": "零",
            "text": "连画框外的事你都记得这么清楚……青羽，当时执笔画像的人，是不是你？",
            "lineId": "qingyu.photo_evidence.line.03"
          },
          {
            "speaker": "青羽",
            "text": "……总得有人站在画外面，替你们把那壶甜茶温好呀。趁热喝吧。",
            "lineId": "qingyu.photo_evidence.line.04"
          }
        ],
        "shots": [
          {
            "seconds": 7,
            "shotId": "qingyu.photo_evidence.shot.01",
            "line": {
              "speaker": "零",
              "text": "艾丝特莉亚把银怀表交给我了。表盖的小像里，我和她笑得那样安心。"
            }
          }
        ]
      },
      {
        "stageId": "qingyu.command_evidence",
        "eventId": "event.qingyu.command_evidence",
        "title": "十二层坦白 · 为何不在桥头说破",
        "floor": 12,
        "dialogue": [
          {
            "speaker": "零",
            "text": "我在黄金发条里听见了自己的声音……是我亲口命令伽蓝绝不许放我上楼的。",
            "lineId": "qingyu.command_evidence.line.01"
          },
          {
            "speaker": "青羽",
            "text": "嗯。封塔那晚你最怕的，就是失忆后的自己被灯火哄骗，亲手放出塔顶的黑日。",
            "lineId": "qingyu.command_evidence.line.02"
          },
          {
            "speaker": "零",
            "text": "既然你什么都知道，为什么第一天在桥头风亭遇见我时，不直接拦住我？",
            "lineId": "qingyu.command_evidence.line.03"
          },
          {
            "speaker": "青羽",
            "text": "前几十次试着拦过呀。可那时你只信手里的灯，警惕地问我是不是也想囚禁你。",
            "lineId": "qingyu.command_evidence.line.04"
          },
          {
            "speaker": "青羽",
            "text": "所以我才明白，唯有让你亲手接过剑穗、怀表与发条，你才会重新相信我们。",
            "lineId": "qingyu.command_evidence.line.05"
          }
        ],
        "shots": [
          {
            "seconds": 7,
            "shotId": "qingyu.command_evidence.shot.01",
            "line": {
              "speaker": "零",
              "text": "我在黄金发条里听见了自己的声音……是我亲口命令伽蓝绝不许放我上楼的。"
            }
          }
        ]
      },
      {
        "stageId": "qingyu.memory_keeper",
        "eventId": "event.qingyu.memory_keeper",
        "title": "十五层终门前夜 · 第四位守誓同伴",
        "floor": 15,
        "dialogue": [
          {
            "speaker": "零",
            "text": "从桥头初见到现在，你每次递粗陶杯，都会把没有缺口的一侧转到我手边。",
            "lineId": "qingyu.memory_keeper.line.01"
          },
          {
            "speaker": "青羽",
            "text": "……到底是从前一起喝茶留下的老习惯，装了这么久行商，还是露馅啦。",
            "lineId": "qingyu.memory_keeper.line.02"
          },
          {
            "speaker": "零",
            "text": "你就是站在画框外替大家温茶的第四位同伴……对不起，每一次我都把你忘了。",
            "lineId": "qingyu.memory_keeper.line.03"
          },
          {
            "speaker": "青羽",
            "text": "傻话，能看你平安坐在这里就够了。重新认识一下吧——我是青羽，你的同伴。",
            "lineId": "qingyu.memory_keeper.line.04"
          },
          {
            "speaker": "青羽",
            "text": "把我帽间这枚苍翠风翎也系在灯环上吧。门后的路，这一次由你自己决定。",
            "lineId": "qingyu.memory_keeper.line.05"
          }
        ],
        "shots": [
          {
            "seconds": 7,
            "shotId": "qingyu.memory_keeper.shot.01",
            "line": {
              "speaker": "零",
              "text": "从桥头初见到现在，你每次递粗陶杯，都会把没有缺口的一侧转到我手边。"
            }
          }
        ]
      }
    ]
  },
  "player_defeat": {
    "stageId": "player.defeat",
    "eventId": "event.player.defeat",
    "title": "半途力竭 · 魂灯未熄",
    "dialogue": [
      {
        "speaker": "零",
        "text": "……膝盖有些脱力了。冷雨落在积水里，先缓一口气。",
        "lineId": "player.defeat.line.01"
      },
      {
        "speaker": "零",
        "text": "跌在石砖上的提灯还跳着一点青火……还没结束，我还能再站起来。",
        "lineId": "player.defeat.line.02"
      }
    ],
    "shots": [
      {
        "seconds": 3,
        "line": {
          "speaker": "零",
          "text": "……膝盖有些脱力了。冷雨落在积水里，先缓一口气。"
        },
        "shotId": "player.defeat.shot.01"
      },
      {
        "seconds": 3,
        "line": {
          "speaker": "零",
          "text": "跌在石砖上的提灯还跳着一点青火……还没结束，我还能再站起来。"
        },
        "shotId": "player.defeat.shot.02"
      },
      {
        "seconds": 3,
        "line": {
          "speaker": "界面提示",
          "text": "你在这一层倒下了。但魂灯未熄，誓约尚在。"
        },
        "shotId": "player.defeat.shot.03"
      }
    ]
  },
  "endings": {
    "A": {
      "stageId": "ending.A",
      "eventId": "event.ending.A.enter",
      "title": "结局甲 · 镜前合掌与第一千次轮回",
      "dialogue": [
        {
          "speaker": "零",
          "text": "太累了……只要隔着镜面贴住你的手，这场没有尽头的冷雨就会停下吗？",
          "lineId": "ending.A.line.01"
        },
        {
          "speaker": "日蚀圣女",
          "text": "嗯，松开提灯吧。把掌心贴上来，从此你再也不必独自背负任何约定。",
          "lineId": "ending.A.line.02"
        },
        {
          "speaker": "合一后的声音",
          "text": "身后的灯灭了……长桥不见了，风亭也没了……有人吗？谁来回答我……",
          "lineId": "ending.A.line.03"
        },
        {
          "speaker": "零",
          "text": "……好冷。夜雨又落进石棺里了……我是谁？",
          "lineId": "ending.A.line.04"
        }
      ],
      "shots": [
        {
          "seconds": 9,
          "shotId": "ending.A.shot.01",
          "line": {
            "speaker": "零",
            "text": "太累了……只要隔着镜面贴住你的手，这场没有尽头的冷雨就会停下吗？"
          }
        },
        {
          "seconds": 9,
          "shotId": "ending.A.shot.02",
          "line": {
            "speaker": "日蚀圣女",
            "text": "嗯，松开提灯吧。把掌心贴上来，从此你再也不必独自背负任何约定。"
          }
        },
        {
          "seconds": 10,
          "shotId": "ending.A.shot.03",
          "line": {
            "speaker": "合一后的声音",
            "text": "身后的灯灭了……长桥不见了，风亭也没了……有人吗？谁来回答我……"
          }
        }
      ],
      "final_text": "棺畔残碑悄然添上第九百九十九道刻痕——第一千次轮回，再度开启。"
    },
    "B": {
      "stageId": "ending.B",
      "eventId": "event.ending.B.enter",
      "title": "结局乙 · 第一千道黎明",
      "dialogue": [
        {
          "speaker": "零",
          "text": "雨停了……桥面碎裂的镜片上，映出第一道金色的晨光了。",
          "lineId": "ending.B.line.01"
        },
        {
          "speaker": "零",
          "text": "剑穗、怀表、发条与风翎都在灯环上轻轻作响……原来你们一直陪我走到了桥头。",
          "lineId": "ending.B.line.02"
        },
        {
          "speaker": "青羽的记忆",
          "text": "天亮啦，零。别站在晨风里掉眼泪了，快回来把那盏热茶喝完吧。",
          "lineId": "ending.B.line.03"
        },
        {
          "speaker": "零",
          "text": "……嗯。灯火已经安静熄去了——这一次，我记得回家的路了。",
          "lineId": "ending.B.line.04"
        }
      ],
      "shots": [
        {
          "seconds": 9,
          "shotId": "ending.B.shot.01",
          "line": {
            "speaker": "零",
            "text": "雨停了……桥面碎裂的镜片上，映出第一道金色的晨光了。"
          }
        },
        {
          "seconds": 9,
          "shotId": "ending.B.shot.02",
          "line": {
            "speaker": "零",
            "text": "剑穗、怀表、发条与风翎都在灯环上轻轻作响……原来你们一直陪我走到了桥头。"
          }
        },
        {
          "seconds": 10,
          "shotId": "ending.B.shot.03",
          "line": {
            "speaker": "青羽的记忆",
            "text": "天亮啦，零。别站在晨风里掉眼泪了，快回来把那盏热茶喝完吧。"
          }
        }
      ],
      "final_text": "九百九十九夜长雨终歇——第一千道黎明里，魂灯安然长熄。"
    }
  }
};
if (typeof globalThis !== "undefined") globalThis.SpireStoryV2 = SpireStoryV2;
