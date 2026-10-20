"""The Nameless King (E2-sprites): battle sprites `nameless_king` (veiled) and `nameless_king_unmasked`, with the
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


def veiled(raw):
    a = silver_crown(raw)
    return stamp(a, VEIL, VEIL_LEG, 66, 26)


def unmasked(raw):
    a = silver_crown(raw)
    return stamp(a, FACE, FACE_LEG, *FACE_AT)


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
