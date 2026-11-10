"""Episode 6 townsfolk -> assets/sprites/ep6_npcs.png / .json (E6-sprites).

Paper-doll NPCs (the shared builder, build_npcs.npc_frames, with the parts of chars/ep6_npc_parts.py added to the live
part tables at build time; no shared file is edited). Merged by the pack loader into the `npcs` atlas
(docs/PWA_PACKS.md): frame names are the ids src/data/ep6/npcs.js and story.js use. Looks from docs/story/EPISODE6.md
section 3 and EPISODE6_PLAN.md 9.2. Ages read (CRITIQUE_6 item 10): Bennet (sixties) grey hair and a grey beard; Aeris
(fifties) grey-streaked hair under her goggles, the young Aeris of the memories the same coat with dark hair; Pippa and
Suri (about twenty) and Liora (thirties) without grey.

The Zephyr Landing palette: sky cobalt, rope, brass and cloud white; the storm slate only on the deckhands.

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
import ep5_npc_parts as E5P
import ep6_npc_parts as EP

XP.register()
E5P.register()
EP.register()
R = S.R
HAIR = S.HAIR
CREAM = S.CREAM
WHITE = S.WHITE
DIRS = ['down', 'left', 'right', 'up']
SLOT = ['0', '1', '2', 'blink']
OUT6 = os.path.join(OUT, 'ep6')

BRASS = R('gold', 1, 2, 3, 4)
GOLD = R('gold', 2, 3, 4)
LEATHER = R('wood', 1, 2, 3, 4)
ROPE = ['wood:2', 'path:1', 'path:3']
SKY = R('cloth_blue', 1, 2, 3, 4)
COBALT = R('roof_blue', 0, 1, 2, 3)
SLATE = R('stone_cool', 1, 2, 3, 4)
SKIN_SUN = ['skin_dark:3', 'skin_dark:4', 'skin_med:1', 'skin_med:2']
SKIN_MED = R('skin_med', 0, 1, 2, 3)
SKIN_LIGHT = R('skin_light', 0, 1, 2, 3)
GLASS = ['ice:2', 'ice:3']
INK_HANDS = ['ink:2', 'ink:3', 'ink:3', 'ink:4']
# Aeris: grey-streaked (the lit strands grey, the shadow strands still dark brown)
HAIR_STREAK = ['hair_brown:1', 'hair_brown:2', 'stone_cool:4', 'metal:3']
# Bennet: grey (sixties)
HAIR_GREY = R('stone_cool', 3, 4, 5) + ['metal:3']
# a navigator's indigo-teal
TEAL = ['roof_green:1', 'roof_green:2', 'roof_green:3', 'roof_green:4']
SIGNAL = ['roof_red:2', 'roof_red:3', 'roof_red:4', 'fire:3']           # Pippa's signal-jacket: a hi-vis red-orange
PAPER = ['metal:2', 'metal:3', 'metal:4', 'metal:4']

COAT_AERIS = ['wood:0', 'wood:1', 'wood:2', 'wood:3']                   # an old aviator's coat, oiled brown leather

EP6_NPCS = {
    # Captain Aeris: fifties, a long aviator's coat with brass buttons, goggles pushed up into grey-streaked hair, the Sky
    # Compass on a chain
    'npc_aeris': dict(name='Aeris', body='robe', head='pony', hat='goggles', over=['coat_buttons', 'sky_compass'],
                      pal={'hair': HAIR_STREAK, 'skin': SKIN_SUN, 'top': COAT_AERIS, 'sec': ['wood:1', 'wood:2', 'path:1', 'path:2'],
                           'hat': LEATHER, 'metal': BRASS, 'glow': GLASS, 'accent': GOLD}),
    # Liora the Wind Navigator: thirties, a navigator's sash of knotted cords, a letter always in her hand
    'npc_liora': dict(name='Liora', body='dress', head='long', over=['cord_sash', 'letter'],
                      pal={'hair': HAIR['auburn'], 'skin': SKIN_LIGHT, 'top': SKY, 'bottom': R('cloth_blue', 0, 1, 2), 'sec': CREAM,
                           'wood': ROPE, 'accent': R('roof_red', 2, 3, 4), 'metal': PAPER}),
    # Bennet the Rigging Master: sixties, grey hair and beard, rope-burned hands, a rigger's hank at the hip
    'npc_bennet': dict(name='Bennet', body='tunic', head='short', beard='full', over=['rope_hank'],
                       pal={'hair': HAIR_GREY, 'skin': ['skin_med:0', 'roof_red:3', 'skin_med:1', 'skin_med:2'],
                            'top': ['shadow:2', 'stone_cool:2', 'stone_cool:3', 'stone_cool:4'],
                            'bottom': R('earth', 1, 2, 3), 'wood': ROPE, 'sec': LEATHER}),
    # Suri the Sky Cartographer: twenties, ink to the wrists, dividers through her braid
    'npc_suri': dict(name='Suri', body='robe', head='pony', over=['ink_hands', 'dividers'],
                     pal={'hair': HAIR['black'], 'skin': SKIN_MED, 'top': TEAL, 'sec': CREAM,
                          'metal': INK_HANDS, 'accent': GOLD}),
    # Ilex the Windwright: the smith body, a brass apron, goggles, a hammer
    'npc_ilex': dict(name='Ilex', body='stout', head='short', hat='goggles', over=['apron_wide', 'hammer'], no_arms=True,
                     pal={'hair': HAIR['brown'], 'skin': SKIN_MED, 'top': SKY, 'sec': BRASS,
                          'bottom': R('shadow', 1, 2, 3), 'hat': LEATHER, 'metal': ['shadow:2', 'stone_cool:3', 'gold:3', 'gold:4'],
                          'glow': GLASS}),
    # Nova the Deckhand: a deckhand's cap, a striped-blue shirt, a coil of cargo rope
    'npc_nova': dict(name='Nova', body='tunic', head='pony', hat='flat_cap', over=['rope_coil'],
                     pal={'hair': HAIR['dark'], 'skin': SKIN_SUN, 'top': ['cloth_blue:1', 'cloth_blue:3', 'metal:3', 'metal:4'],
                          'hat': COBALT, 'bottom': R('earth', 1, 2, 3), 'wood': ROPE, 'accent': GOLD, 'sec': COBALT}),
    # Piri the Messenger: a courier's satchel, a sky-blue cap, a silver-ribboned scarf
    'npc_piri': dict(name='Piri', body='tunic', head='short', hat='flat_cap', over=['satchel', 'scarf'],
                     pal={'hair': HAIR['ginger'], 'skin': SKIN_LIGHT, 'top': R('gold', 1, 2, 3, 4), 'hat': SKY,
                          'sec': ['stone_cool:4', 'stone_cool:5', 'metal:3', 'metal:4'], 'bottom': R('shadow', 1, 2, 3),
                          'wood': R('wood', 1, 2, 3), 'accent': GOLD}),
    # Thea the Cloud Gardener: a straw hat, a green dress, a pot of floating skyflowers
    'npc_thea': dict(name='Thea', body='dress', head='bun', hat='straw_hat', over=['flower_pot'], no_arms=True,
                     pal={'hair': HAIR['brown'], 'skin': SKIN_LIGHT, 'top': R('roof_green', 1, 2, 3, 4),
                          'bottom': R('roof_green', 0, 1, 2), 'hat': R('gold', 1, 2, 3, 4), 'wood': ['roof_red:1', 'roof_red:2', 'roof_red:3'],
                          'glow': ['blossom:2', 'ice:3'], 'accent': R('grass', 2, 3, 4), 'sec': CREAM}),
    # Pippa Voss, the Signal Apprentice: about twenty, a signal-jacket with reflective brass tabs, a hand lamp
    'npc_pippa': dict(name='Pippa', body='tunic', head='short', over=['signal_tabs', 'lantern'],
                      pal={'hair': HAIR['blonde'], 'skin': SKIN_LIGHT, 'top': SIGNAL, 'bottom': R('shadow', 1, 2, 3),
                           'accent': ['gold:3', 'gold:4', 'gold:5'], 'metal': BRASS, 'wood': R('wood', 1, 2, 3),
                           'glow': ['fire:4', 'fire:5'], 'sec': R('shadow', 1, 2, 3, 3)}),
    # the young Aeris of the memories (twenty years back): the same coat new, dark hair, the goggles, no compass yet
    'npc_aeris_young': dict(name='Aeris', body='robe', head='pony', hat='goggles', over=['coat_buttons'],
                            pal={'hair': HAIR['dark'], 'skin': SKIN_MED, 'top': ['wood:1', 'wood:2', 'wood:3', 'wood:4'],
                                 'sec': ['wood:2', 'wood:3', 'path:2', 'path:3'], 'hat': LEATHER, 'metal': BRASS,
                                 'glow': GLASS, 'accent': GOLD}),
    # deckhands (memory extras and the dock crowd): a slate jacket and a knit cap, in two recolours
    'npc_deckhand': dict(name='Deckhand', body='tunic', head='short', hat='flat_cap', over=['scarf'],
                         pal={'hair': HAIR['dark'], 'skin': SKIN_MED, 'top': SLATE, 'hat': COBALT,
                              'sec': R('roof_red', 1, 2, 3, 4), 'bottom': R('earth', 1, 2, 3)}),
    'npc_deckhand_b': dict(name='Deckhand', body='tunic', head='pony', hat='flat_cap', over=['scarf'],
                           pal={'hair': HAIR['black'], 'skin': SKIN_SUN, 'top': COBALT, 'hat': SLATE,
                                'sec': R('gold', 1, 2, 3, 4), 'bottom': R('shadow', 1, 2, 3)}),
}


def cloud_host():
    """the Cloudhouse Host: npc_innkeeper's spec (Hob) recoloured for the Cloudhouse Inn (a sky-blue shirt, a cloud-white
    apron, a brass mug, sandy hair)"""
    spec = dict(S.NPCS['npc_innkeeper'])
    spec['name'] = 'The Cloudhouse Host'
    spec['pal'] = {'hair': HAIR['blonde'], 'skin': SKIN_MED, 'top': SKY, 'sec': WHITE, 'bottom': R('shadow', 1, 2, 3),
                   'glow': ['gold:3', 'gold:4']}
    return spec


EP6_NPCS['npc_cloud_host'] = cloud_host()
ORDER = list(EP6_NPCS)


def build(write=True):
    blocks = {nid: BN.npc_frames(nid, spec) for nid, spec in EP6_NPCS.items()}
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
    sprites = {nid: {'name': sp['name'], 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS} for nid, sp in EP6_NPCS.items()}
    meta = {'image': 'ep6_npcs.png', 'cell': [24, 32],
            'layout': 'Episode 6 pack atlas, merged into npcs. Humanoid blocks (3 per band, rows down,left,right,up x cols '
                      'stand,stepA,stepB,blink). No atlas `origin`: every frame uses the default bottom-centre [12,31]. '
                      'npc_cloud_host is npc_innkeeper recoloured for the Cloudhouse Inn; npc_deckhand_b is the second '
                      'deckhand recolour; npc_aeris_young is Aeris in the memories (dark hair, no compass).',
            'sprites': sprites, 'frames': rects, 'anims': anims}
    if write:
        import anim_atlas as AA
        AA.save_indexed(sheet, os.path.join(DST, 'ep6_npcs.png'))
        write_json(os.path.join(DST, 'ep6_npcs.json'), meta)
    return meta, blocks


def previews(write=True):
    meta, blocks = build(write)
    os.makedirs(OUT6, exist_ok=True)
    items = []
    for nid, fr in blocks.items():
        for d in DIRS:
            items.append((f'{nid[4:]} {d}', fr[d][0]))
    for s in (1, 4):
        contact(items, os.path.join(OUT6, f'ep6_npcs_stand_{s}x.png'), scale=s, cols=8,
                title='Episode 6 NPCs: down, left, right, up (stand) at %dx' % s if s > 1 else None, bg=(150, 180, 214),
                label=s > 1)
    walk = []
    for nid, fr in blocks.items():
        walk += [(nid[4:], fr['down'][1]), ('', fr['down'][0]), ('', fr['down'][2]), ('', fr['left'][1]), ('', fr['left'][0]),
                 ('', fr['left'][2])]
    contact(walk, os.path.join(OUT6, 'ep6_npcs_walk_3x.png'), scale=3, cols=12, title='Episode 6 NPC walk frames (3x)',
            bg=(80, 76, 72))
    return meta, blocks


if __name__ == '__main__':
    m, _ = previews(write=False)
    print('ep6_npcs frames', len(m['frames']))
