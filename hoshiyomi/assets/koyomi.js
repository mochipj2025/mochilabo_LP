/* 星読み — 暦の土台
 *
 * 四柱推命・宿曜・九星気学・紫微斗数の4つが、全部このファイルに乗る。
 * 中身は「日付の変換」だけで、占いの解釈は一切入れていない。
 *
 *   ・二十四節気   … 太陽黄経が15度の倍数になる瞬間を直接求める（節入り表を使わない）
 *   ・六十干支     … 年・月・日・時の4つ
 *   ・旧暦         … 冬至を含む月を11月とする、現行の置閏法
 *   ・真太陽時     … 経度差と均時差をまとめて、太陽の時角から直接出す
 *
 * 切れ目の扱い:
 *   年と月（節月）は、節入りの「瞬間」で切る。立春が23時10分なら、その日の22時生まれは前年。
 *   日と旧暦は、日本標準時の0時で切る。
 */
window.HOSHI_KOYOMI = (function () {
  'use strict';

  var A = window.Astronomy;
  var DAY = 86400000;
  var JST = 9;

  var KAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var SHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var KAN_ELEM = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  var KAN_YIN = [false, true, false, true, false, true, false, true, false, true]; /* true = 陰 */
  var SHI_ELEM = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
  /* 十二支を画面に出すときは、この動物名のほうを使う。「午」より「馬」のほうが伝わる。 */
  var SHI_ANIMAL = ['ねずみ', '牛', '虎', 'うさぎ', '龍', 'へび', '馬', '羊', 'さる', 'とり', '犬', 'いのしし'];

  /* 二十四節気。index 0 = 立春（太陽黄経315度）、以降15度ずつ。
     偶数が「節」で節月の始まり、奇数が「中気」。 */
  var TERMS = [
    '立春', '雨水', '啓蟄', '春分', '清明', '穀雨',
    '立夏', '小満', '芒種', '夏至', '小暑', '大暑',
    '立秋', '処暑', '白露', '秋分', '寒露', '霜降',
    '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
  ];
  function termLon(i) { return (315 + 15 * i) % 360; }

  /* 節月の始まりになる12の「節」と、それが始める月支。立春→寅、啓蟄→卯、…、小寒→丑 */
  var SETSU = [];
  for (var si = 0; si < 24; si += 2) SETSU.push({ term: si, shi: (2 + si / 2) % 12 });

  /* ================= 日付の基本 ================= */

  /* グレゴリオ暦 → ユリウス通日（整数） */
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
      Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  function ymdFromJdn(n) {
    var a = n + 32044;
    var b = Math.floor((4 * a + 3) / 146097);
    var c = a - Math.floor(146097 * b / 4);
    var d2 = Math.floor((4 * c + 3) / 1461);
    var e = c - Math.floor(1461 * d2 / 4);
    var m2 = Math.floor((5 * e + 2) / 153);
    return {
      d: e - Math.floor((153 * m2 + 2) / 5) + 1,
      m: m2 + 3 - 12 * Math.floor(m2 / 10),
      y: 100 * b + d2 - 4800 + Math.floor(m2 / 10)
    };
  }

  /* ある瞬間が、日本時間でどの日に属するか → その日の JDN */
  function jdnOfJst(date) {
    var t = new Date(date.getTime() + JST * 3600000);
    return jdn(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }

  /* 日の干支。0 = 甲子。基準は2019年1月27日の甲子。 */
  function dayGanshi(y, m, d) {
    return ((jdn(y, m, d) + 49) % 60 + 60) % 60;
  }

  /* ================= 節気 ================= */

  var termCache = {};

  /* year年の termIndex番目の節気が来る瞬間（UTC Date）。
     index 0 = その年の立春。index 21 = その年12月の冬至。 */
  function termTime(year, termIndex) {
    var key = year + ':' + termIndex;
    if (termCache[key]) return termCache[key];
    var approxMonth = 2 + Math.floor(termIndex / 2);
    var approxDay = (termIndex % 2 === 0) ? 5 : 20;
    var y2 = year;
    if (approxMonth > 12) { approxMonth -= 12; y2 += 1; }
    var from = new Date(Date.UTC(y2, approxMonth - 1, approxDay) - 20 * DAY);
    var t = A.SearchSunLongitude(termLon(termIndex), A.MakeTime(from), 45);
    if (!t) throw new Error('節気が見つかりません: ' + year + ' ' + TERMS[termIndex]);
    termCache[key] = t.date;
    return t.date;
  }

  function sunLon(date) {
    var time = A.MakeTime(date);
    var v = A.RotateVector(A.Rotation_EQJ_ECT(time), A.GeoVector('Sun', time, true));
    return ((A.SphereFromVector(v).lon % 360) + 360) % 360;
  }

  /* from より後で最初に来る中気（太陽黄経が30の倍数になる瞬間） */
  function nextZhongqi(from) {
    var lon = sunLon(from);
    var target = (Math.ceil((lon - 1e-6) / 30) * 30) % 360;
    var t = A.SearchSunLongitude(target, A.MakeTime(from), 40);
    return t ? t.date : null;
  }

  /* その瞬間が属する節月。戻り値 { termIndex, shi, start, name } */
  function setsuMonthAt(utc, y) {
    for (var back = 0; back <= 1; back++) {
      var yr = y - back;
      for (var i = SETSU.length - 1; i >= 0; i--) {
        var t = termTime(yr, SETSU[i].term);
        if (t.getTime() <= utc.getTime()) {
          return { termIndex: SETSU[i].term, shi: SETSU[i].shi, start: t, name: TERMS[SETSU[i].term] };
        }
      }
    }
    throw new Error('節月が決まりません');
  }

  /* 立春を境にした年。立春の瞬間より前なら前年。 */
  function risshunYearAt(utc, y) {
    return utc.getTime() < termTime(y, 0).getTime() ? y - 1 : y;
  }

  /* ================= 四つの柱 ================= */

  function yearGanshi(risshunY) { return ((risshunY - 1984) % 60 + 60) % 60; }

  /* 月干支。月支は節月で決まり、月干は年干から決まる。
     甲己年は丙寅月から、乙庚年は戊寅月から、以下2つずつずれる。 */
  function monthGanshi(yearKan, monthShi) {
    var baseKan = (yearKan % 5) * 2 + 2;
    var step = ((monthShi - 2) % 12 + 12) % 12;
    return ganshiIndex((baseKan + step) % 10, monthShi);
  }

  /* 時干支。23時〜1時が子。時干は日干から決まる。 */
  function hourGanshi(dayKan, hour24) {
    var shi = Math.floor(((hour24 + 1) % 24) / 2) % 12;
    return ganshiIndex(((dayKan % 5) * 2 + shi) % 10, shi);
  }

  /* 干と支の組から60干支の通し番号へ */
  function ganshiIndex(kan, shi) {
    for (var i = 0; i < 60; i++) if (i % 10 === kan && i % 12 === shi) return i;
    throw new Error('ありえない干支: ' + kan + ',' + shi);
  }

  function ganshiName(i) { return KAN[i % 10] + SHI[i % 12]; }

  /* ================= 真太陽時 ================= */

  /* 時計の時刻を、その土地で太陽が真南に来る瞬間を12時とする時刻に直す。
     太陽の時角から直接出しているので、経度差も均時差も一度に入る。 */
  function trueSolarHour(utcDate, lonEast) {
    var time = A.MakeTime(utcDate);
    var eq = A.Equator('Sun', time, new A.Observer(0, lonEast, 0), true, true);
    var ha = ((A.SiderealTime(time) * 15 + lonEast - eq.ra * 15) % 360 + 360) % 360;
    return (((ha / 15 + 12) % 24) + 24) % 24;
  }

  /* ================= 旧暦 ================= */

  /* その日（日本時間）以前で最も新しい朔。日単位で比べる。 */
  function newMoonOnOrBefore(date) {
    var limit = jdnOfJst(date);
    var t = A.SearchMoonPhase(0, A.MakeTime(new Date(date.getTime() - 45 * DAY)), 46);
    var best = null;
    while (t && jdnOfJst(t.date) <= limit) {
      best = t.date;
      t = A.SearchMoonPhase(0, A.MakeTime(new Date(t.date.getTime() + 2 * DAY)), 35);
    }
    if (!best) throw new Error('朔が見つかりません');
    return best;
  }

  function nextNewMoon(after) {
    var t = A.SearchMoonPhase(0, A.MakeTime(new Date(after.getTime() + 2 * DAY)), 35);
    if (!t) throw new Error('次の朔が見つかりません');
    return t.date;
  }

  /* 旧暦。冬至を含む月を11月とし、11月から次の11月までが13か月なら、
     中気を含まない最初の月を閏月にする（現行の置閏法）。 */
  function lunar(y, m, d) {
    var target = jdn(y, m, d);

    /* target を含む「11月から次の11月まで」の区間を決める */
    var wsYear = y;
    var ws = termTime(wsYear, 21);
    var m11 = newMoonOnOrBefore(ws);
    if (jdnOfJst(m11) > target) {
      wsYear = y - 1;
      ws = termTime(wsYear, 21);
      m11 = newMoonOnOrBefore(ws);
    }
    var m11next = newMoonOnOrBefore(termTime(wsYear + 1, 21));

    /* 区間内の朔を並べる */
    var moons = [m11], cur = m11;
    while (true) {
      cur = nextNewMoon(cur);
      if (jdnOfJst(cur) >= jdnOfJst(m11next)) break;
      moons.push(cur);
    }

    /* 13か月なら、中気を含まない最初の月が閏月 */
    var leapAt = -1;
    if (moons.length === 13) {
      for (var i = 0; i < 13; i++) {
        var end = (i + 1 < 13) ? moons[i + 1] : m11next;
        var zq = nextZhongqi(moons[i]);
        if (!zq || jdnOfJst(zq) >= jdnOfJst(end)) { leapAt = i; break; }
      }
    }

    /* 月番号を振る。moons[0] が11月。 */
    var num = 11, found = null;
    for (var j = 0; j < moons.length; j++) {
      var isLeap = false;
      if (j > 0) {
        if (j === leapAt) isLeap = true;        /* 前の月と同じ番号のまま閏に */
        else num = num % 12 + 1;
      }
      var st = moons[j];
      var en = (j + 1 < moons.length) ? moons[j + 1] : m11next;
      if (target >= jdnOfJst(st) && target < jdnOfJst(en)) {
        found = { month: num, leap: isLeap, day: target - jdnOfJst(st) + 1, start: st };
        break;
      }
    }
    if (!found) throw new Error('旧暦が決まりません');

    /* 旧暦の年。11月・12月は冬至の年、1〜10月は翌年。 */
    found.year = (found.month >= 11) ? wsYear : wsYear + 1;
    found.monthsInYear = moons.length;
    return found;
  }

  /* ================= まとめ ================= */

  /* input: { year, month, day, hour, minute, lon, tzOffset, timeUnknown, useTrueSolar } */
  function build(input) {
    var y = input.year, m = input.month, d = input.day;
    var hh = input.timeUnknown ? 12 : input.hour;
    var mm = input.timeUnknown ? 0 : input.minute;
    var utc = new Date(Date.UTC(y, m - 1, d, hh, mm) - input.tzOffset * 3600000);

    var clockHour = input.timeUnknown ? null : input.hour + input.minute / 60;
    var solarHour = input.timeUnknown ? null : trueSolarHour(utc, input.lon);

    var ry = risshunYearAt(utc, y);
    var sm = setsuMonthAt(utc, y);
    var yg = yearGanshi(ry);
    var mg = monthGanshi(yg % 10, sm.shi);
    var dg = dayGanshi(y, m, d);

    var usedHour = null, hg = null;
    if (!input.timeUnknown) {
      usedHour = input.useTrueSolar ? solarHour : clockHour;
      /* 23時台は子の刻。日柱を翌日へ送るかは流派が割れるので、
         日本で多い「日柱は0時で変わる」を採る。 */
      hg = hourGanshi(dg % 10, Math.floor(usedHour));
    }

    return {
      utc: utc,
      tzOffset: input.tzOffset,
      jdn: jdn(y, m, d),
      risshunYear: ry,
      setsu: sm,
      pillars: { year: yg, month: mg, day: dg, hour: hg },
      clockHour: clockHour,
      solarHour: solarHour,
      usedHour: usedHour,
      lunar: lunar(y, m, d),
      timeUnknown: !!input.timeUnknown
    };
  }

  return {
    KAN: KAN, SHI: SHI, KAN_ELEM: KAN_ELEM, KAN_YIN: KAN_YIN,
    SHI_ELEM: SHI_ELEM, SHI_ANIMAL: SHI_ANIMAL,
    TERMS: TERMS, SETSU: SETSU,
    jdn: jdn, ymdFromJdn: ymdFromJdn, jdnOfJst: jdnOfJst,
    dayGanshi: dayGanshi, yearGanshi: yearGanshi, monthGanshi: monthGanshi,
    hourGanshi: hourGanshi, ganshiIndex: ganshiIndex, ganshiName: ganshiName,
    termTime: termTime, setsuMonthAt: setsuMonthAt, risshunYearAt: risshunYearAt,
    trueSolarHour: trueSolarHour, lunar: lunar, sunLon: sunLon,
    newMoonOnOrBefore: newMoonOnOrBefore,
    build: build
  };
})();
