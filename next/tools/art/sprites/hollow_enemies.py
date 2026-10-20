"""Whisperwood Hollow foes with their own battle frames (W8-art). They used to borrow the briar wolf and ink
slime frames at 1.15x and 1.3x (non-integer scaling blurs pixel art) with a flat tint on top.

Each one is cut from the same painting as its kin, downscaled at 1x straight from the painting (so the Alpha
is a clean larger sprite, not an upscale), recoloured with its own ramps, edited by hand-placed pixels, then
put through the shared cleanup (master-palette snap, despeckle, ramp-darkest outline):

  thornback_wolf  enemies.png cell 2 at 60 px (the briar wolf's size): old silver-violet fur, black-green
                  bramble mane, pale bone thorns pushed through the mane and shoulders, gold eye.
  ink_blot        cell 0 at 52 px (the ink slime is 48): tar-black ink with violet gloss, cyan eyes and grin,
                  violet veins, a spreading puddle and drips; rim-lit for the dark stages.
  briar_alpha     cell 2 at 80 px: auburn fur, deep briar green, a crown of gold-tipped thorns, rose hips,
                  gold eyes. The pack leader reads as the same breed as the briar wolf, older and larger.

Every one gets the full W6-anim set (idle_1, attack, hurt, die_0..2) from the briar wolf / ink slime recipes,
scaled to its size, so it moves like its kin.

    base()                      -> {id: rgba}            (facing RIGHT, origin bottom-centre)
    derived(id, img)            -> {suffix: (rgba, ox, oy)}  as anim_frames.derive_enemy
"""
import numpy as np
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import recolor as RC
import cleanup as CL
import anim_frames as AF

IDS = ['thornback_wolf', 'ink_blot', 'briar_alpha']


def col(ref):
    return np.array(hex2rgb(P.color(ref)), np.float32) / 255


def gmap(a, mask, stops, lo_hi=None):
    """gradient map of the masked pixels by OKLab lightness (stretched over their own 2..99 percentile)"""
    out = a.copy()
    sel = mask & (a[..., 3] > 0.5)
    if not sel.any():
        return out
    lab = to_oklab(a[sel][:, :3])
    L = lab[:, 0]
    lo, hi = lo_hi or (np.percentile(L, 2), np.percentile(L, 99))
    t = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1)
    ts = np.array([s[0] for s in stops], np.float32)
    labs = to_oklab(np.array([col(s[1]) for s in stops], np.float32))
    o = np.stack([np.interp(t, ts, labs[:, i]) for i in range(3)], -1)
    out[sel, :3] = np.clip(from_oklab(o), 0, 1)
    return out


def masks_lch(a, gold_h=(55, 110)):
    """hue masks on the quantized painting: the saturated blue mane (the fur's low-chroma violet shadows stay
    fur), the gold eyes / claws (the slime's yellow-green eyes and veins with gold_h=(100, 135)), the rest"""
    m = a[..., 3] > 0.5
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(a.shape[:2] + (3,))
    L = lab[..., 0]; C = np.hypot(lab[..., 1], lab[..., 2]); h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    blue = consolidate(m & (h > 200) & (h < 320) & (C > 0.06), m)
    gold = m & (h > gold_h[0]) & (h < gold_h[1]) & (C > 0.08)
    blue &= ~gold
    return m, blue, gold, ~blue & ~gold & m, L


