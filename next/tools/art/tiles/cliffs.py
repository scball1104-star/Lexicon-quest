"""Cliffs -> assets/tiles/cliffs.png: 3/4-view cliff (grass top autotile + rock face autotile), stairs cut into
the face, and one-way ledges."""
from pxlib import Canvas, C, SH, DARK, rnd, h32, profile1d
from autotile import EdgeSpec, build_a2, full_nb
from terrain import Terrain, Grass, G
from walls import FaceStyle

S = lambda i: C('stone_warm', i)
E = lambda i: C('earth', i)


class CliffTop(Terrain):
    id = 'cliff_top'
    nvariants = 6

    def __init__(self):
        super().__init__()
        self.grass = Grass()
        self.weights = self.grass.weights
        gp = {'N': profile1d(1501, amp=0.6, spikes=3, spike_amp=1.2),
              'S': profile1d(1502, amp=0.5, spikes=4, spike_amp=1.6),
              'W': profile1d(1503, amp=0.5, spikes=2, spike_amp=1.0),
              'E': profile1d(1504, amp=0.5, spikes=2, spike_amp=1.0)}
        rp = {'N': profile1d(1511, amp=0.4), 'S': [0.0] * 16,
              'W': profile1d(1513, amp=0.5), 'E': profile1d(1514, amp=0.5)}
        self.specs = {
            'grass': EdgeSpec({'N': 3.6, 'S': 3.0, 'W': 6.5, 'E': 6.5}, r=4.0, rr=1.5, prof=gp),
            'rock': EdgeSpec({'N': 0.6, 'S': -0.5, 'W': 0.4, 'E': 0.4}, r=2.5, rr=1.0, prof=rp),
        }

    def make_texture(self, frame, variant):
        return self.grass.make_texture(frame, variant)

    def pixel(self, c, x, y):
        if c.i('grass', x, y):
            col = self.tex(c, x, y)
            if not c.i('grass', x, y + 1):
                return G(1)
            if not c.i('grass', x, y - 1):
                return G(4)
            if not c.i('grass', x + 1, y):
                return G(2)
            if not c.i('grass', x - 1, y):
                return G(4) if y % 2 == 0 else col
            return col
        if not c.i('rock', x, y):
            return None
        side = c.side('grass', x, y)
        d = c.f('rock', x, y)
        under_grass = c.i('grass', x, y - 1)
        if side == 'S':
            # lit lip of the cliff edge, grass blades hanging over it
            if under_grass:
                return G(0)
            if c.i('grass', x, y - 2) and (x + y) % 2 == 0:
                return G(1)
            return S(5) if d < 1.2 else S(4)
        if d < 1:
            return S(1) if side != 'E' else S(0)
        rock = ROCK_TEX[y % 16][x % 16]
        if side == 'W':
            if d < 2:
                return S(4)
            return rock
        if side == 'E':
            if d < 2:
                return S(1)
            return {S(4): S(3), S(3): S(2), S(2): S(1), S(1): S(1)}.get(rock, rock)
        # north lip / corners
        if under_grass:
            return G(1)
        return S(4) if d < 2 else S(3)


