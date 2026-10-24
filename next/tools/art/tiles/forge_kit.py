"""The Ashen Foundry (Episode 3) floor terrains, wall systems, slag and troughs -> forge.png (E3-tiles, EPISODE3_PLAN 9.1).

Same per-floor kit approach as the Court (court_kit.py): each floor has its floor terrain, a wall band (<sys>_top), an
inner face (<sys>_face), the deep beyond its walls (<sys>_out_top) and an outer face under a band's south lip
(<sys>_out_face). Three floors, three looks you can name from a phone screenshot:

  F1 The Cinder Liftworks      foundry_floor: riveted iron plate, cool blue-grey, with warm rust and the odd glowing
                               grating. foundry: iron-capped walls of sooted red brick, riveted iron straps.
  F2 The Ventilation Galleries ash_floor: soot-dark warm flagstone, ash drifts, ember cracks. galleries: soot stone
                               with louvred vent grilles and a sooty ember glow behind the slats.
  F3 The Heartforge Crucible   crucible_floor: black basalt with a bronze inlay grid, rings and the odd red crack.
                               crucible: basalt panels between bronze ribs, hairline cracks that glow.

Slag (`slag`, A1, 3 frames, flow 'slag') is the molten stuff; `slag_crust` is what it becomes when water reaches it.
Troughs (`trough_*`) are stone channels with a dry and a wet frame set (flow 'channel').
"""
import math
from pxlib import Canvas, C, DARK, WHITE, rnd, h32, SH, profile1d
from terrain import blank, stamp_in, Water
from archive_floors import FloorBase, BandTop, DeepTop, SplitFace, OuterFace, fade

K = lambda i: C('stone_cool', i)       # 251d34 2e2b4c 4c445c 66637f 8e8997 b3b6c4
SW = lambda i: C('stone_warm', i)      # 2e2b4c 584951 7e6d6e a18f85 cfb89c ebdfc8
RR = lambda i: C('roof_red', i)        # 2d1b1f 571f28 87332e b34532 e06b39 eba14d
FI = lambda i: C('fire', i)            # 571f28 b34532 e06b39 eba14d f9d77a fff7d6
GD = lambda i: C('gold', i)            # 482826 8f5533 c38334 eba14d f9d77a fff7d6
EA = lambda i: C('earth', i)           # 2d1b1f 482826 6a4532 896042 ae8458
MT = lambda i: C('metal', i)           # 2e2b4c 66637f b3b6c4 e2e0de f6f4ee
SD = lambda i: C('shadow', i)          # 14101e 251d34 2e2b4c 4c445c
INK = lambda i: C('ink', i)            # 14101e 1a1334 292657 3f4186 7162bd
WA = lambda i: C('water', i)           # 0e153b 1d3775 24559b 3e88ca 6ab3e4 b4e4f2
ICE = lambda i: C('ice', i)            # 3e88ca 6ab3e4 b4e4f2 e8fffb
WD = lambda i: C('wood', i)


