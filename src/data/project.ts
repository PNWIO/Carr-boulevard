/**
 * Single source of truth for Carr Boulevard Townhomes.
 *
 * EDITING RULE — read this before changing anything below.
 * Every figure here comes from a named document in the project record. If you change
 * a number, change its `source` too. Nothing on this site may state a figure the
 * seller cannot produce a document for. Items marked TBD render as visible
 * placeholders on the page and are listed in NEEDS-FROM-IAN.md.
 */

export type Sourced<T = string> = {
  value: T;
  label: string;
  source: string;
  sourceDate: string;
  url?: string;
};

export const TBD = "{{TBD}}" as const;
export const isTBD = (v: unknown): boolean =>
  typeof v === "string" && v.includes("{{TBD");

/* -------------------------------------------------------------------------- */
/* Identity                                                                   */
/* -------------------------------------------------------------------------- */

export const project = {
  name: "Carr Boulevard Townhomes",
  shortName: "Carr Boulevard",
  tagline: "38 fee-simple attached homes",
  domain: "homesoncarr.com",
  address: "1746 Carr Blvd, Bremerton, WA 98312",
  city: "Bremerton",
  county: "Kitsap County",
  state: "Washington",
  jurisdiction: "City of Bremerton",
  civilProjectNumber: "25-13629",
  preApplicationFile: "BP25 00378",
  positioning:
    "Four assembled parcels on Carr Boulevard at Kitsap Way, engineered and in review, five minutes from the largest employer in the region.",
} as const;

export const seller = {
  entity: "Laughlin Development LLC",
  descriptor: "Land development and entitlements · Kitsap Peninsula, Washington",
  contactName: "Ian Laughlin",
  email: "ian@laughlindevelopmentllc.com",
  phone: "206.226.1988",
  phoneHref: "+12062261988",
  /** Two documents in the project record disagree — 10607 on the offering flyer and
   *  unit designation sheet, 10807 on the 3D rendering title block. Using the flyer. */
  mailing: "PO Box 10607, Bainbridge Island, WA 98110",
  website: "https://laughlindevelopmentllc.com",
} as const;

/* -------------------------------------------------------------------------- */
/* Site — all figures from C3.00 SITE PLAN, N.L. Olson & Associates, 6/23/2026 */
/* -------------------------------------------------------------------------- */

const CIVIL = {
  source: "C3.00 Site Plan, N.L. Olson & Associates (project 25-13629)",
  sourceDate: "June 23, 2026",
};

export const site = {
  totalAcres: 4.08,
  totalSF: 177_663,
  parcels: 4,
  apns: [
    "3719-002-003-0306",
    "3719-002-003-0009",
    "3719-002-004-0008",
    "3719-002-003-0504",
  ],
  zoning: "R-10 Low Density Residential, with General Commercial frontage",
  zoningShort: "R-10 + GC",
  parcels234SF: 160_425,
  parcels234Acres: 3.68,
  parcel1SF: 17_238,
  imperviousSF: 73_751,
  perviousSF: 86_674,
  lotLandscapeSF: 13_820,
  openSpaceSF: 51_922,
  openSpaceRequiredSF: 24_064,
  openSpacePct: 32,
  openSpaceRequiredPct: 15,
  guestStalls: 25,
  rowDedicationSF: 18_518,
  tracts: "C through J",
  ...CIVIL,
} as const;

/* -------------------------------------------------------------------------- */
/* Program                                                                     */
/* -------------------------------------------------------------------------- */

export const program = {
  totalUnits: 38,
  lotsParcels234: 32,
  lotsParcel1: 6,
  planTypeCount: 6,
  tenure: "Fee-simple attached single-family",
  unitLotSubdivision: true,
  source: "Unit designation sheet + C3.00 Site Plan, N.L. Olson & Associates",
  sourceDate: "June 23, 2026",
} as const;

/**
 * The six plan types exactly as the unit designation sheet legend states them.
 * Counts sum to 38. Footprint dimensions are footprints, not finished area —
 * finished square footage is not stated in any document in the record.
 */
