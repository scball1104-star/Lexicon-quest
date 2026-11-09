"""E5-tiles mock rooms and the phone contrast checks (run by ep5_scenes.py; writes out/ep5/).

Mocks (3x and 1x, plus 2x phone crops of the game's 384 x 216 screen):
  road_flat_noon / road_flat_dawn   the Caravan Road's Glass Flat (plan 4.2 lesson A): noon, the obelisk's short shadow
                                    falls north on pavement and the whole flat runs; dawn, its long shadow crosses the
                                    flat on row 7 and holds a one-tile firm path (the dawn tint on)
  f1_groove_dawn                    F1 C: a standing stone on its groove beside a sand channel, the court walls
  f2_shafts_dawn                    F2 B: two east windows throw long shafts across the sand hall at dawn (roofed, dark
                                    0.4), a pillar on a groove shading the lower shaft
  f3_top_night                      F3's top landing: night, dark 0.55, two lamp pools running the sand, the spring
  haven_plaza                       Saffron Haven's centre (buildings, waystone, bulletin, Moonwell, palms, stalls)
  ship_night                        the Saffron Wind's deck at night (night tint)

Checks (out/ep5/contrast_check.json, the brief's three numbers on a rendered 844 x 390 phone frame: the game's screen
scaled by 390 / 216 and centred, the way a phone held sideways shows it):
  running sand vs firm shaded sand    mean luma difference >= 0.25 (road_flat_dawn: the flat's lit cells vs the cells
                                      under the obelisk's shadow)
  a dial's lit notch from two tiles   the lit notch's luma vs the dial face around it, and its size in phone pixels
  a sun plate lit vs shaded           luma of the plate's lit frame vs its dark frame under the shade layer
"""
import json, math, os
import numpy as np
from PIL import Image
from pxlib import Canvas
from ep5_scenes import OUT, render, lit_cells, SHADE

TINTS = {'dawn': ('#ffd6a6', 0.30, 0.0), 'dusk': ('#c48ab8', 0.46, 0.14), 'night': ('#262a66', 0.84, 0.42),
         'desert_noon': ('#fff1d6', 0.22, 0.0)}
PHONE_W, PHONE_H = 844, 390


