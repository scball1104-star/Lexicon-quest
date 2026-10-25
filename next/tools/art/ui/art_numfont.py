"""Battle number font with built-in outline, pre-colored variants, big crit digits and word art.

Outputs assets/ui/font_num.png, font_num.json (normal digits) and font_num_big.json (big digits, same PNG).
"""
from __future__ import annotations

import numpy as np

import uipal as P
from lib import ASSETS_UI, blank, hexc, paste, save, write_json

DIGITS = {
    '0': ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
    '1': ['.##', '###', '.##', '.##', '.##', '.##', '.##', '.##', '.##'],
    '2': ['.####.', '##..##', '....##', '...##.', '..##..', '.##...', '##....', '##....', '######'],
    '3': ['.####.', '##..##', '....##', '...##.', '..###.', '....##', '....##', '##..##', '.####.'],
    '4': ['...##.', '..###.', '.####.', '##.##.', '##.##.', '######', '...##.', '...##.', '...##.'],
    '5': ['######', '##....', '##....', '#####.', '....##', '....##', '....##', '##..##', '.####.'],
    '6': ['.####.', '##..##', '##....', '#####.', '##..##', '##..##', '##..##', '##..##', '.####.'],
    '7': ['######', '....##', '....##', '...##.', '...##.', '..##..', '..##..', '..##..', '..##..'],
    '8': ['.####.', '##..##', '##..##', '.####.', '##..##', '##..##', '##..##', '##..##', '.####.'],
    '9': ['.####.', '##..##', '##..##', '##..##', '.#####', '....##', '....##', '##..##', '.####.'],
    '+': ['......', '......', '..##..', '..##..', '######', '######', '..##..', '..##..', '......'],
    '-': ['.....', '.....', '.....', '.....', '#####', '#####', '.....', '.....', '.....'],
    '%': ['##...##', '##..##.', '....##.', '...##..', '..##...', '.##....', '.##..##', '##...##', '.......'],
    '!': ['##', '##', '##', '##', '##', '##', '..', '##', '##'],
}