export const planTypes = [
  { id: "A", footprint: "24′ × 45′", w: 24, d: 45, beds: 3, baths: 2.5, garage: "2-car garage", units: 10, image: "24x45-2car-front" },
  { id: "B", footprint: "20′ × 45′", w: 20, d: 45, beds: 3, baths: 2.5, garage: "1-car garage", units: 12, image: "20x45-1car-front" },
  { id: "C", footprint: "24′ × 45′", w: 24, d: 45, beds: 3, baths: 2.5, garage: "2-car rear garage", units: 4, image: "24x45-2car-rear" },
  { id: "D", footprint: "20′ × 45′", w: 20, d: 45, beds: 3, baths: 2.5, garage: "2-car rear garage", units: 4, image: "20x45-2car-rear" },
  { id: "E", footprint: "15′ × 45′", w: 15, d: 45, beds: 2, baths: 2.5, garage: "2-car tandem rear garage", units: 6, image: "15x45-tandem-rear" },
  { id: "F", footprint: "24′ × 30′", w: 24, d: 30, beds: 2, baths: 2.5, garage: "1-car garage", units: 2, image: "24x30-1car", note: "plus office" },
] as const;

/**
 * Footprint families, which is the level the civil DXF resolves per lot.
 * The DXF gives each lot's building footprint area; it does not record whether an
 * individual lot takes the front-garage or rear-garage variant of its family, so the
 * site plan and unit matrix key on the family and the mix table carries the split.
 */
export const footprintFamilies = {
  1080: { key: "24x45", footprint: "24′ × 45′", beds: 3, baths: 2.5, units: 14, plans: "A, C", garages: "2-car front (10) · 2-car rear (4)" },
  900:  { key: "20x45", footprint: "20′ × 45′", beds: 3, baths: 2.5, units: 16, plans: "B, D", garages: "1-car front (12) · 2-car rear (4)" },
  675:  { key: "15x45", footprint: "15′ × 45′", beds: 2, baths: 2.5, units: 6,  plans: "E",    garages: "2-car tandem rear" },
  720:  { key: "24x30", footprint: "24′ × 30′", beds: 2, baths: 2.5, units: 2,  plans: "F",    garages: "1-car, plus office" },
} as const;

export type FamilyKey = "24x45" | "20x45" | "15x45" | "24x30";

/* -------------------------------------------------------------------------- */
/* Transaction                                                                 */
/* -------------------------------------------------------------------------- */

export const offering = {
  price: "Price on request",
  priceIsOnRequest: true,
  structure:
    "Offers considered on the land as-is, with entitlements, or vertical-ready.",
  closingCondition: "Closing upon site plan approval",
  closingNote:
    "The seller carries the entitlement to approval; the buyer takes construction permits and post-approval conditions.",
  assignment: "Assignment allowed with seller consent",
  diligence: "Full due-diligence package available under NDA.",
  buyerProfile: [
    "Production and regional homebuilders",
    "Merchant developers",
    "Build-to-rent and multifamily investors",
  ],
} as const;

/* -------------------------------------------------------------------------- */
/* Team                                                                        */
/* -------------------------------------------------------------------------- */

