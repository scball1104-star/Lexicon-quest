"""The five Wider Valley battle stages (X1-tiles, EXPANSION1_PLAN 10.3 and 7.3), composed from the game's palette, tiles and props like the
valley, hollow and road stages (compose_valley.py, compose_hollow.py):

    battle_downs      Shepherd's Downs: a wide open sky, three swells of downland, a drystone wall with a gap, a may-blossom hawthorn, sheep,
                      the Stones on the far crest
    battle_moor       the High Moor: an overcast sky with a low pale sun, heather and bracken slopes, gorse, granite tors, the black tarn, a path
                      with chime posts, the broken Watchtower on the skyline
    battle_barrow     the Wethers' Barrow: a turf-capped stone vault, five burial niches (two lit), cold green-grey flags, mist
    battle_larchhill  Larchhill: warm afternoon, honey drystone terraces climbing to a windmill, orchard rows, white hives, the aqueduct
    battle_culvert    the Weir Culvert: a wet brick vault with iron ribs, a drain mouth with a trickle, standing water, a light shaft

    python x1_compose.py [name]       ->  out/_x1_<name>_3x.png (the unquantized look)
    python x1_build.py                ->  assets/backdrops/x1_battle_*.png + .json (palette-quantized, with bandY / bandAlpha)

Each compose function returns float32 H x W x 3 in 0..1. Light and haze are blended smoothly in float and the quantizer (build.py's ordered
dither between the two nearest palette colours) turns them into clean dithered bands. The stage floor below y 116 stays calm (the battle scene
darkens it with its band from bandY down and the sprites stand on it). Everything is deterministic (integer hashes, never a global RNG).
"""
import json, math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from compose_valley import (W, H, hx, C, mix, Layer, poly_mask, ellipse_mask, edge_of, smooth_profile, cloud,  # noqa: E402
                            hill_top, h32, rnd, NEXT, grass_fill_tiles)

BAND_Y = 118
YS, XS = np.mgrid[0:H, 0:W].astype(np.float32)
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16.0
THR = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]
K = lambda i: C('stone_cool', i)
RG = lambda i: C('roof_green', i)
EA = lambda i: C('earth', i)
GR = lambda i: C('grass', i)
WD = lambda i: C('wood', i)
RR = lambda i: C('roof_red', i)
PA = lambda i: C('path', i)
WHITE = hx('#f6f4ee')

TILES = os.path.join(NEXT, 'assets', 'tiles')
_X1 = {}


def x1_tiles():
    if not _X1:
        with open(os.path.join(TILES, 'x1_tiles.json'), encoding='utf-8') as f:
            _X1['db'] = json.load(f)
        _X1['img'] = np.asarray(Image.open(os.path.join(TILES, 'x1.png')).convert('RGB')).astype(np.float32) / 255
    return _X1['db'], _X1['img']


