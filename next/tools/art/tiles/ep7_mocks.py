"""E7-tiles mock rooms and the phone contrast checks (run by ep7_scenes.py; writes out/ep7/).

Mocks (3x and 1x, plus the 844 x 390 phone frame of the game's 384 x 216 screen):
  road_gap_a_0 / _1      the White Road's gap A (plan 4.1, lesson A): the road on firm snow, eight cells of fade, Asta's
                         stone at the near edge; 0 unheld (the ghost trail across the white), 1 held (the road of ice)
  road_gap_b             gap B with two paths: Bo's held (ice) to the ledge, Nyx's unheld (ghost) off it, Asta's stone
                         behind flickering (the oldest held, it goes next)
  ph_square / _lit       Palehaven's square around the hearth (plan 4.3): the mosaic, the hearth cold (and lit), the iced
                         doors, the Vanishing Mark, the Watch at the north end, the cathedral on the skyline
  f1_reread_a / _b       F1's re-read landing (plan 4.6 C) in two states: frost brick and ice glass over the white; a
                         is Arvo's path held and Liesl's ghost, b after the re-read (Liesl held, Arvo flickering)
  f2_grip_held / _let    F2's grip (plan 4.7 B): letter stone in the dark (0.45); held: Dagny's frost door shuts the arch
                         and her lamp pool burns; let: Hob and Runa held (two pools), Dagny dark, the door melted
  f3_remember            F3's Remember landing (plan 4.8) under the aurora tint: the nave floor, the pillars, a held path,
                         a frost door, the aurora band overhead

The name-stone layer here mirrors what E7-world draws (src/data/ep7/field/art.js, wave 7b): a held path cell is the
`icepath` terrain autotiled with its neighbours; an unheld path cell is the fade with the ghost trail (`ghost_trail`
frame 0 north-south, 1 east-west); a stone's frame is 0 dim, 1 lit, 2 the oldest held of two; a frost cell draws
`frost_door` frame 0 while its stone is held, 3 after.

Checks (out/ep7/contrast_check.json, on the rendered 844 x 390 phone frame, THREE PAIRS SEPARATELY, CRITIQUE_8 item 9):
  ghost trail vs fade     the print pixels against the fade round them: at least 0.08 luma
  held path vs fade       held path cells against fade cells: at least 0.2 luma, and textured (luma spread inside a cell)
  snow vs fade            snowfield cells against fade cells: at least 0.1 luma, and textured
  the fade itself         flat: its spread inside a cell is under a tenth of the snow's
  stone states            each state's lamp (the tile above the stone) from two tiles away: dim, lit, flicker high, low
  a frost door            its body against the letter stone round it (F2, held) and against the nave floor (F3)
  F3's party floor        under the assumed aurora tint and dark 0.3 (informational: E7-world owns the tint)
"""
import json, math, os
import numpy as np
from PIL import Image
from pxlib import Canvas, hexc
from ep7_scenes import OUT

# The field's tints the mocks assume. `aurora` is E7-world's tint (plan 5.2); until it lands the mocks assume this cool
# violet multiply with a little desaturation (reported; E7-world owns the real numbers and must keep the floor >= 0.22).
TINTS = {'aurora': ('#8f9ae0', 0.40, 0.12), 'night': ('#262a66', 0.84, 0.42)}
PHONE_W, PHONE_H = 844, 390
GHOST_PTS = ((4, 2), (9, 6), (4, 10), (9, 14))
GHOST_SHAPE = ((0, 0), (1, 0), (0, 1), (1, 1), (0, 2))


def hx(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0


def oklab(rgb):
    c = np.asarray(rgb, np.float64)
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]
    m_ = 0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]
    s = 0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]
    l, m_, s = np.cbrt(l), np.cbrt(m_), np.cbrt(s)
    return np.array([0.2104542553 * l + 0.7936177850 * m_ - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m_ + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m_ - 0.8086757660 * s])


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
    amb = np.array([0.92, 0.92, 1.10]) * (1 - dark)
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


# ====================================================================== the name-stone layer (a mirror of E7-world)
def path_cells(sc):
    out = {}
    for y, row in enumerate(sc.get('paths', [])):
        for x, ch in enumerate(row):
            if ch.isalpha() and ch.islower():
                out[(x, y)] = ch
    return out


