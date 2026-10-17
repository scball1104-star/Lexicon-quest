"""Sprite drawing helpers: ASCII art with material letters -> RGBA, auto selective outline.

Material letters (each maps to a palette ramp, dark -> light; index 0 of a ramp is that material's outline):
  digits '1'..'6'  -> material A ramp[1..6]   'K' -> A ramp[0]
  'a'..'f'         -> material B ramp[1..6]   'k' -> B ramp[0]
  'p'..'u'         -> material C ramp[1..6]   'q' is C[2] etc.  'P' -> C ramp[0]
  'v'..'z'         -> material D ramp[1..5]   'V' -> D ramp[0]
  'O' -> ink outline #14101e, 'W' -> palette white, '+' -> pure white highlight (#ffffff, used sparingly)
Auto outline: every clear pixel 4-adjacent to the art gets the darkest outline of the touching materials.
"""
from __future__ import annotations

import numpy as np

import uipal
from lib import blank, hexc

MAT_LETTERS = {
    'A': '123456', 'B': 'abcdef', 'C': 'pqrstu', 'D': 'vwxyz',
}
MAT_DARK = {'A': 'K', 'B': 'k', 'C': 'P', 'D': 'V'}


def _lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def draw(rows, A=None, B=None, C=None, D=None, outline=True, outline_diag=False, extra=None, out_color=None):
    """Return RGBA array. `extra` maps additional letters to hex colors."""
    if isinstance(rows, str):
        rows = [r for r in rows.strip('\n').split('\n')]
        while rows and not rows[-1].strip():
            rows.pop()
        ind = min((len(r) - len(r.lstrip(' ')) for r in rows if r.strip()), default=0)
        rows = [r[ind:].rstrip() for r in rows]
    mats = {'A': A, 'B': B, 'C': C, 'D': D}
    cmap = {}
    owner = {}
    for m, ramp in mats.items():
        if ramp is None:
            continue
        for i, L in enumerate(MAT_LETTERS[m]):
            if i + 1 < len(ramp):
                cmap[L] = ramp[i + 1]
                owner[L] = m
        cmap[MAT_DARK[m]] = ramp[0]
        owner[MAT_DARK[m]] = m
    cmap['O'] = uipal.OUTLINE
    cmap['W'] = uipal.WHITE
    cmap['+'] = '#ffffff'
    if extra:
        cmap.update(extra)
    W = max(len(r) for r in rows)
    H = len(rows)
    a = blank(W, H)
    own = np.full((H, W), '', dtype=object)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in '. ':
                continue
            if ch not in cmap:
                raise KeyError(f'letter {ch!r} has no color (row {y}: {r})')
            a[y, x] = hexc(cmap[ch])
            own[y, x] = owner.get(ch, '')
    if outline:
        m = a[..., 3] > 0
        res = a.copy()
        offs = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        if outline_diag:
            offs += [(-1, -1), (1, -1), (-1, 1), (1, 1)]
        for y in range(H):
            for x in range(W):
                if m[y, x]:
                    continue
                best = None
                for dy, dx in offs:
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx]:
                        o = own[yy, xx]
                        if out_color is not None:
                            c = hexc(out_color)
                        elif o and mats[o] is not None:
                            c = hexc(mats[o][0])
                        else:
                            c = hexc(uipal.OUTLINE)
                        if best is None or _lum(c) < _lum(best):
                            best = c
                if best is not None:
                    res[y, x] = best
        a = res
    return a


def frames_shift(a, offsets, w=None, h=None):
    """Make animation frames by placing `a` at offsets inside a fixed cell."""
    H0, W0 = a.shape[:2]
    w = w or W0 + max(abs(o[0]) for o in offsets)
    h = h or H0 + max(abs(o[1]) for o in offsets)
    out = []
    for dx, dy in offsets:
        f = blank(w, h)
        f[max(0, dy):max(0, dy) + H0, max(0, dx):max(0, dx) + W0] = a
        out.append(f)
    return out
