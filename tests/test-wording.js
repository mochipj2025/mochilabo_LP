// 読みやすさの見張り（サイト全体の本文）。
//
// 一文の長さは元から足りていた（平均27字）。読みづらさの正体は別で、
//   1. 節を数珠つなぎにする（「〜て、でも〜ので、〜」）
//   2. 打ち消しで説明する（「〜ではなくて、〜からです」）
//   3. ぼかしを重ねる（「たぶん〜と思います」）
// の3つ。ここを機械で止める。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const TARGETS = [
  ['スライム', 'slime/assets/text.js', 'SLIME_TEXT'],
  ['お金',     'money/assets/text.js', 'MONEY_TEXT'],
  ['相性',     'aishou/assets/text.js', 'AISHOU_TEXT'],
  ['恋',       'koi/assets/text.js',    'KOI_TEXT']      // まだ無ければ飛ばす
];

/* 節をつなぐ語。これが一文に2つ以上あると追えなくなる。
   「AでもBでも」のような並列は読みづらくないので、逆接の「、でも」だけを数える。 */
const CONJ = /(?:のに|ので|けれど|けど|ですが|ますが|だが|、でも|ながら|たり|し、|て、|で、|から、)/g;
/* ぼかし。1文に2つ以上入れない。 */
const HEDGE = /(?:と思います|ですよね|はずです|たぶん|かもしれ|でしょう|ような気|わけではあり)/g;
/* 打ち消しで説明する形。1本につき1段落まで。 */
const NEG = /(?:ではなくて|ではなく、|わけではあり|のではなく)/g;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}

/* {キー: [段落, 段落]} をたどって「1本ぶん」の単位で集める */
function texts(obj) {
  const out = [];
  (function walk(v, trail) {
    if (Array.isArray(v)) {
      if (v.every(x => typeof x === 'string') && v.join('').length > 60) out.push([trail, v]);
      return;
    }
    if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k], trail ? trail + '/' + k : k));
  })(obj, '');
  return out;
}

for (const [name, rel, global] of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log(`\n【${name}】まだありません`); continue; }

  const sandbox = { window: {}, console, Math, Date, Array, String, Number, JSON, Object };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
  const all = texts(sandbox.window[global]);

  console.log(`\n【${name}】本文 ${all.length}本`);

  const chained = [], hedged = [], commas = [], negged = [];
  for (const [key, paras] of all) {
    let negCount = 0;
    for (const p of paras) {
      if (NEG.test(p)) negCount++;
      NEG.lastIndex = 0;
      for (const t of p.split(/(?<=。)/).map(s => s.trim()).filter(Boolean)) {
        const nc = (t.match(CONJ) || []).length;
        const nh = (t.match(HEDGE) || []).length;
        const cm = (t.match(/、/g) || []).length;
        if (nc >= 2) chained.push(key + '  ' + t);
        if (nh >= 2) hedged.push(key + '  ' + t);
        /* 接続の無い文の読点は、ただの並べ立て（「頼まれごと、役目、締切」）なので数えない */
        if (cm >= 3 && nc > 0) commas.push(key + '  ' + t);
      }
    }
    if (negCount >= 2) negged.push(key + '（' + negCount + '段落）');
  }

  const show = a => a.slice(0, 40).map(s => '\n      ' + s).join('');
  check('節を数珠つなぎにしていない（接続は一文に1つまで）', chained.length === 0, chained.length + '件' + show(chained));
  check('ぼかしを重ねていない（一文に1つまで）', hedged.length === 0, hedged.length + '件' + show(hedged));
  check('読点は一文に2つまで', commas.length === 0, commas.length + '件' + show(commas));
  check('打ち消しで説明するのは1本につき1段落まで', negged.length === 0, negged.length + '件  ' + negged.slice(0, 6).join(' / '));
}

console.log(fails ? `\n${fails} 件 失敗\n` : '\nすべて通過\n');
process.exit(fails ? 1 : 0);
