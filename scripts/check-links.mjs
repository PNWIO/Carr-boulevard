/** Fails the build if any internal href points at a page or asset that isn't in dist. */
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : files.push(p);
  }
};
walk(DIST);

const exists = (href) => {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return fs.existsSync(path.join(DIST, 'index.html'));
  const rel = clean.replace(/^\//, '');
  return (
    fs.existsSync(path.join(DIST, rel)) ||
    fs.existsSync(path.join(DIST, `${rel}.html`)) ||
    fs.existsSync(path.join(DIST, rel, 'index.html'))
  );
};

// Routes served by Pages Functions rather than static files.
const dynamic = [/^\/api\//, /^\/documents\//];

let bad = 0;
for (const f of files.filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const href = m[1];
    if (dynamic.some((r) => r.test(href))) continue;
    if (!exists(href)) {
      console.error(`broken: ${href}  (in ${f})`);
      bad++;
    }
  }
}
if (bad) { console.error(`\n${bad} broken internal link(s).`); process.exit(1); }
console.log(`links: all internal references resolve (${files.filter((f) => f.endsWith('.html')).length} pages)`);
