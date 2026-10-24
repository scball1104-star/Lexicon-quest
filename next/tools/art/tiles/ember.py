"""Emberpeak (Episode 3): the iron and ash town kit, the Old Sand Road props and the far silhouette -> ember.png
(E3-tiles, EPISODE3_PLAN 4.1, 4.2 and 9.1).

Emberpeak is Willowmere in an iron-and-ash palette swap, like the Hollow was a silverglass swap: the same prefab
builders (prefabs.py, bld.py), then every honey stone / plaster colour is moved to slag brick (a dark red-brown brick
that reads against the grey ash ground), roofs are iron plate (stone_cool slate), wood stays wood (doors and frames
are the warm accent), windows glow.

Terrains   ash_ground (outdoor, A2 over nothing, like grass), cinder_path (A2, like dirt)
Modular    roof_iron_*, wall_slag_* (top/bot l m r), chimney_iron
Prefabs    inn_coal, shop_vent, smithy_ember (frames = three smoke puffs, `anim`), bellhouse, house_ember_a/b,
           bell_tower_ember (frames: 0 silent, 1..2 ringing; `ringAnim`), shelter_ruin, foundry_gate_closed/_open
Props      ember_pit (anim), coolant_station, memorial (+ overlays), proclamation_board, charred_pine, charred_stump,
           bench_iron, sand_milestone, carters_fire (anim), cart_penny, lamp_ember (anim)
Overlays   ash_drift_a/b/c (translucent floor drifts), memorial_plate_{flat,soft}[_lettered], furnace_glow (frames:
           bright, dim), splash is in forge.png
Decal      emberpeak_far (128 x 96 silhouette for the overhead layer)
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc
import bld
import prefabs
from prefabs import house, draw_wall, finish_shadow, stone_steps, tower_body, cornice, spire
from kit import Sheet, roof_chunk, cut
from terrain import Terrain, EdgeSpec, blank, stamp_in, stamp_wrap, scatter, profile1d, P as _P
from court_props import put_frames, ellipse, glow, strip

SW = lambda i: C('stone_warm', i)
K = lambda i: C('stone_cool', i)
RR = lambda i: C('roof_red', i)
FI = lambda i: C('fire', i)
GD = lambda i: C('gold', i)
WD = lambda i: C('wood', i)
MT = lambda i: C('metal', i)
WA = lambda i: C('water', i)
SD = lambda i: C('shadow', i)
OUT = K(0)

# ---------------------------------------------------------------------- the slag-brick swap (stone_warm -> brick)
_SWAP = {
    '#584951': RR(0), '#7e6d6e': RR(1), '#a18f85': RR(2), '#cfb89c': RR(3), '#ebdfc8': FI(2),
}
SWAP = {hexc(k)[:3]: v for k, v in _SWAP.items()}


def swap(cv, extra=None):
    table = dict(SWAP)
    if extra:
        table.update(extra)
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


# ====================================================================== terrains


class AshGround(Terrain):
    """Outdoor ash: a warm grey with cool drifts, sparse cinder flecks and the odd dying ember. Edges follow the grass
    (light on the north lip, dark on the south)."""
    id = 'ash_ground'
    nvariants = 6
    weights = [5, 3, 2, 2, 1, 2]

    def __init__(self):
        super().__init__()
        prof = {'N': profile1d(701, amp=0.7, spikes=3, spike_amp=1.3),
                'S': profile1d(702, amp=0.6, spikes=3, spike_amp=1.2),
                'W': profile1d(703, amp=0.6, spikes=2, spike_amp=1.0),
                'E': profile1d(704, amp=0.6, spikes=2, spike_amp=1.0)}
        self.specs = {
            'top': EdgeSpec({'N': 2.2, 'S': 3.4, 'W': 2.2, 'E': 2.6}, r=3.5, rr=1.5, prof=prof),
            'lip': EdgeSpec({'N': 2.2, 'S': 1.6, 'W': 2.2, 'E': 2.6}, r=3.5, rr=1.5, prof=prof),
        }

    def make_texture(self, frame, variant):
        base, lo, hi, cool = SW(2), SW(1), SW(3), K(3)
        t = blank(base)
        for y in range(16):
            for x in range(16):
                n = rnd(x // 3, y // 2, 711) * 0.6 + rnd(x, y, 712) * 0.4
                if n > 0.8 and (x + y) % 2 == 0:
                    t[y][x] = hi
                elif n < 0.14 and (x + y) % 2 == 1:
                    t[y][x] = lo
        for (x, y) in scatter(713, 3, 5):
            t[y][x] = lo
            t[y][(x + 1) % 16] = lo
        if variant == 1:        # a cinder cluster
            stamp_in(t, ['.dd.', 'dkdd', '.dd.'], 5, 6, {'d': lo, 'k': K(1)})
        elif variant == 2:      # a pale ash drift
            for y in range(4, 11):
                for x in range(3, 13):
                    dx, dy = (x - 8) / 5.0, (y - 7) / 3.2
                    if dx * dx + dy * dy + (rnd(x, y, 714) - 0.5) * 0.4 < 0.8 and (x + y) % 2 == 0:
                        t[y][x] = hi
            t[7][8] = SW(4)
        elif variant == 3:      # a dying ember in the ash
            stamp_in(t, ['.r.', 'rfr', '.r.'], 7, 7, {'r': RR(1), 'f': FI(1)})
            t[5][4] = lo
        elif variant == 4:      # a cool soot streak
            for i in range(10):
                t[4 + i // 2][3 + i] = cool
                if i % 2 == 0:
                    t[5 + i // 2][3 + i] = lo
        elif variant == 5:      # small stones
            stamp_in(t, ['lm', 'md'], 4, 4, {'l': hi, 'm': base, 'd': lo})
            stamp_in(t, ['lm', 'md'], 10, 10, {'l': hi, 'm': base, 'd': lo})
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            col = self.tex(c, x, y)
            if not c.i('top', x, y + 1):
                return SW(0) if False else K(2)
            if not c.i('top', x, y - 1):
                return SW(4)
            if not c.i('top', x + 1, y):
                return SW(1)
            if not c.i('top', x - 1, y):
                return SW(3) if y % 2 == 0 else col
            return col
        if c.i('lip', x, y):
            if c.i('top', x, y - 1):
                return SD(0)
            return SH(84)
        if c.i('top', x - 1, y) or c.i('top', x - 1, y - 1):
            return SH(56)
        return None


class CinderPath(Terrain):
    """The carters' road: packed dark clinker, a dull red-brown, wheel ruts and glassy cinder chips. Dark outline."""
    id = 'cinder_path'
    nvariants = 4

    def __init__(self):
        super().__init__()
        prof = {s: profile1d(750 + i, amp=1.0, spikes=1, spike_amp=0.8) for i, s in enumerate('NSWE')}
        self.specs = {'top': EdgeSpec({'N': 1.6, 'S': 1.6, 'W': 1.6, 'E': 1.6}, r=3.0, rr=2.0, prof=prof)}

    def make_texture(self, frame, variant):
        base, lo, hi = RR(1), RR(0), RR(2)
        t = blank(base)
        for y in range(16):
            for x in range(16):
                n = rnd(x // 4, y // 4, 761) * 0.6 + rnd(x, y, 762) * 0.4
                if n > 0.78 and (x + y) % 2 == 0:
                    t[y][x] = hi
                elif n < 0.16 and (x + y) % 2 == 1:
                    t[y][x] = lo
        chips = {'l': K(3), 'm': K(2), 'd': K(1)}
        for (x, y) in scatter(763, 3, 6):
            stamp_wrap(t, ['lm', 'md'] if (x + y) % 2 else ['l.', 'md'], x, y, chips)
        for (x, y) in scatter(764, 4, 4):
            t[y][x] = lo
        if variant == 1:
            stamp_in(t, ['.lm.', 'lmmd', '.dd.'], 6, 6, chips)
        elif variant == 2:      # cart ruts
            for i, (x, y) in enumerate([(3, 9), (4, 9), (5, 8), (6, 8), (7, 8), (8, 7), (9, 7), (10, 7)]):
                t[y][x] = lo
                if i % 2 == 0:
                    t[y + 1][x] = hi
        elif variant == 3:
            stamp_in(t, ['l.', 'md'], 4, 4, chips)
            stamp_in(t, ['lm', 'md'], 10, 9, chips)
            t[12][8] = FI(1)
        return t

    def pixel(self, c, x, y):
        if c.i('top', x, y):
            col = self.tex(c, x, y)
            if not c.i('top', x, y - 1) or not c.i('top', x - 1, y):
                return RR(0)
            if not c.i('top', x, y + 1) or not c.i('top', x + 1, y):
                return RR(0)
            return col
        if (c.i('top', x, y - 1) or c.i('top', x, y + 1) or c.i('top', x - 1, y) or c.i('top', x + 1, y)) \
                and (x + y) % 2 == 0:
            return RR(0)
        return None


# ====================================================================== prefabs (Willowmere builders, swapped)
IRON = 'stone_cool'


def _brick_houses():
    """Patch prefabs.draw_wall so wall='timber' asks come out as stone (slag brick); restored by the caller."""
    orig = prefabs.draw_wall

    def patched(cv, wall, *a, **k):
        return orig(cv, 'stone' if wall == 'timber' else wall, *a, **k)
    prefabs.draw_wall = patched
    return orig


def lantern_pair(cv, g):
    x0, y1 = g['wall_x0'], g['wall_y1']
    bld.wall_lantern(cv, x0 + 47, y1 - 30)
    bld.wall_lantern(cv, x0 + 78, y1 - 30)


def pipe_run(cv, x, y0, y1, ramp_hi=3):
    """A brass-banded iron pipe running down a wall."""
    for y in range(y0, y1):
        cv.set(x, y, K(4)); cv.set(x + 1, y, K(3)); cv.set(x + 2, y, K(1))
        if y % 9 == 4:
            for k in range(-1, 4):
                cv.set(x + k, y, GD(3)); cv.set(x + k, y + 1, GD(1))


def inn_coal():
    def ext(cv, g):
        x0, y1 = g['wall_x0'], g['wall_y1']
        bld.hanging_sign(cv, x0 + 28, y1 - 33, 'mug', w=13, h=10)
        lantern_pair(cv, g)
    orig = _brick_houses()
    try:
        cv, meta = house(8, 3, 3, IRON, style='slate', hip=4, seed=113, wall='stone',
                         door={'x': 54, 'w': 20, 'h': 27, 'double': True, 'arch': True},
                         windows=[{'x': 10, 'y': 30, 'w': 12, 'h': 10, 'lit': True, 'shutters': 'roof_red'},
                                  {'x': 96, 'y': 30, 'w': 12, 'h': 10, 'lit': True, 'shutters': 'roof_red'},
                                  {'x': 10, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_red'},
                                  {'x': 36, 'y': 8, 'w': 10, 'h': 10, 'lit': False, 'shutters': 'roof_red'},
                                  {'x': 82, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_red'},
                                  {'x': 104, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_red'}],
                         chimney=(102, 10, True), gable={'cx': 67, 'half': 18, 'window_kind': 'round'},
                         timber=[], extras=ext, depth=3)
    finally:
        prefabs.draw_wall = orig
    return swap(cv), meta


def shop_vent():
    def ext(cv, g):
        x0, y0, y1 = g['wall_x0'], g['wall_y0'], g['wall_y1']
        bld.window(cv, x0 + 6, y0 + 12, 24, 11, lit=True, mullion=False)
        for i, col in enumerate(['roof_red', 'magic_cyan', 'gold', 'ice', 'cloth_purple', 'roof_red']):
            px = x0 + 9 + i * 3
            cv.set(px, y0 + 18, C(col, 3)); cv.set(px, y0 + 19, C(col, 2)); cv.set(px, y0 + 17, C('ice', 2))
        for xx in range(22):
            cv.set(x0 + 7 + xx, y0 + 20, WD(2))
        bld.awning(cv, x0 + 3, y0 + 5, 30, 'roof_red')
        pipe_run(cv, x0 + 41, y0 + 6, y1 - 2)
        pipe_run(cv, x0 + 47, y0 + 6, y1 - 2) if False else None
        # a round pressure gauge on the wall
        for yy in range(-3, 4):
            for xx in range(-3, 4):
                if xx * xx + yy * yy <= 9:
                    cv.set(x0 + 37 + xx, y0 + 13 + yy, MT(3) if xx * xx + yy * yy > 5 else MT(4))
        cv.set(x0 + 37, y0 + 13, FI(2)); cv.set(x0 + 38, y0 + 12, FI(2))
        bld.hanging_sign(cv, x0 + 3, y0 + 26, 'potion', w=11, h=10) if False else None
        prefabs.goods_crate(cv, x0 + 5, y1 - 9, 'roof_red')
        prefabs.goods_crate(cv, x0 + 17, y1 - 9, 'gold')
        bld.hanging_sign(cv, x0 + 36, y0 + 30, 'potion', w=11, h=10)
    orig = _brick_houses()
    try:
        cv, meta = house(5, 3, 2, IRON, style='slate', hip=4, seed=117, wall='stone',
                         door={'x': 52, 'w': 11, 'h': 18}, extras=ext, chimney=(8, 6), timber=[])
    finally:
        prefabs.draw_wall = orig
    return swap(cv), meta


def smithy_ember_frame(f):
    """The Emberpeak Weaponsmith (Garrick's old forge). f = 0..2: three smoke puffs rising from the chimney."""
    orig_chim = bld.chimney
    prefabs_orig = prefabs.draw_wall
    cv, meta = prefabs.smithy()
    # smoke frames: puffs above the chimney (chimney x 10..17, cap at y about 9)
    for k in range(4):
        t = (f * 4 + k * 3) % 12
        y = 8 - t
        x = 14 + int(round(math.sin(t * 0.7 + k) * 1.5)) + t // 5
        if y < 0:
            continue
        r = 1 + t // 5
        for dy in range(-r, r + 1):
            for dx in range(-r - 1, r + 2):
                if dx * dx + dy * dy * 2 <= (r + 1) ** 2:
                    cv.put(x + dx, y + dy, (MT(3)[0], MT(3)[1], MT(3)[2], 170 - t * 11))
    return swap(cv), meta


def smithy_ember():
    frames = []
    meta = None
    for f in range(3):
        cv, m = smithy_ember_frame(f)
        frames.append(cv)
        meta = m
    return frames, meta


def bellhouse():
    """The Bell House: a squat brick hall with a bell cote on the roof ridge and a big arched double door."""
    def pre(cv, g):
        pass

    def ext(cv, g):
        x0, y1 = g['wall_x0'], g['wall_y1']
        bld.wall_lantern(cv, x0 + 24, y1 - 30)
        bld.wall_lantern(cv, x0 + 66, y1 - 30)
        # the bell cote on the ridge: two posts, a little iron roof, a bronze bell
        cx = g['bw'] // 2
        ry = g['roof_y']
        for dx in (-7, 6):
            for y in range(ry - 22, ry + 6):
                cv.set(cx + dx, y, K(2)); cv.set(cx + dx + 1, y, K(1))
        for x in range(cx - 8, cx + 9):
            cv.set(x, ry - 23, K(4)); cv.set(x, ry - 22, K(2))
        for k in range(8):
            for x in range(cx - 8 + k, cx + 9 - k):
                cv.set(x, ry - 31 + k, K(3) if x < cx else K(2))
            cv.set(cx - 8 + k, ry - 31 + k, K(1))
        cv.set(cx, ry - 33, GD(4))
        bell(cv, cx, ry - 21, 6, ringing=0)
    orig = _brick_houses()
    try:
        cv, meta = house(6, 3, 2, IRON, style='slate', hip=4, seed=121, wall='stone', top=3,
                         door={'x': 38, 'w': 20, 'h': 27, 'double': True, 'arch': True},
                         windows=[{'x': 9, 'y': 12, 'w': 8, 'h': 14, 'lit': True, 'arch': True, 'frame': 'stone',
                                   'mullion': False},
                                  {'x': 71, 'y': 12, 'w': 8, 'h': 14, 'lit': True, 'arch': True, 'frame': 'stone',
                                   'mullion': False}],
                         chimney=None, timber=[], extras=ext)
    finally:
        prefabs.draw_wall = orig
    return swap(cv), meta


def house_ember_a():
    def ext(cv, g):
        pipe_run(cv, g['wall_x0'] + 3, g['wall_y0'] + 4, g['wall_y1'] - 2)
    orig = _brick_houses()
    try:
        cv, meta = house(4, 2, 2, IRON, style='slate', hip=3, seed=131, wall='stone',
                         door={'x': 9, 'w': 10, 'h': 17},
                         windows=[{'x': 35, 'y': 9, 'w': 10, 'h': 9, 'lit': True, 'shutters': 'roof_red'}],
                         chimney=(44, 6, True), timber=[], extras=ext)
    finally:
        prefabs.draw_wall = orig
    return swap(cv), meta


def house_ember_b():
    def ext(cv, g):
        bld.wall_lantern(cv, g['wall_x0'] + 36, g['wall_y1'] - 28)
    orig = _brick_houses()
    try:
        cv, meta = house(5, 3, 2, IRON, style='slate', hip=4, seed=137, wall='stone',
                         door={'x': 12, 'w': 10, 'h': 18},
                         windows=[{'x': 44, 'y': 10, 'w': 10, 'h': 10, 'lit': False, 'shutters': 'roof_red'}],
                         chimney=(55, 8, True), timber=[], gable={'cx': 48, 'half': 12, 'window_kind': 'small'},
                         extras=ext)
    finally:
        prefabs.draw_wall = orig
    return swap(cv), meta


# ---------------------------------------------------------------------- the First Bell and its tower
def bell(cv, cx, top, hw, ringing=0, big=False):
    """A bronze bell hanging from (cx, top). hw = half width of the lip. ringing -1/0/1 swings the lip sideways."""
    h = hw * 2 + 3
    for y in range(h):
        t = y / h
        half = 1 + (hw - 1) * (t ** 1.7) * 1.0
        if y >= h - 3:
            half = hw + (1 if y == h - 2 else 0)
        sh = int(round(ringing * (y / h) * 3.5))
        for x in range(int(round(-half)), int(round(half)) + 1):
            col = GD(3)
            if x < -half * 0.35:
                col = GD(4)
            if x > half * 0.45:
                col = GD(1)
            if y == h - 2:
                col = GD(1) if x > 0 else GD(2)
            if y == h - 1:
                col = GD(0)
            if abs(x) >= int(round(half)) and y < h - 3:
                col = GD(0) if x > 0 else GD(2)
            cv.set(cx + x + sh, top + y, col)
    cv.set(cx - hw // 2 + int(round(ringing * 0.3 * 3.5)), top + h // 2, GD(5))
    cv.set(cx, top - 1, K(2)); cv.set(cx, top - 2, K(3))                       # yoke
    cv.hline(cx - 3, cx + 3, top - 3, WD(1))
    # clapper
    cv.set(cx + int(round(ringing * 4)), top + h, K(3))
    cv.set(cx + int(round(ringing * 4)), top + h + 1, K(2))


def bell_tower_ember(state):
    """state 0 silent (the bell hangs still and dull), 1 and 2 ringing (the bell swung left / right, gold sound
    arcs, the arches lit). 6 x 10 tiles: a brick tower, an open belfry with the First Bell, an iron spire."""
    W, H = 6 * 16, 10 * 16
    cv = Canvas(W, H)
    tx0, tx1, ty0 = 7, 71, 52
    tower_body(cv, tx0, tx1, ty0, H, 'stone_warm', seed=141)
    cornice(cv, tx0, tx1, ty0, 'stone_warm')
    # the belfry: one great arched opening
    bx0, bx1, by0, by1 = tx0 + 12, tx1 - 12, ty0 + 5, ty0 + 40
    for y in range(by0, by1):
        for x in range(bx0, bx1):
            dx = (x + 0.5 - (bx0 + bx1) / 2) / ((bx1 - bx0) / 2)
            if y < by0 + 14 and (dx * dx + ((y - by0 - 14) / 14.0) ** 2) > 1.0:
                continue
            ringing = state != 0
            cv.set(x, y, DARK if not ringing else (RR(0) if y > by0 + 12 and (x + y) % 3 == 0 else DARK))
    # arch stones
    for x in range(bx0 - 2, bx1 + 2):
        dx = (x + 0.5 - (bx0 + bx1) / 2) / ((bx1 - bx0) / 2 + 2)
        if abs(dx) <= 1:
            y = by0 + 14 - int(round(math.sqrt(max(0.0, 1 - dx * dx)) * 16)) - 1
            cv.set(x, y, SW(4)); cv.set(x, y - 1, SW(1))
    for y in range(by0 + 12, by1 + 1):
        cv.set(bx0 - 2, y, SW(4)); cv.set(bx0 - 1, y, SW(2))
        cv.set(bx1, y, SW(1)); cv.set(bx1 + 1, y, SW(2))
    # the beam and the bell
    cx = (bx0 + bx1) // 2
    for x in range(bx0, bx1):
        cv.set(x, by0 + 10, WD(3)); cv.set(x, by0 + 11, WD(1))
    sw = {0: 0, 1: -1, 2: 1}[state]
    bell(cv, cx, by0 + 12, 9, ringing=sw, big=True)
    if state:
        # sound arcs: gold brackets either side, brighter on the swing side
        for k, (r, a) in enumerate(((14, 230), (19, 170), (24, 110))):
            for t in range(-9, 10):
                if abs(t) < 3:
                    continue
                y = by0 + 22 + t * 2 // 3
                xl, xr = cx - r + abs(t) // 4, cx + r - abs(t) // 4
                cv.put(xl, y, glow(FI(4), a)); cv.put(xr, y, glow(FI(4), a))
    # sills and lower windows
    cv.hline(bx0 - 2, bx1 + 1, by1, SW(4)); cv.hline(bx0 - 2, bx1 + 1, by1 + 1, SW(1))
    for wy in (ty0 + 58, ty0 + 76):
        bld.window(cv, tx0 + 27, wy, 6, 11, lit=False, arch=True, frame='stone', mullion=False)
    # door
    bld.door(cv, tx0 + 22, H - 30, w=20, h=26, arch=True, double=True, frame='stone')
    stone_steps(cv, tx0 + 20, H - 4, 24, n=1)
    # an iron spire
    spire(cv, (tx0 + tx1) // 2, 2, ty0 - 1, 36, IRON)
    finish_shadow(cv, H - 32, H - 1)
    swap(cv)
    door_tx = (tx0 + 22 + 10) // 16
    fp = [[dx, dy] for dx in range(0, 5) for dy in range(-3, 1) if not (dx == door_tx and dy == 0)]
    meta = {'rect_wh': [W, H], 'anchor': [0, 9], 'footprint': fp, 'overheadRows': 6,
            'doorAt': [door_tx, 0], 'collision': 'solid'}
    return cv, meta


# ---------------------------------------------------------------------- the foundry gate in the mountain face
def foundry_gate(opn):
    """64 x 64 gate cut into the mountain: a rough rock arch, an iron lintel with a furnace-red glow slit, double iron
    doors. Open: the lift car waits in a lit shaft."""
    cv = Canvas(64, 64)
    # rock surround (cool grey, dark)
    for y in range(64):
        for x in range(64):
            n = h32(x // 2, y // 2, 811) % 7
            c = K(1) if n > 1 else K(2)
            if n == 0:
                c = K(3)
            if x in (0, 63) or y == 0:
                c = K(0)
            cv.set(x, y, c)
    # lintel
    blk = lambda x0, y0, x1, y1, hi, mid, lo: [cv.set(x, y, OUT if x in (x0, x1) or y in (y0, y1) else
                                                   (hi if (y == y0 + 1 or x == x0 + 1) else (lo if (y == y1 - 1 or x == x1 - 1) else mid)))
                                               for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    blk(6, 4, 57, 14, MT(2), K(3), K(1))
    for x in range(10, 54, 8):
        cv.set(x, 8, MT(3)); cv.set(x + 1, 8, MT(3))
    # a glow slit in the lintel (dims after restoration: separate decal), here only the dark slit
    cv.rect(18, 10, 28, 2, RR(0))
    # jambs
    blk(6, 14, 15, 63, K(4), K(2), K(0))
    blk(48, 14, 57, 63, K(4), K(2), K(0))
    for y in range(18, 62, 8):
        cv.set(10, y, GD(3)); cv.set(10, y + 1, GD(1)); cv.set(53, y, GD(3)); cv.set(53, y + 1, GD(1))
    # the opening
    cv.rect(16, 14, 32, 49, DARK)
    if not opn:
        for x0 in (16, 32):
            blk(x0, 15, x0 + 15, 62, K(3), K(2), K(0))
            for y in range(19, 61, 9):
                cv.hline(x0 + 2, x0 + 13, y, K(1)); cv.hline(x0 + 2, x0 + 13, y + 1, K(3))
            for y in range(18, 62, 9):
                cv.set(x0 + 3, y, MT(3)); cv.set(x0 + 12, y, MT(3))
        # seam with a warm glow leaking through
        for y in range(16, 62):
            cv.set(31, y, FI(1) if y % 2 else RR(1)); cv.set(32, y, FI(2) if y % 3 else FI(3))
        # a gold lock plate at the seam (interactable accent)
        blk(27, 36, 36, 45, GD(4), GD(2), GD(1))
        cv.set(31, 40, DARK); cv.set(32, 40, DARK); cv.set(31, 41, DARK)
    else:
        for y in range(15, 63):
            for x in range(16, 48):
                t = (y - 15) / 48
                c = DARK
                if t > 0.15 and (x + y) % 5 == 0:
                    c = K(0)
                cv.set(x, y, c)
        # the lift car in the shaft: a lit cage
        blk(20, 26, 43, 62, K(3), K(1), K(0))
        for y in range(30, 60, 5):
            cv.hline(22, 41, y, K(2))
        for x in range(24, 42, 6):
            cv.vline(x, 28, 60, K(2))
        for x in range(21, 43):
            cv.put(x, 27, glow(GD(4), 190))
        cv.rect(30, 22, 4, 3, GD(2)); cv.set(31, 23, GD(5)); cv.set(32, 23, GD(5))
        # swung-back door leaves on the jambs
        for x0 in (16, 44):
            blk(x0, 15, x0 + 3, 62, K(3), K(2), K(0))
    # threshold ramp
    for x in range(14, 50):
        cv.set(x, 62, K(4)); cv.set(x, 63, K(1))
    return cv


def furnace_glow(dim):
    """64 x 32 decal above the gate: a furnace-red bloom through the rock (translucent). dim = after pk_restored."""
    cv = Canvas(64, 32)
    amp = 0.35 if dim else 1.0
    for y in range(32):
        for x in range(64):
            dx, dy = (x - 31.5) / 30.0, (y - 22) / 14.0
            d = math.sqrt(dx * dx + dy * dy)
            if d >= 1.0:
                continue
            a = (1 - d) ** 1.6 * amp
            if (x + y) % 2 == 0 and a < 0.5:
                continue
            col = FI(3) if a > 0.45 else (FI(2) if a > 0.2 else FI(1))
            cv.put(x, y, glow(col, int(min(235, 40 + a * 230))))
    return cv


# ---------------------------------------------------------------------- the memorial
def memorial():
    """"Names Etched in Iron": a wall of iron plates set in a brick base, 4 x 3 tiles. Plate slots at tile (1, 1),
    (2, 1) (each 16 x 16 wide = one overlay cell); the overlays go on top."""
    cv = Canvas(64, 48)
    floor = Canvas(64, 48)
    # plinth
    for x in range(0, 64):
        for y in range(36, 46):
            cv.set(x, y, K(2) if y > 37 else K(4))
    cv.hline(0, 63, 36, K(5)); cv.hline(0, 63, 45, OUT)
    # brick wall behind the plates
    for y in range(4, 36):
        for x in range(2, 62):
            course = (y - 4) // 4
            off = (course % 2) * 4
            c = RR(1)
            if (y - 4) % 4 == 3 or (x + off) % 8 == 7:
                c = RR(0)
            elif (y - 4) % 4 == 0:
                c = RR(2)
            cv.set(x, y, c)
    for y in range(4, 36):
        cv.set(1, y, OUT); cv.set(62, y, OUT)
    cv.hline(1, 62, 3, K(4)); cv.hline(1, 62, 2, OUT)
    # two big iron slots (the overlays cover them), each a dark frame with rivets
    for sx in (8, 32):
        for y in range(10, 34):
            for x in range(sx, sx + 24):
                cv.set(x, y, K(1) if (x in (sx, sx + 23) or y in (10, 33)) else K(2))
        for (x, y) in ((sx + 2, 12), (sx + 21, 12), (sx + 2, 31), (sx + 21, 31)):
            cv.set(x, y, MT(2))
    # candle ledge
    cv.hline(2, 61, 35, K(1))
    # small plaque of dates under the slots
    for x in range(26, 38):
        cv.set(x, 39, K(3) if x % 2 else K(2))
    return cv


def plate(kind, lettered):
    """24 x 24 plate overlay. flat: a hard-edged slab, flat colour, square corners. soft: a worn plate with rounded
    corners, a softer lit rim and scuffed face. lettered: rows of engraved names (tiny glyph runs)."""
    cv = Canvas(24, 24)
    for y in range(24):
        for x in range(24):
            if kind == 'soft':
                cx = min(x, 23 - x); cy = min(y, 23 - y)
                if cx + cy < 2:
                    continue
            edge = x in (0, 23) or y in (0, 23)
            if edge:
                c = OUT
            elif kind == 'flat':
                c = K(3) if not (x == 1 or y == 1) else K(4)
                if x == 22 or y == 22:
                    c = K(2)
            else:
                c = K(3) if (x + y) % 5 else K(2)
                if x == 1 or y == 1:
                    c = K(4) if (x + y) % 2 else K(3)
                if x == 22 or y == 22:
                    c = K(2)
                if h32(x, y, 821) % 9 == 0:
                    c = K(4)
            cv.set(x, y, c)
    if lettered:
        for row in range(5):
            y = 4 + row * 4
            x = 4
            while x < 20:
                w = 1 + h32(row, x, 822) % 3
                for k in range(min(w, 20 - x)):
                    cv.set(x + k, y, K(1))
                    if (k + row) % 2 == 0:
                        cv.set(x + k, y + 1, K(1)) if y + 1 < 22 else None
                x += w + 1 + h32(row, x, 823) % 2
        cv.set(11, 20, GD(3)); cv.set(12, 20, GD(3))
    return cv


# ---------------------------------------------------------------------- town props
def ember_pit(f):
    cv = Canvas(16, 32)
    for y in range(24, 31):
        for x in range(1, 15):
            cv.set(x, y, K(2) if y < 28 else K(1))
    ellipse(cv, 8, 24, 7.5, 4, lambda dx, dy, d: OUT if d > 0.92 else (K(4) if dx + dy < -0.4 else K(3)))
    ellipse(cv, 8, 24, 5.5, 2.7, lambda dx, dy, d: RR(0) if d > 0.6 else FI(1))
    # embers and flame
    for i in range(7):
        x = 4 + (i * 5 + f * 3) % 9
        y = 22 + (i + f) % 3
        cv.set(x, y, FI(3) if i % 2 else FI(2))
    for k, (x, h) in enumerate(((6, 7), (8, 10), (10, 6))):
        hh = h + (f + k) % 3 - 1
        for y in range(hh):
            half = max(0, (hh - y) * 0.4)
            for xx in range(int(x - half), int(x + half) + 1):
                cv.set(xx, 22 - y, FI(5) if y < 3 else (FI(4) if y < hh - 3 else FI(3)))
    # grate bars
    for x in (5, 8, 11):
        cv.vline(x, 20, 26, K(1))
    cv.hline(3, 13, 24, K(1))
    cv.hline(3, 13, 30, OUT)
    for x in range(3, 14):
        cv.put(x, 31, SH(80))
    return cv


def coolant_station():
    """32 x 32: a riveted tank with a cyan gauge, a brass tap and a valve wheel, pipes into the ground."""
    cv = Canvas(32, 32)
    for x in range(2, 31):
        cv.put(x, 31, SH(80))
    # tank
    for y in range(4, 28):
        for x in range(3, 21):
            cv.set(x, y, K(3))
    for y in range(4, 28):
        cv.set(3, y, OUT); cv.set(20, y, OUT); cv.set(4, y, K(4)); cv.set(19, y, K(1)); cv.set(18, y, K(2))
    cv.hline(3, 20, 4, OUT); cv.hline(4, 19, 5, K(5)); cv.hline(3, 20, 27, OUT); cv.hline(4, 19, 26, K(1))
    for y in (10, 21):
        cv.hline(3, 20, y, GD(2)); cv.hline(3, 20, y + 1, GD(1)); cv.set(4, y, GD(4))
    for (x, y) in ((6, 7), (16, 7), (6, 24), (16, 24)):
        cv.set(x, y, MT(2))
    # glass level gauge (cyan)
    for y in range(12, 20):
        cv.set(10, y, K(0)); cv.set(11, y, WA(4) if y > 14 else WA(2)); cv.set(12, y, WA(5) if y > 14 else WA(1))
        cv.set(13, y, K(0))
    cv.set(11, 15, WHITE)
    # pipe and valve to the right, a brass tap below
    for x in range(21, 29):
        cv.set(x, 14, K(4)); cv.set(x, 15, K(3)); cv.set(x, 16, K(1))
    for y in range(16, 28):
        cv.set(27, y, K(4)); cv.set(28, y, K(3)); cv.set(29, y, K(1))
    for i in range(14):
        a = i * math.pi / 7
        cv.set(round(24.5 + math.cos(a) * 3.5), round(10.5 + math.sin(a) * 3.5), FI(3) if math.sin(a) < 0 else FI(2))
    cv.rect(24, 10, 2, 2, GD(3)); cv.vline(24, 11, 14, K(1))
    blk_x = 6
    cv.rect(blk_x, 28, 6, 2, GD(2)); cv.set(blk_x, 28, GD(4))
    # drip
    cv.set(9, 30, WA(5)); cv.put(9, 31, glow(WA(4), 160))
    return cv


def proclamation_board():
    """32 x 32: two iron posts and a board with the Smelter's proclamation (red wax seal, lines of dark text)."""
    cv = Canvas(32, 32)
    for x in range(3, 30):
        cv.put(x, 31, SH(80))
    for x0 in (4, 26):
        for y in range(10, 31):
            cv.set(x0, y, K(4)); cv.set(x0 + 1, y, K(2)); cv.set(x0 + 2, y, K(1))
    for y in range(2, 22):
        for x in range(2, 30):
            cv.set(x, y, OUT if x in (2, 29) or y in (2, 21) else
                   (WD(4) if y == 3 or x == 3 else (WD(1) if y == 20 or x == 28 else WD(3))))
    # a paper
    for y in range(5, 19):
        for x in range(5, 27):
            cv.set(x, y, SW(5) if (x + y) % 11 else SW(4))
    for row in range(5):
        y = 8 + row * 2
        x = 7
        while x < 24:
            w = 2 + h32(row, x, 831) % 4
            for k in range(min(w, 24 - x)):
                cv.set(x + k, y, K(1))
            x += w + 1
    for x in range(8, 24):
        cv.set(x, 6, RR(2))
    cv.rect(21, 15, 4, 4, RR(2)); cv.set(21, 15, RR(4)); cv.set(22, 16, RR(3))
    return cv


def charred_pine():
    """32 x 64: a burnt pine, black trunk and bare limbs, a few stubs of needles, a lit edge (glow from the mountain)."""
    cv = Canvas(32, 64)
    trunk, mid, edge = SD(0), SD(1), RR(2)
    for x in range(8, 24):
        cv.put(x, 63, SH(70))
    for y in range(6, 62):
        w = 2 if y < 26 else (3 if y < 46 else 4)
        for x in range(16 - w // 2, 16 - w // 2 + w):
            cv.set(x, y, trunk if (x + y) % 5 else mid)
        cv.set(16 - w // 2, y, SD(2) if y % 3 else mid)
        cv.set(16 - w // 2 + w - 1, y, edge) if y % 4 == 0 else None
    # roots
    for (dx, dy) in ((-3, 61), (-2, 60), (3, 61), (2, 60)):
        cv.set(16 + dx, dy, trunk)
    for y, ln, sd in ((12, 8, 1), (17, 10, -1), (23, 11, 1), (29, 9, -1), (35, 12, 1), (41, 8, -1), (47, 7, 1)):
        for k in range(1, ln + 1):
            x = 16 + sd * k
            yy = y - k // 3
            cv.set(x, yy, trunk); cv.set(x, yy + 1, mid)
            if k > ln - 3:
                cv.set(x, yy - 1, K(0))
        if sd > 0:
            cv.set(16 + sd * ln, y - ln // 3 - 1, edge)
    cv.set(16, 5, trunk); cv.set(16, 4, trunk); cv.set(15, 6, trunk)
    for (x, y) in ((11, 20), (21, 32), (12, 40)):
        cv.set(x, y, FI(1))
    return cv


def charred_stump():
    cv = Canvas(16, 16)
    for x in range(3, 14):
        cv.put(x, 15, SH(80))
    ellipse(cv, 8, 10, 6, 3.4, lambda dx, dy, d: OUT if d > 0.88 else (K(1) if dx + dy < 0 else SD(1)))
    for y in range(10, 15):
        for x in range(3, 13):
            cv.set(x, y, SD(0) if (x + y) % 4 else SD(1))
    cv.set(5, 9, FI(1)); cv.set(10, 10, FI(1)); cv.set(8, 8, K(3))
    return cv


def bench_iron():
    cv = Canvas(32, 16)
    for x in range(2, 31):
        cv.put(x, 15, SH(80))
    for y in range(4, 8):
        for x in range(2, 30):
            cv.set(x, y, OUT if y == 4 else (K(4) if y == 5 else (K(3) if y == 6 else K(1))))
    for y in range(8, 11):
        for x in range(2, 30):
            cv.set(x, y, K(2) if y == 8 else K(1))
    for x0 in (4, 25):
        for y in range(8, 15):
            cv.set(x0, y, K(3)); cv.set(x0 + 1, y, K(1))
    for x in range(5, 28, 4):
        cv.set(x, 5, MT(3))
    return cv


def sand_milestone():
    cv = Canvas(16, 32)
    for x in range(2, 15):
        cv.put(x, 31, SH(80))
    for y in range(8, 30):
        w = 6 + (y - 8) // 6
        for x in range(8 - w // 2, 8 + w // 2 + 1):
            cv.set(x, y, SW(4) if x < 8 - w // 4 else (SW(3) if x < 8 + w // 4 else SW(2)))
        cv.set(8 - w // 2, y, SW(1)); cv.set(8 + w // 2, y, SW(0) if False else K(1))
    for x in range(5, 12):
        cv.set(x, 7, SW(5)); cv.set(x, 8, SW(4))
    for (x, y) in ((6, 12), (7, 12), (8, 12), (6, 15), (7, 15), (9, 15), (6, 18), (8, 18), (9, 18), (7, 21), (8, 21)):
        cv.set(x, y, K(1))
    cv.hline(3, 13, 29, K(1))
    return cv


def carters_fire(f):
    cv = Canvas(16, 32)
    for x in range(2, 15):
        cv.put(x, 31, SH(70))
    # stone ring
    for i in range(10):
        a = i * math.pi / 5
        x, y = 8 + math.cos(a) * 6.4, 27 + math.sin(a) * 2.8
        for dx in (0, 1):
            cv.set(round(x) + dx, round(y), K(4) if math.sin(a) < 0 else K(2))
            cv.set(round(x) + dx, round(y) + 1, K(1))
    # logs
    cv.line(4, 28, 12, 26, WD(2)); cv.line(4, 27, 12, 29, WD(3)); cv.line(4, 29, 12, 28, WD(1))
    # flames
    for k, (x, h) in enumerate(((6, 8), (8, 12), (10, 7))):
        hh = h + (f + k) % 3 - 1
        for y in range(hh):
            half = max(0, (hh - y) * 0.38)
            for xx in range(int(x - half), int(x + half) + 1):
                cv.set(xx, 26 - y, FI(5) if y < 3 else (FI(4) if y < hh - 3 else FI(3)))
    for (dx, dy) in ((2, 9 + f), (10, 12 - f), (7, 15 + (f % 2))):
        cv.set(dx, 26 - dy, FI(4))
    return cv


def cart_penny():
    """48 x 32: Penny's peddler cart: a wood box, sacks and crates, one big wheel, a canvas cover."""
    cv = Canvas(48, 32)
    for x in range(3, 46):
        cv.put(x, 31, SH(80))
    # wheel
    ellipse(cv, 36, 23, 7.5, 7.5, lambda dx, dy, d: OUT if d > 0.88 else (WD(3) if d > 0.6 else WD(1)))
    for i in range(8):
        a = i * math.pi / 4
        for r in range(1, 6):
            cv.set(round(36 + math.cos(a) * r), round(23 + math.sin(a) * r), WD(4))
    cv.rect(35, 22, 3, 3, K(3))
    # box
    for y in range(12, 25):
        for x in range(3, 38):
            cv.set(x, y, OUT if x in (3, 37) or y in (12, 24) else
                   (WD(4) if y == 13 else (WD(1) if y > 22 else (WD(3) if (x // 4) % 2 else WD(2)))))
    for x in range(5, 36, 6):
        cv.vline(x, 14, 22, WD(1))
    # shafts
    cv.line(2, 20, 0, 25, WD(2)); cv.line(3, 20, 0, 26, WD(1))
    # canvas cover over the back half and sacks
    for y in range(4, 13):
        for x in range(14, 36):
            if (x - 14) + (12 - y) * 0.3 < 24 and y > 4 + abs(x - 25) * 0.25:
                cv.set(x, y, SW(5) if (x + y) % 7 else SW(4))
    cv.hline(14, 35, 12, SW(2))
    for x0, y0 in ((5, 7), (10, 8)):
        ellipse(cv, x0 + 3, y0 + 3, 4, 3.5, lambda dx, dy, d: OUT if d > 0.85 else (SW(4) if dx + dy < 0 else SW(3)))
    # a gold accent: the lantern on the front
    cv.rect(39, 11, 3, 4, K(1)); cv.set(40, 12, GD(4)); cv.set(40, 13, GD(3))
    return cv


def lamp_ember(f):
    cv = Canvas(16, 48)
    for x in range(5, 12):
        cv.put(x, 47, SH(80))
    for y in range(20, 46):
        cv.set(7, y, K(4)); cv.set(8, y, K(3)); cv.set(9, y, K(1))
    for x in range(5, 12):
        cv.set(x, 45, K(2)); cv.set(x, 46, K(1))
    # basket of fire
    for y in range(12, 20):
        for x in range(4, 13):
            edge = x in (4, 12) or y == 19
            cv.set(x, y, K(1) if edge else DARK)
    for x in range(4, 13):
        cv.set(x, 12, K(4))
    for k, (x, h) in enumerate(((6, 7), (8, 10), (10, 6))):
        hh = h + (f + k) % 3 - 1
        for y in range(hh):
            half = max(0, (hh - y) * 0.4)
            for xx in range(int(x - half), int(x + half) + 1):
                cv.set(xx, 17 - y, FI(5) if y < 2 else (FI(4) if y < hh - 3 else FI(3)))
    for i in range(3):
        cv.set(5 + i * 3 + f % 2, 13, FI(2))
    return cv


def ash_drift(k):
    cv = Canvas(16, 16)
    shapes = [(8, 9, 7, 3.2), (6, 8, 5, 3.6), (10, 9, 6, 2.6)]
    cx, cy, rx, ry = shapes[k]
    for y in range(16):
        for x in range(16):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            r = dx * dx + dy * dy + (rnd(x, y, 840 + k) - 0.5) * 0.45
            if r < 1.0:
                if (x + y) % 2 == 0 or r < 0.55:
                    c = SW(3) if (dx + dy < -0.2) else SW(2)
                    cv.put(x, y, (c[0], c[1], c[2], 235 if r < 0.55 else 175))
    for (x, y) in ((cx - 1, cy - 1), (cx + 2, cy)):
        cv.put(int(x), int(y), (SW(4)[0], SW(4)[1], SW(4)[2], 230))
    return cv


def shelter_ruin():
    """96 x 64 (6 x 4): a roofless carters' shelter, three broken stone walls open to the south, a cold hearth,
    fallen blocks and a rafter stub. Footprint = the wall cells; the middle is walkable."""
    W, H = 7 * 16, 4 * 16
    cv = Canvas(W, H)
    wall = lambda x0, y0, x1, y1, seed: bld.stone_blocks(cv, x0, y0, x1 - x0, y1 - y0, ramp='stone_warm', seed=seed,
                                                         course=5, rough=True)
    # back wall (broken top edge), left and right returns
    for x in range(3, 93):
        top = 6 + int(3 * math.sin(x * 0.35) + 3 * (h32(x // 3, 851) % 3))
        for y in range(top, 36):
            cv.set(x, y, SW(3))
    bld.stone_blocks(cv, 3, 14, 90, 22, ramp='stone_warm', seed=5, course=5, rough=True)
    # re-break the top edge
    for x in range(3, 93):
        top = 12 + (h32(x // 3, 851) % 7)
        for y in range(0, top):
            cv.set(x, y, (0, 0, 0, 0))
    for x in range(3, 93):
        top = 12 + (h32(x // 3, 851) % 7)
        cv.set(x, top, SW(5)); cv.set(x, top + 1, SW(4))
    # side walls
    for x0 in (3, 77):
        bld.stone_blocks(cv, x0, 34, 16, 28, ramp='stone_warm', seed=x0, course=5, rough=True)
        for x in range(x0, x0 + 16):
            top = 34 + (h32(x // 2, 852) % 6)
            for y in range(34, top):
                cv.set(x, y, (0, 0, 0, 0))
            cv.set(x, top, SW(5))
        for y in range(34, 62):
            cv.set(x0, y, SW(1)); cv.set(x0 + 15, y, SW(1))
    # floor of ash inside, a cold hearth
    for y in range(36, 60):
        for x in range(19, 77):
            n = h32(x, y, 853) % 9
            cv.set(x, y, SW(2) if n > 1 else SW(1))
    for y in range(40, 48):
        for x in range(40, 56):
            if ((x - 48) / 8.0) ** 2 + ((y - 44) / 4.0) ** 2 < 1:
                cv.set(x, y, SD(1) if (x + y) % 3 else SD(0))
    cv.set(46, 43, FI(0 if False else 1))
    # fallen blocks and a rafter stub
    for (x0, y0) in ((24, 54), (62, 52), (30, 40)):
        for y in range(4):
            for x in range(8):
                cv.set(x0 + x, y0 + y, SW(4) if y == 0 else (SW(3) if y < 3 else SW(1)))
    for x in range(8, 30):
        cv.set(x, 28 + (x - 8) // 6, WD(2)); cv.set(x, 29 + (x - 8) // 6, WD(1))          # a fallen rafter
    for y in range(62, 64):
        pass
    for x in range(4, 94):
        cv.put(x, 63, SH(70))
    # cast shadow to the right
    finish_shadow(cv, 36, 62, width=6)
    swap(cv)
    cv2 = cv
    fp = [[dx, dy] for dx in range(6) for dy in (-3, -2)] + [[0, dy] for dy in (-1, 0)] + [[5, dy] for dy in (-1, 0)]
    meta = {'rect_wh': [W, H], 'anchor': [0, 3], 'footprint': fp, 'overheadRows': 1, 'doorAt': None,
            'collision': 'solid', 'kind': 'building'}
    return cv2, meta


# ---------------------------------------------------------------------- emberpeak_far
def emberpeak_far():
    """128 x 96 silhouette decal for the overhead layer (`ash_view`): the Emberpeak massif drawn in three flat tones,
    a molten crown, thin slag falls, lit windows of the town. Transparent sky (collision none). Hand-built from the
    shapes of environments cell 2, quantized to the master palette."""
    cv = Canvas(128, 96)
    base = 92
    tops = []
    peaks = [(70, 62, 78), (104, 40, 52), (36, 36, 44), (122, 22, 34), (10, 30, 24)]
    for x in range(128):
        y = float(base)
        for (cx, hw, h) in peaks:
            u = abs(x - cx) / hw
            if u < 1:
                y = min(y, base - h * (1 - u ** 0.95))
        y += 2.2 * math.sin(x * 0.8) * 0.4 + (h32(x // 2, 861) % 3) - 1
        tops.append(int(round(y)))
    for x in range(128):
        top = tops[x]
        slope = tops[min(127, x + 2)] - tops[max(0, x - 2)]
        for y in range(top, base + 1):
            f = (y - top) / max(1, base - top)
            n = h32(x // 2, y // 2, 862) % 11
            c = K(1) if (f < 0.5 and slope > 1) else SD(1)
            if n == 0:
                c = K(2) if f < 0.6 else K(1)
            if f > 0.88 and n < 3:
                c = RR(1)
            cv.set(x, y, c)
        cv.set(x, top, FI(2) if x % 3 else FI(3))
        cv.set(x, top + 1, RR(2))
    for i, fx in enumerate((50, 62, 74, 88, 100, 28)):
        top = tops[fx] + 5 + (i * 4) % 7
        for y in range(top, min(base, top + 18 + (i * 5) % 12)):
            xx = fx + int(round(math.sin(y * 0.3 + i * 2)))
            cv.set(xx, y, FI(4) if (y + i) % 6 == 0 else (FI(3) if y % 2 else FI(2)))
            cv.set(xx + 1, y, RR(2))
    for k in range(10):
        wx = 56 + (h32(871, k) % 56)
        wy = tops[wx] + 10 + h32(872, k) % 16
        if wy < base - 3:
            cv.set(wx, wy, FI(4)); cv.set(wx, wy + 1, FI(2))
    # the haze at the foot: a dithered fade into transparency
    for y in range(base - 6, base + 1):
        for x in range(128):
            if cv.get(x, y)[3] and (x + y) % 2 == 0:
                cv.set(x, y, (0, 0, 0, 0))
    for y in range(base + 1, 96):
        pass
    return cv


# ====================================================================== sheet
def build():
    sh = Sheet(512, 2048)
    meta_t = sh.meta.setdefault('terrains', {})
    for t in (AshGround(), CinderPath()):
        x, y = sh.alloc(32, 48)
        sh.cv.paste(t.block(), x, y)
        m = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A2', 'kind': t.kind, 'collision': 'none',
             'variants': [], 'variantWeights': list(getattr(t, 'weights', [4] + [2] * (t.nvariants - 1)))}
        for v in range(t.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(t.variant_tile(v), vx, vy)
            m['variants'].append([vx, vy])
        meta_t[t.id] = m
    sh.newline()
    # modular iron roofs and slag-brick walls
    chunk = roof_chunk(IRON, 'slate', seed=151)
    for ri, r in enumerate(('ridge', 'field', 'eave')):
        for ci, c in enumerate(('l', 'm', 'r')):
            sh.tile('roof_iron_%s_%s' % (r, c), cut(chunk, ci, ri))
    from kit import wall_chunk
    wc = swap(wall_chunk('stone'))
    for ri, r in enumerate(('top', 'bot')):
        for ci, c in enumerate(('l', 'm', 'r')):
            sh.tile('wall_slag_%s_%s' % (r, c), cut(wc, ci, ri))
    sh.newline()
    # overlays: ash drifts, memorial plates, furnace glow
    for k in range(3):
        sh.tile('ash_drift_%s' % 'abc'[k], ash_drift(k), collision='none', note='translucent drift on ash ground')
    for kind in ('flat', 'soft'):
        for lettered in (False, True):
            tid = 'memorial_plate_%s%s' % (kind, '_lettered' if lettered else '')
            sh.tile(tid, plate(kind, lettered), collision='solid',
                    note='24 x 24 plate overlay for the memorial: at the memorial\'s plateAt cell (top-left of the '
                         'slot), %s%s' % (kind, ', names engraved (after pk_restored)' if lettered else ', blank'))
    sh.newline()
    fg = [furnace_glow(False), furnace_glow(True)]
    put_frames(sh, 'furnace_glow', fg, [0, 1], [], kind='piece',
               note='64 x 32 translucent glow decal above the foundry gate (overhead layer, collision none); '
                    'frames: 0 = bright, 1 = dim (after pk_restored)')
    sh.meta['objects']['furnace_glow']['collision'] = 'none'
    sh.newline()
    # prefabs
    items = []
    for pid, fn in (('inn_coal', inn_coal), ('shop_vent', shop_vent), ('bellhouse', bellhouse),
                    ('house_ember_a', house_ember_a), ('house_ember_b', house_ember_b),
                    ('shelter_ruin', shelter_ruin)):
        cv, m = fn()
        items.append((pid, [cv], m))
    frames, m = smithy_ember()
    items.append(('smithy_ember', frames, m))
    towers = [bell_tower_ember(s) for s in range(3)]
    items.append(('bell_tower_ember', [t[0] for t in towers], towers[0][1]))
    items.sort(key=lambda t: (-t[1][0].h, t[0]))
    for pid, cvs, meta in items:
        m = dict(meta)
        w, h = m.pop('rect_wh')
        x, y = sh.alloc(w * len(cvs), h)
        for i, cv in enumerate(cvs):
            sh.cv.paste(cv, x + i * w, y)
        entry = {'rect': [x, y, w, h], 'kind': 'building', **m}
        if len(cvs) > 1:
            if pid == 'smithy_ember':
                entry['anim'] = {'frames': [0, 1, 2, 1], 'frameDx': w, 'ms': 420}
                entry['note'] = 'chimney smoke frames (3), animate with `anim`; light after forge_relit'
            else:
                entry['frames'] = [[x + i * w, y, w, h] for i in range(len(cvs))]
                entry['ringAnim'] = {'frames': [1, 2], 'frameDx': w, 'ms': 260}
                entry['note'] = 'First Bell tower; frames by state: 0 = silent, 1 = ringing (swing left), 2 = ringing ' \
                                '(swing right). Ringing cycle = `ringAnim` (frames 1, 2). Unlisted state = silent.'
        sh.meta['objects'][pid] = entry
    sh.newline()
    # foundry gate pair
    fgc, fgo = foundry_gate(False), foundry_gate(True)
    sh.obj('foundry_gate_closed', fgc, [0, 3], [[0, 0], [1, 0], [2, 0], [3, 0]], 0, kind='door',
           note='the gate in the mountain face (needs lift_key); 4 tiles wide, footprint the bottom row')
    sh.obj('foundry_gate_open', fgo, [0, 3], [[0, 0], [3, 0]], 0, door=[1, 0], kind='door',
           note='lift door open (after foundry_entered); the walkable cells are (1, 0) and (2, 0)')
    sh.newline()
    # props
    put_frames(sh, 'ember_pit', [ember_pit(i) for i in range(3)], [0, 1], [[0, 0]], overhead=0, anim_ms=130,
               light={'color': '#e06b39', 'radius': 3.5}, note='ember pit with a grate (anim)')
    put_frames(sh, 'carters_fire', [carters_fire(i) for i in range(3)], [0, 1], [[0, 0]], anim_ms=130,
               light={'color': '#e06b39', 'radius': 4.0}, note='carters_fire: campfire in a stone ring (anim)')
    put_frames(sh, 'lamp_ember', [lamp_ember(i) for i in range(3)], [0, 2], [[0, 0]], overhead=1, anim_ms=140,
               light={'color': '#e06b39', 'radius': 4.0}, note='iron fire basket on a post (anim)')
    sh.obj('sand_milestone', sand_milestone(), [0, 1], [[0, 0]], 1, note='carters\' milestone (EMBERPEAK 3 MI.)')
    sh.obj('charred_stump', charred_stump(), [0, 0], [[0, 0]], 0)
    sh.obj('coolant_station', coolant_station(), [0, 1], [[0, 0], [1, 0]], 1, note='coolant_obj')
    sh.obj('proclamation_board', proclamation_board(), [0, 1], [[0, 0], [1, 0]], 1, note='Smelter Proclamation board')
    sh.obj('bench_iron', bench_iron(), [0, 0], [[0, 0], [1, 0]], 0)
    sh.obj('cart_penny', cart_penny(), [0, 1], [[0, 0], [1, 0], [2, 0]], 1, note='Penny\'s cart (penny_s)')
    sh.obj('charred_pine', charred_pine(), [1, 3], [[1, 0]], 3, note='trunk base solid, limbs overhead')
    mem = memorial()
    sh.obj('memorial', mem, [0, 2], [[0, 0], [1, 0], [2, 0], [3, 0]], 2, plateAt=[[0.5, -1.5], [2.0, -1.5]] if False else None,
           note='"Names Etched in Iron" (script memorial_wall): 4 x 3 tiles; two 24 x 24 plate slots at rect pixel '
                '(8, 10) and (32, 10) (plateSlots); overlay memorial_plate_* there')
    sh.meta['objects']['memorial']['plateSlots'] = [[8, 10], [32, 10]]
    sh.meta['objects']['memorial'].pop('plateAt', None)
    sh.newline()
    # the far decal
    sh.tile('emberpeak_far', emberpeak_far(), collision='none',
            note='128 x 96 silhouette decal of Emberpeak (overhead layer at ash_view)')
    sh.newline()
    ov = sh.meta.setdefault('overlays', {})
    for tid in ('ash_drift_a', 'ash_drift_b', 'ash_drift_c', 'memorial_plate_flat', 'memorial_plate_soft',
                'memorial_plate_flat_lettered', 'memorial_plate_soft_lettered'):
        ov[tid] = sh.meta['tiles'].pop(tid)
    for tid in ('ash_drift_a', 'ash_drift_b', 'ash_drift_c'):
        ov[tid]['w'], ov[tid]['h'] = 16, 16
    for tid in ('memorial_plate_flat', 'memorial_plate_soft', 'memorial_plate_flat_lettered',
                'memorial_plate_soft_lettered'):
        ov[tid]['w'], ov[tid]['h'] = 24, 24
    return sh.cv.crop(0, 0, 512, sh.y), sh.meta
