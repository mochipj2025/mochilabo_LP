/* スライム診断 — 判定
 *
 * 暦の計算は hoshiyomi の koyomi.js、四柱の組み立ては toyo.js に任せる。
 * ここでやるのは対応表を引くことだけで、新しい計算は一つも書かない。
 *
 *   日干の五行          → 色
 *   日柱の十二運        → 景
 *   月柱の通変星(shiStar) → 星
 *   景の強さ × 星の向き  → ズレ
 */
window.SLIME = (function () {
  'use strict';

  var K = window.HOSHI_KOYOMI;
  var T = window.HOSHI_TOYO;

  /* 日干の五行 → 色。鉢の色がこれを担当する。 */
  var COLOR = {
    '木': { key: 'ao',    name: '青', gogyo: '木' },
    '火': { key: 'aka',   name: '赤', gogyo: '火' },
    '土': { key: 'ki',    name: '黄', gogyo: '土' },
    '金': { key: 'shiro', name: '白', gogyo: '金' },
    '水': { key: 'kuro',  name: '黒', gogyo: '水' }
  };

  /* 十二運 → 景。toyo.js の UNSEI と同じ並びで持つ。 */
  var UNSEI = ['長生', '沐浴', '冠帯', '臨官', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'];
  var KEI = [
    { key: 'me',      name: '芽',     un: '長生', strength: '中' },
    { key: 'futaba',  name: '双葉',   un: '沐浴', strength: '中' },
    { key: 'wakagi',  name: '若木',   un: '冠帯', strength: '強' },
    { key: 'tsubomi', name: '蕾',     un: '臨官', strength: '強' },
    { key: 'mankai',  name: '満開',   un: '帝旺', strength: '強' },
    { key: 'minori',  name: '実り',   un: '衰',   strength: '中' },
    { key: 'irozuki', name: '色づき', un: '病',   strength: '弱' },
    { key: 'ochiba',  name: '落ち葉', un: '死',   strength: '弱' },
    { key: 'tsuchi',  name: '土',     un: '墓',   strength: '弱' },
    { key: 'kaze',    name: '風',     un: '絶',   strength: '弱' },
    { key: 'tane',    name: '種',     un: '胎',   strength: '弱' },
    { key: 'ne',      name: '根',     un: '養',   strength: '中' }
  ];

  /* 通変星 → 星。集める＝自分を強める側、削る＝自分から出ていく側。 */
  var STAR = {
    '比肩': { key: 'narabikabu', name: '対等',   side: '集める' },
    '劫財': { key: 'karamizuru', name: '巻き込み',   side: '集める' },
    '偏印': { key: 'komorebi',   name: 'わき道', side: '集める' },
    '正印': { key: 'megumiame',  name: '受け取り',   side: '集める' },
    '食神': { key: 'kaori',      name: 'ゆるみ',     side: '削る' },
    '傷官': { key: 'toge',       name: '指摘',       side: '削る' },
    '偏財': { key: 'nohara',     name: '出入り',     side: '削る' },
    '正財': { key: 'une',        name: '守り',       side: '削る' },
    '偏官': { key: 'hasami',     name: '追い込み',       side: '削る' },
    '正官': { key: 'shichu',     name: '役割',     side: '削る' }
  };

  /* ズレ。量（景の強さ）と向き（星）が釣り合っているか。 */
  var ZURE = {
    '強': { '集める': 'moteamasu', '削る': 'kasanaru' },
    '中': { '集める': 'moteamasu', '削る': 'tarinai'  },
    '弱': { '集める': 'kasanaru',  '削る': 'tarinai'  }
  };
  var ZURE_NAME = { kasanaru: '重なる', moteamasu: '持て余す', tarinai: '足りない' };

  /* 生年月日だけで足りる。
     日柱は日本標準時0時で、月柱は節入りで変わるので、時刻も場所も要らない。 */
  function read(year, month, day) {
    if (!(year >= 1900 && year <= 2100)) throw new Error('年が範囲外です: ' + year);
    if (!(month >= 1 && month <= 12)) throw new Error('月が範囲外です: ' + month);
    if (!(day >= 1 && day <= 31)) throw new Error('日が範囲外です: ' + day);

    var k = K.build({
      year: year, month: month, day: day,
      hour: 0, minute: 0,
      lon: 139.692, tzOffset: 9,
      timeUnknown: true,   /* 時柱は使わないので出さない */
      useTrueSolar: false
    });
    var s = T.shichu(k);
    var dayPillar = s.pillars[2];
    var monthPillar = s.pillars[1];

    var color = COLOR[s.dayKanElem];
    var kei = KEI[UNSEI.indexOf(dayPillar.un)];
    var star = STAR[monthPillar.shiStar];

    if (!color) throw new Error('色が引けません: ' + s.dayKanElem);
    if (!kei)   throw new Error('景が引けません: ' + dayPillar.un);
    if (!star)  throw new Error('星が引けません: ' + monthPillar.shiStar);

    var zure = ZURE[kei.strength][star.side];

    return {
      color: color,
      kei: kei,
      star: star,
      zure: zure,
      zureName: ZURE_NAME[zure],
      /* 名乗り。「青の、蕾」 */
      title: color.name + 'の、' + kei.name,
      /* 画面のヒーローはドット絵、書き出すカードは描き込んだほう。
         鉢の色ぶんが無ければ、色なしの絵に落とす。 */
      image:             'images_pixel/' + kei.key + '-' + color.key + '.png',
      imageFallback:     'images_pixel/' + kei.key + '.png',
      imageRich:         'images/' + kei.key + '-' + color.key + '.png',
      imageRichFallback: 'images/' + kei.key + '.png',
      /* 使った暦。隠さずに全部返す。 */
      koyomi: {
        dayGanshi: dayPillar.ganshi,
        monthGanshi: monthPillar.ganshi,
        yearGanshi: s.pillars[0].ganshi,
        dayKan: s.dayKanName,
        dayKanElem: s.dayKanElem,
        dayKanYin: s.dayKanYin,
        un: dayPillar.un,
        monthShiStar: monthPillar.shiStar,
        monthKanStar: monthPillar.kanStar,
        monthHonki: monthPillar.honki,
        setsu: s.setsu,
        gogyo: s.count,
        kubo: s.kubo
      }
    };
  }

  function readDate(text) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(text).trim());
    if (!m) throw new Error('日付の形式が違います: ' + text);
    return read(+m[1], +m[2], +m[3]);
  }

  return {
    read: read,
    readDate: readDate,
    COLOR: COLOR, KEI: KEI, STAR: STAR,
    UNSEI: UNSEI, ZURE: ZURE, ZURE_NAME: ZURE_NAME
  };
})();
