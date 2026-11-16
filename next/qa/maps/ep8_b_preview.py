"""E8-maps-b previews: the First Library's three floors and the Last Word in the book states that matter.

    python next/qa/maps/ep8_b_preview.py            # every state below, 2x, into next/tools/maps/previews/ep8_*.png
    python next/qa/maps/ep8_b_preview.py f2         # the states whose name starts with f2
    python next/qa/maps/ep8_b_preview.py --phone    # also a 384 x 216 crop (3x) round each state's focus cell

The map is rendered by tools/maps/preview.py (the real autotile rules, events, sprites) on a tile database with every pack
fragment merged (tools/art/tiles/ep8_scenes.py EP8DB). The pop-up layer mirrors what E8-world draws (the recipe in
tools/art/tiles/ep8_mocks.py): an open book's pages are page_bridge over the void and page_wall over floor, a faced shut
book shows page_ghost where its pages will stand, a book's frame is ribbon x 4 + (0 shut, 3 open); palimpsest pairs share a
ribbon. Darkness and the tints use ep8_mocks' stand-in grades (dark with a warm pool over each fountain and light event,
violet for the Last Word, the gold lift after the win): an approximation of the field's lighting, for reading layout.
The luma report at the end (mean of the frame, the party's cell, and on F3 the hero sprite against the page floor) is
measured on these grades and written to tools/maps/out/ep8_b_luma.json.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(NEXT, 'tools', 'maps'))
sys.path.insert(0, os.path.join(NEXT, 'tools', 'art', 'tiles'))

import numpy as np                                        # noqa: E402
from PIL import Image                                     # noqa: E402
import preview                                            # noqa: E402
from compose import draw_object                           # noqa: E402
from ep8_scenes import EP8DB                              # noqa: E402
import ep8_mocks                                          # noqa: E402

PREVIEWS = os.path.join(NEXT, 'tools', 'maps', 'previews')
SCALE = 2

F1 = 'ep8_started,library_open,library_entered,lib_f1_arrived'
F2 = F1 + ',keeper_memory_a,ink_key_found,library_f1_done,lib_f2_arrived'
F3 = F2 + ',keeper_memory_b,sentry_defeated,library_f2_done,lib_f3_arrived'
LW = F3 + ',keeper_memory_c,beginning_seen,name_told'
# name, map, flags, book states {book: dir | 'ghost:<dir>'} (None: the map's start), party [x, y, dir], focus for --phone
STATES = [
    ('f1_start', 'ep8_library_f1', F1, None, [20, 27, 'up'], (20, 20)),
    ('f1_b_ghost', 'ep8_library_f1', F1, {'a': 'ghost:n'}, [21, 19, 'up'], (21, 16)),
    ('f1_b_open', 'ep8_library_f1', F1, {'a': 'n'}, [21, 13, 'up'], (22, 14)),
    ('f1_b_island', 'ep8_library_f1', F1, {'a': 'n', 'b': 'e'}, [24, 10, 'right'], (26, 12)),
    ('f1_c_wall', 'ep8_library_f1', F1 + ',keeper_memory_a', {'a': 'n', 'b': 'e', 'c': 'n'}, [32, 5, 'up'], (31, 7)),
    ('f1_e_key', 'ep8_library_f1', F1 + ',keeper_memory_a', {'a': 'n', 'b': 'e', 'c': 'n', 'h': 'w'}, [13, 4, 'up'], (19, 6)),
    ('f1_side', 'ep8_library_f1', F1 + ',drift_started', {'d': 'n'}, [6, 13, 'up'], (8, 14)),
    ('f2_start', 'ep8_library_f2', F2, None, [5, 27, 'up'], (14, 18)),
    ('f2_pair', 'ep8_library_f2', F2, {'v': 'e'}, [12, 17, 'up'], (12, 15)),
    ('f2_pair_swap', 'ep8_library_f2', F2 + ',keeper_memory_b', {'w': 'n'}, [13, 6, 'up'], (13, 10)),
    ('f2_wrong', 'ep8_library_f2', F2 + ',keeper_memory_b', None, [21, 4, 'right'], (24, 6)),
    ('f2_wrong_folded', 'ep8_library_f2', F2 + ',keeper_memory_b', {'w': 'n', 'x': 'e', 'y': 'ghost:s'}, [28, 5, 'down'], (26, 6)),
    ('f2_down', 'ep8_library_f2', F2 + ',keeper_memory_b', {'w': 'n', 'y': 's'}, [28, 11, 'down'], (26, 10)),
    ('f2_arena', 'ep8_library_f2', F2 + ',keeper_memory_b', {'w': 'n', 'y': 's'}, [22, 17, 'up'], (22, 15)),
    ('f2_archive', 'ep8_library_f2', F2 + ',keeper_memory_b', {'w': 'n', 'x': 'e', 'a1': 's'}, [37, 11, 'right'], (33, 10)),
    ('f2_archive_home', 'ep8_library_f2', F2 + ',keeper_memory_b,page_names_found,page_order_found,page_correction_found,archive_open',
     {'w': 'n', 'x': 'e', 'a2': 'n'}, [37, 9, 'up'], (33, 10)),
    ('f2_won', 'ep8_library_f2', F3, None, [22, 12, 'up'], (22, 15)),
    ('f3_start', 'ep8_library_f3', F3, None, [17, 36, 'up'], (17, 30)),
    ('f3_see_ghost', 'ep8_library_f3', F3 + ',keeper_memory_c', {'s': 'ghost:n'}, [24, 28, 'up'], (17, 27)),
    ('f3_see_open', 'ep8_library_f3', F3 + ',keeper_memory_c', {'s': 'n'}, [23, 24, 'up'], (18, 24)),
    ('f3_lantern', 'ep8_library_f3', F3 + ',keeper_memory_c', {'l': 'w'}, [3, 34, 'up'], (12, 32)),
    ('f3_shelter_wall', 'ep8_library_f3', F3 + ',keeper_memory_c', {'s': 'n', 'i': 'n'}, [23, 18, 'right'], (18, 18)),
    ('f3_shelter_fold', 'ep8_library_f3', F3 + ',keeper_memory_c', {'s': 'n', 'n': 'e'}, [22, 16, 'up'], (18, 17)),
    ('f3_choose_west', 'ep8_library_f3', F3 + ',keeper_memory_c', {'s': 'n', 'n': 'e', 'c1': 'n'}, [13, 11, 'up'], (17, 12)),
    ('f3_choose_east', 'ep8_library_f3', F3 + ',keeper_memory_c', {'s': 'n', 'n': 'e', 'c2': 'n'}, [21, 11, 'up'], (17, 12)),
    ('f3_named', 'ep8_library_f3', LW, {'s': 'n', 'n': 'e', 'c1': 'n'}, [17, 10, 'up'], (17, 10)),
    ('lw_before', 'ep8_last_word', LW, None, [14, 20, 'up'], (14, 12)),
    ('lw_after', 'ep8_last_word', LW + ',eraser_defeated,lexicon_restored,keeper_named,ending_return,page_shelved,eighth_star',
     None, [14, 14, 'up'], (14, 11)),
]
LIGHT_OBJ = {'restoring_fountain': ('#f9d77a', 2.6), 'great_lexicon': ('#f9d77a', 4.5)}
TINT = {'violet': 'violet', 'hollow_dawn': 'gold'}
WARM = {'dawn': ('#ffd6a6', 0.30)}   # src/world/lighting.js TINTS.dawn, as a multiply (floor I's warm gold cast)
OPP = {'n': 's', 's': 'n', 'e': 'w', 'w': 'e'}


def flagset(s):
    return set(f for f in s.split(',') if f)


def page_cells(b, d):
    """The cells a book's pages cover standing toward d (the reader is on the opposite side)."""
    return ep8_mocks.page_cells(b, OPP[d])


