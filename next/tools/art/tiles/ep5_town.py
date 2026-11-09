"""Saffron Haven (Episode 5): the copper-and-sandstone town kit, the Caravan Road's camp and tent, the haven_far decal
-> ep5.png (E5-tiles, EPISODE5_PLAN 4.2 to 4.4 and 9.1). Imported by ep5.py.

The town is built around one image (environments cell 4): sandstone cubes with flat roof terraces, gold-copper domes,
the great armillary over the tower, saffron and indigo awnings, palms over an oasis. Dragon Quest rule: every building
says what it is from a phone screen (a mug, a bolt of cloth, a hammer and a forge glow, rings on the tower).

Prefabs (kind building, doorAt): inn_lantern (the Dune Lantern Rest), shop_cloth (Saffron Caravan Supplies),
           smithy_copper (the Copperwind Smithy), tower_armillary (the Armillary Tower), arcade_serai (the caravanserai
           arcade, 6 wide), house_dome_a, house_dome_b, house_flat
Props      armillary (4 x 4 roof prop, all overhead), armillary_rings (3 x 3 interior rings, frames 0 and 1 = turned),
           waystone (frames 0..2 = the glyph rows shifting, 3 = still), bulletin (frames 0 = every route struck, 1 = open),
           moonwell (frames 0 = asleep, 1 = woken, light), mural_stars (the seven wandering stars, 3 x 2 piece on a wall),
           bell_rack (frames 0..3 = bells hung), camel_rest, camel_stand, camel_load, palm (2 x 3, canopy overhead),
           tent_caravan, stall_saffron, stall_indigo, lamp_brass (light), star_charts (frames 0 = the empty space,
           1 = a star in it), rug_saffron, lantern_hanging (anim, light), water_jars, cloth_bolts, forge_copper (anim,
           light), campfire_desert (tent_fire, anim, light), tent_omar (the shade tent), camp_ruin, water_stair (tile)
Lines      wall_sandstone (line16 low town wall, solid)
Decal      haven_far (160 x 96: environments cell 4 cut out and quantized, transparent sky; overhead at the last dune)
"""
import math, os
import numpy as np
from PIL import Image
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc, NEXT
import bld
from court_props import put_frames, ellipse, glow
from ep4_props import box, shadow, disc
from ep5_kit import SA, PA, SW, GD, FI, EA, WD, RB, WA, IC, CY, MT, SD, INK, RR, OC, BS, CP, MV
from ep5_props import slab, contact_shadow, R

GR = lambda i: C('grass', i)
FD = lambda i: C('foliage_dark', i)
RG = lambda i: C('roof_green', i)
BL = lambda i: C('blossom', i)


# ====================================================================== the building builder
def plaster_px(x, y, seed):
    r = rnd(x, y, seed, 5)
    if r < 0.05:
        return SA(1)
    if r < 0.08:
        return SA(3)
    return SA(2)


