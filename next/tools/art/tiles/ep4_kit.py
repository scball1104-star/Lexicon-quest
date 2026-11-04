"""The Sunken Keep (Episode 4) floor terrains, wall systems, canal kit and tide water -> assets/tiles/ep4.png
(E4-tiles, EPISODE4_PLAN 9.1, 4.4 and 5.1). Imported by ep4.py.

Same per-floor kit approach as the Ashen Foundry (forge_kit.py): each floor has its floor terrain, a wall band
(<sys>_top), an inner face (<sys>_face), the deep beyond its walls (<sys>_out_top) and an outer face under a band's
south lip (<sys>_out_face). Three floors, three looks you can name from a phone screenshot:

  F1 The Tidegate Causeway   causeway_floor: grey flagstones with dark green moss in every joint (green-veined), wet
                             sheen. causeway: dressed grey-green ashlar, a bright capstone lip, algae below the tide
                             marks.
  F2 Archives Below Water    keep_archive_floor: dark teal glazed tiles under soaked plank runners (renamed from the
                             plan's `archive_floor`, an Episode 1 id). archive_stacks: walls of drowned bookshelves,
                             the bottom shelf swollen and teal-stained.
  F3 The Court of Witnesses  witness_floor: white marble slabs, a gold inlay grid, verdigris where water stood.
                             witness: marble panels between gold pilasters, a green waterline at the plinth.

Every inner face carries the two tide marks at the same rows (a 2-row face, Y 0..31): mark 1 (the walkway height) at
Y 26, mark 2 (the gallery height) at Y 18, each a dark weed line with a pale scum line above it and a darker wet band
under it, so a player learns "water comes up to here" from any wall.

Canal kit (shared by the three floors):
  canal_floor        A2 fill: the drained channel floor (height 0), pale wet stone, puddles, dark weed strands, a dark
                     weed line along its edge (the mark where the water stood).
  canal_stair_s/_n/_e/_w   16 x 16 tiles, collision none: three treads going DOWN toward the named side.
  ledge_face, ledge_face_marble   line16 strips, collision solid: the 1-tile drop face between two heights (the
                     high floor's edge seen from the front), with the mark-1 weed line and a wet foot.
  tide_water         A1, 3 frames, collision water, kind hole: turquoise water drawn over flooded cells, a dark band
                     under a north bank, a bright meniscus rim and foam against every other edge.
Field terrains (the Flood Road): flood_grass (waterlogged grass, puddles), mud_path (wet rutted mud).
Town terrain: marble_walk (Valewyn's pavement, the plaza's coursed stones in marble).
"""
import math
from pxlib import Canvas, C, DARK, WHITE, rnd, h32, SH, hexc, profile1d
from autotile import EdgeSpec, full_nb
from terrain import Terrain, Water, Grass, Dirt, Plaza, blank, stamp_in, voronoi16, scatter
from archive_floors import FloorBase, BandTop, DeepTop, SplitFace, OuterFace, fade

K = lambda i: C('stone_cool', i)      # 251d34 2e2b4c 4c445c 66637f 8e8997 b3b6c4
SW = lambda i: C('stone_warm', i)     # 2e2b4c 584951 7e6d6e a18f85 cfb89c ebdfc8
GR = lambda i: C('roof_green', i)     # 1b2332 1c3730 285743 397951 4f9e6e
G = lambda i: C('grass', i)           # 1c3730 2a532f 427330 5a9032 84ad39 b6cc58
CY = lambda i: C('magic_cyan', i)     # 1d3775 317aa1 2ec4d0 8af0e8 e8fffb
WA = lambda i: C('water', i)          # 0e153b 1d3775 24559b 3e88ca 6ab3e4 b4e4f2
GD = lambda i: C('gold', i)           # 482826 8f5533 c38334 eba14d f9d77a fff7d6
MT = lambda i: C('metal', i)          # 2e2b4c 66637f b3b6c4 e2e0de f6f4ee
SD = lambda i: C('shadow', i)         # 14101e 251d34 2e2b4c 4c445c
WD = lambda i: C('wood', i)           # 2d1b1f 482826 6e3d2c 8f5533 b87942 d69c57
RR = lambda i: C('roof_red', i)       # 2d1b1f 571f28 87332e b34532 e06b39 eba14d
RB = lambda i: C('roof_blue', i)      # 0e153b 1d2a67 2c4797 4064b9 6891d9
EA = lambda i: C('earth', i)          # 2d1b1f 482826 6a4532 896042 ae8458
INK = lambda i: C('ink', i)

# ---------------------------------------------------------------------- the four colours the master palette lacks
# (reported by E4-tiles; ep4.py snaps the sheet to palette.json PLUS these): a deep and a mid turquoise for the tide
# water (magic_cyan jumps from #1d3775 navy to #2ec4d0 bright with nothing between) and the sealing-wax reds of the
# forged notices (roof_red is brick orange; a wax seal must read crimson against white paper at phone scale).
EXTRA = ['#123f4c', '#1a6f7a', '#a3202c', '#d8434a']
TQ = lambda i: hexc(EXTRA[max(0, min(1, i))])          # 0 deep turquoise, 1 mid turquoise
WX = lambda i: hexc(EXTRA[2 + max(0, min(1, i))])      # 0 wax red, 1 wax highlight


def tq(i):
    """The turquoise water ramp: 0 deep, 1 mid, 2 bright, 3 crest, 4 foam."""
    return [TQ(0), TQ(1), CY(2), CY(3), CY(4)][max(0, min(4, i))]


# ---------------------------------------------------------------------- the tide-mark rows (2-row faces, Y 0..31)
MARK2_Y = 18
MARK1_Y = 26


def tide_marks(Y, col, wet_dark, x=0):
    """Apply the two tide marks to a face colour at row Y: a weed line, a pale scum line above it, a wet band below."""
    if Y == MARK1_Y or Y == MARK2_Y:
        return GR(2) if (x * 7 + Y) % 4 else GR(1)
    if Y == MARK1_Y - 1 or Y == MARK2_Y - 1:
        return GR(4) if (x + Y) % 2 == 0 else GR(3)
    if MARK1_Y < Y <= MARK1_Y + 2:
        return wet_dark(col)
    if MARK2_Y < Y <= MARK2_Y + 1 and (x + Y) % 2 == 0:
        return wet_dark(col)
    return col


