"""Painted props (world-sprites.png, interior-sprites.png) -> pixel props at tile scale."""
import os
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
from build_bosses import harmonize_img

# id: (sheet, cell, target w, target h (None = keep aspect), k)
PAINTED = {
    'tree_willow':     ('world-sprites.png', 4, None, 80, 18),
    'tree_pine':       ('world-sprites.png', 5, None, 64, 14),
    'tree_pine_snow':  ('world-sprites.png', 6, None, 64, 14),
    'tree_violet':     ('world-sprites.png', 7, None, 72, 18),
    'fountain':        ('world-sprites.png', 8, 64, None, 18),
    'arch_ruin':       ('world-sprites.png', 9, 56, None, 16),
    'rune_shrine':     ('world-sprites.png', 10, 56, None, 18),
    'lamp_post':       ('world-sprites.png', 12, None, 44, 12),
    'bench':           ('world-sprites.png', 13, 40, None, 14),
    'anvil':           ('world-sprites.png', 14, 36, None, 14),
    'hedge_flowers':   ('world-sprites.png', 15, 48, None, 16),
    'bookshelf':       ('interior-sprites.png', 8, 40, None, 18),
    'desk':            ('interior-sprites.png', 9, 40, None, 16),
    'bed':             ('interior-sprites.png', 10, 40, None, 14),
    'fireplace':       ('interior-sprites.png', 11, 48, None, 18),
    'printing_press':  ('interior-sprites.png', 12, 40, None, 14),
    'lectern':         ('interior-sprites.png', 13, 36, None, 14),
    'crates_barrels':  ('interior-sprites.png', 14, 48, None, 16),
    'rug':             ('interior-sprites.png', 15, 48, None, 14),
}

_src = {}


def src(name):
    if name not in _src:
        _src[name] = load_src(name)
    return _src[name]


def painted(pid):
    sheet, cell, tw, th, k = PAINTED[pid]
    obj = main_object(grid_cell(src(sheet), 4, 4, cell), keep_frac=0.02, max_dist=12)
    w, h = fit_size(obj, th=th) if th else fit_size(obj, tw=tw)
    d, pal = pixelize2(obj, w, h, k=k, sharpen=0.0, max_de=0.09, ring=False)
    d = harmonize_img(d)
    big = blank(w + 2, h + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 5)
    return outline(big, mode='outer', strength=0.5)


if __name__ == '__main__':
    items = [(pid, painted(pid)) for pid in PAINTED]
    contact(items, os.path.join(OUT, 'props_painted_4x.png'), scale=4, cols=5, title='painted props at 4x')
