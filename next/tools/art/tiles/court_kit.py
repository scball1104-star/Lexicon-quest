"""Court of Mirrors (Episode 2) floor terrains and wall systems -> court.png (E2-tiles, EPISODE2_PLAN 9.1).

Same per-floor kit approach as the Archive (archive_floors.py): each floor has its floor terrain, a wall band
(<sys>_top, a full tile of wall top), an inner face (<sys>_face), the deep beyond its walls (<sys>_out_top, no
edges) and an outer face under a band's south lip (<sys>_out_face).

  F1 The Silverglass Antechamber  glass_floor: silver flagstones (octagon slabs, blue glass let into the
                                  corners). court: silver-white marble cap, a face of tall arched mirror panels
                                  between silver pilasters. Beyond: night with glass shards catching the moon.
  F2 The Hall of Other Selves     gallery_floor: violet marquetry (pinwheel lozenges, silver stringing).
                                  court_gallery: violet cap with a silver lip, violet damask over a dark
                                  wainscot (the portraits hang on it). Beyond: dark gilt frames lost in the dark.
  F3 The Unnamed Throne           throne_floor: black mirror slabs with a cold sheen. court_throne: cracked
                                  slate cap, slate ashlar with a frieze of carved crowns and pale crack lines.
                                  Beyond: black, splinters of dark glass.

All three floors carry `reflect: true` (EPISODE2_PLAN 5.2): the field draws actors flipped over them.
"""
import math
from pxlib import C, DARK, WHITE, rnd, h32
from terrain import blank, stamp_in
from archive_floors import FloorBase, BandTop, DeepTop, SplitFace, OuterFace, fade

K = lambda i: C('stone_cool', i)       # 251d34 2e2b4c 4c445c 66637f 8e8997 b3b6c4
MT = lambda i: C('metal', i)           # 2e2b4c 66637f b3b6c4 e2e0de f6f4ee
ICE = lambda i: C('ice', i)            # 3e88ca 6ab3e4 b4e4f2 e8fffb
WA = lambda i: C('water', i)           # 0e153b 1d3775 24559b 3e88ca 6ab3e4 b4e4f2
RB = lambda i: C('roof_blue', i)       # 0e153b 1d2a67 2c4797 4064b9 6891d9
CY = lambda i: C('magic_cyan', i)      # 1d3775 317aa1 2ec4d0 8af0e8 e8fffb
VI = lambda i: C('magic_violet', i)    # 522a84 7040aa 9062c3 bc94e2 f6f4ee
CP = lambda i: C('cloth_purple', i)    # 1a1334 36195a 522a84 7040aa 9062c3 bc94e2
INK = lambda i: C('ink', i)            # 14101e 1a1334 292657 3f4186 7162bd
GD = lambda i: C('gold', i)


