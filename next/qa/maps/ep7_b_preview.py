"""E7-maps-b previews: the Frostbound Vault's three floors and the Stillheart in the states that matter.

    python next/qa/maps/ep7_b_preview.py            # every state below, 2x, into next/tools/maps/previews/ep7_*.png
    python next/qa/maps/ep7_b_preview.py f2         # the states whose name starts with f2
    python next/qa/maps/ep7_b_preview.py --phone    # also a 384 x 216 crop (3x) round each state's focus cell

The map is rendered by tools/maps/preview.py (the real autotile rules, events, sprites) on a tile database with every pack
fragment merged (tools/art/tiles/ep7_scenes.py EP7DB). The name-stone layer mirrors what E7-world draws (the recipe in
tools/art/tiles/ep7_mocks.py): a held path cell is icepath, an unheld one the fade with the ghost trail, a cairn's frame is
0 dim, 1 lit, 2 the oldest of a full hold (it goes next), a frost cell is frost_door frame 0 while its stone is held and 3
(melted) when not. Darkness, the tint and the aurora band use ep7_mocks' stand-in grades, with a warm pool over each held
cairn (F2's borrowed light), the fonts and the cold lights: an approximation of the field's lighting, for reading layout.
The luma report at the end (mean of the frame, and of the party's cell) is measured on these stand-in grades.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(NEXT, 'tools', 'maps'))
sys.path.insert(0, os.path.join(NEXT, 'tools', 'art', 'tiles'))

import numpy as np                                        # noqa: E402
from PIL import Image                                     # noqa: E402
import preview                                            # noqa: E402
from pxlib import Canvas                                  # noqa: E402
from ep7_scenes import EP7DB                              # noqa: E402
import ep7_mocks                                          # noqa: E402

PREVIEWS = os.path.join(NEXT, 'tools', 'maps', 'previews')
SCALE = 2

# name, map, flags, held (oldest first), party [x, y, dir] or None, focus cell for --phone
F1 = 'vault_entered,vault_open,vault_f1_arrived'
F2 = F1 + ',vault_f1_done,vault_f2_arrived,keeper_memory_2'
F3 = F2 + ',bell_found,lantern_defeated,vault_f2_done,vault_f3_arrived,keeper_memory_3'
STATES = [
    ('f1_b_before', 'ep7_vault_f1', F1, [], [20, 21, 'up'], (17, 17)),
    ('f1_b_after', 'ep7_vault_f1', F1, ['a', 'l'], [14, 13, 'right'], (17, 15)),
    ('f1_c_before', 'ep7_vault_f1', F1 + ',keeper_memory_1', ['a', 'l'], [28, 15, 'up'], (26, 9)),
    ('f1_c_after', 'ep7_vault_f1', F1 + ',keeper_memory_1', ['a', 's'], [31, 7, 'left'], (24, 7)),
    ('f1_side', 'ep7_vault_f1', F1 + ',keeper_memory_1,streets_started', ['l', 'o'], [4, 12, 'up'], (12, 9)),
    ('f2_grip_held', 'ep7_vault_f2', F2, ['d'], [13, 17, 'up'], (14, 16)),
    ('f2_grip_let', 'ep7_vault_f2', F2, ['h', 'r'], [17, 16, 'up'], (17, 12)),
    ('f2_bell', 'ep7_vault_f2', F2, ['r', 'd'], [24, 8, 'up'], (22, 10)),
    ('f2_reliquary', 'ep7_vault_f2', F2 + ',bell_found,page_door_found,page_flame_found,page_lost_found,reliquary_open', ['t', 'k'], [35, 5, 'right'], (30, 9)),
    ('f2_lamp_gallery', 'ep7_vault_f2', F3, ['d'], [23, 17, 'down'], (27, 20)),
    ('f3_first', 'ep7_vault_f3', F2 + ',vault_f3_arrived', ['y'], [17, 33, 'up'], (17, 30)),
    ('f3_remember', 'ep7_vault_f3', F3, ['g', 'a'], [13, 21, 'right'], (16, 21)),
    ('f3_remember_after', 'ep7_vault_f3', F3, ['a', 'y'], [21, 20, 'up'], (19, 19)),
    ('f3_return', 'ep7_vault_f3', F3 + ',keeper_came,stillheart_open,stillheart_key_found', ['y', 'i'], [17, 10, 'up'], (17, 11)),
    ('stillheart_before', 'ep7_stillheart', F3 + ',stillheart_open', [], [16, 14, 'up'], (16, 12)),
    ('stillheart_after', 'ep7_stillheart', F3 + ',stillheart_open,phantom_defeated,stillheart_restored', [], [16, 14, 'up'], (16, 12)),
    ('stillheart_night', 'ep7_stillheart', F3 + ',stillheart_open,phantom_defeated,stillheart_restored,page_whole,doors_reopened', [], [16, 15, 'up'], (16, 11)),
]
LIGHT_OBJ = {'frostfire': ('#8af0e8', 2.8), 'crystal': ('#a9f2cf', 2.4), 'auroraobelisk': ('#a9f2cf', 2.6), 'font_thaw': ('#f9d77a', 2.6),
             'lift_frost': ('#b4e4f2', 1.6)}
TINT_GRADE = {'aurora': ('#8f9ae0', 0.40, 0.12), 'night': ('#262a66', 0.6, 0.30)}


def atlases():
    atl = preview.Atlases()
    sp = preview.SPRITES
    for name in ('ep7_npcs.json',):
        if os.path.exists(os.path.join(sp, name)):
            atl.npc_extra.append(atl._load(name))
    if os.path.exists(os.path.join(sp, 'ep7_enemies_field.json')):
        meta, img = atl._load('ep7_enemies_field.json')
        base_meta, base_img = atl.enemy
        # one canvas per atlas: put the pack frames on a canvas of their own and look them up first
        atl._ep7_enemy = (meta, img)
        orig = atl.enemy_frame

        def enemy_frame(sprite, _o=orig):
            m, im = atl._ep7_enemy
            info = m['sprites'].get(sprite)
            key = sprite + '_0' if sprite + '_0' in m['frames'] else next((k for k in m['frames'] if k.startswith(sprite + '_')), None)
            if info and key:
                return im.crop(*m['frames'][key]), info.get('origin', [16, 31]), False
            return _o(sprite)
        atl.enemy_frame = enemy_frame
    return atl


def flagset(s):
    return set(f for f in s.split(',') if f)


def present(e, flags):
    return preview.present(e, flags)


def stone_layer(mp, flags, held):
    """Rewrite the map for a held set: icepath ground, ghost cells, cairn frames, frost doors; returns (mp, ghosts, lamps)."""
    rem = mp.get('remember')
    events = [e for e in mp['events'] if present(e, flags)]
    decor = [d for d in mp.get('decor', []) if present(d, flags)]
    ghosts, lamps = [], []
    if rem:
        g = [list(r) for r in mp['ground']]
        paths = rem.get('paths') or []
        cells = {}
        for y, row in enumerate(paths):
            for x, ch in enumerate(row):
                if ch.isalpha() and ch.islower():
                    cells[(x, y)] = ch
                    if ch in held:
                        g[y][x] = '~'
                    else:
                        ghosts.append((x, y))
        mp = dict(mp, ground=[''.join(r) for r in g], legend=dict(mp['legend'], **{'~': 'icepath'}))
        for y, row in enumerate(rem.get('frost') or []):
            for x, ch in enumerate(row):
                if ch.isalpha() and ch.isupper():
                    decor.append({'t': 'frost_door', 'x': x, 'y': y, 'state': 0 if ch.lower() in held else 3})
        mp['_cells'] = cells
    keep = []
    for e in events:
        if e['type'] == 'namestone':
            s = e['stone']
            st = 0
            if s in held:
                st = 2 if (len(held) >= 2 and held[0] == s) else 1
                lamps.append((e['x'], e['y'] - 1, 2.4))
            decor.append({'t': e.get('sprite', 'name_plate'), 'x': e['x'], 'y': e['y'], 'state': st, '_faint': bool(e.get('lantern'))})
        else:
            keep.append(e)
    mp = dict(mp, events=keep, decor=decor)
    return mp, ghosts, lamps


def render_state(name, map_id, flags_s, held, party, db, spr, atl, npc_map):
    flags = flagset(flags_s)
    mp = preview.load_map(map_id)
    mp, ghosts, lamps = stone_layer(mp, flags, held)
    if party:
        mp['start'] = {'x': party[0], 'y': party[1], 'dir': party[2]}
    cv = preview.render(mp, db, spr, atl, frame=0, npc_map=npc_map, flags=flags)
    # the ghost trail on every unheld path cell (frame 0 runs north-south, 1 east-west)
    if ghosts and 'ghost_trail' in db.objects:
        m = db.objects['ghost_trail']
        sheet = db.sheet(m['sheet'])
        cells = mp['_cells']
        for (x, y) in ghosts:
            s = cells[(x, y)]
            vert = cells.get((x, y - 1)) == s or cells.get((x, y + 1)) == s
            fx, fy, fw, fh = m['frames'][0 if vert else 1]
            cv.blit(sheet.crop(fx, fy, 16, 16), x * 16, y * 16)
    arr = cv.a[..., :3].astype(np.float32) / 255.0
    light = mp.get('lighting') or {}
    dark = light.get('dark', 0) or 0
    tint = preview.pickConditional(light.get('tint'), flags) if hasattr(preview, 'pickConditional') else light.get('tint')
    if isinstance(light.get('tint'), list):
        tint = next((c['id'] for c in light['tint'] if present(c, flags)), None)
    for d in mp['decor']:
        if d['t'] in LIGHT_OBJ:
            lamps.append((d['x'], d['y'] - 1, LIGHT_OBJ[d['t']][1]))
    for e in mp['events']:
        if e['type'] == 'font':
            lamps.append((e['x'] + 0.5, e['y'] - 1, 2.6))
    if dark:
        arr = ep7_mocks.apply_dark(arr, {'dark': dark, 'lamps': lamps})
    if tint in TINT_GRADE:
        ep7_mocks.TINTS[tint] = TINT_GRADE[tint]
        arr = ep7_mocks.apply_tint(arr, tint)
    if tint == 'aurora':
        arr = ep7_mocks.aurora_band(arr, rows=(0, 9))
    img = Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
    lum = ep7_mocks.luma(arr)
    pl = None
    if party:
        px, py = party[0] * 16, party[1] * 16
        pl = float(lum[py + 12:py + 16, px:px + 16].mean())
    return img, mp, float(lum.mean()), pl


def phone_crop(img, focus, scale=3):
    W, H = img.size
    cx, cy = focus[0] * 16 + 8, focus[1] * 16 + 8
    x0 = max(0, min(W - 384, cx - 192)) if W > 384 else 0
    y0 = max(0, min(H - 216, cy - 108)) if H > 216 else 0
    c = img.crop((x0, y0, x0 + 384, y0 + 216))
    return c.resize((384 * scale, 216 * scale), Image.NEAREST)


def main(argv):
    phone = '--phone' in argv
    want = [a for a in argv[1:] if not a.startswith('--')]
    db = EP7DB()
    preview.merge_ep3_tiles(db)
    spr = preview.SpriteDB()
    atl = atlases()
    npc_map = preview.npc_sprites()
    os.makedirs(PREVIEWS, exist_ok=True)
    report = {}
    done_maps = set()
    for name, map_id, flags_s, held, party, focus in STATES:
        if want and not any(name.startswith(w) for w in want):
            continue
        img, mp, mean, pl = render_state(name, map_id, flags_s, held, party, db, spr, atl, npc_map)
        report[name] = {'mean_luma': round(mean, 3), 'party_luma': round(pl, 3) if pl is not None else None}
        big = img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)
        out = os.path.join(PREVIEWS, '%s_%s.png' % (map_id, name.split('_', 1)[1] if not name.startswith('stillheart') else name.split('_', 1)[1]))
        big.save(out)
        print('wrote', out, report[name])
        if map_id not in done_maps:
            ann = preview.annotate(big.convert('RGBA'), mp, SCALE)
            ann.save(os.path.join(PREVIEWS, '%s.png' % map_id))
            print('wrote', os.path.join(PREVIEWS, '%s.png' % map_id), '(annotated, %s)' % name)
            done_maps.add(map_id)
        if phone:
            p = os.path.join(preview.OUT, '%s_%s_phone.png' % (map_id, name))
            os.makedirs(preview.OUT, exist_ok=True)
            phone_crop(img, focus).save(p)
            print('wrote', p)
    os.makedirs(preview.OUT, exist_ok=True)
    with open(os.path.join(preview.OUT, 'ep7_b_luma.json'), 'w', newline='\n') as f:
        json.dump(report, f, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
