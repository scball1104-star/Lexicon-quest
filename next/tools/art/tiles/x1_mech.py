"""Mechanisms, doors and interior pieces for the three dungeons and the four interiors (EXPANSION1_PLAN 4.2 to 4.9, 10.1).

  x1_slab (+ x1_slab_doorway)      the sliding slab: a shelf skin (32 x 32, slides over positions) and the doorway it closes, 96 x 32
                                   with a rail pocket either side (put it so the doorway sits on the corridor's wall cells)
  x1_gate_culvert_{closed,open}    barred iron gate in the brick (32 x 32 door pair, like door_locked_*)
  x1_gate_barrow_{closed,open}     iron-bound oak hurdle gate in the barrow stone (32 x 32 door pair)
  x1_drain_grate, x1_drain_grate_b grates over a drain, floor tiles (walkable)
  x1_star_plate                    the brass star plate in the Orrery wall (32 x 32, an Appraise target)
  x1_hatch_{closed,open}           the Orrery trapdoor (16 x 16 door)
  x1_armillary                     the great armillary: frames 0 = three stars dark, 1 = aligned
  x1_hearth                        Thornfold's hearth font (48 x 48, animated), for thornfold_hearth
  x1_niche_lettered/_blank/_lit    16 x 32 face overlays for the Reeve's hall niches (twelve lettered, one blank)
  x1_sampler                       the framed sampler in the Loom House (frames 0 = thread gone pale, 1 = names dark again)
  interiors: x1_loom, x1_spinning_wheel, x1_wool_bales, x1_wool_shelf, x1_millstones, x1_hopper, x1_flour_bin, x1_flour_table,
             x1_drafting_desk, x1_telescope, x1_loft_ladder
"""
import math
from pxlib import Canvas, C, SH, DARK, rnd, h32
from x1_draw import *
import x1_kit


# ====================================================================== the sliding slab
def slab():
    cv = Canvas(32, 32)
    # a slab set flush in the wall plane: dark green-grey granite, lit bevel, a carved double ring, rail clips top and bottom
    blk(cv, 0, 2, 31, 30, K(4), K(3), K(2), K(0))
    for y in range(4, 29):
        for x in range(2, 30):
            n = h32(x, y, 9700) % 23
            if n == 0:
                cv.set(x, y, K(4))
            elif n == 1:
                cv.set(x, y, K(2))
    for y in range(3, 30):
        cv.set(1, y, K(5) if y % 5 else K(4))
    for x in range(1, 31):
        cv.set(x, 3, K(5) if x % 6 else K(4))
    # the carved ring (a barrow-wight's mark): two rings and a dot, cut in dark with a lit lower lip
    for y in range(6, 28):
        for x in range(8, 24):
            d = math.hypot(x - 15.5, y - 16.5)
            if 5.2 <= d < 6.2:
                cv.set(x, y, K(1))
            elif 6.2 <= d < 7.0 and y > 16:
                cv.set(x, y, K(4))
            elif 8.6 <= d < 9.4:
                cv.set(x, y, K(1) if (x + y) % 5 else K(2))
            elif 9.4 <= d < 10.0 and y > 16:
                cv.set(x, y, K(4))
    cv.set(15, 16, K(1))
    cv.set(16, 16, K(1))
    cv.set(15, 17, K(1))
    cv.set(16, 17, K(1))
    # moss low on the slab, a hand-hold notch on the right edge
    for x in range(2, 30):
        if h32(x, 9701) % 3 == 0:
            cv.set(x, 29, RG(2))
        if h32(x, 9702) % 4 == 0:
            cv.set(x, 28, RG(3))
    for y in range(14, 20):
        cv.set(28, y, K(1))
        cv.set(29, y, K(0))
    # iron rail clips
    for x in (4, 12, 20, 27):
        for dy in range(2):
            cv.set(x, 0 + dy, MT(1))
            cv.set(x + 1, 0 + dy, MT(2))
        cv.set(x, 31, MT(1))
    return cv


def slab_doorway():
    """The doorway of the sliding slab (96 x 32 = 6 x 2 tiles): wall courses, a dark doorway of two tiles in the middle under
    a lintel with a ring, a lit step, and a rail pocket on either side (a groove top and bottom, an iron stop) where the slab
    waits when it is open. The wall is the Barrow's plain ashlar so it joins the face either side."""
    cv = Canvas(96, 32)
    face = x1_kit.BarrowFaceMoss()
    plain = x1_kit.BarrowFace()
    plain.niche = False
    for y in range(32):
        for x in range(96):
            cv.set(x, y, plain.at(x % 16, y))
    # the pockets: dark grooves at the top and the bottom of each, iron stops at the far ends
    for (x0, x1) in ((1, 30), (65, 94)):
        for x in range(x0, x1 + 1):
            cv.set(x, 8, K(0))
            cv.set(x, 9, K(1))
            cv.set(x, 28, K(0))
            cv.set(x, 27, K(1))
            if x % 6 == 0:
                cv.set(x, 7, MT(1))
                cv.set(x, 29, MT(1))
    for x in (1, 94):
        for y in range(7, 30):
            cv.set(x, y, MT(1) if y % 4 else MT(2))
    # the doorway x 36..59, y 6..31
    for y in range(6, 32):
        for x in range(36, 60):
            f = (y - 6) / 25.0
            c = DARK if (x + y) % 5 else SD(1)
            if y > 24:
                c = SD(1) if (x + y) % 2 else SD(2)
            cv.set(x, y, c)
    for y in range(6, 32):
        for x in (34, 35, 60, 61):
            cv.set(x, y, K(4) if x in (34, 60) else (K(5) if x == 35 else K(1)))
    blk(cv, 32, 2, 63, 8, K(5), K(4), K(2), K(0))
    for y in range(3, 8):
        for x in range(33, 63):
            d = math.hypot(x - 47.5, y - 5.5)
            if 1.8 <= d < 2.6:
                cv.set(x, y, K(1))
    # a lit threshold step and a cold glint from inside
    for x in range(36, 60):
        cv.set(x, 30, K(3))
        cv.set(x, 31, K(2))
    for (x, y) in ((47, 18), (48, 18), (47, 19)):
        cv.set(x, y, IK(2))
    return cv