# ====================================================================== F1 foundry_floor
class FoundryFloor(FloorBase):
    """Riveted iron plate: one bevelled plate per tile (lit north-west, dark joint south-east), four rivets, a cool
    mid blue-grey with a little warm rust. Variants: tread plate, a glowing grating, scorched plate, a rust streak,
    a bolted patch, a drain."""
    id = 'foundry_floor'
    nvariants = 7
    weights = [24, 3, 2, 2, 2, 2, 1]
    edge = K(0)

    def make_texture(self, frame, variant):
        t = blank(K(2))
        for y in range(16):
            for x in range(16):
                if x == 15 or y == 15:
                    c = K(0)
                elif x == 14 or y == 14:
                    c = K(1)
                elif x == 0 or y == 0:
                    c = K(3)
                else:
                    c = K(2)
                    n = h32(x, y, 6101) % 53
                    if n == 0:
                        c = K(3)
                    elif n == 1:
                        c = K(1)
                    elif n == 2 and (x + y) % 2 == 0:
                        c = RR(1)
                t[y][x] = c
        for (rx, ry) in ((3, 3), (11, 3), (3, 11), (11, 11)):
            t[ry][rx] = K(5)
            t[ry][rx + 1] = K(3)
            t[ry + 1][rx] = K(3)
            t[ry + 1][rx + 1] = K(0)
        if variant == 1:
            # tread plate: raised diagonal diamonds between the rivets
            for (x, y) in ((7, 5), (8, 6), (7, 7), (8, 8), (9, 9), (6, 8), (5, 9), (6, 10), (10, 6), (9, 5)):
                t[y][x] = K(3)
                if y + 1 < 14:
                    t[y + 1][x] = K(1)
        elif variant == 2:
            # a floor grating over the furnace below: dark slats with a hot glow in the gaps
            for y in range(3, 13):
                for x in range(3, 13):
                    if y % 2 == 1:
                        t[y][x] = FI(1) if (x + y) % 5 else RR(2)
                    else:
                        t[y][x] = K(1)
            for y in range(3, 13):
                t[y][3] = K(4)
                t[y][12] = K(0)
            for x in range(3, 13):
                t[2][x] = K(4)
                t[13][x] = K(0)
            t[7][7] = FI(3)
            t[7][8] = FI(2)
        elif variant == 3:
            # scorched plate: darkened, a few embers, a hairline split
            for y in range(1, 14):
                for x in range(1, 14):
                    if t[y][x] in (K(2), K(3)) and h32(x, y, 6103) % 3 != 0:
                        t[y][x] = K(1)
            for (x, y) in ((6, 6), (7, 7), (7, 8), (8, 9), (8, 10)):
                t[y][x] = K(0)
            t[7][6] = RR(2)
            t[9][10] = FI(1)
        elif variant == 4:
            # a rust streak running down from a rivet
            for k in range(8):
                t[5 + k][4 if k < 5 else 5] = RR(1) if k % 3 else EA(1)
            t[4][4] = RR(2)
            t[12][5] = EA(2)
        elif variant == 5:
            # a bolted patch plate laid over the plate
            for y in range(4, 11):
                for x in range(5, 13):
                    t[y][x] = K(3) if (y == 4 or x == 5) else (K(1) if (y == 10 or x == 12) else K(2))
            for (x, y) in ((6, 5), (11, 5), (6, 9), (11, 9)):
                t[y][x] = K(5)
        elif variant == 6:
            # a drain: a dark round hole with a bright iron lip
            for y in range(16):
                for x in range(16):
                    d = math.hypot(x - 7.5, y - 7.5)
                    if d < 2.6:
                        t[y][x] = DARK if d < 1.7 else SD(1)
                    elif d < 3.9:
                        t[y][x] = K(5) if (x + y) % 2 == 0 else K(4)
        return t


# ====================================================================== F2 ash_floor
class AshFloor(FloorBase):
    """Soot-dark warm flagstone in running bond (16 x 8 stones), a thin dark joint, a lit top edge, a dusting of
    pale ash. Variants: an ash drift, a soot stain, a crack, an ember crack, rubble, a small vent."""
    id = 'ash_floor'
    nvariants = 7
    weights = [22, 3, 2, 2, 2, 2, 1]
    edge = SD(0)

    def make_texture(self, frame, variant):
        t = blank(SW(1))
        for y in range(16):
            for x in range(16):
                row = y // 8
                ly = y % 8
                jx = 0 if row == 0 else 8
                lx = (x - jx) % 16
                if ly == 7:
                    c = SW(0)
                elif lx == 0:
                    c = SW(0)
                elif ly == 0:
                    c = SW(2) if (x + y) % 3 else SW(1)
                elif lx == 1:
                    c = SW(1)
                else:
                    c = SW(1)
                    n = h32(x, y, 6201) % 29
                    if n == 0:
                        c = SW(2)
                    elif n == 1:
                        c = SW(0)
                    elif n == 2 and (x + y) % 2 == 0:
                        c = SW(3)
                t[y][x] = c
        if variant == 1:
            # an ash drift banked against the joint: pale wedge, dithered edge
            for y in range(1, 7):
                for x in range(2, 14):
                    d = (x - 2) * 0.35 + (6 - y) * 0.9
                    if d < 2.2 and t[y][x] == SW(1):
                        t[y][x] = SW(3)
                    elif d < 3.4 and (x + y) % 2 == 0 and t[y][x] == SW(1):
                        t[y][x] = SW(2)
        elif variant == 2:
            for y in range(9, 15):
                for x in range(9, 16):
                    if (x + y) % 2 == 0 and t[y][x] in (SW(1), SW(2)):
                        t[y][x] = SD(1)
            t[11][11] = SD(0)
            t[12][12] = SD(0)
        elif variant == 3:
            for (x, y) in ((3, 1), (3, 2), (4, 3), (5, 3), (5, 4), (6, 5)):
                t[y][x] = SD(0)
            t[2][4] = SW(3)
        elif variant == 4:
            for (x, y) in ((9, 9), (10, 10), (10, 11), (11, 12), (12, 12), (12, 13)):
                t[y][x] = SD(0)
            t[10][9] = RR(2)
            t[11][10] = FI(1)
            t[12][11] = RR(2)
            t[13][12] = FI(2)
        elif variant == 5:
            stamp_in(t, ['.ab.', 'abbc', '.bc.'], 4, 3, {'a': SW(3), 'b': SW(2), 'c': SD(1)})
            stamp_in(t, ['ab', 'bc'], 11, 10, {'a': SW(3), 'b': SW(2), 'c': SD(1)})
        elif variant == 6:
            for y in range(3, 7):
                for x in range(4, 12):
                    t[y][x] = SD(0) if (y % 2 == 0) else SW(0)
            for x in range(4, 12):
                t[2][x] = SW(3)
                t[7][x] = SD(1)
            t[4][6] = RR(2)
            t[4][9] = RR(2)
        return t


