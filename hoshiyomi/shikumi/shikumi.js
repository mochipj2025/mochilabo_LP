/* そらと暦のしくみ — 図の計算と描画
 *
 * このページの図はすべて、ここでその場で計算している。手で描いた絵は一枚もない。
 * 使っているのは診断ページとまったく同じエンジン（astronomy-engine と koyomi.js）。
 */
(function () {
  'use strict';

  var A = window.Astronomy;
  var T = window.HOSHI_TEXT;
  var K = window.HOSHI_KOYOMI;
  var C = window.HOSHI_SHIKUMI_CALC;   /* 数値はすべてこちらで出す。テストが見張っている。 */
  var YEAR = 2026;
  var DAY = 86400000;

  var norm360 = C.norm360, wrap180 = C.wrap180, sph = C.sph, lonOf = C.lonOf;
  function $(id) { return document.getElementById(id); }

  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function txt(x, y, str, attrs) {
    var t = s('text', Object.assign({ x: x, y: y, 'font-size': 11, fill: 'var(--ink-faint)' }, attrs || {}));
    t.textContent = str;
    return t;
  }
  function el(tag, cls, str) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (str != null) n.textContent = str;
    return n;
  }
  function figure(id, title, body, caption) {
    var box = $(id);
    box.textContent = '';
    box.appendChild(el('p', 'fig-t', title));
    box.appendChild(body);
    if (caption) box.appendChild(el('p', 'fig-cap', caption));
  }
  function table(head, rows) {
    var t = document.createElement('table');
    var tr = t.insertRow();
    head.forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h;
      tr.appendChild(th);
    });
    rows.forEach(function (r) {
      var row = t.insertRow();
      r.forEach(function (c, i) {
        var td = row.insertCell();
        td.textContent = c;
        if (i > 0) td.className = 'num';
      });
    });
    return t;
  }

  function md(d) {
    var t = new Date(d.getTime() + 9 * 3600000);
    return (t.getUTCMonth() + 1) + '月' + t.getUTCDate() + '日';
  }
  function hm(d) {
    var t = new Date(d.getTime() + 9 * 3600000);
    return t.getUTCHours() + '時' + String(t.getUTCMinutes()).padStart(2, '0') + '分';
  }

  /* ================= 1-1 太陽が各星座に入る日 ================= */
  function f11() {
    var rows = C.sunIngresses(YEAR).map(function (g) {
      return [T.signs[g.sign].name, g.deg + '度', md(g.date)];
    });
    var wrap = document.createElement('div');
    wrap.className = 'grid2';
    var half = Math.ceil(rows.length / 2);
    [rows.slice(0, half), rows.slice(half)].forEach(function (part) {
      wrap.appendChild(table(['星座', '黄道の角度', '2026年に太陽が入る日'], part));
    });
    figure('f11', '2026年、太陽が各星座に入る日', wrap,
      '角度がきれいに30度きざみなのに対して、日付は月末寄りでばらつきます。' +
      '星座の区切りは「月」ではなく「太陽が何度まで進んだか」で決まっているからです。');
  }

  /* ================= 1-2 歳差 ================= */
  function f12() {
    /* J2000の春分点の方向（動かない目印）を、各時代の黄経で測る。
       目印は動かないので、差はそのまま春分点の移動量になる。 */
    var pre = C.precession(1, YEAR);
    var shift = pre.deg, perYear = pre.arcsecPerYear;

    var W = 620, H = 118;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var cx = 150, cy = 60, r = 44;
    [[cx, '西暦1年', 0], [W - 190, '2026年', shift]].forEach(function (g) {
      var x = g[0];
      svg.appendChild(s('circle', { cx: x, cy: cy, r: r, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.2 }));
      for (var k = 0; k < 12; k++) {
        var ang = (k * 30) * Math.PI / 180;
        svg.appendChild(s('line', {
          x1: x + Math.cos(ang) * (r - 4), y1: cy - Math.sin(ang) * (r - 4),
          x2: x + Math.cos(ang) * r, y2: cy - Math.sin(ang) * r,
          stroke: 'var(--line)', 'stroke-width': 1
        }));
      }
      var m = g[2] * Math.PI / 180;
      svg.appendChild(s('line', {
        x1: x, y1: cy, x2: x + Math.cos(m) * r, y2: cy - Math.sin(m) * r,
        stroke: 'var(--warm)', 'stroke-width': 2.2
      }));
      svg.appendChild(txt(x, cy + r + 20, g[1], { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-soft)' }));
    });
    svg.appendChild(txt(W / 2 - 10, cy - 12, '→', { 'text-anchor': 'middle', 'font-size': 20, fill: 'var(--ink-faint)' }));
    svg.appendChild(txt(W / 2 - 10, cy + 14, '約' + shift.toFixed(1) + '度ずれた',
      { 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--warm)' }));

    var wrap = document.createElement('div');
    wrap.appendChild(svg);
    figure('f12', '春分点は、2000年でどれだけ動いたか', wrap,
      '西暦1年と2026年で、空に固定した同じ目印の黄経を測って比べた結果です。差は約' + shift.toFixed(1) +
      '度、1年あたり約' + perYear.toFixed(1) + '秒角。星座ひとつが30度なので、' +
      'ほぼ1星座ぶん動いたことになります。');
  }

  /* ================= 1-3 水星の逆行 ================= */
  function f13() {
    var w = C.walk('Mercury', YEAR);
    var un = w.unwrapped, retro = w.retroDays;
    var minY = Math.min.apply(null, un), maxY = Math.max.apply(null, un);
    var W = 620, H = 210, L = 44, R = 12, TOP = 14, BOT = 34;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var X = function (i) { return L + i / 365 * (W - L - R); };
    var Y = function (v) { return TOP + (1 - (v - minY) / (maxY - minY)) * (H - TOP - BOT); };

    /* 逆行の帯 */
    var run = null;
    for (var k = 1; k <= 365; k++) {
      var isR = retro.indexOf(k) >= 0;
      if (isR && run === null) run = k;
      if ((!isR || k === 365) && run !== null) {
        svg.appendChild(s('rect', {
          x: X(run), y: TOP, width: Math.max(2, X(k) - X(run)), height: H - TOP - BOT,
          fill: 'var(--warm)', 'fill-opacity': 0.16
        }));
        run = null;
      }
    }
    for (var m = 0; m < 12; m++) {
      var idx = Math.round(new Date(Date.UTC(YEAR, m, 1)) - Date.UTC(YEAR, 0, 1)) / DAY;
      svg.appendChild(txt(X(idx), H - 14, (m + 1), { 'text-anchor': 'middle', 'font-size': 10 }));
    }
    var dstr = un.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
    svg.appendChild(s('path', { d: dstr, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.8 }));
    svg.appendChild(txt(4, TOP + 4, '進む', { 'font-size': 10 }));
    svg.appendChild(txt(4, H - BOT, '↑', { 'font-size': 10 }));
    svg.appendChild(txt(X(182), H - 2, '月', { 'text-anchor': 'middle', 'font-size': 10 }));

    var wrap = document.createElement('div');
    wrap.appendChild(svg);
    figure('f13', '2026年、水星が空を進んだ道のり', wrap,
      '縦軸は水星がどこまで進んだか。色の付いた帯が逆行の期間です。' +
      '線が3回、はっきり下に折り返しているのが見えます。' +
      '折り返しても全体としては前に進んでいることも、同時に分かります。');
  }

  /* ================= 1-4 4分で1度 ================= */
  function f14() {
    var rows = [], base = null;
    [0, 10, 30, 60, 120].forEach(function (mins) {
      var h = 6 + Math.floor(mins / 60), mi = mins % 60;
      var r = window.HOSHI_ASTRO.calculate({
        year: 1990, month: 6, day: 15, hour: h, minute: mi,
        lat: 35.69, lon: 139.69, tzOffset: 9, timeUnknown: false
      });
      if (base === null) base = r.houses.asc;
      var diff = norm360(r.houses.asc - base);
      rows.push([
        h + '時' + String(mi).padStart(2, '0') + '分',
        T.signs[Math.floor(r.houses.asc / 30)].name + ' ' + window.HOSHI_ASTRO.formatDeg(r.houses.asc % 30),
        mins === 0 ? '—' : '約' + diff.toFixed(1) + '度'
      ]);
    });
    var wrap = document.createElement('div');
    wrap.appendChild(table(['生まれた時刻', '東の地平線にあった場所', '最初とのずれ'], rows));
    figure('f14', '同じ日・同じ場所で、時刻だけを変えるとどうなるか', wrap,
      '1990年6月15日、東京での実測です。10分で約2度半、1時間で約15度。' +
      '2時間ずらすと区画がまるごとひとつ変わります。');
  }

  /* ================= 1-5 月の傾きと食 ================= */
  function f15() {
    var lats = C.moonLatRange(YEAR).series;
    var W = 620, H = 190, L = 34, R = 12, TOP = 14, BOT = 36;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var X = function (i) { return L + i / 365 * (W - L - R); };
    var Y = function (v) { return TOP + (1 - (v + 6) / 12) * (H - TOP - BOT); };

    svg.appendChild(s('rect', {
      x: L, y: Y(1.5), width: W - L - R, height: Y(-1.5) - Y(1.5),
      fill: 'var(--accent)', 'fill-opacity': 0.12
    }));
    svg.appendChild(s('line', { x1: L, y1: Y(0), x2: W - R, y2: Y(0), stroke: 'var(--line)', 'stroke-width': 1 }));
    [5, 0, -5].forEach(function (v) {
      svg.appendChild(txt(L - 6, Y(v) + 3, v + '°', { 'text-anchor': 'end', 'font-size': 10 }));
    });
    var dstr = lats.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
    svg.appendChild(s('path', { d: dstr, fill: 'none', stroke: 'var(--ink-soft)', 'stroke-width': 1.3, 'stroke-opacity': .75 }));

    var ecl = C.eclipses(YEAR);
    ecl.forEach(function (x) {
      var i = Math.round((x.d - Date.UTC(YEAR, 0, 1)) / DAY);
      svg.appendChild(s('line', { x1: X(i), y1: TOP, x2: X(i), y2: H - BOT, stroke: 'var(--warm)', 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }));
      svg.appendChild(txt(X(i), TOP - 2, x.k, { 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--warm)' }));
    });
    for (var m = 0; m < 12; m++) {
      var idx = Math.round(new Date(Date.UTC(YEAR, m, 1)) - Date.UTC(YEAR, 0, 1)) / DAY;
      svg.appendChild(txt(X(idx), H - 16, (m + 1), { 'text-anchor': 'middle', 'font-size': 10 }));
    }
    svg.appendChild(txt(X(182), H - 3, '月', { 'text-anchor': 'middle', 'font-size': 10 }));

    var wrap = document.createElement('div');
    wrap.appendChild(svg);
    figure('f15', '2026年、月が太陽の道からどれだけ離れていたか', wrap,
      '縦軸は月が太陽の通り道から上下にどれだけ外れているか。上下に約5度、月に1往復しています。' +
      '色の帯が、食が起こりうるおおよその範囲。線が帯を横切るあたりでだけ、食が起きているのが分かります。' +
      '2026年は' + ecl.length + '回でした。');
  }

  /* ================= 1-6 1年でどれだけ進むか ================= */
  function f16() {
    var list = [
      { n: '月', b: 'Moon' }, { n: '水星', b: 'Mercury' }, { n: '金星', b: 'Venus' },
      { n: '太陽', b: 'Sun' }, { n: '火星', b: 'Mars' }, { n: '木星', b: 'Jupiter' },
      { n: '土星', b: 'Saturn' }, { n: '天王星', b: 'Uranus' },
      { n: '海王星', b: 'Neptune' }, { n: '冥王星', b: 'Pluto' }
    ];
    var res = list.map(function (p) {
      return { n: p.n, deg: C.degreesInYear(p.b, YEAR) };
    });
    var W = 620, H = 250, L = 58, R = 74, TOP = 8;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var maxAbs = Math.max.apply(null, res.map(function (r) { return Math.abs(r.deg); }));
    var rowH = (H - TOP - 6) / res.length;
    res.forEach(function (r, i) {
      var y = TOP + i * rowH;
      var w = Math.max(2, Math.abs(r.deg) / maxAbs * (W - L - R));
      var gen = ['天王星', '海王星', '冥王星'].indexOf(r.n) >= 0;
      svg.appendChild(s('rect', {
        x: L, y: y + 3, width: w, height: rowH - 9, rx: 2,
        fill: gen ? 'var(--warm)' : 'var(--accent)', 'fill-opacity': gen ? .85 : .5
      }));
      svg.appendChild(txt(L - 8, y + rowH / 2 + 4, r.n, { 'text-anchor': 'end', 'font-size': 12, fill: 'var(--ink)' }));
      svg.appendChild(txt(L + w + 8, y + rowH / 2 + 4,
        (Math.abs(r.deg) >= 100 ? Math.round(Math.abs(r.deg)) : Math.abs(r.deg).toFixed(1)) + '度',
        { 'font-size': 11, fill: 'var(--ink-soft)' }));
    });
    var wrap = document.createElement('div');
    wrap.appendChild(svg);
    var pluto = res[res.length - 1].deg;
    figure('f16', '2026年の1年間で、それぞれの星が空を進んだ角度', wrap,
      '月は約' + Math.round(Math.abs(res[0].deg)) + '度（13周ぶん）進むのに、冥王星は約' +
      Math.abs(pluto).toFixed(1) + '度しか動きません。' +
      '色の濃い3つが「世代の星」と呼ばれるものです。同じ年に生まれた人はここがほぼ同じになるので、個人差になりません。');
  }

  /* ================= 2-1 二十四節気 ================= */
  function f21() {
    var rows = [];
    for (var i = 0; i < 24; i++) {
      var t = K.termTime(YEAR, i);
      rows.push([K.TERMS[i], ((315 + 15 * i) % 360) + '度', md(t) + ' ' + hm(t)]);
    }
    var wrap = document.createElement('div');
    wrap.className = 'grid2';
    wrap.appendChild(table(['節気', '太陽の角度', '2026年の瞬間'], rows.slice(0, 12)));
    wrap.appendChild(table(['節気', '太陽の角度', '2026年の瞬間'], rows.slice(12)));
    figure('f21', '2026年の二十四節気', wrap,
      '左の角度はきっちり15度ずつ。右の日付と時刻は、その角度に太陽が到達した瞬間です。' +
      'このページでも診断ページでも、節入り表は使わず、毎回この瞬間を計算しています。');
  }

  /* ================= 2-2 立春の時刻が毎年ずれる ================= */
  function f22() {
    var rows = [];
    for (var y = 2020; y <= 2030; y++) {
      var t = K.termTime(y, 0);
      var j = new Date(t.getTime() + 9 * 3600000);
      rows.push({ y: y, m: j.getUTCMonth() + 1, d: j.getUTCDate(), h: j.getUTCHours() + j.getUTCMinutes() / 60 });
    }
    var W = 620, H = 200, L = 48, R = 16, TOP = 16, BOT = 34;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var X = function (i) { return L + i / (rows.length - 1) * (W - L - R); };
    /* 縦軸は「2月3日0時からの経過時間」 */
    var val = rows.map(function (r) { return (r.d - 3) * 24 + r.h; });
    var minV = Math.min.apply(null, val) - 3, maxV = Math.max.apply(null, val) + 3;
    var Y = function (v) { return TOP + (1 - (v - minV) / (maxV - minV)) * (H - TOP - BOT); };
    svg.appendChild(s('line', { x1: L, y1: Y(24), x2: W - R, y2: Y(24), stroke: 'var(--warm)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
    svg.appendChild(txt(W - R, Y(24) - 6, '← ここより上は2月4日', { 'text-anchor': 'end', 'font-size': 10, fill: 'var(--warm)' }));
    var d2 = val.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
    svg.appendChild(s('path', { d: d2, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.6 }));
    rows.forEach(function (r, i) {
      svg.appendChild(s('circle', { cx: X(i), cy: Y(val[i]), r: 3.4, fill: r.d === 3 ? 'var(--warm)' : 'var(--accent)' }));
      svg.appendChild(txt(X(i), H - 16, String(r.y).slice(2), { 'text-anchor': 'middle', 'font-size': 10 }));
      svg.appendChild(txt(X(i), Y(val[i]) - 9, r.m + '/' + r.d, { 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--ink-faint)' }));
    });
    svg.appendChild(txt(X(5), H - 3, '年', { 'text-anchor': 'middle', 'font-size': 10 }));
    var wrap = document.createElement('div');
    wrap.appendChild(svg);
    var y3 = rows.filter(function (r) { return r.d === 3; }).map(function (r) { return r.y + '年'; });
    figure('f22', '立春の瞬間は、毎年どうずれるか（2020〜2030年）', wrap,
      '毎年およそ6時間ずつ後ろへずれ、うるう年で1日ぶん前に戻る。この階段が繰り返されています。' +
      (y3.length ? '点が色違いになっている' + y3.join('・') + 'は、階段が日付の境目をまたいで2月3日になった年です。' : ''));
  }

  /* ================= 2-3 閏月がある理由 ================= */
  function f23() {
    var moons = [], t = A.SearchMoonPhase(0, A.MakeTime(new Date(Date.UTC(YEAR, 0, 1))), 40);
    while (t && t.date.getUTCFullYear() === YEAR) {
      moons.push(t.date);
      t = A.SearchMoonPhase(0, A.MakeTime(new Date(t.date.getTime() + 2 * DAY)), 40);
    }
    var sm = C.synodicMean(2020, 2030);
    var avg = sm.mean;
    var twelve = avg * 12;

    var W = 620, H = 118, L = 8, R = 8;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var scale = (W - L - R) / 372;
    svg.appendChild(s('rect', { x: L, y: 16, width: 365.2422 * scale, height: 26, rx: 3, fill: 'var(--accent)', 'fill-opacity': .5 }));
    svg.appendChild(txt(L + 8, 33, '太陽の一年　365.24日', { 'font-size': 11.5, fill: 'var(--ink)' }));
    svg.appendChild(s('rect', { x: L, y: 58, width: twelve * scale, height: 26, rx: 3, fill: 'var(--warm)', 'fill-opacity': .55 }));
    svg.appendChild(txt(L + 8, 75, '月の満ち欠け12回　' + twelve.toFixed(1) + '日', { 'font-size': 11.5, fill: 'var(--ink)' }));
    svg.appendChild(s('rect', {
      x: L + twelve * scale, y: 58, width: (365.2422 - twelve) * scale, height: 26, rx: 3,
      fill: 'none', stroke: 'var(--warm)', 'stroke-width': 1.4, 'stroke-dasharray': '3 3'
    }));
    svg.appendChild(txt(L + 365.2422 * scale, 102, '足りない ' + (365.2422 - twelve).toFixed(1) + '日',
      { 'text-anchor': 'end', 'font-size': 11.5, fill: 'var(--warm)' }));

    var wrap = document.createElement('div');
    wrap.appendChild(svg);
    figure('f23', '月を12回数えても、1年には届かない', wrap,
      '2020年から2030年までの新月' + sm.count + '回ぶんを実測してならすと、平均' + avg.toFixed(3) + '日。' +
      '12回ぶんでも' + twelve.toFixed(1) + '日にしかならず、太陽の一年に' + (365.2422 - twelve).toFixed(1) + '日足りません。' +
      '（2026年だけを数えると新月は' + moons.length + '回でした。1回ごとの間隔は2日近くばらつくので、ここは長めにならしています。）' +
      'このずれが3年で1か月ぶんに育つので、そこで月をひとつ足します。それが閏月です。');
  }

  /* ================= 2-4 朔望月と恒星月 ================= */
  function f24() {
    /* どちらも1回だけ測るとばらつくので、複数周ぶんならす。 */
    var synodic = C.synodicMean(2020, 2030).mean;
    var sidereal = C.siderealMean(new Date(Date.UTC(YEAR, 0, 1)), 12);

    var W = 620, H = 104, L = 88, R = 96;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var scale = (W - L - R) / 31;
    [['朔望月', synodic, 'var(--warm)', 18], ['恒星月', sidereal, 'var(--accent)', 58]].forEach(function (g) {
      svg.appendChild(s('rect', { x: L, y: g[3], width: g[1] * scale, height: 26, rx: 3, fill: g[2], 'fill-opacity': .5 }));
      svg.appendChild(txt(L - 8, g[3] + 17, g[0], { 'text-anchor': 'end', 'font-size': 12, fill: 'var(--ink)' }));
      svg.appendChild(txt(L + g[1] * scale + 8, g[3] + 17, g[1].toFixed(2) + '日', { 'font-size': 11.5, fill: 'var(--ink-soft)' }));
    });
    svg.appendChild(s('line', {
      x1: L + sidereal * scale, y1: 14, x2: L + sidereal * scale, y2: 90,
      stroke: 'var(--ink-faint)', 'stroke-width': 1, 'stroke-dasharray': '3 3'
    }));
    var wrap = document.createElement('div');
    wrap.appendChild(svg);
    figure('f24', '月がひと回りする長さは、2通りある', wrap,
      '複数周ぶんならして実測すると、月が空の同じ場所に戻るまでが' + sidereal.toFixed(2) +
      '日。新月から次の新月までは' + synodic.toFixed(2) + '日。差は約' + (synodic - sidereal).toFixed(2) +
      '日で、月が回っているあいだに地球も太陽のまわりを進むぶんです。' +
      '宿曜が27に分けているのは前者、旧暦のひと月が29日か30日なのは後者にもとづいています。');
  }

  /* ================= 2-5 均時差 ================= */
  function f25() {
    var vals = C.eot(YEAR, K.trueSolarHour).series;
    var W = 620, H = 190, L = 46, R = 12, TOP = 14, BOT = 34;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var mn = Math.min.apply(null, vals) - 2, mx = Math.max.apply(null, vals) + 2;
    var X = function (i) { return L + i / 365 * (W - L - R); };
    var Y = function (v) { return TOP + (1 - (v - mn) / (mx - mn)) * (H - TOP - BOT); };
    svg.appendChild(s('line', { x1: L, y1: Y(0), x2: W - R, y2: Y(0), stroke: 'var(--line)', 'stroke-width': 1 }));
    [15, 0, -15].forEach(function (v) {
      if (v > mn && v < mx) svg.appendChild(txt(L - 6, Y(v) + 3, (v > 0 ? '+' : '') + v + '分', { 'text-anchor': 'end', 'font-size': 10 }));
    });
    var d3 = vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
    svg.appendChild(s('path', { d: d3, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.8 }));
    for (var m = 0; m < 12; m++) {
      var idx = Math.round(new Date(Date.UTC(YEAR, m, 1)) - Date.UTC(YEAR, 0, 1)) / DAY;
      svg.appendChild(txt(X(idx), H - 16, (m + 1), { 'text-anchor': 'middle', 'font-size': 10 }));
    }
    svg.appendChild(txt(X(182), H - 3, '月', { 'text-anchor': 'middle', 'font-size': 10 }));
    var wrap = document.createElement('div');
    wrap.appendChild(svg);
    figure('f25', '太陽の南中は、時計とどれだけずれるか（均時差）', wrap,
      '経度0度で毎日正午の太陽の位置から計算した、時計と太陽のずれです。' +
      '年間で約' + Math.round(Math.max.apply(null, vals)) + '分から' + Math.round(Math.min.apply(null, vals)) +
      '分まで動きます。これに経度のずれ（東京なら明石より約19分早い）が加わったものが、東洋の占いで使う太陽の時刻です。');
  }

  /* ================= 3-1 検算できるもの ================= */
  function f31() {
    var rows = [];
    /* 春分の実測 */
    var eq = A.SearchSunLongitude(0, A.MakeTime(new Date(Date.UTC(YEAR, 2, 1))), 40);
    rows.push(['2026年の春分（太陽が0度になる瞬間）', md(eq.date) + ' ' + hm(eq.date)]);
    var risshun = K.termTime(YEAR, 0);
    rows.push(['2026年の立春（太陽が315度になる瞬間）', md(risshun) + ' ' + hm(risshun)]);
    var l = K.lunar(YEAR, 2, 17);
    rows.push(['2026年2月17日の旧暦', l.year + '年' + (l.leap ? '閏' : '') + l.month + '月' + l.day + '日']);
    rows.push(['2019年1月27日の日の干支', K.ganshiName(K.dayGanshi(2019, 1, 27))]);
    rows.push(['2026年の干支', K.ganshiName(K.yearGanshi(YEAR))]);
    var wrap = document.createElement('div');
    wrap.appendChild(table(['項目', 'このページで計算した値'], rows));
    figure('f31', '外の資料と突き合わせられる値（このページでの実測）', wrap,
      'どれも暦の本や天文台の発表と照らし合わせられます。' +
      '合わなければ、こちらの計算が間違っているということです。');
  }

  /* ================= 3-2 流派で割れるところ ================= */
  function f32() {
    var rows = [
      ['23時台に生まれた人の日の扱い', '0時で変わる側を採用（日本で多いほう）'],
      ['紫微斗数の閏月', '前の月として扱う'],
      ['九星の日の星', '流派で起点が割れるため、出していない'],
      ['木火土金水の数え方', '4つの柱の上下から1つずつ。隠れている干は数えない'],
      ['西洋の場面の区切り方', 'プラシーダス方式（高緯度では星座＝場面に切り替え）'],
      ['西洋の黄経', 'トロピカル方式（春分点を基準にする）']
    ];
    var wrap = document.createElement('div');
    wrap.appendChild(table(['割れる点', '星読みが採った側'], rows));
    figure('f32', '答えがひとつに決まらないところ', wrap,
      '解釈の手前にも、流派で割れる点があります。隠すと比べられなくなるので、どちらを採ったかは全部書いてあります。');
  }

  /* ================= 目次 ================= */
  function buildToc() {
    var ol = document.createElement('ol');
    Array.prototype.forEach.call(document.querySelectorAll('.chap'), function (ch) {
      var li = document.createElement('li');
      var a = el('a', 'ch', ch.querySelector('h2').textContent);
      a.href = '#' + ch.id;
      li.appendChild(a);
      var sub = document.createElement('ol');
      Array.prototype.forEach.call(ch.querySelectorAll('section.sec'), function (sec) {
        var li2 = document.createElement('li');
        var a2 = el('a', null, sec.querySelector('h3').textContent);
        a2.href = '#' + sec.id;
        li2.appendChild(a2);
        sub.appendChild(li2);
      });
      li.appendChild(sub);
      ol.appendChild(li);
    });
    var nav = $('toc');
    nav.appendChild(el('div', 'toc-t', 'もくじ'));
    nav.appendChild(ol);

    /* いま読んでいるところを目次で光らせる */
    var targets = Array.prototype.slice.call(document.querySelectorAll('.chap, section.sec'));
    var links = {};
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) { links[a.getAttribute('href').slice(1)] = a; });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var a = links[en.target.id];
          if (a) a.classList.toggle('here', en.isIntersecting);
        });
      }, { rootMargin: '-10% 0px -70% 0px' });
      targets.forEach(function (t2) { io.observe(t2); });
    }
  }

  /* ================= 実行 ================= */
  function run() {
    buildToc();
    var jobs = [f11, f12, f13, f14, f15, f16, f21, f22, f23, f24, f25, f31, f32];
    var i = 0;
    (function step() {
      if (i >= jobs.length) return;
      var job = jobs[i++];
      try { job(); } catch (e) {
        console.error(e);
      }
      /* 1つずつ描いて、重い計算でも画面が固まらないようにする */
      setTimeout(step, 0);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
