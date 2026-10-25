"""Timeline head icons -> assets/ui/heads.png/.json (CRITIQUE_1 C4, brief W4-art item 7).

12 x 12 per icon including a 1 px frame (#14101e) around a 10 x 10 head on a dark backdrop (#251d34).
Party heads (hero, mira, bram) are hand-pixeled chibi faces in each character's own sprite palette, front
facing. Enemy and boss heads are 10 x 10 crops of the enemies_field sprites (frame 0), flipped to face RIGHT
like their battle sprites, with a hand-placed eye where the crop would lose it.
Frame names: head_<id>. The frame ring is neutral so the battle HUD can over-draw a side-coloured ring.

    python build_heads.py          (also called from build_all.py)
"""
import os, json
import numpy as np
from PIL import Image
from pix import parse_grid, grid_from_text, hex2rgb, blank, save_png, write_json, NEXT, OUT, upscale
import pal as P

UI = os.path.join(NEXT, 'assets', 'ui')
FRAME = '#14101e'
BACK = '#251d34'

HERO = ('''
...aaaa...
..aeddda..
.aeddddcda
adddcddcca
adcuuuucba
.cuEuuEuc.
.cuFuuFub.
.btuuuutb.
..atuuta..
...aaaa...
''', {'a': 'hair_brown:0', 'b': 'hair_brown:1', 'c': 'hair_brown:2', 'd': 'hair_brown:3', 'e': 'hair_brown:4',
      'u': 'skin_light:2', 't': 'skin_light:1', 'E': 'cloth_blue:1', 'F': 'water:3'})

MIRA = ('''
...bbbb...
..bdeedb..
.bdeeddddb
bdedddddcb
bddcuuucdb
bdcuEuuEcb
.dcuFuuFc.
.btuuuutb.
.bdtuutdb.
..bbbbbb..
''', {'b': '#2e2258', 'c': '#4a3888', 'd': '#6a54b0', 'e': '#9a86d8',
      'u': 'skin_med:2', 't': 'skin_med:1', 'E': 'ink:2', 'F': 'gold:4'})

BRAM = ('''
...aaaa...
..adddca..
.adddccba.
ajdcccbija
aicuuuucja
.cuEuuEuc.
.cuFuuFuc.
.ctuuuutc.
.acjccjca.
..aacca...
''', {'a': 'hair_brown:0', 'b': 'hair_brown:1', 'c': 'hair_brown:2', 'd': 'hair_brown:3',
      'i': 'stone_cool:3', 'j': 'stone_cool:4',
      'u': 'skin_light:2', 't': 'skin_light:1', 'E': 'cloth_blue:1', 'F': 'water:3'})

PARTY = {'hero': HERO, 'mira': MIRA, 'bram': BRAM}

