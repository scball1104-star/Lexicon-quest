"""Expansion 1 townsfolk and sheep -> assets/sprites/x1_npcs.png / .json (X1-sprites).

Six paper-doll NPCs (the shared builder, build_npcs.npc_frames, with the X1 parts of chars/x1_npc_parts.py added to the
live part tables at build time; no shared file is edited) and animal_sheep with a tufted variant. Merged by the pack
loader into the `npcs` atlas (docs/PWA_PACKS.md): frame names are the ids the maps and npcs.js use.

Humanoids: `<id>_<dir>_<0|1|2|blink>` (24x32, origin [12,31]) and anims `<id>_walk_<dir>`, `<id>_idle_<dir>`, exactly
as npcs.json. The sheep use the SAME naming (`animal_sheep_<dir>_<0|1|2|blink>`, 16x16, origin [8,15] (the default), blink
= the graze pose) because src/world/actors.js `resolveSprite` draws any npcs frame named `<id>_down_0` as a humanoid
actor, so a sheep with four facings walks and idles with no code change. For an `ANIMALS` table that wants the
animals' own names it also has `animal_sheep_{stand_0,stand_1,walk_0,peck_0}` (left-facing, the same rects).
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'chars'))
from pix import *
import pal as P
import build_npcs as BN
import npc_specs as S
import x1_npc_parts as XP
import x1_animals as XA

XP.register()
R = S.R
CREAM = S.CREAM
HAIR = S.HAIR
DIRS = ['down', 'left', 'right', 'up']

BRASS = ['gold:0', 'gold:1', 'gold:2', 'gold:3']

X1_NPCS = {
    # Brindle: old, patient, stooped (the head sits two rows low on the shoulders), a flat grey cap, a wool scarf and a
    # long crook taller than he is. Russet coat.
    'npc_brindle': dict(name='Brindle', body='tunic', head='elder', beard='short', hat='flat_cap',
                        over=['scarf', 'crook'], no_arms=True, head_dy=1,
                        pal={'hair': HAIR['white'], 'top': R('earth', 1, 2, 3, 4), 'bottom': R('shadow', 1, 2, 3),
                             'hat': R('stone_cool', 2, 3, 4, 5), 'sec': CREAM, 'wood': R('wood', 2, 3, 4),
                             'accent': R('grass', 1, 2, 3)}),
    # Tamsin: the weaver. A madder-red dress, a cream apron and shawl, greying hair pinned up with a bobbin of blue thread
    'npc_tamsin': dict(name='Tamsin', body='dress', head='bun', over=['apron', 'shawl', 'bobbin'],
                       pal={'hair': HAIR['greying'], 'top': R('roof_red', 1, 2, 3, 4), 'sec': CREAM,
                            'bottom': R('roof_red', 1, 2, 3), 'accent': R('cloth_blue', 2, 3, 4),
                            'wood': R('wood', 2, 3, 4)}),
    # Ferrick: the weir-keeper. A dark green oilskin coat, a yellow sou'wester, a grey stubble, a pipe. Weathered skin.
    'npc_ferrick': dict(name='Ferrick', body='tunic', head='short', beard='short', hat='sou_wester', over=['pipe'],
                        pal={'hair': HAIR['gray'], 'top': R('foliage_dark', 0, 1, 2, 3), 'bottom': R('shadow', 1, 2, 3),
                             'hat': R('gold', 1, 2, 3, 4), 'skin': R('skin_med', 0, 1, 2, 3),
                             'metal': ['shadow:2', 'stone_cool:2', 'stone_cool:3', 'stone_cool:4'],
                             'wood': R('wood', 2, 3, 4)}),
    # Hesper: a young Keeper in a Keeper's coat far too big (the long coat, sleeves past her hands with brass cuffs, the
    # hem on her shoes), spectacles on a brass chain, a short copper bob
    'npc_hesper': dict(name='Hesper', body='robe', head='short', over=['glasses', 'spec_chain', 'cuffs'],
                       pal={'hair': HAIR['copper'], 'top': R('ink', 1, 2, 3, 4), 'sec': R('gold', 1, 2, 3, 4),
                            'accent': R('gold', 2, 3, 4), 'metal': BRASS}),
    # Odo: a patched grey cloak (rust, ochre and blue patches), a wild white moustache, a staff cut from a chime post
    'npc_odo': dict(name='Odo', body='robe', head='elder', beard='mustache',
                    over=['patches', 'patches2', 'patches3', 'chime_staff'], no_arms=True,
                    pal={'hair': HAIR['white'], 'top': R('stone_cool', 2, 3, 4, 5), 'sec': R('stone_cool', 1, 2, 3, 4),
                         'hat': R('roof_red', 2, 3, 4, 5), 'accent': R('gold', 2, 3, 4), 'bottom': R('cloth_blue', 1, 2, 3),
                         'wood': R('wood', 2, 3, 4), 'metal': ['stone_cool:3', 'stone_cool:4', 'metal:2', 'metal:3']}),
    # Yarrow: the beekeeper. A cream dress, a leather apron, a straw hat with a mesh veil, a smoker in her hand
    'npc_yarrow': dict(name='Yarrow', body='dress', head='bun', hat='veil_hat', over=['apron_wide', 'smoker'], no_arms=True,
                       pal={'hair': HAIR['brown'], 'top': CREAM, 'sec': R('wood', 1, 2, 3, 4), 'bottom': CREAM[:3],
                            'hat': R('sand', 0, 1, 2, 3), 'wood': R('wood', 2, 3, 4),
                            'metal': ['stone_cool:2', 'stone_cool:3', 'stone_cool:4', 'metal:2']}),
}

SHEEP = ['animal_sheep', 'animal_sheep_tufted']
SLOT = ['0', '1', '2', 'blink']


def npc_blocks():
    out = {}
    for nid, spec in X1_NPCS.items():
        out[nid] = BN.npc_frames(nid, spec)
    return out


def sheep_frames():
    """{id: {dir: [stand, stepA, stepB, graze] rgba}}"""
    out = {}
    for sid in SHEEP:
        tuft = sid.endswith('tufted')
        leg = P.resolve(XA.palette(tuft), sid)
        sh = XA.sheets(tuft)
        out[sid] = {d: [parse_grid(rows, leg, w=16, h=16) for rows in sh[d]] for d in DIRS}
    return out


def build(write=True):
    blocks = npc_blocks()
    sheep = sheep_frames()
    rects, origins6 = {}, {}
    anims = {}
    per = 3
    rows = (len(blocks) + per - 1) // per
    W = per * 96
    band = rows * 128
    sheet = blank(W, band + 2 * 4 * 16)
    for bi, (nid, fr) in enumerate(blocks.items()):
        bx, by = (bi % per) * 96, (bi // per) * 128
        i = 0
        for d in DIRS:
            for k, f in enumerate(fr[d]):
                x, y = bx + (i % 4) * 24, by + (i // 4) * 32
                sheet[y:y + 32, x:x + 24] = f
                rects[f'{nid}_{d}_{SLOT[k]}'] = [x, y, 24, 32]
                i += 1
            anims[f'{nid}_walk_{d}'] = {'frames': [f'{nid}_{d}_1', f'{nid}_{d}_0', f'{nid}_{d}_2', f'{nid}_{d}_0'], 'fps': 6, 'loop': True}
            anims[f'{nid}_idle_{d}'] = {'frames': [f'{nid}_{d}_0'] * 26 + [f'{nid}_{d}_blink'] + [f'{nid}_{d}_0'], 'fps': 8, 'loop': True}
    # sheep: one row of 16 cells (4 dirs x 4 poses) per variant, 16x16 each, under the NPC bands
    for si, sid in enumerate(SHEEP):
        y = band + si * 16
        i = 0
        for d in DIRS:
            for k, f in enumerate(sheep[sid][d]):
                x = i * 16
                sheet[y:y + 16, x:x + 16] = f
                rects[f'{sid}_{d}_{SLOT[k]}'] = [x, y, 16, 16]
                origins6[f'{sid}_{d}_{SLOT[k]}'] = [8, 15]
                i += 1
            anims[f'{sid}_walk_{d}'] = {'frames': [f'{sid}_{d}_1', f'{sid}_{d}_0', f'{sid}_{d}_2', f'{sid}_{d}_0'], 'fps': 6, 'loop': True}
            anims[f'{sid}_idle_{d}'] = {'frames': [f'{sid}_{d}_0'] * 22 + [f'{sid}_{d}_blink'] * 14 + [f'{sid}_{d}_0'] * 8 + [f'{sid}_{d}_blink'] * 12, 'fps': 8, 'loop': True}
            anims[f'{sid}_graze_{d}'] = {'frames': [f'{sid}_{d}_0', f'{sid}_{d}_blink', f'{sid}_{d}_blink', f'{sid}_{d}_blink'], 'fps': 3, 'loop': True}
        # the animals' own names (left-facing), sharing the rects
        rects[f'{sid}_stand_0'] = rects[f'{sid}_left_0']; origins6[f'{sid}_stand_0'] = [8, 15]
        rects[f'{sid}_stand_1'] = rects[f'{sid}_left_blink']; origins6[f'{sid}_stand_1'] = [8, 15]
        rects[f'{sid}_walk_0'] = rects[f'{sid}_left_1']; origins6[f'{sid}_walk_0'] = [8, 15]
        rects[f'{sid}_peck_0'] = rects[f'{sid}_left_blink']; origins6[f'{sid}_peck_0'] = [8, 15]
        anims[f'{sid}_idle'] = {'frames': [f'{sid}_stand_0'] * 22 + [f'{sid}_peck_0'] * 14 + [f'{sid}_stand_0'] * 8 + [f'{sid}_peck_0'] * 12, 'fps': 8, 'loop': True}
        anims[f'{sid}_walk'] = {'frames': [f'{sid}_walk_0', f'{sid}_stand_0'], 'fps': 6, 'loop': True}
    frames_json = dict(rects)
    sprites = {nid: {'name': sp['name'], 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS} for nid, sp in X1_NPCS.items()}
    for sid, nm in (('animal_sheep', 'Sheep'), ('animal_sheep_tufted', 'Tufted sheep')):
        sprites[sid] = {'name': nm, 'cell': [16, 16], 'origin': [8, 15], 'dirs': DIRS, 'poses': 'stand, stepA, stepB, graze (blink slot)'}
    meta = {'image': 'x1_npcs.png', 'cell': [24, 32],
            'layout': 'X1 pack atlas, merged into npcs. Humanoid blocks (3 per band, rows down,left,right,up x cols stand,stepA,stepB,blink) then two 16x16 sheep bands. No atlas `origin`: every frame uses the default bottom-centre, which is [12,31] for the 24x32 humanoids and [8,15] for the 16x16 sheep (the pack merge copies frames, not an origin).',
            'sprites': sprites, 'frames': frames_json, 'anims': anims}
    if write:
        save_png(sheet, os.path.join(DST, 'x1_npcs.png'))
        write_json(os.path.join(DST, 'x1_npcs.json'), meta)
    return meta, blocks, sheep


def previews():
    meta, blocks, sheep = build()
    os.makedirs(os.path.join(OUT, 'x1'), exist_ok=True)
    items = []
    for nid, fr in blocks.items():
        for d in DIRS:
            items.append((f'{nid[4:]} {d}', fr[d][0]))
    contact(items, os.path.join(OUT, 'x1', 'x1_npcs_stand_4x.png'), scale=4, cols=8, title='X1 NPCs: down, left, right, up (stand) at 4x',
            bg=(60, 80, 60))
    walk = []
    for nid, fr in blocks.items():
        walk += [(nid[4:], fr['down'][1]), ('', fr['down'][0]), ('', fr['down'][2]), ('', fr['left'][1]), ('', fr['left'][0]), ('', fr['left'][2])]
    contact(walk, os.path.join(OUT, 'x1', 'x1_npcs_walk_4x.png'), scale=4, cols=12, title='X1 NPC walk frames (down A/stand/B, left A/stand/B)',
            bg=(60, 80, 60))
    sh = []
    for sid in SHEEP:
        for d in DIRS:
            for k, f in enumerate(sheep[sid][d]):
                sh.append((f'{sid[7:]} {d} {SLOT[k]}', f))
    contact(sh, os.path.join(OUT, 'x1', 'x1_sheep_8x.png'), scale=8, cols=8, title='sheep at 8x: stand, stepA, stepB, graze; down, left, right, up',
            bg=(70, 100, 60))
    return meta


if __name__ == '__main__':
    m = previews()
    print('x1_npcs frames', len(m['frames']))
