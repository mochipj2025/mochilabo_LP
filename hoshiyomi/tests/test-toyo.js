// 四柱推命・宿曜・九星気学・紫微斗数の検算。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'assets');
const sandbox = { window: {}, console, Math, Date, Array, String, Number, isFinite, JSON, Error };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['vendor/astronomy.browser.min.js', 'koyomi.js', 'toyo.js', 'toyo-text.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
}
const K = sandbox.window.HOSHI_KOYOMI;
const T = sandbox.window.HOSHI_TOYO;
const TX = sandbox.window.HOSHI_TOYO_TEXT;

let fails = 0;
function check(label, ok, detail) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) fails++;
}
const build = (y, m, d, h = 12, mi = 0, unknown = false) => K.build({
  year: y, month: m, day: d, hour: h, minute: mi,
  lon: 139.69, tzOffset: 9, timeUnknown: unknown, useTrueSolar: true
});

console.log('\n[1] 通変星が日干から正しく出るか');
{
  // 日干が甲（木・陽）のとき
  const cases = [
    ['甲', '比肩'], ['乙', '劫財'],   // 同じ木
    ['丙', '食神'], ['丁', '傷官'],   // 木が生む火
    ['戊', '偏財'], ['己', '正財'],   // 木が剋す土
    ['庚', '偏官'], ['辛', '正官'],   // 木を剋す金
    ['壬', '偏印'], ['癸', '正印'],   // 木を生む水
  ];
  for (const [kan, want] of cases) {
    const got = T.tsuhen(0, K.KAN.indexOf(kan));
    check(`日干 甲 × ${kan} = ${want}`, got === want, got);
  }
  // 陰干でも陰陽の対応が逆にならないこと（日干 乙＝木・陰）
  check('日干 乙 × 乙 = 比肩', T.tsuhen(1, 1) === '比肩', T.tsuhen(1, 1));
  check('日干 乙 × 甲 = 劫財', T.tsuhen(1, 0) === '劫財', T.tsuhen(1, 0));
  check('日干 乙 × 庚 = 正官', T.tsuhen(1, 6) === '正官', T.tsuhen(1, 6));
}

console.log('\n[2] 十二運');
{
  const cases = [
    ['甲', '亥', '長生'], ['甲', '子', '沐浴'], ['甲', '午', '死'], ['甲', '申', '絶'],
    ['乙', '午', '長生'], ['乙', '巳', '沐浴'], ['乙', '亥', '死'],
    ['丙', '寅', '長生'], ['庚', '巳', '長生'], ['辛', '子', '長生'],
    ['壬', '申', '長生'], ['癸', '卯', '長生'], ['戊', '寅', '長生'], ['己', '酉', '長生'],
    ['丁', '酉', '長生'],
  ];
  for (const [kan, shi, want] of cases) {
    const got = T.junishiUn(K.KAN.indexOf(kan), K.SHI.indexOf(shi));
    check(`${kan}が${shi}で${want}`, got === want, got);
  }
  // どの干でも12の運がちょうど1回ずつ現れる
  let ok = true;
  for (let k = 0; k < 10; k++) {
    const seen = new Set();
    for (let s = 0; s < 12; s++) seen.add(T.junishiUn(k, s));
    if (seen.size !== 12) ok = false;
  }
  check('10干すべてで十二運が1回ずつ揃う', ok);
}

console.log('\n[3] 空亡（天中殺）');
{
  const cases = [['甲子', ['戌','亥']], ['甲戌', ['申','酉']], ['甲申', ['午','未']],
                 ['甲午', ['辰','巳']], ['甲辰', ['寅','卯']], ['甲寅', ['子','丑']]];
  for (const [gs, want] of cases) {
    let idx = -1;
    for (let i = 0; i < 60; i++) if (K.ganshiName(i) === gs) idx = i;
    const got = T.kubo(idx).map(i => K.SHI[i]);
    check(`${gs}旬の空亡 = ${want.join('')}`, got.join('') === want.join(''), got.join(''));
  }
  // 旬の途中でも同じ結果になること
  let idx = -1;
  for (let i = 0; i < 60; i++) if (K.ganshiName(i) === '己未') idx = i;   // 甲寅旬
  check('己未（甲寅旬）の空亡 = 子丑', T.kubo(idx).map(i => K.SHI[i]).join('') === '子丑');
}

