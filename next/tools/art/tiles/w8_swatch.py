"""W8-archive scratch: render floor/top swatches straight from the generator classes (3x) for quick iteration.
    python w8_swatch.py catalog_wood gallery_stone ...  -> out/w8/swatch.png
"""
import sys, os
from pxlib import Canvas, OUT_DIR
from autotile import variant_hash
import archive_floors as af

CLASSES = {c.id: c for c in af.FLOORS}
for sys_id, band, face, deep, out in af.WALLS:
    CLASSES[band.id] = band
    CLASSES[deep.id] = deep


def swatch(t, w=10, h=6):
    cv = Canvas(w * 16, h * 16)
    ws = t.weights
    for y in range(h):
        for x in range(w):
            hv = variant_hash(x, y) % sum(ws)
            k = 0
            while hv >= ws[k]:
                hv -= ws[k]
                k += 1
            cv.paste(t.variant_tile(k), x * 16, y * 16)
    return cv


ids = sys.argv[1:] or list(CLASSES)
rows = [swatch(CLASSES[i]) for i in ids]
out = Canvas(160, 96 * len(rows) + 4 * len(rows))
for i, r in enumerate(rows):
    out.paste(r, 0, i * 100)
os.makedirs(os.path.join(OUT_DIR, 'w8'), exist_ok=True)
out.save(os.path.join(OUT_DIR, 'w8', 'swatch.png'), 3)
print('ok', ids)
