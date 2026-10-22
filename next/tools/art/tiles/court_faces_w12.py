"""W12 (CRITIQUE_4 item 6, the unfinished part): per-room wall art for the Court of Mirrors.

Every F1 room had the same strip of arched mirror windows, and F3 and the throne room shared one slate strip. Each
wall system now carries `faceStyles` (tiles.json): lists of 32x32 face blocks that repeat tile by tile along a wall,
and every room's wall run takes one style (src/world/tilemap.js faceBlockGrid; `faceStyleByMap` pins rooms).

  court (F1, silver marble)   0 arched mirror windows (the W8 face, kept for the entry hall and the teaching room)
                              1 violet tapestries with a silver hand-mirror emblem, between candle sconces
                              2 broken mirrors: cracked, dead and shattered panes in the same arches
                              3 niches holding blank-faced marble busts, between fluted pilasters
  court_throne (F3, slate)    0 the carved-crown frieze over ashlar (the W8 face)
                              1 tall black-glass panels in silver frames
                              2 crimson banners with the gold crown sigil
                              3 the throne room only: black glass in gold frames under gold crowns, gold-capped
                                pilasters (drawn so a three-tile-tall wall repeats its middle cleanly)

Faces are drawn as 2-tile-tall designs (Y 0..31) like court_kit.py: a one-row wall shows Y 0..7 and 24..31, a
three-row wall repeats Y 8..23.
"""
import math
from pxlib import C, DARK, WHITE, h32
from court_kit import CourtFace, ThroneFace, K, MT, ICE, RB, CP, INK, GD
from archive_floors import SplitFace

RR = lambda i: C('roof_red', i)        # 2d1b1f 571f28 87332e b34532 e06b39 eba14d
FI = lambda i: C('fire', i)            # 571f28 b34532 e06b39 eba14d f9d77a fff7d6
SW = lambda i: C('stone_warm', i)


class _Face(SplitFace):
    """a 16 x 32 design per tile: at(u, Y), u = x % 16; sides() from the system's own face (end pilasters)"""
    base = None

    def head(self, x, y):
        return self.at(x % 16, y)

    def body(self, x, r):
        return self.at(x % 16, r if r >= 8 else 16 + r)

    def foot(self, x, f):
        return self.at(x % 16, 24 + f)

    def sides(self, col, x, y, left, top, right, bottom):
        return self.base.sides(col, x, y, left, top, right, bottom)


# ====================================================================== F1 (court)
def marble(u, Y):
    """the silver marble wall behind the F1 dressings: ashlar courses, lit top edges"""
    v = (Y - 6) % 7
    k = (Y - 6) // 7
    off = 0 if k % 2 == 0 else 8
    if v == 6:
        return K(3)
    if v == 0:
        return K(5)
    if (u + off) % 16 == 0:
        return K(3)
    return K(4) if h32(u, Y, 77) % 9 else K(5)


def f1_frame(u, Y):
    if Y <= 5:
        return [DARK, K(2), MT(3), K(5), K(3), K(2)][Y]
    if Y >= 27:
        return [K(5), K(4), K(3), K(2), DARK][Y - 27]
    return None


class Tapestry(_Face):
    """a violet tapestry on a silver rod, a silver hand mirror worked on it, a pointed hem with silver tassels"""
    base = CourtFace()

    def at(self, u, Y):
        f = f1_frame(u, Y)
        if f is not None:
            return f
        hem = 22.0 + 2.2 * (1 - abs(u - 7.5) / 5.5)
        if Y == 7 and 1 <= u <= 14:
            return MT(3) if u in (1, 14) else MT(2)
        if Y == 6 and u in (1, 14):
            return MT(3)
        if 2 <= u <= 13 and 8 <= Y <= hem:
            # the mirror emblem: an oval ring of silver, dark glass with a glint, a short handle
            dx, dy = (u - 7.5) / 2.4, (Y - 13.0) / 2.9
            r = dx * dx + dy * dy
            if r <= 1.0:
                if r > 0.5:
                    return MT(3) if (u < 8 and Y < 14) else K(5)
                if u == 7 and Y == 12:
                    return ICE(2)
                return RB(2) if Y < 14 else RB(1)
            if u in (7, 8) and 16 <= Y <= 18:
                return MT(2) if u == 7 else K(4)
            if Y == 19 and u in (6, 9):
                return K(5)
            # cloth: lit near edge, shaded far edge, two soft folds, a silver border
            if u in (2, 13) or Y == 8:
                return K(5) if u == 2 or Y == 8 else K(3)
            if Y >= hem - 0.9:
                return CP(1)
            if u == 3:
                return CP(3)
            if u == 12:
                return CP(1)
            if u in (5, 10):
                return CP(1) if Y % 3 else CP(2)
            if u in (4, 9):
                return CP(3) if Y % 4 == 1 else CP(2)
            return CP(2)
        # tassels under the hem
        if u in (4, 7, 8, 11) and hem < Y <= hem + 1.6:
            return K(5)
        if u == 14 and 8 <= Y <= 23:
            return K(3)                          # the tapestry's shadow on the wall
        return marble(u, Y)