def frost_cells(sc):
    out = {}
    for y, row in enumerate(sc.get('frost', [])):
        for x, ch in enumerate(row):
            if ch.isalpha() and ch.isupper():
                out[(x, y)] = ch.lower()
    return out


def apply_remember(sc):
    """Rewrite the scene's ground: held path cells become icepath ('h'), unheld path cells stay fade ('f'); returns the
    unheld cells (for the ghost trail) and the stone and frost decor."""
    held = sc.get('held', [])
    g = [list(r) for r in sc['ground']]
    ghosts = []
    cells = path_cells(sc)
    for (x, y), s in cells.items():
        if s in held:
            g[y][x] = 'h'
        else:
            g[y][x] = 'f'
            ghosts.append((x, y))
    sc['ground'] = [''.join(r) for r in g]
    sc['legend'] = dict(sc['legend'], h='icepath', f='fade')
    decor = list(sc.get('decor', []))
    for st in sc.get('stones', []):
        s = st['stone']
        state = 0
        if s in held:
            state = 2 if (len(held) >= 2 and held[0] == s and sc.get('flicker', True)) else 1
        decor.append({'t': st.get('sprite', 'namestone'), 'x': st['x'], 'y': st['y'], 'state': state})
    for (x, y), s in frost_cells(sc).items():
        decor.append({'t': 'frost_door', 'x': x, 'y': y, 'state': 0 if s in held else 3})
    sc['decor'] = decor
    sc['_ghosts'] = ghosts
    sc['_cells'] = cells
    return sc


def draw_ghosts(cv, db, sc):
    m = db.objects['ghost_trail']
    sheet = db.sheet(m['sheet'])
    cells = sc['_cells']
    for (x, y) in sc['_ghosts']:
        s = cells[(x, y)]
        vert = cells.get((x, y - 1)) == s or cells.get((x, y + 1)) == s
        fx, fy, fw, fh = m['frames'][0 if vert else 1]
        cv.blit(sheet.crop(fx, fy, 16, 16), x * 16, y * 16)


# ====================================================================== render
def render(sc, db, frame=0):
    import x1_preview
    from compose import draw_object, draw_actor, draw_tile, SpriteDB
    if sc.get('paths') and '_cells' not in sc:
        apply_remember(sc)
    base = dict(sc)
    base['frame'] = frame
    base['decor'] = [d for d in sc.get('decor', []) if d.get('floor')]
    base['actors'] = []
    base['overhead'] = []
    cv = x1_preview.render(base, db, map_id=sc.get('map_id'), frame=frame)
    if sc.get('_ghosts'):
        draw_ghosts(cv, db, sc)
    spr = SpriteDB()
    objs = sorted([o for o in sc.get('decor', []) if not o.get('floor')], key=lambda o: (o['y'], o['x']))
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='base')
        elif o['t'] in db.tiles:
            draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    for a in sc.get('actors', []):
        draw_actor(cv, a, spr)
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='overhead')
    for o in sc.get('overhead', []):
        draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    return cv


def aurora_band(arr, k=0, rows=(0, 5)):
    """The aurora overhead layer as a mirror (plan 5.2): a slow soft band across the top rows, never more than +0.05 luma
    between frames (E7-world owns the real layer; this is for the mock)."""
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    y0 = rows[0] * 16 + 30 + 6 * math.sin(k * 2.1)
    band = np.exp(-((yy - (y0 + 10 * np.sin(xx / 70.0 + k))) / 18.0) ** 2) * 0.10
    col = hx('#5fd3a2') * 0.7 + hx('#9062c3') * 0.3
    return np.clip(arr + band[..., None] * col, 0, 1)


def finish(cv, sc):
    arr = cv.a[..., :3].astype(np.float32) / 255.0
    arr = apply_dark(arr, sc)
    arr = apply_tint(arr, sc.get('tint'))
    if sc.get('aurora'):
        arr = aurora_band(arr)
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


def paths_of(W, H, cells):
    g = grid(W, H, '.')
    for (x, y), ch in cells.items():
        g[y][x] = ch
    return rows_of(g)


# ====================================================================== scenes
ROAD_LEGEND = {'f': 'fade', 's': 'snowfield', 'r': 'icepath', 'h': 'icepath', 'p': 'permafrost', 'L': 'frozen_lake'}


