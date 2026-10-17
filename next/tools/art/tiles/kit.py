"""Modular town kit (goes into the lower part of town.png). Returns (Canvas 512 x H, meta).

Tile ids (16 x 16 unless noted, w/h in tiles.json):
  roof_<color>_<r>_<c>       roof chunk, r in ridge|field|eave, c in l|m|r   (color: red blue purple green)
  gable_<color>              object 48 x 32, front gable with bargeboards
  wall_<mat>_<r>_<c>         wall chunk, r in top|bot, c in l|m|r (+ 'p' timber post column for timber)
  door_*, window_*, chimney_stone (16x32), awning_<color>_<l|m|r>, banner_<color> (16x32),
  sign_<kind>, lamp_base, stairs_stone_<l|m|r>, step_stone, bridge_*  (see build())
  fence_wood / wall_low / fence_iron: line autotiles "line16": 16 tiles in a row of 8 x 2; index =
      N*1 + E*2 + S*4 + W*8 (bit set when the neighbour is the same fence); tile i at
      (x + (i % 8) * 16, y + (i // 8) * 16).
Objects: well, signpost, signpost_arrow, market_stall_fruit, market_stall_cloth, gable_<color>.
"""
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32
import bld
from bld import S, WD, G, GOLD, M

K = lambda i: C('stone_cool', i)

ROOFS = [('red', 'roof_red', 'clay'), ('blue', 'roof_blue', 'slate'), ('purple', 'roof_purple', 'slate'),
         ('green', 'roof_green', 'slate')]


class Sheet:
    def __init__(self, w=512, h=1024):
        self.cv = Canvas(w, h)
        self.meta = {'tiles': {}, 'objects': {}}
        self.x = 0
        self.y = 0
        self.row_h = 16

    def newline(self):
        self.x = 0
        self.y += self.row_h
        self.row_h = 16

    def alloc(self, w, h):
        if self.x + w > self.cv.w:
            self.newline()
        x, y = self.x, self.y
        self.x += w
        self.row_h = max(self.row_h, h)
        return x, y

    def tile(self, tid, cv, collision='solid', **extra):
        x, y = self.alloc(cv.w, cv.h)
        self.cv.paste(cv, x, y)
        m = {'x': x, 'y': y, 'w': cv.w, 'h': cv.h, 'collision': collision}
        m.update(extra)
        self.meta['tiles'][tid] = m
        return x, y

    def obj(self, oid, cv, anchor, footprint, overhead, door=None, kind='prop', **extra):
        x, y = self.alloc(cv.w, cv.h)
        self.cv.paste(cv, x, y)
        m = {'rect': [x, y, cv.w, cv.h], 'anchor': anchor, 'footprint': footprint, 'overheadRows': overhead,
             'doorAt': door, 'collision': 'solid', 'kind': kind}
        m.update(extra)
        self.meta['objects'][oid] = m


def cut(cv, tx, ty, w=16, h=16):
    return cv.crop(tx * 16, ty * 16, w, h)


# ------------------------------------------------------------------ roofs
def roof_chunk(ramp, style, seed=0):
    """48 x 48: rows ridge / field / eave, columns l / m / r. Field texture has a 16 px period."""
    cv = Canvas(48, 48)
    R = lambda i: C(ramp, i)
    for yy in range(48):
        for xx in range(48):
            if style == 'clay':
                ly, k = yy % 8, xx % 4
                body = [R(4), R(3), R(2), R(1)][k]
                c = [R(2), R(2), R(1), R(0)][k] if ly == 7 else ([R(4), R(4), R(3), R(1)][k] if ly == 0 else body)
            else:
                row = yy // 4
                ly = yy % 4
                k = (xx + (row % 2) * 4) % 8
                unit = (xx + (row % 2) * 4) // 8
                body = R(3) if rnd(unit % 2, row % 4, seed, 41) > 0.2 else R(2)
                if ly == 3:
                    c = R(1)
                elif k == 7:
                    c = R(1) if ly > 0 else R(2)
                elif ly == 0:
                    c = R(4) if k < 4 else body
                else:
                    c = body
            cv.set(xx, yy, c)
    # ridge
    for xx in range(48):
        cv.set(xx, 0, R(0))
        cv.set(xx, 1, R(4) if xx % 4 else R(2))
        cv.set(xx, 2, R(2))
    # gable ends (bargeboards) on the left and right columns
    for yy in range(46):
        cv.set(0, yy, R(0))
        cv.set(1, yy, WD(3))
        cv.set(2, yy, WD(1))
        cv.set(47, yy, R(0))
        cv.set(46, yy, WD(1))
        cv.set(45, yy, WD(2))
    # eave
    for xx in range(48):
        cv.set(xx, 46, R(0))
        cv.set(xx, 47, WD(2) if 0 < xx < 47 else WD(1))
    return cv


