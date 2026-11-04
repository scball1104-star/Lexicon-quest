"""The Paper Regent (E4-sprites): three battle looks from ../assets/art/bosses.png cell 3 at 1x inside the 160 x 144
boss cell (the painting: a drowned royal figure in turquoise robes wound with paper scrolls, a golden crown over a
dark hood, a golden trident). Flipped so the trident is on the party's side.

  paper_regent          Forged Edicts: the painting in a darker, colder turquoise, red wax seals pressed all over the
                        scroll bands (the forged orders it keeps sealing)
  paper_regent_ward     Royal Ward: the same figure inside a pale halo of floating writs (small sealed sheets circling
                        its head and shoulders), the scroll bands glowing faintly
  paper_regent_charter  The True Charter: the robes unrolled to bare vellum, the seals washed off, the crown paper, the
                        trident a pen (a long ink quill with a steel nib)

Focal point (CRITIQUE_4 item 15): every look has ONE brightest place, the face under the crown (two lit eyes in the
hood's dark), and the body is held to a few value groups per material so it reads at phone size.

    base()          -> {id: rgba}              facing RIGHT, origin bottom-centre
    atlas_frames()  -> [(name, rgba, ox, oy)]
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

TH = 132
IDS = ['paper_regent', 'paper_regent_ward', 'paper_regent_charter']
PADX = 8          # room for the ward's floating writs on each side
PADT = 8


def cut():
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 3), keep_frac=0.02, max_dist=60)
    tw, th = fit_size(obj, th=TH)
    d, _ = pixelize2(obj, tw, th, k=16, sharpen=0.0, max_de=0.10, ring=False)
    return flip_x(d)


def trident_zone(H, W):
    """the trident (post-flip): its head in the upper right and its shaft, a 4 px band down to the hem"""
    ys, xs = np.mgrid[0:H, 0:W]
    head = (xs > W * 0.68) & (ys < H * 0.46)
    x0, y0, x1, y1 = W * 0.86, H * 0.4, W * 0.56, H * 1.0
    t = np.clip(((xs - x0) * (x1 - x0) + (ys - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2), 0, 1)
    dd = np.hypot(xs - (x0 + t * (x1 - x0)), ys - (y0 + t * (y1 - y0)))
    return head | ((dd < 2.6) & (ys > H * 0.4))


def trident_mask(d):
    m, L, C, h = lch_img(d)
    H, W = d.shape[:2]
    return m & (h > 45) & (h < 120) & (C > 0.04) & (L < 0.72) & trident_zone(H, W)


def masks(d):
    m, L, C, h = lch_img(d)
    teal = m & (h > 160) & (h < 250) & (C > 0.035)
    H, W = d.shape[:2]
    hue = m & (h > 45) & (h < 120) & (C > 0.04) & (L < 0.72) & ~teal
    ys, xs = np.mgrid[0:H, 0:W]
    crown_box = (ys < H * 0.25) & (xs > W * 0.33) & (xs < W * 0.68)
    gold = hue & (crown_box | trident_zone(H, W))
    paper = m & ~teal & ~gold & (L > 0.55)
    dark = m & ~teal & ~gold & ~paper
    teal = ndi.binary_closing(teal, iterations=1) & m & ~gold
    paper &= ~teal
    return m, L, teal, gold, paper, dark


def recolour(d, look):
    m, L, teal, gold, paper, dark = masks(d)
    if look == 'charter':
        robe = [(0.0, 'shadow:1'), (0.14, 'stone_warm:1'), (0.32, 'stone_warm:2'), (0.52, 'path:2'), (0.72, 'path:3'),
                (0.88, 'sand:2'), (1.0, 'sand:3')]
        band = [(0.0, 'stone_warm:2'), (0.4, 'stone_warm:3'), (0.75, 'stone_warm:4'), (1.0, 'stone_warm:5')]
        gl = [(0.0, 'stone_warm:2'), (0.5, 'stone_warm:4'), (1.0, 'metal:4')]
    else:
        robe = [(0.0, 'shadow:0'), (0.12, 'foliage_dark:0'), (0.26, 'foliage_dark:1'), (0.4, 'roof_green:2'),
                (0.56, 'roof_green:3'), (0.72, 'magic_cyan:1'), (0.88, 'magic_cyan:2'), (1.0, 'magic_cyan:3')]
        band = [(0.0, 'stone_warm:1'), (0.3, 'stone_warm:2'), (0.6, 'stone_warm:3'), (0.85, 'stone_warm:4'),
                (1.0, 'stone_warm:5')]
        gl = [(0.0, 'wood:1'), (0.25, 'wood:3'), (0.5, 'gold:2'), (0.75, 'gold:3'), (1.0, 'gold:4')]
    a = gmap(d, teal, robe, gamma=1.15 if look != 'charter' else 0.9)
    a = gmap(a, paper, band, gamma=1.1)
    a = gmap(a, gold, gl)
    a = gmap(a, dark, [(0.0, 'shadow:0'), (0.5, 'ink:1'), (1.0, 'shadow:2')] if look != 'charter' else
             [(0.0, 'shadow:0'), (0.5, 'stone_warm:1'), (1.0, 'stone_warm:2')])
    return a


def clean(d):
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    d = CL.majority_despeckle(d, passes=3, max_de=0.14, max_island=4)
    return d


def pad(d):
    H, W = d.shape[:2]
    big = blank(W + 2 + 2 * PADX, H + 2 + PADT)
    big[1 + PADT:-1, 1 + PADX:-1 - PADX] = d
    big = drop_specks(big, 8)
    return CL.ramp_outline(big)


def put(a, x, y, ref):
    H, W = a.shape[:2]
    if 0 <= y < H and 0 <= x < W:
        a[y, x, :3] = col(ref); a[y, x, 3] = 1


def face(a, look):
    """the focal point: the hood's dark void under the crown with two lit eyes and a faint glow under them. The void
    is found as the largest dark component in the head box."""
    H, W = a.shape[:2]
    L = a[..., :3].max(-1)
    box = np.zeros((H, W), bool)
    box[int(H * 0.12):int(H * 0.34), int(W * 0.25):int(W * 0.62)] = True
    dark = box & (L < 0.22) & (a[..., 3] > 0.5)
    lab, k = ndi.label(dark)
    if not k:
        return a, (W // 2, int(H * 0.22))
    sizes = ndi.sum(dark, lab, range(1, k + 1))
    ys, xs = np.nonzero(lab == int(np.argmax(sizes)) + 1)
    cx, y0, h = int(round(xs.mean())), ys.min(), ys.max() - ys.min()
    ey = int(y0 + max(3, h * 0.42))
    eye = {'forged': ('magic_cyan:4', 'magic_cyan:2'), 'ward': ('ice:3', 'magic_cyan:3'),
           'charter': ('gold:5', 'gold:3')}[look]
    for x in (cx - 2, cx - 1, cx + 1, cx + 2):
        put(a, x, ey, eye[0]); put(a, x, ey + 1, eye[1])
    # the void's inner rim catches the eyes' light (one dim pixel line under the brow)
    for x in range(cx - 4, cx + 4):
        if 0 <= ey - 2 < H and dark[ey - 2, x] if 0 <= x < W else False:
            put(a, x, ey - 2, 'water:1' if look != 'charter' else 'stone_warm:1')
    return a, (cx, ey)


SEAL = ['.kkk.',
        'kRrrk',
        'krRrk',
        'krrrk',
        '.kkk.']


def seals(a, n=9, seed=12):
    """red wax seals pressed on the scroll bands: a 5 x 5 disc each, kept apart, only where a band is wide enough"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    band = (a[..., 3] > 0.5) & (L > 0.62) & (C < 0.07)
    band = ndi.binary_erosion(band, iterations=2)
    band[:int(H * 0.3)] = False
    ys, xs = np.nonzero(band)
    rng = np.random.RandomState(seed)
    order = rng.permutation(len(ys))
    placed = []
    leg = {'k': 'roof_red:1', 'R': 'roof_red:4', 'r': 'roof_red:3'}
    for i in order:
        y, x = ys[i], xs[i]
        if any(abs(x - px) < 13 and abs(y - py) < 11 for px, py in placed):
            continue
        a = stamp(a, SEAL, leg, x - 2, y - 2)
        put(a, x, y + 3, 'roof_red:2')            # a drip of wax
        placed.append((x, y))
        if len(placed) >= n:
            break
    return a


