"""The Vanishing World pack tile sheet (E7-tiles, EPISODE7_PLAN 9.1) -> assets/tiles/ep7.png + assets/tiles/ep7_tiles.json.

A PACK sheet, like ep6.png: never appended to tiles.json. The pack loader (src/game/packs.js mergeTileFragment) merges
ep7_tiles.json into the live tile database when the ep7 pack loads (ensurePack reads the json key `ep7_tiles` from
assets/ep7_manifest.json, written by `node qa/core/sync-manifest.mjs --pack ep7`).

    python build_tiles.py ep7       # builds this sheet (the ep7 line in build_tiles.py)
    python ep7.py                   # same
    python ep7_scenes.py            # contact sheets, mock rooms, phone crops, the contrast checks (out/ep7/)

Modules, appended in this order so no earlier rect ever moves:
    ep7_kit.py     the terrains (the fade, the lake, the ground, the three Vault floors, the held path) and four wall
                   systems (+ _out) with per-room face styles
    ep7_props.py   the name-stone kit (namestone, name_plate, frost_door) and the Vault objects (the Listening Bell, the
                   Stillheart, the round door, the page block, the star stair, the caches, the crates)
    ep7_town.py    the Palehaven kit (prefabs with doorAt, the Keeper's Watch, the hearth, the iced doors, the Vanishing
                   Mark, crystals, braziers, snow pines), the White Road kit (black pines, snow banks, the Traveler's
                   Wall, the Icegate, the waystation's post box, tally and stove) and the palehaven_far and
                   cathedral_far decals (environments cell 6)

Palette: the sheet is snapped to assets/palette.json plus ep7_kit.EXTRA (thirteen colours: a five-step snow ramp, the
fade's grain, a three-step packed ice, the ghost print, a three-step aurora green), the only colours the master palette
cannot carry (reported by E7-tiles). The Kestrel is Episode 6's prop (ep6_tiles.json): reused, never redefined here.

Terrain order: the fade is the lowest terrain of all (inserted before the first core terrain), so it fills whole cells
and every floor over it draws its own lip and front face; the ep7 floors go below the holes (terrainInsertBefore
stone_floor, as ep6 does), the held path the highest of them (it draws its own lip over snow); the frozen lake and the
open lead have no entry and go last.
"""
import json, os, sys
import numpy as np
from pxlib import Canvas, TILES_DIR, OUT_DIR, PAL, hexc, _oklab
from kit import Sheet

SHEET = 'ep7.png'
FRAGMENT = 'ep7_tiles.json'
VOID_RANK = ['fade']
FLOOR_RANK = ['permafrost', 'snowfield', 'icebrick', 'frostmosaic', 'frostbrick', 'letter_stone', 'nave_ice', 'iceglass',
              'icebridge', 'icepath']
SLOT_RANK = VOID_RANK + FLOOR_RANK
INSERT_BEFORE = dict({t: 'archive_floor' for t in VOID_RANK}, **{t: 'stone_floor' for t in FLOOR_RANK})
MODULES = ['ep7_props', 'ep7_town']
ANIM = {'frames': [0, 1, 2, 1], 'frameDx': 32, 'ms': 260}
FADE_ANIM = {'frames': [0, 1], 'frameDx': 32, 'ms': 1400}     # the slow paper grain (plan 5.1)


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
    import ep7_kit
    return list(dict.fromkeys(PAL['colors'] + ep7_kit.EXTRA))


