"""The Sand Oracle (E5-sprites): three battle looks from ../assets/art/bosses.png cell 4 at 1x inside the 160 x 144 boss
cell (the painting: a golden celestial scorpion seen from the front, its tail curled over from the left with the
stinger toward the party, claws either side, a starfield showing between the plates). Not flipped: the stinger already
points right, at the party.

  oracle          The Read Sky: as painted, the starfield given its stars, and the mask (an ivory face with two dark eye
                  slits and the lapis jewel on its brow) on the head: the one bright place
  oracle_futures  False Futures: the same, a ring of drifting sand around it (behind the body, in front at its feet),
                  the mask cracked through
  oracle_true     The True Horizon: the head plates split open, the starfield body bright and thick with stars, the mask
                  gone and a face of stars where it was (two star eyes, a mouth of small stars, faint constellation lines)

Focal point (CRITIQUE_4 item 15): every look has ONE brightest place, the face. The gold is held to five steps and the
starfield to three plus its stars, so the body reads as two materials at phone size. Contrast rule as ep5_enemies.py: a
dark outline and a gold rim (the Oracle is a sun foe).

    base()          -> {id: rgba}              facing RIGHT (the stinger), origin bottom-centre
    atlas_frames()  -> [(name, rgba, ox, oy)]
    avatar()        -> {'oracle_avatar': [f0, f1], 'oracle_avatar_back': [f0, f1]}  the field avatar, 2-frame idle
"""
import numpy as np
from scipy import ndimage as ndi
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import cleanup as CL
import anim_frames as AF
from hollow_enemies import col
from ep2_enemies import gmap, lch_img, stamp
import ep5_enemies as E5

TH = 116
IDS = ['oracle', 'oracle_futures', 'oracle_true']
PADX = 10          # room for the sand ring on each side
PADT = 6
HEAD = (66, 62)    # the head's centre on the 116 px cut (painting coordinates, before padding)

GOLD = [(0.0, 'wood:0'), (0.16, 'wood:1'), (0.34, 'wood:3'), (0.52, 'gold:2'), (0.7, 'gold:3'), (0.86, 'gold:4'),
        (1.0, 'gold:5')]
SKY = [(0.0, 'shadow:0'), (0.4, 'ink:1'), (0.75, 'ink:2'), (1.0, 'ink:3')]
SKY_BRIGHT = [(0.0, 'ink:2'), (0.3, 'ink:3'), (0.6, 'cloth_blue:2'), (0.85, 'cloth_blue:3'), (1.0, 'ink:4')]


def cut():
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 4), keep_frac=0.02, max_dist=60)
    tw, th = fit_size(obj, th=TH)
    d, _ = pixelize2(obj, tw, th, k=16, sharpen=0.0, max_de=0.10, ring=False)
    return d


def masks(d):
    m, L, C, h = lch_img(d)
    sky = m & (((h > 220) & (h < 320) & (C > 0.025)) | (L < 0.24)) & (L < 0.5)
    sky = ndi.binary_opening(sky, iterations=1) | (sky & (L < 0.2))
    gold = m & ~sky
    return m, L, sky, gold


def recolour(d, look):
    m, L, sky, gold = masks(d)
    a = gmap(d, gold, GOLD, gamma=1.05)
    a = gmap(a, sky, SKY_BRIGHT if look == 'true' else SKY, gamma=1.0)
    return a, sky


def clean(d):
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    d = CL.majority_despeckle(d, passes=3, max_de=0.14, max_island=4)
    return d


def pad(d, sky):
    H, W = d.shape[:2]
    big = blank(W + 2 + 2 * PADX, H + 2 + PADT)
    big[1 + PADT:-1, 1 + PADX:-1 - PADX] = d
    sk = np.zeros(big.shape[:2], bool)
    sk[1 + PADT:-1, 1 + PADX:-1 - PADX] = sky
    big = drop_specks(big, 8)
    return CL.ramp_outline(big), sk


def put(a, x, y, ref):
    H, W = a.shape[:2]
    x, y = int(x), int(y)
    if 0 <= y < H and 0 <= x < W:
        a[y, x, :3] = col(ref); a[y, x, 3] = 1


