"""Rootbound Archive, per-floor kits (W8-archive, CRITIQUE_3 items 3 and 4) -> appended to assets/tiles/archive.png.

Each floor has a theme you can name (Lufia II style) and a room that reads as a built room with wall depth:

  F1 The Catalog Halls     warm oak parquet, walnut wall caps with a brass lip, oak panels over card drawers,
                           shelf silhouettes in the dark beyond. Landmark: the Great Catalog (drawer wall + brass
                           index wheel). Props: card cabinets, index-card piles.
  F2 The Reading Galleries cold slate ashlar, slate caps with a verdigris copper lip, slate walls with a verdigris
                           frieze, leaded blue-green glass in the dark beyond. Landmark: the rose window. Props:
                           lecterns, tall lancet windows, hanging glass lamps (overhead tiles).
  F3 The Rootbound Stacks  dark warped planks, root-choked caps, dark panelling with roots and ink seeping down,
                           root masses in the dark beyond. Landmark: the root arch over the great door. Props:
                           root-swallowed shelves, root masses, root drapes.

Wall systems (legend ids, see assets/tiles/README.md):
  <floor>_top / <floor>_face          the wall band (a full tile of wall top around every room) and its inner face
  <floor>_out_top / <floor>_out_face  the deep beyond (no edges, variants) and the outer face that the band shows
                                      on its south side, falling away into the dark (1 or 2 rows)
  floor = catalog | gallery | stacks.  Floor terrains: catalog_wood, gallery_stone, stacks_wood.
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, profile1d
from autotile import EdgeSpec, full_nb
from terrain import Terrain, blank, scatter, stamp_in
from walls import FaceStyle

WD = lambda i: C('wood', i)
GD = lambda i: C('gold', i)
SW = lambda i: C('stone_warm', i)
K = lambda i: C('stone_cool', i)
GR = lambda i: C('roof_green', i)
CY = lambda i: C('magic_cyan', i)
WA = lambda i: C('water', i)
INK = lambda i: C('ink', i)
E = lambda i: C('earth', i)
FD = lambda i: C('foliage_dark', i)
SA = lambda i: C('sand', i)
SHD = lambda i: C('shadow', i)
MT = lambda i: C('metal', i)

BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def bayer(x, y):
    return (BAYER4[y % 4][x % 4] + 0.5) / 16.0


def fade(x, y, t):
    """True when the pixel should go dark at fade amount t (0 = never, 1 = always), ordered dither."""
    return bayer(x, y) < t


# ====================================================================== floors (A2 fill terrains)
class FloorBase(Terrain):
    """A floor that fills its cell; its edge (rarely seen: only beside a map hole) is a crisp dark lip."""
    kind = 'fill'
    collision = 'none'

    def __init__(self):
        super().__init__()
        self.specs = {'top': EdgeSpec({'N': 1.0, 'S': 2.0, 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb')}

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            return self.tex(c, x, y) if c.f('top', x, y) >= 1 else self.edge
        return None


def card(t, x, y, rot=False, ink_lines=True):
    """An index card dropped on the floor (5 x 3, or 3 x 5 rotated) with a soft shadow pixel row."""
    w, h = (3, 5) if rot else (5, 3)
    for j in range(h):
        for i in range(w):
            col = SA(3) if (i + j) % 5 else SA(2)
            if ink_lines and not rot and j == 1 and 1 <= i <= 3:
                col = K(3) if i != 2 else K(2)
            if ink_lines and rot and i == 1 and 1 <= j <= 3:
                col = K(3)
            t[(y + j) % 16][(x + i) % 16] = col
    for i in range(w):
        t[(y + h) % 16][(x + i + 1) % 16] = WD(2)


class CatalogWood(FloorBase):
    """F1: warm oak parquet in a basket weave (2 planks per 8 x 8 block, directions alternating). Soft seams
    (one ramp step), so the floor reads as polished oak and the actors stay on top of it."""
    id = 'catalog_wood'
    nvariants = 7
    weights = [24, 3, 2, 1, 1, 1, 1]
    edge = WD(1)

    def make_texture(self, frame, variant):
        t = blank(WD(4))
        for by in range(2):
            for bx in range(2):
                horiz = (bx + by) % 2 == 0
                for v_ in range(8):
                    for u in range(8):
                        lx, ly = (u, v_) if horiz else (v_, u)
                        X, Y = bx * 8 + lx, by * 8 + ly
                        vv = v_ % 4
                        col = WD(4)
                        if vv == 3 or u == 7:
                            col = WD(3)
                        elif vv == 0 and u < 5 and v_ == 0:
                            col = WD(5) if u % 2 == 0 else WD(4)
                        elif h32(X, Y, 3102) % 9 == 0:
                            col = WD(3)
                        t[Y][X] = col
                # the far corner of each block sits a step deeper
                t[by * 8 + 7][bx * 8 + 7] = WD(2)
        if variant == 1:
            # a worn, darker pair of planks (foot traffic)
            for y in range(8, 11):
                for x in range(0, 7):
                    if t[y][x] == WD(4):
                        t[y][x] = WD(3) if (x + y) % 3 else WD(4)
        elif variant == 2:
            card(t, 4, 5)
        elif variant == 3:
            stamp_in(t, ['.g.', 'gGg', '.g.'], 7, 7, {'g': GD(2), 'G': GD(4)})
        elif variant == 4:
            for (x, y) in ((10, 3), (11, 3), (10, 4), (11, 4), (12, 4), (11, 5)):
                t[y][x] = INK(1)
            t[3][10] = INK(3)
        elif variant == 5:
            card(t, 9, 10, ink_lines=False)
        elif variant == 6:
            for (x, y) in ((3, 12), (4, 12), (5, 13), (11, 2)):
                t[y][x] = WD(2)
        return t


class GalleryStone(FloorBase):
    """F2: cold slate laid in a harlequin of diamonds (two slate tones) with a small blue-green glass square
    let into every other joint; bevelled lit edges on the north-west of each diamond."""
    id = 'gallery_stone'
    nvariants = 6
    weights = [20, 3, 2, 2, 1, 1]
    edge = K(1)

    def make_texture(self, frame, variant):
        t = blank(K(3))
        for y in range(16):
            for x in range(16):
                best, which, cxy = 99, 0, (0, 0)
                for (cx, cy, k) in ((0, 0, 0), (16, 0, 0), (0, 16, 0), (16, 16, 0), (8, 8, 0),
                                    (8, 0, 1), (0, 8, 1), (16, 8, 1), (8, 16, 1)):
                    dd = abs(x + 0.5 - cx) + abs(y + 0.5 - cy)
                    if dd < best:
                        best, which, cxy = dd, k, (cx, cy)
                cx, cy = cxy
                body = K(3) if which == 0 else K(2)
                col = body
                if best > 7.0:
                    col = K(1)
                elif best > 6.0:
                    if x + 0.5 <= cx and y + 0.5 <= cy:
                        col = K(4) if which == 0 else K(3)
                    elif x + 0.5 >= cx and y + 0.5 >= cy:
                        col = K(2) if which == 0 else K(1)
                elif h32(x, y, 3202) % 19 == 0:
                    col = K(2) if which == 0 else K(3)
                t[y][x] = col
        stamp_in(t, ['.k.', 'kck', '.k.'], 11, 11, {'k': GR(1), 'c': CY(1)})
        if variant == 1:
            stamp_in(t, ['.k.', 'kCk', '.k.'], 3, 3, {'k': GR(2), 'C': CY(3)})
        elif variant == 2:
            for k in range(10):
                x, y = 3 + k, 12 - k
                if t[y][x] != K(1):
                    t[y][x] = K(5) if k % 3 else K(4)
        elif variant == 3:
            for (x, y) in ((9, 9), (10, 9), (10, 10), (11, 10), (10, 11)):
                t[y][x] = GR(2)
            t[9][9] = GR(3)
        elif variant == 4:
            for (x, y) in ((8, 3), (9, 4), (9, 5), (10, 6)):
                t[y][x] = K(1)
        elif variant == 5:
            card(t, 9, 2)
        return t


class StacksWood(FloorBase):
    """F3: dark warped planks, roots pushing through, ink soaking the seams."""
    id = 'stacks_wood'
    nvariants = 8
    weights = [14, 2, 2, 2, 2, 1, 1, 2]
    edge = WD(0)

    def make_texture(self, frame, variant):
        # long boards: a joint in every other row only (the others run on into the next tile), soft seams with
        # ink caught in them, grain streaks along each board, a worn lighter edge here and there
        t = blank(WD(2))
        # board ends only in some variants, so the joints scatter instead of laying a brick bond
        joints = {0: {}, 1: {1: 6}, 2: {3: 11}, 3: {0: 9, 2: 3}, 4: {2: 13}, 5: {1: 2}, 6: {}, 7: {3: 7}}[variant]
        for row in range(4):
            y0 = row * 4
            joint = joints.get(row)
            for X in range(16):
                for yy in range(4):
                    Y = y0 + yy
                    col = WD(2)
                    if yy == 3:
                        col = WD(1) if (X + row * 5) % 9 else INK(1)
                    elif yy == 0 and h32(X // 4, row, 3301) % 3 == 0:
                        col = WD(3)
                    elif yy in (1, 2) and h32(X // 3, Y, 3303) % 5 == 0 and (X + Y) % 2 == 0:
                        col = WD(1)
                    if joint is not None and X == joint and yy < 3:
                        col = WD(0)
                    if joint is not None and X == (joint + 1) % 16 and yy == 0:
                        col = WD(3)
                    t[Y][X] = col
        if variant == 1:
            floor_root(t, [(-2, 9), (3, 8), (8, 10), (13, 9), (18, 9)])
        elif variant == 2:
            ink_blot(t, 7, 6, 3.2, 1.8)
        elif variant == 3:
            for X in range(3, 11):
                t[5][X] = DARK
                t[6][X] = INK(1) if X % 3 else DARK
            t[4][3] = WD(3)
            t[4][10] = WD(3)
            t[7][4] = WD(1)
        elif variant == 4:
            for (x, y) in ((4, 9), (5, 9), (5, 10), (6, 10), (11, 3), (12, 3), (12, 4)):
                t[y][x] = FD(2)
            t[9][4] = FD(3)
            t[3][11] = FD(3)
        elif variant == 5:
            card(t, 3, 9, ink_lines=True)
        elif variant == 6:
            floor_root(t, [(16, 2), (11, 4), (7, 3), (2, 6), (-2, 6)])
        elif variant == 7:
            ink_blot(t, 11, 11, 2.2, 1.4)
        return t


def floor_root(t, pts):
    """A root breaking through the floor boards: 3 px tall, lit crest, dark rim, a cast shadow below."""
    for a, b in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = a, b
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n)
            y = round(y0 + (y1 - y0) * k / n)
            if not 0 <= x < 16:
                continue
            t[(y - 1) % 16][x] = WD(0)
            t[y % 16][x] = WD(4) if (x % 4) else WD(3)
            t[(y + 1) % 16][x] = WD(3)
            t[(y + 2) % 16][x] = WD(1)
            t[(y + 3) % 16][x] = DARK if (x % 3) else WD(0)


def ink_blot(t, cx, cy, rx, ry):
    """A soaked ink stain: dark core, a lighter wet rim, one glint."""
    for y in range(16):
        for x in range(16):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 + (rnd(x, y, 3401) - 0.5) * 0.35
            if d < 1:
                t[y][x] = INK(1) if d < 0.55 else INK(2)
    t[int(cy - ry * 0.4)][int(cx - rx * 0.3)] = INK(3)


def root_strand(t, pts, w=2, ramp=None):
    """Paint a root along a polyline into a 16x16 texture (wrapping): lit top, dark underside."""
    for a, b in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = a, b
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n)
            y = round(y0 + (y1 - y0) * k / n)
            for j in range(w):
                t[(y + j) % 16][x % 16] = WD(4) if j == 0 else WD(3)
            t[(y + w) % 16][x % 16] = WD(0)
            t[(y - 1) % 16][x % 16] = WD(1) if t[(y - 1) % 16][x % 16] not in (WD(3), WD(4)) else t[(y - 1) % 16][x % 16]


# ====================================================================== wall band (A2 top: a full tile of wall)
class BandTop(Terrain):
    """The wall band around every room: a textured top surface with a bright front lip (S), a dark back edge
    (N), a lit west edge and a shaded east edge. Subclasses give the surface texture and the edge colours."""
    nvariants = 4
    weights = [6, 2, 2, 1]
    ins = {'N': 2.0, 'S': 3.0, 'W': 2.0, 'E': 2.0}
    metric = 'cheb'
    prof_amp = 0.0
    seed = 4000

    def __init__(self):
        super().__init__()
        prof = None
        if self.prof_amp:
            prof = {s: profile1d(self.seed + i, amp=self.prof_amp, spikes=2, spike_amp=1.0) for i, s in enumerate('NSWE')}
        self.specs = {
            'fill': EdgeSpec(self.ins, r=1.5 if self.metric == 'euclid' else 0, rr=1.0, prof=prof, metric=self.metric),
            'rim': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb'),
        }

    def pixel(self, c, x, y):
        if c.i('fill', x, y):
            return self.tex(c, x, y)
        d = c.f('rim', x, y)
        side = c.side('fill', x, y) or c.side('rim', x, y)
        return self.rim(side, d, x, y)


class CatalogTop(BandTop):
    id = 'catalog_top'
    seed = 4010

    def make_texture(self, frame, variant):
        # a walnut wall cap: long grain, a brass-capped joint every so often
        t = blank(WD(1))
        for y in range(16):
            for x in range(16):
                g = h32(y, (x + y * 3) // 5, 4011) % 7
                if g == 0:
                    t[y][x] = WD(2)
                elif g == 1 and y % 4 == 1:
                    t[y][x] = WD(0)
        for x in range(16):
            t[7][x] = WD(0) if x % 8 else WD(2)
            t[8][x] = WD(2) if x % 3 else WD(1)
        if variant == 1:
            for y in range(2, 14):
                t[y][7] = WD(0); t[y][8] = WD(2)
            t[4][7] = GD(2); t[11][7] = GD(2)
        elif variant == 2:
            card(t, 4, 2, ink_lines=False)
            card(t, 6, 10, ink_lines=False)
        elif variant == 3:
            stamp_in(t, ['.gg.', 'gGGg', '.gg.'], 6, 6, {'g': GD(1), 'G': GD(3)})
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [WD(5), GD(3), GD(2), WD(3)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else WD(0)
        if side == 'W':
            return WD(0) if d < 1 else WD(3)
        return DARK if d < 1 else WD(0)


class GalleryTop(BandTop):
    id = 'gallery_top'
    seed = 4020

    def make_texture(self, frame, variant):
        # a dark slate cap with a cold sheen; flecks of mica
        t = blank(K(1))
        for y in range(16):
            for x in range(16):
                n = h32(x // 2, y, 4021) % 9
                if n == 0:
                    t[y][x] = K(2)
                elif n == 1 and (x + y) % 3 == 0:
                    t[y][x] = K(0)
        for x in range(16):
            t[8][x] = K(0) if x % 16 else K(2)
        if variant == 1:
            for (x, y) in ((4, 3), (11, 12), (13, 5)):
                t[y][x] = K(4)
        elif variant == 2:
            for y in range(1, 15):
                t[y][8] = K(0)
                t[y][9] = K(2) if y % 3 else K(1)
        elif variant == 3:
            stamp_in(t, ['.g.', 'gcg', '.g.'], 6, 4, {'g': GR(2), 'c': CY(2)})
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GR(4), GR(3), GR(2), K(2)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else K(0)
        if side == 'W':
            return K(0) if d < 1 else K(3)
        return DARK if d < 1 else K(0)


class StacksTop(BandTop):
    """Root-choked cap: dark wood under a tangle of roots and moss; ragged edges where the roots spill."""
    id = 'stacks_top'
    seed = 4030
    metric = 'euclid'
    prof_amp = 0.9
    ins = {'N': 2.0, 'S': 3.0, 'W': 2.0, 'E': 2.0}

    def make_texture(self, frame, variant):
        t = blank(WD(0))
        for y in range(16):
            for x in range(16):
                if h32(x, y // 2, 4031) % 9 == 0:
                    t[y][x] = DARK
        paths = [
            [[(0, 4), (5, 3), (9, 5), (16, 4)], [(0, 12), (6, 13), (11, 11), (16, 12)]],
            [[(0, 6), (4, 7), (8, 5), (12, 6), (16, 6)], [(3, 16), (5, 12), (9, 10), (14, 9), (19, 10)]],
            [[(0, 2), (6, 4), (10, 3), (16, 2)], [(0, 10), (4, 9), (10, 12), (16, 10)]],
            [[(0, 8), (8, 8), (16, 8)], [(2, 0), (4, 6), (3, 12), (2, 16)]],
        ][variant % 4]
        for p in paths:
            root_strand_dark(t, p)
        for (x, y) in scatter(4033 + variant, 3, 4, lo=1, hi=15, torus=False):
            t[y][x] = FD(2)
            t[y][(x + 1) % 16] = FD(1)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [WD(3), WD(2), WD(1), WD(0)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else WD(0)
        if side == 'W':
            return WD(0) if d < 1 else WD(1)
        return DARK if d < 1 else WD(0)


def root_strand_dark(t, pts):
    """A thick root over a dark mass: 2 px body (wood 2 lit top, wood 1), wood 0 underside."""
    for a, b in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = a, b
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n)
            y = round(y0 + (y1 - y0) * k / n)
            t[y % 16][x % 16] = WD(1) if (x + y) % 4 else WD(2)
            t[(y + 1) % 16][x % 16] = WD(1) if (x % 3) else WD(0)
            if t[(y + 2) % 16][x % 16] not in (WD(1), WD(2)):
                t[(y + 2) % 16][x % 16] = DARK


# ====================================================================== the deep beyond (A2 with no edges)
class DeepTop(Terrain):
    """Every quarter is the fill, so the region is seamless; variants carry the silhouettes."""
    nvariants = 6
    weights = [6, 2, 2, 2, 1, 1]

    def pixel(self, c, x, y):
        return self.tex(c, x, y)


class CatalogDeep(DeepTop):
    """Beyond the F1 walls: rows of shelves and drawer banks lost in the dark (very low contrast)."""
    id = 'catalog_out_top'
    weights = [6, 3, 3, 2, 3, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant in (0, 1, 2):
            # shelf bays: uprights, two boards, spines, all a hair above black
            for y in range(16):
                t[y][0] = INK(1)
            for x in range(16):
                t[7][x] = INK(1)
                t[15][x] = INK(1)
            for board in (0, 8):
                x = 2
                k = 0
                while x < 15:
                    w = 1 + h32(variant, board, k, 4101) % 2
                    hgt = 3 + h32(variant, board, k, 4102) % 3
                    col = [INK(1), WD(0), INK(1), SHD(1)][h32(variant, board, k, 4103) % 4]
                    if h32(variant, board, k, 4104) % 4 == 0:
                        x += 2
                        k += 1
                        continue
                    for i in range(w):
                        for j in range(hgt):
                            if x + i < 15:
                                t[board + 6 - j][x + i] = col
                    x += w
                    k += 1
        elif variant == 3:
            # a bank of card drawers, pulls catching no light at all
            for y in range(16):
                for x in range(16):
                    if y % 5 == 4 or x % 8 == 7:
                        t[y][x] = INK(1)
                    elif y % 5 == 1 and x % 8 == 3:
                        t[y][x] = WD(0)
        elif variant == 4:
            t[5][4] = INK(1)
            t[10][11] = INK(1)
        else:
            for y in range(16):
                t[y][5] = WD(0)
                t[y][10] = WD(0)
                if y % 4 == 2:
                    for x in range(6, 10):
                        t[y][x] = WD(0)
        return t


class GalleryDeep(DeepTop):
    """Beyond the F2 walls: tall leaded windows of dark glass, one pane in a few catching a cold glint."""
    id = 'gallery_out_top'
    weights = [6, 3, 3, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant == 4:
            t[6][7] = INK(1)
            return t
        # one lancet per tile: a pointed arch 8 px wide, lead cames in ink, panes of deep navy glass
        x0, x1 = 4, 11
        for y in range(1, 16):
            for x in range(x0, x1 + 1):
                cx = (x0 + x1) / 2.0
                if y < 5:
                    # pointed head
                    if abs(x + 0.5 - (cx + 0.5)) > (y - 0.5) * 1.1:
                        continue
                edge = x in (x0, x1) or y == 15
                if y < 5 and abs(x + 0.5 - (cx + 0.5)) > (y - 0.5) * 1.1 - 1.2:
                    edge = True
                if edge:
                    t[y][x] = INK(1)
                elif x == 7 or x == 8 or y in (6, 11):
                    t[y][x] = INK(1) if (x in (7, 8)) == (y not in (6, 11)) else INK(1)
                else:
                    t[y][x] = WA(0) if (variant + (y // 5)) % 3 else DARK
        if variant == 1:
            t[8][5] = GR(1)
        elif variant == 2:
            t[13][10] = CY(0)
            t[3][7] = WA(0)
        elif variant == 3:
            for y in range(1, 16):
                for x in range(4, 12):
                    if t[y][x] == WA(0):
                        t[y][x] = DARK if (x + y) % 2 else WA(0)
        elif variant == 5:
            t[9][6] = CY(1)
        return t


class StacksDeep(DeepTop):
    """Beyond the F3 walls: black, with old roots surfacing here and there (fragments that end inside the tile, so
    the dark never stripes); the big root masses are overlays placed by the maps (root_mass_a / _b)."""
    id = 'stacks_out_top'
    weights = [8, 2, 2, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        frags = [
            [],
            [[(2, 4), (6, 3), (10, 5), (13, 4)]],
            [[(3, 11), (7, 9), (12, 10)], [(9, 2), (10, 5)]],
            [[(4, 2), (5, 7), (3, 12)]],
            [[(2, 8), (7, 7), (13, 9)], [(6, 12), (9, 13)]],
            [[(3, 5), (8, 6)], [(10, 10), (12, 13)]],
        ]
        for p in frags[variant % len(frags)]:
            for a, b in zip(p, p[1:]):
                (x0, y0), (x1, y1) = a, b
                n = max(abs(x1 - x0), abs(y1 - y0), 1)
                for k in range(n + 1):
                    x = round(x0 + (x1 - x0) * k / n)
                    y = round(y0 + (y1 - y0) * k / n)
                    t[y][x] = WD(1) if (x + y) % 4 == 0 else WD(0)
                    t[y + 1][x] = WD(0)
        if variant == 3:
            t[8][9] = INK(2)
        if variant == 5:
            t[7][12] = INK(2)
            t[7][13] = INK(3)
        return t


def thick_root(t, pts):
    """A thick old root seen from above in the dark: wood 0 rims, wood 1 body, a wood 2 crest every so often."""
    for a, b in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = a, b
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n)
            y = round(y0 + (y1 - y0) * k / n)
            if t[(y - 1) % 16][x % 16] == DARK:
                t[(y - 1) % 16][x % 16] = WD(0)
            t[y % 16][x % 16] = WD(2) if (x * 3 + y) % 5 == 0 else WD(1)
            t[(y + 1) % 16][x % 16] = WD(1)
            t[(y + 2) % 16][x % 16] = WD(0)


# ====================================================================== inner faces (2 rows under the band)
# Face blocks are cut per quarter (walls.FaceStyle.block): the `top` flag only reaches rows 0..7 and `bottom` only
# rows 8..15. So every face is a HEAD (8 rows, top missing), a BODY (16-periodic, middle rows) and a FOOT (8 rows,
# bottom missing). A 2-row face reads head, body 8..15, body 0..7, foot; a 1-row face reads head, foot.
class SplitFace(FaceStyle):
    def head(self, x, y):
        raise NotImplementedError

    def body(self, x, y):
        raise NotImplementedError

    def foot(self, x, y):
        raise NotImplementedError

    def sides(self, col, x, y, left, top, right, bottom):
        return col

    def pixel(self, x, y, left, top, right, bottom):
        if y < 8 and not top:
            col = self.head(x, y)
        elif y >= 8 and not bottom:
            col = self.foot(x, y - 8)
        else:
            col = self.body(x, y)
        return self.sides(col, x, y, left, top, right, bottom)


class CatalogFace(SplitFace):
    """F1: a walnut cornice with a brass rail, framed oak panels, a chair rail, two rows of card drawers
    (label card, brass pull) and the plinth."""

    def panel(self, x, py):
        u = x % 8
        if py == 0:
            return WD(3)
        if py == 10:
            return WD(1)
        if u == 0:
            return WD(3)
        if u == 7:
            return WD(1)
        if py == 1 or u == 1:
            return WD(3) if py < 9 and u < 7 else WD(2)
        if py == 9 or u == 6:
            return WD(1)
        return WD(2) if (x + py * 3) % 11 else WD(1)

    def drawer(self, x, v):
        u = x % 8
        if v == 4 or u == 7:
            return WD(1)
        if v == 0:
            return WD(4) if u < 6 else WD(3)
        if v == 1 and 2 <= u <= 4:
            return SA(3) if u != 4 else SA(1)
        if v == 2 and u == 3:
            return GD(3)
        if v == 3 and u == 3:
            return GD(1)
        return WD(3)

    def head(self, x, y):
        if y < 5:
            return [DARK, WD(0), WD(2), GD(2) if x % 4 else GD(3), WD(1)][y]
        return self.panel(x, y - 5)

    def body(self, x, r):
        if r >= 8:
            return self.panel(x, r - 5)
        if r == 0:
            return WD(4) if x % 8 else WD(3)
        if r == 1:
            return WD(1)
        return self.drawer(x, r - 2 if r < 7 else 4)

    def foot(self, x, f):
        if f < 5:
            return self.drawer(x, f)
        return [WD(3) if x % 6 else WD(2), WD(0), DARK][f - 5]

    def sides(self, col, x, y, left, top, right, bottom):
        if not left:
            if x == 0:
                return DARK if (y < 2 and not top) else WD(0)
            if x == 1 and not (y < 2 and not top) and col != DARK:
                return WD(3)
        if not right:
            if x == 15:
                return DARK if (y >= 14 and not bottom) else WD(0)
            if x == 14 and col != DARK:
                return WD(1)
        return col


class GalleryFace(SplitFace):
    """F2: slate ashlar under a verdigris frieze, a verdigris skirting band and a dark plinth."""

    def course(self, x, v, k, n=8):
        off = 0 if k % 2 == 0 else 6
        u = (x + off) % 12
        tone = h32(k, (x + off) // 12, 4301) % 3
        body = K(3) if tone else K(2)
        if v == n - 1 or u == 11:
            return K(1)
        if v == 0 and u < 10:
            return K(4) if tone else K(3)
        if u == 0:
            return K(4) if tone else K(3)
        if (x * 5 + v * 3 + k) % 23 == 0:
            return K(2)
        return body

    def head(self, x, y):
        if y < 5:
            return [DARK, K(0), GR(2), GR(3) if x % 4 == 1 else GR(2), GR(1)][y]
        return self.course(x, y - 5, 5, 3)

    def body(self, x, r):
        return self.course(x, r % 8, 0 if r < 8 else 1)

    def foot(self, x, f):
        if f < 3:
            return self.course(x, f, 2, 3)
        return [GR(3) if x % 4 else GR(4), GR(2), K(1), K(0), DARK][f - 3]

    def sides(self, col, x, y, left, top, right, bottom):
        greens = (GR(1), GR(2), GR(3), GR(4))
        if not left:
            if x == 0:
                return K(0)
            if x == 1 and not (y < 2 and not top) and not (y >= 14 and not bottom):
                return K(4) if col not in greens else col
        if not right:
            if x == 15:
                return DARK if (y >= 14 and not bottom) else K(0)
            if x == 14 and not (y >= 14 and not bottom) and col not in greens:
                return K(1)
        return col


class StacksFace(SplitFace):
    """F3: dark warped panelling; roots crawl down from the cap, ink seeps from a crack and pools at the base."""
    ROOTS = {2: 11, 3: 14, 9: 6, 13: 9}            # column -> hanging length (rows of the 2-row face)

    def boards(self, x, Y):
        u = x % 5
        if u == 4:
            return WD(0)
        if u == 0:
            return WD(2) if (Y + x) % 9 else WD(1)
        return WD(1) if h32(x, Y // 3, 4401) % 7 else WD(0)

    def at(self, x, Y):
        col = self.boards(x, Y)
        if Y < 4:
            col = [DARK, WD(0), WD(2), WD(1)][Y]
        if Y >= 28:
            col = [INK(1) if (x * 7) % 5 else INK(2), WD(0), WD(0), DARK][Y - 28]
        elif Y == 27 and (x * 3) % 7 == 0:
            col = INK(1)
        if x == 7 and 6 <= Y <= 27:
            col = INK(1) if Y % 4 else INK(2)
        if x == 8 and 12 <= Y <= 22 and Y % 3 == 0:
            col = INK(1)
        if x == 7 and Y == 5:
            col = DARK
        L = self.ROOTS.get(x)
        if L and 2 <= Y <= L + 1:
            col = WD(3) if (Y % 5 == 1) else WD(2)
        elif (x - 1) in self.ROOTS and 2 <= Y <= self.ROOTS[x - 1]:
            col = WD(0)
        return col

    def head(self, x, y):
        return self.at(x, y)

    def body(self, x, r):
        return self.at(x, r if r >= 8 else 16 + r)

    def foot(self, x, f):
        return self.at(x, 24 + f)

    def sides(self, col, x, y, left, top, right, bottom):
        if not left:
            if x == 0:
                return DARK if (y == 0 and not top) else WD(0)
            if x == 1 and col in (WD(1), WD(0)):
                return WD(2)
        if not right and x == 15:
            return DARK if (y >= 15 and not bottom) else WD(0)
        return col


# ====================================================================== outer faces (fall away into the dark)
class OuterFace(SplitFace):
    """Exterior face under a band's south lip: the material near the top, dithering into the dark below."""
    shadow_line = DARK
    edge_dark = DARK

    def material(self, x, Y):
        raise NotImplementedError

    def at(self, x, Y):
        col = self.material(x, Y)
        if Y == 0:
            col = self.shadow_line
        t = max(0.0, (Y - 5) / 24.0) ** 0.85
        if fade(x, Y, t):
            col = DARK
        return col

    def head(self, x, y):
        return self.at(x, y)

    def body(self, x, r):
        return self.at(x, r if r >= 8 else 16 + r)

    def foot(self, x, f):
        return self.at(x, 24 + f)

    def sides(self, col, x, y, left, top, right, bottom):
        if not left and x == 0 and col != DARK:
            return self.edge_dark
        if not right and x == 15 and col != DARK:
            return DARK
        return col


