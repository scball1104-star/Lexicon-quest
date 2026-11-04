"""The Sunken Keep pack tile sheet (E4-tiles, EPISODE4_PLAN 9.1) -> assets/tiles/ep4.png + assets/tiles/ep4_tiles.json.

A PACK sheet, like x1.png: never appended to tiles.json. The pack loader (src/game/packs.js mergeTileFragment) merges
ep4_tiles.json into the live tile database when the ep4 pack loads (ensurePack reads the json key `ep4_tiles` from
assets/ep4_manifest.json, written by `node qa/core/sync-manifest.mjs --pack ep4`).

    python build_tiles.py ep4       # builds this sheet (the ep4 line in build_tiles.py)
    python ep4.py                   # same
    python ep4_scenes.py            # contact sheet, mock rooms, phone crops, the flood_grey check (out/ep4/)

Modules, appended in this order so no earlier rect ever moves:
    ep4_kit.py     the three keep floors, three wall systems (+ _out) with per-room face styles, the canal kit
                   (canal_floor, canal_stair_*, ledge_face*, tide_water), flood_grass, mud_path, marble_walk
    ep4_props.py   the keep objects: tide_wheel, tide_post, pontoon, book_crate, seal_paper, floodgate, principle
                   stones, petition_gate, witness_lectern, door_seal, boat, throne_paper, glass_dome, lantern_chain,
                   font_tide, door_canal
    ep4_town.py    the Valewyn kit: prefabs (doorAt), the faceless statue, the flood board, sandbags, the great lock,
                   canal bridges, drowned roofs, the Emberpeak washout rope ladder, the valewyn_far decal

Palette: the sheet is snapped to assets/palette.json plus ep4_kit.EXTRA (four colours: two turquoise water tones, two
sealing-wax reds), the only colours the master palette cannot carry (reported by E4-tiles).

Terrain order: every ep4 floor is drawn below the holes (terrainInsertBefore, as x1 does): the keep floors and the canal
floor go before stone_floor (canal_floor last of them, so its weed edge sits on top), flood_grass before moss, mud_path
before grass... see INSERT_BEFORE. tide_water has no entry: it goes last (above every floor), like water and ink.
"""
import json, os, sys
import numpy as np
from pxlib import Canvas, TILES_DIR, OUT_DIR, PAL, hexc, _oklab
from kit import Sheet

SHEET = 'ep4.png'
FRAGMENT = 'ep4_tiles.json'
INSERT_BEFORE = {
    'causeway_floor': 'stone_floor', 'keep_archive_floor': 'stone_floor', 'witness_floor': 'stone_floor',
    'canal_floor': 'stone_floor', 'canal_floor_causeway': 'stone_floor',
    'mud_path': 'grass', 'flood_grass': 'moss', 'marble_walk': 'plaza',
}
SLOT_RANK = ['causeway_floor', 'keep_archive_floor', 'witness_floor', 'canal_floor', 'canal_floor_causeway', 'mud_path', 'flood_grass', 'marble_walk']
MODULES = ['ep4_props', 'ep4_town']


def merged_order(base_order, ids):
    out = list(base_order)
    for tid in sorted(ids, key=lambda t: SLOT_RANK.index(t) if t in SLOT_RANK else 99):
        anchor = INSERT_BEFORE.get(tid)
        if anchor and anchor in out:
            out.insert(out.index(anchor), tid)
        else:
            out.append(tid)
    return out


def snap(cv):
    """snap_to_palette with the four ep4 colours added. Translucent pixels (cast shadows) are left alone."""
    import ep4_kit
    hexes = list(dict.fromkeys(PAL['colors'] + ep4_kit.EXTRA))
    pal = np.array([hexc(h)[:3] for h in hexes], np.float64)
    pl = _oklab(pal)
    a = cv.a
    mask = a[:, :, 3] == 255
    px = a[mask][:, :3].astype(np.float64)
    if not len(px):
        return 0
    uniq, inv = np.unique(px, axis=0, return_inverse=True)
    d = ((_oklab(uniq)[:, None, :] - pl[None, :, :]) ** 2).sum(-1)
    near = pal[np.argmin(d, axis=1)]
    changed = int((np.abs(near - uniq).sum(1) > 0).sum())
    a[mask, :3] = near[inv.reshape(-1)].astype(np.uint8)
    return changed