def road_gap_a(state):
    """The road climbs north (up) on firm snow, the white gap across rows 4..11, Asta's stone at its near (south) edge."""
    W, H = 24, 18
    g = grid(W, H, 's')
    for y in range(4, 12):
        for x in range(W):
            g[y][x] = 'f'
    for x in (7, 8, 16, 17, 18):          # two snow spurs reaching into the white (the gap's ragged edges)
        g[11][x] = 's'
    g[4][5] = 's'; g[4][6] = 's'; g[4][19] = 's'
    for y in list(range(0, 4)) + list(range(12, H)):
        for x in (11, 12, 13):
            g[y][x] = 'r'
    paths = {(x, y): 'a' for y in range(4, 12) for x in (12, 13)}
    sc = {'name': 'road_gap_a_%d' % state, 'legend': dict(ROAD_LEGEND), 'ground': rows_of(g), 'under': 'snowfield',
          'overlays': [], 'map_id': 'ep7_white_road', 'paths': paths_of(W, H, paths), 'held': ['a'] if state else [],
          'stones': [{'stone': 'a', 'x': 10, 'y': 13}],
          'decor': [{'t': 'black_pine', 'x': 2, 'y': 3}, {'t': 'black_pine', 'x': 19, 'y': 2}, {'t': 'black_pine', 'x': 4, 'y': 16},
                    {'t': 'black_pine', 'x': 18, 'y': 16}, {'t': 'snowbank', 'x': 15, 'y': 14}, {'t': 'snowbank', 'x': 6, 'y': 13},
                    {'t': 'black_pine', 'x': 21, 'y': 15}],
          'actors': [{'x': 12, 'y': 14, 'dir': 'up'}, {'x': 13, 'y': 15, 'dir': 'up', 'who': 'mira'},
                     {'x': 11, 'y': 15, 'dir': 'up', 'who': 'bram'}]}
    return sc


def road_gap_b():
    """Gap B: a ledge in the middle of a wide white; Bo's path (held) runs from the near edge to the ledge, Nyx's
    (unheld, the ghost) from the ledge on north; Asta's stone behind, the oldest held, flickers."""
    W, H = 24, 18
    g = grid(W, H, 'f')
    for y in range(13, H):
        for x in range(W):
            g[y][x] = 's'
    for y in range(0, 3):
        for x in range(W):
            g[y][x] = 's'
    for y in range(6, 10):
        for x in range(13, 19):
            g[y][x] = 's'
    for y in range(13, H):
        for x in (8, 9):
            g[y][x] = 'r'
    for y in range(0, 3):
        for x in (16, 17):
            g[y][x] = 'r'
    paths = {}
    for y in range(10, 13):
        paths[(8, y)] = 'b'; paths[(9, y)] = 'b'
    for x in range(10, 13):
        paths[(x, 10)] = 'b'; paths[(x, 11)] = 'b'
    for y in range(3, 6):
        paths[(16, y)] = 'c'; paths[(17, y)] = 'c'
    sc = {'name': 'road_gap_b', 'legend': dict(ROAD_LEGEND), 'ground': rows_of(g), 'under': 'snowfield', 'overlays': [],
          'map_id': 'ep7_white_road', 'paths': paths_of(W, H, paths), 'held': ['a', 'b'],
          'stones': [{'stone': 'b', 'x': 7, 'y': 14}, {'stone': 'c', 'x': 18, 'y': 7}, {'stone': 'a', 'x': 4, 'y': 16}],
          'decor': [{'t': 'black_pine', 'x': 1, 'y': 15}, {'t': 'black_pine', 'x': 20, 'y': 16},
                    {'t': 'snowbank', 'x': 12, 'y': 15}, {'t': 'black_pine', 'x': 3, 'y': 2}, {'t': 'black_pine', 'x': 21, 'y': 2}],
          'actors': [{'x': 14, 'y': 8, 'dir': 'up'}, {'x': 15, 'y': 9, 'dir': 'up', 'who': 'mira'},
                     {'x': 13, 'y': 9, 'dir': 'left', 'who': 'bram'}]}
    return sc


