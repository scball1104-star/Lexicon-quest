"""Mock screens (384x216, rendered at 3x) to judge the sprites in context:
out/mock_field_3x.png  - party, townsfolk, animals, props and field enemies on grass
out/mock_battle_3x.png - battle layout over the Willowmere key art (enemies left, party right)
out/mock_dialog_3x.png - portraits at 48x48 in a plain window
"""
import os, json
import numpy as np
from pix import *
import pal as P


def atlas(name):
    meta = json.load(open(os.path.join(DST, name + '.json')))
    img = from_pil(Image.open(os.path.join(DST, meta['image'])))
    return meta, img


def frame(img, r):
    x, y, w, h = r
    return img[y:y + h, x:x + w]


def grass(w, h, seed=3):
    rng = np.random.default_rng(seed)
    ramp = [np.array(hex2rgb(c), np.float32) / 255 for c in P.ramp('grass')]
    a = np.zeros((h, w, 4), np.float32)
    a[..., 3] = 1
    base = ramp[3]
    a[..., :3] = base
    n = rng.random((h, w))
    a[n > 0.93, :3] = ramp[4]
    a[n < 0.05, :3] = ramp[2]
    return a


def put_feet(dst, img, cx, by):
    """paste so that the bottom-centre of img sits at (cx, by)"""
    h, w = img.shape[:2]
    paste(dst, img, int(cx - w // 2), int(by - h + 1))


def shadow(dst, misc, mimg, kind, cx, by):
    r = misc['frames']['shadow_' + kind]
    s = frame(mimg, r)
    paste(dst, s, cx - r[2] // 2, by - r[3] // 2)


def render():
    pf, pimg = atlas('party_field')
    nm, nimg = atlas('npcs')
    pr, primg = atlas('props')
    ef, efimg = atlas('enemies_field')
    mi, mimg = atlas('misc')
    W, H = 384, 216
    scr = grass(W, H)
    # dirt path band
    path = [np.array(hex2rgb(c), np.float32) / 255 for c in P.ramp('path')]
    scr[150:182, :, :3] = path[2]
    scr[150, :, :3] = path[1]
    scr[181, :, :3] = path[3]
    objs = []  # (by, kind, payload)

    def prop(pid, tx, ty, fi=0):
        o = pr['objects'][pid]
        r = o['frames'][fi] if 'frames' in o else o['frame']
        img = frame(primg, r)
        ax, ay = o['anchor']
        x = tx * 16 + o['footprint'][0] * 8 - ax
        y = ty * 16 + 15 - ay
        objs.append((y + ay, lambda: paste(scr, img, x, y)))

    def actor(img, cx, by, sh='medium'):
        objs.append((by, lambda: (shadow(scr, mi, mimg, sh, cx, by), put_feet(scr, img, cx, by))))

    prop('tree_willow', 0, 5)
    prop('tree_pine', 21, 4)
    prop('tree_violet', 18, 6)
    prop('fountain', 8, 4)
    prop('lamp_post', 6, 5, 1)
    prop('bench', 13, 4)
    prop('chest_wood', 15, 6)
    prop('chest_gold', 16, 6, 1)
    prop('barrel', 3, 8)
    prop('crate', 4, 8)
    prop('pot', 5, 8)
    prop('signboard', 7, 9)
    prop('bush', 19, 8)
    prop('hedge_flowers', 9, 8)
    prop('prop_milestone', 22, 9)
    for i, c in enumerate(('hero', 'mira', 'bram')):
        actor(frame(pimg, pf['frames'][f'{c}_down_0' if i == 0 else f'{c}_down_{i}']), 140 + i * 22, 172)
    for i, n in enumerate(('npc_elder', 'npc_tess', 'npc_smith', 'npc_scholar', 'npc_child_b', 'npc_guard')):
        actor(frame(nimg, nm['frames'][f'{n}_down_0']), 214 + i * 24, 172)
    actor(frame(nimg, nm['frames']['npc_baker_left_0']), 30, 172)
    actor(frame(nimg, nm['frames']['npc_ferry_right_0']), 54, 172)
    for i, a in enumerate(('animal_cat_sit_0', 'animal_dog_sit_0', 'animal_chicken_stand_0', 'animal_duck_stand_0')):
        actor(frame(nimg, nm['frames'][a]), 82 + i * 18, 196, 'small')
    for i, e in enumerate(('ink_slime_0', 'bookmite_0', 'page_wraith_0', 'briar_wolf_0', 'tome_golem_0', 'echo_warden_0')):
        r = ef['frames'][e]
        actor(frame(efimg, r), 170 + i * 30, 208, 'small' if r[2] <= 16 else 'medium')
    for by, fn in sorted(objs, key=lambda t: t[0]):
        fn()
    upscale(scr, 3).save(os.path.join(OUT, 'mock_field_3x.png'))

    # ---------------------------------------------------------------- battle
    env = load_src('environments.png')
    Hs, Ws = env.shape[:2]
    cell = env[0:Hs // 4, 0:Ws // 2]
    bg = box_resize(cell, W, int(cell.shape[0] * W / cell.shape[1]))
    bg = bg[:H] if bg.shape[0] >= H else np.pad(bg, ((0, H - bg.shape[0]), (0, 0), (0, 0)))
    bg[..., 3] = 1
    bg[140:, :, :3] *= 0.55
    eb, ebimg = atlas('enemies_battle')
    bb, bbimg = atlas('bosses_battle')
    pb, pbimg = atlas('party_battle')
    scr = bg.copy()
    for (eid, cx, by) in (('briar_wolf', 70, 150), ('ink_slime', 40, 180), ('page_wraith', 130, 168)):
        r = eb['frames'][eid]
        shadow(scr, mi, mimg, 'large', cx, by)
        put_feet(scr, frame(ebimg, r), cx, by)
    for i, (n, cx, by) in enumerate((('hero_sword_ready', 268, 140), ('mira_staff_idle_0', 296, 160), ('bram_spear_idle_0', 324, 180))):
        shadow(scr, mi, mimg, 'medium', cx, by)
        r = pb['frames'][n]
        paste(scr, frame(pbimg, r), cx - pb['origin'][0], by - pb['origin'][1])
    upscale(scr, 3).save(os.path.join(OUT, 'mock_battle_3x.png'))

    scr = bg.copy()
    r = bb['frames']['archivore']
    shadow(scr, mi, mimg, 'huge', 90, 186)
    put_feet(scr, frame(bbimg, r), 90, 182)
    for i, n in enumerate(('lost_page_0', 'lost_page_1')):
        put_feet(scr, frame(bbimg, bb['frames'][n]), 170, 70 + i * 50)
    for i, (n, cx, by) in enumerate((('hero_sword_strike', 268, 140), ('mira_cast', 296, 160), ('bram_defend', 324, 180))):
        shadow(scr, mi, mimg, 'medium', cx, by)
        rr = pb['frames'][n]
        paste(scr, frame(pbimg, rr), cx - pb['origin'][0], by - pb['origin'][1])
    upscale(scr, 3).save(os.path.join(OUT, 'mock_boss_3x.png'))

    # ---------------------------------------------------------------- dialogue
    po, poimg = atlas('portraits')
    scr = grass(W, H, 5)
    win_top = np.array(hex2rgb(P.color('ui_blue:2')), np.float32) / 255
    win_bot = np.array(hex2rgb(P.color('ui_blue:1')), np.float32) / 255
    edge = np.array(hex2rgb(P.color('ui_blue:5')), np.float32) / 255
    for k, pid in enumerate(('hero', 'mira', 'bram', 'mael', 'tess', 'iris', 'garrick', 'hazel')):
        x0, y0 = 4 + (k % 2) * 190, 4 + (k // 2) * 53
        for y in range(y0, y0 + 50):
            t = (y - y0) / 50
            scr[y, x0:x0 + 186, :3] = win_top * (1 - t) + win_bot * t
        scr[y0, x0:x0 + 186, :3] = edge; scr[y0 + 49, x0:x0 + 186, :3] = edge
        scr[y0:y0 + 50, x0, :3] = edge; scr[y0:y0 + 50, x0 + 185, :3] = edge
        r = po['frames'][pid + '_48']
        paste(scr, frame(poimg, r), x0 + 1, y0 + 1)
        r = po['frames'][pid + '_32']
        paste(scr, frame(poimg, r), x0 + 60, y0 + 9)
    upscale(scr, 3).save(os.path.join(OUT, 'mock_dialog_3x.png'))


if __name__ == '__main__':
    render()