# ====================================================================== F1 glass_floor
class GlassFloor(FloorBase):
    """Silver flagstones: one octagon slab per tile, bevelled (lit north-west, shaded south-east), with a small
    diamond of blue glass let into every corner where four slabs meet. Mid-tone so actors and their
    reflections stand out; the sheen and the moon glints are in the variants."""
    id = 'glass_floor'
    nvariants = 7
    weights = [30, 3, 1, 2, 1, 2, 2]
    edge = K(1)

    def make_texture(self, frame, variant):
        t = blank(K(4))
        for y in range(16):
            for x in range(16):
                px, py = x + 0.5, y + 0.5
                d = min(abs(px - cx) + abs(py - cy) for cx in (0, 16) for cy in (0, 16))
                if d < 1.6:
                    t[y][x] = RB(3) if (px < 8) == (py < 8) else RB(2)
                    continue
                if d < 2.6:
                    t[y][x] = K(2)
                    continue
                # slab: bevel by the nearest straight edge / diagonal cut
                if x == 15 or y == 15:
                    col = K(2)
                elif x == 0 or y == 0:
                    col = K(5)
                elif d < 3.6:
                    col = K(5) if (px < 8 and py < 8) else K(3)
                elif x == 14 or y == 14:
                    col = K(3)
                else:
                    col = K(4)
                    if h32(x, y, 5101) % 47 == 0:
                        col = K(3)
                t[y][x] = col
        # glints on the glass corner insets
        t[0][0] = ICE(2)
        if variant == 1:
            # a paler slab: a few lighter flecks in the stone
            for (x, y) in ((5, 4), (9, 7), (6, 10), (11, 11), (4, 8)):
                t[y][x] = K(5)
        elif variant == 2:
            # a fine crack across the slab
            pts = [(3, 4), (4, 5), (5, 5), (6, 6), (7, 7), (7, 8), (8, 9), (9, 9), (10, 10), (11, 12)]
            for (x, y) in pts:
                t[y][x] = K(2)
                if t[y - 1][x] == K(4):
                    t[y - 1][x] = K(5)
        elif variant == 3:
            # a dropped sliver of mirror glass
            stamp_in(t, ['..w', '.hb', 'hb.'], 8, 6, {'w': WHITE, 'h': ICE(2), 'b': ICE(1)})
            t[9][8] = K(3)
            t[9][9] = K(3)
        elif variant == 4:
            # an engraved silver star in the slab's heart
            stamp_in(t, ['..h..', '..h..', 'hhWhh', '..h..', '..h..'], 6, 5, {'h': K(5), 'W': MT(3)})
            for (x, y) in ((9, 8), (8, 10), (11, 7)):
                pass
        elif variant == 5:
            # scuffs (foot traffic)
            for (x, y) in ((6, 7), (7, 7), (9, 9), (10, 9), (5, 11)):
                t[y][x] = K(3)
        elif variant == 6:
            # moonlight glint on a glass inset (brighter corner)
            t[0][0] = WHITE
            t[1][0] = ICE(2)
            t[0][1] = ICE(2)
        return t


