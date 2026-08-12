// 相性の検算。点数をつけていないこと、行きと帰りが独立していることを見る。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HOSHI = path.join(__dirname, '..', '..', 'hoshiyomi', 'assets');
const SELF = path.join(__dirname, '..', 'assets');

const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error, RegExp, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['vendor/astronomy.browser.min.js', 'koyomi.js', 'toyo.js']) {
  vm.runInContext(fs.readFileSync(path.join(HOSHI, f), 'utf8'), sandbox);
}
for (const f of ['aishou.js', 'text.js']) {
  vm.runInContext(fs.readFileSync(path.join(SELF, f), 'utf8'), sandbox);
}
const A = sandbox.window.AISHOU;
const TX = sandbox.window.AISHOU_TEXT;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}

console.log('\n[1] 対応表の形');
{
  check('色は5つ', Object.keys(A.COLOR).length === 5);
  check('景は12', A.KEI.length === 12);
  check('十二運は12', A.UNSEI.length === 12);
  check('通変星は10', Object.keys(A.STAR).length === 10);
  check('景のキーに重複がない', new Set(A.KEI.map(k => k.key)).size === 12);
}

console.log('\n[2] 行きと帰りが別物になるか');
{
  const r = A.read('1990-05-03', '1988-11-12');
  check('あなたから見た相手', r.aToB.name === '指摘', r.aToB.tsuhen + '/' + r.aToB.name);
  check('相手から見たあなた', r.bToA.name === '受け取り', r.bToA.tsuhen + '/' + r.bToA.name);
  check('非対称として立つ', r.asymmetric === true);

  // 入れ替えると中身も入れ替わる
  const s = A.read('1988-11-12', '1990-05-03');
  check('入れ替えると行きと帰りが逆になる',
    s.aToB.tsuhen === r.bToA.tsuhen && s.bToA.tsuhen === r.aToB.tsuhen,
    s.aToB.tsuhen + ' / ' + s.bToA.tsuhen);
  check('距離は入れ替えても同じ', s.distance === r.distance, r.distance + ' / ' + s.distance);

  // 同じ日どうしは必ず比肩＝対等で対称
  const same = A.read('1990-05-03', '1990-05-03');
  check('同じ生年月日なら対等どうし',
    same.aToB.name === '対等' && same.bToA.name === '対等' && same.asymmetric === false);
  check('同じ生年月日なら距離0', same.distance === 0);
  check('同じ生年月日なら色も同じ', same.gogyo === 'onaji');
}

console.log('\n[3] 距離は0〜6に収まるか');
{
  const seen = new Set();
  const base = new Date(Date.UTC(1990, 0, 1));
  let bad = 0;
  for (let i = 0; i < 120; i++) {
    const d1 = new Date(base.getTime() + i * 86400000);
    const d2 = new Date(base.getTime() + (i * 7 + 3) * 86400000);
    const iso = d => d.toISOString().slice(0, 10);
    const r = A.read(iso(d1), iso(d2));
    if (!(r.distance >= 0 && r.distance <= 6)) bad++;
    seen.add(r.distance);
    // 対称であること
    const back = A.read(iso(d2), iso(d1));
    if (back.distance !== r.distance) bad++;
  }
  check('120通り全部が0〜6かつ対称', bad === 0, String(bad));
  check('0〜6が全部出る', [0,1,2,3,4,5,6].every(n => seen.has(n)), [...seen].sort().join(','));
}

console.log('\n[4] 五行の関係');
{
  const rel = (a, b) => A.gogyoRel({ elem: a }, { elem: b });
  check('木と木は同じ', rel('木', '木') === 'onaji');
  check('木は火を生む', rel('木', '火') === 'watashi_umu');
  check('火から見れば木に生まれる', rel('火', '木') === 'aite_umu');
  check('木は土を剋す', rel('木', '土') === 'watashi_kokusu');
  check('土から見れば木に剋される', rel('土', '木') === 'aite_kokusu');
  check('水は木を生む', rel('水', '木') === 'watashi_umu');
  check('金は木を剋す', rel('金', '木') === 'watashi_kokusu');
  // 5つの関係が全部使われる
  const kinds = new Set();
  for (const a of A.GOGYO) for (const b of A.GOGYO) kinds.add(rel(a, b));
  check('5通りとも出る', kinds.size === 5, [...kinds].join(','));
}

console.log('\n[5] 入力の扱い');
{
  const bad = (a, b) => { try { A.read(a, b); return false; } catch (e) { return true; } };
  check('形式違いを弾く', bad('1990/5/3', '1988-11-12'));
  check('片方が空でも弾く', bad('1990-05-03', ''));
  check('範囲外の年を弾く', bad('1800-05-03', '1988-11-12'));
  check('正しければ通る', !bad('1990-05-03', '1988-11-12'));
}

console.log('\n[6] 本文がそろっているか（22本）');
{
  const banned = ['芽', '葉', '花', '実り', '種', '根', '蕾', 'エネルギー', '運気', '波動', '傾向があります'];
  // 点数や優劣を書かないための見張り。「時点で」に当たらないよう、点は数字とセットのときだけ見る。
  const scoring = [/\d+\s*点/, /点数/, /[％%]/, /相性が(良|悪)/, /最高の相手/, /最悪/, /ランク/, /順位/];

  const all = [];
  Object.keys(A.STAR).forEach(k => all.push(['癖', A.STAR[k].key, TX.STAR[A.STAR[k].key]]));
  for (let d = 0; d <= 6; d++) all.push(['距離', String(d), TX.KYORI[d]]);
  Object.keys(TX.GOGYO).forEach(k => all.push(['色', k, TX.GOGYO[k]]));

  check('22本ある', all.length === 22, String(all.length));
  const missing = all.filter(([, , b]) => !Array.isArray(b) || !b.length);
  check('欠けがない', missing.length === 0, missing.map(x => x[0] + '/' + x[1]).join(' '));

  const leaked = [], scored = [];
  all.forEach(([kind, key, b]) => {
    if (!Array.isArray(b)) return;
    // 「言葉」「実際」は草木の意味ではないので、先に除いてから探す
    const j = b.join('').replace(/言葉/g, '').replace(/実際/g, '');
    banned.forEach(w => { if (j.includes(w)) leaked.push(kind + '/' + key + '「' + w + '」'); });
    scoring.forEach(re => { const m = re.exec(j); if (m) scored.push(kind + '/' + key + '「' + m[0] + '」'); });
  });
  check('草木の比喩と抽象語が入っていない', leaked.length === 0, leaked.join(' '));
  check('点数や優劣を書いていない', scored.length === 0, scored.join(' '));

  // 4本を同時に出す形式なので、1本は短くてよい。薄すぎるものだけ弾く。
  const short = all.filter(([, , b]) => Array.isArray(b) && b.join('').length < 120);
  check('短すぎるものがない', short.length === 0, short.map(x => x[0] + '/' + x[1] + ' ' + x[2].join('').length + '字').join(' '));

  const twoSided = all.filter(([, , b]) => Array.isArray(b) && b.length < 2);
  check('どれも両面書いてある（2段落以上）', twoSided.length === 0, twoSided.map(x => x[1]).join(' '));
}

console.log(fails ? `\n${fails} 件 失敗\n` : '\nすべて通過\n');
process.exit(fails ? 1 : 0);
