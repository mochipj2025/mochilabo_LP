/* 相性 — 結果を1枚の画像にする
 *
 * 枠は ../assets/card-frame.js。ここは上の正方形だけ。
 *
 * 二人ぶんの景と鉢の色があるので、スライム診断の絵をそのまま二株並べる。
 * 勢いの段階の距離（0〜6）を、そのまま二つの間隔にする。
 * 距離を絵で言い直しているのではなく、距離そのものを横幅に写している。
 */
window.AISHOU_CARD = (function () {
  'use strict';

  var F = window.MOCHI_CARD;

  var GAP_MIN = 40, GAP_MAX = 280;   // 距離0のときと距離6のときの間隔
  var ART = 460;                     // 一株を描く箱の大きさ
  /* 絵は 1024 の箱に描かれているが、中身は 503〜699px しか使っていない。
     箱の端で並べると離れすぎるので、いちばん幅を取る絵に合わせて
     「見えている端」で間隔を測る。 */
  var CONTENT = 0.683;
  var ARROW_HALF = 260;              // 矢印は距離によらず同じ長さ。文字が入る幅を確保する

  function art(p) {
    return {
      url: '../slime/images/' + p.kei.key + '-' + p.color.key + '.png',
      fallback: '../slime/images/' + p.kei.key + '.png'
    };
  }

  /* 矢印。左から右、または右から左。名前を上に置く。 */
  function arrow(ctx, x1, x2, y, label, color) {
    var dir = x2 > x1 ? 1 : -1;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 - 12 * dir, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y);
    ctx.lineTo(x2 - 13 * dir, y - 7);
    ctx.lineTo(x2 - 13 * dir, y + 7);
    ctx.closePath(); ctx.fill();

    ctx.font = '600 30px ' + F.GOT;
    ctx.textAlign = 'center';
    ctx.fillText(label, (x1 + x2) / 2, y - 14);
    ctx.textAlign = 'left';
  }

  function spec(r, stampA, stampB) {
    var gap = GAP_MIN + (GAP_MAX - GAP_MIN) * (r.distance / 6);

    return {
      seed: r.a.kei.key + r.b.kei.key + r.aToB.key + r.bToA.key + r.distance,
      title: '距離 ' + r.distance + '　' + (r.asymmetric ? '行きと帰りで違う' : '行きも帰りも同じ'),
      lines: [
        'あなた → 相手　' + r.aToB.name + '　　相手 → あなた　' + r.bToA.name,
        'あなた ' + r.a.color.name + 'の' + r.a.kei.name + '　　相手 ' + r.b.color.name + 'の' + r.b.kei.name
      ],
      note: stampA && stampB ? stampA + '　と　' + stampB : '',
      right: '相性を読む　mochisura-lab.com',
      filename: 'mochisura-aishou-' + r.a.kei.key + '-' + r.b.kei.key + '-' + r.distance,
      paint: function (ctx, W, SQ, done) {
        F.loadAll([art(r.a), art(r.b)], function (imgs) {
          var cx = W / 2, cy = SQ / 2 - 30;
          var vHalf = ART * CONTENT / 2;          // 見えている部分の半分
          var half = gap / 2 + vHalf;
          [[imgs[0], cx - half], [imgs[1], cx + half]].forEach(function (it) {
            if (!it[0]) return;
            var x = Math.max(0, Math.min(W - ART, it[1] - ART / 2));
            ctx.drawImage(it[0], x, cy - ART / 2, ART, ART);
          });

          /* 二本の矢印。行きは上、帰りは下。長さは固定で、文字の場所を確保する。 */
          var lx = cx - ARROW_HALF, rx = cx + ARROW_HALF;
          arrow(ctx, lx, rx, cy + ART / 2 + 80, r.aToB.name, '#B7C4FF');
          arrow(ctx, rx, lx, cy + ART / 2 + 158, r.bToA.name, '#F4AD7A');

          /* 距離の目盛り。何を写したかを見せる。 */
          ctx.strokeStyle = 'rgba(183,196,255,.75)'; ctx.lineWidth = 2;
          var y = cy - ART / 2 - 58;
          ctx.beginPath();
          ctx.moveTo(cx - gap / 2, y - 8); ctx.lineTo(cx - gap / 2, y + 8);
          ctx.moveTo(cx - gap / 2, y); ctx.lineTo(cx + gap / 2, y);
          ctx.moveTo(cx + gap / 2, y - 8); ctx.lineTo(cx + gap / 2, y + 8);
          ctx.stroke();
          ctx.fillStyle = '#A9AFD4';
          ctx.font = '400 28px ' + F.GOT;
          ctx.textAlign = 'center';
          ctx.fillText('段階の差 ' + r.distance, cx, y - 16);
          ctx.textAlign = 'left';

          done();
        });
      }
    };
  }

  function save(r, stampA, stampB, done) { F.save(spec(r, stampA, stampB), done); }

  return { save: save, spec: spec };
})();
