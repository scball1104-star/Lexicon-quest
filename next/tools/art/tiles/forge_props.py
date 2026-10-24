"""The Ashen Foundry objects (Episode 3) -> forge.png, appended after the terrains, walls, slag and troughs
(E3-tiles, EPISODE3_PLAN 9.1 and 5.1). Imported by forge.py.

State art follows the court convention (court_props.py): an object with several looks carries "frames": [[x,y,w,h]..]
indexed by the event's state, its rect is frames[0]; animated pieces carry "anim" (frameDx strip).

  spout_wall      16x32 piece in a north face, water falls south (anim 3)
  spout_cistern   16x32 prop, a tank with a spigot, water falls south (anim 3)
  sluice          16x32 prop, frames 0 = '/', 1 = '\\' (a paddle on a post, drawn over a trough junction)
  basin           16x32 prop, frames 0 = empty, 1..3 = full (3 water frames: `fullAnim` frameDx strip 1..3)
  waterwheel      32x32 prop, frames 0 = still, 1..3 = turning (`turnAnim`)
  hot_grate_closed / hot_grate_open   32x32 gate pair (GATE_SPRITES), anim 3 each (glow / steam)
  ore_crate       16x32 heavy block skin
  anvil_oath      16x32 prop, frames 0 = cold, 1 = struck
  bell_gate (+ _closed, _open)   48x48 gate, frames 0..3 = sockets lit, 4 = open
  door_crucible (+ _closed, _open)   48x48 boss door
  ore_lift_closed / ore_lift_open    32x32 lift door pair
  font_cistern    32x32 anim 3 (rest and save)
  heartforge      96x80 (6x5) frames 0 = roaring, 1 = banked, 2..3 = more roar (`roarAnim`)
  furnace_mouth   32x32 piece anim 3
  fan_great       48x48 frames 0..1 = spinning (`anim`), 2 = stopped
  bellows_decor, pipes_h/_v/_elbow/_valve, ledger_burned, tool_rack, splash_puddle (floor decal)
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32
from forge_kit import K, SW, RR, FI, GD, EA, MT, SD, WA, ICE, WD
from court_props import put_frames, ellipse, glow, strip

OUT = K(0)


def blk(cv, x0, y0, x1, y1, hi, mid, lo, out=OUT, corners=True):
    """Lit block (inclusive bounds): outline, light top-left, dark bottom-right."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if corners and (x in (x0, x1)) and (y in (y0, y1)):
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


def water_px(x, y, f, hi=5):
    t = (x + y * 2 - f * 4) % 10
    if t == 0:
        return WA(hi)
    if t in (1, 2):
        return WA(4)
    if (x * 3 + y) % 7 == 0:
        return WA(2)
    return WA(3)


def floor_shadow(cv, x0, x1, y, a=90):
    for x in range(x0, x1 + 1):
        cv.put(x, y, SH(a))


def splash(cv, cx, y, f, w=5):
    """White splash foam where a stream lands."""
    for i in range(-w, w + 1):
        if (i + f) % 3 == 0:
            cv.put(cx + i, y, WA(5))
        elif abs(i) < w:
            cv.put(cx + i, y, WA(4))
    cv.put(cx - 1 + (f % 3), y - 1, WA(5))
    cv.put(cx + 2 - (f % 3), y - 1, WA(5))


# ====================================================================== spouts
def spout_wall(f):
    cv = Canvas(16, 32)
    # iron housing set into the wall face
    blk(cv, 1, 1, 14, 9, MT(1), K(3), K(1))
    cv.hline(2, 13, 4, K(1))
    for x in (3, 12):                       # rivets
        cv.set(x, 3, MT(2))
        cv.set(x, 7, MT(2))
    blk(cv, 0, 4, 15, 5, GD(3), GD(2), GD(1), corners=False)   # brass band
    # the mouth: a flared spout lip
    blk(cv, 4, 9, 11, 14, MT(1), K(3), K(1))
    cv.rect(6, 11, 4, 3, DARK)
    cv.hline(5, 10, 14, K(0))
    # a wet stain under the lip
    for y in range(15, 30):
        for x in (4, 5, 10, 11):
            if (x + y) % 3 == 0:
                cv.put(x, y, glow(WA(1), 120))
    # the falling stream
    for y in range(14, 31):
        for x in range(6, 10):
            if x in (6, 9) and (y + f) % 5 == 0:
                continue
            cv.set(x, y, water_px(x, y, f))
        cv.set(5, y, WA(2)) if (y + f) % 4 else None
        cv.set(10, y, WA(2)) if (y + f * 2) % 4 else None
    splash(cv, 8, 30, f, 4)
    cv.hline(4, 11, 31, WA(3))
    return cv


def spout_cistern(f):
    cv = Canvas(16, 32)
    floor_shadow(cv, 3, 14, 29, 70)
    # tank: iron barrel with two brass hoops and a domed lid
    blk(cv, 2, 6, 13, 24, MT(1), K(3), K(1))
    for y in range(8, 23):
        cv.set(3, y, K(4)) if y % 2 else None
    for yy in (9, 20):
        blk(cv, 2, yy, 13, yy + 1, GD(3), GD(2), GD(1), corners=False)
    blk(cv, 3, 2, 12, 6, MT(2), MT(1), K(2))
    cv.set(7, 1, MT(3))
    cv.rect(6, 0, 4, 2, K(2))
    cv.set(6, 0, MT(1)); cv.set(9, 0, K(1))
    # a gauge
    cv.rect(10, 12, 3, 3, DARK)
    cv.set(11, 13, FI(4))
    # spigot
    blk(cv, 5, 22, 10, 25, GD(3), GD(2), GD(1))
    cv.set(5, 25, OUT); cv.set(10, 25, OUT)
    for y in range(25, 31):
        for x in range(7, 9):
            cv.set(x, y, water_px(x, y, f))
        cv.set(6, y, WA(2)) if (y + f) % 3 else None
        cv.set(9, y, WA(2)) if (y + f) % 3 else None
    splash(cv, 8, 30, f, 5)
    cv.hline(3, 12, 31, WA(3))
    return cv


# ====================================================================== sluice
def slab(cv, x0, y0, x1, y1, thick, fn):
    """A thick diagonal plank between two end points; fn(side, t, u) -> colour (side 0 top edge, 1 body, 2 bottom edge,
    t along 0..1)."""
    n = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(n + 1):
        t = i / n
        x = round(x0 + (x1 - x0) * t)
        y = round(y0 + (y1 - y0) * t)
        for k in range(thick):
            side = 0 if k == 0 else (2 if k == thick - 1 else 1)
            cv.set(x, y + k, fn(side, t, k))


