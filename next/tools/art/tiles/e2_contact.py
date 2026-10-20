"""E2-tiles contact sheets: every object (all state / animation frames) and tile of a sheet, on a floor swatch,
labelled, at 3x.

    python e2_contact.py court [hollow] [--scale 3] [--bg glass_floor]   -> out/e2/contact_<sheet>.png
"""
import json, os, sys
from PIL import Image, ImageDraw
from pxlib import TILES_DIR, OUT_DIR

E2_OUT = os.path.join(OUT_DIR, 'e2')


def floor_tile(db, sheets, tid):
    m = db['terrains'][tid]
    im = sheets(m['sheet'])
    vx, vy = (m['variants'][0] if m.get('variants') else (m['x'] + 16, m['y'] + 32))
    return im.crop((vx, vy, vx + 16, vy + 16))


def contact(sheet, scale=3, bg='glass_floor', cols_px=900):
    db = json.load(open(os.path.join(TILES_DIR, 'tiles.json')))
    cache = {}

    def sheets(n):
        if n not in cache:
            cache[n] = Image.open(os.path.join(TILES_DIR, n)).convert('RGBA')
        return cache[n]
    fname = sheet + '.png'
    items = []
    for oid, m in db['objects'].items():
        if m.get('sheet') != fname:
            continue
        rects = m.get('frames') or [m['rect']]
        if m.get('anim'):
            r = m['rect']
            n = max(m['anim']['frames']) + 1
            rects = [[r[0] + k * m['anim']['frameDx'], r[1], r[2], r[3]] for k in range(n)]
        items.append((oid, rects))
    for tid, m in db['tiles'].items():
        if m.get('sheet') != fname or tid in db['overlays']:
            continue
        items.append((tid, [[m['x'], m['y'], m.get('w', 16), m.get('h', 16)]]))
    for tid, m in db['overlays'].items():
        if m.get('sheet') == fname:
            items.append((tid, [[m['x'], m['y'], 16, 16]]))
    bgt = floor_tile(db, sheets, bg)
    # layout
    pad = 6
    cells = []
    for oid, rects in items:
        w = sum(r[2] for r in rects) + 2 * (len(rects) - 1)
        h = max(r[3] for r in rects)
        cells.append((oid, rects, w, h))
    x = y = 0
    row_h = 0
    pos = []
    for oid, rects, w, h in cells:
        W = max(w * scale, 90)
        if x + W > cols_px:
            x, y = 0, y + row_h + 14
            row_h = 0
        pos.append((x, y))
        x += W + pad
        row_h = max(row_h, h * scale)
    H = y + row_h + 14
    out = Image.new('RGB', (cols_px, H), (40, 34, 52))
    dr = ImageDraw.Draw(out)
    src = sheets(fname)
    for (oid, rects, w, h), (px, py) in zip(cells, pos):
        tile_bg = Image.new('RGBA', (w, h))
        for ty in range(0, h, 16):
            for tx in range(0, w, 16):
                tile_bg.paste(bgt, (tx, ty))
        cx = 0
        for r in rects:
            tile_bg.alpha_composite(src.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])), (cx, h - r[3]))
            cx += r[2] + 2
        out.paste(tile_bg.resize((w * scale, h * scale), Image.NEAREST), (px, py + 12))
        dr.text((px, py), oid, fill=(230, 226, 220))
    os.makedirs(E2_OUT, exist_ok=True)
    p = os.path.join(E2_OUT, 'contact_%s.png' % sheet)
    out.save(p)
    print('wrote', p, out.size)


if __name__ == '__main__':
    args = sys.argv[1:]
    scale = 3
    bg = None
    if '--scale' in args:
        i = args.index('--scale'); scale = int(args[i + 1]); del args[i:i + 2]
    if '--bg' in args:
        i = args.index('--bg'); bg = args[i + 1]; del args[i:i + 2]
    for sname in args or ['court']:
        contact(sname, scale, bg or ('glass_floor' if sname == 'court' else 'grass'))
