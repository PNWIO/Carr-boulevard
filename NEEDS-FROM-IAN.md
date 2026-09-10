# Needs from Ian

Everything on the site today comes from a document in the project record. This is what
is missing, wrong, or worth a decision. Ordered by how much it affects a buyer.

---

## 1 — Blocking a buyer's underwriting

### Finished square footage per plan type
**Where it shows:** the unit schedule and the plan-type cards currently publish *footprint
dimensions* (24′×45′ and so on) and bedroom counts, with a note that finished area is in the
architecture set. That is honest but incomplete — living area is the first number a builder
looks for, and its absence will generate an email rather than an offer.

**What's needed:** finished SF for each of the six plan types, from the architecture set.

**Do not use** the 1,400–1,600 SF figure in the January offering memorandum. That document
labels it "assumed," it predates the August submittal, and publishing it as fact would be a
number the seller can't produce a drawing for.

**Where it goes:** `src/data/project.ts` → `planTypes`, add `finishedSF` to each entry, and
`footprintFamilies`. The unit schedule picks it up automatically.

---

### Per-lot garage orientation
**Where it shows:** the site plan and unit schedule group lots by *footprint family*
(24′×45′, 20′×45′, 15′×45′, 24′×30′) rather than by the six plan types, because the civil
DXF records each lot's footprint but not whether it takes the front-garage or rear-garage
variant. The mix table carries the split (10 front / 4 rear on the 24′×45′; 12 front / 4 rear
on the 20′×45′).

**What's needed:** if the architecture set assigns plan types to specific lot numbers, that
list turns the site plan from "footprint by lot" into "plan type by lot" — a materially
better exhibit.

**Where it goes:** `src/content/units.json` → add `"plan": "A"` per lot.

---

## 2 — Contradictions in your own files

### PO Box 10607 or 10807?
The September offering flyer and the unit designation sheet both say **10607**. The 3D
rendering title block says **10807**. The site uses 10607. One of the two documents is wrong
and should be corrected before either goes to a buyer.

*Site location:* `src/data/project.ts` → `seller.mailing`.

### The tandem plan has three different dimensions on record
- Unit designation sheet legend: **15′ × 48′**
- September offering flyer: **15′ × 42′**
- Individual drawing filename: **15X45**
- The civil DXF footprint measures **675 SF, which is exactly 15 × 45**

The site publishes **15′ × 45′** on the DXF's authority. Worth correcting the legend and the
flyer so the three agree.

### The rendering says "CARR VD"
The SketchUp title in `Carr OH 3D View.jpg` is missing the L in BLVD. The hero crop on the
site excludes that part of the image, so it doesn't appear — but the source file should be
fixed before the rendering is sent to anyone.

---

## 3 — Two files that should not reach a buyer

`Projects/Kitsap Way/Marketing Material/Website/Carr Blvd Website/` contains
`Carr_Boulevard_Project_Fact_Sheet.pdf` and `index.html.html`, both created 10 Sep 2026.
Both state that the project is **"fully entitled," "shovel-ready," "preliminary plat
approved,"** and that **"all municipal reviews are complete."**

None of that is true. The preliminary plat and site development permit were *submitted*
on 5 August 2026 and are under review. Those files also give the site as 3.72 acres (it is
4.08), invent 4BR/3BA plans with "dual primary suites" and "cathedral ceilings" (the real mix
is 2BR and 3BR, all 2.5 bath), and describe the landscape plan as City-approved while the
Carr Blvd street-tree count is still unresolved at 7 of 17 required.

Written representations that entitlements are approved when they are pending follow a deal
into diligence. Neither file was used in this build. They should be deleted or clearly marked
as superseded drafts.

---

## 4 — Assets that would materially improve the site

| Slot | What's there now | What would be better |
|---|---|---|
| Hero | Cropped SketchUp aerial rendering | Drone photography of the assembled site, looking south-east across Kitsap Way |
| Location section | A schematic drive-time diagram, clearly labelled "not a map" | A static map image (1600×1000, PNG or WebP) showing the site, Kitsap Way, PSNS, the ferry terminal and Silverdale. A live Google Maps embed is deliberately avoided — it costs an API key and roughly a second of load time |
| Team section | Text only | Headshots for the Laughlin and N.L. Olson principals, 800×800 |
| Opportunity | Cropped axonometric massing study | Fine as is |

Drop replacements into `src/assets/img/` under the same filenames and rebuild. Sizes and
purposes for every slot are in `CONTENT.md`.

---

## 5 — Decisions taken in this build, easily reversed

| Decision | Where to change it |
|---|---|
| **Price on request** rather than the $2,300,000 in the January memorandum | `src/data/project.ts` → `offering.price`, `priceIsOnRequest` |
| **JKM Construction is not on the site.** The team section lists Laughlin, N.L. Olson and Heath & Associates only | `src/data/project.ts` → `team` |
| **Closing upon site plan approval** is published as the transaction structure, taken from the January memorandum. Confirm it still stands | `src/data/project.ts` → `offering.closingCondition` |
| Every lot's status reads "Entitlement in review" | `src/content/units.json` |

---

## 6 — Before the site goes live

- [ ] Upload the twenty due-diligence PDFs to the R2 bucket under the keys listed in
      `src/content/documents.json`, and the merged offering package to
      `package/carr-boulevard-offering-package.pdf`. **Do not put them in `public/`** —
      anything there is world-readable regardless of the access gate.
- [ ] Create the merged offering package PDF (it does not exist yet).
- [ ] Set `HMAC_SECRET`, `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY`,
      `RESEND_API_KEY` in the Cloudflare Pages dashboard. Until then the forms capture
      nothing and fall back to a mailto link — the site still builds and deploys.
- [ ] Confirm `ian@laughlindevelopmentllc.com` and `206.226.1988` are the right contact
      details to publish (the Second Brain note flags the phone number as unconfirmed).
- [ ] Re-verify the market figures before the site is promoted — Zillow and NewHomeSource
      numbers carry July/September 2026 dates and will age.
