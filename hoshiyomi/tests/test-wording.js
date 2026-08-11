// 「わかりやすさ」を保つための検査。
// このツールの存在理由は、記号と専門用語を出さずに読めることなので、
// そこが崩れていないかを機械的に確かめる。文章を足すたびに走らせる。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'assets');
const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error, Set, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['vendor/astronomy.browser.min.js', 'text.js', 'text-spicy.js', 'koyomi.js', 'toyo.js',
                 'toyo-text.js', 'y2026.js', 'y2026-text.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
}
const T = sandbox.window.HOSHI_TEXT;
const TX = sandbox.window.HOSHI_TOYO_TEXT;
const YT = sandbox.window.HOSHI_Y2026_TEXT;
const SP = sandbox.window.HOSHI_TEXT_SPICY;

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

console.log('\n[1] 怖い字が読み物に出ていないか');
{
  // 用語集は「そう書かれることもある」と説明する場所なので、対象から外す。
  const SCARY = ['天中殺', '空亡', '大殺界'];
  const targets = {
    '生まれた日の解釈': TX.NISSHU,
    '十二運の言い換え（表に出る側）': Object.keys(TX.UNSEI_PLAIN).map(k => TX.UNSEI_PLAIN[k].plain),
    '通変星の言い換え（表に出る側）': Object.keys(TX.TSUHEN).map(k => TX.TSUHEN[k].plain),
    '宿の解釈': TX.SHUKU_TEXT,
    '九星の解釈': TX.KYUSEI_TEXT,
    '紫微斗数の星': TX.SHUSEI_TEXT,
    '2026年の東洋': [YT.TOYO_INTRO, YT.TOYO_KUBO, strings(YT.TOYO_TSUHEN), strings(YT.TOYO_PALACE), strings(YT.TOYO_REL)]
  };
  for (const [name, obj] of Object.entries(targets)) {
    const blob = strings(obj).join('\n');
    const hit = SCARY.filter(w => blob.includes(w));
    check(`${name}に「${SCARY.join('」「')}」が出ない`, hit.length === 0, hit.join('・'));
  }
  // 十二運の「死」「絶」「墓」は、表に出る plain 側に出ていないこと
  const plains = Object.keys(TX.UNSEI_PLAIN).map(k => TX.UNSEI_PLAIN[k].plain).join('');
  check('十二運の表示名に「死」「絶」「墓」が出ない',
    !/[死絶墓]/.test(plains), (plains.match(/[死絶墓]/g) || []).join(''));
  // ただし用語集ではきちんと説明していること
  const gloss = TX.GLOSSARY.map(g => g[0] + g[1]).join('\n');
  check('用語集では「死」という字にも触れている', gloss.includes('死'));
  check('用語集では天中殺にも触れている', gloss.includes('天中殺'));
}

console.log('\n[2] 具体例が入っているか');
{
  function ratio(list) {
    const withEx = list.filter(s => s.includes('たとえば'));
    return { n: list.length, ok: withEx.length };
  }
  const sets = {
    '太陽の12星座': T.core.sun.map(x => x.body),
    '月の12星座': T.core.moon.map(x => x.body),
    'アセンダントの12星座': T.core.asc.map(x => x.body),
    '生まれた日の10種': Object.keys(TX.NISSHU).map(k => TX.NISSHU[k].body),
    '2026年の12星座別': YT.SIGN_SUMMARY.map(x => x.body),
    '2026年の今年の働き': Object.keys(YT.TOYO_TSUHEN).map(k => YT.TOYO_TSUHEN[k].body),
    '2026年の九星': Object.keys(YT.TOYO_PALACE).map(k => YT.TOYO_PALACE[k].body)
  };
  for (const [name, list] of Object.entries(sets)) {
    const r = ratio(list);
    // 12星座別のまとめは実際の星の動きで書くので、例が無くても成立する
    const need = name === '2026年の12星座別' ? 0 : r.n;
    check(`${name}：${r.n}本すべてに「たとえば」がある`, r.ok >= need, `${r.ok}/${r.n}本`);
  }
  // ハウスの具体例
  check('12の場面すべてに具体例がある',
    T.houses.every(h => h.examples && h.examples.length > 10),
    T.houses.filter(h => !h.examples).map(h => h.n).join(','));
}

console.log('\n[3] 一文が長すぎないか');
{
  const LIMIT = 90;
  function longSentences(list) {
    const bad = [];
    list.forEach(s => {
      s.split(/(?<=。)/).forEach(t => {
        const clean = t.trim();
        if (clean.length > LIMIT) bad.push(clean.slice(0, 40) + '…（' + clean.length + '字）');
      });
    });
    return bad;
  }
  const all = {
    '西洋の解釈': strings(T.core).concat(T.signs.map(s => s.note)),
    '東洋の解釈': strings(TX.NISSHU).concat(strings(TX.SHUKU_TEXT), strings(TX.KYUSEI_TEXT)),
    '2026年': strings(YT.SIGN_SUMMARY).concat(strings(YT.BY_HOUSE))
  };
  for (const [name, list] of Object.entries(all)) {
    const bad = longSentences(list);
    check(`${name}に${LIMIT}字を超える一文がない`, bad.length === 0, bad.slice(0, 3).join(' / '));
  }
}

