"""The name-stone kit and the Frostbound Vault's objects (Episode 7) -> ep7.png, after the terrains and walls (E7-tiles,
EPISODE7_PLAN 9.1, 4.5 to 4.9, 5.1 and 5.2). Imported by ep7.py.

State art follows the ep4 to ep6 convention: an object with several looks carries "frames": [[x,y,w,h]..] indexed by the
event's state (rect = frames[0]); animated pieces carry "anim" (a frameDx strip).

The name-stone kit (E7-world draws these by these rules):
  namestone     16x32, 4 frames: 0 dim (not held: the lamp dark, the carved name dark), 1 lit (held: the lamp burning,
                the name glowing gold), 2 and 3 the slow flicker of the OLDEST held stone (the one that goes next):
                cycle 2, 3 at about 500 ms (never faster: plan 5.1); 2 the flame tall, 3 the flame low and the name dimmer.
                A cairn of snow-capped stones with an iron lamp on top: the lamp is on the tile ABOVE the stone's cell, so
                the party never covers it. Solid, faced from ground. light (warm) only while held.
  name_plate    16x32, the same 4 frames: an iceglass plate on a frost-brick plinth (indoors: the Vault floors).
  frost_door    16x32, 4 frames: 0 and 1 solid (clear ice, something frozen in it, the glint moving: cycle 0, 1 at about
                700 ms while the stone is held), 2 melting (the 16-frame let-go), 3 melted (a wet sheen and shards on the
                floor: decor). collision none HERE: the frost grid decides (E7-world's override); drawn on the frost cell
                (anchor [0,1]: the slab rises into the tile above).
  ghost_trail   16x16, 2 frames: the ghost print recipe as art (E7-world draws the same in code on every UNHELD path
                cell over the fade): 0 a trail running north-south, 1 east-west; prints 2 x 3 px in the ghost colour
                #c3cad6 (at least 0.08 luma below the fade, measured), four to a cell at period 16 so a run joins up.

The Vault: listening_bell (2 x 3: frozen in ice, then thawed swinging 3 frames), stillheart (3 x 4: frozen with names
moving 3 frames, thawed running bright 3 frames), round_door (3 x 3, door_boss style: closed, open; doorAt [1, 0]),
page_block (frozen, opened), star_stair (3 x 7 overhead, 3 frames, all overhead, collision none), crate_dash_ice
(cracked, broken), winterwatch_cache (closed, open), lift_frost (the floors' lift, a door cell), font_thaw (the Thawlight
basin, rest and save, anim 3), watch_cots (the Watch after the thaw, a rest).
"""
import math
import numpy as np
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc
from court_props import put_frames, ellipse, glow, strip
from ep4_props import box, shadow, disc
from ep7_kit import (WD, SW, SC, GD, WA, IC, RB, MT, FD, RG, FI, INK, MV, CY, EA, SN, IP, GHOST, AG, PAPER, GRAIN)

RR = lambda i: C('roof_red', i)


def R(cv, x, y, w, h, c):
    cv.rect(x, y, w, h, c)


