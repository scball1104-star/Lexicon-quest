"""E2-tiles scratch: crop chosen ids out of the sheets onto a swatch, 3x -> out/e2/bits.png
    python e2_bits.py tree_birch_silver court_far reeds_0 hall_hollow [--bg grass|mere_water|glass_floor]
"""
import json, os, sys
from PIL import Image
from pxlib import TILES_DIR, OUT_DIR

args = sys.argv[1:]
bg = 'grass'
if '--bg' in args:
    i = args.index('--bg'); bg = args[i + 1]; del args[i:i + 2]
db = json.load(open(os.path.join(TILES_DIR, 'tiles.json')))
cache = {}


def sheet(n):
    if n not in cache:
        cache[n] = Image.open(os.path.join(TILES_DIR, n)).convert('RGBA')
    return cache[n]


parts = []
for k in args:
    if k in db['objects']:
        m = db['objects'][k]
        for r in (m.get('frames') or [m['rect']]):
            parts.append(sheet(m['sheet']).crop((r[0], r[1], r[0] + r[2], r[1] + r[3])))
    else:
        m = db['tiles'][k]
        parts.append(sheet(m['sheet']).crop((m['x'], m['y'], m['x'] + m.get('w', 16), m['y'] + m.get('h', 16))))
t = db['terrains'][bg]
sw = sheet(t['sheet']).crop((t['x'] + 16, t['y'] + 32, t['x'] + 32, t['y'] + 48))
W = sum(p.width for p in parts) + 8 * len(parts)
H = max(p.height for p in parts)
out = Image.new('RGBA', (W, H))
for yy in range(0, H, 16):
    for xx in range(0, W, 16):
        out.paste(sw, (xx, yy))
x = 0
for p in parts:
    out.alpha_composite(p, (x, H - p.height))
    x += p.width + 8
os.makedirs(os.path.join(OUT_DIR, 'e2'), exist_ok=True)
out.resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT_DIR, 'e2', 'bits.png'))
print('bits', W * 3, H * 3)