def ribbon(books, bid):
    pairs = sorted(k for k in books if books[k].get('pair') and k < books[k]['pair'])
    for i, k in enumerate(pairs):
        if bid in (k, books[k]['pair']):
            return 1 + i % 3
    return 0


def book_layer(mp, flags, states):
    """Strip the popbook events; return (mp, pages: {bridge, wall, ghost}, books to draw)."""
    pb = mp.get('popbooks') or {}
    books = pb.get('books') or {}
    st = dict(pb.get('start') or {}) if states is None else dict(states)
    legend, ground = mp['legend'], mp['ground']

    def void(x, y):
        return not (0 <= y < len(ground) and 0 <= x < len(ground[0])) or legend.get(ground[y][x]) == 'void_violet'
    bridge, wall, ghost, draw = [], [], [], []
    for e in mp['events']:
        if e['type'] != 'popbook' or not preview.present(e, flags):
            continue
        b = books[e['book']]
        s = st.get(e['book'], '-')
        g = s.startswith('ghost:')
        d = s.split(':')[1] if g else s
        if d in OPP:
            cells = page_cells(b, d)
            if g:
                ghost += cells
            else:
                for c in cells:
                    (bridge if void(*c) else wall).append(c)
        sprite = e.get('sprite') or ('popbook' if b['axis'] == 'ns' else 'popbook_ew')
        draw.append({'t': sprite, 'x': b['x'], 'y': b['y'] + (1 if b['axis'] == 'ew' else 0),
                     'state': ribbon(books, e['book']) * 4 + (3 if (d in OPP and not g) else 0),
                     'faint': bool(e.get('lantern'))})
    mp = dict(mp, events=[e for e in mp['events'] if e['type'] != 'popbook'])
    return mp, {'bridge': bridge, 'wall': wall, 'ghost': ghost}, draw


