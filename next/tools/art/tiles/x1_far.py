"""Far-off decals for the overhead layer (EXPANSION1_PLAN 4.1, 4.12, 4.13; the emberpeak_far and court_far precedent): silhouettes drawn
at horizon scale in a few hazed tones, the foot dithered away so it sits on any ground. All are collision none.

  x1_far_tower      the Watchtower seen from the Downs: a tall broken shaft with one lit slit (64 x 96)
  x1_far_windmill   the Windmill on its hilltop, sails turning (64 x 64, 3 frames: `anim`; the overhead layer draws frame 0)
  x1_far_dome       the Orrery's brass dome catching the light (64 x 64)
"""
import math
from pxlib import Canvas, C, SH, DARK, rnd, h32
from x1_draw import *

FAR = lambda i: [K(3), K(4), K(5), K(2)][i]      # 0 = shadow face, 1 = body, 2 = lit edge, 3 = deep shadow


def _fade_foot(cv, y0, y1):
    """Dither the foot away: from y0 the silhouette thins to a checker, then nothing at y1."""
    for y in range(y0, y1):
        t = (y - y0) / float(max(1, y1 - y0))
        for x in range(cv.w):
            if cv.a[y, x][3] == 0:
                continue
            keep = (x + y) % 2 == 0 if t > 0.34 else True
            if t > 0.66:
                keep = (x % 2 == 0 and y % 2 == 0)
            if t >= 1.0:
                keep = False
            if not keep:
                cv.a[y, x] = (0, 0, 0, 0)


