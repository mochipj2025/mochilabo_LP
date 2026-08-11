/* 星読み — 画面まわり
 *
 * 計算は astro.js、文章は text.js。ここはその2つを画面に並べるだけ。
 */
(function () {
  'use strict';

  var T = window.HOSHI_TEXT;
  var ASTRO = window.HOSHI_ASTRO;
  var PLACES = window.HOSHI_PLACES;
  var STORE = 'hoshiyomi.input.v1';

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function norm360(d) { return ((d % 360) + 360) % 360; }
  function signOf(lon) { return T.signs[Math.floor(norm360(lon) / 30)]; }
  function posText(lon) { return signOf(lon).name + ' ' + ASTRO.formatDeg(norm360(lon) % 30); }

  var lastResult = null;
  var lastEast = null;

  /* ================= フォーム ================= */

  function initForm() {
    var hh = $('hh'), mi = $('mi'), place = $('place');
    for (var h = 0; h < 24; h++) hh.appendChild(new Option(String(h) + '時', h));
    for (var m = 0; m < 60; m++) mi.appendChild(new Option(String(m) + '分', m));
    for (var i = 0; i < PLACES.length; i++) place.appendChild(new Option(PLACES[i].name, i));
    place.appendChild(new Option('海外・手入力', 'manual'));
    place.value = '12'; /* 東京 */
    hh.value = '12';

    place.addEventListener('change', function () {
      $('manualbox').hidden = place.value !== 'manual';
    });
    $('unknown').addEventListener('change', function () {
      var off = $('unknown').checked;
      hh.disabled = off; mi.disabled = off;
      hh.style.opacity = mi.style.opacity = off ? .45 : 1;
    });

    try {
      var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (saved) {
        $('birthdate').value = saved.date || '';
        hh.value = saved.hh != null ? saved.hh : 12;
        mi.value = saved.mi != null ? saved.mi : 0;
        place.value = saved.place != null ? saved.place : '12';
        $('unknown').checked = !!saved.unknown;
        $('lat').value = saved.lat || '';
        $('lon').value = saved.lon || '';
        $('tz').value = saved.tz != null ? saved.tz : '';
        if (saved.truesolar != null) $('truesolar').checked = !!saved.truesolar;
        place.dispatchEvent(new Event('change'));
        $('unknown').dispatchEvent(new Event('change'));
      }
    } catch (e) { /* 保存が読めなくても支障はない */ }

    $('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      run();
    });
    $('showlines').addEventListener('change', function () {
      if (lastResult) drawChart(lastResult, $('showlines').checked);
    });

    /* 読み口の切り替え */
    var tone = window.HOSHI_TONE.restore();
    var toneBtns = $('tonebar').querySelectorAll('.tonebtn');
    function paintTone() {
      Array.prototype.forEach.call(toneBtns, function (b) {
        b.classList.toggle('on', b.dataset.tone === window.HOSHI_TONE.value);
      });
      var pack = window.HOSHI_TONE.pack();
      $('tonenote').textContent = pack
        ? pack.NOTICE
        : 'いまはやさしく読んでいます。図星を笑って読みたいときは「毒舌診断」に戻してください。';
    }
    Array.prototype.forEach.call(toneBtns, function (b) {
      b.addEventListener('click', function () {
        window.HOSHI_TONE.set(b.dataset.tone);
        paintTone();
        if (lastResult && lastEast) draw(lastResult, lastEast);
      });
    });
    paintTone();

    /* タブ */
    var tabs = $('tabs').querySelectorAll('.tab');
    Array.prototype.forEach.call(tabs, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs, function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        ['west', 'east', 'compare', 'theme', 'y2026'].forEach(function (p) {
          $('pane-' + p).classList.toggle('on', p === b.dataset.pane);
        });
        $('tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function readForm() {
    var date = $('birthdate').value;
    if (!date) throw new Error('生年月日を入れてください。');
    var parts = date.split('-').map(Number);
    if (parts[0] < 1900 || parts[0] > 2100) throw new Error('1900年〜2100年の範囲で入れてください。');

    var lat, lon, tz;
    var pv = $('place').value;
    if (pv === 'manual') {
      lat = parseFloat($('lat').value);
      lon = parseFloat($('lon').value);
      tz = parseFloat($('tz').value);
      if (!isFinite(lat) || !isFinite(lon)) throw new Error('緯度と経度を入れてください。');
      if (!isFinite(tz)) throw new Error('時差を入れてください（日本なら9）。');
      if (Math.abs(lat) > 89.5) throw new Error('極付近の緯度はハウス計算ができません。');
    } else {
      var p = PLACES[Number(pv)];
      lat = p.lat; lon = p.lon; tz = 9;
    }

    try {
      localStorage.setItem(STORE, JSON.stringify({
        date: date, hh: $('hh').value, mi: $('mi').value, place: pv,
        unknown: $('unknown').checked, lat: $('lat').value, lon: $('lon').value, tz: $('tz').value,
        truesolar: $('truesolar').checked
      }));
    } catch (e) { /* プライベートモードなどでは保存できない。それでいい。 */ }

    return {
      year: parts[0], month: parts[1], day: parts[2],
      hour: Number($('hh').value), minute: Number($('mi').value),
      lat: lat, lon: lon, tzOffset: tz,
      autoJapanDst: pv !== 'manual',
      timeUnknown: $('unknown').checked,
      useTrueSolar: $('truesolar').checked,
      _date: date
    };
  }

  function run() {
    $('err').textContent = '';
    var input;
    try {
      input = readForm();
    } catch (e) {
      $('err').textContent = e.message;
      return;
    }
    var r;
    try {
      r = ASTRO.calculate(input);
    } catch (e) {
      $('err').textContent = '計算できませんでした（' + e.message + '）。日時と場所を確かめてください。';
      return;
    }
    r.input = input;
    lastResult = r;

    /* 東洋側。夏時間が効いている年は、西洋側で使ったのと同じオフセットを渡す。 */
    var east;
    try {
      east = window.HOSHI_TOYO.all(window.HOSHI_KOYOMI.build({
        year: input.year, month: input.month, day: input.day,
        hour: input.hour, minute: input.minute,
        lon: input.lon, tzOffset: r.offsetUsed,
        timeUnknown: input.timeUnknown, useTrueSolar: input.useTrueSolar
      }));
    } catch (e) {
      $('err').textContent = '東洋側の暦を組めませんでした（' + e.message + '）。';
      return;
    }

    lastEast = east;
    draw(r, east);

    $('result').classList.add('on');
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* 読み口を切り替えたときも、ここだけ呼び直せば済むようにまとめてある */
  function draw(r, east) {
    renderStamp(r);
    renderCore(r);
    drawChart(r, $('showlines').checked);
    renderTable(r);
    renderReads(r);
    renderAspects(r);
    renderBalance(r);
    renderGloss();
    window.HOSHI_APP_TOYO.renderEast(east);
    window.HOSHI_APP_TOYO.renderCompare(r, east);
    window.HOSHI_APP_THEME.render(r, east);
    window.HOSHI_APP_Y2026.render($('y2026'), { west: r, east: east });
  }

  /* ================= 1. まず3つ ================= */

  function renderStamp(r) {
    var i = r.input;
    var s = i._date.replace('-', '年').replace('-', '月') + '日';
    if (!r.timeUnknown) s += ' ' + i.hour + '時' + String(i.minute).padStart(2, '0') + '分';
    else s += '（時刻不明）';
    var pv = $('place').value;
    s += '／' + (pv === 'manual' ? ('緯度' + i.lat + ' 経度' + i.lon) : PLACES[Number(pv)].name);
    if (r.dstApplied) s += '　※この日は日本に夏時間があったため、標準時＋1時間として計算しています';
    $('stamp').textContent = s;
  }

  function bigCard(who, what, sign, txt, extra) {
    var box = el('div', 'big');
    box.appendChild(el('p', 'who', who));
    box.appendChild(el('p', 'what', what));
    box.appendChild(el('p', 'sign', sign));
    box.appendChild(el('p', 'catch', txt.catch));
    box.appendChild(el('p', 'body', txt.body));
    /* 毒舌版は必ず逃げ道で終わる。ここが無いとただの悪口になる。 */
    if (txt.out) box.appendChild(el('p', 'body out', txt.out));
    if (extra) {
      var p = el('p', 'body', extra);
      p.style.marginTop = '10px';
      p.style.color = 'var(--warm)';
      box.appendChild(p);
    }
    return box;
  }

  /* 読み口に応じて、差し替え版があればそちらを使う */
  function pick(soft, key1, key2) {
    var p = window.HOSHI_TONE && window.HOSHI_TONE.pack();
    var alt = p && p[key1] && (key2 == null ? p[key1] : p[key1][key2]);
    return alt || soft;
  }

  function renderCore(r) {
    var box = $('core');
    box.textContent = '';
    var sun = r.bodies[0], moon = r.bodies[1];

    box.appendChild(bigCard('太陽', 'あなたが人生でどっちに向かいたいか',
      posText(sun.lon), pick(T.core.sun, 'core', 'sun')[sun.sign]));

    var moonExtra = null;
    if (r.moonAmbiguous) {
      moonExtra = 'この日は月が ' + T.signs[r.moonAmbiguous[0]].name + ' から ' +
        T.signs[r.moonAmbiguous[1]].name + ' へ移る日です。時刻が分かればどちらか確定します。' +
        '正午の位置で ' + signOf(moon.lon).name + ' として読んでいますが、両方読んでみて、しっくりくる方を採ってください。';
    }
    box.appendChild(bigCard('月', 'あなたが何をしていると落ち着くか',
      posText(moon.lon), pick(T.core.moon, 'core', 'moon')[moon.sign], moonExtra));

    if (r.houses) {
      var ai = Math.floor(r.houses.asc / 30);
      box.appendChild(bigCard('アセンダント', '人からどう見えるか。ものごとの始め方',
        posText(r.houses.asc), pick(T.core.asc, 'core', 'asc')[ai]));
    } else {
      var note = el('div', 'big');
      note.appendChild(el('p', 'who', 'アセンダント'));
      note.appendChild(el('p', 'sign', '出せません'));
      note.appendChild(el('p', 'body',
        'アセンダントは約4分で1度動くので、生まれた時刻が分からないと決まりません。' +
        '母子手帳、出生届の控え、親御さんの記憶などで時刻が分かったら、もう一度試してみてください。' +
        '同じ理由で、下のハウスもすべて空欄になっています。'));
      box.appendChild(note);
    }
  }

  /* ================= 2. チャート ================= */

  var CX = 300, CY = 300;
  /* ASC/MC などの文字を円の外に置くので、外周は viewBox の端まで使わず余白を残す */
  var R_OUT = 266, R_SIGN_IN = 226, R_PLANET = 190, R_HOUSE_IN = 100, R_HUB = 88;
  var ELEM_FILL = { '火': '#d2705a', '地': '#7d8f5e', '風': '#6f8bb5', '水': '#6f7fa8' };
  var SHORT_SIGN = ['牡羊', '牡牛', '双子', '蟹', '獅子', '乙女', '天秤', '蠍', '射手', '山羊', '水瓶', '魚'];

  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  /* 黄経 → 画面座標。基準（アセンダント、無ければ0度）を左端に置き、反時計回りに進む。 */
  function pt(lon, radius, base) {
    var a = (180 + norm360(lon - base)) * Math.PI / 180;
    return [CX + radius * Math.cos(a), CY - radius * Math.sin(a)];
  }
  function ring(svg, r, cls) {
    svg.appendChild(svgEl('circle', {
      cx: CX, cy: CY, r: r, fill: 'none',
      stroke: 'var(--line)', 'stroke-width': cls === 'thick' ? 1.6 : 1
    }));
  }
  function line(svg, lon, r1, r2, base, attrs) {
    var a = pt(lon, r1, base), b = pt(lon, r2, base);
    var n = svgEl('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    svg.appendChild(n);
  }

  function drawChart(r, showLines) {
    var base = r.houses ? r.houses.asc : 0;
    var svg = svgEl('svg', { viewBox: '0 0 600 600', role: 'img' });
    svg.setAttribute('aria-label', '出生図の円形チャート');

    /* --- 星座の帯 --- */
    for (var s = 0; s < 12; s++) {
      var a0 = s * 30, a1 = a0 + 30;
      var p0 = pt(a0, R_OUT, base), p1 = pt(a1, R_OUT, base);
      var q1 = pt(a1, R_SIGN_IN, base), q0 = pt(a0, R_SIGN_IN, base);
      svg.appendChild(svgEl('path', {
        d: 'M' + p0[0] + ',' + p0[1] +
           'A' + R_OUT + ',' + R_OUT + ' 0 0 0 ' + p1[0] + ',' + p1[1] +
           'L' + q1[0] + ',' + q1[1] +
           'A' + R_SIGN_IN + ',' + R_SIGN_IN + ' 0 0 1 ' + q0[0] + ',' + q0[1] + 'Z',
        fill: ELEM_FILL[T.signs[s].element], 'fill-opacity': s % 2 ? .16 : .26,
        stroke: 'var(--line)', 'stroke-width': .8
      }));
      var mid = pt(a0 + 15, (R_OUT + R_SIGN_IN) / 2, base);
      var t = svgEl('text', {
        x: mid[0], y: mid[1] + 6, 'text-anchor': 'middle',
        'font-size': 17, fill: 'var(--ink)', 'font-weight': 600
      });
      t.textContent = SHORT_SIGN[s];
      svg.appendChild(t);
    }
    ring(svg, R_OUT); ring(svg, R_SIGN_IN); ring(svg, R_HUB);

    /* --- 10度ごとの目盛り --- */
    for (var d = 0; d < 360; d += 10) {
      line(svg, d, R_SIGN_IN, R_SIGN_IN - (d % 30 === 0 ? 0 : 7), base,
        { stroke: 'var(--line)', 'stroke-width': .8 });
    }

    /* --- ハウス --- */
    if (r.houses) {
      for (var h = 0; h < 12; h++) {
        var isAngle = (h === 0 || h === 3 || h === 6 || h === 9);
        line(svg, r.houses.cusps[h], R_HUB, R_SIGN_IN, base, {
          stroke: isAngle ? 'var(--accent)' : 'var(--line)',
          'stroke-width': isAngle ? 1.8 : 1,
          'stroke-dasharray': isAngle ? '' : '3 4'
        });
        var span = norm360(r.houses.cusps[(h + 1) % 12] - r.houses.cusps[h]);
        var lab = pt(r.houses.cusps[h] + span / 2, R_HOUSE_IN + 14, base);
        var tn = svgEl('text', {
          x: lab[0], y: lab[1] + 4, 'text-anchor': 'middle',
          'font-size': 13, fill: 'var(--ink-faint)'
        });
        tn.textContent = String(h + 1);
        svg.appendChild(tn);
      }
      [['ASC', r.houses.asc], ['MC', r.houses.mc],
       ['DSC', norm360(r.houses.asc + 180)], ['IC', norm360(r.houses.mc + 180)]]
      .forEach(function (m) {
        var p = pt(m[1], R_OUT + 1, base);
        var dx = (p[0] - CX) * .055, dy = (p[1] - CY) * .055;
        var tt = svgEl('text', {
          x: p[0] + dx, y: p[1] + dy + 4, 'text-anchor': 'middle',
          'font-size': 12, 'font-weight': 700, fill: 'var(--accent)'
        });
        tt.textContent = m[0];
        svg.appendChild(tt);
      });
    }

    /* --- 天体どうしの線 --- */
    if (showLines) {
      var byKey = {};
      r.bodies.forEach(function (b) { byKey[b.def.key] = b.lon; });
      r.aspects.forEach(function (a) {
        if (a.aKey === 'asc' || a.bKey === 'asc' || a.aKey === 'mc' || a.bKey === 'mc') return;
        var p = pt(byKey[a.aKey], R_HUB, base), q = pt(byKey[a.bKey], R_HUB, base);
        svg.appendChild(svgEl('line', {
          x1: p[0], y1: p[1], x2: q[0], y2: q[1],
          stroke: a.type.tone === 'hard' ? 'var(--hard)' : 'var(--soft)',
          'stroke-width': a.type.tone === 'strong' ? 1.6 : 1.1,
          'stroke-opacity': a.type.tone === 'strong' ? .5 : .38,
          'stroke-dasharray': a.type.tone === 'soft' ? '4 3' : ''
        }));
      });
    }

    /* --- 天体 --- */
    var items = r.bodies.map(function (b) { return { b: b, at: norm360(b.lon - base) }; })
                        .sort(function (x, y) { return x.at - y.at; });
    var MIN = 9;
    for (var pass = 0; pass < 4; pass++) {
      for (var i = 1; i < items.length; i++) {
        if (items[i].at - items[i - 1].at < MIN) items[i].at = items[i - 1].at + MIN;
      }
      var wrapGap = (items[0].at + 360) - items[items.length - 1].at;
      if (wrapGap < MIN) {
        var push = (MIN - wrapGap) / 2;
        for (var j = 0; j < items.length; j++) items[j].at -= push;
      } else break;
    }

    items.forEach(function (it) {
      var real = pt(it.b.lon, R_SIGN_IN - 4, base);
      var slot = pt(base + it.at, R_PLANET, base);
      svg.appendChild(svgEl('line', {
        x1: real[0], y1: real[1], x2: slot[0], y2: slot[1],
        stroke: 'var(--ink-faint)', 'stroke-width': .9, 'stroke-opacity': .55
      }));
      svg.appendChild(svgEl('circle', {
        cx: slot[0], cy: slot[1], r: 15,
        fill: 'var(--panel)', stroke: 'var(--ink-soft)', 'stroke-width': 1.2
      }));
      var tx = svgEl('text', {
        x: slot[0], y: slot[1] + 6, 'text-anchor': 'middle',
        'font-size': 16, 'font-weight': 700, fill: 'var(--ink)'
      });
      tx.textContent = it.b.def.short;
      svg.appendChild(tx);
      if (it.b.retro) {
        var rt = svgEl('text', {
          x: slot[0] + 13, y: slot[1] - 9, 'text-anchor': 'middle',
          'font-size': 11, 'font-weight': 700, fill: 'var(--warm)'
        });
        rt.textContent = 'R';
        svg.appendChild(rt);
      }
    });

    $('chartbox').textContent = '';
    $('chartbox').appendChild(svg);
  }

  /* ================= 3. 一覧表 ================= */

  function renderTable(r) {
    var tb = $('table');
    tb.textContent = '';
    var head = tb.insertRow();
    ['天体', '何の担当', '星座', '度数', 'どの場面（ハウス）'].forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h;
      head.appendChild(th);
    });
    r.bodies.forEach(function (b) {
      var tr = tb.insertRow();
      if (b.def.generation) tr.className = 'gen';
      var c0 = tr.insertCell();
      c0.textContent = b.def.name;
      if (b.retro) { var s = el('span', 'retro', '逆行'); c0.appendChild(s); }
      tr.insertCell().textContent = b.def.what;
      tr.insertCell().textContent = T.signs[b.sign].name;
      var c3 = tr.insertCell();
      c3.className = 'num';
      c3.textContent = ASTRO.formatDeg(b.degInSign);
      var c4 = tr.insertCell();
      c4.className = 'num';
      c4.textContent = b.house ? (b.house + '　' + T.houses[b.house - 1].topic) : '—';
    });

    var note = '';
    if (!r.houses) {
      note = '生まれた時刻が分からないため、場面（ハウス）は空欄です。';
    } else if (r.houses.system === 'whole') {
      note = '緯度が高すぎて通常の区切り方が使えないため、星座をそのまま場面として数えています（ホールサイン方式）。';
    } else {
      note = '場面の区切り方はプラシーダス方式。東の地平線にあったのは ' + posText(r.houses.asc) +
             '、真南の高いところにあったのは ' + posText(r.houses.mc) + '。';
    }
    $('housenote').textContent = note;
  }

  /* ================= 4. ひとつずつ読む ================= */

  function renderReads(r) {
    var box = $('reads');
    box.textContent = '';
    r.bodies.forEach(function (b) {
      var sign = T.signs[b.sign];
      var d = el('details', 'read');
      if (b.def.weight === 3) d.open = true;

      var sum = el('summary');
      sum.appendChild(el('span', null, b.def.name));
      sum.appendChild(el('span', 'pos', sign.name + ' ' + ASTRO.formatDeg(b.degInSign) +
        (b.house ? '・' + b.house + '番目の場面' : '') + (b.retro ? '・逆行' : '')));
      d.appendChild(sum);

      var inner = el('div', 'inner');

      var dl = el('dl', 'three');
      function pair(k, v) { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, v)); }
      pair('何を', b.def.what);
      pair('どうやって', sign.name + '＝' + sign.how);
      pair('どこで', b.house ? (T.houses[b.house - 1].topic + '（' + b.house + '番目の場面）')
                             : '生まれた時刻が分からないため出せません');
      inner.appendChild(dl);

      /* 1文目 = 何の担当か。2文目 = どういうやり方か。3文目 = どの場面に出るか。 */
      inner.appendChild(el('p', null, b.def.intro));
      inner.appendChild(el('p', null,
        'あなたの' + b.def.name + 'は' + sign.name + '。' + sign.how + 'タイプです。' + sign.note));

      if (b.house) {
        var hh = T.houses[b.house - 1];
        inner.appendChild(el('p', null,
          'それがいちばん出るのは、' + hh.topic + 'の場面です。たとえば、' + hh.examples));
      }

      inner.appendChild(el('p', null, b.def.detail));

      if (b.retro) {
        inner.appendChild(el('p', null,
          '生まれたとき、この星は逆行していました。逆行というのは、地球から見て逆向きに進んで見える期間のことです。' +
          'この星の働きが、外へ出る前にいったん自分の内側を回りやすい、という読み方をします。' +
          'たとえば、思ったことをすぐ口に出さず、一度考えてから出す。遅れているとか悪いという意味ではありません。'));
      }
      if (b.def.generation) {
        inner.appendChild(el('p', null,
          'この星はとてもゆっくり動くので、星座は同い年の人とほぼ同じになります。' +
          'つまり、星座だけを見てもあなた個人の話にはなりません。' +
          'あなたらしさが出るのは、上の「どこで」のほうです。'));
      }

      d.appendChild(inner);
      box.appendChild(d);
    });
  }

  /* ================= 5. アスペクト ================= */

  function renderAspects(r) {
    var ul = $('aspects');
    ul.textContent = '';
    if (!r.aspects.length) {
      ul.appendChild(el('li', null, '決めた許容範囲に入る角度は、ひとつもありませんでした。'));
      return;
    }
    r.aspects.forEach(function (a) {
      var li = el('li');
      li.appendChild(el('span', 'tag ' + a.type.tone, a.type.plain));
      li.appendChild(el('span', 'pair', a.a + '　と　' + a.b));
      li.appendChild(el('span', 'orb', a.type.name + ' ' + a.type.deg + '°' + (a.exact ? '・ほぼぴったり' : '')));
      li.appendChild(el('span', 'mean', a.type.meaning));
      ul.appendChild(li);
    });
  }

  /* ================= 6. バランス ================= */

  function bar(label, n, total, color) {
    var row = el('div', 'bar');
    row.appendChild(el('div', null, label));
    var track = el('div', 'track');
    var fill = el('div', 'fill');
    fill.style.width = Math.round(n / total * 100) + '%';
    fill.style.background = color;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('div', 'n', String(n)));
    return row;
  }

  function renderBalance(r) {
    var box = $('balance');
    box.textContent = '';
    var e = r.balance.elements, q = r.balance.qualities;

    var b1 = el('div', 'bars');
    Object.keys(e).forEach(function (k) {
      b1.appendChild(bar(T.elements[k].label, e[k], 10, ELEM_FILL[k]));
    });
    box.appendChild(b1);

    var maxE = Object.keys(e).reduce(function (a, b) { return e[a] >= e[b] ? a : b; });
    var minE = Object.keys(e).reduce(function (a, b) { return e[a] <= e[b] ? a : b; });
    box.appendChild(el('p', 'balnote',
      'いちばん多いのは' + maxE + '（' + T.elements[maxE].mean + '）。' + T.elementComment.high[maxE]));
    if (e[minE] <= 1) {
      box.appendChild(el('p', 'balnote',
        '手薄なのは' + minE + '（' + T.elements[minE].mean + '）。' + T.elementComment.low[minE]));
    }

    var b2 = el('div', 'bars');
    b2.style.marginTop = '20px';
    Object.keys(q).forEach(function (k) {
      b2.appendChild(bar(T.qualities[k].label, q[k], 10, 'var(--accent)'));
    });
    box.appendChild(b2);

    var maxQ = Object.keys(q).reduce(function (a, b) { return q[a] >= q[b] ? a : b; });
    box.appendChild(el('p', 'balnote',
      maxQ + 'が多め（' + T.qualities[maxQ].mean + '）。' + T.qualityComment[maxQ]));
  }

  /* ================= 用語 ================= */

  function renderGloss() {
    var dl = $('gloss');
    if (dl.childNodes.length) return;
    T.glossary.forEach(function (g) {
      dl.appendChild(el('dt', null, g[0]));
      dl.appendChild(el('dd', null, g[1]));
    });
  }

  initForm();
})();
