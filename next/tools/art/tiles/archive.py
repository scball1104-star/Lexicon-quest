"""Rootbound Archive dungeon kit -> assets/tiles/archive.png.

Wall system 'archive' (legend archive_top / archive_face): a dressed stone cap around a flat #14101e void
(the darkest palette colour: beyond the walls is black, Lufia style), and a two-tone violet-grey stone face
below it (lighter upper course, darker lower course on a dark plinth) with roots hanging over it.
Wall system 'archive_roots' (archive_roots_top / archive_roots_face) keeps the old root-choked earth fill
under the same cap, for maps that want a visible earth mass. Floor 'archive_floor' (A2): warm polished flags
with brass inlay. Everything else is tiles (16 px grid) or objects (multi-tile, anchor + footprint).
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, profile1d
from autotile import EdgeSpec, build_a2, full_nb
from terrain import Terrain, scatter, blank, stamp_in, G
from walls import FaceStyle
from kit import Sheet, cut
import bld

K = lambda i: C('stone_cool', i)
S = lambda i: C('stone_warm', i)
WD = lambda i: C('wood', i)
E = lambda i: C('earth', i)
GOLD = lambda i: C('gold', i)
CY = lambda i: C('magic_cyan', i)
VI = lambda i: C('magic_violet', i)
INK = lambda i: C('ink', i)


# ====================================================================== wall top (A2)
class ArchiveTop(Terrain):
    """Stone cap rim around a flat void (CRITIQUE_1 C6: rooms read as carved space, black beyond)."""
    id = 'archive_top'

    def __init__(self):
        super().__init__()
        rp = {s: profile1d(2100 + i, amp=0.4) for i, s in enumerate('NSWE')}
        self.specs = {
            'fill': EdgeSpec({'N': 3.0, 'S': 3.0, 'W': 3.0, 'E': 3.0}, r=2.0, rr=1.0, prof=rp),
            'rim': EdgeSpec({'N': 0.0, 'S': -0.5, 'W': 0.0, 'E': 0.0}, r=1.0, rr=0.5),
        }

    def make_texture(self, frame, variant):
        return blank(DARK)

    def pixel(self, c, x, y):
        if c.i('fill', x, y):
            return self.tex(c, x, y)
        if not c.i('rim', x, y):
            return None
        d = c.f('rim', x, y)
        side = c.side('fill', x, y)
        if d < 1:
            return K(0)
        if side == 'S':
            return K(4) if d < 2 else K(3)
        if side == 'N':
            return K(2)
        if side == 'W':
            return K(3) if d < 2 else K(2)
        return K(2) if d < 2 else K(1)


class ArchiveRootsTop(ArchiveTop):
    """The old root-choked earth fill (hatched brown), kept under its own wall id."""
    id = 'archive_roots_top'

    def make_texture(self, frame, variant):
        t = blank(E(0))
        for y in range(16):
            for x in range(16):
                if rnd(x // 3, y // 3, 2111) < 0.3 and (x + y) % 2 == 0:
                    t[y][x] = DARK
        # two thick root strands per tile (periodic)
        for k, (x0, y0) in enumerate(((0, 3), (5, 11))):
            x, y = x0, y0
            for step in range(16):
                t[y % 16][x % 16] = WD(1)
                t[(y + 1) % 16][x % 16] = DARK
                if step % 5 == 2:
                    t[(y - 1) % 16][x % 16] = WD(2)
                x += 1
                if h32(k, step, 2113) % 4 == 0:
                    y += 1 if h32(k, step, 2114) % 2 else -1
        return t

    def pixel(self, c, x, y):
        if c.i('fill', x, y):
            return self.tex(c, x, y)
        if not c.i('rim', x, y):
            return None
        d = c.f('rim', x, y)
        side = c.side('fill', x, y)
        if d < 1:
            return K(0)
        if side == 'S':
            return K(4) if d < 2 else K(3)
        if side == 'N':
            return K(2)
        if side == 'W':
            return K(3) if d < 2 else K(2)
        return K(2) if d < 2 else K(1)


# ====================================================================== wall face (A4 face)
FACE_COURSES = [(0, 8, [(0, 7), (7, 9)]), (8, 8, [(4, 8), (12, 8)])]


class ArchiveFace(FaceStyle):
    def __init__(self):
        t = [[K(1)] * 16 for _ in range(16)]
        for ri, (y0, h, row) in enumerate(FACE_COURSES):
            for si, (x0, w) in enumerate(row):
                tone = rnd(ri, si, 2201)
                base = K(3) if tone < 0.6 else K(2)
                for yy in range(h - 1):
                    for xx in range(w - 1):
                        X, Y = (x0 + xx) % 16, (y0 + yy) % 16
                        col = base
                        if yy == 0:
                            col = K(4) if base == K(3) else K(3)
                        elif xx == 0 and yy < h - 3:
                            col = K(4) if base == K(3) else K(3)
                        elif yy == h - 2 or xx == w - 2:
                            col = K(2) if base == K(3) else K(1)
                        elif rnd(X, Y, 2202) < 0.06:
                            col = K(2)
                        t[Y][X] = col
        self.tex = t
        # hanging roots: per column length (periodic 16)
        self.roots = {3: 9, 4: 7, 11: 4}

    # lower course: every tone one step darker (depth: the wall falls away into the floor's shadow)
    DARKER = None

    def darker(self, col):
        if ArchiveFace.DARKER is None:
            ArchiveFace.DARKER = {K(4): K(3), K(3): K(2), K(2): K(1), K(1): K(0), K(0): DARK}
        return ArchiveFace.DARKER.get(col, col)

    def pixel(self, x, y, left, top, right, bottom):
        col = self.tex[y][x]
        # which course is this row in? upper (lit, under the cap), lower (dark, on the plinth) or middle.
        lower = (not bottom) and (top or y >= 8)
        if lower:
            col = self.darker(col)
        if not top:
            if y == 0:
                return DARK
            if y == 1:
                return INK(1)
            if y == 2 and col in (K(4), K(3)):
                col = K(2)
            L = self.roots.get(x)
            if L and y <= L:
                return WD(3) if (x == 3 and y % 4 == 1) else WD(2)
            if (x - 1) in self.roots and y <= self.roots[x - 1] - 1:
                return WD(1)
            if x == 5 and y == 8:
                return WD(1)
        if not bottom:
            # plinth: a dark foot course and the floor shadow line under it
            if y == 15:
                return DARK
            if y == 14:
                return K(0)
            if y == 13:
                n = h32(x, 2204) % 5
                return G(1) if n == 0 else K(1)
            if y == 12 and h32(x, 2205) % 6 == 0:
                return G(2)
            if y == 12 and col == K(0):
                return K(1)
        if not left:
            if x == 0:
                return K(0)
            if x == 1:
                return K(3) if lower else K(4)
        if not right:
            if x == 15:
                return K(0)
            if x == 14:
                return K(0) if lower else K(1)
        return col


# ====================================================================== archive floor (A2)
class ArchiveFloor(Terrain):
    id = 'archive_floor'
    nvariants = 8
    weights = [10, 2, 2, 1, 1, 2, 1, 1]

    def __init__(self):
        super().__init__()
        self.specs = {
            'top': EdgeSpec({'N': 1.0, 'S': 2.0, 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb'),
            'lip': EdgeSpec({'N': 1.0, 'S': 0.0, 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb'),
        }

    def make_texture(self, frame, variant):
        t = blank(S(2))
        warm_q = {1: (1, 0), 2: (0, 1), 5: (1, 1)}.get(variant)
        for qy in range(2):
            for qx in range(2):
                warm = warm_q == (qx, qy)
                base = C('path', 2) if warm else S(3)
                hi = C('path', 3) if warm else S(4)
                for yy in range(7):
                    for xx in range(7):
                        X, Y = qx * 8 + xx, qy * 8 + yy
                        c = base
                        if yy == 0 and xx < 5:
                            c = hi
                        elif xx == 0 and yy < 3:
                            c = hi
                        elif rnd(X, Y, 2301) < 0.035:
                            c = S(2)
                        t[Y][X] = c
        t[7][7] = S(1)
        t[15][15] = S(1)
        t[15][7] = GOLD(1)
        t[7][15] = GOLD(1)
        if variant == 3:
            for (x, y) in ((3, 2), (2, 3), (4, 3), (3, 4)):
                t[y][x] = GOLD(2)
            t[3][3] = GOLD(3)
        elif variant == 4:
            for (x, y) in ((9, 10), (10, 11), (11, 11), (12, 12)):
                t[y][x] = S(2)
        elif variant == 6:
            for (x, y) in ((10, 2), (11, 2), (12, 3), (10, 3), (11, 4), (9, 3), (13, 2)):
                t[y][x] = INK(2)
            t[3][11] = INK(1)
        elif variant == 7:
            for (x, y) in ((1, 13), (2, 12), (3, 13), (13, 1), (14, 2)):
                t[y][x] = WD(2)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            if c.f('top', x, y) < 1:
                return S(1)
            return self.tex(c, x, y)
        if c.i('lip', x, y):
            return S(1) if c.i('top', x, y - 1) else SH(90)
        return None


# ====================================================================== furniture and props
SPINES = ['roof_red', 'cloth_blue', 'roof_green', 'gold', 'cloth_purple', 'wood', 'roof_red', 'magic_cyan']


def books_row(cv, x0, x1, y_top, h, seed=0, lean=True):
    """A row of book spines standing on a shelf whose surface is at y_top + h."""
    x = x0
    k = 0
    while x < x1:
        w = 2 if h32(seed, k, 1) % 3 else 3
        bh = h - (h32(seed, k, 2) % 3)
        ramp = SPINES[h32(seed, k, 3) % len(SPINES)]
        if h32(seed, k, 4) % 9 == 0:
            x += 1
            k += 1
            continue
        for xx in range(w):
            if x + xx >= x1:
                break
            for yy in range(bh):
                Y = y_top + h - bh + yy
                c = C(ramp, 3) if xx == 0 else C(ramp, 2)
                if yy == 0:
                    c = C(ramp, 4)
                if yy == bh // 2 and w == 3:
                    c = GOLD(3)
                cv.set(x + xx, Y, c)
        x += w
        k += 1


def bookshelf(w_tiles=2, h_px=40, seed=0, ladder=False, moving=False):
    """Freestanding bookshelf seen in 3/4: top surface strip, carved frame, 3 shelves of books."""
    W = w_tiles * 16
    cv = Canvas(W, 48)
    y0 = 48 - h_px
    # top surface (we look down on it)
    for x in range(1, W - 1):
        cv.set(x, y0, WD(1))
        cv.set(x, y0 + 1, WD(4))
        cv.set(x, y0 + 2, WD(3))
        cv.set(x, y0 + 3, WD(1))
    # carcass
    for y in range(y0 + 4, 46):
        for x in range(1, W - 1):
            cv.set(x, y, C('shadow', 1))
        cv.set(1, y, WD(1)); cv.set(2, y, WD(4)); cv.set(3, y, WD(2))
        cv.set(W - 2, y, WD(1)); cv.set(W - 3, y, WD(2)); cv.set(W - 4, y, WD(2))
    shelves = [y0 + 4 + i * ((46 - y0 - 4) // 3) for i in range(4)]
    for i, sy in enumerate(shelves):
        for x in range(1, W - 1):
            cv.set(x, sy, WD(3) if i < 3 else WD(2))
            cv.set(x, sy + 1, WD(1))
        if i < 3:
            books_row(cv, 4, W - 4, sy + 2, shelves[i + 1] - sy - 2, seed=seed * 7 + i)
    for x in range(1, W - 1):
        cv.set(x, 46, WD(1))
        cv.set(x, 45, WD(2))
    # carved crest
    cv.set(W // 2 - 1, y0 + 1, GOLD(3))
    cv.set(W // 2, y0 + 1, GOLD(4))
    if ladder:
        for y in range(y0 + 2, 46):
            cv.set(W - 9, y, WD(4)); cv.set(W - 5, y, WD(2))
            if y % 4 == 0:
                for x in range(W - 9, W - 4):
                    cv.set(x, y, WD(3))
    if moving:
        # rune plate and rollers: reads as "this one slides"
        for x in range(4, W - 4):
            cv.set(x, 46, K(1))
            cv.set(x, 47, K(0))
        for x in (5, W - 7):
            cv.set(x, 46, M_(2)); cv.set(x + 1, 46, M_(3)); cv.set(x, 47, M_(1)); cv.set(x + 1, 47, M_(1))
        cx = W // 2
        for (dx, dy) in ((0, -2), (-1, -1), (1, -1), (-2, 0), (2, 0), (-1, 1), (1, 1), (0, 2), (0, 0)):
            cv.set(cx + dx, y0 + 12 + dy, CY(3) if (dx, dy) != (0, 0) else CY(4))
    else:
        for x in range(2, W - 2):
            cv.put(x + 1, 47, SH(90))
    for y in range(y0 + 2, 47):
        cv.put(W - 1, y, SH(70))
    return cv


def M_(i):
    return C('metal', i)


def wall_shelf(part):
    """Bookshelf built into a 2-tile wall face: parts l, m, r (16 x 32 each)."""
    cv = Canvas(16, 32)
    for y in range(32):
        for x in range(16):
            cv.set(x, y, C('shadow', 1))
    for sy in (2, 12, 22):
        for x in range(16):
            cv.set(x, sy, WD(3)); cv.set(x, sy + 1, WD(1))
        books_row(cv, 0 if part != 'l' else 3, 16 if part != 'r' else 13, sy + 2, 8, seed=sy + ord(part))
    for x in range(16):
        cv.set(x, 0, WD(1)); cv.set(x, 1, WD(4))
        cv.set(x, 31, WD(1)); cv.set(x, 30, WD(2))
        cv.put(x, 4, SH(60))
    if part == 'l':
        for y in range(32):
            cv.set(0, y, WD(1)); cv.set(1, y, WD(4)); cv.set(2, y, WD(2))
    if part == 'r':
        for y in range(32):
            cv.set(15, y, WD(1)); cv.set(14, y, WD(2)); cv.set(13, y, WD(2))
    return cv


def reading_table(w_tiles=2):
    W = w_tiles * 16
    cv = Canvas(W, 32)
    # table top (3/4: top surface + front apron)
    for y in range(8, 18):
        for x in range(1, W - 1):
            c = WD(3) if y > 8 else WD(4)
            if (x + y * 3) % 11 == 0:
                c = WD(2)
            cv.set(x, y, c)
    for x in range(1, W - 1):
        cv.set(x, 7, WD(1))
        cv.set(x, 18, WD(2))
        cv.set(x, 19, WD(1))
        cv.set(x, 20, WD(1))
    for y in range(7, 21):
        cv.set(0, y, WD(1)); cv.set(W - 1, y, WD(1))
    for lx in (2, W - 5):
        for y in range(21, 30):
            cv.set(lx, y, WD(1)); cv.set(lx + 1, y, WD(3)); cv.set(lx + 2, y, WD(1))
    # open book
    bx = W // 2 - 7
    cv.stamp(['.pppppp.pppppp.',
              'pPPPPPPpPPPPPPp',
              'pPllllPpPllllPp',
              'pPPPPPPpPPllPPp',
              'pPllPPPpPPPPPPp',
              'ppppppppppppppp'], bx, 9, {'p': S(3), 'P': S(5), 'l': K(2)})
    cv.set(bx + 7, 9, C('roof_red', 3))
    cv.set(bx + 7, 15, C('roof_red', 3))
    # candle
    cx = 4
    cv.stamp(['.f.', 'fyf', '.y.', '.w.', '.w.', 'mmm'], cx, 1, {'f': C('fire', 3), 'y': GOLD(5), 'w': S(5),
                                                                'm': GOLD(2)})
    for x in range(2, W - 1):
        cv.put(x + 1, 30, SH(80))
        cv.put(x + 1, 31, SH(40))
    return cv


def candelabra(frame=0):
    cv = Canvas(16, 32)
    for y in range(12, 30):
        cv.set(7, y, GOLD(2)); cv.set(8, y, GOLD(3))
    for x in range(5, 11):
        cv.set(x, 29, GOLD(2)); cv.set(x, 30, GOLD(1))
    for x in range(2, 14):
        cv.set(x, 12, GOLD(3))
    for x in (2, 13):
        cv.set(x, 11, GOLD(3)); cv.set(x, 10, GOLD(2))
    for x in (2, 7, 13):
        cv.set(x if x != 7 else 7, 9, S(5))
        cv.set(x if x != 7 else 8, 8, S(5)) if x == 7 else None
    flames = [['.y.', 'yfy', '.f.'], ['y..', 'yfy', '.f.'], ['..y', 'yfy', '.f.']]
    for k, fx in enumerate((1, 6, 12)):
        f = flames[(frame + k) % 3]
        cv.stamp(f, fx, 5 if fx != 6 else 4, {'y': GOLD(5), 'f': C('fire', 3)})
        cv.set(fx + 1, 8 if fx != 6 else 7, S(5))
    for x in range(5, 12):
        cv.put(x + 1, 31, SH(80))
    return cv


def brazier(frame=0, lit=True):
    cv = Canvas(16, 32)
    # bowl on a tripod
    for y in range(20, 30):
        cv.set(4 + (y - 20) // 3, y, M_(1))
        cv.set(11 - (y - 20) // 3, y, M_(1))
        cv.set(7, y, M_(0)); cv.set(8, y, M_(1))
    for x in range(2, 14):
        cv.set(x, 16, M_(2) if x < 8 else M_(1))
        cv.set(x, 17, M_(1))
        cv.set(x, 18, M_(0))
    for x in range(3, 13):
        cv.set(x, 19, M_(0))
    for x in range(3, 13):
        cv.set(x, 15, C('shadow', 1))
    if lit:
        shapes = [
            ['.....f.....', '....fyf....', '...fyyf.f..', '..fyWyyfyf.', '.fyyWWyyyf.', '.ffyyyyyff.', 'rrfffffffrr'],
            ['....f......', '...fyf..f..', '..fyyf.fyf.', '..fyWyyyyf.', '.fyyWWyyyf.', '.ffyyyyyff.', 'rrfffffffrr'],
            ['......f....', '..f..fyf...', '.fyf.fyyf..', '.fyyyWyyf..', '.fyyWWyyyf.', '.ffyyyyyff.', 'rrfffffffrr'],
        ]
        cv.stamp(shapes[frame % 3], 2, 8, {'f': C('fire', 2), 'y': C('fire', 4), 'W': C('fire', 5),
                                            'r': C('fire', 1)})
    else:
        for x in range(4, 12):
            cv.set(x, 14, K(1) if x % 2 else K(2))
            cv.set(x, 15, K(1))
    for x in range(4, 13):
        cv.put(x + 1, 30, SH(80))
    return cv


def roots_decal(k):
    cv = Canvas(16, 16)
    x, y = 0, 3 + k * 3
    for step in range(22):
        cv.set(x, y, WD(2) if step % 3 else WD(3))
        cv.set(x, y + 1, WD(1))
        if h32(k, step, 2401) % 4 == 0:
            y += 1 if y < 12 else -1
        x += 1 if step % 2 == 0 else 0
        if x > 15:
            break
        if step == 8:
            # side shoot
            sx, sy = x, y
            for s2 in range(5):
                cv.set(sx, sy - s2, WD(2))
                cv.set(sx + 1, sy - s2, WD(1))
                sx += s2 % 2
    for xx in range(16):
        for yy in range(15):
            if cv.get(xx, yy)[3] == 255 and cv.get(xx, yy + 1)[3] == 0:
                cv.put(xx, yy + 1, SH(60))
    return cv


def root_column():
    """Massive root trunk from ceiling to floor: object 32 x 48 (2 wide, footprint 2x1)."""
    cv = Canvas(32, 48)
    for y in range(48):
        wob = int(round(math.sin(y / 5.0) * 1.5))
        x0 = 6 + wob - (2 if y > 40 else 0) - (y - 40 if y > 40 else 0)
        x1 = 25 + wob + (2 if y > 40 else 0) + (y - 40 if y > 40 else 0)
        for x in range(max(0, x0), min(32, x1)):
            t = (x - x0) / max(1, (x1 - x0))
            c = WD(3) if t < 0.3 else (WD(2) if t < 0.75 else WD(1))
            if t < 0.12:
                c = WD(4)
            if (x * 3 + y) % 9 == 0 and 0.2 < t < 0.8:
                c = WD(1)
            if y > 38 and h32(x, y, 2402) % 7 == 0:
                c = G(2)
            cv.set(x, y, c)
        cv.set(max(0, x0), y, WD(0))
        cv.set(min(31, x1 - 1), y, WD(0))
    for x in range(4, 30):
        cv.put(x + 2, 47, SH(90))
    return cv


def pillar():
    """Free-standing stone column, 16 x 32: carved capital (overhead row), fluted shaft, square base.
    Object with a 1-tile footprint; the top row draws over actors."""
    cv = Canvas(16, 32)
    # capital: a 14 px wide slab with a lit top and a carved band
    for x in range(1, 15):
        cv.set(x, 1, K(5) if 2 <= x <= 12 else K(4))
        cv.set(x, 2, K(4) if x < 12 else K(3))
        cv.set(x, 3, K(3) if x < 11 else K(2))
        cv.set(x, 4, K(1))
    for x in (1, 14):
        cv.set(x, 1, K(1))
    cv.set(0, 2, K(1)); cv.set(0, 3, K(1)); cv.set(15, 2, K(1)); cv.set(15, 3, K(0))
    for x in range(3, 13, 3):
        cv.set(x, 3, GOLD(2))
    # echinus (the curve under the capital)
    for x in range(3, 13):
        cv.set(x, 5, K(3) if x < 9 else K(2))
        cv.set(x, 6, K(2) if x < 9 else K(1))
    cv.set(2, 5, K(1)); cv.set(13, 5, K(0))
    # shaft, 10 px wide: lit left flute, mid body, shadowed right edge
    for y in range(7, 26):
        cv.set(3, y, K(1))
        cv.set(4, y, K(4))
        cv.set(5, y, K(4) if y % 5 else K(3))
        cv.set(6, y, K(3))
        cv.set(7, y, K(3))
        cv.set(8, y, K(2) if y % 7 else K(3))
        cv.set(9, y, K(2))
        cv.set(10, y, K(2))
        cv.set(11, y, K(1))
        cv.set(12, y, K(0))
    # a carved glyph band half way down
    for x in range(4, 12):
        cv.set(x, 15, K(1) if x % 2 else K(2))
        cv.set(x, 16, K(3) if x < 9 else K(2))
    cv.set(7, 15, GOLD(2)); cv.set(8, 15, GOLD(3))
    # base: torus and square plinth
    for x in range(2, 14):
        cv.set(x, 26, K(4) if x < 10 else K(3))
        cv.set(x, 27, K(3) if x < 10 else K(2))
    cv.set(1, 26, K(1)); cv.set(14, 26, K(1)); cv.set(1, 27, K(1)); cv.set(14, 27, K(0))
    for x in range(1, 15):
        cv.set(x, 28, K(4) if x < 12 else K(3))
        cv.set(x, 29, K(2))
        cv.set(x, 30, K(1))
    cv.set(0, 28, K(1)); cv.set(15, 28, K(1)); cv.set(0, 29, K(1)); cv.set(15, 29, K(0))
    cv.set(0, 30, K(0)); cv.set(15, 30, K(0))
    for x in range(1, 16):
        cv.set(x, 31, DARK)
    # cast shadow down-right
    for y in range(8, 31):
        cv.put(13, y, SH(70))
        if y > 9:
            cv.put(14, y, SH(50))
    return cv


def plate(down=False):
    """Pressure plate. Up: a raised slab with a visible front lip and a dim rune. Down: sunk flush, rune lit."""
    cv = Canvas(16, 16)
    # recess in the floor
    for y in range(3, 14):
        for x in range(2, 14):
            cv.set(x, y, K(0) if (y in (3, 13) or x in (2, 13)) else K(1))
    if not down:
        for y in range(3, 10):
            for x in range(3, 13):
                c = K(4)
                if y == 3 or x == 3:
                    c = K(5)
                if x == 12:
                    c = K(3)
                cv.set(x, y, c)
        for y in range(10, 12):
            for x in range(3, 13):
                cv.set(x, y, K(2) if y == 10 else K(1))
        for (dx, dy) in ((0, -2), (-2, 0), (2, 0), (0, 2), (0, 0)):
            cv.set(8 + dx, 6 + dy, GOLD(2))
        for x in range(3, 14):
            cv.put(x, 12, SH(60))
    else:
        for y in range(5, 13):
            for x in range(3, 13):
                c = K(2)
                if y == 5:
                    c = K(1)
                cv.set(x, y, c)
        for (dx, dy) in ((0, -2), (-2, 0), (2, 0), (0, 2)):
            cv.set(8 + dx, 9 + dy, GOLD(4))
        cv.set(8, 9, GOLD(5))
        for (dx, dy) in ((-1, -1), (1, 1), (-1, 1), (1, -1)):
            cv.set(8 + dx, 9 + dy, GOLD(3))
    return cv


def floor_switch(on=False, ink=None):
    """Floor rune switch. ink: None (normal), 'faint' or 'revealed' (Lantern of Recall)."""
    cv = Canvas(16, 16)
    glyph = [(0, -3), (0, -2), (0, -1), (0, 0), (0, 1), (0, 2), (-2, -1), (2, -1), (-1, 2), (1, 2)]
    if ink == 'faint':
        # W5-art: barely there, a dotted outline of the rune disc that the Lantern of Recall fills in
        col = VI(3)
        for y in range(16):
            for x in range(16):
                dx, dy = x + 0.5 - 8, (y + 0.5 - 8) * 1.15
                d = math.sqrt(dx * dx + dy * dy)
                if 5.5 < d <= 6.5 and (x + y) % 2 == 0:
                    cv.put(x, y, (col[0], col[1], col[2], 96))
        for n, (dx, dy) in enumerate(glyph):
            if n % 2 == 0:
                cv.put(8 + dx, 8 + dy, (col[0], col[1], col[2], 72))
        return cv
    for y in range(16):
        for x in range(16):
            dx, dy = x + 0.5 - 8, (y + 0.5 - 8) * 1.15
            d = math.sqrt(dx * dx + dy * dy)
            if d > 6.5:
                continue
            if d > 5.5:
                c = K(0)
            elif d > 4.2:
                c = K(4) if dy < 0 else K(2)
            else:
                c = K(1)
                if on or ink == 'revealed':
                    c = CY(1)
            cv.put(x, y, c)
    gc = (CY(4) if on else K(3)) if ink is None else CY(3)
    for (dx, dy) in glyph:
        cv.put(8 + dx, 8 + dy, gc)
    if on and ink is None:
        cv.put(8, 8, CY(4))
        cv.put(7, 7, WHITE)
    return cv


def crystal_switch(state):
    """Pedestal crystal hit with a tool. state 0 = blue (off), 1 = gold (on)."""
    cv = Canvas(16, 32)
    for y in range(22, 30):
        for x in range(3, 13):
            c = K(3) if x < 8 else K(2)
            if y == 22:
                c = K(4)
            if x in (3, 12):
                c = K(1)
            cv.set(x, y, c)
    for x in range(2, 14):
        cv.set(x, 30, K(1))
    ramp = 'magic_cyan' if state == 0 else 'gold'
    R = lambda i: C(ramp, i)
    crys = ['...W...',
            '..WHh..',
            '.WHHhh.',
            'WHHHhhm',
            '.HHhhm.',
            '.Hhhmm.',
            '..hmm..',
            '...m...']
    cv.stamp(crys, 4, 9, {'W': WHITE, 'H': R(4), 'h': R(3), 'm': R(2)})
    for (x, y) in ((3, 8), (12, 10), (2, 14)):
        cv.set(x, y, R(4))
    for x in range(3, 14):
        cv.put(x + 1, 31, SH(80))
    return cv


def push_block():
    """Movable carved stone block (W5-art, CRITIQUE_2 item 10): a rounded, lit top face with a carved
    recess, a dark front face with a handle groove (dark slot, lit lower lip), a dark base course and a
    soft translucent shadow down-right, so it reads as a heavy cube from across the room and never as a
    cabinet. 16 x 24: the body is 15 px wide and the 16th column carries the shadow. Object, 1 tile footprint."""
    rows = [
        '................',
        '................',
        '................',
        '................',
        '..00000000000...',
        '.0554444444440..',
        '055444444444440.',
        '054444454444440.',
        '054444444444440.',
        '054444444444440.',
        '055555555555530.',
        '044333333333320s',
        '043330000033320s',
        '043335555533320s',
        '043333333333320s',
        '043331111333320s',
        '043313333133320s',
        '043313333143320s',
        '043313333143320s',
        '043333444333320s',
        '043333333333320s',
        '042222222222220s',
        '.0000000000000s.',
        '..sssssssssss...',
    ]
    cv = Canvas(16, 24)
    cmap = {'0': S(0), '1': S(1), '2': S(1), '3': S(2), '4': S(3), '5': S(4), 's': SH(96)}
    cv.stamp(rows, 0, 0, cmap)
    return cv


def dungeon_door(kind, opened):
    """Door set into a 2-tile wall face. kind: key (wood + keyhole), locked (iron bars, opened by puzzle),
    boss (48 x 48 ornate). Returns Canvas."""
    if kind == 'boss':
        W, H = 48, 48
    else:
        W, H = 32, 32
    cv = Canvas(W, H)
    # stone arch frame
    cx = W / 2
    r_out = W / 2 - 1
    spring = H - 8 - (int(r_out) if kind != 'boss' else 18)
    for y in range(H):
        for x in range(W):
            dx = x + 0.5 - cx
            inside_frame = y >= spring or (dx * dx + (y - spring) ** 2 <= r_out * r_out)
            if not inside_frame:
                continue
            ring = r_out - 3.5
            opening = (abs(dx) < ring and y >= spring) or (dx * dx + (y - spring) ** 2 <= ring * ring)
            if opening:
                continue
            c = K(3) if dx < 0 else K(2)
            if (int(math.degrees(math.atan2(y - spring, dx))) // 20) % 2 == 0 and y < spring:
                c = K(4) if dx < 0 else K(3)
            if y >= spring and (y - spring) % 6 == 5:
                c = K(1)
            cv.set(x, y, c)
    # opening
    ring = r_out - 3.5
    for y in range(H):
        for x in range(W):
            dx = x + 0.5 - cx
            opening = (abs(dx) < ring and y >= spring) or (dx * dx + (y - spring) ** 2 <= ring * ring)
            if not opening:
                continue
            if opened:
                c = DARK if y > spring - 4 else INK(1)
                if y > H - 6:
                    c = INK(1)
                cv.set(x, y, c)
                continue
            if kind == 'key':
                k = int(x - (cx - ring)) % 4
                c = [WD(4), WD(3), WD(3), WD(1)][k]
                if (y - spring) in (2, 12):
                    c = M_(1)
                cv.set(x, y, c)
            elif kind == 'locked':
                c = DARK
                if int(dx + ring) % 5 in (1, 2):
                    c = M_(2) if int(dx + ring) % 5 == 1 else M_(1)
                if (y - spring) in (1, 2, 13, 14):
                    c = M_(1) if (y - spring) in (2, 14) else M_(2)
                cv.set(x, y, c)
            else:  # boss
                c = C('cloth_purple', 2) if dx < 0 else C('cloth_purple', 1)
                if abs(dx) < 1:
                    c = GOLD(2)
                if (y - spring) % 7 == 0:
                    c = GOLD(3)
                cv.set(x, y, c)
    if not opened:
        if kind == 'locked':
            # puzzle seal: a cyan rune plate on the bars (opens when the room's switches fire)
            sx, sy = int(cx) - 3, spring + 5
            cv.stamp(['.ccccc.', 'cCWWWCc', 'cCWcWCc', 'cCWWWCc', '.ccccc.'], sx, sy,
                     {'c': K(1), 'C': CY(2), 'W': CY(4)})
        if kind == 'key':
            cv.stamp(['.gg.', 'gddg', 'gddg', '.dd.', '.dd.'], int(cx) - 2, H - 20, {'g': GOLD(3), 'd': DARK})
        if kind == 'boss':
            # the Book of Names emblem: open book with a glowing seal
            ex, ey = int(cx) - 8, spring - 4
            cv.stamp(['.gggggg..gggggg.',
                      'gWWWWWWggWWWWWWg',
                      'gWkkkkWggWkkkkWg',
                      'gWWWWWWggWWWWWWg',
                      'gWkkWWWggWWkkkWg',
                      'gggggggggggggggg'], ex, ey, {'g': GOLD(3), 'W': S(5), 'k': K(2)})
            for (dx, dy) in ((0, 8), (-1, 9), (1, 9), (0, 10), (0, 9)):
                cv.set(int(cx) + dx - 1, ey + dy, CY(4) if (dx, dy) != (0, 9) else WHITE)
            for y in range(spring + 6, H - 6, 6):
                cv.set(int(cx) - 6, y, GOLD(4))
                cv.set(int(cx) + 5, y, GOLD(4))
    # threshold
    for x in range(W):
        cv.set(x, H - 1, K(1))
    return cv


def cracked_wall(broken):
    """Face overlay 16 x 32 for a 2-tile wall face: cracked (bomb/tool target) or broken open."""
    cv = Canvas(16, 32)
    if broken:
        for y in range(6, 32):
            for x in range(2, 14):
                dx = x + 0.5 - 8
                if y > 12 or dx * dx + (y - 12) ** 2 * 1.2 < 36:
                    cv.set(x, y, DARK if y > 9 else INK(1))
        for (x, y) in ((1, 20), (14, 18), (3, 8), (12, 9), (1, 28), (14, 27)):
            cv.set(x, y, K(2))
            cv.set(x, y + 1, K(1))
        for x in range(1, 15):
            if h32(x, 2501) % 3 == 0:
                cv.set(x, 30, K(3))
                cv.set(x, 31, K(1))
        return cv
    pts = [(8, 4), (7, 5), (7, 6), (8, 7), (9, 8), (9, 9), (8, 10), (7, 11), (6, 12), (7, 13), (8, 14),
           (8, 15), (9, 16), (10, 17), (9, 18), (8, 19), (8, 20), (7, 21), (6, 22), (5, 23)]
    for (x, y) in pts:
        cv.set(x, y, DARK)
        cv.set(x + 1, y, K(4))
    for (x, y) in ((6, 9), (5, 8), (10, 13), (11, 12), (12, 12), (4, 18), (3, 17)):
        cv.set(x, y, K(0))
    for (x, y) in ((5, 25), (9, 26), (11, 27)):
        cv.set(x, y, K(4))
        cv.set(x, y + 1, K(1))
    return cv


def stairs_up():
    """32 x 32 archway in a wall face with steps rising into the dark."""
    cv = dungeon_door('locked', True)
    for k in range(5):
        y = 28 - k * 4
        for x in range(8 + k, 24 - k):
            cv.set(x, y, K(4) if k < 2 else K(3))
            cv.set(x, y + 1, K(2) if k < 2 else K(1))
            cv.set(x, y + 2, K(1) if k < 3 else INK(1))
    return cv


def stairs_down():
    """32 x 32 opening in the floor with steps descending north into darkness."""
    cv = Canvas(32, 32)
    for y in range(32):
        for x in range(32):
            if 2 <= x < 30 and 2 <= y < 30:
                cv.set(x, y, DARK)
    for k in range(6):
        y = 26 - k * 4
        shade = [K(4), K(3), K(3), K(2), K(1), INK(1)][k]
        for x in range(4, 28):
            cv.set(x, y, shade)
            cv.set(x, y + 1, K(1) if k < 4 else INK(1))
    for i in range(32):
        cv.set(i, 0, K(1)); cv.set(i, 1, K(4))
        cv.set(0, i, K(1)); cv.set(1, i, K(4)); cv.set(2, i, K(3)) if i > 1 else None
        cv.set(31, i, K(0)); cv.set(30, i, K(2)); cv.set(29, i, K(2)) if i > 1 else None
    for x in range(2, 30):
        cv.set(x, 2, INK(1))
    return cv


def ink_bridge(orient, state):
    """Hidden-ink bridge over an ink pool (W5-art, CRITIQUE_2 item 5). faint: a barely-there dotted outline
    of the planks, so the Lantern of Recall has something to reveal; revealed: weathered wood planks with
    an ink sheen, a lit near edge, a dark far edge and a translucent shadow on the ink beyond it. The deck
    spans rows 3..12 across the tile; 'v' is the transpose (light still from the top-left)."""
    cv = Canvas(16, 16)

    def P(i, j, c):
        x, y = (i, j) if orient == 'h' else (j, i)
        cv.put(x, y, c)

    if state == 'faint':
        col = VI(3)
        for i in range(16):
            if i % 2 == 0:
                P(i, 3, (col[0], col[1], col[2], 84))
                P(i, 12, (col[0], col[1], col[2], 84))
            if i % 4 == 0:
                for j in range(5, 12, 2):
                    P(i, j, (col[0], col[1], col[2], 64))
        return cv
    for i in range(16):
        k = i % 4                                   # plank strips 3 px wide, a 1 px gap shows the ink
        for j in range(3, 13):
            if k == 0:
                c = WD(1) if j in (3, 12) else INK(1)
            else:
                c = WD(3)
                if j == 3:
                    c = WD(5) if k != 3 else WD(4)      # lit near edge
                elif j == 4:
                    c = WD(4)
                elif j == 12:
                    c = WD(1)                           # dark far edge
                elif j == 11:
                    c = WD(2)
                elif (j + i * 3) % 5 == 0:
                    c = WD(2)                           # grain
            P(i, j, c)
    # weathering: two knots, a crack, a chipped corner, a missing sliver at the far edge
    for (i, j) in ((2, 7), (10, 9)):
        P(i, j, WD(1)); P(i + 1, j, WD(2))
    for j in range(5, 9):
        P(6, j, WD(1))
    P(13, 3, INK(1)); P(14, 3, WD(2))
    P(9, 12, INK(1))
    # ink sheen: one soft violet gloss band across the deck (the ink below shows through the wood), and
    # two brighter glints where it catches the light
    g4 = INK(4)
    for i in range(16):
        if i % 4:
            P(i, 5, (g4[0], g4[1], g4[2], 120))
            if i % 4 == 2:
                P(i, 6, (g4[0], g4[1], g4[2], 60))
    P(5, 4, VI(3)); P(13, 5, VI(3))
    for i in range(1, 16):
        P(i, 13, SH(80))
    # W8-archive (CRITIQUE_3 #4): a faint glow on the ink under a revealed bridge, the Lantern's light caught
    # beneath the planks: pale cyan, dithered, strongest against the deck and fading out to the tile edge
    g = CY(3)
    for i in range(16):
        for j, a in ((2, 70), (1, 44), (0, 22), (14, 54), (15, 30)):
            if a < 50 and (i + j) % 2:
                continue
            P(i, j, (g[0], g[1], g[2], a))
        if i % 2 == 0:
            P(i, 13, (g[0], g[1], g[2], 40))
    return cv


def ink_puddle(k):
    cv = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            dx = (x + 0.5 - 8 - (k * 2 - 1)) / (5.5 - k)
            dy = (y + 0.5 - 9) / (3.8 - k * 0.5)
            d = dx * dx + dy * dy + (rnd(x, y, 2600 + k) - 0.5) * 0.3
            if d < 1:
                c = INK(1)
                if d > 0.75:
                    c = INK(2)
                if dy < -0.3 and abs(dx) < 0.4:
                    c = INK(3)
                cv.set(x, y, c)
    cv.set(6 + k, 7, INK(4))
    return cv


def wall_glyph(state):
    """Secret-door glyph painted in hidden ink on a 2-tile wall face (16 x 32 overlay)."""
    cv = Canvas(16, 32)
    col = CY(3) if state == 'revealed' else VI(3)
    pts = []
    for t in range(40):
        ang = t / 40 * 2 * math.pi
        pts.append((8 + round(math.cos(ang) * 5), 15 + round(math.sin(ang) * 7)))
    pts += [(8, y) for y in range(9, 22)] + [(x, 15) for x in range(5, 12)]
    seen = set()
    for (x, y) in pts:
        if (x, y) in seen:
            continue
        seen.add((x, y))
        if state == 'revealed':
            cv.put(x, y, col)
        elif (x + y) % 2 == 0:
            # W5-art: faint = a dotted trace of the glyph, barely there until the Lantern fills it in
            cv.put(x, y, (col[0], col[1], col[2], 90))
    if state == 'revealed':
        cv.put(8, 15, WHITE)
    return cv


def lantern_pedestal(with_lantern):
    cv = Canvas(16, 32)
    for y in range(16, 30):
        w = 4 if y > 18 else 6
        for x in range(8 - w, 8 + w):
            c = K(3) if x < 8 else K(2)
            if y in (16, 17):
                c = K(4)
            if x == 8 - w or x == 8 + w - 1:
                c = K(1)
            cv.set(x, y, c)
    for x in range(2, 14):
        cv.set(x, 29, K(1)); cv.set(x, 28, K(3))
    for (dx, dy) in ((0, 0), (1, 1), (-1, 1), (0, 2)):
        cv.set(8 + dx, 22 + dy, CY(3) if with_lantern else K(1))
    if with_lantern:
        lan = ['..mm..',
               '.m..m.',
               'mmmmmm',
               'mGGGGm',
               'mGWYGm',
               'mGYYGm',
               'mGGGGm',
               'mmmmmm']
        cv.stamp(lan, 5, 7, {'m': GOLD(2), 'G': GOLD(4), 'W': WHITE, 'Y': C('magic_cyan', 4)})
        cv.put(4, 10, CY(3)); cv.put(11, 9, CY(3))
    else:
        for x in range(5, 11):
            cv.set(x, 15, K(1))
    for x in range(3, 14):
        cv.put(x + 1, 30, SH(80))
    return cv


# ====================================================================== assemble
def build():
    sh = Sheet(512)
    top = ArchiveTop()
    face = ArchiveFace()
    floor = ArchiveFloor()
    x, y = sh.alloc(32, 48)
    sh.cv.paste(top.block(), x, y)
    tx, ty = x, y
    x, y = sh.alloc(32, 32)
    sh.cv.paste(face.block(), x, y)
    fx, fy = x, y
    sh.meta['walls'] = {'archive': {'top': [tx, ty], 'face': [fx, fy], 'collision': 'solid',
                                    'note': 'legend ids archive_top / archive_face; face 1-3 rows below the top; '
                                            'the top fill is flat #14101e (void) inside a stone cap'}}
    x, y = sh.alloc(32, 48)
    sh.cv.paste(floor.block(), x, y)
    sh.meta['terrains'] = {'archive_floor': {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A2', 'kind': 'fill',
                                             'collision': 'none', 'order': 0, 'variants': [],
                                             'variantWeights': floor.weights}}
    for v in range(floor.nvariants):
        vx, vy = sh.alloc(16, 16)
        sh.cv.paste(floor.variant_tile(v), vx, vy)
        sh.meta['terrains']['archive_floor']['variants'].append([vx, vy])
    sh.newline()
    # freestanding shelves (objects, 2 wide; top row drawn overhead)
    sh.obj('shelf_a', bookshelf(2, 40, seed=1), [0, 2], [[0, 0], [1, 0]], 1)
    sh.obj('shelf_b', bookshelf(2, 40, seed=2, ladder=True), [0, 2], [[0, 0], [1, 0]], 1)
    sh.obj('shelf_wide', bookshelf(3, 40, seed=3), [0, 2], [[0, 0], [1, 0], [2, 0]], 1)
    sh.obj('shelf_moving', bookshelf(2, 40, seed=4, moving=True), [0, 2], [[0, 0], [1, 0]], 1,
           note='slides along its rails when a switch fires; footprint moves with it')
    sh.obj('reading_table', reading_table(2), [0, 1], [[0, 0], [1, 0]], 1)
    sh.obj('reading_table_long', reading_table(3), [0, 1], [[0, 0], [1, 0], [2, 0]], 1)
    sh.obj('root_column', root_column(), [0, 2], [[0, 0], [1, 0]], 2)
    # candelabra (3 frames) and braziers: animation strips, frame k at rect.x + k * frameDx
    strip = Canvas(48, 32)
    for i in range(3):
        strip.paste(candelabra(i), i * 16, 0)
    cx_, cy_ = sh.alloc(48, 32)
    sh.cv.paste(strip, cx_, cy_)
    sh.meta['objects']['candelabra'] = {'rect': [cx_, cy_, 16, 32], 'anchor': [0, 1], 'footprint': [[0, 0]],
                                        'overheadRows': 1, 'doorAt': None, 'collision': 'solid', 'kind': 'prop',
                                        'anim': {'frames': [0, 1, 2, 1], 'frameDx': 16, 'ms': 140}}
    bstrip = Canvas(48, 32)
    for i in range(3):
        bstrip.paste(brazier(i, True), i * 16, 0)
    bx, by = sh.alloc(48, 32)
    sh.cv.paste(bstrip, bx, by)
    sh.meta['objects']['brazier_lit'] = {'rect': [bx, by, 16, 32], 'anchor': [0, 1], 'footprint': [[0, 0]],
                                         'overheadRows': 1, 'doorAt': None, 'collision': 'solid', 'kind': 'prop',
                                         'anim': {'frames': [0, 1, 2, 1], 'frameDx': 16, 'ms': 120}}
    sh.obj('brazier_unlit', brazier(0, False), [0, 1], [[0, 0]], 1)
    sh.obj('crystal_switch_blue', crystal_switch(0), [0, 1], [[0, 0]], 1)
    sh.obj('crystal_switch_gold', crystal_switch(1), [0, 1], [[0, 0]], 1)
    sh.obj('lantern_pedestal', lantern_pedestal(True), [0, 1], [[0, 0]], 1)
    sh.obj('lantern_pedestal_empty', lantern_pedestal(False), [0, 1], [[0, 0]], 1)
    pb = Canvas(16, 32)
    pb.paste(push_block(), 0, 8)
    sh.obj('push_block', pb, [0, 1], [[0, 0]], 0, note='movable; draw at its tile, slide 16 px per push')
    sh.newline()
    roots_top = ArchiveRootsTop()
    x, y = sh.alloc(32, 48)
    sh.cv.paste(roots_top.block(), x, y)
    sh.meta['walls']['archive_roots'] = {'top': [x, y], 'face': [fx, fy], 'collision': 'solid',
                                         'note': 'legend ids archive_roots_top / archive_roots_face; the old '
                                                 'root-choked earth fill under the same cap and face as archive'}
    sh.obj('pillar', pillar(), [0, 1], [[0, 0]], 1, note='free-standing column, 2 tiles tall; capital row overhead')
    sh.newline()
    for kind in ('key', 'locked'):
        for op in (False, True):
            sh.obj('door_%s_%s' % (kind, 'open' if op else 'closed'), dungeon_door(kind, op), [0, 1],
                   [] if op else [[0, 0], [1, 0]], 0, door=[0, 0] if op else None, kind='door',
                   note='set into a 2-tile wall face; cells (0,0) and (1,0) are the doorway')
    for op in (False, True):
        sh.obj('door_boss_%s' % ('open' if op else 'closed'), dungeon_door('boss', op), [0, 2],
               [] if op else [[0, 0], [1, 0], [2, 0]], 0, door=[1, 0] if op else None, kind='door')
    sh.obj('stairs_up', stairs_up(), [0, 1], [], 0, door=[0, 0], kind='door')
    sh.obj('stairs_down', stairs_down(), [0, 1], [], 0, door=[0, 0], kind='door')
    sh.newline()
    for part in ('l', 'm', 'r'):
        sh.tile('wall_shelf_' + part, wall_shelf(part), collision='solid')
    sh.tile('wall_cracked', cracked_wall(False), collision='solid')
    sh.tile('wall_broken', cracked_wall(True), collision='none')
    sh.tile('wall_glyph_faint', wall_glyph('faint'), collision='solid')
    sh.tile('wall_glyph_revealed', wall_glyph('revealed'), collision='solid')
    sh.newline()
    sh.tile('plate_up', plate(False), collision='none')
    sh.tile('plate_down', plate(True), collision='none')
    sh.tile('switch_off', floor_switch(False), collision='none')
    sh.tile('switch_on', floor_switch(True), collision='none')
    sh.tile('switch_ink_faint', floor_switch(False, 'faint'), collision='none')
    sh.tile('switch_ink_revealed', floor_switch(False, 'revealed'), collision='none')
    for o in ('h', 'v'):
        for st in ('faint', 'revealed'):
            sh.tile('ink_bridge_%s_%s' % (o, st), ink_bridge(o, st),
                    collision='pit' if st == 'faint' else 'none')
    for k in range(3):
        sh.tile('roots_%d' % k, roots_decal(k), collision='none')
    for k in range(2):
        sh.tile('ink_puddle_%d' % k, ink_puddle(k), collision='none')
    sh.newline()
    # W8-archive: the per-floor kits (catalog / gallery / stacks floors, wall bands, the deep, outer faces, props)
    import archive_floors
    import archive_props_w8
    archive_floors.build_into(sh)
    archive_props_w8.build_into(sh)
    H = sh.y
    return sh.cv.crop(0, 0, 512, H), sh.meta
