"""Derived animation frames for the painted enemy and boss battle sprites (W6-anim).

Every frame is built deterministically from the enemy's single base frame by a short list of pixel
deformations, in the spirit of how Chrono Trigger and FF6 enemies move: the body rises 1 px to breathe,
leans and reaches to attack, squashes and recoils when hit, and drops pixels from the top as it dies.
Frames keep the base's feet row; every derived frame is drawn on a canvas padded by PADX / PADY so the
deformations never clip, and its origin (bottom-centre of the base) is returned with it.

    frames = derive_enemy(eid, base_rgba, spec)   -> {name: (rgba, ox, oy)}

Primitives (all take and return HxWx4 float32 straight-alpha arrays, pix.py convention):
    shift_region(a, rect, dx, dy, fill)   move a block; `fill` stretches the trailing edge so limbs stay attached
    shear_rows(a, y_end, dx, taper)       lean: rows above y_end slide dx, tapering to 0 at y_end
    squash(a, drop_rows, dup_cols)        2 px shorter / wider with the feet planted (returns the origin shift)
    dropout(a, level, seed)               monotonic pixel drop-out, top rows first (death steps)
    eyes_closed(a, rect)                  bright accents in the rect take their dark surroundings
    edge_lift(a, steps)                   the outline ring moves up its ramp (hurt frames)
    glow_map(a, rect, ramp, min_L)        highlights in the rect move to a magic ramp (cast frames)
    grow_block(a, rect, grow)             nearest-neighbour enlarge of a block in place (eyes)
Rects are (x0, y0, x1, y1) fractions of the BASE frame; px() turns them into padded-canvas pixels.
"""
import numpy as np
from pix import blank, hex2rgb, to_oklab
import pal as P
import cleanup as CL

PADX, PADY = 4, 4


# ----------------------------------------------------------------------------- canvas and rects
def canvas(base):
    """base on a padded canvas (PADX each side, PADY on top, none below: the feet row stays last)."""
    H, W = base.shape[:2]
    out = blank(W + 2 * PADX, H + PADY)
    out[PADY:PADY + H, PADX:PADX + W] = base
    return out


