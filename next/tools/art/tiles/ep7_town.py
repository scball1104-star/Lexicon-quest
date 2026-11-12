"""Palehaven and the White Road (Episode 7): the town kit, the road kit and the two far decals -> ep7.png (E7-tiles,
EPISODE7_PLAN 4.1 to 4.4, 9.1). Imported by ep7.py.

The town is built around one image (environments cell 6): dark timber houses under deep snow on blue-ice ramparts, warm
windows frosted at the corners, the cold hearth in the square, iced doors all round it, the Keeper's Watch at the north
end, the frozen cathedral on the north skyline under the aurora. Dragon Quest rule: every building says what it is from a
phone screen (a bed sign and fur rolls, a kettle sign and drying herbs, a hammer sign and a glass furnace, the Watch's
lamp tower and its shutter).

Prefabs (kind building, doorAt): lodge_thawlight (the Thawlight Lodge), shop_northwind (Northwind Provisions),
           armory_glassice (the Glass-Ice Armory), keepers_watch (the Keeper's Watch), house_snow_a, house_snow_b,
           waystation_hut (the Courier's Waystation on the road)
Square     returning_hearth (2 x 3: cold, lit 3 frames), iced_door (1 x 2 piece set on a house door: 0 iced, no name;
           1 open, the name back on the lintel), vanishing_mark (1 x 2 stele: 0 the hollow growing, 1 filled),
           crystal (aurora crystal on a pole, anim 3, light), auroraobelisk (1 x 3), frostfire (a brazier of cold blue
           flame, anim 3, light), snowpine (2 x 3)
Road       black_pine (2 x 4), snowbank (2 x 1), traveler_wall (6 x 3: the carved names as texture), icegate (5 x 4 arch:
           the pillars solid, the arch overhead), post_box, tally_frame (1 x 2 piece: the doorframe tally, every seventh
           stroke crossed, a white patch where a name was), courier_stove (2 x 2: cold, lit 2 frames)
Decals     palehaven_far (176 x 112, environments cell 6: the cathedral and the town on its cliffs, sky keyed out) and
           cathedral_far (112 x 96, cell 6: the cathedral's spires; 2 frames: 0 whole, 1 the same with a dithered fade,
           for the map's slow alpha swap, never faster than once in 3 s)
"""
import math, os
import numpy as np
from PIL import Image
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc, NEXT
import bld
from court_props import put_frames, ellipse, glow
from ep4_props import box, shadow, disc
from ep7_kit import (WD, SW, SC, GD, WA, IC, RB, MT, FD, RG, FI, INK, MV, CY, EA, SN, IP, GHOST, AG, PAPER, EXTRA)
from ep7_props import R, contact_shadow, ink_outline, warm_glow

RR = lambda i: C('roof_red', i)
SA = lambda i: C('sand', i)


# ====================================================================== the house builder
def snow_roof(cv, x0, y0, w, h, seed):
    """Deep snow over a roof: a lumpy white cap from the ridge down, a shaded lower lip, icicles under the eave."""
    for x in range(x0, x0 + w):
        depth = int(h * 0.62 + 3 * math.sin((x + seed) * 0.35) + 2 * math.sin((x + seed) * 0.11))
        for y in range(y0, min(y0 + depth, y0 + h - 2)):
            if cv.get(x, y)[3] == 0:
                continue
            c = PAPER if (y - y0) < 3 else SN(4)
            if y >= y0 + depth - 2:
                c = SN(3)
            if (x * 7 + y * 3 + seed) % 23 == 0:
                c = SN(3)
            cv.set(x, y, c)
        if cv.get(x, y0 + depth)[3] and y0 + depth < y0 + h - 2:
            cv.set(x, y0 + depth, SN(2))
    # icicles under the eave
    ey = y0 + h
    for x in range(x0 + 2, x0 + w - 2):
        L = (h32(x, seed, 7901) % 5)
        if L >= 2 and x % 2 == 0:
            for k in range(L):
                cv.set(x, ey + k, IC(3) if k < L - 1 else IC(2))


def frost_window(cv, x, y, w=8, h=9, lit=True):
    """A small-paned window, frost in its corners; lit warm or dark iced."""
    for yy in range(h):
        for xx in range(w):
            if xx in (0, w - 1) or yy in (0, h - 1):
                c = WD(1)
            elif xx == w // 2 or yy == h // 2:
                c = WD(2)
            else:
                c = (GD(4) if (xx + yy) % 4 else FI(3)) if lit else (INK(2) if (xx + yy) % 3 else WA(1))
                corner = min(xx, w - 1 - xx) + min(yy, h - 1 - yy)
                if corner <= 2:
                    c = SN(4) if lit else SN(3)
            cv.set(x + xx, y + yy, c)
    for xx in range(w + 2):
        cv.set(x - 1 + xx, y + h, SN(4))
        cv.set(x - 1 + xx, y - 1, SN(3) if xx % 3 else SN(4))