def contact_shadow(cv, x0, x1, y, a=96):
    for x in range(x0, x1 + 1):
        cv.put(x, y, SH(a))
        if (x + y) % 2 == 0:
            cv.put(x, y + 1, SH(a // 2))


def ink_outline(cv, col=DARK, solid_only=True):
    """A 1 px outline round every opaque pixel (4-neighbours), so a prop holds on snow and on the white at phone scale."""
    a = cv.a
    op = a[:, :, 3] == 255
    ring = np.zeros_like(op)
    ring[1:, :] |= op[:-1, :]
    ring[:-1, :] |= op[1:, :]
    ring[:, 1:] |= op[:, :-1]
    ring[:, :-1] |= op[:, 1:]
    ring &= a[:, :, 3] == 0
    ys, xs = np.where(ring)
    for y, x in zip(ys, xs):
        cv.set(int(x), int(y), col)
    return cv


def warm_glow(cv, cx, cy, r, a=80, col=None):
    col = col or GD(4)
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r
            if d < 1 and cv.inb(x, y) and cv.get(x, y)[3] == 0:
                al = int(a * (1 - d) ** 1.4)
                if al > 6:
                    cv.set(x, y, (col[0], col[1], col[2], al))


# ====================================================================== the lamp both stone kinds carry
def lamp(cv, cx, top, state):
    """An iron lamp 7 wide: a cap, a glass box, a base. state 0 dark, 1 lit, 2 flicker tall, 3 flicker low."""
    R(cv, cx - 2, top, 5, 1, DARK)
    R(cv, cx - 3, top + 1, 7, 1, SC(1))
    cv.set(cx, top - 1, DARK)
    for y in range(top + 2, top + 8):
        cv.set(cx - 3, y, DARK)
        cv.set(cx + 3, y, DARK)
        for x in range(cx - 2, cx + 3):
            if state == 0:
                c = INK(1) if (x + y) % 3 else SC(0)
                if x == cx - 2 and y < top + 5:
                    c = SC(2)            # a cold glint on the dead glass
            else:
                c = GD(4) if state != 3 else GD(3)
            cv.set(x, y, c)
    R(cv, cx - 3, top + 8, 7, 1, SC(1))
    R(cv, cx - 2, top + 9, 5, 1, DARK)
    if state == 0:
        cv.set(cx, top + 6, FI(0))      # a cold ember, nearly out
        return
    hgt = {1: 4, 2: 5, 3: 2}[state]
    for k in range(hgt):
        y = top + 7 - k
        cv.set(cx, y, WHITE if k < hgt - 1 and state != 3 else GD(4))
        if k < hgt - 2:
            cv.set(cx - 1, y, GD(4))
            cv.set(cx + 1, y, GD(4) if state == 2 else FI(3))
    cv.set(cx, top + 7 - hgt, FI(4) if state != 3 else FI(3))


def name_band(cv, x0, y0, w, state, ramp_dark):
    """The carved name: two short rows of glyph bars (never letters). Dark when not held, warm gold when held, a step
    dimmer on the low flicker frame."""
    for row, yy in enumerate((y0, y0 + 3)):
        for x in range(x0, x0 + w):
            if (x * 3 + row * 5) % 7 in (0, 4):
                continue
            if state == 0:
                cv.set(x, yy, ramp_dark)
            else:
                cv.set(x, yy, GD(4) if state in (1, 2) else GD(3))
                if state in (1, 2) and (x + row) % 3 == 0:
                    cv.set(x, yy, WHITE)


def namestone(state):
    """The cairn: three snow-capped stones stacked (lit from the upper left), the carved name on the middle stone, the
    iron lamp on top. The lamp sits on the upper tile, the base on the stone's own cell."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 2, 13, 31)
    stones = [(8, 26, 6.6, 4.4), (8, 19.5, 5.4, 3.8), (8, 14, 4.2, 3.0)]
    for (cx, cy, rx, ry) in stones:
        ellipse(cv, cx, cy, rx, ry, lambda dx, dy, d: (SC(4) if (dx + dy) < -0.6 else SC(3) if (dx + dy) < 0.2
                                                       else SC(2) if d < 0.9 else SC(1)))
        # the snow cap on each stone's top
        for x in range(int(cx - rx) + 1, int(cx + rx)):
            dx = (x + 0.5 - cx) / rx
            top = int(round(cy - ry * math.sqrt(max(0, 1 - dx * dx))))
            cv.set(x, top, SN(4))
            if abs(dx) < 0.6:
                cv.set(x, top + 1, SN(3))
    name_band(cv, 4, 18, 8, state, SC(0))
    lamp(cv, 8, 2, state)
    ink_outline(cv)
    if state:
        warm_glow(cv, 8.5, 7.5, 7.5, a={1: 70, 2: 90, 3: 40}[state])
    return cv


def name_plate(state):
    """The indoor stone: an iceglass plate on a frost-brick plinth, the name inside the ice, the lamp on top."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 2, 13, 31)
    # the plinth
    box(cv, 2, 25, 13, 30, SN(3), SN(2), SN(1), SN(0), round_=False)
    for x in range(3, 13):
        cv.set(x, 27, SN(0) if x % 4 == 2 else SN(2))
    # the plate
    for y in range(12, 25):
        for x in range(3, 13):
            if x in (3, 12) or y == 12:
                c = IC(3) if (x == 3 or y == 12) else WA(2)
            else:
                c = IC(1) if (x + y) % 5 else IC(2)
                if x - 4 == (y - 13) // 2:
                    c = IC(3)
            cv.set(x, y, c)
    name_band(cv, 5, 16, 6, state, WA(1))
    lamp(cv, 8, 1, state)
    ink_outline(cv)
    if state:
        warm_glow(cv, 8.5, 6.5, 7.5, a={1: 70, 2: 90, 3: 40}[state])
    return cv


# ====================================================================== the frost door
def frost_door(k):
    """A slab of clear ice filling the doorway cell and rising into the tile above: deep blue at the edges, a pale
    body, a frozen thing inside (a scrap of a name: glyph bars and a hand's shape, dark), a glint that moves (0, 1). 2 is
    the let-go: the slab half gone, running. 3 is melted: a wet sheen and a few shards on the floor."""
    cv = Canvas(16, 32)
    if k == 3:
        ellipse(cv, 8, 27, 7, 3, lambda dx, dy, d: (IC(2) + (110,))[:3] + (110,) if d > 0.6 else (IC(3)[:3] + (90,)))
        for (x, y) in ((3, 26), (12, 28), (9, 25)):
            cv.set(x, y, IC(3))
            cv.set(x + 1, y, IC(2))
        return cv
    top = 6 if k < 2 else 18
    for y in range(top, 31):
        for x in range(1, 15):
            edge = min(x - 1, 14 - x)
            if edge == 0 or y == top:
                c = WA(2) if edge == 0 else IC(3)
            elif edge <= 2:
                c = WA(2)
            else:
                c = IC(0) if (x + 2 * y) % 7 else IC(1)
                if (x + y) % 11 == 0:
                    c = IC(3)
            cv.set(x, y, c)
    if k < 2:
        # the frozen thing: a few glyph bars and a hand's outline, dark blue, deep in the ice
        for (x, y) in ((5, 14), (6, 14), (7, 14), (9, 14), (10, 14), (5, 17), (6, 17), (8, 17), (9, 17)):
            cv.set(x, y, WA(1))
        for (x, y) in ((6, 21), (7, 20), (8, 20), (9, 21), (9, 22), (6, 22), (7, 23), (8, 23)):
            cv.set(x, y, IP(0))
        gx, gy = ((3, 8), (11, 11))[k]
        cv.set(gx, gy, WHITE)
        cv.set(gx + 1, gy + 1, WHITE)
        cv.set(gx - 1, gy + 1, IC(3))
        cv.set(gx + 1, gy - 1, IC(3))
        cv.set(gx, gy + 2, IC(3))
    else:
        for x in range(2, 14, 3):
            for y in range(31, 31 - (x % 4) - 1, -1):
                cv.set(x, y, IC(3))
        for x in range(1, 15):
            cv.set(x, top, IC(3) if x % 2 else WHITE)
    ink_outline(cv, WA(1))
    contact_shadow(cv, 1, 14, 31, 60)
    return cv


def bayer_like(x, y):
    return ((x * 7 + y * 13) % 5) == 0


def ghost_trail(horizontal):
    """The ghost print recipe: 2 x 3 px prints (3 x 2 across), in GHOST, four to a cell, alternating feet at period 16."""
    cv = Canvas(16, 16)
    pts = ((4, 2), (9, 6), (4, 10), (9, 14))
    for (fx, fy) in pts:
        for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1), (0, 2)):
            x, y = fx + dx, (fy + dy) % 16
            if horizontal:
                x, y = y, x
            cv.set(x, y, GHOST)
    return cv


