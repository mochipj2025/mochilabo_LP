// お金の診断の検算。金額は本人の入力の足し算でしか出していないことを確かめる。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HOSHI = path.join(__dirname, '..', '..', 'hoshiyomi', 'assets');
const SELF = path.join(__dirname, '..', 'assets');

const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error, RegExp, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['vendor/astronomy.browser.min.js', 'text.js', 'astro.js', 'koyomi.js', 'toyo.js']) {
  vm.runInContext(fs.readFileSync(path.join(HOSHI, f), 'utf8'), sandbox);
}
for (const f of ['money.js', 'text.js']) {
  vm.runInContext(fs.readFileSync(path.join(SELF, f), 'utf8'), sandbox);
}
const M = sandbox.window.MONEY;
const TX = sandbox.window.MONEY_TEXT;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}
const pts = o => Object.assign({ sumai:0, jikan:0, hito:0, karada:0, manabi:0, sonae:0, okuru:0 }, o);

console.log('\n[1] 対応表の形');
{
  check('領域は7つ', M.DOMAINS.length === 7);
  check('金星の対応は12星座ぶん', M.VENUS_DOMAIN.length === 12);
  const keys = M.DOMAINS.map(d => d.key);
  check('金星の行き先が全部実在する領域', M.VENUS_DOMAIN.every(v => keys.includes(v)),
    M.VENUS_DOMAIN.filter(v => !keys.includes(v)).join(','));
  check('7領域すべてに選択肢がある', keys.every(k => M.OPTIONS[k] && M.OPTIONS[k].length === 3));
  check('選択肢の先頭は必ず0円', keys.every(k => M.OPTIONS[k][0][1] === 0));
  check('選択肢は金額の昇順', keys.every(k => M.OPTIONS[k][0][1] < M.OPTIONS[k][1][1] && M.OPTIONS[k][1][1] < M.OPTIONS[k][2][1]));
  check('通変星は10種', Object.keys(M.STAR).length === 10);
  // 7領域のうち金星が一度も指さないものが無いか（あっても異常ではないので表示だけ）
  const unused = keys.filter(k => !M.VENUS_DOMAIN.includes(k));
  check('金星が指さない領域', unused.length === 0, unused.join(',') || 'なし');
}

console.log('\n[2] 配点の検査');
{
  const bad = p => { try { M.ranked(p); return false; } catch (e) { return true; } };
  check('合計10でないと弾く（9）', bad(pts({ manabi: 9 })));
  check('合計10でないと弾く（11）', bad(pts({ manabi: 11 })));
  check('合計10なら通る', !bad(pts({ manabi: 4, jikan: 3, sonae: 2, hito: 1 })));
  const r = M.ranked(pts({ manabi: 4, jikan: 3, sonae: 2, hito: 1 }));
  check('多い順に並ぶ', r[0].key === 'manabi' && r[1].key === 'jikan' && r[2].key === 'sonae', r.map(x => x.key + x.points).join(' '));
}

console.log('\n[3] 金額は入力の足し算だけか');
{
  const r = M.read({
    date: '1990-05-03',
    points: pts({ manabi: 4, jikan: 3, sonae: 2, hito: 1 }),
    fill: { manabi: 2, jikan: 1, sonae: 1 }   // 30000 + 25000 + 30000
  });
  check('月額が選択肢の合計と一致', r.money.monthly === 85000, String(r.money.monthly));
  check('年額は月額の12倍', r.money.yearly === 85000 * 12, String(r.money.yearly));
  check('内訳の合計も一致', r.money.lines.reduce((a, b) => a + b.yen, 0) === r.money.monthly);
  check('内訳は金額の降順', r.money.lines.every((l, i, a) => i === 0 || a[i-1].yen >= l.yen));
  check('請求ベースは手取り率で割った額', r.money.invoice === Math.round(85000*12/0.7/1000)*1000, String(r.money.invoice));
  check('割った数を画面に出せる', r.money.takeHome === 0.7);

  const zero = M.read({ date: '1990-05-03', points: pts({ sonae: 10 }), fill: { sonae: 0 } });
  check('「今のまま」だけなら0円', zero.money.monthly === 0 && zero.money.lines.length === 0);

  // 生年月日を変えても金額は動かない＝占いが金額を決めていない
  const other = M.read({
    date: '1974-08-30',
    points: pts({ manabi: 4, jikan: 3, sonae: 2, hito: 1 }),
    fill: { manabi: 2, jikan: 1, sonae: 1 }
  });
  check('生年月日を変えても金額は同じ', other.money.monthly === r.money.monthly,
    r.money.monthly + ' / ' + other.money.monthly);
}