def stars(a, sky, n, seed, cross, min_gap=4):
    """stars in the starfield: single white, pale blue and gold points, the first `cross` of them four-point stars"""
    rng = np.random.RandomState(seed)
    inner = ndi.binary_erosion(sky, iterations=1) & (a[..., 3] > 0.5)
    ys, xs = np.nonzero(inner)
    placed = []
    for i in rng.permutation(len(ys)):
        y, x = ys[i], xs[i]
        if any(abs(x - px) < min_gap and abs(y - py) < min_gap for px, py in placed):
            continue
        k = len(placed)
        if k < cross:
            put(a, x, y, 'metal:4')
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if inner[y + dy, x + dx]:
                    put(a, x + dx, y + dy, 'ice:2')
        else:
            put(a, x, y, ('metal:4', 'ice:3', 'gold:4', 'ice:2')[k % 4])
        placed.append((x, y))
        if len(placed) >= n:
            break
    return a


MASK = ['......kkkk......',
        '....kkYYYYkk....',
        '...kYgkJJkgYk...',
        '..kWWWkjjkWWWk..',
        '.kWWWWWkkWWWWwk.',
        '.kWWWWWWWWWWwwk.',
        'kWkkkkWWWWkkkkwk',
        'kWkEEkkWWkkEEkwk',
        'kWwkkkWWWWkkkwwk',
        'kWWWWWWWWWWwwwwk',
        '.kWWWWWwwwwwwwk.',
        '.kWWWWkkkkwwwwk.',
        '..kWWwwwwwwwwk..',
        '...kkwwwwwwkk...',
        '.....kkkkkk.....']
MASK_LEG = {'k': 'wood:0', 'W': 'metal:4', 'w': 'stone_warm:5', 'Y': 'gold:4', 'g': 'gold:2', 'J': 'water:4',
            'j': 'cloth_blue:3', 'E': 'gold:4'}
CRACK = [(11, 2), (11, 3), (10, 4), (10, 5), (9, 6), (9, 7), (8, 8), (8, 9), (7, 10), (7, 11), (6, 12), (6, 13)]


def mask(a, cx, cy, cracked=False):
    x0, y0 = cx - 8, cy - 7
    a = stamp(a, MASK, MASK_LEG, x0, y0)
    if cracked:
        for (dx, dy) in CRACK:
            put(a, x0 + dx, y0 + dy, 'shadow:0')
            put(a, x0 + dx + 1, y0 + dy, 'stone_warm:3')          # the lit lip of the crack
        # the broken piece has slipped a pixel: its lower edge shows the dark under it
        for (dx, dy) in ((7, 12), (8, 12), (9, 12), (10, 12)):
            put(a, x0 + dx, y0 + dy, 'shadow:0')
    return a


def sand_ring(a, centre, front):
    """False Futures: a ring of drifting sand round the Oracle, an ellipse of grains thick at the sides and thin at the
    ends; the far half is drawn only where it does not cover the body, the near half (front=True) over it"""
    H, W = a.shape[:2]
    out = a.copy()
    op = a[..., 3] > 0.5
    cx, cy = centre
    rx, ry = W * 0.48, H * 0.15
    rng = np.random.RandomState(31)
    refs = ['sand:3', 'sand:2', 'path:4', 'path:2', 'wood:3', 'sand:3']     # lit grains and shadowed ones, so it reads on sand and night
    for i in range(1500):
        t = rng.rand() * 2 * np.pi
        r = 1.0 + rng.randn() * 0.06
        x = int(round(cx + rx * r * np.cos(t)))
        y = int(round(cy + ry * r * np.sin(t) + rng.randn() * 1.3))
        near = np.sin(t) > 0
        if near != front or not (0 <= x < W and 0 <= y < H):
            continue
        dens = (0.3 + 0.6 * abs(np.cos(t))) * (0.45 if front else 1.0)    # thicker at the sides, thin across its feet
        if rng.rand() > dens:
            continue
        if not front and op[y, x]:
            continue
        ref = refs[int(rng.rand() * len(refs))]
        out[y, x, :3] = col(ref); out[y, x, 3] = 1
        if rng.rand() < 0.3 and 0 <= x + 1 < W:                 # a streak along the drift
            out[y, x + 1 if np.sin(t) > 0 else x - 1, :3] = col('sand:2'); out[y, x + 1 if np.sin(t) > 0 else x - 1, 3] = 1
    return out


