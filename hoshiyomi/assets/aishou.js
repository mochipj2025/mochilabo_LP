/* 星読み — 相性の計算
 *
 * 3つの流儀で見る。
 *   西洋 … シナストリー（2人の星どうしの角度）
 *   宿曜 … 三九の秘法（27宿の距離で決まる。行きと帰りで関係が違うのが特徴）
 *   四柱推命 … 日柱どうしの関係（干の組み合わせと、支の組み合わせ）
 *
 * 三九の秘法の構造:
 *   自分の宿を0として、9番目が業、18番目が胎。この3つが「三」。
 *   その各起点から 栄・衰・安・危・成・壊・友・親 が続く。これが「九」。
 *   相手から見た自分は距離 27−d になるので、関係は必ず対になる。
 *   （栄↔親、衰↔友、安↔壊、危↔成、業↔胎、命↔命。全部閉じる。）
 */
window.HOSHI_AISHOU = (function () {
  'use strict';

  var K = window.HOSHI_KOYOMI;
  var TY = window.HOSHI_TOYO;
  var T = window.HOSHI_TEXT;

  function norm360(d) { return ((d % 360) + 360) % 360; }
  function wrap180(d) { var x = norm360(d); return x > 180 ? x - 360 : x; }

  /* ================= 宿曜：三九の秘法 ================= */

  /* 各9個ぶんの並び。先頭は起点（命／業／胎）で、残り8つは共通。 */
  var RING = ['栄', '衰', '安', '危', '成', '壊', '友', '親'];
  var ANCHOR = ['命', '業', '胎'];
  var DISTANCE = ['近距離', '中距離', '遠距離'];

  function shukuRelation(fromIdx, toIdx) {
    var d = ((toIdx - fromIdx) % 27 + 27) % 27;
    var g = Math.floor(d / 9), p = d % 9;
    return {
      distance: d,
      group: DISTANCE[g],
      name: (p === 0) ? ANCHOR[g] : RING[p - 1]
    };
  }

  /* 行きと帰りの両方を返す。宿曜の相性は左右で違うのが本質。 */
  function shukuPair(aIdx, bIdx) {
    return {
      aToB: shukuRelation(aIdx, bIdx),   /* AがBをどう見るか */
      bToA: shukuRelation(bIdx, aIdx)    /* BがAをどう見るか */
    };
  }

  /* ================= 四柱推命：日柱どうし ================= */

  var GOGYO = ['木', '火', '土', '金', '水'];
  /* 干合。5組。 */
  var KANGO = { '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊' };

  function kanRelation(kanA, kanB) {
    var a = K.KAN[kanA], b = K.KAN[kanB];
    if (KANGO[a] === b) return { kind: '干合', note: '結びつきの強い組み合わせ' };
    var ea = K.KAN_ELEM[kanA], eb = K.KAN_ELEM[kanB];
    if (ea === eb) return { kind: '同じ性質', note: '似た者どうし' };
    var rel = (GOGYO.indexOf(eb) - GOGYO.indexOf(ea) + 5) % 5;
    if (rel === 1) return { kind: '与える', note: 'あなたが相手を育てる向き' };
    if (rel === 4) return { kind: '受け取る', note: '相手があなたを育てる向き' };
    if (rel === 2) return { kind: '押す', note: 'あなたが相手を動かす向き' };
    return { kind: '押される', note: '相手があなたを動かす向き' };
  }

  /* 支の関係。合・三合・冲・害だけ見る。 */
  var SHIGO = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
  var SANGO = [[2, 6, 10], [11, 3, 7], [8, 0, 4], [5, 9, 1]];

  function shiRelation(shiA, shiB) {
    if (shiA === shiB) return { kind: '同じ', note: '同じものが重なる' };
    if (SHIGO[shiA] === shiB) return { kind: '支合', note: '結びつく形' };
    if (((shiB - shiA) % 12 + 12) % 12 === 6) return { kind: '冲', note: '正面からぶつかる形' };
    for (var i = 0; i < SANGO.length; i++) {
      if (SANGO[i].indexOf(shiA) >= 0 && SANGO[i].indexOf(shiB) >= 0) {
        return { kind: '三合', note: '三つでそろう組のうちの二つ' };
      }
    }
    return { kind: 'とくになし', note: '目立った結びつきはない' };
  }

  /* ================= 西洋：シナストリー ================= */

  var ASPECTS = [
    { deg: 0, name: '合', plain: '重なる', tone: 'strong', orb: 7 },
    { deg: 60, name: '六分', plain: '手を貸す', tone: 'soft', orb: 4 },
    { deg: 90, name: '矩', plain: 'ぶつかる', tone: 'hard', orb: 6 },
    { deg: 120, name: '三分', plain: '助ける', tone: 'soft', orb: 6 },
    { deg: 180, name: '衝', plain: '引っぱり合う', tone: 'hard', orb: 7 }
  ];

  /* 相性で見る組み合わせと、その重み。大きいほど上に出す。
     鍵は2つの星の名前を並べ替えたもの。AとBのどちら側かは問わない。 */
  var WEIGHT = {
    'moon-sun': 10, 'mars-venus': 9, 'moon-moon': 8, 'sun-sun': 7,
    'sun-venus': 6, 'moon-venus': 6, 'venus-venus': 5, 'mercury-mercury': 5,
    'mars-moon': 5, 'mars-sun': 4, 'mercury-venus': 4, 'saturn-sun': 4,
    'moon-saturn': 4, 'jupiter-sun': 3, 'jupiter-moon': 3, 'mars-mars': 3,
    'mercury-moon': 3, 'mercury-sun': 3, 'jupiter-venus': 3,
    'mars-mercury': 2, 'saturn-venus': 2, 'mars-saturn': 2, 'jupiter-mars': 2
  };
  var LOOK = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  var PAIRS = (function () {
    var out = [];
    LOOK.forEach(function (a) {
      LOOK.forEach(function (b) {
        var w = WEIGHT[[a, b].sort().join('-')];
        if (w) out.push({ a: a, b: b, w: w });
      });
    });
    return out;
  })();

  function bodyOf(west, key) {
    for (var i = 0; i < west.bodies.length; i++) if (west.bodies[i].def.key === key) return west.bodies[i];
    return null;
  }

  function synastry(westA, westB) {
    var out = [];
    PAIRS.forEach(function (p) {
      var ba = bodyOf(westA, p.a), bb = bodyOf(westB, p.b);
      if (!ba || !bb) return;
      var diff = Math.abs(wrap180(ba.lon - bb.lon));
      for (var i = 0; i < ASPECTS.length; i++) {
        var asp = ASPECTS[i];
        var gap = Math.abs(diff - asp.deg);
        if (gap <= asp.orb) {
          out.push({
            aName: ba.def.name, bName: bb.def.name,
            aKey: p.a, bKey: p.b,
            aspect: asp, gap: gap, weight: p.w
          });
          return;
        }
      }
    });
    /* 同じ組み合わせが左右で二重に出るので片方に寄せる */
    var seen = {}, uniq = [];
    out.forEach(function (x) {
      var k = [x.aKey, x.bKey].sort().join('-') + x.aspect.deg;
      if (seen[k]) return;
      seen[k] = true;
      uniq.push(x);
    });
    uniq.sort(function (x, y) {
      if (y.weight !== x.weight) return y.weight - x.weight;
      return x.gap - y.gap;
    });
    return uniq;
  }

  /* ================= まとめ ================= */

  function build(a, b) {
    var sa = TY.shukuyo(a.koyomi), sb = TY.shukuyo(b.koyomi);
    var pa = a.east.shichu.pillars[2], pb = b.east.shichu.pillars[2];
    return {
      shuku: {
        a: sa.name, b: sb.name,
        aIdx: sa.index, bIdx: sb.index,
        rel: shukuPair(sa.index, sb.index)
      },
      shichu: {
        aKan: pa.kan, bKan: pb.kan, aShi: pa.shi, bShi: pb.shi,
        kan: kanRelation(pa.kanIdx, pb.kanIdx),
        shi: shiRelation(pa.shiIdx, pb.shiIdx)
      },
      synastry: synastry(a.west, b.west),
      sunA: T.signs[a.west.bodies[0].sign].name,
      sunB: T.signs[b.west.bodies[0].sign].name,
      moonA: T.signs[a.west.bodies[1].sign].name,
      moonB: T.signs[b.west.bodies[1].sign].name
    };
  }

  return {
    RING: RING, ANCHOR: ANCHOR, DISTANCE: DISTANCE,
    shukuRelation: shukuRelation, shukuPair: shukuPair,
    kanRelation: kanRelation, shiRelation: shiRelation,
    synastry: synastry, build: build, ASPECTS: ASPECTS
  };
})();
