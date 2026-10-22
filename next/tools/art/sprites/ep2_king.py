"""The Nameless King (E2-sprites; W12 rework of the head, crown and value groups, see w12_* below): battle sprites `nameless_king` (veiled) and `nameless_king_unmasked`, with the
Episode 1 boss animation set, from ../assets/art/bosses.png cell 1 (pale-blue mirrored armour, a fractured crown,
a glass sword, floating shards) at 1x inside the 160 x 144 boss cell.

  veiled     the hood holds a glass veil: a dark mirror with a cold diagonal sheen (no face shows)
  unmasked   the veil is gone: a tired, grey-bearded face (Elian's features, aged), pale skin, grey brows

Facing: the painting is frontal with the sword on its right hand; the sprite is flipped so the blade sits on the
party's side, like every battle sprite (facing RIGHT).

Derived frames (anim_frames primitives): idle_1 (the cape breathes, the shards bob), attack (the glass sword
swings up and across, the body leans in), hurt (recoil and squash, outline flare), cast (Keeping and Mirror Rain:
the crown and the shards burn white-cyan, sparks), die_0..2 (the dissolve).

    base()                 -> {'nameless_king': rgba, 'nameless_king_unmasked': rgba}
    atlas_frames()         -> [(name, rgba, ox, oy)]
"""
import numpy as np
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import cleanup as CL
import anim_frames as AF
from hollow_enemies import col, outline_new
from ep2_enemies import stamp, gmap, lch_img

TH = 140


def cut():
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 1), keep_frac=0.002, max_dist=60)
    return obj


def recolour(a):
    """cool the painting: saturated blue (the cape, the deep folds) onto water / cloth_blue, the neutral armour
    onto stone_cool and metal (the warm grey speckle of the painted armour would read brown), the few strong
    warm pixels (gilt) onto gold"""
    m, L, C, h = lch_img(a)
    blue = m & (h > 200) & (h < 320) & (C > 0.055)
    warm = m & (h > 40) & (h < 120) & (C > 0.09)
    rest = m & ~blue & ~warm
    a = gmap(a, blue, [(0.0, 'water:0'), (0.16, 'cloth_blue:1'), (0.34, 'cloth_blue:2'), (0.52, 'water:2'),
                       (0.7, 'water:3'), (0.86, 'water:4'), (1.0, 'ice:2')], snap=True)
    a = gmap(a, rest, [(0.0, 'shadow:0'), (0.12, 'shadow:2'), (0.28, 'stone_cool:2'), (0.44, 'stone_cool:3'),
                       (0.6, 'stone_cool:4'), (0.74, 'stone_cool:5'), (0.86, 'ice:2'), (0.95, 'metal:3'), (1.0, 'metal:4')],
             gamma=0.9, snap=True)
    a = gmap(a, warm, [(0.0, 'gold:2'), (1.0, 'gold:4')], snap=True)
    return a


def pixel(obj):
    from ep2_enemies import soften
    tw, th = fit_size(obj, th=TH)
    obj = soften(obj, 1.2)
    d, _ = pixelize2(obj, tw, th, k=18, sharpen=0.0, max_de=0.10, ring=False)
    d = recolour(d)
    d = CL.snap_master(d, 0.05)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 5)
    big = CL.ramp_outline(big)
    return flip_x(big)


VEIL = ['.dddddd.',
        'dddddsDd',
        'ddddsDdd',
        'dddsDddd',
        'ddsDdddd',
        'dsDdddsd',
        'dDdddsDd',
        'ddddsDdd',
        '.ddddddd',
        '..dddd..']
VEIL_LEG = {'d': 'water:0', 'D': 'water:3', 's': 'ice:2'}
FACE = ['.kkkkkk.',
        'kbbkkbbk',
        'kSEssESk',
        'kTSssSsk',
        'kSSnnSsk',
        'kgSSSsgk',
        'gggmmggg',
        'gGgggggg',
        'ggGgggGg',
        '.gggggg.',
        '..gggg..',
        '...gg...']
FACE_LEG = {'k': 'shadow:1', 'b': 'stone_warm:5', 'S': 'skin_light:2', 's': 'skin_light:1', 'T': 'skin_light:3',
            'E': 'ink:1', 'n': 'skin_light:1', 'g': 'stone_warm:4', 'G': 'stone_warm:5', 'm': 'stone_warm:2'}
