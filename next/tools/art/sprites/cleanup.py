"""Cleanup pass for painted-to-pixel enemy and boss sprites (CRITIQUE_1 C8).

    snap_master(a, max_de)        every opaque colour within max_de (OKLab) of a master palette colour becomes it
    requantize(a, k)              k-means the sprite again (after a recolour) and snap to the master palette
    majority_despeckle(a, ...)    isolated pixels (no same-colour neighbour) take the majority neighbour colour;
                                  bright saturated accents (eyes, gems, glows) are protected
    ramp_outline(a, ...)          1 px outer ring: each ring pixel takes the DARKEST STEP OF THE RAMP its
                                  neighbouring material belongs to (never universal black); edges facing the
                                  top-left light use the ramp's second step instead (sel-out)
All functions take and return HxWx4 float32 straight-alpha arrays (pix.py convention) and are deterministic.
"""
import numpy as np
from pix import to_oklab, from_oklab, hex2rgb, blank, palette_from, quantize, color_ids, darken
import pal as P

_master = None
_master_lab = None
_ramp_dark = None     # master index -> list of (ramp name, darkest hex, second hex, step index)


def _init():
    global _master, _master_lab, _ramp_dark
    if _master is not None:
        return
    cols = P.all_colors()
    _master = np.array([hex2rgb(h) for h in cols], np.float32) / 255
    _master_lab = to_oklab(_master)
    idx = {h.lower(): i for i, h in enumerate(cols)}
    _ramp_dark = {i: [] for i in range(len(cols))}
    for name, ramp in P.master()['ramps'].items():
        for k, h in enumerate(ramp):
            i = idx.get(h.lower())
            if i is None:
                continue
            _ramp_dark[i].append((name, ramp[0], ramp[1] if len(ramp) > 1 else ramp[0], k, len(ramp)))


def master_index(rgb):
    """index of the nearest master colour (OKLab) and its distance"""
    _init()
    lab = to_oklab(np.asarray(rgb, np.float32).reshape(1, 3))[0]
    d = np.linalg.norm(_master_lab - lab, axis=1)
    j = int(d.argmin())
    return j, float(d[j])


def snap_master(a, max_de=0.06):
    a = a.copy()
    m = a[..., 3] > 0.5
    if not m.any():
        return a
    cols = np.unique(a[m][:, :3], axis=0)
    for c in cols:
        j, d = master_index(c)
        if d < max_de:
            sel = np.all(np.abs(a[..., :3] - c) < 1e-4, -1) & m
            a[sel, :3] = _master[j]
    return a


def requantize(a, k, seed=1, snap_de=0.06):
    """k-means the opaque pixels to k colours (value-weighted OKLab), then snap to the master palette."""
    m = a[..., 3] > 0.5
    if m.sum() < k * 4:
        return a
    pal = palette_from(a, k, seed=seed)
    out = quantize(a, pal)
    out[~m] = 0
    return snap_master(out, snap_de)


def merge_close(a, min_de=0.045):
    """Tighten the palette: colours closer than min_de (OKLab) to a more populated colour take that colour."""
    a = a.copy()
    m = a[..., 3] > 0.5
    if not m.any():
        return a
    cols, counts = np.unique(a[m][:, :3], axis=0, return_counts=True)
    order = np.argsort(-counts, kind='stable')
    cols, counts = cols[order], counts[order]
    labs = to_oklab(cols)
    target = list(range(len(cols)))
    for i in range(len(cols)):
        for j in range(i):
            if target[j] != j:
                continue
            if np.linalg.norm(labs[i] - labs[j]) < min_de:
                target[i] = j
                break
    for i, t in enumerate(target):
        if t != i:
            sel = np.all(np.abs(a[..., :3] - cols[i]) < 1e-4, -1) & m
            a[sel, :3] = cols[t]
    return a


def accent_mask(a, min_chroma=0.11, min_L=0.55):
    """bright saturated pixels (eyes, glows, gems) that despeckling must not eat"""
    m = a[..., 3] > 0.5
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(a.shape[0], a.shape[1], 3)
    C = np.hypot(lab[..., 1], lab[..., 2])
    return m & (C > min_chroma) & (lab[..., 0] > min_L)