# ====================================================================== F1 causeway_floor
class CausewayFloor(FloorBase):
    """Big grey flagstones in two courses (7 and 9 px) of uneven widths, dark green moss in every joint (the 'green
    veins'). Only every other slab is dressed (a lit north lip and a shaded foot) so the floor stays quieter than the
    actors. Variants (rare): a puddle, an iron drain, a brass mooring ring, a moss cushion, a carved tide notch, a
    cracked slab."""
    id = 'causeway_floor'
    nvariants = 7
    weights = [64, 4, 2, 1, 3, 2, 2]
    edge = GR(0)
    SLABS = [(0, 7, [(0, 9), (9, 7)]), (7, 9, [(4, 6), (10, 10)])]

    def make_texture(self, frame, variant):
        t = blank(GR(1))
        k = 0
        for ri, (y0, h, row) in enumerate(self.SLABS):
            for si, (x0, w) in enumerate(row):
                dressed = (k % 2 == 0)
                dark = h32(ri, si, 4103) % 3 == 0
                base = K(2) if dark else K(3)
                k += 1
                for yy in range(h - 1):
                    for xx in range(w - 1):
                        X, Y = (x0 + xx) % 16, (y0 + yy) % 16
                        c = base
                        if dressed and yy == 0 and xx < w - 2:
                            c = K(4) if not dark else K(3)
                        elif dressed and yy == h - 2:
                            c = K(2) if not dark else K(1)
                        else:
                            n = h32(X, Y, 4104) % 53
                            if n == 0:
                                c = K(4)
                            elif n == 1:
                                c = K(2) if not dark else K(1)
                        t[Y][X] = c
                for yy in range(h):
                    X, Y = (x0 + w - 1) % 16, (y0 + yy) % 16
                    t[Y][X] = GR(2) if h32(X, Y, 4105) % 4 == 0 else GR(1)
                for xx in range(w):
                    X, Y = (x0 + xx) % 16, (y0 + h - 1) % 16
                    t[Y][X] = GR(2) if h32(X, Y, 4106) % 4 == 0 else GR(1)
        if variant == 1:
            for y in range(2, 6):
                for x in range(2, 9):
                    d = ((x - 5.3) / 3.4) ** 2 + ((y - 3.8) / 1.7) ** 2
                    if d < 1.0:
                        t[y][x] = TQ(0) if (y == 2 or d > 0.75 and y < 4) else TQ(1)
            t[4][6] = CY(2)
        elif variant == 2:
            for y in range(9, 14):
                for x in range(11, 16):
                    c = K(1) if (x % 2 == 0) else SD(0)
                    if y in (9, 13) or x in (11, 15):
                        c = K(4) if (y == 9 or x == 11) else K(0)
                    t[y][x] = c
        elif variant == 3:
            for y in range(8, 16):
                for x in range(9, 16):
                    d = math.hypot(x - 12.5, y - 11.5)
                    if 1.8 <= d < 2.9:
                        t[y][x] = GD(3) if (y < 11.5 and x < 13) else GD(1)
                    elif 2.9 <= d < 3.4 and y > 11:
                        t[y][x] = SD(1)
            t[9][12] = GD(4)
        elif variant == 4:
            for (x, y) in ((8, 6), (8, 5), (7, 6), (9, 7), (10, 7), (8, 7), (3, 14), (4, 15), (13, 15), (12, 14)):
                t[y][x] = GR(3) if (x + y) % 2 else GR(2)
            t[6][9] = GR(4)
        elif variant == 5:
            for x in range(11, 15):
                t[10][x] = K(1)
                t[11][x] = K(4)
            t[13][12] = K(1)
            for x in (11, 13):
                t[8][x] = K(1)
        elif variant == 6:
            for (x, y) in ((11, 9), (12, 10), (12, 11), (13, 12), (14, 13)):
                t[y][x] = GR(1)
            t[11][13] = K(4)
        return t


# ====================================================================== F2 keep_archive_floor
class ArchiveFloor(FloorBase):
    """Drowned glazed tiles, 8 x 8: deep teal and slate alternating on a diagonal, each with a faint glaze lip on its
    north-west edge, dark grout. Low contrast on purpose (the floor sits under 0.45 darkness and must stay quieter than
    the foes). Variants (rare): a soaked plank runner, a floating page, a broken tile showing black water, a run ink
    stain, a sunk book, a brass grate."""
    id = 'keep_archive_floor'
    nvariants = 7
    weights = [56, 4, 3, 2, 2, 2, 1]
    edge = SD(0)

    def make_texture(self, frame, variant):
        t = blank(SD(1))
        for y in range(16):
            for x in range(16):
                tx, ty = x // 8, y // 8
                u, v = x % 8, y % 8
                teal = (tx + ty) % 2 == 0
                if u == 7 or v == 7:
                    c = SD(1)
                elif u == 0 or v == 0:
                    c = (TQ(1) if v == 0 else TQ(0)) if teal else K(2)
                else:
                    c = TQ(0) if teal else SD(2)
                    n = h32(x, y, 4201) % 29
                    if n == 0:
                        c = SD(1)
                    elif n == 1 and teal:
                        c = TQ(1)
                t[y][x] = c
        if variant == 1:
            for y in range(5, 11):
                for x in range(16):
                    c = WD(2)
                    if y == 5:
                        c = WD(3)
                    elif y in (7, 10):
                        c = WD(0)
                    elif y == 8:
                        c = WD(2) if x % 5 else WD(1)
                    t[y][x] = c
            for (x, y) in ((3, 6), (12, 6), (7, 9)):
                t[y][x] = K(3)
        elif variant == 2:
            for y in range(5, 10):
                for x in range(4, 11):
                    c = SW(4) if y > 5 else SW(5)
                    if x == 10 or y == 9:
                        c = SW(3)
                    t[y][x] = c
            for x in range(5, 9):
                t[7][x] = INK(3)
                if x % 2:
                    t[8][x] = INK(4)
        elif variant == 3:
            for y in range(10, 14):
                for x in range(2, 7):
                    d = (x - 4) ** 2 + (y - 11.8) ** 2 * 1.4
                    if d < 5.0:
                        t[y][x] = DARK if d > 2.2 else TQ(0)
            t[11][4] = TQ(1)
            t[10][7] = K(2)
        elif variant == 4:
            for (x, y) in ((9, 3), (10, 3), (9, 4), (10, 4), (11, 4), (10, 5), (10, 6), (11, 7)):
                t[y][x] = INK(2)
            t[3][9] = INK(3)
        elif variant == 5:
            for y in range(9, 14):
                for x in range(9, 15):
                    c = RB(1)
                    if x in (9, 14) or y in (9, 13):
                        c = SD(0)
                    elif x == 11:
                        c = GD(1)
                    t[y][x] = c
        elif variant == 6:
            for y in range(4, 11):
                for x in range(4, 11):
                    c = GD(1) if (x % 2 == 0) else SD(0)
                    if y in (4, 10) or x in (4, 10):
                        c = GD(2) if (y == 4 or x == 4) else GD(0)
                    t[y][x] = c
        return t


