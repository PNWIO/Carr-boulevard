/**
 * Generates the per-page 1200x630 Open Graph images into public/og.
 * Rendered in headless Chromium so the OG cards use the same Fraunces/Inter
 * typography as the site. Requires playwright-core + a Chromium binary; if
 * neither is present the script exits quietly and the previously generated
 * images in public/og are used (they are committed to the repo).
 */
import fs from 'node:fs';
import path from 'node:path';

const pages = [
  { out: 'index', kicker: 'Bremerton, Washington', title: 'Carr Boulevard<br>Townhomes', sub: '38 fee-simple attached homes · 4.08 acres · R-10 + GC' },
  { out: 'offering', kicker: 'Offering summary', title: 'Site, program<br>and terms', sub: 'Preliminary plat submitted August 2026 · Close on approval' },
  { out: 'site-plan', kicker: 'Site plan', title: 'Thirty-eight lots', sub: 'Drawn from the signed preliminary plat base drawing' },
  { out: 'location', kicker: 'Location and market', title: 'Five minutes<br>to the shipyard', sub: 'Naval Base Kitsap · 42,700 personnel' },
  { out: 'data-room', kicker: 'Due diligence', title: 'The whole file', sub: 'Entitlement · Civil · Environmental · Architectural · Title' },
  { out: 'inquire', kicker: 'Enquiries', title: 'Straight to<br>the principal', sub: 'Laughlin Development LLC · No brokerage' },
  { out: '404', kicker: '404', title: 'Not part of<br>this offering', sub: 'homesoncarr.com' },
];

let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { console.log('og: playwright-core unavailable — keeping committed images'); process.exit(0); }

const exe = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome']
  .filter(Boolean).find((p) => fs.existsSync(p));

const b64 = (f) => fs.readFileSync(path.join('public/fonts', f)).toString('base64');
const html = (p) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:F;src:url(data:font/woff2;base64,${b64('fraunces-var.woff2')})format('woff2-variations');font-weight:100 900}
@font-face{font-family:I;src:url(data:font/woff2;base64,${b64('inter-var.woff2')})format('woff2-variations');font-weight:100 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#1e3448;color:#eef1f4;font-family:I;
 padding:72px;display:flex;flex-direction:column;border-top:6px solid #a67c3d}
.k{font-size:19px;letter-spacing:.18em;text-transform:uppercase;color:#a9bccd}
h1{font-family:F;font-variation-settings:"opsz" 144,"wght" 400;font-size:92px;
 letter-spacing:-.032em;line-height:1.02;margin:38px 0 0;flex:none}
.s{font-size:25px;color:#a9bccd;margin-top:28px}
footer{margin-top:auto;padding-top:26px;border-top:1px solid #3a5570;
 display:flex;justify-content:space-between;font-size:19px;letter-spacing:.08em}
footer span:last-child{color:#a9bccd}
</style>
<div class="k">${p.kicker}</div><h1>${p.title}</h1><div class="s">${p.sub}</div>
<footer><span>LAUGHLIN DEVELOPMENT LLC</span><span>homesoncarr.com</span></footer>`;

const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
fs.mkdirSync('public/og', { recursive: true });
for (const p of pages) {
  await page.setContent(html(p), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join('public/og', `${p.out}.png`) });
}
await browser.close();
console.log(`og: ${pages.length} images`);
