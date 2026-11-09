"""E5-maps-b previews: the Oracle Labyrinth's three floors and the Eye of the Oracle, one image per state that matters
(the hour is the point of these maps): annotated at 2x, clean at 2x, plain 1x, and the phone frame (844 x 390, the game's
384 x 216 window round the map's focus, scaled as a phone held sideways shows it).

    python tools/maps/previews/ep5_lab_render.py                 # every variant below, into tools/maps/previews/
    python tools/maps/previews/ep5_lab_render.py ep5_lab_f2      # one map (all its variants)
    python tools/maps/previews/ep5_lab_render.py --scale=3

Why a script of its own: tools/maps/preview.py draws neither the ep5 fragment's shade nor any hour. This one reuses
preview.render() on EP5DB (tools/art/tiles/ep5_scenes.py: tiles.json + x1 + ep4 + ep5 fragments) and adds, per state:
  - the light by the pack's own rule, as the field sees it (qa/maps/ep5_b_lib.mjs stateOf: src/data/ep5/field/shade.js
    with the field's stoppers): running_sand over every lit sand cell, E5-world's violet shade over every shaded cell on
    open sky (ep5_scenes.shade_layer), both drawn under the objects and actors;
  - the shade events as their sprites at the state's cells (dials at the hour, stones and lamps where they stand, windows
    lit or dark, plates glowing or not, sun gates open or shut);
  - the field's darkness and the hour's tint on top (ep5_mocks.apply_dark / apply_tint: dark maps lit only where the rule
    says, lamp pools, window shafts; dawn, desert_noon, dusk, night).
Prints the mean luma of each image (Rec. 709 on sRGB, the whole map and its floor cells), the F2 / F3 darkness measure.
"""
import copy, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.normpath(os.path.join(HERE, '..'))
NEXT = os.path.normpath(os.path.join(MAPS, '..', '..'))
sys.path.insert(0, MAPS)
import preview as P                                    # noqa: E402  (puts tools/art/tiles on sys.path)
import numpy as np                                     # noqa: E402
from PIL import Image                                  # noqa: E402
from ep5_scenes import EP5DB, shade_layer              # noqa: E402
import ep5_mocks as MK                                 # noqa: E402
from compose import terrain_cell                       # noqa: E402

SPRITES = os.path.join(NEXT, 'assets', 'sprites')
STONE = {1: 'low_block', 2: 'standing_stone', 3: 'obelisk'}
HOURS = ['dawn', 'noon', 'dusk']


def dump(map_id, opts):
    r = subprocess.run(['node', 'qa/maps/ep5_b_lib.mjs', 'dump', map_id, json.dumps(opts)], cwd=NEXT, capture_output=True,
                       text=True, timeout=120)
    if r.returncode != 0:
        raise SystemExit('node failed: ' + r.stderr.strip()[-2000:])
    return json.loads(r.stdout)


class EP5Atlases(P.Atlases):
    def __init__(self):
        super().__init__()
        self.e5n = self._load('ep5_npcs.json')
        self.e5e = self._load('ep5_enemies_field.json')

    def npc_frame(self, sprite, d='down'):
        return super().npc_frame(sprite, d) or self._npc_frame_in(self.e5n[0], self.e5n[1], sprite, d)

    def enemy_frame(self, sprite):
        fr = super().enemy_frame(sprite)
        if fr:
            return fr
        meta, img = self.e5e
        info = meta['sprites'].get(sprite)
        if info and sprite + '_0' in meta['frames']:
            return img.crop(*meta['frames'][sprite + '_0']), info['origin'], False
        return None


