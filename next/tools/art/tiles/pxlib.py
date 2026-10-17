"""Small pixel-art toolkit shared by the tile generators.

Everything is deterministic: randomness comes from integer hashes of (x, y, seed), never from a global RNG.
Colors are RGBA tuples. Palette colors are fetched by ramp name and step: C('grass', 3).
"""
import json, math, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
ASSETS = os.path.join(NEXT, 'assets')
TILES_DIR = os.path.join(ASSETS, 'tiles')
OUT_DIR = os.path.join(HERE, 'out')

with open(os.path.join(ASSETS, 'palette.json')) as _f:
    PAL = json.load(_f)
RAMPS = PAL['ramps']


def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def C(ramp, i, a=255):
    r = RAMPS[ramp]
    if i < 0:
        i = len(r) + i
    i = max(0, min(len(r) - 1, i))
    return hexc(r[i], a)


DARK = hexc(PAL['darkest'])
WHITE = hexc('#f6f4ee')
CLEAR = (0, 0, 0, 0)
SHADOW_A = 108          # alpha of baked cast shadows (about 0.42)


def SH(a=SHADOW_A):
    return (DARK[0], DARK[1], DARK[2], a)


# ------------------------------------------------------------------ hashing
def h32(*vals):
    h = 0x811C9DC5
    for v in vals:
        h ^= (int(v) & 0xFFFFFFFF)
        h = (h * 0x01000193) & 0xFFFFFFFF
        h ^= h >> 13
        h = (h * 0x5BD1E995) & 0xFFFFFFFF
        h ^= h >> 15
    return h


def rnd(*vals):
    return h32(*vals) / 4294967296.0


def periodic_noise(x, y, seed, period=16, octaves=((16, 1.0), (8, 0.5))):
    """Smooth value noise, periodic in both axes with `period`. Returns roughly -1..1."""
    total = 0.0
    norm = 0.0
    for cell, amp in octaves:
        n = period // cell if cell <= period else 1
        gx, gy = x / cell, y / cell
        x0, y0 = int(math.floor(gx)), int(math.floor(gy))
        fx, fy = gx - x0, gy - y0
        sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)

        def g(ix, iy):
            return rnd(ix % max(n, 1), iy % max(n, 1), seed, cell) * 2 - 1
        a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx
        b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx
        total += (a + (b - a) * sy) * amp
        norm += amp
    return total / norm


