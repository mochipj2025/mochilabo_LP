/* マイページ — 保存しているものを見せて、消せるようにする */
(function () {
  'use strict';

  var S = window.MOCHI_STORE;
  var ORACLE_KEY = 'mochisura-oracle-v3';
  var $ = function (id) { return document.getElementById(id); };
  var el = function (t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

  function say(node, text, isError) {
    node.textContent = text;
    node.classList.toggle('err', !!isError);
  }

  function oracleHistory() {
    try { return JSON.parse(localStorage.getItem(ORACLE_KEY)) || []; } catch (e) { return []; }
  }

  /* 中身を隠さずに出す。何を持たれているか見えないと、消す判断ができない。 */
  function renderDump() {
    var data = S.all();
    var hist = oracleHistory();
    var lines = [];
    lines.push('# ' + S.KEY);
    lines.push(JSON.stringify(data, null, 2));
    lines.push('');
    lines.push('# ' + ORACLE_KEY + '（オラクルの履歴 ' + hist.length + '件）');
    lines.push(hist.length ? JSON.stringify(hist.slice(0, 5), null, 2) + (hist.length > 5 ? '\n… ほか' + (hist.length - 5) + '件' : '') : '（なし）');
    $('dump').textContent = lines.join('\n');
  }

  function renderPeople() {
    var list = S.people();
    var box = $('people');
    box.textContent = '';
    if (!list.length) {
      box.appendChild(el('li', 'empty', 'まだ登録がありません。'));
      return;
    }
    var me = S.me();
    list.forEach(function (p, i) {
      var li = el('li');
      li.appendChild(el('span', 'nm', p.name));
      li.appendChild(el('span', 'dt', p.date));
      var sp = el('div', 'sp');
      if (me) {
        var a = el('a', null, '相性を読む');
        a.href = '../aishou/index.html?a=' + encodeURIComponent(me) + '&b=' + encodeURIComponent(p.date);
        sp.appendChild(a);
      }
      var del = el('button', null, '消す');
      del.type = 'button';
      del.addEventListener('click', function () {
        S.removePerson(i);
        renderPeople(); renderDump();
        say($('pMsg'), p.name + ' を消しました。');
      });
      sp.appendChild(del);
      li.appendChild(sp);
      box.appendChild(li);
    });
  }

  function renderMe() {
    var d = S.me();
    $('me').value = d || '';
    $('meLinks').hidden = !d;
  }

  $('saveMe').addEventListener('click', function () {
    var v = $('me').value;
    if (!v) {
      S.setMe(null);
      renderMe(); renderPeople(); renderDump();
      say($('meMsg'), '生年月日を消しました。');
      return;
    }
    if (!S.validDate(v)) { say($('meMsg'), '日付を確かめてください。', true); return; }
    S.setMe(v);
    renderMe(); renderPeople(); renderDump();
    say($('meMsg'), '覚えました。次からは入力欄に先に入ります。');
  });

  $('addPerson').addEventListener('click', function () {
    try {
      S.addPerson($('pname').value, $('pdate').value);
      $('pname').value = ''; $('pdate').value = '';
      renderPeople(); renderDump();
      say($('pMsg'), '足しました。');
    } catch (e) {
      say($('pMsg'), e.message, true);
    }
  });

  $('clearAll').addEventListener('click', function () {
    if (!window.confirm('生年月日と、よく見る人を全部消します。戻せません。')) return;
    S.clear();
    renderMe(); renderPeople(); renderDump();
    say($('clearMsg'), '全部消しました。');
  });

  $('clearOracle').addEventListener('click', function () {
    try { localStorage.removeItem(ORACLE_KEY); } catch (e) {}
    renderDump();
    say($('clearMsg'), 'オラクルの履歴を消しました。');
  });

  renderMe();
  renderPeople();
  renderDump();
})();
