"""Episode 4 townsfolk -> assets/sprites/ep4_npcs.png / .json (E4-sprites).

Ten paper-doll NPCs (the shared builder, build_npcs.npc_frames, with the parts of chars/ep4_npc_parts.py added to the
live part tables at build time; no shared file is edited). Merged by the pack loader into the `npcs` atlas
(docs/PWA_PACKS.md): frame names are the ids the maps, npcs.js and story.js use. Looks from docs/story/EPISODE4.md
section 3 and EPISODE4_PLAN.md 9.2. Ada reuses npc_courier_v (Episode 3), so she is not here.

Frames `<id>_<dir>_<0|1|2|blink>` (24x32, origin [12,31], the default bottom-centre) and anims `<id>_walk_<dir>`,
`<id>_idle_<dir>`, exactly as npcs.json.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
from pix import *
import pal as P
import build_npcs as BN
import npc_specs as S
import x1_npc_parts as XP
import ep4_npc_parts as EP

XP.register()          # sou_wester (Hale) is an Expansion 1 hat
EP.register()
R = S.R
CREAM = S.CREAM
HAIR = S.HAIR
WHITE = S.WHITE
DIRS = ['down', 'left', 'right', 'up']
SLOT = ['0', '1', '2', 'blink']

GOLD = R('gold', 1, 2, 3, 4)
LEATHER = R('wood', 1, 2, 3, 4)
SKIN_DARK = ['skin_dark:2', 'skin_dark:3', 'skin_dark:4', 'skin_med:2']
SKIN_MED = R('skin_med', 0, 1, 2, 3)
SKIN_WEATHER = ['skin_light:0', 'skin_light:1', 'skin_light:1', 'skin_light:2']
HAIR_GREYBLACK = ['ink:0', 'ink:1', 'stone_cool:2', 'stone_cool:4']        # black braids gone grey at the temples
SAPPHIRE = R('cloth_blue', 1, 2, 3, 4)

EP4_NPCS = {
    # Lyra, the Regent: fifties, dark skin, long black hair with grey in it, a slender gold circlet with a sapphire,
    # sapphire robes gone dull at the hem (the robe's lower band is a muddy slate), gold trim (matches noble_lady)
    'npc_lyra': dict(name='Lyra', body='robe', head='long', hat='circlet',
                     pal={'hair': HAIR_GREYBLACK, 'skin': SKIN_DARK, 'top': SAPPHIRE, 'hat': GOLD,
                          'sec': ['stone_cool:1', 'stone_cool:2', 'stone_cool:3', 'stone_cool:3'],
                          'accent': ['cloth_blue:3', 'roof_blue:4', 'ice:2'], 'bottom': R('cloth_blue', 0, 1, 2)}),
    # Captain Hale: sixties, an oilskin coat and sou'wester, a white beard, a voice for shouting across water
    'npc_hale': dict(name='Captain Hale', body='stout', head='short', beard='full', hat='sou_wester',
                     pal={'hair': HAIR['white'], 'top': ['earth:2', 'earth:3', 'path:2', 'path:3'],
                          'hat': ['earth:1', 'earth:2', 'path:1', 'path:2'], 'sec': CREAM,
                          'bottom': R('shadow', 1, 2, 3), 'skin': SKIN_WEATHER, 'accent': R('gold', 2, 3, 4)}),
    # Nilo the Ferryhand: about twenty, a river-green jerkin, rolled sleeves, a satchel of bell pins
    'npc_nilo': dict(name='Nilo', body='tunic', head='short', over=['satchel'],
                     pal={'hair': HAIR['dark'], 'top': R('roof_green', 1, 2, 3, 4), 'bottom': R('earth', 1, 2, 3),
                          'skin': SKIN_MED, 'accent': R('gold', 2, 3, 4), 'wood': R('wood', 1, 2, 3)}),
    # Dorian the Royal Scribe: seventies, a long white beard, spectacles, the king's plum scribe robe with gold
    # trim, ink-stained, his ledger
    'npc_dorian': dict(name='Dorian', body='robe', head='elder', beard='long', over=['glasses', 'book'],
                       pal={'hair': HAIR['white'], 'top': R('roof_purple', 1, 2, 3, 4), 'sec': GOLD,
                            'accent': R('gold', 2, 3, 4), 'wood': R('ink', 1, 2, 3)}),
    # Joss the Lockwright: forties, big forearms (the stout body, sleeves rolled), a leather apron, a ring of keys and
    # the Lockwright's Crank
    'npc_joss': dict(name='Joss', body='stout', head='short', beard='short', over=['apron_wide', 'keyring', 'crank'],
                     no_arms=True,
                     pal={'hair': HAIR['dark'], 'top': R('cloth_blue', 1, 2, 3, 4), 'sec': LEATHER,
                          'bottom': R('shadow', 1, 2, 3), 'skin': SKIN_MED,
                          'metal': ['shadow:2', 'stone_cool:2', 'stone_cool:3', 'stone_cool:4'],
                          'wood': R('wood', 2, 3, 4)}),
    # Vance the Guard: the Crown Guard in sea-blue with a gold-trimmed helm and a spear (Holt wears Willowmere blue,
    # Corin slate, Rusk iron)
    'npc_vance': dict(name='Vance', body='tunic', head='short', hat='helmet', over=['spear'], no_arms=True,
                      pal={'hair': HAIR['brown'], 'top': R('water', 1, 2, 3, 4), 'bottom': R('shadow', 1, 2, 3),
                           'hat': ['stone_cool:3', 'stone_cool:4', 'metal:2', 'metal:3'], 'accent': R('gold', 2, 3, 4),
                           'skin': SKIN_MED}),
    # Linn the Archivist: carries records to the high shelves, an auburn bun, spectacles, a deep green dress, a book
    'npc_linn': dict(name='Linn', body='dress', head='bun', over=['glasses', 'book'],
                     pal={'hair': HAIR['auburn'], 'top': R('roof_green', 1, 2, 3, 4), 'sec': CREAM,
                          'bottom': R('roof_green', 1, 2, 3), 'wood': R('roof_red', 1, 2, 3)}),
    # Sori the Apprentice: a child, a dark ponytail, a mustard smock, wet to the knees
    'npc_sori': dict(name='Sori', body='child', head='pony', head_dy=5,
                     pal={'hair': HAIR['black'], 'top': R('gold', 1, 2, 3, 4), 'bottom': R('water', 1, 2, 3),
                          'skin': SKIN_DARK}),
    # the King (memory actor): old, crowned, tired and kind; a royal blue robe with gold, a long white beard
    'npc_king': dict(name='The King', body='robe', head='elder', beard='long', hat='crown',
                     pal={'hair': HAIR['white'], 'top': R('roof_blue', 1, 2, 3, 4), 'sec': GOLD, 'hat': GOLD,
                          'accent': ['cloth_blue:3', 'roof_blue:4', 'ice:2']}),
    # a Valewyn boatman (memory, scene only): a straw hat, an earth-brown smock, his oar
    'npc_boatman': dict(name='Boatman', body='tunic', head='short', beard='short', hat='straw_hat', over=['oar'],
                        no_arms=True,
                        pal={'hair': HAIR['gray'], 'top': R('earth', 1, 2, 3, 4), 'hat': R('sand', 0, 1, 2, 3),
                             'bottom': R('shadow', 1, 2, 3), 'skin': SKIN_WEATHER, 'wood': R('wood', 2, 3, 4)}),
}


def build(write=True):
    blocks = {nid: BN.npc_frames(nid, spec) for nid, spec in EP4_NPCS.items()}
    rects, anims = {}, {}
    per = 3
    rows = (len(blocks) + per - 1) // per
    sheet = blank(per * 96, rows * 128)
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
    sprites = {nid: {'name': sp['name'], 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS} for nid, sp in EP4_NPCS.items()}
    meta = {'image': 'ep4_npcs.png', 'cell': [24, 32],
            'layout': 'Episode 4 pack atlas, merged into npcs. Humanoid blocks (3 per band, rows down,left,right,up x cols stand,stepA,stepB,blink). No atlas `origin`: every frame uses the default bottom-centre [12,31]. Ada is npc_courier_v (Episode 3, base atlas).',
            'sprites': sprites, 'frames': rects, 'anims': anims}
    if write:
        save_png(sheet, os.path.join(DST, 'ep4_npcs.png'))
        write_json(os.path.join(DST, 'ep4_npcs.json'), meta)
    return meta, blocks


def previews():
    meta, blocks = build()
    os.makedirs(os.path.join(OUT, 'ep4'), exist_ok=True)
    items = []
    for nid, fr in blocks.items():
        for d in DIRS:
            items.append((f'{nid[4:]} {d}', fr[d][0]))
    contact(items, os.path.join(OUT, 'ep4', 'ep4_npcs_stand_4x.png'), scale=4, cols=8, title='Episode 4 NPCs: down, left, right, up (stand) at 4x',
            bg=(80, 76, 72))
    walk = []
    for nid, fr in blocks.items():
        walk += [(nid[4:], fr['down'][1]), ('', fr['down'][0]), ('', fr['down'][2]), ('', fr['left'][1]), ('', fr['left'][0]), ('', fr['left'][2])]
    contact(walk, os.path.join(OUT, 'ep4', 'ep4_npcs_walk_4x.png'), scale=4, cols=12, title='Episode 4 NPC walk frames', bg=(80, 76, 72))
    return meta, blocks


if __name__ == '__main__':
    m, _ = previews()
    print('ep4_npcs frames', len(m['frames']))