# enemy id -> (crop x, crop y) of the 10 x 10 window in enemies_field frame 0 (before the flip),
# plus optional hand-placed pixels after the flip: [(x, y, 'ramp:i'), ...]
ENEMY_CROPS = {
    'ink_slime':   dict(at=(1, 6)),
    'bookmite':    dict(at=(1, 6)),
    'moss_scarab': dict(at=(2, 5)),
    'lost_page':   dict(at=(3, 3)),
    'page_wraith': dict(at=(7, 1)),
    'ink_wraith':  dict(at=(7, 1)),
    'briar_wolf':  dict(at=(0, 4)),
    'tome_golem':  dict(at=(7, 3)),
    'echo_warden': dict(at=(7, 0)),
    'archivore':   dict(at=(11, 8)),
    'thornback_wolf': dict(at=(0, 4)),
    'ink_blot':    dict(at=(1, 6)),
    'briar_alpha': dict(at=(0, 4)),
    # E2-sprites: Episode 2 foes (their field sprites share their kin's grids, so their kin's crops), the Other
    # Selves (the face of the glass party_field left stand) and the Nameless King (veil and crown of the avatar)
    'mist_wolf':   dict(at=(0, 4)),
    'glassback':   dict(at=(2, 5)),
    'quicksilver': dict(at=(1, 6)),
    'quicksilver_bead': dict(at=(1, 6)),
    'glint_wisp':  dict(at=(7, 1)),
    'glass_sentinel': dict(at=(7, 3)),
    'borrowed_shadow': dict(at=(7, 1)),
    'faceless_knight': dict(at=(7, 0)),
    'shard_swarm': dict(at=(3, 2)),
    # W11 (CRITIQUE_4 item 10): the avatar crop read as a window (a dark square under a pale lintel); the head is now
    # the hood, the glass veil and the crown's foot from the battle frame itself (ep2_king.py, already facing right)
    # W12 (CRITIQUE_4 item 15): the battle frame's head is now a 13 x 16 veil under a crown, more than a 10 px crop can
    # hold, so the timeline head is the same design drawn at icon size: the crown, the cowl, the veil's cold glow
    'nameless_king': dict(grid=['..m.M.m...',
                                '.mMMMMmms.',
                                '.sscsCsss.',
                                '.hhhhhhhh.',
                                'hhGGGGGGhd',
                                'hGvSvvvvGd',
                                'hGvvSvVvGd',
                                'hGvVvSvvGd',
                                'dhGvvvvGhd',
                                'ddhGGGGhdd'],
                          legend={'m': 'metal:3', 'M': 'metal:4', 's': 'stone_cool:4', 'c': 'magic_cyan:2',
                                  'C': 'magic_cyan:3', 'h': 'stone_cool:3', 'd': 'stone_cool:2', 'G': 'magic_cyan:2',
                                  'v': 'water:0', 'V': 'cloth_blue:1', 'S': 'ice:2'}),
    'false_sorrow': dict(at=(7, 1)),
    'false_pride': dict(at=(7, 0)),
    # E3-sprites: Episode 3 foes (field crops of the kin grids in their own palettes) and hand-drawn heads for the
    # ones with no field sprite (the Specter, the coils, the Warden)
    'cinder_hound': dict(at=(0, 4), fix=[(6, 3, 'fire:5'), (7, 3, 'fire:3')]),
    'cinder_beetle': dict(at=(2, 5)),
    'slag_slime': dict(at=(1, 6)),
    'ashbound_miner': dict(at=(7, 1)),
    'furnace_construct': dict(at=(7, 3)),
    'soot_phantom': dict(at=(7, 1)),
    'forge_defender': dict(at=(7, 0)),
    'bellows_specter': dict(grid=['...kkkk...',
                                  '..kLLMMk..',
                                  '.kLMMMMMk.',
                                  '.kLMMMEMbb',
                                  '.kMMMMMkBB',
                                  '..kMMMMkbb',
                                  '..kkMMk.b.',
                                  '....kk....',
                                  '..r....r..',
                                  '...r..r...'],
                            legend={'k': 'shadow:0', 'L': 'stone_warm:3', 'M': 'stone_warm:2', 'E': 'fire:5',
                                    'B': 'fire:3', 'b': 'roof_red:3', 'r': 'roof_red:2'}),
    'bellows_coil': dict(grid=['...kkkk...',
                               '..kBBBBk..',
                               '..kBBBBkkk',
                               '...kkkk...',
                               '.kccccccK.',
                               '.keeeeeek.',
                               '.kccccccK.',
                               '.keeeeeek.',
                               '.kccccccK.',
                               '..kkkkkk..'],
                         legend={'k': 'shadow:0', 'B': 'earth:3', 'c': 'wood:3', 'K': 'wood:2', 'e': 'fire:4'}),
    'smelter_coil': dict(grid=['.kLLLLLLk.',
                               '.kYYYYYYkk',
                               '..kMMMMk..',
                               '.kccccccK.',
                               '.kwwwwwwk.',
                               '.kccccccK.',
                               '.kwwwwwwk.',
                               '..kkkkkk..',
                               '..kKKKKk..',
                               '.kkkkkkkk.'],
                         legend={'k': 'shadow:0', 'L': 'stone_warm:3', 'Y': 'fire:5', 'M': 'stone_warm:1', 'c': 'shadow:2',
                                 'K': 'wood:2', 'w': 'fire:4'}),
    'cinder_warden': dict(grid=['..rrrrrr..',
                                '.rkkkkkkr.',
                                'rkkkkkkkkr',
                                'rkkFkkFkkr',
                                'rkkkkkkkkr',
                                '.bkkkkkkb.',
                                'bbbkkkkbbb',
                                'bbBbbbbBbb',
                                'bbbGGGGbbb',
                                'bbbbbbbbbb'],
                          legend={'r': 'roof_red:3', 'k': 'shadow:0', 'F': 'fire:5', 'b': 'wood:3', 'B': 'gold:3',
                                  'G': 'fire:4'}),
}
ORDER = ['hero', 'mira', 'bram', 'ink_slime', 'page_wraith', 'briar_wolf', 'moss_scarab', 'bookmite',
         'tome_golem', 'ink_wraith', 'echo_warden', 'lost_page', 'archivore',
         'thornback_wolf', 'ink_blot', 'briar_alpha',
         'mist_wolf', 'glassback', 'quicksilver', 'quicksilver_bead', 'glint_wisp', 'glass_sentinel',
         'borrowed_shadow', 'faceless_knight', 'shard_swarm', 'refl_hero', 'refl_mira', 'refl_bram',
         'nameless_king', 'false_sorrow', 'false_pride',
         'cinder_hound', 'cinder_beetle', 'slag_slime', 'ashbound_miner', 'furnace_construct', 'soot_phantom',
         'forge_defender', 'bellows_specter', 'bellows_coil', 'smelter_coil', 'cinder_warden']


