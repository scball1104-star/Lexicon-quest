"""E7-maps-a previews: the White Road (each gap before and after its read), the Courier's Waystation, Palehaven (before and
after doors_reopened), its four interiors, and Zephyr Landing, the Cloudhouse Inn and the Chart Room as the ep7 pack patches
them. 2x annotated + clean, and phone frames (the game's 384 x 216 screen scaled to 844 x 390) of the screens that teach.

    python tools/maps/previews/ep7_white_road_render.py                  # every preview below
    python tools/maps/previews/ep7_white_road_render.py ep7_white_road   # one map's variants

Why a script of its own: tools/maps/preview.py knows no name stones. This reuses ep6_airstair_render (preview.render, the
skinning of sprite doors and signs, the tint finish) with E7-tiles' EP7DB (every fragment merged as the packs do) and draws
the name-stone layer the way E7-world's field does (a mirror: tools/art/tiles/ep7_mocks.py): held path cells as `icepath`,
unheld ones as the fade with the ghost trail drawn under everything that stands, cairns dim, lit, or flickering (the oldest
held, frame 2).
"""
import copy, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ep6_airstair_render as R6                     # noqa: E402  (puts tools/maps and tools/art/tiles on sys.path)
P = R6.P
from ep7_scenes import EP7DB                         # noqa: E402
import ep7_mocks as M7                               # noqa: E402
import numpy as np                                   # noqa: E402
from PIL import Image                                # noqa: E402

DUMP_JS = r"""
const [id] = [process.argv[1]];
let m;
const PATCH = { ep6_zl_inn: 'withEp7Wake', ep6_zl_charts: 'withEp7Charts', ep6_zephyr: 'withNorthBerth' };
if (PATCH[id]) {
  const base = (await import(`./src/data/maps/${id}.js`)).default;
  const P = await import('./src/data/maps/ep7_patches.js');
  m = P[PATCH[id]](base);
} else m = (await import(`./src/data/maps/${id}.js`)).default;
console.log(JSON.stringify(m));
"""

HELD_CH, FADE_CH = chr(0x2460), chr(0x2461)   # legend chars for the drawn copy only

NPC_JS = (
    "await (await import('./src/data/ep6/index.js')).register();"
    "await (await import('./src/data/ep7/npcs.js')).register();"
    "const n=await import('./src/data/npcs.js');"
    "console.log(JSON.stringify(Object.fromEntries(Object.entries(n.NPCS).map(([k,v])=>[k,[v.sprite,v.name,v.show||null]]))))"
)


class EP7Atlases(R6.EP6Atlases):
    def __init__(self):
        super().__init__()
        for f in ('ep7_npcs.json',):
            if os.path.exists(os.path.join(P.SPRITES, f)):
                self.extra_npc.append(self._load(f))
        for f in ('ep7_enemies_field.json',):
            if os.path.exists(os.path.join(P.SPRITES, f)):
                self.extra_foe.append(self._load(f))


def stones_layer(mp, held):
    """Rewrite the map's ground for a held order (oldest first): held path cells -> icepath, unheld -> fade; namestone events
    become cairn decor in their state. Returns (map, ghost cells, cell owners)."""
    rem = mp.get('remember')
    if not rem:
        return mp, [], {}
    mp = copy.deepcopy(mp)
    legend = dict(mp['legend'])
    legend[HELD_CH] = 'icepath'
    legend[FADE_CH] = 'fade'
    g = [list(r) for r in mp['ground']]
    cells, ghosts = {}, []
    for y, row in enumerate(rem['paths']):
        for x, ch in enumerate(row):
            if ch.isalpha() and ch.islower():
                cells[(x, y)] = ch
                if ch in held:
                    g[y][x] = HELD_CH
                else:
                    g[y][x] = FADE_CH
                    ghosts.append((x, y))
    mp['ground'] = [''.join(r) for r in g]
    mp['legend'] = legend
    keep = []
    for e in mp['events']:
        if e['type'] == 'namestone':
            s = e['stone']
            st = 0
            if s in held:
                st = 2 if (len(held) >= 2 and held[0] == s) else 1
            mp['decor'].append({'t': e.get('sprite', 'namestone'), 'x': e['x'], 'y': e['y'], 'state': st})
        else:
            keep.append(e)
    mp['events'] = keep
    return mp, ghosts, cells


def skin(mp, db, flags, npcs):
    """ep6's skin plus: objects with a sprite drawn as decor in their state (two-state hearth, iced doors, stove)."""
    mp = R6.skin(mp, db, flags, npcs, None)
    keep = []
    for e in mp['events']:
        if e['type'] in ('object', 'chest_like') and e.get('sprite') and e['sprite'] in db.objects:
            mp['decor'].append({'t': e['sprite'], 'x': e['x'], 'y': e['y'], 'state': e.get('state', 0)})
            continue
        keep.append(e)
    mp['events'] = keep
    return mp


