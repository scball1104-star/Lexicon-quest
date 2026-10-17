"""Autotile machinery (RPG Maker VX/MV conventions, 16 px tiles, 8 px quarters).

A2 block (32 x 48 = 2 x 3 tiles = 4 x 6 quarters). Quarter source coordinates (qx, qy):

    qy0  [iso TL][iso TR] [inner TL][inner TR]      tile (0,0) = isolated tile, tile (1,0) = inner corners
    qy1  [iso BL][iso BR] [inner BL][inner BR]
    qy2  [outer TL][top e][top e][outer TR]         bottom 2x2 tiles = a 2x2 patch:
    qy3  [left e ][center][center][right e]           outer corners, edges, center
    qy4  [left e ][center][center][right e]
    qy5  [outer BL][bot e][bot e][outer BR]

Runtime rule per quarter (the same as MV FLOOR_AUTOTILE_TABLE, written per quarter):
    for quarter TL: v = N connected, h = W connected, d = NW connected
        !v && !h -> outer   (0,2)
        !v &&  h -> top     (2,2)
         v && !h -> left    (0,4)
         v &&  h && !d -> inner (2,0)
         v &&  h &&  d -> center (2,4)
    TR (N, E, NE): outer (3,2) top (1,2) right (3,4) inner (3,0) center (1,4)
    BL (S, W, SW): outer (0,5) bottom (2,5) left (0,3) inner (2,1) center (2,3)
    BR (S, E, SE): outer (3,5) bottom (1,5) right (3,3) inner (3,1) center (1,3)
Every source quarter sits at the same (x mod 16, y mod 16) phase as the place it is drawn, so periodic
textures stay continuous.

A4-style wall face (32 x 32 = 2 x 2 tiles), connectivity by 4 neighbours (same face):
    quarter TL: left missing -> x col 0 else col 2 ; top missing -> row 0 else row 2
    quarter TR: right missing -> col 3 else col 1  ; top missing -> row 0 else row 2
    quarter BL: left missing -> col 0 else col 2   ; bottom missing -> row 3 else row 1
    quarter BR: right missing -> col 3 else col 1  ; bottom missing -> row 3 else row 1
(identical to MV WALL_AUTOTILE_TABLE.)
"""
import math
from pxlib import Canvas

NB_KEYS = ('N', 'E', 'S', 'W', 'NE', 'NW', 'SE', 'SW')
DIRS = {'N': (0, -1), 'S': (0, 1), 'W': (-1, 0), 'E': (1, 0),
        'NE': (1, -1), 'NW': (-1, -1), 'SE': (1, 1), 'SW': (-1, 1)}

QUARTERS = {
    #       vert, horiz, diag, outer,  vedge,  hedge,  inner,  center
    'TL': ('N', 'W', 'NW', (0, 2), (2, 2), (0, 4), (2, 0), (2, 4)),
    'TR': ('N', 'E', 'NE', (3, 2), (1, 2), (3, 4), (3, 0), (1, 4)),
    'BL': ('S', 'W', 'SW', (0, 5), (2, 5), (0, 3), (2, 1), (2, 3)),
    'BR': ('S', 'E', 'SE', (3, 5), (1, 5), (3, 3), (3, 1), (1, 3)),
}
QOFF = {'TL': (0, 0), 'TR': (8, 0), 'BL': (0, 8), 'BR': (8, 8)}


def quarter_src(q, nb):
    v, h, d, outer, vedge, hedge, inner, center = QUARTERS[q]
    cv, ch = nb[v], nb[h]
    if not cv and not ch:
        return outer
    if not cv:
        return vedge
    if not ch:
        return hedge
    if not nb[d]:
        return inner
    return center


