"""Derived battle animation frames for the painted enemies and bosses (W6-anim).

Every frame is built deterministically from the enemy's single base frame, the way Chrono Trigger and FF6
enemies move: the body rises 1 px to breathe, leans and reaches to attack, squashes and recoils when hit,
raises its arms and glows to cast, and crumbles from the top as it dies. Limbs, wings, horns and blades are
moved as rigid PARTS with RotSprite-style sampling (the part is upscaled 8x with Scale2x/EPX, rotated or
scaled there, and sampled back at 1x), so a rotated wing keeps clean single-pixel lines instead of the jaggies
of a plain nearest-neighbour rotation.

    frames = derive(eid, base)          -> {suffix: (rgba, ox, oy)}   (suffixes: idle_1, attack, hurt, cast,
                                                                         die_0..2, plus boss extras)

Coordinates in the recipes are BASE-frame pixels (what out/w6tmp/view10.py prints); every derived frame is
drawn on a canvas padded by PAD (PADB below) so moved parts never clip; the build trims it again and keeps the
origin (bottom-centre of the base) so derived frames line up with the base pixel for pixel.
Angles are degrees, positive = clockwise on screen. The sprites face RIGHT, toward the party.
"""
import numpy as np
from PIL import Image, ImageDraw
from pix import blank, hex2rgb, to_oklab
import pal as P
import cleanup as CL

PAD, PADB = 16, 2


def col(ref):
    return np.array(hex2rgb(P.color(ref)), np.float32) / 255


# ----------------------------------------------------------------------------- canvas and coordinates
def canvas(base):
    """base on a padded canvas (PAD left, right and top, PADB below: the feet keep their row)."""
    H, W = base.shape[:2]
    out = blank(W + 2 * PAD, H + PAD + PADB)
    out[PAD:PAD + H, PAD:PAD + W] = base
    return out


def origin_of(base):
    H, W = base.shape[:2]
    return (W // 2 + PAD, H - 1 + PAD)


def cp(x, y):
    """base point -> canvas point (pixel centre)"""
    return (x + PAD + 0.5, y + PAD + 0.5)


def cy_(y):
    return y + PAD


def opaque(a):
    return a[..., 3] > 0.5


def m_rect(a, rect):
    x0, y0, x1, y1 = rect
    m = np.zeros(a.shape[:2], bool)
    m[max(0, y0 + PAD):max(0, y1 + PAD), max(0, x0 + PAD):max(0, x1 + PAD)] = True
    return m & opaque(a)


def m_poly(a, pts):
    H, W = a.shape[:2]
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([(x + PAD, y + PAD) for x, y in pts], fill=255, outline=255)
    return (np.asarray(im) > 0) & opaque(a)


def m_line(a, p0, p1, r):
    """opaque pixels within r of the segment p0-p1 (a blade)"""
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    x0, y0 = p0[0] + PAD, p0[1] + PAD
    x1, y1 = p1[0] + PAD, p1[1] + PAD
    dx, dy = x1 - x0, y1 - y0
    t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / max(1e-6, dx * dx + dy * dy), 0, 1)
    d = np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy))
    return (d <= r) & opaque(a)


def lab_of(a):
    H, W = a.shape[:2]
    return to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)


# ----------------------------------------------------------------------------- RotSprite-style transform
def to_ids(a):
    """(ids HxW, palette Nx4) with id 0 = transparent"""
    op = opaque(a)
    q = np.round(a[..., :3] * 255).astype(np.int64)
    key = np.where(op, ((q[..., 0] << 16) | (q[..., 1] << 8) | q[..., 2]) + 1, 0)
    uniq, inv = np.unique(key, return_inverse=True)
    inv = inv.reshape(op.shape)
    if uniq[0] != 0:
        uniq = np.concatenate([[0], uniq])
        inv = inv + 1
    pal = np.zeros((len(uniq), 4), np.float32)
    k = uniq[1:] - 1
    pal[1:, 0] = ((k >> 16) & 255) / 255
    pal[1:, 1] = ((k >> 8) & 255) / 255
    pal[1:, 2] = (k & 255) / 255
    pal[1:, 3] = 1
    return inv.astype(np.int32), pal


def scale2x(ids):
    """EPX / Scale2x on an id image"""
    p = np.pad(ids, 1, mode='edge')
    E = ids
    A, B, C, D = p[:-2, 1:-1], p[1:-1, 2:], p[1:-1, :-2], p[2:, 1:-1]   # up, right, left, down
    e0 = np.where((C == A) & (C != D) & (A != B), A, E)
    e1 = np.where((A == B) & (A != C) & (B != D), B, E)
    e2 = np.where((D == C) & (D != B) & (C != A), C, E)
    e3 = np.where((B == D) & (B != A) & (D != C), D, E)
    H, W = ids.shape
    out = np.empty((H * 2, W * 2), ids.dtype)
    out[0::2, 0::2] = e0
    out[0::2, 1::2] = e1
    out[1::2, 0::2] = e2
    out[1::2, 1::2] = e3
    return out