# ====================================================================== F3 witness_floor
class WitnessFloor(FloorBase):
    """White marble slabs, one per tile, a soft grey vein, a pale grey joint; a gold stud where four slabs meet and a
    short gold tick mid-joint, so the inlay reads as a pattern, not as graph paper. Variants (rare): a gold star,
    verdigris where water stood, a crack, the open-book seal in gold, a damp sheen, a gold ring."""
    id = 'witness_floor'
    nvariants = 7
    weights = [60, 2, 4, 2, 1, 3, 1]
    edge = K(3)

    def make_texture(self, frame, variant):
        t = blank(MT(3))
        for y in range(16):
            for x in range(16):
                c = MT(3)
                v = math.sin((x * 0.55 + y * 0.9) + math.sin(y * 0.4) * 1.6)
                if v > 0.95:
                    c = MT(2)
                if h32(x, y, 4301) % 61 == 0:
                    c = MT(4)
                if x == 15 or y == 15:
                    c = K(5)
                elif x == 0 or y == 0:
                    c = MT(4)
                t[y][x] = c
        for (x, y) in ((15, 15), (0, 15), (15, 0)):
            t[y][x] = GD(2)
        t[0][0] = GD(4)
        for (x, y) in ((7, 15), (8, 15), (15, 7), (15, 8)):
            t[y][x] = GD(3) if (x + y) % 2 else GD(2)
        if variant == 1:
            for k in range(-3, 4):
                t[8][8 + k] = GD(3) if abs(k) < 2 else GD(2)
                t[8 + k][8] = GD(3) if abs(k) < 2 else GD(2)
            t[8][8] = GD(5)
        elif variant == 2:
            for y in range(10, 15):
                for x in range(1, 15):
                    if fade(x, y, (y - 10) / 5.0 + 0.1):
                        t[y][x] = GR(4)
            for x in range(1, 15):
                if x % 3:
                    t[10][x] = GR(4)
        elif variant == 3:
            for (x, y) in ((4, 3), (5, 4), (5, 5), (6, 6), (7, 6), (8, 7), (8, 8), (9, 9), (10, 10)):
                t[y][x] = K(5)
        elif variant == 4:
            for x in range(4, 13):
                for y in range(6, 11):
                    if abs(x - 8) <= 4 and y >= 6 + abs(x - 8) // 3:
                        t[y][x] = GD(3) if x != 8 else GD(1)
            for x in range(4, 13):
                t[10][x] = GD(1)
        elif variant == 5:
            for k in range(5):
                t[4 + k][5 + k] = MT(4)
            t[6][7] = CY(3)
        elif variant == 6:
            for y in range(16):
                for x in range(16):
                    d = math.hypot(x - 8, y - 8)
                    if 2.3 <= d < 3.2:
                        t[y][x] = GD(3) if (x + y) % 2 else GD(2)
        return t


