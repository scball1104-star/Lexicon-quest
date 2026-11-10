"""Zephyr Landing and the Airstair (Episode 6): the skyport kit, the departure board, the chimes, the post rack, the beacon,
the Kestrel, the docks and gardens, the rope stairs and the great chain, the isles_far and storm_far decals -> ep6.png
(E6-tiles, EPISODE6_PLAN 4.1, 4.2, 9.1). Imported by ep6.py.

The town is built around one image (environments cell 5): whitewashed houses with blue slate roofs and brass domes on
islands joined by rope bridges, pennants and windsocks streaming, rotors turning, the airship moored, the storm knot dark
on the north-east skyline. Dragon Quest rule: every building says what it is from a phone screen (a bed sign and hammocks,
a potion sign and goggles, a hammer and a great propeller, the beacon tower's lens).

Prefabs (kind building, doorAt): inn_cloudhouse (the Cloudhouse Inn), shop_aeris (Aeris Flight Provisions),
           workshop_galewing (the Galewing Workshop), tower_signal (the Signal Beacon tower; the beacon is its own
           overhead prop), house_sky_a, house_sky_b
Props      departure_board (3 x 3: frames 0..2 = every row ARRIVED, the rows clacking; 3 = one line lit: LANDED DOCK FOUR;
           drawn glyph bars, never legible text), post_rack, beacon (2 x 3 overhead roof prop: 0 dark, 1 lit),
           kestrel (6 x 3 overhead), windsock (anim 3), rotor (anim 3), windstone, skyflowers, flower_bed (a floating bed),
           bollard, bridge_post, lamp_sky (light), cargo_net, great_chain (2 x 8 overhead, repeatable every 32 px)
Tiles      rope_stair (16 x 16, collision none, stacks up a basalt face), rope_rail (line16 deck railing, solid)
Decals     isles_far (160 x 96, environments cell 5, the floating isles, sky transparent), storm_far (128 x 80, the storm
           knot: cell 5's cloud shapes re-graded to storm slate, lightning veins; transparent round it)
"""
import math, os
import numpy as np
from PIL import Image
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc, NEXT
import bld
from court_props import put_frames, ellipse, glow
from ep4_props import box, shadow, disc
from ep6_kit import WD, SA, SW, GD, WA, IC, RB, MT, GR, EA, FI, INK, CL, PE, SL, BR, CLOUD_WHITE
from ep6_props import R, contact_shadow, stamp_rows

RR = lambda i: C('roof_red', i)
BL = lambda i: C('blossom', i)
RG = lambda i: C('roof_green', i)
CB = lambda i: C('cloth_blue', i)


# ====================================================================== the building builder
def porthole(cv, x, y, d=8, lit=False):
    r = d / 2.0
    for yy in range(d):
        for xx in range(d):
            dd = math.hypot(xx + 0.5 - r, yy + 0.5 - r)
            if dd <= r:
                if dd > r - 1.0:
                    cv.set(x + xx, y + yy, DARK)
                elif dd > r - 2.0:
                    cv.set(x + xx, y + yy, BR(3) if xx + yy < d else BR(1))
                else:
                    c = (GD(4) if (xx + yy) % 3 else FI(3)) if lit else (IC(2) if xx + yy < d - 1 else WA(3))
                    cv.set(x + xx, y + yy, c)
    if not lit:
        cv.set(x + int(r) - 1, y + int(r) - 1, WHITE)


