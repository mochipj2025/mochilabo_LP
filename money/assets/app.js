/* お金の診断 — 画面の組み立て */
(function () {
  'use strict';

  var M = window.MONEY;
  var TX = window.MONEY_TEXT;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  var yen = function (n) { return n.toLocaleString('ja-JP') + '円'; };

  /* ---------- 配点 ---------- */

  var points = {};
  M.DOMAINS.forEach(function (d) { points[d.key] = 0; });

  function used() {
    return M.DOMAINS.reduce(function (a, d) { return a + points[d.key]; }, 0);
  }

  function buildPoints() {
    var box = $('points');
    box.textContent = '';
    M.DOMAINS.forEach(function (d) {
      var row = el('div', 'prow');
      row.dataset.key = d.key;

      var nm = el('div', 'nm');
      nm.appendChild(el('b', null, d.name));
      nm.appendChild(el('span', null, d.hint));
      row.appendChild(nm);

      var ctl = el('div', 'ctl');
      var minus = el('button', null, '−'); minus.type = 'button';
      var val = el('span', 'val', '0');
      var plus = el('button', null, '＋'); plus.type = 'button';
      minus.addEventListener('click', function () { bump(d.key, -1); });
      plus.addEventListener('click', function () { bump(d.key, 1); });
      ctl.appendChild(minus); ctl.appendChild(val); ctl.appendChild(plus);
      row.appendChild(ctl);
      box.appendChild(row);
    });
    syncPoints();
  }

  function bump(key, n) {
    var next = points[key] + n;
    if (next < 0) return;
    if (n > 0 && used() >= 10) return;
    points[key] = next;
    syncPoints();
    buildFills();
    syncGo();
  }

  function syncPoints() {
    var left = 10 - used();
    $('remain').textContent = left;
    [].forEach.call($('points').children, function (row) {
      var k = row.dataset.key;
      row.querySelector('.val').textContent = points[k];
      row.classList.toggle('on', points[k] > 0);
      var b = row.querySelectorAll('button');
      b[0].disabled = points[k] === 0;
      b[1].disabled = left === 0;
    });
  }

  /* ---------- 満たし方（上位3つだけ） ---------- */

  var fill = {};

  function top3() {
    if (used() !== 10) return [];
    return M.ranked(points).filter(function (d) { return d.points > 0; }).slice(0, 3);
  }

  function buildFills() {
    var list = top3();
    var panel = $('fill-panel');
    if (!list.length) { panel.hidden = true; return; }
    panel.hidden = false;

    var box = $('fills');
    box.textContent = '';
    Object.keys(fill).forEach(function (k) {
      if (!list.some(function (d) { return d.key === k; })) delete fill[k];
    });

    list.forEach(function (d) {
      if (fill[d.key] == null) fill[d.key] = 0;
      var wrap = el('div', 'fill');
      wrap.appendChild(el('b', null, d.name + '（' + d.points + '点）'));
      M.OPTIONS[d.key].forEach(function (opt, i) {
        var lab = el('label');
        var radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'fill-' + d.key; radio.value = i;
        radio.checked = fill[d.key] === i;
        radio.addEventListener('change', function () { fill[d.key] = i; });
        lab.appendChild(radio);
        lab.appendChild(el('span', null, opt[0]));
        lab.appendChild(el('span', 'yen', opt[1] ? '＋' + yen(opt[1]) + '／月' : '±0'));
        wrap.appendChild(lab);
      });
      box.appendChild(wrap);
    });
  }

  function syncGo() {
    $('go').disabled = !($('birthdate').value && used() === 10);
  }

  /* ---------- 結果 ---------- */

  function paras(target, list, map) {
    target.textContent = '';
    list.forEach(function (p) {
      var t = p;
      if (map) Object.keys(map).forEach(function (k) { t = t.split('{' + k + '}').join(map[k]); });
      target.appendChild(el('p', null, t));
    });
  }

  function row(table, a, b, cls) {
    var tr = document.createElement('tr');
    tr.appendChild(el('td', cls, a));
    tr.appendChild(el('td', cls, b));
    table.appendChild(tr);
  }

  var last = null;

  function render(r) {
    last = r;
    var top = r.top, ven = r.venus.domain;
    var map = { '配点': top.name, '金星': ven.name };

    /* ギャップ */
    $('gap-tag').textContent = r.gap === 'icchi' ? '思っている先と、払っている先が同じ' : '思っている先と、払っている先が違う';
    $('gap-title').textContent = r.gap === 'icchi'
      ? '「' + top.name + '」で揃っています'
      : '「' + top.name + '」のつもりで、「' + ven.name + '」に払っています';
    paras($('gap-body'), TX.GAP[r.gap], map);

    /* 左右 */
    $('s-name').textContent = top.name;
    $('s-lead').textContent = TX.LEAD.sentaku + '（' + top.points + '点）';
    $('s-body').textContent = TX.SENTAKU[top.key][0];
    $('k-name').textContent = ven.name;
    $('k-lead').textContent = TX.LEAD.kinsei + '（' + r.venus.sign + '）';
    $('k-body').textContent = TX.KINSEI[ven.key][0];

    /* 癖 */
    $('star-name').textContent = r.star.name;
    $('star-lead').textContent = TX.LEAD.star;
    paras($('star-body'), TX.STAR[r.star.key]);

    /* 金額 */
    var t = $('breakdown');
    t.textContent = '';
    if (r.money.lines.length) {
      r.money.lines.forEach(function (l) { row(t, l.name + '　' + l.label, '＋' + yen(l.yen)); });
    } else {
      row(t, '上乗せなし（どれも「今のままでいい」を選びました）', '±0', 'sub');
    }
    var tot = $('totals');
    tot.textContent = '';
    [['月に', r.money.monthly, true], ['年に', r.money.yearly, false]].forEach(function (p) {
      var d = el('div', p[2] ? 'big' : null);
      d.appendChild(el('b', null, p[0]));
      d.appendChild(el('span', null, yen(p[1])));
      tot.appendChild(d);
    });
    var inv = el('div');
    inv.appendChild(el('b', null, '自営なら請求ベースで年に'));
    inv.appendChild(el('span', null, yen(r.money.invoice)));
    tot.appendChild(inv);
    $('money-note').textContent =
      '請求ベースは、年額を ' + r.money.takeHome + ' で割った目安です（税と社会保険でおよそ3割引かれる前提）。'
      + 'ここに出ているのは、いまの暮らしへの上乗せ分だけです。いまの生活費は聞いていないので含まれていません。';

    /* 使った数字 */
    var k = $('koyomi');
    k.textContent = '';
    var kr = function (a, b) {
      var tr = document.createElement('tr');
      tr.appendChild(el('th', null, a)); tr.appendChild(el('td', null, b)); k.appendChild(tr);
    };
    kr('金星の位置', r.venus.sign + ' ' + r.venus.deg.toFixed(1) + '度 → ' + ven.name
       + (r.venus.boundary ? '（境目。隣は ' + r.venus.alt.sign + ' → ' + r.venus.alt.domain.name + '）' : ''));
    kr('配点', M.DOMAINS.map(function (d) { return d.name + points[d.key]; }).join('　'));
    kr('月柱', r.star.monthGanshi + '（節入り ' + r.star.setsu.name + '）');
    kr('月柱の通変星', r.star.tsuhen + '（月支の蔵干本気 ' + r.star.honki + ' から）→ ' + r.star.name);
    kr('ギャップの判定', top.name + '（配点1位）と ' + ven.name + '（金星）が'
       + (r.gap === 'icchi' ? '同じ → 一致' : '違う → ずれ'));
    kr('上乗せの合計', r.money.lines.map(function (l) { return l.name + ' ' + yen(l.yen); }).join('　＋　') || 'なし');

    $('result').hidden = false;
  }

  /* ---------- 起動 ---------- */

  buildPoints();
  $('birthdate').addEventListener('change', syncGo);
  $('birthdate').addEventListener('input', syncGo);

  /* マイページに覚えさせてあれば、入力欄にだけ入れる。診断は始めない。 */
  if (window.MOCHI_STORE) window.MOCHI_STORE.prefill('birthdate');

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    $('err').textContent = '';
    try {
      render(M.read({ date: $('birthdate').value, points: points, fill: fill }));
      $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (ex) {
      $('err').textContent = ex.message || '計算できませんでした。';
      $('result').hidden = true;
    }
  });

  /* 1枚の画像にする。canvas に描いて保存するだけで、どこにも送らない。 */
  if ($('saveCard')) {
    $('saveCard').addEventListener('click', function () {
      if (!window.MONEY_CARD || !last) return;
      $('saved').textContent = '作っています…';
      try {
        var d = $('birthdate') ? $('birthdate').value : '';
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
        var stamp = m ? m[1] + '.' + (+m[2]) + '.' + (+m[3]) + '生まれ' : '';
        window.MONEY_CARD.save(last, stamp, function (name) {
          $('saved').textContent = name + ' を保存しました';
          setTimeout(function () { $('saved').textContent = ''; }, 4000);
        });
      } catch (ex) {
        $('saved').textContent = '画像にできませんでした。' + (ex.message || '');
      }
    });
  }
})();