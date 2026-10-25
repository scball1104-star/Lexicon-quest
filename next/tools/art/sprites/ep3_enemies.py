"""Episode 3 foes with their own battle frames (E3-sprites): the Sand Road and the Ashen Foundry.

Every foe is cut from ../assets/art/enemies.png (4x2 grid) at 1x straight from the painting (no non-integer
scaling), recoloured per material with gradient maps onto master ramps (charcoal, soot, bronze, ember), put
through the shared cleanup (master snap, near-duplicate merge, despeckle, ramp-darkest outline), lifted and
rim-lit (CRITIQUE_2 D3: ash and soot foes must read on the dark Foundry stages) and finished with hand edits.
Each foe uses a different painted cell, at the size of the Episode 1 foe of the same cell, so the Episode 1
derived-frame recipes (anim_frames.py) fit it:

  cinder_hound      cell 2 at 60 px: charcoal fur, an ember mane, a hot gold eye
  cinder_beetle     cell 3 at 50 px: black carapace, glowing seams, ember eye
  slag_slime        cell 0 at 48 px: molten orange with a dark crust
  ashbound_miner    cell 1 at 72 px: a soot shade with an ember eye and a lamp in its hand
  furnace_construct cell 4 at 88 px: bronze plate with a furnace core that glows white-orange
  soot_phantom      cell 7 at 84 px: soot black, ember eyes, a rim-lit cowl
  forge_defender    cell 5 at 96 px: dark bronze plate, a red cape, a molten visor
  bellows_specter   cell 6 at 90 px: smoke and ember, soot-trail wings (mini-boss, 96 px enemy cell)
  bellows_coil / smelter_coil   hand-built (ep3_coils.py), the Warden's phase 2 adds

    base()            -> {id: rgba}               facing RIGHT, origin bottom-centre
    atlas_frames()    -> [(name, rgba, ox, oy)]   base + derived, for anim_atlas.append
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

IDS = ['cinder_hound', 'cinder_beetle', 'slag_slime', 'ashbound_miner', 'furnace_construct', 'soot_phantom',
       'forge_defender', 'bellows_specter']
CASTERS = ('ashbound_miner', 'soot_phantom', 'bellows_specter')


# ----------------------------------------------------------------------------- recolours (on the quantized cut)
def rc_hound(a):
    """silver-grey wolf -> charcoal fur; the saturated blue mane -> ember; the gold eye stays hot"""
    m, L, C, h = lch_img(a)
    blue = consolidate(m & (h > 200) & (h < 320) & (C > 0.06), m)
    gold = m & (h > 55) & (h < 110) & (C > 0.08)
    blue &= ~gold
    fur = m & ~blue & ~gold
    a = gmap(a, fur, [(0.0, 'shadow:0'), (0.14, 'shadow:1'), (0.32, 'shadow:2'), (0.5, 'stone_warm:1'),
                      (0.72, 'stone_warm:2'), (0.9, 'stone_warm:3'), (1.0, 'stone_warm:4')], gamma=1.3)
    a = gmap(a, blue, [(0.0, 'roof_red:1'), (0.25, 'roof_red:2'), (0.5, 'roof_red:3'), (0.72, 'roof_red:4'),
                       (0.88, 'fire:2'), (1.0, 'fire:3')], gamma=0.85)
    a = gmap(a, gold, [(0.0, 'fire:3'), (0.5, 'fire:4'), (1.0, 'fire:5')])
    return a


def rc_beetle(a):
    """green shell -> black carapace; the brass trim and the green glow orbs -> ember seams"""
    m, L, C, h = lch_img(a)
    green = consolidate(m & (h > 110) & (h < 200) & (C > 0.05), m)
    glow = green & (L > 0.72)
    shell = green & ~glow
    warm = m & ~green
    a = gmap(a, shell, [(0.0, 'shadow:0'), (0.2, 'shadow:1'), (0.42, 'shadow:2'), (0.64, 'stone_cool:2'),
                        (0.84, 'stone_cool:3'), (1.0, 'stone_cool:4')])
    a = gmap(a, glow, [(0.0, 'fire:2'), (0.5, 'fire:3'), (1.0, 'fire:4')])
    a = gmap(a, warm, [(0.0, 'shadow:1'), (0.25, 'wood:0'), (0.5, 'wood:1'), (0.7, 'roof_red:1'),
                       (0.86, 'roof_red:3'), (0.95, 'fire:2'), (1.0, 'fire:3')], gamma=1.5)
    return a


def rc_slag(a):
    """green slime -> a dark crust over molten orange: the bright veins and bubbles glow, the body is crust"""
    m, L, C, h = lch_img(a)
    yel = m & (h > 95) & (h < 140) & (C > 0.08) & (L > 0.62)
    body = m & ~yel
    lo, hi = np.percentile(L[body], 2), np.percentile(L[body], 99)
    t = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1)
    crust = body & (t < 0.36)
    melt = body & ~crust
    a = gmap(a, crust, [(0.0, 'shadow:0'), (0.3, 'wood:0'), (0.6, 'wood:1'), (0.85, 'roof_red:1'), (1.0, 'roof_red:2')])
    a = gmap(a, melt, [(0.0, 'roof_red:2'), (0.3, 'roof_red:3'), (0.55, 'roof_red:4'), (0.78, 'fire:2'),
                       (0.92, 'fire:3'), (1.0, 'fire:4')])
    a = gmap(a, yel, [(0.0, 'fire:3'), (0.5, 'fire:4'), (1.0, 'fire:5')])
    return a


def rc_miner(a):
    """purple shroud -> soot grey; the blue eyes -> ember"""
    m, L, C, h = lch_img(a)
    eye = m & (h > 220) & (h < 275) & (C > 0.13) & (L > 0.5)
    body = m & ~eye
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.15, 'shadow:1'), (0.32, 'shadow:2'), (0.5, 'stone_warm:1'),
                       (0.7, 'stone_warm:2'), (0.88, 'stone_warm:3'), (1.0, 'stone_warm:4')], gamma=1.0)
    a = gmap(a, eye, [(0.0, 'fire:3'), (1.0, 'fire:5')])
    return a


def rc_construct(a):
    """brown stone blocks -> bronze plate; the cream bands -> brass; the gold core -> white-orange fire"""
    m, L, C, h = lch_img(a)
    core = m & (h > 60) & (h < 110) & (C > 0.12) & (L > 0.72)
    band = consolidate(m & (L > 0.72) & ~core, m, passes=1) & ~core
    plate = m & ~core & ~band
    a = gmap(a, plate, [(0.0, 'shadow:0'), (0.12, 'wood:0'), (0.3, 'wood:1'), (0.48, 'wood:2'), (0.66, 'wood:3'),
                        (0.82, 'wood:4'), (1.0, 'gold:2')], gamma=0.95)
    a = gmap(a, band, [(0.0, 'wood:3'), (0.5, 'gold:2'), (1.0, 'gold:3')])
    a = gmap(a, core, [(0.0, 'fire:3'), (0.5, 'fire:4'), (1.0, 'fire:5')])
    return a


def rc_phantom(a):
    """icy white-blue ghost -> soot black with ash-grey highlights; the cyan eyes and glow -> ember"""
    m, L, C, h = lch_img(a)
    glow = m & (h > 170) & (h < 250) & (C > 0.1) & (L > 0.68)
    body = m & ~glow
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.14, 'shadow:1'), (0.3, 'shadow:2'), (0.5, 'stone_warm:1'),
                       (0.7, 'stone_warm:2'), (0.88, 'stone_warm:3'), (1.0, 'stone_warm:4')], gamma=2.6)
    a = gmap(a, glow, [(0.0, 'roof_red:4'), (0.5, 'fire:2'), (1.0, 'fire:4')])
    return a


def rc_defender(a):
    """silver plate -> dark bronze; the blue cape -> deep furnace red; the blue glow in the visor -> molten"""
    m, L, C, h = lch_img(a)
    cape = consolidate(m & (h > 230) & (h < 300) & (C > 0.07) & (L < 0.62), m)
    gold = m & (h > 50) & (h < 110) & (C > 0.06)
    glow = m & (h > 170) & (h < 270) & (C > 0.06) & (L > 0.62)
    rest = m & ~cape & ~gold & ~glow
    a = gmap(a, rest, [(0.0, 'shadow:0'), (0.16, 'shadow:1'), (0.32, 'wood:0'), (0.5, 'wood:1'), (0.7, 'wood:2'),
                       (0.88, 'wood:3'), (1.0, 'wood:4')], gamma=1.15)
    a = gmap(a, cape, [(0.0, 'shadow:1'), (0.3, 'roof_red:0'), (0.6, 'roof_red:1'), (0.85, 'roof_red:2'), (1.0, 'roof_red:3')])
    a = gmap(a, gold, [(0.0, 'gold:2'), (0.5, 'gold:3'), (1.0, 'gold:4')])
    a = gmap(a, glow, [(0.0, 'fire:3'), (0.5, 'fire:4'), (1.0, 'fire:5')])
    return a


def rc_specter(a):
    """blue-and-gold roc -> smoke grey feathers with ember-lit tips; the gold talons, beak and eye -> ember"""
    m, L, C, h = lch_img(a)
    warm = m & (h > 40) & (h < 120) & (C > 0.07)
    smoke = m & ~warm
    a = gmap(a, smoke, [(0.0, 'shadow:0'), (0.12, 'shadow:1'), (0.28, 'shadow:2'), (0.46, 'stone_warm:1'),
                        (0.64, 'stone_warm:2'), (0.8, 'stone_warm:3'), (0.93, 'stone_warm:4'), (1.0, 'stone_warm:5')], gamma=1.1)
    a = gmap(a, warm, [(0.0, 'roof_red:2'), (0.3, 'roof_red:4'), (0.55, 'fire:2'), (0.8, 'fire:3'), (1.0, 'fire:4')])
    # the draft is lit from below by the fans' fire: the lower part of the smoke takes an ember underglow,
    # dithered (a 4 x 4 Bayer matrix) so the join is a gradient, not a seam
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
    t = np.clip((ys / H - 0.5) / 0.42, 0, 1)
    under = smoke & (t > bayer[ys % 4, xs % 4]) & (t > 0)
    a = gmap(a, under, [(0.0, 'shadow:1'), (0.3, 'roof_red:0'), (0.55, 'roof_red:1'), (0.8, 'roof_red:2'), (1.0, 'roof_red:3')])
    return a


ASH = dict(left='stone_warm:2', top='stone_warm:3', max_L=0.5)        # soot, ash, smoke: a warm grey rim
EMBER = dict(left='roof_red:3', top='fire:2', max_L=0.5)               # coal and slag: an ember rim
BRONZE = dict(left='wood:4', top='gold:3', max_L=0.42)                 # plate: a brass rim

SPECS = {
    'cinder_hound': dict(cell=2, h=60, k=16, rc=rc_hound, flip=True, eyes=[(93, 233)], eye_col='fire:5', rim=ASH),
    'cinder_beetle': dict(cell=3, h=50, k=16, rc=rc_beetle, flip=True, rim=EMBER),
    'slag_slime': dict(cell=0, h=48, k=14, rc=rc_slag, rim=EMBER),
    'ashbound_miner': dict(cell=1, h=72, k=14, rc=rc_miner, eyes=[(230, 68), (240, 68)], eye_col='fire:5', brow=False,
                           rim=ASH),
    'furnace_construct': dict(cell=4, h=88, k=16, rc=rc_construct, rim=BRONZE),
    'soot_phantom': dict(cell=7, h=84, k=14, rc=rc_phantom, lift='shadow', rim=ASH),
    'forge_defender': dict(cell=5, h=96, k=18, rc=rc_defender, flip=True, keep=0.05, dist=20, rim=BRONZE),
    'bellows_specter': dict(cell=6, h=90, k=18, rc=rc_specter, keep=0.03, dist=30, lift='shadow', rim=ASH),
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
            if spec.get('brow', True) and eid.endswith('hound'):
                big[y, x - 1, :3] = ec * 0.8; big[y, x - 1, 3] = 1
                big[y - 1, x - 1:x + 1, :3] = dark
                big[y + 1, x, :3] = dark
    if eid == 'forge_defender':
        big = visor(big)
    if spec.get('flip'):
        big = flip_x(big)
    return finish(eid, big)


def visor(a):
    """the helm's dark opening becomes a molten slit (pre-flip coordinates): fire:3 at the brow, white-orange
    in the middle, red at the chin"""
    x0, x1, y0, y1 = 41, 47, 8, 17
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(a.shape[:2] + (3,))
    rows = ['fire:3', 'fire:4', 'fire:5', 'fire:5', 'fire:4', 'fire:3', 'roof_red:4', 'roof_red:3', 'roof_red:2']
    for y in range(y0, y1):
        for x in range(x0, x1):
            if a[y, x, 3] > 0.5 and lab[y, x, 0] < 0.30:
                a[y, x, :3] = col(rows[y - y0])
    return a


def core_disc(a, cx, cy):
    """the furnace window in the construct's chest: a white-orange glow in a dark iron ring with a grate"""
    H, W = a.shape[:2]
    for y in range(H):
        for x in range(W):
            d = np.hypot(x - cx, y - cy)
            if d > 6.6 or a[y, x, 3] < 0.5:
                continue
            if d > 5.6:
                ref = 'wood:0'
            elif d > 4.5:
                ref = 'roof_red:2'
            elif d > 3.3:
                ref = 'fire:2'
            elif d > 2.0:
                ref = 'fire:3'
            elif d > 0.9:
                ref = 'fire:4'
            else:
                ref = 'fire:5'
            if abs(x - cx) < 0.6 and d > 2.0 and d < 5.6:
                ref = 'wood:0'                 # the grate bar
            a[y, x, :3] = col(ref)
    return a


