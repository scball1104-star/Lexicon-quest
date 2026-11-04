"""Episode 4 foes with their own battle frames (E4-sprites): the Flood Road and the Sunken Keep.

Every foe is cut from ../assets/art/enemies.png (4x2 grid) at 1x straight from the painting (no non-integer
scaling), recoloured per material with gradient maps onto master ramps (river grey, weed green, wet ink, cream
paper, tarnished brass, red seal wax), put through the shared cleanup (master snap, near-duplicate merge,
despeckle, ramp-darkest outline), rim-lit so the dark foes read on the drowned stages (CRITIQUE_4 item 8) and
finished with hand edits. Each uses a different painted cell, at the size of the earlier foe of the same cell, so
the Episode 1 to 3 derived-frame recipes (anim_frames.py, ep2_enemies.py, ep3_enemies.py) fit it:

  flood_hound          cell 2 at 60 px: river-grey fur, a mane of weed, a pale gold eye
  lockjaw_crab         cell 3 at 50 px: a barnacled blue-grey shell, rust claws and legs
  ink_bloom            cell 0 at 46 px: runny blue-black ink, wet highlights, a red seal floating in it
  drowned_watch        cell 5 at 96 px: waterlogged guard plate gone green-black, weed for a cape, lantern eyes
  gutter_phantom       cell 7 at 84 px: murky green shroud, two drowned-lantern eyes
  blank_decree         cell 6 at 70 px: cream paper wings, red wax talons, a red seal for an eye
  waterlogged_sentinel cell 4 at 88 px: swollen wet stone and sodden paper bands, kelp, a drowned cyan core
  barrister            cell 1 at 90 px: the Inkbound Barrister (mini-boss, 96 px cell): a black gown, a white
                       collar with tabs, ink-blue hands, papers spilling from the sleeves
  barrister_witness    cell 6 at 40 px: a small Blank Decree called to the stand, its seal in the Barrister's ink

    base()          -> {id: rgba}               facing RIGHT, origin bottom-centre
    atlas_frames()  -> [(name, rgba, ox, oy)]   base + derived (AF.ORDER)
"""
import os
import numpy as np
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import cleanup as CL
import anim_frames as AF
from hollow_enemies import consolidate, col, pad_top, outline_new
from ep2_enemies import gmap, lch_img, stamp
from ep3_enemies import rim as _rim

IDS = ['flood_hound', 'lockjaw_crab', 'ink_bloom', 'drowned_watch', 'gutter_phantom', 'blank_decree',
       'waterlogged_sentinel']
BOSS_IDS = ['barrister']
ADD_IDS = ['barrister_witness']
ALL_IDS = IDS + BOSS_IDS + ADD_IDS
CASTERS = ('ink_bloom', 'gutter_phantom', 'blank_decree', 'barrister')


# ----------------------------------------------------------------------------- recolours (on the quantized cut)
def rc_hound(a):
    """silver-white wolf -> river-grey fur (cool, wet); the saturated blue flame mane -> a weed mane"""
    m, L, C, h = lch_img(a)
    blue = consolidate(m & (h > 200) & (h < 320) & (C > 0.06), m)
    gold = m & (h > 55) & (h < 110) & (C > 0.08)
    blue &= ~gold
    fur = m & ~blue & ~gold
    a = gmap(a, fur, [(0.0, 'shadow:0'), (0.14, 'shadow:1'), (0.3, 'shadow:2'), (0.48, 'stone_cool:2'),
                      (0.66, 'stone_cool:3'), (0.84, 'stone_cool:4'), (1.0, 'stone_cool:5')], gamma=1.2)
    a = gmap(a, blue, [(0.0, 'foliage_dark:0'), (0.25, 'foliage_dark:1'), (0.5, 'roof_green:2'), (0.75, 'roof_green:3'),
                       (1.0, 'roof_green:4')], gamma=0.9)
    a = gmap(a, gold, [(0.0, 'gold:3'), (1.0, 'gold:4')])
    return a