class Sconce(_Face):
    """a round silver-framed mirror medallion over a candle sconce, a warm glow on the marble"""
    base = CourtFace()

    def at(self, u, Y):
        f = f1_frame(u, Y)
        if f is not None:
            return f
        dx, dy = (u - 7.5), (Y - 10.5)
        r = math.hypot(dx, dy * 1.05)
        if r <= 3.6:
            if r > 2.5:
                return MT(3) if (dx < 0 and dy < 0.5) else (K(5) if dx < 1 else K(3))
            if (u, Y) == (6, 9):
                return ICE(2)
            return RB(1) if dx + dy < 0.5 else INK(2)
        # candle: flame, wick, ivory stem, drip tray, bracket
        if (u, Y) in ((7, 16), (8, 16)):
            return FI(4) if u == 7 else FI(3)
        if (u, Y) in ((7, 15),):
            return FI(5)
        if u in (7, 8) and 17 <= Y <= 20:
            return SW(5) if u == 7 else SW(4)
        if Y == 21 and 5 <= u <= 10:
            return MT(3) if u < 8 else MT(2)
        if Y == 22 and 6 <= u <= 9:
            return K(3)
        if u in (7, 8) and 23 <= Y <= 24:
            return K(2) if u == 8 else K(3)
        # the candle's warm glow on the wall
        g = math.hypot(u - 7.5, Y - 16.0)
        if g < 3.4 and Y > 14:
            return SW(5) if g < 2.2 else SW(4)
        return marble(u, Y)


class BrokenMirror(_Face):
    """the W8 arched mirror panel with its glass cracked (0), dead and dark (1) or shattered out of the frame (2)"""
    base = CourtFace()

    def __init__(self, kind):
        self.kind = kind

    def at(self, u, Y):
        col = self.base.at(u, Y)
        gx = u - 3
        inside = 3 <= u <= 13 and 9 <= Y <= 25 and col in (RB(0), RB(1), RB(2), RB(3), ICE(1), ICE(2), MT(3), K(3), K(4))
        if not inside or Y >= 26:
            return col
        # keep the reflected-floor band of the original low in the glass
        if self.kind == 0:
            # cracks radiating from an impact point, with dark splinters beside them
            px, py = 7.0, 15.0
            ang = math.atan2(Y - py, u - px)
            d = math.hypot(u - px, Y - py)
            for a0 in (-2.4, -0.9, 0.3, 1.4, 2.6):
                if abs(math.atan2(math.sin(ang - a0), math.cos(ang - a0))) < 0.5 / max(d, 0.8) and d < 9:
                    return ICE(2) if d < 4 else MT(3)
            if d < 1.2:
                return ICE(3)
            if d < 2.2:
                return RB(0)
            return col
        if self.kind == 1:
            # dead glass: the moon is gone from it, a single star of light remains
            if (u, Y) == (9, 13):
                return ICE(2)
            if Y >= 22:
                return K(2) if (u + Y) % 2 else K(1)
            return INK(1) if Y < 16 else RB(0)
        # shattered: the backing shows, jagged teeth of glass cling to the frame, splinters on the sill
        edge = min(gx, 10 - gx)
        tooth = (h32(u, 3311) % 3) + (1 if Y < 13 else 0)
        if Y >= 24 and h32(u, Y, 91) % 3 == 0:
            return ICE(1)
        if edge <= tooth and Y < 23:
            return RB(1) if (u + Y) % 3 else ICE(1)
        if Y <= 10 + (h32(u, 17) % 3):
            return RB(1)
        return K(1) if (u + Y * 3) % 7 else K(0)


