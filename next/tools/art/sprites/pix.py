"""Shared pixel-art helpers for the Lexicon Quest NEXT sprite pipeline.

Everything here is deterministic (fixed seeds) so the build is re-runnable.
Images are numpy float32 arrays HxWx4 in 0..1 (straight alpha) unless noted.
"""
import os, json, math
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
REPO = os.path.normpath(os.path.join(NEXT, '..'))
SRC = os.path.join(REPO, 'assets', 'art')
OUT = os.path.join(HERE, 'out')
DST = os.path.join(NEXT, 'assets', 'sprites')
os.makedirs(OUT, exist_ok=True)
os.makedirs(DST, exist_ok=True)


# ----------------------------------------------------------------------------- colour helpers
def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb2hex(c):
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in c[:3])


def srgb_to_lin(c):
    c = np.asarray(c, np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(np.asarray(c, np.float32), 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def to_oklab(rgb):
    """rgb in 0..1 sRGB, shape (...,3) -> OKLab"""
    l = srgb_to_lin(rgb)
    M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]], np.float32)
    M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]], np.float32)
    lms = l @ M1.T
    lms = np.cbrt(np.maximum(lms, 0))
    return lms @ M2.T


def from_oklab(lab):
    M2i = np.linalg.inv(np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                                  [1.9779984951, -2.4285922050, 0.4505937099],
                                  [0.0259040371, 0.7827717662, -0.8086757660]], np.float32))
    M1i = np.linalg.inv(np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                                  [0.2119034982, 0.6806995451, 0.1073969566],
                                  [0.0883024619, 0.2817188376, 0.6299787005]], np.float32))
    lms = np.asarray(lab, np.float32) @ M2i.T
    lms = lms ** 3
    return lin_to_srgb(lms @ M1i.T)


def shade(rgb, dl=0.0, dhue=0.0, dchroma=1.0):
    """shift a colour in OKLCh: dl lightness delta, dhue radians, chroma multiplier"""
    lab = to_oklab(np.asarray(rgb, np.float32).reshape(1, 3) / (255.0 if max(rgb) > 1 else 1.0))[0]
    L, a, b = lab
    C = math.hypot(a, b) * dchroma
    h = math.atan2(b, a) + dhue
    out = from_oklab(np.array([[L + dl, C * math.cos(h), C * math.sin(h)]], np.float32))[0]
    return tuple(int(round(v * 255)) for v in np.clip(out, 0, 1))


def ramp(base_hex, n=5, span=0.42, hue_shift=0.35, chroma=(0.85, 1.0, 0.9)):
    """hue-shifted ramp dark->light around base. Shadows go cooler (toward blue/violet), highlights warmer."""
    base = hex2rgb(base_hex)
    out = []
    for i in range(n):
        t = i / (n - 1) - 0.5  # -0.5..0.5
        ch = chroma[0] + (chroma[1] - chroma[0]) * (1 - abs(t) * 2) if t < 0 else chroma[1] + (chroma[2] - chroma[1]) * t * 2
        out.append(rgb2hex(shade(base, dl=t * span, dhue=-t * hue_shift, dchroma=ch)))
    return out


# ----------------------------------------------------------------------------- image io
def load_src(name):
    im = Image.open(os.path.join(SRC, name)).convert('RGBA')
    return np.asarray(im).astype(np.float32) / 255.0


def to_pil(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')


def from_pil(im):
    return np.asarray(im.convert('RGBA')).astype(np.float32) / 255.0


def save_png(a, path):
    to_pil(a).save(path)


def blank(w, h):
    return np.zeros((h, w, 4), np.float32)


def paste(dst, src, x, y):
    """alpha-over paste (binary alpha sprites mostly)"""
    h, w = src.shape[:2]
    H, W = dst.shape[:2]
    x0, y0 = max(x, 0), max(y, 0)
    x1, y1 = min(x + w, W), min(y + h, H)
    if x1 <= x0 or y1 <= y0:
        return dst
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]
    d = dst[y0:y1, x0:x1]
    a = s[..., 3:4]
    out_a = a + d[..., 3:4] * (1 - a)
    rgb = np.where(out_a > 0, (s[..., :3] * a + d[..., :3] * d[..., 3:4] * (1 - a)) / np.maximum(out_a, 1e-6), 0)
    dst[y0:y1, x0:x1] = np.concatenate([rgb, out_a], -1)
    return dst