def sluice(state):
    """A broad wooden paddle in a brass frame, slanted at 45 degrees across the trough junction (seen in 3/4, like a
    mirror but warm: planks, brass border, a tall gold-knobbed lever at its high end). '/' rises to the right."""
    cv = Canvas(16, 32)
    flip = state == 1
    x0, x1, ybot0, rise, hgt = 1, 14, 29, 9, 17
    n = x1 - x0
    floor_shadow(cv, 2, 14, 31, 70)
    for x in range(x0, x1 + 1):
        f = (x - x0) / n
        f2 = 1 - f if flip else f
        yb = round(ybot0 - rise * f2)
        yt = yb - hgt
        for y in range(yt, yb + 1):
            edge_t, edge_b = y == yt, y == yb
            edge_l, edge_r = x == x0, x == x1
            if edge_t or edge_l or edge_b or edge_r:
                col = OUT
            elif y == yt + 1 or x == x0 + 1:
                col = GD(4) if (y + x) % 5 else GD(5)
            elif y == yb - 1 or x == x1 - 1:
                col = GD(1)
            elif y == yt + 2 or x == x0 + 2 or y == yb - 2 or x == x1 - 2:
                col = GD(2)
            else:
                # vertical planks with grain
                p = (x - x0) // 3
                col = WD(4) if p % 2 == 0 else WD(3)
                if (x - x0) % 3 == 2:
                    col = WD(1)
                elif (x + y // 3) % 7 == 0:
                    col = WD(2)
            cv.set(x, y, col)
        cv.set(x, yb + 1, OUT if x not in (x0,) else None)
        cv.put(x, yb + 2, SH(90))
    # brass cross-strap
    for x in range(x0 + 2, x1 - 1):
        f = (x - x0) / n
        f2 = 1 - f if flip else f
        ym = round(ybot0 - rise * f2) - hgt // 2
        cv.set(x, ym, GD(3))
        cv.set(x, ym + 1, GD(1))
    # the lever: a post from the high end, ending in a big gold knob (the interactable accent)
    hx = x1 - 2 if not flip else x0 + 2
    f2 = 1.0 if not flip else 1.0
    hy = round(ybot0 - rise) - hgt
    cv.vline(hx, max(3, hy - 3), hy + 1, K(1))
    cv.vline(hx - 1 if not flip else hx + 1, max(3, hy - 3), hy + 1, K(4))
    ky = max(2, hy - 5)
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            if abs(dx) + abs(dy) <= 3:
                cv.set(hx + dx, ky + dy, OUT if abs(dx) + abs(dy) == 3 else GD(3))
    cv.set(hx - 1, ky - 1, GD(5))
    cv.set(hx, ky - 1, GD(4))
    cv.set(hx + 1, ky + 1, GD(2))
    return cv


# ====================================================================== basin and wheel
def basin(frame):
    """frame 0 empty (dry, dark, stained); 1..3 full (bright water, travelling glint)."""
    cv = Canvas(16, 32)
    floor_shadow(cv, 2, 14, 30, 70)
    # pedestal
    blk(cv, 4, 20, 11, 30, K(4), K(3), K(1))
    cv.hline(3, 12, 30, OUT)
    blk(cv, 3, 28, 12, 30, K(4), K(2), K(1), corners=False)
    # bowl: wide stone ellipse
    ellipse(cv, 8, 15, 8, 6, lambda dx, dy, d: (K(2) if dy > 0.3 else (K(4) if dx + dy < -0.5 else K(3))))
    for y in range(8, 23):
        for x in range(0, 16):
            pass
    # rim ring + interior
    ellipse(cv, 8, 14, 7, 4.6, lambda dx, dy, d: K(4) if d > 0.8 else None)
    def inner(dx, dy, d):
        if frame == 0:
            c = INK_DRY(dx, dy, d)
        else:
            f = frame - 1
            c = water_px(int(8 + dx * 6), int(14 + dy * 4) * 1, f)
            if d > 0.78:
                c = WA(2)
            if d < 0.35 and (int(8 + dx * 6) + f * 2) % 5 == 0:
                c = WA(5)
        return c
    ellipse(cv, 8, 14, 6, 3.7, inner)
    # lip highlight and outline
    ellipse(cv, 8, 15, 8, 6, lambda dx, dy, d: OUT if d > 0.9 else None)
    # gold accent: a brass tap pin on the rim (interactable)
    cv.rect(7, 8, 3, 2, GD(3))
    cv.set(8, 8, GD(5))
    cv.set(7, 9, GD(1))
    if frame:
        # a thin stream into the bowl from the left (the trough mouth) reads as 'receiving'
        cv.set(1, 14, WA(4)); cv.set(2, 14, WA(5))
    return cv


def INK_DRY(dx, dy, d):
    c = DARK if d < 0.8 else K(0)
    if int((dx + 2) * 9 + dy * 7) % 5 == 0 and d < 0.7:
        c = K(1)
    return c


def waterwheel(frame):
    """32 x 32 wooden wheel in a stone cradle. frame 0 still, 1..3 turning (spokes advance 15 degrees, a spill of
    water at the foot)."""
    cv = Canvas(32, 32)
    floor_shadow(cv, 3, 29, 31, 70)
    # stone cradle
    blk(cv, 1, 20, 30, 30, K(4), K(3), K(1))
    cv.hline(1, 30, 24, K(2))
    for x in range(4, 30, 7):
        cv.vline(x, 21, 29, K(2))
    # the wheel (centre 16, 14, radius 12)
    cx, cy = 15.5, 13.5
    ang = 0 if frame == 0 else (frame - 1) * 15 + 15
    # rim shadow disc then wheel
    ellipse(cv, cx, cy, 12.5, 12.5, lambda dx, dy, d: OUT)
    ellipse(cv, cx, cy, 11.5, 11.5, lambda dx, dy, d: (WD(3) if d > 0.82 else (K(0) if d < 0.9 else WD(3))) if d > 0.8 else (K(0) if (int(cx + dx * 12) + int(cy + dy * 12)) % 7 else K(1)))
    # paddles (12 around the rim) alternate lit and dark
    for i in range(12):
        a = math.radians(ang + i * 30)
        for r in (10, 11, 12):
            x = round(cx + math.cos(a) * r)
            y = round(cy + math.sin(a) * r)
            cv.set(x, y, WD(4) if math.sin(a) < 0.3 else WD(2))
            cv.set(x + 1, y, WD(2) if math.sin(a) < 0.3 else WD(1))
    # spokes (8)
    for i in range(8):
        a = math.radians(ang + i * 45)
        for r in range(2, 11):
            x = round(cx + math.cos(a) * r)
            y = round(cy + math.sin(a) * r)
            cv.set(x, y, WD(4) if (math.cos(a) + math.sin(a)) < 0 else WD(3))
            cv.set(x + 1, y, WD(2))
    # brass tyre ring
    for i in range(72):
        a = math.radians(i * 5)
        x = round(cx + math.cos(a) * 9)
        y = round(cy + math.sin(a) * 9)
        cv.set(x, y, GD(3) if math.sin(a) < 0.2 else GD(1))
    # hub
    ellipse(cv, cx, cy, 3.2, 3.2, lambda dx, dy, d: GD(4) if dx + dy < -0.3 else (GD(2) if d < 0.7 else GD(1)))
    cv.set(15, 12, GD(5))
    # the wheel is half sunk in the cradle: hide its lower arc behind the front of the cradle
    blk(cv, 1, 22, 30, 30, K(4), K(3), K(1))
    cv.hline(2, 29, 25, K(2))
    for x in range(4, 30, 7):
        cv.vline(x, 23, 29, K(2))
    cv.hline(1, 30, 22, K(5))
    if frame:
        f = frame - 1
        for x in range(10, 22):
            cv.set(x, 23, water_px(x, 23, f)) if (x + f) % 2 else cv.set(x, 23, WA(3))
        for x in range(9, 23):
            cv.set(x, 24, water_px(x, 24, f))
        splash(cv, 16, 22, f, 6)
    else:
        for x in range(10, 22):
            cv.set(x, 23, K(1))
    return cv


# ====================================================================== gates and doors
def bars(cv, x0, x1, y0, y1, fn, step=3):
    for x in range(x0, x1 + 1, step):
        for y in range(y0, y1 + 1):
            cv.set(x, y, fn(x, y, 0))
            cv.set(x + 1, y, fn(x, y, 1)) if x + 1 <= x1 else None


def hot_grate(open_, f):
    """32 x 32 doorway set in a 2-tile face. Closed: iron frame, glowing orange bars. Open: bars drawn up into the
    lintel, a dark doorway with steam wisps rising."""
    cv = Canvas(32, 32)
    # frame
    blk(cv, 0, 0, 31, 31, K(4), K(3), K(1), corners=False)
    cv.rect(2, 4, 28, 27, DARK)
    # lintel
    blk(cv, 0, 0, 31, 6, MT(2), K(3), K(1), corners=False)
    for x in (3, 9, 22, 28):
        cv.set(x, 3, MT(3))
    # hot door jambs
    blk(cv, 0, 4, 3, 31, K(4), K(3), K(1), corners=False)
    blk(cv, 28, 4, 31, 31, K(4), K(3), K(1), corners=False)
    if not open_:
        # glow behind the bars
        glow_cols = [FI(1), FI(1), FI(2), FI(1)]
        for y in range(7, 31):
            for x in range(4, 28):
                cv.set(x, y, glow_cols[(x + y + f) % 4] if (x + y) % 2 else FI(1))
        # bars: bright orange, pulse by frame
        for i, x in enumerate(range(5, 28, 4)):
            for y in range(7, 31):
                c = FI(4) if (y + f * 2 + i) % 9 < 3 else FI(3)
                cv.set(x, y, c)
                cv.set(x + 1, y, FI(2) if (y + f) % 5 else FI(3))
                cv.set(x - 1, y, FI(0 if False else 1))
        for y in (13, 24):
            for x in range(4, 28):
                cv.set(x, y, FI(3))
                cv.set(x, y + 1, FI(1))
        # a heat shimmer at the top
        for x in range(4, 28, 2):
            cv.put(x, 6 + (f % 2), glow(FI(4), 150))
    else:
        # doorway: dark, lit from within by a dim red, steam
        for y in range(7, 31):
            for x in range(4, 28):
                t = (y - 7) / 24
                cv.set(x, y, FI(0) if t > 0.55 and (x + y) % 3 == 0 else DARK)
        for x in range(4, 28):
            cv.set(x, 30, K(1))
            cv.set(x, 29, K(2) if x % 2 else K(1))
        # bars raised: stubs under the lintel
        for x in range(5, 28, 4):
            cv.rect(x, 7, 2, 3, K(3))
            cv.set(x, 7, K(4))
        # cooled grate: dark iron, a trace of heat at the tips
        for x in range(5, 28, 4):
            cv.set(x, 9, FI(1))
        # steam wisps
        for k in range(5):
            x0 = 7 + k * 5
            for j in range(9):
                y = 28 - ((j * 3 + f * 3 + k * 4) % 22)
                x = x0 + round(math.sin((j + f + k) * 0.9) * 1.6)
                cv.put(x, y, (232, 232, 240, 150 if j % 3 else 210))
    return cv


def ore_crate():
    cv = Canvas(16, 32)
    floor_shadow(cv, 2, 15, 30, 70)
    # top face (lighter, ore heaped) and front
    cv.rect(1, 9, 14, 6, K(0))
    for y in range(10, 15):
        for x in range(2, 14):
            n = h32(x, y, 6201) % 9
            c = K(2) if n < 5 else (K(1) if n < 7 else EA(1))
            if n == 8:
                c = FI(2)                          # a glowing seam in the ore
            cv.set(x, y, c)
    cv.set(4, 10, K(4)); cv.set(9, 11, K(4)); cv.set(6, 13, K(3)); cv.set(11, 12, K(3))
    # front: iron-banded planks
    blk(cv, 1, 15, 14, 29, WD(4), WD(3), WD(1), corners=False)
    for y in range(17, 28):
        for x in range(3, 13):
            cv.set(x, y, WD(3) if (x + (y // 4)) % 4 else WD(2))
    for y in (17, 22, 27):
        cv.hline(2, 13, y, K(1))
    for x in (2, 13):                                 # straps and rivets
        cv.vline(x, 15, 29, K(3))
        for y in (16, 21, 26):
            cv.set(x, y, MT(3))
    # iron corner brackets
    for (x, y) in ((1, 15), (14, 15), (1, 29), (14, 29)):
        cv.set(x, y, K(3))
    cv.hline(1, 14, 29, OUT)
    # stencilled mark
    cv.set(7, 24, FI(3)); cv.set(8, 24, FI(3)); cv.set(7, 25, FI(2)); cv.set(8, 25, FI(2))
    return cv


def anvil_oath(struck):
    cv = Canvas(16, 32)
    floor_shadow(cv, 1, 15, 30, 70)
    # stump
    blk(cv, 3, 19, 12, 30, WD(4), WD(2), WD(1), corners=False)
    for y in range(21, 30):
        if y % 3 == 0:
            cv.hline(5, 11, y, WD(1))
    cv.hline(3, 12, 30, OUT)
    # anvil body
    iron_hi = MT(2) if not struck else MT(3)
    blk(cv, 4, 14, 11, 19, K(4), K(3), K(1), corners=False)          # waist
    blk(cv, 0, 8, 15, 14, iron_hi, K(3), K(1), corners=False)          # face
    cv.hline(1, 14, 8, MT(3) if not struck else FI(5))
    for x in range(0, 4):                                              # horn tapers
        cv.hline(0, 3 - x, 8 + x // 2 + 3, None)
    cv.set(0, 8, DARK); cv.set(0, 9, DARK)
    cv.hline(5, 11, 20, OUT)
    # the oath mark on the face: gold hammer glyph (interactable accent)
    mark = GD(4) if not struck else FI(5)
    for (x, y) in ((6, 10), (7, 10), (8, 10), (9, 10), (7, 11), (8, 11), (7, 12), (8, 12)):
        cv.set(x, y, mark if y == 10 else (GD(2) if not struck else FI(4)))
    if struck:
        # molten glow on the face and sparks
        for x in range(2, 14):
            cv.set(x, 9, FI(3) if x % 2 else FI(4))
        for (x, y, c) in ((2, 5, FI(5)), (5, 3, FI(4)), (8, 1, FI(5)), (11, 4, FI(4)), (13, 6, FI(5)), (6, 6, FI(3)),
                          (10, 2, FI(3)), (3, 2, FI(3))):
            cv.set(x, y, c)
        cv.put(7, 7, (249, 215, 122, 160)); cv.put(8, 7, (249, 215, 122, 160))
    return cv


def bell_gate(state):
    """48 x 48. state 0..3 = bell sockets lit; 4 = open. Bronze ribs, three bell sockets over two plain leaves."""
    cv = Canvas(48, 48)
    opn = state == 4
    # frame / arch
    blk(cv, 0, 0, 47, 47, GD(3), K(1), K(0), corners=False)
    blk(cv, 0, 0, 47, 4, GD(3), GD(2), GD(1), corners=False)
    blk(cv, 0, 0, 5, 47, GD(3), GD(2), GD(1), corners=False)
    blk(cv, 42, 0, 47, 47, GD(3), GD(2), GD(1), corners=False)
    for y in range(8, 46, 6):
        cv.set(2, y, GD(5)); cv.set(44, y, GD(5))
    # socket band
    cv.rect(6, 5, 36, 16, K(0))
    cv.hline(6, 41, 20, GD(1))
    lit = 0 if opn else state
    if opn:
        lit = 3
    for i in range(3):
        cx = 14 + i * 10
        on = i < lit
        # socket recess
        cv.rect(cx - 4, 7, 9, 12, K(1) if not on else RR(1))
        # the bell: crown, waist, lip
        col_hi, col_mid, col_lo = (GD(5), GD(4), GD(2)) if on else (K(3), K(2), K(1))
        rows = [(2, 0), (3, 1), (3, 2), (4, 3), (4, 4), (4, 5), (5, 6), (5, 7), (6, 8)]
        for (hw, dy) in rows:
            y = 8 + dy
            for x in range(cx - hw + 1, cx + hw):
                c = col_mid
                if x <= cx - hw + 1:
                    c = col_hi
                elif x >= cx + hw - 1:
                    c = col_lo
                cv.set(x, y, c)
        cv.hline(cx - 5, cx + 5, 16, col_lo)
        cv.set(cx, 17, col_hi if on else K(3))
        cv.set(cx - 1, 7, col_mid); cv.set(cx, 7, col_hi)
        if on:
            for dx in (-6, 6):
                cv.put(cx + dx, 12, glow(FI(4), 130))
            cv.put(cx, 18, glow(FI(5), 150))
    # leaves
    if not opn:
        for k, x0 in enumerate((6, 24)):
            blk(cv, x0, 22, x0 + 17, 47, K(4), K(2), K(0), corners=False)
            for y in range(25, 45, 5):
                cv.hline(x0 + 2, x0 + 15, y, K(1))
            for y in range(24, 46, 5):
                cv.hline(x0 + 2, x0 + 15, y, K(3))
            # bronze ribs and a bell relief on each leaf
            cv.vline(x0 + 8, 22, 46, GD(2))
            cv.vline(x0 + 9, 22, 46, GD(1))
            cv.rect(x0 + 6 - 0, 30, 5, 5, K(1))
            cv.set(x0 + 8, 31, GD(3)); cv.set(x0 + 8, 32, GD(2)); cv.set(x0 + 7, 33, GD(2)); cv.set(x0 + 9, 33, GD(1))
        # seam glow once all three are lit
        if state == 3:
            cv.vline(23, 22, 46, FI(3)); cv.vline(24, 22, 46, FI(4))
        else:
            cv.vline(23, 22, 46, DARK); cv.vline(24, 22, 46, DARK)
        # a lock plate at the seam
        cv.rect(21, 34, 6, 4, K(1)); cv.set(23, 35, GD(3)); cv.set(24, 35, GD(3))
    else:
        for y in range(22, 48):
            for x in range(6, 42):
                t = (y - 22) / 26
                cv.set(x, y, DARK if (x + y) % 4 or t < 0.4 else FI(0))
        # leaves swung back against the jambs
        for x0 in (6, 38):
            blk(cv, x0, 22, x0 + 3, 47, K(4), K(2), K(0), corners=False)
        # warm light on the threshold
        for x in range(10, 38):
            cv.put(x, 46, glow(FI(2), 160))
            cv.put(x, 47, glow(FI(3), 120))
    return cv


def door_crucible(opn):
    """48 x 48 boss door: a slab of black iron with a molten seam; open: a red-lit passage."""
    cv = Canvas(48, 48)
    blk(cv, 0, 0, 47, 47, K(4), K(1), K(0), corners=False)
    blk(cv, 0, 0, 47, 7, MT(2), K(3), K(1), corners=False)
    for x in (4, 14, 33, 43):
        cv.set(x, 4, MT(3))
    # jambs with bronze studs
    for x0 in (0, 41):
        blk(cv, x0, 6, x0 + 6, 47, K(4), K(2), K(0), corners=False)
        for y in range(10, 46, 7):
            cv.set(x0 + 3, y, GD(3)); cv.set(x0 + 3, y + 1, GD(1))
    if not opn:
        # the slab: two leaves with seam
        for x0 in (7, 24):
            blk(cv, x0, 9, x0 + 16, 47, K(3), K(2), K(0), corners=False)
            for y in range(12, 46, 8):
                cv.hline(x0 + 2, x0 + 15, y, K(1))
                cv.hline(x0 + 2, x0 + 15, y + 1, K(3))
        # the molten seam between the leaves, branching cracks
        for y in range(9, 47):
            cv.set(23, y, FI(3) if y % 3 else FI(4))
            cv.set(24, y, FI(2))
        for (x, y, dx) in ((22, 18, -1), (25, 26, 1), (22, 34, -1), (25, 40, 1)):
            for k in range(4):
                cv.set(x + dx * k, y + k // 2, FI(2) if k < 3 else FI(1))
        # the warden's bronze ring-knocker
        cv.rect(20, 24, 8, 8, K(0))
        for i in range(24):
            a = i * math.pi / 12
            cv.set(round(23.5 + math.cos(a) * 3.2), round(27.5 + math.sin(a) * 3.2), GD(3) if math.sin(a) < 0.2 else GD(1))
        cv.set(23, 27, GD(4))
        for x in (10, 36):
            cv.rect(x, 15, 3, 3, K(0)); cv.set(x + 1, 16, FI(3))
    else:
        for y in range(9, 48):
            for x in range(7, 41):
                t = (y - 9) / 38
                c = DARK
                if (x + y) % 5 == 0 and t > 0.2:
                    c = RR(0)
                if t > 0.82 and (x + y) % 2 == 0:
                    c = FI(0)
                cv.set(x, y, c)
        for x in range(7, 41):
            cv.put(x, 46, glow(FI(2), 190))
            cv.put(x, 47, glow(FI(3), 140))
        for x0 in (7, 38):
            blk(cv, x0, 9, x0 + 2, 47, K(3), K(2), K(0), corners=False)
    return cv


def ore_lift(opn):
    """32 x 32 lift door in a 2-tile face: a scissor cage. Open: cage folded back, a lit car floor."""
    cv = Canvas(32, 32)
    blk(cv, 0, 0, 31, 31, K(4), K(2), K(0), corners=False)
    blk(cv, 0, 0, 31, 5, MT(2), K(3), K(1), corners=False)
    # hazard stripes on the lintel underside
    for x in range(1, 31):
        if (x // 3) % 2 == 0:
            cv.set(x, 5, GD(3))
    cv.rect(3, 6, 26, 25, DARK)
    if not opn:
        # scissor lattice: diagonals both ways, brass pivots
        for x in range(4, 28, 8):
            for k in range(0, 8):
                cv.set(x + k, 7 + k * 3 // 1 if 7 + k * 3 < 31 else 30, K(4))
        for y in range(7, 31, 6):
            for x in range(4, 28):
                cv.set(x, y + ((x - 4) % 6) // 1 - 0 if y + ((x - 4) % 6) < 31 else 30, K(4))
        for y in range(7, 31, 6):
            for x in range(4, 28):
                yy = y + 5 - ((x - 4) % 6)
                if yy < 31:
                    cv.set(x, yy, K(3))
        for x in range(4, 28, 6):
            for y in range(7, 31, 6):
                cv.set(x, y, GD(3))
        # a call lamp (gold accent)
        cv.rect(14, 2, 4, 3, K(1)); cv.set(15, 3, GD(4)); cv.set(16, 3, GD(4))
    else:
        for y in range(22, 31):
            for x in range(3, 29):
                cv.set(x, y, K(2) if (x + y) % 4 else K(1))
        cv.hline(3, 28, 22, K(4))
        for x in range(3, 29, 5):
            cv.set(x, 21, GD(3))
        # the folded cage at the jambs
        for x0 in (3, 25):
            for y in range(7, 21):
                cv.set(x0, y, K(3)); cv.set(x0 + 1, y, K(4) if y % 2 else K(2))
        # lit car light
        for x in range(6, 26):
            cv.put(x, 6, glow(GD(4), 140))
        cv.set(15, 3, GD(5)); cv.set(16, 3, GD(5)); cv.rect(14, 2, 4, 3, GD(2))
        cv.set(15, 3, GD(5)); cv.set(16, 3, GD(5))
    return cv


# ====================================================================== font, heartforge, furnaces, fans
def font_cistern(f):
    cv = Canvas(32, 32)
    floor_shadow(cv, 2, 30, 31, 70)
    # stone cistern basin with gold rim
    blk(cv, 1, 14, 30, 30, K(4), K(3), K(1), corners=False)
    for x in range(4, 30, 6):
        cv.vline(x, 20, 29, K(2))
    cv.hline(2, 29, 22, K(2))
    ellipse(cv, 15.5, 12, 14.5, 6.5, lambda dx, dy, d: GD(3) if (dx + dy < -0.2) else GD(2))
    ellipse(cv, 15.5, 12.5, 13, 5, lambda dx, dy, d: water_px(int(15 + dx * 13), int(12 + dy * 5) * 2, f))
    ellipse(cv, 15.5, 12.5, 14.8, 6.8, lambda dx, dy, d: OUT if d > 0.93 else None)
    # brass pipe and a pour into the cistern at the back
    cv.rect(14, 1, 4, 6, K(2)); cv.vline(14, 1, 6, K(4)); cv.vline(17, 1, 6, K(1))
    blk(cv, 12, 0, 19, 2, GD(3), GD(2), GD(1), corners=False)
    for y in range(7, 11):
        cv.set(15, y, WA(5) if (y + f) % 2 else WA(4)); cv.set(16, y, WA(4))
    # rising glints (gold accent)
    for k in range(3):
        x = 8 + k * 7
        y = 10 - ((f * 2 + k * 3) % 6)
        cv.set(x, y, WHITE if k != 1 else GD(5))
    return cv


def heartforge(state):
    """96 x 80 (6 x 5): iron-hooded brick furnace set in the north face. 0 roaring, 1 banked, 2 and 3 roar frames."""
    cv = Canvas(96, 80)
    roaring = state != 1
    f = {0: 0, 2: 1, 3: 2}.get(state, 0)
    # hood
    blk(cv, 0, 0, 95, 79, K(4), K(1), K(0), corners=False)
    for y in range(4, 76):
        for x in range(4, 92):
            c = RR(1) if (x // 8 + (y // 5) % 2 * 0) % 2 == 0 and (y % 5) else RR(0)
            if (y % 5 == 0) or ((x + (y // 5 % 2) * 4) % 8 == 0):
                c = RR(0)
            cv.set(x, y, c)
    # top band + chimney bands
    blk(cv, 0, 0, 95, 13, MT(2), K(3), K(1), corners=False)
    for x in range(6, 92, 12):
        cv.set(x, 6, MT(3)); cv.set(x + 1, 6, MT(3))
    cv.hline(0, 95, 13, K(0))
    # side pillars
    for x0 in (0, 84):
        blk(cv, x0, 14, x0 + 11, 79, K(4), K(2), K(0), corners=False)
        for y in range(18, 78, 9):
            cv.set(x0 + 5, y, MT(3)); cv.set(x0 + 6, y, MT(1))
    # arch mouth
    mx0, mx1, my0, my1 = 16, 79, 24, 70
    for y in range(my0, my1 + 1):
        for x in range(mx0, mx1 + 1):
            t = (x - 47.5) / 32.0
            top = my0 + (1 - math.sqrt(max(0.0, 1 - t * t))) * 18
            if y >= top:
                cv.set(x, y, DARK)
    # arch voussoirs
    for x in range(mx0 - 2, mx1 + 3):
        t = (x - 47.5) / 34.0
        if abs(t) > 1:
            continue
        top = my0 + (1 - math.sqrt(max(0.0, 1 - t * t))) * 18
        y = round(top)
        cv.set(x, y - 1, K(4))
        cv.set(x, y - 2, K(3) if x % 4 else K(1))
    # the fire
    for y in range(my0 + 4, my1 + 1):
        for x in range(mx0 + 2, mx1 - 1):
            t = (x - 47.5) / 32.0
            top = my0 + (1 - math.sqrt(max(0.0, 1 - t * t))) * 18
            if y < top + 1:
                continue
            if roaring:
                depth = (my1 - y) / (my1 - my0)
                flame = depth + 0.18 * math.sin((x * 0.5) + f * 2.1) + 0.12 * math.sin(x * 1.3 - f * 1.7)
                if flame > 0.78 - abs(t) * 0.25:
                    c = FI(5) if flame > 1.0 else FI(4)
                elif flame > 0.55:
                    c = FI(3)
                elif flame > 0.32:
                    c = FI(2)
                else:
                    c = FI(1) if (x + y + f) % 3 else FI(2)
                if y > my1 - 8:
                    c = FI(5) if (x + f) % 3 else FI(4)
            else:
                c = DARK
                if y > my1 - 14:
                    n = h32(x // 2, y // 2, 6301)
                    c = FI(0) if n % 6 else RR(1)
                    if n % 29 == 0:
                        c = FI(2)
                    if y > my1 - 5 and n % 3 == 0:
                        c = K(1)
            cv.set(x, y, c)
    # hearth lip and ash
    cv.rect(mx0 - 3, my1 + 1, mx1 - mx0 + 7, 9, K(2))
    cv.hline(mx0 - 3, mx1 + 3, my1 + 1, K(4))
    cv.hline(mx0 - 3, mx1 + 3, my1 + 9, OUT)
    for x in range(mx0 - 2, mx1 + 3):
        if (x + f) % 4 == 0 and roaring:
            cv.put(x, my1 + 2, glow(FI(3), 200))
    # a glow wash on the hood when roaring
    if roaring:
        for y in range(14, 24):
            for x in range(20, 76):
                if (x + y) % 2 == 0:
                    cv.put(x, y, glow(FI(3), 50 if y > 18 else 30))
    # a big riveted plate with the Smelter's brand
    cv.rect(40, 16, 16, 6, K(1))
    cv.hline(41, 54, 18, GD(2)); cv.hline(44, 51, 20, GD(1))
    return cv


def furnace_mouth(f):
    cv = Canvas(32, 32)
    blk(cv, 0, 0, 31, 31, K(4), K(1), K(0), corners=False)
    blk(cv, 0, 0, 31, 5, MT(2), K(3), K(1), corners=False)
    for x in range(4, 28):
        for y in range(8, 31):
            t = (x - 15.5) / 11.5
            top = 8 + (1 - math.sqrt(max(0.0, 1 - t * t))) * 8
            if y < top:
                continue
            depth = (30 - y) / 22
            flame = depth + 0.2 * math.sin(x * 0.8 + f * 2.1) + 0.1 * math.sin(x * 2 - f)
            c = FI(5) if flame > 0.95 else (FI(4) if flame > 0.7 else (FI(3) if flame > 0.45 else (FI(2) if flame > 0.2 else FI(1))))
            cv.set(x, y, c)
    for x in range(4, 28):
        t = (x - 15.5) / 11.5
        top = 8 + (1 - math.sqrt(max(0.0, 1 - t * t))) * 8
        cv.set(x, round(top) - 1, K(4))
        cv.set(x, round(top) - 2, K(1))
    cv.rect(2, 26, 28, 5, K(2))
    cv.hline(2, 29, 26, K(4))
    cv.hline(2, 29, 30, OUT)
    for x in range(3, 29):
        if (x + f) % 3 == 0:
            cv.put(x, 25, glow(FI(4), 220))
    return cv


def fan_great(state):
    """48 x 48 great fan in its shaft: iron ring, six blades. 0 / 1 spinning (blades blurred), 2 stopped."""
    cv = Canvas(48, 48)
    cx, cy = 23.5, 23.5
    ellipse(cv, cx, cy, 23.5, 23.5, lambda dx, dy, d: OUT)
    ellipse(cv, cx, cy, 22.5, 22.5, lambda dx, dy, d: (K(3) if dx + dy < -0.5 else K(2)) if d > 0.88 else DARK)
    ellipse(cv, cx, cy, 20.5, 20.5, lambda dx, dy, d: DARK if d < 0.98 else None)
    # ring bolts
    for i in range(12):
        a = math.radians(i * 30)
        cv.set(round(cx + math.cos(a) * 21.8), round(cy + math.sin(a) * 21.8), MT(2))
    base = 15 if state == 2 else (state * 30)
    for i in range(6):
        a0 = math.radians(base + i * 60)
        for r in range(4, 20):
            w = 0.52 if state == 2 else 0.8       # angular half-width, wider when blurred
            span = w * (0.7 + 0.5 * r / 20) * 0.5
            for k in range(-4, 5):
                a = a0 + (r / 22.0) * 0.55 + k * span / 4.0
                x = round(cx + math.cos(a) * r)
                y = round(cy + math.sin(a) * r)
                edge = abs(k) == 4
                if state == 2:
                    c = K(4) if k < -1 else (K(3) if k < 2 else K(1))
                    if edge:
                        c = OUT
                else:
                    c = K(2) if abs(k) < 3 else K(1)
                    c = (K(3) if (r + k) % 2 else K(2)) if abs(k) < 3 else K(1)
                cv.set(x, y, c)
    # hub
    ellipse(cv, cx, cy, 4.5, 4.5, lambda dx, dy, d: OUT if d > 0.82 else (GD(4) if dx + dy < -0.3 else (GD(2) if d < 0.65 else GD(1))))
    cv.set(22, 22, GD(5))
    if state != 2:
        # blur streaks in the air
        for i in range(8):
            a = math.radians(base * 2 + i * 45)
            for r in range(8, 19):
                x = round(cx + math.cos(a) * r)
                y = round(cy + math.sin(a) * r)
                cv.put(x, y, (200, 200, 220, 80))
    return cv


def bellows_decor():
    cv = Canvas(32, 32)
    floor_shadow(cv, 1, 31, 31, 70)
    # stand
    blk(cv, 2, 24, 29, 30, WD(4), WD(2), WD(1), corners=False)
    # leather bellows: accordion folds
    for i in range(7):
        y0 = 7 + i * 2
        w = 13 - abs(3 - i) // 1
        cv.rect(16 - w, y0, w * 2, 2, EA(2) if i % 2 else EA(3))
        cv.hline(16 - w, 15 + w, y0, EA(1))
        cv.set(16 - w, y0, OUT)
        cv.set(15 + w, y0, OUT)
    cv.hline(5, 26, 21, OUT)
    # wooden boards
    blk(cv, 3, 3, 28, 7, WD(4), WD(3), WD(1), corners=False)
    blk(cv, 3, 21, 28, 24, WD(4), WD(3), WD(1), corners=False)
    # handle
    cv.rect(26, 0, 3, 4, WD(2)); cv.set(26, 0, WD(4)); cv.set(27, 0, WD(3))
    # iron nozzle pointing right with a warm tip
    blk(cv, 22, 25, 31, 28, MT(2), K(3), K(1), corners=False)
    cv.set(31, 26, FI(3)); cv.set(31, 27, FI(2))
    # brass studs
    for x in range(5, 28, 4):
        cv.set(x, 5, GD(3)); cv.set(x, 22, GD(3))
    return cv


def pipe_h():
    cv = Canvas(16, 32)
    cv.rect(0, 12, 16, 7, K(2))
    cv.hline(0, 15, 12, OUT); cv.hline(0, 15, 18, OUT)
    cv.hline(0, 15, 13, K(4)); cv.hline(0, 15, 14, K(3)); cv.hline(0, 15, 17, K(1))
    for x in (4, 5, 11, 12):
        cv.vline(x, 11, 19, GD(2));
    cv.vline(4, 11, 19, GD(3)); cv.vline(5, 11, 19, GD(1)); cv.vline(11, 11, 19, GD(3)); cv.vline(12, 11, 19, GD(1))
    cv.put(8, 20, SH(70)); cv.put(9, 20, SH(70))
    return cv


def pipe_v():
    cv = Canvas(16, 32)
    cv.rect(5, 0, 7, 32, K(2))
    cv.vline(5, 0, 31, OUT); cv.vline(11, 0, 31, OUT)
    cv.vline(6, 0, 31, K(4)); cv.vline(7, 0, 31, K(3)); cv.vline(10, 0, 31, K(1))
    for y in (6, 7, 22, 23):
        cv.hline(4, 12, y, GD(2))
    cv.hline(4, 12, 6, GD(3)); cv.hline(4, 12, 22, GD(3))
    cv.hline(4, 12, 7, GD(1)); cv.hline(4, 12, 23, GD(1))
    cv.set(12, 12, SH(80)); cv.set(12, 13, SH(60))
    return cv


def pipe_elbow():
    """From the left edge, bending down."""
    cv = Canvas(16, 32)
    cv.rect(0, 10, 12, 7, K(2))
    cv.rect(5, 10, 7, 22, K(2))
    cv.hline(0, 11, 10, OUT); cv.hline(0, 4, 16, OUT)
    cv.vline(5, 16, 31, OUT); cv.vline(11, 10, 31, OUT)
    cv.hline(0, 10, 11, K(4)); cv.hline(0, 4, 12, K(3)); cv.hline(0, 4, 15, K(1))
    cv.vline(6, 16, 31, K(4)); cv.vline(7, 16, 31, K(3)); cv.vline(10, 10, 31, K(1))
    cv.rect(3, 9, 2, 9, GD(2)); cv.vline(3, 9, 17, GD(3)); cv.vline(4, 9, 17, GD(1))
    cv.hline(4, 12, 24, GD(2)); cv.hline(4, 12, 24, GD(3)); cv.hline(4, 12, 25, GD(1))
    return cv


def pipe_valve():
    cv = pipe_v()
    # a red wheel valve in the middle: bright accent
    for i in range(16):
        a = i * math.pi / 8
        cv.set(round(8 + math.cos(a) * 4.5), round(14 + math.sin(a) * 2.8), FI(2) if math.sin(a) > 0 else FI(3))
    cv.rect(7, 13, 3, 3, GD(3)); cv.set(7, 13, GD(5))
    cv.hline(4, 12, 14, FI(2)) if False else None
    cv.vline(8, 11, 17, FI(1))
    return cv


def ledger_burned():
    cv = Canvas(16, 32)
    floor_shadow(cv, 2, 14, 30, 70)
    # lectern stand
    blk(cv, 6, 17, 9, 28, WD(4), WD(2), WD(1), corners=False)
    blk(cv, 3, 27, 12, 30, WD(3), WD(2), WD(1), corners=False)
    # slanted desk
    for y in range(8, 18):
        for x in range(1, 15):
            cv.set(x, y, WD(3) if y > 9 else WD(4))
    cv.hline(1, 14, 8, OUT); cv.hline(1, 14, 17, OUT); cv.vline(1, 8, 17, OUT); cv.vline(14, 8, 17, OUT)
    # the burned ledger: charred pages, ragged edge, embers
    for y in range(9, 17):
        for x in range(2, 14):
            n = h32(x, y, 6401) % 8
            if (x - 2) + (y - 9) > 14 + (n % 3):
                continue
            c = K(5) if n > 5 else (SW(4) if n > 2 else SW(3))
            if x in (7, 8):
                c = K(0)
            if n == 0 and (x + y) % 3 == 0:
                c = DARK
            cv.set(x, y, c)
    for (x, y) in ((11, 14), (12, 13), (3, 9), (9, 15)):
        cv.set(x, y, FI(3))
    cv.set(12, 12, FI(5)); cv.set(2, 10, FI(4))
    # wisps of smoke
    for (x, y) in ((11, 6), (12, 4), (11, 2)):
        cv.put(x, y, (200, 200, 215, 120))
    # gold accent: a ribbon marker
    cv.set(7, 15, GD(4)); cv.set(7, 16, GD(3))
    return cv


def tool_rack():
    cv = Canvas(32, 32)
    floor_shadow(cv, 0, 31, 31, 60)
    # board
    blk(cv, 0, 2, 31, 28, WD(4), WD(2), WD(1), corners=False)
    for x in range(3, 30, 5):
        cv.vline(x, 4, 26, WD(1))
    cv.hline(1, 30, 12, WD(1)); cv.hline(1, 30, 13, WD(3))
    # pegs
    for x in (5, 11, 17, 23, 28):
        cv.set(x, 9, MT(2))
    # hammer
    cv.vline(5, 10, 24, WD(4)); cv.vline(6, 10, 24, WD(2))
    blk(cv, 2, 6, 9, 11, MT(2), K(3), K(1), corners=False)
    # tongs
    cv.line(11, 10, 13, 25, K(4)); cv.line(14, 10, 12, 25, K(3)); cv.line(15, 25, 13, 26, K(2))
    # rake / poker
    cv.line(19, 8, 19, 26, K(4)); cv.line(20, 8, 20, 26, K(2))
    cv.hline(16, 23, 8, K(3)); cv.set(16, 9, K(2)); cv.set(23, 9, K(2))
    # slag spoon
    cv.line(25, 9, 25, 22, K(4)); cv.line(26, 9, 26, 22, K(1))
    ellipse(cv, 25.5, 24, 3, 2.2, lambda dx, dy, d: K(3) if dx < 0 else K(1))
    # sledge
    cv.vline(29, 10, 26, WD(4)); cv.vline(30, 10, 26, WD(1))
    blk(cv, 26, 5, 31, 10, MT(2), K(2), K(1), corners=False)
    cv.hline(0, 31, 28, OUT)
    return cv


def splash_puddle(f):
    """Floor decal: where water stops on a non-flow cell. Translucent, no collision."""
    cv = Canvas(16, 16)
    ellipse(cv, 8, 9, 7, 4.3, lambda dx, dy, d: glow(WA(2), 150) if d > 0.7 else glow(WA(3), 170))
    for (x, y) in ((4, 8), (9, 7), (6, 11), (11, 10)):
        cv.put(x + (f % 2), y, glow(WA(5), 230))
    # ripple ring grows per frame
    r = 2 + f * 1.4
    for i in range(24):
        a = i * math.pi / 12
        cv.put(round(8 + math.cos(a) * r * 1.6), round(9 + math.sin(a) * r * 0.9), glow(WA(4), 200))
    return cv


# ====================================================================== sheet assembly
def build_into(sh):
    sh.newline()
    O = sh.meta['objects']
    put_frames(sh, 'spout_wall', [spout_wall(i) for i in range(3)], [0, 1], [[0, 0]], kind='piece', anim_ms=140,
               note='water spout set in a north face (EPISODE3_PLAN 5.1 `spout` sprite); the stream leaves its '
                    'lowest row southward onto the first flow cell')
    put_frames(sh, 'spout_cistern', [spout_cistern(i) for i in range(3)], [0, 1], [[0, 0]], anim_ms=140,
               note='water source on the floor (`spout` sprite spout_cistern): a tank with a spigot, water falls '
                    'south onto the next cell')
    put_frames(sh, 'sluice', [sluice(0), sluice(1)], [0, 1], [[0, 0]],
               note="paddle at a trough junction; frames by state: 0 = '/', 1 = '\\\\'. Draw it over a trough "
                    "floor cell (it is solid, one cell, like a mirror)")
    bs = [basin(i) for i in range(4)]
    m = put_frames(sh, 'basin', bs, [0, 1], [[0, 0]],
                   note='water receptor; frames by state: 0 = empty, 1 = full. Frames 1..3 are the full glint '
                        'cycle (`fullAnim`)')
    m['fullAnim'] = {'frames': [1, 2, 3, 2], 'frameDx': 16, 'ms': 180}
    ww = [waterwheel(i) for i in range(4)]
    m = put_frames(sh, 'waterwheel', ww, [0, 1], [[0, 0], [1, 0]], overhead=1,
                   note='water receptor sprite `waterwheel`; frames by state: 0 = still, 1 = turning. Frames 1..3 '
                        'are the turning cycle (`turnAnim`)')
    m['turnAnim'] = {'frames': [1, 2, 3], 'frameDx': 32, 'ms': 110}
    sh.newline()
    # hot grate pair (GATE_SPRITES hot_grate: closed, open)
    put_frames(sh, 'hot_grate_closed', [hot_grate(False, i) for i in range(3)], [0, 1], [[0, 0], [1, 0]], kind='door',
               anim_ms=220, note='hot gate, closed: glowing bars (solid). set into a 2-tile wall face')
    put_frames(sh, 'hot_grate_open', [hot_grate(True, i) for i in range(3)], [0, 1], [], kind='door', door=[0, 0],
               anim_ms=260, note='hot gate, cooled and open: dark doorway with steam wisps')
    sh.newline()
    sh.obj('ore_crate', ore_crate(), [0, 1], [[0, 0]], 1, note='heavy block skin (`heavy: true`): iron-banded ore crate')
    put_frames(sh, 'anvil_oath', [anvil_oath(False), anvil_oath(True)], [0, 1], [[0, 0]],
               note='oath anvil; frames by state: 0 = cold, 1 = struck')
    sh.obj('ledger_burned', ledger_burned(), [0, 1], [[0, 0]], 1, note='the burned ledger on a stand (`ledger_obj`)')
    sh.obj('bellows_decor', bellows_decor(), [0, 1], [[0, 0], [1, 0]], 1, note='decor bellows')
    sh.obj('tool_rack', tool_rack(), [0, 1], [[0, 0], [1, 0]], 1, note='decor tool rack')
    sh.newline()
    for oid, fn in (('pipes_h', pipe_h), ('pipes_v', pipe_v), ('pipes_elbow', pipe_elbow), ('pipes_valve', pipe_valve)):
        sh.obj(oid, fn(), [0, 1], [[0, 0]], 0, kind='piece', note='decor pipe, drawn over a wall face')
    put_frames(sh, 'furnace_mouth', [furnace_mouth(i) for i in range(3)], [0, 1], [[0, 0], [1, 0]], kind='piece',
               anim_ms=150, light={'color': '#e06b39', 'radius': 4.0}, note='furnace mouth set in a face (gives light)')
    sh.newline()
    put_frames(sh, 'font_cistern', [font_cistern(i) for i in range(3)], [0, 1], [[0, 0], [1, 0]], anim_ms=260,
               note='the cistern font (rest and save)')
    ol = [ore_lift(False), ore_lift(True)]
    sh.obj('ore_lift_closed', ol[0], [0, 1], [[0, 0], [1, 0]], 0, kind='door',
           note='lift door, closed (set into a 2-tile wall face)')
    sh.obj('ore_lift_open', ol[1], [0, 1], [], 0, door=[0, 0], kind='door', note='lift door, open (the car waits)')
    sh.newline()
    bg = [bell_gate(i) for i in range(5)]
    put_frames(sh, 'bell_gate', bg, [0, 2], [[0, 0], [1, 0], [2, 0]], kind='door',
               note='the Bell Gate; frames by state: 0..3 = bell sockets lit, 4 = open (art only: use '
                    'bell_gate_open for the walkable doorway)')
    put_frames(sh, 'bell_gate_closed', bg[:4], [0, 2], [[0, 0], [1, 0], [2, 0]], kind='door',
               note='frames by state: 0..3 = sockets lit')
    sh.obj('bell_gate_open', bg[4], [0, 2], [], 0, door=[1, 0], kind='door')
    dc = [door_crucible(False), door_crucible(True)]
    put_frames(sh, 'door_crucible', dc, [0, 2], [[0, 0], [1, 0], [2, 0]], kind='door',
               note='the Crucible Hook door; frames by state: 0 = closed, 1 = open')
    sh.obj('door_crucible_closed', dc[0], [0, 2], [[0, 0], [1, 0], [2, 0]], 0, kind='door')
    sh.obj('door_crucible_open', dc[1], [0, 2], [], 0, door=[1, 0], kind='door')
    sh.newline()
    fans = [fan_great(0), fan_great(1), fan_great(2)]
    m = put_frames(sh, 'fan_great', fans, [0, 2], [[dx, dy] for dy in (-2, -1, 0) for dx in range(3)], kind='piece',
                   note='the great fan: frames 0 and 1 spin (`anim`), frame 2 = stopped')
    m['anim'] = {'frames': [0, 1], 'frameDx': 48, 'ms': 70}
    sh.newline()
    hf = [heartforge(i) for i in range(4)]
    m = put_frames(sh, 'heartforge', hf, [0, 4], [[dx, 0] for dx in range(6)], kind='piece',
                   note='the Heartforge, 6 x 5 tiles, in the north face; frames by state: 0 = roaring, 1 = banked; '
                        'roaring cycle = `roarAnim` (frames 0, 2, 3, 2)',
                   light={'color': '#e06b39', 'radius': 7.0})
    m['roarAnim'] = {'frames': [0, 2, 3, 2], 'frameDx': 96, 'ms': 140}
    sh.newline()
    # splash puddle decal (tile, translucent)
    pf = [splash_puddle(i) for i in range(3)]
    x, y = sh.alloc(48, 16)
    sh.cv.paste(strip(pf), x, y)
    sh.meta['tiles']['splash_puddle'] = {'x': x, 'y': y, 'w': 16, 'h': 16, 'collision': 'none',
                                         'anim': {'frames': [0, 1, 2], 'frameDx': 16, 'ms': 200},
                                         'note': 'decal on a non-flow cell where water stops (EPISODE3_PLAN 5.1)'}
    sh.newline()
