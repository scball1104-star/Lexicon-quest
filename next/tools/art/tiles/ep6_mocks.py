"""E6-tiles mock rooms and the phone contrast checks (run by ep6_scenes.py; writes out/ep6/).

Mocks (3x and 1x, plus the 844 x 390 phone frame of the game's 384 x 216 screen):
  airstair_lane_a        the Airstair's landing 3 (plan 4.1, lesson A): a basalt face, the plank landing, a six-cell gap
                         of cloud with a live lane east across it to the next ledge, the great chain overhead
  town_board_plaza       Zephyr Landing's board plaza (plan 4.2): the inn, the board (ARRIVED, clacking), the post rack, the
                         chimes, the beacon tower, the rope bridge west, the Kestrel at the north dock, the storm on the
                         north-east skyline
  f1_vane_deck_0 / _1    F1's first vane (plan 4.5 C) in both states: state 0 the lane blows west back at the deck (white
                         chevrons), state 1 east to the glass platform (gold chevrons, the vane's arrow gold and east); a
                         second lane south past a mooring post
  f2_ducts_lamp          F2's ducts (plan 4.6): brass grating, a dark shaft with a live duct lane, a fan vane, relays and
                         speaking tubes on the wall, a lit signal lamp's pool (dark 0.35)
  f3_ring_storm          F3's ring landing (plan 4.7): white stone round the spire, the ring lane in storm cloud, a post at
                         the stair, a lit lamp's pool, the storm tint (dark 0.5)

Checks (out/ep6/contrast_check.json, on the rendered 844 x 390 phone frame):
  lane vs plain cloud     mean luma of live lane cells that carry a chevron vs plain cloud cells: at least 0.2 (both vane
                          states; frame 0 and the frame average)
  a vane's arrow          the arrow's pixels vs the dial disc round it, from two tiles away (the party two cells south of
                          the pole), each state; and its size in phone pixels
  a mooring post          the post's body vs the lane bed round it
  the grades and F3       (informational) F3's party floor under the assumed storm tint and dark
"""
import json, math, os
import numpy as np
from PIL import Image
from pxlib import Canvas, hexc
from autotile import quarter_src, QOFF, NB_KEYS, DIRS as NBD
from ep6_scenes import OUT, WIND

# The field's tints the mocks use. `storm` is E6-world's tint (plan 5.2); until it lands the mocks assume this slate
# multiply and desaturation (reported; E6-world owns the real numbers and must keep F3's floor at or above 0.22).
TINTS = {'storm': ('#7d8aa6', 0.52, 0.32), 'night': ('#262a66', 0.84, 0.42)}
PHONE_W, PHONE_H = 844, 390
ARROW_D = {'>': 'right', 'v': 'down', '<': 'left', '^': 'up'}
DIR_I = {'up': 0, 'right': 1, 'down': 2, 'left': 3}     # E6-world's arrow order