def rgb(h):
    c = hex2rgb(h)
    return np.array([c[0] / 255, c[1] / 255, c[2] / 255, 1.0], np.float32)


def framed(inner):
    """10x10 rgba -> 12x12 with the backdrop and the 1 px frame"""
    out = np.tile(rgb(BACK), (12, 12, 1))
    out[0, :] = rgb(FRAME); out[-1, :] = rgb(FRAME); out[:, 0] = rgb(FRAME); out[:, -1] = rgb(FRAME)
    m = inner[..., 3] > 0.5
    out[1:11, 1:11][m] = inner[m]
    return out


def party_head(name):
    txt, leg = PARTY[name]
    g = parse_grid(grid_from_text(txt), P.resolve(leg, 'head_' + name), w=10, h=10)
    return g


def enemy_head(eid, spec, atlas, img):
    if 'grid' in spec:
        return parse_grid(spec['grid'], P.resolve(spec['legend'], 'head_' + eid), w=10, h=10)
    src = spec.get('src', eid + '_0')
    if src.startswith('battle:'):
        import ep2_king as EK
        k = EK.build()[src[7:]]
        cx, cy = spec['at']
        crop = blank(10, 10)
        sub = k[cy:cy + 10, cx:cx + 10]
        crop[:sub.shape[0], :sub.shape[1]] = sub
        return crop
    fr = atlas['frames'][src]
    x, y, w, h = fr
    s = img[y:y + h, x:x + w]
    cx, cy = spec['at']
    crop = blank(10, 10)
    sub = s[cy:cy + 10, cx:cx + 10]
    crop[:sub.shape[0], :sub.shape[1]] = sub
    crop = crop[:, ::-1].copy()          # face right like the battle sprite
    for (px, py, ref) in spec.get('fix', []):
        crop[py, px] = rgb(P.color(ref))
    return crop


# W11 (CRITIQUE_4 item 9, the timeline half): the Other Selves' heads were one flat violet each, so the Mirrored
# Combo bracket linked two blobs nobody could name. Each is now its owner's head in a four-value glass ramp by
# lightness (deep indigo, violet, cyan, white rim) with the owner's signature kept: the hero's white scarf (and no
# face), Mira's staff gem, Bram's gold shield cross.
GLASS4 = ['#241a4a', '#6a50b0', '#78cfe2', '#eef4ff']
SIGNATURE = {
    'hero': [(x, 9, '#ffffff') for x in range(2, 8)] + [(x, 8, '#d8e4ff') for x in (3, 4, 5)],
    'mira': [(8, 1, '#8af0e8'), (8, 2, '#ffffff'), (9, 2, '#8af0e8'), (8, 3, '#3cb8d8')],
    'bram': [(7, 8, '#f9d77a'), (8, 7, '#f9d77a'), (8, 8, '#fff2b0'), (9, 8, '#f9d77a'), (8, 9, '#f9d77a')],
}