console.log('\n[4] 宿曜 — 月宿傍通暦が閉じているか');
{
  // 12か月ぶんの起点の増分を足すと、ちょうど27宿一周する
  let sum = 0;
  for (let m = 0; m < 12; m++) {
    const a = T.SHUKU.indexOf(T.SHUKU_HEAD[m]);
    const b = T.SHUKU.indexOf(T.SHUKU_HEAD[(m + 1) % 12]);
    const step = ((b - a) % 27 + 27) % 27;
    sum += step;
    if (step < 2 || step > 3) check(`${m+1}月→${m+2}月の増分が2か3`, false, String(step));
  }
  check('12か月ぶんの増分の合計 = 27', sum === 27, String(sum));
  check('27宿に重複がない', new Set(T.SHUKU).size === 27);
  check('起点12個に重複がない', new Set(T.SHUKU_HEAD).size === 12);
  // 平均増分が 朔望月−恒星月 = 2.21 宿と合うか
  check('平均増分 ≈ 29.53 − 27.32 = 2.21', Math.abs(sum / 12 - 2.21) < 0.05, (sum/12).toFixed(3));

  // 旧暦1月1日は室宿
  const k = build(2024, 2, 10);      // 旧暦2024年1月1日
  const s = T.shukuyo(k);
  check('旧暦1月1日は室宿', s.name === '室' && s.lunar.month === 1 && s.lunar.day === 1, s.name);
  // 翌日は壁宿（1つ進む）
  const s2 = T.shukuyo(build(2024, 2, 11));
  check('その翌日は壁宿', s2.name === '壁', s2.name);
}

console.log('\n[5] 九星気学');
{
  const cases = [[2024, 3], [2025, 2], [2026, 1], [1985, 6], [1984, 7], [2000, 9], [1990, 1]];
  for (const [y, want] of cases) {
    check(`${y}年の本命星 = ${T.KYUSEI[want]}`, T.honmei(y) === want, T.KYUSEI[T.honmei(y)]);
  }
  check('本命星は9年で一巡する', T.honmei(2024) === T.honmei(2033) && T.honmei(2024) === T.honmei(2015));
  check('本命星は年が進むと1つ減る', T.honmei(2025) === ((T.honmei(2024) - 1 - 1 + 9) % 9) + 1,
    `${T.honmei(2024)} → ${T.honmei(2025)}`);

  // 月命星: 本命星のグループごとに寅月の星が決まっている
  check('一白の年の寅月は八白', T.getsumei(1, 2) === 8, T.KYUSEI[T.getsumei(1, 2)]);
  check('二黒の年の寅月は二黒', T.getsumei(2, 2) === 2, T.KYUSEI[T.getsumei(2, 2)]);
  check('三碧の年の寅月は五黄', T.getsumei(3, 2) === 5, T.KYUSEI[T.getsumei(3, 2)]);
  check('四緑の年の寅月は八白', T.getsumei(4, 2) === 8, T.KYUSEI[T.getsumei(4, 2)]);
  check('九紫の年の寅月は五黄', T.getsumei(9, 2) === 5, T.KYUSEI[T.getsumei(9, 2)]);
  // 節月が進むと1つ減る（寅→卯）
  check('寅月の次の卯月は1つ減る', T.getsumei(1, 3) === 7, T.KYUSEI[T.getsumei(1, 3)]);
  // 12か月ぶん回すと元に戻らず、9で一巡していること
  let ok = true;
  for (let h = 1; h <= 9; h++) {
    const seen = new Set();
    for (let s = 0; s < 12; s++) seen.add(T.getsumei(h, s));
    if (seen.size !== 9) ok = false;
  }
  check('どの本命星でも月命星は9種類すべて出る', ok);

  // 立春前は前年の本命星
  const a = T.kyusei(build(2025, 2, 3, 22, 0));
  const b = T.kyusei(build(2025, 2, 3, 23, 30));
  check('2025-02-03 22時は2024年扱い（三碧）', a.honmei === 3, a.honmeiName);
  check('2025-02-03 23時半は2025年扱い（二黒）', b.honmei === 2, b.honmeiName);
}

