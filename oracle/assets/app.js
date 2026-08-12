/* もちオラクル — シャッフルと一枚引き
 *
 * 演出は3段。シャッフル（山が崩れて戻る）→ ジャンプ（一枚だけ跳ねる）→ 着地して開く。
 * 逆位置は着地時に180度回る。正逆は引くたびに決め直す。
 */
(function () {
  'use strict';

  var CARDS = window.ORACLE_CARDS;
  var HISTORY_KEY = 'mochisura-oracle-v3';
  var $ = function (s) { return document.querySelector(s); };
  var el = function (t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  var POS3 = ['いま起きていること', '心の内側', '次の一歩'];

  var deck = $('#deck');
  var drawn = $('#drawn');
  var status = $('#status');
  var reading = $('#reading');
  var btnShuffle = $('#shuffle');
  var btnDraw = $('#draw');
  var cardDialog = $('#cardDialog');
  var cardDialogBody = $('#cardDialogBody');
  var cardDialogClose = $('#cardDialogClose');

  var order = CARDS.map(function (_, i) { return i; });
  var spread = 1;
  var busy = false;

  /* ---------- 山札の見た目（10枚ぶんの厚み） ---------- */
  for (var i = 0; i < 10; i++) {
    var s = el('i');
    s.style.setProperty('--n', i);
    deck.appendChild(s);
  }
  var slices = [].slice.call(deck.children);

  function jiggle(strength) {
    slices.forEach(function (s) {
      s.style.setProperty('--dx', Math.round((Math.random() - 0.5) * strength));
      s.style.setProperty('--dy', Math.round((Math.random() - 0.5) * strength * 0.5));
      s.style.setProperty('--dr', ((Math.random() - 0.5) * strength * 0.4).toFixed(1));
    });
  }
  function settle() {
    slices.forEach(function (s) {
      s.style.setProperty('--dx', 0); s.style.setProperty('--dy', 0); s.style.setProperty('--dr', 0);
    });
  }

  /* フィッシャー–イェーツ。順番は本当に入れ替える。 */
  function shuffleOrder() {
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
  }

  /* 山を崩して戻し、順番を入れ替える。busy の見張りはここでは持たない
     （draw の中からも呼ぶので、持たせると素通りする）。 */
  async function shuffleAnim(rounds) {
    for (var r = 0; r < (rounds || 4); r++) { jiggle(46 - r * 8); await wait(150); }
    settle();
    shuffleOrder();
    await wait(200);
  }

  async function doShuffle() {
    if (busy) return;
    busy = true; setButtons(false);
    status.textContent = '切っています…';
    try { await shuffleAnim(4); }
    finally {
      status.textContent = '切りました。好きなタイミングでどうぞ。';
      busy = false; setButtons(true);
    }
  }

  function setButtons(on) {
    btnShuffle.disabled = !on;
    btnDraw.disabled = !on;
  }

  /* ---------- 引く ---------- */

  function pick(n) {
    var out = [], used = {};
    var k = 0;
    while (out.length < n && k < order.length) {
      var idx = order[k++];
      if (used[idx]) continue;
      used[idx] = 1;
      out.push({ card: CARDS[idx], reversed: Math.random() < 0.5 });
    }
    return out;
  }

  async function flyOne(entry) {
    var c = entry.card;
    drawn.className = 'drawn is-live';
    drawn.querySelector('img').src = c.art;
    drawn.querySelector('img').alt = c.title + 'のカード';
    drawn.querySelector('.rev-flag').textContent = entry.reversed ? '逆位置' : '正位置';

    await wait(30);
    drawn.classList.add('is-lift');          /* 山から跳ねる */
    await wait(430);
    drawn.classList.add('is-land');           /* 中央へ着地 */
    if (entry.reversed) drawn.classList.add('is-reversed');
    await wait(300);
    drawn.classList.add('is-open');           /* めくれる */
    await wait(560);
  }

  function appendReading(target, side, reversed) {
    target.appendChild(el('p', 'line', side.line));
    side.body.forEach(function (p) { target.appendChild(el('p', 'body', p)); });

    var act = el('div', 'act');
    act.appendChild(el('b', null, reversed ? 'ほどく一手' : '今日の一手'));
    act.appendChild(document.createTextNode(side.act));
    target.appendChild(act);
  }

  function renderDialogSide(c, reversed) {
    var side = reversed ? c.rev : c.up;
    var box = el('section', 'card-dialog-side');
    box.appendChild(el('h3', null, reversed ? '逆位置の読み' : '正位置の読み'));
    appendReading(box, side, reversed);
    return box;
  }

  function openCardDialog(c) {
    cardDialogBody.textContent = '';

    var layout = el('div', 'card-dialog-layout');
    var visual = el('figure', 'card-dialog-visual');
    var image = document.createElement('img');
    image.src = c.art;
    image.alt = c.title + 'のカード';
    visual.appendChild(image);
    visual.appendChild(el('figcaption', null, c.symbol + ' ' + c.suitLabel + '　' + c.serial));
    layout.appendChild(visual);

    var info = el('div', 'card-dialog-info');
    info.appendChild(el('span', 'suit ' + c.suit, c.symbol + ' ' + c.suitLabel));
    var title = el('h2', null, c.title);
    title.id = 'cardDialogTitle';
    info.appendChild(title);
    info.appendChild(el('p', 'card-dialog-meta', c.reading + '　／　' + c.keyword));
    info.appendChild(renderDialogSide(c, false));
    info.appendChild(renderDialogSide(c, true));
    layout.appendChild(info);
    cardDialogBody.appendChild(layout);

    if (typeof cardDialog.showModal === 'function') cardDialog.showModal();
    else cardDialog.setAttribute('open', '');
  }

  function closeCardDialog() {
    if (typeof cardDialog.close === 'function') cardDialog.close();
    else cardDialog.removeAttribute('open');
  }

  function renderCard(entry, posLabel) {
    var c = entry.card;
    var side = entry.reversed ? c.rev : c.up;
    var box = el('article', 'rcard');

    if (posLabel) box.appendChild(el('p', 'pos', posLabel));

    var layout = el('div', 'rcard-layout');
    var visual = el('button', 'rcard-visual');
    visual.type = 'button';
    visual.setAttribute('aria-label', c.title + 'のカード説明を見る');
    var image = document.createElement('img');
    image.src = c.art;
    image.alt = c.title + 'のカード（' + (entry.reversed ? '逆位置' : '正位置') + '）';
    if (entry.reversed) image.className = 'is-reversed';
    visual.appendChild(image);
    visual.appendChild(el('span', null, 'カードの説明を見る'));
    visual.addEventListener('click', function () { openCardDialog(c); });
    layout.appendChild(visual);

    var copy = el('div', 'rcard-copy');

    var head = el('div', 'head');
    head.appendChild(el('span', 'suit ' + c.suit, c.symbol + ' ' + c.suitLabel));
    var h = el('h3', null, c.title);
    h.appendChild(el('small', null, c.reading + '　' + c.keyword));
    head.appendChild(h);
    head.appendChild(el('span', 'ori', entry.reversed ? '逆位置' : '正位置'));
    copy.appendChild(head);
    appendReading(copy, side, entry.reversed);
    layout.appendChild(copy);
    box.appendChild(layout);
    return box;
  }

  async function draw() {
    if (busy) return;
    busy = true; setButtons(false);
    reading.textContent = '';
    drawn.className = 'drawn';
    status.textContent = '切って、引いています…';

    try {
      await shuffleAnim(3);          /* 引くたびに必ず切り直す */

      var picks = pick(spread);
      var q = $('#question').value.trim();
      if (q) reading.appendChild(el('p', 'qnote', '問い：' + q));

      for (var i = 0; i < picks.length; i++) {
        drawn.className = 'drawn';
        await wait(120);
        await flyOne(picks[i]);
        reading.appendChild(renderCard(picks[i], spread === 3 ? POS3[i] : null));
        if (i < picks.length - 1) await wait(420);
      }

      remember(picks);
      status.textContent = spread === 3 ? '三枚の流れです。' : 'この一枚です。';
      reading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      busy = false; setButtons(true);
    }
  }

  /* ---------- 履歴 ---------- */

  function load() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; }
  }
  function remember(picks) {
    var list = load();
    picks.forEach(function (p) {
      list.unshift({ t: p.card.title, s: p.card.suitLabel, r: p.reversed, d: new Date().toISOString().slice(0, 10) });
    });
    list = list.slice(0, 20);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) {}
    renderHistory();
  }
  function renderHistory() {
    var list = load(), box = $('#history');
    box.textContent = '';
    if (!list.length) { box.appendChild(el('p', 'empty', 'まだ引いていません。')); return; }
    var ul = el('ul', 'hist');
    list.forEach(function (h) {
      var li = el('li');
      li.appendChild(el('span', null, h.s + '　' + h.t));
      li.appendChild(el('span', 'ori', h.r ? '逆位置' : '正位置'));
      li.appendChild(el('time', null, h.d));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  /* ---------- 図鑑 ---------- */

  function renderGallery(filter) {
    var grid = $('#gallery');
    grid.textContent = '';
    CARDS.filter(function (c) { return filter === 'all' || c.suit === filter; })
      .forEach(function (c) {
        var card = el('button', 'gallery-card');
        card.type = 'button';
        card.setAttribute('aria-label', c.title + 'の説明を見る');
        var img = document.createElement('img');
        img.src = c.art; img.alt = c.title; img.loading = 'lazy';
        card.appendChild(img);
        card.appendChild(el('span', 'gallery-card-name', c.title));
        card.appendChild(el('span', 'gallery-card-hint', '説明を見る'));
        card.addEventListener('click', function () { openCardDialog(c); });
        grid.appendChild(card);
      });
  }

  /* ---------- 起動 ---------- */

  btnShuffle.addEventListener('click', doShuffle);
  btnDraw.addEventListener('click', draw);

  [].forEach.call(document.querySelectorAll('.spread button'), function (b) {
    b.addEventListener('click', function () {
      [].forEach.call(document.querySelectorAll('.spread button'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      spread = +b.dataset.n;
      btnDraw.textContent = spread === 3 ? '三枚引く' : '一枚引く';
    });
  });

  [].forEach.call(document.querySelectorAll('.filters button'), function (b) {
    b.addEventListener('click', function () {
      [].forEach.call(document.querySelectorAll('.filters button'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      renderGallery(b.dataset.f);
    });
  });

  $('#clearHistory').addEventListener('click', function () {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
    renderHistory();
  });

  cardDialogClose.addEventListener('click', closeCardDialog);
  cardDialog.addEventListener('click', function (e) {
    if (e.target === cardDialog) closeCardDialog();
  });

  shuffleOrder();
  renderGallery('all');
  renderHistory();
})();
