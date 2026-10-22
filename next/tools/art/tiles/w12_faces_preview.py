"""W12 preview: each Court wall style as a 6-tile wall, 2 rows tall (3 for the throne room style), at 6x.

    python w12_faces_preview.py      -> out/w12_faces_6x.png
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from PIL import Image, ImageDraw
from autotile import compose_face

TILES = os.path.join(HERE, '..', '..', '..', 'assets', 'tiles')


def wall(sheet, blocks, n=6, rows=2):
    im = Image.new('RGBA', (n * 16, rows * 16), (0, 0, 0, 0))
    for y in range(rows):
        for x in range(n):
            fx, fy = blocks[x % len(blocks)]
            t = compose_face(sheet, x > 0, y > 0, x < n - 1, y < rows - 1, fx, fy)
            im.paste(Image.fromarray(t.a, 'RGBA'), (x * 16, y * 16))
    return im


def main():
    db = json.load(open(os.path.join(TILES, 'tiles.json'), encoding='utf-8'))
    from pxlib import Canvas
    rows = []
    for sys_id in ('court', 'court_throne'):
        meta = db['walls'][sys_id]
        import numpy as np
        sheet = Canvas.from_array(np.asarray(Image.open(os.path.join(TILES, meta.get('sheet', 'court.png'))).convert('RGBA')).copy())
        for i, blocks in enumerate(meta.get('faceStyles', [[meta['face']]])):
            for h in ((2, 3) if sys_id == 'court_throne' and i == 3 else (2, 1) if sys_id == 'court' and i else (2,)):
                rows.append((f'{sys_id} style {i} ({h} rows)', wall(sheet, blocks, rows=h)))
    S = 6
    W = max(im.width for _, im in rows) * S + 20
    H = sum(im.height * S + 24 for _, im in rows) + 10
    out = Image.new('RGB', (W, H), (20, 16, 30))
    d = ImageDraw.Draw(out)
    y = 6
    for lab, im in rows:
        d.text((10, y), lab, fill=(240, 236, 220))
        out.paste(im.resize((im.width * S, im.height * S), Image.NEAREST), (10, y + 16), im.resize((im.width * S, im.height * S), Image.NEAREST))
        y += im.height * S + 24
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    out.save(os.path.join(HERE, 'out', 'w12_faces_6x.png'))


if __name__ == '__main__':
    main()
