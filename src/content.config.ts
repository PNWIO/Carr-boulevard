import { defineCollection, z } from "astro:content";
import { file } from "astro/loaders";

/**
 * Content collections. Everything a non-developer edits lives in src/content/*.json —
 * see CONTENT.md. Schemas are enforced at build time, so a malformed edit fails the
 * build rather than shipping a broken page.
 */

const units = defineCollection({
  loader: file("src/content/units.json"),
  schema: z.object({
    id: z.string(),
    lot: z.number().int().positive(),
    /** 1 = the General Commercial frontage parcel (6 lots); 234 = parcels 2-4 (32 lots) */
    parcel: z.union([z.literal(1), z.literal(234)]),
    family: z.enum(["24x45", "20x45", "15x45", "24x30"]),
    footprintSF: z.number().int().positive(),
    status: z.string(),
  }),
});

const milestones = defineCollection({
  loader: file("src/content/milestones.json"),
  schema: z.object({
    id: z.string(),
    date: z.string(),
    sortKey: z.string(),
    title: z.string(),
    status: z.enum(["Complete", "In review", "Scheduled"]),
    body: z.string(),
    authority: z.string(),
    reference: z.string().optional(),
  }),
});

const documents = defineCollection({
  loader: file("src/content/documents.json"),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    category: z.enum([
      "Entitlement",
      "Civil & Survey",
      "Environmental",
      "Architectural",
      "Financial",
      "Title",
    ]),
    date: z.string(),
    author: z.string().optional(),
    /** false = downloadable without identifying; true = behind the access gate */
    gated: z.boolean(),
    /** R2 object key, only meaningful when gated */
    key: z.string().optional(),
    pages: z.number().int().positive().optional(),
  }),
});

const faq = defineCollection({
  loader: file("src/content/faq.json"),
  schema: z.object({
    id: z.string(),
    q: z.string(),
    a: z.string(),
  }),
});

export const collections = { units, milestones, documents, faq };
