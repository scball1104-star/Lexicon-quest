"""Report opaque pixels in the tile sheets that are not palette colors (translucent shadow pixels are allowed).

    python check_palette.py
"""
import json, os, sys
import numpy as np
from PIL import Image
from pxlib import TILES_DIR, ASSETS

pal = json.load(open(os.path.join(ASSETS, 'palette.json')))
cols = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in pal['colors']}
bad_total = 0
for name in ('terrain', 'cliffs', 'town', 'archive', 'interior'):
    p = os.path.join(TILES_DIR, name + '.png')
    if not os.path.exists(p):
        continue
    a = np.asarray(Image.open(p).convert('RGBA'))
    op = a[a[:, :, 3] == 255][:, :3]
    uniq, cnt = np.unique(op.reshape(-1, 3), axis=0, return_counts=True)
    bad = [(tuple(int(v) for v in u), int(c)) for u, c in zip(uniq, cnt) if tuple(int(v) for v in u) not in cols]
    semi = int(((a[:, :, 3] > 0) & (a[:, :, 3] < 255)).sum())
    print('%-9s opaque colors %3d, off-palette %d (%d px), translucent px %d' % (
        name, len(uniq), len(bad), sum(c for _, c in bad), semi))
    for u, c in sorted(bad, key=lambda t: -t[1])[:6]:
        print('     off', '#%02x%02x%02x' % u, c)
    bad_total += len(bad)
sys.exit(1 if bad_total else 0)
