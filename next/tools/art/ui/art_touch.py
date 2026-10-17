"""Touch control skins (d-pad, A, B, Menu, Run; normal + pressed) and inline button prompt glyphs
(keyboard keycaps, gamepad buttons, touch buttons). Touch skins are also exported as individual PNGs in
assets/ui/touch/ for the DOM overlay (CSS image-rendering: pixelated)."""
from __future__ import annotations

import numpy as np

import uipal as P
from art_battle import tiny_mask
from lib import ASSETS_UI, blank, hexc, paste, save

INK = hexc(P.OUTLINE)


def _alpha(c, a):
    c = hexc(c) if isinstance(c, str) else c
    return (c[0], c[1], c[2], a)


def _ring_layers(mask):
    """Return erosion level array (1 = outer edge)."""
    h, w = mask.shape
    lev = np.zeros((h, w), int)
    cur = mask.copy()
    k = 1
    while cur.any() and k < 6:
        pad = np.pad(cur, 1)
        inner = pad[1:-1, 1:-1] & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
        lev[cur & ~inner] = k
        cur = inner
        k += 1
    lev[cur] = 9
    return lev


def skin_shape(mask, pressed=False, accent=None):
    """Translucent touch-control look: dark outline, light rim, dark glass body (lighter when pressed)."""
    lev = _ring_layers(mask)
    h, w = mask.shape
    a = blank(w, h)
    body = _alpha(P.INK[1], 150)
    body_hi = _alpha(P.INK[3], 165)
    if pressed:
        body = _alpha(accent or P.GOLD[2], 190)
        body_hi = _alpha(accent or P.GOLD[3], 200)
    for y in range(h):
        for x in range(w):
            k = lev[y, x]
            if k == 0:
                continue
            if k == 1:
                a[y, x] = _alpha(P.OUTLINE, 210)
            elif k == 2:
                # rim: light top-left, dimmer bottom-right
                a[y, x] = _alpha(P.WHITE if (y < h / 2) else P.METAL[2], 230)
            else:
                a[y, x] = body_hi if y < h * 0.45 else body
    return a


