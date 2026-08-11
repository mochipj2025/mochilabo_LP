// ギャグ版（読み口 gag）の受け入れテスト。
//
// これは SPEC-gag-tone.md の合格条件そのものです。
// 作業前は「assets/text-gag.js がまだありません」で落ちます。それが正常です。
// このテストが全部通れば、作業は完了とみなせます。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'assets');
const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error, Set, Object,
  localStorage: { getItem: () => null, setItem: () => {} } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(f, required) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) {
    if (required) {
      console.log(`\n  FAIL ${f} がまだありません。SPEC-gag-tone.md を読んで作ってください。\n`);
      process.exit(1);
    }
    return false;
  }
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox);
  return true;
}

load('tone.js');                       // 分離されていれば読む（無くても可）
load('text.js', true);
load('text-spicy.js', true);
load('toyo-text.js', true);
load('y2026-text.js', true);
load('text-gag.js', true);             // ← これが本題

const T = sandbox.window.HOSHI_TEXT;
const TX = sandbox.window.HOSHI_TOYO_TEXT;
const SP = sandbox.window.HOSHI_TEXT_SPICY;
const G = sandbox.window.HOSHI_TEXT_GAG;
const TONE = sandbox.window.HOSHI_TONE;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}
function strings(obj) {
  const out = [];
  (function walk(v) {
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k]));
  })(obj);
  return out;
}
function sentences(s) { return s.split(/(?<=[。？！])/).map(x => x.trim()).filter(Boolean); }

console.log('\n[1] 形がそろっているか（毒舌版とまったく同じ形にすること）');
{
  check('window.HOSHI_TEXT_GAG がある', !!G);
  if (!G) { console.log('\n=> 1件以上 失敗'); process.exit(1); }

  ['sun', 'moon', 'asc'].forEach(k => {
    const list = G.core && G.core[k];
    check(`core.${k} が12本`, Array.isArray(list) && list.length === 12,
      list ? `${list.length}本` : '無し');
    if (Array.isArray(list)) {
      check(`  core.${k} すべてに catch / body / out がある`,
        list.every(x => x && x.catch && x.body && x.out),
        list.map((x, i) => (!x || !x.catch || !x.body || !x.out) ? `[${i}]` : '').filter(Boolean).join(' '));
    }
  });

  const nisshuKeys = Object.keys(TX.NISSHU);
  check('NISSHU が10種、鍵も毒舌版と一致',
    G.NISSHU && Object.keys(G.NISSHU).length === 10 && nisshuKeys.every(k => G.NISSHU[k]),
    G.NISSHU ? nisshuKeys.filter(k => !G.NISSHU[k]).join('') : '無し');
  check('  NISSHU すべてに catch / body / out がある',
    G.NISSHU && nisshuKeys.every(k => G.NISSHU[k] && G.NISSHU[k].catch && G.NISSHU[k].body && G.NISSHU[k].out));

  const shukuKeys = Object.keys(TX.SHUKU_TEXT);
  check('SHUKU が27種、鍵も毒舌版と一致',
    G.SHUKU && Object.keys(G.SHUKU).length === 27 && shukuKeys.every(k => G.SHUKU[k]),
    G.SHUKU ? shukuKeys.filter(k => !G.SHUKU[k]).join('') : '無し');
  check('  SHUKU すべてに c / b / o がある',
    G.SHUKU && shukuKeys.every(k => G.SHUKU[k] && G.SHUKU[k].c && G.SHUKU[k].b && G.SHUKU[k].o));

  check('SIGN_SUMMARY が12本',
    Array.isArray(G.SIGN_SUMMARY) && G.SIGN_SUMMARY.length === 12,
    G.SIGN_SUMMARY ? `${G.SIGN_SUMMARY.length}本` : '無し');
  check('  SIGN_SUMMARY すべてに catch / body / out がある',
    Array.isArray(G.SIGN_SUMMARY) && G.SIGN_SUMMARY.every(x => x.catch && x.body && x.out));

  check('NOTICE がある', typeof G.NOTICE === 'string' && G.NOTICE.length > 20);
  const total = 12 * 3 + 10 + 27 + 12;
  check(`合計 ${total} 本そろっている`, total === 85);
}

