/* スライム診断 — 結果を1枚の画像にする
 *
 * 枠（地・帯・書き出し）は ../assets/card-frame.js が持つ。
 * ここは「上の正方形に何を描くか」だけ。
 * 画面のヒーローはドット絵だが、書き出しは描き込んだほうを使う。
 */
window.SLIME_CARD = (function () {
  'use strict';

  var F = window.MOCHI_CARD;

  function spec(r, stampText) {
    return {
      seed: r.kei.key + r.color.key + r.star.key,
      title: r.title,
      dot: r.color.key,
      lines: ['行動 ' + r.kei.name + '　考え方 ' + r.color.name +
              '　対人 ' + r.star.name + '　バランス ' + r.zureName],
      note: '300通りのうちのひとつ' + (stampText ? '　／　' + stampText : ''),
      right: 'スライム診断　mochisura-lab.com',
      filename: 'mochisura-' + r.color.key + '-' + r.kei.key + '-' + r.star.key,
      paint: function (ctx, W, SQ, done) {
        F.loadImage(r.imageRich || r.image, r.imageRichFallback, function (img) {
          if (img) {
            ctx.imageSmoothingEnabled = true;
            var size = 1024;
            ctx.drawImage(img, (W - size) / 2, (SQ - size) / 2 + 10, size, size);
          }
          done();
        });
      }
    };
  }

  function save(r, stampText, done) { F.save(spec(r, stampText), done); }
  function draw(r, stampText, then) { F.draw(spec(r, stampText), then); }
  function filename(r) { return spec(r).filename + F.EXT; }

  return { save: save, draw: draw, filename: filename, spec: spec };
})();