FACE_AT = (66, 25)


def silver_crown(a):
    """the crown and its tines lift one step toward silver-glass, and three cold gems sit on the band"""
    a = a.copy()
    lift = {'stone_cool:2': 'stone_cool:3', 'stone_cool:3': 'stone_cool:4', 'stone_cool:4': 'stone_cool:5',
            'stone_cool:5': 'metal:3'}
    q = np.round(a[..., :3] * 255).astype(int)
    region = np.zeros(a.shape[:2], bool)
    region[3:24, 52:90] = True
    region &= a[..., 3] > 0.5
    p = np.pad(a[..., 3] > 0.5, 1)
    inner = p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    region &= inner
    src = q.copy()
    for k, v in lift.items():
        c = np.round(col(k) * 255).astype(int)
        m = region & np.all(src == c, -1)
        a[m, :3] = col(v)
    for (x, y) in ((63, 21), (69, 19), (75, 21)):
        if a[y, x, 3] > 0.5:
            a[y, x, :3] = col('magic_cyan:3')
    return a


def veiled_w11(raw):
    a = silver_crown(raw)
    return stamp(a, VEIL, VEIL_LEG, 66, 26)


def unmasked_w11(raw):
    a = silver_crown(raw)
    return stamp(a, FACE, FACE_LEG, *FACE_AT)


# ----------------------------------------------------------------------------- W12 (CRITIQUE_4 item 15)
# The W11 King was a field of single-pixel grey, white and blue speckle (quantisation of the painting), a crown of
# the same speckle, an 8 x 10 dark square for the veil and an 8 x 12 face: nothing for the eye to hold, unlike the
# Archivore's one yellow eye. W12 keeps the painting's silhouette and the sword, and:
#   body   each material (the blue cape, the silver armour) is smoothed and requantised into four value groups with
#          one light from the upper left (a gentle diagonal gradient), so the robe reads as folds, not noise;
#   crown  a clean, outlined five-tine crown of silver glass, the second tine from the right snapped (the fractured
#          crown), three cold gems on the band;
#   head   a silver cowl under the crown, its opening a 13 x 16 dark mirror veil with a cold cyan glow round it and a
#          diagonal sheen (veiled), or a lit, grey-bearded face of the same size (unmasked): the focal point.
HEAD_C = (70.5, 32.0)          # the cowl's centre (sprite pixels, after the flip)


def _ell(H, W, cx, cy, rx, ry):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0, xx, yy


def _ramp_fill(a, m, refs, shade):
    """fill mask m with refs[i] by shade in [0, 1] (len(refs) steps)"""
    k = np.clip((shade * len(refs)).astype(int), 0, len(refs) - 1)
    for i, r in enumerate(refs):
        sel = m & (k == i)
        a[sel, :3] = col(r)
        a[sel, 3] = 1


def _lambert(xx, yy, cx, cy, rx, ry, lx=-0.55, ly=-0.6):
    nx = (xx - cx) / rx
    ny = (yy - cy) / ry
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    L = np.array([lx, ly, 0.58])
    L = L / np.linalg.norm(L)
    return np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)


