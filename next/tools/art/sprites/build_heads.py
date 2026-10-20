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
}
ORDER = ['hero', 'mira', 'bram', 'ink_slime', 'page_wraith', 'briar_wolf', 'moss_scarab', 'bookmite',
         'tome_golem', 'ink_wraith', 'echo_warden', 'lost_page', 'archivore',
         'thornback_wolf', 'ink_blot', 'briar_alpha']


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
    fr = atlas['frames'][eid + '_0']
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


def build():
    with open(os.path.join(NEXT, 'assets', 'sprites', 'enemies_field.json'), encoding='utf-8') as f:
        ef = json.load(f)
    img = np.asarray(Image.open(os.path.join(NEXT, 'assets', 'sprites', ef['image'])).convert('RGBA')).astype(np.float32) / 255
    heads = {}
    for eid in ORDER:
        if eid in PARTY:
            heads[eid] = framed(party_head(eid))
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
