"""The pop-up book kit and the First Library's objects (Episode 8) -> ep8.png, after the terrains and walls (E8-tiles,
EPISODE8_PLAN 9.1, 4.4 to 4.8, 4.11 and 5.1). Imported by ep8.py.

State art follows the ep4 to ep7 convention: an object with several looks carries "frames": [[x,y,w,h]..] indexed by the
event's state (rect = frames[0]); animated pieces carry "anim" (a frameDx strip).

THE POP-UP BOOK KIT (E8-world draws these by these rules; plan 4.4 and 5.1):
  popbook           32 x 32, a 2 x 1 book (axis 'ns': read from the north or the south long side). anchor [0, 1],
                    footprint [[0,0],[1,0]], one overhead row (the pages rising while it opens). 16 frames:
                    frame = ribbon * 4 + state. state 0 shut (crimson leather, gilt tooling, a gilt page edge on its front,
                    a ribbon out of each long side), 1 and 2 opening (the pages rising from the spine: show 1 for the
                    first 8 of the 16 open frames, 2 for the last 8; the fold runs 2, 1 over its 12), 3 open (lying flat,
                    cream pages up). ribbon 0 gold (an unpaired book); ribbons 1, 2, 3 teal, blue, green: a palimpsest
                    pair shares one ribbon and both covers carry a faint ghost of written lines (plan 4).
  popbook_ew        16 x 48, a 1 x 2 book (axis 'ew': read from the west or the east). anchor [0, 2], footprint
                    [[0,0],[0,-1]], one overhead row. The same 16 frames.
  popbook_realm(_ew)  the same books with a gilt medallion on the cover (the event's sprite: 'popbook_realm').
  realm_model       32 x 32, 7 frames, one per realm in `realms` order (willowmere, hollow, emberpeak, valewyn, desert,
                    isles, north): the paper model standing on an open realm book's pages (willow, mirror, forge and
                    bell, keep, armillary, Kestrel, Stillheart). collision none, kind piece. Drawn by E8-world centred on
                    the page span (its base on the span's middle row), above the pages and under actors, only while the
                    book stands open (after the open animation).
  page_bridge       48 x 48 9-slice (16 px slices): a page over the void: cream, a 1 px ink edge, a 2 px drop shadow onto
                    the void on its south edge. Walkable.
  page_wall         48 x 48 9-slice: pages standing on floor: the stacked page edges on top, the south slice row shows the
                    front face with an ink base line and a 2 px shadow onto the floor. Solid.
  page_ghost        48 x 48 9-slice outline only: the dotted gold ghost of the pages-to-be (or of the cells that will
                    clear), each dash two-tone (gold over a dark gold under-pixel) so it reads on the void and on the
                    lightest floor. E8-world may draw the same in code from `recipe`.

The Library: restoring_fountain (2 x 2 rest and save, anim 3), reading_desk (2 x 2 lectern with its lamp: the Stair's
rest and save, anim 3), drawer_stack_dash (cracked, broken), lift_page (the floors' lift, a door cell), ink_door (3 x 3,
door_boss style: closed, open; doorAt [1, 0]), great_lexicon (4 x 3: 0..2 shut glowing, 3..5 open with names rising,
6 the last page), ep8_first_shelf (3 x 2: one empty place; filled; the core id first_shelf is Episode 6's), star_dome
(7 x 4 overhead: 0..2 seven signs turning, the eighth blank; 3..5 the eighth lit with the counter-seal).
"""
import math
import numpy as np
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc
from court_props import put_frames, ellipse
from ep4_props import box
from ep7_props import R, contact_shadow, ink_outline, warm_glow
from ep8_kit import (WD, SW, SC, GD, INK, MV, CP, SA, PA, FI, RR, WA, RG, CB, PC, MB, BP, VL, VOID, VOID_DEEP, PAPER,
                     INKD, glyph_on)

CY = lambda i: C('magic_cyan', i)       # 1d3775 317aa1 2ec4d0 8af0e8 e8fffb
IC = lambda i: C('ice', i)
GR = lambda i: C('grass', i)
MT = lambda i: C('metal', i)
RIBBONS = [(GD(4), GD(2)), (CY(3), CY(1)), (CB(4), CB(2)), (RG(4), RG(2))]
REALMS = ['willowmere', 'hollow', 'emberpeak', 'valewyn', 'desert', 'isles', 'north']


def outline_warm(cv):
    """The ink outline, then a warm rim pixel on the lit (upper-left) side of every outline run: the plan's 'dark
    outline and a warm rim' that keeps an object off the void and off the paper."""
    ink_outline(cv, INKD)
    return cv


# ====================================================================== the pop-up books
def _cover_ns(cv, x0, x1, y0, y1, ribbon, state, realm):
    """The cover of a 2 x 1 book from above: crimson leather lit from the upper left, a gilt rule, gilt corners, the
    hinge ridge across the middle (E-W), a ghost of writing on a pair's cover, a medallion on a realm book."""
    mid = (y0 + y1) // 2
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = RR(2)
            if y == y0 or x == x0:
                c = RR(4)
            elif y == y0 + 1 or x == x0 + 1:
                c = RR(3)
            elif y == y1 or x == x1:
                c = RR(1)
            if y in (mid, mid + 1):
                c = RR(1) if y == mid + 1 else RR(3)
            cv.set(x, y, c)
    for x in range(x0 + 3, x1 - 2):
        for y in (y0 + 3, y1 - 2):
            cv.set(x, y, GD(3) if (x + y) % 2 else GD(2))
    for y in range(y0 + 3, y1 - 1):
        for x in (x0 + 3, x1 - 3):
            if y not in (mid, mid + 1):
                cv.set(x, y, GD(3) if (x + y) % 2 else GD(2))
    for (cx, cy) in ((x0 + 1, y0 + 1), (x1 - 2, y0 + 1), (x0 + 1, y1 - 2), (x1 - 2, y1 - 2)):
        cv.set(cx, cy, GD(4)); cv.set(cx + 1, cy, GD(3)); cv.set(cx, cy + 1, GD(3))
    if ribbon:
        for row in (y0 + 5, y1 - 4):
            for x in range(x0 + 5, x1 - 4):
                if glyph_on(x, row, 8400 + ribbon) and row != mid:
                    cv.set(x, row, RR(3))
    if realm:
        cx, cy = (x0 + x1) / 2.0 + 0.5, mid + 1.0
        for y in range(int(cy) - 4, int(cy) + 4):
            for x in range(int(cx) - 4, int(cx) + 4):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if d < 3.6:
                    cv.set(x, y, GD(4) if d > 2.4 else (GD(5) if (x + y) % 2 else GD(3)))
                elif d < 4.4:
                    cv.set(x, y, GD(1))


