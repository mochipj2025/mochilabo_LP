/* 星読み — 計算まわり
 *
 * 天体の位置は astronomy-engine (MIT, Don Cross) に計算させています。
 * ハウス（プラシーダス）とアスペクトはこのファイルで組んでいます。
 *
 * 座標系について:
 *   占星術で使う黄道十二宮は「その時点の春分点を基準にした黄経」（＝トロピカル）です。
 *   astronomy-engine では ECT (ecliptic of date, true equinox) がそれに当たるので、
 *   Rotation_EQJ_ECT で変換してから黄経を取り出しています。
 */
window.HOSHI_ASTRO = (function () {
  'use strict';

  var A = window.Astronomy;
  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;

  function norm360(d) { return ((d % 360) + 360) % 360; }

  /* -180..180 に畳む（差分の符号を見たいとき用） */
  function wrap180(d) {
    var x = norm360(d);
    return x > 180 ? x - 360 : x;
  }

  /* 平均黄道傾斜角（度）。章動を無視しているので誤差は 0.003 度未満。
     チャート表示の精度（分角）には影響しません。 */
  function obliquity(time) {
    var T = time.tt / 36525;
    return 23.439291111 - T * (0.0130041667 + T * (1.6667e-7 - T * 5.02778e-7));
  }

  /* 地心黄経（その時点の春分点基準）。単位は度。 */
  function eclipticLon(bodyName, time) {
    var vec = (bodyName === 'Moon') ? A.GeoMoon(time) : A.GeoVector(bodyName, time, true);
    var sph = A.SphereFromVector(A.RotateVector(A.Rotation_EQJ_ECT(time), vec));
    return { lon: norm360(sph.lon), lat: sph.lat };
  }

  /* ---------------- 日時 ---------------- */

  /* 日本の夏時間（1948〜1951年）。この期間だけ標準時が +10 になります。 */
  var JP_DST = [
    ['1948-05-02', '1948-09-11'],
    ['1949-04-03', '1949-09-10'],
    ['1950-05-07', '1950-09-09'],
    ['1951-05-06', '1951-09-08']
  ];

  function isJapanDst(y, m, d) {
    var s = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    for (var i = 0; i < JP_DST.length; i++) {
      if (s >= JP_DST[i][0] && s <= JP_DST[i][1]) return true;
    }
    return false;
  }

  /* 現地時刻 → UTC の Date。offsetHours は現地標準時のUTCオフセット。
     Date.UTC は引数を整数に切り捨てるので、分の小数部は自分でミリ秒に直して足す。 */
  function toUtcDate(y, m, d, hh, mm, offsetHours) {
    var whole = Math.floor(mm);
    var extraMs = Math.round((mm - whole) * 60000);
    return new Date(Date.UTC(y, m - 1, d, hh, whole) + extraMs - offsetHours * 3600 * 1000);
  }

  /* ---------------- ハウス ---------------- */

  /* MC（天頂の黄経）。ramc = 地方恒星時を度にしたもの。 */
  function mcLon(ramc, eps) {
    var r = ramc * D2R, e = eps * D2R;
    return norm360(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) * R2D);
  }

  /* アセンダント（東の地平線と黄道の交点）。 */
  function ascLon(ramc, eps, lat) {
    var r = ramc * D2R, e = eps * D2R, p = lat * D2R;
    var y = Math.cos(r);
    var x = -(Math.sin(r) * Math.cos(e) + Math.tan(p) * Math.sin(e));
    return norm360(Math.atan2(y, x) * R2D);
  }

  /* プラシーダスの中間カスプ。
     カスプは「自分自身の赤緯から決まる出没差(AD)」を含む位置にあるので、
     赤経を仮置き → 黄経 → 赤緯 → AD → 赤経を更新、と収束させます。
       11室: 赤経 = RAMC + 30  + AD/3
       12室: 赤経 = RAMC + 60  + AD*2/3
        2室: 赤経 = RAMC + 120 + AD*2/3
        3室: 赤経 = RAMC + 150 + AD/3
     高緯度で黄道が周極になると解が無いので、その場合は null を返します。 */
  function placidusCusp(ramc, eps, lat, offset, f) {
    var e = eps * D2R, p = lat * D2R;
    var ad = 0, lon = 0;
    for (var i = 0; i < 60; i++) {
      var alpha = norm360(ramc + offset + f * ad) * D2R;
      lon = Math.atan2(Math.sin(alpha), Math.cos(alpha) * Math.cos(e));
      var dec = Math.asin(Math.sin(e) * Math.sin(lon));
      var t = Math.tan(p) * Math.tan(dec);
      if (!isFinite(t) || Math.abs(t) > 1) return null;
      var adNew = Math.asin(t) * R2D;
      if (Math.abs(adNew - ad) < 1e-9) { ad = adNew; break; }
      ad = adNew;
    }
    return norm360(Math.atan2(
      Math.sin(norm360(ramc + offset + f * ad) * D2R),
      Math.cos(norm360(ramc + offset + f * ad) * D2R) * Math.cos(e)
    ) * R2D);
  }

  function houseCusps(ramc, eps, lat) {
    var asc = ascLon(ramc, eps, lat);
    var mc = mcLon(ramc, eps);
    /* MC は本来 ASC から黄道順に約270度先にある。ずれていたら上下が逆なので入れ替える。 */
    if (norm360(mc - asc) < 180) mc = norm360(mc + 180);

    var c11 = placidusCusp(ramc, eps, lat, 30, 1 / 3);
    var c12 = placidusCusp(ramc, eps, lat, 60, 2 / 3);
    var c2 = placidusCusp(ramc, eps, lat, 120, 2 / 3);
    var c3 = placidusCusp(ramc, eps, lat, 150, 1 / 3);

    if (c11 === null || c12 === null || c2 === null || c3 === null) {
      /* 極地などでプラシーダスが破綻する場合はホールサイン（星座＝ハウス）に落とす */
      var start = Math.floor(asc / 30) * 30;
      var cusps = [];
      for (var i = 0; i < 12; i++) cusps.push(norm360(start + i * 30));
      return { cusps: cusps, asc: asc, mc: mc, system: 'whole' };
    }

    var c = new Array(12);
    c[0] = asc; c[1] = c2; c[2] = c3;
    c[9] = mc; c[10] = c11; c[11] = c12;
    c[3] = norm360(c[9] + 180);
    c[4] = norm360(c[10] + 180);
    c[5] = norm360(c[11] + 180);
    c[6] = norm360(c[0] + 180);
    c[7] = norm360(c[1] + 180);
    c[8] = norm360(c[2] + 180);
    return { cusps: c, asc: asc, mc: mc, system: 'placidus' };
  }

  /* 黄経がどのハウスに入るか（1〜12） */
  function houseOf(lon, cusps) {
    for (var i = 0; i < 12; i++) {
      var a = cusps[i];
      var b = cusps[(i + 1) % 12];
      var span = norm360(b - a);
      if (norm360(lon - a) < span) return i + 1;
    }
    return 1;
  }

  /* ---------------- 本体 ---------------- */

  /* input: { year, month, day, hour, minute, lat, lon, tzOffset, timeUnknown } */
  function calculate(input) {
    var offset = input.tzOffset;
    var dstApplied = false;
    if (input.autoJapanDst && isJapanDst(input.year, input.month, input.day)) {
      offset = offset + 1;
      dstApplied = true;
    }

    var hour = input.timeUnknown ? 12 : input.hour;
    var minute = input.timeUnknown ? 0 : input.minute;
    var utc = toUtcDate(input.year, input.month, input.day, hour, minute, offset);
    var time = A.MakeTime(utc);

    var eps = obliquity(time);
    var defs = window.HOSHI_TEXT.planets;
    var bodies = [];

    for (var i = 0; i < defs.length; i++) {
      var def = defs[i];
      var now = eclipticLon(def.body, time);
      var retro = false;
      if (def.key !== 'sun' && def.key !== 'moon') {
        var before = eclipticLon(def.body, A.MakeTime(new Date(utc.getTime() - 43200000)));
        var after = eclipticLon(def.body, A.MakeTime(new Date(utc.getTime() + 43200000)));
        retro = wrap180(after.lon - before.lon) < 0;
      }
      bodies.push({
        def: def,
        lon: now.lon,
        sign: Math.floor(now.lon / 30),
        degInSign: now.lon % 30,
        retro: retro
      });
    }

    /* 時刻不明のときは、その日のうちに月の星座が変わるかどうかを調べておく */
    var moonAmbiguous = null;
    if (input.timeUnknown) {
      var d0 = toUtcDate(input.year, input.month, input.day, 0, 0, offset);
      var d1 = toUtcDate(input.year, input.month, input.day, 23, 59, offset);
      var s0 = Math.floor(eclipticLon('Moon', A.MakeTime(d0)).lon / 30);
      var s1 = Math.floor(eclipticLon('Moon', A.MakeTime(d1)).lon / 30);
      if (s0 !== s1) moonAmbiguous = [s0, s1];
    }

    var result = {
      utc: utc,
      offsetUsed: offset,
      dstApplied: dstApplied,
      timeUnknown: !!input.timeUnknown,
      bodies: bodies,
      moonAmbiguous: moonAmbiguous,
      houses: null
    };

    if (!input.timeUnknown) {
      var gast = A.SiderealTime(time);            /* グリニッジ視恒星時（時間） */
      var ramc = norm360(gast * 15 + input.lon);  /* 地方恒星時（度） */
      var h = houseCusps(ramc, eps, input.lat);
      for (var j = 0; j < bodies.length; j++) {
        bodies[j].house = houseOf(bodies[j].lon, h.cusps);
      }
      result.houses = h;
    }

    result.aspects = findAspects(bodies, result.houses);
    result.balance = balance(bodies);
    return result;
  }

  /* ---------------- アスペクト ---------------- */

  function findAspects(bodies, houses) {
    var types = window.HOSHI_TEXT.aspects;
    var out = [];

    function orbFor(type, aKey, bKey) {
      var orb = type.orb;
      if (aKey === 'sun' || aKey === 'moon' || bKey === 'sun' || bKey === 'moon') orb += 2;
      return orb;
    }

    function test(aName, aKey, aLon, bName, bKey, bLon, isPoint) {
      var diff = Math.abs(wrap180(aLon - bLon));
      for (var t = 0; t < types.length; t++) {
        var type = types[t];
        var target = type.deg > 180 ? 360 - type.deg : type.deg;
        var orb = isPoint ? Math.max(4, type.orb - 1) : orbFor(type, aKey, bKey);
        var gap = Math.abs(diff - target);
        if (gap <= orb) {
          out.push({
            a: aName, b: bName, aKey: aKey, bKey: bKey,
            type: type, orb: gap, exact: gap < 1
          });
          return;
        }
      }
    }

    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        var A1 = bodies[i], B1 = bodies[j];
        /* 世代天体どうしの角度は同世代全員に共通なので、個人の読みからは外す */
        if (A1.def.generation && B1.def.generation) continue;
        test(A1.def.name, A1.def.key, A1.lon, B1.def.name, B1.def.key, B1.lon, false);
      }
    }

    if (houses) {
      for (var k = 0; k < bodies.length; k++) {
        test(bodies[k].def.name, bodies[k].def.key, bodies[k].lon, 'アセンダント', 'asc', houses.asc, true);
        test(bodies[k].def.name, bodies[k].def.key, bodies[k].lon, 'MC', 'mc', houses.mc, true);
      }
    }

    out.sort(function (x, y) { return x.orb - y.orb; });
    return out;
  }

  /* ---------------- エレメント／クオリティの偏り ---------------- */

  function balance(bodies) {
    var signs = window.HOSHI_TEXT.signs;
    var el = { '火': 0, '地': 0, '風': 0, '水': 0 };
    var qu = { '活動': 0, '不動': 0, '柔軟': 0 };
    for (var i = 0; i < bodies.length; i++) {
      var s = signs[bodies[i].sign];
      el[s.element]++;
      qu[s.quality]++;
    }
    return { elements: el, qualities: qu };
  }

  /* ---------------- 表示補助 ---------------- */

  function formatDeg(degInSign) {
    var d = Math.floor(degInSign);
    var m = Math.round((degInSign - d) * 60);
    if (m === 60) { m = 0; d += 1; }
    return d + '°' + String(m).padStart(2, '0') + "'";
  }

  return {
    calculate: calculate,
    formatDeg: formatDeg,
    norm360: norm360,
    isJapanDst: isJapanDst
  };
})();