def ph_square(lit):
    W, H = 28, 18
    g = grid(W, H, 'k')
    for y in range(8, 16):
        for x in range(7, 21):
            g[y][x] = 'm'
    for y in range(0, 3):
        for x in range(W):
            g[y][x] = 's'
    sc = {'name': 'ph_square' + ('_lit' if lit else ''),
          'legend': {'k': 'icebrick', 'm': 'frostmosaic', 's': 'snowfield'}, 'ground': rows_of(g), 'under': 'icebrick',
          'overlays': [], 'map_id': 'ep7_palehaven',
          'decor': [{'t': 'keepers_watch', 'x': 8, 'y': 6}, {'t': 'house_snow_a', 'x': 1, 'y': 7},
                    {'t': 'house_snow_b', 'x': 21, 'y': 7}, {'t': 'lodge_thawlight', 'x': 0, 'y': 16},
                    {'t': 'shop_northwind', 'x': 21, 'y': 16},
                    {'t': 'iced_door', 'x': 1, 'y': 7, 'state': 1 if lit else 0},
                    {'t': 'iced_door', 'x': 24, 'y': 7, 'state': 1 if lit else 0},
                    {'t': 'returning_hearth', 'x': 13, 'y': 12, 'state': 1 if lit else 0},
                    {'t': 'vanishing_mark', 'x': 17, 'y': 10, 'state': 1 if lit else 0},
                    {'t': 'crystal', 'x': 8, 'y': 9}, {'t': 'crystal', 'x': 19, 'y': 14},
                    {'t': 'frostfire', 'x': 9, 'y': 14}, {'t': 'frostfire', 'x': 18, 'y': 9},
                    {'t': 'snowpine', 'x': 5, 'y': 2}, {'t': 'snowpine', 'x': 21, 'y': 2},
                    {'t': 'auroraobelisk', 'x': 10, 'y': 9}],
          'overhead': [{'t': 'cathedral_far', 'x': 14, 'y': 0}],
          'actors': [{'x': 14, 'y': 14, 'dir': 'up'}, {'x': 13, 'y': 15, 'dir': 'up', 'who': 'mira'},
                     {'x': 15, 'y': 15, 'dir': 'up', 'who': 'bram'}]}
    if lit:
        sc['tint'] = None
        sc['glows'] = [(13.5, 11, 3.2)]
    return sc


F1_LEGEND = {'f': 'fade', 'b': 'frostbrick', 'g': 'iceglass', '#': 'vault_wall_top', '|': 'vault_wall_face',
             'o': 'vault_wall_out_face', 'v': 'vault_wall_out_top'}


def f1_reread(which):
    """F1 C: a frost-brick gallery (south) and an iceglass landing (north-east) over the white; Arvo's path from the
    gallery to the landing, Liesl's from the landing on west to a balcony. a: Arvo held, Liesl ghost (Arvo alone, no
    flicker); b: after Liesl's read and a re-read of Arvo... shown as Liesl and Arvo held, Arvo the oldest (flickers)."""
    W, H = 24, 16
    g = grid(W, H, 'f')
    for x in range(W):
        g[0][x] = '#'
        g[1][x] = '|'
        g[2][x] = '|'
    for y in range(11, H):
        for x in range(2, 14):
            g[y][x] = 'b'
    for y in range(5, 10):
        for x in range(15, 21):
            g[y][x] = 'g'
    for y in range(4, 7):
        for x in range(1, 6):
            g[y][x] = 'b'
    paths = {}
    for x in range(14, 17):
        paths[(x, 10)] = 'a'
    for y in range(10, 11):
        paths[(17, y)] = 'a'
    paths[(13, 10)] = 'a'
    for x in range(6, 15):
        paths[(x, 6)] = 'l'
    held = ['a'] if which == 'a' else ['l', 'a']
    sc = {'name': 'f1_reread_%s' % which, 'legend': dict(F1_LEGEND), 'ground': rows_of(g), 'under': 'frostbrick',
          'overlays': [], 'map_id': 'ep7_vault_f1', 'paths': paths_of(W, H, paths), 'held': held,
          'stones': [{'stone': 'a', 'x': 11, 'y': 12, 'sprite': 'name_plate'}, {'stone': 'l', 'x': 19, 'y': 6, 'sprite': 'name_plate'}],
          'decor': [{'t': 'font_thaw', 'x': 3, 'y': 14}, {'t': 'crate_dash_ice', 'x': 2, 'y': 5, 'state': 0}],
          'actors': [{'x': 12, 'y': 13, 'dir': 'up'}, {'x': 11, 'y': 14, 'dir': 'up', 'who': 'mira'},
                     {'x': 13, 'y': 14, 'dir': 'up', 'who': 'bram'}]}
    if which == 'b':
        sc['actors'] = [{'x': 18, 'y': 8, 'dir': 'left'}, {'x': 19, 'y': 8, 'dir': 'left', 'who': 'mira'},
                        {'x': 18, 'y': 9, 'dir': 'up', 'who': 'bram'}]
    return sc


