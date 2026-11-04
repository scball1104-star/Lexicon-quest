"""The Sunken Keep objects (Episode 4) -> ep4.png, after the terrains, walls and canal kit (E4-tiles, EPISODE4_PLAN 9.1,
5.1). Imported by ep4.py.

State art follows the court and forge convention: an object with several looks carries "frames": [[x,y,w,h]..] indexed
by the event's state (rect = frames[0]); animated pieces carry "anim" (a frameDx strip). Gates come in `<id>_closed` /
`<id>_open` pairs (register them on GATE_SPRITES from the pack).

  tide_wheel          16x32 prop, frames 0 = low, 1 = mid, 2 = high: the red knob on the wheel points left / up /
                      right AND one of three lamps on the stand is lit (left / middle / right). Solid, faced.
  tide_post           16x32 prop, frames 0..2 = the basin's level (0 dry, 1 water at mark 1, 2 water at mark 2):
                      a red and white striped post, gold rings at the two marks, a foam ring at the waterline.
  pontoon, book_crate 16x16 prop, frames 0 = grounded (dull, tilted, on wet mud, solid), 1 and 2 = afloat (bright
                      deck, foam ring, the two bob frames: bob = frames 1, 2), 3 = submerged (seen under the surface).
  seal_paper          16x32 piece over a doorway: frames 0 = sealed (white notice, red wax seal), 1 = washing (the
                      ink blooming into a red cloud), 2 = washed (nail stubs and a pink stain). Solid while sealed.
  seal_wash           16x16 translucent red ink cloud, anim 3 (the wash effect over water)
  door_canal_closed / _open   16x32 a sluice door in a 2-row face / the dark arched doorway (doorAt (0, 0))
  floodgate_closed / _open    32x32 in a 2-row face: an iron sluice gate with a brass counterweight float on a chain
                      (float low = shut; float high and the gate raised = open). Cells (0,0) and (1,0).
  principle_stone_voice / _truth / _mercy   32x32, frames 0 = unstruck, 1 = struck: a small bell under a marble dome,
                      blue / gold / green.
  petition_gate_closed (frames 0..3 = sockets lit) / petition_gate_open   48x48 in a 3-wide face
  witness_lectern     16x32, frames 0 = the Witness Book open and unsigned, 1 = signed (a dark name that held)
  door_seal_closed / _open    48x48 boss door with the Sunken Seal (needs seal_key)
  boat                32x32, anim 2 (bob): Hale's punt with a pole and a lantern (the boat-door sprite)
  throne_paper        64x64 (4x4), frames 0 = occupied (draped in sealed decrees), 1 = empty (a heap of wet decrees)
  glass_dome          48x48 overhead piece (collision none): the dry room's old glass dome
  lantern_chain       16x32 overhead piece, anim 3, light: a lantern hung on a chain
  lantern_reflection  16x16 translucent overlay, anim 3: a lantern's reflection on high water (Mercy wing)
  font_tide           32x32 anim 3 (rest and save): a marble basin with a turquoise spout
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32
from court_props import put_frames, ellipse, glow, strip
from ep4_kit import K, SW, GR, G, CY, WA, GD, MT, SD, WD, RR, RB, EA, INK, TQ, WX, tq

OUT = K(0)


def box(cv, x0, y0, x1, y1, hi, mid, lo, out=OUT, round_=True):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if round_ and x in (x0, x1) and y in (y0, y1):
                continue
            if x in (x0, x1) or y in (y0, y1):
                c = out
            elif y == y0 + 1 or x == x0 + 1:
                c = hi
            elif y == y1 - 1 or x == x1 - 1:
                c = lo
            else:
                c = mid
            cv.set(x, y, c)


def shadow(cv, x0, x1, y, a=90):
    for x in range(x0, x1 + 1):
        cv.put(x, y, SH(a))


def disc(cv, cx, cy, r, fn):
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r:
                c = fn(x, y, d)
                if c is not None:
                    cv.set(x, y, c)


# ====================================================================== tide wheel
def tide_wheel(level):
    """A lock wheel on a stone stand. The red knob sits at 9, 12 or 3 o'clock (low, mid, high) on a gold spoke, and the
    stand's gauge plate lights the matching lamp of three (left, middle, right) in bright turquoise."""
    cv = Canvas(16, 32)
    shadow(cv, 2, 15, 31, 80)
    # stand
    box(cv, 2, 19, 13, 30, K(4), K(3), K(1))
    for x in range(3, 13):
        cv.set(x, 20, K(5))
    cv.hline(1, 14, 30, OUT)
    box(cv, 1, 27, 14, 30, K(4), K(2), K(1))
    # gauge plate: three lamps (3 x 3 each, the lit one bright turquoise with a halo on the plate)
    box(cv, 1, 21, 14, 26, K(2), SD(1), K(1), out=OUT, round_=False)
    for i, lx in enumerate((4, 8, 12)):
        lit = i == level
        for yy in range(22, 25):
            for xx in range(lx - 1, lx + 2):
                if lit:
                    c = CY(4) if (xx == lx and yy == 23) else CY(3)
                else:
                    c = DARK if (xx == lx and yy == 23) else SD(0)
                cv.set(xx, yy, c)
        if lit:
            cv.set(lx - 1, 25, CY(2)); cv.set(lx, 25, CY(2)); cv.set(lx + 1, 25, CY(2))
        else:
            cv.set(lx - 1, 22, K(1))
    # axle post
    cv.vline(7, 15, 19, K(1))
    cv.vline(8, 15, 19, K(4))
    # the wheel: iron rim, six spokes, gold hub
    cx, cy, R = 8.0, 9.5, 7.2
    disc(cv, cx, cy, R, lambda x, y, d: OUT if d > R - 1.0 else (K(4) if d > R - 2.0 and (y < cy) else (K(2) if d > R - 2.0 else None)))
    disc(cv, cx, cy, R - 2.0, lambda x, y, d: OUT if d > R - 3.0 else None)
    ang_knob = {0: math.pi, 1: -math.pi / 2, 2: 0.0}[level]
    for k in range(6):
        a = ang_knob + k * math.pi / 3
        for r in range(2, 6):
            x = int(round(cx - 0.5 + math.cos(a) * r))
            y = int(round(cy - 0.5 + math.sin(a) * r))
            if k == 0:
                cv.set(x, y, GD(4) if r < 4 else GD(3))
            else:
                cv.set(x, y, K(3) if (y < cy) else K(2))
    disc(cv, cx, cy, 1.6, lambda x, y, d: GD(4) if (x < cx and y < cy) else GD(2))
    # the knob (wax red handle) on the rim
    kx = int(round(cx - 0.5 + math.cos(ang_knob) * 6.0))
    ky = int(round(cy - 0.5 + math.sin(ang_knob) * 6.0))
    for dy in range(-1, 2):
        for dx in range(-1, 2):
            cv.set(kx + dx, ky + dy, WX(0))
    cv.set(kx - 1, ky - 1, WX(1))
    cv.set(kx, ky - 1, WX(1))
    cv.set(kx + 1, ky + 1, RR(1))
    for (dx, dy) in ((-2, 0), (2, 0), (0, -2), (0, 2)):
        if cv.get(kx + dx, ky + dy)[3] == 0:
            cv.set(kx + dx, ky + dy, OUT)
    return cv


