"""The wide-map kits (EXPANSION1_PLAN 4.12, 4.13, 10.1): the High Moor and Larchhill must not read as green valley copies.

Terrains (all palette recolours of the valley's own autotile classes, so every edge case already composes):
  x1_moor_turf     dull olive moor grass: one step darker and cooler than the valley's meadow, dry straw blades, stones
  x1_heath         heather and bilberry blobs (a recoloured tall grass): dark purple, mauve and a pink bloom
  x1_tarn          the black tarn (A1, 3 frames): ink-black still water with a pale lip, the valley river's bank
  x1_orchard_turf  Larchhill's late-summer grass: golden green, straw, clover and fallen petals
  x1_pond_bed      the drained millpond: cracked mud, silt, a stranded weed (walkable fill with a sunken lip)
Walls:
  x1_crag          grey granite crags under a moor-turf cap (the valley's cliff system, cooled)
  x1_terrace       Larchhill's honey drystone retaining walls under an orchard-turf cap (the cliff system, warmed)
Tiles: x1_terrace_stairs_{top,mid,bot} and the 2-wide halves, x1_wall_honey_* (wall_stone_* warmed),
       x1_aqueduct_{n,s,arch}_{l,m,r} (the stone bridge, honey, on the ridge)
"""
import math
from pxlib import Canvas, C, DARK, WHITE, rnd, h32, SH, profile1d, hexc
from autotile import EdgeSpec, build_a2, full_nb
from terrain import Terrain, Grass, TallGrass, Water, blank, stamp_in, scatter, stamp_wrap
import cliffs

K = lambda i: C('stone_cool', i)
SW = lambda i: C('stone_warm', i)
G = lambda i: C('grass', i)
RG = lambda i: C('roof_green', i)
FD = lambda i: C('foliage_dark', i)
IK = lambda i: C('ink', i)
EA = lambda i: C('earth', i)
PA = lambda i: C('path', i)
SA = lambda i: C('sand', i)
HV = lambda i: C('hair_violet', i)
RP = lambda i: C('roof_purple', i)
BL = lambda i: C('blossom', i)
WA = lambda i: C('water', i)
ICE = lambda i: C('ice', i)
GD = lambda i: C('gold', i)
WD = lambda i: C('wood', i)
MT = lambda i: C('metal', i)
FI = lambda i: C('fire', i)
RR = lambda i: C('roof_red', i)


def ramp_map(src, dst):
    """{(r, g, b): colour} sending each step of ramp `src` to the same step (or the given colour) of `dst`."""
    out = {}
    for i, h in enumerate(__import__('pxlib').RAMPS[src]):
        c = hexc(h)
        out[c[:3]] = dst[i] if isinstance(dst, (list, tuple)) and not isinstance(dst[0], int) else dst
    return out


def cmap(pairs):
    return {tuple(a[:3]): b for a, b in pairs}


def recolor(cv, table):
    a = cv.a
    for y in range(cv.h):
        for x in range(cv.w):
            p = a[y, x]
            if p[3] != 255:
                continue
            c = table.get((int(p[0]), int(p[1]), int(p[2])))
            if c is not None:
                a[y, x] = c
    return cv


class Recolor(Terrain):
    """A terrain that is another terrain's render passed through a colour table, with an optional per-tile hook."""

    def __init__(self, inner, new_id, table, post=None, kind=None, collision=None, nvariants=None, weights=None, frames=None):
        super().__init__()
        self.inner = inner
        self.id = new_id
        self.table = table
        self.post = post
        self.kind = kind or inner.kind
        self.collision = collision or inner.collision
        self.nvariants = nvariants or inner.nvariants
        self.weights = weights or list(getattr(inner, 'weights', [4] + [2] * (self.nvariants - 1)))
        self.frames = frames or inner.frames
        self.specs = inner.specs

    def tile(self, nb, frame=0, variant=0):
        cv = self.inner.tile(nb, frame, variant if variant < self.inner.nvariants else 0)
        recolor(cv, self.table)
        if self.post:
            self.post(cv, nb, frame, variant)
        return cv


def _full(nb):
    return all(nb.values())


