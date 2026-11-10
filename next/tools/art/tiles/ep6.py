"""The Skybound Isles pack tile sheet (E6-tiles, EPISODE6_PLAN 9.1) -> assets/tiles/ep6.png + assets/tiles/ep6_tiles.json.

A PACK sheet, like ep5.png: never appended to tiles.json. The pack loader (src/game/packs.js mergeTileFragment) merges
ep6_tiles.json into the live tile database when the ep6 pack loads (ensurePack reads the json key `ep6_tiles` from
assets/ep6_manifest.json, written by `node qa/core/sync-manifest.mjs --pack ep6`).

    python build_tiles.py ep6       # builds this sheet (the ep6 line in build_tiles.py)
    python ep6.py                   # same
    python ep6_scenes.py            # contact sheets, mock rooms, phone crops, the contrast checks (out/ep6/)

Modules, appended in this order so no earlier rect ever moves:
    ep6_kit.py     the terrains (the cloud and storm voids, the lane beds, the decks and floors, the sea at the foot) and
                   four wall systems (+ _out) with per-room face styles
    ep6_props.py   the gust-lane kit (vanes, fan vanes, mooring posts, the streak frames, the chevrons) and the Observatory
                   objects (lamps, relays, tubes, the keyhole, the desk, the quills, the banners, the shelf...)
    ep6_town.py    the Zephyr Landing kit (prefabs with doorAt, the board, the chimes, the post rack, the beacon, the
                   Kestrel, docks, gardens) and the Airstair kit (rope stairs, the great chain), the isles_far and
                   storm_far decals

Palette: the sheet is snapped to assets/palette.json plus ep6_kit.EXTRA (thirteen colours: three cloud shades, one peach,
a five-step storm slate, a four-step brass), the only colours the master palette cannot carry (reported by E6-tiles).

Terrain order: the voids (cloudbank, storm_cloud, duct_shaft) are the lowest terrains of all (inserted before the first
core terrain), so they fill whole cells and every floor over them draws its own lip and front face; the ep6 floors go below
the holes (terrainInsertBefore stone_floor, as ep5 does); the A1 lane beds and the sea have no entry and go last.
"""
import json, os, sys
import numpy as np
from pxlib import Canvas, TILES_DIR, OUT_DIR, PAL, hexc, _oklab
from kit import Sheet

SHEET = 'ep6.png'
FRAGMENT = 'ep6_tiles.json'
VOID_RANK = ['cloudbank', 'storm_cloud', 'duct_shaft']
FLOOR_RANK = ['relay_grate', 'spire_stone', 'skyport_paving', 'skybridge', 'stormglass', 'skyplank', 'skywalk']
SLOT_RANK = VOID_RANK + FLOOR_RANK
INSERT_BEFORE = dict({t: 'archive_floor' for t in VOID_RANK}, **{t: 'stone_floor' for t in FLOOR_RANK})
MODULES = ['ep6_props', 'ep6_town']
ANIM = {'frames': [0, 1, 2, 1], 'frameDx': 32, 'ms': 260}


def merged_order(base_order, ids):
    out = list(base_order)
    for tid in sorted(ids, key=lambda t: SLOT_RANK.index(t) if t in SLOT_RANK else 99):
        anchor = INSERT_BEFORE.get(tid)
        if anchor and anchor in out:
            out.insert(out.index(anchor), tid)
        else:
            out.append(tid)
    return out


def palette_hexes():
    import ep6_kit
    return list(dict.fromkeys(PAL['colors'] + ep6_kit.EXTRA))


def snap(cv):
    """snap_to_palette with the ep6 colours added. Translucent pixels (cast shadows, glows, wind streaks) are left alone."""
    pal = np.array([hexc(h)[:3] for h in palette_hexes()], np.float64)
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
    if nv > 1 and frames == 1:
        m['variantWeights'] = list(getattr(fl, 'weights', [4] + [2] * (nv - 1)))[:nv]
        for v in range(nv):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(fl.variant_tile(v), vx, vy)
            m['variants'].append([vx, vy])
    if extra:
        m.update(extra)
    meta['terrains'][fl.id] = m
    return m


TERRAIN_NOTES = {
    'cloudbank': 'the void of every open map (A1, 3 frames, collision void): sunlit cumulus in sky blue and peach; the lowest '
                 'terrain, so every floor over it draws its own lip and front face',
    'storm_cloud': 'F3 and the Eyrie\'s void (A1, 3 frames, collision void): the cloudbank\'s puffs in storm slate',
    'duct_shaft': 'F2\'s dark shaft (collision void): the void under the grilles and duct lanes',
    'skyplank': 'deck planks (honey timber, brass nails) with a 3 px plank-end front over the void',
    'skywalk': 'a rope bridge (A1, 3 frames: the slats sway): slats with sky between, rope rails on the open sides',
    'stormglass': 'F1\'s pale blue glass panes in brass frames (darker and gridded: never cloud)',
    'skybridge': 'a pale stone span with a worn path and a thick arch front',
    'skyport_paving': 'the plaza of Zephyr Landing: big pale flagstones, cool joints, a brass compass inlay (a variant)',
    'relay_grate': 'F2\'s floor: brass grating over the dark, rivets, oil glints',
    'spire_stone': 'F3\'s white stone in curved courses (the lightest floor under the storm tint)',
}


