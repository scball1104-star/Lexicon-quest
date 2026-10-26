"""Expansion 1 field sprites (X1-sprites): barrow_shade, barrow_reeve (the Reeve's map avatar) and millstone_golem, the
kin grids of chars/enemy_field.py in new palettes with a 1 px rim light on the upper-left edges, plus the terrain mocks
that judge them (and the existing field foes) on grass, moor turf, dark flagstone and wet brick.

    frames()   -> {id: [rgba, rgba]}   facing LEFT, origin bottom-centre
    mock()     -> writes out/x1/field_mock_*.png
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'chars'))
import json
import numpy as np
from PIL import Image
from pix import *
import pal as P
import enemy_field as EF
import x1_enemy_field as XF
import x1_enemies as XE

IDS = ['barrow_shade', 'barrow_reeve', 'millstone_golem']
RIM = {'barrow_shade': XE.SHADE_RIM, 'barrow_reeve': XE.REEVE_RIM, 'millstone_golem': XE.GOLEM_RIM}


def _parse(rows, leg, w, h, who):
    return parse_grid(grid_from_text('\n'.join(rows)) if isinstance(rows, list) else grid_from_text(rows), leg, w=w, h=h)


def frames():
    out = {}
    for vid, (src, pal) in XF.VARIANTS_X1.items():
        d = EF.FIELD[src]
        leg = P.resolve(pal, 'field_' + vid)
        w, h = d['size']
        imgs = [parse_grid(grid_from_text(g), leg, w=w, h=h) for g in d['frames']]
        if vid == 'millstone_golem':
            imgs = [flour(im, i) for i, im in enumerate(imgs)]
        out[vid] = [XE.rim(im, {'rim': RIM[vid]}) for im in imgs]
    # the Reeve: the Echo Warden's grid on a 28x36 canvas with a crook and moss
    d = EF.FIELD['echo_warden']
    kin = [g.strip('\n').split('\n') for g in d['frames']]
    kin = [[r.ljust(24, '.')[:24] for r in rows][:32] + ['.' * 24] * max(0, 32 - len(rows)) for rows in kin]
    leg = P.resolve(XF.REEVE_PAL, 'field_barrow_reeve')
    rows2 = XF.reeve_frames(kin)
    imgs = [parse_grid(grid_from_text('\n'.join(r)), leg, w=24, h=36) for r in rows2]
    # rim only on the knight, not the crook: apply, then restore the crook pixels
    out['barrow_reeve'] = [XE.rim(im, {'rim': RIM['barrow_reeve']}) for im in imgs]
    return out


def flour(im, seed):
    """a few flour pixels on the golem's shoulders and a mote beside it"""
    im = im.copy()
    for (x, y) in ((9, 4), (13, 4), (11, 4), (4, 8), (19, 8)):
        if im[y, x, 3] > 0.5:
            im[y, x, :3] = np.array(hex2rgb(P.color('metal:4')), np.float32) / 255
    return im


