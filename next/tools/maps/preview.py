"""Map preview: render a src/data/maps/<id>.js module to a PNG with the real autotile rules.

    python preview.py willowmere              -> out/willowmere.png (3x, annotated) + out/willowmere_clean.png
    python preview.py --all                   -> every map in src/data/maps
    python preview.py valley --walk           -> also BFS-flood the walkable cells: unreachable floor is tinted
                                                 red, unreachable events/marks are listed on stdout
    python preview.py archive_f1 --crop 0,0,24,14 --scale 4   (crop is in tiles)
    python preview.py hero_home --frame 1     (water/ink animation frame)
    python preview.py --all --previews        -> refresh tools/maps/previews/<id>.png (the annotated 2x overviews
                                                 docs/MAPS.md and the critiques look at; run after any map or art change)

The map module is resolved by node (tools/maps/mapcheck.mjs dump), so helpers in _kit.js are fine.
Rendering reuses tools/art/tiles/compose.py (terrain layering, wall faces, objects, props) and adds
events: NPC and enemy sprites from the atlases, chests, mechanism objects, labeled markers for
triggers, doors, exits and marks. Output goes to tools/maps/out/ (git-ignored).
"""
import json, os, subprocess, sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..'))
TILES_TOOLS = os.path.join(NEXT, 'tools', 'art', 'tiles')
SPRITES = os.path.join(NEXT, 'assets', 'sprites')
OUT = os.path.join(HERE, 'out')
PREVIEWS = os.path.join(HERE, 'previews')
PREVIEW_SCALE = 2
sys.path.insert(0, TILES_TOOLS)

import pxlib                                             # noqa: E402
from pxlib import Canvas                                 # noqa: E402
import compose                                           # noqa: E402
from compose import TileDB, SpriteDB, terrain_cell, wall_cells, draw_tile, draw_object, draw_prop  # noqa: E402


