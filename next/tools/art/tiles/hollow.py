"""The Nameless Hollow / Hollowmere town kit, the Fading Road and the mere -> assets/tiles/hollow.png
(E2-tiles, EPISODE2_PLAN 4.1, 4.2 and 9.1).

The Hollow is Willowmere in a silverglass and slate palette swap: the same prefab builders (prefabs.py, bld.py),
then every warm colour moved to the cool ramps (timber to slate, cream plaster to silver-white, honey stone to
cool stone, lamplight to a cold ice glow, flower boxes to violet), roofs in blue slate, grey slate and silver.
Every shop sign is a blank board (`sign_blank`) at a tile-aligned cell recorded on the prefab as `signAt`
(relative to the anchor, like doorAt); the lettered Hollowmere sign (`sign_hollow_<kind>`) covers that board
exactly when drawn on the same cell. The clocktower's face has no hands; `clock_hands` (32 x 32) covers the
face exactly at the prefab's `handsAt` cell (its top-left).

Terrain: `mere_water` (A1, 3 frames, slow, reflect: true): still, dark violet-blue water with long silver sheen
lines, the bank like the river's.
"""
import math
import numpy as np
from PIL import Image
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc, ASSETS, NEXT, RAMPS
import os
import bld
import prefabs
from prefabs import house, draw_wall, finish_shadow, stone_steps, tower_body, cornice, spire, rose_window
from kit import Sheet, roof_chunk, cut
from terrain import Water, blank
from court_kit import K, MT, ICE, WA, RB, CY, VI, CP, INK, GD

WDc = lambda i: C('wood', i)

# ---------------------------------------------------------------------- the silverglass palette swap
_SWAP = {
    # wood -> slate
    '#2d1b1f': K(0), '#482826': K(1), '#6e3d2c': K(2), '#8f5533': K(3), '#b87942': K(4), '#d69c57': K(5),
    # honey stone -> cool stone, cream plaster -> silver-white
    '#584951': K(2), '#7e6d6e': K(3), '#a18f85': K(4), '#cfb89c': K(5), '#ebdfc8': MT(3),
    '#ae8458': K(4), '#c3a57c': K(5), '#e4cb96': MT(3), '#f6e4b9': MT(4),
    '#6a4532': K(2), '#896042': K(3),
    # lamplight and fire -> cold glass glow
    '#571f28': CP(1), '#b34532': CY(1), '#e06b39': CY(2), '#eba14d': CY(3), '#f9d77a': ICE(2),
    '#fff7d6': ICE(3), '#c38334': K(4),
    # flower boxes -> violet
    '#a83a6e': CP(3), '#e070a0': VI(2), '#fcc4dc': VI(3),
    # red roof leftovers
    '#87332e': K(2),
}
SWAP = {hexc(k)[:3]: v for k, v in _SWAP.items()}
SILVER_ROOF = {hexc(h)[:3]: c for h, c in zip(RAMPS['roof_blue'], [K(2), K(3), K(4), K(5), MT(3)])}


def swap(cv, extra=None):
    """Recolour every opaque pixel through SWAP (+ extra); translucent shadows are left alone."""
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


class no_signs:
    """Context: the prefab builders draw no hanging signs (the Hollow's boards are added tile-aligned)."""
    def __enter__(self):
        self._hs = bld.hanging_sign
        bld.hanging_sign = lambda *a, **k: None
        return self

    def __exit__(self, *exc):
        bld.hanging_sign = self._hs


# ---------------------------------------------------------------------- signs
BOARD = (2, 4, 12, 10)          # board rect inside its 16 x 16 cell (bracket above it)