def render_variant(db, spr, atl, npcs, map_id, name, flags, held, tint, scale, phones):
    real = R6.node_eval(DUMP_JS, map_id)
    stoned, ghosts, cells = stones_layer(real, held)
    drawn = skin(stoned, db, flags, npcs)
    full = P.render(drawn, db, spr, atl, npc_map=npcs, flags=flags)
    if ghosts:
        bare = dict(drawn, decor=[], events=[], start=None, overhead=[])
        ground = P.render(bare, db, spr, atl, npc_map=npcs, flags=flags)
        trail = P.Canvas(ground.w, ground.h)
        trail.a[...] = ground.a
        M7.draw_ghosts(trail, db, {'_ghosts': ghosts, '_cells': cells})
        diff = np.any(full.a != ground.a, axis=-1)
        full.a[...] = np.where(diff[..., None], full.a, trail.a)
    arr = R6.finish(full, tint, R6.lights_of(drawn, db))
    img1 = Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
    big = img1.resize((img1.width * scale, img1.height * scale), Image.NEAREST)
    big.save(os.path.join(HERE, '%s_clean.png' % name))
    real_ev = [e for e in real['events'] if P.present(e, flags)]
    ann = P.annotate(big.convert('RGBA'), dict(real, events=real_ev), scale)
    ann.save(os.path.join(HERE, '%s.png' % name))
    print('wrote', name, '%dx%d tiles' % (len(real['ground'][0]), len(real['ground'])), 'held', held)
    for (pname, cx, cy) in phones:
        fr, win, _, _, _ = M7.phone_frame(arr, cx * 16 + 8, cy * 16 + 8)
        Image.fromarray((fr * 255 + 0.5).astype(np.uint8)).save(os.path.join(HERE, '%s_phone.png' % pname))
        print('  phone', pname)


EP6_DONE = {'ep6_complete', 'isles_restored', 'beacon_lit', 'library_reached', 'scribe_defeated', 'compass_restored',
            'zephyr_arrived', 'met_aeris', 'charts_seen', 'anchor_learned', 'windward_pass', 'ep5_complete', 'ep4_complete',
            'ep3_complete', 'ep2_complete', 'ep1_complete', 'mira_joined', 'bram_joined'}
STARTED = EP6_DONE | {'ep7_morning_done', 'ep7_started'}
BOARDED = STARTED | {'ep7_boarded'}
ROAD = BOARDED | {'road_arrived'}
ROAD_ON = ROAD | {'vex_carved', 'road_fight_done', 'first_stone_read'}
TOWN = ROAD_ON | {'call_learned', 'saw_sevens', 'saw_palehaven', 'palehaven_arrived'}
TOWN_MID = TOWN | {'met_keeper', 'keeper_told', 'vault_open', 'hearth_started', 'streets_started'}
REOPENED = TOWN_MID | {'vault_entered', 'phantom_defeated', 'stillheart_restored', 'page_whole', 'nox_named', 'marten_named',
                       'doors_reopened', 'letter_sent', 'vex_name_whole'}

# map id -> [(preview name, flags, held (oldest first), tint, phone frames [(name, cx, cy)])]
VARIANTS = {
    'ep7_white_road': [
        ('ep7_white_road', ROAD, [], 'none', [('ep7_white_road_lake', 16, 69), ('ep7_white_road_gap_a', 12, 47),
                                              ('ep7_white_road_wall', 16, 62)]),
        ('ep7_white_road_a', ROAD_ON, ['a'], 'none', [('ep7_white_road_gap_a_read', 16, 45)]),
        ('ep7_white_road_ab', ROAD_ON, ['a', 'b'], 'none', [('ep7_white_road_gap_b', 18, 38)]),
        ('ep7_white_road_bn', ROAD_ON, ['b', 'n'], 'none', [('ep7_white_road_gap_b_read', 19, 33)]),
        ('ep7_white_road_bi', ROAD_ON | {'streets_started'}, ['b', 'i'], 'none', [('ep7_white_road_ilka', 12, 34)]),
        ('ep7_white_road_ns', TOWN, ['n', 's'], 'none', [('ep7_white_road_gap_c_read', 16, 24), ('ep7_white_road_top', 18, 15)]),
    ],
    'ep7_waystation': [('ep7_waystation', ROAD_ON, [], 'none', []), ('ep7_waystation_lit', TOWN, [], 'none', [])],
    'ep7_palehaven': [
        ('ep7_palehaven', TOWN, [], 'none', [('ep7_palehaven_square', 23, 18), ('ep7_palehaven_gate', 24, 28),
                                             ('ep7_palehaven_north', 27, 10)]),
        ('ep7_palehaven_open', TOWN_MID, [], 'none', [('ep7_palehaven_open_north', 27, 10)]),
        ('ep7_palehaven_reopened', REOPENED, [], 'none', [('ep7_palehaven_reopened_square', 23, 18)]),
    ],
    'ep7_ph_inn': [('ep7_ph_inn', TOWN, [], 'none', [])],
    'ep7_ph_shop': [('ep7_ph_shop', TOWN, [], 'none', [])],
    'ep7_ph_armory': [('ep7_ph_armory', TOWN, [], 'none', [])],
    'ep7_ph_watch': [('ep7_ph_watch', TOWN_MID, [], 'none', []), ('ep7_ph_watch_reopened', REOPENED, [], 'none', [])],
    'ep6_zephyr': [('ep6_zephyr_ep7', STARTED, [], 'none', [('ep6_zephyr_ep7_dock', 21, 7)]),
                   ('ep6_zephyr_ep7_boarded', ROAD, [], 'none', [])],
    'ep6_zl_inn': [('ep6_zl_inn_ep7', EP6_DONE, [], 'none', [])],
    'ep6_zl_charts': [('ep6_zl_charts_ep7', EP6_DONE, [], 'none', []), ('ep6_zl_charts_ep7_after', STARTED, [], 'none', [])],
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
    db, spr, atl = EP7DB(), P.SpriteDB(), EP7Atlases()
    npcs = R6.node_eval(NPC_JS)
    for map_id in ids:
        for (name, flags, held, tint, phones) in VARIANTS[map_id]:
            path = os.path.join(R6.NEXT, 'src', 'data', 'maps', '%s.js' % map_id)
            if not os.path.exists(path):
                print('skip', map_id, '(not written yet)')
                break
            render_variant(db, spr, atl, npcs, map_id, name, set(flags), held, tint, scale, phones)


if __name__ == '__main__':
    main(sys.argv)
