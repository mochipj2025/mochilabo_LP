/* 星読み — 東洋の四つ
 *
 * 四柱推命／宿曜／九星気学／紫微斗数。
 * 暦の変換は全部 koyomi.js に任せて、ここは「その暦から何を組み立てるか」だけを書く。
 * 文章は toyo-text.js。
 */
window.HOSHI_TOYO = (function () {
  'use strict';

  var K = window.HOSHI_KOYOMI;
  var KAN = K.KAN, SHI = K.SHI, KAN_ELEM = K.KAN_ELEM, KAN_YIN = K.KAN_YIN, SHI_ELEM = K.SHI_ELEM;
  var GOGYO = ['木', '火', '土', '金', '水'];

  /* ================================================================
   * 四柱推命
   * ============================================================== */

  /* 蔵干。地支に隠れている天干。並びは 余気・中気・本気 の順で、最後が本気。 */
  var ZOKAN = [
    ['壬', '癸'],            /* 子 */
    ['癸', '辛', '己'],      /* 丑 */
    ['戊', '丙', '甲'],      /* 寅 */
    ['甲', '乙'],            /* 卯 */
    ['乙', '癸', '戊'],      /* 辰 */
    ['戊', '庚', '丙'],      /* 巳 */
    ['丙', '己', '丁'],      /* 午 */
    ['丁', '乙', '己'],      /* 未 */
    ['戊', '壬', '庚'],      /* 申 */
    ['庚', '辛'],            /* 酉 */
    ['辛', '丁', '戊'],      /* 戌 */
    ['戊', '甲', '壬']       /* 亥 */
  ];

  /* 十二運。長生の位置は干ごとに決まっていて、陽干は順行、陰干は逆行する。 */
  var CHOSEI = { '甲': 11, '乙': 6, '丙': 2, '丁': 9, '戊': 2, '己': 9, '庚': 5, '辛': 0, '壬': 8, '癸': 3 };
  var UNSEI = ['長生', '沐浴', '冠帯', '臨官', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'];

  function junishiUn(kanIdx, shiIdx) {
    var start = CHOSEI[KAN[kanIdx]];
    var dir = KAN_YIN[kanIdx] ? -1 : 1;
    return UNSEI[(((shiIdx - start) * dir) % 12 + 12) % 12];
  }

  /* 通変星。日干から見て、相手の五行と陰陽がどうかで10種類に決まる。 */
  function tsuhen(dayKan, otherKan) {
    var rel = (GOGYO.indexOf(KAN_ELEM[otherKan]) - GOGYO.indexOf(KAN_ELEM[dayKan]) + 5) % 5;
    var same = KAN_YIN[dayKan] === KAN_YIN[otherKan];
    /* rel 0=同じ 1=日干が生む 2=日干が剋す 3=日干を剋す 4=日干を生む */
    return [
      same ? '比肩' : '劫財',
      same ? '食神' : '傷官',
      same ? '偏財' : '正財',
      same ? '偏官' : '正官',
      same ? '偏印' : '正印'
    ][rel];
  }

  /* 空亡（天中殺）。60干支を10ずつ6つの旬に分けたとき、その旬から漏れる2つの支。 */
  function kubo(dayGanshi) {
    var head = Math.floor(dayGanshi / 10) * 10;
    return [(head + 10) % 12, (head + 11) % 12];
  }

  function shichu(k) {
    var p = k.pillars;
    var dayKan = p.day % 10;

    function pillar(label, gs, note) {
      if (gs == null) return { label: label, empty: true, note: note };
      var kan = gs % 10, shi = gs % 12;
      var zk = ZOKAN[shi];
      return {
        label: label,
        ganshi: K.ganshiName(gs),
        kan: KAN[kan], shi: SHI[shi],
        kanIdx: kan, shiIdx: shi,
        kanElem: KAN_ELEM[kan], shiElem: SHI_ELEM[shi],
        zokan: zk,
        honki: zk[zk.length - 1],
        kanStar: label === '日柱' ? '日主' : tsuhen(dayKan, kan),
        shiStar: tsuhen(dayKan, KAN.indexOf(zk[zk.length - 1])),
        un: junishiUn(dayKan, shi)
      };
    }

    var pillars = [
      pillar('年柱', p.year),
      pillar('月柱', p.month),
      pillar('日柱', p.day),
      pillar('時柱', p.hour, '生まれた時刻が分からないため出せません')
    ];

    /* 五行の数。天干と地支を1つずつ数える（時柱が無ければ6つ、あれば8つ）。 */
    var count = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    var total = 0;
    pillars.forEach(function (q) {
      if (q.empty) return;
      count[q.kanElem]++; count[q.shiElem]++; total += 2;
    });

    var kb = kubo(p.day);

    return {
      pillars: pillars,
      dayKan: dayKan,
      dayKanName: KAN[dayKan],
      dayKanElem: KAN_ELEM[dayKan],
      dayKanYin: KAN_YIN[dayKan],
      count: count,
      total: total,
      kubo: [SHI[kb[0]], SHI[kb[1]]],
      kuboAnimal: [K.SHI_ANIMAL[kb[0]], K.SHI_ANIMAL[kb[1]]],
      setsu: k.setsu,
      timeUnknown: k.timeUnknown
    };
  }

  /* ================================================================
   * 宿曜（二十七宿）
   *
   * 旧暦の月ごとに「1日の宿」が決まっていて、そこから日数ぶん進める。
   * 月ごとの起点が2〜3ずつずれるのは、朔望月(29.53日)と恒星月(27.32日)の差
   * ちょうど2.21宿ぶん。12か月ぶん足すと27宿ちょうど一周する。
   * ============================================================== */

  var SHUKU = [
    '昴', '畢', '觜', '参', '井', '鬼', '柳', '星', '張',
    '翼', '軫', '角', '亢', '氐', '房', '心', '尾', '箕',
    '斗', '女', '虚', '危', '室', '壁', '奎', '婁', '胃'
  ];
  /* 旧暦1月〜12月の、1日の宿（月宿傍通暦の起点） */
  var SHUKU_HEAD = ['室', '奎', '胃', '畢', '参', '鬼', '張', '角', '氐', '心', '斗', '虚'];

  function shukuyo(k) {
    var l = k.lunar;
    var head = SHUKU.indexOf(SHUKU_HEAD[l.month - 1]);
    var idx = (head + l.day - 1) % 27;
    return {
      index: idx,
      name: SHUKU[idx],
      lunar: l,
      headName: SHUKU_HEAD[l.month - 1]
    };
  }

  /* ================================================================
   * 九星気学
   *
   * 本命星は立春で年が変わる。月命星は節入りで月が変わる。
   * どちらも数が減る向きに回る。
   * ============================================================== */

  var KYUSEI = [
    null,
    '一白水星', '二黒土星', '三碧木星', '四緑木星', '五黄土星',
    '六白金星', '七赤金星', '八白土星', '九紫火星'
  ];
  var KYUSEI_ELEM = [null, '水', '土', '木', '木', '土', '金', '金', '土', '火'];

  function digitRoot(n) {
    while (n > 9) {
      var s = 0;
      String(n).split('').forEach(function (c) { s += Number(c); });
      n = s;
    }
    return n;
  }

  function honmei(risshunYear) {
    var n = 11 - digitRoot(risshunYear);
    if (n > 9) n -= 9;
    if (n < 1) n += 9;
    return n;
  }

  /* 月命星。本命星のグループごとに、寅月（立春〜）の星が決まっている。
       一白・四緑・七赤 → 八白から
       二黒・五黄・八白 → 二黒から
       三碧・六白・九紫 → 五黄から
     以降、節月が進むごとに1つずつ減る。 */
  function getsumei(honmeiNo, monthShi) {
    var g = honmeiNo % 3;                        /* 1:一四七  2:二五八  0:三六九 */
    var start = (g === 1) ? 8 : (g === 2) ? 2 : 5;
    var step = ((monthShi - 2) % 12 + 12) % 12;  /* 寅月から何か月目か */
    var n = ((start - step - 1) % 9 + 9) % 9 + 1;
    return n;
  }

  function kyusei(k) {
    var h = honmei(k.risshunYear);
    var g = getsumei(h, k.setsu.shi);
    return {
      honmei: h, honmeiName: KYUSEI[h], honmeiElem: KYUSEI_ELEM[h],
      getsumei: g, getsumeiName: KYUSEI[g], getsumeiElem: KYUSEI_ELEM[g],
      risshunYear: k.risshunYear,
      setsu: k.setsu
    };
  }

  /* ================================================================
   * 紫微斗数
   *
   * 旧暦の月・日・時から命宮を出し、年干から五行局を決め、
   * 局と旧暦日から紫微星の位置を出して、そこに14の主星を配っていく。
   * ============================================================== */

  /* 六十花甲子納音。2つずつ組で同じ五行になる。 */
  var NAION = [
    '金', '火', '木', '土', '金', '火', '水', '土', '金', '木',
    '水', '土', '火', '木', '水', '金', '火', '木', '土', '金',
    '火', '水', '土', '金', '木', '水', '土', '火', '木', '水'
  ];
  var KYOKU = { '水': 2, '木': 3, '金': 4, '土': 5, '火': 6 };
  var KYOKU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };

  var PALACES = ['命宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮',
                 '遷移宮', '交友宮', '官禄宮', '田宅宮', '福徳宮', '父母宮'];

  /* 紫微系は紫微から逆に、天府系は天府から順に配る */
  var SHIBI_GROUP = [
    { name: '紫微', off: 0 }, { name: '天機', off: -1 }, { name: '太陽', off: -3 },
    { name: '武曲', off: -4 }, { name: '天同', off: -5 }, { name: '廉貞', off: -8 }
  ];
  var TENPU_GROUP = [
    { name: '天府', off: 0 }, { name: '太陰', off: 1 }, { name: '貪狼', off: 2 },
    { name: '巨門', off: 3 }, { name: '天相', off: 4 }, { name: '天梁', off: 5 },
    { name: '七殺', off: 6 }, { name: '破軍', off: 10 }
  ];

  /* 紫微星の位置。局数で旧暦日を割り、余りが出たら足りない分だけ前後にずらす。 */
  function shibiPos(kyoku, day) {
    var r = day % kyoku;
    if (r === 0) return (2 + day / kyoku - 1) % 12;
    var add = kyoku - r;
    var q = (day + add) / kyoku;
    var base = 2 + q - 1;
    var pos = (add % 2 === 0) ? base + add : base - add;
    return ((pos % 12) + 12) % 12;
  }

  function shibi(k) {
    if (k.timeUnknown) return { timeUnknown: true };

    var l = k.lunar;
    var hourShi = Math.floor(((Math.floor(k.usedHour) + 1) % 24) / 2) % 12;
    var lmonth = l.month;   /* 閏月は前の月として扱う流派を採る */

    var mei = (((2 + (lmonth - 1) - hourShi) % 12) + 12) % 12;
    var shin = (((2 + (lmonth - 1) + hourShi) % 12) + 12) % 12;

    /* 命宮の干支 → 納音 → 五行局。年干は旧暦年の干を使う。 */
    var lunarYearGanshi = ((l.year - 1984) % 60 + 60) % 60;
    var yearKan = lunarYearGanshi % 10;
    var meiKan = ((yearKan % 5) * 2 + 2 + (((mei - 2) % 12) + 12) % 12) % 10;
    var meiGanshi = K.ganshiIndex(meiKan, mei);
    var elem = NAION[Math.floor(meiGanshi / 2)];
    var kyoku = KYOKU[elem];

    var zi = shibiPos(kyoku, l.day);
    var tianfu = ((4 - zi) % 12 + 12) % 12;

    var stars = [];
    SHIBI_GROUP.forEach(function (s) {
      stars.push({ name: s.name, pos: ((zi + s.off) % 12 + 12) % 12, group: '紫微系' });
    });
    TENPU_GROUP.forEach(function (s) {
      stars.push({ name: s.name, pos: ((tianfu + s.off) % 12 + 12) % 12, group: '天府系' });
    });

    /* 12宮を命宮から逆回りに置く */
    var palaces = [];
    for (var i = 0; i < 12; i++) {
      var b = ((mei - i) % 12 + 12) % 12;
      palaces.push({
        name: PALACES[i],
        shi: SHI[b],
        shiIdx: b,
        stars: stars.filter(function (s) { return s.pos === b; }).map(function (s) { return s.name; })
      });
    }

    return {
      timeUnknown: false,
      mei: SHI[mei], meiIdx: mei,
      shin: SHI[shin], shinIdx: shin,
      meiGanshi: K.ganshiName(meiGanshi),
      kyoku: kyoku, kyokuName: KYOKU_NAME[kyoku], kyokuElem: elem,
      shibiAt: SHI[zi], tenpuAt: SHI[tianfu],
      hourShi: SHI[hourShi],
      stars: stars,
      palaces: palaces,
      meiStars: palaces[0].stars,
      lunar: l
    };
  }

  /* ================================================================ */

  function all(k) {
    return {
      koyomi: k,
      shichu: shichu(k),
      shukuyo: shukuyo(k),
      kyusei: kyusei(k),
      shibi: shibi(k)
    };
  }

  return {
    all: all, shichu: shichu, shukuyo: shukuyo, kyusei: kyusei, shibi: shibi,
    tsuhen: tsuhen, junishiUn: junishiUn, kubo: kubo, honmei: honmei, getsumei: getsumei,
    shibiPos: shibiPos,
    SHUKU: SHUKU, SHUKU_HEAD: SHUKU_HEAD, KYUSEI: KYUSEI, KYUSEI_ELEM: KYUSEI_ELEM,
    ZOKAN: ZOKAN, UNSEI: UNSEI, PALACES: PALACES, GOGYO: GOGYO,
    NAION: NAION, KYOKU_NAME: KYOKU_NAME
  };
})();
