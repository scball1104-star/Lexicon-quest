"""The wide-map kits (EXPANSION1_PLAN 4.12, 4.13, 10.1): the High Moor and Larchhill objects.

Moor:      x1_chimepost_1..9 (16 x 32, two sway frames), x1_gorse_a/_b, x1_roots_gorse, x1_boulder_a/_b, x1_stile and
           x1_roots_stile, x1_cairn_moor
Larchhill: x1_tree_apple, x1_tree_apple_b (blossom), x1_tree_plum, x1_bush_berry, x1_bush_plum, x1_hive, x1_hive_row, x1_cider_press,
           x1_hay_chute (a tile), x1_ladder, x1_armillary_statue
Buildings (turf hut, watchtower, windmill, the mill, the cottages) are in x1_bld.py; the far decals in x1_far.py.
"""
import math
from pxlib import Canvas, C, SH, DARK, rnd, h32
from x1_draw import *


# ====================================================================== chime posts
# nine variants: tube count / length / material and the trimmings differ, so nine posts are nine landmarks on the same road
POSTS = [
    dict(n=3, lens=(8, 11, 6), mat='wood', cord=RR(2), base='tuft'),
    dict(n=2, lens=(10, 7), mat='bone', cord=EA(3), base='cairn'),
    dict(n=4, lens=(6, 9, 11, 7), mat='wood', cord=CB(3), base='tuft'),
    dict(n=3, lens=(11, 8, 10), mat='dark', cord=SA(2), base='tuft'),
    dict(n=2, lens=(8, 12), mat='wood', cord=GD(2), base='cairn'),
    dict(n=5, lens=(5, 8, 11, 8, 5), mat='bone', cord=RR(3), base='tuft'),
    dict(n=3, lens=(9, 6, 9), mat='dark', cord=GR(3), base='cairn'),
    dict(n=4, lens=(10, 7, 12, 8), mat='wood', cord=CP(3), base='tuft'),
    dict(n=1, lens=(14,), mat='brass', cord=RR(3), base='cairn'),          # the ninth: KEPT, a single great bell-tube
]
MATS = {'wood': [WD(1), WD(2), WD(3), WD(4)], 'bone': [K(3), K(4), SA(2), SA(3)], 'dark': [WD(0), WD(1), WD(2), WD(3)],
        'brass': [GD(1), GD(2), GD(3), GD(4)]}


