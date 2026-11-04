"""Valewyn (Episode 4): the marble and canal town kit, the Flood Road props, the Emberpeak washout ladder and the far
decal -> ep4.png (E4-tiles, EPISODE4_PLAN 4.1 to 4.3 and 9.1). Imported by ep4.py.

Valewyn is Willowmere in a marble-and-slate swap (the Emberpeak and Hollow approach): the same prefab builders
(prefabs.py, bld.py), then every honey stone colour moves to white marble, roofs are blue slate (`roof_blue`), wood and
gold stay the warm accents, and every wall carries a green waterline stain at its foot (the flood stood there).

Prefabs (kind building, doorAt): inn_flood (the Floodwatch Inn), shop_river (the Riverbank Provisioner), forge_crown
           (the Crown Guard Forge), regent_hall (the Regent's Hall: columns, a gold crown pediment, a blue dome),
           house_vw_a, house_vw_b (homes)
Props      statue_faceless (3 x 4: the crowned coronation statue with no face carved), flood_board (frames 0 =
           running notices, 1 = running notices and one dry forged order with a red seal, 2 = blank and dry),
           great_lock (3 x 3, frames 0 = shut, 1 = open), sandbags (2 x 1), sandbag (1 x 1), mooring_post,
           roof_drowned_a / roof_drowned_b / chimney_drowned (the river quarter's roofs in the flood), rope_ladder
           (the Emberpeak washout, 1 x 3, walkable), sluice_farm (the Flood Road's farm lock wheel housing, 2 x 2)
Tiles      bridge_marble_* (Willowmere's stone bridge pieces in marble, same names after the prefix)
Decal      valewyn_far (160 x 96: environments cell 3 cut out and quantized, transparent sky; overhead layer at the bluff)
"""
import json, math, os
import numpy as np
from PIL import Image
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc, TILES_DIR, NEXT, PAL
import bld
import prefabs
from prefabs import house
from court_props import put_frames, ellipse
from ep4_kit import K, SW, GR, G, CY, WA, GD, MT, SD, WD, RR, RB, EA, INK, TQ, WX, tq, MARBLE, WALL_MARBLE, _remap, EXTRA
from ep4_props import box, shadow, disc, OUT

ROOF = 'roof_blue'


def marble(cv):
    return _remap(cv, WALL_MARBLE)


def waterline(cv, g, rows=7):
    """A green stain at the foot of the wall: dithered verdigris rising from the ground, a weed line at its top."""
    x0, x1, y1 = g['wall_x0'], g['wall_x1'], g['wall_y1']
    marble_cols = {MT(2)[:3], MT(3)[:3], MT(4)[:3], K(4)[:3], K(3)[:3], K(2)[:3]}
    for y in range(y1 - rows, y1):
        f = (y - (y1 - rows)) / rows
        for x in range(x0, x1):
            p = cv.get(x, y)
            if p[3] != 255 or p[:3] not in marble_cols:
                continue
            if y == y1 - rows:
                cv.set(x, y, GR(2) if x % 3 else GR(1))
            elif ((x * 5 + y * 3) % 7) / 7.0 < f * 0.9 + 0.15:
                cv.set(x, y, GR(3) if p[:3] in (MT(3)[:3], MT(4)[:3]) else GR(2))


def gold_eave(cv, g):
    y = g['roof_y'] + 3 * 16 + 1 if False else None
    return cv


def _house(wt, rr, wr, door, windows=(), extras=None, seed=0, top=1, chimney=None, gable=None, depth=None, stain=7):
    def ext(cv, g):
        if extras:
            extras(cv, g)
    cv, meta = house(wt, rr, wr, ROOF, top=top, style='slate', hip=4, seed=seed, wall='stone', door=door,
                     windows=windows, chimney=chimney, gable=gable, timber=[], extras=ext, depth=depth)
    marble(cv)
    g = {'wall_x0': 3, 'wall_x1': wt * 16 - 3, 'wall_y1': cv.h}
    waterline(cv, g, stain)
    return cv, meta


