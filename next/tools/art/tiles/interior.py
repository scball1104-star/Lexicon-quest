"""House / inn / shop interiors -> assets/tiles/interior.png.

Wall systems (legend <id>_top / <id>_face, faces usually 2 rows tall):
  interior        cream plaster over a wood wainscot (houses, library rooms)
  interior_wood   honey plank walls (inn, bakery)
  interior_stone  dressed stone (smithy, chapel, cellar)
Floors are the wood_floor / carpet_* / stone_floor terrains in terrain.png.
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32
from autotile import EdgeSpec
from terrain import Terrain, blank, G
from walls import FaceStyle
from kit import Sheet
import bld

S = lambda i: C('stone_warm', i)
K = lambda i: C('stone_cool', i)
WD = lambda i: C('wood', i)
GOLD = lambda i: C('gold', i)
M = lambda i: C('metal', i)


# ====================================================================== wall top: dark wall thickness with trim
class InteriorTop(Terrain):
    def __init__(self, tid, trim='wood'):
        super().__init__()
        self.id = tid
        self.trim = trim
        self.specs = {
            'fill': EdgeSpec({'N': 3.0, 'S': 3.0, 'W': 3.0, 'E': 3.0}, r=0, rr=0, metric='cheb'),
            'rim': EdgeSpec({'N': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0}, r=0, rr=0, metric='cheb'),
        }

    def make_texture(self, frame, variant):
        t = blank(C('shadow', 1))
        for y in range(16):
            for x in range(16):
                if (x + y * 3) % 7 == 0:
                    t[y][x] = DARK
        return t

    def pixel(self, c, x, y):
        if c.i('fill', x, y):
            return self.tex(c, x, y)
        if not c.i('rim', x, y):
            return None
        d = c.f('rim', x, y)
        if self.trim == 'stone':
            R = (S(1), S(4), S(3))
        else:
            R = (WD(1), WD(4), WD(2))
        if d < 1:
            return R[0]
        if d < 2:
            return R[1]
        return R[2]


# ====================================================================== wall faces
class PlasterFace(FaceStyle):
    """Cream plaster upper wall with a picture rail, wood wainscot panels below, baseboard."""
    def pixel(self, x, y, left, top, right, bottom):
        # rows are counted from the top of a 2-tall face: top tile y 0..15, bottom tile y 0..15
        if not top and y < 3:
            return [WD(1), WD(2), C('shadow', 2)][y]
        if bottom:
            # upper half of the wall (or a middle row): plaster with subtle mottling
            c = S(5) if rnd(x, y, 3101) > 0.07 else S(4)
            if y == 15:
                c = S(4)
        else:
            # lower tile: rail, wainscot, baseboard
            if y == 0:
                c = WD(2)
            elif y == 1:
                c = WD(4)
            elif y == 2:
                c = WD(1)
            elif y >= 13:
                c = [WD(2), WD(1), DARK][y - 13]
            else:
                k = x % 8
                c = WD(3)
                if k == 0:
                    c = WD(1)
                elif k == 1:
                    c = WD(4)
                elif y in (3, 12):
                    c = WD(2)
                elif k == 7:
                    c = WD(2)
        if not left and x == 0:
            return WD(1)
        if not right and x == 15:
            return WD(1)
        if not right and x == 14:
            return SH(70) if c is None else _shade(c)
        return c


def _shade(c):
    return (max(0, c[0] - 26), max(0, c[1] - 24), max(0, c[2] - 18), 255)


class PlankFace(FaceStyle):
    def pixel(self, x, y, left, top, right, bottom):
        if not top and y < 3:
            return [WD(1), WD(2), WD(1)][y]
        k = x % 5
        c = WD(4) if k == 0 else (WD(3) if k < 4 else WD(1))
        if (x // 5 * 7 + y) % 13 == 0 and k in (1, 2):
            c = WD(2)
        if not bottom and y >= 13:
            c = [WD(1), WD(0), DARK][y - 13]
        if not bottom and y == 6:
            c = WD(1) if k == 4 else WD(2)
        if not left and x == 0:
            return WD(0)
        if not right and x == 15:
            return WD(0)
        return c


class StoneFace(FaceStyle):
    def pixel(self, x, y, left, top, right, bottom):
        if not top and y < 2:
            return [S(1), C('shadow', 2)][y]
        row = y // 5
        ly = y % 5
        off = (row * 5) % 8
        k = (x + off) % 8
        c = S(3)
        if ly == 4 or k == 7:
            c = S(1)
        elif ly == 0:
            c = S(4)
        elif k == 0:
            c = S(4)
        elif rnd(x, y, 3201) < 0.06:
            c = S(2)
        if not bottom and y >= 14:
            c = [S(1), DARK][y - 14]
        if not left and x == 0:
            return S(1)
        if not right and x == 15:
            return S(0)
        return c


# ====================================================================== furniture
def window_in(curtains=None, night=False):
    """Window for the upper wall face, 16 x 16 (sits in the plaster row)."""
    cv = Canvas(16, 16)
    for y in range(2, 14):
        for x in range(3, 13):
            if x in (3, 12) or y in (2, 13):
                cv.set(x, y, WD(1))
                continue
            sky = C('water', 4) if not night else C('ink', 2)
            if y > 8:
                sky = C('water', 5) if not night else C('ink', 3)
            if (x - y) in (0, 1) and not night:
                sky = C('ice', 3)
            cv.set(x, y, sky)
    for y in range(3, 13):
        cv.set(7, y, WD(2))
        cv.set(8, y, WD(1))
    for x in range(4, 12):
        cv.set(x, 7, WD(2))
    for x in range(2, 14):
        cv.set(x, 14, WD(4))
        cv.set(x, 15, WD(2))
    if curtains:
        R = lambda i: C(curtains, i)
        for y in range(1, 14):
            for k in range(3):
                cv.set(1 + k, y, R(3) if k == 1 else R(2))
                cv.set(12 + k, y, R(3) if k == 1 else R(2))
        for x in range(1, 15):
            cv.set(x, 1, R(1))
            cv.set(x, 0, WD(1))
    return cv


def counter_tile(n, e, s, w):
    """Shop counter as a line autotile (index N*1 + E*2 + S*4 + W*8). Top surface + front panel in 3/4."""
    cv = Canvas(16, 16)
    x0 = 0 if w else 1
    x1 = 16 if e else 15
    horizontal = w or e or not (n or s)
    if horizontal:
        for y in range(2, 8):
            for x in range(x0, x1):
                cv.set(x, y, WD(4) if y == 2 else (WD(3) if y < 7 else WD(2)))
        for y in range(8, 15):
            for x in range(x0, x1):
                k = x % 8
                c = WD(2)
                if k == 0:
                    c = WD(1)
                elif y in (9, 13):
                    c = WD(1)
                cv.set(x, y, c)
        for x in range(x0, x1):
            cv.set(x, 1, WD(1))
            cv.set(x, 15, DARK)
        if not w:
            for y in range(1, 16):
                cv.set(x0, y, WD(1))
        if not e:
            for y in range(1, 16):
                cv.set(x1 - 1, y, WD(0))
    if n:
        for y in range(0, 2 if horizontal else 16):
            for x in range(2, 14):
                cv.set(x, y, WD(4) if x == 2 else (WD(3) if x < 13 else WD(1)))
    if s and horizontal:
        pass
    if (n or s) and not horizontal:
        for y in range(0, 16):
            for x in range(2, 14):
                c = WD(3)
                if x == 2:
                    c = WD(4)
                if x == 13:
                    c = WD(1)
                cv.set(x, y, c)
            cv.set(1, y, WD(1))
            cv.set(14, y, WD(0))
        if not s:
            for y in range(9, 16):
                for x in range(1, 15):
                    cv.set(x, y, WD(2) if x % 8 else WD(1))
            for x in range(1, 15):
                cv.set(x, 8, WD(4))
                cv.set(x, 15, DARK)
        if not n:
            for x in range(1, 15):
                cv.set(x, 0, WD(1))
                cv.set(x, 1, WD(4))
    return cv


def bed(double=False, quilt='cloth_blue'):
    W = 32 if double else 16
    cv = Canvas(W, 32)
    Q = lambda i: C(quilt, i)
    # headboard
    for y in range(0, 7):
        for x in range(0, W):
            c = WD(3) if y > 1 else WD(4)
            if x in (0, W - 1) or y == 0:
                c = WD(1)
            if y == 6:
                c = WD(1)
            cv.set(x, y, c)
    cv.set(1, 0, WD(4)); cv.set(W - 2, 0, WD(4))
    # frame + mattress
    for y in range(7, 30):
        for x in range(0, W):
            c = WD(2) if x in (0, W - 1) else S(5)
            cv.set(x, y, c)
    # pillows
    for p in range(2 if double else 1):
        px = 2 + p * 15
        for y in range(8, 13):
            for x in range(px, px + 12 if not double else px + 13):
                if x >= W - 2:
                    break
                cv.set(x, y, WHITE if y < 11 else S(4))
    # quilt
    for y in range(13, 29):
        for x in range(1, W - 1):
            c = Q(3)
            if y == 13:
                c = Q(4)
            elif (x + y) % 6 == 0:
                c = Q(2)
            elif y > 25:
                c = Q(2)
            if x in (1, W - 2):
                c = Q(1)
            cv.set(x, y, c)
    for x in range(1, W - 1):
        cv.set(x, 14, S(5) if x % 2 else WHITE)
    for x in range(0, W):
        cv.set(x, 29, WD(1))
        cv.set(x, 30, WD(2))
        cv.set(x, 31, WD(1))
    for y in range(4, 31):
        cv.put(W - 1, y, SH(40))
    return cv


def table_round():
    cv = Canvas(32, 32)
    for y in range(32):
        for x in range(32):
            dx, dy = (x + 0.5 - 16) / 14, (y + 0.5 - 13) / 9
            d = dx * dx + dy * dy
            if d <= 1:
                c = WD(3)
                if d > 0.82:
                    c = WD(1) if dy > 0 else WD(2)
                elif dy < -0.5 and dx < 0.2:
                    c = WD(4)
                cv.set(x, y, c)
            elif y > 13 and abs(x + 0.5 - 16) < 14 * math.sqrt(max(0, 1 - ((y - 4 + 0.5 - 13) / 9) ** 2)) and y < 26:
                cv.set(x, y, WD(1))
    for y in range(22, 30):
        cv.set(15, y, WD(1)); cv.set(16, y, WD(2))
    for x in range(10, 23):
        cv.set(x, 29, WD(1))
    # cloth runner + mug
    cv.stamp(['..ww..', '.wWWw.', '.wwww.'], 13, 9, {'w': S(5), 'W': WHITE})
    cv.stamp(['mm.', 'mMm', 'mm.'], 19, 10, {'m': GOLD(2), 'M': GOLD(4)})
    for x in range(4, 30):
        cv.put(x + 1, 30, SH(70))
    return cv


def table_long(w_tiles=3):
    W = w_tiles * 16
    cv = Canvas(W, 32)
    for y in range(6, 18):
        for x in range(1, W - 1):
            c = WD(3) if y > 6 else WD(4)
            if (x * 5 + y) % 19 == 0:
                c = WD(2)
            cv.set(x, y, c)
    for x in range(1, W - 1):
        cv.set(x, 5, WD(1))
        cv.set(x, 18, WD(2))
        cv.set(x, 19, WD(1))
    for y in range(5, 20):
        cv.set(0, y, WD(1)); cv.set(W - 1, y, WD(1))
    for lx in (2, W - 5):
        for y in range(20, 30):
            cv.set(lx, y, WD(1)); cv.set(lx + 1, y, WD(3)); cv.set(lx + 2, y, WD(1))
    # bread and a candle
    cv.stamp(['.bb.', 'bBBb', 'bbbb'], 6, 9, {'b': WD(3), 'B': WD(5)})
    cv.stamp(['.f.', '.y.', '.w.', 'mmm'], W - 12, 5, {'f': C('fire', 3), 'y': GOLD(5), 'w': S(5), 'm': GOLD(2)})
    for x in range(3, W - 1):
        cv.put(x + 1, 30, SH(70))
    return cv


def chair(facing):
    """Wooden chair in 3/4 view. facing = direction the sitter faces."""
    cv = Canvas(16, 16)
    def seat(y0):
        for y in range(y0, y0 + 4):
            for x in range(3, 13):
                c = WD(4) if y == y0 else (WD(3) if y < y0 + 3 else WD(2))
                if x in (3, 12):
                    c = WD(1)
                cv.set(x, y, c)
        for x in range(3, 13):
            cv.set(x, y0 + 4, WD(1))
        for lx in (3, 11):
            for y in range(y0 + 5, 15):
                cv.set(lx, y, WD(2)); cv.set(lx + 1, y, WD(1))
    if facing == 'down':
        for y in range(1, 9):
            for x in range(3, 13):
                c = WD(3)
                if y == 1:
                    c = WD(4)
                if x in (3, 12):
                    c = WD(1)
                if y in (4, 6) and 4 < x < 11:
                    c = WD(2)
                cv.set(x, y, c)
        seat(8)
    elif facing == 'up':
        seat(6)
        for y in range(9, 14):
            for x in range(3, 13):
                c = WD(2) if y > 9 else WD(4)
                if x in (3, 12) or y == 13:
                    c = WD(1)
                cv.set(x, y, c)
    else:
        seat(8)
        bx = 11 if facing == 'left' else 3
        for y in range(1, 12):
            cv.set(bx, y, WD(4) if bx == 3 else WD(3))
            cv.set(bx + 1, y, WD(2))
            cv.set(bx + 2, y, WD(1)) if bx == 3 else cv.set(bx - 1, y, WD(1))
        for y in range(3, 8, 2):
            for x in ((4, 5) if bx == 3 else (9, 10)):
                pass
    for x in range(4, 14):
        cv.put(x + 1, 15, SH(70))
    return cv


def hearth(frame=0):
    """48 x 48: stone chimney breast up the wall face (top 32 px) + firebox and hearthstone (bottom row)."""
    cv = Canvas(48, 48)
    bld.stone_blocks(cv, 4, 0, 40, 44, course=5, seed=3)
    for y in range(0, 44):
        cv.set(4, y, S(1)); cv.set(5, y, S(4))
        cv.set(43, y, S(0)); cv.put(42, y, SH(70))
    # mantel
    for x in range(1, 47):
        cv.set(x, 18, WD(1)); cv.set(x, 19, WD(4)); cv.set(x, 20, WD(3)); cv.set(x, 21, WD(1))
        cv.put(x, 22, SH(90))
    # mantel ornaments
    cv.stamp(['.c.', 'cgc', 'ggg'], 10, 15, {'c': C('roof_red', 3), 'g': GOLD(2)})
    cv.stamp(['.mm', 'mMm', 'mmm'], 33, 15, {'m': M(1), 'M': M(3)})
    # firebox opening
    for y in range(24, 44):
        for x in range(12, 36):
            dx = x + 0.5 - 24
            if y < 30 and dx * dx + (y - 30) ** 2 > 144:
                continue
            cv.set(x, y, DARK if y < 38 else C('shadow', 1))
    fires = [
        ['.....f...f.....', '....fyf.fyf..f.', '...fyyyffyyffyf', '..fyyWyyyWyyyf.', '..fyWWWyWWWyyf.',
         '.ffyyWyyyWyyff.', 'rrrfffffffffrrr'],
        ['...f.....f.....', '..fyf...fyf.f..', '..fyyf.fyyffyf.', '.fyyWyyyyWyyyf.', '.fyWWWyyWWWyf..',
         '.ffyyWyyyWyyff.', 'rrrfffffffffrrr'],
        ['.......f...f...', '..f..fyf.fyf...', '.fyf.fyyffyyf..', '.fyyyWyyyWyyf..', '.fyyWWWyWWWyyf.',
         '.ffyyWyyyWyyff.', 'rrrfffffffffrrr'],
    ]
    cv.stamp(fires[frame % 3], 16, 31, {'f': C('fire', 2), 'y': C('fire', 4), 'W': C('fire', 5),
                                         'r': C('fire', 1)})
    for x in range(14, 34):
        cv.set(x, 38, WD(1) if x % 3 else WD(2))
    # hearthstone
    for x in range(2, 46):
        cv.set(x, 44, S(5)); cv.set(x, 45, S(4)); cv.set(x, 46, S(2)); cv.set(x, 47, S(1))
    return cv


def goods_shelf(kind):
    """32 x 32 wall shelf unit standing against a wall face: potions, bread or weapons."""
    cv = Canvas(32, 32)
    for y in range(0, 31):
        for x in range(1, 31):
            cv.set(x, y, C('shadow', 1))
        cv.set(1, y, WD(1)); cv.set(2, y, WD(4)); cv.set(29, y, WD(2)); cv.set(30, y, WD(1))
    for sy in (0, 10, 20, 29):
        for x in range(1, 31):
            cv.set(x, sy, WD(3)); cv.set(x, sy + 1, WD(1))
    for i, sy in enumerate((2, 12, 22)):
        if kind == 'potions':
            for k in range(5):
                col = ['roof_red', 'magic_cyan', 'gold', 'roof_green', 'cloth_purple'][(k + i) % 5]
                px = 4 + k * 5
                cv.stamp(['.c.', '.n.', 'pPp', 'pPp', 'ppp'], px, sy + 3,
                         {'c': WD(3), 'n': C('ice', 2), 'p': C(col, 2), 'P': C(col, 4)})
        elif kind == 'bread':
            for k in range(3):
                px = 4 + k * 8
                cv.stamp(['..bbb..', '.bBBBb.', 'bBhBhBb', 'bbbbbbb'], px, sy + 4,
                         {'b': WD(3), 'B': WD(4), 'h': WD(5)})
        else:  # weapons
            for k in range(4):
                px = 5 + k * 6
                if i < 2:
                    for yy in range(sy + 1, sy + 8):
                        cv.set(px, yy, M(3)); cv.set(px + 1, yy, M(2))
                    cv.set(px, sy, M(4))
                    cv.set(px - 1, sy + 7, GOLD(2)); cv.set(px + 2, sy + 7, GOLD(2))
                    cv.set(px, sy + 8, WD(2)); cv.set(px + 1, sy + 8, WD(1))
                else:
                    cv.stamp(['.mmm.', 'mMMMm', 'mMMMm', '.mmm.'], px - 1, sy + 3, {'m': M(1), 'M': M(2)})
    for y in range(2, 32):
        cv.put(31, y, SH(60))
    return cv


def barrel():
    cv = Canvas(16, 16)
    for y in range(1, 15):
        w = 6 if y in (1, 14) else 7
        for x in range(8 - w, 8 + w):
            k = (x - (8 - w)) / (2 * w)
            c = WD(4) if k < 0.3 else (WD(3) if k < 0.7 else WD(2))
            if y in (3, 11):
                c = M(1) if k < 0.7 else M(0)
            cv.set(x, y, c)
    for x in range(3, 13):
        cv.set(x, 1, WD(2))
        cv.set(x, 2, WD(1) if x in (3, 12) else WD(3))
    for x in range(2, 14):
        cv.put(x + 1, 15, SH(80))
    return cv


def pot(broken=False):
    cv = Canvas(16, 16)
    if broken:
        for (x, y, c) in ((4, 12, C('roof_red', 2)), (5, 12, C('roof_red', 3)), (6, 13, C('roof_red', 2)),
                          (9, 13, C('roof_red', 3)), (10, 12, C('roof_red', 2)), (11, 13, C('roof_red', 1)),
                          (7, 11, C('roof_red', 3)), (8, 14, C('roof_red', 2))):
            cv.set(x, y, c)
        return cv
    for y in range(3, 15):
        dy = (y - 9.5) / 6
        w = 5.5 * math.sqrt(max(0, 1 - dy * dy)) + (1 if y > 6 else 0)
        if y < 5:
            w = 3
        for x in range(16):
            dx = x + 0.5 - 8
            if abs(dx) <= w:
                k = (dx + w) / (2 * w)
                c = C('roof_red', 4) if k < 0.3 else (C('roof_red', 3) if k < 0.7 else C('roof_red', 2))
                if y == 3:
                    c = C('roof_red', 1)
                if y == 8:
                    c = GOLD(2)
                cv.set(x, y, c)
    for x in range(4, 13):
        cv.put(x + 1, 15, SH(80))
    return cv


def crate():
    cv = Canvas(16, 16)
    for y in range(2, 15):
        for x in range(2, 14):
            c = WD(3)
            if y in (2, 14) or x in (2, 13):
                c = WD(1)
            elif y == 3:
                c = WD(4)
            elif y in (8,):
                c = WD(2)
            elif x - 2 == y - 2 or x - 2 == y - 1:
                c = WD(2)
            cv.set(x, y, c)
    for x in range(3, 15):
        cv.put(x + 1, 15, SH(80))
    for y in range(4, 15):
        cv.put(14, y, SH(60))
    return cv


def sacks():
    cv = Canvas(16, 16)
    for (cx, cy) in ((5, 9), (11, 10)):
        for y in range(16):
            for x in range(16):
                dx, dy = (x + 0.5 - cx) / 4, (y + 0.5 - cy) / 4.5
                if dx * dx + dy * dy <= 1:
                    c = C('sand', 2) if dx < 0.2 else C('sand', 1)
                    if dy < -0.7:
                        c = C('sand', 3)
                    cv.set(x, y, c)
        cv.set(cx, cy - 4, WD(1))
    for x in range(2, 15):
        cv.put(x + 1, 15, SH(70))
    return cv


def rug_round(ramp='cloth_purple'):
    cv = Canvas(48, 32)
    R = lambda i: C(ramp, i)
    for y in range(32):
        for x in range(48):
            dx, dy = (x + 0.5 - 24) / 22, (y + 0.5 - 16) / 13
            d = dx * dx + dy * dy
            if d > 1:
                continue
            c = R(2)
            if d > 0.86:
                c = GOLD(3) if d < 0.93 else R(1)
            elif d > 0.7:
                c = R(3)
            elif d < 0.12:
                c = GOLD(3)
            elif abs(dx) < 0.05 or abs(dy) < 0.07:
                c = R(4)
            cv.set(x, y, c)
    return cv


def stairs_in(direction):
    """32 x 32 interior stairs. 'up': rising along the back wall; 'down': opening in the floor with rail."""
    cv = Canvas(32, 32)
    if direction == 'up':
        for k in range(8):
            y = 28 - k * 4
            for x in range(2, 30):
                cv.set(x, y, WD(4) if x > 2 else WD(1))
                cv.set(x, y + 1, WD(3))
                cv.set(x, y + 2, WD(2))
                cv.set(x, y + 3, WD(1))
        for y in range(32):
            cv.set(0, y, WD(1)); cv.set(1, y, WD(4))
            cv.set(31, y, WD(0)); cv.set(30, y, WD(2))
        return cv
    for y in range(2, 30):
        for x in range(2, 30):
            cv.set(x, y, DARK)
    for k in range(5):
        y = 25 - k * 5
        for x in range(4, 28):
            c = [WD(4), WD(3), WD(2), WD(1), C('shadow', 1)][k]
            cv.set(x, y, c)
            cv.set(x, y + 1, WD(1) if k < 4 else DARK)
    for i in range(32):
        cv.set(i, 0, WD(1)); cv.set(i, 1, WD(4))
        cv.set(0, i, WD(1)); cv.set(1, i, WD(4))
        cv.set(31, i, WD(0)); cv.set(30, i, WD(2))
    return cv


# ====================================================================== assemble
def build():
    sh = Sheet(512)
    walls = {}
    for wid, top, face in (('interior', InteriorTop('interior_top'), PlasterFace()),
                           ('interior_wood', InteriorTop('interior_wood_top'), PlankFace()),
                           ('interior_stone', InteriorTop('interior_stone_top', trim='stone'), StoneFace())):
        tx, ty = sh.alloc(32, 48)
        sh.cv.paste(top.block(), tx, ty)
        fx, fy = sh.alloc(32, 32)
        sh.cv.paste(face.block(), fx, fy)
        walls[wid] = {'top': [tx, ty], 'face': [fx, fy], 'collision': 'solid',
                      'note': 'legend ids %s_top / %s_face; faces are normally 2 rows tall' % (wid, wid)}
    sh.meta['walls'] = walls
    sh.newline()
    sh.tile('window_in', window_in(), collision='solid')
    sh.tile('window_in_curtain_red', window_in('roof_red'), collision='solid')
    sh.tile('window_in_curtain_blue', window_in('cloth_blue'), collision='solid')
    sh.tile('window_in_night', window_in('cloth_purple', night=True), collision='solid')
    for name, ch in (('barrel', barrel()), ('pot', pot()), ('pot_broken', pot(True)), ('crate', crate()),
                     ('sacks', sacks())):
        sh.tile('in_' + name, ch, collision='none' if name == 'pot_broken' else 'solid')
    for f in ('down', 'up', 'left', 'right'):
        sh.tile('chair_' + f, chair(f), collision='solid')
    cx, cy = sh.alloc(128, 32)
    cnt = Canvas(128, 32)
    for i in range(16):
        cnt.paste(counter_tile(bool(i & 1), bool(i & 2), bool(i & 4), bool(i & 8)), (i % 8) * 16, (i // 8) * 16)
    sh.cv.paste(cnt, cx, cy)
    sh.meta['tiles']['counter'] = {'x': cx, 'y': cy, 'w': 16, 'h': 16, 'collision': 'counter', 'autotile': 'line16'}
    sh.newline()
    sh.obj('bed_single', bed(False, 'cloth_blue'), [0, 1], [[0, 0], [0, -1]], 0)
    sh.obj('bed_single_red', bed(False, 'roof_red'), [0, 1], [[0, 0], [0, -1]], 0)
    sh.obj('bed_double', bed(True, 'cloth_purple'), [0, 1], [[0, 0], [1, 0], [0, -1], [1, -1]], 0)
    sh.obj('table_round', table_round(), [0, 1], [[0, 0], [1, 0]], 1)
    sh.obj('table_long', table_long(3), [0, 1], [[0, 0], [1, 0], [2, 0]], 1)
    sh.obj('shelf_potions', goods_shelf('potions'), [0, 1], [[0, 0], [1, 0]], 1)
    sh.obj('shelf_bread', goods_shelf('bread'), [0, 1], [[0, 0], [1, 0]], 1)
    sh.obj('rack_weapons', goods_shelf('weapons'), [0, 1], [[0, 0], [1, 0]], 1)
    sh.obj('rug_round', rug_round(), [0, 1], [], 0, collision='none')
    sh.obj('stairs_in_up', stairs_in('up'), [0, 1], [], 0, door=[0, 0], kind='door')
    sh.obj('stairs_in_down', stairs_in('down'), [0, 1], [], 0, door=[0, 0], kind='door')
    hx, hy = sh.alloc(144, 48)
    for i in range(3):
        sh.cv.paste(hearth(i), hx + i * 48, hy)
    sh.meta['objects']['hearth'] = {'rect': [hx, hy, 48, 48], 'anchor': [0, 2], 'footprint': [[0, 0], [1, 0], [2, 0]],
                                    'overheadRows': 0, 'doorAt': None, 'collision': 'solid', 'kind': 'prop',
                                    'anim': {'frames': [0, 1, 2, 1], 'frameDx': 48, 'ms': 130},
                                    'note': 'top 2 rows overlap a 2-row wall face; bottom row is the hearthstone'}
    sh.newline()
    H = sh.y
    return sh.cv.crop(0, 0, 512, H), sh.meta