# ====================================================================== gates
def gate_culvert(open_):
    cv = Canvas(32, 32)
    # a brick arch in the face, an iron grille in it
    for y in range(0, 32):
        for x in range(0, 32):
            cx = 15.5
            top = 9.0
            r = 13.0
            if y < top:
                inside = (x + 0.5 - cx) ** 2 + (top - y) ** 2 <= (r + 1.2) ** 2
            else:
                inside = abs(x + 0.5 - cx) <= r + 1.2
            if not inside:
                continue
            ring = (y < top and (x + 0.5 - cx) ** 2 + (top - y) ** 2 > (r - 1.0) ** 2) or (y >= top and abs(x + 0.5 - cx) > r - 1.0)
            if ring:
                cv.set(x, y, K(4) if x < 16 else K(2))
                continue
            if open_:
                cv.set(x, y, DARK if (x + y) % 4 else SD(1))
            else:
                cv.set(x, y, DARK if y > 5 else SD(1))
    if not open_:
        for x in range(5, 27, 3):
            top = 7 + int(abs(x - 15.5) * 0.35)
            for y in range(top, 31):
                cv.set(x, y, MT(2) if x < 16 else MT(1))
                cv.set(x + 1, y, MT(1))
        for y in (14, 24):
            for x in range(3, 29):
                cv.set(x, y, MT(1))
                cv.set(x, y + 1, SD(0))
        for (x, y) in ((8, 19), (9, 20), (20, 17), (21, 22), (14, 27)):
            cv.set(x, y, RR(2))        # rust
        cv.set(15, 12, GD(3))
        cv.set(16, 12, GD(2))          # a lock plate
    else:
        # the grille is raised: the bars stand in the arch's head like teeth
        for x in range(5, 27, 3):
            for y in range(4, 9 + int(abs(x - 15.5) * -0.1)):
                cv.set(x, y, MT(2) if x < 16 else MT(1))
        for y in range(14, 30):
            cv.set(6, y, SD(1))
            cv.set(25, y, SD(1))
        for x in range(8, 24):
            cv.set(x, 30, K(3))
            cv.set(x, 31, K(2))
    return cv


def gate_barrow(open_):
    cv = Canvas(32, 32)
    # two uprights and a lintel of barrow stone; between them a hurdle of iron-bound oak bars
    blk(cv, 0, 0, 5, 31, K(4), K(3), K(2), K(0))
    blk(cv, 26, 0, 31, 31, K(4), K(3), K(2), K(0))
    blk(cv, 0, 0, 31, 5, K(5), K(4), K(2), K(0))
    for y in range(6, 32):
        for x in range(6, 26):
            cv.set(x, y, DARK if (x + y) % 5 else SD(1))
    for x in range(6, 26):
        cv.set(x, 5, RG(2) if x % 3 else RG(1))
    if not open_:
        for x in (8, 12, 16, 20, 24 - 1):
            for y in range(6, 31):
                cv.set(x, y, WD(4) if x < 16 else WD(3))
                cv.set(x + 1, y, WD(2))
                cv.set(x + 2, y, WD(1)) if x + 2 < 25 else None
        for y in (11, 24):
            for x in range(6, 26):
                cv.set(x, y, MT(1))
                cv.set(x, y + 1, MT(0))
            for x in (9, 13, 17, 21):
                cv.set(x, y, MT(3))
        for y in range(27, 31):
            for x in (10, 14, 18):
                cv.set(x, y, RG(2))
    else:
        for x in (8, 12, 16, 20, 23):
            for y in range(6, 11):
                cv.set(x, y, WD(4) if x < 16 else WD(3))
                cv.set(x + 1, y, WD(2))
        for x in range(8, 24):
            cv.set(x, 30, K(3))
            cv.set(x, 31, K(2))
    return cv


def drain_grate(variant):
    cv = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            if x in (0, 15) or y in (0, 15):
                cv.set(x, y, K(2) if x == 15 or y == 15 else K(4))
            elif x in (1, 14) or y in (1, 14):
                cv.set(x, y, K(3) if x == 14 or y == 14 else K(5))
            else:
                cv.set(x, y, WA(0) if (x + y) % 3 else IK(1))
    for x in range(3, 14, 3):
        for y in range(2, 14):
            cv.set(x, y, K(4) if variant == 0 or y % 5 else RR(2))
            cv.set(x + 1, y, K(2))
    for y in (7, 8):
        for x in range(2, 14):
            if cv.get(x, y) == WA(0) or cv.get(x, y) == IK(1):
                cv.set(x, y, WA(2) if (x + y) % 2 else WA(1))
    if variant == 1:
        for (x, y) in ((6, 4), (7, 5), (6, 6), (10, 9), (9, 10)):
            cv.set(x, y, RR(2))
        for x in range(4, 8):
            cv.set(x, 11, DARK)         # a broken bar
    return cv


