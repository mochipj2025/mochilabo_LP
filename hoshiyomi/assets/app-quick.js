/* 誕生日を入れず、太陽星座だけで読む毒舌診断。 */
(function () {
  'use strict';

  var T = window.HOSHI_TEXT;
  var G = window.HOSHI_TEXT_GAG;
  var GUIDE = window.HOSHI_SIGN_GUIDE;
  var SIGN_IMAGES = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  var grid = document.getElementById('quick-signgrid');
  var result = document.getElementById('quick-result');
  if (!grid || !result || !T || !G || !GUIDE) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* 長い段落にせず、一文ずつ目で追える形にする。 */
  function appendSentences(parent, text) {
    var list = text.match(/[^。？！]+[。？！]?/g) || [text];
    list.forEach(function (sentence) {
      var s = sentence.trim();
      if (s) parent.appendChild(el('span', 'quick-sentence', s));
    });
  }

  function detail(title, text) {
    var box = el('section', 'quick-detail');
    box.appendChild(el('h3', null, title));
    var copy = el('div', 'quick-copy');
    appendSentences(copy, text);
    box.appendChild(copy);
    return box;
  }

  function render(index) {
    var sign = T.signs[index];
    var core = G.core.sun[index];
    var guide = GUIDE[index];
    var year = G.SIGN_SUMMARY[index];
    result.textContent = '';

    var main = el('div', 'big quick-main');
    var character = el('div', 'quick-character');
    var characterImage = el('img');
    characterImage.src = 'assets/zodiac/' + SIGN_IMAGES[index] + '.png';
    characterImage.alt = sign.name + 'のキャラクター';
    character.appendChild(characterImage);
    main.appendChild(character);
    main.appendChild(el('p', 'who', sign.name + 'の毒舌診断'));
    main.appendChild(el('p', 'sign', core.catch));
    var mainCopy = el('div', 'body quick-copy');
    appendSentences(mainCopy, core.body);
    main.appendChild(mainCopy);
    main.appendChild(el('p', 'body out', core.out));
    result.appendChild(main);

    var details = el('div', 'quick-details');
    details.appendChild(detail('仕事で出る癖', guide.work));
    details.appendChild(detail('人づきあい', guide.relations));
    details.appendChild(detail('運が動くとき', guide.flow));
    details.appendChild(detail('調子の戻し方', guide.reset));
    result.appendChild(details);

    var yearBox = el('section', 'quick-year');
    yearBox.appendChild(el('p', 'quick-kicker', '2026年の一般運勢'));
    yearBox.appendChild(el('h3', null, year.catch));
    var yearCopy = el('div', 'quick-copy');
    appendSentences(yearCopy, year.body);
    yearBox.appendChild(yearCopy);
    yearBox.appendChild(el('p', 'quick-out', year.out));
    result.appendChild(yearBox);

    var more = el('button', 'go quick-more', '生年月日を入れてホロスコープを作る');
    more.type = 'button';
    more.addEventListener('click', function () {
      document.getElementById('detail-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('birthdate').focus();
    });
    result.appendChild(more);
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  T.signs.forEach(function (sign, index) {
    var button = el('button', 'signbtn');
    button.type = 'button';
    button.dataset.sign = index;
    var image = el('img', 'sign-mascot-thumb');
    image.src = 'assets/zodiac/' + SIGN_IMAGES[index] + '.png';
    image.alt = '';
    button.appendChild(image);
    button.appendChild(el('span', 'sb-name', sign.name));
    button.appendChild(el('span', 'sb-el', sign.element));
    button.addEventListener('click', function () {
      Array.prototype.forEach.call(grid.querySelectorAll('.signbtn'), function (b) {
        b.classList.toggle('on', b === button);
      });
      render(index);
    });
    grid.appendChild(button);
  });
})();
