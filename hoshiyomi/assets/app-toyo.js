/* 星読み — 東洋側と対照面の描画 */
window.HOSHI_APP_TOYO = (function () {
  'use strict';

  var K = window.HOSHI_KOYOMI;
  var TY = window.HOSHI_TOYO;
  var TX = window.HOSHI_TOYO_TEXT;
  var WT = window.HOSHI_TEXT;

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var GOGYO_FILL = { '木': '#7d8f5e', '火': '#d2705a', '土': '#b0894f', '金': '#8d8b93', '水': '#6f7fa8' };

  /* 命盤のマスは狭いので、正式名ではなく日常語のほうを出す。正式名は title 属性に残す。 */
  var PALACE_SHORT = {
    '命宮': '自分', '兄弟宮': 'きょうだい', '夫妻宮': '結婚相手', '子女宮': '子ども',
    '財帛宮': 'お金', '疾厄宮': '体', '遷移宮': '外での顔', '交友宮': '仲間',
    '官禄宮': '仕事', '田宅宮': '家', '福徳宮': '楽しみ', '父母宮': '親'
  };

  /* 四柱それぞれが受け持つ場面。西洋のハウスにあたるもの。 */
  var PILLAR_SCENE = {
    '年柱': { topic: '育った家と、若い頃',
      where: '家系や育った環境、だいたい二十代までの土台',
      examples: '実家の雰囲気。子どものころの立ち位置。学生時代の過ごし方。' },
    '月柱': { topic: '親と仕事',
      where: '親との関わりと、社会に出てからの働き方。だいたい中年期',
      examples: '親からの影響。職場での役回り。三十代から五十代くらいの過ごし方。' },
    '日柱': { topic: 'あなた自身と、いちばん近くにいる人',
      where: 'あなた本人と、いちばん近くにいる相手',
      examples: '素のあなた。結婚相手やパートナー。毎日いっしょにいる人との関係。' },
    '時柱': { topic: '子どもと、年を重ねてから',
      where: '子どもや、生み出すもの。年を重ねてからの過ごし方',
      examples: '子どものこと。自分が作り出すもの。定年後や老後の過ごし方。' }
  };

  /* 読み口に応じた差し替えデータ。やさしいなら null。 */
  function override() {
    return (window.HOSHI_TONE && window.HOSHI_TONE.pack()) || null;
  }

  function bigCard(who, what, title, catchLine, body, extra, out) {
    var box = el('div', 'big');
    box.appendChild(el('p', 'who', who));
    if (what) box.appendChild(el('p', 'what', what));
    box.appendChild(el('p', 'sign', title));
    if (catchLine) box.appendChild(el('p', 'catch', catchLine));
    box.appendChild(el('p', 'body', body));
    if (out) box.appendChild(el('p', 'body out', out));
    if (extra) {
      var p = el('p', 'body', extra);
      p.style.marginTop = '10px';
      p.style.color = 'var(--warm)';
      box.appendChild(p);
    }
    return box;
  }

  function bar(label, n, total, color, iconName) {
    var row = el('div', 'bar');
    var head = el('div', 'bar-head');
    if (iconName && window.HOSHI_ICONS) {
      var ic = window.HOSHI_ICONS.gogyo(iconName, 18);
      if (ic) head.appendChild(ic);
    }
    head.appendChild(el('span', null, label));
    row.appendChild(head);
    var track = el('div', 'track');
    var fill = el('div', 'fill');
    fill.style.width = (total ? Math.round(n / total * 100) : 0) + '%';
    fill.style.background = color;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('div', 'n', String(n)));
    return row;
  }

  function hm(h) {
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    if (mm === 60) { mm = 0; hh += 1; }
    return hh + '時' + String(mm).padStart(2, '0') + '分';
  }
  function jstStr(d) {
    var t = new Date(d.getTime() + 9 * 3600000);
    return t.getUTCFullYear() + '年' + (t.getUTCMonth() + 1) + '月' + t.getUTCDate() + '日 ' +
      t.getUTCHours() + '時' + String(t.getUTCMinutes()).padStart(2, '0') + '分';
  }

  /* ================= 1. 日主 ================= */

  function renderNisshu(s) {
    var box = $('nisshu');
    box.textContent = '';
    var n = TX.NISSHU[s.dayKanName];
    var pack = override();
    var sp = pack && pack.NISSHU[s.dayKanName];
    box.appendChild(bigCard(
      '生まれた日が表すあなた',
      '四柱推命では、生まれた日の記号がその人本人を表します。ほかは全部、これとの関係で決まります',
      n.image + '（' + s.dayKanName + '・' + s.dayKanElem + '）',
      sp ? sp.catch : n.catch,
      sp ? sp.body : n.body,
      null,
      sp ? sp.out : null
    ));
  }

  /* ================= 2. 命式 ================= */

  function renderMeishiki(s) {
    var tb = $('meishiki');
    tb.textContent = '';
    var live = s.pillars.filter(function (p) { return !p.empty; });

    function row(head, get, cls) {
      var tr = tb.insertRow();
      var th = document.createElement('th');
      th.textContent = head;
      tr.appendChild(th);
      s.pillars.forEach(function (p) {
        var td = tr.insertCell();
        if (cls) td.className = cls;
        td.textContent = p.empty ? '—' : get(p);
      });
    }

    var head = tb.insertRow();
    head.appendChild(document.createElement('th'));
    s.pillars.forEach(function (p) {
      var th = document.createElement('th');
      th.textContent = p.label;
      head.appendChild(th);
    });

    row('干支', function (p) { return p.ganshi; });
    row('天干', function (p) { return p.kan + '（' + p.kanElem + '）'; });
    row('役どころ', function (p) {
      var t = TX.TSUHEN[p.kanStar];
      return t ? t.plain + '（' + p.kanStar + '）' : p.kanStar;
    });
    row('地支', function (p) { return p.shi + '（' + p.shiElem + '）'; });
    row('隠れている干', function (p) { return p.zokan.join('・'); });
    row('その役どころ', function (p) {
      var t = TX.TSUHEN[p.shiStar];
      return t ? t.plain : p.shiStar;
    });
    /* 十二運は「死」「絶」「墓」という字が並ぶので、名前ではなく意味のほうを出す */
    row('勢いの段階', function (p) { return TX.UNSEI_PLAIN[p.un].plain; });

    var note = s.setsu.name + '（' + jstStr(s.setsu.start) + '）から月が変わるので、' +
      'そこを境に数えています。';
    note += ' また、' + s.kuboAnimal.join('年と') + '年は、あなたにとって少し手薄になりやすい年です。' +
      '悪いことが起きるという意味ではなく、大きく広げるより守るほうが向いた年、という程度に受け取ってください。';
    if (s.timeUnknown) note += ' 生まれた時刻が分からないため、いちばん右の列は出していません。';
    $('meishikinote').textContent = note;

    /* 柱ごとの読み */
    var reads = $('meishiki-read');
    reads.textContent = '';
    s.pillars.forEach(function (p) {
      var scene = PILLAR_SCENE[p.label];
      var d = el('details', 'read');
      if (p.label === '日柱') d.open = true;

      var sum = el('summary');
      sum.appendChild(el('span', null, scene.topic));
      sum.appendChild(el('span', 'pos', p.empty ? '出せません'
        : ((TX.TSUHEN[p.kanStar] || {}).plain || p.kanStar)));
      d.appendChild(sum);

      var inner = el('div', 'inner');
      if (p.empty) {
        inner.appendChild(el('p', null,
          '生まれた時刻が分からないため、この柱は出せません。母子手帳などで時刻が分かったら、もう一度試してみてください。'));
      } else {
        var dl = el('dl', 'three');
        function pair(k2, v) { dl.appendChild(el('dt', null, k2)); dl.appendChild(el('dd', null, v)); }
        pair('どこで', scene.topic);
        pair('何が', p.kan + '（' + p.kanElem + '）と ' + p.shi + '（' + p.shiElem + '）');
        pair('どんな役', (TX.TSUHEN[p.kanStar] || {}).plain || p.kanStar);
        inner.appendChild(dl);

        if (p.label === '日柱') {
          inner.appendChild(el('p', null,
            'ここが基準になる場所です。' + scene.where + 'を表します。'));
          inner.appendChild(el('p', null,
            'たとえば、' + scene.examples));
        } else {
          var t = TX.TSUHEN[p.kanStar];
          inner.appendChild(el('p', null,
            'ここは' + scene.where + 'を受け持つ場所です。たとえば、' + scene.examples));
          inner.appendChild(el('p', null,
            'この場面であなたに効くのは「' + (t ? t.plain : p.kanStar) + '」という働きです。' +
            (t ? t.mean : '')));
        }
        inner.appendChild(el('p', null,
          'この場面での勢いは「' + TX.UNSEI_PLAIN[p.un].plain + '」。' + TX.UNSEI_PLAIN[p.un].mean));
        if (window.HOSHI_ICONS) {
          var chart = window.HOSHI_ICONS.unseiChart(p.un);
          if (chart) {
            var cbox = el('div', 'unsei-box');
            cbox.appendChild(chart);
            cbox.appendChild(el('p', 'chartnote',
              '勢いは十二段階で上がって下がり、また上がります。いまがどのあたりかを示しています。'));
            inner.appendChild(cbox);
          }
        }
      }
      d.appendChild(inner);
      reads.appendChild(d);
    });
  }

  /* ================= 3. 五行 ================= */

  function renderGogyo(s) {
    var box = $('gogyo');
    box.textContent = '';
    var bars = el('div', 'bars');
    TY.GOGYO.forEach(function (g) {
      bars.appendChild(bar(g + '（' + TX.GOGYO_TEXT[g].mean + '）', s.count[g], s.total, GOGYO_FILL[g], g));
    });
    box.appendChild(bars);

    var keys = TY.GOGYO.slice();
    var maxG = keys.reduce(function (a, b) { return s.count[a] >= s.count[b] ? a : b; });
    box.appendChild(el('p', 'balnote', 'いちばん多いのは「' + maxG + '」。' + TX.GOGYO_TEXT[maxG].high));

    var zero = keys.filter(function (g) { return s.count[g] === 0; });
    if (zero.length) {
      box.appendChild(el('p', 'balnote',
        '4つの柱に出ていないのは' + zero.join('・') + '。無い＝欠けている、ではありません。' +
        '表に出ていないだけ、と読みます。'));
      zero.forEach(function (g) {
        box.appendChild(el('p', 'balnote', '　' + g + '… ' + TX.GOGYO_TEXT[g].low));
      });
    }
    box.appendChild(el('p', 'chartnote',
      '数え方は、4つの柱の上下から1つずつ、合計' + s.total + '個。隠れている干は数に入れていません。'));
  }

  /* ================= 4. 宿曜 ================= */

  function renderShukuyo(sk) {
    var box = $('shukuyo');
    box.textContent = '';
    var t = TX.SHUKU_TEXT[sk.name];
    var pack = override();
    var sp = pack && pack.SHUKU[sk.name];
    box.appendChild(bigCard(
      '生まれた日、月がいた場所', '月の通り道を27に分けたうちのひとつ。西洋の「月星座」と、もとは同じものです',
      sk.name + '宿',
      sp ? sp.c : t.c,
      sp ? sp.b : t.b,
      '昔の暦（旧暦）でいうと' + sk.lunar.year + '年' + (sk.lunar.leap ? '閏' : '') +
      sk.lunar.month + '月' + sk.lunar.day + '日生まれ。そこから割り出しています。',
      sp ? sp.o : null
    ));
  }

  /* ================= 5. 九星気学 ================= */

  function renderKyusei(ky) {
    var box = $('kyusei');
    box.textContent = '';
    var h = TX.KYUSEI_TEXT[ky.honmei], g = TX.KYUSEI_TEXT[ky.getsumei];
    box.appendChild(bigCard('生まれた年の星', '全体の性質を表します。年の区切りは1月1日ではなく立春です',
      ky.honmeiName, h.c, h.b,
      ky.risshunYear + '年生まれとして数えています。'));
    box.appendChild(bigCard('生まれた月の星', '幼い頃や、人に見せない内側に出やすい面です',
      ky.getsumeiName, g.c, g.b,
      ky.setsu.name + '（' + jstStr(ky.setsu.start) + '）から始まる月として数えています。'));
  }

  /* ================= 6. 紫微斗数 ================= */

  /* 命盤の並び。地支の位置は固定で、外周を12マスで回る。 */
  var BOARD = [
    [5, 6, 7, 8],
    [4, null, null, 9],
    [3, null, null, 10],
    [2, 1, 0, 11]
  ];

  function renderShibi(sb) {
    var box = $('shibi');
    box.textContent = '';

    if (sb.timeUnknown) {
      box.appendChild(bigCard('紫微斗数', null, '出せません', null,
        'この占いの中心になる場所は、昔の暦の月と、生まれた時刻から決めます。' +
        '時刻が分からないと、12ある場所のどれになるか絞れません。' +
        '母子手帳などで時刻が分かったら、もう一度試してみてください。'));
      return;
    }

    var t = TX.SHUSEI_TEXT[sb.meiStars[0]];
    box.appendChild(bigCard('あなたの中心にある星', '紫微斗数でいう命宮。生まれ持った芯を表します',
      sb.meiStars.length ? sb.meiStars.join('・') : '星なし',
      t ? t.c : '主な星が入っていない場所',
      t ? t.b : 'ここには主な星が入っていません。「空宮」といって、向かい側の場所の星を借りて読みます。' +
        '周りに影響されやすく、状況によって表情が変わるタイプです。悪い意味ではありません。',
      TX.KYOKU_TEXT[sb.kyoku] + '　後から強く出てくる面は' +
      sb.palaces.filter(function (p) { return p.shiIdx === sb.shinIdx; })[0].name + 'のあたりに出ます。'
    ));

    /* 命盤 */
    var board = el('div', 'meiban');
    BOARD.forEach(function (r, ri) {
      r.forEach(function (b, ci) {
        if (b === null) {
          if (ri === 1 && ci === 1) {
            var c = el('div', 'meiban-center');
            c.style.gridArea = '2 / 2 / 4 / 4';
            c.appendChild(el('div', 'mc-title', '命盤'));
            c.appendChild(el('div', 'mc-line', sb.kyokuName));
            c.appendChild(el('div', 'mc-line',
              '中心は「' + (PALACE_SHORT[sb.palaces[0].name] || sb.palaces[0].name) + '」の枠'));
            c.appendChild(el('div', 'mc-line', '生まれた時間帯 ' + sb.hourShi + '（' +
              K.SHI_ANIMAL[K.SHI.indexOf(sb.hourShi)] + '）'));
            board.appendChild(c);
          }
          return;
        }
        var pal = sb.palaces.filter(function (p) { return p.shiIdx === b; })[0];
        var cell = el('div', 'meiban-cell' + (pal.name === '命宮' ? ' is-mei' : '') +
          (pal.shiIdx === sb.shinIdx ? ' is-shin' : ''));
        cell.style.gridArea = (ri + 1) + ' / ' + (ci + 1);
        cell.title = pal.name + '（' + TX.PALACE_TEXT[pal.name] + '）';
        cell.appendChild(el('div', 'mb-shi', K.SHI[b]));
        cell.appendChild(el('div', 'mb-name', PALACE_SHORT[pal.name] || pal.name));
        var st = el('div', 'mb-stars');
        if (pal.stars.length) {
          pal.stars.forEach(function (s) { st.appendChild(el('span', null, s)); });
        } else {
          st.appendChild(el('span', 'mb-empty', '星なし'));
        }
        cell.appendChild(st);
        board.appendChild(cell);
      });
    });
    box.appendChild(board);
    box.appendChild(el('p', 'chartnote',
      '濃い枠があなたの中心。点線は、後から強く出てくる面です。' +
      '星のない場所は、向かい側を借りて読みます。'));

    /* 宮ごとの読み */
    var list = el('div');
    sb.palaces.forEach(function (p) {
      if (!p.stars.length) return;
      var d = el('details', 'read');
      if (p.name === '命宮') d.open = true;
      var sum = el('summary');
      sum.appendChild(el('span', null, TX.PALACE_TEXT[p.name]));
      sum.appendChild(el('span', 'pos', p.stars.join('・')));
      d.appendChild(sum);
      var inner = el('div', 'inner');
      inner.appendChild(el('p', null, 'ここは「' + TX.PALACE_TEXT[p.name] + '」を受け持つ場所です。'));
      p.stars.forEach(function (s) {
        var st = TX.SHUSEI_TEXT[s];
        if (st) inner.appendChild(el('p', null, s + '（' + st.c + '）… ' + st.b));
      });
      d.appendChild(inner);
      list.appendChild(d);
    });
    box.appendChild(list);
  }

  /* ================= 7. 使った暦 ================= */

  function renderKoyomi(k) {
    var tb = $('koyomitable');
    tb.textContent = '';
    function row(a, b) {
      var tr = tb.insertRow();
      var th = document.createElement('th');
      th.textContent = a;
      tr.appendChild(th);
      var td = tr.insertCell();
      td.textContent = b;
      td.style.whiteSpace = 'normal';
    }
    row('この占いでの「年」', k.risshunYear + '年（' + K.ganshiName(k.pillars.year) + '）。' +
      '1月1日ではなく立春で切り替わります');
    row('この占いでの「月」', k.setsu.name + 'から始まる月（' + K.SHI_ANIMAL[k.setsu.shi] + 'の月）');
    row('その月が始まった瞬間', jstStr(k.setsu.start) + '（日本時間）');
    row('昔の暦（旧暦）では',
      k.lunar.year + '年' + (k.lunar.leap ? '閏' : '') + k.lunar.month + '月' + k.lunar.day + '日');
    if (!k.timeUnknown) {
      row('時計の時刻', hm(k.clockHour));
      row('太陽で見た時刻', hm(k.solarHour) + '。その土地で太陽が真南に来た瞬間を12時としたときの時刻です');
      row('どちらで時間帯を決めたか', hm(k.usedHour) + ' のほう');
    } else {
      row('時刻', '分からないため、いちばん右の柱と紫微斗数は出していません');
    }
    row('生まれた日の記号', K.ganshiName(k.pillars.day) + '（日付の変わり目は0時）');

    var old = $('koyomi-warn');
    if (old) old.parentNode.removeChild(old);
    if (Math.abs(k.tzOffset - 9) > 0.01) {
      var warn = el('p', 'balnote',
        '日本の外で生まれた方へ。このページの旧暦は、日本の暦の決め方（日本時間の0時で日を区切る）で組んでいます。' +
        '朔や中気が現地の深夜をまたぐ日に生まれた場合、現地の旧暦とは1日ずれることがあります。' +
        'ずれると、宿曜の本命宿が隣の宿に、紫微斗数の紫微星の位置が変わることがあります。' +
        '四柱推命と九星気学は節気の「瞬間」で判定しているので、この影響を受けません。');
      warn.id = 'koyomi-warn';
      warn.style.color = 'var(--warm)';
      tb.parentNode.parentNode.appendChild(warn);
    }
  }

  /* ================= 対照 ================= */

  function renderCompare(west, east) {
    $('compare-intro').textContent = TX.COMPARE_INTRO;

    var k = east.koyomi, s = east.shichu, sb = east.shibi;
    var sun = west.bodies[0], moon = west.bodies[1];
    var sunSign = WT.signs[sun.sign].name, moonSign = WT.signs[moon.sign].name;

    var vals = {
      '太陽星座': sunSign,
      '日主（日柱の天干）': s.dayKanName + '（' + s.dayKanElem + '）',
      '月星座': moonSign,
      '本命宿（宿曜）': east.shukuyo.name + '宿',
      'エレメント（火地風水）': topElement(west),
      '五行（木火土金水）': topGogyo(s),
      'アセンダント': west.houses ? WT.signs[Math.floor(west.houses.asc / 30)].name : '時刻不明で出せません',
      '命宮（紫微斗数）': sb.timeUnknown ? '時刻不明で出せません' : sb.mei + '宮',
      '世代の天体（天王星・海王星・冥王星）':
        WT.signs[west.bodies[7].sign].name + '・' + WT.signs[west.bodies[8].sign].name + '・' + WT.signs[west.bodies[9].sign].name,
      '年柱・本命星': K.ganshiName(k.pillars.year) + '／' + east.kyusei.honmeiName
    };

    var box = $('compare-rows');
    box.textContent = '';
    TX.COMPARE_ROWS.forEach(function (r) {
      var card = el('div', 'cmp');
      var grid = el('div', 'cmp-grid');
      var w = el('div', 'cmp-side');
      w.appendChild(el('div', 'cmp-tag', '西洋'));
      w.appendChild(el('div', 'cmp-label', r.west));
      w.appendChild(el('div', 'cmp-val', vals[r.west] || '—'));
      var e = el('div', 'cmp-side');
      e.appendChild(el('div', 'cmp-tag', '東洋'));
      e.appendChild(el('div', 'cmp-label', r.east));
      e.appendChild(el('div', 'cmp-val', vals[r.east] || '—'));
      grid.appendChild(w);
      grid.appendChild(e);
      card.appendChild(grid);
      card.appendChild(el('p', 'cmp-note', r.note));
      box.appendChild(card);
    });

    /* 五行 と エレメント */
    var eb = $('compare-elem');
    eb.textContent = '';
    var left = el('div', 'cmp-half');
    left.appendChild(el('h3', 'cmp-h', '東洋：木火土金水（4つの柱の' + s.total + '個）'));
    var lb = el('div', 'bars');
    TY.GOGYO.forEach(function (g) { lb.appendChild(bar(g, s.count[g], s.total, GOGYO_FILL[g], g)); });
    left.appendChild(lb);

    var right = el('div', 'cmp-half');
    right.appendChild(el('h3', 'cmp-h', '西洋：エレメント（10天体）'));
    var rb = el('div', 'bars');
    var EF = { '火': '#d2705a', '地': '#7d8f5e', '風': '#6f8bb5', '水': '#6f7fa8' };
    Object.keys(west.balance.elements).forEach(function (g) {
      rb.appendChild(bar(g, west.balance.elements[g], 10, EF[g]));
    });
    right.appendChild(rb);

    var wrap2 = el('div', 'cmp-two');
    wrap2.appendChild(left);
    wrap2.appendChild(right);
    eb.appendChild(wrap2);
    eb.appendChild(el('p', 'cmp-note',
      '東洋の「木」と「金」に当たるものが西洋にはなく、西洋の「風」に当たるものが東洋にはありません。' +
      '数が似ていても意味が重なるとは限らないので、片方ずつ読むのが安全です。'));

    /* 月 */
    var mb = $('compare-moon');
    mb.textContent = '';
    var card = el('div', 'cmp');
    var grid = el('div', 'cmp-grid');
    var w2 = el('div', 'cmp-side');
    w2.appendChild(el('div', 'cmp-tag', '西洋'));
    w2.appendChild(el('div', 'cmp-label', '月星座（黄道を12分割）'));
    w2.appendChild(el('div', 'cmp-val', moonSign + ' ' + window.HOSHI_ASTRO.formatDeg(moon.degInSign)));
    var e2 = el('div', 'cmp-side');
    e2.appendChild(el('div', 'cmp-tag', '東洋'));
    e2.appendChild(el('div', 'cmp-label', '本命宿（月の通り道を27分割）'));
    e2.appendChild(el('div', 'cmp-val', east.shukuyo.name + '宿'));
    grid.appendChild(w2);
    grid.appendChild(e2);
    card.appendChild(grid);
    card.appendChild(el('p', 'cmp-note',
      '西洋は実際の月の位置をその場で計算し、宿曜は旧暦の月日から表を引きます。' +
      'もとにしているのはどちらも月ですが、経路が違うので、ぴったり対応する保証はありません。' +
      'そのぶん、この2つが似た方向を指しているときは、そこそこ確かな手がかりだと思っていいはずです。'));
    mb.appendChild(card);

    var pack = override();
    var wc = pack && pack.core && pack.core.moon
      ? pack.core.moon[moon.sign] : WT.core.moon[moon.sign];
    var sc = pack && pack.SHUKU && pack.SHUKU[east.shukuyo.name]
      ? pack.SHUKU[east.shukuyo.name] : TX.SHUKU_TEXT[east.shukuyo.name];
    var two = el('div', 'cmp-two');
    var a = el('div', 'cmp-half');
    a.appendChild(el('h3', 'cmp-h', '西洋の月がいう「落ち着き方」'));
    a.appendChild(el('p', 'cmp-note', wc.catch + '。' + wc.body));
    var b = el('div', 'cmp-half');
    b.appendChild(el('h3', 'cmp-h', '宿曜の本命宿がいう「素の性質」'));
    b.appendChild(el('p', 'cmp-note', sc.c + '。' + sc.b));
    two.appendChild(a);
    two.appendChild(b);
    mb.appendChild(two);
  }

  function topElement(west) {
    var e = west.balance.elements;
    var k2 = Object.keys(e).reduce(function (a, b) { return e[a] >= e[b] ? a : b; });
    return k2 + 'が最多（' + e[k2] + '／10）';
  }
  function topGogyo(s) {
    var k2 = TY.GOGYO.reduce(function (a, b) { return s.count[a] >= s.count[b] ? a : b; });
    return k2 + 'が最多（' + s.count[k2] + '／' + s.total + '）';
  }

  /* ================= 用語 ================= */

  function renderGlossEast() {
    var dl = $('gloss-east');
    if (dl.childNodes.length) return;
    TX.GLOSSARY.forEach(function (g) {
      dl.appendChild(el('dt', null, g[0]));
      dl.appendChild(el('dd', null, g[1]));
    });
  }

  /* ================= まとめ ================= */

  function renderEast(east) {
    renderNisshu(east.shichu);
    renderMeishiki(east.shichu);
    renderGogyo(east.shichu);
    renderShukuyo(east.shukuyo);
    renderKyusei(east.kyusei);
    renderShibi(east.shibi);
    renderKoyomi(east.koyomi);
    renderGlossEast();
  }

  return { renderEast: renderEast, renderCompare: renderCompare };
})();
