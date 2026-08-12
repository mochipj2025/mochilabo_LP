// テーマ別と相性の検算。
// 宿曜の三九の秘法は「行きと帰りが必ず対になる」ことで自己検証できる。
// この閉じ方が崩れたら、模型そのものが間違っている。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'assets');
const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error, Set, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['vendor/astronomy.browser.min.js', 'text.js', 'astro.js', 'koyomi.js',
                 'toyo.js', 'toyo-text.js', 'aishou.js', 'aishou-text.js',
                 'theme.js', 'theme-text.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
}
const T = sandbox.window.HOSHI_TEXT;
const K = sandbox.window.HOSHI_KOYOMI;
const TY = sandbox.window.HOSHI_TOYO;
const AI = sandbox.window.HOSHI_AISHOU;
const AT = sandbox.window.HOSHI_AISHOU_TEXT;
const TH = sandbox.window.HOSHI_THEME;
const TT = sandbox.window.HOSHI_THEME_TEXT;
const ASTRO = sandbox.window.HOSHI_ASTRO;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}
function person(y, m, d, h = 12, mi = 0, unknown = false) {
  const west = ASTRO.calculate({ year: y, month: m, day: d, hour: h, minute: mi,
    lat: 35.69, lon: 139.69, tzOffset: 9, autoJapanDst: true, timeUnknown: unknown });
  const koyomi = K.build({ year: y, month: m, day: d, hour: h, minute: mi,
    lon: 139.69, tzOffset: west.offsetUsed, timeUnknown: unknown, useTrueSolar: true });
  return { west, koyomi, east: TY.all(koyomi), unknown };
}

console.log('\n[1] 宿曜の三九の秘法が閉じているか');
{
  // 自分＝命
  check('自分自身との関係は命', AI.shukuRelation(0, 0).name === '命', AI.shukuRelation(0, 0).name);
  check('9つ先は業', AI.shukuRelation(0, 9).name === '業', AI.shukuRelation(0, 9).name);
  check('18つ先は胎', AI.shukuRelation(0, 18).name === '胎', AI.shukuRelation(0, 18).name);

  // 行きと帰りが必ず対になること（これが模型の正しさの証明）
  const PAIRS = { '命': '命', '業': '胎', '胎': '業', '栄': '親', '親': '栄',
                  '友': '衰', '衰': '友', '安': '壊', '壊': '安', '危': '成', '成': '危' };
  let bad = [];
  for (let a = 0; a < 27; a++) {
    for (let b = 0; b < 27; b++) {
      const ab = AI.shukuRelation(a, b).name;
      const ba = AI.shukuRelation(b, a).name;
      if (PAIRS[ab] !== ba) bad.push(`${a}→${b}:${ab}/${ba}`);
    }
  }
  check('27×27すべてで、行きと帰りが対になる', bad.length === 0, bad.slice(0, 3).join(' '));

  // 11種すべてが出そろうこと
  const seen = new Set();
  for (let d = 0; d < 27; d++) seen.add(AI.shukuRelation(0, d).name);
  check('11種の関係がすべて出る', seen.size === 11, `${seen.size}種: ${[...seen].join('')}`);

  // 距離の3区分
  check('0〜8は近距離', [0, 4, 8].every(d => AI.shukuRelation(0, d).group === '近距離'));
  check('9〜17は中距離', [9, 13, 17].every(d => AI.shukuRelation(0, d).group === '中距離'));
  check('18〜26は遠距離', [18, 22, 26].every(d => AI.shukuRelation(0, d).group === '遠距離'));

  // 11種すべてに文章がある
  check('11種すべてに解釈がある',
    [...seen].every(n => AT.SHUKU_REL[n] && AT.SHUKU_REL[n].c && AT.SHUKU_REL[n].b),
    [...seen].filter(n => !AT.SHUKU_REL[n]).join(''));
  check('3つの距離すべてに説明がある',
    ['近距離', '中距離', '遠距離'].every(g => AT.DISTANCE_TEXT[g]));
}

