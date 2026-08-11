/* スライム診断 — 画面の組み立て
 * 判定は slime.js、本文は text.js。ここは並べるだけ。
 */
(function () {
  'use strict';

  var S = window.SLIME;
  var TX = window.SLIME_TEXT;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* 一区画ぶん。見出し・タグ・添え書き・本文。 */
  function block(tag, name, lead, paragraphs) {
    var sec = el('section', 'read');
    var h = el('h2');
    h.appendChild(el('span', 'tag', tag));
    h.appendChild(el('span', null, name));
    sec.appendChild(h);
    sec.appendChild(el('p', 'lead', lead));
    (paragraphs || ['（本文がまだありません）']).forEach(function (p) {
      sec.appendChild(el('p', null, p));
    });
    return sec;
  }

  function row(table, label, value) {
    var tr = document.createElement('tr');
    tr.appendChild(el('th', null, label));
    tr.appendChild(el('td', null, value));
    table.appendChild(tr);
  }

  /* 入力の 'YYYY-MM-DD' 用 */
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    return m ? m[1] + '年' + (+m[2]) + '月' + (+m[3]) + '日' : String(iso);
  }

  /* 節入りの瞬間。中身はUTCのDateなので、日本標準時に直してから出す。 */
  function fmtInstant(d) {
    if (!(d instanceof Date)) d = new Date(d);
    if (isNaN(d)) return '';
    var j = new Date(d.getTime() + 9 * 3600000);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return j.getUTCFullYear() + '年' + (j.getUTCMonth() + 1) + '月' + j.getUTCDate() + '日 '
      + p(j.getUTCHours()) + ':' + p(j.getUTCMinutes());
  }

  function render(r, dateText) {
    $('slime').src = r.image;
    $('slime').alt = r.kei.name + 'のスライム';
    $('title').textContent = r.title;
    $('stamp').textContent =
      fmtDate(dateText) + '生まれ　／　日柱 ' + r.koyomi.dayGanshi + '　月柱 ' + r.koyomi.monthGanshi;

    var reads = $('reads');
    reads.textContent = '';
    reads.appendChild(block('景', r.kei.name, TX.LEAD.kei, TX.KEI[r.kei.key]));
    reads.appendChild(block('色', r.color.name, TX.LEAD.color, TX.COLOR[r.color.key]));
    reads.appendChild(block('星', r.star.name, TX.LEAD.star, TX.STAR[r.star.key]));
    reads.appendChild(block('ズレ', r.zureName, TX.LEAD.zure, TX.ZURE[r.zure]));

    var t = $('koyomi');
    t.textContent = '';
    var k = r.koyomi;
    row(t, '年柱', k.yearGanshi);
    row(t, '月柱', k.monthGanshi + '（節入り ' + k.setsu.name + '　' + fmtInstant(k.setsu.start) + ' 日本標準時）');
    row(t, '日柱', k.dayGanshi);
    row(t, '日干（あなた本人）', k.dayKan + '　' + k.dayKanElem + '・' + (k.dayKanYin ? '陰' : '陽') + ' → ' + r.color.name);
    row(t, '日柱の十二運', k.un + ' → ' + r.kei.name);
    row(t, '月柱の通変星', k.monthShiStar + '（月支の蔵干本気 ' + k.monthHonki + ' から）→ ' + r.star.name);
    row(t, '月干からの通変星', k.monthKanStar + '（参考。主役には使っていません）');
    row(t, '五行の数', ['木', '火', '土', '金', '水'].map(function (g) {
      return g + k.gogyo[g];
    }).join('　') + '　（3柱ぶん、計6）');
    row(t, '空亡', k.kubo.join('・'));
    row(t, 'ズレの判定', r.kei.name + '（' + r.kei.strength + '）× ' + r.star.name + '（' + r.star.side + '）→ ' + r.zureName);

    $('result').hidden = false;
  }

  /* マイページに覚えさせてあれば、入力欄にだけ入れる。診断は始めない。 */
  if (window.MOCHI_STORE) window.MOCHI_STORE.prefill('birthdate');

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('birthdate').value;
    $('err').textContent = '';
    if (!v) {
      $('err').textContent = '生年月日を入れてください。';
      $('result').hidden = true;
      return;
    }
    try {
      render(S.readDate(v), v);
      $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (ex) {
      $('err').textContent = ex.message || '計算できませんでした。';
      $('result').hidden = true;
    }
  });
})();
