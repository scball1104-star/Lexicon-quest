"""The Wider Valley (Episode 1 expansion) dungeon kits -> assets/tiles/x1.png (X1-tiles, EXPANSION1_PLAN 4.3, 4.6, 4.9, 10.1).

Same per-dungeon kit approach as the Court and the Foundry (court_kit.py, forge_kit.py): each dungeon has its floor
terrain(s), a wall band (<sys>_top), an inner face (<sys>_face), the deep beyond its walls (<sys>_out_top) and an outer
face under a band's south lip (<sys>_out_face). Three dungeons, three materials you can name from a phone screenshot:

  The Wethers' Barrow   x1_barrow   turf-capped stone with burial niches: cold green-grey flags, moss in every joint
                                    (floor x1_barrow_floor; second floor x1_barrow_flag; rug x1_barrow_runner)
  The Keepers' Cellar   x1_cellar   blue-grey ashlar under a band of stars: pale polished tile with a star inlay
                                    (floor x1_cellar_floor; second floor x1_cellar_slate; inlay x1_cellar_inlay)
  The Weir Culvert      x1_culvert  red-brown brick vaults with iron ribs, wet and dripping
                                    (floor x1_culvert_floor; second floor x1_culvert_flag; standing water x1_culvert_wet)

All colours are palette.json ramps; nothing is snapped away. Every texture is periodic on the 16 px torus.
"""
import math
from pxlib import Canvas, C, DARK, WHITE, rnd, h32, SH, profile1d
from autotile import EdgeSpec
from terrain import Terrain, blank, stamp_in, voronoi16, stones_from_labels
from archive_floors import FloorBase, BandTop, DeepTop, SplitFace, OuterFace, fade

K = lambda i: C('stone_cool', i)       # 251d34 2e2b4c 4c445c 66637f 8e8997 b3b6c4
RG = lambda i: C('roof_green', i)      # 1b2332 1c3730 285743 397951 4f9e6e   (cold moss)
FD = lambda i: C('foliage_dark', i)    # 1b2332 1c3730 2a532f 427330
GR = lambda i: C('grass', i)           # 1c3730 2a532f 427330 5a9032 84ad39 b6cc58
MT = lambda i: C('metal', i)           # 2e2b4c 66637f b3b6c4 e2e0de f6f4ee
IK = lambda i: C('ink', i)             # 14101e 1a1334 292657 3f4186 7162bd
WA = lambda i: C('water', i)           # 0e153b 1d3775 24559b 3e88ca 6ab3e4 b4e4f2
ICE = lambda i: C('ice', i)            # 3e88ca 6ab3e4 b4e4f2 e8fffb
CY = lambda i: C('magic_cyan', i)      # 1d3775 317aa1 2ec4d0 8af0e8 e8fffb
GD = lambda i: C('gold', i)            # 482826 8f5533 c38334 eba14d f9d77a fff7d6
FI = lambda i: C('fire', i)            # 571f28 b34532 e06b39 eba14d f9d77a fff7d6
RR = lambda i: C('roof_red', i)        # 2d1b1f 571f28 87332e b34532 e06b39 eba14d
EA = lambda i: C('earth', i)           # 2d1b1f 482826 6a4532 896042 ae8458
WD = lambda i: C('wood', i)
SD = lambda i: C('shadow', i)          # 14101e 251d34 2e2b4c 4c445c
SW = lambda i: C('stone_warm', i)      # 2e2b4c 584951 7e6d6e a18f85 cfb89c ebdfc8
SA = lambda i: C('sand', i)
CB = lambda i: C('cloth_blue', i)


def put(t, x, y, c):
    t[y % 16][x % 16] = c


# ====================================================================== floors
class _Floor(FloorBase):
    """A dungeon floor: crisp edge only where it meets a hole (a lip in the floor's own dark)."""
    pass


