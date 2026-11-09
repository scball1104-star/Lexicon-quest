"""Episode 5 (The Last Prophecy) terrains, wall systems and the ship's deck -> assets/tiles/ep5.png (E5-tiles,
EPISODE5_PLAN 9.1, 4.5 and 5.1). Imported by ep5.py.

Terrains (A2 fill unless noted), drawn so the three Labyrinth floors look nothing alike and none is violet stone
(CRITIQUE_6 item 7):

  dune_sand        firm sand: warm ochre with long wind ripples, the still sand a shadow can lie on. Every sand cell of a
                   shade block is dune_sand on the ground layer; E5-world draws running_sand over the lit ones.
  running_sand     A1, 3 frames, collision water: bright gold sand flowing in diagonal streaks, a soft glowing edge.
  caravan_paving   pale pink-grey sandstone slabs with dark joints (the only safe ground in a shade puzzle): greyer and
                   squarer than the sand, so the eye splits "stone" from "sand" before it reads the shade.
  groove           a worn rut in the paving, scrape lines along it, iron studs at its ends (a stone slides here).
                   A 1-wide run autotiles into a channel with rounded ends; corners turn.
  dune_court       F1 the Shifting Dunes: big terracotta-ochre flagstones, sand drifted into every joint.
  gallery_tile     F2 the Gallery of False Horizons: lapis tiles in a gold diamond lattice (blue, never violet).
  well_basalt      F3 the Well of Tomorrow: near-black basalt hexagons with star-glass seams.
  star_glass       the Eye and F2's Star Floor: deep blue glass full of small stars.
  deck_planks      the Saffron Wind's deck: long oiled planks with copper nails.
  night_sea        A1, 3 frames, collision water: black sea with a moon path's glints (the ship's edges).

Wall systems (as every per-floor kit: <sys>_top band, <sys>_face inner face, <sys>_out_top the beyond, <sys>_out_face):
  dune_court       roofless sandstone court walls, a chiselled frieze whose names were cut away; beyond: open dunes.
  horizon_gallery  lapis-and-gold cornice, sandstone pilasters and painted horizons on the faces; beyond: dark.
                   (the plan's `gallery`: that wall id is Episode 2's Court of Mirrors, so this one is horizon_gallery)
  well_shaft       basalt shaft courses with star-glass seams, a gold rail on the rim; beyond: the shaft's void.
                   (the plan's `well`: `well` is Willowmere's well object, so this one is well_shaft)
"""
import math
from pxlib import Canvas, C, DARK, WHITE, rnd, h32, SH, hexc, profile1d
from autotile import EdgeSpec, full_nb
from terrain import Terrain, Water, blank, scatter
from archive_floors import FloorBase, BandTop, DeepTop, OuterFace, fade, bayer
from ep4_kit import _Face

SA = lambda i: C('sand', i)            # ae8458 c3a57c e4cb96 f6e4b9
PA = lambda i: C('path', i)            # 6a4532 896042 ae8458 c3a57c e4cb96
SW = lambda i: C('stone_warm', i)      # 2e2b4c 584951 7e6d6e a18f85 cfb89c ebdfc8
GD = lambda i: C('gold', i)            # 482826 8f5533 c38334 eba14d f9d77a fff7d6
FI = lambda i: C('fire', i)            # 571f28 b34532 e06b39 eba14d f9d77a fff7d6
EA = lambda i: C('earth', i)           # 2d1b1f 482826 6a4532 896042 ae8458
WD = lambda i: C('wood', i)            # 2d1b1f 482826 6e3d2c 8f5533 b87942 d69c57
RB = lambda i: C('roof_blue', i)       # 0e153b 1d2a67 2c4797 4064b9 6891d9
WA = lambda i: C('water', i)           # 0e153b 1d3775 24559b 3e88ca 6ab3e4 b4e4f2
IC = lambda i: C('ice', i)             # 3e88ca 6ab3e4 b4e4f2 e8fffb
CY = lambda i: C('magic_cyan', i)      # 1d3775 317aa1 2ec4d0 8af0e8 e8fffb
MT = lambda i: C('metal', i)           # 2e2b4c 66637f b3b6c4 e2e0de f6f4ee
SD = lambda i: C('shadow', i)          # 14101e 251d34 2e2b4c 4c445c
INK = lambda i: C('ink', i)            # 14101e 1a1334 292657 3f4186 7162bd
RR = lambda i: C('roof_red', i)        # 2d1b1f 571f28 87332e b34532 e06b39 eba14d
CP = lambda i: C('cloth_purple', i)
MV = lambda i: C('magic_violet', i)

# ---------------------------------------------------------------------- the colours the master palette lacks
# (reported by E5-tiles; ep5.py snaps the sheet to palette.json PLUS these): three desert ochres (the sand ramp jumps
# from the brown #ae8458 to the pale #c3a57c with no saturated dune gold between, and gold #c38334 is copper, not sand),
# and a neutral basalt ramp (every dark in the palette leans violet: shadow, stone_cool and ink; the Well must not be
# violet stone, CRITIQUE_6 item 7).
EXTRA = ['#9c6a32', '#c08a45', '#dcae62',
         '#15171c', '#20232a', '#2e323b', '#454a55']
OC = lambda i: hexc(EXTRA[max(0, min(2, i))])          # 0 dune shadow, 1 dune body, 2 dune light
BS = lambda i: hexc(EXTRA[3 + max(0, min(3, i))])      # basalt 0 (near black) .. 3 (lit edge)


