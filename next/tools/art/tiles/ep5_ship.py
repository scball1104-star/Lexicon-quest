"""The Saffron Wind (Episode 5): the ship's deck kit and the moored ship prop -> ep5.png (E5-tiles, EPISODE5_PLAN 4.1, 9.1).
Imported by ep5.py. The deck itself is the deck_planks terrain and the sea at its edges night_sea (ep5_kit.py).

  ship_rail       line16, solid: a copper-capped wooden rail along the deck's edge (index N*1+E*2+S*4+W*8)
  mast            2 x 6 (32 x 96): the mast with its furled saffron sail and a yard; the base cell solid, the rest overhead
  ship_lantern    16 x 32 on a post, anim 3, light
  crate_lashed    16 x 32 a cloth-wrapped crate lashed with rope; crates_lashed 32 x 32 a stack of two
  hatch           32 x 32 a deck hatch (decor, solid)
  ship_wheel      16 x 32 the helm (Yara's wheel)
  gangway         16 x 32 door kind: the plank down to the jetty (doorAt (0, 0))
  ship_moored     96 x 64: the Saffron Wind seen from the quay, frames 0 = sail furled (moored), 1 = sail set (sailing);
                  the Valewyn berth and the Haven's water stairs use the same sprite
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32
from court_props import put_frames, ellipse, glow
from ep5_kit import SA, PA, GD, FI, EA, WD, RB, WA, IC, MT, SD, RR, OC
from ep5_props import slab, contact_shadow, R
from ep5_town import line16


def sail_px(x, y, furled):
    return GD(3) if (x + y // 2) % 6 else GD(2)


def rail_tile(n, e, s, w):
    cv = Canvas(16, 16)
    top = 5
    if w or e or not (n or s):
        x0, x1 = (0 if w else 4), (16 if e else 12)
        for x in range(x0, x1):
            cv.set(x, top, GD(4)); cv.set(x, top + 1, GD(2))
            cv.set(x, top + 2, WD(3)); cv.set(x, top + 3, WD(2)); cv.set(x, top + 4, WD(1))
            cv.put(x, top + 5, SH(90))
        for x in range(x0 + 2, x1, 6):
            for y in range(top + 2, 15):
                cv.set(x, y, WD(4) if y < 12 else WD(2)); cv.set(x + 1, y, WD(1))
    if n or s:
        y0, y1 = (0 if n else top), (16 if s else top + 5)
        for y in range(y0, y1):
            cv.set(6, y, GD(4)); cv.set(7, y, GD(3)); cv.set(8, y, WD(3)); cv.set(9, y, WD(1))
            cv.put(10, y, SH(80))
    return cv


def mast():
    cv = Canvas(32, 96)
    ellipse(cv, 17, 93, 8, 2.5, lambda dx, dy, d: SH(100))
    # the mast: a tall spar
    for y in range(4, 94):
        cv.set(15, y, WD(4)); cv.set(16, y, WD(3)); cv.set(17, y, WD(1))
        if y % 18 == 0:
            for x in range(14, 19):
                cv.set(x, y, GD(3))
    # the yard with the furled saffron sail bundled along it
    for x in range(1, 31):
        cv.set(x, 20, WD(3)); cv.set(x, 21, WD(1))
    for x in range(2, 30):
        for y in range(22, 28):
            t = abs(x - 16) / 14.0
            if y - 22 > 5 - t * 3:
                continue
            c = GD(4) if y == 22 else (GD(3) if (x + y) % 5 else GD(2))
            if (x - 2) % 7 == 0:
                c = EA(1)
            cv.set(x, y, c)
    # rigging lines down to the deck
    for (x0, y0, x1, y1) in ((2, 21, 6, 92), (30, 21, 26, 92), (16, 4, 2, 21), (16, 4, 30, 21)):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for k in range(n):
            if k % 2 == 0:
                cv.set(x0 + round((x1 - x0) * k / n), y0 + round((y1 - y0) * k / n), EA(2))
    # a pennant at the top
    for i in range(7):
        for j in range(3 - i // 3):
            cv.set(18 + i, 4 + j + i // 3, FI(3) if j == 0 else RR(3))
    # the mast foot: a collar and wedges on the deck
    slab(cv, 11, 21, 86, 93, WD(4), WD(3), WD(2), WD(0))
    for x in range(12, 21, 3):
        cv.set(x, 88, GD(3))
    return cv


def ship_lantern(fr):
    cv = Canvas(16, 32)
    contact_shadow(cv, 4, 12, 31)
    R(cv, 7, 12, 2, 19, WD(2)); cv.set(7, 12, WD(4))
    R(cv, 3, 3, 10, 10, GD(1))
    core = [GD(4), WHITE, GD(5)][fr % 3]
    R(cv, 4, 4, 8, 8, FI(4)); R(cv, 5, 5, 6, 6, core)
    for x in range(3, 13):
        cv.set(x, 2, GD(2))
    cv.set(7, 1, GD(3)); cv.set(8, 1, GD(3))
    R(cv, 3, 8, 10, 1, GD(1)); R(cv, 7, 3, 2, 10, GD(1))
    return cv


def crate_lashed(stack=False):
    w = 32 if stack else 16
    cv = Canvas(w, 32)
    contact_shadow(cv, 1, w - 2, 31)
    boxes = [(1, 17, 14, 13)] if not stack else [(1, 17, 14, 13), (17, 19, 13, 11), (8, 6, 14, 12)]
    for (x, y, bw, bh) in boxes:
        slab(cv, x, x + bw, y, y + bh, SA(2), SA(1), PA(2), EA(1))
        for xx in range(x + 1, x + bw):
            cv.set(xx, y + 1, SA(3))
        for yy in range(y + 1, y + bh):
            cv.set(x + bw // 2, yy, WD(1))
        for xx in range(x + 1, x + bw):
            cv.set(xx, y + bh // 2, WD(1))
        cv.set(x + bw // 2, y + bh // 2, GD(3))
    return cv


def hatch():
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 30, 31)
    slab(cv, 2, 29, 8, 29, WD(4), WD(3), WD(2), WD(0))
    for y in range(11, 28, 4):
        for x in range(4, 28):
            cv.set(x, y, WD(1))
    for (x, y) in ((5, 10), (26, 10), (5, 26), (26, 26)):
        cv.set(x, y, GD(3))
    R(cv, 14, 17, 4, 3, MT(1)); cv.set(15, 17, MT(2))
    return cv


def ship_wheel():
    cv = Canvas(16, 32)
    contact_shadow(cv, 3, 13, 31)
    R(cv, 6, 18, 4, 13, WD(2)); R(cv, 6, 18, 1, 13, WD(4))
    ellipse(cv, 8, 12, 6.5, 6.5, lambda dx, dy, d: (WD(4) if dy < 0 else WD(2)) if d > 0.78 else (GD(3) if d < 0.25 else None))
    for a in range(0, 360, 45):
        for r in range(2, 9):
            x, y = round(8 + r * math.cos(math.radians(a))), round(12 + r * math.sin(math.radians(a)))
            cv.set(x, y, WD(3) if r < 7 else WD(1))
    cv.set(8, 12, GD(4))
    return cv


def gangway():
    cv = Canvas(16, 32)
    for y in range(4, 32):
        for x in range(3, 13):
            c = WD(3) if (y % 4) else WD(1)
            if x in (3, 12):
                c = WD(0)
            cv.set(x, y, c)
    for y in range(4, 32):
        cv.set(2, y, GD(3) if y % 6 == 0 else WD(2)); cv.set(13, y, WD(1))
    for x in range(2, 14):
        cv.set(x, 3, GD(3))
    return cv


def ship_moored(sail_set):
    """The Saffron Wind seen from the quay (6 x 4): a dark copper-banded hull, the rail and deck lanterns, the mast with
    its saffron sail furled (moored) or set and full (sailing)."""
    cv = Canvas(96, 64)
    ellipse(cv, 48, 60, 46, 4, lambda dx, dy, d: glow(WA(1), 160))
    # the hull: a long curved shape, the bow to the east
    for y in range(36, 60):
        t = (y - 36) / 24.0
        x0 = int(8 + t * t * 10)
        x1 = int(92 - t * 6 - (8 if y < 40 else 0) * (1 - t))
        for x in range(x0, x1):
            c = WD(2) if y < 44 else WD(1)
            if y in (40, 41):
                c = GD(3) if y == 40 else GD(1)
            if y == 36:
                c = WD(4)
            if x == x0 or x == x1 - 1:
                c = WD(0)
            if y > 52 and (x + y) % 2:
                c = WD(0)
            cv.set(x, y, c)
    # the bow's carved prow (a gold sun)
    ellipse(cv, 90, 38, 3, 3, lambda dx, dy, d: GD(4) if d < 0.6 else GD(2))
    # the rail and two lanterns
    for x in range(10, 90):
        cv.set(x, 33, GD(3)); cv.set(x, 34, WD(1))
        if x % 8 == 2:
            cv.set(x, 35, WD(1))
    for lx in (20, 74):
        R(cv, lx, 27, 4, 5, GD(1)); R(cv, lx + 1, 28, 2, 3, WHITE); cv.set(lx + 1, 32, WD(1))
    # the mast and sail
    for y in range(2, 34):
        cv.set(47, y, WD(4)); cv.set(48, y, WD(2))
    if sail_set:
        for y in range(6, 30):
            half = 14 + int(4 * math.sin((y - 6) / 24.0 * math.pi))
            for x in range(48 - half + 2, 48 + half + 4):
                c = GD(4) if x < 48 else (GD(3) if (x + y) % 9 else GD(2))
                if y in (6, 29):
                    c = WD(1)
                if (x - 34) % 9 == 0:
                    c = GD(2)
                cv.set(x, y, c)
        # a sun stitched on the sail
        ellipse(cv, 50, 17, 4, 4, lambda dx, dy, d: FI(3) if d < 0.7 else FI(2))
    else:
        for x in range(30, 68):
            cv.set(x, 8, WD(3)); cv.set(x, 9, WD(1))
        for x in range(31, 67):
            for y in range(10, 14):
                if y - 10 <= 3 - abs(x - 48) / 12.0:
                    cv.set(x, y, GD(3) if (x + y) % 4 else GD(2))
    for i in range(6):
        cv.set(49 + i, 2 + i // 3, FI(3))
    return cv


def build_into(sh):
    sh.newline()
    x, y = sh.alloc(128, 32)
    sh.cv.paste(line16(rail_tile), x, y)
    sh.meta['tiles']['ship_rail'] = {'x': x, 'y': y, 'w': 128, 'h': 32, 'collision': 'solid', 'autotile': 'line16',
                                     'note': 'the Saffron Wind\'s copper-capped rail; line16 index N*1+E*2+S*4+W*8'}
    sh.obj('mast', mast(), [0, 5], [[0, 0], [1, 0]], 5,
           note='the mast with its furled saffron sail (2 x 6): the base row solid, the rest overhead')
    put_frames(sh, 'ship_lantern', [ship_lantern(i) for i in range(3)], [0, 1], [[0, 0]], overhead=1, anim_ms=170,
               light={'color': '#eba14d', 'radius': 3.6}, note='a deck lantern on a post')
    sh.obj('crate_lashed', crate_lashed(), [0, 1], [[0, 0]], 1, note='a lashed cloth-wrapped crate')
    sh.obj('crates_lashed', crate_lashed(True), [0, 1], [[0, 0], [1, 0]], 1, note='lashed crates, stacked (2 x 2)')
    sh.obj('hatch', hatch(), [0, 1], [[0, 0], [1, 0]], 1, note='the deck hatch (decor, solid)')
    sh.obj('ship_wheel', ship_wheel(), [0, 1], [[0, 0]], 1, note='the helm (mark yara_wheel)')
    sh.obj('gangway', gangway(), [0, 1], [], 0, door=[0, 0], kind='door', note='the gangway door (doorAt (0,0))')
    put_frames(sh, 'ship_moored', [ship_moored(False), ship_moored(True)], [0, 3],
               [[x, 0] for x in range(6)], overhead=3,
               note='the Saffron Wind from the quay (6 x 4; Valewyn berth, the Haven water stairs): 0 sail furled, 1 sail set')