def rc_crab(a):
    """green shell -> barnacled blue-grey (mussel) shell; the brass trim and legs -> rust; the green glow orbs ->
    pale barnacle cream"""
    m, L, C, h = lch_img(a)
    green = consolidate(m & (h > 110) & (h < 200) & (C > 0.05), m)
    glow = green & (L > 0.72)
    shell = green & ~glow
    warm = m & ~green
    a = gmap(a, shell, [(0.0, 'shadow:0'), (0.16, 'shadow:1'), (0.34, 'shadow:2'), (0.52, 'stone_cool:2'),
                        (0.72, 'stone_cool:3'), (0.88, 'stone_cool:4'), (1.0, 'stone_cool:5')], gamma=0.9)
    a = gmap(a, glow, [(0.0, 'stone_warm:3'), (0.5, 'stone_warm:4'), (1.0, 'stone_warm:5')])
    a = gmap(a, warm, [(0.0, 'shadow:0'), (0.2, 'wood:0'), (0.42, 'wood:1'), (0.62, 'roof_red:2'),
                       (0.82, 'roof_red:3'), (1.0, 'roof_red:4')], gamma=1.25)
    _SHELL['crab'] = shell
    return a


_SHELL = {}


def rc_bloom(a):
    """green slime -> runny blue-black ink with wet blue highlights; the yellow veins -> pale wet glints; the
    yellow eyes stay as two cold pale points"""
    m, L, C, h = lch_img(a)
    yel = m & (h > 70) & (h < 140) & (C > 0.08) & (L > 0.62)
    body = m & ~yel
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.2, 'ink:1'), (0.42, 'ink:2'), (0.62, 'ink:3'), (0.82, 'roof_blue:3'),
                       (1.0, 'water:3')], gamma=1.25)
    a = gmap(a, yel, [(0.0, 'water:4'), (0.6, 'ice:2'), (1.0, 'ice:3')])
    return a


def rc_watch(a):
    """silver plate -> waterlogged plate gone green-black with verdigris highlights; the blue cape -> black-green
    weed; the gold trim -> tarnished brass; the blue glow (blade, visor) -> drowned cyan"""
    m, L, C, h = lch_img(a)
    cape = consolidate(m & (h > 230) & (h < 300) & (C > 0.07) & (L < 0.62), m)
    gold = m & (h > 50) & (h < 110) & (C > 0.06)
    glow = m & (h > 170) & (h < 270) & (C > 0.06) & (L > 0.62)
    rest = m & ~cape & ~gold & ~glow
    a = gmap(a, rest, [(0.0, 'shadow:0'), (0.12, 'foliage_dark:0'), (0.26, 'shadow:2'), (0.42, 'roof_green:1'),
                       (0.56, 'stone_cool:2'), (0.7, 'roof_green:2'), (0.82, 'stone_cool:3'), (0.92, 'stone_cool:4'),
                       (1.0, 'metal:2')], gamma=0.85)
    a = gmap(a, cape, [(0.0, 'shadow:0'), (0.3, 'foliage_dark:0'), (0.6, 'foliage_dark:1'), (0.85, 'roof_green:2'),
                       (1.0, 'roof_green:3')])
    a = gmap(a, gold, [(0.0, 'wood:1'), (0.5, 'wood:3'), (1.0, 'gold:2')])
    a = gmap(a, glow, [(0.0, 'magic_cyan:1'), (0.5, 'magic_cyan:2'), (1.0, 'magic_cyan:3')])
    return a


def rc_phantom(a):
    """icy white-blue ghost -> murky gutter green; the cyan eyes and glow -> drowned-lantern gold"""
    m, L, C, h = lch_img(a)
    glow = m & (h > 170) & (h < 250) & (C > 0.1) & (L > 0.68)
    body = m & ~glow
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.14, 'foliage_dark:0'), (0.3, 'foliage_dark:1'), (0.48, 'roof_green:2'),
                       (0.68, 'roof_green:3'), (0.86, 'roof_green:4'), (1.0, 'stone_cool:4')], gamma=2.0)
    a = gmap(a, glow, [(0.0, 'grass:4'), (0.5, 'gold:3'), (1.0, 'gold:4')])
    return a


