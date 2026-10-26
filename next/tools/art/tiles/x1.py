"""The Wider Valley pack tile sheet (X1-tiles, EXPANSION1_PLAN section 10.1) -> assets/tiles/x1.png + assets/tiles/x1_tiles.json.

A PACK sheet: it is never appended to tiles.json. The pack loader (src/game/packs.js mergeTileFragment) merges
x1_tiles.json into the live tile database; every id here carries the `x1_` prefix (plus the plan's own `x1_` names).

    python build_tiles.py x1        # builds this sheet (see the x1 line in build_tiles.py)
    python x1.py                    # same, plus the contact sheet and the previews in out/x1/

Modules (each has build_into(sh), appended in this order so no earlier rect ever moves):
    x1_kit.py    the three dungeons: floors, rugs, wall systems with outer faces and per-room face styles
    x1_land.py   the wide-map terrains (moor, heath, tarn, orchard, pond bed), crags and terraces
    x1_props.py  overworld objects, mechanisms, interior pieces
    x1_bld.py    prefabs: Loom House, cottages, shed, mill, orrery, watchtower, windmill, turf hut, barrow mound
    x1_far.py    far-off decals for the overhead layer

Terrain order. The engine orders layers by the index in db.terrainOrder (tilemap.js orderOf), and mergeTileFragment pushes a
fragment's ids onto the END of that list (above water, ink and pit). Dungeon floors and the moor ground must sit BELOW the
holes, so the fragment also carries `terrainInsertBefore: { id: existingTerrainId }` (documented in docs/PWA_PACKS.md by the
integrate agent): a merge that honours it inserts the id just before the named terrain. Without it the floors still work, but a
floor beside a pit or ink draws its own crisp lip over the hole instead of the hole's rim.
"""
import json, os, sys
from pxlib import Canvas, TILES_DIR, OUT_DIR, snap_to_palette
from kit import Sheet

SHEET = 'x1.png'
FRAGMENT = 'x1_tiles.json'
# where each x1 terrain sits in the draw order: id -> the existing terrain it goes BEFORE (lower) ; the rest (holes) go last
INSERT_BEFORE = {
    'x1_barrow_floor': 'stone_floor', 'x1_barrow_flag': 'stone_floor', 'x1_barrow_runner': 'stone_floor',
    'x1_cellar_floor': 'stone_floor', 'x1_cellar_slate': 'stone_floor', 'x1_cellar_inlay': 'stone_floor',
    'x1_culvert_floor': 'stone_floor', 'x1_culvert_flag': 'stone_floor', 'x1_culvert_wet': 'stone_floor',
    'x1_pond_bed': 'water',
    'x1_moor_turf': 'moss', 'x1_peat': 'moss', 'x1_heath': 'plaza', 'x1_bracken': 'plaza', 'x1_orchard_turf': 'moss',
}
# order among the x1 ids that share a slot: later in this list = drawn above
SLOT_RANK = ['x1_barrow_floor', 'x1_barrow_flag', 'x1_barrow_runner', 'x1_cellar_floor', 'x1_cellar_slate', 'x1_cellar_inlay',
             'x1_culvert_floor', 'x1_culvert_flag', 'x1_culvert_wet', 'x1_moor_turf', 'x1_peat', 'x1_orchard_turf', 'x1_bracken', 'x1_heath']
MODULES = ['x1_kit', 'x1_land', 'x1_props', 'x1_mech', 'x1_wide', 'x1_bld', 'x1_bld2', 'x1_far']


def merged_order(base_order, x1_ids):
    """The terrainOrder the fragment asks for: base order with each x1 id inserted before its INSERT_BEFORE terrain;
    ids with no entry (the holes) go last."""
    out = list(base_order)
    for tid in sorted(x1_ids, key=lambda t: SLOT_RANK.index(t) if t in SLOT_RANK else 99):
        anchor = INSERT_BEFORE.get(tid)
        if anchor and anchor in out:
            out.insert(out.index(anchor), tid)
        else:
            out.append(tid)
    return out


def terrain_block(sh, fl, meta):
    x, y = sh.alloc(32, 48)
    sh.cv.paste(fl.block(), x, y)
    m = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A2', 'kind': getattr(fl, 'kind', 'fill'), 'collision': 'none',
         'variants': [], 'variantWeights': list(getattr(fl, 'weights', [4] + [2] * (fl.nvariants - 1)))}
    for v in range(fl.nvariants):
        if fl.nvariants == 1:
            break
        vx, vy = sh.alloc(16, 16)
        sh.cv.paste(fl.variant_tile(v), vx, vy)
        m['variants'].append([vx, vy])
    if not m['variants']:
        m.pop('variantWeights')
    meta['terrains'][fl.id] = m
    return m


