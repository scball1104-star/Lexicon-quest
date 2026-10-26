"""Build every tile sheet and assets/tiles/tiles.json.

    python build_tiles.py          # all sheets + tiles.json
    python build_tiles.py terrain  # just one sheet (tiles.json is still rewritten from all metas)
    python build_tiles.py x1       # the Episode 1 expansion pack sheet (assets/tiles/x1.png + x1_tiles.json), not part of tiles.json
"""
import json, os, sys, importlib
from pxlib import TILES_DIR, OUT_DIR, snap_to_palette

SHEETS = ['terrain', 'cliffs', 'town', 'archive', 'interior', 'court', 'hollow', 'forge', 'ember']

COLLISION_CODES = {
    'none': 'walkable',
    'solid': 'blocks movement',
    'water': 'blocks walking (deep water / ink); future boats may pass',
    'ledge_s': 'walkable; can be entered only moving south (hop down); blocks north/east/west entry',
    'ledge_e': 'walkable; can be entered only moving east',
    'ledge_w': 'walkable; can be entered only moving west',
    'pit': 'walking in drops the actor to the floor below (map defines the target); blocks AI',
    'counter': 'blocks movement, but talk/interact reaches across it (shop counters)',
}


def main(argv):
    want = argv[1:] or SHEETS
    metas = {}
    for name in SHEETS:
        mod_name = name
        try:
            mod = importlib.import_module(mod_name)
        except ModuleNotFoundError:
            continue
        cache = os.path.join(OUT_DIR, '_meta_%s.json' % name)
        if name in want or not os.path.exists(cache):
            sheet, meta = mod.build()
            snap_to_palette(sheet)
            sheet.save(os.path.join(TILES_DIR, name + '.png'))
            sheet.save(os.path.join(OUT_DIR, name + '_x3.png'), 3)
            with open(cache, 'w') as f:
                json.dump(meta, f)
            print('%-9s %4d x %4d' % (name, sheet.w, sheet.h))
        with open(cache) as f:
            metas[name] = json.load(f)
    db = {'version': 1, 'tileSize': 16, 'generator': 'next/tools/art/tiles/build_tiles.py',
          'collisionCodes': COLLISION_CODES,
          'terrainOrder': None, 'terrains': {}, 'walls': {}, 'tiles': {}, 'objects': {}, 'overlays': {}}
    from terrain import TERRAIN_ORDER
    db['terrainOrder'] = TERRAIN_ORDER
    for name, meta in metas.items():
        for k in ('terrains', 'walls', 'tiles', 'objects', 'overlays'):
            for tid, v in meta.get(k, {}).items():
                if tid in db[k]:
                    raise SystemExit('duplicate id %s in %s' % (tid, k))
                v.setdefault('sheet', name + '.png')
                db[k][tid] = v
    for tid, v in db['terrains'].items():
        if tid in TERRAIN_ORDER:
            v['order'] = TERRAIN_ORDER.index(tid)
    # Props: every rect row above the footprint goes to the overhead layer, so an actor standing behind a
    # tall prop is covered by it (buildings already compute this exactly).
    for oid, v in db['objects'].items():
        if v.get('kind') == 'prop' and v.get('footprint'):
            rows = v['rect'][3] // 16
            depth = 1 - min(dy for _, dy in v['footprint'])
            v['overheadRows'] = max(0, rows - depth)
    # overlays are also addressable as plain tiles
    for tid, v in db['overlays'].items():
        db['tiles'].setdefault(tid, v)
    with open(os.path.join(TILES_DIR, 'tiles.json'), 'w', newline='\n') as f:
        json.dump(db, f, indent=1, sort_keys=False)
    print('tiles.json: %d terrains, %d walls, %d tiles, %d objects' % (
        len(db['terrains']), len(db['walls']), len(db['tiles']), len(db['objects'])))
    __import__('x1').write() if (not argv[1:] or 'x1' in argv[1:]) else None   # X1 pack sheet: x1.png + x1_tiles.json (never tiles.json)


if __name__ == '__main__':
    main(sys.argv)
