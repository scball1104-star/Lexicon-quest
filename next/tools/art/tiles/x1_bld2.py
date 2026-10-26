"""Landmarks and mill works (EXPANSION1_PLAN 4.7 to 4.9, 4.12, 4.13, 10.1), the second half of the building kit (x1_bld.py is the first).

  x1_mill_building   Hal's Mill, 7 tiles wide, doorAt (3,0), `wheelAt` (7,0) names the tile where x1_mill_wheel's anchor goes
  x1_mill_wheel      the wheel: frames 0 = still and dry, 1..4 = turning (`turnAnim`, 4 frames)
  x1_culvert_arch    the brick arch under the weir (48 x 48 door, doorAt (1,0))
  x1_weir_cap_{l,m,r}, x1_weir_face_{l,m,r,arch}   the dry weir across the river (cap = walkway, face = the wall below it, 16 x 32)
  x1_sluice_failed   the failed sluice gate (48 x 48, 3 tiles)
  x1_orrery_tower    the domed Orrery, doorAt (2,0)
  x1_watchtower      the ruined Keepers' Watchtower on the High Moor (80 x 144)
  x1_turf_hut        Odo's turf hut, doorAt (1,0)
  x1_windmill        Larchhill's windmill, 3 sail frames (`anim`)
"""
import math
from pxlib import Canvas, C, SH, DARK, rnd, h32
from x1_draw import *
import bld
import prefabs
from prefabs import house, finish_shadow, stone_steps
import x1_kit
import x1_props
from x1_bld import pack_prefab

KR = [K(i) for i in range(6)]


def kshift(c, d):
    if c in KR:
        return KR[max(0, min(5, KR.index(c) + d))]
    return c


# ====================================================================== Hal's Mill
def mill_building():
    def ext(cv, g):
        x0, x1, y0, y1 = g['wall_x0'], g['wall_x1'], g['wall_y0'], g['wall_y1']
        # the hoist: a loading door in the gable under a projecting beam, a pulley and a sack on a rope
        gx = 56
        for yy in range(62, 74):
            for xx in range(gx - 5, gx + 5):
                cv.set(xx, yy, DARK if yy > 63 else SD(1))
        for xx in range(gx - 6, gx + 6):
            cv.set(xx, 61, WD(4))
            cv.set(xx, 62, WD(1))
        for yy in range(62, 75):
            cv.set(gx - 6, yy, WD(3))
            cv.set(gx + 5, yy, WD(1))
        for xx in range(gx - 3, gx + 16):
            cv.set(xx, 57, WD(4) if xx < gx + 12 else WD(2))
            cv.set(xx, 58, WD(1))
        cv.set(gx + 13, 59, MT(3))
        cv.set(gx + 13, 60, MT(2))
        for yy in range(60, 72):
            cv.set(gx + 13, yy, SA(1))
        ell(cv, gx + 13, 75, 3.5, 3.8, lambda a, b, d: EA(1) if d > 0.85 else (PA(3) if (-a - b) > 0 else PA(1)))
        cv.set(gx + 13, 71, EA(1))
        # flour dust streaks under the windows and the hoist
        for (sx, sy, l) in ((x0 + 13, y0 + 28, 10), (x0 + 74, y0 + 28, 9), (gx - 2, 76, 6)):
            for k in range(l):
                if h32(sx, k, 9990) % 3:
                    cv.set(sx + (k % 3) - 1, sy + k, MT(3) if k % 2 else MT(2))
        # the wheel slot on the east wall: a wet stain, a bracket and the axle stub
        for yy in range(y1 - 34, y1):
            for xx in range(x1 - 14, x1):
                if h32(xx, yy, 9991) % 3 and yy > y1 - 30:
                    c = cv.get(xx, yy)
                    cv.set(xx, yy, K(2) if c in (K(3), K(4), SW(3), SW(4), SW(2)) else cv.get(xx, yy))
        for yy in range(y1 - 24, y1 - 14):
            for xx in range(x1 - 4, x1 + 10):
                k = yy - (y1 - 24)
                cv.set(xx, yy, WD(4) if k < 2 else (WD(3) if k < 7 else WD(1)))
        for xx in range(x1 + 4, x1 + 10):
            cv.set(xx, y1 - 22, MT(3))
            cv.set(xx, y1 - 19, MT(1))
        cv.set(x1 + 9, y1 - 21, MT(4))
        # a hanging sign
        bld.hanging_sign(cv, x0 + 56, y0 + 8, 'bread', w=12, h=10)
        bld.wall_lantern(cv, x0 + 36, y0 + 22)
        # sacks by the door
        sacks = x1_props.flour_sacks()
        cv.blit(sacks, x0 + 62, y1 - 15)
        stone_steps(cv, x0 + 38, y1 - 4, 16, n=1)
    cv, meta = house(7, 4, 3, 'roof_red', style='clay', hip=5, seed=31, wall='stone',
                     door={'x': 40, 'w': 14, 'h': 22},
                     windows=[{'x': 12, 'y': 12, 'w': 9, 'h': 14, 'lit': True, 'arch': True, 'frame': 'stone', 'mullion': False},
                              {'x': 78, 'y': 12, 'w': 9, 'h': 14, 'lit': True, 'arch': True, 'frame': 'stone', 'mullion': False},
                              {'x': 26, 'y': 30, 'w': 7, 'h': 8, 'lit': False}],
                     gable={'cx': 56, 'half': 22}, extras=ext, moss=0.03, base_course=7)
    meta['wheelAt'] = [7, 0]
    return cv, meta


