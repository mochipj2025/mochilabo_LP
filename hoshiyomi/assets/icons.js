/* 星読み — 東洋側の小さい図
 *
 * 方針:
 *   1. アイコンは記号の置き換えではなく、文字の補助。かならず文字と併記する。
 *      これを外すと「記号だけ出てきて意味が分からない」という、直したはずの状態に戻る。
 *   2. 絵文字は使わない。環境で見た目が変わるし、落ち着いたトーンが崩れる。
 *   3. 単色のインラインSVG。線の色は currentColor か、呼び出し側から渡す。
 *
 * データ（GOGYO_PATH / COMPASS_CELLS / UNSEI_HEIGHT）と、
 * それを組み立てる関数を分けてある。データ側だけなら Node からも検査できる。
 */
window.HOSHI_ICONS = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ================= 五行のアイコン ================= */

  /* 24×24 で描く。線だけ。塗りは使わない。 */
  var GOGYO_PATH = {
    /* 木＝伸びる。芽と二枚の葉 */
    '木': ['M12 21V10', 'M12 13c-3 0-5-2-5-5 3 0 5 2 5 5z', 'M12 12c3 0 5-2 5-5-3 0-5 2-5 5z'],
    /* 火＝照らす。ゆらぐ炎 */
    '火': ['M12 3c3.5 4 5 6.5 5 9.5a5 5 0 0 1-10 0c0-2 .8-3.2 2-4.2.7 1.8 1.8 2 2.6 1.2.6-.6.6-3.2-1.6-6.5z'],
    /* 土＝受ける。大地と山 */
    '土': ['M3 19h18', 'M5 19l4.5-7 3 4 2.5-3.2L20 19'],
    /* 金＝固める。地金のかたまり */
    '金': ['M4 10h16l-3 9H7z', 'M4 10l3-5h10l3 5'],
    /* 水＝流れる。しずく */
    '水': ['M12 3.5c0 0 6 6.4 6 9.9a6 6 0 0 1-12 0c0-3.5 6-9.9 6-9.9z']
  };

  var GOGYO_COLOR = {
    '木': '#7d8f5e', '火': '#d2705a', '土': '#b0894f', '金': '#8d8b93', '水': '#6f7fa8'
  };

  function gogyo(name, size) {
    var paths = GOGYO_PATH[name];
    if (!paths) return null;
    var s = size || 20;
    var svg = svgEl('svg', {
      width: s, height: s, viewBox: '0 0 24 24', fill: 'none',
      stroke: GOGYO_COLOR[name], 'stroke-width': 1.6,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      'aria-hidden': 'true', focusable: 'false'
    });
    paths.forEach(function (d) { svg.appendChild(svgEl('path', { d: d })); });
    return svg;
  }

  /* ================= 九星の方位盤 ================= */

  /* 気学の方位盤は上が南、下が北。東が左で西が右になる。
     地図と上下が逆なので、どのマスにも方角を文字で書いておく。 */
  var COMPASS_CELLS = [
    '南東', '南', '南西',
    '東', '中央', '西',
    '北東', '北', '北西'
  ];

  function compass(dir, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'compass';
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', '方位盤。今年は' + dir + '。上が南、下が北です。');
    COMPASS_CELLS.forEach(function (d) {
      var cell = document.createElement('div');
      cell.className = 'compass-cell' + (d === dir ? ' is-here' : '');
      cell.textContent = d;
      wrap.appendChild(cell);
    });
    var box = document.createElement('div');
    box.className = 'compass-box';
    box.appendChild(wrap);
    var cap = document.createElement('div');
    cap.className = 'compass-cap';
    cap.textContent = opts.caption || '上が南、下が北。気学の方位盤の向きです。';
    box.appendChild(cap);
    return box;
  }

  /* ================= 勢いの段階グラフ ================= */

  /* 十二運は上って下りて、また上がる循環。文字だけだと
     「考えるほうに寄る時期」が上り坂か下り坂か分からないので、位置で見せる。 */
  var UNSEI_ORDER = ['長生', '沐浴', '冠帯', '臨官', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'];
  var UNSEI_HEIGHT = {
    '長生': 4, '沐浴': 5, '冠帯': 7, '臨官': 9, '帝旺': 10, '衰': 8,
    '病': 6, '死': 4, '墓': 3, '絶': 1, '胎': 2, '養': 3
  };

  function unseiChart(name) {
    if (!UNSEI_HEIGHT[name]) return null;
    var W = 300, H = 64, BAR = 16, GAP = 8, MAXH = 44, BASE = 52;
    var svg = svgEl('svg', {
      width: '100%', viewBox: '0 0 ' + W + ' ' + H,
      'aria-label': '勢いの十二段階のうち、いまは' + (UNSEI_ORDER.indexOf(name) + 1) + '番目',
      role: 'img'
    });
    UNSEI_ORDER.forEach(function (u, i) {
      var h = Math.max(3, UNSEI_HEIGHT[u] / 10 * MAXH);
      var here = (u === name);
      svg.appendChild(svgEl('rect', {
        x: 4 + i * (BAR + GAP), y: BASE - h, width: BAR, height: h, rx: 2,
        fill: here ? 'var(--warm)' : 'var(--ink-faint)',
        'fill-opacity': here ? 1 : 0.35
      }));
    });
    var idx = UNSEI_ORDER.indexOf(name);
    var t = svgEl('text', {
      x: 4 + idx * (BAR + GAP) + BAR / 2, y: 62,
      'text-anchor': 'middle', 'font-size': 10, fill: 'var(--warm)'
    });
    t.textContent = 'いまここ';
    svg.appendChild(t);
    return svg;
  }

  return {
    GOGYO_PATH: GOGYO_PATH, GOGYO_COLOR: GOGYO_COLOR,
    COMPASS_CELLS: COMPASS_CELLS,
    UNSEI_ORDER: UNSEI_ORDER, UNSEI_HEIGHT: UNSEI_HEIGHT,
    gogyo: gogyo, compass: compass, unseiChart: unseiChart
  };
})();
