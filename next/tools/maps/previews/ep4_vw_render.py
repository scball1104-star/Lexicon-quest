"""E4-maps-a previews: the Flood Road, Valewyn, its four interiors and Emberpeak patched, at 2x, annotated and clean.

    python tools/maps/previews/ep4_vw_render.py               # every preview below, into tools/maps/previews/
    python tools/maps/previews/ep4_vw_render.py ep4_valewyn   # one map (all its variants)
    python tools/maps/previews/ep4_vw_render.py --scale=3

Why a script of its own: tools/maps/preview.py merges only the x1 tile fragment and the core atlases, and knows no tide
locks. This script reuses preview.render() and changes only what is drawn:
  - tiles come from EP4DB (tools/art/tiles/ep4_scenes.py: tiles.json + x1 + ep4 fragments, merged as the pack does);
  - NPC and field-foe sprites also come from assets/sprites/ep4_*.json, NPC ids resolve through the ep4 pack's npcs.js;
  - the tide state is computed by the pack's own rule (src/data/ep4/field/tide.js classify) for the variant's levels:
    water cells are drawn as tide_water, pontoons afloat/aground/sunk, wheels and posts at the level's frame;
  - flag-gated terrain overlays (the river quarter, the washout path) are drawn as the field patches them in;
  - boat doors and flag-gated objects are drawn under the variant's flags.
Emberpeak is drawn through ep4_patches.withEastRoad (the patched module the pack registers).
"""
import copy, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.normpath(os.path.join(HERE, '..'))
NEXT = os.path.normpath(os.path.join(MAPS, '..', '..'))
sys.path.insert(0, MAPS)
import preview as P                                    # noqa: E402  (puts tools/art/tiles on sys.path)
from ep4_scenes import EP4DB                           # noqa: E402
from PIL import Image                                  # noqa: E402

DUMP_JS = r"""
const [id, flags, levels] = [process.argv[1], JSON.parse(process.argv[2]), JSON.parse(process.argv[3])];
const T = await import('./src/data/ep4/field/tide.js').catch(() => null);
let m;
if (id === 'emberpeak' || id === 'pk_inn') {
  const base = (await import(`./src/data/maps/ep3/${id}.js`)).default;
  const P = await import('./src/data/maps/ep4_patches.js');
  m = id === 'emberpeak' ? P.withEastRoad(base) : P.withEp4Wake(base);
} else m = (await import(`./src/data/maps/${id}.js`)).default;
const out = JSON.parse(JSON.stringify(m));
if (m.tide && T) {
  const c = T.classify(m, { levels });
  const W = m.ground[0].length;
  const xy = (s) => [...s].map((i) => [i % W, Math.floor(i / W)]);
  out._tide = { levels: c.levels, water: xy(c.water), floats: xy(c.floats), grounded: xy(c.grounded), sunk: xy(c.sunk) };
}
console.log(JSON.stringify(out));
"""

NPC_JS = (
    "const x=await import('./src/data/ep4/npcs.js');x.register&&x.register();"
    "const n=await import('./src/data/npcs.js');"
    "console.log(JSON.stringify(Object.fromEntries(Object.entries(n.NPCS).map(([k,v])=>[k,[v.sprite,v.name]]))))"
)


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


