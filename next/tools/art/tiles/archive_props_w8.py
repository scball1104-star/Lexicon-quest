"""Rootbound Archive per-floor props and landmarks (W8-archive) -> appended to assets/tiles/archive.png.

F1 Catalog Halls:     card_cabinet (object 32x32), pillar_oak (object 16x32), book_stack (object 16x16),
                      index_cards (decal), wall_drawers_<l|m|r> (16x32 face overlays), great_catalog_dial
                      (32x32 face overlay: the landmark, a brass index wheel in the drawer wall).
F2 Reading Galleries: lectern (object 16x32), hanging_lamp (16x32 tile for the map's `overhead` list),
                      gallery_window (16x32 face overlay), gallery_rose (48x32 face overlay: the landmark).
F3 Rootbound Stacks:  shelf_rooted (object 32x48), root_mass_a (32x16) and root_mass_b (16x32) overlays for wall tops,
                      root_drape (16x32 face overlay), wall_ink_seep (16x32 face overlay),
                      root_arch (80x32 tile for the map's `overhead` list: the landmark, roots strangling the
                      great door's arch).
Face overlays are solid (they sit on wall faces); decals are walkable; overhead tiles are drawn above actors.
"""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, h32, rnd
from archive_floors import (WD, GD, SW, K, GR, CY, WA, INK, E, FD, SA, SHD, MT, GalleryFace, CatalogFace,
                            StacksFace, bayer)


def face_bg(face, w_tiles=1, left=True, right=True):
    """A 2-row face background (w x 32) painted with a floor's face style, for overlays that replace a face."""
    cv = Canvas(16 * w_tiles, 32)
    for tx in range(w_tiles):
        for row, (top, bottom) in enumerate(((False, True), (True, False))):
            for y in range(16):
                for x in range(16):
                    lt = left or tx > 0
                    rt = right or tx < w_tiles - 1
                    col = face.pixel(x, y, lt, top, rt, bottom)
                    if col is not None:
                        cv.set(tx * 16 + x, row * 16 + y, col)
    return cv


# ====================================================================== F1: the Catalog Halls
def drawer_cell(cv, x0, y0, w, h, open_=False, dark=False):
    """One card drawer: lit top edge, oak front, a label card and a brass pull; open drawers show card tops."""
    for y in range(h):
        for x in range(w):
            c = WD(2) if dark else WD(3)
            if y == 0:
                c = WD(3) if dark else WD(4)
            if y == h - 1 or x == w - 1:
                c = WD(0) if dark else WD(1)
            cv.set(x0 + x, y0 + y, c)
    lx = x0 + w // 2 - 1
    cv.set(lx, y0 + 1, SA(3)); cv.set(lx + 1, y0 + 1, SA(3)); cv.set(lx + 2 if w > 5 else lx + 1, y0 + 1, SA(2))
    cv.set(lx + 1, y0 + 2, GD(3))
    if h > 4:
        cv.set(lx + 1, y0 + 3, GD(1))
    if open_:
        # pulled out: the drawer box drops 2 px and the card tops show in the gap above it
        for x in range(w - 1):
            cv.set(x0 + x, y0 - 1, SA(3) if x % 2 else SA(2))
            cv.set(x0 + x, y0 - 2, WD(1))


def card_cabinet():
    """Freestanding card catalogue: oak top seen from above, a 4 x 3 bank of drawers (one pulled out), plinth."""
    cv = Canvas(32, 32)
    # top surface
    for x in range(1, 31):
        cv.set(x, 5, WD(0))
        cv.set(x, 6, WD(3))
        cv.set(x, 7, WD(2) if x % 7 else WD(1))
        cv.set(x, 8, WD(2))
        cv.set(x, 9, WD(4) if x < 28 else WD(3))
    for (x, y) in ((1, 6), (30, 6), (1, 9), (30, 9)):
        cv.set(x, y, GD(3))
    # a few loose cards and a brass label frame on the top
    for (x, y, c) in ((6, 7, SA(3)), (7, 7, SA(3)), (8, 7, SA(2)), (20, 7, SA(3)), (21, 8, SA(3)), (22, 8, SA(2))):
        cv.set(x, y, c)
    # carcass sides
    for y in range(10, 29):
        cv.set(0, y, WD(0)); cv.set(1, y, WD(3)); cv.set(30, y, WD(1)); cv.set(31, y, WD(0))
    for x in range(1, 31):
        cv.set(x, 10, WD(1))
    # drawers: 4 columns x 3 rows, 7 x 6 each
    for r in range(3):
        for k in range(4):
            drawer_cell(cv, 2 + k * 7, 11 + r * 6, 7, 6, open_=(r == 1 and k == 2), dark=True)
    # plinth and feet
    for x in range(1, 31):
        cv.set(x, 29, WD(2))
        cv.set(x, 30, WD(0) if x in (1, 2, 29, 30) else SH(110))
    for x in range(2, 32):
        cv.put(x, 31, SH(70))
    for y in range(11, 30):
        cv.put(31, y, SH(60))
    return cv


