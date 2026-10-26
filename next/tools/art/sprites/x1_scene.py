"""Field-scale mocks for the X1 NPCs and sheep (X1-sprites): the six townsfolk and the sheep standing beside eight existing
townsfolk on grass, moor turf and a wooden floor at 1x (the internal 384x216), then at 2x (about what a phone landscape
844x390 shows). Output: out/x1/npc_scene_{1x,2x,4x}.png.

    python x1_scene.py
"""
import json, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import x1_field as F

NEXT = F.NEXT
SPR = os.path.join(NEXT, 'assets', 'sprites')
OUT = F.OUT


def atlas(name):
    j = json.load(open(os.path.join(SPR, name + '.json'), encoding='utf-8'))
    return j, Image.open(os.path.join(SPR, j['image'])).convert('RGBA')


def frame(at, name):
    j, im = at
    f = j['frames'][name]
    x, y, w, h = f[:4]
    o = (f[4], f[5]) if len(f) >= 6 else (j.get('origin') or (w // 2, h - 1))
    return im.crop((x, y, x + w, y + h)), o


def shadow(w):
    j, im = atlas('misc')
    nm = 'shadow_medium' if w >= 20 else 'shadow_small'
    x, y, ww, hh = j['frames'][nm]
    return im.crop((x, y, x + ww, y + hh)), j['origin'][nm]


TERR = {'grass': 'grass', 'moor turf': 'moor turf'}


def scene(terrain, new, old, W=24, H=14):
    bg = F.terrain_image(terrain, W, H, seed=5)
    npcs, x1n = atlas('npcs'), atlas('x1_npcs')

    def put(at, name, cx, fy, flip=False):
        im, o = frame(at, name)
        sh, so = shadow(im.size[0] if im.size[0] >= 20 else 12)
        bg.alpha_composite(sh, (cx - so[0], fy + 1 - so[1]))
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT); o = (im.size[0] - 1 - o[0], o[1])
        bg.alpha_composite(im, (cx - o[0], fy - o[1]))
    for i, n in enumerate(new):
        put(x1n, n, 24 + i * 44, 100)
    for i, n in enumerate(old):
        put(npcs, n, 24 + i * 44, 180)
    return bg


def main():
    new = ['npc_brindle_down_0', 'npc_tamsin_down_0', 'npc_ferrick_down_0', 'npc_hesper_down_0', 'npc_odo_down_0',
           'npc_yarrow_down_0', 'animal_sheep_left_0', 'animal_sheep_tufted_down_0']
    old = ['npc_elder_down_0', 'npc_tess_down_0', 'npc_baker_down_0', 'npc_smith_down_0', 'npc_farmer_down_0',
           'npc_old_woman_down_0', 'npc_scholar_down_0', 'npc_guard_down_0']
    os.makedirs(os.path.join(OUT, 'x1'), exist_ok=True)
    rows = [scene(t, new, old) for t in ('grass', 'moor turf')]
    sheet = Image.new('RGBA', (rows[0].size[0], sum(r.size[1] for r in rows)))
    y = 0
    for r in rows:
        sheet.alpha_composite(r, (0, y)); y += r.size[1]
    sheet = sheet.convert('RGB')
    sheet.save(os.path.join(OUT, 'x1', 'npc_scene_1x.png'))
    for s in (2, 4):
        sheet.resize((sheet.size[0] * s, sheet.size[1] * s), Image.NEAREST).save(os.path.join(OUT, 'x1', f'npc_scene_{s}x.png'))
    # animated walk strip: the six NPCs' walk cycle down (A, stand, B, stand) and left, plus the sheep
    print('ok')


if __name__ == '__main__':
    main()
