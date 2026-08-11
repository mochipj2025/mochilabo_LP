/* 星読み — 2026年の運勢（描画）
 *
 * 12星座別（ソーラーサイン）と、出生図ベースの個別。どちらも同じ関数で描く。
 * 違うのは「ハウスをどこから数えるか」だけなので、文章は共通で使える。
 */
window.HOSHI_APP_Y2026 = (function () {
  'use strict';

  var Y = window.HOSHI_Y2026;
  var YT = window.HOSHI_Y2026_TEXT;
  var T = window.HOSHI_TEXT;
  var SIGN_IMAGES = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  var scriptUrl = document.currentScript && document.currentScript.src;
  var ZODIAC_BASE = scriptUrl
    ? new URL('zodiac/', scriptUrl).href
    : 'assets/zodiac/';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
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
  function lead(sec, text) { sec.appendChild(el('p', 'lead', text)); return sec; }

  /* ---------------- 1. 総論 ---------------- */

  function sectionIntro() {
    var s = panel('2026年はどういう年か', '総論');
    s.appendChild(el('p', 'y-body', YT.INTRO));
    var box = el('div', 'y-facts');
    Y.INGRESS.forEach(function (g) {
      var f = el('div', 'y-fact');
      f.appendChild(el('div', 'y-date', g.month + '月' + g.day + '日'));
      f.appendChild(el('div', 'y-what', g.jp + '　' + T.signs[g.from].name + ' → ' + T.signs[g.to].name));
      f.appendChild(el('div', 'y-cycle', g.cycle));
      box.appendChild(f);
    });
    s.appendChild(box);
    return s;
  }

  /* ---------------- 2. 星座別のまとめ ---------------- */

  function sectionSummary(sunSign, isNatal) {
    var p = window.HOSHI_TONE && window.HOSHI_TONE.pack();
    var sp = p && p.SIGN_SUMMARY ? p.SIGN_SUMMARY[sunSign] : null;
    var t = sp || YT.SIGN_SUMMARY[sunSign];
    var s = panel(T.signs[sunSign].name + 'の2026年', '1');
    if (isNatal) {
      lead(s, 'まず、太陽星座だけで読んだざっくり版です。雑誌やテレビの星占いと同じ数え方をしています。');
    }
    var big = el('div', 'big');
    var character = el('div', 'quick-character');
    var characterImage = el('img');
    characterImage.src = ZODIAC_BASE + SIGN_IMAGES[sunSign] + '.png';
    characterImage.alt = T.signs[sunSign].name + 'のキャラクター';
    character.appendChild(characterImage);
    big.appendChild(character);
    big.appendChild(el('p', 'who', T.signs[sunSign].name));
    big.appendChild(el('p', 'catch', t.catch));
    big.appendChild(el('p', 'body', t.body));
    if (t.out) big.appendChild(el('p', 'body out', t.out));
    s.appendChild(big);
    if (isNatal) {
      s.appendChild(el('p', 'y-warn',
        'ここに出てくる「◯◯の場所」は、太陽星座からざっくり数えたものです。' +
        '次の節から先は、あなたの生まれた時刻と場所から出した本当の場面で読むので、' +
        '当たる場所が違って見えることがあります。食い違ったときは、下のほうが正確です。'));
    }
    return s;
  }

  /* ---------------- 3. 4つの節目 ---------------- */

  function sectionChapters(profile) {
    var s = panel('年を区切る4つの節目', '2');
    lead(s, YT.HOW_TO_READ + '　' + profile.refLabel + '。');

    profile.ingress.forEach(function (item) {
      var g = item.ev, h = item.house;
      var intro = YT.INGRESS_INTRO[g.jp];
      var d = el('details', 'read');
      if (g.jp === '土星' || g.jp === '木星') d.open = true;

      var sum = el('summary');
      sum.appendChild(el('span', null, intro.title));
      sum.appendChild(el('span', 'pos', 'あなたの「' + T.houses[h - 1].topic + '」の場面'));
      d.appendChild(sum);

      var inner = el('div', 'inner');
      inner.appendChild(el('p', 'y-lead', intro.lead + '　' + g.span + '。'));
      inner.appendChild(el('p', null, intro.body));

      var dl = el('dl', 'three');
      dl.appendChild(el('dt', null, 'どこで'));
      dl.appendChild(el('dd', null, T.houses[h - 1].topic + 'の場面。たとえば、' + T.houses[h - 1].examples));
      inner.appendChild(dl);

      var p = el('p', 'y-you', YT.BY_HOUSE[g.jp][h - 1]);
      inner.appendChild(p);
      d.appendChild(inner);
      s.appendChild(d);
    });

    /* 土星と海王星の合 */
    profile.conj.forEach(function (item) {
      var c = YT.CONJ_TEXT;
      var box = el('div', 'y-highlight');
      box.appendChild(el('div', 'y-hl-title', c.title));
      box.appendChild(el('p', null, c.body));
      box.appendChild(el('p', 'y-you',
        'あなたの場合、これは「' + T.houses[item.house - 1].topic + '」の場面で起きます。' +
        'たとえば、' + T.houses[item.house - 1].examples +
        'この年、いちばん注目しておく場所です。'));
      s.appendChild(box);
    });
    return s;
  }

  /* ---------------- 4. 食 ---------------- */

  function sectionEclipse(profile) {
    var s = panel('4回の食', '3');
    lead(s, YT.ECLIPSE_NOTE);
    var ul = el('ul', 'asp');
    profile.eclipse.forEach(function (item) {
      var e = item.ev;
      var li = el('li');
      li.appendChild(el('span', 'tag ' + (e.kind === '日食' ? 'strong' : 'hard'), e.kind + '・' + e.form));
      li.appendChild(el('span', 'pair', e.month + '月' + e.day + '日　' + T.signs[e.sign].name));
      li.appendChild(el('span', 'orb', 'あなたの「' + YT.ECLIPSE_HOUSE[item.house - 1] + '」の場面'));
      li.appendChild(el('span', 'mean', YT.ECLIPSE_KIND[e.kind]));
      if (item.hits && item.hits.length) {
        li.appendChild(el('span', 'mean y-hit',
          'あなたが生まれたときの' + item.hits.map(function (x) { return x.name; }).join('・') +
          'とほぼ同じ場所で起きます。4回のなかで、これがいちばん体感が出やすいはずです。'));
      }
      ul.appendChild(li);
    });
    s.appendChild(ul);
    return s;
  }

  /* ---------------- 5. 逆行 ---------------- */

  function sectionRetro() {
    var s = panel('逆行の期間', '4');
    Y.RETRO.forEach(function (r) {
      if (!YT.RETRO_TEXT[r.jp]) return;
      var d = el('details', 'read');
      if (r.jp === '水星' || r.jp === '金星') d.open = true;
      var sum = el('summary');
      sum.appendChild(el('span', null, r.jp + 'の逆行'));
      sum.appendChild(el('span', 'pos', r.spans.map(function (x) { return x[0] + '〜' + x[1]; }).join('、')));
      d.appendChild(sum);
      var inner = el('div', 'inner');
      inner.appendChild(el('p', null, YT.RETRO_TEXT[r.jp]));
      d.appendChild(inner);
      s.appendChild(d);
    });
    return s;
  }

  /* ---------------- 6. 個別のトランジット ---------------- */

  function sectionTransits(list) {
    var s = panel('あなたが生まれたときの星に、今年の星が当たる時期', '5');
    if (!list.length) {
      lead(s, '2026年のあいだ、外側の星があなたの生まれたときの星とぴったり重なる角度はありませんでした。' +
        '大きな揺れの少ない年、という読み方をします。');
      return s;
    }
    lead(s, 'ゆっくり動く5つの星（木星・土星・天王星・海王星・冥王星）が、' +
      'あなたが生まれたときの星と重なる時期です。上にあるものほど、よく効きます。' +
      '日付はいちばん近づく日なので、前後1か月ほどの幅で見てください。' +
      '冥王星のようにほとんど動かない星は、期間で出ます。');
    var ul = el('ul', 'asp');
    list.slice(0, 14).forEach(function (a) {
      var li = el('li');
      li.appendChild(el('span', 'tag ' + a.aspect.tone, a.aspect.plain));
      li.appendChild(el('span', 'pair', '今年の' + a.mover + '　と　生まれたときの' + a.target));
      li.appendChild(el('span', 'orb', a.date));
      ul.appendChild(li);
    });
    s.appendChild(ul);
    if (list.length > 14) {
      s.appendChild(el('p', 'chartnote', 'ほかに' + (list.length - 14) + '件ありますが、効きが弱いので省いています。'));
    }
    return s;
  }

  /* ---------------- 7. 東洋の流年 ---------------- */

  function sectionToyo(tp) {
    var s = panel('東洋から見た2026年', '6');
    s.appendChild(el('p', 'y-body', YT.TOYO_INTRO));

    var ts = YT.TOYO_TSUHEN[tp.tsuhen];
    var big = el('div', 'big');
    big.appendChild(el('p', 'who', '2026年は、あなたにとってどういう年か'));
    big.appendChild(el('p', 'what',
      '生まれた日が表すあなた（' + tp.dayKan + '）から見て、今年の火がどう働くか'));
    big.appendChild(el('p', 'sign', ts.plain));
    big.appendChild(el('p', 'body', ts.body));
    s.appendChild(big);

    if (tp.relations.length) {
      var d = el('details', 'read');
      d.open = true;
      var sum = el('summary');
      sum.appendChild(el('span', null, '2026年は「馬」の年。あなたの4つの柱との相性'));
      sum.appendChild(el('span', 'pos', tp.relations.map(function (r) { return r.kind; }).join('・')));
      d.appendChild(sum);
      var inner = el('div', 'inner');
      tp.relations.forEach(function (r) {
        inner.appendChild(el('p', null,
          r.pillarPlain + 'の「' + r.animal + '」と重なります。' +
          (YT.TOYO_REL[r.kind] || r.mean + '。')));
      });
      d.appendChild(inner);
      s.appendChild(d);
    }

    if (tp.isKubo) {
      var w = el('p', 'y-warn', YT.TOYO_KUBO);
      s.appendChild(w);
    }

    var pal = YT.TOYO_PALACE[tp.palace.name];
    var big2 = el('div', 'big');
    big2.appendChild(el('p', 'who', '九星で見た2026年'));
    big2.appendChild(el('p', 'what',
      'あなたの星（' + tp.honmeiName + '）が、今年どこに回るか'));
    big2.appendChild(el('p', 'sign', pal.plain));
    if (window.HOSHI_ICONS) {
      var c = window.HOSHI_ICONS.compass(tp.palace.dir);
      if (c) big2.appendChild(c);
    }
    big2.appendChild(el('p', 'body', pal.body));
    s.appendChild(big2);

    s.appendChild(el('p', 'chartnote',
      '東洋の年は立春（2月4日）から始まります。1月生まれ・2月頭生まれの方は、' +
      'いつも使っている年と一つずれることがあります。'));
    return s;
  }

  /* ---------------- 8. 締め ---------------- */

  function sectionClosing() {
    var s = el('section', 'panel');
    s.appendChild(el('p', 'y-closing', YT.CLOSING));
    return s;
  }

  /* ---------------- 組み立て ---------------- */

  /* opts: { sunSign } または { west, east } */
  function render(container, opts) {
    container.textContent = '';
    var profile, sunSign;

    if (opts.west) {
      profile = Y.natalProfile(opts.west);
      sunSign = opts.west.bodies[0].sign;
    } else {
      profile = Y.solarProfile(opts.sunSign);
      sunSign = opts.sunSign;
    }

    container.appendChild(sectionIntro());
    container.appendChild(sectionSummary(sunSign, profile.mode === 'natal'));
    container.appendChild(sectionChapters(profile));

    /* ここから先は、開きたい人だけ。中身の作り方は変えず、たたむだけ。 */
    var more = panel('もっと知りたい人だけ', '4');
    lead(more, 'ここから先は読まなくても大丈夫です。気になったものだけ開いてください。');
    function fold(title, sec, open) {
      var d = el('details', 'fold');
      if (open) d.open = true;
      var sum = el('summary');
      sum.textContent = title;
      d.appendChild(sum);
      var inner = el('div', 'fold-in');
      /* section をそのまま入れると二重枠になるので、中身だけ移す */
      while (sec.childNodes.length) {
        var n = sec.firstChild;
        if (n.tagName === 'H2') { sec.removeChild(n); continue; }
        inner.appendChild(n);
      }
      d.appendChild(inner);
      more.appendChild(d);
    }

    if (opts.east) fold('東洋から見た2026年', sectionToyo(Y.toyoProfile(opts.east)));
    if (opts.west) fold('生まれたときの星に、今年の星が当たる時期', sectionTransits(Y.transits(opts.west)));
    fold('4回の食', sectionEclipse(profile));
    fold('逆行の期間', sectionRetro());
    if (!opts.east) {
      var d2 = el('details', 'fold');
      var sum2 = el('summary');
      sum2.textContent = '東洋から見た2026年';
      d2.appendChild(sum2);
      var in2 = el('div', 'fold-in');
      in2.appendChild(el('p', 'y-body', YT.TOYO_INTRO));
      in2.appendChild(el('p', 'chartnote',
        'この年があなたにとって何にあたるかは、生年月日を入れないと決まりません。' +
        '入れると、生まれた日から見た今年の働きと、あなたの星が今年どこに回るかが出ます。'));
      d2.appendChild(in2);
      more.appendChild(d2);
    }
    container.appendChild(more);

    if (profile.mode === 'solar') {
      var note = el('section', 'panel');
      note.appendChild(el('p', 'y-closing',
        'ここまでは、太陽星座を1室として数えた「12星座別」の読み方です。' +
        '生まれた時刻と場所まで入れると、ハウスが実際の位置で決まるので、当たる場所が変わることがあります。' +
        'そちらのほうが精度は上がります。'));
      container.appendChild(note);
    }

    container.appendChild(sectionClosing());
  }

  return { render: render };
})();