# ------------------------------------------------------------------ fast alpha blit (compose.py's is per pixel)
def _fast_blit(self, src, x, y, sx=0, sy=0, w=None, h=None):
    arr = src.a if isinstance(src, Canvas) else src
    if w is None:
        w = arr.shape[1] - sx
    if h is None:
        h = arr.shape[0] - sy
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(self.w, x + w), min(self.h, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    s = arr[sy + (y0 - y):sy + (y1 - y), sx + (x0 - x):sx + (x1 - x)].astype(np.float64)
    d = self.a[y0:y1, x0:x1].astype(np.float64)
    sa = s[..., 3:4] / 255.0
    da = d[..., 3:4] / 255.0
    oa = sa + da * (1 - sa)
    safe = np.where(oa > 0, oa, 1)
    rgb = (s[..., :3] * sa + d[..., :3] * da * (1 - sa)) / safe
    out = np.concatenate([rgb, oa * 255], axis=-1)
    out = np.where(sa >= 1, s, out)
    out = np.where(sa <= 0, d, out)
    self.a[y0:y1, x0:x1] = np.clip(np.rint(out), 0, 255).astype(np.uint8)


Canvas.blit = _fast_blit


# ------------------------------------------------------------------ data
def node(args, timeout=60):
    cmd = ['node', os.path.join(HERE, 'mapcheck.mjs')] + args
    r = subprocess.run(cmd, cwd=NEXT, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise SystemExit('mapcheck failed: ' + r.stderr.strip())
    return json.loads(r.stdout)


def load_map(map_id):
    return node(['dump', map_id])


def list_maps():
    r = subprocess.run(['node', os.path.join(HERE, 'mapcheck.mjs'), 'list'], cwd=NEXT, capture_output=True, text=True, timeout=30)
    return [s for s in r.stdout.split() if s]


class Atlases:
    def __init__(self):
        self.npc = self._load('npcs.json')
        self.enemy = self._load('enemies_field.json')
        self.party = self._load('party_field.json')
        self.npcs_data = None
        self.props = None

    def _load(self, name):
        with open(os.path.join(SPRITES, name)) as f:
            meta = json.load(f)
        img = Canvas.from_array(np.asarray(Image.open(os.path.join(SPRITES, meta['image'])).convert('RGBA')))
        return meta, img

    def npc_frame(self, sprite, d='down'):
        meta, img = self.npc
        info = meta['sprites'].get(sprite)
        if not info:
            return None
        flip = False
        if info.get('faces') == 'left':
            names = [sprite + s for s in ('_sit_0', '_stand_0', '_0')]
            flip = d == 'right'
        elif info.get('faces') == 'front':
            names = [sprite + '_0']
        else:
            names = ['%s_%s_0' % (sprite, d)]
        for n in names:
            if n in meta['frames']:
                fr = meta['frames'][n]
                return img.crop(*fr), info.get('origin', [12, 31]), flip
        return None

    def enemy_frame(self, sprite):
        meta, img = self.enemy
        info = meta['sprites'].get(sprite)
        if not info or sprite + '_0' not in meta['frames']:
            return None
        return img.crop(*meta['frames'][sprite + '_0']), info['origin'], False

    def party_frame(self, who, d='down'):
        meta, img = self.party
        fr = meta['frames'].get('%s_%s_0' % (who, d))
        if not fr:
            return None
        return img.crop(*fr), meta.get('origin', [12, 31]), False


def npc_sprites():
    """id -> sprite id from src/data/npcs.js (via node, pure module)."""
    r = subprocess.run(['node', '-e', "import('./src/data/npcs.js').then(m=>console.log(JSON.stringify(Object.fromEntries(Object.entries(m.NPCS).map(([k,v])=>[k,[v.sprite,v.name]])))))"],
                       cwd=NEXT, capture_output=True, text=True, timeout=30)
    return json.loads(r.stdout) if r.returncode == 0 else {}


# ------------------------------------------------------------------ event -> drawable
MECH_SPRITES = {
    'block': lambda e: 'push_block',
    'plate': lambda e: 'plate_up',
    'switch': lambda e: e.get('sprite') or ('crystal_switch_%s' % e.get('color', 'blue') if e.get('kind') == 'crystal' else 'switch_off'),
    'gate': lambda e: '%s_%s' % (e['sprite'], e.get('state', 'closed')),
    'locked_door': lambda e: 'door_key_closed',
    'shelf': lambda e: 'shelf_moving',
    'brazier': lambda e: 'brazier_lit' if e.get('lit') else 'brazier_unlit',
    'pot': lambda e: 'pot',
    'font': lambda e: e.get('sprite', 'fountain'),
    'chest': lambda e: 'chest_%s' % e['tier'],
    'object': lambda e: e.get('sprite'),
}

LABEL_COLORS = {
    'trigger': (255, 220, 60), 'door': (90, 255, 140), 'exit': (80, 220, 255), 'mark': (255, 90, 230),
    'enemy': (255, 80, 80), 'npc': (255, 255, 255), 'chest': (255, 200, 90), 'object': (200, 255, 255),
    'sign': (230, 230, 230), 'book': (230, 230, 230), 'switch': (120, 220, 255), 'plate': (120, 220, 255),
    'block': (120, 220, 255), 'gate': (255, 160, 60), 'locked_door': (255, 160, 60), 'shelf': (255, 160, 60),
    'actor': (255, 120, 255), 'pit': (255, 100, 100), 'ferry': (80, 220, 255), 'font': (120, 255, 200),
    'save': (120, 255, 200), 'brazier': (255, 180, 80), 'pot': (220, 200, 160), 'light': (255, 255, 180),
}


def render(mp, db, spr, atl, frame=0, npc_map=None):
    legend = mp['legend']
    rows = mp['ground']
    H, W = len(rows), len(rows[0])
    ids = [[legend.get(ch) for ch in row] for row in rows]
    under = mp.get('under', 'grass')
    tgrid = [[(i if i in db.terrains else under) for i in r] for r in ids]
    cv = Canvas(W * 16, H * 16)
    for y in range(H):
        for x in range(W):
            t = terrain_cell(db, tgrid, x, y, frame)
            if t:
                cv.blit(t, x * 16, y * 16)
            w = wall_cells(db, ids, x, y)
            if w:
                cv.blit(w, x * 16, y * 16)
            tid = ids[y][x]
            if tid in db.tiles:
                m = db.tiles[tid]
                if m.get('autotile') == 'line16':
                    same = lambda xx, yy: 0 <= xx < W and 0 <= yy < H and ids[yy][xx] == tid
                    i = same(x, y - 1) * 1 + same(x + 1, y) * 2 + same(x, y + 1) * 4 + same(x - 1, y) * 8
                    src = db.sheet(m['sheet']).crop(m['x'] + (i % 8) * 16, m['y'] + (i // 8) * 16, 16, 16)
                    cv.blit(src, x * 16, y * 16)
                else:
                    draw_tile(db, cv, tid, x, y, frame)
    for o in mp.get('overlays', []):
        draw_tile(db, cv, o['t'], o['x'], o['y'], frame)

    # objects (decor + event-drawn mechanisms) and actors, y-sorted by anchor row
    objs = []
    for o in mp.get('decor', []):
        if o['t'] in db.objects or spr.has(o['t']):
            objs.append(dict(o))
        elif o['t'] in db.tiles:
            for k in range(o.get('w', 1)):
                for j in range(o.get('h', 1)):
                    draw_tile(db, cv, o['t'], o['x'] + k, o['y'] + j, frame)
    actors = []
    for e in mp.get('events', []):
        t = e['type']
        if t in MECH_SPRITES:
            sid = MECH_SPRITES[t](e)
            if sid and (sid in db.objects or spr.has(sid)):
                st = e.get('state') if t == 'object' else None
                if t == 'shelf':
                    px, py = e['positions'][e.get('state', 0)]
                    objs.append({'t': sid, 'x': px, 'y': py})
                else:
                    objs.append({'t': sid, 'x': e['x'], 'y': e['y'], 'state': st})
        elif t == 'npc':
            sprite = e.get('sprite') or (npc_map or {}).get(e['id'], [None])[0]
            if sprite:
                actors.append((e['x'], e['y'], sprite, e.get('dir', 'down'), 'npc'))
        elif t == 'actor':
            actors.append((e['x'], e['y'], e['sprite'], e.get('dir', 'down'), 'actor'))
        elif t == 'enemy':
            actors.append((e['x'], e['y'], e['sprite'], 'left', 'enemy'))
    st = mp.get('start')
    if st:
        actors.append((st['x'], st['y'], 'hero', st.get('dir', 'down'), 'party'))

    items = [(o['y'], 0, o) for o in objs] + [(a[1], 1, a) for a in actors]
    items.sort(key=lambda it: (it[0], it[1]))
    for _, kind, it in items:
        if kind == 0:
            if it['t'] in db.objects:
                draw_object(db, cv, it, frame, part='base')
            else:
                draw_prop(spr, cv, it, part='base')
        else:
            draw_actor_sprite(cv, atl, it)
    for _, kind, it in items:
        if kind == 0:
            if it['t'] in db.objects:
                draw_object(db, cv, it, frame, part='overhead')
            else:
                draw_prop(spr, cv, it, part='overhead')
    for o in mp.get('overhead', []):
        draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    return cv


def draw_actor_sprite(cv, atl, a):
    x, y, sprite, d, kind = a
    fr = None
    if kind == 'party':
        fr = atl.party_frame(sprite, d)
    elif kind == 'enemy':
        fr = atl.enemy_frame(sprite)
    else:
        fr = atl.npc_frame(sprite, d) or atl.enemy_frame(sprite) or atl.party_frame(sprite, d)
    if not fr:
        cv.rect(x * 16 + 4, y * 16 + 2, 8, 12, (255, 0, 255, 255))
        return
    img, origin, flip = fr
    if flip:
        img = Canvas.from_array(img.a[:, ::-1].copy())
        origin = [img.w - 1 - origin[0], origin[1]]
    # soft shadow under the feet
    sh = pxlib.SH(70)
    for dx in range(-5, 6):
        cv.put(x * 16 + 8 + dx, y * 16 + 14, sh)
    cv.blit(img, x * 16 + 8 - origin[0], y * 16 + 15 - origin[1])


# ------------------------------------------------------------------ annotation
def annotate(img, mp, scale, walk=None, font=None):
    draw = ImageDraw.Draw(img, 'RGBA')
    S = 16 * scale
    font = font or ImageFont.load_default(size=max(8, 3 * scale + 1))

    def box(x, y, w, h, col, fill_a=70, width=1):
        draw.rectangle([x * S, y * S, (x + w) * S - 1, (y + h) * S - 1], outline=col + (255,), fill=col + (fill_a,), width=width)

    def label(x, y, text, col, dy=0):
        tx, ty = x * S + 1, y * S + dy
        draw.rectangle([tx - 1, ty - 1, tx + font.getlength(text) + 1, ty + 3 * scale + 3], fill=(10, 8, 16, 170))
        draw.text((tx, ty), text, fill=col + (255,), font=font)

    if walk:
        reach = set(walk.get('reachable', []))
        floor = walk.get('floor', [])
        for key in floor:
            if key not in reach:
                x, y = map(int, key.split(','))
                draw.rectangle([x * S, y * S, (x + 1) * S - 1, (y + 1) * S - 1], fill=(255, 40, 40, 70))
    for ex in mp.get('exits', []):
        box(ex['x'], ex['y'], ex.get('w', 1), ex.get('h', 1), LABEL_COLORS['exit'], 90, 2)
        label(ex['x'], ex['y'], 'exit>' + ex['to'][0], LABEL_COLORS['exit'])
    for e in mp.get('events', []):
        t = e['type']
        if e.get('on') == 'enter':
            continue
        col = LABEL_COLORS.get(t, (255, 255, 255))
        w, h = e.get('w', 1), e.get('h', 1)
        if t == 'trigger':
            box(e['x'], e['y'], w, h, col, 60, 1)
            label(e['x'], e['y'], e['script'], col)
        elif t == 'door':
            box(e['x'], e['y'], w, h, col, 60, 2)
            label(e['x'], e['y'], '>' + e['to'][0] if e['to'][0] != mp['id'] else '>%d,%d' % (e['to'][1], e['to'][2]), col, dy=-4 * scale)
        elif t == 'pit':
            box(e['x'], e['y'], w, h, col, 0, 1)
            label(e['x'], e['y'], 'pit>%d,%d' % (e['to'][1], e['to'][2]) if e.get('to') else 'pit', col)
        elif t == 'enemy':
            label(e['x'] - 1, e['y'], e['encounter'] + (':' + e['move'][0]), col, dy=-5 * scale)
        elif t == 'shelf':
            for px, py in e['positions']:
                box(px, py, 2, 1, col, 30, 1)
            label(e['x'], e['y'], e['id'], col, dy=-4 * scale)
        elif t in ('light',):
            draw.ellipse([e['x'] * S + S // 2 - 3, e['y'] * S + S // 2 - 3, e['x'] * S + S // 2 + 3, e['y'] * S + S // 2 + 3], outline=col + (255,))
        else:
            label(e['x'], e['y'], e['id'], col, dy=-4 * scale if t in ('npc', 'actor') else 0)
    for name, (x, y) in (mp.get('marks') or {}).items():
        cx, cy = x * S + S // 2, y * S + S // 2
        col = LABEL_COLORS['mark']
        draw.line([cx - 5, cy, cx + 5, cy], fill=col + (255,), width=1)
        draw.line([cx, cy - 5, cx, cy + 5], fill=col + (255,), width=1)
        draw.rectangle([x * S, y * S, (x + 1) * S - 1, (y + 1) * S - 1], outline=col + (160,))
        label(x, y, name, col, dy=S - 3 * scale - 4)
    # tile ruler every 5 tiles
    for x in range(0, mp_w(mp), 5):
        draw.text((x * S + 1, 0), str(x), fill=(255, 255, 255, 200), font=font)
    for y in range(0, len(mp['ground']), 5):
        draw.text((0, y * S + 1), str(y), fill=(255, 255, 255, 200), font=font)
    return img


def mp_w(mp):
    return len(mp['ground'][0])


def walk_report(map_id, mp):
    r = node(['walk', map_id])
    if r.get('error'):
        print('walk:', r['error'])
        return None
    # floor cells for tinting: every cell the walker considers walkable in its final state
    legend = mp['legend']
    floor = []
    reach = set(r['reachable'])
    H, W = len(mp['ground']), len(mp['ground'][0])
    # approximate: cells reachable + cells with a walkable legend id not reached are marked by the walker
    # (mapcheck reports floorCells only, so derive from the grid dump when available)
    for y in range(H):
        for x in range(W):
            if r.get('grid'):
                if r['grid'][y][x] == 'none':
                    floor.append('%d,%d' % (x, y))
    r['floor'] = floor
    print('walk %s: start %s, reachable cells %d / walkable %d, keys %s, lantern %s' % (
        map_id, r['start'], len(reach), r.get('floorCells', 0), r['keys'], r['lantern']))
    for line in r['log']:
        print('   ', line)
    un = [e for e in r['events'] if not e['reached']]
    if un:
        print('  UNREACHED events: ' + ', '.join('%s(%s)' % (e['id'], e['type']) for e in un))
    bad_marks = [m for m in r['marks'] if not m['reached']]
    if bad_marks:
        print('  marks not reached (camera-only marks are fine): ' + ', '.join('%s@%d,%d%s' % (m['name'], m['x'], m['y'], '' if m['walkable'] else '(solid)') for m in bad_marks))
    for e in r['errors']:
        print('  ERROR', e)
    return r


def main(argv):
    args = [a for a in argv[1:] if not a.startswith('--')]
    flags = [a for a in argv[1:] if a.startswith('--')]
    opt = {}
    for f in flags:
        if '=' in f:
            k, v = f[2:].split('=', 1)
            opt[k] = v
        else:
            opt[f[2:]] = True
    # support "--scale 4" style too
    i = 0
    while i < len(args):
        if args[i].isdigit() or ',' in args[i]:
            args.pop(i)
        else:
            i += 1
    for k in ('scale', 'crop', 'frame'):
        if k in opt and opt[k] is True:
            raise SystemExit('use --%s=value' % k)
    previews = bool(opt.get('previews'))
    scale = int(opt.get('scale', PREVIEW_SCALE if previews else 3))
    frame = int(opt.get('frame', 0))
    ids = list_maps() if opt.get('all') else args
    if not ids:
        raise SystemExit(__doc__)
    db = TileDB()
    spr = SpriteDB()
    atl = Atlases()
    npc_map = npc_sprites()
    os.makedirs(OUT, exist_ok=True)
    for map_id in ids:
        mp = load_map(map_id)
        cv = render(mp, db, spr, atl, frame=frame, npc_map=npc_map)
        img = cv.image()
        if 'crop' in opt:
            cx, cy, cw, ch = [int(v) for v in opt['crop'].split(',')]
            img = img.crop((cx * 16, cy * 16, (cx + cw) * 16, (cy + ch) * 16))
            mp = dict(mp, ground=[r[cx:cx + cw] for r in mp['ground'][cy:cy + ch]],
                      events=[dict(e, x=e['x'] - cx, y=e['y'] - cy) for e in mp['events']],
                      exits=[dict(e, x=e['x'] - cx, y=e['y'] - cy) for e in mp.get('exits', [])],
                      marks={k: [v[0] - cx, v[1] - cy] for k, v in (mp.get('marks') or {}).items()})
            for e in mp['events']:
                if e['type'] == 'shelf':
                    e['positions'] = [[px - cx, py - cy] for px, py in e['positions']]
        big = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
        suffix = '_crop' if 'crop' in opt else ''
        clean = os.path.join(OUT, '%s%s_clean.png' % (map_id, suffix))
        big.save(clean)
        walk = walk_report(map_id, mp) if opt.get('walk') else None
        ann = annotate(big.convert('RGBA'), mp, scale, walk=walk)
        out = os.path.join(OUT, '%s%s.png' % (map_id, suffix))
        ann.save(out)
        print('wrote', out, '%dx%d tiles' % (len(mp['ground'][0]), len(mp['ground'])), 'and', clean)
        if previews and 'crop' not in opt:
            os.makedirs(PREVIEWS, exist_ok=True)
            pv = os.path.join(PREVIEWS, '%s.png' % map_id)
            ann.save(pv)
            print('wrote', pv)


if __name__ == '__main__':
    main(sys.argv)
