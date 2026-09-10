"""Derive the interactive site plan from the N.L. Olson civil DXF (13629_SITE_BASE_8_R2018.dxf).
The DXF holds several offset copies of the site; we keep only the primary cluster (the one the
A-LOT NUMBER labels sit in) and emit per-unit polygons keyed to real lot numbers."""
import ezdxf, json
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import polygonize, unary_union

SRC = '/mnt/user-data/uploads/Projects/Kitsap Way/Landscape/Carr Autocad/Claude Made Files/13629_SITE_BASE_8_R2018.dxf'
doc = ezdxf.readfile(SRC); msp = doc.modelspace()

labels = [(e.dxf.text.strip(), Point(e.dxf.insert.x, e.dxf.insert.y))
          for e in msp.query('TEXT[layer=="A-LOT NUMBER"]')]
lx = [p.x for _, p in labels]; ly = [p.y for _, p in labels]
WINDOW = box(min(lx) - 320, min(ly) - 320, max(lx) + 320, max(ly) + 320)   # primary copy only

def lwpolys(layer):
    for e in msp.query(f'LWPOLYLINE[layer=="{layer}"]'):
        pts = [(p[0], p[1]) for p in e.get_points('xy')]
        if len(pts) >= 2:
            yield pts, bool(e.closed)

def poly(pts):
    if len(pts) < 3: return None
    try: g = Polygon(pts)
    except Exception: return None
    if not g.is_valid: g = g.buffer(0)
    return g if (not g.is_empty and g.geom_type == 'Polygon') else None

SITE = None   # set below: the real parcel envelope, used to clip every layer

def _inside(g):
    if not WINDOW.contains(g.centroid): return False
    if SITE is None: return True
    return g.intersection(SITE).area > 0.45 * g.area

def rings(layer, min_area=0):
    out = []
    for pts, _ in lwpolys(layer):
        g = poly(pts)
        if g and g.area >= min_area and _inside(g):
            out.append([[round(x, 2), round(y, 2)] for x, y in g.exterior.coords[:-1]])
    return out

def _keep_line(ls):
    if not WINDOW.contains(ls.centroid): return False
    if SITE is None: return True
    return ls.intersection(SITE).length > 0.5 * ls.length

def paths(layer):
    out = []
    for pts, closed in lwpolys(layer):
        ls = LineString(pts)
        if _keep_line(ls):
            out.append({'pts': [[round(x, 2), round(y, 2)] for x, y in pts], 'closed': closed})
    for e in msp.query(f'LINE[layer=="{layer}"]'):
        ls = LineString([(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)])
        if _keep_line(ls):
            out.append({'pts': [[round(c[0], 2), round(c[1], 2)] for c in ls.coords], 'closed': False})
    return out

# ---- units: building footprints cut by party (lot) lines ----------------------
bldgs = [g for pts, _ in lwpolys('C-BLDG-L') if (g := poly(pts)) and g.area > 1 and WINDOW.contains(g.centroid)]
lotlines = [LineString(pts) for pts, _ in lwpolys('C-LOT-L') if LineString(pts).length > 0]
for e in msp.query('LINE[layer=="C-LOT-L"]'):
    lotlines.append(LineString([(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)]))
lotlines = [l for l in lotlines if WINDOW.contains(l.centroid)]

faces = []
for b in bldgs:
    cuts = [l for l in lotlines if l.intersects(b.buffer(0.5))]
    if cuts:
        fs = [f for f in polygonize(unary_union([b.boundary] + cuts))
              if f.area > 50 and f.representative_point().within(b.buffer(0.2))]
        faces.extend(fs or [b])
    else:
        faces.append(b)
faces = [f for f in faces if f.area > 50]

# parcel 1 = the 17,208 SF GC-frontage parcel in _AREA-PARCEL 1-4
p1 = None
for pts, _ in lwpolys('_AREA-PARCEL 1-4'):
    g = poly(pts)
    if g and 16000 < g.area < 18500 and WINDOW.contains(g.centroid):
        p1 = g; break

taken, units = set(), []
for txt, pt in labels:
    hit = next((f for f in faces if id(f) not in taken and f.contains(pt)), None)
    if hit is None:
        hit = min((f for f in faces if id(f) not in taken), key=lambda f: f.distance(pt))
    taken.add(id(hit))
    units.append({'lot': int(txt),
                  'parcel': 1 if (p1 is not None and p1.contains(pt)) else 234,
                  'sf': round(hit.area),
                  'ring': [[round(x, 2), round(y, 2)] for x, y in hit.exterior.coords[:-1]]})

# The real site envelope: the _AREA BOUNDARY rings of the primary copy
# (34,696 + 16,172 + 127,293 SF = 178,161 SF, matching the 177,663 SF site).
_bounds = [g for pts, _ in lwpolys('_AREA BOUNDARY')
           if (g := poly(pts)) and g.area > 10000 and WINDOW.contains(g.centroid)]
_hull = unary_union([u for u in
                     [poly([[x, y] for x, y in f.exterior.coords[:-1]]) for f in faces] if u])
_bounds = [g for g in _bounds if g.intersects(_hull.convex_hull.buffer(40))]
SITE = unary_union(_bounds).buffer(6) if _bounds else None
print('site envelope SF:', round(unary_union(_bounds).area) if _bounds else None)

data = {'units': sorted(units, key=lambda u: (u['parcel'] != 1, u['lot'])),
        'boundary': rings('_AREA BOUNDARY', 10000),
        'parcel1': [[[round(x, 2), round(y, 2)] for x, y in p1.exterior.coords[:-1]]] if p1 else [],
        'tracts': rings('_AREA-TRACTS', 200),
        'driveways': rings('C-DRIVEWAY-L', 20),
        'walls': rings('C-WALL-RETAINING', 10),
        'curbs': paths('C-CURB-L')}

xs, ys = [], []
for u in data['units']:
    xs += [p[0] for p in u['ring']]; ys += [p[1] for p in u['ring']]
for k in ('boundary', 'parcel1', 'tracts', 'driveways'):
    for r in data[k]:
        xs += [p[0] for p in r]; ys += [p[1] for p in r]
data['bbox'] = [min(xs), min(ys), max(xs), max(ys)]
json.dump(data, open('site-plan.json', 'w'))

from collections import Counter
print('units:', len(data['units']), '| footprint SF:', sorted(Counter(u['sf'] for u in data['units']).items()))
print('parcel 1 lots:', sorted(u['lot'] for u in data['units'] if u['parcel'] == 1))
print('parcels 2-4 lots:', sorted(u['lot'] for u in data['units'] if u['parcel'] == 234))
print('bbox w/h:', round(data['bbox'][2]-data['bbox'][0]), round(data['bbox'][3]-data['bbox'][1]))
print('boundary:', len(data['boundary']), 'tracts:', len(data['tracts']), 'curbs:', len(data['curbs']), 'drives:', len(data['driveways']))