def flip_x(a):
    return a[:, ::-1].copy()


def crop_alpha(a, pad=0, thr=0.0):
    ys, xs = np.nonzero(a[..., 3] > thr)
    if len(ys) == 0:
        return a[:1, :1] * 0, (0, 0, 1, 1)
    x0, x1, y0, y1 = xs.min() - pad, xs.max() + 1 + pad, ys.min() - pad, ys.max() + 1 + pad
    x0, y0 = max(x0, 0), max(y0, 0)
    return a[y0:y1, x0:x1].copy(), (x0, y0, x1, y1)


# ----------------------------------------------------------------------------- ascii pixel art
def parse_grid(rows, legend, w=None, h=None):
    """rows: list of strings (one char per pixel). legend: char -> '#rrggbb' or None (transparent)."""
    rows = [r for r in rows]
    H = h or len(rows)
    W = w or max(len(r) for r in rows)
    a = np.zeros((H, W, 4), np.float32)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in ('.', ' '):
                continue
            col = legend.get(ch)
            if col is None:
                raise KeyError('legend missing %r (row %d col %d)' % (ch, y, x))
            c = hex2rgb(col)
            a[y, x] = (c[0] / 255, c[1] / 255, c[2] / 255, 1.0)
    return a


def grid_from_text(txt):
    lines = [l for l in txt.split('\n')]
    # strip leading/trailing empty lines but keep internal ones
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    # remove common indent
    ind = min(len(l) - len(l.lstrip(' ')) for l in lines if l.strip())
    return [l[ind:] for l in lines]


# ----------------------------------------------------------------------------- k-means / quantize
def kmeans(X, k, iters=25, seed=1, init=None):
    rng = np.random.default_rng(seed)
    X = np.asarray(X, np.float32)
    if len(X) <= k:
        return X.copy(), np.arange(len(X))
    if init is not None:
        C = np.asarray(init, np.float32).copy()
    else:
        # kmeans++ init
        C = [X[rng.integers(len(X))]]
        d2 = ((X - C[0]) ** 2).sum(1)
        for _ in range(1, k):
            p = d2 / max(d2.sum(), 1e-12)
            C.append(X[rng.choice(len(X), p=p)])
            d2 = np.minimum(d2, ((X - C[-1]) ** 2).sum(1))
        C = np.array(C, np.float32)
    for _ in range(iters):
        lab = np.empty(len(X), np.int64)
        for s in range(0, len(X), 65536):
            d = ((X[s:s + 65536, None, :] - C[None]) ** 2).sum(-1)
            lab[s:s + 65536] = d.argmin(1)
        newC = C.copy()
        for j in range(len(C)):
            m = lab == j
            if m.any():
                newC[j] = X[m].mean(0)
        if np.allclose(newC, C, atol=1e-5):
            C = newC
            break
        C = newC
    return C, lab


def nearest(X, C):
    lab = np.empty(len(X), np.int64)
    for s in range(0, len(X), 65536):
        d = ((X[s:s + 65536, None, :] - C[None]) ** 2).sum(-1)
        lab[s:s + 65536] = d.argmin(1)
    return lab


def palette_from(a, k, seed=1, weight_sat=0.0, extra=None):
    """k-means palette (sRGB 0..1 rows) from opaque pixels, clustering in OKLab."""
    px = a[a[..., 3] > 0.5][:, :3]
    if extra is not None:
        px = np.concatenate([px, extra])
    if len(px) > 60000:
        px = px[np.random.default_rng(seed).choice(len(px), 60000, replace=False)]
    lab = to_oklab(px)
    lab[:, 0] *= 1.25  # value matters most for pixel art readability
    C, _ = kmeans(lab, k, seed=seed)
    C[:, 0] /= 1.25
    return np.clip(from_oklab(C), 0, 1)