WRIT = ['kkkkkk',
        'kWWWWk',
        'kWiiWk',
        'kWWWWk',
        'kWiiWk',
        'kWrrWk',
        'kWrrWk',
        'kkkkkk']
WRIT_S = ['kkkkk',
          'kWWWk',
          'kWiWk',
          'kWWWk',
          'kWrWk',
          'kkkkk']


def ward_halo(a, centre):
    """Royal Ward: a ring of small floating writs (sealed sheets) on an ellipse round the head and shoulders, the
    rear ones dimmer, and a sparse pale dither of light inside the ring's outer edge"""
    H, W = a.shape[:2]
    cx, cy = centre
    out = a.copy()
    op = a[..., 3] > 0.5
    dist = ndi.distance_transform_edt(~op)
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
    ys, xs = np.mgrid[0:H, 0:W]
    for lo, hi, ref, dens in ((0.5, 1.6, 'magic_cyan:3', 0.7), (1.6, 3.0, 'magic_cyan:2', 0.35)):
        band = (dist > lo) & (dist <= hi) & ~op & (dens > bayer[ys % 4, xs % 4]) & (ys < H * 0.62)
        out[band, :3] = col(ref); out[band, 3] = 1
    rx, ry = W * 0.38, H * 0.16
    leg_f = {'k': 'stone_warm:2', 'W': 'metal:4', 'i': 'stone_warm:3', 'r': 'roof_red:3'}
    leg_b = {'k': 'stone_warm:1', 'W': 'stone_warm:4', 'i': 'stone_warm:2', 'r': 'roof_red:2'}
    for i, ang in enumerate(np.linspace(0, 2 * np.pi, 10, endpoint=False) + 0.2):
        x = int(round(cx + rx * np.cos(ang)))
        y = int(round(cy + 4 + ry * np.sin(ang)))
        front = np.sin(ang) > 0
        g = WRIT if (i % 2 == 0) else WRIT_S
        if not front:
            # behind the figure: only where it does not cover the body
            for j, row in enumerate(g):
                for k, ch in enumerate(row):
                    yy, xx = y + j, x + k
                    if ch != '.' and 0 <= yy < H and 0 <= xx < W and not op[yy, xx]:
                        out[yy, xx, :3] = col(leg_b[ch]); out[yy, xx, 3] = 1
        else:
            out = stamp(out, g, leg_f, x, y)
    return out


