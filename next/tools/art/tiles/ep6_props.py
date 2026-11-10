"""The gust-lane kit and the Observatory objects (Episode 6) -> ep6.png, after the terrains and walls (E6-tiles,
EPISODE6_PLAN 9.1, 4.4, 5.1, 5.2). Imported by ep6.py.

State art follows the ep4 and ep5 convention: an object with several looks carries "frames": [[x,y,w,h]..] indexed by
the event's state (rect = frames[0]); animated pieces carry "anim" (a frameDx strip). Direction-dependent frames list
their order in "dirs" (always up, right, down, left: E6-world's arrow order 0..3) and the frame index rule in the object's note.

The lane kit (E6-world draws these by these rules). NOTE: the plan's sprite id `mooring_post` is taken (ep4_tiles.json has a
solid timber `mooring_post`, and the ep4 pack is always loaded under ep6), so the lane mooring is `gust_mooring`.
  vane          16x32, 8 frames: frame = state * 4 + dir (dirs up, right, down, left). A brass-rimmed dark dial on the
                tile ABOVE the pole carries the arrow (the party never covers it); state 0 a white arrow with a blue tail,
                state 1 a gold arrow with a rust tail (the same two colours as the chevrons of the lanes it turns), so
                a vane and its lanes agree at rest. Solid, faced from ground.
  fan_vane      16x32, 8 frames, the same rule: the indoor fan (a brass fan housing on a pedestal, its lever up in state
                0 and down in state 1) under the same dial.
  gust_mooring  16x32, 12 frames: frame = dir * 3 + flutter (dirs up, right, down, left = the way the lane under it blows,
                so the pennant streams downwind); a dark iron post, a brass ring, a red pennant, a rope coil at its foot.
                Collision none (a ride stops on its cell); E6-world cycles the flutter frames (3, about 180 ms).
  gust_streak   16x16, 12 frames: frame = dir * 3 + k: translucent white streaks running along the arrow (period 16, so
                a lane of one direction joins into long streaks); E6-world draws them over the lane bed on every live
                cell, k cycling 0, 1, 2 at the bed's pace.
  gust_chevron  16x16, 8 frames: frame = state * 4 + dir: the chevron recipe as art (E6-world draws it in code; this is
                the same picture, for a fallback and the contact sheet).

The Observatory and the Eyrie: signal_lamp (dark, lit), relay (3 dial states), speaking_tube, chimes (tied, ringing 2
frames), scribe_desk (4 x 4: perched, gone), quills (anim 3), wind_script (overhead banners, anim 3), first_shelf (covered,
lifted), sky_keyhole_closed / _open (3 wide, door_boss style), feather_grille, crate_dash (cracked, broken),
supply_coffer (closed, open), font_wind (the wind font, anim 3, rest and save), lamp_storm (F3's tall signal lamp, dark
and lit), lift_brass (the floors' lift, a door cell).
"""
import math
import numpy as np
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32
from court_props import put_frames, ellipse, glow, strip
from ep4_props import box, shadow, disc
from ep6_kit import WD, SA, SW, GD, WA, IC, RB, MT, GR, EA, FI, INK, CL, PE, SL, BR, CLOUD_WHITE, cloud_pixel, CloudBank

RR = lambda i: C('roof_red', i)        # 2d1b1f 571f28 87332e b34532 e06b39 eba14d
MV = lambda i: C('magic_violet', i)
CY = lambda i: C('magic_cyan', i)
DIRS = ['up', 'right', 'down', 'left']        # E6-world's arrow order (src/data/ep6/field/art.js): 0 up, 1 right, 2 down, 3 left
# per-state arrow / chevron colours: (fill, shade, outline, tail)
STATE_COL = {0: (CLOUD_WHITE, CL(1), RB(1), WA(3)), 1: (GD(4), GD(3), GD(0), RR(3))}


def R(cv, x, y, w, h, c):
    cv.rect(x, y, w, h, c)


def rot(cv, d):
    """Rotate a canvas drawn pointing right to direction d (right, down, left, up): whole quarter turns only."""
    k = {'right': 0, 'down': -1, 'left': 2, 'up': 1}[d]
    return Canvas.from_array(np.ascontiguousarray(np.rot90(cv.a, k)))


def stamp_rows(cv, rows, x, y, cmap):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            c = cmap.get(ch)
            if c is not None:
                cv.set(x + i, y + j, c)


