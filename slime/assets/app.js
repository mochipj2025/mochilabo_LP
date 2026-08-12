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

  var PART_LABELS = ['よくあること', 'そうなる理由', '周りからの見え方', '試してほしいこと'];

  /* 一区画ぶん。見出し・タグ・説明・四つの読み。 */
  function block(tag, name, lead, paragraphs) {
    var sec = el('section', 'read');
    var h = el('h2');
    h.appendChild(el('span', 'tag', tag));
    h.appendChild(el('span', null, name));
    sec.appendChild(h);
    sec.appendChild(el('p', 'lead', lead));
    (paragraphs || ['（本文がまだありません）']).forEach(function (p, i) {
      var item = el('div', 'read-item' + (i === 3 ? ' advice' : ''));
      item.appendChild(el('h3', null, PART_LABELS[i] || '補足'));
      item.appendChild(el('p', null, p));
      sec.appendChild(item);
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

  var last = null;

  function render(r, dateText) {
    last = { r: r, stamp: fmtDate(dateText) + '生まれ' };
    var pic = $('slime');
    pic.onerror = function () {
      /* 鉢の色ぶんが無い絵は、色なしのほうを出す。二度目は諦める。 */
      this.onerror = null;
      if (r.imageFallback) this.src = r.imageFallback;
    };
    pic.src = r.image;
    pic.alt = r.color.name + 'の鉢に入った' + r.kei.name + 'のスライム';
    $('title').textContent = r.title;
    $('stamp').textContent =
      fmtDate(dateText) + '生まれ　／　日柱 ' + r.koyomi.dayGanshi + '　月柱 ' + r.koyomi.monthGanshi;

    var reads = $('reads');
    reads.textContent = '';
    reads.appendChild(block('行動', r.kei.name, TX.LEAD.kei, TX.KEI[r.kei.key]));
    reads.appendChild(block('考え方', r.color.name, TX.LEAD.color, TX.COLOR[r.color.key]));
    reads.appendChild(block('対人', r.star.name, TX.LEAD.star, TX.STAR[r.star.key]));
    reads.appendChild(block('バランス', r.zureName, TX.LEAD.zure, TX.ZURE[r.zure]));

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

    /* 結果を絵にする文。組み立てるだけで、どこにも送らない。 */
    if (window.SLIME_PROMPT) {
      try {
        $('prompt').textContent = window.SLIME_PROMPT.build(r);
      } catch (ex) {
        $('prompt').textContent = '文を組み立てられませんでした。' + (ex.message || '');
      }
    }

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

  /* 1枚の画像にする。canvas に描いて保存するだけで、どこにも送らない。 */
  if ($('saveCard')) {
    $('saveCard').addEventListener('click', function () {
      if (!window.SLIME_CARD || !last) return;
      try {
        $('saved').textContent = '作っています…';
        window.SLIME_CARD.save(last.r, last.stamp, function (name) {
          $('saved').textContent = name + ' を保存しました';
          setTimeout(function () { $('saved').textContent = ''; }, 4000);
        });
      } catch (ex) {
        $('saved').textContent = '画像にできませんでした。' + (ex.message || '');
      }
    });
  }

  /* 文をコピーする。クリップボードが使えない場合は選択だけして、あとは本人に任せる。 */
  if ($('copyPrompt')) {
    $('copyPrompt').addEventListener('click', function () {
      var pre = $('prompt');
      var say = function (msg) {
        $('copied').textContent = msg;
        setTimeout(function () { $('copied').textContent = ''; }, 3000);
      };
      var select = function () {
        var range = document.createRange();
        range.selectNodeContents(pre);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        say('選びました。Ctrl（⌘）＋ C でコピーしてください');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pre.textContent).then(function () {
          say('コピーしました');
        }, select);
      } else {
        select();
      }
    });
  }
})();
