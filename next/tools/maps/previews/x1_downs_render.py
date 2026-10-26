"""X1-maps-west previews: x1_downs, x1_loomhouse, x1_barrow (and their variants), at 2x, annotated and clean.

    python tools/maps/previews/x1_downs_render.py            # every preview below, into tools/maps/previews/
    python tools/maps/previews/x1_downs_render.py x1_barrow  # one map (all its variants)
    python tools/maps/previews/x1_downs_render.py --scale=3  # a bigger scale (the default is 2)

Why a script of its own: tools/maps/preview.py draws every `shelf` as the Archive's bookcase, every `gate` with the Archive's
door art, and has not met the x1 NPC and foe atlases (the pack merges them at run time). This script reuses preview.render()
and changes only what is drawn: a `shelf` becomes the x1_slab piece at the position of its state, a `gate` the barrow's hurdle
gate (closed or open), the x1 NPC and field-foe sprites come from assets/sprites/x1_*.json. Nothing else is touched; the
annotations (events, marks, triggers) come from the real map module.

Variants: x1_downs (fresh save), x1_downs_late (archive_f1_done, stones_lettered, reeve_named, strays_done: the chain lies in the
road, the stones are lettered, five more sheep in the fold), x1_loomhouse, x1_loomhouse_late (the sampler dark), x1_barrow (start),
x1_barrow_solved (the switch thrown, both slabs moved, the plate down under the block, the gate open, the niche block shoved).
"""
import copy, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.normpath(os.path.join(HERE, '..'))
NEXT = os.path.normpath(os.path.join(MAPS, '..', '..'))
sys.path.insert(0, MAPS)
import preview as P                                    # noqa: E402
from x1_preview import X1DB                            # noqa: E402  (preview.py put tools/art/tiles on sys.path)
from pxlib import Canvas                               # noqa: E402
import numpy as np                                     # noqa: E402
from PIL import Image                                  # noqa: E402


class X1Atlases(P.Atlases):
    """The stock atlases plus the x1 NPC and field-foe atlases (the pack loader merges them in the game)."""

    def __init__(self):
        super().__init__()
        self.x1n = self._load('x1_npcs.json')
        self.x1e = self._load('x1_enemies_field.json')

    def npc_frame(self, sprite, d='down'):
        fr = super().npc_frame(sprite, d)
        if fr:
            return fr
        meta, img = self.x1n
        info = meta['sprites'].get(sprite)
        name = '%s_%s_0' % (sprite, d)
        if info and name in meta['frames']:
            return img.crop(*meta['frames'][name]), info.get('origin', [12, 31]), False
        return None

    def enemy_frame(self, sprite):
        fr = super().enemy_frame(sprite)
        if fr:
            return fr
        meta, img = self.x1e
        info = meta['sprites'].get(sprite)
        if info and sprite + '_0' in meta['frames']:
            return img.crop(*meta['frames'][sprite + '_0']), info['origin'], False
        return None


def x1_npc_map():
    js = ("import('./src/data/x1/index.js').then(async m=>{await m.register();const n=await import('./src/data/npcs.js');"
          "console.log(JSON.stringify(Object.fromEntries(Object.entries(n.NPCS).map(([k,v])=>[k,[v.sprite,v.name]]))))})")
    r = subprocess.run(['node', '-e', js], cwd=NEXT, capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout) if r.returncode == 0 else P.npc_sprites()


def skin(mp, solved=False):
    """The drawn copy of a map: shelves, gates and mechanism states in the art the field will show."""
    mp = copy.deepcopy(mp)
    decor, overlays, events = mp['decor'], mp['overlays'], []
    for e in mp['events']:
        t = e['type']
        if t == 'shelf':
            decor.append({'t': e.get('sprite', 'x1_slab'), 'x': e['positions'][1 if solved else e.get('state', 0)][0],
                          'y': e['positions'][1 if solved else e.get('state', 0)][1]})
            continue
        if t == 'gate' and e['sprite'] in ('door_locked', 'x1_gate_barrow'):
            decor.append({'t': 'x1_gate_barrow_open' if solved else 'x1_gate_barrow_closed', 'x': e['x'], 'y': e['y']})
            continue
        if solved and t == 'switch':
            overlays.append({'t': 'switch_on', 'x': e['x'], 'y': e['y']})
            continue
        if solved and t == 'plate':
            overlays.append({'t': 'plate_down', 'x': e['x'], 'y': e['y']})
            continue
        if solved and t == 'block' and e['id'] == 'block_c':
            e = dict(e, x=25, y=6)
        if solved and t == 'block' and e['id'] == 'block_niche':
            e = dict(e, x=11, y=16)
        events.append(e)
    mp['events'] = events
    return mp


def render_one(db, spr, atl, npcs, map_id, name, scale, flags=None, solved=False):
    real = P.load_map(map_id)
    drawn = skin(real, solved)
    cv = P.render(drawn, db, spr, atl, npc_map=npcs, flags=flags)
    big = cv.image().resize((cv.w * scale, cv.h * scale), Image.NEAREST)
    big.save(os.path.join(HERE, '%s_clean.png' % name))
    real_ev = [e for e in real['events'] if P.present(e, flags)]
    # the stones trigger covers the whole ring: draw it as an outline so the stones stay visible
    big_ev = [e for e in real_ev if e['id'] != 'stones_trig']
    ann = P.annotate(big.convert('RGBA'), dict(real, events=big_ev), scale)
    for e in real_ev:
        if e['id'] == 'stones_trig':
            from PIL import ImageDraw
            S = 16 * scale
            d = ImageDraw.Draw(ann, 'RGBA')
            d.rectangle([e['x'] * S, e['y'] * S, (e['x'] + e['w']) * S - 1, (e['y'] + e['h']) * S - 1], outline=(255, 220, 60, 255), width=1)
            d.text((e['x'] * S + 2, e['y'] * S + 2), 'stones_arrival', fill=(255, 220, 60, 255))
    out = os.path.join(HERE, '%s.png' % name)
    ann.save(out)
    print('wrote', out, '%dx%d tiles' % (len(real['ground'][0]), len(real['ground'])))


VARIANTS = {
    'x1_downs': [('x1_downs', {'first_fight_done'}, False),
                 ('x1_downs_late', {'first_fight_done', 'archive_f1_done', 'archivore_defeated', 'stones_lettered', 'reeve_named', 'strays_done'}, False)],
    'x1_loomhouse': [('x1_loomhouse', set(), False), ('x1_loomhouse_late', {'stones_lettered'}, False)],
    'x1_barrow': [('x1_barrow', set(), False), ('x1_barrow_solved', set(), True)],
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
    db, spr, atl, npcs = X1DB(), P.SpriteDB(), X1Atlases(), x1_npc_map()
    for map_id in ids:
        for name, flags, solved in VARIANTS[map_id]:
            render_one(db, spr, atl, npcs, map_id, name, scale, flags, solved)


if __name__ == '__main__':
    main(sys.argv)