console.log('\n[2] 逃げ道（out）が必ずあるか');
{
  // ギャグ版でも、笑わせたあとに一本道を残す。ここが無いとただの悪口になる。
  const all = [];
  ['sun', 'moon', 'asc'].forEach(k => G.core[k].forEach(x => all.push({ id: `core.${k}`, out: x.out })));
  Object.keys(G.NISSHU).forEach(k => all.push({ id: `NISSHU.${k}`, out: G.NISSHU[k].out }));
  Object.keys(G.SHUKU).forEach(k => all.push({ id: `SHUKU.${k}`, out: G.SHUKU[k].o }));
  G.SIGN_SUMMARY.forEach((x, i) => all.push({ id: `SIGN_SUMMARY[${i}]`, out: x.out }));
  const missing = all.filter(x => !x.out || x.out.length < 10);
  check(`85本すべてに逃げ道がある`, missing.length === 0, missing.map(x => x.id).slice(0, 5).join(' '));
}

console.log('\n[3] ツッコミのリズムになっているか');
{
  const bodies = []
    .concat(...['sun', 'moon', 'asc'].map(k => G.core[k].map((x, i) => ({ id: `core.${k}[${i}]`, s: x.body }))))
    .concat(Object.keys(G.NISSHU).map(k => ({ id: `NISSHU.${k}`, s: G.NISSHU[k].body })))
    .concat(Object.keys(G.SHUKU).map(k => ({ id: `SHUKU.${k}`, s: G.SHUKU[k].b })))
    .concat(G.SIGN_SUMMARY.map((x, i) => ({ id: `SIGN_SUMMARY[${i}]`, s: x.body })));

  const few = bodies.filter(x => sentences(x.s).length < 3);
  check('どの本文も3文以上ある', few.length === 0, few.map(x => x.id).slice(0, 5).join(' '));

  // 短い一文で落とすのがギャグのリズム。25字以内の文が最低ひとつ要る。
  const noPunch = bodies.filter(x => !sentences(x.s).some(t => t.length <= 25));
  check('どの本文にも25字以内の短い一文がある', noPunch.length === 0,
    noPunch.map(x => x.id).slice(0, 5).join(' '));

  const tooLong = bodies.filter(x => sentences(x.s).some(t => t.length > 90));
  check('90字を超える一文がない', tooLong.length === 0, tooLong.map(x => x.id).slice(0, 5).join(' '));
}

console.log('\n[4] 中身がほかの読み口と違うか');
{
  check('やさしい版と本文が違う（太陽）',
    G.core.sun.every((x, i) => x.body !== T.core.sun[i].body));
  check('毒舌版と本文が違う（太陽）',
    G.core.sun.every((x, i) => x.body !== SP.core.sun[i].body));
  check('毒舌版と本文が違う（月）',
    G.core.moon.every((x, i) => x.body !== SP.core.moon[i].body));
  check('毒舌版と本文が違う（アセンダント）',
    G.core.asc.every((x, i) => x.body !== SP.core.asc[i].body));
  check('毒舌版と本文が違う（生まれた日）',
    Object.keys(G.NISSHU).every(k => G.NISSHU[k].body !== SP.NISSHU[k].body));
  check('毒舌版と本文が違う（宿）',
    Object.keys(G.SHUKU).every(k => G.SHUKU[k].b !== SP.SHUKU[k].b));
  check('毒舌版と本文が違う（2026年）',
    G.SIGN_SUMMARY.every((x, i) => x.body !== SP.SIGN_SUMMARY[i].body));

  ['sun', 'moon', 'asc'].forEach(k => {
    check(`core.${k} の見出しに重複がない`, new Set(G.core[k].map(x => x.catch)).size === 12);
  });
  check('SIGN_SUMMARY の見出しに重複がない', new Set(G.SIGN_SUMMARY.map(x => x.catch)).size === 12);
  check('SHUKU の見出しに重複がない', new Set(Object.keys(G.SHUKU).map(k => G.SHUKU[k].c)).size === 27);
}