def inn_flood():
    def ext(cv, g):
        x0, y1 = g['wall_x0'], g['wall_y1']
        bld.hanging_sign(cv, x0 + 28, y1 - 33, 'mug', w=13, h=10)
        bld.wall_lantern(cv, x0 + 47, y1 - 30)
        bld.wall_lantern(cv, x0 + 78, y1 - 30)
        # oilskins drying on a line under the eave (yellow and teal)
        for i, x in enumerate(range(x0 + 92, x0 + 118, 7)):
            col = GD(3) if i % 2 == 0 else CY(1)
            for yy in range(y1 - 38, y1 - 31):
                for xx in range(x, x + 5):
                    cv.set(xx, yy, col if xx < x + 4 else GD(1) if i % 2 == 0 else TQ(0))
        for x in range(x0 + 90, x0 + 120):
            cv.set(x, y1 - 39, WD(1))
    return _house(8, 3, 3, {'x': 54, 'w': 20, 'h': 27, 'double': True, 'arch': True},
                  windows=[{'x': 10, 'y': 30, 'w': 12, 'h': 10, 'lit': True, 'shutters': 'roof_blue'},
                           {'x': 96, 'y': 30, 'w': 12, 'h': 10, 'lit': True, 'shutters': 'roof_blue'},
                           {'x': 10, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_blue'},
                           {'x': 36, 'y': 8, 'w': 10, 'h': 10, 'lit': False, 'shutters': 'roof_blue'},
                           {'x': 82, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_blue'},
                           {'x': 104, 'y': 8, 'w': 10, 'h': 10, 'lit': True, 'shutters': 'roof_blue'}],
                  chimney=(102, 10, True), gable={'cx': 67, 'half': 18, 'window_kind': 'round', 'timber': False, 'wall': 'stone'}, extras=ext,
                  seed=413, depth=3)


def shop_river():
    def ext(cv, g):
        x0, y0, y1 = g['wall_x0'], g['wall_y0'], g['wall_y1']
        bld.window(cv, x0 + 6, y0 + 12, 24, 11, lit=True, mullion=False)
        for i, col in enumerate(['roof_red', 'magic_cyan', 'gold', 'ice', 'roof_green', 'roof_red']):
            px = x0 + 9 + i * 3
            cv.set(px, y0 + 18, C(col, 3)); cv.set(px, y0 + 19, C(col, 2)); cv.set(px, y0 + 17, C('ice', 2))
        for xx in range(22):
            cv.set(x0 + 7 + xx, y0 + 20, WD(2))
        bld.awning(cv, x0 + 3, y0 + 5, 30, 'roof_blue', 'metal')
        bld.hanging_sign(cv, x0 + 36, y0 + 9, 'potion', w=11, h=10)
        # coils of rope and a barrel by the door (a riverbank chandler)
        for (rx, ry) in ((x0 + 5, y1 - 8), (x0 + 15, y1 - 8)):
            ellipse(cv, rx + 4, ry + 3, 4.2, 3.0, lambda dx, dy, d: GD(1) if d > 0.75 else (GD(3) if (int(dx * 9) % 2) else GD(2)))
            cv.set(rx + 4, ry + 3, WD(1))
    return _house(5, 3, 2, {'x': 52, 'w': 11, 'h': 18}, extras=ext, chimney=(8, 6), seed=417)


def forge_crown():
    def pre(cv, g):
        x0, y0, y1 = g['wall_x0'], g['wall_y0'], g['wall_y1']
        bx, bw, bh = x0 + 8, 30, 22
        by = y1 - bh
        for yy in range(bh):
            for xx in range(bw):
                cv.set(bx + xx, by + yy, DARK if yy > 2 else SD(1))
        for xx in range(-2, bw + 2):
            cv.set(bx + xx, by - 2, GD(3)); cv.set(bx + xx, by - 1, GD(1))
        for yy in range(-2, bh):
            cv.set(bx - 2, by + yy, K(4)); cv.set(bx - 1, by + yy, K(2))
            cv.set(bx + bw, by + yy, K(2)); cv.set(bx + bw + 1, by + yy, K(1))
        for xx in range(4, 16):
            for yy in range(bh - 8, bh - 2):
                d = abs(xx - 10) + abs(yy - (bh - 4)) * 1.5
                if d < 4:
                    cv.set(bx + xx, by + yy, C('fire', 4) if d < 2 else C('fire', 3))
                elif d < 6.5:
                    cv.set(bx + xx, by + yy, C('fire', 1))
        cv.stamp(['mmmmmmm', '.mmmmm.', '...m...', '..mmm..'], bx + 18, by + bh - 7, {'m': K(1)})
        bld.hanging_sign(cv, x0 + 46, y0 + 8, 'hammer', w=11, h=10)
        # a crown guard shield on the wall: blue with a gold crown
        sx, sy = x0 + 62, y0 + 5
        for yy in range(9):
            for xx in range(7):
                if yy > 5 and abs(xx - 3) > 8 - yy:
                    continue
                cv.set(sx + xx, sy + yy, RB(3) if xx < 4 else RB(2))
        for (dx, dy) in ((1, 3), (2, 2), (3, 3), (4, 2), (5, 3), (1, 4), (2, 4), (3, 4), (4, 4), (5, 4)):
            cv.set(sx + dx, sy + dy, GD(4))
    cv, meta = house(6, 3, 2, ROOF, style='slate', hip=4, seed=423, wall='stone',
                     door={'x': 68, 'w': 10, 'h': 17, 'arch': False}, pre_roof=pre, chimney=(10, 12, True))
    marble(cv)
    waterline(cv, {'wall_x0': 3, 'wall_x1': 6 * 16 - 3, 'wall_y1': cv.h}, 7)
    return cv, meta


def house_vw_a():
    def ext(cv, g):
        bld.flower_box(cv, g['wall_x0'] + 34, g['wall_y1'] - 13, 12, 'roof_red')
    return _house(4, 2, 2, {'x': 9, 'w': 10, 'h': 17},
                  windows=[{'x': 35, 'y': 9, 'w': 10, 'h': 9, 'lit': True, 'shutters': 'roof_blue'}],
                  chimney=(44, 6), extras=ext, seed=431)


def house_vw_b():
    return _house(5, 3, 2, {'x': 12, 'w': 10, 'h': 18},
                  windows=[{'x': 44, 'y': 10, 'w': 10, 'h': 10, 'lit': False, 'shutters': 'roof_blue'},
                           {'x': 30, 'y': 10, 'w': 8, 'h': 10, 'lit': True, 'shutters': 'roof_blue'}],
                  chimney=(55, 8, True), gable={'cx': 48, 'half': 12, 'window_kind': 'small', 'timber': False, 'wall': 'stone'}, seed=437)


def regent_hall():
    """The Regent's Hall: a marble hall, 9 x 7 tiles. Four columns across the front, a gold crown in the pediment,
    a blue slate roof with a dome and lantern, blue banners, a tall double door (doorAt the middle)."""
    def ext(cv, g):
        x0, x1, y0, y1 = g['wall_x0'], g['wall_x1'], g['wall_y0'], g['wall_y1']
        # columns
        for cx in (x0 + 10, x0 + 34, x0 + 96, x0 + 120):
            for y in range(y0 + 4, y1 - 2):
                for dx in range(6):
                    c = [K(3), MT(4), MT(3), MT(3), MT(2), K(3)][dx]
                    if (y - y0) % 6 == 0 and 1 <= dx <= 4:
                        c = MT(2) if dx > 2 else MT(3)
                    cv.set(cx + dx, y, c)
            for dx in range(-1, 7):
                cv.set(cx + dx, y0 + 3, GD(3)); cv.set(cx + dx, y0 + 4, GD(1))
                cv.set(cx + dx, y1 - 3, MT(4)); cv.set(cx + dx, y1 - 2, K(3))
        # banners between the columns
        for bx in (x0 + 20, x0 + 106):
            bld.banner(cv, bx, y0 + 6, 9, 22, 'roof_blue')
        bld.wall_lantern(cv, x0 + 52, y1 - 30)
        bld.wall_lantern(cv, x0 + 82, y1 - 30)
        # the dome on the ridge
        cx = g['bw'] // 2
        ry = g['roof_y']
        for y in range(ry - 14, ry + 8):
            for x in range(cx - 14, cx + 15):
                d = math.hypot((x + 0.5 - cx) / 14.0, (y + 0.5 - (ry + 8)) / 22.0)
                if d <= 1.0:
                    c = RB(3) if x < cx - 3 else (RB(2) if x < cx + 6 else RB(1))
                    if d > 0.92:
                        c = RB(0)
                    elif (x - cx) % 6 == 0:
                        c = RB(1)
                    cv.set(x, y, c)
        for x in range(cx - 15, cx + 16):
            cv.set(x, ry + 8, GD(3)); cv.set(x, ry + 9, GD(1))
        for y in range(ry - 21, ry - 13):
            cv.set(cx - 1, y, MT(4)); cv.set(cx, y, MT(3)); cv.set(cx + 1, y, MT(2))
        cv.set(cx, ry - 23, GD(5)); cv.set(cx - 1, ry - 22, GD(4)); cv.set(cx, ry - 22, GD(4)); cv.set(cx + 1, ry - 22, GD(3))
    cv, meta = _house(9, 3, 3, {'x': 62, 'w': 20, 'h': 30, 'double': True, 'arch': True}, extras=ext, top=2,
                      gable={'cx': 72, 'half': 24, 'window_kind': None, 'timber': False, 'wall': 'stone'}, seed=441, depth=3, stain=6)
    # a gold crown in the pediment (over the gable)
    gx, gy = 3 + 72 - 6, 2 * 16 + 3 * 16 - 12
    crown = ['g.g.g.g.g.g', 'ggggggggggg', 'GGGGGGGGGGG']
    cv.stamp(crown, gx, gy, {'g': GD(4), 'G': GD(2)}, blend=False)
    cv.set(gx + 5, gy + 1, WX(0))
    return cv, meta


# ====================================================================== props
def statue_faceless():
    """48 x 64: the coronation statue. A marble plinth with a gold inscription plate, a robed figure with a gold crown
    and a sceptre, and a smooth blank face (no features carved yet). Verdigris streaks at the foot."""
    cv = Canvas(48, 64)
    shadow(cv, 6, 47, 63, 90)
    # plinth
    box(cv, 4, 44, 43, 62, MT(4), MT(3), MT(2), out=K(3))
    for x in range(5, 43):
        cv.set(x, 45, MT(4))
        cv.set(x, 49, GD(3) if x % 4 else GD(1))
    box(cv, 14, 51, 33, 58, GD(4), GD(3), GD(1), out=GD(0))
    for y in (53, 55):
        for x in range(16, 32):
            if (x + y) % 3:
                cv.set(x, y, GD(1))
    for y in range(56, 62):
        for x in range(5, 43):
            p = cv.get(x, y)
            if p[:3] in (MT(3)[:3], MT(2)[:3]) and (x * 3 + y) % 5 < (y - 55):
                cv.set(x, y, GR(3) if (x + y) % 2 else GR(2))
    # robe (a tall trapezoid), arms, sceptre
    for y in range(16, 44):
        half = 6 + (y - 16) * 0.32
        for x in range(int(24 - half), int(24 + half) + 1):
            dx = x - 24
            c = MT(3)
            if dx < -half + 2:
                c = MT(4)
            elif dx > half - 2:
                c = MT(2)
            elif (dx + 30) % 5 == 0 and y > 26:
                c = MT(2)
            if abs(dx) > half - 0.8:
                c = K(3)
            cv.set(x, y, c)
    for y in range(22, 27):
        for x in range(18, 31):
            cv.set(x, y, MT(4) if y == 22 else MT(3))
    # sceptre in the right hand
    for y in range(8, 34):
        cv.set(32, y, GD(3) if y % 5 else GD(1))
        cv.set(33, y, GD(1))
    disc(cv, 32.5, 8.0, 2.0, lambda x, y, d: GD(4) if d < 1.2 else GD(2))
    for y in range(24, 28):
        cv.set(31, y, MT(4)); cv.set(34, y, MT(2))
    # head: a smooth blank oval, no features
    for y in range(6, 17):
        for x in range(19, 30):
            d = math.hypot((x + 0.5 - 24.5) / 5.2, (y + 0.5 - 11.5) / 5.6)
            if d <= 1.0:
                c = MT(3)
                if d > 0.86:
                    c = K(3)
                elif x < 23 and y < 11:
                    c = MT(4)
                elif x > 26:
                    c = MT(2)
                cv.set(x, y, c)
    # the crown
    for (x0, y0) in ((19, 4), (22, 2), (25, 2), (28, 4)):
        cv.set(x0, y0, GD(4)); cv.set(x0, y0 + 1, GD(3))
    for x in range(19, 30):
        cv.set(x, 5, GD(4) if x < 25 else GD(3)); cv.set(x, 6, GD(2))
    cv.set(24, 3, GD(5))
    # rain streaks of green down the robe
    for x in (21, 27):
        for y in range(30, 44):
            if (y + x) % 3 == 0:
                cv.set(x, y, GR(4))
    return cv


def flood_board(state):
    """32 x 32: the flood emergency orders board. 0 = notices whose ink runs in streaks; 1 = the same plus one crisp,
    dry forged order with a red wax seal in the middle; 2 = blank, dry sheets (the forged one gone blank too)."""
    cv = Canvas(32, 32)
    shadow(cv, 4, 31, 31, 80)
    for x in (4, 26):
        for y in range(10, 31):
            cv.set(x, y, WD(3)); cv.set(x + 1, y, WD(1))
    box(cv, 1, 3, 30, 21, WD(4), WD(2), WD(1), out=WD(0))
    for x in range(1, 31):
        cv.set(x, 2, RB(2) if x % 2 else RB(1))
    cv.set(0, 3, RB(1)); cv.set(31, 3, RB(1))
    sheets = ((3, 5, 7, 8), (11, 6, 6, 7), (19, 5, 9, 7), (4, 14, 8, 6), (20, 13, 7, 7))
    for i, (x0, y0, w, h) in enumerate(sheets):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                c = MT(4) if state == 2 else SW(5)
                if x == x0 + w - 1 or y == y0 + h - 1:
                    c = K(4) if state == 2 else SW(3)
                cv.set(x, y, c)
        if state < 2:
            # running ink: short lines with streaks dripping down
            for k, ly in enumerate(range(y0 + 1, y0 + h - 2, 2)):
                for x in range(x0 + 1, x0 + w - 2):
                    if (x + ly + i) % 3:
                        cv.set(x, ly, INK(3) if (x + k) % 2 else INK(2))
                for x in range(x0 + 1, x0 + w - 2, 2):
                    if h32(x, ly, i, 5401) % 3 == 0:
                        for d in range(1, 3):
                            if ly + d < y0 + h - 1:
                                cv.set(x, ly + d, INK(4))
    if state == 1:
        x0, y0, w, h = 11, 9, 10, 11
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                c = WHITE if (x < x0 + w - 1 and y < y0 + h - 1) else K(4)
                cv.set(x, y, c)
        for x in range(x0 - 1, x0 + w + 1):
            cv.set(x, y0 - 1, OUT); cv.set(x, y0 + h, OUT)
        for y in range(y0, y0 + h):
            cv.set(x0 - 1, y, OUT); cv.set(x0 + w, y, OUT)
        for ly in (y0 + 1, y0 + 3, y0 + 5):
            for x in range(x0 + 1, x0 + w - 2):
                if (x + ly) % 4 != 3:
                    cv.set(x, ly, DARK)
        disc(cv, x0 + 5.0, y0 + 8.0, 2.4, lambda x, y, d: WX(1) if (x < x0 + 5 and y < y0 + 8) else WX(0))
    return cv


def great_lock(state):
    """48 x 48: the city's great lock wheel on its stone housing by the canal works. A big iron wheel with a gold hub;
    the housing's dial has a crimson sector (shut) and a turquoise sector (open) and a gold pointer. 0 = shut, 1 = open
    (pointer on turquoise, water spilling from the sluice mouth below)."""
    cv = Canvas(48, 48)
    shadow(cv, 4, 47, 47, 90)
    box(cv, 2, 26, 45, 46, K(4), K(3), K(1))
    for x in range(3, 45):
        cv.set(x, 27, K(5))
    # sluice mouth
    for y in range(36, 46):
        for x in range(16, 32):
            c = DARK
            if y == 36 or x in (16, 31):
                c = K(1)
            elif state == 1:
                c = tq(3) if (x + y) % 3 == 0 else (tq(2) if y % 2 else tq(1))
            cv.set(x, y, c)
    # dial on the housing, left of the mouth
    for y in range(29, 35):
        for x in range(4, 14):
            c = SD(1)
            if x < 9:
                c = WX(0) if y > 29 else WX(1)
            else:
                c = CY(2) if y > 29 else CY(3)
            if x in (4, 13) or y in (29, 34):
                c = OUT
            cv.set(x, y, c)
    px = 6 if state == 0 else 11
    for y in range(28, 35):
        cv.set(px, y, GD(4) if y < 31 else GD(2))
    cv.set(px, 27, GD(5))
    # the wheel
    cx, cy, R = 24.0, 15.0, 13.5
    disc(cv, cx, cy, R, lambda x, y, d: OUT if d > R - 1 else (K(4) if (d > R - 3 and y < cy) else (K(2) if d > R - 3 else None)))
    disc(cv, cx, cy, R - 3.0, lambda x, y, d: OUT if d > R - 4 else None)
    rot = 0.0 if state == 0 else math.pi / 8
    for k in range(8):
        a = rot + k * math.pi / 4
        for r in range(3, int(R) - 2):
            x = int(round(cx - 0.5 + math.cos(a) * r))
            y = int(round(cy - 0.5 + math.sin(a) * r))
            cv.set(x, y, K(3) if y < cy else K(1))
            cv.set(x + 1, y, K(2))
        hx = int(round(cx - 0.5 + math.cos(a) * (R + 0.5)))
        hy = int(round(cy - 0.5 + math.sin(a) * (R + 0.5)))
        cv.set(hx, hy, WD(4)); cv.set(hx + 1, hy, WD(2))
    disc(cv, cx, cy, 3.0, lambda x, y, d: GD(4) if (x < cx and y < cy) else (GD(2) if d < 2.4 else GD(1)))
    for y in range(int(cy) + 3, 27):
        cv.set(23, y, K(1)); cv.set(24, y, K(4))
    return cv


def sandbags(n):
    """n = 1 (16 x 16) or 2 (32 x 16): a low wall of stacked hessian sacks."""
    w = 16 * n
    cv = Canvas(w, 16)
    shadow(cv, 2, w - 1, 15, 70)
    rows = ((9, 0), (4, 4))
    for ry, off in rows:
        x = 1 + off
        while x + 7 <= w - 1:
            for y in range(ry, ry + 6):
                for xx in range(x, x + 7):
                    d = math.hypot((xx + 0.5 - (x + 3.5)) / 3.6, (y + 0.5 - (ry + 3)) / 3.2)
                    if d <= 1.0:
                        c = SW(4) if (y < ry + 2 and xx < x + 5) else (SW(3) if d < 0.8 else SW(2))
                        if d > 0.88:
                            c = EA(2)
                        cv.set(xx, y, c)
            cv.set(x + 3, ry + 2, EA(3))
            x += 7
    return cv


def mooring_post():
    cv = Canvas(16, 32)
    shadow(cv, 6, 12, 31, 80)
    for y in range(16, 31):
        for x in range(6, 10):
            cv.set(x, y, [WD(4), WD(3), WD(2), WD(1)][x - 6])
    for x in range(5, 11):
        cv.set(x, 15, WD(5)); cv.set(x, 16, WD(3))
    for y in (20, 21):
        for x in range(5, 11):
            cv.set(x, y, GD(3) if y == 20 else GD(1))
    for x in range(6, 10):
        cv.set(x, 27, GR(2)); cv.set(x, 28, GR(1))
    return cv


def roof_drowned(kind):
    """A roof in the flood (river quarter): the slate ridge above the water, the part under it seen turquoise, a foam
    ring at the waterline. kind 'a' 32 x 32 gable, 'b' 48 x 32 with a chimney, 'c' 16 x 16 chimney alone."""
    if kind == 'c':
        cv = Canvas(16, 16)
        for y in range(2, 12):
            for x in range(5, 11):
                c = SW(3) if x < 8 else SW(2)
                if y == 2:
                    c = SW(4)
                cv.set(x, y, c)
        for y in range(9, 12):
            for x in range(5, 11):
                cv.set(x, y, TQ(1) if (x + y) % 2 else TQ(0))
        for x in range(3, 13):
            cv.set(x, 9, CY(4) if x % 3 else CY(3))
        return marble(cv)
    w = 32 if kind == 'a' else 48
    cv = Canvas(w, 32)
    wl = 22
    peak = w // 2
    for y in range(4, 30):
        for x in range(1, w - 1):
            half = (y - 4) * 1.1 + 2
            if abs(x + 0.5 - peak) > half:
                continue
            row = (y - 4) // 3
            c = RB(3) if ((x + row * 2) // 4) % 2 else RB(2)
            if (y - 4) % 3 == 2:
                c = RB(1)
            if abs(x + 0.5 - peak) > half - 1.2:
                c = RB(0)
            if x > peak:
                c = {RB(3): RB(2), RB(2): RB(1)}.get(c, c)
            if y > wl:
                c = TQ(1) if c in (RB(3), RB(2)) else TQ(0)
                if (x + y) % 5 == 0:
                    c = tq(2)
            cv.set(x, y, c)
    for x in range(peak - 1, peak + 2):
        cv.set(x, 3, RB(0)); cv.set(x, 4, RB(4))
    if kind == 'b':
        for y in range(6, wl + 1):
            for x in range(34, 40):
                cv.set(x, y, SW(3) if x < 37 else SW(2))
        for x in range(33, 41):
            cv.set(x, 6, SW(4))
        marble(cv)
    # foam at the waterline
    for x in range(0, w):
        if cv.get(x, wl)[3]:
            cv.set(x, wl, CY(4) if x % 3 else CY(3))
            cv.set(x, wl + 1, CY(2) if x % 2 else cv.get(x, wl + 1))
    for x in (1, w - 2):
        cv.set(x, wl, CY(3))
    return cv


def rope_ladder():
    """16 x 48 walkable piece: a rope ladder pegged at the top of the washout, two rope rails and wooden rungs, the
    bottom end resting on the rocks below."""
    cv = Canvas(16, 48)
    for x in (5, 6, 12, 13):
        cv.set(x, 1, K(1))
        cv.set(x, 0, K(3))
    for y in range(2, 46):
        sway = int(round(math.sin(y * 0.18) * 0.6))
        for x, c in ((4 + sway, GD(1)), (5 + sway, GD(3)), (11 + sway, GD(3)), (12 + sway, GD(1))):
            cv.set(x, y, c)
        if y % 5 == 3:
            for x in range(5 + sway, 12 + sway):
                cv.set(x, y, WD(4) if x < 9 + sway else WD(3))
                cv.set(x, y + 1, WD(1))
    for x in range(3, 14):
        cv.put(x + 1, 46, SH(80))
    return cv


def sluice_farm():
    """32 x 32: the Flood Road's farm sluice, a wooden lock housing over a ditch mouth (the tide_wheel stands beside
    it); decor."""
    cv = Canvas(32, 32)
    shadow(cv, 3, 31, 31, 80)
    for y in range(10, 30):
        for x in range(2, 30):
            c = WD(3) if (x // 4) % 2 else WD(2)
            if x % 4 == 3:
                c = WD(1)
            if y in (10, 11):
                c = WD(4) if y == 10 else WD(2)
            if x in (2, 29) or y == 29:
                c = WD(0)
            cv.set(x, y, c)
    for y in range(20, 30):
        for x in range(10, 22):
            c = DARK if y < 24 else (TQ(1) if (x + y) % 2 else CY(2))
            if x in (10, 21):
                c = K(2)
            cv.set(x, y, c)
    for x in range(8, 24):
        cv.set(x, 19, K(4)); cv.set(x, 18, K(2))
    for y in range(3, 10):
        cv.set(7, y, WD(1)); cv.set(24, y, WD(1))
    for x in range(6, 26):
        cv.set(x, 3, RB(2)); cv.set(x, 2, RB(3))
    return cv


# ====================================================================== the far decal (environments cell 3)
def valewyn_far():
    """160 x 96 decal for the overhead layer at the bluff: Valewyn seen from above the crossing, drawn from the shapes of
    environments cell 3 (the crowned statue on its drum, the drowned keep with its spires and its belfry just above the
    water, the aqueduct arches and their falls, the turquoise flood in front with the city reflected) in a few moonlit
    tones, so it reads as far away and never as a pasted painting. Transparent sky; the water dithers out at the bottom
    so it sits on any ground. Colours: the palette plus the two ep4 turquoises."""
    W, H = 160, 96
    cv = Canvas(W, H)
    WL = 70                                   # the waterline
    far, mid, near, lit, edge = SD(1), SD(2), K(1), K(2), K(3)

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < WL:
            cv.set(x, y, c)
    # far hills
    for x in range(W):
        y = int(46 + 5 * math.sin(x * 0.045 + 1.2) + 2 * math.sin(x * 0.17))
        for yy in range(y, WL):
            put(x, yy, far)
        put(x, y, mid)
    # the aqueduct arcade
    for x in range(W):
        for y in range(52, WL):
            u = x % 14
            pier = u in (0, 1, 2)
            arch = (y - 52) > 5 and not pier and math.hypot((u - 8) / 5.5, (y - 64) / 7.0) < 1.0
            if arch:
                continue
            c = mid
            if y in (52, 53):
                c = edge if y == 52 else lit
            elif pier and u == 0:
                c = lit
            put(x, y, c)
    # the keep: stepped blocks, buttresses, crenels, arched windows, spired towers
    blocks = [(84, 99, 37), (96, 134, 28), (104, 126, 20), (131, 148, 33)]
    for (x0, x1, y0) in blocks:
        for x in range(x0, x1):
            for y in range(y0, WL):
                c = near
                if (x - x0) % 8 == 0:
                    c = lit
                elif (x - x0) % 8 == 1:
                    c = mid
                put(x, y, c)
            put(x, y0, edge if x < (x0 + x1) // 2 else lit)
            if (x - x0) % 2 == 0:
                put(x, y0 - 1, edge if x < (x0 + x1) // 2 else lit)
        for wy in range(y0 + 4, WL - 6, 7):
            for wx in range(x0 + 3, x1 - 2, 4):
                if (wx - x0) % 8 in (0, 1):
                    continue
                k = h32(wx, wy, 6003) % 7
                c = GD(4) if k == 0 else (GD(2) if k == 1 else DARK)
                put(wx, wy, c)
                put(wx, wy + 1, c if c != GD(4) else GD(2))
                put(wx, wy + 2, DARK)
    towers = ((108, 6, 3, 18), (116, 0, 4, 22), (124, 8, 3, 18), (88, 24, 2, 14), (142, 20, 2, 14))
    for (tx, ty, hw, body) in towers:
        top = ty + hw * 3
        for y in range(top, top + body):
            for x in range(tx - hw, tx + hw + 1):
                put(x, y, edge if x == tx - hw else (lit if x < tx else near))
        for k in range(hw * 3):
            w = int(k / 3.0)
            for x in range(tx - w, tx + w + 1):
                put(x, ty + k, RB(2) if x < tx else RB(1))
        put(tx, ty - 1, GD(4))
        put(tx, top + 3, GD(4) if hw > 2 else DARK)
    # the belfry, drowned to its bell
    for y in range(57, WL):
        for x in range(64, 78):
            put(x, y, near if x > 66 else lit)
    for x in range(63, 79):
        put(x, 56, edge)
    for y in range(59, 67):
        for x in range(68, 75):
            if y < 61 and abs(x - 71) > (y - 58):
                continue
            put(x, y, DARK)
    for (x, y) in ((71, 61), (70, 62), (71, 62), (72, 62), (69, 63), (70, 63), (71, 63), (72, 63), (73, 63)):
        put(x, y, GD(1) if x > 70 else GD(2))
    # the crowned statue on its drum, pale marble catching the moon from the left
    for y in range(45, WL):
        for x in range(28, 52):
            c = K(3) if x < 36 else (K(2) if x < 46 else K(1))
            if y == 48:
                c = GD(2)
            put(x, y, c)
    for x in range(27, 53):
        put(x, 45, MT(2))
    for y in range(20, 45):
        half = 3.5 + (y - 20) * 0.26
        for x in range(int(40 - half), int(40 + half) + 1):
            dx = x - 40
            c = MT(3) if dx < 0 else MT(2)
            if dx < -half + 1.5:
                c = MT(4)
            if y > 28 and (dx + 40) % 3 == 0 and dx > -2:
                c = K(4)
            put(x, y, c)
    for y in range(24, 28):
        for x in range(34, 47):
            put(x, y, MT(3) if x < 40 else MT(2))
    for y in range(12, 20):
        for x in range(36, 45):
            if math.hypot(x + 0.5 - 40, (y + 0.5 - 16) * 1.1) < 3.6:
                put(x, y, MT(4) if x < 39 else MT(2))
    for x in range(36, 44):
        put(x, 11, GD(4) if x < 41 else GD(3))
    for (x, y) in ((36, 10), (38, 9), (40, 8), (42, 9), (43, 10)):
        put(x, y, GD(4))
    put(40, 7, GD(5))
    for y in range(14, 36):
        put(47, y, GD(3) if y % 4 else GD(1))
    put(47, 13, GD(5))
    put(46, 13, GD(4))
    put(48, 13, GD(4))
    # falls from the arcade into the flood, foam at their feet
    for k, x0 in enumerate(range(5, W, 14)):
        if x0 in range(26, 54) or x0 in range(62, 80):
            continue
        for y in range(56, WL):
            put(x0 + 3, y, tq(3) if (y + k) % 3 else tq(4))
            put(x0 + 4, y, tq(2) if y % 2 else tq(3))
        for dx in range(1, 7):
            put(x0 + dx, WL - 1, tq(4) if dx % 2 else tq(3))
    # the water: the city reflected (dark, broken into rows) and the moon's glitter
    for y in range(WL, H):
        for x in range(W):
            c = tq(1) if (x * 3 + y * 7) % 13 else tq(0)
            yy = WL - 1 - (y - WL) * 2
            above = cv.get(x, yy) if yy >= 0 else (0, 0, 0, 0)
            if y == WL:
                c = tq(4) if x % 4 == 0 else tq(3)
            elif above[3] and (y - WL) < 16 and (y % 2 == 0):
                bright = above[:3] in (MT(3)[:3], MT(2)[:3], MT(4)[:3], GD(4)[:3], GD(3)[:3])
                c = tq(2) if bright else tq(0)
            cv.set(x, y, c)
    for y in range(WL + 3, H, 2):
        for x in range(36 - (y - WL) // 3, 44 + (y - WL) // 3, 3):
            if 0 <= x < W:
                cv.set(x, y, tq(3))
    for y in range(H - 14, H):
        t = (y - (H - 14)) / 14.0
        for x in range(W):
            if ((x * 7 + y * 3) % 8) / 8.0 < t:
                cv.set(x, y, (0, 0, 0, 0))
    rim = cv.copy()
    for y in range(H):
        for x in range(W):
            if cv.get(x, y)[3] == 0 and y < WL and (cv.get(x, y + 1)[3] or cv.get(x - 1, y)[3] or cv.get(x + 1, y)[3]):
                rim.set(x, y, DARK)
    return rim


# ====================================================================== build
BRIDGE_MARBLE = dict(WALL_MARBLE)
BRIDGE_MARBLE.update({hexc(k)[:3]: hexc(v) for k, v in {'#2e2b4c': '#4c445c', '#4c445c': '#66637f', '#66637f': '#8e8997',
                                                       '#8e8997': '#b3b6c4', '#b3b6c4': '#e2e0de'}.items()})


def _marble_bridges(sh):
    with open(os.path.join(TILES_DIR, 'tiles.json')) as f:
        db = json.load(f)
    from compose import TileDB
    tdb = TileDB()
    for tid, m in sorted(db['tiles'].items()):
        if not tid.startswith('bridge_stone_'):
            continue
        src = tdb.sheet(m['sheet']).crop(m['x'], m['y'], m.get('w', 16), m.get('h', 16))
        _remap(src, BRIDGE_MARBLE)
        sh.tile('bridge_marble_' + tid[len('bridge_stone_'):], src, collision=m.get('collision', 'none'),
                note='%s in Valewyn marble' % tid)


def build_into(sh):
    sh.newline()
    items = []
    for pid, fn in (('inn_flood', inn_flood), ('shop_river', shop_river), ('forge_crown', forge_crown),
                    ('regent_hall', regent_hall), ('house_vw_a', house_vw_a), ('house_vw_b', house_vw_b)):
        cv, m = fn()
        items.append((pid, cv, m))
    items.sort(key=lambda t: (-t[1].h, t[0]))
    for pid, cv, meta in items:
        m = dict(meta)
        w, h = m.pop('rect_wh')
        x, y = sh.alloc(w, h)
        sh.cv.paste(cv, x, y)
        sh.meta['objects'][pid] = {'rect': [x, y, w, h], 'kind': 'building', **m}
    sh.newline()
    sh.obj('statue_faceless', statue_faceless(), [0, 3], [[0, 0], [1, 0], [2, 0], [0, -1], [1, -1], [2, -1]], 2,
           note='the coronation statue with no face carved (object statue, script vw_statue); 3 x 4 tiles, the '
                'bottom two rows solid')
    put_frames(sh, 'flood_board', [flood_board(i) for i in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               note='the flood emergency orders board (sign flood_board): 0 = running notices, 1 = plus the dry forged '
                    'order with a red seal (from vw_arrived), 2 = blank and dry (after vw_restored)')
    put_frames(sh, 'great_lock', [great_lock(0), great_lock(1)], [0, 2], [[0, 0], [1, 0], [2, 0], [0, -1], [1, -1], [2, -1]],
               overhead=1, note='the city\'s great lock wheel (decor until crown_remembers): 0 = shut, 1 = open')
    put_frames(sh, 'sluice_farm', [sluice_farm()], [0, 1], [[0, 0], [1, 0]], overhead=1,
               note='the Flood Road farm sluice housing (the tide_wheel wh_lane stands beside it)')
    sh.newline()
    sh.obj('sandbags', sandbags(2), [0, 0], [[0, 0], [1, 0]], 0, note='a low wall of sandbags, 2 cells')
    sh.obj('sandbag', sandbags(1), [0, 0], [[0, 0]], 0, note='sandbags, 1 cell')
    sh.obj('mooring_post', mooring_post(), [0, 1], [[0, 0]], 1, note='a timber mooring post with a brass band')
    sh.obj('roof_drowned_a', roof_drowned('a'), [0, 1], [[0, 0], [1, 0]], 1,
           note='a gable roof in the flood (river quarter overlay; place on tide_water cells)')
    sh.obj('roof_drowned_b', roof_drowned('b'), [0, 1], [[0, 0], [1, 0], [2, 0]], 1,
           note='a roof with a chimney in the flood (river quarter overlay)')
    sh.obj('chimney_drowned', roof_drowned('c'), [0, 0], [[0, 0]], 0, note='a chimney in the flood')
    sh.obj('rope_ladder', rope_ladder(), [0, 2], [], 0, kind='piece',
           note='the Emberpeak washout rope ladder (if east_road_open); 1 x 3, walkable (collision none)')
    sh.meta['objects']['rope_ladder']['collision'] = 'none'
    sh.newline()
    _marble_bridges(sh)
    sh.newline()
    sh.tile('valewyn_far', valewyn_far(), collision='none',
            note='160 x 96 decal of Valewyn from environments cell 3 (transparent sky) for the overhead layer at the '
                 'bluff (mark valewyn_far)')