console.log('\n[4] 星の説明が「何の担当か」から始まるか');
{
  check('10天体すべてに導入文がある',
    T.planets.every(p => p.intro && p.intro.length > 10),
    T.planets.filter(p => !p.intro).map(p => p.name).join(','));
  check('導入文が天体の名前から始まる',
    T.planets.every(p => p.intro.indexOf(p.name) === 0),
    T.planets.filter(p => p.intro.indexOf(p.name) !== 0).map(p => p.name).join(','));
  check('星どうしの角度に、日本語の言い換えがある',
    T.aspects.every(a => a.plain && a.plain.length >= 3),
    T.aspects.filter(a => !a.plain).map(a => a.name).join(','));
}

console.log('\n[5] 日本語以外が混ざっていないか');
{
  // 西洋は key や body に英語の識別子を持っているので、画面に出る欄だけを見る
  const westVisible = [
    T.signs.map(s => [s.name, s.how, s.note].concat(s.adj)),
    T.planets.map(p => [p.name, p.what, p.intro, p.detail]),
    T.houses.map(h => [h.topic, h.where, h.examples]),
    T.aspects.map(a => [a.plain, a.meaning]),
    T.core, T.elements, T.elementComment, T.qualities, T.qualityComment, T.glossary
  ];
  for (const [name, obj] of Object.entries({ '西洋': westVisible, '東洋': TX, '2026年': YT })) {
    const blob = strings(obj).join('\n');
    check(`${name}にキリル文字・ハングルがない`, !/[Ѐ-ӿ가-힯]/.test(blob),
      (blob.match(/[Ѐ-ӿ가-힯]/g) || []).join(''));
    const latin = blob.match(/[A-Za-z]{3,}/g);
    check(`${name}に英単語がない`, !latin, latin ? [...new Set(latin)].join(' ') : undefined);
  }
}

