"""Quick contact sheet of sprites from one or more art modules (for inspection at high zoom)."""
from __future__ import annotations

import importlib
import sys

from lib import blank, hexc, paste, save, upscale, OUT


def contact(mods, name, k=6, cols=12, bg=('#2c4797', '#1d2a67'), pad=3):
    items = []
    for m in mods:
        mod = importlib.import_module(m)
        items += mod.sprites()
    cw = max(i[1].shape[1] for i in items) + pad * 2
    ch = max(i[1].shape[0] for i in items) + pad * 2
    rows = (len(items) + cols - 1) // cols
    a = blank(cw * cols, ch * rows)
    for j, (sid, img, org) in enumerate(items):
        x, y = (j % cols) * cw, (j // cols) * ch
        c = hexc(bg[(j + j // cols) % 2])
        a[y:y + ch, x:x + cw] = c
        paste(a, img, x + pad, y + pad)
    save(upscale(a, k), OUT / f'{name}.png')
    return [i[0] for i in items]


if __name__ == '__main__':
    ids = contact(sys.argv[2].split(','), sys.argv[1], k=int(sys.argv[3]) if len(sys.argv) > 3 else 6)
    print(' '.join(ids))