def full_nb(**kw):
    nb = {k: True for k in NB_KEYS}
    nb.update(kw)
    # diagonals cannot be meaningfully connected if an adjacent orthogonal is not
    for dg, (a, b) in {'NE': ('N', 'E'), 'NW': ('N', 'W'), 'SE': ('S', 'E'), 'SW': ('S', 'W')}.items():
        if dg not in kw:
            nb[dg] = nb[a] and nb[b]
    return nb


def configs_for_block():
    """Yield (qx, qy, quarter, nb) for every source quarter of an A2 block."""
    iso = {k: False for k in NB_KEYS}
    for q, (qx, qy) in (('TL', (0, 0)), ('TR', (1, 0)), ('BL', (0, 1)), ('BR', (1, 1))):
        yield qx, qy, q, iso
    for q, (v, h, d, outer, vedge, hedge, inner, center) in QUARTERS.items():
        yield outer[0], outer[1], q, full_nb(**{v: False, h: False, d: False})
        yield vedge[0], vedge[1], q, full_nb(**{v: False, h: True, d: False})
        yield hedge[0], hedge[1], q, full_nb(**{v: True, h: False, d: False})
        yield inner[0], inner[1], q, full_nb(**{v: True, h: True, d: False})
        yield center[0], center[1], q, full_nb(**{v: True, h: True, d: True})


def build_a2(render_tile, frame=0):
    """render_tile(nb, frame) -> Canvas(16,16) for a tile at phase (0,0) with that neighbourhood."""
    blk = Canvas(32, 48)
    cache = {}
    for qx, qy, q, nb in configs_for_block():
        key = tuple(nb[k] for k in NB_KEYS)
        if key not in cache:
            cache[key] = render_tile(nb, frame)
        t = cache[key]
        ox, oy = QOFF[q]
        blk.paste(t.crop(ox, oy, 8, 8), qx * 8, qy * 8)
    return blk


def compose_a2(block, nb, sx=0, sy=0):
    """Runtime composition of one 16x16 cell from an A2 block found at (sx, sy) in `block`."""
    out = Canvas(16, 16)
    for q in ('TL', 'TR', 'BL', 'BR'):
        qx, qy = quarter_src(q, nb)
        ox, oy = QOFF[q]
        out.paste(block.crop(sx + qx * 8, sy + qy * 8, 8, 8), ox, oy)
    return out


def face_quarter_src(q, left, top, right, bottom):
    if q == 'TL':
        return (2 if left else 0, 2 if top else 0)
    if q == 'TR':
        return (1 if right else 3, 2 if top else 0)
    if q == 'BL':
        return (2 if left else 0, 1 if bottom else 3)
    return (1 if right else 3, 1 if bottom else 3)


def compose_face(block, left, top, right, bottom, sx=0, sy=0):
    out = Canvas(16, 16)
    for q in ('TL', 'TR', 'BL', 'BR'):
        qx, qy = face_quarter_src(q, left, top, right, bottom)
        ox, oy = QOFF[q]
        out.paste(block.crop(sx + qx * 8, sy + qy * 8, 8, 8), ox, oy)
    return out


