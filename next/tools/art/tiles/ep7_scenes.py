"""E7-tiles previews: contact sheets, mock rooms, phone crops and the phone contrast checks (out/ep7/).

    python ep7_scenes.py               # everything
    python ep7_scenes.py contact       # contact sheets only
    python ep7_scenes.py mocks         # mock rooms (3x and 1x) + phone crops
    python ep7_scenes.py checks        # the contrast numbers -> out/ep7/contrast_check.json

EP7DB merges assets/tiles/x1_tiles.json, ep4_tiles.json, ep5_tiles.json, ep6_tiles.json and ep7_tiles.json into tiles.json
the way the pack loader does. The name-stone layer (the held path, the ghost trail, the stones' states, the frost doors) is
drawn by ep7_mocks.py with a small mirror of what E7-world draws (the recipe this agent hands to E7-world), so the checks
measure what the game shows.
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pxlib import Canvas, OUT_DIR, TILES_DIR
from compose import TileDB, draw_tile

OUT = os.path.join(OUT_DIR, 'ep7')

class EP7DB(TileDB):
    def __init__(self):
        super().__init__()
        from terrain import TERRAIN_ORDER
        order = list(TERRAIN_ORDER)
        for name, mod in (('x1_tiles.json', 'x1'), ('ep4_tiles.json', 'ep4'), ('ep5_tiles.json', 'ep5'), ('ep6_tiles.json', 'ep6'),
                          ('ep7_tiles.json', 'ep7')):
            p = os.path.join(TILES_DIR, name)
            if not os.path.exists(p):
                continue
            with open(p) as f:
                frag = json.load(f)
            for k in ('terrains', 'walls', 'tiles', 'objects', 'overlays'):
                tgt = self.db.setdefault(k, {})
                for tid, v in frag.get(k, {}).items():
                    if tid in tgt:
                        raise SystemExit('%s id clashes: %s.%s' % (name, k, tid))
                    tgt[tid] = v
            order = __import__(mod).merged_order(order, list(frag['terrains']))
        for tid, v in self.db['terrains'].items():
            if tid in order:
                v['order'] = order.index(tid)


# ====================================================================== contact sheets
def cells(m, sheet):
    x, y, w, h = m['rect']
    if m.get('frames'):
        return [sheet.crop((fx, fy, fx + fw, fy + fh)) for (fx, fy, fw, fh) in m['frames']]
    if m.get('anim'):
        return [sheet.crop((x + k * m['anim']['frameDx'], y, x + k * m['anim']['frameDx'] + w, y + h))
                for k in sorted(set(m['anim']['frames']))]
    return [sheet.crop((x, y, x + w, y + h))]


def draw_contact(items, scale, width, name, bg=(70, 92, 128, 255), bg2=(52, 70, 100, 255)):
    try:
        font = ImageFont.truetype('arial.ttf', 11)
    except Exception:
        font = ImageFont.load_default()
    pad = 8
    placed = []
    x = y = pad
    rowh = 0
    for label, imgs in items:
        w = sum(i.width for i in imgs) * scale + (len(imgs) - 1) * 4 + 4
        h = max(i.height for i in imgs) * scale
        tw = max(w, int(font.getlength(label)) + 4)
        if x + tw + pad > width:
            x = pad
            y += rowh + pad + 14
            rowh = 0
        placed.append((x, y, label, imgs, tw))
        x += tw + pad
        rowh = max(rowh, h)
    im = Image.new('RGBA', (width, y + rowh + pad + 20), bg)
    d = ImageDraw.Draw(im)
    for (x, y, label, imgs, tw) in placed:
        h = max(i.height for i in imgs) * scale
        d.rectangle((x - 2, y - 2, x + tw + 1, y + h + 13), fill=bg2)
        cx = x
        for i in imgs:
            big = i.resize((i.width * scale, i.height * scale), Image.NEAREST)
            im.alpha_composite(big, (cx, y + (h - big.height)))
            cx += big.width + 4
        d.text((x, y + h + 1), label, fill=(240, 236, 220, 255), font=font)
    p = os.path.join(OUT, name)
    im.convert('RGB').save(p)
    print('contact', p, im.size)
    return p


def contact():
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(TILES_DIR, 'ep7_tiles.json')) as f:
        frag = json.load(f)
    sheet = Image.open(os.path.join(TILES_DIR, 'ep7.png')).convert('RGBA')
    objs = [(oid, cells(m, sheet)) for oid, m in frag['objects'].items() if m.get('kind') != 'building']
    big = [o for o in objs if max(i.height for i in o[1]) > 48 or sum(i.width for i in o[1]) > 160]
    small = [o for o in objs if o not in big]
    if small:
        draw_contact(small, 3, 1600, 'contact_objects_3x.png')
    if big:
        draw_contact(big, 2, 1600, 'contact_big_2x.png')
    blds = [(oid, cells(m, sheet)) for oid, m in frag['objects'].items() if m.get('kind') == 'building']
    if blds:
        draw_contact(blds, 2, 1600, 'contact_buildings_2x.png')
    tiles = []
    for tid, m in frag['tiles'].items():
        w, h = m.get('w', 16), m.get('h', 16)
        tiles.append((tid, [sheet.crop((m['x'], m['y'], m['x'] + w, m['y'] + h))]))
    if tiles:
        draw_contact(tiles, 3, 1600, 'contact_tiles_3x.png')
    terr = []
    for tid, m in frag['terrains'].items():
        fr = [sheet.crop((m['x'], m['y'], m['x'] + 32, m['y'] + 48))]
        if m.get('anim'):
            fr = [sheet.crop((m['x'] + k * 32, m['y'], m['x'] + k * 32 + 32, m['y'] + 48)) for k in range(3)]
        fr += [sheet.crop((vx, vy, vx + 16, vy + 16)) for (vx, vy) in m.get('variants', [])]
        terr.append((tid, fr))
    draw_contact(terr, 3, 1600, 'contact_terrains_3x.png')
    wl = []
    for wid, m in frag['walls'].items():
        fr = [sheet.crop((m['top'][0], m['top'][1], m['top'][0] + 32, m['top'][1] + 48)),
              sheet.crop((m['face'][0], m['face'][1], m['face'][0] + 32, m['face'][1] + 32))]
        for st in m.get('faceStyles', [])[1:]:
            for (bx, by) in st[:1]:
                fr.append(sheet.crop((bx, by, bx + 32, by + 32)))
        wl.append((wid, fr))
    draw_contact(wl, 3, 1600, 'contact_walls_3x.png')


def main(argv):
    want = argv[1:] or ['contact', 'mocks', 'checks']
    if 'contact' in want:
        contact()
    if 'mocks' in want or 'checks' in want:
        db = EP7DB()
        import ep7_mocks
        if 'mocks' in want:
            ep7_mocks.run_mocks(db)
        if 'checks' in want:
            ep7_mocks.checks(db)


if __name__ == '__main__':
    main(sys.argv)