class CatalogOut(OuterFace):
    shadow_line = WD(0)
    edge_dark = WD(0)

    def material(self, x, Y):
        if 1 <= Y <= 4:
            return [WD(2), WD(3), GD(2) if x % 8 == 4 else WD(2), WD(0)][Y - 1]
        u = x % 4
        if u == 3:
            return WD(0)
        if u == 0:
            return WD(2) if Y % 7 else WD(1)
        return WD(1)


class GalleryOut(OuterFace):
    shadow_line = K(0)
    edge_dark = K(0)

    def material(self, x, Y):
        if Y in (1, 2, 3):
            return [GR(3), GR(2), GR(1)][Y - 1]
        course = (Y - 4) // 7
        v = (Y - 4) % 7
        u = (x + (course % 2) * 6) % 12
        if v == 6 or u == 11:
            return K(0)
        if v == 0 or u == 0:
            return K(2)
        return K(1)


class StacksOut(OuterFace):
    """A curtain of roots hanging off the band into the dark."""
    shadow_line = WD(0)
    edge_dark = WD(0)

    def material(self, x, Y):
        L = 7 + h32(x, 4501) % 22
        strand = h32(x, 4502) % 3
        if Y <= 2:
            return [WD(0), WD(1), WD(2)][Y]
        if Y < L:
            if strand == 0:
                return DARK
            if strand == 1:
                return WD(2) if (Y + x) % 6 else WD(3)
            return WD(1)
        if Y == L and strand:
            return WD(0)
        return DARK

    def at(self, x, Y):
        col = self.material(x, Y)
        if Y > 20 and fade(x, Y, (Y - 20) / 14.0):
            col = DARK
        return col