def far_tower():
    cv = Canvas(64, 96)
    # a low spur at the foot, then the shaft: 15 wide, broken top, a lean-to of fallen wall on the right
    for x in range(0, 64):
        top = 78 - int(8 * math.exp(-((x - 30) / 20.0) ** 2)) + (h32(x // 2, 10100) % 2)
        for y in range(top, 92):
            cv.set(x, y, FAR(1) if y > top else FAR(2))
    shaft = (24, 39)
    for x in range(shaft[0], shaft[1]):
        # broken top: a stepped diagonal fracture, high on the left
        top = 10 + int((x - shaft[0]) * 1.5) + (h32(x, 10101) % 2) * 2
        for y in range(top, 80):
            u = (x - shaft[0]) / float(shaft[1] - shaft[0])
            c = FAR(2) if u < 0.55 else FAR(1)
            if y == top or (y == top + 1 and x % 2 == 0):
                c = FAR(2)
            cv.set(x, y, c)
    for y in range(12, 80):
        cv.set(shaft[0], y, FAR(2))
        cv.set(shaft[0] + 1, y, FAR(2) if y % 3 else FAR(0))
    # belts of stone and one lit slit
    for y in (36, 58):
        for x in range(shaft[0] - 1, shaft[1] + 1):
            cv.set(x, y, FAR(2))
    cv.set(30, 24, GD(4))
    cv.set(30, 25, GD(3))
    cv.set(30, 26, GD(2))
    cv.set(34, 46, FAR(3))
    cv.set(34, 47, FAR(3))
    # a lean-to of broken wall and a rubble heap
    for x in range(39, 52):
        top = 48 + (x - 39) * 2
        for y in range(top, 80):
            cv.set(x, y, FAR(1))
        cv.set(x, top, FAR(2))
    for (x, y, w) in ((12, 74, 8), (50, 76, 6), (8, 77, 5)):
        for k in range(w):
            cv.set(x + k, y, FAR(2))
            cv.set(x + k, y + 1, FAR(1))
    _fade_foot(cv, 80, 94)
    return cv


def _hill(cv, cx, top, rx, depth, base_c, lit_c):
    for x in range(int(cx - rx), int(cx + rx) + 1):
        u = (x - cx) / float(rx)
        t = int(top + (depth) * (u * u) ** 0.9)
        for y in range(t, 62):
            cv.set(x, y, lit_c if y == t else base_c)


def far_windmill(frame):
    cv = Canvas(64, 64)
    HZ = lambda i: [K(2), K(3), K(4), MT(2)][i]
    _hill(cv, 32, 40, 30, 16, K(3), K(4))
    for x in range(10, 54):
        if h32(x, 10110) % 4 == 0:
            cv.set(x, 52 + h32(x, 10111) % 3, IK(1))
    # tower: a slim trapezoid
    for y in range(24, 44):
        t = (y - 24) / 19.0
        half = 3.0 + 3.0 * t
        for x in range(int(32 - half), int(32 + half) + 1):
            cv.set(x, y, HZ(3) if x < 32 else HZ(2))
        cv.set(int(32 + half), y, HZ(1))
    for x in range(26, 39):
        cv.set(x, 43, K(1))
    # cap
    for y in range(18, 24):
        half = 1 + (y - 18) * 0.8
        for x in range(int(32 - half), int(32 + half) + 1):
            cv.set(x, y, RR(3) if x < 32 else RR(1))
    # the sails: four sticks and a pale lattice, turning in 3 steps
    rot = math.radians(frame * 30.0 + 12.0)
    for k in range(4):
        a = rot + k * math.pi / 2
        ca, sa = math.cos(a), math.sin(a)
        for r in range(2, 18):
            cv.set(int(round(32 + r * ca)), int(round(26 + r * sa)), WD(2))
        for r in range(5, 17):
            for w in (1, 2, 3):
                cv.set(int(round(32 + r * ca - w * sa)), int(round(26 + r * sa + w * ca)), MT(3) if (r + w) % 2 else MT(2))
    cv.set(32, 26, GD(4))
    _fade_foot(cv, 52, 63)
    return cv


def far_dome():
    cv = Canvas(64, 64)
    _hill(cv, 32, 44, 30, 14, K(3), K(4))
    # a drum and a dome catching the light
    for y in range(28, 46):
        for x in range(22, 43):
            u = (x - 32) / 10.5
            cv.set(x, y, K(3) if u < -0.2 else (K(2) if u < 0.5 else K(1)))
        cv.set(22, y, K(1))
    for y in range(12, 29):
        t = (28 - y) / 16.0
        half = 11 * math.sqrt(max(0.0, 1 - t * t))
        for x in range(int(32 - half), int(32 + half) + 1):
            u = (x - 32) / max(half, 1)
            tt = -0.6 * u + 0.5 * t
            c = GD(5) if tt > 0.55 else (GD(4) if tt > 0.25 else (GD(3) if tt > -0.1 else GD(2)))
            if abs(u) > 0.92:
                c = GD(1)
            cv.set(x, y, c)
    cv.set(32, 10, GD(3))
    cv.set(32, 9, GD(5))
    # the glint: a white cross flare on the lit shoulder
    for (dx, dy, c) in ((0, 0, ICE(3)), (-1, 0, GD(5)), (1, 0, GD(5)), (0, -1, GD(5)), (0, 1, GD(5)), (-2, 0, GD(4)), (2, 0, GD(4))):
        cv.set(26 + dx, 17 + dy, c)
    for x in range(21, 44):
        cv.set(x, 28, K(4))
    _fade_foot(cv, 46, 63)
    return cv


def build_into(sh):
    sh.meta.setdefault('tiles', {})
    add_tile(sh, 'x1_far_tower', far_tower(), collision='none',
             note='96 high decal: the Watchtower seen from afar (overhead layer, horizon scale)')
    frames = [far_windmill(i) for i in range(3)]
    s = strip_frames(frames)
    x, y = sh.alloc(s.w, s.h)
    sh.cv.paste(s, x, y)
    sh.meta['tiles']['x1_far_windmill'] = {'x': x, 'y': y, 'w': 64, 'h': 64, 'collision': 'none',
                                          'anim': {'frames': [0, 1, 2], 'frameDx': 64, 'ms': 420},
                                          'note': 'the Windmill on its hilltop, 64 x 64, sails in 3 frames (the overhead layer draws frame 0)'}
    add_tile(sh, 'x1_far_dome', far_dome(), collision='none',
             note="64 x 64 decal: the Orrery's brass dome catching the light, far off")
    sh.newline()