LETTERS = {
    'M': ['##....##', '###..###', '########', '##.##.##', '##....##', '##....##', '##....##', '##....##'],
    'I': ['####', '.##.', '.##.', '.##.', '.##.', '.##.', '.##.', '####'],
    'S': ['.#####', '##....', '##....', '.####.', '....##', '....##', '....##', '#####.'],
    'C': ['.#####', '##....', '##....', '##....', '##....', '##....', '##....', '.#####'],
    'R': ['#####.', '##..##', '##..##', '#####.', '##.##.', '##..##', '##..##', '##..##'],
    'T': ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
    'A': ['.####.', '##..##', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
    'L': ['##....', '##....', '##....', '##....', '##....', '##....', '##....', '######'],
    'W': ['##....##', '##....##', '##....##', '##.##.##', '##.##.##', '########', '###..###', '##....##'],
    'E': ['######', '##....', '##....', '#####.', '##....', '##....', '##....', '######'],
    'K': ['##..##', '##.##.', '####..', '###...', '####..', '##.##.', '##..##', '##..##'],
    'B': ['#####.', '##..##', '##..##', '#####.', '##..##', '##..##', '##..##', '#####.'],
    'U': ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
    'N': ['##..##', '###.##', '######', '##.###', '##..##', '##..##', '##..##', '##..##'],
    'G': ['.#####', '##....', '##....', '##.###', '##..##', '##..##', '##..##', '.####.'],
    'D': ['#####.', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '#####.'],
    'O': ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
    'V': ['##..##', '##..##', '##..##', '##..##', '##..##', '.####.', '.####.', '..##..'],
    'Y': ['##..##', '##..##', '##..##', '.####.', '..##..', '..##..', '..##..', '..##..'],
}

LETTERS_BIG = {
    'B': ['#######.', '###..###', '###..###', '###..###', '#######.', '###..###', '###..###', '###..###',
          '###..###', '###..###', '#######.'],
    'R': ['#######.', '###..###', '###..###', '###..###', '#######.', '#####...', '###.###.', '###..###',
          '###..###', '###..###', '###..###'],
    'E': ['#######', '###....', '###....', '###....', '######.', '###....', '###....', '###....', '###....',
          '###....', '#######'],
    'A': ['.######.', '###..###', '###..###', '###..###', '###..###', '########', '###..###', '###..###',
          '###..###', '###..###', '###..###'],
    'K': ['###..###', '###..###', '###.###.', '######..', '#####...', '####....', '#####...', '######..',
          '###.###.', '###..###', '###..###'],
}

# variant gradients: list of (row_fraction_limit, color) from top to bottom
VARIANTS = {
    'white': [P.WHITE, P.WHITE, P.METAL[3], P.METAL[3], P.METAL[2]],
    'crit': [P.GOLD[5], P.GOLD[4], P.GOLD[4], P.GOLD[3], P.FIRE[2]],
    'heal': [P.ICE[3], P.GREEN[5], P.GREEN[5], P.GREEN[4], P.GREEN[3]],
    'mp': [P.ICE[3], P.WATER[5], P.WATER[4], P.WATER[4], P.WATER[3]],
    'poison': [P.VIOLET[4], P.VIOLET[3], P.VIOLET[3], P.VIOLET[2], P.VIOLET[1]],
    'red': [P.RED[5], P.RED[4], P.RED[4], P.RED[3], P.RED[2]],
    'gray': [P.METAL[3], P.METAL[2], P.METAL[2], P.STEEL[3], P.STEEL[3]],
}
WORD_GRAD = {
    'MISS': [P.WHITE, P.METAL[3], P.METAL[2], P.METAL[2], P.STEEL[3]],
    'CRITICAL': [P.GOLD[5], P.GOLD[4], P.GOLD[4], P.GOLD[3], P.FIRE[2], P.FIRE[1]],
    'WEAK': [P.CYAN[4], P.CYAN[3], P.CYAN[3], P.CYAN[2], P.CYAN[1]],
    'BREAK': [P.GOLD[5], P.GOLD[4], P.GOLD[3], P.FIRE[2], P.FIRE[1], P.RED[2]],
    'RESIST': [P.METAL[3], P.METAL[2], P.STEEL[3], P.STEEL[2]],
    'IMMUNE': [P.METAL[3], P.METAL[2], P.STEEL[3], P.STEEL[2]],
    'GUARD': [P.WATER[5], P.WATER[4], P.WATER[3], P.WATER[2]],
    'DODGE': [P.WHITE, P.METAL[3], P.METAL[2], P.STEEL[3]],
}


def mask_from(rows):
    w = max(len(r) for r in rows)
    m = np.zeros((len(rows), w), bool)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            m[y, x] = c == '#'
    return m


def embolden(m):
    h, w = m.shape
    o = np.zeros((h, w + 1), bool)
    o[:, :w] |= m
    o[:, 1:] |= m
    return o


def stretch_rows(m, dup_rows):
    out = []
    for y in range(m.shape[0]):
        out.append(m[y])
        if y in dup_rows:
            out.append(m[y])
    return np.array(out)


def colorize(m, grad, outline=P.OUTLINE, shadow=True, inner=None):
    """Fill mask m with a row gradient, add 1 px outline (8-neighborhood) and an optional extra
    bottom-right shadow pixel row/col. Returns RGBA with 1 px (or 2 px) padding."""
    h, w = m.shape
    pad = 2 if shadow else 1
    a = blank(w + pad + 1, h + pad + 1)
    for y in range(h):
        t = y / max(1, h - 1)
        c = grad[min(len(grad) - 1, int(t * len(grad) - 1e-6))]
        for x in range(w):
            if m[y, x]:
                a[y + 1, x + 1] = hexc(c)
    M = a[..., 3] > 0
    ring = np.zeros_like(M)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ring |= np.roll(np.roll(M, dy, 0), dx, 1)
    ring &= ~M
    a[ring] = hexc(outline)
    if shadow:
        M2 = a[..., 3] > 0
        sh = np.roll(np.roll(M2, 1, 0), 1, 1) & ~M2
        a[sh] = hexc(outline)
    if inner:
        # inner darker line just inside the outline on the bottom edge of each stroke
        pass
    # trim
    ys, xs = np.nonzero(a[..., 3] > 0)
    return a[:ys.max() + 1, :xs.max() + 1]


def word_mask(word, letters=LETTERS, gap=1, slant=True, bold=False):
    ms = []
    for ch in word:
        m = mask_from(letters[ch])
        if bold:
            m = embolden(m)
        ms.append(m)
    h = max(m.shape[0] for m in ms)
    w = sum(m.shape[1] for m in ms) + gap * (len(ms) - 1)
    sl = (h - 1) // 3 if slant else 0
    out = np.zeros((h, w + sl), bool)
    x = 0
    for m in ms:
        for y in range(m.shape[0]):
            off = ((h - 1 - y) // 3) if slant else 0
            out[y, x + off:x + off + m.shape[1]] |= m[y]
        x += m.shape[1] + gap
    return out


def build():
    chars = list('0123456789+-%!')
    # normal glyphs, one row per variant
    normal = {ch: mask_from(DIGITS[ch]) for ch in chars}
    big = {ch: embolden(stretch_rows(mask_from(DIGITS[ch]), {1, 4, 7})) for ch in chars}
    sheet = blank(256, 256)
    js_glyphs, js_big = {}, {}
    variants, variants_big = {}, {}
    y = 1
    row_h = 13
    for vi, (vname, grad) in enumerate(VARIANTS.items()):
        x = 1
        for ch in chars:
            g = colorize(normal[ch], grad, shadow=False)
            paste(sheet, g, x, y)
            if vi == 0:
                h, w = g.shape[:2]
                adv = w - 1
                js_glyphs[ch] = [x, y, w, h, 0, 0, adv]
            x += g.shape[1] + 1
        variants[vname] = y - 1
        y += row_h
    # big digits: white, crit and red (party damage)
    big_row = 17
    for vi, vname in enumerate(('white', 'crit', 'red')):
        x = 1
        for ch in chars:
            g = colorize(big[ch], VARIANTS[vname], shadow=True)
            paste(sheet, g, x, y)
            if vi == 0:
                h, w = g.shape[:2]
                js_big[ch] = [x, y, w, h, 0, 0, w - 2]
            x += g.shape[1] + 1
        variants_big[vname] = y
        y += big_row
    base_big = variants_big['white']
    variants_big = {k: v - base_big for k, v in variants_big.items()}
    # word art
    words = {}
    x, wy = 1, y
    rowmax = 0
    for word in ('MISS', 'CRITICAL', 'WEAK', 'BREAK', 'RESIST', 'IMMUNE', 'GUARD', 'DODGE'):
        if word == 'BREAK':
            m = word_mask(word, letters=LETTERS_BIG)
        else:
            m = word_mask(word)
        g = colorize(m, WORD_GRAD[word], shadow=True)
        if word == 'BREAK':
            # second, warm outer ring for extra punch
            g2 = blank(g.shape[1] + 2, g.shape[0] + 2)
            paste(g2, g, 1, 1)
            M = g2[..., 3] > 0
            ring = np.zeros_like(M)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx or dy:
                        ring |= np.roll(np.roll(M, dy, 0), dx, 1)
            ring &= ~M
            g2[ring] = hexc(P.FIRE[0])
            g = g2
        if x + g.shape[1] > 255:
            x = 1
            wy += rowmax + 1
            rowmax = 0
        paste(sheet, g, x, wy)
        words[word] = [x, wy, g.shape[1], g.shape[0]]
        x += g.shape[1] + 2
        rowmax = max(rowmax, g.shape[0])
    total_h = wy + rowmax + 1
    sheet = sheet[:total_h]
    save(sheet, ASSETS_UI / 'font_num.png')
    common = {
        'outline': 'built in (1 px ink); draw untinted, no code shadow',
        'shadow': False,
        'note': 'Glyphs are pre-colored. Pick a color set by adding variants[name] to each glyph y. '
                'Glyphs overlap by 1 px (shared outline column).',
    }
    js = {'image': 'font_num.png', 'lineHeight': 12, 'baseline': 10, 'spaceAdvance': 4,
          'glyphs': js_glyphs, 'kerning': {}, 'variants': variants, 'words': words, **common}
    jb = {'image': 'font_num.png', 'lineHeight': 16, 'baseline': 14, 'spaceAdvance': 5,
          'glyphs': js_big, 'kerning': {}, 'variants': variants_big, **common}
    write_json(js, ASSETS_UI / 'font_num.json')
    write_json(jb, ASSETS_UI / 'font_num_big.json')
    return sheet


if __name__ == '__main__':
    build()
    print('font_num ok')
