"""Preview composer: render a small ASCII scene with the real autotile logic into a PNG.

    python compose.py                 # render every scene in scenes.py to out/preview_<name>.png (3x)
    python compose.py riverside       # one scene
    python compose.py path/to/scene.json

Scene format (dict or JSON), same legend idea as DESIGN 5.1:
    {"name": "riverside",
     "legend": {".": "grass", "=": "dirt", "~": "water", "^": "cliff_top", "|": "cliff_face", ...},
     "ground": ["....==~~~", ...],                 # one char per 16 px cell
     "overlays": [{"t": "flowers_white", "x": 3, "y": 4}],
     "decor": [{"t": "house_small", "x": 4, "y": 9}, {"t": "fence_wood", "x": 2, "y": 3, "w": 4}],
     "frame": 0}

Legend values are terrain ids (tiles.json "terrains"), wall-system ids (tiles.json "walls": a wall system
has a top autotile and a face autotile, legend entries "<id>_top" / "<id>_face"), plain tile ids
(tiles.json "tiles") or object ids. Decor objects are placed by their anchor tile and drawn y-sorted, with
their overheadRows drawn after everything else.

Renderer rules implemented here are the reference for src/world (see assets/tiles/README.md).
"""
import json, os, sys
from PIL import Image
from pxlib import Canvas, TILES_DIR, OUT_DIR, NEXT
from autotile import compose_a2, compose_face, neighbours, variant_hash, full_nb

ACTOR_TEST = os.path.join(NEXT, 'assets', 'sprites')


class SpriteDB:
    """Read-only access to the sprites agent's props/party atlases, used only to make previews realistic."""
    def __init__(self):
        self.props = None
        self.party = None
        try:
            with open(os.path.join(ACTOR_TEST, 'props.json')) as f:
                self.props = json.load(f)
            self.props_img = Canvas.from_array(__import__('numpy').asarray(
                Image.open(os.path.join(ACTOR_TEST, self.props['image'])).convert('RGBA')))
        except Exception:
            self.props = None
        try:
            with open(os.path.join(ACTOR_TEST, 'party_field.json')) as f:
                self.party = json.load(f)
            self.party_img = Canvas.from_array(__import__('numpy').asarray(
                Image.open(os.path.join(ACTOR_TEST, self.party['image'])).convert('RGBA')))
        except Exception:
            self.party = None

    def has(self, oid):
        return bool(self.props) and oid in self.props.get('objects', {})


class TileDB:
    def __init__(self):
        with open(os.path.join(TILES_DIR, 'tiles.json')) as f:
            self.db = json.load(f)
        self.sheets = {}
        self.cache = {}

    def sheet(self, name):
        if name not in self.sheets:
            im = Image.open(os.path.join(TILES_DIR, name)).convert('RGBA')
            import numpy as np
            self.sheets[name] = Canvas.from_array(np.asarray(im))
        return self.sheets[name]

    @property
    def terrains(self):
        return self.db['terrains']

    @property
    def walls(self):
        return self.db.get('walls', {})

    @property
    def tiles(self):
        return self.db.get('tiles', {})

    @property
    def objects(self):
        return self.db.get('objects', {})


def terrain_cell(db, grid, x, y, frame):
    """Compose all terrain layers of one cell. grid holds terrain ids (or None)."""
    T = db.terrains
    tid = grid[y][x]
    if tid not in T:
        return None
    H, W = len(grid), len(grid[0])
    order = lambda t: T[t]['order'] if t in T else -1
    present = set()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            xx, yy = x + dx, y + dy
            if 0 <= xx < W and 0 <= yy < H and grid[yy][xx] in T:
                present.add(grid[yy][xx])
    layers = sorted([t for t in present if order(t) <= order(tid)], key=order)
    out = Canvas(16, 16)
    for li, t in enumerate(layers):
        meta = T[t]
        sx, sy = meta['x'], meta['y']
        if meta.get('anim'):
            seq = meta['anim']['frames']
            sx += seq[frame % len(seq)] * meta['anim']['frameDx']
        if li == 0:
            nb = full_nb()
        else:
            ot = order(t)
            nb = neighbours(grid, x, y, lambda other, ot=ot: order(other) >= ot)
        sheet = db.sheet(meta['sheet'])
        if all(nb.values()) and meta.get('variants'):
            vs = meta['variants']
            weights = meta.get('variantWeights') or ([4] + [2] * (len(vs) - 1))
            hv = variant_hash(x, y) % sum(weights)
            k = 0
            while hv >= weights[k]:
                hv -= weights[k]
                k += 1
            vx, vy = vs[k]
            out.blit(sheet.crop(vx, vy, 16, 16), 0, 0)
        else:
            out.blit(compose_a2(sheet, nb, sx, sy), 0, 0)
    return out