def w12_body(a):
    """four value groups per material with a light from the upper left (the shards and the sword are kept)"""
    from scipy import ndimage as ndi
    out = a.copy()
    op = a[..., 3] > 0.5
    H, W = op.shape
    lab, n = ndi.label(op, structure=np.ones((3, 3)))
    if n == 0:
        return out
    sizes = ndi.sum(op, lab, range(1, n + 1))
    body = lab == (int(np.argmax(sizes)) + 1)
    p = np.pad(body, 1)
    inner = body & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # the sword (lower right) keeps its crisp painted edge
    x0, y0 = HAND
    x1, y1 = TIP
    dx, dy = x1 - x0, y1 - y0
    nn = np.hypot(dx, dy)
    t = ((xx - x0) * dx + (yy - y0) * dy) / (nn * nn)
    d = ((xx - x0) * dy - (yy - y0) * dx) / nn
    sword = (t >= -0.05) & (t <= 1.05) & (d >= -6) & (d <= 10) & (xx >= 96)
    m, L, C, h = lch_img(a)
    blue = inner & (h > 200) & (h < 320) & (C > 0.05) & ~sword
    grey = inner & ~blue & ~sword
    # smooth the lightness inside each material (speckle averages out), add the upper-left light, requantise
    g = np.clip(((-(xx - W * 0.45)) * 0.6 + (-(yy - H * 0.35))) / (W * 0.9), -1, 1)
    for mask, refs in ((grey, ['shadow:2', 'stone_cool:3', 'stone_cool:5', 'metal:3']),
                       (blue, ['water:0', 'cloth_blue:2', 'water:3', 'ice:2'])):
        if not mask.any():
            continue
        Lm = np.where(mask, L, 0.0)
        # smoothed more along the folds (vertical) than across them, so the long painted folds survive
        w = ndi.gaussian_filter(mask.astype(np.float32), (2.2, 1.0))
        Ls = ndi.gaussian_filter(Lm, (2.2, 1.0)) / np.maximum(w, 1e-4)
        lo, hi = np.percentile(Ls[mask], 4), np.percentile(Ls[mask], 97)
        tt = np.clip((Ls - lo) / max(hi - lo, 1e-3), 0, 1) * 0.84 + 0.08 + 0.16 * g
        _ramp_fill(out, mask, refs, np.clip(tt, 0, 0.999))
    # the brightest glints come back as single highlights (metal:4), so the armour still catches the light
    hot = grey & (L > np.percentile(L[grey], 98.5)) if grey.any() else grey
    out[hot, :3] = col('metal:4')
    return out


# low tines: under a two-line help window (bottom at y 34 on the stage) the band and most of the crown still show
CROWN_TINES = [(61.0, 11.0, 2.6), (65.5, 8.5, 2.6), (70.5, 5.0, 3.0), (75.5, 9.0, 2.6), (80.0, 11.0, 2.6)]
CROWN_BROKEN = 3                # the second tine from the right is snapped half way


