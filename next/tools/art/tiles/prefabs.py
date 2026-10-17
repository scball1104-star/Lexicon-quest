"""Prefab town buildings (3/4 view), assembled from bld.py primitives.

Every prefab returns (Canvas, meta) where meta has rect_wh, anchor, footprint, overheadRows, doorAt.
The rect is (tiles wide + 1) x rows: the extra right column carries the cast shadow and is never solid.
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32
import bld
from bld import S, WD, G, GOLD, M


# ====================================================================== generic house
def house(wt, rr, wr, roof, top=1, wall='timber', hip=4, style='slate', door=None, windows=(), chimney=None,
          gable=None, extras=None, pre_roof=None, seed=0, moss=0.0, depth=None, base_course=6, timber=None,
          plaster='cream', dormers=()):
    """chimney = (x, rise_above_roof_top, smoke?) ; dormers = [x, ...] ; gable = dict(cx, half, ...)."""
    W, H = (wt + 1) * 16, (top + rr + wr) * 16
    cv = Canvas(W, H)
    bw = wt * 16
    roof_y = top * 16
    wall_x0, wall_x1 = 3, bw - 3
    wall_y0 = roof_y + rr * 16 - 4
    wall_y1 = H
    ww, wh = wall_x1 - wall_x0, wall_y1 - wall_y0
    g = dict(wall_x0=wall_x0, wall_x1=wall_x1, wall_y0=wall_y0, wall_y1=wall_y1, roof_y=roof_y, W=W, H=H, bw=bw)
    draw_wall(cv, wall, wall_x0, wall_y0, ww, wh, seed, base_course, timber, plaster, wr)
    for wdw in windows:
        kw = dict(wdw)
        x, y = kw.pop('x'), kw.pop('y')
        bld.window(cv, wall_x0 + x, wall_y0 + y, **kw)
    door_meta = None
    if door:
        dk = dict(door)
        dx = dk.pop('x')
        dk['w'] = max(dk.get('w', 12), 12)
        dk['h'] = max(dk.get('h', 24), 24)
        dw, dh = dk['w'], dk['h']
        bld.door(cv, wall_x0 + dx, wall_y1 - dh - 2, **dk)
        door_meta = (wall_x0 + dx + dw // 2) // 16
    if pre_roof:
        pre_roof(cv, g)
    bld.roof_side(cv, 0, roof_y, bw, rr * 16 + 2, roof, hip=hip, seed=seed, moss=moss, style=style)
    bld.eave_shadow(cv, wall_x0, roof_y + rr * 16 + 2, ww)
    for dxp in dormers:
        bld.dormer(cv, dxp, roof_y + rr * 16 - 18, roof)
    if gable:
        gk = dict(gable)
        bld.gable_front(cv, gk.pop('cx'), roof_y + rr * 16 + 2, gk.pop('half'), roof, seed=seed, **gk)
    if chimney:
        rise = min(chimney[1], 7)
        place_chimney(cv, chimney[0], roof_y - rise, roof_y + 9, w=8, smoke=len(chimney) > 2 and chimney[2])
    if extras:
        extras(cv, g)
    depth = depth if depth is not None else rr
    finish_shadow(cv, H - depth * 16, H - 1)
    rows = top + rr + wr
    meta = {
        'rect_wh': [W, H],
        'anchor': [0, rows - 1],
        'footprint': [[dx, dy] for dy in range(-(depth + wr) + 1, 1) for dx in range(wt)
                      if not (door_meta is not None and dx == door_meta and dy == 0)],
        'overheadRows': rows - (depth + wr),
        'doorAt': [door_meta, 0] if door_meta is not None else None,
        'collision': 'solid',
    }
    return cv, meta


def draw_wall(cv, wall, x0, y0, ww, wh, seed=0, base_course=6, timber=None, plaster='cream', wr=2):
    if wall == 'timber':
        bld.plaster(cv, x0, y0, ww, wh, seed=seed, tone=plaster)
        bld.stone_blocks(cv, x0, y0 + wh - base_course, ww, base_course, seed=seed, course=3)
        bld.timber_frame(cv, x0, y0, ww, wh - base_course + 1, list(timber or []),
                         mid=(wh - base_course) // 2 + 1 if wr >= 3 else None)
    elif wall in ('stone', 'stone_cool'):
        bld.stone_blocks(cv, x0, y0, ww, wh, ramp='stone_cool' if wall == 'stone_cool' else 'stone_warm',
                         seed=seed, course=5)
    elif wall == 'planks':
        bld.planks_v(cv, x0, y0, ww, wh - base_course, seed=seed)
        bld.stone_blocks(cv, x0, y0 + wh - base_course, ww, base_course, seed=seed, course=3)
        bld.beam_h(cv, x0, y0, ww)
    dark = WD(1) if wall in ('timber', 'planks') else C('stone_warm' if wall != 'stone_cool' else 'stone_cool', 1)
    for y in range(y0, y0 + wh):
        cv.set(x0, y, dark)
        cv.set(x0 + ww - 1, y, dark)
        cv.put(x0 + ww - 2, y, SH(60))
        cv.put(x0 + ww - 3, y, SH(30))


def place_chimney(cv, x, top_y, base_y, w=7, smoke=False, ramp='stone_warm'):
    bld.chimney(cv, x, top_y, w, base_y - top_y, smoke=smoke, ramp=ramp)
    for y in range(top_y + 2, base_y):
        for k in (0, 1):
            px = x + w + k
            if cv.get(px, y)[3] == 255:
                cv.put(px, y, SH(90 if k == 0 else 50))


def finish_shadow(cv, ground_top, ground_bottom, width=6):
    mask = cv.a[:, :, 3] > 0
    bld.cast_shadow_right(cv, mask, max(ground_top, 0), ground_bottom, width=width)


def goods_crate(cv, x, y, fruit='roof_red'):
    """10 x 8 crate of produce standing on the ground (bottom at y+7)."""
    for yy in range(3, 8):
        for xx in range(10):
            c = WD(3) if yy % 2 else WD(2)
            if xx in (0, 9):
                c = WD(1)
            cv.set(x + xx, y + yy, c)
    for xx in range(10):
        cv.set(x + xx, y + 2, WD(1))
    for xx in range(1, 9):
        r = (xx + h32(x, 5) % 3) % 3
        cv.set(x + xx, y + 1, C(fruit, 3) if r else C(fruit, 4))
        cv.set(x + xx, y + 2, C(fruit, 2) if r != 1 else C(fruit, 3))
        if xx % 3 == 1:
            cv.set(x + xx, y, C(fruit, 3))
    for xx in range(10):
        cv.put(x + xx + 1, y + 8, SH(80))


def stone_steps(cv, x, y, w, n=2, ramp='stone_warm'):
    R = lambda i: C(ramp, i)
    for k in range(n):
        ww = w + 4 * k
        xx0 = x - 2 * k
        yy = y + k * 3
        for xx in range(ww):
            cv.set(xx0 + xx, yy, R(5) if xx < ww - 1 else R(3))
            cv.set(xx0 + xx, yy + 1, R(4) if xx < ww - 1 else R(2))
            cv.set(xx0 + xx, yy + 2, R(2))
        cv.set(xx0, yy, R(4))


def rose_window(cv, x, y, d, ramp='stone_cool'):
    r = d / 2
    cols = [C('cloth_blue', 3), C('roof_red', 3), C('gold', 4), C('cloth_purple', 4)]
    for yy in range(d):
        for xx in range(d):
            dx, dy = xx + 0.5 - r, yy + 0.5 - r
            dd = dx * dx + dy * dy
            if dd > r * r:
                continue
            if dd > (r - 1.2) ** 2:
                cv.set(x + xx, y + yy, C(ramp, 1))
            elif dd > (r - 2.2) ** 2:
                cv.set(x + xx, y + yy, C(ramp, 4))
            elif dd < 2.2:
                cv.set(x + xx, y + yy, C('gold', 5))
            else:
                ang = (math.atan2(dy, dx) + math.pi) / (2 * math.pi)
                seg = int(ang * 8)
                if abs(ang * 8 - round(ang * 8)) < 0.12:
                    cv.set(x + xx, y + yy, C(ramp, 2))
                else:
                    cv.set(x + xx, y + yy, cols[seg % 4])


def spire(cv, cx, top_y, base_y, half, ramp):
    """Pyramid spire seen from the front: lit left face, shaded right face, slate courses."""
    R = lambda i: C(ramp, i)
    h = base_y - top_y
    for yy in range(h):
        span = int(round(half * (yy + 1) / h))
        for xx in range(-span, span + 1):
            course = (yy // 3) % 2
            k = (xx + course * 2) % 4
            if xx < 0:
                c = R(4) if k else R(3)
            else:
                c = R(2) if k else R(1)
            if yy % 3 == 2:
                c = R(2) if xx < 0 else R(1)
            if abs(xx) == span:
                c = R(0)
            if xx == 0:
                c = R(3) if yy % 3 != 2 else R(1)
            cv.set(cx + xx, top_y + yy, c)
    for k in range(4):
        cv.set(cx, top_y - 1 - k, C('gold', 3 if k % 2 else 4))
    cv.set(cx - 1, top_y - 3, C('gold', 4))
    cv.set(cx + 1, top_y - 3, C('gold', 3))
    cv.set(cx, top_y - 5, C('gold', 5))


def pinnacle(cv, x, top_y, base_y, ramp='stone_cool'):
    """Gothic corner pinnacle: a 6 px stone shaft with a little spire and gold tip."""
    R = lambda i: C(ramp, i)
    for y in range(top_y + 8, base_y):
        cv.set(x, y, R(1))
        cv.set(x + 1, y, R(4))
        cv.set(x + 2, y, R(3))
        cv.set(x + 3, y, R(3))
        cv.set(x + 4, y, R(2))
        cv.set(x + 5, y, R(0))
        if (y - top_y) % 6 == 0:
            for k in range(6):
                cv.set(x + k, y, R(1) if k in (0, 5) else R(5))
    for k in range(8):
        span = k // 3
        for xx in range(2 - span, 4 + span):
            cv.set(x + xx, top_y + k, C('roof_blue', 4) if xx < 3 else C('roof_blue', 2))
        cv.set(x + 2 - span - 1, top_y + k, C('roof_blue', 0)) if k > 2 else None
    cv.set(x + 2, top_y - 1, C('gold', 4))
    cv.set(x + 3, top_y - 1, C('gold', 3))
    cv.set(x + 2, top_y - 2, C('gold', 5))


def clock(cv, x, y, d):
    r = d / 2
    for yy in range(d):
        for xx in range(d):
            dx, dy = xx + 0.5 - r, yy + 0.5 - r
            dd = dx * dx + dy * dy
            if dd > r * r:
                continue
            cv.set(x + xx, y + yy, C('gold', 2) if dd > (r - 1.2) ** 2 else C('stone_warm', 5))
    for k in range(12):
        a = k / 12 * 2 * math.pi
        px = x + r + math.sin(a) * (r - 2.2) - 0.5
        py = y + r - math.cos(a) * (r - 2.2) - 0.5
        cv.set(int(round(px)), int(round(py)), C('wood', 1))
    cx, cy = x + d // 2, y + d // 2
    cv.set(cx, cy, C('wood', 1))
    for k in range(1, 4):
        cv.set(cx, cy - k, C('wood', 1))
    for k in range(1, 3):
        cv.set(cx + k, cy, C('wood', 1))


def tower_body(cv, x0, x1, y0, y1, ramp='stone_warm', seed=0):
    bld.stone_blocks(cv, x0, y0, x1 - x0, y1 - y0, ramp=ramp, seed=seed, course=5)
    R = lambda i: C(ramp, i)
    for y in range(y0, y1):
        cv.set(x0, y, R(1))
        cv.set(x0 + 1, y, R(4))
        cv.set(x1 - 1, y, R(0))
        cv.put(x1 - 2, y, SH(70))
        cv.put(x1 - 3, y, SH(35))


def cornice(cv, x0, x1, y, ramp='stone_warm'):
    R = lambda i: C(ramp, i)
    for xx in range(x0 - 2, x1 + 2):
        cv.set(xx, y - 1, R(5))
        cv.set(xx, y, R(3))
        cv.set(xx, y + 1, R(1))


# ====================================================================== prefabs
def house_small():
    def ext(cv, g):
        bld.flower_box(cv, g['wall_x0'] + 34, g['wall_y1'] - 13, 12, 'blossom')
    return house(4, 2, 2, 'roof_blue', style='slate', hip=3, seed=3,
                 door={'x': 9, 'w': 10, 'h': 17},
                 windows=[{'x': 35, 'y': 9, 'w': 10, 'h': 9, 'lit': False, 'shutters': 'roof_green'}],
                 chimney=(44, 6), timber=[22, 29], extras=ext)


def house_medium():
    return house(5, 3, 2, 'roof_green', style='clay', hip=4, seed=7, wall='timber', plaster='warm',
                 door={'x': 12, 'w': 10, 'h': 18},
                 windows=[{'x': 44, 'y': 10, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_red',
                           'box': 'blossom'}],
                 chimney=(55, 8), timber=[27, 36], gable={'cx': 48, 'half': 12, 'window_kind': 'small'})


def house_large():
    return house(6, 3, 3, 'roof_purple', style='slate', hip=4, seed=11,
                 door={'x': 39, 'w': 11, 'h': 18},
                 windows=[{'x': 9, 'y': 26, 'w': 10, 'h': 9, 'lit': True, 'box': 'cloth_purple'},
                          {'x': 66, 'y': 26, 'w': 10, 'h': 9, 'lit': False, 'box': 'blossom'},
                          {'x': 9, 'y': 7, 'w': 9, 'h': 9, 'lit': False},
                          {'x': 38, 'y': 7, 'w': 9, 'h': 9, 'lit': True},
                          {'x': 67, 'y': 7, 'w': 9, 'h': 9, 'lit': False}],
                 chimney=(14, 8, True), dormers=[30, 58], timber=[25, 52], moss=0.03)


def hero_home():
    def ext(cv, g):
        for y in range(g['wall_y0'] + 6, g['wall_y1'] - 2):
            for x in range(g['wall_x0'], g['wall_x0'] + 3 + (y % 3 == 0)):
                if rnd(x, y, 77) < 0.75:
                    cv.set(x, y, G(2) if (x + y) % 3 else G(3))
        bld.wall_lantern(cv, g['wall_x0'] + 23, g['wall_y1'] - 24)
    return house(5, 3, 2, 'roof_red', style='clay', hip=4, seed=5,
                 door={'x': 31, 'w': 11, 'h': 18},
                 windows=[{'x': 9, 'y': 12, 'w': 10, 'h': 9, 'lit': True, 'box': 'blossom'},
                          {'x': 52, 'y': 12, 'w': 10, 'h': 9, 'lit': True, 'box': 'cloth_purple'}],
                 chimney=(14, 9, True), gable={'cx': 39, 'half': 15, 'window_kind': 'round'},
                 timber=[26, 46], extras=ext)


def inn():
    def ext(cv, g):
        x0, y1 = g['wall_x0'], g['wall_y1']
        bld.hanging_sign(cv, x0 + 28, y1 - 33, 'mug', w=13, h=10)
        bld.wall_lantern(cv, x0 + 47, y1 - 30)
        bld.wall_lantern(cv, x0 + 78, y1 - 30)
    return house(8, 3, 3, 'roof_red', style='clay', hip=4, seed=13,
                 door={'x': 54, 'w': 20, 'h': 27, 'double': True, 'arch': True},
                 windows=[{'x': 10, 'y': 30, 'w': 12, 'h': 10, 'lit': True, 'box': 'blossom'},
                          {'x': 96, 'y': 30, 'w': 12, 'h': 10, 'lit': True, 'box': 'blossom'},
                          {'x': 10, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_green'},
                          {'x': 36, 'y': 8, 'w': 10, 'h': 10, 'lit': False, 'shutters': 'roof_green'},
                          {'x': 82, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_green'},
                          {'x': 104, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_green'}],
                 chimney=(102, 10, True), gable={'cx': 67, 'half': 18, 'window_kind': 'round'},
                 timber=[28, 52, 76, 98], extras=ext, depth=3)


def item_shop():
    def ext(cv, g):
        x0, y0, y1 = g['wall_x0'], g['wall_y0'], g['wall_y1']
        bld.window(cv, x0 + 6, y0 + 12, 24, 11, lit=True, mullion=False)
        for i, col in enumerate(['roof_red', 'magic_cyan', 'gold', 'roof_green', 'cloth_purple', 'roof_red']):
            px = x0 + 9 + i * 3
            cv.set(px, y0 + 18, C(col, 3))
            cv.set(px, y0 + 19, C(col, 2))
            cv.set(px, y0 + 17, C('ice', 2))
        for xx in range(22):
            cv.set(x0 + 7 + xx, y0 + 20, WD(2))
        bld.awning(cv, x0 + 3, y0 + 5, 30, 'roof_green')
        bld.hanging_sign(cv, x0 + 36, y0 + 9, 'potion', w=11, h=10)
        goods_crate(cv, x0 + 5, y1 - 9, 'roof_red')
        goods_crate(cv, x0 + 17, y1 - 9, 'gold')
    return house(5, 3, 2, 'roof_green', style='slate', hip=4, seed=17, wall='timber',
                 door={'x': 52, 'w': 11, 'h': 18}, timber=[36, 48], extras=ext, chimney=(8, 6))


def bakery():
    def ext(cv, g):
        x0, y0, y1 = g['wall_x0'], g['wall_y0'], g['wall_y1']
        bld.window(cv, x0 + 6, y0 + 12, 22, 11, lit=True, mullion=False)
        for i in range(4):
            bx = x0 + 8 + i * 5
            cv.stamp(['.bb.', 'bBBb', 'bbbb'], bx, y0 + 17, {'b': WD(3), 'B': WD(4)})
        bld.awning(cv, x0 + 3, y0 + 5, 28, 'roof_red')
        bld.hanging_sign(cv, x0 + 34, y0 + 9, 'bread', w=12, h=9)
    return house(5, 3, 2, 'roof_red', style='slate', hip=4, seed=19, wall='timber', plaster='warm',
                 door={'x': 49, 'w': 11, 'h': 18}, timber=[34, 46], extras=ext, chimney=(54, 10, True))


def smithy():
    def pre(cv, g):
        x0, y0, y1 = g['wall_x0'], g['wall_y0'], g['wall_y1']
        bx, bw, bh = x0 + 8, 30, 22
        by = y1 - bh
        for yy in range(bh):
            for xx in range(bw):
                cv.set(bx + xx, by + yy, DARK if yy > 2 else C('shadow', 1))
        for xx in range(-2, bw + 2):
            cv.set(bx + xx, by - 2, WD(2))
            cv.set(bx + xx, by - 1, WD(1))
        for yy in range(-2, bh):
            cv.set(bx - 2, by + yy, WD(2))
            cv.set(bx - 1, by + yy, WD(1))
            cv.set(bx + bw, by + yy, WD(1))
            cv.set(bx + bw + 1, by + yy, WD(1))
        for xx in range(4, 16):
            for yy in range(bh - 8, bh - 2):
                d = abs(xx - 10) + abs(yy - (bh - 4)) * 1.5
                if d < 4:
                    cv.set(bx + xx, by + yy, C('fire', 4) if d < 2 else C('fire', 3))
                elif d < 6.5:
                    cv.set(bx + xx, by + yy, C('fire', 1))
        cv.stamp(['mmmmmmm', '.mmmmm.', '...m...', '..mmm..'], bx + 18, by + bh - 7, {'m': C('stone_cool', 1)})
        for xx in range(bw):
            cv.set(bx + xx, by + bh - 1, C('stone_cool', 1))
        bld.hanging_sign(cv, x0 + 46, y0 + 8, 'hammer', w=11, h=10)
    return house(6, 3, 2, 'stone_cool', style='slate', hip=4, seed=23, wall='stone',
                 door={'x': 68, 'w': 10, 'h': 17, 'arch': False}, pre_roof=pre, chimney=(10, 12, True))


def library():
    W, H = 11 * 16, 9 * 16
    cv = Canvas(W, H)
    roof_y = 32
    hx0, hx1 = 32, 160
    wall_x0, wall_x1 = hx0 + 3, hx1 - 3
    wall_y0 = roof_y + 48 - 4
    ww, wh = wall_x1 - wall_x0, H - wall_y0
    draw_wall(cv, 'stone_cool', wall_x0, wall_y0, ww, wh, seed=29)
    for xx in range(ww):
        cv.set(wall_x0 + xx, wall_y0 + 30, C('stone_cool', 5))
        cv.set(wall_x0 + xx, wall_y0 + 31, C('stone_cool', 2))
    for wx in (wall_x0 + 6, wall_x0 + 25, wall_x0 + 89):
        bld.window(cv, wx, wall_y0 + 9, 8, 19, lit=True, arch=True, frame='stone', mullion=False)
        for yy in range(wall_y0 + 12, wall_y0 + 27):
            cv.set(wx + 4, yy, C('stone_cool', 2))
        bld.window(cv, wx + 1, wall_y0 + 36, 6, 10, lit=True, arch=True, frame='stone', mullion=False)
    for bx in (wall_x0 + 38, wall_x0 + 80):
        bld.banner(cv, bx, wall_y0 + 6, 7, 26, 'cloth_blue')
    bld.door(cv, wall_x0 + 51, H - 32, w=22, h=28, arch=True, double=True, frame='stone')
    stone_steps(cv, wall_x0 + 49, H - 4, 26, n=1, ramp='stone_cool')
    bld.roof_side(cv, hx0, roof_y, hx1 - hx0, 50, 'roof_blue', hip=5, seed=29, style='slate')
    bld.eave_shadow(cv, wall_x0, roof_y + 50, ww)
    bld.gable_front(cv, wall_x0 + 62, roof_y + 50, 22, 'roof_blue', wall='stone', timber=False)
    rose_window(cv, wall_x0 + 56, roof_y + 34, 13)
    # slender fleche on the ridge above the entrance
    fx = wall_x0 + 62
    for y in range(roof_y - 6, roof_y + 3):
        for x in range(fx - 4, fx + 5):
            c = C('stone_cool', 4) if x < fx else C('stone_cool', 2)
            if x in (fx - 4, fx + 4):
                c = C('stone_cool', 0)
            cv.set(x, y, c)
    for y in range(roof_y - 4, roof_y + 1):
        cv.set(fx - 1, y, C('gold', 4))
        cv.set(fx, y, C('gold', 5) if y < roof_y - 1 else C('gold', 4))
        cv.set(fx + 1, y, C('gold', 3))
    spire(cv, fx, roof_y - 22, roof_y - 6, 6, 'roof_blue')
    # right corner turret
    rx0, rx1, ry0 = 134, 160, 62
    tower_body(cv, rx0, rx1, ry0, H, 'stone_cool', seed=33)
    bld.window(cv, rx0 + 9, ry0 + 10, 8, 13, lit=True, arch=True, frame='stone', mullion=False)
    bld.window(cv, rx0 + 10, ry0 + 46, 6, 10, lit=True, arch=True, frame='stone', mullion=False)
    cornice(cv, rx0, rx1, ry0, 'stone_cool')
    spire(cv, (rx0 + rx1) // 2, 14, ry0 - 1, 16, 'roof_blue')
    tx0, tx1, ty0 = 6, 42, 46
    tower_body(cv, tx0, tx1, ty0, H, 'stone_cool', seed=31)
    for (wx, wy) in ((tx0 + 13, ty0 + 12), (tx0 + 13, ty0 + 46)):
        bld.window(cv, wx, wy, 9, 14, lit=True, arch=True, frame='stone', mullion=False)
    cornice(cv, tx0, tx1, ty0, 'stone_cool')
    spire(cv, (tx0 + tx1) // 2, 2, ty0 - 1, 24, 'roof_blue')
    bld.banner(cv, tx0 + 26, ty0 + 30, 6, 18, 'cloth_blue')
    finish_shadow(cv, H - 48, H - 1)
    rows = 9
    fp = [[dx, dy] for dx in range(0, 10) for dy in range(-6, 1) if not (dx == 5 and dy == 0)]
    meta = {'rect_wh': [W, H], 'anchor': [0, rows - 1], 'footprint': fp, 'overheadRows': 2,
            'doorAt': [5, 0], 'collision': 'solid'}
    return cv, meta


def chapel_bell_tower():
    W, H = 9 * 16, 10 * 16
    cv = Canvas(W, H)
    roof_y = 64
    nx0, nx1 = 0, 80
    wall_x0, wall_x1 = nx0 + 3, nx1 - 3
    wall_y0 = roof_y + 48 - 4
    ww, wh = wall_x1 - wall_x0, H - wall_y0
    draw_wall(cv, 'stone', wall_x0, wall_y0, ww, wh, seed=37)
    for wx in (wall_x0 + 7, wall_x0 + 57):
        bld.window(cv, wx, wall_y0 + 10, 8, 18, lit=True, arch=True, frame='stone', mullion=False)
        for yy in range(wall_y0 + 12, wall_y0 + 27):
            cv.set(wx + 4, yy, S(2))
    bld.door(cv, wall_x0 + 26, H - 31, w=20, h=27, arch=True, double=True, frame='stone')
    stone_steps(cv, wall_x0 + 25, H - 4, 22, n=1)
    bld.roof_side(cv, nx0, roof_y, nx1 - nx0, 50, 'roof_purple', hip=4, seed=37, style='slate')
    bld.eave_shadow(cv, wall_x0, roof_y + 50, ww)
    bld.gable_front(cv, wall_x0 + 36, roof_y + 50, 20, 'roof_purple', wall='stone', timber=False)
    rose_window(cv, wall_x0 + 31, roof_y + 33, 11, ramp='stone_warm')
    tx0, tx1, ty0 = 84, 124, 58
    tower_body(cv, tx0, tx1, ty0, H, 'stone_warm', seed=41)
    by0, by1 = ty0 + 4, ty0 + 26
    bell = ['....g....',
            '...gGg...',
            '..gGGGg..',
            '..gGGGg..',
            '.gGGGGGg.',
            'ggggggggg',
            '....b....']
    for k, ax in enumerate((tx0 + 6, tx0 + 22)):
        aw = 13
        r = aw / 2
        for yy in range(by0, by1):
            for xx in range(aw):
                ry = yy - by0
                if ry < r and (xx + 0.5 - r) ** 2 + (ry - r) ** 2 > r * r:
                    continue
                cv.set(ax + xx, yy, DARK if ry > 2 else C('shadow', 1))
        cv.stamp(bell, ax + 2, by0 + 8, {'g': C('gold', 2), 'G': C('gold', 4) if k == 0 else C('gold', 3),
                                         'b': C('gold', 1)})
        cv.set(ax + 4, by0 + 9, C('gold', 5))
        for yy in range(by0 + 3, by0 + 8):
            cv.set(ax + 6, yy, C('wood', 1))
        for xx in range(aw):
            cv.set(ax + xx, by1, S(4))
    clock(cv, (tx0 + tx1) // 2 - 6, ty0 + 34, 13)
    for (wx, wy) in ((tx0 + 17, ty0 + 56), (tx0 + 17, ty0 + 76)):
        bld.window(cv, wx, wy, 6, 11, lit=False, arch=True, frame='stone', mullion=False)
    cornice(cv, tx0, tx1, ty0)
    spire(cv, (tx0 + tx1) // 2, 8, ty0 - 1, 25, 'roof_purple')
    finish_shadow(cv, H - 48, H - 1)
    rows = 10
    fp = [[dx, dy] for dx in range(0, 5) for dy in range(-5, 1)]
    fp += [[dx, dy] for dx in range(5, 8) for dy in range(-6, 1)]
    fp = [p for p in fp if p != [2, 0]]
    meta = {'rect_wh': [W, H], 'anchor': [0, rows - 1], 'footprint': fp, 'overheadRows': 3,
            'doorAt': [2, 0], 'collision': 'solid'}
    return cv, meta


def town_gate():
    W, H = 7 * 16, 4 * 16
    cv = Canvas(W, H)
    for (x0, x1) in ((0, 16), (80, 96)):
        bld.stone_blocks(cv, x0, H - 14, x1 - x0, 14, seed=43, course=4)
        for xx in range(x0, x1):
            cv.set(xx, H - 15, S(5))
            cv.set(xx, H - 16, S(3))
    for px in (16, 64):
        tower_body(cv, px, px + 16, 18, H, seed=47 + px)
        cornice(cv, px + 1, px + 15, 16)
        bld.wall_lantern(cv, px + 5, 24)
    for xx in range(14, 82):
        cv.set(xx, 12, WD(2))
        cv.set(xx, 13, WD(1))
        cv.set(xx, 14, WD(1))
    bld.roof_side(cv, 10, 0, 76, 13, 'roof_red', hip=3, style='clay', seed=43)
    for yy in range(16, 26):
        for xx in range(34, 62):
            c = WD(3) if yy not in (16, 25) and xx not in (34, 61) else WD(1)
            if yy == 17 and xx not in (34, 61):
                c = WD(4)
            cv.set(xx, yy, c)
    for xx in range(37, 59, 3):
        cv.set(xx, 20, GOLD(4))
        cv.set(xx + 1, 21, GOLD(3))
    cv.set(38, 15, M(1))
    cv.set(57, 15, M(1))
    finish_shadow(cv, H - 16, H - 1, width=5)
    meta = {'rect_wh': [W, H], 'anchor': [0, 3], 'footprint': [[0, 0], [1, 0], [4, 0], [5, 0]],
            'overheadRows': 3, 'doorAt': None, 'collision': 'solid'}
    return cv, meta


PREFABS = {
    'house_small': house_small,
    'house_medium': house_medium,
    'house_large': house_large,
    'hero_home': hero_home,
    'inn': inn,
    'item_shop': item_shop,
    'smithy': smithy,
    'bakery': bakery,
    'library': library,
    'chapel_bell_tower': chapel_bell_tower,
    'town_gate': town_gate,
}