def skin(mp, st, flags):
    """The drawn copy: shade events as objects at the state's cells, gates and doors by state."""
    mp = copy.deepcopy(mp)
    hour = st['hour']
    open_ = set(st['open'])
    plate_on = {p['id']: p['on'] for p in st['plates']}
    absent = set(st['absent'])
    k = HOURS.index(hour) if hour in HOURS else 1
    events = []
    for e in mp['events']:
        t = e['type']
        if not P.present(e, flags) or e['id'] in absent:
            continue
        if t == 'sundial':
            mp['decor'].append({'t': e.get('sprite', 'sundial'), 'x': e['x'], 'y': e['y'], 'state': k})
            continue
        if t in ('standstone', 'lampcart'):
            x, y = st['pos'].get(e['id'], [e['x'], e['y']])
            sid = e.get('sprite') or ('lamp_cart' if t == 'lampcart' else STONE[e.get('h', 2)])
            mp['decor'].append({'t': sid, 'x': x, 'y': y})
            continue
        if t == 'window':
            on = hour in (e.get('hours') or [])
            if e.get('faces') != 'down':
                mp['decor'].append({'t': e.get('sprite', 'window_horizon'), 'x': e['x'], 'y': e['y'], 'state': 1 if on else 0})
            continue
        if t == 'sunplate':
            base = 2 if e.get('when') == 'shade' else 0
            mp['decor'].append({'t': e.get('sprite', 'sun_plate'), 'x': e['x'], 'y': e['y'], 'state': base + (1 if plate_on.get(e['id']) else 0)})
            continue
        if t == 'gate' and e['id'] in open_:
            e = dict(e, state='open')
        if t == 'locked_door' and e['id'] in open_:
            mp['decor'].append({'t': '%s_open' % e.get('sprite', 'door_key'), 'x': e['x'], 'y': e['y']})
            continue
        if t == 'object' and e.get('breakable') and e['id'] in open_:
            continue
        if t in ('sign', 'save', 'book') and e.get('sprite'):
            mp['decor'].append({'t': e['sprite'], 'x': e['x'], 'y': e['y'], 'state': e.get('state', 0)})
        events.append(e)
    mp['events'] = events
    return mp


def hexc(h, a):
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), int(round(a * 255)))


def render_state(db, spr, atl, mp, st, flags):
    drawn = skin(mp, st, flags)
    full = P.render(drawn, db, spr, atl, npc_map={}, flags=flags)
    bare = dict(drawn, decor=[], events=[], overhead=[], start=None)
    ground = P.render(bare, db, spr, atl, npc_map={}, flags=flags)
    A = full.a.copy()
    changed = np.any(full.a != ground.a, axis=2)      # pixels an object, actor or decal covers: drawn as rendered
    B = ground
    H, W = len(mp['ground']), len(mp['ground'][0])
    grid = [[None] * W for _ in range(H)]
    for x, y in st['running']:
        grid[y][x] = 'running_sand'
    for x, y in st['running']:
        t = terrain_cell(db, grid, x, y, 0)
        if t:
            B.blit(t, x * 16, y * 16)
    roofed = bool(mp.get('shade', {}).get('roof'))
    if not roofed and st['hour'] in HOURS:
        lit = {tuple(c) for c in st['lit']}
        # the shade layer: every cell nothing lights and the rule shades (walls excluded by its own test)
        shade = {tuple(c) for c in st['shade']}
        sc = {'ground': mp['ground'], 'hour': st['hour'], 'solid_chars': '#|ov'}
        allc = {(x, y) for y in range(H) for x in range(W)}
        shade_layer(B, sc, allc - shade)
    out = np.where(changed[..., None], A, B.a)
    return out


def finish(arr, mp, st):
    """Darkness and the hour's tint over the composed map (what the field adds on top), as float RGB."""
    f = arr[..., :3].astype(np.float32) / 255.0
    light = mp.get('lighting') or {}
    dark = light.get('dark', 0) or 0
    lit = {tuple(c) for c in st['lit']}
    sand = mp.get('shade', {}).get('sand')
    sc = {'sand': sand, 'lamps': [tuple(l) for l in st['lamps']]}
    if dark:
        f = MK.apply_dark(f, sc, lit, dark)
    tint = {'dawn': 'dawn', 'noon': 'desert_noon', 'dusk': 'dusk'}.get(st['hour'], light.get('tint'))
    f = MK.apply_tint(f, tint)
    return f


def luma_stats(f, mp):
    l = MK.luma(f)
    H, W = len(mp['ground']), len(mp['ground'][0])
    walls = set('#|ov')
    mask = np.zeros(l.shape, bool)
    for y in range(H):
        for x in range(W):
            if mp['ground'][y][x] not in walls:
                mask[y * 16:(y + 1) * 16, x * 16:(x + 1) * 16] = True
    return float(l.mean()), float(l[mask].mean())


def save(f, path, scale=1):
    im = Image.fromarray((np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8))
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    im.save(path)
    return im