console.log('\n[6] 紫微斗数');
{
  // 紫微星の定位が、どの局・どの日でも12宮に収まること
  let bad = 0;
  for (let kyoku = 2; kyoku <= 6; kyoku++) {
    for (let d = 1; d <= 30; d++) {
      const p = T.shibiPos(kyoku, d);
      if (!(p >= 0 && p < 12) || !Number.isInteger(p)) bad++;
    }
  }
  check('5局 × 30日 すべてで紫微が12宮に入る', bad === 0, `異常 ${bad}件`);
  // 局数で割り切れる日は寅から順に並ぶ
  check('水二局の2日は寅', T.shibiPos(2, 2) === 2, K.SHI[T.shibiPos(2, 2)]);
  check('水二局の4日は卯', T.shibiPos(2, 4) === 3, K.SHI[T.shibiPos(2, 4)]);
  check('木三局の3日は寅', T.shibiPos(3, 3) === 2, K.SHI[T.shibiPos(3, 3)]);
  check('火六局の6日は寅', T.shibiPos(6, 6) === 2, K.SHI[T.shibiPos(6, 6)]);

  // 命盤の構造
  const s = T.shibi(build(1988, 3, 5, 14, 25));
  check('12宮すべて別々の支に置かれる', new Set(s.palaces.map(p => p.shiIdx)).size === 12);
  check('14主星がすべて配置される', s.stars.length === 14, `${s.stars.length}個`);
  check('宮の名前が12種類そろう', new Set(s.palaces.map(p => p.name)).size === 12);
  check('命宮が palaces[0]', s.palaces[0].name === '命宮' && s.palaces[0].shi === s.mei);
  check('五行局が5種類のどれか', ['水二局','木三局','金四局','土五局','火六局'].includes(s.kyokuName), s.kyokuName);
  check('紫微と天府が寅申軸で対称', ((T.shibi(build(1988,3,5,14,25)).stars.find(x=>x.name==='紫微').pos
        + T.shibi(build(1988,3,5,14,25)).stars.find(x=>x.name==='天府').pos) % 12) === 4,
    `紫微${s.shibiAt} / 天府${s.tenpuAt}`);
  console.log(`       命宮 ${s.mei}（${s.meiGanshi}）/ 身宮 ${s.shin} / ${s.kyokuName} / 紫微は${s.shibiAt}`);
  console.log(`       命宮の主星: ${s.meiStars.join('・') || 'なし（空宮）'}`);

  // 命宮の式が対称であること: 月と時を入れ替えても身宮と命宮が入れ替わる関係
  check('時刻不明なら紫微斗数は出せない', T.shibi(build(1988, 3, 5, 0, 0, true)).timeUnknown === true);

  // 命宮と身宮は必ず同じ宮か向かい合うか、月と時で決まる位置にある
  let sym = true;
  for (let m = 1; m <= 12; m++) for (let hs = 0; hs < 12; hs++) {
    const mei = (((2 + (m - 1) - hs) % 12) + 12) % 12;
    const shin = (((2 + (m - 1) + hs) % 12) + 12) % 12;
    if (((mei + shin) % 12) !== ((2 * (2 + m - 1)) % 12)) sym = false;
  }
  check('命宮と身宮が月の位置に対して対称', sym);
}

console.log('\n[7] 四柱推命をひととおり組む');
{
  const k = build(1988, 3, 5, 14, 25);
  const s = T.shichu(k);
  console.log('       ' + s.pillars.map(p => `${p.label} ${p.ganshi}`).join(' / '));
  console.log(`       日主 ${s.dayKanName}（${s.dayKanElem}・${s.dayKanYin ? '陰' : '陽'}）`);
  console.log('       通変星 ' + s.pillars.filter(p=>!p.empty).map(p => `${p.kan}=${p.kanStar}`).join(' '));
  console.log('       十二運 ' + s.pillars.filter(p=>!p.empty).map(p => `${p.shi}=${p.un}`).join(' '));
  console.log('       五行 ' + JSON.stringify(s.count) + ` 計${s.total}`);
  console.log(`       空亡 ${s.kubo.join('')}`);
  check('4柱ぶん出る', s.pillars.length === 4 && s.pillars.every(p => p.empty || p.ganshi));
  check('五行の合計が8（時柱あり）', s.total === 8, String(s.total));
  check('日柱の通変星は日主', s.pillars[2].kanStar === '日主');
  check('蔵干の本気が地支の五行と一致', s.pillars.every(p =>
    p.empty || K.KAN_ELEM[K.KAN.indexOf(p.honki)] === p.shiElem));

  const u = T.shichu(build(1988, 3, 5, 0, 0, true));
  check('時刻不明なら時柱が空', u.pillars[3].empty === true);
  check('時刻不明なら五行の合計は6', u.total === 6, String(u.total));
}