# ====================================================================== tide post
def tide_post(level):
    """A striped gauge post in a basin. Level 0: dry, a weed stain at its foot. Level 1: water up to the mark-1 gold
    ring (y 24), a foam ring round the post. Level 2: water up to the mark-2 ring (y 15)."""
    cv = Canvas(16, 32)
    top = 2
    wl = {0: 31, 1: 24, 2: 15}[level]
    for y in range(top + 3, 31):
        for x in range(6, 10):
            band = ((y - top) // 3) % 2
            c = MT(3) if band == 0 else WX(0)
            if x == 6:
                c = MT(4) if band == 0 else WX(1)
            elif x == 9:
                c = K(4) if band == 0 else RR(1)
            if y > wl:
                c = {MT(3): TQ(1), MT(4): CY(2), K(4): TQ(0), WX(0): TQ(0), WX(1): TQ(1), RR(1): DARK}.get(c, c)
            cv.set(x, y, c)
        cv.set(5, y, OUT)
        cv.set(10, y, OUT)
    # finial
    for x in range(6, 10):
        cv.set(x, top + 2, GD(2))
    cv.set(6, top + 1, GD(4)); cv.set(7, top + 1, GD(4)); cv.set(8, top + 1, GD(3)); cv.set(9, top + 1, GD(2))
    cv.set(7, top, GD(5)); cv.set(8, top, GD(3))
    cv.set(5, top + 2, OUT); cv.set(10, top + 2, OUT)
    # gold rings at the marks
    for my in (15, 24):
        for x in range(5, 11):
            cv.set(x, my, GD(4) if x < 8 else GD(2))
        cv.set(4, my, OUT); cv.set(11, my, OUT)
    if level == 0:
        for x in range(4, 12):
            cv.set(x, 30, GR(1) if x % 2 else GR(2))
        shadow(cv, 9, 13, 31, 70)
    else:
        # the waterline: a foam ring round the post, ripples
        for x in range(2, 14):
            d = abs(x - 7.5)
            if d > 2.0:
                cv.set(x, wl, CY(4) if (x + level) % 3 else CY(3))
                if d > 3.5:
                    cv.set(x, wl + 1, CY(2))
        cv.set(3, wl - 1, CY(3))
        cv.set(12, wl - 1, CY(3))
        cv.set(6, wl, CY(4)); cv.set(9, wl, CY(3))
    return cv


# ====================================================================== pontoons and book crates
def _deck(cv, x0, y0, x1, y1, tones, seam, rope=True, crate=False):
    hi, mid, lo = tones
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (y0, y1)
            if edge:
                c = OUT if not crate else seam
            elif crate:
                c = mid
                if y == y0 + 1:
                    c = hi
                elif y == y1 - 1 or x == x1 - 1:
                    c = lo
                if x in (x0 + 4, x1 - 4):
                    c = lo
            else:
                c = mid if ((y - y0) // 3) % 2 == 0 else hi
                if (y - y0) % 3 == 0:
                    c = seam
                elif x == x1 - 1:
                    c = lo
            cv.set(x, y, c)
    if crate:
        # book spines showing in the slats
        for i, x in enumerate(range(x0 + 2, x1 - 1)):
            if x in (x0 + 4, x1 - 4):
                continue
            col = [RB(2), GR(2), RR(2), SW(4)][(i + x) % 4]
            cv.set(x, y0 + 3, col)
            cv.set(x, y0 + 4, col)
        for x in range(x0 + 1, x1):
            cv.set(x, (y0 + y1) // 2 + 1, seam)
    if rope:
        cv.set(x0 + 2, y0 + 2, GD(3))
        cv.set(x0 + 3, y0 + 2, GD(2))
        cv.set(x0 + 2, y0 + 3, GD(1))


def float_frame(state, crate=False):
    """state 0 grounded, 1 afloat (high), 2 afloat (bobbed 1 px), 3 submerged."""
    cv = Canvas(16, 16)
    if state == 0:
        # grounded: sitting on the wet floor, dull and dark, a mud skirt and weed hanging off the hull, no foam
        for x in range(1, 15):
            cv.set(x, 13, EA(1) if x % 3 else GR(1))
            cv.set(x, 14, EA(0) if x % 2 else GR(2))
        _deck(cv, 2, 4, 13, 11, (WD(2), WD(1), WD(0)), WD(0), rope=False, crate=crate)
        for x in range(2, 14):
            cv.set(x, 12, SD(1))
            if x % 3 == 1:
                cv.set(x, 13, GR(2))
        cv.set(2, 12, OUT)
        cv.set(13, 12, OUT)
        for (x, y) in ((4, 6), (9, 9), (11, 5)):
            cv.set(x, y, GR(2))
        return cv
    if state == 3:
        # submerged: the deck seen through the water, turquoise and low contrast, a glint on the surface
        _deck(cv, 2, 4, 13, 12, (TQ(1), TQ(0), TQ(0)), DARK, rope=False, crate=crate)
        for y in range(4, 13):
            for x in range(2, 14):
                p = cv.get(x, y)
                if p[3] and (x + y) % 5 == 0:
                    cv.set(x, y, tq(1))
        cv.set(5, 6, CY(3))
        cv.set(10, 9, CY(3))
        return cv
    dy = 0 if state == 1 else 1
    # afloat: a lit deck level with the walkways, a white foam ring round the hull, a dark waterline under it
    for x in range(1, 15):
        cv.set(x, 13 + dy, CY(4) if (x + state) % 3 else CY(3))
    for y in range(4 + dy, 14 + dy):
        cv.set(1, y, CY(3) if (y + state) % 2 else CY(4))
        cv.set(14, y, CY(3))
    tones = (WD(5), WD(4), WD(2)) if not crate else (WD(5), WD(4), WD(2))
    _deck(cv, 2, 3 + dy, 13, 11 + dy, tones, WD(1), rope=True, crate=crate)
    for x in range(2, 14):
        cv.set(x, 12 + dy, WD(1))
    cv.set(2, 12 + dy, OUT)
    cv.set(13, 12 + dy, OUT)
    return cv


# ====================================================================== seals and doors
def seal_paper(state):
    """A forged notice nailed across a doorway: white paper, two lines of crisp black text, a big red wax seal with a
    ribbon. 1 = washing (the ink runs, a red cloud blooms), 2 = washed (nail stubs, a pink stain)."""
    cv = Canvas(16, 32)
    if state == 2:
        for (x, y) in ((3, 9), (12, 9), (3, 23), (12, 23)):
            cv.set(x, y, K(1))
            cv.set(x, y - 1, K(4))
        for (x, y) in ((6, 16), (7, 16), (8, 17), (7, 18), (9, 15)):
            cv.put(x, y, WX(1)[:3] + (90,))
        for (x, y) in ((4, 24), (5, 25), (11, 24)):
            cv.set(x, y, SW(4))
        return cv
    for y in range(8, 25):
        for x in range(2, 14):
            c = MT(4) if y > 8 else MT(3)
            if x == 13 or y == 24:
                c = K(4)
            if x in (2,):
                c = MT(3)
            cv.set(x, y, c)
        cv.set(1, y, OUT)
        cv.set(14, y, OUT)
    for x in range(1, 15):
        cv.set(x, 7, OUT)
        cv.set(x, 25, OUT)
    # header bar and text lines (crisp: the forgery is dry)
    for x in range(4, 12):
        cv.set(x, 10, DARK)
    for y in (12, 20, 22):
        for x in range(4, 12 if y != 22 else 9):
            if (x + y) % 4 != 3:
                cv.set(x, y, K(1))
    # the seal: a crimson wax disc 7 px across with a bright rim, two ribbon tails
    disc(cv, 8.0, 16.5, 3.4, lambda x, y, d: WX(1) if (d > 2.4 and x < 8 and y < 16) else (WX(0) if d > 0.9 else RR(1)))
    cv.set(7, 15, WX(1))
    cv.set(9, 18, RR(1))
    for k in range(3):
        cv.set(6 - k // 2, 20 + k, WX(0))
        cv.set(10 + k // 2, 20 + k, WX(0))
    # nails
    for (x, y) in ((3, 9), (12, 9), (3, 23), (12, 23)):
        cv.set(x, y, K(1))
    cv.put(14, 26, SH(80))
    if state == 1:
        # washing: the ink runs down in streaks and blooms into a translucent red cloud
        for x in range(2, 14):
            for y in range(9, 25):
                if cv.get(x, y)[:3] in (K(1)[:3], DARK[:3]) and (x + y) % 2 == 0:
                    for k in range(1, 4):
                        cv.set(x, min(24, y + k), INK(2) if k < 3 else INK(3))
        for y in range(4, 31):
            for x in range(0, 16):
                d = math.hypot((x - 8) / 7.0, (y - 18) / 11.0)
                if d < 1.0 and h32(x, y, 5101) % 3:
                    cv.put(x, y, WX(0)[:3] + (int(150 * (1 - d)),))
        for y in range(9, 24):
            cv.set(2 + (y % 3 == 0), y, (0, 0, 0, 0)) if y % 4 == 0 else None
    return cv


def seal_wash(f):
    cv = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            d = math.hypot((x - 7.5) / (5.0 + f * 1.4), (y - 8.5) / (4.0 + f))
            if d < 1.0 and h32(x, y, f, 5111) % 4:
                cv.put(x, y, (WX(0) if d < 0.6 else WX(1))[:3] + (int(170 * (1 - d) * (1 - f * 0.22)),))
    return cv


def door_canal(opn):
    """16x32 in a 2-row face: a stone arch; closed = an iron-banded oak sluice door; open = the dark passage."""
    cv = Canvas(16, 32)
    for y in range(4, 32):
        for x in range(1, 15):
            d = math.hypot((x - 7.5) / 6.5, (y - 11) / 7.0)
            if y < 11 and d > 1.0:
                continue
            frame = (y < 11 and d > 0.78) or x in (1, 2, 13, 14)
            if frame:
                c = K(4) if x < 8 else K(2)
                if y < 11 and d > 0.9:
                    c = OUT
                if x in (1, 14):
                    c = OUT
            elif opn:
                c = DARK if y < 26 else SD(1)
                if y == 31:
                    c = K(2)
            else:
                c = WD(3) if (x // 3) % 2 == 0 else WD(2)
                if x % 3 == 2:
                    c = WD(1)
                if y in (14, 24):
                    c = K(1) if x % 4 else K(4)
                if y >= 26:
                    c = GR(2) if (x + y) % 2 else WD(1)
            cv.set(x, y, c)
    if not opn:
        cv.set(11, 19, GD(4)); cv.set(11, 20, GD(2)); cv.set(10, 19, GD(3))
    for x in range(1, 15):
        cv.set(x, 26, GR(1) if x % 3 else GR(2))
    return cv


def floodgate(opn):
    """32x32 in a 2-row face. Left 24 px: the gate (iron bars in a stone frame); right 8 px: a chain to a brass float
    drum in a slot. Shut: bars down, float at the bottom. Open: bars drawn up into the head, the float high."""
    cv = Canvas(32, 32)
    # frame
    for y in range(2, 32):
        for x in range(0, 24):
            if x in (0, 1, 22, 23) or y in (2, 3, 4):
                c = K(4) if (x in (0, 1) or y in (2, 3)) else K(2)
                if x == 0 or y == 2:
                    c = OUT
                cv.set(x, y, c)
            else:
                cv.set(x, y, DARK if y < 27 else SD(1))
    for x in range(2, 22):
        cv.set(x, 5, K(0))
    bar_bot = 30 if not opn else 10
    for x in range(3, 22, 3):
        for y in range(5, bar_bot + 1):
            cv.set(x, y, K(4) if (y % 6) else K(5))
            cv.set(x + 1, y, K(1))
    for y in (9, 20) if not opn else (8,):
        for x in range(2, 22):
            cv.set(x, y, K(3) if x % 3 else K(1))
    if not opn:
        for x in range(2, 22):
            cv.set(x, 30, K(1))
            cv.set(x, 31, OUT)
    else:
        for x in (3, 9, 15, 21):
            cv.set(x, 11, K(5))
    # float slot (stone) with water at the bottom
    for y in range(2, 32):
        for x in range(24, 32):
            c = K(3)
            if x in (24, 31):
                c = OUT
            elif 26 <= x <= 29 and y >= 4:
                c = SD(0)
                if y >= 27:
                    c = TQ(1) if (x + y) % 3 else CY(2)
            cv.set(x, y, c)
    fy = 22 if not opn else 6
    # chain up from the float to a pulley at the top
    cv.set(27, 3, GD(3)); cv.set(28, 3, GD(2)); cv.set(26, 3, GD(1))
    for y in range(4, fy):
        cv.set(27 + (y % 2), y, MT(2) if y % 2 else K(2))
    # the float drum
    for y in range(fy, fy + 5):
        for x in range(25, 31):
            c = GD(3) if y == fy else (GD(2) if x < 29 else GD(1))
            if x in (25, 30) or y == fy + 4:
                c = GD(0)
            cv.set(x, y, c)
    cv.set(26, fy + 1, GD(5))
    if opn:
        for x in range(26, 30):
            cv.set(x, fy + 5, CY(4) if x % 2 else CY(3))
    return cv


# ====================================================================== the Court of Witnesses
PRINCIPLE = {'voice': (RB, 3), 'truth': (GD, 4), 'mercy': (GR, 4)}


def principle_stone(kind, struck):
    """32x32, footprint 2 cells: a marble plinth under a small open dome; a bell hangs in it. Unstruck: the bell is dull
    bronze and the plinth rune dark. Struck: the bell blazes gold, the rune and three sound arcs glow in the
    principle's colour (voice blue, truth gold, mercy green)."""
    ramp, hi = PRINCIPLE[kind]
    cv = Canvas(32, 32)
    shadow(cv, 4, 31, 31, 80)
    # plinth
    box(cv, 4, 22, 27, 30, MT(4), MT(3), MT(2), out=K(3))
    for x in range(5, 27):
        cv.set(x, 23, MT(4))
    # rune socket on the plinth front
    for y in range(25, 29):
        for x in range(13, 19):
            c = DARK if not struck else ramp(hi)
            if struck and (x in (13, 18) or y in (25, 28)):
                c = ramp(hi - 1)
            cv.set(x, y, c)
    if struck:
        cv.set(15, 26, MT(4)); cv.set(16, 26, MT(4))
    # two columns
    for x0 in (6, 23):
        for y in range(8, 22):
            for x in range(x0, x0 + 3):
                c = MT(4) if x == x0 else (MT(3) if x == x0 + 1 else MT(2))
                cv.set(x, y, c)
            cv.set(x0 - 1, y, K(3))
            cv.set(x0 + 3, y, K(3))
    # the dome
    for y in range(1, 9):
        for x in range(4, 28):
            d = math.hypot((x + 0.5 - 16) / 12.0, (y + 0.5 - 9) / 8.0)
            if d <= 1.0:
                c = MT(3)
                if d > 0.88:
                    c = K(3)
                elif x < 14 and y < 6:
                    c = MT(4)
                elif x > 20:
                    c = MT(2)
                cv.set(x, y, c)
    for x in range(4, 28):
        cv.set(x, 8, GD(3) if x % 4 else GD(1))
    cv.set(16, 0, GD(4)); cv.set(15, 1, GD(3))
    # the bell
    bell = (GD(4), GD(3), GD(1)) if struck else (GD(1), WD(2), WD(1))
    cv.vline(16, 9, 11, K(1))
    for y in range(11, 19):
        half = 1 + (y - 11) * 0.55
        for x in range(16 - int(half) - 1, 16 + int(half) + 1):
            c = bell[1]
            if x <= 15 - int(half) + 1:
                c = bell[0]
            elif x >= 16 + int(half) - 1:
                c = bell[2]
            cv.set(x, y, c)
    for x in range(11, 21):
        cv.set(x, 19, bell[2])
    cv.set(16, 20, bell[0] if struck else WD(1))
    if struck:
        col = ramp(hi)
        for r, a in ((7, 255), (10, 200)):
            for k in range(-4, 5):
                ang = -math.pi / 2 + k * 0.17
                for side in (-1, 1):
                    x = int(round(16 + side * math.cos(ang) * r))
                    y = int(round(15 + math.sin(ang + math.pi / 2) * 0))
                    yy = 12 + abs(k)
                    cv.put(int(round(16 + side * (r + 2))), yy, col[:3] + (a,))
        for x in range(9, 24):
            if cv.get(x, 21)[3] == 0:
                cv.put(x, 21, col[:3] + (120,))
    return cv


def petition_gate(state):
    """48x48 in a 3-wide face: tall marble doors with gold bands under a lintel carrying three sockets. state 0..3 =
    sockets lit (left to right); 4 = open. An unlit socket is a dark well with a bronze rim (7 px), a lit one a gold
    flame with a halo, so the count reads at phone scale."""
    cv = Canvas(48, 48)
    opn = state == 4
    lit = 3 if opn else state
    # surround
    for y in range(0, 48):
        for x in range(0, 48):
            if y < 14:
                c = MT(3)
                if y == 0:
                    c = OUT
                elif y == 1:
                    c = GD(4)
                elif y == 2:
                    c = GD(2)
                elif y == 13:
                    c = GD(1)
                elif y == 12:
                    c = GD(3)
                cv.set(x, y, c)
            elif x < 5 or x > 42:
                c = MT(3) if x in (1, 2, 3, 44, 45, 46) else (OUT if x in (0, 47) else K(4))
                if x in (3, 44):
                    c = GD(2)
                cv.set(x, y, c)
    for i in range(3):
        sx = 10 + i * 14
        on = i < lit
        for y in range(3, 12):
            for x in range(sx - 4, sx + 5):
                d = math.hypot(x - sx, (y - 7) * 1.1)
                if d <= 4.4:
                    if d > 3.4:
                        c = GD(1) if not on else GD(3)
                    elif on:
                        c = GD(5) if d < 1.3 else (GD(4) if d < 2.4 else GD(3))
                    else:
                        c = DARK if d < 2.5 else SD(1)
                    cv.set(x, y, c)
        if on:
            for (dx, dy) in ((-5, -2), (5, -2), (0, -5), (-5, 3), (5, 3)):
                cv.put(sx + dx, 7 + dy, GD(5)[:3] + (150,))
    # doors
    for y in range(14, 48):
        for x in range(5, 43):
            if opn:
                if x < 9 or x > 38:
                    c = MT(4) if x < 9 else MT(2)
                    if x in (8, 39):
                        c = GD(2)
                else:
                    c = DARK if y < 42 else SD(1)
                cv.set(x, y, c)
                continue
            c = MT(3) if x < 24 else MT(2)
            if x in (5, 42):
                c = OUT
            elif x in (23, 24):
                c = GD(1) if x == 24 else GD(3)
            elif y in (20, 34) or x in (8, 39):
                c = GD(3) if (x < 24) else GD(2)
            elif 10 <= x <= 21 and 23 <= y <= 31 and (x in (10, 21) or y in (23, 31)):
                c = K(4)
            elif 26 <= x <= 37 and 23 <= y <= 31 and (x in (26, 37) or y in (23, 31)):
                c = K(3)
            if y >= 42:
                c = GR(3) if (x + y) % 2 else c
            cv.set(x, y, c)
    if not opn:
        for (x, y) in ((21, 28), (26, 28)):
            cv.set(x, y, GD(4))
    for x in range(5, 43):
        cv.set(x, 42, GR(1) if x % 3 else GR(2))
    return cv


def witness_lectern(signed):
    cv = Canvas(16, 32)
    shadow(cv, 3, 14, 31, 80)
    # foot and column
    box(cv, 3, 27, 12, 30, MT(4), MT(3), MT(2), out=K(3))
    for y in range(17, 27):
        cv.set(6, y, MT(4)); cv.set(7, y, MT(3)); cv.set(8, y, MT(3)); cv.set(9, y, MT(2))
        cv.set(5, y, K(3)); cv.set(10, y, K(3))
    for x in range(5, 11):
        cv.set(x, 21, GD(3))
    # the sloped desk
    for y in range(10, 17):
        for x in range(1, 15):
            c = WD(3)
            if y == 10 or x in (1, 14):
                c = OUT
            elif y == 16:
                c = WD(1)
            cv.set(x, y, c)
    # the book, open (two drowned-vellum pages)
    for y in range(7, 15):
        for x in range(2, 14):
            c = SW(5) if x < 8 else SW(4)
            if x in (7, 8):
                c = SW(3)
            if y == 7 or x in (2, 13):
                c = SW(3)
            if y == 14:
                c = GD(1)
            cv.set(x, y, c)
    for y in (9, 11):
        for x in range(3, 7):
            if (x + y) % 3:
                cv.set(x, y, K(3))
        for x in range(9, 13):
            if (x + y) % 3:
                cv.set(x, y, K(3))
    if signed:
        for (x, y) in ((9, 12), (10, 12), (10, 11), (11, 12), (12, 11)):
            cv.set(x, y, DARK)
        cv.set(12, 13, INK(1))
    else:
        for x in range(9, 13):
            cv.set(x, 12, SW(3) if x % 2 else SW(4))
    cv.set(4, 6, GD(4)); cv.set(4, 5, GD(3))       # a gold ribbon marker
    return cv


def door_seal(opn):
    """48x48 boss door: bronze-green doors under a marble arch, the Sunken Seal (a gold crown in a crimson wax disc)
    across the join. Open: the doors folded back, the dark beyond."""
    cv = Canvas(48, 48)
    for y in range(0, 48):
        for x in range(0, 48):
            d = math.hypot((x + 0.5 - 24) / 23.0, (y + 0.5 - 22) / 21.0)
            if y < 22 and d > 1.0:
                continue
            if (y < 22 and d > 0.84) or x < 4 or x > 43:
                c = MT(3) if x < 24 else MT(2)
                if (y < 22 and d > 0.95) or x in (0, 47):
                    c = OUT
                elif y < 22 and d > 0.88:
                    c = GD(3)
                cv.set(x, y, c)
                continue
            if opn:
                c = DARK if y < 42 else SD(1)
                if x < 8 or x > 39:
                    c = TQ(1) if x < 8 else TQ(0)
                cv.set(x, y, c)
                continue
            c = TQ(1) if x < 24 else TQ(0)
            if x in (23, 24):
                c = OUT
            elif (x - 4) % 8 == 0:
                c = TQ(0) if x < 24 else DARK
            elif y % 10 == 0:
                c = GD(2)
            cv.set(x, y, c)
    if not opn:
        disc(cv, 24.0, 28.0, 6.4, lambda x, y, d: OUT if d > 5.6 else (WX(1) if (d > 4.2 and x < 24 and y < 28) else WX(0)))
        # gold crown in the seal
        for (x, y) in ((21, 29), (22, 29), (23, 29), (24, 29), (25, 29), (26, 29), (21, 28), (26, 28), (21, 27), (23, 27), (24, 27), (26, 27), (23, 26), (24, 26)):
            cv.set(x, y, GD(4) if y < 29 else GD(3))
        cv.set(27, 31, RR(1))
    for x in range(4, 44):
        cv.set(x, 44, GR(2) if x % 3 else GR(1))
    return cv


def boat(f):
    """32x32: Hale's punt moored at a landing (bow to the west), a pole and a lantern on a stake; f 0..1 bob."""
    cv = Canvas(32, 32)
    dy = f
    for x in range(1, 31):
        cv.set(x, 27 + dy, CY(4) if (x + f) % 3 else CY(3))
        if x % 2:
            cv.set(x, 28 + dy, CY(2))
    # hull: dark side, lit gunwale, deck planks
    for y in range(17 + dy, 27 + dy):
        for x in range(2, 30):
            t = y - (17 + dy)
            bow = max(0, 4 - x + 2) if x < 6 else 0
            if t < bow:
                continue
            if y == 17 + dy or (x == 2 + max(0, 4 - t)):
                c = WD(5)
            elif t <= 6:
                c = WD(4) if (t % 3) else WD(2)
            else:
                c = WD(1) if t < 9 else OUT
            if x == 29:
                c = WD(1) if t < 9 else OUT
            cv.set(x, y, c)
    for x in range(4, 29):
        cv.set(x, 24 + dy, WD(1))
    # a red stripe along the hull (Hale's colours)
    for x in range(5, 29):
        cv.set(x, 25 + dy, WX(0))
    # the pole, leaning across
    for k in range(18):
        cv.set(20 - k // 3, 2 + k + dy, WD(4) if k % 4 else WD(3))
    # lantern on a stake at the stern
    cv.vline(27, 6 + dy, 17 + dy, WD(1))
    for y in range(7 + dy, 12 + dy):
        for x in range(25, 30):
            c = GD(4) if 26 <= x <= 28 and 8 + dy <= y <= 10 + dy else K(1)
            cv.set(x, y, c)
    cv.set(27, 9 + dy, GD(5))
    return cv


def throne_paper(state):
    """64x64: the Drowned Throne. 0 = occupied (draped in sealed decrees, red seals on the back and arms), 1 = empty (the
    decrees slumped in a wet heap round its feet, the back bare marble with its gold crown finial)."""
    cv = Canvas(64, 64)
    shadow(cv, 10, 60, 62, 90)
    # dais
    box(cv, 4, 52, 59, 62, MT(4), MT(3), MT(2), out=K(3))
    for x in range(5, 59):
        cv.set(x, 58, GR(3) if x % 2 else GR(4))
        cv.set(x, 59, TQ(1) if x % 3 else CY(2))
    # back
    for y in range(6, 46):
        for x in range(16, 48):
            d = math.hypot((x + 0.5 - 32) / 16.0, (y + 0.5 - 22) / 16.0)
            if y < 22 and d > 1.0:
                continue
            c = MT(3) if x < 34 else MT(2)
            if (y < 22 and d > 0.9) or x in (16, 47):
                c = K(3)
            elif (y < 22 and d > 0.82):
                c = GD(3)
            elif 22 <= x <= 41 and 12 <= y <= 40 and (x in (22, 41) or y in (12, 40)):
                c = GD(2)
            cv.set(x, y, c)
    # crown finial
    for (x, y) in ((28, 4), (32, 2), (36, 4), (28, 5), (29, 5), (30, 5), (31, 5), (32, 5), (33, 5), (34, 5), (35, 5), (36, 5), (32, 3), (31, 4), (33, 4)):
        cv.set(x, y, GD(4) if y < 5 else GD(3))
    # arms and seat
    for y in range(34, 52):
        for x in range(10, 54):
            if 16 <= x < 48 and y < 40:
                continue
            c = MT(3) if x < 32 else MT(2)
            if y == 34 or y == 40 and 16 <= x < 48:
                c = MT(4)
            if x in (10, 53) or y == 51:
                c = K(3)
            if y in (38, 46) and (x < 16 or x >= 48):
                c = GD(2)
            cv.set(x, y, c)
    if state == 0:
        # decrees draped over back, arms and seat: white sheets with dark text, red wax seals
        rects = ((19, 14, 8, 12), (37, 10, 8, 14), (27, 24, 10, 10), (11, 35, 7, 10), (46, 34, 7, 11), (20, 41, 24, 6))
        for i, (x0, y0, w, h) in enumerate(rects):
            for y in range(y0, y0 + h):
                for x in range(x0, x0 + w):
                    c = MT(4) if (x - x0) < w - 1 else K(4)
                    if y == y0 + h - 1:
                        c = K(4)
                    if (y - y0) % 3 == 2 and 1 <= x - x0 < w - 2:
                        c = K(2)
                    cv.set(x, y, c)
            sx, sy = x0 + w // 2, y0 + h - 3
            disc(cv, sx, sy, 2.2, lambda x, y, d: WX(1) if (x < sx and y < sy) else WX(0))
    else:
        # the empty seat; wet decrees in a heap round the feet, their ink run grey-violet
        for i in range(26):
            x0 = 6 + (h32(i, 5301) % 50)
            y0 = 46 + (h32(i, 5302) % 10)
            for y in range(y0, y0 + 3):
                for x in range(x0, x0 + 5):
                    cv.set(x, y, SW(5) if y == y0 else SW(4))
            cv.set(x0 + 2, y0 + 1, INK(3))
            cv.set(x0 + 3, y0 + 2, INK(2))
    return cv


def glass_dome():
    """48x48 overhead piece: an old glass dome over the dry room (translucent panes, lead ribs, bright glints)."""
    cv = Canvas(48, 48)
    for y in range(48):
        for x in range(48):
            d = math.hypot((x + 0.5 - 24) / 23.5, (y + 0.5 - 30) / 29.5)
            if d > 1.0 or y > 30 and d > 0.0 and y > 44:
                continue
            if d > 0.95:
                cv.set(x, y, K(3))
            elif d > 0.9:
                cv.put(x, y, MT(4)[:3] + (140,))
            else:
                rib = abs(x - 24) < 1 or abs((x - 24) - (y - 30) * 0.0) < 0 or (abs(x - 24) * 2) % 14 == 0
                if rib or y in (14, 24):
                    cv.put(x, y, K(2)[:3] + (150,))
                elif (x + y) % 9 == 0:
                    cv.put(x, y, CY(3)[:3] + (60,))
    for k in range(7):
        cv.set(13 + k // 2, 10 + k, MT(4))
    cv.set(12, 9, WHITE)
    for x in range(1, 47):
        cv.set(x, 45, K(3) if x % 4 else GD(2))
    return cv


def lantern_chain(f):
    cv = Canvas(16, 32)
    for y in range(0, 16):
        cv.set(7 + (y % 2), y, MT(1) if y % 2 else K(2))
    for y in range(16, 27):
        for x in range(4, 12):
            c = K(1)
            if y in (16, 26) or x in (4, 11):
                c = OUT if y != 16 else K(3)
            elif 5 <= x <= 10 and 18 <= y <= 24:
                fl = (x + y + f) % 4
                c = GD(5) if (x in (7, 8) and y in (20, 21, 22 - f % 2)) else (GD(4) if fl else GD(3))
            cv.set(x, y, c)
    for x in range(5, 11):
        cv.set(x, 17, K(3))
    cv.set(7, 27, K(1)); cv.set(8, 27, K(1)); cv.set(7, 28, GD(2))
    return cv


def lantern_reflection(f):
    cv = Canvas(16, 16)
    for y in range(2, 15):
        w = 2 + (y + f) % 3
        off = int(round(math.sin((y + f * 2) * 0.9) * 1.5))
        for x in range(8 - w + off, 8 + w + off):
            a = 150 if (y + x + f) % 3 else 90
            cv.put(x, y, (GD(4) if y < 9 else GD(3))[:3] + (a,))
    return cv


def font_tide(f):
    cv = Canvas(32, 32)
    shadow(cv, 4, 31, 31, 80)
    box(cv, 3, 18, 28, 30, MT(4), MT(3), MT(2), out=K(3))
    for x in range(4, 28):
        cv.set(x, 19, MT(4))
    # basin water
    for y in range(20, 26):
        for x in range(5, 27):
            c = tq(1)
            if y == 20:
                c = tq(0)
            elif (x * 2 + y + f * 3) % 7 == 0:
                c = tq(3)
            elif (x + y - f) % 5 == 0:
                c = tq(2)
            cv.set(x, y, c)
    # gold band
    for x in range(4, 28):
        cv.set(x, 27, GD(3) if x % 3 else GD(1))
    # the spout: a marble shell on a column with a turquoise jet
    for y in range(6, 19):
        for x in range(14, 18):
            cv.set(x, y, MT(4) if x == 14 else (MT(3) if x < 17 else MT(2)))
    for x in range(11, 21):
        cv.set(x, 5, GD(3)); cv.set(x, 6, MT(3) if x % 2 else MT(4))
    for k in range(8):
        y = 2 + k
        for side in (-1, 1):
            x = 16 + side * (2 + k // 2)
            if (k + f) % 3 != 2:
                cv.set(x, 6 + (k * k) // 6, tq(3) if k < 5 else tq(2))
    cv.set(16, 2 + f % 2, tq(4)); cv.set(15, 3, tq(3))
    cv.set(9, 23, tq(4)); cv.set(22, 22 + f % 2, tq(4))
    return cv


# ====================================================================== build
def build_into(sh):
    sh.newline()
    put_frames(sh, 'tide_wheel', [tide_wheel(i) for i in range(3)], [0, 1], [[0, 0]], overhead=1,
               note='lock wheel on a stand (event tidewheel); frames by level: 0 = low (knob left, left lamp), '
                    '1 = mid (knob up, middle lamp), 2 = high (knob right, right lamp). A 2-level basin uses 0 and 1')
    put_frames(sh, 'tide_post', [tide_post(i) for i in range(3)], [0, 1], [[0, 0]], overhead=1,
               note='striped tide post (event tidepost); frames by level: 0 dry, 1 water at the mark-1 ring, '
                    '2 water at the mark-2 ring. Stands on a basin cell; draw it over the tide water')
    put_frames(sh, 'pontoon', [float_frame(i) for i in range(4)], [0, 0], [[0, 0]],
               note='moored float (event pontoon); frames: 0 grounded (solid), 1 and 2 afloat (bob between them, '
                    '1 only under reduceMotion), 3 submerged (drawn over the water, cell flooded)',
               bob=[1, 2])
    put_frames(sh, 'book_crate', [float_frame(i, crate=True) for i in range(4)], [0, 0], [[0, 0]],
               note='F2 pontoon skin: a lashed crate of books; frames as pontoon', bob=[1, 2])
    put_frames(sh, 'seal_paper', [seal_paper(i) for i in range(3)], [0, 1], [[0, 0]], kind='piece',
               note='forged notice over a doorway (event forgery): 0 sealed (solid), 1 washing (red ink cloud, '
                    'show for the wash), 2 washed (stubs and stain; the doorway is open)')
    put_frames(sh, 'seal_wash', [seal_wash(i) for i in range(3)], [0, 0], [], kind='piece', anim_ms=140,
               note='translucent red ink cloud for the wash effect (collision none)')
    sh.meta['objects']['seal_wash']['collision'] = 'none'
    sh.newline()
    sh.obj('door_canal_closed', door_canal(False), [0, 1], [[0, 0]], 0, kind='door',
           note='a sluice door in a 2-row face (16 wide); cell (0,0) is the doorway')
    sh.obj('door_canal_open', door_canal(True), [0, 1], [], 0, door=[0, 0], kind='door',
           note='the open arched doorway (the cell a washed forgery leaves); walkable at (0,0)')
    sh.obj('floodgate_closed', floodgate(False), [0, 1], [[0, 0], [1, 0]], 0, kind='door',
           note='sluice gate set in a 2-row face with its counterweight float low; cells (0,0) and (1,0)')
    sh.obj('floodgate_open', floodgate(True), [0, 1], [], 0, door=[0, 0], kind='door',
           note='the same gate lifted, the float high; cells (0,0) and (1,0) are the doorway')
    sh.newline()
    for kind in ('voice', 'truth', 'mercy'):
        put_frames(sh, 'principle_stone_' + kind, [principle_stone(kind, False), principle_stone(kind, True)],
                   [0, 1], [[0, 0], [1, 0]], overhead=1,
                   note='principle stone (%s): frames 0 = unstruck, 1 = struck (the bell blazes, %s glow)' % (
                       kind, {'voice': 'blue', 'truth': 'gold', 'mercy': 'green'}[kind]))
    sh.newline()
    put_frames(sh, 'petition_gate_closed', [petition_gate(i) for i in range(4)], [0, 2], [[0, 0], [1, 0], [2, 0]],
               kind='door', note='the Petition Gate in a 3-wide face; frames by state: 0..3 = sockets lit (count, '
                                 'left to right). Add to COUNTING_GATES so the frame follows the source count')
    sh.obj('petition_gate_open', petition_gate(4), [0, 2], [], 0, door=[1, 0], kind='door',
           note='the gate open: cell (1,0) is the doorway')
    sh.obj('door_seal_closed', door_seal(False), [0, 2], [[0, 0], [1, 0], [2, 0]], 0, kind='door',
           note='the Sunken Seal door to the Drowned Throne (needs seal_key), door_boss style, 3 wide')
    sh.obj('door_seal_open', door_seal(True), [0, 2], [], 0, door=[1, 0], kind='door',
           note='open: cell (1,0) is the doorway')
    sh.newline()
    put_frames(sh, 'witness_lectern', [witness_lectern(False), witness_lectern(True)], [0, 1], [[0, 0]], overhead=1,
               note='the Witness Book on its lectern: 0 = unsigned, 1 = signed (after hero_signed)')
    put_frames(sh, 'boat', [boat(0), boat(1)], [0, 1], [], kind='door',
               note='boat-door sprite (door kind boat): Hale\'s punt; frames 0, 1 = bob (anim between them); the door '
                    'cell is the anchor cell (0, 0)', bob=[0, 1])
    put_frames(sh, 'font_tide', [font_tide(i) for i in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1, anim_ms=260,
               light={'color': '#2ec4d0', 'radius': 2.6}, note='the tide font (rest and save)')
    put_frames(sh, 'lantern_chain', [lantern_chain(i) for i in range(3)], [0, 1], [], overhead=2, anim_ms=150,
               light={'color': '#eba14d', 'radius': 3.6}, note='a lantern hung on a chain (overhead, collision none)')
    sh.meta['objects']['lantern_chain']['collision'] = 'none'
    put_frames(sh, 'lantern_reflection', [lantern_reflection(i) for i in range(3)], [0, 0], [], kind='piece', anim_ms=180,
               note='translucent warm reflection drawn on high water under a lantern_chain (Mercy wing)')
    sh.meta['objects']['lantern_reflection']['collision'] = 'none'
    sh.newline()
    put_frames(sh, 'throne_paper', [throne_paper(0), throne_paper(1)], [0, 3],
               [[0, 0], [1, 0], [2, 0], [3, 0], [0, -1], [3, -1]], overhead=2,
               note='the Drowned Throne (4 x 4): 0 = occupied (draped in sealed decrees), 1 = empty (after '
                    'paper_regent_defeated)')
    sh.obj('glass_dome', glass_dome(), [0, 2], [], 3, kind='piece',
           note='the dry room\'s glass dome, all overhead (collision none); centre it over the chair')
    sh.meta['objects']['glass_dome']['collision'] = 'none'