def _pages_up(cv, cx, top, base, half_w, axis):
    """Cream pages rising from the spine into a peak (opening frames): a tent of paper with ink edges."""
    for y in range(top, base + 1):
        k = (y - top) / max(1, base - top)
        w = int(round(half_w * k))
        for dx in range(-w, w + 1):
            x = cx + dx
            c = PC(0) if dx < 0 else PC(1)
            if abs(dx) == w:
                c = INKD
            elif dx == 0:
                c = PC(2)
            elif (y - top) % 3 == 0 and abs(dx) > 1:
                c = PC(2) if dx > 0 else PC(1)
            cv.set(x, y, c)


def popbook_ns(ribbon, state, realm=False):
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 29, 31, a=110)
    x0, x1 = 2, 29
    rib, rib_d = RIBBONS[ribbon]
    if state == 3:
        # open, lying flat: the boards' crimson rim round two cream pages, the spine across the middle
        y0, y1 = 13, 25
        box(cv, x0 - 1, y0, x1 + 1, y1, RR(3), RR(2), RR(1), INKD, round_=False)
        mid = (y0 + y1) // 2
        for y in range(y0 + 1, y1):
            for x in range(x0 + 1, x1):
                c = PC(0) if y < mid else PC(1)
                if y in (mid, mid + 1):
                    c = PC(2) if y == mid else INK(3)
                elif (y - y0) % 3 == 0 and x0 + 3 <= x <= x1 - 3 and glyph_on(x, y, 8410):
                    c = PC(2)
                cv.set(x, y, c)
        # the ribbons lie across the pages and out of both long sides
        for y in range(y0 - 3, y1 + 4):
            cv.set(9, y, rib if y < y1 + 2 else rib_d)
            cv.set(10, y, rib_d)
        for y in range(y1, y1 + 5):
            cv.set(22, y, rib); cv.set(23, y, rib_d)
        R(cv, x0 - 1, y1 + 1, x1 - x0 + 3, 3, RR(1))
        cv.hline(x0 - 1, x1 + 1, y1 + 4, INKD)
        outline_warm(cv)
        return cv
    # shut (0) or opening (1, 2): the closed tome with its thickness
    y0, y1 = 14, 24
    # the north ribbon's tail (behind the cover)
    for y in range(9, y0):
        cv.set(8, y, rib); cv.set(9, y, rib_d)
    cv.set(8, 8, rib_d)
    _cover_ns(cv, x0, x1, y0, y1, ribbon, state, realm)
    # front: the board's edge, the gilt page block, the bottom board
    R(cv, x0, y1 + 1, x1 - x0 + 1, 1, RR(1))
    for y in range(y1 + 2, y1 + 5):
        for x in range(x0 + 1, x1):
            cv.set(x, y, GD(4) if (y - y1) % 2 == 0 else (GD(3) if x % 4 else PC(1)))
    R(cv, x0, y1 + 5, x1 - x0 + 1, 1, RR(1))
    cv.set(x0, y1 + 2, RR(1)); cv.set(x0, y1 + 3, RR(1)); cv.set(x0, y1 + 4, RR(1))
    cv.set(x1, y1 + 2, RR(0)); cv.set(x1, y1 + 3, RR(0)); cv.set(x1, y1 + 4, RR(0))
    # the south ribbon hangs over the front
    for y in range(y1 + 1, 31):
        cv.set(22, y, rib); cv.set(23, y, rib_d)
    if state in (1, 2):
        top = 8 if state == 1 else 1
        _pages_up(cv, 15, top, 20, 6 if state == 1 else 9, 'ns')
    outline_warm(cv)
    return cv


def _cover_ew(cv, x0, x1, y0, y1, ribbon, realm):
    mid = (x0 + x1) // 2
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = RR(2)
            if y == y0 or x == x0:
                c = RR(4)
            elif y == y0 + 1 or x == x0 + 1:
                c = RR(3)
            elif y == y1 or x == x1:
                c = RR(1)
            if x in (mid, mid + 1):
                c = RR(3) if x == mid else RR(1)
            cv.set(x, y, c)
    for y in range(y0 + 3, y1 - 1):
        for x in (x0 + 2, x1 - 2):
            cv.set(x, y, GD(3) if (x + y) % 2 else GD(2))
    for x in range(x0 + 2, x1 - 1):
        if x not in (mid, mid + 1):
            cv.set(x, y0 + 3, GD(3)); cv.set(x, y1 - 2, GD(2))
    if ribbon:
        for col in (x0 + 4, x1 - 4):
            for y in range(y0 + 6, y1 - 5):
                if glyph_on(y, col, 8420 + ribbon):
                    cv.set(col, y, RR(3))
    if realm:
        cx, cy = mid + 1.0, (y0 + y1) / 2.0 + 0.5
        for y in range(int(cy) - 4, int(cy) + 5):
            for x in range(int(cx) - 4, int(cx) + 5):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if d < 3.4:
                    cv.set(x, y, GD(4) if d > 2.2 else (GD(5) if (x + y) % 2 else GD(3)))
                elif d < 4.2:
                    cv.set(x, y, GD(1))