def build():
    import ep6_kit
    sh = Sheet(512, 4096)
    sh.meta.setdefault('terrains', {})
    sh.meta.setdefault('walls', {})
    sh.meta.setdefault('overlays', {})
    for fl in ep6_kit.VOIDS:
        terrain_block(sh, fl, sh.meta, frames=3, anim=dict(ANIM), extra={'note': TERRAIN_NOTES[fl.id]})
    sh.newline()
    for fl in ep6_kit.FLOORS:
        terrain_block(sh, fl, sh.meta, extra={'note': TERRAIN_NOTES[fl.id]})
    sh.newline()
    sw, gl, gd, sf = ep6_kit.ANIMATED
    terrain_block(sh, sw, sh.meta, frames=3, anim=dict(ANIM), extra={'note': TERRAIN_NOTES['skywalk']})
    terrain_block(sh, gl, sh.meta, frames=3, anim=dict(ANIM),
                  extra={'flow': 'wind', 'note': 'the gust lane bed (A1, 3 frames, collision void): a sky-blue channel cut '
                                                 'through the cloud with soft banks where the next cell is not a lane; '
                                                 'drawn by E6-world over cloudbank on every LIVE lane cell (calm cells stay '
                                                 'plain cloud); the shimmer points nowhere: the movement is the '
                                                 'gust_streak object (frames by direction) and the chevrons (code)'})
    sh.newline()
    terrain_block(sh, gd, sh.meta, frames=3, anim=dict(ANIM),
                  extra={'flow': 'wind', 'note': 'the indoor lane bed (F2 ducts, A1, collision void): a brass grille over '
                                                 'the dark shaft, wind light glinting through; drawn over duct_shaft on '
                                                 'every live duct cell, the streaks and chevrons on top'})
    terrain_block(sh, sf, sh.meta, frames=3, anim=dict(ANIM),
                  extra={'flow': 'sea', 'note': 'the sea at the Airstair\'s foot (A1, collision water): surf breaking white '
                                                'on whatever it meets'})
    sh.newline()
    walls = sh.meta['walls']
    for sys_id, band, face, deep, out in ep6_kit.WALLS:
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
                         'note': 'E6 wall band (%s_top) and inner face (%s_face), a 2-row face' % (sys_id, sys_id)}
        walls[sys_id + '_out'] = {'top': [dx, dy], 'face': [ox, oy], 'collision': 'solid',
                                  'topVariants': dv, 'topVariantWeights': list(deep.weights),
                                  'note': 'the beyond (%s_out_top, no edges) and the outer face under a band\'s south lip '
                                          '(%s_out_face)' % (sys_id, sys_id)}
        sh.newline()
    for sys_id, styles in ep6_kit.FACE_STYLES.items():
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
        meta['faceStyleByMap'] = ep6_kit.FACE_PLAN.get(sys_id, {})
        meta['note'] += '; faceStyles per room (tools/art/tiles/ep6_kit.py)'
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
    return sh.cv.crop(0, 0, 512, sh.y), sh.meta


def fragment(meta):
    from terrain import TERRAIN_ORDER
    import ep6_kit
    frag = {'version': 1, 'tileSize': 16, 'generator': 'next/tools/art/tiles/ep6.py (python build_tiles.py ep6)',
            'note': 'Episode 6 (ep6 pack) tile fragment: merged into the live tile database by ensurePack; never appended '
                    'to tiles.json. terrainInsertBefore names the existing terrain each ep6 terrain is drawn below: the '
                    'voids below every terrain, the floors below the holes.',
            'extraColors': ep6_kit.EXTRA}
    ids = list(meta.get('terrains', {}))
    order = merged_order(TERRAIN_ORDER, ids)
    frag['terrainOrder'] = sorted(ids, key=lambda t: order.index(t))
    frag['terrainInsertBefore'] = {t: INSERT_BEFORE[t] for t in SLOT_RANK if t in ids}
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


def save_indexed(cv, path):
    """Save as a palette PNG with a tRNS chunk (every colour, alpha included, kept exactly). Falls back to RGBA past 256
    colours."""
    from PIL import Image
    im = cv.image()
    cols = im.getcolors(256)
    if not cols:
        im.save(path, optimize=True)
        return False
    pal = sorted(c for _, c in cols)
    idx = {c: i for i, c in enumerate(pal)}
    a = np.asarray(im).reshape(-1, 4)
    keys = a[:, 0].astype(np.uint32) << 24 | a[:, 1].astype(np.uint32) << 16 | a[:, 2].astype(np.uint32) << 8 | a[:, 3]
    lut = {(r << 24) | (g << 16) | (b << 8) | al: i for (r, g, b, al), i in idx.items()}
    data = np.array([lut[int(k)] for k in keys], np.uint8).reshape(cv.h, cv.w)
    p = Image.fromarray(data, 'P')
    flat = []
    for c in pal:
        flat.extend(c[:3])
    p.putpalette(flat)
    p.save(path, optimize=True, transparency=bytes(c[3] for c in pal))
    return True


def write():
    sheet, meta = build()
    n = snap(sheet)
    indexed = save_indexed(sheet, os.path.join(TILES_DIR, SHEET))
    os.makedirs(os.path.join(OUT_DIR, 'ep6'), exist_ok=True)
    sheet.save(os.path.join(OUT_DIR, 'ep6', 'ep6_x3.png'), 3)
    frag = fragment(meta)
    with open(os.path.join(TILES_DIR, FRAGMENT), 'w', newline='\n') as f:
        json.dump(frag, f, indent=1)
        f.write('\n')
    print('ep6      %4d x %4d  (%d off-palette colours snapped, %s)  %d terrains %d walls %d tiles %d objects  %d bytes' % (
        sheet.w, sheet.h, n, 'indexed' if indexed else 'RGBA', len(frag['terrains']), len(frag['walls']),
        len(frag['tiles']), len(frag['objects']), os.path.getsize(os.path.join(TILES_DIR, SHEET))))
    return sheet, frag


if __name__ == '__main__':
    write()