def desert_house(wt, rr, wr, top=0, dome=None, domes=(), door=None, windows=(), extras=None, seed=0, parapet=True,
                 tall=False):
    """A sandstone cube seen from the south: a flat roof terrace (rr rows, seen from above, a parapet round it), the
    front wall (wr rows) with an arched door and lattice windows, optional gold-copper domes rising above (top rows)."""
    W, H = wt * 16 + 8, (top + rr + wr) * 16
    cv = Canvas(W, H)
    bw = wt * 16
    roof_y = top * 16
    wall_y0 = roof_y + rr * 16 - 2
    g = dict(wall_x0=1, wall_x1=bw - 2, wall_y0=wall_y0, wall_y1=H, roof_y=roof_y, bw=bw, W=W, H=H)
    # the roof terrace (seen from above)
    for y in range(roof_y, wall_y0):
        for x in range(0, bw):
            c = SA(1) if rnd(x, y, seed, 9) > 0.08 else PA(3)
            if (x // 8 + y // 8) % 2 == 0 and rnd(x, y, seed, 10) < 0.05:
                c = SA(2)
            cv.set(x, y, c)
    if parapet:
        for x in range(bw):
            cv.set(x, roof_y, EA(1))
            cv.set(x, roof_y + 1, SA(3))
            cv.set(x, roof_y + 2, SA(2))
            cv.set(x, roof_y + 3, PA(2))           # the parapet's shadow on the terrace
        for y in range(roof_y, wall_y0):
            cv.set(0, y, EA(1)); cv.set(1, y, SA(3)); cv.set(2, y, PA(2) if y > roof_y + 2 else SA(2))
            cv.set(bw - 1, y, EA(1)); cv.set(bw - 2, y, PA(1)); cv.set(bw - 3, y, SA(2) if y > roof_y + 2 else SA(1))
    # the front wall
    for y in range(wall_y0, H):
        for x in range(0, bw):
            c = plaster_px(x, y, seed)
            if x == 0:
                c = EA(1)
            elif x == 1:
                c = SA(3)
            elif x == bw - 1:
                c = EA(1)
            elif x >= bw - 4:
                c = PA(3) if x < bw - 2 else PA(2)
            cv.set(x, y, c)
    # the cornice: a lit lip, a dark band, a row of small dentils
    for x in range(bw):
        cv.set(x, wall_y0, SA(3))
        cv.set(x, wall_y0 + 1, PA(2))
        if x % 4 == 1:
            cv.set(x, wall_y0 + 2, PA(1))
        cv.set(x, wall_y0 + 3 if x % 4 == 1 else wall_y0 + 2, PA(3) if x % 4 != 1 else PA(1))
    # the base course
    for x in range(bw):
        for y in range(H - 4, H):
            cv.set(x, y, PA(2) if y < H - 1 else EA(1))
        cv.set(x, H - 4, PA(3))
    for y in range(wall_y0 + 4, H - 4):
        cv.put(bw - 5, y, SH(40))
    for wdw in windows:
        lattice_window(cv, wdw['x'], wall_y0 + wdw['y'], wdw.get('w', 8), wdw.get('h', 11), lit=wdw.get('lit', True))
    door_meta = None
    if door:
        dx, dw, dh = door['x'], door.get('w', 12), door.get('h', 22)
        arch_door(cv, dx, H - 2 - dh, dw, dh, ramp=door.get('ramp', 'wood'), opened=door.get('opened', False))
        door_meta = (dx + dw // 2) // 16
    for dd in ([dome] if dome else []) + list(domes):
        gold_dome(cv, dd['cx'], roof_y + dd.get('base', rr * 8), dd['r'], dd.get('h', dd['r'] * 1.25), drum=dd.get('drum', 4))
    roof_bits(cv, roof_y + 4, wall_y0 - 1, 4, bw - 5, seed, avoid=[(dd['cx'], dd['r']) for dd in ([dome] if dome else []) + list(domes)])
    if extras:
        extras(cv, g)
    # cast shadow to the right (dithered indigo on the ground)
    for y in range(roof_y + 6, H):
        for x in range(bw, bw + 6):
            if (x + y) % 2 == 0 or x < bw + 3:
                cv.put(x, y, SH(80))
    rows = top + rr + wr
    depth = rr
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


def roof_bits(cv, y0, y1, x0, x1, seed, avoid=()):
    """Life on a flat roof: a roof hatch, clay pots, a rug airing, a water jar (two or three of them, by seed)."""
    if y1 - y0 < 8:
        return
    picks = [h32(seed, k, 6201) % 4 for k in range(3)]
    slots = [x0 + 4 + (x1 - x0 - 16) * k // 3 for k in range(3)]
    for k, (kind, sx) in enumerate(zip(picks, slots)):
        if any(abs(sx + 5 - cx) < r + 7 for (cx, r) in avoid):
            continue
        sy = y0 + 2 + (h32(seed, k, 6202) % max(1, y1 - y0 - 10))
        if kind == 0:      # a roof hatch
            R(cv, sx, sy, 9, 6, PA(1)); R(cv, sx + 1, sy + 1, 7, 4, WD(2)); R(cv, sx + 1, sy + 1, 7, 1, WD(3))
        elif kind == 1:    # two clay pots
            for px in (sx, sx + 5):
                ellipse(cv, px + 2, sy + 3, 2.2, 2.4, lambda dx, dy, d: EA(1) if d > 0.8 else (RR(4) if dx < 0 else RR(3)))
        elif kind == 2:    # a rug airing
            R(cv, sx, sy, 10, 6, RB(2)); R(cv, sx + 1, sy + 1, 8, 4, RR(3)); R(cv, sx + 3, sy + 2, 4, 2, GD(4))
        else:              # a water jar and a basket
            ellipse(cv, sx + 2, sy + 3, 2.4, 3, lambda dx, dy, d: EA(1) if d > 0.8 else SA(3))
            R(cv, sx + 6, sy + 2, 5, 4, WD(3)); R(cv, sx + 6, sy + 2, 5, 1, WD(4))


def lattice_window(cv, x, y, w, h, lit=True):
    """An arched window with a wooden lattice (mashrabiya): warm light through the lattice when lit."""
    r = w / 2.0
    for yy in range(h):
        for xx in range(w):
            if yy < r and (xx + 0.5 - r) ** 2 + (yy + 0.5 - r) ** 2 > r * r:
                continue
            edge = xx in (0, w - 1) or yy == h - 1 or (yy < r and (xx + 0.5 - r) ** 2 + (yy + 0.5 - r) ** 2 > (r - 1.2) ** 2)
            if edge:
                c = EA(1)
            elif (xx + yy) % 2 == 0:
                c = WD(2)
            else:
                c = (GD(4) if yy < h // 2 else GD(3)) if lit else SD(1)
            cv.set(x + xx, y + yy, c)
    for xx in range(-1, w + 1):
        cv.set(x + xx, y + h, SA(3))
        cv.set(x + xx, y + h + 1, PA(2))


def arch_door(cv, x, y, w, h, ramp='wood', opened=False):
    """A tall arched doorway in a carved frame (a pointed horseshoe arch), studded wooden door."""
    r = w / 2.0
    for yy in range(-2, h):
        for xx in range(-2, w + 2):
            cy = r + 0.5
            d = math.hypot(xx + 0.5 - r, (yy + 0.5 - cy) * 0.9)
            if yy < cy and d > r + 2.2:
                continue
            frame = xx < 0 or xx >= w or yy < 0 or (yy < cy and d > r)
            if frame:
                c = SA(3) if xx < r else PA(2)
                if (xx in (-2, w + 1)) or (yy < cy and d > r + 1.4):
                    c = EA(1)
                cv.set(x + xx, y + yy, c)
                continue
            if opened:
                c = DARK
            else:
                c = WD(3) if xx < r else WD(2)
                if xx in (0, w - 1) or int(xx) == int(r) or yy == h - 1:
                    c = WD(0)
                elif (yy % 5 == 2) and xx % 3 == 1:
                    c = GD(3)
            cv.set(x + xx, y + yy, c)
    cv.set(x + int(r) + 2, y + h // 2 + 2, GD(4))


def gold_dome(cv, cx, base_y, r, h, drum=4):
    """A gold-copper onion-ish dome on a short drum: lit on the upper left, ribs, a gold finial with a star."""
    # the drum
    for y in range(base_y - drum, base_y + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            c = SA(3) if x < cx - r * 0.4 else (SA(2) if x < cx + r * 0.5 else PA(2))
            if y == base_y:
                c = EA(1)
            if y == base_y - drum:
                c = PA(1)
            if (x - int(cx)) % 4 == 0 and base_y - drum < y < base_y - 1:
                c = EA(2)
            cv.set(x, y, c)
    top = base_y - drum
    for y in range(int(top - h), top + 1):
        t = (top - y) / float(h)
        half = r * math.sqrt(max(0.0, 1 - t * t)) * (1.0 + 0.12 * math.sin(t * math.pi))
        if t > 0.86:
            half = r * 0.18 * (1 - t) / 0.14
        for x in range(int(round(cx - half)), int(round(cx + half)) + 1):
            u = (x - cx) / max(0.5, half)
            if abs(u) > 0.92 or y == top:
                c = GD(1)
            elif u < -0.35 and t > 0.25:
                c = GD(5) if (u < -0.6 and 0.45 < t < 0.75) else GD(4)
            elif u < 0.3:
                c = GD(3)
            else:
                c = GD(2)
            if int(round(u * 4)) != int(round(u * 4 + 0.15)) and abs(u) < 0.9 and t < 0.8:
                c = GD(2) if c != GD(1) else c
            cv.set(x, y, c)
    fy = int(top - h)
    for y in range(fy - 6, fy + 1):
        cv.set(int(cx), y, GD(4) if y < fy - 1 else GD(2))
    for (dx, dy) in ((-1, -4), (1, -4), (0, -5), (0, -3)):
        cv.set(int(cx) + dx, fy + dy, GD(5))


# ====================================================================== the prefabs
def awning_cloth(cv, x, y, w, ramp_a, ramp_b, depth=6):
    """A striped cloth awning on two poles (stripes run front to back)."""
    A = lambda i: C(ramp_a, i)
    B = lambda i: (C(ramp_b, i) if ramp_b else A(i))
    for yy in range(depth):
        for xx in range(w):
            stripe = (xx // 4) % 2 == 0
            c = (A(3) if stripe else B(3)) if yy < depth - 2 else (A(2) if stripe else B(2))
            if yy == 0:
                c = A(4) if stripe else B(4)
            cv.set(x + xx, y + yy, c)
        cv.put(x + w, y + yy, SH(70))
    for xx in range(w):
        if xx % 4 in (0, 1):
            cv.set(x + xx, y + depth, A(2) if (xx // 4) % 2 == 0 else B(2))
    for xx in range(w):
        cv.put(x + xx, y + depth + 1, SH(80))


def saffron(i):
    return [FI(1), GD(2), GD(3), FI(3), GD(4)][max(0, min(4, i))]


def inn_lantern():
    def ext(cv, g):
        x0, y1, y0 = g['wall_x0'], g['wall_y1'], g['wall_y0']
        bld.hanging_sign(cv, 30, y1 - 32, 'mug', w=13, h=10)
        # a string of lanterns across the front
        for i, x in enumerate(range(12, g['bw'] - 8, 11)):
            yy = y0 + 6 + int(2 * math.sin(i * 1.2))
            cv.set(x, yy - 1, EA(1))
            R(cv, x - 1, yy, 3, 4, FI(3) if i % 2 else GD(4))
            cv.set(x, yy + 1, WHITE)
        for x in range(8, g['bw'] - 6):
            cv.set(x, y0 + 5 + int(round(1.5 * math.sin((x - 8) * 0.29))), EA(2))
    return desert_house(8, 2, 3, top=2, door={'x': 54, 'w': 16, 'h': 27},
                        dome={'cx': 96, 'r': 12, 'h': 15, 'base': 26, 'drum': 3},
                        windows=[{'x': 10, 'y': 16, 'w': 9, 'h': 12}, {'x': 92, 'y': 16, 'w': 9, 'h': 12},
                                 {'x': 108, 'y': 16, 'w': 9, 'h': 12, 'lit': False}],
                        extras=ext, seed=511)


def shop_cloth():
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        awning_cloth(cv, 4, y0 + 4, 34, 'gold', 'roof_blue', depth=6)
        # bolts of saffron, indigo and rose cloth stacked under the awning
        for i, col in enumerate(['gold', 'roof_blue', 'blossom', 'gold', 'cloth_purple']):
            bx = 6 + i * 6
            R(cv, bx, y1 - 14, 5, 10, C(col, 3))
            R(cv, bx, y1 - 14, 1, 10, C(col, 4 if col != 'blossom' else 3))
            R(cv, bx + 4, y1 - 14, 1, 10, C(col, 2))
            cv.set(bx + 2, y1 - 14, C(col, 4 if col != 'blossom' else 3))
        bld.hanging_sign(cv, 44, y0 + 8, 'potion', w=11, h=10)
    return desert_house(5, 2, 2, door={'x': 52, 'w': 12, 'h': 20}, extras=ext, seed=517,
                        domes=[{'cx': 22, 'r': 7, 'h': 9, 'base': 18, 'drum': 2}], top=1)


def smithy_copper():
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        # the forge mouth: a dark opening with the fire's glow
        bx, bw, bh = 8, 24, 16
        by = y1 - 4 - bh
        for yy in range(bh):
            for xx in range(bw):
                c = DARK if yy > 1 else EA(1)
                cv.set(bx + xx, by + yy, c)
        for xx in range(4, 20):
            for yy in range(bh - 7, bh - 1):
                d = abs(xx - 12) + abs(yy - (bh - 3)) * 1.6
                if d < 3:
                    cv.set(bx + xx, by + yy, FI(5))
                elif d < 5:
                    cv.set(bx + xx, by + yy, FI(3))
                elif d < 8:
                    cv.set(bx + xx, by + yy, FI(1))
        for xx in range(-2, bw + 2):
            cv.set(bx + xx, by - 2, SA(3)); cv.set(bx + xx, by - 1, PA(1))
        # copper pots hung by the door
        for i, px in enumerate((40, 47)):
            ellipse(cv, px, y0 + 16, 3, 3, lambda dx, dy, d: EA(1) if d > 0.85 else (FI(3) if dx < -0.2 else FI(2)))
            cv.set(px, y0 + 12, EA(1))
        bld.hanging_sign(cv, 52, y0 + 6, 'hammer', w=11, h=10)
        # the chimney with a thread of smoke
        R(cv, 64, g['roof_y'] - 6, 7, 14, PA(2))
        R(cv, 64, g['roof_y'] - 6, 2, 14, SA(3))
        R(cv, 64, g['roof_y'] - 7, 7, 2, EA(1))
        for k in range(5):
            cv.put(66 + k % 2, g['roof_y'] - 9 - k * 2, glow(MT(2), 120))
    return desert_house(5, 2, 2, top=1, door={'x': 54, 'w': 11, 'h': 19}, extras=ext, seed=523)


def tower_armillary():
    """The Armillary Tower: a tall sandstone tower (taller walls), a star window, a gold band, a tall door; the great
    armillary prop sits on its roof (separate object, overhead)."""
    def ext(cv, g):
        y0, y1, bw = g['wall_y0'], g['wall_y1'], g['bw']
        for x in range(bw):
            cv.set(x, y0 + 20, GD(3)); cv.set(x, y0 + 21, GD(1))
        # a round star window above the door
        cx, cy = bw // 2, y0 + 12
        ellipse(cv, cx, cy, 6, 6, lambda dx, dy, d: EA(1) if d > 0.85 else RB(1))
        for (dx, dy) in ((0, -3), (0, 3), (-3, 0), (3, 0), (0, 0), (-2, -2), (2, 2), (2, -2), (-2, 2)):
            cv.set(cx + dx, cy + dy, GD(4) if (dx == 0 or dy == 0) else IC(2))
        # banners of indigo with a gold star, either side
        for bx in (8, bw - 16):
            bld.banner(cv, bx, y0 + 26, 8, 20, 'roof_blue')
    return desert_house(5, 2, 4, top=0, door={'x': 32, 'w': 14, 'h': 26}, extras=ext, seed=529,
                        windows=[{'x': 6, 'y': 6, 'w': 7, 'h': 10}, {'x': 64, 'y': 6, 'w': 7, 'h': 10}])


def arcade_serai():
    """The caravanserai arcade: a long sandstone front with three deep arches (shade inside, packed loads in it); the
    mural of seven stars goes on its blank right bay (mural_stars)."""
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        for ax in (6, 26, 46):
            arch_open(cv, ax, y1 - 26, 16, 22)
            # a bale in the shade
            R(cv, ax + 3, y1 - 9, 9, 5, WD(3))
            R(cv, ax + 3, y1 - 9, 9, 1, WD(4))
            cv.set(ax + 7, y1 - 9, EA(1))
    return desert_house(6, 1, 2, extras=ext, seed=541, parapet=True)


def arch_open(cv, x, y, w, h):
    r = w / 2.0
    for yy in range(h):
        for xx in range(w):
            d = math.hypot(xx + 0.5 - r, yy + 0.5 - r)
            if yy < r and d > r:
                continue
            edge = xx in (0, w - 1) or (yy < r and d > r - 1.3)
            cv.set(x + xx, y + yy, (SA(3) if xx < r else PA(2)) if edge else (SD(1) if yy < h - 6 else SD(2)))


def house_dome_a():
    return desert_house(4, 2, 2, top=1, door={'x': 8, 'w': 11, 'h': 18},
                        dome={'cx': 40, 'r': 9, 'h': 12, 'base': 22, 'drum': 3},
                        windows=[{'x': 38, 'y': 10, 'w': 8, 'h': 10}], seed=547)


def house_dome_b():
    def ext(cv, g):
        awning_cloth(cv, 46, g['wall_y0'] + 5, 24, 'roof_blue', 'metal', depth=5)
    return desert_house(5, 2, 2, top=1, door={'x': 20, 'w': 11, 'h': 18},
                        domes=[{'cx': 16, 'r': 7, 'h': 9, 'base': 20, 'drum': 2}, {'cx': 58, 'r': 8, 'h': 10, 'base': 22, 'drum': 3}],
                        windows=[{'x': 50, 'y': 14, 'w': 8, 'h': 10, 'lit': False}], extras=ext, seed=553)


def house_flat():
    def ext(cv, g):
        # a rooftop canopy on four poles and a rug drying on the parapet
        ry = g['roof_y']
        for (px, py) in ((8, ry + 6), (36, ry + 6)):
            for y in range(py, py + 12):
                cv.set(px, y, WD(1))
        awning_cloth(cv, 6, ry + 2, 34, 'roof_red', 'gold', depth=5)
        R(cv, 16, g['wall_y0'] + 3, 14, 7, RR(3))
        for x in range(16, 30, 2):
            cv.set(x, g['wall_y0'] + 6, GD(4))
    return desert_house(3, 2, 2, door={'x': 18, 'w': 11, 'h': 18}, extras=ext, seed=559)


# ====================================================================== town props
def armillary():
    """The great armillary on the tower roof (4 x 4, all overhead): gold rings round a lapis sphere on a pedestal."""
    cv = Canvas(64, 64)
    slab(cv, 22, 41, 52, 62, SA(3), SA(2), PA(2), EA(1))
    slab(cv, 27, 36, 44, 52, GD(3), GD(2), GD(1), EA(1))
    ellipse(cv, 32, 26, 10, 10, lambda dx, dy, d: EA(1) if d > 0.9 else (RB(3) if dx + dy < -0.4 else (RB(2) if d < 0.7 else RB(1))))
    cv.set(28, 22, IC(3)); cv.set(35, 28, WHITE); cv.set(31, 30, IC(2))

    def ring(rx, ry, tilt, col_hi, col_lo, w=1.6):
        for k in range(720):
            a = k * math.pi / 360
            x = rx * math.cos(a)
            y = ry * math.sin(a)
            X = 32 + x * math.cos(tilt) - y * math.sin(tilt)
            Y = 26 + x * math.sin(tilt) + y * math.cos(tilt)
            c = col_hi if math.sin(a) < 0 else col_lo
            cv.set(int(round(X)), int(round(Y)), c)
            if w > 1:
                cv.set(int(round(X)), int(round(Y)) + 1, col_lo)
    ring(28, 9, -0.35, GD(4), GD(2))
    ring(26, 26, 0.0, GD(3), GD(1))
    ring(9, 27, 0.5, GD(4), GD(2))
    ring(24, 6, 0.6, GD(5), GD(3))
    for y in range(0, 52):
        cv.set(32, y, GD(1) if y > 40 else GD(3))
    return cv


def armillary_rings(fr):
    """The observatory's great rings (3 x 3 interior object): frames 0 and 1 = the rings turned."""
    cv = Canvas(48, 48)
    contact_shadow(cv, 6, 42, 46)
    slab(cv, 16, 31, 40, 46, GD(3), GD(2), GD(1), EA(1))
    ellipse(cv, 24, 22, 6, 6, lambda dx, dy, d: EA(1) if d > 0.85 else (RB(3) if dx < 0 else RB(2)))
    t0 = 0.0 if fr == 0 else 0.5
    for (rx, ry, tilt, hi, lo) in ((20, 7, -0.3 + t0, GD(4), GD(2)), (19, 19, 0, GD(3), GD(1)), (7, 20, 0.45 - t0, GD(4), GD(2))):
        for k in range(600):
            a = k * math.pi / 300
            x, y = rx * math.cos(a), ry * math.sin(a)
            X, Y = 24 + x * math.cos(tilt) - y * math.sin(tilt), 22 + x * math.sin(tilt) + y * math.cos(tilt)
            cv.set(int(round(X)), int(round(Y)), hi if math.sin(a) < 0 else lo)
    for y in range(4, 40):
        cv.set(24, y, GD(1))
    return cv


def waystone(fr):
    """A sandstone waystone with glyph rows (never legible): frames 0..2 = the rows shifting (blurred, sliding a pixel),
    3 = still and crisp, with a gold cap."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    slab(cv, 2, 13, 6, 30, SA(3), SA(2), PA(2), EA(1))
    for x in range(3, 13):
        cv.set(x, 5, EA(1))
    for x in range(4, 12):
        cv.set(x, 4, GD(3)); cv.set(x, 3, GD(4) if x < 8 else GD(2))
    cv.set(7, 2, GD(4)); cv.set(8, 2, GD(3))
    for i, row in enumerate(range(9, 28, 3)):
        sh = 0 if fr == 3 else ((fr + i) % 3) - 1
        for x in range(4, 12):
            on = h32((x - 4 + sh * (i + 1)) % 8, i, 6101 + (0 if fr == 3 else fr)) % 3 != 0
            if fr == 3:
                cv.set(x, row, EA(2) if on else PA(3))
                if on and h32(x, i, 6102) % 4 == 0:
                    cv.set(x, row + 1, EA(2))
            else:
                if on:
                    cv.set(x, row, IC(3) if (x + i + fr) % 4 == 0 else MV(2))
                    cv.put(x + 1, row, glow(MV(3), 100))
    return cv


def bulletin(open_):
    """The Sandstone Bulletin: a framed board with a map of the routes; 0 = every route struck through in red, 1 = the
    routes open (gold lines, green oases)."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 30, 31)
    for (px) in (4, 26):
        R(cv, px, 18, 3, 13, WD(2)); cv.set(px, 18, WD(4))
    slab(cv, 1, 30, 4, 22, SA(3), SA(2), PA(2), EA(1))
    R(cv, 4, 7, 24, 13, SA(1))
    for x in range(4, 28):
        cv.set(x, 7, PA(2))
    routes = [[(6, 17), (11, 13), (16, 15), (22, 10), (26, 11)], [(6, 10), (12, 11), (17, 9), (25, 16)]]
    for path in routes:
        for (a, b) in zip(path, path[1:]):
            (x0, y0), (x1, y1) = a, b
            n = max(abs(x1 - x0), abs(y1 - y0))
            for k in range(n + 1):
                x, y = x0 + round((x1 - x0) * k / n), y0 + round((y1 - y0) * k / n)
                cv.set(x, y, GD(3) if open_ else EA(2))
    if open_:
        for (x, y) in ((11, 13), (22, 10), (12, 11)):
            cv.set(x, y, GR(4)); cv.set(x + 1, y, GR(3))
    else:
        for (cx, cy) in ((9, 15), (19, 12), (14, 10), (23, 13)):
            for k in (-2, -1, 0, 1, 2):
                cv.set(cx + k, cy + k, RR(3)); cv.set(cx + k, cy - k, RR(3))
    for x in range(2, 30):
        cv.set(x, 3, GD(2))
    return cv


def moonwell(woken):
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 30, 30)
    ellipse(cv, 16, 21, 14, 9, lambda dx, dy, d: EA(1) if d > 0.92 else (SA(3) if dy < -0.3 else (SA(2) if dy < 0.35 else PA(2))))
    if woken:
        ellipse(cv, 16, 20.5, 10.5, 6, lambda dx, dy, d: IC(2) if d > 0.85 else (WHITE if d < 0.25 else (IC(3) if d < 0.55 else WA(3))))
        for (x, y) in ((10, 19), (21, 22), (14, 23)):
            cv.set(x, y, WHITE)
        ellipse(cv, 16, 12, 9, 7, lambda dx, dy, d: glow(IC(3), int(90 * (1 - d))) if (int(dx * 8) + int(dy * 8)) % 2 == 0 else None)
    else:
        ellipse(cv, 16, 20.5, 10.5, 6, lambda dx, dy, d: RB(0) if d > 0.85 else (WA(0) if d > 0.4 else RB(1)))
        cv.set(12, 19, IC(1))
    # a crescent carved in the rim
    for (x, y) in ((15, 13), (16, 13), (17, 14), (17, 15), (16, 16), (15, 16)):
        cv.set(x, y, GD(3) if woken else PA(1))
    for (x, y) in ((5, 16), (27, 16)):
        R(cv, x - 1, y - 6, 3, 7, PA(3)); cv.set(x, y - 7, GD(3) if woken else PA(1))
    return cv


def mural_stars():
    """The mural of the seven wandering stars on the caravanserai wall (3 x 2 piece): indigo plaster sky, seven gold
    stars on looping paths, a caravan of tiny camels along the bottom."""
    cv = Canvas(48, 32)
    for y in range(2, 30):
        for x in range(2, 46):
            c = RB(1) if y < 22 else OC(1)
            if x in (2, 45) or y in (2, 29):
                c = GD(2)
            elif y == 22:
                c = OC(2)
            elif y < 22 and (x * 7 + y * 3) % 23 == 0:
                c = RB(2)
            cv.set(x, y, c)
    stars = [(8, 8), (15, 13), (21, 6), (27, 15), (33, 9), (38, 16), (42, 7)]
    for i, (x, y) in enumerate(stars):
        for a in range(0, 360, 40):
            px = round(x + 3 * math.cos(math.radians(a + i * 20)))
            py = round(y + 2 * math.sin(math.radians(a + i * 20)))
            if 3 <= py < 22:
                cv.set(px, py, RB(3))
        for (dx, dy) in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            cv.set(x + dx, y + dy, GD(3))
        cv.set(x, y, GD(5))
    for i, x in enumerate(range(8, 42, 7)):
        y = 25
        R(cv, x, y, 4, 2, EA(1)); cv.set(x + 1, y - 1, EA(1)); cv.set(x + 4, y - 1, EA(1)); cv.set(x + 4, y - 2, EA(1))
        cv.set(x, y + 2, EA(1)); cv.set(x + 3, y + 2, EA(1))
    return cv


def bell_rack(n):
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 30, 31)
    for px in (3, 27):
        R(cv, px, 8, 3, 23, WD(2)); R(cv, px, 8, 1, 23, WD(4))
    R(cv, 2, 7, 28, 3, WD(3)); R(cv, 2, 7, 28, 1, WD(4)); R(cv, 2, 9, 28, 1, WD(1))
    for i, hx in enumerate((10, 16, 22)):
        cv.set(hx, 10, MT(1)); cv.set(hx, 11, MT(1))
        if i < n:
            for y in range(12, 19):
                half = 1 + (y - 12) // 2
                for x in range(hx - half, hx + half + 1):
                    cv.set(x, y, FI(4) if x < hx else (FI(3) if x == hx else FI(2)))
            for x in range(hx - 4, hx + 5):
                cv.set(x, 19, FI(1))
            cv.set(hx, 20, EA(1))
        else:
            cv.set(hx, 12, MT(2))
    return cv


def camel(stand):
    cv = Canvas(32, 32)
    ellipse(cv, 16, 29, 13, 2.5, lambda dx, dy, d: SH(90))
    body, lit, dark, out = EA(4), SA(1), EA(3), EA(1)
    if stand:
        for lx in (8, 11, 20, 23):
            R(cv, lx, 20, 2, 9, dark); cv.set(lx, 28, out)
        ellipse(cv, 15, 17, 9, 5, lambda dx, dy, d: out if d > 0.88 else (lit if dy < -0.3 else body))
        ellipse(cv, 15, 11, 4, 3.5, lambda dx, dy, d: out if d > 0.85 else (lit if dy < 0 else body))
        hx, hy = 26, 8
    else:
        ellipse(cv, 15, 23, 11, 5, lambda dx, dy, d: out if d > 0.88 else (lit if dy < -0.3 else body))
        ellipse(cv, 14, 18, 4, 3.5, lambda dx, dy, d: out if d > 0.85 else (lit if dy < 0 else body))
        for x in range(5, 25, 6):
            R(cv, x, 26, 4, 2, dark)
        hx, hy = 27, 13
    # neck and head
    for k in range(7):
        R(cv, hx - 4 + k // 2, hy + 8 - k, 3, 2, body)
    ellipse(cv, hx, hy, 3.2, 2.2, lambda dx, dy, d: out if d > 0.85 else (lit if dy < 0 else body))
    cv.set(hx + 1, hy - 1, out)
    # a saddle blanket, saffron and indigo
    by = 13 if stand else 19
    R(cv, 11, by, 9, 4, GD(3)); R(cv, 11, by + 2, 9, 1, RB(2)); R(cv, 11, by, 9, 1, GD(4))
    return cv


def camel_load():
    cv = Canvas(16, 16)
    contact_shadow(cv, 2, 14, 14)
    R(cv, 2, 6, 7, 8, WD(3)); R(cv, 2, 6, 7, 1, WD(4)); R(cv, 8, 6, 1, 8, WD(1))
    R(cv, 8, 8, 6, 6, GD(3)); R(cv, 8, 8, 6, 1, GD(4)); R(cv, 13, 8, 1, 6, GD(1))
    for y in (8, 11):
        for x in range(2, 9):
            cv.set(x, y + 1, EA(1) if x % 2 else WD(2))
    cv.set(5, 5, EA(1)); cv.set(6, 4, EA(1))
    return cv


def palm():
    """A date palm (2 x 3): the trunk on the bottom tile (solid), the fronds overhead."""
    cv = Canvas(32, 48)
    ellipse(cv, 17, 45, 9, 2.5, lambda dx, dy, d: SH(90))
    for y in range(14, 46):
        x = 16 + int(round(2 * math.sin((46 - y) / 30.0)))
        for dx in range(-1, 2):
            c = WD(4) if dx < 0 else (WD(3) if dx == 0 else WD(1))
            if y % 3 == 0:
                c = WD(2) if dx < 1 else WD(0)
            cv.set(x + dx, y, c)
    # fronds: arcs out of the crown, lit on top
    cx, cy = 17, 13
    for k, a in enumerate((-170, -140, -110, -70, -40, -10, 20, 160, 200)):
        L = 13 if k % 2 == 0 else 11
        for i in range(L):
            t = i / float(L)
            x = cx + math.cos(math.radians(a)) * i
            y = cy + math.sin(math.radians(a)) * i * 0.7 + t * t * 7
            for w in (-1, 0, 1):
                if w and i > L - 3:
                    continue
                cv.set(int(round(x)), int(round(y)) + w, G2(1) if w == 1 else (G2(3) if w == -1 else G2(2)))
    for (x, y) in ((15, 15), (18, 15), (16, 16)):
        cv.set(x, y, GD(2))
    return cv


def G2(i):
    return [GR(1), GR(2), GR(3), GR(4)][i]


def tent_caravan():
    cv = Canvas(48, 32)
    ellipse(cv, 25, 29, 21, 3, lambda dx, dy, d: SH(80))
    for y in range(6, 29):
        t = (y - 6) / 22.0
        half = 6 + t * 16
        for x in range(int(24 - half), int(24 + half) + 1):
            stripe = (int((x - 24) / max(1.0, (half / 4))) % 2) == 0
            c = (RR(3) if stripe else SA(2)) if x < 24 else (RR(2) if stripe else SA(1))
            if abs(x - 24) > half - 1:
                c = EA(1)
            cv.set(x, y, c)
    for y in range(18, 29):
        for x in range(21, 28):
            if abs(x - 24) < (y - 16) * 0.35:
                cv.set(x, y, DARK)
    cv.set(24, 4, WD(1)); cv.set(24, 5, WD(1))
    return cv


def stall(ramp):
    cv = Canvas(48, 32)
    contact_shadow(cv, 2, 46, 31)
    for px in (3, 43):
        R(cv, px, 8, 2, 22, WD(2))
    awning_cloth(cv, 1, 2, 46, 'gold' if ramp == 'saffron' else 'roof_blue', 'metal' if ramp == 'indigo' else 'roof_red', depth=7)
    slab(cv, 4, 43, 19, 29, WD(4), WD(3), WD(2), WD(0))
    goods = [(FI(3), FI(4)), (GR(3), GR(4)), (GD(3), GD(4)), (RR(3), RR(4)), (OC(1), OC(2))]
    for i, x in enumerate(range(7, 41, 7)):
        a, b = goods[i % len(goods)]
        ellipse(cv, x + 2, 18, 3, 2, lambda dx, dy, d, a=a, b=b: b if dy < 0 else a)
    return cv


def lamp_brass():
    cv = Canvas(16, 48)
    contact_shadow(cv, 4, 12, 47)
    R(cv, 5, 42, 6, 5, PA(2)); R(cv, 5, 42, 6, 1, SA(3))
    for y in range(12, 42):
        cv.set(7, y, GD(3)); cv.set(8, y, GD(1))
    R(cv, 4, 4, 8, 9, GD(1))
    R(cv, 5, 5, 6, 7, GD(4)); R(cv, 6, 6, 4, 5, WHITE)
    for x in range(3, 13):
        cv.set(x, 3, GD(2))
    cv.set(7, 1, GD(3)); cv.set(8, 2, GD(3)); cv.set(7, 2, GD(3))
    return cv


def star_charts(filled):
    cv = Canvas(32, 32)
    for i, x0 in enumerate((1, 17)):
        R(cv, x0, 3, 14, 22, SA(2)); R(cv, x0, 3, 14, 1, WD(2)); R(cv, x0, 24, 14, 1, WD(1))
        R(cv, x0 + 1, 5, 12, 18, RB(1))
        for (x, y) in ((3, 8), (7, 6), (10, 11), (5, 15), (9, 18), (11, 7)):
            cv.set(x0 + x, y, WHITE if (x + i) % 2 else IC(2))
        for (a, b) in (((3, 8), (7, 6)), ((7, 6), (10, 11)), ((10, 11), (9, 18))):
            (xa, ya), (xb, yb) = a, b
            n = max(abs(xb - xa), abs(yb - ya))
            for k in range(1, n, 2):
                cv.set(x0 + xa + round((xb - xa) * k / n), ya + round((yb - ya) * k / n), GD(1))
    # the empty space Laleh keeps: a dashed gold ring; filled, a bright star in it
    cx, cy = 21, 15
    for a in range(0, 360, 45):
        cv.set(round(cx + 2.5 * math.cos(math.radians(a))), round(cy + 2.5 * math.sin(math.radians(a))), GD(3))
    if filled:
        for (dx, dy) in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            cv.set(cx + dx, cy + dy, GD(4))
        cv.set(cx, cy, WHITE)
    return cv


def rug_saffron():
    cv = Canvas(48, 32)
    for y in range(4, 28):
        for x in range(4, 44):
            border = x in (4, 43) or y in (4, 27)
            band = x in (6, 41) or y in (6, 25)
            if border:
                c = EA(1)
            elif band:
                c = RB(2)
            else:
                d = abs(x - 23.5) / 18 + abs(y - 15.5) / 10
                c = GD(3) if d < 0.5 else (RR(3) if d < 0.75 else GD(2))
                if abs(d - 0.5) < 0.05 or abs(d - 0.75) < 0.05:
                    c = WHITE if (x + y) % 2 else GD(4)
            cv.set(x, y, c)
    for x in range(5, 43, 2):
        cv.set(x, 3, SA(3)); cv.set(x, 28, SA(3))
    return cv


def lantern_hanging(fr):
    cv = Canvas(16, 32)
    for y in range(0, 14):
        cv.set(8, y, EA(1))
    core = [GD(4), WHITE, GD(4)][fr % 3]
    R(cv, 5, 14, 7, 10, GD(1))
    R(cv, 6, 15, 5, 8, FI(3)); R(cv, 7, 16, 3, 6, core)
    for y in range(15, 23, 2):
        cv.set(6, y, GD(2)); cv.set(10, y, GD(2))
    R(cv, 6, 24, 5, 1, GD(2)); cv.set(8, 25, GD(1)); cv.set(8, 26, GD(1))
    R(cv, 6, 13, 5, 1, GD(2))
    return cv


def water_jars():
    cv = Canvas(16, 16)
    contact_shadow(cv, 1, 15, 15)
    for (cx, cy, r) in ((5, 10, 4), (11, 11, 3.4)):
        ellipse(cv, cx, cy, r, r * 1.1, lambda dx, dy, d: EA(1) if d > 0.86 else (RR(4) if dx < -0.3 and dy < 0 else (RR(3) if dx < 0.3 else RR(2))))
        R(cv, int(cx) - 1, int(cy - r * 1.1) - 1, 3, 2, RR(2))
    return cv


def cloth_bolts():
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 15, 31)
    for i, col in enumerate(('gold', 'roof_blue', 'blossom', 'gold')):
        y = 10 + i * 5
        R(cv, 2, y, 12, 5, C(col, 3)); R(cv, 2, y, 12, 1, C(col, 4 if col != 'blossom' else 3)); R(cv, 13, y, 1, 5, C(col, 2))
        cv.set(2, y + 2, C(col, 1))
    R(cv, 1, 30, 14, 1, WD(1))
    return cv


def forge_copper(fr):
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 30, 31)
    slab(cv, 2, 29, 14, 30, PA(3), PA(2), PA(1), EA(1))
    R(cv, 6, 18, 20, 8, DARK)
    hot = [FI(5), FI(4), FI(5)][fr % 3]
    for x in range(8, 24):
        h = 2 + ((x * 3 + fr * 5) % 4)
        for y in range(26 - h, 26):
            cv.set(x, y, hot if y > 26 - h + 1 else FI(3))
    R(cv, 4, 8, 24, 6, FI(1)); R(cv, 4, 8, 24, 1, FI(3))
    for y in range(0, 8):
        cv.set(15, y, PA(1)); cv.set(16, y, PA(2))
    return cv


def campfire(fr):
    cv = Canvas(16, 16)
    for (x0, y0, x1, y1) in ((3, 13, 12, 10), (3, 10, 12, 13)):
        for k in range(10):
            cv.set(x0 + (x1 - x0) * k // 9, y0 + (y1 - y0) * k // 9, WD(1))
    flames = [[(7, 5), (8, 4), (6, 7), (9, 7)], [(8, 5), (7, 4), (9, 6), (6, 8)], [(7, 4), (8, 6), (6, 6), (9, 8)]][fr % 3]
    for y in range(6, 12):
        for x in range(5, 11):
            d = abs(x - 7.5) + (11 - y) * 0.6
            if d < 3:
                cv.set(x, y, FI(4) if d < 1.6 else FI(3))
    for (x, y) in flames:
        cv.set(x, y, FI(5))
    for (x, y) in ((4, 12), (11, 12), (7, 13)):
        cv.set(x, y, SW(3))
    return cv


def tent_omar():
    """Omar's shade tent on the road: a striped saffron-and-indigo awning on four poles (the awning overhead), rugs and a
    low table in its shade."""
    cv = Canvas(48, 48)
    for (px, py) in ((3, 14), (44, 14), (3, 40), (44, 40)):
        for y in range(py - 12 if py < 20 else py - 26, py):
            cv.set(px, y, WD(1)); cv.set(px + 1, y, WD(3))
    for y in range(18, 42):
        for x in range(4, 44):
            if (x + y) % 2 == 0:
                cv.put(x, y, SH(70))
    R(cv, 10, 28, 28, 10, RR(3)); R(cv, 10, 28, 28, 1, RR(4)); R(cv, 12, 30, 24, 6, GD(3))
    awning_cloth(cv, 1, 2, 46, 'gold', 'roof_blue', depth=10)
    return cv


def camp_ruin():
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 30, 30)
    # a collapsed tent: a slumped striped cloth over a broken pole
    for y in range(14, 29):
        for x in range(3, 22):
            if y > 14 + abs(x - 10) * 0.8:
                c = RR(2) if ((x // 3) % 2) else SA(1)
                if y > 26:
                    c = EA(2)
                cv.set(x, y, c)
    for k in range(10):
        cv.set(10 + k, 14 - k // 2, WD(1))
    # a cart wheel on its side
    ellipse(cv, 24, 24, 5, 3.5, lambda dx, dy, d: WD(2) if d > 0.7 else (None if d > 0.25 else WD(1)))
    for (dx, dy) in ((-3, 0), (3, 0), (0, -2), (0, 2)):
        cv.set(24 + dx, 24 + dy, WD(1))
    cv.set(27, 17, OC(1)); cv.set(28, 18, OC(2))
    return cv


def water_stair():
    cv = Canvas(16, 16)
    for y in range(16):
        step = y // 5
        v = y % 5
        for x in range(16):
            c = [SA(2), PA(3), PA(2), PA(1)][min(3, step)]
            if v == 0:
                c = SA(3) if step == 0 else PA(3)
            if step >= 2:
                c = WA(3) if (x + y) % 3 else WA(4)
                if v == 0:
                    c = IC(2)
            cv.set(x, y, c)
    return cv


def wall_sandstone_tile(n, e, s, w):
    """A low sandstone town wall (line16): a cap seen from above, a short face on the south side."""
    cv = Canvas(16, 16)
    def cap(x0, x1, y0, y1):
        for y in range(y0, y1):
            for x in range(x0, x1):
                cv.set(x, y, SA(3) if y == y0 else (SA(2) if (x * 3 + y) % 7 else SA(1)))
    top = 4
    if w or e or not (n or s):
        x0, x1 = (0 if w else 3), (16 if e else 13)
        cap(x0, x1, top, top + 4)
        for y in range(top + 4, top + 11):
            for x in range(x0, x1):
                c = PA(3) if (y - top - 4) % 4 else PA(2)
                if (x + (y // 4) * 4) % 8 == 0:
                    c = PA(1)
                cv.set(x, y, c)
        for x in range(x0, x1):
            cv.set(x, top + 11, EA(1))
            cv.put(x, top + 12, SH(80))
        if not w:
            for y in range(top, top + 11):
                cv.set(x0, y, EA(1))
        if not e:
            for y in range(top, top + 11):
                cv.set(x1 - 1, y, EA(1))
    if n:
        cap(3, 13, 0, top + (0 if (w or e) else 4))
        for y in range(0, top + 4):
            cv.set(3, y, EA(1)); cv.set(12, y, EA(1))
    if s:
        y0 = top + 11 if (w or e) else (top + 4 if n else 0)
        cap(3, 13, y0, 16)
        for y in range(y0, 16):
            cv.set(3, y, EA(1)); cv.set(12, y, EA(1))
    if (n or s) and not (w or e) and not s:
        for y in range(top + 4, top + 11):
            for x in range(3, 13):
                cv.set(x, y, PA(3) if (y - top - 4) % 4 else PA(2))
        for x in range(3, 13):
            cv.set(x, top + 11, EA(1))
    return cv


def line16(fn):
    cv = Canvas(128, 32)
    for i in range(16):
        cv.paste(fn(bool(i & 1), bool(i & 2), bool(i & 4), bool(i & 8)), (i % 8) * 16, (i // 8) * 16)
    return cv


# ====================================================================== the decal
def haven_far():
    """160 x 96 decal for the overhead layer at the last dune: Saffron Haven seen from the road, cut from environments
    cell 4 (the domes, the tower, the armillary, the aqueduct), quantized to the sheet palette, the sky made transparent
    and the foot dithered out so it sits on any sand."""
    src = os.path.join(os.path.dirname(NEXT), 'assets', 'art', 'environments.webp')
    im = Image.open(src).convert('RGB')
    w, h = im.size
    cw, ch = w // 2, h // 4
    cell = im.crop((0, 2 * ch, cw, 3 * ch))
    # the city block: from the domes on the left to the armillary and the aqueduct
    box_ = (int(cw * 0.0), int(ch * 0.02), int(cw * 0.80), int(ch * 0.86))
    crop = cell.crop(box_).resize((160, 96), Image.BOX)
    a = np.asarray(crop).astype(np.float32) / 255.0
    cv = Canvas(160, 96)
    from ep5 import palette_hexes
    pal = np.array([hexc(x)[:3] for x in palette_hexes()], np.float32) / 255.0
    lum = a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
    blue = a[..., 2] - (a[..., 0] + a[..., 1]) / 2
    for y in range(96):
        for x in range(160):
            r, g, b = a[y, x]
            purple = b > g * 0.95 or (r > g * 1.3 and b > g * 0.85)
            sky = y < 74 and (purple or (lum[y, x] < 0.2 and y < 44))
            if sky:
                continue
            # far away at noon: lift and flatten the night painting toward the warm sand haze
            hz = 0.34
            col = np.array([r * (1 - hz) + 0.86 * hz, g * (1 - hz) + 0.70 * hz, b * (1 - hz) + 0.50 * hz])
            d = ((pal - col) ** 2).sum(1)
            k = int(np.argmin(d))
            c = tuple(int(v * 255 + 0.5) for v in pal[k]) + (255,)
            if y > 84 and ((x + y) % 2 or y > 90):
                continue
            cv.set(x, y, c)
    # one pixel of dark outline round the silhouette's top edge so it reads against the sand sky behind
    out = cv.copy()
    for y in range(1, 96):
        for x in range(160):
            if cv.get(x, y)[3] and not cv.get(x, y - 1)[3]:
                out.set(x, y - 1, EA(1))
    return out


# ====================================================================== build
def build_into(sh):
    sh.newline()
    items = []
    for pid, fn in (('inn_lantern', inn_lantern), ('shop_cloth', shop_cloth), ('smithy_copper', smithy_copper),
                    ('tower_armillary', tower_armillary), ('arcade_serai', arcade_serai), ('house_dome_a', house_dome_a),
                    ('house_dome_b', house_dome_b), ('house_flat', house_flat)):
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
    sh.obj('armillary', armillary(), [0, 3], [], 4, kind='piece',
           note='the great armillary on the Armillary Tower\'s roof (4 x 4, all overhead, collision none)')
    sh.meta['objects']['armillary']['collision'] = 'none'
    put_frames(sh, 'armillary_rings', [armillary_rings(0), armillary_rings(1)], [0, 2],
               [[0, 0], [1, 0], [2, 0], [1, -1]], overhead=1,
               note='the observatory\'s great rings (3 x 3, Laleh\'s rings): frames 0 and 1 = the rings turned')
    sh.obj('mural_stars', mural_stars(), [0, 1], [], 0, kind='piece',
           note='the mural of the seven wandering stars, 3 x 2 piece on the caravanserai wall (collision none)')
    sh.meta['objects']['mural_stars']['collision'] = 'none'
    put_frames(sh, 'bulletin', [bulletin(False), bulletin(True)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               note='the Sandstone Bulletin (sign): 0 every route struck, 1 the routes open (after haven_restored)')
    put_frames(sh, 'moonwell', [moonwell(False), moonwell(True)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               light={'color': '#b4e4f2', 'radius': 2.8},
               note='the Moonwell (object moonwell): 0 asleep, 1 woken (after moonwell_woken; its light then)')
    put_frames(sh, 'waystone', [waystone(i) for i in range(4)], [0, 1], [[0, 0]], overhead=1,
               shiftFrames=[0, 1, 2],
               note='the waystone: state 0 = the glyph rows shifting (cycle frames 0, 1, 2 at about 200 ms while the '
                    'tint is dusk or night and haven_restored is unset), state 1 = still (frame 3); glyphs never legible')
    put_frames(sh, 'bell_rack', [bell_rack(i) for i in range(4)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               note='Hassan\'s bell rack: frames 0..3 = bells hung (bell_1_found to bell_3_found)')
    put_frames(sh, 'star_charts', [star_charts(False), star_charts(True)], [0, 1], [], kind='piece',
               note='star charts on the observatory wall: 0 with Laleh\'s empty space, 1 a star in it (chart_restored)')
    sh.meta['objects']['star_charts']['collision'] = 'none'
    sh.newline()
    sh.obj('camel_rest', camel(False), [0, 1], [[0, 0], [1, 0]], 1, note='a camel resting (decor, solid)')
    sh.obj('camel_stand', camel(True), [0, 1], [[0, 0], [1, 0]], 1, note='a camel standing (decor, solid)')
    sh.obj('camel_load', camel_load(), [0, 0], [[0, 0]], 0, note='packed loads (decor, solid)')
    sh.obj('palm', palm(), [0, 2], [[0, 0]], 2, note='a date palm: the trunk cell solid, the fronds overhead')
    sh.obj('tent_caravan', tent_caravan(), [0, 1], [[0, 0], [1, 0], [2, 0]], 1, note='a striped caravan tent (decor, solid)')
    sh.obj('stall_saffron', stall('saffron'), [0, 1], [[0, 0], [1, 0], [2, 0]], 1, note='market stall, saffron awning')
    sh.obj('stall_indigo', stall('indigo'), [0, 1], [[0, 0], [1, 0], [2, 0]], 1, note='market stall, indigo awning')
    sh.obj('lamp_brass', lamp_brass(), [0, 2], [[0, 0]], 2, light={'color': '#f9d77a', 'radius': 3.0},
           note='a brass street lamp (lit under the dusk tint until haven_restored)')
    sh.obj('rug_saffron', rug_saffron(), [0, 1], [], 0, kind='piece', note='a saffron rug (floor decor, collision none)')
    sh.meta['objects']['rug_saffron']['collision'] = 'none'
    put_frames(sh, 'lantern_hanging', [lantern_hanging(i) for i in range(3)], [0, 1], [], overhead=2, anim_ms=170,
               light={'color': '#eba14d', 'radius': 3.2}, note='a hanging lantern (overhead, collision none)')
    sh.meta['objects']['lantern_hanging']['collision'] = 'none'
    sh.obj('water_jars', water_jars(), [0, 0], [[0, 0]], 0, note='two clay water jars')
    sh.obj('cloth_bolts', cloth_bolts(), [0, 1], [[0, 0]], 1, note='bolts of saffron cloth on a stand (Yasmin\'s shop)')
    put_frames(sh, 'forge_copper', [forge_copper(i) for i in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1, anim_ms=150,
               light={'color': '#e06b39', 'radius': 3.0}, note='the Copperwind forge (Hassan\'s smithy)')
    put_frames(sh, 'campfire_desert', [campfire(i) for i in range(3)], [0, 0], [[0, 0]], anim_ms=140,
               light={'color': '#eba14d', 'radius': 3.4}, note='a campfire (tent_fire: rest, safe)')
    sh.obj('tent_omar', tent_omar(), [0, 2], [[0, 0], [2, 0]], 1, kind='piece',
           note='Omar\'s shade tent (3 x 3): the awning overhead, the poles at the front corners solid')
    sh.obj('camp_ruin', camp_ruin(), [0, 1], [[0, 0], [1, 0]], 1, note='the dead caravan camp at the jetty (decor)')
    sh.tile('water_stair', water_stair(), collision='none', note='steps down into the water (the Haven\'s water stairs)')
    x, y = sh.alloc(128, 32)
    sh.cv.paste(line16(wall_sandstone_tile), x, y)
    sh.meta['tiles']['wall_sandstone'] = {'x': x, 'y': y, 'w': 128, 'h': 32, 'collision': 'solid', 'autotile': 'line16',
                                          'note': 'a low sandstone town wall; line16 index N*1+E*2+S*4+W*8'}
    sh.newline()
    sh.tile('haven_far', haven_far(), collision='none',
            note='160 x 96 decal of Saffron Haven from environments cell 4 (transparent sky) for the overhead layer at '
                 'the last dune (mark haven_far)')
