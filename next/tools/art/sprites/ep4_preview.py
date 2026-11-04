"""Episode 4 sprite previews (E4-sprites; read-only on the atlases, writes only tools/art/sprites/out/ep4/):

  anim_<group>_3x.png       every Episode 4 battle id with its derived frames
  compare_beings_3x.png     the Paper Regent, the Barrister and the Waterlogged Sentinel beside the Cinder Warden and the
                            Nameless King, on a dark and a pale stage, so all read as different beings
  field_phone_<n>x.png      every field foe on a wet-stone mock floor at 1x (phone scale) and 3x
  npc_scene_<n>x.png        the cast in a row on canal stone

    python ep4_preview.py
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from PIL import Image
from pix import *

OUT4 = os.path.join(OUT, 'ep4')


def atlas(name, folder=DST):
    j = json.load(open(os.path.join(folder, name + '.json'), encoding='utf-8'))
    im = np.asarray(Image.open(os.path.join(folder, j['image'])).convert('RGBA')).astype(np.float32) / 255
    return j, im


def frame(j, im, n):
    x, y, w, h = j['frames'][n]
    return im[y:y + h, x:x + w]


def anim_sheets():
    import x1_enemies as XE
    import ep4_enemies as E, ep4_regent as RG, ep4_writs as WR, ep4_build as B
    writs = {}
    for n, img, ox, oy in B.writ_frames():
        writs.setdefault(n.split('_')[0] + '_' + n.split('_')[1], []).append((n, img, ox, oy))

    def fo(eid):
        if eid in RG.IDS:
            return RG.frames_of(eid)
        if eid in writs:
            return writs[eid]
        return E.frames_of(eid)
    XE.frames_of = fo
    groups = {'a': E.ALL_IDS[:5], 'b': E.ALL_IDS[5:] + ['writ_silence', 'writ_oblivion']}
    for g, ids in groups.items():
        XE.anim_sheet(os.path.join(OUT4, f'anim_{g}_3x.png'), ids, scale=3, bg=(24, 34, 40))
    XE.anim_sheet(os.path.join(OUT4, 'anim_regent_2x.png'), RG.IDS, scale=2, bg=(24, 34, 40))


def stage(items, bg, gap=8, floor=None):
    """items: [rgba]; bottoms aligned on one floor line"""
    H = max(i.shape[0] for i in items) + 2 * gap
    W = sum(i.shape[1] for i in items) + gap * (len(items) + 1)
    out = np.zeros((H, W, 4), np.float32)
    out[..., :3] = np.array(bg, np.float32) / 255
    out[..., 3] = 1
    x = gap
    for i in items:
        h, w = i.shape[:2]
        y = H - gap - h
        a = i[..., 3:4]
        out[y:y + h, x:x + w, :3] = out[y:y + h, x:x + w, :3] * (1 - a) + i[..., :3] * a
        x += w + gap
    return out


def compare():
    jb, ib = atlas('bosses_battle')
    je, ie = atlas('enemies_battle')
    j4b, i4b = atlas('ep4_bosses_battle')
    j4e, i4e = atlas('ep4_enemies_battle')
    items = [frame(j4b, i4b, 'paper_regent'), frame(j4b, i4b, 'paper_regent_charter'), frame(j4e, i4e, 'barrister'),
             frame(j4e, i4e, 'waterlogged_sentinel'), frame(jb, ib, 'cinder_warden'), frame(jb, ib, 'nameless_king')]
    for bg, tag in (((22, 34, 40), 'dark'), ((158, 160, 150), 'marble')):
        s = stage(items, bg)
        save_png(s, os.path.join(OUT4, f'compare_beings_1x_{tag}.png'))
        to_pil(upscale_arr(s, 3)).save(os.path.join(OUT4, f'compare_beings_3x_{tag}.png'))


def upscale_arr(a, k):
    return np.repeat(np.repeat(a, k, 0), k, 1)


def wet_stone(w, h, seed=3):
    """a mock of the Keep's floor: dark green-veined flagstone, 16 px tiles, wet highlights"""
    rng = np.random.RandomState(seed)
    import pal as P
    c = lambda r: np.array(hex2rgb(P.color(r)), np.float32) / 255
    base = [c('shadow:1'), c('shadow:2'), c('foliage_dark:0'), c('foliage_dark:1')]
    out = np.zeros((h, w, 4), np.float32)
    out[..., 3] = 1
    for ty in range(0, h, 16):
        for tx in range(0, w, 16):
            k = rng.randint(0, 3)
            out[ty:ty + 16, tx:tx + 16, :3] = base[k]
            out[ty, tx:tx + 16, :3] = c('shadow:0')
            out[ty:ty + 16, tx, :3] = c('shadow:0')
            for _ in range(3):
                y, x = ty + rng.randint(2, 15), tx + rng.randint(2, 15)
                out[y, x, :3] = c('water:1') if rng.rand() < 0.6 else c('roof_green:2')
    return out


def field_phone():
    j, im = atlas('ep4_enemies_field')
    names = [n for n in j['frames'] if n.endswith('_0')]
    floor = wet_stone(16 * (len(names) * 3 + 1), 80)
    x = 16
    for n in names:
        f = frame(j, im, n)
        h, w = f.shape[:2]
        y = 64 - h
        a = f[..., 3:4]
        floor[y:y + h, x:x + w, :3] = floor[y:y + h, x:x + w, :3] * (1 - a) + f[..., :3] * a
        x += 48
    save_png(floor, os.path.join(OUT4, 'field_phone_1x.png'))
    to_pil(upscale_arr(floor, 3)).save(os.path.join(OUT4, 'field_phone_3x.png'))


def npc_scene():
    j, im = atlas('ep4_npcs')
    jb, ib = atlas('npcs')
    ids = list(j['sprites'].keys())
    items = [frame(j, im, f'{i}_down_0') for i in ids] + [frame(jb, ib, 'npc_courier_v_down_0')]
    import pal as P
    s = stage(items, (126, 128, 120), gap=4)
    save_png(s, os.path.join(OUT4, 'npc_scene_1x.png'))
    to_pil(upscale_arr(s, 3)).save(os.path.join(OUT4, 'npc_scene_3x.png'))


if __name__ == '__main__':
    os.makedirs(OUT4, exist_ok=True)
    anim_sheets()
    compare()
    field_phone()
    npc_scene()
    print('previews in', OUT4)
