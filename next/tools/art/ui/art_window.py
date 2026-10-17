"""Window skin: FF-style 9-slice frames, speech tails, color schemes -> assets/ui/window.png + window.json.

Frame layers, counted inward from the outer edge:
  0 = ink outline, 1 = outer bevel, 2 = inner bevel, 3 = inner shadow line (top/left only, translucent).
Top/left bevels are lit (metal highlights), bottom/right are shaded. The fill gradient is drawn by code under
the frame, inset by `fillInset`.
"""
from __future__ import annotations

import numpy as np

import uipal
from lib import ASSETS_UI, blank, hexc, paste, save, write_json

P = uipal


def _colors(field=False):
    s = P.SILVER
    oa = 255
    return {
        ('lit', 0): hexc(P.OUTLINE, oa), ('shd', 0): hexc(P.OUTLINE, oa),
        ('lit', 1): hexc(s['hi']), ('shd', 1): hexc(s['dk']),
        ('lit', 2): hexc(s['lt']), ('shd', 2): hexc(s['md']),
        ('lit', 3): hexc(P.OUTLINE, 70 if field else 96), ('shd', 3): None,
        ('dia', 1): hexc(s['lt']), ('dia', 2): hexc(s['md']),
    }


def _side(levels, x, y, k):
    """Which way is the nearest outside: lit (left/up) or shaded (right/down). Horizontal wins."""
    h, w = levels.shape

    def lv(xx, yy):
        if xx < 0 or yy < 0 or xx >= w or yy >= h:
            return -1
        return levels[yy, xx]
    L, R, U, D = lv(x - 1, y) < k, lv(x + 1, y) < k, lv(x, y - 1) < k, lv(x, y + 1) < k
    if L and not R:
        return 'lit'
    if R and not L:
        return 'shd'
    if U and not D:
        return 'lit'
    if D and not U:
        return 'shd'
    return 'dia'


def erosion_levels(mask: np.ndarray, maxk=4):
    """levels[y,x] = 0 for outside, k (1..) = erosion step at which the pixel disappears (4-connectivity)."""
    h, w = mask.shape
    lev = np.zeros((h, w), np.int32)
    cur = mask.copy()
    k = 1
    while cur.any() and k <= maxk + 1:
        pad = np.pad(cur, 1, constant_values=False)
        inner = pad[1:-1, 1:-1] & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
        edge = cur & ~inner
        lev[edge] = k
        cur = inner
        k += 1
    lev[cur] = 99
    return lev


def render_shape(mask: np.ndarray, layers=3, field=False, fill=None):
    """Render frame layers for an arbitrary shape mask. Returns (frame_rgba, fill_mask)."""
    cols = _colors(field)
    lev = erosion_levels(mask, layers + 1)
    h, w = mask.shape
    out = blank(w, h)
    fillm = np.zeros((h, w), bool)
    for y in range(h):
        for x in range(w):
            k = lev[y, x]
            if k == 0:
                continue
            layer = k - 1
            if layer > layers:
                fillm[y, x] = True
                continue
            side = _side(lev, x, y, k)
            if layer == layers:     # shadow line layer
                c = cols.get((side if side != 'dia' else 'lit', 3)) if side != 'shd' else None
                fillm[y, x] = True
                if c is not None:
                    out[y, x] = c
                continue
            c = cols.get((side, layer)) or cols.get(('lit', layer))
            out[y, x] = c
    return out, fillm


def rounded_rect_mask(w, h, r=2):
    m = np.ones((h, w), bool)
    cut = {2: [(0, 0), (1, 0), (0, 1)], 1: [(0, 0)], 3: [(0, 0), (1, 0), (2, 0), (0, 1), (0, 2), (1, 1)]}[r]
    for (cx, cy) in cut:
        for (x, y) in ((cx, cy), (w - 1 - cx, cy), (cx, h - 1 - cy), (w - 1 - cx, h - 1 - cy)):
            m[y, x] = False
    return m


# corner layer tables (top-left orientation). '.' outside, digits = layer, 'f' = fill
CORNER_STD = [
    '..000',
    '.0111',
    '01122',
    '01233',
    '0123f',
]
CORNER_THIN = [
    '.00',
    '011',
    '012',
]


def frame(w, h, kind='std'):
    """Render a w x h frame using the hand-made corner table and straight edges."""
    table = CORNER_THIN if kind == 'thin' else CORNER_STD
    n = len(table)
    layers = 2 if kind == 'thin' else 3          # index of the shadow-line layer
    s = P.SILVER
    field = kind == 'field'
    if kind == 'thin':
        col = {('lit', 0): hexc(P.OUTLINE), ('shd', 0): hexc(P.OUTLINE), ('dia', 0): hexc(P.OUTLINE),
               ('lit', 1): hexc(s['hi']), ('shd', 1): hexc(s['md']), ('dia', 1): hexc(s['lt']),
               ('lit', 2): hexc(P.OUTLINE, 90), ('dia', 2): hexc(P.OUTLINE, 90)}
    else:
        c = _colors(field)
        col = dict(c)
        col[('dia', 0)] = c[('lit', 0)]
        col[('dia', 3)] = c[('lit', 3)]
    out = blank(w, h)
    for y in range(h):
        for x in range(w):
            left, top = x < n, y < n
            right, bottom = x >= w - n, y >= h - n
            if (left or right) and (top or bottom):
                cx = x if left else w - 1 - x
                cy = y if top else h - 1 - y
                ch = table[cy][cx]
                if ch in '.f':
                    continue
                layer = int(ch)
                if left and top:
                    side = 'lit'
                elif right and bottom:
                    side = 'shd'
                elif right and top:      # top edge lit, right edge shaded
                    side = 'lit' if cy < cx else ('shd' if cy > cx else 'dia')
                else:                    # bottom-left: left edge lit, bottom edge shaded
                    side = 'lit' if cx < cy else ('shd' if cx > cy else 'dia')
            else:
                d = {'lit_l': x, 'lit_t': y, 'shd_r': w - 1 - x, 'shd_b': h - 1 - y}
                key = min(d, key=d.get)
                layer = d[key]
                if layer > layers:
                    continue
                side = key[:3]
            c = col.get((side, layer))
            if c is None:
                continue
            out[y, x] = c
    return out


