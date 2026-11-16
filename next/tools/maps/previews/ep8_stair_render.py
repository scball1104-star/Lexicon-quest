"""E8-maps-a previews: the Stair of Written Light in each book state that matters, the Scriptorium (before and after
scriptorium_open), its four interiors, the bell tower at night, and the Keeper's Watch and the Stillheart as the ep8 pack
patches them. 2x annotated + clean, and phone frames (the game's 384 x 216 screen scaled to 844 x 390) of the screens that
teach.

    python tools/maps/previews/ep8_stair_render.py                  # every preview below
    python tools/maps/previews/ep8_stair_render.py ep8_stair        # one map's variants
    python tools/maps/previews/ep8_stair_render.py --scale=3

Why a script of its own: tools/maps/preview.py knows no pop-up books. This reuses ep6_airstair_render (preview.render, the
skinning of sprite doors and signs, the tint finish) with E8-tiles' EP8DB (every fragment merged as the packs do) and draws
the book layer the way E8-world's field does, through E8-tiles' mirror (tools/art/tiles/ep8_mocks.py lay_books and
draw_popbooks): a book shut or open (its sprite frame), its pages as the page_bridge 9-slice over void and the page_wall
9-slice over floor, the realm model on an open realm book, the dotted ghost on a book the party faces. A variant names each
book's state as the way its pages stand ('n' 's' 'e' 'w', or '-' shut; a trailing '?' draws the shut book's ghost for that
way instead).
"""
import copy, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ep6_airstair_render as R6                     # noqa: E402  (puts tools/maps and tools/art/tiles on sys.path)
P = R6.P
from ep8_scenes import EP8DB                         # noqa: E402
import ep8_mocks as M8                               # noqa: E402
import numpy as np                                   # noqa: E402
from PIL import Image                                # noqa: E402

DUMP_JS = r"""
const [id] = [process.argv[1]];
let m;
const PATCH = { ep7_ph_watch: 'withEp8Wake', ep7_stillheart: 'withStairDoor' };
if (PATCH[id]) {
  const base = (await import(`./src/data/maps/${id}.js`)).default;
  const P = await import('./src/data/maps/ep8_patches.js');
  m = P[PATCH[id]](base);
} else m = (await import(`./src/data/maps/${id}.js`)).default;
console.log(JSON.stringify(m));
"""

NPC_JS = (
    "await (await import('./src/data/ep7/npcs.js')).register();"
    "await (await import('./src/data/ep8/npcs.js')).register();"
    "const n=await import('./src/data/npcs.js');"
    "console.log(JSON.stringify(Object.fromEntries(Object.entries(n.NPCS).map(([k,v])=>[k,[v.sprite,v.name,v.show||null]]))))"
)

OPP = {'n': 's', 's': 'n', 'e': 'w', 'w': 'e'}


class EP8Atlases(R6.EP6Atlases):
    def __init__(self):
        super().__init__()
        for p in ('ep7', 'ep8'):
            f = '%s_npcs.json' % p
            if os.path.exists(os.path.join(P.SPRITES, f)):
                self.extra_npc.append(self._load(f))
            f = '%s_enemies_field.json' % p
            if os.path.exists(os.path.join(P.SPRITES, f)):
                self.extra_foe.append(self._load(f))


def books_of(mp, states):
    """The map's popbooks in the mock's format for one variant (states: letter -> 'n'/'s'/'e'/'w'/'-', '?' = ghost)."""
    blk = mp.get('popbooks') or {}
    start = blk.get('start') or {}
    out = []
    for k, b in sorted((blk.get('books') or {}).items()):
        st = states.get(k, start.get(k, '-'))
        r = {'x': b['x'], 'y': b['y'], 'axis': b['axis'], 'length': b['length'], 'ribbon': 0}
        if b.get('realm'):
            r['realm'] = b['realm']
        if st.endswith('?'):
            r['side'], r['state'] = OPP[st[0]], 'ghost'
        elif st == '-':
            r['side'], r['state'] = ('s' if b['axis'] == 'ns' else 'w'), 'shut'
        else:
            r['side'], r['state'] = OPP[st], 'open'
        out.append(r)
    return out


def skin(mp, db, flags, npcs):
    """ep6's skin plus: objects with a sprite drawn as decor in their state; popbook events left to the book layer."""
    mp = copy.deepcopy(mp)
    mp['events'] = [e for e in mp['events'] if e['type'] != 'popbook']
    mp = R6.skin(mp, db, flags, npcs, None)
    keep = []
    for e in mp['events']:
        if e['type'] in ('object', 'book') and e.get('sprite') and e['sprite'] in db.objects:
            mp['decor'].append({'t': e['sprite'], 'x': e['x'], 'y': e['y'], 'state': e.get('state', 0)})
            continue
        keep.append(e)
    mp['events'] = keep
    mp['overhead'] = [o for o in mp.get('overhead', []) if P.present(o, flags)]
    return mp


