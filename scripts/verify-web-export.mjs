import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const distDir = path.resolve(process.argv[2] || 'dist');
const expectedBase = process.argv[3] || '';

const indexHtmlPath = path.join(distDir, 'index.html');
assert.ok(fs.existsSync(indexHtmlPath), `Missing index.html in ${distDir}`);
const html = fs.readFileSync(indexHtmlPath, 'utf8');

if (expectedBase) {
  assert.ok(
    html.includes(`src="${expectedBase}/_expo/static/js/web/`),
    `Expected script src prefixed with ${expectedBase}/_expo/static/js/web/`,
  );
} else {
  assert.ok(html.includes('_expo/static/js/web/'), 'Missing exported web entry script in index.html');
}

const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
const bundles = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')) : [];
assert.ok(bundles.length > 0, `No JS bundles found under ${jsDir}`);

for (const file of bundles) {
  const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
  // Expo web emits classic <script defer> tags, so raw import.meta breaks browsers at runtime.
  assert.equal(
    /\bimport\.meta\b/.test(code),
    false,
    `Bundle ${file} contains untransformed import.meta syntax`,
  );
}

console.log(`Verified ${bundles.length} web bundle(s) in ${distDir}${expectedBase ? ` (base=${expectedBase})` : ''}`);