# ====================================================================== the Orrery
def star_plate():
    """The brass star plate (32 x 32): a bronze plate on the wall, a star chart in relief (a big star, a ring of small ones),
    rivets, and a hairline seam round a drawer."""
    cv = Canvas(32, 32)
    blk(cv, 1, 1, 30, 30, GD(4), GD(2), GD(1), GD(0))
    for y in range(2, 30):
        for x in range(2, 30):
            n = h32(x, y, 9710) % 19
            if n == 0:
                cv.set(x, y, GD(3))
            elif n == 1:
                cv.set(x, y, GD(1))
    # seam of the hidden drawer
    for x in range(6, 26):
        cv.set(x, 22, GD(0))
        cv.set(x, 27, GD(0))
    for y in range(22, 28):
        cv.set(6, y, GD(0))
        cv.set(25, y, GD(0))
    cv.set(15, 24, GD(4))
    cv.set(16, 24, GD(4))
    # the chart: a ring and nine stars joined by hairlines, one big
    for y in range(3, 21):
        for x in range(4, 28):
            d = math.hypot(x - 15.5, y - 11.5)
            if 7.2 <= d < 8.0:
                cv.set(x, y, GD(1) if y > 11 else GD(4))
    stars = [(15, 6, 2), (10, 9, 1), (21, 9, 1), (8, 14, 1), (23, 14, 1), (12, 16, 1), (19, 17, 1), (15, 11, 0)]
    for (x, y, big) in stars:
        cv.set(x, y, GD(5))
        if big == 2:
            for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                cv.set(x + dx, y + dy, GD(4))
        cv.set(x + 1, y + 1, GD(0))
    for (a, b) in (((15, 6), (10, 9)), ((15, 6), (21, 9)), ((10, 9), (8, 14)), ((21, 9), (23, 14)), ((12, 16), (19, 17))):
        line_px(cv, a[0], a[1], b[0], b[1], GD(1))
    for (x, y) in ((3, 3), (28, 3), (3, 28), (28, 28)):
        cv.set(x, y, GD(5))
        cv.set(x + 1, y + 1, GD(0))
    return cv


def hatch(open_):
    cv = Canvas(16, 16)
    # a trapdoor in the floor: a frame of boards, a ring, a lock plate; open: a stair going down into the dark
    for y in range(16):
        for x in range(16):
            if x in (0, 15) or y in (0, 15):
                cv.set(x, y, WD(1))
            elif x in (1, 14) or y in (1, 14):
                cv.set(x, y, WD(4) if x == 1 or y == 1 else WD(2))
            else:
                if open_:
                    cv.set(x, y, DARK)
                else:
                    cv.set(x, y, WD(3) if (x // 4) % 2 == 0 else WD(2))
    if not open_:
        for x in range(2, 14):
            cv.set(x, 5, WD(1))
            cv.set(x, 10, WD(1))
        for (x, y) in ((7, 7), (8, 7), (6, 8), (9, 8), (6, 9), (9, 9), (7, 10), (8, 10)):
            cv.set(x, y, MT(2) if (x + y) % 2 else MT(1))
        cv.set(7, 8, DARK)
        cv.set(8, 8, DARK)
        cv.set(12, 3, MT(3))
        cv.set(12, 4, MT(1))
    else:
        for k in range(4):
            y = 3 + k * 3
            for x in range(3, 13):
                cv.set(x, y, K(4) if k < 3 else SD(2))
                cv.set(x, y + 1, K(2) if k < 3 else SD(1))
        cv.set(2, 2, WD(5))
    return cv


def armillary(state):
    """The great armillary (48 x 64: 3 tiles wide, 4 tall; footprint the 2-tile pedestal): a stone pedestal with three star
    sockets, three brass rings round a pale core. State 0 = the stars dark, rings dull; 1 = aligned: sockets lit, rings bright,
    the core shining."""
    cv = Canvas(48, 64)
    gshadow(cv, 26, 61.5, 20, 2.6, 90)
    # pedestal
    blk(cv, 11, 44, 36, 62, K(5), K(4), K(2), K(0))
    for x in range(12, 36):
        cv.set(x, 46, K(3))
    blk(cv, 8, 58, 39, 62, K(5), K(3), K(1), K(0))
    # three sockets on the pedestal face
    for i, x in enumerate((17, 23, 29)):
        for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1)):
            cv.set(x + dx, 51 + dy, IK(1))
        if state:
            cv.set(x, 51, GD(5))
            cv.set(x + 1, 51, GD(4))
            cv.set(x, 52, GD(4))
            cv.set(x + 1, 52, GD(3))
            for (dx, dy) in ((-1, 0), (2, 0), (0, -1), (1, -1)):
                cv.put(x + dx, 51 + dy, (GD(4)[0], GD(4)[1], GD(4)[2], 120))
        else:
            cv.set(x, 51, IK(3))
        cv.set(x - 1, 50, K(4))
        cv.set(x + 2, 53, K(2))
    # the stem and the rings
    for y in range(36, 45):
        cv.set(23, y, GD(2))
        cv.set(24, y, GD(3))
        cv.set(25, y, GD(1))
    cx, cy = 24, 24
    def draw_ring(rx, ry, rot, tone):
        pts = []
        for k in range(120):
            a = k / 120 * 2 * math.pi
            x = rx * math.cos(a)
            y = ry * math.sin(a)
            xr = x * math.cos(rot) - y * math.sin(rot)
            yr = x * math.sin(rot) + y * math.cos(rot)
            pts.append((cx + xr, cy + yr, a))
        for (px, py, a) in pts:
            lit_side = (-math.cos(a - rot) - math.sin(a - rot)) > 0
            for t in range(2):
                c = [GD(4), GD(3)][t] if lit_side else [GD(2), GD(1)][t]
                if not state:
                    c = [GD(3), GD(2)][t] if lit_side else [GD(1), GD(0)][t]
                cv.set(int(round(px)), int(round(py)) + t, c)
    draw_ring(17, 17, 0.0, 0)
    draw_ring(17, 6, 0.0, 1)
    draw_ring(6.5, 17, 0.0, 2)
    draw_ring(17, 8, math.pi / 5, 4)
    # the core
    ell(cv, cx, cy, 4, 4, lambda dx, dy, d: (ICE(3) if state else ICE(0)) if d < 0.45 else (CY(3) if state else IK(3)) if d < 0.8 else (CY(1) if state else IK(1)))
    if state:
        for k in range(8):
            a = k / 8 * 2 * math.pi
            cv.set(int(cx + 7 * math.cos(a)), int(cy + 7 * math.sin(a)), ICE(2))
        for (x, y) in ((8, 14), (40, 30), (12, 36), (36, 10)):
            cv.set(x, y, GD(5))
    return cv


