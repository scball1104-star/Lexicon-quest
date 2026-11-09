"""Episode 5 townsfolk -> assets/sprites/ep5_npcs.png / .json (E5-sprites).

Paper-doll NPCs (the shared builder, build_npcs.npc_frames, with the parts of chars/ep5_npc_parts.py added to the live
part tables at build time; no shared file is edited). Merged by the pack loader into the `npcs` atlas
(docs/PWA_PACKS.md): frame names are the ids src/data/ep5/npcs.js and story.js use. Looks from docs/story/EPISODE5.md
section 3 and EPISODE5_PLAN.md 9.2. Ages read (CRITIQUE_6 item 10): grey hair or a grey beard where the bible says
sixties (Nasrin, Omar), grey at the temples for Tamir.

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
import ep5_npc_parts as EP

XP.register()
EP.register()
R = S.R
HAIR = S.HAIR
CREAM = S.CREAM
WHITE = S.WHITE
DIRS = ['down', 'left', 'right', 'up']
SLOT = ['0', '1', '2', 'blink']
OUT5 = os.path.join(OUT, 'ep5')

GOLD = R('gold', 2, 3, 4)
SKIN_DARK = ['skin_dark:2', 'skin_dark:3', 'skin_dark:4', 'skin_med:2']           # wind-dark
SKIN_SUN = ['skin_dark:3', 'skin_dark:4', 'skin_med:1', 'skin_med:2']             # sun-creased
SKIN_MED = R('skin_med', 0, 1, 2, 3)
SAFFRON = ['wood:3', 'gold:2', 'gold:3', 'gold:4']
DUST = ['stone_warm:3', 'path:2', 'path:3', 'path:4']
DUST_DK = ['stone_warm:1', 'stone_warm:2', 'stone_warm:3', 'stone_warm:4']
INDIGO = ['ink:1', 'ink:2', 'ink:3', 'ink:4']
HAIR_GREYBLACK = ['ink:0', 'ink:1', 'stone_cool:2', 'stone_cool:4']
ROPE = ['wood:2', 'path:1', 'path:3']
CLAY = ['roof_red:2', 'wood:3', 'wood:4']
CORD = ['shadow:0', 'shadow:1', 'shadow:2', 'shadow:3']
LEATHER = R('wood', 1, 2, 3, 4)

EP5_NPCS = {
    # Nomad Sel: thirty, wind-dark skin, a long dust-coloured wrap, a saffron headscarf, a staff topped with a brass sun
    'npc_sel': dict(name='Sel', body='robe', head='long', hat='headscarf', over=['sun_staff'], no_arms=True,
                    pal={'hair': HAIR['black'], 'skin': SKIN_DARK, 'top': DUST, 'sec': DUST_DK, 'hat': SAFFRON,
                         'accent': GOLD, 'wood': R('wood', 2, 3, 4)}),
    # Yara: forties, captain of the Saffron Wind, a sailor's navy coat, a coil of rope on one shoulder
    'npc_yara': dict(name='Yara', body='tunic', head='pony', over=['rope_coil'],
                     pal={'hair': HAIR['dark'], 'skin': SKIN_MED, 'top': R('cloth_blue', 0, 1, 2, 3),
                          'bottom': ['stone_warm:2', 'stone_warm:3', 'stone_warm:4'], 'accent': GOLD, 'wood': ROPE}),
    # Kamal the Water Bearer: keeps the Moonwell, slow and gentle; a white turban, a well-blue tunic, a clay jar
    'npc_kamal': dict(name='Kamal', body='tunic', head='short', beard='short', hat='turban', over=['jar'], no_arms=True,
                      pal={'hair': HAIR['black'], 'skin': SKIN_MED, 'top': R('water', 1, 2, 3, 4), 'hat': WHITE,
                           'sec': R('gold', 1, 2, 3, 4), 'bottom': R('earth', 1, 2, 3), 'wood': CLAY}),
    # Nasrin the Star Reader: sixties, grey hair in a bun (no scarf, so the grey reads), a night-blue robe and an
    # ochre shawl
    'npc_nasrin': dict(name='Nasrin', body='robe', head='bun', over=['shawl'],
                       pal={'hair': HAIR['white'], 'skin': SKIN_MED, 'top': R('roof_blue', 1, 2, 3, 4),
                            'sec': ['wood:2', 'wood:3', 'gold:2', 'gold:3'], 'accent': GOLD}),
    # Laleh the Stargazer: twenties, black hair, a deep green robe, ink to the elbows
    'npc_laleh': dict(name='Laleh', body='robe', head='long', over=['ink_arms'],
                      pal={'hair': HAIR['black'], 'skin': SKIN_MED, 'top': R('roof_green', 1, 2, 3, 4),
                           'sec': R('gold', 1, 2, 3, 4), 'accent': GOLD, 'metal': ['ink:2', 'ink:3', 'ink:3', 'ink:4']}),
    # Omar the Pathkeeper: sixties, sun-creased, a white beard, a cream turban, a walking staff
    'npc_omar': dict(name='Omar', body='tunic', head='short', beard='full', hat='turban', over=['staff'], no_arms=True,
                     pal={'hair': HAIR['white'], 'skin': SKIN_SUN, 'top': ['earth:2', 'earth:3', 'path:1', 'path:2'],
                          'hat': CREAM, 'sec': ['wood:2', 'wood:3', 'gold:2', 'gold:3'], 'bottom': R('shadow', 1, 2, 3), 'wood': R('wood', 2, 3, 4),
                          'glow': ['wood:3', 'wood:4']}),
    # Yasmin the Cloth Merchant: a teal headscarf, a saffron dress, a teal shawl
    'npc_yasmin': dict(name='Yasmin', body='dress', head='long', hat='headscarf', over=['shawl'],
                       pal={'hair': HAIR['black'], 'skin': SKIN_MED, 'top': R('gold', 1, 2, 3, 4),
                            'hat': R('roof_green', 1, 2, 3, 4), 'sec': R('roof_green', 1, 2, 3, 4),
                            'bottom': R('gold', 1, 2, 3)}),
    # Hassan the Copperwright: the smith body, a black beard, a copper shirt, a leather apron, his bell hammer
    'npc_hassan': dict(name='Hassan', body='stout', head='short', beard='full', over=['apron_wide', 'hammer'], no_arms=True,
                       pal={'hair': HAIR['black'], 'skin': SKIN_DARK, 'top': R('roof_red', 2, 3, 4, 5), 'sec': LEATHER,
                            'bottom': R('shadow', 1, 2, 3), 'metal': ['wood:1', 'roof_red:3', 'roof_red:4', 'gold:3']}),
    # Ishra, the First Student (memory actor): Sel's sun staff, older than Sel, an indigo wrap and headscarf
    'npc_ishra': dict(name='Ishra', body='robe', head='long', hat='headscarf', over=['sun_staff'], no_arms=True,
                      pal={'hair': HAIR_GREYBLACK, 'skin': SKIN_DARK, 'top': INDIGO, 'sec': R('gold', 1, 2, 3, 4),
                           'hat': ['ink:1', 'ink:2', 'ink:3', 'cloth_blue:3'], 'accent': GOLD, 'wood': R('wood', 2, 3, 4)}),
    # Tamir, Yara's father (A Traveler): a caravan master, grey in his beard, a sand keffiyeh, a brown travel coat
    'npc_tamir': dict(name='Tamir', body='tunic', head='short', beard='full', hat='keffiyeh', over=['satchel', 'staff'],
                      no_arms=True,
                      pal={'hair': HAIR['greying'], 'skin': SKIN_SUN, 'top': R('earth', 1, 2, 3, 4),
                           'hat': ['path:1', 'path:2', 'path:3', 'sand:2'], 'metal': CORD, 'bottom': R('shadow', 1, 2, 3),
                           'accent': GOLD, 'wood': R('wood', 2, 3, 4), 'glow': ['wood:3', 'wood:4']}),
    # young Sel (memory child, nine): a small saffron headscarf, a dust smock
    'npc_young_sel': dict(name='Small Girl', body='child', head='pony', head_dy=5, hat='headscarf',
                          pal={'hair': HAIR['black'], 'skin': SKIN_DARK, 'top': DUST, 'hat': SAFFRON,
                               'bottom': R('earth', 1, 2, 3)}),
    # travelers (memory extras and the returning caravan): a hooded dust cloak and a satchel, in two recolours
    'npc_traveler': dict(name='Traveler', body='tunic', head='short', hat='hood', over=['satchel'],
                         pal={'hair': HAIR['dark'], 'skin': SKIN_MED, 'top': R('roof_red', 1, 2, 3, 4),
                              'hat': DUST, 'bottom': R('earth', 1, 2, 3), 'wood': R('wood', 1, 2, 3)}),
    'npc_traveler_b': dict(name='Traveler', body='tunic', head='short', hat='hood', over=['satchel'],
                           pal={'hair': HAIR['black'], 'skin': SKIN_DARK, 'top': R('gold', 1, 2, 3, 4),
                                'hat': INDIGO, 'bottom': R('shadow', 1, 2, 3), 'wood': R('wood', 1, 2, 3)}),
}


def dune_host():
    """the Dune Host: npc_innkeeper's spec (Hob) recoloured for the Dune Lantern Rest (saffron shirt, wind-dark skin,
    black beard, a lamp-gold mug)"""
    spec = dict(S.NPCS['npc_innkeeper'])
    spec['name'] = 'The Dune Host'
    spec['pal'] = {'hair': HAIR['black'], 'skin': SKIN_DARK, 'top': SAFFRON, 'sec': CREAM, 'bottom': R('earth', 1, 2, 3),
                   'glow': ['gold:3', 'gold:4']}
    return spec


EP5_NPCS['npc_dune_host'] = dune_host()
ORDER = list(EP5_NPCS)

# Vex Quill kneeling on the star floor (E5-finish; vex_gallery, CRITIQUE_7 item 8). Built from his OWN frames in the core
# `npcs` atlas (read, never written), so the coat, scarf and hair are exactly the look players know: the body down to the
# hands drops VEX_DROP px and the coat pools on the floor. Front: both knees under the coat; side: the knee forward, the
# boot heel behind; back: both boot soles. No walk: frames 1 and 2 are the kneel itself. Packed in the 15th block (the
# last free one of the fifth band), so no other rect moves.
VEX_HIP, VEX_DROP = 24, 5
VEX_COL = {'O': '#14101e', 'L': '#4c445c', 'M': '#2e2b4c', 'D': '#1a1334', 'R': '#b34532', 'r': '#87332e',
           'K': '#331a1b', 'k': '#6e3d2c'}
VEX_HEM = {
    'down': """
