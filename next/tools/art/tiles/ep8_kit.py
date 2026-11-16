"""Episode 8 (The Last Word) terrains and wall systems -> assets/tiles/ep8.png (E8-tiles, EPISODE8_PLAN 9.1, 4 and 5.1).
Imported by ep8.py.

Violet, gold and paper (EPISODE8 section 4): a violet void, warm gold lamplight, cream paper, black ink the only dark.

The phone rule (plan 4): the void must never read as floor. It is flat violet (no texture, no edge highlight, no grain:
E8-world's slow gold motes are a separate layer, never baked here), the LOWEST terrain, so every floor over it draws its
own lip and a front face dropping into nothing. Episode 7's fade is white; this void is violet, so a player never mixes
them up. Every floor beside it is textured and at least 0.12 luma above it (ep8_scenes measures on the 844 x 390 crop).
The three Library floors look nothing alike: F1 warm parchment squares with drawer-gold seams and gold-inlay landings;
F2 grey vellum written over twice (the old writing faint under the new); F3 lavender-white blank pages with faint rules.

Terrains (A2 fill unless noted):
  void_violet   A1, 2 identical flat frames, collision void: the void of the Stair and the Library; lowest of all
  ink_canal     A1, 3 frames, collision water: the town's ink canal (black-violet ink, gold glints, a marble kerb)
  script_step   the Stair: steps of gold handwriting (glyph bars, never letters) on warm amber planks, a riser shadow
  marble_page   the town: lilac-white marble page-stones with ruled lines and grey veins
  letterpath    the town's script-road: warm setts cut in glyph shapes
  scriptmosaic  the square: cream, violet and gold tesserae (variant 1: the gold star of the Codex ring)
  parchment     F1: large warm parchment squares, ink rules, a gold seam between
  goldscript    F1 landings and the Last Word's dais: gold inlay script on dark amber (canon)
  vellum        F2: grey pages laid like flags, written over twice (faint old lines under darker new ones)
  blank_page    F3: lavender-white blank pages, faint rules; at least 0.12 luma below the pop-up page cream

Wall systems (<sys>_top band, <sys>_face 2-row inner face, <sys>_out_top the beyond, <sys>_out_face):
  inkwall          the Stair, the Last Word and the town ramparts: black-violet ink stone, gold script cut in it; beyond the void
  drawer_wall      F1: card-drawer banks (oak, brass pulls, blank label slots); beyond the void with far shelves
  palimpsest_wall  F2: plaster of layered pages, old writing under new, lamp niches; beyond the dark
  shelf_shaft      F3: white shelves of pale books climbing; beyond the void
  book_tower       the town: walls of giant book spines stacked flat; beyond the void
"""
import math
from pxlib import Canvas, C, DARK, WHITE, rnd, h32, SH, hexc, profile1d
from autotile import EdgeSpec
from terrain import Terrain, Water, blank
from archive_floors import BandTop, DeepTop, OuterFace, fade, bayer
from ep4_kit import _Face
from ep6_kit import Platform

WD = lambda i: C('wood', i)              # 2d1b1f 482826 6e3d2c 8f5533 b87942 d69c57
SW = lambda i: C('stone_warm', i)        # 2e2b4c 584951 7e6d6e a18f85 cfb89c ebdfc8
SC = lambda i: C('stone_cool', i)        # 251d34 2e2b4c 4c445c 66637f 8e8997 b3b6c4
GD = lambda i: C('gold', i)              # 482826 8f5533 c38334 eba14d f9d77a fff7d6
INK = lambda i: C('ink', i)              # 14101e 1a1334 292657 3f4186 7162bd
MV = lambda i: C('magic_violet', i)      # 522a84 7040aa 9062c3 bc94e2 f6f4ee
CP = lambda i: C('cloth_purple', i)      # 1a1334 36195a 522a84 7040aa 9062c3 bc94e2
SA = lambda i: C('sand', i)              # ae8458 c3a57c e4cb96 f6e4b9
PA = lambda i: C('path', i)              # 6a4532 896042 ae8458 c3a57c e4cb96
FI = lambda i: C('fire', i)
RR = lambda i: C('roof_red', i)
WA = lambda i: C('water', i)
RG = lambda i: C('roof_green', i)
CB = lambda i: C('cloth_blue', i)

# ---------------------------------------------------------------------- the colours the master palette lacks
# (reported by E8-tiles; ep8.py snaps the sheet to palette.json PLUS these). The void: the palette's violets are either
# saturated cloth (#522a84, too bright and too purple to read as nothing) or near-black ink; the void needs a dusky
# violet between them, and one step deeper for the undersides and the beyond. Page cream: the palette's sands are yellow
# and its whites are Episode 7's paper; a pop-up page is a cooler cream with a lit, a body and a fold step. Marble: a
# lilac-white ramp (the palette has nothing between the cool greys and the saturated lilac). Blank page: F3's
# lavender-white floor, kept 0.12 luma under the page cream. Vellum: a warm grey ramp for F2's written-over pages.
EXTRA = ['#2c1d55', '#20143f',                                   # void 0, void deep 1
         '#f5ecd4', '#e6d8b4', '#c9b88f',                        # page cream 2 (lit) 3 (body) 4 (fold)
         '#d4cce2', '#bdb3d0', '#9a8fb6',                        # marble 5 (lit) 6 (body) 7 (vein)
         '#aca4bc', '#9a92ad',                                   # blank page 8 (body) 9 (rule)
         '#a8a098', '#8f8781', '#78706c', '#615958']             # vellum 10 (lit) .. 13 (old writing)