F2_LEGEND = {'#': 'bell_hall_top', '|': 'bell_hall_face', 'o': 'bell_hall_out_face', 'v': 'bell_hall_out_top',
             '.': 'letter_stone', 'f': 'fade'}


def f2_grip(which):
    """F2 B: the grip. Dagny's stone is held on arrival and her frost door shuts the arch between the west room and the
    hall; Hob's and Runa's stones (no paths needed here) lie past it on the near side; letting Dagny go melts the door."""
    from e2_scenes import carve, depth
    W, H = 24, 15
    g = carve(W, H, [(1, 4, 9, H - 2, '.', 2), (11, 4, W - 2, H - 2, '.', 2), (10, 8, 10, 10, '.', 0)])
    rows = depth(g)
    frost = {(10, 8): 'D', (10, 9): 'D', (10, 10): 'D'}
    held = ['d'] if which == 'held' else ['h', 'r']
    stones = [{'stone': 'd', 'x': 6, 'y': 6, 'sprite': 'name_plate'}, {'stone': 'h', 'x': 4, 'y': 11, 'sprite': 'name_plate'},
              {'stone': 'r', 'x': 8, 'y': 12, 'sprite': 'name_plate'}]
    lamps = [(s['x'], s['y'] - 1, 2.4) for s in stones if s['stone'] in held]
    sc = {'name': 'f2_grip_%s' % which, 'legend': dict(F2_LEGEND), 'ground': rows, 'under': 'letter_stone', 'overlays': [],
          'map_id': 'ep7_vault_f2', 'frost': paths_of(W, H, frost), 'held': held, 'flicker': which != 'held',
          'stones': stones, 'dark': 0.45, 'lamps': lamps,
          'decor': [{'t': 'winterwatch_cache', 'x': 19, 'y': 6, 'state': 0}, {'t': 'listening_bell', 'x': 15, 'y': 7, 'state': 0}],
          'actors': [{'x': 6, 'y': 9, 'dir': 'right'}, {'x': 5, 'y': 9, 'dir': 'right', 'who': 'mira'},
                     {'x': 6, 'y': 10, 'dir': 'up', 'who': 'bram'}]}
    sc['paths'] = ['.' * W] * H
    return sc


F3_LEGEND = {'f': 'fade', 'n': 'nave_ice', '#': 'nave_top', '|': 'nave_face', 'o': 'nave_out_face', 'v': 'nave_out_top'}


def f3_remember():
    W, H = 24, 16
    g = grid(W, H, 'f')
    for x in range(W):
        g[0][x] = '#'
        g[1][x] = '|'
        g[2][x] = '|'
    for y in range(10, H):
        for x in range(1, 12):
            g[y][x] = 'n'
    for y in range(4, 9):
        for x in range(14, 23):
            g[y][x] = 'n'
    for y in range(3, 5):
        for x in (17, 18):
            g[y][x] = '|' if y == 3 else g[y][x]
    paths = {}
    for x in range(12, 16):
        paths[(x, 9)] = 'e'
    paths[(11, 9)] = 'e'
    frost = {(18, 8): 'E'}
    sc = {'name': 'f3_remember', 'legend': dict(F3_LEGEND), 'ground': rows_of(g), 'under': 'nave_ice', 'overlays': [],
          'map_id': 'ep7_vault_f3', 'paths': paths_of(W, H, paths), 'frost': paths_of(W, H, frost), 'held': ['e'],
          'stones': [{'stone': 'e', 'x': 9, 'y': 11, 'sprite': 'name_plate'}, {'stone': 'x', 'x': 21, 'y': 6, 'sprite': 'name_plate'}],
          'tint': 'aurora', 'dark': 0.3, 'lamps': [(9, 10, 2.4)], 'aurora': True,
          'decor': [{'t': 'font_thaw', 'x': 3, 'y': 13}],
          'actors': [{'x': 8, 'y': 12, 'dir': 'right'}, {'x': 7, 'y': 12, 'dir': 'right', 'who': 'mira'},
                     {'x': 7, 'y': 13, 'dir': 'up', 'who': 'bram'}]}
    return sc