# ====================================================================== F2 gallery_floor
class GalleryFloor(FloorBase):
    """Violet marquetry: a chequer of 8 x 8 veneer squares, the grain turning a quarter in each, a thin silver
    stringing line on the 16 grid with a small silver lozenge where four lines cross. Low contrast inside the
    tile, so actors stay on top of it."""
    id = 'gallery_floor'
    nvariants = 6
    weights = [22, 3, 2, 2, 2, 1]
    edge = CP(0)

    def make_texture(self, frame, variant):
        t = blank(CP(2))
        for y in range(16):
            for x in range(16):
                qa = ((x // 8) + (y // 8)) % 2 == 0
                u, v = x % 8, y % 8
                g, along = (v, x) if qa else (u, y)       # grain rows (A: horizontal, B: vertical)
                if qa:
                    col = CP(2)
                    if g in (2, 5) and h32(along // 3, g, x // 8, y // 8, 5201) % 3 == 0:
                        col = CP(1)
                else:
                    col = CP(1)
                    if g in (2, 5) and h32(along // 3, g, x // 8, y // 8, 5202) % 3 == 0:
                        col = CP(2)
                if (x == 7 or y == 7):
                    col = CP(0) if not qa else CP(1)
                t[y][x] = col
        for i in range(16):
            t[15][i] = CP(0)
            t[i][15] = CP(0)
            t[0][i] = CP(3) if i % 4 == 2 else CP(2)
            t[i][0] = CP(3) if i % 4 == 2 else CP(2)
        stamp_in(t, ['.k', 'kW'], 14, 14, {'k': K(3), 'W': K(4)})
        stamp_in(t, ['Wk', 'k.'], 0, 0, {'k': K(3), 'W': K(4)})
        t[0][15] = K(3)
        t[15][0] = K(3)
        if variant == 1:
            # a sun-faded square (the lighter dye)
            for y in range(1, 7):
                for x in range(9, 15):
                    if t[y][x] == CP(2) and (x + y) % 2 == 0:
                        t[y][x] = CP(3)
        elif variant == 2:
            # a lifted, darker square of veneer
            for y in range(8, 15):
                for x in range(1, 7):
                    t[y][x] = CP(1) if (x + y) % 3 else CP(0)
        elif variant == 3:
            # a dropped silver hairpin
            for (x, y) in ((10, 4), (11, 5), (12, 6)):
                t[y][x] = K(5)
            t[4][10] = MT(3)
        elif variant == 4:
            # a gold lozenge at the crossing instead of silver
            stamp_in(t, ['.k', 'kW'], 14, 14, {'k': GD(2), 'W': GD(4)})
            stamp_in(t, ['Wk', 'k.'], 0, 0, {'k': GD(2), 'W': GD(4)})
        elif variant == 5:
            # a scuff
            for (x, y) in ((4, 3), (5, 3), (6, 4), (7, 4)):
                t[y][x] = CP(3)
        return t


# ====================================================================== F3 throne_floor
class ThroneFloor(FloorBase):
    """Black mirror: big polished slabs, the joints barely there, a cold violet sheen and a few star specks
    (the dark reflected)."""
    id = 'throne_floor'
    nvariants = 7
    weights = [18, 4, 3, 3, 2, 1, 1]
    edge = DARK

    def make_texture(self, frame, variant):
        t = blank(INK(1))
        for y in range(16):
            for x in range(16):
                col = INK(1)
                if x == 15 or y == 15:
                    col = DARK
                elif (x == 0 or y == 0) and (x + y) % 2 == 0:
                    col = INK(2)
                elif h32(x, y, 5301) % 61 == 0:
                    col = INK(2)
                t[y][x] = col
        for (x, y) in ((5, 9), (12, 4)):
            t[y][x] = INK(3)
        if variant == 1:
            # a long diagonal sheen (two dithered rows of INK 2)
            for k in range(14):
                x, y = 1 + k, 13 - k
                t[y][x] = INK(2)
                if (k % 2) == 0 and y + 1 < 15:
                    t[y + 1][x] = INK(2)
        elif variant == 2:
            # a star caught in the glass
            stamp_in(t, ['.a.', 'aWa', '.a.'], 9, 6, {'a': INK(3), 'W': INK(4)})
        elif variant == 3:
            # a hairline crack, pale at its lip
            for (x, y) in ((2, 6), (3, 6), (4, 7), (5, 7), (6, 8), (7, 8), (8, 8), (9, 9), (10, 10), (11, 10)):
                t[y][x] = K(2)
            t[6][2] = K(3)
        elif variant == 4:
            # violet sheen pool (reflected candle glow)
            for y in range(4, 12):
                for x in range(3, 13):
                    d = ((x - 7.5) / 5) ** 2 + ((y - 7.5) / 3.2) ** 2
                    if d < 1 and (x + y) % 2 == 0:
                        t[y][x] = INK(2)
            t[7][7] = INK(3)
        elif variant == 5:
            # a dust of glass splinters
            for (x, y) in ((3, 3), (4, 4), (11, 11), (12, 12), (13, 10)):
                t[y][x] = K(3)
            t[4][4] = K(4)
        elif variant == 6:
            for (x, y) in ((6, 3), (6, 4), (7, 3)):
                t[y][x] = INK(3)
            t[3][6] = INK(4)
        return t


# ====================================================================== wall bands
class CourtTop(BandTop):
    """F1 band: a silver-white marble cap with soft grey veins, a bright front lip."""
    id = 'court_top'
    seed = 5410

    def make_texture(self, frame, variant):
        t = blank(K(5))
        for y in range(16):
            for x in range(16):
                v = math.sin((x * 0.39 + y * 0.78) + math.sin(y * 0.39 + x * 0.2) * 1.4)
                if v > 0.965 and (x + y) % 2 == 0:
                    t[y][x] = K(4)
                elif h32(x, y, 5411) % 41 == 0:
                    t[y][x] = MT(3)
        for x in range(16):
            t[8][x] = K(4) if x % 8 else K(3)
        if variant == 1:
            for y in range(1, 15):
                t[y][8] = K(3) if y % 7 else K(4)
        elif variant == 2:
            stamp_in(t, ['.r.', 'rRr', '.r.'], 6, 3, {'r': RB(3), 'R': ICE(2)})
        elif variant == 3:
            for (x, y) in ((3, 12), (4, 11), (5, 11), (6, 10)):
                t[y][x] = K(4)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [MT(4), MT(3), K(5), K(3)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else K(2)
        if side == 'W':
            return K(2) if d < 1 else MT(3)
        return DARK if d < 1 else K(3)


class GalleryBandTop(BandTop):
    """F2 band: a dark violet stone cap, a silver front lip."""
    id = 'court_gallery_top'
    seed = 5420

    def make_texture(self, frame, variant):
        t = blank(CP(1))
        for y in range(16):
            for x in range(16):
                n = h32(x // 2, y, 5421) % 9
                if n == 0:
                    t[y][x] = CP(2)
                elif n == 1 and (x + y) % 3 == 0:
                    t[y][x] = CP(0)
        for x in range(16):
            t[8][x] = CP(0) if x % 8 else CP(2)
        if variant == 1:
            for (x, y) in ((4, 3), (11, 12), (13, 5)):
                t[y][x] = CP(3)
        elif variant == 2:
            for y in range(1, 15):
                t[y][8] = CP(0)
                t[y][9] = CP(2) if y % 3 else CP(1)
        elif variant == 3:
            stamp_in(t, ['.k.', 'kWk', '.k.'], 6, 4, {'k': K(3), 'W': K(5)})
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [K(5), K(4), CP(3), CP(2)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else CP(0)
        if side == 'W':
            return CP(0) if d < 1 else CP(3)
        return DARK if d < 1 else CP(0)


class ThroneBandTop(BandTop):
    """F3 band: a slate cap split by pale cracks, a dim silver front lip."""
    id = 'court_throne_top'
    seed = 5430
    weights = [9, 2, 2, 2]
    CRACKS = [
        [(1, 3), (4, 4), (6, 6), (9, 6), (12, 8), (15, 8)],
        [(2, 12), (5, 10), (7, 11), (10, 13), (13, 12)],
        [(8, 1), (7, 4), (9, 7), (8, 10), (10, 14)],
        [(1, 7), (5, 8), (8, 7), (12, 9), (15, 9)],
    ]

    def make_texture(self, frame, variant):
        t = blank(K(1))
        for y in range(16):
            for x in range(16):
                n = h32(x, y // 2, 5431) % 11
                if n == 0:
                    t[y][x] = K(2)
                elif n == 1:
                    t[y][x] = K(0)
        pts = self.CRACKS[variant % 4] if variant else []
        for a, b in zip(pts, pts[1:]):
            (x0, y0), (x1, y1) = a, b
            n = max(abs(x1 - x0), abs(y1 - y0), 1)
            for k in range(n + 1):
                x = round(x0 + (x1 - x0) * k / n)
                y = round(y0 + (y1 - y0) * k / n)
                if 0 <= x < 16 and 0 <= y < 16:
                    t[y][x] = DARK
                    if y + 1 < 16 and t[y + 1][x] != DARK:
                        t[y + 1][x] = K(3)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [K(4), K(3), K(2), K(1)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else K(0)
        if side == 'W':
            return K(0) if d < 1 else K(2)
        return DARK if d < 1 else K(0)


# ====================================================================== the deep beyond
class CourtDeep(DeepTop):
    """Beyond the F1 walls: night, with shards of glass catching the moon here and there."""
    id = 'court_out_top'
    weights = [8, 2, 2, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant == 1:
            for (x, y) in ((4, 5), (5, 4), (5, 5), (6, 3), (6, 4), (7, 2)):
                t[y][x] = INK(1)
            t[2][7] = RB(1)
        elif variant == 2:
            t[9][11] = RB(1)
            t[3][3] = INK(1)
        elif variant == 3:
            for k in range(6):
                t[3 + k][9 + (k // 2)] = INK(1) if k % 2 else INK(2)
            t[3][9] = RB(2)
        elif variant == 4:
            for (x, y) in ((2, 10), (3, 11), (4, 12), (3, 10), (12, 4), (13, 5)):
                t[y][x] = INK(1)
        elif variant == 5:
            t[6][6] = RB(2)
            t[6][7] = INK(2)
            t[7][6] = INK(2)
        return t


class GalleryDeep(DeepTop):
    """Beyond the F2 walls: empty gilt frames hanging in the dark, the gold barely catching."""
    id = 'court_gallery_out_top'
    weights = [6, 3, 2, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant in (1, 2):
            x0, y0, w, h = (3, 2, 9, 11) if variant == 1 else (5, 4, 7, 8)
            for x in range(x0, x0 + w):
                t[y0][x] = INK(1)
                t[y0 + h - 1][x] = INK(1)
            for y in range(y0, y0 + h):
                t[y][x0] = INK(1)
                t[y][x0 + w - 1] = INK(1)
            t[y0][x0] = GD(0)
        elif variant == 3:
            for y in range(16):
                if y % 3 != 2:
                    t[y][7] = INK(1)
        elif variant == 4:
            t[5][10] = CP(0)
            t[11][4] = CP(0)
        elif variant == 5:
            t[8][8] = GD(0)
        return t


class ThroneDeep(DeepTop):
    """Beyond the F3 walls: black, with splinters of black glass."""
    id = 'court_throne_out_top'
    weights = [9, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        shards = {1: [(3, 4), (4, 5), (5, 6)], 2: [(10, 9), (11, 8), (12, 7), (11, 9)],
                  3: [(6, 12), (7, 12), (8, 11)], 4: [(2, 2), (13, 13)], 5: []}
        for (x, y) in shards.get(variant, []):
            t[y][x] = INK(1)
        if variant == 5:
            t[7][7] = VI(0)
        if variant == 2:
            t[7][12] = INK(2)
        return t


# ====================================================================== inner faces
class CourtFace(SplitFace):
    """F1: a silver cornice, tall arched mirror panels between silver pilasters, a silver dado and plinth.
    The glass is a night-blue gradient (dark at the top, the moonlit floor reflected low) with one diagonal
    sheen streak per panel."""

    def at(self, x, Y):
        u = x % 16
        if Y <= 5:
            return [DARK, K(2), MT(3), K(5), K(3), K(2)][Y]
        if Y >= 27:
            return [K(5), K(4), K(3), K(2), DARK][Y - 27]
        # pilasters
        if u == 15:
            return K(2)
        if u in (0, 1):
            return MT(3) if u == 0 else K(5)
        if u == 2:
            return K(3)
        if u == 14:
            return K(4)
        # panel interior x 3..13, arched head at Y 6..9
        gx = u - 3                      # 0..10
        cx = 5.0
        if Y < 10:
            r = 5.5
            dy = 10 - Y
            if (gx - cx) ** 2 + (dy * 1.15) ** 2 > r * r:
                return K(4) if Y > 6 else K(5)
            if (gx - cx) ** 2 + (dy * 1.15) ** 2 > (r - 1.1) ** 2:
                return K(5)
        if gx == 0 or gx == 10:
            return K(5) if gx == 0 else K(3)
        if Y == 26:
            return K(3)
        # glass gradient
        if Y < 13:
            col = RB(1)
        elif Y < 17:
            col = RB(2) if (Y > 14 or (gx + Y) % 2) else RB(1)
        elif Y < 21:
            col = RB(2) if (Y < 19 and (gx + Y) % 2) else RB(3)
        elif Y < 23:
            col = RB(3)
        else:
            # the reflected floor: a silver band low in the glass
            col = K(4) if Y == 23 else (K(3) if (gx + Y) % 2 else K(4))
        # sheen: one bright diagonal streak, and a fainter one beside it
        s = gx + (Y - 8) * 0.45
        if 6.8 <= s < 8.0 and 9 <= Y <= 24:
            col = ICE(2) if Y < 22 else MT(3)
        elif 8.8 <= s < 9.5 and 11 <= Y <= 22:
            col = ICE(1)
        if gx == 1 and 10 <= Y <= 25:
            col = RB(0) if Y < 18 else RB(1)
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
                return DARK if (y < 2 and not top) else K(2)
            if x == 1 and col not in (DARK,):
                return MT(3)
        if not right:
            if x == 15:
                return DARK if (y >= 15 and not bottom) else K(1)
            if x == 14 and col != DARK:
                return K(3)
        return col


class GalleryFace(SplitFace):
    """F2: a silver picture rail under the cap, violet damask (a small lozenge motif), a silver chair rail and a
    dark violet wainscot of framed panels, then the plinth. The portraits (portrait_*) hang over the damask."""

    def at(self, x, Y):
        if Y <= 4:
            return [DARK, CP(0), K(5), K(3), CP(0)][Y]
        if Y >= 29:
            return [K(3), K(1), DARK][Y - 29]
        if Y == 20:
            return K(4)
        if Y == 21:
            return K(2)
        if Y >= 22:
            # wainscot: framed panels 16 wide
            u, v = x % 16, Y - 22         # v 0..6
            if v == 0 or u == 0:
                return CP(2)
            if v == 6 or u == 15:
                return DARK
            if v == 1 or u == 1:
                return CP(0)
            return CP(1) if (u + v) % 9 else CP(2)
        # damask field Y 5..19: a half-drop fleur on the dark violet ground
        u, v = x % 16, (Y - 5) % 16
        fleur = ['..a..', '.aba.', 'abcba', '.aba.', '..a..']
        for (fx, fy) in ((2, 1), (10, 9)):
            i, j = u - fx, v - fy
            if 0 <= i < 5 and 0 <= j < 5:
                ch = fleur[j][i]
                if ch != '.':
                    return {'a': CP(2), 'b': CP(3), 'c': CP(4)}[ch]
        if Y == 5:
            return CP(0)
        return CP(1)

    def head(self, x, y):
        return self.at(x, y)

    def body(self, x, r):
        return self.at(x, r if r >= 8 else 16 + r)

    def foot(self, x, f):
        return self.at(x, 24 + f)

    def sides(self, col, x, y, left, top, right, bottom):
        if not left:
            if x == 0:
                return CP(0)
            if x == 1 and col not in (DARK,):
                return CP(3) if col not in (K(5), K(4), K(3)) else col
        if not right:
            if x == 15:
                return DARK if (y >= 14 and not bottom) else CP(0)
            if x == 14 and col not in (DARK, K(5), K(4)):
                return CP(1)
        return col


class ThroneFace(SplitFace):
    """F3: dark slate ashlar under a frieze of carved crowns (one per tile), pale crack lines running down the
    courses, a dim plinth."""
    CRACKS = {3: (9, 24), 11: (12, 27)}

    def course(self, x, Y):
        k = (Y - 12) // 9
        v = (Y - 12) % 9
        off = 0 if k % 2 == 0 else 8
        u = (x + off) % 16
        tone = h32(k, (x + off) // 16, 5501) % 3
        if v == 8 or u == 15:
            return K(0)
        if v == 0 and u < 14:
            return K(2)
        if u == 0 and v < 7:
            return K(2) if tone else K(1)
        return K(1)

    def at(self, x, Y):
        u = x % 16
        if Y <= 2:
            return [DARK, K(0), K(3)][Y]
        if Y <= 11:
            # frieze with a crown carved in relief
            col = K(1)
            if Y == 3:
                col = K(2)
            if Y == 11:
                col = K(0)
            crown = ['.........',
                     '.a..a..a.',
                     '.aa.a.aa.',
                     '.aaaaaaa.',
                     '.bbbbbbb.',
                     '.ccccccc.']
            cy = Y - 4
            cx = u - 4
            if 0 <= cy < len(crown) and 0 <= cx < 9:
                ch = crown[cy][cx]
                if ch == 'a':
                    col = K(3)
                elif ch == 'b':
                    col = K(4) if cx % 2 else K(3)
                elif ch == 'c':
                    col = K(0)
            return col
        if Y >= 29:
            return [K(2), K(1), DARK][Y - 29]
        col = self.course(x, Y)
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
                return DARK if (y == 0 and not top) else K(0)
            if x == 1 and col in (K(1), K(2)):
                return K(3)
        if not right and x == 15:
            return DARK if (y >= 15 and not bottom) else K(0)
        return col


# ====================================================================== outer faces
class CourtOut(OuterFace):
    shadow_line = K(2)
    edge_dark = K(2)

    def material(self, x, Y):
        if 1 <= Y <= 4:
            return [MT(3), K(5), K(4), K(2)][Y - 1]
        course = (Y - 5) // 6
        v = (Y - 5) % 6
        u = (x + (course % 2) * 8) % 16
        if v == 5 or u == 15:
            return K(2)
        if v == 0 or u == 0:
            return K(4)
        return K(3)


class GalleryOut(OuterFace):
    shadow_line = CP(0)
    edge_dark = CP(0)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [K(4), K(3), CP(1)][Y - 1]
        course = (Y - 4) // 7
        v = (Y - 4) % 7
        u = (x + (course % 2) * 6) % 12
        if v == 6 or u == 11:
            return CP(0)
        if v == 0 or u == 0:
            return CP(2)
        return CP(1)


class ThroneOut(OuterFace):
    shadow_line = K(0)
    edge_dark = K(0)

    def material(self, x, Y):
        if 1 <= Y <= 2:
            return [K(3), K(2)][Y - 1]
        course = (Y - 3) // 6
        v = (Y - 3) % 6
        u = (x + (course % 2) * 8) % 16
        if v == 5 or u == 15:
            return K(0)
        if v == 0:
            return K(2)
        if u == 7 and course == 1:
            return DARK
        return K(1)


FLOORS = [GlassFloor(), GalleryFloor(), ThroneFloor()]
WALLS = [
    ('court', CourtTop(), CourtFace(), CourtDeep(), CourtOut()),
    ('court_gallery', GalleryBandTop(), GalleryFace(), GalleryDeep(), GalleryOut()),
    ('court_throne', ThroneBandTop(), ThroneFace(), ThroneDeep(), ThroneOut()),
]


def build_into(sh):
    """Terrains and wall systems into a kit.Sheet (same layout rules as archive_floors.build_into)."""
    terr = sh.meta.setdefault('terrains', {})
    for fl in FLOORS:
        x, y = sh.alloc(32, 48)
        sh.cv.paste(fl.block(), x, y)
        m = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A2', 'kind': 'fill', 'collision': 'none',
             'reflect': True, 'variants': [], 'variantWeights': list(fl.weights)}
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
                         'note': 'E2 Court wall band (%s_top) and inner face (%s_face)' % (sys_id, sys_id)}
        walls[sys_id + '_out'] = {'top': [dx, dy], 'face': [ox, oy], 'collision': 'solid',
                                  'topVariants': dv, 'topVariantWeights': list(deep.weights),
                                  'note': 'the deep beyond the walls (%s_out_top, no edges) and the outer face '
                                          'under a band\'s south lip (%s_out_face)' % (sys_id, sys_id)}
        sh.newline()
