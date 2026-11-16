"""The Last Word pack tile sheet (E8-tiles, EPISODE8_PLAN 9.1) -> assets/tiles/ep8.png + assets/tiles/ep8_tiles.json.

A PACK sheet, like ep7.png: never appended to tiles.json. The pack loader (src/game/packs.js mergeTileFragment) merges
ep8_tiles.json into the live tile database when the ep8 pack loads (ensurePack reads the json key `ep8_tiles` from
assets/ep8_manifest.json, written by `node qa/core/sync-manifest.mjs --pack ep8`).

    python build_tiles.py ep8       # builds this sheet (the ep8 line in build_tiles.py)
    python ep8.py                   # same
    python ep8_scenes.py            # contact sheets, mock rooms, phone crops, the contrast checks (out/ep8/)

Modules, appended in this order so no earlier rect ever moves:
    ep8_kit.py     the terrains (the void, the ink canal, the stair, the town floors, the three Library floors) and five
                   wall systems (+ _out) with per-room face styles
    ep8_props.py   the pop-up book kit (popbook, popbook_ew, popbook_realm, popbook_realm_ew, the seven realm models, the
                   page slices, the ghost recipe) and the Library objects (the fountain, the reading desk, the drawer
                   stack, the lift, the ink door, the great Lexicon, the first shelf, the star dome)
    ep8_town.py    the Scriptorium kit (book-tower prefabs with doorAt, the Living Codex, the Concordance folio, the
                   register house, the half-signs, the candle posts, the Library's great door, the canal bridge, the
                   South Margin arch, the canon decor) and the library_far and library_cliff decals (environments cell 7)

Palette: the sheet is snapped to assets/palette.json plus ep8_kit.EXTRA (fourteen colours: the void and its deep step,
a three-step page cream, a three-step lilac marble, the blank page and its rule, a four-step vellum grey), the only
colours the master palette cannot carry (reported by E8-tiles).

Terrain order: the void is the lowest terrain of all (inserted before the first core terrain), so it fills whole cells
and every floor over it draws its own lip and front face; the ep8 floors go below the holes (terrainInsertBefore
stone_floor, as ep6 and ep7 do); the ink canal has no entry and goes last.
"""
import json, os, sys
import numpy as np
from pxlib import Canvas, TILES_DIR, OUT_DIR, PAL, hexc, _oklab
from kit import Sheet

SHEET = 'ep8.png'
FRAGMENT = 'ep8_tiles.json'
VOID_RANK = ['void_violet']
FLOOR_RANK = ['script_step', 'marble_page', 'letterpath', 'scriptmosaic', 'parchment', 'vellum', 'blank_page',
              'goldscript']
SLOT_RANK = VOID_RANK + FLOOR_RANK
INSERT_BEFORE = dict({t: 'archive_floor' for t in VOID_RANK}, **{t: 'stone_floor' for t in FLOOR_RANK})
MODULES = ['ep8_props', 'ep8_town']
ANIM = {'frames': [0, 1, 2, 1], 'frameDx': 32, 'ms': 260}
VOID_ANIM = {'frames': [0, 1], 'frameDx': 32, 'ms': 2000}     # two identical flat frames: the motes are E8-world's layer


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
    import ep8_kit
    return list(dict.fromkeys(PAL['colors'] + ep8_kit.EXTRA))


