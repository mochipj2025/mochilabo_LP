/* そらと暦のしくみ — 図に出す数値の計算
 *
 * 画面を触らない部分だけをここに置いてある。Node からも読めるので、
 * tests/test-shikumi.js が「教科書の値と合っているか」を毎回確かめる。
 *
 * このページは事実を主張する図を並べるので、数値がずれたら記事として成立しない。
 * 実際、西暦1年を Date.UTC(1, ...) で作って1901年になっていた事故があった。
 */
window.HOSHI_SHIKUMI_CALC = (function () {
  'use strict';

  var A = window.Astronomy;
  var DAY = 86400000;

  function norm360(d) { return ((d % 360) + 360) % 360; }
  function wrap180(d) { var x = norm360(d); return x > 180 ? x - 360 : x; }

  function sph(body, date) {
    var t = A.MakeTime(date);
    var v = (body === 'Moon') ? A.GeoMoon(t) : A.GeoVector(body, t, true);
    var r = A.SphereFromVector(A.RotateVector(A.Rotation_EQJ_ECT(t), v));
    return { lon: norm360(r.lon), lat: r.lat };
  }
  function lonOf(body, date) { return sph(body, date).lon; }

  /* Date.UTC は 0〜99 の年を1900年代として扱う。西暦1年は setUTCFullYear で作らないと 1901 になる。 */
  function midYear(year) {
    var d = new Date(Date.UTC(2000, 6, 1));
    d.setUTCFullYear(year);
    return d;
  }

  /* ---- 歳差：空に固定した目印が、その時代の黄経で何度に見えるか ---- */
  function markLon(year) {
    var t = A.MakeTime(midYear(year));
    var v = new A.Vector(1, 0, 0, t);
    return norm360(A.SphereFromVector(A.RotateVector(A.Rotation_EQJ_ECT(t), v)).lon);
  }
  function precession(fromYear, toYear) {
    var shift = Math.abs(wrap180(markLon(toYear) - markLon(fromYear)));
    return { deg: shift, arcsecPerYear: shift / (toYear - fromYear) * 3600 };
  }

  /* ---- 朔望月の平均（1回だけだと2日近くばらつく） ---- */
  var _syn = null;
  function synodicMean(fromYear, toYear) {
    if (_syn) return _syn;
    var first = A.SearchMoonPhase(0, A.MakeTime(new Date(Date.UTC(fromYear, 0, 1))), 40).date;
    var cur = first, n = 0, limit = Date.UTC(toYear, 0, 1);
    while (true) {
      var next = A.SearchMoonPhase(0, A.MakeTime(new Date(cur.getTime() + 2 * DAY)), 40);
      if (!next || next.date.getTime() > limit) break;
      cur = next.date; n++;
    }
    _syn = { mean: (cur - first) / DAY / n, count: n };
    return _syn;
  }

  /* ---- 恒星月：黄経が12周ぶん動く時間を12で割る ---- */
  function siderealMean(startDate, cycles) {
    cycles = cycles || 12;
    var acc = 0, prev = lonOf('Moon', startDate), TARGET = cycles * 360, stepH = 6;
    for (var h = stepH; h <= 40 * cycles * 24; h += stepH) {
      var d = new Date(startDate.getTime() + h * 3600000);
      var cur = lonOf('Moon', d);
      var delta = wrap180(cur - prev);
      if (acc + delta >= TARGET) return (h - stepH * (acc + delta - TARGET) / delta) / 24 / cycles;
      acc += delta; prev = cur;
    }
    return null;
  }

  /* ---- 1年でどれだけ空を進むか ---- */
  function degreesInYear(body, year) {
    var total = 0, prev = lonOf(body, new Date(Date.UTC(year, 0, 1)));
    for (var i = 5; i <= 365; i += 5) {
      var cur = lonOf(body, new Date(Date.UTC(year, 0, 1) + i * DAY));
      total += wrap180(cur - prev);
      prev = cur;
    }
    return total;
  }

  /* ---- 月の黄緯（食が限られる理由） ---- */
  function moonLatRange(year) {
    var mx = -99, mn = 99, arr = [];
    for (var i = 0; i <= 365; i++) {
      var v = sph('Moon', new Date(Date.UTC(year, 0, 1) + i * DAY)).lat;
      arr.push(v);
      if (v > mx) mx = v;
      if (v < mn) mn = v;
    }
    return { max: mx, min: mn, series: arr };
  }

  /* ---- 均時差（時計と太陽のずれ） ---- */
  function eot(year, trueSolarHour) {
    var arr = [];
    for (var i = 0; i <= 365; i++) {
      arr.push((trueSolarHour(new Date(Date.UTC(year, 0, 1, 12) + i * DAY), 0) - 12) * 60);
    }
    return { max: Math.max.apply(null, arr), min: Math.min.apply(null, arr), series: arr };
  }

  /* ---- その年の食 ---- */
  function eclipses(year) {
    var out = [];
    try {
      var e = A.SearchGlobalSolarEclipse(A.MakeTime(new Date(Date.UTC(year, 0, 1))));
      while (e && e.peak.date.getUTCFullYear() === year) { out.push({ d: e.peak.date, k: '日食' }); e = A.NextGlobalSolarEclipse(e.peak); }
      var l = A.SearchLunarEclipse(A.MakeTime(new Date(Date.UTC(year, 0, 1))));
      while (l && l.peak.date.getUTCFullYear() === year) { out.push({ d: l.peak.date, k: '月食' }); l = A.NextLunarEclipse(l.peak); }
    } catch (err) { /* 取れなくても本文は成立する */ }
    out.sort(function (a, b) { return a.d - b.d; });
    return out;
  }

  /* ---- 太陽が各星座に入る瞬間 ---- */
  function sunIngresses(year) {
    var out = [];
    for (var i = 0; i < 12; i++) {
      var t = A.SearchSunLongitude(i * 30, A.MakeTime(new Date(Date.UTC(year, 0, 1))), 370);
      if (t) out.push({ sign: i, deg: i * 30, date: t.date });
    }
    out.sort(function (a, b) { return a.date - b.date; });
    return out;
  }

  /* ---- 水星の1年ぶんの歩み（逆行の図の元データ） ---- */
  function walk(body, year) {
    var pts = [], retro = [];
    for (var i = 0; i <= 365; i++) pts.push(lonOf(body, new Date(Date.UTC(year, 0, 1) + i * DAY)));
    var un = [pts[0]], acc = 0;
    for (var j = 1; j < pts.length; j++) {
      var diff = wrap180(pts[j] - pts[j - 1]);
      acc += diff;
      un.push(pts[0] + acc);
      if (diff < 0) retro.push(j);
    }
    return { unwrapped: un, retroDays: retro };
  }

  return {
    norm360: norm360, wrap180: wrap180, sph: sph, lonOf: lonOf,
    midYear: midYear, markLon: markLon, precession: precession,
    synodicMean: synodicMean, siderealMean: siderealMean,
    degreesInYear: degreesInYear, moonLatRange: moonLatRange,
    eot: eot, eclipses: eclipses, sunIngresses: sunIngresses, walk: walk
  };
})();
