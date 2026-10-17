"""Shared pixel helpers for the W1-ui-art generators.

Everything works on numpy RGBA uint8 arrays (H, W, 4). All output is deterministic.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
NEXT = HERE.parent.parent.parent          # .../next
ASSETS_UI = NEXT / 'assets' / 'ui'
OUT = HERE / 'out'
REPO = NEXT.parent


def hexc(h: str, a: int = 255) -> tuple:
    h = h.lstrip('#')
    if len(h) == 8:
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16))
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def blank(w: int, h: int) -> np.ndarray:
    return np.zeros((h, w, 4), np.uint8)


def from_ascii(rows, cmap: dict, w: int | None = None) -> np.ndarray:
    """rows: list of strings (or a multi-line string). cmap: char -> color tuple/hex. '.' and ' ' are clear."""
    if isinstance(rows, str):
        rows = [r for r in rows.strip('\n').split('\n')]
        while rows and not rows[-1].strip():
            rows.pop()
        # strip common indentation
        ind = min((len(r) - len(r.lstrip(' ')) for r in rows if r.strip()), default=0)
        rows = [r[ind:] for r in rows]
    W = w or max(len(r) for r in rows)
    a = blank(W, len(rows))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in '. ':
                continue
            c = cmap[ch]
            if isinstance(c, str):
                c = hexc(c)
            a[y, x] = c
    return a


def paste(dst: np.ndarray, src: np.ndarray, x: int, y: int, mode: str = 'over') -> None:
    """Alpha-composite src onto dst at (x, y). mode 'over' (straight alpha) or 'copy'."""
    H, W = dst.shape[:2]
    h, w = src.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    s = src[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32)
    d = dst[y0:y1, x0:x1].astype(np.float32)
    if mode == 'copy':
        m = s[..., 3:4] > 0
        dst[y0:y1, x0:x1] = np.where(m, s, d).astype(np.uint8)
        return
    sa = s[..., 3:4] / 255.0
    da = d[..., 3:4] / 255.0
    oa = sa + da * (1 - sa)
    with np.errstate(invalid='ignore', divide='ignore'):
        oc = np.where(oa > 0, (s[..., :3] * sa + d[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6), 0)
    out = np.concatenate([oc, oa * 255.0], axis=-1)
    dst[y0:y1, x0:x1] = np.clip(np.round(out), 0, 255).astype(np.uint8)


def mask_of(a: np.ndarray) -> np.ndarray:
    return a[..., 3] > 0


def outline(a: np.ndarray, color, diag: bool = False, pad: int = 1) -> np.ndarray:
    """Return a new array padded by `pad` with a 1 px outline in `color` around opaque pixels."""
    if isinstance(color, str):
        color = hexc(color)
    h, w = a.shape[:2]
    out = blank(w + 2 * pad, h + 2 * pad)
    out[pad:pad + h, pad:pad + w] = a
    m = mask_of(out)
    ring = np.zeros_like(m)
    offs = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    if diag:
        offs += [(-1, -1), (1, -1), (-1, 1), (1, 1)]
    for dy, dx in offs:
        ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    ring &= ~m
    out[ring] = color
    return out


def recolor(a: np.ndarray, color) -> np.ndarray:
    if isinstance(color, str):
        color = hexc(color)
    b = a.copy()
    m = mask_of(b)
    b[m, 0:3] = color[:3]
    return b


def shift(a: np.ndarray, dx: int, dy: int) -> np.ndarray:
    h, w = a.shape[:2]
    b = blank(w, h)
    paste(b, a, dx, dy, 'copy')
    return b


def bbox(a: np.ndarray):
    m = mask_of(a)
    ys, xs = np.nonzero(m)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def crop(a: np.ndarray, box) -> np.ndarray:
    x0, y0, x1, y1 = box
    return a[y0:y1, x0:x1].copy()


def to_img(a: np.ndarray) -> Image.Image:
    return Image.fromarray(a, 'RGBA')


def from_img(im: Image.Image) -> np.ndarray:
    return np.array(im.convert('RGBA'))


def save(a: np.ndarray, path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    to_img(a).save(path, optimize=True)


def upscale(a: np.ndarray, k: float) -> np.ndarray:
    """Nearest-neighbor upscale (k may be non-integer to emulate phone scaling)."""
    h, w = a.shape[:2]
    H, W = int(round(h * k)), int(round(w * k))
    ys = np.minimum((np.arange(H) / k).astype(int), h - 1)
    xs = np.minimum((np.arange(W) / k).astype(int), w - 1)
    return a[ys][:, xs]


def save_preview(a: np.ndarray, name: str, k: float = 3, bg: str | None = '#2a2438') -> Path:
    b = a
    if bg is not None:
        base = blank(a.shape[1], a.shape[0])
        base[...] = hexc(bg)
        paste(base, a, 0, 0)
        b = base
    p = OUT / f'{name}.png'
    save(upscale(b, k), p)
    return p


def lerp_color(c0, c1, t: float):
    return tuple(int(round(c0[i] + (c1[i] - c0[i]) * t)) for i in range(len(c0)))


def write_json(obj, path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    txt = json.dumps(obj, indent=1, ensure_ascii=False)
    path.write_text(txt + '\n', encoding='utf-8')


def checker(w, h, c0='#2a2438', c1='#332c44', s=8):
    a = blank(w, h)
    for y in range(h):
        for x in range(w):
            a[y, x] = hexc(c0 if ((x // s) + (y // s)) % 2 == 0 else c1)
    return a