def pillar_oak():
    """F1 column: a turned oak shaft with brass bands, a carved capital (overhead row) and a square oak base."""
    cv = Canvas(16, 32)
    for x in range(1, 15):
        cv.set(x, 1, WD(5) if 2 <= x <= 11 else WD(4))
        cv.set(x, 2, WD(4) if x < 12 else WD(3))
        cv.set(x, 3, GD(3) if x < 12 else GD(2))
        cv.set(x, 4, WD(1))
    cv.set(0, 2, WD(1)); cv.set(0, 3, WD(1)); cv.set(15, 2, WD(0)); cv.set(15, 3, WD(0))
    for x in range(3, 13):
        cv.set(x, 5, WD(3) if x < 9 else WD(2))
        cv.set(x, 6, WD(2) if x < 9 else WD(1))
    shade = [WD(0), WD(4), WD(3), WD(3), WD(2), WD(2), WD(2), WD(1), WD(1), WD(0)]
    for y in range(7, 26):
        for i, c in enumerate(shade):
            col = c
            if 3 <= i <= 7 and (y * 3 + i * 5) % 13 == 0:
                col = WD(2)
            cv.set(3 + i, y, col)
        cv.set(13, y, WD(0))
    for band in (10, 21):
        for i in range(10):
            cv.set(3 + i, band, GD(4) if i in (1, 2) else (GD(3) if i < 7 else GD(2)))
            cv.set(3 + i, band + 1, GD(1))
    for x in range(2, 14):
        cv.set(x, 26, WD(4) if x < 10 else WD(3))
        cv.set(x, 27, WD(2))
    for x in range(1, 15):
        cv.set(x, 28, WD(4) if x < 12 else WD(3))
        cv.set(x, 29, WD(2))
        cv.set(x, 30, WD(1))
    cv.set(0, 28, WD(1)); cv.set(15, 28, WD(0)); cv.set(0, 29, WD(1)); cv.set(15, 29, WD(0))
    for x in range(1, 16):
        cv.set(x, 31, DARK)
    for y in range(8, 31):
        cv.put(14, y, SH(70))
    return cv


def book_stack():
    """A knee-high pile of books on the floor (object, 1 tile, solid)."""
    cv = Canvas(16, 16)
    books = [(2, 13, 11, 'roof_red'), (3, 10, 10, 'cloth_blue'), (2, 7, 11, 'roof_green'), (4, 4, 8, 'gold')]
    for (x0, y0, w, ramp) in books:
        for x in range(w):
            cv.set(x0 + x, y0, C(ramp, 4) if x < w - 1 else C(ramp, 3))
            cv.set(x0 + x, y0 + 1, C(ramp, 3) if x % 4 else GD(3))
            cv.set(x0 + x, y0 + 2, C(ramp, 2))
        cv.set(x0 + w - 1, y0 + 1, SA(3))
        cv.set(x0 + w - 1, y0 + 2, SA(2))
    for x in range(3, 15):
        cv.put(x, 15, SH(80))
    for y in range(5, 15):
        cv.put(14, y, SH(50))
    return cv


def index_cards():
    """Decal: index cards spilled across the floor."""
    cv = Canvas(16, 16)
    for (x0, y0, rot) in ((2, 3, False), (8, 6, True), (5, 10, False), (11, 2, False)):
        w, h = (3, 5) if rot else (5, 3)
        for j in range(h):
            for i in range(w):
                c = SA(3)
                if (not rot and j == 1 and 1 <= i <= 3) or (rot and i == 1 and 1 <= j <= 3):
                    c = K(3)
                cv.set(x0 + i, y0 + j, c)
        for i in range(w):
            cv.put(x0 + i + 1, y0 + h, SH(70))
    return cv