def all_scenes():
    return [road_gap_a(0), road_gap_a(1), road_gap_b(), ph_square(False), ph_square(True), f1_reread('a'),
            f1_reread('b'), f2_grip('held'), f2_grip('let'), f3_remember()]


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
    for a, b, nm in (('road_gap_a_0', 'road_gap_a_1', 'pair_gap_a'), ('f1_reread_a', 'f1_reread_b', 'pair_f1_reread'),
                     ('f2_grip_held', 'f2_grip_let', 'pair_f2_grip'), ('ph_square', 'ph_square_lit', 'pair_ph_square')):
        A, B = out[a][2], out[b][2]
        gap = np.zeros((A.shape[0], 6, 3), np.float32) + hx('#14101e')
        save_arr(np.concatenate([A, gap, B], 1), '%s_3x.png' % nm, 3)
    return out


def cell_box(x, y, x0, y0, s, ox, inset=1):
    px0 = ox + int(round((x * 16 - x0 + inset) * s))
    py0 = int(round((y * 16 - y0 + inset) * s))
    px1 = ox + int(round((x * 16 - x0 + 16 - inset) * s))
    py1 = int(round((y * 16 - y0 + 16 - inset) * s))
    return px0, py0, px1, py1


def phone_px(gx, gy, x0, y0, s, ox):
    """The phone pixel at the centre of game pixel (gx, gy)."""
    return ox + int((gx - x0 + 0.5) * s), int((gy - y0 + 0.5) * s)


def cells_of(sc, terrain):
    out = []
    for y, row in enumerate(sc['ground']):
        for x, ch in enumerate(row):
            if sc['legend'].get(ch) == terrain:
                out.append((x, y))
    return out


