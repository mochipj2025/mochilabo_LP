const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expectLink(page, href, label) {
  const html = read(page);
  if (!html.includes(`href="${href}"`)) {
    failures.push(`${page}: ${label} (${href}) がありません`);
  }
}

[
  ['aishou/index.html', '../index.html'],
  ['money/index.html', '../index.html'],
  ['slime/index.html', '../index.html'],
  ['oracle/index.html', '../index.html'],
  ['me/index.html', '../index.html'],
  ['hoshiyomi/index.html', '../index.html'],
  ['hoshiyomi/2026/index.html', '../../index.html'],
  ['hoshiyomi/aishou/index.html', '../../index.html'],
  ['hoshiyomi/shikumi/index.html', '../../index.html']
].forEach(([page, href]) => expectLink(page, href, 'もちスラトップ'));

[
  'hoshiyomi/2026/index.html',
  'hoshiyomi/aishou/index.html',
  'hoshiyomi/shikumi/index.html'
].forEach((page) => expectLink(page, '../index.html', '星読みトップ'));

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '_boneyard' ? [] : walk(full);
    }
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

for (const file of walk(root)) {
  const html = fs.readFileSync(file, 'utf8');
  const refs = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|#)/.test(ref)) continue;
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    if (!clean) continue;
    const target = clean.startsWith('/')
      ? path.join(root, clean.replace(/^\/+/, ''))
      : path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(target)) {
      failures.push(`${path.relative(root, file)}: ${ref} のリンク先がありません`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('navigation test passed');