def wall_drawers(part):
    """Floor-to-ceiling card drawers built into a face (16 x 32): a brass ladder rail, 2 x 5 drawers, plinth."""
    cv = Canvas(16, 32)
    for y in range(32):
        for x in range(16):
            cv.set(x, y, WD(1))
    for x in range(16):
        cv.set(x, 0, DARK); cv.set(x, 1, WD(0)); cv.set(x, 2, WD(2))
        cv.set(x, 3, GD(3) if x % 5 else GD(4))             # the ladder rail
        cv.set(x, 4, GD(1))
    for r in range(5):
        for k in range(2):
            drawer_cell(cv, k * 8, 5 + r * 5, 8, 5)
    for x in range(16):
        cv.set(x, 30, WD(0)); cv.set(x, 31, DARK)
        cv.set(x, 29, WD(2))
    if part == 'l':
        for y in range(2, 30):
            cv.set(0, y, WD(0)); cv.set(1, y, WD(3))
    if part == 'r':
        for y in range(2, 30):
            cv.set(15, y, WD(0)); cv.set(14, y, WD(1))
    return cv


def great_catalog_dial():
    """The F1 landmark (32 x 32 face overlay): the Great Catalog's brass index wheel set into the drawer wall,
    letters round the rim, a pointer resting on one name."""
    cv = Canvas(32, 32)
    left = wall_drawers('m')
    cv.paste(left, 0, 0)
    cv.paste(left, 16, 0)
    cx, cy = 15.5, 16.0
    for y in range(32):
        for x in range(32):
            dx, dy = x + 0.5 - (cx + 0.5), y + 0.5 - cy
            d = math.hypot(dx, dy)
            if d > 13.5:
                continue
            if d > 12.5:
                col = WD(0)
            elif d > 11.0:
                col = GD(4) if dx + dy < -4 else (GD(3) if dx + dy < 6 else GD(2))
            elif d > 10.0:
                col = GD(1)
            elif d > 7.5:
                # the letter ring: dark enamel with a pale tick per letter
                ang = math.atan2(dy, dx)
                tick = int((ang + math.pi) / (2 * math.pi) * 26) % 26
                frac = ((ang + math.pi) / (2 * math.pi) * 26) % 1
                col = WD(0)
                if 0.35 < frac < 0.65 and 8.3 < d < 9.7:
                    col = SA(3) if tick % 2 else SA(2)
            elif d > 6.5:
                col = GD(2)
            else:
                col = WD(2) if dx + dy < 0 else WD(1)
            cv.set(x, y, col)
    # the pointer, resting on a name toward the upper right
    for k in range(9):
        x = round(cx + k * 0.75)
        y = round(cy - k * 0.66)
        cv.set(x, y, GD(4))
        cv.set(x, y + 1, GD(2))
    cv.set(int(cx), int(cy), GD(5)); cv.set(int(cx) + 1, int(cy), GD(4)); cv.set(int(cx), int(cy) + 1, GD(3))
    # a glint
    cv.set(9, 7, GD(5)); cv.set(8, 8, GD(4))
    return cv