def popbook_ew(ribbon, state, realm=False):
    cv = Canvas(16, 48)
    contact_shadow(cv, 2, 13, 47, a=110)
    x0, x1 = 2, 13
    rib, rib_d = RIBBONS[ribbon]
    if state == 3:
        y0, y1 = 14, 41
        box(cv, x0 - 1, y0, x1 + 1, y1, RR(3), RR(2), RR(1), INKD, round_=False)
        mid = (x0 + x1) // 2
        for y in range(y0 + 1, y1):
            for x in range(x0, x1 + 1):
                c = PC(0) if x <= mid else PC(1)
                if x in (mid, mid + 1):
                    c = PC(2) if x == mid else INK(3)
                elif (y - y0) % 3 == 0 and glyph_on(x + y, y, 8430) and x not in (x0, x1):
                    c = PC(2)
                cv.set(x, y, c)
        for x in range(0, 16):
            cv.set(x, 21, rib if x % 15 else rib_d)
            cv.set(x, 34, rib_d if x % 15 else rib)
        R(cv, x0 - 1, y1 + 1, x1 - x0 + 3, 3, RR(1))
        cv.hline(x0 - 1, x1 + 1, y1 + 4, INKD)
        outline_warm(cv)
        return cv
    y0, y1 = 15, 40
    _cover_ew(cv, x0, x1, y0, y1, ribbon, realm)
    R(cv, x0, y1 + 1, x1 - x0 + 1, 1, RR(1))
    for y in range(y1 + 2, y1 + 5):
        for x in range(x0 + 1, x1):
            cv.set(x, y, GD(4) if (y - y1) % 2 == 0 else (GD(3) if x % 4 else PC(1)))
    R(cv, x0, y1 + 5, x1 - x0 + 1, 1, RR(1))
    # a ribbon out of each long side (west and east)
    for x in (0, 1):
        cv.set(x, 22, rib); cv.set(x, 23, rib_d)
    for x in (14, 15):
        cv.set(x, 33, rib); cv.set(x, 34, rib_d)
    if state in (1, 2):
        top = 6 if state == 1 else 0
        for y in range(top, 34):
            k = min(1.0, (y - top) / 10.0)
            w = int(round((3 if state == 1 else 5) * k))
            for dx in range(-w, w + 1):
                c = PC(0) if dx < 0 else PC(1)
                if abs(dx) == w:
                    c = INKD
                elif (y - top) % 3 == 0 and dx:
                    c = PC(2)
                cv.set(8 + dx, y, c)
    outline_warm(cv)
    return cv


# ====================================================================== the realm models (paper)
def model_base(cv, x0, x1, y):
    """The fold-out tab the model stands on (a paper strip with a shadow)."""
    for x in range(x0, x1 + 1):
        cv.set(x, y, PC(2))
        cv.set(x, y + 1, SH(120) if x % 2 else SH(80))


def model_willow(cv):
    """Willowmere: the Mother Willow in paper, its fronds hanging in strips, a green wash."""
    model_base(cv, 6, 25, 28)
    for y in range(17, 28):
        for x in (14, 15, 16):
            cv.set(x, y, PC(1) if x < 16 else PC(2))
    for x in range(13, 18):
        cv.set(x, 27, PC(2))
    for y in range(3, 17):
        for x in range(4, 28):
            dx, dy = (x - 15.5) / 11.5, (y - 10) / 7.5
            if dx * dx + dy * dy <= 1:
                cv.set(x, y, GR(4) if dx < 0.1 else GR(3))
    for k in range(9):
        x = 5 + k * 3
        L = 6 + (k * 5) % 7
        for y in range(12, 12 + L):
            cv.set(x, y, GR(4) if k % 2 else GR(3))
            if y > 13:
                cv.set(x + 1, y, PC(1) if (y + k) % 4 else GR(2))
    for x in range(6, 26):
        if x % 3 == 0:
            cv.set(x, 5 + (x % 2), GR(5))


def model_mirror(cv):
    """The Hollow: the Court's mirror, an oval glass in a scrolled paper frame on two feet, a silver-violet glint."""
    model_base(cv, 7, 24, 28)
    ellipse(cv, 15.5, 14, 8.5, 11.5, lambda dx, dy, d: PC(1) if d > 0.82 else None)
    ellipse(cv, 15.5, 14, 6.5, 9.5, lambda dx, dy, d: (MV(3) if dx + dy < -0.5 else MB(1) if dx + dy < 0.4 else CP(3)))
    for k in range(5):
        cv.set(12 + k, 8 + k, PC(0))
    cv.set(15, 2, GD(4)); cv.set(16, 2, GD(4)); cv.set(15, 1, GD(3))
    for (x, y) in ((10, 25), (11, 26), (20, 25), (21, 26)):
        cv.set(x, y, PC(2))


def model_forge(cv):
    """Emberpeak: the Heartforge and its bell: a paper forge hearth with a fire wash, a bell hung over it on a beam."""
    model_base(cv, 4, 27, 28)
    box(cv, 6, 18, 25, 27, PC(0), PC(1), PC(2), INKD, round_=False)
    for y in range(20, 26):
        for x in range(10, 22):
            cv.set(x, y, FI(4) if (x + y) % 3 else FI(3))
    for x in range(10, 22):
        cv.set(x, 25, FI(2))
    R(cv, 4, 4, 24, 2, PC(2))
    cv.vline(5, 6, 17, PC(1)); cv.vline(26, 6, 17, PC(2))
    for y in range(7, 15):
        hw = 2 + (y - 7) // 2
        for x in range(16 - hw, 16 + hw):
            cv.set(x, y, GD(4) if x < 16 else GD(3))
    R(cv, 12, 15, 8, 1, GD(2))
    cv.set(15, 16, GD(1)); cv.set(16, 16, GD(1))