def quantize(a, pal):
    out = a.copy()
    m = out[..., 3] > 0.5
    px = out[m][:, :3]
    lab = to_oklab(px); lab[:, 0] *= 1.25
    P = to_oklab(pal); P[:, 0] *= 1.25
    idx = nearest(lab, P)
    out[m, :3] = pal[idx]
    out[~m] = 0
    out[m, 3] = 1
    return out


# ----------------------------------------------------------------------------- downscale
def box_resize(a, w, h):
    """exact area-average downscale with premultiplied alpha"""
    pm = a.copy()
    pm[..., :3] *= pm[..., 3:4]
    chans = []
    for c in range(4):
        im = Image.fromarray(pm[..., c].astype(np.float32), 'F').resize((w, h), Image.BOX)
        chans.append(np.asarray(im, np.float32))
    out = np.stack(chans, -1)
    al = out[..., 3:4]
    out[..., :3] = np.where(al > 1e-5, out[..., :3] / np.maximum(al, 1e-5), 0)
    return out


def smart_down(a, w, h, k=24, mode_thr=0.55, alpha_thr=0.5, seed=1, pal=None):
    """Painted -> pixel downscale.
    1. palette by k-means on the source (OKLab)
    2. per output pixel coverage of every palette colour (box filter of one-hot masks)
    3. if one colour dominates (>= mode_thr of opaque coverage) use it, else snap the area average to the palette.
    Returns (rgba, palette)."""
    if pal is None:
        pal = palette_from(a, k, seed=seed)
    m = a[..., 3] > 0.5
    lab = to_oklab(a[..., :3].reshape(-1, 3)); lab[:, 0] *= 1.25
    P = to_oklab(pal); P[:, 0] *= 1.25
    idx = nearest(lab, P).reshape(a.shape[:2])
    cov = np.zeros((h, w, len(pal)), np.float32)
    for j in range(len(pal)):
        mask = ((idx == j) & m).astype(np.float32) * a[..., 3]
        if mask.any():
            cov[..., j] = np.asarray(Image.fromarray(mask, 'F').resize((w, h), Image.BOX), np.float32)
    alpha = np.asarray(Image.fromarray(a[..., 3].astype(np.float32), 'F').resize((w, h), Image.BOX), np.float32)
    avg = box_resize(a, w, h)
    tot = cov.sum(-1) + 1e-6
    best = cov.argmax(-1)
    frac = cov.max(-1) / tot
    alab = to_oklab(avg[..., :3].reshape(-1, 3)); alab[:, 0] *= 1.25
    snap = nearest(alab, P).reshape(h, w)
    choice = np.where(frac >= mode_thr, best, snap)
    out = np.zeros((h, w, 4), np.float32)
    out[..., :3] = pal[choice]
    out[..., 3] = (alpha >= alpha_thr).astype(np.float32)
    out[out[..., 3] == 0] = 0
    return out, pal


# ----------------------------------------------------------------------------- cleanup
def _neighbors(a):
    H, W = a.shape[:2]
    pad = np.zeros((H + 2, W + 2, 4), np.float32)
    pad[1:-1, 1:-1] = a
    offs = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    return [pad[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx] for dy, dx in offs], offs


def color_ids(a):
    """map each opaque pixel to an integer colour id (-1 transparent)"""
    key = (np.round(a[..., :3] * 255).astype(np.int64) * np.array([65536, 256, 1])).sum(-1)
    key = np.where(a[..., 3] > 0.5, key, -1)
    return key


def remove_orphans(a, passes=2, max_de=0.11, protect=None, min_opaque_nb=5):
    """Despeckle: a pixel that matches none of its 8 neighbours and is perceptually close (OKLab distance
    < max_de) to the most common neighbour colour is replaced by it. Distinct accents (eyes, gems,
    highlights) differ by more than max_de and survive."""
    a = a.copy()
    H, W = a.shape[:2]
    for _ in range(passes):
        ids = color_ids(a)
        lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
        pad = np.full((H + 2, W + 2), -2, np.int64); pad[1:-1, 1:-1] = ids
        new = a.copy(); changed = 0
        for y in range(H):
            for x in range(W):
                c = ids[y, x]
                if c < 0 or (protect is not None and protect[y, x]):
                    continue
                nb = np.delete(pad[y:y + 3, x:x + 3].flatten(), 4)
                if (nb == c).any():
                    continue
                op = nb[nb >= 0]
                if len(op) < min_opaque_nb:
                    continue
                vals, counts = np.unique(op, return_counts=True)
                tgt = vals[counts.argmax()]
                yy, xx = None, None
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if 0 <= y + dy < H and 0 <= x + dx < W and ids[y + dy, x + dx] == tgt:
                            yy, xx = y + dy, x + dx
                if yy is None:
                    continue
                if np.linalg.norm(lab[y, x] - lab[yy, xx]) < max_de:
                    new[y, x] = a[yy, xx]; changed += 1
        a = new
        if not changed:
            break
    return a