def face_runs(ids, face_id):
    """Connected runs (4-neighbour) of cells whose legend id is face_id, in reading order (src/world/tilemap.js faceRuns)."""
    H = len(ids)
    W = max((len(r) for r in ids), default=0)
    seen = [[False] * len(r) for r in ids]
    runs = []
    for y in range(H):
        for x in range(W):
            if x >= len(ids[y]) or seen[y][x] or ids[y][x] != face_id:
                continue
            cells, stack = [], [(x, y)]
            seen[y][x] = True
            while stack:
                cx, cy = stack.pop()
                cells.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= ny < H and 0 <= nx < len(ids[ny]) and not seen[ny][nx] and ids[ny][nx] == face_id:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            runs.append({'cells': cells, 'minX': min(c[0] for c in cells), 'y': y})
    return runs


def run_styles(runs, n_styles, plan):
    """The style index of every run (src/world/tilemap.js runStyles): `at` pins a run, the rest follow `cycle`."""
    out = [-1] * len(runs)
    for px, py, st in (plan or {}).get('at', []):
        for i, r in enumerate(runs):
            if (px, py) in r['cells'] and 0 <= st < n_styles:
                out[i] = st
                break
    cycle = [c for c in ((plan or {}).get('cycle') or list(range(n_styles))) if 0 <= c < n_styles]
    k = 0
    for i in range(len(runs)):
        if out[i] >= 0:
            continue
        out[i] = cycle[k % len(cycle)] if cycle else 0
        k += 1
    return out


def face_block_grid(db, ids, map_id):
    """W12 per-room wall art (tiles.json walls[sys].faceStyles / faceStyleByMap): rows of (fx, fy) face blocks, or None
    where the system's own `face` applies. The same rules as src/world/tilemap.js faceBlockGrid, so previews match the game."""
    grid = [[None] * len(r) for r in ids]
    for sys_id, meta in db.walls.items():
        styles = meta.get('faceStyles')
        if not isinstance(styles, list) or len(styles) < 2:
            continue
        plan = (meta.get('faceStyleByMap') or {}).get(map_id)
        face_id = sys_id + '_face'
        if not plan or not any(face_id in r for r in ids):
            continue
        runs = face_runs(ids, face_id)
        for run, pick in zip(runs, run_styles(runs, len(styles), plan)):
            blocks = styles[pick]
            if not blocks:
                continue
            for x, y in run['cells']:
                grid[y][x] = tuple(blocks[(x - run['minX']) % len(blocks)])
    return grid


def wall_cells(db, grid_ids, x, y, face_blocks=None):
    """grid_ids: raw legend ids. Wall systems: '<sys>_top' and '<sys>_face'. face_blocks: face_block_grid() for a map
    with per-room wall art (W12)."""
    tid = grid_ids[y][x]
    if not tid:
        return None
    for sys_id, meta in db.walls.items():
        if tid == sys_id + '_top':
            sheet = db.sheet(meta['sheet'])
            nb = neighbours(grid_ids, x, y, lambda o, s=sys_id: o == s + '_top')
            tx, ty = meta['top']
            if all(nb.values()) and meta.get('topVariants'):
                vs, ws = meta['topVariants'], meta.get('topVariantWeights') or [1] * len(meta['topVariants'])
                hv = variant_hash(x, y) % sum(ws)
                k = 0
                while hv >= ws[k]:
                    hv -= ws[k]
                    k += 1
                return sheet.crop(vs[k][0], vs[k][1], 16, 16)
            return compose_a2(sheet, nb, tx, ty)
        if tid == sys_id + '_face':
            sheet = db.sheet(meta['sheet'])
            H, W = len(grid_ids), len(grid_ids[0])
            same = lambda xx, yy: (not (0 <= xx < W and 0 <= yy < H)) or grid_ids[yy][xx] == tid
            fx, fy = (face_blocks[y][x] if face_blocks and face_blocks[y][x] else None) or meta['face']
            return compose_face(sheet, same(x - 1, y), same(x, y - 1), same(x + 1, y), same(x, y + 1), fx, fy)
    return None