def shift(a, dx, dy):
    H, W = a.shape[:2]
    out = np.zeros_like(a)
    xs0, xs1 = max(0, -dx), min(W, W - dx)
    ys0, ys1 = max(0, -dy), min(H, H - dy)
    if xs1 > xs0 and ys1 > ys0:
        out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = a[ys0:ys1, xs0:xs1]
    return out


def xform(a, pivot, angle=0.0, sx=1.0, sy=1.0, tx=0, ty=0):
    """p' = pivot + R(angle) * S * (p - pivot) + t, sampled from an 8x Scale2x upscale (RotSprite)."""
    if angle == 0 and sx == 1 and sy == 1 and float(tx).is_integer() and float(ty).is_integer():
        return shift(a, int(tx), int(ty))
    H, W = a.shape[:2]
    ids, pal = to_ids(a)
    big = scale2x(scale2x(scale2x(ids)))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    cx, cy = pivot
    X = xx + 0.5 - cx - tx
    Y = yy + 0.5 - cy - ty
    t = np.radians(angle)
    c, s = np.cos(t), np.sin(t)
    u = (c * X + s * Y) / sx
    v = (-s * X + c * Y) / sy
    ix = np.floor((u + cx) * 8).astype(np.int64)
    iy = np.floor((v + cy) * 8).astype(np.int64)
    ok = (ix >= 0) & (iy >= 0) & (ix < W * 8) & (iy < H * 8)
    out = np.zeros((H, W), np.int32)
    out[ok] = big[iy[ok], ix[ok]]
    return pal[out]


def over(top, bottom):
    m = opaque(top)[..., None]
    return np.where(m, top, bottom)


def heal(img, holes, min_nb=5, passes=3):
    """fill hole pixels that sit inside the silhouette (min_nb of 8 neighbours opaque) with their most common
    opaque neighbour colour; holes on the outside stay transparent"""
    out = img.copy()
    H, W = out.shape[:2]
    for _ in range(passes):
        op = opaque(out)
        todo = holes & ~op
        if not todo.any():
            break
        p = np.pad(op, 1)
        nb = sum(p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx].astype(int) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
        cand = todo & (nb >= min_nb)
        if not cand.any():
            break
        src = out.copy()
        for y, x in zip(*np.nonzero(cand)):
            cols = {}
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if (dy or dx) and 0 <= yy < H and 0 <= xx < W and src[yy, xx, 3] > 0.5:
                        k = tuple(np.round(src[yy, xx, :3] * 255).astype(int))
                        cols[k] = cols.get(k, 0) + 1
            if cols:
                best = max(cols.items(), key=lambda kv: kv[1])[0]
                out[y, x, :3] = np.array(best, np.float32) / 255
                out[y, x, 3] = 1
    return out


def dilate(m, k):
    out = m.copy()
    H, W = m.shape
    for _ in range(k):
        p = np.pad(out, 1)
        out = out | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return out


def move(a, mask, pivot, angle=0.0, sx=1.0, sy=1.0, tx=0, ty=0, behind=False, fix=True, keep=False, fill=None, seam=0):
    """Move the masked pixels as one rigid part. behind=True draws it under the rest (a wing behind a body).
    Pixels the part vacates inside the silhouette are healed from their neighbours; keep=True leaves the
    original pixels under the moved part instead (a head or horn that turns over its own body); seam=k keeps the
    part's pixels within k px of the body under it (wings)."""
    m = mask[..., None]
    part = np.where(m, a, 0)
    rest = a if keep else np.where(m, 0, a)
    moved = xform(part, pivot, angle, sx, sy, tx, ty)
    if seam:
        # the part's own pixels within `seam` px of the rest of the body stay under it, so a turned wing never
        # opens a slit at its root
        ghost = mask & dilate(opaque(a) & ~mask, seam)
        moved = over(moved, np.where(ghost[..., None], a, 0))
    out = over(rest, moved) if behind else over(moved, rest)
    if fix:
        out = heal(out, mask)
    if fill is not None:
        out = heal(out, fill & opaque(a), min_nb=2, passes=24)
    return out


# ----------------------------------------------------------------------------- whole-body primitives
def rise(a, seam, dy=-1):
    """breathe / crouch: everything above base row `seam` moves dy rows. Rising, the rows just above the seam
    keep their pixels (the body's lower edge stretches 1 px, so the legs stay attached); crouching, the body
    settles over the top of the legs."""
    y = cy_(seam)
    out = a.copy()
    if dy < 0:
        d = -dy
        out[:y - d] = a[d:y]
    else:
        up = a[:y].copy()
        out[:y] = 0
        reg = out[dy:y + dy]
        out[dy:y + dy] = np.where(opaque(up)[..., None], up, reg)
    return out