# ====================================================================== F2: the Reading Galleries
def lectern():
    """A slate lectern with a verdigris collar and an oak desk holding an open book (object, 1 tile)."""
    cv = Canvas(16, 32)
    # base
    for x in range(3, 13):
        cv.set(x, 27, K(4) if x < 9 else K(3))
        cv.set(x, 28, K(3) if x < 10 else K(2))
        cv.set(x, 29, K(2))
        cv.set(x, 30, K(1))
    cv.set(2, 28, K(1)); cv.set(13, 28, K(0)); cv.set(2, 29, K(1)); cv.set(13, 29, K(0))
    # column
    for y in range(17, 27):
        cv.set(6, y, K(1)); cv.set(7, y, K(4)); cv.set(8, y, K(3)); cv.set(9, y, K(2)); cv.set(10, y, K(0))
    for x in range(5, 12):
        cv.set(x, 20, GR(3) if x < 9 else GR(2))
        cv.set(x, 21, GR(1))
    # desk: slanted top (we see its surface), dark underside
    for y in range(7, 15):
        inset = (14 - y) // 4
        for x in range(1 + inset, 15 - inset):
            c = WD(3)
            if y == 7:
                c = WD(1)
            elif y == 14:
                c = WD(5)
            cv.set(x, y, c)
    for x in range(2, 14):
        cv.set(x, 15, WD(1))
        cv.set(x, 16, WD(0) if 4 <= x <= 11 else SH(0))
    # the open book
    cv.stamp(['.pppp.pppp.',
              'pPPPPpPPPPp',
              'pPllPpPllPp',
              'pPPPPpPlPPp',
              'ppppppppppp'], 3, 8, {'p': SW(3), 'P': SW(5), 'l': K(3)})
    cv.set(8, 12, C('roof_red', 3)); cv.set(8, 13, C('roof_red', 2))
    for x in range(4, 15):
        cv.put(x, 31, SH(80))
    return cv


def hanging_lamp():
    """Overhead tile (16 x 32): a verdigris chain and a lantern of blue-green glass with a warm core."""
    cv = Canvas(16, 32)
    for y in range(0, 15):
        if y % 3 == 0:
            cv.set(7, y, GR(3)); cv.set(8, y, GR(2))
        elif y % 3 == 1:
            cv.set(7, y, GR(1)); cv.set(8, y, GR(3))
        else:
            cv.set(7, y, GR(2))
    # soft glow round the glass (translucent, additive feel)
    g = CY(3)
    for y in range(14, 32):
        for x in range(16):
            d = math.hypot(x + 0.5 - 8, (y + 0.5 - 22) * 0.9)
            if 5.0 < d < 7.5 and bayer(x, y) < 0.5:
                cv.put(x, y, (g[0], g[1], g[2], 50))
    cv.stamp(['..gGGg..',
              '.gGggGg.',
              'gGgggggg'], 4, 15, {'g': GR(2), 'G': GR(4)})
    body = ['kCCcck',
            'kCyyck',
            'kCWyck',
            'kCyyck',
            'kcyyck',
            'kcccck']
    cv.stamp(body, 5, 18, {'k': GR(1), 'C': CY(4), 'c': CY(2), 'y': GD(4), 'W': GD(5)})
    cv.stamp(['gGgggggg', '.gggggg.', '...gg...', '...Gg...'], 4, 24, {'g': GR(2), 'G': GR(3)})
    return cv


