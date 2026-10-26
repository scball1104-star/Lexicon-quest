"""X1-tiles preview scenes (the mocks the critics see), rendered with the real autotile rules (compose.py) and the pack fragment
merged the way the pack loader does (x1_preview.py), at 3x, plus phone-scale crops.

    python x1_scenes.py                 # every scene -> out/x1/<name>_3x.png (+ _x1.png)
    python x1_scenes.py barrow_hall     # one scene
"""
import os, sys, json
import numpy as np
from PIL import Image
from pxlib import Canvas, OUT_DIR
import e2_scenes
import x1_preview as P

SC = {}


def scene(fn):
    SC[fn.__name__] = fn
    return fn


def grid(W, H, ch='.'):
    return [[ch] * W for _ in range(H)]


def rect(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= y < len(g) and 0 <= x < len(g[0]):
                g[y][x] = ch


def blob(g, cx, cy, rx, ry, ch, seed=1, only=None):
    """A wobbly ellipse of `ch` (organic patches: heath, tarn, pond bed). only = chars it may overwrite."""
    import math
    from pxlib import h32
    for y in range(int(cy - ry) - 2, int(cy + ry) + 3):
        for x in range(int(cx - rx) - 2, int(cx + rx) + 3):
            if not (0 <= y < len(g) and 0 <= x < len(g[0])):
                continue
            a = math.atan2(y - cy, x - cx)
            wob = 1.0 + 0.22 * math.sin(a * 3 + seed) + 0.12 * math.sin(a * 5 + seed * 2.3)
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            if d <= wob and (only is None or g[y][x] in only):
                g[y][x] = ch


def done(g):
    return [''.join(r) for r in g]


HERO = lambda x, y, d='right', who='hero': {'x': x, 'y': y, 'who': who, 'dir': d}


def dungeon_scene(name, sys_id, legend_floor, g, extra_legend, under):
    rows = e2_scenes.depth(g)
    legend = {'#': sys_id + '_top', '|': sys_id + '_face', 'o': sys_id + '_out_face', 'v': sys_id + '_out_top', '.': legend_floor}
    legend.update(extra_legend or {})
    return {'name': name, 'map': sys_id, 'legend': legend, 'ground': rows, 'under': under,
            'decor': [], 'overlays': [], 'actors': [], 'overhead': []}


# ---------------------------------------------------------------------------- the Barrow's Long Hall
@scene
def barrow_hall(slab='mixed', plate_down=True, name='barrow_hall'):
    """Plan 4.3 B and E: the Long Hall (a corridor, two sliding slabs, the floor switch, a block), the ewe chamber behind slab_n on a
    wool runner, the ossuary behind slab_s, the Counting Room's light block, its plate and the barred gate, on x1_barrow_floor and
    x1_barrow_flag."""
    W, H = 34, 24
    g = e2_scenes.carve(W, H, [
        (1, 9, 32, 11, '.', 2),            # the Long Hall
        (8, 2, 15, 4, 'a', 1),             # the ewe chamber (north)
        (17, 15, 28, 17, '.', 1),          # the ossuary (south)
        (22, 2, 31, 5, 'a', 1),            # the Counting Room (right)
    ])
    rect(g, 12, 5, 13, 8, '.')             # the north doorway through the band and the face
    rect(g, 20, 12, 21, 14, '.')           # the south doorway
    rect(g, 24, 6, 25, 8, '.')
    sc = dungeon_scene(name, 'x1_barrow', 'x1_barrow_floor', g, {'a': 'x1_barrow_flag', 'r': 'x1_barrow_runner'}, 'x1_barrow_floor')
    rr = [list(r) for r in sc['ground']]
    for y in range(2, 5):
        for x in range(9, 15):
            if rr[y][x] == 'a':
                rr[y][x] = 'r'
    sc['ground'] = [''.join(r) for r in rr]
    D, ov = sc['decor'], sc['overlays']
    # slab_n (12, 8): closed; slab_s (20, 14): open, slid into the right pocket
    D.append({'t': 'x1_slab_doorway', 'x': 10, 'y': 8})
    D.append({'t': 'x1_slab', 'x': 12, 'y': 8} if slab in ('closed', 'mixed') else {'t': 'x1_slab', 'x': 14, 'y': 8})
    D.append({'t': 'x1_slab_doorway', 'x': 18, 'y': 13})
    D.append({'t': 'x1_slab', 'x': 22, 'y': 13})
    D += [{'t': 'brazier_lit', 'x': 3, 'y': 11}, {'t': 'brazier_lit', 'x': 30, 'y': 11},
          {'t': 'push_block', 'x': 24, 'y': 10}, {'t': 'push_block', 'x': 11, 'y': 3},
          {'t': 'x1_boulder_a', 'x': 29, 'y': 16}, {'t': 'x1_haybale', 'x': 18, 'y': 16}]
    ov.append({'t': 'switch_on' if slab == 'open' else 'switch_off', 'x': 15, 'y': 10})
    ov.append({'t': 'plate_down' if plate_down else 'plate_up', 'x': 27, 'y': 4})
    D.append({'t': 'x1_gate_barrow_closed', 'x': 24, 'y': 7})
    D.append({'t': 'push_block', 'x': 27, 'y': 4} if plate_down else {'t': 'push_block', 'x': 25, 'y': 3})
    sc['actors'] = [HERO(6, 10, 'right'), HERO(5, 10, 'right', 'mira'), HERO(4, 10, 'right', 'bram')]
    return sc


@scene
def barrow_hall_open():
    return barrow_hall(slab='open', plate_down=True, name='barrow_hall_open')


# ---------------------------------------------------------------------------- the Cellar's Constellation floor
@scene
def cellar_floor(revealed=True, name='cellar_floor'):
    """Plan 4.6 C: a pit field, a zigzag of ink bridge cells (the first half revealed), the dais with the star inlay."""
    W, H = 30, 16
    g = e2_scenes.carve(W, H, [(2, 4, 27, 13, '.', 2)])
    rect(g, 6, 6, 23, 11, 'p')
    rect(g, 22, 5, 25, 8, 'i')
    rect(g, 2, 12, 5, 13, 'a')
    sc = dungeon_scene(name, 'x1_cellar', 'x1_cellar_floor', g,
                       {'p': 'pit', 'i': 'x1_cellar_inlay', 'a': 'x1_cellar_slate'}, 'x1_cellar_floor')
    path = [(6, 9), (7, 9), (8, 9), (8, 10), (9, 10), (10, 10), (10, 9), (10, 8), (11, 8), (12, 8), (12, 7), (13, 7), (14, 7), (14, 8), (15, 8),
            (16, 8), (16, 9), (17, 9), (18, 9), (18, 8), (19, 8), (20, 8), (21, 8)]
    for i, (x, y) in enumerate(path):
        vert = (i > 0 and path[i - 1][0] == x) or (i + 1 < len(path) and path[i + 1][0] == x)
        kind = 'v' if vert else 'h'
        state = 'revealed' if (revealed and i < 13) else 'faint'
        sc['overlays'].append({'t': 'ink_bridge_%s_%s' % (kind, state), 'x': x, 'y': y})
    sc['decor'] += [{'t': 'chest_gold', 'x': 24, 'y': 6}, {'t': 'x1_armillary_statue', 'x': 3, 'y': 6},
                    {'t': 'brazier_lit', 'x': 3, 'y': 11}, {'t': 'brazier_lit', 'x': 26, 'y': 11}]
    sc['actors'] = [HERO(5, 9, 'right'), HERO(4, 9, 'right', 'mira')]
    return sc


# ---------------------------------------------------------------------------- the Culvert's Drain Hall
@scene
def culvert_hall():
    W, H = 34, 18
    g = e2_scenes.carve(W, H, [(1, 6, 32, 10, '.', 2), (3, 12, 12, 14, 'a', 1), (26, 12, 31, 14, 'a', 1)])
    rect(g, 6, 11, 7, 11, '.')
    rect(g, 27, 11, 28, 11, '.')
    rect(g, 14, 8, 20, 9, 'w')
    sc = dungeon_scene('culvert_hall', 'x1_culvert', 'x1_culvert_floor', g,
                       {'a': 'x1_culvert_flag', 'w': 'x1_culvert_wet'}, 'x1_culvert_floor')
    D, ov = sc['decor'], sc['overlays']
    for x in (9, 10, 11, 22, 23, 24):
        ov.append({'t': 'x1_drain_grate' if x % 2 else 'x1_drain_grate_b', 'x': x, 'y': 9})
    D += [{'t': 'push_block', 'x': 12, 'y': 8}, {'t': 'x1_gate_culvert_closed', 'x': 24, 'y': 5}, {'t': 'brazier_lit', 'x': 3, 'y': 8}]
    ov += [{'t': 'plate_down', 'x': 26, 'y': 8}, {'t': 'plate_up', 'x': 29, 'y': 8}]
    sc['actors'] = [HERO(4, 8, 'right'), HERO(3, 8, 'right', 'mira')]
    return sc


# ---------------------------------------------------------------------------- Hal's Millrace yard
@scene
def millrace_yard(wheel=2, name='millrace_yard'):
    W, H = 34, 22
    g = grid(W, H, '.')
    rect(g, 0, 0, 33, 1, 'w')                      # the river along the top
    rect(g, 12, 11, 22, 17, '=')                   # the yard
    rect(g, 2, 17, 33, 18, '=')
    blob(g, 27.5, 7, 5.5, 2.8, 'p', 2)             # the dry millpond bed
    rect(g, 0, 20, 33, 21, 'w')
    sc = {'name': name, 'map': 'x1_millrace',
          'legend': {'.': 'grass', '=': 'dirt', 'w': 'water', 'p': 'x1_pond_bed'},
          'ground': done(g), 'under': 'grass', 'decor': [], 'overlays': [], 'actors': [], 'overhead': []}
    D, ov = sc['decor'], sc['overlays']
    for x in range(20, 33):
        ov.append({'t': 'x1_weir_cap_m', 'x': x, 'y': 2})
        ov.append({'t': 'x1_weir_face_arch' if x in (23, 29) else 'x1_weir_face_m', 'x': x, 'y': 3})
    D += [
        {'t': 'x1_mill_building', 'x': 5, 'y': 15},
        {'t': 'x1_mill_wheel', 'x': 12, 'y': 15, 'state': wheel},
        {'t': 'x1_flour_cart', 'x': 15, 'y': 16}, {'t': 'x1_sack_stack', 'x': 19, 'y': 15}, {'t': 'x1_trough', 'x': 20, 'y': 17},
        {'t': 'x1_weir_shed', 'x': 24, 'y': 17}, {'t': 'x1_sluice_failed', 'x': 26, 'y': 3},
        {'t': 'x1_haystack_b', 'x': 1, 'y': 11}, {'t': 'x1_haystack_a', 'x': 3, 'y': 11},
        {'t': 'x1_millstone', 'x': 15, 'y': 12}, {'t': 'x1_fallen_oak', 'x': 9, 'y': 19},
        {'t': 'x1_chain_gate', 'x': 0, 'y': 8}, {'t': 'x1_culvert_arch', 'x': 29, 'y': 10},
        {'t': 'x1_drift_log', 'x': 31, 'y': 12}, {'t': 'x1_flour_sacks', 'x': 17, 'y': 12}, {'t': 'signpost', 'x': 22, 'y': 12},
    ]
    sc['actors'] = [HERO(18, 14, 'down'), HERO(17, 14, 'down', 'mira')]
    return sc


# ---------------------------------------------------------------------------- the High Moor
@scene
def moor_crop():
    """Plan 4.12: the Chime Road with posts, the tarn, heath and gorse, grey crags, the Watchtower and Odo's hut, the stile, and the
    far tower on the skyline."""
    W, H = 38, 30
    g = grid(W, H, '.')
    rect(g, 0, 0, 37, 5, 'S')
    rect(g, 0, 6, 37, 8, '^')
    rect(g, 0, 9, 37, 10, '|')
    oy = 5
    for (x, y) in [(18, 5), (18, 6), (17, 7), (16, 8), (15, 9), (15, 10), (16, 11), (17, 12), (18, 13), (19, 14), (20, 15), (21, 16), (22, 17), (22, 18), (22, 19)]:
        rect(g, x, y + oy, x + 2, y + oy, '=')
    keep = '.'
    blob(g, 5, 8 + oy, 4.5, 3.2, 'h', 1, keep)
    blob(g, 31, 8 + oy, 5.5, 3.0, 'h', 2, keep)
    blob(g, 28, 12 + oy, 4.0, 2.2, 'b', 3, keep)
    blob(g, 8, 13 + oy, 4.5, 2.6, 'b', 4, keep)
    blob(g, 31, 16 + oy, 5.5, 3.4, 'T', 5, keep)
    blob(g, 9, 17 + oy, 4.6, 2.8, 'T', 6, keep)
    blob(g, 5, 21 + oy, 3.6, 2.0, 'P', 7, keep)
    blob(g, 30, 22 + oy, 4.6, 2.2, 'P', 8, keep)
    blob(g, 13, 4 + oy, 3.4, 2.0, 'h', 9, keep)
    rect(g, 0, 29, 37, 29, '^')
    sc = {'name': 'moor_crop', 'map': 'x1_highmoor',
          'legend': {'.': 'x1_moor_turf', 'h': 'x1_heath', 'b': 'x1_bracken', 'P': 'x1_peat', '=': 'dirt', 'T': 'x1_tarn', '^': 'x1_crag_top', '|': 'x1_crag_face', 'S': 'sky'},
          'ground': done(g), 'under': 'x1_moor_turf', 'decor': [], 'overlays': [], 'actors': [], 'overhead': []}
    D = sc['decor']
    D += [
        {'t': 'x1_watchtower', 'x': 24, 'y': 8 + oy}, {'t': 'x1_turf_hut', 'x': 8, 'y': 6 + oy},
        {'t': 'x1_chimepost_1', 'x': 19, 'y': 7 + oy}, {'t': 'x1_chimepost_2', 'x': 14, 'y': 11 + oy}, {'t': 'x1_chimepost_3', 'x': 21, 'y': 15 + oy},
        {'t': 'x1_chimepost_9', 'x': 23, 'y': 19 + oy},
        {'t': 'x1_gorse_b', 'x': 11, 'y': 13 + oy}, {'t': 'x1_gorse_a', 'x': 13, 'y': 14 + oy}, {'t': 'x1_gorse_a', 'x': 1, 'y': 14 + oy},
        {'t': 'x1_gorse_b', 'x': 33, 'y': 14 + oy},
        {'t': 'x1_boulder_b', 'x': 12, 'y': 9 + oy}, {'t': 'x1_boulder_a', 'x': 7, 'y': 13 + oy}, {'t': 'x1_boulder_a', 'x': 35, 'y': 6 + oy},
        {'t': 'x1_cairn_moor', 'x': 5, 'y': 6 + oy}, {'t': 'x1_stile', 'x': 33, 'y': 5 + oy},
    ]
    sc['overhead'] = [{'t': 'x1_far_tower', 'x': 29, 'y': 1}]
    sc['actors'] = [HERO(18, 11 + oy, 'down'), HERO(17, 11 + oy, 'down', 'mira'), HERO(18, 12 + oy, 'down', 'bram')]
    return sc


# ---------------------------------------------------------------------------- Larchhill
@scene
def larchhill_crop():
    """Plan 4.13: terrace walls and stairs, orchard rows, hives, the cider press and barrels, the Windmill, the aqueduct, a hay chute,
    and the far windmill and dome on the skyline."""
    W, H = 38, 28
    g = grid(W, H, '.')
    rect(g, 0, 0, 37, 5, 'S')
    rect(g, 0, 6, 37, 7, '^')
    rect(g, 0, 8, 37, 9, '|')
    rect(g, 0, 15, 37, 16, '^')
    rect(g, 0, 17, 37, 18, '|')
    rect(g, 4, 12, 34, 12, '=')
    rect(g, 34, 12, 36, 14, '=')
    rect(g, 15, 19, 17, 27, '=')
    sc = {'name': 'larchhill_crop', 'map': 'x1_larchhill',
          'legend': {'.': 'x1_orchard_turf', '=': 'dirt', '^': 'x1_terrace_top', '|': 'x1_terrace_face', 'S': 'sky'},
          'ground': done(g), 'under': 'x1_orchard_turf', 'decor': [], 'overlays': [], 'actors': [], 'overhead': []}
    D, ov = sc['decor'], sc['overlays']
    ov += [{'t': 'x1_terrace_stairs_top', 'x': 16, 'y': 17}, {'t': 'x1_terrace_stairs_mid', 'x': 16, 'y': 18},
           {'t': 'x1_terrace_stairs_top', 'x': 16, 'y': 8}, {'t': 'x1_terrace_stairs_mid', 'x': 16, 'y': 9}]
    D += [
        {'t': 'x1_windmill', 'x': 27, 'y': 14}, {'t': 'x1_ladder', 'x': 26, 'y': 14},
        {'t': 'x1_tree_apple', 'x': 4, 'y': 12}, {'t': 'x1_tree_apple_b', 'x': 8, 'y': 12}, {'t': 'x1_tree_plum', 'x': 12, 'y': 12},
        {'t': 'x1_tree_apple', 'x': 4, 'y': 23}, {'t': 'x1_tree_plum', 'x': 9, 'y': 23}, {'t': 'x1_tree_apple_b', 'x': 12, 'y': 26},
        {'t': 'x1_hive_row', 'x': 21, 'y': 13}, {'t': 'x1_hive', 'x': 20, 'y': 22}, {'t': 'x1_hive', 'x': 23, 'y': 24},
        {'t': 'x1_cider_press', 'x': 29, 'y': 24}, {'t': 'x1_cider_barrel', 'x': 33, 'y': 24}, {'t': 'x1_cider_barrel', 'x': 34, 'y': 25},
        {'t': 'x1_bush_berry', 'x': 2, 'y': 19}, {'t': 'x1_bush_plum', 'x': 3, 'y': 27}, {'t': 'x1_haybale', 'x': 25, 'y': 27},
        {'t': 'x1_trough', 'x': 18, 'y': 26},
    ]
    ov.append({'t': 'x1_hay_chute', 'x': 35, 'y': 21, 'w': 2, 'h': 2})
    # the aqueduct along the upper ridge
    for x in range(18, 36):
        c = 'l' if x == 18 else ('r' if x == 35 else 'm')
        ov.append({'t': 'x1_aqueduct_n_' + c, 'x': x, 'y': 3})
        ov.append({'t': 'x1_aqueduct_s_' + c, 'x': x, 'y': 4})
        ov.append({'t': 'x1_aqueduct_arch_' + c, 'x': x, 'y': 5})
    sc['overhead'] = [{'t': 'x1_far_windmill', 'x': 2, 'y': 2}, {'t': 'x1_far_dome', 'x': 9, 'y': 2}]
    sc['actors'] = [HERO(16, 15 - 3, 'down'), HERO(15, 15 - 3, 'down', 'mira')]
    return sc


# ---------------------------------------------------------------------------- Thornfold and the Stones
@scene
def thornfold():
    W, H = 38, 20
    g = grid(W, H, '.')
    rect(g, 0, 15, 37, 16, '=')
    rect(g, 14, 6, 15, 15, '=')
    rect(g, 6, 4, 13, 5, 'm')
    sc = {'name': 'thornfold', 'map': 'x1_downs',
          'legend': {'.': 'grass', '=': 'dirt', 'm': 'moss'},
          'ground': done(g), 'under': 'grass', 'decor': [], 'overlays': [], 'actors': [], 'overhead': []}
    D = sc['decor']
    D += [
        {'t': 'x1_loomhouse', 'x': 18, 'y': 10}, {'t': 'x1_cottage_a', 'x': 28, 'y': 11}, {'t': 'x1_cottage_b', 'x': 6, 'y': 11},
        {'t': 'x1_haystack_a', 'x': 12, 'y': 9}, {'t': 'x1_haystack_b', 'x': 25, 'y': 15}, {'t': 'x1_scarecrow', 'x': 34, 'y': 7},
        {'t': 'x1_trough', 'x': 16, 'y': 13}, {'t': 'well', 'x': 24, 'y': 14}, {'t': 'x1_haybale', 'x': 33, 'y': 12},
        {'t': 'x1_barrow_door_open', 'x': 2, 'y': 5},
        {'t': 'x1_menhir_a', 'x': 12, 'y': 5}, {'t': 'x1_menhir_b', 'x': 15, 'y': 6}, {'t': 'x1_menhir_lettered', 'x': 18, 'y': 5},
        {'t': 'x1_menhir_lettered_b', 'x': 21, 'y': 6}, {'t': 'x1_menhir_a', 'x': 24, 'y': 5}, {'t': 'x1_blank_slab', 'x': 30, 'y': 4},
    ]
    sc['actors'] = [HERO(15, 14, 'up'), HERO(14, 14, 'up', 'mira')]
    return sc


# ---------------------------------------------------------------------------- face swatches
def face_swatch(sys_id, db=None, cols=8, rows=2, scale=4, name=None):
    """Every face style of a wall system as a 2-row face, side by side."""
    from autotile import compose_face
    db = db or P.X1DB()
    meta = db.walls[sys_id]
    styles = meta['faceStyles']
    sheet = db.sheet('x1.png')
    cv = Canvas(cols * 16, (rows * 16 + 8) * len(styles))
    for si, st in enumerate(styles):
        fx, fy = st[0]
        for ty in range(rows):
            for tx in range(cols):
                t = compose_face(sheet, tx > 0, ty > 0, tx < cols - 1, ty < rows - 1, fx, fy)
                cv.blit(t, tx * 16, si * (rows * 16 + 8) + ty * 16)
    out = P.save(cv, name or ('faces_%s_%dx.png' % (sys_id, scale)), scale)
    print('wrote', out)
    return out


# ---------------------------------------------------------------------------- rendering
def run(names=None):
    db = P.X1DB()
    for name, fn in SC.items():
        if names and name not in names:
            continue
        sc = fn()
        cv = P.render(sc, db)
        print('wrote', P.save(cv, sc['name'] + '_3x.png', 3))
        P.save(cv, sc['name'] + '_x1.png', 1)


if __name__ == '__main__':
    run(sys.argv[1:] or None)


# ---------------------------------------------------------------------------- phone-scale checks (CRITIQUE_4 items 7 and 8)
def phone_sheet(name, sc_fn, crop_tiles, vp=(24, 14), scale_small=2, scale_big=4, caption=None):
    """The whole 384 x 216 viewport at 2x (what a phone holds in the hand) beside a 4x crop of the feature. crop_tiles = (x, y, w, h)."""
    db = P.X1DB()
    sc = sc_fn()
    cv = P.render(sc, db)
    # viewport: centred on the crop
    cx, cy, cw, ch = crop_tiles
    vx = max(0, min(cv.w // 16 - vp[0], cx + cw // 2 - vp[0] // 2))
    vy = max(0, min(cv.h // 16 - vp[1], cy + ch // 2 - vp[1] // 2))
    full = cv.crop(vx * 16, vy * 16, vp[0] * 16, vp[1] * 16)
    big = cv.crop(cx * 16, cy * 16, cw * 16, ch * 16)
    from PIL import Image
    a = full.image().resize((full.w * scale_small, full.h * scale_small), Image.NEAREST)
    b = big.image().resize((big.w * scale_big, big.h * scale_big), Image.NEAREST)
    W = a.width + 12 + b.width
    H = max(a.height, b.height)
    out = Image.new('RGBA', (W, H), (20, 16, 30, 255))
    out.alpha_composite(a, (0, 0))
    out.alpha_composite(b, (a.width + 12, 0))
    p = os.path.join(P.OUT, name)
    os.makedirs(P.OUT, exist_ok=True)
    out.convert('RGB').save(p)
    print('wrote', p)
    return p


@scene
def phone_barrow():
    """A pressed plate and an opened slab on x1_barrow_floor: plate up, plate down (nothing on it), the block on a plate, the slab shut and slid."""
    W, H = 26, 12
    g = e2_scenes.carve(W, H, [(1, 5, 24, 10, '.', 2)])
    rect(g, 6, 3, 7, 4, '.')                # a doorway through the band for the slab
    rect(g, 6, 1, 9, 2, 'a')
    sc = dungeon_scene('phone_barrow', 'x1_barrow', 'x1_barrow_floor', g, {'a': 'x1_barrow_flag'}, 'x1_barrow_floor')
    D, ov = sc['decor'], sc['overlays']
    D.append({'t': 'x1_slab_doorway', 'x': 4, 'y': 6})
    D.append({'t': 'x1_slab', 'x': 8, 'y': 6})                  # slid into its pocket: the doorway is open
    D.append({'t': 'x1_slab_doorway', 'x': 14, 'y': 6})
    D.append({'t': 'x1_slab', 'x': 16, 'y': 6})                 # shut
    ov += [{'t': 'plate_up', 'x': 4, 'y': 9}, {'t': 'plate_down', 'x': 8, 'y': 9}, {'t': 'plate_up', 'x': 12, 'y': 9},
           {'t': 'plate_down', 'x': 20, 'y': 9}, {'t': 'switch_off', 'x': 15, 'y': 9}, {'t': 'switch_on', 'x': 18, 'y': 9}]
    D += [{'t': 'push_block', 'x': 12, 'y': 9}, {'t': 'brazier_lit', 'x': 2, 'y': 9}]
    sc['actors'] = [HERO(10, 9, 'right'), HERO(21, 9, 'left', 'mira')]
    return sc


@scene
def phone_cellar():
    return cellar_floor(True, 'phone_cellar')


@scene
def phone_mill():
    return millrace_yard(wheel=3, name='phone_mill')


def run_phone():
    phone_sheet('phone_barrow_plate_slab.png', phone_barrow, (2, 5, 20, 6))
    phone_sheet('phone_cellar_ink_bridge.png', phone_cellar, (3, 5, 14, 7))
    phone_sheet('phone_mill_wheel.png', phone_mill, (3, 13, 14, 7), vp=(24, 14))
