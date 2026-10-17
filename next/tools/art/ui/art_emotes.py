"""Emote balloons (16x16, 2 frames each + pop-in), interaction prompts, location banner 3-slice."""
from __future__ import annotations

import numpy as np

import uipal as P
from lib import blank, hexc, paste
from spr import draw


def balloon(size=16):
    """White speech balloon with a tail at the bottom-left (points at the actor's head)."""
    W, H = 16, 16
    body_h = 12
    a = blank(W, H)
    m = np.zeros((H, W), bool)
    for y in range(body_h):
        for x in range(W):
            # rounded rect, radius 3
            cx = min(x, W - 1 - x)
            cy = min(y, body_h - 1 - y)
            if cx + cy >= 2 and not (cx == 0 and cy < 3) and not (cy == 0 and cx < 3):
                m[y, x] = True
    # tail: rows body_h-1 .. body_h+2 at x 3..6, leaning left
    tail = {body_h - 1: (2, 9), body_h: (3, 8), body_h + 1: (2, 6), body_h + 2: (1, 4), body_h + 3: (1, 2)}
    for y, (x0, x1) in tail.items():
        m[y, x0:x1] = True
    # outline = boundary of m
    pad = np.pad(m, 1)
    inner = pad[1:-1, 1:-1] & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    edge = m & ~inner
    a[m] = hexc(P.WHITE)
    # soft shading: bottom-right inner band
    for y in range(H):
        for x in range(W):
            if inner[y, x] and m[y, x]:
                if y >= body_h - 3 or x >= W - 3:
                    a[y, x] = hexc(P.METAL[3])
    a[edge] = hexc(P.OUTLINE)
    return a


SYMBOLS = {
    'exclaim': ["""
    ..OO..
    .O55O.
    .O54O.
    .O54O.
    .O43O.
    ..O3O.
    ..OO..
    ..O5O.
    ..OO..
    """, """
    ..OO..
    .O55O.
    .O54O.
    .O54O.
    .O54O.
    .O43O.
    ..O3O.
    ..OO..
    ..O5O.
    """],
    'question': ["""
    .OOOO.
    O5554O
    O4OO4O
    .OO54O
    ..O4O.
    ..O3O.
    ..OO..
    ..O4O.
    ..OO..
    """, """
    .OOOO.
    O5554O
    O4OO4O
    .OO54O
    ..O4O.
    ..O3O.
    ..OO..
    ..O4O.
    ..OO..
    """],
    'dots': ["""
    ........
    ........
    ........
    ........
    ........
    OO.OO...
    O3.O3...
    """, """
    ........
    ........
    ........
    ........
    ........
    OO.OO.OO
    O3.O3.O3
    """],
    'heart': ["""
    .OO.OO.
    O54O54O
    O54443O
    .O443O.
    ..O3O..
    ...O...
    """, """
    .OO.OO..
    O554O54O
    O554443O
    O544443O
    .O4443O.
    ..O43O..
    ...OO...
    """],
    'sweat': ["""
    ..O...
    .O5O..
    O543O.
    O543O.
    .OOO..
    """, """
    ......
    ..O...
    .O5O..
    O543O.
    O543O.
    .OOO..
    """],
    'anger': ["""
    .OO..OO.
    O4.OO.4O
    O4O..O4O
    .O....O.
    O4O..O4O
    O4.OO.4O
    .OO..OO.
    """, """
    OO....OO
    44O..O44
    O4O..O4O
    ........
    O4O..O4O
    44O..O44
    OO....OO
    """],
    'music': ["""
    ...OOOO
    ...O54O
    ...O.O.
    ...O.O.
    .OOO.O.
    O54OOO.
    O43OO..
    .OO....
    """, """
    ....OOOO
    ....O54O
    ....O.O.
    .OO.O.O.
    O54OO.O.
    O43OOOO.
    .OO.O43O
    .....OO.
    """],
    'zzz': ["""
    ......333
    .......3.
    ......333
    33333....
    ...2.....
    ..2......
    .2.......
    22222....
    """, """
    .....333.
    ......3..
    .....333.
    .........
    33333....
    ...2.....
    ..2......
    .2.......
    22222....
    """],
    'idea': ["""
    ..OOO..
    .O554O.
    O55544O
    O55444O
    .O544O.
    ..O3O..
    ..OOO..
    ..O2O..
    ..OOO..
    """, """
    ..OOO..
    .O555O.
    O55555O
    O55554O
    .O554O.
    ..O4O..
    ..OOO..
    ..O2O..
    ..OOO..
    """],
}
SYM_RAMP = {
    'exclaim': P.FIRE, 'question': P.WATER, 'dots': P.STEEL, 'heart': P.PINK + [P.PINK[-1], P.PINK[-1]],
    'sweat': P.WATER, 'anger': P.RED, 'music': P.EMERALD + [P.GREEN[5]], 'zzz': P.WATER, 'idea': P.GOLD,
}
EMOTE_IDS = {'exclaim': '!', 'question': '?', 'dots': '...', 'heart': 'heart', 'sweat': 'sweat',
             'anger': 'anger', 'music': 'music', 'zzz': 'zzz', 'idea': 'idea'}