def consolidate(mask, m, passes=2):
    """majority clean-up of a material mask so the recolour paints regions, not speckle: a mask pixel with
    fewer than 3 mask neighbours (of 8) drops out, a body pixel with 6 or more joins"""
    H, W = mask.shape
    for _ in range(passes):
        p = np.pad(mask, 1).astype(np.int32)
        n = sum(p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
        mask = (mask & (n >= 3)) | (~mask & m & (n >= 6))
    return mask


# ----------------------------------------------------------------------------- recolours
def rc_thornback(a):
    m, blue, gold, fur, L = masks_lch(a)
    a = gmap(a, fur, [(0.0, 'shadow:1'), (0.16, 'shadow:2'), (0.34, 'stone_cool:2'), (0.54, 'stone_cool:3'),
                      (0.74, 'stone_cool:4'), (0.9, 'stone_cool:5'), (1.0, 'metal:3')])
    a = gmap(a, blue, [(0.0, 'foliage_dark:0'), (0.15, 'foliage_dark:1'), (0.45, 'roof_green:2'), (1.0, 'roof_green:3')])
    return a


def rc_alpha(a):
    m, blue, gold, fur, L = masks_lch(a)
    a = gmap(a, fur, [(0.0, 'earth:0'), (0.2, 'wood:1'), (0.42, 'wood:2'), (0.62, 'wood:3'), (0.82, 'wood:4'), (1.0, 'wood:5')])
    a = gmap(a, blue, [(0.0, 'foliage_dark:0'), (0.2, 'foliage_dark:1'), (0.45, 'grass:1'), (0.72, 'grass:2'), (1.0, 'grass:3')])
    return a


def rc_ink(a, eye_box):
    m, blue, gold, rest, L = masks_lch(a, gold_h=(100, 135))
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    x0, y0, x1, y1 = eye_box
    in_eye = (xs >= x0 * W) & (xs < x1 * W) & (ys >= y0 * H) & (ys < y1 * H)
    eyes = gold & in_eye
    veins = gold & ~in_eye
    body = m & ~gold
    a = gmap(a, body, [(0.0, 'ink:1'), (0.36, 'ink:1'), (0.58, 'ink:2'), (0.78, 'ink:3'), (0.9, 'ink:4'),
                       (1.0, 'magic_violet:3')])
    a = gmap(a, eyes, [(0.0, 'magic_cyan:2'), (0.5, 'magic_cyan:3'), (1.0, 'magic_cyan:4')])
    a = gmap(a, veins, [(0.0, 'magic_violet:0'), (0.6, 'magic_violet:1'), (1.0, 'magic_violet:2')])
    return a


SPECS = {
    'thornback_wolf': dict(cell=2, h=60, k=16, rc=rc_thornback, flip=True, eyes=[(93, 233)], eye_col='gold:4'),
    'ink_blot': dict(cell=0, h=52, k=14, rc='ink', eye_box=(0.36, 0.42, 0.7, 0.68)),
    'briar_alpha': dict(cell=2, h=80, k=18, rc=rc_alpha, flip=True, eyes=[(93, 233)], eye_col='gold:5'),
}


# ----------------------------------------------------------------------------- hand edits
def outline_new(img, new, ref):
    """1 px ring of `ref` around the new pixels where it falls on transparency"""
    al = img[..., 3] > 0.5
    p = np.pad(new, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~al
    img[ring, :3] = col(ref); img[ring, 3] = 1
    return img


THORNS = {   # backward-hooked thorns, anchored at their bottom-right pixel on the mane edge; T tip, b body, d shade
    2: ['T.', 'bd'],
    3: ['T..', '.bd', '.bd'],
    4: ['T...', '.T..', '.bbd', '..bd'],
}


def thorns(img, region, spacing, sizes, ref, ol_ref, seed=1, xr=(0.0, 1.0), extra=()):
    """Thorns pushed through the top edge of `region` (the mane), leaning back toward the tail (the sprite
    faces right). Spacing jitters by +-2 px and sizes cycle through `sizes` so they never read as a fence.
    `extra`: (x, y, size) thorns placed anywhere (through the shoulder or flank). ref: {'T','b','d'} refs."""
    H, W = img.shape[:2]
    al = img[..., 3] > 0.5
    new = np.zeros((H, W), bool)
    rng = np.random.RandomState(seed)
    xs = [x for x in range(W) if region[:, x].any()]
    if not xs:
        return img
    lo, hi = xs[0] + int((xs[-1] - xs[0]) * xr[0]), xs[0] + int((xs[-1] - xs[0]) * xr[1])
    spots = []
    x = lo + rng.randint(0, spacing)
    i = 0
    while x <= hi:
        ys = np.nonzero(region[:, x])[0]
        if len(ys):
            spots.append((x, int(ys.min()), sizes[(i + rng.randint(0, 2)) % len(sizes)]))
            i += 1
        x += spacing + rng.randint(-2, 3)
    spots += list(extra)

    def stamp(x, y, n, over):
        g = THORNS[n]
        h, w = len(g), len(g[0])
        for j, row in enumerate(g):
            for k, ch in enumerate(row):
                if ch == '.':
                    continue
                yy, xx = y - (h - 1) + j - 1, x - (w - 1) + k
                if 0 <= yy < H and 0 <= xx < W and (over or not al[yy, xx]):
                    img[yy, xx, :3] = col(ref[ch]); img[yy, xx, 3] = 1
                    new[yy, xx] = True
    for (x, y, n) in spots:
        stamp(x, y, n, over=False)
    for (x, y, n) in extra:
        stamp(x, y, n, over=True)
    # outline: a ring in ol_ref on transparency around every thorn; a placed-over thorn (through the body) also
    # gets the ring where it sits on the body, so it reads as driven through the fur
    p = np.pad(new, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~new
    through = np.zeros((H, W), bool)
    for (x, y, n) in extra:
        through[max(0, y - 6):y + 2, max(0, x - 6):x + 2] = True
    ring &= ~al | through
    img[ring, :3] = col(ol_ref); img[ring, 3] = 1
    return img


def mane_mask(img, ramps):
    """pixels whose colour belongs to one of `ramps` (by exact master colour)"""
    cols = {tuple(np.round(col(f'{r}:{i}') * 255).astype(int)) for r in ramps for i in range(len(P.ramp(r)))}
    q = np.round(img[..., :3] * 255).astype(int)
    m = np.zeros(img.shape[:2], bool)
    for c in cols:
        m |= np.all(q == np.array(c), -1)
    return m & (img[..., 3] > 0.5)


def rose_hips(img, region, pts):
    """small red berries (2 px, lit pixel up-left) on the briar"""
    for (x, y) in pts:
        if region[y, x]:
            img[y, x, :3] = col('roof_red:4'); img[y, x, 3] = 1
            img[y, x + 1, :3] = col('roof_red:3'); img[y, x + 1, 3] = 1
            img[y + 1, x, :3] = col('roof_red:2'); img[y + 1, x, 3] = 1
    return img


def puddle_and_drips(img):
    """ink blot: widen the base into a glossy puddle and hang two drips off the raised tendrils"""
    H, W = img.shape[:2]
    al = img[..., 3] > 0.5
    ys = np.nonzero(al.any(1))[0]
    bot = ys.max()
    cols = np.nonzero(al[bot - 1])[0]
    x0, x1 = cols.min(), cols.max()
    pad = 3
    out = blank(W + 2 * pad, H)
    out[:, pad:pad + W] = img
    # puddle: two rows, wider than the body, lit lip on top, outline below
    L, R = x0 + pad - 3, x1 + pad + 3
    for x in range(L, R + 1):
        for y, ref in ((bot - 1, 'ink:2'), (bot, 'ink:1')):
            if out[y, x, 3] < 0.5:
                out[y, x, :3] = col(ref); out[y, x, 3] = 1
    for x in range(L + 1, R):
        if out[bot - 2, x, 3] < 0.5:
            out[bot - 1, x, :3] = col('ink:3')       # the lip catches light where it shows past the body
    out[bot - 1, L, :3] = col('ink:0'); out[bot - 1, R, :3] = col('ink:0')
    return out, pad


def drip(img, x, y, n, ol='ink:0'):
    """a hanging drop below (x, y): n px of ink, a glossy bead at the end"""
    new = np.zeros(img.shape[:2], bool)
    for i in range(1, n + 1):
        yy = y + i
        if img[yy, x, 3] > 0.5:
            continue
        img[yy, x, :3] = col('ink:3' if i < n else 'magic_violet:2'); img[yy, x, 3] = 1
        new[yy, x] = True
    return outline_new(img, new, ol)


# ----------------------------------------------------------------------------- build
def make(eid, src):
    spec = SPECS[eid]
    obj = main_object(grid_cell(src, 4, 2, spec['cell']), keep_frac=0.04, max_dist=40)
    tw, th = fit_size(obj, th=spec['h'])
    d, _ = pixelize2(obj, tw, th, k=spec['k'], sharpen=0.0, max_de=0.10, ring=False)
    if spec['rc'] == 'ink':
        d = rc_ink(d, spec['eye_box'])
    else:
        d = spec['rc'](d)
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 6)
    big = CL.ramp_outline(big)
    if spec.get('eyes'):
        oh, ow = obj.shape[:2]
        ec = col(spec['eye_col'])
        dark = col('ink:0')
        for sx, sy in spec['eyes']:
            x = int(round(sx * tw / ow)) + 1
            y = int(round(sy * th / oh)) + 1
            big[y, x, :3] = ec; big[y, x, 3] = 1
            big[y, x - 1, :3] = ec * 0.8; big[y, x - 1, 3] = 1
            big[y - 1, x - 1:x + 1, :3] = dark
            big[y + 1, x, :3] = dark
    if spec.get('flip'):
        big = flip_x(big)
    return finish(eid, big)


def finish(eid, a):
    """per-foe hand edits on the right-facing sprite. Returns (img, (dx, dy)): where the generator canvas sits
    inside the result (rows added on top for thorns, columns for the puddle), so the anim recipes can be
    shifted to match."""
    if eid == 'thornback_wolf':
        a = pad_top(a, 3)
        mane = mane_mask(a, ('foliage_dark', 'roof_green'))
        bone = {'T': 'stone_warm:5', 'b': 'stone_warm:4', 'd': 'stone_warm:3'}
        a = thorns(a, mane, 6, (3, 4, 3, 2), bone, 'shadow:1', seed=3, xr=(0.0, 0.8),
                   extra=((42, 31, 4), (26, 36, 3)))
        a = CL.rim_light(a, prefer=('foliage_dark', 'roof_green', 'shadow', 'stone_cool'), max_L=0.36,
                         lift={'foliage_dark': 2, 'roof_green': 1, 'shadow': 2})
        return a, (0, 3)
    if eid == 'briar_alpha':
        a = pad_top(a, 4)
        mane = mane_mask(a, ('foliage_dark', 'grass'))
        gold = {'T': 'gold:4', 'b': 'wood:3', 'd': 'wood:2'}
        a = thorns(a, mane, 6, (4, 3, 4, 3), gold, 'earth:0', seed=5, xr=(0.0, 0.85))
        H, W = a.shape[:2]
        ys, xs = np.nonzero(mane)
        rng = np.random.RandomState(11)
        cand = [(x, y) for y, x in zip(ys, xs) if 2 < x < W - 3 and 2 < y < H - 3 and mane[y + 1, x] and mane[y, x + 1]
                and mane[y - 1, x] and mane[y, x - 1]]
        pick = [cand[i] for i in rng.choice(len(cand), min(7, len(cand)), replace=False)] if cand else []
        a = rose_hips(a, mane, pick)
        return a, (0, 4)
    if eid == 'ink_blot':
        a, pad = puddle_and_drips(a)
        H, W = a.shape[:2]
        for fx, n in ((0.84, 3), (0.2, 2), (0.66, 2)):
            x = int(round(fx * W))
            col_ = a[:int(H * 0.55), x, 3] > 0.5
            ys = np.nonzero(col_)[0]
            if len(ys):
                y = ys.max()
                if y + n + 2 < H and not (a[y + 1:y + n + 2, x, 3] > 0.5).any():
                    a = drip(a, x, y, n)
        a = CL.lift_darkest(a, 'ink')
        a = CL.rim_light(a, prefer=('ink', 'shadow', 'magic_violet'), lift={'ink': 3})
        return a, (pad, 0)
    return a, (0, 0)


def pad_top(a, n):
    H, W = a.shape[:2]
    out = blank(W, H + n)
    out[n:] = a
    return out


def trim_rgba(a):
    op = a[..., 3] > 0.5
    ys, xs = np.nonzero(op)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()


_CACHE = {}


def build():
    """{id: (rgba, (dx, dy))}"""
    if not _CACHE:
        src = load_src('enemies.png')
        for eid in IDS:
            _CACHE[eid] = make(eid, src)
    return _CACHE


def base():
    return {eid: v[0] for eid, v in build().items()}


# ----------------------------------------------------------------------------- W6-anim frames, scaled recipes
def _xf(k, dx, dy):
    X = lambda x: x * k + dx
    Y = lambda y: y * k + dy
    R = lambda r: tuple(int(round(v)) for v in (X(r[0]), Y(r[1]), X(r[2]), Y(r[3])))
    Pt = lambda x, y: AF.cp(X(x), Y(y))
    return X, Y, R, Pt


def f_wolf(base, k, dx, dy, prefer=None):
    """anim_frames.f_briar_wolf with every base coordinate mapped by (x * k + dx, y * k + dy)"""
    X, Y, R, Pt = _xf(k, dx, dy)
    a = AF.canvas(base)
    out = {}
    head = AF.m_poly(a, [(X(x), Y(y)) for x, y in [(40, 10), (66, 10), (66, 46), (44, 46), (40, 30)]])
    front = AF.m_rect(a, R((36, 44, 62, 62)))
    out['idle_1'] = AF.rise(a, int(round(Y(42))))
    f = AF.move(a, front, Pt(44, 44), angle=-14)
    f = AF.move(f, head, Pt(44, 16), angle=10, keep=True)
    out['attack'] = AF.lean(f, int(round(Y(46))), int(round(3 * k)), taper=int(round(16 * k)))
    f = AF.move(a, head, Pt(44, 34), angle=-8, keep=True)
    f = AF.lean(f, int(round(Y(46))), -int(round(2 * k)), taper=int(round(16 * k)))
    rows = tuple(int(round(Y(v))) for v in (14, 30))
    cols = tuple(int(round(X(v))) for v in (16, 40))
    if k > 1.2:   # the Alpha is bigger: it squashes by two rows and two columns, like a heavier body
        rows += tuple(int(round(Y(v))) for v in (22,))
        cols += tuple(int(round(X(v))) for v in (28,))
    f, dox = AF.squash(f, rows, cols)
    f = AF.eyes_closed(f, R((44, 28, 58, 42)))
    out['hurt'] = (AF.edge_lift(f, 2, prefer=prefer) if prefer else AF.edge_lift(f, 2), dox)
    return out


def f_blot(base, k, dx, dy):
    """anim_frames.f_ink_slime, mapped; the puddle rows stay planted"""
    X, Y, R, Pt = _xf(k, dx, dy)
    a = AF.canvas(base)
    H = base.shape[0]
    foot = AF.cp(X(25), H - 1)
    eyes = R((18, 20, 34, 33))
    out = {}
    f = AF.xform(a, (foot[0], foot[1] + 0.5), sx=0.96, sy=1.05)
    f[AF.cy_(H - 6):] = a[AF.cy_(H - 6):]
    out['idle_1'] = f
    f = AF.xform(a, (Pt(6, 0)[0], foot[1] + 0.5), sx=1.10, sy=0.90)
    f[AF.cy_(H - 2):] = a[AF.cy_(H - 2):]
    out['attack'] = AF.lean(f, int(round(Y(40))), 3, taper=14)
    f = AF.xform(a, (foot[0], foot[1] + 0.5), sx=1.08, sy=0.88)
    f = AF.lean(f, int(round(Y(44))), -2, taper=14)
    f = AF.eyes_closed(f, (eyes[0], eyes[1] + 3, eyes[2], eyes[3] + 4), min_chroma=0.06, min_L=0.5)
    out['hurt'] = AF.edge_lift(f, 2, prefer=('ink', 'magic_violet', 'shadow'))
    return out


def derived(eid, img, off):
    dx, dy = off
    if eid == 'thornback_wolf':
        raw = f_wolf(img, 1.0, dx, dy, prefer=('stone_cool', 'shadow', 'foliage_dark', 'roof_green', 'stone_warm'))
    elif eid == 'briar_alpha':
        k = (img.shape[0] - dy) / 62.0
        raw = f_wolf(img, k, dx, dy, prefer=('wood', 'earth', 'foliage_dark', 'grass', 'gold'))
    else:
        k = img.shape[0] / 50.0
        raw = f_blot(img, k, dx, dy)
    return AF._pack(eid, img, raw)


def atlas_frames():
    """[(name, rgba, ox, oy)] for anim_atlas.append: each base frame then its derived frames, in AF.ORDER"""
    out = []
    for eid, (img, off) in build().items():
        H, W = img.shape[:2]
        out.append((eid, img, W // 2, H - 1))
        fr = derived(eid, img, off)
        out += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    return out
