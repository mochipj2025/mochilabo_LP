/* 読み口の切り替え。どの描画コードからも参照する。 */
window.HOSHI_TONE = {
  value: 'gag',
  TONES: ['soft', 'spicy', 'gag'],

  /* いまの読み口に対応する差し替えデータを返す。やさしいなら null。 */
  pack: function () {
    if (this.value === 'spicy') return window.HOSHI_TEXT_SPICY || null;
    if (this.value === 'gag') return window.HOSHI_TEXT_GAG || null;
    return null;
  },

  /* 既存コードとの互換のため残す */
  isSpicy: function () { return this.value === 'spicy'; },

  set: function (v) {
    this.value = (this.TONES.indexOf(v) >= 0) ? v : 'soft';
    try { localStorage.setItem('hoshiyomi.tone', this.value); } catch (e) { /* 保存できなくても支障はない */ }
  },

  restore: function () {
    try {
      var v = localStorage.getItem('hoshiyomi.tone');
      if (v === 'spicy') v = 'gag';
      if (v && this.TONES.indexOf(v) >= 0) this.value = v;
    } catch (e) { /* 読めなくても支障はない */ }
    return this.value;
  }
};
