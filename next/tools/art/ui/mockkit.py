"""Helpers for composing mock screens (reference implementations of how the game should draw UI pieces).

Mock-only placeholders (portraits, enemies) are cut from the painted sources into memory; they are NOT assets.
"""
from __future__ import annotations

import json

import numpy as np
from PIL import Image

import uipal as P
from fontlib import Font
from lib import ASSETS_UI, NEXT, REPO, blank, from_img, hexc, paste
from render import Atlas, Windows, nine_slice

W, H = 384, 216


class Kit:
    def __init__(self):
        self.ui = Atlas('ui.json')
        self.win = Windows()
        self.logo = Atlas('logo.json')
        self.f = Font(ASSETS_UI / 'font.json', {**P.TEXT, **P.RARITY})
        self.fl = Font(ASSETS_UI / 'font_large.json', {**P.TEXT, **P.RARITY})
        self.fn = Font(ASSETS_UI / 'font_num.json')
        self.fnb = Font(ASSETS_UI / 'font_num_big.json')
        self.fn_js = json.loads((ASSETS_UI / 'font_num.json').read_text(encoding='utf-8'))
        self.fnb_js = json.loads((ASSETS_UI / 'font_num_big.json').read_text(encoding='utf-8'))

    # -------------------------------------------------------------------------------- primitives
    def sprite(self, dst, fid, x, y, **kw):
        self.ui.draw(dst, fid, x, y, **kw)

    def window(self, dst, x, y, w, h, scheme='blue', kind='std', alpha=1.0):
        self.win.draw(dst, x, y, w, h, scheme, kind, alpha)

    def text(self, dst, x, y, s, color='white', large=False):
        return (self.fl if large else self.f).draw(dst, x, y, s, color=color)

    def text_right(self, dst, xr, y, s, color='white', large=False):
        f = self.fl if large else self.f
        return f.draw(dst, xr - f.ink_width(s), y, s, color=color)

    def number(self, dst, cx, y, s, variant='white', big=False):
        f = self.fnb if big else self.fn
        js = self.fnb_js if big else self.fn_js
        w = f.measure(s)
        f.draw_raw(dst, cx - w // 2, y, s, dy_variant=js['variants'][variant])

    def word(self, dst, cx, cy, word):
        x, y, w, h = self.fn_js['words'][word]
        g = self.fn.img[y:y + h, x:x + w]
        paste(dst, g, cx - w // 2, cy - h // 2)

    def gauge(self, dst, x, y, w, frac, kind='hp', thin=False, lag=None, glow_frame=None, shine_frame=None):
        fr = 'gauge_frame_thin' if thin else 'gauge_frame'
        fx, fy, fw, fh = self.ui.frames[fr]
        src = self.ui.img[fy:fy + fh, fx:fx + fw]
        nine_slice(dst, src, x, y, w, fh, [2, 0, 2, 0])
        inner = w - 2
        fill_h = 2 if thin else 3
        if lag is not None and lag > frac:
            sid = 'gauge_lag' + ('_thin' if thin else '')
            sx, sy, sw, sh = self.ui.frames[sid]
            col = self.ui.img[sy:sy + sh, sx:sx + sw]
            n = int(round(inner * lag))
            for i in range(n):
                paste(dst, col, x + 1 + i, y + 1)
        if kind == 'hp':
            kind = 'hp' if frac > 0.5 else ('hp_mid' if frac > 0.25 else 'hp_low')
        sid = f'gauge_{kind}' + ('_thin' if thin else '')
        sx, sy, sw, sh = self.ui.frames[sid]
        col = self.ui.img[sy:sy + sh, sx:sx + sw]
        n = int(round(inner * frac))
        for i in range(n):
            paste(dst, col, x + 1 + i, y + 1)
        if shine_frame is not None and frac >= 1:
            sx, sy, sw, sh = self.ui.frames[f'fury_shine_{shine_frame}']
            pat = self.ui.img[sy:sy + sh, sx:sx + sw]
            for i in range(0, inner, sw):
                paste(dst, pat[:fill_h, :min(sw, inner - i)], x + 1 + i, y + 1)
        if glow_frame is not None and frac >= 1:
            gx, gy, gw, gh = self.ui.frames[f'gauge_glow_{glow_frame}']
            g = self.ui.img[gy:gy + gh, gx:gx + gw]
            nine_slice(dst, g, x - 2, y - 2, w + 4, fh + 4, [4, 4, 4, 4])

    def banner(self, dst, cx, y, text):
        f = self.fl
        tw = f.ink_width(text)
        lw = self.ui.size('banner_l')[0]
        rw = self.ui.size('banner_r')[0]
        total = tw + 2 * lw + 16
        x = cx - total // 2
        self.ui.draw(dst, 'banner_l', x, y)
        mx, my, mw, mh = self.ui.frames['banner_m']
        mid = self.ui.img[my:my + mh, mx:mx + mw]
        for i in range(total - lw - rw):
            paste(dst, mid, x + lw + i, y)
        self.ui.draw(dst, 'banner_r', x + total - rw, y)
        f.draw(dst, cx - tw // 2, y + 2, text, color=P.GOLD[5])


# ------------------------------------------------------------------------------------ backdrops
def env_cell(idx):
    im = Image.open(REPO / 'assets' / 'art' / 'environments.webp').convert('RGB')
    cw, ch = im.width // 2, im.height // 4
    c = im.crop(((idx % 2) * cw, (idx // 2) * ch, (idx % 2) * cw + cw, (idx // 2) * ch + ch))
    return c


def backdrop(idx, w=W, h=H, darken_band=False):
    c = env_cell(idx)
    # crop to 16:9
    tw = c.width
    th = int(tw * h / w)
    if th > c.height:
        th = c.height
        tw = int(th * w / h)
    c = c.crop(((c.width - tw) // 2, (c.height - th) // 2, (c.width - tw) // 2 + tw, (c.height - th) // 2 + th))
    c = c.resize((w, h), Image.BOX)
    c = c.quantize(64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    a = from_img(c)
    if darken_band:
        for y in range(h):
            t = max(0.0, (y - h * 0.62) / (h * 0.38))
            k = 1 - 0.55 * min(1, t * 1.4)
            a[y, :, :3] = (a[y, :, :3].astype(np.float32) * k).astype(np.uint8)
    return a


def portrait_placeholder(idx, size=48):
    """Mock-only face crop from portraits.webp (4x2 grid)."""
    im = Image.open(REPO / 'assets' / 'art' / 'portraits.webp').convert('RGB')
    cw, ch = im.width // 4, im.height // 2
    c = im.crop(((idx % 4) * cw, (idx // 4) * ch, (idx % 4) * cw + cw, (idx // 4) * ch + ch))
    m = int(cw * 0.08)
    c = c.crop((m, 0, cw - m, ch - 2 * m))
    c = c.resize((size, size), Image.BOX)
    c = c.quantize(32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    return from_img(c)


def sprite_from(json_rel, fid):
    js = json.loads((NEXT / json_rel).read_text(encoding='utf-8'))
    img = from_img(Image.open((NEXT / json_rel).parent / js['image']))
    x, y, w, h = js['frames'][fid]
    org = js.get('origin', [0, 0])
    if isinstance(org, dict):
        org = org.get(fid, [w // 2, h - 1])
    return img[y:y + h, x:x + w], org
