/* 星読み — 2026年の運勢（計算）
 *
 * 2026年に空で起きることは決まっているので、その一覧は定数として持つ。
 * 変わるのは「それがあなたのどこに当たるか」だけ。そこをここで計算する。
 *
 * 定数は scanYear() で実際に計算し直せるようにしてあり、
 * tests/test-y2026.js が両者の一致を確かめている。年を足すときも同じ手順で作れる。
 */
window.HOSHI_Y2026 = (function () {
  'use strict';

  var A = window.Astronomy;
  var T = window.HOSHI_TEXT;
  var DAY = 86400000;
  var YEAR = 2026;

  function norm360(d) { return ((d % 360) + 360) % 360; }
  function wrap180(d) { var x = norm360(d); return x > 180 ? x - 360 : x; }
  function lonOf(body, date) {
    var t = A.MakeTime(date);
    var v = (body === 'Moon') ? A.GeoMoon(t) : A.GeoVector(body, t, true);
    return norm360(A.SphereFromVector(A.RotateVector(A.Rotation_EQJ_ECT(t), v)).lon);
  }
  function d(m, day) { return new Date(Date.UTC(YEAR, m - 1, day)); }
  function md(date) {
    var t = new Date(date.getTime() + 9 * 3600000);
    return (t.getUTCMonth() + 1) + '月' + t.getUTCDate() + '日';
  }

  /* ---------------- 2026年に起きること ---------------- */

  /* 星座を移る外惑星。from/to は星座のindex（0=牡羊座）。 */
  var INGRESS = [
    { body: 'Neptune', jp: '海王星', month: 1, day: 27, from: 11, to: 0,
      cycle: 'およそ165年ぶり', span: '2039年ごろまで牡羊座' },
    { body: 'Saturn', jp: '土星', month: 2, day: 14, from: 11, to: 0,
      cycle: 'およそ29年ぶり', span: '2028年半ばまで牡羊座' },
    { body: 'Uranus', jp: '天王星', month: 4, day: 26, from: 1, to: 2,
      cycle: 'およそ84年ぶり', span: '2033年ごろまで双子座' },
    { body: 'Jupiter', jp: '木星', month: 6, day: 30, from: 3, to: 4,
      cycle: 'およそ12年ぶり', span: '2027年7月まで獅子座' }
  ];

  /* 外惑星どうしの重なり。2026年でいちばん大きいのは土星と海王星。 */
  var CONJ = [
    { a: '土星', b: '海王星', month: 2, day: 20, sign: 0, aspect: '合',
      cycle: 'およそ36年ぶり' }
  ];

  /* 食 */
  var ECLIPSE = [
    { kind: '日食', form: '金環', month: 2, day: 17, sign: 10 },
    { kind: '月食', form: '皆既', month: 3, day: 3, sign: 5 },
    { kind: '日食', form: '皆既', month: 8, day: 13, sign: 4 },
    { kind: '月食', form: '部分', month: 8, day: 28, sign: 11 }
  ];

  /* 逆行 */
  var RETRO = [
    { jp: '水星', spans: [['2月26日', '3月21日'], ['6月30日', '7月24日'], ['10月24日', '11月14日']] },
    { jp: '金星', spans: [['10月3日', '11月14日']] },
    { jp: '木星', spans: [['1月1日', '3月11日'], ['12月13日', '12月31日']] },
    { jp: '土星', spans: [['7月27日', '12月11日']] }
  ];

  /* 節目。この4つで年を5つに区切る。 */
  function chapters() {
    var out = [{ label: '年のはじめ', from: '1月1日', to: '1月26日', ingress: null }];
    INGRESS.forEach(function (g, i) {
      var next = INGRESS[i + 1];
      out.push({
        label: g.jp + 'が' + T.signs[g.to].name + 'へ',
        from: g.month + '月' + g.day + '日',
        to: next ? (next.month + '月' + (next.day - 1) + '日') : '12月31日',
        ingress: g
      });
    });
    return out;
  }

  /* ---------------- 検算用：定数を実際に計算し直す ---------------- */

  function refine(t0, t1, f) {
    var a = t0, b = t1;
    while (b - a > 3600000) {
      var m = new Date((a.getTime() + b.getTime()) / 2);
      if (f(m) === f(a)) a = m; else b = m;
    }
    return b;
  }

  function scanYear(year) {
    var saved = YEAR;
    YEAR = year;
    var found = [];
    ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].forEach(function (body) {
      var sign = function (x) { return Math.floor(lonOf(body, x) / 30); };
      var prev = new Date(Date.UTC(year - 1, 11, 31));
      var ps = sign(prev);
      for (var i = 0; i < 366; i++) {
        var day = new Date(Date.UTC(year, 0, 1) + i * DAY);
        var s = sign(day);
        if (s !== ps) {
          found.push({ body: body, at: refine(prev, day, sign), from: ps, to: s });
          ps = s;
        }
        prev = day;
      }
    });
    YEAR = saved;
    return found;
  }

  /* ---------------- あなたのどこに当たるか ---------------- */

  /* 12星座別。太陽星座を1室として数える（ソーラーサイン方式）。 */
  function solarProfile(sunSignIndex) {
    function house(signIdx) { return ((signIdx - sunSignIndex) % 12 + 12) % 12 + 1; }
    return {
      mode: 'solar',
      refLabel: '太陽星座（' + T.signs[sunSignIndex].name + '）を起点に、ざっくり数えています',
      sunSign: sunSignIndex,
      ingress: INGRESS.map(function (g) { return { ev: g, house: house(g.to) }; }),
      conj: CONJ.map(function (c) { return { ev: c, house: house(c.sign) }; }),
      eclipse: ECLIPSE.map(function (e) { return { ev: e, house: house(e.sign) }; })
    };
  }

  /* 出生図ベース。実際のハウスを使う。時刻不明ならソーラーサインに落とす。 */
  function natalProfile(west) {
    if (!west.houses) {
      var p = solarProfile(west.bodies[0].sign);
      p.mode = 'solar-fallback';
      p.refLabel = '生まれた時刻が分からないため、太陽星座（' +
        T.signs[west.bodies[0].sign].name + '）を起点にざっくり数えています';
      return p;
    }
    var cusps = west.houses.cusps;
    function houseOf(lon) {
      for (var i = 0; i < 12; i++) {
        if (norm360(lon - cusps[i]) < norm360(cusps[(i + 1) % 12] - cusps[i])) return i + 1;
      }
      return 1;
    }
    return {
      mode: 'natal',
      refLabel: '生まれた時刻と場所から出した、本当の場面で数えています（東の空に昇っていたのは' +
        T.signs[Math.floor(west.houses.asc / 30)].name + '）',
      sunSign: west.bodies[0].sign,
      ingress: INGRESS.map(function (g) { return { ev: g, house: houseOf(g.to * 30 + 0.5) }; }),
      conj: CONJ.map(function (c) { return { ev: c, house: houseOf(c.sign * 30 + 0.5) }; }),
      eclipse: ECLIPSE.map(function (e) {
        var lon = lonOf(e.kind === '日食' ? 'Sun' : 'Moon', d(e.month, e.day));
        return { ev: e, house: houseOf(lon), lon: lon, hits: nearNatal(west, lon, 3) };
      })
    };
  }

  /* その黄経の近くにある出生図の天体 */
  function nearNatal(west, lon, orb) {
    var out = [];
    west.bodies.forEach(function (b) {
      var gap = Math.abs(wrap180(b.lon - lon));
      if (gap <= orb) out.push({ name: b.def.name, gap: gap });
    });
    if (west.houses) {
      [['アセンダント', west.houses.asc], ['MC', west.houses.mc]].forEach(function (m) {
        var gap = Math.abs(wrap180(m[1] - lon));
        if (gap <= orb) out.push({ name: m[0], gap: gap });
      });
    }
    return out.sort(function (a, b) { return a.gap - b.gap; });
  }

  /* 2026年のあいだに、外惑星が出生図の天体とつくる角度。
     2日刻みで走らせて、ぴったりに近づいた日を拾う。 */
  var ASPECTS = [
    { deg: 0, name: '合', plain: '重なる', tone: 'strong' },
    { deg: 60, name: '六分', plain: '手を貸す', tone: 'soft' },
    { deg: 90, name: '矩', plain: 'ぶつかる', tone: 'hard' },
    { deg: 120, name: '三分', plain: '助ける', tone: 'soft' },
    { deg: 180, name: '衝', plain: '引っぱり合う', tone: 'hard' }
  ];
  var MOVERS = [
    { body: 'Jupiter', jp: '木星' }, { body: 'Saturn', jp: '土星' },
    { body: 'Uranus', jp: '天王星' }, { body: 'Neptune', jp: '海王星' },
    { body: 'Pluto', jp: '冥王星' }
  ];

  function transits(west, orb) {
    orb = orb || 1.0;
    var targets = west.bodies.map(function (b) {
      return { name: b.def.name, lon: b.lon, weight: b.def.weight };
    });
    if (west.houses) {
      targets.push({ name: 'アセンダント', lon: west.houses.asc, weight: 3 });
      targets.push({ name: 'MC', lon: west.houses.mc, weight: 3 });
    }

    /* 外惑星の黄経を2日刻みで先に作っておく（回転行列を日付ごとに使い回す）。
       走査は前年11月から翌年3月まで広げる。年の境目でぴったりになる角度を、
       1月1日や12月31日に丸めてしまわないため。 */
    var steps = [];
    var START = Date.UTC(YEAR - 1, 10, 1), END = Date.UTC(YEAR + 1, 2, 1);
    for (var ms = START; ms <= END; ms += 2 * DAY) {
      var day = new Date(ms);
      var time = A.MakeTime(day);
      var rot = A.Rotation_EQJ_ECT(time);
      var row = { date: day, lon: {} };
      MOVERS.forEach(function (m) {
        row.lon[m.body] = norm360(A.SphereFromVector(
          A.RotateVector(rot, A.GeoVector(m.body, time, true))).lon);
      });
      steps.push(row);
    }

    var out = [];
    MOVERS.forEach(function (m) {
      targets.forEach(function (tg) {
        ASPECTS.forEach(function (asp) {
          var best = null, inYear = [];
          steps.forEach(function (row) {
            var diff = Math.abs(wrap180(row.lon[m.body] - tg.lon));
            var gap = Math.abs(diff - asp.deg);
            if (gap > orb) return;
            if (!best || gap < best.gap) best = { gap: gap, date: row.date };
            if (row.date.getUTCFullYear() === YEAR) inYear.push(row.date);
          });
          /* 2026年のあいだに一度も範囲に入らないものは出さない */
          if (!best || !inYear.length) return;

          var y0 = inYear[0], y1 = inYear[inYear.length - 1];
          var spanDays = (y1 - y0) / DAY;
          var peakYear = best.date.getUTCFullYear();
          var when;
          if (spanDays > 300) {
            /* 冥王星のようにほとんど動かない星は、年内ずっと範囲に入る */
            when = '年間を通して';
          } else if (peakYear === YEAR) {
            when = md(best.date) + 'ごろ';
          } else if (peakYear < YEAR) {
            when = '年明け〜' + md(y1) + '（ぴったりだったのは' + peakYear + '年内）';
          } else {
            when = md(y0) + '〜年末（ぴったりになるのは' + peakYear + '年）';
          }
          out.push({
            mover: m.jp, target: tg.name, aspect: asp,
            date: when, spanDays: spanDays, peakYear: peakYear,
            gap: best.gap, weight: tg.weight || 1
          });
        });
      });
    });
    /* 効きの強い順：日月とASC/MCを先に、次にぴったり度 */
    out.sort(function (a, b) {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.gap - b.gap;
    });
    return out;
  }

  /* ---------------- 東洋の流年 ---------------- */

  var TOYO_YEAR = { ganshi: '丙午', kan: '丙', shi: '午', kanIdx: 2, shiIdx: 6, kyusei: 1 };

  /* 九星の年盤。中宮の星が分かれば、各星がどの宮に回座するか決まる。
     並びは 中宮 → 乾 → 兌 → 艮 → 離 → 坎 → 坤 → 震 → 巽 の順。 */
  var PALACE_PATH = [
    { name: '中宮', dir: '中央' }, { name: '乾宮', dir: '北西' }, { name: '兌宮', dir: '西' },
    { name: '艮宮', dir: '北東' }, { name: '離宮', dir: '南' }, { name: '坎宮', dir: '北' },
    { name: '坤宮', dir: '南西' }, { name: '震宮', dir: '東' }, { name: '巽宮', dir: '南東' }
  ];
  function kaiza(honmei, centerStar) {
    return PALACE_PATH[((honmei - centerStar) % 9 + 9) % 9];
  }

  function toyoProfile(east) {
    var TY = window.HOSHI_TOYO;
    var K = window.HOSHI_KOYOMI;
    var s = east.shichu;

    /* 年干が日主から見て何にあたるか */
    var tsuhen = TY.tsuhen(s.dayKan, TOYO_YEAR.kanIdx);

    /* 年支「午（馬）」と、命式の十二支の関係 */
    var SCENE = { '年柱': '育った家と若い頃', '月柱': '親と仕事', '日柱': 'あなた自身と近くの人', '時柱': '子どもと晩年' };
    var rel = [];
    s.pillars.forEach(function (p) {
      if (p.empty) return;
      var diff = ((p.shiIdx - TOYO_YEAR.shiIdx) % 12 + 12) % 12;
      var base = { pillar: p.label, pillarPlain: SCENE[p.label], shi: p.shi, animal: K.SHI_ANIMAL[p.shiIdx] };
      function push(kind, mean) { rel.push(Object.assign ? Object.assign({}, base, { kind: kind, mean: mean })
        : { pillar: base.pillar, pillarPlain: base.pillarPlain, shi: base.shi, animal: base.animal, kind: kind, mean: mean }); }
      if (diff === 6) push('冲', '正面からぶつかる。動かす年');
      else if (p.shiIdx === 2 || p.shiIdx === 10) push('三合', '虎・馬・犬でそろう。火の勢いが強まる');
      else if (diff === 1) push('支合', '馬と羊で結びつく。落ち着く方向');
      else if (diff === 0) push('同じ支', '同じものが重なる。強く出る');
    });

    /* 空亡に当たるか */
    var isKubo = s.kubo.indexOf(TOYO_YEAR.shi) >= 0;

    var pal = kaiza(east.kyusei.honmei, TOYO_YEAR.kyusei);

    return {
      year: TOYO_YEAR,
      tsuhen: tsuhen,
      dayKan: s.dayKanName,
      relations: rel,
      isKubo: isKubo,
      honmei: east.kyusei.honmei,
      honmeiName: east.kyusei.honmeiName,
      palace: pal,
      risshun: '2月4日',
      kyusho: '旧正月は2月17日'
    };
  }

  return {
    YEAR: YEAR,
    INGRESS: INGRESS, CONJ: CONJ, ECLIPSE: ECLIPSE, RETRO: RETRO,
    TOYO_YEAR: TOYO_YEAR, PALACE_PATH: PALACE_PATH,
    chapters: chapters, scanYear: scanYear,
    solarProfile: solarProfile, natalProfile: natalProfile,
    transits: transits, toyoProfile: toyoProfile, kaiza: kaiza,
    lonOf: lonOf, md: md
  };
})();