# ====================================================================== the Vault
def listening_bell(k):
    """The Listening Bell (2 x 3): a dark timber frame, a bronze bell on the beam, Mara's tag on a cord. 0 frozen in a
    block of ice; 1..3 thawed, swinging (-1, 0, +1)."""
    cv = Canvas(32, 48)
    contact_shadow(cv, 2, 29, 47)
    for x in (3, 26):
        R(cv, x, 6, 3, 41, WD(2))
        cv.vline(x, 6, 46, WD(3))
        cv.vline(x + 2, 6, 46, WD(0))
    R(cv, 1, 4, 30, 4, WD(3))
    cv.hline(1, 30, 4, WD(4))
    cv.hline(1, 30, 7, WD(0))
    for x in (3, 26):
        R(cv, x - 1, 44, 5, 3, SC(1))
    swing = [0, -1, 0, 1][k]
    cx = 16 + swing
    # the crown and the bell body (bronze: gold ramp darkened)
    R(cv, 15, 8, 3, 3, SC(0))
    for y in range(11, 31):
        t = (y - 11) / 19.0
        half = 3 + t * 6.5 + (2 if y > 27 else 0)
        sx = int(round(swing * t * 1.5))
        for x in range(int(cx - half) + sx, int(cx + half) + 1 + sx):
            u = (x - sx - (cx - half)) / (2 * half)
            c = GD(3) if u < 0.25 else GD(2) if u < 0.6 else GD(1) if u < 0.85 else GD(0)
            if y in (14, 26):
                c = GD(1)
            if y == 30:
                c = GD(0)
            cv.set(x, y, c)
    # the clapper
    cv.set(cx + swing, 31, SC(0))
    cv.set(cx + swing, 32, SC(1))
    # Mara's tag on a cord from the crown: a small square card
    tx = 22 + swing
    cv.line(17, 10, tx, 15, SA_C)
    R(cv, tx - 1, 15, 5, 6, SW(5))
    cv.hline(tx - 1, tx + 3, 15, SW(4))
    cv.set(tx, 17, DARK); cv.set(tx + 1, 17, DARK); cv.set(tx + 2, 17, DARK); cv.set(tx, 19, DARK); cv.set(tx + 2, 19, DARK)
    ink_outline(cv)
    if k == 0:
        # frozen in ice: a clear block over the bell, translucent ice tones, rime on top
        for y in range(9, 40):
            for x in range(6, 26):
                edge = min(x - 6, 25 - x, y - 9, 39 - y)
                p = cv.get(x, y)
                if edge == 0:
                    cv.set(x, y, IC(3) if y == 9 or x == 6 else WA(2))
                elif p[3] == 0:
                    cv.set(x, y, IC(2)[:3] + (150,) if (x + y) % 7 else IC(3)[:3] + (190,))
                else:
                    mixc = tuple(int(p[i] * 0.55 + IC(2)[i] * 0.45) for i in range(3)) + (255,)
                    cv.set(x, y, mixc)
        for x in range(6, 26):
            cv.set(x, 8, SN(4))
        for (x, y) in ((9, 13), (10, 14), (21, 30), (22, 31)):
            cv.set(x, y, WHITE)
    return cv


