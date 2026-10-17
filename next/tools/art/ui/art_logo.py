"""Title logo: 'LEXICON QUEST' custom pixel lettering, quill + swash flourish, subtitle ribbon, sparkle.

Letters are built from geometric parts rasterized at 1x without anti-aliasing (so every pixel is a real pixel),
then styled: metallic gold-to-cream gradient, inner bevel, two-step outline, drop shadow.
Outputs assets/ui/logo.png + logo.json.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw

import uipal as P
from fontlib import Font
from lib import ASSETS_UI, blank, hexc, paste, save, write_json

H = 28          # cap height of regular letters
TS = 6          # thick stem
TN = 3          # thin stroke
SER = 2         # serif thickness
SX = 2          # serif overhang


class Canvas:
    def __init__(self, w, h):
        self.im = Image.new('L', (w, h), 0)
        self.d = ImageDraw.Draw(self.im)

    def rect(self, x0, y0, x1, y1, v=255):
        if x1 > x0 and y1 > y0:
            self.d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=v)

    def poly(self, pts, v=255):
        self.d.polygon(pts, fill=v)

    def ellipse(self, x0, y0, x1, y1, v=255):
        self.d.ellipse([x0, y0, x1 - 1, y1 - 1], fill=v)

    def mask(self):
        return np.array(self.im) > 127


def stem(c, x, top, bot, w=TS, serif_top=True, serif_bot=True, sl=SX, sr=SX):
    c.rect(x, top, x + w, bot)
    if serif_top:
        c.rect(x - sl, top, x + w + sr, top + SER)
    if serif_bot:
        c.rect(x - sl, bot - SER, x + w + sr, bot)


def diag(c, x0, y0, x1, y1, w):
    """Parallelogram stroke from top (x0,y0) to bottom (x1,y1), horizontal width w."""
    c.poly([(x0, y0), (x0 + w - 1, y0), (x1 + w - 1, y1 - 1), (x1, y1 - 1)])


def ring(c, x, y, w, h, side, tb, keep=None):
    """Elliptical ring: outer box (x,y,w,h); side thickness `side`, top/bottom thickness `tb`."""
    tmp = Canvas(c.im.width, c.im.height)
    tmp.ellipse(x, y, x + w, y + h)
    tmp.ellipse(x + side, y + tb, x + w - side, y + h - tb, v=0)
    m = tmp.mask()
    if keep is not None:
        yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
        m &= keep(xx - x, yy - y, w, h)
    cur = c.mask() | m
    c.im = Image.fromarray((cur * 255).astype(np.uint8))
    c.d = ImageDraw.Draw(c.im)


# ------------------------------------------------------------------------------------------------ letters
def L_(c, x, top, bot):
    stem(c, x, top, bot, serif_bot=False)
    c.rect(x - SX, bot - 4, x + 18, bot)               # foot
    c.rect(x + 15, bot - 9, x + 18, bot)               # upturned serif
    c.rect(x + 14, bot - 9, x + 15, bot - 7)
    return 19


def E_(c, x, top, bot):
    stem(c, x, top, bot, serif_top=False, serif_bot=False)
    c.rect(x - SX, top, x + 16, top + 4)               # top arm
    c.rect(x + 13, top, x + 16, top + 9)               # beak
    mid = top + (bot - top) // 2 - 1
    c.rect(x, mid, x + 12, mid + 3)                    # middle arm
    c.rect(x + 10, mid - 3, x + 12, mid + 6)           # middle serif
    c.rect(x - SX, bot - 4, x + 17, bot)               # bottom arm
    c.rect(x + 14, bot - 10, x + 17, bot)              # upturned beak
    return 18


def X_(c, x, top, bot):
    w = 20
    diag(c, x + 1, top, x + w - TS - 1, bot, TS)       # thick: top-left to bottom-right
    diag(c, x + w - TN - 2, top, x + 2, bot, TN)       # thin: top-right to bottom-left
    c.rect(x - 1, top, x + 9, top + SER)
    c.rect(x + w - 8, top, x + w + 1, top + SER)
    c.rect(x - 1, bot - SER, x + 8, bot)
    c.rect(x + w - 10, bot - SER, x + w + 1, bot)
    return w + 1


def I_(c, x, top, bot):
    stem(c, x + SX, top, bot)
    return TS + 2 * SX + 1


def C_(c, x, top, bot):
    w, h = 21, bot - top

    def keep(xx, yy, ww, hh):
        # remove the right side opening between the terminals
        return ~((xx > ww * 0.62) & (yy > hh * 0.30) & (yy < hh * 0.70))
    ring(c, x, top, w, h, TS, TN, keep)
    c.rect(x + 16, top + 2, x + 19, top + 10)          # top terminal serif
    c.rect(x + 16, bot - 10, x + 19, bot - 2)          # bottom terminal serif
    return w + 1


def O_(c, x, top, bot, w=23):
    ring(c, x, top, w, bot - top, TS + 1, TN)
    return w + 1


def N_(c, x, top, bot):
    w = 22
    stem(c, x + 1, top, bot, w=TN, serif_top=True, serif_bot=True, sl=3, sr=3)
    stem(c, x + w - TN - 1, top, bot, w=TN, serif_top=True, serif_bot=False, sl=3, sr=3)
    diag(c, x + 1, top, x + w - TS - 1, bot, TS)
    return w + 1


def Q_(c, x, top, bot, swash_to):
    w = 25
    ring(c, x, top, w, bot - top, TS + 1, TN)
    # swash tail: from the bottom of the bowl sweeping right under the next letters
    cx = x + w // 2
    yb = bot - 2
    pts = []
    for i in range(0, swash_to - cx):
        t = i / max(1, swash_to - cx)
        y = yb + 1 + 6 * math.sin(min(1.0, t * 1.4) * math.pi * 0.5) - 4 * t * t
        thick = max(1, round(4 * (1 - t) ** 1.3))
        pts.append((cx + i, y, thick))
    for (px, py, th) in pts:
        c.rect(int(px), int(round(py)), int(px) + 1, int(round(py)) + th)
    return w + 1


def U_(c, x, top, bot):
    w = 22
    h = bot - top
    stem(c, x, top, top + h - 9, serif_bot=False)
    stem(c, x + w - TN - 2, top, top + h - 7, w=TN, serif_bot=False, sl=3, sr=3)

    def keep(xx, yy, ww, hh):
        return yy > hh * 0.5
    ring(c, x, top + h - 20, w - 1, 20, TS, TN, keep)
    c.rect(x + TS - 1, top + h - 10, x + TS + 1, top + h - 6)   # smooth the joint
    return w + 1


def S_(c, x, top, bot):
    w, h = 18, bot - top
    hh = h // 2 + 2

    def keep_top(xx, yy, ww, hhh):
        return ~((xx > ww * 0.55) & (yy > hhh * 0.42))
    ring(c, x, top, w, hh, 5, TN, keep_top)

    def keep_bot(xx, yy, ww, hhh):
        return ~((xx < ww * 0.45) & (yy < hhh * 0.58))
    ring(c, x, top + h - hh, w, hh, 5, TN, keep_bot)
    c.rect(x + w - 4, top + 2, x + w - 1, top + 9)    # top terminal
    c.rect(x + 1, bot - 9, x + 4, bot - 2)            # bottom terminal
    return w + 1


def T_(c, x, top, bot):
    w = 22
    c.rect(x, top, x + w, top + 4)
    c.rect(x, top, x + 3, top + 9)
    c.rect(x + w - 3, top, x + w, top + 9)
    stem(c, x + (w - TS) // 2, top, bot, serif_top=False, sl=3, sr=3)
    return w + 1


# ------------------------------------------------------------------------------------------------ styling
def neighbors(m, dy, dx):
    """m shifted by (dy, dx) with zero fill (no wrap-around)."""
    h, w = m.shape
    out = np.zeros_like(m)
    ys0, ys1 = max(0, dy), min(h, h + dy)
    xs0, xs1 = max(0, dx), min(w, w + dx)
    out[ys0:ys1, xs0:xs1] = m[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def dilate(m, diag=True):
    out = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if (dy or dx) and (diag or dy == 0 or dx == 0):
                out |= neighbors(m, dy, dx)
    return out


def style_metal(m, top, bot, grad):
    """Fill mask m (bool HxW) with a vertical metallic gradient spanning rows top..bot."""
    h, w = m.shape
    a = blank(w, h)
    stops = grad
    for y in range(h):
        t = min(1.0, max(0.0, (y - top) / max(1, bot - top)))
        # piecewise: find segment
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                u = 0 if t1 == t0 else (t - t0) / (t1 - t0)
                # quantize to palette: pick nearest of the two stops (banded like SNES gradients)
                col = c0 if u < 0.5 else c1
                break
        else:
            col = stops[-1][1]
        row = m[y]
        a[y, row] = hexc(col)
    return a


GOLD_GRAD = [
    (0.00, P.GOLD[5]),     # cream top
    (0.18, P.GOLD[5]),
    (0.30, P.GOLD[4]),
    (0.47, P.GOLD[4]),
    (0.50, P.GOLD[3]),     # horizon step (metallic)
    (0.62, P.GOLD[2]),
    (0.80, P.GOLD[3]),
    (1.00, P.GOLD[4]),
]


def swash(c, x0, y0, x1, y1):
    """Calligraphic stroke from (x0,y0) to (x1,y1): sags downward, tapers from 4 px to 1 px."""
    n = x1 - x0
    for i in range(n + 1):
        t = i / max(1, n)
        y = y0 + (y1 - y0) * t + 5 * math.sin(math.pi * min(1.0, t * 1.15))
        th = max(1, round(1 + 3.4 * (1 - t) ** 1.4))
        c.rect(x0 + i, int(round(y)) - th // 2, x0 + i + 1, int(round(y)) - th // 2 + th)


def draw_quill(length_x=44, length_y=46):
    """Procedural quill: nib at bottom-left, feather tip at top-right. Returns (rgba, nib_xy)."""
    pad = 6
    W, Hq = length_x + 2 * pad, length_y + 2 * pad
    N = np.array([pad, Hq - pad], float)
    T = np.array([W - pad, pad], float)
    L = np.linalg.norm(T - N)
    d = (T - N) / L
    nrm = np.array([d[1], -d[0]])            # points up-left of the shaft
    a = blank(W, Hq)
    m = np.zeros((Hq, W), bool)
    for y in range(Hq):
        for x in range(W):
            p = np.array([x + 0.5, y + 0.5]) - N
            u = p.dot(d) / L
            v = p.dot(nrm)
            if u < -0.02 or u > 1.02:
                continue
            c = None
            if u < 0.17:                                   # nib (gold) with a slit
                wn = 0.4 + 1.6 * (u / 0.17)
                if abs(v) <= wn:
                    c = P.GOLD[4] if v > 0 else P.GOLD[2]
                    if abs(v) < 0.5 and 0.03 < u < 0.12:
                        c = P.GOLD[0]
            else:
                uu = (u - 0.24) / 0.76
                prof = math.sin(math.pi * min(1, max(0, uu)) ** 0.85) ** 0.6 if 0 <= uu <= 1 else 0
                up_w, dn_w = 10.0 * prof, 6.5 * prof
                if abs(v) <= 0.75:
                    c = P.GOLD[5]                          # rachis (shaft)
                elif 0 < v <= up_w:
                    c = P.WHITE
                    k = (u * L * 0.9 + v * 1.1) % 4.0
                    if k < 1.0 or v > up_w - 1.2:
                        c = P.METAL[3]
                elif 0 > v >= -dn_w:
                    c = P.METAL[2]
                    k = (u * L * 0.9 - v * 1.1) % 4.0
                    if k < 1.0:
                        c = P.STEEL[3]
                elif u < 0.24 and abs(v) <= 1.0:
                    c = P.GOLD[3]                          # ferrule
            if c is not None:
                a[y, x] = hexc(c)
                m[y, x] = True
    o = dilate(m, diag=False) & ~m
    a[o] = hexc(P.OUTLINE)
    return a, (int(N[0]), int(N[1]))


def build_logo():
    W, Hc = 300, 70
    c = Canvas(W, Hc)
    top, bot = 16, 16 + H
    x = 6
    x += L_(c, x, top - 4, bot + 2) + 1
    x += E_(c, x, top, bot) + 1
    x += X_(c, x, top, bot) + 1
    x += I_(c, x, top, bot) + 1
    x += C_(c, x, top, bot) + 1
    x += O_(c, x, top, bot) + 1
    x += N_(c, x, top, bot) + 1
    x += 7
    qx = x
    x += Q_(c, x, top - 3, bot + 3, swash_to=x) + 1     # bowl only; the swash is drawn below
    x += U_(c, x, top, bot) + 1
    x += E_(c, x, top, bot) + 1
    s_x = x
    x += S_(c, x, top, bot) + 1
    x += T_(c, x, top, bot) + 1
    text_right = x
    nib_x, nib_y = s_x + 11, bot + 7
    swash(c, qx + 13, bot + 1, nib_x, nib_y)
    m = c.mask()
    quill, (nqx, nqy) = draw_quill(length_x=text_right - nib_x + 4, length_y=nib_y - 3)
    fill = style_metal(m, top - 4, bot + 3, GOLD_GRAD)
    up = m & ~neighbors(m, 1, 0)
    left = m & ~neighbors(m, 0, 1)
    down = m & ~neighbors(m, -1, 0)
    right = m & ~neighbors(m, 0, -1)
    fill[(up | left) & m] = hexc(P.WHITE)
    fill[(down | right) & m & ~(up | left)] = hexc(P.GOLD[1])
    up2 = m & neighbors(up, 1, 0) & ~up & ~left
    fill[up2] = hexc(P.GOLD[5])
    o1 = dilate(m, diag=False) & ~m
    o2 = dilate(m | o1, diag=True) & ~(m | o1)
    out = blank(W, Hc)
    paste(out, quill, nib_x - nqx, nib_y - nqy)          # quill behind the lettering
    sh_src = m | o1 | o2
    sh = neighbors(sh_src, 2, 2) & ~sh_src
    shadow = blank(W, Hc)
    shadow[sh] = hexc(P.OUTLINE, 150)
    paste(out, shadow, 0, 0)
    out[o2] = hexc(P.OUTLINE)
    out[o1] = hexc(P.GOLD[0])
    paste(out, fill, 0, 0)
    yy, xx = np.nonzero(out[..., 3] > 0)
    return out[yy.min():yy.max() + 1, xx.min():xx.max() + 1]


# ------------------------------------------------------------------------------------------------ subtitle
def build_subtitle():
    f = Font(ASSETS_UI / 'font_large.json', P.TEXT)
    text = 'The Reforged Realms'
    tw = f.ink_width(text)
    W = tw + 40
    Hs = 20
    a = blank(W, Hs + 4)
    # ribbon body
    for y in range(2, Hs + 2):
        for x in range(8, W - 8):
            a[y, x] = hexc(P.INK[1])
    for x in range(8, W - 8):
        a[2, x] = hexc(P.OUTLINE)
        a[3, x] = hexc(P.GOLD[4])
        a[4, x] = hexc(P.GOLD[1])
        a[Hs - 1, x] = hexc(P.GOLD[1])
        a[Hs, x] = hexc(P.GOLD[3])
        a[Hs + 1, x] = hexc(P.OUTLINE)
    # folded ends (swallowtail) + darker back fold
    for y in range(4, Hs + 4):
        depth = abs(y - (Hs + 4) / 2 - 0.5)
        notch = int(5 - depth * 0.6)
        for x in range(0, 9):
            if x >= max(0, notch) and 4 <= y <= Hs + 3:
                a[y, x] = hexc(P.INK[2])
                a[y, W - 1 - x] = hexc(P.INK[2])
    # outline of the fold
    m = a[..., 3] > 0
    ring = dilate(m, diag=False) & ~m
    a[ring] = hexc(P.OUTLINE)
    # fold shadow
    for y in range(5, Hs + 3):
        a[y, 8] = hexc(P.OUTLINE)
        a[y, W - 9] = hexc(P.OUTLINE)
    f.draw(a, (W - tw) // 2, 3, text, color=P.GOLD[5], shadow=P.OUTLINE)
    return a


# ------------------------------------------------------------------------------------------------ sparkle
SPARKS = [
    """
    .....
    .....
    ..+..
    .....
    .....
    """,
    """
    .........
    .........
    ....5....
    ...5+5...
    ....5....
    .........
    .........
    """,
    """
    ....4....
    ....5....
    ...454...
    4554+4554
    ...454...
    ....5....
    ....4....
    """,
    """
    .........
    ....4....
    ....5....
    ..45+54..
    ....5....
    ....4....
    .........
    """,
    """
    .........
    .........
    ....4....
    ...4.4...
    ....4....
    .........
    .........
    """,
]


def sparkle_frames():
    from spr import draw
    out = []
    for s in SPARKS:
        f = draw(s, A=P.GOLD, outline=False)
        c = blank(9, 9)
        oy = (9 - f.shape[0]) // 2
        ox = (9 - f.shape[1]) // 2
        paste(c, f, ox, oy)
        out.append(c)
    return out


def build():
    logo = build_logo()
    sub = build_subtitle()
    sp = sparkle_frames()
    W = max(logo.shape[1], sub.shape[1]) + 2
    Hh = logo.shape[0] + sub.shape[0] + 12 + 3
    sheet = blank(W, Hh)
    paste(sheet, logo, 1, 1)
    sy = logo.shape[0] + 2
    paste(sheet, sub, 1, sy)
    fy = sy + sub.shape[0] + 1
    frames = {'logo': [1, 1, logo.shape[1], logo.shape[0]],
              'subtitle': [1, sy, sub.shape[1], sub.shape[0]]}
    for i, f in enumerate(sp):
        paste(sheet, f, 1 + i * 10, fy)
        frames[f'sparkle_{i}'] = [1 + i * 10, fy, 9, 9]
    save(sheet, ASSETS_UI / 'logo.png')
    js = {'image': 'logo.png', 'frames': frames,
          'origins': {f'sparkle_{i}': [4, 4] for i in range(5)},
          'anims': {'sparkle': {'frames': [f'sparkle_{i}' for i in range(5)], 'fps': 15, 'loop': False}},
          'layout': {'note': 'Title screen: logo centered; subtitle centered 3 px under the logo. '
                             'Sparkles: spawn one every ~1.5 s at a random opaque logo pixel on the upper half.'}}
    write_json(js, ASSETS_UI / 'logo.json')
    return sheet, logo, sub, sp


if __name__ == '__main__':
    build()
    print('logo ok')