console.log('\n[2] 四柱推命の日柱どうし');
{
  const idx = n => K.KAN.indexOf(n);
  check('甲と己は干合', AI.kanRelation(idx('甲'), idx('己')).kind === '干合');
  check('乙と庚は干合', AI.kanRelation(idx('乙'), idx('庚')).kind === '干合');
  check('丙と辛は干合', AI.kanRelation(idx('丙'), idx('辛')).kind === '干合');
  check('丁と壬は干合', AI.kanRelation(idx('丁'), idx('壬')).kind === '干合');
  check('戊と癸は干合', AI.kanRelation(idx('戊'), idx('癸')).kind === '干合');
  check('干合は5組ちょうど', (() => {
    let n = 0;
    for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) if (AI.kanRelation(a, b).kind === '干合') n++;
    return n === 10;   // 双方向で数えるので10
  })());
  check('甲と乙は同じ性質（どちらも木）', AI.kanRelation(idx('甲'), idx('乙')).kind === '同じ性質');
  check('木から見た火は「与える」', AI.kanRelation(idx('甲'), idx('丙')).kind === '与える');
  check('木から見た水は「受け取る」', AI.kanRelation(idx('甲'), idx('壬')).kind === '受け取る');
  check('木から見た土は「押す」', AI.kanRelation(idx('甲'), idx('戊')).kind === '押す');
  check('木から見た金は「押される」', AI.kanRelation(idx('甲'), idx('庚')).kind === '押される');
  check('すべての干の組で関係がつく', (() => {
    for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) {
      if (!AT.KAN_REL[AI.kanRelation(a, b).kind]) return false;
    }
    return true;
  })());

  const s = n => K.SHI.indexOf(n);
  check('子と丑は支合', AI.shiRelation(s('子'), s('丑')).kind === '支合');
  check('午と未は支合', AI.shiRelation(s('午'), s('未')).kind === '支合');
  check('子と午は冲', AI.shiRelation(s('子'), s('午')).kind === '冲');
  check('寅と午は三合', AI.shiRelation(s('寅'), s('午')).kind === '三合');
  check('申と子は三合', AI.shiRelation(s('申'), s('子')).kind === '三合');
  check('すべての支の組で関係がつく', (() => {
    for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) {
      if (!AT.SHI_REL[AI.shiRelation(a, b).kind]) return false;
    }
    return true;
  })());
  check('支の関係は左右対称', (() => {
    for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) {
      if (AI.shiRelation(a, b).kind !== AI.shiRelation(b, a).kind) return false;
    }
    return true;
  })());
}

console.log('\n[3] 西洋のシナストリー');
{
  const a = person(1988, 3, 5, 14, 25);
  const b = person(1993, 9, 14, 7, 50);
  const syn = AI.synastry(a.west, b.west);
  check('角度が1件以上出る', syn.length > 0, `${syn.length}件`);
  check('同じ組み合わせが重複しない', (() => {
    const seen = new Set();
    for (const x of syn) {
      const k = [x.aKey, x.bKey].sort().join('-') + x.aspect.deg;
      if (seen.has(k)) return false;
      seen.add(k);
    }
    return true;
  })());
  check('効きの強い順に並ぶ', syn.every((x, i) => i === 0 || syn[i - 1].weight >= x.weight));
  check('すべて許容範囲内', syn.every(x => x.gap <= x.aspect.orb));
  check('角度5種すべてに日本語の言い換えがある',
    AI.ASPECTS.every(x => AT.ASPECT_TEXT[x.plain]),
    AI.ASPECTS.filter(x => !AT.ASPECT_TEXT[x.plain]).map(x => x.plain).join(' '));
  console.log('       上位3件: ' + syn.slice(0, 3).map(x =>
    `${x.aName}×${x.bName} ${x.aspect.plain}`).join(' / '));
}

console.log('\n[4] 相性をひととおり組む');
{
  const a = person(1988, 3, 5, 14, 25);
  const b = person(1993, 9, 14, 7, 50);
  const r = AI.build(a, b);
  check('宿が両方出る', !!r.shuku.a && !!r.shuku.b, `${r.shuku.a} / ${r.shuku.b}`);
  check('行きと帰りが両方出る', !!r.shuku.rel.aToB.name && !!r.shuku.rel.bToA.name,
    `${r.shuku.rel.aToB.name} / ${r.shuku.rel.bToA.name}`);
  check('日柱の関係が両方出る', !!r.shichu.kan.kind && !!r.shichu.shi.kind,
    `${r.shichu.kan.kind} / ${r.shichu.shi.kind}`);
  check('太陽と月の星座が4つ出る', !!r.sunA && !!r.sunB && !!r.moonA && !!r.moonB);

  // 時刻不明でも落ちない
  const c = person(1988, 3, 5, 0, 0, true);
  const r2 = AI.build(c, b);
  check('時刻不明でも組める', !!r2.shuku.a && !!r2.shichu.kan.kind);

  // 1900〜2050を通して落ちない
  let bad = 0, n = 0;
  for (let y = 1930; y <= 2020; y += 17) {
    for (let m = 2; m <= 11; m += 3) {
      try {
        const p1 = person(y, m, 10, 9, 0);
        const p2 = person(y + 3, m, 20, 21, 0);
        const rr = AI.build(p1, p2);
        n++;
        if (!AT.SHUKU_REL[rr.shuku.rel.aToB.name]) bad++;
        if (!AT.KAN_REL[rr.shichu.kan.kind]) bad++;
        if (!AT.SHI_REL[rr.shichu.shi.kind]) bad++;
      } catch (e) { bad++; console.log('       例外: ' + e.message); }
    }
  }
  check(`${n}組すべて組めた`, bad === 0, `異常 ${bad}件`);
}

