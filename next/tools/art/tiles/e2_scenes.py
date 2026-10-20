"""E2-tiles preview scenes (Court of Mirrors, the Hollow, the road), rendered with the real autotile rules.

    python e2_scenes.py                 # every scene -> out/e2/<name>_3x.png (+ _x1)
    python e2_scenes.py court_f1_room   # one scene

Rooms are carved out of '#' and the wall cells classified like the Archive maps' depth(): a wall cell touching a
non-wall cell (8-neighbourhood) is the band '#', one or two cells under a band's south side the outer face 'o',
every other wall cell the deep 'v'. Face rows are written as '|'.
"""
import os, sys
from pxlib import OUT_DIR
import compose

E2_OUT = os.path.join(OUT_DIR, 'e2')


def carve(W, H, rooms):
    """rooms: list of (x0, y0, x1, y1, floor_char, face_rows). Floor rect inclusive; face rows sit above y0."""
    g = [['#'] * W for _ in range(H)]
    for (x0, y0, x1, y1, ch, faces) in rooms:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                g[y][x] = ch
        for k in range(1, faces + 1):
            for x in range(x0, x1 + 1):
                if g[y0 - k][x] == '#':
                    g[y0 - k][x] = '|'
    return g


def depth(g):
    H, W = len(g), len(g[0])
    at = lambda x, y: '#' if (x < 0 or y < 0 or x >= W or y >= H) else g[y][x]

    def band(x, y):
        if at(x, y) != '#':
            return False
        return any(at(x + dx, y + dy) != '#' for dy in (-1, 0, 1) for dx in (-1, 0, 1))
    out = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] != '#' or band(x, y):
                continue
            if band(x, y - 1):
                out[y][x] = 'o'
            elif y >= 2 and out[y - 1][x] == 'o' and band(x, y - 2):
                out[y][x] = 'o'
            else:
                out[y][x] = 'v'
    return [''.join(r) for r in out]


def court_room(name, sys_id, floor, W, H, rooms, decor=(), overlays=(), actors=(), extra_legend=None, under=None,
               paint=None, frame=0):
    g = carve(W, H, rooms)
    if paint:
        paint(g)
    rows = depth(g)
    legend = {'#': sys_id + '_top', '|': sys_id + '_face', 'o': sys_id + '_out_face', 'v': sys_id + '_out_top',
              '.': floor}
    legend.update(extra_legend or {})
    return {'name': name, 'legend': legend, 'ground': rows, 'under': under or floor, 'decor': list(decor),
            'overlays': list(overlays), 'actors': list(actors), 'frame': frame}


