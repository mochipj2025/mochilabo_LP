/* 星読み — 気になるところ（テーマ別）の描画
 *
 * 3つのテーマを並べず、選んだ1つだけを出す。
 * 一度に見える量を増やさないための作り。
 */
window.HOSHI_APP_THEME = (function () {
  'use strict';

  var T = window.HOSHI_TEXT;
  var TT = window.HOSHI_THEME_TEXT;
  var TH = window.HOSHI_THEME;
  var TX = window.HOSHI_TOYO_TEXT;

  function el(tag, cls, str) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (str != null) n.textContent = str;
    return n;
  }
  function tone() {
    return (window.HOSHI_TONE && window.HOSHI_TONE.value === 'soft') ? 'soft' : 'gag';
  }
  var DATA = { love: 'LOVE', work: 'WORK', money: 'MONEY' };

  var lastWest = null, lastEast = null, current = null;

  function panel(title, step) {
    var s = el('section', 'panel');
    var h = el('h2');
    if (step) h.appendChild(el('span', 'step', step));
    h.appendChild(document.createTextNode(title));
    s.appendChild(h);
    return s;
  }

  /* ---------------- テーマひとつを描く ---------------- */
  function drawTheme(key) {
    current = key;
    var box = document.getElementById('theme-result');
    box.textContent = '';
    if (!lastWest) return;

    var t = tone();
    var d = TH.build(key, lastWest, lastEast);
    var txt = TT[DATA[key]][t][d.lead.sign];
    var sign = T.signs[d.lead.sign];

    /* 主役 */
    var sec = panel(d.label, '1');
    sec.appendChild(el('p', 'lead', TT.INTRO[key][t]));

    var big = el('div', 'big');
    big.appendChild(el('p', 'who', d.lead.def.name + 'から読む'));
    big.appendChild(el('p', 'what', d.leadWhat || d.lead.def.what));
    big.appendChild(el('p', 'sign', sign.name + '　' + window.HOSHI_ASTRO.formatDeg(d.lead.deg)));
    big.appendChild(el('p', 'catch', txt.catch));
    big.appendChild(el('p', 'body', txt.body));
    if (txt.out) big.appendChild(el('p', 'body out', txt.out));
    sec.appendChild(big);
    box.appendChild(sec);

    /* 場面 */
    var sec2 = panel('どの場面に出るか', '2');
    if (d.timeUnknown) {
      sec2.appendChild(el('p', 'lead',
        '生まれた時刻が分からないため、場面の割り出しはできません。時刻が分かると、下の内容がぐっと具体的になります。'));
    } else {
      sec2.appendChild(el('p', 'lead', 'このテーマを受け持つ場面と、そこに入っている星です。'));
      d.houses.forEach(function (h) {
        var card = el('div', 'thbox');
        card.appendChild(el('div', 'thbox-t', h.topic));
        card.appendChild(el('p', 'thbox-ex', 'たとえば、' + h.examples));
        var line = (h.sign != null)
          ? 'この場面は' + T.signs[h.sign].name + 'から始まります。' + T.signs[h.sign].note
          : '';
        if (h.bodies.length) {
          line += 'ここには' + h.bodies.map(function (b) { return b.def.name; }).join('・') +
            'が入っています。この場面のことが、人より前に出やすいところです。';
        } else {
          line += 'ここに入っている星はありません。空いている場面は「関心が薄い」ではなく、' +
            '「決まった型がない」と読みます。';
        }
        card.appendChild(el('p', 'thbox-b', line));
        sec2.appendChild(card);
      });
    }

    /* 支える星 */
    d.supports.forEach(function (b) {
      var det = el('details', 'read');
      var sum = el('summary');
      sum.appendChild(el('span', null, b.def.name + 'から見ると'));
      sum.appendChild(el('span', 'pos', T.signs[b.sign].name +
        (b.house ? '・' + T.houses[b.house - 1].topic : '')));
      det.appendChild(sum);
      var inner = el('div', 'inner');
      inner.appendChild(el('p', null, b.def.intro));
      inner.appendChild(el('p', null,
        'あなたの' + b.def.name + 'は' + T.signs[b.sign].name + '。' +
        T.signs[b.sign].how + 'タイプです。' + T.signs[b.sign].note));
      if (b.house) {
        inner.appendChild(el('p', null,
          'それが出るのは' + T.houses[b.house - 1].topic + 'の場面。たとえば、' + T.houses[b.house - 1].examples));
      }
      det.appendChild(inner);
      sec2.appendChild(det);
    });
    box.appendChild(sec2);

    /* 東洋から */
    var sec3 = panel('東洋から見ると', '3');
    var any = false;
    if (d.palace) {
      any = true;
      var pcard = el('div', 'thbox');
      pcard.appendChild(el('div', 'thbox-t', TX.PALACE_TEXT[d.palace.name] + 'の場所'));
      if (d.palace.stars.length) {
        pcard.appendChild(el('p', 'thbox-b',
          'ここには' + d.palace.stars.join('・') + 'が入っています。'));
        d.palace.stars.forEach(function (st) {
          var s2 = TX.SHUSEI_TEXT[st];
          if (s2) pcard.appendChild(el('p', 'thbox-b', st + '（' + s2.c + '）… ' + s2.b));
        });
      } else {
        pcard.appendChild(el('p', 'thbox-b',
          'ここに主な星は入っていません。向かい側を借りて読む場所なので、' +
          '相手や状況によって表情が変わりやすいところです。'));
      }
      sec3.appendChild(pcard);
    }
    if (d.pillar) {
      any = true;
      var scene = (d.pillar.label === '日柱')
        ? 'あなた自身と、いちばん近くにいる人'
        : '親と仕事';
      var pc = el('div', 'thbox');
      pc.appendChild(el('div', 'thbox-t', scene));
      if (d.pillar.label === '日柱') {
        pc.appendChild(el('p', 'thbox-b',
          'ここは' + d.pillar.kan + '（' + d.pillar.kanElem + '）と' +
          d.pillar.shi + '（' + d.pillar.shiElem + '）の組み合わせ。' +
          '上の' + d.pillar.kan + 'があなた自身、下の' + d.pillar.shi +
          'がいちばん近くにいる相手を表す場所です。四柱推命では、ここを伴侶の座と呼びます。'));
      } else {
        pc.appendChild(el('p', 'thbox-b',
          'ここは' + d.pillar.kan + '（' + d.pillar.kanElem + '）と' +
          d.pillar.shi + '（' + d.pillar.shiElem + '）の組み合わせ。' +
          'この場面で効くのは「' + ((TX.TSUHEN[d.pillar.kanStar] || {}).plain || d.pillar.kanStar) + '」という働きです。'));
      }
      sec3.appendChild(pc);
    }
    if (d.tsuhen.length) {
      any = true;
      var seen = {};
      var tc = el('div', 'thbox');
      tc.appendChild(el('div', 'thbox-t', 'あなたの命式に出ている働き'));
      d.tsuhen.forEach(function (h) {
        if (seen[h.star]) return;
        seen[h.star] = true;
        var info = TX.TSUHEN[h.star];
        tc.appendChild(el('p', 'thbox-b',
          '「' + info.plain + '」が' + h.pillar + 'に出ています。' + info.mean));
      });
      sec3.appendChild(tc);
    } else if (d.key !== 'love') {
      any = true;
      sec3.appendChild(el('p', 'lead',
        'このテーマを担当する働きは、あなたの命式には表に出ていません。' +
        '無い＝苦手ではなく、決まった型がないという意味です。自分で作る余地がある、と読みます。'));
    }
    if (!any) {
      sec3.appendChild(el('p', 'lead',
        '生まれた時刻が分からないため、東洋側はここでは出せません。'));
    }
    box.appendChild(sec3);

    var last = el('section', 'panel');
    last.appendChild(el('p', 'y-closing', TT.CLOSING[t]));
    box.appendChild(last);
  }

  /* ---------------- 入口 ---------------- */
  function render(west, east) {
    lastWest = west;
    lastEast = east;
    var pick = document.getElementById('theme-pick');
    if (!pick.childNodes.length) {
      TH.THEMES.forEach(function (th) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'themebtn';
        b.dataset.theme = th.key;
        b.textContent = th.label;
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(pick.children, function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          drawTheme(th.key);
          document.getElementById('theme-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        pick.appendChild(b);
      });
    }
    if (current) {
      /* 読み口を切り替えたときは、開いていたテーマをそのまま描き直す */
      drawTheme(current);
    } else {
      document.getElementById('theme-result').textContent = '';
    }
  }

  return { render: render };
})();
