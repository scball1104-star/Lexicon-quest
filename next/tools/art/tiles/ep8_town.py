"""The Scriptorium (Episode 8): the town kit, the Stair's arch and the two far decals -> ep8.png (E8-tiles, EPISODE8_PLAN
4.1, 4.2, 4.3 and 9.1). Imported by ep8.py.

The town is built round one image (environments cell 7): a square of marble page-stones round the Living Codex, an ink
canal in a ring with little bridges, book towers for houses (giant books stacked flat, spines out) with lit windows high
up, and the First Library's great door at the north end under the cliff of shelves. Dragon Quest rule: every building says
what it is from a phone screen by a picture sign, never a word (a bed, a bottle, a quill over an anvil, a card drawer).
Its sickness is unfinished things: the half-signs' glyph bars stop halfway until scriptorium_open.

Prefabs (kind building, doorAt): tower_quiet_rooms (the Keeper's Quiet Rooms), tower_bibliotheca (Bibliotheca
           Supplies), tower_atelier (the Glyphsmith Atelier), tower_index (the First Library Index), tower_house_a,
           tower_house_b
Square     living_codex (2 x 3, anim 3), concordance (2 x 2: 0 closed; 1..3 open and lit), bindery_stall (6 x 4: Elowen's
           register house: the awning, the desk and register, the bindery behind, the infirmary door, a line of grey
           blankets airing with linen tags), half_sign_a .. half_sign_f (1 x 2: 0 the word stops halfway, 1 finished),
           candle_post (1 x 2: 0 dark, 1..3 lit), library_gate (3 x 4, set into a 2-row face: 0 closed, the empty seal; 1
           open, the empty seal; 2 open, the seal with one line written in it)
Canon decor  booktower (1 x 3), quill (1 x 2), pagefountain (2 x 2, anim 3), goldscroll (1 x 2)
Stair      margin_arch (5 x 4: the South Margin gate; the pillars solid, the arch overhead)
Bridges    marble_bridge_* (the core bridge_stone_* tiles recoloured to marble and ink for the canal)
Decals     library_far (176 x 128, environments cell 7: the luminous open book on its pedestal and its ring, the violet
           sky keyed out; the Stair's top, mark library_far) and library_cliff (112 x 128, cell 7: the cliff of shelves,
           the town's north end, mark library_cliff)
"""
import math, os
import numpy as np
from PIL import Image
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32, hexc, NEXT, PAL, TILES_DIR
from court_props import put_frames, ellipse
from ep4_props import box
from ep7_props import R, contact_shadow, ink_outline, warm_glow
from ep8_kit import (WD, SW, SC, GD, INK, MV, CP, SA, PA, FI, RR, WA, RG, CB, PC, MB, BP, VL, VOID, VOID_DEEP, PAPER,
                     INKD, EXTRA, glyph_on, SPINE_TONES)

MT = lambda i: C('metal', i)


# ====================================================================== the book-tower builder
def book_slab(cv, x0, x1, y0, h, tone, seed):
    """One giant book lying flat, spine to the south: the spine's leather, gilt bands near each end, raised bands, a
    cream page edge on top (the book below's pages show under it)."""
    c0, c1, c2 = tone
    for y in range(y0, y0 + h):
        for x in range(x0, x1 + 1):
            v = y - y0
            if v == 0:
                c = PC(1) if (x + seed) % 3 else PC(2)
            elif v == 1:
                c = c0
            elif v == h - 1:
                c = c2
            else:
                c = c1 if (x + v + seed) % 9 else c0
            if x in (x0 + 4, x1 - 4) and 1 <= v < h - 1:
                c = GD(4) if v < h // 2 else GD(2)
            if x in (x0, x1):
                c = INKD
            cv.set(x, y, c)


def lit_window(cv, x, y, w=6, h=8, lit=True):
    for yy in range(h):
        for xx in range(w):
            if xx in (0, w - 1) or yy in (0, h - 1):
                c = WD(1)
            elif xx == w // 2 and yy > 1:
                c = WD(2)
            else:
                c = (GD(4) if (xx + yy) % 4 else FI(3)) if lit else INK(1)
                if yy == 1:
                    c = GD(5) if lit else INK(2)
            cv.set(x + xx, y + yy, c)
    cv.hline(x - 1, x + w, y + h, GD(2))