# ====================================================================== dune_sand
class DuneSand(FloorBase):
    """Firm sand: ochre with long wind ripples (a lit crest over a shadowed trough every 5 rows, bending gently), sparse
    darker grains. Quiet on purpose: it is mostly seen under the violet shade, and the running sand over it is the loud
    one. Variants: footprints, a bleached bone, a dry scrub tuft, a pebble pair, a drift ridge."""
    id = 'dune_sand'
    nvariants = 6
    weights = [48, 3, 1, 3, 3, 3]
    edge = OC(0)

    def make_texture(self, frame, variant):
        t = blank(OC(1))
        for y in range(16):
            for x in range(16):
                ph = (y + int(round(1.6 * math.sin((x + 3) * math.pi / 8.0)))) % 6
                c = OC(1)
                if ph == 0:
                    c = OC(2)
                elif ph == 1 and (x + y) % 3:
                    c = OC(2) if (x * 7 + y) % 5 == 0 else OC(1)
                elif ph == 4:
                    c = OC(0) if (x + 2 * y) % 4 else OC(1)
                n = h32(x, y, 5101) % 41
                if n == 0:
                    c = OC(0)
                elif n == 1:
                    c = SA(2)
                t[y][x] = c
        if variant == 1:
            for (x, y) in ((3, 4), (4, 4), (7, 9), (8, 9), (11, 13), (12, 13)):
                t[y][x] = OC(0)
                t[y - 1][x] = OC(0) if x % 2 else t[y - 1][x]
        elif variant == 2:
            for x in range(5, 11):
                t[9][x] = SA(3)
            for (x, y) in ((4, 8), (4, 10), (11, 8), (11, 10)):
                t[y][x] = SA(3)
            for x in range(5, 11):
                t[10][x] = OC(0)
        elif variant == 3:
            for (x, y) in ((7, 6), (6, 5), (8, 5), (5, 4), (9, 4), (7, 4), (7, 5)):
                t[y][x] = EA(3) if y < 6 else EA(2)
            t[7][7] = OC(0); t[7][6] = OC(0); t[7][8] = OC(0)
        elif variant == 4:
            for (x, y, c) in ((5, 11, SW(3)), (6, 11, SW(4)), (6, 12, SW(2)), (10, 5, SW(3)), (10, 6, SW(2))):
                t[y][x] = c
        elif variant == 5:
            for x in range(16):
                y = 8 + int(round(2 * math.sin(x * math.pi / 8.0)))
                t[y][x] = OC(2)
                t[(y + 1) % 16][x] = OC(0)
        return t


# ====================================================================== running_sand
class RunningSand(Water):
    """Running sand (A1, 3 frames): bright gold, flowing. Diagonal highlight streaks (2 px, white-gold heads, gold tails)
    travel 2 px down-right each frame, grains glint, and a soft gold glow rims the cell edge (a dithered fade into the
    still sand around). Read at a glance against firm shaded sand on a phone (the 0.25 luma rule)."""
    id = 'running_sand'
    kind = 'hole'
    collision = 'water'

    def __init__(self):
        Terrain.__init__(self)
        prof = {s: profile1d(5200 + i, amp=0.6, spikes=0) for i, s in enumerate('NSWE')}
        self.specs = {'surf': EdgeSpec({'N': 0.5, 'S': 0.5, 'W': 0.5, 'E': 0.5}, r=1.5, rr=1.0, prof=prof)}

    def make_texture(self, frame, variant):
        # broken streaks on a shallow diagonal (the flow runs down-right): each diagonal lane carries dashes of
        # different lengths, a white head, a pale body and a gold tail, over a warm gold body with darker troughs
        # between the lanes; the whole pattern slides 16 px along the flow per loop in three near-even steps.
        t = blank(GD(4))
        sh = [0, 5, 11][frame % 3]
        for y in range(16):
            for x in range(16):
                lane = (x - 2 * y) % 16            # 0..15 across the lanes
                along = (x + sh) % 16              # position along the flow
                c = GD(4)
                if lane in (6, 7, 14):
                    c = GD(3) if lane != 14 else SA(2)
                elif lane == 8:
                    c = OC(2) if (along + y) % 3 else GD(3)
                for (ln, start, L) in ((0, 1, 7), (1, 10, 4), (3, 5, 3), (10, 12, 6), (11, 3, 3)):
                    if lane == ln:
                        k = (along - start) % 16
                        if k < L:
                            c = WHITE if k == L - 1 else (SA(3) if k >= L - 3 else SA(2))
                t[y][x] = c
        for (gx, gy) in ((13, 12), (4, 6)):
            t[(gy + frame * 3) % 16][(gx + sh) % 16] = WHITE
        return t

    def pixel(self, c, x, y):
        if not c.i('surf', x, y):
            # outside the flowing body: a dithered glow onto the still sand (translucent gold)
            return (0xf9, 0xd7, 0x7a, 120) if (x + y + c.frame) % 2 == 0 else None
        d = c.f('surf', x, y)
        if d < 1:
            return GD(3) if (x + y + c.frame) % 3 else GD(4)
        return self.tex(c, x, y)