# ====================================================================== wall bands
class CausewayTop(BandTop):
    """F1 band: wet capstones in long courses with moss in the joints, a bright stone lip."""
    id = 'causeway_top'
    seed = 4410
    weights = [7, 2, 2, 2]

    def make_texture(self, frame, variant):
        t = blank(K(3))
        for y in range(16):
            for x in range(16):
                course = y // 8
                u = (x + course * 5) % 16
                if y % 8 == 7 or u == 15:
                    t[y][x] = GR(1) if (x + y) % 3 else GR(2)
                elif y % 8 == 0:
                    t[y][x] = K(4)
                else:
                    n = h32(x, y, 4411) % 29
                    t[y][x] = K(2) if n == 0 else (K(4) if n == 1 else K(3))
        if variant == 1:
            for (x, y) in scatter(4412, 6, 2, 1, 15):
                t[y][x] = GR(3)
        elif variant == 2:
            t[4][4] = GD(1)
            t[4][5] = GD(3)
            t[5][4] = GD(0)
        elif variant == 3:
            for x in range(3, 13):
                t[11][x] = K(5) if x % 3 else K(4)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [MT(3), K(5), K(4), K(2)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else GR(1)
        if side == 'W':
            return GR(1) if d < 1 else K(5)
        return DARK if d < 1 else K(2)


class StacksTop(BandTop):
    """F2 band: the tops of the bookcases, dark oak boards with a brass rail on the front."""
    id = 'archive_stacks_top'
    seed = 4420

    def make_texture(self, frame, variant):
        t = blank(WD(1))
        for y in range(16):
            for x in range(16):
                b = y // 4
                if y % 4 == 3:
                    t[y][x] = WD(0)
                else:
                    n = h32(x // 3, b, 4421) % 5
                    t[y][x] = WD(2) if n == 0 else WD(1)
                    if (x + b * 7) % 13 == 0:
                        t[y][x] = WD(0)
        if variant == 1:
            # a stack of ledgers left on top
            for y in range(4, 10):
                for x in range(4, 11):
                    t[y][x] = [RB(2), GR(2), RR(2)][(y - 4) // 2] if x < 10 else SD(1)
            for x in range(4, 10):
                t[4][x] = SW(4)
        elif variant == 2:
            for (x, y) in ((6, 6), (7, 6), (6, 7)):
                t[y][x] = TQ(1)
        elif variant == 3:
            for x in range(2, 14):
                t[8][x] = GD(1)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GD(3), GD(2), WD(3), WD(1)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else WD(0)
        if side == 'W':
            return WD(0) if d < 1 else WD(3)
        return DARK if d < 1 else WD(0)


class WitnessTop(BandTop):
    """F3 band: white marble coping with a gold front lip."""
    id = 'witness_top'
    seed = 4430
    weights = [8, 2, 2, 2]

    def make_texture(self, frame, variant):
        t = blank(MT(2))
        for y in range(16):
            for x in range(16):
                if y % 8 == 7 or (x + (y // 8) * 8) % 16 == 15:
                    t[y][x] = K(4)
                elif y % 8 == 0:
                    t[y][x] = MT(3)
                elif h32(x, y, 4431) % 31 == 0:
                    t[y][x] = MT(3)
        if variant == 1:
            for (x, y) in ((5, 4), (10, 11)):
                t[y][x] = GD(3)
        elif variant == 2:
            for y in range(9, 15):
                for x in range(16):
                    if fade(x, y, (y - 9) / 7.0):
                        t[y][x] = GR(4)
        elif variant == 3:
            for (x, y) in ((4, 3), (5, 4), (6, 4), (7, 5)):
                t[y][x] = K(4)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GD(4), GD(3), MT(3), MT(2)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else K(4)
        if side == 'W':
            return K(4) if d < 1 else MT(4)
        return DARK if d < 1 else K(4)


# ====================================================================== the deep beyond
class CausewayDeep(DeepTop):
    """Beyond F1's walls: black flood water with slow turquoise glints and a drowned roof ridge or two."""
    id = 'causeway_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        for (x, y) in ((3, 5), (11, 12)):
            t[y][x] = SD(1)
        if variant == 1:
            for x in range(4, 11):
                t[8][x] = TQ(0)
            t[8][7] = TQ(1)
        elif variant == 2:
            for (x, y) in ((3, 3), (4, 3), (12, 10), (13, 10), (8, 13)):
                t[y][x] = TQ(0)
        elif variant == 3:
            # a drowned roof ridge
            for x in range(2, 14):
                y = 9 - min(x - 2, 13 - x) // 2
                t[y][x] = SD(2)
                t[y + 1][x] = SD(1)
        elif variant == 4:
            t[6][6] = TQ(1)
            t[6][7] = TQ(0)
        elif variant == 5:
            t[10][9] = CY(1)
        return t


class StacksDeep(DeepTop):
    """Beyond F2's walls: black water, the tops of drowned shelves, a floating page."""
    id = 'archive_stacks_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant == 1:
            for x in range(2, 14):
                t[7][x] = WD(0)
            t[8][2] = WD(0)
            t[8][13] = WD(0)
        elif variant == 2:
            for y in range(6, 9):
                for x in range(6, 10):
                    t[y][x] = SW(2) if y > 6 else SW(3)
        elif variant == 3:
            for (x, y) in ((4, 11), (5, 11), (11, 4)):
                t[y][x] = TQ(0)
        elif variant == 4:
            for y in range(3, 13):
                t[y][7] = WD(0)
        elif variant == 5:
            t[9][9] = GD(1)
        return t


class WitnessDeep(DeepTop):
    """Beyond F3's walls: the dark, with the faint ghost of a marble column top."""
    id = 'witness_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant == 1:
            for y in range(4, 16):
                t[y][7] = SD(1)
                t[y][8] = SD(2) if y < 8 else SD(1)
            for x in range(5, 11):
                t[4][x] = SD(2)
        elif variant == 2:
            for (x, y) in ((4, 4), (12, 11)):
                t[y][x] = SD(2)
        elif variant == 3:
            t[8][3] = GD(0)
            t[8][4] = GD(0)
        elif variant == 4:
            for x in range(3, 13):
                t[12][x] = SD(1)
        elif variant == 5:
            t[6][10] = TQ(0)
        return t


# ====================================================================== inner faces
class _Face(SplitFace):
    """16 x 32 design per tile: at(u, Y) with u = x % 16, Y 0..31 (head 0..7, body 8..23, foot 24..31)."""
    edge_l = K(1)
    edge_r = K(0)

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
        if not right:
            if x == 15:
                return DARK if (y >= 15 and not bottom) else self.edge_r
        return col


def _wet_k(col):
    return {K(5): K(4), K(4): K(3), K(3): K(2), K(2): K(1), K(1): K(0), MT(3): K(4)}.get(col, col)


def ashlar(u, Y, seed=4501):
    """F1 dressed ashlar: courses 8 px high (7 stone + a moss joint), stones 16 or 8 wide in running bond."""
    course = Y // 8
    v = Y % 8
    off = (course % 2) * 8
    uu = (u + off) % 16
    if v == 7:
        return GR(1) if (u + course) % 4 else GR(2)
    if uu == 15:
        return GR(1)
    tone = h32((u + off) // 16, course, seed) % 3
    base = [K(3), K(2), K(3)][tone]
    if v == 0:
        return K(4)
    if uu == 0:
        return K(4) if v < 4 else base
    if v == 6:
        return K(2) if base == K(3) else K(1)
    if h32(u, Y, seed + 1) % 37 == 0:
        return GR(2)
    return base


class CausewayFace(_Face):
    """F1: a moulded capstone cornice, dressed grey ashlar, the two tide marks with algae under mark 1, a plinth."""
    edge_l = K(1)
    edge_r = K(0)

    def at(self, u, Y):
        if Y <= 4:
            return [DARK, K(4), K(5), K(3), K(1)][Y] if (u % 8 or Y != 2) else K(4)
        if Y == 5:
            return K(0)
        if Y >= 30:
            return [K(1), DARK][Y - 30]
        col = ashlar(u, Y + 2)
        if Y > MARK1_Y + 2:
            col = GR(2) if (u + Y) % 3 == 0 else _wet_k(_wet_k(col))
        return tide_marks(Y, col, _wet_k, u)


class CulvertArch(CausewayFace):
    """F1 style: a low culvert arch with an iron grate, a thin trickle out of it."""
    def at(self, u, Y):
        base = CausewayFace.at(self, u, Y)
        cx = 7.5
        d = math.hypot((u - cx) / 6.0, (Y - 31) / 15.0)
        if Y >= 14 and d < 1.0:
            if d > 0.86:
                return K(4) if u < 8 else K(1)
            if u % 3 == 1:
                return K(2)
            return SD(0) if Y > 20 else DARK
        if Y >= 26 and u in (7, 8):
            return CY(3) if (Y % 2) else TQ(1)
        return base


class TideGauge(CausewayFace):
    """F1 style: a painted tide board, red and white stripes with the two marks lit gold."""
    def at(self, u, Y):
        base = CausewayFace.at(self, u, Y)
        if 4 <= u <= 11 and 7 <= Y <= 29:
            if u in (4, 11):
                return K(0)
            if Y in (MARK1_Y, MARK2_Y):
                return GD(4) if u in (5, 10) else GD(3)
            band = ((Y - 7) // 3) % 2
            c = MT(3) if band == 0 else WX(0)
            if u == 5:
                c = MT(4) if band == 0 else WX(1)
            if Y > MARK1_Y:
                c = _wet_k(c) if band == 0 else RR(1)
            return c
        return base


class BannerFace(CausewayFace):
    """F1 style: a Valewyn banner (deep blue, a gold crown) hung from the cornice, its hem stained by the water."""
    def at(self, u, Y):
        base = CausewayFace.at(self, u, Y)
        if 3 <= u <= 12 and 5 <= Y <= 23:
            if Y == 5:
                return GD(2)
            if u in (3, 12):
                return RB(0)
            tip = Y >= 21 and abs(u - 7.5) < (Y - 20) * 1.6
            if tip:
                return base
            c = RB(2) if u > 4 else RB(3)
            if u == 11:
                c = RB(1)
            # the crown
            if 8 <= Y <= 12 and 5 <= u <= 10:
                crown = (Y == 12 and 5 <= u <= 10) or (Y == 11 and 5 <= u <= 10) or (Y in (9, 10) and u in (5, 7, 8, 10)) or (Y == 8 and u in (5, 10))
                if crown:
                    return GD(4) if Y < 11 else GD(3)
            if Y >= 18:
                c = TQ(0) if (u + Y) % 2 else RB(1)
            return c
        return base


class LanternNiche(CausewayFace):
    """F1 style: an arched niche with a lit lantern (a warm accent and a light source)."""
    def at(self, u, Y):
        base = CausewayFace.at(self, u, Y)
        d = math.hypot((u - 7.5) / 4.0, (Y - 15) / 7.0)
        if 8 <= Y <= 21 and 4 <= u <= 11 and (Y >= 15 or d < 1.0):
            if u in (4, 11) or (Y < 15 and d > 0.82):
                return K(4) if u < 8 else K(1)
            if Y == 21:
                return K(4)
            if 6 <= u <= 9 and 12 <= Y <= 19:
                if Y == 12 or Y == 19:
                    return K(1)
                if u in (6, 9):
                    return GD(1)
                return GD(5) if Y in (14, 15) else GD(4)
            return SD(1) if Y > 17 else WD(1)
        return base


def shelf_books(u, Y, top, seed, drowned=False):
    """A shelf of book spines (rows top..top+6), spines 2 or 3 px wide in muted colours, a gap or a leaning book."""
    k = 0
    x = 0
    i = 0
    while x <= u:
        w = 2 + h32(i, seed) % 2
        if x + w > u:
            k = i
            break
        x += w
        i += 1
    r = h32(k, seed, 7) % 9
    pal = [RB(2), GR(2), RR(2), WD(3), K(3), RB(1), GR(3), RR(1), SW(3)]
    c = pal[r]
    hgt = 5 + h32(k, seed, 9) % 2
    yy = Y - top
    if r == 8 and h32(k, seed, 5) % 3 == 0:
        return WD(0)            # a gap on the shelf
    if yy < 6 - hgt:
        return WD(0)
    if u == x + (2 + h32(k, seed) % 2) - 1:
        c = {RB(2): RB(1), GR(2): GR(1), RR(2): RR(1), WD(3): WD(2), K(3): K(2), RB(1): RB(0), GR(3): GR(2),
             RR(1): RR(0), SW(3): SW(2)}.get(c, c)
    if yy == 6 - hgt + 1 and (u + k) % 3 == 0:
        c = GD(3)
    if drowned:
        c = {RB(2): TQ(0), GR(2): GR(1), RR(2): RR(1), WD(3): WD(1), K(3): K(1), RB(1): RB(0), GR(3): TQ(0),
             RR(1): RR(0), SW(3): GR(2), GD(3): GD(1)}.get(c, c)
    return c


class StacksFace(_Face):
    """F2: a wall of bookcases. Head: a carved oak cornice. Two shelves of books, then the bottom shelf, swollen and
    teal-stained, under the tide marks; the uprights every 16 px."""
    edge_l = WD(1)
    edge_r = WD(0)
    seed = 4601

    def at(self, u, Y):
        if Y <= 4:
            return [DARK, WD(4), WD(3), GD(2), WD(1)][Y]
        if Y == 5:
            return WD(0)
        if Y >= 30:
            return [WD(0), DARK][Y - 30]
        if u in (0, 15):
            c = WD(3) if u == 0 else WD(1)
            return tide_marks(Y, c, lambda q: {WD(3): WD(2), WD(1): WD(0)}.get(q, q), u)
        # shelves: boards at Y 13, 21, 29
        if Y in (13, 21, 29):
            return WD(3) if Y != 29 else WD(1)
        if Y in (14, 22):
            return WD(0)
        top = 6 if Y < 13 else (14 if Y < 21 else 22)
        col = shelf_books(u, Y, top + 1, self.seed + top, drowned=Y > MARK1_Y - 4)
        if Y == MARK2_Y or Y == MARK1_Y:
            return GR(1) if (u * 7 + Y) % 5 else GR(2)
        if Y == MARK2_Y - 1 or Y == MARK1_Y - 1:
            return GR(3) if (u + Y) % 3 == 0 else col
        if Y > MARK1_Y and col not in (WD(0),):
            return TQ(0) if (u + Y) % 2 else col
        return col


class LanternChainFace(StacksFace):
    """F2 style: a lantern hung on a chain in front of the shelves (warm light, a reflection pixel)."""
    def at(self, u, Y):
        base = StacksFace.at(self, u, Y)
        if u in (7, 8) and 5 <= Y <= 11:
            return MT(1) if (Y + u) % 2 else K(2)
        if 5 <= u <= 10 and 12 <= Y <= 19:
            if Y == 12 or Y == 19:
                return K(1) if 6 <= u <= 9 else base
            if u in (5, 10):
                return K(1)
            return GD(5) if Y in (14, 15, 16) and u in (7, 8) else GD(4)
        if Y == 20 and 6 <= u <= 9:
            return K(0)
        return base


class ScriptoriumWindow(StacksFace):
    """F2 style: a tall arched window of dark leaded glass where a shelf bay would be (teal, a moon glint)."""
    def at(self, u, Y):
        base = StacksFace.at(self, u, Y)
        d = math.hypot((u - 7.5) / 5.5, (Y - 12) / 6.5)
        if 3 <= u <= 12 and 6 <= Y <= 27 and (Y >= 12 or d < 1.0):
            if u in (3, 12) or (Y < 12 and d > 0.84) or Y == 27:
                return SW(3) if u < 8 else SW(1)
            if u in (7, 8) or Y in (17, 22):
                return K(1)
            c = TQ(1) if (u + Y) % 5 else CY(1)
            if (u, Y) in ((5, 10), (6, 9)):
                c = CY(3)
            if Y >= MARK1_Y - 1:
                c = TQ(0)
            return c
        return base


class CrateShelf(StacksFace):
    """F2 style: the middle shelf holds book crates lashed with rope (the crate pontoons' kin)."""
    def at(self, u, Y):
        base = StacksFace.at(self, u, Y)
        if 15 <= Y <= 20 and 2 <= u <= 13:
            if Y == 15 or u in (2, 13):
                return WD(4) if Y == 15 else WD(1)
            if Y == 20:
                return WD(1)
            if u in (7, 8):
                return WD(1)
            if Y == 17:
                return SW(4) if u % 2 else SW(3)
            return WD(3)
        return base


def marble_panel(u, Y):
    """F3: marble panels framed by gold pilasters at u 0 and 15 (2 px gold, 1 px shade)."""
    if u in (0, 15):
        return GD(3) if u == 0 else GD(1)
    if u in (1, 14):
        return GD(2) if u == 1 else K(4)
    v = math.sin((u * 0.7 + Y * 0.45) + math.sin(Y * 0.3) * 1.3)
    c = MT(3)
    if v > 0.92:
        c = MT(2)
    if u in (3, 12) and 7 <= Y <= 23:
        c = MT(2) if u == 12 else MT(4)
    if Y in (7, 23) and 3 <= u <= 12:
        c = MT(4) if Y == 7 else MT(2)
    return c


def _wet_m(col):
    return {MT(4): MT(3), MT(3): GR(4), MT(2): GR(3), GD(3): GD(2), GD(2): GD(1), K(4): GR(3)}.get(col, col)


class WitnessFace(_Face):
    """F3: a gold-edged cornice, white marble panels between gold pilasters, verdigris under mark 1, a dark plinth."""
    edge_l = K(4)
    edge_r = K(2)

    def at(self, u, Y):
        if Y <= 5:
            return [DARK, GD(4), GD(3), MT(4), MT(2), K(4)][Y]
        if Y >= 30:
            return [K(3), DARK][Y - 30]
        col = marble_panel(u, Y)
        if Y > MARK1_Y + 2:
            col = GR(3) if (u + Y) % 2 else GR(4)
        return tide_marks(Y, col, _wet_m, u)


class PrincipleRelief(WitnessFace):
    """F3 style: a carved bell under a dome (the principle stones' sign) in the panel, lined in gold."""
    def at(self, u, Y):
        base = WitnessFace.at(self, u, Y)
        if 4 <= u <= 11 and 8 <= Y <= 21:
            d = math.hypot((u - 7.5) / 3.6, (Y - 12.5) / 4.0)
            if Y <= 12 and d < 1.0:
                return GD(3) if d > 0.7 else MT(2)
            if 12 < Y <= 18 and abs(u - 7.5) <= 2.0 + (Y - 12) * 0.35:
                return GD(2) if abs(u - 7.5) > 1.0 + (Y - 12) * 0.35 else MT(2)
            if Y == 19 and 4 <= u <= 11:
                return GD(1)
            if Y == 20 and u in (7, 8):
                return GD(4)
        return base


class ArchWindow(WitnessFace):
    """F3 style: a tall arched window, night blue glass with a moon glint, gold tracery."""
    def at(self, u, Y):
        base = WitnessFace.at(self, u, Y)
        d = math.hypot((u - 7.5) / 5.0, (Y - 11) / 5.5)
        if 3 <= u <= 12 and 6 <= Y <= 24 and (Y >= 11 or d < 1.0):
            if u in (3, 12) or (Y < 11 and d > 0.82) or Y == 24:
                return GD(3) if u < 8 else GD(1)
            if u in (7, 8):
                return GD(2)
            c = RB(1) if Y > 14 else RB(2)
            if (u, Y) in ((5, 9), (6, 8), (5, 10)):
                c = MT(4)
            if (u * 3 + Y) % 9 == 0:
                c = RB(3)
            return c
        return base


class WitnessBanner(WitnessFace):
    """F3 style: a pale banner with the open book in gold (the Keepers' sign)."""
    def at(self, u, Y):
        base = WitnessFace.at(self, u, Y)
        if 3 <= u <= 12 and 6 <= Y <= 22:
            tip = Y >= 20 and abs(u - 7.5) < (Y - 19) * 1.8
            if tip:
                return base
            if Y == 6:
                return GD(2)
            if u in (3, 12):
                return K(3)
            c = RB(2) if u > 4 else RB(3)
            if 9 <= Y <= 13 and 4 <= u <= 11:
                if Y >= 10 + abs(u - 7.5) // 3:
                    return GD(4) if u not in (7, 8) else GD(2)
            return c
        return base


# ====================================================================== outer faces
class CausewayOut(OuterFace):
    shadow_line = K(1)
    edge_dark = K(1)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [K(4), K(3), K(1)][Y - 1]
        c = ashlar(x, Y + 3, 4511)
        if Y > 12:
            c = GR(1) if (x + Y) % 3 == 0 else _wet_k(c)
        return c


class StacksOut(OuterFace):
    shadow_line = WD(0)
    edge_dark = WD(0)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [GD(2), WD(3), WD(1)][Y - 1]
        if x % 16 in (0, 15):
            return WD(1)
        v = (Y - 4) % 8
        if v == 7:
            return WD(2)
        return shelf_books(x % 16, Y, (Y - 4) // 8 * 8 + 4, 4611, drowned=Y > 10)


class WitnessOut(OuterFace):
    shadow_line = K(3)
    edge_dark = K(3)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [GD(3), MT(3), MT(2)][Y - 1]
        c = marble_panel(x % 16, Y + 4)
        if Y > 10:
            c = _wet_m(c)
        return c


FLOORS = [CausewayFloor(), ArchiveFloor(), WitnessFloor()]
WALLS = [
    ('causeway', CausewayTop(), CausewayFace(), CausewayDeep(), CausewayOut()),
    ('archive_stacks', StacksTop(), StacksFace(), StacksDeep(), StacksOut()),
    ('witness', WitnessTop(), WitnessFace(), WitnessDeep(), WitnessOut()),
]
FACE_STYLES = {
    # a feature block followed by plain blocks: the feature appears every second or third tile along a run
    'causeway': [None, [CulvertArch(), CausewayFace()], [TideGauge(), CausewayFace(), CausewayFace()],
                 [BannerFace(), CausewayFace()], [LanternNiche(), CausewayFace(), CausewayFace()]],
    'archive_stacks': [None, [LanternChainFace(), StacksFace(), StacksFace()], [ScriptoriumWindow(), StacksFace()],
                       [CrateShelf(), StacksFace()]],
    'witness': [None, [PrincipleRelief(), WitnessFace()], [ArchWindow(), WitnessFace()],
                [WitnessBanner(), WitnessFace(), WitnessFace()]],
}
# rooms cycle styles in reading order (the W12 mechanism); the map agents may pin a run by cell
FACE_PLAN = {
    'causeway': {'ep4_keep_f1': {'cycle': [0, 2, 3, 1, 0, 4]}},
    'archive_stacks': {'ep4_keep_f2': {'cycle': [0, 1, 3, 2, 0]}},
    'witness': {'ep4_keep_f3': {'cycle': [0, 2, 1, 3, 2]}, 'ep4_keep_crown': {'cycle': [2, 3, 2]}},
}


# ====================================================================== canal kit
class CanalFloor(Terrain):
    """The drained channel floor (height 0): pale wet stone in big worn slabs, standing puddles, dark weed strands, and
    along every edge a dark weed line with a pale scum line (where the water stood). Drawn above the keep floors."""
    id = 'canal_floor'
    kind = 'fill'
    collision = 'none'
    nvariants = 5
    weights = [24, 3, 3, 1, 2]

    def __init__(self):
        super().__init__()
        self.specs = {'top': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb')}
        self.lab = voronoi16(4701, 2, 1, jitter=0.6, sx=1.0, sy=1.6)

    def make_texture(self, frame, variant):
        # pale wet stone in long slabs (8 px courses, joints offset), quiet, a sheen on the slab lips
        t = blank(K(4))
        for y in range(16):
            course = y // 8
            off = 5 if course else 0
            for x in range(16):
                u = (x + off) % 16
                if y % 8 == 7:
                    c = K(3)
                elif u == 15 or (course == 0 and u == 9):
                    c = K(3)
                elif y % 8 == 0:
                    c = K(5) if (x + y) % 3 else K(4)
                else:
                    c = K(4)
                    if h32(x, y, 4702) % 37 == 0:
                        c = K(3)
                t[y][x] = c
        # one short weed strand lying in the flow
        wx, wy = [(3, 11), (9, 4), (12, 12), (2, 3), (7, 13)][variant % 5]
        for k in range(3):
            t[wy + (1 if k == 1 else 0)][(wx + k) % 16] = GR(2) if k < 2 else GR(3)
        if variant == 1:
            for y in range(3, 7):
                for x in range(4, 12):
                    d = ((x - 7.6) / 3.8) ** 2 + ((y - 4.8) / 1.8) ** 2
                    if d < 1.0:
                        t[y][x] = TQ(0) if (y == 3 or (d > 0.7 and y < 5)) else TQ(1)
            t[5][9] = CY(2)
        elif variant == 2:
            for (x, y) in ((4, 4), (11, 10), (6, 13)):
                t[y][x] = K(3)
                t[y + 1][x] = K(5)
        elif variant == 3:
            # a stranded fish skeleton (a little joke for the curious)
            for x in range(5, 11):
                t[10][x] = MT(3)
            for x in (6, 8):
                t[9][x] = MT(3)
                t[11][x] = MT(3)
            t[9][4] = MT(3)
            t[11][4] = MT(3)
        elif variant == 4:
            for (x, y) in ((3, 5), (4, 5), (5, 6), (11, 12), (12, 12)):
                t[y][x] = GR(3)
        return t

    def pixel(self, c, x, y):
        if not c.i('top', x, y):
            return None
        d = c.f('top', x, y)
        s = c.side('top', x, y)
        if d < 1:
            return GR(1) if s in ('N', 'W') else GR(2)
        if d < 2:
            return GR(3) if (x + y) % 3 else GR(2)
        if d < 3 and s == 'N':
            return K(2)
        return self.tex(c, x, y)


def canal_stair(direction):
    """Three stone treads going DOWN toward `direction` (s, n, e, w), a lit nosing on each, weed on the lowest."""
    cv = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            # a = distance along the descent, 0 at the top of the flight
            a = {'s': y, 'n': 15 - y, 'e': x, 'w': 15 - x}[direction]
            b = {'s': x, 'n': x, 'e': y, 'w': y}[direction]
            step = min(2, a // 5)
            v = a % 5
            base = [K(4), K(3), K(2)][step]
            if v == 0 and a < 15:
                c = MT(3) if step == 0 else K(5 - step)
            elif v == 4:
                c = K(1) if step < 2 else K(0)
            else:
                c = base
                if h32(x, y, 4801) % 17 == 0:
                    c = K(2) if base != K(2) else K(1)
            if b in (0, 15):
                c = K(1)
            if step == 2 and v in (2, 3) and (b + a) % 3 == 0:
                c = GR(2)
            cv.set(x, y, c)
    return cv


def ledge_face_tile(i, marble=False):
    """line16 index i = N*1 + E*2 + S*4 + W*8: the 1-tile drop face of a higher floor (solid). Only E and W matter:
    an open end gets a corner. Top 2 px: the high floor's lit edge; then cut stone (or marble) with the mark-1 weed
    line at y 10 and a wet, weedy foot."""
    E = bool(i & 2)
    W = bool(i & 8)
    cv = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            if y == 0:
                c = MT(3) if not marble else GD(3)
            elif y == 1:
                c = K(4) if not marble else MT(4)
            elif y == 2:
                c = K(0) if not marble else K(4)
            else:
                if marble:
                    c = MT(3) if (x * 3 + y) % 11 else MT(2)
                    if x % 8 == 7:
                        c = K(4)
                else:
                    off = 4 if y >= 9 else 0
                    if y == 8 or (x + off) % 8 == 7:
                        c = GR(1)
                    else:
                        c = K(3) if y < 8 else K(2)
                        if y == 3:
                            c = K(4)
                if y == 10:
                    c = GR(1) if x % 5 else GR(2)
                elif y == 9:
                    c = GR(3) if x % 3 == 0 else c
                elif y > 10:
                    c = (GR(2) if (x + y) % 3 == 0 else (GR(3) if marble else K(1)))
                if y == 15:
                    c = SD(0)
            if not W and x == 0:
                c = K(4) if y < 10 else K(1)
            if not E and x == 15:
                c = K(0)
            cv.set(x, y, c)
    return cv


def ledge_lip_tile(i, marble=False):
    """line16 index i = N*1 + E*2 + S*4 + W*8 (bit set where the neighbour is also a lip): a solid stone coping seen
    from above, for a drop that faces north, east or west (where no face is visible): a 10 px kerb with a lit top
    edge, the mark-1 weed line along its foot and a 1 px drop shadow. Runs join toward set bits."""
    N, E, S, W = bool(i & 1), bool(i & 2), bool(i & 4), bool(i & 8)
    cv = Canvas(16, 16)
    hi, mid, lo = (MT(4), MT(3), K(4)) if marble else (K(5), K(4), K(2))
    joint = K(3) if marble else GR(1)
    x0 = 0 if W else 3
    x1 = 15 if E else 12
    y0 = 0 if N else 3
    y1 = 15 if S else 12
    for y in range(16):
        for x in range(16):
            inside = (x0 <= x <= x1 and 3 <= y <= 12) or (3 <= x <= 12 and y0 <= y <= y1)
            if not inside:
                continue
            c = mid
            top_edge = not ((x0 <= x <= x1 and 3 <= y - 1 <= 12) or (3 <= x <= 12 and y0 <= y - 1 <= y1)) and y > 0
            bot_edge = not ((x0 <= x <= x1 and 3 <= y + 1 <= 12) or (3 <= x <= 12 and y0 <= y + 1 <= y1)) and y < 15
            lf_edge = not ((x0 <= x - 1 <= x1 and 3 <= y <= 12) or (3 <= x - 1 <= 12 and y0 <= y <= y1)) and x > 0
            rt_edge = not ((x0 <= x + 1 <= x1 and 3 <= y <= 12) or (3 <= x + 1 <= 12 and y0 <= y <= y1)) and x < 15
            if top_edge:
                c = hi
            elif bot_edge:
                c = lo
            elif lf_edge:
                c = hi
            elif rt_edge:
                c = lo
            elif (x + y * 3) % 13 == 0:
                c = lo if not marble else MT(2)
            if not marble and (x % 8 == 7) and not (top_edge or bot_edge) and (3 <= y <= 12):
                c = joint
            cv.set(x, y, c)
    # shadow and weed at the foot of every open side
    for y in range(16):
        for x in range(16):
            if cv.get(x, y)[3]:
                continue
            below = cv.get(x, y - 1)[3] > 0
            right = cv.get(x - 1, y)[3] > 0
            if below:
                cv.set(x, y, GR(1) if x % 4 else GR(2))
            elif right:
                cv.put(x, y, SH(90))
    return cv


class TideWater(Water):
    """Turquoise flood water, drawn over flooded cells (A1, 3 frames). The body is the mid turquoise with deep
    troughs, bright crests and glints that drift; under a north bank a 2 px deep shadow then a bright meniscus; on
    every other edge a 1 px white foam rim that shimmers. The ground ring is thin (1 px) so the water nearly fills the
    cell: a flooded cell reads as water, not as a pool inside a floor."""
    id = 'tide_water'
    kind = 'hole'
    collision = 'water'

    def __init__(self):
        super().__init__()
        prof = {s: profile1d(4900 + i, amp=0.5, spikes=0) for i, s in enumerate('NSWE')}
        self.specs = {
            'ground': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb'),
            'surf': EdgeSpec({'N': 1.0, 'S': 0.6, 'W': 0.6, 'E': 0.6}, r=1.5, rr=1.0, prof=prof),
        }

    def make_texture(self, frame, variant):
        t = blank(tq(1))
        # one long soft trough (two rows) and one short one, drifting east a pixel a frame, set off the grid
        for (x, y, L) in ((1, 4, 9), (10, 11, 5)):
            for k in range(L):
                t[y][(x + k + frame) % 16] = tq(0)
            for k in range(2, L - 2):
                t[(y + 1) % 16][(x + k + frame) % 16] = tq(0)
        # a crest above the long trough: two bright pixels and a dimmer tail, reshaping each frame
        cx = (4 + frame * 2) % 16
        t[3][cx] = tq(2)
        t[3][(cx + 1) % 16] = tq(2)
        t[3][(cx + 2) % 16] = CY(1)
        t[2][(cx + 3 + frame) % 16] = CY(1)
        t[10][(12 + frame) % 16] = CY(1)
        gx, gy = [(13, 7), (6, 14), (2, 9)][frame % 3]
        t[gy][gx] = tq(3)
        return t

    def pixel(self, c, x, y):
        if c.i('surf', x, y):
            d = c.f('surf', x, y)
            s = c.side('surf', x, y)
            if s == 'N' and d < 3.0:
                return DARK if d < 1 else (tq(0) if d < 2 else (tq(3) if (x + c.frame) % 4 else tq(2)))
            if d < 1:
                return tq(4) if (x + y + c.frame) % 4 == 0 else tq(3)
            if d < 2 and (x + y + c.frame) % 5 == 0:
                return tq(2)
            return self.tex(c, x, y)
        s = c.side('surf', x, y)
        if s == 'N':
            return DARK
        # the wet lip of the floor around the water: a thin dark line
        return SD(1)


# ====================================================================== the road and the town
def _remap(cv, table):
    a = cv.a
    for y in range(cv.h):
        for x in range(cv.w):
            p = a[y, x]
            if p[3] == 0:
                continue
            c = table.get((int(p[0]), int(p[1]), int(p[2])))
            if c is not None:
                a[y, x] = (c[0], c[1], c[2], p[3])
    return cv


def _tbl(pairs):
    return {hexc(k)[:3]: (hexc(v) if isinstance(v, str) else v) for k, v in pairs.items()}


FLOOD_GRASS = _tbl({'#1c3730': '#1b2332', '#2a532f': '#1c3730', '#427330': '#285743', '#5a9032': '#397951',
                    '#84ad39': '#4f9e6e', '#b6cc58': '#84ad39'})
MUD = _tbl({'#6a4532': '#482826', '#896042': '#6a4532', '#ae8458': '#896042', '#c3a57c': '#a18f85',
            '#e4cb96': '#cfb89c'})
MARBLE = _tbl({'#584951': '#4c445c', '#7e6d6e': '#66637f', '#a18f85': '#8e8997', '#cfb89c': '#b3b6c4',
               '#ebdfc8': '#e2e0de', '#c3a57c': '#b3b6c4', '#ae8458': '#8e8997', '#e4cb96': '#e2e0de',
               '#896042': '#8e8997', '#f6e4b9': '#e2e0de', '#5a9032': '#397951', '#427330': '#285743'})
# white marble for walls (prefabs): one step lighter than the pavement so buildings stand off the ground
WALL_MARBLE = _tbl({'#584951': '#66637f', '#7e6d6e': '#8e8997', '#a18f85': '#b3b6c4', '#cfb89c': '#e2e0de',
                    '#ebdfc8': '#f6f4ee', '#c3a57c': '#e2e0de', '#ae8458': '#b3b6c4', '#e4cb96': '#f6f4ee'})


def _puddle(cv, cx, cy, rx, ry, seed=0):
    for y in range(16):
        for x in range(16):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d < 1.0:
                c = TQ(1) if d > 0.45 else K(4)
                if d > 0.75 and y < cy:
                    c = TQ(0)
                if d < 0.3 and (x + seed) % 3 == 0:
                    c = K(5)
                cv.set(x, y, c)


class FloodGrass(Grass):
    """Waterlogged grass for the Flood Road: the grass autotile in a darker, colder ramp; two variants hold puddles."""
    id = 'flood_grass'
    weights = [12, 2, 2, 2, 3, 2]

    def tile(self, nb, frame=0, variant=0):
        return _remap(Grass.tile(self, nb, frame, variant), FLOOD_GRASS)

    def variant_tile(self, v):
        cv = self.tile(full_nb(), 0, v)
        if v == 1:
            _puddle(cv, 8, 9, 5.5, 3.0, 1)
        elif v == 3:
            _puddle(cv, 5, 6, 3.4, 2.0, 2)
        return cv


class MudPath(Dirt):
    """The drowned road: wet dark mud with ruts and standing puddles (the dirt autotile in a wet ramp)."""
    id = 'mud_path'

    def tile(self, nb, frame=0, variant=0):
        cv = _remap(Dirt.tile(self, nb, frame, variant), MUD)
        return cv

    def variant_tile(self, v):
        cv = self.tile(full_nb(), 0, v)
        # two cart ruts across every fill tile
        for x in range(16):
            for yy in (5, 11):
                if cv.get(x, yy)[3]:
                    cv.set(x, yy, EA(1) if x % 4 else EA(0))
                    cv.set(x, yy + 1, EA(3) if x % 3 else EA(2))
        if v == 1:
            _puddle(cv, 8, 8, 5.0, 2.4, 3)
        elif v == 2:
            for x in range(2, 14):
                cv.set(x, 5, TQ(1) if x % 3 else K(4))
        return cv


class MarbleWalk(Plaza):
    """Valewyn's pavement: the plaza's coursed stones in light grey and white marble, verdigris in a joint."""
    id = 'marble_walk'
    weights = [18, 1, 2, 2, 1, 1]

    def tile(self, nb, frame=0, variant=0):
        return _remap(Plaza.tile(self, nb, frame, variant), MARBLE)


CANAL_TERRAINS = [CanalFloor()]
FIELD_TERRAINS = [FloodGrass(), MudPath(), MarbleWalk()]