def alpha_clean(a, min_nb=2):
    """drop opaque pixels with fewer than min_nb opaque 4-neighbours (spurs), fill pinholes"""
    a = a.copy()
    al = a[..., 3] > 0.5
    H, W = al.shape
    p = np.pad(al, 1)
    n4 = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
    a[(al) & (n4 < min_nb)] = 0
    # pinholes: transparent with 4 opaque 4-neighbours
    al2 = a[..., 3] > 0.5
    p = np.pad(al2, 1)
    n4 = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
    holes = (~al2) & (n4 == 4)
    for y, x in zip(*np.nonzero(holes)):
        a[y, x] = a[y, x - 1]
    return a


def darkest_related(rgb, pal_lab, pal_rgb, min_dl=0.14):
    """pick a palette colour that is clearly darker than rgb, preferring similar hue"""
    lab = to_oklab(np.asarray(rgb).reshape(1, 3))[0]
    best, bs = None, 1e9
    for j in range(len(pal_lab)):
        dl = lab[0] - pal_lab[j, 0]
        if dl < min_dl:
            continue
        dc = np.hypot(lab[1] - pal_lab[j, 1], lab[2] - pal_lab[j, 2])
        s = dc * 3 + abs(dl - 0.32) * 0.6
        if s < bs:
            bs, best = s, pal_rgb[j]
    return best


def outline(a, mode='inner', dark_hex=None, sel_light=True, strength=0.42, hue_to='#1a1030'):
    """Selective 1px outline.
    mode 'inner': recolour the existing edge pixels (keeps size).
    mode 'outer': add a ring outside the silhouette.
    The outline colour is a darkened, cooler version of the adjacent material (never pure black).
    Edges facing the top-left light are slightly lighter (sel-out)."""
    a = a.copy()
    al = a[..., 3] > 0.5
    H, W = al.shape
    p = np.pad(al, 1)
    up, down, left, right = p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]
    tgt = hex2rgb(hue_to)
    tgt = np.array(tgt, np.float32) / 255
    if mode == 'inner':
        edge = al & (~up | ~down | ~left | ~right)
        for y, x in zip(*np.nonzero(edge)):
            lit = (not (y > 0 and al[y - 1, x])) or (not (x > 0 and al[y, x - 1]))
            unlit = (not (y < H - 1 and al[y + 1, x])) or (not (x < W - 1 and al[y, x + 1]))
            s = strength
            if sel_light and lit and not unlit:
                s = strength * 0.55
            c = a[y, x, :3]
            a[y, x, :3] = darken(c, s, tgt)
    else:
        ring = (~al) & (up | down | left | right)
        src = a.copy()
        for y, x in zip(*np.nonzero(ring)):
            # neighbour material
            nbs = []
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and al[yy, xx]:
                    nbs.append(src[yy, xx, :3])
            c = np.mean(nbs, 0)
            # ring pixels below/right of the shape are in shadow (darker)
            below = (y > 0 and al[y - 1, x]) or (x > 0 and al[y, x - 1])
            s = strength * (1.25 if below else 1.0)
            a[y, x, :3] = darken(c, min(s, 0.85), tgt)
            a[y, x, 3] = 1
    return a


def darken(c, s, tgt):
    """darken colour c by s (0..1) toward a deep indigo, in OKLab"""
    lab = to_oklab(np.asarray(c, np.float32).reshape(1, 3))[0]
    tl = to_oklab(np.asarray(tgt, np.float32).reshape(1, 3))[0]
    L = lab[0] * (1 - s) + tl[0] * s * 0.6
    ab = lab[1:] * (1 - s * 0.55) + tl[1:] * s * 0.55
    return np.clip(from_oklab(np.array([[L, ab[0], ab[1]]], np.float32))[0], 0, 1)