SA_C = C('sand', 1)


def stillheart(k):
    """The Stillheart (3 x 4): the heart of ice, a cluster of tall faceted crystals on a dark dais (a central spire and
    two smaller ones leaning out). k 0..2 frozen: pale blue-white facets, the names inside (glyph bars) drifting up a step
    a frame; k 3..5 thawed: the ice running bright, warm light streaming up through it."""
    cv = Canvas(48, 64)
    contact_shadow(cv, 3, 44, 63)
    for y in range(52, 63):
        for x in range(4, 44):
            c = SC(2) if y < 55 else (SC(1) if (x // 6 + y // 4) % 2 else SC(0))
            if y == 52:
                c = SN(3)
            cv.set(x, y, c)
    thaw = k >= 3
    f = k % 3
    # crystals: (centre x, base y, half width, height, lean)
    xtals = [(13, 54, 6, 26, -0.25), (35, 54, 6, 30, 0.22), (24, 54, 9, 50, 0.0)]
    for (xc, by, hw, ht, lean) in xtals:
        for y in range(by - ht, by):
            t = (by - y) / float(ht)                    # 0 at the base, 1 at the tip
            w = hw if t < 0.72 else hw * (1 - t) / 0.28
            mid = xc + lean * (by - y)
            for x in range(int(round(mid - w)), int(round(mid + w)) + 1):
                u = (x - (mid - w)) / max(1.0, 2 * w)   # 0 left .. 1 right
                if thaw:
                    c = WHITE if u < 0.3 else GD(4) if u < 0.62 else FI(4) if u < 0.85 else GD(2)
                else:
                    c = SN(4) if u < 0.3 else IC(2) if u < 0.62 else IC(1) if u < 0.85 else IC(0)
                if abs(u - 0.3) < 0.04 or abs(u - 0.62) < 0.04:
                    c = (GD(3) if thaw else IC(3)) if t < 0.72 else c
                cv.set(x, y, c)
    # the names inside the big crystal: glyph bars drifting up (frozen) or streaming bright (thawed)
    for i in range(10):
        bx = 19 + (i * 5) % 9
        by = 50 - ((i * 7 + f * 4) % 38)
        L = 2 + i % 4
        for xx in range(bx, bx + L):
            if cv.get(xx, by)[3] and (xx + i) % 5:
                cv.set(xx, by, (WHITE if (xx + f) % 3 else FI(5)) if thaw else (WA(2) if (xx + i) % 3 else WA(1)))
    ink_outline(cv, WA(1) if not thaw else GD(1))
    warm_glow(cv, 24, 32, 26, a=70 if thaw else 40, col=GD(4) if thaw else IC(2))
    return cv


def round_door(opened):
    """The round door (3 x 3, door_boss style): a stone frame in a 2-row wall face, a round slab of ice-stone with the
    Keepers' ring carved on it and no keyhole; open: the slab rolled into the wall, the dark beyond."""
    cv = Canvas(48, 48)
    # the frame: dark stone blocks, a rimed arch
    for y in range(0, 48):
        for x in range(0, 48):
            if x < 7 or x > 40 or y < 6:
                c = SC(2) if (x // 8 + y // 6) % 2 else SC(1)
                if y % 6 == 5 or x % 8 == 7:
                    c = SC(0)
                cv.set(x, y, c)
    for x in range(48):
        cv.set(x, 0, SN(3))
        cv.set(x, 1, SN(4) if x % 3 else SN(2))
    cx, cy, r = 24, 28, 17.5
    for y in range(6, 48):
        for x in range(7, 41):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d > r + 1.5:
                if y >= cy:
                    cv.set(x, y, SC(1))
                continue
            if d > r:
                cv.set(x, y, SN(4) if y < cy else SN(2))
            elif opened:
                cv.set(x, y, DARK if d < r - 1 else SC(0))
            else:
                lit = -((x - cx) * 0.6 + (y - cy) * 0.8) / r
                c = SN(4) if lit > 0.5 else SN(3) if lit > 0.0 else SN(2) if lit > -0.5 else SN(1)
                if abs(d - 11) < 0.7 or abs(d - 6) < 0.6:
                    c = SN(0)
                if abs(d - 11) < 0.7 and int(math.degrees(math.atan2(y - cy, x - cx)) + 360) % 30 < 8:
                    c = AG(1)
                cv.set(x, y, c)
    if opened:
        # the slab rolled to the right, edge-on in the wall
        for y in range(12, 46):
            for x in range(38, 44):
                cv.set(x, y, SN(3) if x < 40 else SN(1))
        for y in range(30, 48):
            for x in range(14, 34):
                if cv.get(x, y)[:3] == DARK[:3]:
                    cv.set(x, y, INK(1) if (x + y) % 5 else DARK)
    return cv


def page_block(opened):
    """The ice block with the half page (16 x 32): frozen, the page's cream edge and a few frosted lines inside; opened,
    the block split in two halves leaning apart, meltwater, nothing in it."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    if not opened:
        for y in range(10, 31):
            for x in range(1, 15):
                edge = min(x - 1, 14 - x, y - 10, 30 - y)
                c = WA(2) if edge == 0 and (x == 14 or y == 30) else IC(3) if edge == 0 else IC(2) if (x + y) % 6 else IC(3)
                cv.set(x, y, c)
        for y in range(15, 26):
            for x in range(4, 12):
                c = SW(5) if (x + y) % 4 else SW(4)
                if y == 25 and x % 2:
                    c = IC(3)          # the torn edge, frosted
                if y in (17, 20, 23) and 5 <= x <= 10:
                    c = SN(2)          # lines, frosted unreadable
                cv.set(x, y, c)
        for (x, y) in ((3, 12), (4, 13), (11, 27)):
            cv.set(x, y, WHITE)
        for x in range(1, 15):
            cv.set(x, 9, SN(4))
    else:
        for (x0, lean) in ((1, -1), (9, 1)):
            for y in range(14, 31):
                for x in range(x0, x0 + 6):
                    xx = x + (lean if y < 20 else 0)
                    edge = min(x - x0, x0 + 5 - x, y - 14, 30 - y)
                    cv.set(xx, y, IC(3) if edge == 0 else IC(2))
        ellipse(cv, 8, 29, 6, 2, lambda dx, dy, d: IC(3)[:3] + (120,))
    ink_outline(cv, WA(1))
    return cv


def star_stair(k):
    """The stair of written light (3 x 7, all overhead): steps climbing from the lower left to the upper right, each step
    a tread of light with a line of handwriting on it (glyph bars), a soft riser glow under it; a shimmer runs up the
    steps (k 0..2); the top steps fade into the sky."""
    cv = Canvas(48, 112)
    n = 13
    for s in range(n):
        y = 106 - s * 8
        x0 = 1 + s * 2
        L = 18 - s // 3
        fadek = max(0.0, (s - 7) / 6.0)
        hot = (s + k) % 3 == 0
        al = int(255 * (1 - fadek * 0.8))
        for x in range(x0, min(48, x0 + L)):
            edge = x in (x0, min(47, x0 + L - 1))
            cv.put(x, y, (GD(4) if not hot else WHITE)[:3] + (al,))
            cv.put(x, y + 1, GD(3)[:3] + (int(al * (0.6 if edge else 0.85)),))
            if (x * 5 + s) % 6 and not edge and x % 7 != 3:
                cv.put(x, y - 1, (FI(5) if hot else GD(5))[:3] + (int(al * 0.75),))
        for x in range(x0, min(48, x0 + L)):
            for dy in range(2, 7):
                cv.put(x, y + dy, GD(4)[:3] + (int(70 * (1 - fadek) / dy),))
    return cv


def crate_dash_ice(broken):
    """A crate sealed in cracked ice (Dash Strike breaks it): 0 cracked (solid), 1 broken (shards and splinters)."""
    cv = Canvas(16, 32)
    if broken:
        for (x, y, c) in ((3, 27, IC(3)), (4, 28, IC(2)), (10, 26, IC(3)), (11, 27, IC(1)), (7, 29, WD(3)), (8, 29, WD(2)),
                          (12, 29, WD(4)), (5, 25, IC(2))):
            cv.set(x, y, c)
        return cv
    contact_shadow(cv, 1, 14, 31)
    box(cv, 2, 17, 13, 30, WD(4), WD(3), WD(2), WD(0), round_=False)
    for x in range(3, 13):
        cv.set(x, 23, WD(1))
    cv.line(3, 18, 12, 29, WD(2))
    for y in range(13, 31):
        for x in range(1, 15):
            p = cv.get(x, y)
            edge = min(x - 1, 14 - x, y - 13)
            if edge == 0:
                cv.set(x, y, IC(3) if y == 13 or x == 1 else WA(2))
            elif p[3] == 0:
                cv.set(x, y, IC(2)[:3] + (170,))
    for (x, y) in ((5, 14), (6, 15), (6, 16), (7, 17), (8, 17), (9, 18), (11, 15), (10, 16)):
        cv.set(x, y, WHITE)
    ink_outline(cv, WA(1))
    return cv


def winterwatch_cache(opened):
    """The Winterwatch Provision Cache (2 x 2): an iron-bound chest under a crust of frost; open: the lid back, gold."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 29, 31)
    box(cv, 3, 17, 28, 30, SC(3), SC(2), SC(1), DARK, round_=False)
    for x in (8, 23):
        R(cv, x, 17, 2, 14, MT(1))
    if opened:
        box(cv, 3, 8, 28, 16, SC(2), SC(1), SC(0), DARK, round_=False)
        for x in range(5, 27):
            cv.set(x, 17, GD(4) if x % 3 else GD(5))
            cv.set(x, 18, GD(3))
    else:
        box(cv, 3, 11, 28, 18, SC(3), SC(2), SC(1), DARK, round_=False)
        for x in range(3, 29):
            cv.set(x, 11, SN(4))
            if x % 4:
                cv.set(x, 12, SN(3))
        R(cv, 14, 16, 4, 4, GD(3))
        cv.set(15, 18, DARK)
    for x in range(4, 28, 5):
        cv.set(x, 29, SN(3))
    ink_outline(cv)
    return cv


def lift_frost():
    """The Vault's lift (lift_f1_up, lift_f2_down...): an iceglass cage on a frost-brick foot, a chain overhead."""
    cv = Canvas(16, 32)
    for y in range(4, 31):
        for x in range(1, 15):
            if x in (1, 14) or y in (4, 30):
                c = SN(1)
            elif x % 4 == 1:
                c = SN(2)
            else:
                c = INK(1) if y > 18 else (IC(1) if (x + y) % 5 else IC(2))
            cv.set(x, y, c)
    for y in range(0, 4):
        cv.set(7, y, MT(1))
        cv.set(8, y, MT(2))
    R(cv, 4, 26, 8, 4, INK(0))
    ink_outline(cv)
    return cv


def font_thaw(k):
    """The Thawlight Recovery Basin (2 x 2, rest and save): a frost-brick basin of warm water, steam curling up."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 29, 31)
    ellipse(cv, 16, 24, 14, 6, lambda dx, dy, d: SN(3) if dy < -0.3 else SN(2) if d < 0.95 else SN(1))
    ellipse(cv, 16, 23, 11, 4, lambda dx, dy, d: (GD(4) if (dx + k * 0.3) % 0.7 < 0.2 else IC(2)) if d < 0.8 else IC(1))
    R(cv, 4, 25, 25, 5, SN(2))
    for x in range(4, 29):
        cv.set(x, 29, SN(1))
        if x % 4 == 0:
            cv.set(x, 27, SN(1))
    for i in range(3):
        sx = 10 + i * 6
        for t in range(12):
            y = 18 - t
            x = sx + int(round(1.6 * math.sin((t + k * 2 + i) * 0.7)))
            cv.put(x, y, SN(4)[:3] + (max(0, 170 - t * 13),))
    ink_outline(cv)
    return cv


def watch_cots():
    """Three cots by the Watch's stove (after doors_reopened): low frames, fur rugs, a folded blanket each."""
    cv = Canvas(48, 32)
    for i in range(3):
        x0 = 1 + i * 16
        contact_shadow(cv, x0, x0 + 13, 31)
        box(cv, x0, 14, x0 + 13, 29, WD(4), WD(3), WD(2), WD(0), round_=False)
        for y in range(15, 28):
            for x in range(x0 + 1, x0 + 13):
                cv.set(x, y, [SW(4), SW(3), RB(3)][i] if (x + y) % 5 else [SW(5), SW(4), RB(4)][i])
        R(cv, x0 + 2, 16, 10, 3, WHITE)
        cv.hline(x0 + 2, x0 + 11, 19, SN(2))
    ink_outline(cv)
    return cv


# ====================================================================== build
def build_into(sh):
    sh.newline()
    O = sh.meta['objects']
    put_frames(sh, 'namestone', [namestone(s) for s in range(4)], [0, 1], [[0, 0]], overhead=1,
               light={'color': '#f9d77a', 'radius': 2.4, 'frames': [1, 2, 3]},
               flicker={'frames': [2, 3], 'ms': 500},
               note='a name stone (event namestone, outdoors): frames 0 dim (not held), 1 lit (held), 2 and 3 the slow '
                    'flicker of the OLDEST held stone (cycle 2, 3 at 500 ms); the lamp is on the tile above the cell, so '
                    'the party never covers it; light only on frames 1 to 3. Solid, faced from ground')
    put_frames(sh, 'name_plate', [name_plate(s) for s in range(4)], [0, 1], [[0, 0]], overhead=1,
               light={'color': '#f9d77a', 'radius': 2.4, 'frames': [1, 2, 3]},
               flicker={'frames': [2, 3], 'ms': 500},
               note='a name stone indoors (event namestone with sprite name_plate): an iceglass plate on a frost-brick '
                    'plinth; frames as namestone')
    put_frames(sh, 'frost_door', [frost_door(k) for k in range(4)], [0, 1], [], overhead=1, kind='piece',
               glint={'frames': [0, 1], 'ms': 700},
               note='a frost door (a cell of the remember.frost grid, drawn by E7-world on the frost cell): 0 and 1 solid '
                    '(cycle at 700 ms while its stone is held), 2 melting (the 16-frame let-go), 3 melted (a wet sheen on '
                    'the floor). collision none here: the frost grid decides')
    O['frost_door']['collision'] = 'none'
    put_frames(sh, 'ghost_trail', [ghost_trail(False), ghost_trail(True)], [0, 0], [], kind='piece',
               recipe={'color': '#c3cad6', 'print': [2, 3], 'perCell': 4, 'at': [[4, 2], [9, 6], [4, 10], [9, 14]],
                       'period': 16, 'horizontal': 'swap x and y'},
               note='the ghost trail as art (E7-world draws the same in code on every UNHELD path cell over the fade): '
                    'frame 0 north-south, 1 east-west; prints 2 x 3 px in #c3cad6, four a cell at period 16')
    O['ghost_trail']['collision'] = 'none'
    sh.newline()
    put_frames(sh, 'listening_bell', [listening_bell(k) for k in range(4)], [0, 2], [[0, 0], [1, 0]], overhead=2,
               swingFrames=[1, 2, 3, 2], swingMs=320,
               note='the Listening Bell (F2 bell bay, 2 x 3): frame 0 frozen in ice; 1..3 thawed, swinging (cycle 1, 2, '
                    '3, 2); Mara\'s tag hangs from the crown')
    put_frames(sh, 'stillheart', [stillheart(k) for k in range(6)], [0, 3],
               [[0, 0], [1, 0], [2, 0], [0, -1], [1, -1], [2, -1]], overhead=2,
               frozenFrames=[0, 1, 2], thawFrames=[3, 4, 5], ms=300,
               light={'color': '#b4e4f2', 'radius': 4.0},
               note='the heart of ice (the Stillheart, 3 x 4): frames 0..2 frozen with the names drifting (cycle at 300 '
                    'ms), 3..5 thawed, running bright (after phantom_defeated); the Phantom\'s avatar stands over it')
    sh.newline()
    put_frames(sh, 'round_door', [round_door(False), round_door(True)], [0, 2], [[0, 0], [2, 0]], overhead=0,
               door=[1, 0], kind='door',
               note='the round door at the top of F3 (3 x 3, door_boss style, set into a 2-row face): 0 closed (no '
                    'keyhole: the Keeper\'s hand opens it, story), 1 open; cell (1, 0) is the doorway, its passage '
                    'decided by the event (if stillheart_open)')
    put_frames(sh, 'page_block', [page_block(False), page_block(True)], [0, 1], [[0, 0]], overhead=1,
               note='the ice block with the half page (the Stillheart): 0 frozen, 1 opened')
    put_frames(sh, 'crate_dash_ice', [crate_dash_ice(False), crate_dash_ice(True)], [0, 1], [[0, 0]], overhead=1,
               note='a crate sealed in cracked ice: 0 cracked (solid; Dash Strike breaks it), 1 broken (decor; the cell opens)')
    put_frames(sh, 'winterwatch_cache', [winterwatch_cache(False), winterwatch_cache(True)], [0, 1], [[0, 0], [1, 0]],
               overhead=1, note='the Winterwatch Provision Cache (F1 E, 2 x 2): 0 closed, 1 open')
    sh.obj('lift_frost', lift_frost(), [0, 1], [], 0, door=[0, 0], kind='door',
           note='the Vault\'s lift (lift_f1_up, lift_f2_down, the F3 stair back): an iceglass cage, the door cell is (0,0)')
    put_frames(sh, 'font_thaw', [font_thaw(k) for k in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1, anim_ms=260,
               light={'color': '#f9d77a', 'radius': 2.6},
               note='the Thawlight Recovery Basin (rest and save: font_v1, font_v2, font_v2b, font_v3): warm water, steam')
    sh.obj('watch_cots', watch_cots(), [0, 1], [[0, 0], [1, 0], [2, 0]], 1,
           note='three cots by the Watch\'s stove (object watch_cots, a rest, after doors_reopened)')
    sh.newline()
    put_frames(sh, 'star_stair', [star_stair(k) for k in range(3)], [0, 6], [], overhead=7, anim_ms=320, kind='piece',
               note='the stair of written light (ep7_ending; kept for Episode 8): 3 x 7, all overhead, collision none; '
                    'steps of glyph-bar handwriting climbing to the upper right, a shimmer running up them')
    O['star_stair']['collision'] = 'none'