def snow_house(wt, rr, wr, top=0, door=None, windows=(), extras=None, seed=0, roof='roof_blue', wall='timber'):
    """A Palehaven house seen from the south: a slate roof under deep snow (rr rows), the front wall (wr rows) of dark
    timber (or blue stone) on a stone foot, frosted windows, a door; optional extra rows on top (towers, lamps)."""
    W, H = wt * 16 + 6, (top + rr + wr) * 16
    cv = Canvas(W, H)
    bw = wt * 16
    roof_y = top * 16
    wall_y0 = roof_y + rr * 16 - 2
    g = dict(wall_x0=1, wall_x1=bw - 2, wall_y0=wall_y0, wall_y1=H, roof_y=roof_y, bw=bw, W=W, H=H)
    bld.roof_side(cv, 0, roof_y, bw, rr * 16 + 2, roof, hip=6, seed=seed, slate=True)
    for y in range(wall_y0 + 2, H - 3):
        for x in range(1, bw - 1):
            if wall == 'timber':
                c = WD(2) if (x // 4) % 2 else WD(1)
                if x % 4 == 0:
                    c = WD(0)
                if (y + x // 4 * 3) % 11 == 0:
                    c = WD(3)
            else:
                course = (y - wall_y0) // 5
                u = (x + (course % 2) * 6) % 12
                c = SC(3) if u else SC(1)
                if (y - wall_y0) % 5 == 0:
                    c = SC(2)
                if u == 1:
                    c = SC(4)
            cv.set(x, y, c)
    bld.eave_shadow(cv, 1, wall_y0 + 2, bw - 2, rows=3)
    for y in range(wall_y0 + 2, H - 3):
        for x in (1, 2, bw - 3, bw - 2):
            cv.set(x, y, WD(3) if x in (1, bw - 3) else WD(0))
    bld.stone_blocks(cv, 0, H - 4, bw, 4, ramp='stone_cool', course=4, seed=seed)
    for x in range(0, bw):
        cv.set(x, H - 5, SN(4) if (x + seed) % 5 else SN(3))     # snow banked along the foot
    for wdw in windows:
        frost_window(cv, wdw['x'], wall_y0 + wdw['y'], wdw.get('w', 8), wdw.get('h', 9), lit=wdw.get('lit', True))
    door_meta = None
    if door:
        dx, dw, dh = door['x'], door.get('w', 12), door.get('h', 20)
        bld.door(cv, dx, H - 3 - dh, w=dw, h=dh, arch=True, ramp='wood', frame='stone')
        door_meta = (dx + dw // 2) // 16
    snow_roof(cv, 0, roof_y, bw, rr * 16, seed)
    if extras:
        extras(cv, g)
    for y in range(roof_y + 6, H):
        for x in range(bw, bw + 6):
            if (x + y) % 2 == 0 or x < bw + 3:
                cv.put(x, y, SH(80))
    rows = top + rr + wr
    meta = {
        'rect_wh': [W, H],
        'anchor': [0, rows - 1],
        'footprint': [[dx, dy] for dy in range(-(rr + wr) + 1, 1) for dx in range(wt)
                      if not (door_meta is not None and dx == door_meta and dy == 0)],
        'overheadRows': rows - (rr + wr),
        'doorAt': [door_meta, 0] if door_meta is not None else None,
        'collision': 'solid',
    }
    return cv, meta


def chimney_smoke(cv, x, y, h=10):
    R(cv, x, y, 6, h, SC(2))
    for yy in range(y, y + h):
        cv.set(x, yy, SC(3))
        cv.set(x + 5, yy, SC(0))
    R(cv, x - 1, y - 2, 8, 3, PAPER)
    cv.hline(x - 1, x + 6, y, SN(3))


def fur_roll(cv, x, y):
    for k in range(10):
        cv.set(x + k, y, SW(4) if k % 3 else SW(3))
        cv.set(x + k, y + 1, SW(3))
        cv.set(x + k, y + 2, SW(2) if k % 2 else WD(2))
    cv.set(x, y + 1, SW(5)); cv.set(x + 9, y + 1, SW(1))


def lodge_thawlight():
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        bld.hanging_sign(cv, 34, y0 + 9, 'bed', w=14, h=10)
        fur_roll(cv, 70, y1 - 14)
        fur_roll(cv, 82, y1 - 14)
        chimney_smoke(cv, 86, g['roof_y'] + 2, 12)
    return snow_house(7, 2, 3, top=1, door={'x': 50, 'w': 14, 'h': 22},
                      windows=[{'x': 8, 'y': 12, 'w': 10, 'h': 10}, {'x': 70, 'y': 9, 'w': 9, 'h': 9},
                               {'x': 92, 'y': 9, 'w': 9, 'h': 9}], extras=ext, seed=711, roof='roof_red')


def shop_northwind():
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        bld.hanging_sign(cv, 8, y0 + 9, 'mug', w=12, h=10)
        # drying herbs hung under the eave
        for k, hx_ in enumerate(range(42, 72, 6)):
            cv.set(hx_, y0 + 4, WD(1))
            for t in range(4):
                cv.set(hx_ + (t % 2), y0 + 5 + t, [C('grass', 3), C('grass', 2), RG(3)][(k + t) % 3])
        bld.awning(cv, 40, y0 + 12, 34, 'cloth_blue', 'sand', depth=5)
    return snow_house(5, 2, 2, top=1, door={'x': 22, 'w': 12, 'h': 20}, windows=[{'x': 48, 'y': 20, 'w': 10, 'h': 8}],
                      roof='roof_blue', extras=ext, seed=713)


def armory_glassice():
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        bld.hanging_sign(cv, 66, y0 + 9, 'hammer', w=13, h=10)
        # the glass furnace: a round mouth, blue-white heat, lenses on cords beside it
        for y in range(y1 - 20, y1 - 4):
            for x in range(8, 28):
                d = math.hypot(x + 0.5 - 18, (y + 0.5 - (y1 - 10)) * 1.2)
                if d < 9:
                    cv.set(x, y, SC(0) if d > 7.6 else (WHITE if d < 3 else CY(3) if d < 5.5 else CY(2)))
        for k, lx in enumerate((34, 40, 46)):
            cv.set(lx, y0 + 6, MT(1))
            for t in range(1, 4 + k):
                cv.set(lx, y0 + 6 + t, MT(1))
            disc(cv, lx, y0 + 11 + k, 1.8, lambda x, y, d: IC(3) if d < 1.0 else IC(1))
        chimney_smoke(cv, 20, g['roof_y'] + 4, 10)
    return snow_house(6, 2, 2, top=1, door={'x': 40, 'w': 14, 'h': 20}, roof='roof_red', extras=ext, seed=717,
                      wall='stone', windows=[{'x': 72, 'y': 18, 'w': 8, 'h': 8}])


def keepers_watch():
    """The Keeper's Watch: a tall narrow blue-stone house with a lamp tower and a shuttered window; the lamp cold until
    the thaw (the map lights it with its own prop or a light)."""
    def ext(cv, g):
        y0, y1, bw = g['wall_y0'], g['wall_y1'], g['bw']
        # the lamp tower on top (the top rows)
        tx = bw // 2 - 8
        for y in range(4, g['roof_y'] + 18):
            for x in range(tx, tx + 16):
                c = SC(3) if x < tx + 5 else SC(2) if x < tx + 12 else SC(1)
                if (y // 5) % 2 and x % 6 == 0:
                    c = SC(1)
                cv.set(x, y, c)
        R(cv, tx - 2, 2, 20, 3, SC(1))
        cv.hline(tx - 2, tx + 17, 1, PAPER)
        cv.hline(tx - 2, tx + 17, 0, SN(3))
        for y in range(8, 18):
            for x in range(tx + 4, tx + 12):
                cv.set(x, y, INK(1) if (x + y) % 3 else WA(1))
        R(cv, tx + 3, 7, 10, 1, SC(0)); R(cv, tx + 3, 18, 10, 1, SC(0))
        # the shutter: closed boards over the big window
        for y in range(y0 + 10, y0 + 26):
            for x in range(8, 24):
                c = WD(2) if (x // 3) % 2 else WD(3)
                if y in (y0 + 10, y0 + 25) or x in (8, 23):
                    c = WD(0)
                cv.set(x, y, c)
        cv.line(8, y0 + 10, 23, y0 + 25, WD(1))
        # the Keepers' sign: an open book (a plaque over the door)
        R(cv, 44, y0 + 8, 16, 9, SN(4))
        cv.hline(44, 59, y0 + 8, SC(0)); cv.hline(44, 59, y0 + 16, SC(0))
        cv.line(46, y0 + 11, 51, y0 + 10, INK(2)); cv.line(52, y0 + 10, 57, y0 + 11, INK(2))
        cv.line(51, y0 + 10, 51, y0 + 14, INK(2))
    return snow_house(5, 2, 3, top=1, door={'x': 46, 'w': 12, 'h': 22}, roof='roof_blue', extras=ext, seed=719,
                      wall='stone', windows=[])


def house_snow_a():
    def ext(cv, g):
        chimney_smoke(cv, 44, g['roof_y'] + 3, 10)
    return snow_house(4, 2, 2, door={'x': 8, 'w': 12, 'h': 19}, windows=[{'x': 36, 'y': 12, 'w': 9, 'h': 9}],
                      extras=ext, seed=721, roof='roof_purple')


def house_snow_b():
    return snow_house(5, 2, 2, door={'x': 46, 'w': 12, 'h': 19},
                      windows=[{'x': 10, 'y': 12, 'w': 9, 'h': 9}, {'x': 26, 'y': 12, 'w': 9, 'h': 9, 'lit': False}],
                      roof='roof_green', seed=723)


def waystation_hut():
    def ext(cv, g):
        y0 = g['wall_y0']
        # the courier's post horn sign
        R(cv, 6, y0 + 8, 12, 9, WD(3))
        cv.hline(6, 17, y0 + 8, WD(4)); cv.hline(6, 17, y0 + 16, WD(1))
        for k in range(7):
            cv.set(8 + k, y0 + 12 - (1 if k in (2, 3) else 0), GD(3))
        disc(cv, 15, y0 + 12, 1.8, lambda x, y, d: GD(4) if d < 1 else GD(2))
        chimney_smoke(cv, 40, g['roof_y'] + 2, 9)
    return snow_house(4, 2, 2, door={'x': 26, 'w': 12, 'h': 19}, windows=[], extras=ext, seed=727, roof='roof_red')


# ====================================================================== the square
def returning_hearth(k):
    """The Returning Hearth (2 x 3): a round ring of dark stones on the square. 0 cold: ash, frost on the stones, snow in
    the pit; 1..3 lit: a fire with a warm glow (cycle 1, 2, 3)."""
    cv = Canvas(32, 48)
    contact_shadow(cv, 1, 30, 47)
    ellipse(cv, 16, 39, 15, 8, lambda dx, dy, d: SC(1) if dy > 0.3 else SC(2))
    for i in range(12):
        a = i * math.pi / 6
        x, y = 16 + math.cos(a) * 12.5, 39 + math.sin(a) * 6.5
        ellipse(cv, x, y, 3.0, 2.3, lambda dx, dy, d: (SN(4) if k == 0 and dy < -0.4 else SC(4)) if (dx + dy) < -0.5
                else SC(3) if (dx + dy) < 0.4 else SC(1))
    ellipse(cv, 16, 39, 9, 4.2, lambda dx, dy, d: (SN(3) if k == 0 and (dx * 5 + dy * 3) % 1 < 0.5 else SC(0)) if d < 1 else None)
    if k == 0:
        for (x, y) in ((12, 39), (13, 40), (19, 38), (20, 39), (16, 41)):
            cv.set(x, y, SC(3))
        cv.line(11, 38, 21, 40, WD(0))
        cv.line(12, 41, 20, 37, WD(1))
    else:
        f = k - 1
        cv.line(11, 40, 21, 38, WD(1))
        cv.line(12, 38, 20, 41, WD(0))
        for i, (bx, h) in enumerate(((12, 13), (16, 20), (20, 14), (14, 9), (18, 11))):
            hh = h + [0, 2, -1][(f + i) % 3]
            for t in range(hh):
                w = max(0, int(round((1 - t / hh) * 2.4)))
                sway = int(round(math.sin((t + f * 2 + i) * 0.6) * (t / hh) * 1.5))
                for dx in range(-w, w + 1):
                    c = WHITE if (t < hh * 0.35 and abs(dx) < w) else GD(4) if t < hh * 0.6 else FI(3) if t < hh * 0.85 else FI(2)
                    cv.set(bx + dx + sway, 39 - t, c)
        warm_glow(cv, 16, 30, 16, a=70, col=FI(4))
    return cv


def iced_door(opened):
    """A Palehaven front door (1 x 2 piece, set over a house's door): 0 sheathed in ice, the lintel blank; 1 open a
    crack, the ice gone, a name back on the lintel (a gold glint of glyph bars)."""
    cv = Canvas(16, 32)
    R(cv, 1, 6, 14, 4, SC(2))
    cv.hline(1, 14, 6, SN(4))
    cv.hline(1, 14, 9, SC(0))
    for y in range(10, 32):
        for x in range(2, 14):
            c = WD(3) if (x // 3) % 2 else WD(2)
            if x in (2, 13):
                c = WD(1)
            if y in (17, 25):
                c = WD(1)
            cv.set(x, y, c)
    if opened:
        for y in range(11, 32):
            for x in range(9, 13):
                cv.set(x, y, FI(2) if x > 10 else WD(0))
        for x in range(4, 12):
            if x % 3 != 1:
                cv.set(x, 8, GD(4))
        cv.set(5, 7, WHITE)
        for (x, y) in ((3, 30), (4, 31), (13, 31)):
            cv.set(x, y, IC(3))
    else:
        for y in range(9, 32):
            for x in range(1, 15):
                p = cv.get(x, y)
                edge = min(x - 1, 14 - x)
                c = IC(3) if edge == 0 else None
                if c is None:
                    c = tuple(int(p[i] * 0.45 + IC(2)[i] * 0.55) for i in range(3)) + (255,) if p[3] else IC(2)
                cv.set(x, y, c)
        for (x, y) in ((4, 12), (5, 13), (5, 14), (10, 20), (11, 21)):
            cv.set(x, y, WHITE)
        for x in range(2, 14, 2):
            for t in range((x * 3) % 4 + 1):
                cv.set(x, 10 + t, IC(3))
    ink_outline(cv)
    return cv


def vanishing_mark(filled):
    """The Vanishing Mark (a 1 x 2 stele of blue stone): a ring of carved names round a hollow. 0 the hollow, paper
    white, eating into the ring; 1 filled, the names whole and the ring's middle carved with the open book."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    for y in range(4, 31):
        for x in range(2, 14):
            top = 4 + int(round(2.5 * (1 - math.cos((x - 2) / 11.0 * math.pi)) * 0.5)) if y < 7 else 4
            if y < 7 and y < 7 - int(2.5 * math.sin((x - 2) / 11.0 * math.pi)):
                continue
            c = SC(4) if x < 5 else SC(3) if x < 11 else SC(2)
            cv.set(x, y, c)
    for x in range(3, 13):
        cv.set(x, 5 if 4 < x < 11 else 6, SN(4))
    cx, cy = 8, 17
    for y in range(10, 25):
        for x in range(3, 13):
            d = math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 0.9)
            if 4.2 < d < 5.6:
                cv.set(x, y, SC(1) if (x + y) % 3 else SC(0))
            elif d <= 4.2:
                if filled:
                    cv.set(x, y, SC(3))
                else:
                    cv.set(x, y, PAPER if d < 3.4 else SN(4))
    if filled:
        for (x, y) in ((5, 16), (6, 15), (7, 16), (8, 17), (9, 16), (10, 15), (11, 16), (8, 18), (8, 19)):
            cv.set(x, y, GD(3))
    else:
        # the hollow biting into the ring at the top right
        for (x, y) in ((11, 13), (12, 13), (11, 12), (10, 12), (12, 14)):
            cv.set(x, y, PAPER)
    R(cv, 1, 28, 14, 3, SC(1))
    cv.hline(1, 14, 28, SN(4))
    ink_outline(cv)
    return cv


def crystal(k):
    """An aurora crystal on an iron pole (decor, solid, light): a green-violet shard glowing, the glow pulsing (anim 3)."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 5, 10, 31)
    for y in range(12, 31):
        cv.set(7, y, MT(1)); cv.set(8, y, SC(1))
    R(cv, 5, 28, 6, 3, SC(2))
    pts = [(8, 1), (11, 6), (10, 12), (8, 13), (6, 12), (5, 6)]
    for y in range(1, 14):
        for x in range(4, 12):
            if inside_poly(x + 0.5, y + 0.5, pts):
                c = AG(2) if x < 7 else AG(1) if x < 9 else MV(2)
                if y < 4:
                    c = AG(2) if x < 8 else MV(3)
                cv.set(x, y, c)
    cv.set(6, 4 + k, WHITE)
    ink_outline(cv, INK(1))
    warm_glow(cv, 8, 7, 8, a=[50, 70, 60][k], col=AG(2))
    return cv


def inside_poly(px, py, pts):
    c = False
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
            c = not c
    return c


def auroraobelisk():
    """A tall obelisk of blue stone with an aurora crystal set in its top (1 x 3, canon)."""
    cv = Canvas(16, 48)
    contact_shadow(cv, 2, 13, 47)
    for y in range(10, 46):
        half = 3 + (y - 10) * 2.0 / 36
        for x in range(int(8 - half), int(8 + half) + 1):
            u = (x - (8 - half)) / (2 * half)
            cv.set(x, y, SC(4) if u < 0.3 else SC(3) if u < 0.7 else SC(2))
    R(cv, 3, 44, 10, 3, SC(1))
    cv.hline(3, 12, 44, SN(4))
    pts = [(8, 1), (11, 6), (8, 11), (5, 6)]
    for y in range(1, 12):
        for x in range(4, 12):
            if inside_poly(x + 0.5, y + 0.5, pts):
                cv.set(x, y, AG(2) if x < 8 else MV(2))
    for y in range(16, 40, 4):
        cv.hline(6, 9, y, SC(1))
    ink_outline(cv, INK(1))
    warm_glow(cv, 8, 6, 8, a=60, col=AG(2))
    return cv


def frostfire(k):
    """A frostfire brazier: an iron bowl on a tripod, a cold blue-white flame (anim 3, light)."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 3, 12, 31)
    for (x0, x1) in ((4, 6), (11, 9), (8, 8)):
        cv.line(x0, 30, x1, 20, SC(0))
    ellipse(cv, 8, 19, 6, 2.6, lambda dx, dy, d: SC(2) if dy < 0 else SC(1))
    cv.hline(2, 13, 18, MT(2))
    for i, (bx, h) in enumerate(((6, 9), (8, 12), (10, 8))):
        hh = h + [0, 2, -1][(k + i) % 3]
        for t in range(hh):
            w = max(0, int(round((1 - t / hh) * 1.8)))
            sway = int(round(math.sin((t + k * 2 + i) * 0.7) * (t / hh)))
            for dx in range(-w, w + 1):
                c = WHITE if t < hh * 0.3 else CY(3) if t < hh * 0.65 else CY(2)
                cv.set(bx + dx + sway, 17 - t, c)
    ink_outline(cv, INK(1))
    warm_glow(cv, 8, 11, 8, a=55, col=CY(3))
    return cv


def pine(w, h, snow=0.6, seed=0, tiers=5):
    """A pine seen from the south: tiers of dark needles, each wider than the one above, its lower edge drooping in
    jagged boughs; lit on the left, near black on the right; snow lying along every tier's upper slope as a solid white
    cap (thicker in the middle: `snow` scales it); a short trunk; an outline."""
    cv = Canvas(w, h)
    cx = w / 2.0 - 0.5
    trunk_top = h - 6
    for y in range(trunk_top - 2, h - 1):
        for x in range(int(cx), int(cx) + 2):
            cv.set(x, y, WD(1) if x <= cx else WD(0))
    top = 1
    span = trunk_top - top
    for t in range(tiers):
        ty0 = top + int(t * span / (tiers + 0.6))
        ty1 = top + int((t + 1.6) * span / (tiers + 0.6))
        hw = 2.5 + (t + 1) * (w / 2.0 - 2.5) / tiers
        tops = {}
        for y in range(ty0, min(ty1, trunk_top)):
            k = (y - ty0) / max(1.0, (ty1 - ty0))
            half = 1.0 + k * hw
            for x in range(int(math.floor(cx - half)), int(math.ceil(cx + half)) + 1):
                if not 0 <= x < w:
                    continue
                u = (x - (cx - half)) / max(1.0, 2 * half)
                # the drooping lower edge: bough tips every 4 px hang a pixel or two lower
                if k > 0.82 and ((x + t * 2) % 4 in (1, 2)) and k > 0.9:
                    continue
                c = FD(2) if u < 0.18 else FD(1) if u < 0.45 else FD(0) if u < 0.82 else DARK
                cv.set(x, y, c)
                tops.setdefault(x, y)
        # the snow on this tier: the first rows of every column from its top (along the slope), thicker in the middle
        for x, y0 in tops.items():
            u = abs(x - cx) / max(1.0, hw)
            d = int(round(snow * (3.2 - 2.2 * u)))
            for j in range(max(1, d)):
                if y0 + j < trunk_top and cv.get(x, y0 + j)[3]:
                    cv.set(x, y0 + j, PAPER if x < cx - 1 else SN(4) if x < cx + 2 else SN(3))
            if cv.get(x, y0 + max(1, d))[3] and u < 0.8:
                cv.set(x, y0 + max(1, d), SN(1) if x > cx else SN(2))
    ink_outline(cv, DARK)
    return cv


def snowpine():
    """A snow-laden pine for the town (2 x 3, solid at the trunk; canon decor)."""
    cv = pine(32, 48, snow=0.8, seed=1, tiers=4)
    contact_shadow(cv, 9, 22, 47)
    return cv


def black_pine():
    """The road's black pine (2 x 4): tall, near-black, snow in its tiers."""
    cv = pine(32, 64, snow=0.5, seed=2, tiers=5)
    contact_shadow(cv, 8, 23, 63)
    return cv


def snowbank():
    """A drift banked against nothing (2 x 1, solid): a lit crest, blue shade under it, a dark root."""
    cv = Canvas(32, 16)
    for x in range(1, 31):
        hgt = int(round(6 + 4 * math.sin((x - 1) / 29.0 * math.pi) + math.sin(x * 0.7)))
        for y in range(15 - hgt, 15):
            t = (y - (15 - hgt)) / max(1, hgt)
            cv.set(x, y, PAPER if t < 0.2 else SN(4) if t < 0.5 else SN(3) if t < 0.8 else SN(2))
    ink_outline(cv, SN(0))
    return cv


def traveler_wall():
    """The Traveler's Wall (6 x 3): a long low wall of blue stone on the road's west side, its face covered in carved
    names (glyph bars, never readable), a snow cap, frost in the cuts; one fresh cut high on the right (Vex's, the map
    places the scene there)."""
    cv = Canvas(96, 48)
    for x in range(96):
        cv.put(x, 47, SH(90))
    for y in range(8, 46):
        for x in range(1, 95):
            course = (y - 8) // 8
            u = (x + (course % 2) * 10) % 20
            c = SC(3) if u else SC(1)
            if (y - 8) % 8 == 0:
                c = SC(2)
            if u == 1:
                c = SC(4)
            cv.set(x, y, c)
    for x in range(0, 96):
        hgt = 3 + int(round(1.5 * math.sin(x * 0.27) + math.sin(x * 0.09)))
        for y in range(8 - hgt, 9):
            cv.set(x, y, PAPER if y < 8 - hgt + 2 else SN(4) if y < 8 else SN(3))
    # the names: rows of glyph bars in the courses, frost in some cuts
    for row in range(4):
        y = 12 + row * 8
        x = 4 + (row * 7) % 9
        while x < 90:
            L = 4 + h32(x, row, 7960) % 9
            for xx in range(x, min(92, x + L)):
                if (xx * 5 + row) % 7 == 0:
                    continue
                cv.set(xx, y, SC(0))
                cv.set(xx, y + 1, SN(2) if h32(xx, row, 7961) % 4 == 0 else SC(2))
            x += L + 3
    # the fresh cut (Vex's): bright stone in a newer hand, high on the right
    for xx in range(72, 88):
        if xx % 4 != 3:
            cv.set(xx, 11, SC(0))
            cv.set(xx, 10, SN(4))
    ink_outline(cv, SC(0))
    return cv


def icegate():
    """The Icegate (5 x 4): two pillars of blue ice blocks and an arch of ice between them, snow on the crown, icicles
    hanging into the way; the pillars are solid, the arch overhead."""
    cv = Canvas(80, 64)
    from ep7_kit import ice_block
    for (x0, x1) in ((0, 16), (64, 80)):
        for y in range(10, 64):
            for x in range(x0, x1):
                cv.set(x, y, ice_block(x % 16, y))
        cv.put(x0, 63, SH(90))
    for y in range(4, 26):
        for x in range(0, 80):
            d = math.hypot((x + 0.5 - 40) / 26.0, (y + 0.5 - 30) / 22.0)
            if y < 26 and (d >= 1.0 or x < 16 or x >= 64) and y >= 4:
                if d < 1.0 and 16 <= x < 64:
                    continue
                cv.set(x, y, ice_block(x % 16, y + 3))
    for x in range(0, 80):
        hgt = 3 + int(round(math.sin(x * 0.2) * 1.5))
        for y in range(4 - hgt, 5):
            cv.set(x, y, PAPER if y < 3 else SN(4))
    for x in range(18, 62, 3):
        top = 0
        for y in range(4, 30):
            d = math.hypot((x + 0.5 - 40) / 26.0, (y + 0.5 - 30) / 22.0)
            if d < 1.0:
                top = y
                break
        L = 2 + (x * 7) % 5
        for k in range(L):
            cv.set(x, top + k, IC(3) if k < L - 1 else IC(2))
    ink_outline(cv, WA(1))
    return cv


def post_box():
    """The courier's post box (1 x 2): a red iron box on a post, a brass badge, snow on the lid."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 4, 11, 31)
    for y in range(20, 31):
        cv.set(7, y, WD(2)); cv.set(8, y, WD(1))
    box(cv, 3, 8, 12, 20, RR(4), RR(3), RR(2), DARK, round_=True)
    R(cv, 5, 12, 6, 1, DARK)
    disc(cv, 8, 16, 1.6, lambda x, y, d: GD(4) if d < 0.9 else GD(2))
    for x in range(3, 13):
        cv.set(x, 7, SN(4))
        cv.set(x, 8, PAPER if x % 3 else SN(3))
    ink_outline(cv)
    return cv


def tally_frame():
    """The doorframe tally (1 x 2 piece, set against an inner wall beside the door): a timber post scored with strokes in
    groups, every seventh crossed with a bar, and a clean white patch where a name was cut away."""
    cv = Canvas(16, 32)
    R(cv, 3, 0, 10, 32, WD(3))
    cv.vline(3, 0, 31, WD(4)); cv.vline(12, 0, 31, WD(1))
    n = 0
    for y in range(3, 30, 2):
        if 15 <= y <= 19:
            continue
        for k in range(3):
            x = 5 + k * 2 + (y // 2) % 2
            if x > 11:
                continue
            n += 1
            cv.set(x, y, WD(0))
            cv.set(x, y + 1, WD(0))
            if n % 7 == 0:
                cv.set(x - 1, y, WD(5)); cv.set(x + 1, y + 1, WD(5)); cv.set(x, y, WD(5))
    for y in range(15, 20):
        for x in range(4, 12):
            cv.set(x, y, SW(5) if (x + y) % 3 else PAPER)
    return cv


def courier_stove(k):
    """The waystation's stove (2 x 2, rest and save once lit): an iron pot-bellied stove and its pipe. 0 cold (frost
    on the iron), 1 and 2 lit (the door glowing, cycle 1, 2)."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 4, 27, 31)
    for y in range(0, 14):
        cv.set(15, y, SC(1)); cv.set(16, y, SC(2)); cv.set(17, y, SC(0))
    ellipse(cv, 16, 21, 9, 8, lambda dx, dy, d: SC(2) if dx < -0.3 else SC(1) if d < 0.9 else DARK)
    R(cv, 8, 28, 16, 3, SC(0))
    for (x, y) in ((9, 30), (22, 30)):
        R(cv, x, y, 2, 2, SC(0))
    for y in range(18, 25):
        for x in range(12, 21):
            if k == 0:
                c = SC(0) if (x + y) % 3 else INK(1)
            else:
                c = [FI(3), FI(4)][(x + y + k) % 2] if 13 <= x <= 19 and 19 <= y <= 23 else SC(0)
            cv.set(x, y, c)
    if k == 0:
        for (x, y) in ((10, 16), (11, 15), (21, 17), (14, 13)):
            cv.set(x, y, SN(4))
    ink_outline(cv)
    if k:
        warm_glow(cv, 16, 22, 12, a=60, col=FI(4))
    return cv


# ====================================================================== the decals
def _cell6():
    src = os.path.join(os.path.dirname(NEXT), 'assets', 'art', 'environments.webp')
    im = Image.open(src).convert('RGB')
    w, h = im.size
    cw, ch = w // 2, h // 4
    return im.crop((0, 3 * ch, cw, 4 * ch)), cw, ch


def _quant(col, pal):
    d = ((pal - col) ** 2).sum(1)
    k = int(np.argmin(d))
    return tuple(int(v * 255 + 0.5) for v in pal[k]) + (255,)


def _keyed(box_, size, envelope, haze=0.08, sky_rule=None, sky_floor=70):
    """Cut a piece of cell 6 with a hard alpha: median filter, box downscale, key the night sky and the aurora out (dark
    saturated blue, teal and green, violet: the sky has no grey and no warm), keep only what lies inside `envelope`
    (a polygon in output pixels that bounds the buildings, so the far mountains go with the sky), shave spurs, close
    pinholes, drop specks, quantize to the sheet palette with a little far haze and draw a 1 px dark outline round the
    mask (CRITIQUE_8 item 8: no soft painted edge at phone scale)."""
    from PIL import ImageFilter
    from pxlib import PAL
    cell, cw, ch = _cell6()
    W, H = size
    crop = cell.crop(box_).filter(ImageFilter.MedianFilter(3)).resize((W, H), Image.BOX)
    a = np.asarray(crop).astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    env = np.zeros((H, W), bool)
    for y in range(H):
        for x in range(W):
            env[y, x] = inside_poly(x + 0.5, y + 0.5, envelope)
    # the night sky and the aurora are the cathedral's own blue, so the envelope (traced on the painting at decal scale)
    # is the cut; inside it, sky still showing between the spires is keyed by a flood from the envelope's edge through
    # sky-coloured pixels only (dark navy, aurora teal), never below `sky_floor`
    cand = (((b - r) > 0.30) & (lum < 0.30)) | (((g - r) > 0.30) & (b > 0.55))
    if sky_rule is not None:
        cand = cand | sky_rule(r, g, b, lum, None)
    cand[sky_floor:, :] = False
    keep = env.copy()
    st = [(y, x) for y in range(H) for x in range(W) if env[y, x] and cand[y, x] and
          (y == 0 or x == 0 or x == W - 1 or not env[max(0, y - 1), x] or not env[y, max(0, x - 1)] or
           not env[y, min(W - 1, x + 1)])]
    for (y, x) in st:
        keep[y, x] = False
    while st:
        cy, cx = st.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < H and 0 <= nx < W and keep[ny, nx] and cand[ny, nx]:
                keep[ny, nx] = False
                st.append((ny, nx))

    def nb(m):
        p = np.pad(m, 1)
        return p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]

    def components(want):
        seen = np.zeros_like(keep)
        out = []
        for y0 in range(H):
            for x0 in range(W):
                if keep[y0, x0] != want or seen[y0, x0]:
                    continue
                st, comp, edge = [(y0, x0)], [], False
                seen[y0, x0] = True
                while st:
                    cy, cx = st.pop()
                    comp.append((cy, cx))
                    edge = edge or cy in (0, H - 1) or cx in (0, W - 1)
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and keep[ny, nx] == want and not seen[ny, nx]:
                            seen[ny, nx] = True
                            st.append((ny, nx))
                out.append((comp, edge))
        return out

    for _ in range(2):
        keep = keep & (nb(keep) >= 2)
    for comp, _e in components(True):
        if len(comp) < 30:
            for cy, cx in comp:
                keep[cy, cx] = False
    for comp, edge in components(False):
        if not edge and len(comp) < 16:
            for cy, cx in comp:
                keep[cy, cx] = True
    pal = np.array([hexc(x)[:3] for x in list(PAL['colors']) + EXTRA], np.float32) / 255.0
    cv = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            if keep[y, x]:
                col = np.array([r[y, x] * (1 - haze) + 0.62 * haze, g[y, x] * (1 - haze) + 0.70 * haze,
                                b[y, x] * (1 - haze) + 0.86 * haze])
                cv.set(x, y, _quant(col, pal))
    ring = (~keep) & (nb(keep) > 0)
    for y in range(H):
        for x in range(W):
            if ring[y, x]:
                cv.set(x, y, INK(1))
    return cv


def palehaven_far():
    """176 x 112 decal (the Icegate's view, mark palehaven_far): cell 6's cathedral and the town on its cliffs, the
    bridge and the falls cut off below, the sky and the mountains keyed out."""
    env = [(0, 108), (0, 60), (8, 58), (20, 58), (36, 60), (42, 54), (46, 44), (49, 34), (52, 42), (56, 30), (58, 26),
           (61, 12), (64, 26), (66, 30), (70, 38), (74, 36), (78, 40), (82, 34), (86, 29), (90, 34), (94, 40), (98, 30),
           (101, 24), (104, 15), (107, 24), (110, 32), (112, 44), (116, 58), (122, 60), (126, 52), (130, 62), (136, 64),
           (142, 58), (146, 66), (152, 64), (158, 68), (166, 66), (175, 70), (175, 108), (150, 111), (110, 106),
           (70, 111), (30, 106)]
    cv = _keyed((300, 4, 591, 189), (176, 112), env, sky_floor=72)
    return cv


def cathedral_far():
    """112 x 96 decal (the town's north skyline, mark cathedral_far): cell 6's cathedral, its spires and rose window,
    the sky and the mountains keyed out, cut off in a ragged line at the cliff."""
    env = [(0, 92), (0, 70), (6, 66), (9, 58), (12, 64), (16, 44), (18, 34), (21, 44), (24, 30), (28, 22), (31, 12),
           (34, 22), (38, 30), (40, 40), (44, 44), (48, 40), (52, 36), (56, 30), (58, 26), (60, 30), (64, 36), (68, 40),
           (72, 30), (76, 22), (79, 13), (82, 22), (86, 30), (88, 40), (92, 48), (96, 56), (100, 64), (104, 58),
           (107, 66), (111, 74), (111, 92), (90, 95), (60, 90), (30, 95)]
    cv = _keyed((356, 6, 520, 146), (112, 96), env, sky_floor=66)
    return cv


def faded(cv):
    """The second frame of a far decal: the same picture with a dithered quarter of its pixels gone (the slow fade)."""
    out = cv.copy()
    for y in range(cv.h):
        for x in range(cv.w):
            if out.get(x, y)[3] and ((x * 3 + y * 5) % 4 == 0):
                out.set(x, y, (0, 0, 0, 0))
    return out


# ====================================================================== build
def build_into(sh):
    sh.newline()
    items = []
    for pid, fn in (('lodge_thawlight', lodge_thawlight), ('shop_northwind', shop_northwind),
                    ('armory_glassice', armory_glassice), ('keepers_watch', keepers_watch),
                    ('house_snow_a', house_snow_a), ('house_snow_b', house_snow_b), ('waystation_hut', waystation_hut)):
        cv, m = fn()
        items.append((pid, cv, m))
    items.sort(key=lambda t: (-t[1].h, t[0]))
    notes = {'lodge_thawlight': 'the Thawlight Lodge (bed sign, fur rolls, smoke); door to ep7_ph_inn',
             'shop_northwind': 'Northwind Provisions (kettle sign, drying herbs, a blue awning); door to ep7_ph_shop',
             'armory_glassice': 'the Glass-Ice Armory (hammer sign, the glass furnace, lenses on cords); door to ep7_ph_armory',
             'keepers_watch': 'the Keeper\'s Watch (blue stone, the lamp tower, the shuttered window, the open-book '
                              'plaque); door to ep7_ph_watch',
             'house_snow_a': 'a Palehaven house (purple slate, smoke)', 'house_snow_b': 'a Palehaven house (green slate)',
             'waystation_hut': 'the Courier\'s Waystation on the White Road (the post-horn sign); door to ep7_waystation'}
    for pid, cv, meta in items:
        m = dict(meta)
        w, h = m.pop('rect_wh')
        x, y = sh.alloc(w, h)
        sh.cv.paste(cv, x, y)
        sh.meta['objects'][pid] = {'rect': [x, y, w, h], 'kind': 'building', 'note': notes[pid], **m}
    sh.newline()
    O = sh.meta['objects']
    put_frames(sh, 'returning_hearth', [returning_hearth(k) for k in range(4)], [0, 2],
               [[0, 0], [1, 0], [0, -1], [1, -1]], overhead=1, litFrames=[1, 2, 3], litMs=180,
               light={'color': '#eba14d', 'radius': 4.0, 'frames': [1, 2, 3]},
               note='the Returning Hearth (object hearth, 2 x 3): frame 0 cold (before hearth_lit or doors_reopened), '
                    '1..3 lit (cycle at 180 ms); light only while lit')
    put_frames(sh, 'iced_door', [iced_door(False), iced_door(True)], [0, 1], [], overhead=1, kind='piece',
               note='an iced door (iced_a to iced_f, set over a house\'s door cell; the door event decides passage): 0 '
                    'sheathed in ice, the lintel blank; 1 open a crack, the name back on the lintel (doors_reopened)')
    O['iced_door']['collision'] = 'none'
    put_frames(sh, 'vanishing_mark', [vanishing_mark(False), vanishing_mark(True)], [0, 1], [[0, 0]], overhead=1,
               note='the Vanishing Mark (a stele): 0 the white hollow eating the ring of names, 1 filled (doors_reopened)')
    put_frames(sh, 'crystal', [crystal(k) for k in range(3)], [0, 1], [[0, 0]], overhead=1, anim_ms=300,
               light={'color': '#a9f2cf', 'radius': 2.4}, note='an aurora crystal on a pole (canon decor, solid)')
    sh.obj('auroraobelisk', auroraobelisk(), [0, 2], [[0, 0]], 2, light={'color': '#a9f2cf', 'radius': 2.6},
           note='an aurora obelisk (canon; the Northward Beacon beacon_north can use it), solid')
    put_frames(sh, 'frostfire', [frostfire(k) for k in range(3)], [0, 1], [[0, 0]], overhead=1, anim_ms=200,
               light={'color': '#8af0e8', 'radius': 2.8}, note='a frostfire brazier (cold blue flame), solid')
    sh.newline()
    sh.obj('snowpine', snowpine(), [0, 2], [[0, 0], [1, 0]], 2, note='a snow-laden pine (town, canon decor), solid at the foot')
    sh.obj('black_pine', black_pine(), [0, 3], [[0, 0], [1, 0]], 3, note='the White Road\'s black pine (2 x 4), solid at the foot')
    sh.obj('snowbank', snowbank(), [0, 0], [[0, 0], [1, 0]], 0, note='a snow bank (2 x 1, solid)')
    sh.obj('traveler_wall', traveler_wall(), [0, 2], [[x, 0] for x in range(6)] + [[x, -1] for x in range(6)], 1,
           note='the Traveler\'s Wall (6 x 3 decor on the road\'s west side): carved names as texture, one fresh cut high '
                'on the right; solid on its two lower rows')
    sh.obj('icegate', icegate(), [0, 3], [[0, 0], [4, 0], [0, -1], [4, -1]], 2,
           note='the South Icegate (5 x 4 arch over the road north to Palehaven): the pillars (columns 0 and 4) solid, the '
                'arch overhead, the way through columns 1 to 3')
    sh.newline()
    sh.obj('post_box', post_box(), [0, 1], [[0, 0]], 1, note='the courier\'s post box (the waystation; inspect)')
    sh.obj('tally_frame', tally_frame(), [0, 1], [], 0, kind='piece',
           note='the doorframe tally (the waystation, mark tally; close-up ep7_tally): every seventh stroke crossed, a '
                'white patch where a name was; set against the inner wall, collision none')
    O['tally_frame']['collision'] = 'none'
    put_frames(sh, 'courier_stove', [courier_stove(k) for k in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               litFrames=[1, 2], litMs=220, light={'color': '#eba14d', 'radius': 3.0, 'frames': [1, 2]},
               note='the waystation stove (object stove; rest and save once lit, text key ep7_stove): 0 cold, 1 and 2 '
                    'lit (cycle)')
    sh.newline()
    pf = palehaven_far()
    sh.tile('palehaven_far', pf, collision='none',
            note='176 x 112 decal of Palehaven and its cathedral from environments cell 6 (sky and mountains keyed out, '
                 'hard alpha, 1 px outline) for the overhead layer at the Icegate (mark palehaven_far)')
    cf = cathedral_far()
    x, y = sh.alloc(cf.w * 2, cf.h)
    sh.cv.paste(cf, x, y)
    sh.cv.paste(faded(cf), x + cf.w, y)
    sh.meta['tiles']['cathedral_far'] = {'x': x, 'y': y, 'w': cf.w, 'h': cf.h, 'collision': 'none',
                                         'frames': [[x, y], [x + cf.w, y]], 'frameMs': 3000,
                                         'note': '112 x 96 decal of the frozen cathedral (environments cell 6) for the '
                                                 'overhead layer on Palehaven\'s north skyline (mark cathedral_far): frame 0 '
                                                 'whole, 1 a dithered quarter gone; swap at most once in 3 s (plan 4.3)'}