def rc_decree(a, seal='red'):
    """blue-and-gold roc -> cream paper wings (the feather shading kept as the paper's folds); the gold talons,
    beak and eye -> red seal wax (the witness: the Barrister's blue-black ink)"""
    m, L, C, h = lch_img(a)
    warm = m & (h > 40) & (h < 120) & (C > 0.07)
    from scipy import ndimage as ndi
    lab, n = ndi.label(warm)
    if n:
        sz = ndi.sum(warm, lab, range(1, n + 1))
        warm = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 3])
    paper = m & ~warm
    a = gmap(a, paper, [(0.0, 'stone_warm:1'), (0.18, 'stone_warm:2'), (0.42, 'stone_warm:3'), (0.68, 'stone_warm:4'),
                        (1.0, 'stone_warm:5')], gamma=0.75, snap=True)
    # talons and beak: ink-stained quill tips (the seal eye, stamped in finish(), is the one red place)
    a = gmap(a, warm, [(0.0, 'ink:1'), (0.4, 'ink:2'), (0.75, 'ink:3'), (1.0, 'roof_blue:3')])
    return a


def rc_sentinel(a):
    """brown stone blocks -> swollen wet stone (blue-grey); the cream bands -> sodden paper; the gold core ->
    a drowned cyan glow"""
    m, L, C, h = lch_img(a)
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    near = np.hypot(xs - W * 0.6, ys - H * 0.3) < H * 0.12
    core = m & (h > 60) & (h < 110) & (C > 0.12) & (L > 0.72) & near
    band = consolidate(m & (L > 0.62) & ~core & ~near, m, passes=1) & ~core
    stone = m & ~core & ~band
    a = gmap(a, stone, [(0.0, 'shadow:0'), (0.14, 'shadow:1'), (0.3, 'shadow:2'), (0.48, 'stone_cool:2'),
                        (0.66, 'stone_cool:3'), (0.84, 'stone_cool:4'), (1.0, 'stone_cool:5')], gamma=1.05)
    a = gmap(a, band, [(0.0, 'stone_warm:2'), (0.5, 'stone_warm:3'), (1.0, 'stone_warm:4')])
    a = gmap(a, core, [(0.0, 'magic_cyan:2'), (0.5, 'magic_cyan:3'), (1.0, 'magic_cyan:4')])
    return a


def rc_barrister(a):
    """purple shroud -> a black advocate's gown (ink-black with cool grey sheen); the blue eyes -> cold pale points"""
    m, L, C, h = lch_img(a)
    eye = m & (h > 220) & (h < 275) & (C > 0.13) & (L > 0.5)
    body = m & ~eye
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.14, 'ink:0'), (0.3, 'ink:1'), (0.48, 'shadow:2'),
                       (0.66, 'stone_cool:2'), (0.84, 'stone_cool:3'), (1.0, 'stone_cool:4')], gamma=1.0)
    a = gmap(a, eye, [(0.0, 'ice:2'), (1.0, 'ice:3')])
    return a


# rims: a 1 px light on the upper-left edges of the dark outline, the keep's lamps are cold, the road is grey
RIVER = dict(left='stone_cool:3', top='stone_cool:5', max_L=0.5)        # grey fur, wet stone
WEED = dict(left='roof_green:2', top='roof_green:4', max_L=0.45)             # drowned plate, gutter green
INK = dict(left='water:3', top='ice:2', max_L=0.5)                      # ink, gowns
PAPER = dict(left='stone_warm:2', top='stone_warm:3', max_L=0.4)        # the paper foes are light already
RUST = dict(left='stone_cool:3', top='stone_warm:4', max_L=0.45)

SPECS = {
    'flood_hound': dict(cell=2, h=60, k=16, rc=rc_hound, flip=True, eyes=[(93, 233)], eye_col='gold:4', rim=RIVER),
    'lockjaw_crab': dict(cell=3, h=50, k=16, rc=rc_crab, flip=True, rim=RUST),
    'ink_bloom': dict(cell=0, h=46, k=14, rc=rc_bloom, rim=INK),
    'drowned_watch': dict(cell=5, h=96, k=18, rc=rc_watch, flip=True, keep=0.05, dist=20, rim=WEED),
    'gutter_phantom': dict(cell=7, h=84, k=14, rc=rc_phantom, lift='shadow', rim=WEED),
    'blank_decree': dict(cell=6, h=70, k=16, rc=rc_decree, keep=0.03, dist=30, rim=PAPER),
    'waterlogged_sentinel': dict(cell=4, h=88, k=16, rc=rc_sentinel, rim=RIVER),
    'barrister': dict(cell=1, h=90, k=14, rc=rc_barrister, eyes=[(230, 68), (240, 68)], eye_col='ice:3', rim=INK),
    'barrister_witness': dict(cell=6, h=40, k=12, rc=lambda a: rc_decree(a, 'ink'), keep=0.03, dist=30, rim=PAPER),
}


