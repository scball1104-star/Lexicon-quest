"""Court of Mirrors props, mechanism pieces, doors and decals -> court.png (E2-tiles, EPISODE2_PLAN 5.1 and 9.1).

State art: an object with several looks carries "frames": [[x, y, w, h], ...] indexed by the event's state
(the props.json convention), and its rect is frames[0]. mirror_stand / mirror_heavy: 0 = '/', 1 = '\\'.
receptor / receptor_wall: 0 = dark, 1 = lit. door_vow: 0..3 = crystals lit, 4 = open. mirror_tall: 0 = dull,
1 = active. mirror_great: 0 = whole (the town in the glass), 1 = shattered, 2 = empty frame. Animated pieces
(beam_window, beam_lens, font_silver) use "anim" like the Archive candelabra.

Light: top-left. Glass is a night-blue to ice ramp with a diagonal white sheen; silver is stone_cool 3..5 and
metal 3..4. Translucent pixels are glows and cast shadows (the renderer composites them).
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc
from court_kit import K, MT, ICE, WA, RB, CY, VI, CP, INK, GD

SIL = [K(1), K(2), K(3), K(4), K(5), MT(3), MT(4)]        # silver ramp 0..6


def glow(c, a):
    return (c[0], c[1], c[2], a)


def ellipse(cv, cx, cy, rx, ry, fn):
    """Fill an ellipse; fn(dx, dy, d) -> colour or None (dx, dy normalised -1..1, d = radius 0..1)."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = math.sqrt(dx * dx + dy * dy)
            if d <= 1.0:
                c = fn(dx, dy, d)
                if c is not None:
                    cv.put(x, y, c)


def shadow_row(cv, x0, x1, y, a=80):
    for x in range(x0, x1 + 1):
        cv.put(x, y, SH(a))


def glass(gx, gy, w, h, tint='blue', streak=True):
    """Glass interior colour at (gx, gy) of a w x h pane: dark top, lighter low, a diagonal sheen."""
    t = gy / max(1, h - 1)
    if tint == 'blue':
        ramp = [RB(1), RB(2), RB(3), ICE(0), ICE(1)]
    elif tint == 'violet':
        ramp = [CP(1), CP(2), CP(3), VI(1), VI(2)]
    elif tint == 'dark':
        ramp = [INK(0), INK(1), INK(2), INK(2), INK(3)]
    else:  # frost
        ramp = [K(3), K(4), ICE(1), ICE(2), ICE(2)]
    i = t * (len(ramp) - 1)
    k = int(i)
    f = i - k
    col = ramp[min(k, len(ramp) - 1)]
    if k + 1 < len(ramp) and f > 0.5 and (gx + gy) % 2 == 0:
        col = ramp[k + 1]
    if streak:
        s = gx + gy * 0.5 - w * 0.35
        if 0 <= s < 1.6:
            col = WHITE if gy < h * 0.6 else ICE(2)
        elif 2.6 <= s < 3.4:
            col = ICE(2) if tint != 'dark' else INK(3)
    return col


# ====================================================================== the beam mechanism
def mirror_panel(cv, slope, x0=2, x1=13, ybot0=27, rise=5, hgt=15, heavy=False):
    """A mirror plate standing on the floor at 45 degrees, seen in 3/4: vertical sides, top and bottom edges
    slanted. slope '/' rises to the right, '\\' falls."""
    n = x1 - x0
    for x in range(x0, x1 + 1):
        f = (x - x0) / n
        yb = round(ybot0 - rise * f) if slope == '/' else round(ybot0 - rise * (1 - f))
        yt = yb - hgt
        for y in range(yt, yb + 1):
            gx, gy = x - x0, y - yt
            edge_t, edge_b = y == yt, y == yb
            edge_l, edge_r = x == x0, x == x1
            if heavy:
                if edge_t or edge_l:
                    col = GD(3) if (edge_t and edge_l) else K(3)
                elif edge_b or edge_r:
                    col = K(1)
                elif y == yt + 1 or x == x0 + 1:
                    col = K(2)
                elif y == yb - 1 or x == x1 - 1:
                    col = K(1)
                else:
                    col = glass(gx - 2, gy - 2, n - 3, hgt - 3, 'blue')
            else:
                if edge_t:
                    col = MT(4) if x < x1 - 2 else MT(3)
                elif edge_l:
                    col = MT(3)
                elif edge_b:
                    col = K(2)
                elif edge_r:
                    col = K(3)
                else:
                    col = glass(gx - 1, gy - 1, n - 1, hgt - 1, 'blue')
            cv.set(x, y, col)
        # the plate's thickness under its lower edge
        cv.set(x, yb + 1, K(1) if not heavy else DARK)
    return cv


def mirror_stand(slope):
    """A turnable mirror: a silver-framed plate held in a fork on a short post over a round pivot plinth
    (16 x 32, 1 tile). The plate's slant shows its state at a glance: '/' rises to the right, '\' falls."""
    cv = Canvas(16, 32)
    # cast shadow and pivot plinth
    ellipse(cv, 9.5, 29.6, 6.8, 2.2, lambda dx, dy, d: SH(70) if d > 0.0 else None)
    ellipse(cv, 8, 28.0, 6.0, 2.6, lambda dx, dy, d: SIL[5] if dy < -0.4 else (SIL[3] if dy < 0.35 else SIL[1]))
    for x in range(3, 13):
        if cv.get(x, 28)[3] == 255 and x in (4, 8, 11):
            cv.set(x, 27, MT(4))
    # post and fork
    for y in range(22, 28):
        cv.set(7, y, MT(3))
        cv.set(8, y, K(3))
    mirror_panel(cv, slope, 2, 13, 23, 5, 13)
    hx = 13 if slope == '/' else 2
    top = min(y for y in range(32) if cv.get(hx, y)[3] == 255)
    cv.set(hx, top - 1, MT(4))
    return cv


def mirror_heavy(slope):
    """The heavy mirror (Shove): a broad plate in a dark iron frame with gold corners on a square stone block."""
    cv = Canvas(16, 32)
    # stone block base
    for y in range(24, 31):
        for x in range(1, 15):
            if y == 24:
                c = K(4)
            elif y < 27:
                c = K(3) if x < 14 else K(2)
            else:
                c = K(2) if x < 14 else K(1)
            if x in (1, 14):
                c = K(1)
            cv.set(x, y, c)
    for x in range(1, 15):
        cv.set(x, 31, K(0))
    for (x, y) in ((3, 28), (12, 28)):
        cv.set(x, y, MT(3))
        cv.set(x, y + 1, K(1))
    for y in range(25, 32):
        cv.put(15, y, SH(90))
    mirror_panel(cv, slope, 1, 14, 25, 5, 18, heavy=True)
    return cv


