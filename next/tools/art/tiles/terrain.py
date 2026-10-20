"""Terrain autotiles -> assets/tiles/terrain.png (+ metadata used by build_tiles.py).

Each terrain is drawn by a per-pixel style over signed-distance fields (see autotile.EdgeSpec), so every
A2 quarter is cut from a render of exactly the neighbourhood it will be used in. Fill textures are periodic
with 16 px and sampled at absolute coordinates, so edges and fills join without seams.

Draw order (low -> high) is TERRAIN_ORDER. A higher terrain's edge sits inside its own cells and is
transparent outside the boundary, so the renderer draws lower terrains of the neighbourhood first.
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, CLEAR, hexc, rnd, h32, profile1d, mix
from autotile import EdgeSpec, build_a2, full_nb

PAD = 3


class Ctx:
    def __init__(self, specs, nb, frame, variant):
        self.nb = nb
        self.frame = frame
        self.variant = variant
        self.F = {}
        for n, sp in specs.items():
            self.F[n] = [[sp.field(x, y, nb) for x in range(-PAD, 16 + PAD)] for y in range(-PAD, 16 + PAD)]
        self.specs = specs

    def f(self, name, x, y):
        return self.F[name][y + PAD][x + PAD]

    def i(self, name, x, y):
        return self.F[name][y + PAD][x + PAD] > 0

    def side(self, name, x, y):
        return self.specs[name].side_of(x, y, self.nb)


def scatter(seed, n, mind, lo=0, hi=16, torus=True, tries=400):
    pts = []
    k = 0
    while len(pts) < n and k < tries:
        x = lo + h32(seed, k, 1) % (hi - lo)
        y = lo + h32(seed, k, 2) % (hi - lo)
        k += 1
        ok = True
        for (px, py) in pts:
            dx, dy = abs(px - x), abs(py - y)
            if torus:
                dx, dy = min(dx, 16 - dx), min(dy, 16 - dy)
            if dx * dx + dy * dy < mind * mind:
                ok = False
                break
        if ok:
            pts.append((x, y))
    return pts


def stamp_wrap(tex, rows, x, y, cmap):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            c = cmap.get(ch)
            if c is not None:
                tex[(y + j) % 16][(x + i) % 16] = c


def stamp_in(tex, rows, x, y, cmap):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            c = cmap.get(ch)
            if c is not None and 0 <= x + i < 16 and 0 <= y + j < 16:
                tex[y + j][x + i] = c


def blank(c):
    return [[c for _ in range(16)] for _ in range(16)]


class Terrain:
    id = ''
    kind = 'fill'
    collision = 'none'
    frames = 1
    nvariants = 1
    specs = {}

    def __init__(self):
        self._tex = {}

    def texture(self, frame, variant):
        key = (frame, variant)
        if key not in self._tex:
            self._tex[key] = self.make_texture(frame, variant)
        return self._tex[key]

    def make_texture(self, frame, variant):
        raise NotImplementedError

    def tex(self, ctx, x, y):
        return self.texture(ctx.frame, ctx.variant)[y % 16][x % 16]

    def pixel(self, ctx, x, y):
        raise NotImplementedError

    def tile(self, nb, frame=0, variant=0):
        ctx = Ctx(self.specs, nb, frame, variant)
        cv = Canvas(16, 16)
        for y in range(16):
            for x in range(16):
                col = self.pixel(ctx, x, y)
                if col is not None:
                    cv.put(x, y, col)
        return cv

    def block(self, frame=0):
        return build_a2(lambda nb, fr: self.tile(nb, fr, 0), frame)

    def variant_tile(self, v):
        return self.tile(full_nb(), 0, v)


# =====================================================================================  GRASS
G = lambda i: C('grass', i)

TUFT = ['..l..',
        'l.l.l',
        'dldld',
        '.ddd.']
TUFT_SMALL = ['.l.',
              'ldl',
              'd.d']
BLADE_V = ['d.d',
           '.d.']
CLOVER = ['.ll.',
          'lhhl',
          'lhhl',
          '.dd.']


class Grass(Terrain):
    id = 'grass'

    def __init__(self):
        super().__init__()
        prof = {'N': profile1d(101, amp=0.7, spikes=3, spike_amp=1.3),
                'S': profile1d(102, amp=0.6, spikes=3, spike_amp=1.2),
                'W': profile1d(103, amp=0.6, spikes=2, spike_amp=1.0),
                'E': profile1d(104, amp=0.6, spikes=2, spike_amp=1.0)}
        self.specs = {
            'top': EdgeSpec({'N': 2.2, 'S': 3.4, 'W': 2.2, 'E': 2.6}, r=3.5, rr=1.5, prof=prof),
            'lip': EdgeSpec({'N': 2.2, 'S': 1.6, 'W': 2.2, 'E': 2.6}, r=3.5, rr=1.5, prof=prof),
        }

    nvariants = 6
    weights = [4, 3, 1, 2, 2, 2]

    def make_texture(self, frame, variant):
        t = blank(G(3))
        cm = {'d': G(2), 'l': G(4), 'h': G(5)}
        # base: very sparse, low-contrast marks (it repeats every 16 px, so it must stay quiet)
        stamp_wrap(t, BLADE_V, 3, 4, cm)
        t[11][12] = G(2)
        t[12][13] = G(2)
        t[13][6] = G(4)

        def patch(cx, cy, rx, ry, col, seed, solid=0.45):
            for y in range(1, 15):
                for x in range(1, 15):
                    dx, dy = (x - cx) / rx, (y - cy) / ry
                    r = dx * dx + dy * dy + (rnd(x, y, seed) - 0.5) * 0.5
                    if r < solid or (r < 1.0 and (x + y) % 2 == 0):
                        t[y][x] = col
        if variant == 1:
            x, y = 3 + h32(21) % 7, 3 + h32(22) % 7
            stamp_in(t, TUFT, x, y, cm)
            stamp_in(t, BLADE_V, (x + 7) % 12 + 1, (y + 6) % 11 + 2, cm)
        elif variant == 2:
            # sunlit patch
            patch(8.5, 6.5, 5.2, 3.4, G(4), 31, solid=0.25)
            stamp_in(t, TUFT_SMALL, 3, 10, cm)
        elif variant == 3:
            # shaded, denser patch
            patch(7.0, 8.5, 4.8, 3.6, G(2), 32)
            stamp_in(t, TUFT_SMALL, 6, 7, {'d': G(1), 'l': G(3)})
        elif variant == 4:
            stamp_in(t, ['.ll', 'lhl', '.d.'], 9, 3, cm)
            stamp_in(t, ['.l.', 'lhl', 'dd.'], 4, 9, cm)
            t[12][12] = G(5)
        elif variant == 5:
            for (x, y) in scatter(41, 4, 5, lo=1, hi=13, torus=False):
                stamp_in(t, BLADE_V, x, y, cm)
            t[7][8] = G(5)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            col = self.tex(c, x, y)
            up = c.i('top', x, y - 1)
            dn = c.i('top', x, y + 1)
            lf = c.i('top', x - 1, y)
            rt = c.i('top', x + 1, y)
            if not dn:
                return G(1)
            if not up:
                return G(4)
            if not rt:
                return G(2)
            if not lf:
                return G(4) if y % 2 == 0 else col
            if not c.i('top', x, y - 2):
                return G(3) if col == G(2) else col
            return col
        if c.i('lip', x, y):
            if c.i('top', x, y - 1):
                return G(0)
            return SH(84)
        if c.i('top', x - 1, y) or c.i('top', x - 1, y - 1):
            return SH(56)
        return None


# =====================================================================================  TALL GRASS
TALL_CLUMP = ['.h...h.',
              '.lh.hl.',
              'lmlhlml',
              'mdmlmdm',
              'd.dmd.d']


class TallGrass(Terrain):
    id = 'tallgrass'
    nvariants = 2

    def __init__(self):
        super().__init__()
        prof = {'N': profile1d(201, amp=0.6, spikes=5, spike_amp=2.0),
                'S': profile1d(202, amp=0.5, spikes=2, spike_amp=0.8),
                'W': profile1d(203, amp=0.5, spikes=2, spike_amp=1.4),
                'E': profile1d(204, amp=0.5, spikes=2, spike_amp=1.4)}
        self.specs = {
            'top': EdgeSpec({'N': 2.6, 'S': 3.2, 'W': 2.0, 'E': 2.4}, r=3.0, rr=1.2, prof=prof),
            'lip': EdgeSpec({'N': 2.6, 'S': 1.0, 'W': 2.0, 'E': 2.4}, r=3.0, rr=1.2, prof=prof),
        }

    def make_texture(self, frame, variant):
        t = blank(G(2))
        cm = {'d': G(1), 'm': G(2), 'l': G(3), 'h': G(4)}
        # staggered clumps: 8 px apart horizontally, rows every 4 px, alternate rows offset by 4
        for row in range(4):
            for col in range(2):
                x = col * 8 + (4 if row % 2 else 0) + (1 if variant and (row + col) % 3 == 0 else 0)
                stamp_wrap(t, TALL_CLUMP, x - 3, row * 4 - 1, cm)
        if variant == 1:
            stamp_in(t, ['.h.', 'hlh'], 6, 6, {'h': G(5), 'l': G(4)})
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            col = self.tex(c, x, y)
            if not c.i('top', x, y + 1):
                return G(1)
            if not c.i('top', x, y - 1):
                return G(5) if (x % 3) else G(4)
            if not c.i('top', x + 1, y):
                return G(1)
            if not c.i('top', x - 1, y):
                return G(3)
            return col
        if c.i('lip', x, y):
            if c.i('top', x, y - 1):
                return G(0)
            return SH(96)
        if c.i('top', x - 1, y):
            return SH(60)
        return None


# =====================================================================================  DIRT PATH
P = lambda i: C('path', i)


class Dirt(Terrain):
    id = 'dirt'
    nvariants = 4

    def __init__(self):
        super().__init__()
        prof = {s: profile1d(300 + i, amp=1.0, spikes=1, spike_amp=0.8) for i, s in enumerate('NSWE')}
        self.specs = {'top': EdgeSpec({'N': 1.6, 'S': 1.6, 'W': 1.6, 'E': 1.6}, r=3.0, rr=2.0, prof=prof)}

    def make_texture(self, frame, variant):
        t = blank(P(2))
        # gentle tonal mottling (two-tone, dithered)
        for y in range(16):
            for x in range(16):
                n = rnd(x // 4, y // 4, 41) * 0.6 + rnd(x, y, 42) * 0.4
                if n > 0.78 and (x + y) % 2 == 0:
                    t[y][x] = P(3)
                elif n < 0.16 and (x + y) % 2 == 1:
                    t[y][x] = P(1)
        peb = {'l': P(4), 'm': P(3), 'd': P(1), 'D': P(0)}
        for (x, y) in scatter(43, 3, 6):
            stamp_wrap(t, ['lm', 'md'] if (x + y) % 2 else ['l.', 'md'], x, y, peb)
        for (x, y) in scatter(44, 4, 4):
            t[y][x] = P(1)
        if variant == 1:
            stamp_in(t, ['.lm.', 'lmmd', '.dd.'], 6, 6, peb)
        elif variant == 2:
            # small cart rut / crack
            for i, (x, y) in enumerate([(4, 9), (5, 9), (6, 8), (7, 8), (8, 8), (9, 7), (10, 7)]):
                t[y][x] = P(1)
                if i % 2 == 0:
                    t[y + 1][x] = P(3)
        elif variant == 3:
            stamp_in(t, ['l.', 'md'], 4, 4, peb)
            stamp_in(t, ['lm', 'md'], 10, 9, peb)
            stamp_in(t, ['l'], 8, 12, peb)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            col = self.tex(c, x, y)
            if not c.i('top', x, y - 1) or not c.i('top', x - 1, y):
                return P(1)
            if not c.i('top', x, y + 1) or not c.i('top', x + 1, y):
                return P(1)
            return col
        if (c.i('top', x, y - 1) or c.i('top', x, y + 1) or c.i('top', x - 1, y) or c.i('top', x + 1, y)) \
                and (x + y) % 2 == 0:
            return P(1)
        return None


# =====================================================================================  COBBLESTONE PLAZA
S = lambda i: C('stone_warm', i)

def voronoi16(seed, nx, ny, jitter=0.85, sx=1.0, sy=1.0):
    """Label map of a jittered-grid Voronoi tessellation on the 16 x 16 torus."""
    pts = []
    for j in range(ny):
        for i in range(nx):
            px = (i + 0.5 + (rnd(seed, i, j, 1) - 0.5) * jitter) * 16.0 / nx
            py = (j + 0.5 + (rnd(seed, i, j, 2) - 0.5) * jitter) * 16.0 / ny
            pts.append((px, py))
    lab = [[0] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            best, bd = 0, 1e9
            for k, (px, py) in enumerate(pts):
                dx = abs(x + 0.5 - px)
                dx = min(dx, 16 - dx)
                dy = abs(y + 0.5 - py)
                dy = min(dy, 16 - dy)
                d = (dx * sx) ** 2 + (dy * sy) ** 2
                if d < bd:
                    best, bd = k, d
            lab[y][x] = best
    return lab


def stones_from_labels(lab, tone_of, mortar, hi, lo, crack=None):
    """Draw flagstones: 1 px mortar on the right/bottom border of each stone, light top rim, dark under-rim."""
    t = blank(mortar)
    for y in range(16):
        for x in range(16):
            L = lab[y][x]
            if lab[y][(x + 1) % 16] != L or lab[(y + 1) % 16][x] != L:
                continue
            base = tone_of(L)
            col = base
            up = lab[(y - 1) % 16][x] != L or lab[(y - 1) % 16][(x + 1) % 16] != L
            dn2 = lab[(y + 2) % 16][x] != L or lab[(y + 1) % 16][(x + 1) % 16] != L
            if up:
                col = hi(base)
            elif dn2 and lab[(y + 2) % 16][x] != L:
                col = lo(base)
            t[y][x] = col
    return t


def touches_border(lab, L):
    for i in range(16):
        if lab[0][i] == L or lab[15][i] == L or lab[i][0] == L or lab[i][15] == L:
            return True
    return False


class Plaza(Terrain):
    """Cobble plaza. CRITIQUE_1 C9: mortar in the mid step, only every third stone gets a highlight and an
    under-rim, so the floor stays quieter than the actors. Six fill variants break the 16 px course."""
    id = 'plaza'
    nvariants = 6
    weights = [6, 2, 2, 1, 2, 2]

    def __init__(self):
        super().__init__()
        self.specs = {
            'top': EdgeSpec({'N': 1.0, 'S': 2.0, 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb'),
            'lip': EdgeSpec({'N': 1.0, 'S': 0.0, 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb'),
        }
        self.lab = voronoi16(57, 2, 2, jitter=0.75, sx=1.0, sy=1.2)

    # coursed ashlar on the 16 torus: (y0, h, [(x0, w), ...]); widths of each course sum to 16
    SLABS = [(0, 6, [(0, 7), (7, 5), (12, 4)]),
             (6, 5, [(3, 6), (9, 6), (15, 4)]),
             (11, 5, [(1, 5), (6, 7), (13, 4)])]

    def make_texture(self, frame, variant):
        joint = S(3)
        t = blank(joint)
        k = 0
        for ri, (y0, h, row) in enumerate(self.SLABS):
            for si, (x0, w) in enumerate(row):
                interior = x0 >= 1 and x0 + w <= 16 and y0 >= 1 and y0 + h <= 16
                r = rnd(ri, si, 51)
                if variant and interior:
                    r = rnd(ri, si, 51, variant)
                warm = r >= 0.7
                base = C('path', 3) if warm else S(4)
                hi = C('path', 4) if warm else S(5)
                lo = C('path', 2) if warm else S(3)
                # every third stone is dressed (lit rim + under-rim); the rest sit flat at the base tone
                dressed = (k + (variant % 3)) % 3 == 0
                k += 1
                if variant == 1 and interior:
                    base, hi, lo = S(3), S(4), S(2)
                    dressed = True
                for yy in range(h - 1):
                    for xx in range(w - 1):
                        X, Y = (x0 + xx) % 16, (y0 + yy) % 16
                        col = base
                        if dressed and yy == 0 and 0 < xx < w - 2:
                            col = hi
                        elif dressed and yy == h - 2 and xx > 0:
                            col = lo
                        elif dressed and xx == w - 2 and yy > 1:
                            col = lo
                        t[Y][X] = col
                t[(y0 + h - 1) % 16][(x0 + w - 1) % 16] = S(2) if dressed else joint
                if variant == 2 and interior:
                    for (dx, dy) in [(2, 1), (3, 2), (3, 3), (4, 3)]:
                        if dy < h - 2:
                            t[(y0 + dy) % 16][(x0 + dx) % 16] = S(3)
        if variant == 3:
            for y in range(16):
                for x in range(16):
                    if t[y][x] == joint and rnd(x, y, 59) < 0.3 and 3 < x < 13 and 3 < y < 13:
                        t[y][x] = C('grass', 2) if rnd(x, y, 60) < 0.7 else C('grass', 3)
        if variant == 4:
            # one cracked, sunken slab (middle course, second stone)
            for (dx, dy) in [(1, 1), (2, 2), (3, 2), (4, 3), (5, 3), (3, 1)]:
                t[(6 + dy) % 16][(9 + dx) % 16] = S(2)
            for (dx, dy) in [(2, 1), (4, 2), (5, 2)]:
                t[(6 + dy) % 16][(9 + dx) % 16] = S(4)
        if variant == 5:
            # a wind-blown sand drift over the top course, a pebble and a tuft of grass in a joint
            for (dx, dy) in [(1, 2), (2, 2), (3, 2), (4, 2), (2, 3), (3, 3), (5, 1)]:
                t[(0 + dy) % 16][(7 + dx) % 16] = C('sand', 3)
            t[13][3] = S(5)
            t[14][3] = S(2)
            t[12][10] = C('grass', 3)
            t[13][11] = C('grass', 2)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            d = c.f('top', x, y)
            s = c.side('top', x, y)
            if d < 1:
                return S(1) if s in ('S', 'E') else S(2)
            if d < 4:
                # curb band: long dressed stones, joint every 6 px along the edge
                along = x if s in ('N', 'S') else y
                if d >= 3 or along % 6 == 0:
                    return S(2)
                if d < 2:
                    return S(5) if s in ('N', 'W') else S(4)
                return S(4) if s in ('N', 'W') else S(3)
            return self.tex(c, x, y)
        if c.i('lip', x, y):
            return S(1) if c.i('top', x, y - 1) else SH(90)
        if c.i('top', x - 1, y):
            return SH(70)
        return None


# =====================================================================================  SAND
SA = lambda i: C('sand', i)


class Sand(Terrain):
    id = 'sand'
    nvariants = 4

    def __init__(self):
        super().__init__()
        prof = {s: profile1d(400 + i, amp=1.2, spikes=0) for i, s in enumerate('NSWE')}
        self.specs = {'top': EdgeSpec({'N': 1.8, 'S': 1.8, 'W': 1.8, 'E': 1.8}, r=4.0, rr=2.5, prof=prof)}

    def make_texture(self, frame, variant):
        t = blank(SA(2))
        for (x, y) in scatter(61, 4, 5):
            t[y][x] = SA(1)
        for (x, y) in scatter(62, 3, 5):
            t[y][x] = SA(3)
        # soft wind ripples
        for (x, y) in scatter(63, 2, 8):
            for k in range(4):
                t[y % 16][(x + k) % 16] = SA(1) if k in (1, 2) else SA(2)
                t[(y - 1) % 16][(x + k) % 16] = SA(3) if k in (1, 2) else t[(y - 1) % 16][(x + k) % 16]
        if variant == 1:
            stamp_in(t, ['.w.', 'wmw', '.d.'], 6, 6, {'w': WHITE, 'm': SA(3), 'd': SA(0)})   # shell
        elif variant == 2:
            stamp_in(t, ['lm', 'md'], 4, 9, {'l': C('stone_warm', 4), 'm': C('stone_warm', 3), 'd': C('stone_warm', 2)})
            stamp_in(t, ['l', 'd'], 11, 5, {'l': C('stone_warm', 4), 'd': C('stone_warm', 2)})
        elif variant == 3:
            for k in range(6):
                t[8][4 + k] = SA(1) if k % 2 == 0 else SA(2)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            d = c.f('top', x, y)
            if d < 1:
                return SA(1)
            return self.tex(c, x, y)
        if c.f('top', x, y) > -1.2 and (x + y) % 2 == 0:
            return SA(1)
        return None


# =====================================================================================  SHALLOW WATER
W_ = lambda i: C('water', i)


class Shallow(Terrain):
    id = 'shallow'
    nvariants = 2

    def __init__(self):
        super().__init__()
        prof = {s: profile1d(500 + i, amp=1.0, spikes=0) for i, s in enumerate('NSWE')}
        self.specs = {'top': EdgeSpec({'N': 2.0, 'S': 2.0, 'W': 2.0, 'E': 2.0}, r=4.0, rr=2.0, prof=prof)}

    def make_texture(self, frame, variant):
        t = blank(W_(4))
        # sandy bottom glimpses and ripple dashes
        for (x, y) in scatter(71, 4, 5):
            t[y][x] = W_(3)
            t[y][(x + 1) % 16] = W_(3)
        for (x, y) in scatter(72, 3, 6):
            for k in range(3):
                t[y][(x + k) % 16] = W_(5)
        if variant == 1:
            stamp_in(t, ['lm', 'md'], 7, 7, {'l': C('stone_warm', 4), 'm': W_(3), 'd': W_(2)})
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            d = c.f('top', x, y)
            if d < 1:
                return C('ice', 3)
            if d < 2 and (x + y) % 2 == 0:
                return W_(5)
            return self.tex(c, x, y)
        if c.f('top', x, y) > -1.0:
            return SH(70)
        return None


# =====================================================================================  STONE FLOOR (dungeon)
K = lambda i: C('stone_cool', i)
# slab layout on the 16 torus: rows (y0, h) and slabs (x0, w)
FLAG_ROWS = [(0, 8, [(3, 10), (13, 6)]),
             (8, 8, [(0, 7), (7, 9)])]


class StoneFloor(Terrain):
    id = 'stone_floor'
    nvariants = 5
    weights = [16, 1, 1, 1, 2]

    def __init__(self):
        super().__init__()
        self.specs = {
            'top': EdgeSpec({'N': 1.0, 'S': 2.0, 'W': 1.0, 'E': 1.0}, r=1.5, rr=1.0),
            'lip': EdgeSpec({'N': 1.0, 'S': 0.0, 'W': 1.0, 'E': 1.0}, r=1.5, rr=1.0),
        }

    def make_texture(self, frame, variant):
        t = blank(K(2))
        for ri, (y0, h, row) in enumerate(FLAG_ROWS):
            for si, (x0, w) in enumerate(row):
                base = K(3)
                interior = x0 >= 1 and x0 + w <= 16
                for yy in range(h - 1):
                    for xx in range(w - 1):
                        X, Y = (x0 + xx) % 16, (y0 + yy) % 16
                        col = base
                        if yy == 0 and (xx % 2 == 0 or xx < 3):
                            col = K(4)
                        elif xx == 0 and yy < 3:
                            col = K(4)
                        elif rnd(X, Y, 82 + ri) < 0.05:
                            col = K(2)
                        elif rnd(X, Y, 83 + ri) < 0.03:
                            col = K(4)
                        t[Y][X] = col
                # joint shadow where courses meet
                t[(y0 + h - 1) % 16][(x0 + w - 1) % 16] = K(1)
                if not interior:
                    continue
                if variant == 1 and si == 1:
                    for (px, py) in [(x0 + 1, y0 + 2), (x0 + 2, y0 + 2), (x0 + 3, y0 + 3), (x0 + 4, y0 + 3),
                                     (x0 + 5, y0 + 4), (x0 + 6, y0 + 4)]:
                        t[py % 16][px % 16] = K(2)
                if variant == 2 and si == 1:
                    for (px, py) in [(x0 + w - 3, y0 + h - 3), (x0 + w - 2, y0 + h - 3), (x0 + w - 2, y0 + h - 4)]:
                        t[py % 16][px % 16] = K(2)
                    t[(y0 + h - 2) % 16][(x0 + w - 3) % 16] = K(1)
                if variant == 3 and si == 1:
                    for k in range(w - 1):
                        if rnd(k, 84) < 0.6:
                            t[(y0 + h - 1) % 16][(x0 + k) % 16] = C('grass', 1) if k % 3 else C('grass', 2)
                if variant == 4 and si == 1:
                    for yy in range(2, h - 2):
                        for xx in range(2, w - 3):
                            if (xx + yy) % 2 == 0:
                                t[(y0 + yy) % 16][(x0 + xx) % 16] = K(4)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            if c.f('top', x, y) < 1:
                return K(1)
            return self.tex(c, x, y)
        if c.i('lip', x, y):
            return K(1) if c.i('top', x, y - 1) else SH(90)
        return None


# =====================================================================================  WOOD FLOOR
WD = lambda i: C('wood', i)
PLANK_ENDS = [3, 11, 7, 14]  # board joint x per 4-px plank row


class WoodFloor(Terrain):
    id = 'wood_floor'
    nvariants = 4
    weights = [5, 1, 1, 1]

    def __init__(self):
        super().__init__()
        self.specs = {
            'top': EdgeSpec({'N': 0.0, 'S': 2.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb'),
            'lip': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb'),
        }

    def make_texture(self, frame, variant):
        # honey planks: light boards, soft seams, staggered board ends
        t = blank(WD(4))
        for row in range(4):
            y0 = row * 4
            jx = PLANK_ENDS[row]
            tone = WD(4) if row % 2 == 0 else C('wood', 4)
            for x in range(16):
                t[y0 + 3][x] = WD(3)
                if rnd(x, row, 91) < 0.18:
                    t[y0][x] = WD(5)
                if rnd(x, row, 92) < 0.06:
                    t[y0 + 1][x] = WD(3)
            t[y0][jx] = WD(2)
            t[y0 + 1][jx] = WD(2)
            t[y0 + 2][jx] = WD(2)
            t[y0 + 3][jx] = WD(2)
            t[y0][(jx + 1) % 16] = WD(5)
            if row % 2 == 0:
                for x in range(jx + 4, jx + 9):
                    t[y0 + 2][x % 16] = WD(3)
        if variant == 1:
            stamp_in(t, ['.dd.', 'd..d', '.dd.'], 6, 4, {'d': WD(3)})
            t[5][7] = WD(2)
        elif variant == 2:
            for x in range(3, 13):
                t[9][x] = WD(3)
                t[10][x] = WD(3) if x % 3 else WD(4)
        elif variant == 3:
            t[13][5] = WD(2)
            t[13][6] = WD(3)
            t[1][10] = WD(5)
            t[1][11] = WD(5)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            if c.f('top', x, y) < 1:
                return WD(0)
            return self.tex(c, x, y)
        if c.i('lip', x, y):
            return WD(1) if c.i('top', x, y - 1) else SH(100)
        return None


# =====================================================================================  CARPETS
class Carpet(Terrain):
    kind = 'fill'
    nvariants = 1

    def __init__(self, cid, ramp):
        super().__init__()
        self.id = cid
        self.ramp = ramp
        self.specs = {
            'top': EdgeSpec({'N': 1.0, 'S': 1.0, 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb'),
        }

    def R(self, i):
        return C(self.ramp, i)

    def tones(self):
        """(field, weave-dark, weave-light, border-dark) for this cloth"""
        if self.ramp == 'cloth_blue':
            return self.R(2), self.R(1), self.R(3), self.R(0)
        return self.R(3), self.R(2), self.R(4), self.R(1)

    def make_texture(self, frame, variant):
        # CRITIQUE_1 C16: cloth, not a tile grid. A soft field: a sparse diagonal weave one shade above and
        # one below the base, never lines that meet at the tile edge.
        base, dark, light, _ = self.tones()
        t = blank(base)
        for y in range(16):
            for x in range(16):
                if (x + 2 * y) % 8 == 0 and (x + y) % 3 == 0:
                    t[y][x] = dark
                elif (x + 2 * y) % 8 == 4 and (x * 2 + y) % 10 == 0:
                    t[y][x] = light
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            d = c.f('top', x, y)
            base, dark, light, border = self.tones()
            side = c.side('top', x, y)
            along = x if side in ('N', 'S') else y
            if d < 1:
                # binding: dark hem with a fringe stitch every other pixel on the N/S ends
                if side in ('N', 'S') and along % 2 == 0:
                    return C('gold', 2)
                return border
            if d < 2:
                return C('gold', 3) if side in ('N', 'W') else C('gold', 2)
            if d < 3:
                # guard stripe: base with a running knot pattern
                return light if along % 4 == 1 else base
            if d < 4:
                return dark
            if d < 5:
                return C('gold', 2) if along % 6 == 3 else base
            return self.tex(c, x, y)
        if c.f('top', x, y) > -1.0 and c.i('top', x, y - 1):
            return SH(90)
        return None


# =====================================================================================  PIT / VOID
class Pit(Terrain):
    """Hole in the floor (W8-archive, CRITIQUE_3 #4: reads as a pit from any distance). An irregular outline (wobbly
    profile with a few bites), a LIGHT rim all round (a lit stone lip on the near and west sides, a lit lip over a
    cut face on the far side), the far wall falling away in courses into the dark, and a faint ink glow far below."""
    id = 'pit'
    kind = 'hole'
    collision = 'pit'
    nvariants = 1

    def __init__(self):
        super().__init__()
        prof = {s: profile1d(610 + i, amp=1.9, spikes=3, spike_amp=1.2) for i, s in enumerate('NSWE')}
        self.specs = {
            'ground': EdgeSpec({'N': 1.5, 'S': 1.5, 'W': 1.5, 'E': 1.5}, r=3.0, rr=2.0, prof=prof),
            'void': EdgeSpec({'N': 8.0, 'S': 3.5, 'W': 3.5, 'E': 3.5}, r=3.5, rr=2.5, prof=prof),
        }

    def make_texture(self, frame, variant):
        return blank(DARK)

    def pixel(self, c, x, y):
        if not c.i('ground', x, y):
            return None
        g = c.f('ground', x, y)
        if c.i('void', x, y):
            k = 0
            while k < 5 and c.i('void', x, y - k - 1):
                k += 1
            s = c.side('void', x, y)
            if k == 0 and s == 'N':
                return C('ink', 1)
            if k == 1 and s == 'N' and (x + y) % 2 == 0:
                return C('ink', 1)
            # a faint ink glow far below, deep inside the hole
            if c.f('void', x, y) > 4.0 and (x * 3 + y * 5) % 7 == 0:
                return C('ink', 1)
            return DARK
        s = c.side('void', x, y)
        if g < 1:
            # the rim: lit on the far (N) and west lips, a softer light on the near (S) and east lips
            return {'N': K(5), 'W': K(4), 'S': K(3), 'E': K(3)}.get(s, K(4))
        if s == 'N':
            # cut face of the floor going down into the dark: courses fading to ink
            k = 0
            while k < 12 and c.i('ground', x, y - k - 1) and not c.i('void', x, y - k - 1):
                k += 1
            if k <= 1:
                return K(4)
            course = (k - 2) % 3
            joint = course == 2 or ((x + (k // 3) * 5) % 6 == 0)
            if k < 5:
                return K(1) if joint else (K(3) if course == 0 else K(2))
            if k < 7:
                return C('ink', 1) if joint else K(1)
            return C('ink', 1) if (x + k) % 2 else DARK
        if s == 'S':
            return K(0) if g < 2 else DARK
        if s == 'W':
            return K(2) if g < 2 else K(0)
        return K(1) if g < 2 else DARK


# =====================================================================================  MOSS (on stone)
class Moss(Terrain):
    id = 'moss'
    nvariants = 2

    def __init__(self):
        super().__init__()
        prof = {'N': profile1d(701, amp=1.6, spikes=3, spike_amp=1.0),
                'S': profile1d(702, amp=1.4, spikes=2, spike_amp=0.8),
                'W': profile1d(703, amp=1.6, spikes=2, spike_amp=1.0),
                'E': profile1d(704, amp=1.6, spikes=2, spike_amp=1.0)}
        self.specs = {
            'top': EdgeSpec({'N': 2.6, 'S': 3.2, 'W': 2.6, 'E': 2.6}, r=4.0, rr=2.0, prof=prof),
            'lip': EdgeSpec({'N': 2.6, 'S': 2.2, 'W': 2.6, 'E': 2.6}, r=4.0, rr=2.0, prof=prof),
        }

    def make_texture(self, frame, variant):
        F = lambda i: C('foliage_dark', i)
        t = blank(F(1))
        # soft cushions of moss: overlapping round clumps, lit from the top-left
        clumps = scatter(111, 5, 5)
        for y in range(16):
            for x in range(16):
                best = 9.0
                for (cx, cy) in clumps:
                    dx = (x - cx + 8) % 16 - 8
                    dy = (y - cy + 8) % 16 - 8
                    best = min(best, (dx * dx + dy * dy) / 9.0)
                if best < 1.0:
                    t[y][x] = F(2)
                    for (cx, cy) in clumps:
                        dx = (x - cx + 8) % 16 - 8
                        dy = (y - cy + 8) % 16 - 8
                        if -2 <= dx <= 0 and -2 <= dy <= -1:
                            t[y][x] = F(3)
        for (x, y) in scatter(113, 3, 6):
            t[y][x] = G(3)
        if variant == 1:
            stamp_in(t, ['.y.', 'yhy', '.y.'], 7, 6, {'y': C('magic_cyan', 3), 'h': WHITE})
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            if not c.i('top', x, y - 1):
                return C('foliage_dark', 3) if (x % 3) else C('foliage_dark', 2)
            if not c.i('top', x, y + 1) or not c.i('top', x + 1, y):
                return C('foliage_dark', 0)
            return self.tex(c, x, y)
        if c.i('lip', x, y):
            return SH(70)
        return None


# =====================================================================================  WATER (A1, animated)
class Water(Terrain):
    id = 'water'
    kind = 'hole'
    collision = 'water'
    frames = 3
    nvariants = 1

    def __init__(self):
        super().__init__()
        prof = {'N': profile1d(801, amp=0.9, spikes=0), 'S': profile1d(802, amp=0.9, spikes=0),
                'W': profile1d(803, amp=0.9, spikes=0), 'E': profile1d(804, amp=0.9, spikes=0)}
        self.specs = {
            'ground': EdgeSpec({'N': 1.2, 'S': 1.2, 'W': 1.2, 'E': 1.2}, r=3.0, rr=2.0, prof=prof),
            'surf': EdgeSpec({'N': 5.5, 'S': 2.1, 'W': 2.2, 'E': 2.2}, r=3.5, rr=2.5, prof=prof),
        }

    def make_texture(self, frame, variant):
        t = blank(W_(3))
        # troughs: soft darker bands (two rows), drifting 1 px per frame
        for i, (x, y) in enumerate([(1, 2), (9, 7), (4, 12)]):
            L = 7 if i != 1 else 6
            for k in range(L):
                t[y][(x + k + frame) % 16] = W_(2)
            for k in range(1, L - 2):
                t[(y + 1) % 16][(x + k + frame) % 16] = W_(2)
        # wave crests: small light arcs above the troughs, reshaping each frame
        crest = [['.hh.', 'h..h'], ['.hhh', 'h...'], ['hhh.', '...h']]
        for i, (x, y) in enumerate([(3, 1), (11, 6), (6, 11)]):
            shp = crest[(frame + i) % 3]
            for j, row in enumerate(shp):
                for k, ch in enumerate(row):
                    if ch == 'h':
                        t[(y + j - 1) % 16][(x + k + frame) % 16] = W_(4)
        # sparkles
        for i, (x, y) in enumerate([(13, 3), (2, 8), (10, 14)]):
            if (frame + i) % 3 == 0:
                t[y][x] = C('ice', 3)
            elif (frame + i) % 3 == 1:
                t[y][x] = W_(5)
        return t

    def pixel(self, c, x, y):
        if not c.i('ground', x, y):
            return None
        g = c.f('ground', x, y)
        if c.i('surf', x, y):
            d = c.f('surf', x, y)
            s = c.side('surf', x, y)
            if s == 'N' and d < 2.0:
                return W_(1) if d < 1 else W_(2)
            if d < 1:
                # foam line, gaps shimmer by frame
                return C('ice', 3) if (h32(x, y, c.frame, 131) % 5) else W_(5)
            if d < 2 and s in ('S', 'W', 'E') and (x + y + c.frame) % 3 == 0:
                return W_(5)
            return self.tex(c, x, y)
        s = c.side('surf', x, y)
        if s == 'N':
            # far bank: soil face with stones, lit lip on top
            k = 0
            while k < 8 and c.i('ground', x, y - k - 1) and not c.i('surf', x, y - k - 1):
                k += 1
            if k == 0 or g < 1:
                return C('earth', 4) if (x % 4) else C('grass', 2)
            if k == 1:
                return C('earth', 3)
            if (h32(x, 141) % 4 == 0) and k == 2:
                return C('stone_warm', 3)
            return C('earth', 2) if k < 4 else C('earth', 1)
        return C('earth', 1)


# =====================================================================================  INK POOL (A1, animated)
class Ink(Terrain):
    id = 'ink'
    kind = 'hole'
    collision = 'water'
    frames = 3
    nvariants = 1

    def __init__(self):
        super().__init__()
        # W8-archive (CRITIQUE_3 #4): an irregular outline (bigger wobble, a few bites) so pools and moats never
        # read as rectangles, and a deeper far bank so the ink sits well below the floor
        prof = {s: profile1d(920 + i, amp=2.0, spikes=3, spike_amp=1.2) for i, s in enumerate('NSWE')}
        self.specs = {
            'ground': EdgeSpec({'N': 1.2, 'S': 1.2, 'W': 1.2, 'E': 1.2}, r=3.5, rr=2.5, prof=prof),
            'surf': EdgeSpec({'N': 5.5, 'S': 2.6, 'W': 2.9, 'E': 2.9}, r=4.0, rr=3.0, prof=prof),
        }

    # W5-art: a dark violet-indigo liquid, not flat navy. The body is ink:2 with soft ink:1 depth pools,
    # slow highlight ripples (thin ink:3 arcs that drift and breathe over the 3 frames) and a few ink:4
    # glints; the shore has a lighter meniscus ring (ink:3, shimmering to ink:4) under a dark lip.
    def make_texture(self, frame, variant):
        I = lambda i: C('ink', i)
        t = blank(I(2))
        for i, (x, y) in enumerate(scatter(157, 2, 9)):
            for dy, (lo, hi) in enumerate(((-2, 4), (-4, 6), (-1, 5))):
                for dx in range(lo, hi + 1):
                    t[(y + dy - 1) % 16][(x + dx + dy + i) % 16] = I(1)
        arcs = [['...hhhhh...', '..h.....h..'], ['..hhhhhh...', '.h......h..'], ['...hhhhhh..', '..h......h.']]
        for i, (x, y) in enumerate(scatter(151, 2, 9)):
            shp = arcs[(frame + i) % 3]
            for j, row in enumerate(shp):
                for k, ch in enumerate(row):
                    if ch == 'h':
                        t[(y + j) % 16][(x + k + frame) % 16] = I(3)
            if (frame + i) % 3 == 1:
                t[y % 16][(x + 5 + frame) % 16] = I(4)
        for i, (x, y) in enumerate(scatter(153, 3, 6)):
            if (frame + i) % 3 == 0:
                t[y][x] = I(4)
            elif (frame + i) % 3 == 1:
                t[y][x] = I(3)
        return t

    def pixel(self, c, x, y):
        I = lambda i: C('ink', i)
        if not c.i('ground', x, y):
            return None
        g = c.f('ground', x, y)
        if c.i('surf', x, y):
            d = c.f('surf', x, y)
            s = c.side('surf', x, y)
            if s == 'N':
                # under the far bank: the bank's shadow on the liquid (2 px), then the meniscus
                if d < 2:
                    return I(0) if d < 1 or (x + y) % 2 else I(1)
                if d < 3:
                    return I(3) if (x + c.frame) % 3 else I(2)
                if d < 4 and (x + c.frame) % 2 == 0:
                    return I(1)
                return self.tex(c, x, y)
            if d < 1:
                return I(4) if (h32(x, y, c.frame, 161) % 5 == 0) else I(3)
            if d < 2 and (x + y + c.frame) % 4 == 0:
                return I(3)
            return self.tex(c, x, y)
        s = c.side('surf', x, y)
        if g < 1:
            # the light rim: the floor's lit lip all round the pool (CRITIQUE_3 #4), brightest on the far side
            return {'N': K(5), 'W': K(4), 'S': K(3), 'E': K(3)}.get(s, K(4))
        if s == 'N':
            # the far bank: a cut face going down to the ink, stained darker toward the waterline
            k = 0
            while k < 8 and c.i('ground', x, y - k - 1) and not c.i('surf', x, y - k - 1):
                k += 1
            if k <= 1:
                return K(4)
            if k == 2:
                return K(3) if (x % 5) else K(2)
            if k == 3:
                return K(2) if (x % 4) else K(1)
            if k == 4:
                return K(1) if (x % 3) else I(2)
            return I(1) if (x + k) % 3 else K(0)
        if s == 'S':
            # the near bank: the floor's edge seen from above, a dark lip where it drops into the ink
            return K(0) if g < 2 else I(0)
        if s == 'W':
            return K(2) if g < 2 else K(0)
        return K(1) if g < 2 else I(0)


# =====================================================================================  overlays
def overlays():
    """16x16 transparent decal tiles: flowers, pebbles, leaves. Returns list of (id, Canvas)."""
    out = []
    flower_sets = [
        ('flowers_white', WHITE, C('gold', 4), C('stone_cool', 5)),
        ('flowers_yellow', C('gold', 4), C('gold', 2), C('gold', 3)),
        ('flowers_blue', C('roof_blue', 4), C('magic_cyan', 4), C('roof_blue', 3)),
        ('flowers_violet', C('cloth_purple', 5), C('gold', 4), C('cloth_purple', 4)),
        ('flowers_pink', C('blossom', 3), C('gold', 4), C('blossom', 2)),
        ('flowers_red', C('roof_red', 4), C('gold', 4), C('roof_red', 3)),
    ]
    FL = ['.p.',
          'pcp',
          '.s.']
    for k, (fid, petal, center, shade) in enumerate(flower_sets):
        cv = Canvas(16, 16)
        pts = scatter(1000 + k, 5, 4, lo=1, hi=13, torus=False)
        stamp_tuft = scatter(1050 + k, 1, 6, lo=2, hi=11, torus=False)
        for (tx, ty) in stamp_tuft:
            cv.stamp(TUFT_SMALL, tx, ty, {'d': G(2), 'l': G(4)})
        for i, (x, y) in enumerate(pts):
            # leaf pair under each bloom
            cv.put(x - 1, y + 2, C('grass', 2))
            cv.put(x + 3, y + 2, C('grass', 2))
            cv.put(x + 1, y + 3, C('grass', 1))
            cv.stamp(FL, x, y, {'p': petal, 'c': center, 's': shade})
            cv.put(x + 1, y + 3, SH(70))
        out.append((fid, cv))
    # hydrangea bushes (Willowmere key-art flowers): leafy mound + three floret heads
    for k, ramp in enumerate(('roof_blue', 'cloth_purple')):
        cv = Canvas(16, 16)
        F = lambda i: C('foliage_dark', i)
        # leaves
        for y in range(6, 15):
            for x in range(1, 15):
                dx, dy = (x + 0.5 - 8) / 7, (y + 0.5 - 10.5) / 4.6
                if dx * dx + dy * dy <= 1:
                    n = h32(x, y, 1100 + k) % 5
                    c = F(2) if n else F(3)
                    if dy > 0.45:
                        c = F(1)
                    if n == 0 and dy < 0:
                        c = G(3)
                    cv.set(x, y, c)
        # floret heads
        heads = [(4, 5), (10, 4), (7, 8)] if k == 0 else [(5, 4), (11, 6), (7, 8)]
        for hi, (hx, hy) in enumerate(heads):
            for y in range(hy - 3, hy + 3):
                for x in range(hx - 3, hx + 3):
                    dx, dy = (x + 0.5 - hx) / 3.0, (y + 0.5 - hy) / 2.7
                    d = dx * dx + dy * dy
                    if d > 1:
                        continue
                    c = C(ramp, 3)
                    if (x + y * 2) % 3 == 0:
                        c = C(ramp, 4)
                    if dx + dy < -0.6:
                        c = C(ramp, 4) if (x + y) % 2 else (C('magic_cyan', 4) if ramp == 'roof_blue' else C('cloth_purple', 5))
                    if dx + dy > 0.7 or d > 0.8 and dy > 0:
                        c = C(ramp, 2)
                    cv.set(x, y, c)
        for x in range(2, 15):
            cv.put(x + 1, 15, SH(80))
        out.append(('hydrangea_' + ('blue' if k == 0 else 'violet'), cv))
    # pebbles
    for k in range(3):
        cv = Canvas(16, 16)
        for i, (x, y) in enumerate(scatter(1200 + k, 3 + k, 4, lo=2, hi=13, torus=False)):
            big = (i + k) % 2 == 0
            rows = ['lm', 'md'] if big else ['l', 'd']
            cv.stamp(rows, x, y, {'l': C('stone_warm', 5), 'm': C('stone_warm', 3), 'd': C('stone_warm', 2)})
            cv.put(x + (2 if big else 1), y + (1 if big else 1), SH(80))
            cv.put(x, y + (2 if big else 2), SH(60))
        out.append(('pebbles_%d' % k, cv))
    # fallen leaves
    cv = Canvas(16, 16)
    for i, (x, y) in enumerate(scatter(1300, 5, 4, lo=1, hi=14, torus=False)):
        col = [C('gold', 3), C('roof_red', 4), C('gold', 2)][i % 3]
        cv.put(x, y, col)
        cv.put(x + 1, y, col)
        cv.put(x + 1, y + 1, C('roof_red', 2))
    out.append(('leaves', cv))
    # grass tuft decals (for breaking up paths and plazas)
    for k in range(2):
        cv = Canvas(16, 16)
        for (x, y) in scatter(1400 + k, 2, 6, lo=2, hi=11, torus=False):
            cv.stamp(TUFT if k == 0 else TUFT_SMALL, x, y, {'d': G(2), 'l': G(4)})
            cv.put(x + 1, y + 4 if k == 0 else y + 3, SH(60))
        out.append(('tuft_%d' % k, cv))
    return out


TERRAINS_A2 = [Grass(), TallGrass(), Dirt(), Plaza(), Sand(), Shallow(), StoneFloor(), WoodFloor(),
               Carpet('carpet_red', 'roof_red'), Carpet('carpet_blue', 'cloth_blue'), Pit(), Moss()]
TERRAINS_A1 = [Water(), Ink()]

# draw order, low -> high. Fill terrains sit on lower ones; holes (water, ink, pit) are highest.
TERRAIN_ORDER = ['archive_floor', 'catalog_wood', 'gallery_stone', 'stacks_wood', 'stone_floor', 'wood_floor', 'dirt', 'sand', 'grass', 'moss', 'tallgrass', 'plaza',
                 'carpet_red', 'carpet_blue', 'water', 'shallow', 'ink', 'pit']

SHEET_W = 256


def build():
    """Returns (Canvas sheet, meta dict)."""
    rows_a2 = (len(TERRAINS_A2) + 7) // 8
    var_terr = [t for t in TERRAINS_A2 if t.nvariants > 1]
    var_rows = 4
    ovl = overlays()
    ovl_rows = (len(ovl) + 15) // 16
    H = rows_a2 * 48 + 48 + var_rows * 16 + ovl_rows * 16
    sheet = Canvas(SHEET_W, H + 64)
    meta = {'terrains': {}, 'overlays': {}}
    for i, t in enumerate(TERRAINS_A2):
        x, y = (i % 8) * 32, (i // 8) * 48
        sheet.paste(t.block(), x, y)
        meta['terrains'][t.id] = {'sheet': 'terrain.png', 'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A2',
                                  'kind': t.kind, 'collision': t.collision,
                                  'order': TERRAIN_ORDER.index(t.id), 'variants': []}
    ya1 = rows_a2 * 48
    for i, t in enumerate(TERRAINS_A1):
        x0 = i * 96
        for fr in range(t.frames):
            sheet.paste(t.block(fr), x0 + fr * 32, ya1)
        meta['terrains'][t.id] = {'sheet': 'terrain.png', 'x': x0, 'y': ya1, 'w': 32, 'h': 48, 'autotile': 'A1',
                                  'kind': t.kind, 'collision': t.collision, 'order': TERRAIN_ORDER.index(t.id),
                                  'anim': {'frames': [0, 1, 2, 1], 'frameDx': 32, 'ms': 220}, 'variants': []}
    yv = ya1 + 48
    x, y = 0, yv
    for t in var_terr:
        wpx = t.nvariants * 16
        if x + wpx > SHEET_W:
            x, y = 0, y + 16
        for v in range(t.nvariants):
            sheet.paste(t.variant_tile(v), x + v * 16, y)
            meta['terrains'][t.id]['variants'].append([x + v * 16, y])
        meta['terrains'][t.id]['variantWeights'] = list(getattr(t, 'weights', [4] + [2] * (t.nvariants - 1)))
        x += wpx
    var_rows = (y - yv) // 16 + 1
    yo = yv + var_rows * 16
    for i, (oid, cv) in enumerate(ovl):
        x, y = (i % 16) * 16, yo + (i // 16) * 16
        sheet.paste(cv, x, y)
        meta['overlays'][oid] = {'sheet': 'terrain.png', 'x': x, 'y': y, 'w': 16, 'h': 16, 'collision': 'none'}
    used = yo + ovl_rows * 16
    return sheet.crop(0, 0, SHEET_W, used), meta


if __name__ == '__main__':
    import os
    from pxlib import TILES_DIR, OUT_DIR
    sheet, meta = build()
    sheet.save(os.path.join(TILES_DIR, 'terrain.png'))
    sheet.save(os.path.join(OUT_DIR, 'terrain_x3.png'), 3)
    print('terrain.png', sheet.w, sheet.h, len(meta['terrains']), 'terrains', len(meta['overlays']), 'overlays')