# name, opts (hour, pos, latched, open), flags (None = every event), phone focus [x, y] in tiles
F1_FLAGS = {'lab_entered', 'lab_f1_arrived', 'bells_started'}
F1_SOLVED = {'pos': {'ss_c': [30, 4], 'plt_m': [11, 17]}, 'latched': ['plate_d'], 'open': ['door_d', 'crack_d']}
F2_FLAGS = {'lab_f2_arrived'}
VARIANTS = {
    'ep5_lab_f1': [
        ('ep5_lab_f1', {}, F1_FLAGS, [20, 22]),
        ('ep5_lab_f1_dawn', {'hour': 'dawn'}, F1_FLAGS, [24, 19]),
        ('ep5_lab_f1_noon', {'hour': 'noon', **F1_SOLVED}, F1_FLAGS | {'sel_memory_1'}, [6, 16]),
        ('ep5_lab_f1_dusk', {'hour': 'dusk'}, F1_FLAGS, [24, 17]),
        ('ep5_lab_f1_shove', {'hour': 'dawn', 'pos': {'ss_c': [30, 4]}}, F1_FLAGS, [28, 6]),
        ('ep5_lab_f1_far_dawn', {'hour': 'dawn', **F1_SOLVED}, F1_FLAGS | {'sel_memory_1'}, [8, 5]),
    ],
    'ep5_lab_f2': [
        ('ep5_lab_f2', {}, F2_FLAGS, [8, 16]),
        ('ep5_lab_f2_dawn', {'hour': 'dawn', 'pos': {'pl_b': [14, 13], 'pl_d': [36, 15]}}, F2_FLAGS, [10, 12]),
        ('ep5_lab_f2_noon', {'hour': 'noon'}, F2_FLAGS, [10, 12]),
        ('ep5_lab_f2_dusk', {'hour': 'dusk', 'pos': {'pl_b': [14, 13]}}, F2_FLAGS, [33, 10]),
        ('ep5_lab_f2_knight', {'hour': 'dawn', 'open': ['door_e']}, F2_FLAGS | {'reliquary_found', 'dune_key_f2', 'vex_gallery_met'}, [22, 16]),
    ],
    'ep5_lab_f3': [
        ('ep5_lab_f3', {}, {'lab_f3_arrived', 'sel_walked_in'}, [16, 12]),
        ('ep5_lab_f3_solved', {'pos': {'lamp_s': [21, 11], 'ss_t': [16, 20], 'lamp_r2': [20, 29]}, 'latched': ['plate_r']},
         {'lab_f3_arrived', 'sel_walked_in', 'landing_shelter', 'landing_truth', 'landing_return', 'sel_memory_3', 'oracle_door_open'}, [16, 22]),
    ],
    'ep5_lab_oracle': [
        ('ep5_lab_oracle', {}, {'oracle_door_open'}, [12, 10]),
        ('ep5_lab_oracle_after', {}, {'oracle_door_open', 'oracle_defeated', 'chart_restored', 'fragment5_get'}, [12, 10]),
    ],
}


def render_one(db, spr, atl, map_id, name, opts, flags, focus, scale):
    d = dump(map_id, dict(opts, flags=sorted(flags) if flags is not None else None))
    mp, st = d['map'], d['state']
    arr = render_state(db, spr, atl, mp, st, flags)
    f = finish(arr, mp, st)
    whole, floor = luma_stats(f, mp)
    big = save(f, os.path.join(HERE, '%s_clean.png' % name), scale)
    save(f, os.path.join(HERE, '%s_x1.png' % name), 1)
    ev = [e for e in mp['events'] if P.present(e, flags)]
    ann = P.annotate(big.convert('RGBA'), dict(mp, events=ev), scale)
    ann.save(os.path.join(HERE, '%s.png' % name))
    frame, win, org, s, ox = MK.phone_frame(f, focus[0] * 16 + 8, focus[1] * 16 + 8)
    save(frame, os.path.join(HERE, '%s_phone.png' % name), 1)
    print('wrote %s  hour %s  luma %.3f (floor %.3f)  running %d  shade %d' % (name, st['hour'], whole, floor, len(st['running']), len(st['shade'])))
    return whole, floor


def main(argv):
    scale = 2
    ids = []
    for a in argv[1:]:
        if a.startswith('--scale='):
            scale = int(a.split('=', 1)[1])
        else:
            ids.append(a)
    ids = ids or list(VARIANTS)
    db, spr, atl = EP5DB(), P.SpriteDB(), EP5Atlases()
    for map_id in ids:
        if not os.path.exists(os.path.join(NEXT, 'src', 'data', 'maps', map_id + '.js')):
            print('skip', map_id, '(no module yet)')
            continue
        for name, opts, flags, focus in VARIANTS[map_id]:
            render_one(db, spr, atl, map_id, name, opts, flags, focus, scale)


if __name__ == '__main__':
    main(sys.argv)