def hx(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0


def luma(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def apply_tint(arr, name):
    if not name or name not in TINTS:
        return arr
    col, a, d = TINTS[name]
    out = arr * (1 - a) + arr * hx(col) * a
    if d:
        l = luma(out)[..., None]
        out = out * (1 - d) + l * d
    return np.clip(out, 0, 1)


def apply_dark(arr, sc):
    dark = sc.get('dark', 0)
    if not dark:
        return arr
    H, W = arr.shape[:2]
    amb = np.array([0.92, 0.90, 1.12]) * (1 - dark)
    lightmap = np.ones((H, W, 3), np.float32) * np.clip(amb, 0, 1)
    yy, xx = np.mgrid[0:H, 0:W]
    for (lx, ly, r) in sc.get('lamps', []):
        cx, cy = lx * 16 + 8, ly * 16 + 8
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / ((r + 0.9) * 16)
        k = np.clip(1.25 - d * 1.1, 0, 1)[..., None]
        warm = np.array([1.0, 0.92, 0.78], np.float32)
        lightmap = np.maximum(lightmap, np.clip(amb + (warm - amb) * k, 0, 1))
    out = arr * lightmap
    return np.clip(out + hx('#1a1430') * dark * 0.5, 0, 1)


# ====================================================================== the lane layer (a mirror of E6-world's drawing)
def lane_cells(sc):
    out = {}
    for y, row in enumerate(sc.get('lanes', [])):
        for x, ch in enumerate(row):
            if ch in ARROW_D:
                out[(x, y)] = ARROW_D[ch]
    return out


def draw_bed(cv, db, sc, frame):
    cells = lane_cells(sc)
    bed = db.terrains[sc.get('bed', 'gust_lane')]
    sheet = db.sheet(bed['sheet'])
    seq = bed['anim']['frames']
    sx0 = bed['x'] + seq[frame % len(seq)] * bed['anim']['frameDx']
    for (x, y) in cells:
        nb = {k: (x + NBD[k][0], y + NBD[k][1]) in cells for k in NB_KEYS}
        for q in ('TL', 'TR', 'BL', 'BR'):
            qx, qy = quarter_src(q, nb)
            ox, oy = QOFF[q]
            cv.blit(sheet.crop(sx0 + qx * 8, bed['y'] + qy * 8, 8, 8), x * 16 + ox, y * 16 + oy)
    st = db.objects['gust_streak']
    for (x, y), d in cells.items():
        fx, fy, fw, fh = st['frames'][DIR_I[d] * 3 + frame % 3]
        cv.blit(db.sheet(st['sheet']).crop(fx, fy, 16, 16), x * 16, y * 16)


def chevron_cells(sc):
    cells = lane_cells(sc)
    skip = set(tuple(p) for p in sc.get('no_chevron', []))
    return {p: d for p, d in cells.items() if (p[0] + p[1]) % WIND['every'] == 0 and p not in skip}


def draw_chevrons(cv, sc):
    state = sc.get('lane_state', 0)
    fill, out = hexc(WIND['fill'][state]), hexc(WIND['outline'][state])
    base = Canvas(9, 9)
    for j, row in enumerate(WIND['chevron']):
        for i, ch in enumerate(row):
            if ch == 'w':
                base.set(i, j, fill)
            elif ch == 'o':
                base.set(i, j, out)
    for (x, y), d in chevron_cells(sc).items():
        k = {'right': 0, 'down': -1, 'left': 2, 'up': 1}[d]
        c = Canvas.from_array(np.ascontiguousarray(np.rot90(base.a, k)))
        cv.blit(c, x * 16 + 4, y * 16 + 4)


# ====================================================================== render
def render(sc, db, frame=0):
    import x1_preview
    from compose import draw_object, draw_actor, draw_tile, SpriteDB
    base = dict(sc)
    base['frame'] = frame
    base['decor'] = [d for d in sc.get('decor', []) if d.get('floor')]
    base['actors'] = []
    base['overhead'] = []
    cv = x1_preview.render(base, db, map_id=sc.get('map_id'), frame=frame)
    if sc.get('lanes'):
        draw_bed(cv, db, sc, frame)
    spr = SpriteDB()
    objs = sorted([o for o in sc.get('decor', []) if not o.get('floor')], key=lambda o: (o['y'], o['x']))
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='base')
        elif o['t'] in db.tiles:
            draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    if sc.get('lanes'):
        draw_chevrons(cv, sc)
    for a in sc.get('actors', []):
        draw_actor(cv, a, spr)
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='overhead')
    for o in sc.get('overhead', []):
        draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    return cv


def finish(cv, sc):
    arr = cv.a[..., :3].astype(np.float32) / 255.0
    arr = apply_dark(arr, sc)
    arr = apply_tint(arr, sc.get('tint'))
    if sc.get('glows'):
        H, W = arr.shape[:2]
        yy, xx = np.mgrid[0:H, 0:W]
        add = np.zeros((H, W), np.float32)
        for (gx, gy, r) in sc['glows']:
            d = np.sqrt((xx - gx * 16 - 8) ** 2 + (yy - gy * 16 - 8) ** 2) / (r * 16)
            add = np.maximum(add, np.clip(1 - d, 0, 1) ** 1.5)
        arr = np.clip(arr + add[..., None] * np.array([1.0, 0.72, 0.38]) * 0.3, 0, 1)
    return arr


def save_arr(arr, name, scale):
    im = Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    p = os.path.join(OUT, name)
    im.save(p)
    return p


