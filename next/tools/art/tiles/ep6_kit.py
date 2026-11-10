"""Episode 6 (The Skybound Isles) terrains and wall systems -> assets/tiles/ep6.png (E6-tiles, EPISODE6_PLAN 9.1, 4.4 and
5.1). Imported by ep6.py.

The three Observatory floors look nothing alike (plan 9.1): F1 sunlit plank and glass over white cloud, F2 brass grating
over a dark shaft, F3 white stone in slate storm cloud. Cloudbank must never read as walkable (it is soft, billowing and
animated, with no edge or grain a foot could stand on, and every deck over it shows a dark lip and its own thickness), and
a lane must read as moving (a carved blue channel through the cloud, white streaks running along it, chevrons drawn by
E6-world in code).

Terrains (A2 fill unless noted; the floors stand ABOVE the void terrains, so each floor draws its own lip and front face
over the cloud):
  cloudbank      A1, 3 frames, collision void: sunlit cumulus in sky blue and peach light; the void of every open map
  storm_cloud    A1, 3 frames, collision void: the same puffs in storm slate (F3, the Eyrie's rim)
  gust_lane      A1, 3 frames, collision void: the lane bed, a sky-blue channel cut through the cloud with soft banks; the
                 direction-neutral shimmer only (the streaks that move along a cell's arrow are the `gust_streak` frames,
                 the chevrons are E6-world's code). Drawn by E6-world over cloudbank on every live lane cell.
  gust_duct      A1, 3 frames, collision void: the indoor lane bed, a brass grille over the dark shaft with wind light
                 glinting through it (F2's ducts)
  duct_shaft     collision void: F2's dark shaft (slate black, far fans glinting), the void under the grilles
  skyplank       deck planks: honey timber, brass nails, a dark lip and a 3 px plank-end front over the cloud
  skywalk        A1, 3 frames (sway): a rope bridge, slats with sky between them, rope rails on the open sides
  stormglass     pale blue glass panes in brass frames (F1's platforms; never as pale as the cloud)
  skybridge      a pale stone span, long blocks and a worn path, a thick arch front
  skyport_paving Zephyr Landing's plaza: big pale flagstones of uneven sizes, cool joints, a brass compass inlay
  relay_grate    F2: brass grating over dark, rivets, oil glints
  spire_stone    F3: white stone slabs in curved courses, pale slate joints
  sea_foam       A1, 3 frames, collision water: the sea at the Airstair's foot, surf breaking white on the basalt

Wall systems (<sys>_top band, <sys>_face 2-row inner face, <sys>_out_top the beyond, <sys>_out_face):
  causeway_rail  F1: a rope-railed timber walkway cap, a trussed bulkhead face; beyond: open cloud
  relay_hall     F2: a brass-capped slate band, slate panels with brass trim; styles with speaking tubes and lit and dark
                 relay faces; beyond: the dark
  spire          F3: white stone coping, curved stone courses (each face reads as a rounded buttress); beyond: storm
  basalt_stack   the Airstair: columnar basalt tops with turf and gull-white, black column faces; beyond: haze over the sea
"""
import math
from pxlib import Canvas, C, DARK, WHITE, rnd, h32, SH, hexc, profile1d
from autotile import EdgeSpec, full_nb
from terrain import Terrain, Water, blank
from archive_floors import FloorBase, BandTop, DeepTop, OuterFace, fade, bayer
from ep4_kit import _Face

WD = lambda i: C('wood', i)            # 2d1b1f 482826 6e3d2c 8f5533 b87942 d69c57
SA = lambda i: C('sand', i)            # ae8458 c3a57c e4cb96 f6e4b9
SW = lambda i: C('stone_warm', i)      # 2e2b4c 584951 7e6d6e a18f85 cfb89c ebdfc8
GD = lambda i: C('gold', i)            # 482826 8f5533 c38334 eba14d f9d77a fff7d6
WA = lambda i: C('water', i)           # 0e153b 1d3775 24559b 3e88ca 6ab3e4 b4e4f2
IC = lambda i: C('ice', i)             # 3e88ca 6ab3e4 b4e4f2 e8fffb
RB = lambda i: C('roof_blue', i)       # 0e153b 1d2a67 2c4797 4064b9 6891d9
MT = lambda i: C('metal', i)           # 2e2b4c 66637f b3b6c4 e2e0de f6f4ee
GR = lambda i: C('grass', i)           # 1c3730 2a532f 427330 5a9032 84ad39 b6cc58
EA = lambda i: C('earth', i)
SK = lambda i: C('skin_light', i)      # a66142 cc875b e8b585 fae2cb
FI = lambda i: C('fire', i)
INK = lambda i: C('ink', i)

# ---------------------------------------------------------------------- the colours the master palette lacks
# (reported by E6-tiles; ep6.py snaps the sheet to palette.json PLUS these). Cloud shading: the palette's pale blues are
# water and ice (saturated cyan) and its greys lean violet (stone_cool) or warm (metal), so a soft cool cloud shadow has
# nothing between #b4e4f2 and #b3b6c4; one peach for the sunlit rims (skin_light's #fae2cb is too pink against blue, and
# the next step #e8b585 is tan); a neutral storm-slate ramp (every dark in the palette is violet or ink-blue, and the storm
# must not be violet: the Episode 5 lesson); a yellow brass ramp (the gold ramp is copper-orange, and the skyport's brass
# must not read as the desert's copper).
EXTRA = ['#8d9dbb', '#b5c3da', '#d9e2ef',                    # cloud: deep shade, shade, body
         '#f7d9c0',                                          # peach light
         '#1b212c', '#283040', '#3a4457', '#58647b', '#7c889e',  # storm slate 0 (near black) .. 4
         '#6b5127', '#a17e3a', '#cfaa52', '#efd78c']         # brass 0 .. 3
CL = lambda i: hexc(EXTRA[max(0, min(2, i))])
PE = lambda i: hexc(EXTRA[3])
SL = lambda i: hexc(EXTRA[4 + max(0, min(4, i))])
BR = lambda i: hexc(EXTRA[9 + max(0, min(3, i))])
CLOUD_WHITE = MT(4)


# ====================================================================== cloud (cloudbank, storm_cloud)
# Cotton puffs on a 16-periodic torus, drawn back to front (a later puff is in front). Each puff is lit from the top left:
# a thin bright rim on its upper left (peach on the very top), the body, and its lower part sinking into a dithered shade
# where it tucks behind the puff in front. No puff has an outline (an outlined puff reads as cobblestone, which is
# walkable). The radii breathe with the frame, so the bank billows in place (it never scrolls: the lanes are the things
# that move).
PUFFS = [(4.0, 2.0, 6.5, 0.0), (13.0, 5.0, 6.0, 1.9), (7.5, 9.5, 6.8, 3.6), (0.5, 12.5, 5.6, 5.0),
         (12.0, 14.5, 6.2, 2.7)]


