// astro.js の検算。ブラウザ用の UMD を node から読ませる。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'assets');
const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// astronomy-engine (UMD) — module/exports が無い環境として window に生やす
vm.runInContext(fs.readFileSync(path.join(ROOT, 'vendor/astronomy.browser.min.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'text.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'astro.js'), 'utf8'), sandbox);

const Astronomy = sandbox.window.Astronomy || sandbox.Astronomy;
const ASTRO = sandbox.window.HOSHI_ASTRO;
const TEXT = sandbox.window.HOSHI_TEXT;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}
const norm360 = d => ((d % 360) + 360) % 360;
const wrap180 = d => { const x = norm360(d); return x > 180 ? x - 360 : x; };

// 黄経(その時点の黄道・黄緯0) → その時点の赤道座標
function eclToEqd(lonDeg, when) {
  const v = Astronomy.VectorFromSphere(new Astronomy.Spherical(0, lonDeg, 1), when);
  return Astronomy.EquatorFromVector(Astronomy.RotateVector(Astronomy.Rotation_ECT_EQD(when), v));
}
// Date → calculate() の入力（秒を分の小数として渡す）
function fromDate(d, lat, lon) {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hour: d.getUTCHours(), minute: d.getUTCMinutes() + d.getUTCSeconds() / 60 + d.getUTCMilliseconds() / 60000,
    lat, lon, tzOffset: 0, timeUnknown: false };
}

console.log('\n[1] 太陽黄経が季節と合っているか');
{
  const cases = [
    ['2000-03-20T07:35:00Z', 0,   '春分'],
    ['2000-06-21T01:48:00Z', 90,  '夏至'],
    ['2000-09-22T17:28:00Z', 180, '秋分'],
    ['2000-12-21T13:37:00Z', 270, '冬至'],
  ];
  for (const [iso, expect, name] of cases) {
    const r = ASTRO.calculate({
      year: +iso.slice(0,4), month: +iso.slice(5,7), day: +iso.slice(8,10),
      hour: +iso.slice(11,13), minute: +iso.slice(14,16),
      lat: 35.69, lon: 139.69, tzOffset: 0, timeUnknown: false
    });
    const sun = r.bodies.find(b => b.def.key === 'sun').lon;
    const err = Math.abs(wrap180(sun - expect)) * 60; // 分角
    check(`${name}の太陽 = ${sun.toFixed(4)}°`, err < 3, `誤差 ${err.toFixed(2)}分角`);
  }
}

console.log('\n[2] 日の出の瞬間、アセンダント ≈ 太陽の黄経');
{
  const obs = new Astronomy.Observer(35.69, 139.69, 40);
  for (const iso of ['1975-04-11T00:00:00Z', '1990-11-03T00:00:00Z', '2026-07-31T00:00:00Z']) {
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, new Date(iso), 2);
    const r = ASTRO.calculate(fromDate(rise.date, 35.69, 139.69));
    const sun = r.bodies.find(b => b.def.key === 'sun').lon;
    const diff = Math.abs(wrap180(r.houses.asc - sun));
    // 大気差(約34分角)＋太陽の視半径のぶん、日の出は幾何学的な地平線より少し早い。
    // 黄道の傾きで増幅されるため 3度以内なら合格とみなす。
    check(`${iso.slice(0,10)} ASC=${r.houses.asc.toFixed(2)}° 太陽=${sun.toFixed(2)}°`,
      diff < 3.0, `差 ${diff.toFixed(2)}°`);
  }
}

console.log('\n[3] 南中の瞬間、MC ≈ 太陽の黄経');
{
  const obs = new Astronomy.Observer(35.69, 139.69, 40);
  for (const iso of ['1975-04-11T00:00:00Z', '1990-11-03T00:00:00Z', '2026-07-31T00:00:00Z']) {
    const cul = Astronomy.SearchHourAngle(Astronomy.Body.Sun, obs, 0, new Date(iso));
    const r = ASTRO.calculate(fromDate(cul.time.date, 35.69, 139.69));
    const sun = r.bodies.find(b => b.def.key === 'sun').lon;
    const diff = Math.abs(wrap180(r.houses.mc - sun));
    check(`${iso.slice(0,10)} MC=${r.houses.mc.toFixed(3)}° 太陽=${sun.toFixed(3)}°`,
      diff < 0.05, `差 ${(diff*60).toFixed(2)}分角`);
  }
}

