// 端末保存の検算。localStorage を触らない部分だけを見る。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Array, String, Number, JSON, Object, Error, RegExp, document: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'store.js'), 'utf8'), sandbox);
const S = sandbox.window.MOCHI_STORE;

let fails = 0;
const check = (label, ok, detail) => {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
};

console.log('\n[1] 生年月日の検査');
{
  check('正しい日は通る', S.validDate('1990-05-03') === '1990-05-03');
  check('前後の空白は落とす', S.validDate(' 1990-05-03 ') === '1990-05-03');
  check('スラッシュ区切りは弾く', S.validDate('1990/05/03') === null);
  check('桁が足りないものは弾く', S.validDate('1990-5-3') === null);
  check('2月30日は弾く', S.validDate('1990-02-30') === null);
  check('うるう日は通る', S.validDate('2000-02-29') === '2000-02-29');
  check('うるうでない年の2月29日は弾く', S.validDate('1900-02-29') === null);
  check('13月は弾く', S.validDate('1990-13-01') === null);
  check('範囲外の年は弾く', S.validDate('1800-01-01') === null && S.validDate('2200-01-01') === null);
  check('空とnullは弾く', S.validDate('') === null && S.validDate(null) === null);
}

console.log('\n[2] 呼び名の検査');
{
  check('前後の空白を落とす', S.cleanName('  みー  ') === 'みー');
  check('連続する空白を1つに', S.cleanName('お  母  さん') === 'お 母 さん');
  check('20字で切る', S.cleanName('あ'.repeat(30)).length === 20);
  check('nullは空文字', S.cleanName(null) === '');
}

console.log('\n[3] 壊れた保存データを直せるか');
{
  const n = S.normalize;
  check('nullでも形が返る', JSON.stringify(n(null)) === '{"me":null,"people":[]}');
  check('文字列でも形が返る', JSON.stringify(n('こわれた')) === '{"me":null,"people":[]}');
  check('不正な me は落とす', n({ me: 'abc' }).me === null);
  check('people が配列でなくても落ちない', n({ people: 'x' }).people.length === 0);
  check('日付が不正な人は落とす', n({ people: [{ name: 'A', date: 'x' }] }).people.length === 0);
  check('名前が空の人は落とす', n({ people: [{ name: '  ', date: '1990-05-03' }] }).people.length === 0);
  check('同じ人は1件だけ残す',
    n({ people: [{ name: 'A', date: '1990-05-03' }, { name: 'A', date: '1990-05-03' }] }).people.length === 1);
  check('同じ名前でも日が違えば両方残す',
    n({ people: [{ name: 'A', date: '1990-05-03' }, { name: 'A', date: '1991-05-03' }] }).people.length === 2);

  const many = Array.from({ length: 20 }, (_, i) => ({ name: 'P' + i, date: '1990-05-03' }));
  check('上限を超えたぶんは落とす', n({ people: many }).people.length === S.MAX_PEOPLE, String(n({ people: many }).people.length));
}

console.log('\n[4] 保存しないと決めたもの');
{
  const keys = Object.keys(S.normalize({ me: '1990-05-03', people: [], 結果: 'x', メモ: 'y' }));
  check('診断結果やメモは保存しない', keys.join(',') === 'me,people', keys.join(','));
  check('保存キーは1つだけ', S.KEY === 'mochisura-me-v1', S.KEY);
}

console.log(fails ? `\n${fails} 件 失敗\n` : '\nすべて通過\n');
process.exit(fails ? 1 : 0);