# ====================================================================== moor turf
# the valley's grass ramp  (1c3730 2a532f 427330 5a9032 84ad39 b6cc58) one step down, dry straw for the highlights
MOOR = cmap([(G(0), FD(1)), (G(1), FD(1)), (G(2), G(1)), (G(3), G(2)), (G(4), G(3)), (G(5), PA(3))])


def moor_base(cv):
    """Duller than the valley: the mapped body colour is broken up with dark turf, peat brown and pale dead grass on a
    16 px period (absolute tile coordinates, so it joins across every edge piece)."""
    body = G(2)
    for y in range(16):
        for x in range(16):
            if cv.get(x, y) != body:
                continue
            n = h32(x, y, 8101) % 48
            if n < 6:
                cv.set(x, y, G(1))
            elif n < 7:
                cv.set(x, y, PA(1))


def moor_post(cv, nb, frame, variant):
    moor_base(cv)
    if not _full(nb):
        return
    # a dry straw blade or two on the quiet base, a pale stone or a bracken frond on the variants
    if variant == 0:
        for (x, y) in ((5, 3), (12, 10)):
            cv.set(x, y, PA(2))
            cv.set(x, y + 1, PA(1))
    elif variant == 1:
        stamp_in_cv(cv, ['.l.', 'lhl', 'd.d'], 4, 5, {'l': PA(1), 'h': PA(3), 'd': FD(1)})
    elif variant == 2:
        # a grey stone half sunk in the turf
        stamp_in_cv(cv, ['.aab.', 'abbcd', '.ddd.'], 5, 8, {'a': K(4), 'b': K(3), 'c': K(2), 'd': FD(0)})
        cv.set(7, 7, K(5))
    elif variant == 3:
        for (x, y) in ((3, 4), (4, 4), (4, 5), (10, 10), (11, 10), (11, 11)):
            cv.set(x, y, G(1))
    elif variant == 4:
        stamp_in_cv(cv, ['..h..', '.lhl.', 'lmhml', '.dmd.'], 6, 4, {'h': PA(3), 'l': G(3), 'm': G(2), 'd': FD(1)})
    elif variant == 5:
        for (x, y) in ((4, 11), (10, 5), (13, 12)):
            cv.set(x, y, PA(2))
            cv.set(x + 1, y + 1, PA(1))


def stamp_in_cv(cv, rows, x, y, cm):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            c = cm.get(ch)
            if c is not None and 0 <= x + i < 16 and 0 <= y + j < 16:
                cv.set(x + i, y + j, c)


# ====================================================================== heath
HEATH = cmap([(G(0), HV(0)), (G(1), HV(1)), (G(2), SW(1)), (G(3), RP(2)), (G(4), SW(2)), (G(5), C('cloth_purple', 5))])
BRACKEN = cmap([(G(0), EA(0)), (G(1), EA(1)), (G(2), EA(2)), (G(3), EA(3)), (G(4), PA(2)), (G(5), PA(3))])
PEAT = cmap([(G(0), EA(0)), (G(1), EA(0)), (G(2), EA(1)), (G(3), EA(1)), (G(4), EA(2)), (G(5), EA(3))])


def heath_post(cv, nb, frame, variant):
    if not _full(nb):
        return
    # pink bell-heather blooms scattered through the clumps
    for (x, y) in (((3, 6), (11, 3), (8, 12), (14, 9)) if variant == 0 else ((5, 4), (12, 7), (2, 12))):
        cv.set(x, y, BL(1))
        cv.set(x + 1, y, RP(2))


def bracken_post(cv, nb, frame, variant):
    if not _full(nb):
        return
    for (x, y) in (((4, 5), (12, 9), (8, 13)) if variant == 0 else ((10, 3), (3, 10))):
        cv.set(x, y, FI(1))
        cv.set(x + 1, y + 1, RR(2))


def peat_post(cv, nb, frame, variant):
    if not _full(nb):
        return
    # wet peat: a few black pools with a cold glint, and pale cotton-grass
    if variant in (0, 2):
        for (x, y) in ((4, 6), (5, 6), (10, 11), (11, 11)):
            cv.set(x, y, IK(1))
            cv.set(x, y + 1, IK(2) if x % 2 else IK(1))
    if variant in (1, 3):
        for (x, y) in ((6, 4), (11, 9)):
            cv.set(x, y, MT(4))
            cv.set(x, y + 1, SA(2))
    if variant in (0, 4):
        cv.set(9, 8, WA(3))