def pen(a, tri):
    """The True Charter: the trident's prongs are gone and its head is a steel nib with an ink drop, the shaft a dark
    quill. `tri` is the trident mask on the padded frame."""
    H, W = a.shape[:2]
    out = a.copy()
    if not tri.any():
        return out
    ys, xs = np.mgrid[0:H, 0:W]
    py, px = np.nonzero(tri)
    head_bottom = int(H * 0.31)
    # erase the prongs: everything in the trident's head box (nothing else of the figure reaches up there)
    prongs = (xs >= int(W * 0.68)) & (ys < head_bottom)
    out[prongs] = 0
    out = CL.ramp_outline(drop_specks(out, 4))
    q = tri & (ys >= head_bottom)
    if q.any():
        L = a[..., :3].max(-1)
        med = np.median(L[q])
        out[q & (L >= med), :3] = col('ink:3'); out[q & (L < med), :3] = col('ink:1')
        out[q, 3] = 1
    nib = ['...k...',
           '..kNk..',
           '.kMNmk.',
           '.kMkmk.',
           'kMNkmmk',
           'kMNkmmk',
           'kMNkmmk',
           '.kMkmk.',
           '.kMNmk.',
           '..kMmk.',
           '..kkkk.',
           '..kIIk.',
           '..kIik.',
           '...kk..']
    leg = {'k': 'shadow:0', 'M': 'metal:3', 'N': 'metal:4', 'm': 'stone_cool:4', 'I': 'ink:3', 'i': 'ink:2'}
    row = head_bottom
    xs_row = np.nonzero(tri[min(H - 1, row + 1)])[0]
    sx = int(round(xs_row.mean())) if len(xs_row) else int(px.mean())
    nx, ny = sx - 3, row - len(nib) + 2
    out = stamp(out, nib, leg, nx, ny)
    put(out, nx + 3, ny - 2, 'ink:3'); put(out, nx + 3, ny - 3, 'ink:2')
    return out