def split_open(a, sky, cx, cy):
    """The True Horizon: the head plates part. A ragged almond opening over the head shows the starfield at its
    brightest (pale at the centre, deep at the lips), the plates' broken lips catching light"""
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    ang = np.arctan2(ys + 0.5 - cy, xs + 0.5 - cx)
    rag = 1.0 + 0.09 * np.sin(ang * 7.0) + 0.05 * np.sin(ang * 13.0 + 1.0)
    rx, ry = 11.0, 12.5
    d = np.hypot((xs + 0.5 - cx) / rx, (ys + 0.5 - cy) / ry) / rag
    hole = (d <= 1.0) & (a[..., 3] > 0.5)
    for y, x in zip(*np.nonzero(hole)):
        t = d[y, x]
        ref = E5.ramp_at(['cloth_blue:3', 'ink:3', 'ink:2', 'ink:1'], min(1.0, t * 1.05), x, y)
        put(a, x, y, ref)
    lip = ndi.binary_dilation(hole, iterations=1) & ~hole & (a[..., 3] > 0.5)
    for y, x in zip(*np.nonzero(lip)):
        put(a, x, y, 'gold:5' if (x + y < cx + cy) else 'gold:2')
    sky |= hole
    return a, sky


FACE = ['..o.......o..',
        '.oEo.....oEo.',
        '..o.l...l.o..',
        '.....l.l.....',
        '......N......',
        '......l......',
        '......l......',
        '....m.l.m....',
        '......M......']
FACE_LEG = {'E': 'metal:4', 'o': 'ice:3', 'l': 'ink:4', 'N': 'metal:4', 'm': 'gold:4', 'M': 'gold:5'}


def star_face(a, cx, cy):
    """a face made of stars where the mask was: two bright four-point star eyes, a nose star, a mouth of small gold
    stars, joined by faint constellation lines"""
    return stamp(a, FACE, FACE_LEG, cx - 6, cy - 6)


_CACHE = {}


def head_xy():
    return HEAD[0] + 1 + PADX, HEAD[1] + 1 + PADT


def build():
    if _CACHE:
        return _CACHE
    d0 = cut()
    for look, bid in (('read', 'oracle'), ('futures', 'oracle_futures'), ('true', 'oracle_true')):
        d, sky = recolour(d0, look)
        d = clean(d)
        a, sk = pad(d, sky)
        cx, cy = head_xy()
        if look == 'true':
            a = stars(a, sk, 70, 21, 12, min_gap=3)
            a, sk = split_open(a, sk, cx, cy)
            a = star_face(a, cx, cy)
        else:
            a = stars(a, sk, 34, 21, 5)
            a = mask(a, cx, cy, cracked=(look == 'futures'))
        a = E5.contrast(a, 'sun')
        if look == 'futures':
            # the grains are drawn after the contrast rule: loose sand takes no outline
            centre = (a.shape[1] / 2, a.shape[0] * 0.6)
            a = sand_ring(a, centre, front=False)
            a = sand_ring(a, centre, front=True)
        _CACHE[bid] = a
    return _CACHE


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames
def recipe(img, look):
    """idle_1 the body rises a pixel and the tail lifts; attack the tail strikes down toward the party and the body
    leans in; hurt the recoil; cast the face and the stars flare and star sparks rise"""
    H, W = img.shape[:2]
    a = AF.canvas(img)
    I = lambda v: int(round(v))
    out = {}
    ox, oy = PADX + 1, PADT + 1
    tail = AF.m_poly(a, [(ox + 52, 0), (W, 0), (W, oy + 38), (ox + 70, oy + 40), (ox + 50, oy + 22)])
    pivot = AF.cp(ox + 54, oy + 12)
    seam = I(H * 0.55)
    f = AF.rise(a, seam)
    out['idle_1'] = AF.move(f, tail, pivot, angle=-3, keep=True)
    f = AF.move(a, tail, pivot, angle=16, keep=True)
    out['attack'] = AF.lean(f, seam, 4, taper=I(H * 0.35))
    g = AF.lean(a, seam, -3, taper=I(H * 0.35))
    g, dox = AF.squash(g, (I(H * 0.3), I(H * 0.6)), (I(W * 0.3), I(W * 0.7)))
    out['hurt'] = (AF.edge_lift(g, 2, prefer=('gold', 'wood', 'ink', 'shadow')), dox)
    m, L, C, h = lch_img(a)
    hot = m & ((L > 0.86) | ((h > 200) & (h < 300) & (L > 0.6)))
    f = AF.glow(a, hot, 'ice' if look == 'true' else 'gold', 0.6, 1)
    out['cast'] = AF.sparkles(f, [(I(W * 0.5), -4, 2), (I(W * 0.6), 0, 1), (I(W * 0.38), -7, 1), (I(W * 0.72), 4, 2),
                                   (I(W * 0.22), 12, 1), (I(W * 0.85), 18, 1), (I(W * 0.46), -10, 1)],
                              ['metal:4', 'ice:3', 'gold:5'])
    return out


