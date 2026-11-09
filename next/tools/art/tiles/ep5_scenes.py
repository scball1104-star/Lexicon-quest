"""E5-tiles previews: contact sheets, mock rooms, phone crops and the phone contrast checks (out/ep5/).

    python ep5_scenes.py               # everything
    python ep5_scenes.py contact       # contact sheets only
    python ep5_scenes.py mocks         # mock rooms (3x and 1x) + phone crops (2x)
    python ep5_scenes.py checks        # the contrast numbers -> out/ep5/contrast_check.json

EP5DB merges assets/tiles/x1_tiles.json, ep4_tiles.json and ep5_tiles.json into tiles.json the way the pack loader does.

Shade in the mocks: a scene gives `sand` (one string per row, 's' = sand cell), `hour`, and `casters` [(x, y, h)] (plus
`lamps` [(x, y, r)] at night); the mock runs the plan 4.5 rule (a small Python mirror of shade.js: shadows west 2h at dawn,
north h at noon, east 2h at dusk, stopped by solid cells; lamps light Chebyshev r) and draws running_sand over lit sand,
then E5-world's shade layer (SHADE below, the recipe of src/data/ep5/field/art.js) over every shaded cell.
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pxlib import Canvas, OUT_DIR, TILES_DIR
from compose import TileDB, draw_tile
from e2_scenes import carve, depth

OUT = os.path.join(OUT_DIR, 'ep5')

# E5-world's shade layer (src/data/ep5/field/art.js SHADE), mirrored here so the checks measure what the game draws.
SHADE = {'wash': '#2a1850', 'washAlpha': 0.3, 'dot': '#170c30', 'dotAlpha': 0.5, 'rim': '#120826', 'rimAlpha': 0.45}


class EP5DB(TileDB):
    def __init__(self):
        super().__init__()
        from terrain import TERRAIN_ORDER
        order = list(TERRAIN_ORDER)
        for name, mod in (('x1_tiles.json', 'x1'), ('ep4_tiles.json', 'ep4'), ('ep5_tiles.json', 'ep5')):
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


# ====================================================================== the light rule (a mirror of plan 4.5)
def lit_cells(sc):
    """Set of (x, y) lit cells for the scene's hour, casters and lamps (plan 4.5). Solid = wall chars and casters."""
    rows = sc['ground']
    H, W = len(rows), len(rows[0])
    roof = sc.get('roof')
    solid_chars = set(sc.get('solid_chars', '#|ov'))
    casters = sc.get('casters', [])
    cast_at = {(x, y) for (x, y, h) in casters}
    solid = lambda x, y: not (0 <= x < W and 0 <= y < H) or rows[y][x] in solid_chars or (x, y) in cast_at
    hour = sc.get('hour', 'noon')
    lit = set()
    if hour in ('dawn', 'noon', 'dusk'):
        for y in range(H):
            for x in range(W):
                if roof and roof[y][x] == '#':
                    continue
                lit.add((x, y))
        d = {'dawn': (-1, 0, 2), 'noon': (0, -1, 1), 'dusk': (1, 0, 2)}[hour]
        for (cx, cy, h) in casters:
            n = h * d[2]
            for k in range(1, n + 1):
                x, y = cx + d[0] * k, cy + d[1] * k
                if solid(x, y):
                    break
                lit.discard((x, y))
    for (lx, ly, r) in sc.get('lamps', []):
        for y in range(ly - r, ly + r + 1):
            for x in range(lx - r, lx + r + 1):
                if not (0 <= x < W and 0 <= y < H):
                    continue
                if x == lx or y == ly:
                    sx, sy = (x > lx) - (x < lx), (y > ly) - (y < ly)
                    blocked = False
                    k = 1
                    while (lx + sx * k, ly + sy * k) != (x, y):
                        if solid(lx + sx * k, ly + sy * k):
                            blocked = True
                            break
                        k += 1
                    if blocked or solid(x, y) and (x, y) != (lx, ly):
                        continue
                lit.add((x, y))
    return lit


def shade_layer(cv, sc, lit, x0=0, y0=0):
    """E5-world's dithered violet shade over every shaded cell that is not a wall."""
    rows = sc['ground']
    H, W = len(rows), len(rows[0])
    hexa = lambda h, a: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), int(round(a * 255)))
    wash, dot, rim = hexa(SHADE['wash'], SHADE['washAlpha']), hexa(SHADE['dot'], SHADE['dotAlpha']), hexa(SHADE['rim'], SHADE['rimAlpha'])
    wallc = set(sc.get('solid_chars', '#|ov'))
    shaded = lambda x, y: 0 <= x < W and 0 <= y < H and (x, y) not in lit and rows[y][x] not in wallc
    if sc.get('hour') == 'night' and not sc.get('shade_at_night'):
        return
    for y in range(H):
        for x in range(W):
            if not shaded(x, y):
                continue
            px, py = x * 16, y * 16
            for yy in range(16):
                for xx in range(16):
                    cv.put(px + xx, py + yy, wash)
                    if (xx + yy) % 2 == 0:
                        cv.put(px + xx, py + yy, dot)
            for (nx, ny, rect) in ((0, -1, (0, 0, 16, 1)), (0, 1, (0, 15, 16, 1)), (-1, 0, (0, 0, 1, 16)), (1, 0, (15, 0, 1, 16))):
                if not shaded(x + nx, y + ny):
                    rx, ry, rw, rh = rect
                    for yy in range(ry, ry + rh):
                        for xx in range(rx, rx + rw):
                            cv.put(px + xx, py + yy, rim)