# ====================================================================== caravan_paving
class CaravanPaving(FloorBase):
    """Pale sandstone slabs (rose-grey, not sand-yellow) in staggered courses, dark joints and a lit north lip on every
    slab: reads as stone you stand on. Variants: a worn hollow, sand dusting a joint, a carved caravan mark, a cracked
    slab, an iron ring."""
    id = 'caravan_paving'
    nvariants = 6
    weights = [36, 4, 6, 2, 4, 1]
    edge = SW(1)
    ROWS = [(0, 9, [(0, 9), (9, 7)]), (9, 7, [(4, 12)])]

    def make_texture(self, frame, variant):
        t = blank(SW(2))
        k = 0
        for ri, (y0, h, row) in enumerate(self.ROWS):
            for si, (x0, w) in enumerate(row):
                tone = h32(ri, si, 5301) % 3
                base = [SW(4), SW(3), SW(4)][tone]
                k += 1
                for yy in range(h - 1):
                    for xx in range(w - 1):
                        X, Y = (x0 + xx) % 16, (y0 + yy) % 16
                        c = base
                        if yy == 0:
                            c = SW(5) if base == SW(4) else SW(4)
                        elif yy == h - 2:
                            c = SW(3) if base == SW(4) else SW(2)
                        else:
                            n = h32(X, Y, 5302) % 37
                            if n == 0:
                                c = SW(3)
                            elif n == 1:
                                c = SA(1)
                        t[Y][X] = c
                for yy in range(h):
                    t[(y0 + yy) % 16][(x0 + w - 1) % 16] = SW(3) if (yy + si) % 3 else SW(2)
                for xx in range(w):
                    t[(y0 + h - 1) % 16][(x0 + xx) % 16] = SW(3) if (xx + ri) % 3 else SW(2)
        if variant == 1:
            for y in range(3, 6):
                for x in range(3, 8):
                    if ((x - 5) / 2.6) ** 2 + ((y - 4) / 1.4) ** 2 < 1:
                        t[y][x] = SW(3) if y == 3 else SW(4)
        elif variant == 2:
            for x in range(16):
                if (x * 5) % 7 < 4:
                    t[7][x] = OC(2) if x % 3 else OC(1)
        elif variant == 3:
            # a caravan mark: a small camel-and-star sign chiselled in
            for (x, y) in ((3, 10), (4, 9), (5, 10), (6, 10), (7, 9), (8, 10), (4, 11), (7, 11), (11, 9), (10, 10), (12, 10), (11, 11)):
                t[y][x] = SW(2)
        elif variant == 4:
            for (x, y) in ((9, 2), (10, 3), (10, 4), (11, 5), (12, 6), (11, 4)):
                t[y][x] = SW(1)
        elif variant == 5:
            for y in range(9, 14):
                for x in range(9, 14):
                    d = math.hypot(x - 11, y - 11.5)
                    if 1.4 <= d < 2.4:
                        t[y][x] = MT(1) if y > 11 else MT(2)
        return t


