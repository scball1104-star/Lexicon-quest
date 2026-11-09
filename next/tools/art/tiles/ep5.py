"""The Last Prophecy pack tile sheet (E5-tiles, EPISODE5_PLAN 9.1) -> assets/tiles/ep5.png + assets/tiles/ep5_tiles.json.

A PACK sheet, like ep4.png: never appended to tiles.json. The pack loader (src/game/packs.js mergeTileFragment) merges
ep5_tiles.json into the live tile database when the ep5 pack loads (ensurePack reads the json key `ep5_tiles` from
assets/ep5_manifest.json, written by `node qa/core/sync-manifest.mjs --pack ep5`).

    python build_tiles.py ep5       # builds this sheet (the ep5 line in build_tiles.py)
    python ep5.py                   # same
    python ep5_scenes.py            # contact sheets, mock rooms, phone crops, the contrast checks (out/ep5/)

Modules, appended in this order so no earlier rect ever moves:
    ep5_kit.py     the terrains (dune_sand, caravan_paving, groove, the Labyrinth floors, star_glass, deck_planks),
                   running_sand and night_sea (A1), three wall systems (+ _out) with per-room face styles
    ep5_props.py   the sun and shade kit and the Labyrinth objects (sundial, casters, plates, gates, windows, lamps,
                   springs, the Sun Keyhole, the oracle ring, the feather...)
    ep5_town.py    the Saffron Haven kit (prefabs with doorAt, the armillary, waystone, bulletin, Moonwell, mural, market),
                   the road's camp and tent, the haven_far decal
    ep5_ship.py    the Saffron Wind's deck kit and the moored ship prop

Palette: the sheet is snapped to assets/palette.json plus ep5_kit.EXTRA (seven colours: three dune ochres and a neutral
basalt ramp), the only colours the master palette cannot carry (reported by E5-tiles).

Terrain order: every ep5 floor is drawn below the holes (terrainInsertBefore, as ep4 does): paving lowest, then the
Labyrinth floors and the deck, then the groove (above every floor it is cut into: a lowest layer is drawn whole, so a groove
below its floor would fill its cell with rut), and dune_sand on top of them all (so sand drifts over a floor's edge and
pavement cells stay clean). running_sand and night_sea have no entry: they go last (above every floor), like tide_water.
"""
import json, os, sys
import numpy as np
from pxlib import Canvas, TILES_DIR, OUT_DIR, PAL, hexc, _oklab
from kit import Sheet

SHEET = 'ep5.png'
FRAGMENT = 'ep5_tiles.json'
SLOT_RANK = ['caravan_paving', 'dune_court', 'gallery_tile', 'well_basalt', 'star_glass', 'deck_planks', 'groove', 'dune_sand']
INSERT_BEFORE = {t: 'stone_floor' for t in SLOT_RANK}
MODULES = ['ep5_props', 'ep5_town', 'ep5_ship']


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
    import ep5_kit
    return list(dict.fromkeys(PAL['colors'] + ep5_kit.EXTRA))


def snap(cv):
    """snap_to_palette with the ep5 colours added. Translucent pixels (cast shadows, glows) are left alone."""
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


TERRAIN_NOTES = {
    'dune_sand': 'firm sand (still ochre ripples): the ground layer of every sand cell; E5-world draws running_sand over '
                 'the lit ones and the violet shade over the shaded ones',
    'caravan_paving': 'sandstone pavement, the safe ground of a shade puzzle (dials, plate approaches, starts)',
    'groove': 'a worn rut in the paving: a Shove-able caster or lamp slides only along groove cells (legend id groove)',
    'dune_court': 'F1 the Shifting Dunes: terracotta-ochre flagstones, sand in the joints',
    'gallery_tile': 'F2 the Gallery of False Horizons: lapis tiles in a gold lattice',
    'well_basalt': 'F3 the Well of Tomorrow: dark basalt columns with star-glass seams',
    'star_glass': 'deep blue glass full of stars: the Eye of the Oracle and F2\'s Star Floor',
    'deck_planks': 'the Saffron Wind\'s deck planks',
}