console.log('\n[4] ギャップの判定');
{
  const r = M.read({ date: '1990-05-03', points: pts({ manabi: 5, sonae: 5 }), fill: {} });
  check('金星の領域が出ている', !!r.venus.domain, r.venus.sign + ' → ' + r.venus.domain.name);
  check('判定は icchi か zure', ['icchi', 'zure'].includes(r.gap), r.gap);

  // 金星の領域に全点を置けば必ず一致する
  const v = M.venusOf(1990, 5, 3);
  const same = M.read({ date: '1990-05-03', points: pts({ [v.domain.key]: 10 }), fill: {} });
  check('金星の領域に全振りすると一致', same.gap === 'icchi', v.domain.name);

  // 金星と違う領域に全振りすればずれる
  const otherKey = M.DOMAINS.map(d => d.key).find(k => k !== v.domain.key && (!v.alt || k !== v.alt.domain.key));
  const diff = M.read({ date: '1990-05-03', points: pts({ [otherKey]: 10 }), fill: {} });
  check('違う領域に全振りするとずれる', diff.gap === 'zure', M.domainOf(otherKey).name);
}

console.log('\n[5] 金星が星座の境目にある日を見つけられるか');
{
  let found = null, scanned = 0;
  const start = new Date(Date.UTC(1990, 0, 1));
  for (let i = 0; i < 400 && !found; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const v = M.venusOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    scanned++;
    if (v.boundary) found = { d: d.toISOString().slice(0, 10), v };
  }
  check('境目の日が見つかる', !!found, found ? found.d + ' ' + found.v.sign + '/' + found.v.alt.sign : scanned + '日調べた');
  if (found) {
    check('境目のときは隣の領域も出る', !!found.v.alt.domain, found.v.domain.name + ' / ' + found.v.alt.domain.name);
    check('隣は本当に隣の星座', Math.abs(((found.v.signIdx - found.v.alt.signIdx) % 12 + 12) % 12) % 11 <= 1,
      found.v.signIdx + ' / ' + found.v.alt.signIdx);
  }
}

console.log('\n[6] 本文がそろっているか（26本）');
{
  const banned = ['芽', '葉', '花', '実り', '種', '根', '蕾', 'エネルギー', '運気', '波動', '傾向があります'];
  const all = [];
  M.DOMAINS.forEach(d => { all.push(['配点', d.key, TX.SENTAKU[d.key]]); all.push(['金星', d.key, TX.KINSEI[d.key]]); });
  Object.keys(TX.GAP).forEach(k => all.push(['ギャップ', k, TX.GAP[k]]));
  Object.values(M.STAR).forEach(s => all.push(['癖', s.key, TX.STAR[s.key]]));

  check('26本ある', all.length === 26, String(all.length));
  const missing = all.filter(([, , b]) => !Array.isArray(b) || !b.length);
  check('欠けがない', missing.length === 0, missing.map(x => x[0] + '/' + x[1]).join(' '));
  const leaked = [];
  all.forEach(([kind, key, b]) => {
    if (!Array.isArray(b)) return;
    const j = b.join('');
    banned.forEach(w => { if (j.includes(w)) leaked.push(kind + '/' + key + '「' + w + '」'); });
  });
  check('草木の比喩と抽象語が入っていない', leaked.length === 0, leaked.join(' '));
  // 領域は主役ではないので短くてよい。主役のギャップと癖は長さを要る。
  const MIN = { '配点': 70, '金星': 70, 'ギャップ': 250, '癖': 130 };
  const short = all.filter(([kind, , b]) => Array.isArray(b) && b.join('').length < MIN[kind]);
  check('種類ごとの長さを満たしている', short.length === 0,
    short.map(x => x[0] + '/' + x[1] + ' ' + x[2].join('').length + '字').join(' '));
}

console.log('\n[7] 差し替えの記号が残らないか');
{
  const both = TX.GAP.zure.join('');
  check('ずれの本文に {配点} と {金星} が入っている', both.includes('{配点}') && both.includes('{金星}'));
  check('一致の本文に {金星} は使っていない', !TX.GAP.icchi.join('').includes('{金星}'));
  const others = [...Object.values(TX.SENTAKU), ...Object.values(TX.KINSEI), ...Object.values(TX.STAR)]
    .flat().filter(s => /\{[^}]+\}/.test(s));
  check('ギャップ以外に差し替え記号がない', others.length === 0, others.join(' '));
}

console.log(fails ? `\n${fails} 件 失敗\n` : '\nすべて通過\n');
process.exit(fails ? 1 : 0);