def gallery_window():
    """Face overlay (16 x 32): a tall lancet of leaded blue-green glass, backlit, in a slate frame."""
    cv = face_bg(GalleryFace())
    x0, x1 = 3, 12
    cx = (x0 + x1) / 2.0
    for y in range(3, 29):
        for x in range(x0, x1 + 1):
            if y < 9:
                half = (y - 2.5) * 1.0
                if abs(x + 0.5 - (cx + 0.5)) > half:
                    continue
                if abs(x + 0.5 - (cx + 0.5)) > half - 1.2:
                    cv.set(x, y, K(4) if x <= cx else K(1))
                    continue
            if x in (x0, x1):
                cv.set(x, y, K(4) if x == x0 else K(1))
                continue
            # panes: diamond lattice of lead over teal and green glass, brighter toward the top
            a, b = (x + y) % 5, (x - y) % 5
            if a == 0 or b == 0:
                col = K(0)
            else:
                k = ((x + y) // 5 + (x - y) // 5) % 3
                col = [CY(2), GR(3), WA(3)][k]
                if y < 14 and k == 0:
                    col = CY(3)
                if y > 22 and k != 0:
                    col = GR(2) if k == 1 else WA(2)
            cv.set(x, y, col)
    for x in range(x0 - 1, x1 + 2):
        cv.set(x, 29, K(4)); cv.set(x, 30, K(1))
    cv.set(6, 10, CY(4)); cv.set(5, 11, WHITE)
    return cv


def gallery_rose():
    """The F2 landmark (48 x 32 face overlay): a rose window of blue-green glass in slate tracery."""
    cv = face_bg(GalleryFace(), 3)
    cx, cy = 23.5, 16.0
    R = 14.5
    for y in range(32):
        for x in range(48):
            dx, dy = x + 0.5 - (cx + 0.5), y + 0.5 - cy
            d = math.hypot(dx, dy)
            if d > R + 1:
                continue
            if d > R:
                col = K(0)
            elif d > R - 1.5:
                col = K(4) if dy < 0 else K(2)
            elif d > R - 2.5:
                col = K(1)
            elif d < 2.5:
                col = WHITE if d < 1.2 else CY(4)
            elif d < 3.5:
                col = K(1)
            else:
                ang = math.atan2(dy, dx)
                sector = int((ang + math.pi) / (2 * math.pi) * 12) % 12
                frac = ((ang + math.pi) / (2 * math.pi) * 12) % 1
                if frac < 0.12 or frac > 0.88:
                    col = K(1)                                  # tracery spokes
                elif abs(d - 8.5) < 0.6:
                    col = K(1)                                  # the inner ring
                elif d < 8.5:
                    col = [CY(3), GR(4), CY(2), WA(4)][sector % 4]
                else:
                    col = [GR(3), CY(2), WA(3), GR(2), CY(1), WA(2)][sector % 6]
                    if d > R - 4 and sector % 2:
                        col = GR(2)
            cv.set(x, y, col)
    for (x, y) in ((18, 6), (19, 7), (31, 22)):
        cv.set(x, y, CY(4))
    return cv


# ====================================================================== F3: the Rootbound Stacks
def root_line(cv, pts, w=3, lit=True):
    """A thick root along a polyline on a canvas: wood 0 rims, wood 1 / 2 body, a wood 3 crest."""
    for a, b in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = a, b
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n)
            y = round(y0 + (y1 - y0) * k / n)
            steep = abs(y1 - y0) > abs(x1 - x0)
            for j in range(-1, w + 1):
                px, py = (x + j, y) if steep else (x, y + j)
                if j in (-1, w):
                    if cv.get(px, py)[3] == 0 or cv.get(px, py)[:3] == DARK[:3]:
                        cv.set(px, py, WD(0))
                elif j == 0 and lit:
                    cv.set(px, py, WD(3) if (x + y) % 4 else WD(2))
                else:
                    cv.set(px, py, WD(2) if j < w - 1 else WD(1))


def root_tube(cv, pts, w0, w1=None, clip=None):
    """A tapered root along a polyline, shaded as a cylinder lit from the upper left: wood 0 rim, wood 1..4
    across the body, bark streaks along it. w0 / w1 = width at the start / end (pixels)."""
    w1 = w0 if w1 is None else w1
    segs = list(zip(pts, pts[1:]))
    lens = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in segs]
    total = sum(lens) or 1.0
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    pad = max(w0, w1)
    for y in range(int(min(ys) - pad) - 1, int(max(ys) + pad) + 2):
        for x in range(int(min(xs) - pad) - 1, int(max(xs) + pad) + 2):
            if not (0 <= x < cv.w and 0 <= y < cv.h):
                continue
            px, py = x + 0.5, y + 0.5
            best = None
            acc = 0.0
            for (a, b), L in zip(segs, lens):
                ax, ay = a
                bx, by = b
                vx, vy = bx - ax, by - ay
                tt = 0.0 if L == 0 else max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / (L * L)))
                qx, qy = ax + vx * tt, ay + vy * tt
                d = math.hypot(px - qx, py - qy)
                if best is None or d < best[0]:
                    nx, ny = (px - qx, py - qy)
                    best = (d, (acc + tt * L) / total, nx, ny, vx / (L or 1), vy / (L or 1))
                acc += L
            d, t, nx, ny, tx, ty = best
            half = (w0 + (w1 - w0) * t) / 2.0
            if d > half:
                continue
            s_ = d / max(half, 0.01)
            if s_ > 0.82 or half < 0.9:
                col = WD(0)
            else:
                # side of the axis: the normal points toward the pixel
                nlen = math.hypot(nx, ny) or 1.0
                ox, oy = nx / nlen * s_, ny / nlen * s_
                nz = math.sqrt(max(0.0, 1 - s_ * s_))
                lum = ox * -0.55 + oy * -0.6 + nz * 0.58
                col = WD(4) if lum > 0.9 else WD(3) if lum > 0.68 else WD(2) if lum > 0.3 else WD(1)
                # bark: dark streaks running along the root
                along = int(t * total)
                if col in (WD(2), WD(3)) and (along + int(s_ * 5)) % 7 == 0:
                    col = WD(1)
            if clip and not clip(x, y):
                continue
            cv.set(x, y, col)