def floor_fill(img, terrain, y0, seed=7, weights=None):
    """The x1 sheet's own terrain fill, variant per 16 px cell by hash (as the map picks them), from y0 down."""
    db, sh = x1_tiles()
    t = db['terrains'][terrain]
    vs = t['variants']
    ws = weights or t.get('variantWeights') or [4] + [2] * (len(vs) - 1)
    tot = sum(ws)
    for cy in range(y0 // 16, (H + 15) // 16 + 1):
        for cx in range(0, W // 16 + 1):
            r = h32(seed, cx, cy) % tot
            k = 0
            while r >= ws[k]:
                r -= ws[k]
                k += 1
            vx, vy = vs[k]
            tile = sh[vy:vy + 16, vx:vx + 16]
            for yy in range(16):
                y = cy * 16 + yy
                if y < y0 or y >= H:
                    continue
                x1 = min(W, cx * 16 + 16)
                img[y, cx * 16:x1] = tile[yy, :x1 - cx * 16]
    return img


def banded_sky(img, stops, y_end, blend=0.3):
    n = len(stops)
    col = np.zeros((H, 3), np.float32)
    for y in range(H):
        t = min(1.0, y / float(y_end))
        for i in range(n - 1):
            t0, t1 = stops[i][0], stops[i + 1][0]
            if t <= t1 or i == n - 2:
                seg = (t - t0) / max(t1 - t0, 1e-6)
                f = 0.0 if seg < 1 - blend else (seg - (1 - blend)) / blend
                col[y] = mix(stops[i][1], stops[i + 1][1], min(1.0, f))
                break
    img[:] = col[:, None, :]
    return img


def clouds(img, pal, specs, haze, haze_from=40, haze_k=0.45):
    layer = Layer()
    for band, lst in specs:
        for i, (cx, cy, w, h) in enumerate(lst):
            cloud(layer, pal, cx, cy, w, h, seed=500 + band * 10 + i, flat=0.5 + band * 0.15)
    ys = np.arange(H, dtype=np.float32)
    kcl = np.clip((ys - haze_from) / 50.0, 0, 1)[:, None] * haze_k
    return layer.composite_onto(img, haze, np.broadcast_to(kcl, (H, W)))


def swell(img, domes, base_y, body, crest, haze, hk, seed, amp=1.5, cells=(40, 16), speck=None, bottom=None):
    """A long hill: dome-sum silhouette plus a smooth wobble, filled `body` with a lighter crest line, hazed by hk. speck = (colour, density)
    scatters dry-grass or flower specks on it."""
    L = Layer()
    prof = smooth_profile(seed, W, cells=cells, amp=(1.0, 0.5))
    bot = bottom if bottom is not None else base_y + 14
    tops = []
    for x in range(W):
        top = int(round(hill_top(domes, base_y, x) + prof[x] * amp))
        tops.append(top)
        for y in range(top, bot):
            c = crest if y == top else body
            if speck and h32(x, y, seed) % 100 < speck[1] * 100:
                c = speck[0]
            L.put(x, y, c)
    swell.tops = tops
    return L.composite_onto(img, haze, hk)


def soft(img, mask, c, alpha):
    """blend colour c over img where mask, by a smooth alpha field (scalar or HxW); the quantizer dithers it"""
    a = np.broadcast_to(np.asarray(alpha, np.float32), (H, W)) * mask
    return img * (1 - a[..., None]) + np.asarray(c, np.float32) * a[..., None]


def blob(L, cx, cy, rx, ry, tones, edge, light=(-0.5, -0.8)):
    """a lit blob into Layer L: tones = [dark, mid-dark, mid, light]"""
    m = ellipse_mask(cx, cy, rx, ry)
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
        d = math.hypot(dx, dy)
        if d > 0.9 and edge is not None:
            L.put(x, y, edge)
            continue
        t = light[0] * dx + light[1] * dy - d * 0.2
        L.put(x, y, tones[3] if t > 0.55 else tones[2] if t > 0.1 else tones[1] if t > -0.35 else tones[0])


def outline_union(L, T, edge):
    """copy layer T onto L with a 1 px outline round the union of everything in T (no outlines between overlapping lobes)"""
    m = T.a > 0
    p = np.pad(m, 1)
    inner = p[1:-1, 1:-1] & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        L.put(x, y, edge if not inner[y, x] else T.rgb[y, x])


def tree_crown(L, cx, cy, r, tones, edge, seed, fruit=None, n_lobes=7):
    """a leafy crown of overlapping lobes (irregular), lit from the top-left; fruit = colour of dots scattered on it"""
    lobes = []
    for i in range(n_lobes):
        a = (i / float(n_lobes)) * 2 * math.pi + rnd(seed, i) * 0.8
        d = r * (0.25 + 0.5 * rnd(seed, i, 2))
        lobes.append((cx + d * math.cos(a), cy + d * math.sin(a) * 0.7, r * (0.5 + 0.3 * rnd(seed, i, 3)), r * (0.4 + 0.25 * rnd(seed, i, 4))))
    lobes.append((cx, cy, r * 0.75, r * 0.6))
    T = Layer()
    for (lx, ly, rx, ry) in sorted(lobes, key=lambda l: l[1]):
        blob(T, lx, ly, rx, ry, tones, None)
    outline_union(L, T, edge)
    if fruit is not None:
        for i in range(int(r * 1.6)):
            x = int(cx - r * 0.8 + h32(seed, i, 5) % int(max(2, r * 1.6)))
            y = int(cy - r * 0.55 + h32(seed, i, 6) % int(max(2, r * 1.1)))
            if 0 <= x < W and 0 <= y < H and L.a[y, x] > 0:
                L.put(x, y, fruit)


def hawthorn(L, cx, by, h, seed, bloom=True):
    """a hawthorn: a short thick gnarled trunk with a fork under a wide, low, billowing crown of five or six lobes; may blossom
    (white) or red haws"""
    lean = 2 if seed % 2 else -2
    # roots and trunk
    for y in range(by - int(h * 0.42), by + 1):
        t = (by - y) / float(h * 0.42)
        w = 6 if t < 0.2 else (5 if t < 0.5 else 4)
        x0 = cx - w // 2 + int(round(lean * t))
        for k in range(w):
            ci = 4 if k == 0 else (3 if k < w - 2 else (2 if k < w - 1 else 1))
            if (y + k * 2 + seed) % 5 == 0 and ci > 2:
                ci = 2
            L.put(x0 + k, y, WD(ci))
    for k in range(int(h * 0.2)):
        L.put(cx + lean + 2 + k // 2, by - int(h * 0.42) - k, WD(2))
        L.put(cx + lean - 3 - k // 2, by - int(h * 0.42) - k, WD(3))
    r = h * 0.5
    ccx, ccy = cx + lean, by - h * 0.7
    tones = [GR(1), GR(2), GR(3), GR(4)]
    edge = C('foliage_dark', 0)
    lobes = [(ccx, ccy - r * 0.18, r * 0.62, r * 0.46), (ccx - r * 0.55, ccy + r * 0.05, r * 0.5, r * 0.38), (ccx + r * 0.55, ccy + r * 0.08, r * 0.52, r * 0.4),
             (ccx - r * 0.25, ccy - r * 0.45, r * 0.4, r * 0.3), (ccx + r * 0.3, ccy - r * 0.4, r * 0.42, r * 0.3), (ccx, ccy + r * 0.26, r * 0.7, r * 0.3)]
    T = Layer()
    for (lx, ly, rx, ry) in sorted(lobes, key=lambda l: l[1]):
        blob(T, lx, ly, rx, ry, tones, None)
    outline_union(L, T, edge)
    for i in range(int(h * 2.0)):
        x = int(ccx - r * 1.05 + h32(seed, i, 1) % int(r * 2.1))
        y = int(ccy - r * 0.6 + h32(seed, i, 2) % int(r * 1.2))
        if 0 <= x < W and 0 <= y < H and L.a[y, x] > 0:
            L.put(x, y, WHITE if (bloom and i % 3 != 2) else (hx('#e2e0de') if bloom else RR(3)))
    for x in range(cx - 10, cx + 12):
        L.put(x, by + 1, GR(1), 0.7)


def stones_row(L, pts, ramp=K):
    for (x, y, h, w) in pts:
        for dy in range(h):
            for dx in range(w):
                L.put(x + dx, y - dy, ramp(4) if dx == 0 else (ramp(3) if dx < w - 1 else ramp(2)))
        L.put(x, y - h, ramp(5))


def near_tor(L, cx, base, w, h, seed):
    """a big granite tor in the foreground: stacked rounded blocks lit from the top-left, dark clefts, lichen, a cap of heather and turf"""
    lobes = [(cx, base - h * 0.45, w * 0.5, h * 0.5), (cx - w * 0.32, base - h * 0.28, w * 0.3, h * 0.3), (cx + w * 0.34, base - h * 0.22, w * 0.3, h * 0.26),
             (cx + w * 0.05, base - h * 0.78, w * 0.3, h * 0.24), (cx - w * 0.1, base - h * 0.12, w * 0.5, h * 0.14)]
    for (lx, ly, rx, ry) in sorted(lobes, key=lambda l: l[1]):
        blob(L, lx, ly, rx, ry, [K(1), K(2), K(3), K(4)], K(0))
    for i in range(int(w * h / 14)):
        x = int(cx - w * 0.55 + h32(i, seed, 1) % int(w * 1.1))
        y = int(base - h + h32(i, seed, 2) % int(h))
        if 0 <= x < W - 3 and 0 <= y < H and L.a[y, x] > 0:
            if i % 5 == 0:
                for k in range(4):
                    L.put(x + k, y + (k // 2), K(0))
            elif i % 7 == 0:
                L.put(x, y, hx('#c38334'))
                L.put(x + 1, y, hx('#eba14d'))
            elif i % 3 == 0:
                L.put(x, y, K(5))
                L.put(x + 1, y, K(4))
    # a heather and turf cap
    for x in range(int(cx - w * 0.22), int(cx + w * 0.4)):
        for y in range(int(base - h * 1.0), int(base - h * 0.9)):
            if L.a[y + 1, x] > 0 and L.a[y, x] == 0:
                L.put(x, y, C('roof_purple', 2) if (x + y) % 2 else C('stone_warm', 1))
                L.put(x, y - 1, GR(2) if h32(x, seed) % 2 else C('roof_purple', 3))


def hedge(L, x0, x1, base, hgt, seed, bloom=True):
    """a hedgerow bank: clustered leaf masses with may blossom (or haws), dark at the foot"""
    tones = [GR(1), GR(2), GR(3), GR(4)]
    x = x0
    i = 0
    T = Layer()
    while x < x1:
        r = hgt * (0.5 + 0.4 * rnd(seed, i))
        blob(T, x, base - r * 0.8, r * 1.0, r * 0.85, tones, None)
        x += int(r * 1.3)
        i += 1
    outline_union(L, T, C('foliage_dark', 0))
    for k in range(int((x1 - x0) * hgt / 6)):
        xx = x0 + h32(seed, k, 3) % max(1, x1 - x0)
        yy = base - hgt + h32(seed, k, 4) % hgt
        if 0 <= xx < W and 0 <= yy < H and L.a[yy, xx] > 0:
            L.put(xx, yy, WHITE if (bloom and k % 3) else RR(3))


# ====================================================================== battle_downs
def compose_downs():
    img = np.zeros((H, W, 3), np.float32)
    sky = [(0, C('water', 3)), (0.45, C('water', 4)), (0.8, C('water', 5)), (1.0, hx('#e8fffb'))]
    banded_sky(img, sky, 90)
    pal = dict(cloud_lit=WHITE, cloud_body=hx('#e8fffb'), cloud_shade=hx('#b4e4f2'), cloud_dark=hx('#8fcbe8'))
    haze = mix(hx('#b4e4f2'), hx('#e8fffb'), 0.55)
    specs = [(0, [(70, 22, 90, 15), (200, 14, 60, 12), (310, 26, 96, 17)]),
             (1, [(20, 48, 50, 9), (140, 44, 76, 10), (250, 52, 44, 8), (350, 46, 60, 9)]),
             (2, [(90, 66, 38, 5), (210, 68, 46, 5), (330, 64, 36, 4)])]
    img = clouds(img, pal, specs, haze, haze_from=36)
    hz = 86
    # three swells of downland, each a different green, the farthest bluest; the Stones stand on the far crest with a barrow beside them
    img = swell(img, [(70, 160, 16), (230, 130, 10), (360, 150, 18)], hz - 2, mix(hx('#6ab3e4'), hx('#84ad39'), 0.3),
                mix(haze, hx('#b6cc58'), 0.4), haze, 0.55, 31, amp=1.6)
    tops = swell.tops
    L = Layer()
    stones_row(L, [(x, tops[x] + 1, h, 3) for (x, h) in ((60, 9), (69, 12), (78, 8), (88, 6))])
    for x in range(110, 146):
        t = (x - 110) / 36.0
        for y in range(int(tops[x] - 6 * math.sin(t * math.pi)), tops[x] + 3):
            L.put(x, y, mix(GR(3), haze, 0.35) if y > tops[x] - 6 * math.sin(t * math.pi) + 1 else mix(GR(4), haze, 0.3))
    img = L.composite_onto(img, haze, 0.26)
    img = swell(img, [(40, 110, 14), (190, 150, 10), (340, 120, 15)], hz + 10, mix(GR(3), hx('#6ab3e4'), 0.25),
                mix(GR(4), haze, 0.45), haze, 0.3, 32, amp=1.2, speck=(GR(4), 0.05))
    # sheep on the second swell: little wool bodies with a dark face, loose flocks
    L = Layer()
    for (fx, fy, n, sd) in ((190, hz + 6, 7, 1), (78, hz + 9, 5, 2), (306, hz + 7, 6, 3)):
        for i in range(n):
            x = fx + (h32(60, i, sd) % 50) - 25
            y = fy + (h32(61, i, sd) % 7)
            for dx in range(3):
                L.put(x + dx, y, WHITE if dx != 1 else hx('#e2e0de'))
                L.put(x + dx, y + 1, hx('#b3b6c4') if dx != 1 else WHITE)
            L.put(x - 1, y, C('shadow', 1))
            L.put(x - 1, y + 1, C('shadow', 2))
            L.put(x, y + 2, GR(1), 0.8)
            L.put(x + 2, y + 2, GR(1), 0.8)
    img = L.composite_onto(img, haze, 0.16)
    img = swell(img, [(120, 150, 9), (300, 170, 7)], hz + 22, mix(GR(3), GR(4), 0.5), mix(GR(4), GR(5), 0.4), haze, 0.15, 33, amp=1.0,
                bottom=BAND_Y + 4, speck=(GR(2), 0.04))
    # the drystone wall along the near swell: courses, lit tops, a gap with two posts and a stile board
    L = Layer()
    ytop = (hz + 24 + 2.5 * np.sin(np.arange(W) / 60.0 + 0.5)).astype(int)
    for x in range(W):
        if 242 < x < 254:
            continue
        y0 = int(ytop[x])
        for k in range(5):
            c = K(5) if k == 0 and x % 7 else (K(4) if k == 0 else (K(3) if (x // 3 + k) % 3 else K(2)))
            if k == 4:
                c = K(1)
            L.put(x, y0 + k, c)
        if h32(x, 55) % 8 == 0:
            L.put(x, y0 - 1, K(3))
        L.put(x, y0 + 5, GR(1), 0.9)
    for xs_ in (242, 254):
        y0 = int(ytop[xs_])
        for k in range(-5, 5):
            L.put(xs_, y0 + k, K(3))
            L.put(xs_ + (1 if xs_ == 242 else -1), y0 + k, K(2))
        L.put(xs_, y0 - 6, K(5))
    for x in range(243, 253):
        L.put(x, int(ytop[x]) - 1, WD(3))
        L.put(x, int(ytop[x]) - 2, WD(4))
    img = L.composite_onto(img, haze, 0.06)
    # a hawthorn in may blossom, left, and a far one right; a hay rick and a signpost by the gap
    L = Layer()
    hawthorn(L, 54, 122, 74, 11)
    img = L.composite_onto(img)
    L = Layer()
    hawthorn(L, 338, 112, 34, 12, bloom=False)
    img = L.composite_onto(img, haze, 0.1)
    L = Layer()
    hedge(L, 286, 384, 119, 20, 13)
    for x in range(286, 384):
        L.put(x, 119, GR(1), 0.9)
    img = L.composite_onto(img)
    L = Layer()
    for y in range(hz + 14, hz + 27):
        half = 2 + (y - (hz + 14)) * 0.55
        for x in range(int(150 - half), int(150 + half) + 1):
            L.put(x, y, C('sand', 2) if x < 150 else C('path', 2))
    L.put(150, hz + 13, WD(3))
    for k in range(7):
        L.put(274, hz + 17 + k, WD(3))
    for x in range(270, 280):
        L.put(x, hz + 17, WD(4))
        L.put(x, hz + 18, WD(2))
    img = L.composite_onto(img, haze, 0.06)
    # the meadow floor: the valley's own grass fill
    tiles = grass_fill_tiles()
    wts = [4, 2, 2, 2, 2, 2]
    tot = sum(wts)
    for cy in range((BAND_Y - 2) // 16, (H + 15) // 16 + 1):
        for cx in range(0, W // 16 + 1):
            r = h32(62, cx, cy) % tot
            k = 0
            while r >= wts[k]:
                r -= wts[k]
                k += 1
            for yy in range(16):
                y = cy * 16 + yy
                if y < BAND_Y - 2 or y >= H:
                    continue
                x1 = min(W, cx * 16 + 16)
                img[y, cx * 16:x1] = tiles[k][yy, :x1 - cx * 16]
    return np.clip(img, 0, 1)


# ====================================================================== battle_moor
def compose_moor():
    img = np.zeros((H, W, 3), np.float32)
    sky = [(0, K(3)), (0.35, mix(K(3), K(4), 0.6)), (0.7, K(5)), (1.0, hx('#e2e0de'))]
    banded_sky(img, sky, 86)
    glow = np.clip(1 - np.hypot((XS - 118) / 80.0, (YS - 70) / 28.0), 0, 1) ** 1.3
    img = soft(img, np.ones((H, W), np.float32), hx('#f6f4ee'), glow * 0.6)
    pal = dict(cloud_lit=WHITE, cloud_body=K(5), cloud_shade=K(4), cloud_dark=K(3))
    haze = mix(K(5), hx('#e2e0de'), 0.6)
    specs = [(0, [(40, 20, 100, 16), (170, 10, 80, 13), (300, 22, 110, 17)]),
             (1, [(20, 44, 70, 10), (130, 48, 84, 11), (240, 42, 66, 10), (378, 38, 40, 8)]),
             (2, [(80, 62, 50, 6), (200, 64, 60, 6)])]
    img = clouds(img, pal, specs, haze, haze_from=30, haze_k=0.35)
    hz = 80
    img = swell(img, [(40, 140, 14), (190, 120, 8), (330, 150, 16)], hz - 2, mix(hx('#6ab3e4'), K(4), 0.55), mix(haze, K(4), 0.35), haze, 0.5, 71)
    # the Watchtower on the right ridge: a broken shaft, one lit slit, rubble
    L = Layer()
    tx, ty = 296, hz - 28
    for x in range(tx, tx + 10):
        top = ty + int((x - tx) * 1.2) + h32(x, 80) % 2
        for y in range(top, hz + 2):
            L.put(x, y, K(2) if x > tx + 5 else K(3))
    L.put(tx + 3, ty + 9, hx('#eba14d'))
    L.put(tx + 3, ty + 10, hx('#c38334'))
    for k in range(7):
        L.put(tx + 10 + k, ty + 13 + k * 2, K(2))
    img = L.composite_onto(img, haze, 0.28)
    heath = mix(C('roof_purple', 1), C('stone_warm', 1), 0.5)
    bracken = mix(EA(2), EA(3), 0.4)
    olive = mix(GR(2), EA(2), 0.12)
    # a rolling moor: three overlapping swells in olive, heather and bracken, then a patchwork of the same on the ground in front
    img = swell(img, [(60, 130, 13), (250, 110, 12), (390, 70, 14)], hz + 6, mix(heath, K(2), 0.25), mix(C('stone_warm', 2), haze, 0.4), haze, 0.3, 72,
                amp=1.4, speck=(C('roof_purple', 2), 0.06))
    def tors(img):
        L = Layer()
        for (cx, cy, rx, ry) in ((216, hz + 2, 24, 16), (244, hz + 7, 22, 12), (196, hz + 9, 14, 9), (270, hz + 10, 14, 8)):
            blob(L, cx, cy, rx, ry, [K(1), K(2), K(3), K(4)], K(0))
        # facets: dark clefts and lit planes on the tors
        for i in range(150):
            x = 176 + h32(i, 90) % 120
            y = hz - 16 + h32(i, 91) % 40
            if 0 <= x < W - 3 and 0 <= y < H and L.a[y, x] > 0:
                if i % 5 == 0:
                    for k in range(4):
                        L.put(x + k, y + (k // 2), K(0))
                elif i % 7 == 0:
                    L.put(x, y, hx('#c38334'))
                    L.put(x + 1, y, hx('#eba14d'))
                elif i % 3 == 0:
                    L.put(x, y, K(5))
                    L.put(x + 1, y, K(4))
        img = L.composite_onto(img, haze, 0.12)
        return img

    # ground patchwork: value noise picks olive / heather / bracken / peat, stretched wide for depth
    n1 = np.zeros((H, W), np.float32)
    for yy in range(H):
        cw = 14 + max(0, yy - hz) * 0.9
        ch = 3.0 + max(0, yy - hz) * 0.18
        gx, gy = int(W / cw) + 3, int(H / ch) + 3
        for xx in range(W):
            fx, fy = xx / cw, yy / ch
            ix, iy = int(fx), int(fy)
            tx, ty = fx - ix, fy - iy
            tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
            g = lambda a, b: rnd(a, b, 160)
            v = (g(ix, iy) * (1 - tx) + g(ix + 1, iy) * tx) * (1 - ty) + (g(ix, iy + 1) * (1 - tx) + g(ix + 1, iy + 1) * tx) * ty
            n1[yy, xx] = v
    ground = np.zeros((H, W, 3), np.float32)
    for yy in range(hz, BAND_Y):
        for xx in range(W):
            v = n1[yy, xx]
            c = olive
            if v > 0.68:
                c = mix(heath, K(2), 0.15)
            elif v > 0.56:
                c = mix(heath, olive, 0.5)
            elif v < 0.22:
                c = mix(bracken, olive, 0.25)
            elif v < 0.3:
                c = mix(bracken, olive, 0.6)
            elif 0.4 < v < 0.46:
                c = mix(EA(0), olive, 0.55)
            ground[yy, xx] = c
    gmask = (YS >= hz) & (YS < BAND_Y)
    img[gmask] = ground[gmask]
    img = tors(img)
    L = Layer()
    near_tor(L, 338, 120, 84, 64, 5)
    for k in range(34):
        x = 296 + h32(k, 7) % 84
        L.put(x, 119 - h32(k, 8) % 5, GR(1) if k % 3 else hx('#eba14d'))
        L.put(x + 1, 119 - h32(k, 8) % 5, GR(2) if k % 3 else hx('#f9d77a'))
    img = L.composite_onto(img, haze, 0.05)
    L = Layer()
    stones_row(L, [(18, 118, 30, 6), (30, 120, 22, 5)])
    for (sx_, sy_) in ((16, 112), (22, 98), (34, 104)):
        L.put(sx_, sy_, hx('#c38334'))
    img = L.composite_onto(img, haze, 0.05)
    for i in range(520):
        x = h32(85, i) % W
        y = hz + 2 + h32(86, i) % (BAND_Y - hz - 4)
        t = (y - hz) / float(BAND_Y - hz)
        img[y, x] = mix(GR(1), C('foliage_dark', 1), 0.4) if i % 3 else mix(PA(2), olive, 0.4)
        if t > 0.35 and i % 4 == 0:
            img[y - 1, x] = PA(2) if i % 8 else RR(3)
    for (gx, gy, n, rr) in ((70, hz + 14, 120, 26), (300, hz + 13, 110, 24), (160, hz + 22, 60, 16), (352, hz + 24, 40, 12)):
        for i in range(n):
            x = gx + (h32(i, gx, 81) % (2 * rr)) - rr
            y = gy + (h32(i, gx, 82) % 9) - 4
            if 0 <= x < W - 1 and 0 <= y < H:
                img[y, x] = GR(1) if i % 3 else hx('#eba14d')
                img[y, x + 1] = GR(2) if i % 3 else hx('#f9d77a')
    m = ellipse_mask(150, hz + 21, 38, 6)
    img[m] = C('ink', 1)
    up = m & ~np.roll(m, 1, 0)
    img[up] = C('ink', 3)
    for i in range(40):
        x = 120 + h32(87, i) % 60
        y = hz + 17 + h32(88, i) % 8
        if m[y, x] and not up[y, x]:
            img[y, x] = K(4) if i % 3 == 0 else C('ink', 2)
    lip = np.roll(m, 1, 0) & ~m
    img[lip] = EA(1)
    for y in range(hz + 8, BAND_Y):
        t = (y - hz - 8) / float(BAND_Y - hz - 8)
        xc = 252 + 22 * (1 - t) ** 1.2 + 12 * math.sin(t * 4.5)
        half = 1.0 + 4.5 * t
        for x in range(int(xc - half), int(xc + half) + 1):
            if 0 <= x < W:
                img[y, x] = mix(PA(2), PA(3), 0.4) if h32(x, y, 89) % 4 else PA(1)
    L = Layer()
    for (px, py, h) in ((270, hz + 15, 8), (252, hz + 26, 11), (238, hz + 35, 13)):
        for y in range(py - h, py):
            L.put(px, y, WD(1))
        for k in range(-2, 3):
            L.put(px + k, py - h, WD(2))
        for k in range(3):
            for j in range(max(2, h // 3)):
                L.put(px - 1 + k, py - h + 1 + j, WD(4) if k == 0 else WD(3))
    img = L.composite_onto(img, haze, 0.08)
    # the floor: the moor's own turf, then a pale mist along the far edge
    img = floor_fill(img, 'x1_moor_turf', BAND_Y - 2, seed=91)
    fl = (YS >= BAND_Y - 2)
    img = soft(img, fl, olive, 0.32) * 0.96
    for y in range(hz - 2, BAND_Y):
        t = np.clip((y - hz) / (BAND_Y - hz), 0, 1)
        k = 0.34 * (1 - t) ** 2
        img[y] = img[y] * (1 - k) + haze * k
    return np.clip(img, 0, 1)


# ====================================================================== battle_larchhill
def compose_larchhill():
    img = np.zeros((H, W, 3), np.float32)
    sky = [(0, C('water', 3)), (0.42, C('water', 4)), (0.74, hx('#f6e4b9')), (1.0, hx('#f9d77a'))]
    banded_sky(img, sky, 84)
    pal = dict(cloud_lit=hx('#fff7d6'), cloud_body=hx('#f6e4b9'), cloud_shade=hx('#e4cb96'), cloud_dark=hx('#c3a57c'))
    haze = mix(hx('#f6e4b9'), hx('#fcc4dc'), 0.1)
    specs = [(0, [(60, 20, 80, 14), (210, 14, 60, 12), (330, 24, 90, 15)]),
             (1, [(22, 44, 46, 9), (160, 46, 66, 10), (290, 40, 50, 9)])]
    img = clouds(img, pal, specs, haze, haze_from=30, haze_k=0.3)
    # the far hillside in golden haze, with the old aqueduct along its ridge
    img = swell(img, [(60, 160, 26), (250, 140, 18), (380, 110, 28)], 70, mix(hx('#84ad39'), hx('#f6e4b9'), 0.45), mix(haze, hx('#e4cb96'), 0.4),
                haze, 0.5, 101, amp=1.5)
    L = Layer()
    by = 40
    for x in range(30, 250):
        for k in range(2):
            L.put(x, by + k, PA(3) if k == 0 else PA(2))
        L.put(x, by - 1, C('sand', 3) if x % 5 else PA(4))
        for y in range(by + 2, by + 9):
            arch = (x - 30) % 10
            inside = 1 <= arch <= 7 and (y - by - 2) < 7 - abs(arch - 4) * 1.5
            if not inside:
                L.put(x, y, PA(2) if (x + y) % 3 else PA(1))
    img = L.composite_onto(img, haze, 0.4)
    # the Windmill on the hilltop (left of centre): a whitewashed tower, a red cap, four sails
    L = Layer()
    wx, wy = 322, 33
    for y in range(wy, wy + 26):
        half = 5 + (y - wy) * 0.2
        for x in range(int(wx - half), int(wx + half) + 1):
            L.put(x, y, WHITE if x < wx - half * 0.3 else (hx('#e2e0de') if x < wx + half * 0.4 else hx('#b3b6c4')))
    for y in range(wy - 7, wy):
        half = 1 + (y - (wy - 7)) * 1.0
        for x in range(int(wx - half), int(wx + half) + 1):
            L.put(x, y, RR(3) if x < wx else RR(1))
    ang = math.radians(18)
    for k in range(4):
        a = ang + k * math.pi / 2
        for r in range(2, 24):
            L.put(int(round(wx + r * math.cos(a))), int(round(wy - 3 + r * math.sin(a))), WD(2))
        for r in range(7, 23):
            for w_ in (1, 2, 3, 4):
                L.put(int(round(wx + r * math.cos(a) - w_ * math.sin(a))), int(round(wy - 3 + r * math.sin(a) + w_ * math.cos(a))),
                      WHITE if (r + w_) % 2 else hx('#e2e0de'))
    img = L.composite_onto(img, haze, 0.12)
    # terraces climbing the hill: each a honey drystone wall under a gold-green orchard strip with a row of fruit trees, bigger and warmer
    # toward the viewer; hives on one, a lane stepping down
    ter = [(58, 5, 0.22), (70, 7, 0.16), (84, 9, 0.1), (100, 11, 0.04)]
    for ti, (ty, wh, hk) in enumerate(ter):
        nxt = ter[ti + 1][0] if ti + 1 < len(ter) else BAND_Y
        grass = mix(hx('#84ad39'), hx('#b6cc58'), 0.2 + 0.08 * ti)
        for y in range(ty + wh, nxt):
            t = (y - (ty + wh)) / max(1.0, nxt - ty - wh)
            img[y] = mix(grass, GR(3), 0.15 + 0.35 * t)
        for i in range(28):
            x = h32(110 + ti, i) % W
            y = ty + wh + 1 + h32(120 + ti, i) % max(1, nxt - ty - wh - 2)
            if y < nxt:
                img[y, x] = GR(3) if i % 2 else C('sand', 2)
        L = Layer()
        for x in range(W):
            for k in range(wh):
                y = ty + k
                if k == 0:
                    c = GR(1)
                else:
                    c = PA(4) if k == 1 else (PA(3) if (x // 4 + k) % 3 else PA(2))
                    if k == wh - 1:
                        c = EA(3)
                    if (x + ti * 3) % 29 < 1:
                        c = PA(1)
                L.put(x, y, c)
        sz = 3 + ti * 2
        for x0 in range(-3 + ti * 4, W + 12, 12 + ti * 4):
            tx_ = x0 + (h32(ti, x0, 105) % 3)
            tones = [GR(1), GR(2), GR(3), GR(4)] if (x0 // 6) % 3 else [C('foliage_dark', 1), RG(2), RG(3), RG(4)]
            blob(L, tx_, ty - sz * 0.85, sz * 0.95, sz * 0.8, tones, C('foliage_dark', 0))
            for k in range(2 + ti):
                L.put(tx_, int(ty - sz * 0.1 + k), WD(1))
            if ti > 0:
                L.put(tx_ + 1, int(ty - sz * 1.0), RR(3))
                if ti > 1:
                    L.put(tx_ - 2, int(ty - sz * 0.7), RR(3))
        if ti == 1:
            for hx_ in (20, 26, 32, 330, 337):
                for dy in range(3):
                    L.put(hx_, ty - 3 + dy, WHITE)
                    L.put(hx_ + 1, ty - 3 + dy, hx('#e2e0de'))
                L.put(hx_, ty - 4, WD(3))
                L.put(hx_ + 1, ty - 4, WD(2))
        img = L.composite_onto(img, haze, hk)
    img = floor_fill(img, 'x1_orchard_turf', BAND_Y - 2, seed=121)
    L = Layer()
    for y in range(88, 124):
        t = (124 - y) / 36.0
        w = 6 if t < 0.6 else 5
        for k in range(w):
            L.put(46 - w // 2 + k + int(1.5 * t), y, WD(4) if k == 0 else (WD(3) if k < w - 1 else WD(1)))
    tree_crown(L, 46, 70, 28, [GR(1), GR(2), GR(3), GR(4)], C('foliage_dark', 0), 77, fruit=RR(3), n_lobes=8)
    for x in range(30, 66):
        L.put(x, 124, GR(1), 0.7)
    hedge(L, 300, 384, 119, 18, 21, bloom=False)
    img = L.composite_onto(img)
    return np.clip(img, 0, 1)


# ====================================================================== battle_barrow
def compose_barrow():
    img = np.zeros((H, W, 3), np.float32)
    FY = 100
    tones = [C('shadow', 0), C('shadow', 1), K(1), K(2), K(3)]
    for y in range(H):
        for x in range(W):
            if y < FY:
                t = y / float(FY)
                v = 0.2 + t ** 1.3 * 3.4 + (rnd(x // 6, y // 3, 140) - 0.5) * 0.7
            else:
                v = 3.6
            k = int(np.clip(np.floor(v + THR[y, x] - 0.5), 0, len(tones) - 1))
            img[y, x] = tones[k]
    # ashlar courses: a lit lip and a dark joint per course, staggered upright joints
    for cy in range(28, FY, 9):
        for x in range(W):
            img[cy, x] = K(1) if h32(x, cy, 141) % 5 else K(2)
            if cy + 1 < FY:
                img[cy + 1, x] = mix(img[cy + 1, x], K(3), 0.5)
        k = (cy // 9) % 2
        for x in range(k * 12, W, 24):
            for y in range(cy, min(FY, cy + 9)):
                img[y, x] = K(1)
    # three stone arches carry the vault: ribs rising from the wall and meeting over the stage
    for ax in (0, 192, 384):
        for y in range(0, 34):
            half = 7 + int((34 - y) * 0.15)
            for x in range(ax - half, ax + half + 1):
                if 0 <= x < W:
                    img[y, x] = K(2) if abs(x - ax) < half - 1 else K(1)
            if 0 <= ax - half < W:
                img[y, ax - half] = K(3)
    # the turf roof: a green fringe hanging from the top edge, and roots
    for x in range(W):
        n = 5 + h32(x // 2, 142) % 8
        for y in range(0, n):
            img[y, x] = RG(2) if y > 1 else RG(1)
            if y == n - 1 and x % 2:
                img[y, x] = RG(3)
    for i in range(44):
        x = h32(i, 143) % W
        L_ = 8 + h32(i, 144) % 22
        for y in range(0, L_):
            img[y, x] = EA(1) if y % 3 else EA(2)
    # the niches: five burial niches along the back wall, a shrouded form in each; two hold a candle
    L = Layer()
    xs = [40, 116, 192, 268, 344]
    lit = {1, 3}
    for i, nx in enumerate(xs):
        w, hgt, ny = 28, 32, 48
        for y in range(ny, ny + hgt):
            for x in range(nx - w // 2, nx + w // 2):
                inner = (x - (nx - w // 2) > 1 and (nx + w // 2) - x > 2 and y > ny + 1)
                if y - ny < 2:
                    L.put(x, y, K(5) if y == ny else K(4))
                elif not inner:
                    L.put(x, y, K(4) if x < nx else K(1))
                else:
                    L.put(x, y, C('shadow', 0) if (x + y) % 3 else C('shadow', 1))
        blob(L, nx - 4, ny + 25, 10, 3.6, [K(3), hx('#8e8997'), hx('#b3b6c4'), hx('#e2e0de')], K(1))
        blob(L, nx - 11, ny + 24, 3.6, 3.4, [K(3), hx('#8e8997'), hx('#b3b6c4'), hx('#e2e0de')], K(1))
        for x in (nx - 2, nx + 3):
            for y in range(ny + 22, ny + 28):
                L.put(x, y, K(2))
        for x in range(nx - w // 2, nx + w // 2):
            L.put(x, ny + hgt, K(4))
            L.put(x, ny + hgt + 1, K(1))
        if i in lit:
            for y in range(ny + 8, ny + 19):
                L.put(nx + 9, y, WHITE if y > ny + 11 else hx('#eba14d'))
            for k, c in enumerate((hx('#fff7d6'), hx('#f9d77a'), hx('#eba14d'))):
                L.put(nx + 9, ny + 5 + k, c)
    img = L.composite_onto(img)
    for nx in (xs[i] for i in lit):
        d = np.hypot((XS - (nx + 9)) / 44.0, (YS - 62) / 40.0)
        img = soft(img, (YS < FY + 8), hx('#eba14d'), np.clip(1 - d, 0, 1) ** 1.5 * 0.4)
        img = soft(img, (YS < FY + 8), hx('#f9d77a'), np.clip(1 - d * 2.4, 0, 1) ** 1.3 * 0.3)
    # moss low on the wall
    for y in range(FY - 26, FY):
        for x in range(W):
            if h32(x, y, 145) % 100 < (y - (FY - 26)) * 2.2:
                img[y, x] = RG(2) if (x + y) % 2 else RG(1)
    img = floor_fill(img, 'x1_barrow_floor', FY, seed=146)
    for y in range(FY, BAND_Y + 6):
        t = (y - FY) / float(BAND_Y + 6 - FY)
        k = 0.5 * (1 - t) ** 1.4
        img[y] = img[y] * (1 - k) + C('shadow', 0) * k
    for nx in (xs[i] for i in lit):
        d = np.hypot((XS - (nx + 9)) / 52.0, (YS - 122) / 12.0)
        img = soft(img, (YS >= FY), hx('#eba14d'), np.clip(1 - d, 0, 1) ** 1.2 * 0.34)
    # a cold mist hugging the floor at the back
    mist = np.clip(1 - np.abs(YS - (FY + 4)) / 14.0, 0, 1) * (0.5 + 0.2 * np.sin(XS / 22.0))
    img = soft(img, np.ones((H, W), np.float32), K(4), mist * 0.35)
    # near frame: two dark standing stones capped with turf
    L = Layer()
    for (x0, x1, ytop) in ((0, 14, 40), (W - 12, W, 56)):
        for y in range(ytop, FY + 20):
            for x in range(x0, x1):
                L.put(x, y, K(0) if y > ytop + 1 else K(3))
        for x in range(x0, x1):
            L.put(x, ytop - 1, RG(3))
            L.put(x, ytop - 2, RG(2))
            if h32(x, 147) % 2:
                L.put(x, ytop, RG(2))
    img = L.composite_onto(img)
    return np.clip(img, 0, 1)


# ====================================================================== battle_culvert
def compose_culvert():
    img = np.zeros((H, W, 3), np.float32)
    FY = 102
    tones = [C('shadow', 0), RR(0), RR(1), RR(2), RR(3)]
    for y in range(FY):
        t = y / float(FY)
        for x in range(W):
            row = y // 4
            ly = y % 4
            off = (row % 2) * 4
            lx = (x + off) % 8
            brick = ((x + off) // 8 + row * 3) % 4
            v = 0.5 + t ** 1.2 * 2.7 + (brick - 1.5) * 0.18
            if ly == 3 or lx == 7:
                img[y, x] = EA(0) if (x + y) % 4 else EA(1)
                continue
            if ly == 0:
                v += 0.3
            k = int(np.clip(np.floor(v + THR[y, x] - 0.5), 0, len(tones) - 1))
            img[y, x] = tones[k]
    # iron ribs curving in at the top (a barrel vault seen end-on): vertical bands that lean toward the centre
    for rx in (10, 74, 138, 202, 266, 330):
        for y in range(0, FY + 2):
            lean = int((1 - y / float(FY)) ** 2 * (192 - rx) * 0.05)
            for k in range(7):
                x = rx + k + lean
                if not (0 <= x < W):
                    continue
                img[y, x] = K(4) if k == 0 else (K(3) if k < 4 else (K(2) if k < 6 else K(1)))
            if y % 9 == 4 and 0 <= rx + 2 + lean < W:
                img[y, rx + 2 + lean] = K(5)
                img[y, rx + 3 + lean] = K(1)
        for k in range(-1, 9):
            if 0 <= rx + k < W:
                img[FY - 1, rx + k] = K(5)
                img[FY, rx + k] = K(2)
    for y in range(8, 12):
        img[y, :] = K(3) if y == 8 else (K(2) if y == 9 else K(1))
    # the drain mouth: a big round-headed arch, a dark throat, a raised rusted grille, a trickle
    cx, base, r = 168, FY - 3, 25
    for y in range(base - r - 8, base + 6):
        for x in range(cx - r - 3, cx + r + 4):
            if y < base - r + 1:
                inside = (x - cx) ** 2 + (base - r + 1 - y) ** 2 <= (r + 3) ** 2
                ring = (x - cx) ** 2 + (base - r + 1 - y) ** 2 > (r - 0.5) ** 2
            else:
                inside = abs(x - cx) <= r + 3
                ring = abs(x - cx) > r - 0.5
            if not inside:
                continue
            if ring:
                a = math.atan2(base - r + 1 - y, x - cx)
                seg = int((a + math.pi) * 9) % 2
                img[y, x] = (K(5) if seg == 0 else K(4)) if x < cx + 8 else (K(3) if seg == 0 else K(2))
            else:
                img[y, x] = C('shadow', 0) if (x + y) % 5 else C('shadow', 1)
    for x in range(cx - r + 3, cx + r - 2, 5):
        for y in range(base - r + 6, base - 14):
            img[y, x] = K(4) if x < cx else K(3)
            img[y, x + 1] = K(2)
    for x in range(cx - r + 2, cx + r - 1):
        img[base - 14, x] = EA(2)
        img[base - 13, x] = EA(0)
    for y in range(base - 8, FY + 6):
        x = cx + int(2 * math.sin(y * 0.4))
        img[y, x] = C('water', 4) if y % 3 else C('ice', 2)
        img[y, x + 1] = C('water', 3)
    # the standing water across the floor: dark, rust-stained, a pale streak of the arch lying on it
    pool = ellipse_mask(176, 126, 124, 12)
    for y, x in zip(*np.nonzero(pool)):
        f = (y - 114) / 24.0
        img[y, x] = mix(C('water', 1), C('ink', 1), min(1, max(0, f)))
    up = pool & ~np.roll(pool, 1, 0)
    img[up] = K(3)
    for i in range(90):
        x = 62 + h32(150, i) % 230
        y = 116 + h32(151, i) % 20
        L_ = 2 + h32(152, i) % 6
        for k in range(L_):
            if 0 <= x + k < W and pool[y, x + k] and not up[y, x + k]:
                img[y, x + k] = C('water', 3) if i % 3 else C('ice', 1)
    floor_tmp = img.copy()
    floor_fill(floor_tmp, 'x1_culvert_floor', FY, seed=153)
    sel = (YS >= FY) & ~pool
    img[sel] = floor_tmp[sel]
    for y in range(FY, BAND_Y + 4):
        t = (y - FY) / float(BAND_Y + 4 - FY)
        k = 0.45 * (1 - t) ** 1.5
        s = ~pool[y]
        img[y, s] = img[y, s] * (1 - k) + C('shadow', 0) * k
    # a light shaft from a grate in the vault, falling slantwise onto the water
    sx0 = 262
    shaft = np.clip(1 - np.abs(XS - (sx0 - 20 + 0.26 * YS)) / (7 + 0.08 * YS), 0, 1) ** 0.9
    shaft *= np.clip(1 - YS / 132.0, 0, 1) ** 0.7 * (YS > 9)
    img = soft(img, np.ones((H, W), np.float32), hx('#e8fffb'), shaft * 0.34)
    for x in range(sx0 - 28, sx0 - 10):
        for y in range(2, 8):
            img[y, x] = K(5) if (x + y) % 2 else K(4)
            if y in (3, 5):
                img[y, x] = hx('#14101e')
    d = np.hypot((XS - (sx0 - 20 + 0.26 * 126)) / 24.0, (YS - 126) / 7.0)
    img = soft(img, np.ones((H, W), np.float32), hx('#e8fffb'), np.clip(1 - d, 0, 1) * 0.4)
    # hanging chains at the left, a pipe across the top
    for i in range(6):
        x = 32 + i * 3
        for y in range(12, 36 + (i % 3) * 4):
            img[y, x] = K(3) if y % 2 else K(2)
    return np.clip(img, 0, 1)


COMPOSE = {'battle_downs': compose_downs, 'battle_moor': compose_moor, 'battle_larchhill': compose_larchhill,
           'battle_barrow': compose_barrow, 'battle_culvert': compose_culvert}


if __name__ == '__main__':
    names = sys.argv[1:] or list(COMPOSE)
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    for n in names:
        a = COMPOSE[n]()
        Image.fromarray((a * 255 + 0.5).astype(np.uint8), 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(
            os.path.join(HERE, 'out', '_x1_%s_3x.png' % n.replace('battle_', '')))
        print('wrote out/_x1_%s_3x.png' % n.replace('battle_', ''))
