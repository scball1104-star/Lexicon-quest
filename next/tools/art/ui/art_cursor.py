"""Cursor glove, selection bar, scroll/page arrows, dialogue more-arrow, page dots."""
from __future__ import annotations

import numpy as np

import uipal as P
from lib import blank, hexc
from spr import draw, frames_shift

GLOVE = """
.....OOOO........
....O4444O.......
.OOOO44443OOOOOO.
O4dO444444444443O
O4cO444444333332O
O4cO444442OOOOOO.
O4cO4444443O.....
O4cO444442OO.....
O4cO4444443O.....
O3bO334442OO.....
.OOOO32222O......
.....OOOOO.......
"""


def glove():
    a = draw(GLOVE, A=P.METAL, B=P.GOLD, outline=False)
    return a


def sel_bar():
    """3-slice highlight bar (white + alpha, code tints with scheme highlight). 12 px tall."""
    w, h = 9, 12
    a = blank(w, h)
    for y in range(h):
        al = int(round(150 - (y / (h - 1)) * 95))
        for x in range(w):
            a[y, x] = (255, 255, 255, al)
    # top highlight line and bottom edge line
    a[0, :, 3] = 200
    a[h - 1, :, 3] = 70
    # rounded ends (1 px cut on corners, softer second pixel)
    for (x, y) in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        a[y, x, 3] = 0
    for (x, y) in ((1, 0), (w - 2, 0), (0, 1), (w - 1, 1), (0, h - 2), (w - 1, h - 2)):
        a[y, x, 3] = a[y, x, 3] // 2
    return a


ARROW_UP = """
...O...
..O5O..
.O545O.
O54443O
OOOOOOO
"""


def arrow(direction):
    a = draw("""
    ....O....
    ...O5O...
    ..O545O..
    .O54443O.
    O5444432O
    OOOOOOOOO
    """, A=P.GOLD, outline=False)
    if direction == 'up':
        return a
    if direction == 'down':
        b = draw("""
        OOOOOOOOO
        O5544432O
        .O54432O.
        ..O543O..
        ...O3O...
        ....O....
        """, A=P.GOLD, outline=False)
        return b
    if direction == 'left':
        return draw("""
        ....OO
        ...O5O
        ..O54O
        .O544O
        O5444O
        .O433O
        ..O32O
        ...O2O
        ....OO
        """, A=P.GOLD, outline=False)
    if direction == 'right':
        return draw("""
        OO....
        O5O...
        O45O..
        O445O.
        O4444O
        O433O.
        O32O..
        O2O...
        OO....
        """, A=P.GOLD, outline=False)


def more_arrow_frames():
    """Dialogue 'more text' arrow: small down triangle, 4 frames bobbing (y 0,1,2,1)."""
    base = draw("""
    OOOOOOO
    O55443O
    .O543O.
    ..O3O..
    ...O...
    """, A=P.GOLD, outline=False)
    return frames_shift(base, [(0, 0), (0, 1), (0, 2), (0, 1)], w=7, h=7)


def page_dot(on=True):
    if on:
        return draw("""
        ..O..
        .O5O.
        O545O
        .O3O.
        ..O..
        """, A=P.GOLD, outline=False)
    return draw("""
    ..O..
    .O1O.
    O1.1O
    .O1O.
    ..O..
    """, A=P.STEEL, outline=False)


def end_mark_frames():
    """Dialogue 'end of message' mark: a small gold diamond that pulses (3 frames)."""
    f0 = draw("""
    ..O..
    .O5O.
    O545O
    .O3O.
    ..O..
    """, A=P.GOLD, outline=False)
    f1 = draw("""
    ..O..
    .O5O.
    O555O
    .O5O.
    ..O..
    """, A=P.GOLD, outline=False)
    return [f0, f1]


def delta_arrows():
    up = draw("""
    ..O..
    .O5O.
    O545O
    OO4OO
    .O3O.
    .OOO.
    """, A=P.GREEN, outline=False)
    down = draw("""
    .OOO.
    .O3O.
    OO3OO
    O434O
    .O4O.
    ..O..
    """, A=P.RED, outline=False)
    eq = draw("""
    .....
    OOOOO
    O333O
    OOOOO
    O333O
    OOOOO
    """, A=P.METAL, outline=False)
    return up, down, eq


def sprites():
    out = []
    g = glove()
    gf = frames_shift(g, [(0, 0), (1, 0)])
    for i, f in enumerate(gf):
        out.append((f'cursor_{i}', f, (f.shape[1] - 2, 3)))   # origin: fingertip (hotspot)
    out.append(('sel_bar', sel_bar(), None))
    for d in ('up', 'down', 'left', 'right'):
        out.append((f'arrow_{d}', arrow(d), None))
    for i, f in enumerate(more_arrow_frames()):
        out.append((f'more_{i}', f, None))
    for i, f in enumerate(end_mark_frames()):
        out.append((f'end_{i}', f, None))
    up, down, eq = delta_arrows()
    out.append(('delta_up', up, None))
    out.append(('delta_down', down, None))
    out.append(('delta_same', eq, None))
    out.append(('page_on', page_dot(True), None))
    out.append(('page_off', page_dot(False), None))
    return out


def anims():
    return {
        'cursor': {'frames': ['cursor_0', 'cursor_1'], 'fps': 4, 'loop': True},
        'more': {'frames': ['more_0', 'more_1', 'more_2', 'more_1'], 'fps': 6, 'loop': True},
        'end': {'frames': ['end_0', 'end_1'], 'fps': 3, 'loop': True},
    }


def slices():
    return {'sel_bar': {'border': [3, 0, 3, 0], 'note': '3-slice; white+alpha, tint with scheme highlight'}}
