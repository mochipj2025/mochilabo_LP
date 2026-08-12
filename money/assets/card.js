/* お金の診断 — 結果を1枚の画像にする
 *
 * 枠は ../assets/card-frame.js。ここは上の正方形だけ。
 *
 * この診断は十二景を持たないので、絵を借りてこない。
 * 主役は「大事だと思っている領域」と「実際に払ってしまう領域」のズレなので、
 * 配点の棒をそのまま並べ、金星の領域に印を付ける。
 * 棒の長さは入力した点数をそのまま横幅に写したもので、別に絵を描いてはいない。
 */
window.MONEY_CARD = (function () {
  'use strict';

  var F = window.MOCHI_CARD;

  var ROW = 78, BAR_X = 300, BAR_W = 620, MAXP = 10;
  var MARK = '#F4AD7A';      // 金星の領域
  var BAR = '#B7C4FF';       // 配点の棒
  var DIM = 'rgba(183,196,255,.16)';

  function spec(r, stampText) {
    var order = r.order.slice(0, 7);
    var venusKey = r.venus.domain.key;

    return {
      seed: r.top.key + venusKey + r.gap + order.map(function (o) { return o.points; }).join(''),
      title: r.gap === 'icchi' ? '思っているところに、払っている'
                               : '思っているところと、払うところが違う',
      lines: [
        '大事だと思っている　' + r.top.name + '（' + r.top.points + '点）' +
        '　　金星の領域　' + r.venus.domain.name,
        'お金の動かし方　' + r.star.name + '　　上乗せ　月 ' +
          r.money.monthly.toLocaleString('ja-JP') + '円'
      ],
      note: stampText || '',
      right: 'お金の診断　mochisura-lab.com',
      filename: 'mochisura-money-' + r.top.key + '-' + venusKey + '-' + r.gap,
      starCount: 60,
      paint: function (ctx, W, SQ, done) {
        var top = (SQ - ROW * order.length) / 2 + 30;

        ctx.textBaseline = 'middle';
        order.forEach(function (o, i) {
          var y = top + i * ROW + ROW / 2;
          var isVenus = (o.key === venusKey);

          /* 領域の名前 */
          ctx.textAlign = 'right';
          ctx.font = (isVenus ? '600 30px ' : '400 30px ') + F.GOT;
          ctx.fillStyle = isVenus ? MARK : F.TEXT;
          ctx.fillText(o.name, BAR_X - 26, y);

          /* 目盛りの地 */
          ctx.fillStyle = DIM;
          ctx.fillRect(BAR_X, y - 13, BAR_W, 26);

          /* 配点の棒。点数をそのまま横幅にする */
          var w = BAR_W * (o.points / MAXP);
          if (w > 0) {
            ctx.fillStyle = isVenus ? MARK : BAR;
            ctx.fillRect(BAR_X, y - 13, w, 26);
          }

          /* 点数 */
          ctx.textAlign = 'left';
          ctx.font = '400 26px ' + F.GOT;
          ctx.fillStyle = F.SOFT;
          ctx.fillText(o.points + '点', BAR_X + BAR_W + 16, y);
        });

        /* 金星の領域が何番目だったか、線で結ぶ */
        var idx = -1;
        order.forEach(function (o, i) { if (o.key === venusKey) idx = i; });
        if (idx >= 0) {
          var vy = top + idx * ROW + ROW / 2;
          ctx.strokeStyle = MARK; ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(BAR_X - 250, vy); ctx.lineTo(BAR_X - 210, vy);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.textAlign = 'left';
          ctx.font = '600 24px ' + F.GOT;
          ctx.fillStyle = MARK;
          ctx.fillText('金星', BAR_X - 250, vy - 30);
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = '400 24px ' + F.GOT;
        ctx.fillStyle = 'rgba(169,175,212,.8)';
        ctx.fillText('棒の長さは入れた点数そのもの。合計10点。', BAR_X - 250, top - 46);

        done();
      }
    };
  }

  function save(r, stampText, done) { F.save(spec(r, stampText), done); }

  return { save: save, spec: spec };
})();