def skin(mp, db, flags):
    """The drawn copy: tide water, tide events as objects, gated terrain patches, boat doors."""
    mp = copy.deepcopy(mp)
    legend = dict(mp['legend'])
    rows = [list(r) for r in mp['ground']]
    pool = iter('ABCDEGIJKNOQRSUVXYZ0123456789@$%&*+-/<>?!')
    char_for = {}

    def ch(tid):
        for k, v in legend.items():
            if v == tid:
                return k
        if tid not in char_for:
            c = next(pool)
            while c in legend:
                c = next(pool)
            char_for[tid] = c
            legend[c] = tid
        return char_for[tid]
    keep = []
    for o in mp.get('overlays', []):
        if o['t'] in db.terrains:
            if P.present(o, flags):
                rows[o['y']][o['x']] = ch(o['t'])
        else:
            keep.append(o)
    mp['overlays'] = keep
    td = mp.get('_tide')
    if td:
        wc = ch('tide_water')
        floats = {tuple(c) for c in td['floats']}
        for x, y in td['water']:
            rows[y][x] = wc
        # an overlay on a flooded cell (canal stairs) goes under the water
        wet = {tuple(c) for c in td['water']}
        mp['overlays'] = [o for o in mp['overlays'] if (o['x'], o['y']) not in wet]
        lv = td['levels']
        sets = {'float': floats, 'ground': {tuple(c) for c in td['grounded']}, 'sunk': {tuple(c) for c in td['sunk']}}
    events = []
    for e in mp['events']:
        t = e['type']
        if t in ('tidewheel', 'tidepost') and td:
            mp['decor'].append({'t': e.get('sprite', 'tide_wheel' if t == 'tidewheel' else 'tide_post'), 'x': e['x'], 'y': e['y'], 'state': lv.get(e['basin'], 0)})
            continue
        if t == 'pontoon' and td:
            c = (e['x'], e['y'])
            st = 1 if c in sets['float'] else 0 if c in sets['ground'] else 3
            mp['decor'].append({'t': e.get('sprite', 'pontoon'), 'x': e['x'], 'y': e['y'], 'state': st})
            continue
        if t == 'door' and e.get('kind') == 'boat' and P.present(e, flags):
            mp['decor'].append({'t': e.get('sprite', 'boat'), 'x': e['x'], 'y': e['y'], 'state': 0})
        if t in ('sign', 'save') and e.get('sprite') and P.present(e, flags):
            mp['decor'].append({'t': e['sprite'], 'x': e['x'], 'y': e['y'], 'state': e.get('state', 0)})
        if t == 'object' and e.get('state') is None and e.get('frameIf'):
            e = dict(e, state=1 if P.present({'if': e['frameIf']}, flags) else 0)
        events.append(e)
    mp['events'] = events
    mp['legend'] = legend
    mp['ground'] = [''.join(r) for r in rows]
    return mp


VARIANTS = {
    'ep4_flood_road': [('ep4_flood_road_mid', {'flood_road_arrived'}, {'l': 1}),
                       ('ep4_flood_road_low', {'flood_road_arrived', 'saw_valewyn'}, {'l': 0})],
    'ep4_valewyn': [('ep4_valewyn', {'saw_valewyn', 'vw_arrived'}, {}),
                    ('ep4_valewyn_council', {'saw_valewyn', 'vw_arrived', 'met_joss', 'keep_ferry_open', 'witnesses_started', 'council_shelter', 'witnesses_done'}, {}),
                    ('ep4_valewyn_restored', {'saw_valewyn', 'vw_arrived', 'met_joss', 'keep_ferry_open', 'paper_regent_defeated', 'charter_restored', 'tide_bell_rung', 'vw_restored', 'ep4_complete'}, {})],
    'ep4_vw_inn': [('ep4_vw_inn', set(), {})],
    'ep4_vw_shop': [('ep4_vw_shop', set(), {})],
    'ep4_vw_forge': [('ep4_vw_forge', set(), {})],
    'ep4_vw_palace': [('ep4_vw_palace', {'vw_arrived'}, {}),
                      ('ep4_vw_palace_named', {'vw_arrived', 'lyra_named', 'council_records'}, {})],
    'emberpeak': [('emberpeak_ep4', {'ep3_complete', 'pk_restored', 'ep4_started', 'east_road_open'}, {})],
}


def render_one(db, spr, atl, npcs, map_id, name, flags, levels, scale):
    real = node_eval(DUMP_JS, map_id, json.dumps(sorted(flags)), json.dumps(levels))
    drawn = skin(real, db, flags)
    cv = P.render(drawn, db, spr, atl, npc_map=npcs, flags=flags)
    big = cv.image().resize((cv.w * scale, cv.h * scale), Image.NEAREST)
    big.save(os.path.join(HERE, '%s_clean.png' % name))
    real_ev = [e for e in real['events'] if P.present(e, flags)]
    ann = P.annotate(big.convert('RGBA'), dict(real, events=real_ev), scale)
    out = os.path.join(HERE, '%s.png' % name)
    ann.save(out)
    print('wrote', out, '%dx%d tiles' % (len(real['ground'][0]), len(real['ground'])))


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
    npcs = node_eval(NPC_JS)
    for map_id in ids:
        for name, flags, levels in VARIANTS[map_id]:
            render_one(db, spr, atl, npcs, map_id, name, flags, levels, scale)


if __name__ == '__main__':
    main(sys.argv)