# ====================================================================== F3 crucible_floor
class CrucibleFloor(FloorBase):
    """Black basalt slabs under a bronze inlay grid: a one-pixel bronze line on the north and west edge of every tile
    (so the lines join across the floor), a bronze lozenge where four lines cross. Variants carry a ring, a star,
    a glowing crack, embers, a bronze rivet plate."""
    id = 'crucible_floor'
    nvariants = 7
    weights = [22, 3, 2, 2, 2, 2, 2]
    edge = SD(0)

    def make_texture(self, frame, variant):
        t = blank(K(1))
        for y in range(16):
            for x in range(16):
                c = K(1)
                n = h32(x, y, 6301) % 31
                if n == 0:
                    c = K(2)
                elif n == 1 or n == 2:
                    c = K(0)
                if x == 15 or y == 15:
                    c = K(0)
                t[y][x] = c
        for i in range(16):
            t[0][i] = GD(0)
            t[i][0] = GD(0)
            if i % 8 == 4:
                t[0][i] = GD(1)
                t[i][0] = GD(1)
            if i > 0:
                t[1][i] = SD(0) if i % 2 == 0 else K(0)
                t[i][1] = SD(0) if i % 2 == 0 else K(0)
        # lozenge at the crossing, drawn at the tile's north-west corner (wraps to the others when tiled)
        for (x, y, c) in ((0, 0, GD(3)), (1, 0, GD(2)), (0, 1, GD(2)), (15, 0, GD(1)), (0, 15, GD(1)), (2, 0, GD(1)), (0, 2, GD(1))):
            t[y][x] = c
        if variant == 1:
            # a bronze ring set in the slab
            for y in range(16):
                for x in range(16):
                    d = math.hypot(x - 8, y - 8)
                    if 4.2 <= d < 5.4:
                        t[y][x] = GD(1) if (x < 8 and y < 8) else GD(0)
                    elif 5.4 <= d < 6.0:
                        t[y][x] = K(0)
            t[8][8] = GD(3)
        elif variant == 2:
            # a four-point star inlay
            for k in range(-4, 5):
                t[8][8 + k] = GD(0) if abs(k) > 1 else GD(2)
                t[8 + k][8] = GD(0) if abs(k) > 1 else GD(2)
            for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
                t[8 + dy][8 + dx] = GD(2)
        elif variant == 3:
            # a crack with a dull red glow in it
            for (x, y) in ((3, 4), (4, 5), (5, 5), (6, 6), (7, 7), (8, 7), (9, 8), (10, 9), (11, 9), (12, 10)):
                t[y][x] = RR(1)
            for (x, y) in ((6, 6), (8, 7), (10, 9)):
                t[y][x] = RR(3)
            t[7][7] = FI(2)
        elif variant == 4:
            # settled embers
            for (x, y, c) in ((5, 6, FI(1)), (6, 6, RR(2)), (10, 10, FI(2)), (9, 11, RR(2)), (4, 11, FI(1)), (11, 5, RR(2))):
                t[y][x] = c
        elif variant == 5:
            # a bronze plate with four rivets
            for y in range(4, 12):
                for x in range(4, 12):
                    c = GD(1)
                    if y == 4 or x == 4:
                        c = GD(2)
                    elif y == 11 or x == 11:
                        c = GD(0)
                    t[y][x] = c
            for (x, y) in ((5, 5), (10, 5), (5, 10), (10, 10)):
                t[y][x] = GD(4)
        elif variant == 6:
            # three small dots, a smith's tally
            for (x, y) in ((6, 8), (8, 8), (10, 8)):
                t[y][x] = GD(2)
                t[y + 1][x] = GD(0)
        return t