# ====================================================================== orchard turf
ORCHARD = cmap([(G(0), G(1)), (G(1), G(2)), (G(2), G(3)), (G(3), G(4)), (G(4), G(5)), (G(5), SA(2))])


def orchard_base(cv):
    body = G(4)
    for y in range(16):
        for x in range(16):
            if cv.get(x, y) != body:
                continue
            n = h32(x, y, 8111) % 16
            if n < 3:
                cv.set(x, y, G(5))
            elif n < 4:
                cv.set(x, y, SA(2))
            elif n < 6:
                cv.set(x, y, G(3))


def orchard_post(cv, nb, frame, variant):
    orchard_base(cv)
    if not _full(nb):
        return
    if variant == 0:
        for (x, y) in ((5, 4), (12, 11)):
            cv.set(x, y, SA(2))
            cv.set(x, y + 1, SA(1))
    elif variant == 1:
        # clover and a fallen blossom
        stamp_in_cv(cv, ['.a.', 'aba', '.a.'], 4, 8, {'a': G(2), 'b': G(3)})
        cv.set(11, 4, BL(3))
        cv.set(12, 4, BL(2))
    elif variant == 2:
        for (x, y) in ((3, 3), (9, 9), (13, 5)):
            cv.set(x, y, GD(4))                 # a dandelion
            cv.set(x, y + 1, G(2))
    elif variant == 3:
        for (x, y) in ((6, 6), (7, 6), (7, 7), (11, 12), (12, 12)):
            cv.set(x, y, SA(2))
    elif variant == 4:
        cv.set(4, 4, BL(3))
        cv.set(10, 10, BL(3))
        cv.set(5, 11, GD(4))
    elif variant == 5:
        for (x, y) in ((4, 11), (10, 5)):
            cv.set(x, y, G(5))
            cv.set(x + 1, y + 1, G(1))


