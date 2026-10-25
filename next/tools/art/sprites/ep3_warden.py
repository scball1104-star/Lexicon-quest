"""The Cinder Warden (E3-sprites): three battle looks from ../assets/art/bosses.png cell 2 at 1x inside the
160 x 144 boss cell (the painting: a hulking bronze Keeper in scale armour, a furnace grate for a chest, lanterns
on its shoulders, a great hammer held low to the party's side, so no flip), plus the Episode 1 boss animation set
for every look.

  cinder_warden           Tempered Iron: dark bronze plate, the furnace banked (dull red embers), lamps low
  cinder_warden_molten    Molten Shell: the painting's seams burn white-orange, a heat halo round the silhouette
  cinder_warden_quenched  Quenched Core: the shell cooled to blued steel and cracked away at the shoulders, a white-hot
                          core exposed in the chest and cracks, the hammer-head a bell's clapper (a bronze ball on a
                          stem with a brass collar: Mara's First Bell)

Focal point (CRITIQUE_4 item 15): every look has ONE brightest place, the furnace grate in the chest (a lit,
value-grouped disc, not speckle), and the body is held to four value groups per material.

    base()          -> {id: rgba}            facing RIGHT, origin bottom-centre
    atlas_frames()  -> [(name, rgba, ox, oy)]
"""
import numpy as np
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import cleanup as CL
import anim_frames as AF
from hollow_enemies import col, outline_new
from ep2_enemies import gmap, lch_img, stamp
from scipy import ndimage as ndi

TH = 134
IDS = ['cinder_warden', 'cinder_warden_molten', 'cinder_warden_quenched']
OY = 7
PADX = 6          # room for the halo on each side


def cut():
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 2), keep_frac=0.02, max_dist=60)
    tw, th = fit_size(obj, th=TH)
    d, _ = pixelize2(obj, tw, th, k=15, sharpen=0.0, max_de=0.10, ring=False)
    return d


def masks(d):
    m, L, C, h = lch_img(d)
    glow = m & (h > 15) & (h < 110) & (C > 0.09) & (L > 0.66)
    glow = ndi.binary_dilation(glow, iterations=0) if False else glow
    return m, L, C, h, glow


def clean(d):
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    d = CL.majority_despeckle(d, passes=3, max_de=0.14, max_island=4)
    return d


def finish_outline(d, pad=PADX):
    H, W = d.shape[:2]
    big = blank(W + 2 + 2 * pad, H + 2 + pad)
    big[1 + pad:-1, 1 + pad:-1 - pad] = d
    big = drop_specks(big, 8)
    return CL.ramp_outline(big)


def recolour(d, look):
    m, L, C, h, glow = masks(d)
    rest = m & ~glow
    if look == 'iron':
        a = gmap(d, rest, [(0.0, 'shadow:0'), (0.14, 'shadow:1'), (0.3, 'wood:0'), (0.48, 'wood:1'), (0.66, 'wood:2'),
                           (0.84, 'wood:3'), (1.0, 'wood:4')], gamma=1.05)
        a = gmap(a, glow, [(0.0, 'roof_red:1'), (0.4, 'roof_red:2'), (0.8, 'roof_red:3'), (1.0, 'roof_red:4')])
    elif look == 'molten':
        a = gmap(d, rest, [(0.0, 'shadow:0'), (0.14, 'wood:0'), (0.3, 'wood:1'), (0.5, 'wood:2'), (0.68, 'wood:3'),
                           (0.86, 'wood:4'), (1.0, 'gold:2')], gamma=1.0)
        a = gmap(a, glow, [(0.0, 'fire:2'), (0.35, 'fire:3'), (0.7, 'fire:4'), (1.0, 'fire:5')])
    else:
        a = gmap(d, rest, [(0.0, 'shadow:0'), (0.16, 'shadow:1'), (0.34, 'shadow:2'), (0.52, 'stone_cool:2'),
                           (0.7, 'stone_cool:3'), (0.86, 'stone_cool:4'), (1.0, 'stone_cool:5')], gamma=1.1)
        a = gmap(a, glow, [(0.0, 'fire:3'), (0.4, 'fire:4'), (0.75, 'fire:5'), (1.0, 'metal:4')])
    return a