# ====================================================================== the hearth
def hearth(frame):
    """Thornfold's hearth (48 x 48): a fieldstone chimney breast, a deep fire with an iron kettle on a crane, a mantel with
    a clay jug and hanks of undyed wool drying. 3 flame frames."""
    cv = Canvas(48, 48)
    # chimney breast: fieldstone
    for y in range(0, 40):
        for x in range(2, 46):
            n = h32(x // 5, y // 4, 9720) % 5
            c = [SW(3), SW(2), SW(3), SW(4), SW(2)][n]
            if y % 4 == 3 or (x + (y // 4) * 3) % 8 == 7:
                c = SW(1)
            elif y % 4 == 0:
                c = SW(4) if n != 2 else SW(3)
            cv.set(x, y, c)
    for y in range(0, 40):
        cv.set(2, y, SW(0))
        cv.set(45, y, SW(0))
    # mantel beam
    for x in range(0, 48):
        cv.set(x, 9, WD(4))
        cv.set(x, 10, WD(3))
        cv.set(x, 11, WD(1))
    for x in range(0, 48):
        cv.put(x, 12, SH(90))
        cv.put(x, 13, SH(40))
    # things on the mantel: a clay jug, hanks of wool hanging
    ell(cv, 8, 6, 3.0, 3.4, lambda dx, dy, d: EA(1) if d > 0.85 else (PA(3) if (-dx - dy) > 0 else PA(1)))
    cv.set(8, 2, EA(1))
    cv.set(9, 3, EA(2))
    for (x0, col) in ((30, SA(2)), (35, SA(1)), (40, SA(3))):
        for y in range(11, 18):
            cv.set(x0, y, col)
            cv.set(x0 + 1, y, SA(1) if col != SA(1) else PA(1))
        cv.set(x0, 18, col)
    # the firebox: dark, an arch, the hearthstone
    for y in range(22, 44):
        for x in range(8, 40):
            cv.set(x, y, DARK if y < 40 else K(1))
    for y in range(22, 30):
        for x in range(8, 40):
            r = (x - 23.5) ** 2 / 16.0 ** 2 + ((y - 30) / 8.5) ** 2
            if r > 1.0:
                cv.set(x, y, SW(3) if (x + y) % 3 else SW(2))
    for x in range(7, 41):
        cv.set(x, 40, SW(4))
        cv.set(x, 41, SW(3))
        cv.set(x, 42, SW(1))
    for x in range(5, 44):
        cv.set(x, 43, K(4))
        cv.set(x, 44, K(2))
        cv.set(x, 45, K(1))
        cv.put(x, 46, SH(90))
    # fire: logs and flames (three frames)
    for x in range(14, 34):
        cv.set(x, 38, WD(1))
        cv.set(x, 39, WD(0))
    for (x0, x1, y) in ((13, 25, 36), (21, 34, 37)):
        for x in range(x0, x1):
            cv.set(x, y, WD(3) if x % 3 else WD(2))
            cv.set(x, y + 1, WD(1))
    flames = [[(23, 11, 5), (18, 8, 3), (28, 8, 3)], [(24, 12, 5), (19, 7, 3), (27, 9, 3)], [(22, 10, 5), (18, 9, 3), (28, 7, 3)]][frame % 3]
    for (fx, h, w) in flames:
        base = 38
        for i in range(h + 3):
            ry = base - i
            t = i / float(h + 3)
            half = max(0, int(round(w * (1.0 - t) ** 0.7 * (1.0 if i > 1 else 0.7))))
            for x in range(-half, half + 1):
                core = abs(x) <= half // 2
                col = FI(1)
                if core:
                    col = FI(2)
                if core and i > 1 and i < h:
                    col = FI(3)
                if abs(x) <= max(0, half // 3) and 1 < i < h - 1:
                    col = FI(4) if i < h - 3 else FI(5) if i < 4 else FI(4)
                cv.set(fx + x, ry, col)
    for x in range(15, 33):
        for y in range(34, 38):
            if h32(x, y, 9721 + frame) % 4 == 0:
                cv.set(x, y, FI(3) if y > 36 else FI(2))
    # embers
    for (x, y) in ((16, 38), (22, 37), (30, 38), (26, 39)):
        cv.set(x, y, FI(4))
    # the crane and kettle
    for y in range(14, 24):
        cv.set(40, y, MT(1))
    for x in range(26, 41):
        cv.set(x, 14, MT(1))
    cv.set(31, 15, MT(2))
    for y in range(15, 22):
        cv.set(31, y, MT(1))
    ell(cv, 31, 26, 5.0, 4.2, lambda dx, dy, d: MT(0) if d > 0.84 else (MT(2) if (-dx - dy) > 0.2 else MT(1)))
    for x in range(27, 36):
        cv.set(x, 23, MT(2))
    cv.set(35, 25, MT(1))
    cv.set(36, 24, MT(2))
    return cv


# ====================================================================== niches (face overlays for the Reeve's hall)
def niche(kind):
    """A 16 x 32 face overlay: a burial niche with a slab beneath it. lettered: a name cut in the slab (and lit warm); blank:
    a smooth pale slab; lit: the name glowing (Lantern)."""
    cv = Canvas(16, 32)
    blk(cv, 1, 5, 14, 17, K(5), K(2), K(1), K(0))
    for y in range(7, 16):
        for x in range(3, 13):
            cv.set(x, y, DARK if (x + y) % 3 else SD(1))
    for x in range(3, 13):
        cv.set(x, 16, K(4))
    # the pale shrouded shape in the niche
    for (x, y, c) in ((4, 14, MT(2)), (5, 14, MT(3)), (6, 13, MT(3)), (7, 13, MT(2)), (8, 13, MT(2)), (9, 14, MT(1)), (10, 14, MT(2)), (11, 14, MT(1)),
                      (5, 15, K(4)), (6, 15, K(4)), (7, 15, K(3)), (8, 15, K(3)), (9, 15, K(3)), (10, 15, K(2))):
        cv.set(x, y, c)
    # the name slab below
    if kind == 'blank':
        blk(cv, 2, 19, 13, 28, MT(3), K(5), K(4), K(2))
        for x in range(4, 12):
            cv.set(x, 21, MT(4))
    else:
        blk(cv, 2, 19, 13, 28, K(4), K(3), K(2), K(0))
        col = (GD(4), GD(3)) if kind == 'lit' else (K(1), K(4))
        for r in range(2):
            y = 22 + r * 3
            for k in range(4):
                x = 4 + k * 2 + (h32(r, k, 9730) % 2)
                cv.set(x, y, col[0])
                if h32(r, k, 9731) % 2:
                    cv.set(x, y + 1, col[1])
                else:
                    cv.set(x + 1, y, col[1])
    return cv


# ====================================================================== the sampler
def sampler(state):
    cv = Canvas(16, 16)
    blk(cv, 1, 2, 14, 14, WD(4), WD(3), WD(1), WD(0))
    for y in range(4, 13):
        for x in range(3, 13):
            cv.set(x, y, SA(2) if (x + y) % 2 else SA(1))
    # twelve stitched names: three rows of short stitched dashes; faded until the stones are lettered
    for r in range(3):
        for k in range(4):
            x = 4 + k * 2
            y = 5 + r * 3
            if state == 0:
                cv.set(x, y, PA(2) if (r + k) % 2 else SA(1))
            else:
                cv.set(x, y, RR(2) if (r + k) % 2 else RR(1))
                cv.set(x + 1, y, RR(1))
    for x in range(4, 12):
        cv.set(x, 12, EA(3) if state else SA(1))
    return cv


# ====================================================================== interior furniture
def loom():
    """The great loom (48 x 48): a timber frame, a warp of pale threads, a half-woven cloth in undyed and blue, a bench."""
    cv = Canvas(48, 48)
    gshadow(cv, 26, 46.5, 20, 2.0, 80)
    # posts and beams
    for x0 in (5, 38):
        for y in range(4, 45):
            cv.set(x0, y, WD(4))
            cv.set(x0 + 1, y, WD(3))
            cv.set(x0 + 2, y, WD(2))
            cv.set(x0 + 3, y, WD(1))
    for y0 in (4, 38):
        for x in range(5, 42):
            cv.set(x, y0, WD(4))
            cv.set(x, y0 + 1, WD(3))
            cv.set(x, y0 + 2, WD(1))
    # the warp: vertical pale threads
    for x in range(10, 37):
        for y in range(7, 38):
            cv.set(x, y, SA(2) if (x % 2 == 0) else SA(1))
    # woven cloth at the bottom: blue and oatmeal stripes, a lit edge
    for y in range(24, 38):
        band = ((y - 24) // 3) % 3
        for x in range(10, 37):
            c = [CB(3), SA(2), CB(2)][band] if (x + y) % 2 == 0 else [CB(2), SA(1), CB(1)][band]
            cv.set(x, y, c)
    for x in range(10, 37):
        cv.set(x, 23, SA(3))
    # heddles / reed
    for x in range(9, 38):
        cv.set(x, 16, WD(3))
        cv.set(x, 17, WD(1))
    for x in range(11, 36, 3):
        cv.set(x, 15, WD(4))
    # shuttle and a bench
    for x in range(30, 38):
        cv.set(x, 27 + (x - 30) // 4, WD(4))
    blk(cv, 14, 40, 33, 44, WD(4), WD(3), WD(1), WD(0))
    return cv


def spinning_wheel():
    cv = Canvas(16, 32)
    gshadow(cv, 9, 30.5, 7, 1.6, 80)
    ell(cv, 7, 20, 7, 7, lambda dx, dy, d: None if d < 0.72 else (WD(4) if (-dx - dy) > 0.1 else WD(2)) if d < 0.95 else WD(0))
    for (dx, dy) in ((0, -6), (0, 6), (-6, 0), (6, 0), (-4, -4), (4, 4), (-4, 4), (4, -4)):
        line_px(cv, 7, 20, 7 + dx, 20 + dy, WD(2))
    cv.set(7, 20, MT(3))
    # frame, legs, treadle, spindle with a wisp of wool
    for y in range(24, 30):
        cv.set(3, y, WD(3))
        cv.set(4, y, WD(1))
        cv.set(11, y, WD(3))
        cv.set(12, y, WD(1))
    for x in range(3, 14):
        cv.set(x, 29, WD(2))
    line_px(cv, 12, 18, 14, 10, MT(2))
    for (x, y) in ((13, 9), (14, 8), (13, 10), (14, 11)):
        cv.set(x, y, SA(3))
    return cv


def wool_bales():
    """Two bales of fleece (32 x 32 prop, 2 tiles): lumpy cream wool bound with cord, a few tufts."""
    cv = Canvas(32, 32)
    gshadow(cv, 17, 29.5, 14, 2.2, 80)
    for (x0, y0, w, h) in ((2, 15, 15, 14), (14, 11, 15, 18), (2, 7, 12, 9)):
        ell(cv, x0 + w / 2, y0 + h / 2, w / 2, h / 2, lambda dx, dy, d: MT(1) if d > 0.9 else (MT(4) if (-0.6 * dx - 0.8 * dy) > 0.25 else (MT(3) if (-0.4 * dx - 0.5 * dy) > -0.2 else MT(2))))
        for k in range(3):
            cv.set(x0 + 2 + k * 3, y0 + 2 + (k % 2), MT(4))
        for y in range(y0 + 1, y0 + h - 1):
            cv.set(x0 + w // 2, y, EA(3) if y % 2 else EA(2))
    return cv


def wool_shelf():
    """A shelf unit of wool and bobbins (32 x 48 prop): three rows of dyed hanks (red, blue, green, oatmeal) and spindles."""
    cv = Canvas(32, 48)
    gshadow(cv, 17, 46.5, 14, 2.0, 80)
    blk(cv, 1, 2, 30, 46, WD(4), WD(2), WD(1), WD(0))
    for y0 in (4, 18, 32):
        for y in range(y0, y0 + 11):
            for x in range(3, 29):
                cv.set(x, y, SD(1) if y < y0 + 2 else DARK if (x + y) % 3 else SD(1))
        for x in range(2, 30):
            cv.set(x, y0 + 11, WD(4))
            cv.set(x, y0 + 12, WD(1))
        cols = [RR(3), CB(3), GR(2), SA(2), CP(3), GD(3)]
        for i in range(6):
            x = 4 + i * 4
            col = cols[(i + y0 // 14) % 6]
            for y in range(y0 + 3, y0 + 11):
                cv.set(x, y, col)
                cv.set(x + 1, y, col)
            cv.set(x, y0 + 3, MT(3))
            for y in range(y0 + 4, y0 + 11, 2):
                cv.set(x + 1, y, MT(4) if col == SA(2) else col)
    return cv


def millstones():
    """A pair of millstones on the stone floor of a mill (32 x 32 prop, 2 tiles): the runner stone leaning, the bed stone
    behind, a wooden hoop round them, flour everywhere."""
    cv = Canvas(32, 32)
    gshadow(cv, 17, 29.5, 15, 2.4, 80)
    for (cx, ty, rx, ry, h) in ((11, 14, 10.0, 5.0, 9), (21, 9, 10.0, 5.0, 9)):
        def top(dx, dy, d):
            if d < 0.15:
                return DARK
            ang = math.atan2(dy, dx)
            frac = ((ang + math.pi) / (2 * math.pi) * 8 + 0.5) % 1.0
            base = K(5) if (-0.55 * dx - 0.75 * dy) > 0.25 else K(4)
            if frac < 0.2 and d > 0.3:
                base = K(2)
            if d > 0.78:
                base = MT(2) if (-0.5 * dx - 0.6 * dy) > 0.1 else MT(1)
            return base
        from x1_props import cylinder
        cylinder(cv, cx, ty, rx, ry, h, top,
                 lambda u, v, x, y: (K(3) if u < -0.2 else K(2) if u < 0.5 else K(1)) if (h32(x, y, 9740) % 6) else K(4), K(0), lip=MT(3))
    for (x, y) in ((6, 22), (14, 24), (22, 23), (9, 18), (25, 17), (17, 28)):
        cv.set(x, y, MT(4))
        cv.set(x + 1, y, MT(3))
    return cv


def hopper():
    """The mill hopper (32 x 48 prop): a wooden funnel on a trestle above the stones, grain trickling into the eye, a shoe."""
    cv = Canvas(32, 48)
    gshadow(cv, 17, 46.5, 13, 2.0, 80)
    # four legs
    for x0 in (4, 24):
        for y in range(26, 46):
            cv.set(x0, y, WD(1))
            cv.set(x0 + 1, y, WD(3))
            cv.set(x0 + 2, y, WD(2))
    for y in (34, 42):
        for x in range(4, 27):
            cv.set(x, y, WD(3))
            cv.set(x, y + 1, WD(1))
    # the hopper: inverted pyramid in planks
    for y in range(4, 26):
        t = (y - 4) / 21.0
        half = 13 - t * 9
        for x in range(int(16 - half), int(16 + half)):
            dx = (x + 0.5 - 16) / max(half, 1)
            c = WD(4) if dx < -0.4 else (WD(3) if dx < 0.2 else (WD(2) if dx < 0.7 else WD(1)))
            if y % 5 == 0:
                c = WD(1)
            cv.set(x, y, c)
        cv.set(int(16 - half), y, WD(0))
        cv.set(int(16 + half) - 1, y, WD(0))
    for x in range(3, 30):
        cv.set(x, 3, WD(4))
        cv.set(x, 4, WD(1))
    # grain
    for y in range(6, 12):
        for x in range(7, 26):
            if (x * 3 + y) % 4:
                cv.set(x, y, GD(3) if (x + y) % 3 else GD(2))
    for y in range(26, 34):
        cv.set(16, y, GD(3))
    for (x, y) in ((15, 30), (17, 33)):
        cv.set(x, y, GD(2))
    return cv


def flour_bin():
    cv = Canvas(16, 32)
    gshadow(cv, 9, 30.5, 7, 1.8, 80)
    blk(cv, 1, 12, 14, 30, WD(4), WD(3), WD(1), WD(0))
    for y in range(14, 29, 4):
        for x in range(2, 14):
            cv.set(x, y, WD(1))
    for x in range(1, 15):
        cv.set(x, 11, WD(4))
        cv.set(x, 12, WD(2))
    for x in range(3, 13):
        cv.set(x, 10, MT(4) if x % 3 else MT(3))
    for (x, y) in ((4, 9), (8, 9), (11, 9)):
        cv.set(x, y, MT(3))
    for (x, y) in ((3, 29), (4, 30), (12, 30)):
        cv.set(x, y, MT(4))
    return cv


def flour_table():
    """Hal's table with four bowls and four sacks set out for a brother he could not name (32 x 32 prop, 2 tiles)."""
    cv = Canvas(32, 32)
    gshadow(cv, 17, 30.5, 15, 1.8, 80)
    for x0 in (3, 26):
        for y in range(22, 30):
            cv.set(x0, y, WD(1))
            cv.set(x0 + 1, y, WD(3))
            cv.set(x0 + 2, y, WD(2))
    blk(cv, 0, 13, 31, 24, WD(4), WD(3), WD(1), WD(0))
    for x in range(2, 30):
        cv.set(x, 15, WD(4) if x % 5 else WD(3))
        cv.set(x, 20, WD(2) if x % 7 else WD(1))
    for i in range(4):
        x = 4 + i * 7
        # a bowl: pale rim, shadow, a dab of flour
        ell(cv, x + 2, 15, 3.0, 1.9, lambda dx, dy, d: PA(4) if d > 0.7 else (MT(4) if (-dx - dy) > 0 else MT(3)))
        for k in range(3):
            cv.set(x + k, 17, PA(2) if k == 1 else PA(1))
        # and a small sack beside it
        for y in range(7, 12):
            for xx in range(x + 1, x + 5):
                cv.set(xx, y, PA(3) if xx < x + 3 else PA(2))
        cv.set(x + 2, 6, EA(2))
        cv.set(x + 3, 6, EA(1))
    return cv


def drafting_desk():
    cv = Canvas(32, 32)
    gshadow(cv, 17, 30.5, 14, 1.8, 80)
    for x0 in (3, 26):
        for y in range(20, 30):
            cv.set(x0, y, WD(1))
            cv.set(x0 + 1, y, WD(3))
            cv.set(x0 + 2, y, WD(2))
    # sloped top with a chart
    poly = [(1, 22), (3, 9), (28, 9), (30, 22)]
    poly_fill(cv, poly, lambda x, y: WD(4) if y < 11 else WD(3))
    for y in range(11, 21):
        for x in range(5, 27):
            cv.set(x, y, SA(2) if (x + y) % 2 else SA(1))
    for (x, y) in ((8, 13), (12, 15), (16, 12), (21, 17), (24, 14)):
        cv.set(x, y, IK(2))
    line_px(cv, 8, 13, 12, 15, IK(3))
    line_px(cv, 12, 15, 16, 12, IK(3))
    line_px(cv, 16, 12, 21, 17, IK(3))
    for x in range(1, 31):
        cv.set(x, 22, WD(1))
        cv.set(x, 23, WD(2))
    for x in range(2, 8):
        cv.set(x, 8, MT(3))          # a brass rule
    cv.set(23, 9, GD(4))
    return cv


def telescope():
    """A brass telescope on a tripod (16 x 32 prop)."""
    cv = Canvas(16, 32)
    gshadow(cv, 9, 30.5, 6, 1.6, 80)
    for (x0, x1) in ((3, 7), (13, 8), (8, 8)):
        line_px(cv, x1, 17, x0, 29, WD(2))
        line_px(cv, x1 + 1, 17, x0 + 1, 29, WD(1))
    line_px(cv, 4, 20, 13, 4, GD(3), 3)
    line_px(cv, 5, 21, 14, 5, GD(2), 1)
    cv.set(13, 3, GD(5))
    cv.set(14, 3, GD(4))
    cv.set(14, 4, ICE(2))
    cv.set(3, 21, GD(1))
    cv.set(8, 12, GD(4))
    cv.set(9, 11, GD(2))
    return cv


def loft_ladder():
    cv = Canvas(16, 32)
    gshadow(cv, 9, 30.5, 5, 1.4, 70)
    for x in (4, 11):
        for y in range(2, 30):
            cv.set(x, y, WD(4))
            cv.set(x + 1, y, WD(2))
    for y in range(5, 29, 5):
        for x in range(5, 11):
            cv.set(x, y, WD(3))
            cv.set(x, y + 1, WD(1))
    return cv


# ====================================================================== assembly
def build_into(sh):
    sh.meta.setdefault('objects', {})
    sh.meta.setdefault('tiles', {})
    add_obj(sh, 'x1_slab', slab(), [0, 1], [[0, 0], [1, 0]], overhead=1,
            note='the sliding slab (a shelf skin): footprint the lower row; slides along its rail pockets between positions')
    add_obj(sh, 'x1_slab_doorway', slab_doorway(), [0, 1], [], kind='piece', overhead=0,
            note='96 x 32 doorway piece for x1_slab: put it with its dark doorway (tiles 2..3) over the corridor cells; pockets either side')
    add_obj(sh, 'x1_gate_culvert_closed', gate_culvert(False), [0, 1], [[0, 0], [1, 0]], kind='door',
            note='barred iron gate in the brick (32 x 32, set in a 2-tile wall face like door_locked_closed)')
    add_obj(sh, 'x1_gate_culvert_open', gate_culvert(True), [0, 1], [], door=[0, 0], kind='door',
            note='the same gate raised: cells (0,0) and (1,0) are the doorway')
    add_obj(sh, 'x1_gate_barrow_closed', gate_barrow(False), [0, 1], [[0, 0], [1, 0]], kind='door',
            note='iron-bound oak hurdle gate in the barrow stone (32 x 32)')
    add_obj(sh, 'x1_gate_barrow_open', gate_barrow(True), [0, 1], [], door=[0, 0], kind='door', note='the same gate raised')
    for i, v in enumerate((0, 1)):
        add_tile(sh, 'x1_drain_grate' + ('_b' if v else ''), drain_grate(v), collision='none',
                 note='grating over a drain, walkable (the Drain Hall row 16); _b is rusted with a broken bar')
    add_obj(sh, 'x1_star_plate', star_plate(), [0, 1], [[0, 0], [1, 0]], kind='piece', overhead=1,
            note='the brass star plate in the Orrery wall (32 x 32, an Appraise target); the drawer behind it holds chest_orrery')
    add_obj(sh, 'x1_hatch_closed', hatch(False), [0, 0], [[0, 0]], kind='door', note='the Orrery trapdoor, locked (16 x 16)')
    add_obj(sh, 'x1_hatch_open', hatch(True), [0, 0], [], door=[0, 0], kind='door', note='the trapdoor open on its stair down; doorAt (0,0)')
    add_obj(sh, 'x1_armillary', [armillary(0), armillary(1)], [0, 3], [[0, 0], [1, 0]], overhead=3, states=True,
            note='the great armillary: frames by state 0 = three stars dark, 1 = aligned')
    add_obj(sh, 'x1_hearth', [hearth(i) for i in range(3)], [0, 2], [[0, 0], [1, 0], [2, 0]], overhead=2, anim=([0, 1, 2, 1], 150),
            note="Thornfold's hearth font skin for thornfold_hearth (48 x 48, the top 2 rows overlap a 2-row wall face)")
    for kind in ('lettered', 'blank', 'lit'):
        add_tile(sh, 'x1_niche_' + kind, niche(kind), collision='solid',
                 note='16 x 32 burial niche face overlay (the Reeve hall): %s' % kind)
    add_obj(sh, 'x1_sampler', [sampler(0), sampler(1)], [0, 0], [[0, 0]], kind='piece', states=True,
            note='the framed sampler: frames 0 = thread gone pale, 1 = names dark again (after stones_lettered)')
    add_obj(sh, 'x1_loom', loom(), [0, 1], [[0, 0], [1, 0], [2, 0]], note='the great loom (48 x 48)')
    add_obj(sh, 'x1_spinning_wheel', spinning_wheel(), [0, 1], [[0, 0]], note='a spinning wheel')
    add_obj(sh, 'x1_wool_bales', wool_bales(), [0, 1], [[0, 0], [1, 0]], note='bales of fleece (2 tiles)')
    add_obj(sh, 'x1_wool_shelf', wool_shelf(), [0, 2], [[0, 0], [1, 0]], note='a shelf of dyed wool hanks (32 x 48)')
    add_obj(sh, 'x1_millstones', millstones(), [0, 1], [[0, 0], [1, 0]], note='a pair of millstones, decor (2 tiles)')
    add_obj(sh, 'x1_hopper', hopper(), [0, 2], [[0, 0], [1, 0]], note='the mill hopper on its trestle (32 x 48)')
    add_obj(sh, 'x1_flour_bin', flour_bin(), [0, 1], [[0, 0]], note='a flour bin')
    add_obj(sh, 'x1_flour_table', flour_table(), [0, 1], [[0, 0], [1, 0]], note="Hal's table: four bowls, four sacks (2 tiles)")
    add_obj(sh, 'x1_drafting_desk', drafting_desk(), [0, 1], [[0, 0], [1, 0]], note="Hesper's drafting desk with a star chart (2 tiles)")
    add_obj(sh, 'x1_telescope', telescope(), [0, 1], [[0, 0]], note='a brass telescope on a tripod')
    add_obj(sh, 'x1_loft_ladder', loft_ladder(), [0, 1], [[0, 0]], note='a ladder to a loft')
    sh.newline()
