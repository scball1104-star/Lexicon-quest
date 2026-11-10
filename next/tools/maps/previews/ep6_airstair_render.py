"""E6-maps-a previews: the Airstair, Zephyr Landing, its four interiors, and Saffron Haven and the Dune Lantern Rest as the
ep6 pack patches them. 2x annotated + clean, the field's tint for the variant, and phone frames of the screens that teach.

    python tools/maps/previews/ep6_airstair_render.py                 # every preview below, into tools/maps/previews/
    python tools/maps/previews/ep6_airstair_render.py ep6_airstair
    python tools/maps/previews/ep6_airstair_render.py --scale=3

Why a script of its own: tools/maps/preview.py merges only the x1 tile fragment and knows no gust lanes. This script reuses
preview.render() and changes only what is drawn:
  - tiles come from EP6DB (tools/art/tiles/ep6_scenes.py: tiles.json + x1 + ep4 + ep5 + ep6 fragments, merged as the packs
    do); NPC and field-foe sprites also come from the ep4, ep5 and ep6 atlases, NPC ids resolve through the registered packs;
  - the live lanes (src/data/ep6/field/wind.js `live`, the authored state: none of these maps has a vane) are drawn the way
    E6-world's field draws them (tools/art/tiles/ep6_mocks.py draw_bed / draw_chevrons, the mirror of field/art.js): the
    gust_lane bed autotiled against live neighbours, the streaks for the cell's arrow, a chevron every other cell, all
    under the objects and actors; mooring posts as their objects (the pennant streaming downwind);
  - doors and signs with a sprite as their objects, flag-gated events under the variant's flags;
  - the tint (the variant's) and a warm glow on lamps at dusk and night.
Saffron Haven and the Dune Lantern Rest are drawn through ep6_patches.withSkyBerth / withEp6Wake on the ep5 modules.
Phone frames: the game's 384 x 216 screen around a cell, scaled to 844 x 390 the way a phone held sideways shows it.
"""
import copy, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.normpath(os.path.join(HERE, '..'))
NEXT = os.path.normpath(os.path.join(MAPS, '..', '..'))
sys.path.insert(0, MAPS)
import preview as P                                    # noqa: E402  (puts tools/art/tiles on sys.path)
from ep6_scenes import EP6DB                           # noqa: E402
import ep6_mocks as MK                                 # noqa: E402
import numpy as np                                     # noqa: E402
from PIL import Image                                  # noqa: E402

DUMP_JS = r"""
const [id] = [process.argv[1]];
let m;
if (id === 'ep5_saffron' || id === 'ep5_sh_inn') {
  const base = (await import(`./src/data/maps/${id}.js`)).default;
  const P = await import('./src/data/maps/ep6_patches.js');
  m = id === 'ep5_saffron' ? P.withSkyBerth(base) : P.withEp6Wake(base);
} else m = (await import(`./src/data/maps/${id}.js`)).default;
const out = JSON.parse(JSON.stringify(m));
if (m.wind) {
  const W = await import('./src/data/ep6/field/wind.js');
  const model = W.compile(m);
  const states = [[]].concat(model.groups.map((g) => [g]));
  out._lanes = {};
  for (const t of states) {
    const A = W.live(model, { turned: new Set(t) });
    const rows = [];
    for (let y = 0; y < m.ground.length; y++) { let s = ''; for (let x = 0; x < m.ground[0].length; x++) { const a = A[y * m.ground[0].length + x]; s += a < 0 ? '.' : '^>v<'[a]; } rows.push(s); }
    out._lanes[t.join('+') || 'authored'] = rows;
  }
}
console.log(JSON.stringify(out));
"""

NPC_JS = (
    "await (await import('./src/data/ep6/index.js')).register();"
    "const n=await import('./src/data/npcs.js');"
    "console.log(JSON.stringify(Object.fromEntries(Object.entries(n.NPCS).map(([k,v])=>[k,[v.sprite,v.name,v.show||null]]))))"
)

ARROW_I = {'^': 0, '>': 1, 'v': 2, '<': 3}