def origin_of(base):
    H, W = base.shape[:2]
    return (W // 2 + PADX, H - 1 + PADY)


def px(rect, base):
    """fractional rect of the base -> pixel rect on the padded canvas"""
    H, W = base.shape[:2]
    fx0, fy0, fx1, fy1 = rect
    return (PADX + int(round(fx0 * W)), PADY + int(round(fy0 * H)),
            PADX + int(round(fx1 * W)), PADY + int(round(fy1 * H)))


def _clamp(rect, a):
    H, W = a.shape[:2]
    x0, y0, x1, y1 = rect
    return (max(0, x0), max(0, y0), min(W, x1), min(H, y1))


def _over(dst, blk, x, y):
    """paste opaque pixels of blk at (x, y), clipped"""
    H, W = dst.shape[:2]
    h, w = blk.shape[:2]
    sx0, sy0 = max(0, -x), max(0, -y)
    dx0, dy0 = max(0, x), max(0, y)
    w2, h2 = min(w - sx0, W - dx0), min(h - sy0, H - dy0)
    if w2 <= 0 or h2 <= 0:
        return
    src = blk[sy0:sy0 + h2, sx0:sx0 + w2]
    m = src[..., 3:4] > 0.5
    dst[dy0:dy0 + h2, dx0:dx0 + w2] = np.where(m, src, dst[dy0:dy0 + h2, dx0:dx0 + w2])


def _fill_empty(dst, blk, x, y):
    """like _over but only where dst is still transparent (seam fill)"""
    H, W = dst.shape[:2]
    h, w = blk.shape[:2]
    sx0, sy0 = max(0, -x), max(0, -y)
    dx0, dy0 = max(0, x), max(0, y)
    w2, h2 = min(w - sx0, W - dx0), min(h - sy0, H - dy0)
    if w2 <= 0 or h2 <= 0:
        return
    src = blk[sy0:sy0 + h2, sx0:sx0 + w2]
    tgt = dst[dy0:dy0 + h2, dx0:dx0 + w2]
    m = (src[..., 3:4] > 0.5) & (tgt[..., 3:4] <= 0.5)
    dst[dy0:dy0 + h2, dx0:dx0 + w2] = np.where(m, src, tgt)


# ----------------------------------------------------------------------------- primitives
def shift_region(a, rect, dx=0, dy=0, fill=True):
    """Move the pixels inside rect by (dx, dy). With fill, the rows/columns the block vacates on its trailing
    side are filled with the block's trailing edge (a stretch), so a raised limb stays attached to the body."""
    x0, y0, x1, y1 = _clamp(rect, a)
    if x1 <= x0 or y1 <= y0 or (dx == 0 and dy == 0):
        return a.copy()
    out = a.copy()
    blk = a[y0:y1, x0:x1].copy()
    out[y0:y1, x0:x1] = 0
    _over(out, blk, x0 + dx, y0 + dy)
    if fill:
        if dy < 0:
            edge = blk[-1:, :]
            for r in range(y1 + dy, y1):
                _fill_empty(out, edge, x0 + dx, r)
        elif dy > 0:
            edge = blk[:1, :]
            for r in range(y0, y0 + dy):
                _fill_empty(out, edge, x0 + dx, r)
        if dx > 0:
            edge = blk[:, :1]
            for c in range(x0, x0 + dx):
                _fill_empty(out, edge, c, y0 + dy)
        elif dx < 0:
            edge = blk[:, -1:]
            for c in range(x1 + dx, x1):
                _fill_empty(out, edge, c, y0 + dy)
    return out


def shear_rows(a, y_end, dx, taper=8, y_start=0):
    """Lean: every row above y_end slides sideways; the shift tapers linearly to 0 over `taper` rows above
    y_end so the hips stay put while the shoulders and head move the full dx."""
    out = a.copy()
    H, W = a.shape[:2]
    for y in range(y_start, min(H, y_end)):
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


def squash(a, drop_rows, dup_cols):
    """Delete the listed rows (the body above them settles down, feet planted) and duplicate the listed
    columns (the body widens). Returns (image, origin_dx): the canvas grows by len(dup_cols) and the
    bottom-centre origin moves right by the number of duplicated columns left of it."""
    H, W = a.shape[:2]
    keep = [r for r in range(H) if r not in set(drop_rows)]
    b = blank(W, H)
    b[H - len(keep):] = a[keep]
    cols = []
    for x in range(W):
        cols.append(x)
        if x in set(dup_cols):
            cols.append(x)
    out = b[:, cols]
    return out, sum(1 for c in dup_cols if c < W // 2)


def dropout(a, level, seed=11, top_bias=1.45, bottom=0.35):
    """Remove opaque pixels where a fixed per-pixel random value is below level * (top_bias - (top_bias -
    bottom) * y/H). The same seed for every level makes the steps monotonic: what is gone stays gone."""
    H, W = a.shape[:2]
    rng = np.random.RandomState(seed)
    r = rng.rand(H, W)
    yy = np.arange(H, dtype=np.float32)[:, None] / float(max(1, H - 1))
    thr = level * (top_bias - (top_bias - bottom) * yy)
    out = a.copy()
    out[(r < thr) & (a[..., 3] > 0.5)] = 0
    return out


def _lab(a):
    H, W = a.shape[:2]
    return to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)


def accent_mask(a, rect=None, min_chroma=0.10, min_L=0.45):
    lab = _lab(a)
    C = np.hypot(lab[..., 1], lab[..., 2])
    m = (a[..., 3] > 0.5) & (C > min_chroma) & (lab[..., 0] > min_L)
    if rect is not None:
        x0, y0, x1, y1 = _clamp(rect, a)
        box = np.zeros_like(m)
        box[y0:y1, x0:x1] = True
        m &= box
    return m


def eyes_closed(a, rect, min_chroma=0.10, min_L=0.45):
    """Bright saturated pixels inside rect (eyes, glints) take the most common colour of their non-accent
    opaque 8-neighbours: the eye shuts into the surrounding dark."""
    out = a.copy()
    m = accent_mask(a, rect, min_chroma, min_L)
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    for y, x in zip(*np.nonzero(m)):
        cols = {}
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if (dy or dx) and 0 <= yy < H and 0 <= xx < W and al[yy, xx] and not m[yy, xx]:
                    key = tuple(np.round(a[yy, xx, :3] * 255).astype(int))
                    cols[key] = cols.get(key, 0) + 1
        if cols:
            best = max(cols.items(), key=lambda kv: kv[1])[0]
            out[y, x, :3] = np.array(best, np.float32) / 255
    return out


def edge_lift(a, steps=2, prefer=('ink', 'shadow', 'stone_cool', 'earth', 'wood', 'hair_violet', 'grass', 'foliage_dark')):
    """Every outline pixel (opaque with a transparent 4-neighbour) moves `steps` up its own ramp: the hurt
    frame's silhouette brightens for the hit, inside the palette."""
    out = a.copy()
    al = a[..., 3] > 0.5
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


def glow_map(a, rect, ramp='magic_cyan', min_L=0.55, min_step=2):
    """Highlights inside rect (OKLab L above min_L) move onto the glow ramp, matched by lightness and never
    below min_step: the cast frame charges the sprite's light parts with magic."""
    out = a.copy()
    x0, y0, x1, y1 = _clamp(rect, a)
    lab = _lab(a)
    steps = [np.array(hex2rgb(h), np.float32) / 255 for h in P.ramp(ramp)]
    sl = [to_oklab(s.reshape(1, 3))[0, 0] for s in steps]
    sel = np.zeros(a.shape[:2], bool)
    sel[y0:y1, x0:x1] = True
    sel &= (a[..., 3] > 0.5) & (lab[..., 0] > min_L)
    for y, x in zip(*np.nonzero(sel)):
        L = lab[y, x, 0]
        j = int(np.argmin([abs(L - s) for s in sl]))
        out[y, x, :3] = steps[max(min_step, j)]
    return out


def sparkles(a, pts, colors):
    """Set single pixels (cross-shaped when size 2) at the given canvas points, cycling through colors."""
    out = a.copy()
    H, W = a.shape[:2]
    for i, p in enumerate(pts):
        x, y = p[0], p[1]
        size = p[2] if len(p) > 2 else 1
        col = np.array(hex2rgb(P.color(colors[i % len(colors)])), np.float32) / 255
        cells = [(x, y)] if size == 1 else [(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
        for cx, cy in cells:
            if 0 <= cx < W and 0 <= cy < H:
                out[cy, cx, :3] = col
                out[cy, cx, 3] = 1
    return out


def grow_block(a, rect, grow=2):
    """Enlarge the block inside rect by `grow` px (nearest neighbour), pasted back centred on the rect."""
    x0, y0, x1, y1 = _clamp(rect, a)
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0:
        return a.copy()
    blk = a[y0:y1, x0:x1]
    nw, nh = w + grow, h + grow
    xs = np.minimum((np.arange(nw) * w / nw).astype(int), w - 1)
    ys = np.minimum((np.arange(nh) * h / nh).astype(int), h - 1)
    big = blk[ys][:, xs]
    out = a.copy()
    _over(out, big, x0 - grow // 2, y0 - grow // 2)
    return out


def ring_around(a, rect, color, inset=0):
    """A 1 px ring of `color` just outside rect (for an eye glow)."""
    out = a.copy()
    H, W = a.shape[:2]
    x0, y0, x1, y1 = rect
    x0 -= 1 - inset; y0 -= 1 - inset; x1 += 1 - inset; y1 += 1 - inset
    col = np.array(hex2rgb(P.color(color)), np.float32) / 255
    for x in range(x0, x1):
        for y in (y0, y1 - 1):
            if 0 <= x < W and 0 <= y < H:
                out[y, x, :3] = col; out[y, x, 3] = 1
    for y in range(y0, y1):
        for x in (x0, x1 - 1):
            if 0 <= x < W and 0 <= y < H:
                out[y, x, :3] = col; out[y, x, 3] = 1
    return out


def socket_glow(a, rect, dark_L=0.34, mid_L=0.52):
    """The dark socket pixels around a glowing eye warm up: darkest -> gold:1, dark -> gold:2, mid -> gold:3."""
    out = a.copy()
    x0, y0, x1, y1 = _clamp(rect, a)
    lab = _lab(a)
    g1 = np.array(hex2rgb(P.color('gold:1')), np.float32) / 255
    g2 = np.array(hex2rgb(P.color('gold:2')), np.float32) / 255
    g3 = np.array(hex2rgb(P.color('gold:3')), np.float32) / 255
    for y in range(y0, y1):
        for x in range(x0, x1):
            if a[y, x, 3] <= 0.5:
                continue
            L = lab[y, x, 0]
            if L < 0.22:
                out[y, x, :3] = g1
            elif L < dark_L:
                out[y, x, :3] = g2
            elif L < mid_L:
                out[y, x, :3] = g3
    return out


def accent_bbox(a, rect, min_chroma=0.12, min_L=0.5):
    """bbox (x0, y0, x1, y1) of the bright accents inside rect, or None"""
    m = accent_mask(a, rect, min_chroma, min_L)
    ys, xs = np.nonzero(m)
    if not len(ys):
        return None
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def fill_block(a, rect, color):
    out = a.copy()
    x0, y0, x1, y1 = _clamp(rect, a)
    col = np.array(hex2rgb(color) if isinstance(color, str) else color, np.float32)
    if col.max() > 1:
        col = col / 255
    m = out[y0:y1, x0:x1, 3] > 0.5
    out[y0:y1, x0:x1, :3][m] = col[:3]
    return out


def mode_color(a, rect):
    """most common opaque colour inside rect (as 0..1 rgb) or None"""
    x0, y0, x1, y1 = _clamp(rect, a)
    blk = a[y0:y1, x0:x1]
    m = blk[..., 3] > 0.5
    if not m.any():
        return None
    cols, counts = np.unique(np.round(blk[m][:, :3] * 255).astype(int), axis=0, return_counts=True)
    return cols[int(counts.argmax())].astype(np.float32) / 255


def dark_mode_color(a, rect, max_L=0.4):
    """most common dark opaque colour inside rect (for shutting an eye into its socket)"""
    x0, y0, x1, y1 = _clamp(rect, a)
    blk = a[y0:y1, x0:x1]
    lab = _lab(blk)
    m = (blk[..., 3] > 0.5) & (lab[..., 0] < max_L)
    if not m.any():
        return mode_color(a, rect)
    cols, counts = np.unique(np.round(blk[m][:, :3] * 255).astype(int), axis=0, return_counts=True)
    return cols[int(counts.argmax())].astype(np.float32) / 255


# ----------------------------------------------------------------------------- enemy recipes
def body_rise(a, base, limb_frac):
    """breathe: everything above the limb line rises 1 px; the seam row is duplicated so the legs stay"""
    H, W = base.shape[:2]
    y = PADY + int(round(limb_frac * H))
    return shift_region(a, (0, 0, a.shape[1], y), 0, -1, fill=True)


def trail_down(a, base, from_frac):
    """flyer breathe: the rags below from_frac trail 1 px lower (the hood stays)"""
    H, W = base.shape[:2]
    y = PADY + int(round(from_frac * H))
    return shift_region(a, (0, y, a.shape[1], a.shape[0]), 0, 1, fill=True)


def enemy_attack(a, base, spec):
    H, W = base.shape[:2]
    hip = PADY + int(round(spec.get('hip', 0.62) * H))
    out = shear_rows(a, hip, spec.get('lunge', 2), taper=spec.get('taper', 8))
    if spec.get('head'):
        out = shift_region(out, px(spec['head'], base), 0, spec.get('head_drop', 1), fill=False)
    if spec.get('front'):
        out = shift_region(out, px(spec['front'], base), spec.get('reach', 2), 0, fill=True)
    for arm, swing in zip(spec.get('arms_swing', []), spec.get('arm_swings', [])):
        out = shift_region(out, px(arm, base), swing[0], swing[1], fill=True)
    return out


def enemy_hurt(a, base, spec):
    H, W = base.shape[:2]
    hip = PADY + int(round(spec.get('hip', 0.62) * H))
    out = shear_rows(a, hip, -spec.get('recoil', 2), taper=spec.get('taper', 8))
    rows = [PADY + int(round(f * H)) for f in spec.get('squash_rows', (0.28, 0.5))]
    cols = [PADX + int(round(f * W)) for f in spec.get('squash_cols', (0.25, 0.75))]
    out, dox = squash(out, rows, cols)
    if spec.get('eyes'):
        ex0, ey0, ex1, ey1 = px(spec['eyes'], base)
        # the squash moved the rows above each dropped row down and duplicated columns: widen the eye rect
        out = eyes_closed(out, (ex0 - 1, ey0 - 1, ex1 + 2, ey1 + 2))
    out = edge_lift(out, spec.get('lift', 2))
    return out, dox


def enemy_cast(a, base, spec):
    H, W = base.shape[:2]
    out = a
    for arm in spec.get('arms', []):
        out = shift_region(out, px(arm, base), 0, -spec.get('raise_px', 3), fill=True)
    if spec.get('head'):
        out = shift_region(out, px(spec['head'], base), 0, -1, fill=True)
    ramp = spec.get('glow', 'magic_cyan')
    for gr in spec.get('glow_rects', [spec.get('glow_rect', (0.0, 0.0, 1.0, 0.65))]):
        out = glow_map(out, px(gr, base), ramp, spec.get('glow_L', 0.62), spec.get('glow_step', 2))
    if spec.get('head'):
        hx0, hy0, hx1, hy1 = px(spec['head'], base)
        cx, cy = (hx0 + hx1) // 2, hy0 - 2
        pts = [(cx - 6, cy - 1, 1), (cx + 7, cy - 3, 2), (cx - 2, cy - 5, 1), (cx + 3, cy - 7, 1), (hx0 - 3, hy1 - 4, 2), (hx1 + 2, hy0 + 6, 1)]
        out = sparkles(out, pts, [ramp + ':3', ramp + ':4'])
    return out


def enemy_die(a, level, seed):
    return dropout(a, level, seed=seed)


DIE_LEVELS = (0.22, 0.46, 0.74)


def derive_enemy(eid, base, spec):
    """All derived frames for one enemy: {name: (rgba, ox, oy)}. Names are the suffixes the scene looks up:
    idle_1, attack, hurt, cast (casters only), die_0..2."""
    a = canvas(base)
    ox, oy = origin_of(base)
    out = {}
    if spec.get('flying'):
        out['idle_1'] = (trail_down(a, base, spec.get('trail', 0.55)), ox, oy)
    else:
        out['idle_1'] = (body_rise(a, base, spec.get('limb', 0.62)), ox, oy)
    out['attack'] = (enemy_attack(a, base, spec), ox, oy)
    hurt, dox = enemy_hurt(a, base, spec)
    out['hurt'] = (hurt, ox + dox, oy)
    if spec.get('caster'):
        out['cast'] = (enemy_cast(a, base, spec), ox, oy)
    seed = sum(ord(c) for c in eid) * 7 + 3
    for i, lv in enumerate(DIE_LEVELS):
        out[f'die_{i}'] = (enemy_die(a, lv, seed), ox, oy)
    return out


def contact_items(eid, base, frames, order=None):
    """(label, rgba) list for a contact sheet: the base first, then the derived frames in order."""
    items = [(eid, base)]
    names = order or list(frames.keys())
    for n in names:
        if n in frames:
            items.append((f'{eid}_{n}', frames[n][0]))
    return items


# ----------------------------------------------------------------------------- per-enemy specs
# Fractions of the base frame (facing RIGHT). hip: where the lean tapers to 0; limb: the breathe seam (the
# legs below it never move); head: the block that drops 1 px in the lunge; eyes: where accents shut when hurt;
# front: the limbs that reach forward 2 px in the lunge; arm (golem): the block that swings; casters get
# arms (raised 3 px) and a glow ramp.
ENEMY_ANIM = {
    'ink_slime':   dict(limb=0.78, hip=0.84, taper=16, lunge=3, head=(0.3, 0.0, 0.95, 0.45), head_drop=2, eyes=(0.4, 0.38, 0.9, 0.62),
                        front=(0.6, 0.45, 1.0, 0.9), reach=3, squash_rows=(0.3, 0.55)),
    'page_wraith': dict(flying=True, trail=0.55, hip=0.62, taper=14, lunge=3, head=(0.5, 0.0, 0.9, 0.32), head_drop=2,
                        eyes=(0.58, 0.1, 0.86, 0.26), front=(0.86, 0.3, 1.0, 0.5), reach=3,
                        arms=[(0.0, 0.05, 0.42, 0.62), (0.72, 0.3, 1.0, 0.56)], raise_px=4,
                        caster=True, glow='magic_cyan', glow_L=0.74, glow_step=3,
                        glow_rects=[(0.5, 0.0, 0.9, 0.34), (0.72, 0.26, 1.0, 0.56), (0.0, 0.05, 0.3, 0.5)]),
    'briar_wolf':  dict(limb=0.66, hip=0.68, taper=12, lunge=3, head=(0.58, 0.15, 1.0, 0.68), head_drop=3, eyes=(0.66, 0.3, 0.95, 0.56),
                        front=(0.56, 0.68, 1.0, 1.0), reach=3, squash_rows=(0.3, 0.5)),
    'moss_scarab': dict(limb=0.62, hip=0.64, taper=10, lunge=3, head=(0.55, 0.0, 1.0, 0.62), head_drop=2, eyes=(0.55, 0.42, 0.82, 0.66),
                        front=(0.55, 0.62, 1.0, 1.0), reach=3, squash_rows=(0.25, 0.45)),
    'bookmite':    dict(limb=0.6, hip=0.62, taper=8, lunge=3, head=(0.5, 0.0, 1.0, 0.6), head_drop=2, eyes=None,
                        front=(0.55, 0.6, 1.0, 1.0), reach=3, squash_rows=(0.25, 0.45)),
    'tome_golem':  dict(limb=0.68, hip=0.7, taper=14, lunge=3, head=(0.3, 0.0, 0.7, 0.24), head_drop=2, eyes=None,
                        arms_swing=[(0.7, 0.3, 1.0, 0.72), (0.0, 0.3, 0.26, 0.72)], arm_swings=[(2, -4), (0, -2)],
                        squash_rows=(0.28, 0.5)),
    'ink_wraith':  dict(flying=True, trail=0.55, hip=0.62, taper=14, lunge=3, head=(0.4, 0.0, 0.75, 0.3), head_drop=2,
                        eyes=(0.45, 0.08, 0.72, 0.24), front=(0.88, 0.25, 1.0, 0.5), reach=3,
                        arms=[(0.0, 0.2, 0.4, 0.6), (0.72, 0.25, 1.0, 0.6)], raise_px=4,
                        caster=True, glow='magic_violet', glow_L=0.62, glow_step=3,
                        glow_rects=[(0.4, 0.0, 0.75, 0.3), (0.72, 0.25, 1.0, 0.6), (0.0, 0.2, 0.3, 0.5)]),
}


# ----------------------------------------------------------------------------- bosses
ARCHIVORE = dict(
    wing_l=(0.0, 0.03, 0.34, 0.8), wing_r=(0.68, 0.03, 1.0, 0.8), eye_zone=(0.36, 0.33, 0.64, 0.64),
    tendrils=(0.25, 0.72, 1.0, 1.0), hip=0.72, taper=14,
)


def archivore_frames(base):
    """idle_1 (wings breathe), attack (wings flare, eye wide), hurt, cast (ink inhale: body contracts, eye
    glows), devour (eye enlarges, tendrils reach), die_0..2."""
    S = ARCHIVORE
    a = canvas(base)
    ox, oy = origin_of(base)
    H, W = base.shape[:2]
    wl, wr = px(S['wing_l'], base), px(S['wing_r'], base)
    eye = accent_bbox(a, px(S['eye_zone'], base), min_chroma=0.12, min_L=0.55)
    if eye is None:
        eye = px((0.45, 0.42, 0.55, 0.55), base)
    ex0, ey0, ex1, ey1 = eye
    eye_box = (ex0 - 2, ey0 - 2, ex1 + 2, ey1 + 2)   # iris plus the dark socket ring
    out = {}
    # breathe: both wings lift 1 px, the body stays
    f = shift_region(a, wl, 0, -1, fill=True)
    f = shift_region(f, wr, 0, -1, fill=True)
    out['idle_1'] = (f, ox, oy)
    # attack: wings flare up 3 and out 1, the body leans 2, the eye opens wide
    f = shear_rows(a, PADY + int(S['hip'] * H), 2, taper=S['taper'])
    f = shift_region(f, wl, -1, -3, fill=True)
    f = shift_region(f, wr, 1, -3, fill=True)
    f = grow_block(f, eye_box, 2)
    out['attack'] = (f, ox, oy)
    # hurt: recoil 2, squash, the eye shuts (socket colour with a lid line), the outline lifts
    f = shear_rows(a, PADY + int(S['hip'] * H), -2, taper=S['taper'])
    rows = [PADY + int(0.3 * H), PADY + int(0.5 * H)]
    cols = [PADX + int(0.3 * W), PADX + int(0.7 * W)]
    f, dox = squash(f, rows, cols)
    # the squash shifted the eye: rows above a dropped row settle 1 px down each, columns right of 0.3W shift 1 px right
    sx = 1 if ex0 > cols[0] else 0
    sy = sum(1 for r in rows if r > ey1)
    shut = (ex0 + sx, ey0 + sy, ex1 + sx, ey1 + sy)
    sock = dark_mode_color(f, (shut[0] - 3, shut[1] - 3, shut[2] + 3, shut[3] + 3))
    if sock is not None:
        f = fill_block(f, shut, sock)
        lid = np.array(hex2rgb(P.color('earth:2')), np.float32) / 255
        my = (shut[1] + shut[3]) // 2
        f[my, shut[0] + 1:shut[2] - 1, :3] = lid
    f = edge_lift(f, 2, prefer=('hair_violet', 'shadow', 'sand', 'path', 'earth', 'wood', 'ink'))
    out['hurt'] = (f, ox + dox, oy)
    # cast (ink inhale): the whole body contracts 2 columns and the wings settle 1 px; the eye glows
    keep = [x for x in range(a.shape[1]) if x not in (PADX + int(0.33 * W), PADX + int(0.67 * W))]
    f = blank(a.shape[1], a.shape[0])
    f[:, 1:1 + len(keep)] = a[:, keep]
    f = shift_region(f, (wl[0], wl[1], wl[2] - 1, wl[3]), 0, 1, fill=True)
    f = shift_region(f, (wr[0] - 1, wr[1], wr[2] - 1, wr[3]), 0, 1, fill=True)
    ebox = (eye_box[0] - 2, eye_box[1] - 2, eye_box[2] + 1, eye_box[3] + 2)
    f = glow_map(f, (ebox[0] + 2, ebox[1] + 2, ebox[2] - 2, ebox[3] - 2), 'gold', 0.4, 4)
    f = socket_glow(f, ebox)
    cx, cy = (ebox[0] + ebox[2]) // 2, (ebox[1] + ebox[3]) // 2
    pts = [(cx - 12, cy - 9, 2), (cx + 11, cy - 11, 1), (cx - 14, cy + 6, 1), (cx + 13, cy + 5, 2), (cx - 4, cy - 14, 1), (cx + 5, cy + 13, 1)]
    f = sparkles(f, pts, ['gold:4', 'gold:5'])
    out['cast'] = (f, ox, oy)
    # devour: the eye swells 4 px, the tendrils reach 3 px toward the party, the body leans 3
    f = shear_rows(a, PADY + int(S['hip'] * H), 3, taper=S['taper'])
    f = shift_region(f, px(S['tendrils'], base), 3, 0, fill=True)
    f = grow_block(f, eye_box, 4)
    out['devour'] = (f, ox, oy)
    seed = 97
    for i, lv in enumerate(DIE_LEVELS):
        out[f'die_{i}'] = (dropout(a, lv, seed=seed), ox, oy)
    return out


WARDEN = dict(shield=(0.14, 0.08, 0.47, 0.77), sword=(0.64, 0.42, 1.0, 0.88), hip=0.72, taper=12, visor=(0.5, 0.06, 0.66, 0.2))


def warden_stance(a, base, stance):
    """mirror: the shield lifts 2 px and its face takes a cyan sheen. bulwark: the shield plants forward 3 px
    and 2 px lower, the sword drops 2 px, the knight leans 1 px into it."""
    S = WARDEN
    sh, sw = px(S['shield'], base), px(S['sword'], base)
    H = base.shape[0]
    if stance == 'mirror':
        f = shift_region(a, sh, 0, -2, fill=True)
        face = (sh[0] + 4, sh[1] + 4, sh[2] - 4, sh[3] - 8)
        f = glow_map(f, face, 'magic_cyan', 0.8, 3)
        return f
    f = shear_rows(a, PADY + int(S['hip'] * H), 1, taper=S['taper'])
    f = shift_region(f, sh, 3, 2, fill=True)
    f = shift_region(f, sw, 0, 2, fill=True)
    return f


def warden_pose(a, base, pose):
    S = WARDEN
    sh, sw = px(S['shield'], base), px(S['sword'], base)
    H, W = base.shape[:2]
    hip = PADY + int(S['hip'] * H)
    if pose == 'idle_1':
        return body_rise(a, base, S['hip']), 0
    if pose == 'attack':
        f = shear_rows(a, hip, 2, taper=S['taper'])
        f = shift_region(f, sw, 2, -5, fill=True)
        return f, 0
    if pose == 'hurt':
        f = shear_rows(a, hip, -2, taper=S['taper'])
        rows = [PADY + int(0.3 * H), PADY + int(0.5 * H)]
        cols = [PADX + int(0.25 * W), PADX + int(0.75 * W)]
        f, dox = squash(f, rows, cols)
        f = edge_lift(f, 2, prefer=('metal', 'stone_cool', 'cloth_blue', 'water', 'gold', 'shadow', 'ink'))
        return f, dox
    if pose == 'cast':
        f = shift_region(a, sw, 0, -2, fill=True)
        face = (sh[0] + 4, sh[1] + 4, sh[2] - 4, sh[3] - 8)
        f = glow_map(f, face, 'magic_cyan', 0.72, 3)
        vx0, vy0, vx1, vy1 = px(S['visor'], base)
        cx, cy = (vx0 + vx1) // 2, vy0 - 4
        pts = [(cx - 9, cy, 1), (cx + 8, cy - 2, 2), (cx - 3, cy - 5, 1), (cx + 2, cy - 8, 1), (sh[0] - 3, sh[1] + 10, 2), (sw[2] - 2, sw[1] - 3, 1)]
        f = sparkles(f, pts, ['magic_cyan:3', 'magic_cyan:4'])
        return f, 0
    raise KeyError(pose)


def echo_warden_frames(base):
    """Neutral idle_1/attack/hurt/cast, the two stance frames with their own idle_1/attack/hurt/cast, die_0..2."""
    a = canvas(base)
    ox, oy = origin_of(base)
    out = {}
    for pose in ('idle_1', 'attack', 'hurt', 'cast'):
        f, dox = warden_pose(a, base, pose)
        out[pose] = (f, ox + dox, oy)
    for st in ('mirror', 'bulwark'):
        s = warden_stance(a, base, st)
        out[st] = (s, ox, oy)
        for pose in ('idle_1', 'attack', 'hurt', 'cast'):
            f, dox = warden_pose(s, base, pose)
            out[f'{st}_{pose}'] = (f, ox + dox, oy)
    for i, lv in enumerate(DIE_LEVELS):
        out[f'die_{i}'] = (dropout(a, lv, seed=61), ox, oy)
    return out