DARKEN = {'exclaim': 3, 'question': 2, 'heart': 3, 'sweat': 1, 'music': 1, 'zzz': 0, 'dots': 0,
          'anger': 0, 'idea': 0}


def _darken(txt, k):
    if not k:
        return txt
    return ''.join(str(max(1, int(c) - k)) if c.isdigit() else c for c in txt)


def emote_frames(name):
    out = []
    ramp = SYM_RAMP[name]
    for i, s in enumerate(SYMBOLS[name]):
        s = _darken(s, DARKEN[name])
        b = balloon()
        sym = draw(s, A=ramp, outline=False)
        sh, sw = sym.shape[:2]
        x = (16 - sw) // 2
        y = (12 - sh) // 2
        if name == 'dots':
            x, y = 4, 3
        paste(b, sym, x, y)
        out.append(b)
    return out


def pop_frames():
    a = draw("""
    .OOO.
    OWWWO
    OWWWO
    .OOO.
    """, outline=False)
    b = draw("""
    ..OOOOO..
    .OWWWWWO.
    OWWWWWWWO
    OWWWWWWWO
    .OWWWWWO.
    ..OOOOO..
    """, outline=False)
    f0, f1 = blank(16, 16), blank(16, 16)
    paste(f0, a, 2, 9)
    paste(f1, b, 2, 5)
    return [f0, f1]


# ----------------------------------------------------------------------------------------------- prompts
def prompt_frames():
    base = draw("""
    OOOOOOO
    O55543O
    .O543O.
    ..O3O..
    ...O...
    """, A=P.GOLD, outline=False)
    out = []
    for dy in (0, 1, 2, 1):
        c = blank(7, 7)
        c[dy:dy + 5] = base
        out.append(c)
    return out


def prompt_bubble_frames():
    """Tiny 'talk' bubble (11x10) with dots that cycle."""
    out = []
    for n in (1, 2, 3):
        b = draw("""
        .OOOOOOOOO.
        OWWWWWWWWWO
        OWWWWWWWWWO
        OWWWWWWWWWO
        OWWWWWWWWWO
        .OOWWOOOOO.
        ...OWO.....
        ...OO......
        """, outline=False)
        for i in range(n):
            b[3, 2 + i * 3] = hexc(P.STEEL[1])
            b[3, 3 + i * 3] = hexc(P.STEEL[1])
        out.append(b)
    return out


def prompt_check_frames():
    """Tiny '!' bubble for examine/pick-up prompts (8x10, 2 frames)."""
    out = []
    for dy in (0, 1):
        b = draw("""
        .OOOOOO.
        OWW22WWO
        OWW22WWO
        OWW21WWO
        OWW11WWO
        OWWWWWWO
        OWW11WWO
        .OOWOOO.
        ..OWO...
        ..OO....
        """, A=P.FIRE, outline=False)
        c = blank(8, 11)
        c[dy:dy + 10] = b
        out.append(c)
    return out


# ----------------------------------------------------------------------------------------------- banner
BANNER_H = 24


