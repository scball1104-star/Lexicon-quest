"""Whisperwood Hollow battle stage (W8-art), composed from the game's palette like the valley stage.

The hollow is an earthen cave under the pines (map whisperwood_hollow: dirt floor, root trunks, a black ink
pool, braziers). The stage frames it the way FF6 and Secret of Mana frame a cave fight: a dark ceiling broken by
three openings in the canopy, pale shafts of light slanting down through the dust onto the floor where the
battlers stand, a back wall of earth hung with roots, two great willow roots that come down out of the ceiling
and plunge into the floor, the ink pool in the middle distance catching the light, and near roots framing both
edges as dark silhouettes. Below the band line (y 118) the floor stays calm: packed earth, moss, a few pebbles
and rootlets, and the pale pools where the shafts land.

    compose('hollow')  ->  float32 H x W x 3 in 0..1 (build.py quantizes it to the palette)
    python compose_hollow.py  ->  out/_hollow_3x.png (unquantized look)

Deterministic: positions come from integer hashes (pxlib.h32); light falloff is quantized to a few levels with
a Bayer 4 x 4 pattern here, so the shafts land on the palette as clean dithered bands instead of mush.
"""
import math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from compose_valley import W, H, hx, C, mix, poly_mask, ellipse_mask, smooth_profile, h32, rnd  # noqa: E402

BAND_Y = 118           # the battle scene's band starts here
FLOOR_Y = 100          # where the back wall meets the floor
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16.0
THR = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]
YS, XS = np.mgrid[0:H, 0:W].astype(np.float32)

LIGHT = hx('#e8fffb')
LIGHT_WARM = hx('#f6f4ee')

# canopy openings: (x, y, rx, ry) and the slant of their shafts (px right per px down)
HOLES = [(104, 2, 24, 13), (212, 3, 15, 10), (316, 0, 20, 12)]
SLANT = 0.30


def dq(alpha, levels=(0.0, 0.16, 0.32, 0.5)):
    """quantize a 0..1 alpha field to a few levels with the Bayer pattern (dithered bands)"""
    a = np.clip(alpha, 0, levels[-1])
    out = np.zeros_like(a)
    for lo, hi in zip(levels[:-1], levels[1:]):
        t = np.clip((a - lo) / (hi - lo), 0, 1)
        out = np.where(a >= lo, np.where(t > THR, hi, lo), out)
    return out


def vnoise(seed, cw, ch):
    """smooth 2-D value noise over the stage (cells cw x ch px, smoothstep-bilinear), about 0..1"""
    gx, gy = W // cw + 2, H // ch + 2
    g = np.array([[rnd(seed, i, j) for i in range(gx)] for j in range(gy)], np.float32)
    fx, fy = XS / cw, YS / ch
    ix, iy = fx.astype(int), fy.astype(int)
    tx, ty = fx - ix, fy - iy
    tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    a = g[iy, ix] * (1 - tx) + g[iy, ix + 1] * tx
    b = g[iy + 1, ix] * (1 - tx) + g[iy + 1, ix + 1] * tx
    return a * (1 - ty) + b * ty


# ----------------------------------------------------------------------------- base and back wall
WALL_TONES = [('shadow', 0), ('ink', 1), ('shadow', 1), ('earth', 0), ('earth', 1)]


def draw_base(img):
    """ceiling and back wall in exact palette tones, stepped with the Bayer pattern (so the quantizer never
    invents a blue-brown dither band), lighter and warmer toward the floor"""
    tones = [C(r, i) for r, i in WALL_TONES]
    n = vnoise(50, 6, 22)                 # tall cells: vertical earth striations
    for y in range(H):
        for x in range(W):
            if y < FLOOR_Y:
                t = y / FLOOR_Y
                v = 0.4 + t ** 1.2 * 3.4 + (n[y, x] - 0.5) * 1.1
            else:
                v = 4.0
            k = int(np.clip(np.floor(v + THR[y, x] - 0.5), 0, len(tones) - 1))
            img[y, x] = tones[k]
    return img