def rim(a, spec):
    """a 1 px warm rim on the upper-left edges (the Foundry's glow comes from the furnaces): every dark outline
    pixel with a transparent neighbour above or to the left takes the foe's rim colour, so ash and soot read
    against the dark stage (CRITIQUE_2 D3)"""
    if spec.get('lift'):
        a = CL.lift_darkest(a, spec['lift'])
    r = spec['rim']
    a = a.copy()
    al = a[..., 3] > 0.5
    H, W = al.shape
    p = np.pad(al, 1)
    up, left = p[:-2, 1:-1], p[1:-1, :-2]
    edge = al & (~up | ~left)
    nb = sum(p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx].astype(np.int32)
             for dy in (-1, 0, 1) for dx in (-1, 0, 1)) - al.astype(np.int32)
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    sel = edge & (nb >= 4) & (lab[..., 0] < r['max_L'])
    # a lighter rim (stone_warm:3) on the very top edge, the darker warm step on the left edge
    top = sel & ~up
    a[sel, :3] = col(r['left'])
    a[top, :3] = col(r['top'])
    return a


LAMP = ['.yy.',
        'yWWy',
        'yWWy',
        '.ky.',
        '.k..']


def finish(eid, a):
    """per-foe hand edits on the right-facing base, then the rim light (after the flip, so it sits on the
    screen's upper-left edges)"""
    spec = SPECS[eid]
    if eid == 'ashbound_miner':
        # the lamp in the right hand: a small lantern that throws a warm glow onto the shroud
        H, W = a.shape[:2]
        a = stamp(a, LAMP, {'y': 'gold:3', 'W': 'fire:5', 'k': 'wood:1'}, 2, H - 21, ol='wood:0')
    if eid == 'furnace_construct':
        a = core_disc(a, 53, 27)
    if eid == 'soot_phantom':
        # the cowl's face is lost in the soot: two ember eyes with a red under-glow
        a = stamp(a, ['.fF..Ff.', '.rR..Rr.'], {'f': 'fire:3', 'F': 'fire:5', 'r': 'roof_red:3', 'R': 'roof_red:4'}, 47, 7)
    a = rim(a, spec)
    if eid == 'bellows_specter':
        a = smoke_trail(a)
    return a