def scenes():
    S = {}
    # ---------------------------------------------------------------- F1: the beam teaching room (area B)
    # 18 x 8 floor, a 2-row north face with the skylight window, the turned mirror on the beam column, the
    # receptor in the east wall and the silver inlay running to the gate in the north-east face.
    S['court_f1_room'] = court_room(
        'court_f1_room', 'court', 'glass_floor', 24, 15,
        [(2, 4, 21, 11, '.', 2), (10, 12, 13, 13, '.', 0)],
        decor=[
            {'t': 'beam_window', 'x': 7, 'y': 3},
            {'t': 'mirror_wall', 'x': 4, 'y': 2}, {'t': 'mirror_wall', 'x': 11, 'y': 2},
            {'t': 'door_glass_open', 'x': 18, 'y': 3},
            {'t': 'receptor_wall', 'x': 16, 'y': 3, 'state': 1},
            {'t': 'mirror_stand', 'x': 7, 'y': 8, 'state': 1},
            {'t': 'mirror_stand', 'x': 16, 'y': 8, 'state': 0},
            {'t': 'font_silver', 'x': 3, 'y': 10},
            {'t': 'glass_bench', 'x': 11, 'y': 10},
            {'t': 'mirror_heavy', 'x': 20, 'y': 10, 'state': 1},
            {'t': 'receptor', 'x': 3, 'y': 5, 'state': 0},
        ],
        overlays=[{'t': 'inlay_h_lit', 'x': 17, 'y': 4}, {'t': 'inlay_corner_nw_lit', 'x': 18, 'y': 4},
                  {'t': 'inlay_socket', 'x': 20, 'y': 8}, {'t': 'inlay_v', 'x': 3, 'y': 6},
                  {'t': 'inlay_v', 'x': 3, 'y': 7}],
        actors=[{'x': 12, 'y': 12, 'dir': 'up'}])
    S['court_f1_room']['beams'] = [((7, 3), (7, 8)), ((7, 8), (16, 8)), ((16, 8), (16, 3))]
    # F2: the Well with a lit and a dim glass bridge, portraits on the damask
    def well(g):
        for y in range(8, 12):
            for x in range(6, 14):
                g[y][x] = 'p'
    S['court_f2_well'] = court_room(
        'court_f2_well', 'court_gallery', 'gallery_floor', 20, 15,
        [(2, 4, 17, 11, '.', 2), (8, 12, 10, 13, '.', 0)],
        decor=[{'t': 'portrait_blank', 'x': 3, 'y': 2}, {'t': 'portrait_child', 'x': 6, 'y': 2},
               {'t': 'portrait_keeper_empty', 'x': 9, 'y': 2}, {'t': 'portrait_king', 'x': 12, 'y': 2},
               {'t': 'portrait_blank_2', 'x': 15, 'y': 2},
               {'t': 'mirror_stand', 'x': 4, 'y': 9, 'state': 0}, {'t': 'mirror_stand', 'x': 15, 'y': 9, 'state': 1},
               {'t': 'mirror_tall', 'x': 16, 'y': 6, 'state': 1}],
        overlays=[{'t': 'glass_bridge_h_lit', 'x': x, 'y': 9} for x in range(6, 14)] +
                 [{'t': 'glass_bridge_v_dim', 'x': 10, 'y': y} for y in (8, 10, 11)],
        actors=[{'x': 9, 'y': 12, 'dir': 'up'}], extra_legend={'p': 'pit'}, paint=well)
    S['court_f2_well']['beams'] = [((4, 9), (15, 9))]
    S['court_f3_hub'] = court_room(
        'court_f3_hub', 'court_throne', 'throne_floor', 20, 15,
        [(2, 4, 17, 11, '.', 2), (8, 12, 10, 13, '.', 0)],
        decor=[{'t': 'door_vow', 'x': 9, 'y': 3, 'state': 2}, {'t': 'throne_glass', 'x': 4, 'y': 6},
               {'t': 'glass_bench', 'x': 14, 'y': 6}, {'t': 'receptor', 'x': 16, 'y': 9, 'state': 1},
               {'t': 'mirror_stand', 'x': 12, 'y': 9, 'state': 0}, {'t': 'stairs_glass_down', 'x': 3, 'y': 11},
               {'t': 'mirror_heavy', 'x': 7, 'y': 9, 'state': 0}],
        overlays=[{'t': 'crowned_reflection', 'x': 4, 'y': 7}, {'t': 'inlay_socket', 'x': 7, 'y': 10}],
        actors=[{'x': 10, 'y': 11, 'dir': 'up'}])
    S['court_f3_hub']['beams'] = [((12, 11), (12, 9)), ((12, 9), (16, 9))]
    # the throne room's north face: the great mirror and the glass boss door from the outside
    S['court_throne'] = court_room(
        'court_throne', 'court_throne', 'throne_floor', 20, 13,
        [(2, 5, 17, 10, '.', 2), (8, 11, 10, 12, '.', 0)],
        decor=[{'t': 'mirror_great', 'x': 7, 'y': 4, 'state': 0}, {'t': 'throne_glass', 'x': 9, 'y': 7},
               {'t': 'door_throne_closed', 'x': 3, 'y': 4}, {'t': 'glass_pane_cracked', 'x': 15, 'y': 3},
               {'t': 'mirror_wall', 'x': 16, 'y': 3}],
        actors=[{'x': 10, 'y': 10, 'dir': 'up'}])
    S['court_f1_plain'] = court_room(
        'court_f1_plain', 'court', 'glass_floor', 16, 11,
        [(2, 4, 13, 7, '.', 2), (6, 8, 8, 8, '.', 0)], actors=[{'x': 7, 'y': 6, 'dir': 'down'}])
    S['court_f2_plain'] = court_room(
        'court_f2_plain', 'court_gallery', 'gallery_floor', 16, 11,
        [(2, 4, 13, 7, '.', 2), (6, 8, 8, 8, '.', 0)], actors=[{'x': 7, 'y': 6, 'dir': 'down'}])
    S['court_f3_plain'] = court_room(
        'court_f3_plain', 'court_throne', 'throne_floor', 16, 11,
        [(2, 4, 13, 7, '.', 2), (6, 8, 8, 8, '.', 0)], actors=[{'x': 7, 'y': 6, 'dir': 'down'}])
    S['hollow_square'] = town_scene()
    return S


BEAM_CORE = (238, 246, 255, 255)
BEAM_HALO = (138, 240, 232, 255)