def make(eid, src):
    spec = SPECS[eid]
    obj = main_object(grid_cell(src, 4, 2, spec['cell']), keep_frac=spec.get('keep', 0.04),
                      max_dist=spec.get('dist', 40))
    tw, th = fit_size(obj, th=spec['h'])
    d, _ = pixelize2(obj, tw, th, k=spec['k'], sharpen=0.0, max_de=0.10, ring=False)
    d = spec['rc'](d)
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 6 if th > 30 else 3)
    big = CL.ramp_outline(big)
    if spec.get('eyes'):
        oh, ow = obj.shape[:2]
        ec = col(spec['eye_col'])
        dark = col('ink:0')
        for sx, sy in spec['eyes']:
            x = int(round(sx * tw / ow)) + 1
            y = int(round(sy * th / oh)) + 1
            big[y, x, :3] = ec; big[y, x, 3] = 1
            if eid == 'flood_hound':
                big[y, x - 1, :3] = col('gold:3'); big[y, x - 1, 3] = 1
                big[y - 1, x - 1:x + 1, :3] = dark
                big[y + 1, x, :3] = dark
    if spec.get('flip'):
        big = flip_x(big)
    return finish(eid, big)


def put(a, x, y, ref):
    H, W = a.shape[:2]
    if 0 <= y < H and 0 <= x < W:
        a[y, x, :3] = col(ref); a[y, x, 3] = 1


def seal_disc(a, cx, cy, r=3.2, ramp=('roof_red:1', 'roof_red:2', 'roof_red:3', 'roof_red:4'), mark='roof_red:1'):
    """a round wax seal lit from the upper left: dark rim, three body steps, a small cross pressed into it"""
    H, W = a.shape[:2]
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = np.hypot(dx, dy)
            if d > r or not (0 <= x < W and 0 <= y < H):
                continue
            if d > r - 0.9:
                ref = ramp[0]
            else:
                lam = (-dx - dy) / r
                ref = ramp[3] if lam > 0.55 else (ramp[2] if lam > -0.2 else ramp[1])
            a[y, x, :3] = col(ref); a[y, x, 3] = 1
    ix, iy = int(cx), int(cy)
    if r >= 2.6:
        for (x, y) in ((ix, iy), (ix - 1, iy), (ix + 1, iy), (ix, iy - 1), (ix, iy + 1)):
            put(a, x, y, mark)
    return a


FLIP_CRAB = True


def crab_paint(a):
    """after the flip: the beetle's bronze body and dome become one slate-blue carapace (mussel shell), the raised
    horns become rust claws and the legs rust too"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    inner = m & ~edge_mask(a)
    ys, xs = np.mgrid[0:H, 0:W]
    claws = inner & (((xs > W * 0.6) & (ys < H * 0.5)) | (ys > H * 0.7))
    shell = inner & ~claws
    a = gmap(a, shell, [(0.0, 'shadow:1'), (0.18, 'shadow:2'), (0.36, 'stone_cool:2'), (0.56, 'stone_cool:3'),
                        (0.78, 'stone_cool:4'), (1.0, 'stone_cool:5')], gamma=0.85)
    a = gmap(a, claws, [(0.0, 'shadow:0'), (0.2, 'wood:0'), (0.42, 'roof_red:1'), (0.62, 'roof_red:2'),
                        (0.82, 'roof_red:3'), (1.0, 'roof_red:4')], gamma=1.1)
    a = CL.snap_master(a, 0.05)
    return a


def edge_mask(a):
    al = a[..., 3] > 0.5
    p = np.pad(al, 1)
    return al & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])


def barnacles(a, seed=4, n=7):
    """clusters of pale barnacles on the shell's upper half: a lit pixel with a dark mouth"""
    rng = np.random.RandomState(seed)
    H, W = a.shape[:2]
    ys_, xs_ = np.mgrid[0:H, 0:W]
    shell = (a[..., 3] > 0.5) & ~edge_mask(a) & (xs_ > W * 0.1) & (xs_ < W * 0.58) & (ys_ > H * 0.16) & (ys_ < H * 0.55)
    ys, xs = np.nonzero(shell)
    if not len(ys):
        return a
    for i in rng.choice(len(ys), size=min(n, len(ys)), replace=False):
        y, x = ys[i], xs[i]
        put(a, x, y, 'stone_warm:4'); put(a, x + 1, y, 'stone_warm:5'); put(a, x + 2, y, 'stone_warm:4')
        put(a, x, y + 1, 'stone_warm:3'); put(a, x + 1, y + 1, 'shadow:0'); put(a, x + 2, y + 1, 'stone_warm:3')
    return a