def _tor(a, b):
    d = (a - b) % 16
    return d - 16 if d > 8 else d


def cloud_pixel(frame, x, y, ramp):
    """ramp: (deep, shade, body, light, rim)."""
    deep, shade, body, light, rim = ramp
    px, py = x + 0.5, y + 0.5
    best = None
    for i, (cx, cy, r, ph) in enumerate(PUFFS):
        rr = r + 0.5 * math.sin(2 * math.pi * frame / 3.0 + ph)
        dx, dy = _tor(px, cx) / rr, _tor(py, cy) / rr
        d = math.hypot(dx, dy)
        if d <= 1.0:
            best = (dx, dy, d)
    if best is None:
        return shade
    dx, dy, d = best
    lit = -(dx * 0.6 + dy * 0.8)
    if d > 0.8 and lit > 0.55:
        return rim if (x + y) % 2 == 0 or lit > 0.75 else light
    if d > 0.62 and lit > 0.3:
        return light
    # the lower part: shade, dithered in (a soft fall-off, never a line)
    k = (dy - 0.25) / 0.6
    if k > bayer(x, y) * 1.15:
        return deep if (k > 0.85 and d > 0.85 and bayer(x, y) < 0.5) else shade
    return body


class CloudBank(Water):
    """Sunlit cumulus, sky blue and peach: the void of every open map. A1, 3 frames (the puffs breathe). Always the lowest
    terrain, so it fills whole cells and every floor draws its own lip and front face over it."""
    id = 'cloudbank'
    kind = 'fill'
    collision = 'void'
    RAMP = (CL(0), CL(1), CL(2), CLOUD_WHITE, PE(0))

    def __init__(self):
        Terrain.__init__(self)
        self.specs = {'all': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb')}

    def make_texture(self, frame, variant):
        t = blank(self.RAMP[2])
        for y in range(16):
            for x in range(16):
                t[y][x] = cloud_pixel(frame, x, y, self.RAMP)
        return t

    def pixel(self, c, x, y):
        return self.tex(c, x, y)


class StormCloud(CloudBank):
    """The same puffs in storm slate: F3's void and the Eyrie's rim. A faint cold glint rides one rim per frame."""
    id = 'storm_cloud'
    RAMP = (SL(0), SL(1), SL(2), SL(3), SL(4))

    def make_texture(self, frame, variant):
        t = CloudBank.make_texture(self, frame, variant)
        gx, gy = [(4, 3), (12, 9), (7, 13)][frame % 3]
        t[gy][gx] = IC(1)
        return t


# ====================================================================== the lane beds (gust_lane, gust_duct)
class GustLane(Water):
    """The lane bed: a channel of open sky cut through the cloud (deep blue at the banks, bright in the middle), soft
    rounded banks where the next cell is not a lane, a dark crease under the cloud's lip on the north bank. The shimmer
    (a few motes) does not point anywhere: the movement is the streak overlay and the chevrons, which follow each cell's
    arrow. Measured against plain cloud on the phone crop (ep6_scenes.py checks)."""
    id = 'gust_lane'
    kind = 'hole'
    collision = 'void'

    def __init__(self):
        Terrain.__init__(self)
        prof = {s: profile1d(6100 + i, amp=0.4, spikes=0) for i, s in enumerate('NSWE')}
        self.specs = {'surf': EdgeSpec({'N': 0.8, 'S': 0.8, 'W': 0.8, 'E': 0.8}, r=2.5, rr=1.5, prof=prof)}

    def make_texture(self, frame, variant):
        t = blank(WA(4))
        for i, (x, y) in enumerate(((3, 4), (11, 2), (7, 11), (14, 13), (1, 9), (9, 7))):
            k = (frame + i) % 3
            if k == 0:
                t[y][x] = IC(3)
            elif k == 1:
                t[y][x] = IC(2)
        return t

    def pixel(self, c, x, y):
        if not c.i('surf', x, y):
            return None
        d = c.f('surf', x, y)
        side = c.side('surf', x, y)
        if d < 1:
            return CL(0) if side in ('N', 'W') else CL(1)
        if d < 1.8:
            return WA(2) if side in ('N', 'W') else WA(3)
        if d < 4.0:
            # deeper toward the bank, brighter toward the middle, an ordered dither between
            k = (4.0 - d) / 2.2
            return WA(3) if k > bayer(x, y) else self.tex(c, x, y)
        return self.tex(c, x, y)


class GustDuct(Water):
    """The indoor lane bed (F2's ducts): a brass grille over the dark shaft, pale wind light glinting through the gaps.
    A brass rim where the next cell is not a duct lane."""
    id = 'gust_duct'
    kind = 'hole'
    collision = 'void'

    def __init__(self):
        Terrain.__init__(self)
        self.specs = {'surf': EdgeSpec({'N': 1.0, 'S': 1.0, 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb')}

    def make_texture(self, frame, variant):
        t = blank(SL(0))
        for y in range(16):
            for x in range(16):
                bar_v = x % 4 == 0
                bar_h = y % 8 == 0
                if bar_h:
                    c = BR(2) if x % 4 else BR(1)
                elif bar_v:
                    c = BR(1) if y % 8 != 7 else BR(0)
                else:
                    # the gap: the shaft, with wind light running through it
                    c = SL(0) if (x + y) % 3 else SL(1)
                t[y][x] = c
        for i, (x, y) in enumerate(((2, 3), (6, 5), (10, 2), (14, 6), (1, 11), (9, 13), (13, 10), (5, 14))):
            k = (frame + i) % 3
            if k == 0:
                t[y][x] = IC(1)
            elif k == 1:
                t[y][x] = WA(2)
        return t

    def pixel(self, c, x, y):
        if not c.i('surf', x, y):
            return None
        d = c.f('surf', x, y)
        if d < 1:
            return BR(0)
        if d < 2:
            return BR(3) if c.side('surf', x, y) in ('N', 'W') else BR(1)
        return self.tex(c, x, y)


class DuctShaft(FloorBase):
    """F2's dark shaft (the void under the grilles): slate black falling away, faint far fans glinting deep down."""
    id = 'duct_shaft'
    collision = 'void'
    nvariants = 4
    weights = [8, 2, 2, 1]
    edge = SL(0)

    def make_texture(self, frame, variant):
        t = blank(SL(0))
        for y in range(16):
            for x in range(16):
                if x % 8 == 3 and h32(x // 8, y // 4, 6201) % 3 == 0:
                    t[y][x] = SL(1)
                elif h32(x, y, 6202) % 53 == 0:
                    t[y][x] = SL(1)
        if variant == 1:
            for k in range(-2, 3):
                t[8 + k][8] = SL(2) if k else BR(1)
                t[8][8 + k] = SL(2) if k else BR(1)
        elif variant == 2:
            t[5][4] = IC(0)
            t[11][12] = WA(1)
        elif variant == 3:
            for x in range(3, 13):
                t[12][x] = SL(1)
        return t


# ====================================================================== platforms over the void
class Platform(Terrain):
    """A floor that floats: its texture inside a crisp lip, and on the south side (where the next cell is a lower
    terrain: cloud, shaft, storm) its own thickness drawn as a front face (`front`: colours from the top of the face
    down) and a dark underside. W and E sides get a 1 px dark edge with a lit or shaded inner line, N a lit lip."""
    kind = 'fill'
    collision = 'none'
    lip_n = None
    edge_dark = DARK
    edge_lit = None
    edge_shade = None
    front = ()
    under = DARK

    def __init__(self):
        super().__init__()
        s = len(self.front) + 1
        self.specs = {'top': EdgeSpec({'N': 1.0, 'S': float(s), 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb'),
                      'cell': EdgeSpec({'N': 1.0, 'S': 0.0, 'W': 1.0, 'E': 1.0}, r=0, rr=0, metric='cheb')}

    def front_pixel(self, k, x, y):
        return self.front[min(k, len(self.front) - 1)]

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            d = c.f('top', x, y)
            side = c.side('top', x, y)
            if d < 1:
                if side == 'N':
                    return self.lip_n or self.edge_dark
                if side == 'S':
                    return self.lip_s if getattr(self, 'lip_s', None) else self.tex(c, x, y)
                if side == 'W':
                    return self.edge_lit or self.tex(c, x, y)
                return self.edge_shade or self.tex(c, x, y)
            return self.tex(c, x, y)
        if c.i('cell', x, y):
            # the south face: below the top's boundary, inside the cell
            k = int(-c.f('top', x, y))
            if k >= len(self.front):
                return self.under
            return self.front_pixel(k, x, y)
        # outside on N/W/E: a 1 px dark outline only (the cloud shows beyond)
        if c.f('cell', x, y) > -1:
            return self.edge_dark
        return None


class SkyPlank(Platform):
    """Deck planks: honey timber laid east-west, 4 px boards with dark seams, the ends staggered, brass nails; the deck's
    front shows the plank ends and the beam under them. Variants: a coiled line, a brass cleat, a tar patch, a knot, a
    dropped feather."""
    id = 'skyplank'
    nvariants = 6
    weights = [64, 2, 2, 2, 2, 1]
    lip_n = WD(5)
    edge_dark = WD(0)
    edge_lit = WD(5)
    edge_shade = WD(2)
    lip_s = SA(2)
    front = (WD(4), WD(3), WD(1))
    under = WD(0)

    def make_texture(self, frame, variant):
        t = blank(WD(4))
        for y in range(16):
            row = y // 4
            v = y % 4
            for x in range(16):
                end = (x + row * 7) % 16
                tone = h32((x + row * 7) // 16, row, 6301) % 3
                base = [WD(4), WD(5), WD(4)][tone]
                if v == 3:
                    c = WD(2)
                elif end == 0:
                    c = WD(2)
                elif v == 0:
                    c = SA(2) if base == WD(5) else WD(5)
                else:
                    n = h32(x, y, 6302) % 19
                    c = WD(3) if n == 0 else base
                    if v == 2 and (x * 5 + row) % 7 == 0:
                        c = WD(3)
                t[y][x] = c
            for x in range(16):
                if (x + row * 7) % 16 == 2 and v == 1:
                    t[y][x] = BR(2)
                if (x + row * 7) % 16 == 13 and v == 2:
                    t[y][x] = BR(1)
        if variant == 1:        # a coiled line
            for y in range(4, 12):
                for x in range(4, 12):
                    d = math.hypot(x - 7.5, y - 7.5)
                    if 1.5 < d < 3.8 and int(d * 2) % 2 == 0:
                        t[y][x] = SA(3) if x + y < 15 else SA(1)
                    elif 1.5 < d < 3.8:
                        t[y][x] = SA(1)
        elif variant == 2:      # a brass cleat
            for x in range(5, 11):
                t[7][x] = BR(3) if x < 8 else BR(2)
                t[8][x] = BR(1)
            t[6][5] = BR(2); t[6][10] = BR(2); t[9][6] = WD(1); t[9][9] = WD(1)
        elif variant == 3:      # tar caulking patch
            for (x, y) in ((4, 9), (5, 9), (6, 9), (5, 10), (6, 10), (7, 10), (8, 10)):
                t[y][x] = WD(1)
        elif variant == 4:      # a knot
            t[6][9] = WD(2); t[6][10] = WD(2); t[5][10] = WD(3); t[7][9] = WD(3)
        elif variant == 5:      # a white feather (not the black one)
            for k in range(5):
                t[10 - k][4 + k] = CLOUD_WHITE
            t[9][4] = CL(1); t[7][6] = CL(1)
        return t


class SkyWalk(Platform):
    """A rope bridge (A1, 3 frames: the slats sway a pixel). Slats laid east-west with open sky between them (transparent:
    the cloud shows through), two rope rails along every open side with knotted posts, plank ends on the closed ones."""
    id = 'skywalk'
    edge_dark = WD(0)
    front = (WD(3), WD(1))
    under = WD(0)

    def __init__(self):
        Terrain.__init__(self)
        self.specs = {'rail': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb')}

    def make_texture(self, frame, variant):
        sway = [0, 1, 0][frame % 3]
        t = [[None] * 16 for _ in range(16)]
        for y in range(16):
            v = y % 4
            for x in range(16):
                if v == 3:
                    continue          # the gap between slats: sky
                xx = x - (sway if 3 <= x <= 12 else 0)
                tone = h32(y // 4, 6401) % 3
                c = [WD(4), WD(3), WD(4)][tone]
                if v == 0:
                    c = WD(5)
                elif v == 2:
                    c = WD(3) if tone != 1 else WD(2)
                if xx % 16 in (0, 15):
                    c = WD(2)
                t[y][x] = c
        return t

    def pixel(self, c, x, y):
        d = c.f('rail', x, y)
        side = c.side('rail', x, y)
        if side in ('W', 'E') and d < 5:
            # an open side: the dark outline, a twisted hand rope, sky, then the slats; a knotted post every 8 px
            k = int(d)
            if (y % 8) in (0, 1) and k <= 3:
                return WD(0) if k == 0 or y % 8 == 1 else (WD(4) if k == 1 else WD(3))
            if k == 0:
                return WD(0)
            if k in (1, 2):
                return SA(3) if (y + k) % 3 == 0 else (SA(2) if (y + k) % 3 == 1 else EA(3))
            if k == 3:
                return None
            return self.tex(c, x, y)
        if side in ('N', 'S') and d < 2:
            return WD(1) if d < 1 else WD(4)
        return self.tex(c, x, y)


class StormGlass(Platform):
    """Pale blue glass panes in brass frames (8 px panes, 1 px brass): each pane a pale ice blue, a shade line under its
    top frame, a bright sheen diagonal, faint cloud shapes far below in some. Gridded and framed in brass, so it never
    reads as cloud, and pale, so it never reads as water. The front is the glass's cut edge on a brass beam."""
    id = 'stormglass'
    nvariants = 4
    weights = [12, 2, 2, 1]
    lip_n = BR(3)
    edge_dark = BR(0)
    edge_lit = BR(2)
    edge_shade = BR(1)
    front = (IC(2), IC(0), BR(1), BR(0))
    under = SL(0)

    def make_texture(self, frame, variant):
        t = blank(IC(2))
        for y in range(16):
            for x in range(16):
                u, v = x % 8, y % 8
                pane = (x // 8 + 2 * (y // 8))
                if u == 7 or v == 7:
                    c = BR(1) if (u == 7 and v == 7) else BR(2)
                elif v == 0:
                    c = IC(1)
                elif u == 0:
                    c = IC(3)
                else:
                    c = IC(2)
                    if (u + v) in (6, 7) and pane in (0, 3):
                        c = IC(3)
                    if pane == 2 and 2 <= u <= 5 and 3 <= v <= 5 and (u + v) % 2 == 0:
                        c = CL(2)
                t[y][x] = c
        if variant == 1:
            for k in range(3):
                t[3 + k][10 + k] = CLOUD_WHITE
        elif variant == 2:
            for (x, y) in ((2, 3), (3, 3), (4, 4), (11, 11), (12, 11)):
                t[y][x] = CL(2)
        elif variant == 3:
            t[4][4] = BR(3)
            t[12][12] = BR(3)
        return t


class SkyportPaving(Platform):
    """Zephyr Landing's plaza: big pale flagstones of uneven sizes (warm white stone, cool blue-grey joints), a lit north
    lip on each slab; the front is the island's thick stone edge. Variants: a brass compass rose inlay, a skyflower in a
    joint, a fallen pennant, a sky puddle, a ring bolt."""
    id = 'skyport_paving'
    nvariants = 6
    weights = [64, 1, 2, 1, 2, 1]
    lip_n = CLOUD_WHITE
    edge_dark = SW(0)
    edge_lit = SW(5)
    edge_shade = SW(2)
    front = (SW(4), SW(3), SW(2), SL(1))
    under = SL(0)
    SLABS = [(0, 0, 9, 6), (9, 0, 7, 9), (0, 6, 5, 10), (5, 6, 4, 5), (9, 9, 7, 7), (5, 11, 4, 5)]

    def make_texture(self, frame, variant):
        t = blank(SW(5))
        for k, (x0, y0, w, h) in enumerate(self.SLABS):
            tone = h32(k, 6551) % 3
            base = [SA(3), SA(2), SA(3)][tone]          # warm sand-white: never the cloud's cool white
            for yy in range(h):
                for xx in range(w):
                    X, Y = (x0 + xx) % 16, (y0 + yy) % 16
                    if xx == w - 1 or yy == h - 1:
                        c = SW(3) if (xx + yy) % 3 else SW(2)
                    elif yy == 0:
                        c = SW(5)
                    elif xx == 0:
                        c = SW(5) if base == SA(3) else SA(3)
                    else:
                        c = base
                        n = h32(X, Y, 6552) % 31
                        if n == 0:
                            c = SW(4)
                        elif n == 1:
                            c = CL(2)
                    t[Y][X] = c
        if variant == 1:
            for y in range(16):
                for x in range(16):
                    d = math.hypot(x + 0.5 - 8, y + 0.5 - 8)
                    if 4.5 < d < 5.6:
                        t[y][x] = BR(2) if x + y < 16 else BR(1)
            for k in range(4):
                a = k * math.pi / 2
                for r in range(5):
                    t[int(round(7.5 + math.sin(a) * r))][int(round(7.5 + math.cos(a) * r))] = BR(3) if r < 3 else BR(2)
        elif variant == 2:
            t[7][4] = IC(2)
            t[8][3] = IC(2)
            t[8][5] = IC(2)
            t[9][4] = GR(3)
            t[8][4] = PE(0)
        elif variant == 3:
            for k in range(5):
                t[11 - k // 2][9 + k] = C('roof_red', 3) if k < 4 else C('roof_red', 2)
        elif variant == 4:
            for y in range(9, 13):
                for x in range(3, 9):
                    if math.hypot((x - 5.5) / 3.0, (y - 10.5) / 1.7) < 1.0:
                        t[y][x] = IC(1) if y < 11 else WA(4)
        elif variant == 5:
            for (x, y) in ((11, 3), (12, 3), (13, 4), (12, 5), (11, 5), (10, 4)):
                t[y][x] = MT(1)
        return t


class SkyBridge(Platform):
    """A stone span: pale warm stone in long blocks across the span, a worn darker path down the middle, wind runes cut
    at the ends; the front is the arch's thick ashlar with a dark shadow line."""
    id = 'skybridge'
    nvariants = 4
    weights = [10, 2, 2, 1]
    lip_n = SW(5)
    edge_dark = SW(0)
    edge_lit = SW(5)
    edge_shade = SW(2)
    front = (SW(4), SW(3), SW(3), SW(2), SW(1))
    under = SW(0)

    def make_texture(self, frame, variant):
        t = blank(SW(4))
        for y in range(16):
            for x in range(16):
                course = y // 8
                v = y % 8
                u = (x + course * 5) % 16
                if v == 7 or u == 15:
                    c = SW(2)
                elif v == 0:
                    c = SW(5)
                else:
                    c = SW(4)
                    if 5 <= x <= 10 and h32(x, y, 6501) % 3:
                        c = SW(3) if (x + y) % 2 else SW(4)
                    if h32(x, y, 6502) % 37 == 0:
                        c = SW(3)
                t[y][x] = c
        if variant == 1:
            for (x, y) in ((3, 3), (4, 2), (5, 3), (4, 4), (4, 5)):
                t[y][x] = SW(2)
        elif variant == 2:
            for k in range(4):
                t[11 + (k % 2)][3 + k * 2] = SW(2)
        elif variant == 3:
            t[10][12] = GR(3); t[10][13] = GR(4); t[11][12] = GR(2)
        return t


class RelayGrate(Platform):
    """F2's floor: brass grating (4 px squares, lit tops, shaded bottoms) over the dark, rivets at the crossings, oil
    glints; heavier brass bands every 8 px. Dark overall (F2 is the brass-and-dark floor)."""
    id = 'relay_grate'
    nvariants = 4
    weights = [10, 2, 2, 1]
    lip_n = BR(3)
    edge_dark = SL(0)
    edge_lit = BR(2)
    edge_shade = BR(0)
    front = (BR(1), BR(0), SL(1))
    under = SL(0)

    def make_texture(self, frame, variant):
        t = blank(SL(1))
        for y in range(16):
            for x in range(16):
                u, v = x % 4, y % 4
                if y % 8 == 0:
                    c = BR(2) if x % 8 else BR(3)
                elif y % 8 == 1:
                    c = BR(0)
                elif u == 0:
                    c = BR(1) if v < 2 else BR(0)
                elif v == 0:
                    c = BR(0)
                elif u == 1 and v == 1:
                    c = SL(2)
                else:
                    c = SL(0) if (x + y) % 2 else SL(1)
                t[y][x] = c
        for (x, y) in ((0, 0), (8, 0), (0, 8), (8, 8)):
            t[y][x] = BR(3)
        if variant == 1:
            t[5][6] = IC(0); t[6][6] = SL(3)
        elif variant == 2:
            for x in range(9, 13):
                t[11][x] = WD(1)
        elif variant == 3:
            t[13][3] = FI(2)
        return t


class SpireStone(Platform):
    """F3's white stone: big slabs in curved courses (the joints arc as if laid round the spire), pale slate joints, a
    few hairline cracks; the front is thick white ashlar with a slate underside. Under the storm tint it is still the
    lightest thing on the map, so the party's floor holds 0.22 on the phone."""
    id = 'spire_stone'
    nvariants = 5
    weights = [12, 2, 2, 2, 1]
    lip_n = CLOUD_WHITE
    edge_dark = SL(1)
    edge_lit = CLOUD_WHITE
    edge_shade = CL(1)
    front = (MT(3), CL(2), CL(1), CL(0), SL(2))
    under = SL(0)

    def make_texture(self, frame, variant):
        t = blank(MT(3))
        for y in range(16):
            for x in range(16):
                arc = (y + int(round(1.4 * math.cos((x - 8) * math.pi / 16.0)))) % 8
                seg = (x + (y // 8) * 6) % 16
                if arc == 7 or seg == 0:
                    c = CL(1)
                elif arc == 0:
                    c = CLOUD_WHITE
                else:
                    c = MT(3) if h32(x, y, 6601) % 7 else CL(2)
                t[y][x] = c
        if variant == 1:
            for (x, y) in ((4, 3), (5, 4), (5, 5), (6, 6)):
                t[y][x] = CL(0)
        elif variant == 2:
            for x in range(6, 11):
                t[10][x] = CL(1)
            t[9][8] = CL(1)
        elif variant == 3:       # a lightning scorch
            for (x, y) in ((9, 4), (10, 5), (9, 6), (10, 7)):
                t[y][x] = SL(3)
        elif variant == 4:       # an inlaid brass compass point
            t[7][8] = BR(3); t[8][7] = BR(2); t[8][9] = BR(2); t[9][8] = BR(1); t[8][8] = BR(3)
        return t


class SeaFoam(Water):
    """The sea at the Airstair's foot (A1, 3 frames, collision water): daylit blue-green swell with white surf breaking
    on whatever it meets (a foam band inside the water's edge)."""
    id = 'sea_foam'
    kind = 'hole'
    collision = 'water'

    def __init__(self):
        Terrain.__init__(self)
        prof = {s: profile1d(6700 + i, amp=0.9, spikes=0) for i, s in enumerate('NSWE')}
        self.specs = {'surf': EdgeSpec({'N': 1.0, 'S': 1.0, 'W': 1.0, 'E': 1.0}, r=3.0, rr=2.0, prof=prof)}

    def make_texture(self, frame, variant):
        t = blank(WA(3))
        for (x, y, L) in ((1, 3, 7), (9, 8, 6), (4, 13, 6)):
            for k in range(L):
                t[y][(x + k + frame) % 16] = WA(2)
            for k in range(1, L - 1):
                t[y - 1][(x + k + frame) % 16] = WA(4)
        for i, (x, y) in enumerate(((13, 2), (2, 9), (11, 14))):
            if (frame + i) % 3 != 2:
                t[y][(x + frame) % 16] = IC(3)
        return t

    def pixel(self, c, x, y):
        if not c.i('surf', x, y):
            return None
        d = c.f('surf', x, y)
        ph = (x + y + c.frame * 2) % 5
        if d < 1.2:
            return CLOUD_WHITE if ph else IC(3)
        if d < 2.6:
            return IC(3) if (ph + int(d)) % 2 else IC(2)
        if d < 3.6 and ph < 2:
            return IC(2)
        return self.tex(c, x, y)


# ====================================================================== wall bands
class CausewayTop(BandTop):
    """F1 band: a timber walkway cap, two thick rail beams with a rope run between them and knotted rope posts."""
    id = 'causeway_rail_top'
    seed = 6810
    weights = [7, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(WD(4))
        for y in range(16):
            for x in range(16):
                v = y % 8
                if v in (0, 1):
                    c = WD(5) if v == 0 else WD(4)
                elif v in (2,):
                    c = WD(2)
                elif v in (3, 4):
                    c = SA(2) if (x + v) % 3 else SA(1)
                elif v == 5:
                    c = WD(3)
                else:
                    c = WD(4) if v == 6 else WD(2)
                if x % 16 == 7 and v != 3 and v != 4:
                    c = WD(1)
                t[y][x] = c
        if variant == 1:
            t[3][4] = BR(3); t[4][4] = BR(2)
        elif variant == 2:
            for x in range(9, 13):
                t[11][x] = CLOUD_WHITE if x % 2 else CL(1)
        elif variant == 3:
            t[12][2] = BR(2)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [WD(5), WD(4), WD(2), WD(1)][min(3, int(d))]
        if side == 'N':
            return WD(0) if d < 1 else WD(2)
        if side == 'W':
            return WD(1) if d < 1 else WD(5)
        return WD(0) if d < 1 else WD(2)


class RelayTop(BandTop):
    """F2 band: dark slate plates capped with a brass rail along the front, rivet rows, a pipe run along the back."""
    id = 'relay_hall_top'
    seed = 6820
    weights = [7, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(SL(2))
        for y in range(16):
            for x in range(16):
                v = y % 8
                c = SL(2) if (x // 8 + y // 8) % 2 == 0 else SL(1)
                if v == 7 or x % 8 == 7:
                    c = SL(0)
                elif v == 0 or x % 8 == 0:
                    c = SL(3)
                if v == 2 and x % 4 == 2:
                    c = BR(2)
                t[y][x] = c
        if variant == 1:
            for x in range(16):
                t[4][x] = BR(1); t[5][x] = BR(2) if x % 5 else BR(3)
        elif variant == 2:
            t[11][11] = FI(3); t[11][12] = FI(4)
        elif variant == 3:
            for y in range(9, 14):
                t[y][4] = BR(1)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [BR(3), BR(2), BR(1), SL(0)][min(3, int(d))]
        if side == 'N':
            return SL(0) if d < 1 else SL(1)
        if side == 'W':
            return SL(0) if d < 1 else SL(3)
        return SL(0) if d < 1 else SL(1)


class SpireTop(BandTop):
    """F3 band: the spire's coping in pale slate granite (a step darker than the white floor, so the spire stands up from
    the landing), white stone lips, slate joints."""
    id = 'spire_top'
    seed = 6830
    weights = [8, 2, 2, 1]

    def make_texture(self, frame, variant):
        t = blank(CL(1))
        for y in range(16):
            for x in range(16):
                v = y % 8
                u = (x + (y // 8) * 8) % 16
                if v == 7 or u == 15:
                    c = SL(3)
                elif v == 0:
                    c = CL(2)
                else:
                    c = CL(1) if h32(x, y, 6831) % 7 else CL(0)
                t[y][x] = c
        if variant == 1:
            for (x, y) in ((5, 4), (6, 5), (7, 5)):
                t[y][x] = SL(3)
        elif variant == 2:
            t[11][9] = BR(3)
            t[11][10] = BR(2)
        elif variant == 3:
            for x in range(3, 8):
                t[3][x] = SL(4)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [CLOUD_WHITE, MT(3), CL(1), SL(3)][min(3, int(d))]
        if side == 'N':
            return SL(1) if d < 1 else SL(3)
        if side == 'W':
            return SL(2) if d < 1 else CL(2)
        return SL(1) if d < 1 else CL(0)


class BasaltTop(BandTop):
    """The Airstair's band: the tops of basalt columns (hexagonal caps, dark blue-black with lit edges), sea turf in the
    joints and gull white on a few caps."""
    id = 'basalt_stack_top'
    seed = 6840
    weights = [8, 3, 2, 2]

    def make_texture(self, frame, variant):
        t = blank(SL(1))
        for y in range(16):
            for x in range(16):
                # a hex-ish cap pattern: offset rows of 8 x 6 cells
                row = y // 6
                xx = (x + (row % 2) * 4) % 8
                yy = y % 6
                if yy == 5 or xx == 7:
                    c = SL(0)
                elif yy == 0 or xx == 0:
                    c = SL(3)
                else:
                    c = SL(2) if (x // 8 + row) % 2 else SL(1)
                t[y][x] = c
        if variant == 1:
            for (x, y) in ((3, 5), (4, 5), (4, 4), (11, 11), (12, 11)):
                t[y][x] = GR(3) if y % 2 else GR(4)
        elif variant == 2:
            for (x, y) in ((9, 2), (10, 3), (9, 3)):
                t[y][x] = CLOUD_WHITE
        elif variant == 3:
            for (x, y) in ((2, 12), (3, 12), (3, 13), (13, 4)):
                t[y][x] = GR(2)
        return t

    def rim(self, side, d, x, y):
        if side == 'S':
            return [SL(4), SL(3), SL(1), SL(0)][min(3, int(d))]
        if side == 'N':
            return SL(0) if d < 1 else GR(2)
        if side == 'W':
            return SL(0) if d < 1 else SL(3)
        return SL(0) if d < 1 else SL(1)


# ====================================================================== the beyond
class CausewayDeep(DeepTop):
    """Beyond F1's walls: open cloud (still: the frame-0 cloudbank), never black."""
    id = 'causeway_rail_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(CL(2))
        for y in range(16):
            for x in range(16):
                t[y][x] = cloud_pixel(variant % 3, x, y, CloudBank.RAMP)
        return t


class RelayDeep(DeepTop):
    """Beyond F2's walls: the dark, a pipe glinting brass now and then."""
    id = 'relay_hall_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(SL(0))
        if variant == 1:
            for x in range(16):
                t[7][x] = SL(1)
            t[7][5] = BR(0)
        elif variant == 2:
            for y in range(16):
                t[y][9] = SL(1)
        elif variant == 3:
            t[4][4] = BR(0)
        elif variant == 4:
            t[12][10] = SL(2)
        return t


class SpireDeep(DeepTop):
    """Beyond F3's walls: the storm (frame-0 storm cloud)."""
    id = 'spire_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(SL(2))
        for y in range(16):
            for x in range(16):
                t[y][x] = cloud_pixel(variant % 3, x, y, StormCloud.RAMP)
        return t


class BasaltDeep(DeepTop):
    """Beyond the Airstair's band: haze over the sea far below, sky blue with soft cloud wisps."""
    id = 'basalt_stack_out_top'
    weights = [8, 2, 2, 2, 1, 1]

    def make_texture(self, frame, variant):
        t = blank(WA(4))
        for y in range(16):
            for x in range(16):
                ph = (y + int(round(1.2 * math.sin((x + variant) * math.pi / 8.0)))) % 8
                t[y][x] = IC(2) if ph == 0 else (WA(4) if ph != 4 else IC(1))
        if variant in (1, 2):
            for x in range(3 + variant, 12):
                t[6 + variant * 2][x] = CL(2)
        return t


# ====================================================================== faces
class CausewayFace(_Face):
    """F1 face: a trussed timber bulkhead hung over the cloud: a beam cap, vertical boards, a diagonal brace in every
    tile, rope lashings at the joints, the bottom beam."""
    edge_l = WD(2)
    edge_r = WD(1)

    def at(self, u, Y):
        if Y <= 2:
            return [WD(1), WD(5), WD(4)][Y]
        if Y == 3:
            return WD(1)
        if Y >= 29:
            return [WD(3), WD(2), WD(1)][Y - 29]
        # the brace: from bottom-left to top-right of the tile
        if abs((u) - (28 - Y) * 0.6) < 1.0 and 4 < Y < 28:
            return WD(4) if (u + Y) % 2 else WD(3)
        if u % 8 == 7:
            return WD(1)
        if u % 8 == 0:
            return WD(4)
        if Y in (15, 16) and u % 8 in (1, 2):
            return SA(2) if Y == 15 else SA(1)
        return WD(3) if (u // 8 + Y // 8) % 2 else WD(2)


class PennantFace(CausewayFace):
    """F1 style: a ragged pennant on a pole against the bulkhead."""
    def at(self, u, Y):
        if u == 3 and 5 <= Y <= 28:
            return MT(2) if Y % 4 else MT(1)
        if 4 <= u <= 13 and 6 <= Y <= 12 and (u - 4) < 12 - (Y - 6) - (2 if u > 10 and Y % 3 == 0 else 0):
            return [C('roof_red', 3), C('roof_red', 4)][(u + Y) % 2] if Y < 10 else C('roof_red', 2)
        return CausewayFace.at(self, u, Y)


class ChimeFace(CausewayFace):
    """F1 style: wind chimes tied silent on a peg (black thread round the tubes)."""
    def at(self, u, Y):
        if Y == 6 and 3 <= u <= 12:
            return BR(1)
        for k, tx in enumerate((4, 7, 10, 12)):
            if u == tx and 7 <= Y <= 14 + k * 2:
                return BR(3) if Y < 10 else BR(2)
        if Y == 12 and 3 <= u <= 13:
            return DARK
        return CausewayFace.at(self, u, Y)


class PortholeFace(CausewayFace):
    """F1 style: a round brass porthole with sky in it."""
    def at(self, u, Y):
        d = math.hypot(u - 7.5, Y - 15.5)
        if d < 4.2:
            return IC(2) if (u + Y) % 5 else IC(3)
        if d < 5.5:
            return BR(2) if u + Y < 23 else BR(1)
        if d < 6.3:
            return BR(0)
        return CausewayFace.at(self, u, Y)


def slate_panel(u, Y):
    """F2 panel: slate plates 8 wide with brass trim strips every 12 rows, rivets."""
    if Y % 12 == 0:
        return BR(2)
    if Y % 12 == 1:
        return BR(0)
    if u % 8 == 7:
        return SL(0)
    if u % 8 == 0:
        return SL(3)
    if Y % 12 == 6 and u % 8 == 3:
        return BR(1)
    return SL(2) if (u // 8) % 2 == 0 else SL(1)


class RelayFace(_Face):
    """F2 face: a brass cornice, slate panels with brass trim, a skirting of dark grille."""
    edge_l = SL(1)
    edge_r = SL(0)

    def at(self, u, Y):
        if Y <= 3:
            return [SL(0), BR(3), BR(2), BR(0)][Y]
        if Y >= 27:
            return BR(1) if Y == 27 else (SL(0) if u % 3 == 0 else SL(1))
        return slate_panel(u, Y)


class SpeakingTubeFace(RelayFace):
    """F2 style: two brass speaking tubes coming out of the wall, flared horn mouths."""
    def at(self, u, Y):
        for (cx, top) in ((4, 6), (11, 10)):
            if abs(u - cx) <= 1 and top <= Y <= 26:
                return BR(3) if u == cx - 1 else (BR(2) if u == cx else BR(1))
            if top - 3 <= Y < top and abs(u - cx) <= (top - Y) + 1:
                if abs(u - cx) == (top - Y) + 1:
                    return BR(0)
                return SL(0) if abs(u - cx) <= (top - Y) - 1 else BR(2)
        return RelayFace.at(self, u, Y)


class RelayLitFace(RelayFace):
    """F2 style: a relay cabinet, its three dials lit amber (a live relay)."""
    lit = True

    def at(self, u, Y):
        if 2 <= u <= 13 and 6 <= Y <= 24:
            if u in (2, 13) or Y in (6, 24):
                return BR(0)
            for k, dy in enumerate((10, 15, 20)):
                d = math.hypot(u - 7.5, Y - dy)
                if d < 2.3:
                    if self.lit:
                        return GD(4) if d < 1.2 else FI(3)
                    return SL(0) if d < 1.2 else SL(1)
                if d < 3.0:
                    return BR(2)
            return SL(3) if u < 4 else SL(2)
        return RelayFace.at(self, u, Y)


class RelayDarkFace(RelayLitFace):
    """F2 style: a dead relay cabinet, its dials dark."""
    lit = False


class StoneCurveFace(_Face):
    """F3 face: white stone courses on a curve: each tile shades like a rounded buttress (lit left, a slate shadow at the
    right), course lines arcing; a slate foot where the storm laps."""
    edge_l = SL(2)
    edge_r = SL(1)

    def at(self, u, Y):
        if Y <= 3:
            return [SL(1), CLOUD_WHITE, MT(3), CL(1)][Y]
        if Y >= 29:
            return [CL(0), SL(3), SL(2)][Y - 29]
        arc = (Y + int(round(1.6 * math.cos((u - 7.5) * math.pi / 15.0)))) % 7
        if arc == 0:
            return CL(1)
        shade = u / 15.0
        if shade < 0.2:
            return CLOUD_WHITE
        if shade < 0.65:
            return MT(3)
        if shade < 0.85:
            return CL(2)
        return CL(1)


class LampNicheFace(StoneCurveFace):
    """F3 style: a lamp niche (dark until lit: drawn dark; the signal lamps are objects)."""
    def at(self, u, Y):
        if 4 <= u <= 11 and 8 <= Y <= 22:
            arch = Y < 12 and math.hypot(u - 7.5, Y - 12) > 3.8
            if not arch:
                if u in (4, 11) or Y == 22:
                    return CL(0)
                return SL(1) if Y > 12 else SL(0)
        return StoneCurveFace.at(self, u, Y)


class WindScriptFace(StoneCurveFace):
    """F3 style: a band of the Wind Script cut into the stone (curling strokes, never letters)."""
    def at(self, u, Y):
        if 12 <= Y <= 18:
            if Y in (12, 18):
                return CL(1)
            s = (u + (Y - 12) * 2) % 6
            if s == 0 or (Y == 15 and u % 4 == 1):
                return SL(3)
        return StoneCurveFace.at(self, u, Y)


class ScarFace(StoneCurveFace):
    """F3 style: a lightning scar down the stone, scorched slate along it."""
    def at(self, u, Y):
        path = 7 + int(round(2.5 * math.sin(Y * 0.55)))
        if abs(u - path) == 0 and 4 < Y < 29:
            return SL(0)
        if abs(u - path) == 1 and 4 < Y < 29:
            return SL(3)
        return StoneCurveFace.at(self, u, Y)


def basalt_column(u, Y):
    """Columnar basalt: 4 px columns, lit left edge, shaded right, a horizontal crack every so often."""
    col = u // 4
    k = u % 4
    crack = (Y + h32(col, 6851) % 9) % 11 == 0
    if crack:
        return SL(0)
    if k == 0:
        return SL(3)
    if k == 3:
        return SL(0)
    return SL(2) if (col % 2 == 0) else SL(1)


class BasaltFace(_Face):
    """The Airstair face: black basalt columns, a turf lip at the top, wet dark at the foot."""
    edge_l = SL(1)
    edge_r = SL(0)

    def at(self, u, Y):
        if Y == 0:
            return GR(2)
        if Y == 1:
            return GR(3) if u % 3 else GR(2)
        if Y == 2:
            return SL(4) if u % 4 == 1 else SL(3)
        if Y >= 29:
            return SL(0) if (u + Y) % 2 else SL(1)
        return basalt_column(u, Y)


class BoltedFace(BasaltFace):
    """Airstair style: an iron bracket bolted into the columns (where the rope stairs hang)."""
    def at(self, u, Y):
        if 9 <= Y <= 11 and 2 <= u <= 13:
            return MT(2) if Y == 9 else MT(1)
        if (u, Y) in ((3, 12), (12, 12), (3, 13), (12, 13)):
            return MT(0)
        if Y in (10,) and u in (4, 8, 12):
            return MT(3)
        return BasaltFace.at(self, u, Y)


class RopeCoilFace(BasaltFace):
    """Airstair style: a coil of rope hung on a peg."""
    def at(self, u, Y):
        d = math.hypot(u - 7.5, (Y - 16) * 1.2)
        if 2.0 < d < 5.0:
            return SA(2) if int(d * 2 + u * 0.3) % 2 else SA(1)
        if (u, Y) in ((7, 10), (8, 10)):
            return WD(1)
        return BasaltFace.at(self, u, Y)


class SprayFace(BasaltFace):
    """Airstair style: the foot of the stack, spray-wet and barnacled."""
    def at(self, u, Y):
        if Y >= 20 and h32(u, Y, 6861) % 4 == 0:
            return CL(1) if Y < 26 else IC(2)
        if Y >= 22 and (u + Y) % 5 == 0:
            return SL(4)
        return BasaltFace.at(self, u, Y)


# ====================================================================== outer faces
class CausewayOut(OuterFace):
    """Under F1's band: the truss struts falling into cloud (fading to cloud, never black)."""
    shadow_line = WD(0)
    edge_dark = WD(1)

    def at(self, x, Y):
        if Y == 0:
            return WD(0)
        if 1 <= Y <= 3:
            return [WD(4), WD(3), WD(1)][Y - 1]
        t = max(0.0, (Y - 6) / 20.0)
        if fade(x, Y, t):
            return cloud_pixel(0, x, Y, CloudBank.RAMP)
        return CausewayFace().at(x % 16, Y + 4)

    def material(self, x, Y):
        return CausewayFace().at(x % 16, Y)


class RelayOut(OuterFace):
    shadow_line = SL(0)
    edge_dark = SL(0)

    def material(self, x, Y):
        if 1 <= Y <= 3:
            return [BR(2), BR(0), SL(1)][Y - 1]
        return slate_panel(x % 16, Y + 6)


class SpireOut(OuterFace):
    """Under F3's band: white stone dissolving into the storm."""
    shadow_line = SL(1)
    edge_dark = SL(1)

    def at(self, x, Y):
        if Y == 0:
            return SL(1)
        t = max(0.0, (Y - 5) / 22.0) ** 0.85
        if fade(x, Y, t):
            return cloud_pixel(0, x, Y, StormCloud.RAMP)
        return StoneCurveFace().at(x % 16, Y + 2)

    def material(self, x, Y):
        return StoneCurveFace().at(x % 16, Y)


class BasaltOut(OuterFace):
    """Under the Airstair band: columns falling into blue haze."""
    shadow_line = SL(0)
    edge_dark = SL(0)

    def at(self, x, Y):
        if Y == 0:
            return SL(0)
        t = max(0.0, (Y - 6) / 22.0)
        if fade(x, Y, t):
            return WA(4) if (x + Y) % 5 else IC(1)
        return basalt_column(x % 16, Y + 3)

    def material(self, x, Y):
        return basalt_column(x % 16, Y)


FLOORS = [DuctShaft(), SkyPlank(), StormGlass(), SkyBridge(), SkyportPaving(), RelayGrate(), SpireStone()]
VOIDS = [CloudBank(), StormCloud()]                 # A1, lowest of all
ANIMATED = [SkyWalk(), GustLane(), GustDuct(), SeaFoam()]
WALLS = [
    ('causeway_rail', CausewayTop(), CausewayFace(), CausewayDeep(), CausewayOut()),
    ('relay_hall', RelayTop(), RelayFace(), RelayDeep(), RelayOut()),
    ('spire', SpireTop(), StoneCurveFace(), SpireDeep(), SpireOut()),
    ('basalt_stack', BasaltTop(), BasaltFace(), BasaltDeep(), BasaltOut()),
]
FACE_STYLES = {
    'causeway_rail': [None, [PennantFace(), CausewayFace()], [ChimeFace(), CausewayFace(), CausewayFace()],
                      [PortholeFace(), CausewayFace()]],
    'relay_hall': [None, [SpeakingTubeFace(), RelayFace()], [RelayLitFace(), RelayFace()], [RelayDarkFace(), RelayFace()],
                   [SpeakingTubeFace(), RelayDarkFace(), RelayFace()]],
    'spire': [None, [LampNicheFace(), StoneCurveFace(), StoneCurveFace()], [WindScriptFace(), StoneCurveFace()],
              [ScarFace(), StoneCurveFace(), StoneCurveFace()]],
    'basalt_stack': [None, [BoltedFace(), BasaltFace(), BasaltFace(), BasaltFace()],
                     [RopeCoilFace(), BasaltFace(), BasaltFace(), BasaltFace(), BasaltFace()],
                     [SprayFace(), BasaltFace(), SprayFace()]],
}
FACE_PLAN = {
    'causeway_rail': {'ep6_obs_f1': {'cycle': [0, 1, 0, 2, 3, 0, 2]}},
    'relay_hall': {'ep6_obs_f2': {'cycle': [1, 2, 0, 3, 4, 2, 0]}},
    'spire': {'ep6_obs_f3': {'cycle': [0, 1, 2, 0, 3, 1]}, 'ep6_obs_eyrie': {'cycle': [2, 0, 2, 3]}},
    'basalt_stack': {'ep6_airstair': {'cycle': [0, 1, 0, 2, 0, 3]}},
}
