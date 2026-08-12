/* 星読み — 相性ページの描画 */
(function () {
  'use strict';

  var T = window.HOSHI_TEXT;
  var K = window.HOSHI_KOYOMI;
  var TY = window.HOSHI_TOYO;
  var AI = window.HOSHI_AISHOU;
  var AT = window.HOSHI_AISHOU_TEXT;
  var PLACES = window.HOSHI_PLACES;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, str) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (str != null) n.textContent = str;
    return n;
  }
  function panel(title, step) {
    var s = el('section', 'panel');
    var h = el('h2');
    if (step) h.appendChild(el('span', 'step', step));
    h.appendChild(document.createTextNode(title));
    s.appendChild(h);
    return s;
  }

  /* ---------------- フォーム ---------------- */
  function fill(hh, mi, place) {
    for (var h = 0; h < 24; h++) hh.appendChild(new Option(h + '時', h));
    for (var m = 0; m < 60; m++) mi.appendChild(new Option(m + '分', m));
    for (var i = 0; i < PLACES.length; i++) place.appendChild(new Option(PLACES[i].name, i));
    hh.value = '12';
    place.value = '12';
  }

  function readOne(n) {
    var date = $('d' + n).value;
    if (!date) throw new Error((n === 1 ? 'ひとり目' : 'ふたり目') + 'の生年月日を入れてください。');
    var p = date.split('-').map(Number);
    if (p[0] < 1900 || p[0] > 2100) throw new Error('1900年〜2100年の範囲で入れてください。');
    var place = PLACES[Number($('p' + n).value)];
    var unknown = $('u' + n).checked;
    var input = {
      year: p[0], month: p[1], day: p[2],
      hour: Number($('h' + n).value), minute: Number($('m' + n).value),
      lat: place.lat, lon: place.lon, tzOffset: 9,
      autoJapanDst: true, timeUnknown: unknown
    };
    var west = window.HOSHI_ASTRO.calculate(input);
    var koyomi = K.build({
      year: p[0], month: p[1], day: p[2],
      hour: input.hour, minute: input.minute,
      lon: place.lon, tzOffset: west.offsetUsed,
      timeUnknown: unknown, useTrueSolar: true
    });
    return { west: west, koyomi: koyomi, east: TY.all(koyomi), label: date, unknown: unknown };
  }

  /* ---------------- 描画 ---------------- */
  function draw(a, b, r) {
    var box = $('result');
    box.textContent = '';

    /* 前置き */
    var s0 = panel('この結果の読み方', null);
    s0.appendChild(el('p', 'y-body', AT.INTRO));
    s0.appendChild(el('p', 'y-warn', AT.CAUTION));
    box.appendChild(s0);

    /* 宿曜 */
    var s1 = panel('宿曜から見た二人', '1');
    s1.appendChild(el('p', 'lead', AT.SHUKU_LEAD));
    var mirror = el('div', 'mirror');
    [['あなたから相手を見ると', r.shuku.rel.aToB], ['相手からあなたを見ると', r.shuku.rel.bToA]].forEach(function (g) {
      var t = AT.SHUKU_REL[g[1].name];
      var card = el('div', 'rel');
      var head = el('div', 'rel-head');
      head.appendChild(el('span', 'rel-who', g[0]));
      head.appendChild(el('span', 'rel-name', g[1].name));
      head.appendChild(el('span', 'rel-dist', g[1].group));
      card.appendChild(head);
      card.appendChild(el('p', 'rel-c', t.c));
      card.appendChild(el('p', 'rel-b', t.b));
      card.appendChild(el('p', 'rel-b', AT.DISTANCE_TEXT[g[1].group]));
      mirror.appendChild(card);
    });
    s1.appendChild(mirror);
    s1.appendChild(el('p', 'chartnote',
      'あなたは' + r.shuku.a + '宿、相手は' + r.shuku.b + '宿。' +
      (r.shuku.rel.aToB.name !== r.shuku.rel.bToA.name
        ? '　左右で関係が違うのは、宿曜ではよくあることです。片方だけが得をしている、と読むこともできます。'
        : '　左右が同じ関係になる、めずらしい組み合わせです。')));
    box.appendChild(s1);

    /* 四柱推命 */
    var s2 = panel('生まれた日から見た二人', '2');
    s2.appendChild(el('p', 'lead',
      '四柱推命では、生まれた日がその人本人を表します。二人の「生まれた日」どうしを重ねます。'));
    var c1 = el('div', 'rel');
    var h1 = el('div', 'rel-head');
    h1.appendChild(el('span', 'rel-who', '上の記号どうし（' + r.shichu.aKan + ' と ' + r.shichu.bKan + '）'));
    h1.appendChild(el('span', 'rel-name', r.shichu.kan.kind));
    c1.appendChild(h1);
    c1.appendChild(el('p', 'rel-b', AT.KAN_REL[r.shichu.kan.kind]));
    s2.appendChild(c1);
    var c2 = el('div', 'rel');
    var h2 = el('div', 'rel-head');
    h2.appendChild(el('span', 'rel-who', '下の記号どうし（' + r.shichu.aShi + ' と ' + r.shichu.bShi + '）'));
    h2.appendChild(el('span', 'rel-name', r.shichu.shi.kind));
    c2.appendChild(h2);
    c2.appendChild(el('p', 'rel-b', AT.SHI_REL[r.shichu.shi.kind]));
    s2.appendChild(c2);
    box.appendChild(s2);

    /* 西洋 */
    var s3 = panel('星の角度から見た二人', '3');
    if (!r.synastry.length) {
      s3.appendChild(el('p', 'lead', AT.NO_ASPECT));
    } else {
      s3.appendChild(el('p', 'lead',
        '二人の星のあいだにできている角度です。上にあるものほど、相性ではよく効くとされます。'));
      var ul = el('ul', 'asp');
      r.synastry.slice(0, 10).forEach(function (x) {
        var li = el('li');
        li.appendChild(el('span', 'tag ' + x.aspect.tone, x.aspect.plain));
        li.appendChild(el('span', 'pair', 'あなたの' + x.aName + '　と　相手の' + x.bName));
        li.appendChild(el('span', 'orb', 'ずれ ' + x.gap.toFixed(1) + '度'));
        var pt = AT.PAIR_TEXT[[x.aKey, x.bKey].sort().join('-')];
        li.appendChild(el('span', 'mean',
          (pt ? pt + ' ' : '') + (AT.ASPECT_TEXT[x.aspect.plain] || '')));
        ul.appendChild(li);
      });
      s3.appendChild(ul);
      if (r.synastry.length > 10) {
        s3.appendChild(el('p', 'chartnote', 'ほかに' + (r.synastry.length - 10) + '件ありますが、効きが弱いので省いています。'));
      }
    }
    if (a.unknown || b.unknown) {
      s3.appendChild(el('p', 'chartnote',
        '生まれた時刻が分からない方がいるため、月の位置に少しの誤差があります。' +
        '月は1日で13度動くので、時刻が分かるとここは精度が上がります。'));
    }
    box.appendChild(s3);

    /* 太陽と月の並び */
    var s4 = panel('いちばん大まかな見取り図', '4');
    s4.appendChild(el('p', 'lead', '星座だけで見るとこうなります。細かい話の前の、ざっくりした地図です。'));
    var tw = el('div', 'mirror');
    [['あなた', r.sunA, r.moonA], ['相手', r.sunB, r.moonB]].forEach(function (g) {
      var card = el('div', 'rel');
      card.appendChild(el('div', 'rel-who', g[0]));
      card.appendChild(el('p', 'rel-b', '向かいたい方向は' + g[1] + '、落ち着き方は' + g[2] + '。'));
      tw.appendChild(card);
    });
    s4.appendChild(tw);
    box.appendChild(s4);

    var last = el('section', 'panel');
    last.appendChild(el('p', 'y-closing', AT.CLOSING));
    box.appendChild(last);

    box.classList.add('on');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- 起動 ---------------- */
  fill($('h1'), $('m1'), $('p1'));
  fill($('h2'), $('m2'), $('p2'));
  [1, 2].forEach(function (n) {
    $('u' + n).addEventListener('change', function () {
      var off = $('u' + n).checked;
      $('h' + n).disabled = off;
      $('m' + n).disabled = off;
      $('h' + n).style.opacity = $('m' + n).style.opacity = off ? .45 : 1;
    });
  });

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    $('err').textContent = '';
    var a, b;
    try {
      a = readOne(1);
      b = readOne(2);
    } catch (e) {
      $('err').textContent = e.message;
      return;
    }
    try {
      draw(a, b, AI.build(a, b));
    } catch (e) {
      $('err').textContent = '計算できませんでした（' + e.message + '）。日付を確かめてください。';
    }
  });
})();
