"""Episode 7 (The Vanishing World) terrains and wall systems -> assets/tiles/ep7.png (E7-tiles, EPISODE7_PLAN 9.1, 4 and
5.1). Imported by ep7.py.

The phone rule (plan 4): the fade (the forgotten map) must never read as walkable snow. It is flat paper white with at most
a faint grain, no footprints, no shading, no edges of its own; it is the LOWEST terrain, so every floor over it draws its
own lip and a front face (the ground stops, there is a drop into nothing). Snow ground beside it is textured (wind
ripples, drift shadows, sparkle, footprints) and at least 0.1 luma darker; a held path is packed blue-white ice with
footprints, at least 0.2 darker. The three Vault floors look nothing alike: F1 frost brick and clear ice glass over the
white; F2 dark letter stone (the lamp pools are the lighting layer's); F3 a white nave floor in big cool slabs with
pillar shadows, under the aurora tint.

Terrains (A2 fill unless noted):
  fade          A1, 2 frames (a slow paper grain), collision void: the void of every Episode 7 map; lowest of all
  lake_water    A1, 3 frames, collision water: the open lead of the frozen lake (dark cold water, floes)
  frozen_lake   hole, collision none: the lake's walkable ice, its shore a snow bank (the Kestrel lands on it)
  permafrost    dark frozen ground, frost crystals in the cracks (the Vault approach, under eaves)
  snowfield     textured snow ground with drifts; the road's verges and the town's open ground
  icebrick      the town's streets: ice-blue brick paving
  frostmosaic   the town square: a cool mosaic, an aurora-green star inlay (variant)
  frostbrick    F1: frost-rimed pale brick (galleries over the fade)
  letter_stone  F2: dark flagstones with carved letter niches
  nave_ice      F3: the nave's white floor, big cool slabs, pillar shadows
  iceglass      F1 landings: clear ice with depth, frozen bubbles, a sheen
  icebridge     an ice span: long slabs, a worn line, a thick arch front
  icepath       a held path (and the White Road on ground): packed blue-white ice, footprints across it

Wall systems (<sys>_top band, <sys>_face 2-row inner face, <sys>_out_top the beyond, <sys>_out_face):
  icewall       the town's blue-ice ramparts and the road's ice cliffs: snow cap, ice blocks; beyond: snow and pine tops
  vault_wall    F1: frost-brick coping and faces with icicles; beyond: the white (the fade's own colour, still)
  bell_hall     F2: dark stone, niches lit and dark, carved letters; beyond: the dark
  nave          F3: tall ice pillars (each face tile a rounded column); beyond: the night sky with aurora
"""
import math
from pxlib import Canvas, C, DARK, WHITE, rnd, h32, SH, hexc, profile1d
from autotile import EdgeSpec
from terrain import Terrain, Water, blank
from archive_floors import FloorBase, BandTop, DeepTop, OuterFace, fade, bayer
from ep4_kit import _Face
from ep6_kit import Platform

WD = lambda i: C('wood', i)
SW = lambda i: C('stone_warm', i)
SC = lambda i: C('stone_cool', i)        # 251d34 2e2b4c 4c445c 66637f 8e8997 b3b6c4
GD = lambda i: C('gold', i)
WA = lambda i: C('water', i)             # 0e153b 1d3775 24559b 3e88ca 6ab3e4 b4e4f2
IC = lambda i: C('ice', i)               # 3e88ca 6ab3e4 b4e4f2 e8fffb
RB = lambda i: C('roof_blue', i)
MT = lambda i: C('metal', i)             # 2e2b4c 66637f b3b6c4 e2e0de f6f4ee
FD = lambda i: C('foliage_dark', i)      # 1b2332 1c3730 2a532f 427330
RG = lambda i: C('roof_green', i)
FI = lambda i: C('fire', i)
INK = lambda i: C('ink', i)
MV = lambda i: C('magic_violet', i)      # 522a84 7040aa 9062c3 bc94e2 f6f4ee
CY = lambda i: C('magic_cyan', i)
EA = lambda i: C('earth', i)

# ---------------------------------------------------------------------- the colours the master palette lacks
# (reported by E7-tiles; ep7.py snaps the sheet to palette.json PLUS these). Snow: the palette's pale blues are water and
# ice (saturated cyan) and its greys lean violet or warm, so a cool neutral snow shade has nothing between #b3b6c4 and
# #e2e0de; five steps from the drift shadow to the lit crust. The fade's grain: one step under the paper white (the
# palette's next step #e2e0de is far too strong for a grain that must not read as texture). Packed ice: a desaturated
# blue ramp for the held path and the road (the palette's blues are sky and water, too saturated to be stood on). The
# ghost print: the pale blue-grey of a footprint on the fade (the recipe E7-world draws). Aurora: a green ramp (the palette
# has cyan and violet but no aurora green; the violet comes from magic_violet).
EXTRA = ['#56648a', '#8090b2', '#a9b8d0', '#c9d4e3', '#e2e8f0',   # snow 0 (drift shadow) .. 4 (lit crust)
         '#eeede7',                                              # the fade's grain
         '#4c6a99', '#7192c0', '#9db7d8',                        # packed ice 0 .. 2
         '#c3cad6',                                              # the ghost print
         '#2f9e7e', '#5fd3a2', '#a9f2cf']                        # aurora green 0 .. 2
SN = lambda i: hexc(EXTRA[max(0, min(4, i))])
GRAIN = hexc(EXTRA[5])
IP = lambda i: hexc(EXTRA[6 + max(0, min(2, i))])
GHOST = hexc(EXTRA[9])
AG = lambda i: hexc(EXTRA[10 + max(0, min(2, i))])
PAPER = MT(4)            # the fade: flat paper white (#f6f4ee)


# ====================================================================== the fade
GRAIN_PTS = [[(2, 3), (11, 6), (6, 12), (14, 14)], [(5, 1), (13, 10), (1, 9), (9, 14)]]