def build():
    import ep5_kit
    sh = Sheet(512, 4096)
    sh.meta.setdefault('terrains', {})
    sh.meta.setdefault('walls', {})
    sh.meta.setdefault('overlays', {})
    for fl in ep5_kit.FLOORS:
        terrain_block(sh, fl, sh.meta, extra={'note': TERRAIN_NOTES.get(fl.id, '')})
    sh.newline()
    rs, ns = ep5_kit.ANIMATED
    terrain_block(sh, rs, sh.meta, frames=3, anim={'frames': [0, 1, 2], 'frameDx': 32, 'ms': 150},
                  extra={'flow': 'sand', 'note': 'running sand (A1, 3 frames, collision water): drawn over every LIT sand '
                                                 'cell; gold streaks flow down-right, a dithered glow spills onto the '
                                                 'cell edge (translucent pixels: draw it over dune_sand)'})
    terrain_block(sh, ns, sh.meta, frames=3, anim={'frames': [0, 1, 2, 1], 'frameDx': 32, 'ms': 320},
                  extra={'flow': 'sea', 'note': 'the night sea at the ship\'s edges (decor water, collision water)'})
    sh.newline()
    walls = sh.meta['walls']
    for sys_id, band, face, deep, out in ep5_kit.WALLS:
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
                         'note': 'E5 wall band (%s_top) and inner face (%s_face), a 2-row face' % (sys_id, sys_id)}
        walls[sys_id + '_out'] = {'top': [dx, dy], 'face': [ox, oy], 'collision': 'solid',
                                  'topVariants': dv, 'topVariantWeights': list(deep.weights),
                                  'note': 'the beyond (%s_out_top, no edges) and the outer face under a band\'s south lip '
                                          '(%s_out_face)' % (sys_id, sys_id)}
        sh.newline()
    for sys_id, styles in ep5_kit.FACE_STYLES.items():
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
        meta['faceStyleByMap'] = ep5_kit.FACE_PLAN.get(sys_id, {})
        meta['note'] += '; faceStyles per room (tools/art/tiles/ep5_kit.py)'
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
    import ep5_kit
    frag = {'version': 1, 'tileSize': 16, 'generator': 'next/tools/art/tiles/ep5.py (python build_tiles.py ep5)',
            'note': 'Episode 5 (ep5 pack) tile fragment: merged into the live tile database by ensurePack; never appended '
                    'to tiles.json. terrainInsertBefore names the existing terrain each ep5 terrain is drawn below.',
            'extraColors': ep5_kit.EXTRA}
    ids = list(meta.get('terrains', {}))
    order = merged_order(TERRAIN_ORDER, ids)
    frag['terrainOrder'] = sorted(ids, key=lambda t: order.index(t))
    # in SLOT_RANK order: the loader moves each id to just before its anchor in key order, so the key order IS the
    # stacking order (lowest first)
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
    """Save as a palette PNG with a tRNS chunk (every colour, alpha included, kept exactly): about half the bytes of
    RGBA for a sheet this flat. Falls back to RGBA past 256 colours."""
    from PIL import Image
    im = cv.image()
    cols = im.getcolors(256)
    if not cols:
        im.save(path, optimize=True)
        return
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


def write():
    sheet, meta = build()
    n = snap(sheet)
    save_indexed(sheet, os.path.join(TILES_DIR, SHEET))
    os.makedirs(os.path.join(OUT_DIR, 'ep5'), exist_ok=True)
    sheet.save(os.path.join(OUT_DIR, 'ep5', 'ep5_x3.png'), 3)
    frag = fragment(meta)
    with open(os.path.join(TILES_DIR, FRAGMENT), 'w', newline='\n') as f:
        json.dump(frag, f, indent=1)
        f.write('\n')
    print('ep5      %4d x %4d  (%d off-palette colours snapped)  %d terrains %d walls %d tiles %d objects  %d bytes' % (
        sheet.w, sheet.h, n, len(frag['terrains']), len(frag['walls']), len(frag['tiles']), len(frag['objects']),
        os.path.getsize(os.path.join(TILES_DIR, SHEET))))
    return sheet, frag


if __name__ == '__main__':
    write()