def phone_frame(arr, cx=None, cy=None):
    """A 384 x 216 window of the mock (the game's screen), then the 844 x 390 phone frame: the screen scaled by 390/216
    (nearest) and centred. Returns (frame, window, (x0, y0) of the window in the mock, scale, ox)."""
    H, W = arr.shape[:2]
    cx = W // 2 if cx is None else cx
    cy = H // 2 if cy is None else cy
    x0 = max(0, min(W - 384, cx - 192)) if W > 384 else 0
    y0 = max(0, min(H - 216, cy - 108)) if H > 216 else 0
    win = np.zeros((216, 384, 3), np.float32) + hx('#14101e')
    part = arr[y0:y0 + 216, x0:x0 + 384]
    win[:part.shape[0], :part.shape[1]] = part
    s = PHONE_H / 216.0
    pw = int(round(384 * s))
    ox = (PHONE_W - pw) // 2
    idx_x = np.minimum(383, (np.arange(pw) / s).astype(int))
    idx_y = np.minimum(215, (np.arange(PHONE_H) / s).astype(int))
    frame = np.zeros((PHONE_H, PHONE_W, 3), np.float32)
    frame[:, ox:ox + pw] = win[idx_y][:, idx_x]
    return frame, win, (x0, y0), s, ox


def grid(W, H, fill):
    return [[fill] * W for _ in range(H)]


def rows_of(g):
    return [''.join(r) for r in g]


def lanes_of(W, H, cells):
    g = grid(W, H, '.')
    for (x, y), ch in cells.items():
        g[y][x] = ch
    return rows_of(g)


# ====================================================================== scenes
def airstair_lane_a():
    W, H = 24, 14
    g = grid(W, H, 'c')
    for y in (0, 1):
        for x in range(W):
            g[y][x] = '#'
    for y in (2, 3):
        for x in range(W):
            g[y][x] = '|'
    for y in range(4, 11):
        for x in range(0, 9):
            g[y][x] = 'p'
        for x in range(15, W):
            g[y][x] = 'p'
    for x in range(0, 9):
        g[11][x] = 'p'
    for y in range(4, 12):
        g[y][9] = 'c'
    lanes = {(x, 7): '>' for x in range(9, 15)}
    for y in (2, 3):
        g[y][4] = 's'
    sc = {'name': 'airstair_lane_a', 'legend': {'#': 'basalt_stack_top', '|': 'basalt_stack_face', 'c': 'cloudbank',
                                                 'p': 'skyplank', 's': 'rope_stair'},
          'under_map': {'s': 'skyplank'}, 'ground': rows_of(g), 'under': 'skyplank', 'overlays': [], 'map_id': 'ep6_airstair',
          'lanes': lanes_of(W, H, lanes),
          'decor': [{'t': 'great_chain', 'x': 11, 'y': 9}, {'t': 'cargo_net', 'x': 1, 'y': 6},
                    {'t': 'bollard', 'x': 8, 'y': 5}, {'t': 'bollard', 'x': 15, 'y': 9}, {'t': 'windsock', 'x': 20, 'y': 5},
                    {'t': 'lamp_sky', 'x': 17, 'y': 6}],
          'actors': [{'x': 7, 'y': 7, 'dir': 'right'}, {'x': 6, 'y': 8, 'dir': 'right', 'who': 'mira'},
                     {'x': 6, 'y': 6, 'dir': 'right', 'who': 'bram'}]}
    return sc


def town_board_plaza():
    W, H = 28, 17
    g = grid(W, H, 'c')
    for y in range(5, 16):
        for x in range(3, 27):
            g[y][x] = 'b'
    for y in range(2, 5):
        for x in range(6, 11):
            g[y][x] = 'p'
    for x in range(0, 3):
        g[10][x] = 'w'
    for x in range(4, 26):
        g[15][x] = 'r'
    sc = {'name': 'town_board_plaza', 'legend': {'c': 'cloudbank', 'b': 'skyport_paving', 'p': 'skyplank', 'w': 'skywalk',
                                                  'r': 'rope_rail'},
          'under_map': {'r': 'skyport_paving'}, 'ground': rows_of(g), 'under': 'skyport_paving', 'overlays': [],
          'decor': [{'t': 'inn_cloudhouse', 'x': 3, 'y': 10}, {'t': 'tower_signal', 'x': 22, 'y': 10},
                    {'t': 'beacon', 'x': 23, 'y': 4, 'state': 0},
                    {'t': 'departure_board', 'x': 12, 'y': 10, 'state': 0}, {'t': 'post_rack', 'x': 16, 'y': 10},
                    {'t': 'chimes', 'x': 11, 'y': 13, 'state': 0}, {'t': 'chimes', 'x': 15, 'y': 13, 'state': 0},
                    {'t': 'chimes', 'x': 19, 'y': 13, 'state': 0}, {'t': 'lamp_sky', 'x': 10, 'y': 12},
                    {'t': 'lamp_sky', 'x': 20, 'y': 12}, {'t': 'windsock', 'x': 25, 'y': 14},
                    {'t': 'flower_bed', 'x': 0, 'y': 14}, {'t': 'skyflowers', 'x': 8, 'y': 14, 'floor': True},
                    {'t': 'skyflowers', 'x': 18, 'y': 11, 'floor': True}, {'t': 'bridge_post', 'x': 3, 'y': 9},
                    {'t': 'kestrel', 'x': 0, 'y': 4}, {'t': 'bollard', 'x': 10, 'y': 2}, {'t': 'windstone', 'x': 24, 'y': 12}],
          'overhead': [{'t': 'storm_far', 'x': 14, 'y': 0}],
          'actors': [{'x': 13, 'y': 12, 'dir': 'up'}, {'x': 12, 'y': 13, 'dir': 'up', 'who': 'mira'},
                     {'x': 14, 'y': 13, 'dir': 'up', 'who': 'bram'}]}
    return sc


