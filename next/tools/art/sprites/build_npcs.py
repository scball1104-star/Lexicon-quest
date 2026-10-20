"""Townsfolk NPC sprites -> assets/sprites/npcs.png/.json (24x32, 4 dirs x 3 frames + blink)
plus animals (16x16) and npc_dough.

Paper-doll: body + head + beard + hat + accessories (chars/npc_parts.py), coloured per NPC from
master-palette ramps, outlines resolved from the neighbouring material. Walk frames use walk.py.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars'))
from collections import Counter
from pix import *
import pal as P
import walk as W
import npc_parts as NP
import npc_bodies as NB
NP.BODIES.update({'dress': NB.DRESS, 'robe': NB.ROBE, 'stout': NB.STOUT, 'child': NB.CHILD})

CLASS_OF = {}
for cls, chars in (('skin', 'wsST'), ('hair', 'ahHI'), ('top', 'kcCD'), ('sec', 'lbBV'), ('bottom', 'qpP'),
                   ('shoes', 'rRx'), ('accent', 'gGY'), ('eyes', 'EF'), ('metal', 'mMNO'), ('wood', 'uUX'),
                   ('glow', 'zZ'), ('hat', 'novy')):
    for i, ch in enumerate(chars):
        CLASS_OF[ch] = (cls, i)


def R(name, *idx):
    return ['%s:%d' % (name, i) for i in idx]


DEFAULT = {
    'skin': R('skin_light', 0, 1, 2, 3),
    'eyes': ['ink:2', 'ink:2'],
    'shoes': R('wood', 1, 2, 3),
    'accent': R('gold', 2, 3, 4),
    'metal': ['metal:1', 'stone_cool:4', 'metal:2', 'metal:3'],
    'wood': R('wood', 2, 3, 4),
    'glow': ['fire:4', 'fire:5'],
}


def outline_for(refs):
    """outline colour for a material: its darkest step, pushed darker/cooler if still light"""
    cols = [np.array(hex2rgb(P.color(r)), np.float32) / 255 for r in refs]
    labs = [to_oklab(c.reshape(1, 3))[0] for c in cols]
    i = int(np.argmin([l[0] for l in labs]))
    c = cols[i]
    L = labs[i][0]
    tgt = np.array(hex2rgb(P.darkest()), np.float32) / 255
    if L > 0.22:
        c = darken(c, min(0.75, (L - 0.12) * 1.6), tgt)
    return c


def place(canvas, grid, dx=0, dy=0):
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            yy, xx = y + dy, x + dx
            if 0 <= yy < len(canvas) and 0 <= xx < len(canvas[0]):
                canvas[yy][xx] = ch


def g(txt):
    return grid_from_text(txt) if txt else None


def compose_chars(spec, d):
    """returns a 32x24 char grid for direction d in ('down','left','up')"""
    cv = [['.'] * 24 for _ in range(32)]
    body = NP.BODIES[spec['body']][d]
    place(cv, g(body))
    for acc in spec.get('under', []):  # accessories drawn before the head (behind)
        a = ACC[acc].get(d)
        if a:
            place(cv, g(a[0]), a[1], a[2])
    hdy = spec.get('head_dy', 0)
    hdx = spec.get('head_dx', 0)
    place(cv, g(NP.HEADS[spec['head']][d]), hdx, hdy)
    if spec.get('beard') and d in NP.BEARDS[spec['beard']]:
        bx = 0
        place(cv, g(NP.BEARDS[spec['beard']][d]), hdx + bx, hdy + NP.BEARD_Y)
    if spec.get('hat'):
        place(cv, g(NP.HATS[spec['hat']][d]), hdx, hdy + NP.HAT_DY.get(spec['hat'], 0))
    for acc in spec.get('over', []):
        a = ACC[acc].get(d)
        if a:
            place(cv, g(a[0]), a[1], a[2])
    return cv


def colourize(cv, spec, who):
    pal = dict(DEFAULT)
    pal.update(spec['pal'])
    H, Wd = len(cv), len(cv[0])
    img = blank(Wd, H)
    for y in range(H):
        for x in range(Wd):
            ch = cv[y][x]
            if ch in ('.', '0'):
                continue
            cls, i = CLASS_OF[ch]
            refs = pal[cls]
            c = hex2rgb(P.color(refs[min(i, len(refs) - 1)], who))
            img[y, x] = (c[0] / 255, c[1] / 255, c[2] / 255, 1)
    outl = {cls: outline_for(refs) for cls, refs in pal.items()}
    for y in range(H):
        for x in range(Wd):
            if cv[y][x] != '0':
                continue
            cnt = Counter()
            for dy, dx, wgt in ((-1, 0, 2), (1, 0, 2), (0, -1, 2), (0, 1, 2), (-1, -1, 1), (-1, 1, 1), (1, -1, 1), (1, 1, 1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < Wd and cv[yy][xx] not in '.0':
                    cls = CLASS_OF[cv[yy][xx]][0]
                    if cls == 'eyes':
                        cls = 'skin'
                    cnt[cls] += wgt
            cls = cnt.most_common(1)[0][0] if cnt else 'hair'
            img[y, x, :3] = outl[cls]
            img[y, x, 3] = 1
    return img


# accessories: name -> {dir: (grid, dx, dy)}
ACC = NB.ACC


def npc_frames(nid, spec):
    out = {}
    for d in ('down', 'left', 'up'):
        cv = compose_chars(spec, d)
        st = colourize(cv, spec, nid)
        ws = WALKS[spec.get('walk', spec['body'])][d]
        if 'region' in ws:
            legs = parse_grid_chars(ws['A'], spec, nid), parse_grid_chars(ws['B'], spec, nid)
            a = W.side_step(st, ws, legs[0], sway_dir=1); b = W.side_step(st, ws, legs[1], sway_dir=-1)
        else:
            ws2 = dict(ws)
            if spec.get('no_arms'):
                ws2.pop('arms', None)
            a = W.front_step(st, ws2, 1); b = W.front_step(st, ws2, 0)
        # blink: the lash pixel becomes eyelid skin, the iris pixel becomes the closed lash line
        bcv = [['S' if ch == 'E' else ('E' if ch == 'F' else ch) for ch in row] for row in cv]
        bl = colourize(bcv, spec, nid)
        out[d] = [st, a, b, bl]
    out['right'] = [flip_x(f) for f in out['left']]
    return out


def parse_grid_chars(txt, spec, who):
    rows = grid_from_text(txt)
    cv = [list(r.ljust(24, '.')) for r in rows]
    return colourize(cv, spec, who)


WALKS = {
 'tunic': {
  'down': {'hip': 24, 'legs': [(8, 12), (13, 17)], 'drop': {'plant': [26], 'raise': [25, 27]},
           'arms': [(4, 7, 17, 23, 19), (17, 20, 17, 23, 19)]},
  'up':   {'hip': 24, 'legs': [(8, 12), (13, 17)], 'drop': {'plant': [26], 'raise': [25, 27]},
           'arms': [(4, 7, 17, 23, 19), (17, 20, 17, 23, 19)]},
  'left': {'region': (2, 19), 'A': """