def draw_holes(img):
    """the canopy openings: pale sky behind pine boughs, with a lit earthen lip"""
    for i, (cx, cy, rx, ry) in enumerate(HOLES):
        m = np.zeros((H, W), bool)
        prof = smooth_profile(60 + i, W, cells=(8, 4), amp=(1.0, 0.5))
        u = (XS - cx) / rx
        depth = cy + ry * np.sqrt(np.clip(1 - u * u, 0, 1)) + prof[None, :] * 2.0
        top = cy - ry * 0.5 * np.sqrt(np.clip(1 - u * u, 0, 1))
        m = (np.abs(u) < 1) & (YS <= depth) & (YS >= np.maximum(0, top))
        f = np.clip((YS - top) / np.maximum(depth - top, 1), 0, 1)
        sky = LIGHT * (1 - f[..., None] * 0.55) + hx('#b4e4f2') * (f[..., None] * 0.55)
        img[m] = sky[m]
        # pine boughs across the opening: jagged dark green tiers hanging from the upper rim
        for k in range(3):
            bx = cx - rx * 0.6 + k * rx * 0.6 + (h32(63, i, k) % 7) - 3
            by = top.min() + 1 + (h32(64, i, k) % 3)
            for j in range(9):
                yy = int(by + j)
                half = (9 - j) * 0.55 + (1 if (j + k) % 3 == 0 else 0)
                for xx in range(int(bx - half), int(bx + half) + 1):
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx]:
                        img[yy, xx] = C('grass', 0) if (xx + j) % 4 else C('grass', 1)
        # the rim: lit earth on the lower lip, dark on the upper
        lo = np.roll(m, -1, 0) & ~m & (YS > cy)
        img[lo] = C('earth', 3)
        img[np.roll(lo, 1, 0) & ~m] = C('earth', 1)
    return img


def shaft_alpha():
    """light from the openings: each shaft widens and fades as it falls, slanting right"""
    a = np.zeros((H, W), np.float32)
    for i, (cx, cy, rx, ry) in enumerate(HOLES):
        strength = (0.62, 0.42, 0.5)[i]
        reach = (150, 120, 140)[i]
        y = YS
        centre = cx + SLANT * (y - cy)
        half = rx * 0.75 + (y - cy) * 0.16
        u = np.abs(XS - centre) / np.maximum(half, 1)
        across = np.clip(1 - u, 0, 1) ** 0.8
        along = np.clip(1 - (y - cy - ry) / reach, 0, 1) ** 0.9
        along = np.where(y < cy + ry * 0.6, 0, along)
        # a few streaks inside the shaft (light broken by needles above)
        streak = 0.75 + 0.25 * np.cos((XS - SLANT * y) * 0.9 + i * 2.1)
        a = np.maximum(a, strength * across * along * streak)
    return a