# ====================================================================== assemble into the archive sheet
FLOORS = [CatalogWood(), GalleryStone(), StacksWood()]
WALLS = [
    # (system, band top, inner face, deep top, outer face)
    ('catalog', CatalogTop(), CatalogFace(), CatalogDeep(), CatalogOut()),
    ('gallery', GalleryTop(), GalleryFace(), GalleryDeep(), GalleryOut()),
    ('stacks', StacksTop(), StacksFace(), StacksDeep(), StacksOut()),
]


def build_into(sh):
    """Add the per-floor terrains and wall systems to an archive Sheet (kit.Sheet)."""
    sh.newline()
    terr = sh.meta.setdefault('terrains', {})
    for fl in FLOORS:
        x, y = sh.alloc(32, 48)
        sh.cv.paste(fl.block(), x, y)
        m = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A2', 'kind': 'fill', 'collision': 'none',
             'variants': [], 'variantWeights': list(fl.weights)}
        for v in range(fl.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(fl.variant_tile(v), vx, vy)
            m['variants'].append([vx, vy])
        terr[fl.id] = m
    sh.newline()
    walls = sh.meta.setdefault('walls', {})
    for sys_id, band, face, deep, out in WALLS:
        tx, ty = sh.alloc(32, 48)
        sh.cv.paste(band.block(), tx, ty)
        fx, fy = sh.alloc(32, 32)
        sh.cv.paste(face.block(), fx, fy)
        dx, dy = sh.alloc(32, 48)
        sh.cv.paste(deep.block(), dx, dy)
        ox, oy = sh.alloc(32, 32)
        sh.cv.paste(out.block(), ox, oy)
        tv = []
        for v in range(band.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(band.variant_tile(v), vx, vy)
            tv.append([vx, vy])
        dv = []
        for v in range(deep.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(deep.variant_tile(v), vx, vy)
            dv.append([vx, vy])
        walls[sys_id] = {'top': [tx, ty], 'face': [fx, fy], 'collision': 'solid',
                         'topVariants': tv, 'topVariantWeights': list(band.weights),
                         'note': 'W8-archive per-floor wall band (%s_top) and inner face (%s_face)' % (sys_id, sys_id)}
        walls[sys_id + '_out'] = {'top': [dx, dy], 'face': [ox, oy], 'collision': 'solid',
                                  'topVariants': dv, 'topVariantWeights': list(deep.weights),
                                  'note': 'the deep beyond the walls (%s_out_top, no edges) and the outer face '
                                          'under a band\'s south lip (%s_out_face)' % (sys_id, sys_id)}
        sh.newline()