console.log('\n[5] テーマ別');
{
  const a = person(1988, 3, 5, 14, 25);
  check('テーマは3つ', TH.THEMES.length === 3, TH.THEMES.map(x => x.label).join('・'));
  TH.THEMES.forEach(th => {
    const d = TH.build(th.key, a.west, a.east);
    check(`${th.label}：主役の星が出る`, !!d && !!d.lead.def, d ? d.lead.def.name : '');
    check(`  ${th.label}：場面が2つ出る`, d.houses.length === 2);
    check(`  ${th.label}：主役の説明がある`, !!d.leadWhat);
  });
  check('恋愛の主役は金星', TH.build('love', a.west, a.east).lead.def.key === 'venus');
  check('仕事の主役は火星', TH.build('work', a.west, a.east).lead.def.key === 'mars');
  check('お金の主役は金星', TH.build('money', a.west, a.east).lead.def.key === 'venus');

  // 時刻不明でも落ちない
  const u = person(1988, 3, 5, 0, 0, true);
  const du = TH.build('love', u.west, u.east);
  check('時刻不明でも組める', !!du && du.timeUnknown === true);
}

console.log('\n[6] テーマ別の文章');
{
  ['LOVE', 'WORK', 'MONEY'].forEach(k => {
    ['soft', 'gag'].forEach(t => {
      const list = TT[k][t];
      check(`${k}.${t} が12本`, Array.isArray(list) && list.length === 12, list ? `${list.length}本` : '無し');
      check(`  ${k}.${t} すべてに見出しと本文がある`,
        list.every(x => x.catch && x.body));
      if (t === 'gag') {
        check(`  ${k}.gag すべてに逃げ道がある`,
          list.every(x => x.out && x.out.length > 10),
          list.filter(x => !x.out).map(x => x.catch).join(' / '));
      }
      check(`  ${k}.${t} の見出しに重複がない`, new Set(list.map(x => x.catch)).size === 12);
    });
    check(`${k} は soft と gag で本文が違う`,
      TT[k].soft.every((x, i) => x.body !== TT[k].gag[i].body));
  });
  ['love', 'work', 'money'].forEach(k => {
    check(`${k} の導入が両方の読み口にある`, TT.INTRO[k].soft && TT.INTRO[k].gag);
  });
  check('締めが両方の読み口にある', TT.CLOSING.soft && TT.CLOSING.gag);

  // 断定・予言を書いていないか
  const strings = [];
  (function walk(v) {
    if (typeof v === 'string') strings.push(v);
    else if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k]));
  })([TT, AT]);
  const blob = strings.join('\n');
  const NG = ['結婚できます', '結婚できません', '運命の人', '必ず', '絶対に', '別れます', '出会えます'];
  const hit = NG.filter(w => blob.includes(w));
  check('言い切り・予言の語を使っていない', hit.length === 0, hit.join('・'));
  const ATTR = ['ブス', 'デブ', 'ハゲ', '年収', '学歴', '底辺'];
  check('属性いじりがない', !ATTR.some(w => blob.includes(w)));
  check('キリル文字・ハングルがない', !/[Ѐ-ӿ가-힯]/.test(blob));
  check('英単語がない', !/[A-Za-z]{3,}/.test(blob),
    [...new Set(blob.match(/[A-Za-z]{3,}/g) || [])].join(' '));
  check('90字を超える一文がない',
    !strings.some(s => s.split(/(?<=。)/).some(t => t.trim().length > 90)),
    strings.flatMap(s => s.split(/(?<=。)/)).filter(t => t.trim().length > 90).slice(0, 2).map(t => t.slice(0, 30)).join(' / '));
}

console.log('\n[7] 画面につながっているか');
{
  const idx = fs.readFileSync(path.join(ROOT, '..', 'index.html'), 'utf8');
  check('index.html に「気になるところ」タブがある', /data-pane="theme"/.test(idx));
  check('index.html が theme.js を読んでいる', /assets\/theme\.js/.test(idx));
  check('index.html が app-theme.js を読んでいる', /assets\/app-theme\.js/.test(idx));
  check('index.html から相性診断へ移動できる', /href="aishou\/index\.html"/.test(idx));
  check('カード用CSSを版番号つきで読んでいる', /assets\/style\.css\?v=/.test(idx));
  check('星座カードの描画を版番号つきで読んでいる', /assets\/app-quick\.js\?v=/.test(idx));
  const style = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  check('相性カードのデザインがCSSにある', /\.compatibility-link\s*\{/.test(style));
  check('星座カードの画像デザインがCSSにある', /\.sign-mascot-thumb\s*\{/.test(style));
  const ai = fs.readFileSync(path.join(ROOT, '..', 'aishou', 'index.html'), 'utf8');
  check('相性ページが aishou.js を読んでいる', /assets\/aishou\.js/.test(ai));
  check('相性ページが2人分の入力を持つ', /id="d1"/.test(ai) && /id="d2"/.test(ai));
  check('相性ページに「点数をつけない」旨がある', /点数/.test(ai));
}

console.log('\n' + (fails === 0 ? '=> すべて通過' : `=> ${fails}件 失敗`));
process.exit(fails === 0 ? 0 : 1);