export const team = [
  {
    name: "Laughlin Development LLC",
    role: "Owner and entitlement sponsor",
    detail:
      "Land development and entitlements on the Kitsap Peninsula. Assembled the four parcels, carried the design team and filed the preliminary plat and site development permit. Selling direct — no brokerage.",
  },
  {
    name: "N.L. Olson & Associates, Inc.",
    role: "Civil engineering",
    detail:
      "Preliminary plat and site development plans, storm drainage analysis, grading and frontage improvements. Signed set dated June 23, 2026 under project 25-13629.",
  },
  {
    name: "Heath & Associates",
    role: "Traffic",
    detail: "Traffic count prepared for the August 2026 submittal.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Location — every figure carries its own source                              */
/* -------------------------------------------------------------------------- */

export const driveTimes = [
  { minutes: 5, place: "PSNS / Naval Base Kitsap – Bremerton" },
  { minutes: 7, place: "Bremerton fast ferry to Seattle (≈30 min crossing)" },
  { minutes: 5, place: "Olympic College Bremerton" },
  { minutes: 10, place: "St. Michael Medical Center" },
  { minutes: 12, place: "Silverdale retail core" },
] as const;

const ZILLOW = {
  source: "Zillow Home Value Index and rent data, Bremerton WA",
  sourceDate: "Data through July 31, 2026; median sale June 30, 2026",
  url: "https://www.zillow.com/home-values/37560/bremerton-wa/",
};
const KEDA_EMPLOYERS = {
  source: "Kitsap Economic Development Alliance, Kitsap Top Employers Report",
  sourceDate: "July 14, 2026",
  url: "https://kitsapeda.org",
};
const KEDA_DRYDOCK = {
  source: "Kitsap Economic Development Alliance, Multibillion-Dollar Navy Dry Dock Project",
  sourceDate: "July 21, 2026",
  url: "https://kitsapeda.org",
};
const NHS = {
  source: "NewHomeSource new-construction listings, Bremerton area",
  sourceDate: "September 2026",
  url: "https://www.newhomesource.com",
};

export const marketStats: Sourced[] = [
  { value: "$488,829", label: "Typical home value · +1.2% yr", ...ZILLOW },
  { value: "$462,150", label: "Median sale price", ...ZILLOW },
  { value: "$1,940/mo", label: "Average rent · +2.4% yr", ...ZILLOW },
  { value: "9 days", label: "Median time to pending", ...ZILLOW },
];

export const employmentStats: Sourced[] = [
  {
    value: "42,700",
    label: "Naval Base Kitsap personnel — 24,340 civilian, 18,360 active duty. The county's largest employer.",
    ...KEDA_EMPLOYERS,
  },
  {
    value: "Up to $30B",
    label:
      "Navy Multi-Mission Dry Dock program. RFP fall 2026, contracts 2027, construction from 2028 for up to ten years.",
    ...KEDA_DRYDOCK,
  },
  {
    value: "2,087 jobs",
    label: "St. Michael Medical Center, ten minutes from the site.",
    ...KEDA_EMPLOYERS,
  },
];

export const comps: Array<{ builder: string; community: string; from: string; size?: string }> = [
  { builder: "Lennar", community: "Stoneridge townhomes, Silverdale", from: "$399,950", size: "1,298–1,684 SF" },
  { builder: "KB Home", community: "McCormick Trails, Port Orchard (SFR)", from: "$482,950" },
  { builder: "LGI Homes", community: "Eldorado (SFR)", from: "$505,900" },
  { builder: "Century Communities", community: "Sinclair Ridge, Bremerton (SFR)", from: "$609,990" },
];

export const compsNote: Sourced = {
  value: "$634,704",
  label: "Average Bremerton-area new-home price across 1,223 homes in 317 communities.",
  ...NHS,
};

/* -------------------------------------------------------------------------- */
/* Offering strip — the eight numbers under the hero                           */
/* -------------------------------------------------------------------------- */

export const glance = [
  { figure: "38", label: "Fee-simple attached homes" },
  { figure: "4.08", unit: "ac", label: "Four assembled parcels · 177,663 SF" },
  { figure: "R-10", label: "Low density residential + GC frontage" },
  { figure: "Aug 2026", label: "Preliminary plat and site development permit submitted" },
  { figure: "6", label: "Plan types, 2 and 3 bedroom" },
  { figure: "32%", label: "Open space — 51,922 SF against 15% required" },
  { figure: "25", label: "Guest parking stalls" },
  { figure: "On request", label: "Asking price · close on site plan approval" },
] as const;

/* -------------------------------------------------------------------------- */
/* Legal                                                                       */
/* -------------------------------------------------------------------------- */

export const disclaimer = `These materials are for informational purposes only and do not constitute an offer to sell or a solicitation of an offer to buy. Information has been obtained from sources believed to be reliable but is not warranted, and is offered subject to errors, omissions, change and withdrawal. Entitlement status is as described by the seller; the preliminary plat and site development permit remain under review by the City of Bremerton and all approvals, conditions and timelines remain subject to jurisdictional action. Areas, dimensions, unit counts and plan configurations are taken from the preliminary engineering and architectural set and are subject to final design and City conditions. Market figures are third-party estimates as of the dates shown and are offered for orientation only — buyer to verify independently. Drive times are approximate. Laughlin Development LLC is the owner of the property and is selling direct; it is not a licensed real estate brokerage and does not represent any other party.`;

export const ehoStatement = `Equal Housing Opportunity. Laughlin Development LLC does business in accordance with the Federal Fair Housing Act and Washington State law, and does not discriminate on the basis of race, color, religion, sex, familial status, national origin, disability, or any other protected class.`;