def f1_vane_deck(state):
    W, H = 24, 16
    g = grid(W, H, 'c')
    for y in range(4, 11):
        for x in range(1, 7):
            g[y][x] = 'p'
    for y in range(3, 8):
        for x in range(17, 23):
            g[y][x] = 'g'
    for y in range(8, 9):
        for x in range(17, 23):
            g[y][x] = 'g'
    for y in range(13, 16):
        for x in range(16, 23):
            g[y][x] = 'p'
    lanes = {(x, 8): ('<' if state == 0 else '>') for x in range(7, 17)}
    for y in range(9, 13):
        lanes[(19, y)] = 'v'
    sc = {'name': 'f1_vane_deck_%d' % state, 'legend': {'c': 'cloudbank', 'p': 'skyplank', 'g': 'stormglass'},
          'ground': rows_of(g), 'under': 'skyplank', 'overlays': [], 'map_id': 'ep6_obs_f1',
          'lanes': lanes_of(W, H, lanes), 'lane_state': state, 'no_chevron': [(19, 10)],
          'decor': [{'t': 'vane', 'x': 5, 'y': 6, 'state': state * 4 + (3 if state == 0 else 1)},
                    {'t': 'chimes', 'x': 2, 'y': 5, 'state': 0},
                    {'t': 'gust_mooring', 'x': 19, 'y': 10, 'state': 2 * 3 + 0},
                    {'t': 'signal_lamp', 'x': 21, 'y': 4, 'state': 0}, {'t': 'supply_coffer', 'x': 17, 'y': 14, 'state': 0}],
          'actors': [{'x': 5, 'y': 8, 'dir': 'right'}, {'x': 4, 'y': 8, 'dir': 'right', 'who': 'mira'},
                     {'x': 4, 'y': 9, 'dir': 'up', 'who': 'bram'}]}
    return sc


def f2_ducts_lamp():
    from e2_scenes import carve, depth
    W, H = 22, 14
    g = carve(W, H, [(1, 3, W - 2, H - 2, '.', 2)])
    for y in range(7, 10):
        for x in range(5, 17):
            g[y][x] = 'd'
    rows = depth(g)
    lanes = {(x, 8): '>' for x in range(5, 17)}
    sc = {'name': 'f2_ducts_lamp', 'legend': {'#': 'relay_hall_top', '|': 'relay_hall_face', 'o': 'relay_hall_out_face',
                                              'v': 'relay_hall_out_top', '.': 'relay_grate', 'd': 'duct_shaft'},
          'ground': rows, 'under': 'relay_grate', 'overlays': [], 'map_id': 'ep6_obs_f2', 'bed': 'gust_duct',
          'lanes': lanes_of(W, H, lanes), 'dark': 0.35, 'lamps': [(18, 6, 3), (3, 11, 2)],
          'decor': [{'t': 'fan_vane', 'x': 3, 'y': 7, 'state': 0}, {'t': 'relay', 'x': 7, 'y': 4, 'state': 2},
                    {'t': 'relay', 'x': 9, 'y': 4, 'state': 0}, {'t': 'speaking_tube', 'x': 12, 'y': 4},
                    {'t': 'relay', 'x': 14, 'y': 4, 'state': 1}, {'t': 'signal_lamp', 'x': 18, 'y': 6, 'state': 1},
                    {'t': 'signal_lamp', 'x': 3, 'y': 11, 'state': 1}, {'t': 'feather_grille', 'x': 11, 'y': 11, 'floor': True},
                    {'t': 'crate_dash', 'x': 19, 'y': 11, 'state': 0}],
          'actors': [{'x': 3, 'y': 9, 'dir': 'right'}, {'x': 2, 'y': 9, 'dir': 'right', 'who': 'mira'},
                     {'x': 3, 'y': 10, 'dir': 'up', 'who': 'bram'}]}
    return sc