# ----------------------------------------------------------------------------- recolour
def hue_map(a, rules, mask=None):
    """rules: list of (hue_lo_deg, hue_hi_deg, min_chroma, fn(L,C,h)->(L,C,h)). Works in OKLCh."""
    out = a.copy()
    m = a[..., 3] > 0.01
    if mask is not None:
        m &= mask
    px = a[m][:, :3]
    lab = to_oklab(px)
    L = lab[:, 0]; C = np.hypot(lab[:, 1], lab[:, 2]); h = np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360
    L2, C2, h2 = L.copy(), C.copy(), h.copy()
    done = np.zeros(len(L), bool)
    for (lo, hi, cmin, fn) in rules:
        if lo <= hi:
            sel = (h >= lo) & (h < hi)
        else:
            sel = (h >= lo) | (h < hi)
        sel &= (C >= cmin) & ~done
        if sel.any():
            r = fn(L[sel], C[sel], h[sel])
            L2[sel], C2[sel], h2[sel] = r
            done |= sel
    hr = np.radians(h2)
    lab2 = np.stack([L2, C2 * np.cos(hr), C2 * np.sin(hr)], -1)
    out[m, :3] = np.clip(from_oklab(lab2), 0, 1)
    return out


# ----------------------------------------------------------------------------- sheets / atlases
def pack_rows(frames, cell, cols):
    """frames: list of (name, rgba) each exactly cell-sized. Returns (sheet, {name:[x,y,w,h]})."""
    cw, ch = cell
    rows = (len(frames) + cols - 1) // cols
    sheet = blank(cw * cols, ch * rows)
    rects = {}
    for i, (n, f) in enumerate(frames):
        x, y = (i % cols) * cw, (i // cols) * ch
        sheet[y:y + f.shape[0], x:x + f.shape[1]] = f
        rects[n] = [x, y, f.shape[1], f.shape[0]]
    return sheet, rects


class Shelf:
    """simple shelf packer for variable-size frames"""

    def __init__(self, width, pad=1):
        self.W = width; self.pad = pad
        self.x = 0; self.y = 0; self.rowh = 0
        self.items = []

    def add(self, name, img):
        h, w = img.shape[:2]
        if self.x + w > self.W:
            self.x = 0; self.y += self.rowh + self.pad; self.rowh = 0
        self.items.append((name, img, self.x, self.y))
        self.x += w + self.pad
        self.rowh = max(self.rowh, h)
        return [self.items[-1][2], self.items[-1][3], w, h]

    def render(self):
        H = self.y + self.rowh
        sheet = blank(self.W, max(H, 1))
        rects = {}
        for n, img, x, y in self.items:
            sheet[y:y + img.shape[0], x:x + img.shape[1]] = img
            rects[n] = [x, y, img.shape[1], img.shape[0]]
        return sheet, rects


def write_json(path, obj):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(obj, indent=1, sort_keys=False))
        f.write('\n')