def kelp(a, roots, seed=3, ramp=('foliage_dark:1', 'roof_green:2', 'roof_green:3')):
    """strands of kelp hanging from (x, y) roots: 1 px wide, wavering, darker at the tips; they stay inside the
    silhouette or hang just past it"""
    rng = np.random.RandomState(seed)
    H, W = a.shape[:2]
    for (x, y, ln) in roots:
        xx = x
        for i in range(ln):
            yy = y + i
            if yy >= H - 1:
                break
            if i and i % 3 == 0:
                xx += rng.choice([-1, 0, 1])
            ref = ramp[2] if i < ln * 0.35 else (ramp[1] if i < ln * 0.75 else ramp[0])
            if 0 <= xx < W:
                a[yy, xx, :3] = col(ref); a[yy, xx, 3] = 1
                if i < ln * 0.4 and xx + 1 < W:
                    a[yy, xx + 1, :3] = col(ramp[1]); a[yy, xx + 1, 3] = 1
    return a


COLLAR = ['Wk.....kW',
          'WWk...kWW',
          '.wWk.kWw.',
          '..wWkWw..',
          '...WkW...',
          '...WkW...',
          '...wkw...',
          '...k.k...']
SHEET_A = ['kkkkkk..',
           'kWWWWWk.',
           'kWiiiWWk',
           'kWWWWWWk',
           'kWiiiiWk',
           '.kWWWWWk',
           '.kWiiWwk',
           '.kwwwwwk',
           '..kkkkk.']
SHEET_B = ['..kkkkk',
           '.kWWWWk',
           'kWiiiWk',
           'kWWWWWk',
           'kWiiWwk',
           'kwwwwk.',
           '.kkkk..']