def render_variant(db, spr, atl, npcs, map_id, name, flags, states, tint, scale, phones):
    real = R6.node_eval(DUMP_JS, map_id)
    drawn = skin(real, db, flags, npcs)
    full = P.render(drawn, db, spr, atl, npc_map=npcs, flags=flags)
    if real.get('popbooks'):
        bare = dict(drawn, decor=[], events=[], start=None, overhead=[])
        ground = P.render(bare, db, spr, atl, npc_map=npcs, flags=flags)
        laid = P.Canvas(ground.w, ground.h)
        laid.a[...] = ground.a
        sc = {'ground': drawn['ground'], 'legend': drawn['legend'], 'books': books_of(real, states)}
        M8.lay_books(sc)
        for layer in ('pages', 'ghost', 'books', 'models'):
            M8.draw_popbooks(laid, db, sc, layer)
        diff = np.any(full.a != ground.a, axis=-1)
        full.a[...] = np.where(diff[..., None], full.a, laid.a)
    arr = R6.finish(full, tint, R6.lights_of(drawn, db))
    img1 = Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
    big = img1.resize((img1.width * scale, img1.height * scale), Image.NEAREST)
    big.save(os.path.join(HERE, '%s_clean.png' % name))
    real_ev = [e for e in real['events'] if P.present(e, flags) and e['type'] != 'popbook']
    ann = P.annotate(big.convert('RGBA'), dict(real, events=real_ev), scale)
    ann.save(os.path.join(HERE, '%s.png' % name))
    print('wrote', name, '%dx%d tiles' % (len(real['ground'][0]), len(real['ground'])), states)
    for (pname, cx, cy) in phones:
        fr, win, _, _, _ = M8.phone_frame(arr, cx * 16 + 8, cy * 16 + 8)
        Image.fromarray((fr * 255 + 0.5).astype(np.uint8)).save(os.path.join(HERE, '%s_phone.png' % pname))
        print('  phone', pname)


EP7_DONE = {'ep7_complete', 'doors_reopened', 'ep6_complete', 'ep5_complete', 'ep4_complete', 'ep3_complete', 'ep2_complete',
            'ep1_complete', 'mira_joined', 'bram_joined', 'lantern_get', 'phantom_defeated', 'stillheart_restored',
            'nox_named', 'met_keeper', 'keeper_told', 'vault_open'}
STARTED = EP7_DONE | {'ep8_morning_done', 'ep8_started'}
ROOFED = STARTED | {'ep8_roofed', 'afraid_yes'}
STAIR = ROOFED | {'stair_arrived', 'first_rub_done'}
STAIR_ON = STAIR | {'first_book_read', 'eraser_seen'}
TOWN = STAIR_ON | {'saw_scriptorium', 'scriptorium_arrived'}
TOWN_MID = TOWN | {'read_learned', 'librarian_met', 'card_read', 'elowen_met', 'library_open', 'concordance_started'}
OPENED = TOWN_MID | {'library_entered', 'library_f1_done', 'library_f2_done', 'name_told', 'eraser_defeated', 'keeper_named',
                     'ending_return', 'page_shelved', 'scriptorium_open', 'concordance_lit'}

# map id -> [(preview name, flags, book states, tint, phone frames [(name, cx, cy)])]
VARIANTS = {
    'ep8_stair': [
        ('ep8_stair', STAIR, {'a': 'n?'}, 'none', [('ep8_stair_foot', 15, 50), ('ep8_stair_gap_a', 15, 44)]),
        ('ep8_stair_a', STAIR, {'a': 'n', 'b': 's?'}, 'none', [('ep8_stair_gap_a_open', 15, 42), ('ep8_stair_gap_b_wrong', 15, 36)]),
        ('ep8_stair_ab', STAIR_ON, {'a': 'n', 'b': 'n', 'l': 'e'}, 'none', [('ep8_stair_gap_b', 16, 35), ('ep8_stair_ledge', 21, 39)]),
        ('ep8_stair_b_wrong', STAIR_ON, {'a': 'n', 'b': 's'}, 'none', []),
        ('ep8_stair_c_wall', STAIR_ON, {'a': 'n', 'b': 'n'}, 'none', [('ep8_stair_gap_c_wall', 15, 24), ('ep8_stair_desk', 15, 28)]),
        ('ep8_stair_c_bridge', TOWN, {'a': 'n', 'b': 'n', 'c': 'n'}, 'none', [('ep8_stair_gap_c_bridge', 15, 20),
                                                                              ('ep8_stair_margin', 17, 9)]),
    ],
    'ep8_scriptorium': [
        ('ep8_scriptorium', TOWN, {}, 'none', [('ep8_scriptorium_square', 23, 19), ('ep8_scriptorium_gate', 23, 27),
                                               ('ep8_scriptorium_north', 23, 10)]),
        ('ep8_scriptorium_open', OPENED, {}, 'dusk', [('ep8_scriptorium_open_square', 23, 19),
                                                      ('ep8_scriptorium_open_north', 23, 10)]),
    ],
    'ep8_sc_inn': [('ep8_sc_inn', TOWN, {}, 'none', [])],
    'ep8_sc_shop': [('ep8_sc_shop', TOWN, {}, 'none', [])],
    'ep8_sc_atelier': [('ep8_sc_atelier', TOWN, {}, 'none', [])],
    'ep8_sc_index': [('ep8_sc_index', TOWN | {'read_learned'}, {}, 'none', []),
                     ('ep8_sc_index_after', OPENED, {}, 'none', [])],
    'ep8_bell_night': [('ep8_bell_night', OPENED | {'home_reached'}, {}, 'night', [('ep8_bell_night_top', 12, 6)])],
    'ep7_ph_watch': [('ep7_ph_watch_ep8', EP7_DONE, {}, 'dawn', [])],
    'ep7_stillheart': [('ep7_stillheart_ep8', STARTED, {}, 'none', [('ep7_stillheart_ep8_roof', 18, 10)]),
                       ('ep7_stillheart_ep8_door', ROOFED, {}, 'none', [])],
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
    db, spr, atl = EP8DB(), P.SpriteDB(), EP8Atlases()
    npcs = R6.node_eval(NPC_JS)
    for map_id in ids:
        for (name, flags, states, tint, phones) in VARIANTS[map_id]:
            render_variant(db, spr, atl, npcs, map_id, name, set(flags), states, tint, scale, phones)


if __name__ == '__main__':
    main(sys.argv)