def shelf_rooted():
    """A bookshelf the willow is swallowing: roots over its top and down its side, books gone or spilling."""
    from archive import bookshelf
    cv = bookshelf(2, 40, seed=9)
    # a few books gone: dark gaps, one leaning
    for (x0, x1, y0, y1) in ((6, 10, 18, 26), (19, 23, 30, 38)):
        for y in range(y0, y1):
            for x in range(x0, x1):
                cv.set(x, y, SHD(0) if (x + y) % 3 else DARK)
    root_tube(cv, [(0, 9), (8, 6), (17, 9), (25, 6), (32, 8)], 6, 5)
    root_tube(cv, [(3, 8), (4, 19), (2, 31), (3, 46)], 5, 3)
    root_tube(cv, [(24, 8), (28, 17), (26, 27), (28, 33)], 4, 1.5)
    root_tube(cv, [(14, 9), (12, 16), (14, 21)], 3, 1)
    # ink running from a shelf edge
    for y in range(28, 46):
        cv.set(12, y, INK(1) if y % 4 else INK(2))
    cv.set(12, 46, INK(2)); cv.set(11, 46, INK(1)); cv.set(13, 46, INK(1))
    for (x, y) in ((5, 8), (20, 6), (29, 7)):
        cv.set(x, y, FD(2)); cv.set(x + 1, y, FD(3))
    return cv


def root_braid(cv, roots):
    """Several roots braided along a wall top; each spec is (points, widths) with widths at each point."""
    for pts, ws in roots:
        # split into segments so the width can swell in the middle and taper at both ends
        for i in range(len(pts) - 1):
            root_tube(cv, [pts[i], pts[i + 1]], ws[i], ws[i + 1])


def root_mass(k):
    """Overlay for wall cells: roots braided along a wall band, swelling in the middle and tapering out at both ends.
    a = horizontal (32 x 16, for a north or south wall), b = vertical (16 x 32, for a side wall)."""
    if k == 0:
        cv = Canvas(32, 16)
        root_braid(cv, [
            ([(0, 5), (9, 4), (18, 8), (27, 6), (32, 7)], [1.5, 5, 6, 4, 1.5]),
            ([(1, 11), (10, 10), (19, 5), (31, 4)], [1.2, 4, 4.5, 1.2]),
            ([(6, 13), (15, 12), (25, 12)], [1.2, 3.5, 1.2]),
        ])
        for (x, y) in ((12, 6), (22, 7)):
            if cv.get(x, y)[3]:
                cv.set(x, y, FD(2)); cv.set(x + 1, y, FD(3))
        cv.set(18, 8, INK(2))
        return cv
    cv = Canvas(16, 32)
    root_braid(cv, [
        ([(6, 0), (4, 9), (8, 18), (6, 27), (7, 32)], [1.5, 5, 6, 4, 1.5]),
        ([(11, 1), (10, 10), (5, 19), (4, 31)], [1.2, 4, 4.5, 1.2]),
        ([(13, 6), (12, 15), (12, 25)], [1.2, 3.5, 1.2]),
    ])
    for (x, y) in ((6, 12), (7, 22)):
        if cv.get(x, y)[3]:
            cv.set(x, y, FD(2)); cv.set(x, y + 1, FD(3))
    return cv


def root_drape():
    """Face overlay (16 x 32): roots pouring over a face, on the floor's own panelling."""
    cv = face_bg(StacksFace())
    for (x0, L, w) in ((2, 25, 4), (8, 31, 5), (12, 20, 3), (5, 14, 3)):
        root_tube(cv, [(x0, -1), (x0 + 1.5, L / 3), (x0, 2 * L / 3), (x0 + 1, L)], w, 1.2)
    for (x, y) in ((3, 6), (11, 12), (7, 18)):
        cv.set(x, y, FD(2)); cv.set(x + 1, y, FD(3))
    for y in range(28, 32):
        for x in range(16):
            if cv.get(x, y)[:3] in (INK(1)[:3], INK(2)[:3]):
                pass
    return cv


