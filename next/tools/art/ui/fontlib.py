"""Bitmap font building (parse glyph art, pack to PNG + COMMON.md JSON) and a reference renderer.

The renderer here mirrors the contract that src/core/font.js implements: white glyphs tinted per color,
1 px dark-ink shadow down-right, kerning pairs, {c:name}..{/c} color codes, word wrap.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np

from lib import blank, hexc, paste, save, write_json

WHITE = (255, 255, 255, 255)


# ----------------------------------------------------------------------------------------------- parsing
def parse(data: str):
    """Return list of dicts {ch, rows, top, adv, raw} in source order."""
    out = []
    cur = None
    for line in data.split('\n'):
        if not line.strip():
            continue
        if line.startswith('@') and (cur is None or len(line) > 1):
            # header: '@X ...' where X is one char or U+XXXX. A row can never start with '@'.
            parts = line[1:].split(' ')
            key = parts[0]
            if key == '' and len(parts) > 1:      # '@ ' would be space; not used
                key = ' '
            ch = chr(int(key[2:], 16)) if key.startswith('U+') else key
            cur = {'ch': ch, 'rows': [], 'top': 0, 'adv': None, 'raw': False, 'xoff': 0}
            for p in parts[1:]:
                if p.startswith('top='):
                    cur['top'] = int(p[4:])
                elif p.startswith('adv='):
                    cur['adv'] = int(p[4:])
                elif p.startswith('xoff='):
                    cur['xoff'] = int(p[5:])
                elif p == 'raw':
                    cur['raw'] = True
            out.append(cur)
            continue
        cur['rows'].append(line.rstrip())
    return out


def rows_to_mask(rows) -> np.ndarray:
    w = max(len(r) for r in rows)
    m = np.zeros((len(rows), w), bool)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == '#':
                m[y, x] = True
    return m


def embolden(m: np.ndarray) -> np.ndarray:
    h, w = m.shape
    o = np.zeros((h, w + 1), bool)
    o[:, :w] |= m
    o[:, 1:] |= m
    return o


# ----------------------------------------------------------------------------------------------- packing
def build_font(glyph_defs, *, image_name, line_height, cap_top, baseline, space_advance, kerning,
               bold=False, extra=None, cols=16, cell_pad=1):
    """glyph_defs from parse(). Returns (png_array, json_dict, masks_by_char)."""
    masks = {}
    for g in glyph_defs:
        m = rows_to_mask(g['rows'])
        if bold and not g['raw']:
            m = embolden(m)
        masks[g['ch']] = (m, g)
    # order by code point for a tidy sheet
    chars = sorted(masks.keys(), key=ord)
    # trimmed boxes
    items = []
    for ch in chars:
        m, g = masks[ch]
        ys, xs = np.nonzero(m)
        if len(xs) == 0:
            continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        items.append((ch, m[y0:y1, x0:x1], int(x0), int(y0), g, m.shape[1]))
    cw = max(it[1].shape[1] for it in items) + cell_pad
    chh = max(it[1].shape[0] for it in items) + cell_pad
    rows_n = (len(items) + cols - 1) // cols
    W, H = cols * cw + cell_pad, rows_n * chh + cell_pad
    img = blank(W, H)
    glyphs = {}
    for i, (ch, m, x0, y0, g, full_w) in enumerate(items):
        gx = cell_pad + (i % cols) * cw
        gy = cell_pad + (i // cols) * chh
        h, w = m.shape
        img[gy:gy + h, gx:gx + w][m] = WHITE
        adv = g['adv'] if g['adv'] is not None else full_w + 1
        glyphs[ch] = [gx, gy, w, h, x0 + g['xoff'], cap_top + g['top'] + y0, adv]
    js = {'image': image_name, 'lineHeight': line_height, 'baseline': baseline,
          'spaceAdvance': space_advance, 'glyphs': glyphs, 'kerning': dict(kerning)}
    if extra:
        js.update(extra)
    return img, js


# ----------------------------------------------------------------------------------------------- renderer
CODE_RE = re.compile(r'\{c:([a-z0-9_#]+)\}|\{/c\}')


class Font:
    def __init__(self, json_path, colors=None):
        p = Path(json_path)
        self.js = json.loads(p.read_text(encoding='utf-8'))
        from PIL import Image
        self.img = np.array(Image.open(p.parent / self.js['image']).convert('RGBA'))
        self.glyphs = self.js['glyphs']
        self.kern = self.js.get('kerning', {})
        self.lh = self.js['lineHeight']
        self.space = self.js['spaceAdvance']
        self.colors = colors or {}
        self._cache = {}

    def _col(self, c):
        if isinstance(c, tuple):
            return c
        if c in self.colors:
            c = self.colors[c]
        return hexc(c)

    def tinted(self, ch, color, dy=0):
        key = (ch, color, dy)
        if key not in self._cache:
            x, y, w, h = self.glyphs[ch][:4]
            g = self.img[y + dy:y + dy + h, x:x + w].copy()
            if color is not None:
                m = g[..., 3] > 0
                g[m, 0:3] = color[:3]
            self._cache[key] = g
        return self._cache[key]

    @staticmethod
    def strip_codes(text):
        return CODE_RE.sub('', text)

    def measure(self, text):
        text = self.strip_codes(text)
        best = 0
        for line in text.split('\n'):
            w = 0
            prev = None
            for ch in line:
                if ch == ' ':
                    w += self.space
                elif ch in self.glyphs:
                    if prev is not None:
                        w += self.kern.get(prev + ch, 0)
                    w += self.glyphs[ch][6]
                prev = ch if ch != ' ' else None
            best = max(best, w)
        return best

    def ink_width(self, text):
        """Width up to the last inked pixel (advance minus trailing gap)."""
        text = self.strip_codes(text)
        if not text:
            return 0
        w = self.measure(text)
        last = text.rstrip()[-1:] or ' '
        if last in self.glyphs:
            g = self.glyphs[last]
            w -= g[6] - (g[4] + g[2])
        return w

    def wrap(self, text, max_w):
        out = []
        for para in text.split('\n'):
            words = para.split(' ')
            line = ''
            for wd in words:
                trial = wd if not line else line + ' ' + wd
                if self.measure(trial) <= max_w or not line:
                    line = trial
                else:
                    out.append(line)
                    line = wd
            out.append(line)
        return out

    def draw(self, dst, x, y, text, color='white', shadow='#14101e', dy_variant=0):
        """Draw (multi-line) text with color codes. Returns pen x at end."""
        base = self._col(color)
        sh = self._col(shadow) if shadow else None
        stack = [base]
        pen_x, pen_y = x, y
        prev = None
        i = 0
        while i < len(text):
            mt = CODE_RE.match(text, i)
            if mt:
                if mt.group(1):
                    stack.append(self._col(mt.group(1)))
                elif len(stack) > 1:
                    stack.pop()
                i = mt.end()
                continue
            ch = text[i]
            i += 1
            if ch == '\n':
                pen_x = x
                pen_y += self.lh
                prev = None
                continue
            if ch == ' ':
                pen_x += self.space
                prev = None
                continue
            if ch not in self.glyphs:
                ch = '?'
            if prev is not None:
                pen_x += self.kern.get(prev + ch, 0)
            gx, gy, w, h, xo, yo, adv = self.glyphs[ch]
            if sh is not None:
                paste(dst, self.tinted(ch, sh, dy_variant), pen_x + xo + 1, pen_y + yo + 1)
            paste(dst, self.tinted(ch, stack[-1], dy_variant), pen_x + xo, pen_y + yo)
            pen_x += adv
            prev = ch
        return pen_x

    def draw_raw(self, dst, x, y, text, dy_variant=0):
        """Draw untinted (for pre-colored fonts such as font_num)."""
        pen_x = x
        prev = None
        for ch in text:
            if ch == ' ':
                pen_x += self.space
                prev = None
                continue
            if prev is not None:
                pen_x += self.kern.get(prev + ch, 0)
            gx, gy, w, h, xo, yo, adv = self.glyphs[ch]
            paste(dst, self.tinted(ch, None, dy_variant), pen_x + xo, y + yo)
            pen_x += adv
            prev = ch
        return pen_x