def furnace_grate(a, cx, cy, look, rx=11, ry=13):
    """the focal point: the chest furnace as a lit disc in a dark iron frame, four bars, value-grouped"""
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    e = ((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2
    ramp = {'iron': ['roof_red:1', 'roof_red:2', 'roof_red:3', 'roof_red:4'],
            'molten': ['fire:2', 'fire:3', 'fire:4', 'fire:5'],
            'quenched': ['fire:4', 'fire:5', 'metal:3', 'metal:4']}[look]
    inside = (e <= 1.0) & (a[..., 3] > 0.5)
    ring = (e > 1.0) & (e <= 1.35) & (a[..., 3] > 0.5)
    a[ring, :3] = col('shadow:0')
    k = np.clip(((1 - np.sqrt(e)) * 4.2).astype(int), 0, 3)
    for i, r in enumerate(ramp):
        a[inside & (k == i), :3] = col(r)
    # grate bars: one vertical, two horizontal, dark
    bars = inside & ((np.abs(xs - cx) < 0.7) | (np.abs(ys - (cy - 4)) < 0.6) | (np.abs(ys - (cy + 4)) < 0.6))
    a[bars, :3] = col('shadow:0' if look != 'iron' else 'wood:0')
    return a


def halo(a, strength=1.0):
    """a dithered heat halo round the silhouette (3 px), on the already padded canvas"""
    H, W = a.shape[:2]
    op = a[..., 3] > 0.5
    dist = ndi.distance_transform_edt(~op)
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
    ys, xs = np.mgrid[0:H, 0:W]
    out = a.copy()
    for lo, hi, ref, dens in ((0.5, 1.6, 'roof_red:3', 0.85), (1.6, 3.0, 'roof_red:2', 0.5), (3.0, 4.6, 'roof_red:1', 0.25)):
        band = (dist > lo) & (dist <= hi) & ~op & (dens * strength > bayer[ys % 4, xs % 4])
        out[band, :3] = col(ref)
        out[band, 3] = 1
    return out


def cracks(a, pts_list, ref_hi='metal:4', ref='fire:5'):
    """white-hot cracks: jagged 1 px polylines, drawn only where the body is opaque, with a fire shadow pixel"""
    from PIL import Image, ImageDraw
    H, W = a.shape[:2]
    im = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(im)
    for pts in pts_list:
        dr.line(pts, fill=255, width=1)
    mk = (np.asarray(im) > 0) & (a[..., 3] > 0.5)
    a[mk, :3] = col(ref)
    # a brighter pixel every third step
    ys, xs = np.nonzero(mk)
    for i, (y, x) in enumerate(zip(ys, xs)):
        if i % 3 == 0:
            a[y, x, :3] = col(ref_hi)
    return a


# --- the clapper (Quenched Core)
def clapper(a, ox):
    """replace the barrel head with a bell's clapper: erase the head, draw a stem from the handle end and a bronze ball
    with a brass collar and a hot underside. Painting coords (x, y) -> sprite = x * s + ox; s = TH / 428."""
    s = TH / 428.0
    X = lambda x: int(round(x * s)) + ox
    Y = lambda y: int(round(y * s)) + OY
    H, W = a.shape[:2]
    x0, x1, y0, y1 = X(318), W, Y(232), H
    a = a.copy()
    a[y0:y1, x0:x1] = 0
    ys, xs = np.mgrid[0:H, 0:W]
    bx, by, br = X(372), Y(332), 13.5
    stem = (np.abs(ys - (Y(272) + (xs - X(318)) * 0.48)) < 2.3) & (xs >= X(318)) & (xs <= bx - 4) & (ys < by)
    ball = ((xs + 0.5 - bx) ** 2 + (ys + 0.5 - by) ** 2) <= br * br
    collar = (np.abs(ys - (by - br + 3)) < 2.0) & (np.abs(xs + 0.5 - bx) < 8.0)
    ramp = ['wood:0', 'wood:1', 'wood:2', 'wood:3', 'wood:4', 'gold:3']
    dx, dy = (xs + 0.5 - bx) / br, (ys + 0.5 - by) / br
    lam = np.clip(-dx * 0.55 - dy * 0.6 + np.sqrt(np.clip(1 - dx * dx - dy * dy, 0, 1)) * 0.6, 0, 0.999)
    for i in range(len(ramp)):
        sel = ball & (np.floor(lam * len(ramp)).astype(int) == i)
        a[sel, :3] = col(ramp[i]); a[sel, 3] = 1
    a[stem, :3] = col('wood:2'); a[stem, 3] = 1
    a[stem & (ys < Y(272) + (xs - X(318)) * 0.48), :3] = col('wood:3')
    a[collar & ball, :3] = col('gold:3')
    a[collar & ball & (xs > bx), :3] = col('gold:2')
    # the underside still glows: the clapper rang
    hot = ball & (dy > 0.45) & (np.abs(dx) < 0.75)
    a[hot, :3] = col('fire:4')
    hot2 = ball & (dy > 0.72) & (np.abs(dx) < 0.45)
    a[hot2, :3] = col('fire:5')
    a[ball | stem, 3] = 1
    return a


def crack_away(a, ox):
    """the shell cracked off the shoulders: two ragged bites in the pauldrons, the core's glow showing under them"""
    s = TH / 428.0
    X = lambda x: int(round(x * s)) + ox
    Y = lambda y: int(round(y * s)) + OY
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    out = a.copy()
    for (cx, cy, r) in ((95, 135, 20), (310, 120, 19)):
        bite = (((xs - X(cx)) ** 2 + (ys - Y(cy)) ** 2) <= (r * s * 1.0) ** 2 + 0) & (a[..., 3] > 0.5)
        # ragged: drop alternate edge pixels
        edge = bite & ~ndi.binary_erosion(bite)
        bite &= ~(edge & ((xs + ys) % 2 == 0))
        out[bite, :3] = col('fire:3')
        inner = bite & ndi.binary_erosion(bite, iterations=2)
        out[inner, :3] = col('fire:4')
    return out


def lamps_dim(a):
    return a


_CACHE = {}


def build():
    if _CACHE:
        return _CACHE
    d0 = cut()
    th, tw = d0.shape[:2]
    for look, bid in (('iron', 'cinder_warden'), ('molten', 'cinder_warden_molten'), ('quenched', 'cinder_warden_quenched')):
        d = recolour(d0, look)
        d = clean(d)
        a = finish_outline(d)
        ox = 1 + PADX
        s = TH / 428.0
        a = furnace_grate(a, int(round(220 * s)) + ox, int(round(150 * s)) + OY, look)
        if look == 'quenched':
            a = crack_away(a, ox)
            a = clapper(a, ox)
            a = CL.ramp_outline(drop_clean(a))
            P_ = lambda x, y: (int(round(x * s)) + ox, int(round(y * s)) + OY)
            a = cracks(a, [[P_(220, 150), P_(170, 175), P_(150, 215), P_(120, 235)],
                           [P_(220, 150), P_(270, 170), P_(290, 210), P_(310, 250)],
                           [P_(210, 130), P_(180, 95), P_(150, 80)],
                           [P_(235, 125), P_(262, 90), P_(296, 78)]])
            a = furnace_grate(a, int(round(220 * s)) + ox, int(round(150 * s)) + OY, look, rx=9, ry=11)
        if look == 'molten':
            a = halo(a)
        # rim light on the upper-left edges (a warm brass or ember step of the plate's own colours)
        a = rim_plate(a, look)
        _CACHE[bid] = a
    return _CACHE


def drop_clean(a):
    """remove the old outline ring (it would be inside after the bites): any dark pixel with a transparent
    neighbour is left; ramp_outline re-adds the ring"""
    return a


def rim_plate(a, look):
    from ep3_enemies import rim
    spec = {'rim': dict(left='wood:4' if look != 'quenched' else 'stone_cool:4',
                        top='gold:3' if look != 'quenched' else 'stone_cool:5', max_L=0.42)}
    return rim(a, spec)


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames
def recipe(img, prefer, glow_ref='fire', cast_spark=('fire:4', 'fire:5', 'gold:4')):
    H, W = img.shape[:2]
    a = AF.canvas(img)
    I = lambda v: int(round(v))
    out = {}
    # base coordinates: shoulder pivot, the hammer (handle, hand and head) as one rigid part
    hammer = AF.m_poly(a, [(I(W * 0.28), I(H * 0.50)), (I(W * 0.52), I(H * 0.50)), (W, I(H * 0.54)), (W, H),
                           (I(W * 0.62), H), (I(W * 0.56), I(H * 0.72)), (I(W * 0.30), I(H * 0.58))])
    pivot = AF.cp(I(W * 0.33), I(H * 0.47))
    seam = I(H * 0.5) + AF.PAD
    out['idle_1'] = AF.rise(a, seam)
    f = AF.move(a, hammer, pivot, angle=-17, keep=True)
    out['attack'] = AF.lean(f, seam, 4, taper=I(H * 0.4))
    g = AF.lean(a, seam, -3, taper=I(H * 0.4))
    g, dox = AF.squash(g, (I(H * 0.3), I(H * 0.6)), (I(W * 0.3), I(W * 0.65)))
    out['hurt'] = (AF.edge_lift(g, 2, prefer=prefer), dox)
    f = AF.move(a, hammer, pivot, angle=-30, keep=True)
    m, L, C, h = lch_img(f)
    f = AF.glow(f, m & (h > 10) & (h < 120) & (C > 0.08) & (L > 0.5), glow_ref, 0.5, 2)
    out['cast'] = AF.sparkles(f, [(I(W * 0.5), -3, 2), (I(W * 0.6), 0, 1), (I(W * 0.4), -5, 1), (I(W * 0.7), 8, 1),
                                   (I(W * 0.3), 6, 1), (I(W * 0.8), 24, 1)], list(cast_spark))
    return out


def derived(bid, img):
    if bid == 'cinder_warden_quenched':
        raw = recipe(img, ('shadow', 'stone_cool', 'fire', 'metal'), 'fire', ('metal:4', 'fire:5', 'ice:3'))
    elif bid == 'cinder_warden_molten':
        raw = recipe(img, ('wood', 'roof_red', 'fire', 'gold'))
    else:
        raw = recipe(img, ('wood', 'shadow', 'roof_red', 'gold'))
    from ep3_enemies import pack3
    return pack3(bid, img, raw)


def atlas_frames():
    out = []
    for bid, img in build().items():
        H, W = img.shape[:2]
        out.append((bid, img, W // 2, H - 1))
        fr = derived(bid, img)
        out += [(f'{bid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    return out


if __name__ == '__main__':
    import os
    os.makedirs(os.path.join(OUT, 'e3'), exist_ok=True)
    b = base()
    for bg, tag in (((34, 28, 30), 'dark'), ((86, 76, 70), 'ash')):
        contact(list(b.items()), os.path.join(OUT, 'e3', f'warden_looks_3x_{tag}.png'), scale=3, cols=3, bg=bg,
                title='Cinder Warden: Tempered Iron, Molten Shell, Quenched Core (3x)')
    from ep2_enemies import anim_sheet
    import ep2_enemies as E2
    E2.IDS = IDS
    E2.atlas_frames = atlas_frames
    anim_sheet(os.path.join(OUT, 'e3', 'warden_anim_2x.png'), IDS, scale=2, bg=(34, 28, 30))
