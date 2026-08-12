/* 相性 — 判定
 *
 * 生年月日2つだけ。時刻も場所も聞かない。
 *   互いの通変星 … 日干どうしを両方向から見る。行きと帰りで名前が変わる
 *   十二景の距離 … 輪の上で何個離れているか（0〜6）
 *   色の関係     … 五行の相生・相剋
 *
 * 計算は hoshiyomi の koyomi.js / toyo.js に任せる。点数はつけない。
 */
window.AISHOU = (function () {
  'use strict';

  var K = window.HOSHI_KOYOMI;
  var T = window.HOSHI_TOYO;

  var GOGYO = ['木', '火', '土', '金', '水'];

  var COLOR = {
    '木': { key: 'ao',    name: '青' },
    '火': { key: 'aka',   name: '赤' },
    '土': { key: 'ki',    name: '黄' },
    '金': { key: 'shiro', name: '白' },
    '水': { key: 'kuro',  name: '黒' }
  };

  var UNSEI = ['長生', '沐浴', '冠帯', '臨官', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'];
  var KEI = [
    { key: 'me',      name: '芽' },   { key: 'futaba',  name: '双葉' },
    { key: 'wakagi',  name: '若木' }, { key: 'tsubomi', name: '蕾' },
    { key: 'mankai',  name: '満開' }, { key: 'minori',  name: '実り' },
    { key: 'irozuki', name: '色づき' }, { key: 'ochiba', name: '落ち葉' },
    { key: 'tsuchi',  name: '土' },   { key: 'kaze',    name: '風' },
    { key: 'tane',    name: '種' },   { key: 'ne',      name: '根' }
  ];

  var STAR = {
    '比肩': { key: 'narabikabu', name: '対等' },
    '劫財': { key: 'karamizuru', name: '巻き込み' },
    '食神': { key: 'kaori',      name: 'ゆるみ' },
    '傷官': { key: 'toge',       name: '指摘' },
    '偏財': { key: 'nohara',     name: '出入り' },
    '正財': { key: 'une',        name: '守り' },
    '偏官': { key: 'hasami',     name: '追い込み' },
    '正官': { key: 'shichu',     name: '役割' },
    '偏印': { key: 'komorebi',   name: 'わき道' },
    '正印': { key: 'megumiame',  name: '受け取り' }
  };

  function one(text, label) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(text || '').trim());
    if (!m) throw new Error((label || '') + 'の生年月日を入れてください');
    var y = +m[1];
    if (!(y >= 1900 && y <= 2100)) throw new Error((label || '') + 'の年が範囲外です');

    var k = K.build({
      year: y, month: +m[2], day: +m[3], hour: 0, minute: 0,
      lon: 139.692, tzOffset: 9, timeUnknown: true, useTrueSolar: false
    });
    var s = T.shichu(k);
    var p = s.pillars[2];
    return {
      date: text,
      ganshi: p.ganshi,
      kanIdx: p.kanIdx,
      kanName: p.kan,
      elem: s.dayKanElem,
      color: COLOR[s.dayKanElem],
      keiIdx: UNSEI.indexOf(p.un),
      kei: KEI[UNSEI.indexOf(p.un)],
      un: p.un
    };
  }

  /* 五行の関係。読み手（あなた＝a）から見た向きで返す。
     相生は次の五行を生み、相剋は2つ先を剋す。 */
  function gogyoRel(a, b) {
    var i = GOGYO.indexOf(a.elem), j = GOGYO.indexOf(b.elem);
    if (i === j) return 'onaji';
    if ((i + 1) % 5 === j) return 'watashi_umu';
    if ((j + 1) % 5 === i) return 'aite_umu';
    if ((i + 2) % 5 === j) return 'watashi_kokusu';
    return 'aite_kokusu';
  }

  function read(dateA, dateB) {
    var a = one(dateA, 'ひとりめ');
    var b = one(dateB, 'ふたりめ');

    var aToB = T.tsuhen(a.kanIdx, b.kanIdx);   /* あなたから見た相手 */
    var bToA = T.tsuhen(b.kanIdx, a.kanIdx);   /* 相手から見たあなた */

    var raw = (b.keiIdx - a.keiIdx + 12) % 12;
    var distance = Math.min(raw, 12 - raw);

    return {
      a: a, b: b,
      aToB: { tsuhen: aToB, key: STAR[aToB].key, name: STAR[aToB].name },
      bToA: { tsuhen: bToA, key: STAR[bToA].key, name: STAR[bToA].name },
      /* 行きと帰りで名前が変わるか。ここがこの診断の見どころ */
      asymmetric: aToB !== bToA,
      distance: distance,
      rawDistance: raw,
      gogyo: gogyoRel(a, b)
    };
  }

  return {
    read: read, one: one, gogyoRel: gogyoRel,
    COLOR: COLOR, KEI: KEI, UNSEI: UNSEI, STAR: STAR, GOGYO: GOGYO
  };
})();
