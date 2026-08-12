/* お金の診断 — 判定
 *
 * 金額は本人の入力の足し算でしか出さない。占いが担当するのは向きと癖だけ。
 *   金星の星座   → 実際に払ってしまう領域
 *   本人の配点   → 自分で大事だと思っている領域
 *   その差       → ギャップ（この診断の主役）
 *   月柱の通変星 → お金の動かし方
 *
 * 計算は hoshiyomi の astro.js / koyomi.js / toyo.js に任せる。
 */
window.MONEY = (function () {
  'use strict';

  var A = window.HOSHI_ASTRO;
  var K = window.HOSHI_KOYOMI;
  var T = window.HOSHI_TOYO;
  var TXT = window.HOSHI_TEXT;

  /* 七つの領域。配点と金星を同じ言葉に落とすためのもの。 */
  var DOMAINS = [
    { key: 'sumai',  name: '住まい', hint: '住む場所、部屋、環境' },
    { key: 'jikan',  name: '時間',   hint: '自分で使える時間、余白' },
    { key: 'hito',   name: '人',     hint: '会う、つながる、一緒に過ごす' },
    { key: 'karada', name: 'からだ', hint: '体調、手入れ、休養' },
    { key: 'manabi', name: '学び',   hint: '知る、行く、試す' },
    { key: 'sonae',  name: '備え',   hint: '蓄える、将来、もしものとき' },
    { key: 'okuru',  name: '贈る',   hint: '人に渡す、支える、もてなす' }
  ];

  /* 金星の星座 → 領域。牡羊座を0とする。 */
  var VENUS_DOMAIN = [
    'jikan',   /* 牡羊 待てない。自分のペースに払う */
    'karada',  /* 牡牛 触り心地と質に払う */
    'manabi',  /* 双子 知ることと動くことに払う */
    'sumai',   /* 蟹   帰る場所に払う */
    'okuru',   /* 獅子 人にしてやることに払う */
    'karada',  /* 乙女 整えることに払う */
    'hito',    /* 天秤 関係そのものに払う */
    'sonae',   /* 蠍   手放さないために払う */
    'manabi',  /* 射手 遠くと経験に払う */
    'sonae',   /* 山羊 積み上げに払う */
    'jikan',   /* 水瓶 縛られないために払う */
    'okuru'    /* 魚   境目がなく、渡してしまう */
  ];

  /* 上乗せの選択肢。金額は目安で、画面にそのまま出す。 */
  var OPTIONS = {
    sumai:  [['今のままでいい', 0], ['少し広く、駅に近く', 30000], ['はっきり住み替える', 80000]],
    jikan:  [['今のままでいい', 0], ['週に半日あける', 25000], ['週に一日あける', 60000]],
    hito:   [['今のままでいい', 0], ['月に二回会う', 12000], ['月に四回会う', 28000]],
    karada: [['今のままでいい', 0], ['月に一回整える', 10000], ['月に三回＋道具', 30000]],
    manabi: [['今のままでいい', 0], ['本と単発の講座', 8000], ['続けて習う', 30000]],
    sonae:  [['今のままでいい', 0], ['毎月すこし積む', 30000], ['しっかり積む', 70000]],
    okuru:  [['今のままでいい', 0], ['折々に渡す', 8000], ['決めて定期的に', 25000]]
  };

  /* 請求ベースへの戻し。税と社会保険でおよそ3割引かれる前提。割る数を画面に出す。 */
  var TAKE_HOME = 0.7;

  function domainOf(key) {
    for (var i = 0; i < DOMAINS.length; i++) if (DOMAINS[i].key === key) return DOMAINS[i];
    return null;
  }

  /* 金星。星座の境目に近い日は決められないので、そのときは隣も返す。
     金星は1日におよそ1.2度動くので、端から1.3度以内を境目とみなす。 */
  function venusOf(year, month, day) {
    var r = A.calculate({
      year: year, month: month, day: day, hour: 12, minute: 0,
      lat: 35.69, lon: 139.69, tzOffset: 9, timeUnknown: true
    });
    var v = null;
    for (var i = 0; i < r.bodies.length; i++) if (r.bodies[i].def.key === 'venus') v = r.bodies[i];
    if (!v) throw new Error('金星が出せません');

    var deg = v.lon % 30;
    var out = {
      signIdx: v.sign,
      sign: TXT.signs[v.sign].name,
      deg: deg,
      domain: domainOf(VENUS_DOMAIN[v.sign]),
      boundary: false,
      alt: null
    };
    var near = null;
    if (deg < 1.3) near = (v.sign + 11) % 12;
    else if (deg > 28.7) near = (v.sign + 1) % 12;
    if (near !== null) {
      out.boundary = true;
      out.alt = { signIdx: near, sign: TXT.signs[near].name, domain: domainOf(VENUS_DOMAIN[near]) };
    }
    return out;
  }

  /* 月柱の通変星。スライム診断と同じ引き方をする。 */
  var STAR = {
    '比肩': { key: 'narabikabu', name: '対等' },
    '劫財': { key: 'karamizuru', name: '巻き込み' },
    '食神': { key: 'kaori',      name: 'ゆるみ' },
    '傷官': { key: 'toge',       name: '指摘' },
    '偏財': { key: 'nohara',     name: '出入り' },
    '正財': { key: 'une',        name: '守り' },
    '偏官': { key: 'hasami',     name: '追い込み' },
    '正官': { key: 'shichu',     name: '役割' },
    '偏印': { key: 'komorebi',   name: 'わき道' },
    '正印': { key: 'megumiame',  name: '受け取り' }
  };

  function starOf(year, month, day) {
    var k = K.build({
      year: year, month: month, day: day, hour: 0, minute: 0,
      lon: 139.692, tzOffset: 9, timeUnknown: true, useTrueSolar: false
    });
    var s = T.shichu(k);
    var m = s.pillars[1];
    var st = STAR[m.shiStar];
    if (!st) throw new Error('通変星が引けません: ' + m.shiStar);
    return {
      key: st.key, name: st.name, tsuhen: m.shiStar,
      monthGanshi: m.ganshi, honki: m.honki, setsu: s.setsu
    };
  }

  /* 配点。合計10。多い順に並べて返す。 */
  function ranked(points) {
    var list = DOMAINS.map(function (d) {
      return { key: d.key, name: d.name, points: +(points[d.key] || 0) };
    });
    var sum = list.reduce(function (a, b) { return a + b.points; }, 0);
    if (sum !== 10) throw new Error('配点の合計を10にしてください（いまは ' + sum + '）');
    /* 同点は DOMAINS の並び順で安定させる */
    return list.slice().sort(function (a, b) { return b.points - a.points; });
  }

  function read(input) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(input.date || '').trim());
    if (!m) throw new Error('生年月日の形式が違います');
    var y = +m[1], mo = +m[2], d = +m[3];
    if (!(y >= 1900 && y <= 2100)) throw new Error('年が範囲外です');

    var order = ranked(input.points || {});
    var top = order[0];
    var venus = venusOf(y, mo, d);
    var star = starOf(y, mo, d);

    /* 上乗せ額。選ばれた領域ぶんだけ足す。 */
    var fill = input.fill || {};
    var lines = [], monthly = 0;
    Object.keys(fill).forEach(function (key) {
      var opt = OPTIONS[key];
      var i = +fill[key];
      if (!opt || !(i >= 0 && i < opt.length) || opt[i][1] === 0) return;
      lines.push({ key: key, name: domainOf(key).name, label: opt[i][0], yen: opt[i][1] });
      monthly += opt[i][1];
    });
    lines.sort(function (a, b) { return b.yen - a.yen; });

    return {
      order: order,
      top: top,
      venus: venus,
      star: star,
      /* 一致は「金星の領域が配点の1位と同じ」。境目の日は隣でも一致とみなす。 */
      gap: (venus.domain.key === top.key ||
            (venus.alt && venus.alt.domain.key === top.key)) ? 'icchi' : 'zure',
      money: {
        lines: lines,
        monthly: monthly,
        yearly: monthly * 12,
        invoice: Math.round(monthly * 12 / TAKE_HOME / 1000) * 1000,
        takeHome: TAKE_HOME
      }
    };
  }

  return {
    read: read, ranked: ranked, venusOf: venusOf, starOf: starOf, domainOf: domainOf,
    DOMAINS: DOMAINS, OPTIONS: OPTIONS, VENUS_DOMAIN: VENUS_DOMAIN, STAR: STAR
  };
})();