def circle_mask(d):
    m = np.zeros((d, d), bool)
    r = d / 2
    for y in range(d):
        for x in range(d):
            if (x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2 <= (r - 0.1) ** 2:
                m[y, x] = True
    return m


def pill_mask(w, h):
    m = np.zeros((h, w), bool)
    r = h / 2
    for y in range(h):
        for x in range(w):
            cx = min(max(x + 0.5, r), w - r)
            if (x + 0.5 - cx) ** 2 + (y + 0.5 - r) ** 2 <= (r - 0.1) ** 2:
                m[y, x] = True
    return m


def glyph_big(ch):
    """Bold 7x9 letters for the A / B touch buttons."""
    G = {
        'A': ['..###..', '.##.##.', '##...##', '##...##', '#######', '##...##', '##...##', '##...##', '##...##'],
        'B': ['######.', '##...##', '##...##', '######.', '##...##', '##...##', '##...##', '##...##', '######.'],
    }
    return np.array([[c == '#' for c in r] for r in G[ch]])


def stamp(a, m, x, y, color, shadow=True):
    h, w = m.shape
    for yy in range(h):
        for xx in range(w):
            if m[yy, xx]:
                if shadow:
                    if a[y + yy + 1, x + xx + 1, 3] == 0 or True:
                        a[y + yy + 1, x + xx + 1] = _alpha(P.OUTLINE, 230)
    for yy in range(h):
        for xx in range(w):
            if m[yy, xx]:
                a[y + yy, x + xx] = hexc(color) if isinstance(color, str) else color


def dpad(pressed=None):
    S, arm = 45, 15
    m = np.zeros((S, S), bool)
    m[arm:2 * arm, :] = True
    m[:, arm:2 * arm] = True
    # round the arm ends slightly
    for (x, y) in ((arm, 0), (2 * arm - 1, 0), (arm, S - 1), (2 * arm - 1, S - 1),
                   (0, arm), (0, 2 * arm - 1), (S - 1, arm), (S - 1, 2 * arm - 1)):
        m[y, x] = False
    a = skin_shape(m)
    # pressed arm highlight
    if pressed:
        sub = np.zeros_like(m)
        if pressed == 'up':
            sub[2:arm + 1, arm + 2:2 * arm - 2] = True
        elif pressed == 'down':
            sub[2 * arm - 1:S - 2, arm + 2:2 * arm - 2] = True
        elif pressed == 'left':
            sub[arm + 2:2 * arm - 2, 2:arm + 1] = True
        elif pressed == 'right':
            sub[arm + 2:2 * arm - 2, 2 * arm - 1:S - 2] = True
        a[sub] = _alpha(P.GOLD[3], 200)
    # center hub
    c = S // 2
    for y in range(c - 3, c + 4):
        for x in range(c - 3, c + 4):
            if (x - c) ** 2 + (y - c) ** 2 <= 9:
                a[y, x] = _alpha(P.INK[0], 170)
    for y in range(c - 2, c + 2):
        for x in range(c - 2, c + 2):
            if (x - c + 0.5) ** 2 + (y - c + 0.5) ** 2 <= 3:
                a[y, x] = _alpha(P.METAL[1], 200)
    # arrows
    tri = {
        'up': ['...#...', '..###..', '.#####.', '#######'],
    }
    up = np.array([[ch == '#' for ch in r] for r in tri['up']])
    arrows = {
        'up': (up, c - 3, 5),
        'down': (up[::-1], c - 3, S - 9),
        'left': (up.T, 5, c - 3),
        'right': (up.T[:, ::-1], S - 9, c - 3),
    }
    for name, (am, x, y) in arrows.items():
        col = P.WHITE if pressed != name else P.GOLD[5]
        stamp(a, am, x, y, _alpha(col, 240))
    return a


def round_button(letter, pressed=False, d=26):
    m = circle_mask(d)
    a = skin_shape(m, pressed, accent=P.GOLD[2] if letter == 'A' else P.RED[3])
    g = glyph_big(letter)
    col = P.GOLD[4] if letter == 'A' else P.WHITE
    if pressed:
        col = P.WHITE
    off = 1 if pressed else 0
    stamp(a, g, (d - 7) // 2, (d - 9) // 2 + off, _alpha(col, 245))
    return a


def pill_button(label, pressed=False, w=32, h=14):
    m = pill_mask(w, h)
    a = skin_shape(m, pressed, accent=P.WATER[3])
    tm = tiny_mask(label)
    off = 1 if pressed else 0
    stamp(a, tm, (w - tm.shape[1]) // 2, (h - 5) // 2 + off, _alpha(P.WHITE, 245))
    return a


# ------------------------------------------------------------------------------------------------ prompt glyphs
def keycap(label):
    tm = tiny_mask(label)
    w = max(11, tm.shape[1] + 6)
    h = 11
    a = blank(w, h)
    for y in range(h):
        for x in range(w):
            corner = (x in (0, w - 1)) and (y in (0, h - 1))
            if corner:
                continue
            edge = x in (0, w - 1) or y in (0, h - 1)
            if edge:
                a[y, x] = INK
            elif y >= h - 3:
                a[y, x] = hexc(P.METAL[1])          # key side
            elif y == 1 or x == 1:
                a[y, x] = hexc(P.WHITE)
            elif x == w - 2:
                a[y, x] = hexc(P.METAL[2])
            else:
                a[y, x] = hexc(P.METAL[3])          # key face
    stamp(a, tm, (w - tm.shape[1]) // 2, 2, P.INK[0], shadow=False)
    return a


PAD_COLORS = {'A': P.GREEN[3], 'B': P.RED[3], 'X': P.WATER[3], 'Y': P.GOLD[3]}


def pad_button(label):
    d = 11
    m = circle_mask(d)
    base = PAD_COLORS[label]
    a = blank(d, d)
    lev = _ring_layers(m)
    for y in range(d):
        for x in range(d):
            k = lev[y, x]
            if k == 1:
                a[y, x] = INK
            elif k >= 2:
                a[y, x] = hexc(P.INK[2])
    # colored letter (Xbox-style) on dark round button
    tm = tiny_mask(label)
    stamp(a, tm, (d - tm.shape[1]) // 2, 3, base, shadow=False)
    # rim highlight top-left
    for (x, y) in ((3, 1), (4, 1), (2, 2), (1, 3), (1, 4)):
        if lev[y, x] >= 2:
            a[y, x] = hexc(P.STEEL[2])
    return a


def shoulder(label):
    w, h = 15, 9
    a = blank(w, h)
    for y in range(h):
        for x in range(w):
            corner = (x in (0, w - 1)) and (y in (0, h - 1))
            corner2 = (x in (0, 1, w - 2, w - 1)) and y == 0
            if corner or corner2:
                continue
            edge = x in (0, w - 1) or y in (0, h - 1) or (y == 1 and x in (1, w - 2))
            a[y, x] = INK if edge else hexc(P.INK[2])
    for x in range(2, w - 2):
        a[1, x] = hexc(P.STEEL[2])
    tm = tiny_mask(label)
    stamp(a, tm, (w - tm.shape[1]) // 2, 2, P.WHITE, shadow=False)
    return a


def touch_glyph(label):
    d = 11
    m = circle_mask(d)
    lev = _ring_layers(m)
    a = blank(d, d)
    for y in range(d):
        for x in range(d):
            k = lev[y, x]
            if k == 1:
                a[y, x] = INK
            elif k == 2:
                a[y, x] = hexc(P.WHITE)
            elif k > 2:
                a[y, x] = hexc(P.INK[3])
    tm = tiny_mask(label)
    stamp(a, tm, (d - tm.shape[1]) // 2, 3, P.GOLD[4] if label == 'A' else P.WHITE, shadow=False)
    return a


def fullscreen_button(pressed=False, d=18):
    """Rounded square with four corner brackets (expand). Pressed = brackets point inward."""
    m = np.zeros((d, d), bool)
    for y in range(d):
        for x in range(d):
            cx, cy = min(x, d - 1 - x), min(y, d - 1 - y)
            if cx + cy >= 2:
                m[y, x] = True
    a = skin_shape(m, pressed, accent=P.WATER[3])
    col = _alpha(P.WHITE, 245)
    L = 3
    for (sx, sy) in ((0, 0), (1, 0), (0, 1), (1, 1)):
        for i in range(L):
            x = (4 + i) if sx == 0 else (d - 5 - i)
            y = 4 if sy == 0 else d - 5
            a[y, x] = col
            x2 = 4 if sx == 0 else d - 5
            y2 = (4 + i) if sy == 0 else (d - 5 - i)
            a[y2, x2] = col
    if pressed:
        # inward: small diagonal ticks toward the center
        for (sx, sy) in ((0, 0), (1, 0), (0, 1), (1, 1)):
            x = 6 if sx == 0 else d - 7
            y = 6 if sy == 0 else d - 7
            a[y, x] = col
    return a


def touch_pieces():
    out = {}
    out['touch_dpad'] = dpad()
    for d in ('up', 'down', 'left', 'right'):
        out[f'touch_dpad_{d}'] = dpad(d)
    for L in ('A', 'B'):
        out[f'touch_{L.lower()}'] = round_button(L)
        out[f'touch_{L.lower()}_pressed'] = round_button(L, True)
    out['touch_menu'] = pill_button('MENU')
    out['touch_menu_pressed'] = pill_button('MENU', True)
    out['touch_run'] = pill_button('RUN')
    out['touch_run_pressed'] = pill_button('RUN', True)
    out['touch_fullscreen'] = fullscreen_button()
    out['touch_fullscreen_pressed'] = fullscreen_button(True)
    return out


def glyph_pieces():
    out = {}
    for k in ('Z', 'X', 'C'):
        out[f'key_{k.lower()}'] = keycap(k)
    out['key_enter'] = keycap('ENTER')
    out['key_esc'] = keycap('ESC')
    out['key_shift'] = keycap('SHIFT')
    out['key_q'] = keycap('Q')
    out['key_e'] = keycap('E')
    for k in ('A', 'B', 'X', 'Y'):
        out[f'pad_{k.lower()}'] = pad_button(k)
    out['pad_lb'] = shoulder('LB')
    out['pad_rb'] = shoulder('RB')
    out['tap_a'] = touch_glyph('A')
    out['tap_b'] = touch_glyph('B')
    return out


def export_touch_pngs():
    d = ASSETS_UI / 'touch'
    files = {}
    for k, v in touch_pieces().items():
        name = k.replace('touch_', '') + '.png'
        save(v, d / name)
        files[k] = f'touch/{name}'
    return files


def sprites():
    out = [(k, v, None) for k, v in touch_pieces().items()]
    out += [(f'btn_{k}', v, None) for k, v in glyph_pieces().items()]
    return out


def anims():
    return {}


def slices():
    return {}