def hx(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0


def luma(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def apply_tint(arr, name):
    """src/world/lighting.js order: multiply at alpha, then saturation toward grey at desat (approximated)."""
    if not name or name not in TINTS:
        return arr
    col, a, d = TINTS[name]
    out = arr * (1 - a) + arr * hx(col) * a
    if name == 'desert_noon':
        out = np.clip(out + hx('#fff4dc') * 0.05, 0, 1)
    if d:
        l = luma(out)[..., None]
        out = out * (1 - d) + l * d
    return np.clip(out, 0, 1)


def apply_dark(arr, sc, lit, dark):
    """The field's darkness: an ambient multiply (lighting.js ambientFor) with light where the rule says light falls
    (lamp pools with a soft edge, window shafts on their cells), plus the faint indigo lift."""
    if not dark:
        return arr
    H, W = arr.shape[:2]
    amb = np.array([0.92, 0.90, 1.12]) * (1 - dark)
    lightmap = np.ones((H, W, 3), np.float32) * np.clip(amb, 0, 1)
    full = np.ones(3, np.float32)
    sand = sc.get('sand')
    for (x, y) in lit:
        # window shafts light their whole cells; under lamps only the running sand is lit flat (the rule made visible),
        # the floor around it takes the lamp's soft pool
        if not sc.get('lamps') or (sand and sand[y][x] == 's'):
            lightmap[y * 16:(y + 1) * 16, x * 16:(x + 1) * 16] = full
    for (lx, ly, r) in sc.get('lamps', []):
        cx, cy = lx * 16 + 8, ly * 16 + 8
        rad = (r + 0.9) * 16
        yy, xx = np.mgrid[0:H, 0:W]
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / rad
        k = np.clip(1.25 - d * 1.1, 0, 1)[..., None]
        warm = np.array([1.0, 0.92, 0.78], np.float32)
        lightmap = np.maximum(lightmap, np.clip(amb + (warm - amb) * k, 0, 1))
    out = arr * lightmap
    out = np.clip(out + hx('#1a1430') * dark * 0.5, 0, 1)
    return out


def finish(cv, sc):
    """Tint and darkness over the rendered mock (what the field adds on top), as float RGB."""
    arr = cv.a[..., :3].astype(np.float32) / 255.0
    lit = lit_cells(sc) if (sc.get('dark') or sc.get('lamps')) else set()
    if sc.get('roof') is not None or sc.get('hour') == 'night':
        arr = apply_dark(arr, sc, lit, sc.get('dark', 0))
    arr = apply_tint(arr, sc.get('tint'))
    if sc.get('glows'):
        # lighting.js step 3: additive warm halos on lamps, strong at night (0.22), here a smooth falloff
        H, W = arr.shape[:2]
        yy, xx = np.mgrid[0:H, 0:W]
        add = np.zeros((H, W), np.float32)
        for (gx, gy, r) in sc['glows']:
            d = np.sqrt((xx - gx * 16 - 8) ** 2 + (yy - gy * 16 - 8) ** 2) / (r * 16)
            add = np.maximum(add, np.clip(1 - d, 0, 1) ** 1.5)
        arr = np.clip(arr + add[..., None] * np.array([1.0, 0.72, 0.38]) * 0.22 * 2.2, 0, 1)
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
    (nearest) and centred with the letterbox. Returns (frame, window, (x0, y0) of the window in the mock, scale, ox)."""
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


# ====================================================================== scenes
def road_flat(hour):
    W, H = 26, 15
    rows = []
    for y in range(H):
        r = ''
        for x in range(W):
            if 11 <= x <= 15:
                r += 's'
            elif 6 <= y <= 8 and (x <= 10 or x >= 16):
                r += 'p'
            elif 4 <= y <= 5 and 7 <= x <= 9:
                r += 'p'
            elif x >= 16 and 2 <= y <= 5 and x <= 18:
                r += 'p'
            else:
                r += 'd'
        rows.append(r)
    sc = {'name': 'road_flat_%s' % hour, 'legend': {'d': 'dune_sand', 's': 'dune_sand', 'p': 'caravan_paving'},
          'ground': rows, 'under': 'dune_sand', 'overlays': [], 'hour': hour,
          'sand': [''.join('s' if c == 's' else '.' for c in r) for r in rows],
          'casters': [(16, 7, 3)], 'solid_chars': '',
          'decor': [{'t': 'sundial', 'x': 8, 'y': 5, 'state': {'dawn': 0, 'noon': 1, 'dusk': 2}[hour]},
                    {'t': 'obelisk', 'x': 16, 'y': 7},
                    {'t': 'camp_ruin', 'x': 2, 'y': 3}, {'t': 'low_block', 'x': 21, 'y': 11},
                    {'t': 'sun_plate', 'x': 17, 'y': 3, 'state': 1 if hour == 'noon' else 1, 'floor': True},
                    {'t': 'camel_load', 'x': 4, 'y': 10}],
          'actors': [{'x': 9, 'y': 7, 'dir': 'right'}, {'x': 8, 'y': 8, 'dir': 'right', 'who': 'mira'},
                     {'x': 17, 'y': 6, 'dir': 'down', 'who': 'bram'}],
          'tint': {'dawn': 'dawn', 'noon': 'desert_noon', 'dusk': 'dusk'}[hour]}
    return sc


def walled(name, sys_id, floor, W, H, paint, **kw):
    from e2_scenes import carve, depth
    g = carve(W, H, [(1, 3, W - 2, H - 2, '.', 2)])
    paint(g)
    rows = depth(g)
    legend = {'#': sys_id + '_top', '|': sys_id + '_face', 'o': sys_id + '_out_face', 'v': sys_id + '_out_top',
              '.': floor, 's': 'dune_sand', 'p': 'caravan_paving', 'g': 'groove', 'c': 'star_glass'}
    sc = {'name': name, 'legend': legend, 'ground': rows, 'under': floor, 'overlays': [], 'map_id': kw.pop('map_id', None),
          'sand': [''.join('s' if c == 's' else '.' for c in r) for r in rows]}
    sc.update(kw)
    return sc


def f1_groove(hour):
    def paint(g):
        for y in range(5, 12):
            for x in range(4, 9):
                g[y][x] = 's'
        for y in range(5, 10):
            g[y][13] = 'g'
        for x in range(13, 18):
            g[7][x] = 'g' if x != 13 else g[7][x]
    sc = walled('f1_groove_%s' % hour, 'dune_court', 'dune_court', 22, 14, paint, map_id='ep5_lab_f1', hour=hour,
                casters=[(13, 6, 2)], decor=[{'t': 'standing_stone', 'x': 13, 'y': 6}, {'t': 'sundial', 'x': 17, 'y': 11, 'state': 0},
                                             {'t': 'obelisk_scraped', 'x': 2, 'y': 5}, {'t': 'font_oasis', 'x': 18, 'y': 6},
                                             {'t': 'sun_plate', 'x': 10, 'y': 11, 'state': 2, 'floor': True}],
                actors=[{'x': 14, 'y': 7, 'dir': 'left'}, {'x': 15, 'y': 8, 'dir': 'left', 'who': 'mira'},
                        {'x': 16, 'y': 7, 'dir': 'left', 'who': 'bram'}],
                tint='dawn' if hour == 'dawn' else ('dusk' if hour == 'dusk' else 'desert_noon'), solid_chars='#|ov')
    return sc


def f2_shafts():
    W, H = 24, 15

    def paint(g):
        for y in range(5, 13):
            for x in range(4, 18):
                g[y][x] = 's'
        for x in range(18, 22):
            g[6][x] = 'p'
            g[10][x] = 'p'
        for x in range(7, 11):
            g[10][x] = 'g'
        for y in range(5, 13):
            g[y][2] = 'p'
            g[y][3] = 'p'
    sc = walled('f2_shafts_dawn', 'horizon_gallery', 'gallery_tile', W, H, paint, map_id='ep5_lab_f2', hour='dawn', dark=0.4)
    sc['roof'] = ['#' * W for _ in range(H)]
    sc['windows'] = [(W - 1, 6, 'west', ['dawn'], 12), (W - 1, 10, 'west', ['dawn'], 18)]
    sc['casters'] = [(9, 10, 2)]
    sc['decor'] = [{'t': 'pillar_gallery', 'x': 9, 'y': 10}, {'t': 'window_horizon', 'x': W - 1, 'y': 6, 'state': 1},
                   {'t': 'window_horizon', 'x': W - 1, 'y': 10, 'state': 1}, {'t': 'window_horizon', 'x': 0, 'y': 8, 'state': 0},
                   {'t': 'painted_horizon', 'x': 5, 'y': 2, 'state': 0}, {'t': 'painted_horizon', 'x': 13, 'y': 2, 'state': 2},
                   {'t': 'sundial', 'x': 3, 'y': 12, 'state': 0}, {'t': 'star_floor', 'x': 19, 'y': 13, 'floor': True, 'state': 1}]
    sc['actors'] = [{'x': 2, 'y': 8, 'dir': 'right'}, {'x': 2, 'y': 9, 'dir': 'right', 'who': 'mira'},
                    {'x': 3, 'y': 7, 'dir': 'right', 'who': 'bram'}]
    return sc


def f3_top():
    W, H = 24, 15

    def paint(g):
        for y in range(6, 13):
            for x in range(3, 21):
                if (x in range(3, 10) or x in range(14, 21)) and y >= 8:
                    g[y][x] = 's'
        for x in range(4, 9):
            g[6][x] = 'g'
    sc = walled('f3_top_night', 'well_shaft', 'well_basalt', W, H, paint, map_id='ep5_lab_f3', hour='night', dark=0.55)
    sc['lamps'] = [(6, 6, 3), (17, 8, 3)]
    sc['decor'] = [{'t': 'lamp_cart', 'x': 6, 'y': 6}, {'t': 'lamp_cart', 'x': 17, 'y': 8},
                   {'t': 'font_oasis', 'x': 11, 'y': 6}, {'t': 'vow_stone', 'x': 13, 'y': 5, 'state': 0},
                   {'t': 'spring', 'x': 11, 'y': 11, 'state': 0}, {'t': 'standing_stone', 'x': 20, 'y': 6}]
    sc['casters'] = [(20, 6, 2)]
    sc['actors'] = [{'x': 11, 'y': 8, 'dir': 'down'}, {'x': 10, 'y': 9, 'dir': 'down', 'who': 'mira'},
                    {'x': 12, 'y': 9, 'dir': 'down', 'who': 'bram'}]
    return sc


def haven_plaza():
    W, H = 34, 20
    rows = []
    for y in range(H):
        r = ''
        for x in range(W):
            if y >= 17 and x <= 6:
                r += 'w'
            elif 4 <= y <= 16 or (8 <= x <= 25):
                r += 'p'
            else:
                r += 'd'
        rows.append(r)
    sc = {'name': 'haven_plaza', 'legend': {'d': 'dune_sand', 'p': 'caravan_paving', 'w': 'water'}, 'ground': rows,
          'under': 'caravan_paving', 'overlays': [],
          'decor': [{'t': 'inn_lantern', 'x': 0, 'y': 8}, {'t': 'tower_armillary', 'x': 26, 'y': 6},
                    {'t': 'armillary', 'x': 26, 'y': 0}, {'t': 'shop_cloth', 'x': 10, 'y': 5},
                    {'t': 'smithy_copper', 'x': 27, 'y': 15}, {'t': 'arcade_serai', 'x': 16, 'y': 5},
                    {'t': 'mural_stars', 'x': 17, 'y': 4},
                    {'t': 'moonwell', 'x': 16, 'y': 11, 'state': 1}, {'t': 'waystone', 'x': 13, 'y': 15, 'state': 3},
                    {'t': 'bulletin', 'x': 20, 'y': 15, 'state': 0}, {'t': 'palm', 'x': 14, 'y': 11}, {'t': 'palm', 'x': 22, 'y': 11},
                    {'t': 'stall_saffron', 'x': 9, 'y': 12}, {'t': 'stall_indigo', 'x': 2, 'y': 14},
                    {'t': 'camel_rest', 'x': 23, 'y': 17}, {'t': 'camel_load', 'x': 25, 'y': 17},
                    {'t': 'lamp_brass', 'x': 12, 'y': 9}, {'t': 'lamp_brass', 'x': 24, 'y': 9},
                    {'t': 'bell_rack', 'x': 30, 'y': 17, 'state': 2}, {'t': 'water_stair', 'x': 7, 'y': 17}],
          'actors': [{'x': 17, 'y': 14, 'dir': 'up'}, {'x': 16, 'y': 15, 'dir': 'up', 'who': 'mira'},
                     {'x': 18, 'y': 15, 'dir': 'up', 'who': 'bram'}]}
    return sc


def ship_night():
    W, H = 28, 14
    rows = []
    for y in range(H):
        r = ''
        for x in range(W):
            inside = 3 <= y <= 10 and (2 <= x <= 25) and not ((x <= 3 or x >= 24) and (y in (3, 10)))
            if inside and y in (3, 10) and 4 <= x <= 23:
                r += 'r'
            else:
                r += 'k' if inside else 'n'
        rows.append(r)
    sc = {'name': 'ship_night', 'legend': {'k': 'deck_planks', 'n': 'night_sea', 'r': 'ship_rail'}, 'ground': rows,
          'under': 'deck_planks', 'under_map': {'r': 'deck_planks'}, 'overlays': [],
          'decor': [{'t': 'mast', 'x': 13, 'y': 7}, {'t': 'ship_lantern', 'x': 6, 'y': 5}, {'t': 'ship_lantern', 'x': 20, 'y': 5},
                    {'t': 'crates_lashed', 'x': 8, 'y': 9}, {'t': 'crate_lashed', 'x': 18, 'y': 9}, {'t': 'hatch', 'x': 16, 'y': 6},
                    {'t': 'ship_wheel', 'x': 4, 'y': 6}, {'t': 'gangway', 'x': 3, 'y': 11}],
          'actors': [{'x': 22, 'y': 6, 'dir': 'right', 'who': 'bram'}, {'x': 10, 'y': 6, 'dir': 'right'},
                     {'x': 11, 'y': 5, 'dir': 'up', 'who': 'mira'}],
          'hour': 'night', 'dark': 0.0, 'tint': 'night', 'glows': [(6, 4, 3.6), (20, 4, 3.6)]}
    return sc


def all_scenes():
    return [road_flat('noon'), road_flat('dawn'), f1_groove('dawn'), f1_groove('noon'), f2_shafts(), f3_top(), haven_plaza(),
            ship_night()]


# ====================================================================== window light (plan 4.5, for the roofed mock)
_lit_base = lit_cells


def lit_with_windows(sc):
    lit = _lit_base(sc)
    rows = sc['ground']
    H, W = len(rows), len(rows[0])
    cast_at = {(x, y) for (x, y, h) in sc.get('casters', [])}
    for (wx, wy, faces, hours, reach) in sc.get('windows', []):
        if sc.get('hour') not in hours:
            continue
        dx, dy = {'west': (-1, 0), 'east': (1, 0), 'north': (0, -1), 'south': (0, 1)}[faces]
        x, y = wx + dx, wy + dy
        k = 0
        while k < reach and 0 <= x < W and 0 <= y < H:
            if rows[y][x] in '#|ov' or (x, y) in cast_at:
                break
            lit.add((x, y))
            x += dx
            y += dy
            k += 1
    return lit


import ep5_scenes
ep5_scenes.lit_cells = lit_with_windows


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
        save_arr(win, 'phone_%s_2x.png' % sc['name'], 2)
        save_arr(frame, 'phone_%s_844x390.png' % sc['name'], 1)
        out[sc['name']] = (sc, cv, arr)
        print('mock', sc['name'], cv.w, cv.h)
    for a, b, name in (('road_flat_noon', 'road_flat_dawn', 'pair_road_noon_dawn'),):
        A, B = out[a][2], out[b][2]
        gap = np.zeros((A.shape[0], 6, 3), np.float32) + hx('#14101e')
        save_arr(np.concatenate([A, gap, B], 1), name + '_3x.png', 3)
    return out


def checks(db):
    os.makedirs(OUT, exist_ok=True)
    res = {'phone': '844 x 390: the game screen scaled by 390/216 (1.806, nearest) and centred; Rec.709 luma of sRGB',
           'shade_recipe': dict(SHADE, how='E5-world src/data/ep5/field/art.js: per shaded cell a flat wash, then a 50% '
                                             'checker of dot, then a 1 px rim on the sides that meet light')}
    # 1. running sand vs firm shaded sand (road_flat_dawn: the flat x 11..15; shaded = row 7, lit = rows 2..5 and 9..12)
    for hour in ('dawn', 'noon'):
        sc = road_flat(hour)
        cv = render(sc, db, frame=0)
        arr = finish(cv, sc)
        lit = lit_cells(sc)
        frame, win, (x0, y0), s, ox = phone_frame(arr, cx=13 * 16, cy=7 * 16 + 8)
        L = luma(frame)

        def cell_mean(cells):
            vals = []
            for (x, y) in cells:
                px0 = ox + int(round((x * 16 - x0 + 2) * s))
                py0 = int(round((y * 16 - y0 + 2) * s))
                px1 = ox + int(round((x * 16 - x0 + 14) * s))
                py1 = int(round((y * 16 - y0 + 14) * s))
                if 0 <= py0 and py1 <= PHONE_H and ox <= px0 and px1 <= PHONE_W - ox:
                    vals.append(L[py0:py1, px0:px1].mean())
            return float(np.mean(vals)) if vals else None
        run = [(x, y) for x in range(11, 16) for y in range(0, 15) if (x, y) in lit]
        held = [(x, y) for x in range(11, 16) for y in range(0, 15) if (x, y) not in lit]
        a, b = cell_mean(run), cell_mean(held)
        res['sand_%s' % hour] = {'running_luma': round(a, 4) if a is not None else None,
                                 'firm_shaded_luma': round(b, 4) if b is not None else None,
                                 'difference': round(a - b, 4) if (a is not None and b is not None) else None,
                                 'need': 0.25, 'tint': sc['tint'], 'cells_running': len(run), 'cells_held': len(held)}
        if a is not None and b is not None:
            res['sand_%s' % hour]['pass'] = bool(a - b >= 0.25)
        save_arr(frame, 'check_sand_%s_844x390.png' % hour, 1)
    # 2. the dial's lit notch, from two tiles away: notch vs the face ring around it, on the phone frame, all three hours
    import compose
    sheet = db.sheet('ep5.png')
    m = db.objects['sundial']
    dials = {}
    for k, hour in enumerate(('dawn', 'noon', 'dusk')):
        fx, fy, fw, fh = m['frames'][k]
        tile = sheet.a[fy:fy + 16, fx:fx + 16, :3].astype(np.float32) / 255.0
        tile = apply_tint(tile, {'dawn': 'dawn', 'noon': 'desert_noon', 'dusk': 'dusk'}[hour])
        at = {'dawn': (2, 8), 'noon': (8, 2), 'dusk': (13, 8)}[hour]
        nx, ny = at
        notch = luma(tile[ny - 1:ny + 2, nx - 1:nx + 2]).mean()
        face = []
        for (x, y) in ((8, 10), (6, 11), (10, 11), (8, 6), (5, 7), (11, 7)):
            face.append(luma(tile[y, x]))
        others = []
        for h2, (ox2, oy2) in (('dawn', (2, 8)), ('noon', (8, 2)), ('dusk', (13, 8))):
            if h2 != hour:
                others.append(luma(tile[oy2 - 1:oy2 + 1, ox2 - 1:ox2 + 1]).mean())
        dials[hour] = {'lit_notch_luma': round(float(notch), 4), 'face_luma': round(float(np.mean(face)), 4),
                       'unlit_notch_luma': round(float(np.mean(others)), 4),
                       'notch_vs_face': round(float(notch - np.mean(face)), 4),
                       'notch_vs_unlit': round(float(notch - np.mean(others)), 4),
                       'notch_phone_px': '%dx%d lit (3x3 game px, 5x5 with its outline)' % (round(3 * PHONE_H / 216.0), round(3 * PHONE_H / 216.0)),
                       'pass': bool(notch - np.mean(face) >= 0.25)}
    res['dial'] = dials
    res['dial_note'] = ('two tiles away = the party two cells south of the stand; the face is on the tile above the stand, so '
                        'nothing covers it. The lit notch is 3x3 game px (about 5x5 phone px) in a dark 5x5 socket, the '
                        'unlit ones 2x2 and dim.')
    # 3. the sun plate: lit frame vs dark frame under the shade layer (what a plate in shade shows)
    m = db.objects['sun_plate']
    plates = {}
    for kind, (lf, df) in (('sun', (1, 0)), ('moon', (3, 2))):
        def frame_luma(i, shaded):
            fx, fy, fw, fh = m['frames'][i]
            tile = Canvas.from_array(sheet.a[fy:fy + 16, fx:fx + 16].copy())
            base = Canvas(16, 16, fill=(0xc0, 0x8a, 0x45, 255))
            base.blit(tile, 0, 0)
            if shaded:
                from ep5_scenes import shade_layer
                shade_layer(base, {'ground': ['.'], 'hour': 'noon', 'solid_chars': ''}, set())
            a = base.a[3:13, 3:13, :3].astype(np.float32) / 255.0
            return float(luma(a).mean())
        on = frame_luma(lf, kind == 'moon')
        off = frame_luma(df, kind == 'sun')
        # and the same pair with the plate drawn above the shade (if E5-world draws objects over it)
        on2, off2 = frame_luma(lf, False), frame_luma(df, False)
        plates[kind] = {'active_luma': round(on, 4), 'idle_luma': round(off, 4), 'difference': round(on - off, 4),
                        'unshaded_pair': {'active': round(on2, 4), 'idle': round(off2, 4), 'difference': round(on2 - off2, 4)},
                        'how': ('sun: lit frame in the sun vs dark frame under the shade layer' if kind == 'sun' else
                                'moon: lit frame under the shade layer (a when:shade plate glows in shade) vs dark frame in the sun'),
                        'pass': bool(max(on - off, on2 - off2) >= 0.2)}
    res['plates'] = plates
    with open(os.path.join(OUT, 'contrast_check.json'), 'w') as f:
        json.dump(res, f, indent=1)
    print(json.dumps(res, indent=1))
    return res