def render(sc, db, frame=0, shade=True):
    """x1_preview.render, then the sun and shade layers: running_sand over lit sand cells, the violet shade."""
    import x1_preview
    from compose import draw_object, draw_prop, draw_actor, SpriteDB, terrain_cell
    base = dict(sc)
    base['frame'] = frame
    base['decor'] = [d for d in sc.get('decor', []) if d.get('floor')]
    base['actors'] = []
    cv = x1_preview.render(base, db, map_id=sc.get('map_id'), frame=frame)
    if shade and (sc.get('sand') is not None or sc.get('casters') or sc.get('lamps')):
        lit = lit_cells(sc)
        sand = sc.get('sand')
        if sand is not None:
            H, W = len(sand), len(sand[0])
            grid = [[('running_sand' if (sand[y][x] == 's' and (x, y) in lit) else None) for x in range(W)] for y in range(H)]
            for y in range(H):
                for x in range(W):
                    if grid[y][x]:
                        t = terrain_cell(db, grid, x, y, frame)
                        if t:
                            cv.blit(t, x * 16, y * 16)
        if sc.get('roof') is None and sc.get('hour') != 'night':
            shade_layer(cv, sc, lit)        # indoors and at night the dark holds the sand: no violet over the dark
    # objects and actors over the ground layers (the field draws sand and shade under the objects)
    spr = SpriteDB()
    objs = sorted([o for o in sc.get('decor', []) if not o.get('floor')], key=lambda o: (o['y'], o['x']))
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='base')
        elif spr.has(o['t']):
            draw_prop(spr, cv, o, part='base')
        elif o['t'] in db.tiles:
            draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    for a in sc.get('actors', []):
        draw_actor(cv, a, spr)
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='overhead')
        elif spr.has(o['t']):
            draw_prop(spr, cv, o, part='overhead')
    for o in sc.get('overhead', []):
        draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    return cv


def room(name, sys_id, floor, W, H, rooms, paint=None, **kw):
    g = carve(W, H, rooms)
    if paint:
        paint(g)
    rows = depth(g)
    legend = {'#': sys_id + '_top', '|': sys_id + '_face', 'o': sys_id + '_out_face', 'v': sys_id + '_out_top',
              '.': floor, 's': 'dune_sand', 'p': 'caravan_paving', 'g': 'groove'}
    legend.update(kw.pop('legend', {}))
    sc = {'name': name, 'legend': legend, 'ground': rows, 'under': kw.pop('under', floor), 'decor': [], 'overlays': [],
          'actors': [], 'frame': 0}
    sc.update(kw)
    sc['sand'] = [''.join('s' if ch == 's' else '.' for ch in r) for r in rows]
    return sc


# ====================================================================== contact sheets
def cells(m, sheet):
    x, y, w, h = m['rect']
    if m.get('frames'):
        return [sheet.crop((fx, fy, fx + fw, fy + fh)) for (fx, fy, fw, fh) in m['frames']]
    if m.get('anim'):
        return [sheet.crop((x + k * m['anim']['frameDx'], y, x + k * m['anim']['frameDx'] + w, y + h))
                for k in sorted(set(m['anim']['frames']))]
    return [sheet.crop((x, y, x + w, y + h))]


def draw_contact(items, scale, width, name, bg=(96, 84, 70, 255), bg2=(74, 64, 54, 255)):
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
    with open(os.path.join(TILES_DIR, 'ep5_tiles.json')) as f:
        frag = json.load(f)
    sheet = Image.open(os.path.join(TILES_DIR, 'ep5.png')).convert('RGBA')
    objs = [(oid, cells(m, sheet)) for oid, m in frag['objects'].items()]
    big = [o for o in objs if max(i.height for i in o[1]) > 48 or sum(i.width for i in o[1]) > 120]
    small = [o for o in objs if o not in big]
    if small:
        draw_contact(small, 3, 1500, 'contact_objects_3x.png')
    if big:
        draw_contact(big, 2, 1500, 'contact_buildings_2x.png')
    tiles = []
    for tid, m in frag['tiles'].items():
        w, h = m.get('w', 16), m.get('h', 16)
        tiles.append((tid, [sheet.crop((m['x'], m['y'], m['x'] + w, m['y'] + h))]))
    if tiles:
        draw_contact(tiles, 3, 1500, 'contact_tiles_3x.png')
    terr = []
    for tid, m in frag['terrains'].items():
        fr = [sheet.crop((m['x'], m['y'], m['x'] + 32, m['y'] + 48))]
        if m.get('anim'):
            fr = [sheet.crop((m['x'] + k * 32, m['y'], m['x'] + k * 32 + 32, m['y'] + 48)) for k in range(3)]
        fr += [sheet.crop((vx, vy, vx + 16, vy + 16)) for (vx, vy) in m.get('variants', [])]
        terr.append((tid, fr))
    for wid, m in frag['walls'].items():
        fr = [sheet.crop((m['top'][0], m['top'][1], m['top'][0] + 32, m['top'][1] + 48)),
              sheet.crop((m['face'][0], m['face'][1], m['face'][0] + 32, m['face'][1] + 32))]
        for st in m.get('faceStyles', [])[1:]:
            for (bx, by) in st:
                fr.append(sheet.crop((bx, by, bx + 32, by + 32)))
        terr.append((wid, fr))
    draw_contact(terr, 3, 1500, 'contact_terrains_3x.png')


def main(argv):
    want = argv[1:] or ['contact', 'mocks', 'checks']
    if 'contact' in want:
        contact()
    db = None
    if 'mocks' in want or 'checks' in want:
        db = EP5DB()
        import ep5_mocks
        if 'mocks' in want:
            ep5_mocks.run_mocks(db)
        if 'checks' in want:
            ep5_mocks.checks(db)


if __name__ == '__main__':
    main(sys.argv)