def terrain_block(sh, fl, meta, frames=1, anim=None, extra=None):
    x, y = sh.alloc(32 * frames, 48)
    for fr in range(frames):
        sh.cv.paste(fl.block(fr), x + fr * 32, y)
    m = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A1' if frames > 1 else 'A2', 'kind': getattr(fl, 'kind', 'fill'),
         'collision': getattr(fl, 'collision', 'none'), 'variants': []}
    if anim:
        m['anim'] = anim
    nv = getattr(fl, 'nvariants', 1)
    if nv > 1:
        m['variantWeights'] = list(getattr(fl, 'weights', [4] + [2] * (nv - 1)))[:nv]
        for v in range(nv):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(fl.variant_tile(v), vx, vy)
            m['variants'].append([vx, vy])
    if extra:
        m.update(extra)
    meta['terrains'][fl.id] = m
    return m


def build():
    import ep4_kit
    sh = Sheet(512, 4096)
    sh.meta.setdefault('terrains', {})
    sh.meta.setdefault('walls', {})
    sh.meta.setdefault('overlays', {})
    STONE = {'causeway': ep4_kit.CAUSEWAY_STONE, 'witness': ep4_kit.WITNESS_STONE}
    FLOOR_STONE = {'causeway_floor': 'causeway', 'witness_floor': 'witness'}

    def restone(sys_id, *rects):
        if sys_id in STONE:
            for (x, y, w, h) in rects:
                ep4_kit.remap_rect(sh.cv, x, y, w, h, STONE[sys_id])
    for fl in ep4_kit.FLOORS:
        m = terrain_block(sh, fl, sh.meta)
        restone(FLOOR_STONE.get(fl.id), (m['x'], m['y'], 32, 48), *[(vx, vy, 16, 16) for vx, vy in m['variants']])
    sh.newline()
    walls = sh.meta['walls']
    for sys_id, band, face, deep, out in ep4_kit.WALLS:
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
        restone(sys_id, (tx, ty, 32, 48), (fx, fy, 32, 32), (dx, dy, 32, 48), (ox, oy, 32, 32),
                *[(vx, vy, 16, 16) for vx, vy in tv + dv])
        walls[sys_id] = {'top': [tx, ty], 'face': [fx, fy], 'collision': 'solid',
                         'topVariants': tv, 'topVariantWeights': list(band.weights),
                         'note': 'E4 keep wall band (%s_top) and inner face (%s_face); tide marks at face rows 18 '
                                 '(mark 2) and 26 (mark 1) of a 2-row face' % (sys_id, sys_id)}
        walls[sys_id + '_out'] = {'top': [dx, dy], 'face': [ox, oy], 'collision': 'solid',
                                  'topVariants': dv, 'topVariantWeights': list(deep.weights),
                                  'note': 'the deep beyond the walls (%s_out_top, no edges) and the outer face under a '
                                          'band\'s south lip (%s_out_face)' % (sys_id, sys_id)}
        sh.newline()
    for sys_id, styles in ep4_kit.FACE_STYLES.items():
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
                restone(sys_id, (x, y, 32, 32))
                blocks.append([x, y])
            out.append(blocks)
        meta['faceStyles'] = out
        meta['faceStyleByMap'] = ep4_kit.FACE_PLAN.get(sys_id, {})
        meta['note'] += '; faceStyles per room (tools/art/tiles/ep4_kit.py)'
    sh.newline()
    # canal kit
    for fl in ep4_kit.CANAL_TERRAINS:
        terrain_block(sh, fl, sh.meta, extra={'note': 'drained channel floor (height 0): pale wet stone, a weed line '
                                                      'along its edge; draw tide_water over it when flooded'})
    tw = ep4_kit.TideWater()
    terrain_block(sh, tw, sh.meta, frames=3, anim={'frames': [0, 1, 2, 1], 'frameDx': 32, 'ms': 240},
                  extra={'flow': 'tide', 'note': 'turquoise flood water (A1, 3 frames): drawn over every flooded cell; '
                                                 'dark band under a north bank, foam rim on the other edges'})
    sh.newline()
    for d in ('s', 'n', 'e', 'w'):
        sh.tile('canal_stair_' + d, ep4_kit.canal_stair(d), collision='none',
                note='three treads going down toward %s (connects two heights of a basin)' % {'s': 'the south', 'n': 'the north', 'e': 'the east', 'w': 'the west'}[d])
    for tid, marble, fn in (('ledge_face', False, ep4_kit.ledge_face_tile), ('ledge_face_marble', True, ep4_kit.ledge_face_tile),
                            ('ledge_lip', False, ep4_kit.ledge_lip_tile), ('ledge_lip_marble', True, ep4_kit.ledge_lip_tile)):
        strip = Canvas(128, 32)
        for i in range(16):
            strip.paste(fn(i, marble), (i % 8) * 16, (i // 8) * 16)
        x, y = sh.alloc(128, 32)
        sh.cv.paste(strip, x, y)
        if marble:
            restone('witness', (x, y, 128, 32))
        sh.meta['tiles'][tid] = {'x': x, 'y': y, 'w': 128, 'h': 32, 'collision': 'solid', 'autotile': 'line16',
                                 'note': ('the 1-tile drop face between two floor heights, the high floor to the NORTH '
                                          '(solid); line16 index N*1+E*2+S*4+W*8, only E and W change the art' if 'face' in tid
                                          else 'a solid stone kerb seen from above, for a height step facing north, east or '
                                               'west (no face visible); line16 index N*1+E*2+S*4+W*8, runs join toward set bits')
                                         + ('; marble for F3' if marble else '')}
    sh.newline()
    for fl in ep4_kit.FIELD_TERRAINS:
        terrain_block(sh, fl, sh.meta)
    sh.newline()
    import importlib
    for name in MODULES:
        try:
            mod = importlib.import_module(name)
        except ModuleNotFoundError as e:
            if e.name != name:
                raise
            continue
        mod.build_into(sh)
        sh.newline()
    # E4-fixes-B: F1's own kerbs and drop faces, the shared ledge strips in the causeway's grey-green stone (appended
    # last, so no earlier rect moves). ep4_keep_f1's legend names them.
    for tid, src in (('ledge_face_causeway', 'ledge_face'), ('ledge_lip_causeway', 'ledge_lip')):
        m = dict(sh.meta['tiles'][src])
        x, y = sh.alloc(128, 32)
        sh.cv.a[y:y + 32, x:x + 128] = sh.cv.a[m['y']:m['y'] + 32, m['x']:m['x'] + 128]
        restone('causeway', (x, y, 128, 32))
        m.update(x=x, y=y, note=m['note'] + '; F1 causeway stone (E4-fixes-B)')
        sh.meta['tiles'][tid] = m
    for d in ('s', 'n', 'e', 'w'):
        m = dict(sh.meta['tiles']['canal_stair_' + d])
        x, y = sh.alloc(16, 16)
        sh.cv.a[y:y + 16, x:x + 16] = sh.cv.a[m['y']:m['y'] + 16, m['x']:m['x'] + 16]
        restone('causeway', (x, y, 16, 16))
        m.update(x=x, y=y)
        sh.meta['tiles']['canal_stair_%s_causeway' % d] = m
    sh.newline()
    cf = type('CanalFloorCauseway', (type(ep4_kit.CANAL_TERRAINS[0]),), {'id': 'canal_floor_causeway'})()
    m = terrain_block(sh, cf, sh.meta, extra={'note': 'F1 drained channel floor in the causeway stone (E4-fixes-B)'})
    restone('causeway', (m['x'], m['y'], 32, 48), *[(vx, vy, 16, 16) for vx, vy in m['variants']])
    sh.newline()
    return sh.cv.crop(0, 0, 512, sh.y), sh.meta


def fragment(meta):
    from terrain import TERRAIN_ORDER
    frag = {'version': 1, 'tileSize': 16, 'generator': 'next/tools/art/tiles/ep4.py (python build_tiles.py ep4)',
            'note': 'Episode 4 (ep4 pack) tile fragment: merged into the live tile database by ensurePack; never appended '
                    'to tiles.json. terrainInsertBefore names the existing terrain each ep4 terrain is drawn below.',
            'extraColors': __import__('ep4_kit').EXTRA}
    ids = list(meta.get('terrains', {}))
    order = merged_order(TERRAIN_ORDER, ids)
    frag['terrainOrder'] = sorted(ids, key=lambda t: order.index(t))
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
    for oid, v in frag['objects'].items():
        if v.get('kind') == 'prop' and v.get('footprint'):
            rows = v['rect'][3] // 16
            depth = 1 - min(dy for _, dy in v['footprint'])
            v['overheadRows'] = max(0, rows - depth)
    for tid, v in frag['overlays'].items():
        frag['tiles'].setdefault(tid, v)
    return frag


def write():
    sheet, meta = build()
    n = snap(sheet)
    sheet.save(os.path.join(TILES_DIR, SHEET))
    os.makedirs(os.path.join(OUT_DIR, 'ep4'), exist_ok=True)
    sheet.save(os.path.join(OUT_DIR, 'ep4', 'ep4_x3.png'), 3)
    frag = fragment(meta)
    with open(os.path.join(TILES_DIR, FRAGMENT), 'w', newline='\n') as f:
        json.dump(frag, f, indent=1)
        f.write('\n')
    print('ep4      %4d x %4d  (%d off-palette colours snapped)  %d terrains %d walls %d tiles %d objects' % (
        sheet.w, sheet.h, n, len(frag['terrains']), len(frag['walls']), len(frag['tiles']), len(frag['objects'])))
    return sheet, frag


if __name__ == '__main__':
    write()