def snap(cv):
    """snap_to_palette with the ep7 colours added. Translucent pixels (cast shadows, glows, frost haze) are left alone."""
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
    'fade': 'the void of every Episode 7 map (A1, 2 frames of a slow paper grain, collision void): flat paper white, no '
            'edges, no shading, no footprints, so it never reads as walkable snow; the lowest terrain, so every floor over '
            'it draws its own lip and front face. E7-world draws the ghost trail on unheld path cells over it',
    'lake_water': 'the frozen lake\'s open lead (A1, 3 frames, collision water): dark cold water, floes, an ice shelf where '
                  'it meets anything',
    'frozen_lake': 'the frozen lake (hole, collision none: the Kestrel lands on it): grey-blue ice, white cracks, a snow '
                   'bank shore',
    'permafrost': 'dark frozen ground, frost in the cracks (the Vault approach, under eaves)',
    'snowfield': 'textured snow ground (wind ripples, drift shadows, sparkle; variants footprints, a twig, a stone, a drift, '
                 'hare tracks); at least 0.1 luma below the fade on the phone crop',
    'icebrick': 'Palehaven\'s streets: ice-blue brick paving, snow in the joints',
    'frostmosaic': 'the town square\'s mosaic (variant 1: the aurora-green star inlay for the hearth ring)',
    'frostbrick': 'F1\'s floor: frost-rimed pale blue brick in running bond (over the fade: never flat white)',
    'letter_stone': 'F2\'s floor: dark flagstones with carved letter niches (the lamp pools are the lighting layer\'s)',
    'nave_ice': 'F3\'s floor: the nave\'s cool white slabs with pillar shadows (variants), the lightest floor under the '
                'aurora tint',
    'iceglass': 'F1\'s landings: clear ice with depth, frozen bubbles, a sheen; a thick blue cut edge over the fade',
    'icebridge': 'an ice span: long slabs, a worn line, a thick arch front',
    'icepath': 'a held path (drawn by E7-world on every held path cell over the fade) and the White Road on firm ground: '
               'packed blue-white ice with a line of footprints; at least 0.2 luma below the fade, textured',
}


def build():
    import ep7_kit
    sh = Sheet(512, 4096)
    sh.meta.setdefault('terrains', {})
    sh.meta.setdefault('walls', {})
    sh.meta.setdefault('overlays', {})
    for fl in ep7_kit.VOIDS:
        terrain_block(sh, fl, sh.meta, frames=2, anim=dict(FADE_ANIM), extra={'note': TERRAIN_NOTES[fl.id]})
    sh.newline()
    for fl in ep7_kit.FLOORS:
        terrain_block(sh, fl, sh.meta, extra={'note': TERRAIN_NOTES[fl.id]})
    sh.newline()
    for fl in ep7_kit.HOLES:
        terrain_block(sh, fl, sh.meta, extra={'note': TERRAIN_NOTES[fl.id]})
    for fl in ep7_kit.ANIMATED:
        terrain_block(sh, fl, sh.meta, frames=3, anim=dict(ANIM), extra={'flow': 'lake', 'note': TERRAIN_NOTES[fl.id]})
    sh.newline()
    walls = sh.meta['walls']
    for sys_id, band, face, deep, out in ep7_kit.WALLS:
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
                         'note': 'E7 wall band (%s_top) and inner face (%s_face), a 2-row face' % (sys_id, sys_id)}
        walls[sys_id + '_out'] = {'top': [dx, dy], 'face': [ox, oy], 'collision': 'solid',
                                  'topVariants': dv, 'topVariantWeights': list(deep.weights),
                                  'note': 'the beyond (%s_out_top, no edges) and the outer face under a band\'s south lip '
                                          '(%s_out_face)' % (sys_id, sys_id)}
        sh.newline()
    for sys_id, styles in ep7_kit.FACE_STYLES.items():
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
        meta['faceStyleByMap'] = ep7_kit.FACE_PLAN.get(sys_id, {})
        meta['note'] += '; faceStyles per room (tools/art/tiles/ep7_kit.py)'
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
    import ep7_kit
    frag = {'version': 1, 'tileSize': 16, 'generator': 'next/tools/art/tiles/ep7.py (python build_tiles.py ep7)',
            'note': 'Episode 7 (ep7 pack) tile fragment: merged into the live tile database by ensurePack; never appended '
                    'to tiles.json. terrainInsertBefore names the existing terrain each ep7 terrain is drawn below: the '
                    'fade below every terrain, the floors below the holes. The Kestrel is the ep6 fragment\'s prop.',
            'extraColors': ep7_kit.EXTRA}
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
    os.makedirs(os.path.join(OUT_DIR, 'ep7'), exist_ok=True)
    sheet.save(os.path.join(OUT_DIR, 'ep7', 'ep7_x3.png'), 3)
    frag = fragment(meta)
    with open(os.path.join(TILES_DIR, FRAGMENT), 'w', newline='\n') as f:
        json.dump(frag, f, indent=1)
        f.write('\n')
    print('ep7      %4d x %4d  (%d off-palette colours snapped, %s)  %d terrains %d walls %d tiles %d objects  %d bytes' % (
        sheet.w, sheet.h, n, 'indexed' if indexed else 'RGBA', len(frag['terrains']), len(frag['walls']),
        len(frag['tiles']), len(frag['objects']), os.path.getsize(os.path.join(TILES_DIR, SHEET))))
    return sheet, frag


if __name__ == '__main__':
    write()
