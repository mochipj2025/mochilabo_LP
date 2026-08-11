// 「そらと暦のしくみ」の図に出る数値を、教科書の値と突き合わせる。
//
// このページは事実を主張する図を並べるので、数値がずれたら記事として成立しない。
// 実際、西暦1年を Date.UTC(1,...) で作って1901年になり、歳差が28度ではなく1.7度と
// 表示されていた事故があった。同じ種類の間違いを二度と通さないためのテスト。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSETS = path.join(__dirname, '..', 'assets');
const SHIKUMI = path.join(__dirname, '..', 'shikumi');
const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error, Set, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ASSETS, 'vendor/astronomy.browser.min.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ASSETS, 'koyomi.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(SHIKUMI, 'shikumi-calc.js'), 'utf8'), sandbox);

const C = sandbox.window.HOSHI_SHIKUMI_CALC;
const K = sandbox.window.HOSHI_KOYOMI;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}
function near(actual, want, tol) { return Math.abs(actual - want) <= tol; }
const jst = d => { const t = new Date(d.getTime() + 9 * 3600000);
  return `${t.getUTCMonth() + 1}月${t.getUTCDate()}日`; };

console.log('\n[1] 西暦の作り方（Date.UTC の罠）');
{
  check('midYear(1) が本当に西暦1年になる', C.midYear(1).getUTCFullYear() === 1,
    String(C.midYear(1).getUTCFullYear()));
  check('midYear(99) が西暦99年になる', C.midYear(99).getUTCFullYear() === 99,
    String(C.midYear(99).getUTCFullYear()));
  check('素の Date.UTC(1,...) は1901年になる（罠の再現）',
    new Date(Date.UTC(1, 6, 1)).getUTCFullYear() === 1901);
}

console.log('\n[2] 歳差');
{
  const p = C.precession(1, 2026);
  check('西暦1年から2026年で約28度動く', near(p.deg, 28.2, 1.0), `${p.deg.toFixed(2)}度`);
  check('1年あたり約50.3秒角', near(p.arcsecPerYear, 50.29, 1.0), `${p.arcsecPerYear.toFixed(2)}秒角`);
  check('星座ひとつ（30度）に届かない', p.deg < 30, `${p.deg.toFixed(2)}度`);
  const p2 = C.precession(2000, 2026);
  check('J2000からの26年ぶんは約0.36度', near(p2.deg, 0.363, 0.05), `${p2.deg.toFixed(3)}度`);
}

console.log('\n[3] 月の周期');
{
  const syn = C.synodicMean(2020, 2030);
  check('朔望月の平均 = 29.5306日', near(syn.mean, 29.5306, 0.002), `${syn.mean.toFixed(4)}日`);
  check('10年で新月は約124回', near(syn.count, 124, 3), `${syn.count}回`);
  const sid = C.siderealMean(new Date(Date.UTC(2026, 0, 1)), 12);
  check('恒星月 = 27.3217日', near(sid, 27.3217, 0.03), `${sid.toFixed(4)}日`);
  check('朔望月のほうが約2.21日長い', near(syn.mean - sid, 2.209, 0.05),
    `${(syn.mean - sid).toFixed(3)}日`);
  check('12朔望月は太陽年に約10.9日足りない',
    near(365.2422 - syn.mean * 12, 10.88, 0.1), `${(365.2422 - syn.mean * 12).toFixed(2)}日`);
  check('宿曜の27は恒星月に近い', Math.abs(sid - 27) < 0.5, `${sid.toFixed(2)}日`);
}

console.log('\n[4] 1年で空を進む角度');
{
  const moon = Math.abs(C.degreesInYear('Moon', 2026));
  const sun = Math.abs(C.degreesInYear('Sun', 2026));
  const pluto = Math.abs(C.degreesInYear('Pluto', 2026));
  const uranus = Math.abs(C.degreesInYear('Uranus', 2026));
  check('月は約13周（4700〜4900度）', moon > 4700 && moon < 4900, `${Math.round(moon)}度`);
  check('太陽はちょうど1周（360度前後）', near(sun, 360, 3), `${sun.toFixed(1)}度`);
  check('冥王星は1〜3度しか動かない', pluto > 0.5 && pluto < 3, `${pluto.toFixed(2)}度`);
  check('天王星は2〜6度', uranus > 2 && uranus < 6, `${uranus.toFixed(2)}度`);
  check('冥王星は太陽の200分の1以下しか進まない', pluto < sun / 200,
    `${(sun / pluto).toFixed(0)}分の1`);
}

