"""E5-maps-a previews: the Saffron Wind, the Caravan Road, Saffron Haven, its four interiors, and Valewyn and its inn as the
ep5 pack patches them. 2x annotated + clean, the field's tint for the variant, and phone frames of the screens that teach.

    python tools/maps/previews/ep5_saffron_render.py                 # every preview below, into tools/maps/previews/
    python tools/maps/previews/ep5_saffron_render.py ep5_caravan_road
    python tools/maps/previews/ep5_saffron_render.py --scale=3

Why a script of its own: tools/maps/preview.py merges only the x1 tile fragment and knows no sun and shade. This script reuses
preview.render() and changes only what is drawn:
  - tiles come from EP5DB (tools/art/tiles/ep5_scenes.py: tiles.json + x1 + ep4 + ep5 fragments, merged as the packs do);
  - NPC and field-foe sprites also come from assets/sprites/ep4_* and ep5_*, NPC ids resolve through both packs' npcs.js;
  - on a map with a `shade` block the pack's own rule (src/data/ep5/field/shade.js light / runMask, solid cells from mapcheck's
    grid) decides the variant's hour: running_sand is drawn over every sand cell that runs, and E5-world's violet shade
    (ep5_scenes.SHADE) over every shadow cell nothing lights, under the objects and actors, as the field draws it;
  - shade events are drawn as their objects (dials at the hour's frame, stones by height), doors and signs with a sprite as
    their objects, flag-gated events under the variant's flags;
  - the tint (the hour's, or the map's under the variant's flags) and a warm glow on lamps at dusk and night, as the field
    adds them (ep5_mocks.apply_tint).
Valewyn and the Floodwatch Inn are drawn through ep5_patches.withShipBerth / withEp5Wake (the modules the ep5 pack registers).
Phone frames: the game's 384 x 216 screen around a cell, scaled to 844 x 390 the way a phone held sideways shows it.
"""
import copy, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.normpath(os.path.join(HERE, '..'))
NEXT = os.path.normpath(os.path.join(MAPS, '..', '..'))
sys.path.insert(0, MAPS)
import preview as P                                    # noqa: E402  (puts tools/art/tiles on sys.path)
from ep5_scenes import EP5DB, SHADE                    # noqa: E402
import ep5_mocks as MK                                 # noqa: E402
import numpy as np                                     # noqa: E402
from PIL import Image                                  # noqa: E402

DUMP_JS = r"""
const [id, flags, hour] = [process.argv[1], JSON.parse(process.argv[2]), process.argv[3]];
let m;
if (id === 'ep4_valewyn' || id === 'ep4_vw_inn') {
  const base = (await import(`./src/data/maps/${id}.js`)).default;
  const P = await import('./src/data/maps/ep5_patches.js');
  m = id === 'ep4_valewyn' ? P.withShipBerth(base) : P.withEp5Wake(base);
} else m = (await import(`./src/data/maps/${id}.js`)).default;
const out = JSON.parse(JSON.stringify(m));
if (m.shade) {
  const S = await import('./src/data/ep5/field/shade.js');
  const mc = await import('./tools/maps/mapcheck.mjs');
  const db = await mc.loadDb();
  const g = mc.buildGrid({ ...m, events: [] }, db);
  const W = m.ground[0].length, N = W * m.ground.length;
  const solid = new Uint8Array(N);
  for (let y = 0; y < m.ground.length; y++) for (let x = 0; x < W; x++) if (g.code[y][x] === 'solid' || g.code[y][x] === 'void') solid[y * W + x] = 1;
  const h = hour || m.shade.hour;
  const L = S.light(m, { hour: h, solid });
  const run = S.runMask(m, { hour: h, solid }, L);
  const xy = (i) => [i % W, Math.floor(i / W)];
  const running = [], shade = [];
  for (let i = 0; i < N; i++) {
    if (run[i]) running.push(xy(i));
    if (L.shadow[i] && !L.lit[i] && !solid[i]) shade.push(xy(i));
  }
  out._shade = { hour: h, running, shade };
}
console.log(JSON.stringify(out));
"""

NPC_JS = (
    "await (await import('./src/data/ep5/index.js')).register();"
    "const n=await import('./src/data/npcs.js');"
    "console.log(JSON.stringify(Object.fromEntries(Object.entries(n.NPCS).map(([k,v])=>[k,[v.sprite,v.name,v.show||null]]))))"
)


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


class EP5Atlases(P.Atlases):
    def __init__(self):
        super().__init__()
        self.extra_npc = [self._load(f) for f in ('ep4_npcs.json', 'ep5_npcs.json') if os.path.exists(os.path.join(P.SPRITES, f))]
        self.extra_foe = [self._load(f) for f in ('ep4_enemies_field.json', 'ep5_enemies_field.json') if os.path.exists(os.path.join(P.SPRITES, f))]

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


STONE = {1: 'low_block', 2: 'standing_stone', 3: 'obelisk'}
HOUR_FRAME = {'dawn': 0, 'noon': 1, 'dusk': 2}
HOUR_TINT = {'dawn': 'dawn', 'noon': 'desert_noon', 'dusk': 'dusk', 'night': 'night'}