def beam_window(frame):
    """The beam source in a north face (16 x 32 piece): a moon window of pale glass with a prism at its sill
    that sends the light south. Three frames: the glint walks round the prism."""
    cv = Canvas(16, 32)
    # silver frame, arched
    for y in range(2, 28):
        for x in range(1, 15):
            dx = x + 0.5 - 8
            if y < 9 and dx * dx + ((9 - y) * 1.2) ** 2 > 42:
                continue
            ring = y < 9 and dx * dx + ((9 - y) * 1.2) ** 2 > 22
            side = x in (1, 2, 13, 14)
            if ring or side or y in (2, 25, 26, 27):
                c = MT(3) if (x < 8 and not y >= 25) or y == 2 else K(4)
                if x == 14 or y == 27:
                    c = K(2)
                cv.set(x, y, c)
            else:
                # moonlit glass: pale, with the moon's disc
                gy = y - 4
                c = ICE(2) if gy < 8 else (ICE(1) if gy < 15 else ICE(0))
                if (x + y) % 2 == 0 and gy in (7, 8, 14, 15):
                    c = ICE(1) if gy < 10 else ICE(0)
                md = (x + 0.5 - 6) ** 2 + (y + 0.5 - 9) ** 2
                if md < 7:
                    c = WHITE if md < 4 else ICE(3)
                cv.set(x, y, c)
    # mullion cross
    for y in range(9, 25):
        if cv.get(8, y)[3]:
            cv.set(8, y, K(4) if y % 5 else MT(3))
    for x in range(3, 13):
        cv.set(x, 16, K(4) if x != 8 else MT(3))
    # the prism on the sill, throwing light down
    cv.stamp(['..w..', '.wWh.', 'wWWhh', '.hhc.', '..c..'], 6, 22, {'w': WHITE, 'W': ICE(3), 'h': ICE(2), 'c': CY(3)})
    g = [(6, 23), (10, 24), (8, 26)][frame % 3]
    cv.set(g[0], g[1], WHITE)
    for k, y in enumerate(range(27, 32)):
        a = [150, 120, 90, 60, 36][k]
        cv.put(8, y, glow(ICE(3), a))
        cv.put(7, y, glow(CY(3), a // 2))
        cv.put(9, y, glow(CY(3), a // 2))
    return cv


def beam_lens(frame):
    """A beam source on a pedestal (16 x 32 prop): a crystal lens in a silver ring on a slim stone column."""
    cv = Canvas(16, 32)
    for y in range(17, 30):
        w = 3 if 19 <= y <= 27 else 5
        for x in range(8 - w, 8 + w):
            c = K(4) if x < 8 else K(3)
            if y in (17, 28):
                c = K(5)
            if x == 8 - w:
                c = K(5) if y < 28 else K(2)
            if x == 8 + w - 1:
                c = K(2)
            cv.set(x, y, c)
    for x in range(2, 14):
        cv.set(x, 29, K(2))
        cv.put(x + 1, 30, SH(90))
    # the ring and the lens
    ellipse(cv, 8, 11, 6, 6, lambda dx, dy, d: (MT(3) if dx + dy < 0 else K(3)) if d > 0.72 else None)
    ellipse(cv, 8, 11, 4.4, 4.4, lambda dx, dy, d: WHITE if (dx + 0.35) ** 2 + (dy + 0.35) ** 2 < 0.12 else
            (ICE(3) if d < 0.5 else (ICE(2) if dx + dy < 0.4 else CY(3))))
    for x in (6, 7, 8, 9, 10):
        cv.set(x, 17, K(5) if x < 8 else K(4))
    sp = [(3, 5), (12, 6), (13, 15)][frame % 3]
    cv.put(sp[0], sp[1], WHITE)
    for (x, y) in ((2, 11), (14, 11), (8, 4)):
        cv.put(x, y, glow(ICE(3), 110 if frame % 3 == (x % 3) else 60))
    return cv


def receptor(lit):
    """A crystal receptor on a pedestal (16 x 32 prop): a stone column with a silver collar, a big faceted crystal
    held in four prongs. Dark: the crystal is dull grey-blue. Lit: it blazes white-cyan inside a soft halo."""
    cv = Canvas(16, 32)
    # base plinth and column
    for y in range(26, 31):
        for x in range(2, 14):
            c = K(4) if y == 26 else (K(3) if x < 12 else K(2))
            if x == 2:
                c = K(5) if y < 29 else K(3)
            cv.set(x, y, c)
    for x in range(2, 14):
        cv.set(x, 31, K(1))
        cv.put(x + 1, 31, SH(60))
    for y in range(18, 26):
        for x in range(5, 11):
            c = K(4) if x < 7 else (K(3) if x < 10 else K(2))
            if x == 5:
                c = K(5)
            cv.set(x, y, c)
    for x in range(4, 12):
        cv.set(x, 17, MT(3) if x < 9 else K(4))
        cv.set(x, 18, K(3))
    if lit:
        ellipse(cv, 8, 9, 8, 8.5, lambda dx, dy, d: glow(CY(3), int(120 * (1 - d) ** 1.2)) if d > 0.4 else None)
    crys = ['....a....',
            '...aWb...',
            '..aWWbb..',
            '.aWWWbbc.',
            '.aWWbbbc.',
            'aWWbbbbcc',
            '.abbbbcc.',
            '..abbcc..',
            '...bcc...',
            '....c....']
    if lit:
        cmap = {'a': ICE(3), 'W': WHITE, 'b': ICE(2), 'c': CY(3)}
    else:
        cmap = {'a': K(5), 'W': MT(3), 'b': RB(3), 'c': RB(2)}
    cv.stamp(crys, 4, 5, cmap)
    for (x, y) in ((3, 13), (3, 14), (12, 13), (12, 14), (5, 16), (10, 16)):
        cv.set(x, y, MT(3) if x < 8 else K(3))
    if lit:
        for (x, y) in ((8, 1), (1, 9), (15, 8)):
            cv.put(x, y, WHITE)
    return cv


def receptor_wall(lit):
    """A crystal receptor set in a wall face (16 x 32 piece): a silver rosette holding a crystal eye."""
    cv = Canvas(16, 32)
    if lit:
        ellipse(cv, 8, 14, 8, 8, lambda dx, dy, d: glow(CY(3), int(120 * (1 - d) ** 1.3)) if d > 0.5 else None)
    ellipse(cv, 8, 14, 6, 6.5, lambda dx, dy, d: (MT(3) if dx + dy < -0.2 else (K(4) if dx + dy < 0.5 else K(2)))
            if d > 0.62 else None)
    for k in range(8):
        a = k * math.pi / 4
        x, y = round(8 + math.cos(a) * 6.6 - 0.5), round(14 + math.sin(a) * 7.0 - 0.5)
        cv.set(x, y, MT(4) if math.cos(a) + math.sin(a) < 0 else K(3))
    def eye(dx, dy, d):
        if lit:
            if (dx + 0.3) ** 2 + (dy + 0.3) ** 2 < 0.1:
                return WHITE
            return ICE(3) if d < 0.45 else (ICE(2) if dx + dy < 0.3 else CY(3))
        if (dx + 0.3) ** 2 + (dy + 0.3) ** 2 < 0.1:
            return K(5)
        return RB(3) if d < 0.45 else (RB(2) if dx + dy < 0.3 else RB(1))
    ellipse(cv, 8, 14, 3.6, 4.2, eye)
    if lit:
        for (x, y) in ((8, 4), (1, 14), (15, 13), (8, 25)):
            cv.put(x, y, glow(WHITE, 170))
    # the bracket tail under the rosette
    for y in range(21, 25):
        cv.set(7, y, MT(3))
        cv.set(8, y, K(3))
    cv.set(7, 25, K(2))
    cv.set(8, 25, K(1))
    return cv


# ====================================================================== bridges, slots, inlays
def glass_bridge(orient, state):
    """A light bridge over a void. dim: a faint glass rail (dotted ice outline, ribs), so the player sees there
    is something to light; lit: a solid deck of glowing glass (lit near edge, cyan far edge, panes every 8 px)
    with a soft glow on the void either side. 'v' is the transpose."""
    cv = Canvas(16, 16)

    def P(i, j, c):
        x, y = (i, j) if orient == 'h' else (j, i)
        cv.put(x, y, c)

    if state == 'dim':
        # W11 (CRITIQUE_4 item 7): the waiting bridge must show where it will form. A pale glass deck at about a
        # quarter strength between two continuous faint rails, a pane seam every 8 px, a silver rail post at the
        # head of each cell and one diagonal glint, so a dim bridge reads as glass over the void, not as nothing.
        for i in range(16):
            for j in range(4, 12):
                P(i, j, glow(ICE(1) if i % 8 == 7 else ICE(2), 92 if i % 8 == 7 else 64))
            P(i, 3, glow(ICE(3), 150))
            P(i, 12, glow(ICE(1), 140))
            g = i - 2
            if 4 <= g <= 11:
                P(i, g, glow(WHITE, 96))
        for j in (2, 3, 12, 13):
            P(0, j, MT(3) if j in (2, 12) else K(4))
        return cv
    for i in range(16):
        for j in range(3, 13):
            if j == 3:
                c = WHITE if i % 8 != 7 else ICE(2)
            elif j == 4:
                c = ICE(3)
            elif j == 12:
                c = CY(1)
            elif j == 11:
                c = CY(2)
            elif i % 8 == 7:
                c = ICE(1)
            else:
                c = ICE(2)
                if (i + j * 2) % 13 == 0:
                    c = ICE(3)
                if j in (6, 7) and (i % 8) in (1, 2):
                    c = WHITE
            P(i, j, c)
    for i in range(16):
        for j, a in ((2, 90), (1, 50), (0, 24), (13, 80), (14, 44), (15, 20)):
            if a < 50 and (i + j) % 2:
                continue
            P(i, j, glow(CY(3), a))
    return cv


def glass_slot():
    """A wall-top cell the beam passes and walkers cannot: a block of clear glass set into the cap in a silver
    frame (top view, 16 x 16). Silver frame, so it sits on any of the three wall bands."""
    cv = Canvas(16, 16)
    for y in range(1, 15):
        for x in range(1, 15):
            if y in (1, 2) or x in (1, 2):
                c = MT(3) if (y == 1 or x == 1) else K(4)
            elif y in (13, 14) or x in (13, 14):
                c = K(2) if (y == 14 or x == 14) else K(3)
            else:
                gy = y - 3
                c = RB(2) if gy < 3 else (RB(3) if gy < 6 else ICE(0))
                if (x + y) % 2 == 0 and gy in (2, 5):
                    c = RB(3) if gy == 2 else ICE(0)
                s = (x - 3) + (y - 3) * 0.6
                if 2 <= s < 3.2:
                    c = ICE(3)
                elif 4.5 <= s < 5.2:
                    c = ICE(1)
            cv.set(x, y, c)
    for x in range(1, 16):
        cv.put(x, 15, SH(70))
    return cv


def glass_slot_face():
    """The same slot where it crosses a wall face (16 x 16 face piece): a clear pane in a silver frame."""
    cv = Canvas(16, 16)
    for y in range(16):
        for x in range(2, 14):
            if x in (2, 3):
                c = MT(3) if x == 2 else K(4)
            elif x in (12, 13):
                c = K(3) if x == 12 else K(2)
            else:
                c = glass(x - 4, y, 8, 16, 'blue')
            cv.set(x, y, c)
    return cv


INLAY_SHAPES = {'h': ('E', 'W'), 'v': ('N', 'S'), 'corner_ne': ('N', 'E'), 'corner_nw': ('N', 'W'),
                'corner_se': ('S', 'E'), 'corner_sw': ('S', 'W')}


def inlay(kind, lit=False):
    """Silver inlay line let into the floor (decal, 16 x 16). Straight pieces run edge to edge through the
    tile centre; corner_<a><b> joins the two named sides with a rounded turn. Lit: the line glows."""
    cv = Canvas(16, 16)
    core = WHITE if lit else MT(3)
    mid = ICE(3) if lit else K(5)
    lo = CY(2) if lit else K(2)
    if kind == 'socket':
        def ring(dx, dy, d):
            if d > 0.78:
                return mid if dx + dy < 0 else lo
            if d > 0.56:
                return core if dx + dy < 0.2 else mid
            if d > 0.42:
                return lo
            return None
        if lit:
            ellipse(cv, 8, 8, 7.8, 7.8, lambda dx, dy, d: glow(CY(3), int(70 * (1 - d))) if d > 0.8 else None)
        ellipse(cv, 8, 8, 6.5, 6.5, ring)
        for (x, y) in ((8, 1), (8, 14), (1, 8), (14, 8)):
            cv.set(x, y, core)
            cv.set(x - 1 if x > 7 else x, y, mid)
        return cv
    a, b = INLAY_SHAPES[kind]
    for y in range(16):
        for x in range(16):
            px, py = x + 0.5, y + 0.5
            if kind == 'h':
                o, nx, ny = py - 8, 0.0, 1.0
            elif kind == 'v':
                o, nx, ny = px - 8, 1.0, 0.0
            else:
                cx = 16 if 'E' in (a, b) else 0
                cy = 0 if 'N' in (a, b) else 16
                r = math.hypot(px - cx, py - cy)
                if r < 1e-6:
                    continue
                o, nx, ny = r - 8, (px - cx) / r, (py - cy) / r
            # W11 (CRITIQUE_4 item 7): a flush line let into the glass, not a raised tube: one px of silver (or
            # light) with a one px highlight on its up-left side; lit, a dithered cyan glow either side.
            if -1 <= o < 0:
                c = CY(3) if lit else K(5)
            elif -2 <= o < -1:
                c = WHITE if lit else MT(3)
            elif lit and abs(o) < 3 and (x + y) % 2 == 0:
                cv.put(x, y, glow(CY(3), 60))
                continue
            else:
                continue
            cv.set(x, y, c)
    return cv


# ====================================================================== glass panes (Dash Strike)
def glass_pane(broken):
    """A cracked glass pane in a wall face (16 x 32 face overlay; solid) and the same pane smashed open (none)."""
    cv = Canvas(16, 32)
    if broken:
        for y in range(4, 32):
            for x in range(2, 14):
                cv.set(x, y, DARK if y > 8 else INK(1))
        shards = [(2, 4, 4, 9), (11, 4, 13, 7), (2, 18, 3, 24), (12, 14, 13, 21)]
        for (x0, y0, x1, y1) in shards:
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    if (x - x0) + (y - y0) * 0.5 < (x1 - x0) + 1:
                        cv.set(x, y, ICE(1) if (x + y) % 3 else ICE(2))
        for x in range(1, 15):
            cv.set(x, 3, MT(3) if x < 8 else K(4))
            cv.set(x, 30, K(3) if x % 3 else ICE(2))
            cv.set(x, 31, K(1))
        for y in range(3, 31):
            cv.set(1, y, MT(3))
            cv.set(14, y, K(2))
        for (x, y) in ((5, 29), (9, 30), (11, 29)):
            cv.set(x, y, ICE(2))
        return cv
    for y in range(3, 31):
        for x in range(1, 15):
            if y == 3 or x == 1:
                c = MT(3)
            elif y == 30 or x == 14:
                c = K(2)
            elif y == 4 or x == 2:
                c = K(4)
            else:
                c = glass(x - 3, y - 5, 11, 25, 'frost', streak=False)
            cv.set(x, y, c)
    # crack web from an impact point
    ox, oy = 9, 15
    for ang, L in ((0.3, 7), (1.4, 9), (2.6, 7), (3.5, 6), (4.4, 10), (5.4, 7)):
        for k in range(1, L):
            x = round(ox + math.cos(ang) * k + math.sin(k * 1.7) * 0.4)
            y = round(oy + math.sin(ang) * k * 1.4)
            if 3 <= x <= 12 and 5 <= y <= 28:
                cv.set(x, y, K(2) if k % 3 else DARK)
                if cv.get(x, y - 1)[3] and y - 1 > 4:
                    cv.set(x, y - 1, WHITE if k < 3 else ICE(3))
    cv.set(ox, oy, WHITE)
    return cv


def glass_pane_top(broken):
    """The same breakable seen from above, where it sits in a wall band (16 x 16)."""
    cv = Canvas(16, 16)
    if broken:
        for y in range(16):
            for x in range(1, 15):
                cv.set(x, y, DARK if 3 < y < 13 else INK(1))
        for (x, y) in ((1, 2), (2, 3), (14, 4), (13, 12), (1, 13), (3, 14)):
            cv.set(x, y, ICE(1))
        return cv
    cv.paste(glass_slot(), 0, 0)
    ox, oy = 8, 8
    for ang, L in ((0.4, 5), (1.9, 5), (3.1, 6), (4.3, 5), (5.5, 5)):
        for k in range(1, L):
            x, y = round(ox + math.cos(ang) * k), round(oy + math.sin(ang) * k)
            if 3 <= x <= 12 and 3 <= y <= 12:
                cv.set(x, y, DARK if k % 2 else K(2))
    cv.set(ox, oy, WHITE)
    return cv


# ====================================================================== doors and stairs
def arch_frame(cv, W, H, spring, ramp='silver', inner=3.5):
    """Silver stone arch frame for a door set into a 2-row face. Returns (cx, ring radius, spring)."""
    cx = W / 2
    r_out = W / 2 - 1
    ring = r_out - inner
    for y in range(H):
        for x in range(W):
            dx = x + 0.5 - cx
            inside = y >= spring or (dx * dx + (y - spring) ** 2 <= r_out * r_out)
            if not inside:
                continue
            opening = (abs(dx) < ring and y >= spring) or (dx * dx + (y - spring) ** 2 <= ring * ring)
            if opening:
                continue
            if ramp == 'silver':
                c = K(5) if dx < 0 else K(4)
                if y < spring and (int(math.degrees(math.atan2(y - spring, dx))) // 22) % 2 == 0:
                    c = MT(3) if dx < 0 else K(5)
                if y >= spring and (y - spring) % 7 == 6:
                    c = K(3)
            else:
                c = K(2) if dx < 0 else K(1)
                if y < spring and (int(math.degrees(math.atan2(y - spring, dx))) // 22) % 2 == 0:
                    c = K(3) if dx < 0 else K(2)
                if y >= spring and (y - spring) % 7 == 6:
                    c = K(0)
            cv.set(x, y, c)
    return cx, ring


def in_opening(x, y, cx, ring, spring):
    dx = x + 0.5 - cx
    return (abs(dx) < ring and y >= spring) or (dx * dx + (y - spring) ** 2 <= ring * ring)


def door_glass(kind, opened):
    """32 x 32 doors set into a face. kind 'key': a frosted glass door, leaded panes, a silver lock plate with
    the glass key's mark (opened by a glass_key). kind 'gate': rods of glass and a crystal seal (opened by a
    lit receptor). Open: the dark doorway."""
    W, H = 32, 32
    cv = Canvas(W, H)
    spring = H - 8 - 15
    cx, ring = arch_frame(cv, W, H, spring)
    for y in range(H):
        for x in range(W):
            if not in_opening(x, y, cx, ring, spring):
                continue
            dx = x + 0.5 - cx
            if opened:
                c = DARK if y > spring - 4 else INK(1)
                if y > H - 5:
                    c = INK(1)
                cv.set(x, y, c)
                continue
            if kind == 'key':
                gx = int(dx + ring)
                c = glass(gx % 6, y - 2, 6, H - 4, 'frost', streak=False)
                if gx % 6 == 0:
                    c = K(3)
                if (y - spring) in (3, 12) or abs(dx) < 0.6:
                    c = K(3) if dx < 0 else K(2)
                if (gx % 6 == 2) and (y + gx) % 9 == 0:
                    c = WHITE
                cv.set(x, y, c)
            else:
                c = DARK
                k = int(dx + ring) % 5
                if k in (1, 2, 3):
                    c = [ICE(2), ICE(1), RB(3)][k - 1]
                    if (y + k) % 11 == 0:
                        c = WHITE
                if (y - spring) in (1, 14):
                    c = K(4) if (y - spring) == 1 else K(3)
                cv.set(x, y, c)
    if not opened:
        if kind == 'key':
            cv.stamp(['.kkkk.', 'kMMMMk', 'kMddMk', 'kMMdMk', 'kMMdMk', '.kkkk.'], int(cx) - 3, H - 16,
                     {'k': K(2), 'M': MT(3), 'd': RB(2)})
            cv.set(int(cx) - 2, H - 15, WHITE)
        else:
            sx, sy = int(cx) - 3, spring + 4
            cv.stamp(['..c..', '.cWc.', 'cWWhc', '.chc.', '..c..'], sx + 1, sy,
                     {'c': K(2), 'W': ICE(3), 'h': CY(3)})
            for (x, y) in ((sx, sy + 2), (sx + 6, sy + 2)):
                cv.set(x, y, MT(3))
    for x in range(W):
        cv.set(x, H - 1, K(2))
    return cv


def door_vow(state):
    """The Vow Door (32 x 48): a tall silver arch, black glass leaves with silver vines, three crystals set in
    the tympanum that light one by one (state 0..3); state 4 = open (all three blazing)."""
    W, H = 32, 48
    cv = Canvas(W, H)
    spring = 22
    cx, ring = arch_frame(cv, W, H, spring, inner=4.0)
    opened = state == 4
    lit = 3 if opened else state
    for y in range(H):
        for x in range(W):
            if not in_opening(x, y, cx, ring, spring):
                continue
            dx = x + 0.5 - cx
            if y < spring - 2:
                # tympanum: dark slate behind the crystals
                c = K(1) if (x + y) % 5 else K(2)
                cv.set(x, y, c)
                continue
            if opened:
                cv.set(x, y, DARK if y < H - 4 else INK(1))
                continue
            leaf_x = dx + ring if dx < 0 else dx           # 0.. across each leaf
            lw = ring
            c = INK(1) if dx < 0 else INK(0)
            if abs(dx) < 0.6:
                c = K(4)
            elif abs(leaf_x - 1.5) < 0.6 or abs(leaf_x - (lw - 1.5)) < 0.6 or (y - spring) in (2, H - spring - 4):
                c = K(3) if dx < 0 else K(2)
            elif (y - spring) == 12 and 2 < leaf_x < lw - 2:
                c = K(3)
            else:
                sv = leaf_x + (y - spring) * 0.4
                if 6.0 <= sv < 7.2 and (y - spring) < 12:
                    c = INK(3) if dx < 0 else INK(2)
                elif 8.0 <= sv < 8.6 and (y - spring) < 11:
                    c = INK(2)
            cv.set(x, y, c)
    # divider ledge between tympanum and leaves
    for x in range(W):
        if cv.get(x, spring - 2)[3]:
            cv.set(x, spring - 2, MT(3) if x < cx else K(4))
            cv.set(x, spring - 1, K(2))
    # three crystals in an arc. W11 (CRITIQUE_4 item 7): each sits in a clear dark socket ringed in silver, the
    # crystal a 5 x 5 diamond: dull slate while waiting, white-cyan with a halo when its vow is kept, so the
    # door's progress (one, two, three) reads from across the room.
    for k, (px, py) in enumerate(((9, 13), (16, 8), (23, 13))):
        on = k < lit
        ellipse(cv, px, py, 3.6, 3.6, lambda dx, dy, d: (MT(3) if dx + dy < 0 else K(3)) if d > 0.78 else INK(0))
        if on:
            ellipse(cv, px, py, 5.6, 5.6, lambda dx, dy, d: glow(CY(3), int(150 * (1 - d))) if d > 0.62 else None)
        cmap = {'a': ICE(3) if on else K(4), 'W': WHITE if on else K(5), 'b': ICE(2) if on else RB(2),
                'c': CY(3) if on else RB(1), 'd': CY(2) if on else INK(2)}
        cv.stamp(['..a..', '.aWb.', 'aWbbc', '.bcd.', '..d..'], px - 2, py - 2, cmap)
    for x in range(W):
        cv.set(x, H - 1, K(2))
    return cv


def door_throne(opened):
    """The throne door (48 x 48, boss door in glass): a broad silver arch, tall leaves of violet glass with a
    silver crown in a roundel, gold studs. Open: the dark hall beyond."""
    W, H = 48, 48
    cv = Canvas(W, H)
    spring = 20
    cx, ring = arch_frame(cv, W, H, spring, inner=4.5)
    for y in range(H):
        for x in range(W):
            if not in_opening(x, y, cx, ring, spring):
                continue
            dx = x + 0.5 - cx
            if opened:
                cv.set(x, y, DARK if y > 8 else INK(1))
                continue
            gx = int(dx + ring)
            c = glass(gx % 9, y - 4, 9, H - 6, 'violet', streak=False)
            if (gx % 9) == 2 and (y - spring) % 9 in (2, 3, 4):
                c = VI(3)
            if gx % 9 == 0 or abs(dx) < 0.6:
                c = K(4) if dx < 0 else K(3)
            if (y - spring) % 9 == 0 and y > spring:
                c = K(3)
            cv.set(x, y, c)
    if not opened:
        # crown in a silver roundel across the two leaves
        ellipse(cv, cx, spring + 2, 8, 7, lambda dx, dy, d: (MT(3) if dx + dy < 0 else K(3)) if d > 0.8 else
                (CP(1) if d > 0.0 else None))
        cv.stamp(['m.m.m.m', 'mmmmmmm', 'MMMMMMM', 'mmmmmmm'], int(cx) - 3, spring, {'m': MT(3), 'M': GD(4)})
        cv.set(int(cx), spring - 1, WHITE)
        for y in range(spring + 12, H - 4, 8):
            cv.set(int(cx) - 8, y, GD(4))
            cv.set(int(cx) + 7, y, GD(4))
    for x in range(W):
        cv.set(x, H - 1, K(2))
    return cv


def stairs_glass_up():
    """32 x 32 silver archway in a face with pale glass steps rising into the dark."""
    cv = door_glass('gate', True)
    for k in range(5):
        y = 28 - k * 4
        for x in range(8 + k, 24 - k):
            cv.set(x, y, ICE(2) if k < 2 else (ICE(1) if k < 4 else RB(3)))
            cv.set(x, y + 1, K(4) if k < 2 else K(3))
            cv.set(x, y + 2, K(2) if k < 3 else INK(1))
        cv.set(8 + k, y, WHITE if k < 2 else ICE(2))
    return cv


def stairs_glass_down():
    """32 x 32 opening in the floor, silver-rimmed, glass steps going down north into the dark."""
    cv = Canvas(32, 32)
    for y in range(2, 30):
        for x in range(2, 30):
            cv.set(x, y, DARK)
    for k in range(6):
        y = 26 - k * 4
        shade = [ICE(2), ICE(1), RB(3), RB(2), RB(1), INK(1)][k]
        for x in range(4, 28):
            cv.set(x, y, shade)
            cv.set(x, y + 1, K(3) if k < 3 else INK(1))
        cv.set(4, y, WHITE if k < 2 else shade)
    for i in range(32):
        cv.set(i, 0, K(2)); cv.set(i, 1, MT(3))
        cv.set(0, i, K(2)); cv.set(1, i, MT(3))
        if i > 1:
            cv.set(2, i, K(4))
            cv.set(29, i, K(3))
        cv.set(31, i, K(1)); cv.set(30, i, K(3))
    for i in range(2, 30):
        cv.set(i, 30, K(5)); cv.set(i, 31, K(2))
    for x in range(2, 30):
        cv.set(x, 2, INK(1))
    return cv


# ====================================================================== fonts, throne, furniture
def font_silver(frame):
    """The silver font (32 x 32, rest and save): a wide silver basin on a fluted stem and a round step, the water
    in it glowing pale, a ripple that moves (3 frames)."""
    cv = Canvas(32, 32)
    # round step
    ellipse(cv, 16, 27.5, 13, 4, lambda dx, dy, d: K(4) if dy < -0.3 else (K(3) if dy < 0.4 else K(2)))
    for x in range(4, 29):
        cv.put(x + 2, 31, SH(80))
    # stem
    for y in range(17, 26):
        w = 3 if y < 23 else 4
        for x in range(16 - w, 16 + w):
            c = K(5) if x < 15 else (K(4) if x < 17 else K(3))
            if (x - 16) % 2 == 0 and y < 23:
                c = MT(3) if x < 16 else K(3)
            cv.set(x, y, c)
    # basin (outer bowl)
    ellipse(cv, 16, 13, 13, 6.5, lambda dx, dy, d: (MT(3) if dy < -0.2 and dx < 0.2 else
                                                    (K(5) if dy < 0.3 else (K(4) if dy < 0.7 else K(3)))))
    # bowl underside
    for x in range(5, 28):
        dx = (x + 0.5 - 16) / 11
        yb = 13 + int(6.5 * math.sqrt(max(0, 1 - dx * dx)))
        cv.set(x, yb, K(2))
        cv.set(x, yb - 1, K(3) if x > 16 else K(4))
    # rim and water
    ellipse(cv, 16, 11, 11.5, 4.2, lambda dx, dy, d: (MT(4) if dy > 0.5 else K(3)) if d > 0.8 else None)
    def water(dx, dy, d):
        r = (d * 3.0 - frame * 0.8) % 2.4
        if r < 0.5 and d > 0.25:
            return ICE(3)
        if dx < -0.2 and dy < -0.1 and d > 0.5:
            return CY(2)
        return ICE(2) if d < 0.6 else ICE(1)
    ellipse(cv, 16, 11, 9.4, 3.2, water)
    cv.set(13, 10, WHITE)
    for (x, y, a) in ((16, 4, 120), (11, 6, 70), (21, 5, 80)):
        cv.put(x, y - (frame % 2), glow(ICE(3), a))
    return cv


def throne_glass():
    """The empty glass throne (32 x 48): a tall back of pale glass rising to a pointed crest with two finials,
    a crown cut into it in dark glass, silver posts, a seat with a violet cushion, arms, on one step."""
    cv = Canvas(32, 48)
    # step
    for y in range(41, 47):
        for x in range(1, 31):
            c = K(5) if y == 41 else (K(4) if y < 44 else K(3))
            if x == 1:
                c = K(3)
            if x == 30:
                c = K(2)
            cv.set(x, y, c)
    for x in range(1, 31):
        cv.set(x, 47, K(1))
    # back panel (glass) between the posts
    for y in range(4, 31):
        for x in range(8, 24):
            dx = abs(x + 0.5 - 16)
            top = 4 + dx * 0.75
            if y < top:
                continue
            if y < top + 1.2:
                c = MT(4) if x < 16 else K(5)
            else:
                c = glass(x - 9, y - 6, 14, 24, 'frost', streak=False)
                if (x + y) % 9 == 0:
                    c = ICE(3)
            cv.set(x, y, c)
    # crown cut into the back
    cv.stamp(['d..d..d', 'dd.d.dd', 'ddddddd', 'DDDDDDD'], 13, 12, {'d': RB(2), 'D': RB(1)})
    cv.set(13, 11, ICE(3)); cv.set(16, 11, ICE(3)); cv.set(19, 11, ICE(3))
    # posts with finials
    for px in (6, 24):
        for y in range(3, 41):
            for x in range(px, px + 2):
                c = MT(3) if x == px else K(3)
                if y < 5:
                    c = MT(4) if x == px else K(4)
                cv.set(x, y, c)
        cv.set(px, 1, MT(4)); cv.set(px + 1, 1, K(4)); cv.set(px, 2, MT(3)); cv.set(px + 1, 2, K(3))
        cv.set(px, 0, ICE(3))
    # arms
    for side in (0, 1):
        x0 = 2 if side == 0 else 25
        for y in range(27, 37):
            for x in range(x0, x0 + 5):
                if y == 27:
                    c = MT(4) if side == 0 else K(5)
                elif y == 28:
                    c = K(5) if side == 0 else K(4)
                else:
                    c = K(4) if side == 0 else K(3)
                    if x == x0 + 4 - side * 4:
                        c = K(3) if side == 0 else K(2)
                if y > 34:
                    c = K(2)
                cv.set(x, y, c)
    # seat and cushion
    for y in range(30, 41):
        for x in range(8, 24):
            if y < 32:
                c = CP(4) if y == 30 else CP(3)
            elif y < 34:
                c = CP(2)
            elif y == 34:
                c = MT(3)
            else:
                c = K(4) if y < 38 else K(3)
            cv.set(x, y, c)
    for y in range(30, 47):
        cv.put(31, y, SH(80))
    return cv


def glass_bench():
    """A glass bench (32 x 32): a slab of pale glass on two silver legs."""
    cv = Canvas(32, 32)
    for y in range(18, 24):
        for x in range(2, 30):
            if y == 18:
                c = MT(4) if x < 26 else MT(3)
            elif y < 21:
                c = ICE(2) if (x + y) % 7 else WHITE
            elif y == 21:
                c = ICE(1)
            else:
                c = K(3)
            if x in (2, 29) and y > 18:
                c = K(4) if x == 2 else K(2)
            cv.set(x, y, c)
    for lx in (4, 25):
        for y in range(24, 30):
            for x in range(lx, lx + 3):
                cv.set(x, y, MT(3) if x == lx else (K(4) if x == lx + 1 else K(2)))
        cv.set(lx, 30, K(2)); cv.set(lx + 1, 30, K(2)); cv.set(lx + 2, 30, K(1))
    for x in range(3, 31):
        cv.put(x + 1, 30, SH(70))
        cv.put(x + 1, 31, SH(50))
    return cv


def mirror_tall(active):
    """A full-length standing mirror (16 x 48; a mirror door): a silver frame with a crest, on small feet.
    Dull: clouded grey-blue glass. Active: the glass shimmers white and violet, a doorway of light."""
    cv = Canvas(16, 48)
    for y in range(3, 45):
        for x in range(1, 15):
            if y < 7:
                dx = abs(x + 0.5 - 8)
                if dx > (y - 2) * 1.6 + 1:
                    continue
            frame = x in (1, 2, 13, 14) or y in (3, 4, 43, 44) or (y < 7 and abs(x + 0.5 - 8) > (y - 2) * 1.6 - 1)
            if frame:
                c = MT(3) if (x < 8 or y < 5) else K(3)
                if x == 2 or y == 4:
                    c = K(5)
                if x == 14 or y == 44:
                    c = K(2)
            else:
                gx, gy = x - 3, y - 7
                if active:
                    # a doorway of light: white heart, ice and violet ripples toward the frame
                    ex = abs(gx - 4.5) / 5.5
                    w = math.sin(gy * 0.7 - ex * 4.0)
                    if ex < 0.35:
                        c = WHITE if w > -0.6 else ICE(3)
                    elif ex < 0.7:
                        c = ICE(3) if w > 0.2 else (ICE(2) if w > -0.5 else VI(3))
                    else:
                        c = VI(3) if w > 0 else VI(2)
                else:
                    c = glass(gx, gy, 10, 36, 'frost', streak=False)
                    if c == ICE(2) and (gx + gy) % 3:
                        c = K(5)
                    s = gx + gy * 0.35
                    if 3 <= s < 4.2 and gy < 28:
                        c = K(5) if gy > 14 else MT(3)
            cv.set(x, y, c)
    # crest
    cv.stamp(['..m..', '.mWm.', 'mmmmm'], 6, 0, {'m': K(4), 'W': MT(4)})
    cv.set(8, 0, MT(3))
    # feet
    for (x, y) in ((2, 45), (3, 45), (12, 45), (13, 45), (2, 46), (13, 46)):
        cv.set(x, y, K(3))
    for x in range(2, 15):
        cv.put(x + 1, 47, SH(90))
    if active:
        for (x, y) in ((0, 18), (15, 24), (0, 33), (15, 12)):
            cv.put(x, y, glow(ICE(3), 140))
    return cv


def mirror_wall():
    """A tall wall mirror over a face (16 x 32 face overlay): a bright silver frame with a shell crest, the
    glass catching the room."""
    cv = Canvas(16, 32)
    for y in range(1, 30):
        for x in range(2, 14):
            if y < 5 and abs(x + 0.5 - 8) > (y + 1) * 1.4:
                continue
            frame = x in (2, 13) or y in (29,) or (y < 6 and abs(x + 0.5 - 8) > (y + 1) * 1.4 - 1.5)
            if frame:
                c = MT(4) if x < 8 else K(4)
                if x == 13 or y == 29:
                    c = K(2)
            elif x == 3 or x == 12:
                c = K(5) if x == 3 else K(3)
            else:
                c = glass(x - 4, y - 5, 8, 24, 'blue')
                if y > 23:
                    c = K(4) if (x + y) % 2 else K(3)
            cv.set(x, y, c)
    cv.set(8, 1, MT(4))
    cv.set(7, 2, MT(3))
    for x in range(3, 14):
        cv.put(x, 30, SH(80))
    return cv


def mirror_great(state):
    """The King's great mirror (96 x 80, 6 x 5 tiles, set in the throne room's north face). 0: whole, the
    Hollow reflected in it at dusk (roofs, the clocktower, the fountain, people). 1: shattered (a web of
    cracks, shards fallen out). 2: the empty frame (dark wall behind)."""
    W, H = 96, 80
    cv = Canvas(W, H)
    # ornate frame: silver with a crown crest on top
    fx0, fy0, fx1, fy1 = 4, 10, 91, 77
    for y in range(fy0, fy1 + 1):
        for x in range(fx0, fx1 + 1):
            d = min(x - fx0, fx1 - x, y - fy0, fy1 - y)
            if d < 5:
                c = [K(2), MT(3), K(5), K(4), K(2)][d]
                if d in (1, 2) and (x < fx0 + 3 or y < fy0 + 3):
                    c = MT(4) if d == 1 else MT(3)
                if d in (1, 2, 3) and (x > fx1 - 3 or y > fy1 - 3):
                    c = K(3) if d < 3 else K(2)
                if d == 2 and (x + y) % 6 == 0:
                    c = GD(3)
                cv.set(x, y, c)
    # crest
    cv.stamp(['....m.....m.....m....',
              '...mWm...mWm...mWm...',
              '..mmmmm.mmmmm.mmmmm..',
              '.mmmmmmmmmmmmmmmmmmm.',
              'mmmmmmmmmmmmmmmmmmmmm',
              '.kkkkkkkkkkkkkkkkkkk.'], 38, 3, {'m': K(5), 'W': MT(4), 'k': K(3)})
    for (x, y) in ((42, 4), (48, 4), (54, 4)):
        cv.set(x, y, GD(4))
    gx0, gy0, gx1, gy1 = fx0 + 5, fy0 + 5, fx1 - 5, fy1 - 5
    gw, gh = gx1 - gx0 + 1, gy1 - gy0 + 1
    if state == 2:
        for y in range(gy0, gy1 + 1):
            for x in range(gx0, gx1 + 1):
                cv.set(x, y, DARK if (x + y) % 9 else INK(1))
        for x in range(gx0, gx1 + 1):
            cv.set(x, gy0, INK(2))
        return cv
    # the reflected town at dusk
    for y in range(gy0, gy1 + 1):
        for x in range(gx0, gx1 + 1):
            ly = (y - gy0) / gh
            if ly < 0.55:
                c = [CP(2), CP(3), VI(1), VI(2), VI(3)][min(4, int(ly / 0.11))]
                if int(ly / 0.11) < 4 and (ly / 0.11) % 1 > 0.6 and (x + y) % 2:
                    c = [CP(3), VI(1), VI(2), VI(3), VI(3)][min(4, int(ly / 0.11))]
            elif ly < 0.62:
                c = K(4) if (x + y) % 2 else K(3)
            else:
                c = K(3) if (x // 6 + y // 3) % 2 else K(2)
            cv.set(x, y, c)
    hz = gy0 + int(gh * 0.55)
    # roofs and the clocktower silhouette
    houses = [(gx0 + 2, 12, 9), (gx0 + 16, 10, 7), (gx0 + 44, 14, 10), (gx0 + 60, 11, 8), (gx0 + 72, 10, 6)]
    for (hx, hw, hh) in houses:
        for y in range(hz - hh, hz):
            for x in range(hx, hx + hw):
                top = hz - hh + abs(x + 0.5 - (hx + hw / 2)) * 0.7
                if y < top:
                    continue
                c = RB(1) if y < hz - hh + 4 else K(1)
                if y > hz - hh + 4 and (x - hx) % 4 == 1 and (y - hz) % 3 == 1:
                    c = GD(4)
                cv.set(x, y, c)
    tx = gx0 + 30
    for y in range(hz - 24, hz):
        for x in range(tx, tx + 8):
            if y < hz - 20 and abs(x + 0.5 - (tx + 4)) > (y - (hz - 24)) * 1.0:
                continue
            cv.set(x, y, K(1) if x > tx + 1 else K(2))
    ellipse(cv, tx + 4, hz - 14, 2.6, 2.6, lambda dx, dy, d: MT(3) if d < 0.7 else K(4))
    # the fountain and people in the square
    ellipse(cv, gx0 + 40, hz + 8, 8, 2.5, lambda dx, dy, d: ICE(1) if d < 0.7 else K(5))
    cv.set(gx0 + 40, hz + 4, ICE(2)); cv.set(gx0 + 40, hz + 5, ICE(2))
    for k, (px, py) in enumerate(((10, 12), (22, 9), (28, 14), (55, 11), (62, 15), (70, 10), (16, 16), (48, 17))):
        x, y = gx0 + px, hz + py
        body = [CP(1), RB(1), WD_(1), CP(2)][k % 4]
        cv.set(x, y - 3, C('skin_light', 1))
        for j in range(-2, 2):
            cv.set(x, y + j, body)
            cv.set(x + 1, y + j, body)
        cv.set(x + 1, y - 3, C('skin_light', 2))
    # glass sheen over everything
    for y in range(gy0, gy1 + 1):
        for x in range(gx0, gx1 + 1):
            s = (x - gx0) + (y - gy0) * 0.6
            if 18 <= s < 20 or 23 <= s < 24:
                cv.put(x, y, glow(WHITE, 90 if s < 20 else 60))
    if state == 1:
        rng = [(48, 40)]
        ox, oy = 48, 42
        for k in range(14):
            ang = k / 14 * math.tau + 0.3
            L = 28 + h32(k, 61) % 22
            for i in range(2, L):
                x = round(ox + math.cos(ang) * i + math.sin(i * 0.4 + k) * 1.2)
                y = round(oy + math.sin(ang) * i * 0.8)
                if gx0 <= x <= gx1 and gy0 <= y <= gy1:
                    cv.set(x, y, DARK)
                    if gx0 <= x + 1 <= gx1 and i % 2:
                        cv.set(x + 1, y, WHITE if i < 10 else ICE(2))
        # fallen-out shards: dark holes
        for (sx, sy, r) in ((30, 30, 4), (62, 50, 5), (44, 58, 3), (70, 26, 3), (22, 56, 4)):
            ellipse(cv, gx0 + sx - 9, gy0 + sy - 15, r, r * 0.8, lambda dx, dy, d: DARK if d < 0.8 else INK(2))
    return cv


def WD_(i):
    return C('wood', i)


# ====================================================================== portraits (F2)
def portrait(kind):
    """32 x 32 face overlays: a gilt frame round a small painting.
    blank / blank_2 / blank_3: busts whose faces are smooth and blank (canon: you cannot remember the sitter).
    child: A Child at the River (a small boy at the mere's edge, a ferryman's hand reaching for him).
    keeper_empty: A Keeper in the Court (the frame is empty, the wall shows through).
    king: A King Without a Crown (a man in a long coat, his crown in his hand, a boy on his shoulders)."""
    cv = Canvas(32, 32)
    x0, y0, x1, y1 = 2, 2, 29, 29
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            d = min(x - x0, x1 - x, y - y0, y1 - y)
            if d < 3:
                c = [GD(1), GD(3), GD(2)][d]
                if d == 1 and (x < x0 + 2 or y < y0 + 2):
                    c = GD(4)
                if d == 1 and (x > x1 - 2 or y > y1 - 2):
                    c = GD(2)
                if d == 0 and (x + y) % 4 == 0:
                    c = GD(2)
                cv.set(x, y, c)
            elif kind != 'keeper_empty':
                cv.set(x, y, None)
    for x in range(x0 + 1, x1 + 2):
        cv.put(x, y1 + 1, SH(90))
    for y in range(y0 + 1, y1 + 2):
        cv.put(x1 + 1, y, SH(70))
    px0, py0, px1, py1 = x0 + 3, y0 + 3, x1 - 3, y1 - 3
    if kind == 'keeper_empty':
        # inner lip only, the wall behind shows; a paler rectangle where the canvas hung
        for x in range(px0, px1 + 1):
            cv.put(x, py0, SH(110))
            cv.put(x, py0 + 1, SH(60))
        for y in range(py0, py1 + 1):
            cv.put(px0, y, SH(90))
        cv.set(16, 1, GD(2))
        cv.set(16, 0, K(3))
        return cv
    # background
    for y in range(py0, py1 + 1):
        for x in range(px0, px1 + 1):
            ly = (y - py0) / (py1 - py0)
            if kind == 'child':
                c = [CP(2), VI(1), VI(2)][min(2, int(ly * 3.3))] if ly < 0.6 else (RB(2) if (x + y) % 3 else RB(3))
                if 0.58 <= ly < 0.64:
                    c = K(4)
            elif kind == 'king':
                c = CP(1) if ly < 0.7 else (CP(2) if (x + y) % 2 else CP(1))
            else:
                c = {'blank': INK(2), 'blank_2': CP(1), 'blank_3': RB(1)}[kind]
                if (x + y * 2) % 11 == 0:
                    c = INK(3) if kind == 'blank' else (CP(2) if kind == 'blank_2' else RB(2))
            cv.set(x, y, c)
    cx = (px0 + px1) // 2

    def bust(cx, top, coat, coat_lo, hair, skin=(K(5), K(4)), wide=7):
        # shoulders
        for y in range(top + 9, py1 + 1):
            w = min(wide + (y - top - 9), wide + 3)
            for x in range(cx - w, cx + w + 1):
                c = coat if x < cx + 2 else coat_lo
                if y == top + 9 and abs(x - cx) > w - 2:
                    continue
                cv.set(x, y, c)
        # blank face: a smooth pale oval, no features
        ellipse(cv, cx + 0.5, top + 5, 3.4, 4.2, lambda dx, dy, d: skin[0] if dx < 0.25 else skin[1])
        for x in range(cx - 3, cx + 5):
            cv.set(x, top, hair)
        cv.set(cx - 3, top + 1, hair)
        cv.set(cx + 4, top + 1, hair)
        cv.set(cx, top + 9, skin[1])
        cv.set(cx + 1, top + 9, skin[1])

    if kind == 'blank':
        bust(cx, py0 + 3, RB(2), RB(1), C('hair_brown', 2))
    elif kind == 'blank_2':
        bust(cx, py0 + 4, VI(1), CP(2), C('hair_brown', 3), wide=6)
        for y in range(py0 + 5, py0 + 12):
            cv.set(cx - 4, y, C('hair_brown', 3))
            cv.set(cx + 5, y, C('hair_brown', 2))
    elif kind == 'blank_3':
        bust(cx, py0 + 3, K(2), K(1), K(5))
        for x in range(cx - 1, cx + 3):
            cv.set(x, py0 + 10, K(5))
    elif kind == 'child':
        # the boy at the water's edge, the hand from the right
        bx, by = px0 + 8, py0 + 12
        cv.stamp(['.hh.', 'hssh', '.ss.', 'cccc', 'cccc', '.cc.', '.ll.', '.l.l'], bx, by,
                 {'h': C('hair_brown', 3), 's': C('skin_light', 2), 'c': RB(3), 'l': K(2)})
        cv.stamp(['....ss', '.sssss', 'ssss..', 'ooo...'], px1 - 6, by + 2,
                 {'s': C('skin_med', 2), 'o': C('wood', 2)})
        for x in range(px1 - 3, px1 + 1):
            cv.set(x, by + 5, C('wood', 1))
    elif kind == 'king':
        # the man in the long coat, a boy on his shoulders, the crown held low in his hand
        kx, ky = cx - 1, py0 + 9
        for y in range(ky + 6, py1 + 1):
            w = 3 + (y - ky - 6) // 3
            for x in range(kx - w, kx + w + 2):
                cv.set(x, y, K(3) if x < kx else K(2))
        ellipse(cv, kx + 0.5, ky + 3, 2.6, 3.0, lambda dx, dy, d: C('skin_light', 2) if dx < 0.3 else C('skin_light', 1))
        cv.set(kx - 1, ky, K(4)); cv.set(kx, ky, K(4)); cv.set(kx + 1, ky, K(4))
        # the boy
        bx, by = kx, ky - 5
        cv.stamp(['.h.', 'hsh', 'ccc', 'c.c'], bx - 1, by, {'h': C('hair_brown', 3), 's': C('skin_light', 2),
                                                            'c': RB(3)})
        # the crown in his hand
        hx, hy = kx + 6, ky + 13
        cv.stamp(['g.g.g', 'ggggg', 'GGGGG'], hx - 1, hy, {'g': GD(4), 'G': GD(3)})
        cv.set(hx - 2, hy + 3, C('skin_light', 1))
    return cv


def crowned_reflection():
    """Reflection-only decal for the F3 hub's black mirror floor (32 x 48): the crowned shape on the empty throne,
    upside down, faint violet. Translucent; collision none."""
    cv = Canvas(32, 48)
    col = VI(2)
    for y in range(48):
        for x in range(32):
            fy = y                      # upside down: the crown hangs at the bottom
            dx = abs(x + 0.5 - 16)
            a = 0
            if 8 <= fy < 30 and dx < 5 + (fy - 8) * 0.12:
                a = 70
            if 30 <= fy < 38 and (dx - 0.0) ** 2 + (fy - 34) ** 2 < 14:
                a = 80
            if 38 <= fy < 43 and dx < 5:
                a = 110 if (fy > 39 or int(dx) % 2 == 0) else 0
            if fy < 8 and dx < 9:
                a = 45
            if a and (x + y) % 2 == 0:
                a = int(a * 0.7)
            if a:
                cv.put(x, y, glow(col if fy < 38 else GD(3), a))
    return cv


# ====================================================================== assemble
def feather_black():
    """W11: a black feather lying on the bench (16 x 16, top view): a pale quill at the lower left, the vane black
    and deep indigo, a violet sheen along its upper edge, one white highlight on the shaft."""
    cv = Canvas(16, 16)
    x0, y0, x1, y1 = 1.5, 7.0, 14.5, 1.5           # lying along the bench's top (rows 1..8 of the tile)
    L = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    nx, ny = uy, -ux                                  # normal pointing up-left
    for y in range(16):
        for x in range(16):
            px, py = x + 0.5 - x0, y + 0.5 - y0
            t = (px * ux + py * uy) / L
            d = px * nx + py * ny
            if t < -0.02 or t > 1.02:
                continue
            w = 0 if t < 0.16 else 2.9 * math.sin(math.pi * min(1.0, (t - 0.16) / 0.9)) ** 0.7
            if abs(d) < 0.55:
                c = hexc('#b9b2cc') if t < 0.16 else hexc('#4a4064')
            elif abs(d) <= w:
                edge = abs(d) > w - 0.9
                if d > 0:
                    c = hexc('#7a58b8') if edge else (hexc('#2c2048') if (x + y) % 3 else hexc('#3a2a5e'))
                else:
                    c = hexc('#0e0b18') if edge else hexc('#1a1428')
            else:
                continue
            cv.set(x, y, c)
    cv.set(8, 4, WHITE)                                # the one highlight, mid shaft
    for x in range(3, 13):                             # a soft shadow on the glass, down-right of the vane
        y = int(round(y0 + (x + 0.5 - x0) * (y1 - y0) / (x1 - x0))) + 2
        if 0 <= y < 16 and not cv.get(x, y)[3]:
            cv.put(x, y, SH(60))
    return cv


def strip(frames):
    w, h = frames[0].w, frames[0].h
    s = Canvas(w * len(frames), h)
    for i, f in enumerate(frames):
        s.paste(f, i * w, 0)
    return s


def put_frames(sh, oid, frames, anchor, footprint, overhead=0, door=None, kind='prop', anim_ms=None, **extra):
    """Pack a state or animation strip; rect = frame 0, frames[k] = state k (or anim frames with frameDx)."""
    s = strip(frames)
    x, y = sh.alloc(s.w, s.h)
    sh.cv.paste(s, x, y)
    w, h = frames[0].w, frames[0].h
    m = {'rect': [x, y, w, h], 'anchor': anchor, 'footprint': footprint, 'overheadRows': overhead,
         'doorAt': door, 'collision': 'solid', 'kind': kind}
    if anim_ms:
        m['anim'] = {'frames': [0, 1, 2, 1], 'frameDx': w, 'ms': anim_ms}
    else:
        m['frames'] = [[x + i * w, y, w, h] for i in range(len(frames))]
    m.update(extra)
    sh.meta['objects'][oid] = m
    return m


def build_into(sh):
    sh.newline()
    O = sh.meta['objects']
    put_frames(sh, 'mirror_stand', [mirror_stand('/'), mirror_stand('\\')], [0, 1], [[0, 0]],
               note="turnable mirror; frames by state: 0 = '/', 1 = '\\\\'")
    put_frames(sh, 'mirror_heavy', [mirror_heavy('/'), mirror_heavy('\\')], [0, 1], [[0, 0]],
               note="heavy mirror (Shove moves it one tile); frames by state: 0 = '/', 1 = '\\\\'")
    put_frames(sh, 'receptor', [receptor(False), receptor(True)], [0, 1], [[0, 0]],
               note='crystal receptor on a pedestal; frames by state: 0 = dark, 1 = lit')
    put_frames(sh, 'receptor_wall', [receptor_wall(False), receptor_wall(True)], [0, 1], [[0, 0]], kind='piece',
               note='crystal receptor set in a 2-row wall face; frames by state: 0 = dark, 1 = lit')
    put_frames(sh, 'beam_window', [beam_window(i) for i in range(3)], [0, 1], [[0, 0]], kind='piece', anim_ms=160,
               note='beam source window in a north face (the beam leaves its sill southward)')
    put_frames(sh, 'beam_lens', [beam_lens(i) for i in range(3)], [0, 1], [[0, 0]], anim_ms=180,
               note='beam source on a pedestal (the lens sits on the anchor tile row above)')
    put_frames(sh, 'font_silver', [font_silver(i) for i in range(3)], [0, 1], [[0, 0], [1, 0]], anim_ms=260,
               note='the silver font (rest and save)')
    sh.newline()
    for kind, base in (('key', 'door_glass_key'), ('gate', 'door_glass')):
        for op in (False, True):
            sh.obj('%s_%s' % (base, 'open' if op else 'closed'), door_glass(kind, op), [0, 1],
                   [] if op else [[0, 0], [1, 0]], 0, door=[0, 0] if op else None, kind='door',
                   note='set into a 2-tile wall face; cells (0,0) and (1,0) are the doorway')
    sh.obj('stairs_glass_up', stairs_glass_up(), [0, 1], [], 0, door=[0, 0], kind='door')
    sh.obj('stairs_glass_down', stairs_glass_down(), [0, 1], [], 0, door=[0, 0], kind='door')
    vow = [door_vow(i) for i in range(5)]
    put_frames(sh, 'door_vow', vow, [0, 2], [[0, 0], [1, 0]], kind='door',
               note='the Vow Door; frames by state: 0..3 = crystals lit, 4 = open (art only: use door_vow_open '
                    'for the walkable doorway)')
    put_frames(sh, 'door_vow_closed', vow[:4], [0, 2], [[0, 0], [1, 0]], kind='door',
               note='frames by state: 0..3 = crystals lit')
    sh.obj('door_vow_open', vow[4], [0, 2], [], 0, door=[0, 0], kind='door')
    sh.newline()
    thr = [door_throne(False), door_throne(True)]
    put_frames(sh, 'door_throne', thr, [0, 2], [[0, 0], [1, 0], [2, 0]], kind='door',
               note='glass boss door; frames by state: 0 = closed, 1 = open (art only: use door_throne_open '
                    'for the walkable doorway)')
    sh.obj('door_throne_closed', thr[0], [0, 2], [[0, 0], [1, 0], [2, 0]], 0, kind='door')
    sh.obj('door_throne_open', thr[1], [0, 2], [], 0, door=[1, 0], kind='door')
    sh.obj('throne_glass', throne_glass(), [0, 2], [[0, 0], [1, 0]], 0)
    put_frames(sh, 'mirror_tall', [mirror_tall(False), mirror_tall(True)], [0, 2], [], overhead=2, door=[0, 0],
               note='full-length mirror (door kind mirror); frames by state: 0 = dull, 1 = active; the anchor '
                    'cell is the walk-in cell')
    sh.obj('glass_bench', glass_bench(), [0, 1], [[0, 0], [1, 0]], 0)
    sh.newline()
    put_frames(sh, 'mirror_great', [mirror_great(i) for i in range(3)], [0, 4],
               [[dx, 0] for dx in range(6)], kind='piece',
               note='the King\'s great mirror, 6 x 5 tiles, in the north face; frames by state: 0 = whole '
                    '(the town), 1 = shattered, 2 = empty frame')
    sh.newline()
    # face overlays and tiles
    sh.tile('mirror_wall', mirror_wall(), collision='solid')
    sh.tile('glass_pane_cracked', glass_pane(False), collision='solid', note='Dash Strike breakable (face)')
    sh.tile('glass_pane_broken', glass_pane(True), collision='none')
    for kind in ('blank', 'blank_2', 'blank_3', 'child', 'keeper_empty', 'king'):
        sh.tile('portrait_' + kind, portrait(kind), collision='solid', note='32 x 32 face overlay (2-row face)')
    sh.tile('crowned_reflection', crowned_reflection(), collision='none',
            note='reflection-only decal for the throne_floor under the empty throne (translucent)')
    sh.newline()
    for o in ('h', 'v'):
        for st in ('dim', 'lit'):
            sh.tile('glass_bridge_%s_%s' % (o, st), glass_bridge(o, st), collision='pit' if st == 'dim' else 'none')
    sh.tile('glass_slot', glass_slot(), collision='solid', beam='pass', note='wall-top cell the beam passes')
    sh.tile('glass_slot_face', glass_slot_face(), collision='solid', beam='pass', note='face cell the beam passes')
    sh.tile('glass_pane_cracked_top', glass_pane_top(False), collision='solid', note='Dash Strike breakable (band)')
    sh.tile('glass_pane_broken_top', glass_pane_top(True), collision='none')
    sh.newline()
    for lit in (False, True):
        for kind in ('h', 'v', 'corner_ne', 'corner_nw', 'corner_se', 'corner_sw', 'socket'):
            sh.tile('inlay_%s%s' % (kind, '_lit' if lit else ''), inlay(kind, lit), collision='none')
    sh.newline()
    # W11 (CRITIQUE_4 item 14): Vex's black feather on the F3 glass bench (it was drawn as a letter)
    sh.obj('prop_feather_black', feather_black(), [0, 0], [], 0, collision='none',
           note='the black feather on the glass bench (court_f3 feather_obj); event prop, not solid')