console.log('\n[6] 描画コードの中に、専門用語が直書きされていないか');
{
  // 文章は text ファイルにあるが、組み立ての途中の文言は app*.js に直接書いてある。
  // ここに用語が混ざると、読み物側だけ直しても画面には残ってしまう。
  const BANNED = ['命式', '蔵干', '天中殺', '空亡', 'イングレス', 'トランジット', 'オーブ', '回座', '通変星'];
  for (const f of ['app.js', 'app-toyo.js', 'app-y2026.js', 'y2026.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')   // ブロックコメントを除く
      .replace(/\/\/[^\n]*/g, '');        // 行コメントを除く
    // 文字列リテラルの中だけを見る
    const literals = (src.match(/'[^'\n]*'/g) || []).join('\n');
    const hit = BANNED.filter(w => literals.includes(w));
    check(`${f} に「${BANNED.join('」「')}」が直書きされていない`, hit.length === 0, hit.join('・'));
  }
  // 用語集にはちゃんと載っていること（消すのと、説明しないのは別）
  const glossWords = TX.GLOSSARY.map(g => g[0]).join('|') + '|' + T.glossary.map(g => g[0]).join('|');
  ['蔵干', '通変星', '空亡', 'オーブ', 'ハウス'].forEach(w => {
    check(`用語集に「${w}」の項目がある`, glossWords.includes(w));
  });
}

console.log('\n[6b] 東洋側の小さい図');
{
  // アイコンは記号の置き換えではなく文字の補助。データの網羅だけ機械で見る。
  const src = fs.readFileSync(path.join(ROOT, 'icons.js'), 'utf8');
  const box = { window: {}, document: undefined };
  box.globalThis = box;
  vm.createContext(box);
  vm.runInContext(src, box);
  const I = box.window.HOSHI_ICONS;

  check('icons.js が読み込める', !!I);
  check('五行5つぶんの形がそろう',
    ['木','火','土','金','水'].every(g => Array.isArray(I.GOGYO_PATH[g]) && I.GOGYO_PATH[g].length > 0));
  check('五行5つぶんの色がそろう', ['木','火','土','金','水'].every(g => /^#[0-9a-f]{6}$/i.test(I.GOGYO_COLOR[g])));
  check('方位盤が9マス', I.COMPASS_CELLS.length === 9, `${I.COMPASS_CELLS.length}マス`);
  check('方位盤に9方角がそろう',
    ['南東','南','南西','東','中央','西','北東','北','北西'].every(d => I.COMPASS_CELLS.includes(d)));
  check('方位盤は上が南、下が北（気学の向き）',
    I.COMPASS_CELLS[1] === '南' && I.COMPASS_CELLS[7] === '北' &&
    I.COMPASS_CELLS[3] === '東' && I.COMPASS_CELLS[5] === '西',
    I.COMPASS_CELLS.join(' '));
  check('十二運12段ぶんの高さがそろう',
    I.UNSEI_ORDER.length === 12 && I.UNSEI_ORDER.every(u => typeof I.UNSEI_HEIGHT[u] === 'number'));
  check('高さが帝旺で最大、絶で最小',
    I.UNSEI_ORDER.every(u => I.UNSEI_HEIGHT[u] <= I.UNSEI_HEIGHT['帝旺']) &&
    I.UNSEI_ORDER.every(u => I.UNSEI_HEIGHT[u] >= I.UNSEI_HEIGHT['絶']));

  // 九星の宮名から方角へ、抜けなく変換できるか
  const Y = sandbox.window.HOSHI_Y2026;
  check('九星の9宮すべてが方位盤のマスに対応する',
    Y.PALACE_PATH.every(p => I.COMPASS_CELLS.includes(p.dir)),
    Y.PALACE_PATH.filter(p => !I.COMPASS_CELLS.includes(p.dir)).map(p => p.name + ':' + p.dir).join(' '));

  // 図を足しても、文字を消していないこと（アイコンだけにしない）
  const toyoSrc = fs.readFileSync(path.join(ROOT, 'app-toyo.js'), 'utf8');
  check('五行のバーは文字も併記している', /head\.appendChild\(el\('span'/.test(toyoSrc));
  check('方位盤のマスに方角の文字が入る', /cell\.textContent = d/.test(src));

  const blob = JSON.stringify(I.COMPASS_CELLS) + I.UNSEI_ORDER.join('');
  check('図のラベルに日本語以外がない', !/[Ѐ-ӿ가-힯A-Za-z]/.test(blob));
  check('icons.js のコメントに日本語以外がない',
    !/[Ѐ-ӿ가-힯]/.test(src), (src.match(/[Ѐ-ӿ가-힯]/g) || []).join(''));
}

console.log('\n[7] 毒舌版');
{
  const spicySets = {
    '太陽': SP.core.sun, '月': SP.core.moon, 'アセンダント': SP.core.asc,
    '2026年の12星座別': SP.SIGN_SUMMARY
  };
  for (const [name, list] of Object.entries(spicySets)) {
    check(`${name}が12本そろう`, list.length === 12, `${list.length}本`);
    check(`  ${name}に重複がない`, new Set(list.map(x => x.catch)).size === 12);
    // 中辛は「最後に一本道を残す」から成立する。out が無いとただの悪口になる。
    check(`  ${name}すべてに逃げ道（out）がある`,
      list.every(x => x.out && x.out.length > 10),
      list.filter(x => !x.out).map(x => x.catch).join(' / '));
  }
  const nisshu = Object.keys(SP.NISSHU);
  check('生まれた日の10種がそろう', nisshu.length === 10 && Object.keys(TX.NISSHU).every(k => SP.NISSHU[k]));
  check('  10種すべてに逃げ道がある', nisshu.every(k => SP.NISSHU[k].out && SP.NISSHU[k].out.length > 10));
  const shuku = Object.keys(SP.SHUKU);
  check('27宿がそろう', shuku.length === 27 && Object.keys(TX.SHUKU_TEXT).every(k => SP.SHUKU[k]));
  check('  27宿すべてに逃げ道がある', shuku.every(k => SP.SHUKU[k].o && SP.SHUKU[k].o.length > 10));

  const spicyStrings = strings(SP);
  check('毒舌版でも一文が90字を超えない',
    !spicyStrings.some(s => s.split(/(?<=。)/).some(t => t.trim().length > 90)),
    spicyStrings.flatMap(s => s.split(/(?<=。)/)).filter(t => t.trim().length > 90)
      .slice(0, 2).map(t => t.slice(0, 30) + '…').join(' / '));
  const blob = spicyStrings.join('\n');
  check('毒舌版に専門用語が混ざっていない',
    !['命式','蔵干','天中殺','空亡','通変星','十二運'].some(w => blob.includes(w)));
  check('毒舌版に日本語以外が混ざっていない', !/[Ѐ-ӿ가-힯]/.test(blob) && !/[A-Za-z]{3,}/.test(blob));

  // 人格否定に寄りすぎていないか。断定で殴る語は使わない方針。
  const NG = ['最低', 'クズ', '無能', 'バカ', '馬鹿です', '価値がない', '救いようがない'];
  const hit = NG.filter(w => blob.includes(w));
  check('人格を否定する語を使っていない', hit.length === 0, hit.join('・'));

  // やさしい版と毒舌版で、同じ人に別の文章が出ること
  check('やさしい版と毒舌版の文面が違う',
    SP.core.sun.every((x, i) => x.body !== T.core.sun[i].body));

  check('毒舌に切り替えたときの注意書きがある', SP.NOTICE && SP.NOTICE.includes('やさしい'));
  check('切り替えの仕組みが読み込まれている',
    typeof sandbox.window.HOSHI_TONE === 'object' &&
    typeof sandbox.window.HOSHI_TONE.isSpicy === 'function');
}

console.log('\n' + (fails === 0 ? '=> すべて通過' : `=> ${fails}件 失敗`));
process.exit(fails === 0 ? 0 : 1);