def skin(mp, db, flags, npcs):
    """The drawn copy: running sand as terrain, shade events as objects, sprite doors and signs, gated decor."""
    mp = copy.deepcopy(mp)
    legend = dict(mp['legend'])
    rows = [list(r) for r in mp['ground']]
    sh = mp.get('_shade')
    if sh:
        legend['¤'] = 'running_sand'
        for x, y in sh['running']:
            rows[y][x] = '¤'
    hour = sh['hour'] if sh else None
    # a terrain id in the overlays (the interiors' carpet runners) is a terrain patch on that cell, as the field draws it
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
        if t == 'sundial':
            mp['decor'].append({'t': e.get('sprite', 'sundial'), 'x': e['x'], 'y': e['y'], 'state': HOUR_FRAME.get(hour, 1)})
            continue
        if t == 'standstone':
            mp['decor'].append({'t': e.get('sprite') or STONE[e.get('h', 2)], 'x': e['x'], 'y': e['y']})
            continue
        if t == 'lampcart':
            mp['decor'].append({'t': e.get('sprite', 'lamp_cart'), 'x': e['x'], 'y': e['y']})
            continue
        if t == 'sunplate':
            mp['decor'].append({'t': e.get('sprite', 'sun_plate'), 'x': e['x'], 'y': e['y'], 'state': 2 if e.get('when') == 'shade' else 0})
            continue
        if t == 'window':
            mp['decor'].append({'t': e.get('sprite', 'window_horizon'), 'x': e['x'], 'y': e['y'], 'state': 1 if hour in e.get('hours', []) else 0})
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


def hexa(h, a):
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), int(round(a * 255)))


def shade_over(ground_cv, cells):
    """E5-world's shade layer (the wash, the 50% checker, the darker rim on the outer sides) over the given cells."""
    wash, dot, rim = hexa(SHADE['wash'], SHADE['washAlpha']), hexa(SHADE['dot'], SHADE['dotAlpha']), hexa(SHADE['rim'], SHADE['rimAlpha'])
    cs = {(x, y) for x, y in cells}
    tile_w = np.zeros((16, 16, 4), np.uint8)
    tile_w[...] = wash
    for (x, y) in cs:
        ground_cv.blit(tile_w, x * 16, y * 16)
        for yy in range(16):
            for xx in range(16):
                if (xx + yy) % 2 == 0:
                    ground_cv.put(x * 16 + xx, y * 16 + yy, dot)
        for (nx, ny, (rx, ry, rw, rh)) in ((0, -1, (0, 0, 16, 1)), (0, 1, (0, 15, 16, 1)), (-1, 0, (0, 0, 1, 16)), (1, 0, (15, 0, 1, 16))):
            if (x + nx, y + ny) not in cs:
                for yy in range(ry, ry + rh):
                    for xx in range(rx, rx + rw):
                        ground_cv.put(x * 16 + xx, y * 16 + yy, rim)


def lights_of(mp, db):
    """(x, y, radius in tiles) of every lamp-like object drawn (decor and present object events)."""
    out = []
    for o in mp.get('decor', []):
        m = db.objects.get(o['t'])
        if m and m.get('light'):
            if o['t'] == 'moonwell' and not o.get('state'):
                continue
            out.append((o['x'], o['y'] - 1, m['light'].get('radius', 3)))
        if o['t'] == 'lamp_post':
            out.append((o['x'], o['y'] - 2, 3))
    for e in mp.get('events', []):
        m = db.objects.get(e.get('sprite') or '')
        if m and m.get('light') and e['type'] in ('object',) and not (e.get('sprite') == 'moonwell' and not e.get('state')):
            out.append((e['x'], e['y'] - 1, m['light'].get('radius', 3)))
    return out


def finish(cv, tint, glows):
    arr = cv.a[..., :3].astype(np.float32) / 255.0
    arr = MK.apply_tint(arr, tint)
    k = {'night': 0.48, 'dusk': 0.22}.get(tint, 0.0)
    if glows and k:
        H, W = arr.shape[:2]
        yy, xx = np.mgrid[0:H, 0:W]
        add = np.zeros((H, W), np.float32)
        for (gx, gy, r) in glows:
            d = np.sqrt((xx - gx * 16 - 8) ** 2 + (yy - gy * 16 - 8) ** 2) / (r * 16)
            add = np.maximum(add, np.clip(1 - d, 0, 1) ** 1.5)
        arr = np.clip(arr + add[..., None] * np.array([1.0, 0.72, 0.38]) * k, 0, 1)
    return arr