def checks(db):
    os.makedirs(OUT, exist_ok=True)
    res = {'phone': '844 x 390: the game screen scaled by 390/216 (1.806, nearest) and centred; Rec.709 luma of sRGB',
           'ghost_recipe': {'color': '#c3cad6', 'print_px': [2, 3], 'shape': [list(p) for p in GHOST_SHAPE],
                            'at_in_cell': [list(p) for p in GHOST_PTS], 'period': 16,
                            'direction': 'north-south as given; east-west swap x and y (ghost_trail frame 1)',
                            'drawn_on': 'every UNHELD path cell, over the fade, never on a held one'}}
    import ep7_kit
    fade_hex = '#f6f4ee'

    def measure_pairs(sc_unheld, sc_held, frames=(0, 1)):
        vals = {'fade': [], 'fade_spread': [], 'ghost': [], 'ghost_ring': [], 'held': [], 'held_spread': [], 'snow': [],
                'snow_spread': []}
        for frame in frames:
            for sc in (sc_unheld, sc_held):
                cv = render(sc, db, frame=frame)
                arr = finish(cv, sc)
                fr, win, (x0, y0), s, ox = phone_frame(arr, cx=12 * 16 + 8, cy=8 * 16)
                L = luma(fr)
                occupied = set()
                for o in sc.get('decor', []):
                    m = db.objects.get(o['t'])
                    if not m:
                        continue
                    ax, ay = m['anchor']
                    wt, ht = m['rect'][2] // 16, m['rect'][3] // 16
                    for dy in range(ht):
                        for dx in range(wt):
                            occupied.add((o['x'] - ax + dx, o['y'] - ay + dy))
                for a in sc.get('actors', []):
                    occupied.add((a['x'], a['y']))
                    occupied.add((a['x'], a['y'] - 1))

                def ok(b):
                    return b[0] >= ox and b[2] <= PHONE_W - ox and b[1] >= 0 and b[3] <= PHONE_H

                pc = sc['_cells']
                for (x, y) in cells_of(sc, 'fade'):
                    if (x, y) in pc or (x, y) in occupied:
                        continue
                    if any((x + dx, y + dy) in pc or sc['legend'].get(sc['ground'][y + dy][x + dx] if 0 <= y + dy < len(sc['ground']) and 0 <= x + dx < len(sc['ground'][0]) else 'f') != 'fade'
                           for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                        continue        # pure fade: no floor's lip or front face in the cell
                    b = cell_box(x, y, x0, y0, s, ox, inset=0)
                    if ok(b):
                        patch = L[b[1]:b[3], b[0]:b[2]]
                        vals['fade'].append(float(patch.mean()))
                        vals['fade_spread'].append(float(patch.std()))
                if sc is sc_unheld:
                    for (x, y) in sc['_ghosts']:
                        if (x, y) in occupied:
                            continue
                        vert = pc.get((x, y - 1)) == pc[(x, y)] or pc.get((x, y + 1)) == pc[(x, y)]
                        for (fx, fy) in GHOST_PTS:
                            for (dx, dy) in GHOST_SHAPE:
                                px_, py_ = fx + dx, (fy + dy) % 16
                                if not vert:
                                    px_, py_ = py_, px_
                                X, Y = phone_px(x * 16 + px_, y * 16 + py_, x0, y0, s, ox)
                                if ox <= X < PHONE_W - ox and 0 <= Y < PHONE_H:
                                    vals['ghost'].append(float(L[Y, X]))
                else:
                    for (x, y), st in pc.items():
                        if (x, y) in occupied:
                            continue
                        b = cell_box(x, y, x0, y0, s, ox, inset=1)
                        if ok(b):
                            patch = L[b[1]:b[3], b[0]:b[2]]
                            vals['held'].append(float(patch.mean()))
                            vals['held_spread'].append(float(patch.std()))
                for (x, y) in cells_of(sc, 'snowfield'):
                    if (x, y) in occupied:
                        continue
                    b = cell_box(x, y, x0, y0, s, ox, inset=1)
                    if ok(b):
                        patch = L[b[1]:b[3], b[0]:b[2]]
                        vals['snow'].append(float(patch.mean()))
                        vals['snow_spread'].append(float(patch.std()))
                if frame == 0:
                    save_arr(fr, 'check_%s_844x390.png' % sc['name'], 1)
        m = {k: float(np.mean(v)) for k, v in vals.items() if v}
        return m, {k: len(v) for k, v in vals.items()}

    m, n = measure_pairs(road_gap_a(0), road_gap_a(1))
    pairs = {
        'ghost_vs_fade': {'fade_luma': round(m['fade'], 4), 'ghost_print_luma': round(m['ghost'], 4),
                          'difference': round(m['fade'] - m['ghost'], 4), 'need': 0.08,
                          'pass': bool(m['fade'] - m['ghost'] >= 0.08), 'samples': n['ghost']},
        'held_path_vs_fade': {'fade_luma': round(m['fade'], 4), 'held_path_luma': round(m['held'], 4),
                              'difference': round(m['fade'] - m['held'], 4), 'need': 0.2,
                              'texture_spread': round(m['held_spread'], 4),
                              'pass': bool(m['fade'] - m['held'] >= 0.2 and m['held_spread'] > 0.03), 'samples': n['held']},
        'snow_vs_fade': {'fade_luma': round(m['fade'], 4), 'snow_luma': round(m['snow'], 4),
                         'difference': round(m['fade'] - m['snow'], 4), 'need': 0.1,
                         'texture_spread': round(m['snow_spread'], 4),
                         'pass': bool(m['fade'] - m['snow'] >= 0.1 and m['snow_spread'] > 0.03), 'samples': n['snow']},
        'fade_flat': {'fade_spread': round(m['fade_spread'], 4), 'snow_spread': round(m['snow_spread'], 4),
                      'pass': bool(m['fade_spread'] < m['snow_spread'] * 0.1),
                      'note': 'the fade carries no texture a foot could read: its spread under a tenth of the snow\'s'},
        'measured_on': 'road_gap_a_0 (ghost) and road_gap_a_1 (held), frames 0 and 1 of the fade, phone crop centred on the gap',
    }
    res['three_pairs'] = pairs
    # 2. the stone states from two tiles away (the party two cells south of the stone): the lamp on the tile above
    sheet = db.sheet('ep7.png')
    stones = {}
    for oid in ('namestone', 'name_plate'):
        mm = db.objects[oid]
        st = {}
        for k, nm in enumerate(('dim', 'lit', 'flicker_high', 'flicker_low')):
            fx, fy, fw, fh = mm['frames'][k]
            tile = sheet.a[fy:fy + 16, fx:fx + 16].astype(np.float32)
            rgb, al = tile[..., :3] / 255.0, tile[..., 3] / 255.0
            lamp = rgb[2:12, 4:12] * al[2:12, 4:12, None] + hx('#c9d4e3') * (1 - al[2:12, 4:12, None])
            body = sheet.a[fy + 16:fy + 32, fx:fx + 16].astype(np.float32)
            band = body[1:9, 3:13, :3] / 255.0
            st[nm] = {'lamp_luma': round(float(luma(lamp).mean()), 4), 'name_band_luma': round(float(luma(band).mean()), 4)}
        st['lit_minus_dim'] = round(st['lit']['lamp_luma'] - st['dim']['lamp_luma'], 4)
        st['flicker_swing'] = round(st['flicker_high']['lamp_luma'] - st['flicker_low']['lamp_luma'], 4)
        st['pass'] = bool(st['lit_minus_dim'] >= 0.25 and st['flicker_swing'] >= 0.04)
        st['lamp_size'] = {'game_px': '7 x 10 (with the glow about 15 x 15)', 'phone_px': '%d x %d' % (round(7 * PHONE_H / 216.0), round(10 * PHONE_H / 216.0))}
        stones[oid] = st
    stones['note'] = ('two tiles away = the party two cells south of the stone; the lamp is on the tile above the stone, so '
                      'nothing covers it; measured on the sheet frames composited over snow 3 (#c9d4e3); the name band '
                      'on the stone glows gold when held (a second cue), the flicker is a slow 2-frame swing (500 ms)')
    res['stones'] = stones
    # 3. a frost door against its floor (F2 held: letter stone in the dark; F3: nave ice under the aurora)
    fd = {}
    for sc in (f2_grip('held'), f3_remember()):
        cv = render(sc, db, frame=0)
        arr = finish(cv, sc)
        fr, win, (x0, y0), s, ox = phone_frame(arr)
        L = luma(fr)
        fc = list(frost_cells(sc))
        door, floor, dcol, fcol = [], [], [], []
        for (x, y) in fc:
            b = cell_box(x, y, x0, y0, s, ox, inset=3)
            door.append(float(L[b[1]:b[3], b[0]:b[2]].mean()))
            dcol.append(fr[b[1]:b[3], b[0]:b[2]].reshape(-1, 3).mean(0))
        legend_floor = 'letter_stone' if 'f2' in sc['name'] else 'nave_ice'
        for (x, y) in cells_of(sc, legend_floor):
            if min(abs(x - fx) + abs(y - fy) for (fx, fy) in fc) in (1, 2) and (x, y) not in fc:
                b = cell_box(x, y, x0, y0, s, ox, inset=1)
                if b[0] >= ox and b[2] <= PHONE_W - ox and b[3] <= PHONE_H:
                    floor.append(float(L[b[1]:b[3], b[0]:b[2]].mean()))
                    fcol.append(fr[b[1]:b[3], b[0]:b[2]].reshape(-1, 3).mean(0))
        d = float(np.mean(door) - np.mean(floor))
        ok_d = float(np.linalg.norm(oklab(np.mean(dcol, 0)) - oklab(np.mean(fcol, 0))))
        fd[sc['name']] = {'door_luma': round(float(np.mean(door)), 4), 'floor_luma': round(float(np.mean(floor)), 4),
                          'difference': round(d, 4), 'oklab_distance': round(ok_d, 4),
                          'pass': bool(abs(d) >= 0.15 or ok_d >= 0.10),
                          'rule': 'luma at least 0.15 apart, or OKLab at least 0.10 apart (clear blue ice on a pale floor '
                                  'differs in hue, and carries a deep blue outline)'}
        save_arr(fr, 'check_frost_%s_844x390.png' % sc['name'], 1)
    res['frost_door'] = fd
    # 4. F3's party floor under the assumed aurora tint and dark 0.3 (informational)
    sc = f3_remember()
    cv = render(sc, db, frame=0)
    arr = finish(cv, sc)
    fr, win, (x0, y0), s, ox = phone_frame(arr)
    L = luma(fr)
    vals = []
    for (x, y) in ((8, 13), (9, 13), (6, 14), (10, 14), (5, 12)):
        b = cell_box(x, y, x0, y0, s, ox, inset=2)
        vals.append(float(L[b[1]:b[3], b[0]:b[2]].mean()))
    res['f3_floor'] = {'party_floor_luma': round(float(np.mean(vals)), 4), 'need': 0.22,
                       'assumed_tint': {'aurora': TINTS['aurora'], 'dark': 0.3}, 'pass': bool(np.mean(vals) >= 0.22),
                       'note': 'informational: E7-world owns the aurora tint; with these numbers nave_ice holds 0.22'}
    with open(os.path.join(OUT, 'contrast_check.json'), 'w', newline='\n') as f:
        json.dump(res, f, indent=1)
    print(json.dumps({k: v for k, v in res.items() if k not in ('ghost_recipe',)}, indent=1))
    return res