# ------------------------------------------------------------------ signed distance field for one tile
class EdgeSpec:
    """How a terrain's visible region sits inside its cell.

    ins:   inset per side (pixels from the cell border to the boundary when that side's neighbour differs)
    r:     outer-corner rounding radius
    rr:    inner-corner rounding of the neighbouring land corner
    prof:  per-side periodic 16-entry wobble profiles (added to the inset; negative = grows outward)
    metric: 'euclid' for organic terrain, 'cheb' for crisp man-made borders (square corners)
    """

    def __init__(self, ins, r=3.0, rr=1.5, prof=None, metric='euclid'):
        self.ins = dict(ins)
        self.r = r
        self.rr = rr
        self.prof = prof or {}
        self.metric = metric

    def wob(self, side, ax, ay):
        p = self.prof.get(side)
        if not p:
            return 0.0
        return p[(ax if side in 'NS' else ay) % 16]

    def field(self, lx, ly, nb):
        """Signed distance (> 0 inside the visible region) for the pixel at tile-local integer (lx, ly).
        lx/ly may stray a few pixels outside 0..15; the same neighbourhood is assumed to continue."""
        cx, cy = lx + 0.5, ly + 0.5
        ax, ay = lx % 16, ly % 16
        INF = 99.0
        sides = {}
        if not nb['N']:
            sides['N'] = cy - self.ins['N'] - self.wob('N', ax, ay)
        if not nb['S']:
            sides['S'] = (16 - cy) - self.ins['S'] - self.wob('S', ax, ay)
        if not nb['W']:
            sides['W'] = cx - self.ins['W'] - self.wob('W', ax, ay)
        if not nb['E']:
            sides['E'] = (16 - cx) - self.ins['E'] - self.wob('E', ax, ay)
        d = min(sides.values()) if sides else INF
        r = self.r
        if r > 0 and self.metric == 'euclid':
            for a_, b_ in (('N', 'W'), ('N', 'E'), ('S', 'W'), ('S', 'E')):
                if a_ in sides and b_ in sides:
                    a, b = sides[a_], sides[b_]
                    if a < r and b < r:
                        d = min(d, r - math.hypot(r - a, r - b))
        for dg, (v, h) in (('NW', ('N', 'W')), ('NE', ('N', 'E')), ('SW', ('S', 'W')), ('SE', ('S', 'E'))):
            if nb[v] and nb[h] and not nb[dg]:
                dv = (cy if v == 'N' else 16 - cy) - self.ins[v] - self.wob(v, ax, ay)
                dh = (cx if h == 'W' else 16 - cx) - self.ins[h] - self.wob(h, ax, ay)
                rr = self.rr
                a, b = dv + rr, dh + rr
                if a >= 0 and b >= 0:
                    dist = (math.hypot(a, b) if self.metric == 'euclid' else max(a, b)) - rr
                elif a < 0 and b < 0:
                    dist = max(a, b) - rr
                elif a < 0:
                    dist = b - rr
                else:
                    dist = a - rr
                d = min(d, dist)
        return d

    def side_of(self, lx, ly, nb):
        """Which absent side is nearest (for directional styling). Returns 'N','S','W','E','C' (corner) or None."""
        cx, cy = lx + 0.5, ly + 0.5
        best, bd = None, 99.0
        cand = []
        if not nb['N']:
            cand.append(('N', cy - self.ins['N']))
        if not nb['S']:
            cand.append(('S', 16 - cy - self.ins['S']))
        if not nb['W']:
            cand.append(('W', cx - self.ins['W']))
        if not nb['E']:
            cand.append(('E', 16 - cx - self.ins['E']))
        for dg, (v, h) in (('NW', ('N', 'W')), ('NE', ('N', 'E')), ('SW', ('S', 'W')), ('SE', ('S', 'E'))):
            if nb[v] and nb[h] and not nb[dg]:
                dv = (cy if v == 'N' else 16 - cy) - self.ins[v]
                dh = (cx if h == 'W' else 16 - cx) - self.ins[h]
                cand.append((v if dv >= dh else h, max(dv, dh)))
        for s, dd in cand:
            if dd < bd:
                best, bd = s, dd
        return best


# ------------------------------------------------------------------ map-level helpers (used by compose.py)
def neighbours(grid, x, y, same):
    """grid: list of lists of terrain ids. same(id_here, id_there) -> connected? Off-map counts as connected."""
    H, W = len(grid), len(grid[0])
    nb = {}
    for k, (dx, dy) in DIRS.items():
        xx, yy = x + dx, y + dy
        if 0 <= xx < W and 0 <= yy < H:
            nb[k] = same(grid[yy][xx])
        else:
            nb[k] = True
    return nb


def variant_hash(x, y, salt=0):
    """Deterministic per-cell hash used to pick fill variants (mirror this in JS, see README)."""
    h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791)
    h &= 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    h ^= h >> 16
    return h