def smoke_trail(a):
    """soot-trail wings: ragged ash streamers trail down from the wing's lower edge and tail (dithered, so the
    trail thins out), plus a few glowing cinders; the feet stay clear so the origin does not move"""
    H, W = a.shape[:2]
    out = pad_top(a, 0)
    rng = np.random.RandomState(6)
    op = a[..., 3] > 0.5
    ramp = ['shadow:2', 'stone_cool:2', 'stone_cool:2', 'shadow:1']
    new = np.zeros((H, W), bool)
    # streamers hang from the lowest opaque pixel of columns in the wing region (left 60% of the sprite)
    for x in range(2, int(W * 0.62), 3):
        ys = np.nonzero(op[:, x])[0]
        if not len(ys):
            continue
        y0 = ys.max()
        if y0 > H - 6:
            continue
        ln = int(rng.randint(3, 8))
        for i in range(1, ln + 1):
            y = y0 + i
            if y >= H - 1:
                break
            xx = x + (1 if (i // 2 + x) % 2 else 0)
            if 0 <= xx < W and not op[y, xx] and (i < ln - 2 or (xx + y) % 2 == 0):
                out[y, xx, :3] = col(ramp[min(3, i // 2)]); out[y, xx, 3] = 1
                new[y, xx] = True
    return out


_CACHE = {}


def build():
    if not _CACHE:
        src = load_src('enemies.png')
        for eid in SPECS:
            _CACHE[eid] = make(eid, src)
        import ep3_coils as CO
        for cid, img in CO.base().items():
            _CACHE[cid] = img
    return _CACHE


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames (W6-anim recipes)
def f_slag(img):
    """anim_frames.f_ink_slime in molten orange: the glow flares when it lunges, the edges flash white-orange"""
    from ep2_enemies import f_mercury
    out = f_mercury(img, img.shape[0] / 50.0)
    out['hurt'] = AF.edge_lift(AF.lean(AF.canvas(img), 40, -2, taper=14), 2, prefer=('fire', 'roof_red', 'wood', 'shadow'))
    return out


def f_construct(img):
    """anim_frames.f_tome_golem with the furnace core: the core flares white-orange to strike, dims when hit"""
    from ep2_enemies import f_sentinel
    raw = f_sentinel(img)
    a = AF.canvas(img)
    core = AF.accent_mask(a, (44, 18, 62, 36), min_chroma=0.08, min_L=0.6)
    f, dox = raw['attack'], 0
    raw['attack'] = AF.glow(f, AF.accent_mask(f, (44, 14, 66, 40), min_chroma=0.06, min_L=0.6), 'fire', 0.5, 4)
    h, hdox = raw['hurt']
    blue = np.all(np.abs(h[..., :3] - col('water:1')) < 0.01, -1) & (h[..., 3] > 0.5)
    h[blue, :3] = col('roof_red:1')              # the core goes dull red, not the sentinel's dark blue
    raw['hurt'] = (AF.edge_lift(h, 2, prefer=('wood', 'shadow', 'roof_red', 'gold')), hdox)
    return raw


def pack3(eid, base, raw):
    """anim_frames._pack with an ember death: the dissolve front burns white-orange and the drifting ash is red,
    not the Episode 1 violet"""
    ox, oy = AF.origin_of(base)
    out = {}
    for n, v in raw.items():
        img, dox = (v if isinstance(v, tuple) else (v, 0))
        out[n] = (img, ox + dox, oy)
    seed = sum(ord(c) for c in eid) * 7 + 3
    for i, lv in enumerate(AF.DIE_LEVELS):
        out[f'die_{i}'] = (AF.dissolve(AF.canvas(base), lv, seed, edge='fire:4', ash='roof_red:3'), ox, oy)
    return out


def derived(eid, img):
    from ep2_enemies import f_wraith, f_knight
    if eid == 'cinder_hound':
        from hollow_enemies import f_wolf
        raw = f_wolf(img, 1.0, 0, 0, prefer=('shadow', 'stone_cool', 'roof_red', 'fire', 'wood'))
    elif eid == 'cinder_beetle':
        raw = AF.f_moss_scarab(img, prefer=('shadow', 'stone_cool', 'roof_red', 'fire', 'wood'))
    elif eid == 'slag_slime':
        raw = f_slag(img)
    elif eid == 'ashbound_miner':
        raw = f_wraith(img, 1.0, 'fire', 2, ['fire:4', 'fire:5', 'gold:4'], ('shadow', 'stone_cool', 'roof_red', 'fire'))
    elif eid == 'furnace_construct':
        raw = f_construct(img)
    elif eid == 'soot_phantom':
        raw = f_wraith_ink(img)
    elif eid == 'forge_defender':
        raw = f_knight(img, dy=0, prefer=('wood', 'shadow', 'roof_red', 'gold'))
    elif eid == 'bellows_specter':
        raw = f_specter(img)
    elif eid in ('bellows_coil', 'smelter_coil'):
        import ep3_coils as CO
        raw = CO.derived(eid, img)
    else:
        raw = {}
    return pack3(eid, img, raw)


def f_wraith_ink(img):
    """anim_frames.f_ink_wraith with an ember cast glow"""
    raw = AF.f_ink_wraith(img)
    return raw


def f_specter(img):
    """the roc's wings: idle_1 lifts the wing mass, attack dives forward, hurt recoils; the cast glow (Furnace
    Breath: it draws the draft into its chest) burns ember in the chest and talons and throws sparks"""
    H, W = img.shape[:2]
    I = lambda v: int(round(v))
    a = AF.canvas(img)
    out = {}
    wing = AF.m_rect(a, (0, 0, I(W * 0.56), I(H * 0.82)))
    root = AF.cp(I(W * 0.5), I(H * 0.32))
    out['idle_1'] = AF.move(a, wing, root, angle=-5, keep=True)
    f = AF.move(a, wing, root, angle=7, keep=True)
    out['attack'] = AF.lean(f, I(H * 0.5) + AF.PAD, 4, taper=I(H * 0.5))
    g = AF.lean(AF.canvas(img), I(H * 0.5) + AF.PAD, -3, taper=I(H * 0.5))
    g, dox = AF.squash(g, (I(H * 0.3), I(H * 0.55)), (I(W * 0.3), I(W * 0.6)))
    out['hurt'] = (AF.edge_lift(g, 2, prefer=('shadow', 'stone_warm', 'roof_red', 'fire')), dox)
    f = AF.move(a, wing, root, angle=-9, keep=True)
    m, L, C, h = lch_img(f)
    warm = m & (h > 15) & (h < 125) & (C > 0.07)
    f = AF.glow(f, warm, 'fire', 0.4, 2)
    out['cast'] = AF.sparkles(f, [(I(W * 0.7), -2, 2), (I(W * 0.78), 2, 1), (I(W * 0.6), -4, 1), (I(W * 0.9), 6, 1)],
                              ['fire:4', 'fire:5', 'gold:4'])
    return out


def atlas_frames():
    """[(name, rgba, ox, oy)] for anim_atlas.append: each base frame then its derived frames, in AF.ORDER"""
    out = []
    for eid, img in build().items():
        H, W = img.shape[:2]
        out.append((eid, img, W // 2, H - 1))
        fr = derived(eid, img)
        out += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    return out


ALL_IDS = IDS + ['bellows_coil', 'smelter_coil']
FIELD_RIM = {'cinder_hound': ASH, 'cinder_beetle': EMBER, 'slag_slime': EMBER, 'ashbound_miner': ASH,
             'furnace_construct': BRONZE, 'soot_phantom': ASH, 'forge_defender': BRONZE}


if __name__ == '__main__':
    import sys
    os.makedirs(os.path.join(OUT, 'e3'), exist_ok=True)
    b = base()
    for bg, tag in (((34, 28, 30), 'dark'), ((86, 76, 70), 'ash')):
        contact(list(b.items()), os.path.join(OUT, 'e3', f'enemies_base_4x_{tag}.png'), scale=4, cols=5, bg=bg,
                title='Episode 3 foes (base) at 4x')
    from ep2_enemies import anim_sheet
    import ep2_enemies as E2
    E2.IDS = ALL_IDS
    E2.atlas_frames = atlas_frames
    anim_sheet(os.path.join(OUT, 'e3', 'anim_a_3x.png'), ALL_IDS[:5], scale=3, bg=(34, 28, 30))
    anim_sheet(os.path.join(OUT, 'e3', 'anim_b_3x.png'), ALL_IDS[5:], scale=3, bg=(34, 28, 30))
