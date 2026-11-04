"""E4-maps-b previews: the Sunken Keep's three floors and the Drowned Throne, at 2x, annotated and clean, one image per
level state (the water is the point of these maps, so every floor is drawn at its start levels and at low, mid, high).

    python tools/maps/previews/ep4_keep_render.py                # every variant below, into tools/maps/previews/
    python tools/maps/previews/ep4_keep_render.py ep4_keep_f2    # one map (all its variants)
    python tools/maps/previews/ep4_keep_render.py --scale=3

Why a script of its own: tools/maps/preview.py merges neither the ep4 tile fragment nor any tide state. This one reuses
preview.render() and changes what is drawn:
  - tiles from EP4DB (tools/art/tiles/ep4_scenes.py: tiles.json + x1 + ep4 fragments, merged as the pack does);
  - field foes from assets/sprites/ep4_enemies_field.json, scene actors from ep4_npcs.json;
  - the water of the variant's levels by the pack's own rule (src/data/ep4/field/tide.js classify): water cells as
    tide_water, pontoons afloat / aground / sunk, wheels and posts at the level's frame, the waterline carried up every
    face north of the water to its tide mark (E4-tiles' water_up_faces, as the field draws it);
  - seals washed or not, floodgates and seal-opened doors open or shut, by the variant's `washed` set.
"""
import copy, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.normpath(os.path.join(HERE, '..'))
NEXT = os.path.normpath(os.path.join(MAPS, '..', '..'))
sys.path.insert(0, MAPS)
import preview as P                                    # noqa: E402  (puts tools/art/tiles on sys.path)
from ep4_scenes import EP4DB                           # noqa: E402
from ep4_kit import tq, MARK1_Y, MARK2_Y               # noqa: E402
from PIL import Image                                  # noqa: E402

DUMP_JS = r"""
const [id, levels, washed] = [process.argv[1], JSON.parse(process.argv[2]), JSON.parse(process.argv[3])];
const T = await import('./src/data/ep4/field/tide.js');
const m = (await import(`./src/data/maps/${id}.js`)).default;
const out = JSON.parse(JSON.stringify(m));
if (m.tide) {
  const c = T.classify(m, { levels, washed });
  const W = m.ground[0].length;
  const xy = (s) => [...s].map((i) => [i % W, Math.floor(i / W)]);
  const mc = T.compile(m);
  const fg = {};
  for (const g of mc.floodgates) fg[g.id] = T.gateOpen(m, { levels, latched: washed }, g);
  out._tide = { levels: c.levels, water: xy(c.water), floats: xy(c.floats), grounded: xy(c.grounded), sunk: xy(c.sunk),
    gates: fg, basinAt: m.tide.basin };
}
console.log(JSON.stringify(out));
"""


