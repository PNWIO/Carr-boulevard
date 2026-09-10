# homesoncarr.com

Offering website for **Carr Boulevard Townhomes** — 38 fee-simple attached homes on 4.08
acres at Carr Blvd and Kitsap Way, Bremerton, WA. Offered direct by Laughlin Development LLC.

Astro 5 · Tailwind 4 · static output · Cloudflare Pages.

- **Editing copy, numbers and images:** [`CONTENT.md`](./CONTENT.md)
- **Outstanding items and known contradictions:** [`NEEDS-FROM-IAN.md`](./NEEDS-FROM-IAN.md)

---

## Local setup

```bash
corepack enable          # once, gives you pnpm
pnpm install
pnpm dev                 # http://localhost:4321
```

Node 22 or newer. Other commands:

```bash
pnpm build               # production build into dist/ (+ generates dist/_headers)
pnpm preview             # serve the built site
pnpm check               # TypeScript + Astro typecheck
pnpm verify              # assert every colour token pair meets WCAG 2.2 AA
pnpm siteplan:rebuild    # regenerate the site plan from the civil DXF
```

---

## Deploying to Cloudflare Pages

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Carr Boulevard offering site"
git branch -M main
git remote add origin git@github.com:<you>/homesoncarr.git
git push -u origin main
```

### 2. Connect the repo

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |

Add one environment variable so the build uses the right Node:

| Variable | Value |
|---|---|
| `NODE_VERSION` | `22` |

That is enough to go live. Everything below switches on the forms and the data room; the
site builds and deploys correctly without any of it.

### 3. Custom domain

Pages project → **Custom domains** → **Set up a custom domain** → `homesoncarr.com`.

The domain is already on Cloudflare, so Cloudflare creates the DNS records itself — a proxied
`CNAME` at the apex (flattened automatically) pointing at `<project>.pages.dev`. Add
`www.homesoncarr.com` as a second custom domain; `public/_redirects` already sends `www` to
the apex with a 301, so both resolve and only one is canonical.

Nothing here touches MX or SPF records, so email on the domain is unaffected.

### 4. Lead capture and the data room

Three pieces, each optional and each failing soft if absent.

**KV — where leads are stored**

```bash
pnpm dlx wrangler kv namespace create LEADS
```

Copy the printed id into `wrangler.toml` (the block is there, commented), then in the Pages
project: **Settings → Functions → KV namespace bindings** → variable name `LEADS`.

**R2 — where the gated PDFs live**

```bash
pnpm dlx wrangler r2 bucket create homesoncarr-docs
```

Bind it under **Settings → Functions → R2 bucket bindings** as `DOCS`. Upload the documents
under the keys listed in `src/content/documents.json`, and the merged package to
`package/carr-boulevard-offering-package.pdf`.

> **Gated PDFs must not go in `public/`.** Anything in `public/` is served to anyone who
> guesses the URL, regardless of what the access gate does on the front end. The gate is
> lead capture with dignity, not security — it stops casual link-sharing and nothing more.
> Don't put anything in the bucket you'd be unhappy to see forwarded.

**Secrets** — Pages project → **Settings → Environment variables and secrets**:

| Name | Type | What it does |
|---|---|---|
| `HMAC_SECRET` | Secret | Signs the data-room access cookie. Generate with `openssl rand -hex 32` |
| `TURNSTILE_SECRET_KEY` | Secret | Server half of the bot check |
| `PUBLIC_TURNSTILE_SITE_KEY` | Plaintext | Client half. **Must be set at build time** — redeploy after adding it |
| `RESEND_API_KEY` | Secret | Emails you each new lead |
| `LEAD_NOTIFY_TO` | Plaintext | `ian@laughlindevelopmentllc.com` |
| `LEAD_NOTIFY_FROM` | Plaintext | e.g. `notifications@homesoncarr.com`, verified in Resend |

**Turnstile:** Cloudflare dashboard → **Turnstile** → **Add site** → hostname
`homesoncarr.com`. It gives you both keys. Skip it and the forms still work — the bot check
is simply not enforced.

### What happens with nothing configured

| Missing | Behaviour |
|---|---|
| Everything | Site builds and deploys. Forms show "email Ian directly" and the enquiry falls back to a mailto link |
| `HMAC_SECRET` | The gate captures the lead and tells the visitor Ian will send the package by email, instead of pretending access was granted |
| `LEADS` | Leads are emailed but not stored |
| `RESEND_API_KEY` | Leads are stored but not emailed |
| `DOCS` | Gated document links return a plain message with Ian's address |

---

## Troubleshooting

**A Function returns 500, or a form says "that didn't go through."**
Almost always a missing binding. Pages project → **Functions → Real-time logs**, submit the
form, read the error. The bindings are `LEADS` (KV) and `DOCS` (R2), and they must be added
in the dashboard even if they're in `wrangler.toml`. Note that Preview and Production have
**separate** bindings — adding one to Production doesn't add it to Preview.

**Turnstile widget doesn't appear.**
`PUBLIC_TURNSTILE_SITE_KEY` is read at build time, not runtime. Add it, then trigger a fresh
deploy — an existing deployment will not pick it up.

**Something is blocked in the browser console by Content-Security-Policy.**
`dist/_headers` is generated by `scripts/gen-headers.mjs` after each build, which hashes every
inline script so the policy can refuse `unsafe-inline`. If you add a third-party script, add
its origin to the `script-src` list in that file — don't add `'unsafe-inline'`, which would
disable the protection for every script on the site.

**Build fails with a Node version error.**
Set `NODE_VERSION` to `22` in the Pages environment variables. Cloudflare's default is older
than Astro 5 requires.

**Build fails on a content file.**
The error names the file and the field. `src/content/*.json` is validated against a schema at
build time — a typo fails the build rather than shipping a broken page, and the live site
stays on the last good deployment.

---

## How it's put together

```
src/
  data/project.ts        single source of truth — every figure, with its source
  data/site-plan.json    generated: SVG geometry for the interactive plan
  content/*.json         unit schedule, milestones, documents, FAQ (schema-checked)
  components/sections/   one file per page section
  components/layout/     header, footer, page heading
  pages/                 6 routes + 404
  styles/global.css      design tokens, base type, layout helpers
functions/               Cloudflare Pages Functions (forms, data-room gate, R2 streaming)
scripts/                 site plan extraction, OG images, icons, CSP headers, checks
```

**The site plan is generated, not drawn.** `scripts/extract-siteplan.py` reads
`13629_SITE_BASE_8_R2018.dxf` — the N.L. Olson base drawing — takes the 33 building
footprints, cuts them with the party lines on the `C-LOT-L` layer, matches each resulting
polygon to its label on the `A-LOT NUMBER` layer, and emits 38 lot polygons with real
geometry. The footprint areas it recovers (14 × 1080 SF, 16 × 900, 6 × 675, 2 × 720) match
the unit designation legend exactly, which is the check that the extraction is correct.

**Typography** is Fraunces (display) and Inter (UI and data), both variable, both under the
SIL Open Font License, both self-hosted from `public/fonts/` — no Google Fonts request. The
licences are in `public/fonts/*-OFL.txt`. Swapping in a commercial face (Canela, Domaine,
Söhne) is two WOFF2 files and the `--font-display` / `--font-sans` tokens in
`src/styles/global.css`.

**Client-side JavaScript** is a few kilobytes of vanilla script for scroll reveals, the site
plan interaction and table sorting. No framework, no animation library, no smooth-scroll
hijacking.

## Measured

Lighthouse, all six pages, desktop preset, against the production build:

| | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| every page | 100 | 100 | 100 | 100 | 0.4–0.6 s | ≤ 0.004 |

CI (`.github/workflows/ci.yml`) runs the contrast check, the typecheck, the build, an
internal link check and Lighthouse on every push. It passes on a clean clone with no secrets.