def bulge_rock(seed, n, rx=(3.0, 4.5), ry=(4.0, 6.5), ramp='stone_warm', lo=1, tries=300):
    """Faceted rock face texture on the 16 torus: overlapping rock bulges lit from the top-left."""
    import math
    R = lambda i: C(ramp, i)
    bul = []
    k = 0
    while len(bul) < n and k < tries:
        cx = rnd(seed, k, 1) * 16
        cy = rnd(seed, k, 2) * 16
        k += 1
        if any(min(abs(cx - bx), 16 - abs(cx - bx)) < 3.2 and min(abs(cy - by), 16 - abs(cy - by)) < 3.6
               for (bx, by, _, _, _) in bul):
            continue
        bul.append((cx, cy, rx[0] + rnd(seed, k, 3) * (rx[1] - rx[0]), ry[0] + rnd(seed, k, 4) * (ry[1] - ry[0]),
                    rnd(seed, k, 5)))
    L = (-0.5, -0.62, 0.6)
    ln = math.sqrt(sum(v * v for v in L))
    L = tuple(v / ln for v in L)
    t = [[R(lo)] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            best, br, bu = None, 9, None
            for (cx, cy, a, b, tone) in bul:
                dx = x + 0.5 - cx
                dx = (dx + 8) % 16 - 8
                dy = y + 0.5 - cy
                dy = (dy + 8) % 16 - 8
                r2 = (dx / a) ** 2 + (dy / b) ** 2
                # front-most = the one whose surface is highest (largest z)
                if r2 < 1:
                    z = math.sqrt(1 - r2) * b + cy * 0.0
                    if best is None or z > br:
                        best, br, bu = (cx, cy, a, b, tone), z, (dx / a, dy / b, math.sqrt(1 - r2))
            if best is None:
                t[y][x] = R(lo) if (x * 7 + y * 3) % 5 else R(lo - 1 if lo > 0 else 0)
                continue
            nx, ny, nz = bu
            # facet: quantise the normal so faces read flat, not spherical
            nx, ny = round(nx * 2) / 2, round(ny * 2) / 2
            nz = math.sqrt(max(0.05, 1 - min(0.95, nx * nx + ny * ny)))
            inten = nx * L[0] + ny * L[1] + nz * L[2]
            if inten > 0.85:
                col = R(4)
            elif inten > 0.62:
                col = R(3)
            elif inten > 0.3:
                col = R(2)
            else:
                col = R(1)
            t[y][x] = col
    return t


ROCK_TEX = None


class CliffFace(FaceStyle):
    def __init__(self):
        self.tex = bulge_rock(1611, 7)

    def pixel(self, x, y, left, top, right, bottom):
        col = self.tex[y][x]
        # vertical ambient: darker under the overhang
        if not top:
            if y == 0:
                return DARK
            if y == 1:
                return C('shadow', 1)
            if y in (2, 3) and col in (S(4), S(3)):
                col = S(2)
            # hanging blades and roots
            hang = h32(x, 1701) % 7
            if hang < 2 and y <= 2 + hang:
                return G(1) if y > 1 else G(2)
        if not bottom:
            if y >= 13:
                n = h32(x, 1702) % 5
                if y == 15 and n < 4:
                    return G(2) if n % 2 else G(1)
                if y == 14 and n < 2:
                    return G(3)
                if y == 15:
                    return S(0)
        if not left:
            if x == 0:
                return S(1)
            if x == 1:
                return S(4) if col != S(0) else S(2)
            if x in (2, 3) and col == S(0):
                return S(2)
        if not right:
            if x == 15:
                return DARK if not top and y < 2 else S(0)
            if x == 14:
                return S(1)
            if x in (12, 13) and col in (S(4), S(3)):
                return S(2)
        return col


def stairs_tile(kind, half=None):
    """Stone stairs cut into a cliff face. kind: top/mid/bot. half: None (1 wide), 'l' or 'r' (2 wide)."""
    cv = Canvas(16, 16)
    for y in range(16):
        k = y % 4
        for x in range(16):
            if k == 0:
                col = S(5)
            elif k == 1:
                col = S(4)
            elif k == 2:
                col = S(3)
            else:
                col = S(1)
            if (x + y * 3) % 11 == 0 and k in (1, 2):
                col = S(3) if k == 1 else S(2)
            cv.set(x, y, col)
    # side walls of the cut
    lw = half in (None, 'l')
    rw = half in (None, 'r')
    for y in range(16):
        if lw:
            cv.set(0, y, S(0))
            cv.set(1, y, S(2))
            cv.set(2, y, S(1) if y % 4 == 3 else S(3))
        if rw:
            cv.set(15, y, S(0))
            cv.set(14, y, S(1))
            cv.set(13, y, S(1))
    if kind == 'top':
        for x in range(16):
            cv.set(x, 0, DARK if (x < 2 and lw) or (x > 13 and rw) else S(2))
    if kind == 'bot':
        for x in range(16):
            if (lw and x < 3) or (rw and x > 12):
                cv.set(x, 15, G(1))
                if h32(x, 1801) % 2:
                    cv.set(x, 14, G(2))
    return cv


def ledge_tile(direction, part):
    """One-way ledge drawn over grass. direction s/e/w; part a/m/b = start, middle, end along the line.
    South ledge: grass lip, lit rock edge, 5 px earth face, shadow on the ground below."""
    cv = Canvas(16, 16)
    prof = profile1d(1900, amp=0.5, spikes=3, spike_amp=1.0)
    if direction == 's':
        for x in range(16):
            if (part == 'a' and x < 2) or (part == 'b' and x > 13):
                continue
            lip = 8 + int(round(prof[x]))
            cv.set(x, lip - 1, G(1))
            cv.set(x, lip, S(4) if (x % 5) else S(3))
            for y in range(lip + 1, 14):
                k = y - lip
                c = E(3) if k == 1 else (E(2) if (x + y) % 6 else E(1))
                if k >= 4:
                    c = E(1)
                cv.set(x, y, c)
            cv.set(x, 14, E(0))
            cv.put(x, 15, SH(90))
            if h32(x, 1901) % 4 == 0:
                cv.set(x, lip - 2, G(2))
        if part == 'a':
            for y in range(7, 15):
                cv.set(2, y, E(4) if y < 10 else E(3))
                cv.set(1, y, G(1)) if y < 13 else None
        if part == 'b':
            for y in range(7, 15):
                cv.set(13, y, E(0))
                cv.put(14, y, SH(70))
        return cv
    for y in range(16):
        if (part == 'a' and y < 2) or (part == 'b' and y > 13):
            continue
        lip = 9 + int(round(prof[y]))
        if direction == 'e':
            cv.set(lip - 1, y, G(1))
            cv.set(lip, y, E(3))
            for x in range(lip + 1, 14):
                cv.set(x, y, E(2) if (x + y) % 4 else E(1))
            cv.set(14, y, E(0))
            cv.put(15, y, SH(80))
        else:
            xl = 15 - lip
            cv.set(xl + 1, y, G(4))
            cv.set(xl, y, S(4))
            for x in range(2, xl):
                cv.set(x, y, E(3) if (x + y) % 4 else E(2))
            cv.set(1, y, E(1))
            cv.put(0, y, SH(60))
    return cv


def build():
    global ROCK_TEX
    ROCK_TEX = bulge_rock(1612, 7)
    sheet = Canvas(256, 96)
    meta = {'terrains': {}, 'walls': {}, 'tiles': {}}
    top = CliffTop()
    sheet.paste(top.block(), 0, 0)
    sheet.paste(CliffFace().block(), 32, 0)
    variants = []
    for v in range(top.nvariants):
        sheet.paste(top.variant_tile(v), 64 + v * 16, 0)
        variants.append([64 + v * 16, 0])
    meta['walls']['cliff'] = {'sheet': 'cliffs.png', 'top': [0, 0], 'face': [32, 0], 'collision': 'solid',
                              'topVariants': variants, 'topVariantWeights': top.weights,
                              'note': 'legend ids cliff_top / cliff_face; faces sit directly below the top'}
    x, y = 0, 48
    for kind in ('top', 'mid', 'bot'):
        for half in (None, 'l', 'r'):
            tid = 'cliff_stairs_%s' % kind if half is None else 'cliff_stairs2_%s_%s' % (kind, half)
            sheet.paste(stairs_tile(kind, half), x, y)
            meta['tiles'][tid] = {'sheet': 'cliffs.png', 'x': x, 'y': y, 'w': 16, 'h': 16, 'collision': 'none'}
            x += 16
    x, y = 0, 64
    for d in ('s', 'e', 'w'):
        for part in ('a', 'm', 'b'):
            tid = 'ledge_%s_%s' % (d, part)
            sheet.paste(ledge_tile(d, part), x, y)
            meta['tiles'][tid] = {'sheet': 'cliffs.png', 'x': x, 'y': y, 'w': 16, 'h': 16,
                                  'collision': 'ledge_' + d}
            x += 16
    return sheet.crop(0, 0, 256, 80), meta