def render(scene, db=None, scale=3):
    db = db or TileDB()
    legend = scene['legend']
    rows = scene['ground']
    H, W = len(rows), len(rows[0])
    ids = [[legend.get(ch) for ch in row] for row in rows]
    frame = scene.get('frame', 0)
    base_default = scene.get('under', 'grass')
    # terrain grid: wall cells / tile cells take the scene's 'under' terrain beneath them
    tgrid = [[(i if i in db.terrains else (scene.get('under_map', {}).get(rows[y][x], base_default)))
              for x, i in enumerate(r)] for y, r in enumerate(ids)]
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
    for o in scene.get('overlays', []):
        draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    # objects, y-sorted by anchor row; overhead rows deferred
    objs = []
    spr = SpriteDB()
    for o in scene.get('decor', []):
        if o['t'] in db.objects or spr.has(o['t']):
            objs.append(o)
        elif o['t'] in db.tiles:
            for k in range(o.get('w', 1)):
                for j in range(o.get('h', 1)):
                    draw_tile(db, cv, o['t'], o['x'] + k, o['y'] + j, frame)
    objs.sort(key=lambda o: (o['y'], o['x']))
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='base')
        else:
            draw_prop(spr, cv, o, part='base')
    for o in scene.get('actors', []):
        draw_actor(cv, o, spr)
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='overhead')
        else:
            draw_prop(spr, cv, o, part='overhead')
    return cv


def draw_prop(spr, cv, o, part='base'):
    m = spr.props['objects'][o['t']]
    fx, fy, fw, fh = m['frame']
    if o.get('state') is not None and m.get('frames'):
        fx, fy, fw, fh = m['frames'][o['state']]
    ax, ay = m['anchor']
    fpw = m['footprint'][0]
    px = o['x'] * 16 + fpw * 8 - ax
    py = o['y'] * 16 + 15 - ay
    oh = m.get('overheadY', 0)
    src = spr.props_img
    if m.get('blend') == 'lighter':
        return
    if part == 'base':
        cv.blit(src.crop(fx, fy + oh, fw, fh - oh), px, py + oh)
    elif oh:
        cv.blit(src.crop(fx, fy, fw, oh), px, py)


def draw_tile(db, cv, tid, x, y, frame=0):
    m = db.tiles.get(tid) or db.terrains.get(tid)
    if not m:
        return
    sx, sy = m['x'], m['y']
    if m.get('anim'):
        seq = m['anim']['frames']
        sx += seq[frame % len(seq)] * m['anim']['frameDx']
    cv.blit(db.sheet(m['sheet']).crop(sx, sy, m.get('w', 16), m.get('h', 16)), x * 16, y * 16)


def draw_object(db, cv, o, frame, part='base'):
    m = db.objects[o['t']]
    rx, ry, rw, rh = m['rect']
    if o.get('state') is not None and m.get('frames'):
        # E2-tiles: state frames (mirrors '/' '\', receptors dark/lit, doors by crystals lit), like props.json
        rx, ry, rw, rh = m['frames'][o['state']]
    if m.get('anim'):
        seq = m['anim']['frames']
        rx += seq[frame % len(seq)] * m['anim']['frameDx']
    ax, ay = m['anchor']
    ox = (o['x'] - ax) * 16
    oy = (o['y'] - ay) * 16
    oh = m.get('overheadRows', 0) * 16
    src = db.sheet(m['sheet'])
    if part == 'base':
        cv.blit(src.crop(rx, ry + oh, rw, rh - oh), ox, oy + oh)
    elif oh:
        cv.blit(src.crop(rx, ry, rw, oh), ox, oy)


def draw_actor(cv, a, spr=None):
    """Hero field sprite when available (else a stand-in), feet on the tile, to judge scale and overhead."""
    from pxlib import C, SH
    if spr is not None and spr.party:
        name = '%s_%s_0' % (a.get('who', 'hero'), a.get('dir', 'down'))
        fr = spr.party['frames'].get(name)
        if fr:
            ox, oy = spr.party.get('origin', [12, 31])
            cv.blit(spr.party_img.crop(*fr), a['x'] * 16 + 8 - ox, a['y'] * 16 + 15 - oy)
            return
    x, y = a['x'] * 16 + 8, a['y'] * 16 + 15
    for dx in range(-5, 6):
        cv.put(x + dx, y, SH(90))
    body = [(-3, -20, 7, 12, C('cloth_blue', 3)), (-3, -27, 7, 7, C('skin_light', 2)),
            (-4, -29, 9, 4, C('hair_brown', 3)), (-3, -9, 3, 8, C('wood', 2)), (1, -9, 3, 8, C('wood', 2))]
    for (bx, by, bw, bh, col) in body:
        cv.rect(x + bx, y + by, bw, bh, col)


def main(argv):
    import scenes
    db = TileDB()
    names = argv[1:] or list(scenes.SCENES)
    for n in names:
        if n.endswith('.json'):
            with open(n) as f:
                sc = json.load(f)
        else:
            sc = scenes.SCENES[n]
        frames = sc.get('frames', 1)
        cv = render(sc, db)
        out = os.path.join(OUT_DIR, 'preview_%s.png' % sc['name'])
        cv.save(out, 3)
        cv.save(os.path.join(OUT_DIR, 'preview_%s_x1.png' % sc['name']), 1)
        print('wrote', out, cv.w, 'x', cv.h)


if __name__ == '__main__':
    main(sys.argv)
