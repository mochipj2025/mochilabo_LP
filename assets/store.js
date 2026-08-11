/* もちスラ — 端末の中だけの保存
 *
 * サーバーへは何も送らない。この端末のブラウザに置くだけ。
 * 保存するのは「自分の生年月日」と「よく見る人」の2つだけで、
 * 診断の結果そのものは保存しない（生年月日から毎回同じものが出るので、持つ意味がない）。
 *
 * 何を持っているかは me/ で全部見せる。いつでも全部消せる。
 */
window.MOCHI_STORE = (function () {
  'use strict';

  var KEY = 'mochisura-me-v1';
  var MAX_PEOPLE = 8;

  /* ---- ここから下は localStorage を触らない。テストできるように分けてある ---- */

  function validDate(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || '').trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    /* 実在しない日を弾く（2月30日など） */
    var probe = new Date(Date.UTC(y, mo - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() + 1 !== mo || probe.getUTCDate() !== d) return null;
    return m[1] + '-' + m[2] + '-' + m[3];
  }

  function cleanName(text) {
    return String(text == null ? '' : text).replace(/\s+/g, ' ').trim().slice(0, 20);
  }

  /* 保存できる形に整える。壊れた値は落として、必ず同じ形を返す。 */
  function normalize(raw) {
    var out = { me: null, people: [] };
    if (!raw || typeof raw !== 'object') return out;
    out.me = validDate(raw.me);
    if (Array.isArray(raw.people)) {
      var seen = {};
      raw.people.forEach(function (p) {
        if (out.people.length >= MAX_PEOPLE) return;
        if (!p || typeof p !== 'object') return;
        var d = validDate(p.date);
        var n = cleanName(p.name);
        if (!d || !n) return;
        var k = n + '|' + d;
        if (seen[k]) return;
        seen[k] = 1;
        out.people.push({ name: n, date: d });
      });
    }
    return out;
  }

  /* ---- ここから localStorage ---- */

  function read() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); }
    catch (e) { return normalize(null); }
  }

  function write(data) {
    var v = normalize(data);
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    return v;
  }

  return {
    KEY: KEY,
    MAX_PEOPLE: MAX_PEOPLE,
    validDate: validDate,
    cleanName: cleanName,
    normalize: normalize,

    all: read,
    me: function () { return read().me; },
    people: function () { return read().people; },

    setMe: function (date) {
      var d = validDate(date);
      var cur = read();
      cur.me = d;
      return write(cur);
    },
    addPerson: function (name, date) {
      var cur = read();
      var d = validDate(date), n = cleanName(name);
      if (!d) throw new Error('生年月日の形式が違います');
      if (!n) throw new Error('呼び名を入れてください');
      if (cur.people.length >= MAX_PEOPLE) throw new Error(MAX_PEOPLE + '人までです');
      if (cur.people.some(function (p) { return p.name === n && p.date === d; })) {
        throw new Error('もう登録されています');
      }
      cur.people.push({ name: n, date: d });
      return write(cur);
    },
    removePerson: function (index) {
      var cur = read();
      cur.people.splice(index, 1);
      return write(cur);
    },
    clear: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      return normalize(null);
    },

    /* 入力欄に、保存してある生年月日をそっと入れる。勝手に診断はしない。 */
    prefill: function (inputId) {
      var d = read().me;
      if (!d) return false;
      var input = document.getElementById(inputId);
      if (!input || input.value) return false;
      input.value = d;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  };
})();
