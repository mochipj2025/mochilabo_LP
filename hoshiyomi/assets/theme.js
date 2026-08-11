/* 星読み — 気になるところ（テーマ別）
 *
 * 新しい占いを足すのではなく、いま出ている材料から
 * そのテーマを担当する星・場所・柱だけを抜き出して並べ直す。
 *
 * 一度に全部を並べないのがこのサイトの方針なので、
 * テーマは「選んだときだけ」出す。並べない。
 */
window.HOSHI_THEME = (function () {
  'use strict';

  var T = window.HOSHI_TEXT;

  /* どのテーマが、どの星と場所と柱を担当するか。
     lead は「そのテーマの主役」で、いちばん長く読む星。 */
  var THEMES = [
    {
      key: 'love', label: '恋愛と人との距離',
      lead: 'venus', leadWhat: '何を「いい」と感じるか。人への近づき方',
      supports: ['mars', 'moon'],        /* 欲しいと思ったときの動き / 安心の取り方 */
      houses: [5, 7],                    /* 遊びと表現・一対一の相手 */
      palace: '夫妻宮',
      pillar: '日柱',                    /* 四柱推命では日柱の地支が伴侶の座 */
      tsuhen: []
    },
    {
      key: 'work', label: '仕事と役割',
      lead: 'mars', leadWhat: 'やる気がどこで出るか。何にエンジンがかかるか',
      supports: ['saturn', 'sun'],       /* 時間をかけて身につけるもの / 向かう方向 */
      houses: [6, 10],
      palace: '官禄宮',
      pillar: '月柱',
      tsuhen: ['正官', '偏官']
    },
    {
      key: 'money', label: 'お金の使い方',
      lead: 'venus', leadWhat: '何にお金を出すか。どこで惜しまないか',
      supports: ['jupiter'],
      houses: [2, 8],
      palace: '財帛宮',
      pillar: null,
      tsuhen: ['正財', '偏財']
    }
  ];

  function norm360(d) { return ((d % 360) + 360) % 360; }

  function findBody(west, key) {
    for (var i = 0; i < west.bodies.length; i++) if (west.bodies[i].def.key === key) return west.bodies[i];
    return null;
  }

  /* そのハウスのカスプがどの星座から始まるか、中に何の星がいるか */
  function houseInfo(west, n) {
    var out = { n: n, topic: T.houses[n - 1].topic, examples: T.houses[n - 1].examples, sign: null, bodies: [] };
    if (west.houses) {
      out.sign = Math.floor(norm360(west.houses.cusps[n - 1]) / 30);
      west.bodies.forEach(function (b) { if (b.house === n) out.bodies.push(b); });
    }
    return out;
  }

  /* 命式にその役どころが出ているか（例：仕事のテーマなら正官・偏官） */
  function findTsuhen(east, names) {
    var hits = [];
    east.shichu.pillars.forEach(function (p) {
      if (p.empty) return;
      if (names.indexOf(p.kanStar) >= 0) hits.push({ pillar: p.label, star: p.kanStar, where: '天干' });
      if (names.indexOf(p.shiStar) >= 0) hits.push({ pillar: p.label, star: p.shiStar, where: '地支' });
    });
    return hits;
  }

  function palaceOf(east, name) {
    if (!east.shibi || east.shibi.timeUnknown) return null;
    for (var i = 0; i < east.shibi.palaces.length; i++) {
      if (east.shibi.palaces[i].name === name) return east.shibi.palaces[i];
    }
    return null;
  }

  /* テーマひとつぶんの材料をまとめる */
  function build(themeKey, west, east) {
    var th = null;
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].key === themeKey) th = THEMES[i];
    if (!th) return null;

    var lead = findBody(west, th.lead);
    var out = {
      key: th.key, label: th.label, leadWhat: th.leadWhat,
      lead: { def: lead.def, sign: lead.sign, deg: lead.degInSign, house: lead.house, retro: lead.retro },
      supports: th.supports.map(function (k) {
        var b = findBody(west, k);
        return { def: b.def, sign: b.sign, deg: b.degInSign, house: b.house, retro: b.retro };
      }),
      houses: th.houses.map(function (n) { return houseInfo(west, n); }),
      timeUnknown: !west.houses,
      palace: null, pillar: null, tsuhen: []
    };

    if (east) {
      out.palace = palaceOf(east, th.palace);
      if (th.pillar) {
        east.shichu.pillars.forEach(function (p) { if (p.label === th.pillar && !p.empty) out.pillar = p; });
      }
      if (th.tsuhen.length) out.tsuhen = findTsuhen(east, th.tsuhen);
    }
    return out;
  }

  return { THEMES: THEMES, build: build };
})();