def paper_crown(a):
    """The True Charter: the gold crown (gold pixels in the head box) becomes folded paper with ink edges"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    ys, xs = np.mgrid[0:H, 0:W]
    crown = m & (ys < H * 0.22) & (xs > W * 0.3) & (xs < W * 0.66) & (h > 40) & (h < 120) & (C > 0.035)
    out = gmap(a, crown, [(0.0, 'stone_warm:2'), (0.4, 'stone_warm:4'), (0.8, 'stone_warm:5'), (1.0, 'metal:4')])
    return out


CROWN = ['.......Y.......',
         '..Y...kYk...Y..',
         '.kYk.kyYyk.kYk.',
         '.kyYkyYYYykYyk.',
         '.kyyYyyCyyYyyk.',
         'kdyyyyCCCyyyydk',
         'kdddyyyCyyydddk',
         'kGGGGGGGGGGGGGk',
         'kgCgggggggggCgk',
         'kgggggggggggggk',
         '.kkkkkkkkkkkkk.']


def crown(a, look, fc):
    """replace the painted crown (a spiky smear at this size) with a hand-pixeled one: five points, a lit band and
    a cyan jewel (paper with ink edges in the True Charter), its band resting just above the eyes"""
    H, W = a.shape[:2]
    cx, ey = fc
    x0, y0 = cx - 7, ey - 5 - len(CROWN) + 1
    m, L, C, h = lch_img(a)
    ys, xs = np.mgrid[0:H, 0:W]
    box = (xs >= x0 - 4) & (xs <= x0 + 18) & (ys < y0 + 4)
    warm = m & (((h > 30) & (h < 120) & (C > 0.035)) | (L > 0.5))
    a = a.copy()
    a[box & (warm | (ys < y0 + 1))] = 0
    side = (xs >= x0 - 6) & (xs <= x0 + 22) & (ys < y0 + 10) & m & (h > 20) & (h < 120) & (C > 0.03) & (L < 0.75)
    a[side] = 0
    a = CL.ramp_outline(drop_specks(a, 3))
    if look == 'charter':
        leg = {'Y': 'metal:4', 'y': 'stone_warm:5', 'd': 'stone_warm:3', 'k': 'stone_warm:1', 'G': 'stone_warm:5',
               'g': 'stone_warm:4', 'C': 'ink:3'}
    else:
        leg = {'Y': 'gold:4', 'y': 'gold:3', 'd': 'gold:2', 'k': 'wood:0', 'G': 'gold:4', 'g': 'gold:2', 'C': 'magic_cyan:3'}
    return stamp(a, CROWN, leg, x0, y0)


_CACHE = {}


def build():
    if _CACHE:
        return _CACHE
    d0 = cut()
    t0 = trident_mask(d0)
    tri = np.zeros((d0.shape[0] + 2 + PADT, d0.shape[1] + 2 + 2 * PADX), bool)
    tri[1 + PADT:-1, 1 + PADX:-1 - PADX] = t0
    for look, bid in (('forged', 'paper_regent'), ('ward', 'paper_regent_ward'), ('charter', 'paper_regent_charter')):
        d = recolour(d0, look)
        d = clean(d)
        if look == 'charter':
            d = paper_crown(d)
        a = pad(d)
        if look == 'charter':
            a = pen(a, tri)
            a = CL.ramp_outline(a)
        if look in ('forged', 'ward'):
            a = seals(a)
        a, fc = face(a, look)
        a = crown(a, look, fc)
        if look == 'ward':
            a = ward_halo(a, fc)
        a = rim(a, look)
        _CACHE[bid] = a
    return _CACHE


def rim(a, look):
    from ep3_enemies import rim as _rim
    spec = {'rim': dict(left='magic_cyan:2' if look != 'charter' else 'stone_warm:3',
                        top='magic_cyan:3' if look != 'charter' else 'stone_warm:4', max_L=0.4)}
    return _rim(a, spec)


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames
def recipe(img, prefer, glow_ref='magic_cyan', cast_spark=('magic_cyan:3', 'magic_cyan:4', 'metal:4')):
    """idle_1 the robe rises a pixel; attack the trident arm (the upper right) sweeps forward; hurt the recoil;
    cast (a decree unrolls) the bands and eyes glow and paper sparks rise"""
    H, W = img.shape[:2]
    a = AF.canvas(img)
    I = lambda v: int(round(v))
    out = {}
    arm = AF.m_poly(a, [(I(W * 0.55), 0), (W, 0), (W, I(H * 0.75)), (I(W * 0.7), I(H * 0.8)), (I(W * 0.55), I(H * 0.45))])
    pivot = AF.cp(I(W * 0.62), I(H * 0.45))
    seam = I(H * 0.55) + AF.PAD
    out['idle_1'] = AF.rise(a, seam)
    f = AF.move(a, arm, pivot, angle=12, keep=True)
    out['attack'] = AF.lean(f, seam, 4, taper=I(H * 0.4))
    g = AF.lean(a, seam, -3, taper=I(H * 0.4))
    g, dox = AF.squash(g, (I(H * 0.25), I(H * 0.55)), (I(W * 0.3), I(W * 0.65)))
    out['hurt'] = (AF.edge_lift(g, 2, prefer=prefer), dox)
    m, L, C, h = lch_img(a)
    f = AF.glow(a, m & (L > 0.74), glow_ref, 0.6, 1)
    out['cast'] = AF.sparkles(f, [(I(W * 0.45), -3, 2), (I(W * 0.55), 0, 1), (I(W * 0.35), -6, 1), (I(W * 0.7), 6, 1),
                                   (I(W * 0.25), 10, 1), (I(W * 0.8), 18, 1)], list(cast_spark))
    return out


def derived(bid, img):
    if bid == 'paper_regent_charter':
        raw = recipe(img, ('stone_warm', 'path', 'sand', 'shadow'), 'gold', ('gold:4', 'gold:5', 'metal:4'))
    else:
        raw = recipe(img, ('magic_cyan', 'water', 'ink', 'shadow', 'stone_warm'))
    from ep4_enemies import pack4
    return pack4(bid, img, raw)


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


if __name__ == '__main__':
    import os
    os.makedirs(os.path.join(OUT, 'ep4'), exist_ok=True)
    b = base()
    for bg, tag in (((24, 34, 40), 'dark'), ((150, 150, 140), 'marble')):
        contact(list(b.items()), os.path.join(OUT, 'ep4', f'regent_looks_3x_{tag}.png'), scale=3, cols=3, bg=bg,
                title='Paper Regent: Forged Edicts, Royal Ward, True Charter (3x)')