VOID = hexc(EXTRA[0])
VOID_DEEP = hexc(EXTRA[1])
PC = lambda i: hexc(EXTRA[2 + max(0, min(2, i))])        # page cream 0 lit, 1 body, 2 fold
MB = lambda i: hexc(EXTRA[5 + max(0, min(2, i))])        # marble 0 lit, 1 body, 2 vein
BP = lambda i: hexc(EXTRA[8 + max(0, min(1, i))])        # blank page 0 body, 1 rule
VL = lambda i: hexc(EXTRA[10 + max(0, min(3, i))])       # vellum 0 lit .. 3 old writing
PAPER = PC(0)
INKD = INK(0)            # black ink: the only dark


def glyph_on(u, row, seed):
    """Glyph bars for a line of handwriting (never a letter): runs of 1 to 4 px with gaps, period 16 so lines join."""
    k = (u + h32(row, seed) % 16) % 16
    return (h32(k // 3, row, seed) % 5) != 0 and k % 3 != 2


# ====================================================================== the void
class VoidViolet(Water):
    """The void: flat violet. A1 with two identical frames (E8-world's mote layer moves over it, never this tile): no
    edges, no shading, no texture. The lowest terrain, so every floor over it draws its own lip and front face."""
    id = 'void_violet'
    kind = 'fill'
    collision = 'void'
    frames = 2

    def __init__(self):
        Terrain.__init__(self)
        self.specs = {'all': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb')}

    def make_texture(self, frame, variant):
        return blank(VOID)

    def pixel(self, c, x, y):
        return self.tex(c, x, y)


class InkCanal(Water):
    """The town's ink canal (A1, 3 frames, collision water): black-violet ink, a slow violet sheen and gold glints
    drifting a pixel a frame, a lilac marble kerb where it meets anything."""
    id = 'ink_canal'
    kind = 'hole'
    collision = 'water'

    def __init__(self):
        Terrain.__init__(self)
        prof = {s: profile1d(8100 + i, amp=0.5, spikes=0) for i, s in enumerate('NSWE')}
        self.specs = {'surf': EdgeSpec({'N': 1.0, 'S': 1.0, 'W': 1.0, 'E': 1.0}, r=1.5, rr=1.0, prof=prof)}

    def make_texture(self, frame, variant):
        t = blank(INK(1))
        for y in range(16):
            for x in range(16):
                if (x + 2 * y + frame * 2) % 13 == 0:
                    t[y][x] = INK(2)
                elif (x - y + frame) % 17 == 0 and y % 4 == 1:
                    t[y][x] = CP(1)
                elif h32(x, y, 8101) % 31 == 0:
                    t[y][x] = INK(0)
        for (gx, gy) in ((3, 4), (11, 10), (7, 14)):
            t[gy][(gx + frame) % 16] = GD(4)
            t[gy][(gx + frame + 1) % 16] = GD(2)
        return t

    def pixel(self, c, x, y):
        if not c.i('surf', x, y):
            return None
        d = c.f('surf', x, y)
        side = c.side('surf', x, y)
        if d < 1.2:
            return MB(0) if side in ('N', 'W') else MB(1)
        if d < 2.2:
            return MB(2) if side in ('N', 'W') else INK(2)
        if d < 3.0 and side == 'N':
            return INK(0)
        return self.tex(c, x, y)


# ====================================================================== floors (every one a Platform over the void)
class VoidFloor(Platform):
    """Base: a floor over the void: a crisp dark ink lip, and on the south its own thickness then the deep void."""
    edge_dark = INKD
    under = VOID_DEEP


class ScriptStep(VoidFloor):
    """The Stair: each 16 px row is one step of written light: a lit gold nosing, a line of gold handwriting (glyph bars,
    never letters) on warm amber, a riser shadow under it. The front is the step's edge in amber falling into the void.
    Variants: a rubbed-out gap in the line (paler, a smudge), a full stop blot, a gold flourish, a dropped page corner."""
    id = 'script_step'
    nvariants = 5
    weights = [20, 3, 2, 2, 1]
    lip_n = GD(4)
    edge_lit = GD(3)
    edge_shade = WD(2)
    front = (GD(2), WD(3), WD(2), WD(1))

    def make_texture(self, frame, variant):
        t = blank(WD(3))
        for y in range(16):
            for x in range(16):
                if y == 0:
                    c = GD(4)
                elif y == 1:
                    c = GD(3)
                elif y >= 14:
                    c = WD(2) if y == 14 else WD(1)
                elif 5 <= y <= 9:
                    c = WD(3)
                    if y in (6, 7) and glyph_on(x, 0, 8110):
                        c = GD(4) if y == 6 else GD(3)
                    elif y == 8 and glyph_on(x + 5, 1, 8111) and x % 4 == 1:
                        c = GD(3)          # a descender now and then
                else:
                    c = WD(3) if (x + y) % 7 else WD(4)
                t[y][x] = c
        if variant == 1:     # a rubbed gap: the line paler, smudged
            for y in range(5, 10):
                for x in range(5, 12):
                    t[y][x] = WD(4) if bayer(x, y) < 0.5 else WD(3)
        elif variant == 2:   # a full stop blot
            for (x, y) in ((11, 7), (12, 7), (11, 8), (12, 8)):
                t[y][x] = GD(4)
        elif variant == 3:   # a flourish looping under the line
            for k in range(8):
                t[10 + (1 if 2 <= k <= 5 else 0)][4 + k] = GD(3)
        elif variant == 4:   # a dropped page corner
            for (x, y) in ((3, 11), (4, 11), (5, 11), (3, 12), (4, 12), (3, 13)):
                t[y][x] = PC(1)
            t[11][6] = PC(2)
        return t


class MarblePage(VoidFloor):
    """The town's paving: lilac-white marble page-stones (16 x 8 in running bond), each with two faint ruled lines and a
    grey vein; dark ink joints. Variants: a dropped quill, an ink drip, a vein fork."""
    id = 'marble_page'
    nvariants = 4
    weights = [40, 1, 1, 3]
    lip_n = MB(0)
    edge_lit = MB(0)
    edge_shade = MB(2)
    front = (MB(1), MB(2), CP(3), CP(2))

    def make_texture(self, frame, variant):
        t = blank(MB(1))
        for y in range(16):
            row = y // 8
            v = y % 8
            for x in range(16):
                u = (x + (row % 2) * 8) % 16
                if v == 7 or u == 15:
                    c = MB(2)
                elif v == 0:
                    c = MB(0)
                elif v in (3, 5) and 2 <= u <= 13 and (u + v) % 5:
                    c = MB(0) if v == 3 else MB(1)
                else:
                    c = MB(1)
                    if (u * 2 + v * 3 + row * 5) % 19 == 0:
                        c = MB(2)
                t[y][x] = c
        if variant == 1:
            for k in range(6):
                t[11 - k // 2][4 + k] = INKD if k < 5 else PAPER
        elif variant == 2:
            for (x, y) in ((9, 3), (9, 4), (10, 4), (9, 5)):
                t[y][x] = INK(1)
        elif variant == 3:
            for k in range(5):
                t[2 + k][6 + k // 2] = MB(2)
                t[2 + k][9 - k // 2] = MB(2)
        return t


class LetterPath(VoidFloor):
    """The script-road: warm setts (stone_warm) set in short glyph-shaped runs, sand joints; a gold sett now and then
    (the road is written). Variants: a candle stub, a scrap of paper, a gold sett."""
    id = 'letterpath'
    nvariants = 4
    weights = [14, 2, 2, 2]
    lip_n = SW(4)
    edge_lit = SW(4)
    edge_shade = SW(2)
    front = (SW(3), SW(2), SW(1))

    def make_texture(self, frame, variant):
        t = blank(SA(1))
        for y in range(16):
            row = y // 4
            v = y % 4
            for x in range(16):
                u = (x + row * 5) % 8
                if v == 3 or u == 7:
                    t[y][x] = SA(0)
                    continue
                tone = h32((x + row * 5) // 8, row, 8130) % 4
                c = [SW(3), SW(4), SW(3), SW(2)][tone]
                if v == 0 and c != SW(2):
                    c = SW(4) if c == SW(3) else SW(5)
                t[y][x] = c
        if variant == 1:
            t[6][7] = PC(0); t[7][7] = PC(1); t[8][7] = PC(1); t[5][7] = FI(4)
        elif variant == 2:
            for (x, y) in ((10, 10), (11, 10), (12, 10), (10, 11), (11, 11)):
                t[y][x] = PC(1)
            t[10][12] = INKD
        elif variant == 3:
            for x in range(1, 6):
                t[9][x] = GD(3)
                t[10][x] = GD(2)
        return t


class ScriptMosaic(VoidFloor):
    """The square: tesserae on the diagonal, cream and lilac with violet borders, a gold tessera in each diamond.
    Variant 1: the gold star inlay (the Codex ring)."""
    id = 'scriptmosaic'
    nvariants = 4
    weights = [16, 1, 2, 2]
    lip_n = PC(1)
    edge_lit = PC(0)
    edge_shade = MB(2)
    front = (MB(1), MB(2), CP(3), CP(2))

    def make_texture(self, frame, variant):
        t = blank(PC(1))
        for y in range(16):
            for x in range(16):
                u, v = (x + y) % 8, (x - y) % 8
                if u == 0 or v == 0:
                    t[y][x] = CP(3)
                else:
                    k = ((x + y) // 8 + (x - y + 32) // 8) % 3
                    t[y][x] = [PC(1), MB(1), PC(2)][k]
                    if (u, v) == (4, 4):
                        t[y][x] = GD(4)
        if variant == 1:
            for y in range(16):
                for x in range(16):
                    dx, dy = x - 7.5, y - 7.5
                    a = math.atan2(dy, dx)
                    r = math.hypot(dx, dy)
                    star = 3.0 + 3.0 * abs(math.cos(a * 4 / 2.0))
                    if r < star - 1.1:
                        t[y][x] = GD(4) if dx + dy < -1 else GD(3)
                    elif r < star:
                        t[y][x] = GD(1)
        elif variant == 2:
            t[9][5] = INKD; t[10][5] = INK(1)
        elif variant == 3:
            for (x, y) in ((11, 3), (12, 4)):
                t[y][x] = PC(0)
        return t


class Parchment(VoidFloor):
    """F1's floor: large warm parchment squares (8 x 8), each ruled with two faint ink lines, a gold seam between the
    squares (the Catalog's drawers are brass and gold). Variants: an index card dropped, an ink spot, a gold seam
    brighter, a torn corner."""
    id = 'parchment'
    nvariants = 5
    weights = [14, 2, 2, 2, 1]
    lip_n = SA(2)
    edge_lit = SA(2)
    edge_shade = PA(1)
    front = (PA(3), PA(2), PA(1), WD(2))

    def make_texture(self, frame, variant):
        t = blank(SA(1))
        for y in range(16):
            for x in range(16):
                u, v = x % 8, y % 8
                if u == 7 or v == 7:
                    c = GD(2) if (u == 7) != (v == 7) else GD(3)
                elif u == 0 or v == 0:
                    c = SA(2)
                elif v in (3, 5) and 1 < u < 6:
                    c = PA(2) if (u + v) % 4 else SA(1)
                else:
                    c = SA(1) if h32(x, y, 8150) % 11 else PA(2)
                t[y][x] = c
        if variant == 1:     # a blank index card
            for y in range(9, 13):
                for x in range(2, 8):
                    t[y][x] = PC(0) if y == 9 else PC(1)
            t[13][3] = PA(1)
        elif variant == 2:
            t[4][11] = INKD; t[4][12] = INK(1); t[5][11] = INK(1)
        elif variant == 3:
            for x in range(16):
                t[7][x] = GD(4) if x % 2 else GD(3)
        elif variant == 4:
            t[1][1] = PA(1); t[1][2] = PA(1); t[2][1] = PA(1)
        return t


class GoldScript(VoidFloor):
    """Gold inlay floor (canon goldscript): F1's landings and the Last Word's dais. A field of gold tesserae (lit and
    mid gold, never the Stair's amber) with lines of dark script inlaid in it (glyph bars, never letters) and a dark
    border every 8 rows: the inverse of the Stair, so the two never read alike."""
    id = 'goldscript'
    nvariants = 3
    weights = [12, 2, 2]
    lip_n = GD(5)
    edge_lit = GD(5)
    edge_shade = GD(2)
    front = (GD(3), GD(2), WD(3), WD(2), WD(1))

    def make_texture(self, frame, variant):
        t = blank(GD(3))
        for y in range(16):
            for x in range(16):
                v = y % 8
                if v == 0:
                    c = GD(4)
                elif v == 7:
                    c = GD(1)
                elif v == 3 and y < 8 and glyph_on(x, 0, 8163):
                    c = WD(3)
                elif v == 4 and y < 8 and glyph_on(x, 0, 8163):
                    c = GD(2)
                else:
                    c = GD(3) if (x * 3 + y) % 7 else GD(4)
                t[y][x] = c
        if variant == 1:
            t[5][7] = GD(5); t[5][8] = GD(5)
        elif variant == 2:
            for x in range(3, 13):
                t[11][x] = WD(2) if x % 2 else GD(2)
        return t


class Vellum(VoidFloor):
    """F2's floor: grey vellum pages laid like flags (uneven slabs, dark joints), each written over twice: faint old
    lines (vellum 3, slanting one way) under darker new ones (ink, level). Variants: a scraped patch where the old shows
    through, a lamp's warm spill, a page corner lifting."""
    id = 'vellum'
    nvariants = 4
    weights = [12, 3, 2, 2]
    lip_n = VL(0)
    edge_lit = VL(0)
    edge_shade = VL(2)
    front = (VL(1), VL(2), VL(3), SC(2))
    SLABS = [(0, 0, 9, 7), (9, 0, 7, 8), (0, 7, 6, 9), (6, 7, 5, 5), (11, 8, 5, 8), (6, 12, 5, 4)]

    def make_texture(self, frame, variant):
        t = blank(VL(1))
        for k, (x0, y0, w, h) in enumerate(self.SLABS):
            tone = [VL(1), VL(0), VL(1)][h32(k, 8170) % 3]
            for yy in range(h):
                for xx in range(w):
                    X, Y = (x0 + xx) % 16, (y0 + yy) % 16
                    if xx == w - 1 or yy == h - 1:
                        c = VL(3)
                    elif yy == 0 or xx == 0:
                        c = VL(0)
                    else:
                        c = tone
                        if (xx - yy * 2) % 5 == 0 and yy % 2:
                            c = VL(2)          # the old writing, slanting, faint
                        if yy % 3 == 2 and 1 <= xx < w - 2 and glyph_on(X, Y, 8171 + k):
                            c = VL(3)          # the new line over it, level
                    t[Y][X] = c
        if variant == 1:
            for y in range(4, 9):
                for x in range(3, 8):
                    if bayer(x, y) < 0.5:
                        t[y][x] = VL(0)
        elif variant == 2:
            t[10][12] = GD(3); t[11][12] = GD(2); t[11][13] = SA(2)
        elif variant == 3:
            t[2][14] = PC(1); t[2][13] = PC(1); t[3][14] = PC(2)
        return t


class BlankPage(VoidFloor):
    """F3's floor: lavender-white blank pages (16 x 16 sheets, each a hair off square so the joints wander), faint
    lilac rules, nothing written. 0.12 luma or more under the pop-up page cream, so the party never washes out and a
    standing page still reads against it. Variants: a gold word-mark (a short bar of gold), a fold crease, a dog-ear."""
    id = 'blank_page'
    nvariants = 4
    weights = [14, 2, 2, 2]
    lip_n = PC(1)
    edge_lit = PC(1)
    edge_shade = BP(1)
    front = (BP(0), BP(1), MB(2), CP(4), CP(3))

    def make_texture(self, frame, variant):
        t = blank(BP(0))
        for y in range(16):
            for x in range(16):
                if y == 15 or x == 15:
                    c = BP(1) if (x + y) % 3 else MB(2)
                elif y == 0 or x == 0:
                    c = MB(0)
                elif y in (5, 10) and 2 <= x <= 13:
                    c = BP(1)
                else:
                    c = BP(0)
                t[y][x] = c
        if variant == 1:
            for x in range(5, 11):
                t[7][x] = GD(3)
            t[7][11] = GD(2)
        elif variant == 2:
            for y in range(1, 15):
                t[y][8] = BP(1) if y % 2 else MB(0)
        elif variant == 3:
            t[1][13] = BP(1); t[1][14] = BP(1); t[2][14] = BP(1); t[1][12] = MB(2)
        return t


# ====================================================================== wall bands
class InkTop(BandTop):
    """The inkwall band: black-violet ink stone blocks, a gold script line cut along the front lip."""
    id = 'inkwall_top'
    seed = 8210
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(INK(1))
        for y in range(16):
            for x in range(16):
                v = y % 8
                u = (x + (y // 8) * 8) % 16
                if v == 7 or u == 15:
                    t[y][x] = INK(0)
                elif v == 0:
                    t[y][x] = INK(2)
                elif v == 4 and glyph_on(x, y // 8, 8211) and variant != 3:
                    t[y][x] = GD(2)
        if variant == 1:
            t[3][4] = CP(2); t[3][5] = CP(2)
        elif variant == 2:
            for x in range(3, 10):
                t[11][x] = GD(3)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GD(3), INK(2), INK(1), INK(0)][min(3, int(d))]
        if side == 'N':
            return INK(0)
        if side == 'W':
            return INK(0) if d < 1 else INK(3)
        return INK(0) if d < 1 else INK(1)


class DrawerTop(BandTop):
    """F1's band: the tops of the drawer banks: oak boards, a brass rail along the front."""
    id = 'drawer_wall_top'
    seed = 8220
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(WD(3))
        for y in range(16):
            for x in range(16):
                if y % 4 == 3:
                    t[y][x] = WD(2)
                elif (x + y // 4 * 5) % 16 == 0:
                    t[y][x] = WD(1)
                elif (x + y) % 9 == 0:
                    t[y][x] = WD(4)
        if variant == 1:
            for (x, y) in ((5, 6), (6, 6), (5, 5)):
                t[y][x] = PC(1)
        elif variant == 2:
            t[9][10] = GD(4); t[9][11] = GD(3)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GD(4), GD(2), WD(2), WD(1)][min(3, int(d))]
        if side == 'N':
            return WD(0)
        if side == 'W':
            return WD(1) if d < 1 else WD(4)
        return WD(0) if d < 1 else WD(2)


class PalimpsestTop(BandTop):
    """F2's band: the wall top: grey plaster pages stacked edge-on, a darker joint, a lamp-warm lip."""
    id = 'palimpsest_wall_top'
    seed = 8230
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(VL(2))
        for y in range(16):
            for x in range(16):
                if y % 3 == 2:
                    t[y][x] = VL(3) if (x + y) % 5 else VL(1)
                elif (x * 5 + y) % 13 == 0:
                    t[y][x] = VL(1)
        if variant == 1:
            for x in range(4, 11):
                t[7][x] = INK(1)
        elif variant == 2:
            t[10][3] = GD(3)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [VL(0), VL(1), VL(2), VL(3)][min(3, int(d))]
        if side == 'N':
            return SC(1)
        if side == 'W':
            return SC(2) if d < 1 else VL(0)
        return SC(1) if d < 1 else VL(2)


class ShelfTop(BandTop):
    """F3's band: the shelf tops seen from above: pale boards, the tops of white books in a row."""
    id = 'shelf_shaft_top'
    seed = 8240
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(BP(0))
        for y in range(16):
            for x in range(16):
                if y % 8 in (0, 7):
                    t[y][x] = MB(2) if y % 8 == 7 else PC(1)
                elif x % 3 == 2:
                    t[y][x] = BP(1)
                elif (x // 3 + y // 8) % 5 == 0:
                    t[y][x] = PC(0)
        if variant == 1:
            t[4][6] = GD(4); t[4][7] = GD(3)
        elif variant == 2:
            for y in range(9, 15):
                t[y][11] = MB(2)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [PC(0), PC(1), BP(1), MB(2)][min(3, int(d))]
        if side == 'N':
            return MB(2)
        if side == 'W':
            return MB(2) if d < 1 else PC(0)
        return MB(2) if d < 1 else BP(1)


class TowerTop(BandTop):
    """The town's book-tower band: the top board of a giant book (its cover), a gilt edge to the front."""
    id = 'book_tower_top'
    seed = 8250
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(RR(2))
        for y in range(16):
            for x in range(16):
                if y % 8 == 7:
                    t[y][x] = RR(1)
                elif (x + y) % 6 == 0:
                    t[y][x] = RR(3)
        if variant == 1:
            for x in range(4, 12):
                t[5][x] = GD(3)
        elif variant == 2:
            t[10][5] = GD(4)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GD(4), GD(2), RR(1), RR(0)][min(3, int(d))]
        if side == 'N':
            return RR(0)
        if side == 'W':
            return RR(1) if d < 1 else RR(3)
        return RR(0) if d < 1 else RR(1)


# ====================================================================== the beyond
class VoidDeep(DeepTop):
    """Beyond the inkwall and the shelf shaft: the void, flat (the same violet), now and then a far shelf's silhouette one
    step deeper so the beyond is not a hole cut in the map."""
    id = 'inkwall_out_top'
    weights = [10, 2, 2, 1, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(VOID)
        if variant in (1, 2):
            x0 = 4 if variant == 1 else 10
            for y in range(16):
                for x in (x0, x0 + 1):
                    t[y][x] = VOID_DEEP
            for x in range(x0 - 2, x0 + 4):
                if 0 <= x < 16:
                    t[6][x] = VOID_DEEP
        return t


class DrawerDeep(DeepTop):
    """Beyond F1: the void, with drawer banks lost in it (one step deeper)."""
    id = 'drawer_wall_out_top'
    weights = [8, 3, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(VOID)
        if variant in (1, 2, 3):
            for y in range(16):
                for x in range(16):
                    if (y % 5 == 0 or x % 6 == 0) and (x + variant * 3) % 16 < 12:
                        t[y][x] = VOID_DEEP
            if variant == 3:
                t[7][7] = GD(1)
        return t


class PalDeep(DeepTop):
    """Beyond F2: the dark, a far lamp now and then."""
    id = 'palimpsest_wall_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(INK(1))
        if variant == 1:
            for x in range(16):
                t[8][x] = INK(0)
        elif variant == 2:
            t[5][9] = GD(2)
        elif variant == 3:
            for y in range(16):
                t[y][4] = INK(0)
        return t


class ShelfDeep(DeepTop):
    id = 'shelf_shaft_out_top'
    weights = [10, 2, 2, 1, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(VOID)
        if variant in (1, 2):
            for y in range(16):
                t[y][7 if variant == 1 else 12] = VOID_DEEP
        elif variant == 3:
            t[4][4] = GD(1)
        return t


class TowerDeep(DeepTop):
    id = 'book_tower_out_top'
    weights = [10, 2, 2, 1, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(VOID)
        if variant in (1, 2):
            for y in range(4, 16):
                for x in range(3 + variant * 4, 7 + variant * 4):
                    t[y][x % 16] = VOID_DEEP
        return t


# ====================================================================== faces
def ink_block(u, Y, seed=8300):
    """Ink stone: 16 x 8 in running bond, black-violet, a lit top edge."""
    course = Y // 8
    v = Y % 8
    x = (u + (course % 2) * 8) % 16
    if v == 7 or x == 15:
        return INK(0)
    if v == 0:
        return INK(3) if x % 4 else INK(2)
    return INK(1) if h32((u + (course % 2) * 8) // 16, course, seed) % 3 else INK(2)


class InkFace(_Face):
    """The inkwall face: a gold-lipped coping, ink stone blocks, a dark foot."""
    edge_l = INK(3)
    edge_r = INK(0)

    def at(self, u, Y):
        if Y <= 2:
            return [GD(3), GD(2), INK(2)][Y]
        if Y >= 29:
            return INK(0) if (u + Y) % 2 else INK(1)
        return ink_block(u, Y - 3)


class InkScriptFace(InkFace):
    """Inkwall style: a line of gold script cut across the stone (glyph bars)."""
    def at(self, u, Y):
        if Y in (14, 15) and 1 <= u <= 14 and glyph_on(u, 3, 8301):
            return GD(4) if Y == 14 else GD(2)
        if Y in (19, 20) and 2 <= u <= 12 and glyph_on(u, 5, 8302):
            return GD(3) if Y == 19 else GD(1)
        return InkFace.at(self, u, Y)


class InkLampFace(InkFace):
    """Inkwall style: a gold lamp bracket, warm."""
    def at(self, u, Y):
        if 6 <= u <= 9 and 10 <= Y <= 16:
            if Y in (10, 16) or u in (6, 9):
                return GD(1)
            return GD(5) if Y < 13 else GD(4)
        if 7 <= u <= 8 and 17 <= Y <= 19:
            return GD(2)
        return InkFace.at(self, u, Y)


def drawer(u, Y):
    """F1 drawer bank: drawers 8 wide, 6 high, oak frames, a blank label slot and a brass pull in each."""
    course = Y // 6
    v = Y % 6
    x = u % 8
    if v == 5 or x == 7:
        return WD(1)
    if v == 0 or x == 0:
        return WD(4)
    if v == 1 and 2 <= x <= 5:
        return PC(1)                 # the label slot: blank (the Catalog of Lost Lives labels with no names)
    if v == 3 and x in (3, 4):
        return GD(4) if x == 3 else GD(2)
    return WD(3) if (course + u // 8) % 3 else WD(2)


class DrawerFace(_Face):
    """F1 face: a brass-railed cornice, card drawers, a plinth."""
    edge_l = WD(4)
    edge_r = WD(0)

    def at(self, u, Y):
        if Y <= 2:
            return [WD(1), GD(4), GD(2)][Y]
        if Y >= 29:
            return [WD(2), WD(1), WD(0)][Y - 29]
        return drawer(u, Y - 3)


class DrawerOpenFace(DrawerFace):
    """F1 style: one drawer pulled open, a blank card standing in it."""
    def at(self, u, Y):
        if 3 <= u <= 12 and 15 <= Y <= 21:
            if Y == 15:
                return WD(4)
            if Y == 21:
                return WD(0)
            if 5 <= u <= 10 and Y <= 18:
                return PC(0) if Y == 16 else PC(1)
            return WD(1)
        return DrawerFace.at(self, u, Y)


class DrawerGoldFace(DrawerFace):
    """F1 style: a gilt plaque between the drawers (glyph bars worn away, blank)."""
    def at(self, u, Y):
        if 2 <= u <= 13 and 11 <= Y <= 19:
            if u in (2, 13) or Y in (11, 19):
                return GD(2)
            return GD(4) if (u + Y) % 6 else GD(3)
        return DrawerFace.at(self, u, Y)


def pal_plaster(u, Y):
    """F2: plaster of layered pages: grey sheets, old writing slanting faint under new level lines."""
    v = Y % 10
    if v == 9:
        return VL(3)
    if (u - Y * 2) % 7 == 0:
        return VL(2)
    if v in (3, 6) and glyph_on(u, Y // 10 * 2 + (v == 6), 8320):
        return INK(1) if v == 3 else VL(3)
    return VL(1) if (u + Y // 10) % 9 else VL(0)


class PalFace(_Face):
    """F2 face: a dark cornice, written-over plaster, a dark foot."""
    edge_l = VL(0)
    edge_r = SC(1)

    def at(self, u, Y):
        if Y <= 2:
            return [SC(1), VL(0), VL(2)][Y]
        if Y >= 29:
            return SC(1) if (u + Y) % 2 else SC(2)
        return pal_plaster(u, Y)


class PalNicheFace(PalFace):
    """F2 style: a lamp niche, lit warm."""
    lit = True

    def at(self, u, Y):
        if 3 <= u <= 12 and 7 <= Y <= 24:
            arch = Y < 11 and math.hypot(u - 7.5, Y - 11) > 4.6
            if not arch:
                if u in (3, 12) or Y == 24:
                    return SC(2)
                if self.lit:
                    if 6 <= u <= 9 and 13 <= Y <= 16:
                        return FI(4) if u in (7, 8) else FI(3)
                    return SW(3) if Y < 18 else SW(2)
                return INK(1)
        return PalFace.at(self, u, Y)


class PalNicheDarkFace(PalNicheFace):
    lit = False


class PalScrapedFace(PalFace):
    """F2 style: a scraped patch where the old writing shows through bold."""
    def at(self, u, Y):
        if 3 <= u <= 12 and 9 <= Y <= 21:
            if (u - Y * 2) % 4 == 0:
                return VL(3)
            return VL(0)
        return PalFace.at(self, u, Y)


def white_books(u, Y):
    """F3: shelves of pale books: boards every 12 px, spines of white, cream and lilac, a gilt band on some."""
    v = Y % 12
    if v == 11:
        return MB(2)
    if v == 10:
        return PC(1)
    k = u // 2 + (Y // 12) * 3
    tone = [PC(0), BP(0), PC(1), MB(0), BP(0)][h32(k, Y // 12, 8340) % 5]
    if u % 2 == 1 and h32(k, 8341) % 3 == 0:
        return BP(1)
    if v == 3 and h32(k, 8342) % 4 == 0:
        return GD(3)
    if v < 2 and h32(k, Y // 12, 8343) % 3 == 0:
        return MB(1)                 # a shorter book: the shelf's back shows
    return tone


class ShelfFace(_Face):
    """F3 face: shelves of white books climbing."""
    edge_l = PC(0)
    edge_r = MB(2)

    def at(self, u, Y):
        if Y <= 1:
            return [MB(2), PC(0)][Y]
        if Y >= 30:
            return [BP(1), MB(2)][Y - 30]
        return white_books(u, Y - 2)


class ShelfWordFace(ShelfFace):
    """F3 style: a gold word cut across the shelves (SEE, SHELTER, CHOOSE are inscriptions over the stairs; here only
    a bar of gold, never a letter)."""
    def at(self, u, Y):
        if Y in (15, 16, 17) and 1 <= u <= 14:
            return GD(4) if Y == 16 else GD(2)
        return ShelfFace.at(self, u, Y)


class ShelfGapFace(ShelfFace):
    """F3 style: a gap on the shelf, the void showing through between books."""
    def at(self, u, Y):
        if 5 <= u <= 10 and 4 <= Y <= 11:
            return VOID
        return ShelfFace.at(self, u, Y)


SPINE_TONES = [(RR(3), RR(2), RR(1)), (CB(3), CB(2), CB(1)), (RG(3), RG(2), RG(1)), (CP(4), CP(3), CP(2)), (WD(4), WD(3), WD(2))]


def book_spine(u, Y, seed=8350):
    """The town: giant books lying flat, spines out: each 8 px high, a gilt band near each end, a dark page edge."""
    course = Y // 8
    v = Y % 8
    c0, c1, c2 = SPINE_TONES[h32(course, seed) % len(SPINE_TONES)]
    if v == 7:
        return PC(2) if u % 3 else PC(1)          # the page edges between books
    if v == 0:
        return c0
    if u in (2, 13):
        return GD(4) if v < 4 else GD(2)
    if v == 6:
        return c2
    return c1 if (u + v) % 7 else c0


class TowerFace(_Face):
    """The book-tower face: giant spines stacked."""
    edge_l = PC(1)
    edge_r = INK(0)

    def at(self, u, Y):
        if Y <= 1:
            return [GD(3), GD(1)][Y]
        return book_spine(u, Y - 2)


class TowerWindowFace(TowerFace):
    """Book-tower style: a lit window cut into a spine (warm)."""
    def at(self, u, Y):
        if 5 <= u <= 10 and 8 <= Y <= 17:
            if u in (5, 10) or Y in (8, 17):
                return WD(1)
            return GD(4) if (u + Y) % 4 else FI(3)
        return TowerFace.at(self, u, Y)


# ====================================================================== outer faces
class InkOut(OuterFace):
    """Under the inkwall's band: ink stone dissolving into the void (never black)."""
    shadow_line = INK(0)
    edge_dark = INK(0)

    def at(self, x, Y):
        if Y == 0:
            return INK(0)
        t = max(0.0, (Y - 5) / 20.0) ** 0.85
        if fade(x, Y, t):
            return VOID
        return ink_block(x % 16, Y + 2)

    def material(self, x, Y):
        return ink_block(x % 16, Y)


class DrawerOut(OuterFace):
    shadow_line = WD(0)
    edge_dark = WD(0)

    def at(self, x, Y):
        if Y == 0:
            return WD(0)
        t = max(0.0, (Y - 6) / 20.0) ** 0.85
        if fade(x, Y, t):
            return VOID
        return drawer(x % 16, Y + 2)

    def material(self, x, Y):
        return drawer(x % 16, Y)


class PalOut(OuterFace):
    shadow_line = SC(1)
    edge_dark = SC(1)

    def at(self, x, Y):
        if Y == 0:
            return SC(1)
        t = max(0.0, (Y - 5) / 22.0) ** 0.85
        if fade(x, Y, t):
            return INK(1)
        return pal_plaster(x % 16, Y + 2)

    def material(self, x, Y):
        return pal_plaster(x % 16, Y)


class ShelfOut(OuterFace):
    shadow_line = MB(2)
    edge_dark = MB(2)

    def at(self, x, Y):
        if Y == 0:
            return MB(2)
        t = max(0.0, (Y - 6) / 22.0) ** 0.85
        if fade(x, Y, t):
            return VOID
        return white_books(x % 16, Y + 2)

    def material(self, x, Y):
        return white_books(x % 16, Y)


class TowerOut(OuterFace):
    shadow_line = INK(0)
    edge_dark = INK(0)

    def at(self, x, Y):
        if Y == 0:
            return INK(0)
        t = max(0.0, (Y - 6) / 22.0) ** 0.85
        if fade(x, Y, t):
            return VOID
        return book_spine(x % 16, Y + 2)

    def material(self, x, Y):
        return book_spine(x % 16, Y)


FLOORS = [ScriptStep(), MarblePage(), LetterPath(), ScriptMosaic(), Parchment(), GoldScript(), Vellum(), BlankPage()]
VOIDS = [VoidViolet()]                  # A1, 2 flat frames, lowest of all
ANIMATED = [InkCanal()]                 # A1, 3 frames, last
WALLS = [
    ('inkwall', InkTop(), InkFace(), VoidDeep(), InkOut()),
    ('drawer_wall', DrawerTop(), DrawerFace(), DrawerDeep(), DrawerOut()),
    ('palimpsest_wall', PalimpsestTop(), PalFace(), PalDeep(), PalOut()),
    ('shelf_shaft', ShelfTop(), ShelfFace(), ShelfDeep(), ShelfOut()),
    ('book_tower', TowerTop(), TowerFace(), TowerDeep(), TowerOut()),
]
FACE_STYLES = {
    'inkwall': [None, [InkScriptFace(), InkFace()], [InkLampFace(), InkFace(), InkFace()]],
    'drawer_wall': [None, [DrawerOpenFace(), DrawerFace(), DrawerFace()], [DrawerGoldFace(), DrawerFace()]],
    'palimpsest_wall': [None, [PalNicheFace(), PalFace()], [PalNicheDarkFace(), PalFace()], [PalScrapedFace(), PalFace()]],
    'shelf_shaft': [None, [ShelfWordFace(), ShelfFace(), ShelfFace()], [ShelfGapFace(), ShelfFace(), ShelfFace()]],
    'book_tower': [None, [TowerWindowFace(), TowerFace()]],
}
FACE_PLAN = {
    'inkwall': {'ep8_stair': {'cycle': [0, 1, 0, 0, 2]}, 'ep8_last_word': {'cycle': [1, 0, 2, 0]},
                'ep8_scriptorium': {'cycle': [0, 2, 0, 1]}},
    'drawer_wall': {'ep8_library_f1': {'cycle': [0, 1, 0, 2, 0, 0, 1]}},
    'palimpsest_wall': {'ep8_library_f2': {'cycle': [1, 0, 3, 2, 0, 1, 0]}},
    'shelf_shaft': {'ep8_library_f3': {'cycle': [0, 2, 0, 1, 0]}},
    'book_tower': {'ep8_scriptorium': {'cycle': [0, 1, 0, 0, 1]}},
}