def derived(bid, img):
    look = {'oracle': 'read', 'oracle_futures': 'futures', 'oracle_true': 'true'}[bid]
    return E5.pack5(bid, img, recipe(img, look))


def frames_of(bid):
    img = build()[bid]
    H, W = img.shape[:2]
    fr = derived(bid, img)
    return [(bid, img, W // 2, H - 1)] + [(f'{bid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]


def atlas_frames():
    out = []
    for bid in IDS:
        out += frames_of(bid)
    return out


# ----------------------------------------------------------------------------- the field avatar
AV_H = 44
AV_MASK = ['.kkkk.',
           'kWJJWk',
           'kEWWEk',
           '.kwwk.',
           '..kk..']


def avatar():
    """oracle_avatar (front) and oracle_avatar_back at map scale: a second cut of the painting at 44 px (never a resample
    of the battle frame), its starfield given stars, the small mask on the head (front), a gold carapace seam over it
    (back, the painting mirrored so the tail curls the other way). Frame 1 lifts the tail a pixel."""
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 4), keep_frac=0.02, max_dist=60)
    tw, th = fit_size(obj, th=AV_H)
    d, _ = pixelize2(obj, tw, th, k=12, sharpen=0.0, max_de=0.10, ring=False)
    m, L, sky, gold = masks(d)
    d = gmap(d, gold, GOLD, gamma=1.05)
    d = gmap(d, sky, SKY)
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.04)
    big = blank(tw + 2, th + 3)
    big[2:-1, 1:-1] = d
    sk = np.zeros(big.shape[:2], bool)
    sk[2:-1, 1:-1] = sky
    big = drop_specks(big, 3)
    big = CL.ramp_outline(big)
    big = stars(big, sk, 8, 5, 0, min_gap=4)
    hx = int(round(HEAD[0] * th / TH)) + 1
    hy = int(round(HEAD[1] * th / TH)) + 2
    front = stamp(big.copy(), AV_MASK, MASK_LEG, hx - 3, hy - 2)
    back = big[:, ::-1].copy()
    bx = back.shape[1] - 1 - hx
    for y in range(hy - 3, hy + 3):
        for x in range(bx - 2, bx + 3):
            if back[y, x, 3] > 0.5:
                put(back, x, y, 'gold:3' if x != bx else 'wood:1')
    out = {}
    for name, img in (('oracle_avatar', front), ('oracle_avatar_back', back)):
        f0 = E5.side_rim(E5.dark_outline(img), 'sun', right=True)
        f1 = f0.copy()
        H, W = f0.shape[:2]
        # frame 1: the upper body (tail and head) lifts a pixel, the legs stay planted
        cut_y = int(H * 0.7)
        f1[:cut_y - 1] = f0[1:cut_y]
        f1[cut_y - 1] = f0[cut_y - 1]
        out[name] = [f0, f1]
    return out


if __name__ == '__main__':
    import os
    os.makedirs(os.path.join(OUT, 'ep5'), exist_ok=True)
    b = base()
    for bg, tag in (((228, 196, 140), 'sand'), ((18, 16, 40), 'night')):
        contact(list(b.items()), os.path.join(OUT, 'ep5', f'oracle_looks_3x_{tag}.png'), scale=3, cols=3, bg=bg,
                title='The Sand Oracle: The Read Sky, False Futures, The True Horizon (3x)')
    av = avatar()
    items = [(f'{k}_{i}', v) for k, fr in av.items() for i, v in enumerate(fr)]
    contact(items, os.path.join(OUT, 'ep5', 'oracle_avatar_6x.png'), scale=6, cols=4, bg=(60, 52, 70))
