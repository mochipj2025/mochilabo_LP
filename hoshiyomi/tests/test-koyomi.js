// 暦の土台（節気・干支・旧暦・真太陽時）の検算。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'assets');
const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['vendor/astronomy.browser.min.js', 'koyomi.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
}
const Astronomy = sandbox.window.Astronomy || sandbox.Astronomy;
const K = sandbox.window.HOSHI_KOYOMI;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}
const jstStr = d => {
  const t = new Date(d.getTime() + 9 * 3600000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(t.getUTCDate()).padStart(2,'0')} `
       + `${String(t.getUTCHours()).padStart(2,'0')}:${String(t.getUTCMinutes()).padStart(2,'0')}`;
};

console.log('\n[1] 日の干支の基準（独立な2つの資料が一致するか）');
{
  // 資料A: 2019年1月27日が甲子の日
  // 資料B: 1873年1月12日が甲子の日   ← 60の倍数日ぶん離れていれば両立する
  check('2019-01-27 が甲子', K.ganshiName(K.dayGanshi(2019, 1, 27)) === '甲子',
    K.ganshiName(K.dayGanshi(2019, 1, 27)));
  check('1873-01-12 が甲子', K.ganshiName(K.dayGanshi(1873, 1, 12)) === '甲子',
    K.ganshiName(K.dayGanshi(1873, 1, 12)));
  const gap = K.jdn(2019, 1, 27) - K.jdn(1873, 1, 12);
  check('2つの基準日の間隔が60の倍数', gap % 60 === 0, `${gap}日 = 60 × ${gap/60}`);
  // 連続性: 1日進めば干支も1つ進む
  let cont = true;
  for (let i = 0; i < 500; i++) {
    const a = K.dayGanshi(2019, 1, 27) ;
    const j0 = K.jdn(2020, 3, 1) + i, j1 = j0 + 1;
    const y0 = K.ymdFromJdn(j0), y1 = K.ymdFromJdn(j1);
    if ((K.dayGanshi(y0.y, y0.m, y0.d) + 1) % 60 !== K.dayGanshi(y1.y, y1.m, y1.d)) cont = false;
  }
  check('500日ぶん、1日ごとに干支が1つ進む', cont);
}

console.log('\n[2] 年の干支');
{
  const cases = [[1984,'甲子'], [2024,'甲辰'], [2025,'乙巳'], [1988,'戊辰'], [1926,'丙寅'], [2026,'丙午']];
  for (const [y, want] of cases) {
    const got = K.ganshiName(K.yearGanshi(y));
    check(`${y}年 = ${want}`, got === want, got);
  }
}

console.log('\n[3] 節気の日付（立春・春分・冬至）');
{
  // 2025年の立春は2月3日23時10分。節分が2月2日になった年として広く報じられたもの。
  const cases = [
    [2025, 0, '2025-02-03', '立春'],
    [2024, 0, '2024-02-04', '立春'],
    [2023, 0, '2023-02-04', '立春'],
    [2021, 0, '2021-02-03', '立春'],
    [2026, 0, '2026-02-04', '立春'],
    [2026, 3, '2026-03-20', '春分'],
    [2025, 21, '2025-12-22', '冬至'],
    [2024, 21, '2024-12-21', '冬至'],
  ];
  for (const [y, idx, want, name] of cases) {
    const got = jstStr(K.termTime(y, idx));
    check(`${y}年の${name} = ${want}`, got.slice(0, 10) === want, got + ' JST');
  }
  const r2025 = jstStr(K.termTime(2025, 0));
  check('2025年の立春は23時台', r2025.slice(11, 13) === '23', r2025 + ' JST');
}

console.log('\n[4] 立春の「瞬間」で年柱が切れるか');
{
  // 2025年の立春は 2/3 23:10。その前後で年柱が甲辰→乙巳に変わるはず。
  const before = K.build({ year: 2025, month: 2, day: 3, hour: 22, minute: 0,
    lon: 139.69, tzOffset: 9, timeUnknown: false, useTrueSolar: false });
  const after = K.build({ year: 2025, month: 2, day: 3, hour: 23, minute: 30,
    lon: 139.69, tzOffset: 9, timeUnknown: false, useTrueSolar: false });
  check('2/3 22:00生まれ → 甲辰年', K.ganshiName(before.pillars.year) === '甲辰',
    K.ganshiName(before.pillars.year));
  check('2/3 23:30生まれ → 乙巳年', K.ganshiName(after.pillars.year) === '乙巳',
    K.ganshiName(after.pillars.year));
  check('同じく月支も 丑 → 寅', K.SHI[before.setsu.shi] === '丑' && K.SHI[after.setsu.shi] === '寅',
    K.SHI[before.setsu.shi] + ' / ' + K.SHI[after.setsu.shi]);
}

console.log('\n[5] 旧正月（旧暦1月1日）が実際の春節と合うか');
{
  const cases = [
    ['1990-01-27'], ['2000-02-05'], ['2010-02-14'], ['2020-01-25'],
    ['2021-02-12'], ['2022-02-01'], ['2023-01-22'], ['2024-02-10'],
    ['2025-01-29'], ['2026-02-17']
  ];
  for (const [iso] of cases) {
    const [y, m, d] = iso.split('-').map(Number);
    const l = K.lunar(y, m, d);
    check(`${iso} が旧暦1月1日`, l.month === 1 && l.day === 1 && !l.leap,
      `旧暦 ${l.year}年${l.leap ? '閏' : ''}${l.month}月${l.day}日`);
  }
}

console.log('\n[6] 中秋の名月（旧暦8月15日）');
{
  for (const iso of ['2021-09-21', '2022-09-10', '2023-09-29', '2024-09-17', '2025-10-06']) {
    const [y, m, d] = iso.split('-').map(Number);
    const l = K.lunar(y, m, d);
    check(`${iso} が旧暦8月15日`, l.month === 8 && l.day === 15 && !l.leap,
      `旧暦 ${l.leap ? '閏' : ''}${l.month}月${l.day}日`);
  }
}

console.log('\n[7] 閏月');
{
  // 2017年は閏五月、2020年は閏四月、2023年は閏二月
  const cases = [
    ['2017-07-01', 5], ['2020-05-25', 4], ['2023-03-25', 2]
  ];
  for (const [iso, wantMonth] of cases) {
    const [y, m, d] = iso.split('-').map(Number);
    const l = K.lunar(y, m, d);
    check(`${iso} が閏${wantMonth}月`, l.leap && l.month === wantMonth,
      `旧暦 ${l.year}年${l.leap ? '閏' : ''}${l.month}月${l.day}日`);
  }
  // 平年に閏がつかないこと
  const n = K.lunar(2024, 6, 15);
  check('2024-06-15 は閏月ではない', !n.leap, `${n.month}月${n.day}日`);
}

console.log('\n[8] 旧暦の連続性（1年ぶん、日が飛ばないか）');
{
  let bad = 0, prev = null, sample = 0;
  for (let i = 0; i < 800; i++) {
    const { y, m, d } = K.ymdFromJdn(K.jdn(2022, 1, 1) + i);
    const l = K.lunar(y, m, d);
    sample++;
    if (l.day < 1 || l.day > 30) bad++;
    if (prev) {
      const ok = (l.day === prev.day + 1) || (l.day === 1 && prev.day >= 29);
      if (!ok) bad++;
    }
    prev = l;
  }
  check(`${sample}日ぶん連続`, bad === 0, `異常 ${bad}件`);
}

console.log('\n[9] 真太陽時');
{
  // 太陽が南中した瞬間の真太陽時は、定義上ちょうど12時になる
  for (const [iso, lat, lon] of [
    ['1975-04-11T00:00:00Z', 35.69, 139.69],
    ['1990-11-03T00:00:00Z', 34.69, 135.19],
    ['2026-07-31T00:00:00Z', 26.21, 127.68],
  ]) {
    const obs = new Astronomy.Observer(lat, lon, 0);
    const cul = Astronomy.SearchHourAngle(Astronomy.Body.Sun, obs, 0, new Date(iso));
    const h = K.trueSolarHour(cul.time.date, lon);
    check(`南中時の真太陽時 = 12時（経度${lon}）`, Math.abs(h - 12) < 0.001,
      `${h.toFixed(5)}時（ずれ ${((h-12)*3600).toFixed(1)}秒）`);
  }
  // 東京(139.69E)は明石(135E)より約18.8分早い
  const utc = new Date(Date.UTC(2026, 5, 13, 3, 0)); // 6/13 12:00 JST（均時差がほぼ0の頃）
  const tokyo = K.trueSolarHour(utc, 139.69);
  const akashi = K.trueSolarHour(utc, 135.0);
  check('東京と明石の差 ≈ 18.8分', Math.abs((tokyo - akashi) * 60 - 18.76) < 0.1,
    `${((tokyo - akashi) * 60).toFixed(2)}分`);
  check('明石の6/13正午は真太陽時でもほぼ正午', Math.abs(akashi - 12) * 60 < 2,
    `${akashi.toFixed(4)}時（ずれ ${((akashi-12)*60).toFixed(2)}分）`);
}

console.log('\n[10] 四柱をひととおり組む');
{
  const b = K.build({ year: 1988, month: 3, day: 5, hour: 14, minute: 25,
    lon: 135.52, tzOffset: 9, timeUnknown: false, useTrueSolar: true });
  const p = b.pillars;
  console.log(`       年 ${K.ganshiName(p.year)} / 月 ${K.ganshiName(p.month)} / 日 ${K.ganshiName(p.day)} / 時 ${K.ganshiName(p.hour)}`);
  console.log(`       節月 ${b.setsu.name}（${K.SHI[b.setsu.shi]}月） 節入り ${jstStr(b.setsu.start)} JST`);
  console.log(`       旧暦 ${b.lunar.year}年${b.lunar.leap?'閏':''}${b.lunar.month}月${b.lunar.day}日`);
  console.log(`       時計 14:25 → 真太陽時 ${Math.floor(b.solarHour)}:${String(Math.round(b.solarHour%1*60)).padStart(2,'0')}`);
  check('1988年は戊辰年', K.ganshiName(p.year) === '戊辰', K.ganshiName(p.year));
  check('3月5日は啓蟄前なので卯月ではなく寅月', K.SHI[b.setsu.shi] === '寅', K.SHI[b.setsu.shi]);
  check('月干支は五虎遁に合う（戊癸年は甲寅から）', K.ganshiName(p.month) === '甲寅', K.ganshiName(p.month));
  check('時干支は日干から決まる', K.ganshiName(p.hour).length === 2);
  // 時刻不明でも落ちないこと
  const u = K.build({ year: 1988, month: 3, day: 5, hour: 0, minute: 0,
    lon: 135.52, tzOffset: 9, timeUnknown: true, useTrueSolar: true });
  check('時刻不明なら時柱は null', u.pillars.hour === null);
  check('時刻不明でも年月日柱は出る', u.pillars.year != null && u.pillars.month != null && u.pillars.day != null);
}

console.log('\n' + (fails === 0 ? '=> すべて通過' : `=> ${fails}件 失敗`));
process.exit(fails === 0 ? 0 : 1);
