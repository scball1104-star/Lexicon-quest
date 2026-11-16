"""E8-tiles mock rooms and the phone contrast checks (run by ep8_scenes.py; writes out/ep8/).

Mocks (3x and 1x, plus the 844 x 390 phone frame of the game's 384 x 216 screen). Every map kit with a pop-up book in
it shows the three looks side by side: a book SHUT and faced (its dotted gold ghost showing where its pages will go), a
book OPEN AS A BRIDGE (its pages over the void, a realm model standing on them) and a book OPEN AS A WALL (its pages
landing on floor):
  stair          the Stair of Written Light (plan 4.1): script steps over the void, the reading desk, the South Margin
                 arch and the library_far decal; the Willowmere book open as a bridge
  library_f1     the Catalog of Lost Lives (4.5): parchment and gold-inlay landings, drawer walls, the fountain, a
                 Dash drawer stack; the Hollow book a bridge, the Emberpeak book a wall
  library_f2     the Palimpsest Galleries (4.6) at dark 0.3 with lamp pools: vellum, palimpsest walls; a pair (one
                 ribbon) with the Valewyn book open, its pair shut and faced; the desert book a wall
  library_f3     the Unwritten Page (4.7): blank pages, the shelf shaft, the ink door; the isles book a bridge, the North
                 book a wall
  last_word      the Last Word (4.8) in its violet grade and its gold grade: the dais, the great Lexicon, the first
                 shelf, the star dome overhead
  scriptorium    the square (4.2): the Living Codex, the folio, the register house, half-signs, candle posts, the canal
                 and a marble bridge, book towers, the great door under the library_cliff decal; before and after
                 scriptorium_open

The pop-up layer mirrors what E8-world draws (the recipe handed over): a book's sprite frame = ribbon * 4 + state; its
pages are the page_bridge 9-slice on page cells over the void and the page_wall 9-slice on page cells over floor (the
slice by the cell's neighbours in the same look); the ghost is the page_ghost 9-slice on the pages-to-be; a realm model is
centred on the span, base on its middle row.

Checks (out/ep8/contrast_check.json, on the rendered 844 x 390 phone frame, every pair separately, plan 5.1):
  page vs void         page_bridge cells against void cells: at least 0.35 luma above
  void vs floor        every floor terrain against the void: at least 0.12 above (textured: a spread inside the cell)
  ghost vs void/floor  the ghost's dashes against the void and against each floor: at least 0.15 (the dash's two tones,
                       gold and its dark under-pixel: the better of the two)
  wall vs floor        a standing page wall against the floor beside it: at least 0.15
  F3 floor vs page     the party's floor on F3 (blank_page) at least 0.12 under the page cream; F3's mean above F1's
  Last Word grades     the gold grade at least 0.10 luma over the violet one on the phone crop (the field mock; the
                       battle stage's own numbers are in assets/backdrops/ep8_battle_lastword.json)
"""
import json, math, os
import numpy as np
from PIL import Image
from pxlib import Canvas
from ep8_scenes import OUT
from ep7_mocks import hx, luma, apply_dark, phone_frame, grid, rows_of, cell_box


def save_arr(arr, name, scale):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8))
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    p = os.path.join(OUT, name)
    im.save(p)
    return p

PHONE = '844 x 390: the game screen scaled by 390/216 (1.806, nearest) and centred; Rec.709 luma of sRGB'
# The tints these mocks assume until E8-world lands its own (plan 5.2; E8-world owns the real numbers and must keep the
# party's floor at or above 0.22): `violet` a low warm violet multiply; the gold grade a warm lift.
TINTS = {'violet': ('#8a6ad0', 0.34, 0.08), 'gold': ('#ffd890', 0.0, 0.0)}


def apply_tint(arr, name):
    if name == 'violet':
        col, a, d = TINTS['violet']
        out = arr * (1 - a) + arr * hx(col) * a
        l = luma(out)[..., None]
        return np.clip(out * (1 - d) + l * d, 0, 1)
    if name == 'gold':
        # a warm lift: lightness up on a curve, a little amber
        out = 1 - (1 - arr) ** 1.35
        out = out * np.array([1.06, 1.0, 0.86], np.float32)
        return np.clip(out, 0, 1)
    return arr


