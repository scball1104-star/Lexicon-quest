"""The sun and shade kit and the Labyrinth objects (Episode 5) -> ep5.png, after the terrains and walls (E5-tiles,
EPISODE5_PLAN 9.1, 5.1). Imported by ep5.py.

State art follows the ep4 convention: an object with several looks carries "frames": [[x,y,w,h]..] indexed by the event's
state (rect = frames[0]); animated pieces carry "anim" (a frameDx strip). Gates come in `<id>_closed` / `<id>_open` pairs.
The shapes match E5-world's stand-ins (src/data/ep5/field/art.js), so its code takes the real art unchanged:

  sundial            16x32, frames 0 dawn, 1 noon, 2 dusk: a dark bronze dial face on the tile ABOVE the stand (the party
                     never covers it), three notches (dawn rose left, noon white top, dusk violet right); the current one
                     is large, lit and outlined, the gnomon's gold pin points at it, the rim glows in its colour.
  obelisk            16x48 (h 3), obelisk_scraped (the names chiselled off), standing_stone 16x32 (h 2),
  low_block          16x32 (h 1, a squat block on the bottom tile), pillar_gallery 16x32 (h 2), all solid casters
  lamp_cart          16x32, anim 3 + light: a brass sun-lamp on a little rail cart (Shove rolls it along a groove)
  sun_plate          16x16 floor glyph (walkable): frames 0 sun dark, 1 sun lit, 2 moon dark, 3 moon lit
  sun_gate_closed / _open, moon_gate_closed / _open   16x32 one-cell doors carrying the plate's glyph
  window_horizon     16x16 on a wall cell (a slot seen from above): frames 0 dark, 1 lit
  window_horizon_face 16x32 piece in a north face (a tall arched window): frames 0 dark, 1 lit
  star_floor         32x32 floor piece: frames 0 dim, 1 waking, 2 lit (a constellation in the star-glass)
  painted_horizon    32x32 piece in a 2-row face: frames 0 sea, 1 dunes, 2 city
  spring             32x32: frames 0 dry, 1 full (the Well's three springs); font_oasis 32x32 anim 3 (rest and save)
  vow_stone          16x32: frames 0 shelter, 1 truth, 2 return (carved pictures, no letters)
  sun_keyhole_closed / _open   48x48 boss door in a 3-wide face (door_boss style; needs sun_key)
  door_dune_closed / _open     16x32 locked door in a 2-row face (dune_key)
  oracle_ring        64x64: frames 0 coiled (the starry body wound round the ring), 1 empty (the chart's glow inside)
  feather_glass      16x16: the black feather on the glass (it reflects nothing)
  reliquary          16x32 piece: frames 0 sand in the alcove, 1 the names showing under the Lantern
  map_table, page_glass (frames 0 page sealed in glass, 1 empty), chart_glow (32x32 anim + light), cracked_base
  (frames 0 cracked, 1 broken), stair_sand_down, stair_well_down, lift_cage
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32
from court_props import put_frames, ellipse, glow, strip
from ep4_props import box, shadow, disc
from ep5_kit import SA, PA, SW, GD, FI, EA, WD, RB, WA, IC, CY, MT, SD, INK, RR, OC, BS, CP, MV

BL = lambda i: C('blossom', i)          # 571f28 a83a6e e070a0 fcc4dc
NOTCH = {'dawn': (BL(2), BL(3), BL(1)), 'noon': (WHITE, MT(3), MT(1)), 'dusk': (MV(3), MV(4), MV(1))}
HOURS = ['dawn', 'noon', 'dusk']


def R(cv, x, y, w, h, c):
    cv.rect(x, y, w, h, c)


def slab(cv, x0, x1, y0, y1, hi, mid, lo, out):
    """A vertical block lit on the left, shaded on the right, outlined."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if x in (x0, x1) or y in (y0, y1):
                c = out
            elif x <= x0 + 2:
                c = hi if x == x0 + 1 else mid
            elif x >= x1 - 2:
                c = lo
            else:
                c = mid
            cv.set(x, y, c)


