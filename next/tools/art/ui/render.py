"""Reference drawing of UI pieces for mock screens (mirrors what ui/window.js etc. should do in the game)."""
from __future__ import annotations

import json

import numpy as np
from PIL import Image

import uipal
from lib import ASSETS_UI, blank, hexc, paste


def _load_json(name):
    return json.loads((ASSETS_UI / name).read_text(encoding='utf-8'))


def _load_img(name):
    return np.array(Image.open(ASSETS_UI / name).convert('RGBA'))


class Atlas:
    def __init__(self, json_name):
        self.js = _load_json(json_name)
        self.img = _load_img(self.js['image'])
        self.frames = self.js['frames']

    def get(self, fid):
        f = self.frames[fid]
        if isinstance(f, dict):
            f = f['rect']
        x, y, w, h = f
        return self.img[y:y + h, x:x + w]

    def origin(self, fid):
        o = self.js.get('origins', {}).get(fid)
        return o or [0, 0]

    def draw(self, dst, fid, x, y, tint=None, alpha=1.0, use_origin=True, flip=False):
        g = self.get(fid).copy()
        if flip:
            g = g[:, ::-1].copy()
        if tint is not None:
            c = hexc(tint) if isinstance(tint, str) else tint
            m = g[..., 3] > 0
            g[m, 0:3] = c[:3]
        if alpha < 1:
            g[..., 3] = (g[..., 3].astype(np.float32) * alpha).astype(np.uint8)
        ox, oy = self.origin(fid) if use_origin else (0, 0)
        paste(dst, g, x - ox, y - oy)

    def size(self, fid):
        f = self.frames[fid]
        if isinstance(f, dict):
            f = f['rect']
        return f[2], f[3]


def gradient_color(scheme, t):
    s = uipal.SCHEMES[scheme]
    top, mid, bot = hexc(s['top']), hexc(s['mid']), hexc(s['bottom'])
    if t < 0.45:
        u = t / 0.45
        a, b = top, mid
    else:
        u = (t - 0.45) / 0.55
        a, b = mid, bot
    return tuple(int(round(a[i] + (b[i] - a[i]) * u)) for i in range(3))


def nine_slice(dst, src, x, y, w, h, border):
    l, t, r, b = border
    sh, sw = src.shape[:2]

    def blit(sx, sy, swid, shei, dx, dy, dw, dh):
        if dw <= 0 or dh <= 0 or swid <= 0 or shei <= 0:
            return
        piece = src[sy:sy + shei, sx:sx + swid]
        ys = (np.arange(dh) * shei // dh)
        xs = (np.arange(dw) * swid // dw)
        paste(dst, piece[ys][:, xs], dx, dy)
    mw, mh = sw - l - r, sh - t - b
    blit(0, 0, l, t, x, y, l, t)
    blit(sw - r, 0, r, t, x + w - r, y, r, t)
    blit(0, sh - b, l, b, x, y + h - b, l, b)
    blit(sw - r, sh - b, r, b, x + w - r, y + h - b, r, b)
    blit(l, 0, mw, t, x + l, y, w - l - r, t)
    blit(l, sh - b, mw, b, x + l, y + h - b, w - l - r, b)
    blit(0, t, l, mh, x, y + t, l, h - t - b)
    blit(sw - r, t, r, mh, x + w - r, y + t, r, h - t - b)
    blit(l, t, mw, mh, x + l, y + t, w - l - r, h - t - b)          # center (transparent for windows)


class Windows:
    def __init__(self):
        self.js = _load_json('window.json')
        self.img = _load_img('window.png')

    def frame_img(self, kind):
        x, y, w, h = self.js['frames'][kind]['rect']
        return self.img[y:y + h, x:x + w]

    def draw(self, dst, x, y, w, h, scheme='blue', kind='std', alpha=1.0):
        fr = self.js['frames'][kind]
        ins = fr['fillInset']
        fx, fy, fw, fh = x + ins, y + ins, w - 2 * ins, h - 2 * ins
        for i in range(fh):
            c = gradient_color(scheme, i / max(1, fh - 1))
            row = blank(fw, 1)
            row[0, :] = (*c, int(round(255 * alpha)))
            paste(dst, row, fx, fy + i)
        nine_slice(dst, self.frame_img(kind), x, y, w, h, fr['border'])

    def draw_tail(self, dst, wx, wy, ww, wh, tip_x, direction='down', scheme='blue', field=False, alpha=1.0):
        name = f'tail_{direction}' + ('_field' if field else '')
        t = self.js['tails'][name]
        fx, fy, fw, fh = self.js['frames'][t['fill']]
        frx, fry, frw, frh = self.js['frames'][t['frame']]
        fill = self.img[fy:fy + fh, fx:fx + fw].copy()
        frm = self.img[fry:fry + frh, frx:frx + frw]
        if direction == 'down':
            sy = wy + wh - 4
            col = gradient_color(scheme, 1.0)
        else:
            sy = wy + 4 - fh
            col = gradient_color(scheme, 0.0)
        sx = tip_x - t['tipX']
        m = fill[..., 3] > 0
        fill[m, 0:3] = col
        fill[m, 3] = int(round(255 * alpha))
        paste(dst, fill, sx, sy)
        paste(dst, frm, sx, sy)