def tower_door(cv, x, y, w=10, h=16):
    for yy in range(h):
        for xx in range(w):
            arch = yy < 4 and math.hypot(xx + 0.5 - w / 2.0, yy + 0.5 - 4) > w / 2.0
            if arch:
                continue
            if xx in (0, w - 1) or (yy < 4 and math.hypot(xx + 0.5 - w / 2.0, yy + 0.5 - 4) > w / 2.0 - 1.2):
                c = GD(3) if xx < w // 2 else GD(2)
            else:
                c = WD(2) if (xx // 2) % 2 else WD(3)
                if xx == w // 2:
                    c = WD(1)
            cv.set(x + xx, y + yy, c)
    cv.set(x + w // 2 + 1, y + h // 2 + 1, GD(4))


SIGN_PICS = {
    'bed': ["........", ".##.....", ".##.....", ".#######", ".#######", ".#.....#"],
    'bottle': ["...##...", "...##...", "..####..", ".######.", ".######.", "..####.."],
    'quill': ["......##", ".....##.", "....##..", "...##...", ".####...", ".#...#.."],
    'drawer': ["########", "#......#", "#.####.#", "#......#", "#..##..#", "########"],
}


def hang_sign(cv, x, y, pic):
    """A gilt-edged board on a bracket with a picture (never a word)."""
    cv.hline(x - 2, x + 11, y - 2, MT(1))
    cv.vline(x + 1, y - 1, y, MT(1)); cv.vline(x + 8, y - 1, y, MT(1))
    box(cv, x - 1, y, x + 10, y + 9, GD(4), CP(2), GD(1), INKD, round_=False)
    for j, row in enumerate(SIGN_PICS[pic]):
        for i, ch in enumerate(row):
            if ch == '#':
                cv.set(x + 1 + i, y + 2 + j, PC(0))


def open_book_roof(cv, x0, x1, y0, h, tone):
    """The tower's cap: a giant open book laid face down over it like a tent, its leather boards, a gilt spine at the
    ridge, the page block's edge at the eaves."""
    c0, c1, c2 = tone
    cx = (x0 + x1) / 2.0
    half = (x1 - x0) / 2.0 + 2
    for y in range(y0, y0 + h):
        k = (y - y0 + 1) / float(h)
        hw = int(round(half * min(1.0, 0.25 + k)))
        for x in range(int(cx - hw), int(cx + hw) + 1):
            dx = x + 0.5 - cx
            c = c0 if dx < 0 else c1
            if y >= y0 + h - 3:
                c = PC(1) if y == y0 + h - 3 else (PC(2) if y == y0 + h - 2 else INKD)
            elif abs(dx) < 1.2:
                c = GD(4) if y % 3 else GD(2)
            elif (y - y0) % 5 == 4:
                c = c2
            if abs(abs(dx) - hw) < 0.6:
                c = INKD
            cv.set(x, y, c)


def book_tower(wt, rows, door_col, windows, sign=None, seed=0, wide_top=True):
    """A Scriptorium house: giant books stacked flat (spines out, the widths stepping a little), an open book for a roof,
    lit windows high up, a door at the foot. The footprint is the bottom two rows (the door cell open); the rest is
    overhead."""
    W, H = wt * 16 + 6, rows * 16
    cv = Canvas(W, H)
    bw = wt * 16
    roof_h = 14
    y = H - 1
    k = 0
    body_top = roof_h - 2
    slabs = []
    while y > body_top:
        h = 9 + h32(k, seed, 8600) % 5
        inset = (h32(k, seed, 8601) % 3) if k else 0
        y0 = max(body_top, y - h + 1)
        slabs.append((inset, y0, y - y0 + 1, k))
        y = y0 - 1
        k += 1
    for (inset, y0, h, kk) in slabs:
        book_slab(cv, inset, bw - 1 - inset, y0, h, SPINE_TONES[h32(kk, seed, 8602) % len(SPINE_TONES)], seed + kk)
    open_book_roof(cv, 0, bw - 1, 0, roof_h + 1, SPINE_TONES[(seed + 1) % len(SPINE_TONES)])
    for (wx, wy) in windows:
        lit_window(cv, wx, wy)
    door_meta = None
    if door_col is not None:
        dx = door_col * 16 + 3
        tower_door(cv, dx, H - 17)
        R(cv, dx - 1, H - 1, 12, 1, MB(1))
        door_meta = door_col
    if sign:
        hang_sign(cv, sign[1], sign[2], sign[0])
    for yy in range(8, H):
        for xx in range(bw, bw + 6):
            if (xx + yy) % 2 == 0 or xx < bw + 3:
                cv.put(xx, yy, SH(80))
    ink_outline(cv, INKD)
    meta = {'rect_wh': [W, H], 'anchor': [0, rows - 1],
            'footprint': [[dx_, dy] for dy in (-1, 0) for dx_ in range(wt) if not (door_meta is not None and dx_ == door_meta and dy == 0)],
            'overheadRows': rows - 2, 'doorAt': [door_meta, 0] if door_meta is not None else None, 'collision': 'solid'}
    return cv, meta


def tower_quiet_rooms():
    return book_tower(3, 5, 1, [(6, 22), (30, 22), (18, 40)], sign=('bed', 33, 52), seed=1)


def tower_bibliotheca():
    return book_tower(3, 5, 1, [(6, 24), (34, 24)], sign=('bottle', 33, 52), seed=2)


def tower_atelier():
    return book_tower(3, 5, 1, [(8, 26), (32, 22)], sign=('quill', 4, 52), seed=3)


def tower_index():
    cv, m = book_tower(5, 6, 2, [(8, 28), (24, 22), (48, 22), (64, 28), (36, 44)], sign=('drawer', 52, 68), seed=4)
    return cv, m


def tower_house_a():
    return book_tower(2, 4, 0, [(18, 20)], seed=5)


def tower_house_b():
    return book_tower(2, 5, 1, [(4, 22), (20, 34)], seed=6)


# ====================================================================== the square
def living_codex(k):
    """The Living Codex (2 x 3): a great open book on a marble pedestal, its pages written in gold that shimmers slowly
    (3 frames, a pixel's step), a soft gold light."""
    cv = Canvas(32, 48)
    contact_shadow(cv, 3, 28, 47)
    box(cv, 9, 30, 22, 46, MB(0), MB(1), MB(2), INKD, round_=False)
    box(cv, 6, 42, 25, 46, MB(0), MB(1), MB(2), INKD, round_=False)
    for x in range(10, 22, 3):
        cv.set(x, 36, GD(3))
    for y in range(14, 31):
        for x in range(1, 31):
            dx = abs(x - 15.5)
            sag = int(round(2.5 * (dx / 15.0) ** 2))
            if y < 16 + sag - (2 if dx < 2 else 0):
                continue
            c = PC(0) if x < 16 else PC(1)
            if dx < 1:
                c = PC(2)
            elif y >= 28:
                c = RR(2) if y == 28 else RR(1)
            elif (y - 18) % 3 == 0 and 2 < dx < 13 and glyph_on(x + k, y, 8700):
                c = GD(4) if (x + y + k) % 4 else GD(3)
            cv.set(x, y, c)
    for i in range(3):
        y = 12 - ((k + i * 2) % 6)
        cv.set(9 + i * 7, y, GD(4))
    ink_outline(cv, INKD)
    warm_glow(cv, 16, 18, 16, a=[56, 62, 58][k])
    return cv


def concordance(k):
    """The Concordance folio on its stand (2 x 2): 0 closed (dark leather, a clasp); 1..3 open and lit, its pages'
    glyph bars glowing gold (a slow cycle)."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 4, 27, 31)
    R(cv, 14, 20, 4, 10, WD(3))
    cv.vline(14, 20, 29, WD(4)); cv.vline(17, 20, 29, WD(1))
    R(cv, 9, 28, 14, 2, WD(2))
    for y in range(13, 21):
        dx = (y - 13) // 2
        for x in range(4 - dx, 28 + dx):
            cv.set(x, y, WD(4) if y == 13 else WD(3))
    if k == 0:
        box(cv, 6, 6, 25, 14, CP(3), CP(2), CP(1), INKD, round_=False)
        for x in range(8, 24):
            cv.set(x, 8, GD(3) if x % 2 else GD(2))
        R(cv, 14, 12, 4, 4, GD(3))
        cv.set(15, 13, INKD)
    else:
        for y in range(5, 15):
            for x in range(4, 28):
                c = PC(0) if x < 16 else PC(1)
                if x in (15, 16):
                    c = PC(2)
                elif (y - 5) % 2 == 1 and 5 < x < 27 and glyph_on(x, y, 8710):
                    c = GD(4) if (x + y + k) % 5 else GD(3)
                cv.set(x, y, c)
    ink_outline(cv, INKD)
    if k:
        warm_glow(cv, 16, 9, 12, a=[0, 66, 74, 70][k])
    return cv


def bindery_stall():
    """Elowen's register house (6 x 4): a violet and cream awning over her desk and the great register, the bindery
    shelves and press behind, the infirmary door on the right with its lamp, and in front of it a line of grey infirmary
    blankets airing, each with a small linen tag."""
    cv = Canvas(96, 64)
    contact_shadow(cv, 1, 94, 63)
    # the back wall: marble and a shelf of bound books
    box(cv, 0, 6, 95, 50, MB(0), MB(1), MB(2), INKD, round_=False)
    for x in range(2, 56):
        tone = SPINE_TONES[h32(x // 3, 8720) % len(SPINE_TONES)]
        for y in range(18, 30):
            cv.set(x, y, tone[1] if x % 3 else tone[2])
        cv.set(x, 18, tone[0])
    cv.hline(2, 55, 30, WD(2)); cv.hline(2, 55, 17, WD(2))
    # the press (bindery) at the back left
    box(cv, 4, 32, 18, 46, WD(4), WD(3), WD(1), INKD, round_=False)
    cv.vline(11, 26, 32, MT(1)); cv.hline(8, 14, 26, MT(2))
    # the awning
    for y in range(4, 14):
        for x in range(0, 60):
            stripe = (x // 6) % 2
            c = CP(3) if stripe else PC(1)
            if y >= 12:
                c = CP(2) if stripe else PC(2)
                if y == 13 and x % 6 in (2, 3):
                    c = CP(1)
            cv.set(x, y, c)
    cv.hline(0, 59, 4, INKD)
    # the desk and the register
    box(cv, 20, 38, 56, 50, WD(4), WD(3), WD(1), INKD, round_=False)
    for y in range(32, 39):
        for x in range(24, 52):
            c = PC(0) if x < 38 else PC(1)
            if x in (37, 38):
                c = PC(2)
            elif (y - 32) % 2 == 1 and glyph_on(x, y, 8721) and 25 < x < 51:
                c = INK(2)
            cv.set(x, y, c)
    cv.set(53, 34, INKD); cv.vline(54, 30, 34, PC(0))           # an inkpot and a quill
    # the infirmary door and its lamp
    tower_door(cv, 70, 30, w=14, h=20)
    R(cv, 66, 26, 22, 2, MB(2))
    lit_window(cv, 88, 22, w=5, h=6)
    cv.set(76, 24, GD(4)); cv.set(77, 24, GD(4)); cv.set(76, 23, GD(5))
    # the line of blankets (posts, a line, four grey blankets with tags)
    for px_ in (58, 94):
        cv.vline(px_, 36, 61, WD(2)); cv.vline(px_ + 1, 36, 61, WD(1))
    cv.hline(58, 95, 37, SW(2))
    for i, bx in enumerate((60, 69, 78, 87)):
        for y in range(38, 56 - (i % 2) * 2):
            for x in range(bx, bx + 7):
                c = SC(4) if (x + y) % 5 else SC(3)
                if x == bx + 6:
                    c = SC(3)
                if y == 38:
                    c = SC(5)
                cv.set(x, y, c)
        ty = 52 - (i % 2) * 2
        R(cv, bx + 4, ty, 3, 3, PC(0))
        cv.set(bx + 5, ty + 1, INK(3))
    ink_outline(cv, INKD)
    return cv


SIGN_BOARDS = [
    ['.####.', '#....#', '#.##.#', '#.##.#', '#....#', '.####.'],     # a book (the bookbinder's)
    ['..##..', '.####.', '.####.', '..##..', '..##..', '.####.'],     # a cup
    ['.####.', '######', '#.##.#', '######', '######', '.####.'],     # a loaf
    ['..#...', '..#...', '.###..', '.###..', '.###..', '#####.'],     # a candle
    ['.##...', '#..###', '.##.##', '......', '......', '......'],     # a key
    ['.....#', '....#.', '...#..', '..#...', '.#....', '#.....'],     # a needle
]


def half_sign(i, finished):
    """A shop's half-sign on a post (1 x 2): a picture and a word of thick glyph bars; 0 the word stops halfway (the
    board's right half bare, a trailing dot where the pen stopped), 1 finished (after scriptorium_open)."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 5, 10, 31)
    cv.vline(7, 14, 30, WD(3)); cv.vline(8, 14, 30, WD(1))
    box(cv, 0, 3, 15, 15, WD(4), PC(1), WD(2), INKD, round_=False)
    for j, row in enumerate(SIGN_BOARDS[i]):
        for kx, ch in enumerate(row):
            if ch == '#' and kx < 5:
                cv.set(2 + kx, 5 + j, CP(2))
    for x in range(8, 15):
        if not finished and x >= 11:
            continue
        for y in (6, 7, 10, 11):
            if glyph_on(x, (y // 4) + i * 3, 8730) or x == 8:
                cv.set(x, y, INK(1) if y in (6, 10) else INK(2))
    if not finished:
        cv.set(12, 11, INK(3))
    ink_outline(cv, INKD)
    return cv


def candle_post(k):
    """Arun's candle post (1 x 2): an iron post, a glass lantern; 0 dark (a dry wick), 1..3 lit (a slow flame, a
    pixel's change a frame)."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 5, 10, 31)
    cv.vline(7, 12, 30, MT(1)); cv.vline(8, 12, 30, INK(1))
    R(cv, 5, 29, 6, 2, INK(1))
    R(cv, 4, 2, 8, 1, INK(1))
    for y in range(3, 11):
        for x in range(4, 12):
            if x in (4, 11):
                c = INK(1)
            elif k == 0:
                c = INK(2) if (x + y) % 3 else SC(2)
            else:
                c = GD(4) if y > 5 else GD(5)
            cv.set(x, y, c)
    R(cv, 4, 11, 8, 1, INK(1))
    if k:
        fh = [0, 3, 4, 3][k]
        for t in range(fh):
            cv.set(8 - (t == fh - 1 and k == 2), 9 - t, WHITE if t < fh - 1 else FI(4))
        cv.set(7, 8, FI(4))
    else:
        cv.set(8, 9, INK(0))
    ink_outline(cv, INKD)
    if k:
        warm_glow(cv, 8, 7, 8, a=[0, 70, 78, 72][k])
    return cv


def library_gate(state):
    """The First Library's great door (3 x 4, set into a 2-row face): an ink-stone arch with gilt, two oak leaves, and in
    the tympanum the seal: an open book with nothing on it (the key taken out). 0 closed; 1 open (gold light beyond); 2
    open, the seal's book with one line written in it (after page_shelved)."""
    cv = Canvas(48, 64)
    for y in range(64):
        for x in range(48):
            arch = y < 22 and math.hypot(x + 0.5 - 24, y + 0.5 - 22) > 23
            if arch:
                continue
            outer = (y < 22 and math.hypot(x + 0.5 - 24, y + 0.5 - 22) > 21) or x in (0, 1, 46, 47)
            if outer:
                c = INK(2) if x < 24 else INK(1)
                if (y // 4 + x // 6) % 3 == 0:
                    c = GD(2)
            elif x in (2, 3, 44, 45) or (y < 22 and math.hypot(x + 0.5 - 24, y + 0.5 - 22) > 19.5):
                c = GD(4) if x < 24 else GD(3)
            elif y < 26:
                c = INK(1)                                     # the tympanum
            else:
                if state == 0:
                    c = WD(2) if ((x - 4) // 4) % 2 else WD(3)
                    if x in (23, 24):
                        c = WD(1)
                    if y in (32, 52) and 5 <= x <= 42:
                        c = GD(2)
                else:
                    c = GD(4) if y < 40 else GD(3)
                    if (x + y) % 7 == 0:
                        c = GD(5)
                    if x in (4, 5, 42, 43):
                        c = WD(1)
            cv.set(x, y, c)
    # the seal: a ring, an open book in it, empty; or with one line
    ellipse(cv, 24, 15, 8.5, 8.5, lambda dx, dy, d: GD(4) if d > 0.82 else (INK(2) if d > 0.7 else None))
    for y in range(12, 19):
        for x in range(17, 32):
            if y - 12 < abs(x - 24) * 0.2:
                continue
            c = PC(0) if x < 24 else PC(1)
            if x == 24:
                c = PC(2)
            cv.set(x, y, c)
    if state == 2:
        cv.hline(18, 22, 15, INK(1)); cv.hline(26, 30, 15, INK(1))
    ink_outline(cv, INKD)
    if state:
        warm_glow(cv, 24, 44, 14, a=60)
    return cv


# ====================================================================== canon decor
def booktower_decor():
    """booktower (canon decor, 1 x 3): a column of great books stacked upright and flat by turns, solid at its foot."""
    cv = Canvas(16, 48)
    contact_shadow(cv, 1, 14, 47)
    y = 46
    k = 0
    while y > 6:
        h = 6 + h32(k, 8740) % 4
        ins = h32(k, 8741) % 3
        book_slab(cv, 1 + ins, 14 - ins, y - h + 1, h, SPINE_TONES[k % len(SPINE_TONES)], k)
        y -= h
        k += 1
    for y2 in range(2, y + 1):
        for x in range(5, 11):
            cv.set(x, y2, PC(1) if x < 8 else PC(2))
    ink_outline(cv, INKD)
    return cv


def quill_decor():
    """quill (canon decor, 1 x 2): a giant white quill standing in a gold inkpot."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 3, 12, 31)
    box(cv, 3, 23, 12, 30, GD(4), GD(3), GD(1), INKD, round_=False)
    R(cv, 5, 22, 6, 1, INKD)
    for t in range(22):
        y = 21 - t
        x = 8 + t // 6
        cv.set(x, y, PC(2))
        w = min(3, t // 3) if t > 4 else 0
        for dx in range(1, w + 1):
            cv.set(x - dx, y + (dx // 2), PC(0))
            cv.set(x + dx, y - 1, PC(1))
    ink_outline(cv, INKD)
    return cv


def pagefountain(k):
    """pagefountain (canon decor, 2 x 2, anim 3): a marble basin throwing up a slow plume of loose pages."""
    cv = Canvas(32, 32)
    contact_shadow(cv, 2, 29, 31)
    ellipse(cv, 16, 25, 13, 5.5, lambda dx, dy, d: MB(0) if dy < -0.3 else MB(1) if d < 0.95 else MB(2))
    ellipse(cv, 16, 24, 10, 3.5, lambda dx, dy, d: INK(2) if d < 0.8 else MB(2))
    R(cv, 5, 25, 23, 4, MB(1))
    cv.hline(5, 27, 28, MB(2))
    for i in range(5):
        t = (k * 2 + i * 3) % 14
        x = 8 + i * 4 + int(round(2 * math.sin(t * 0.5 + i)))
        y = 20 - t
        if y > 0:
            R(cv, x, y, 3, 2, PC(0) if i % 2 else PC(1))
            cv.set(x + 2, y + 1, PC(2))
    ink_outline(cv, INKD)
    return cv


def goldscroll():
    """goldscroll (canon decor, 1 x 2): a gold scroll half unrolled on a marble stand."""
    cv = Canvas(16, 32)
    contact_shadow(cv, 3, 12, 31)
    box(cv, 4, 20, 11, 30, MB(0), MB(1), MB(2), INKD, round_=False)
    for y in range(6, 19):
        for x in range(3, 13):
            c = GD(4) if x < 8 else GD(3)
            if y in (6, 18):
                c = GD(2)
            elif (y - 7) % 2 == 0 and 4 < x < 12 and glyph_on(x, y, 8750):
                c = WD(2)
            cv.set(x, y, c)
    R(cv, 2, 4, 12, 2, GD(2)); R(cv, 2, 19, 12, 2, GD(2))
    ink_outline(cv, INKD)
    return cv


def margin_arch():
    """The South Margin gate (5 x 4): two ink-stone pillars and an arch of gold handwriting over the top of the Stair.
    Columns 0 and 4 solid at the foot; the arch overhead; the way through columns 1 to 3."""
    cv = Canvas(80, 64)
    for px_ in (0, 64):
        box(cv, px_ + 1, 14, px_ + 14, 63, INK(3), INK(2), INK(1), INKD, round_=False)
        for y in range(18, 60, 8):
            cv.hline(px_ + 2, px_ + 13, y, INK(0))
        box(cv, px_, 10, px_ + 15, 15, GD(4), GD(3), GD(1), INKD, round_=False)
        cv.set(px_ + 7, 24, GD(4)); cv.set(px_ + 8, 24, GD(3))
    for x in range(8, 72):
        t = (x - 40) / 32.0
        top = int(round(2 + 12 * t * t))
        for y in range(top, top + 6):
            c = INK(2)
            if y == top:
                c = GD(4)
            elif y == top + 5:
                c = INK(0)
            elif y in (top + 2, top + 3) and glyph_on(x, y - top, 8760):
                c = GD(4) if y == top + 2 else GD(2)
            cv.set(x, y, c)
    ink_outline(cv, INKD)
    return cv


# ====================================================================== the marble bridges
def marble_bridges(sh):
    """Recolour the core bridge_stone_* tiles to marble (lit to deep by luma) and ink for the canal."""
    import json
    with open(os.path.join(TILES_DIR, 'tiles.json')) as f:
        db = json.load(f)
    sheets = {}
    ramp = [INKD, INK(2), MB(2), MB(1), MB(0), PC(0)]
    out = []
    for tid, m in db['tiles'].items():
        if not tid.startswith('bridge_stone_'):
            continue
        sp = os.path.join(TILES_DIR, m['sheet'])
        if sp not in sheets:
            sheets[sp] = np.asarray(Image.open(sp).convert('RGBA'))
        a = sheets[sp][m['y']:m['y'] + m.get('h', 16), m['x']:m['x'] + m.get('w', 16)]
        cv = Canvas(a.shape[1], a.shape[0])
        for y in range(a.shape[0]):
            for x in range(a.shape[1]):
                r, g, b, al = (int(v) for v in a[y, x])
                if al == 0:
                    continue
                L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
                c = ramp[min(len(ramp) - 1, int(L * 1.25 * len(ramp)))]
                cv.set(x, y, c if al == 255 else (c[0], c[1], c[2], al))
        nid = 'marble_bridge_' + tid[len('bridge_stone_'):]
        sh.tile(nid, cv, collision=m.get('collision', 'none'),
                note='the canal\'s marble bridge: the core %s recoloured to marble and ink (same layout rules)' % tid)
        out.append(nid)
    return out


# ====================================================================== the decals (environments cell 7)
def _cell7():
    src = os.path.join(os.path.dirname(NEXT), 'assets', 'art', 'environments.webp')
    im = Image.open(src).convert('RGB')
    w, h = im.size
    cw, ch = w // 2, h // 4
    return im.crop((cw, 3 * ch, w, 4 * ch))


def _keyed7(box_, size, keep_rule=None, min_comp=30):
    """Cut a piece of cell 7 with a hard alpha: median filter, box downscale, key the violet sky out (violet and blue,
    the lightning's lavender: blue over green and never warm), shave spurs, drop specks, close pinholes, quantize to the
    sheet palette and draw a 1 px ink outline round the mask (no soft painted edge at phone scale)."""
    from PIL import ImageFilter
    cell = _cell7()
    W, H = size
    crop = cell.crop(box_).filter(ImageFilter.MedianFilter(3)).resize((W, H), Image.BOX)
    a = np.asarray(crop).astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    sky = ((b > g + 0.06) & (b > r - 0.10)) | ((b > r) & (b > g) & (r + g + b > 1.9))
    keep = ~sky
    if keep_rule is not None:
        keep &= keep_rule(r, g, b)

    def nb(m):
        p = np.pad(m, 1)
        return p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]

    def comps(m):
        seen = np.zeros_like(m)
        res = []
        for y0 in range(H):
            for x0 in range(W):
                if not m[y0, x0] or seen[y0, x0]:
                    continue
                st, comp, edge = [(y0, x0)], [], False
                seen[y0, x0] = True
                while st:
                    cy, cx = st.pop()
                    comp.append((cy, cx))
                    edge = edge or cy in (0, H - 1) or cx in (0, W - 1)
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            st.append((ny, nx))
                res.append((comp, edge))
        return res

    for _ in range(2):
        keep = keep & (nb(keep) >= 2)
    for comp, _e in comps(keep):
        if len(comp) < min_comp:
            for cy, cx in comp:
                keep[cy, cx] = False
    for comp, edge in comps(~keep):
        if not edge and len(comp) < 12:
            for cy, cx in comp:
                keep[cy, cx] = True
    skip = set(PAL['ramps'].get('blossom', [])) | set(PAL['ramps'].get('skin_light', [])) | set(PAL['ramps'].get('skin_med', []))
    pal = np.array([hexc(x)[:3] for x in list(PAL['colors']) + EXTRA if x not in skip], np.float32) / 255.0
    cv = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            if keep[y, x]:
                col = a[y, x]
                k = int(np.argmin(((pal - col) ** 2).sum(1)))
                cv.set(x, y, tuple(int(v * 255 + 0.5) for v in pal[k]) + (255,))
    ring = (~keep) & (nb(keep) > 0)
    for y in range(H):
        for x in range(W):
            if ring[y, x]:
                cv.set(x, y, INKD)
    return cv


def library_far():
    """176 x 128 decal (the Stair's top, mark library_far): cell 7's luminous open book on its pedestal, its gold ring
    and the floating books round it, the violet sky keyed out."""
    return _keyed7((150, 14, 440, 225), (176, 128))


def library_cliff():
    """112 x 128 decal (the Scriptorium's north end, mark library_cliff): cell 7's cliff of shelves (the right-hand
    tower, its banners and lit bays), the sky keyed out."""
    return _keyed7((430, 0, 591, 184), (112, 128))


# ====================================================================== build
def build_into(sh):
    sh.newline()
    items = []
    for pid, fn in (('tower_quiet_rooms', tower_quiet_rooms), ('tower_bibliotheca', tower_bibliotheca),
                    ('tower_atelier', tower_atelier), ('tower_index', tower_index), ('tower_house_a', tower_house_a),
                    ('tower_house_b', tower_house_b)):
        cv, m = fn()
        items.append((pid, cv, m))
    items.sort(key=lambda t: (-t[1].h, t[0]))
    notes = {'tower_quiet_rooms': 'the Keeper\'s Quiet Rooms (a bed sign); door to ep8_sc_inn',
             'tower_bibliotheca': 'Bibliotheca Supplies (a bottle sign); door to ep8_sc_shop',
             'tower_atelier': 'the Glyphsmith Atelier (a quill sign); door to ep8_sc_atelier',
             'tower_index': 'the First Library Index (a card-drawer sign, wide); door to ep8_sc_index',
             'tower_house_a': 'a Scriptorium book-tower house (low)', 'tower_house_b': 'a Scriptorium book-tower house'}
    for pid, cv, meta in items:
        m = dict(meta)
        w, h = m.pop('rect_wh')
        x, y = sh.alloc(w, h)
        sh.cv.paste(cv, x, y)
        sh.meta['objects'][pid] = {'rect': [x, y, w, h], 'kind': 'building', 'note': notes[pid], **m}
    sh.newline()
    O = sh.meta['objects']
    put_frames(sh, 'living_codex', [living_codex(k) for k in range(3)], [0, 2], [[0, 0], [1, 0]], overhead=2,
               anim_ms=600, light={'color': '#f9d77a', 'radius': 3.0},
               note='the Living Codex (object codex, 2 x 3, inscription): a great open book on a pedestal, gold script '
                    'shimmering slowly')
    put_frames(sh, 'concordance', [concordance(k) for k in range(4)], [0, 1], [[0, 0], [1, 0]], overhead=1,
               closedFrame=0, litFrames=[1, 2, 3], litMs=480, light={'color': '#f9d77a', 'radius': 2.6, 'frames': [1, 2, 3]},
               note='the Concordance folio (object folio): 0 closed; 1..3 open and lit (after concordance_lit; cycle at '
                    '480 ms), then a rest and save (text key ep8_folio)')
    put_frames(sh, 'library_gate', [library_gate(s) for s in range(3)], [0, 3], [[0, 0], [2, 0]], overhead=0,
               door=[1, 0], kind='door',
               note='the First Library\'s great door (object library_gate, 3 x 4, set into a 2-row face): 0 closed, the '
                    'empty seal; 1 open (library_open); 2 open, the seal with one line (page_shelved). Cell (1, 0) is the '
                    'doorway')
    sh.newline()
    for i, ch in enumerate('abcdef'):
        put_frames(sh, 'half_sign_' + ch, [half_sign(i, False), half_sign(i, True)], [0, 1], [[0, 0]], overhead=1,
                   note='half-sign %s (sign_%s): 0 the word stops halfway, 1 finished (scriptorium_open); a picture and '
                        'glyph bars, never a word' % (ch, ch))
    put_frames(sh, 'candle_post', [candle_post(k) for k in range(4)], [0, 1], [[0, 0]], overhead=1,
               litFrames=[1, 2, 3], litMs=400, light={'color': '#f9d77a', 'radius': 2.2, 'frames': [1, 2, 3]},
               note='Arun\'s candle post on the script-road: 0 dark, 1..3 lit (cycle at 400 ms)')
    sh.newline()
    sh.obj('bindery_stall', bindery_stall(), [0, 3], [[x, 0] for x in range(6)] + [[x, -1] for x in range(6)], 2,
           note='the Scriptorium\'s register house (object stall, 6 x 4): Elowen\'s desk and register under the awning, '
                'the bindery behind, the infirmary door, the line of grey blankets with linen tags; solid on its two lower '
                'rows')
    sh.obj('margin_arch', margin_arch(), [0, 3], [[0, 0], [4, 0], [0, -1], [4, -1]], 2,
           note='the South Margin gate (5 x 4 arch at the top of the Stair): the pillars (columns 0 and 4) solid, the '
                'arch overhead, the way through columns 1 to 3')
    sh.newline()
    sh.obj('booktower', booktower_decor(), [0, 2], [[0, 0]], 2, note='booktower (canon decor, 1 x 3), solid at its foot')
    sh.obj('quill', quill_decor(), [0, 1], [[0, 0]], 1, note='quill (canon decor): a giant quill in a gold inkpot, solid')
    sh.obj('goldscroll', goldscroll(), [0, 1], [[0, 0]], 1, note='goldscroll (canon decor): a gold scroll on a stand, solid')
    put_frames(sh, 'pagefountain', [pagefountain(k) for k in range(3)], [0, 1], [[0, 0], [1, 0]], overhead=1, anim_ms=500,
               note='pagefountain (canon decor, 2 x 2): a basin throwing up loose pages, solid')
    sh.newline()
    marble_bridges(sh)
    sh.newline()
    sh.tile('library_far', library_far(), collision='none',
            note='176 x 128 decal of the First Library\'s luminous book and its ring from environments cell 7 (the violet '
                 'sky keyed out, hard alpha, 1 px ink outline) for the overhead layer at the Stair\'s top (mark '
                 'library_far)')
    sh.tile('library_cliff', library_cliff(), collision='none',
            note='112 x 128 decal of the cliff of shelves from environments cell 7 (sky keyed out) for the overhead '
                 'layer at the Scriptorium\'s north end (mark library_cliff)')