def _band_column(alpha_scale=1.0):
    col = blank(1, BANNER_H)
    for y in range(BANNER_H):
        if y in (1, 22):
            col[y, 0] = hexc(P.OUTLINE, int(200 * alpha_scale))
        elif y == 2:
            col[y, 0] = hexc(P.GOLD[4], int(255 * alpha_scale))
        elif y == 21:
            col[y, 0] = hexc(P.GOLD[3], int(255 * alpha_scale))
        elif y in (3, 20):
            col[y, 0] = hexc(P.GOLD[1], int(230 * alpha_scale))
        elif 4 <= y <= 19:
            t = abs(y - 11.5) / 8.0
            col[y, 0] = hexc(P.INK[1], int((205 - 50 * t * t) * alpha_scale))
    return col


def banner_parts():
    mid = _band_column()
    L = blank(18, BANNER_H)
    for x in range(18):
        sc = min(1.0, max(0.0, (x - 3) / 9.0))
        if sc > 0:
            paste(L, _band_column(sc), x, 0)
    # diamond medallion with a gem
    cx, cy, R = 6, 11.5, 7
    for y in range(BANNER_H):
        for x in range(14):
            d = abs(x - cx) + abs(y - cy)
            if d <= R + 0.5:
                if d > R - 0.5:
                    c = hexc(P.OUTLINE)
                elif d > R - 1.5:
                    c = hexc(P.GOLD[4] if (x < cx or y < cy) else P.GOLD[2])
                elif d > R - 2.5:
                    c = hexc(P.GOLD[2] if (x < cx or y < cy) else P.GOLD[1])
                elif d > R - 3.5:
                    c = hexc(P.OUTLINE)
                else:
                    gx, gy = x - cx, y - cy
                    if gx + gy < -1:
                        c = hexc(P.CYAN[3])
                    elif gx + gy < 1:
                        c = hexc(P.CYAN[2])
                    else:
                        c = hexc(P.CYAN[1])
                    if (x, y) == (cx - 1, int(cy - 1)):
                        c = hexc(P.CYAN[4])
                L[y, x] = c
    # small flourish spurs along the gold lines
    for (x, y) in ((13, 3), (14, 4), (13, 20), (14, 19)):
        L[y, x] = hexc(P.GOLD[3])
    R_ = L[:, ::-1].copy()
    # mirror lighting on the right medallion (light stays top-left)
    return L, mid, R_


def sprites():
    out = []
    for name in SYMBOLS:
        for i, f in enumerate(emote_frames(name)):
            out.append((f'emote_{name}_{i}', f, (4, 15)))
    for i, f in enumerate(pop_frames()):
        out.append((f'emote_pop_{i}', f, (4, 15)))
    for i, f in enumerate(prompt_frames()):
        out.append((f'prompt_{i}', f, (3, 6)))
    for i, f in enumerate(prompt_bubble_frames()):
        out.append((f'prompt_talk_{i}', f, (4, 7)))
    for i, f in enumerate(prompt_check_frames()):
        out.append((f'prompt_check_{i}', f, (3, 10)))
    L, M, R = banner_parts()
    out.append(('banner_l', L, None))
    out.append(('banner_m', M, None))
    out.append(('banner_r', R, None))
    return out


def anims():
    a = {}
    for name in SYMBOLS:
        a[f'emote_{name}'] = {'frames': [f'emote_{name}_0', f'emote_{name}_1'], 'fps': 3, 'loop': True,
                              'intro': ['emote_pop_0', 'emote_pop_1'], 'introFps': 15}
    a['prompt'] = {'frames': [f'prompt_{i}' for i in range(4)], 'fps': 6, 'loop': True}
    a['prompt_talk'] = {'frames': ['prompt_talk_0', 'prompt_talk_1', 'prompt_talk_2'], 'fps': 3, 'loop': True}
    a['prompt_check'] = {'frames': ['prompt_check_0', 'prompt_check_1'], 'fps': 3, 'loop': True}
    return a


def slices():
    return {'banner': {'left': 'banner_l', 'mid': 'banner_m', 'right': 'banner_r', 'height': BANNER_H,
                       'textInset': 18, 'note': 'stretch banner_m; text (font_large) centered, baseline y=17'}}