def render_state(name, map_id, flags_s, states, party, db, spr, atl, npc_map):
    flags = flagset(flags_s)
    mp = preview.load_map(map_id)
    mp, pages, books = book_layer(mp, flags, states)
    if party:
        mp['start'] = {'x': party[0], 'y': party[1], 'dir': party[2]}
    mp['decor'] = [d for d in mp.get('decor', []) if preview.present(d, flags)]
    cv = preview.render(mp, db, spr, atl, frame=0, npc_map=npc_map, flags=flags)
    if pages['bridge']:
        ep8_mocks.draw_slices(cv, db, 'page_bridge', pages['bridge'])
    if pages['wall']:
        ep8_mocks.draw_slices(cv, db, 'page_wall', pages['wall'])
    if pages['ghost']:
        ep8_mocks.draw_slices(cv, db, 'page_ghost', pages['ghost'])
    for o in books:
        if o['t'] in db.objects:
            draw_object(db, cv, o, 0, part='base')
            draw_object(db, cv, o, 0, part='overhead')
    # the party's sprite again, over the pages (preview.render drew it under them)
    if party:
        fr = atl.party_frame('hero', party[2])
        if fr:
            img, org, flip = fr
            cv.blit(img, party[0] * 16 + 8 - org[0], party[1] * 16 + 15 - org[1])
    arr = cv.a[..., :3].astype(np.float32) / 255.0
    light = mp.get('lighting') or {}
    dark = light.get('dark', 0) or 0
    tint = light.get('tint')
    if isinstance(tint, list):
        tint = next((c['id'] for c in tint if preview.present(c, flags)), None)
    lamps = []
    for e in mp['events']:
        if not preview.present(e, flags):
            continue
        if e['type'] == 'font':
            lamps.append((e['x'] + 1, e['y'], 2.6))
        if e['type'] == 'light':
            lamps.append((e['x'], e['y'], e.get('r', 3)))
    if dark:
        arr = ep8_mocks.apply_dark(arr, {'dark': dark, 'lamps': lamps})
    if tint in TINT:
        arr = ep8_mocks.apply_tint(arr, TINT[tint])
    elif tint in WARM:
        col, a = WARM[tint]
        arr = np.clip(arr * (1 - a) + arr * ep8_mocks.hx(col) * a, 0, 1)
    img = Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
    lum = ep8_mocks.luma(arr)
    rep = {'mean_luma': round(float(lum.mean()), 3)}
    if party:
        px, py = party[0] * 16, party[1] * 16
        rep['party_cell_luma'] = round(float(lum[py:py + 16, px:px + 16].mean()), 3)
        fr = atl.party_frame('hero', party[2])
        if fr:
            spr_a = np.asarray(fr[0].a)
            mask = spr_a[..., 3] > 128
            if mask.any():
                rgb = spr_a[..., :3].astype(np.float32) / 255.0
                rep['hero_sprite_luma'] = round(float(ep8_mocks.luma(rgb)[mask].mean()), 3)
    floor = [(x, y) for y, row in enumerate(mp['ground']) for x, ch in enumerate(row)
             if mp['legend'].get(ch) in ('blank_page', 'parchment', 'vellum', 'scriptmosaic')]
    if floor:
        vals = [float(lum[y * 16 + 2:y * 16 + 14, x * 16 + 2:x * 16 + 14].mean()) for x, y in floor[::7]]
        rep['floor_luma'] = round(float(np.mean(vals)), 3)
    return img, mp, rep


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
    db = EP8DB()
    preview.merge_ep3_tiles(db)
    spr = preview.SpriteDB()
    atl = preview.Atlases()
    for name in ('ep8_npcs.json',):
        if os.path.exists(os.path.join(preview.SPRITES, name)):
            atl.npc_extra.append(atl._load(name))
    if os.path.exists(os.path.join(preview.SPRITES, 'ep8_enemies_field.json')):
        pack = atl._load('ep8_enemies_field.json')
        orig = atl.enemy_frame

        def enemy_frame(sprite, _o=orig, _p=pack):
            m, im = _p
            info = m['sprites'].get(sprite)
            key = sprite + '_0' if sprite + '_0' in m['frames'] else next((k for k in m['frames'] if k.startswith(sprite + '_')), None)
            if info and key:
                return im.crop(*m['frames'][key]), info.get('origin', [16, 31]), False
            return _o(sprite)
        atl.enemy_frame = enemy_frame
    npc_map = preview.npc_sprites()
    os.makedirs(PREVIEWS, exist_ok=True)
    os.makedirs(preview.OUT, exist_ok=True)
    report, done_maps = {}, set()
    for name, map_id, flags_s, states, party, focus in STATES:
        if want and not any(name.startswith(w) for w in want):
            continue
        img, mp, rep = render_state(name, map_id, flags_s, states, party, db, spr, atl, npc_map)
        report[name] = rep
        big = img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)
        tag = name.split('_', 1)[1]
        out = os.path.join(PREVIEWS, '%s_%s.png' % (map_id, tag))
        big.save(out)
        print('wrote', out, rep)
        if map_id not in done_maps:
            ann = preview.annotate(big.convert('RGBA'), mp, SCALE)
            ann.save(os.path.join(PREVIEWS, '%s.png' % map_id))
            print('wrote', os.path.join(PREVIEWS, '%s.png' % map_id), '(annotated, %s)' % name)
            done_maps.add(map_id)
        if phone:
            p = os.path.join(preview.OUT, '%s_%s_phone.png' % (map_id, tag))
            phone_crop(img, focus).save(p)
            print('wrote', p)
    with open(os.path.join(preview.OUT, 'ep8_b_luma.json'), 'w', newline='\n') as f:
        json.dump(report, f, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