console.log('\n[4] ハウスカスプが黄道順に並んでいるか（東京・無作為な日時）');
{
  let bad = 0, sampled = 0;
  for (let y = 1930; y <= 2025; y += 5) {
    for (let mo = 1; mo <= 12; mo += 3) {
      for (let h = 0; h < 24; h += 5) {
        const r = ASTRO.calculate({ year: y, month: mo, day: 15, hour: h, minute: 0,
          lat: 35.69, lon: 139.69, tzOffset: 9, timeUnknown: false });
        sampled++;
        const c = r.houses.cusps;
        let total = 0;
        for (let i = 0; i < 12; i++) {
          const span = norm360(c[(i+1)%12] - c[i]);
          total += span;
          if (span < 1 || span > 120) bad++;
        }
        if (Math.abs(total - 360) > 1e-6) bad++;
      }
    }
  }
  check(`${sampled}件のカスプ配置`, bad === 0, `異常 ${bad}件`);
}

console.log('\n[5] 赤道上ではプラシーダスのカスプが赤経で30度ずつ並ぶか');
{
  const when = new Date(Date.UTC(2000, 5, 15, 8, 0));
  const r = ASTRO.calculate({ year: 2000, month: 6, day: 15, hour: 8, minute: 0,
    lat: 0.0, lon: 0.0, tzOffset: 0, timeUnknown: false });
  check('ハウスシステム = placidus', r.houses.system === 'placidus');
  let worst = 0;
  for (let i = 0; i < 12; i++) {
    const a = eclToEqd(r.houses.cusps[i], when).ra * 15;
    const b = eclToEqd(r.houses.cusps[(i + 1) % 12], when).ra * 15;
    worst = Math.max(worst, Math.abs(norm360(b - a) - 30));
  }
  check('隣り合うカスプの赤経差 = 30度', worst < 0.02, `最大ずれ ${(worst*60).toFixed(2)}分角`);
}

console.log('\n[5b] ASC は本当に東の地平線上か / MC は本当に子午線上か');
{
  const cases = [
    [1975, 4, 11, 6, 23, 35.69, 139.69],
    [1990, 11, 3, 21, 5, 43.06, 141.35],
    [2003, 1, 20, 3, 47, 26.21, 127.68],
    [1958, 8, 30, 14, 12, 33.61, 130.42],
  ];
  for (const [y, mo, d, h, mi, lat, lon] of cases) {
    const r = ASTRO.calculate({ year: y, month: mo, day: d, hour: h, minute: mi,
      lat, lon, tzOffset: 9, timeUnknown: false });
    const when = r.utc;
    const obs = new Astronomy.Observer(lat, lon, 0);

    const eqAsc = eclToEqd(r.houses.asc, when);
    const hzAsc = Astronomy.Horizon(when, obs, eqAsc.ra, eqAsc.dec, null);
    const eqMc = eclToEqd(r.houses.mc, when);
    const gast = Astronomy.SiderealTime(when);
    const haMc = wrap180(norm360(gast * 15 + lon) - eqMc.ra * 15);

    const tag = `${y}-${mo}-${d} ${h}:${mi}`;
    check(`${tag} ASC の高度 ≈ 0`, Math.abs(hzAsc.altitude) < 0.02,
      `高度 ${(hzAsc.altitude*60).toFixed(2)}分角 / 方位 ${hzAsc.azimuth.toFixed(1)}°`);
    check(`${tag} ASC が東半分の空`, hzAsc.azimuth > 0 && hzAsc.azimuth < 180,
      `方位 ${hzAsc.azimuth.toFixed(1)}°`);
    check(`${tag} MC の時角 ≈ 0`, Math.abs(haMc) < 0.02, `時角 ${(haMc*60).toFixed(2)}分角`);
  }
}