# ====================================================================== the pop-up layer
def book_cells(b):
    x, y = b['x'], b['y']
    return [(x, y), (x + 1, y)] if b['axis'] == 'ns' else [(x, y), (x, y + 1)]


def page_cells(b, side):
    """The cells a book's pages cover when read from `side` (they open AWAY from the reader)."""
    x, y, L = b['x'], b['y'], b['length']
    if b['axis'] == 'ns':
        ys = range(y - L, y) if side == 's' else range(y + 1, y + 1 + L)
        return [(xx, yy) for yy in ys for xx in (x, x + 1)]
    xs = range(x - L, x) if side == 'e' else range(x + 1, x + 1 + L)
    return [(xx, yy) for xx in xs for yy in (y, y + 1)]


def slice_of(cells, x, y):
    s = set(cells)
    cx = 0 if (x - 1, y) not in s else (2 if (x + 1, y) not in s else 1)
    cy = 0 if (x, y - 1) not in s else (2 if (x, y + 1) not in s else 1)
    return cx, cy


def draw_slices(cv, db, tid, cells):
    m = db.tiles[tid]
    sheet = db.sheet(m['sheet'])
    for (x, y) in cells:
        cx, cy = slice_of(cells, x, y)
        cv.blit(sheet.crop(m['x'] + cx * 16, m['y'] + cy * 16, 16, 16), x * 16, y * 16)


def is_void(sc, x, y):
    g = sc['ground']
    if not (0 <= y < len(g) and 0 <= x < len(g[0])):
        return True
    return sc['legend'].get(g[y][x]) == 'void_violet'


def lay_books(sc):
    """Resolve each book: its frame, its page cells split into bridge and wall, the ghost cells and the model spot."""
    out = []
    for b in sc.get('books', []):
        r = dict(b)
        st = b['state']                     # 'shut', 'ghost' (shut and faced), 'open'
        r['frame'] = b.get('ribbon', 0) * 4 + (3 if st == 'open' else 0)
        cells = page_cells(b, b['side'])
        r['bridge'] = [c for c in cells if st == 'open' and is_void(sc, *c)]
        r['wall'] = [c for c in cells if st == 'open' and not is_void(sc, *c)]
        r['ghost'] = cells if st == 'ghost' else []
        r['pages'] = cells
        r['model_cells'] = []
        if b.get('realm') and st == 'open':
            xs = [c[0] for c in cells]
            ys = [c[1] for c in cells]
            cx, my = (min(xs) + max(xs) + 1) / 2.0, (min(ys) + max(ys) + 1) / 2.0
            bx0, bx1, by0, by1 = cx * 16 - 16, cx * 16 + 16, my * 16 + 8 - 32, my * 16 + 8
            r['model_cells'] = [c for c in cells if c[0] * 16 < bx1 and c[0] * 16 + 16 > bx0 and c[1] * 16 < by1 and
                                c[1] * 16 + 16 > by0]
        out.append(r)
    sc['_books'] = out
    return out