def contact(items, path, scale=4, cols=8, bg=(52, 74, 58), label=True, cellpad=6, title=None):
    """items: list of (label, rgba). Renders a labelled contact sheet at integer scale (nearest)."""
    from PIL import ImageFont
    font = ImageFont.load_default()
    ws = [it[1].shape[1] * scale for it in items]
    hs = [it[1].shape[0] * scale for it in items]
    cw = max(ws) + cellpad * 2
    chh = max(hs) + cellpad * 2 + (12 if label else 0)
    cols = min(cols, len(items))
    rows = (len(items) + cols - 1) // cols
    top = 18 if title else 0
    img = Image.new('RGB', (cw * cols, chh * rows + top), bg)
    d = ImageDraw.Draw(img)
    if title:
        d.text((4, 3), title, fill=(240, 240, 220), font=font)
    for i, (lab, a) in enumerate(items):
        cx, cy = (i % cols) * cw, (i // cols) * chh + top
        # checker behind for alpha visibility
        tile = to_pil(a).resize((a.shape[1] * scale, a.shape[0] * scale), Image.NEAREST)
        x = cx + (cw - tile.size[0]) // 2
        y = cy + cellpad + (max(hs) - tile.size[1])
        img.paste(tile, (x, y), tile)
        if label:
            d.text((cx + 3, cy + chh - 13), str(lab)[:int(cw / 6)], fill=(235, 235, 210), font=font)
    img.save(path)
    return path


def upscale(a, s):
    return to_pil(a).resize((a.shape[1] * s, a.shape[0] * s), Image.NEAREST)


def on_bg(a, bg=(52, 74, 58)):
    out = np.zeros_like(a)
    out[..., :3] = np.array(bg, np.float32) / 255
    out[..., 3] = 1
    return paste(out, a, 0, 0)


def pixelize(obj, w, h, k=16, mode_thr=0.5, alpha_thr=0.5, ring=True, orphan_passes=2, strength=0.5,
             pal=None, seed=1, max_de=0.11, inner=False, despeckle=True):
    """full painted->pixel pass: smart downscale, despeckle, alpha clean, selective outline ring."""
    iw, ih = (w - 2, h - 2) if ring else (w, h)
    d, pal = smart_down(obj, iw, ih, k=k, mode_thr=mode_thr, alpha_thr=alpha_thr, seed=seed, pal=pal)
    d = alpha_clean(d, 2)
    if despeckle:
        d = remove_orphans(d, passes=orphan_passes, max_de=max_de)
    if ring:
        big = blank(w, h)
        big[1:-1, 1:-1] = d
        d = outline(big, mode='outer', strength=strength)
        if inner:
            d = outline(d, mode='inner', strength=0.18)
    return d, pal


def unsharp(a, amount=0.6, radius=1.0):
    """unsharp mask (alpha-aware) on rgb, alpha untouched"""
    from scipy.ndimage import gaussian_filter
    out = a.copy()
    al = gaussian_filter(a[..., 3], radius)
    for c in range(3):
        bl = gaussian_filter(a[..., c] * a[..., 3], radius)
        blc = np.where(al > 1e-3, bl / np.maximum(al, 1e-3), a[..., c])
        out[..., c] = np.clip(a[..., c] + amount * (a[..., c] - blc), 0, 1)
    return out


def pixelize2(obj, w, h, k=16, alpha_thr=0.5, ring=True, sharpen=0.7, max_de=0.10, strength=0.5, seed=1,
              pal=None, sat=1.0, contrast=1.0, protect_fn=None):
    """box downscale -> unsharp -> k-means palette of the small image -> despeckle -> outline ring"""
    iw, ih = (w - 2, h - 2) if ring else (w, h)
    d = box_resize(obj, iw, ih)
    d[..., 3] = (d[..., 3] >= alpha_thr).astype(np.float32)
    d[d[..., 3] == 0] = 0
    if sharpen:
        d = unsharp(d, sharpen, 0.8)
    if sat != 1.0 or contrast != 1.0:
        m = d[..., 3] > 0
        lab = to_oklab(d[m][:, :3])
        lab[:, 1:] *= sat
        lab[:, 0] = 0.5 + (lab[:, 0] - 0.5) * contrast
        d[m, :3] = np.clip(from_oklab(lab), 0, 1)
    if pal is None:
        pal = palette_from(d, k, seed=seed)
    d = quantize(d, pal)
    d = alpha_clean(d, 2)
    protect = protect_fn(d) if protect_fn else None
    if max_de:
        d = remove_orphans(d, passes=2, max_de=max_de, protect=protect)
    if ring:
        big = blank(w, h)
        big[1:-1, 1:-1] = d
        d = outline(big, mode='outer', strength=strength)
    return d, pal


def drop_specks(a, min_px=6):
    """remove tiny disconnected opaque islands"""
    from scipy import ndimage as ndi
    m = a[..., 3] > 0.5
    lab, n = ndi.label(m, structure=np.ones((3, 3)))
    if n <= 1:
        return a
    sizes = ndi.sum(m, lab, range(1, n + 1))
    out = a.copy()
    for i, s in enumerate(sizes):
        if s < min_px:
            out[lab == i + 1] = 0
    return out
