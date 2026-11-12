"""Episode 7 cast -> assets/sprites/ep7_npcs.png / .json (E7-sprites).

Paper-doll NPCs (the shared builder, build_npcs.npc_frames, with the parts of chars/ep7_npc_parts.py added to the live
part tables at build time; no shared file is edited). Merged by the pack loader into the `npcs` atlas
(docs/PWA_PACKS.md): frame names are the sprite ids src/data/ep7/npcs.js and story.js use. Looks from
docs/story/EPISODE7.md section 3 and EPISODE7_PLAN.md 9.2, followed exactly. Ages read (CRITIQUE_6 item 10, and Scott's
note of 2026-11-11: where a character ages, the hair follows):

  npc_keeper        Nox, seventies: small and straight-backed, a long blue Keeper's coat with frost on the hem, white
                    hair pinned up (the bun), ink on her right hand, a lamp
  npc_keeper_mid    Nox fifteen and sixteen years back (memories 2 and 3), late fifties: the same blue coat without the
                    frost, her hair still dark brown going grey (grey-streaked), the ink, the lamp
  npc_keeper_young  Nox as a girl (memory 1): the child body in a small blue coat, dark brown hair
  npc_keeper_mother the Keeper's mother (memory 1): a darker Keeper's coat and hood against the blizzard, dark hair, a
                    lamp
  npc_courier_m     Marten, fifties: a courier's coat (oiled brown) with the brass Willowmere post badge, a satchel,
                    greying hair, a ready grin, snow to the knees
  npc_bryn          Bryn, forties: a guard's fur hood, a staff with a lantern hung from its hook (pale blue flame: the
                    watchfires turn pale blue), a short brown beard
  npc_eira          Eira, thirties: the smith body, a leather apron, a glass lens on a cord, auburn hair tied back
  npc_sol           Sol, twenties: twine round both wrists, a pack of marker stakes on his back, sandy hair
  npc_maera         Maera, fifties: a basket of winter moss, a moss-green dress, greying hair in a bun
  npc_torr          Torr, sixties: grey hair, a ledger under his arm, ink-blue fingers, a scholar's robe
  npc_mirael        Mirael, forties: a physician's bag, a frost-grey scarf, a wine-dark coat, dark hair
  npc_north_watchkeeper  the North Watchkeeper: npc_innkeeper recoloured for the Thawlight Lodge (a pine-green jumper,
                    a cream apron, grey hair)

The Palehaven palette: ice blue, snow white, pine green and the warm browns of lamplit wood.

Frames `<id>_<dir>_<0|1|2|blink>` (24x32, origin [12,31], the default bottom-centre) and anims `<id>_walk_<dir>`,
`<id>_idle_<dir>`, exactly as npcs.json.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from pix import *
import pal as P
import build_npcs as BN
import npc_specs as S
import x1_npc_parts as XP
import ep5_npc_parts as E5P
import ep6_npc_parts as E6P
import ep7_npc_parts as EP

XP.register()
E5P.register()
E6P.register()
EP.register()
R = S.R
HAIR = S.HAIR
CREAM = S.CREAM
WHITE = S.WHITE
DIRS = ['down', 'left', 'right', 'up']
SLOT = ['0', '1', '2', 'blink']
OUT7 = os.path.join(OUT, 'ep7')

KEEPER_BLUE = R('cloth_blue', 1, 2, 3, 4)
KEEPER_DEEP = ['ink:1', 'roof_blue:1', 'roof_blue:2', 'roof_blue:3']
IRON = ['shadow:1', 'stone_cool:2', 'stone_cool:3', 'stone_cool:4']
LAMP_WARM = ['fire:4', 'fire:5']
LAMP_COLD = ['ice:2', 'metal:4']
INK = ['ink:1', 'ink:2', 'ink:3']
SKIN_OLD = ['skin_light:0', 'skin_light:1', 'skin_light:2', 'skin_light:3']
SKIN_MED = R('skin_med', 0, 1, 2, 3)
SKIN_LIGHT = R('skin_light', 0, 1, 2, 3)
HAIR_STREAK = ['hair_brown:1', 'hair_brown:2', 'stone_cool:4', 'metal:3']      # dark brown going grey
HAIR_GREYING = HAIR['greying']
LEATHER = R('wood', 1, 2, 3, 4)
COURIER = ['wood:0', 'wood:1', 'wood:2', 'wood:3']
BRASS = ['gold:2', 'gold:3', 'gold:4', 'gold:5']
PINE = ['foliage_dark:0', 'foliage_dark:1', 'roof_green:2', 'roof_green:3']
MOSS = ['grass:2', 'grass:4']
FROSTGREY = ['stone_cool:3', 'stone_cool:4', 'stone_cool:5', 'metal:3']
WINE = ['roof_red:0', 'roof_red:1', 'roof_red:2', 'roof_red:3']
TWINE = ['path:1', 'path:3', 'sand:2']
FUR = ['stone_warm:3', 'stone_warm:4', 'stone_warm:5', 'metal:3']

EP7_NPCS = {
    'npc_keeper': dict(name='Nox', body='robe', head='bun', over=['ink_hand', 'keeper_lamp'],
                       pal={'hair': HAIR['white'], 'skin': SKIN_OLD, 'top': KEEPER_BLUE, 'sec': R('roof_blue', 1, 2, 3, 4),
                            'accent': R('stone_cool', 3, 4, 5), 'metal': IRON, 'glow': LAMP_WARM, 'wood': INK}),
    'npc_keeper_mid': dict(name='The Keeper', body='robe', head='bun', over=['ink_hand', 'keeper_lamp'],
                           pal={'hair': HAIR_STREAK, 'skin': SKIN_LIGHT, 'top': KEEPER_BLUE, 'sec': R('roof_blue', 1, 2, 3, 4),
                                'accent': R('stone_cool', 3, 4, 5), 'metal': IRON, 'glow': LAMP_WARM, 'wood': INK}),
    'npc_keeper_young': dict(name='A Girl', body='child', head='pony', head_dy=5,
                             pal={'hair': HAIR['dark'], 'skin': SKIN_LIGHT, 'top': KEEPER_BLUE, 'bottom': R('shadow', 1, 2, 3)}),
    'npc_keeper_mother': dict(name="The Keeper's Mother", body='robe', head='long', hat='hood', over=['keeper_lamp'],
                              pal={'hair': HAIR['dark'], 'skin': SKIN_LIGHT, 'top': KEEPER_DEEP, 'sec': CREAM,
                                   'hat': ['ink:1', 'roof_blue:1', 'roof_blue:2', 'roof_blue:3'],
                                   'accent': R('stone_cool', 3, 4, 5), 'metal': IRON, 'glow': LAMP_WARM}),
    'npc_courier_m': dict(name='Marten', body='tunic', head='short', over=['satchel', 'post_badge', 'grin'],
                          pal={'hair': HAIR_GREYING, 'skin': SKIN_MED,
                               'top': COURIER, 'bottom': R('earth', 1, 2, 3), 'wood': R('wood', 1, 2, 3),
                               'accent': BRASS, 'metal': BRASS}),
    'npc_bryn': dict(name='Bryn', body='tunic', head='short', beard='short', hat='fur_hood', over=['lantern_staff'],
                     no_arms=True,
                     pal={'hair': HAIR['brown'], 'skin': SKIN_LIGHT, 'top': R('roof_blue', 1, 2, 3, 4), 'bottom': R('shadow', 1, 2, 3),
                          'hat': ['stone_warm:1', 'stone_warm:2', 'stone_warm:3', 'stone_warm:4'], 'sec': FUR, 'wood': R('wood', 1, 2, 3),
                          'metal': IRON, 'glow': LAMP_COLD,
                          'accent': R('stone_cool', 3, 4, 5)}),
    'npc_eira': dict(name='Eira', body='stout', head='pony', over=['apron_wide', 'lens_cord'],
                     pal={'hair': HAIR['auburn'], 'skin': SKIN_LIGHT, 'top': CREAM, 'sec': LEATHER,
                          'bottom': R('shadow', 1, 2, 3), 'accent': R('wood', 2, 3, 4), 'glow': ['ice:2', 'metal:4']}),
    'npc_sol': dict(name='Sol', body='tunic', head='short', under=['stakes_back'], over=['twine_wrists'],
                    pal={'hair': HAIR['sandy'], 'skin': SKIN_MED, 'top': PINE, 'bottom': R('earth', 1, 2, 3),
                         'accent': TWINE, 'sec': LEATHER, 'wood': ['wood:2', 'path:2', 'sand:2']}),
    'npc_maera': dict(name='Maera', body='dress', head='bun', over=['moss_basket'], no_arms=True,
                      pal={'hair': HAIR_GREYING, 'skin': SKIN_LIGHT, 'top': R('roof_green', 1, 2, 3, 4),
                           'bottom': R('roof_green', 0, 1, 2), 'sec': CREAM, 'wood': R('wood', 1, 2, 3), 'glow': MOSS,
                           'accent': R('wood', 2, 3, 4)}),
    'npc_torr': dict(name='Torr', body='robe', head='elder', over=['book', 'ink_hands'],
                     pal={'hair': HAIR['gray'], 'skin': SKIN_LIGHT, 'top': R('stone_cool', 1, 2, 3, 4), 'sec': R('cloth_blue', 1, 2, 3, 4),
                          'wood': R('roof_blue', 1, 2, 3), 'accent': R('gold', 2, 3, 4), 'metal': ['ink:2', 'ink:3', 'ink:3', 'ink:4']}),
    'npc_mirael': dict(name='Mirael', body='robe', head='long', over=['scarf', 'satchel'],
                       pal={'hair': HAIR['dark'], 'skin': SKIN_MED, 'top': WINE, 'sec': FROSTGREY,
                            'wood': ['wood:0', 'wood:1', 'wood:2'], 'accent': R('gold', 2, 3, 4)}),
}


def north_watchkeeper():
    """the North Watchkeeper: npc_innkeeper's spec (Hob) recoloured for the Thawlight Lodge (a pine-green jumper, a cream
    apron, grey hair and beard, a warm mug)"""
    spec = dict(S.NPCS['npc_innkeeper'])
    spec['name'] = 'The North Watchkeeper'
    spec['pal'] = {'hair': HAIR['gray'], 'skin': SKIN_LIGHT, 'top': PINE, 'sec': CREAM, 'bottom': R('shadow', 1, 2, 3),
                   'glow': ['gold:3', 'gold:4']}
    return spec


EP7_NPCS['npc_north_watchkeeper'] = north_watchkeeper()
ORDER = list(EP7_NPCS)

# frost on the hem (Nox) and snow to the knees (Marten): dithered onto every finished frame, so they hold while walking
FROST_ROWS = {'npc_keeper': (28, 31), 'npc_courier_m': (26, 31)}


def frost(img, rows):
    """recolour the lit (non-outline) pixels of the given rows with a dither of snow and ice; the higher rows sparser"""
    out = img.copy()
    y0, y1 = rows
    lab = to_oklab(out[..., :3].reshape(-1, 3)).reshape(out.shape[:2] + (3,))
    snow = np.array(hex2rgb(P.color('metal:4', 'ep7_npcs')), np.float32) / 255
    ice = np.array(hex2rgb(P.color('ice:3', 'ep7_npcs')), np.float32) / 255
    for y in range(y0, min(y1 + 1, out.shape[0])):
        dense = (y - y0) >= (y1 - y0) // 2
        for x in range(out.shape[1]):
            if out[y, x, 3] < 0.5 or lab[y, x, 0] < 0.28:
                continue
            if dense or (x + y) % 2 == 0:
                out[y, x, :3] = snow if (x + 2 * y) % 3 else ice
    return out


def frames_of(nid, spec):
    fr = BN.npc_frames(nid, spec)
    if nid in FROST_ROWS:
        fr = {d: [frost(f, FROST_ROWS[nid]) for f in fs] for d, fs in fr.items()}
    return fr


def build(write=True):
    blocks = {nid: frames_of(nid, spec) for nid, spec in EP7_NPCS.items()}
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
    sprites = {nid: {'name': sp['name'], 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS} for nid, sp in EP7_NPCS.items()}
    meta = {'image': 'ep7_npcs.png', 'cell': [24, 32],
            'layout': 'Episode 7 pack atlas, merged into npcs. Humanoid blocks (3 per band, rows down,left,right,up x cols '
                      'stand,stepA,stepB,blink). No atlas `origin`: every frame uses the default bottom-centre [12,31]. '
                      'npc_keeper is Nox (white hair pinned up, frost on the hem, ink on her right hand, a lamp); '
                      'npc_keeper_mid is Nox in memories 2 and 3 (grey-streaked dark hair, no frost); npc_keeper_young is '
                      'the girl of memory 1 and npc_keeper_mother her mother; npc_courier_m is Marten (snow to the knees); '
                      'npc_north_watchkeeper is npc_innkeeper recoloured for the Thawlight Lodge.',
            'sprites': sprites, 'frames': rects, 'anims': anims}
    if write:
        import anim_atlas as AA
        AA.save_indexed(sheet, os.path.join(DST, 'ep7_npcs.png'))
        write_json(os.path.join(DST, 'ep7_npcs.json'), meta)
    return meta, blocks


def previews(write=True):
    meta, blocks = build(write)
    os.makedirs(OUT7, exist_ok=True)
    items = []
    for nid, fr in blocks.items():
        for d in DIRS:
            items.append((f'{nid[4:]} {d}', fr[d][0]))
    for s in (1, 4):
        contact(items, os.path.join(OUT7, f'ep7_npcs_stand_{s}x.png'), scale=s, cols=8,
                title='Episode 7 NPCs: down, left, right, up (stand) at %dx' % s if s > 1 else None, bg=(214, 224, 236),
                label=s > 1)
    walk = []
    for nid, fr in blocks.items():
        walk += [(nid[4:], fr['down'][1]), ('', fr['down'][0]), ('', fr['down'][2]), ('', fr['left'][1]), ('', fr['left'][0]),
                 ('', fr['left'][2])]
    contact(walk, os.path.join(OUT7, 'ep7_npcs_walk_3x.png'), scale=3, cols=12, title='Episode 7 NPC walk frames (3x)',
            bg=(80, 76, 72))
    return meta, blocks


if __name__ == '__main__':
    m, _ = previews(write=False)
    print('ep7_npcs frames', len(m['frames']))
