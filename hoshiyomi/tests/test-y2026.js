// 2026年の運勢まわりの検算。定数として持っている日付を、実際に計算し直して突き合わせる。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'assets');
const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error, Set };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['vendor/astronomy.browser.min.js', 'text.js', 'astro.js', 'koyomi.js',
                 'toyo.js', 'toyo-text.js', 'y2026.js', 'y2026-text.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
}
const A = sandbox.window.Astronomy;
const T = sandbox.window.HOSHI_TEXT;
const K = sandbox.window.HOSHI_KOYOMI;
const TY = sandbox.window.HOSHI_TOYO;
const Y = sandbox.window.HOSHI_Y2026;
const YT = sandbox.window.HOSHI_Y2026_TEXT;
const ASTRO = sandbox.window.HOSHI_ASTRO;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}
const jstMD = d => {
  const t = new Date(d.getTime() + 9 * 3600000);
  return [t.getUTCMonth() + 1, t.getUTCDate()];
};

console.log('\n[1] イングレスの日付を実際に計算し直す');
{
  const scanned = Y.scanYear(2026);
  for (const g of Y.INGRESS) {
    const hit = scanned.find(s => s.body === g.body && s.to === g.to);
    if (!hit) { check(`${g.jp} の移動が見つかる`, false); continue; }
    const [m, d] = jstMD(hit.at);
    check(`${g.jp} ${T.signs[g.from].name}→${T.signs[g.to].name} = ${g.month}月${g.day}日`,
      m === g.month && d === g.day, `計算値 ${m}月${d}日`);
    check(`  ${g.jp} の移動元も合っている`, hit.from === g.from,
      `${T.signs[hit.from].name} → ${T.signs[hit.to].name}`);
  }
  check('2026年の外惑星の移動はこの4件だけ', scanned.length === Y.INGRESS.length,
    `計算では ${scanned.length} 件`);
}

console.log('\n[2] 土星と海王星の合');
{
  const c = Y.CONJ[0];
  let best = null;
  for (let i = 0; i <= 366; i++) {
    const d = new Date(Date.UTC(2026, 0, 1) + i * 86400000);
    const a = Y.lonOf('Saturn', d), b = Y.lonOf('Neptune', d);
    const sep = ((a - b) % 360 + 360) % 360;          // 0〜360
    const gap = Math.min(sep, 360 - sep);             // 合からの隔たり
    if (!best || gap < best.gap) best = { gap, d };
  }
  const [m, day] = jstMD(best.d);
  check(`土星と海王星が最も近づくのは ${c.month}月${c.day}日`,
    m === c.month && Math.abs(day - c.day) <= 1, `計算値 ${m}月${day}日（ずれ ${best.gap.toFixed(2)}°）`);
  check('その位置は牡羊座', Math.floor(Y.lonOf('Saturn', best.d) / 30) === c.sign,
    T.signs[Math.floor(Y.lonOf('Saturn', best.d) / 30)].name);
}

console.log('\n[3] 食の日付と星座');
{
  const solar = [], lunar = [];
  let e = A.SearchGlobalSolarEclipse(A.MakeTime(new Date(Date.UTC(2026, 0, 1))));
  while (e.peak.date.getUTCFullYear() === 2026) { solar.push(e.peak.date); e = A.NextGlobalSolarEclipse(e.peak); }
  let l = A.SearchLunarEclipse(A.MakeTime(new Date(Date.UTC(2026, 0, 1))));
  while (l.peak.date.getUTCFullYear() === 2026) { lunar.push(l.peak.date); l = A.NextLunarEclipse(l.peak); }

  check('2026年の日食は2回', solar.length === 2, `${solar.length}回`);
  check('2026年の月食は2回', lunar.length === 2, `${lunar.length}回`);

  for (const ev of Y.ECLIPSE) {
    const pool = ev.kind === '日食' ? solar : lunar;
    const hit = pool.find(d => jstMD(d)[0] === ev.month && Math.abs(jstMD(d)[1] - ev.day) <= 1);
    check(`${ev.kind} ${ev.month}月${ev.day}日が実在する`, !!hit,
      hit ? '' : pool.map(d => jstMD(d).join('/')).join(' '));
    if (hit) {
      const body = ev.kind === '日食' ? 'Sun' : 'Moon';
      const sign = Math.floor(Y.lonOf(body, hit) / 30);
      check(`  その位置は ${T.signs[ev.sign].name}`, sign === ev.sign, T.signs[sign].name);
    }
  }
}

