"""Diablo-style loot drop beams (4 frames) and sparkles (4 frames), pre-tinted per rarity.

Rarity colors are fixed by DESIGN.md 6.4; the beam core blends toward white."""
from __future__ import annotations

import math

import numpy as np

import uipal as P
from lib import blank, hexc

RAR = P.RARITY


def _mix(c, w, t):
    return tuple(int(round(c[i] + (w[i] - c[i]) * t)) for i in range(3))


def beam_frames(color):
    W, H = 15, 64
    base = hexc(color)[:3]
    white = (255, 255, 255)
    out = []
    for f in range(4):
        a = blank(W, H)
        cx = W / 2 - 0.5
        flick = (1.0, 0.86, 0.95, 0.8)[f]
        for y in range(H):
            # vertical falloff: strongest near the ground (bottom), fades to 0 at the top
            ty = y / (H - 1)
            vfade = (ty ** 0.8) * flick
            for x in range(W):
                dx = abs(x - cx)
                if dx <= 0.6:
                    col, al = _mix(base, white, 0.85), 1.0
                elif dx <= 1.6:
                    col, al = _mix(base, white, 0.45), 0.85
                elif dx <= 3.6:
                    col, al = base, 0.55
                elif dx <= 6.6:
                    col, al = base, 0.22 if (x + y + f) % 2 == 0 else 0.12
                else:
                    continue
                A = int(255 * al * vfade)
                if A > 6:
                    a[y, x] = (*col, A)
        # rising motes
        for k in range(5):
            mx = int(cx + ((k * 37 + 11) % 9) - 4)
            my = int(H - 1 - ((k * 13 + f * 9) % (H - 8))) - 4
            if 0 <= mx < W and 0 <= my < H:
                a[my, mx] = (*_mix(base, white, 0.7), 255)
                if my + 1 < H:
                    a[my + 1, mx] = (*base, 160)
        # ground glow
        for y in range(H - 5, H):
            for x in range(W):
                ex = (x - cx) / 7.5
                ey = (y - (H - 2.5)) / 2.5
                r2 = ex * ex + ey * ey
                if r2 <= 1:
                    col = _mix(base, white, 0.55 * (1 - r2))
                    al = int(210 * flick * (1 - r2) ** 0.8)
                    if (x + y) % 2 and r2 > 0.55:
                        al //= 2
                    a[y, x] = (*col, max(int(a[y, x, 3]), al))
        out.append(a)
    return out


SP = [
    ['...', '.#.', '...'],
    ['.....', '..#..', '.###.', '..#..', '.....'],
    ['...#...', '...#...', '..#+#..', '###+###', '..#+#..', '...#...', '...#...'],
    ['.....', '..#..', '.#+#.', '..#..', '.....'],
]


def sparkle_frames(color):
    base = hexc(color)[:3]
    out = []
    for rows in SP:
        c = blank(7, 7)
        h = len(rows)
        o = (7 - h) // 2
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch == '#':
                    c[o + y, o + x] = (*_mix(base, (255, 255, 255), 0.25), 255)
                elif ch == '+':
                    c[o + y, o + x] = (255, 255, 255, 255)
        out.append(c)
    return out


def sprites():
    out = []
    for name, col in RAR.items():
        for i, f in enumerate(beam_frames(col)):
            out.append((f'beam_{name}_{i}', f, (7, 63)))
        for i, f in enumerate(sparkle_frames(col)):
            out.append((f'sparkle_{name}_{i}', f, (3, 3)))
    return out


def anims():
    a = {}
    for name in RAR:
        a[f'beam_{name}'] = {'frames': [f'beam_{name}_{i}' for i in range(4)], 'fps': 8, 'loop': True}
        a[f'sparkle_{name}'] = {'frames': [f'sparkle_{name}_{i}' for i in range(4)], 'fps': 10, 'loop': False}
    return a


def slices():
    return {}