class Niche(_Face):
    """an arched niche with a marble bust on a pedestal; the bust has no face (the Court keeps faces)"""
    base = CourtFace()

    def at(self, u, Y):
        f = f1_frame(u, Y)
        if f is not None:
            return f
        # the recess
        inside = 3 <= u <= 12 and Y >= 8 and (Y >= 11 or (u - 7.5) ** 2 + ((11 - Y) * 1.3) ** 2 <= 4.6 ** 2)
        rim = 2 <= u <= 13 and Y >= 7 and (Y >= 11 or (u - 7.5) ** 2 + ((11 - Y) * 1.3) ** 2 <= 5.6 ** 2)
        if Y == 25 and 2 <= u <= 13:
            return K(5) if u < 12 else K(4)
        if Y == 26 and 2 <= u <= 13:
            return K(3)
        if inside and Y < 25:
            # the bust: a blank oval head, a neck, shoulders; a pedestal
            hx, hy = (u - 7.5) / 2.3, (Y - 12.6) / 2.8
            if hx * hx + hy * hy <= 1.0:
                return MT(3) if u < 8 else (K(5) if u < 9 else K(4))
            if u in (7, 8) and Y == 15:
                return K(5) if u == 7 else K(4)
            if 16 <= Y <= 18 and abs(u - 7.5) <= 2.5 + (Y - 16):
                return MT(3) if u < 7 else (K(5) if u < 10 else K(4))
            if 19 <= Y <= 24 and 5 <= u <= 10:
                if Y == 19:
                    return K(5)
                return K(4) if u < 9 else K(3)
            # the dark of the niche, deeper at the top and on the shadow side
            if u == 3:
                return K(1)
            if Y < 12:
                return K(0)
            return K(1) if u > 10 else K(2)
        if rim and not inside:
            return MT(3) if u < 8 else K(3)
        return marble(u, Y)


class Pilaster(_Face):
    """a fluted silver pilaster on the marble, capital and base"""
    base = CourtFace()

    def at(self, u, Y):
        f = f1_frame(u, Y)
        if f is not None:
            return f
        if 5 <= u <= 10:
            if Y in (6, 7):
                return MT(3) if Y == 6 else K(5)
            if Y in (24, 25, 26):
                return [K(5), K(4), K(3)][Y - 24]
            return [K(5), MT(3), K(4), K(5), K(4), K(2)][u - 5]
        if u == 11 and 8 <= Y <= 23:
            return K(3)
        return marble(u, Y)


# ====================================================================== F3 and the throne (court_throne)
def throne_frame(u, Y, crown_gold=False):
    """the slate cornice and the carved-crown frieze of the W8 face (gold for the throne room), or None below"""
    if Y <= 11:
        if not crown_gold:
            return ThroneFace().at(u, Y)
        if Y <= 2:
            return [DARK, K(0), GD(2)][Y]
        col = K(1) if 3 < Y < 11 else (K(2) if Y == 3 else K(0))
        crown = ['.........',
                 '.a..a..a.',
                 '.aa.a.aa.',
                 '.aaaaaaa.',
                 '.bbbbbbb.',
                 '.ccccccc.']
        cy, cx = Y - 4, u - 4
        if 0 <= cy < len(crown) and 0 <= cx < 9:
            ch = crown[cy][cx]
            if ch == 'a':
                return GD(4) if cx < 4 else GD(3)
            if ch == 'b':
                return GD(3) if cx % 2 else GD(2)
            if ch == 'c':
                return K(0)
        return col
    if Y >= 29:
        return [K(2), K(1), DARK][Y - 29]
    return None


class BlackGlass(_Face):
    """a tall black-glass panel in a silver frame under the frieze: a faint sheen and one star"""
    base = ThroneFace()

    def at(self, u, Y):
        f = throne_frame(u, Y)
        if f is not None:
            return f
        if 2 <= u <= 13 and 13 <= Y <= 27:
            if Y == 13 or u == 2:
                return MT(2) if (u < 13 and Y < 27) else K(3)
            if Y == 27 or u == 13:
                return K(3) if Y == 27 else K(2)
            if Y == 14 or u == 3:
                return K(0)
            s = (u - 3) + (Y - 14) * 0.5
            if 6.0 <= s < 7.0 and Y < 24:
                return RB(1)
            if (u, Y) == (5, 17):
                return ICE(2)
            if (u, Y) in ((4, 17), (6, 17), (5, 16), (5, 18)):
                return RB(2)
            return INK(1) if Y < 22 else RB(0)
        return ThroneFace().course(u, Y)