console.log('\n[4] 逆行の期間');
{
  const wrap = d => { const x = ((d % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
  for (const r of Y.RETRO) {
    const body = { '水星': 'Mercury', '金星': 'Venus', '木星': 'Jupiter', '土星': 'Saturn' }[r.jp];
    let count = 0, was = false;
    for (let i = 0; i <= 366; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86400000);
      const now = wrap(Y.lonOf(body, new Date(d.getTime() + 43200000)) -
                       Y.lonOf(body, new Date(d.getTime() - 43200000))) < 0;
      if (now && !was) count++;
      was = now;
    }
    // 年初から逆行中の場合、開始が年内に来ないので期間数と一致しないことがある
    const expected = r.spans.length;
    check(`${r.jp} の逆行が ${expected} 期間`, Math.abs(count - expected) <= 1,
      `年内に始まった回数 ${count}`);
  }
}

console.log('\n[5] 12星座別（ソーラーサイン）のハウス割り当て');
{
  // 土星と海王星は牡羊座へ。牡羊座の人には1室、魚座の人には2室、牡牛座の人には12室。
  const cases = [[0, 1], [1, 12], [2, 11], [3, 10], [4, 9], [11, 2]];
  for (const [sign, want] of cases) {
    const p = Y.solarProfile(sign);
    const saturn = p.ingress.find(x => x.ev.jp === '土星');
    check(`${T.signs[sign].name} にとって土星の牡羊座入りは ${want}室`, saturn.house === want,
      `${saturn.house}室`);
  }
  // 木星は獅子座へ。獅子座の人には1室。
  const leo = Y.solarProfile(4).ingress.find(x => x.ev.jp === '木星');
  check('獅子座にとって木星の獅子座入りは1室', leo.house === 1, `${leo.house}室`);
  // 天王星は双子座へ。双子座の人には1室、牡牛座の人には2室。
  check('双子座にとって天王星の双子座入りは1室',
    Y.solarProfile(2).ingress.find(x => x.ev.jp === '天王星').house === 1);
  check('牡牛座にとって天王星の双子座入りは2室',
    Y.solarProfile(1).ingress.find(x => x.ev.jp === '天王星').house === 2);
  // 全12星座で1〜12室が1回ずつ出る
  const houses = [];
  for (let s = 0; s < 12; s++) houses.push(Y.solarProfile(s).ingress.find(x => x.ev.jp === '土星').house);
  check('12星座ぶんで1〜12室が1回ずつ', new Set(houses).size === 12);
}

console.log('\n[6] 出生図ベース');
{
  const west = ASTRO.calculate({ year: 1988, month: 3, day: 5, hour: 14, minute: 25,
    lat: 34.686, lon: 135.520, tzOffset: 9, timeUnknown: false });
  const p = Y.natalProfile(west);
  check('実ハウスで数えている', p.mode === 'natal', p.mode);
  check('4つのイングレスすべてにハウスがつく',
    p.ingress.length === 4 && p.ingress.every(x => x.house >= 1 && x.house <= 12));
  check('食4回すべてにハウスがつく',
    p.eclipse.length === 4 && p.eclipse.every(x => x.house >= 1 && x.house <= 12));
  // ASC が獅子座2度なので、牡羊座0度は9室のはず（獅子→乙女→…→牡羊で9つ目）
  const asc = west.houses.asc;
  check('アセンダントは獅子座', Math.floor(asc / 30) === 4, T.signs[Math.floor(asc / 30)].name);

  // 時刻不明ならソーラーサインに落ちる
  const unknown = ASTRO.calculate({ year: 1988, month: 3, day: 5, hour: 12, minute: 0,
    lat: 34.686, lon: 135.520, tzOffset: 9, timeUnknown: true });
  const pu = Y.natalProfile(unknown);
  check('時刻不明ならソーラーサインに落ちる', pu.mode === 'solar-fallback', pu.mode);
  check('落ちてもハウスは出る', pu.ingress.every(x => x.house >= 1 && x.house <= 12));

  // トランジット
  const tr = Y.transits(west);
  check('トランジットが1件以上出る', tr.length > 0, `${tr.length}件`);
  check('すべて1度以内', tr.every(x => x.gap <= 1.0));
  check('時期が入っている', tr.every(x => /月\d+日/.test(x.date) || x.date === '年間を通して'));
  check('走査の端に丸めた「1月1日ごろ」が出ない', !tr.some(x => x.date === '1月1日ごろ'),
    tr.filter(x => x.date === '1月1日ごろ').map(x => `${x.mover}→${x.target}`).join(' '));
  check('ピークが年外なら、その旨が書かれる',
    tr.filter(x => x.peakYear !== 2026 && x.spanDays <= 300).every(x => /年内|年）/.test(x.date)),
    tr.filter(x => x.peakYear !== 2026).map(x => `${x.mover}→${x.target}:${x.date}`).join(' / '));
  check('よく動く星は1日で出る',
    tr.filter(x => x.mover === '木星' && x.spanDays <= 60 && x.peakYear === 2026)
      .every(x => /ごろ$/.test(x.date)));
  check('効きの強い順に並んでいる', tr.every((x, i) => i === 0 || tr[i - 1].weight >= x.weight));
  console.log('       上位3件: ' + tr.slice(0, 3).map(x =>
    `${x.date} 今年の${x.mover}が出生図の${x.target}に${x.aspect.name}`).join(' / '));
}

console.log('\n[7] 東洋の流年');
{
  const k = K.build({ year: 1988, month: 3, day: 5, hour: 14, minute: 25,
    lon: 135.52, tzOffset: 9, timeUnknown: false, useTrueSolar: true });
  const east = TY.all(k);
  const tp = Y.toyoProfile(east);
  check('年干支は丙午', tp.year.ganshi === '丙午');
  check('通変星が10種のどれか',
    ['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','正印'].includes(tp.tsuhen), tp.tsuhen);
  check('日主 己 から見た丙は正印', tp.dayKan === '己' && tp.tsuhen === '正印',
    `${tp.dayKan} → ${tp.tsuhen}`);
  check('本命星の回座先が9宮のどれか', Y.PALACE_PATH.some(p => p.name === tp.palace.name), tp.palace.name);
  console.log(`       ${tp.honmeiName} → ${tp.palace.name}（${tp.palace.dir}）`);

  // 九星の年盤：中宮が五黄なら定位盤に戻る
  check('五黄中宮なら一白は坎宮（北）', Y.kaiza(1, 5).name === '坎宮' && Y.kaiza(1, 5).dir === '北');
  check('五黄中宮なら六白は乾宮（北西）', Y.kaiza(6, 5).name === '乾宮');
  check('五黄中宮なら九紫は離宮（南）', Y.kaiza(9, 5).name === '離宮');
  check('五黄中宮なら三碧は震宮（東）', Y.kaiza(3, 5).name === '震宮');
  check('五黄中宮なら五黄は中宮', Y.kaiza(5, 5).name === '中宮');
  // 2026年は一白中宮
  check('2026年は一白が中宮', Y.kaiza(1, 1).name === '中宮');
  check('2026年は二黒が乾宮', Y.kaiza(2, 1).name === '乾宮');
  // どの年でも9星が9宮に1つずつ入る
  let ok = true;
  for (let c = 1; c <= 9; c++) {
    const seen = new Set();
    for (let m = 1; m <= 9; m++) seen.add(Y.kaiza(m, c).name);
    if (seen.size !== 9) ok = false;
  }
  check('どの中宮でも9星が9宮に1つずつ入る', ok);
}

console.log('\n[8] 文章に穴がないか');
{
  for (const p of ['木星', '土星', '天王星', '海王星']) {
    check(`${p} × 12ハウスの文章がそろう`,
      YT.BY_HOUSE[p] && YT.BY_HOUSE[p].length === 12 && YT.BY_HOUSE[p].every(x => x && x.length > 20),
      YT.BY_HOUSE[p] ? `${YT.BY_HOUSE[p].length}本` : '欠け');
    check(`  ${p} の12本に重複がない`, new Set(YT.BY_HOUSE[p]).size === 12);
  }
  check('4つの節目の総論がそろう',
    Y.INGRESS.every(g => YT.INGRESS_INTRO[g.jp] && YT.INGRESS_INTRO[g.jp].body));
  check('12星座別のまとめがそろう',
    YT.SIGN_SUMMARY.length === 12 && YT.SIGN_SUMMARY.every(x => x.catch && x.body.length > 80));
  check('12星座別のまとめに重複がない', new Set(YT.SIGN_SUMMARY.map(x => x.catch)).size === 12);
  check('通変星10種の流年がそろう',
    ['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','正印'].every(t => YT.TOYO_TSUHEN[t]));
  check('九星9宮ぶんの流年がそろう', Y.PALACE_PATH.every(p => YT.TOYO_PALACE[p.name]));
  check('食のハウス12ぶんがそろう', YT.ECLIPSE_HOUSE.length === 12);
  check('逆行の説明がそろう', Y.RETRO.every(r => YT.RETRO_TEXT[r.jp]));

  const values = [];
  (function walk(v) {
    if (typeof v === 'string') values.push(v);
    else if (v && typeof v === 'object') Object.keys(v).forEach(k2 => walk(v[k2]));
  })(YT);
  const blob = values.join('\n');
  check('キリル文字が混ざっていない', !/[Ѐ-ӿ]/.test(blob));
  check('ハングルが混ざっていない', !/[가-힯]/.test(blob));
  check('英単語が本文に混ざっていない', !/[A-Za-z]{3,}/.test(blob),
    (blob.match(/[A-Za-z]{3,}/g) || []).join(' '));
}

console.log('\n' + (fails === 0 ? '=> すべて通過' : `=> ${fails}件 失敗`));
process.exit(fails === 0 ? 0 : 1);
