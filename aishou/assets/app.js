/* 相性を読む — 画面の組み立て */
(function () {
  'use strict';

  var A = window.AISHOU;
  var TX = window.AISHOU_TEXT;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function paras(target, list) {
    target.textContent = '';
    (list || []).forEach(function (p) { target.appendChild(el('p', null, p)); });
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  /* 十二景の輪。二人の位置を打って、間を線で結ぶ。 */
  function drawRing(aIdx, bIdx) {
    var W = 380, C = W / 2, R = 132;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + W, role: 'img' });
    var title = svg('title', {});
    title.textContent = '十二景の輪。あなたと相手の位置を示しています。';
    s.appendChild(title);
    s.appendChild(svg('circle', { cx: C, cy: C, r: R, class: 'ring-ring' }));

    var pt = function (i) {
      var rad = (-90 + i * 30) * Math.PI / 180;
      return [C + R * Math.cos(rad), C + R * Math.sin(rad)];
    };

    var pa = pt(aIdx), pb = pt(bIdx);
    if (aIdx !== bIdx) {
      s.appendChild(svg('line', { x1: pa[0], y1: pa[1], x2: pb[0], y2: pb[1], class: 'ring-line' }));
    }

    A.KEI.forEach(function (k, i) {
      var p = pt(i);
      var on = (i === aIdx || i === bIdx);
      s.appendChild(svg('circle', {
        cx: p[0], cy: p[1], r: on ? 9 : 4, class: on ? 'ring-mark' : 'ring-dot'
      }));
      var lp = pt(i), rad = (-90 + i * 30) * Math.PI / 180;
      var lx = C + (R + 26) * Math.cos(rad), ly = C + (R + 26) * Math.sin(rad) + 4;
      var t = svg('text', { x: lx, y: ly, class: 'ring-label' + (on ? ' on' : '') });
      t.textContent = k.name;
      s.appendChild(t);
      if (on) {
        var mark = svg('text', { x: lp[0], y: lp[1] + 4, class: 'ring-label', fill: '#fff',
          'text-anchor': 'middle', 'font-size': '10', 'font-weight': '700' });
        mark.textContent = (i === aIdx && i === bIdx) ? '2' : (i === aIdx ? 'あ' : 'あ');
        if (i === bIdx && i !== aIdx) mark.textContent = 'い';
        s.appendChild(mark);
      }
    });
    return s;
  }

  var KYORI_TITLE = {
    0: '同じところにいます',
    1: '半歩ちがいます',
    2: 'ちょうどいい距離です',
    3: 'いちばん擦れる距離です',
    4: '別々に動いています',
    5: 'かなり離れています',
    6: '真向かいです'
  };

  var GOGYO_TITLE = {
    onaji:          '同じ色でできています',
    watashi_umu:    'あなたが相手を押し出します',
    aite_umu:       '相手があなたを押し出します',
    watashi_kokusu: 'あなたが相手を抑えます',
    aite_kokusu:    '相手があなたを抑えます'
  };

  function render(r) {
    /* 二人 */
    $('img-a').src = '../slime/images/' + r.a.kei.key + '.png';
    $('img-b').src = '../slime/images/' + r.b.kei.key + '.png';
    $('img-a').alt = r.a.kei.name + 'のスライム';
    $('img-b').alt = r.b.kei.name + 'のスライム';
    $('nm-a').textContent = r.a.color.name + 'の、' + r.a.kei.name;
    $('nm-b').textContent = r.b.color.name + 'の、' + r.b.kei.name;

    /* 輪と距離 */
    $('kyori-title').textContent = KYORI_TITLE[r.distance];
    $('kyori-lead').textContent = TX.LEAD.kyori + '（' + r.a.kei.name + ' と ' + r.b.kei.name + '、'
      + (r.distance === 0 ? '同じ位置' : r.distance + 'つ離れています') + '）';
    var ring = $('ring');
    ring.textContent = '';
    ring.appendChild(drawRing(r.a.keiIdx, r.b.keiIdx));
    paras($('kyori-body'), TX.KYORI[r.distance]);

    /* 行きと帰り */
    $('ab-name').textContent = r.aToB.name;
    paras($('ab-body'), TX.STAR[r.aToB.key]);
    $('ba-name').textContent = r.bToA.name;
    paras($('ba-body'), TX.STAR[r.bToA.key]);

    /* 色 */
    $('gogyo-title').textContent = GOGYO_TITLE[r.gogyo];
    $('gogyo-lead').textContent = TX.LEAD.gogyo + '（' + r.a.color.name + ' と ' + r.b.color.name + '）';
    paras($('gogyo-body'), TX.GOGYO[r.gogyo]);

    /* 使った暦 */
    var t = $('koyomi');
    t.textContent = '';
    var kr = function (a, b) {
      var tr = document.createElement('tr');
      tr.appendChild(el('th', null, a)); tr.appendChild(el('td', null, b)); t.appendChild(tr);
    };
    kr('あなたの日柱', r.a.ganshi + '（日干 ' + r.a.kanName + '・' + r.a.elem + ' → ' + r.a.color.name + '）');
    kr('相手の日柱', r.b.ganshi + '（日干 ' + r.b.kanName + '・' + r.b.elem + ' → ' + r.b.color.name + '）');
    kr('あなたの十二運', r.a.un + ' → ' + r.a.kei.name);
    kr('相手の十二運', r.b.un + ' → ' + r.b.kei.name);
    kr('あなたから見た相手', r.aToB.tsuhen + ' → ' + r.aToB.name);
    kr('相手から見たあなた', r.bToA.tsuhen + ' → ' + r.bToA.name);
    kr('行きと帰り', r.asymmetric ? '別の名前になりました' : '同じ名前になりました');
    kr('景の距離', '輪の上で ' + r.distance + '（0〜6）');
    kr('五行の関係', r.a.elem + ' と ' + r.b.elem + ' → ' + GOGYO_TITLE[r.gogyo]);

    $('result').hidden = false;
  }

  /* マイページから来たとき（?a=&b=）と、覚えてある自分の生年月日。どちらも入れるだけ。 */
  (function () {
    var S = window.MOCHI_STORE;
    if (!S) return;
    var q = new URLSearchParams(location.search);
    var a = S.validDate(q.get('a')), b = S.validDate(q.get('b'));
    if (a) $('d1').value = a;
    if (b) $('d2').value = b;
    if (!$('d1').value) S.prefill('d1');

    /* 登録してある人を、ふたりめの候補として並べる */
    var people = S.people();
    if (!people.length) return;
    var box = el('div', 'quick');
    box.appendChild(el('span', 'quick-label', 'よく見る人'));
    people.forEach(function (p) {
      var b2 = el('button', null, p.name);
      b2.type = 'button';
      b2.addEventListener('click', function () { $('d2').value = p.date; });
      box.appendChild(b2);
    });
    $('d2').parentNode.appendChild(box);
  })();

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    $('err').textContent = '';
    try {
      render(A.read($('d1').value, $('d2').value));
      $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (ex) {
      $('err').textContent = ex.message || '計算できませんでした。';
      $('result').hidden = true;
    }
  });
})();
