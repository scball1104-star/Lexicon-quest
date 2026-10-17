"""Boss battle sprites -> assets/sprites/bosses_battle.png/.json: archivore, echo_warden, lost_page (3 frames)"""
import os
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
from build_portraits import harmonize


def harmonize_img(d, de=0.04):
    cols = np.unique(d[d[..., 3] > 0.5][:, :3], axis=0)
    hp = harmonize(cols, de)
    for c0, c1 in zip(cols, hp):
        m = np.all(np.abs(d[..., :3] - c0) < 1e-4, -1) & (d[..., 3] > 0.5)
        d[m, :3] = c1
    return d


def pix_obj(obj, tw=None, th=None, k=18, strength=0.55):
    tw, th = fit_size(obj, th=th, tw=tw)
    d, pal = pixelize2(obj, tw, th, k=k, sharpen=0.0, max_de=0.10, ring=False)
    d = harmonize_img(d)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 8)
    return outline(big, mode='outer', strength=strength)


def archivore():
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 0), keep_frac=0.02, max_dist=30)
    print('archivore src', obj.shape)
    return pix_obj(obj, tw=146, k=22)


def echo_warden():
    src = load_src('enemies.png')
    obj = main_object(grid_cell(src, 4, 2, 5), keep_frac=0.05, max_dist=20)
    print('warden src', obj.shape)
    return flip_x(pix_obj(obj, th=96, k=18))


def lost_page_frames():
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars'))
    import lost_page as LP
    leg = P.resolve(LP.PAL, 'lost_page')
    base = parse_grid(grid_from_text(LP.BASE), leg)
    H, W = base.shape[:2]
    frames = []
    for amp, bob, shade in ((-4, -1, 0.0), (0, 0, 0.0), (3, 1, 0.18)):
        f = blank(W, H)
        for x in range(W):
            d = abs(x - 12.5)
            dy = 0
            if d > 3:
                dy = int(round(amp * ((d - 3) / 9.5) ** 1.4))
            col = base[:, x].copy()
            if shade and d > 3:
                col[..., :3] = np.where(col[..., 3:4] > 0, col[..., :3] * (1 - shade * min(1, (d - 3) / 9)), 0)
            for y in range(H):
                yy = y + dy + bob
                if 0 <= yy < H and col[y, 3] > 0:
                    f[yy, x] = col[y]
        frames.append(f)
    return frames


def build():
    a = archivore(); w = echo_warden(); lp = lost_page_frames()
    frames = [('archivore', a), ('echo_warden', w)] + [(f'lost_page_{i}', f) for i, f in enumerate(lp)]
    sh = Shelf(256, pad=2)
    for n, f in frames:
        sh.add(n, f)
    sheet, rects = sh.render()
    rects['lost_page'] = rects['lost_page_1']
    save_png(sheet, os.path.join(DST, 'bosses_battle.png'))
    meta = {'image': 'bosses_battle.png',
            'frames': rects,
            'origin': {n: [r[2] // 2, r[3] - 1] for n, r in rects.items()},
            'aliases': {'lost_page': 'lost_page_1'},
            'anims': {'lost_page_flutter': {'frames': ['lost_page_0', 'lost_page_1', 'lost_page_2', 'lost_page_1'], 'fps': 8, 'loop': True}},
            'notes': 'Battle sprites face RIGHT (toward the party). origin = bottom-centre. Idle motion is procedural in code.'}
    write_json(os.path.join(DST, 'bosses_battle.json'), meta)
    contact(frames, os.path.join(OUT, 'bosses_battle_4x.png'), scale=4, cols=5, title='bosses_battle at 4x')
    contact([(n, f) for n, f in frames if n.startswith('lost')], os.path.join(OUT, 'lost_page_8x.png'), scale=8, cols=3)
    return meta


if __name__ == '__main__':
    build()