def profile1d(seed, period=16, amp=1.0, spikes=0, spike_amp=1.0, smooth_cells=(8, 4)):
    """A periodic 1-D edge profile (list of `period` floats). Smooth undulation plus optional 1-px spikes."""
    vals = []
    for i in range(period):
        v = 0.0
        tot = 0.0
        for k, cell in enumerate(smooth_cells):
            n = max(1, period // cell)
            g0 = rnd(seed, k, (i // cell) % n) * 2 - 1
            g1 = rnd(seed, k, (i // cell + 1) % n) * 2 - 1
            f = (i % cell) / cell
            f = f * f * (3 - 2 * f)
            w = 1.0 / (k + 1)
            v += (g0 + (g1 - g0) * f) * w
            tot += w
        vals.append(v / tot * amp)
    picked = set()
    k = 0
    while len(picked) < spikes and k < 200:
        p = h32(seed, 77, k) % period
        if all(min(abs(p - q), period - abs(p - q)) > 2 for q in picked):
            picked.add(p)
        k += 1
    for p in picked:
        vals[p] -= spike_amp          # negative = boundary moves outward (terrain grows)
    return vals


# ------------------------------------------------------------------ canvas
class Canvas:
    def __init__(self, w, h, fill=None):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), np.uint8)
        if fill is not None:
            self.a[:, :] = fill

    @staticmethod
    def from_array(arr):
        c = Canvas(arr.shape[1], arr.shape[0])
        c.a = arr.copy()
        return c

    def copy(self):
        return Canvas.from_array(self.a)

    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def get(self, x, y):
        if not self.inb(x, y):
            return CLEAR
        return tuple(int(v) for v in self.a[y, x])

    def set(self, x, y, c):
        if c is None or not self.inb(x, y):
            return
        self.a[y, x] = c

    def put(self, x, y, c):
        """Alpha-composite c over the pixel."""
        if c is None or not self.inb(x, y):
            return
        if len(c) == 3:
            c = (c[0], c[1], c[2], 255)
        if c[3] >= 255:
            self.a[y, x] = c
            return
        if c[3] <= 0:
            return
        dst = self.a[y, x].astype(np.float64)
        sa = c[3] / 255.0
        da = dst[3] / 255.0
        oa = sa + da * (1 - sa)
        if oa <= 0:
            return
        rgb = (np.array(c[:3], np.float64) * sa + dst[:3] * da * (1 - sa)) / oa
        self.a[y, x] = (int(round(rgb[0])), int(round(rgb[1])), int(round(rgb[2])), int(round(oa * 255)))

    def darken(self, x, y, a=SHADOW_A):
        """Shadow: composite indigo over an existing opaque pixel, or write a translucent shadow pixel."""
        self.put(x, y, SH(a))

    def rect(self, x, y, w, h, c, blend=False):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                (self.put if blend else self.set)(xx, yy, c)

    def hline(self, x0, x1, y, c, blend=False):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            (self.put if blend else self.set)(x, y, c)

    def vline(self, x, y0, y1, c, blend=False):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            (self.put if blend else self.set)(x, y, c)

    def line(self, x0, y0, x1, y1, c, blend=False):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            (self.put if blend else self.set)(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def blit(self, src, x, y, sx=0, sy=0, w=None, h=None):
        arr = src.a if isinstance(src, Canvas) else src
        if w is None:
            w = arr.shape[1] - sx
        if h is None:
            h = arr.shape[0] - sy
        for yy in range(h):
            ty = y + yy
            if not (0 <= ty < self.h):
                continue
            for xx in range(w):
                tx = x + xx
                if not (0 <= tx < self.w):
                    continue
                p = arr[sy + yy, sx + xx]
                if p[3]:
                    self.put(tx, ty, tuple(int(v) for v in p))

    def paste(self, src, x, y):
        """Overwrite (no blending) including transparency."""
        arr = src.a if isinstance(src, Canvas) else src
        h, w = arr.shape[:2]
        x0, y0 = max(0, x), max(0, y)
        x1, y1 = min(self.w, x + w), min(self.h, y + h)
        if x1 <= x0 or y1 <= y0:
            return
        self.a[y0:y1, x0:x1] = arr[y0 - y:y1 - y, x0 - x:x1 - x]

    def crop(self, x, y, w, h):
        c = Canvas(w, h)
        c.paste(Canvas.from_array(self.a[max(0, y):y + h, max(0, x):x + w]), 0, 0)
        return c

    def stamp(self, rows, x, y, cmap, blend=True, flip=False):
        for j, row in enumerate(rows):
            if flip:
                row = row[::-1]
            for i, ch in enumerate(row):
                c = cmap.get(ch)
                if c is None:
                    continue
                (self.put if blend else self.set)(x + i, y + j, c)

    def alpha_mask(self):
        return self.a[:, :, 3] > 0

    def image(self):
        return Image.fromarray(self.a, 'RGBA')

    def save(self, path, scale=1):
        im = self.image()
        if scale != 1:
            im = im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.save(path)


def outline_mask(mask):
    """Pixels inside mask that touch a non-mask pixel (4-neighborhood)."""
    m = mask
    pad = np.pad(m, 1, constant_values=False)
    inner = pad[1:-1, 1:-1] & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    return m & ~inner


def shade_object(cv, mask, ramp_dark, ramp_light, outline=None, x0=0, y0=0):
    """Generic top-left light pass for a filled shape: light rim on top/left, dark rim on bottom/right."""
    h, w = mask.shape
    for y in range(h):
        for x in range(w):
            if not mask[y, x]:
                continue
            up = y > 0 and mask[y - 1, x]
            lf = x > 0 and mask[y, x - 1]
            dn = y < h - 1 and mask[y + 1, x]
            rt = x < w - 1 and mask[y, x + 1]
            if outline is not None and not (up and lf and dn and rt):
                cv.set(x0 + x, y0 + y, outline)
            elif not up or not lf:
                cv.set(x0 + x, y0 + y, ramp_light)
            elif not dn or not rt:
                cv.set(x0 + x, y0 + y, ramp_dark)


def drop_shadow(cv, mask, ox, oy, dx=3, dy=2, a=SHADOW_A, dither_edge=True):
    """Cast a soft shadow of `mask` offset by (dx, dy) into cv at (ox, oy), only where mask is empty.
    The outermost ring of the shadow is checker-dithered for a soft edge."""
    h, w = mask.shape
    sh = np.zeros((h + dy, w + dx), bool)
    sh[dy:, dx:] |= mask
    pad = np.pad(sh, 1, constant_values=False)
    core = pad[1:-1, 1:-1] & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    for y in range(sh.shape[0]):
        for x in range(sh.shape[1]):
            if not sh[y, x]:
                continue
            if y < h and x < w and mask[y, x]:
                continue
            if dither_edge and not core[y, x] and ((x + y + ox + oy) & 1):
                continue
            cv.put(ox + x, oy + y, SH(a))


def mix(c1, c2, t):
    return tuple(int(round(c1[i] + (c2[i] - c1[i]) * t)) for i in range(4))


def nearest_in_ramp(ramp, rgb):
    best, bd = None, 1e9
    for h in RAMPS[ramp]:
        c = hexc(h)
        d = sum((c[i] - rgb[i]) ** 2 for i in range(3))
        if d < bd:
            best, bd = c, d
    return best


# ------------------------------------------------------------------ palette snapping
def _oklab(rgb):
    import numpy as _np
    c = _np.asarray(rgb, _np.float64) / 255.0
    c = _np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    l = _np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = _np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s_ = _np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return _np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s_,
                      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s_,
                      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s_], -1)


def snap_to_palette(cv):
    """Snap every opaque pixel to the nearest palette color (OKLab). Translucent pixels are left alone:
    they are cast shadows the runtime composites over whatever lies beneath."""
    import numpy as _np
    pal = _np.array([hexc(h)[:3] for h in PAL['colors']], _np.float64)
    pl = _oklab(pal)
    a = cv.a
    mask = a[:, :, 3] == 255
    px = a[mask][:, :3].astype(_np.float64)
    if not len(px):
        return 0
    uniq, inv = _np.unique(px, axis=0, return_inverse=True)
    d = ((_oklab(uniq)[:, None, :] - pl[None, :, :]) ** 2).sum(-1)
    near = pal[_np.argmin(d, axis=1)]
    changed = int((_np.abs(near - uniq).sum(1) > 0).sum())
    out = near[inv.reshape(-1)]
    a[mask, :3] = out.astype(_np.uint8)
    return changed