def gable_obj(ramp):
    cv = Canvas(48, 32)
    bld.gable_front(cv, 24, 30, 16, ramp, window_kind='round')
    return cv


# ------------------------------------------------------------------ walls
def wall_chunk(mat):
    """48 x 32 (timber: 64 x 32 with a post column). rows top / bot, cols l m (p) r."""
    w = 64 if mat == 'timber' else 48
    cv = Canvas(w, 32)
    if mat == 'timber':
        for yy in range(32):
            for xx in range(w):
                c = S(5) if rnd(xx % 16, yy, 3) > 0.06 else S(4)
                cv.set(xx, yy, c)
        bld.stone_blocks(cv, 0, 26, w, 6, course=3)
        bld.beam_h(cv, 0, 0, w)
        bld.beam_h(cv, 0, 24, w)
        bld.beam_v(cv, 0, 0, 26)
        bld.beam_v(cv, 32 + 7, 0, 26)
        bld.beam_v(cv, w - 2, 0, 26)
        bld.brace(cv, 41, 2, 47, 22)
    elif mat == 'stone':
        bld.stone_blocks(cv, 0, 0, w, 32, course=4)
    else:
        bld.planks_v(cv, 0, 0, w, 26)
        bld.stone_blocks(cv, 0, 26, w, 6, course=3)
        bld.beam_h(cv, 0, 0, w)
    dark = WD(1) if mat != 'stone' else S(1)
    for yy in range(32):
        cv.set(0, yy, dark)
        cv.set(w - 1, yy, dark)
        cv.put(w - 2, yy, SH(60))
    bld.eave_shadow(cv, 0, 0, w, rows=3)
    return cv


