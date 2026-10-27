"""Deep Stacks previews: render generated floors and the prefab library to PNG with the real tile art.

    python tools/cave/preview.py --seed 7 --floor 15            -> out/b15_s7.png (3x, labelled) + out/b15_s7_clean.png
    python tools/cave/preview.py --seed 7 --floor 15 --scale 4
    python tools/cave/preview.py --seed 7 --sheet                -> out/sheet_s7.png: ten floors (B1..B10) at 2x
    python tools/cave/preview.py --seed 7 --sheet --floors 1,9,10,19,20,21,35,40,60,99
    python tools/cave/preview.py --prefabs catalogue             -> out/prefabs_catalogue.png: every prefab of the band
    python tools/cave/preview.py --seed 7 --floor 3 --walk       -> unreachable floor tinted red (the generator's own model)

The floor module comes from node (tools/cave/dump.mjs, which imports src/data/cave/gen.js); rendering reuses
tools/maps/preview.py (compose.py: terrains, wall faces, objects, props, event sprites, labels). Output: tools/cave/out/.
"""
import json, os, subprocess, sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..'))
MAPS_TOOLS = os.path.join(NEXT, 'tools', 'maps')
OUT = os.path.join(HERE, 'out')
sys.path.insert(0, MAPS_TOOLS)

import preview as mp_preview                                   # noqa: E402  (tools/maps/preview.py)
from preview import render, annotate, Atlases, SpriteDB         # noqa: E402


def node_dump(args, timeout=120):
    r = subprocess.run(['node', os.path.join(HERE, 'dump.mjs')] + [str(a) for a in args], cwd=NEXT, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise SystemExit('dump.mjs failed: ' + r.stderr.strip())
    return json.loads(r.stdout)


def tile_db():
    try:
        from x1_preview import X1DB
        return X1DB()
    except Exception:  # noqa: BLE001
        from compose import TileDB
        return TileDB()


def parse_args(argv):
    opt = {'scale': 3, 'seed': 7, 'floor': None, 'sheet': False, 'prefabs': None, 'walk': False, 'floors': None, 'tag': ''}
    i = 1
    while i < len(argv):
        a = argv[i]
        if a in ('--seed', '--floor', '--scale', '--prefabs', '--floors', '--tag'):
            opt[a[2:]] = argv[i + 1]
            i += 2
            continue
        if a == '--sheet':
            opt['sheet'] = True
        elif a == '--walk':
            opt['walk'] = True
        else:
            raise SystemExit('unknown argument ' + a)
        i += 1
    opt['scale'] = int(opt['scale'])
    opt['seed'] = int(opt['seed'])
    if opt['floor'] is not None:
        opt['floor'] = int(opt['floor'])
    return opt


def render_floor(mp, db, spr, atl, scale, walk):
    cv = render(mp, db, spr, atl, frame=0, npc_map={}, flags=None, trace=None)
    img = cv.image()
    big = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    w = None
    if walk and mp.get('_walk'):
        w = {'reachable': mp['_walk']['reachable'], 'floor': mp['_walk']['floor']}
    ann = annotate(big.convert('RGBA'), mp, scale, walk=w)
    return big, ann


def caption(img, text, scale):
    font = ImageFont.load_default(size=max(10, 4 * scale + 2))
    pad = 6 * scale // 2 + 8
    out = Image.new('RGBA', (img.width, img.height + pad), (14, 10, 24, 255))
    out.paste(img, (0, pad))
    d = ImageDraw.Draw(out)
    d.text((4, 2), text, fill=(255, 240, 200, 255), font=font)
    return out


def main(argv):
    opt = parse_args(argv)
    os.makedirs(OUT, exist_ok=True)
    db, spr, atl = tile_db(), SpriteDB(), Atlases()
    scale = opt['scale']
    if opt['prefabs']:
        band = opt['prefabs']
        maps = node_dump(['--prefabs', band])
        tiles = []
        for m in maps:
            big, ann = render_floor(m, db, spr, atl, scale, False)
            tiles.append(caption(ann, '%s  %s  %dx%d doors %s' % (m['id'], ','.join(m['tags']), len(m['ground'][0]) - 4, len(m['ground']) - 6,
                                                                 ' '.join(k for k in m['marks'] if k[0] in 'nsew' and not k.startswith('foe'))), scale))
        cols = 4
        cw = max(t.width for t in tiles)
        rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
        rh = [max(t.height for t in r) for r in rows]
        sheet = Image.new('RGBA', (cw * cols + 8 * (cols + 1), sum(rh) + 8 * (len(rows) + 1)), (6, 4, 12, 255))
        y = 8
        for r, h in zip(rows, rh):
            x = 8
            for t in r:
                sheet.paste(t, (x, y))
                x += cw + 8
            y += h + 8
        out = os.path.join(OUT, 'prefabs_%s.png' % band)
        sheet.save(out)
        print('wrote', out, len(maps), 'prefabs')
        return
    if opt['sheet']:
        floors = [int(f) for f in opt['floors'].split(',')] if opt['floors'] else list(range(1, 11))
        tiles = []
        for f in floors:
            m = node_dump([opt['seed'], f])
            big, ann = render_floor(m, db, spr, atl, 2, False)
            tiles.append(caption(ann, '%s  seed %d  %dx%d  rooms %d  events %d' % (m['name'], opt['seed'], len(m['ground'][0]), len(m['ground']), len(m.get('rooms', [])), len(m['events'])), 2))
        cols = 2
        cw = max(t.width for t in tiles)
        rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
        rh = [max(t.height for t in r) for r in rows]
        sheet = Image.new('RGBA', (cw * cols + 8 * (cols + 1), sum(rh) + 8 * (len(rows) + 1)), (6, 4, 12, 255))
        y = 8
        for r, h in zip(rows, rh):
            x = 8
            for t in r:
                sheet.paste(t, (x, y))
                x += cw + 8
            y += h + 8
        out = os.path.join(OUT, 'sheet_s%d%s.png' % (opt['seed'], opt['tag']))
        sheet.save(out)
        print('wrote', out, 'floors', floors)
        return
    if opt['floor'] is None:
        raise SystemExit(__doc__)
    m = node_dump([opt['seed'], opt['floor']])
    big, ann = render_floor(m, db, spr, atl, scale, opt['walk'])
    stem = os.path.join(OUT, 'b%d_s%d%s' % (opt['floor'], opt['seed'], opt['tag']))
    big.save(stem + '_clean.png')
    ann.save(stem + '.png')
    un = []
    if m.get('_walk'):
        reach = set(m['_walk']['reachable'])
        un = [c for c in m['_walk']['floor'] if c not in reach]
    print('wrote', stem + '.png', '%s %dx%d rooms %d events %d, unreachable floor cells %d' % (
        m['name'], len(m['ground'][0]), len(m['ground']), len(m.get('rooms', [])), len(m['events']), len(un)))


if __name__ == '__main__':
    main(sys.argv)
