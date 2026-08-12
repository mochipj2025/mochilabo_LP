/* 生年月日の入力を、年・月・日の3つに分ける
 *
 * Android の日付ピッカーは、いまの月から数十年ぶんスクロールして年を探すことになる。
 * 生年月日は「知っている数字を打つ」ほうが早いので、年は直接入力、月と日は短い一覧にする。
 *
 * もとの input は type="hidden" にして、id と値をそのまま残す。
 * だから各ページの app.js は一行も変えなくていい。
 * 外から値が入ったとき（マイページの prefill）も拾って、3つの欄に反映する。
 */
window.MOCHI_DOB = (function () {
  'use strict';

  var CSS = [
    '.dob{display:flex;gap:7px;align-items:stretch;flex-wrap:wrap}',
    '.dob-f{display:flex;align-items:center;gap:4px;flex:0 1 auto;min-width:0}',
    '.dob-f > i{font-style:normal;font-size:13px;color:var(--ink-soft,#777);flex:0 0 auto}',
    '.dob input,.dob select{',
    '  font:inherit;font-size:17px;color:var(--ink,#222);background:var(--bg,#fff);',
    '  border:1px solid var(--line,#ccc);border-radius:9px;padding:12px 10px;min-width:0;',
    '  font-variant-numeric:tabular-nums}',
    '.dob .dob-y{width:5.5em;text-align:center}',
    '.dob select{padding-right:6px}',
    '.dob input:focus,.dob select:focus{outline:2px solid var(--accent,#b5763a);outline-offset:1px}',
    '.dob-note{margin:7px 0 0;font-size:12.5px;color:var(--ink-soft,#777);min-height:1.2em}',
    '.dob-note.is-bad{color:#c0533f}'
  ].join('');

  var styled = false;
  function injectStyle() {
    if (styled) return;
    styled = true;
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function daysIn(year, month) {
    if (!year || !month) return 31;
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  /* この欄が何の日付かを、ラベルか aria-label から拾う。読み上げ用。 */
  function labelOf(input) {
    if (input.getAttribute('aria-label')) return input.getAttribute('aria-label');
    var lab = input.id && document.querySelector('label[for="' + input.id + '"]');
    return lab ? lab.textContent.trim() : '生年月日';
  }

  function upgrade(input) {
    if (!input || input.dataset.dob === 'on') return null;

    var name = labelOf(input);
    var minY = +(String(input.getAttribute('min') || '1900-01-01').slice(0, 4)) || 1900;
    var maxY = +(String(input.getAttribute('max') || '2100-12-31').slice(0, 4)) || 2100;

    var box = el('div', 'dob');
    var note = el('p', 'dob-note');

    var y = el('input', 'dob-y');
    y.type = 'text';
    y.inputMode = 'numeric';
    y.autocomplete = 'off';
    y.maxLength = 4;
    y.placeholder = '1990';
    y.setAttribute('aria-label', name + '（年）');

    var m = el('select', 'dob-m');
    m.setAttribute('aria-label', name + '（月）');
    m.appendChild(el('option', null, '--')).value = '';
    for (var i = 1; i <= 12; i++) m.appendChild(el('option', null, String(i))).value = String(i);

    var d = el('select', 'dob-d');
    d.setAttribute('aria-label', name + '（日）');

    [[y, '年'], [m, '月'], [d, '日']].forEach(function (pair) {
      var f = el('span', 'dob-f');
      f.appendChild(pair[0]);
      f.appendChild(el('i', null, pair[1]));
      box.appendChild(f);
    });

    /* 日の一覧は、年と月が決まってから作り直す */
    function fillDays() {
      var keep = d.value;
      var max = daysIn(+y.value, +m.value);
      d.textContent = '';
      d.appendChild(el('option', null, '--')).value = '';
      for (var i = 1; i <= max; i++) d.appendChild(el('option', null, String(i))).value = String(i);
      d.value = (keep && +keep <= max) ? keep : '';
    }
    fillDays();

    var writing = false;

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function push() {
      var yy = +y.value, mm = +m.value, dd = +d.value;
      var full = y.value.length === 4 && mm && dd;
      var next = '';
      if (full) {
        if (yy < minY || yy > maxY) {
          note.textContent = minY + '年から' + maxY + '年までで入れてください。';
          note.classList.add('is-bad');
        } else {
          next = yy + '-' + pad(mm) + '-' + pad(dd);
          note.textContent = '';
          note.classList.remove('is-bad');
        }
      } else {
        note.textContent = '';
        note.classList.remove('is-bad');
      }
      if (input.value === next) return;
      input.value = next;
      writing = true;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      writing = false;
    }

    y.addEventListener('input', function () {
      y.value = y.value.replace(/[^\d]/g, '').slice(0, 4);
      fillDays();
      push();
      if (y.value.length === 4) m.focus();   /* 4桁入ったら月へ送る */
    });
    m.addEventListener('change', function () { fillDays(); push(); });
    d.addEventListener('change', push);

    /* 外から値が入ったとき（マイページの prefill など）を拾う */
    function pull() {
      if (writing) return;
      var mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.value || '');
      if (!mt) { y.value = ''; m.value = ''; fillDays(); return; }
      y.value = mt[1];
      m.value = String(+mt[2]);
      fillDays();
      d.value = String(+mt[3]);
    }
    input.addEventListener('input', pull);
    input.addEventListener('change', pull);

    /* value を代入しただけでイベントを出さない呼び出し側がある
       （相性の「よく見る人」ボタンなど）。代入そのものを拾って、3つの欄へ反映する。 */
    try {
      var desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (desc && desc.get && desc.set) {
        Object.defineProperty(input, 'value', {
          configurable: true,
          get: function () { return desc.get.call(input); },
          set: function (v) { desc.set.call(input, v); if (!writing) pull(); }
        });
      }
    } catch (e) { /* 差し替えられない環境では、イベント経由だけで動く */ }

    injectStyle();
    input.parentNode.insertBefore(box, input.nextSibling);
    box.parentNode.insertBefore(note, box.nextSibling);

    /* もとの入力は隠して残す。id も値もそのままなので、各ページの処理は変わらない。
       required は外す（hidden は検証の対象外で、外さないと送信が黙って止まる） */
    input.type = 'hidden';
    input.removeAttribute('required');
    input.dataset.dob = 'on';

    pull();
    return { year: y, month: m, day: d };
  }

  function upgradeAll(root) {
    var list = (root || document).querySelectorAll('input[type="date"]');
    for (var i = 0; i < list.length; i++) upgrade(list[i]);
    return list.length;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { upgradeAll(); });
  } else {
    upgradeAll();
  }

  return { upgrade: upgrade, upgradeAll: upgradeAll };
})();