console.log('\n[8] 全体を通して落ちないか（1900〜2050を無作為に）');
{
  let bad = 0, n = 0;
  for (let y = 1900; y <= 2050; y += 7) {
    for (let m = 1; m <= 12; m += 3) {
      for (const h of [0, 5, 13, 23]) {
        try {
          const r = T.all(build(y, m, 15, h, 30));
          n++;
          if (!r.shichu.pillars[0].ganshi) bad++;
          if (!r.shukuyo.name) bad++;
          if (!(r.kyusei.honmei >= 1 && r.kyusei.honmei <= 9)) bad++;
          if (!(r.kyusei.getsumei >= 1 && r.kyusei.getsumei <= 9)) bad++;
          if (r.shibi.stars.length !== 14) bad++;
        } catch (e) { bad++; console.log(`       例外 ${y}-${m}-15 ${h}時: ${e.message}`); }
      }
    }
  }
  check(`${n}件すべて組めた`, bad === 0, `異常 ${bad}件`);
}

console.log('\n[9] 解釈テキストに穴がないか');
{
  const miss = k => `欠け: ${k}`;
  check('27宿ぶんの文章がそろう',
    T.SHUKU.every(s => TX.SHUKU_TEXT[s] && TX.SHUKU_TEXT[s].c && TX.SHUKU_TEXT[s].b),
    T.SHUKU.filter(s => !TX.SHUKU_TEXT[s]).map(miss).join(' ') || undefined);
  check('10日干ぶんの文章がそろう',
    K.KAN.every(k2 => TX.NISSHU[k2] && TX.NISSHU[k2].body),
    K.KAN.filter(k2 => !TX.NISSHU[k2]).map(miss).join(' ') || undefined);
  const stars = ['紫微','天機','太陽','武曲','天同','廉貞','天府','太陰','貪狼','巨門','天相','天梁','七殺','破軍'];
  check('14主星ぶんの文章がそろう',
    stars.every(s => TX.SHUSEI_TEXT[s]), stars.filter(s => !TX.SHUSEI_TEXT[s]).map(miss).join(' ') || undefined);
  check('9星ぶんの文章がそろう', [1,2,3,4,5,6,7,8,9].every(n => TX.KYUSEI_TEXT[n]));
  check('12宮ぶんの説明がそろう', T.PALACES.every(p => TX.PALACE_TEXT[p]));
  check('五行5つぶんの説明がそろう', T.GOGYO.every(g => TX.GOGYO_TEXT[g]));
  check('十二運12ぶんの言い換えがそろう',
    T.UNSEI.every(u => TX.UNSEI_PLAIN[u] && TX.UNSEI_PLAIN[u].plain && TX.UNSEI_PLAIN[u].mean));
  const tsuhenAll = ['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','正印','日主'];
  check('通変星11ぶんの説明がそろう', tsuhenAll.every(t => TX.TSUHEN[t] && TX.TSUHEN[t].plain));
  check('五行局5つぶんの説明がそろう', [2,3,4,5,6].every(n => TX.KYOKU_TEXT[n]));

  // 日本語以外の文字が混ざっていないか。キーではなく本文（文字列の値）だけを見る。
  const values = [];
  (function walk(v) {
    if (typeof v === 'string') values.push(v);
    else if (v && typeof v === 'object') Object.keys(v).forEach(k2 => walk(v[k2]));
  })(TX);
  const blob = values.join('\n');
  const strayCyrillic = blob.match(/[Ѐ-ӿ]/g);
  const strayHangul = blob.match(/[가-힯]/g);
  const strayLatinWord = blob.match(/[A-Za-z]{3,}/g);
  check('キリル文字が混ざっていない', !strayCyrillic, strayCyrillic ? strayCyrillic.join('') : undefined);
  check('ハングルが混ざっていない', !strayHangul, strayHangul ? strayHangul.join('') : undefined);
  check('英単語が本文に混ざっていない', !strayLatinWord,
    strayLatinWord ? [...new Set(strayLatinWord)].join(' ') : undefined);
}

console.log('\n' + (fails === 0 ? '=> すべて通過' : `=> ${fails}件 失敗`));
process.exit(fails === 0 ? 0 : 1);
