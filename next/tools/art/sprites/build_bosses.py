"""Boss battle sprites -> assets/sprites/bosses_battle.png/.json: archivore, echo_warden, lost_page (3 frames)"""
import os
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
from build_portraits import harmonize
import cleanup as CL


def harmonize_img(d, de=0.04):
    cols = np.unique(d[d[..., 3] > 0.5][:, :3], axis=0)
    hp = harmonize(cols, de)
    for c0, c1 in zip(cols, hp):
        m = np.all(np.abs(d[..., :3] - c0) < 1e-4, -1) & (d[..., 3] > 0.5)
        d[m, :3] = c1
    return d


def pix_obj(obj, tw=None, th=None, k=18, strength=0.55):
    """downscale, quantize to k, snap to the master palette, majority-despeckle, ramp-darkest outline (C8)"""
    tw, th = fit_size(obj, th=th, tw=tw)
    d, pal = pixelize2(obj, tw, th, k=k, sharpen=0.0, max_de=0.10, ring=False)
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 8)
    return CL.ramp_outline(big)


def archivore():
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 0), keep_frac=0.02, max_dist=30)
    print('archivore src', obj.shape)
    a = pix_obj(obj, tw=146, k=22)
    # W5-art (CRITIQUE_2 item 4): the root-black lower body (tentacles under the eye) gets its darkest fill
    # lifted one step and a 1 px violet rim light on its upper-left edges, so it separates from battle_boss
    H = a.shape[0]
    lower = np.zeros(a.shape[:2], bool)
    lower[int(H * 0.5):, :] = True
    a = CL.lift_darkest(a, 'shadow', mask=lower)
    a = CL.rim_light(a, prefer=('hair_violet', 'shadow', 'wood', 'earth'), mask=lower,
                     lift={'hair_violet': 4, 'shadow': 3, 'wood': 3, 'earth': 3})
    return a


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
    origin = {n: [r[2] // 2, r[3] - 1] for n, r in rects.items()}
    anims = {'lost_page_flutter': {'frames': ['lost_page_0', 'lost_page_1', 'lost_page_2', 'lost_page_1'], 'fps': 8, 'loop': True}}
    # W6-anim: derived frames packed under the base frames (the base rects never move)
    import anim_frames as AF, anim_atlas as AA
    derived = []
    for bid, fr in (('archivore', AF.archivore_frames(a)), ('echo_warden', AF.echo_warden_frames(w)), ('lost_page', AF.lost_page_frames(lp[1]))):
        derived += [(f'{bid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    sheet, rects, origin = AA.append(sheet, rects, origin, derived)
    for bid in ('archivore', 'echo_warden', 'lost_page'):
        anims.update(AA.enemy_anims(bid, rects))
    for st in ('mirror', 'bulwark'):
        anims[f'echo_warden_{st}_idle'] = {'frames': [f'echo_warden_{st}', f'echo_warden_{st}_idle_1'], 'fps': AA.IDLE_FPS, 'loop': True}
    # E2-sprites: the Nameless King, veiled and unmasked (ep2_king.py), base + derived, in a block under the rest
    import ep2_king as K
    sheet, rects, origin = AA.append(sheet, rects, origin, K.atlas_frames())
    for bid in ('nameless_king', 'nameless_king_unmasked'):
        anims.update(AA.enemy_anims(bid, rects))
    # E3-sprites: the Cinder Warden's three looks (ep3_warden.py), base + derived, in a block under the rest
    import ep3_warden as WD
    sheet, rects, origin = AA.append(sheet, rects, origin, WD.atlas_frames())
    for bid in WD.IDS:
        anims.update(AA.enemy_anims(bid, rects))
    AA.save_indexed(sheet, os.path.join(DST, 'bosses_battle.png'))
    meta = {'image': 'bosses_battle.png',
            'frames': rects,
            'origin': origin,
            'aliases': {'lost_page': 'lost_page_1'},
            'anims': anims,
            'notes': 'Battle sprites face RIGHT (toward the party). origin = bottom-centre, per frame in `origin`. Derived frames (W6-anim): archivore_{idle_1,attack,hurt,cast,devour,die_0..2}; echo_warden_{idle_1,attack,hurt,cast,die_0..2} plus the stance frames echo_warden_mirror / echo_warden_bulwark, each with _idle_1, _attack, _hurt, _cast (echo_warden_mirror_attack ...); lost_page_die_0..2. Draw every frame by its own origin. E2-sprites: nameless_king (veiled: a glass veil in the hood) and nameless_king_unmasked (phase 3: the tired grey-bearded face), each with _idle_1, _attack (the glass sword raised), _hurt, _cast (crown and shards glow: Keeping, Mirror Rain, Cold Mirror), _die_0..2; 1x inside the 160x144 boss cell. E3-sprites: the Cinder Warden in three looks, cinder_warden (Tempered Iron), cinder_warden_molten (Molten Shell, with its heat halo) and cinder_warden_quenched (Quenched Core, the hammer-head a bell clapper), each with _idle_1, _attack (the hammer raised), _hurt, _cast (Stoke / Strike the Name / Last Hammer: seams and sparks), _die_0..2 (ember dissolve); ep3_warden.py, 1x, untinted, about 153 x 141 including the halo room (origin per frame).'}
    write_json(os.path.join(DST, 'bosses_battle.json'), meta)
    contact(frames, os.path.join(OUT, 'bosses_battle_4x.png'), scale=4, cols=5, title='bosses_battle at 4x')
    contact([(n, f) for n, f in frames if n.startswith('lost')], os.path.join(OUT, 'lost_page_8x.png'), scale=8, cols=3)
    wb = WD.base()
    contact([('echo_warden', w)] + list(wb.items()), os.path.join(OUT, 'bosses_battle_ep3_3x.png'), scale=3, cols=4, bg=(34, 28, 30), title='Episode 3 boss looks at 3x, with the Echo Warden')
    kb = K.build()
    contact([('echo_warden', w)] + [(k, kb[k]) for k in ('nameless_king', 'nameless_king_unmasked')],
            os.path.join(OUT, 'bosses_battle_ep2_4x.png'), scale=4, cols=3, title='Episode 2 boss at 4x, with the Echo Warden')
    return meta


if __name__ == '__main__':
    build()
