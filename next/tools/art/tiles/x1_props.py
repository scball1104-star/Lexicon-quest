"""The Wider Valley overworld objects (EXPANSION1_PLAN 10.1): standing stones, the barrow mound, hay, the scarecrow, a fallen oak,
heavy-block skins (drift log, millstone, cider barrel), the drovers' chain gate, a drystone wall, troughs, flour sacks and carts.

Objects are tiles.json-style entries: rect, anchor (bottom-left footprint tile), footprint (relative to the anchor, dy <= 0 goes
up), overheadRows, doorAt. Props follow build_tiles.py: every rect row above the footprint is drawn over actors.
Mechanisms, interiors and the wide-map kit are in x1_mech.py and x1_wide.py; buildings in x1_bld.py.
"""
import math
import numpy as np
from pxlib import Canvas, C, SH, DARK, rnd, h32
from x1_draw import *
import kit


# ====================================================================== standing stones
def _stone_mask(w, h, pts):
    cv = Canvas(w, h)
    poly_fill(cv, pts, lambda x, y: (255, 255, 255, 255))
    return cv.a[:, :, 3] > 0


def menhir(kind='a', lettered=False, seed=0):
    """A standing stone (16 x 32, one tile): lit grey granite, lichen on the sunward side, a grass tuft at the foot and a baked
    shadow to the right. kind a = tall, b = shorter and leaning. lettered = names cut down the face, glowing faintly."""
    cv = Canvas(16, 32)
    if kind == 'a':
        pts = [(3, 29), (2, 20), (3, 11), (4, 6), (7, 3), (10, 3), (12, 6), (13, 12), (13, 21), (12, 29)]
    else:
        pts = [(2, 29), (2, 22), (3, 15), (5, 11), (8, 9), (11, 10), (13, 13), (13, 21), (13, 29)]
    mask = _stone_mask(16, 32, pts)
    gshadow(cv, 12, 29.5, 7.5, 2.2, 90)

    def tex(x, y):
        n = h32(x, y, 9100 + seed) % 29
        if n == 0:
            return K(2)
        if n == 1:
            return K(4)
        # lichen on the lit upper-left, in blotches
        lx = (h32(x // 3, y // 3, 9101 + seed) % 9)
        if lx < 2 and x < 9 and y < 22:
            return RG(3) if (x + y) % 2 else RG(2)
        if lx == 2 and y < 16 and x < 8:
            return GD(1) if (x + y) % 3 == 0 else None
        return None
    mask_shade(cv, mask, [K(1), K(2), K(3), K(4)], K(0), tex=tex)
    # a crack
    for (x, y) in ((8, 14), (8, 15), (9, 16), (9, 17), (9, 18)):
        if cv.get(x, y)[3]:
            cv.set(x, y, K(1))
    if lettered:
        # names cut in the face: columns of thin strokes, lit warm from inside the cut
        gy = 8 if kind == 'a' else 12
        for r in range(5 if kind == 'a' else 3):
            y = gy + r * 4
            for k in range(2):
                x = 5 + k * 3 + (h32(r, k, 9102) % 2)
                for dy in range(2):
                    if cv.get(x, y + dy)[3]:
                        cv.set(x, y + dy, GD(3) if dy == 0 else GD(1))
                if h32(r, k, 9104) % 2 == 0 and cv.get(x + 1, y)[3]:
                    cv.set(x + 1, y, GD(1))
    tuft(cv, 4, 30, GR(3), GR(2))
    tuft(cv, 12, 31, GR(3), GR(1))
    return cv


def blank_slab():
    """The thirteenth stone: a pale, smooth slab, wider and lower, set a little apart: no lichen, no mark, the face lit."""
    cv = Canvas(16, 32)
    pts = [(2, 29), (2, 14), (4, 10), (8, 8), (12, 10), (14, 14), (14, 29)]
    mask = _stone_mask(16, 32, pts)
    gshadow(cv, 12, 29.5, 7.5, 2.2, 90)

    def tex(x, y):
        n = h32(x, y, 9120) % 41
        return K(4) if n == 0 else None
    mask_shade(cv, mask, [K(3), K(4), K(5), MT(3)], K(1), tex=tex)
    # a faint sheen band across the lit face and one pale hairline: it is waiting to be written on
    for x in range(5, 11):
        if cv.get(x, 16)[3]:
            cv.set(x, 16, MT(4))
    tuft(cv, 4, 30, GR(3), GR(2))
    tuft(cv, 12, 31, GR(3), GR(1))
    return cv


# ====================================================================== the turf mound and its barrow door
def barrow_mound(state):
    """The Wethers' Barrow mound (96 x 64: 5 tiles + the shadow column, 4 rows). A long turf dome with kerbstones round its foot, an
    entrance of two uprights and a lintel cut with a ring. state closed: a blank slab fills the doorway; open: the doorway is dark, a
    step in front, the slab leaning aside."""
    cv = Canvas(96, 64)
    # ground shadow under the whole mound
    gshadow(cv, 46, 62, 42, 3.4, 80)
    # the dome: a flattened superellipse from x 3..77, top y 9, foot y 56
    cx, cy, rx, ry = 40.0, 56.0, 38.0, 46.0

    def inside(x, y):
        dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
        return dy <= 0 and (abs(dx) ** 2.6 + abs(dy) ** 2.2) <= 1.0
    for y in range(6, 58):
        for x in range(0, 82):
            if not inside(x, y):
                continue
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            t = -0.55 * dx - 0.9 * dy - 0.1 * (dx * dx + dy * dy)
            edge = not (inside(x - 1, y) and inside(x + 1, y) and inside(x, y - 1))
            n = h32(x, y, 9200) % 17
            if edge:
                c = FD(0) if x > 40 or y > 20 else RG(1)
            elif t > 0.62:
                c = GR(3) if n > 2 else GR(4)
            elif t > 0.35:
                c = GR(2) if n > 1 else GR(3)
            elif t > 0.05:
                c = RG(2) if n > 3 else GR(1)
            else:
                c = RG(1) if n > 2 else FD(1)
            if (n == 5 and t > 0.1) or (n == 6 and t < 0.1):
                c = GR(1) if t < 0.3 else GR(4)
            cv.set(x, y, c)
    # grass blades on the crown, a few stones breaking through the turf
    for (x, y) in ((22, 14), (35, 11), (48, 12), (56, 16), (30, 18), (18, 24), (62, 24)):
        if inside(x, y):
            stamp(cv, ['.l.', 'l.l'], x - 1, y - 2, {'l': GR(4)})
    for (x, y, w) in ((26, 22, 3), (51, 20, 4), (14, 30, 3), (65, 31, 3)):
        for k in range(w):
            cv.set(x + k, y, K(4) if k == 0 else K(3))
            cv.set(x + k, y + 1, K(2))
    # kerbstones round the foot: big flat stones, lit on top
    for k, x in enumerate(range(2, 78, 9)):
        w = 8 + (h32(k, 9201) % 3)
        yb = 57 + (1 if k % 2 else 0)
        blk(cv, x, yb - 4, x + w, yb + 2, K(5), K(3), K(2), K(0))
        for dx in range(2, w - 1, 3):
            cv.set(x + dx, yb - 1, K(4))
    # the entrance: two uprights and a lintel, centred on tile 2 (x 32..47)
    for (x0, x1) in ((28, 33), (46, 51)):
        blk(cv, x0, 34, x1, 58, K(4), K(3), K(2), K(0))
        for y in range(38, 56, 4):
            cv.set(x0 + 2, y, K(5))
    blk(cv, 26, 28, 53, 35, K(5), K(4), K(2), K(0))
    # the carved ring on the lintel (a barrow-wight's ring: two rings and a dot) and moss on its top
    for y in range(28, 36):
        for x in range(27, 53):
            d = math.hypot(x - 39.5, y - 31.5)
            if 2.5 <= d < 3.5 and y < 35:
                cv.set(x, y, K(1))
    cv.set(39, 31, K(1))
    cv.set(40, 31, K(1))
    for x in range(28, 52, 3):
        cv.set(x, 29, RG(2) if h32(x, 9202) % 2 else GR(2))
    # the doorway: x 34..45, y 36..58
    if state == 'closed':
        # a blank slab, pale, with an iron ring set in it
        blk(cv, 34, 36, 45, 58, MT(3), K(5), K(4), K(1))
        for y in range(40, 56, 6):
            for x in range(36, 44):
                cv.set(x, y, K(4))
        for (x, y) in ((39, 46), (40, 46), (38, 47), (41, 47), (38, 48), (41, 48), (39, 49), (40, 49)):
            cv.set(x, y, MT(1) if (x + y) % 2 else K(2))
        cv.set(39, 45, K(1))
        cv.set(40, 45, K(1))
    else:
        for y in range(36, 59):
            for x in range(34, 46):
                f = (y - 36) / 22.0
                cv.set(x, y, DARK if (x + y) % 3 else SD(1))
        # steps going down into the dark, lit
        for k in range(3):
            y = 54 + k
            for x in range(34, 46):
                cv.set(x, y, K(3) if k == 0 else (K(2) if k == 1 else K(1)))
        for k in range(2):
            y = 49 + k
            for x in range(36, 44):
                cv.set(x, y, SD(2) if k == 0 else SD(1))
        # a cold light coming from inside
        for (x, y) in ((39, 45), (40, 45), (39, 46), (40, 46)):
            cv.set(x, y, IK(2))
        # the slab leaned aside against the right upright
        poly = [(52, 58), (53, 42), (58, 40), (60, 58)]
        poly_fill(cv, poly, lambda x, y: K(5) if x < 55 else (K(4) if x < 58 else K(3)))
        for y in range(41, 58):
            cv.set(53, y, K(0))
    # tufts at the door and the left kerb
    tuft(cv, 22, 61, GR(3), GR(2))
    tuft(cv, 61, 61, GR(3), GR(1))
    for x in range(34, 46):
        cv.put(x, 59, SH(70))
    return cv


# ====================================================================== hay
def haystack(kind):
    cv = Canvas(32, 32)
    gshadow(cv, 17, 29.5, 13, 2.6, 80)

    def straw(x, y, seed):
        n = h32(x, y, seed) % 11
        if (x + y * 2) % 5 == 0:
            return SA(1)
        if n == 0:
            return PA(1)
        if n == 1:
            return SA(3)
        return None
    if kind == 'a':
        # a conical rick: a tapered body, a leaning pole through the top
        pts = [(15, 3), (22, 14), (26, 24), (27, 29), (4, 29), (5, 24), (9, 14)]
        mask = _stone_mask(32, 32, pts)
        mask_shade(cv, mask, [PA(1), PA(2), PA(3), SA(2)], EA(1), tex=lambda x, y: straw(x, y, 9300))
        # binding bands of twisted straw
        for y, w in ((15, 8), (22, 11)):
            for x in range(16 - w, 17 + w):
                if cv.get(x, y)[3] and cv.get(x, y) != EA(1):
                    cv.set(x, y, PA(1) if (x + y) % 2 else EA(3))
        cv.set(15, 2, WD(2))
        cv.set(15, 1, WD(3))
        cv.set(16, 2, WD(1))
        for k in range(3):
            cv.set(14 + k * 2, 4 + k, SA(3))
    else:
        # a round rick with a thatch cap: a cylinder under a darker straw dome
        for y in range(11, 30):
            for x in range(3, 29):
                dx = (x + 0.5 - 16) / 12.5
                if abs(dx) > 1.0:
                    continue
                if y > 27 and abs(dx) > 0.92:
                    continue
                t = -0.7 * dx + 0.2
                c = SA(2) if t > 0.55 else (PA(3) if t > 0.0 else (PA(2) if t > -0.5 else PA(1)))
                if (x * 3 + y) % 6 == 0:
                    c = PA(1) if c != PA(1) else EA(3)
                edge = abs(dx) > 0.94
                cv.set(x, y, EA(1) if edge else c)
        for y in range(29, 31):
            for x in range(4, 28):
                cv.set(x, y, EA(1))
        # the cap: a dome of darker straw with ragged overhang
        for y in range(3, 14):
            half = 12.5 * math.sqrt(max(0.0, 1 - ((13 - y) / 10.0) ** 2)) if y <= 13 else 12.5
            for x in range(int(16 - half), int(16 + half) + 1):
                dx = (x + 0.5 - 16) / max(half, 1)
                t = -0.7 * dx + 0.25 - (y - 3) * 0.02
                c = PA(3) if t > 0.45 else (PA(2) if t > -0.1 else PA(1))
                if (x + y * 2) % 5 == 0:
                    c = EA(3) if c != EA(3) else PA(2)
                if y == 13 or x in (int(16 - half), int(16 + half)):
                    c = EA(1)
                cv.set(x, y, c)
        for x in range(4, 28, 3):
            cv.set(x, 14, EA(1))
            if h32(x, 9301) % 2:
                cv.set(x, 15, PA(1))
    return cv


def haybale():
    """A single hay bale (16 x 16): a block of packed straw bound with two twine loops, lit on top."""
    cv = Canvas(16, 16)
    gshadow(cv, 9, 14.5, 7, 1.6, 80)
    blk(cv, 2, 4, 13, 14, SA(3), PA(3), PA(1), EA(1))
    for x in range(3, 13):
        cv.set(x, 5, SA(3) if x % 2 else SA(2))
    for y in range(6, 14):
        for x in range(3, 13):
            if (x * 2 + y * 3) % 7 == 0:
                cv.set(x, y, PA(2))
            elif (x + y) % 9 == 0:
                cv.set(x, y, SA(2))
    for x in (5, 10):
        for y in range(4, 15):
            cv.set(x, y, EA(2) if y % 2 else EA(3))
    for (x, y) in ((1, 10), (14, 8), (13, 14)):
        cv.set(x, y, SA(3))
    return cv


# ====================================================================== the scarecrow
def scarecrow():
    """Patch, the scarecrow (16 x 32): a burlap head with a stitched face under a battered straw hat, a patched coat hung on a
    crossbar, pockets everywhere (eleven; Appraise counts them), straw bursting from the cuffs and the hem."""
    cv = Canvas(16, 32)
    gshadow(cv, 10, 30.5, 6.5, 1.8, 84)
    # the post and the crossbar
    for y in range(12, 31):
        cv.set(7, y, WD(4))
        cv.set(8, y, WD(2))
        cv.set(9, y, WD(1))
    for x in range(0, 16):
        cv.set(x, 13, WD(3) if 2 < x < 13 else WD(2))
        cv.set(x, 14, WD(1))
    # coat: patched blue cloth, a torn hem
    for y in range(13, 24):
        half = 3.3 + (y - 13) * 0.18
        for x in range(int(8 - half), int(8 + half) + 1):
            c = CB(2) if x < 8 else CB(1)
            if y == 13:
                c = CB(3)
            if x in (int(8 - half), int(8 + half)):
                c = CB(0)
            cv.set(x, y, c)
    patches = [(5, 15, 3, 3, RR(2)), (9, 16, 3, 3, GD(2)), (6, 20, 3, 2, PA(2)), (9, 21, 3, 2, RR(3)), (11, 14, 2, 2, SA(1))]
    for (px, py, pw, ph, col) in patches:
        for yy in range(ph):
            for xx in range(pw):
                cv.set(px + xx, py + yy, col)
        for xx in range(pw):
            cv.put(px + xx, py + ph, SH(60))
        for xx in range(0, pw, 2):
            cv.set(px + xx, py, SA(1) if col != SA(1) else EA(2))      # stitches
    # pockets: small dark flaps with a lit edge (many, small)
    for (px, py) in ((5, 18), (10, 18), (6, 22), (9, 23), (7, 15)):
        cv.set(px, py, CB(0))
        cv.set(px + 1, py, CB(0))
        cv.set(px, py + 1, CB(3))
    # a ragged hem
    for x in range(4, 13):
        if x % 2:
            cv.set(x, 24, CB(0))
        else:
            cv.set(x, 24, SA(2))
            cv.set(x, 25, SA(1))
    # sleeves along the bar, straw cuffs
    for (x0, x1) in ((1, 4), (11, 14)):
        for x in range(x0, x1 + 1):
            cv.set(x, 12, CB(3) if x0 < 8 else CB(2))
            cv.set(x, 13, CB(2) if x0 < 8 else CB(1))
            cv.set(x, 14, CB(1) if x0 < 8 else CB(0))
    for (x, y) in ((0, 12), (0, 14), (1, 15), (15, 12), (15, 15), (14, 15)):
        cv.set(x, y, SA(2))
    cv.set(0, 13, SA(3))
    cv.set(15, 13, SA(3))
    # the head: a burlap sack, a stitched face
    ell(cv, 8, 8, 3.6, 3.8, lambda dx, dy, d: EA(1) if d > 0.86 else (SA(2) if (-0.5 * dx - 0.6 * dy) > 0.1 else (PA(3) if (-0.4 * dx - 0.5 * dy) > -0.3 else PA(2))))
    for (x, y) in ((6, 7), (10, 7)):
        cv.set(x, y, EA(0))
        cv.set(x + 1 if x == 6 else x - 1, y, EA(0)) if False else None
    cv.set(6, 7, EA(0))
    cv.set(10, 7, EA(0))
    cv.set(6, 6, EA(1))
    cv.set(10, 6, EA(1))
    for x in range(6, 11):
        cv.set(x, 10, EA(1) if x % 2 else EA(2))
    cv.set(5, 10, EA(1))
    cv.set(11, 10, EA(1))
    # the hat: a wide-brimmed straw hat, dented, with a ragged brim and a faded red band
    for x in range(3, 14):
        cv.set(x, 5, EA(1))
        cv.set(x, 4, SA(2) if x < 8 else PA(3))
    for x in range(4, 13):
        cv.set(x, 3, SA(3) if x < 8 else SA(2))
    for y in range(0, 3):
        for x in range(5 + y // 2, 11 - y // 2):
            cv.set(x, y + 1 if y else 1, PA(3) if x < 8 else PA(2))
    for x in range(5, 11):
        cv.set(x, 3, RR(2))
    cv.set(2, 5, SA(2))
    cv.set(13, 5, SA(2))
    cv.set(1, 6, SA(1))
    cv.set(14, 6, SA(1))
    # tufts of hay at the foot
    tuft(cv, 4, 30, SA(3), PA(2))
    tuft(cv, 12, 31, SA(2), PA(1))
    return cv


# ====================================================================== the fallen oak
def fallen_oak():
    """A big oak fallen across the track (64 x 32, 4 tiles wide, trunk on the footprint row; the crown and the broken branches
    sprawl above). The cut end shows its rings; the bark is grey-brown with moss on the lit side."""
    cv = Canvas(64, 32)
    gshadow(cv, 34, 30.5, 28, 2.4, 90)
    # leaves: a heap of crown at the right end, in foreground and behind the trunk
    leaves = [GR(1), GR(2), GR(3), GR(4)]
    for (cx, cy, rx, ry, base) in ((52, 12, 11, 8, 2), (44, 14, 8, 6, 1), (58, 17, 7, 6, 2), (48, 8, 7, 5, 3), (40, 18, 6, 4, 1)):
        ell(cv, cx, cy, rx, ry, lambda dx, dy, d, b=base: FD(0) if d > 0.9 else leaves[max(0, min(3, b + (1 if (-0.5 * dx - 0.7 * dy) > 0.25 else 0) - (1 if (-0.5 * dx - 0.7 * dy) < -0.4 else 0)))])
    for i in range(40):
        x = 38 + h32(i, 9400) % 24
        y = 4 + h32(i, 9401) % 18
        if cv.get(x, y)[3]:
            cv.set(x, y, GR(4) if i % 3 else GR(3))
    # the trunk: y 16..29 along x 4..50, slightly sagging
    for x in range(4, 56):
        sag = int(round(math.sin(x / 63.0 * math.pi) * 1.4))
        top, bot = 17 + sag - (1 if x < 10 else 0), 29 + sag
        for y in range(top, bot + 1):
            v = (y - top) / max(1, bot - top)
            n = h32(x // 2, y, 9402) % 7
            if y == top:
                c = WD(4) if x % 3 else WD(3)
            elif v < 0.3:
                c = WD(3) if n > 1 else WD(2)
            elif v < 0.7:
                c = WD(2) if n > 0 else WD(1)
            elif y == bot:
                c = WD(0)
            else:
                c = WD(1) if n > 0 else WD(0)
            if x % 5 == 2 and 0.15 < v < 0.9:
                c = WD(1) if c != WD(0) else c           # bark furrows
            cv.set(x, y, c)
        # moss on the lit top
        if h32(x, 9403) % 3 == 0 and x > 12:
            cv.set(x, top, RG(3))
            if h32(x, 9404) % 2:
                cv.set(x, top + 1, RG(2))
    # the broken end on the left: a cut face with rings
    ell(cv, 6, 24, 4.2, 7.5, lambda dx, dy, d: SA(1) if d > 0.88 else (WD(1) if d < 0.18 else [SA(3), PA(3), SA(2), PA(2)][int(d * 5) % 4]))
    for (x, y) in ((4, 17), (3, 19), (3, 28), (5, 30), (2, 22)):
        cv.set(x, y, WD(0))
    # branches: two stubs and a long bough over the trunk
    for (x0, y0, x1, y1) in ((20, 17, 24, 11), (33, 17, 36, 9), (44, 18, 48, 12)):
        line_px(cv, x0, y0, x1, y1, WD(1), 2)
        cv.set(x1, y1 - 1, WD(3))
    # roots tearing out at the right end of the trunk: a dark plate of earth
    for y in range(14, 31):
        for x in range(52, 62):
            dx, dy = (x - 56) / 5.0, (y - 23) / 8.5
            if dx * dx + dy * dy < 1.0 and h32(x, y, 9405) % 7:
                t = -0.4 * dx - 0.5 * dy
                cv.set(x, y, EA(3) if t > 0.2 else (EA(2) if t > -0.2 else EA(1)))
    for (x, y) in ((53, 15), (55, 14), (58, 16), (60, 19), (61, 24), (60, 28)):
        line_px(cv, x, y, x - 2, y + 4, WD(1), 1)
    return cv


# ====================================================================== heavy-block skins (16 x 32, one tile: the art sits low)
def cylinder(cv, cx, top, rx, ry, height, top_fn, side_fn, outline, bulge=0.0, lip=None):
    """An upright cylinder drawn in 3/4: a top ellipse (centre (cx, top + ry)) over a body `height` tall. top_fn(dx, dy, d),
    side_fn(u, v, x, y): u = -1..1 across the body, v = 0..1 down it. Outline round the silhouette; `lip` lights the front
    rim of the top face."""
    ty = top + ry
    by = ty + height
    for y in range(int(top) - 1, int(by + ry) + 2):
        for x in range(int(cx - rx - 3), int(cx + rx + 4)):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - ty) / ry
            dtop = math.sqrt(dx * dx + dy * dy)
            if dtop <= 1.0:
                if dtop > 0.84:
                    cv.set(x, y, outline if dy < 0.25 else (lip or outline))
                else:
                    cv.set(x, y, top_fn(dx, dy, dtop))
                continue
            v = (y + 0.5 - ty) / max(1.0, height)
            if 0 <= v <= 1.0 and y + 0.5 >= ty:
                r = rx + bulge * math.sin(v * math.pi)
                u = (x + 0.5 - cx) / r
                if abs(u) <= 1.0:
                    cv.set(x, y, outline if abs(u) > (1 - 1.15 / r) else side_fn(u, v, x, y))
                continue
            if v > 1.0:
                dy2 = (y + 0.5 - by) / ry
                u = (x + 0.5 - cx) / rx
                if u * u + dy2 * dy2 <= 1.0:
                    cv.set(x, y, outline if (u * u + dy2 * dy2) > 0.74 else side_fn(u, 1.0, x, y))


def drift_log():
    """Drift log (heavy-block skin): a bleached log standing on end like a block: pale grey-gold wood, a cut face with rings,
    salt crust at the foot, a frayed rope round its middle."""
    cv = Canvas(16, 32)
    gshadow(cv, 9, 29.5, 7.5, 2.2, 90)

    def top(dx, dy, d):
        if d < 0.14:
            return SW(1)
        ring = int(d * 6.0) % 3
        return [SW(4), SW(2), SA(1)][ring]

    def side(u, v, x, y):
        n = h32(x, y, 9500) % 9
        base = SW(4) if u < -0.3 else (SW(3) if u < 0.35 else SW(2))
        if (int((u + 1) * 4) % 3 == 0) and n > 1:
            base = SW(1) if base != SW(2) else SW(1)
        if n == 0:
            base = SA(2)
        if v > 0.82 and n < 5:
            base = MT(3) if n < 2 else SA(1)          # salt crust
        return base
    cylinder(cv, 8, 7, 6.8, 3.4, 17, top, side, SW(0), lip=SA(3))
    # a knot and a frayed rope band
    for (x, y) in ((6, 18), (7, 18), (7, 19)):
        cv.set(x, y, SW(1))
    for x in range(2, 14):
        if cv.get(x, 22)[3]:
            cv.set(x, 22, EA(3) if x % 2 else EA(2))
        if cv.get(x, 23)[3]:
            cv.set(x, 23, EA(1))
    cv.set(12, 24, EA(3))
    cv.set(12, 25, EA(2))
    return cv


def millstone():
    """Millstone (heavy-block skin): a disc of grey grit-stone lying like a block: furrows radiating from a dark eye, an iron
    band round the rim, flour in the grooves. A short, wide block (16 x 16 of art low in the tile)."""
    cv = Canvas(16, 32)
    gshadow(cv, 9, 29.5, 7.5, 2.2, 90)

    def top(dx, dy, d):
        if d < 0.2:
            return DARK if d < 0.14 else K(1)
        ang = math.atan2(dy, dx)
        sector = int((ang + math.pi) / (2 * math.pi) * 8 + 0.5) % 8
        frac = ((ang + math.pi) / (2 * math.pi) * 8 + 0.5) % 1.0
        base = K(5) if (-0.55 * dx - 0.75 * dy) > 0.25 else K(4)
        if frac < 0.22 and d > 0.3:
            base = K(2)                       # a furrow
        elif frac > 0.78 and d > 0.3:
            base = MT(3) if base == K(5) else K(5)       # the lit edge of the next land
        if d > 0.72:
            base = MT(2) if (-0.5 * dx - 0.6 * dy) > 0.1 else MT(1)    # the iron band
        return base

    def side(u, v, x, y):
        if v < 0.28:
            return MT(1) if u > -0.2 else MT(2)
        n = h32(x, y, 9510) % 7
        base = K(3) if u < -0.2 else (K(2) if u < 0.5 else K(1))
        if n == 0:
            base = K(4)
        if (v > 0.85):
            base = MT(3) if n < 2 else base
        return base
    cylinder(cv, 8, 12, 7.4, 4.0, 9, top, side, K(0), lip=MT(3))
    for (x, y) in ((4, 19), (11, 18), (8, 21)):
        cv.set(x, y, MT(4))               # flour dust on the stone
    return cv


def cider_barrel():
    """Cider barrel (heavy-block skin): an upright oak cask bulging at the waist, three iron hoops, a bung and a drip of cider."""
    cv = Canvas(16, 32)
    gshadow(cv, 9, 29.5, 7.5, 2.2, 90)

    def top(dx, dy, d):
        if d < 0.16:
            return WD(0)
        if abs(dx) < 0.1 and d > 0.4 and d < 0.8:
            return WD(1)
        return WD(4) if (-0.5 * dx - 0.6 * dy) > 0.1 else (WD(3) if d < 0.78 else MT(1))

    def side(u, v, x, y):
        # staves: 3 px wide with a dark gap
        k = int((u + 1.0) * 5.0 + 0.5) % 3
        base = WD(4) if u < -0.35 else (WD(3) if u < 0.3 else (WD(2) if u < 0.7 else WD(1)))
        if k == 2:
            base = WD(1) if u > -0.5 else WD(2)
        for hv in (0.14, 0.50, 0.86):
            if abs(v - hv) < 0.055:
                return MT(2) if u < -0.1 else MT(1)
        return base
    cylinder(cv, 8, 6, 6.0, 3.0, 18, top, side, WD(0), bulge=1.0, lip=WD(5))
    cv.set(5, 11, WD(0))
    cv.set(6, 11, WD(0))
    for k in range(4):
        cv.set(9, 16 + k * 2, GD(2) if k % 2 else GD(3))     # cider
    cv.set(9, 24, GD(3))
    return cv


# ====================================================================== the drovers' chain gate
def chain_gate(open_=False):
    """The drovers' chain across the road (48 x 32, 3 tiles): two weathered posts with iron caps, a chain sagging between, a
    board hung on it. Open: the chain lies coiled at the foot of the left post (the board face down)."""
    cv = Canvas(48, 32)
    gshadow(cv, 24, 30.5, 22, 2.0, 74)
    for (x0, x1) in ((2, 6), (41, 45)):
        for y in range(7, 30):
            cv.set(x0, y, WD(1))
            cv.set(x0 + 1, y, WD(4))
            cv.set(x0 + 2, y, WD(3))
            cv.set(x0 + 3, y, WD(2))
            cv.set(x1, y, WD(0)) if x1 != x0 + 3 else None
            if (y * 5 + x0) % 7 == 0:
                cv.set(x0 + 2, y, WD(2))
        cv.set(x0 + 1, 6, MT(3))
        cv.set(x0 + 2, 6, MT(2))
        cv.set(x0, 7, MT(1))
        cv.set(x0 + 3, 7, MT(1))
        for x in range(x0 - 1, x0 + 4):
            cv.put(x + 3, 30, SH(80))
    if not open_:
        # the chain: catenary from post to post, links as alternating bright / dark pixels, two px thick
        pts = []
        for x in range(7, 41):
            t = (x - 7) / 33.0
            y = 12 + 7 * 4 * t * (1 - t) * 1.0
            pts.append((x, int(round(y))))
        for i, (x, y) in enumerate(pts):
            cv.set(x, y, MT(3) if i % 2 == 0 else MT(1))
            cv.set(x, y + 1, MT(1) if i % 2 == 0 else MT(2))
        for x in range(7, 41, 6):
            y = [yy for (xx, yy) in pts if xx == x][0]
            cv.put(x + 1, y + 3, SH(80))
        # the board: ROAD CLOSED, white marks on weathered wood
        bx, by = 16, 16
        for y in range(by, by + 8):
            for x in range(bx, bx + 16):
                c = WD(3) if y not in (by, by + 7) and x not in (bx, bx + 15) else WD(1)
                if y == by + 1:
                    c = WD(4)
                cv.set(x, y, c)
        for k in range(5):
            cv.set(bx + 3 + k * 2, by + 3, MT(4))
            cv.set(bx + 3 + k * 2, by + 5, MT(3))
        cv.set(bx + 4, by - 1, MT(1))
        cv.set(bx + 11, by - 1, MT(1))
        # a padlock
        cv.set(7, 13, GD(3))
        cv.set(7, 14, GD(2))
        cv.set(8, 14, GD(2))
    else:
        # chain lying coiled in the dust beside the left post
        for (cx, cy, rx, ry) in ((12, 27, 5.5, 2.0), (14, 25, 4.0, 1.6)):
            ell(cv, cx, cy, rx, ry, lambda dx, dy, d: None if d < 0.45 else (MT(3) if (-dx - dy) > 0.1 else MT(1)))
        for x in range(14, 30):
            cv.set(x, 28 + (1 if x % 5 == 0 else 0), MT(1) if x % 2 else MT(2))
        cv.set(30, 28, MT(2))
        # the board face down
        for x in range(24, 36):
            cv.set(x, 27, WD(2))
            cv.set(x, 28, WD(1))
        cv.set(24, 27, WD(0))
        cv.set(35, 27, WD(0))
    return cv


# ====================================================================== drystone wall, trough, sacks, carts
def drystone(ramp='cool'):
    """A drystone wall (line16 autotile, 128 x 32): the town's low wall in cold grey, mossy on top; or honey for Larchhill."""
    cv = kit.line16('stone')
    if ramp == 'cool':
        table = {tuple(SW(i)[:3]): K(j) for i, j in zip(range(6), (1, 2, 3, 4, 5, 5))}
    else:
        table = {tuple(SW(i)[:3]): c for i, c in zip(range(6), (EA(2), EA(3), EA(4), PA(3), PA(4), SA(3)))}
    a = cv.a
    for y in range(cv.h):
        for x in range(cv.w):
            p = a[y, x]
            if p[3] != 255:
                continue
            c = table.get((int(p[0]), int(p[1]), int(p[2])))
            if c is not None:
                a[y, x] = c
    if ramp == 'cool':
        # moss on the coping and in the courses
        for y in range(cv.h):
            for x in range(cv.w):
                if a[y, x][3] == 255 and h32(x, y, 9600) % 11 == 0 and tuple(a[y, x][:3]) != tuple(K(1)[:3]):
                    cv.set(x, y, RG(2) if h32(x, y, 9601) % 2 else RG(3))
    return cv


def trough(dry=False):
    """A stock trough (32 x 32, 2 tiles, footprint on the lower row): a hewn stone basin on two wooden trestles, water to the
    brim with a pale lip and a drifting leaf; dry: stained, a little straw."""
    cv = Canvas(32, 32)
    gshadow(cv, 17, 29.5, 15, 2.2, 80)
    # trestles
    for x0 in (4, 24):
        for y in range(23, 30):
            cv.set(x0, y, WD(1))
            cv.set(x0 + 1, y, WD(3))
            cv.set(x0 + 2, y, WD(2))
            cv.set(x0 + 3, y, WD(0))
    # the basin: front face y 16..24, the water surface y 11..16 seen from above
    blk(cv, 1, 16, 30, 24, K(5), K(3), K(2), K(0))
    for x in range(3, 29, 5):
        cv.set(x, 20, K(2))
        cv.set(x + 1, 19, K(4))
    for y in range(8, 17):
        for x in range(1, 31):
            if y in (8, 16) or x in (1, 30):
                c = K(0)
            elif y == 9 or x == 2:
                c = K(5) if y == 9 else K(4)
            elif y == 15 or x == 29:
                c = K(1)
            else:
                if dry:
                    c = EA(1) if (x + y) % 4 else EA(2)
                else:
                    c = WA(1) if (y * 3 + x) % 7 else WA(2)
                    if y == 10:
                        c = IK(2)
                    if (x + y * 2) % 11 == 0 and y > 11:
                        c = WA(3)
            cv.set(x, y, c)
    if dry:
        for (x, y) in ((8, 12), (9, 12), (10, 13), (20, 11), (21, 12), (22, 12)):
            cv.set(x, y, SA(2))
        for (x, y) in ((14, 12), (15, 13), (16, 13)):
            cv.set(x, y, EA(3))
    else:
        for (x, y) in ((9, 12), (10, 12), (10, 13)):
            cv.set(x, y, GR(3))
        cv.set(20, 13, WA(4))
        cv.set(21, 12, WA(5))
        # a drip from the lip
        cv.set(25, 17, WA(4))
        cv.set(25, 18, WA(3))
    return cv


def flour_sacks():
    """Flour sacks (32 x 16, 2 tiles): three burlap sacks with tied necks, one split and dusted white."""
    cv = Canvas(32, 16)
    gshadow(cv, 16, 14.5, 14, 1.8, 80)
    for (cx, w, h, tone) in ((9, 11, 10, 0), (21, 11, 9, 1), (15, 10, 8, 2)):
        yb = 14 if tone != 2 else 8
        x0 = cx - w // 2
        mask = Canvas(32, 16)
        for y in range(yb - h + 1, yb + 1):
            for x in range(x0, x0 + w):
                # a rounded sack: narrower at the top
                dy = (yb - y) / h
                inset = int(dy * 2.5) if dy > 0.7 else 0
                if x0 + inset <= x < x0 + w - inset:
                    mask.set(x, y, (255, 255, 255, 255))
        m = mask.a[:, :, 3] > 0
        ramp = [[PA(1), PA(2), PA(3), SA(2)], [EA(3), PA(1), PA(2), PA(3)], [PA(1), PA(2), SA(1), SA(2)]][tone]
        mask_shade(cv, m, ramp, EA(1), tex=lambda x, y: (SA(1) if (x * 5 + y * 3) % 11 == 0 else None))
        # the tied neck
        nx = cx
        cv.set(nx - 1, yb - h + 1, EA(2))
        cv.set(nx, yb - h, EA(1))
        cv.set(nx + 1, yb - h + 1, EA(2))
        cv.set(nx, yb - h + 2, EA(3))
    # flour: white dust on the sack tops and a pile on the floor
    for (x, y) in ((6, 5), (7, 4), (10, 5), (20, 6), (22, 6), (15, 1), (16, 1), (14, 2)):
        if cv.get(x, y)[3]:
            cv.set(x, y, MT(4))
    for (x, y) in ((11, 15), (12, 15), (13, 15), (24, 15), (25, 15)):
        cv.set(x, y, MT(3))
    cv.set(12, 14, MT(4))
    return cv


def sack_stack():
    """A stack of four flour sacks against a wall (16 x 32, one tile): a pyramid, the top sack split."""
    cv = Canvas(16, 32)
    gshadow(cv, 9, 30.5, 8, 1.8, 80)
    spots = [(3, 29, 10, 8), (3 + 2, 21, 8, 8), (7, 13, 8, 8)]
    ramps = [[PA(1), PA(2), PA(3), SA(2)], [EA(3), PA(1), PA(2), PA(3)], [PA(1), PA(2), SA(1), SA(2)]]
    for i, (x0, yb, w, h) in enumerate(spots):
        mask = Canvas(16, 32)
        for y in range(yb - h + 1, yb + 1):
            dy = (yb - y) / h
            inset = int(dy * 2) if dy > 0.7 else 0
            for x in range(x0 + inset, x0 + w - inset):
                mask.set(x, y, (255, 255, 255, 255))
        mask_shade(cv, mask.a[:, :, 3] > 0, ramps[i % 3], EA(1), tex=lambda x, y: (SA(1) if (x * 5 + y * 3) % 11 == 0 else None))
        cv.set(x0 + w // 2, yb - h, EA(1))
        cv.set(x0 + w // 2 - 1, yb - h + 1, EA(2))
        cv.set(x0 + w // 2 + 1, yb - h + 1, EA(2))
    for (x, y) in ((8, 14), (9, 14), (10, 15), (9, 13), (7, 15)):
        cv.set(x, y, MT(4))
    return cv


def flour_cart():
    """A flour handcart (48 x 32, 3 tiles): a plank bed on two tall spoked wheels, sacks heaped on it, two shafts resting on
    the ground, a patch of white where one has leaked."""
    cv = Canvas(48, 32)
    gshadow(cv, 24, 30.5, 22, 2.2, 80)
    # shafts
    for k in range(18):
        cv.set(4 + k, 24 - k // 6, WD(3))
        cv.set(4 + k, 25 - k // 6, WD(1))
    # sacks on the bed
    for (x0, yb, w, h, tone) in ((14, 20, 12, 10, 0), (25, 20, 12, 11, 1), (19, 11, 12, 8, 2)):
        mask = Canvas(48, 32)
        for y in range(yb - h + 1, yb + 1):
            dy = (yb - y) / h
            inset = int(dy * 2.5) if dy > 0.7 else 0
            for x in range(x0 + inset, x0 + w - inset):
                mask.set(x, y, (255, 255, 255, 255))
        ramp = [[PA(1), PA(2), PA(3), SA(2)], [EA(3), PA(1), PA(2), PA(3)], [PA(1), PA(2), SA(1), SA(2)]][tone]
        mask_shade(cv, mask.a[:, :, 3] > 0, ramp, EA(1), tex=lambda x, y: (SA(1) if (x * 5 + y * 3) % 11 == 0 else None))
        cv.set(x0 + w // 2, yb - h, EA(1))
    # the bed
    for x in range(11, 40):
        cv.set(x, 21, WD(4))
        cv.set(x, 22, WD(3))
        cv.set(x, 23, WD(1))
    for x in range(12, 39, 4):
        cv.set(x, 22, WD(1))
    # wheel: 12 px spoked, lit rim, iron tyre
    for (cx, cy) in ((20, 24), (33, 24)):
        ell(cv, cx, cy, 6.2, 6.2, lambda dx, dy, d: None if d < 0.72 else (WD(3) if (-dx - dy) > 0.2 else WD(1)))
        for (dx, dy) in ((0, -5), (0, 5), (-5, 0), (5, 0), (-3, -3), (3, 3), (-3, 3), (3, -3)):
            line_px(cv, cx, cy, cx + dx, cy + dy, WD(2), 1)
        cv.set(cx, cy, MT(2))
        cv.set(cx + 1, cy, MT(1))
        ell(cv, cx, cy, 6.4, 6.4, lambda dx, dy, d: MT(1) if d > 0.93 else None)
    # leaked flour
    for (x, y) in ((24, 29), (25, 29), (26, 29), (25, 30), (30, 30), (31, 30)):
        cv.set(x, y, MT(3))
    return cv


# ====================================================================== assembly
def build_into(sh):
    sh.meta.setdefault("objects", {})
    sh.meta.setdefault('tiles', {})
    # standing stones
    add_obj(sh, 'x1_menhir_a', menhir('a', False, 1), [0, 1], [[0, 0]], note='a standing stone of the ring of twelve (blank)')
    add_obj(sh, 'x1_menhir_b', menhir('b', False, 2), [0, 1], [[0, 0]], note='a shorter leaning stone of the ring (blank)')
    add_obj(sh, 'x1_menhir_lettered', menhir('a', True, 1), [0, 1], [[0, 0]], note='the tall stone with the names cut and glowing (after stones_lettered)')
    add_obj(sh, 'x1_menhir_lettered_b', menhir('b', True, 2), [0, 1], [[0, 0]], note='the leaning stone, lettered')
    alias(sh, 'x1_menhir', 'x1_menhir_a', note='plan id: the ring stone (blank); same art as x1_menhir_a')
    add_obj(sh, 'x1_blank_slab', blank_slab(), [0, 1], [[0, 0]], note='the thirteenth stone: a pale blank slab apart from the ring')
    # the mound
    foot = [[x, dy] for dy in (-1, 0) for x in range(5)]
    add_obj(sh, 'x1_barrow_door_closed', barrow_mound('closed'), [0, 3], foot, overhead=2, kind='building',
            note='the turf mound, doorway sealed by a blank slab (5 tiles wide + shadow column); the door cell (2,0) is solid')
    add_obj(sh, 'x1_barrow_door_open', barrow_mound('open'), [0, 3], [f for f in foot if f != [2, 0]], overhead=2, door=[2, 0],
            kind='building', note='the same mound, doorway open (doorAt (2,0): put the door event there; arrival below it)')
    # hay
    add_obj(sh, 'x1_haystack_a', haystack('a'), [0, 1], [[0, 0], [1, 0]], note='a conical hay rick (2 tiles)')
    add_obj(sh, 'x1_haystack_b', haystack('b'), [0, 1], [[0, 0], [1, 0]], note='a round hay rick under a thatch cap (2 tiles)')
    add_obj(sh, 'x1_haybale', haybale(), [0, 0], [[0, 0]], note='a single hay bale')
    # the scarecrow
    add_obj(sh, 'x1_scarecrow', scarecrow(), [0, 1], [[0, 0]], note='Patch the scarecrow (an Appraise target: eleven pockets)')
    alias(sh, 'x1_old_scarecrow', 'x1_scarecrow', note='plan id for the same scarecrow')
    # the fallen oak and the heavy skins
    add_obj(sh, 'x1_fallen_oak', fallen_oak(), [0, 1], [[0, 0], [1, 0], [2, 0], [3, 0]],
            note='a fallen oak across a track (4 tiles); the crown above the footprint is drawn over actors')
    add_obj(sh, 'x1_drift_log', drift_log(), [0, 1], [[0, 0]], note='heavy-block skin: a bleached drift log standing on end')
    alias(sh, 'x1_driftlog', 'x1_drift_log', note='plan id for the drift log')
    add_obj(sh, 'x1_millstone', millstone(), [0, 1], [[0, 0]], note='heavy-block skin: a millstone lying like a block')
    add_obj(sh, 'x1_cider_barrel', cider_barrel(), [0, 1], [[0, 0]], note='heavy-block skin: an upright cider cask')
    # chain gate
    add_obj(sh, 'x1_chain_gate', chain_gate(False), [0, 1], [[0, 0], [1, 0], [2, 0]],
            note="the drovers' chain across the road (closed: solid, 3 tiles)")
    add_obj(sh, 'x1_chain_gate_open', chain_gate(True), [0, 1], [[0, 0], [2, 0]],
            note='the same posts after the bell: the chain lies in the road, the middle tile is walkable')
    alias(sh, 'x1_drovers_chain', 'x1_chain_gate', note='plan id for the drovers chain gate (closed)')
    # drystone lines (line16)
    for tid, ramp, note in (('x1_drystone', 'cool', 'drystone wall line (grey, mossy): line16 like wall_low'),
                            ('x1_drystone_honey', 'honey', 'drystone wall line (honey) for Larchhill: line16')):
        cv = drystone(ramp)
        x, y = sh.alloc(128, 32)
        sh.cv.paste(cv, x, y)
        sh.meta['tiles'][tid] = {'x': x, 'y': y, 'w': 16, 'h': 16, 'collision': 'solid', 'autotile': 'line16', 'note': note}
    sh.newline()
    add_obj(sh, 'x1_trough', trough(False), [0, 1], [[0, 0], [1, 0]], note='a stock trough with water (2 tiles)')
    add_obj(sh, 'x1_trough_dry', trough(True), [0, 1], [[0, 0], [1, 0]], note='the same trough, dry and stained')
    add_obj(sh, 'x1_flour_sacks', flour_sacks(), [0, 0], [[0, 0], [1, 0]], note='three flour sacks, one split (2 tiles)')
    add_obj(sh, 'x1_sack_stack', sack_stack(), [0, 1], [[0, 0]], note='a stack of flour sacks')
    add_obj(sh, 'x1_flour_cart', flour_cart(), [0, 1], [[0, 0], [1, 0], [2, 0]], note='a handcart of flour sacks (3 tiles)')
    sh.newline()