def snap(cv):
    """snap_to_palette with the ep8 colours added. Translucent pixels (cast shadows, glows) are left alone."""
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
    'void_violet': 'the void of the Stair and the Library (A1, 2 identical flat frames, collision void): flat violet, no '
                   'edges, no texture, no grain, never walkable-looking and never Episode 7\'s white; the lowest terrain, so '
                   'every floor over it draws its own lip and front face. The slow gold motes are E8-world\'s layer',
    'ink_canal': 'the Scriptorium\'s ink canal (A1, 3 frames, collision water): black-violet ink, gold glints, a marble kerb',
    'script_step': 'the Stair of Written Light: each row a step of gold handwriting (glyph bars, never letters) on amber, a '
                   'riser shadow under it; at least 0.12 luma over the void',
    'marble_page': 'the Scriptorium\'s paving: lilac-white marble page-stones with ruled lines and grey veins',
    'letterpath': 'the script-road (Arun\'s candle posts stand along it): warm setts, a gold sett now and then',
    'scriptmosaic': 'the square round the Living Codex (variant 1: the gold star of the Codex ring)',
    'parchment': 'F1, the Catalog of Lost Lives: warm parchment squares, ink rules, gold seams',
    'goldscript': 'gold inlay script on dark amber (canon): F1\'s landings, the Stair\'s reading desk, the Last Word dais',
    'vellum': 'F2, the Palimpsest Galleries: grey vellum written over twice (the old lines faint under the new)',
    'blank_page': 'F3, the Unwritten Page: lavender-white blank pages, faint rules; at least 0.12 luma under the page cream',
}


def build():
    import ep8_kit
    sh = Sheet(512, 4096)
    sh.meta.setdefault('terrains', {})
    sh.meta.setdefault('walls', {})
    sh.meta.setdefault('overlays', {})
    for fl in ep8_kit.VOIDS:
        terrain_block(sh, fl, sh.meta, frames=2, anim=dict(VOID_ANIM), extra={'note': TERRAIN_NOTES[fl.id]})
    sh.newline()
    for fl in ep8_kit.FLOORS:
        terrain_block(sh, fl, sh.meta, extra={'note': TERRAIN_NOTES[fl.id]})
    sh.newline()
    for fl in ep8_kit.ANIMATED:
        terrain_block(sh, fl, sh.meta, frames=3, anim=dict(ANIM), extra={'flow': 'canal', 'note': TERRAIN_NOTES[fl.id]})
    sh.newline()
    walls = sh.meta['walls']
    for sys_id, band, face, deep, out in ep8_kit.WALLS:
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
                         'note': 'E8 wall band (%s_top) and inner face (%s_face), a 2-row face' % (sys_id, sys_id)}
        walls[sys_id + '_out'] = {'top': [dx, dy], 'face': [ox, oy], 'collision': 'solid',
                                  'topVariants': dv, 'topVariantWeights': list(deep.weights),
                                  'note': 'the beyond (%s_out_top, no edges) and the outer face under a band\'s south lip '
                                          '(%s_out_face)' % (sys_id, sys_id)}
        sh.newline()
    for sys_id, styles in ep8_kit.FACE_STYLES.items():
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
        meta['faceStyleByMap'] = ep8_kit.FACE_PLAN.get(sys_id, {})
        meta['note'] += '; faceStyles per room (tools/art/tiles/ep8_kit.py)'
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
    import ep8_kit
    frag = {'version': 1, 'tileSize': 16, 'generator': 'next/tools/art/tiles/ep8.py (python build_tiles.py ep8)',
            'note': 'Episode 8 (ep8 pack) tile fragment: merged into the live tile database by ensurePack; never appended '
                    'to tiles.json. terrainInsertBefore names the existing terrain each ep8 terrain is drawn below: the '
                    'void below every terrain, the floors below the holes; the ink canal last.',
            'extraColors': ep8_kit.EXTRA}
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
    os.makedirs(os.path.join(OUT_DIR, 'ep8'), exist_ok=True)
    sheet.save(os.path.join(OUT_DIR, 'ep8', 'ep8_x3.png'), 3)
    frag = fragment(meta)
    with open(os.path.join(TILES_DIR, FRAGMENT), 'w', newline='\n') as f:
        json.dump(frag, f, indent=1)
        f.write('\n')
    print('ep8      %4d x %4d  (%d off-palette colours snapped, %s)  %d terrains %d walls %d tiles %d objects  %d bytes' % (
        sheet.w, sheet.h, n, 'indexed' if indexed else 'RGBA', len(frag['terrains']), len(frag['walls']),
        len(frag['tiles']), len(frag['objects']), os.path.getsize(os.path.join(TILES_DIR, SHEET))))
    return sheet, frag


if __name__ == '__main__':
    write()