# ====================================================================== the drained pond bed
class PondBed(Terrain):
    """The drained millpond (an A2 fill, walkable): cracked silt in plates, a grey bloom of dried weed, a stranded
    reed. Its edge is the sunken lip of the bank: a pale lit rim north and west, a dark drop south and east."""
    id = 'x1_pond_bed'
    kind = 'fill'
    nvariants = 6
    weights = [16, 3, 3, 2, 2, 2]

    def __init__(self):
        super().__init__()
        prof = {s: profile1d(8200 + i, amp=0.9, spikes=2, spike_amp=0.9) for i, s in enumerate('NSWE')}
        self.specs = {'top': EdgeSpec({'N': 1.6, 'S': 2.4, 'W': 1.6, 'E': 2.0}, r=2.4, rr=1.5, prof=prof)}
        from terrain import voronoi16
        self.lab = voronoi16(8201, 3, 3, jitter=0.95, sx=1.0, sy=1.0)

    def make_texture(self, frame, variant):
        t = blank(PA(1))
        lab = self.lab
        for y in range(16):
            for x in range(16):
                L = lab[y][x]
                edge = lab[y][(x + 1) % 16] != L or lab[(y + 1) % 16][x] != L
                if edge:
                    t[y][x] = EA(2) if (x + y) % 3 else EA(1)
                else:
                    tone = [PA(1), PA(2), PA(1), EA(4)][L % 4]
                    up = lab[(y - 1) % 16][x] != L
                    t[y][x] = PA(3) if (up and tone == PA(1)) else tone
        for y in range(16):
            for x in range(16):
                n = h32(x, y, 8202) % 37
                if n == 0 and t[y][x] not in (EA(1), EA(2)):
                    t[y][x] = PA(3)
        if variant == 1:
            # a stranded weed clump: grey-green blades lying flat
            for (x, y, c) in ((4, 8, RG(2)), (5, 8, RG(3)), (6, 7, RG(2)), (7, 7, K(3)), (8, 8, RG(2)), (5, 9, RG(1)), (9, 9, K(2))):
                t[y][x] = c
        elif variant == 2:
            # a small puddle left in a hollow
            for y in range(16):
                for x in range(16):
                    d = ((x - 8) / 3.8) ** 2 + ((y - 9) / 2.2) ** 2
                    if d < 1:
                        t[y][x] = WA(1) if d < 0.55 else IK(2)
            t[8][7] = WA(3)
            t[9][9] = WA(2)
        elif variant == 3:
            # a dead reed stub
            for k in range(5):
                t[5 + k][8] = WD(2) if k % 2 else WD(3)
            t[4][8] = PA(3)
            t[10][8] = EA(1)
            t[10][9] = EA(1)
        elif variant == 4:
            # shells and a pale fish bone
            for (x, y, c) in ((5, 6, SA(2)), (6, 6, SA(3)), (9, 10, SA(2)), (10, 10, SA(1))):
                t[y][x] = c
            for k in range(5):
                t[8][3 + k * 2 // 1 % 13] = MT(3) if k % 2 == 0 else EA(1)
        elif variant == 5:
            for (x, y) in ((3, 4), (4, 5), (5, 5), (6, 6), (7, 6), (8, 7)):
                t[y][x] = EA(0)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            d = c.f('top', x, y)
            s = c.side('top', x, y)
            if d < 1:
                return PA(3) if s in ('N', 'W') else EA(0)
            if d < 2 and s in ('N', 'W'):
                return EA(2) if (x + y) % 2 else PA(0)
            return self.tex(c, x, y)
        if c.f('top', x, y) > -1.0 and (c.i('top', x - 1, y) or c.i('top', x, y - 1)):
            return SH(70)
        return None


# ====================================================================== the tarn
TARN = cmap([(WA(0), DARK), (WA(1), DARK), (WA(2), IK(1)), (WA(3), IK(1)), (WA(4), IK(2)), (WA(5), K(4)),
             (ICE(3), K(5))])


def make_tarn():
    class _T(Water):
        pass
    inner = Water()

    dark_set = {DARK, IK(1), IK(2), IK(3), IK(4)}

    def post(cv, nb, frame, variant):
        # sparkles in open water are not foam: pull them back to a faint ink glint (foam sits against a bank or the edge)
        for y in range(16):
            for x in range(16):
                if cv.get(x, y) in (K(4), K(5)):
                    around = [cv.get(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
                    if all(a in dark_set for a in around):
                        cv.set(x, y, IK(4) if (x + y + frame) % 2 else IK(3))
        # a few cold glints on the black water; frame-shifted so they twinkle
        for i, (x, y) in enumerate(((3, 4), (11, 9), (6, 13))):
            if (frame + i) % 3 == 0 and cv.get(x, y) in (IK(1), IK(2), DARK):
                cv.set(x, y, IK(4))
    t = Recolor(inner, 'x1_tarn', TARN, post=post, kind='hole', collision='water', nvariants=1, frames=3)
    return t


# ====================================================================== crags and terraces
CRAG = cmap([(G(0), FD(1)), (G(1), FD(1)), (G(2), G(1)), (G(3), G(2)), (G(4), G(3)), (G(5), PA(3)),
             (SW(0), K(0)), (SW(1), K(1)), (SW(2), K(2)), (SW(3), K(3)), (SW(4), K(4)), (SW(5), K(5))])
# honey drystone: warm browns for the stone, golden grass for the cap
HONEY_STONE = [(SW(0), EA(2)), (SW(1), EA(3)), (SW(2), EA(4)), (SW(3), PA(3)), (SW(4), PA(4)), (SW(5), SA(3))]
TERRACE = cmap([(G(0), G(1)), (G(1), G(2)), (G(2), G(3)), (G(3), G(4)), (G(4), G(5)), (G(5), SA(2))] + HONEY_STONE)
HONEY = cmap(HONEY_STONE + [(C('earth', 0), EA(0))])


def _sw(i):
    return SW(i)


def drystone_tex():
    """Irregular flat stones in dry courses: wide, shallow cells, a lit top edge, a dark joint (stone_warm steps, recoloured honey)."""
    from terrain import voronoi16
    lab = voronoi16(8320, 2, 3, jitter=0.8, sx=1.0, sy=1.45)
    t = [[SW(3)] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            L = lab[y][x]
            edge_r = lab[y][(x + 1) % 16] != L
            edge_b = lab[(y + 1) % 16][x] != L
            up = lab[(y - 1) % 16][x] != L
            tone = [SW(3), SW(2), SW(3), SW(4), SW(2), SW(3)][L % 6]
            if edge_r or edge_b:
                c = SW(1)
            elif up:
                c = SW(4) if tone != SW(4) else SW(5)
            else:
                c = tone
                n = h32(x, y, 8321) % 17
                if n == 0:
                    c = SW(4)
                elif n == 1:
                    c = SW(2)
            t[y][x] = c
    return t


def drystone_tex_old():
    """16 x 16 periodic drystone in stone_warm steps (recoloured honey): four courses (5 + 3 + 4 + 4 px), stones of 4 to 9 px,
    a lit top edge, a dark joint, an occasional through-stone sticking out."""
    t = [[SW(3)] * 16 for _ in range(16)]
    courses = [(0, 5, [7, 9]), (5, 3, [5, 6, 5]), (8, 4, [9, 7]), (12, 4, [4, 8, 4])]
    for ci, (y0, hgt, lens) in enumerate(courses):
        x0 = (ci * 5) % 16
        for si, ln in enumerate(lens):
            tone = [SW(3), SW(2), SW(3), SW(4)][(ci + si * 2) % 4]
            for yy in range(hgt):
                for xx in range(ln):
                    X, Y = (x0 + xx) % 16, y0 + yy
                    c = tone
                    if yy == 0:
                        c = SW(4) if tone != SW(4) else SW(5)
                    elif yy == hgt - 1:
                        c = SW(1)
                    elif xx == ln - 1:
                        c = SW(1)
                    elif xx == 0:
                        c = SW(4) if tone == SW(3) else tone
                    elif h32(X, Y, 8301) % 13 == 0:
                        c = SW(2) if tone != SW(2) else SW(3)
                    t[Y][X] = c
            x0 += ln
    return t


def granite_tex():
    """16 x 16 periodic angular granite: big flat blocks (2 x 2 jittered cells), lit top-left, dark crevices."""
    from terrain import voronoi16
    lab = voronoi16(8310, 2, 3, jitter=0.9, sx=1.0, sy=1.3)
    t = [[SW(3)] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            L = lab[y][x]
            edge_r = lab[y][(x + 1) % 16] != L
            edge_b = lab[(y + 1) % 16][x] != L
            up = lab[(y - 1) % 16][x] != L
            lf = lab[y][(x - 1) % 16] != L
            tone = [SW(3), SW(2), SW(3), SW(2), SW(2), SW(3)][L % 6]
            if edge_r or edge_b:
                c = SW(1)
            elif up or lf:
                c = SW(4) if tone == SW(3) else SW(3)
            else:
                c = tone
                n = h32(x, y, 8311) % 17
                if n == 0:
                    c = SW(4)
                elif n == 1:
                    c = SW(2)
            t[y][x] = c
    return t


class CragFace(cliffs.CliffFace):
    """The valley's own cliff face (the plan says the crags are the cliff system), cooled to grey and a step darker."""
    pass


class TerraceFace(cliffs.CliffFace):
    """Drystone retaining wall: courses of stones, a lit top edge, grass hanging over the coping."""

    def __init__(self):
        self.tex = drystone_tex()


def wall_system(sys_id, face_cls, table, cap_id):
    cliffs.ROCK_TEX = cliffs.bulge_rock(1612 if sys_id == 'x1_crag' else 1613, 7)
    top = cliffs.CliffTop()
    face = face_cls()
    tb = top.block()
    recolor(tb, table)
    fb = face.block()
    recolor(fb, table)
    var = []
    for v in range(top.nvariants):
        vt = top.variant_tile(v)
        recolor(vt, table)
        if sys_id == 'x1_crag':
            moor_post(vt, full_nb(), 0, v)
        else:
            orchard_post(vt, full_nb(), 0, v)
        var.append(vt)
    return tb, fb, var, list(top.weights)


# ====================================================================== sheet assembly
def build_into(sh):
    terr = sh.meta.setdefault('terrains', {})
    walls = sh.meta.setdefault('walls', {})
    # --- fill terrains
    grass = Grass()
    tall = TallGrass()
    for t in (Recolor(grass, 'x1_moor_turf', MOOR, post=moor_post),
              Recolor(grass, 'x1_peat', PEAT, post=peat_post),
              Recolor(tall, 'x1_heath', HEATH, post=heath_post),
              Recolor(tall, 'x1_bracken', BRACKEN, post=bracken_post),
              Recolor(grass, 'x1_orchard_turf', ORCHARD, post=orchard_post),
              PondBed()):
        x, y = sh.alloc(32, 48)
        sh.cv.paste(t.block(), x, y)
        m = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A2', 'kind': 'fill', 'collision': 'none', 'variants': [],
             'variantWeights': list(t.weights)}
        for v in range(t.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(t.variant_tile(v), vx, vy)
            m['variants'].append([vx, vy])
        terr[t.id] = m
    # --- the tarn (A1)
    tarn = make_tarn()
    x, y = sh.alloc(96, 48)
    for fr in range(3):
        sh.cv.paste(tarn.block(fr), x + fr * 32, y)
    terr['x1_tarn'] = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A1', 'kind': 'hole', 'collision': 'water',
                       'reflect': True, 'anim': {'frames': [0, 1, 2, 1], 'frameDx': 32, 'ms': 520}, 'variants': []}
    sh.newline()
    # --- crag and terrace wall systems (a cliff system: grass-capped top + rock face)
    for sys_id, face_cls, table, note in (
            ('x1_crag', CragFace, CRAG, 'High Moor crags: grey granite under a moor-turf cap (legend ids x1_crag_top / x1_crag_face)'),
            ('x1_terrace', TerraceFace, TERRACE, 'Larchhill terrace walls: honey drystone under an orchard-turf cap (x1_terrace_top / x1_terrace_face)')):
        tb, fb, var, weights = wall_system(sys_id, face_cls, table, sys_id)
        tx, ty = sh.alloc(32, 48)
        sh.cv.paste(tb, tx, ty)
        fx, fy = sh.alloc(32, 48)
        sh.cv.paste(fb, fx, fy)
        tv = []
        for vt in var:
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(vt, vx, vy)
            tv.append([vx, vy])
        walls[sys_id] = {'top': [tx, ty], 'face': [fx, fy], 'collision': 'solid', 'topVariants': tv,
                         'topVariantWeights': weights, 'note': note + '; faces sit directly below the top'}
        sh.newline()
    # --- terrace stairs (1 wide and the 2-wide halves) and the honey wall chunks
    tiles = sh.meta.setdefault('tiles', {})
    for kind in ('top', 'mid', 'bot'):
        for half in (None, 'l', 'r'):
            tid = 'x1_terrace_stairs_%s' % kind if half is None else 'x1_terrace_stairs2_%s_%s' % (kind, half)
            cv = cliffs.stairs_tile(kind, half)
            recolor(cv, TERRACE)
            x, y = sh.alloc(16, 16)
            sh.cv.paste(cv, x, y)
            tiles[tid] = {'x': x, 'y': y, 'w': 16, 'h': 16, 'collision': 'none'}
    sh.newline()
    import kit
    ch = kit.wall_chunk('stone')
    recolor(ch, HONEY)
    for ri, r in enumerate(('top', 'bot')):
        for ci, c in enumerate(('l', 'm', 'r')):
            x, y = sh.alloc(16, 16)
            sh.cv.paste(ch.crop(ci * 16, ri * 16, 16, 16), x, y)
            tiles['x1_wall_honey_%s_%s' % (r, c)] = {'x': x, 'y': y, 'w': 16, 'h': 16, 'collision': 'solid'}
    sh.newline()
    # --- the aqueduct on the ridge: the stone bridge, honey, with the arches open to the orchard below
    bs = kit.bridge_stone_h()
    recolor(bs, HONEY)
    for ri, r in enumerate(('n', 's', 'arch')):
        for ci, c in enumerate(('l', 'm', 'r')):
            x, y = sh.alloc(16, 16)
            sh.cv.paste(kit.cut(bs, ci, ri), x, y)
            tiles['x1_aqueduct_%s_%s' % (r, c)] = {'x': x, 'y': y, 'w': 16, 'h': 16,
                                                  'collision': 'solid' if r == 'arch' else 'none'}
    sh.newline()