def sizes():
    f = frames()
    return {k: {'size': [v[0].shape[1], v[0].shape[0]], 'origin': [v[0].shape[1] // 2, v[0].shape[0] - 1]} for k, v in f.items()}


# ----------------------------------------------------------------------------- terrain mocks
def _sheet(name):
    return Image.open(os.path.join(NEXT, 'assets', 'tiles', name)).convert('RGBA')


TERRAINS = {
    # name: (sheet, [variant (x, y)...], weights)
    'grass': ('terrain.png', [(0, 144), (16, 144), (32, 144), (48, 144), (64, 144), (80, 144)], [4, 3, 1, 2, 2, 2]),
    'moor turf': ('x1.png', [(32, 272), (48, 272), (64, 272), (80, 272), (96, 272), (112, 272)], [4, 3, 1, 2, 2, 2]),
    'dark flagstone': ('x1.png', [(176, 0), (192, 0), (208, 0), (224, 0), (240, 0)], [20, 2, 2, 2, 2]),
    'wet brick': ('x1.png', [(240, 48), (256, 48), (272, 48), (288, 48), (304, 48)], [20, 2, 2, 2, 2]),
    'archive floor': ('archive.png', [(96, 0), (112, 0), (128, 0), (144, 0), (160, 0), (176, 0), (192, 0), (208, 0)], [10, 2, 2, 1, 1, 2, 1, 1]),
    'barrow floor': ('x1.png', [(32, 0), (48, 0), (64, 0), (80, 0), (96, 0), (112, 0), (128, 0)], [26, 3, 2, 2, 2, 2, 1]),
}


def terrain_image(name, tw, th, seed=3):
    sheet, vs, ws = TERRAINS[name]
    im = _sheet(sheet)
    rng = np.random.RandomState(seed)
    p = np.array(ws, float) / sum(ws)
    out = Image.new('RGBA', (tw * 16, th * 16))
    for ty in range(th):
        for tx in range(tw):
            vx, vy = vs[rng.choice(len(vs), p=p)]
            out.paste(im.crop((vx, vy, vx + 16, vy + 16)), (tx * 16, ty * 16))
    return out


def _atlas(name):
    j = json.load(open(os.path.join(DST, name + '.json'), encoding='utf-8'))
    return j, Image.open(os.path.join(DST, j['image'])).convert('RGBA')


def existing_field(ids, frame=0, atlas='enemies_field'):
    j, im = _atlas(atlas)
    out = []
    for i in ids:
        x, y, w, h = j['frames'][f'{i}_{frame}']
        out.append((i, im.crop((x, y, x + w, y + h))))
    return out


def new_field(frame=0):
    return [(k, to_pil(v[frame])) for k, v in frames().items()]


def shadow_for(w):
    j, im = _atlas('misc')
    nm = 'shadow_huge' if w >= 32 else 'shadow_large' if w >= 24 else 'shadow_small'
    x, y, ww, hh = j['frames'][nm]
    o = j['origin'].get(nm) or [ww // 2, hh // 2]
    return im.crop((x, y, x + ww, y + hh)), o


def mock_row(terr, sprites, tw=19, th=4, y_feet=44, flip=False):
    """a tw x th tile strip with the sprites standing in a row at 1x; returns a PIL RGBA image"""
    bg = terrain_image(terr, tw, th)
    n = len(sprites)
    step = (tw * 16) // n
    for i, (nm, sp) in enumerate(sprites):
        w, h = sp.size
        cx = step * i + step // 2
        sh, so = shadow_for(w)
        bg.alpha_composite(sh, (cx - so[0], y_feet + 1 - so[1]))
        s = sp.transpose(Image.FLIP_LEFT_RIGHT) if flip else sp
        bg.alpha_composite(s, (cx - w // 2, y_feet - h + 1))
    return bg


def mock(tag='field'):
    ex = ['thornback_wolf', 'tome_golem', 'ink_wraith', 'moss_scarab', 'briar_wolf', 'ink_blot', 'page_wraith']
    sprites = existing_field(ex) + new_field()
    outdir = os.path.join(OUT, 'x1')
    os.makedirs(outdir, exist_ok=True)
    rows = []
    for t in ('grass', 'moor turf', 'dark flagstone', 'barrow floor', 'wet brick', 'archive floor'):
        rows.append((t, mock_row(t, sprites, tw=25, th=4)))
    W = rows[0][1].size[0]
    H = sum(r[1].size[1] for r in rows)
    sheet = Image.new('RGBA', (W, H))
    y = 0
    for t, r in rows:
        sheet.alpha_composite(r, (0, y)); y += r.size[1]
    sheet.save(os.path.join(outdir, f'{tag}_mock_1x.png'))
    for s in (3, 2):
        sheet.resize((W * s, H * s), Image.NEAREST).save(os.path.join(outdir, f'{tag}_mock_{s}x.png'))
    # the rim-lit alternates beside the plain ones on the dark floors
    pairs = []
    for k in ('thornback_wolf', 'ink_blot', 'ink_wraith'):
        pairs += existing_field([k]) + existing_field(['x1_' + k], atlas='x1_enemies_field')
    rows = [(t, mock_row(t, pairs, tw=16, th=4)) for t in ('dark flagstone', 'wet brick', 'barrow floor')]
    H2 = sum(r[1].size[1] for r in rows)
    sh2 = Image.new('RGBA', (rows[0][1].size[0], H2))
    y = 0
    for t, r in rows:
        sh2.alpha_composite(r, (0, y)); y += r.size[1]
    sh2.resize((sh2.size[0] * 3, sh2.size[1] * 3), Image.NEAREST).save(os.path.join(outdir, f'{tag}_alt_mock_3x.png'))
    names = [n for n, _ in sprites]
    return names


if __name__ == '__main__':
    print(mock())
    f = frames()
    contact([(f'{k}_{i}', v[i]) for k, v in f.items() for i in (0, 1)], os.path.join(OUT, 'x1', 'x1_field_6x.png'), scale=6, cols=6,
            title='X1 field sprites at 6x (facing left)', bg=(52, 74, 58))
