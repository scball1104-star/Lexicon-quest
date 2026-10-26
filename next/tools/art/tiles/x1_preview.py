"""Preview helpers for the x1 sheet: a TileDB that merges assets/tiles/x1_tiles.json (the pack fragment) the way the pack
loader does, with the terrain order the fragment asks for (terrainInsertBefore), and a scene renderer that adds the per-room
wall faces. Used by x1_scenes.py (mocks) and available to the map agents:

    import x1_preview; db = x1_preview.X1DB()      # then compose.render(scene, db) as usual
"""
import json, os
import numpy as np
from PIL import Image
from pxlib import Canvas, TILES_DIR, OUT_DIR
import compose
from compose import TileDB, terrain_cell, wall_cells, draw_tile, draw_object, draw_actor, draw_prop, SpriteDB, face_block_grid
from autotile import neighbours

OUT = os.path.join(OUT_DIR, 'x1')


class X1DB(TileDB):
    def __init__(self, order_from_fragment=True):
        super().__init__()
        with open(os.path.join(TILES_DIR, 'x1_tiles.json')) as f:
            self.frag = json.load(f)
        for k in ('terrains', 'walls', 'tiles', 'objects', 'overlays'):
            tgt = self.db.setdefault(k, {})
            for tid, v in self.frag.get(k, {}).items():
                if tid in tgt:
                    raise SystemExit('x1 id clashes with tiles.json: %s.%s' % (k, tid))
                tgt[tid] = v
        import x1
        from terrain import TERRAIN_ORDER
        order = x1.merged_order(TERRAIN_ORDER, list(self.frag['terrains']))
        for tid, v in self.db['terrains'].items():
            if tid in order:
                v['order'] = order.index(tid)


def render(scene, db=None, scale=3, map_id=None, frame=0):
    """compose.render with W12 per-room faces (map_id picks faceStyleByMap) and `state` frames on every object."""
    db = db or X1DB()
    legend = scene['legend']
    rows = scene['ground']
    H, W = len(rows), len(rows[0])
    ids = [[legend.get(ch) for ch in row] for row in rows]
    frame = scene.get('frame', frame)
    base_default = scene.get('under', 'grass')
    tgrid = [[(None if i == 'sky' else (i if i in db.terrains else (scene.get('under_map', {}).get(rows[y][x], base_default))))
              for x, i in enumerate(r)] for y, r in enumerate(ids)]
    face_blocks = face_block_grid(db, ids, map_id or scene.get('map'))
    cv = Canvas(W * 16, H * 16)
    sky_rows = [y for y in range(H) if any(i == 'sky' for i in ids[y])]
    if sky_rows:
        top, bot = (0x6a, 0xb3, 0xe4, 255), (0xe8, 0xff, 0xfb, 255)
        y1 = max(sky_rows) * 16 + 16
        for y in range(H * 16):
            t = min(1.0, y / float(max(1, y1)))
            band = int(t * 5) / 5.0          # banded like the battle sky
            c = tuple(int(round(top[k] + (bot[k] - top[k]) * band)) for k in range(4))
            for x in range(W * 16):
                if ids[y // 16][x // 16] == 'sky':
                    cv.set(x, y, c)
    for y in range(H):
        for x in range(W):
            t = terrain_cell(db, tgrid, x, y, frame)
            if t:
                cv.blit(t, x * 16, y * 16)
            w = wall_cells(db, ids, x, y, face_blocks)
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
        for k in range(o.get('w', 1)):
            for j in range(o.get('h', 1)):
                draw_tile(db, cv, o['t'], o['x'] + k, o['y'] + j, frame)
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
    for o in scene.get('overhead', []):
        draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    return cv


def save(cv, name, scale=3):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    cv.save(p, scale)
    return p


def crop_save(cv, name, box, scale):
    """box = (x, y, w, h) in tiles"""
    x, y, w, h = box
    c = cv.crop(x * 16, y * 16, w * 16, h * 16)
    return save(c, name, scale)
