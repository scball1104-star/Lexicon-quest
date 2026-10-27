"""Deep Stacks map previews for C2-sprites-boss: the hand-made maps, generated floors of bands three to five, and the
prefab libraries of those bands, rendered with the real tile art and the cave pack atlases (cave_props chests, the Binder's
field avatar), which tools/cave/preview.py cannot see.

    python cave_map_preview.py --map cave_b100 [--scale 3]       -> tools/cave/out/map_cave_b100.png (+ _clean)
    python cave_map_preview.py --map cave_landing0
    python cave_map_preview.py --floor 7 45 [--walk]             -> tools/cave/out/b45_s7.png
    python cave_map_preview.py --prefabs court                   -> tools/cave/out/prefabs_court.png
    python cave_map_preview.py --landing ember                   -> tools/cave/out/landing_ember.png
    python cave_map_preview.py --sheet 7 41,45,50,65,70,85,90    -> tools/cave/out/sheet_c2_s7.png (2x)

Rendering reuses tools/maps/preview.py (render, annotate) with the atlases extended in place.
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
MAPS_TOOLS = os.path.join(NEXT, 'tools', 'maps')
TILES_TOOLS = os.path.join(NEXT, 'tools', 'art', 'tiles')
SPRITES = os.path.join(NEXT, 'assets', 'sprites')
OUT = os.path.join(NEXT, 'tools', 'cave', 'out')
sys.path.insert(0, MAPS_TOOLS)
sys.path.insert(0, TILES_TOOLS)

from preview import render, annotate, Atlases, SpriteDB     # noqa: E402  (tools/maps/preview.py)
from compose import TileDB, Canvas                           # noqa: E402


def node_dump(args, timeout=120):
    r = subprocess.run(['node', os.path.join(HERE, 'cave_dump.mjs')] + [str(a) for a in args], cwd=NEXT, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise SystemExit('cave_dump.mjs failed: ' + r.stderr.strip())
    return json.loads(r.stdout)


class CaveSpriteDB(SpriteDB):
    """props.json plus cave_props.json: the two images stacked, the cave objects' rects moved down by the props image height."""
    def __init__(self):
        super().__init__()
        p = os.path.join(SPRITES, 'cave_props.json')
        if not (self.props and os.path.exists(p)):
            return
        with open(p, encoding='utf-8') as f:
            cave = json.load(f)
        base = Image.open(os.path.join(SPRITES, self.props['image'])).convert('RGBA')
        extra = Image.open(os.path.join(SPRITES, cave['image'])).convert('RGBA')
        W, H = max(base.width, extra.width), base.height + extra.height
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        im.paste(base, (0, 0)); im.paste(extra, (0, base.height))
        self.props_img = Canvas.from_array(np.asarray(im))
        objs = dict(self.props['objects'])
        for k, o in cave['objects'].items():
            o = dict(o)
            o['frame'] = [o['frame'][0], o['frame'][1] + base.height, o['frame'][2], o['frame'][3]]
            if o.get('frames'):
                o['frames'] = [[f[0], f[1] + base.height, f[2], f[3]] for f in o['frames']]
            objs[k] = o
        self.props = dict(self.props, objects=objs)


class CaveAtlases(Atlases):
    """enemies_field plus cave_enemies_field (the Binder's avatar) for actor events."""
    def __init__(self):
        super().__init__()
        self.cave_enemy = None
        if os.path.exists(os.path.join(SPRITES, 'cave_enemies_field.json')):
            self.cave_enemy = self._load('cave_enemies_field.json')

    def enemy_frame(self, sprite):
        got = super().enemy_frame(sprite)
        if got or not self.cave_enemy:
            return got
        meta, img = self.cave_enemy
        info = meta['sprites'].get(sprite)
        if not info or sprite + '_0' not in meta['frames']:
            return None
        return img.crop(*meta['frames'][sprite + '_0']), info['origin'], False


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
    ImageDraw.Draw(out).text((4, 2), text, fill=(255, 240, 200, 255), font=font)
    return out