console.log('\n[5c] プラシーダスのカスプが半弧を3等分しているか');
{
  const cases = [
    [1975, 4, 11, 6, 23, 35.69, 139.69],
    [1990, 11, 3, 21, 5, 43.06, 141.35],
    [1958, 8, 30, 14, 12, 33.61, 130.42],
  ];
  //  11室=MCから昼の半弧の1/3、12室=2/3、2室=ASCから夜の半弧の1/3、3室=2/3
  const spec = [[10, 1/3, 'day'], [11, 2/3, 'day'], [1, 1/3, 'night'], [2, 2/3, 'night']];
  for (const [y, mo, d, h, mi, lat, lon] of cases) {
    const r = ASTRO.calculate({ year: y, month: mo, day: d, hour: h, minute: mi,
      lat, lon, tzOffset: 9, timeUnknown: false });
    const when = r.utc;
    const ramc = norm360(Astronomy.SiderealTime(when) * 15 + lon);
    let worst = 0;
    for (const [idx, f, kind] of spec) {
      const eq = eclToEqd(r.houses.cusps[idx], when);
      const ha = wrap180(ramc - eq.ra * 15);              // 子午線からの時角（負＝東）
      const ad = Math.asin(Math.tan(lat*Math.PI/180) * Math.tan(eq.dec*Math.PI/180)) * 180/Math.PI;
      const dsa = 90 + ad, nsa = 90 - ad;
      const want = (kind === 'day') ? -dsa * f : -(dsa + nsa * f);
      worst = Math.max(worst, Math.abs(wrap180(ha - want)));
    }
    check(`${y}-${mo}-${d} の中間カスプ`, worst < 0.01, `最大ずれ ${(worst*60).toFixed(3)}分角`);
  }
}

console.log('\n[6] 天体位置のスポットチェック（2026-07-31 12:00 JST 東京）');
{
  const r = ASTRO.calculate({ year: 2026, month: 7, day: 31, hour: 12, minute: 0,
    lat: 35.69, lon: 139.69, tzOffset: 9, timeUnknown: false });
  for (const b of r.bodies) {
    console.log(`       ${b.def.name.padEnd(4,'　')} ${TEXT.signs[b.sign].name} ${ASTRO.formatDeg(b.degInSign)}`
      + `${b.retro ? ' 逆行' : ''}  ${b.house}室`);
  }
  console.log(`       ASC ${TEXT.signs[Math.floor(r.houses.asc/30)].name} ${ASTRO.formatDeg(r.houses.asc%30)}`);
  console.log(`       MC  ${TEXT.signs[Math.floor(r.houses.mc/30)].name} ${ASTRO.formatDeg(r.houses.mc%30)}`);
  const sun = r.bodies.find(b => b.def.key === 'sun');
  check('太陽が獅子座', TEXT.signs[sun.sign].name === '獅子座');
}

console.log('\n[7] 日本の夏時間 (1948-1951)');
{
  check('1949-07-01 は夏時間', ASTRO.isJapanDst(1949, 7, 1) === true);
  check('1949-01-01 は夏時間ではない', ASTRO.isJapanDst(1949, 1, 1) === false);
  check('1960-07-01 は夏時間ではない', ASTRO.isJapanDst(1960, 7, 1) === false);
  const r = ASTRO.calculate({ year: 1949, month: 7, day: 1, hour: 12, minute: 0,
    lat: 35.69, lon: 139.69, tzOffset: 9, autoJapanDst: true, timeUnknown: false });
  check('夏時間が適用され UTC+10 扱い', r.dstApplied === true && r.offsetUsed === 10);
}

console.log('\n[8] 時刻不明モード');
{
  const r = ASTRO.calculate({ year: 1988, month: 3, day: 5, hour: 0, minute: 0,
    lat: 35.69, lon: 139.69, tzOffset: 9, timeUnknown: true });
  check('ハウスを出していない', r.houses === null);
  check('全天体の house が undefined', r.bodies.every(b => b.house === undefined));
  console.log('       月の星座が割れる日か:', r.moonAmbiguous ? '割れる' : '割れない');
}

console.log('\n' + (fails === 0 ? '=> すべて通過' : `=> ${fails}件 失敗`));
process.exit(fails === 0 ? 0 : 1);