def lean(a, hip, dx, taper=8):
    """shear: rows above base row `hip` slide dx, tapering to 0 over `taper` rows above the hip"""
    out = a.copy()
    H, W = a.shape[:2]
    y_end = cy_(hip)
    for y in range(0, min(H, y_end)):
        k = min(1.0, (y_end - y) / float(max(1, taper)))
        d = int(round(dx * k))
        if d == 0:
            continue
        row = a[y]
        out[y] = 0
        if d > 0:
            out[y, d:] = row[:W - d]
        else:
            out[y, :W + d] = row[-d:]
    return out


def squash(a, rows, cols):
    """drop the listed base rows (the body above settles, feet planted) and double the listed base columns (the
    body widens). Returns (image, origin_dx)."""
    H, W = a.shape[:2]
    drop = {cy_(r) for r in rows}
    keep = [r for r in range(H) if r not in drop]
    b = blank(W, H)
    b[H - len(keep):] = a[keep]
    dup = {c + PAD for c in cols}
    idx = []
    for x in range(W):
        idx.append(x)
        if x in dup:
            idx.append(x)
    out = b[:, idx]
    return out, sum(1 for c in dup if c < W // 2)


def edge_lift(a, steps=2, prefer=('ink', 'shadow', 'stone_cool', 'earth', 'wood', 'hair_violet', 'grass', 'foliage_dark')):
    """hurt: every outline pixel moves `steps` up its own ramp, so the silhouette flares for the hit"""
    out = a.copy()
    al = opaque(a)
    H, W = al.shape
    p = np.pad(al, 1)
    edge = al & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    cache = {}
    for y, x in zip(*np.nonzero(edge)):
        key = tuple(np.round(a[y, x, :3] * 255).astype(int))
        if key not in cache:
            r = CL._ramp_of(a[y, x, :3], prefer)
            if r is None:
                cache[key] = None
            else:
                name, k, n = r
                cache[key] = np.array(hex2rgb(P.ramp(name)[min(n - 1, k + steps)]), np.float32) / 255
        if cache[key] is not None:
            out[y, x, :3] = cache[key]
    return out


def accent_mask(a, rect=None, min_chroma=0.10, min_L=0.45):
    lab = lab_of(a)
    C = np.hypot(lab[..., 1], lab[..., 2])
    m = opaque(a) & (C > min_chroma) & (lab[..., 0] > min_L)
    if rect is not None:
        m &= m_rect(a, rect)
    return m


def eyes_closed(a, rect, min_chroma=0.10, min_L=0.45):
    """bright saturated pixels in rect (eyes, glints) take the most common colour of their dark neighbours"""
    out = a.copy()
    m = accent_mask(a, rect, min_chroma, min_L)
    H, W = a.shape[:2]
    al = opaque(a)
    for y, x in zip(*np.nonzero(m)):
        cols = {}
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if (dy or dx) and 0 <= yy < H and 0 <= xx < W and al[yy, xx] and not m[yy, xx]:
                    key = tuple(np.round(a[yy, xx, :3] * 255).astype(int))
                    cols[key] = cols.get(key, 0) + 1
        if cols:
            best = min(cols.items(), key=lambda kv: (-kv[1], sum(kv[0])))[0]
            out[y, x, :3] = np.array(best, np.float32) / 255
    return out


def glow(a, mask, ramp='magic_cyan', min_L=0.55, min_step=2):
    """cast: the light pixels in mask move onto a magic ramp, matched by lightness, never below min_step"""
    out = a.copy()
    lab = lab_of(a)
    steps = [np.array(hex2rgb(h), np.float32) / 255 for h in P.ramp(ramp)]
    sl = [to_oklab(s.reshape(1, 3))[0, 0] for s in steps]
    sel = mask & opaque(a) & (lab[..., 0] > min_L)
    for y, x in zip(*np.nonzero(sel)):
        j = int(np.argmin([abs(lab[y, x, 0] - s) for s in sl]))
        out[y, x, :3] = steps[max(min_step, j)]
    return out


def tone(a, mask, ramp, lo=0, hi=None):
    """recolour the masked pixels onto `ramp` by lightness rank (steps lo..hi)"""
    out = a.copy()
    r = P.ramp(ramp)
    hi = len(r) - 1 if hi is None else hi
    lab = lab_of(a)
    sel = mask & opaque(a)
    if not sel.any():
        return out
    L = lab[..., 0][sel]
    lo_L, hi_L = np.percentile(L, 5), np.percentile(L, 95)
    k = np.clip((L - lo_L) / max(1e-6, hi_L - lo_L), 0, 1)
    idx = np.round(lo + k * (hi - lo)).astype(int)
    cols = np.array([hex2rgb(h) for h in r], np.float32) / 255
    out[sel, :3] = cols[idx]
    return out


def sparkles(a, pts, colors):
    """single pixels (size 2: a plus) at base points, cycling colors"""
    out = a.copy()
    H, W = a.shape[:2]
    for i, p in enumerate(pts):
        x, y = p[0] + PAD, p[1] + PAD
        size = p[2] if len(p) > 2 else 1
        c = col(colors[i % len(colors)])
        cells = [(x, y)] if size == 1 else [(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
        for cx, cy in cells:
            if 0 <= cx < W and 0 <= cy < H:
                out[cy, cx, :3] = c
                out[cy, cx, 3] = 1
    return out


def dissolve(a, level, seed, edge='magic_violet:3', ash='magic_violet:2'):
    """Death step: a ragged wavefront eats the sprite from the top (0 = intact, 1 = gone). The pixels on the
    front burn bright, and a few eaten pixels drift up as ash. Same seed for every level, so the steps are
    monotonic: what is gone stays gone."""
    H, W = a.shape[:2]
    op = opaque(a)
    ys = np.nonzero(op.any(1))[0]
    top, bot = ys.min(), ys.max()
    rng = np.random.RandomState(seed)
    fine = rng.rand(H, W)
    coarse = np.repeat(np.repeat(rng.rand(H // 2 + 1, W // 2 + 1), 2, 0), 2, 1)[:H, :W]
    noise = 0.5 * fine + 0.5 * coarse
    yn = (np.arange(H, dtype=np.float32)[:, None] - top) / float(max(1, bot - top))
    t = yn * 0.72 + noise * 0.28
    gone = op & (t < level)
    front = op & ~gone & (t < level + 0.035)
    out = a.copy()
    out[gone] = 0
    out[front, :3] = col(edge)
    # ash: a few eaten pixels just behind the front float 2-5 px up
    band = gone & (t > level - 0.08)
    ys2, xs2 = np.nonzero(band)
    pick = rng.rand(len(ys2)) < 0.12
    lift = rng.randint(2, 6, len(ys2))
    ac = col(ash)
    for y, x, ok, d in zip(ys2, xs2, pick, lift):
        if ok and y - d >= 0 and not opaque(out[y - d:y - d + 1, x:x + 1])[0, 0]:
            out[y - d, x, :3] = ac
            out[y - d, x, 3] = 1
    return out


DIE_LEVELS = (0.2, 0.38, 0.56)


def die_frames(a, eid):
    seed = sum(ord(c) for c in eid) * 7 + 3
    return [dissolve(a, lv, seed) for lv in DIE_LEVELS]


# ----------------------------------------------------------------------------- enemies
def f_ink_slime(base):
    a = canvas(base)
    H = base.shape[0]
    foot = cp(25, H - 1)
    eyes = (18, 20, 34, 33)
    out = {}
    f = xform(a, (foot[0], foot[1] + 0.5), sx=0.96, sy=1.05)
    f[cy_(H - 5):] = a[cy_(H - 5):]          # the base rows stay planted: only the body swells
    out['idle_1'] = f
    f = xform(a, (cp(6, 0)[0], foot[1] + 0.5), sx=1.10, sy=0.90)
    out['attack'] = lean(f, 40, 3, taper=14)
    f = xform(a, (foot[0], foot[1] + 0.5), sx=1.08, sy=0.88)
    f = lean(f, 44, -2, taper=14)
    f = eyes_closed(f, (eyes[0], eyes[1] + 3, eyes[2], eyes[3] + 4))
    out['hurt'] = edge_lift(f, 2, prefer=('grass', 'foliage_dark', 'roof_green', 'ink', 'shadow'))
    return out


def f_page_wraith(base):
    a = canvas(base)
    out = {}
    rags = m_rect(a, (16, 46, 70, 74))
    arm_r = m_rect(a, (52, 22, 70, 40))
    arm_l = m_poly(a, [(0, 2), (30, 2), (30, 48), (0, 48)]) & ~m_rect(a, (26, 0, 52, 24))
    f = move(a, rags, cp(36, 44), angle=4)
    out['idle_1'] = move(f, arm_r, cp(52, 30), angle=-4)
    f = move(a, arm_r, cp(52, 30), angle=8, tx=4)
    out['attack'] = xform(f, cp(35, 73), angle=8)
    f = xform(a, cp(35, 73), angle=-7)
    f, dox = squash(f, (18, 36), (24, 46))
    f = eyes_closed(f, (36, 6, 52, 18), min_chroma=0.06, min_L=0.55)
    out['hurt'] = (edge_lift(f, 2), dox)
    f = move(a, arm_l, cp(30, 22), ty=-2)
    f = move(f, arm_r, cp(52, 30), angle=-34)
    f = glow(f, m_rect(f, (36, 0, 54, 20)) | m_rect(f, (56, 0, 80, 30)), 'magic_cyan', 0.62, 2)
    out['cast'] = sparkles(f, [(40, -4, 2), (52, -2, 1), (30, -6, 1), (64, 2, 2), (6, 0, 1), (46, -8, 1)], ['magic_cyan:4', 'magic_cyan:3'])
    return out


def f_briar_wolf(base):
    a = canvas(base)
    out = {}
    head = m_poly(a, [(40, 10), (66, 10), (66, 46), (44, 46), (40, 30)])
    front = m_rect(a, (36, 44, 62, 62))
    out['idle_1'] = rise(a, 42)
    f = move(a, front, cp(44, 44), angle=-14)
    f = move(f, head, cp(44, 16), angle=10, keep=True)
    out['attack'] = lean(f, 46, 3, taper=16)
    f = move(a, head, cp(44, 34), angle=-8, keep=True)
    f = lean(f, 46, -2, taper=16)
    f, dox = squash(f, (14, 30), (16, 40))
    f = eyes_closed(f, (44, 28, 58, 42))
    out['hurt'] = (edge_lift(f, 2), dox)
    return out


def f_moss_scarab(base, horn_rect=(36, 0, 57, 34), pivot=(40, 30), seam=36, eyes=(40, 20, 54, 34), prefer=None):
    a = canvas(base)
    out = {}
    horn = m_rect(a, horn_rect)
    out['idle_1'] = rise(a, seam)
    near = m_rect(a, (pivot[0] - 6, pivot[1] - 12, pivot[0] + 6, seam + 2))
    f = move(a, horn, cp(*pivot), angle=16, fill=near)
    out['attack'] = lean(f, seam + 2, 3, taper=12)
    f = move(a, horn, cp(*pivot), angle=-10, fill=near)
    f = lean(f, seam + 2, -2, taper=12)
    H = base.shape[0]
    f, dox = squash(f, (int(H * 0.25), int(H * 0.45)), (int(base.shape[1] * 0.25), int(base.shape[1] * 0.75)))
    if eyes:
        f = eyes_closed(f, eyes)
    out['hurt'] = (edge_lift(f, 2, prefer=prefer) if prefer else edge_lift(f, 2), dox)
    return out


def f_bookmite(base):
    return f_moss_scarab(base, horn_rect=(26, 0, 44, 24), pivot=(28, 20), seam=26, eyes=None,
                         prefer=('ink', 'shadow', 'earth', 'path', 'sand', 'stone_cool'))


def f_tome_golem(base):
    a = canvas(base)
    out = {}
    arm = m_rect(a, (74, 8, 91, 52))
    core = accent_mask(a, (44, 18, 62, 36), min_chroma=0.08, min_L=0.6)
    out['idle_1'] = rise(a, 60)
    f = move(a, arm, cp(79, 14), angle=-18, fill=m_rect(a, (70, 16, 80, 52)))
    f = rise(f, 58, -2)
    f = glow(f, core, 'gold', 0.5, 4)
    out['attack'] = lean(f, 62, 2, taper=16)
    f = lean(a, 62, -3, taper=16)
    f, dox = squash(f, (24, 44), (22, 66))
    lab = lab_of(f)
    dim = accent_mask(f, (44, 20, 64, 38), min_chroma=0.08, min_L=0.6)
    f[dim, :3] = col('earth:2')
    out['hurt'] = (edge_lift(f, 2, prefer=('earth', 'wood', 'path', 'sand', 'stone_warm', 'ink')), dox)
    return out


def f_ink_wraith(base):
    a = canvas(base)
    out = {}
    tails = m_rect(a, (0, 52, 85, 86))
    arm_l = m_rect(a, (0, 24, 40, 80)) & ~tails
    arm_r = m_rect(a, (60, 20, 85, 76)) & ~tails
    out['idle_1'] = move(a, tails, cp(44, 50), angle=3)
    f = move(a, m_rect(a, (60, 20, 85, 76)), cp(62, 30), angle=-16)
    out['attack'] = xform(f, cp(42, 85), angle=7)
    f = xform(a, cp(42, 85), angle=-6)
    f, dox = squash(f, (22, 42), (24, 60))
    f = eyes_closed(f, (42, 2, 62, 22), min_chroma=0.06, min_L=0.5)
    out['hurt'] = (edge_lift(f, 2, prefer=('ink', 'magic_violet', 'hair_violet', 'shadow', 'cloth_purple')), dox)
    f = move(a, arm_l, cp(40, 30), angle=12, keep=True)
    f = move(f, arm_r, cp(60, 26), angle=-12, keep=True)
    f = glow(f, m_rect(f, (42, 0, 62, 22)), 'magic_violet', 0.45, 3)
    out['cast'] = sparkles(f, [(48, -4, 2), (60, -2, 1), (36, -6, 1), (78, 4, 2), (8, 6, 1), (54, -9, 1)], ['magic_violet:4', 'magic_cyan:4'])
    return out


ENEMY_RECIPES = {
    'ink_slime': f_ink_slime, 'page_wraith': f_page_wraith, 'briar_wolf': f_briar_wolf,
    'moss_scarab': f_moss_scarab, 'bookmite': f_bookmite, 'tome_golem': f_tome_golem, 'ink_wraith': f_ink_wraith,
}
CASTERS = ('page_wraith', 'ink_wraith', 'echo_warden')


def _pack(eid, base, raw):
    """{name: img | (img, dox)} -> {name: (img, ox, oy)} plus the die steps"""
    ox, oy = origin_of(base)
    out = {}
    for n, v in raw.items():
        img, dox = (v if isinstance(v, tuple) else (v, 0))
        out[n] = (img, ox + dox, oy)
    for i, f in enumerate(die_frames(canvas(base), eid)):
        out[f'die_{i}'] = (f, ox, oy)
    return out


def derive_enemy(eid, base):
    return _pack(eid, base, ENEMY_RECIPES[eid](base))


# ----------------------------------------------------------------------------- Archivore
ARC = dict(
    wing_l=[(0, 6), (34, 6), (50, 34), (56, 56), (56, 76), (44, 116), (0, 116)],
    wing_r=[(148, 6), (114, 6), (98, 34), (92, 56), (92, 76), (104, 116), (148, 116)],
    horn_l=[(24, 0), (60, 0), (64, 44), (46, 46), (34, 24)],
    horn_r=[(124, 0), (88, 0), (84, 44), (102, 46), (114, 24)],
    root_l=(56, 64), root_r=(92, 64), eye_zone=(70, 54, 96, 82), tendrils=(28, 96, 148, 139),
)


def eye_masks(a):
    """iris (saturated warm bright), the filled eye (iris plus the enclosed pupil) and the pupil"""
    lab = lab_of(a)
    C = np.hypot(lab[..., 1], lab[..., 2])
    zone = m_rect(a, ARC['eye_zone'])
    iris = zone & (C > 0.1) & (lab[..., 0] > 0.6) & (lab[..., 2] > 0.05)
    eye = iris.copy()
    ys, xs = np.nonzero(iris)
    for y in range(ys.min(), ys.max() + 1):
        row = np.nonzero(iris[y])[0]
        if len(row):
            eye[y, row.min():row.max() + 1] = True
    for x in range(xs.min(), xs.max() + 1):
        colm = np.nonzero(eye[:, x])[0]
        if len(colm):
            eye[colm.min():colm.max() + 1, x] = True
    pupil = eye & ~iris & (lab[..., 0] < 0.4)
    return iris, eye, pupil


def _bbox(m):
    ys, xs = np.nonzero(m)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def eye_scale(a, k, pupil='slit'):
    """the eye (iris, pupil and a 1 px rim) grows by k about its centre; the pupil becomes a thin slit or a
    dilated round void"""
    iris, eye, _ = eye_masks(a)
    x0, y0, x1, y1 = _bbox(eye)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    ring = np.zeros_like(eye)
    ring[y0 - 1:y1 + 1, x0 - 1:x1 + 1] = True
    ring &= opaque(a)
    big = xform(np.where(ring[..., None], a, 0), (cx, cy), sx=k, sy=k)
    out = over(big, a)
    iris2, eye2, pup2 = eye_masks(out)
    gx0, gy0, gx1, gy1 = _bbox(eye2)
    ink = col('ink:0')
    gold = out[iris2][:, :3]
    mid = np.median(gold, 0) if len(gold) else col('gold:4')
    out[pup2, :3] = mid
    ccx = (gx0 + gx1 - 1) / 2
    ccy = (gy0 + gy1 - 1) / 2
    hh = (gy1 - gy0) / 2
    ww = (gx1 - gx0) / 2
    for y, x in zip(*np.nonzero(eye2)):
        if pupil == 'slit':
            half = 0.6 if abs(y - ccy) < hh * 0.55 else 0.0
            if abs(y - ccy) < hh * 0.8 and abs(x - ccx) <= half:
                out[y, x, :3] = ink
        else:
            if ((x - ccx) / (ww * 0.5)) ** 2 + ((y - ccy) / (hh * 0.55)) ** 2 <= 1.0:
                out[y, x, :3] = ink
    return out


def eye_shut(a):
    """the lid closes: the eye fills with lid tone, a dark lash line across the middle curving down at the ends,
    and a lighter fold above it"""
    iris, eye, pupil = eye_masks(a)
    out = a.copy()
    x0, y0, x1, y1 = _bbox(eye)
    cy = (y0 + y1) // 2
    out[eye, :3] = col('earth:2')
    out[eye & (np.arange(a.shape[0])[:, None] < cy - 1), :3] = col('earth:3')
    for x in range(x0 - 1, x1 + 1):
        d = abs(x - (x0 + x1 - 1) / 2) / max(1, (x1 - x0) / 2)
        y = cy + (1 if d > 0.7 else 0)
        out[y, x, :3] = col('ink:0')
        out[y, x, 3] = 1
        if opaque(out[y - 1:y, x:x + 1])[0, 0]:
            out[y - 1, x, :3] = col('earth:4') if d < 0.8 else col('earth:3')
    return out


def eye_glow(a):
    """cast: the iris burns gold-white, the slit becomes a hot core, the socket ring warms"""
    iris, eye, pupil = eye_masks(a)
    out = glow(a, iris, 'gold', 0.3, 4)
    out[pupil, :3] = col('gold:5')
    x0, y0, x1, y1 = _bbox(eye)
    cx = (x0 + x1 - 1) / 2
    for y, x in zip(*np.nonzero(pupil)):
        if abs(x - cx) < 0.6:
            out[y, x, :3] = np.array([1.0, 0.98, 0.9], np.float32)
    p = np.pad(eye, 2)
    H, W = eye.shape
    near = np.zeros_like(eye)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            near |= p[2 + dy:H + 2 + dy, 2 + dx:W + 2 + dx]
    ring = near & ~eye & opaque(a)
    lab = lab_of(a)
    out[ring & (lab[..., 0] < 0.45), :3] = col('gold:1')
    out[ring & (lab[..., 0] >= 0.45), :3] = col('gold:3')
    return out


def archivore_frames(base):
    S = ARC
    a = canvas(base)
    H, W = base.shape[:2]
    wl, wr = m_poly(a, S['wing_l']), m_poly(a, S['wing_r'])
    hl, hr = m_poly(a, S['horn_l']), m_poly(a, S['horn_r'])
    wl &= ~hl
    wr &= ~hr
    rl, rr = cp(*S['root_l']), cp(*S['root_r'])
    tend = m_rect(a, S['tendrils']) & ~wl & ~wr

    def purple(img):
        lab = lab_of(img)
        low = np.zeros(img.shape[:2], bool)
        low[cy_(92):] = True
        return opaque(img) & (lab[..., 2] < 0.0) & (lab[..., 0] < 0.62) & low

    def wings(img, ang, k=1.0, ty=0):
        pu = purple(img)
        img = move(img, m_poly(img, S['wing_l']) & ~m_poly(img, S['horn_l']) & ~pu, rl, angle=ang, sx=k, sy=k, ty=ty, behind=True, seam=4)
        img = move(img, m_poly(img, S['wing_r']) & ~m_poly(img, S['horn_r']) & ~pu, rr, angle=-ang, sx=k, sy=k, ty=ty, behind=True, seam=4)
        return img

    out = {}
    out['idle_1'] = wings(a, 2.5, ty=-1)
    f = wings(a, 9, 1.04, ty=-2)
    f = eye_scale(f, 1.3, 'slit')
    out['attack'] = lean(f, 96, 2, taper=20)
    f = wings(a, -5, ty=1)
    f = eye_shut(f)
    f = lean(f, 96, -2, taper=20)
    f, dox = squash(f, (40, 70), (44, 104))
    out['hurt'] = (edge_lift(f, 2, prefer=('hair_violet', 'shadow', 'sand', 'path', 'earth', 'wood', 'ink')), dox)
    # cast (ink inhale): the wings fold in, the body contracts toward the eye, the eye burns
    f = wings(a, -4, 0.94, ty=1)
    f = xform(f, cp(74, H - 1), sx=0.96, sy=0.98)
    f = eye_glow(f)
    cx, cy = 82, 68
    pts = [(cx - 40, cy - 30, 2), (cx + 38, cy - 34, 1), (cx - 46, cy + 10, 1), (cx + 44, cy + 6, 2), (cx - 22, cy - 46, 1),
           (cx + 20, cy + 40, 1), (cx - 30, cy + 34, 2), (cx + 30, cy - 50, 1)]
    out['cast'] = sparkles(f, pts, ['magic_violet:3', 'ink:4', 'gold:4'])
    # devour: the eye swells with a dilated pupil, the tendrils reach for the party, the body lunges
    f = wings(a, 5, 1.02, ty=-1)
    f = move(f, tend, cp(40, 96), sx=1.14, sy=1.04)
    f = eye_scale(f, 1.55, 'round')
    out['devour'] = lean(f, 100, 3, taper=24)
    return _pack('archivore', base, out)


# ----------------------------------------------------------------------------- Echo Warden
WARDEN = dict(shield=(14, 6, 47, 76), shield_poly=[(15, 6), (48, 6), (48, 50), (32, 78), (15, 50)],
              hand=(72, 49), tip=(95, 87), hilt=(66, 42, 80, 56), seam=66, visor=(48, 0, 58, 18))


def warden(base, stance=None, pose=None):
    """One Echo Warden frame. stance: None | 'mirror' (shield tilted forward and raised, a cyan mirror sheen)
    | 'bulwark' (shield planted low and forward, knight crouched, blade drawn back to guard).
    pose: None | 'idle_1' | 'attack' | 'hurt' | 'cast'."""
    S = WARDEN
    a = canvas(base)
    lab = lab_of(a)
    cape = (lab[..., 2] < -0.06) & (np.hypot(lab[..., 1], lab[..., 2]) > 0.07) & (lab[..., 0] < 0.55)
    shield = m_poly(a, S['shield_poly']) & ~cape
    sword = m_line(a, S['hand'], S['tip'], 4.3) | m_rect(a, S['hilt'])
    shield &= ~sword
    hand = cp(*S['hand'])
    sw_ang = {'attack': -72, 'cast': -40}.get(pose, 0)
    sh = dict(angle=0, tx=0, ty=0)
    if stance == 'mirror':
        sh = dict(angle=7, tx=1, ty=-2)
    elif stance == 'bulwark':
        sh = dict(angle=-5, tx=3, ty=2)
        sw_ang += -24 if pose != 'attack' else 0
    f = a
    if sw_ang:
        f = move(f, sword, hand, angle=sw_ang)
    if sh['angle'] or sh['tx'] or sh['ty']:
        f = move(f, shield, cp(31, 72), angle=sh['angle'], tx=sh['tx'], ty=sh['ty'])
    # the shield's own pixels after the move: transform the mask itself, then drop the warm gold rim
    mk = np.zeros_like(a)
    mk[shield] = (1, 1, 1, 1)
    sh_now = opaque(xform(mk, cp(31, 72), sh['angle'], 1, 1, sh['tx'], sh['ty'])) & opaque(f)
    labf = lab_of(f)
    face = sh_now & ~(labf[..., 2] > 0.035) & ~dilate(~sh_now, 1)
    if stance == 'mirror':
        # a diagonal mirror sheen across the shield face
        H, W = f.shape[:2]
        yy, xx = np.mgrid[0:H, 0:W]
        k = (xx - PAD) + (yy - PAD) * 0.55
        band = face & (((k > 41) & (k < 43.5)) | ((k > 46.5) & (k < 47.6)))
        f = tone(f, face, 'ice', 0, 3)
        f[band & opaque(f), :3] = col('magic_cyan:4')
    elif stance == 'bulwark':
        f = tone(f, face, 'stone_cool', 1, 4)
        f = rise(f, S['seam'], dy=1)
    if pose == 'idle_1':
        f = rise(f, S['seam'])
    elif pose == 'attack':
        f = lean(f, S['seam'] + 2, 3, taper=18)
    elif pose == 'hurt':
        f = lean(f, S['seam'] + 2, -2, taper=18)
        f, dox = squash(f, (30, 50), (24, 72))
        return edge_lift(f, 2, prefer=('metal', 'stone_cool', 'cloth_blue', 'water', 'gold', 'shadow', 'ink')), dox
    elif pose == 'cast':
        f = glow(f, face | m_rect(f, S['visor']), 'magic_cyan', 0.6, 3)
        vx = (S['visor'][0] + S['visor'][2]) // 2
        f = sparkles(f, [(vx - 12, -4, 1), (vx + 10, -6, 2), (vx - 4, -9, 1), (vx + 3, -12, 1), (8, 20, 2), (88, 30, 1)],
                     ['magic_cyan:3', 'magic_cyan:4'])
    return f, 0


def echo_warden_frames(base):
    ox, oy = origin_of(base)
    out = {}
    for pose in ('idle_1', 'attack', 'hurt', 'cast'):
        f, dox = warden(base, None, pose)
        out[pose] = (f, ox + dox, oy)
    for st in ('mirror', 'bulwark'):
        f, _ = warden(base, st, None)
        out[st] = (f, ox, oy)
        for pose in ('idle_1', 'attack', 'hurt', 'cast'):
            f, dox = warden(base, st, pose)
            out[f'{st}_{pose}'] = (f, ox + dox, oy)
    for i, f in enumerate(die_frames(canvas(base), 'echo_warden')):
        out[f'die_{i}'] = (f, ox, oy)
    return out


def lost_page_frames(base):
    return _pack('lost_page', base, {})


# ----------------------------------------------------------------------------- trimming
def trim(img, ox, oy):
    """crop to the alpha bbox; returns (img, ox, oy) with the origin moved with the crop"""
    op = opaque(img)
    ys, xs = np.nonzero(op)
    if not len(ys):
        return img[:1, :1], 0, 0
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    x0, y0 = min(x0, ox), min(y0, oy)
    x1, y1 = max(x1, ox + 1), max(y1, oy + 1)
    return img[y0:y1, x0:x1].copy(), ox - x0, oy - y0


ORDER = ['idle_1', 'attack', 'hurt', 'cast', 'devour', 'mirror', 'mirror_idle_1', 'mirror_attack', 'mirror_hurt', 'mirror_cast',
         'bulwark', 'bulwark_idle_1', 'bulwark_attack', 'bulwark_hurt', 'bulwark_cast', 'die_0', 'die_1', 'die_2']