def majority_despeckle(a, passes=3, max_de=0.26, protect=None, max_island=2, min_opaque_nb=5):
    """Replace speckle: an opaque pixel whose 8-neighbourhood holds at most `max_island - 1` pixels of its
    own colour (so 1 px dots and 2 px pairs) becomes the most common opaque neighbour colour, when that
    colour is within max_de (OKLab) of it. Protected pixels never change. Several passes let pairs
    collapse one pixel at a time."""
    a = a.copy()
    H, W = a.shape[:2]
    for _ in range(passes):
        ids = color_ids(a)
        lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
        pad = np.full((H + 2, W + 2), -2, np.int64)
        pad[1:-1, 1:-1] = ids
        new = a.copy()
        changed = 0
        for y in range(H):
            for x in range(W):
                c = ids[y, x]
                if c < 0 or (protect is not None and protect[y, x]):
                    continue
                nb = pad[y:y + 3, x:x + 3].flatten()
                nb = np.delete(nb, 4)
                same = int((nb == c).sum())
                if same >= max_island:
                    continue
                op = nb[nb >= 0]
                if len(op) < min_opaque_nb:
                    continue
                vals, counts = np.unique(op, return_counts=True)
                # majority among the OTHER colours
                order = np.argsort(-counts, kind='stable')
                tgt = None
                for o in order:
                    if vals[o] != c:
                        tgt = vals[o]
                        break
                if tgt is None:
                    continue
                yy = xx = None
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and ids[y + dy, x + dx] == tgt:
                            yy, xx = y + dy, x + dx
                if yy is None:
                    continue
                if np.linalg.norm(lab[y, x] - lab[yy, xx]) < max_de:
                    new[y, x] = a[yy, xx]
                    changed += 1
        a = new
        if not changed:
            break
    return a


def despeckle(a, protect=None, iso_de=0.24, pair_de=0.08, rounds=2):
    """The C8 cleanup: truly isolated pixels (no same-colour neighbour) take the majority colour when it is
    within iso_de; 2 px pairs only when within pair_de (so 1-2 px fur strands and highlights survive)."""
    for _ in range(rounds):
        a = majority_despeckle(a, passes=1, max_de=iso_de, protect=protect, max_island=1)
        a = majority_despeckle(a, passes=1, max_de=pair_de, protect=protect, max_island=2)
    return a


def ramp_darkest(rgb, lit=False):
    """Outline colour for a material colour: the darkest (or, lit, the second) step of the ramp the colour
    belongs to. A colour no ramp carries falls back to a darkened, cooler version of itself."""
    _init()
    j, d = master_index(rgb)
    cands = _ramp_dark.get(j, []) if d < 0.09 else []
    if not cands:
        tgt = np.array(hex2rgb('#1a1030'), np.float32) / 255
        c = darken(np.asarray(rgb, np.float32), 0.42 if lit else 0.62, tgt)
        return _master[master_index(c)[0]]      # keep the outline palette inside the master palette
    # prefer the ramp in which this colour sits highest (the ramp "about" this material), and among ties
    # the one whose darkest step is closest in hue to the colour
    lab = to_oklab(np.asarray(rgb, np.float32).reshape(1, 3))[0]
    best, bs = None, -1e9
    for name, dark, second, k, n in cands:
        dl = to_oklab(np.array(hex2rgb(dark), np.float32).reshape(1, 3) / 255)[0]
        hue_pen = np.hypot(dl[1] - lab[1], dl[2] - lab[2])
        score = k / n - hue_pen * 2.0
        if score > bs:
            bs, best = score, (dark, second)
    dark, second = best
    pick = second if lit else dark
    out = np.array(hex2rgb(pick), np.float32) / 255
    # the outline must be clearly darker than the material; if the ramp's step is not, darken further
    ol = to_oklab(out.reshape(1, 3))[0, 0]
    if ol > lab[0] - 0.10:
        out = darken(np.asarray(rgb, np.float32), 0.5, np.array(hex2rgb('#1a1030'), np.float32) / 255)
        out = _master[master_index(out)[0]]
    return out


def ramp_outline(a, sel_light=True):
    """Add a 1 px outer ring in each neighbouring material's darkest ramp step (see ramp_darkest)."""
    a = a.copy()
    al = a[..., 3] > 0.5
    H, W = al.shape
    p = np.pad(al, 1)
    up, down, left, right = p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]
    ring = (~al) & (up | down | left | right)
    src = a.copy()
    cache = {}
    for y, x in zip(*np.nonzero(ring)):
        nbs = []
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < H and 0 <= xx < W and al[yy, xx]:
                nbs.append(src[yy, xx, :3])
        c = np.mean(nbs, 0)
        # ring pixels above or left of the body face the light; below/right are in shadow
        below = (y > 0 and al[y - 1, x]) or (x > 0 and al[y, x - 1])
        lit = sel_light and not below
        key = (tuple(np.round(c * 255).astype(int)), lit)
        if key not in cache:
            cache[key] = ramp_darkest(c, lit)
        a[y, x, :3] = cache[key]
        a[y, x, 3] = 1
    return a


def report_colors(a):
    m = a[..., 3] > 0.5
    cols = np.unique(a[m][:, :3], axis=0)
    _init()
    on = sum(1 for c in cols if master_index(c)[1] < 1e-3)
    return len(cols), on