def sign_board(cv, ox, oy, fill='blank'):
    """Draw a hanging sign in the 16 x 16 cell at (ox, oy): iron bracket, board, cast shadow.
    fill: 'blank' (bare grey board), or a restored sign kind (painted board with a silver emblem)."""
    bx, by, w, h = BOARD
    x0, y0 = ox + bx, oy + by
    for xx in range(w + 4):
        cv.set(x0 - 2 + xx, y0 - 3, MT(1))
    cv.set(x0 - 2, y0 - 4, MT(1))
    cv.set(x0 + 2, y0 - 2, K(1))
    cv.set(x0 + w - 3, y0 - 2, K(1))
    restored = fill != 'blank'
    face = {'inn': RB(2), 'shop': CP(2), 'smithy': K(1), 'chapel': CP(1), 'hall': RB(1)}.get(fill, K(3))
    for yy in range(h):
        for xx in range(w):
            if yy in (0, h - 1) or xx in (0, w - 1):
                c = K(1) if not restored else MT(1)
            elif yy == 1:
                c = K(4) if not restored else K(5)
            else:
                c = face if restored else (K(3) if (xx + yy * 3) % 7 else K(2))
            cv.set(x0 + xx, y0 + yy, c)
    for xx in range(w):
        cv.put(x0 + xx + 1, y0 + h, SH(70))
    if not restored:
        # a faint ghost of the old lettering, sanded off
        for xx in range(3, w - 3):
            if xx % 2:
                cv.set(x0 + xx, y0 + 5, K(2))
        return
    icons = {
        'inn': ['..ww..', '.gggg.', '.gGGg.', '.gGGg.', '..gg..'],
        'shop': ['..dd..', '.rRRr.', 'rRWRRr', '.rRRr.', '..rr..'],
        'smithy': ['MMMM..', 'MmmM..', '..w...', '..w...', '..w...'],
        'chapel': ['..g...', '.ggg..', '.gGg..', 'gGGGg.', 'ggggg.'],
        'hall': ['.pppp.', 'pWWWWp', 'pWkkWp', 'pWWWWp', '.pppp.'],
    }
    cmaps = {
        'inn': {'w': MT(4), 'g': MT(3), 'G': WHITE},
        'shop': {'d': ICE(2), 'r': CY(1), 'R': CY(2), 'W': WHITE},
        'smithy': {'M': MT(3), 'm': K(4), 'w': K(5)},
        'chapel': {'g': MT(3), 'G': WHITE},
        'hall': {'p': MT(3), 'W': ICE(2), 'k': RB(2)},
    }
    rows = icons[fill]
    cv.stamp(rows, x0 + (w - len(rows[0])) // 2, y0 + 2, cmaps[fill])
    # the painted name under the emblem, as a line of tiny silver script
    for xx in range(2, w - 2):
        if (xx * 5) % 3:
            cv.set(x0 + xx, y0 + h - 2, MT(3))


def sign_tile(fill):
    cv = Canvas(16, 16)
    sign_board(cv, 0, 0, fill)
    return cv


def gate_sign(fill):
    """The gate's board (32 x 16, board rows 0..10 so it hangs under the gate's beam): blank, or Hollowmere's
    restored board (a looking glass over the mere, silver script either side)."""
    cv = Canvas(32, 16)
    restored = fill != 'blank'
    for yy in range(0, 11):
        for xx in range(2, 30):
            if yy in (0, 10) or xx in (2, 29):
                c = K(1) if not restored else MT(1)
            elif yy == 1:
                c = K(4) if not restored else K(5)
            else:
                c = (K(3) if (xx + yy * 3) % 7 else K(2)) if not restored else RB(2)
            cv.set(xx, yy, c)
    for xx in range(3, 31):
        cv.put(xx, 11, SH(70))
    if not restored:
        for xx in range(6, 26):
            if xx % 2 == 0:
                cv.set(xx, 5, K(2))
        return cv
    def mirror(dx, dy, d):
        return MT(3) if d > 0.7 else (WHITE if dx + dy < -0.5 else ICE(2))
    ellipse_px(cv, 16, 4.5, 3.2, 2.9, mirror)
    cv.set(16, 8, MT(3))
    for xx in range(5, 12):
        cv.set(xx, 4 + (xx % 2), MT(3))
        cv.set(xx + 15, 4 + (xx % 2), MT(3))
    for xx in range(5, 28):
        if xx % 3 and not 13 <= xx <= 19:
            cv.set(xx, 8, ICE(1))
    return cv


def ellipse_px(cv, cx, cy, rx, ry, fn):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = math.sqrt(dx * dx + dy * dy)
            if d <= 1.0:
                c = fn(dx, dy, d)
                if c is not None:
                    cv.put(x, y, c)


def chalk_crown():
    """Nico's chalk crown (16 x 16 decal): a child's crown drawn in chalk, wobbly, a star over it."""
    cv = Canvas(16, 16)
    ch = (C('metal', 4)[0], C('metal', 4)[1], C('metal', 4)[2], 220)
    pts = [(3, 11), (3, 6), (5, 9), (8, 4), (11, 9), (13, 6), (13, 11), (3, 11)]
    for a, b in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = a, b
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n)
            y = round(y0 + (y1 - y0) * k / n)
            cv.put(x, y, ch)
    for x in range(4, 13):
        if x % 3 != 1:
            cv.put(x, 9 + (x % 2), (ch[0], ch[1], ch[2], 140))
    for (x, y) in ((8, 1), (7, 2), (9, 2), (8, 3)):
        cv.put(x, y, (ch[0], ch[1], ch[2], 170))
    return cv


def clock_face(cv, x, y, d, hands=False):
    """A silver clock face with hour marks; no hands unless asked."""
    r = d / 2
    for yy in range(d):
        for xx in range(d):
            dx, dy = xx + 0.5 - r, yy + 0.5 - r
            dd = dx * dx + dy * dy
            if dd > r * r:
                continue
            c = K(3) if dd > (r - 1.2) ** 2 else (MT(4) if dx + dy < -r * 0.6 else MT(3))
            cv.set(x + xx, y + yy, c)
    for k in range(12):
        a = k / 12 * 2 * math.pi
        px = x + r + math.sin(a) * (r - 2.4) - 0.5
        py = y + r - math.cos(a) * (r - 2.4) - 0.5
        cv.set(int(round(px)), int(round(py)), K(1) if k % 3 else DARK)


def clock_hands():
    """32 x 32 overlay that sits on the clocktower's face (at the prefab's handsAt cell): hands at ten past
    four (Lena: "Ten past four!"), drawn dark with a lit pin."""
    cv = Canvas(32, 32)
    cx, cy = 15.5, 15.5
    for (ang, L) in ((4 * 30 + 5, 4.6), (2 * 30, 6.8)):   # hour hand a little past 4, minute hand on the 2
        a = math.radians(ang)
        for k in range(1, int(L * 2) + 1):
            t = k / 2
            x = cx + math.sin(a) * t
            y = cy - math.cos(a) * t
            cv.set(int(math.floor(x)), int(math.floor(y)), DARK if L > 5 else K(0))
    cv.set(15, 15, GD(4))
    cv.set(16, 15, GD(3))
    return cv


# ---------------------------------------------------------------------- prefabs
def with_sign(cv, meta, cell, kind='blank'):
    """Hang the blank board at rect tile `cell` and record signAt relative to the anchor."""
    tx, ty = cell
    sign_board(cv, tx * 16, ty * 16, kind)
    ax, ay = meta['anchor']
    meta['signAt'] = [tx - ax, ty - ay]
    return cv, meta