# ====================================================================== the wheel
def mill_wheel(frame, turning):
    """Mill wheel (32 x 48): a wooden overshot wheel facing the viewer, a rim and twelve paddle boards, six spokes, an iron hub;
    below it the stone-lined race. Still: dry, weeds hanging from the paddles, cracked mud in the race. Turning: a stream falls on
    the top from a flume, the race is wet and rippling."""
    cv = Canvas(32, 48)
    cx, cy, R = 15.5, 20.5, 14.0
    rot = math.radians((frame - 1) * 15.0) if turning else 0.0

    # the race: stone-lined channel at the foot (drawn after the wheel's lower part)
    def race():
        blk(cv, 0, 36, 31, 47, K(5), K(3), K(2), K(0))
        for y in range(38, 46):
            for x in range(3, 29):
                if turning:
                    c = WA(1) if (x + y + frame * 2) % 5 else WA(2)
                    if (x * 3 + y * 5 + frame * 3) % 11 == 0:
                        c = WA(4)
                else:
                    c = EA(3) if (x + y) % 4 else EA(2)
                    if (x * 7 + y) % 9 == 0:
                        c = EA(1)
                cv.set(x, y, c)
        for x in range(2, 30):
            cv.set(x, 37, K(5) if x % 5 else K(4))
    # axle bearing and support posts
    for x0 in (1, 28):
        for y in range(10, 38):
            cv.set(x0, y, WD(4))
            cv.set(x0 + 1, y, WD(2))
            cv.set(x0 + 2, y, WD(1))
    # paddles first (outside the rim), 12 of them
    for k in range(12):
        a = rot + k * math.pi / 6
        for r in (13.5, 14.5, 15.5, 16.5):
            x = cx + r * math.cos(a)
            y = cy + r * math.sin(a)
            lit_side = (-math.cos(a) - math.sin(a)) > -0.3
            for dx in (-1, 0, 1):
                for dy in (0, 1):
                    xx, yy = int(round(x)) + dx, int(round(y)) + dy
                    if yy < 37:
                        cv.set(xx, yy, WD(4) if (lit_side and r < 16) else (WD(2) if r < 16 else WD(1)))
    # the rim: two concentric rings, lit top-left
    for y in range(0, 40):
        for x in range(0, 32):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if 10.0 <= d < 13.6:
                a = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
                lit_side = (-math.cos(a) - math.sin(a)) > 0
                if d < 11.0:
                    c = WD(1)
                elif d < 12.4:
                    c = WD(4) if lit_side else WD(3)
                else:
                    c = WD(2) if lit_side else WD(1)
                if y < 37:
                    cv.set(x, y, c)
    # the floor of the buckets between rim and paddles: dark gaps
    # spokes
    for k in range(6):
        a = rot + k * math.pi / 3
        line_px(cv, int(round(cx)), int(round(cy)), int(round(cx + 11 * math.cos(a))), int(round(cy + 11 * math.sin(a))), WD(2))
        line_px(cv, int(round(cx)) + 1, int(round(cy)), int(round(cx + 11 * math.cos(a))) + 1, int(round(cy + 11 * math.sin(a))), WD(3))
    ell(cv, cx, cy, 3.4, 3.4, lambda a, b, d: MT(0) if d > 0.8 else (MT(3) if (-a - b) > 0 else MT(1)))
    cv.set(15, 20, DARK)
    race()
    # the flume and the water
    if turning:
        for x in range(21, 32):
            cv.set(x, 1, WD(4))
            cv.set(x, 2, WD(3))
            cv.set(x, 3, WD(1))
        # a stream falling to the top of the wheel
        for y in range(4, 13):
            x = 25 - (y - 4) // 3
            f = (y + frame * 2) % 5
            cv.set(x, y, WA(4) if f else ICE(2))
            cv.set(x + 1, y, WA(3))
            cv.set(x - 1, y, WA(2))
        for (dx, dy) in ((-2, 12), (3, 12), (-1, 13), (2, 13)):
            if (dx + frame) % 2 == 0:
                cv.set(25 + dx, dy, ICE(2))
        # drips from the paddles on the right and the splash at the bottom
        for k in range(6):
            x = 26 + (k % 3)
            y = 14 + ((frame * 3 + k * 4) % 18)
            if y < 36:
                cv.set(x, y, WA(4))
        for (dx, dy) in ((-3, 0), (3, -1), (0, -1), (5, 0), (-5, -1)):
            if (dx + frame) % 2:
                cv.set(15 + dx, 37 + dy, ICE(2))
    else:
        # dry: a gutter with nothing in it, weeds hanging from the lowest paddles
        for x in range(21, 32):
            cv.set(x, 1, WD(3))
            cv.set(x, 2, WD(1))
        for (x, y) in ((9, 33), (10, 34), (10, 35), (14, 34), (14, 35), (15, 36), (19, 33), (20, 34), (21, 35)):
            cv.set(x, y, RG(2) if (x + y) % 2 else RG(3))
        for (x, y) in ((8, 35), (22, 34), (16, 35)):
            cv.set(x, y, RG(1))
    return cv


