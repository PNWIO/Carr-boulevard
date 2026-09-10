# Editing the site

No build knowledge needed for anything on this page. Edit a file, commit, push — Cloudflare
rebuilds and the site is live in about a minute.

**The rule that matters:** every figure on this site traces to a document in the project
record. If you change a number, change its `source` line too. Nothing should appear on the
site that you couldn't hand a buyer the drawing for.

---

## Where each thing lives

| You want to change | Edit this |
|---|---|
| Price, closing terms, contact details, site metrics, zoning, the eight numbers under the hero | `src/data/project.ts` |
| The six plan types — dimensions, beds, garages, counts | `src/data/project.ts` → `planTypes` |
| Market figures, drive times, employment stats, nearby comps | `src/data/project.ts` (bottom half) |
| Per-lot status in the unit schedule | `src/content/units.json` |
| Entitlement timeline milestones | `src/content/milestones.json` |
| The document list in the data room | `src/content/documents.json` |
| The buyer questions on the offering page | `src/content/faq.json` |
| Body copy in a section | the matching file in `src/components/sections/` |
| The legal disclaimer and fair-housing statement | `src/data/project.ts` (bottom) |

Everything is plain text. JSON files need their commas and quotes intact — if you break one,
the build fails with a message naming the file and line, and the live site stays on the last
good version rather than going down.

---

## Changing a number

Open `src/data/project.ts`. Say the price becomes firm:

```ts
export const offering = {
  price: "$2,300,000",          // was "Price on request"
  priceIsOnRequest: false,      // flip this too
```

Then update the hero strip so the two agree — same file, `glance`:

```ts
{ figure: "$2.3M", label: "Asking price · close on site plan approval" },
```

## Marking a milestone complete

`src/content/milestones.json` — find the entry, change `"status"`:

```json
{ "id": "plat-approval", "status": "Complete", "date": "November 2026", ... }
```

Allowed values: `"Complete"`, `"In review"`, `"Scheduled"`. Anything else fails the build.

## Adding a document to the data room

`src/content/documents.json`. The `key` is where the PDF sits in the R2 bucket:

```json
{
  "id": "title-report",
  "title": "Preliminary title report",
  "category": "Title",
  "date": "October 2026",
  "gated": true,
  "key": "title/carr-preliminary-title-report.pdf"
}
```

Categories: `Entitlement`, `Civil & Survey`, `Environmental`, `Architectural`, `Financial`,
`Title`. Set `"gated": false` for anything a stranger may download without identifying
themselves — those go in `public/documents/` instead of the bucket.

---

## Images

Drop a replacement into `src/assets/img/` using the **same filename** and rebuild. Astro
handles resizing, AVIF conversion and responsive sizes; supply the largest version you have
and don't pre-optimise.

| File | Where it appears | Ideal source | Current source |
|---|---|---|---|
| `hero-aerial.jpg` | Hero, right panel | 2400×2000+, landscape-ish. **Drone photography of the site would be a real upgrade** | Cropped from `Carr OH 3D View.jpg` |
| `massing-axon-crop.jpg` | Opportunity section figure | 1600×1200+, plan-view exhibit on white | Cropped from `LAUGHLIN CARR BLVD Aerial 3D 2.jpg` |
| `plan-24x45-2car-front.jpg` | Plan type A card | 1600×900, elevation on a plain ground | Architecture set |
| `plan-20x45-1car-front.jpg` | Plan type B card | 1600×900 | Architecture set |
| `plan-24x45-2car-rear.jpg` | Plan type C card | 1600×900 | Architecture set |
| `plan-20x45-2car-rear.jpg` | Plan type D card | 1600×900 | Architecture set |
| `plan-15x45-tandem-rear.jpg` | Plan type E card | 1600×900 | Architecture set |
| `plan-24x30-1car.jpg` | Plan type F card | 1600×900 | Architecture set |
| `aerial-rendering.jpg` | Not currently displayed — kept as the uncropped source | — | Original render |
| `unit-designation-plan.jpg` | Not currently displayed — kept as reference | — | Original sheet |

**Crops matter.** The original renderings carry a Laughlin title block and a "Carr Blvd / 38
Attached Single Family Residences" caption baked into the image. Those are cropped out on the
site so they don't collide with the page's own typography. If you swap in a new version of an
original, crop it the same way — or ask for the crop to be redone.

Every image needs **alt text** describing what it shows, for screen readers and for search.
Alt text lives next to each `<Image>` in the section components.

---

## Rebuilding the site plan from a new civil drawing

The interactive site plan is generated from the N.L. Olson base DXF — it is not drawn by
hand. When a revised plat comes back from the City:

```bash
# point scripts/extract-siteplan.py at the new DXF, then
pnpm siteplan:rebuild
pnpm build
```

That re-reads the building footprints, the lot lines that split them, the lot-number labels,
the tracts, curbs and driveways, rewrites `src/data/site-plan.json` and `src/content/units.json`,
and prints a summary you should check: it must say **38 units** with footprint counts of
**14 × 1080, 16 × 900, 6 × 675, 2 × 720**. If those numbers change, the plat changed — read
the output before committing.

The script needs Python with `ezdxf` and `shapely`:

```bash
pip install ezdxf shapely
```

---

## Things deliberately not on the site

Worth knowing so nobody "fixes" them:

- **No finished square footage.** The preliminary set records footprints only. See
  `NEEDS-FROM-IAN.md`.
- **No live map.** A static diagram is used instead — a Google Maps embed costs an API key
  and roughly a second of load time, and the drive times are the actual content.
- **No testimonials, awards, press logos or "trusted by" rows.** The buyer is an acquisitions
  professional; social proof reads as filler to that audience.
- **The word "entitled" is never used unqualified.** The plat is submitted and under review.
  Everything on the site says so, including the footer disclaimer on every page.