def contact_shadow(cv, x0, x1, y, a=96):
    for x in range(x0, x1 + 1):
        cv.put(x, y, SH(a))
        if (x + y) % 2 == 0:
            cv.put(x, y + 1, SH(a // 2))


# ====================================================================== sundial
def sundial(cur):
    cv = Canvas(16, 32)
    contact_shadow(cv, 2, 14, 31)
    # the stand: a fluted sandstone column on a stepped foot, a cap that carries the face
    slab(cv, 2, 13, 27, 30, SA(2), PA(3), PA(1), EA(1))
    slab(cv, 4, 11, 18, 27, SA(2), PA(3), PA(1), EA(1))
    for y in range(19, 27):
        cv.set(7, y, PA(2))
    slab(cv, 2, 13, 15, 18, SA(3), SA(2), PA(2), EA(1))
    # the face (top tile): a dark bronze plate in a gold rim, the current hour's glow on the rim
    on, hi, dim = NOTCH[HOURS[cur]]

    def face(x, y, d):
        if d > 0.86:
            return EA(1)
        if d > 0.72:
            return GD(3) if (x + y) % 2 else GD(2)
        return WD(1) if y > 8 else WD(2)
    ellipse(cv, 8, 8, 7.6, 7.0, lambda dx, dy, d: face(int(8 + dx * 7.6), int(8 + dy * 7), d))
    # rim glow in the hour's colour around the lit notch's side
    at = {'dawn': (2, 8), 'noon': (8, 2), 'dusk': (13, 8)}
    # unlit sockets
    for h in HOURS:
        x, y = at[h]
        if h != HOURS[cur]:
            R(cv, x - 1, y - 1, 2, 2, SD(0))
            cv.set(x - 1, y - 1, NOTCH[h][2])
    # the gnomon: a gold pin from the centre toward the lit notch
    tx, ty = at[HOURS[cur]]
    for s in range(0, 4):
        x = round(8 + (tx - 8) * s / 6.0)
        y = round(8 + (ty - 8) * s / 6.0)
        cv.set(x, y, GD(4) if s < 3 else GD(3))
    cv.set(8, 8, GD(5))
    # the lit notch: 3 x 3 bright, a white core, a dark outline (5 x 5), so it reads from two tiles away
    x, y = tx, ty
    R(cv, x - 2, y - 2, 5, 5, SD(0))
    R(cv, x - 1, y - 1, 3, 3, on)
    cv.set(x, y, WHITE if HOURS[cur] != 'noon' else MT(3))
    cv.set(x - 1, y - 1, hi)
    return cv


# ====================================================================== casters
def obelisk(scraped=False):
    cv = Canvas(16, 48)
    contact_shadow(cv, 1, 14, 47)
    # base block
    slab(cv, 1, 14, 40, 46, SA(2), PA(3), PA(1), EA(1))
    for x in range(2, 14):
        cv.set(x, 41, SA(3))
    # the shaft: tapers from 10 px at the base to 6 px at the top
    for y in range(6, 41):
        half = 3 + (y - 6) * 2.0 / 34.0
        x0, x1 = int(round(8 - half - 0.5)), int(round(8 + half - 0.5))
        for x in range(x0, x1 + 1):
            if x == x0 or x == x1:
                c = EA(1)
            elif x == x0 + 1:
                c = SA(3)
            elif x < 8:
                c = SA(2)
            elif x == x1 - 1:
                c = PA(1)
            else:
                c = PA(3)
            cv.set(x, y, c)
    # the pyramidion: gold, catching the sun
    for y in range(0, 7):
        half = y * 0.55
        for x in range(int(round(8 - half - 0.6)), int(round(8 + half - 0.4)) + 1):
            c = GD(5) if x < 8 else GD(3)
            if y == 6:
                c = GD(2)
            cv.set(x, y, c)
    cv.set(7, 0, GD(5))
    # the faces: glyph rows (a column of small carved marks) or the scars where the names were cut away
    for row in range(10, 38, 4):
        if scraped:
            for x in range(6, 10):
                if h32(x, row, 5901) % 3:
                    cv.set(x, row, EA(2))
                    cv.set(x, row + 1, PA(1) if x > 7 else EA(3))
        else:
            for x, c in ((6, EA(2)), (8, PA(1)), (9, EA(2))):
                cv.set(x, row, c)
            cv.set(7, row + 1, EA(2))
    return cv


def standing_stone():
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    prof = [6, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2]
    for i, y in enumerate(range(3, 31)):
        l = prof[i]
        r = 15 - prof[i] - (1 if i < 6 else 0)
        for x in range(l, r + 1):
            if x in (l, r) or y == 3:
                c = EA(1)
            elif x <= l + 1:
                c = SA(2)
            elif x >= r - 2:
                c = PA(1)
            else:
                c = PA(3) if h32(x, y, 5911) % 7 else PA(2)
            cv.set(x, y, c)
    # a carved sun ring
    for a in range(0, 360, 30):
        x = round(8 + 3 * math.cos(math.radians(a)))
        y = round(14 + 3 * math.sin(math.radians(a)))
        cv.set(x, y, EA(2))
    cv.set(8, 14, GD(3)); cv.set(7, 14, GD(2))
    return cv


def low_block():
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    # the top face (seen from above) then the front
    slab(cv, 1, 14, 18, 23, SA(3), SA(2), PA(3), EA(1))
    slab(cv, 1, 14, 23, 30, SA(2), PA(3), PA(1), EA(1))
    for x in range(3, 13, 3):
        cv.set(x, 26, PA(1))
    return cv


def pillar_gallery():
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    slab(cv, 1, 14, 27, 30, SA(2), PA(3), PA(1), EA(1))
    # the shaft: lapis with gold bands, fluted
    for y in range(6, 27):
        for x in range(3, 13):
            if x in (3, 12):
                c = RB(0)
            elif x == 4:
                c = RB(4)
            elif x in (5, 6):
                c = RB(3)
            elif x in (10, 11):
                c = RB(1)
            else:
                c = RB(2)
            if y in (10, 22):
                c = GD(4) if x < 8 else GD(2)
            if x in (6, 9) and y not in (10, 22):
                c = RB(1) if x == 9 else RB(4)
            cv.set(x, y, c)
    slab(cv, 1, 14, 2, 6, GD(4), GD(3), GD(1), EA(1))
    for x in range(2, 14):
        cv.set(x, 1, EA(1))
    return cv


def lamp_cart(fr):
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    # the cart: a little brass bed on two wheels
    slab(cv, 2, 13, 23, 27, GD(3), GD(2), GD(1), EA(1))
    for (cx, cy) in ((4, 28), (11, 28)):
        disc(cv, cx + 0.5, cy + 0.5, 2.2, lambda x, y, d: EA(1) if d > 1.4 else (MT(2) if d < 0.7 else WD(1)))
    # the post and cage
    for y in range(11, 23):
        cv.set(7, y, GD(1)); cv.set(8, y, GD(3))
    core = [(WHITE, GD(5)), (GD(5), WHITE), (WHITE, GD(5))][fr % 3]
    ellipse(cv, 8, 8, 5.5, 5.5, lambda dx, dy, d: (glow(GD(4), 110) if d > 0.82 else None))
    ellipse(cv, 8, 8, 4.0, 4.2, lambda dx, dy, d: (GD(2) if d > 0.8 else (core[0] if d < 0.45 else (core[1] if d < 0.7 else GD(4)))))
    for x in range(4, 13):
        cv.set(x, 3, GD(1))
    cv.set(8, 2, GD(3))
    for y in range(4, 13):
        if y % 2:
            cv.set(4, y, GD(1)); cv.set(12, y, GD(1))
    return cv


# ====================================================================== plates and gates
def sun_glyph(cv, cx, cy, col, core, rays=True):
    disc(cv, cx, cy, 2.6, lambda x, y, d: core if d < 1.3 else col)
    if rays:
        for (dx, dy) in ((0, -4), (0, 4), (-4, 0), (4, 0), (-3, -3), (3, -3), (-3, 3), (3, 3)):
            cv.set(int(cx + dx), int(cy + dy), col)


def moon_glyph(cv, cx, cy, col, core):
    disc(cv, cx, cy, 3.6, lambda x, y, d: col)
    disc(cv, cx + 1.6, cy - 1.1, 3.0, lambda x, y, d: None)
    for y in range(int(cy - 4), int(cy + 5)):
        for x in range(int(cx - 4), int(cx + 5)):
            if math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 3.6 and math.hypot(x + 0.5 - cx - 1.6, y + 0.5 - cy + 1.1) >= 3.0:
                cv.set(x, y, col)
    cv.set(int(cx - 2), int(cy), core)
    cv.set(int(cx - 2), int(cy + 1), core)


def sun_plate(kind, lit):
    """A round sandstone plate set in the floor: a sun (gold) or a moon (violet) glyph. Lit: the glyph blazes white-hot
    with a halo; dark: the glyph is a dull inlay."""
    cv = Canvas(16, 16)
    ellipse(cv, 8, 8.5, 7.3, 6.8, lambda dx, dy, d: EA(1) if d > 0.9 else (PA(1) if dy > 0.5 else (SA(1) if d > 0.75 else PA(2))))
    if lit and kind == 'sun':
        ellipse(cv, 8, 8.5, 6.3, 5.9, lambda dx, dy, d: GD(5) if d < 0.45 else (GD(4) if d < 0.8 else GD(3)))
    if lit and kind == 'moon':
        # a when:shade plate lights up IN the shade, so its lit face is pale and bright enough to read through the
        # violet shade layer: the whole plate glows lavender, the crescent white
        ellipse(cv, 8, 8.5, 6.3, 5.9, lambda dx, dy, d: MV(4) if d < 0.45 else (MV(3) if d < 0.8 else MV(2)))
    if kind == 'sun':
        if lit:
            sun_glyph(cv, 8, 8.5, WHITE, GD(5))
        else:
            sun_glyph(cv, 8, 8.5, EA(1), GD(1))
    else:
        if lit:
            moon_glyph(cv, 8, 8.5, WHITE, MV(2))
        else:
            moon_glyph(cv, 8, 8.5, CP(2), CP(3))
    return cv


def plate_gate(kind, opened):
    """One-cell gate in a doorway: a sandstone slab carrying the plate's glyph; open = the slab sunk into the floor, the
    doorway dark, the glyph glowing on the lintel."""
    cv = Canvas(16, 32)
    # the doorframe (posts and lintel)
    slab(cv, 0, 15, 2, 7, SA(3), SA(2), PA(2), EA(1))
    slab(cv, 0, 2, 7, 31, SA(2), PA(3), PA(1), EA(1))
    slab(cv, 13, 15, 7, 31, PA(3), PA(2), PA(1), EA(1))
    col = GD(4) if kind == 'sun' else MV(3)
    if opened:
        R(cv, 3, 8, 10, 23, DARK)
        for y in range(8, 31):
            cv.set(3, y, SD(1))
        R(cv, 3, 29, 10, 2, PA(1))
        for x in range(3, 13):
            cv.set(x, 28, EA(1))
        (sun_glyph if kind == 'sun' else moon_glyph)(cv, 8, 4.5, col, WHITE)
    else:
        slab(cv, 3, 12, 8, 30, PA(3), PA(2), PA(1), EA(1))
        for y in (14, 22):
            for x in range(4, 12):
                cv.set(x, y, PA(1))
        (sun_glyph if kind == 'sun' else moon_glyph)(cv, 8, 17.5, GD(2) if kind == 'sun' else CP(3), GD(3) if kind == 'sun' else CP(4))
        (sun_glyph if kind == 'sun' else moon_glyph)(cv, 8, 4.5, GD(2) if kind == 'sun' else CP(3), GD(3) if kind == 'sun' else CP(4))
    return cv


# ====================================================================== windows
def window_slot(lit):
    """A horizon window seen from above in a wall band: a lapis-framed slot of glass; lit, it blazes and throws a short
    bright tongue of light out of the slot."""
    cv = Canvas(16, 16)
    R(cv, 2, 1, 12, 14, EA(1))
    R(cv, 3, 2, 10, 12, GD(2))
    if lit:
        for y in range(3, 13):
            for x in range(4, 12):
                cv.set(x, y, WHITE if 6 <= x <= 9 else (SA(3) if 5 <= x <= 10 else GD(4)))
    else:
        for y in range(3, 13):
            for x in range(4, 12):
                cv.set(x, y, RB(1) if (x + y) % 5 else RB(2))
        cv.set(6, 5, IC(2))
    for x in range(3, 13):
        cv.set(x, 7, GD(1))
    return cv


def window_face(lit):
    """A tall arched horizon window in a north face (16 x 32): lit, white-gold light with the horizon line across it;
    dark, night-blue glass."""
    cv = Canvas(16, 32)
    for y in range(2, 30):
        for x in range(2, 14):
            arch = y < 8 and math.hypot(x + 0.5 - 8, y + 0.5 - 8) > 6.0
            if arch:
                continue
            edge = x in (2, 13) or y == 29 or (y < 8 and math.hypot(x + 0.5 - 8, y + 0.5 - 8) > 5.0)
            if edge:
                c = GD(3) if x < 8 else GD(2)
            elif lit:
                c = WHITE if (5 <= x <= 10 and y < 18) else (SA(3) if y < 22 else GD(4))
                if y == 19:
                    c = OC(2)
            else:
                c = RB(1) if y < 19 else WA(0)
                if y == 19:
                    c = RB(2)
                if (x, y) in ((5, 9), (10, 13)):
                    c = IC(2)
            cv.set(x, y, c)
    for y in range(8, 29):
        cv.set(8, y, GD(1) if not lit else GD(3))
    return cv


# ====================================================================== floor pieces
def star_floor(stage):
    cv = Canvas(32, 32)
    ellipse(cv, 16, 16, 14.5, 13.5, lambda dx, dy, d: GD(2) if d > 0.93 else (RB(1) if d > 0.86 else WA(0)))
    pts = [(9, 12), (14, 8), (20, 11), (23, 17), (17, 22), (11, 20), (16, 15)]
    links = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (1, 6), (6, 4)]
    if stage >= 1:
        for (a, b) in links:
            (x0, y0), (x1, y1) = pts[a], pts[b]
            n = max(abs(x1 - x0), abs(y1 - y0))
            for k in range(1, n):
                if k % 2 == 0 or stage == 2:
                    cv.set(x0 + round((x1 - x0) * k / n), y0 + round((y1 - y0) * k / n), RB(2) if stage == 1 else GD(3))
    for i, (x, y) in enumerate(pts):
        if stage == 0:
            cv.set(x, y, RB(2))
        elif stage == 1:
            cv.set(x, y, IC(2))
        else:
            for (dx, dy) in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                cv.set(x + dx, y + dy, IC(2))
            cv.set(x, y, WHITE)
    for (x, y) in ((6, 7), (25, 9), (8, 25), (24, 24), (27, 16)):
        cv.set(x, y, IC(1) if stage < 2 else IC(3))
    return cv


def painted_horizon(kind):
    from ep5_kit import HorizonFace
    f = HorizonFace(kind)
    cv = Canvas(32, 32)
    for y in range(9, 24):
        for x in range(2, 30):
            if x in (2, 29) or y in (9, 23):
                col = GD(3) if (x == 2 or y == 9) else GD(1)
            else:
                col = f.at(3 + (x - 3) * 10 // 26, y)
            cv.set(x, y, col)
    return cv


# ====================================================================== springs and stones
def spring(full):
    cv = Canvas(32, 32)
    contact_shadow(cv, 3, 29, 30)
    ellipse(cv, 16, 20, 14, 9.5, lambda dx, dy, d: BS(0) if d > 0.92 else (BS(3) if dy < -0.3 else BS(2)))
    ellipse(cv, 16, 20.5, 11, 6.8, lambda dx, dy, d: BS(1) if d > 0.85 else None)
    if full:
        ellipse(cv, 16, 21, 10, 6.0, lambda dx, dy, d: (IC(2) if d > 0.82 and dy < 0 else (WA(3) if d < 0.5 else WA(2))))
        for x in range(12, 21):
            cv.set(x, 19, IC(3) if x % 2 else WA(4))
        cv.set(14, 22, WHITE)
    else:
        ellipse(cv, 16, 21, 10, 6.0, lambda dx, dy, d: OC(0) if d > 0.6 else OC(1))
        for (x, y) in ((11, 21), (12, 22), (13, 21), (18, 20), (19, 21), (20, 21)):
            cv.set(x, y, EA(1))
    # a carved lip with star-glass points
    for x in (6, 16, 26):
        cv.set(x, 12 if x == 16 else 14, IC(2))
    return cv


def font_oasis(fr):
    """Rest and save: a sandstone basin carved with palm leaves, a spring bubbling up in the middle (anim)."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 3, 29, 30)
    ellipse(cv, 16, 21, 14, 9, lambda dx, dy, d: EA(1) if d > 0.92 else (SA(3) if dy < -0.35 else (SA(2) if dy < 0.3 else PA(3))))
    ellipse(cv, 16, 20.5, 11, 6.2, lambda dx, dy, d: PA(1) if d > 0.86 else (WA(3) if d > 0.45 else CY(2)))
    bub = [(15, 19), (17, 18), (16, 20)][fr % 3]
    for (dx, dy) in ((0, 0), (1, 0), (0, -1)):
        cv.set(bub[0] + dx, bub[1] + dy, CY(4) if dx == 0 else CY(3))
    for k, x in enumerate(range(8, 25, 4)):
        cv.set(x, 27, OC(0)); cv.set(x + 1, 26, GD(1))
    # two carved palm fronds on the rim
    for (sx, sgn) in ((5, 1), (27, -1)):
        for i in range(5):
            cv.set(sx + sgn * i, 16 - i // 2, EA(2) if i % 2 else PA(1))
    cv.set(16, 12, GD(4))
    return cv


def vow_stone(kind):
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    slab(cv, 2, 13, 6, 30, BS(3), BS(2), BS(1), DARK)
    for x in range(4, 12):
        cv.set(x, 5, BS(3))
    for x in range(5, 11):
        cv.set(x, 4, BS(2))
    G = GD(3)
    if kind == 0:     # shelter: a sail over three figures
        for i in range(6):
            cv.set(5 + i, 12 + i // 2, G); cv.set(10 - i // 3, 12 + i, G)
        for x in (5, 8, 11):
            cv.set(x, 19, G); cv.set(x, 20, G)
    elif kind == 1:   # truth: a water drop over a far line (where the water is, even when it's far)
        for y in range(10, 17):
            w = max(0, (y - 10) // 2)
            for x in range(8 - w, 9 + w):
                cv.set(x, y, IC(2) if x < 8 else IC(1))
        for x in range(4, 12, 2):
            cv.set(x, 21, G)
    else:             # return: a road that loops back on itself
        for a in range(0, 330, 20):
            cv.set(round(8 + 3.2 * math.cos(math.radians(a))), round(15 + 4 * math.sin(math.radians(a))), G)
        cv.set(11, 20, G); cv.set(12, 21, G); cv.set(12, 22, G)
    return cv


# ====================================================================== doors
def sun_keyhole(opened):
    """The Sun Keyhole: a great basalt-and-sandstone door, a gold sun disc across both leaves with a keyhole at its heart
    (door_boss style, 3 wide in a 2-row face). Open: the leaves gone, a dark doorway, the two halves of the sun on the
    jambs."""
    cv = Canvas(48, 48)
    slab(cv, 0, 47, 2, 12, SA(3), SA(2), PA(2), EA(1))
    for x in range(2, 46, 4):
        cv.set(x, 6, GD(3)); cv.set(x + 1, 6, GD(2))
    slab(cv, 0, 6, 12, 47, SA(2), PA(3), PA(1), EA(1))
    slab(cv, 41, 47, 12, 47, PA(3), PA(2), PA(1), EA(1))
    if opened:
        R(cv, 7, 12, 34, 36, DARK)
        for y in range(13, 47):
            cv.set(7, y, SD(1))
        ellipse(cv, 7, 28, 5, 8, lambda dx, dy, d: (GD(3) if dx > 0 and d < 0.95 else None))
        ellipse(cv, 41, 28, 5, 8, lambda dx, dy, d: (GD(3) if dx < 0 and d < 0.95 else None))
        return cv
    for y in range(12, 47):
        for x in range(7, 41):
            c = BS(2) if x < 24 else BS(1)
            if x in (7, 23, 24, 40):
                c = DARK if x in (23, 40) else BS(3)
            if (y - 12) % 9 == 0:
                c = BS(0)
            cv.set(x, y, c)
    ellipse(cv, 24, 29, 11.5, 11.5, lambda dx, dy, d: EA(1) if d > 0.92 else (GD(4) if dx + dy < -0.3 else (GD(3) if d > 0.5 else GD(2))))
    for a in range(0, 360, 30):
        for r in (12.5, 13.5):
            cv.set(round(24 + r * math.cos(math.radians(a))), round(29 + r * math.sin(math.radians(a))), GD(3))
    R(cv, 23, 26, 2, 3, DARK)
    R(cv, 22, 29, 4, 4, DARK)
    for y in range(17, 41):
        cv.set(24, y, EA(1) if not (26 <= y <= 32) else DARK)
    return cv


def door_dune(opened):
    cv = Canvas(16, 32)
    slab(cv, 0, 15, 0, 6, SA(3), SA(2), PA(2), EA(1))
    slab(cv, 0, 2, 6, 31, SA(2), PA(3), PA(1), EA(1))
    slab(cv, 13, 15, 6, 31, PA(3), PA(2), PA(1), EA(1))
    if opened:
        R(cv, 3, 7, 10, 25, DARK)
        for y in range(7, 32):
            cv.set(3, y, SD(1))
        return cv
    for y in range(7, 31):
        for x in range(3, 13):
            c = WD(3) if x < 8 else WD(2)
            if x in (3, 12) or y in (7, 30):
                c = WD(0)
            elif y in (12, 24):
                c = GD(2)
            cv.set(x, y, c)
    # the dune key's lock: a gold sun plate with a slot
    disc(cv, 8, 18.5, 2.6, lambda x, y, d: GD(4) if d < 1.5 else GD(2))
    cv.set(8, 18, DARK); cv.set(8, 19, DARK)
    return cv


def stair_down(kind):
    cv = Canvas(16, 32)
    if kind == 'sand':
        frame, mid, lo = (SA(2), PA(3), PA(1)), PA(2), EA(1)
    else:
        frame, mid, lo = (BS(3), BS(2), BS(1)), BS(1), DARK
    slab(cv, 0, 15, 16, 31, frame[0], frame[1], frame[2], EA(1) if kind == 'sand' else DARK)
    for i in range(4):
        y = 18 + i * 3
        R(cv, 2, y, 12, 3, [mid, lo, SD(1), DARK][i])
        R(cv, 2, y, 12, 1, frame[0] if i < 2 else SD(2))
    R(cv, 2, 30, 12, 1, DARK)
    return cv


def lift_cage():
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    R(cv, 2, 4, 12, 27, DARK)
    for x in (2, 6, 10, 13):
        for y in range(4, 31):
            cv.set(x, y, GD(2) if x < 8 else GD(1))
    for y in (4, 12, 22, 30):
        for x in range(2, 14):
            cv.set(x, y, GD(3))
    for x in range(1, 15):
        cv.set(x, 3, EA(1)); cv.set(x, 2, GD(4))
    cv.set(8, 0, GD(2)); cv.set(8, 1, GD(2))
    return cv


# ====================================================================== the Eye
def oracle_ring(coiled):
    """The golden ring the Oracle coils around (4 x 4): a great gold ring standing on the star-glass, its inner face
    engraved; coiled: the starry body wound round it (dark blue segments full of stars, gold plates); empty: the ring
    alone with the chart's pale glow pooled inside."""
    cv = Canvas(64, 64)
    ellipse(cv, 32, 52, 28, 9, lambda dx, dy, d: SH(70) if d > 0.6 else SH(110))
    if not coiled:
        ellipse(cv, 32, 50, 17, 6, lambda dx, dy, d: glow(IC(3), 150) if d < 0.6 else glow(IC(2), 110))
    segs = []
    if coiled:
        # the body: overlapping armoured segments wound round the ring, thick at the back (left), thinning up the right
        for k in range(26):
            a = math.radians(210 - k * 10.5)
            r = 7.6 - k * 0.19
            segs.append((32 + 28.5 * math.cos(a), 33 + 26.5 * math.sin(a), r, k))

    def seg(cx, cy, r, k):
        def fn(dx, dy, d):
            if d > 0.84:
                return EA(1)
            if dy < -0.45:
                return GD(3) if dx < 0.3 else GD(2)
            return WA(1) if dy < 0.1 else WA(0)
        ellipse(cv, cx, cy, r, r * 0.85, fn)
        for (sx, sy, c) in ((cx - r * 0.3, cy + r * 0.1, WHITE), (cx + r * 0.35, cy + r * 0.4, IC(2))):
            if h32(k, int(sx), 5991) % 3:
                cv.set(int(sx), int(sy), c)
    for (cx, cy, r, k) in segs:
        if k % 3:
            seg(cx, cy, r, k)
    # the ring: an upright ellipse band
    for y in range(4, 60):
        for x in range(4, 60):
            d = math.hypot((x + 0.5 - 32) / 26.0, (y + 0.5 - 32) / 27.0)
            if 0.82 <= d <= 1.0:
                ang = math.atan2(y + 0.5 - 32, x + 0.5 - 32)
                c = GD(4) if math.cos(ang + 2.4) > 0.4 else (GD(3) if math.cos(ang + 2.4) > -0.3 else GD(2))
                if d > 0.97 or d < 0.845:
                    c = GD(1)
                if 0.88 < d < 0.94 and int(math.degrees(ang) + 360) % 24 < 3:
                    c = EA(1)
                cv.set(x, y, c)
    # the foot
    slab(cv, 22, 41, 57, 62, GD(3), GD(2), GD(1), EA(1))
    if coiled:
        for (cx, cy, r, k) in segs:
            if k % 3 == 0:
                seg(cx, cy, r, k)        # every third segment passes in front of the ring: wound round it
        # the stinger, curled over the ring's top right: gold, a bright point
        tx, ty = segs[-1][0], segs[-1][1]
        for k in range(8):
            x, y = int(tx - 1 - k * 0.9), int(ty - 3 - k * 0.8 + (k * k) * 0.05)
            cv.set(x, y, GD(4) if k < 6 else GD(5))
            cv.set(x + 1, y, GD(2))
            cv.set(x, y + 1, EA(1))
    return cv


def feather_glass():
    cv = Canvas(16, 16)
    for i in range(12):
        x, y = 2 + i, 12 - i * 0.7
        half = round(math.sin((i + 1) / 13.0 * math.pi) * 2.2)
        for k in range(-half, half + 1):
            cv.set(x, int(y + k), DARK if k else SD(1))
    for i in range(-2, 13):
        cv.set(2 + i, int(12.5 - i * 0.7), INK(2) if i < 0 else SD(0))
    return cv


def reliquary(shown):
    """An alcove in the west wall lit only at dusk: sand banked inside; under the Lantern the names show as rows of
    pale glyph marks in the sand (never legible text)."""
    cv = Canvas(16, 32)
    for y in range(4, 30):
        for x in range(2, 14):
            arch = y < 9 and math.hypot(x + 0.5 - 8, y + 0.5 - 9) > 6.0
            if arch:
                continue
            edge = x in (2, 13) or (y < 9 and math.hypot(x + 0.5 - 8, y + 0.5 - 9) > 5.0)
            cv.set(x, y, GD(2) if edge else (INK(1) if y < 20 else SD(1)))
    for y in range(20, 30):
        for x in range(3, 13):
            if y > 20 + abs(x - 8) // 3:
                cv.set(x, y, OC(1) if y > 22 else OC(2))
    if shown:
        for row in (23, 25, 27):
            for x in range(4, 12):
                if h32(x, row, 5995) % 3:
                    cv.set(x, row, IC(3) if x % 2 else WHITE)
        for y in range(10, 20):
            cv.put(8, y, glow(IC(3), 90))
    return cv


def map_table():
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 30, 31)
    for (lx) in (4, 26):
        R(cv, lx, 20, 3, 10, WD(1)); cv.set(lx, 20, WD(3))
    slab(cv, 1, 30, 8, 21, WD(4), WD(3), WD(2), WD(0))
    R(cv, 4, 10, 24, 9, SA(3))
    for x in range(4, 28):
        cv.set(x, 18, SA(2))
    # a desert chart: a route of dots, three stars, a compass rose
    for i, x in enumerate(range(6, 26, 3)):
        cv.set(x, 14 + (1 if i % 2 else 0), RR(2))
    for (x, y) in ((8, 11), (19, 12), (24, 11)):
        cv.set(x, y, RB(2))
    for (dx, dy) in ((0, -2), (0, 2), (-2, 0), (2, 0), (0, 0)):
        cv.set(23 + dx, 15 + dy, EA(1) if (dx or dy) else GD(3))
    return cv


def page_glass(empty):
    cv = Canvas(16, 16)
    contact_shadow(cv, 2, 14, 14)
    R(cv, 2, 4, 12, 9, IC(1))
    R(cv, 3, 5, 10, 7, WA(4) if empty else SA(3))
    if not empty:
        for y in (6, 8, 10):
            for x in range(4, 12):
                if (x * 3 + y) % 5:
                    cv.set(x, y, WD(2))
    for x in range(2, 14):
        cv.set(x, 4, IC(3)); cv.set(x, 12, IC(0))
    cv.set(3, 5, WHITE)
    return cv


def chart_glow(fr):
    cv = Canvas(32, 32)
    a = [130, 160, 130][fr % 3]
    ellipse(cv, 16, 18, 14, 9, lambda dx, dy, d: glow(IC(3), int(a * (1 - d * 0.7))) if ((int(dx * 9) + int(dy * 7) + fr) % 2 == 0 or d < 0.4) else None)
    for (x, y) in ((9, 16), (14, 13), (20, 15), (23, 20), (12, 21), (17, 19)):
        cv.set(x, y, WHITE if (x + fr) % 3 else IC(3))
    return cv


def cracked_base(broken):
    cv = Canvas(16, 32)
    contact_shadow(cv, 1, 14, 31)
    if broken:
        for (x, y, w, h) in ((2, 25, 5, 5), (8, 26, 6, 4), (5, 21, 4, 4)):
            slab(cv, x, x + w, y, y + h, SA(2), PA(3), PA(1), EA(1))
        return cv
    slab(cv, 1, 14, 14, 30, SA(2), PA(3), PA(1), EA(1))
    for x in range(2, 14):
        cv.set(x, 15, SA(3))
    for (x, y) in ((7, 16), (8, 17), (7, 18), (8, 19), (9, 20), (8, 21), (6, 20), (5, 21), (10, 22), (9, 24), (8, 25)):
        cv.set(x, y, EA(1))
    return cv


# ====================================================================== build
def build_into(sh):
    sh.newline()
    put_frames(sh, 'sundial', [sundial(i) for i in range(3)], [0, 1], [[0, 0]], overhead=1,
               note='sundial on a stand (event sundial); frames by hour: 0 dawn (rose notch, left), 1 noon (white, top), '
                    '2 dusk (violet, right); the face is on the tile above the stand, so the party never covers it')
    sh.obj('obelisk', obelisk(), [0, 2], [[0, 0]], 2, note='caster h 3 (event standstone h 3): a sandstone obelisk, gold cap')
    sh.obj('obelisk_scraped', obelisk(True), [0, 2], [[0, 0]], 2, note='caster h 3: the obelisk whose names were chiselled off')
    sh.obj('standing_stone', standing_stone(), [0, 1], [[0, 0]], 1, note='caster h 2 (event standstone h 2)')
    sh.obj('low_block', low_block(), [0, 1], [[0, 0]], 1, note='caster h 1 (event standstone h 1): a squat cut block')
    sh.obj('pillar_gallery', pillar_gallery(), [0, 1], [[0, 0]], 1, note='caster h 2 indoors (F2): a lapis-and-gold pillar')
    put_frames(sh, 'lamp_cart', [lamp_cart(i) for i in range(3)], [0, 1], [[0, 0]], overhead=1, anim_ms=180,
               light={'color': '#f9d77a', 'radius': 3.4},
               note='a sun-lamp on a rail cart (event lampcart): solid, lit; Shove rolls it along a groove')
    sh.newline()
    put_frames(sh, 'sun_plate', [sun_plate('sun', False), sun_plate('sun', True), sun_plate('moon', False), sun_plate('moon', True)],
               [0, 0], [], note='floor glyph (event sunplate, walkable): frames 0 sun dark, 1 sun lit, 2 moon dark, 3 moon '
                                'lit; a when:lit plate shows the sun (lit while its cell is lit), a when:shade plate the moon '
                                '(lit while its cell is shaded)')
    sh.meta['objects']['sun_plate']['collision'] = 'none'
    for kind in ('sun', 'moon'):
        sh.obj('%s_gate_closed' % kind, plate_gate(kind, False), [0, 1], [[0, 0]], 0, kind='door',
               note='a one-cell %s gate in a doorway (GATE_SPRITES %s_gate): closed, solid' % (kind, kind))
        sh.obj('%s_gate_open' % kind, plate_gate(kind, True), [0, 1], [], 0, door=[0, 0], kind='door',
               note='the %s gate open: the slab sunk, the glyph glowing on the lintel; walkable at (0,0)' % kind)
    put_frames(sh, 'window_horizon', [window_slot(False), window_slot(True)], [0, 0], [[0, 0]], kind='piece',
               note='a horizon window on a wall cell, seen from above (event window): frames 0 dark, 1 lit')
    put_frames(sh, 'window_horizon_face', [window_face(False), window_face(True)], [0, 1], [], kind='piece',
               note='a tall arched horizon window in a 2-row north face: frames 0 dark, 1 lit (art only; collision is the wall)')
    sh.meta['objects']['window_horizon_face']['collision'] = 'none'
    sh.newline()
    put_frames(sh, 'star_floor', [star_floor(i) for i in range(3)], [0, 1], [], kind='piece',
               note='F2 Star Floor inlay (collision none): frames 0 dim, 1 waking, 2 lit')
    sh.meta['objects']['star_floor']['collision'] = 'none'
    put_frames(sh, 'painted_horizon', [painted_horizon(i) for i in range(3)], [0, 1], [], kind='piece',
               note='a painted horizon in a 2-row face, 2 wide (art over the wall): frames 0 sea, 1 dunes, 2 city')
    sh.meta['objects']['painted_horizon']['collision'] = 'none'
    put_frames(sh, 'spring', [spring(False), spring(True)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               note='a Well spring (springs shelter, truth, return): frames 0 dry, 1 full')
    put_frames(sh, 'font_oasis', [font_oasis(i) for i in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1, anim_ms=260,
               light={'color': '#2ec4d0', 'radius': 2.6}, note='the oasis spring font (rest and save; font_l1 to font_l3)')
    put_frames(sh, 'vow_stone', [vow_stone(i) for i in range(3)], [0, 1], [[0, 0]], overhead=1,
               note='a carved basalt stele by a spring: frames 0 shelter, 1 truth, 2 return (pictures, no letters)')
    sh.newline()
    sh.obj('sun_keyhole_closed', sun_keyhole(False), [0, 2], [[0, 0], [1, 0], [2, 0]], 0, kind='door',
           note='the Sun Keyhole (door_oracle, needs sun_key), door_boss style, 3 wide in a 2-row face')
    sh.obj('sun_keyhole_open', sun_keyhole(True), [0, 2], [], 0, door=[1, 0], kind='door', note='open: cell (1,0) is the doorway')
    sh.obj('door_dune_closed', door_dune(False), [0, 1], [[0, 0]], 0, kind='door',
           note='a locked sandstone door in a 2-row face (dune_key); cell (0,0) is the doorway')
    sh.obj('door_dune_open', door_dune(True), [0, 1], [], 0, door=[0, 0], kind='door', note='the doorway open')
    sh.obj('stair_sand_down', stair_down('sand'), [0, 1], [], 0, door=[0, 0], kind='door',
           note='stairs down in a sandstone floor (F1, F2): the door cell is (0,0)')
    sh.obj('stair_well_down', stair_down('well'), [0, 1], [], 0, door=[0, 0], kind='door', note='stairs down in basalt (F3)')
    sh.obj('lift_cage', lift_cage(), [0, 1], [], 0, door=[0, 0], kind='door',
           note='a brass cage lift (lift_f2_short, lift_out): the door cell is (0,0)')
    sh.newline()
    put_frames(sh, 'oracle_ring', [oracle_ring(True), oracle_ring(False)], [0, 3],
               [[0, 0], [1, 0], [2, 0], [3, 0], [0, -1], [3, -1]], overhead=2,
               note='the golden ring in the Eye (4 x 4): 0 coiled (the Oracle\'s starry body round it), 1 empty (the '
                    'chart\'s glow pooled inside, after oracle_defeated)')
    put_frames(sh, 'chart_glow', [chart_glow(i) for i in range(3)], [0, 1], [], kind='piece', anim_ms=200,
               light={'color': '#b4e4f2', 'radius': 3.0}, note='the chart\'s glow on the glass after the fight (collision none)')
    sh.meta['objects']['chart_glow']['collision'] = 'none'
    sh.obj('feather_glass', feather_glass(), [0, 0], [], 0, kind='piece',
           note='the black feather lying on the glass (F2 star floor, the Eye); it reflects nothing')
    sh.meta['objects']['feather_glass']['collision'] = 'none'
    put_frames(sh, 'reliquary', [reliquary(False), reliquary(True)], [0, 1], [[0, 0]], kind='piece',
               note='the Reliquary alcove in a west face (reliquary_obj): 0 sand, 1 the names showing under the Lantern')
    sh.obj('map_table', map_table(), [0, 1], [[0, 0], [1, 0]], 1, note='F2 map table (memory2 beat)')
    put_frames(sh, 'page_glass', [page_glass(False), page_glass(True)], [0, 0], [[0, 0]],
               note='Ishra\'s page sealed in glass (F3 page_spot): 0 the page, 1 empty (after ishra_page)')
    put_frames(sh, 'cracked_base', [cracked_base(False), cracked_base(True)], [0, 1], [[0, 0]], overhead=1,
               note='a Dash-cracked obelisk base: 0 cracked (solid), 1 broken (use as rubble decor; the cell opens)')