def wall_ink_seep():
    """Face overlay (16 x 32): ink weeping from a split in the panelling and pooling at its foot."""
    cv = face_bg(StacksFace())
    for y in range(6, 18):
        cv.set(7, y, DARK)
        cv.set(8, y, INK(1) if y % 3 else DARK)
    for (x, y0, y1) in ((6, 10, 29), (8, 14, 30), (9, 9, 26), (5, 16, 30)):
        for y in range(y0, y1):
            cv.set(x, y, INK(1) if (y + x) % 4 else INK(2))
    for x in range(2, 14):
        cv.set(x, 29, INK(2) if 4 <= x <= 11 else INK(1))
        cv.set(x, 30, INK(1))
    cv.set(9, 12, INK(3)); cv.set(6, 22, INK(3)); cv.set(7, 29, INK(4))
    return cv


def root_arch():
    """The F3 landmark (80 x 32, overhead tile over the great door's arch, cols -1..+3 of the door): two great roots
    rise from the wall either side and knot over the door, hanging tendrils down its face."""
    cv = Canvas(80, 32)
    root_tube(cv, [(4, 33), (6, 20), (12, 10), (24, 5), (40, 3), (56, 5), (68, 10), (74, 20), (76, 33)], 8, 7)
    root_tube(cv, [(11, 33), (14, 19), (25, 11), (40, 9)], 5, 3)
    root_tube(cv, [(69, 33), (66, 19), (55, 11), (40, 9)], 5, 3)
    for (x0, L) in ((27, 15), (33, 21), (46, 18), (52, 13), (40, 11)):
        root_tube(cv, [(x0, 9), (x0 + 1, 9 + L / 2), (x0, 9 + L)], 2.6, 1.0)
    # moss and a few pale ink-flowers on the knot
    for (x, y) in ((18, 6), (36, 2), (60, 6), (44, 3)):
        cv.set(x, y, FD(2)); cv.set(x + 1, y, FD(3))
    for (x, y) in ((30, 4), (50, 4)):
        cv.set(x, y, C('magic_violet', 3)); cv.set(x, y - 1, C('magic_violet', 4))
    return cv


# ====================================================================== assemble
def build_into(sh):
    sh.newline()
    sh.obj('card_cabinet', card_cabinet(), [0, 1], [[0, 0], [1, 0]], 1,
           note='F1 freestanding card catalogue; top row overhead')
    sh.obj('pillar_oak', pillar_oak(), [0, 1], [[0, 0]], 1, note='F1 column; capital row overhead')
    sh.obj('book_stack', book_stack(), [0, 0], [[0, 0]], 0, note='a pile of books on the floor')
    sh.obj('lectern', lectern(), [0, 1], [[0, 0]], 1, note='F2 lectern with an open book')
    sh.obj('shelf_rooted', shelf_rooted(), [0, 2], [[0, 0], [1, 0]], 1, note='F3 bookshelf swallowed by roots')
    sh.tile('index_cards', index_cards(), collision='none')
    sh.newline()
    for part in ('l', 'm', 'r'):
        sh.tile('wall_drawers_' + part, wall_drawers(part), collision='solid')
    sh.tile('great_catalog_dial', great_catalog_dial(), collision='solid')
    sh.tile('gallery_window', gallery_window(), collision='solid')
    sh.tile('gallery_rose', gallery_rose(), collision='solid')
    sh.tile('root_drape', root_drape(), collision='solid')
    sh.tile('wall_ink_seep', wall_ink_seep(), collision='solid')
    sh.tile('hanging_lamp', hanging_lamp(), collision='none', note='overhead tile: list it in the map `overhead`')
    sh.newline()
    sh.tile('root_mass_a', root_mass(0), collision='solid', note='wall cells only (band / deep): it is solid')
    sh.tile('root_mass_b', root_mass(1), collision='solid', note='wall cells only (band / deep): it is solid')
    sh.tile('root_arch', root_arch(), collision='none',
            note='overhead tile, x = boss door x - 1, y = door top row: roots knotted over the great door')
    sh.newline()
