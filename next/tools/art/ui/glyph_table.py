"""Render every glyph of a font in a labelled grid (for letterform review)."""
import sys
from fontlib import Font
from lib import ASSETS_UI, blank, hexc, save, upscale, OUT
import uipal as P

def table(json_name, out_name, cols=24, k=6):
    f = Font(ASSETS_UI / json_name, P.TEXT)
    chars = sorted(f.glyphs.keys(), key=ord)
    cw = max(g[2] + g[4] for g in f.glyphs.values()) + 4
    ch = f.lh + 4
    rows = (len(chars) + cols - 1) // cols
    a = blank(cols * cw, rows * ch)
    a[...] = hexc(P.UIB[2])
    for i, c in enumerate(chars):
        x, y = (i % cols) * cw, (i // cols) * ch
        if (i + i // cols) % 2:
            a[y:y + ch, x:x + cw] = hexc(P.UIB[1])
        f.draw(a, x + 2, y + 2, c)
    save(upscale(a, k), OUT / out_name)

if __name__ == '__main__':
    table('font.json', 'glyphs_main_6x.png', 24, 6)
    table('font_large.json', 'glyphs_large_5x.png', 16, 5)