def f3_ring_storm():
    W, H = 22, 16
    g = grid(W, H, 'c')
    for y in range(3, 12):
        for x in range(5, 17):
            g[y][x] = 's'
    for y in range(4, 6):
        for x in range(9, 13):
            g[y][x] = '#'
    for y in range(6, 8):
        for x in range(9, 13):
            g[y][x] = '|'
    lanes = {}
    for x in range(4, 18):
        lanes[(x, 2)] = '>'
        lanes[(x, 12)] = '<'
    for y in range(2, 13):
        lanes[(17, y)] = 'v'
        lanes[(4, y)] = '^'
    lanes[(17, 2)] = 'v'
    lanes[(4, 12)] = '^'
    for y in range(13, 16):
        for x in range(9, 13):
            g[y][x] = 's'
    sc = {'name': 'f3_ring_storm', 'legend': {'c': 'storm_cloud', 's': 'spire_stone', '#': 'spire_top', '|': 'spire_face'},
          'ground': rows_of(g), 'under': 'spire_stone', 'overlays': [], 'map_id': 'ep6_obs_f3',
          'lanes': lanes_of(W, H, lanes), 'no_chevron': [(10, 12)],
          'tint': 'storm', 'dark': 0.5, 'lamps': [(7, 9, 3), (14, 4, 2)],
          'decor': [{'t': 'lamp_storm', 'x': 7, 'y': 9, 'state': 1}, {'t': 'lamp_storm', 'x': 14, 'y': 4, 'state': 0},
                    {'t': 'gust_mooring', 'x': 10, 'y': 12, 'state': 3 * 3 + 1}, {'t': 'font_wind', 'x': 13, 'y': 10}],
          'actors': [{'x': 10, 'y': 9, 'dir': 'down'}, {'x': 9, 'y': 10, 'dir': 'down', 'who': 'mira'},
                     {'x': 11, 'y': 10, 'dir': 'down', 'who': 'bram'}]}
    return sc


def all_scenes():
    return [airstair_lane_a(), town_board_plaza(), f1_vane_deck(0), f1_vane_deck(1), f2_ducts_lamp(), f3_ring_storm()]


# ====================================================================== run
def run_mocks(db):
    os.makedirs(OUT, exist_ok=True)
    out = {}
    for sc in all_scenes():
        cv = render(sc, db, frame=0)
        arr = finish(cv, sc)
        save_arr(arr, 'mock_%s_3x.png' % sc['name'], 3)
        save_arr(arr, 'mock_%s_x1.png' % sc['name'], 1)
        frame, win, org, s, ox = phone_frame(arr)
        save_arr(frame, 'phone_%s_844x390.png' % sc['name'], 1)
        out[sc['name']] = (sc, cv, arr)
        print('mock', sc['name'], cv.w, cv.h)
    A, B = out['f1_vane_deck_0'][2], out['f1_vane_deck_1'][2]
    gap = np.zeros((A.shape[0], 6, 3), np.float32) + hx('#14101e')
    save_arr(np.concatenate([A, gap, B], 1), 'pair_f1_vane_states_3x.png', 3)
    return out


def cell_box(x, y, x0, y0, s, ox, inset=1):
    px0 = ox + int(round((x * 16 - x0 + inset) * s))
    py0 = int(round((y * 16 - y0 + inset) * s))
    px1 = ox + int(round((x * 16 - x0 + 16 - inset) * s))
    py1 = int(round((y * 16 - y0 + 16 - inset) * s))
    return px0, py0, px1, py1