# ------------------------------------------------------------------ fences (line16)
def fence_tile(kind, n, e, s, w):
    cv = Canvas(16, 16)
    if kind == 'wood':
        if w:
            for x in range(0, 8):
                cv.set(x, 6, WD(4)); cv.set(x, 7, WD(2))
                cv.set(x, 10, WD(4)); cv.set(x, 11, WD(2))
        if e:
            for x in range(8, 16):
                cv.set(x, 6, WD(4)); cv.set(x, 7, WD(2))
                cv.set(x, 10, WD(4)); cv.set(x, 11, WD(2))
        if n:
            for y in range(0, 6):
                cv.set(7, y, WD(4)); cv.set(8, y, WD(2))
        if s:
            for y in range(12, 16):
                cv.set(7, y, WD(4)); cv.set(8, y, WD(2))
        # post
        for y in range(3, 14):
            cv.set(6, y, WD(1))
            cv.set(7, y, WD(4))
            cv.set(8, y, WD(3))
            cv.set(9, y, WD(1))
        cv.set(7, 2, WD(1)); cv.set(8, 2, WD(1))
        cv.set(7, 3, WD(5)); cv.set(8, 3, WD(4))
        cv.put(10, 13, SH(90)); cv.put(10, 12, SH(60)); cv.put(11, 13, SH(50))
        for x in range(0, 16):
            if (x < 8 and w) or (x >= 8 and e):
                cv.put(x, 12, SH(50))
        return cv
    if kind == 'stone':
        # low wall: cap (top view) 10 px wide when running N/S, face visible on the south side
        def cap(x0, x1, y0, y1):
            for y in range(y0, y1):
                for x in range(x0, x1):
                    c = S(4)
                    if (x * 3 + y * 5) % 11 == 0:
                        c = S(3)
                    cv.set(x, y, c)
        top = 4
        if w or e or not (n or s):
            x0 = 0 if w else 3
            x1 = 16 if e else 13
            cap(x0, x1, top, top + 4)
            bld.stone_blocks(cv, x0, top + 4, x1 - x0, 7, course=4, seed=x0)
            for x in range(x0, x1):
                cv.set(x, top, S(5))
                cv.set(x, top + 3, S(2))
                cv.put(x, top + 11, SH(80))
            if not w:
                for y in range(top, top + 11):
                    cv.set(x0, y, S(1))
            if not e:
                for y in range(top, top + 11):
                    cv.set(x1 - 1, y, S(0))
        if n:
            cap(3, 13, 0, top + (0 if (w or e) else 4))
            for y in range(0, top + 4):
                cv.set(3, y, S(5)); cv.set(12, y, S(2))
        if s:
            y0 = top + 4 if (w or e or n) else 0
            if w or e:
                y0 = top + 11
            cap(3, 13, y0, 16)
            for y in range(y0, 16):
                cv.set(3, y, S(5)); cv.set(12, y, S(2))
        if (n or s) and not (w or e):
            if not s:
                cap(3, 13, 0, top + 4)
                bld.stone_blocks(cv, 3, top + 4, 10, 7, course=4)
                for x in range(3, 13):
                    cv.put(x, top + 11, SH(80))
            for y in range(0, 16):
                if cv.get(3, y)[3]:
                    cv.set(3, y, S(5) if cv.get(3, y) != S(1) else S(1))
                if cv.get(12, y)[3]:
                    cv.put(13, y, SH(70))
        return cv
    # iron
    rail = M(1)
    if w or e or not (n or s):
        x0 = 0 if w else 5
        x1 = 16 if e else 11
        for x in range(x0, x1):
            cv.set(x, 5, rail)
            cv.set(x, 12, rail)
        for x in range(x0 + 1, x1, 3):
            for y in range(3, 14):
                cv.set(x, y, C('metal', 0) if y > 3 else GOLD(3))
            cv.set(x, 2, GOLD(4))
            cv.put(x + 1, 14, SH(80))
    if n or s:
        y0 = 0 if n else 6
        y1 = 16 if s else 10
        for y in range(y0, y1):
            cv.set(7, y, rail)
            cv.set(9, y, rail)
        for y in range(y0 + 1, y1, 3):
            cv.set(8, y, GOLD(3))
        for y in range(y0, y1):
            cv.put(10, y, SH(60))
    # post
    for y in range(2, 15):
        cv.set(7, y, C('metal', 0))
        cv.set(8, y, C('metal', 2) if y < 14 else C('metal', 0))
    cv.set(7, 1, GOLD(4)); cv.set(8, 1, GOLD(3))
    return cv