def draw_beams(cv, beams):
    """Mock only (the field draws the real beam, EPISODE2_PLAN 5.1): a 2 px #eef6ff core along tile centres
    with a 1 px dithered magic_cyan halo, a sparkle at every bounce."""
    for (x0, y0), (x1, y1) in beams:
        ax, ay, bx, by = x0 * 16 + 8, y0 * 16 + 8, x1 * 16 + 8, y1 * 16 + 8
        if ax == bx:
            for y in range(min(ay, by), max(ay, by) + 1):
                cv.set(ax - 1, y, BEAM_CORE); cv.set(ax, y, BEAM_CORE)
                if y % 2 == 0:
                    cv.put(ax - 2, y, BEAM_HALO); cv.put(ax + 1, y, BEAM_HALO)
        else:
            for x in range(min(ax, bx), max(ax, bx) + 1):
                cv.set(x, ay - 1, BEAM_CORE); cv.set(x, ay, BEAM_CORE)
                if x % 2 == 0:
                    cv.put(x, ay - 2, BEAM_HALO); cv.put(x, ay + 1, BEAM_HALO)
    for (x0, y0), (x1, y1) in beams[1:]:
        cx, cy = x0 * 16 + 8, y0 * 16 + 8
        for (dx, dy) in ((0, -3), (0, 3), (-3, 0), (3, 0), (-2, -2), (2, 2), (2, -2), (-2, 2)):
            cv.put(cx + dx, cy + dy, (255, 255, 255, 220 if abs(dx) + abs(dy) == 3 else 140))


def town_scene():
    """The Hollow: the mere along the north with the Court far off, the square, the inn, shop, clocktower,
    hall and smithy, reeds, a silver birch, the blank signs, Nico's chalk crown."""
    W, H = 40, 26
    g = [['.'] * W for _ in range(H)]
    for y in range(0, 4):
        for x in range(W):
            g[y][x] = '~'
    for x in range(W):
        if (x * 7) % 5 == 0:
            g[4][x] = '~'
    for y in range(13, 22):
        for x in range(13, 27):
            dx, dy = (x - 19.5) / 7.5, (y - 17) / 5
            if dx * dx + dy * dy < 1.05:
                g[y][x] = 'o'
    for x in range(0, 13):
        g[19][x] = '='
        g[20][x] = '='
    for y in range(5, 13):
        g[y][20] = '='
    rows = [''.join(r) for r in g]
    decor = [
        {'t': 'hall_hollow', 'x': 14, 'y': 12}, {'t': 'clocktower', 'x': 29, 'y': 12},
        {'t': 'inn_hollow', 'x': 1, 'y': 17}, {'t': 'shop_hollow', 'x': 30, 'y': 23},
        {'t': 'smithy_hollow', 'x': 4, 'y': 25}, {'t': 'house_hollow_s', 'x': 33, 'y': 17},
        {'t': 'tree_birch_silver', 'x': 25, 'y': 9}, {'t': 'tree_birch_silver', 'x': 8, 'y': 9},
        {'t': 'fountain', 'x': 18, 'y': 17}, {'t': 'lamp_post', 'x': 15, 'y': 19, 'state': 1},
        {'t': 'lamp_post', 'x': 24, 'y': 15, 'state': 1}, {'t': 'bench', 'x': 22, 'y': 21},
        {'t': 'signpost_blank', 'x': 12, 'y': 21}, {'t': 'cairn', 'x': 27, 'y': 6},
    ]
    overlays = [{'t': 'reeds_%d' % (x % 3), 'x': x, 'y': 4} for x in range(0, 40, 3) if g[4][x] == '.'] + \
               [{'t': 'chalk_crown', 'x': 21, 'y': 22}, {'t': 'hydrangea_blue', 'x': 13, 'y': 15},
                {'t': 'hydrangea_violet', 'x': 26, 'y': 17}]
    return {'name': 'hollow_square', 'legend': {'.': 'grass', '~': 'mere_water', 'o': 'plaza', '=': 'dirt'},
            'ground': rows, 'under': 'grass', 'decor': decor, 'overlays': overlays,
            'overhead': [{'t': 'court_far', 'x': 30, 'y': 0}],
            'actors': [{'x': 19, 'y': 20, 'dir': 'up'}]}


def main(argv):
    os.makedirs(E2_OUT, exist_ok=True)
    db = compose.TileDB()
    allsc = scenes()
    for n in (argv[1:] or list(allsc)):
        sc = allsc[n]
        cv = compose.render(sc, db)
        for o in sc.get('overhead', []):
            compose.draw_tile(db, cv, o['t'], o['x'], o['y'], 0)
        if sc.get('beams'):
            draw_beams(cv, sc['beams'])
        cv.save(os.path.join(E2_OUT, '%s_3x.png' % n), 3)
        cv.save(os.path.join(E2_OUT, '%s_x1.png' % n), 1)
        print('wrote', n, cv.w, cv.h)


if __name__ == '__main__':
    main(sys.argv)