def checks(db):
    os.makedirs(OUT, exist_ok=True)
    res = {'phone': '844 x 390: the game screen scaled by 390/216 (1.806, nearest) and centred; Rec.709 luma of sRGB',
           'wind_recipe': dict(WIND, bed='gust_lane A1 (gust_duct indoors) on every live lane cell, autotiled against '
                                         'live neighbours', streaks='gust_streak frames dir * 3 + k over the bed')}
    # 1. a live lane against plain cloud (F1's vane deck, both states; the Airstair's lane A)
    lanes = {}
    for sc in (f1_vane_deck(0), f1_vane_deck(1), airstair_lane_a()):
        vals = {'chev': [], 'lane': [], 'cloud': []}
        for frame in (0, 1, 2):
            cv = render(sc, db, frame=frame)
            arr = finish(cv, sc)
            fr, win, (x0, y0), s, ox = phone_frame(arr, cx=12 * 16, cy=8 * 16)
            L = luma(fr)
            cells = lane_cells(sc)
            chev = chevron_cells(sc)
            rows = sc['ground']
            occupied = set()
            for o in sc.get('decor', []):
                occupied.add((o['x'], o['y']))
                occupied.add((o['x'], o['y'] - 1))
            for (x, y) in cells:
                bx = cell_box(x, y, x0, y0, s, ox, inset=0)
                if bx[0] < ox or bx[2] > PHONE_W - ox or bx[1] < 0 or bx[3] > PHONE_H or (x, y) in occupied:
                    continue
                v = float(L[bx[1]:bx[3], bx[0]:bx[2]].mean())
                vals['lane'].append(v)
                if (x, y) in chev:
                    vals['chev'].append(v)
            for y, row in enumerate(rows):
                for x, ch in enumerate(row):
                    if sc['legend'].get(ch) != 'cloudbank' or (x, y) in cells:
                        continue
                    # plain cloud: not beside a deck (a deck's lip is drawn in its own cell, so any cloud cell counts)
                    bx = cell_box(x, y, x0, y0, s, ox, inset=0)
                    if bx[0] < ox or bx[2] > PHONE_W - ox or bx[1] < 0 or bx[3] > PHONE_H or (x, y) in occupied:
                        continue
                    vals['cloud'].append(float(L[bx[1]:bx[3], bx[0]:bx[2]].mean()))
            if frame == 0:
                save_arr(fr, 'check_lane_%s_844x390.png' % sc['name'], 1)
        c, ln, cl = np.mean(vals['chev']), np.mean(vals['lane']), np.mean(vals['cloud'])
        lanes[sc['name']] = {'chevron_cell_luma': round(float(c), 4), 'lane_cell_luma': round(float(ln), 4),
                             'plain_cloud_luma': round(float(cl), 4), 'difference_at_chevrons': round(float(cl - c), 4),
                             'difference_all_lane_cells': round(float(cl - ln), 4), 'need': 0.2,
                             'pass': bool(cl - c >= 0.2), 'frames': 3}
    res['lane_vs_cloud'] = lanes
    # chevron pixel contrast inside the lane (the mark against its own bed)
    sheet = db.sheet('ep6.png')
    bedm = db.terrains['gust_lane']
    bed = sheet.a[bedm['y'] + 32:bedm['y'] + 48, bedm['x'] + 8:bedm['x'] + 24, :3].astype(np.float32) / 255.0
    cm = {}
    for state in (0, 1):
        f = luma(hx(WIND['fill'][state])[None, None, :])[0, 0]
        o = luma(hx(WIND['outline'][state])[None, None, :])[0, 0]
        cm[state] = {'fill_luma': round(float(f), 4), 'outline_luma': round(float(o), 4),
                     'bed_luma': round(float(luma(bed).mean()), 4), 'fill_vs_bed': round(float(f - luma(bed).mean()), 4),
                     'size_game_px': '9 x 9 with the outline (7 x 7 fill)', 'size_phone_px': '%d x %d' % (round(9 * PHONE_H / 216.0), round(9 * PHONE_H / 216.0))}
    res['chevron'] = cm
    # 2. a vane's arrow from two tiles away, each state (the dial on the tile above the pole)
    m = db.objects['vane']
    vanes = {}
    for state in (0, 1):
        for d in ('right', 'up'):
            fx, fy, fw, fh = m['frames'][state * 4 + DIR_I[d]]
            tile = sheet.a[fy:fy + 16, fx:fx + 16].astype(np.float32)
            rgb, al = tile[..., :3] / 255.0, tile[..., 3]
            fill, shade, out, tail = [np.array(c[:3], np.float32) / 255.0 for c in __import__('ep6_props').STATE_COL[state]]
            is_arrow = (np.abs(rgb - fill).sum(-1) < 0.02) | (np.abs(rgb - shade).sum(-1) < 0.02)
            disc_px = (al > 0) & ~is_arrow & (luma(rgb) < 0.35)
            a_l = float(luma(rgb[is_arrow]).mean())
            d_l = float(luma(rgb[disc_px]).mean())
            ys, xs = np.where(is_arrow)
            vanes['state%d_%s' % (state, d)] = {
                'arrow_luma': round(a_l, 4), 'dial_luma': round(d_l, 4), 'difference': round(a_l - d_l, 4),
                'arrow_game_px': '%d x %d' % (xs.max() - xs.min() + 1, ys.max() - ys.min() + 1),
                'arrow_phone_px': '%d x %d' % (round((xs.max() - xs.min() + 1) * PHONE_H / 216.0), round((ys.max() - ys.min() + 1) * PHONE_H / 216.0)),
                'pass': bool(a_l - d_l >= 0.3)}
    res['vane'] = vanes
    res['vane_note'] = ('two tiles away = the party two cells south of the pole; the dial is on the tile above the pole, so '
                        'nothing covers it; the arrow is 13 x 10 game px with its outline (about 23 x 18 phone px; the '
                        'measured light body above) on a dark slate disc 14 px across, '
                        'the two states also differ in colour (white and blue tail, gold and rust tail) like the chevrons')
    # 3. the mooring post against the lane (F1's south lane: the post's body vs the bed cells round it, phone frame)
    sc = f1_vane_deck(1)
    cv = render(sc, db, frame=0)
    arr = finish(cv, sc)
    fr, win, (x0, y0), s, ox = phone_frame(arr, cx=12 * 16, cy=8 * 16)
    L = luma(fr)
    mp = db.objects['gust_mooring']
    pf = mp['frames'][2 * 3]
    post = sheet.a[pf[1]:pf[1] + 32, pf[0]:pf[0] + 16]
    body = np.zeros((32, 16), bool)
    body[8:28, 6:9] = True
    post_l = float(luma(post[..., :3].astype(np.float32)[body] / 255.0).mean())
    bx = cell_box(19, 11, x0, y0, s, ox, inset=2)
    lane_l = float(L[bx[1]:bx[3], bx[0]:bx[2]].mean())
    res['mooring'] = {'post_body_luma': round(post_l, 4), 'lane_bed_luma': round(lane_l, 4),
                      'difference': round(lane_l - post_l, 4), 'pass': bool(lane_l - post_l >= 0.25),
                      'note': 'the post is dark iron (outline and 3 px shaft) with a red pennant streaming downwind'}
    save_arr(fr, 'check_mooring_844x390.png', 1)
    # 4. F3's party floor under the assumed storm tint and dark 0.5 (informational: E6-world owns the tint)
    sc = f3_ring_storm()
    cv = render(sc, db, frame=0)
    arr = finish(cv, sc)
    fr, win, (x0, y0), s, ox = phone_frame(arr)
    L = luma(fr)
    vals = []
    for (x, y) in ((10, 9), (9, 10), (11, 10), (8, 9), (12, 9), (10, 11)):
        bx = cell_box(x, y, x0, y0, s, ox, inset=2)
        vals.append(float(L[bx[1]:bx[3], bx[0]:bx[2]].mean()))
    far = []
    for (x, y) in ((15, 10), (6, 4), (14, 9)):
        bx = cell_box(x, y, x0, y0, s, ox, inset=2)
        far.append(float(L[bx[1]:bx[3], bx[0]:bx[2]].mean()))
    res['f3_floor'] = {'party_floor_luma_lamp_lit': round(float(np.mean(vals)), 4),
                       'floor_away_from_lamps': round(float(np.mean(far)), 4), 'need': 0.22,
                       'assumed_tint': {'storm': TINTS['storm'], 'dark': 0.5},
                       'note': 'informational: E6-world owns the storm tint; with these numbers spire_stone holds 0.22'}
    with open(os.path.join(OUT, 'contrast_check.json'), 'w') as f:
        json.dump(res, f, indent=1)
    print(json.dumps({k: v for k, v in res.items() if k not in ('wind_recipe',)}, indent=1))
    return res