console.log('\n[5] 書いてはいけないもの');
{
  const blob = strings(G).join('\n');

  // 属性ではなく行動を笑う。見た目・年齢・性別・収入・病気・家族構成はいじらない。
  const ATTR = ['ブス', 'デブ', 'ハゲ', '不細工', 'おばさん', 'おじさん', '年収', '独身',
    'モテない', '結婚できない', '子なし', '実家暮らし', '学歴', '底辺'];
  const attrHit = ATTR.filter(w => blob.includes(w));
  check('見た目・年齢・収入・家族構成をいじっていない', attrHit.length === 0, attrHit.join('・'));

  // 人格否定はしない（毒舌版と同じ）
  const NG = ['最低', 'クズ', '無能', 'バカ', '馬鹿', '価値がない', '救いようがない', '終わってる'];
  const ngHit = NG.filter(w => blob.includes(w));
  check('人格を否定する語を使っていない', ngHit.length === 0, ngHit.join('・'));

  // 専門用語（既存ルールの継続）
  const JARGON = ['命式', '蔵干', '天中殺', '空亡', '通変星', '十二運', 'ハウス', 'トランジット', 'オーブ'];
  const jHit = JARGON.filter(w => blob.includes(w));
  check('専門用語が混ざっていない', jHit.length === 0, jHit.join('・'));

  check('キリル文字・ハングルがない', !/[Ѐ-ӿ가-힯]/.test(blob),
    (blob.match(/[Ѐ-ӿ가-힯]/g) || []).join(''));
  check('英単語がない', !/[A-Za-z]{3,}/.test(blob),
    [...new Set(blob.match(/[A-Za-z]{3,}/g) || [])].join(' '));
}

console.log('\n[6] 切り替えの仕組みが3つに対応しているか');
{
  check('HOSHI_TONE がある', typeof TONE === 'object');
  check('gag を設定できる', (TONE.set('gag'), TONE.value === 'gag'), TONE.value);
  check('pack() がギャグ版を返す', TONE.pack && TONE.pack() === G);
  check('spicy にすると毒舌版を返す', (TONE.set('spicy'), TONE.pack() === SP));
  check('soft にすると null を返す', (TONE.set('soft'), TONE.pack() === null));
  check('知らない値は soft に落ちる', (TONE.set('nonsense'), TONE.value === 'soft'), TONE.value);
  check('isSpicy() が残っている（既存コード互換）',
    typeof TONE.isSpicy === 'function' && (TONE.set('spicy'), TONE.isSpicy() === true));
  TONE.set('soft');
}

console.log('\n[7] 画面につながっているか');
{
  const idx = fs.readFileSync(path.join(ROOT, '..', 'index.html'), 'utf8');
  const y26 = fs.readFileSync(path.join(ROOT, '..', '2026', 'index.html'), 'utf8');
  check('index.html に gag ボタンがある', /data-tone="gag"/.test(idx));
  check('2026/index.html に gag ボタンがある', /data-tone="gag"/.test(y26));
  check('index.html が text-gag.js を読んでいる', /assets\/text-gag\.js/.test(idx));
  check('2026/index.html が text-gag.js を読んでいる', /assets\/text-gag\.js/.test(y26));

  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  check('style.css に gag ボタンの色がある', /\[data-tone="gag"\]/.test(css));

  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const toyo = fs.readFileSync(path.join(ROOT, 'app-toyo.js'), 'utf8');
  const y = fs.readFileSync(path.join(ROOT, 'app-y2026.js'), 'utf8');
  check('app.js が pack() を使っている', /HOSHI_TONE\.pack\(\)/.test(app));
  check('app-toyo.js が pack() を使っている', /HOSHI_TONE\.pack\(\)/.test(toyo));
  check('app-y2026.js が pack() を使っている', /HOSHI_TONE\.pack\(\)/.test(y));
}

console.log('\n' + (fails === 0 ? '=> すべて通過' : `=> ${fails}件 失敗`));
process.exit(fails === 0 ? 0 : 1);