def model_keep(cv):
    """Valewyn: the Sunken Keep: a paper keep, its tower and battlements, blue water at its foot."""
    model_base(cv, 3, 28, 28)
    box(cv, 7, 12, 24, 26, PC(0), PC(1), PC(2), INKD, round_=False)
    box(cv, 17, 4, 23, 13, PC(0), PC(1), PC(2), INKD, round_=False)
    for x in range(7, 25, 3):
        R(cv, x, 10, 2, 2, PC(1))
    for x in range(17, 24, 3):
        R(cv, x, 2, 2, 2, PC(1))
    R(cv, 13, 19, 5, 7, INK(2))
    cv.set(15, 18, INK(2))
    R(cv, 10, 15, 2, 3, CB(2)); R(cv, 20, 7, 1, 3, CB(2))
    for x in range(3, 29):
        cv.set(x, 25 + (x % 3 == 0), CB(4) if x % 2 else WA(4))
        cv.set(x, 26 + (x % 3 == 0), WA(3))


def model_armillary(cv):
    """The desert: the observatory's armillary: crossed paper rings round a sphere on a stand, a sand-gold wash."""
    model_base(cv, 8, 23, 28)
    R(cv, 13, 22, 6, 5, PC(1))
    cv.hline(11, 20, 27, PC(2))
    for t in range(0, 360, 4):
        a = math.radians(t)
        for (rx, ry, rot) in ((10, 10, 0), (10, 4, 0.0), (4, 10, 0.0), (10, 6, 0.6)):
            x = rx * math.cos(a)
            y = ry * math.sin(a)
            xr = x * math.cos(rot) - y * math.sin(rot)
            yr = x * math.sin(rot) + y * math.cos(rot)
            cv.set(int(round(15.5 + xr)), int(round(12 + yr)), SA(2) if yr < 0 else GD(3))
    ellipse(cv, 15.5, 12, 3.2, 3.2, lambda dx, dy, d: GD(4) if dx + dy < 0 else GD(2))
    cv.set(15, 1, GD(4))


def model_kestrel(cv):
    """The isles: the Kestrel in paper: a long envelope, a hull slung under it, a little propeller, a sky-blue wash."""
    model_base(cv, 5, 26, 28)
    ellipse(cv, 15.5, 9, 13, 6.5, lambda dx, dy, d: (PC(0) if dy < -0.2 else PC(1)) if d < 0.86 else CB(4))
    for x in range(5, 27, 4):
        for y in range(4, 15):
            if cv.get(x, y)[3]:
                cv.set(x, y, PC(2))
    for y in (15, 16, 17):
        cv.set(10, y, PC(2)); cv.set(21, y, PC(2))
    box(cv, 8, 18, 23, 23, WD(4), WD(3), WD(2), INKD, round_=False)
    for x in range(10, 22, 3):
        cv.set(x, 20, CB(4))
    cv.vline(27, 6, 12, PC(2)); cv.set(28, 7, PC(1)); cv.set(28, 11, PC(1))
    for y in range(23, 28):
        cv.set(15, y, PC(2))


def model_stillheart(cv):
    """The North: the Stillheart in paper: a faceted heart of ice on a stepped plinth, a pale blue wash."""
    model_base(cv, 7, 24, 28)
    box(cv, 9, 22, 22, 27, PC(0), PC(1), PC(2), INKD, round_=False)
    box(cv, 11, 19, 20, 22, PC(0), PC(1), PC(2), INKD, round_=False)
    pts = [(15.5, 2), (24, 9), (15.5, 19), (7, 9)]
    for y in range(1, 20):
        for x in range(5, 27):
            px, py = x + 0.5, y + 0.5
            inside = abs(px - 15.5) / 8.5 + abs(py - 9.5) / 9.0 <= 1.0
            lobes = math.hypot(px - 11.5, py - 6) < 4.6 or math.hypot(px - 19.5, py - 6) < 4.6
            if (inside and py > 6) or lobes:
                c = IC(3) if px < 15.5 and py < 10 else IC(2) if px < 15.5 else IC(1)
                if abs(px - 15.5) < 0.6 or abs(py - 9.5) < 0.5:
                    c = PC(0)
                cv.set(x, y, c)


MODELS = [model_willow, model_mirror, model_forge, model_keep, model_armillary, model_kestrel, model_stillheart]


def realm_model(k):
    cv = Canvas(32, 32)
    MODELS[k](cv)
    ink_outline(cv, INKD)
    return cv


