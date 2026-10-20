"""Preview the W9 field ability art (src/world/fieldart.js) at 6x, alone and composited over the real tiles it
sits on: the heavy block beside the Archive's light push block on catalog wood, the root wall in a Stacks face,
the cracked cliff in the valley's cliff face, and the icons on a window blue.

    python next/qa/world/fieldart_preview.py      -> next/qa/world/out/fieldart_sheet.png, fieldart_context.png
"""
import base64
import json
import pathlib
import subprocess

import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parent.parent
OUT = HERE / 'out'

JS = ("import('./src/world/fieldart.js').then(m => { const s = m.rasterizeSheet(); "
      "process.stdout.write(JSON.stringify({ w: s.w, h: s.h, b64: Buffer.from(s.data).toString('base64'), sprites: m.SPRITES })); })")


def sheet():
    r = subprocess.run(['node', '-e', JS], cwd=NEXT, capture_output=True, text=True, timeout=60)
    if r.returncode:
        raise SystemExit(r.stderr)
    d = json.loads(r.stdout)
    arr = np.frombuffer(base64.b64decode(d['b64']), dtype=np.uint8).reshape(d['h'], d['w'], 4)
    return Image.fromarray(arr.copy(), 'RGBA'), d['sprites']


def crop(img, sp, name, h=32):
    x, y = sp[name]['at']
    w = len(sp[name]['rows'][0])
    hh = len(sp[name]['rows'])
    return img.crop((x, y, x + w, y + hh))


def face_cell(sheet_img, fx, fy, left, top, right, bottom):
    """One wall-face cell assembled from quarters exactly like src/world/autotile.js faceQuarters."""
    qs = [[2 if left else 0, 2 if top else 0], [1 if right else 3, 2 if top else 0],
          [2 if left else 0, 1 if bottom else 3], [1 if right else 3, 1 if bottom else 3]]
    out = Image.new('RGBA', (16, 16))
    for (qx, qy), (ox, oy) in zip(qs, [(0, 0), (8, 0), (0, 8), (8, 8)]):
        out.alpha_composite(sheet_img.crop((fx + qx * 8, fy + qy * 8, fx + qx * 8 + 8, fy + qy * 8 + 8)), (ox, oy))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    img, sp = sheet()
    img.resize((img.width * 6, img.height * 6), Image.NEAREST).save(OUT / 'fieldart_sheet.png')
    tiles = json.loads((NEXT / 'assets' / 'tiles' / 'tiles.json').read_text())
    ar = Image.open(NEXT / 'assets' / 'tiles' / 'archive.png').convert('RGBA')
    cl = Image.open(NEXT / 'assets' / 'tiles' / 'cliffs.png').convert('RGBA')
    ctx = Image.new('RGBA', (16 * 16, 16 * 4), (20, 16, 30, 255))
    # 1. catalog floor with the light push block and the heavy block
    cat = tiles['terrains']['catalog_wood']
    fx, fy = cat['variants'][0]
    floor = ar.crop((fx, fy, fx + 16, fy + 16))
    for yy in range(4):
        for xx in range(5):
            if floor:
                ctx.alpha_composite(floor, (xx * 16, yy * 16))
    pb = tiles['objects']['push_block']['rect']
    ctx.alpha_composite(ar.crop((pb[0], pb[1], pb[0] + 16, pb[1] + 32)), (16, 16))
    ctx.alpha_composite(crop(img, sp, 'heavy_block'), (48, 16))
    # 2. stacks face with the root wall and the broken one
    st = tiles['walls']['stacks']
    face_hi = face_cell(ar, st['face'][0], st['face'][1], True, False, True, True)
    face_lo = face_cell(ar, st['face'][0], st['face'][1], True, True, True, False)
    top = ar.crop((st['top'][0] + 8, st['top'][1] + 16, st['top'][0] + 24, st['top'][1] + 32))
    sw = tiles['terrains']['stacks_wood']
    sx0, sy0 = sw['variants'][0]
    sfloor = ar.crop((sx0, sy0, sx0 + 16, sy0 + 16))
    for xx in range(5, 10):
        ctx.alpha_composite(top, (xx * 16, 0))
        ctx.alpha_composite(face_hi, (xx * 16, 16))
        ctx.alpha_composite(face_lo, (xx * 16, 32))
        if sfloor:
            ctx.alpha_composite(sfloor, (xx * 16, 48))
    ctx.alpha_composite(crop(img, sp, 'ab_root_wall'), (6 * 16, 16))
    ctx.alpha_composite(crop(img, sp, 'ab_root_wall_broken'), (8 * 16, 16))
    # 3. cliff face with the crack and the grotto
    cf = tiles['walls']['cliff']
    cface_hi = face_cell(cl, cf['face'][0], cf['face'][1], True, False, True, True)
    cface_lo = face_cell(cl, cf['face'][0], cf['face'][1], True, True, True, False)
    ctop = cl.crop((cf['top'][0] + 8, cf['top'][1] + 16, cf['top'][0] + 24, cf['top'][1] + 32))
    tr = Image.open(NEXT / 'assets' / 'tiles' / 'terrain.png').convert('RGBA')
    gx, gy = tiles['terrains']['grass']['variants'][0]
    grass = tr.crop((gx, gy, gx + 16, gy + 16))
    for xx in range(10, 16):
        ctx.alpha_composite(ctop, (xx * 16, 0))
        ctx.alpha_composite(cface_hi, (xx * 16, 16))
        ctx.alpha_composite(cface_lo, (xx * 16, 32))
        ctx.alpha_composite(grass, (xx * 16, 48))
    ctx.alpha_composite(crop(img, sp, 'ab_cliff_crack'), (11 * 16, 16))
    ctx.alpha_composite(crop(img, sp, 'ab_cliff_grotto'), (14 * 16, 16))
    ctx.resize((ctx.width * 4, ctx.height * 4), Image.NEAREST).save(OUT / 'fieldart_context.png')
    print('wrote', OUT / 'fieldart_sheet.png', OUT / 'fieldart_context.png')


if __name__ == '__main__':
    main()