def chimepost(i, frame):
    p = POSTS[i]
    cv = Canvas(16, 32)
    gshadow(cv, 10, 30.5, 6.5, 1.8, 84)
    # the post: grey-brown wood, weathered, a rope-bound crossarm
    for y in range(7, 30):
        cv.set(7, y, WD(3))
        cv.set(8, y, WD(2))
        cv.set(9, y, WD(1))
        if (y + i) % 6 == 0:
            cv.set(7, y, WD(2))
    for x in range(3, 14):
        cv.set(x, 5, WD(4) if x < 8 else WD(3))
        cv.set(x, 6, WD(2))
        cv.set(x, 7, WD(1))
    cv.set(7, 4, WD(4))
    cv.set(8, 4, WD(3))
    # the stand: a small cairn or a heather tuft
    if p['base'] == 'cairn':
        for (x0, y0, w, t) in ((4, 28, 9, 3), (5, 25, 7, 4), (6, 23, 5, 3)):
            for k in range(w):
                cv.set(x0 + k, y0, K(4) if k < w // 2 else K(3))
                cv.set(x0 + k, y0 + 1, K(3) if k < w // 2 else K(2))
            if y0 + 2 < 31:
                for k in range(w):
                    cv.set(x0 + k, y0 + 2, K(1) if t > 3 else K(2))
        cv.set(6, 27, K(5))
        cv.set(10, 24, K(5))
    else:
        tuft(cv, 6, 30, RP(3), HV(3))
        tuft(cv, 11, 30, GR(2), RP(2))
    # the chimes: hang from the crossarm on cords; frame 1 sways one pixel
    sway = 0 if frame == 0 else 1
    mat = MATS[p['mat']]
    n = p['n']
    span = min(9, 3 + n * 2)
    x0 = 8 - span // 2 + (0 if n > 1 else 0)
    for k in range(n):
        hx = x0 + (k * span) // max(1, n - 1) if n > 1 else 8
        L = p['lens'][k]
        w = 3 if p['mat'] != 'brass' else 4
        bx = hx + (sway if k % 2 == 0 else -sway * 0)
        # cord
        for y in range(7, 10):
            cv.set(hx + (sway if y > 8 else 0), y, p['cord'])
        top = 10
        for y in range(top, top + L):
            xs = bx - w // 2 + (sway if y > top + L // 2 else 0)
            cv.set(xs, y, mat[3])
            for dx in range(1, w - 1):
                cv.set(xs + dx, y, mat[2])
            cv.set(xs + w - 1, y, mat[0])
            if p['mat'] == 'brass':
                cv.set(xs + w - 2, y, mat[1])
        # ring bands and the open mouth
        mid = top + L // 2
        for dx in range(-(w // 2), w - w // 2):
            cv.set(bx + dx + (sway if mid > top + L // 2 else 0), mid, mat[1])
            cv.set(bx + dx + sway, top + L, DARK)
        cv.set(bx - w // 2 + sway, top + L - 1, mat[1])
    # a clapper line for the ninth and a gold ribbon
    if p['mat'] == 'brass':
        for y in range(7, 12):
            cv.set(6 + (sway if y > 9 else 0), y, RR(3))
            cv.set(5 + (sway if y > 9 else 0), y + 1, RR(2))
        cv.set(8 + sway, 24, GD(5))
    return cv


# ====================================================================== gorse, boulders
def gorse(big=False):
    w, h = (32, 16) if big else (16, 16)
    cv = Canvas(w, h)
    gshadow(cv, w / 2 + 2, h - 1.5, w / 2 - 1, 1.6, 80)
    lobes = [(8, 9, 7, 6)] if not big else [(9, 9, 8, 6), (22, 9, 8, 6), (16, 7, 7, 5)]
    for (cx, cy, rx, ry) in lobes:
        ell(cv, cx, cy, rx, ry, lambda dx, dy, d: FD(0) if d > 0.88 else (GR(3) if (-0.55 * dx - 0.8 * dy) > 0.45 else (GR(2) if (-0.4 * dx - 0.6 * dy) > -0.15 else GR(1))))
    # spikes and a scatter of yellow flowers
    for i in range(34 if big else 17):
        x = 1 + h32(i, 9800) % (w - 3)
        y = 3 + h32(i, 9801) % 10
        if cv.get(x, y)[3] and cv.get(x, y) not in (FD(0),):
            cv.set(x, y, GD(5) if i % 3 == 0 else (GD(4) if i % 3 == 1 else GD(3)))
    for i in range(10 if big else 5):
        x = 1 + h32(i, 9802) % (w - 3)
        y = 2 + h32(i, 9803) % 4
        if cv.get(x, y)[3]:
            cv.set(x, y - 1, FD(1))
    return cv


def roots_gorse():
    """A gorse tunnel choked with thin roots (16 x 32 stand-in for the breakable): roots over dark gorse."""
    cv = Canvas(16, 32)
    gshadow(cv, 9, 30.5, 7, 1.6, 80)
    for y in range(4, 30):
        for x in range(1, 15):
            dx = (x - 7.5) / 7.0
            if abs(dx) > 1 - (0.25 if y < 9 else 0.0):
                continue
            c = FD(0) if (x + y) % 3 else FD(1)
            if h32(x, y, 9810) % 7 == 0:
                c = GR(1)
            if h32(x, y, 9811) % 13 == 0:
                c = GD(4)
            cv.set(x, y, c)
    for (x0, y0, x1, y1) in ((1, 6, 14, 12), (2, 14, 13, 8), (1, 24, 14, 18), (4, 4, 6, 28), (10, 4, 8, 28)):
        line_px(cv, x0, y0, x1, y1, EA(3))
        line_px(cv, x0 + 1, y0, x1 + 1, y1, EA(1))
    return cv


def boulder(big=False):
    w, h = (32, 32) if big else (16, 16)
    cv = Canvas(w, h)
    gshadow(cv, w / 2 + 2, h - 1.5, w / 2 - 1, 1.8, 84)
    lobes = [(10, 20, 9, 8), (22, 22, 8, 6), (15, 12, 8, 8)] if big else [(8, 9, 7, 5.5)]
    for (cx, cy, rx, ry) in lobes:
        ell(cv, cx, cy, rx, ry, lambda dx, dy, d: K(0) if d > 0.88 else (K(5) if (-0.55 * dx - 0.8 * dy) > 0.5 else (K(4) if (-0.4 * dx - 0.6 * dy) > 0.0 else (K(3) if (-0.3 * dx - 0.4 * dy) > -0.4 else K(2)))))
    for i in range(10 if big else 4):
        x = 2 + h32(i, 9820) % (w - 4)
        y = 2 + h32(i, 9821) % (h - 5)
        c = cv.get(x, y)
        if c[3] and c != K(0):
            cv.set(x, y, RG(3) if i % 2 else GD(2))          # lichen: green and orange
    tuft(cv, 3, h - 1, GR(3), GR(1))
    return cv


def cairn_moor():
    cv = Canvas(16, 32)
    gshadow(cv, 9, 30.5, 7, 1.8, 84)
    for (cx, cy, rx, ry, t) in ((8, 28, 7, 3, 2), (8, 24, 6, 2.8, 3), (8, 20, 5, 2.5, 2), (8, 16.5, 4, 2.2, 3), (8, 13.5, 2.8, 1.8, 4)):
        ell(cv, cx, cy, rx, ry, lambda dx, dy, d, t=t: K(0) if d > 0.9 else (K(min(5, t + 2)) if dy < -0.3 else (K(t) if dy < 0.35 else K(max(0, t - 1)))))
    cv.set(7, 12, K(5))
    cv.set(8, 12, MT(3))
    tuft(cv, 3, 30, RP(3), HV(3))
    tuft(cv, 13, 30, GR(2), GR(1))
    return cv


# ====================================================================== the stile
def stile(roots=False):
    """The Keepers' stone stile (48 x 32, 3 tiles): two dressed posts and a worn step stone between them (the middle tile is
    the way through). roots=True: thin roots choke the gap (the stand-in for the breakable), the step half hidden."""
    cv = Canvas(48, 32)
    gshadow(cv, 25, 30.5, 22, 2.0, 80)
    for (x0, x1) in ((2, 12), (35, 45)):
        blk(cv, x0, 8, x1, 30, K(5), K(3), K(2), K(0))
        for y in range(12, 28, 5):
            for x in range(x0 + 2, x1 - 1):
                cv.set(x, y, K(1) if (x + y) % 3 else K(2))
        # a star carved on the face (the Keepers' mark) and a chamfered cap
        cx = (x0 + x1) // 2
        for (dx, dy) in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            cv.set(cx + dx, 18 + dy, K(5) if dx + dy < 0 else K(1))
        blk(cv, x0 - 1, 5, x1 + 1, 9, K(5), K(4), K(2), K(0))
    # the step: a slab in the gap
    blk(cv, 17, 24, 30, 30, K(5), K(4), K(3), K(0))
    for x in range(19, 29):
        cv.set(x, 27, K(3) if x % 3 else K(4))
    tuft(cv, 4, 31, GR(3), GR(2))
    tuft(cv, 43, 31, GR(3), GR(1))
    if roots:
        for k in range(10):
            x = 15 + (h32(k, 9830) % 18)
            line_px(cv, x, 6 + (k % 3), x + (k % 5) - 2, 29, EA(3) if k % 2 else EA(2))
            line_px(cv, x + 1, 6 + (k % 3), x + (k % 5) - 1, 29, EA(1))
        for (x, y) in ((15, 14), (32, 12), (22, 20), (28, 17)):
            for k in range(5):
                cv.set(x + k, y + (k % 2), EA(3))
        for (x, y) in ((18, 9), (25, 8), (30, 10), (21, 26), (27, 25)):
            cv.set(x, y, RG(3))
    return cv


# ====================================================================== orchard trees and bushes
def crown(cv, lobes, tones, edge, seed):
    """A leafy crown from overlapping lobes drawn back to front (upper lobes first): each lobe is lit top-left with a dark
    underside, so the crown reads as a cluster of leaf masses."""
    for (cx, cy, rx, ry) in sorted(lobes, key=lambda l: l[1]):
        def fn(dx, dy, d, rx=rx, ry=ry):
            if d > 0.9:
                return edge
            t = -0.55 * dx - 0.85 * dy - d * 0.2
            if t > 0.6:
                return tones[3]
            if t > 0.15:
                return tones[2]
            if t > -0.4:
                return tones[1]
            return tones[0]
        ell(cv, cx, cy, rx, ry, fn)
    # speckle: light leaves on the lit tops and dark gaps in the shade
    for i in range(70):
        x = 4 + h32(i, seed) % (cv.w - 8)
        y = 2 + h32(i, seed + 1) % (cv.h - 6)
        c = cv.get(x, y)
        if c in (tones[1], tones[2]):
            cv.set(x, y, tones[3] if (i % 3 == 0) else tones[0])


def fruit_tree(kind):
    cv = Canvas(48, 64)
    gshadow(cv, 27, 61.5, 15, 2.6, 88)
    # trunk and a fork
    for y in range(34, 60):
        w = 6 if y > 44 else 5
        x0 = 24 - w // 2
        for k in range(w):
            c = WD(4) if k == 0 else (WD(3) if k < w - 2 else (WD(2) if k < w - 1 else WD(1)))
            if (y + k * 2) % 7 == 0:
                c = WD(2) if c != WD(1) else c
            cv.set(x0 + k, y, c)
    for (x, y) in ((20, 59), (21, 60), (27, 59), (28, 60), (19, 58)):
        cv.set(x, y, WD(2) if x < 24 else WD(1))
    line_px(cv, 24, 40, 17, 34, WD(2), 2)
    line_px(cv, 25, 40, 31, 33, WD(2), 2)
    if kind == 'plum':
        tones = [RG(1), RG(2), RG(3), RG(4)]
        edge = FD(0)
    else:
        tones = [GR(1), GR(2), GR(3), GR(4)]
        edge = FD(0)
    lobes = [(24, 14, 12, 9), (14, 22, 11, 9), (34, 22, 11, 9), (24, 26, 14, 9), (10, 31, 8, 6), (38, 31, 8, 6), (24, 33, 11, 6)]
    crown(cv, lobes, tones, edge, 9900 if kind != 'plum' else 9910)
    # fruit and blossom
    spots = [(14, 20), (22, 12), (29, 17), (35, 24), (20, 27), (28, 30), (11, 29), (40, 29), (24, 21), (17, 14), (33, 12), (31, 35), (16, 34)]
    for i, (x, y) in enumerate(spots):
        if kind == 'apple':
            cv.set(x, y, RR(3))
            cv.set(x + 1, y, RR(3))
            cv.set(x, y + 1, RR(2))
            cv.set(x + 1, y + 1, RR(1))
            cv.set(x, y - 1 if False else y, RR(4))
        elif kind == 'plum':
            cv.set(x, y, CP(4))
            cv.set(x + 1, y, CP(3))
            cv.set(x, y + 1, CP(2))
            cv.set(x + 1, y + 1, CP(1))
            cv.set(x, y, CP(5))
        else:
            # blossom: pale pink-white clusters
            cv.set(x, y, BL(3))
            cv.set(x + 1, y, MT(4))
            cv.set(x, y + 1, BL(2))
            cv.set(x + 1, y - 1, BL(3))
    if kind == 'blossom':
        for i in range(30):
            x = 6 + h32(i, 9920) % 36
            y = 4 + h32(i, 9921) % 34
            if cv.get(x, y)[3] and cv.get(x, y) not in (FD(0),):
                cv.set(x, y, BL(3) if i % 2 else MT(4))
    return cv


def bush_berry(kind):
    cv = Canvas(16, 16)
    gshadow(cv, 9, 14.5, 6.5, 1.5, 80)
    tones = [GR(1), GR(2), GR(3), GR(4)] if kind != 'plum' else [RG(1), RG(2), RG(3), RG(4)]
    crown(cv, [(8, 8, 7, 6), (4, 10, 4, 4), (12, 10, 4, 4)], tones, FD(0), 9930)
    for (x, y) in ((4, 8), (9, 6), (12, 10), (7, 11), (5, 12)):
        col = (RR(3), RR(2)) if kind != 'plum' else (CP(4), CP(2))
        cv.set(x, y, col[0])
        cv.set(x, y + 1, col[1])
    return cv


# ====================================================================== hives, the press, the chute
def hive(frame):
    """A white beehive (16 x 32): three painted supers on a legged stand under a tiny pitched roof, a dark entrance slot, bees
    drifting (two frames)."""
    cv = Canvas(16, 32)
    gshadow(cv, 9, 30.5, 6.5, 1.6, 80)
    for x0 in (3, 12):
        for y in range(25, 30):
            cv.set(x0, y, WD(3))
            cv.set(x0 + 1, y, WD(1))
    for x in range(2, 15):
        cv.set(x, 24, WD(4) if x < 8 else WD(2))
        cv.set(x, 25, WD(1))
    for k, y0 in enumerate((17, 10)):
        blk(cv, 3, y0, 13, y0 + 6, MT(4), MT(3), MT(2), K(1))
        for x in range(4, 12):
            cv.set(x, y0 + 3, MT(2) if x % 2 else MT(3))
    blk(cv, 3, 17, 13, 23, MT(4), MT(3), MT(2), K(1))
    for x in range(5, 11):
        cv.set(x, 21, DARK)
    # the roof
    for y in range(4, 10):
        half = 3 + (y - 4)
        for x in range(8 - half, 8 + half + 1):
            cv.set(x, y, WD(4) if x < 8 else WD(3))
        cv.set(8 - half, y, WD(1))
        cv.set(8 + half, y, WD(1))
    for x in range(1, 16):
        cv.set(x, 10, WD(1))
    cv.set(8, 3, WD(5))
    # bees
    bees = [[(5, 15), (11, 12), (2, 19)], [(6, 14), (10, 13), (13, 20)]][frame % 2]
    for (x, y) in bees:
        cv.set(x, y, GD(4))
        cv.set(x + 1, y, DARK)
    return cv


def hive_row(frame):
    cv = Canvas(32, 32)
    for (x, dx) in ((0, 0), (16, 0)):
        h = hive(frame if x == 0 else 1 - frame)
        cv.blit(h, x, 0)
    return cv


def cider_press():
    """The cider press (48 x 48, 3 tiles): a slatted oak cage on a stone bed, a great wooden screw with a cross-bar, a gutter and a
    bucket, a heap of apples."""
    cv = Canvas(48, 48)
    gshadow(cv, 26, 46.5, 21, 2.4, 90)
    # stone bed with a lip
    blk(cv, 3, 34, 44, 44, K(5), K(3), K(2), K(0))
    for x in range(5, 42, 6):
        cv.set(x, 38, K(2))
        cv.set(x + 1, 41, K(2))
    # the cage: oak slats
    for y in range(18, 35):
        for x in range(10, 33):
            k = (x - 10) % 4
            c = WD(4) if k == 0 else (WD(3) if k < 3 else WD(1))
            cv.set(x, y, c)
    for y in (17, 25, 33):
        for x in range(9, 34):
            cv.set(x, y, MT(1))
            cv.set(x, y + 1, MT(0)) if y < 33 else None
    # frame and screw
    for x0 in (7, 33):
        for y in range(5, 36):
            cv.set(x0, y, WD(4))
            cv.set(x0 + 1, y, WD(3))
            cv.set(x0 + 2, y, WD(1))
    for x in range(7, 36):
        cv.set(x, 5, WD(4))
        cv.set(x, 6, WD(2))
        cv.set(x, 7, WD(1))
    for y in range(7, 22):
        cv.set(20, y, WD(4))
        cv.set(21, y, WD(3))
        cv.set(22, y, WD(2))
        cv.set(23, y, WD(1))
        if y % 3 == 0:
            for dx in range(4):
                cv.set(20 + dx, y, WD(1))
    for x in range(11, 33):
        cv.set(x, 12, WD(3) if x not in (20, 21, 22, 23) else WD(4))
        cv.set(x, 13, WD(1))
    # gutter and bucket
    for x in range(30, 45):
        cv.set(x, 41, WD(2))
        cv.set(x, 42, WD(1))
    poly_fill(cv, [(36, 36), (45, 36), (44, 46), (37, 46)], lambda x, y: WD(3) if x < 41 else WD(2))
    for x in range(37, 45):
        cv.set(x, 36, MT(2))
    for x in range(37, 44):
        cv.set(x, 37, GD(3))
    for x in range(36, 46):
        cv.set(x, 40, MT(1))
    # apples heaped at the left
    for (x, y) in ((2, 44), (5, 45), (8, 44), (3, 41), (6, 42), (1, 46)):
        ell(cv, x + 2, y, 2.6, 2.4, lambda dx, dy, d: RR(1) if d > 0.8 else (RR(4) if (-dx - dy) > 0.2 else RR(3)))
    return cv


def hay_chute():
    """The hay chute (32 x 32 tile): a plank trough sloping off the terrace edge, straw on it, a post at each side."""
    cv = Canvas(32, 32)
    for y in range(2, 30):
        w = 10 + (y - 2) * 0.3
        for x in range(int(16 - w / 2), int(16 + w / 2)):
            c = WD(3) if (x + y // 4) % 5 else WD(2)
            if y % 7 == 0:
                c = WD(1)
            if x == int(16 - w / 2):
                c = WD(4)
            if x == int(16 + w / 2) - 1:
                c = WD(1)
            cv.set(x, y, c)
    for i in range(80):
        x = 9 + h32(i, 9940) % 14
        y = 3 + h32(i, 9941) % 26
        if abs(x - 16) < 5 + (y - 2) * 0.15:
            cv.set(x, y, SA(2) if i % 3 else SA(3))
    for x0 in (7, 24):
        for y in range(0, 12):
            cv.set(x0, y, WD(1))
            cv.set(x0 + 1, y, WD(3))
            cv.set(x0 + 2, y, WD(2))
    return cv


def ladder():
    cv = Canvas(16, 32)
    gshadow(cv, 9, 30.5, 5, 1.4, 70)
    for x in (4, 11):
        for y in range(1, 30):
            cv.set(x, y, WD(4))
            cv.set(x + 1, y, WD(2))
    for y in range(4, 29, 4):
        for x in range(5, 11):
            cv.set(x, y, WD(3))
            cv.set(x, y + 1, WD(1))
    return cv


def armillary_statue():
    """The Keepers' armillary statue (32 x 48, 2 tiles) on the Terrace court: a weathered stone plinth, a verdigris copper armillary
    sphere with a broken ring, moss in its joints."""
    cv = Canvas(32, 48)
    gshadow(cv, 18, 46.5, 14, 2.4, 90)
    blk(cv, 6, 30, 26, 46, K(5), K(3), K(2), K(0))
    blk(cv, 3, 41, 29, 46, K(5), K(3), K(1), K(0))
    for y in range(33, 40):
        for x in range(8, 25):
            if h32(x, y, 9950) % 9 == 0:
                cv.set(x, y, RG(3))
    # a star cut on the plinth
    for (dx, dy) in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        cv.set(16 + dx, 36 + dy, K(1) if dx + dy >= 0 else K(5))
    for y in range(24, 30):
        cv.set(15, y, RG(2))
        cv.set(16, y, RG(3))
        cv.set(17, y, RG(1))
    cx, cy = 16, 14

    def ring(rx, ry, rot, gap=None):
        for k in range(100):
            a = k / 100 * 2 * math.pi
            if gap and gap[0] < a < gap[1]:
                continue
            x = rx * math.cos(a)
            y = ry * math.sin(a)
            xr = x * math.cos(rot) - y * math.sin(rot)
            yr = x * math.sin(rot) + y * math.cos(rot)
            lit_side = (-math.cos(a - rot) - math.sin(a - rot)) > 0
            cv.set(int(round(cx + xr)), int(round(cy + yr)), RG(4) if lit_side else RG(2))
            cv.set(int(round(cx + xr)), int(round(cy + yr)) + 1, RG(3) if lit_side else RG(1))
    ring(12, 12, 0.0)
    ring(12, 4.5, 0.0, gap=(4.0, 5.0))
    ring(4.5, 12, 0.0)
    ring(12, 5.5, math.pi / 5)
    ell(cv, cx, cy, 3, 3, lambda dx, dy, d: GD(1) if d > 0.75 else (GD(4) if (-dx - dy) > 0 else GD(3)))
    return cv


# ====================================================================== assembly
def build_into(sh):
    sh.meta.setdefault('objects', {})
    sh.meta.setdefault('tiles', {})
    for i in range(9):
        extra = ' (the ninth reads KEPT: one great brass bell-tube, a red ribbon)' if i == 8 else ''
        add_obj(sh, 'x1_chimepost_%d' % (i + 1), [chimepost(i, 0), chimepost(i, 1)], [0, 1], [[0, 0]], anim=([0, 1], 640),
                note='High Moor chime post %d of 9: a post with a hanging wooden chime, two sway frames%s' % (i + 1, extra))
    add_obj(sh, 'x1_gorse_a', gorse(False), [0, 0], [[0, 0]], note='a gorse bush in flower (16 x 16)')
    add_obj(sh, 'x1_gorse_b', gorse(True), [0, 0], [[0, 0], [1, 0]], note='a gorse clump in flower (32 x 16, 2 tiles)')
    add_obj(sh, 'x1_roots_gorse', roots_gorse(), [0, 1], [[0, 0]],
            note='a gorse tunnel choked with thin roots (the stand-in for the Dash breakable x1_roots_gorse)')
    add_obj(sh, 'x1_boulder_a', boulder(False), [0, 0], [[0, 0]], note='a grey boulder with lichen (16 x 16)')
    add_obj(sh, 'x1_boulder_b', boulder(True), [0, 1], [[0, 0], [1, 0]], note='a cluster of crag boulders (32 x 32, 2 tiles)')
    add_obj(sh, 'x1_cairn_moor', cairn_moor(), [0, 1], [[0, 0]], note='a plain waymark cairn for the moor')
    add_obj(sh, 'x1_stile', stile(False), [0, 1], [[0, 0], [2, 0]], note="the Keepers' stone stile (3 tiles, the middle one is the way through)")
    add_obj(sh, 'x1_roots_stile', stile(True), [0, 1], [[0, 0], [1, 0], [2, 0]],
            note='the same stile choked with thin roots (Dash breakable stand-in; solid across)')
    # larchhill
    add_obj(sh, 'x1_tree_apple', fruit_tree('apple'), [1, 3], [[0, 0]], note='an apple tree in fruit (48 x 64; footprint the trunk tile)')
    add_obj(sh, 'x1_tree_apple_b', fruit_tree('blossom'), [1, 3], [[0, 0]], note='an apple tree in late blossom')
    add_obj(sh, 'x1_tree_plum', fruit_tree('plum'), [1, 3], [[0, 0]], note='a plum tree in fruit')
    add_obj(sh, 'x1_bush_berry', bush_berry('berry'), [0, 0], [[0, 0]], note='a currant bush with red berries (16 x 16)')
    add_obj(sh, 'x1_bush_plum', bush_berry('plum'), [0, 0], [[0, 0]], note='a damson bush (16 x 16)')
    add_obj(sh, 'x1_hive', [hive(0), hive(1)], [0, 1], [[0, 0]], anim=([0, 1], 360), note='a white beehive with bees (16 x 32)')
    add_obj(sh, 'x1_hive_row', [hive_row(0), hive_row(1)], [0, 1], [[0, 0], [1, 0]], anim=([0, 1], 360), note='two white hives side by side (2 tiles)')
    add_obj(sh, 'x1_cider_press', cider_press(), [0, 2], [[0, 0], [1, 0], [2, 0]], note='the cider press (48 x 48, 3 tiles)')
    add_tile(sh, 'x1_hay_chute', hay_chute(), collision='none', note='the hay chute (32 x 32 decor tile): the pit area event sits on it')
    add_obj(sh, 'x1_ladder', ladder(), [0, 1], [[0, 0]], note='a ladder against a wall (16 x 32)')
    alias(sh, 'x1_mill_ladder', 'x1_ladder', note='plan id: the windmill ladder; same art as x1_ladder')
    add_obj(sh, 'x1_armillary_statue', armillary_statue(), [0, 2], [[0, 0], [1, 0]], note="the Keepers' armillary statue on the Terrace (32 x 48)")
    sh.newline()