# ====================================================================== the culvert arch, the weir and its sluice
def culvert_arch():
    cv = Canvas(48, 48)
    gshadow(cv, 26, 46.5, 22, 2.0, 80)
    # brick wall block around the arch
    for y in range(2, 47):
        for x in range(0, 47):
            v = (y - 2) % 4
            k = ((y - 2) // 4) % 2
            uu = (x + k * 4) % 8
            if v == 3 or uu == 7:
                c = EA(0) if (x + y) % 4 else EA(1)
            else:
                c = RR(2) if (x + y // 4 * 3) % 4 else RR(3)
                if v == 0:
                    c = RR(3)
                if h32(x, y, 9995) % 17 == 0:
                    c = RR(1)
            cv.set(x, y, c)
    for y in range(2, 47):
        cv.set(0, y, EA(0))
        cv.set(46, y, EA(0))
        cv.put(47, y, SH(80))
    # a stone cap and a dark cut for the arch: x 12..35, springing at y 22
    for x in range(0, 48):
        cv.set(x, 2, K(5) if x % 4 else K(4))
        cv.set(x, 3, K(3))
        cv.set(x, 4, K(1))
    cx, top, r = 23.5, 17.0, 12.5
    for y in range(8, 47):
        for x in range(8, 40):
            if y < top:
                inside = (x + 0.5 - cx) ** 2 + (top - y) ** 2 <= (r + 2.2) ** 2
                ring = inside and (x + 0.5 - cx) ** 2 + (top - y) ** 2 > (r - 0.2) ** 2
            else:
                inside = abs(x + 0.5 - cx) <= r + 2.2
                ring = inside and abs(x + 0.5 - cx) > r - 0.2
            if not inside:
                continue
            if ring:
                a = math.atan2(top - y, x + 0.5 - cx)
                seg = int((a + math.pi) / math.pi * 9)
                cv.set(x, y, K(4) if seg % 2 else K(5)) if x < 24 else cv.set(x, y, K(2) if seg % 2 else K(3))
                if y >= top and (y // 3) % 2 == 0:
                    cv.set(x, y, K(3) if x < 24 else K(1))
            else:
                cv.set(x, y, DARK if (x + y) % 4 else SD(1))
    for x in range(11, 37):
        cv.set(x, 46, K(3))
    # the grille, raised a third: bars hanging from the head, a rusted crossbar
    for x in range(12, 36, 3):
        for y in range(10, 25):
            if y < top + 4 or abs(x + 0.5 - cx) < r - 1:
                cv.set(x, y, MT(2) if x < 24 else MT(1))
    for x in range(11, 37):
        cv.set(x, 23, MT(1))
        cv.set(x, 24, RR(2) if x % 3 else MT(0))
    # damp streaks and a fern at the foot, green slime under the arch
    for (x, y, l) in ((9, 8, 18), (38, 6, 22), (20, 4, 6)):
        for k in range(l):
            if h32(x, k, 9996) % 3:
                cv.set(x + (k % 2), y + k, WA(1) if k % 2 else WA(2))
    for (x, y) in ((6, 44), (7, 43), (8, 44), (40, 44), (41, 43), (42, 44), (39, 42)):
        cv.set(x, y, GR(2) if (x + y) % 2 else GR(3))
    cv.set(10, 30, RG(2))
    return cv


def weir_cap(part):
    cv = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            row = y // 8
            lx = (x + row * 5) % 16
            c = K(3) if (lx < 11) == (row == 0) else K(4)
            if y == 0:
                c = K(5)
            elif y == 15:
                c = K(1)
            elif lx in (10, 15) or y == 7:
                c = K(2)
            elif h32(x, y, 10010) % 17 == 0:
                c = RG(2)
            elif h32(x, y, 10011) % 13 == 0:
                c = K(3) if c == K(4) else K(4)
            cv.set(x, y, c)
    if part == 'l':
        for y in range(16):
            cv.set(0, y, K(0))
            cv.set(1, y, K(5) if y % 3 else K(4))
    if part == 'r':
        for y in range(16):
            cv.set(15, y, K(0))
            cv.set(14, y, K(1))
    return cv


def weir_face(part):
    """The face of the dry weir (16 x 32): courses of big stones, the water-line stain, dry weed and slime streaks, a dark drain
    arch (part 'arch'), buttress edge pieces (l, r)."""
    cv = Canvas(16, 32)
    for y in range(32):
        for x in range(16):
            v = y % 8
            k = (y // 8) % 2
            uu = (x + k * 8) % 16
            c = K(3)
            if v == 7 or uu == 15:
                c = K(1)
            elif v == 0:
                c = K(4)
            elif h32(x, y, 10020) % 13 == 0:
                c = K(2)
            # the old waterline: a pale lime crust band at y 6..8 and darker slime below
            if 5 <= y <= 7 and c != K(1):
                c = MT(2) if (x + y) % 2 else K(4)
            elif y > 8 and fade_px(x, y, 0.25 + (y - 8) / 50.0) and c != K(1):
                c = RG(1) if (x * 3 + y) % 5 else RG(2)
            cv.set(x, y, c)
    # dry weed streaks hanging from the waterline
    for x in (2, 6, 11, 14):
        L = 8 + h32(x, 10021) % 10
        for k in range(L):
            cv.set(x + (1 if k % 5 == 4 else 0), 8 + k, PA(1) if k % 2 else EA(3))
    if part == 'arch':
        for y in range(12, 32):
            for x in range(3, 13):
                if y < 18 and (x + 0.5 - 8) ** 2 + (18 - y) ** 2 > 25:
                    continue
                cv.set(x, y, DARK if (x + y) % 3 else SD(1))
        for x in range(2, 14):
            cv.set(x, 11, K(5)) if x % 2 else None
        for y in range(12, 32):
            cv.set(2, y, K(5))
            cv.set(13, y, K(1))
        for x in range(3, 13):
            cv.set(x, 31, EA(2))            # dried mud
    if part == 'l':
        for y in range(32):
            cv.set(0, y, K(0))
            cv.set(1, y, K(5) if y % 3 else K(4))
    if part == 'r':
        for y in range(32):
            cv.set(15, y, K(0))
            cv.set(14, y, K(1))
    return cv


def fade_px(x, y, t):
    return x1_kit.fade(x, y, t)


def sluice_failed():
    cv = Canvas(48, 48)
    gshadow(cv, 26, 46.5, 22, 2.2, 84)
    # the two stone piers
    for (x0, x1) in ((0, 11), (36, 47)):
        blk(cv, x0, 8, x1, 46, K(5), K(3), K(2), K(0))
        for y in range(11, 44, 5):
            for x in range(x0 + 2, x1 - 1):
                cv.set(x, y, K(2) if (x + y) % 3 else K(1))
        for y in range(14, 40, 9):
            cv.set(x0 + 3, y, K(1))
            cv.set(x0 + 7, y + 2, K(1))
        blk(cv, x0 - (1 if x0 else 0), 5, x1 + (0 if x0 else 1), 9, K(5), K(4), K(2), K(0))
    # the dry bed: cracked mud
    for y in range(40, 47):
        for x in range(12, 36):
            cv.set(x, y, EA(3) if (x * 3 + y) % 5 else EA(2))
    for (x, y) in ((16, 43), (17, 44), (22, 42), (23, 43), (29, 44), (30, 45)):
        cv.set(x, y, EA(0))
    # the gate: planks stuck half raised, left side jammed higher, a diagonal tilt
    for x in range(12, 36):
        lift = int((35 - x) * 0.28)
        top = 17 + lift
        bot = 37 + lift
        for y in range(top, bot):
            k = (y - top) % 5
            c = WD(3) if k not in (4,) else WD(1)
            if x in (12, 35):
                c = WD(1)
            elif (x + y // 5) % 11 == 0:
                c = WD(2)
            if k == 0:
                c = WD(4)
            cv.set(x, y, c)
        cv.set(x, bot, WD(0))
        # green slime and wet stains on the lower planks
        if h32(x, 10030) % 2:
            cv.set(x, bot - 1, RG(2))
    # a heavy beam gantry across the top with an iron screw and a hand wheel
    for x in range(1, 47):
        cv.set(x, 6, WD(4))
        cv.set(x, 7, WD(3))
        cv.set(x, 8, WD(1))
    for y in range(8, 28):
        cv.set(23, y, MT(2))
        cv.set(24, y, MT(1))
        if y % 3 == 0:
            cv.set(22, y, MT(3))
    for yy in range(0, 6):
        for xx in range(18, 30):
            d = math.hypot(xx + 0.5 - 24, yy - 0.5)
            if 4.2 <= d < 6.0:
                cv.set(xx, yy, MT(1) if xx < 24 else MT(0))
    cv.set(24, 0, MT(3))
    # rust and a bent bar, a jammed log wedged under the left of the gate
    for (x, y) in ((24, 14), (24, 20), (23, 24), (14, 22), (30, 30), (18, 32)):
        cv.set(x, y, RR(2))
    line_px(cv, 11, 41, 27, 33, WD(2), 3)
    line_px(cv, 11, 40, 27, 32, WD(4), 1)
    cv.set(11, 42, WD(0))
    # a chain hanging slack from the beam
    for y in range(9, 21):
        cv.set(33, y, MT(3) if y % 2 else MT(1))
    return cv


# ====================================================================== the Orrery
def orrery_tower():
    W, H = 96, 112
    cv = Canvas(W, H)
    gshadow(cv, 46, 108, 38, 3.4, 90)
    # the drum: x 6..74, y 46..108, ashlar with a night-blue band of stars
    xl, xr, y0, y1 = 6, 74, 46, 108
    for y in range(y0, y1):
        for x in range(xl, xr):
            u = (x + 0.5 - (xl + xr) / 2) / ((xr - xl) / 2)
            c = x1_kit.ashlar(x, y, y0, 8500, c1=K(1), c2=K(2), c3=K(3), c4=K(4))
            if 70 <= y <= 77:
                if y in (70, 77):
                    c = GD(2) if x % 2 == 0 else GD(1)
                else:
                    c = IK(1) if y in (71, 76) else IK(2)
                    if (x + 3) % 9 == 0 and y == 73:
                        c = ICE(3)
                    elif (x + 3) % 9 in (1, 8) and y == 73:
                        c = IK(4)
                    elif (x + 3) % 9 == 0 and y in (72, 74):
                        c = ICE(1)
            # roundness: lit on the left, shaded on the right
            if u < -0.55:
                c = kshift(c, 1)
            if u > 0.3:
                c = kshift(c, -1)
            if u > 0.68:
                c = kshift(c, -1)
            cv.set(x, y, c)
    for y in range(y0, y1):
        cv.set(xl, y, K(0))
        cv.set(xr - 1, y, K(0))
        cv.put(xr, y, SH(90))
        cv.put(xr + 1, y, SH(60))
        cv.put(xr + 2, y, SH(30))
    # plinth and steps
    for x in range(xl - 2, xr + 2):
        cv.set(x, 104, K(5))
        cv.set(x, 105, K(3))
        cv.set(x, 106, K(2))
        cv.set(x, 107, K(1))
    stone_steps(cv, 32, 106, 16, n=2, ramp='stone_cool')
    # the door
    bld.door(cv, 33, 83, w=14, h=23, arch=True, frame='stone')
    # two arched slit windows, lit
    for wx in (14, 56):
        bld.window(cv, wx, 54, 7, 14, lit=True, arch=True, frame='stone', mullion=False)
    # the gallery under the dome: a cornice and a balustrade
    for x in range(xl - 4, xr + 4):
        cv.set(x, 44, K(5))
        cv.set(x, 45, K(3))
        cv.set(x, 46, K(1))
    for x in range(xl - 3, xr + 3, 5):
        for y in range(40, 44):
            cv.set(x, y, K(4) if x < 40 else K(2))
            cv.set(x + 1, y, K(3) if x < 40 else K(1))
    for x in range(xl - 3, xr + 3):
        cv.set(x, 39, K(5))
        cv.set(x, 40, K(2))
    # the dome: brass, ribbed, with an observing slit
    cx, cy, rx, ry = 40.0, 40.0, 33.0, 31.0
    for y in range(6, 40):
        for x in range(0, 82):
            nx = (x + 0.5 - cx) / rx
            ny = (y + 0.5 - cy) / ry
            if nx * nx + ny * ny > 1.0:
                continue
            nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
            t = -0.5 * nx - 0.6 * ny + 0.62 * nz
            lon = math.degrees(math.asin(max(-1.0, min(1.0, nx / max(0.12, math.sqrt(max(0.0, 1 - ny * ny)))))))
            edge = nx * nx + ny * ny > 0.93
            if edge:
                cv.set(x, y, GD(0))
                continue
            if t > 0.92:
                c = GD(5)
            elif t > 0.62:
                c = GD(4)
            elif t > 0.30:
                c = GD(3)
            elif t > 0.0:
                c = GD(2)
            else:
                c = GD(1)
            if abs(((lon + 90) % 20) - 10) > 8.6 and ny > -0.9:
                c = GD(1) if c != GD(1) else GD(0)
            if (x + y) % 11 == 0 and c in (GD(3), GD(2)):
                c = GD(4)
            # the observing slit: a dark strip with a sliding shutter, sky inside
            if abs(lon + 1) < 4.2 and -0.88 < ny < 0.05:
                c = IK(1) if abs(lon + 1) > 3.0 else (IK(2) if (x + y) % 2 else IK(1))
                if (x * 5 + y * 3) % 17 == 0:
                    c = ICE(3)
            cv.set(x, y, c)
    for y in range(8, 36):
        nx = 0
        cv.set(37, y, GD(1))
        cv.set(43, y, GD(0))
    # a finial: a small ring and a star on a spike
    for y in range(0, 7):
        cv.set(40, y, GD(3))
    cv.set(39, 0, GD(5))
    cv.set(41, 0, GD(5))
    cv.set(40, 1, ICE(3))
    for k in range(10):
        a = k / 10 * 2 * math.pi
        cv.set(int(40 + 3 * math.cos(a)), int(4 + 2 * math.sin(a)), GD(4) if k < 5 else GD(2))
    meta = {'rect_wh': [W, H], 'anchor': [0, 6], 'footprint': [[x, dy] for dy in (-1, 0) for x in range(5) if not (dy == 0 and x == 2)],
            'overheadRows': 5, 'doorAt': [2, 0], 'collision': 'solid'}
    return cv, meta


# ====================================================================== the Watchtower
def watchtower():
    W, H = 80, 144
    cv = Canvas(W, H)
    gshadow(cv, 36, 140, 30, 3.0, 90)
    xl, xr = 6, 58
    # broken top: a jagged line, deeper on one side where a wall has fallen
    def top_y(x):
        u = (x - xl) / float(xr - xl)
        base = 14 + int(u * 32)
        return (base // 3) * 3 + (h32(x // 3, 10040) % 2) * 2
    for x in range(xl, xr):
        for y in range(top_y(x), 138):
            u = (x + 0.5 - (xl + xr) / 2) / ((xr - xl) / 2)
            c = x1_kit.ashlar(x, y, 28, 8600, c1=K(1), c2=K(2), c3=K(3), c4=K(4), course=7)
            if u < -0.5:
                c = kshift(c, 1)
            if u > 0.3:
                c = kshift(c, -1)
            if u > 0.65:
                c = kshift(c, -1)
            cv.set(x, y, c)
    for y in range(40, 138):
        cv.set(xl, y, K(0))
        cv.set(xr - 1, y, K(0))
        cv.put(xr, y, SH(90))
        cv.put(xr + 1, y, SH(60))
        cv.put(xr + 2, y, SH(30))
    # the jagged top edge is outlined, the broken inner face is dark
    for x in range(xl, xr):
        ty = top_y(x)
        cv.set(x, ty, K(5) if x < 32 else K(2))
        cv.set(x, ty + 1, K(4) if x < 32 else K(1))
    # corbel band, a belt of cut stone
    for x in range(xl - 1, xr + 1):
        cv.set(x, 60, K(5))
        cv.set(x, 61, K(3))
        cv.set(x, 62, K(1))
    # windows: two slits, the upper one lit (the Keeper's mark star, third of three), the lower one dark
    for (wx, wy, lit_) in ((14, 36, True), (28, 80, False), (14, 104, False), (42, 104, False)):
        bld.window(cv, wx, wy, 6, 15, lit=lit_, arch=True, frame='stone', mullion=False)
    # ivy up the left side
    for y in range(66, 138):
        for x in range(xl + 1, xl + 5 + (y % 5 == 0) + int(3 * math.sin(y * 0.2) + 3)):
            if h32(x, y, 10041) % 3:
                cv.set(x, y, RG(2) if (x + y) % 3 else (RG(3) if (x * y) % 5 else RG(1)))
    # a stout door in the base, barred
    bld.door(cv, 25, 119, w=14, h=18, arch=True, frame='stone')
    stone_steps(cv, 23, 136, 18, n=1, ramp='stone_cool')
    # rubble and fallen blocks at the foot
    for (x, y, w, h) in ((2, 134, 8, 5), (60, 136, 7, 4), (50, 138, 6, 3), (-1, 138, 5, 3)):
        blk(cv, max(0, x), y, x + w, y + h, K(5), K(3), K(2), K(0))
    for x in range(0, 80, 3):
        if h32(x, 10042) % 3 == 0:
            tuft(cv, x + 2, 140, GR(3), GR(2))
    meta = {'rect_wh': [W, H], 'anchor': [0, 8], 'footprint': [[x, dy] for dy in (-1, 0) for x in range(4)],
            'overheadRows': 7, 'doorAt': None, 'collision': 'solid'}
    return cv, meta


# ====================================================================== Odo's turf hut
def turf_hut():
    W, H = 80, 64
    cv = Canvas(W, H)
    gshadow(cv, 36, 61.5, 31, 2.8, 84)
    # the roof: a low dome of turf over a stone drum
    cx, base_y = 32.0, 40.0
    rx, ry = 31.0, 26.0
    for y in range(8, 42):
        for x in range(0, 66):
            nx = (x + 0.5 - cx) / rx
            ny = (y + 0.5 - base_y) / ry
            if ny > 0 or abs(nx) ** 2.4 + abs(ny) ** 2.0 > 1.0:
                continue
            t = -0.5 * nx - 0.9 * ny
            n = h32(x, y, 10050) % 17
            edge = abs(nx) ** 2.4 + abs(ny) ** 2.0 > 0.9
            if edge:
                c = FD(0)
            elif t > 0.55:
                c = GR(3) if n > 2 else GR(4)
            elif t > 0.25:
                c = GR(2) if n > 1 else GR(3)
            elif t > -0.1:
                c = RG(2) if n > 3 else GR(1)
            else:
                c = RG(1) if n > 2 else FD(1)
            if n == 4:
                c = SA(2) if t > 0.3 else PA(1)           # dry grass tufts
            cv.set(x, y, c)
    # a smoke hole with a chimney pot of stone, smoke
    blk(cv, 40, 3, 47, 14, K(5), K(3), K(2), K(0))
    for x in range(41, 47):
        cv.set(x, 3, DARK)
    for i, (dx, dy) in enumerate([(2, -2), (3, -4), (2, -6), (4, -8)]):
        cv.put(42 + dx, 3 + dy, MT(3) if False else (C('metal', 3)[0], C('metal', 3)[1], C('metal', 3)[2], 150 - i * 25))
    # the stone drum and the wall
    for y in range(40, 60):
        for x in range(2, 64):
            c = x1_kit.ashlar(x, y, 40, 8700, c1=K(1), c2=K(2), c3=K(3), c4=K(4), course=5)
            if x > 50:
                c = kshift(c, -1)
            cv.set(x, y, c)
    for x in range(2, 64):
        cv.set(x, 59, K(1))
        cv.set(x, 40, FD(0))
    for y in range(40, 60):
        cv.set(2, y, K(0))
        cv.set(63, y, K(0))
        cv.put(64, y, SH(90))
        cv.put(65, y, SH(50))
    # the door (x 18..31), the window (x 40..51)
    bld.door(cv, 18, 41, w=13, h=18, arch=True, frame='stone')
    bld.window(cv, 40, 44, 11, 9, lit=True, shutters='roof_green')
    # a hanging chime by the door, a bundle of dried herbs, a log pile
    for y in range(44, 52):
        cv.set(34, y, SA(1))
    for dx, ln in ((0, 5), (2, 7), (4, 4)):
        for y in range(52, 52 + ln):
            cv.set(33 + dx, y, WD(4) if dx == 0 else WD(3))
    for x in range(4, 14):
        for y in range(54, 59):
            cv.set(x, y, WD(3) if (x + y) % 4 else WD(2))
    for k in range(3):
        ell(cv, 6 + k * 3, 56, 1.8, 2.2, lambda a, b, d: SA(2) if d < 0.4 else WD(4))
    for (x, y) in ((60, 55), (61, 56), (60, 57)):
        cv.set(x, y, GR(3))
    stone_steps(cv, 17, 59, 15, n=1)
    meta = {'rect_wh': [W, H], 'anchor': [0, 3], 'footprint': [[x, dy] for dy in (-1, 0) for x in range(4) if not (dy == 0 and x == 1)],
            'overheadRows': 2, 'doorAt': [1, 0], 'collision': 'solid'}
    return cv, meta


# ====================================================================== the Windmill
def windmill(frame):
    W, H = 128, 144
    cv = Canvas(W, H)
    gshadow(cv, 66, 140, 34, 3.2, 90)
    hx, hy = 64, 54
    # the tower: whitewashed, tapering from 56 wide at the foot to 38 at the shoulder
    for y in range(58, 140):
        t = (y - 58) / 82.0
        half = 19 + 9 * t
        for x in range(int(hx - half), int(hx + half)):
            u = (x + 0.5 - hx) / half
            n = h32(x // 2, y // 2, 10060) % 9
            c = MT(4) if u < -0.3 else (MT(3) if u < 0.25 else (MT(2) if u < 0.65 else MT(1)))
            if n == 0:
                c = MT(3) if c == MT(4) else c
            if y % 9 == 8 and n > 2:
                c = MT(2) if u < 0.3 else MT(1)           # whitewash courses
            if x == int(hx - half) or x == int(hx + half) - 1:
                c = K(1)
            if y > 129:
                c = K(4) if u < 0.2 else K(2)               # the stone plinth
                if y % 5 == 4:
                    c = K(1)
            cv.set(x, y, c)
        cv.put(int(hx + half), y, SH(90))
        cv.put(int(hx + half) + 1, y, SH(60))
        cv.put(int(hx + half) + 2, y, SH(30))
    # door, two small windows, a balcony of planks round the shoulder
    bld.door(cv, 57, 112, w=14, h=18, arch=True, frame='stone')
    stone_steps(cv, 55, 129, 18, n=1)
    bld.window(cv, 60, 82, 8, 11, lit=True, arch=True, frame='stone', mullion=False)
    for x in range(int(hx - 25), int(hx + 25)):
        cv.set(x, 68, WD(4))
        cv.set(x, 69, WD(2))
        cv.set(x, 70, WD(1))
        if x % 4 == 0:
            for y in range(63, 68):
                cv.set(x, y, WD(3))
    # the cap: a boat-shaped shingled dome with a tail pole
    for y in range(34, 60):
        t = (y - 34) / 25.0
        half = 6 + 22 * math.sin(min(1.0, t * 1.15) * math.pi / 2) ** 0.8
        if t > 0.95:
            half = 24
        for x in range(int(hx - half), int(hx + half) + 1):
            u = (x - hx) / max(half, 1)
            c = RR(4) if u < -0.35 else (RR(3) if u < 0.2 else (RR(2) if u < 0.6 else RR(1)))
            if (y + (x // 4) * 2) % 5 == 0:
                c = RR(1) if u > -0.2 else RR(2)
            if x in (int(hx - half), int(hx + half)):
                c = RR(0)
            cv.set(x, y, c)
    for x in range(int(hx - 25), int(hx + 26)):
        cv.set(x, 58, RR(0))
        cv.set(x, 59, WD(1))
    cv.set(hx, 33, GD(4))
    cv.set(hx, 32, GD(5))
    # the sails: four stocks with latticed cloth frames, rotated by frame*30 degrees
    rot = math.radians(frame * 30.0 + 12.0)
    for k in range(4):
        a = rot + k * math.pi / 2
        ca, sa_ = math.cos(a), math.sin(a)
        # the stock (the long timber), two px thick
        for r in range(4, 54):
            x = hx + r * ca
            y = hy + r * sa_
            cv.set(int(round(x)), int(round(y)), WD(3))
            cv.set(int(round(x + sa_)), int(round(y - ca)), WD(1))
        # the sail frame on the trailing side of the stock: a lattice of cloth between two rails
        for r in range(12, 52):
            for w in range(2, 10):
                px = hx + r * ca - w * sa_
                py = hy + r * sa_ + w * ca
                xx, yy = int(round(px)), int(round(py))
                rail = w in (2, 9) or r in (12, 51) or ((r - 12) % 8 == 0)
                lit_side = (-ca - sa_) * 0.0 + (-math.cos(a) - math.sin(a)) > 0
                if rail:
                    c = WD(3) if (r + w) % 2 == 0 else WD(2)
                else:
                    c = MT(4) if (w + (r // 4)) % 2 == 0 else MT(3)
                    if (r + w * 3) % 7 == 0:
                        c = MT(2)
                cv.set(xx, yy, c)
    # the hub, drawn last
    ell(cv, hx, hy, 4.5, 4.5, lambda a, b, d: MT(0) if d > 0.8 else (GD(4) if (-a - b) > 0.1 else GD(2)))
    cv.set(hx, hy, DARK)
    meta = {'rect_wh': [W, H], 'anchor': [0, 8], 'footprint': [[x, dy] for dy in (-1, 0) for x in range(2, 6)],
            'overheadRows': 7, 'doorAt': None, 'collision': 'solid'}
    return cv, meta


# ====================================================================== assembly
def build_into(sh):
    sh.meta.setdefault('objects', {})
    sh.meta.setdefault('tiles', {})
    cv, meta = mill_building()
    pack_prefab(sh, 'x1_mill_building', cv, meta, "Hal's Mill (7 tiles wide); wheelAt (7,0) is the tile for x1_mill_wheel's anchor")
    frames = [mill_wheel(0, False)] + [mill_wheel(k, True) for k in range(1, 5)]
    w = 32
    add_obj(sh, 'x1_mill_wheel', frames, [0, 2], [[0, 0], [1, 0]], overhead=2, states=True,
            turnAnim={'frames': [1, 2, 3, 4], 'frameDx': w, 'ms': 120},
            note='the mill wheel: frames by state 0 = still and dry, 1..4 = turning (turnAnim); placed at the mill\'s wheelAt')
    add_obj(sh, 'x1_culvert_arch', culvert_arch(), [0, 2], [[0, -1], [1, -1], [2, -1], [0, 0], [2, 0]], overhead=1, door=[1, 0], kind='door',
            note='the brick arch under the weir (48 x 48): put the door event on doorAt (1,0)')
    for part in ('l', 'm', 'r'):
        add_tile(sh, 'x1_weir_cap_' + part, weir_cap(part), collision='none', note='the walkway along the top of the dry weir')
    for part in ('l', 'm', 'r', 'arch'):
        add_tile(sh, 'x1_weir_face_' + part, weir_face(part), collision='solid',
                 note='the face of the dry weir (16 x 32, two rows); arch = a dark dry drain mouth')
    add_obj(sh, 'x1_sluice_failed', sluice_failed(), [0, 2], [[0, 0], [1, 0], [2, 0]], note='the failed sluice gate of the weir (48 x 48, 3 tiles)')
    cv, meta = orrery_tower()
    pack_prefab(sh, 'x1_orrery_tower', cv, meta, "the Keepers' Orrery: a drum tower under a brass dome (doorAt (2,0))")
    cv, meta = watchtower()
    pack_prefab(sh, 'x1_watchtower', cv, meta, "the ruined Keepers' Watchtower on the High Moor (80 x 144, 4 tiles at the foot)")
    cv, meta = turf_hut()
    pack_prefab(sh, 'x1_turf_hut', cv, meta, "Odo's turf hut (doorAt (1,0))")
    # the windmill: three sail frames
    fr = [windmill(i) for i in range(3)]
    meta = windmill(0)[1]
    strip = strip_frames([f[0] for f in fr])
    x, y = sh.alloc(strip.w, strip.h)
    sh.cv.paste(strip, x, y)
    m = {'rect': [x, y, 128, 144], 'kind': 'building', 'anchor': meta['anchor'], 'footprint': meta['footprint'],
         'overheadRows': meta['overheadRows'], 'doorAt': None, 'collision': 'solid',
         'anim': {'frames': [0, 1, 2], 'frameDx': 128, 'ms': 380},
         'note': "Larchhill's Windmill: the sails turn through three frames (anim); a ladder object stands at its foot"}
    sh.meta['objects']['x1_windmill'] = m
    sh.newline()
