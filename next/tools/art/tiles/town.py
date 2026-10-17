"""Town architecture -> assets/tiles/town.png: modular kit tiles + prefab buildings.

Prefab object contract (tiles.json "objects"):
    rect: [x, y, w, h] in town.png (multiples of 16)
    anchor: [tx, ty] tile inside the rect that sits on the decor (x, y) of the map (bottom-left footprint tile)
    footprint: [[dx, dy], ...] solid tiles relative to the anchor (dy <= 0)
    overheadRows: n top tile rows of the rect drawn above actors
    doorAt: [dx, dy] relative to the anchor (the door cell; walkable, put the door event there)
"""
from pxlib import Canvas
from prefabs import PREFABS
import kit


def pack(items, SW=512):
    """Shelf-pack (id, Canvas, meta) items, tallest first. Returns placements and height."""
    x = y = shelf = 0
    placed = []
    for pid, cv, meta in sorted(items, key=lambda t: (-t[1].h, t[0])):
        if x + cv.w > SW:
            x, y, shelf = 0, y + shelf, 0
        placed.append((pid, cv, meta, x, y))
        x += cv.w
        shelf = max(shelf, cv.h)
    return placed, y + shelf


def build():
    items = []
    for pid, fn in PREFABS.items():
        cv, meta = fn()
        items.append((pid, cv, meta))
    placed, H = pack(items)
    kit_sheet, kit_meta = kit.build()
    sheet = Canvas(512, H + kit_sheet.h)
    out = {'objects': {}, 'tiles': {}}
    for pid, cv, meta, px, py in placed:
        sheet.paste(cv, px, py)
        m = dict(meta)
        w, h = m.pop('rect_wh')
        out['objects'][pid] = {'sheet': 'town.png', 'rect': [px, py, w, h], 'kind': 'building', **m}
    sheet.paste(kit_sheet, 0, H)
    for tid, m in kit_meta.get('tiles', {}).items():
        m = dict(m)
        m['y'] += H
        m['sheet'] = 'town.png'
        out['tiles'][tid] = m
    for oid, m in kit_meta.get('objects', {}).items():
        m = dict(m)
        r = list(m['rect'])
        r[1] += H
        m['rect'] = r
        m['sheet'] = 'town.png'
        out['objects'][oid] = m
    return sheet, out


if __name__ == '__main__':
    import os
    from pxlib import OUT_DIR
    for pid, fn in PREFABS.items():
        cv, meta = fn()
        cv.save(os.path.join(OUT_DIR, 'bld_%s.png' % pid), 4)
