// 十二景診断の検算。
// 計算そのものは hoshiyomi 側で検算済みなので、ここは対応表が正しいかだけを見る。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HOSHI = path.join(__dirname, '..', '..', 'hoshiyomi', 'assets');
const SELF = path.join(__dirname, '..', 'assets');

const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error, RegExp };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
// 暦の計算は hoshiyomi のものをそのまま読む（サイト全体で1か所）。
for (const f of ['vendor/astronomy.browser.min.js', 'koyomi.js', 'toyo.js']) {
  vm.runInContext(fs.readFileSync(path.join(HOSHI, f), 'utf8'), sandbox);
}
vm.runInContext(fs.readFileSync(path.join(SELF, 'slime.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(SELF, 'text.js'), 'utf8'), sandbox);
const S = sandbox.window.SLIME;
const TX = sandbox.window.SLIME_TEXT;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}

console.log('\n[1] 対応表の形');
{
  check('色は5つ', Object.keys(S.COLOR).length === 5);
  check('景は12', S.KEI.length === 12);
  check('星は10', Object.keys(S.STAR).length === 10);

  const uns = S.KEI.map(k => k.un);
  check('景の十二運が UNSEI と同じ並び', uns.join(',') === S.UNSEI.join(','), uns.join(','));
  check('景のキーに重複がない', new Set(S.KEI.map(k => k.key)).size === 12);
  check('星のキーに重複がない', new Set(Object.values(S.STAR).map(s => s.key)).size === 10);

  const sides = Object.values(S.STAR).reduce((a, s) => (a[s.side] = (a[s.side] || 0) + 1, a), {});
  check('集める4・削る6', sides['集める'] === 4 && sides['削る'] === 6, JSON.stringify(sides));

  const st = S.KEI.reduce((a, k) => (a[k.strength] = (a[k.strength] || 0) + 1, a), {});
  check('強3・中4・弱5', st['強'] === 3 && st['中'] === 4 && st['弱'] === 5, JSON.stringify(st));
}

console.log('\n[2] ズレは120通りとも3型のどれかに落ちるか');
{
  const kinds = {};
  let bad = 0;
  for (const k of S.KEI) {
    for (const name of Object.keys(S.STAR)) {
      const z = S.ZURE[k.strength][S.STAR[name].side];
      if (!S.ZURE_NAME[z]) bad++;
      kinds[z] = (kinds[z] || 0) + 1;
    }
  }
  const total = Object.values(kinds).reduce((a, b) => a + b, 0);
  check('120通りある', total === 120, String(total));
  check('未定義が出ない', bad === 0, String(bad));
  check('重なる38', kinds.kasanaru === 38, String(kinds.kasanaru));
  check('持て余す28', kinds.moteamasu === 28, String(kinds.moteamasu));
  check('足りない54', kinds.tarinai === 54, String(kinds.tarinai));
}

console.log('\n[3] 色ごとに起こる景は6つだけか（実際に日付を回して確認）');
{
  // 60日で日柱が一巡する。月柱も動かすため400日ぶん回す。
  const seen = {};
  const start = new Date(Date.UTC(1999, 0, 1));
  for (let i = 0; i < 400; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const r = S.read(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    (seen[r.color.name] = seen[r.color.name] || new Set()).add(r.kei.name);
  }
  for (const c of ['青', '赤', '黄', '白', '黒']) {
    const n = seen[c] ? seen[c].size : 0;
    check(`${c} は6景`, n === 6, [...(seen[c] || [])].join(' '));
  }
  const has = (c, k) => seen[c] && seen[c].has(k);
  check('青に満開は来ない', !has('青', '満開'));
  check('白に満開は来ない', !has('白', '満開'));
  check('赤に風は来ない', !has('赤', '風'));
  check('黄に風は来ない', !has('黄', '風'));
  check('黒に風は来ない', !has('黒', '風'));
  check('青と白は同じ6景', JSON.stringify([...seen['青']].sort()) === JSON.stringify([...seen['白']].sort()));
}

console.log('\n[4] 月柱は節入りで変わるか');
{
  const before = S.read(2000, 2, 1);   // 立春前
  const after = S.read(2000, 2, 10);  // 立春後
  check('立春をまたぐと月柱が変わる',
    before.koyomi.monthGanshi !== after.koyomi.monthGanshi,
    before.koyomi.monthGanshi + ' -> ' + after.koyomi.monthGanshi);

  const a = S.read(2000, 3, 4), b = S.read(2000, 3, 10);  // 啓蟄あたり
  check('3月の節入りでも月柱が変わる',
    a.koyomi.monthGanshi !== b.koyomi.monthGanshi,
    a.koyomi.monthGanshi + ' -> ' + b.koyomi.monthGanshi);
}

console.log('\n[5] 日柱は毎日ひとつ進むか');
{
  const K = sandbox.window.HOSHI_KOYOMI;
  const idx = g => K.ganshiIndex(K.KAN.indexOf(g[0]), K.SHI.indexOf(g[1]));
  let ok = true, prev = null;
  for (let i = 1; i <= 61; i++) {
    const d = new Date(Date.UTC(2000, 0, i));
    const g = S.read(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()).koyomi.dayGanshi;
    if (prev !== null && idx(g) !== (prev + 1) % 60) ok = false;
    prev = idx(g);
  }
  check('61日ぶん、日柱が1ずつ進む', ok);

  const g1 = S.read(2000, 1, 1).koyomi.dayGanshi;
  const g61 = S.read(2000, 3, 1).koyomi.dayGanshi;  // 60日後（2000年は閏年）
  check('60日後に同じ干支へ戻る', g1 === g61, g1 + ' / ' + g61);
}

console.log('\n[6] 入力の扱い');
{
  const a = S.readDate('1990-05-03'), b = S.read(1990, 5, 3);
  check('readDate と read が一致', a.title === b.title, a.title);
  check('title の形', /^[青赤黄白黒]の、/.test(a.title), a.title);
  check('画面のヒーローはドット絵で、景と鉢の色に対応',
    a.image === 'images_pixel/' + a.kei.key + '-' + a.color.key + '.png', a.image);
  check('書き出すカードは描き込んだほう',
    a.imageRich === 'images/' + a.kei.key + '-' + a.color.key + '.png', a.imageRich);
  check('どちらにも色ぶんが無いときの逃げ道がある',
    a.imageFallback === 'images_pixel/' + a.kei.key + '.png' &&
    a.imageRichFallback === 'images/' + a.kei.key + '.png');

  const bad = t => { try { S.readDate(t); return false; } catch (e) { return true; } };
  check('形式違いを弾く', bad('1990/5/3'));
  check('空を弾く', bad(''));
  check('範囲外の年を弾く', (() => { try { S.read(1800, 1, 1); return false; } catch (e) { return true; } })());
}

console.log('\n[7] 使った暦をちゃんと返しているか');
{
  const r = S.read(1990, 5, 3);
  const need = ['dayGanshi', 'monthGanshi', 'yearGanshi', 'un', 'monthShiStar', 'monthKanStar', 'setsu', 'gogyo'];
  for (const key of need) check('koyomi.' + key + ' がある', r.koyomi[key] != null, JSON.stringify(r.koyomi[key]));
  const sum = Object.values(r.koyomi.gogyo).reduce((a, b) => a + b, 0);
  check('五行の数は6（時柱なし＝3柱×2）', sum === 6, String(sum));
}

console.log('\n[8] 本文が全部そろっているか（30本）');
{
  // 「実」単体は「実際は」に当たるので、草木の意味になる形だけを見る。
  const banned = ['芽', '葉', '花', '実り', '木の実', '種', '根', '土', '風', '蕾', '幹', '枝', '茎',
    'エネルギー', '運気', '波動', '傾向があります'];
  let missing = 0, short = 0, leaked = [];

  const all = []
    .concat(S.KEI.map(k => ['景', k.key, TX.KEI[k.key]]))
    .concat(Object.values(S.COLOR).map(c => ['色', c.key, TX.COLOR[c.key]]))
    .concat(Object.values(S.STAR).map(s => ['星', s.key, TX.STAR[s.key]]))
    .concat(Object.keys(S.ZURE_NAME).map(z => ['ズレ', z, TX.ZURE[z]]));

  for (const [kind, key, body] of all) {
    if (!Array.isArray(body) || body.length === 0) { missing++; console.log('    欠け: ' + kind + '/' + key); continue; }
    const joined = body.join('');
    if (joined.length < 200) { short++; console.log('    短い: ' + kind + '/' + key + ' ' + joined.length + '字'); }
    for (const w of banned) if (joined.indexOf(w) >= 0) leaked.push(kind + '/' + key + ' に「' + w + '」');
  }

  check('30本そろっている', all.length === 30, String(all.length));
  check('欠けがない', missing === 0, String(missing));
  check('短すぎるものがない（200字以上）', short === 0, String(short));
  check('本文に草木の比喩と抽象語が入っていない', leaked.length === 0, leaked.join(' / '));

  const ends = all.filter(([, , b]) => Array.isArray(b) && b.length)
    .filter(([, , b]) => !/(ください|ます|ません|です|でした)。$/.test(b[b.length - 1]));
  check('どれも最後が助言で終わっている', ends.length === 0, ends.map(e => e[1]).join(' '));
}

console.log(fails ? `\n${fails} 件 失敗\n` : '\nすべて通過\n');
process.exit(fails ? 1 : 0);
