"""Building primitives for 3/4-view architecture (top-left light). All draw into a pxlib.Canvas.

Coordinates are pixels. Ramps come from palette.json. Each primitive is self-contained so the modular kit
tiles and the prefab buildings are drawn by exactly the same code.
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32

S = lambda i: C('stone_warm', i)
K = lambda i: C('stone_cool', i)
WD = lambda i: C('wood', i)
G = lambda i: C('grass', i)
GOLD = lambda i: C('gold', i)
F = lambda i: C('fire', i)
M = lambda i: C('metal', i)


# ------------------------------------------------------------------ walls
def plaster(cv, x, y, w, h, seed=0, tone='cream'):
    base, shade, hi = S(5), S(4), C('sand', 3)
    if tone == 'warm':
        base, shade, hi = C('sand', 3), C('sand', 2), C('fire', 5)
    if tone == 'stone':
        base, shade, hi = S(4), S(3), S(5)
    for yy in range(h):
        for xx in range(w):
            c = base
            r = rnd(x + xx, y + yy, seed, 3)
            if r < 0.06:
                c = shade
            elif r > 0.985:
                c = hi
            cv.set(x + xx, y + yy, c)


def stone_blocks(cv, x, y, w, h, ramp='stone_warm', course=5, seed=0, rough=False):
    R = lambda i: C(ramp, i)
    for yy in range(h):
        row = yy // course
        off = (row * 5 + seed) % 9
        for xx in range(w):
            ly = yy % course
            bx = (xx + off) % 9
            c = R(3)
            if ly == course - 1 or bx == 8:
                c = R(1)
            elif ly == 0:
                c = R(4)
            elif bx == 0:
                c = R(4) if ly < course - 2 else R(3)
            elif ly == course - 2 or bx == 7:
                c = R(2)
            elif rnd(x + xx, y + yy, seed, 5) < 0.07:
                c = R(2)
            if rough and rnd((xx + off) // 9, row, seed, 6) < 0.25 and c == R(3):
                c = R(2)
            cv.set(x + xx, y + yy, c)


def planks_v(cv, x, y, w, h, seed=0, dark=False):
    b = 1 if dark else 0
    for yy in range(h):
        for xx in range(w):
            k = (xx + seed) % 4
            c = WD(3 - b) if k in (1, 2) else (WD(4 - b) if k == 0 else WD(1))
            if rnd(x + xx, y + yy, seed, 8) < 0.05 and k != 3:
                c = WD(2 - b)
            cv.set(x + xx, y + yy, c)


def planks_h(cv, x, y, w, h, seed=0):
    for yy in range(h):
        for xx in range(w):
            k = yy % 4
            c = WD(3) if k in (1, 2) else (WD(4) if k == 0 else WD(1))
            if (xx + (yy // 4) * 7 + seed) % 13 == 0 and k != 3:
                c = WD(1)
            cv.set(x + xx, y + yy, c)


def beam_h(cv, x, y, w, t=2):
    for xx in range(w):
        cv.set(x + xx, y, WD(2))
        for k in range(1, t):
            cv.set(x + xx, y + k, WD(1))


def beam_v(cv, x, y, h, t=2):
    for yy in range(h):
        cv.set(x, y + yy, WD(2))
        for k in range(1, t):
            cv.set(x + k, y + yy, WD(1))


def brace(cv, x0, y0, x1, y1):
    """Diagonal timber brace, 2 px thick."""
    n = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(n + 1):
        px = x0 + round((x1 - x0) * i / n)
        py = y0 + round((y1 - y0) * i / n)
        cv.set(px, py, WD(1))
        cv.set(px + 1, py, WD(2) if x1 > x0 else WD(1))


def timber_frame(cv, x, y, w, h, posts, mid=None, braces=()):
    """Timber frame over plaster: corner posts, intermediate posts (x offsets), optional mid rail, braces."""
    beam_h(cv, x, y, w)
    beam_h(cv, x, y + h - 2, w)
    if mid is not None:
        beam_h(cv, x, y + mid, w)
    for px in [0, w - 2] + list(posts):
        beam_v(cv, x + px, y, h)
    for (bx0, by0, bx1, by1) in braces:
        brace(cv, x + bx0, y + by0, x + bx1, y + by1)


# ------------------------------------------------------------------ openings
def window(cv, x, y, w=8, h=10, lit=True, shutters=None, box=None, arch=False, mullion=True, frame='wood'):
    """Window with frame at (x, y) of outer size w x h. shutters: ramp name or None. box: flower ramp or None."""
    fr_d, fr_l = (WD(1), WD(3)) if frame == 'wood' else (S(1), S(4))
    # frame
    for yy in range(h):
        for xx in range(w):
            edge = xx in (0, w - 1) or yy in (0, h - 1)
            if arch and yy < 2 and (xx < 2 - yy or xx > w - 3 + yy):
                continue
            cv.set(x + xx, y + yy, fr_d if edge else None)
    # glass
    gx0, gy0, gx1, gy1 = x + 1, y + 1, x + w - 2, y + h - 2
    for yy in range(gy0, gy1 + 1):
        for xx in range(gx0, gx1 + 1):
            if arch and (yy - y) < 2 and ((xx - x) < 2 - (yy - y) + 1 or (xx - x) > w - 4 + (yy - y)):
                continue
            ry = (yy - gy0) / max(1, gy1 - gy0)
            if lit:
                c = GOLD(4) if ry < 0.55 else F(3)
                if (xx - gx0) + (yy - gy0) < 2:
                    c = GOLD(5)
            else:
                c = C('water', 1) if ry > 0.5 else C('water', 2)
                if (xx - gx0) - (yy - gy0) in (1, 2) and yy - gy0 < 4:
                    c = C('ice', 2)
            cv.set(xx, yy, c)
    if arch:
        cv.set(x + 1, y + 1, fr_d)
        cv.set(x + w - 2, y + 1, fr_d)
    if mullion:
        mx = x + w // 2
        for yy in range(gy0, gy1 + 1):
            cv.set(mx, yy, fr_d if not lit else WD(2))
        my = y + h // 2
        for xx in range(gx0, gx1 + 1):
            cv.set(xx, my, fr_d if not lit else WD(2))
    # sill
    for xx in range(-1, w + 1):
        cv.set(x + xx, y + h, fr_l if xx > -1 else fr_d)
    cv.set(x + w, y + h, fr_d)
    if shutters:
        R = lambda i: C(shutters, i)
        for side in (-1, 1):
            sx = x - 3 if side < 0 else x + w
            for yy in range(h):
                for xx in range(3):
                    c = R(3) if xx != (0 if side < 0 else 2) else R(1)
                    if yy in (0, h - 1):
                        c = R(1)
                    if yy == h // 2 and xx == 1:
                        c = R(2)
                    cv.set(sx + xx, y + yy, c)
    if box:
        flower_box(cv, x - 1, y + h + 1, w + 2, box)


def flower_box(cv, x, y, w, ramp):
    for xx in range(w):
        cv.set(x + xx, y + 1, WD(3))
        cv.set(x + xx, y + 2, WD(1))
    for xx in range(w):
        r = h32(x + xx, y, 31) % 4
        cv.set(x + xx, y, G(2) if r == 0 else (C(ramp, 3) if r % 2 else C(ramp, 2)))
        if r == 3:
            cv.set(x + xx, y - 1, C(ramp, 3))
        if r == 1 and xx % 2 == 0:
            cv.set(x + xx, y - 1, G(3))
    cv.put(x + 1, y + 3, SH(80))
    cv.put(x + w - 1, y + 3, SH(80))


def door(cv, x, y, w=10, h=18, arch=True, opened=False, ramp='wood', frame='stone', double=False):
    R = (lambda i: C(ramp, i)) if ramp else WD
    fr_d, fr_l = (S(1), S(4)) if frame == 'stone' else (WD(1), WD(3))
    for yy in range(h):
        for xx in range(w):
            ay = yy
            if arch:
                # rounded top: radius w/2
                cx = (w - 1) / 2
                r = w / 2
                if ay < r and (xx - cx) ** 2 + (ay - r) ** 2 > (r + 0.3) ** 2:
                    continue
                on_edge = (xx - cx) ** 2 + (ay - r) ** 2 > (r - 1.0) ** 2 and ay < r
            else:
                on_edge = yy == 0
            edge = xx in (0, w - 1) or on_edge
            if edge:
                c = fr_d if (xx == w - 1 or (on_edge and xx > w // 2)) else fr_l
                cv.set(x + xx, y + yy, c)
                continue
            if opened:
                c = DARK if yy > 3 else C('shadow', 1)
                if yy > h - 4:
                    c = C('shadow', 1)
                cv.set(x + xx, y + yy, c)
                continue
            k = (xx - 1) % 3
            c = R(3) if k == 1 else (R(4) if k == 0 else R(1))
            if double and xx == w // 2:
                c = R(1)
            cv.set(x + xx, y + yy, c)
    if not opened:
        # iron straps and knob
        for sy in (y + h // 3, y + (2 * h) // 3 + 1):
            for xx in range(1, w - 1):
                cv.set(x + xx, sy, M(1) if xx % 3 else M(0))
        kx = x + w - 3 if not double else x + w // 2 - 1
        cv.set(kx, y + h // 2 + 1, GOLD(4))
        if double:
            cv.set(kx + 2, y + h // 2 + 1, GOLD(4))
    # threshold step
    for xx in range(-1, w + 1):
        cv.set(x + xx, y + h, S(4) if xx < w else S(2))
        cv.set(x + xx, y + h + 1, S(2))


# ------------------------------------------------------------------ roofs
def shingles(cv, x, y, w, h, ramp, seed=0, slate=False, mask=None, light_rows=2, moss=0.0, style=None):
    """Roof covering. style: 'clay' (barrel tiles in columns), 'slate' (staggered flat slates), 'shake' (wood).
    mask(xx, yy) -> bool restricts drawing. A soft vertical gradient: brighter near the ridge."""
    R = lambda i: C(ramp, i)
    style = style or ('slate' if slate else 'clay')
    for yy in range(h):
        g = yy / max(1, h - 1)              # 0 at ridge, 1 at eave
        for xx in range(w):
            if mask is not None and not mask(xx, yy):
                continue
            if style == 'clay':
                # barrel tiles: continuous vertical channels, soft course lips every 6 px
                course, colw = 6, 4
                row = yy // course
                ly = yy % course
                k = (xx + seed) % colw
                body = [R(4), R(3), R(2), R(1)][k]
                if k == 0 and g > 0.65:
                    body = R(3) if ly < course - 2 else R(4)
                if ly == course - 1:
                    c = [R(2), R(2), R(1), R(0)][k]
                elif ly == 0:
                    c = [R(5) if g < 0.35 else R(4), R(4), R(3), R(1)][k]
                else:
                    c = body
            elif style == 'slate':
                course, sw = 4, 6
                row = yy // course
                ly = yy % course
                off = (row * 3) % sw
                k = (xx + off) % sw
                unit = (xx + off) // sw
                tone = rnd(unit, row, seed, 41)
                body = R(3) if tone > 0.15 else R(2)
                if ly == course - 1:
                    c = R(1)
                elif k == sw - 1:
                    c = R(1) if ly > 0 else R(2)
                elif ly == 0:
                    c = R(4) if (k < 3 or g < 0.3) else body
                elif ly == course - 2:
                    c = R(2) if g > 0.5 else body
                else:
                    c = body
            else:  # shake
                course, sw = 4, 3
                row = yy // course
                ly = yy % course
                off = h32(row, seed, 43) % sw
                k = (xx + off) % sw
                unit = (xx + off) // sw
                tone = rnd(unit, row, seed, 44)
                body = R(3) if tone > 0.3 else (R(2) if tone > 0.1 else R(4))
                c = R(1) if ly == course - 1 or (k == sw - 1 and ly > 0 and tone < 0.5) else body
                if ly == 0 and k == 0:
                    c = R(4)
            if moss and c in (R(3), R(2)) and rnd(xx // 2, yy // 2, seed, 42) < moss:
                c = G(2) if (xx + yy) % 2 else G(3)
            cv.set(x + xx, y + yy, c)


def roof_side(cv, x, y, w, h, ramp, hip=4, seed=0, slate=False, moss=0.0, style=None):
    """Side-gabled / hipped roof seen in 3/4: trapezoid, ridge at top, eave at bottom.
    Occupies [x, x+w) x [y, y+h). Bottom 2 rows are the eave (fascia)."""
    R = lambda i: C(ramp, i)
    body_h = h - 2

    def inside(xx, yy):
        inset = max(0, hip - yy // 2) if hip else 0
        return inset <= xx < w - inset
    shingles(cv, x, y + 2, w, body_h - 2, ramp, seed=seed, slate=slate,
             mask=lambda xx, yy: inside(xx, yy + 2), moss=moss, style=style)
    # ridge cap
    for xx in range(w):
        if not inside(xx, 0):
            continue
        cv.set(x + xx, y, R(0))
        cv.set(x + xx, y + 1, R(4) if xx % 4 else R(2))
        if inside(xx, 2):
            cv.set(x + xx, y + 2, R(2))
    # hip edges
    for yy in range(body_h):
        ins = [xx for xx in range(w) if inside(xx, yy)]
        if not ins:
            continue
        l, r = ins[0], ins[-1]
        cv.set(x + l, y + yy, R(0))
        cv.set(x + r, y + yy, R(0))
        if l + 1 < r:
            cv.set(x + l + 1, y + yy, R(4) if yy > 1 else R(4))
            cv.set(x + r - 1, y + yy, R(2))
    # eave: dark drip edge + fascia board
    for xx in range(w):
        cv.set(x + xx, y + body_h, R(0))
        cv.set(x + xx, y + body_h + 1, WD(2) if 0 < xx < w - 1 else WD(1))
    cv.set(x, y + body_h + 1, WD(1))


def eave_shadow(cv, x, y, w, rows=3):
    for k in range(rows):
        a = [110, 70, 36][k] if k < 3 else 20
        for xx in range(w):
            if k == 2 and (xx + y) % 2:
                continue
            cv.put(x + xx, y + k, SH(a))


def gable_front(cv, cx, base_y, half, ramp, wall='plaster', slope=1, window_kind=None, seed=0, timber=True):
    """Front-facing gable: a triangle of wall with bargeboard roof edges, apex at (cx, base_y - height)."""
    R = lambda i: C(ramp, i)
    height = half // slope
    # wall triangle
    for yy in range(height):
        span = (yy * slope)
        y0 = base_y - height + yy
        for xx in range(-span, span + 1):
            if wall == 'plaster':
                c = S(5) if rnd(cx + xx, y0, seed, 7) > 0.06 else S(4)
            elif wall == 'stone':
                c = S(4) if (xx + yy) % 7 else S(3)
            else:
                c = WD(3) if (xx + 40) % 4 else WD(1)
            cv.set(cx + xx, y0, c)
    if timber and wall == 'plaster':
        beam_v(cv, cx - 1, base_y - height + 3, height - 3)
        beam_h(cv, cx - half + 2, base_y - 2, 2 * half - 3)
        brace(cv, cx - 2, base_y - height + 6, cx - half // 2, base_y - 3)
        brace(cv, cx + 1, base_y - height + 6, cx + half // 2 - 1, base_y - 3)
    if window_kind == 'round':
        round_window(cv, cx - 3, base_y - height // 2 - 2, 7, lit=True)
    elif window_kind == 'small':
        window(cv, cx - 3, base_y - height // 2 - 3, 6, 7, lit=True, mullion=False)
    # bargeboards (3 px roof edge along both slopes) + finial
    for yy in range(height + 2):
        y0 = base_y - height - 2 + yy
        span = yy * slope
        for side in (-1, 1):
            for t in range(4):
                px = cx + side * (span - t + 1)
                if side > 0:
                    px = cx + (span - t + 1)
                c = [R(0), R(4) if side < 0 else R(3), R(2), WD(1)][t]
                if yy > height + 1:
                    continue
                cv.set(px, y0, c)
    cv.set(cx, base_y - height - 3, R(0))
    cv.set(cx, base_y - height - 4, GOLD(3))
    cv.set(cx, base_y - height - 5, GOLD(4))


def round_window(cv, x, y, d, lit=True):
    r = d / 2
    for yy in range(d):
        for xx in range(d):
            dd = (xx + 0.5 - r) ** 2 + (yy + 0.5 - r) ** 2
            if dd <= r * r:
                if dd > (r - 1.1) ** 2:
                    cv.set(x + xx, y + yy, WD(1))
                else:
                    c = GOLD(4) if lit else C('water', 2)
                    if xx == d // 2 or yy == d // 2:
                        c = WD(2)
                    cv.set(x + xx, y + yy, c)


def chimney(cv, x, y, w, h, ramp='stone_warm', smoke=False):
    R = lambda i: C(ramp, i)
    for yy in range(h):
        for xx in range(w):
            c = R(3)
            if (yy % 4 == 3) or ((xx + (yy // 4) * 2) % 4 == 3):
                c = R(1)
            if xx == 0:
                c = R(4) if yy % 4 != 3 else R(2)
            if xx == w - 1:
                c = R(1)
            cv.set(x + xx, y + yy, c)
    # cap
    for xx in range(-1, w + 1):
        cv.set(x + xx, y - 1, R(4) if xx < w else R(1))
        cv.set(x + xx, y, R(2))
    for xx in range(w - 2):
        cv.set(x + 1 + xx, y - 2, DARK)
    cv.set(x - 1, y - 2, R(1))
    cv.set(x + w, y - 2, R(1))
    if smoke:
        for i, (dx, dy) in enumerate([(1, -4), (2, -5), (1, -6), (3, -7), (2, -9)]):
            cv.put(x + dx, y + dy, C('metal', 3, 150 - i * 20))
            cv.put(x + dx + 1, y + dy, C('metal', 4, 120 - i * 20))


def dormer(cv, x, y, ramp, lit=True):
    """Small roof dormer 10 x 11 px at (x, y)."""
    R = lambda i: C(ramp, i)
    for yy in range(4, 11):
        for xx in range(1, 9):
            cv.set(x + xx, y + yy, S(5))
    window(cv, x + 2, y + 5, 6, 6, lit=lit, mullion=False)
    for yy in range(5):
        for xx in range(-1, 11):
            if abs(xx - 4.5) <= yy + 1.5:
                c = R(3) if (xx + yy) % 3 else R(2)
                if abs(xx - 4.5) > yy + 0.5:
                    c = R(0)
                cv.set(x + xx, y + yy, c)
    for xx in range(-1, 11):
        cv.set(x + xx, y + 5 if xx in (-1, 10) else y + 4, R(0) if xx in (-1, 10) else R(2))


# ------------------------------------------------------------------ attachments
def awning(cv, x, y, w, ramp_a, ramp_b=None, depth=5):
    """Striped cloth awning with scalloped hem."""
    A = lambda i: C(ramp_a, i)
    for yy in range(depth):
        for xx in range(w):
            stripe = (xx // 3) % 2
            c = (A(3) if stripe else C('stone_warm', 5)) if ramp_b is None else (A(3) if stripe else C(ramp_b, 4))
            if yy == 0:
                c = A(1) if stripe else C('stone_warm', 4)
            elif yy == depth - 1:
                c = A(2) if stripe else C('stone_warm', 4)
            cv.set(x + xx, y + yy, c)
    for xx in range(w):
        if xx % 3 != 1:
            stripe = (xx // 3) % 2
            cv.set(x + xx, y + depth, A(2) if stripe else C('stone_warm', 4))
    for xx in range(w):
        cv.put(x + xx, y + depth + 1 + (0 if xx % 3 == 1 else 1), SH(90))
        cv.put(x + xx, y + depth + 2 + (0 if xx % 3 == 1 else 1), SH(50))
    cv.set(x - 1, y, WD(1))
    cv.set(x + w, y, WD(1))


ICONS = {
    'bed': (['............',
             '.m..........',
             '.mPPP.......',
             '.mBBBBBBBBm.',
             '.mBBBBBBBBm.',
             '.m........m.'], {'m': WD(1), 'P': C('stone_warm', 5), 'B': C('cloth_blue', 3)}),
    'mug': (['...ff.....',
             '..wwww....',
             '..gggg.g..',
             '..gGGg..g.',
             '..gGGg.g..',
             '..gggg....'], {'f': WHITE, 'w': C('stone_warm', 5), 'g': GOLD(2), 'G': GOLD(4)}),
    'potion': (['...cc...',
                '...dd...',
                '..rRRr..',
                '.rRWRRr.',
                '.rRRRRr.',
                '..rrrr..'], {'c': WD(3), 'd': C('ice', 2), 'r': C('roof_red', 2), 'R': C('roof_red', 4),
                              'W': WHITE}),
    'hammer': (['.MMMM...',
                '.MmmM...',
                '...w....',
                '...w....',
                '...w....',
                '...w....'], {'M': M(2), 'm': M(1), 'w': WD(3)}),
    'bread': (['..bBBb...',
               '.bBhBhb..',
               '.bBBBBb..',
               '..bbbb...'], {'b': C('wood', 3), 'B': C('wood', 4), 'h': C('gold', 4)}),
    'book': (['.bbbbbb.',
              '.bWWWWb.',
              '.bWbbWb.',
              '.bWWWWb.',
              '.bbbbbb.'], {'b': C('cloth_blue', 2), 'W': GOLD(4)}),
    'bell': (['...g...',
              '..ggg..',
              '..gGg..',
              '.gGGGg.',
              'ggggggg',
              '...g...'], {'g': GOLD(2), 'G': GOLD(4)}),
}


def hanging_sign(cv, x, y, icon, w=14, h=10, side='left'):
    """Wooden sign on an iron bracket. (x, y) = top-left of the board."""
    # bracket
    bx0 = x - 2 if side == 'left' else x + w + 1
    for xx in range(w + 4):
        cv.set(x - 2 + xx, y - 3, M(1))
    cv.set(bx0, y - 4, M(1))
    cv.set(x + 2, y - 2, M(0))
    cv.set(x + w - 3, y - 2, M(0))
    # board
    for yy in range(h):
        for xx in range(w):
            c = WD(3) if yy not in (0, h - 1) and xx not in (0, w - 1) else WD(1)
            if yy == 1 and 0 < xx < w - 1:
                c = WD(4)
            cv.set(x + xx, y + yy, c)
    rows, cmap = ICONS[icon]
    ix = x + (w - len(rows[0])) // 2
    iy = y + (h - len(rows)) // 2
    cv.stamp(rows, ix, iy, cmap)
    for xx in range(w):
        cv.put(x + xx + 1, y + h, SH(70))


def banner(cv, x, y, w, h, ramp, emblem=True):
    R = lambda i: C(ramp, i)
    for xx in range(-1, w + 1):
        cv.set(x + xx, y, WD(1) if xx in (-1, w) else WD(3))
    for yy in range(1, h):
        for xx in range(w):
            c = R(3) if xx not in (0,) else R(4)
            if xx == w - 1:
                c = R(2)
            if yy == 2 or yy == h - 4:
                c = GOLD(3)
            cv.set(x + xx, y + yy, c)
    # swallowtail
    mid = w // 2
    for xx in range(w):
        for k in range(3):
            if abs(xx - mid + 0.5) < (3 - k) * 0.8 and False:
                pass
    for xx in range(w):
        if abs(xx - (w - 1) / 2) < 1.2:
            cv.set(x + xx, y + h - 1, None)
            cv.a[y + h - 1, x + xx] = (0, 0, 0, 0)
    if emblem:
        ex, ey = x + w // 2 - 1, y + h // 2 - 1
        cv.set(ex, ey, GOLD(4))
        cv.set(ex + 1, ey, GOLD(4))
        cv.set(ex, ey + 1, GOLD(3))
        cv.set(ex + 1, ey + 1, GOLD(3))
        cv.set(ex - 1, ey + 1, GOLD(4))
        cv.set(ex + 2, ey + 1, GOLD(4))


def wall_lantern(cv, x, y):
    """Small wall-mounted lit lantern, 5 x 8, (x, y) top-left."""
    cv.set(x + 2, y, M(1))
    cv.set(x + 1, y + 1, M(0))
    cv.set(x + 2, y + 1, M(1))
    cv.set(x + 3, y + 1, M(0))
    for yy in range(2, 6):
        cv.set(x, y + yy, M(0))
        cv.set(x + 4, y + yy, M(0))
        for xx in range(1, 4):
            cv.set(x + xx, y + yy, GOLD(5) if yy < 4 and xx == 2 else GOLD(4))
    for xx in range(5):
        cv.set(x + xx, y + 6, M(0))
    cv.set(x + 2, y + 7, M(0))


# ------------------------------------------------------------------ whole-building helpers
def cast_shadow_right(cv, mask, ground_top, ground_bottom, width=6, a=96):
    """Soft shadow on the ground east of a building silhouette, rows ground_top..ground_bottom."""
    H, W = mask.shape
    for y in range(ground_top, ground_bottom + 1):
        xs = [x for x in range(W) if mask[y, x]]
        if not xs:
            continue
        r = max(xs)
        for k in range(1, width + 1):
            x = r + k
            if x >= cv.w:
                break
            if k == width and (x + y) % 2:
                continue
            fade = a if k < width - 1 else a // 2
            cv.put(x, y, SH(fade))