class Banner(_Face):
    """a crimson banner hung from the frieze, a gold crown sigil, a pointed hem"""
    base = ThroneFace()

    def at(self, u, Y):
        f = throne_frame(u, Y)
        if f is not None:
            return f
        hem = 25.0 + 2.0 * (1 - abs(u - 7.5) / 5.0)
        if Y == 12 and 2 <= u <= 13:
            return K(4) if u in (2, 13) else K(3)
        if 3 <= u <= 12 and 13 <= Y <= hem:
            sig = ['.a.a.a.',
                   '.aaaaa.',
                   '.bbbbb.',
                   '.......',
                   '..ccc..']
            cy, cx = Y - 16, u - 4
            if 0 <= cy < len(sig) and 0 <= cx < 7:
                ch = sig[cy][cx]
                if ch == 'a':
                    return GD(4) if cx < 3 else GD(3)
                if ch in 'bc':
                    return GD(2)
            if Y == 13 or Y >= hem - 0.9:
                return GD(2) if Y == 13 else RR(1)
            if u == 3:
                return RR(3)
            if u == 12:
                return RR(1)
            if u in (6, 9):
                return RR(1) if Y % 3 == 0 else RR(2)
            return RR(2)
        if u == 13 and 13 <= Y <= 25:
            return K(0)
        return ThroneFace().course(u, Y)


class Ashlar(_Face):
    base = ThroneFace()

    def at(self, u, Y):
        f = throne_frame(u, Y)
        return f if f is not None else ThroneFace().course(u, Y)


class RoyalPanel(_Face):
    """the throne room: a gold crown on the frieze, black glass in a gold frame; Y 8..23 repeats cleanly"""
    base = ThroneFace()

    def at(self, u, Y):
        if Y <= 5:
            # a short frieze: a gold crown in relief
            if Y <= 1:
                return [DARK, GD(2)][Y]
            crown = ['.a..a..a.', '.aa.a.aa.', '.aaaaaaa.', '.bbbbbbb.']
            cy, cx = Y - 2, u - 4
            if 0 <= cx < 9:
                ch = crown[cy][cx]
                if ch == 'a':
                    return GD(4) if cx < 4 else GD(3)
                if ch == 'b':
                    return GD(2)
            return K(1)
        if Y >= 29:
            return [K(2), K(1), DARK][Y - 29]
        if 2 <= u <= 13:
            top = Y in (6, 7)
            bot = Y in (26, 27, 28)
            if u in (2, 13) or top or bot:
                if u == 2 or Y == 6:
                    return GD(3)
                if u == 13 or Y == 28:
                    return GD(1)
                return GD(2)
            if u == 3:
                return K(0)
            # the black glass; one cold sheen line that runs the whole height (so a tall wall repeats cleanly)
            if u == 9:
                return RB(1)
            if u == 10:
                return INK(2) if Y % 4 else RB(0)
            if (u, Y) == (6, 12):
                return ICE(2)
            return INK(1)
        return K(1) if u in (0, 15) else K(2)


class RoyalPilaster(_Face):
    base = ThroneFace()

    def at(self, u, Y):
        if Y <= 5:
            if Y <= 1:
                return [DARK, GD(2)][Y]
            return K(1)
        if Y >= 29:
            return [K(2), K(1), DARK][Y - 29]
        if 5 <= u <= 10:
            if Y in (6, 7):
                return GD(3) if Y == 6 else GD(2)
            if Y in (26, 27, 28):
                return [GD(3), GD(2), GD(1)][Y - 26]
            return [K(3), K(4), K(2), K(3), K(2), K(0)][u - 5]
        return ThroneFace().course(u, (Y - 8) % 16 + 12)


# ====================================================================== build
STYLES = {
    'court': [None, [Tapestry(), Sconce()], [BrokenMirror(0), BrokenMirror(1), BrokenMirror(2)], [Niche(), Pilaster()]],
    'court_throne': [None, [BlackGlass()], [Banner(), Ashlar()], [RoyalPanel(), RoyalPilaster()]],
}
# rooms pinned by a cell of their wall run (x, y, style); the other runs cycle in reading order
PLAN = {
    'court': {
        'court_f1': {'cycle': [1, 3, 2], 'at': [[19, 23, 0], [12, 16, 0]]},     # the entry hall and the teaching room
    },
    'court_throne': {
        'court_f3': {'cycle': [1, 0, 2]},
        'court_throne': {'cycle': [3]},
    },
}


def build_into(sh):
    """append the style blocks below everything else (no existing rect moves) and register them in the walls meta"""
    walls = sh.meta.setdefault('walls', {})
    for sys_id, styles in STYLES.items():
        meta = walls[sys_id]
        out = []
        for st in styles:
            if st is None:
                out.append([list(meta['face'])])
                continue
            blocks = []
            for face in st:
                x, y = sh.alloc(32, 32)
                sh.cv.paste(face.block(), x, y)
                blocks.append([x, y])
            out.append(blocks)
        meta['faceStyles'] = out
        meta['faceStyleByMap'] = PLAN.get(sys_id, {})
        meta['note'] = meta.get('note', '') + '; W12: faceStyles per room (tools/art/tiles/court_faces_w12.py)'
    sh.newline()