def barrister_finish(a, hands=((68, 26, 87, 45), (8, 10, 30, 30), (0, 46, 14, 64)),
                     collar=(45, 20), sheets=((59, 38, 'A'), (64, 31, 'B'), (21, 22, 'B'), (13, 43, 'B'))):
    """the advocate: a white collar with two bands under the hood, ink-blue hands (the lighter claws at the ends of
    the sleeves), and loose papers spilling from the sleeves"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    for (x0, y0, x1, y1) in hands:
        box = np.zeros_like(m)
        box[y0:y1, x0:x1] = True
        sel = box & m & (L > 0.3)
        if sel.sum() > 4:
            lv = L[sel]
            a[sel & (L >= np.percentile(lv, 30)), :3] = col('water:1')
            a[sel & (L >= np.percentile(lv, 60)), :3] = col('water:2')
            a[sel & (L >= np.percentile(lv, 88)), :3] = col('water:3')
    a = stamp(a, COLLAR, {'w': 'metal:2', 'W': 'metal:4', 'k': 'ink:1'}, collar[0], collar[1])
    pl = {'k': 'stone_warm:1', 'W': 'stone_warm:5', 'w': 'stone_warm:4', 'i': 'ink:3'}
    for (x, y, k) in sheets:
        a = stamp(a, SHEET_A if k == 'A' else SHEET_B, pl, x, y)
    return a


def finish(eid, a):
    """per-foe hand edits on the right-facing base, then the rim light (after the flip, so it sits on the
    screen's upper-left edges)"""
    spec = SPECS[eid]
    H, W = a.shape[:2]
    if eid == 'ink_bloom':
        a = seal_disc(a, W * 0.58, H * 0.72, r=4.2)
    if eid == 'blank_decree':
        a = seal_eye(a)
    if eid == 'barrister_witness':
        a = seal_eye(a, ink=True)
    if eid == 'lockjaw_crab':
        a = crab_paint(a)
        a = barnacles(a)
    if eid == 'waterlogged_sentinel':
        a = core_disc(a, 53, 27)
        a = kelp(a, [(int(W * 0.18), int(H * 0.18), 18), (int(W * 0.24), int(H * 0.2), 12), (int(W * 0.78), int(H * 0.2), 16),
                     (int(W * 0.7), int(H * 0.22), 10), (int(W * 0.5), int(H * 0.5), 9)])
    if eid == 'drowned_watch':
        a = kelp(a, [(int(W * 0.3), int(H * 0.2), 14), (int(W * 0.62), int(H * 0.18), 12), (int(W * 0.44), int(H * 0.42), 8)], seed=8)
    if eid == 'barrister':
        a = barrister_finish(a)
    if eid == 'gutter_phantom':
        # the cowl's face is two drowned lanterns: a hot gold pair with a green under-glow
        a = stamp(a, ['.gG..Gg.', '.rR..Rr.'], {'g': 'gold:3', 'G': 'gold:4', 'r': 'roof_green:3', 'R': 'roof_green:4'}, 46, 8)
    if eid == 'drowned_watch':
        a = visor_eyes(a)
    a = _rim(a, spec)
    return a


def core_disc(a, cx, cy):
    """the drowned core in the sentinel's chest: a cold cyan glow in a dark stone ring with a grate bar (the
    Furnace Construct's window, flooded)"""
    H, W = a.shape[:2]
    for y in range(H):
        for x in range(W):
            d = np.hypot(x - cx, y - cy)
            if d > 6.6 or a[y, x, 3] < 0.5:
                continue
            ref = ('shadow:0' if d > 5.6 else 'water:1' if d > 4.5 else 'magic_cyan:1' if d > 3.3 else
                   'magic_cyan:2' if d > 2.0 else 'magic_cyan:3' if d > 0.9 else 'magic_cyan:4')
            if abs(x - cx) < 0.6 and 2.0 < d < 5.6:
                ref = 'shadow:0'
            a[y, x, :3] = col(ref)
    return a


def visor_eyes(a, x=50, y=12):
    """two drowned-lantern points in the helm's slit, a dim cyan under each"""
    for dx in (0, 3):
        put(a, x + dx, y, 'magic_cyan:4'); put(a, x + dx, y + 1, 'magic_cyan:2')
        put(a, x + dx - 1, y, 'shadow:0') if dx == 0 else None
    return a


def seal_eye(a, ink=False):
    """the roc's eye (found as the head's darkest pixel cluster near the beak) becomes a round seal"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    # the head is at the upper right of the cut (the painting's bird faces right)
    box = np.zeros_like(m)
    box[int(H * 0.08):int(H * 0.42), int(W * 0.62):int(W * 0.95)] = True
    warm = box & m & (C > 0.05) & (h > 0) & (h < 60)
    if warm.any():
        ys, xs = np.nonzero(warm)
        cx, cy = xs.min() - 1, ys.mean()
    else:
        cx, cy = W * 0.76, H * 0.28
    r = 2.6 if H > 50 else 1.7
    ramp = ('roof_red:1', 'roof_red:2', 'roof_red:3', 'roof_red:4') if not ink else ('ink:0', 'ink:2', 'ink:3', 'roof_blue:3')
    return seal_disc(a, cx, cy, r=r, ramp=ramp, mark=ramp[0])


_CACHE = {}


def build():
    if not _CACHE:
        src = load_src('enemies.png')
        for eid in SPECS:
            _CACHE[eid] = make(eid, src)
    return _CACHE


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames
def pack4(eid, base, raw):
    """anim_frames._pack with a drowned death: the dissolve front runs pale blue and the drifting flakes are wet
    paper (the forged ink does not hold)"""
    ox, oy = AF.origin_of(base)
    out = {}
    for n, v in raw.items():
        img, dox = (v if isinstance(v, tuple) else (v, 0))
        out[n] = (img, ox + dox, oy)
    seed = sum(ord(c) for c in eid) * 11 + 5
    for i, lv in enumerate(AF.DIE_LEVELS):
        out[f'die_{i}'] = (AF.dissolve(AF.canvas(base), lv, seed, edge='water:4', ash='stone_warm:4'), ox, oy)
    return out


def derived(eid, img):
    from ep2_enemies import f_wraith, f_knight, f_sentinel, f_mercury
    import ep3_enemies as E3
    if eid == 'flood_hound':
        from hollow_enemies import f_wolf
        raw = f_wolf(img, 1.0, 0, 0, prefer=('shadow', 'stone_cool', 'roof_green', 'foliage_dark', 'gold'))
    elif eid == 'lockjaw_crab':
        raw = AF.f_moss_scarab(img, prefer=('shadow', 'ink', 'stone_cool', 'roof_red', 'wood'))
    elif eid == 'ink_bloom':
        raw = f_mercury(img, img.shape[0] / 50.0)
        raw['hurt'] = AF.edge_lift(AF.lean(AF.canvas(img), 38, -2, taper=14), 2, prefer=('ink', 'water', 'shadow', 'roof_red'))
        a = AF.canvas(img)
        m, L, C, h = lch_img(a)
        f = AF.glow(a, m & (L > 0.55), 'water', 0.55, 2)
        raw['cast'] = AF.sparkles(f, [(int(img.shape[1] * 0.5), -2, 1), (int(img.shape[1] * 0.3), 2, 1),
                                      (int(img.shape[1] * 0.7), 0, 2)], ['roof_red:3', 'roof_red:4', 'water:4'])
    elif eid == 'drowned_watch':
        raw = f_knight(img, dy=0, prefer=('shadow', 'foliage_dark', 'stone_cool', 'roof_green', 'magic_cyan'))
    elif eid == 'gutter_phantom':
        raw = AF.f_ink_wraith(img)
        raw = dict(raw)
        if 'cast' in raw:
            c = raw['cast']
            c, dox = (c if isinstance(c, tuple) else (c, 0))
            m, L, C, h = lch_img(c)
            raw['cast'] = (AF.glow(c, m & (h > 60) & (h < 120) & (C > 0.08) & (L > 0.6), 'gold', 0.55, 2), dox)
    elif eid in ('blank_decree', 'barrister_witness'):
        raw = E3.f_specter(img)
        c = raw['cast']
        m, L, C, h = lch_img(c)
        raw['cast'] = AF.glow(c, m & (h < 50) & (C > 0.08), 'roof_red', 0.4, 2) if eid == 'blank_decree' else c
    elif eid == 'waterlogged_sentinel':
        raw = f_sentinel(img)
    elif eid == 'barrister':
        raw = f_wraith(img, img.shape[0] / 72.0, 'water', 2, ['water:4', 'ice:2', 'stone_warm:5'],
                       ('ink', 'shadow', 'stone_cool', 'water'))
    else:
        raw = {}
    return pack4(eid, img, raw)


def frames_of(eid):
    img = build()[eid]
    H, W = img.shape[:2]
    out = [(eid, img, W // 2, H - 1)]
    fr = derived(eid, img)
    out += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    return out


def atlas_frames(ids=None):
    out = []
    for eid in (ids or ALL_IDS):
        out += frames_of(eid)
    return out


FIELD_RIM = {'flood_hound': RIVER, 'lockjaw_crab': RUST, 'ink_bloom': INK, 'drowned_watch': WEED,
             'gutter_phantom': WEED, 'blank_decree': PAPER, 'waterlogged_sentinel': RIVER, 'barrister': INK}


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep4'), exist_ok=True)
    b = base()
    for bg, tag in (((24, 34, 40), 'dark'), ((80, 92, 96), 'mid')):
        contact(list(b.items()), os.path.join(OUT, 'ep4', f'enemies_base_4x_{tag}.png'), scale=4, cols=5, bg=bg,
                title='Episode 4 foes (base) at 4x')