def glass_head(head, pid):
    """a 10 x 10 party head -> its reflection's timeline head (see GLASS4 / SIGNATURE)"""
    out = head.copy()
    op = out[..., 3] > 0.5
    L = 0.3 * out[..., 0] + 0.59 * out[..., 1] + 0.11 * out[..., 2]
    vals = L[op]
    if vals.size:
        lo, hi = float(vals.min()), float(vals.max())
        t = np.clip((L - lo) / max(1e-6, hi - lo), 0, 1)
        idx = np.minimum(3, (t * 3.999).astype(int))
        for i, hx in enumerate(GLASS4):
            m = op & (idx == i)
            out[m] = rgb(hx)
    if pid == 'hero':
        # no face: the face area (the light middle rows) is one smooth pane of glass
        for y in range(4, 8):
            for x in range(2, 8):
                if op[y, x]:
                    out[y, x] = rgb(GLASS4[2])
    for (x, y, hx) in SIGNATURE.get(pid, []):
        out[y, x] = rgb(hx)
    return out


def build():
    with open(os.path.join(NEXT, 'assets', 'sprites', 'enemies_field.json'), encoding='utf-8') as f:
        ef = json.load(f)
    img = np.asarray(Image.open(os.path.join(NEXT, 'assets', 'sprites', ef['image'])).convert('RGBA')).astype(np.float32) / 255
    heads = {}
    import ep2_reflections as RF
    for eid in ORDER:
        if eid in PARTY:
            heads[eid] = framed(party_head(eid))
        elif eid in RF.IDS:
            # the Other Selves: their owner's front-facing head in glass (white eyes; the hero's face blank)
            pid = RF.IDS[eid][0]
            heads[eid] = framed(glass_head(party_head(pid), pid))
        else:
            heads[eid] = framed(enemy_head(eid, ENEMY_CROPS[eid], ef, img))
    cols = 8
    rows = (len(ORDER) + cols - 1) // cols
    sheet = blank(cols * 12, rows * 12)
    frames = {}
    for i, eid in enumerate(ORDER):
        x, y = (i % cols) * 12, (i // cols) * 12
        sheet[y:y + 12, x:x + 12] = heads[eid]
        frames['head_' + eid] = [x, y, 12, 12]
    os.makedirs(UI, exist_ok=True)
    save_png(sheet, os.path.join(UI, 'heads.png'))
    meta = {'image': 'heads.png', 'cell': [12, 12], 'origin': [0, 0], 'frames': frames,
            'frameColor': FRAME, 'backColor': BACK, 'inner': [1, 1, 10, 10],
            'side': {('party' if k in PARTY else 'enemy'): None for k in ORDER},
            'notes': 'CTB timeline head icons, 12x12 including a 1 px #14101e frame around a 10x10 head on #251d34. '
                     'Draw top-left at the slot (origin 0,0). The frame is neutral: over-draw a side-coloured ring '
                     '(party / enemy / current) on the outer pixel if the HUD wants one. Party heads face front, '
                     'enemies face right like their battle sprites. Generated by tools/art/sprites/build_heads.py.'}
    meta['side'] = {k: ('party' if k in PARTY else 'enemy') for k in ORDER}
    meta['notes'] += (' E2-sprites: Episode 2 foes are crops of their field sprites; head_refl_hero / head_refl_mira / '
                      'head_refl_bram are the party heads in glass (front facing); head_nameless_king is the crown, cowl '
                      'and glowing veil of his battle frame drawn at icon size (W12).')
    write_json(os.path.join(UI, 'heads.json'), meta)
    # preview at 8x, with a mock 18 px timeline rail like the battle HUD
    prev = Image.new('RGB', (cols * 12 * 8, rows * 12 * 8 + 20 * 8), (30, 46, 110))
    prev.paste(upscale(sheet, 8), (0, 0))
    rail = blank(len(ORDER) * 18 + 4, 18)
    rail[..., :3] = np.array(hex2rgb('#1d2a67'), np.float32) / 255; rail[..., 3] = 1
    for i, eid in enumerate(ORDER):
        rail[3:15, 2 + i * 18:14 + i * 18] = heads[eid]
    prev.paste(upscale(rail, 8), (0, rows * 12 * 8 + 8))
    prev.save(os.path.join(OUT, 'heads_8x.png'))
    return meta


if __name__ == '__main__':
    build()
    print('heads.png / heads.json written')