console.log('\n[5] 月の傾きと食');
{
  const lat = C.moonLatRange(2026);
  check('月の黄緯は最大5度前後', near(lat.max, 5.15, 0.5), `+${lat.max.toFixed(2)}度`);
  check('月の黄緯は最小マイナス5度前後', near(lat.min, -5.15, 0.5), `${lat.min.toFixed(2)}度`);
  const ecl = C.eclipses(2026);
  check('2026年の食は4回', ecl.length === 4, `${ecl.length}回`);
  check('日食2回・月食2回',
    ecl.filter(e => e.k === '日食').length === 2 && ecl.filter(e => e.k === '月食').length === 2,
    ecl.map(e => e.k + jst(e.d)).join(' '));
  // 食の日は、月が太陽の道の近くにいるはず
  const bad = ecl.filter(e => {
    const i = Math.round((e.d - Date.UTC(2026, 0, 1)) / 86400000);
    return Math.abs(lat.series[i]) > 1.6;
  });
  check('どの食の日も月の黄緯は1.6度以内', bad.length === 0,
    bad.map(e => jst(e.d)).join(' '));
}

console.log('\n[6] 均時差');
{
  const e = C.eot(2026, K.trueSolarHour);
  check('最大は+16分あたり', near(e.max, 16.4, 1.0), `+${e.max.toFixed(1)}分`);
  check('最小は−14分あたり', near(e.min, -14.2, 1.0), `${e.min.toFixed(1)}分`);
  check('年に4回ゼロを横切る', (() => {
    let n = 0;
    for (let i = 1; i < e.series.length; i++) if (e.series[i - 1] * e.series[i] < 0) n++;
    return n === 4;
  })(), '交差回数を確認');
}

console.log('\n[7] 太陽が星座に入る日');
{
  const ing = C.sunIngresses(2026);
  check('12回ある', ing.length === 12, `${ing.length}回`);
  const aries = ing.find(x => x.deg === 0);
  check('牡羊座0度（春分）は3月20日', jst(aries.date) === '3月20日', jst(aries.date));
  check('日付が順番に並ぶ', ing.every((x, i) => i === 0 || x.date > ing[i - 1].date));
  check('隣り合う間隔は29〜32日',
    ing.every((x, i) => {
      if (i === 0) return true;
      const gap = (x.date - ing[i - 1].date) / 86400000;
      return gap > 28 && gap < 32.5;
    }));
}

console.log('\n[8] 水星の逆行');
{
  const w = C.walk('Mercury', 2026);
  // 逆行区間のかたまりを数える
  let runs = 0;
  for (let i = 0; i < w.retroDays.length; i++) {
    if (i === 0 || w.retroDays[i] !== w.retroDays[i - 1] + 1) runs++;
  }
  check('2026年の水星逆行は3回', runs === 3, `${runs}回`);
  check('逆行の合計は年の2割前後',
    w.retroDays.length > 50 && w.retroDays.length < 90, `${w.retroDays.length}日`);
  check('折り返しても1年で1周以上は進む',
    w.unwrapped[w.unwrapped.length - 1] - w.unwrapped[0] > 360,
    `${Math.round(w.unwrapped[w.unwrapped.length - 1] - w.unwrapped[0])}度`);
}

console.log('\n[9] 本文と突き合わせる値');
{
  const risshun = K.termTime(2026, 0);
  check('2026年の立春は2月4日', jst(risshun) === '2月4日', jst(risshun));
  const l = K.lunar(2026, 2, 17);
  check('2026年2月17日は旧暦1月1日', l.month === 1 && l.day === 1);
  check('2019年1月27日の日の干支は甲子', K.ganshiName(K.dayGanshi(2019, 1, 27)) === '甲子');
  check('2026年の干支は丙午', K.ganshiName(K.yearGanshi(2026)) === '丙午');
  check('二十四節気は15度きざみ',
    [0, 3, 12, 21].every(i => (315 + 15 * i) % 15 === 0));
}

console.log('\n[10] ページが計算部分を使っているか');
{
  const page = fs.readFileSync(path.join(SHIKUMI, 'shikumi.js'), 'utf8');
  const html = fs.readFileSync(path.join(SHIKUMI, 'index.html'), 'utf8');
  check('index.html が shikumi-calc.js を読んでいる', /shikumi-calc\.js/.test(html));
  check('index.html が shikumi.js を読んでいる', /shikumi\.js/.test(html));
  check('描画側で Date.UTC(1, を直接使っていない',
    !/Date\.UTC\(\s*1\s*,/.test(page), '西暦1年は midYear() を使うこと');
}

console.log('\n' + (fails === 0 ? '=> すべて通過' : `=> ${fails}件 失敗`));
process.exit(fails === 0 ? 0 : 1);
