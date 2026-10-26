"""The Wider Valley buildings (EXPANSION1_PLAN 10.1): Thornfold's Loom House and two cottages, the weir-keeper's shed, Hal's Mill with
its wheel and the dry weir, the culvert arch, the Orrery tower, the High Moor's Watchtower and turf hut, Larchhill's Windmill.

Prefabs follow the town kit (prefabs.py): rect is (tiles + 1 shadow column) x rows, anchor = bottom-left footprint tile, footprint the solid
cells, overheadRows the rows drawn over actors, doorAt the walkable door cell. They are built from the same primitives (bld.py) as
Willowmere's houses, with a thatch roof style added here (patched into bld.shingles for style='thatch').
"""
import math
from pxlib import Canvas, C, SH, DARK, rnd, h32
from x1_draw import *
import bld
import prefabs
from prefabs import house, draw_wall, finish_shadow, stone_steps

# ---------------------------------------------------------------------- the thatch roof style (patched into bld.shingles)
_orig_shingles = bld.shingles


def _shingles(cv, x, y, w, h, ramp, seed=0, slate=False, mask=None, light_rows=2, moss=0.0, style=None):
    if style != 'thatch':
        return _orig_shingles(cv, x, y, w, h, ramp, seed=seed, slate=slate, mask=mask, light_rows=light_rows, moss=moss, style=style)
    R = lambda i: C(ramp, i)
    for yy in range(h):
        g = yy / max(1, h - 1)              # 0 at the ridge, 1 at the eave
        row = yy // 3
        ly = yy % 3
        for xx in range(w):
            if mask is not None and not mask(xx, yy):
                continue
            n = h32(xx // 2, row, seed, 51) % 7
            # straw laid in 3 px courses: a lit top edge, a shadowed hanging lip, ragged ends
            body = R(3) if n > 1 else R(2)
            if g > 0.6:
                body = R(2) if n > 2 else R(3)
            if ly == 0:
                c = R(4) if (xx + row) % 3 else body
            elif ly == 2:
                c = R(1) if (xx + row * 2) % 4 else R(2)
            else:
                c = body
            fib = h32(xx, yy, seed, 52) % 11
            if fib == 0:
                c = R(4)
            elif fib == 1:
                c = R(1)
            if moss and rnd(xx // 3, yy // 3, seed, 53) < moss and c in (R(2), R(3)):
                c = C('grass', 2) if (xx + yy) % 2 else C('grass', 1)
            cv.set(x + xx, y + yy, c)


bld.shingles = _shingles


# ---------------------------------------------------------------------- small drawing helpers
def sign_loom(cv, x, y):
    """A hanging loom sign: a framed shuttle and a skein of thread."""
    w, h = 14, 11
    for xx in range(w + 4):
        cv.set(x - 2 + xx, y - 3, MT(1))
    cv.set(x - 2, y - 4, MT(1))
    cv.set(x + 2, y - 2, MT(0))
    cv.set(x + w - 3, y - 2, MT(0))
    for yy in range(h):
        for xx in range(w):
            c = WD(3) if yy not in (0, h - 1) and xx not in (0, w - 1) else WD(1)
            if yy == 1 and 0 < xx < w - 1:
                c = WD(4)
            cv.set(x + xx, y + yy, c)
    rows = ['............',
            '.cc.........',
            'cbbbbbbbbbb.',
            '.cc....rrr..',
            '....rrrrrrr.',
            '.....rrrrr..',
            '............']
    cm = {'c': SA(3), 'b': WD(2), 'r': RR(3)}
    # the shuttle: a pale pointed boat shape and a red skein
    cv.stamp(['..........', '.wwwwwww..', 'wWWWWWWWw.', '.wwwwwww..', '..........', '.rrr.bbb..', 'rRRRrBBBb.'][:7],
             x + 2, y + 2, {'w': WD(1), 'W': SA(3), 'r': RR(2), 'R': RR(4), 'b': CB(2), 'B': CB(4)})
    for xx in range(w):
        cv.put(x + xx + 1, y + h, SH(70))


def wool_bale_stack(cv, x, y):
    """Two bales of fleece at the foot of a wall; (x, y) = the bottom-left of the stack."""
    for (dx, dy, w, h) in ((0, 0, 11, 8), (1, -8, 10, 7)):
        ell(cv, x + dx + w / 2, y + dy - h / 2 + 1, w / 2, h / 2 + 0.5,
            lambda a, b, d: MT(1) if d > 0.9 else (MT(4) if (-0.6 * a - 0.8 * b) > 0.25 else (MT(3) if (-0.4 * a - 0.5 * b) > -0.2 else MT(2))))
        for k in range(1, w - 1, 3):
            cv.set(x + dx + k, y + dy - h // 2, SA(2))
    for xx in range(12):
        cv.put(x + 1 + xx, y + 1, SH(70))


def drying_rack(cv, x, y, w=15):
    """A wooden drying rack with hanks of dyed wool (red, blue, green, oatmeal); (x, y) = foot of the left post."""
    for px in (x, x + w):
        for yy in range(y - 18, y + 1):
            cv.set(px, yy, WD(3))
            cv.set(px + 1, yy, WD(1))
    for xx in range(x - 1, x + w + 3):
        cv.set(xx, y - 18, WD(4))
        cv.set(xx, y - 17, WD(1))
    cols = [RR(3), CB(3), GR(2), SA(2), CP(3)]
    for i in range(5):
        hx = x + 2 + i * 3
        col = cols[i % 5]
        for yy in range(y - 16, y - 7 + (i % 2) * 2):
            cv.set(hx, yy, col)
            cv.set(hx + 1, yy, C('shadow', 3) if False else col)
        cv.set(hx, y - 16, MT(3) if col == SA(2) else cols[i % 5])
    for xx in range(x - 1, x + w + 4):
        cv.put(xx + 2, y + 1, SH(70))


def rope_coil(cv, x, y):
    for k, (rx, ry) in enumerate(((5, 2.4), (4, 1.9), (3, 1.4))):
        ell(cv, x, y - k * 2, rx, ry, lambda a, b, d: None if d < 0.55 else (SA(2) if (-a - b) > 0.1 else EA(3)))
    cv.set(x + 5, y + 1, SA(1))
    cv.set(x + 6, y + 2, SA(1))


def hanging_net(cv, x, y, w=14, h=14):
    for yy in range(h):
        for xx in range(w):
            if (xx + yy) % 3 == 0 or (xx - yy) % 3 == 0:
                cv.set(x + xx, y + yy, EA(3) if (xx + yy) % 2 else EA(2))
    for xx in range(w + 2):
        cv.set(x - 1 + xx, y - 1, WD(1))
    for (xx, yy) in ((2, h - 1), (7, h), (11, h - 1)):
        cv.set(x + xx, y + yy, K(4))


# ---------------------------------------------------------------------- Thornfold
def cottage_a():
    """A Thornfold cottage: whitewashed-grey fieldstone, a deep thatch, one small shuttered window, heather in a pot."""
    def ext(cv, g):
        x0, y1 = g['wall_x0'], g['wall_y1']
        ell(cv, x0 + 40, y1 - 6, 3.5, 3.0, lambda a, b, d: EA(1) if d > 0.8 else (EA(3) if (-a - b) > 0.1 else EA(2)))
        for (dx, dy, c) in ((38, -10, RP(3)), (40, -11, BL(2)), (42, -10, RP(2)), (39, -9, RP(3)), (41, -9, RP(3))):
            cv.set(x0 + dx, y1 + dy, c)
        # a rain butt under the eave
        for yy in range(y1 - 10, y1 - 1):
            for xx in range(x0 + 4, x0 + 9):
                cv.set(xx, yy, WD(3) if xx < x0 + 7 else WD(2))
        for xx in range(x0 + 4, x0 + 9):
            cv.set(xx, y1 - 10, MT(1))
            cv.set(xx, y1 - 6, MT(1))
    return house(4, 2, 2, 'path', style='thatch', hip=3, seed=3, wall='stone',
                 door={'x': 9, 'w': 10, 'h': 17},
                 windows=[{'x': 35, 'y': 9, 'w': 8, 'h': 8, 'lit': True, 'shutters': 'roof_green'}],
                 chimney=(46, 6, True), extras=ext, base_course=6)


def cottage_b():
    """A Thornfold cottage in cream plaster and a moss-grey slate roof, a plank door, a window box of heather."""
    def ext(cv, g):
        x0, y1 = g['wall_x0'], g['wall_y1']
        bld.flower_box(cv, x0 + 44, y1 - 13, 12, 'cloth_purple')
        for y in range(g['wall_y0'] + 6, y1 - 2):
            for x in range(x0 + 2, x0 + 5 + (y % 3 == 0)):
                if rnd(x, y, 78) < 0.55:
                    cv.set(x, y, C('grass', 2) if (x + y) % 3 else C('grass', 3))
    return house(5, 3, 2, 'stone_cool', style='slate', hip=4, seed=9, wall='timber', plaster='cream', moss=0.05,
                 door={'x': 12, 'w': 10, 'h': 17},
                 windows=[{'x': 44, 'y': 9, 'w': 10, 'h': 9, 'lit': True, 'shutters': 'cloth_blue'}],
                 chimney=(58, 8, True), timber=[27, 36], extras=ext,
                 gable={'cx': 36, 'half': 11, 'window_kind': 'small'})


def loomhouse():
    """The Loom House: a long thatched wool-house, plaster and timber on a fieldstone course, a wide door with a loom sign, a window
    with a bobbin in it, bales of fleece stacked at one end and a rack of dyed wool at the other."""
    def ext(cv, g):
        x0, y0, y1 = g['wall_x0'], g['wall_y0'], g['wall_y1']
        sign_loom(cv, x0 + 56, y1 - 40)
        wool_bale_stack(cv, x0 + 4, y1 - 2)
        drying_rack(cv, x0 + 78, y1 - 2)
        bld.wall_lantern(cv, x0 + 36, y1 - 30)
        # a skein of undyed wool on a peg by the door
        for yy in range(y1 - 24, y1 - 17):
            cv.set(x0 + 62, yy, SA(2))
            cv.set(x0 + 63, yy, SA(1))
    return house(7, 3, 3, 'path', style='thatch', hip=6, seed=13, wall='timber', plaster='cream',
                 door={'x': 41, 'w': 12, 'h': 19},
                 windows=[{'x': 9, 'y': 22, 'w': 10, 'h': 9, 'lit': True, 'box': 'cloth_purple'},
                          {'x': 24, 'y': 22, 'w': 9, 'h': 9, 'lit': False, 'shutters': 'roof_red'},
                          {'x': 68, 'y': 22, 'w': 10, 'h': 9, 'lit': True, 'box': 'blossom'}],
                 chimney=(12, 9, True), timber=[18, 36, 60, 76], extras=ext, dormers=[30, 66], moss=0.02,
                 gable={'cx': 56, 'half': 14, 'window_kind': 'round'})


def weir_shed():
    """The weir-keeper's shed (a recolour of the smithy: same footprint and door cell): tarred plank walls, a shake roof, nets
    and a rope coil by the door, a boat hook, an oilskin on a peg, a storm lantern."""
    def ext(cv, g):
        x0, y0, y1 = g['wall_x0'], g['wall_y0'], g['wall_y1']
        hanging_net(cv, x0 + 8, y0 + 8, 18, 16)
        rope_coil(cv, x0 + 48, y1 - 4)
        # a boat hook leaning on the wall
        line_px(cv, x0 + 36, y1 - 26, x0 + 33, y1 - 3, WD(4), 1)
        line_px(cv, x0 + 37, y1 - 26, x0 + 34, y1 - 3, WD(1), 1)
        cv.set(x0 + 35, y1 - 27, MT(3))
        cv.set(x0 + 34, y1 - 28, MT(2))
        # an oilskin hanging
        for yy in range(y0 + 10, y0 + 24):
            for xx in range(x0 + 58, x0 + 66):
                cv.set(xx, yy, GD(2) if (xx + yy) % 5 else GD(1))
        cv.set(x0 + 61, y0 + 9, MT(2))
        bld.wall_lantern(cv, x0 + 74, y0 + 14)
        bld.hanging_sign(cv, x0 + 44, y0 + 6, 'bell', w=11, h=10)
    return house(6, 3, 2, 'earth', style='shake', hip=4, seed=23, wall='planks',
                 door={'x': 68, 'w': 10, 'h': 17, 'arch': False}, chimney=(10, 12, True), extras=ext)


# ====================================================================== build
def pack_prefab(sh, oid, cv, meta, note):
    m = dict(meta)
    w, h = m.pop('rect_wh')
    x, y = sh.alloc(w, h)
    sh.cv.paste(cv, x, y)
    sh.meta['objects'][oid] = {'rect': [x, y, w, h], 'kind': 'building', 'note': note, **m}


def build_into(sh):
    sh.meta.setdefault('objects', {})
    items = [('x1_cottage_a', cottage_a, 'a Thornfold cottage: grey fieldstone, thatch'),
             ('x1_cottage_b', cottage_b, 'a Thornfold cottage: cream plaster, moss-grey slate'),
             ('x1_loomhouse', loomhouse, "the Loom House (the hamlet's wool-house, with a loom sign); door at doorAt"),
             ('x1_weir_shed', weir_shed, "the weir-keeper's shed (the smithy's footprint and door cell)")]
    for oid, fn, note in items:
        cv, meta = fn()
        pack_prefab(sh, oid, cv, meta, note)
    sh.newline()