class Fade(Water):
    """The void: flat paper white. A1, 2 frames: a handful of grain specks one step under white move between the frames
    (a slow paper grain, never a pattern). No edges, no shading, no footprints: the lowest terrain, so every floor over it
    draws its own lip and front face."""
    id = 'fade'
    kind = 'fill'
    collision = 'void'
    frames = 2

    def __init__(self):
        Terrain.__init__(self)
        self.specs = {'all': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb')}

    def make_texture(self, frame, variant):
        t = blank(PAPER)
        for (x, y) in GRAIN_PTS[frame % 2]:
            t[y][x] = GRAIN
        return t

    def pixel(self, c, x, y):
        return self.tex(c, x, y)


class LakeWater(Water):
    """The open lead of the frozen lake (A1, 3 frames, collision water): dark cold water, a few floes drifting a pixel,
    a white ice shelf where it meets anything."""
    id = 'lake_water'
    kind = 'hole'
    collision = 'water'

    def __init__(self):
        Terrain.__init__(self)
        prof = {s: profile1d(7700 + i, amp=0.8, spikes=0) for i, s in enumerate('NSWE')}
        self.specs = {'surf': EdgeSpec({'N': 1.0, 'S': 1.0, 'W': 1.0, 'E': 1.0}, r=2.5, rr=1.5, prof=prof)}

    def make_texture(self, frame, variant):
        t = blank(WA(1))
        for y in range(16):
            for x in range(16):
                if (x + 2 * y + frame) % 11 == 0:
                    t[y][x] = WA(2)
                elif h32(x, y, 7701) % 29 == 0:
                    t[y][x] = WA(0)
        for (fx, fy, L) in ((3, 4, 4), (10, 11, 3)):
            for k in range(L):
                t[fy][(fx + k + frame) % 16] = SN(3)
                t[fy + 1][(fx + k + frame) % 16] = SN(1) if k else SN(2)
        return t

    def pixel(self, c, x, y):
        if not c.i('surf', x, y):
            return None
        d = c.f('surf', x, y)
        if d < 1.2:
            return SN(4)
        if d < 2.2:
            return SN(2) if c.side('surf', x, y) in ('N', 'W') else IC(2)
        if d < 3.2:
            return WA(0)
        return self.tex(c, x, y)


class FrozenLake(Terrain):
    """The lake's walkable ice (hole, collision none): grey-blue ice with long white cracks and drifted snow streaks, the
    shore a snow bank with a shadow line under it."""
    id = 'frozen_lake'
    kind = 'hole'
    collision = 'none'
    nvariants = 4
    weights = [10, 2, 2, 1]

    def __init__(self):
        super().__init__()
        prof = {s: profile1d(7710 + i, amp=0.9, spikes=0) for i, s in enumerate('NSWE')}
        self.specs = {'surf': EdgeSpec({'N': 1.0, 'S': 1.0, 'W': 1.0, 'E': 1.0}, r=3.0, rr=2.0, prof=prof)}

    def make_texture(self, frame, variant):
        t = blank(IP(2))
        for y in range(16):
            for x in range(16):
                n = h32(x // 3, y // 2, 7711) % 7
                if n == 0:
                    t[y][x] = IP(1)
                elif (x - 2 * y) % 16 == 0 and y % 5 != 2:
                    t[y][x] = SN(4)
                elif (x + y * 3) % 23 == 0:
                    t[y][x] = SN(3)
        if variant == 1:     # a long crack
            for k in range(12):
                t[3 + k // 2][2 + k] = IP(0) if k % 3 else SN(4)
        elif variant == 2:   # a snow streak blown over the ice
            for x in range(3, 14):
                t[9][x] = SN(3)
                if 5 < x < 11:
                    t[8][x] = SN(4)
        elif variant == 3:   # a dark bubble seam
            for (x, y) in ((5, 5), (6, 6), (8, 6), (9, 7), (11, 8)):
                t[y][x] = IP(0)
        return t

    def pixel(self, c, x, y):
        if not c.i('surf', x, y):
            return None
        d = c.f('surf', x, y)
        side = c.side('surf', x, y)
        if d < 1.4:
            return SN(4) if side in ('N', 'W') else SN(3)
        if d < 2.4:
            return SN(1) if side in ('N', 'W') else SN(2)
        if d < 3.0 and side in ('N', 'W'):
            return IP(1)
        return self.tex(c, x, y)


# ====================================================================== ground (every one a Platform over the fade)
class SnowGround(Platform):
    """Base for snow-topped ground: a crisp blue-grey lip where the ground meets the fade, and on the south a snow bank
    front (lit crust, shade, a dark root) dropping into the white."""
    edge_dark = SN(1)
    lip_n = SN(2)
    edge_lit = SN(4)
    edge_shade = SN(2)
    front = (SN(3), SN(1), SN(1), SN(0))
    under = SN(0)


class SnowField(SnowGround):
    """Textured snow ground: a cool crust (snow 3) with wind ripples (a lit snow 4 line above a snow 2 shadow line, the
    sastrugi), a dither of drift shadow, sparkle. Variants: a pair of footprints, a twig, a buried stone, a small drift,
    hare tracks. Measured against the fade on the phone crop: at least 0.1 darker and textured (ep7_scenes checks)."""
    id = 'snowfield'
    nvariants = 6
    weights = [40, 3, 2, 2, 3, 2]

    def make_texture(self, frame, variant):
        t = blank(SN(3))
        for y in range(16):
            for x in range(16):
                wave = (y + int(round(1.6 * math.sin((x + 3) * math.pi / 8.0)))) % 6
                if wave == 0:
                    t[y][x] = SN(4)
                elif wave == 1 and (x + y) % 3:
                    t[y][x] = SN(2)
                elif wave == 4 and bayer(x, y) < 0.3:
                    t[y][x] = SN(2)
                if h32(x, y, 7720) % 41 == 0:
                    t[y][x] = PAPER
        if variant == 1:     # two footprints
            for (fx, fy) in ((5, 4), (9, 10)):
                for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2)):
                    t[fy + dy][fx + dx] = SN(1) if dy < 2 else SN(2)
                t[fy - 1][fx] = SN(4)
        elif variant == 2:   # a black twig
            for k in range(6):
                t[9 - k // 2][4 + k] = FD(0)
            t[6][7] = FD(1)
        elif variant == 3:   # a buried stone
            for (x, y) in ((6, 8), (7, 8), (8, 8), (9, 9), (5, 9), (6, 9), (7, 9), (8, 9)):
                t[y][x] = SC(3) if y == 9 else SC(4)
            t[7][6] = SN(4); t[7][7] = SN(4); t[7][8] = SN(4)
        elif variant == 4:   # a small drift: a lit crest, a shadow tucked under it
            for x in range(3, 13):
                h = int(round(2.2 * math.sin((x - 3) * math.pi / 10.0)))
                t[10 - h][x] = SN(4)
                t[11][x] = SN(2) if (x + 1) % 3 else SN(1)
        elif variant == 5:   # hare tracks
            for (x, y) in ((3, 12), (5, 11), (8, 8), (10, 7), (13, 4)):
                t[y][x] = SN(1)
                t[y][x + 1] = SN(2)
        return t


class Permafrost(SnowGround):
    """Dark frozen ground: blue-grey earth, frost crystals in the cracks (the Vault approach, the ground under eaves)."""
    id = 'permafrost'
    nvariants = 4
    weights = [10, 2, 2, 1]
    lip_n = SN(1)
    edge_dark = SC(0)
    edge_lit = SN(2)
    edge_shade = SC(2)
    front = (SN(1), SC(2), SC(1))
    under = SC(0)

    def make_texture(self, frame, variant):
        t = blank(SC(2))
        for y in range(16):
            for x in range(16):
                n = h32(x // 2, y // 2, 7730) % 9
                if n == 0:
                    t[y][x] = SC(1)
                elif n == 1:
                    t[y][x] = SC(3)
                if (x + y * 2) % 13 == 0 and y % 4 != 3:
                    t[y][x] = SC(1)
                    if x + 1 < 16:
                        t[y][x + 1] = SN(2)
                if h32(x, y, 7731) % 37 == 0:
                    t[y][x] = SN(3)
        if variant == 1:
            for k in range(5):
                t[4 + k][9 - k] = SN(1)
        elif variant == 2:
            for (x, y) in ((4, 11), (5, 11), (5, 10)):
                t[y][x] = SN(4)
        elif variant == 3:
            t[7][7] = IC(2); t[6][8] = IC(3)
        return t


class IceBrick(SnowGround):
    """Palehaven's streets: ice-blue brick paving (8 x 4 bricks in running bond), snow in the joints, a frost bloom on some
    bricks. Front: the street's kerb."""
    id = 'icebrick'
    nvariants = 4
    weights = [12, 2, 2, 1]
    lip_n = SN(3)
    edge_dark = SN(0)
    edge_lit = SN(4)
    edge_shade = SN(1)
    front = (SN(2), SN(1), SN(0))
    under = SN(0)

    def make_texture(self, frame, variant):
        t = blank(SN(2))
        for y in range(16):
            row = y // 4
            v = y % 4
            for x in range(16):
                u = (x + (row % 2) * 4) % 8
                tone = h32((x + (row % 2) * 4) // 8, row, 7740) % 3
                c = [SN(2), IC(2), SN(2)][tone]
                if v == 3 or u == 7:
                    c = SN(4) if (x + y) % 3 == 0 else SN(1)
                elif v == 0:
                    c = SN(3)
                t[y][x] = c
        if variant == 1:
            for (x, y) in ((3, 5), (4, 6), (5, 5), (4, 4)):
                t[y][x] = SN(4)
        elif variant == 2:
            for x in range(9, 14):
                t[9][x] = SN(4)
        elif variant == 3:
            t[13][2] = FD(0); t[13][3] = FD(0); t[12][3] = FD(1)
        return t


class FrostMosaic(SnowGround):
    """The town square: a cool mosaic of small square tesserae set on the diagonal (ice blue, snow and a deep blue
    border), snow joints. Variant 1: the aurora-green star inlay (the hearth's ring)."""
    id = 'frostmosaic'
    nvariants = 4
    weights = [16, 1, 2, 2]
    lip_n = SN(3)
    edge_dark = SN(0)
    edge_lit = SN(4)
    edge_shade = SN(1)
    front = (SN(2), SN(1), SN(0))
    under = SN(0)

    def make_texture(self, frame, variant):
        t = blank(SN(3))
        for y in range(16):
            for x in range(16):
                u, v = (x + y) % 8, (x - y) % 8
                if u == 0 or v == 0:
                    t[y][x] = SN(2)
                else:
                    k = ((x + y) // 8 + (x - y + 32) // 8) % 3
                    t[y][x] = [SN(3), SN(3), SN(4)][k] if (u, v) != (1, 1) else SN(4)
        if variant == 1:
            for y in range(16):
                for x in range(16):
                    dx, dy = x - 7.5, y - 7.5
                    a = math.atan2(dy, dx)
                    r = math.hypot(dx, dy)
                    star = 3.2 + 2.6 * abs(math.cos(a * 4 / 2.0))
                    if r < star - 1.1:
                        t[y][x] = AG(2) if dx + dy < -1 else AG(1)
                    elif r < star:
                        t[y][x] = AG(0)
        elif variant == 2:
            for (x, y) in ((4, 9), (5, 9), (5, 10), (6, 10)):
                t[y][x] = PAPER
        elif variant == 3:
            for (x, y) in ((10, 4), (11, 4), (11, 5)):
                t[y][x] = SN(1)
        return t


class FrostBrick(SnowGround):
    """F1's floor: pale blue brick (12 x 6 in running bond), each brick's top rimed white, dark cold joints, frost
    feathers on some bricks. Pale, but gridded and blue: never the fade's flat white."""
    id = 'frostbrick'
    nvariants = 4
    weights = [12, 2, 2, 1]
    lip_n = SN(4)
    edge_dark = SN(0)
    edge_lit = SN(4)
    edge_shade = SN(1)
    front = (SN(2), SN(1), SN(1), SN(0))
    under = SN(0)

    def make_texture(self, frame, variant):
        t = blank(SN(2))
        for y in range(16):
            row = y // 4
            v = y % 4
            for x in range(16):
                u = (x + (row % 2) * 6) % 12
                if v == 3 or u == 11:
                    c = SN(1)
                elif v == 0:
                    c = SN(4) if u % 3 else SN(3)
                else:
                    c = SN(2) if h32((x + (row % 2) * 6) // 12, row, 7750) % 3 else IC(2)
                t[y][x] = c
        if variant == 1:     # frost feathers
            for k in range(4):
                t[6 + k][4 + k] = SN(4)
                t[6 + k][5 + k] = SN(3)
        elif variant == 2:   # a cracked brick
            for (x, y) in ((9, 9), (10, 10), (10, 11), (11, 12)):
                t[y][x] = SN(0)
        elif variant == 3:   # a dropped iceglass shard
            t[5][11] = IC(3); t[6][11] = IC(1); t[6][12] = IC(2)
        return t


class LetterStone(Platform):
    """F2's floor: dark flagstones (cool violet-grey slabs of uneven size, darker joints) with letter niches: a small
    sunk rectangle in some slabs with a scratched glyph, never a readable letter. Dark overall (F2 is the dark floor; the
    lamp pools are the lighting layer's)."""
    id = 'letter_stone'
    nvariants = 5
    weights = [12, 3, 3, 2, 1]
    lip_n = SC(3)
    edge_dark = SC(0)
    edge_lit = SC(3)
    edge_shade = SC(1)
    front = (SC(2), SC(1), SC(0))
    under = DARK
    SLABS = [(0, 0, 9, 7), (9, 0, 7, 8), (0, 7, 6, 9), (6, 7, 5, 5), (11, 8, 5, 8), (6, 12, 5, 4)]

    def make_texture(self, frame, variant):
        t = blank(SC(1))
        for k, (x0, y0, w, h) in enumerate(self.SLABS):
            tone = [SC(2), SC(1), SC(2)][h32(k, 7760) % 3]
            for yy in range(h):
                for xx in range(w):
                    X, Y = (x0 + xx) % 16, (y0 + yy) % 16
                    if xx == w - 1 or yy == h - 1:
                        c = SC(0)
                    elif yy == 0 or xx == 0:
                        c = SC(3) if tone == SC(2) else SC(2)
                    else:
                        c = tone if h32(X, Y, 7761) % 13 else SC(0)
                    t[Y][X] = c
        if variant in (1, 2):   # a letter niche with a glyph scratched in it
            x0, y0 = (3, 3) if variant == 1 else (11, 10)
            for yy in range(4):
                for xx in range(4):
                    t[y0 + yy][x0 + xx] = DARK if yy == 0 or xx == 0 else SC(0)
            g = [(1, 1), (2, 1), (2, 2), (1, 3), (3, 2)] if variant == 1 else [(1, 1), (1, 2), (1, 3), (2, 2), (3, 1)]
            for (gx, gy) in g:
                if gy < 4 and gx < 4:
                    t[y0 + gy][x0 + gx] = SC(3)
        elif variant == 3:      # rime on a joint
            for x in range(4, 10):
                t[7][x] = SN(1) if x % 2 else SC(3)
        elif variant == 4:      # a gold glint: a lettered niche catching the lamp
            t[5][5] = GD(4); t[5][6] = GD(3); t[4][5] = SC(0)
        return t


class NaveIce(Platform):
    """F3's floor: the nave, big slabs of white ice-stone (cool snow 3 and 4, never the paper white), pale snow 2 joints,
    long pillar shadows lying across some slabs (variants, dithered), a faint aurora gleam. Under the aurora tint it stays
    the lightest floor, so the party's floor holds 0.22."""
    id = 'nave_ice'
    nvariants = 5
    weights = [12, 3, 3, 2, 1]
    lip_n = SN(4)
    edge_dark = SN(1)
    edge_lit = SN(4)
    edge_shade = SN(2)
    front = (SN(3), SN(2), SN(1), SN(0))
    under = SN(0)

    def make_texture(self, frame, variant):
        t = blank(SN(3))
        for y in range(16):
            for x in range(16):
                u = (x + (y // 8) * 8) % 16
                v = y % 8
                if v == 7 or u == 15:
                    c = SN(2)
                elif v == 0:
                    c = SN(4)
                else:
                    c = SN(3) if h32(x, y, 7770) % 9 else SN(4)
                t[y][x] = c
        if variant in (1, 2):   # a pillar's shadow lying across the slab (dithered band, diagonal)
            for y in range(16):
                for x in range(16):
                    d = (x - y + (0 if variant == 1 else 6)) % 16
                    if 2 <= d <= 7 and bayer(x, y) < 0.55:
                        t[y][x] = SN(2) if t[y][x] != SN(2) else SN(1)
        elif variant == 3:      # an aurora gleam on the polish
            for k in range(4):
                t[4 + k][6 + k] = AG(2) if k % 2 else SN(4)
        elif variant == 4:      # a hairline crack
            for (x, y) in ((3, 10), (4, 11), (5, 11), (6, 12)):
                t[y][x] = SN(1)
        return t


class IceGlass(Platform):
    """F1's landings: clear ice with depth: a mid ice blue, darker depth where the ice is thick (the lower half of each
    8 px pane), frozen bubbles, a bright sheen diagonal, no grid of brass (Episode 6's stormglass had one: this is ice).
    The front is the slab's cut edge, ice blue to deep blue."""
    id = 'iceglass'
    nvariants = 4
    weights = [12, 2, 2, 1]
    lip_n = IC(3)
    edge_dark = WA(1)
    edge_lit = IC(3)
    edge_shade = WA(2)
    front = (IC(2), IC(1), WA(3), WA(2), WA(1))
    under = WA(0)

    def make_texture(self, frame, variant):
        t = blank(IC(1))
        for y in range(16):
            for x in range(16):
                d = (x + y) % 16
                c = IC(1)
                if d in (3, 4):
                    c = IC(2)                      # the long sheen
                elif d == 5 and x % 2:
                    c = IC(2)
                elif d in (11, 12) and bayer(x, y) < 0.5:
                    c = WA(3)                      # depth under the sheen
                t[y][x] = c
        for (x, y) in ((3, 11), (12, 4), (9, 13)):
            t[y][x] = IC(3)
            t[y + 1 if y < 15 else y][x] = WA(2)
        if variant == 1:     # a frozen leaf deep in the ice
            for (x, y) in ((6, 9), (7, 9), (7, 10), (8, 10)):
                t[y][x] = WA(1)
        elif variant == 2:   # a seam of bubbles
            for k in range(5):
                t[3 + k * 2][10 - k] = IC(3)
        elif variant == 3:   # a dark crack
            for k in range(6):
                t[2 + k][3 + (k // 2)] = WA(1)
        return t


class IceBridge(Platform):
    """An ice span: long slabs laid across the span (ice blue 2 with lit tops), a worn line down the middle, packed snow
    along the sides; the front is the thick ice arch going deep blue."""
    id = 'icebridge'
    nvariants = 3
    weights = [10, 2, 2]
    lip_n = SN(4)
    edge_dark = WA(1)
    edge_lit = SN(4)
    edge_shade = IC(0)
    front = (IC(2), IC(1), IC(1), WA(3), WA(2))
    under = WA(1)

    def make_texture(self, frame, variant):
        t = blank(IC(2))
        for y in range(16):
            for x in range(16):
                v = y % 8
                u = (x + (y // 8) * 5) % 16
                if v == 7 or u == 15:
                    c = IC(0)
                elif v == 0:
                    c = IC(3)
                else:
                    c = IC(2)
                    if 6 <= x <= 9 and h32(x, y, 7780) % 3:
                        c = IP(2)
                t[y][x] = c
        if variant == 1:
            for x in range(3, 7):
                t[11][x] = SN(4)
        elif variant == 2:
            t[4][12] = IC(3); t[5][12] = IC(0)
        return t


class IcePath(Platform):
    """A held path and the White Road on firm ground: packed blue-white ice (packed ice 1 and 2, the snow's crust pressed
    smooth), a line of footprints running along it (period 16, so a run joins into one trail), a darker rut each side.
    At least 0.2 luma below the fade, and textured. Front: the trodden crust over a pale ice edge."""
    id = 'icepath'
    nvariants = 4
    weights = [16, 3, 3, 2]
    lip_n = SN(3)
    edge_dark = IP(0)
    edge_lit = SN(3)
    edge_shade = IP(0)
    front = (IP(2), IP(1), IP(0))
    under = SN(0)
    PRINTS = ((4, 2), (9, 6), (4, 10), (9, 14))

    def make_texture(self, frame, variant):
        t = blank(IP(2))
        for y in range(16):
            for x in range(16):
                c = IP(2)
                if x in (1, 14):
                    c = IP(1) if y % 4 else IP(2)          # the ruts each side
                elif x in (0, 15) and y % 3 == 0:
                    c = SN(3)                              # the crust kicked up at the road's verge
                elif h32(x // 3, y // 2, 7790) % 9 == 0:
                    c = IP(1)                              # a smoothed patch
                elif (x + y * 5) % 23 == 0:
                    c = SN(3)                              # a glint of crust
                t[y][x] = c
        prints = self.PRINTS if variant != 3 else ((3, 3), (11, 5), (4, 11), (12, 13))
        for (fx, fy) in prints:
            for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2)):
                t[(fy + dy) % 16][fx + dx] = IP(0) if dy < 2 else IP(1)
            t[(fy + 3) % 16][fx] = SN(3)
        if variant == 1:     # a sledge runner line
            for y in range(16):
                t[y][7] = IP(1) if y % 4 else IP(2)
        elif variant == 2:   # loose snow kicked onto the road
            for (x, y) in ((11, 3), (12, 3), (12, 4), (2, 12), (3, 12)):
                t[y][x] = SN(3)
        return t


# ====================================================================== wall bands
class IceTop(BandTop):
    """The rampart / cliff band: a snow cap (lit crust, wind ripples) over blue ice; the front lip a lit snow crust."""
    id = 'icewall_top'
    seed = 7810
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(SN(3))
        for y in range(16):
            for x in range(16):
                wave = (y + int(round(1.3 * math.sin(x * math.pi / 8.0)))) % 5
                t[y][x] = SN(4) if wave == 0 else (SN(2) if wave == 1 and (x + y) % 2 else SN(3))
        if variant == 1:
            for (x, y) in ((4, 8), (5, 8), (6, 9)):
                t[y][x] = FD(0)
        elif variant == 2:
            for x in range(8, 13):
                t[12][x] = IC(2)
        elif variant == 3:
            t[5][11] = PAPER
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [PAPER, SN(4), SN(2), IC(1)][min(3, int(d))]
        if side == 'N':
            return SN(1) if d < 1 else SN(2)
        if side == 'W':
            return SN(2) if d < 1 else SN(4)
        return SN(1) if d < 1 else SN(2)


class VaultTop(BandTop):
    """F1's band: frost-brick coping (long pale blocks with rime on their tops), cold dark joints."""
    id = 'vault_wall_top'
    seed = 7820
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(SN(2))
        for y in range(16):
            for x in range(16):
                v = y % 8
                u = (x + (y // 8) * 8) % 16
                if v == 7 or u == 15:
                    t[y][x] = SN(1)
                elif v == 0:
                    t[y][x] = SN(4)
                elif v == 1:
                    t[y][x] = SN(3)
        if variant == 1:
            for (x, y) in ((4, 4), (5, 5), (6, 5)):
                t[y][x] = SN(0)
        elif variant == 2:
            t[11][9] = IC(3); t[11][10] = IC(2)
        elif variant == 3:
            for x in range(2, 7):
                t[3][x] = PAPER
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [SN(4), SN(3), SN(2), SN(1)][min(3, int(d))]
        if side == 'N':
            return SN(0) if d < 1 else SN(1)
        if side == 'W':
            return SN(1) if d < 1 else SN(4)
        return SN(0) if d < 1 else SN(2)


class HallTop(BandTop):
    """F2's band: dark stone coping, a cold rime line along the front, joints near black."""
    id = 'bell_hall_top'
    seed = 7830
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(SC(1))
        for y in range(16):
            for x in range(16):
                v = y % 8
                c = SC(1) if (x // 8 + y // 8) % 2 == 0 else SC(2)
                if v == 7 or x % 8 == 7:
                    c = SC(0)
                elif v == 0 or x % 8 == 0:
                    c = SC(2) if c == SC(1) else SC(3)
                t[y][x] = c
        if variant == 1:
            for x in range(16):
                t[5][x] = SC(0) if x % 3 else SC(2)
        elif variant == 2:
            t[10][4] = GD(3); t[10][5] = GD(2)
        elif variant == 3:
            for x in range(9, 14):
                t[12][x] = SN(1)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [SN(1), SC(3), SC(2), SC(0)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else SC(0)
        if side == 'W':
            return SC(0) if d < 1 else SC(3)
        return DARK if d < 1 else SC(1)


class NaveTop(BandTop):
    """F3's band: the pillars' ice-crusted capitals seen from above: cool white slabs, ice blue joints, a rim of rime."""
    id = 'nave_top'
    seed = 7840
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(SN(3))
        for y in range(16):
            for x in range(16):
                r = math.hypot((x % 8) - 3.5, (y % 8) - 3.5)
                if r > 3.6:
                    t[y][x] = SN(2)
                elif r < 1.5:
                    t[y][x] = SN(4)
        if variant == 1:
            t[3][3] = AG(2); t[11][11] = AG(1)
        elif variant == 2:
            for x in range(4, 12):
                t[8][x] = IC(2)
        elif variant == 3:
            t[12][4] = MV(3)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [SN(4), SN(3), IC(2), IC(1)][min(3, int(d))]
        if side == 'N':
            return WA(1) if d < 1 else SN(2)
        if side == 'W':
            return SN(2) if d < 1 else SN(4)
        return WA(1) if d < 1 else SN(2)


# ====================================================================== the beyond
class IceDeep(DeepTop):
    """Beyond the ramparts and the road's cliffs: snow (still), pine tops poking through in some variants."""
    id = 'icewall_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(SN(3))
        for y in range(16):
            for x in range(16):
                if (y + int(round(1.3 * math.sin((x + variant) * math.pi / 8.0)))) % 6 == 0:
                    t[y][x] = SN(4)
        if variant in (1, 2):
            cx = 5 if variant == 1 else 10
            for y in range(3, 14):
                hw = (y - 3) // 2
                for x in range(cx - hw, cx + hw + 1):
                    if 0 <= x < 16:
                        t[y][x] = FD(0) if (x + y) % 3 else FD(1)
                if y % 3 == 0:
                    for x in (cx - hw, cx + hw):
                        if 0 <= x < 16:
                            t[y][x] = SN(4)
        elif variant == 3:
            for x in range(4, 12):
                t[9][x] = SN(2)
        return t


class VaultDeep(DeepTop):
    """Beyond F1's walls: the white, as still as the fade (nothing to stand on). A pale undercroft pillar shows in some
    variants (snow 4 on paper), so the beyond is not a flat hole."""
    id = 'vault_wall_out_top'
    weights = [10, 2, 2, 1, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(PAPER)
        if variant in (1, 2):
            x0 = 5 if variant == 1 else 9
            for y in range(16):
                for x in range(x0, x0 + 3):
                    if bayer(x, y) < 0.4:
                        t[y][x] = SN(4)
        elif variant == 3:
            t[6][6] = GRAIN
        return t


class HallDeep(DeepTop):
    """Beyond F2's walls: the dark, a far lamp now and then."""
    id = 'bell_hall_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        if variant == 1:
            for x in range(16):
                t[8][x] = SC(0)
        elif variant == 2:
            t[5][9] = GD(1)
        elif variant == 3:
            for y in range(16):
                t[y][4] = SC(0)
        elif variant == 4:
            t[11][12] = SC(1)
        return t


class NaveDeep(DeepTop):
    """Beyond F3's walls: the night through the broken roof: deep blue, a star or two, an aurora wisp in some variants."""
    id = 'nave_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(INK(1))
        for y in range(16):
            for x in range(16):
                if h32(x, y, variant, 7850) % 61 == 0:
                    t[y][x] = SN(3)
        if variant in (1, 2):
            for x in range(16):
                y = int(round(7 + 3 * math.sin((x + variant * 5) * math.pi / 16.0)))
                t[y][x] = AG(1) if x % 3 else AG(0)
                if bayer(x, y + 1) < 0.5:
                    t[min(15, y + 1)][x] = AG(0)
        elif variant == 3:
            for x in range(3, 12):
                t[10][x] = MV(1) if x % 2 else INK(2)
        return t


# ====================================================================== faces
def ice_block(u, Y, seed=7860):
    """Blue ice blocks (16 wide in running bond, 8 high): a lit top edge, a deep blue joint, frozen bubbles, a highlight
    streak down the left of some blocks."""
    course = Y // 8
    v = Y % 8
    x = (u + (course % 2) * 8) % 16
    if v == 7 or x == 15:
        return WA(2)
    if v == 0:
        return IC(3)
    if x == 1 and h32(course, 7861) % 2:
        return IC(3)
    n = h32(u, Y, seed) % 23
    if n == 0:
        return IC(3)
    return IC(2) if v < 4 else IC(1)


class IceFace(_Face):
    """The rampart and the road's cliff face: a snow cornice with a hanging crust, then blue ice blocks, a snow drift at
    the foot."""
    edge_l = IC(3)
    edge_r = WA(2)

    def at(self, u, Y):
        if Y <= 2:
            return [SN(4), PAPER, SN(3)][Y]
        if Y == 3:
            return SN(2) if (u + 1) % 4 else SN(4)
        if Y == 4 and u % 5 == 2:
            return SN(3)
        if Y >= 29:
            return [SN(3), SN(4), SN(3)][Y - 29]
        return ice_block(u, Y)


class IcicleFace(IceFace):
    """Rampart style: icicles hanging from the cornice."""
    def at(self, u, Y):
        L = [7, 3, 10, 5, 2, 8, 4, 11, 6, 3, 9, 2, 5, 12, 4, 7][u]
        if 4 <= Y < 4 + L and u % 2 == 0:
            return IC(3) if Y < 4 + L - 2 else IC(2)
        return IceFace.at(self, u, Y)


class LanternFace(IceFace):
    """Rampart style: a frostfire lamp bracket set into the ice (cold blue flame)."""
    def at(self, u, Y):
        if 6 <= u <= 9 and 12 <= Y <= 18:
            if Y in (12, 18) or u in (6, 9):
                return SC(0)
            return CY(3) if Y < 15 else CY(2)
        if 7 <= u <= 8 and 19 <= Y <= 21:
            return SC(1)
        return IceFace.at(self, u, Y)


class FrozenNamesFace(IceFace):
    """Rampart / cliff style: names frozen under the ice (dark glyph bars, never letters)."""
    def at(self, u, Y):
        if Y in (13, 14, 19, 20) and 2 <= u <= 13:
            if (u + Y // 6) % 5 not in (0, 3):
                return WA(1) if Y % 2 else WA(2)
        return IceFace.at(self, u, Y)


def frost_brick(u, Y):
    """F1 brick: 8 wide, 6 high in running bond, rime on each brick's top, dark cold joints."""
    course = Y // 6
    v = Y % 6
    x = (u + (course % 2) * 4) % 8
    if v == 5 or x == 7:
        return SN(0)
    if v == 0:
        return SN(4) if x % 3 else SN(3)
    return SN(2) if h32((u + (course % 2) * 4) // 8, course, 7870) % 4 else SN(1)


class VaultFace(_Face):
    """F1 face: a frost-brick wall, a rimed cornice, a cold foot."""
    edge_l = SN(3)
    edge_r = SN(0)

    def at(self, u, Y):
        if Y <= 3:
            return [SN(1), SN(4), SN(3), SN(1)][Y]
        if Y >= 29:
            return [SN(1), SN(0), SN(1)][Y - 29]
        return frost_brick(u, Y - 4)


class VaultIcicleFace(VaultFace):
    """F1 style: icicles off the cornice."""
    def at(self, u, Y):
        L = [5, 9, 3, 6, 11, 4, 2, 7, 10, 3, 6, 8, 2, 5, 9, 4][u]
        if 4 <= Y < 4 + L and u % 3 != 2:
            return IC(3) if Y < 4 + L - 2 else IC(2)
        return VaultFace.at(self, u, Y)


class PlaqueFace(VaultFace):
    """F1 style: an iceglass name plaque set into the brick (glyph bars frosted over)."""
    def at(self, u, Y):
        if 2 <= u <= 13 and 10 <= Y <= 20:
            if u in (2, 13) or Y in (10, 20):
                return SN(0)
            if Y in (13, 16) and 4 <= u <= 11 and (u + Y) % 4:
                return SN(2)
            return IC(2) if (u + Y) % 5 else IC(3)
        return VaultFace.at(self, u, Y)


class StairStopFace(VaultFace):
    """F1 style: a stair that climbs the wall and stops in white (the undercroft forgets its own steps)."""
    def at(self, u, Y):
        step = (31 - Y) // 4
        if u >= 15 - step * 3 and Y > 8:
            if step >= 4:
                return PAPER if bayer(u, Y) < 0.5 + (step - 4) * 0.2 else SN(3)
            return SN(4) if (31 - Y) % 4 == 0 else SN(2)
        return VaultFace.at(self, u, Y)


def hall_stone(u, Y):
    """F2: dark ashlar, 16 x 8 in running bond, the darkest joints."""
    course = Y // 8
    v = Y % 8
    x = (u + (course % 2) * 8) % 16
    if v == 7 or x == 15:
        return DARK
    if v == 0:
        return SC(2)
    return SC(1) if h32((u + (course % 2) * 8) // 16, course, 7880) % 3 else SC(0)


class HallFace(_Face):
    """F2 face: dark stone, a cornice with a rime line, a dark foot."""
    edge_l = SC(2)
    edge_r = DARK

    def at(self, u, Y):
        if Y <= 3:
            return [DARK, SN(1), SC(2), SC(0)][Y]
        if Y >= 29:
            return DARK if (u + Y) % 2 else SC(0)
        return hall_stone(u, Y)


class NicheLitFace(HallFace):
    """F2 style: a letter niche lit by a small lamp (warm), letters standing in it."""
    lit = True

    def at(self, u, Y):
        if 3 <= u <= 12 and 7 <= Y <= 25:
            arch = Y < 11 and math.hypot(u - 7.5, Y - 11) > 4.6
            if not arch:
                if u in (3, 12) or Y == 25:
                    return SC(2)
                if self.lit:
                    if 6 <= u <= 9 and 10 <= Y <= 12:
                        return FI(4) if u in (7, 8) else FI(3)
                    if Y in (18, 21) and 5 <= u <= 10 and (u + Y) % 3:
                        return GD(2)
                    return SW(2) if Y < 16 else SW(1)
                if Y in (18, 21) and 5 <= u <= 10 and (u + Y) % 3:
                    return SC(1)
                return DARK
        return HallFace.at(self, u, Y)


class NicheDarkFace(NicheLitFace):
    """F2 style: the same niche, dark (its letters only just there)."""
    lit = False


class CarvedLettersFace(HallFace):
    """F2 style: rows of carved letters (glyph bars, never readable) across the stone."""
    def at(self, u, Y):
        for row in (11, 17, 23):
            if Y in (row, row + 1) and 1 <= u <= 14 and (u * 7 + row) % 5 != 0:
                return DARK if Y == row else SC(2)
        return HallFace.at(self, u, Y)


def pillar(u, Y):
    """F3: a rounded ice pillar per tile: lit on the left, the aurora's green on its lit flank, deep blue on the right,
    ring joints every 10 px."""
    if Y % 10 == 0:
        return IC(2) if u < 8 else WA(3)
    s = u / 15.0
    if s < 0.12:
        return SN(4)
    if s < 0.25:
        return AG(2) if (Y // 3) % 3 == 0 else SN(3)
    if s < 0.55:
        return IC(2)
    if s < 0.8:
        return IC(1)
    return WA(3) if s < 0.93 else WA(2)


class NaveFace(_Face):
    """F3 face: ice pillars in a row, a capital ring at the top, a rimed base."""
    edge_l = SN(4)
    edge_r = WA(2)

    def at(self, u, Y):
        if Y <= 3:
            return [WA(1), SN(4), SN(3), IC(2)][Y]
        if Y >= 28:
            return [SN(4), SN(3), SN(2), SN(1)][Y - 28]
        return pillar(u, Y)


class NaveAuroraFace(NaveFace):
    """F3 style: the aurora reflected down a pillar (a long green and violet sheen)."""
    def at(self, u, Y):
        if 3 < Y < 28 and abs(u - (5 + int(round(1.5 * math.sin(Y * 0.3))))) <= 1:
            return AG(2) if Y % 7 else MV(3)
        return NaveFace.at(self, u, Y)


class NaveCharterFace(NaveFace):
    """F3 style: a line of the Keeper Charter cut across the ice (glyph bars)."""
    def at(self, u, Y):
        if 13 <= Y <= 17:
            if Y in (13, 17):
                return SN(4)
            if Y == 15 and (u * 3) % 7 not in (0, 4):
                return WA(1)
            return IC(3)
        return NaveFace.at(self, u, Y)


# ====================================================================== outer faces
class IceOut(OuterFace):
    """Under the rampart's band: ice blocks sinking into snow (fading to snow, never black)."""
    shadow_line = SN(1)
    edge_dark = WA(2)

    def at(self, x, Y):
        if Y == 0:
            return SN(1)
        if 1 <= Y <= 2:
            return [PAPER, SN(3)][Y - 1]
        t = max(0.0, (Y - 8) / 18.0)
        if fade(x, Y, t):
            return SN(3) if (x + Y) % 5 else SN(4)
        return ice_block(x % 16, Y + 2)

    def material(self, x, Y):
        return ice_block(x % 16, Y)


class VaultOut(OuterFace):
    """Under F1's band: frost brick dissolving into the white."""
    shadow_line = SN(1)
    edge_dark = SN(0)

    def at(self, x, Y):
        if Y == 0:
            return SN(1)
        t = max(0.0, (Y - 5) / 20.0) ** 0.85
        if fade(x, Y, t):
            return PAPER
        return frost_brick(x % 16, Y + 2)

    def material(self, x, Y):
        return frost_brick(x % 16, Y)


class HallOut(OuterFace):
    shadow_line = DARK
    edge_dark = DARK

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [SN(1), SC(2), SC(0)][Y - 1]
        return hall_stone(x % 16, Y + 4)


class NaveOut(OuterFace):
    """Under F3's band: the pillars falling into the night."""
    shadow_line = WA(1)
    edge_dark = WA(1)

    def at(self, x, Y):
        if Y == 0:
            return WA(1)
        t = max(0.0, (Y - 6) / 22.0) ** 0.85
        if fade(x, Y, t):
            return INK(1)
        return pillar(x % 16, Y + 4)

    def material(self, x, Y):
        return pillar(x % 16, Y)


FLOORS = [Permafrost(), SnowField(), IceBrick(), FrostMosaic(), FrostBrick(), LetterStone(), NaveIce(), IceGlass(),
          IceBridge(), IcePath()]
VOIDS = [Fade()]                         # A1, 2 frames, lowest of all
ANIMATED = [LakeWater()]                 # A1, 3 frames, last
HOLES = [FrozenLake()]                   # hole kind, walkable, last
WALLS = [
    ('icewall', IceTop(), IceFace(), IceDeep(), IceOut()),
    ('vault_wall', VaultTop(), VaultFace(), VaultDeep(), VaultOut()),
    ('bell_hall', HallTop(), HallFace(), HallDeep(), HallOut()),
    ('nave', NaveTop(), NaveFace(), NaveDeep(), NaveOut()),
]
FACE_STYLES = {
    'icewall': [None, [IcicleFace(), IceFace(), IceFace()], [LanternFace(), IceFace(), IceFace(), IceFace()],
                [FrozenNamesFace(), IceFace()]],
    'vault_wall': [None, [VaultIcicleFace(), VaultFace()], [PlaqueFace(), VaultFace(), VaultFace()],
                   [StairStopFace(), VaultFace(), VaultFace()]],
    'bell_hall': [None, [NicheLitFace(), HallFace()], [NicheDarkFace(), HallFace()], [CarvedLettersFace(), HallFace()],
                  [NicheDarkFace(), NicheLitFace(), HallFace()]],
    'nave': [None, [NaveAuroraFace(), NaveFace(), NaveFace()], [NaveCharterFace(), NaveFace()]],
}
FACE_PLAN = {
    'icewall': {'ep7_palehaven': {'cycle': [0, 1, 0, 2, 0, 1, 3]}, 'ep7_white_road': {'cycle': [0, 1, 0, 3, 0, 0]}},
    'vault_wall': {'ep7_vault_f1': {'cycle': [0, 1, 2, 0, 3, 1, 0]}},
    'bell_hall': {'ep7_vault_f2': {'cycle': [1, 0, 2, 3, 4, 0, 2]}},
    'nave': {'ep7_vault_f3': {'cycle': [0, 1, 0, 2, 1]}, 'ep7_stillheart': {'cycle': [1, 0, 1, 2]}},
}