# ====================================================================== wall bands
class FoundryTop(BandTop):
    """F1 band: an iron plate cap with seam lines and rivets, a bright iron front lip."""
    id = 'foundry_top'
    seed = 6410

    def make_texture(self, frame, variant):
        t = blank(K(3))
        for y in range(16):
            for x in range(16):
                n = h32(x, y, 6411) % 37
                if n == 0:
                    t[y][x] = K(2)
                elif n == 1:
                    t[y][x] = K(4)
        for i in range(16):
            t[8][i] = K(2)
            t[i][8] = K(2)
        for (rx, ry) in ((3, 3), (12, 3), (3, 12), (12, 12)):
            t[ry][rx] = K(5)
            t[ry + 1][rx + 1] = K(1) if ry + 1 < 16 and rx + 1 < 16 else K(2)
        if variant == 1:
            for y in range(1, 15):
                for x in range(1, 15):
                    if (x + y) % 4 == 0 and t[y][x] == K(3):
                        t[y][x] = K(4)
        elif variant == 2:
            for k in range(7):
                t[2 + k][4 + (k // 3)] = RR(1)
            t[1][4] = RR(2)
        elif variant == 3:
            for y in range(5, 12):
                for x in range(5, 12):
                    d = math.hypot(x - 8, y - 8)
                    t[y][x] = K(5) if d < 1.5 else (K(1) if d < 3.4 else t[y][x])
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [MT(3), K(5), K(4), K(2)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else K(1)
        if side == 'W':
            return K(1) if d < 1 else K(5)
        return DARK if d < 1 else K(2)


class GalleriesTop(BandTop):
    """F2 band: sooted flagstone cap with a pale ash lip."""
    id = 'galleries_top'
    seed = 6420

    def make_texture(self, frame, variant):
        t = blank(SW(1))
        for y in range(16):
            for x in range(16):
                n = h32(x // 2, y, 6421) % 9
                if n == 0:
                    t[y][x] = SW(2)
                elif n == 1:
                    t[y][x] = SW(0)
                elif n == 2 and (x + y) % 2 == 0:
                    t[y][x] = SD(1)
        for x in range(16):
            t[8][x] = SD(1) if x % 8 else SW(0)
        if variant == 1:
            for (x, y) in ((4, 3), (11, 12), (13, 5), (6, 11)):
                t[y][x] = SW(3)
        elif variant == 2:
            for y in range(1, 15):
                t[y][8] = SD(1)
                t[y][9] = SW(2) if y % 3 else SW(1)
        elif variant == 3:
            for (x, y) in ((6, 5), (7, 6), (8, 6), (9, 7)):
                t[y][x] = RR(1)
            t[6][7] = RR(2)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [SW(4), SW(3), SW(2), SW(1)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else SD(1)
        if side == 'W':
            return SD(1) if d < 1 else SW(3)
        return DARK if d < 1 else SD(1)


class CrucibleTop(BandTop):
    """F3 band: black basalt cap, a bronze front lip."""
    id = 'crucible_top'
    seed = 6430
    weights = [8, 2, 2, 2]

    def make_texture(self, frame, variant):
        t = blank(K(0))
        for y in range(16):
            for x in range(16):
                n = h32(x, y // 2, 6431) % 11
                if n == 0:
                    t[y][x] = K(1)
                elif n == 1:
                    t[y][x] = SD(0)
        for x in range(16):
            t[8][x] = SD(0) if x % 8 else K(1)
        if variant == 1:
            for k in range(8):
                t[2 + k][3 + k] = RR(1) if k % 3 else SD(0)
            t[5][6] = RR(3)
        elif variant == 2:
            for (x, y) in ((4, 4), (11, 4), (4, 11), (11, 11)):
                t[y][x] = GD(1)
                t[y][x + 1] = GD(0)
        elif variant == 3:
            for (x, y) in ((8, 6), (7, 7), (8, 7), (9, 7), (8, 8)):
                t[y][x] = GD(1)
            t[7][8] = GD(3)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GD(3), GD(2), GD(1), K(1)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else SD(0)
        if side == 'W':
            return SD(0) if d < 1 else GD(1)
        return DARK if d < 1 else SD(0)


# ====================================================================== the deep beyond
class FoundryDeep(DeepTop):
    id = 'foundry_out_top'
    weights = [8, 2, 2, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant == 1:
            for y in range(16):
                t[y][5] = SD(1)
            for x in range(16):
                t[9][x] = SD(1) if x % 4 else SD(0)
        elif variant == 2:
            t[4][4] = RR(1)
            t[10][11] = RR(1)
        elif variant == 3:
            for x in range(3, 13):
                t[6][x] = SD(1)
            t[6][8] = RR(1)
        elif variant == 4:
            for (x, y) in ((2, 11), (3, 11), (3, 12), (12, 3), (12, 4)):
                t[y][x] = SD(1)
        elif variant == 5:
            t[7][7] = FI(1)
            t[7][8] = RR(1)
        return t


class GalleriesDeep(DeepTop):
    id = 'galleries_out_top'
    weights = [7, 3, 2, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant in (1, 2):
            x0, y0, w, h = (3, 3, 10, 9) if variant == 1 else (4, 5, 8, 6)
            for yy in range(y0, y0 + h):
                if (yy - y0) % 2 == 0:
                    for xx in range(x0, x0 + w):
                        t[yy][xx] = SD(1)
            t[y0 + 1][x0 + 2] = RR(1)
        elif variant == 3:
            for y in range(16):
                if y % 3 != 2:
                    t[y][8] = SD(1)
        elif variant == 4:
            t[5][10] = RR(1)
            t[11][4] = SD(1)
        elif variant == 5:
            t[8][8] = FI(1)
        return t


class CrucibleDeep(DeepTop):
    id = 'crucible_out_top'
    weights = [9, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        specks = {1: [(3, 4), (4, 5)], 2: [(10, 9), (11, 8), (11, 9)], 3: [(6, 12), (7, 12)], 4: [(2, 2), (13, 13)]}
        for (x, y) in specks.get(variant, []):
            t[y][x] = RR(1)
        if variant == 5:
            t[7][7] = RR(2)
            t[7][8] = RR(1)
            t[8][7] = RR(1)
        return t


# ====================================================================== inner faces
class _Face(SplitFace):
    """16 x 32 design per tile: at(u, Y) with u = x % 16, Y 0..31. Rows 8..23 repeat for taller walls (period 16)."""
    base = None

    def head(self, x, y):
        return self.at(x % 16, y)

    def body(self, x, r):
        return self.at(x % 16, r if r >= 8 else 16 + r)

    def foot(self, x, f):
        return self.at(x % 16, 24 + f)

    def sides(self, col, x, y, left, top, right, bottom):
        if not left:
            if x == 0:
                return DARK if (y < 2 and not top) else self.edge_l
            if x == 1 and col != DARK:
                return self.edge_l2(col)
        if not right:
            if x == 15:
                return DARK if (y >= 15 and not bottom) else self.edge_r
            if x == 14 and col != DARK:
                return self.edge_r2(col)
        return col

    edge_l = K(1)
    edge_r = K(0)

    def edge_l2(self, col):
        return col

    def edge_r2(self, col):
        return col


def brick(u, Y, y0, shade=0.0, seed=6501):
    """Sooted red brick, courses 4 px high (3 brick + a mortar row), running bond with 8 px bricks.
    Period 16 in Y so tall walls repeat cleanly. shade 0..1 darkens (soot) with an ordered dither."""
    v = (Y - y0) % 4
    k = ((Y - y0) // 4) % 4
    off = (k % 2) * 4
    uu = (u + off) % 8
    if v == 3:
        col = SD(1)
    elif uu == 7:
        col = SD(1)
    else:
        tone = h32(((u + off) // 8) % 2, k, seed) % 4
        if v == 0:
            col = RR(3) if tone else RR(2)
        else:
            col = RR(2) if tone > 1 else RR(1) if tone == 0 else RR(2)
            if v == 2 and tone == 3:
                col = RR(1)
    if shade > 0 and fade(u, Y, shade):
        col = {RR(3): RR(2), RR(2): RR(1), RR(1): RR(0), SD(1): SD(0)}.get(col, col)
    return col


class FoundryFace(_Face):
    """F1: an iron girder cornice, sooted red brick, a riveted iron strap every 16 px, an iron plinth."""
    edge_l = K(1)
    edge_r = K(0)

    def at(self, u, Y):
        if Y <= 5:
            c = [DARK, K(3), MT(3), K(5), K(3), K(1)][Y]
            if Y in (2, 3) and u in (3, 12):
                return K(5) if Y == 2 else K(1)
            return c
        if Y >= 28:
            return [K(4), K(3), K(1), DARK][Y - 28]
        if Y == 27:
            return K(5)
        if 0 <= u <= 2:
            # the strap: lit left edge, shaded right edge, rivets every 8 rows
            if (Y - 6) % 8 == 3 and u == 1:
                return K(5)
            if (Y - 6) % 8 == 4 and u == 1:
                return K(1)
            return [K(4), K(3), K(2)][u]
        if u == 3:
            return SD(0)
        shade = max(0.0, (14 - Y) / 14.0) * 0.8
        return brick(u, Y, 6, shade)


class FurnaceSlit(_Face):
    """F1 style 1: the same brick, but each tile carries a tall furnace slit, glowing white-hot at its heart."""
    base = FoundryFace()

    def at(self, u, Y):
        c = self.base.at(u, Y)
        if Y <= 5 or Y >= 27 or u <= 3:
            return c
        if 7 <= u <= 11 and 9 <= Y <= 24:
            du = u - 7
            if u in (7, 11) or Y in (9, 24):
                return K(1) if (u == 7 or Y == 9) else K(0)
            if du == 1 and Y == 10:
                return K(3)
            # glow: bright core, falling off to the edges
            cy = (Y - 9) / 15.0
            core = 1.0 - abs(cy - 0.5) * 2
            if u == 9 and core > 0.45:
                return FI(5) if core > 0.8 else FI(4)
            if u in (8, 10):
                return FI(3) if core > 0.5 else (FI(2) if core > 0.2 else FI(1))
            return FI(2) if core > 0.6 else FI(1)
        if u in (6, 12) and 9 <= Y <= 24:
            return RR(1)           # the heat-darkened brick around the slit
        if (u in (5, 13)) and 10 <= Y <= 23 and (u + Y) % 2 == 0:
            return RR(1)
        return c


class PipeBrick(_Face):
    """F1 style 2: brick with a run of brass-collared iron pipes crossing it, a valve wheel on every other tile."""
    base = FoundryFace()

    def at(self, u, Y):
        c = self.base.at(u, Y)
        if Y <= 5 or Y >= 27:
            return c
        if 12 <= Y <= 15 or 18 <= Y <= 21:
            top = 12 if Y <= 15 else 18
            r = Y - top
            col = [K(5), K(4), K(3), K(1)][r]
            if u in (0, 1, 2):
                return [K(4), K(3), K(2)][u] if (Y - 6) % 8 not in (3, 4) else c
            if u in (7, 8) and r in (0, 1, 2, 3):
                return [GD(4), GD(3), GD(2), GD(1)][r]      # the brass collar
            return col
        if 16 <= Y <= 17 and u > 2:
            return SD(0) if Y == 16 else SD(1)             # shadow between the pipes
        return c


class FoundryPlate(_Face):
    """F1 style 3: riveted iron wall plates (a bulkhead), for the lift landing."""
    base = FoundryFace()

    def at(self, u, Y):
        if Y <= 5 or Y >= 27:
            return self.base.at(u, Y)
        v = (Y - 6) % 8
        if u == 0:
            return K(4) if v else K(5)
        if u == 15:
            return K(0)
        if v == 7:
            return K(0)
        if v == 0:
            return K(4)
        col = K(2) if (u + (Y - 6) // 8) % 7 else K(3)
        if (u, v) in ((3, 2), (12, 2), (3, 5), (12, 5)):
            return K(5)
        if (u, v) in ((4, 3), (13, 3), (4, 6), (13, 6)):
            return K(0)
        return col


class GalleriesFace(_Face):
    """F2: a soot-black stone frieze under a pale lip, ashlar courses, a louvred vent grille in every tile with an
    ember glow behind the slats and a soot streak above it."""
    edge_l = SD(1)
    edge_r = SD(0)

    def at(self, u, Y):
        if Y <= 5:
            return [DARK, SD(1), SW(3), SW(2), SW(1), SD(1)][Y]
        if Y >= 28:
            return [SW(2), SW(1), SD(1), DARK][Y - 28]
        if Y == 27:
            return SW(3)
        # ashlar, courses 8 high, offset by 8 on alternate courses
        k = ((Y - 6) // 8) % 2
        v = (Y - 6) % 8
        uu = (u + k * 8) % 16
        col = SW(1)
        if v == 7:
            col = SD(1)
        elif uu == 15:
            col = SD(1)
        elif v == 0:
            col = SW(2)
        else:
            n = h32(u, Y, 6601) % 17
            if n == 0:
                col = SW(2)
            elif n == 1:
                col = SW(0)
        # the vent grille: x 3..12, Y 9..22
        if 3 <= u <= 12 and 9 <= Y <= 22:
            if u in (3, 12) or Y in (9, 22):
                return SW(3) if (u == 3 or Y == 9) else SD(0)
            slat = (Y - 10) % 3
            if slat == 2:
                return K(4) if u < 8 else K(3)            # the slat catches the light
            if slat == 1:
                return K(1)
            # the gap between slats: a dull ember glow, brighter toward the middle
            mid = 1.0 - abs((Y - 15.5) / 6.5)
            return FI(1) if (mid > 0.4 and (u + Y) % 2 == 0) else RR(1)
        # soot rising from the grille
        if 4 <= u <= 11 and 5 <= Y <= 8:
            if fade(u, Y, 0.55):
                return SD(1) if Y > 6 else SD(0)
        return col


class BellowsArch(_Face):
    """F2 style 1: dark arched openings between buttresses, a faint orange breath in the dark."""
    base = GalleriesFace()

    def at(self, u, Y):
        c = self.base.at(u, Y)
        if Y <= 5 or Y >= 27:
            return c
        if 2 <= u <= 13 and 8 <= Y <= 26:
            cx, top = 7.5, 12.0
            if Y < top + 1:
                if (u - cx) ** 2 + (top + 1 - Y) ** 2 * 1.4 > 6.2 ** 2:
                    return c
            if u in (2, 13) or (Y < 15 and (u - cx) ** 2 + (top + 1 - Y) ** 2 * 1.4 > 5.2 ** 2):
                return SW(3) if u < 8 else SD(1)
            glow = (Y - 14) / 12.0
            if glow > 0 and (u + Y) % 2 == 0 and glow > 0.35:
                return RR(1) if glow < 0.75 else RR(2)
            return DARK if Y < 20 else SD(0)
        return c


class Lantern(_Face):
    """F2 style 2: a sooted wall with an iron lantern bracket and a small flame in every tile."""
    base = GalleriesFace()

    def at(self, u, Y):
        c = self.base.at(u, Y)
        if Y <= 5 or Y >= 27:
            return c
        if 5 <= u <= 10 and 9 <= Y <= 22:
            # bracket arm
            if Y == 10 and 5 <= u <= 9:
                return K(3)
            if u == 5 and 10 <= Y <= 12:
                return K(3)
            # lantern body
            if 6 <= u <= 9 and 12 <= Y <= 19:
                if u in (6, 9) or Y in (12, 19):
                    return K(2) if Y not in (12,) else K(4)
                fl = {(7, 14): FI(5), (8, 14): FI(4), (7, 15): FI(4), (8, 15): FI(3), (7, 16): FI(3), (8, 16): FI(2),
                      (7, 17): FI(1), (8, 17): FI(1)}
                return fl.get((u, Y), RR(1))
        # the glow pool on the wall around it
        d = math.hypot(u - 7.5, Y - 15.5)
        if 3.8 < d < 8.2 and Y > 5 and (u + Y) % 2 == 0 and fade(u, Y, 1.0 - d / 8.2):
            return SW(2)
        return c


class CrucibleFace(_Face):
    """F3: a bronze-capped frieze, basalt panels between bronze ribs, hairline cracks that glow dull red, a bronze
    plinth."""
    edge_l = K(0)
    edge_r = SD(0)

    def at(self, u, Y):
        if Y <= 5:
            return [DARK, GD(1), GD(3), GD(2), GD(1), SD(0)][Y]
        if Y >= 28:
            return [GD(2), GD(1), SD(0), DARK][Y - 28]
        if Y == 27:
            return GD(3)
        # the rib on u 0..2: lit left, bronze, shaded right, with a stud every 8 rows
        if u in (0, 1, 2):
            if (Y - 6) % 8 in (3, 4) and u == 1:
                return GD(4) if (Y - 6) % 8 == 3 else GD(0)
            return [GD(3), GD(2), GD(1)][u]
        if u == 3:
            return SD(0)
        # panel
        col = K(1)
        n = h32(u, Y, 6701) % 19
        if n == 0:
            col = K(2)
        elif n == 1:
            col = K(0)
        if u == 15 and Y > 6:
            col = K(0)
        # inset edge: a darker frame
        if Y in (7, 26) and 4 <= u <= 15:
            col = K(0)
        # hairline crack with a dull glow
        crack = {(9, 10): RR(2), (9, 11): RR(1), (10, 12): RR(1), (10, 13): RR(2), (11, 14): RR(1), (11, 15): RR(1),
                 (10, 16): RR(2), (9, 17): RR(1), (9, 18): RR(1), (8, 19): RR(2)}
        if (u, Y) in crack:
            return crack[(u, Y)]
        return col


class BellRelief(_Face):
    """F3 style 1: a bronze bell in relief on every panel."""
    base = CrucibleFace()

    def at(self, u, Y):
        c = self.base.at(u, Y)
        if Y <= 5 or Y >= 27 or u <= 3:
            return c
        bell = ['....aa....',
                '...abba...',
                '..abbbba..',
                '..abbbbc..',
                '..abbbbc..',
                '.abbbbbbc.',
                '.abbbbbbc.',
                'accccccccc',
                '....dd....']
        bx, by = 5, 12
        i, j = u - bx, Y - by
        if 0 <= j < len(bell) and 0 <= i < 10:
            ch = bell[j][i]
            if ch == 'a':
                return GD(3)
            if ch == 'b':
                return GD(2) if i < 5 else GD(1)
            if ch == 'c':
                return GD(1) if j < 7 else GD(0)
            if ch == 'd':
                return GD(4)
        return c


class MoltenSeam(_Face):
    """F3 style 2: a wide crack running the height of the panel, slag showing white-hot in it."""
    base = CrucibleFace()

    def at(self, u, Y):
        c = self.base.at(u, Y)
        if Y <= 5 or Y >= 27 or u <= 3:
            return c
        mid = 9 + int(round(math.sin(Y * 0.55) * 1.6))
        d = u - mid
        if d == 0:
            return FI(4) if Y % 5 else FI(5)
        if d in (-1, 1):
            return FI(2) if (Y + d) % 3 else FI(3)
        if d in (-2, 2):
            return RR(1) if (Y % 2) else RR(2)
        return c


class Frieze(_Face):
    """F3 style 3 (the Heartforge room): the bronze frieze of bells and hammers over plain panels."""
    base = CrucibleFace()

    def at(self, u, Y):
        c = self.base.at(u, Y)
        if Y <= 5 or Y >= 27 or u <= 3:
            return c
        if 8 <= Y <= 12 and 5 <= u <= 14:
            # hammer: head and haft, alternating with a small bell by tile parity (u 5..9 hammer, 10..14 bell)
            if u <= 9:
                if Y in (8, 9) and 5 <= u <= 9:
                    return GD(3) if Y == 8 else GD(2)
                if u == 7 and Y >= 10:
                    return GD(1)
            else:
                shape = {(12, 8): GD(3), (11, 9): GD(3), (12, 9): GD(2), (13, 9): GD(1), (11, 10): GD(2),
                         (12, 10): GD(2), (13, 10): GD(1), (10, 11): GD(1), (11, 11): GD(1), (12, 11): GD(1),
                         (13, 11): GD(0), (14, 11): GD(0), (12, 12): GD(4)}
                if (u, Y) in shape:
                    return shape[(u, Y)]
        return c


# ====================================================================== outer faces
class FoundryOut(OuterFace):
    shadow_line = K(1)
    edge_dark = K(1)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [K(4), K(3), K(1)][Y - 1]
        return brick(x, Y + 2, 6, 0.0, 6511)


class GalleriesOut(OuterFace):
    shadow_line = SD(1)
    edge_dark = SD(1)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [SW(3), SW(2), SW(1)][Y - 1]
        course = (Y - 4) // 7
        v = (Y - 4) % 7
        u = (x + (course % 2) * 6) % 12
        if v == 6 or u == 11:
            return SD(1)
        if v == 0 or u == 0:
            return SW(2)
        return SW(1)


class CrucibleOut(OuterFace):
    shadow_line = SD(0)
    edge_dark = SD(0)

    def material(self, x, Y):
        if 1 <= Y <= 2:
            return [GD(2), GD(1)][Y - 1]
        course = (Y - 3) // 6
        v = (Y - 3) % 6
        u = (x + (course % 2) * 8) % 16
        if v == 5 or u == 15:
            return SD(0)
        if v == 0:
            return K(2)
        if u == 7 and course == 1:
            return RR(1)
        return K(1)


FLOORS = [FoundryFloor(), AshFloor(), CrucibleFloor()]
WALLS = [
    ('foundry', FoundryTop(), FoundryFace(), FoundryDeep(), FoundryOut()),
    ('galleries', GalleriesTop(), GalleriesFace(), GalleriesDeep(), GalleriesOut()),
    ('crucible', CrucibleTop(), CrucibleFace(), CrucibleDeep(), CrucibleOut()),
]
FACE_STYLES = {
    'foundry': [None, [FurnaceSlit()], [PipeBrick()], [FoundryPlate()]],
    'galleries': [None, [BellowsArch()], [Lantern()]],
    'crucible': [None, [BellRelief()], [MoltenSeam()], [Frieze()]],
}
# rooms pinned by a cell of their wall run (x, y, style); the other runs cycle in reading order
FACE_PLAN = {
    'foundry': {'foundry_f1': {'cycle': [1, 0, 2, 3]}},
    'galleries': {'foundry_f2': {'cycle': [1, 0, 2]}},
    'crucible': {'foundry_f3': {'cycle': [1, 0, 2]}, 'foundry_heart': {'cycle': [3]}},
}
