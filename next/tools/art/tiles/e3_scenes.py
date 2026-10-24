"""E3-tiles preview scenes (the foundry floors, the Slag Hall mock, the Emberpeak mock), rendered with the real autotile rules.

    python e3_scenes.py                 # every scene -> out/e3/<name>_3x.png (+ _x1)
    python e3_scenes.py f1_plain        # one scene
"""
import os, sys
from pxlib import OUT_DIR
import compose
from e2_scenes import carve, depth

E3_OUT = os.path.join(OUT_DIR, 'e3')


def room(name, sys_id, floor, W, H, rooms, decor=(), overlays=(), actors=(), extra_legend=None, under=None,
         paint=None, frame=0, map_id=None):
    g = carve(W, H, rooms)
    if paint:
        paint(g)
    rows = depth(g)
    legend = {'#': sys_id + '_top', '|': sys_id + '_face', 'o': sys_id + '_out_face', 'v': sys_id + '_out_top',
              '.': floor}
    legend.update(extra_legend or {})
    return {'name': name, 'legend': legend, 'ground': rows, 'under': under or floor, 'decor': list(decor),
            'overlays': list(overlays), 'actors': list(actors), 'frame': frame, 'map_id': map_id}


def scenes():
    S = {}
    for n, (sysid, floor) in {'f1': ('foundry', 'foundry_floor'), 'f2': ('galleries', 'ash_floor'),
                              'f3': ('crucible', 'crucible_floor')}.items():
        S[n + '_plain'] = room(n + '_plain', sysid, floor, 20, 12,
                               [(2, 4, 17, 8, '.', 2), (8, 9, 10, 10, '.', 0)], actors=[{'x': 9, 'y': 8, 'dir': 'up'}],
                               map_id='foundry_' + n)
    # ------------------------------------------------------------------ F1 Slag Hall (puzzle B), EPISODE3_PLAN 4.4
    # spout in the north face -> trough down to the sluice -> the water runs WEST into pool 1 (crusted, a bridge of
    # crust) while the east branch stays dry and pool 2 is still molten. Legend: '=' wet h, '-' dry h, '!' wet v,
    # '|' face (wall), 'X' wet junction, 'S' slag, 'C' crust, 'c' crust variant.
    def slag_hall(g):
        for y in range(7, 11):
            for x in range(3, 6):
                g[y][x] = 'C' if (x, y) != (4, 8) else 'c'
        for y in range(7, 11):
            for x in range(15, 19):
                g[y][x] = 'S'
        for x in range(6, 11):
            g[8][x] = '='
        g[8][11] = 'X'
        for x in range(12, 15):
            g[8][x] = '-'
        for y in range(4, 8):
            g[y][11] = '!'
    S['f1_slag_hall'] = room(
        'f1_slag_hall', 'foundry', 'foundry_floor', 24, 15,
        [(2, 4, 21, 12, '.', 2), (10, 13, 13, 14, '.', 0)],
        decor=[
            {'t': 'spout_wall', 'x': 11, 'y': 3},
            {'t': 'sluice', 'x': 11, 'y': 8, 'state': 0},
            {'t': 'furnace_mouth', 'x': 4, 'y': 3}, {'t': 'pipes_v', 'x': 8, 'y': 3}, {'t': 'pipes_v', 'x': 15, 'y': 3},
            {'t': 'hot_grate_closed', 'x': 18, 'y': 3},
            {'t': 'ore_crate', 'x': 20, 'y': 11}, {'t': 'tool_rack', 'x': 6, 'y': 12},
            {'t': 'splash_puddle', 'x': 12, 'y': 8} if False else {'t': 'font_cistern', 'x': 2, 'y': 12},
        ],
        extra_legend={'=': 'trough_h_wet', '-': 'trough_h', '!': 'trough_v_wet', 'X': 'trough_x_wet', 'S': 'slag',
                      'C': 'slag_crust', 'c': 'slag_crust_b'},
        paint=slag_hall, actors=[{'x': 11, 'y': 12, 'dir': 'up'}], map_id='foundry_f1')
    # the other sluice state: water runs EAST into pool 2 (molten), the west branch is dry, pool 1 stays crusted
    def slag_hall_turned(g):
        slag_hall(g)
        for x in range(6, 11):
            g[8][x] = '-'
        for x in range(12, 15):
            g[8][x] = '='
        g[8][11] = 'X'
    S['f1_slag_hall_turned'] = room(
        'f1_slag_hall_turned', 'foundry', 'foundry_floor', 24, 15,
        [(2, 4, 21, 12, '.', 2), (10, 13, 13, 14, '.', 0)],
        decor=[
            {'t': 'spout_wall', 'x': 11, 'y': 3},
            {'t': 'sluice', 'x': 11, 'y': 8, 'state': 1},
            {'t': 'furnace_mouth', 'x': 4, 'y': 3}, {'t': 'pipes_v', 'x': 8, 'y': 3}, {'t': 'pipes_v', 'x': 15, 'y': 3},
            {'t': 'hot_grate_closed', 'x': 18, 'y': 3},
            {'t': 'ore_crate', 'x': 20, 'y': 11}, {'t': 'tool_rack', 'x': 6, 'y': 12},
            {'t': 'font_cistern', 'x': 2, 'y': 12},
        ],
        extra_legend=S['f1_slag_hall']['legend'], paint=slag_hall_turned, actors=[{'x': 11, 'y': 12, 'dir': 'up'}],
        map_id='foundry_f1')
    return S


_orig_wall_cells = compose.wall_cells
_FB = {}


def _wall_cells(db, grid_ids, x, y, face_blocks=None):
    return _orig_wall_cells(db, grid_ids, x, y, _FB.get('fb'))


compose.wall_cells = _wall_cells


def render(sc, db):
    legend = sc['legend']
    ids = [[legend.get(ch) for ch in row] for row in sc['ground']]
    _FB['fb'] = compose.face_block_grid(db, ids, sc.get('map_id')) if sc.get('map_id') else None
    cv = compose.render(sc, db)
    for tid, px, py in sc.get('px_overlays', []):
        m = db.tiles.get(tid)
        cv.blit(db.sheet(m['sheet']).crop(m['x'], m['y'], m.get('w', 16), m.get('h', 16)), px, py)
    return cv


def main(argv):
    os.makedirs(E3_OUT, exist_ok=True)
    db = compose.TileDB()
    allsc = scenes()
    import e3_town
    allsc.update(e3_town.scenes(allsc))
    for n in (argv[1:] or list(allsc)):
        sc = allsc[n]
        cv = render(sc, db)
        cv.save(os.path.join(E3_OUT, '%s_3x.png' % n), 3)
        cv.save(os.path.join(E3_OUT, '%s_x1.png' % n), 1)
        print('wrote', n, cv.w, cv.h)


if __name__ == '__main__':
    main(sys.argv)