# ----------------------------------------------------------------------------- roots
def root_v(img, x0, y0, y1, w0, w1, seed, ramp, haze=None, hk=0.0, wobble=6.0, lit_side=-1, moss=False, flare=0, lean=0.0):
    """a root hanging from (x0, y0) to y1: a tapering vertical tube with a lit edge, a shaded edge and a dark
    outline; `flare` widens the last rows where it plunges into the floor"""
    prof = smooth_profile(seed, max(4, y1 - y0 + 1), cells=(24, 9), amp=(1.0, 0.35))
    cols = [C(ramp[0], ramp[1] + k) for k in range(4)]   # outline, dark, base, lit
    if haze is not None:
        cols = [mix(c, haze, hk) for c in cols]
    for y in range(max(0, y0), min(H, y1 + 1)):
        t = (y - y0) / max(1, y1 - y0)
        cx = x0 + prof[y - y0] * wobble + (t ** 2) * wobble * 0.3 + lean * t ** 1.5
        w = w0 + (w1 - w0) * t
        if flare and y > y1 - flare:
            w += ((y - (y1 - flare)) / flare) ** 2 * flare * 1.6
        L, R = int(round(cx - w / 2)), int(round(cx + w / 2))
        for x in range(L, R + 1):
            if not 0 <= x < W:
                continue
            if x == L or x == R:
                c = cols[0]
            else:
                f = (x - L) / max(1, R - L)
                if lit_side < 0:
                    c = cols[3] if f < 0.28 else (cols[1] if f > 0.72 else cols[2])
                else:
                    c = cols[3] if f > 0.72 else (cols[1] if f < 0.28 else cols[2])
                # bark grooves
                if R - L > 6 and h32(seed, x - L, y // 3) % 9 == 0:
                    c = cols[1]
            img[y, x] = c
        if moss and R - L > 5 and h32(seed + 7, y // 4) % 4 == 0:
            for x in (L + 1, L + 2):
                if 0 <= x < W:
                    img[y, x] = C('roof_green', 3) if (x + y) % 2 else C('roof_green', 2)
    return img


def root_h(img, x0, x1, y0, w, seed, ramp, k=None):
    """a root crawling across the floor: a low horizontal tube, lit on top"""
    prof = smooth_profile(seed, max(4, x1 - x0 + 1), cells=(20, 7), amp=(1.0, 0.4))
    cols = [C(ramp[0], ramp[1] + j) for j in range(4)]
    for x in range(max(0, x0), min(W, x1 + 1)):
        t = (x - x0) / max(1, x1 - x0)
        ww = max(1.0, w * (1 - abs(t - 0.5) * 1.4))
        cy = y0 + prof[x - x0] * 2.5
        T, B = int(round(cy - ww / 2)), int(round(cy + ww / 2))
        for y in range(T - 1, B + 2):
            if not 0 <= y < H:
                continue
            if y == T - 1:
                c = cols[0] if ww > 1.5 else None
            elif y == B + 1:
                c = cols[0]
            elif y == T:
                c = cols[3]
            elif y == B:
                c = cols[1]
            else:
                c = cols[2]
            if c is not None:
                img[y, x] = c
    return img


def draw_back_roots(img):
    haze = mix(C('shadow', 2), C('earth', 1), 0.3)
    for i in range(16):
        x = 18 + i * 23 + (h32(70, i) % 11) - 5
        if any(abs(x - (cx + SLANT * 40)) < 6 for cx, _, _, _ in HOLES):
            x += 9
        y1 = 70 + h32(71, i) % 30
        w = 2 + h32(72, i) % 3
        root_v(img, x, 6 + h32(73, i) % 14, y1, w + 1, max(1, w - 1), 700 + i, ('earth', 0), haze, 0.45, wobble=5)
    return img


def draw_great_roots(img):
    # two willow roots out of the ceiling into the floor, framing the middle of the stage
    root_v(img, 62, -2, 112, 15, 9, 801, ('wood', 0), wobble=7, moss=True, flare=14)
    root_v(img, 268, -2, 106, 12, 7, 802, ('wood', 0), wobble=6, moss=True, flare=12)
    return img


def draw_near_frame(img):
    """near roots as dark silhouettes framing both edges (lit on their inner edge by the shafts) and a tangle of
    roots across the ceiling between the canopy openings"""
    # the ceiling tangle: low horizontal roots, skipping the openings
    for i, (y0, x0, x1, w) in enumerate(((5, -4, 80, 6), (12, 30, 140, 4), (4, 128, 196, 5), (9, 226, 300, 5),
                                         (3, 338, 390, 6), (16, 150, 250, 3), (14, 270, 360, 3))):
        root_h(img, x0, x1, y0, w, 170 + i, ('shadow', 0))
    for side in (-1, 1):
        # (top x, top width, bottom width, seed, lean): roots that come in from the corners and bow outward
        specs = ((26, 16, 26, 1, -22), (40, 8, 12, 2, -30), (6, 14, 18, 3, -4)) if side < 0 else                 ((356, 14, 24, 4, 24), (342, 7, 11, 5, 34), (378, 12, 16, 6, 4))
        for (x, w0, w1, sd, ln) in specs:
            root_v(img, x, -4, H + 4, w0, w1, 180 + sd, ('shadow', 0), wobble=4, lit_side=-side, lean=ln)
    return img


# ----------------------------------------------------------------------------- ink pool, floor
POOL = (190, 108, 70, 8.5)     # cx, cy, rx, ry


def pool_mask():
    cx, cy, rx, ry = POOL
    prof = smooth_profile(120, W, cells=(18, 7), amp=(1.0, 0.5))
    u = (XS - cx) / rx
    edge = np.sqrt(np.clip(1 - u * u, 0, 1)) * ry * (1 + 0.18 * prof[None, :].repeat(H, 0))
    return (np.abs(YS - cy) <= edge) & (np.abs(u) < 1)


def moss(img, cx, cy, rx, seed):
    """an irregular moss cushion: a few overlapping ellipses, lit top edge, tufts"""
    m = np.zeros((H, W), bool)
    for k in range(3):
        ox = (h32(seed, k, 1) % (rx + 1)) - rx // 2
        r = max(3, rx - (h32(seed, k, 2) % (rx // 2 + 1)))
        m |= ellipse_mask(cx + ox, cy - (k % 2), r, 1.6 + (k % 2))
    img[m] = C('roof_green', 1)
    inner = m & np.roll(m, 1, 0) & np.roll(m, -1, 0)
    img[inner & (np.roll(m, 2, 0))] = C('roof_green', 2)
    top = m & ~np.roll(m, 1, 0)
    img[top] = C('roof_green', 3)
    ys, xs = np.nonzero(top)
    for j, (y, x) in enumerate(zip(ys, xs)):
        if h32(seed, x, 9) % 4 == 0 and y > 0:
            img[y - 1, x] = C('roof_green', 3) if j % 2 else C('grass', 3)
    bottom = np.roll(m, -1, 0) & ~m
    img[np.roll(bottom, 0, 0) & (YS > FLOOR_Y)] = mix(img[np.roll(bottom, 0, 0) & (YS > FLOOR_Y)], C('earth', 0), 0.6)


def draw_floor(img):
    # packed earth: smooth noise in three tones with dithered borders (elongated cells read as a receding floor),
    # then short strata dashes that lengthen toward the viewer
    n = 0.65 * vnoise(130, 34, 7) + 0.35 * vnoise(131, 12, 4)
    tones = [C('earth', 1), C('earth', 2), mix(C('earth', 2), C('earth', 3), 0.6)]
    for y in range(FLOOR_Y, H):
        t = (y - FLOOR_Y) / (H - FLOOR_Y)
        for x in range(W):
            v = n[y, x] + (t - 0.3) * 0.25
            lvl = v * 3 - 0.6 + (THR[y, x] - 0.5) * 0.5
            img[y, x] = tones[int(np.clip(lvl, 0, 2))]
    for i in range(120):
        y = FLOOR_Y + 3 + h32(138, i) % (H - FLOOR_Y - 4)
        t = (y - FLOOR_Y) / (H - FLOOR_Y)
        x = h32(139, i) % W
        L = 2 + int(t * 6) + h32(140, i) % 3
        c = C('earth', 0) if h32(141, i) % 3 else C('earth', 3)
        for k in range(L):
            if 0 <= x + k < W:
                img[y, x + k] = c
    # the wall foot: a dark seam and fallen soil
    prof = smooth_profile(131, W, cells=(26, 9))
    for x in range(W):
        y = FLOOR_Y + int(round(prof[x] * 1.5))
        img[y, x] = C('earth', 0)
        img[y + 1, x] = mix(C('earth', 0), img[y + 1, x], 0.5)
    for i in range(11):
        cx = 30 + h32(132, i) % (W - 60)
        cy = FLOOR_Y + 8 + h32(133, i) % (H - FLOOR_Y - 14)
        moss(img, cx, cy, 6 + h32(134, i) % 9, 900 + i)
    # pebbles
    for i in range(46):
        x = h32(136, i) % (W - 1)
        y = FLOOR_Y + 3 + h32(137, i) % (H - FLOOR_Y - 5)
        img[y, x] = C('stone_warm', 3)
        img[y, x + 1] = C('stone_warm', 2)
        img[y + 1, x] = C('earth', 0); img[y + 1, x + 1] = C('earth', 0)
    # rootlets across the floor
    root_h(img, 20, 118, 132, 3, 140, ('wood', 0))
    root_h(img, 238, 330, 125, 3, 141, ('wood', 0))
    root_h(img, 90, 170, 168, 4, 142, ('wood', 0))
    root_h(img, 300, 384, 178, 4, 143, ('wood', 0))
    return img


def draw_pool(img, shafts):
    m = pool_mask()
    cx, cy, rx, ry = POOL
    ink = [C('ink', i) for i in range(5)]
    for y, x in zip(*np.nonzero(m)):
        f = (y - (cy - ry)) / (2 * ry)
        img[y, x] = mix(ink[2], ink[1], min(1, f * 1.4))
    # the far edge: a glossy line; the near edge: a mud lip
    up = m & ~np.roll(m, 1, 0)
    down = m & ~np.roll(m, -1, 0)
    img[up] = ink[3]
    lip = np.roll(down, 1, 0) & ~m
    img[lip] = C('earth', 2)
    img[np.roll(lip, 1, 0) & ~m] = C('earth', 0)
    # reflections of the shafts: pale violet streaks where the light falls on the ink, plus ripples
    for i in range(70):
        x = int(cx - rx + h32(150, i) % int(2 * rx))
        y = int(cy - ry + 1 + h32(151, i) % int(2 * ry - 1))
        L = 2 + h32(152, i) % 5
        lit = shafts[y, x] > 0.12
        c = hx('#bc94e2') if lit and i % 3 == 0 else (ink[4] if lit else ink[3])
        for k in range(L):
            if 0 <= x + k < W and m[y, x + k] and not up[y, x + k]:
                img[y, x + k] = c
    return img


def light_pools(shafts):
    """where each shaft meets the floor: a pale ellipse on the ground"""
    a = np.zeros((H, W), np.float32)
    for i, (cx, cy, rx, ry) in enumerate(HOLES):
        fy = (138, 128, 134)[i]
        fx = cx + SLANT * (fy - cy)
        rxx = rx * 0.75 + (fy - cy) * 0.16 + 6
        d = ((XS - fx) / rxx) ** 2 + ((YS - fy) / (rxx * 0.16)) ** 2
        a = np.maximum(a, (0.34, 0.24, 0.3)[i] * np.clip(1 - d, 0, 1) ** 0.7)
    return a


def motes(img, shafts):
    for i in range(46):
        x = h32(160, i) % W
        y = 10 + h32(161, i) % 120
        if shafts[y, x] > 0.15:
            img[y, x] = LIGHT if i % 3 else LIGHT_WARM
    return img


# ----------------------------------------------------------------------------- compose
def compose(mode='hollow'):
    img = np.zeros((H, W, 3), np.float32)
    draw_base(img)
    draw_holes(img)
    draw_back_roots(img)
    draw_floor(img)
    sh = shaft_alpha()
    draw_pool(img, sh)
    draw_great_roots(img)
    # light: the shafts through the air (dithered bands), then the pools on the floor
    a = dq(sh * np.where(YS < FLOOR_Y + 6, 1.0, 0.55))
    img = img * (1 - a[..., None]) + LIGHT * a[..., None]
    lp = dq(light_pools(sh), levels=(0.0, 0.14, 0.26, 0.36))
    img = img * (1 - lp[..., None]) + mix(LIGHT, C('sand', 3), 0.5) * lp[..., None]
    draw_near_frame(img)
    motes(img, sh)
    return np.clip(img, 0, 1)


if __name__ == '__main__':
    from PIL import Image
    a = compose()
    im = Image.fromarray((a * 255 + 0.5).astype(np.uint8), 'RGB')
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    im.resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(HERE, 'out', '_hollow_3x.png'))
    print('wrote out/_hollow_3x.png')
