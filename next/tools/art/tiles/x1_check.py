"""Sanity checks for assets/tiles/x1.png + x1_tiles.json: every rect inside the sheet and not blank, no id clashing with tiles.json, no em dash,
terrain/wall entries complete. Also writes the terrain contact sheet out/x1/contact_terrains_3x.png."""
import json, os, sys
import numpy as np
from PIL import Image
from pxlib import TILES_DIR, OUT_DIR
import x1_preview as P
import x1_scenes as S

frag = json.load(open(os.path.join(TILES_DIR, 'x1_tiles.json')))
base = json.load(open(os.path.join(TILES_DIR, 'tiles.json')))
im = np.asarray(Image.open(os.path.join(TILES_DIR, 'x1.png')).convert('RGBA'))
H, W = im.shape[:2]
bad = []


def chk(name, x, y, w, h):
    if x < 0 or y < 0 or x + w > W or y + h > H:
        bad.append('%s out of sheet %s' % (name, (x, y, w, h)))
    elif not im[y:y + h, x:x + w, 3].any():
        bad.append('%s is blank' % name)


for k in ('terrains', 'walls', 'tiles', 'objects'):
    for tid, v in frag[k].items():
        if tid in base[k]:
            bad.append('clash %s.%s' % (k, tid))
        if k == 'terrains':
            chk(tid, v['x'], v['y'], 32, 48)
            for (vx, vy) in v.get('variants', []):
                chk(tid + ' variant', vx, vy, 16, 16)
        elif k == 'walls':
            chk(tid + ' top', v['top'][0], v['top'][1], 32, 48)
            chk(tid + ' face', v['face'][0], v['face'][1], 32, 32)
        elif k == 'tiles':
            if v.get('autotile') == 'line16':
                chk(tid, v['x'], v['y'], 128, 32)
            else:
                chk(tid, v['x'], v['y'], v['w'], v['h'])
        else:
            x, y, w, h = v['rect']
            chk(tid, x, y, w, h)
            for f in v.get('frames', []):
                chk(tid + ' frame', *f)
            if v.get('anim'):
                for fr in set(v['anim']['frames']):
                    chk(tid + ' anim', x + fr * v['anim']['frameDx'], y, w, h)
            for (dx, dy) in v['footprint']:
                if v['anchor'][1] + dy < 0 or v['anchor'][1] + dy >= h // 16 or v['anchor'][0] + dx < 0 or v['anchor'][0] + dx >= (w + 15) // 16:
                    bad.append('%s footprint cell %s outside the rect' % (tid, (dx, dy)))
txt = open(os.path.join(TILES_DIR, 'x1_tiles.json'), encoding='utf-8').read()
if '—' in txt:
    bad.append('em dash in x1_tiles.json')
print('terrains %d walls %d tiles %d objects %d; problems: %d' % tuple([len(frag[k]) for k in ('terrains', 'walls', 'tiles', 'objects')] + [len(bad)]))
for b in bad:
    print('  ', b)

# terrain contact sheet: each terrain as a 6 x 6 patch with a 3 x 3 island of a neighbour (shows the A2 edges and the variants)
db = P.X1DB()
from pxlib import Canvas
tiles = []
for tid in frag['terrains']:
    kind = frag['terrains'][tid]['kind']
    under = 'x1_barrow_floor' if tid.startswith('x1_barrow') else ('x1_cellar_floor' if tid.startswith('x1_cellar') else
            ('x1_culvert_floor' if tid.startswith('x1_culvert') else ('x1_moor_turf' if tid in ('x1_heath', 'x1_bracken', 'x1_peat', 'x1_tarn') else ('grass' if tid in ('x1_pond_bed',) else 'x1_orchard_turf'))))
    if tid == under:
        under = 'grass'
    rows = ['aaaaaaaaaa'] * 2 + ['aabbbbbbaa'] * 6 + ['aaaaaaaaaa'] * 2
    sc = {'name': tid, 'legend': {'a': under, 'b': tid}, 'ground': rows, 'under': under}
    tiles.append((tid, P.render(sc, db)))
cw, ch = 10 * 16, 10 * 16
cols = 4
rowsn = (len(tiles) + cols - 1) // cols
sheet = Canvas(cols * (cw + 8) + 8, rowsn * (ch + 8) + 8, (30, 26, 40, 255))
for i, (tid, cv) in enumerate(tiles):
    sheet.paste(cv, 8 + (i % cols) * (cw + 8), 8 + (i // cols) * (ch + 8))
out = P.save(sheet, 'contact_terrains_3x.png', 3)
print('wrote', out)
open(os.path.join(P.OUT, 'contact_terrains_ids.txt'), 'w').write('\n'.join('%d %s' % (i, t) for i, (t, _) in enumerate(tiles)))