def node_eval(js, *args, timeout=60):
    r = subprocess.run(['node', '--input-type=module', '-e', js, *args], cwd=NEXT, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise SystemExit('node failed: ' + r.stderr.strip()[-2000:])
    return json.loads(r.stdout.strip().splitlines()[-1])


class EP4Atlases(P.Atlases):
    def __init__(self):
        super().__init__()
        self.e4n = self._load('ep4_npcs.json')
        self.e4e = self._load('ep4_enemies_field.json')

    def npc_frame(self, sprite, d='down'):
        fr = super().npc_frame(sprite, d)
        if fr:
            return fr
        return self._npc_frame_in(self.e4n[0], self.e4n[1], sprite, d)

    def enemy_frame(self, sprite):
        fr = super().enemy_frame(sprite)
        if fr:
            return fr
        meta, img = self.e4e
        info = meta['sprites'].get(sprite)
        if info and sprite + '_0' in meta['frames']:
            return img.crop(*meta['frames'][sprite + '_0']), info['origin'], False
        return None


def skin(mp, db, flags, washed):
    """The drawn copy: tide water, tide events as objects, seals and floodgates by state."""
    mp = copy.deepcopy(mp)
    legend = dict(mp['legend'])
    rows = [list(r) for r in mp['ground']]
    wc = next((k for k, v in legend.items() if v == 'tide_water'), None)
    if wc is None:
        wc = '¤'
        legend[wc] = 'tide_water'
    td = mp.get('_tide')
    lv, sets, gates = {}, {'float': set(), 'ground': set(), 'sunk': set()}, {}
    if td:
        for x, y in td['water']:
            rows[y][x] = wc
        lv = td['levels']
        gates = td['gates']
        sets = {'float': {tuple(c) for c in td['floats']}, 'ground': {tuple(c) for c in td['grounded']},
                'sunk': {tuple(c) for c in td['sunk']}}
    seal_targets = set()
    for e in mp['events']:
        if e['type'] == 'forgery' and e['id'] in washed:
            for t in (e.get('target') if isinstance(e.get('target'), list) else [e.get('target')]):
                if t:
                    seal_targets.add(t)
    events = []
    for e in mp['events']:
        t = e['type']
        if not P.present(e, flags):
            continue
        if t in ('tidewheel', 'tidepost'):
            mp['decor'].append({'t': e.get('sprite', 'tide_wheel' if t == 'tidewheel' else 'tide_post'), 'x': e['x'], 'y': e['y'],
                                'state': lv.get(e.get('basin'), 0)})
            continue
        if t == 'pontoon':
            c = (e['x'], e['y'])
            st = 1 if c in sets['float'] else 0 if c in sets['ground'] else 3
            mp['decor'].append({'t': e.get('sprite', 'pontoon'), 'x': e['x'], 'y': e['y'], 'state': st})
            continue
        if t == 'forgery':
            mp['decor'].append({'t': e.get('sprite', 'seal_paper'), 'x': e['x'], 'y': e['y'], 'state': 2 if e['id'] in washed else 0})
            continue
        if t == 'floodgate':
            op = gates.get(e['id']) or e['id'] in washed
            mp['decor'].append({'t': 'floodgate_open' if op else 'floodgate_closed', 'x': e['x'], 'y': e['y']})
            continue
        if t == 'gate' and (e['id'] in seal_targets or e['id'] in washed):
            e = dict(e, state='open')
        if t == 'locked_door' and e['id'] in washed:
            mp['decor'].append({'t': '%s_open' % e.get('sprite', 'door_key'), 'x': e['x'], 'y': e['y']})
            continue
        if t == 'door' and e.get('kind') == 'boat':
            mp['decor'].append({'t': e.get('sprite', 'boat'), 'x': e['x'], 'y': e['y'], 'state': 0})
        if t in ('sign', 'save') and e.get('sprite'):
            mp['decor'].append({'t': e['sprite'], 'x': e['x'], 'y': e['y'], 'state': e.get('state', 0)})
        if t == 'object' and e.get('breakable') and e['id'] in washed:
            continue
        events.append(e)
    mp['events'] = events
    mp['legend'] = legend
    mp['ground'] = [''.join(r) for r in rows]
    return mp


def water_up_faces(cv, mp, drawn_rows, legend, levels, basin_rows):
    """The water's surface carried up the bottom row of a face north of the water to its level's tide mark."""
    rows = drawn_rows
    for y in range(1, len(rows)):
        for x in range(len(rows[y])):
            if legend.get(rows[y][x]) != 'tide_water' or basin_rows[y][x] == '.':
                continue
            if basin_rows[y - 1][x] != '.':
                continue
            north = legend.get(mp['ground'][y - 1][x], '') or ''
            door_here = any(e['x'] <= x < e['x'] + e.get('w', 1) and e['y'] == y - 1 for e in mp['events'] if e['type'] in ('gate', 'forgery', 'floodgate', 'locked_door'))
            if not (north.endswith('_face') or 'ledge_face' in north or door_here):
                continue
            lvl = levels.get(basin_rows[y][x], 0)
            mark = MARK1_Y if lvl <= 1 else MARK2_Y
            r0 = mark - 16
            for r in range(r0, 16):
                for px in range(16):
                    X, Y = x * 16 + px, (y - 1) * 16 + r
                    if r == r0:
                        cv.set(X, Y, tq(4) if (px + x) % 4 == 0 else tq(3))
                    elif r == r0 + 1:
                        cv.put(X, Y, tq(2)[:3] + (170,))
                    else:
                        cv.put(X, Y, tq(1)[:3] + (150,))


# name, flags, levels, washed (seal / floodgate / locked door / cracked wall ids drawn as done)
F1_DONE = ['seal_b', 'tidegate', 'door_d', 'crack_d']
F2_DONE = ['seal_d', 'door_e', 'crack_b']
F3_DONE = ['seal_t1', 'seal_t2']
VARIANTS = {
    'ep4_keep_f1': [
        ('ep4_keep_f1', {'keep_entered'}, {'a': 0, 'b': 0}, []),
        ('ep4_keep_f1_mid', {'keep_entered'}, {'a': 1, 'b': 1}, []),
        ('ep4_keep_f1_high', {'keep_entered'}, {'a': 2, 'b': 2}, ['seal_b', 'tidegate']),
        ('ep4_keep_f1_low', {'keep_entered', 'nilo_started'}, {'a': 0, 'b': 0}, F1_DONE),
    ],
    'ep4_keep_f2': [
        ('ep4_keep_f2', set(), {'a': 1, 'b': 0, 'c': 0}, []),
        ('ep4_keep_f2_low', set(), {'a': 0, 'b': 0, 'c': 0}, F2_DONE),
        ('ep4_keep_f2_mid', {'keep_f2_done', 'coffer_found'}, {'a': 1, 'b': 1, 'c': 1}, F2_DONE),
        ('ep4_keep_f2_high', {'coffer_found'}, {'a': 2, 'b': 2, 'c': 2}, F2_DONE),
    ],
    'ep4_keep_f3': [
        ('ep4_keep_f3', set(), None, []),
        ('ep4_keep_f3_low', {'keep_f3_arrived'}, 'low', F3_DONE),
        ('ep4_keep_f3_mid', {'keep_f3_arrived'}, 'mid', F3_DONE),
        ('ep4_keep_f3_high', {'keep_f3_arrived', 'principle_voice', 'principle_truth', 'principle_mercy', 'petition_gate_open'}, 'high', F3_DONE),
    ],
    'ep4_keep_crown': [
        ('ep4_keep_crown', set(), None, []),
        ('ep4_keep_crown_after', {'paper_regent_defeated', 'charter_restored', 'lyra_named'}, None, []),
    ],
}


def render_one(db, spr, atl, map_id, name, flags, levels, washed, scale):
    base = node_eval(DUMP_JS, map_id, json.dumps({}), json.dumps([]))
    if isinstance(levels, str) or levels is None:
        ids = list((base.get('tide') or {}).get('basins', {}).keys())
        lvmap = {'low': 0, 'mid': 1, 'high': 2}
        levels = {b: (lvmap[levels] if isinstance(levels, str) else base['tide']['basins'][b]['start']) for b in ids}
        levels = {b: min(v, (base['tide']['basins'][b].get('levels', 3) - 1)) for b, v in levels.items()}
    real = node_eval(DUMP_JS, map_id, json.dumps(levels), json.dumps(washed))
    drawn = skin(real, db, flags, set(washed))
    cv = P.render(drawn, db, spr, atl, npc_map={}, flags=flags)
    td = real.get('_tide')
    if td:
        water_up_faces(cv, real, drawn['ground'], drawn['legend'], td['levels'], td['basinAt'])
    big = cv.image().resize((cv.w * scale, cv.h * scale), Image.NEAREST)
    big.save(os.path.join(HERE, '%s_clean.png' % name))
    real_ev = [e for e in real['events'] if P.present(e, flags)]
    ann = P.annotate(big.convert('RGBA'), dict(real, events=real_ev), scale)
    out = os.path.join(HERE, '%s.png' % name)
    ann.save(out)
    print('wrote', out, levels if td else '', 'washed', washed)


def main(argv):
    scale = 2
    ids = []
    for a in argv[1:]:
        if a.startswith('--scale='):
            scale = int(a.split('=', 1)[1])
        else:
            ids.append(a)
    ids = ids or list(VARIANTS)
    db, spr, atl = EP4DB(), P.SpriteDB(), EP4Atlases()
    for map_id in ids:
        if not os.path.exists(os.path.join(NEXT, 'src', 'data', 'maps', map_id + '.js')):
            print('skip', map_id, '(no module yet)')
            continue
        for name, flags, levels, washed in VARIANTS[map_id]:
            render_one(db, spr, atl, map_id, name, flags, levels, washed, scale)


if __name__ == '__main__':
    main(sys.argv)