def line16(kind):
    cv = Canvas(128, 32)
    for i in range(16):
        n, e, s, w = bool(i & 1), bool(i & 2), bool(i & 4), bool(i & 8)
        cv.paste(fence_tile(kind, n, e, s, w), (i % 8) * 16, (i // 8) * 16)
    return cv


# ------------------------------------------------------------------ bridges
def deck_paving(cv, x0, y0, w, h, phase=0):
    """Warm paving for bridge decks: 4 px courses, staggered joints, period 16 horizontally."""
    for yy in range(h):
        row = (y0 + yy) // 4
        ly = (y0 + yy) % 4
        for xx in range(w):
            X = x0 + xx + phase
            k = (X + (row % 2) * 4) % 8
            c = S(3) if (X // 8 + row) % 3 else C('path', 3)
            if ly == 3:
                c = S(2)
            elif k == 7:
                c = S(2)
            elif ly == 0:
                c = S(4)
            elif (X * 7 + row * 3) % 23 == 0:
                c = S(2)
            cv.set(x0 + xx, y0 + yy, c)


def parapet_face(cv, x0, x1, y0, cap=2, face=5, ramp='stone_warm', seed=0):
    R = lambda i: C(ramp, i)
    for x in range(x0, x1):
        cv.set(x, y0, R(1))
        cv.set(x, y0 + 1, R(5))
        if cap > 2:
            cv.set(x, y0 + 2, R(4))
    bld.stone_blocks(cv, x0, y0 + cap, x1 - x0, face, ramp=ramp, course=face if face < 4 else 3, seed=seed)
    for x in range(x0, x1):
        cv.set(x, y0 + cap + face - 1, R(1))


def bridge_post(cv, x, y, h, ramp='stone_warm'):
    """Square end post, 6 px wide, cap on top. (x, y) top-left of the cap."""
    R = lambda i: C(ramp, i)
    for xx in range(-1, 7):
        cv.set(x + xx, y, R(1))
        cv.set(x + xx, y + 1, R(5) if xx < 6 else R(3))
        cv.set(x + xx, y + 2, R(3))
    for yy in range(3, h):
        cv.set(x, y + yy, R(1))
        cv.set(x + 1, y + yy, R(5))
        cv.set(x + 2, y + yy, R(4))
        cv.set(x + 3, y + yy, R(4))
        cv.set(x + 4, y + yy, R(3))
        cv.set(x + 5, y + yy, R(0))
        if (yy - 3) % 5 == 4:
            for k in range(1, 5):
                cv.set(x + k, y + yy, R(2))
    for yy in range(2, h):
        cv.put(x + 6, y + yy, SH(80))


def bridge_stone_h():
    """48 x 48 chunk. rows: n (back parapet + deck), s (deck + front parapet), arch (spandrel over water).
    cols: l (west end, post + landing), m (repeatable), r (east end)."""
    cv = Canvas(48, 48)
    deck_paving(cv, 2, 6, 44, 18)
    parapet_face(cv, 0, 48, 0, cap=2, face=5, seed=3)
    parapet_face(cv, 0, 48, 22, cap=3, face=8, seed=5)
    for x in range(48):
        cv.put(x, 7, SH(70))
        cv.put(x, 8, SH(35))
    bld.stone_blocks(cv, 0, 33, 48, 15, course=4, seed=9)
    for x in range(48):
        cv.set(x, 33, S(1))
    for k in range(3):
        cx = k * 16 + 8
        for y in range(36, 48):
            for x in range(k * 16 + 1, k * 16 + 15):
                dx = x + 0.5 - cx
                dy = y - 43
                if dy >= 0 or (dx * dx) / 42.0 + (dy * dy) / 49.0 < 1:
                    cv.a[y, x] = (0, 0, 0, 0)
        for x in range(k * 16 + 1, k * 16 + 15):
            for y in range(34, 48):
                if cv.get(x, y)[3] == 0:
                    cv.set(x, y - 1, S(5) if x < cx else S(2))
                    for d in range(0, 6):
                        if y + d < 48 and cv.get(x, y + d)[3] == 0:
                            cv.put(x, y + d, SH(150 - d * 22))
                    break
    for side in ('l', 'r'):
        if side == 'l':
            for y in range(0, 48):
                for x in range(0, 4):
                    cv.a[y, x] = (0, 0, 0, 0)
            for y in range(33, 48):
                for x in range(0, 8):
                    cv.a[y, x] = (0, 0, 0, 0)
            for y in range(6, 22):
                cv.set(3, y, S(2))
            bridge_post(cv, 3, 0, 9)
            bridge_post(cv, 3, 19, 14)
        else:
            for y in range(0, 48):
                for x in range(44, 48):
                    cv.a[y, x] = (0, 0, 0, 0)
            for y in range(33, 48):
                for x in range(40, 48):
                    cv.a[y, x] = (0, 0, 0, 0)
            for y in range(6, 22):
                cv.set(44, y, S(1))
            bridge_post(cv, 38, 0, 9)
            bridge_post(cv, 38, 19, 14)
    return cv


def bridge_wood_h():
    """48 x 48 chunk. rows n (back rail + deck), s (deck + edge posts + fascia), piles (posts into water).
    The near side has only short posts so the walkable deck stays clear."""
    cv = Canvas(48, 48)
    for y in range(4, 28):
        for x in range(48):
            k = x % 4
            c = WD(4) if k == 0 else (WD(3) if k in (1, 2) else WD(1))
            if (y * 3 + (x // 4) * 7) % 23 == 0 and k in (1, 2):
                c = WD(2)
            if y in (12, 13) and k in (1, 2) and (x // 4) % 2 == 0:
                c = WD(2) if y == 12 else WD(3)
            cv.set(x, y, c)
    for x in range(48):
        cv.set(x, 0, WD(1)); cv.set(x, 1, WD(4)); cv.set(x, 2, WD(2)); cv.set(x, 3, WD(1))
        cv.put(x, 4, SH(90)); cv.put(x, 5, SH(45))
        cv.set(x, 27, WD(4)); cv.set(x, 28, WD(2)); cv.set(x, 29, WD(1)); cv.set(x, 30, WD(1))
        cv.put(x, 31, SH(130)); cv.put(x, 32, SH(90)); cv.put(x, 33, SH(50))
    for px in (6, 22, 38):
        for y in range(0, 6):
            cv.set(px, y, WD(1)); cv.set(px + 1, y, WD(4)); cv.set(px + 2, y, WD(2)); cv.set(px + 3, y, WD(1))
        cv.set(px + 1, 0, WD(5)); cv.set(px + 2, 0, WD(4))
        for y in range(22, 30):
            cv.set(px, y, WD(1)); cv.set(px + 1, y, WD(4)); cv.set(px + 2, y, WD(2)); cv.set(px + 3, y, WD(1))
        cv.set(px + 1, 22, WD(5)); cv.set(px + 2, 22, WD(4))
        for y in range(31, 45):
            cv.set(px, y, WD(1)); cv.set(px + 1, y, WD(3)); cv.set(px + 2, y, WD(2)); cv.set(px + 3, y, WD(1))
        for x in range(px - 1, px + 5):
            cv.set(x, 45, C('ice', 3) if (x + px) % 2 else C('water', 5))
            cv.set(x, 46, C('water', 4))
    for side in ('l', 'r'):
        xs = range(0, 3) if side == 'l' else range(45, 48)
        for y in range(48):
            for x in xs:
                cv.a[y, x] = (0, 0, 0, 0)
    return cv


def bridge_wood_v():
    """32 x 48: cols w e, rows n m s (deck runs north-south, rails on both sides)."""
    cv = Canvas(32, 48)
    for y in range(48):
        for x in range(3, 29):
            k = y % 4
            c = WD(3) if k in (1, 2) else (WD(4) if k == 0 else WD(1))
            if (x + (y // 4) * 7) % 11 == 0 and k != 3:
                c = WD(2)
            cv.set(x, y, c)
        for x, col in ((0, WD(1)), (1, WD(4)), (2, WD(1)), (29, WD(1)), (30, WD(2)), (31, WD(1))):
            cv.set(x, y, col)
    for py in (0, 22, 44):
        for x in (0, 1, 2, 29, 30, 31):
            cv.set(x, py, WD(1)); cv.set(x, py + 1, WD(4)); cv.set(x, py + 2, WD(3)); cv.set(x, py + 3, WD(1))
    return cv


def bridge_stone_v():
    """48 x 48: cols w (parapet) m (deck) e (parapet), rows n m s."""
    cv = Canvas(48, 48)
    deck_paving(cv, 6, 0, 36, 48)
    for y in range(48):
        for x, col in ((0, S(1)), (1, S(5)), (2, S(4)), (3, S(4)), (4, S(3)), (5, S(1)),
                       (42, S(1)), (43, S(4)), (44, S(3)), (45, S(3)), (46, S(2)), (47, S(0))):
            cv.set(x, y, col)
        if y % 8 == 7:
            for x in (1, 2, 3, 4, 43, 44, 45, 46):
                cv.set(x, y, S(2))
        cv.put(6, y, SH(60))
    for (x, y) in ((0, 0), (42, 0), (0, 38), (42, 38)):
        bridge_post(cv, x, y, 10)
    return cv


# ------------------------------------------------------------------ props
def well():
    cv = Canvas(32, 48)
    # roof on posts
    for y in range(12, 38):
        for px in (5, 25):
            cv.set(px, y, WD(1)); cv.set(px + 1, y, WD(3)); cv.set(px + 2, y, WD(1))
    bld.roof_side(cv, 1, 0, 30, 14, 'roof_red', hip=3, style='clay', seed=3)
    # crossbar + rope + bucket
    for x in range(7, 25):
        cv.set(x, 16, WD(2)); cv.set(x, 17, WD(1))
    for y in range(18, 27):
        cv.set(16, y, C('sand', 1))
    cv.stamp(['.mmm.', 'mWWWm', 'mwwwm', '.mmm.'], 14, 26, {'m': M(1), 'W': WD(4), 'w': WD(3)})
    # stone ring
    for y in range(30, 46):
        for x in range(2, 30):
            dx, dy = (x + 0.5 - 16) / 14, (y + 0.5 - 36) / 6
            if dx * dx + dy * dy <= 1.0 and y < 40:
                c = S(4) if (x + y) % 5 else S(3)
                if dx * dx + dy * dy <= 0.45:
                    c = C('water', 1) if y > 35 else DARK
                elif dy < -0.3:
                    c = S(5)
                cv.set(x, y, c)
            if y >= 38 and 2 <= x < 30 and abs(dx) <= 1.0:
                c = S(3) if ((x + (y // 3) * 4) % 7) else S(1)
                if y % 3 == 2:
                    c = S(2)
                cv.set(x, y, c)
    for x in range(2, 30):
        cv.set(x, 45, S(1))
        cv.put(x + 2, 46, SH(80))
    for y in range(30, 46):
        cv.put(30, y, SH(70)); cv.put(31, y, SH(40))
    return cv


def signpost(arrow=False):
    cv = Canvas(16, 32)
    for y in range(8, 31):
        cv.set(7, y, WD(4)); cv.set(8, y, WD(2)); cv.set(9, y, WD(1))
    if arrow:
        board = ['.bbbbbbbbbb..',
                 'bBBBBBBBBBBb.',
                 'bBhhhhhhhhBBb',
                 'bBBBBBBBBBBb.',
                 '.bbbbbbbbbb..']
    else:
        board = ['bbbbbbbbbbbb',
                 'bBBBBBBBBBBb',
                 'bBhhhhhhhhBb',
                 'bBhhhhhhBBBb',
                 'bBBBBBBBBBBb',
                 'bbbbbbbbbbbb']
    cv.stamp(board, 2, 9, {'b': WD(1), 'B': WD(4), 'h': WD(2)})
    for x in range(6, 12):
        cv.put(x + 2, 31, SH(80))
    return cv


def market_stall(goods):
    cv = Canvas(48, 48)
    ramp = 'roof_red' if goods == 'fruit' else 'cloth_blue'
    # posts
    for px in (3, 42):
        for y in range(8, 44):
            cv.set(px, y, WD(1)); cv.set(px + 1, y, WD(3)); cv.set(px + 2, y, WD(1))
    # awning (striped canopy, 3/4)
    for y in range(2, 13):
        for x in range(1, 47):
            stripe = (x // 4) % 2
            c = C(ramp, 3) if stripe else C('stone_warm', 5)
            if y == 2:
                c = C(ramp, 1) if stripe else C('stone_warm', 3)
            if y >= 11:
                c = C(ramp, 2) if stripe else C('stone_warm', 4)
            cv.set(x, y, c)
    for x in range(1, 47):
        if x % 4 != 2:
            cv.set(x, 13, C(ramp, 2) if (x // 4) % 2 else C('stone_warm', 4))
        cv.put(x, 14, SH(90))
    # table with goods
    for y in range(30, 36):
        for x in range(2, 46):
            cv.set(x, y, WD(3) if y > 30 else WD(4))
    for x in range(2, 46):
        cv.set(x, 36, WD(1))
        cv.set(x, 37, WD(2))
    for y in range(37, 44):
        for x in range(4, 44):
            cv.set(x, y, WD(1) if (x % 8 == 0) else C('shadow', 2))
    cols = (['roof_red', 'gold', 'grass', 'roof_red', 'gold'] if goods == 'fruit'
            else ['cloth_blue', 'cloth_purple', 'roof_red', 'roof_green', 'gold'])
    for i, col in enumerate(cols):
        gx = 5 + i * 8
        if goods == 'fruit':
            cv.stamp(['.aa.', 'aAAa', 'aaaa'], gx, 27, {'a': C(col, 2), 'A': C(col, 4)})
            cv.stamp(['.a.', 'aAa'], gx + 1, 25, {'a': C(col, 3), 'A': C(col, 4)})
        else:
            for y in range(24, 30):
                for x in range(gx, gx + 6):
                    cv.set(x, y, C(col, 3) if (y - 24) % 2 == 0 else C(col, 2))
            for x in range(gx, gx + 6):
                cv.set(x, 24, C(col, 4))
    for y in range(36, 46):
        cv.put(46, y, SH(70))
    for x in range(4, 46):
        cv.put(x, 44, SH(90))
        cv.put(x + 1, 45, SH(50))
    return cv


def stairs_stone(part):
    cv = Canvas(16, 16)
    for y in range(16):
        k = y % 4
        for x in range(16):
            c = [S(5), S(4), S(3), S(1)][k]
            if (x * 5 + (y // 4) * 3) % 13 == 0 and k in (1, 2):
                c = S(2)
            cv.set(x, y, c)
        if part == 'l':
            cv.set(0, y, S(1)); cv.set(1, y, S(5)); cv.set(2, y, S(3))
        if part == 'r':
            cv.set(15, y, S(0)); cv.set(14, y, S(2)); cv.set(13, y, S(2))
    return cv


def step_stone():
    cv = Canvas(16, 16)
    for x in range(1, 15):
        for y in range(9, 14):
            cv.set(x, y, S(5) if y == 9 else (S(4) if y < 12 else S(2)))
        cv.set(x, 14, S(1))
        cv.put(x + 1, 15, SH(70))
    cv.set(1, 9, S(4))
    return cv


def lamp_base():
    cv = Canvas(16, 16)
    for y in range(8, 15):
        for x in range(3, 13):
            dx = (x + 0.5 - 8) / 5
            dy = (y + 0.5 - 11) / 3.5
            if dx * dx + dy * dy <= 1:
                c = S(4) if dy < -0.2 else (S(3) if dy < 0.5 else S(2))
                if dx * dx + dy * dy > 0.7:
                    c = S(1)
                cv.set(x, y, c)
    for x in range(6, 10):
        cv.set(x, 10, M(0) if x in (6, 9) else M(1))
    for x in range(5, 14):
        cv.put(x + 1, 15, SH(70))
    return cv


def window_tile(lit, shutters=None, box=None, arch=False, tall=False, round_=False):
    cv = Canvas(16, 32 if tall else 16)
    if round_:
        from prefabs import rose_window
        rose_window(cv, 3, 3, 10, ramp='stone_warm')
        return cv
    if tall:
        bld.window(cv, 4, 4, 8, 22, lit=lit, arch=True, frame='stone', mullion=False)
        for y in range(7, 25):
            cv.set(8, y, S(2))
        return cv
    bld.window(cv, 4, 2, 8, 9, lit=lit, shutters=shutters, box=box)
    return cv


def door_tile(kind, opened):
    if kind == 'double':
        cv = Canvas(32, 32)
        bld.door(cv, 6, 8, w=20, h=22, arch=True, double=True, opened=opened, frame='stone')
        return cv
    cv = Canvas(16, 32)
    if kind == 'arch':
        bld.door(cv, 2, 12, w=12, h=18, arch=True, opened=opened, frame='stone')
    else:
        bld.door(cv, 3, 12, w=10, h=18, arch=False, opened=opened, frame='wood')
    return cv


def chimney_tile():
    cv = Canvas(16, 32)
    bld.chimney(cv, 4, 6, 8, 26, smoke=True)
    return cv


def awning_tile(ramp, part):
    cv = Canvas(16, 16)
    bld.awning(cv, 0 if part != 'l' else 2, 3, 16 if part == 'm' else 14, ramp)
    if part == 'r':
        cv2 = Canvas(16, 16)
        cv2.paste(cv.crop(0, 0, 14, 16), 0, 0)
        for y in range(3, 10):
            cv2.set(14, y, WD(1))
        return cv2
    return cv


def banner_tile(ramp):
    cv = Canvas(16, 32)
    for x in range(2, 14):
        cv.set(x, 2, M(1))
    cv.set(2, 1, M(0))
    bld.banner(cv, 4, 3, 8, 26, ramp)
    return cv


def sign_tile(icon):
    cv = Canvas(16, 16)
    bld.hanging_sign(cv, 2, 4, icon, w=12, h=10)
    return cv


# ------------------------------------------------------------------ assemble
def build():
    sh = Sheet()
    # roofs
    for name, ramp, style in ROOFS:
        ch = roof_chunk(ramp, style, seed=len(name))
        for ri, r in enumerate(('ridge', 'field', 'eave')):
            for ci, c in enumerate(('l', 'm', 'r')):
                sh.tile('roof_%s_%s_%s' % (name, r, c), cut(ch, ci, ri))
    sh.newline()
    for name, ramp, style in ROOFS:
        g = gable_obj(ramp)
        sh.obj('gable_' + name, g, [0, 1], [], 2, kind='piece')
    sh.newline()
    for mat in ('timber', 'stone', 'planks'):
        ch = wall_chunk(mat)
        cols = ('l', 'm', 'p', 'r') if mat == 'timber' else ('l', 'm', 'r')
        for ri, r in enumerate(('top', 'bot')):
            for ci, c in enumerate(cols):
                sh.tile('wall_%s_%s_%s' % (mat, r, c), cut(ch, ci, ri))
    sh.newline()
    for kind in ('plain', 'arch'):
        for op in (False, True):
            sh.tile('door_%s_%s' % (kind, 'open' if op else 'closed'), door_tile(kind, op),
                    collision='none')
    for op in (False, True):
        sh.tile('door_double_%s' % ('open' if op else 'closed'), door_tile('double', op), collision='none')
    sh.tile('window_tall_lit', window_tile(True, tall=True))
    sh.tile('window_tall_dark', window_tile(False, tall=True))
    sh.tile('chimney_stone', chimney_tile(), collision='none')
    for col, ramp in (('blue', 'cloth_blue'), ('red', 'roof_red'), ('purple', 'cloth_purple')):
        sh.tile('banner_' + col, banner_tile(ramp), collision='none')
    sh.newline()
    sh.tile('window_lit', window_tile(True))
    sh.tile('window_dark', window_tile(False))
    sh.tile('window_shutter_lit', window_tile(True, shutters='roof_green'))
    sh.tile('window_shutter_dark', window_tile(False, shutters='cloth_blue'))
    sh.tile('window_box_lit', window_tile(True, box='blossom'))
    sh.tile('window_box_dark', window_tile(False, box='cloth_purple'))
    sh.tile('window_round', window_tile(True, round_=True))
    for col, ramp in (('red', 'roof_red'), ('green', 'roof_green'), ('blue', 'cloth_blue')):
        for part in ('l', 'm', 'r'):
            sh.tile('awning_%s_%s' % (col, part), awning_tile(ramp, part), collision='none')
    sh.newline()
    for icon, sid in (('mug', 'inn'), ('bed', 'inn_bed'), ('potion', 'item'), ('hammer', 'smith'),
                      ('bread', 'bakery'), ('book', 'library'), ('bell', 'chapel')):
        sh.tile('sign_' + sid, sign_tile(icon), collision='none')
    sh.tile('lamp_base', lamp_base(), collision='solid')
    for part in ('l', 'm', 'r'):
        sh.tile('stairs_stone_' + part, stairs_stone(part), collision='none')
    sh.tile('step_stone', step_stone(), collision='none')
    sh.newline()
    # fences (line16)
    for fid, kind in (('fence_wood', 'wood'), ('wall_low', 'stone'), ('fence_iron', 'iron')):
        cv = line16(kind)
        x, y = sh.alloc(128, 32)
        sh.cv.paste(cv, x, y)
        sh.meta['tiles'][fid] = {'x': x, 'y': y, 'w': 16, 'h': 16, 'collision': 'solid', 'autotile': 'line16'}
    sh.newline()
    # bridges
    bw = bridge_wood_h()
    for ri, r in enumerate(('n', 's', 'piles')):
        for ci, c in enumerate(('l', 'm', 'r')):
            sh.tile('bridge_wood_h_%s_%s' % (r, c), cut(bw, ci, ri), collision='none' if r != 'piles' else 'water')
    bv = bridge_wood_v()
    for ri, r in enumerate(('n', 'm', 's')):
        for ci, c in enumerate(('w', 'e')):
            sh.tile('bridge_wood_v_%s_%s' % (r, c), cut(bv, ci, ri), collision='none')
    bs = bridge_stone_h()
    for ri, r in enumerate(('n', 's', 'arch')):
        for ci, c in enumerate(('l', 'm', 'r')):
            sh.tile('bridge_stone_h_%s_%s' % (r, c), cut(bs, ci, ri), collision='none' if r != 'arch' else 'water')
    sh.newline()
    bsv = bridge_stone_v()
    for ri, r in enumerate(('n', 'm', 's')):
        for ci, c in enumerate(('w', 'm', 'e')):
            sh.tile('bridge_stone_v_%s_%s' % (r, c), cut(bsv, ci, ri), collision='none')
    sh.newline()
    # objects
    sh.obj('well', well(), [0, 2], [[0, 0], [1, 0]], 2)
    sh.obj('signpost', signpost(False), [0, 1], [[0, 0]], 1)
    sh.obj('signpost_arrow', signpost(True), [0, 1], [[0, 0]], 1)
    sh.obj('market_stall_fruit', market_stall('fruit'), [0, 2], [[0, 0], [1, 0], [2, 0]], 2)
    sh.obj('market_stall_cloth', market_stall('cloth'), [0, 2], [[0, 0], [1, 0], [2, 0]], 2)
    sh.newline()
    H = sh.y
    return sh.cv.crop(0, 0, 512, H), sh.meta