def render_variant(db, spr, atl, npcs, map_id, name, flags, hour, tint, scale, phones):
    real = node_eval(DUMP_JS, map_id, json.dumps(sorted(flags)), hour or '')
    drawn = skin(real, db, flags, npcs)
    full = P.render(drawn, db, spr, atl, npc_map=npcs, flags=flags)
    sh = real.get('_shade')
    if sh and sh['shade'] and sh['hour'] != 'night':
        bare = dict(drawn, decor=[d for d in drawn['decor'] if d['t'] in ('sun_plate',)], events=[], start=None, overhead=[])
        ground = P.render(bare, db, spr, atl, npc_map=npcs, flags=flags)
        shaded = P.Canvas(ground.w, ground.h)
        shaded.a[...] = ground.a
        shade_over(shaded, sh['shade'])
        diff = np.any(full.a != ground.a, axis=-1)
        out = np.where(diff[..., None], full.a, shaded.a)
        full.a[...] = out
    t = tint if tint is not None else (HOUR_TINT.get(sh['hour']) if sh else None)
    arr = finish(full, t, lights_of(drawn, db))
    img1 = Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
    big = img1.resize((img1.width * scale, img1.height * scale), Image.NEAREST)
    big.save(os.path.join(HERE, '%s_clean.png' % name))
    real_ev = [e for e in real['events'] if P.present(e, flags)]
    ann = P.annotate(big.convert('RGBA'), dict(real, events=real_ev), scale)
    ann.save(os.path.join(HERE, '%s.png' % name))
    print('wrote', name, '%dx%d tiles' % (len(real['ground'][0]), len(real['ground'])))
    for (pname, cx, cy) in phones:
        frame, win, _, _, _ = MK.phone_frame(arr, cx * 16 + 8, cy * 16 + 8)
        Image.fromarray((frame * 255 + 0.5).astype(np.uint8)).save(os.path.join(HERE, '%s_phone.png' % pname))
        Image.fromarray((win * 255 + 0.5).astype(np.uint8)).save(os.path.join(HERE, '%s_1x.png' % pname))
        print('  phone', pname)


SHIP = {'ep5_started', 'ship_boarded', 'ship_arrived'}
ROAD = SHIP | {'bram_asked', 'bram_told', 'ship_first_fight_done', 'road_landed'}
HAVEN = ROAD | {'saw_glass_flat', 'tent_rested', 'saw_haven', 'haven_arrived', 'met_sel', 'bells_started', 'roads_started'}
DONE = HAVEN | {'star_reading_done', 'sky_learned', 'gnomon_get', 'lab_entered', 'lab_f1_done', 'lab_f2_done', 'knight_defeated',
                'sel_walked_in', 'oracle_defeated', 'chart_restored', 'roads_returned', 'haven_restored', 'ep5_complete',
                'moonwell_woken', 'testimony_yara', 'testimony_kamal', 'testimony_nasrin', 'bells_done',
                'bell_1_found', 'bell_2_found', 'bell_3_found'}
EP4_DONE = {'ep4_complete', 'vw_restored', 'vw_arrived', 'saw_valewyn', 'keep_ferry_open'}

# map id -> [(preview name, flags, hour or None, tint or None (None: the hour's), phone frames [(name, cx, cy)])]
VARIANTS = {
    'ep5_ship': [('ep5_ship_night', SHIP, None, 'night', [('ep5_ship_night', 12, 7)]),
                 ('ep5_ship_dawn', SHIP | {'bram_asked', 'ship_first_fight_done'}, None, 'dawn', [])],
    'ep5_caravan_road': [('ep5_caravan_road_noon', ROAD, 'noon', None, [('ep5_caravan_road_flat_noon', 18, 12)]),
                         ('ep5_caravan_road_dawn', ROAD, 'dawn', None, [('ep5_caravan_road_flat_dawn', 18, 12)]),
                         ('ep5_caravan_road_dusk', ROAD, 'dusk', None, []),
                         ('ep5_caravan_road_isle', ROAD | {'bells_started'}, 'noon', None, [('ep5_caravan_road_isle_noon', 18, 8)])],
    'ep5_saffron': [('ep5_saffron', HAVEN, None, 'dusk', [('ep5_saffron_centre', 24, 12), ('ep5_saffron_gate', 21, 25)]),
                    ('ep5_saffron_restored', DONE, None, 'none', [('ep5_saffron_restored_centre', 24, 12)])],
    'ep5_sh_inn': [('ep5_sh_inn', HAVEN, None, 'none', [])],
    'ep5_sh_shop': [('ep5_sh_shop', HAVEN, None, 'none', [])],
    'ep5_sh_smithy': [('ep5_sh_smithy', HAVEN, None, 'none', [])],
    'ep5_sh_observatory': [('ep5_sh_observatory', HAVEN, None, 'night', [])],
    'ep4_valewyn': [('ep4_valewyn_ep5', EP4_DONE | {'ep5_started', 'ep5_morning_done'}, None, 'none', [('ep4_valewyn_ep5_berth', 31, 27)]),
                    ('ep4_valewyn_ep5_south', EP4_DONE | {'ep5_started', 'ship_boarded', 'road_landed'}, None, 'none', [])],
    'ep4_vw_inn': [('ep4_vw_inn_ep5', EP4_DONE, None, 'none', [])],
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
    db, spr, atl = EP5DB(), P.SpriteDB(), EP5Atlases()
    npcs = node_eval(NPC_JS)
    for map_id in ids:
        for (name, flags, hour, tint, phones) in VARIANTS[map_id]:
            render_variant(db, spr, atl, npcs, map_id, name, set(flags), hour, tint, scale, phones)


if __name__ == '__main__':
    main(sys.argv)
