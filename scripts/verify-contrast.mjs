/** Checks every text/ground pair in the token set against WCAG 2.2 AA. Fails the build. */
const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const light = {
  paper: '#f7f5f1', 'paper-2': '#efebe4', ink: '#101a24', slate: '#1e3448',
  muted: '#55636f', 'brass-ink': '#7c5a22', 'brass-on-dark': '#d3ac72',
  'on-slate': '#eef1f4', 'on-slate-muted': '#a9bccd',
};
const dark = {
  paper: '#0c161f', 'paper-2': '#12202c', ink: '#ece7df', slate: '#091220',
  muted: '#93a3b1', 'brass-ink': '#d9b57e', 'brass-on-dark': '#d9b57e',
  'on-slate': '#ece7df', 'on-slate-muted': '#9fb2c3',
};

// [foreground, background, minimum] — 4.5 for body text, 3.0 for large display text
const pairs = [
  ['ink', 'paper', 4.5], ['ink', 'paper-2', 4.5],
  ['muted', 'paper', 4.5], ['muted', 'paper-2', 4.5],
  ['brass-ink', 'paper', 4.5], ['brass-ink', 'paper-2', 4.5],
  ['on-slate', 'slate', 4.5], ['on-slate-muted', 'slate', 4.5],
  // the accent as text on a dark ground — brass-ink is far too dark there
  ['brass-on-dark', 'slate', 4.5],
  ['muted', 'paper', 4.5],
];

let failed = 0;
for (const [scheme, tokens] of [['light', light], ['dark', dark]]) {
  for (const [fg, bg, min] of pairs) {
    const r = ratio(tokens[fg], tokens[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${scheme.padEnd(5)} ${fg} on ${bg}: ${r.toFixed(2)}:1 (min ${min})`);
  }
}
if (failed) { console.error(`\n${failed} contrast pair(s) below AA.`); process.exit(1); }
console.log('\nAll token pairs meet WCAG 2.2 AA.');