def w12_crown(a):
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
    band = (yy >= 16) & (yy < 20.5) & (xx >= 58.5) & (xx < 82.5)
    tines = np.zeros((H, W), bool)
    for i, (tx, ty, hw) in enumerate(CROWN_TINES):
        top = ty if i != CROWN_BROKEN else ty + 4.5
        k = np.clip((yy - ty) / (17 - ty), 0, 1)
        tri = (yy >= top) & (yy < 17) & (np.abs(xx - tx) <= hw * k + 0.6)
        tines |= tri
    crown = band | tines
    # the snapped tine: a jagged break line
    bx, by, _ = CROWN_TINES[CROWN_BROKEN]
    crown[int(by + 4), int(bx)] = False
    out = a.copy()
    # light from the upper left: left faces of the tines and the band's top row light
    shade = np.full((H, W), 0.45)
    for (tx, ty, hw) in CROWN_TINES:
        near = np.abs(xx - tx) <= hw + 1
        shade = np.where(tines & near & (xx < tx), 0.8, shade)
        shade = np.where(tines & near & (xx >= tx + 0.5), 0.3, shade)
    shade = np.where(band & (yy < 17.5), 0.8, shade)
    shade = np.where(band & (yy >= 19.5), 0.1, shade)
    shade = np.where(band & (xx >= 79.5), np.minimum(shade, 0.4), shade)
    _ramp_fill(out, crown, ['stone_cool:3', 'stone_cool:4', 'stone_cool:5', 'metal:3'], np.clip(shade, 0, 0.999))
    lit_edge = crown & ~np.pad(crown, 1)[1:-1, :-2]          # the left edge of every tine and the band catches the light
    out[lit_edge & (yy < 17.5), :3] = col('metal:4')
    # outline
    p = np.pad(crown, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~crown
    out[ring, :3] = col('shadow:0')
    out[ring, 3] = 1
    # three cold gems on the band and a glint on the tallest tine
    for (gx, gy), big in (((63, 18), False), ((70, 17), True), ((77, 18), False)):
        out[gy, gx, :3] = col('magic_cyan:3')
        out[gy + 1, gx, :3] = col('magic_cyan:2')
        if big:
            out[gy, gx + 1, :3] = col('magic_cyan:4')
            out[gy + 1, gx + 1, :3] = col('magic_cyan:3')
    out[8, 70, :3] = col('metal:4')
    return out, crown | ring


def w12_head(a, face):
    """the cowl under the crown and, in its opening, the veil (face=False) or Aurel's face (face=True)"""
    H, W = a.shape[:2]
    out = a.copy()
    cx, cy = HEAD_C
    cowl, xx, yy = _ell(H, W, cx, cy + 1.0, 10.0, 12.6)
    # the hood falls to the shoulders: below the chin line it widens into a cape collar
    flare = (yy > cy + 4) & (yy < cy + 12) & (np.abs(xx - cx) <= 9.6 + (yy - cy - 4) * 0.7)
    cowl = (cowl | flare) & (yy < 43)
    opening, _, _ = _ell(H, W, cx + 0.5, cy + 1.5, 7.2, 9.2)
    inner, _, _ = _ell(H, W, cx + 0.5, cy + 1.6, 6.2, 8.2)
    sh = _lambert(xx, yy, cx, cy + 1.0, 10.0, 12.6)
    sh = np.where(flare & ~_ell(H, W, cx, cy + 1.0, 10.0, 12.6)[0], np.clip(0.55 - (xx - cx) * 0.04 - (yy - cy - 6) * 0.03, 0, 1), sh)
    _ramp_fill(out, cowl & ~opening, ['shadow:1', 'shadow:2', 'stone_cool:2', 'stone_cool:3', 'stone_cool:4'],
               np.clip(sh * 1.05, 0, 0.999))
    # a fold line down the hood's near side
    out[cowl & ~opening & (np.abs((xx - cx) + 7.5 + 0.15 * (yy - cy)) < 0.6) & (yy > cy - 2), :3] = col('shadow:2')
    # the cowl's rim round the opening catches a cold light from the veil
    rim = opening & ~inner
    out[rim, :3] = col('shadow:1')
    out[rim & (yy < cy + 6), :3] = col('magic_cyan:1')
    out[rim & (yy < cy - 2), :3] = col('magic_cyan:2')
    if not face:
        veil = inner
        out[veil, :3] = col('water:0')
        core, _, _ = _ell(H, W, cx + 0.5, cy + 1.2, 4.6, 6.4)
        out[core, :3] = col('cloth_blue:1')
        # the cold glow inside the rim (the mirror's light) and a diagonal sheen across the glass
        glow = inner & ~_ell(H, W, cx + 0.5, cy + 1.6, 5.4, 7.2)[0]
        out[glow & (yy < cy + 4), :3] = col('magic_cyan:2')
        k = (xx - cx) + 0.8 * (yy - cy)
        out[inner & (k > -4.6) & (k < -3.2), :3] = col('ice:2')
        out[inner & (k > -3.2) & (k < -2.4) & (yy < cy), :3] = col('metal:4')
        out[inner & (k > 2.0) & (k < 2.9), :3] = col('water:3')
        # two pale points where eyes would be: the veil looks back
        for ex in (cx - 2.0, cx + 3.0):
            out[int(cy + 0.5), int(ex), :3] = col('ice:3')
    else:
        # Aurel: a lit face (upper-left key light), grey brows, dark eyes, a long grey beard over the chest
        fm, fx, fy = _ell(H, W, cx + 0.5, cy + 0.6, 5.6, 7.4)
        fm &= inner | (fy > cy + 4)
        fs = _lambert(fx, fy, cx + 0.5, cy + 0.6, 5.6, 7.4)
        _ramp_fill(out, fm, ['stone_warm:3', 'skin_light:1', 'skin_light:2', 'skin_light:3'], np.clip(fs * 1.1, 0, 0.999))
        bx = cx + 0.5
        beard = np.zeros((H, W), bool)
        for y in range(int(cy + 3), int(cy + 13)):
            hw = 5.2 - max(0, y - (cy + 6)) * 0.55
            beard[y, int(round(bx - hw)):int(round(bx + hw)) + 1] = True
        beard &= ~(_ell(H, W, cx + 0.5, cy + 2.8, 2.3, 1.4)[0])          # the mouth shows above the beard
        bs = np.clip(0.75 - (xx - bx) * 0.08 - (yy - cy - 3) * 0.03, 0, 0.999)
        _ramp_fill(out, beard, ['stone_cool:3', 'stone_cool:4', 'stone_cool:5', 'metal:3'], bs)
        for (x, y0, y1) in ((int(bx - 3), 5, 8), (int(bx - 1), 6, 11), (int(bx + 1), 4, 9), (int(bx + 3), 6, 8)):
            for y in range(int(cy + y0), int(cy + y1)):                 # a few long strands, not a grid
                if beard[y, x]:
                    out[y, x, :3] = col('stone_cool:3')
        out[beard & (xx < bx - 2) & (yy < cy + 7), :3] = col('metal:3')  # the lit side of the beard
        ey = int(cy - 0.4)
        for ex, lit in ((int(cx - 2.0), True), (int(cx + 3.0), False)):
            out[ey, ex, :3] = col('ink:1')
            out[ey, ex + 1, :3] = col('ink:1') if lit else col('skin_light:0')
            out[ey - 2, ex - 1:ex + 2, :3] = col('stone_cool:5')        # brows, grey
        out[ey + 1, int(cx - 2.0), :3] = col('skin_light:1')            # the tired lid below
        out[int(cy + 1.6), int(cx + 1.0), :3] = col('skin_light:0')     # the nose's shadow side
        out[int(cy + 2.6), int(cx + 0.0):int(cx + 2.0), :3] = col('stone_cool:5')     # moustache
        out[int(cy + 3.2), int(cx - 1.0):int(cx + 3.0), :3] = col('stone_cool:4')
        # the cold glow still frames him: the rim stays lit
    out[cowl | opening, 3] = 1
    p = np.pad(cowl, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~cowl & (a[..., 3] < 0.5)
    out[ring, :3] = col('shadow:0')
    out[ring, 3] = 1
    return out


def w12(raw, face):
    from scipy import ndimage as ndi
    a = w12_body(raw)
    # clear the painted crown and head above the shoulders (the floating shards are separate islands and stay)
    op = a[..., 3] > 0.5
    lab, n = ndi.label(op, structure=np.ones((3, 3)))
    sizes = ndi.sum(op, lab, range(1, n + 1))
    body = lab == (int(np.argmax(sizes)) + 1)
    clear = np.zeros_like(op)
    clear[0:27, 52:90] = True
    a[clear & body] = 0
    a = w12_head(a, face)
    a, _ = w12_crown(a)
    return a


def veiled(raw):
    return w12(raw, face=False)


def unmasked(raw):
    return w12(raw, face=True)


# ----------------------------------------------------------------------------- derived frames
HAND, TIP = (101, 82), (143, 140)       # the glass sword, base pixels of the flipped sprite
CROWN = (52, 3, 90, 26)


def islands(a):
    """the floating shards: every opaque component that is not the body (canvas coordinates)"""
    from scipy import ndimage as ndi
    lab, n = ndi.label(AF.opaque(a), structure=np.ones((3, 3)))
    if n <= 1:
        return []
    sizes = ndi.sum(AF.opaque(a), lab, range(1, n + 1))
    body = int(np.argmax(sizes)) + 1
    return [lab == i for i in range(1, n + 1) if i != body]


def shards_shift(f, comps, fn):
    """move each shard island by fn(i, centre) -> (dx, dy)"""
    for i, m in enumerate(comps):
        ys, xs = np.nonzero(m)
        dx, dy = fn(i, (xs.mean(), ys.mean()))
        if dx or dy:
            part = np.where(m[..., None], f, 0)
            f = np.where(m[..., None], 0, f)
            f = AF.over(AF.shift(part, int(dx), int(dy)), f)
    return f


def blade_mask(a, p0, p1, left, right):
    """opaque pixels in a band along p0-p1 (base coords), `left` px on the lower-left side, `right` px on the
    upper-right side (the painted blade carries a pale edge line on its far side)"""
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    x0, y0 = p0[0] + AF.PAD + 0.5, p0[1] + AF.PAD + 0.5
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    n = np.hypot(dx, dy)
    t = ((xx - x0) * dx + (yy - y0) * dy) / (n * n)
    d = ((xx - x0) * dy - (yy - y0) * dx) / n          # > 0 on the upper-right side
    return (t >= -0.02) & (t <= 1.03) & (d >= -left) & (d <= right) & AF.opaque(a)


def king_frames(img):
    a = AF.canvas(img)
    H, W = img.shape[:2]
    comps = islands(a)
    cx, cy = AF.cp(W // 2, H // 2)
    sword = blade_mask(a, HAND, TIP, 5.0, 9.0) & AF.m_rect(a, (99, 78, W, H))
    out = {}
    # idle_1: the body above the hem lifts 1 px, the shards bob in alternation
    f = AF.rise(a, 112)
    out['idle_1'] = shards_shift(f, comps, lambda i, c: (0, -1 if i % 2 else 1))
    # attack: the glass sword rises high over the party's side, the King leans in, the shards surge forward
    f = AF.move(a, sword, AF.cp(*HAND), angle=-108)
    f = shards_shift(f, comps, lambda i, c: (2 if c[0] > cx else 1, -1))
    out['attack'] = AF.lean(f, 110, 3, taper=40)
    # hurt: recoil, squash, the shards scatter, the outline flares
    f = AF.lean(a, 110, -3, taper=40)
    f = shards_shift(f, comps, lambda i, c: (int(np.sign(c[0] - cx)) * 2 - 1, int(np.sign(c[1] - cy)) * 2))
    f, dox = AF.squash(f, (44, 78), (50, 92))
    out['hurt'] = (AF.edge_lift(f, 2, prefer=('water', 'ice', 'cloth_blue', 'stone_cool', 'metal', 'shadow')), dox)
    # cast (Keeping, Mirror Rain, Cold Mirror): the crown and every shard burn white-cyan, the sword rises
    # a little, sparks gather above the crown
    f = AF.move(a, sword, AF.cp(*HAND), angle=-14)
    f = AF.rise(f, 112)
    glowm = AF.m_rect(f, CROWN)
    for m in islands(f):
        glowm |= m
    f = AF.tone(f, glowm, 'magic_cyan', 1, 4)
    pts = [(71, -4, 2), (60, -1, 1), (82, -2, 1), (66, -8, 1), (78, -9, 2), (30, 10, 1), (112, 14, 2), (20, 60, 1),
           (126, 70, 1), (40, 30, 2), (104, 34, 1)]
    out['cast'] = AF.sparkles(f, pts, ['magic_cyan:4', 'ice:3', 'metal:4'])
    return out


def derived(eid, img):
    return AF._pack(eid, img, king_frames(img))


def atlas_frames():
    out = []
    for eid in ('nameless_king', 'nameless_king_unmasked'):
        img = build()[eid]
        H, W = img.shape[:2]
        out.append((eid, img, W // 2, H - 1))
        fr = derived(eid, img)
        out += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    return out


_CACHE = {}


def build():
    if not _CACHE:
        raw = pixel(cut())
        _CACHE['raw'] = raw
        _CACHE['nameless_king'] = veiled(raw)
        _CACHE['nameless_king_unmasked'] = unmasked(raw)
    return _CACHE


if __name__ == '__main__':
    from gridview import gridview
    b = build()
    contact([(k, b[k]) for k in ('nameless_king', 'nameless_king_unmasked')], os.path.join(OUT, 'e2', 'king_4x.png'),
            scale=4, cols=2, bg=(40, 44, 70))
    from PIL import Image, ImageDraw
    fr = atlas_frames()
    sc = 2
    im = Image.new('RGB', (8 * 190 * sc, 2 * 180 * sc), (40, 44, 70))
    for i, (n, f, ox, oy) in enumerate(fr):
        r, c = (0, i) if i < 8 else (1, i - 8)
        t = upscale(f, sc)
        im.paste(t, ((c * 190 + 95 - ox) * sc, (r * 180 + 170 - oy) * sc), t)
        ImageDraw.Draw(im).text((c * 190 * sc + 4, r * 180 * sc + 4), n, fill=(230, 230, 210))
    im.save(os.path.join(OUT, 'e2', 'king_anim_2x.png'))