def flag_on(f, flags):
    """A flag, or the ep4 pack's compound `all:a,!b` (src/data/ep4/field/seams.js)."""
    if f.startswith('all:'):
        return all((t[1:] not in flags) if t.startswith('!') else (t in flags) for t in f[4:].split(','))
    return f in flags


def npc_shown(rec, flags):
    show = rec[2] if rec and len(rec) > 2 else None
    if not show:
        return True
    lst = lambda v: [] if v is None else (v if isinstance(v, list) else [v])
    return all(flag_on(f, flags) for f in lst(show.get('if'))) and not any(flag_on(f, flags) for f in lst(show.get('ifNot')))


def node_eval(js, *args, timeout=120):
    r = subprocess.run(['node', '--input-type=module', '-e', js, *args], cwd=NEXT, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise SystemExit('node failed: ' + r.stderr.strip()[-2000:])
    return json.loads(r.stdout.strip().splitlines()[-1])


class EP6Atlases(P.Atlases):
    def __init__(self):
        super().__init__()
        packs = ('ep4', 'ep5', 'ep6')
        self.extra_npc = [self._load(f) for f in ['%s_npcs.json' % p for p in packs] if os.path.exists(os.path.join(P.SPRITES, f))]
        self.extra_foe = [self._load(f) for f in ['%s_enemies_field.json' % p for p in packs] if os.path.exists(os.path.join(P.SPRITES, f))]

    def npc_frame(self, sprite, d='down'):
        fr = super().npc_frame(sprite, d)
        if fr:
            return fr
        for meta, img in self.extra_npc:
            fr = self._npc_frame_in(meta, img, sprite, d)
            if fr:
                return fr
        return None

    def enemy_frame(self, sprite):
        fr = super().enemy_frame(sprite)
        if fr:
            return fr
        for meta, img in self.extra_foe:
            info = meta['sprites'].get(sprite)
            if info and sprite + '_0' in meta['frames']:
                return img.crop(*meta['frames'][sprite + '_0']), info['origin'], False
        return None


def skin(mp, db, flags, npcs, lanes):
    """The drawn copy: posts and vanes as objects, sprite doors and signs, gated events and overlays."""
    mp = copy.deepcopy(mp)
    legend = dict(mp['legend'])
    rows = [list(r) for r in mp['ground']]
    keep = []
    for o in mp.get('overlays', []):
        if o['t'] in db.terrains:
            if P.present(o, flags):
                ch = next((k for k, v in legend.items() if v == o['t']), None)
                if ch is None:
                    ch = chr(0x2460 + len(legend))
                    legend[ch] = o['t']
                rows[o['y']][o['x']] = ch
        else:
            keep.append(o)
    mp['overlays'] = keep
    events = []
    for e in mp['events']:
        t = e['type']
        if not P.present(e, flags):
            continue
        if t == 'npc' and not npc_shown(npcs.get(e['id']), flags):
            continue
        if t == 'mooring':
            a = lanes[e['y']][e['x']] if lanes else '.'
            mp['decor'].append({'t': e.get('sprite', 'gust_mooring'), 'x': e['x'], 'y': e['y'], 'state': ARROW_I.get(a, 0) * 3})
            continue
        if t == 'vane':
            a = lanes[e['y'] - 1][e['x']] if lanes else '.'
            mp['decor'].append({'t': e.get('sprite', 'vane'), 'x': e['x'], 'y': e['y'], 'state': ARROW_I.get(a, 0)})
            continue
        if t in ('door', 'sign', 'save', 'font') and e.get('sprite') and e.get('kind') != 'mirror':
            mp['decor'].append({'t': e['sprite'], 'x': e['x'], 'y': e['y'], 'state': e.get('state', 0)})
            if t == 'font':
                continue
        events.append(e)
    mp['events'] = events
    mp['legend'] = legend
    mp['ground'] = [''.join(r) for r in rows]
    return mp


def lights_of(mp, db):
    """(x, y, radius in tiles) of every lamp-like object drawn (decor and present object events)."""
    out = []
    for o in mp.get('decor', []):
        m = db.objects.get(o['t'])
        if m and m.get('light'):
            if o['t'] in ('beacon', 'signal_lamp') and not o.get('state'):
                continue
            out.append((o['x'], o['y'] - 1, m['light'].get('radius', 3)))
    for e in mp.get('events', []):
        m = db.objects.get(e.get('sprite') or '')
        if m and m.get('light') and e['type'] == 'object' and not (e.get('sprite') in ('beacon', 'signal_lamp') and not e.get('state')):
            out.append((e['x'], e['y'] - 1, m['light'].get('radius', 3)))
    return out


def finish(cv, tint, glows):
    arr = cv.a[..., :3].astype(np.float32) / 255.0
    arr = MK.apply_tint(arr, tint) if tint in MK.TINTS else tint_any(arr, tint)
    k = {'night': 0.48, 'dusk': 0.22, 'dawn': 0.1}.get(tint, 0.0)
    if glows and k:
        H, W = arr.shape[:2]
        yy, xx = np.mgrid[0:H, 0:W]
        add = np.zeros((H, W), np.float32)
        for (gx, gy, r) in glows:
            d = np.sqrt((xx - gx * 16 - 8) ** 2 + (yy - gy * 16 - 8) ** 2) / (r * 16)
            add = np.maximum(add, np.clip(1 - d, 0, 1) ** 1.5)
        arr = np.clip(arr + add[..., None] * np.array([1.0, 0.72, 0.38]) * k, 0, 1)
    return arr


# the field's dusk and dawn, approximately (src/world/lighting.js TINTS), for the scene variants
EXTRA_TINTS = {'dusk': ('#e8907a', 0.34, 0.12), 'dawn': ('#f3c3a8', 0.22, 0.05)}


def tint_any(arr, name):
    if name not in EXTRA_TINTS:
        return arr
    col, a, d = EXTRA_TINTS[name]
    out = arr * (1 - a) + arr * MK.hx(col) * a
    if d:
        l = MK.luma(out)[..., None]
        out = out * (1 - d) + l * d
    return np.clip(out, 0, 1)


def draw_lanes(db, full, drawn, lanes, spr, atl, npcs, flags, frame=0):
    """Under the objects: render the bare floor, lay the lanes on it, keep the full render wherever something stood."""
    bare = dict(drawn, decor=[], events=[], start=None, overhead=[])
    ground = P.render(bare, db, spr, atl, npc_map=npcs, flags=flags, frame=frame)
    laned = P.Canvas(ground.w, ground.h)
    laned.a[...] = ground.a
    sc = {'lanes': lanes, 'lane_state': 0}
    MK.draw_bed(laned, db, sc, frame)
    MK.draw_chevrons(laned, sc)
    diff = np.any(full.a != ground.a, axis=-1)
    full.a[...] = np.where(diff[..., None], full.a, laned.a)


def render_variant(db, spr, atl, npcs, map_id, name, flags, tint, scale, phones, frame=0):
    real = node_eval(DUMP_JS, map_id)
    lanes = (real.get('_lanes') or {}).get('authored')
    drawn = skin(real, db, flags, npcs, lanes)
    full = P.render(drawn, db, spr, atl, npc_map=npcs, flags=flags, frame=frame)
    if lanes:
        draw_lanes(db, full, drawn, lanes, spr, atl, npcs, flags, frame)
    arr = finish(full, tint, lights_of(drawn, db))
    img1 = Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
    big = img1.resize((img1.width * scale, img1.height * scale), Image.NEAREST)
    big.save(os.path.join(HERE, '%s_clean.png' % name))
    real_ev = [e for e in real['events'] if P.present(e, flags)]
    ann = P.annotate(big.convert('RGBA'), dict(real, events=real_ev), scale)
    ann.save(os.path.join(HERE, '%s.png' % name))
    print('wrote', name, '%dx%d tiles' % (len(real['ground'][0]), len(real['ground'])))
    for (pname, cx, cy) in phones:
        fr, win, _, _, _ = MK.phone_frame(arr, cx * 16 + 8, cy * 16 + 8)
        Image.fromarray((fr * 255 + 0.5).astype(np.uint8)).save(os.path.join(HERE, '%s_phone.png' % pname))
        Image.fromarray((win * 255 + 0.5).astype(np.uint8)).resize((768, 432), Image.NEAREST).save(os.path.join(HERE, '%s_2x.png' % pname))
        print('  phone', pname)


EP5_DONE = {'ep5_complete', 'haven_restored', 'haven_arrived', 'road_landed', 'ep5_started', 'ship_boarded', 'bells_done',
            'moonwell_woken', 'star_reading_done', 'gnomon_get', 'oracle_defeated', 'ep4_complete', 'credits5_rolled'}
E6 = EP5_DONE | {'ep6_morning_done', 'ep6_started'}
BOARDED = E6 | {'ep6_boarded'}
STAIR = BOARDED | {'airstair_arrived', 'mira_asked', 'mira_told', 'airstair_fight_done', 'saw_gust', 'saw_isles'}
TOWN = STAIR | {'zephyr_arrived', 'met_aeris', 'liora_met'}
LETTERS = STAIR | {'zephyr_arrived', 'letters_started'}
TOWN_LATE = TOWN | {'charts_seen', 'anchor_learned', 'windward_pass', 'beacon_started', 'obs_entered'}
RESTORED = TOWN_LATE | {'beacon_lit', 'library_reached', 'isles_restored', 'pippa_found', 'pippa_home', 'aeris_came',
                        'scribe_defeated', 'compass_restored', 'ep6_complete'}

# map id -> [(preview name, flags, tint, phone frames [(name, cx, cy)])]
VARIANTS = {
    'ep6_airstair': [('ep6_airstair', STAIR, 'none', [('ep6_airstair_lane_a', 4, 26), ('ep6_airstair_lane_b', 15, 15),
                                                       ('ep6_airstair_top', 16, 5), ('ep6_airstair_foot', 12, 40)]),
                     ('ep6_airstair_letters', LETTERS, 'none', [])],
    'ep6_zephyr': [('ep6_zephyr', TOWN, 'none', [('ep6_zephyr_plaza', 24, 13), ('ep6_zephyr_arrive', 22, 27), ('ep6_zephyr_east', 38, 12)]),
                   ('ep6_zephyr_restored', RESTORED, 'none', [('ep6_zephyr_restored_plaza', 24, 13)]),
                   ('ep6_zephyr_night', RESTORED, 'night', [('ep6_zephyr_roof', 8, 8)])],
    'ep6_zl_inn': [('ep6_zl_inn', TOWN, 'none', [])],
    'ep6_zl_shop': [('ep6_zl_shop', TOWN, 'none', [])],
    'ep6_zl_workshop': [('ep6_zl_workshop', TOWN, 'none', [])],
    'ep6_zl_charts': [('ep6_zl_charts', TOWN, 'none', [])],
    'ep5_saffron': [('ep5_saffron_ep6', E6, 'none', [('ep5_saffron_ep6_berth', 8, 27)]),
                    ('ep5_saffron_ep6_off', EP5_DONE, 'none', [])],
    'ep5_sh_inn': [('ep5_sh_inn_ep6', EP5_DONE, 'none', [])],
}


def main(argv):
    scale = 2
    ids = []
    for a in argv[1:]:
        if a.startswith('--scale='):
            scale = int(a.split('=', 1)[1])
        else:
            ids.append(a)
    ids = ids or list(VARIANTS)
    db, spr, atl = EP6DB(), P.SpriteDB(), EP6Atlases()
    npcs = node_eval(NPC_JS)
    for map_id in ids:
        for (name, flags, tint, phones) in VARIANTS[map_id]:
            render_variant(db, spr, atl, npcs, map_id, name, set(flags), tint, scale, phones)


if __name__ == '__main__':
    main(sys.argv)
