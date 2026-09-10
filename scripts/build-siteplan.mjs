/**
 * Converts the DXF-derived site-plan.json (state-plane feet) into SVG-space geometry
 * plus the units content file. Run from repo root:  node scripts/build-siteplan.mjs
 * Input is produced by scripts/extract-siteplan.py against the N.L. Olson civil DXF.
 */
import fs from 'node:fs';

const src = JSON.parse(fs.readFileSync('scripts/.siteplan-raw.json', 'utf8'));
const [minX, minY, maxX, maxY] = src.bbox;
const PAD = 14;
const W = maxX - minX, H = maxY - minY;
const VB = { w: +(W + PAD * 2).toFixed(1), h: +(H + PAD * 2).toFixed(1) };

const tx = (x) => +(x - minX + PAD).toFixed(1);
const ty = (y) => +(maxY - y + PAD).toFixed(1);   // flip: SVG y grows downward
const ring = (r) => 'M' + r.map(([x, y]) => `${tx(x)} ${ty(y)}`).join('L') + 'Z';
const line = (p) => 'M' + p.pts.map(([x, y]) => `${tx(x)} ${ty(y)}`).join('L') + (p.closed ? 'Z' : '');
const centroid = (r) => {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    const f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)];
};

// Footprint area -> plan family. The DXF resolves footprint, not garage orientation.
const family = (sf) =>
  sf >= 1000 ? '24x45' : sf >= 820 ? '20x45' : sf >= 700 ? '24x30' : '15x45';

const units = src.units.map((u) => {
  const [cx, cy] = centroid(u.ring);
  return {
    lot: u.lot,
    parcel: u.parcel === 1 ? 1 : 234,
    id: u.parcel === 1 ? `P1-${u.lot}` : `${u.lot}`,
    family: family(u.sf),
    footprintSF: u.sf,
    d: ring(u.ring),
    cx: tx(cx),
    cy: ty(cy),
  };
});

const plan = {
  viewBox: `0 0 ${VB.w} ${VB.h}`,
  width: VB.w,
  height: VB.h,
  scaleNote: 'Geometry derived from 13629_SITE_BASE_8_R2018.dxf (N.L. Olson & Associates, project 25-13629). 1 SVG unit = 1 foot.',
  boundary: src.boundary.map(ring),
  parcel1: src.parcel1.map(ring),
  tracts: src.tracts.map(ring),
  driveways: src.driveways.map(ring),
  walls: src.walls.map(ring),
  curbs: src.curbs.map(line),
  units: units.map(({ lot, parcel, id, family, footprintSF, d, cx, cy }) => ({ lot, parcel, id, family, footprintSF, d, cx, cy })),
};

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/site-plan.json', JSON.stringify(plan));

// Content file: the unit schedule Ian can edit (status is the editable column).
const contentUnits = units.map((u) => ({
  id: u.id,
  lot: u.lot,
  parcel: u.parcel,
  family: u.family,
  footprintSF: u.footprintSF,
  status: 'Entitlement in review',
}));
fs.mkdirSync('src/content', { recursive: true });
fs.writeFileSync('src/content/units.json', JSON.stringify(contentUnits, null, 2) + '\n');

const counts = units.reduce((m, u) => ((m[u.family] = (m[u.family] || 0) + 1), m), {});
console.log('viewBox', plan.viewBox);
console.log('units', units.length, counts);
console.log('paths — boundary', plan.boundary.length, 'tracts', plan.tracts.length, 'curbs', plan.curbs.length, 'drives', plan.driveways.length);