def sheet_of(tiles, cols):
    cw = max(t.width for t in tiles)
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    rh = [max(t.height for t in r) for r in rows]
    sheet = Image.new('RGBA', (cw * cols + 8 * (cols + 1), sum(rh) + 8 * (len(rows) + 1)), (6, 4, 12, 255))
    y = 8
    for r, h in zip(rows, rh):
        x = 8
        for t in r:
            sheet.paste(t, (x, y)); x += cw + 8
        y += h + 8
    return sheet


def main(argv):
    os.makedirs(OUT, exist_ok=True)
    scale = int(argv[argv.index('--scale') + 1]) if '--scale' in argv else 3
    walk = '--walk' in argv
    db, spr, atl = TileDB(), CaveSpriteDB(), CaveAtlases()
    if '--map' in argv:
        mid = argv[argv.index('--map') + 1]
        m = node_dump(['--map', mid])
        big, ann = render_floor(m, db, spr, atl, scale, walk)
        big.save(os.path.join(OUT, f'map_{mid}_clean.png')); ann.save(os.path.join(OUT, f'map_{mid}.png'))
        reach = set(m['_walk']['reachable']); un = [c for c in m['_walk']['floor'] if c not in reach]
        print('wrote', os.path.join(OUT, f'map_{mid}.png'), '%dx%d events %d, unreachable floor cells %d' % (len(m['ground'][0]), len(m['ground']), len(m['events']), len(un)))
    elif '--prefabs' in argv:
        band = argv[argv.index('--prefabs') + 1]
        maps = node_dump(['--prefabs', band])
        tiles = []
        for m in maps:
            big, ann = render_floor(m, db, spr, atl, scale, False)
            doors = ' '.join(k for k in m['marks'] if k[0] in 'nsew' and not k.startswith('foe'))
            tiles.append(caption(ann, '%s  %s  %dx%d doors %s' % (m['id'], ','.join(m['tags']), len(m['ground'][0]) - 4, len(m['ground']) - 6, doors), scale))
        out = os.path.join(OUT, f'prefabs_{band}.png')
        sheet_of(tiles, 4).save(out)
        print('wrote', out, len(maps), 'prefabs')
    elif '--landing' in argv:
        band = argv[argv.index('--landing') + 1]
        m = node_dump(['--landing', band])
        big, ann = render_floor(m, db, spr, atl, scale, walk)
        out = os.path.join(OUT, f'landing_{band}.png')
        ann.save(out); print('wrote', out, m['name'])
    elif '--sheet' in argv:
        i = argv.index('--sheet')
        seed, floors = int(argv[i + 1]), [int(f) for f in argv[i + 2].split(',')]
        tiles = []
        for f in floors:
            m = node_dump(['--floor', seed, f])
            big, ann = render_floor(m, db, spr, atl, 2, False)
            tiles.append(caption(ann, '%s  seed %d  %dx%d  rooms %d  events %d' % (m['name'], seed, len(m['ground'][0]), len(m['ground']), len(m.get('rooms', [])), len(m['events'])), 2))
        out = os.path.join(OUT, f'sheet_c2_s{seed}.png')
        sheet_of(tiles, 2).save(out); print('wrote', out, floors)
    elif '--floor' in argv:
        i = argv.index('--floor')
        seed, floor = int(argv[i + 1]), int(argv[i + 2])
        m = node_dump(['--floor', seed, floor])
        big, ann = render_floor(m, db, spr, atl, scale, walk)
        stem = os.path.join(OUT, f'b{floor}_s{seed}')
        big.save(stem + '_clean.png'); ann.save(stem + '.png')
        reach = set(m['_walk']['reachable']); un = [c for c in m['_walk']['floor'] if c not in reach]
        print('wrote', stem + '.png', '%s %dx%d rooms %d events %d, unreachable floor cells %d' % (m['name'], len(m['ground'][0]), len(m['ground']), len(m.get('rooms', [])), len(m['events']), len(un)))
    else:
        raise SystemExit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