class BarrowFloor(_Floor):
    """The Barrow: big irregular flags, cold green-grey, a moss green joint, turf creeping in from the edges.
    Variants: turf creeping across a joint, a worn slab with a carved ring, a cracked flag, wool caught in the
    moss (the shepherds), a small burial slab, a root through the joint."""
    id = 'x1_barrow_floor'
    nvariants = 7
    weights = [26, 3, 2, 2, 2, 2, 1]
    edge = RG(1)
    lab = None

    def _lab(self):
        if BarrowFloor.lab is None:
            BarrowFloor.lab = voronoi16(7101, 3, 3, jitter=0.9, sx=1.0, sy=1.15)
        return BarrowFloor.lab

    def make_texture(self, frame, variant):
        lab = self._lab()
        tones = [K(3), K(2), K(3), K(2), K(3), K(4), K(2), K(3), K(3)]
        t = stones_from_labels(lab, lambda L: tones[L % len(tones)], K(1), lambda b: K(4) if b == K(3) else K(3),
                               lambda b: K(1) if b != K(1) else K(1))
        # cold moss in the joints, a few green flecks on the stones, a dark pit now and then
        for y in range(16):
            for x in range(16):
                c = t[y][x]
                n = h32(x, y, 7102) % 23
                if c == K(1):
                    if n < 11:
                        t[y][x] = RG(2) if n < 6 else RG(1)
                elif n < 2:
                    t[y][x] = RG(2)             # lichen on the flag
                elif n < 4 and (x + y) % 2 == 0:
                    t[y][x] = RG(1) if c == K(2) else RG(2)
                elif n == 4:
                    t[y][x] = K(2) if c == K(3) else K(3)
        if variant == 1:
            # turf creeping across a joint: a dithered green wedge with two blades
            for y in range(1, 8):
                for x in range(1, 11):
                    d = (x - 1) * 0.5 + (7 - y) * 0.8
                    if d < 2.5 and t[y][x] != K(1):
                        t[y][x] = RG(2) if (x + y) % 2 else RG(3)
                    elif d < 4.0 and (x + y) % 2 == 0:
                        t[y][x] = RG(1)
            stamp_in(t, ['.g.', 'g.g'], 4, 2, {'g': GR(3)})
        elif variant == 2:
            # a worn slab with a carved ring (a barrow-wight's mark): a shallow ring, a lit lower lip
            for y in range(16):
                for x in range(16):
                    d = math.hypot(x - 7.5, y - 7.5)
                    if 3.2 <= d < 4.6:
                        t[y][x] = K(1) if (x + y) % 5 else K(2)
                    elif 4.6 <= d < 5.4 and y > 8:
                        t[y][x] = K(4)
            t[7][7] = K(1)
            t[8][8] = K(1)
        elif variant == 3:
            # a cracked flag with moss in the crack
            for (x, y) in ((2, 3), (3, 4), (4, 4), (5, 5), (6, 6), (7, 6), (8, 7), (9, 8), (10, 9), (11, 9), (12, 10)):
                t[y][x] = K(0)
            for (x, y) in ((4, 5), (7, 7), (10, 10)):
                t[y][x] = RG(2)
            t[3][3] = K(4)
            t[5][4] = K(4)
        elif variant == 4:
            # wool caught in the moss: three off-white tufts, a dark knot
            for (x, y, c) in ((5, 9, MT(3)), (6, 9, MT(2)), (6, 10, MT(3)), (11, 4, MT(2)), (12, 4, MT(3)), (9, 12, MT(2))):
                t[y][x] = c
            t[10][5] = RG(2)
            t[10][7] = RG(2)
            t[5][11] = RG(2)
        elif variant == 5:
            # a small burial slab: a rectangle with a notched end and a lit north edge
            for y in range(4, 12):
                for x in range(3, 13):
                    t[y][x] = K(2)
            for x in range(3, 13):
                t[4][x] = K(4)
                t[11][x] = K(1)
            for y in range(4, 12):
                t[y][3] = K(3)
                t[y][12] = K(1)
            t[6][11] = K(1)
            t[7][11] = K(1)
            for x in range(5, 11):
                t[7][x] = K(1) if x % 2 else K(2)
        elif variant == 6:
            # a pale root through the joint
            for k in range(11):
                put(t, 2 + k, 8 + (k // 4) % 2, EA(2) if k % 3 else EA(3))
            put(t, 5, 9, EA(1))
            put(t, 9, 9, EA(1))
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            if c.f('top', x, y) < 1:
                return RG(2) if (x * 3 + y) % 3 else RG(1)
            return self.tex(c, x, y)
        return None


class BarrowFlag(_Floor):
    """Second floor for the Barrow's inner rooms (the hearth, the Reeve's hall): dressed dark slabs in even courses
    (16 x 8, joints staggered), a clean groove, no moss. Variants: a rosette, a chipped slab, a candle drip, a stain."""
    id = 'x1_barrow_flag'
    nvariants = 5
    weights = [20, 2, 2, 2, 2]
    edge = K(0)

    def make_texture(self, frame, variant):
        t = blank(K(2))
        for y in range(16):
            for x in range(16):
                row, ly = y // 8, y % 8
                lx = (x + row * 8) % 16
                if ly == 7:
                    c = K(0)
                elif lx == 15:
                    c = K(0)
                elif ly == 0:
                    c = K(3) if (lx + y) % 5 else K(2)
                elif lx == 0:
                    c = K(3)
                else:
                    c = K(2)
                    n = h32(x, y, 7201) % 31
                    if n == 0:
                        c = K(3)
                    elif n == 1:
                        c = K(1)
                t[y][x] = c
        if variant == 1:
            # a rosette: a ring of eight dots round a centre
            for k in range(8):
                a = k * math.pi / 4
                put(t, int(round(7.5 + 3.6 * math.cos(a))), int(round(7.5 + 3.6 * math.sin(a))), K(4))
            put(t, 7, 7, K(4))
            put(t, 8, 8, K(1))
        elif variant == 2:
            for (x, y) in ((11, 2), (12, 2), (12, 3), (13, 4)):
                t[y][x] = K(1)
            t[2][10] = K(4)
            t[3][11] = K(3)
        elif variant == 3:
            # a candle drip: pale wax, one smudge of soot
            for (x, y, c) in ((5, 10, MT(2)), (6, 10, MT(3)), (6, 11, MT(2)), (5, 12, MT(2)), (7, 12, MT(1))):
                t[y][x] = c
            t[11][5] = K(1)
        elif variant == 4:
            for y in range(9, 15):
                for x in range(1, 8):
                    if (x + y) % 2 == 0 and t[y][x] in (K(2), K(3)):
                        t[y][x] = K(1)
        return t


class Rug(Terrain):
    """A rug or inlay laid on a floor (an A2 fill like the carpets): a binding, a guard stripe, a field.
    Subclasses give the colours (hem, trim, stripe, field, field-dark) and the field texture."""
    kind = 'fill'
    nvariants = 1
    hem = field = fdark = fhi = stripe = trim = None

    def __init__(self):
        super().__init__()
        self.specs = {'top': EdgeSpec({'N': 1.0, 'S': 1.0, 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb')}

    def make_texture(self, frame, variant):
        t = blank(self.field)
        for y in range(16):
            for x in range(16):
                if (x + 2 * y) % 8 == 0 and (x + y) % 3 == 0:
                    t[y][x] = self.fdark
                elif (x + 2 * y) % 8 == 4 and (x * 2 + y) % 10 == 0:
                    t[y][x] = self.fhi
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            d = c.f('top', x, y)
            side = c.side('top', x, y)
            along = x if side in ('N', 'S') else y
            if d < 1:
                if side in ('N', 'S') and along % 2 == 0:
                    return self.trim
                return self.hem
            if d < 2:
                return self.trim
            if d < 3:
                return self.stripe if along % 4 in (1, 2) else self.field
            if d < 4:
                return self.fdark
            return self.tex(c, x, y)
        if c.f('top', x, y) > -1.0 and c.i('top', x, y - 1):
            return SH(90)
        return None


class BarrowRunner(Rug):
    """An undyed wool runner (the Reeve's hall): a dark brown binding, a bog-green guard stripe, a woven oatmeal field."""
    id = 'x1_barrow_runner'
    hem = EA(0)
    trim = EA(2)
    stripe = RG(2)
    field = EA(3)
    fdark = EA(2)
    fhi = SA(0)

    def make_texture(self, frame, variant):
        t = blank(EA(3))
        for y in range(16):
            for x in range(16):
                # a coarse basket weave: 4 x 2 cells alternating a step light and dark
                cell = ((x // 4) + (y // 2)) % 2
                c = EA(3) if cell else SA(0)
                if y % 2 == 1 and x % 4 == 3:
                    c = EA(2)
                t[y][x] = c
        return t


# ---------------------------------------------------------------------- the Cellar
class CellarFloor(_Floor):
    """The Cellar: pale polished tile, one 16 px square per cell with a bevel (lit north-west, a blue joint south-east),
    cool blue-grey. Variants carry a four-point star inlay, a compass rose, a chip, an ink spill, scattered star dots."""
    id = 'x1_cellar_floor'
    nvariants = 7
    weights = [40, 3, 2, 2, 1, 3, 1]
    edge = IK(2)

    def make_texture(self, frame, variant):
        # soft seams (CRITIQUE_3: the floor must be quieter than the actors): one ramp step of joint, a lit corner
        t = blank(K(4))
        for y in range(16):
            for x in range(16):
                if x == 15 or y == 15:
                    c = K(3) if (x + y) % 4 else IK(3)
                elif x == 0 and y < 6 or y == 0 and x < 6:
                    c = K(5)
                else:
                    c = K(4)
                    n = h32(x, y, 7301) % 53
                    if n == 0:
                        c = K(5)
                    elif n == 1:
                        c = K(3)
                    elif (x - y) % 11 == 0 and 2 < x < 13 and (x + y) % 3 == 0:
                        c = K(5)
                t[y][x] = c
        if variant == 1:
            # a four-point star inlay in pale ice with a gold heart
            for k in range(-4, 5):
                a = abs(k)
                for (px, py) in ((7 + k, 7), (7, 7 + k)):
                    put(t, px, py, ICE(2) if a < 3 else ICE(1))
            for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
                put(t, 7 + dx, 7 + dy, ICE(1))
            put(t, 7, 7, GD(4))
            put(t, 8, 8, IK(2))
        elif variant == 2:
            # a compass ring: a thin ice circle with four ticks
            for y in range(16):
                for x in range(16):
                    d = math.hypot(x - 7.5, y - 7.5)
                    if 4.8 <= d < 5.7:
                        t[y][x] = ICE(1) if x + y < 15 else IK(3)
            for (x, y) in ((7, 1), (8, 1), (7, 13), (8, 13), (1, 7), (1, 8), (13, 7), (13, 8)):
                t[y][x] = ICE(2)
        elif variant == 3:
            for (x, y) in ((10, 3), (10, 4), (11, 5), (11, 6)):
                t[y][x] = K(2)
            t[4][11] = K(3)
            t[3][9] = K(5)
        elif variant == 4:
            # an ink spill: a dark lobe with a lighter rim
            for y in range(16):
                for x in range(16):
                    d = ((x - 6.5) / 4.2) ** 2 + ((y - 9.5) / 2.9) ** 2
                    if d < 0.7:
                        t[y][x] = IK(1)
                    elif d < 1.0 and (x + y) % 2 == 0:
                        t[y][x] = IK(2)
            for (x, y) in ((11, 11), (12, 12)):
                t[y][x] = IK(2)
            t[9][5] = IK(3)
        elif variant == 5:
            # a few star dots: a small kneeling figure in dots
            for (x, y) in ((4, 4), (7, 6), (9, 9), (12, 8), (6, 12)):
                t[y][x] = ICE(2)
            t[7][6] = ICE(0)
        elif variant == 6:
            # a bookmark ribbon dropped on the tile
            for k in range(7):
                put(t, 4 + k, 10 - k // 2, RR(3) if k % 2 else RR(2))
            put(t, 4, 11, RR(1))
        return t


class CellarSlate(_Floor):
    """Second floor for the Cellar's service rooms (the seed vault, the landing): darker slate in a stagger of
    16 x 8 slabs with a blue joint, a faint chalk mark here and there."""
    id = 'x1_cellar_slate'
    nvariants = 5
    weights = [20, 2, 2, 2, 2]
    edge = IK(1)

    def make_texture(self, frame, variant):
        t = blank(K(2))
        for y in range(16):
            for x in range(16):
                row, ly = y // 8, y % 8
                lx = (x + row * 6) % 16
                if ly == 7 or lx == 15:
                    c = IK(2)
                elif ly == 0:
                    c = K(3)
                elif lx == 0:
                    c = K(3)
                else:
                    c = K(2)
                    n = h32(x, y, 7401) % 29
                    if n == 0:
                        c = K(1)
                    elif n == 1:
                        c = K(3)
                t[y][x] = c
        if variant == 1:
            for (x, y) in ((4, 3), (5, 3), (6, 3), (5, 4), (5, 5)):
                t[y][x] = MT(1)         # a chalk tally "T"
        elif variant == 2:
            for (x, y) in ((9, 9), (10, 10), (11, 10), (11, 11), (12, 12)):
                t[y][x] = IK(1)
        elif variant == 3:
            for y in range(2, 6):
                for x in range(9, 14):
                    if (x + y) % 2 == 0:
                        t[y][x] = K(1)
        elif variant == 4:
            for k in range(6):
                put(t, 3 + k, 11 - k // 3, IK(3))
        return t


class CellarInlay(Rug):
    """The star inlay: a polished band of deep blue stone with a gold line and a ribbon of ice stars; the field is
    a night-blue stone strewn with star dots (the dais and the well hall's ring)."""
    id = 'x1_cellar_inlay'
    hem = IK(1)
    trim = GD(2)
    stripe = IK(3)
    field = IK(2)
    fdark = IK(1)
    fhi = IK(3)

    def make_texture(self, frame, variant):
        t = blank(IK(2))
        for y in range(16):
            for x in range(16):
                n = h32(x, y, 7501) % 37
                if n == 0:
                    t[y][x] = IK(3)
                elif n == 1:
                    t[y][x] = IK(1)
        # a few stars: single pale dots with a faint cross
        for (x, y, big) in ((3, 4, True), (11, 9, False), (7, 13, False), (13, 2, False), (6, 8, False)):
            t[y][x] = ICE(3) if big else ICE(1)
            if big:
                for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    put(t, x + dx, y + dy, IK(4))
        return t


# ---------------------------------------------------------------------- the Culvert
class CulvertFloor(_Floor):
    """The Culvert: wet red-brown brick laid in running bond (8 x 4 bricks, a dark mortar), a lit top edge on every brick,
    a damp sheen. Variants: standing damp with a glint, a moss bloom, a broken brick, a rusted iron plate, a drip ring."""
    id = 'x1_culvert_floor'
    nvariants = 7
    weights = [22, 3, 2, 2, 2, 2, 2]
    edge = EA(0)

    def make_texture(self, frame, variant):
        t = blank(RR(1))
        for y in range(16):
            for x in range(16):
                row, ly = y // 4, y % 4
                lx = (x + (row % 2) * 4) % 8
                brick = ((x + (row % 2) * 4) // 8 + row * 3) % 4
                if ly == 3 or lx == 7:
                    c = EA(0) if (x + y) % 5 else EA(1)
                elif ly == 0:
                    c = [RR(2), RR(1), RR(2), RR(1)][brick] if lx < 6 else RR(1)
                else:
                    c = [RR(1), RR(1), RR(2), RR(1)][brick]
                    n = h32(x, y, 7601) % 17
                    if n == 0:
                        c = EA(2) if ly == 1 else RR(2)
                    elif n == 1:
                        c = RR(2) if c == RR(1) else c
                t[y][x] = c
        # a wet sheen: a few cold glints on the top edge of a brick (water in the mortar line above it)
        for (x, y) in ((2, 8), (9, 1), (13, 13)):
            t[y][x] = WA(3) if (x + y) % 2 else WA(2)
        if variant == 1:
            # standing damp: a darker patch with an ice glint
            for y in range(5, 12):
                for x in range(3, 13):
                    d = ((x - 7.5) / 5) ** 2 + ((y - 8) / 3) ** 2
                    if d < 0.9 and t[y][x] not in (EA(0), EA(1)):
                        t[y][x] = RR(1) if d < 0.55 else (RR(1) if (x + y) % 2 else RR(2))
            t[7][5] = ICE(1)
            t[8][6] = WA(3)
            t[9][10] = WA(2)
        elif variant == 2:
            # a moss bloom in the mortar
            for (x, y) in ((4, 3), (5, 3), (6, 3), (5, 4), (11, 11), (12, 11), (12, 12), (3, 12)):
                t[y][x] = RG(2) if (x + y) % 2 else RG(1)
            t[11][10] = RG(3)
        elif variant == 3:
            # a broken brick: a dark hole with a pale fragment
            for (x, y) in ((8, 5), (9, 5), (10, 5), (8, 6), (9, 6), (10, 6), (9, 7)):
                t[y][x] = EA(0)
            t[5][7] = RR(3)
            t[6][11] = EA(2)
            t[8][10] = RR(3)
        elif variant == 4:
            # a rusted iron plate bolted to the floor
            for y in range(4, 12):
                for x in range(3, 13):
                    c = K(2)
                    if y == 4 or x == 3:
                        c = K(4)
                    elif y == 11 or x == 12:
                        c = K(1)
                    t[y][x] = c
            for (x, y) in ((4, 5), (11, 5), (4, 10), (11, 10)):
                t[y][x] = K(5)
            for (x, y) in ((6, 7), (7, 7), (7, 8), (9, 6)):
                t[y][x] = RR(2)
        elif variant == 5:
            # a drip ring: concentric pale rings on a dark puddle
            for y in range(16):
                for x in range(16):
                    d = math.hypot(x - 7.5, y - 8)
                    if d < 1.6:
                        t[y][x] = WA(1)
                    elif 2.4 <= d < 3.2:
                        t[y][x] = WA(2) if (x + y) % 2 else WA(3)
                    elif 4.2 <= d < 4.8 and (x + y) % 3 == 0:
                        t[y][x] = WA(2)
        elif variant == 6:
            # a chain link lying in the mortar
            for (x, y) in ((3, 9), (4, 9), (5, 10), (6, 10), (7, 9), (8, 9), (9, 10), (10, 10)):
                t[y][x] = K(3) if x % 2 else K(2)
            t[8][4] = K(4)
            t[8][8] = K(4)
        return t


class CulvertFlag(_Floor):
    """Second floor for the culvert's service ledges (the mouth, the hearth landing, the pump room): grey-blue flag slabs
    laid dry, with a worn centre and rust at the joints, so a ledge reads apart from the brick drain."""
    id = 'x1_culvert_flag'
    nvariants = 5
    weights = [20, 2, 2, 2, 2]
    edge = K(0)

    def make_texture(self, frame, variant):
        lab = voronoi16(7701, 2, 2, jitter=0.6, sx=1.0, sy=1.0)
        tones = [K(3), K(2), K(3), K(3), K(2), K(4)]
        t = stones_from_labels(lab, lambda L: tones[L % len(tones)], K(1), lambda b: K(4) if b == K(3) else K(3),
                               lambda b: b)
        for y in range(16):
            for x in range(16):
                n = h32(x, y, 7702) % 29
                if t[y][x] == K(1) and n < 6:
                    t[y][x] = RR(1)
                elif n == 0:
                    t[y][x] = WA(2) if t[y][x] != K(1) else t[y][x]
        if variant == 1:
            for (x, y) in ((4, 4), (5, 5), (5, 6), (6, 7), (7, 7)):
                t[y][x] = K(0)
        elif variant == 2:
            for y in range(8, 13):
                for x in range(6, 12):
                    if (x + y) % 2 == 0 and t[y][x] != K(1):
                        t[y][x] = WA(1)
            t[10][8] = ICE(1)
        elif variant == 3:
            stamp_in(t, ['.ab.', 'abbc', '.bc.'], 4, 3, {'a': K(4), 'b': K(3), 'c': K(1)})
        elif variant == 4:
            for k in range(8):
                put(t, 3 + k, 12, RR(1) if k % 2 else RR(2))
        return t


class CulvertWet(Terrain):
    """Standing water on the culvert floor (an A2 fill, walkable): a shallow dark pool, rust-stained, with a pale lip
    and a few glints. Its edge is a wobbling one-pixel lip of wet brick so the pool reads on a phone."""
    id = 'x1_culvert_wet'
    kind = 'fill'
    nvariants = 3
    weights = [8, 3, 2]

    def __init__(self):
        super().__init__()
        prof = {s: profile1d(7800 + i, amp=1.2, spikes=1, spike_amp=0.8) for i, s in enumerate('NSWE')}
        self.specs = {'top': EdgeSpec({'N': 1.4, 'S': 1.8, 'W': 1.4, 'E': 1.4}, r=2.6, rr=1.6, prof=prof)}

    def make_texture(self, frame, variant):
        t = blank(IK(1))
        for y in range(16):
            for x in range(16):
                n = h32(x, y, 7801) % 19
                if n < 3:
                    t[y][x] = WA(1)
                elif n == 3:
                    t[y][x] = IK(2)
        # a rust bloom
        for (x, y) in ((4, 5), (5, 5), (5, 6), (12, 11), (11, 11)):
            t[y][x] = RR(1)
        for i, (x, y) in enumerate(((3, 3), (9, 8), (13, 13))):
            for k in range(4 + i):
                put(t, x + k, y, WA(2) if 0 < k < 3 + i else WA(1))
        if variant == 1:
            t[7][6] = ICE(2)
            t[8][7] = ICE(1)
        elif variant == 2:
            for y in range(16):
                for x in range(16):
                    d = math.hypot(x - 8, y - 8)
                    if 2.4 <= d < 3.2:
                        t[y][x] = WA(3) if (x + y) % 2 else WA(2)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            d = c.f('top', x, y)
            if d < 1:
                s = c.side('top', x, y)
                return WA(2) if s in ('N', 'W') else IK(2)
            return self.tex(c, x, y)
        if c.f('top', x, y) > -1.0:
            return SH(70) if c.i('top', x, y - 1) else None
        return None


# ====================================================================== wall bands (the top of a wall run)
class BarrowTop(BandTop):
    """Barrow band: a turf cap (cold green, short blades) over the stone, a fringe of turf at the front lip."""
    id = 'x1_barrow_top'
    seed = 7810

    def make_texture(self, frame, variant):
        t = blank(RG(1))
        for y in range(16):
            for x in range(16):
                n = h32(x, y, 7811) % 13
                if n == 0:
                    t[y][x] = RG(2)
                elif n == 1:
                    t[y][x] = FD(1)
                elif n < 5:
                    t[y][x] = RG(2) if (x + y) % 2 == 0 else RG(1)
        for (x, y) in ((3, 4), (10, 9), (6, 12), (13, 3)):
            stamp_in(t, ['.h.', 'h.h'], x, y, {'h': RG(2)})
        if variant == 1:
            for (x, y) in ((5, 6), (6, 6), (9, 10), (10, 10)):
                t[y][x] = K(4)       # a bare stone breaking through
            t[7][6] = K(2)
        elif variant == 2:
            for (x, y) in ((4, 5), (5, 5), (4, 6), (11, 11)):
                t[y][x] = GR(3)       # a brighter tuft
            t[4][4] = GR(4)
        elif variant == 3:
            for k in range(6):
                put(t, 3 + k, 8 + (k // 3), EA(1))
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GR(3), RG(3), K(3), K(1)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else FD(1)
        if side == 'W':
            return RG(1) if d < 1 else GR(3)
        return DARK if d < 1 else FD(1)


class CellarTop(BandTop):
    """Cellar band: a polished pale-blue stone cap with a blue vein, a bright ice front lip."""
    id = 'x1_cellar_top'
    seed = 7820

    def make_texture(self, frame, variant):
        t = blank(K(3))
        for y in range(16):
            for x in range(16):
                n = h32(x, y, 7821) % 31
                if n == 0:
                    t[y][x] = K(4)
                elif n == 1:
                    t[y][x] = K(2)
        for i in range(16):
            t[8][i] = IK(2) if i % 4 else K(2)
        if variant == 1:
            for (x, y) in ((4, 3), (11, 12), (13, 5), (6, 11)):
                t[y][x] = ICE(2)
        elif variant == 2:
            for k in range(7):
                put(t, 2 + k, 3 + k // 2, IK(3))
        elif variant == 3:
            for (x, y) in ((7, 5), (8, 5), (7, 6), (8, 6)):
                t[y][x] = GD(2)
            t[5][7] = GD(4)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [ICE(2), K(5), K(4), K(2)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else IK(1)
        if side == 'W':
            return IK(1) if d < 1 else K(5)
        return DARK if d < 1 else IK(1)


class CulvertTop(BandTop):
    """Culvert band: the top of the brick vault, sooty red-brown with a wet sheen, an iron-capped front lip."""
    id = 'x1_culvert_top'
    seed = 7830

    def make_texture(self, frame, variant):
        t = blank(RR(1))
        for y in range(16):
            for x in range(16):
                n = h32(x // 2, y, 7831) % 9
                if n == 0:
                    t[y][x] = RR(2)
                elif n == 1:
                    t[y][x] = EA(0)
                elif n == 2 and (x + y) % 2 == 0:
                    t[y][x] = SD(1)
        for x in range(16):
            t[8][x] = EA(0) if x % 8 else RR(2)
        if variant == 1:
            for (x, y) in ((4, 3), (12, 12), (13, 5), (6, 11)):
                t[y][x] = RR(3)
        elif variant == 2:
            for y in range(1, 15):
                t[y][8] = EA(0)
                t[y][9] = RR(2) if y % 3 else RR(1)
        elif variant == 3:
            for (x, y) in ((6, 5), (7, 6), (8, 6), (9, 7)):
                t[y][x] = WA(2)
            t[6][7] = WA(3)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [K(4), K(3), RR(2), RR(1)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else SD(1)
        if side == 'W':
            return SD(1) if d < 1 else RR(3)
        return DARK if d < 1 else SD(1)


# ====================================================================== the deep beyond
class BarrowDeep(DeepTop):
    id = 'x1_barrow_out_top'
    weights = [8, 2, 2, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant == 1:
            for x in range(3, 13):
                t[8][x] = RG(1) if x % 3 else FD(0)
        elif variant == 2:
            for (x, y) in ((4, 4), (5, 4), (10, 11), (11, 11), (11, 10)):
                t[y][x] = RG(1)
        elif variant == 3:
            for y in range(16):
                if y % 3 != 2:
                    t[y][6] = SD(1)
        elif variant == 4:
            t[7][7] = FD(1)
            t[7][8] = RG(1)
        elif variant == 5:
            for (x, y) in ((2, 11), (3, 11), (12, 3), (12, 4)):
                t[y][x] = SD(1)
        return t


class CellarDeep(DeepTop):
    id = 'x1_cellar_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        specks = {1: [(3, 4), (12, 9)], 2: [(10, 3)], 3: [(6, 12), (13, 6)], 4: [(2, 13), (9, 7)]}
        for (x, y) in specks.get(variant, []):
            t[y][x] = IK(2)
        if variant == 5:
            t[7][7] = ICE(0)
            t[7][8] = IK(3)
            t[8][7] = IK(2)
        return t


class CulvertDeep(DeepTop):
    id = 'x1_culvert_out_top'
    weights = [8, 2, 2, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant == 1:
            for x in range(16):
                t[9][x] = SD(1) if x % 4 else SD(0)
        elif variant == 2:
            for (x, y) in ((4, 4), (10, 11)):
                t[y][x] = RR(0)
        elif variant == 3:
            for y in range(16):
                t[y][5] = SD(1) if y % 5 else WA(0)
        elif variant == 4:
            for (x, y) in ((2, 11), (3, 11), (3, 12), (12, 3), (12, 4)):
                t[y][x] = SD(1)
        elif variant == 5:
            t[7][7] = WA(1)
            t[7][8] = WA(0)
        return t


# ====================================================================== inner faces
class _Face(SplitFace):
    """16 x 32 design per tile: at(u, Y) with u = x % 16, Y 0..31. Rows 8..23 repeat for taller walls (period 16)."""

    def head(self, x, y):
        return self.at(x % 16, y)

    def body(self, x, r):
        return self.at(x % 16, r if r >= 8 else 16 + r)

    def foot(self, x, f):
        return self.at(x % 16, 24 + f)

    edge_l = K(1)
    edge_r = K(0)

    def sides(self, col, x, y, left, top, right, bottom):
        if not left:
            if x == 0:
                return DARK if (y < 2 and not top) else self.edge_l
        if not right:
            if x == 15:
                return DARK if (y >= 15 and not bottom) else self.edge_r
        return col


def ashlar(u, Y, y0, seed, c1=K(1), c2=K(2), c3=K(3), c4=K(4), course=8):
    """Staggered ashlar courses `course` high from y0; returns a colour (lit top edge, dark joint, light speckle)."""
    k = ((Y - y0) // course) % 2
    v = (Y - y0) % course
    uu = (u + k * 8) % 16
    if v == course - 1 or uu == 15:
        return c1
    if v == 0:
        return c4 if (u + Y) % 4 else c3
    n = h32(u, Y, seed) % 19
    if n == 0:
        return c4
    if n == 1:
        return c2
    return c3 if uu < 14 else c2


class BarrowFace(_Face):
    """Barrow face: a turf overhang with hanging blades, a stone lip, cold ashlar, a burial niche in every tile (a
    dark recess under a lintel with a shrouded bundle on the shelf), moss low in the wall, a turf plinth."""
    edge_l = RG(1)
    edge_r = K(0)
    niche = True
    bundle = True
    candle = False
    relief = False

    def head_rows(self, u, Y):
        if Y == 0:
            return DARK
        if Y == 1:
            return RG(1)
        blade = 1 + h32(u // 2, 7901) % 4     # blade length 1..4 below row 1 (rows 2..5)
        if 2 <= Y <= 5:
            if Y - 2 < blade:
                return [GR(2), RG(2), RG(2), FD(1)][Y - 2] if (u + Y) % 3 else [RG(3), RG(3), RG(2), RG(1)][Y - 2]
            return K(2) if Y >= 4 else K(3)
        return None

    def at(self, u, Y):
        c = self.head_rows(u, Y)
        if c is not None:
            return c
        if Y >= 28:
            return [GR(2), RG(2), FD(1), DARK][Y - 28] if (u + Y) % 5 else [K(2), RG(2), FD(1), DARK][Y - 28]
        if Y == 27:
            return K(2) if u % 3 else RG(2)
        col = ashlar(u, Y, 6, 7902)
        # moss low in the wall: dithered green in the bottom third
        if Y >= 20 and fade(u, Y, (Y - 19) / 9.0 * 0.6) and col not in (K(1),):
            col = RG(2) if (u + Y) % 2 else RG(1)
        if self.niche and 3 <= u <= 12 and 10 <= Y <= 24:
            return self.niche_px(u, Y, col)
        if self.relief:
            return self.relief_px(u, Y, col)
        return col

    def niche_px(self, u, Y, col):
        # frame: lintel Y10 (lit), jambs u3/u12, sill Y24 lit; recess dark with a lit back-right edge
        if Y == 10:
            return K(5) if u < 11 else K(3)
        if u == 3:
            return K(4)
        if u == 12:
            return K(1)
        if Y == 24:
            return K(4)
        if Y == 11:
            return DARK
        if Y == 23:
            return K(2)                   # the shelf
        inner = SD(1) if (u + Y) % 2 else DARK
        if self.candle and 6 <= u <= 9 and 17 <= Y <= 22:
            fl = {(7, 17): FI(5), (8, 17): FI(4), (7, 18): FI(4), (8, 18): FI(3), (7, 19): FI(3), (8, 19): FI(2),
                  (7, 20): MT(3), (8, 20): MT(2), (7, 21): MT(2), (8, 21): MT(1), (7, 22): K(3), (8, 22): K(3)}
            if (u, Y) in fl:
                return fl[(u, Y)]
            if 5 <= u <= 10 and 15 <= Y <= 21 and (u + Y) % 2 == 0:
                return RR(1)
            return inner
        if self.bundle and 4 <= u <= 11 and 18 <= Y <= 22:
            ch = self.BUNDLE[Y - 18][u - 4]
            if ch != '.':
                return {'a': MT(3), 'b': MT(2), 'c': K(4), 'd': K(2), 'e': K(5)}[ch]
        return inner

    # a shrouded burial bundle lying on the shelf: pale wrap, a tied band, a rounded head end on the left
    BUNDLE = ['..eaaaa.',
              '.eabdbab',
              'eabbdbbc',
              '.cccdccc',
              '........']

    def relief_px(self, u, Y, col):
        return col


class BarrowFaceMoss(BarrowFace):
    """Barrow style 1: plain cold ashlar, no niches, moss thick on the lower courses, a rusted iron ring."""
    niche = False
    base = None

    def at(self, u, Y):
        c = super().at(u, Y)
        if Y <= 5 or Y >= 27:
            return c
        # extra moss up the wall in streaks
        if (u in (2, 3, 4) or u in (11, 12)) and fade(u, Y, 0.45 - (Y - 6) / 60.0) and c not in (K(1),):
            return RG(2) if (u + Y) % 2 else RG(3)
        # an iron ring set in the stone, once per tile
        ring = {(7, 13): K(3), (8, 13): K(4), (6, 14): K(3), (9, 14): K(2), (6, 15): K(3), (9, 15): K(2), (7, 16): K(2),
                (8, 16): K(2), (7, 12): K(1), (8, 12): K(1), (7, 11): EA(2), (8, 11): EA(1)}
        if (u, Y) in ring:
            return ring[(u, Y)]
        return c


class BarrowFaceCandle(BarrowFace):
    """Barrow style 2: the niches hold a lit candle, a warm glow on the stone round each one."""
    bundle = False
    candle = True

    def at(self, u, Y):
        c = super().at(u, Y)
        if Y <= 5 or Y >= 27:
            return c
        # glow pool on the ashlar around the niche
        d = math.hypot(u - 7.5, Y - 19.5)
        if 6.8 < d < 11.5 and c in (K(3), K(4), K(2)) and fade(u, Y, 0.55 * (1 - (d - 6.8) / 4.7)) and (u + Y) % 2 == 0:
            return SW(3) if c != K(2) else SW(2)
        return c


class BarrowFaceRam(BarrowFace):
    """Barrow style 3: a carved ram's head in relief on every tile, no niches (the shepherds' mark)."""
    niche = False

    RAM = ['..aa....aa..',
           '.abba..abba.',
           'abbcb..bcbba',
           'abcbbbbbbcba',
           '.abbbbbbbba.',
           '..abbddbba..',
           '..abdeedba..',
           '...abeeba...',
           '....abba....',
           '.....aa.....']

    def at(self, u, Y):
        c = super().at(u, Y)
        if Y <= 5 or Y >= 27:
            return c
        i, j = u - 2, Y - 11
        if 0 <= j < len(self.RAM) and 0 <= i < 12:
            ch = self.RAM[j][i]
            if ch == 'a':
                return K(1)
            if ch == 'b':
                return K(4) if (i + j) % 4 else K(5)
            if ch == 'c':
                return K(3)
            if ch == 'd':
                return K(2)
            if ch == 'e':
                return K(1)
        return c


class CellarFace(_Face):
    """Cellar face: a pale cornice with an ice lip, blue-grey ashlar, a night-blue band of stars (a gold line above
    and below, a ribbon of ice stars every 5 px), a dark plinth. Reads as 'the Keepers' work'."""
    edge_l = IK(1)
    edge_r = IK(1)

    def at(self, u, Y):
        if Y <= 5:
            return [DARK, K(4), ICE(2), K(5), K(4), K(2)][Y]
        if Y >= 28:
            return [K(3), K(2), IK(1), DARK][Y - 28]
        if Y == 27:
            return K(4)
        # the star band: Y 14..19
        if Y == 13:
            return GD(2) if u % 2 == 0 else GD(1)
        if Y == 20:
            return GD(1) if u % 2 == 0 else IK(1)
        if 14 <= Y <= 19:
            col = IK(2) if Y in (14, 19) else IK(1)
            if (u + 3) % 8 == 0 and Y == 16:
                return ICE(3)
            if (u + 3) % 8 in (1, 7) and Y == 16:
                return IK(4)
            if (u + 3) % 8 == 0 and Y in (15, 17):
                return ICE(1)
            if (u + 7) % 8 == 0 and Y == 17:
                return ICE(2)
            if (u * 3 + Y) % 11 == 0:
                return IK(3)
            return col
        col = ashlar(u, Y, 6, 8101, c1=K(1), c2=K(2), c3=K(3), c4=K(4))
        # a cool blue cast on every other course: the joint is blue ink
        if col == K(1):
            return IK(2) if (u + Y) % 3 else IK(1)
        return col


class CellarFaceChart(CellarFace):
    """Cellar style 1: the star band is replaced by a star chart: three constellations in gold-white dots joined by hairlines
    on the night-blue field (the Keepers' ceiling, copied on the wall)."""

    def at(self, u, Y):
        c = super().at(u, Y)
        if Y <= 5 or Y >= 27:
            return c
        if 7 <= Y <= 26 and 2 <= u <= 13:
            # a night panel with a pale frame
            if Y in (7, 26) or u in (2, 13):
                return K(5) if (u == 2 or Y == 7) else K(2)
            col = IK(1) if (u + Y) % 5 else IK(2)
            stars = {(4, 11): 3, (7, 13): 2, (10, 12): 3, (11, 16): 2, (8, 18): 3, (5, 20): 2, (9, 22): 2, (4, 16): 1}
            if (u, Y) in stars:
                return GD(5) if stars[(u, Y)] == 3 else (ICE(2) if stars[(u, Y)] == 2 else IK(4))
            line = {(5, 12): 1, (6, 12): 1, (8, 12): 1, (9, 12): 1, (10, 14): 1, (11, 15): 1, (9, 17): 1, (7, 19): 1, (6, 20): 1,
                    (5, 14): 1, (4, 13): 1, (4, 15): 1}
            if (u, Y) in line:
                return IK(3)
            return col
        return c


class CellarFaceShelf(CellarFace):
    """Cellar style 2: ink-and-oil store: racks of corked jars in alcoves between pilasters (the Keepers' store)."""

    def at(self, u, Y):
        c = super().at(u, Y)
        if Y <= 5 or Y >= 27:
            return c
        if 3 <= u <= 12 and 8 <= Y <= 25:
            if u in (3, 12) or Y in (8, 25):
                return K(5) if (u == 3 or Y == 8) else K(1)
            if Y in (15, 16):
                return WD(3) if Y == 15 else WD(1)          # the shelf plank
            jar = (u - 4) // 3 % 3
            if Y in (11, 12, 13, 14, 19, 20, 21, 22, 23, 24):
                # jars: 2 px wide with a cork and a glow, 1 px gap
                col = (u - 4) % 3
                tier = 0 if Y < 15 else 1
                if col == 2:
                    return IK(1)
                cork = (Y in (11, 19))
                if cork:
                    return WD(4)
                tone = [CY(2), IK(4), GD(3)][(jar + tier) % 3]
                return tone if (Y + col) % 3 else MT(3)
            return IK(1)
        return c


class CulvertFace(_Face):
    """Culvert face: a wet brick vault: an iron cornice, red-brown brick in running bond, an iron rib every 16 px, damp
    streaks running down from the rib rivets, an iron plinth with a rust stain."""
    edge_l = K(1)
    edge_r = EA(0)

    def at(self, u, Y):
        if Y <= 5:
            c = [DARK, K(3), K(5), K(4), K(2), K(1)][Y]
            if Y in (2, 3) and u in (3, 12):
                return MT(3) if Y == 2 else K(1)
            return c
        if Y >= 28:
            return [K(4), K(2), K(1), DARK][Y - 28]
        if Y == 27:
            return K(5)
        if 0 <= u <= 2:
            if (Y - 6) % 8 == 3 and u == 1:
                return K(5)
            if (Y - 6) % 8 == 4 and u == 1:
                return K(1)
            return [K(4), K(3), K(2)][u]
        if u == 3:
            return SD(0)
        # brick: 8 x 4, running bond
        v = (Y - 6) % 4
        k = ((Y - 6) // 4) % 4
        uu = (u + (k % 2) * 4) % 8
        if v == 3 or uu == 7:
            col = EA(0) if (u + Y) % 4 else EA(1)
        else:
            brick = ((u + (k % 2) * 4) // 8 + k * 3) % 4
            col = [RR(2), RR(1), RR(2), RR(2)][brick]
            if v == 0:
                col = RR(3) if brick == 0 else RR(2)
            n = h32(u, Y, 8201) % 17
            if n == 0:
                col = EA(2)
            elif n == 1 and v != 0:
                col = RR(1)
        # darker toward the top (soot under the cornice)
        if Y < 14 and fade(u, Y, (14 - Y) / 14.0 * 0.7) and col not in (EA(0), EA(1)):
            col = {RR(3): RR(2), RR(2): RR(1), RR(1): RR(0)}.get(col, col)
        # damp: a wet streak running down from a rivet column
        if u in (5, 13) and Y > 8 and fade(u, Y, 0.65 - (Y - 8) / 40.0) and (Y % 2 == 0):
            return WA(1) if Y > 18 else WA(2)
        # the low wall is wet: a cold sheen on the lowest courses
        if Y >= 23 and (u * 5 + Y * 3) % 7 == 0 and col not in (EA(0), EA(1)):
            return WA(2)
        return col


class CulvertFaceArch(CulvertFace):
    """Culvert style 1: a round-headed drain arch in every tile, a dark mouth with a trickle of water."""

    def at(self, u, Y):
        c = super().at(u, Y)
        if Y <= 5 or Y >= 27 or u <= 3:
            return c
        if 5 <= u <= 14 and 10 <= Y <= 26:
            cx, top = 9.5, 14.0
            r = 4.6
            if Y < top:
                if (u + 0.5 - cx) ** 2 + (top - Y) ** 2 > (r + 0.6) ** 2:
                    return c
                if (u + 0.5 - cx) ** 2 + (top - Y) ** 2 > (r - 0.8) ** 2:
                    return K(4) if u < 9 else K(2)
                return DARK
            if u in (5, 14):
                return K(4) if u == 5 else K(1)
            if Y == 26:
                return K(2)
            if u == 9 and Y >= 20:
                return WA(2) if Y % 2 else WA(3)           # the trickle
            return DARK if (u + Y) % 3 else SD(0)
        return c


class CulvertFaceGrate(CulvertFace):
    """Culvert style 2: a barred ventilation grating high in the wall, rust running from it."""

    def at(self, u, Y):
        c = super().at(u, Y)
        if Y <= 5 or Y >= 27 or u <= 3:
            return c
        if 6 <= u <= 13 and 9 <= Y <= 17:
            if u in (6, 13) or Y in (9, 17):
                return K(4) if (u == 6 or Y == 9) else K(1)
            if (u - 7) % 2 == 0:
                return K(3) if u < 10 else K(2)           # a bar
            return DARK if Y < 14 else SD(0)
        if 7 <= u <= 12 and 18 <= Y <= 24 and fade(u, Y, 0.55 - (Y - 18) / 18.0) and (u + Y) % 2 == 0:
            return RR(1)                                    # rust streak
        return c


class CulvertFaceSluice(CulvertFace):
    """Culvert style 3 (the sluice chamber): iron plates bolted over the brick, a brass wheel valve in every tile."""

    def at(self, u, Y):
        c = super().at(u, Y)
        if Y <= 5 or Y >= 27 or u <= 3:
            return c
        d = math.hypot(u - 9, Y - 16)
        if d < 5.8:
            if d >= 4.6:
                return K(1)
            if d >= 3.4:
                return GD(2) if (u + Y) % 3 else GD(3)      # the rim
            if d < 1.2:
                return GD(4)
            # spokes
            ang = math.atan2(Y - 16, u - 9)
            spoke = abs(math.sin(ang * 2)) < 0.25 or abs(math.cos(ang * 2)) < 0.25
            return GD(1) if spoke else K(2)
        return c


# ====================================================================== outer faces
class BarrowOut(OuterFace):
    shadow_line = FD(0)
    edge_dark = FD(0)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            blade = h32(x, 7903) % 3
            return [RG(3), RG(2), FD(1)][Y - 1] if Y - 1 <= blade else [K(4), K(3), K(2)][Y - 1]
        return ashlar(x, Y + 2, 4, 7904, course=7)


class CellarOut(OuterFace):
    shadow_line = IK(1)
    edge_dark = IK(1)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [ICE(2), K(5), K(3)][Y - 1]
        col = ashlar(x, Y + 2, 4, 8102, course=7)
        return IK(2) if col == K(1) else col


class CulvertOut(OuterFace):
    shadow_line = EA(0)
    edge_dark = EA(0)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [K(4), K(3), K(1)][Y - 1]
        v = (Y - 4) % 4
        k = ((Y - 4) // 4) % 2
        uu = (x + k * 4) % 8
        if v == 3 or uu == 7:
            return EA(0)
        return RR(2) if v else RR(3)


FLOORS = [BarrowFloor(), BarrowFlag(), BarrowRunner(), CellarFloor(), CellarSlate(), CellarInlay(),
          CulvertFloor(), CulvertFlag(), CulvertWet()]
WALLS = [
    ('x1_barrow', BarrowTop(), BarrowFace(), BarrowDeep(), BarrowOut()),
    ('x1_cellar', CellarTop(), CellarFace(), CellarDeep(), CellarOut()),
    ('x1_culvert', CulvertTop(), CulvertFace(), CulvertDeep(), CulvertOut()),
]
FACE_STYLES = {
    'x1_barrow': [None, [BarrowFaceMoss()], [BarrowFaceCandle()], [BarrowFaceRam()]],
    'x1_cellar': [None, [CellarFaceChart()], [CellarFaceShelf()]],
    'x1_culvert': [None, [CulvertFaceArch()], [CulvertFaceGrate()], [CulvertFaceSluice()]],
}
# rooms: the map id carries the plan; each connected wall run takes the next style in `cycle` (reading order).
FACE_PLAN = {
    'x1_barrow': {'x1_barrow': {'cycle': [0, 2, 1, 0, 3, 2, 1]}},
    'x1_cellar': {'x1_cellar': {'cycle': [0, 1, 2, 0, 1]}},
    'x1_culvert': {'x1_culvert': {'cycle': [0, 1, 0, 2, 1, 3]}},
}