def draw_popbooks(cv, db, sc, layer):
    from compose import draw_object
    for b in sc['_books']:
        if layer == 'pages':
            if b['bridge']:
                draw_slices(cv, db, 'page_bridge', b['bridge'])
            if b['wall']:
                draw_slices(cv, db, 'page_wall', b['wall'])
        elif layer == 'ghost':
            if b['ghost']:
                draw_slices(cv, db, 'page_ghost', b['ghost'])
        elif layer == 'books':
            sprite = ('popbook_realm' if b.get('realm') else 'popbook') + ('' if b['axis'] == 'ns' else '_ew')
            m = db.objects[sprite]
            ax, ay = m['anchor']
            draw_object(db, cv, {'t': sprite, 'x': b['x'], 'y': b['y'] + (1 if b['axis'] == 'ew' else 0),
                                 'state': b['frame']}, 0, part='base')
            draw_object(db, cv, {'t': sprite, 'x': b['x'], 'y': b['y'] + (1 if b['axis'] == 'ew' else 0),
                                 'state': b['frame']}, 0, part='overhead')
        elif layer == 'models':
            if b.get('realm') and b['state'] == 'open' and not sc.get('no_models'):
                m = db.objects['realm_model']
                k = m['realms'].index(b['realm'])
                fx, fy, fw, fh = m['frames'][k]
                xs = [c[0] for c in b['pages']]
                ys = [c[1] for c in b['pages']]
                cx = (min(xs) + max(xs) + 1) * 8
                my = (min(ys) + max(ys) + 1) * 8
                cv.blit(db.sheet(m['sheet']).crop(fx, fy, fw, fh), cx - fw // 2, my - fh + 8)


def render(sc, db, frame=0):
    import x1_preview
    from compose import draw_object, draw_actor, draw_tile, SpriteDB
    lay_books(sc)
    base = dict(sc)
    base['frame'] = frame
    base['decor'] = []
    base['actors'] = []
    base['overhead'] = []
    cv = x1_preview.render(base, db, map_id=sc.get('map_id'), frame=frame)
    draw_popbooks(cv, db, sc, 'pages')
    draw_popbooks(cv, db, sc, 'ghost')
    spr = SpriteDB()
    objs = sorted(sc.get('decor', []), key=lambda o: (o['y'], o['x']))
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='base')
        elif o['t'] in db.tiles:
            draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    draw_popbooks(cv, db, sc, 'books')
    draw_popbooks(cv, db, sc, 'models')
    for a in sc.get('actors', []):
        draw_actor(cv, a, spr)
    for o in objs:
        if o['t'] in db.objects:
            draw_object(db, cv, o, frame, part='overhead')
    for o in sc.get('overhead', []):
        m = db.tiles.get(o['t'])
        if m and m.get('w', 16) > 16:
            cv.blit(db.sheet(m['sheet']).crop(m['x'], m['y'], m['w'], m['h']), o['x'] * 16, o['y'] * 16)
        elif o['t'] in db.objects:
            om = db.objects[o['t']]
            fx, fy, fw, fh = om['frames'][o.get('state', 0)] if om.get('frames') else om['rect']
            cv.blit(db.sheet(om['sheet']).crop(fx, fy, fw, fh), o['x'] * 16, o['y'] * 16)
        else:
            draw_tile(db, cv, o['t'], o['x'], o['y'], frame)
    return cv


def finish(cv, sc):
    arr = cv.a[..., :3].astype(np.float32) / 255.0
    arr = apply_dark(arr, sc)
    return apply_tint(arr, sc.get('tint'))


# ====================================================================== scenes
def room(W, H, fill):
    return grid(W, H, fill)