def tail(direction='down', field=False):
    """Speech tail joined to the window edge. Returns (frame, fill_mask_rgba, info).

    The sprite's join rows overlap the window's border band (4 rows). For 'down' the sprite top row sits at
    window bottom - 4; for 'up' the sprite bottom row sits at window top + 3.
    """
    W = 22
    band = 4
    depth = 11
    H = band + depth
    # local shape: window band spanning the full width + triangle from the opening to a tip
    m = np.zeros((H + 6, W + 8), bool)   # padding so the window band reads as continuing outward
    ox = 4
    # window part: rows 0..band-1 (plus 6 rows above that belong to the window interior)
    m[0:6 + band, :] = True
    cx = ox + W // 2 - 1      # tip column (left of center for a 2 px tip)
    half0 = 7                 # half-width at the join
    for r in range(depth):
        t = r / (depth - 1)
        half = round(half0 * (1 - t) + 0.5 * t)
        x0 = cx - half + 1 + round(t * 2)    # slight lean to the right for a hand-drawn feel
        x1 = cx + half + 1
        m[6 + band + r, max(0, x0):min(m.shape[1], x1 + 1)] = True
    frame_full, fillm = render_shape(m, layers=3, field=field)
    # keep only the tail columns and rows from the band down
    sub = frame_full[6:6 + H, ox:ox + W].copy()
    fsub = fillm[6:6 + H, ox:ox + W]
    # the window band outside the opening is drawn by the 9-slice: keep it identical (same rendering)
    fill_rgba = blank(W, H)
    fill_rgba[fsub] = (255, 255, 255, 255)
    # shadow-line pixels (translucent) sit over fill: fill must also exist below them
    if direction == 'up':
        sub = sub[::-1].copy()
        fill_rgba = fill_rgba[::-1].copy()
        # flipping swaps lit/shaded on horizontal edges; re-render properly for 'up'
        mu = m[::-1].copy()
        frame_full, fillm = render_shape(mu, layers=3, field=field)
        top = mu.shape[0] - (6 + H)
        sub = frame_full[top:top + H, ox:ox + W].copy()
        fsub = fillm[top:top + H, ox:ox + W]
        fill_rgba = blank(W, H)
        fill_rgba[fsub] = (255, 255, 255, 255)
    info = {'w': W, 'h': H, 'tipX': W // 2, 'joinRows': band}
    return sub, fill_rgba, info


def build():
    sheet = blank(128, 64)
    js_frames = {}
    x = 1
    pieces = {}
    for kind, size in (('std', 12), ('field', 12), ('thin', 8)):
        f = frame(size, size, kind)
        paste(sheet, f, x, 1, 'copy')
        border = 4 if kind != 'thin' else 3
        inset = 3 if kind != 'thin' else 2
        js_frames[kind] = {'rect': [x, 1, size, size], 'border': [border, border, border, border],
                           'fillInset': inset}
        pieces[kind] = f
        x += size + 2
    # tails
    y = 16
    x = 1
    tails = {}
    for kind in ('std', 'field'):
        for d in ('down', 'up'):
            fr, fill, info = tail(d, field=(kind == 'field'))
            name = f'tail_{d}' if kind == 'std' else f'tail_{d}_field'
            paste(sheet, fr, x, y, 'copy')
            js_frames[name] = [x, y, info['w'], info['h']]
            paste(sheet, fill, x, y + 16, 'copy')
            js_frames[name + '_fill'] = [x, y + 16, info['w'], info['h']]
            tails[name] = {'frame': name, 'fill': name + '_fill', 'tipX': info['tipX'], 'w': info['w'],
                           'h': info['h'], 'joinRows': info['joinRows'],
                           'place': ('sprite top = window bottom - 4' if d == 'down'
                                     else 'sprite bottom = window top + 4')}
            x += info['w'] + 2
    used_w = x + 1
    sheet = sheet[:, :max(used_w, 48)]
    save(sheet, ASSETS_UI / 'window.png')
    colors = {k: dict(v) for k, v in P.SCHEMES.items()}
    js = {
        'image': 'window.png',
        'frames': js_frames,
        'tails': tails,
        'colors': colors,
        'default': 'blue',
        'fieldAlpha': 0.92,
        'gradient': 'vertical: top at fill top, mid at 45%, bottom at fill bottom; 1 px rows, no dithering',
        'draw': ['fill rect inset by fillInset with the scheme gradient (alpha = fieldAlpha on the field)',
                 'nineSlice(frame) on top (edges stretch; they are uniform)',
                 'tail: tint *_fill with the gradient color at the join row, draw it, then draw the tail frame'],
    }
    write_json(js, ASSETS_UI / 'window.json')
    return sheet, js, pieces


if __name__ == '__main__':
    build()
    print('window ok')