def contact_shadow(cv, x0, x1, y, a=96):
    for x in range(x0, x1 + 1):
        cv.put(x, y, SH(a))
        if (x + y) % 2 == 0:
            cv.put(x, y + 1, SH(a // 2))


# ====================================================================== the arrow, the dial, the vane
ARROW = [".......o.....",
         ".......oo....",
         "oo.....owo...",
         "ofoooooowwo..",
         "ofwwwwwwwwwwo",
         "ofssssssswwso",
         "ofoooooowso..",
         "oo.....oso...",
         ".......oo....",
         ".......o....."]


def arrow_canvas(state, d):
    fill, shade, out, tail = STATE_COL[state]
    a = Canvas(13, 13)
    stamp_rows(a, ARROW, 0, 1, {'o': out, 'w': fill, 's': shade, 'f': tail})
    return rot(a, d)


def dial(cv, state, d, y0=1):
    """The vane's head on the top tile: a dark slate disc in a brass rim, the arrow across it."""
    cx, cy = 7.5, y0 + 6.5
    for y in range(y0 - 1, y0 + 15):
        for x in range(16):
            r = math.hypot(x + 0.5 - (cx + 0.5), y + 0.5 - (cy + 0.5))
            if r <= 7.6:
                if r > 6.7:
                    cv.set(x, y, DARK)
                elif r > 5.6:
                    cv.set(x, y, BR(3) if (x + y) < (cx + cy + 1) else BR(1))
                else:
                    cv.set(x, y, SL(1) if (x + y) % 5 else SL(2))
    a = arrow_canvas(state, d)
    cv.blit(a, 2, y0)


def vane(state, d):
    cv = Canvas(16, 32)
    contact_shadow(cv, 4, 12, 31)
    # the base: a brass collar on a stone foot
    box(cv, 4, 26, 11, 30, SW(4), SW(3), SW(2), SW(0))
    R(cv, 6, 24, 4, 2, BR(2)); R(cv, 6, 24, 1, 2, BR(3)); R(cv, 9, 24, 1, 2, BR(0))
    # the pole
    for y in range(14, 24):
        cv.set(7, y, MT(2)); cv.set(8, y, MT(1)); cv.set(6, y, DARK); cv.set(9, y, DARK)
    dial(cv, state, d, 1)
    # a small tail vane under the dial: a brass fin that also points (catches the eye from far)
    return cv


def fan_vane(state, d):
    cv = Canvas(16, 32)
    contact_shadow(cv, 2, 14, 31)
    # the fan housing: a round brass grille on a pedestal
    for y in range(18, 31):
        for x in range(1, 15):
            r = math.hypot(x + 0.5 - 8, (y + 0.5 - 24) * 1.15)
            if r <= 6.6:
                if r > 5.8:
                    cv.set(x, y, DARK)
                elif r > 4.6:
                    cv.set(x, y, BR(3) if x + y < 31 else BR(1))
                elif (x + y) % 3 == 0 or (x - y) % 3 == 0:
                    cv.set(x, y, BR(0))
                else:
                    cv.set(x, y, SL(0) if state == 0 else SL(1))
    disc(cv, 8, 24, 1.5, lambda x, y, dd: BR(3))
    # the lever on the right side: up in state 0, down in state 1
    lx = 13
    if state == 0:
        for y in range(16, 22):
            cv.set(lx, y, MT(3) if y > 16 else RR(4))
            cv.set(lx + 1, y, MT(1))
        R(cv, lx - 1, 15, 3, 2, RR(3))
    else:
        for y in range(23, 29):
            cv.set(lx, y, MT(3) if y < 28 else RR(4))
            cv.set(lx + 1, y, MT(1))
        R(cv, lx - 1, 28, 3, 2, RR(3))
    # the dial post
    for y in range(14, 18):
        cv.set(7, y, MT(2)); cv.set(8, y, MT(1))
    dial(cv, state, d, 1)
    return cv


# ====================================================================== the mooring post
def mooring_post(d, f):
    """A dark iron post (3 px and its outline) with a brass ring, a red pennant streaming downwind (the lane's way) from
    its top, ragged and fluttering (frame f), and a rope coil round its foot. The post sits to the windward side of the
    cell so the pennant has room to stream across it."""
    cv = Canvas(16, 32)
    for y in range(24, 31):
        for x in range(1, 16):
            r = math.hypot(x + 0.5 - 8, (y + 0.5 - 27.5) * 1.8)
            if 3.0 < r < 6.4:
                cv.set(x, y, SA(3) if int(r * 2 + x * 0.4) % 2 else SA(1))
            elif 6.4 <= r < 7.2 and y > 27:
                cv.put(x, y, SH(90))
    x0 = {'right': 3, 'left': 10, 'down': 6, 'up': 6}[d]
    for y in range(8, 28):
        cv.set(x0 - 1, y, DARK); cv.set(x0 + 3, y, DARK)
        cv.set(x0, y, SL(3)); cv.set(x0 + 1, y, SL(1)); cv.set(x0 + 2, y, SL(0))
    R(cv, x0 - 1, 14, 5, 2, BR(2)); cv.set(x0 - 1, 14, BR(3)); cv.set(x0 + 3, 15, BR(0))
    R(cv, x0 - 1, 6, 5, 2, SL(2)); cv.set(x0 - 1, 6, DARK); cv.set(x0 + 3, 6, DARK); R(cv, x0, 5, 3, 1, DARK)
    cv.set(x0, 6, SL(4))
    red = (RR(4), RR(3), RR(2), RR(1))
    p = Canvas(16, 32)
    if d in ('right', 'left'):
        # long and streaming: 6 px deep at the post, tapering over 10 px to a swallowtail, a wave running along it
        for k in range(10):
            hgt = max(2, 6 - (k * 5) // 10)
            wave = int(round(math.sin(k * 0.8 - f * 2.1) * (0.5 + k * 0.08)))
            for j in range(hgt):
                if k >= 8 and j == hgt // 2:
                    continue          # the swallowtail notch
                c = red[0] if j == 0 else (red[3] if j == hgt - 1 else (red[1] if j < hgt - 2 else red[2]))
                p.set(6 + k, 7 + j + wave, c)
        if d == 'left':
            p = Canvas.from_array(np.ascontiguousarray(p.a[:, ::-1]))
            p = Canvas.from_array(np.ascontiguousarray(np.roll(p.a, 0, 1)))
    elif d == 'down':
        # toward the viewer: hanging forward and down beside the post, long, tapering, rippling
        for k in range(11):
            w = max(2, 5 - (k * 4) // 11)
            wave = int(round(math.sin(k * 0.8 - f * 2.1) * 0.8))
            for i in range(w):
                if k >= 9 and i == w // 2:
                    continue
                c = red[0] if i == 0 else (red[3] if i == w - 1 else red[1])
                p.set(9 + i + wave, 7 + k, c)
    else:
        # away from the viewer: rising beside the post's top toward the north, tapering, its far side darker
        for k in range(8):
            w = max(2, 5 - (k * 4) // 8)
            wave = int(round(math.sin(k * 0.8 - f * 2.1) * 0.8))
            for i in range(w):
                if k >= 6 and i == w // 2:
                    continue
                c = red[1] if i == 0 else (red[3] if i == w - 1 else red[2])
                p.set(9 + i + wave, 9 - k, c)
    cv.blit(p, 0, 0)
    return cv


# ====================================================================== the streaks and the chevron
def streak_right(k):
    """Translucent white streaks running right, period 16: three lanes of dashes, a bright head, a fading tail."""
    cv = Canvas(16, 16)
    sh = [0, 5, 11][k % 3]
    for (y, start, L) in ((3, 1, 7), (8, 10, 5), (12, 5, 6)):
        for i in range(L):
            x = (start + sh + i) % 16
            a = 230 if i == L - 1 else (190 if i >= L - 3 else 150)
            cv.put(x, y, (246, 244, 238, a))
            if i >= L - 2:
                cv.put(x, y - 1, (246, 244, 238, 110))
    return cv


CHEVRON = ['oo.......',
           'owoo.....',
           'owwwoo...',
           '.oowwwoo.',
           '...oowwwo',
           '.oowwwoo.',
           'owwwoo...',
           'owoo.....',
           'oo.......']


def chevron(state, d):
    fill, shade, out, tail = STATE_COL[state]
    out = {0: RB(1), 1: GD(0)}[state]
    cv = Canvas(16, 16)
    stamp_rows(cv, CHEVRON, 4, 3, {'o': out, 'w': fill})
    return rot(cv, d)


# ====================================================================== lamps, relays, tubes, chimes
def signal_lamp(lit):
    cv = Canvas(16, 32)
    contact_shadow(cv, 3, 13, 31)
    box(cv, 4, 27, 11, 30, SL(3), SL(2), SL(1), DARK)
    for y in range(14, 27):
        cv.set(7, y, BR(2)); cv.set(8, y, BR(0)); cv.set(6, y, DARK); cv.set(9, y, DARK)
    # the lantern: a brass cage round a glass lens
    box(cv, 3, 3, 12, 14, BR(3), BR(2), BR(1), DARK, round_=True)
    for y in range(5, 13):
        for x in range(5, 11):
            if lit:
                c = GD(5) if (x - 7.5) ** 2 + (y - 8.5) ** 2 < 4 else (GD(4) if (x + y) % 2 else FI(3))
            else:
                c = SL(1) if (x + y) % 3 else SL(2)
            cv.set(x, y, c)
    for y in range(5, 13):
        cv.set(8, y, BR(1))
    R(cv, 6, 1, 4, 2, BR(2)); cv.set(6, 1, DARK); cv.set(9, 1, DARK)
    if lit:
        for (x, y) in ((1, 8), (14, 8), (8, 0), (2, 3), (13, 3)):
            cv.put(x, y, (249, 215, 122, 150))
    return cv


def lamp_storm(lit):
    """F3's tall signal lamp on the spire's landings: white stone post, a brass lantern; dark until the party lights it."""
    cv = Canvas(16, 48)
    contact_shadow(cv, 3, 13, 47)
    box(cv, 4, 40, 11, 46, MT(3), CL(2), CL(1), SL(1))
    for y in range(16, 40):
        cv.set(6, y, SL(1)); cv.set(7, y, CLOUD_WHITE); cv.set(8, y, CL(2)); cv.set(9, y, CL(1)); cv.set(10, y, SL(1))
    lamp = signal_lamp(lit)
    cv.blit(lamp.crop(0, 0, 16, 16), 0, 2)
    R(cv, 5, 17, 6, 1, BR(2))
    return cv


def relay(k):
    """A relay cabinet: slate box, brass bezel, one big dial whose needle sits left, up or right (3 states), a status
    lamp under it (red, amber, green), cable runs."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 15, 31)
    box(cv, 1, 6, 14, 30, SL(3), SL(2), SL(1), DARK)
    for y in range(8, 29, 4):
        cv.set(13, y, BR(1))
    cx, cy = 7.5, 14.5
    for y in range(8, 22):
        for x in range(2, 14):
            r = math.hypot(x + 0.5 - (cx + 0.5), y + 0.5 - (cy + 0.5))
            if r < 5.8:
                cv.set(x, y, BR(3) if r > 4.8 and x + y < 22 else (BR(1) if r > 4.8 else CLOUD_WHITE if r < 4.0 else MT(3)))
    ang = {0: math.pi * 0.85, 1: math.pi * 0.5, 2: math.pi * 0.15}[k]
    for t in range(0, 4):
        cv.set(int(round(cx + math.cos(ang) * t)), int(round(cy - math.sin(ang) * t)), RR(2))
    cv.set(int(cx), int(cy), DARK)
    lamp = [RR(4), GD(4), GR(4)][k]
    R(cv, 6, 23, 4, 3, lamp); cv.set(6, 23, WHITE); R(cv, 5, 22, 6, 1, DARK); R(cv, 5, 26, 6, 1, DARK)
    # the top: cable conduits rising
    for x in (4, 10):
        for y in range(1, 7):
            cv.set(x, y, BR(1) if y % 2 else BR(2))
            cv.set(x + 1, y, BR(0))
    return cv


def speaking_tube():
    cv = Canvas(16, 32)
    contact_shadow(cv, 4, 12, 31)
    for y in range(14, 30):
        cv.set(6, y, BR(3)); cv.set(7, y, BR(2)); cv.set(8, y, BR(1)); cv.set(9, y, BR(0))
        cv.set(5, y, DARK); cv.set(10, y, DARK)
    # the bend and the horn mouth facing the viewer
    for y in range(4, 15):
        for x in range(1, 15):
            r = math.hypot((x + 0.5 - 8) * 1.0, (y + 0.5 - 9.5) * 1.15)
            if r <= 6.4:
                if r > 5.5:
                    cv.set(x, y, DARK)
                elif r > 4.3:
                    cv.set(x, y, BR(3) if y < 9 else BR(1))
                elif r > 2.6:
                    cv.set(x, y, BR(0))
                else:
                    cv.set(x, y, SL(0))
    R(cv, 5, 27, 6, 2, BR(1))
    return cv


def chimes(k):
    """Wind chimes on a short post: k 0 tied silent with black thread round the tubes; 1 and 2 ringing (swung left and
    right, sparkles)."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 4, 12, 31)
    for y in range(12, 31):
        cv.set(7, y, WD(4)); cv.set(8, y, WD(2))
    R(cv, 2, 5, 12, 2, WD(4)); R(cv, 2, 6, 12, 1, WD(2)); cv.set(2, 5, WD(1)); cv.set(13, 5, WD(1))
    sw = [0, -1, 1][k]
    for i, (tx, L) in enumerate(((3, 8), (6, 11), (9, 9), (12, 7))):
        for y in range(7, 7 + L):
            off = 0 if k == 0 else int(round(sw * (y - 7) / 4.0))
            cv.set(tx + off, y, BR(3) if y < 10 else BR(2))
            cv.set(tx + off + 1, y, BR(1))
        if k == 0:
            pass
    if k == 0:
        for x in range(2, 15):
            cv.set(x, 11, DARK)
        cv.set(14, 12, DARK); cv.set(14, 13, DARK)
    else:
        for (x, y) in ((1, 9), (15, 12), (5, 3), (11, 2)):
            cv.put(x + (1 if k == 2 else 0), y, (255, 247, 214, 220))
    return cv


# ====================================================================== the Eyrie: the desk, the quills, the banners
def scribe_desk(perched):
    """The stormglass desk at the top of the spire (4 x 4): a slab of dark glass on a white stone plinth, pages and an
    inkwell; frame 0 'perched': the storm coils round it (dark cloud and ink, sparks: the Scribe's actor sits over it),
    frame 1 'gone': the desk still, a sun glint on the glass."""
    cv = Canvas(64, 64)
    for x in range(6, 60):
        cv.put(x, 61, SH(100)); cv.put(x, 62, SH(60) if x % 2 else SH(0))
    # plinth
    box(cv, 10, 44, 53, 60, CLOUD_WHITE, MT(3), CL(1), SL(1))
    for x in range(12, 52, 6):
        R(cv, x, 47, 1, 12, CL(1))
    # the glass slab
    box(cv, 4, 30, 59, 45, IC(1), WA(3), WA(2), SL(0))
    for x in range(6, 58):
        cv.set(x, 31, IC(2))
    for k in range(10):
        cv.set(14 + k, 33 + k // 3, IC(3))
    # pages and an inkwell
    for (px, py) in ((16, 35), (34, 37)):
        box(cv, px, py, px + 9, py + 6, CLOUD_WHITE, SA(3), SA(2), SL(2), round_=False)
        for j in range(2):
            R(cv, px + 2, py + 2 + j * 2, 6, 1, SL(3))
    disc(cv, 49, 37, 2.6, lambda x, y, d: INK(1) if d < 1.6 else BR(2))
    if perched:
        for y in range(0, 44):
            for x in range(0, 64):
                dx, dy = (x - 32) / 30.0, (y - 26) / 20.0
                r = math.hypot(dx, dy)
                if r < 1.0 and (y < 30 or x < 8 or x > 56):
                    c = cloud_pixel(0, x, y, (SL(0), SL(1), SL(2), SL(3), INK(3)))
                    ang = math.atan2(dy, dx)
                    sw = (ang * 2 + r * 6) % (math.pi * 2)
                    if sw < 0.5 and r > 0.4:
                        c = INK(2)
                    cv.set(x, y, c)
        for (x, y) in ((20, 12), (44, 8), (30, 20), (52, 22), (10, 24)):
            cv.set(x, y, CY(3)); cv.set(x + 1, y + 1, CY(2))
    else:
        cv.set(40, 32, WHITE); cv.set(41, 32, WHITE); cv.set(42, 33, IC(3))
    return cv


def quills(k):
    """Quills hanging in the air over the desk (3 frames: they bob and turn)."""
    cv = Canvas(16, 32)
    for i, (x, y) in enumerate(((3, 6), (9, 3), (12, 13))):
        bob = [0, 1, 0][(k + i) % 3] - (1 if (k + i) % 3 == 2 else 0)
        yy = y + bob
        # a dark quill: a vane of 2 px, a white-blue shaft glint, a nib
        for t in range(9):
            cv.set(x + t // 3, yy + t, INK(1) if t < 6 else INK(2))
            if t < 6:
                cv.set(x + t // 3 + 1, yy + t, INK(3) if t % 2 else INK(2))
        cv.set(x + 3, yy + 9, CY(3))
        cv.set(x, yy, IC(2))
        cv.put(x + 2, yy + 12, SH(60))
    return cv


def wind_script(k):
    """The Wind Script banners (overhead, 3 x 2): three long pennants of white cloth with curling script strokes, rippling
    (3 frames). The strokes are never letters."""
    cv = Canvas(48, 32)
    R(cv, 0, 1, 48, 2, BR(2)); R(cv, 0, 3, 48, 1, BR(0))
    for i, bx in enumerate((4, 19, 34)):
        for y in range(4, 30):
            w = 10 - max(0, (y - 22))
            sway = int(round(1.4 * math.sin((y / 5.0) + k * 2.1 + i)))
            for x in range(w):
                c = CLOUD_WHITE if x > 0 else CL(1)
                if x == w - 1:
                    c = CL(1)
                s = (x + (y // 3) * 2 + i) % 7
                if 2 < y < 26 and s == 0 and 1 < x < w - 2:
                    c = WA(2)
                cv.set(bx + x + sway, y, c)
            cv.set(bx + sway - 1, y, SL(2))
    return cv


def first_shelf(lifted):
    """The shelf with the first page (2 x 2): a dark wood shelf, the page lying on it; frame 0 under a glass dome, frame
    1 the dome lifted aside (the page bare, a little light on it)."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 1, 31, 31)
    box(cv, 1, 18, 30, 30, WD(4), WD(3), WD(2), WD(0))
    R(cv, 3, 25, 26, 1, WD(1))
    # the page
    box(cv, 9, 14, 22, 21, CLOUD_WHITE, SA(3), SA(2), SA(0), round_=False)
    for j in range(2):
        R(cv, 11, 16 + j * 2, 8, 1, WD(2))
    if not lifted:
        for y in range(4, 22):
            for x in range(5, 27):
                r = math.hypot((x + 0.5 - 16) / 10.5, (y + 0.5 - 15) / 10.5)
                if r < 1.0 and y < 21:
                    if r > 0.88:
                        cv.set(x, y, IC(2) if x < 16 else IC(1))
                    else:
                        cv.put(x, y, (232, 255, 251, 60))
        for k in range(6):
            cv.set(9 + k, 7 + k // 2, WHITE)
    else:
        for (x, y) in ((15, 12), (16, 11), (17, 12), (12, 13), (20, 13)):
            cv.put(x, y, (255, 247, 214, 200))
        # the dome set down beside the shelf
        for y in range(22, 30):
            for x in range(23, 31):
                r = math.hypot((x + 0.5 - 27) / 4.0, (y + 0.5 - 28) / 6.0)
                if 0.75 < r < 1.0 and y < 29:
                    cv.set(x, y, IC(2))
    return cv


def sky_keyhole(opened):
    """The Sky Compass Keyhole (door_scribe), door_boss style, 3 wide in a 2-row face (48 x 48): white stone jambs, a brass
    compass rose on the doors with the keyhole at its heart; open: the doors swung in, storm light beyond."""
    cv = Canvas(48, 48)
    box(cv, 0, 4, 47, 47, CLOUD_WHITE, MT(3), CL(1), SL(1), round_=False)
    for y in range(0, 6):
        for x in range(4, 44):
            if y >= 6 - (min(x - 4, 43 - x) // 3):
                cv.set(x, y, MT(3) if y > 2 else CLOUD_WHITE)
    for x in range(4, 44):
        cv.set(x, 6, SL(1))
    if opened:
        for y in range(12, 47):
            for x in range(9, 39):
                cv.set(x, y, cloud_pixel(0, x, y, (SL(0), SL(1), SL(2), SL(3), SL(4))))
        R(cv, 9, 12, 2, 35, BR(1)); R(cv, 37, 12, 2, 35, BR(1))
        for (x, y) in ((24, 20), (18, 30), (30, 26)):
            cv.set(x, y, CY(3))
    else:
        box(cv, 9, 12, 38, 46, BR(3), BR(2), BR(1), DARK, round_=False)
        R(cv, 23, 13, 2, 33, BR(0))
        cx, cy = 23.5, 27.5
        for k in range(8):
            a = k * math.pi / 4
            L = 9 if k % 2 == 0 else 5
            for t in range(2, L):
                cv.set(int(round(cx + math.cos(a) * t)), int(round(cy + math.sin(a) * t)), BR(0) if t > L - 3 else BR(3))
        disc(cv, 24, 28, 2.6, lambda x, y, d: DARK if d < 1.6 else SL(2))
        R(cv, 23, 29, 2, 3, DARK)
        cv.set(23, 18, CLOUD_WHITE)
    return cv


def feather_grille():
    cv = Canvas(16, 16)
    for t in range(10):
        x, y = 3 + t, 11 - t // 2
        cv.set(x, y, DARK); cv.set(x, y - 1, INK(1) if t < 8 else DARK)
        if t % 2 == 0 and t < 8:
            cv.set(x, y + 1, INK(0))
    cv.set(13, 6, CL(1))
    return cv


def crate_dash(broken):
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 15, 31)
    if not broken:
        box(cv, 1, 14, 14, 30, WD(5), WD(4), WD(2), WD(0))
        R(cv, 2, 21, 12, 1, WD(1)); R(cv, 2, 22, 12, 1, BR(2))
        for (x, y) in ((4, 16), (5, 17), (6, 19), (5, 20), (7, 23), (8, 25), (7, 26)):
            cv.set(x, y, DARK)
        R(cv, 2, 15, 12, 1, WD(5))
        for (x, y) in ((11, 16), (11, 27)):
            cv.set(x, y, BR(3))
    else:
        for (x0, y0, w, h) in ((1, 26, 6, 3), (8, 27, 6, 3), (4, 23, 5, 3), (10, 24, 4, 2)):
            box(cv, x0, y0, x0 + w, y0 + h, WD(5), WD(4), WD(2), WD(0), round_=False)
        R(cv, 6, 22, 2, 1, BR(2))
    return cv


def supply_coffer(opened):
    """The Star-Sail Supply Coffer: an iron-bound sea chest with a brass star on the lid (2 x 2)."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 30, 31)
    box(cv, 2, 16, 29, 30, WD(4), WD(3), WD(2), WD(0))
    for x in (6, 25):
        R(cv, x, 16, 2, 15, MT(1)); cv.set(x, 16, MT(3))
    if not opened:
        box(cv, 2, 9, 29, 17, WD(5), WD(4), WD(3), WD(0))
        for k in range(4):
            a = k * math.pi / 2
            for t in range(4):
                cv.set(int(round(16 + math.cos(a) * t)), int(round(13 + math.sin(a) * t * 0.7)), BR(3))
        R(cv, 15, 17, 2, 3, BR(2))
    else:
        box(cv, 2, 3, 29, 9, WD(4), WD(3), WD(2), WD(0))
        R(cv, 3, 10, 26, 6, DARK)
        for (x, y) in ((10, 12), (18, 13), (23, 11)):
            cv.set(x, y, GD(4))
    return cv


def font_wind(k):
    """The wind font (rest and save, 2 x 2): a brass basin on white stone, a little whirl of bright air over clear water,
    glints turning (3 frames)."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 30, 31)
    for y in range(14, 31):
        for x in range(1, 31):
            r = math.hypot((x + 0.5 - 16) / 14.5, (y + 0.5 - 22) / 8.0)
            if r < 1.0:
                if r > 0.86:
                    cv.set(x, y, BR(3) if y < 22 else BR(1))
                elif r > 0.72:
                    cv.set(x, y, BR(0))
                else:
                    cv.set(x, y, IC(1) if (x + y + k) % 4 else IC(2))
    R(cv, 9, 29, 14, 2, CL(1))
    # the whirl: three bright arcs turning
    for i in range(3):
        a0 = k * 2.1 + i * 2.1
        for t in range(10):
            a = a0 + t * 0.32
            r = 3 + t * 0.55
            x, y = 16 + math.cos(a) * r * 1.3, 15 + math.sin(a) * r * 0.6 - t * 0.8
            cv.set(int(round(x)), int(round(y)), CLOUD_WHITE if t < 6 else CL(2))
    for (x, y) in ((6, 9), (25, 6), (16, 2)):
        if (x + k) % 3 != 0:
            cv.put(x, y, (232, 255, 251, 200))
    return cv


def lift_brass(lit=True):
    """The floors' lift: a brass cage with a white stone threshold (door cell (0,0))."""
    cv = Canvas(16, 32)
    R(cv, 1, 6, 14, 25, SL(0))
    for x in (1, 4, 8, 11, 14):
        for y in range(6, 31):
            cv.set(x, y, BR(2) if x in (1, 14) else BR(1))
    R(cv, 1, 5, 14, 2, BR(3)); R(cv, 1, 4, 14, 1, DARK)
    for y in range(0, 4):
        cv.set(7, y, MT(2)); cv.set(8, y, MT(1))
    R(cv, 2, 29, 12, 2, MT(3))
    R(cv, 6, 8, 4, 2, GD(4) if lit else SL(2))
    return cv


# ====================================================================== build
def build_into(sh):
    sh.newline()
    O = sh.meta['objects']
    put_frames(sh, 'vane', [vane(s, d) for s in (0, 1) for d in DIRS], [0, 1], [[0, 0]], overhead=1, dirs=DIRS,
               note='weathervane (event vane): frame = state * 4 + dir, dirs up, right, down, left (the way its group '
                    'blows); state 0 white arrow with a blue tail, state 1 gold arrow with a rust tail (the chevron '
                    'colours of its lanes); the dial is on the tile ABOVE the pole, so the party never covers it')
    put_frames(sh, 'fan_vane', [fan_vane(s, d) for s in (0, 1) for d in DIRS], [0, 1], [[0, 0]], overhead=1, dirs=DIRS,
               note='indoor fan and lever (event vane with sprite fan_vane, F2): frame = state * 4 + dir as vane; the '
                    'lever up in state 0, down in state 1')
    sh.newline()
    put_frames(sh, 'gust_mooring', [mooring_post(d, f) for d in DIRS for f in range(3)], [0, 1], [], overhead=1,
               dirs=DIRS, flutterFrames=3, flutterMs=180,
               note='mooring post (event mooring, collision none: a ride stops on its cell): frame = dir * 3 + flutter, '
                    'dir = the way the lane under it blows (the pennant streams downwind); cycle the 3 flutter frames')
    O['gust_mooring']['collision'] = 'none'
    sh.newline()
    put_frames(sh, 'gust_streak', [rot(streak_right(k), d) for d in DIRS for k in range(3)], [0, 0], [], kind='piece',
               dirs=DIRS,
               note='the streaks of a live lane cell (translucent white, period 16 so a run joins up): frame = dir * 3 + k, '
                    'k cycling 0, 1, 2 with the bed; drawn over the gust_lane / gust_duct bed, under the chevrons')
    O['gust_streak']['collision'] = 'none'
    put_frames(sh, 'gust_chevron', [chevron(s, d) for s in (0, 1) for d in DIRS], [0, 0], [], kind='piece', dirs=DIRS,
               note='the chevron as art (E6-world draws the same in code, one every other cell along a lane): frame = '
                    'state * 4 + dir; 9 x 9 px with its outline, state 0 white on dark blue, state 1 gold on dark brown')
    O['gust_chevron']['collision'] = 'none'
    sh.newline()
    put_frames(sh, 'signal_lamp', [signal_lamp(False), signal_lamp(True)], [0, 1], [[0, 0]], overhead=1,
               light={'color': '#f9d77a', 'radius': 3.4},
               note='a signal lamp on a post (F2 relays, F3 landings): frames 0 dark, 1 lit; light only while lit')
    put_frames(sh, 'lamp_storm', [lamp_storm(False), lamp_storm(True)], [0, 2], [[0, 0]], overhead=2,
               light={'color': '#f9d77a', 'radius': 3.6},
               note='F3\'s tall white-stone signal lamp (lamp_anchor, lamp_listen, lamp_return): frames 0 dark, 1 lit')
    put_frames(sh, 'relay', [relay(k) for k in range(3)], [0, 1], [[0, 0]], overhead=1,
               note='a relay cabinet (F2): frames by dial state 0 needle left (red lamp), 1 up (amber), 2 right (green)')
    sh.obj('speaking_tube', speaking_tube(), [0, 1], [[0, 0]], 1, note='a brass speaking tube on a pipe (F2, solid)')
    put_frames(sh, 'chimes', [chimes(k) for k in range(3)], [0, 1], [[0, 0]], overhead=1,
               note='wind chimes (chimes_a to chimes_c, F1 posts): frame 0 tied with black thread (silent), 1 and 2 '
                    'ringing (cycle 1, 2 at about 220 ms after isles_restored)')
    put_frames(sh, 'crate_dash', [crate_dash(False), crate_dash(True)], [0, 1], [[0, 0]], overhead=1,
               note='a Dash-cracked crate: 0 cracked (solid), 1 broken (rubble decor; the cell opens)')
    sh.obj('lift_brass', lift_brass(), [0, 1], [], 0, door=[0, 0], kind='door',
           note='the Observatory lift (lift_up, lift_f2_short): a brass cage, the door cell is (0,0)')
    sh.obj('feather_grille', feather_grille(), [0, 0], [], 0, kind='piece',
           note='the black feather caught in a grille (F2 crown relay, prop feather_grille), collision none')
    O['feather_grille']['collision'] = 'none'
    sh.newline()
    put_frames(sh, 'supply_coffer', [supply_coffer(False), supply_coffer(True)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               note='the Star-Sail Supply Coffer (F1 D): frames 0 closed, 1 open')
    put_frames(sh, 'font_wind', [font_wind(k) for k in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1, anim_ms=240,
               light={'color': '#b4e4f2', 'radius': 2.6},
               note='the wind font (rest and save: font_w1 to font_w3, font_w2b, beacon_font): a brass basin, a whirl of air')
    put_frames(sh, 'first_shelf', [first_shelf(False), first_shelf(True)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               note='the shelf with the first page (the Cloud Library, first_shelf): 0 under glass, 1 the glass lifted')
    put_frames(sh, 'quills', [quills(k) for k in range(3)], [0, 1], [], overhead=2, anim_ms=260, kind='piece',
               note='quills hanging in the air over the Eyrie\'s desk (decor, collision none, all overhead)')
    O['quills']['collision'] = 'none'
    sh.newline()
    put_frames(sh, 'wind_script', [wind_script(k) for k in range(3)], [0, 1], [], overhead=2, anim_ms=300, kind='piece',
               note='the Wind Script banners (overhead, 3 x 2, after scribe_defeated), collision none')
    O['wind_script']['collision'] = 'none'
    sh.obj('sky_keyhole_closed', sky_keyhole(False), [0, 2], [[0, 0], [1, 0], [2, 0]], 0, kind='door',
           note='the Sky Compass Keyhole (door_scribe, needs compass_key), door_boss style, 3 wide in a 2-row face')
    sh.obj('sky_keyhole_open', sky_keyhole(True), [0, 2], [], 0, door=[1, 0], kind='door',
           note='open: cell (1,0) is the doorway, the storm beyond')
    put_frames(sh, 'scribe_desk', [scribe_desk(True), scribe_desk(False)], [0, 3],
               [[0, 0], [1, 0], [2, 0], [3, 0], [0, -1], [1, -1], [2, -1], [3, -1]], overhead=2,
               note='the stormglass desk in the Eyrie (4 x 4): frame 0 perched (the storm coiled round it: the Scribe\'s '
                    'actor scribe_avatar stands over it), 1 gone (still, after scribe_defeated)')