def put(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def walls_top(g, W, sys_rows=1, face_rows=2):
    """A wall band along the top: band rows, then face rows (legend '#' and '|')."""
    for y in range(sys_rows):
        for x in range(W):
            g[y][x] = '#'
    for y in range(sys_rows, sys_rows + face_rows):
        for x in range(W):
            g[y][x] = '|'


def party(x, y, d='up'):
    return [{'x': x, 'y': y, 'dir': d}, {'x': x - 1, 'y': y + 1, 'dir': d, 'who': 'mira'},
            {'x': x + 1, 'y': y + 1, 'dir': d, 'who': 'bram'}]


def stair():
    """The Stair (rows top to bottom): the South Margin landing, a void gap with three lanes, the steps below."""
    W, H = 24, 14
    g = room(W, H, 'V')
    put(g, 3, 0, 20, 3, 's')          # the upper landing
    put(g, 3, 8, 20, 13, 's')         # the steps below
    put(g, 15, 4, 20, 7, 's')         # a ledge: Lesson C's pages land on it (a wall)
    put(g, 9, 9, 12, 11, 'd')         # the reading desk's gold landing
    sc = {'name': 'stair', 'legend': {'V': 'void_violet', 's': 'script_step', 'd': 'goldscript'}, 'ground': rows_of(g),
          'under': 'void_violet', 'overlays': [], 'map_id': 'ep8_stair',
          'books': [{'x': 4, 'y': 8, 'axis': 'ns', 'length': 4, 'side': 's', 'state': 'ghost'},
                    {'x': 9, 'y': 8, 'axis': 'ns', 'length': 4, 'side': 's', 'state': 'open', 'realm': 'willowmere'},
                    {'x': 16, 'y': 8, 'axis': 'ns', 'length': 3, 'side': 's', 'state': 'open'}],
          'decor': [{'t': 'reading_desk', 'x': 13, 'y': 11}, {'t': 'margin_arch', 'x': 8, 'y': 3}],
          'overhead': [],
          'actors': [{'x': 4, 'y': 9, 'dir': 'up'}, {'x': 6, 'y': 10, 'dir': 'up', 'who': 'mira'},
                    {'x': 10, 'y': 12, 'dir': 'left', 'who': 'bram'}]}
    sc['measure'] = {'void': [(1, 5), (1, 6), (22, 5), (2, 10), (22, 11), (8, 6)], 'floors': {'script_step': [(19, 12), (18, 12), (5, 1), (6, 1)],
                     'goldscript': [(11, 10), (10, 10)]}}
    return sc


def library_f1():
    W, H = 24, 14
    g = room(W, H, 'V')
    walls_top(g, W)
    put(g, 0, 3, 23, 4, 'p')
    put(g, 0, 9, 23, 13, 'p')
    put(g, 15, 5, 23, 8, 'p')
    put(g, 7, 10, 12, 12, 'g')
    sc = {'name': 'library_f1', 'legend': {'V': 'void_violet', 'p': 'parchment', 'g': 'goldscript', '#': 'drawer_wall_top',
                                          '|': 'drawer_wall_face'},
          'ground': rows_of(g), 'under': 'void_violet', 'overlays': [], 'map_id': 'ep8_library_f1',
          'books': [{'x': 2, 'y': 9, 'axis': 'ns', 'length': 4, 'side': 's', 'state': 'ghost'},
                    {'x': 8, 'y': 9, 'axis': 'ns', 'length': 4, 'side': 's', 'state': 'open', 'realm': 'hollow'},
                    {'x': 17, 'y': 9, 'axis': 'ns', 'length': 3, 'side': 's', 'state': 'open', 'realm': 'emberpeak'}],
          'decor': [{'t': 'restoring_fountain', 'x': 13, 'y': 12}, {'t': 'drawer_stack_dash', 'x': 21, 'y': 4, 'state': 0},
                    {'t': 'drawer_stack_dash', 'x': 22, 'y': 4, 'state': 1}],
          'actors': [{'x': 2, 'y': 10, 'dir': 'up'}, {'x': 4, 'y': 11, 'dir': 'up', 'who': 'mira'},
                     {'x': 9, 'y': 2 + 2, 'dir': 'down', 'who': 'bram'}]}
    sc['measure'] = {'void': [(1, 6), (12, 6), (13, 7), (5, 7)], 'floors': {'parchment': [(20, 11), (21, 11), (1, 12), (2, 12)],
                     'goldscript': [(10, 11), (11, 11)]}}
    return sc


def library_f2():
    W, H = 24, 14
    g = room(W, H, 'V')
    walls_top(g, W)
    put(g, 0, 3, 23, 4, 'v')
    put(g, 0, 9, 23, 13, 'v')
    put(g, 15, 5, 23, 8, 'v')
    sc = {'name': 'library_f2', 'legend': {'V': 'void_violet', 'v': 'vellum', '#': 'palimpsest_wall_top',
                                          '|': 'palimpsest_wall_face'},
          'ground': rows_of(g), 'under': 'void_violet', 'overlays': [], 'map_id': 'ep8_library_f2', 'dark': 0.3,
          'lamps': [(3, 10, 3.0), (11, 11, 3.0), (19, 10, 3.0)],
          'books': [{'x': 2, 'y': 9, 'axis': 'ns', 'length': 4, 'side': 's', 'state': 'ghost', 'ribbon': 1},
                    {'x': 8, 'y': 9, 'axis': 'ns', 'length': 4, 'side': 's', 'state': 'open', 'ribbon': 1, 'realm': 'valewyn'},
                    {'x': 17, 'y': 9, 'axis': 'ns', 'length': 3, 'side': 's', 'state': 'open', 'ribbon': 2, 'realm': 'desert'}],
          'decor': [],
          'actors': [{'x': 2, 'y': 10, 'dir': 'up'}, {'x': 4, 'y': 11, 'dir': 'up', 'who': 'mira'},
                     {'x': 12, 'y': 12, 'dir': 'up', 'who': 'bram'}]}
    sc['measure'] = {'void': [(1, 6), (12, 6), (13, 7), (5, 7)], 'floors': {'vellum': [(20, 11), (21, 11), (1, 12), (2, 12)]}}
    return sc


def library_f3():
    W, H = 24, 14
    g = room(W, H, 'V')
    walls_top(g, W)
    put(g, 0, 3, 23, 4, 'b')
    put(g, 0, 9, 23, 13, 'b')
    put(g, 15, 5, 23, 8, 'b')
    sc = {'name': 'library_f3', 'legend': {'V': 'void_violet', 'b': 'blank_page', '#': 'shelf_shaft_top',
                                          '|': 'shelf_shaft_face'},
          'ground': rows_of(g), 'under': 'void_violet', 'overlays': [], 'map_id': 'ep8_library_f3',
          'books': [{'x': 2, 'y': 9, 'axis': 'ns', 'length': 4, 'side': 's', 'state': 'ghost'},
                    {'x': 8, 'y': 9, 'axis': 'ns', 'length': 4, 'side': 's', 'state': 'open', 'realm': 'isles'},
                    {'x': 17, 'y': 9, 'axis': 'ns', 'length': 3, 'side': 's', 'state': 'open', 'realm': 'north'}],
          'decor': [{'t': 'ink_door', 'x': 19, 'y': 2, 'state': 0}],
          'actors': [{'x': 2, 'y': 10, 'dir': 'up'}, {'x': 4, 'y': 11, 'dir': 'up', 'who': 'mira'},
                     {'x': 12, 'y': 12, 'dir': 'up', 'who': 'bram'}]}
    sc['measure'] = {'void': [(1, 6), (12, 6), (13, 7), (5, 7)], 'floors': {'blank_page': [(20, 11), (21, 11), (1, 12), (2, 12)]}}
    return sc


def popbook_ew_mock():
    """The 1 x 2 book on F1: read from the east, its pages open west over the void (a bridge), and one shut and faced."""
    W, H = 24, 14
    g = room(W, H, 'V')
    walls_top(g, W)
    put(g, 14, 3, 23, 13, 'p')
    put(g, 0, 3, 7, 13, 'p')
    sc = {'name': 'popbook_ew', 'legend': {'V': 'void_violet', 'p': 'parchment', '#': 'drawer_wall_top', '|': 'drawer_wall_face'},
          'ground': rows_of(g), 'under': 'void_violet', 'overlays': [], 'map_id': 'ep8_library_f1',
          'books': [{'x': 14, 'y': 5, 'axis': 'ew', 'length': 6, 'side': 'e', 'state': 'open', 'ribbon': 3, 'realm': 'hollow'},
                    {'x': 14, 'y': 10, 'axis': 'ew', 'length': 6, 'side': 'e', 'state': 'ghost', 'ribbon': 3}],
          'decor': [],
          'actors': [{'x': 15, 'y': 10, 'dir': 'left'}, {'x': 16, 'y': 9, 'dir': 'left', 'who': 'mira'},
                     {'x': 16, 'y': 12, 'dir': 'left', 'who': 'bram'}]}
    sc['measure'] = {'void': [(9, 9), (10, 12)], 'floors': {'parchment': [(20, 12), (21, 12)]}}
    return sc


def last_word(grade):
    W, H = 24, 14
    g = room(W, H, 'V')
    walls_top(g, W)
    put(g, 3, 3, 20, 13, 'g')
    put(g, 0, 7, 23, 13, 'g')
    sc = {'name': 'last_word_' + grade, 'legend': {'V': 'void_violet', 'g': 'goldscript', '#': 'inkwall_top',
                                                   '|': 'inkwall_face'},
          'ground': rows_of(g), 'under': 'void_violet', 'overlays': [], 'map_id': 'ep8_last_word',
          'tint': 'violet' if grade == 'violet' else 'gold', 'dark': 0.2 if grade == 'violet' else 0.0,
          'lamps': [(11, 6, 4.0)],
          'books': [],
          'decor': [{'t': 'great_lexicon', 'x': 10, 'y': 6, 'state': 0 if grade == 'violet' else 6},
                    {'t': 'ep8_first_shelf', 'x': 10, 'y': 9, 'state': 0 if grade == 'violet' else 1}],
          'overhead': [{'t': 'star_dome', 'x': 5, 'y': 0, 'state': 0 if grade == 'violet' else 3}],
          'actors': [{'x': 11, 'y': 11, 'dir': 'up'}, {'x': 10, 'y': 12, 'dir': 'up', 'who': 'mira'},
                     {'x': 12, 'y': 12, 'dir': 'up', 'who': 'bram'}]}
    sc['measure'] = {'floors': {'goldscript': [(4, 10), (5, 10), (18, 10), (19, 10)]}}
    return sc


def scriptorium(opened):
    W, H = 28, 18
    g = room(W, H, 'm')
    put(g, 9, 9, 18, 15, 'q')
    for x in range(W):
        g[8][x] = 'c' if x not in (13, 14) else 'm'
    for y in range(9, 17):
        g[y][7] = 'c' if y not in (12,) else 'm'
        g[y][20] = 'c' if y not in (12,) else 'm'
    put(g, 0, 16, 27, 17, 'l')
    for y in range(0, 3):
        for x in range(W):
            g[y][x] = '#'
    for x in range(W):
        g[3][x] = '|'
        g[4][x] = '|'
    sc = {'name': 'scriptorium' + ('_open' if opened else ''),
          'legend': {'m': 'marble_page', 'q': 'scriptmosaic', 'c': 'ink_canal', 'l': 'letterpath', '#': 'inkwall_top',
                     '|': 'inkwall_face'},
          'ground': rows_of(g), 'under': 'marble_page', 'overlays': [], 'map_id': 'ep8_scriptorium', 'books': [],
          'decor': [{'t': 'library_gate', 'x': 12, 'y': 5, 'state': 2 if opened else 0},
                    {'t': 'tower_index', 'x': 1, 'y': 7}, {'t': 'tower_quiet_rooms', 'x': 22, 'y': 7},
                    {'t': 'living_codex', 'x': 13, 'y': 13},
                    {'t': 'concordance', 'x': 10, 'y': 11, 'state': 2 if opened else 0},
                    {'t': 'bindery_stall', 'x': 21, 'y': 15},
                    {'t': 'half_sign_a', 'x': 9, 'y': 10, 'state': 1 if opened else 0},
                    {'t': 'half_sign_b', 'x': 18, 'y': 10, 'state': 1 if opened else 0},
                    {'t': 'candle_post', 'x': 2, 'y': 16, 'state': 2 if opened else 0},
                    {'t': 'candle_post', 'x': 8, 'y': 16, 'state': 2 if opened else 0},
                    {'t': 'booktower', 'x': 17, 'y': 7}, {'t': 'quill', 'x': 19, 'y': 13},
                    {'t': 'pagefountain', 'x': 15, 'y': 15}, {'t': 'goldscroll', 'x': 9, 'y': 14}],
          'overhead': [{'t': 'library_cliff', 'x': 22, 'y': -3}],
          'actors': [{'x': 13, 'y': 16, 'dir': 'up'}, {'x': 12, 'y': 17, 'dir': 'up', 'who': 'mira'},
                     {'x': 14, 'y': 17, 'dir': 'up', 'who': 'bram'}]}
    for (x, y) in ((13, 8), (14, 8)):
        sc['decor'].append({'t': 'marble_bridge_v_m_w' if x == 13 else 'marble_bridge_v_m_e', 'x': x, 'y': y})
    sc['measure'] = {}
    return sc


def all_scenes():
    return [stair(), library_f1(), library_f2(), library_f3(), popbook_ew_mock(), last_word('violet'), last_word('gold'),
            scriptorium(False), scriptorium(True)]


# ====================================================================== run
def run_mocks(db):
    os.makedirs(OUT, exist_ok=True)
    out = {}
    for sc in all_scenes():
        cv = render(sc, db, frame=0)
        arr = finish(cv, sc)
        save_arr(arr, 'mock_%s_3x.png' % sc['name'], 3)
        frame, win, org, s, ox = phone_frame(arr)
        save_arr(frame, 'phone_%s_844x390.png' % sc['name'], 1)
        out[sc['name']] = (sc, cv, arr)
        print('mock', sc['name'], cv.w, cv.h)
    for a, b, nm in (('last_word_violet', 'last_word_gold', 'pair_last_word'), ('scriptorium', 'scriptorium_open',
                                                                               'pair_scriptorium')):
        A, B = out[a][2], out[b][2]
        gap = np.zeros((A.shape[0], 6, 3), np.float32) + hx('#14101e')
        save_arr(np.concatenate([A, gap, B], 1), '%s_3x.png' % nm, 3)
    return out


def cell_stats(frame, cells, org, s, ox, inset=2):
    vals, spreads = [], []
    for (x, y) in cells:
        x0, y0, x1, y1 = cell_box(x, y, org[0], org[1], s, ox, inset=inset)
        if x1 <= x0 or y1 <= y0 or y0 < 0 or y1 > frame.shape[0]:
            continue
        L = luma(frame[y0:y1, x0:x1])
        vals.append(float(L.mean()))
        spreads.append(float(L.std()))
    if not vals:
        return None, None
    return float(np.mean(vals)), float(np.mean(spreads))


def ghost_pixels(sc, db):
    """Game-pixel positions of the ghost's gold dashes and their under-pixels (from the page_ghost slice art)."""
    m = db.tiles['page_ghost']
    sheet = db.sheet(m['sheet'])
    gold, under = [], []
    from ep8_kit import GD
    G, U = tuple(GD(4)[:3]), tuple(GD(0)[:3])
    for b in sc['_books']:
        cells = b['ghost']
        for (x, y) in cells:
            cx, cy = slice_of(cells, x, y)
            for yy in range(16):
                for xx in range(16):
                    p = sheet.get(m['x'] + cx * 16 + xx, m['y'] + cy * 16 + yy)
                    if p[3] == 255 and tuple(p[:3]) == G:
                        gold.append((x * 16 + xx, y * 16 + yy, (x, y)))
                    elif p[3] == 255 and tuple(p[:3]) == U:
                        under.append((x * 16 + xx, y * 16 + yy, (x, y)))
    return gold, under


def px_luma(frame, gx, gy, org, s, ox):
    X = ox + int((gx - org[0] + 0.5) * s)
    Y = int((gy - org[1] + 0.5) * s)
    if 0 <= Y < frame.shape[0] and 0 <= X < frame.shape[1]:
        return float(luma(frame[Y, X]))
    return None


def checks(db):
    os.makedirs(OUT, exist_ok=True)
    res = {'phone': PHONE, 'floors': {}, 'pairs': {}, 'maps': {}}
    means = {}
    void_l = []
    for sc in all_scenes():
        cv = render(sc, db, frame=0)
        arr = finish(cv, sc)
        frame, win, org, s, ox = phone_frame(arr)
        means[sc['name']] = round(float(luma(win).mean()), 4)
        M = sc.get('measure', {})
        rec = {'mean_luma': means[sc['name']]}
        vl, vs = cell_stats(frame, M.get('void', []), org, s, ox) if M.get('void') else (None, None)
        if vl is not None:
            rec['void'] = {'luma': round(vl, 4), 'spread': round(vs, 4)}
            void_l.append(vl)
        for t, cells in M.get('floors', {}).items():
            fl, fs = cell_stats(frame, cells, org, s, ox)
            rec.setdefault('floors', {})[t] = {'luma': round(fl, 4), 'spread': round(fs, 4)}
            if vl is not None:
                d = fl - vl
                res['pairs']['void_vs_%s_%s' % (t, sc['name'])] = {'difference': round(d, 4), 'floor_textured': fs > 0.01,
                                                                    'pass': d >= 0.12 and fs > 0.01, 'floor': 0.12}
        books = sc.get('_books', [])
        for b in books:
            if b['bridge'] and vl is not None:
                inner = [c for c in b['bridge'] if c not in b['model_cells']] or b['bridge']
                pl, _ = cell_stats(frame, inner, org, s, ox, inset=3)
                res['pairs']['page_vs_void_%s' % sc['name']] = {'page': round(pl, 4), 'void': round(vl, 4),
                                                                 'difference': round(pl - vl, 4), 'pass': pl - vl >= 0.35,
                                                                 'floor': 0.35}
                rec['page_bridge'] = round(pl, 4)
            if b['wall']:
                # the wall's own read, without the realm model standing on it (the model is outlined in ink itself)
                bare = dict(sc, no_models=True)
                fr2, _w, org2, s2, ox2 = phone_frame(finish(render(bare, db, frame=0), bare))
                wl, _ = cell_stats(fr2, b['wall'], org2, s2, ox2, inset=3)
                fl_name, fl_cells = list(M.get('floors', {}).items())[0]
                fl, _ = cell_stats(frame, fl_cells, org, s, ox)
                res['pairs']['wall_vs_floor_%s' % sc['name']] = {'wall': round(wl, 4), 'floor': round(fl, 4),
                                                                  'terrain': fl_name, 'difference': round(abs(wl - fl), 4),
                                                                  'pass': abs(wl - fl) >= 0.15, 'floor_min': 0.15}
            if b['ghost']:
                gold, under = ghost_pixels(sc, db)
                over_void = [p for p in gold if is_void(sc, *p[2])]
                over_floor = [p for p in gold if not is_void(sc, *p[2])]
                gl = [px_luma(frame, gx, gy, org, s, ox) for gx, gy, _ in over_void]
                ul = [px_luma(frame, gx, gy, org, s, ox) for gx, gy, c in under if is_void(sc, *c)]
                if gl and vl is not None:
                    d1 = float(np.mean([v for v in gl if v is not None])) - vl
                    d2 = abs(float(np.mean([v for v in ul if v is not None])) - vl) if ul else 0
                    res['pairs']['ghost_vs_void_%s' % sc['name']] = {'gold': round(d1, 4), 'under': round(d2, 4),
                                                                     'difference': round(max(d1, d2), 4),
                                                                     'pass': max(d1, d2) >= 0.15, 'floor': 0.15}
        res['maps'][sc['name']] = rec
    # the ghost over each floor: a ghost drawn over a strip of that floor (the phone read a player gets facing a closed
    # book whose pages would land on floor), measured the same way
    for t, sc_fn in (('script_step', stair), ('parchment', library_f1), ('vellum', library_f2), ('blank_page', library_f3),
                     ('goldscript', stair)):
        sc = sc_fn()
        ch = [k for k, v in sc['legend'].items() if v == t][0]
        g = [list(r) for r in sc['ground']]
        put(g, 2, 9, 9, 13, ch)
        sc['ground'] = rows_of(g)
        sc['books'] = [{'x': 4, 'y': 13, 'axis': 'ns', 'length': 3, 'side': 's', 'state': 'ghost'}]
        sc['decor'] = []
        sc['actors'] = []
        sc['dark'] = 0
        cv = render(sc, db, frame=0)
        frame, win, org, s, ox = phone_frame(finish(cv, sc))
        fl, _ = cell_stats(frame, [(2, 11), (3, 11), (8, 11)], org, s, ox)
        gold, under = ghost_pixels(sc, db)
        gl = [px_luma(frame, gx, gy, org, s, ox) for gx, gy, _ in gold]
        ul = [px_luma(frame, gx, gy, org, s, ox) for gx, gy, _ in under]
        d1 = abs(float(np.mean([v for v in gl if v is not None])) - fl)
        d2 = abs(float(np.mean([v for v in ul if v is not None])) - fl)
        res['pairs']['ghost_vs_floor_%s' % t] = {'gold': round(d1, 4), 'under': round(d2, 4), 'difference': round(max(d1, d2), 4),
                                                 'pass': max(d1, d2) >= 0.15, 'floor': 0.15}
        save_arr(frame, 'phone_ghost_on_%s_844x390.png' % t, 1)
    f3 = res['maps']['library_f3']
    res['f3'] = {'blank_page': f3['floors']['blank_page']['luma'], 'page': f3.get('page_bridge'),
                 'difference': round(f3.get('page_bridge', 0) - f3['floors']['blank_page']['luma'], 4),
                 'mean_f3': means['library_f3'], 'mean_f1': means['library_f1']}
    res['f3']['pass'] = res['f3']['difference'] >= 0.12 and means['library_f3'] > means['library_f1']
    res['last_word'] = {'violet': means['last_word_violet'], 'gold': means['last_word_gold'],
                        'difference': round(means['last_word_gold'] - means['last_word_violet'], 4)}
    res['last_word']['pass'] = res['last_word']['difference'] >= 0.10
    res['tints_assumed'] = {k: list(v) for k, v in TINTS.items()}
    res['all_pass'] = all(v['pass'] for v in res['pairs'].values()) and res['f3']['pass'] and res['last_word']['pass']
    p = os.path.join(OUT, 'contrast_check.json')
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(res, f, indent=1)
        f.write('\n')
    for k, v in sorted(res['pairs'].items()):
        print('%-40s %+.3f %s' % (k, v['difference'], 'ok' if v['pass'] else 'FAIL'))
    print('f3', res['f3'])
    print('last_word', res['last_word'])
    print('all_pass', res['all_pass'])
    return res