# ====================================================================== the page slices
def page_bridge():
    """A page laid over the void: cream, a 1 px ink edge, faint ruled lines with handwriting texture, and a 2 px drop
    shadow onto the void along the south edge (inside the south slices)."""
    cv = Canvas(48, 48)
    for y in range(48):
        for x in range(48):
            if y >= 46:
                cv.set(x, y, (20, 16, 30, 150 if y == 46 else 90))
                continue
            if x in (0, 47) or y in (0, 45):
                c = INKD
            elif y == 1 or x == 1:
                c = PC(0)
            elif y == 44 or x == 46:
                c = PC(2)
            else:
                c = PC(0) if (x + y) % 9 else PC(1)
                if y % 6 == 3 and 3 <= (x % 16) <= 13 and glyph_on(x, y // 6, 8500):
                    c = PC(2)
            cv.set(x, y, c)
    return cv


def page_wall():
    """Pages standing on floor: the top is the stacked page edges seen from above (cream striped every other row:
    paper on end, never the smooth ruled sheet of a bridge), the south slice row shows the front face (a lit top edge, a
    line of handwriting, the shade deepening to an ink base) and a 2 px shadow onto the floor."""
    cv = Canvas(48, 48)
    for y in range(48):
        for x in range(48):
            if y >= 46:
                cv.set(x, y, (20, 16, 30, 160 if y == 46 else 100))
                continue
            if x in (0, 47) or y in (0, 45):
                c = INKD
            elif y <= 35:
                c = PC(1) if y % 2 == 0 else PC(0)
                if x == 1:
                    c = PC(0)
                elif x == 46:
                    c = PC(1)
            elif y == 36:
                c = INKD
            elif y == 37:
                c = PC(0)
            else:
                c = PC(0) if y < 39 else (PC(1) if y < 43 else PC(2))
                if y in (39, 40) and 2 <= x <= 45 and glyph_on(x, 7 + (y == 40), 8510):
                    c = INK(2) if y == 39 else INK(3)
                if x == 46:
                    c = PC(2)
            cv.set(x, y, c)
    return cv


GHOST_DASH = (GD(4), GD(0))


def page_ghost():
    """The dotted gold ghost: dashes of 2 px every 4 px round the 9-slice's edge, inset 1 px; each dash pixel gold with
    a dark gold pixel under it (south), so the ghost holds on the void and on the palest floor."""
    cv = Canvas(48, 48)
    ring = []
    for x in range(1, 47):
        ring.append((x, 1)); ring.append((x, 45))
    for y in range(2, 45):
        ring.append((1, y)); ring.append((46, y))
    for (x, y) in ring:
        k = x + y
        if k % 4 in (0, 1):
            cv.set(x, y, GD(4))
            cv.put(x, y + 1, GD(0)) if cv.get(x, y + 1)[3] == 0 else None
    return cv


# ====================================================================== the Library's objects
def restoring_fountain(k):
    """The Restoring Fountain of Names (2 x 2, rest and save): a gold-rimmed marble basin of shining ink, a slow plume
    of pages and gold letters rising from it."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 29, 31)
    ellipse(cv, 16, 24, 14, 6.5, lambda dx, dy, d: MB(0) if dy < -0.3 else MB(1) if d < 0.95 else MB(2))
    ellipse(cv, 16, 23, 11, 4, lambda dx, dy, d: ((GD(4) if (dx * 3 + k) % 1.4 < 0.25 else INK(2)) if d < 0.82 else GD(2)))
    R(cv, 4, 25, 25, 5, MB(1))
    for x in range(4, 29):
        cv.set(x, 29, MB(2))
        if x % 4 == 1:
            cv.set(x, 26, GD(3))
    R(cv, 14, 11, 4, 12, MB(1))
    cv.vline(14, 11, 22, MB(0)); cv.vline(17, 11, 22, MB(2))
    for i in range(4):
        t = (k * 3 + i * 4) % 12
        y = 10 - t
        x = 15 + int(round(3 * math.sin(i * 1.7 + t * 0.4)))
        if y >= 0:
            cv.set(x, y, PC(0) if i % 2 else GD(4))
            cv.set(x + 1, y, PC(1) if i % 2 else GD(3))
    ink_outline(cv, INKD)
    warm_glow(cv, 16, 10, 10, a=50)
    return cv


def reading_desk(k):
    """The Stair's reading desk (2 x 2, rest and save; text key ep8_desk): a slanted lectern with an open book, a brass
    lamp on its arm, lit (3 frames of a slow flame, never more than a pixel's change)."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 3, 28, 31)
    R(cv, 13, 18, 6, 12, WD(3))
    cv.vline(13, 18, 29, WD(4)); cv.vline(18, 18, 29, WD(1))
    R(cv, 9, 28, 14, 2, WD(2))
    for y in range(11, 19):
        dx = (y - 11) // 2
        for x in range(5 - dx, 27 + dx):
            cv.set(x, y, WD(4) if y == 11 else WD(3))
    for y in range(9, 16):
        for x in range(7, 25):
            c = PC(0) if x < 16 else PC(1)
            if x in (15, 16):
                c = PC(2)
            elif (y - 9) % 2 == 1 and 8 < x < 24 and glyph_on(x, y, 8530):
                c = PC(2)
            cv.set(x, y, c)
    cv.vline(26, 2, 12, MT(1))
    R(cv, 23, 1, 7, 1, MT(1))
    for y in range(2, 8):
        for x in range(24, 29):
            cv.set(x, y, GD(4) if (x + y + k) % 5 else GD(5))
    cv.set(26, 4 - (k % 2), WHITE)
    R(cv, 24, 8, 5, 1, MT(1))
    ink_outline(cv, INKD)
    warm_glow(cv, 26.5, 5, 9, a=[70, 64, 74][k])
    return cv


def drawer_stack_dash(broken):
    """A stack of card drawers (1 x 2): 0 cracked (a split down its face: Dash Strike breaks it), 1 broken (boards and
    cards on the floor: decor)."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    if broken:
        for (x, y, w) in ((2, 26, 6), (8, 28, 6), (4, 24, 5)):
            R(cv, x, y, w, 2, WD(3))
            cv.hline(x, x + w - 1, y, WD(4))
        for (x, y) in ((10, 25), (3, 29), (12, 23)):
            R(cv, x, y, 3, 2, PC(1))
        ink_outline(cv, INKD)
        return cv
    box(cv, 1, 4, 14, 30, WD(4), WD(3), WD(2), INKD, round_=False)
    for row in range(4):
        y = 6 + row * 6
        R(cv, 3, y, 10, 5, WD(3))
        cv.hline(3, 12, y, WD(4))
        R(cv, 5, y + 1, 6, 1, PC(1))
        cv.set(7, y + 3, GD(4)); cv.set(8, y + 3, GD(2))
    for k in range(24):
        y = 5 + k
        x = 8 + (1 if k % 6 < 3 else -1) * (k % 3 == 0)
        cv.set(x, y, INKD)
        cv.set(x + 1, y, WD(5))
    ink_outline(cv, INKD)
    return cv


def lift_page():
    """The floors' lift (lift_l1_up, lift_l2_down): a brass cage, its floor a gold-inlay plate, a chain overhead."""
    cv = Canvas(16, 32)
    for y in range(4, 31):
        for x in range(1, 15):
            if x in (1, 14) or y in (4, 30):
                c = GD(2)
            elif x % 4 == 1:
                c = GD(3)
            else:
                c = WD(3) if y > 20 else (VOID if (x + y) % 5 else VOID_DEEP)
                if y == 24 and x % 2:
                    c = GD(4)
            cv.set(x, y, c)
    for y in range(0, 4):
        cv.set(7, y, MT(1)); cv.set(8, y, MT(2))
    ink_outline(cv, INKD)
    return cv


def ink_door(opened):
    """The Original Ink Keyhole door (3 x 3, door_boss style, set into a 2-row face): a slab of hard black ink in a gilt
    frame, the keyhole old and glossy; open: the slab gone into the floor, the dark of the Last Word beyond."""
    cv = Canvas(48, 48)
    for y in range(4, 48):
        for x in range(4, 44):
            arch = y < 16 and math.hypot(x + 0.5 - 24, y + 0.5 - 16) > 20
            if arch:
                continue
            edge = x in (4, 43) or (y < 16 and math.hypot(x + 0.5 - 24, y + 0.5 - 16) > 18.6)
            frame = x in (5, 6, 41, 42) or (y < 16 and math.hypot(x + 0.5 - 24, y + 0.5 - 16) > 16.8)
            if edge:
                c = GD(1)
            elif frame:
                c = GD(4) if x < 24 else GD(3)
                if (x + y) % 5 == 0:
                    c = GD(2)
            elif opened:
                c = INK(0) if y < 40 else INK(1)
                if y > 30 and (x + y) % 9 == 0:
                    c = GD(1)
            else:
                c = INK(1) if (x + y // 3) % 7 else INK(2)
                if x == 8 or (y < 18 and math.hypot(x + 0.5 - 24, y + 0.5 - 16) > 15.5):
                    c = INK(3)              # the gloss down the ink's lit edge
            cv.set(x, y, c)
    if not opened:
        ellipse(cv, 24, 30, 3.4, 3.4, lambda dx, dy, d: GD(4) if d > 0.7 else INK(0))
        R(cv, 23, 32, 3, 6, INK(0))
        cv.vline(22, 32, 37, GD(3)); cv.vline(26, 32, 37, GD(2))
        cv.hline(22, 26, 38, GD(3))
    ink_outline(cv, INKD)
    return cv


def great_lexicon(k):
    """The great book on the dais (4 x 3). k 0..2: shut, glowing (a slow pulse, at most a step of gold per frame);
    3..5: open, names rising off its pages as gold glyph bars; 6: open at the last page, empty."""
    cv = Canvas(64, 48)
    contact_shadow(cv, 4, 59, 47, a=110)
    # the lectern-plinth under it
    box(cv, 10, 36, 53, 46, GD(3), GD(2), WD(2), INKD, round_=False)
    for x in range(12, 52, 4):
        cv.set(x, 40, GD(4))
    if k < 3:
        box(cv, 6, 16, 57, 35, RR(3), RR(2), RR(1), INKD, round_=False)
        for y in range(18, 34):
            for x in (9, 54):
                cv.set(x, y, GD(3))
        for x in range(9, 55):
            cv.set(x, 18, GD(3)); cv.set(x, 33, GD(2))
        ellipse(cv, 32, 25.5, 7, 6, lambda dx, dy, d: GD(5) if d < 0.4 else GD(4) if d < 0.75 else GD(2))
        for (x, y) in ((32, 21), (28, 25), (36, 25), (32, 29)):
            cv.set(x, y, WHITE if k == 1 else GD(5))
        R(cv, 6, 35, 52, 1, GD(4))
        ink_outline(cv, INKD)
        warm_glow(cv, 32, 24, 26, a=[60, 72, 66][k])
        return cv
    # open: two great pages fanned up from the spine
    for y in range(12, 36):
        for x in range(4, 60):
            side = -1 if x < 32 else 1
            dx = abs(x - 31.5)
            sag = int(round(3 * (dx / 28.0) ** 2))
            if y < 14 + sag - (2 if dx < 3 else 0):
                continue
            c = PC(0) if side < 0 else PC(1)
            if dx < 1:
                c = PC(2)
            elif y >= 33:
                c = RR(2) if y == 33 else RR(1)
            elif k < 6 and (y - 16) % 3 == 0 and 7 < dx < 26 and glyph_on(x, y, 8540):
                c = INK(2)
            cv.set(x, y, c)
    if k < 6:
        for i in range(9):
            t = (i * 5 + (k - 3) * 2) % 14
            x = 12 + i * 5
            y = 12 - t
            if y >= 0:
                cv.hline(x, x + 2 + (i % 2), y, GD(4) if (i + k) % 2 else GD(3))
    ink_outline(cv, INKD)
    warm_glow(cv, 32, 18, 24, a=50 if k < 6 else 30)
    return cv


def first_shelf8(filled):
    """The first shelf (3 x 2) at the dais's foot: oak and gilt, every place full of old spines but one, the width of a
    single page; filled: a pale new page standing in it, its edge gold."""
    cv = Canvas(48, 32)
    contact_shadow(cv, 1, 46, 31)
    box(cv, 1, 2, 46, 30, WD(4), WD(3), WD(1), INKD, round_=False)
    for y in (15, 29):
        cv.hline(2, 45, y, WD(2))
        cv.hline(2, 45, y - 1, GD(3))
    tones = [RR(2), CB(2), RG(2), CP(3), WD(2), RR(3), SC(2), CB(3), RG(3)]
    for row, (yt, yb) in enumerate(((4, 13), (17, 27))):
        x = 3
        i = row * 4
        while x < 44:
            w = 3 + h32(i, 8550) % 2
            if row == 0 and 20 <= x <= 22:
                if filled:
                    R(cv, 21, yt + 1, 2, yb - yt, PC(0))
                    cv.vline(23, yt + 1, yb, GD(4))
                else:
                    R(cv, 21, yt + 1, 3, yb - yt, INK(0))
                x = 24
                i += 1
                continue
            hgt = yb - yt - (h32(i, 8551) % 3)
            c = tones[i % len(tones)]
            R(cv, x, yb - hgt + 1, w, hgt, c)
            cv.set(x, yb - hgt + 3, GD(3))
            cv.vline(x + w - 1, yb - hgt + 1, yb, WD(0))
            x += w
            i += 1
    ink_outline(cv, INKD)
    if filled:
        warm_glow(cv, 22, 9, 8, a=60)
    return cv


SIGNS = [
    [(0, 2), (1, 1), (2, 0), (3, 1), (4, 2), (2, 1), (2, 2), (2, 3), (2, 4)],     # a leaf (the willow)
    [(1, 0), (2, 0), (3, 0), (0, 1), (4, 1), (0, 2), (4, 2), (0, 3), (4, 3), (1, 4), (2, 4), (3, 4)],   # a ring (the mirror)
    [(2, 0), (1, 1), (2, 1), (3, 1), (1, 2), (2, 2), (3, 2), (0, 3), (4, 3), (1, 4), (2, 4), (3, 4)],   # a flame
    [(0, 1), (2, 1), (4, 1), (0, 2), (1, 2), (2, 2), (3, 2), (4, 2), (1, 3), (3, 3), (1, 4), (3, 4)],   # a keep
    [(2, 0), (0, 2), (4, 2), (2, 4), (1, 1), (3, 3), (3, 1), (1, 3), (2, 2)],     # a star wheel (the armillary)
    [(0, 1), (1, 1), (1, 2), (2, 2), (3, 2), (3, 1), (4, 1), (2, 3)],             # a wing (the Kestrel)
    [(2, 0), (2, 1), (2, 2), (2, 3), (2, 4), (0, 2), (1, 2), (3, 2), (4, 2), (1, 1), (3, 3), (3, 1), (1, 3)],   # a snowflake
]
COUNTER_SEAL = [(0, 1), (1, 0), (2, 1), (3, 0), (4, 1), (0, 2), (2, 2), (4, 2), (0, 3), (1, 3), (2, 3), (3, 3),
                (4, 3), (1, 2)]   # an open book with one line written in it


def star_dome(k):
    """The star dome (7 x 4, overhead, collision none): a dark violet vault with gilt ribs; seven stars, each with its
    sign beside it, turning slowly (3 frames, a pixel each) toward an eighth with none. k 3..5: the eighth lit, its sign
    the counter-seal (an open book with one line), the brightest thing on the dome."""
    cv = Canvas(112, 64)
    eighth = k >= 3
    f = k % 3
    for y in range(64):
        for x in range(112):
            d = math.hypot((x + 0.5 - 56) / 56.0, (y + 0.5 - 64) / 62.0)
            if d > 1.0:
                continue
            c = VOID_DEEP if d > 0.94 else (VOID if (x * 7 + y * 3) % 23 else CP(1))
            if d > 0.9:
                c = GD(2) if d > 0.97 else INK(1)
            cv.set(x, y, c)
    for a in range(1, 8):
        ang = math.pi * a / 8.0
        for r in range(8, 60):
            x = int(round(56 - math.cos(ang) * r * 0.98))
            y = int(round(64 - math.sin(ang) * r * 1.0))
            if cv.get(x, y)[3]:
                cv.set(x, y, GD(1) if r % 3 else GD(2))
    centre = (56, 64)
    for i in range(7):
        ang = math.pi * (i + 0.5 + f * 0.04) / 8.4 + 0.1
        r = 42 if i % 2 else 32
        sx = int(round(centre[0] - math.cos(ang) * r * 1.2))
        sy = int(round(centre[1] - math.sin(ang) * r))
        for (dx, dy) in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
            cv.set(sx + dx, sy + dy, GD(4) if (dx or dy) else GD(5))
        for (px, py) in SIGNS[i]:
            cv.set(sx + 4 + px, sy - 2 + py, PC(1))
    ex, ey = 56, 12
    if eighth:
        for (dx, dy) in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-2, 0), (2, 0), (0, -2), (0, 2)):
            cv.set(ex + dx, ey + dy, WHITE if abs(dx) + abs(dy) <= 1 else GD(5))
        for (px, py) in COUNTER_SEAL:
            cv.set(ex + 5 + px, ey - 2 + py, WHITE)
        for (px, py) in ((1, 1), (3, 1)):
            cv.set(ex + 5 + px, ey - 2 + py, GD(4))
        warm_glow(cv, ex + 3, ey, 10, a=[70, 78, 74][f])
    else:
        cv.set(ex, ey, PC(2))           # the eighth: a dull point, no sign
    return cv


# ====================================================================== build
def put_each(sh, oid, frames, anchor, footprint, overhead=0, kind='prop', **extra):
    """Like put_frames for a strip wider than the sheet: each frame allocated on its own (frames[k] = [x, y, w, h])."""
    rects = []
    for f in frames:
        x, y = sh.alloc(f.w, f.h)
        sh.cv.paste(f, x, y)
        rects.append([x, y, f.w, f.h])
    m = {'rect': list(rects[0]), 'anchor': anchor, 'footprint': footprint, 'overheadRows': overhead, 'doorAt': None,
         'collision': 'solid', 'kind': kind, 'frames': rects}
    m.update(extra)
    sh.meta['objects'][oid] = m
    return m


def build_into(sh):
    sh.newline()
    O = sh.meta['objects']
    ribbon_note = ('frame = ribbon * 4 + state; state 0 shut, 1 and 2 opening (1 for the first 8 of the 16 open frames, '
                   '2 for the last 8; the fold runs 2, 1 over 12), 3 open (lying flat); ribbon 0 gold (unpaired), 1 teal, '
                   '2 blue, 3 green (a palimpsest pair shares one ribbon; its covers carry a ghost of writing)')
    for realm in (False, True):
        oid = 'popbook_realm' if realm else 'popbook'
        put_frames(sh, oid, [popbook_ns(r, s, realm) for r in range(4) for s in range(4)], [0, 1], [[0, 0], [1, 0]],
                   overhead=1, axis='ns', ribbons=['gold', 'teal', 'blue', 'green'], states=['shut', 'opening_a',
                   'opening_b', 'open'],
                   note=('a pop-up book, 2 x 1 (axis ns: read from the north or south long side)%s: ' %
                         (', a realm book: a gilt medallion on the cover' if realm else '')) + ribbon_note)
        sh.newline()
    for realm in (False, True):
        oid = 'popbook_realm_ew' if realm else 'popbook_ew'
        put_frames(sh, oid, [popbook_ew(r, s, realm) for r in range(4) for s in range(4)], [0, 2], [[0, 0], [0, -1]],
                   overhead=1, axis='ew', ribbons=['gold', 'teal', 'blue', 'green'], states=['shut', 'opening_a',
                   'opening_b', 'open'],
                   note=('a pop-up book, 1 x 2 (axis ew: read from the west or east long side)%s: ' %
                         (', a realm book' if realm else '')) + ribbon_note)
    sh.newline()
    put_frames(sh, 'realm_model', [realm_model(k) for k in range(7)], [0, 1], [], kind='piece', realms=list(REALMS),
               note='the seven realm books\' paper models (frame = index in realms): drawn by E8-world centred on an open '
                    'realm book\'s page span, base on its middle row, over the pages and under actors, only while open. '
                    'Flavor only: nothing is solved by a name (DESIGN hard rule 2)')
    O['realm_model']['collision'] = 'none'
    sh.newline()
    for tid, cv, coll, note in (
            ('page_bridge', page_bridge(), 'none', 'pages over the void (a bridge): 9-slice of 16 px slices; cream, a 1 px '
                                                   'ink edge, a 2 px shadow onto the void inside the south slices'),
            ('page_wall', page_wall(), 'solid', 'pages standing on floor (a wall): 9-slice of 16 px slices; the stacked '
                                                'page edges on top, the front face and a 2 px shadow on the south slices'),
            ('page_ghost', page_ghost(), 'none', 'the dotted gold ghost of pages-to-be (or of cells that will clear): '
                                                 '9-slice outline, two-tone dashes')):
        extra = {'nineSlice': 16, 'note': note}
        if tid == 'page_ghost':
            extra['recipe'] = {'color': '#f9d77a', 'under': '#482826', 'dash': [2, 4], 'inset': 1,
                               'how': 'round the outline of the cells, inset 1 px: pixels where (x + y) % 4 < 2 are gold, '
                                      'with the under colour on the pixel below each (south)'}
        sh.tile(tid, cv, collision=coll, **extra)
    sh.newline()
    put_frames(sh, 'restoring_fountain', [restoring_fountain(k) for k in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               anim_ms=420, light={'color': '#f9d77a', 'radius': 2.6},
               note='the Restoring Fountain of Names (canon; rest and save: font_l1, font_l2, font_l2b, font_l3): a '
                    'marble basin of shining ink, pages and gold letters rising')
    put_frames(sh, 'reading_desk', [reading_desk(k) for k in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               anim_ms=500, light={'color': '#f9d77a', 'radius': 2.4},
               note='the Stair\'s reading desk (rest and save, text key ep8_desk): a lectern, an open book, its lamp lit')
    put_frames(sh, 'drawer_stack_dash', [drawer_stack_dash(False), drawer_stack_dash(True)], [0, 1], [[0, 0]], overhead=1,
               note='a cracked drawer stack: 0 cracked (solid; Dash Strike breaks it), 1 broken (decor; the cell opens)')
    sh.obj('lift_page', lift_page(), [0, 1], [], 0, door=[0, 0], kind='door',
           note='the Library\'s lift (lift_l1_up, lift_l2_down, the lift ups): a brass cage, the door cell is (0,0)')
    sh.newline()
    put_frames(sh, 'ink_door', [ink_door(False), ink_door(True)], [0, 2], [[0, 0], [2, 0]], overhead=0, door=[1, 0],
               kind='door',
               note='the Original Ink Keyhole door (F3, 3 x 3, door_boss style, set into a 2-row face): 0 closed (needs '
                    'ink_key), 1 open; cell (1, 0) is the doorway, its passage decided by the event')
    put_frames(sh, 'ep8_first_shelf', [first_shelf8(False), first_shelf8(True)], [0, 1], [[0, 0], [1, 0], [2, 0]],
               overhead=1,
               note='the first shelf at the dais\'s foot (map object first_shelf; the art id is prefixed: Episode 6 owns '
                    'first_shelf): 0 one empty place, 1 filled (page_shelved)')
    put_frames(sh, 'great_lexicon', [great_lexicon(k) for k in range(7)], [0, 2],
               [[x, 0] for x in range(4)] + [[x, -1] for x in range(4)], overhead=1,
               shutFrames=[0, 1, 2], openFrames=[3, 4, 5], lastFrame=6, ms=520,
               light={'color': '#f9d77a', 'radius': 4.5},
               note='the great open book on the dais (4 x 3): 0..2 shut and glowing (cycle at 520 ms), 3..5 open with '
                    'names rising (cycle), 6 open at the last page (empty)')
    sh.newline()
    put_each(sh, 'star_dome', [star_dome(k) for k in range(6)], [0, 3], [], overhead=4, kind='piece',
               turnFrames=[0, 1, 2], eighthFrames=[3, 4, 5], ms=1600,
               note='the star dome (overhead, 7 x 4, collision none): 0..2 seven stars with their signs turning slowly '
                    'toward an eighth with none (cycle at 1600 ms); 3..5 the same with the eighth lit and its sign the '
                    'counter-seal (after eighth_star)')
    O['star_dome']['collision'] = 'none'
