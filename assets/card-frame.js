/* 結果カードの共通の枠（1080×1350／4:5）
 *
 * 診断ごとに違うのは上の正方形の中身だけ。地・帯・書き出しはここで持つ。
 * canvas に描いて保存するだけなので、どの診断でもネットワークは使わない。
 *
 *   0    – 1080 …… 絵。診断が paint() で描く
 *   1080 – 1350 …… 帯（270px）。名乗り・軸・出どころ
 *   1080 + 270 = 1350 = 1080 × 1.25 ＝ 4:5
 */
window.MOCHI_CARD = (function () {
  'use strict';

  var W = 1080, SQ = 1080, BAND = 270, H = SQ + BAND;

  var BG_TOP = '#0B1026', BG_BOTTOM = '#141A3A';
  var BAND_BG = '#0D1330', LINE = '#B7C4FF', TEXT = '#F2F0FF', SOFT = '#A9AFD4';

  var MIN = '"Yu Mincho","YuMincho","Hiragino Mincho ProN","BIZ UDPMincho",serif';
  var GOT = '"Yu Gothic UI","Yu Gothic","Hiragino Sans",Meiryo,sans-serif';

  /* 五色。帯の丸印が担当する。地が暗いので黒だけ沈むため、全部に細い縁を付ける。 */
  var INK = { ao: '#5B7FD4', aka: '#C7503C', ki: '#C99A2E', shiro: '#E8E6DE', kuro: '#232838' };

  /* 透過を使っていないので JPEG でよい。同じ絵で PNG 632KB → 約130KB。
     帯の文字が潰れないよう品質は高めに取る（実測で平均差 0.9／255）。 */
  var MIME = 'image/jpeg', QUALITY = 0.94, EXT = '.jpg';

  var PAD = 64;

  /* 種から回す。同じ結果なら毎回同じ空になる。 */
  function stars(ctx, seed, count) {
    var s = (seed >>> 0) || 1;
    var next = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    var n = (count == null) ? 90 : count;   /* 0 を渡せるように。|| だと 0 が 90 に戻る */
    for (var i = 0; i < n; i++) {
      var x = next() * W, y = next() * SQ * 0.82, r = next() * 1.6 + 0.5;
      ctx.globalAlpha = 0.20 + next() * 0.55;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(r), Math.round(r));
    }
    ctx.globalAlpha = 1;
  }

  function seedFrom(str) {
    var s = 0;
    str = String(str || '');
    for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
    return s;
  }

  /* 絵を読む。無ければ控えに落とし、それも無ければ null で続ける。 */
  function loadImage(url, fallback, then) {
    if (!url) return then(null);
    var img = new Image();
    img.onload = function () { then(img); };
    img.onerror = function () {
      this.onerror = function () { then(null); };
      this.src = fallback || '';
    };
    img.src = url;
  }

  /* 何枚でもまとめて読む。[{url, fallback}] → [img|null] */
  function loadAll(list, then) {
    var out = [], left = list.length;
    if (!left) return then(out);
    list.forEach(function (it, i) {
      loadImage(it.url, it.fallback, function (img) {
        out[i] = img;
        if (--left === 0) then(out);
      });
    });
  }

  function band(ctx, o) {
    ctx.fillStyle = BAND_BG; ctx.fillRect(0, SQ, W, BAND);
    ctx.fillStyle = LINE; ctx.fillRect(0, SQ, W, 2);

    var top = SQ, x = PAD;

    if (o.dot) {
      var col = INK[o.dot] || o.dot;
      ctx.beginPath(); ctx.arc(PAD + 15, top + 74, 15, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(242,240,255,.45)'; ctx.stroke();
      x = PAD + 46;
    }

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    /* 題は長さがまちまちなので、入らなければ縮める。切り落とすより読めるほうを取る。 */
    ctx.fillStyle = TEXT;
    var title = o.title || '', size = 54, room = W - PAD - x;
    do {
      ctx.font = '600 ' + size + 'px ' + MIN;
      if (ctx.measureText(title).width <= room) break;
      size -= 2;
    } while (size > 30);
    ctx.fillText(title, x, top + 92);

    ctx.fillStyle = SOFT;
    ctx.font = '400 26px ' + GOT;
    (o.lines || []).slice(0, 2).forEach(function (t, i) {
      ctx.fillText(t, PAD, top + 148 + i * 34);
    });

    ctx.font = '400 22px ' + GOT;
    ctx.fillStyle = 'rgba(169,175,212,.85)';
    if (o.note) ctx.fillText(o.note, PAD, top + 200);
    if (o.right) {
      ctx.textAlign = 'right';
      ctx.fillText(o.right, W - PAD, top + 200);
      ctx.textAlign = 'left';
    }
  }

  /* o.paint(ctx, W, SQ, done) — 上の正方形を描く。読み込みがあるので done を呼ぶ。 */
  function draw(o, then) {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');

    var g = ctx.createLinearGradient(0, 0, 0, SQ);
    g.addColorStop(0, BG_TOP); g.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, SQ);
    stars(ctx, seedFrom(o.seed || o.title), o.starCount);

    var finish = function () { band(ctx, o); then(c); };
    if (typeof o.paint === 'function') o.paint(ctx, W, SQ, finish);
    else finish();
  }

  function save(o, done) {
    draw(o, function (c) {
      var name = (o.filename || 'mochisura') + EXT;
      var hand = function (url, revoke) {
        var a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        if (revoke) setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        if (done) done(name);
      };
      if (c.toBlob) {
        c.toBlob(function (b) {
          if (b) hand(URL.createObjectURL(b), true);
          else hand(c.toDataURL(MIME, QUALITY), false);
        }, MIME, QUALITY);
      } else {
        hand(c.toDataURL(MIME, QUALITY), false);
      }
    });
  }

  return {
    draw: draw, save: save,
    loadImage: loadImage, loadAll: loadAll,
    W: W, SQ: SQ, BAND: BAND, H: H, PAD: PAD,
    INK: INK, MIN: MIN, GOT: GOT,
    TEXT: TEXT, SOFT: SOFT, LINE: LINE, EXT: EXT
  };
})();