........0PPPPpp0........
.......0PPP0ppp0........
......0PPp0.0ppp0.......
.....0xRR0...0RRr0......
....0xRRr0...0RRRr0.....
...0xRRRr0..0rRRRr0.....
....00000...000000......
""", 'B': """
........0PPPPpp0........
.......0ppp0PPP0........
......0ppp0.0PPp0.......
.....0rRR0...0xRR0......
....0rRRr0...0xRRr0.....
...0rRRRr0..0xRRRr0.....
....00000...000000......
"""},
 },
}

ROBE_W = {
  'down': {'region': (4, 20), 'bob': 0, 'sway': (23, 29, 3, 21), 'A': NB.ROBE_FEET['A'], 'B': NB.ROBE_FEET['B']},
  'up':   {'region': (4, 20), 'bob': 0, 'sway': (23, 29, 3, 21), 'A': NB.ROBE_FEET['B'], 'B': NB.ROBE_FEET['A']},
  'left': {'region': (2, 20), 'bob': 0, 'sway': (23, 29, 3, 20), 'A': NB.ROBE_FEET_SIDE['A'], 'B': NB.ROBE_FEET_SIDE['B']},
}
WALKS['robe'] = ROBE_W
WALKS['dress'] = ROBE_W
WALKS['stout'] = {
  'down': {'hip': 25, 'legs': [(7, 12), (13, 18)], 'drop': {'plant': [27], 'raise': [26, 27]},
           'arms': [(3, 6, 17, 23, 19), (18, 21, 17, 23, 19)]},
  'up':   {'hip': 25, 'legs': [(7, 12), (13, 18)], 'drop': {'plant': [27], 'raise': [26, 27]},
           'arms': [(3, 6, 17, 23, 19), (18, 21, 17, 23, 19)]},
  'left': {'region': (2, 19), 'A': NB.STOUT_SIDE['A'], 'B': NB.STOUT_SIDE['B']},
}
WALKS['child'] = {
  'down': {'hip': 26, 'legs': [(7, 11), (12, 17)], 'drop': {'plant': [28], 'raise': [27, 28]},
           'arms': [(6, 8, 21, 25, 22), (15, 17, 21, 25, 22)]},
  'up':   {'hip': 26, 'legs': [(7, 11), (12, 17)], 'drop': {'plant': [28], 'raise': [27, 28]},
           'arms': [(6, 8, 21, 25, 22), (15, 17, 21, 25, 22)]},
  'left': {'region': (3, 17), 'A': NB.CHILD_SIDE['A'], 'B': NB.CHILD_SIDE['B']},
}


# ------------------------------------------------------------------ atlas
def build():
    import npc_specs as S
    import animals as A
    import smallprops as SP
    DIRS = ['down', 'left', 'right', 'up']
    blocks = []
    anims = {}
    for nid, spec in S.NPCS.items():
        fr = npc_frames(nid, spec)
        blk = []
        for d in DIRS:
            for i, f in enumerate(fr[d]):
                blk.append((f'{nid}_{d}_{i}' if i < 3 else f'{nid}_{d}_blink', f))
            anims[f'{nid}_walk_{d}'] = {'frames': [f'{nid}_{d}_1', f'{nid}_{d}_0', f'{nid}_{d}_2', f'{nid}_{d}_0'], 'fps': 6, 'loop': True}
            anims[f'{nid}_idle_{d}'] = {'frames': [f'{nid}_{d}_0'] * 26 + [f'{nid}_{d}_blink'] + [f'{nid}_{d}_0'], 'fps': 8, 'loop': True}
        blocks.append((nid, blk))
    # 3 NPC blocks per row: each block 4 cols x 4 rows of 24x32
    per = 3
    rows = (len(blocks) + per - 1) // per
    W, Hh = per * 4 * 24, rows * 4 * 32
    small = []
    for nm, pal, frs in (('animal_cat', A.CAT_PAL, A.CAT), ('animal_dog', A.DOG_PAL, A.DOG),
                         ('animal_chicken', A.CHICKEN_PAL, A.CHICKEN), ('animal_duck', A.DUCK_PAL, A.DUCK)):
        leg = P.resolve(pal, nm)
        for k, gtxt in frs.items():
            small.append((f'{nm}_{k}', parse_grid(grid_from_text(gtxt), leg, w=16, h=16)))
    leg = P.resolve(SP.PROPS_PAL, 'npc_dough')
    small.append(('npc_dough_0', parse_grid(grid_from_text(SP.DOUGH_0), leg, w=16, h=16)))
    small.append(('npc_dough_1', parse_grid(grid_from_text(SP.DOUGH_1), leg, w=16, h=16)))
    small_rows = (len(small) + (W // 16) - 1) // (W // 16)
    # E2-sprites: the Episode 2 townsfolk (npc_specs.NPCS_EP2) and the Other Selves (party_field frames in glass,
    # ep2_reflections.py) as blocks in their own bands UNDER the animals band, so no Episode 1 rect moves
    import ep2_reflections as RF
    e2_blocks = []
    for nid, spec in S.NPCS_EP2.items():
        fr = npc_frames(nid, spec)
        e2_blocks.append((nid, fr))
    for rid, blk in RF.field_blocks().items():
        e2_blocks.append((rid, blk))
    e2_list = []
    for nid, fr in e2_blocks:
        blk = []
        for d in DIRS:
            for i, f in enumerate(fr[d]):
                blk.append((f'{nid}_{d}_{i}' if i < 3 else f'{nid}_{d}_blink', f))
            anims[f'{nid}_walk_{d}'] = {'frames': [f'{nid}_{d}_1', f'{nid}_{d}_0', f'{nid}_{d}_2', f'{nid}_{d}_0'], 'fps': 6, 'loop': True}
            anims[f'{nid}_idle_{d}'] = {'frames': [f'{nid}_{d}_0'] * 26 + [f'{nid}_{d}_blink'] + [f'{nid}_{d}_0'], 'fps': 8, 'loop': True}
        e2_list.append((nid, blk))
    e2_top = Hh + small_rows * 16
    e2_rows = (len(e2_list) + per - 1) // per
    sheet = blank(W, e2_top + e2_rows * 128)
    rects = {}
    for bi, (nid, blk) in enumerate(e2_list):
        bx, by = (bi % per) * 96, e2_top + (bi // per) * 128
        for i, (n, f) in enumerate(blk):
            x, y = bx + (i % 4) * 24, by + (i // 4) * 32
            sheet[y:y + 32, x:x + 24] = f
            rects[n] = [x, y, 24, 32]
    for bi, (nid, blk) in enumerate(blocks):
        bx, by = (bi % per) * 96, (bi // per) * 128
        for i, (n, f) in enumerate(blk):
            x, y = bx + (i % 4) * 24, by + (i // 4) * 32
            sheet[y:y + 32, x:x + 24] = f
            rects[n] = [x, y, 24, 32]
    for i, (n, f) in enumerate(small):
        x, y = (i % (W // 16)) * 16, Hh + (i // (W // 16)) * 16
        sheet[y:y + 16, x:x + 16] = f
        rects[n] = [x, y, 16, 16]
    for a in ('cat', 'dog'):
        anims[f'animal_{a}_idle'] = {'frames': [f'animal_{a}_sit_0'] * 6 + [f'animal_{a}_sit_1'] * 2, 'fps': 4, 'loop': True}
        anims[f'animal_{a}_walk'] = {'frames': [f'animal_{a}_walk_0', f'animal_{a}_sit_0'], 'fps': 6, 'loop': True}
    anims['animal_chicken_idle'] = {'frames': ['animal_chicken_stand_0'] * 5 + ['animal_chicken_peck_0', 'animal_chicken_stand_0', 'animal_chicken_peck_0'], 'fps': 6, 'loop': True}
    anims['animal_chicken_walk'] = {'frames': ['animal_chicken_walk_0', 'animal_chicken_stand_0'], 'fps': 8, 'loop': True}
    anims['animal_duck_idle'] = {'frames': ['animal_duck_stand_0'] * 4 + ['animal_duck_stand_1'] * 2, 'fps': 4, 'loop': True}
    anims['animal_duck_walk'] = {'frames': ['animal_duck_walk_0', 'animal_duck_stand_0'], 'fps': 6, 'loop': True}
    anims['npc_dough_wobble'] = {'frames': ['npc_dough_0', 'npc_dough_1'], 'fps': 4, 'loop': True}
    save_png(sheet, os.path.join(DST, 'npcs.png'))
    sprites = {nid: {'name': sp['name'], 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS} for nid, sp in S.NPCS.items()}
    for nid, sp in S.NPCS_EP2.items():
        sprites[nid] = {'name': sp['name'], 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS}
    for rid in RF.IDS:
        sprites[rid] = {'name': {'refl_hero': 'Nameless Reflection', 'refl_mira': "Mira's Reflection",
                                 'refl_bram': "Bram's Reflection"}[rid], 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS}
    for a in ('cat', 'dog', 'chicken', 'duck'):
        sprites[f'animal_{a}'] = {'cell': [16, 16], 'origin': [8, 15], 'faces': 'left', 'flipForRight': True}
    sprites['npc_dough'] = {'name': "Oren's runaway starter", 'cell': [16, 16], 'origin': [8, 15], 'faces': 'front'}
    meta = {'image': 'npcs.png', 'cell': [24, 32], 'origin': [12, 31],
            'layout': 'humanoids: 3 NPC blocks per band; each block rows down,left,right,up x cols stand,stepA,stepB,blink. Animals and npc_dough (16x16) in the band under the Episode 1 blocks; the Episode 2 townsfolk and the Other Selves (refl_hero, refl_mira, refl_bram) in their own bands under the animals (E2-sprites).',
            'sprites': sprites, 'frames': rects, 'anims': anims}
    write_json(os.path.join(DST, 'npcs.json'), meta)
    # previews
    items = []
    for nid, blk in blocks:
        d = dict(blk)
        for dd in DIRS:
            items.append((f'{nid[4:]} {dd}', d[f'{nid}_{dd}_0']))
    contact(items, os.path.join(OUT, 'npcs_stand_4x.png'), scale=4, cols=8, title='NPCs: down, left, right, up (stand) at 4x')
    e2i = []
    for nid, blk in e2_list:
        d = dict(blk)
        for dd in DIRS:
            e2i.append((f'{nid[4:] if nid.startswith("npc_") else nid} {dd}', d[f'{nid}_{dd}_0']))
    contact(e2i, os.path.join(OUT, 'npcs_ep2_stand_4x.png'), scale=4, cols=8, title='Episode 2 NPCs and the Other Selves: down, left, right, up (stand) at 4x')
    e2w = []
    for nid, blk in e2_list:
        d = dict(blk)
        e2w += [(nid[4:] if nid.startswith('npc_') else nid, d[f'{nid}_down_1']), ('', d[f'{nid}_down_0']), ('', d[f'{nid}_down_2']),
                ('', d[f'{nid}_left_1']), ('', d[f'{nid}_left_0']), ('', d[f'{nid}_left_2'])]
    contact(e2w, os.path.join(OUT, 'npcs_ep2_walk_4x.png'), scale=4, cols=12, title='Episode 2 walk frames (down A/stand/B, left A/stand/B)')
    contact(small, os.path.join(OUT, 'animals_dough_6x.png'), scale=6, cols=7, title='animals + npc_dough at 6x')
    walk = []
    for nid, blk in blocks:
        d = dict(blk)
        walk += [(nid[4:], d[f'{nid}_down_1']), ('', d[f'{nid}_down_0']), ('', d[f'{nid}_down_2']), ('', d[f'{nid}_left_1']), ('', d[f'{nid}_left_0']), ('', d[f'{nid}_left_2'])]
    contact(walk, os.path.join(OUT, 'npcs_walk_4x.png'), scale=4, cols=12, title='NPC walk frames (down A/stand/B, left A/stand/B)')
    return meta


if __name__ == '__main__':
    m = build()
    print('npc frames', len(m['frames']))