def brass_dome(cv, cx, base_y, r, h, drum=3, finial=True):
    """A brass dome on a short white drum: lit upper left, ribs, a pennant finial."""
    for y in range(base_y - drum, base_y + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            c = CLOUD_WHITE if x < cx - r * 0.3 else (MT(3) if x < cx + r * 0.5 else CL(1))
            if y == base_y:
                c = SL(1)
            if y == base_y - drum:
                c = BR(0)
            cv.set(x, y, c)
    top = base_y - drum
    for y in range(int(top - h), top + 1):
        t = (top - y) / float(h)
        half = r * math.sqrt(max(0.0, 1 - t * t))
        for x in range(int(round(cx - half)), int(round(cx + half)) + 1):
            u = (x - cx) / max(0.5, half)
            if abs(u) > 0.9 or y == top:
                c = BR(0)
            elif u < -0.3 and t > 0.2:
                c = BR(3) if (u < -0.55 and 0.4 < t < 0.75) else BR(2)
            elif u < 0.35:
                c = BR(2) if t > 0.15 else BR(1)
            else:
                c = BR(1)
            if abs(u) < 0.9 and int(round(u * 3)) != int(round(u * 3 + 0.12)) and t < 0.8:
                c = BR(1) if c != BR(0) else c
            cv.set(x, y, c)
    if finial:
        fy = int(top - h)
        for y in range(fy - 6, fy):
            cv.set(int(cx), y, MT(1))
        for k in range(5):
            cv.set(int(cx) + 1 + k, fy - 6 + k // 2, RR(3) if k < 3 else RR(2))


def sky_house(wt, rr, wr, top=0, door=None, windows=(), extras=None, seed=0, roof='roof_blue', domes=(), wall='white'):
    """A whitewashed skyport house seen from the south: a slate roof (rr rows), the front wall (wr rows) with timber
    corner posts, brass bands and porthole windows, a door; optional brass domes over the roof (top rows)."""
    W, H = wt * 16 + 6, (top + rr + wr) * 16
    cv = Canvas(W, H)
    bw = wt * 16
    roof_y = top * 16
    wall_y0 = roof_y + rr * 16 - 2
    g = dict(wall_x0=1, wall_x1=bw - 2, wall_y0=wall_y0, wall_y1=H, roof_y=roof_y, bw=bw, W=W, H=H)
    bld.roof_side(cv, 0, roof_y, bw, rr * 16 + 2, roof, hip=6, seed=seed, slate=True)
    # the wall
    for y in range(wall_y0 + 2, H - 3):
        for x in range(1, bw - 1):
            c = CLOUD_WHITE if rnd(x, y, seed, 3) > 0.06 else MT(3)
            if wall == 'stone':
                c = SW(4) if rnd(x, y, seed, 3) > 0.08 else SW(3)
            cv.set(x, y, c)
    bld.eave_shadow(cv, 1, wall_y0 + 2, bw - 2, rows=3)
    # timber corner posts and a brass band under the eave
    for y in range(wall_y0 + 2, H - 3):
        for x in (1, 2, bw - 3, bw - 2):
            cv.set(x, y, WD(3) if x in (1, bw - 3) else WD(1))
    for x in range(1, bw - 1):
        cv.set(x, wall_y0 + 5, BR(2) if x % 6 else BR(3))
        cv.set(x, wall_y0 + 6, BR(0))
    # the stone foot
    bld.stone_blocks(cv, 0, H - 4, bw, 4, course=4, seed=seed)
    for wdw in windows:
        porthole(cv, wdw['x'], wall_y0 + wdw['y'], wdw.get('d', 9), lit=wdw.get('lit', False))
    door_meta = None
    if door:
        dx, dw, dh = door['x'], door.get('w', 12), door.get('h', 20)
        bld.door(cv, dx, H - 3 - dh, w=dw, h=dh, arch=True, ramp='roof_blue', frame='wood')
        door_meta = (dx + dw // 2) // 16
    for dd in domes:
        brass_dome(cv, dd['cx'], roof_y + dd.get('base', rr * 8), dd['r'], dd.get('h', dd['r']), drum=dd.get('drum', 3))
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


def hammock(cv, x, y, w):
    for k in range(w):
        yy = y + int(round(2.5 * math.sin(k * math.pi / (w - 1))))
        cv.set(x + k, yy, SA(3) if k % 2 else RR(4))
        cv.set(x + k, yy + 1, SA(1))
    cv.set(x - 1, y - 1, WD(1)); cv.set(x + w, y - 1, WD(1))


def propeller(cv, cx, cy, r, ang=0.0):
    for k in range(3):
        a = ang + k * 2 * math.pi / 3
        for t in range(2, int(r)):
            x, y = cx + math.cos(a) * t, cy + math.sin(a) * t * 0.9
            cv.set(int(round(x)), int(round(y)), WD(4) if t < r - 2 else WD(2))
            cv.set(int(round(x + math.cos(a + 1.57))), int(round(y + math.sin(a + 1.57))), WD(3))
    disc(cv, cx, cy, 2.2, lambda x, y, d: BR(3) if d < 1.2 else BR(1))


def inn_cloudhouse():
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        bld.hanging_sign(cv, 30, y0 + 9, 'bed', w=14, h=10)
        hammock(cv, 80, y0 + 18, 14)
        # a string of signal pennants across the front
        for i, x in enumerate(range(6, g['bw'] - 4, 7)):
            yy = y0 + 3 + int(round(1.5 * math.sin(i * 0.9)))
            R(cv, x, yy, 3, 3, [RR(4), GD(4), CB(3), CLOUD_WHITE][i % 4])
            cv.set(x + 1, yy + 3, [RR(3), GD(3), CB(2), CL(1)][i % 4])
    return sky_house(7, 2, 3, top=1, door={'x': 52, 'w': 14, 'h': 22},
                     windows=[{'x': 8, 'y': 14, 'd': 10, 'lit': True}, {'x': 70, 'y': 12, 'd': 9},
                              {'x': 92, 'y': 12, 'd': 9, 'lit': True}],
                     domes=[{'cx': 26, 'r': 9, 'h': 11, 'base': 14}], extras=ext, seed=611)


def shop_aeris():
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        bld.hanging_sign(cv, 8, y0 + 9, 'potion', w=12, h=10)
        # goggles on hooks in the window band
        for k, gx in enumerate((48, 58)):
            for dx in (0, 4):
                disc(cv, gx + dx, y0 + 18, 1.8, lambda x, y, d: DARK if d > 1.2 else IC(2))
            cv.set(gx + 2, y0 + 18, WD(1))
            cv.set(gx + 2, y0 + 15, MT(1))
        # an awning in Aeris's blue and cream
        bld.awning(cv, 40, y0 + 8, 34, 'cloth_blue', 'sand', depth=5)
    return sky_house(5, 2, 2, top=1, door={'x': 22, 'w': 12, 'h': 20}, roof='roof_blue',
                     domes=[{'cx': 56, 'r': 10, 'h': 12, 'base': 16}], extras=ext, seed=613)


def workshop_galewing():
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        bld.hanging_sign(cv, 66, y0 + 9, 'hammer', w=13, h=10)
        # the forge mouth glowing
        R(cv, 8, y1 - 18, 20, 13, DARK)
        for y in range(y1 - 16, y1 - 6):
            for x in range(10, 26):
                cv.set(x, y, FI(3) if (x + y) % 3 else FI(4))
        R(cv, 8, y1 - 19, 20, 2, BR(1))
        # the great propeller on the roof's gable end
        propeller(cv, 80, g['roof_y'] + 14, 12, 0.4)
    return sky_house(6, 2, 2, top=1, door={'x': 40, 'w': 14, 'h': 20}, roof='roof_red', extras=ext, seed=617,
                     windows=[{'x': 70, 'y': 18, 'd': 8}])


def tower_signal():
    """The Signal Beacon tower: a tall white stone tower with brass bands, a door to the Chart Room; the beacon itself is
    the overhead roof prop `beacon` (2 x 3) set on its top."""
    def ext(cv, g):
        y0, y1 = g['wall_y0'], g['wall_y1']
        for y in range(y0 + 20, y1 - 4, 18):
            for x in range(1, g['bw'] - 1):
                cv.set(x, y, BR(2) if x % 5 else BR(3))
                cv.set(x, y + 1, BR(0))
        for k, yy in enumerate((y0 + 26, y0 + 44)):
            porthole(cv, 26, yy, 10, lit=(k == 0))
        # a chart pinned by the door
        box(cv, 8, y1 - 26, 18, y1 - 14, CLOUD_WHITE, SA(3), SA(2), SL(1), round_=False)
        for j in range(3):
            R(cv, 10, y1 - 23 + j * 3, 6, 1, CB(2))
    return sky_house(4, 1, 5, top=0, door={'x': 34, 'w': 14, 'h': 22}, roof='roof_blue', extras=ext, seed=619,
                     wall='stone')


def house_sky_a():
    def ext(cv, g):
        rotor_y = g['roof_y'] + 2
        for y in range(rotor_y, rotor_y + 12):
            cv.set(54, y, MT(1))
        for k in range(10):
            cv.set(48 + k, rotor_y + (1 if k in (4, 5) else 0), MT(3) if k % 3 else MT(2))
    return sky_house(4, 2, 2, door={'x': 8, 'w': 12, 'h': 19}, windows=[{'x': 34, 'y': 14, 'd': 9}],
                     extras=ext, seed=621)


def house_sky_b():
    return sky_house(5, 2, 2, top=1, door={'x': 46, 'w': 12, 'h': 19}, windows=[{'x': 10, 'y': 14, 'd': 9, 'lit': True},
                                                                              {'x': 24, 'y': 14, 'd': 9}],
                     domes=[{'cx': 22, 'r': 8, 'h': 10, 'base': 14}], roof='roof_green', seed=623)


# ====================================================================== the board, the rack, the beacon, the Kestrel
def departure_board(k):
    """The Skyport Departure Board (3 x 3): a slate board in a brass frame on two posts, six rows of drawn glyph bars
    (never legible). k 0..2: every row shows the same pale ARRIVED block and the rows clack (one row mid-flip per frame);
    k 3: after isles_restored, one row lit gold (LANDED DOCK FOUR), the rest blank and still."""
    cv = Canvas(48, 48)
    contact_shadow(cv, 4, 44, 47)
    for x in (6, 40):
        for y in range(30, 47):
            cv.set(x, y, WD(4)); cv.set(x + 1, y, WD(2)); cv.set(x - 1, y, WD(1)); cv.set(x + 2, y, WD(1))
    box(cv, 1, 2, 46, 33, BR(3), BR(2), BR(1), DARK)
    R(cv, 3, 4, 42, 28, SL(0))
    # the header plate: a winged-compass glyph
    R(cv, 3, 4, 42, 4, SL(1))
    for (x, y) in ((22, 5), (23, 5), (24, 5), (25, 5), (23, 6), (24, 6), (18, 6), (19, 5), (28, 5), (29, 6)):
        cv.set(x, y, BR(3))
    for row in range(6):
        y = 10 + row * 4
        # a flight glyph run (left) and a status block (right)
        for i in range(5):
            gx = 5 + i * 4
            n = h32(row, i, 6901) % 4
            if k == 3 and row != 2:
                continue
            col = CL(1) if k < 3 else GD(4)
            for dx in range(3):
                if (n >> (dx % 2)) & 1 or dx == 1:
                    cv.set(gx + dx, y, col)
                    cv.set(gx + dx, y + 1, col if dx != 2 else SL(2))
        if k < 3:
            flip = (row == k * 2 % 6) or (row == (k * 2 + 3) % 6)
            for x in range(27, 43):
                if flip:
                    cv.set(x, y, SL(3)); cv.set(x, y + 1, SL(1))
                else:
                    cv.set(x, y, CLOUD_WHITE if x % 4 else CL(1))
                    cv.set(x, y + 1, CL(1))
        elif row == 2:
            for x in range(27, 43):
                cv.set(x, y, GD(4) if x % 4 else GD(5)); cv.set(x, y + 1, GD(3))
            # the dock number: four pips
            for i in range(4):
                cv.set(28 + i * 3, y - 1, GD(5))
    return cv


def post_rack():
    """Piri's post rack (2 x 2): a timber rack of pigeonholes with letters in them, a silver-ribboned bird on top."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 1, 31, 31)
    box(cv, 1, 8, 30, 30, WD(4), WD(3), WD(2), WD(0))
    for r in range(3):
        for c in range(4):
            x, y = 3 + c * 7, 10 + r * 6
            R(cv, x, y, 6, 5, WD(1))
            if h32(r, c, 6911) % 3:
                R(cv, x + 1, y + 2, 4, 3, CLOUD_WHITE if (r + c) % 2 else SA(3))
                cv.set(x + 2, y + 3, RR(3) if (r * c) % 3 == 0 else CB(2))
    # the bird: grey, a silver ribbon on its leg
    for (x, y, c) in ((20, 4, SL(3)), (21, 4, SL(3)), (22, 4, SL(2)), (19, 5, SL(4)), (20, 5, SL(3)), (21, 5, SL(3)),
                      (22, 5, SL(3)), (23, 5, SL(2)), (20, 6, SL(2)), (21, 6, SL(2)), (22, 6, SL(1)), (19, 4, SL(1)),
                      (18, 4, GD(4)), (22, 7, MT(4)), (23, 8, MT(3))):
        cv.set(x, y, c)
    cv.set(19, 3, DARK)
    return cv


def beacon(lit):
    """The Signal Beacon on the tower's roof (2 x 3, overhead): a brass lantern house with a great lens; lit, the lens
    burns gold with rays (rest and save after beacon_lit)."""
    cv = Canvas(32, 48)
    box(cv, 2, 34, 29, 47, SW(4), SW(3), SW(2), SW(0))
    R(cv, 2, 36, 28, 1, BR(2))
    box(cv, 5, 12, 26, 35, BR(3), BR(2), BR(1), DARK)
    for y in range(15, 33):
        for x in range(8, 24):
            d = math.hypot((x + 0.5 - 16) / 7.5, (y + 0.5 - 24) / 8.5)
            if d < 1.0:
                if lit:
                    c = WHITE if d < 0.35 else (GD(5) if d < 0.6 else GD(4))
                else:
                    c = SL(1) if d < 0.6 else SL(2)
                    if 0.4 < d < 0.5 and x < 16:
                        c = SL(3)
                cv.set(x, y, c)
    for x in range(5, 27):
        cv.set(x, 24, BR(0) if x < 8 or x > 23 else cv.get(x, 24))
    # the cap and a vane on top
    for y in range(4, 12):
        half = (y - 4) * 13 // 8
        for x in range(16 - half, 16 + half + 1):
            cv.set(x, y, RB(3) if x < 16 else RB(2))
        cv.set(16 - half, y, RB(0)); cv.set(16 + half, y, RB(0))
    for y in range(0, 5):
        cv.set(16, y, MT(1))
    R(cv, 17, 1, 5, 1, RR(3))
    if lit:
        for a in range(8):
            ang = a * math.pi / 4
            for t in range(10, 16):
                x, y = 16 + math.cos(ang) * t, 24 + math.sin(ang) * t * 0.9
                if 0 <= x < 32 and 0 <= y < 48:
                    cv.put(int(x), int(y), (249, 215, 122, 150 if t < 13 else 90))
    return cv


def kestrel():
    """The Kestrel, Aeris's airship (6 x 3, overhead): a cream gas envelope with blue bands and a sun crest, a wooden
    gondola with portholes and a rail, rigging, a stern propeller and tail fins."""
    cv = Canvas(96, 48)
    # the envelope
    cx, cy, rx, ry = 50, 15, 42, 13
    for y in range(1, 30):
        for x in range(4, 94):
            d = math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
            if d <= 1.0:
                u, v = (x - cx) / rx, (y - cy) / ry
                lit = -(u * 0.5 + v * 0.85)
                if d > 0.93:
                    c = WD(1)
                elif lit > 0.55:
                    c = WHITE
                elif lit > 0.1:
                    c = SA(3)
                elif lit > -0.45:
                    c = SA(2)
                else:
                    c = SA(1)
                band = int((x - cx + rx) / 10)
                if (x - cx + rx) % 10 == 0 and d < 0.92:
                    c = SA(1) if lit < 0.1 else SA(2)
                if abs(v + 0.05) < 0.13 and d < 0.93:
                    c = CB(3) if lit > 0 else CB(2)
                cv.set(x, y, c)
    # the sun crest
    disc(cv, 62, 12, 3.5, lambda x, y, d: GD(4) if d < 2.2 else GD(2))
    # tail fins at the stern (left)
    for k in range(9):
        for y in range(5 + k // 2, 14):
            cv.set(3 + k, y - 4, CB(3) if y < 10 else CB(2))
        for y in range(17, 26 - k // 2):
            cv.set(3 + k, y + 2, CB(2))
    # rigging
    for (x0, x1) in ((30, 34), (52, 50), (70, 66)):
        cv.line(x0, 27, x1, 35, WD(1))
    # the gondola
    for y in range(33, 45):
        w = 30 - max(0, y - 39) * 3
        for x in range(50 - w, 50 + w):
            c = WD(4) if y < 36 else (WD(3) if y < 41 else WD(2))
            if y == 33:
                c = WD(5)
            if (x - 50 + w) % 8 == 0 and y > 35:
                c = WD(1)
            cv.set(x, y, c)
        cv.set(50 - w - 1, y, WD(0)); cv.set(50 + w, y, WD(0))
    for x in range(20, 80):
        cv.set(x, 32, BR(2) if x % 4 else BR(3))
        cv.set(x, 45, WD(0))
    for px in (30, 42, 56, 68):
        porthole(cv, px, 36, 6, lit=(px == 42))
    # the stern propeller
    for k in range(3):
        a = 0.6 + k * 2.09
        for t in range(1, 6):
            cv.set(int(round(17 + math.cos(a) * t * 0.5)), int(round(38 + math.sin(a) * t)), MT(3))
    disc(cv, 17, 38, 1.5, lambda x, y, d: BR(2))
    for x in range(17, 22):
        cv.set(x, 38, MT(1))
    return cv


# ====================================================================== town decor
def windsock(k):
    cv = Canvas(16, 32)
    contact_shadow(cv, 5, 11, 31)
    for y in range(6, 31):
        cv.set(4, y, MT(2)); cv.set(5, y, MT(1))
    R(cv, 3, 29, 4, 2, SW(2))
    # the sock: red and white rings, rippling (3 frames), streaming east
    for i in range(10):
        x = 6 + i
        yo = 6 + int(round(math.sin(i * 0.7 + k * 2.1) * 1.0)) + i // 5
        hgt = 5 - i // 4
        col = (RR(4) if (i // 2) % 2 == 0 else CLOUD_WHITE)
        for j in range(hgt):
            c = col if j < hgt - 1 else (RR(2) if col == RR(4) else CL(1))
            cv.set(x, yo + j, c)
    R(cv, 5, 5, 2, 6, BR(2))
    return cv


def rotor(k):
    cv = Canvas(16, 32)
    contact_shadow(cv, 4, 12, 31)
    box(cv, 5, 22, 10, 30, SW(4), SW(3), SW(2), SW(0))
    for y in range(9, 22):
        cv.set(7, y, MT(2)); cv.set(8, y, MT(1))
    ang = k * math.pi / 3
    for b in range(4):
        a = ang + b * math.pi / 2
        for t in range(1, 7):
            x, y = 7.5 + math.cos(a) * t, 8 + math.sin(a) * t * 0.45
            cv.set(int(round(x)), int(round(y)), CLOUD_WHITE if t > 2 else MT(3))
    disc(cv, 8, 8, 1.4, lambda x, y, d: BR(3))
    return cv


def windstone():
    """A windstone: a standing pale stone with a carved spiral (the wind's mark), a ribbon tied round it."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 2, 14, 31)
    for y in range(8, 31):
        half = 5 - max(0, 11 - y) // 2
        for x in range(8 - half, 8 + half):
            u = (x - (8 - half)) / float(2 * half)
            cv.set(x, y, CLOUD_WHITE if u < 0.3 else (MT(3) if u < 0.7 else CL(1)))
        cv.set(8 - half - 1, y, SL(2)); cv.set(8 + half, y, SL(1))
    for t in range(18):
        a = t * 0.6
        r = 0.4 + t * 0.2
        cv.set(int(round(8 + math.cos(a) * r)), int(round(17 + math.sin(a) * r)), SL(3))
    for x in range(3, 13):
        cv.set(x, 24, CB(3) if x % 2 else CB(2))
    cv.set(13, 25, CB(3)); cv.set(14, 26, CB(2))
    return cv


def skyflowers():
    """Skyflowers (floor decor, collision none): pale blue star-flowers with peach hearts in a tuft of leaves."""
    cv = Canvas(16, 16)
    for (x, y) in ((4, 9), (11, 6), (8, 12)):
        for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            cv.set(x + dx, y + dy, IC(2))
        cv.set(x, y, PE(0))
        cv.set(x + 1, y + 2, GR(3)); cv.set(x - 1, y + 2, GR(2))
    cv.set(6, 5, IC(3)); cv.set(13, 11, IC(3))
    return cv


def flower_bed():
    """A floating flower bed (2 x 2, solid): a little turf island hanging in the air, flowers on top, roots and a stone
    tail dangling under it."""
    cv = Canvas(32, 32)
    for y in range(14, 31):
        half = int(13 - max(0, y - 18) * 1.0)
        for x in range(16 - half, 16 + half):
            c = SL(2) if y > 18 else EA(3)
            if y > 18 and x < 16 - half + 2:
                c = SL(3)
            if y > 18 and x > 16 + half - 3:
                c = SL(1)
            cv.set(x, y, c)
    for y in range(10, 16):
        for x in range(4, 28):
            if math.hypot((x - 15.5) / 12.0, (y - 13) / 3.5) < 1.0:
                cv.set(x, y, GR(4) if y < 13 else GR(3))
    for (x, y, c) in ((8, 10, BL(3)), (12, 9, IC(2)), (17, 10, PE(0)), (21, 9, BL(2)), (24, 11, IC(3)), (10, 12, GD(4))):
        cv.set(x, y, c); cv.set(x, y + 1, GR(2))
    for x in (11, 19):
        for y in range(28, 32):
            cv.set(x + (y % 2), y, EA(2))
    return cv


def bollard():
    cv = Canvas(16, 16)
    shadow(cv, 4, 12, 14, 80)
    box(cv, 5, 4, 10, 13, SL(3), SL(2), SL(1), DARK)
    R(cv, 4, 4, 8, 2, SL(3)); cv.set(4, 4, DARK); cv.set(11, 4, DARK)
    for x in range(5, 11):
        cv.set(x, 9, SA(2) if x % 2 else SA(1))
    return cv


def bridge_post():
    """A rope bridge's anchor post (solid): a stout timber post, the hand ropes tied off round it, a brass cap."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 3, 13, 31)
    box(cv, 5, 10, 10, 30, WD(5), WD(4), WD(2), WD(0), round_=False)
    R(cv, 4, 8, 8, 3, BR(2)); cv.set(4, 8, BR(3)); R(cv, 4, 10, 8, 1, BR(0))
    for y in (15, 22):
        for x in range(4, 12):
            cv.set(x, y, SA(3) if (x + y) % 2 else SA(1))
            cv.set(x, y + 1, SA(1))
    return cv


def lamp_sky():
    """A skyport street lamp (16 x 48, light): a slim brass post, a glass lantern, a little pennant."""
    cv = Canvas(16, 48)
    contact_shadow(cv, 4, 12, 47)
    box(cv, 5, 42, 10, 46, SW(4), SW(3), SW(2), SW(0))
    for y in range(14, 42):
        cv.set(7, y, BR(2)); cv.set(8, y, BR(0))
    box(cv, 4, 4, 11, 14, BR(3), BR(2), BR(1), DARK)
    for y in range(6, 13):
        for x in range(6, 10):
            cv.set(x, y, GD(5) if (x, y) == (7, 8) else GD(4))
    R(cv, 6, 2, 4, 2, BR(2))
    for k in range(4):
        cv.set(9 + k, 16 + k // 2, RR(4) if k < 2 else RR(3))
    return cv


def cargo_net():
    """Cargo under a net on the dock (2 x 2): crates and sacks, a rope net over them."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 1, 31, 31)
    box(cv, 2, 14, 15, 30, WD(5), WD(4), WD(2), WD(0))
    box(cv, 14, 18, 29, 30, WD(4), WD(3), WD(2), WD(0))
    disc(cv, 22, 14, 6, lambda x, y, d: SA(3) if (x + y) < 34 else SA(2))
    for y in range(8, 31):
        for x in range(2, 30):
            if cv.get(x, y)[3] and ((x + y) % 5 == 0 or (x - y) % 5 == 0):
                cv.set(x, y, SA(1) if (x + y) % 2 else EA(2))
    return cv


def great_chain():
    """The great chain up the Airstair (2 x 8, overhead): oval iron links, one seen face-on and one edge-on in turn,
    period 32 px (stack copies to any height)."""
    cv = Canvas(32, 128)
    for i in range(8):
        y0 = i * 16
        if i % 2 == 0:
            # a face-on link: an iron oval ring
            for y in range(y0 - 2, y0 + 19):
                for x in range(6, 26):
                    d = math.hypot((x + 0.5 - 16) / 9.5, (y + 0.5 - (y0 + 8)) / 10.0)
                    if 0.62 < d <= 1.0:
                        c = MT(2) if (x < 16 and y < y0 + 8) else (SL(2) if d < 0.8 else SL(1))
                        if d > 0.93:
                            c = DARK
                        cv.set(x, y % 128, c)
        else:
            # an edge-on link: a thick bar through the rings above and below
            for y in range(y0 - 4, y0 + 20):
                for x in range(13, 19):
                    c = MT(2) if x == 14 else (SL(2) if x < 17 else SL(1))
                    if x in (13, 18):
                        c = DARK
                    cv.set(x, y % 128, c)
    for i in range(0, 128, 32):
        cv.set(9, i + 4, MT(3)); cv.set(10, i + 3, MT(3))
    return cv


def rope_stair():
    """A rope stair on a basalt face (16 x 16, collision none, stack it up the face): two side ropes, wooden treads."""
    cv = Canvas(16, 16)
    for y in range(16):
        for x in (2, 13):
            cv.set(x, y, SA(3) if y % 3 else SA(1))
            cv.set(x + 1, y, SA(1))
        cv.put(15, y, SH(70))
    for y in (2, 7, 12):
        R(cv, 3, y, 10, 3, WD(4))
        R(cv, 3, y, 10, 1, WD(5))
        R(cv, 3, y + 2, 10, 1, WD(2))
        cv.put(4, y + 3, SH(80)); cv.put(12, y + 3, SH(80))
    return cv


def rope_rail_tile(n, e, s, w):
    """Line16 deck railing (solid): timber posts with a rope run between them, along any side of a deck."""
    cv = Canvas(16, 16)
    rope = lambda x, y: cv.set(x, y, SA(3) if (x + y) % 3 else SA(1))
    if w:
        for x in range(0, 8):
            rope(x, 8); cv.set(x, 9, EA(2))
    if e:
        for x in range(8, 16):
            rope(x, 8); cv.set(x, 9, EA(2))
    if n:
        for y in range(0, 7):
            rope(8, y)
    if s:
        for y in range(10, 16):
            rope(8, y)
    for y in range(4, 13):
        cv.set(6, y, WD(1)); cv.set(7, y, WD(4)); cv.set(8, y, WD(3)); cv.set(9, y, WD(1))
    R(cv, 6, 3, 4, 1, BR(2))
    cv.put(10, 12, SH(90)); cv.put(10, 11, SH(60))
    return cv


def line16(fn):
    cv = Canvas(128, 32)
    for i in range(16):
        cv.paste(fn(bool(i & 1), bool(i & 2), bool(i & 4), bool(i & 8)), (i % 8) * 16, (i // 8) * 16)
    return cv


# ====================================================================== the decals
def _cell5():
    src = os.path.join(os.path.dirname(NEXT), 'assets', 'art', 'environments.webp')
    im = Image.open(src).convert('RGB')
    w, h = im.size
    cw, ch = w // 2, h // 4
    return im.crop((cw, 2 * ch, 2 * cw, 3 * ch)), cw, ch


def _quant(col, pal):
    d = ((pal - col) ** 2).sum(1)
    k = int(np.argmin(d))
    return tuple(int(v * 255 + 0.5) for v in pal[k]) + (255,)


def isles_far():
    """160 x 96 decal for the overhead layer at the Airstair's top: the floating isles from environments cell 5 (the
    castle island, its falls, the bridge and the far islands), quantized to the sheet palette, the blue sky made
    transparent and the cloud at the foot dithered out so it sits on any sky or cloud."""
    cell, cw, ch = _cell5()
    box_ = (int(cw * 0.30), int(ch * 0.0), int(cw * 1.0), int(ch * 0.78))
    crop = cell.crop(box_).resize((160, 96), Image.BOX)
    a = np.asarray(crop).astype(np.float32) / 255.0
    from pxlib import PAL
    import ep6_kit
    pal = np.array([hexc(x)[:3] for x in list(PAL['colors']) + ep6_kit.EXTRA[:4]], np.float32) / 255.0
    cv = Canvas(160, 96)
    for y in range(96):
        for x in range(160):
            r, g, b = a[y, x]
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            sky = (b > r + 0.10 and b > g + 0.0 and lum > 0.40) or (b > r + 0.2 and lum > 0.3)
            if sky:
                continue
            hz = 0.06                         # far away: a little sky haze
            col = np.array([r * (1 - hz) + 0.70 * hz, g * (1 - hz) + 0.80 * hz, b * (1 - hz) + 0.92 * hz])
            if y > 80 and ((x + y) % 2 or y > 88):
                continue
            cv.set(x, y, _quant(col, pal))
    # drop isolated pixels (single specks left by the sky key)
    out = cv.copy()
    for y in range(1, 95):
        for x in range(1, 159):
            if cv.get(x, y)[3] and sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if cv.get(x + dx, y + dy)[3]) <= 1:
                out.set(x, y, (0, 0, 0, 0))
    return out


def storm_far():
    """128 x 80 decal: the storm knot on the north-east skyline. Environments cell 5 has no storm (it is the isles in
    sunlight), so the knot is composed in code in the cell's cloud language: a cumulonimbus of round lobes (lit rims on
    the upper left, slate bodies, dark undersides), a flat anvil spread over the top, a black core low in the middle, two
    soft lightning veins (cold white, never a flash) and a dark outline so it holds against any sky; transparent round it."""
    lobes = [  # (cx, cy, r) back to front: the anvil first, then the tower, then the low skirt
        (64, 14, 30), (34, 18, 18), (94, 17, 20), (18, 22, 11), (112, 21, 12),
        (64, 32, 22), (46, 40, 18), (82, 40, 18), (64, 50, 20), (34, 56, 14), (94, 56, 15), (52, 62, 14), (76, 62, 14)]
    ramp = [SL(0), SL(1), SL(2), SL(3), SL(4)]
    cv = Canvas(128, 80)
    own = [[-1] * 128 for _ in range(80)]
    for i, (cx, cy, r) in enumerate(lobes):
        sy = 0.55 if i == 0 else 1.0
        for y in range(80):
            for x in range(128):
                dx, dy = (x + 0.5 - cx) / r, (y + 0.5 - cy) / (r * sy)
                if math.hypot(dx, dy) <= 1.0 and y < 72:
                    own[y][x] = i
    for y in range(80):
        for x in range(128):
            i = own[y][x]
            if i < 0:
                continue
            cx, cy, r = lobes[i]
            sy = 0.55 if i == 0 else 1.0
            dx, dy = (x + 0.5 - cx) / r, (y + 0.5 - cy) / (r * sy)
            d = math.hypot(dx, dy)
            lit = -(dx * 0.6 + dy * 0.8)
            v = 2.0 + lit * 1.6 - (y / 80.0) * 1.2
            core = math.hypot((x - 64) / 26.0, (y - 56) / 14.0)
            if core < 1.0:
                v -= (1.0 - core) * 2.0
            v = max(0.0, min(4.0, v))
            k = int(v)
            if v - k > ((h32(x, y, 6951) % 16) + 0.5) / 16.0 and k < 4:
                k += 1
            if d > 0.86 and lit > 0.35:
                k = 4
            cv.set(x, y, ramp[k])
    # the flat base and the outline
    out = cv.copy()
    for y in range(80):
        for x in range(128):
            if not cv.get(x, y)[3]:
                continue
            if any(not cv.get(x + ddx, y + ddy)[3] for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.set(x, y, SL(0))
    cv = out
    # rain under the base: dithered slate streaks fading down
    for x in range(30, 100):
        for y in range(70, 80):
            if (x * 3 + y) % 7 == 0 and (x + y) % 2 == 0 and h32(x, 6953) % 3:
                cv.put(x, y, (40, 48, 64, max(40, 200 - (y - 70) * 18)))
    # lightning veins (cold white, soft: a far flash, not a full white)
    for (x0, y0, steps) in ((54, 44, 18), (80, 36, 13)):
        x, y = x0, y0
        for k in range(steps):
            cv.set(x, y, IC(3) if k % 3 else WHITE)
            cv.set(x + 1, y, IC(1))
            x += [1, 0, -1, 1, 0, -1][h32(x0, k, 6952) % 6]
            y += 1
    return cv


# ====================================================================== build
def build_into(sh):
    sh.newline()
    items = []
    for pid, fn in (('inn_cloudhouse', inn_cloudhouse), ('shop_aeris', shop_aeris), ('workshop_galewing', workshop_galewing),
                    ('tower_signal', tower_signal), ('house_sky_a', house_sky_a), ('house_sky_b', house_sky_b)):
        cv, m = fn()
        items.append((pid, cv, m))
    items.sort(key=lambda t: (-t[1].h, t[0]))
    notes = {'inn_cloudhouse': 'the Cloudhouse Inn (bed sign, hammock, pennants); door to ep6_zl_inn',
             'shop_aeris': 'Aeris Flight Provisions (potion sign, goggles, a blue awning); door to ep6_zl_shop',
             'workshop_galewing': 'the Galewing Workshop (hammer sign, the forge glow, the great propeller); door to '
                                  'ep6_zl_workshop',
             'tower_signal': 'the Signal Beacon tower (white stone, brass bands); door to ep6_zl_charts; set the beacon '
                             'prop on its top',
             'house_sky_a': 'a skyport house with a roof rotor', 'house_sky_b': 'a skyport house with a brass dome'}
    for pid, cv, meta in items:
        m = dict(meta)
        w, h = m.pop('rect_wh')
        x, y = sh.alloc(w, h)
        sh.cv.paste(cv, x, y)
        sh.meta['objects'][pid] = {'rect': [x, y, w, h], 'kind': 'building', 'note': notes[pid], **m}
    sh.newline()
    O = sh.meta['objects']
    put_frames(sh, 'departure_board', [departure_board(k) for k in range(4)], [0, 2], [[0, 0], [2, 0]], overhead=2,
               shiftFrames=[0, 1, 2],
               note='the Skyport Departure Board (object board): state 0 = every flight ARRIVED, the rows clacking (cycle '
                    'frames 0, 1, 2 at about 160 ms while isles_restored is unset); state 1 = one line lit, LANDED DOCK '
                    'FOUR (frame 3); drawn glyph bars, never legible; the posts\' cells are solid')
    sh.obj('post_rack', post_rack(), [0, 1], [[0, 0], [1, 0]], 1, note='Piri\'s post rack (object post_rack), a grey bird on top')
    put_frames(sh, 'beacon', [beacon(False), beacon(True)], [0, 2], [], overhead=3, kind='piece',
               light={'color': '#f9d77a', 'radius': 4.0},
               note='the Signal Beacon on the tower\'s roof (2 x 3, all overhead, collision none): 0 dark, 1 lit '
                    '(beacon_lit; light only while lit)')
    O['beacon']['collision'] = 'none'
    sh.obj('cargo_net', cargo_net(), [0, 1], [[0, 0], [1, 0]], 1, note='cargo under a net on the north dock (Aeris sits here)')
    sh.newline()
    sh.obj('kestrel', kestrel(), [0, 2], [], 3, kind='piece',
           note='the Kestrel, Aeris\'s airship (6 x 3, all overhead, collision none: moor it over cloud beside a dock; '
                'the gangway is a map door)')
    O['kestrel']['collision'] = 'none'
    sh.obj('great_chain', great_chain(), [0, 7], [], 8, kind='piece',
           note='the great chain up the Airstair (2 x 8, overhead, collision none); its links repeat every 32 px, so '
                'stack copies 2 tiles apart in rows for any height')
    O['great_chain']['collision'] = 'none'
    sh.newline()
    put_frames(sh, 'windsock', [windsock(k) for k in range(3)], [0, 1], [[0, 0]], overhead=1, anim_ms=200,
               note='a windsock on a pole (decor, solid), streaming east')
    put_frames(sh, 'rotor', [rotor(k) for k in range(3)], [0, 1], [[0, 0]], overhead=1, anim_ms=120,
               note='a wind rotor on a pole (decor, solid), turning')
    sh.obj('windstone', windstone(), [0, 1], [[0, 0]], 1, note='a windstone (canon decor): a carved spiral, a blue ribbon')
    sh.obj('bridge_post', bridge_post(), [0, 1], [[0, 0]], 1, note='a rope bridge\'s anchor post (solid): set at each end of a skywalk')
    sh.obj('bollard', bollard(), [0, 0], [[0, 0]], 0, note='a dock bollard with a rope turn (solid)')
    sh.obj('skyflowers', skyflowers(), [0, 0], [], 0, kind='piece', note='skyflowers (floor decor, collision none)')
    O['skyflowers']['collision'] = 'none'
    sh.obj('flower_bed', flower_bed(), [0, 1], [[0, 0], [1, 0]], 1,
           note='a floating flower bed of the cloud gardens (solid; set it over cloud beside a walkway)')
    sh.obj('lamp_sky', lamp_sky(), [0, 2], [[0, 0]], 2, light={'color': '#f9d77a', 'radius': 3.0},
           note='a skyport street lamp (brass post, glass lantern, a red pennant)')
    sh.newline()
    sh.tile('rope_stair', rope_stair(), collision='none',
            note='a rope stair hung on a basalt face (collision none: overrides the face so the stair walks); stack it')
    x, y = sh.alloc(128, 32)
    sh.cv.paste(line16(rope_rail_tile), x, y)
    sh.meta['tiles']['rope_rail'] = {'x': x, 'y': y, 'w': 128, 'h': 32, 'collision': 'solid', 'autotile': 'line16',
                                     'note': 'a deck railing (posts and a rope run); line16 index N*1+E*2+S*4+W*8'}
    sh.newline()
    sh.tile('isles_far', isles_far(), collision='none',
            note='160 x 96 decal of the floating isles from environments cell 5 (transparent sky) for the overhead layer '
                 'at the Airstair\'s top (mark isles_far)')
    sh.tile('storm_far', storm_far(), collision='none',
            note='128 x 80 decal of the storm knot (cell 5 cloud shapes re-graded to storm slate) for the overhead layer '
                 'on Zephyr Landing\'s north-east skyline (mark storm_far)')