def house_hollow_s():
    with no_signs():
        cv, meta = house(4, 2, 2, 'roof_blue', style='slate', hip=3, seed=53,
                         door={'x': 9, 'w': 10, 'h': 17},
                         windows=[{'x': 35, 'y': 9, 'w': 10, 'h': 9, 'lit': True, 'shutters': 'roof_blue'}],
                         chimney=(44, 6), timber=[22, 29],
                         extras=lambda cv, g: bld.flower_box(cv, g['wall_x0'] + 34, g['wall_y1'] - 13, 12, 'blossom'))
    return swap(cv), meta


def house_hollow_m():
    with no_signs():
        cv, meta = house(5, 3, 2, 'stone_cool', style='slate', hip=4, seed=57, wall='timber',
                         door={'x': 12, 'w': 10, 'h': 18},
                         windows=[{'x': 44, 'y': 10, 'w': 10, 'h': 10, 'lit': False, 'shutters': 'roof_blue',
                                   'box': 'blossom'}],
                         chimney=(55, 8), timber=[27, 36], gable={'cx': 48, 'half': 12, 'window_kind': 'small'})
    return swap(cv), meta


def inn_hollow():
    def ext(cv, g):
        x0, y1 = g['wall_x0'], g['wall_y1']
        bld.wall_lantern(cv, x0 + 47, y1 - 30)
        bld.wall_lantern(cv, x0 + 78, y1 - 30)
    with no_signs():
        cv, meta = house(8, 3, 3, 'roof_blue', style='slate', hip=4, seed=63,
                         door={'x': 54, 'w': 20, 'h': 27, 'double': True, 'arch': True},
                         windows=[{'x': 10, 'y': 30, 'w': 12, 'h': 10, 'lit': True, 'box': 'blossom'},
                                  {'x': 96, 'y': 30, 'w': 12, 'h': 10, 'lit': True, 'box': 'blossom'},
                                  {'x': 10, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_blue'},
                                  {'x': 36, 'y': 8, 'w': 10, 'h': 10, 'lit': False, 'shutters': 'roof_blue'},
                                  {'x': 82, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_blue'},
                                  {'x': 104, 'y': 8, 'w': 10, 'h': 10, 'lit': False, 'shutters': 'roof_blue'}],
                         chimney=(102, 10, True), gable={'cx': 67, 'half': 18, 'window_kind': 'round'},
                         timber=[28, 52, 76, 98], extras=ext, depth=3)
    swap(cv)
    return with_sign(cv, meta, (2, 5))


def shop_hollow():
    def ext(cv, g):
        x0, y0, y1 = g['wall_x0'], g['wall_y0'], g['wall_y1']
        bld.window(cv, x0 + 6, y0 + 12, 24, 11, lit=True, mullion=False)
        for i, col in enumerate(['magic_cyan', 'cloth_purple', 'ice', 'magic_violet', 'magic_cyan', 'roof_blue']):
            px = x0 + 9 + i * 3
            cv.set(px, y0 + 18, C(col, 3))
            cv.set(px, y0 + 19, C(col, 2))
            cv.set(px, y0 + 17, C('ice', 2))
        for xx in range(22):
            cv.set(x0 + 7 + xx, y0 + 20, WDc(2))
        bld.awning(cv, x0 + 3, y0 + 5, 30, 'cloth_purple')
        prefabs.goods_crate(cv, x0 + 5, y1 - 9, 'cloth_blue')
        prefabs.goods_crate(cv, x0 + 17, y1 - 9, 'magic_violet')
    with no_signs():
        cv, meta = house(5, 3, 2, 'stone_cool', style='slate', hip=4, seed=67, wall='timber',
                         door={'x': 52, 'w': 11, 'h': 18}, timber=[36, 48], extras=ext, chimney=(8, 6))
    swap(cv)
    return with_sign(cv, meta, (2, 4))


def smithy_hollow():
    """The Silverglass Smithy: Willowmere's smithy with a glass furnace (the fire swaps to a cold cyan glow)."""
    with no_signs():
        cv, meta = prefabs.smithy()
    swap(cv)
    return with_sign(cv, meta, (3, 4))


def hall_hollow():
    """The Mayor's Hall: the library under silver roofs, the banners blank grey, a blank board by the door."""
    cv, meta = prefabs.library()
    blank_banner = {hexc(h)[:3]: c for h, c in zip(RAMPS['cloth_blue'],
                                                    [K(0), K(1), K(2), K(3), K(4)])}
    # roofs and spires silver, banners faded to grey, then the warm swap
    swap(cv, extra={**SILVER_ROOF, **blank_banner})
    return with_sign(cv, meta, (7, 7))


def chapel_hollow():
    """The Hollow's chapel: Willowmere's chapel and bell tower, the bells gone (an empty frame and a hanging
    rope), no clock (a round window in its place), violet slate."""
    W, H = 9 * 16, 10 * 16
    cv = Canvas(W, H)
    roof_y = 64
    nx0, nx1 = 0, 80
    wall_x0, wall_x1 = nx0 + 3, nx1 - 3
    wall_y0 = roof_y + 48 - 4
    ww, wh = wall_x1 - wall_x0, H - wall_y0
    S = lambda i: C('stone_warm', i)
    draw_wall(cv, 'stone', wall_x0, wall_y0, ww, wh, seed=77)
    for wx in (wall_x0 + 7, wall_x0 + 57):
        bld.window(cv, wx, wall_y0 + 10, 8, 18, lit=True, arch=True, frame='stone', mullion=False)
        for yy in range(wall_y0 + 12, wall_y0 + 27):
            cv.set(wx + 4, yy, S(2))
    bld.door(cv, wall_x0 + 26, H - 31, w=20, h=27, arch=True, double=True, frame='stone')
    stone_steps(cv, wall_x0 + 25, H - 4, 22, n=1)
    bld.roof_side(cv, nx0, roof_y, nx1 - nx0, 50, 'roof_purple', hip=4, seed=77, style='slate')
    bld.eave_shadow(cv, wall_x0, roof_y + 50, ww)
    bld.gable_front(cv, wall_x0 + 36, roof_y + 50, 20, 'roof_purple', wall='stone', timber=False)
    rose_window(cv, wall_x0 + 31, roof_y + 33, 11, ramp='stone_warm')
    tx0, tx1, ty0 = 84, 124, 58
    tower_body(cv, tx0, tx1, ty0, H, 'stone_warm', seed=81)
    by0, by1 = ty0 + 4, ty0 + 26
    for k, ax in enumerate((tx0 + 6, tx0 + 22)):
        aw = 13
        r = aw / 2
        for yy in range(by0, by1):
            for xx in range(aw):
                ry = yy - by0
                if ry < r and (xx + 0.5 - r) ** 2 + (ry - r) ** 2 > r * r:
                    continue
                cv.set(ax + xx, yy, DARK if ry > 2 else C('shadow', 1))
        # the empty frame: a yoke beam with nothing hanging, one loose rope
        for xx in range(2, aw - 2):
            cv.set(ax + xx, by0 + 6, WDc(2))
            cv.set(ax + xx, by0 + 7, WDc(1))
        cv.set(ax + 3, by0 + 8, WDc(1)); cv.set(ax + aw - 4, by0 + 8, WDc(1))
        if k == 0:
            for yy in range(by0 + 8, by1 - 1):
                cv.set(ax + 6, yy, C('sand', 1) if yy % 3 else C('sand', 0))
        for xx in range(aw):
            cv.set(ax + xx, by1, S(4))
    # a round window where Willowmere has its clock
    bld.round_window(cv, (tx0 + tx1) // 2 - 5, ty0 + 35, 11, lit=False)
    for (wx, wy) in ((tx0 + 17, ty0 + 56), (tx0 + 17, ty0 + 76)):
        bld.window(cv, wx, wy, 6, 11, lit=False, arch=True, frame='stone', mullion=False)
    cornice(cv, tx0, tx1, ty0)
    spire(cv, (tx0 + tx1) // 2, 8, ty0 - 1, 25, 'roof_purple')
    finish_shadow(cv, H - 48, H - 1)
    swap(cv)
    rows = 10
    fp = [[dx, dy] for dx in range(0, 5) for dy in range(-5, 1)]
    fp += [[dx, dy] for dx in range(5, 8) for dy in range(-6, 1)]
    fp = [p for p in fp if p != [2, 0]]
    meta = {'rect_wh': [W, H], 'anchor': [0, rows - 1], 'footprint': fp, 'overheadRows': 3,
            'doorAt': [2, 0], 'collision': 'solid'}
    return with_sign(cv, meta, (5, 8))


def clocktower():
    """Lena's clocktower (4 x 9 tiles + shadow column): a tall slender tower of cool stone, a great silver clock
    face WITHOUT hands (the clock_hands overlay restores them), a louvred belfry, a silver spire, a door."""
    W, H = 5 * 16, 9 * 16
    cv = Canvas(W, H)
    tx0, tx1, ty0 = 6, 58, 50
    tower_body(cv, tx0, tx1, ty0, H, 'stone_cool', seed=91)
    cornice(cv, tx0, tx1, ty0, 'stone_cool')
    # belfry louvres
    for bx in (tx0 + 9, tx0 + 31):
        for yy in range(ty0 + 5, ty0 + 17):
            for xx in range(12):
                if yy < ty0 + 8 and (xx + 0.5 - 6) ** 2 + (yy - ty0 - 8) ** 2 * 2.5 > 36:
                    continue
                c = DARK if (yy - ty0) % 3 else K(2)
                if xx in (0, 11):
                    c = K(1)
                cv.set(bx + xx, yy, c)
    # cornice band under the clock
    for xx in range(tx0, tx1):
        cv.set(xx, ty0 + 20, K(5))
        cv.set(xx, ty0 + 21, K(2))
    # the clock face, centred in the 32 x 32 cell at rect tile (1, 4)
    hx, hy = 1, 4
    fx, fy = hx * 16, hy * 16
    ellipse_px(cv, fx + 16, fy + 16, 13, 13, lambda dx, dy, d: (MT(3) if dx + dy < 0 else K(3)) if d > 0.86 else None)
    clock_face(cv, fx + 4, fy + 4, 24)
    # tall window and the door
    bld.window(cv, tx0 + 21, ty0 + 47, 10, 13, lit=True, arch=True, frame='stone', mullion=False)
    bld.door(cv, tx0 + 20, H - 26, w=12, h=22, arch=True, frame='stone')
    stone_steps(cv, tx0 + 18, H - 4, 16, n=1, ramp='stone_cool')
    spire(cv, (tx0 + tx1) // 2, 2, ty0 - 1, 30, 'roof_blue')
    finish_shadow(cv, H - 32, H - 1)
    swap(cv, extra=SILVER_ROOF)
    rows = 9
    door_tx = (tx0 + 20 + 6) // 16
    fp = [[dx, dy] for dx in range(0, 4) for dy in range(-3, 1) if not (dx == door_tx and dy == 0)]
    meta = {'rect_wh': [W, H], 'anchor': [0, rows - 1], 'footprint': fp, 'overheadRows': rows - 4,
            'doorAt': [door_tx, 0], 'collision': 'solid', 'handsAt': [hx, hy - (rows - 1)]}
    return cv, meta


def gate_hollow():
    """The west gate: a low stone arch under a slate hood with the blank board (Willowmere's gate swapped)."""
    cv, meta = prefabs.town_gate()
    # repaint the board area blank: the gate board sits at rect (34..61, 16..25); cover it with the blank board
    for yy in range(14, 28):
        for xx in range(32, 64):
            if 16 <= yy <= 25 and 34 <= xx <= 61:
                cv.set(xx, yy, CLEAR_)
    swap(cv, extra={hexc(h)[:3]: c for h, c in zip(RAMPS['roof_red'],
                                                   [K(0), K(1), K(2), K(3), K(4), K(5)])})
    cv.blit(gate_sign('blank'), 32, 16)
    meta['signAt'] = [2, 1 - 3]
    meta['note'] = 'sign_hollow_gate (32 x 16) covers the blank board when drawn at signAt (its top-left cell)'
    return cv, meta


CLEAR_ = (0, 0, 0, 0)


def toll_ruin():
    """The Waystation's ruined toll house (6 x 4 tiles + shadow column): a roofless stone shell. The back wall
    stands two rows high with a broken top and the blank toll board, short side walls, the front wall fallen to
    a few courses with a gap in the middle; the floor inside is the map's own ground (walkable, a chest fits)."""
    W, H = 7 * 16, 4 * 16
    cv = Canvas(W, H)
    S = lambda i: C('stone_cool', i)

    def masonry(x0, y0, w, h, seed, top_profile=None):
        bld.stone_blocks(cv, x0, y0, w, h, ramp='stone_cool', seed=seed, course=4)
        if top_profile:
            for xx in range(w):
                cut_h = top_profile(xx)
                for yy in range(cut_h):
                    cv.set(x0 + xx, y0 + yy, CLEAR_)
                if cut_h < h:
                    cv.set(x0 + xx, y0 + cut_h, S(5))
    # back wall: rows 0..1, broken top edge
    masonry(4, 2, 88, 28, 101, lambda xx: int(3 + 4 * abs(math.sin(xx * 0.21 + 1.3)) + (h32(xx // 3, 102) % 3)))
    for yy in range(26, 30):
        for xx in range(4, 92):
            if cv.get(xx, yy)[3]:
                cv.put(xx, yy, SH(60 if yy < 28 else 90))
    # side walls (west, east): one tile wide, rows 1..3, broken tops
    masonry(4, 18, 12, 44, 103, lambda xx: 2 + xx // 3)
    masonry(80, 22, 12, 40, 104, lambda xx: 6 - xx // 3)
    # front wall stubs (row 3): left and right of the gap
    masonry(16, 52, 26, 10, 105, lambda xx: 2 + (h32(xx // 2, 106) % 4))
    masonry(58, 54, 22, 8, 107, lambda xx: 1 + (h32(xx // 2, 108) % 3))
    # the blank toll board on the back wall
    tb = Canvas(32, 16)
    for xx in range(1, 31):
        for yy in range(2, 14):
            c = K(3) if (xx + yy * 3) % 7 else K(2)
            if yy in (2, 13) or xx in (1, 30):
                c = K(1)
            if yy == 3:
                c = K(4)
            tb.set(xx, yy, c)
    for (xx, yy) in ((4, 4), (27, 4), (4, 11), (27, 11)):
        tb.set(xx, yy, MT(2))
    cv.blit(tb, 36, 9)
    # fallen stones and a broken beam in the gap
    for (xx, yy, w) in ((44, 58, 4), (50, 60, 5), (38, 61, 3)):
        for k in range(w):
            cv.set(xx + k, yy, S(4)); cv.set(xx + k, yy + 1, S(2))
    for k in range(14):
        cv.set(20 + k, 40 + k // 4, WDc(2) if k % 4 else WDc(1))
        cv.set(20 + k, 41 + k // 4, WDc(1))
    # moss
    for (xx, yy) in ((10, 20), (11, 21), (84, 24), (6, 58), (60, 55), (30, 6)):
        cv.set(xx, yy, C('grass', 2)); cv.set(xx + 1, yy, C('grass', 3))
    finish_shadow(cv, H - 48, H - 1, width=5)
    fp = [[dx, -3] for dx in range(6)] + [[dx, -2] for dx in range(6)]
    fp += [[0, -1], [5, -1], [0, 0], [1, 0], [2, 0], [4, 0], [5, 0]]
    meta = {'rect_wh': [W, H], 'anchor': [0, 3], 'footprint': fp, 'overheadRows': 0, 'doorAt': None,
            'collision': 'solid', 'note': 'roofless; interior cells (1..4, -1) and the gap (3, 0) are walkable'}
    return cv, meta


PREFABS = {
    'house_hollow_s': house_hollow_s, 'house_hollow_m': house_hollow_m, 'inn_hollow': inn_hollow,
    'shop_hollow': shop_hollow, 'smithy_hollow': smithy_hollow, 'hall_hollow': hall_hollow,
    'chapel_hollow': chapel_hollow, 'clocktower': clocktower, 'gate_hollow': gate_hollow, 'toll_ruin': toll_ruin,
}


# ---------------------------------------------------------------------- road and shore props
def cairn():
    """A waymarker cairn on the Fading Road (16 x 32 prop, 1 tile): stacked flat stones, a pale top stone that
    catches the light through the mist."""
    cv = Canvas(16, 32)
    stones = [(8, 28.5, 6.5, 2.6, 2), (7.5, 24.5, 5.2, 2.4, 3), (8.5, 20.8, 4.4, 2.1, 2), (7.8, 17.4, 3.4, 1.9, 4),
              (8.2, 14.4, 2.4, 1.5, 5)]
    for (cx, cy, rx, ry, tone) in stones:
        ellipse_px(cv, cx, cy, rx, ry, lambda dx, dy, d, t=tone: K(min(5, t + 1)) if dy < -0.35 else
                   (K(t) if dy < 0.45 else K(max(0, t - 2))))
    ellipse_px(cv, 10, 30.2, 7, 1.8, lambda dx, dy, d: SH(70))
    cv.set(7, 13, MT(3)); cv.set(8, 13, MT(4))
    cv.set(4, 27, C('grass', 2)); cv.set(5, 27, C('grass', 3)); cv.set(12, 26, C('grass', 2))
    return cv


def signpost_blank():
    """The east road's blank signpost (16 x 32 prop): weathered post, a board sanded clean."""
    cv = Canvas(16, 32)
    for y in range(8, 31):
        cv.set(7, y, K(4)); cv.set(8, y, K(2)); cv.set(9, y, K(1))
    board = ['bbbbbbbbbbbb',
             'bBBBBBBBBBBb',
             'bBhBBBBBBhBb',
             'bBBBBBBBBBBb',
             'bBBBBBBBBBBb',
             'bbbbbbbbbbbb']
    cv.stamp(board, 2, 9, {'b': K(1), 'B': K(3), 'h': K(2)})
    for x in range(3, 13):
        cv.set(x, 10, K(4))
    for x in range(6, 12):
        cv.put(x + 2, 31, SH(80))
    return cv


def floodwrack():
    """Flood wrack for the valley's washed-out ford (32 x 32 prop, 2 x 1): a tangle of driftwood, a broken
    plank and reeds caught on a stone."""
    cv = Canvas(32, 32)
    ellipse_px(cv, 17, 29.5, 15, 2.4, lambda dx, dy, d: SH(70))
    ellipse_px(cv, 22, 25, 6, 4, lambda dx, dy, d: C('stone_warm', 4) if dy < -0.3 else C('stone_warm', 3) if dy < 0.4 else C('stone_warm', 2))
    logs = [((1, 26), (29, 19), 3), ((4, 18), (27, 28), 2), ((8, 24), (20, 13), 2), ((14, 27), (31, 24), 2)]
    for (a, b, w) in logs:
        (x0, y0), (x1, y1) = a, b
        n = max(abs(x1 - x0), abs(y1 - y0))
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n)
            y = round(y0 + (y1 - y0) * k / n)
            for j in range(w):
                cv.set(x, y + j, WDc(4) if j == 0 else (WDc(3) if j < w - 1 else WDc(2)))
            cv.set(x, y + w, WDc(1))
        cv.set(x0, y0, WDc(2)); cv.set(x1, y1, WDc(5))
    # broken plank with a nail
    for k in range(9):
        cv.set(6 + k, 14, WDc(4)); cv.set(6 + k, 15, WDc(3)); cv.set(6 + k, 16, WDc(1))
    cv.set(9, 15, MT(1))
    for (x, y) in ((3, 20), (3, 21), (4, 22), (26, 15), (26, 16), (27, 14)):
        cv.set(x, y, C('grass', 3))
    cv.set(26, 13, C('grass', 4))
    return cv


def reeds(k):
    """Reeds for the mere shore (16 x 16 overlay): a clump of tall blades and two or three cattail heads, lit on
    the left, a dark wet base."""
    cv = Canvas(16, 16)
    blades = [[(2, 6, -1), (4, 2, 0), (6, 4, 1), (8, 1, 0), (10, 5, 1), (12, 3, 0), (13, 7, 1)],
              [(1, 5, 0), (3, 3, -1), (5, 6, 0), (7, 2, 1), (9, 4, 0), (11, 1, 1), (14, 5, 0)],
              [(2, 3, 0), (4, 6, 1), (6, 1, 0), (9, 3, -1), (11, 6, 0), (13, 2, 1)]][k]
    heads = [[(4, 2), (8, 1), (12, 3)], [(7, 2), (11, 1)], [(6, 1), (13, 2), (2, 3)]][k]
    for (x, ytop, lean) in blades:
        for y in range(ytop, 15):
            xx = x + (lean if y < ytop + 4 else 0)
            c = C('grass', 4) if y < ytop + 3 else (C('grass', 3) if y < 11 else C('grass', 2))
            cv.set(xx, y, c)
            if y > ytop + 5 and (x + y) % 4 == 0:
                cv.set(xx + 1, y, C('grass', 2))
    for (x, y) in heads:
        cv.set(x, y - 1, C('wood', 3)); cv.set(x, y, C('wood', 2)); cv.set(x, y + 1, C('wood', 2))
        cv.set(x + 1, y, C('wood', 1)); cv.set(x, y - 2, C('grass', 4))
    for x in range(0, 16):
        cv.set(x, 15, C('grass', 1) if x % 3 else C('foliage_dark', 0))
        if x % 2:
            cv.set(x, 14, C('grass', 2))
    return cv


def tree_birch_silver():
    """Silver birch: the props sheet's willow (read-only source) recoloured, white bark with dark marks, pale
    sage leaves flashing silver. 80 x 96 (5 x 6 tiles), footprint the 2 trunk tiles."""
    import json as _j
    sp = os.path.join(ASSETS, 'sprites')
    meta = _j.load(open(os.path.join(sp, 'props.json')))
    fx, fy, fw, fh = meta['objects']['tree_willow']['frame']
    ax, ay = meta['objects']['tree_willow']['anchor']
    im = np.asarray(Image.open(os.path.join(sp, meta['image'])).convert('RGBA'))[fy:fy + fh, fx:fx + fw].astype(np.int32)
    cv = Canvas(80, 96)
    # place so that the 2-tile footprint (px ax-16 .. ax+16 of the frame) sits on rect columns 2..3
    ox = 32 + 16 - ax
    oy = 96 - fh
    leaves = [C('foliage_dark', 0), C('foliage_dark', 1), C('roof_green', 2), C('roof_green', 3),
              C('roof_green', 4), C('grass', 4)]
    bark = [K(2), K(4), K(5), MT(3), MT(4)]
    for y in range(fh):
        for x in range(fw):
            r, g, b, a = im[y, x]
            if a < 128:
                continue
            lum = 0.3 * r + 0.59 * g + 0.11 * b
            greenish = g > r + 6 and g > b
            if greenish:
                i = min(len(leaves) - 1, int(lum / 215 * len(leaves)))
                c = leaves[i]
                # leaves flash silver where the willow's were brightest
                if lum > 185 and h32(x, y, 821) % 3 == 0:
                    c = K(5)
            else:
                i = min(len(bark) - 1, int(lum / 70 * len(bark)))
                c = bark[i]
                # the birch's dark marks: short horizontal dashes
                if h32(x // 3, y // 2, 822) % 6 == 0:
                    c = K(0)
            cv.set(ox + x, oy + y, c)
    return cv


def court_far():
    """The Court seen across the mere (128 x 96 decal, 8 x 6 tiles, overhead layer, collision none): the mirror
    palace of environments.webp cell 1 drawn as a distant silhouette in three flat night tones (far towers in
    haze, near arcades darker), the glass towers catching the moon, lit windows; its reflection lies on the water
    below as a faint translucent dither (the mere shows through)."""
    cv = Canvas(128, 96)
    FAR, MID, NEAR = INK(3), INK(2), INK(1)
    base = 78                                   # waterline

    def rect(x0, y0, x1, y1, c):
        for y in range(max(0, y0), min(base, y1)):
            for x in range(max(0, x0), min(128, x1)):
                cv.set(x, y, c)

    def gothic(cx, top, w, c, win=None, spire=10):
        """A tower: a body w wide from top + spire down, a needle spire, two pinnacles at its shoulders."""
        body = top + spire
        for y in range(top, base):
            if y < body:
                half = (y - top) / spire * (w / 2 - 1) + 0.5
            else:
                half = w / 2
            for x in range(int(round(cx - half)), int(round(cx + half))):
                if 0 <= x < 128:
                    cv.set(x, y, c)
        for px in (int(cx - w / 2), int(cx + w / 2) - 1):
            for y in range(body - 4, body):
                if 0 <= px < 128:
                    cv.set(px, y, c)
        if win:
            for y in range(body + 3, base - 8, 6):
                cv.set(int(cx), y, win)
                cv.set(int(cx) - 1, y, win) if w > 6 else None

    def shard(x0, top, w, slant):
        """A glass tower like a standing shard: slanted top edge, lit left face, a long moon streak."""
        for x in range(x0, x0 + w):
            gx = x - x0
            t0 = top + (gx * slant if slant > 0 else (w - 1 - gx) * -slant)
            for y in range(int(t0), base):
                c = RB(2) if gx > 1 else ICE(1)
                if gx == w - 1:
                    c = RB(1)
                if y < t0 + 2:
                    c = ICE(2) if gx < w - 1 else ICE(1)
                if gx > 1 and (y - top + gx * 2) % 11 == 0:
                    c = RB(3)
                cv.set(x, y, c)
        for y in range(top + 4, top + 4 + (base - top) // 2):
            if (y - top) % 2:
                cv.set(x0 + 1, y, ICE(2))
        cv.set(x0 + (0 if slant > 0 else w - 1), top, WHITE)
    # far layer: towers in haze
    for (cx, top, w, sp) in ((14, 30, 7, 9), (34, 24, 6, 10), (58, 16, 8, 14), (90, 26, 6, 10), (110, 34, 7, 9),
                             (72, 34, 5, 8)):
        gothic(cx, top, w, FAR, None, sp)
    rect(4, 54, 124, 78, FAR)
    # the glass towers
    shard(44, 4, 9, 1)
    shard(79, 14, 8, -1)
    shard(23, 26, 6, 1)
    # mid layer: gothic towers and a two-tier arcade of pointed arches
    for (cx, top, w, sp) in ((8, 38, 8, 12), (64, 30, 7, 12), (101, 36, 8, 12), (121, 48, 6, 9)):
        gothic(cx, top, w, MID, ICE(2), sp)
    rect(0, 58, 128, 78, MID)
    for tier, (y0, y1, step, aw) in enumerate(((60, 66, 8, 4), (67, 75, 10, 6))):
        off = 2 if tier == 0 else 4
        for ax in range(off, 124, step):
            for y in range(y0, y1):
                for x in range(ax, ax + aw):
                    dx = abs(x + 0.5 - (ax + aw / 2))
                    if y < y0 + aw / 2 + 1 and dx > (y - y0) * 0.9:
                        continue
                    cv.set(x, y, FAR if tier == 0 else NEAR)
        if tier == 1:
            for ax in range(off, 124, step * 3):
                cv.set(ax + 3, y0 + 4, ICE(1))
    for x in range(128):
        hgt = 3 + int(2.5 * (1 + math.sin(x * 0.17 + 1.2))) + (h32(x // 3, 911) % 2)
        for y in range(base - hgt, base):
            cv.set(x, y, NEAR if y > base - hgt else INK(2))
    for y in range(base, base + 3):
        for x in range(128):
            if (x + y) % 2 == 0:
                cv.set(x, y, NEAR)
    for x in range(6, 124, 9):
        cv.set(x, 59, ICE(2) if h32(x, 913) % 3 else GD(4))
    for y in range(base + 3, 96):
        sy = base - (y - base) * 2 + 2
        fadea = max(0, 120 - (y - base) * 7)
        for x in range(128):
            if sy < 0 or (x + y) % 2:
                continue
            p = cv.a[sy, x]
            if p[3] == 255 and fadea > 0:
                cv.put(x, y, (int(p[0]), int(p[1]), int(p[2]), fadea))
    return cv


# ---------------------------------------------------------------------- mere water
class MereWater(Water):
    """Still water (A1, 3 slow frames): deep blue with a darker violet cast, a few long thin silver sheen lines
    that lengthen and shrink, sparse cold glints; the bank is the river's earth lip, but the waterline is a calm
    pale line instead of foam."""
    id = 'mere_water'

    def make_texture(self, frame, variant):
        t = blank(WA(1))
        for y in range(16):
            for x in range(16):
                if h32(x // 4, y, 851) % 13 == 0 and y % 2:
                    t[y][x] = INK(2)
                elif y in (10, 11) and (x + y) % 2 == 0 and 2 < x < 13:
                    t[y][x] = WA(2)
        x0, L = 3, 8 + [0, 2, 1][frame % 3]
        for k in range(L):
            t[5][(x0 + k) % 16] = WA(3) if 2 <= k < L - 2 else WA(2)
        for i, (x, y) in enumerate([(13, 12), (6, 13)]):
            if (frame + i) % 3 == 0:
                t[y][x] = WA(3)
            elif (frame + i) % 3 == 1 and i == 0:
                t[y][x] = ICE(1)
        return t

    def pixel(self, c, x, y):
        col = super().pixel(c, x, y)
        # calm the river's foam line into a pale still edge
        if col in (C('ice', 3), C('water', 5)) and c.i('surf', x, y) and c.f('surf', x, y) < 2:
            return WA(3) if (x + y + c.frame) % 4 else K(4)
        return col


# ---------------------------------------------------------------------- assemble
def build():
    sh = Sheet(512, 2048)
    meta_t = sh.meta.setdefault('terrains', {})
    mw = MereWater()
    x, y = sh.alloc(96, 48)
    for fr in range(3):
        sh.cv.paste(mw.block(fr), x + fr * 32, y)
    meta_t['mere_water'] = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A1', 'kind': 'hole',
                            'collision': 'water', 'reflect': True,
                            'anim': {'frames': [0, 1, 2, 1], 'frameDx': 32, 'ms': 420}, 'variants': []}
    # modular roofs: blue slate is roof_blue (town.png); add grey slate and silver
    for name, ramp in (('slate', 'stone_cool'), ('silver', None)):
        if ramp:
            chunk = roof_chunk(ramp, 'slate', seed=71)
        else:
            chunk = roof_chunk('roof_blue', 'slate', seed=73)
            swap(chunk, extra=SILVER_ROOF)
        swap(chunk)
        for ri, r in enumerate(('ridge', 'field', 'eave')):
            for ci, c in enumerate(('l', 'm', 'r')):
                sh.tile('roof_%s_%s_%s' % (name, r, c), cut(chunk, ci, ri))
    sh.newline()
    # prefabs, tallest first
    items = [(pid, *fn()) for pid, fn in PREFABS.items()]
    items.sort(key=lambda t: (-t[1].h, t[0]))
    for pid, cv, meta in items:
        m = dict(meta)
        w, h = m.pop('rect_wh')
        x, y = sh.alloc(w, h)
        sh.cv.paste(cv, x, y)
        sh.meta['objects'][pid] = {'rect': [x, y, w, h], 'kind': 'building', **m}
    sh.newline()
    # signs
    sh.tile('sign_blank', sign_tile('blank'), collision='solid', note='blank hanging board (the Hollow)')
    for kind in ('inn', 'shop', 'smithy', 'chapel', 'hall'):
        sh.tile('sign_hollow_' + kind, sign_tile(kind), collision='solid',
                note='lettered Hollowmere sign; covers sign_blank exactly on the prefab\'s signAt cell')
    sh.tile('sign_hollow_gate_blank', gate_sign('blank'), collision='solid')
    sh.tile('sign_hollow_gate', gate_sign('restored'), collision='solid',
            note='32 x 16; covers gate_hollow\'s blank board at its signAt cell')
    sh.tile('clock_hands', clock_hands(), collision='solid', note='32 x 32; at the clocktower\'s handsAt cell')
    sh.tile('chalk_crown', chalk_crown(), collision='none', note='Nico\'s chalk crown decal (translucent)')
    for k in range(3):
        sh.tile('reeds_%d' % k, reeds(k), collision='none')
    sh.newline()
    sh.obj('cairn', cairn(), [0, 1], [[0, 0]], 1)
    sh.obj('signpost_blank', signpost_blank(), [0, 1], [[0, 0]], 1)
    sh.obj('floodwrack', floodwrack(), [0, 1], [[0, 0], [1, 0]], 1)
    sh.obj('tree_birch_silver', tree_birch_silver(), [2, 5], [[0, 0], [1, 0]], 5,
           note='recoloured from props.json tree_willow')
    sh.tile('court_far', court_far(), collision='none',
            note='128 x 96 distant Court silhouette; draw in the overhead layer over the mere')
    sh.newline()
    H = sh.y
    ov = sh.meta.setdefault('overlays', {})
    for tid in ('chalk_crown', 'reeds_0', 'reeds_1', 'reeds_2'):
        ov[tid] = sh.meta['tiles'].pop(tid)
    return sh.cv.crop(0, 0, 512, H), sh.meta
