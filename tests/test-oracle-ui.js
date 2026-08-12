const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const oracleRoot = fs.existsSync(path.join(root, 'oracle')) ? path.join(root, 'oracle') : root;
const html = fs.readFileSync(path.join(oracleRoot, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(oracleRoot, 'assets/app.js'), 'utf8');
const css = fs.readFileSync(path.join(oracleRoot, 'assets/oracle.css'), 'utf8');
const cardsSource = fs.readFileSync(path.join(oracleRoot, 'assets/cards.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(cardsSource, sandbox);

const failures = [];
function check(label, condition) {
  if (!condition) failures.push(label);
}

const cards = sandbox.window.ORACLE_CARDS;
check('カードが36枚ある', Array.isArray(cards) && cards.length === 36);
for (const card of cards || []) {
  check(`${card.title}の画像が存在する`, fs.existsSync(path.join(oracleRoot, card.art)));
}
check('説明用dialogがある', /<dialog[^>]+id="cardDialog"/.test(html));
check('一覧カードから説明を開く', /gallery-card/.test(app) && /openCardDialog\(c\)/.test(app));
check('結果にカード画像を表示する', /rcard-visual/.test(app) && /image\.src = c\.art/.test(app));
check('正位置と逆位置を説明する', /renderDialogSide\(c, false\)/.test(app) && /renderDialogSide\(c, true\)/.test(app));
check('説明ウィンドウの見た目がある', /\.card-dialog\s*\{/.test(css));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('oracle UI test passed');