def build():
    sh = Sheet(512, 3072)
    sh.meta.setdefault('terrains', {})
    sh.meta.setdefault('walls', {})
    sh.meta.setdefault('overlays', {})
    import x1_kit
    for fl in x1_kit.FLOORS:
        terrain_block(sh, fl, sh.meta)
    sh.newline()
    walls = sh.meta['walls']
    for sys_id, band, face, deep, out in x1_kit.WALLS:
        tx, ty = sh.alloc(32, 48)
        sh.cv.paste(band.block(), tx, ty)
        fx, fy = sh.alloc(32, 32)
        sh.cv.paste(face.block(), fx, fy)
        dx, dy = sh.alloc(32, 48)
        sh.cv.paste(deep.block(), dx, dy)
        ox, oy = sh.alloc(32, 32)
        sh.cv.paste(out.block(), ox, oy)
        tv = []
        for v in range(band.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(band.variant_tile(v), vx, vy)
            tv.append([vx, vy])
        dv = []
        for v in range(deep.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(deep.variant_tile(v), vx, vy)
            dv.append([vx, vy])
        walls[sys_id] = {'top': [tx, ty], 'face': [fx, fy], 'collision': 'solid',
                         'topVariants': tv, 'topVariantWeights': list(band.weights),
                         'note': 'X1 wall band (%s_top) and inner face (%s_face)' % (sys_id, sys_id)}
        walls[sys_id + '_out'] = {'top': [dx, dy], 'face': [ox, oy], 'collision': 'solid',
                                  'topVariants': dv, 'topVariantWeights': list(deep.weights),
                                  'note': 'the deep beyond the walls (%s_out_top, no edges) and the outer face under a '
                                          'band\'s south lip (%s_out_face)' % (sys_id, sys_id)}
        sh.newline()
    for sys_id, styles in x1_kit.FACE_STYLES.items():
        meta = walls[sys_id]
        out = []
        for st in styles:
            if st is None:
                out.append([list(meta['face'])])
                continue
            blocks = []
            for face in st:
                x, y = sh.alloc(32, 32)
                sh.cv.paste(face.block(), x, y)
                blocks.append([x, y])
            out.append(blocks)
        meta['faceStyles'] = out
        meta['faceStyleByMap'] = x1_kit.FACE_PLAN.get(sys_id, {})
        meta['note'] += '; faceStyles per room (tools/art/tiles/x1_kit.py)'
    sh.newline()
    import importlib
    for name in MODULES[1:]:
        try:
            mod = importlib.import_module(name)
        except ModuleNotFoundError as e:
            if e.name != name:
                raise
            continue
        mod.build_into(sh)
        sh.newline()
    return sh.cv.crop(0, 0, 512, sh.y), sh.meta


def fragment(meta):
    from terrain import TERRAIN_ORDER
    frag = {'version': 1, 'tileSize': 16, 'generator': 'next/tools/art/tiles/x1.py (python build_tiles.py x1)',
            'note': 'X1 pack tile fragment: merged into the live tile database by ensurePack; never appended to tiles.json. '
                    'terrainInsertBefore names the existing terrain each x1 terrain must be drawn below (see tools/art/tiles/x1.py).'}
    ids = list(meta.get('terrains', {}))
    order = merged_order(TERRAIN_ORDER, ids)
    frag['terrainOrder'] = ids
    frag['terrainInsertBefore'] = {t: INSERT_BEFORE[t] for t in ids if t in INSERT_BEFORE}
    for k in ('terrains', 'walls', 'tiles', 'objects', 'overlays'):
        d = {}
        for tid, v in meta.get(k, {}).items():
            v = dict(v)
            v.setdefault('sheet', SHEET)
            if k == 'terrains':
                v['order'] = order.index(tid)
            d[tid] = v
        frag[k] = d
    # props: every rect row above the footprint goes to the overhead layer (build_tiles.py does the same for tiles.json)
    for oid, v in frag['objects'].items():
        if v.get('kind') == 'prop' and v.get('footprint'):
            rows = v['rect'][3] // 16
            depth = 1 - min(dy for _, dy in v['footprint'])
            v['overheadRows'] = max(0, rows - depth)
    # overlays are also addressable as plain tiles
    for tid, v in frag['overlays'].items():
        frag['tiles'].setdefault(tid, v)
    return frag


def write(want=None):
    """Build the sheet, snap it to the palette, write assets/tiles/x1.png and x1_tiles.json. Returns (canvas, fragment)."""
    sheet, meta = build()
    n = snap_to_palette(sheet)
    sheet.save(os.path.join(TILES_DIR, SHEET))
    os.makedirs(os.path.join(OUT_DIR, 'x1'), exist_ok=True)
    sheet.save(os.path.join(OUT_DIR, 'x1', 'x1_x3.png'), 3)
    frag = fragment(meta)
    with open(os.path.join(TILES_DIR, FRAGMENT), 'w', newline='\n') as f:
        json.dump(frag, f, indent=1)
        f.write('\n')
    print('x1       %4d x %4d  (%d off-palette pixels snapped)  %d terrains %d walls %d tiles %d objects' % (
        sheet.w, sheet.h, n, len(frag['terrains']), len(frag['walls']), len(frag['tiles']), len(frag['objects'])))
    return sheet, frag


if __name__ == '__main__':
    write()