# ====================================================================== groove
class Groove(Terrain):
    """A worn rut cut into the paving (drawn above caravan_paving): a 6 px channel down the middle of a run with a dark
    floor, two bright scraped lips and long scrape lines along the run, rounded where the run ends. The paving shows on
    both sides, so a 1-wide groove reads as a track, and a stone set on it reads as 'this one slides'."""
    id = 'groove'
    kind = 'fill'
    collision = 'none'
    nvariants = 1

    def __init__(self):
        super().__init__()
        self.specs = {'cell': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb')}
        self.pave = CaravanPaving()

    def make_texture(self, frame, variant):
        return self.pave.texture(0, 0)

    def pixel(self, c, x, y):
        if not c.i('cell', x, y):
            return None
        d = c.f('cell', x, y)
        base = self.tex(c, x, y)
        if d < 4:
            return base
        if d < 5:
            return SW(5) if (x + y) % 4 else MT(3)
        if d < 6:
            return SW(1)
        # the rut floor: dark worn stone with scrape lines along the run
        s = c.side('cell', x, y)
        along = y if s in ('W', 'E') else x
        across = x if s in ('W', 'E') else y
        if (across % 3 == 0) and (along * 3 + across) % 7 < 5:
            return SW(2)
        return SW(1) if (along + across) % 5 else SD(2)


# ====================================================================== the three Labyrinth floors
class DuneCourt(FloorBase):
    """F1: big terracotta-ochre flagstones laid in two 8 px courses of uneven widths (never a grid), each slab a single
    warm tone with a sun-bleached north lip and a darker foot; the joints are filled with pale drifted sand. Quieter than
    the actors; warmer and redder than the dunes, so floor and sand never read as one. Variants: a sand drift across a
    slab, a fallen glyph tile, a crack, a scorpion track, a sun mark."""
    id = 'dune_court'
    nvariants = 6
    weights = [44, 3, 2, 3, 2, 2]
    edge = EA(1)
    ROWS = [(0, 8, [(0, 11), (11, 5)]), (8, 8, [(3, 7), (10, 9)])]

    def make_texture(self, frame, variant):
        t = blank(SA(1))
        for ri, (y0, h, row) in enumerate(self.ROWS):
            for si, (x0, w) in enumerate(row):
                tone = h32(ri, si, 5401) % 3
                base = [PA(2), EA(4), PA(2)][tone]
                lip = PA(3)
                foot = PA(1) if base == PA(2) else EA(3)
                for yy in range(h - 1):
                    for xx in range(w - 1):
                        X, Y = (x0 + xx) % 16, (y0 + yy) % 16
                        c = base
                        if yy == 0:
                            c = lip
                        elif yy == h - 2:
                            c = foot
                        else:
                            n = h32(X, Y, 5402) % 29
                            if n == 0:
                                c = foot
                            elif n == 1:
                                c = lip
                        t[Y][X] = c
                for yy in range(h):
                    t[(y0 + yy) % 16][(x0 + w - 1) % 16] = SA(1) if (yy + ri) % 3 else OC(2)
                for xx in range(w):
                    t[(y0 + h - 1) % 16][(x0 + xx) % 16] = SA(1) if (xx + si) % 4 else OC(2)
        if variant == 1:
            for x in range(16):
                y0 = 9 + int(round(1.5 * math.sin(x * math.pi / 8.0 + 1)))
                for y in range(y0, min(16, y0 + 2)):
                    t[y][x] = SA(1) if y == y0 else OC(2)
        elif variant == 2:
            for y in range(2, 6):
                for x in range(2, 6):
                    t[y][x] = GD(2) if (x + y) % 2 else PA(3)
            t[3][3] = RB(2)
            t[4][4] = RB(2)
        elif variant == 3:
            for (x, y) in ((9, 9), (10, 10), (10, 11), (11, 12), (12, 12), (13, 13)):
                t[y][x] = EA(2)
        elif variant == 4:
            for i in range(6):
                t[3 + (i * 2) % 12][2 + i * 2] = EA(2)
                t[4 + (i * 2) % 12][3 + i * 2] = EA(2)
        elif variant == 5:
            for (x, y) in ((11, 2), (11, 6), (9, 4), (13, 4), (10, 3), (12, 3), (10, 5), (12, 5), (11, 4)):
                t[y][x] = GD(3) if (x, y) == (11, 4) else EA(3)
        return t


class GalleryTile(FloorBase):
    """F2: lapis tiles set in a gold diamond lattice (the lattice lines run on the diagonals, a gold stud where they
    cross), a pale glaze lip on each tile's north-west. Blue and gold, never violet. Variants: a cracked tile, a gold
    star inlay, sand on the glaze, a missing tile, a horizon tile (a thin painted line)."""
    id = 'gallery_tile'
    nvariants = 6
    weights = [40, 3, 4, 4, 2, 2]
    edge = RB(0)

    def make_texture(self, frame, variant):
        t = blank(RB(2))
        for y in range(16):
            for x in range(16):
                a = (x + y) % 16
                b = (x - y) % 16
                if a == 0 or b == 0:
                    c = GD(2) if (x + y) % 2 else GD(3)
                elif a == 1 or b == 1:
                    c = RB(3)
                elif a == 15 or b == 15:
                    c = RB(1)
                else:
                    c = RB(2)
                    if h32(x, y, 5501) % 23 == 0:
                        c = RB(1)
                t[y][x] = c
        for (x, y) in ((0, 0), (8, 8)):
            t[y][x] = GD(4)
        if variant == 1:
            for (x, y) in ((4, 6), (5, 7), (5, 8), (6, 9)):
                t[y][x] = RB(0)
        elif variant == 2:
            for (x, y) in ((8, 3), (8, 5), (7, 4), (9, 4)):
                t[y][x] = GD(3)
            t[4][8] = GD(4)
        elif variant == 3:
            for (x, y) in scatter(5502, 7, 2, 2, 14):
                t[y][x] = OC(2) if (x + y) % 2 else OC(1)
        elif variant == 4:
            for y in range(9, 14):
                for x in range(3, 8):
                    if abs(x - 5) + abs(y - 11) <= 2:
                        t[y][x] = SW(1) if abs(x - 5) + abs(y - 11) < 2 else SD(1)
        elif variant == 5:
            for x in range(2, 14):
                t[12][x] = IC(2) if x < 8 else OC(2)
        return t


class WellBasalt(FloorBase):
    """F3: near-black basalt in hexagon-ish columns (offset 8 px cells with clipped corners), each column top lit on its
    north-west, and seams of star-glass: a fine blue line with white star points that glint in the lamp light. The
    darkest floor of the episode by design (F3 luma at or below F2's). Variants: a bright star cluster, a cracked
    column, sand in a seam, a fallen lamp shard, a carved ring."""
    id = 'well_basalt'
    nvariants = 6
    weights = [40, 3, 3, 4, 2, 2]
    edge = BS(0)

    def make_texture(self, frame, variant):
        t = blank(BS(1))
        for y in range(16):
            for x in range(16):
                row = y // 8
                u = (x + row * 4) % 8
                v = y % 8
                corner = (u in (0, 7) and v in (0, 7))
                if v == 7 or u == 7 or corner:
                    c = RB(1) if (x + y) % 5 else WA(1)
                    if (x * 7 + y * 3) % 19 == 0:
                        c = IC(2)
                elif v == 0 or u == 0:
                    c = BS(3) if v == 0 and u < 5 else BS(2)
                else:
                    c = BS(1) if h32(x // 2, y // 2, 5601) % 4 else BS(2)
                    if v == 6:
                        c = BS(0)
                t[y][x] = c
        t[7][3] = WHITE
        t[15][11] = IC(3)
        if variant == 1:
            for (x, y, c) in ((5, 3, WHITE), (7, 4, IC(3)), (4, 5, IC(2)), (9, 2, IC(2)), (6, 6, IC(3))):
                t[y][x] = c
        elif variant == 2:
            for (x, y) in ((10, 2), (11, 3), (11, 4), (12, 5)):
                t[y][x] = BS(0)
        elif variant == 3:
            for x in range(1, 7):
                t[15][x] = OC(1) if x % 2 else OC(0)
        elif variant == 4:
            for (x, y, c) in ((9, 10, GD(2)), (10, 10, GD(3)), (10, 11, GD(1)), (9, 11, BS(0))):
                t[y][x] = c
        elif variant == 5:
            for y in range(9, 15):
                for x in range(2, 8):
                    d = math.hypot(x - 4.5, y - 11.5)
                    if 2.0 <= d < 2.8:
                        t[y][x] = BS(3)
        return t


class StarGlass(FloorBase):
    """Star-glass: deep blue glass, darker toward each tile's south, full of small stars (white, pale blue, a rare gold),
    a faint lighter band where the light catches it. The Eye's floor and F2's Star Floor."""
    id = 'star_glass'
    nvariants = 4
    weights = [10, 3, 3, 2]
    edge = WA(0)

    def make_texture(self, frame, variant):
        t = blank(WA(0))
        for y in range(16):
            for x in range(16):
                c = WA(0) if (x + y * 3) % 7 else RB(1)
                if (x - y) % 16 in (3, 4) and h32(x, y, 5701) % 3:
                    c = RB(1)
                t[y][x] = c
        stars = [(2, 3, WHITE), (9, 1, IC(2)), (13, 6, WHITE), (5, 10, IC(3)), (11, 12, IC(2)), (1, 14, IC(1))]
        if variant == 1:
            stars += [(7, 6, GD(4)), (8, 7, IC(2))]
        elif variant == 2:
            stars += [(4, 6, WHITE), (6, 5, IC(2)), (3, 7, IC(1))]
        elif variant == 3:
            stars += [(12, 10, WHITE), (14, 9, IC(3))]
        for (x, y, c) in stars:
            t[y][x] = c
        return t


class DeckPlanks(FloorBase):
    """The Saffron Wind's deck: long oiled planks (5 px wide) running bow to stern, staggered butt joints, copper nails,
    pitch in the seams. Warm under the lanterns."""
    id = 'deck_planks'
    nvariants = 4
    weights = [16, 2, 2, 1]
    edge = WD(0)

    def make_texture(self, frame, variant):
        t = blank(WD(2))
        for y in range(16):
            p = y // 4
            v = y % 4
            for x in range(16):
                joint = (x + p * 6) % 16 == 0
                if v == 3:
                    c = WD(0)
                elif joint:
                    c = WD(1)
                elif v == 0:
                    c = WD(4) if p % 2 else WD(3)
                else:
                    c = WD(3) if p % 2 else WD(2)
                    if h32(x // 3, p, 5801) % 6 == 0:
                        c = WD(2) if p % 2 else WD(1)
                t[y][x] = c
            nx = (p * 6 + 2) % 16
            t[y - v + 1][nx] = GD(2) if v == 0 else t[y - v + 1][nx]
        if variant == 1:
            for (x, y) in ((6, 5), (7, 5)):
                t[y][x] = GD(3)
        elif variant == 2:
            for x in range(3, 12):
                t[9][x] = WD(1)
        elif variant == 3:
            for (x, y) in ((10, 10), (11, 10), (10, 11)):
                t[y][x] = OC(2)
        return t


class NightSea(Water):
    """The night sea (A1, 3 frames): near-black blue water, long low swells, a broken moon path of pale glints that
    shift each frame. A thin dark line where it meets the hull."""
    id = 'night_sea'
    kind = 'hole'
    collision = 'water'

    def __init__(self):
        Terrain.__init__(self)
        self.specs = {'surf': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb')}

    def make_texture(self, frame, variant):
        t = blank(WA(0))
        for (x, y, L) in ((2, 3, 9), (9, 10, 6), (0, 14, 5)):
            for k in range(L):
                t[y][(x + k + frame) % 16] = RB(1)
            for k in range(1, L - 1):
                t[y - 1][(x + k + frame) % 16] = WA(1) if k % 3 else RB(1)
        for i, (x, y) in enumerate(((5, 2), (12, 9), (3, 13))):
            if (frame + i) % 3 != 2:
                t[y][(x + frame) % 16] = IC(2) if (frame + i) % 3 == 0 else WA(4)
        return t

    def pixel(self, c, x, y):
        if not c.i('surf', x, y):
            return None
        d = c.f('surf', x, y)
        if d < 1 and c.side('surf', x, y) == 'N':
            return DARK
        return self.tex(c, x, y)


# ====================================================================== wall bands
class DuneCourtTop(BandTop):
    """F1 band: pale sandstone coping blocks in two courses (a step lighter than the terracotta floor, so the walls stand
    up from it), sand settled along the back, a bright chiselled front lip."""
    id = 'dune_court_top'
    seed = 5410
    weights = [7, 2, 2, 2]

    def make_texture(self, frame, variant):
        t = blank(SA(1))
        for y in range(16):
            for x in range(16):
                course = y // 8
                u = (x + course * 6) % 16
                if y % 8 == 7 or u == 15:
                    c = PA(2)
                elif y % 8 == 0:
                    c = SA(2)
                else:
                    n = h32(x, y, 5411) % 23
                    c = PA(3) if n == 0 else (SA(2) if n == 1 else SA(1))
                t[y][x] = c
        if variant == 1:
            for x in range(16):
                if (x * 3) % 5 < 3:
                    t[2][x] = OC(2)
                    t[3][x] = OC(1)
        elif variant == 2:
            for (x, y) in ((5, 10), (6, 10), (6, 11)):
                t[y][x] = GD(2)
        elif variant == 3:
            for (x, y) in ((3, 4), (4, 5), (4, 6), (5, 7)):
                t[y][x] = PA(1)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [SA(3), SA(2), PA(3), PA(1)][min(3, int(d))]
        if side == 'N':
            return EA(1) if d < 1 else OC(1)
        if side == 'W':
            return EA(2) if d < 1 else PA(4)
        return EA(1) if d < 1 else PA(1)


class GalleryTop(BandTop):
    """F2 band: a lapis-tiled cornice top with a gold rail along the front lip and gold studs."""
    id = 'gallery_top'
    seed = 5420
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(RB(2))
        for y in range(16):
            for x in range(16):
                if y % 8 == 7 or x % 8 == 7:
                    c = RB(0)
                elif y % 8 == 0 or x % 8 == 0:
                    c = RB(3)
                else:
                    c = RB(2) if h32(x, y, 5421) % 13 else RB(1)
                t[y][x] = c
        for (x, y) in ((3, 3), (11, 11)):
            t[y][x] = GD(3)
        if variant == 1:
            for x in range(2, 14):
                t[8][x] = GD(2)
        elif variant == 2:
            for (x, y) in scatter(5422, 5, 2, 1, 15):
                t[y][x] = OC(2)
        elif variant == 3:
            t[4][11] = IC(2)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GD(4), GD(3), GD(1), RB(1)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else RB(0)
        if side == 'W':
            return RB(1) if d < 1 else RB(4)
        return DARK if d < 1 else RB(1)


class WellTop(BandTop):
    """F3 band: the shaft's basalt rim, dressed blocks with a brass guard rail along the front (the drop is below)."""
    id = 'well_top'
    seed = 5430
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(BS(2))
        for y in range(16):
            for x in range(16):
                course = y // 8
                u = (x + course * 5) % 16
                if y % 8 == 7 or u == 15:
                    c = BS(0)
                elif y % 8 == 0:
                    c = BS(3)
                else:
                    c = BS(2) if h32(x, y, 5431) % 9 else BS(1)
                t[y][x] = c
        if variant == 1:
            for (x, y) in ((6, 4), (9, 11)):
                t[y][x] = IC(2)
        elif variant == 2:
            for x in range(3, 13):
                t[12][x] = RB(1)
            t[12][8] = WHITE
        elif variant == 3:
            for (x, y) in ((4, 3), (5, 3), (4, 4)):
                t[y][x] = OC(1)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [GD(3), GD(1), BS(3), BS(1)][min(3, int(d))]
        if side == 'N':
            return DARK if d < 1 else BS(0)
        if side == 'W':
            return BS(0) if d < 1 else BS(3)
        return DARK if d < 1 else BS(0)


# ====================================================================== the beyond
class DuneCourtDeep(DeepTop):
    """Beyond F1's courts: open dunes in the sun, a step darker than the floor sand (no black void: it is roofless)."""
    id = 'dune_court_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(OC(0))
        for y in range(16):
            for x in range(16):
                ph = (y + int(round(1.5 * math.sin((x + 5) * math.pi / 8.0)))) % 8
                t[y][x] = OC(1) if ph == 0 else (PA(1) if ph == 5 and (x + y) % 2 else OC(0))
        if variant == 1:
            for (x, y) in ((6, 9), (7, 8), (8, 9)):
                t[y][x] = EA(3)
        elif variant == 2:
            for x in range(4, 12):
                t[11][x] = OC(2)
        elif variant == 3:
            for y in range(5, 12):
                t[y][8] = PA(2) if y < 8 else PA(1)
        elif variant == 4:
            t[4][4] = SA(3); t[4][5] = SA(2)
        elif variant == 5:
            t[12][12] = EA(1)
        return t


class GalleryDeep(DeepTop):
    """Beyond F2's walls: the dark, with the gold glint of a far cornice."""
    id = 'gallery_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(DARK)
        t[5][3] = INK(1); t[12][11] = INK(1)
        if variant == 1:
            for x in range(2, 14):
                t[8][x] = INK(2)
        elif variant == 2:
            t[6][7] = GD(1)
        elif variant == 3:
            for y in range(3, 14):
                t[y][7] = INK(1)
        elif variant == 4:
            t[9][9] = RB(1)
        elif variant == 5:
            t[3][12] = GD(0)
        return t


class WellDeep(DeepTop):
    """Beyond F3's rim: the shaft's void, a few faint stars far below."""
    id = 'well_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(BS(0))
        for y in range(16):
            for x in range(16):
                if (x + y) % 2 and h32(x, y, 5441) % 5 == 0:
                    t[y][x] = DARK
        if variant == 1:
            t[6][5] = RB(1)
        elif variant == 2:
            t[10][11] = IC(1); t[3][3] = RB(1)
        elif variant == 3:
            t[8][8] = WA(1)
        elif variant == 4:
            t[12][4] = GD(0)
        elif variant == 5:
            t[4][12] = IC(1)
        return t


# ====================================================================== inner faces (2-row, Y 0..31)
def sand_ashlar(u, Y, seed=5451):
    """Sandstone ashlar, 8 px courses, running bond, sand-filled joints, chisel marks."""
    course = Y // 8
    v = Y % 8
    off = (course % 2) * 8
    uu = (u + off) % 16
    if v == 7:
        return PA(1) if (u + course) % 5 else OC(1)
    if uu == 15:
        return PA(1)
    tone = h32((u + off) // 16, course, seed) % 3
    base = [PA(3), PA(2), PA(3)][tone]
    if v == 0:
        return SA(2) if base == PA(3) else PA(3)
    if uu == 0:
        return SA(2) if v < 4 else base
    if v == 6:
        return PA(2) if base == PA(3) else PA(1)
    if h32(u, Y, seed + 1) % 29 == 0:
        return PA(1)
    return base


class DuneCourtFace(_Face):
    """F1 face: a sandstone cornice, dressed ashlar, a sand drift banked against the foot."""
    edge_l = EA(2)
    edge_r = EA(1)

    def at(self, u, Y):
        if Y <= 3:
            return [EA(1), SA(3), SA(2), PA(2)][Y]
        if Y == 4:
            return EA(1)
        if Y >= 27:
            drift = 27 + int(round(1.2 * math.sin(u * math.pi / 8.0 + 1)))
            if Y >= drift:
                return OC(2) if Y == drift else OC(1)
        if Y == 31:
            return EA(1)
        return sand_ashlar(u, Y)


class GlyphFrieze(DuneCourtFace):
    """F1 style: a frieze band of name cartouches with the names chiselled off (scarred rough rectangles)."""
    def at(self, u, Y):
        if 10 <= Y <= 18:
            if Y in (10, 18):
                return EA(1)
            if Y in (11, 17):
                return PA(3)
            c = u % 8
            if c in (0, 7):
                return PA(1)
            if Y in (12, 16):
                return PA(2)
            return EA(2) if h32(u, Y, 5461) % 3 else PA(1)
        return DuneCourtFace.at(self, u, Y)


class SunDiscFace(DuneCourtFace):
    """F1 style: a carved sun disc in the ashlar, its rays cut deep."""
    def at(self, u, Y):
        d = math.hypot(u - 7.5, Y - 15.5)
        if d < 3.2:
            return GD(3) if (u < 8 and Y < 16) else GD(2)
        if d < 4.2:
            return EA(2)
        if d < 7 and (int(math.degrees(math.atan2(Y - 15.5, u - 7.5)) + 360) // 30) % 2 == 0 and d > 4.6:
            return PA(1)
        return DuneCourtFace.at(self, u, Y)


class SandFallFace(DuneCourtFace):
    """F1 style: a crack in the wall with sand pouring out onto a cone at its foot."""
    def at(self, u, Y):
        if 6 <= Y <= 14 and abs(u - 8 + (Y // 4) % 2) <= 0:
            return EA(1)
        if Y > 14 and abs(u - 8) <= 1 + (Y - 14) // 5:
            if Y >= 25:
                return OC(2) if abs(u - 8) < (Y - 22) else DuneCourtFace.at(self, u, Y)
            return SA(3) if (u + Y) % 3 else OC(2)
        return DuneCourtFace.at(self, u, Y)


class NicheUrnFace(DuneCourtFace):
    """F1 style: a shallow niche with a clay water jar."""
    def at(self, u, Y):
        if 3 <= u <= 12 and 8 <= Y <= 24:
            arch = Y < 12 and math.hypot(u - 7.5, Y - 12) > 4.6
            if not arch:
                if u in (3, 12) or (Y == 8):
                    return EA(1)
                jar = math.hypot((u - 7.5) / 3.2, (Y - 19.5) / 4.0) < 1.0 or (Y in (14, 15) and 6 <= u <= 9)
                if jar:
                    return RR(3) if u < 8 else RR(2)
                return EA(2) if Y < 20 else EA(1)
        return DuneCourtFace.at(self, u, Y)


def lapis_panel(u, Y):
    """Gallery wall: sandstone pilaster edges, a lapis panel with a gold frieze."""
    if u in (0, 15):
        return PA(2)
    if u in (1, 14):
        return SA(2) if u == 1 else PA(1)
    if Y in (8, 9):
        return GD(3) if (u + Y) % 2 else GD(2)
    if Y in (23, 24):
        return GD(2)
    return RB(2) if (u + Y) % 6 else RB(3)


class GalleryFace(_Face):
    """F2 face: a gold-and-sandstone cornice, a lapis panel between sandstone pilasters, a gold frieze, a dark plinth."""
    edge_l = PA(1)
    edge_r = EA(1)

    def at(self, u, Y):
        if Y <= 4:
            return [DARK, GD(4), GD(3), PA(3), PA(1)][Y]
        if Y >= 28:
            return [PA(2), PA(1), EA(1), DARK][Y - 28]
        return lapis_panel(u, Y)


class HorizonFace(GalleryFace):
    """F2 style: a painted horizon in the panel (kind 0 sea, 1 dunes, 2 city), framed in gold."""
    def __init__(self, kind):
        self.kind = kind

    def at(self, u, Y):
        if 2 <= u <= 13 and 10 <= Y <= 22:
            if Y in (10, 22) or u in (2, 13):
                return GD(2)
            h = 16
            if self.kind == 0:
                if Y < h:
                    return IC(2) if Y < 13 else IC(1)
                if Y == h:
                    return WHITE if u % 3 else IC(3)
                return WA(3) if (u + Y) % 3 else WA(2)
            if self.kind == 1:
                dune = 16 + int(round(1.6 * math.sin(u * 0.9)))
                if Y < dune:
                    return FI(4) if Y < 13 else FI(3)
                return OC(2) if Y == dune else OC(1)
            if Y < 15:
                return FI(3) if Y < 12 else FI(2)
            tower = (u in (5, 6) and Y >= 12) or (u in (9, 10, 11) and Y >= 14) or (u in (3, 4) and Y >= 16)
            if tower or Y >= 18:
                return RB(1) if not (u == 10 and Y == 15) else GD(4)
            return FI(2)
        return GalleryFace.at(self, u, Y)


class ArchWindowFace(GalleryFace):
    """F2 style: a tall arched recess (dark), the horizon window's frame (the window_horizon object lights one)."""
    def at(self, u, Y):
        if 3 <= u <= 12 and 7 <= Y <= 26:
            top = Y < 11 and math.hypot(u - 7.5, Y - 11) > 4.6
            if not top:
                if u in (3, 12) or Y == 26:
                    return GD(2)
                if u == 7 or u == 8 and Y > 12:
                    return GD(1)
                return INK(1) if Y < 18 else DARK
        return GalleryFace.at(self, u, Y)


class PilasterFace(GalleryFace):
    """F2 style: a gold-capped sandstone pilaster standing proud of the lapis."""
    def at(self, u, Y):
        if 5 <= u <= 10 and 5 <= Y <= 27:
            if Y <= 7:
                return GD(4) if Y == 5 else GD(2)
            return [PA(1), SA(3), SA(2), PA(3), PA(2), EA(2)][u - 5]
        return GalleryFace.at(self, u, Y)


def basalt_course(u, Y):
    """Well wall: basalt courses (8 px) with a star-glass seam every other joint."""
    course = Y // 8
    v = Y % 8
    off = (course % 2) * 6
    uu = (u + off) % 16
    if v == 7:
        if course % 2:
            return IC(2) if (u * 5 + course) % 11 == 0 else RB(1)
        return BS(0)
    if uu in (0, 15):
        return BS(0) if uu == 15 else BS(3)
    if v == 0:
        return BS(3)
    return BS(2) if h32(u // 2, Y // 2, 5471) % 5 else BS(1)


class WellFace(_Face):
    """F3 face: the shaft wall, basalt courses with star-glass seams; a shadow band under the rim."""
    edge_l = BS(1)
    edge_r = BS(0)

    def at(self, u, Y):
        if Y <= 3:
            return [DARK, GD(2), BS(3), BS(1)][Y]
        if Y <= 6:
            return BS(0) if (u + Y) % 2 else BS(1)
        if Y >= 30:
            return [BS(1), DARK][Y - 30]
        return basalt_course(u, Y)


class StarVeinFace(WellFace):
    """F3 style: a bright star-glass vein running down the wall, stars along it."""
    def at(self, u, Y):
        x = 8 + int(round(2.5 * math.sin(Y * 0.35)))
        if 6 < Y < 30 and abs(u - x) <= 0:
            return IC(2) if Y % 4 else WHITE
        if 6 < Y < 30 and abs(u - x) == 1:
            return RB(1)
        return WellFace.at(self, u, Y)


class VowNicheFace(WellFace):
    """F3 style: a small carved niche with a worn ring (the vows' mark)."""
    def at(self, u, Y):
        if 4 <= u <= 11 and 10 <= Y <= 22:
            if u in (4, 11) or Y in (10, 22):
                return BS(3) if (u == 4 or Y == 10) else BS(0)
            d = math.hypot(u - 7.5, Y - 16)
            if 2.0 <= d < 3.0:
                return GD(1)
            return BS(0)
        return WellFace.at(self, u, Y)


class ConstellationFace(WellFace):
    """F3 style: a constellation inlaid in the basalt, stars joined by fine gold lines."""
    def at(self, u, Y):
        pts = [(3, 11), (7, 9), (11, 13), (9, 19), (4, 21)]
        for (px, py) in pts:
            if (u, Y) == (px, py):
                return WHITE
        for (a, b) in zip(pts, pts[1:]):
            (x0, y0), (x1, y1) = a, b
            n = max(abs(x1 - x0), abs(y1 - y0))
            for k in range(1, n):
                if (u, Y) == (x0 + round((x1 - x0) * k / n), y0 + round((y1 - y0) * k / n)) and k % 2:
                    return GD(1)
        return WellFace.at(self, u, Y)


# ====================================================================== outer faces
class DuneCourtOut(OuterFace):
    """Under F1's band: the wall's outer face falling into the dunes (sand banked high, no black)."""
    shadow_line = EA(1)
    edge_dark = EA(1)

    def at(self, x, Y):
        if Y == 0:
            return EA(1)
        if 1 <= Y <= 3:
            return [SA(2), PA(3), PA(1)][Y - 1]
        if Y > 12 + int(round(2 * math.sin(x * 0.4))):
            return OC(0) if (x + Y) % 4 else OC(1)
        return sand_ashlar(x % 16, Y + 3, 5481)

    def material(self, x, Y):
        return sand_ashlar(x % 16, Y)


class GalleryOut(OuterFace):
    shadow_line = RB(0)
    edge_dark = RB(0)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [GD(3), GD(1), RB(1)][Y - 1]
        return lapis_panel(x % 16, Y + 6)


class WellOut(OuterFace):
    shadow_line = BS(0)
    edge_dark = BS(0)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [GD(2), BS(3), BS(1)][Y - 1]
        return basalt_course(x % 16, Y + 4)


FLOORS = [DuneSand(), CaravanPaving(), Groove(), DuneCourt(), GalleryTile(), WellBasalt(), StarGlass(), DeckPlanks()]
ANIMATED = [RunningSand(), NightSea()]
WALLS = [
    ('dune_court', DuneCourtTop(), DuneCourtFace(), DuneCourtDeep(), DuneCourtOut()),
    ('horizon_gallery', GalleryTop(), GalleryFace(), GalleryDeep(), GalleryOut()),
    ('well_shaft', WellTop(), WellFace(), WellDeep(), WellOut()),
]
FACE_STYLES = {
    'dune_court': [None, [GlyphFrieze(), DuneCourtFace()], [SunDiscFace(), DuneCourtFace(), DuneCourtFace()],
                   [SandFallFace(), DuneCourtFace()], [NicheUrnFace(), DuneCourtFace(), DuneCourtFace()]],
    'horizon_gallery': [None, [HorizonFace(0), GalleryFace()], [HorizonFace(1), GalleryFace()], [HorizonFace(2), GalleryFace()],
                [ArchWindowFace(), PilasterFace()], [PilasterFace(), GalleryFace(), GalleryFace()]],
    'well_shaft': [None, [StarVeinFace(), WellFace(), WellFace()], [VowNicheFace(), WellFace()],
             [ConstellationFace(), WellFace(), WellFace()]],
}
FACE_PLAN = {
    'dune_court': {'ep5_lab_f1': {'cycle': [0, 1, 2, 0, 3, 1, 4]}},
    'horizon_gallery': {'ep5_lab_f2': {'cycle': [1, 5, 4, 2, 5, 3, 4]}},
    'well_shaft': {'ep5_lab_f3': {'cycle': [0, 1, 2, 0, 3]}, 'ep5_lab_oracle': {'cycle': [3, 1, 3]}},
}