...OLLLMMMMrRMDDDDDDO...
..OLLLMMMMMrRMDDDDDDDO..
...OOOOOOOOOOOOOOOOOO...
""",
    'left': """
..OLLLLMMMMMMDDDDDO.....
.OLLLMMMMMMMMDDDDDDDOKk.
..OOOOOOOOOOOOOOOOOOOKKO
""",
    'up': """
...OLLMMMMMMMMMDDDDDO...
..OLLMMMMMMMMMMMDDDDDO..
...OKKkOOOOOOOOOOkKKO...
""",
}


def vex_kneel():
    """{dir: [stand, stand, stand, blink]} 24x32 kneeling frames for npc_vex_kneel, from npc_vex in the core npcs atlas."""
    import json
    from PIL import Image
    meta = json.load(open(os.path.join(DST, 'npcs.json'), encoding='utf-8'))
    sheet = np.asarray(Image.open(os.path.join(DST, 'npcs.png')).convert('RGBA'), np.float32) / 255.0

    def core(name):
        x, y, w, h = meta['frames'][name][:4]
        return sheet[y:y + h, x:x + w].copy()

    out = {}
    for d in ('down', 'left', 'up'):
        hem = parse_grid(grid_from_text(VEX_HEM[d]), VEX_COL, w=24)
        fr = []
        for slot in ('0', 'blink'):
            src = core(f'npc_vex_{d}_{slot}')
            k = blank(24, 32)
            k[VEX_DROP:VEX_HIP + VEX_DROP] = src[:VEX_HIP]
            n = hem.shape[0]
            k[32 - n:] = np.where(hem[..., 3:4] > 0, hem, k[32 - n:])
            fr.append(k)
        out[d] = [fr[0], fr[0], fr[0], fr[1]]
    out['right'] = [flip_x(f) for f in out['left']]
    return out


def build(write=True):
    blocks = {nid: BN.npc_frames(nid, spec) for nid, spec in EP5_NPCS.items()}
    blocks['npc_vex_kneel'] = vex_kneel()
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
    sprites = {nid: {'name': sp['name'], 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS} for nid, sp in EP5_NPCS.items()}
    sprites['npc_vex_kneel'] = {'name': 'Vex Quill', 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS}
    meta = {'image': 'ep5_npcs.png', 'cell': [24, 32],
            'layout': 'Episode 5 pack atlas, merged into npcs. Humanoid blocks (3 per band, rows down,left,right,up x cols '
                      'stand,stepA,stepB,blink). No atlas `origin`: every frame uses the default bottom-centre [12,31]. '
                      'npc_dune_host is npc_innkeeper recoloured for the Dune Lantern Rest; npc_traveler_b is the second '
                      'traveler recolour; npc_vex_kneel is npc_vex (core npcs atlas) kneeling, every slot the kneel.',
            'sprites': sprites, 'frames': rects, 'anims': anims}
    if write:
        import anim_atlas as AA
        AA.save_indexed(sheet, os.path.join(DST, 'ep5_npcs.png'))      # lossless, a third of the RGBA bytes
        write_json(os.path.join(DST, 'ep5_npcs.json'), meta)
    return meta, blocks


def previews(write=True):
    meta, blocks = build(write)
    os.makedirs(OUT5, exist_ok=True)
    items = []
    for nid, fr in blocks.items():
        for d in DIRS:
            items.append((f'{nid[4:]} {d}', fr[d][0]))
    for s in (1, 3):
        contact(items, os.path.join(OUT5, f'ep5_npcs_stand_{s}x.png'), scale=s, cols=8,
                title='Episode 5 NPCs: down, left, right, up (stand) at %dx' % s if s > 1 else None, bg=(196, 160, 104))
    walk = []
    for nid, fr in blocks.items():
        walk += [(nid[4:], fr['down'][1]), ('', fr['down'][0]), ('', fr['down'][2]), ('', fr['left'][1]), ('', fr['left'][0]),
                 ('', fr['left'][2])]
    contact(walk, os.path.join(OUT5, 'ep5_npcs_walk_3x.png'), scale=3, cols=12, title='Episode 5 NPC walk frames (3x)',
            bg=(80, 76, 72))
    return meta, blocks


if __name__ == '__main__':
    m, _ = previews()
    print('ep5_npcs frames', len(m['frames']))
