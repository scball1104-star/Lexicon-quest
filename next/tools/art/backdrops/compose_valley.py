"""Daytime (and dusk) valley battle stage, composed from the game's own palette, tiles and props.

There is no painted valley in ../assets/art/environments.webp, so battle_valley is drawn here (W5-art,
CRITIQUE_2 item 3): a wide meadow seen the way FF6 and Secret of Mana frame a field fight, a horizon about
45 percent down, the river and the stone bridge in the middle distance, the Whisperwood pines on the left,
the valley cliffs on the right, a soft sky with three cloud bands, and a dithered atmospheric lightening
toward the horizon. The lower 40 percent is calm grass (the stage floor; the battle scene darkens it with
its band from bandY down and the sprites stand on it).

    compose('day') / compose('dusk')  ->  float32 H x W x 3 in 0..1 (build.py quantizes it to the palette)
    python compose_valley.py          ->  out/_valley_day_3x.png, out/_valley_dusk_3x.png (unquantized look)

Everything is deterministic: positions come from integer hashes (pxlib.h32), never from a global RNG.
Distant trees are drawn as larger-scale silhouettes (not tiled); the near grove uses the real tree_pine
prop and bushes from assets/sprites/props.png; the grass floor is the terrain's own grass fill variants.
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'tiles'))
from pxlib import h32, rnd, RAMPS  # noqa: E402

W, H = 384, 216
HORIZON = 92           # base of the far ridge / top of the meadow
BAND_Y = 118           # the battle scene's band starts here; below it the stage stays calm


def hx(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


def C(ramp, i):
    r = RAMPS[ramp]
    return hx(r[max(0, min(len(r) - 1, i))])


def mix(a, b, t):
    return a * (1 - t) + b * t


# ----------------------------------------------------------------------------- palettes per time of day
def palette(mode):
    if mode == 'dusk':
        return dict(
            sky=[(0, C('ink', 2)), (0.28, C('ink', 3)), (0.55, C('ink', 4)), (0.74, hx('#9062c3')),
                 (0.86, hx('#e06b39')), (0.95, hx('#eba14d')), (1.0, hx('#f9d77a'))],
            cloud_lit=hx('#f9d77a'), cloud_body=hx('#bc94e2'), cloud_shade=hx('#7040aa'), cloud_dark=hx('#522a84'),
            haze=mix(hx('#bc94e2'), hx('#eba14d'), 0.35),
            tree_haze=hx('#7162bd'),
            ridge_far=mix(hx('#522a84'), hx('#7162bd'), 0.5), ridge_near=hx('#36195a'),
            tree_far=hx('#1a1334'), tree_far_lit=hx('#36195a'),
            land_mul=np.array([0.56, 0.50, 0.68], np.float32), land_add=np.array([0.02, 0.0, 0.08], np.float32),
            warm=hx('#eba14d'), water_sky=[hx('#7162bd'), hx('#e06b39'), hx('#eba14d')],
            fog_floor=0.0,
        )
    return dict(
        sky=[(0, C('water', 3)), (0.42, C('water', 4)), (0.78, C('water', 5)), (1.0, hx('#e8fffb'))],
        cloud_lit=hx('#f6f4ee'), cloud_body=hx('#e8fffb'), cloud_shade=hx('#b4e4f2'), cloud_dark=hx('#8fcbe8'),
        haze=mix(hx('#b4e4f2'), hx('#e8fffb'), 0.55),
        tree_haze=hx('#3e88ca'),
        ridge_far=mix(hx('#6ab3e4'), hx('#8e8997'), 0.3), ridge_near=mix(hx('#3e88ca'), hx('#427330'), 0.55),
        tree_far=hx('#1c3730'), tree_far_lit=hx('#2a532f'),
        land_mul=np.array([1.0, 1.0, 1.0], np.float32), land_add=np.array([0.0, 0.0, 0.0], np.float32),
        warm=None, water_sky=None, fog_floor=0.0,
    )


# ----------------------------------------------------------------------------- canvas helpers
class Layer:
    """float RGB + alpha buffer with pixel helpers (y down)."""

    def __init__(self):
        self.rgb = np.zeros((H, W, 3), np.float32)
        self.a = np.zeros((H, W), np.float32)

    def put(self, x, y, c, a=1.0):
        if 0 <= x < W and 0 <= y < H:
            if a >= 1.0:
                self.rgb[y, x] = c; self.a[y, x] = 1.0
            else:
                oa = a + self.a[y, x] * (1 - a)
                self.rgb[y, x] = (c * a + self.rgb[y, x] * self.a[y, x] * (1 - a)) / max(oa, 1e-6)
                self.a[y, x] = oa

    def fill_mask(self, mask, c):
        self.rgb[mask] = c
        self.a[mask] = 1.0

    def composite_onto(self, base, haze=None, k=0.0):
        """alpha-over onto base (HxWx3); haze mixes this layer's colour toward `haze` by k (scalar or HxW)."""
        rgb = self.rgb
        if haze is not None and np.any(k):
            kk = np.broadcast_to(np.asarray(k, np.float32).reshape(-1, 1, 1) if np.ndim(k) == 1 else k, (H, W))[..., None] if np.ndim(k) else k
            rgb = rgb * (1 - kk) + haze * kk
        a = self.a[..., None]
        return base * (1 - a) + rgb * a


def poly_mask(points):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in points], fill=255)
    return np.asarray(im) > 0


def ellipse_mask(cx, cy, rx, ry):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    return np.asarray(im) > 0


def edge_of(mask, side):
    """pixels of mask whose neighbour on `side` ('up','down','left','right') is outside the mask"""
    p = np.pad(mask, 1)
    if side == 'up':
        return mask & ~p[:-2, 1:-1]
    if side == 'down':
        return mask & ~p[2:, 1:-1]
    if side == 'left':
        return mask & ~p[1:-1, :-2]
    return mask & ~p[1:-1, 2:]


def smooth_profile(seed, n, cells=(48, 24, 12), amp=(1.0, 0.5, 0.25)):
    """a smooth 1-D profile of n values in about -1..1 (sum of cosine-interpolated value noise)"""
    out = np.zeros(n, np.float32)
    tot = 0.0
    for c, a in zip(cells, amp):
        k = n // c + 2
        g = np.array([rnd(seed, c, i) * 2 - 1 for i in range(k + 1)], np.float32)
        xs = np.arange(n) / c
        i0 = xs.astype(int)
        f = xs - i0
        f = f * f * (3 - 2 * f)
        out += (g[i0] + (g[i0 + 1] - g[i0]) * f) * a
        tot += a
    return out / tot


# ----------------------------------------------------------------------------- sky and clouds
def draw_sky(base, P, blend=0.3):
    """Banded SNES sky: each palette stop holds its colour for most of its band and blends into the next
    stop over the last `blend` fraction of the band (that part is what the ordered dither works on)."""
    stops = P['sky']
    n = len(stops)
    H0 = HORIZON + 6
    col = np.zeros((H, 3), np.float32)
    for y in range(H):
        t = min(1.0, y / H0)
        for i in range(n - 1):
            t0, t1 = stops[i][0], stops[i + 1][0]
            if t <= t1 or i == n - 2:
                seg = (t - t0) / max(t1 - t0, 1e-6)
                f = 0.0 if seg < 1 - blend else (seg - (1 - blend)) / blend
                col[y] = mix(stops[i][1], stops[i + 1][1], min(1.0, f))
                break
    base[:] = col[:, None, :]
    return base


def cloud(layer, P, cx, cy, w, h, seed, flat=0.55):
    """FF6-style cumulus: a flat-bottomed heap of lobes, lit on top, shaded underneath."""
    lobes = []
    n = max(3, int(w / 9))
    for i in range(n):
        t = (i + 0.5) / n
        lx = cx - w / 2 + t * w
        r = h * (0.55 + 0.45 * math.sin(t * math.pi)) * (0.8 + 0.4 * rnd(seed, i, 1))
        ly = cy - r * 0.35 * (0.6 + 0.8 * rnd(seed, i, 2))
        lobes.append((lx, ly, r * 1.15, r))
    mask = np.zeros((H, W), bool)
    for (lx, ly, rx, ry) in lobes:
        mask |= ellipse_mask(lx, ly, rx, ry)
    bottom = int(cy + h * flat * 0.5)
    ys = np.arange(H)[:, None]
    mask &= ys <= bottom
    body = P['cloud_body']; lit = P['cloud_lit']; shade = P['cloud_shade']; dark = P['cloud_dark']
    layer.fill_mask(mask, body)
    # underside shading: the lowest 35 percent of each column
    cols = np.nonzero(mask.any(0))[0]
    for x in cols:
        yy = np.nonzero(mask[:, x])[0]
        top, bot = yy.min(), yy.max()
        hh = bot - top + 1
        for y in range(top, bot + 1):
            t = (y - top) / max(hh - 1, 1)
            if t > 0.78:
                layer.put(x, y, shade)
            if y == bot and hh > 3:
                layer.put(x, y, dark if (x + seed) % 3 else shade)
    # lit tops: the upper-left edge of each lobe
    up = edge_of(mask, 'up') | edge_of(mask, 'left')
    layer.rgb[up & mask] = lit
    return mask


def draw_clouds(layer, P, mode):
    # three bands: big and soft high up, medium, then small flattened ones near the horizon
    specs = [
        (0, [(58, 24, 74, 16), (150, 18, 54, 13), (262, 27, 88, 17), (352, 16, 48, 12)]),
        (1, [(24, 50, 44, 9), (118, 55, 70, 11), (214, 47, 38, 8), (300, 54, 76, 11)]),
        (2, [(80, 72, 34, 5), (176, 76, 52, 6), (246, 70, 30, 4), (338, 75, 44, 5)]),
    ]
    for band, cl in specs:
        for i, (cx, cy, w, h) in enumerate(cl):
            cloud(layer, P, cx, cy, w, h, seed=400 + band * 10 + i, flat=0.5 + band * 0.15)


# ----------------------------------------------------------------------------- far hills and tree line
def hill_top(domes, base_y, x):
    """y of a ridge made of overlapping domes (cx, half width, height) sitting on base_y"""
    y = base_y
    for (cx, hw, h) in domes:
        u = (x - cx) / hw
        if abs(u) < 1:
            y = min(y, base_y - h * (1 - u * u) ** 0.8)
    return y


def draw_ridges(base, P, haze):
    """Two rolling ridges across the valley: a far one in hazed blue-violet, a nearer one in hazed green,
    each with a lighter crest line so they read as hills, not a wall."""
    far = Layer()
    domes = [(30, 110, 17), (150, 130, 11), (236, 90, 14), (340, 120, 19), (400, 80, 9)]
    prof = smooth_profile(11, W, cells=(40, 16), amp=(1.0, 0.5))
    crest = P['haze'] * 0.35 + P['ridge_far'] * 0.65
    for x in range(W):
        top = int(round(hill_top(domes, HORIZON - 3, x) + prof[x] * 1.5))
        for y in range(top, HORIZON + 1):
            far.put(x, y, crest if y == top or (y == top + 1 and x % 2) else P['ridge_far'])
    base = far.composite_onto(base, P['haze'], 0.42)
    near = Layer()
    domes2 = [(70, 80, 9), (190, 70, 6), (270, 60, 8), (360, 70, 5)]
    prof2 = smooth_profile(12, W, cells=(32, 12), amp=(1.0, 0.5))
    crest2 = P['haze'] * 0.3 + P['ridge_near'] * 0.7
    for x in range(W):
        top = int(round(hill_top(domes2, HORIZON + 1, x) + prof2[x] * 1.2))
        for y in range(top, HORIZON + 2):
            near.put(x, y, crest2 if y == top else P['ridge_near'])
    base = near.composite_onto(base, P['haze'], 0.30)
    return base


def pine_silhouette(layer, cx, by, h, dark, lit, seed, trunk=None):
    """A small distant pine: stacked jagged tiers, lit on the left."""
    w = max(3, int(h * 0.55))
    tiers = 3 if h < 12 else 4
    for t in range(tiers):
        ty = by - int(h * (t + 1) / tiers) - 1
        tb = by - int(h * t / tiers) + (1 if t else 0)
        tw = w * (1 - t / (tiers + 0.6))
        for y in range(ty, tb + 1):
            f = (y - ty) / max(tb - ty, 1)
            half = max(0.5, tw * 0.5 * (0.15 + 0.85 * f))
            jag = 1 if (y + seed) % 3 == 0 and f > 0.6 else 0
            x0, x1 = int(round(cx - half - jag)), int(round(cx + half + jag))
            for x in range(x0, x1 + 1):
                c = lit if (x < cx - half * 0.25 and f < 0.92) else dark
                layer.put(x, y, c)
    if trunk is not None:
        for y in range(by, by + 2):
            layer.put(cx, y, trunk)


def draw_treeline(base, P, haze_k):
    """The Whisperwood along the horizon: two overlapping rows of silhouettes, clustered (3 to 6 px apart)
    with varied heights so they read as a forest mass, the back row hazed more. Thins out to the right
    where the cliffs take over."""
    for row, (base_y, hmin, hvar, kh, xmax, seed) in enumerate(((HORIZON - 1, 5, 8, haze_k + 0.14, 330, 20),
                                                                 (HORIZON + 2, 6, 12, haze_k, 300, 30))):
        L = Layer()
        x = -6
        i = 0
        while x < xmax:
            h = hmin + h32(seed + 2, i) % hvar
            if x > 230:
                h = max(4, int(h * 0.65))
            by = base_y + h32(seed + 3, i) % 4
            pine_silhouette(L, x, by, h, P['tree_far'], P['tree_far_lit'], seed * 10 + i)
            L.put(x, by - h - 1, P['tree_far_lit'])          # a lit crown pixel on every tip
            x += 2 + h32(seed + 1, i) % 3
            i += 1
        # distance turns the far trees blue, not grey: haze them toward the sky blue
        base = L.composite_onto(base, P['tree_haze'], kh)
    return base


# ----------------------------------------------------------------------------- meadow, river, bridge, road
_GRASS_FILL = None


def grass_fill_tiles():
    """the terrain's own grass fill variants (assets/tiles/terrain.png, tiles.json terrains.grass.variants)"""
    global _GRASS_FILL
    if _GRASS_FILL is None:
        with open(os.path.join(NEXT, 'assets', 'tiles', 'tiles.json'), encoding='utf-8') as f:
            t = json.load(f)['terrains']['grass']
        img = np.asarray(Image.open(os.path.join(NEXT, 'assets', 'tiles', t['sheet'])).convert('RGB')).astype(np.float32) / 255
        _GRASS_FILL = [img[y:y + 16, x:x + 16] for (x, y) in t['variants']]
    return _GRASS_FILL


def draw_meadow(base, P, river_top, river_bot, fog):
    """grass from the horizon to the bottom: hazed far rows with clustered tufts and light patches,
    then the terrain's own grass fill on the calm floor (variants picked per cell by hash, as the map does)"""
    g = [C('grass', i) for i in range(6)]
    for y in range(HORIZON - 2, BAND_Y):
        t = np.clip((y - HORIZON) / (BAND_Y - HORIZON), 0, 1)        # 0 far .. 1 near
        base[y] = mix(g[4], g[3], t)
    # light patches (sun on the meadow) and darker swales, soft ellipses
    for i in range(9):
        cx, cy = h32(33, i) % W, HORIZON + 2 + h32(34, i) % (BAND_Y - HORIZON - 6)
        rx, ry = 18 + h32(35, i) % 30, 2 + h32(36, i) % 3
        m = ellipse_mask(cx, cy, rx, ry)
        base[m] = g[4] if i % 3 else mix(g[3], g[2], 0.5)
    # clustered tufts: small "v" marks, bigger and denser near
    for i in range(70):
        cx, cy = h32(37, i) % W, HORIZON + 1 + h32(38, i) % (BAND_Y - HORIZON - 3)
        t = (cy - HORIZON) / (BAND_Y - HORIZON)
        n = 2 + h32(39, i) % 4
        for k in range(n):
            x = cx + (h32(40, i, k) % 13) - 6
            y = cy + (h32(41, i, k) % 5) - 2
            if 0 <= x < W and HORIZON <= y < BAND_Y - 1:
                dark = g[2] if (i + k) % 3 else g[1]
                if t < 0.4:
                    base[y, x] = dark
                else:
                    base[y, x - 1] = dark; base[y, x + 1] = dark; base[y + 1, x] = dark
                    base[y, x] = g[4]
    for y in range(HORIZON - 2, BAND_Y):
        t = np.clip((y - HORIZON) / (BAND_Y - HORIZON), 0, 1)
        k = fog * (1 - t) ** 1.6
        if k > 0:
            base[y] = base[y] * (1 - k) + P['haze'] * k
    # the floor: real grass fill tiles, variant per 16 px cell
    tiles = grass_fill_tiles()
    weights = [4, 2, 2, 2, 2, 2]
    tot = sum(weights)
    for cy in range((BAND_Y - 2) // 16, (H + 15) // 16 + 1):
        for cx in range(0, W // 16 + 1):
            r = h32(42, cx, cy) % tot
            k = 0
            while r >= weights[k]:
                r -= weights[k]; k += 1
            tile = tiles[k]
            y0, x0 = cy * 16, cx * 16
            for yy in range(16):
                y = y0 + yy
                if y < BAND_Y - 2 or y >= H:
                    continue
                x1 = min(W, x0 + 16)
                base[y, x0:x1] = tile[yy, :x1 - x0]
    return base


def river_profile():
    xs = np.arange(W, dtype=np.float32)
    centre = 112 + 3.5 * np.sin(xs / 58.0 + 0.8) + 2.0 * np.sin(xs / 23.0)
    width = 11 + 3.5 * np.cos(xs / 71.0) + 1.5 * np.sin(xs / 31.0 + 2)
    top = np.round(centre - width * 0.45).astype(int)
    bot = np.round(centre + width * 0.55).astype(int)
    return top, bot


def draw_river(base, P, top, bot, mode):
    w = [C('water', i) for i in range(6)]
    sand = [C('sand', i) for i in range(4)]
    earth = [C('earth', i) for i in range(5)]
    ice = hx('#e8fffb')
    for x in range(W):
        t0, t1 = top[x], bot[x]
        # far bank: a soil face under the grass lip, then a sand strip
        base[t0 - 3, x] = C('grass', 1)
        base[t0 - 2, x] = earth[3] if (x + 1) % 5 else earth[2]
        base[t0 - 1, x] = sand[1] if x % 7 else sand[0]
        # water body: the far rows reflect the sky (paler), the near rows are deep
        for y in range(t0, t1 + 1):
            f = (y - t0) / max(t1 - t0, 1)
            if mode == 'dusk':
                sky = P['water_sky']
                c = mix(sky[0], hx('#292657'), f * 0.9)
                if f < 0.3:
                    # the far rows mirror the sunset band: a warm streak, broken by the violet water
                    c = mix(sky[1], sky[0], f / 0.3) if (x // 4 + y) % 3 == 0 else mix(sky[0], hx('#9062c3'), 0.4)
            else:
                c = mix(w[4], w[2], min(1, f * 1.5)) if f < 0.4 else mix(w[2], w[1], (f - 0.4) / 0.6 * 0.7)
            base[y, x] = c
        # near bank: sand then a darker grass lip
        base[t1 + 1, x] = sand[1] if (x + 3) % 6 else sand[2]
        base[t1 + 2, x] = C('grass', 2) if x % 4 else C('grass', 1)
    # waves: short horizontal dashes, lighter far (sky glints), darker near
    for i in range(170):
        x = h32(41, i) % W
        y0, y1 = top[x], bot[x]
        y = y0 + 1 + (h32(42, i) % max(1, (y1 - y0 - 1)))
        f = (y - y0) / max(y1 - y0, 1)
        L = 2 + h32(43, i) % 4
        if mode == 'dusk':
            c = hx('#eba14d') if f < 0.3 else (hx('#7162bd') if f < 0.7 else hx('#3f4186'))
        else:
            c = w[5] if f < 0.3 else (w[4] if f < 0.65 else w[3])
        for k in range(L):
            if 0 <= x + k < W and top[x + k] < y < bot[x + k]:
                base[y, x + k] = c
    # foam flecks along both banks
    for x in range(W):
        if h32(44, x) % 4 == 0:
            base[top[x], x] = ice if mode == 'day' else hx('#bc94e2')
        if h32(45, x) % 5 == 0:
            base[bot[x], x] = w[4] if mode == 'day' else hx('#7162bd')
    return base


def draw_bridge(base, P, top, bot, x0=166, x1=238):
    """A stone arch bridge over the river in the middle distance, in the town's bridge style (stone_warm)."""
    S = [C('stone_warm', i) for i in range(6)]
    ink = C('water', 0)
    yt = int(min(top[x0:x1].min(), top[x0:x1].max())) - 1
    yb = int(bot[x0:x1].max())
    deck_top = yt - 7
    # parapet: lit cap, two courses, a dark base; the ends have taller posts
    for x in range(x0, x1 + 1):
        post = x <= x0 + 2 or x >= x1 - 2
        ctop = deck_top - (2 if post else 0)
        for y in range(ctop, yt + 2):
            if y == ctop:
                c = S[5]
            elif y == ctop + 1:
                c = S[4]
            elif y >= yt + 1:
                c = S[1]
            else:
                # masonry: 2 px courses, a lit line on top of each, staggered vertical joints
                course = (y - ctop - 2) // 2
                joint = (x + course * 3) % 6 == 0
                c = S[2] if joint else (S[4] if (y - ctop) % 2 == 0 else S[3])
            base[y, x] = c
        if post:
            base[ctop - 1, x] = S[4] if x in (x0, x1) else S[5]
    # the arch: a dark opening in the pier wall under the deck, water showing through
    cx = (x0 + x1) / 2
    span = (x1 - x0) * 0.36
    for x in range(x0 + 3, x1 - 2):
        dx = (x - cx) / span
        for y in range(yt + 2, yb + 1):
            depth = (y - (yt + 2)) / max(yb - yt - 2, 1)
            if abs(dx) < 1:
                arch_y = yt + 2 + int((1 - math.sqrt(max(0, 1 - dx * dx))) * (yb - yt - 3))
                if y < arch_y:
                    base[y, x] = S[2] if (x + y) % 2 else S[3]      # pier face above the arch
                elif y == arch_y:
                    base[y, x] = S[1]                                  # intrados
                else:
                    base[y, x] = mix(ink, base[y, x], 0.55 if depth > 0.6 else 0.25)   # water in shadow
            else:
                if y < yb - 1:
                    base[y, x] = S[2] if (x * 3 + y) % 5 else S[1]
                else:
                    base[y, x] = S[1]
    # bridge shadow on the water beside the piers
    for x in range(x0 - 1, x0 + 3):
        for y in range(yt + 2, yb + 1):
            base[y, x] = mix(base[y, x], ink, 0.35)
    return base


def draw_road(base, P, top, bot, x_bridge=(166, 238)):
    """A dusty track winding from the far end of the bridge up into the valley (depth cue); a short apron
    on the near side that fades into the grass before the calm floor."""
    path = [C('path', i) for i in range(5)]
    cx = (x_bridge[0] + x_bridge[1]) / 2
    # far side: from the bridge's far end up to the tree line, narrowing with distance
    y_start = int(top[int(cx)]) - 4
    for y in range(HORIZON + 2, y_start + 1):
        t = (y - (HORIZON + 2)) / max(y_start - (HORIZON + 2), 1)
        x_c = cx + 20 * (1 - t) ** 1.3 + 9 * math.sin(t * 5.2)
        half = 1.5 + 3.5 * t
        for x in range(int(x_c - half), int(x_c + half) + 1):
            if 0 <= x < W:
                r = h32(51, x, y)
                base[y, x] = path[3] if r % 5 else path[2]
                if abs(x - x_c) > half - 1 and r % 3 == 0:
                    base[y, x] = path[2]
    # near apron under the bridge's near end, fading out
    y_end = int(bot[int(cx)]) + 3
    for y in range(y_end, BAND_Y + 2):
        t = (y - y_end) / max(BAND_Y + 2 - y_end, 1)
        half = 5 + 4 * t
        x_c = cx - 2 + 12 * t
        for x in range(int(x_c - half), int(x_c + half) + 1):
            if 0 <= x < W and rnd(52, x, y) > t * 0.95 + 0.05:
                r = h32(53, x, y)
                base[y, x] = path[2] if r % 4 else path[1]
    return base


# ----------------------------------------------------------------------------- the grove and the cliff
def load_prop(name):
    with open(os.path.join(NEXT, 'assets', 'sprites', 'props.json'), encoding='utf-8') as f:
        m = json.load(f)
    img = Image.open(os.path.join(NEXT, 'assets', 'sprites', m['image'])).convert('RGBA')
    o = m['objects'][name]
    x, y, w, h = o['frame']
    return np.asarray(img.crop((x, y, x + w, y + h))).astype(np.float32) / 255.0, o['anchor']


def blit_rgba(layer, im, x, y, scale=1.0):
    """paste an RGBA float array at integer position (nearest-neighbour when scale != 1)."""
    if scale != 1.0:
        hh, ww = im.shape[:2]
        nh, nw = max(1, int(round(hh * scale))), max(1, int(round(ww * scale)))
        yi = (np.arange(nh) / scale).astype(int).clip(0, hh - 1)
        xi = (np.arange(nw) / scale).astype(int).clip(0, ww - 1)
        im = im[yi][:, xi]
    hh, ww = im.shape[:2]
    for yy in range(hh):
        ty = y + yy
        if not (0 <= ty < H):
            continue
        for xx in range(ww):
            tx = x + xx
            if 0 <= tx < W and im[yy, xx, 3] > 0.5:
                layer.put(tx, ty, im[yy, xx, :3])


def draw_pine_big(layer, cx, by, h, seed):
    """A mid-distance pine drawn at about two thirds of the prop's scale: five tiers with jagged skirts,
    lit from the top-left, a dark core and a short trunk (the Whisperwood look of the tree_pine prop)."""
    dk, d1, mid, lit, tip = C('foliage_dark', 0), C('foliage_dark', 1), C('grass', 1), C('grass', 2), C('grass', 3)
    wood = [C('wood', i) for i in range(4)]
    w = int(h * 0.62)
    tiers = 5
    for t in range(tiers):
        ty = by - int(h * (t + 1) / tiers) - 2
        tb = by - int(h * t / tiers) - (0 if t == 0 else 1)
        tw = w * (1 - t / (tiers + 0.8))
        for y in range(ty, tb + 1):
            f = (y - ty) / max(tb - ty, 1)
            half = max(0.6, tw * 0.5 * (0.12 + 0.88 * f))
            jag = (h32(seed, t, y) % 3) - 1 if f > 0.55 else 0
            x0, x1 = int(round(cx - half + min(0, jag))), int(round(cx + half + max(0, jag)))
            for x in range(x0, x1 + 1):
                u = (x - cx) / max(half, 1)
                if f > 0.9 and (x + y + seed) % 2:
                    c = dk                                  # the shadowed skirt under each tier
                elif u < -0.35 and f < 0.85:
                    c = lit if (h32(seed, x, y) % 5) else tip
                elif u < 0.3:
                    c = mid
                else:
                    c = d1 if (h32(seed, x, y) % 4) else mid
                if abs(u) > 0.9 and f < 0.95:
                    c = d1 if u > 0 else lit
                layer.put(x, y, c)
    for y in range(by - 1, by + 3):
        layer.put(cx, y, wood[1]); layer.put(cx + 1, y, wood[2]); layer.put(cx - 1, y, wood[0])
    # ground shadow
    for x in range(cx - w // 3, cx + w // 2):
        if 0 <= x < W and by + 3 < H:
            layer.put(x, by + 3, C('grass', 1), 0.8)


def draw_grove(base, P, mode):
    """Whisperwood pines on the left: a hazed back row of drawn silhouettes, a mid row of drawn pines,
    then the real tree_pine prop in front, with bushes at the feet. All feet stay above the calm floor."""
    back = Layer()
    for i, (x, by, h) in enumerate([(6, 104, 22), (26, 106, 26), (48, 103, 20), (70, 107, 24), (94, 105, 18),
                                    (118, 108, 22), (140, 104, 16)]):
        draw_pine_big(back, x, by, h, 600 + i)
    base = back.composite_onto(base, P['haze'], 0.28)
    midl = Layer()
    for i, (x, by, h) in enumerate([(14, 120, 34), (58, 123, 40), (104, 119, 30)]):
        draw_pine_big(midl, x, by, h, 650 + i)
    base = midl.composite_onto(base, P['haze'], 0.10)
    front = Layer()
    pine, anchor = load_prop('tree_pine')
    bush, banchor = load_prop('bush')
    for (fx, fy) in [(-6, 130), (34, 131)]:
        blit_rgba(front, pine, fx - anchor[0], fy - anchor[1])
    for (fx, fy) in [(86, 128), (132, 126)]:
        blit_rgba(front, pine, fx - anchor[0], fy - anchor[1], scale=0.8)
    for (bx, byy) in [(72, 131), (118, 130), (26, 133)]:
        blit_rgba(front, bush, bx - banchor[0], byy - banchor[1])
    base = front.composite_onto(base)
    return base


def draw_cliff(base, P, mode):
    """The valley cliffs on the right: a bluff with a grass cap and a boulder face lit from the top-left,
    drawn as large rock cells (not tiled), with a lower ledge stepping down toward the stage."""
    S = [C('stone_warm', i) for i in range(6)]
    g = [C('grass', i) for i in range(6)]
    # silhouette: top edge of the bluff from x 288 (y 126) climbing to the plateau at y 86
    pts = [(288, 128), (296, 112), (304, 104), (312, 92), (322, 88), (336, 86), (352, 87), (368, 85), (384, 86),
           (384, 132), (288, 132)]
    face = poly_mask(pts)
    # a lower ledge in front, from x 262 to 318, top at y 110
    pts2 = [(262, 126), (268, 114), (280, 110), (300, 109), (318, 111), (322, 128), (262, 128)]
    ledge = poly_mask(pts2)
    L = Layer()
    for name, mask, seed in (('face', face, 71), ('ledge', ledge, 72)):
        ys, xs = np.nonzero(mask)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        # rock cells: a jittered grid of elongated boulders of mixed size (strata read as horizontal
        # bands; small stones sit between big ones), each owning the pixels nearest in its own metric
        cells = []
        for gy in range(y0 - 6, y1 + 8, 8):
            row = (gy - y0) // 8
            for gx in range(x0 - 8 + (row % 2) * 6, x1 + 10, 12):
                big = h32(seed, gx, gy, 4) % 3 == 0
                rx = (7 + h32(seed, gx, gy, 5) % 5) if big else (4 + h32(seed, gx, gy, 5) % 3)
                ry = (4 + h32(seed, gx, gy, 6) % 3) if big else (2 + h32(seed, gx, gy, 6) % 2)
                cells.append((gx + (h32(seed, gx, gy, 1) % 7) - 3, gy + (h32(seed, gx, gy, 2) % 5) - 2, rx, ry))
        cells = np.array(cells, np.float32)
        top_edge = edge_of(mask, 'up')
        for y, x in zip(ys, xs):
            d = np.sqrt(((cells[:, 0] - x) / cells[:, 2]) ** 2 + ((cells[:, 1] - y) / cells[:, 3]) ** 2)
            o = np.argsort(d)[:2]
            k, k2 = o[0], o[1]
            ccx, ccy, rx, ry = cells[k]
            nx, ny = (x - ccx) / rx, (y - ccy) / ry
            depth = (y - y0) / max(y1 - y0, 1)
            inten = -0.5 * nx - 0.8 * ny + 0.25 - 0.55 * depth
            if d[k] > 1.0 or d[k2] - d[k] < 0.14:
                c = S[1] if depth > 0.35 else S[2]       # crevice between boulders
            elif inten > 0.55:
                c = S[4]
            elif inten > 0.05:
                c = S[3]
            elif inten > -0.45:
                c = S[2]
            else:
                c = S[1]
            if inten > 0.95 and rx >= 7 and ny < -0.5 and (x + 2 * y) % 5 == 0:
                c = S[5]                                    # one glint on the crown of a big boulder
            L.put(x, y, c)
        # grass cap: lit fringe along the top edge with blades hanging over the rock
        cap_rows = {}
        for y, x in zip(*np.nonzero(top_edge)):
            cap_rows[x] = y
        for x, y in cap_rows.items():
            for k in range(-3, 1):
                if 0 <= y + k < H:
                    L.put(x, y + k, g[4] if k > -3 else g[3])
            L.put(x, y + 1, g[1] if (x + seed) % 2 else g[2])
            if (x + seed) % 3 == 0:
                L.put(x, y + 2, g[1])
            L.put(x, y - 3, g[2] if (x + seed) % 2 else g[3])
        # left silhouette: a darker edge so the bluff separates from the meadow behind it
        for y, x in zip(*np.nonzero(edge_of(mask, 'left'))):
            if not top_edge[y, x]:
                L.put(x, y, S[1])
        # foot: a shadow line and tufts
        for y, x in zip(*np.nonzero(edge_of(mask, 'down'))):
            L.put(x, y, S[1])
            if y + 1 < H:
                L.put(x, y + 1, g[1] if (x + seed) % 2 else g[2])
    # moss and a few bright stones on the big face
    for i in range(30):
        x = 296 + h32(73, i) % 86
        y = 90 + h32(74, i) % 36
        if face[y, x] and not ledge[y, x]:
            L.put(x, y, g[2] if i % 3 else S[5])
    base = L.composite_onto(base, P['haze'], 0.06)
    # small pines on the plateau
    T = Layer()
    for i, (x, by, h) in enumerate([(318, 86, 11), (334, 84, 13), (356, 85, 10), (372, 83, 12), (383, 84, 9)]):
        pine_silhouette(T, x, by, h, P['tree_far'], P['tree_far_lit'], 700 + i, trunk=C('wood', 1))
    base = T.composite_onto(base, P['haze'], 0.22)
    return base


# ----------------------------------------------------------------------------- compose
def compose(mode='day'):
    P = palette(mode)
    base = np.zeros((H, W, 3), np.float32)
    draw_sky(base, P)
    clouds = Layer()
    draw_clouds(clouds, P, mode)
    # clouds nearer the horizon fade into the haze
    ys = np.arange(H, dtype=np.float32)
    kcl = np.clip((ys - 40) / 50.0, 0, 1)[:, None] * 0.45
    base = clouds.composite_onto(base, P['haze'], np.broadcast_to(kcl, (H, W)))
    base = draw_ridges(base, P, None)
    top, bot = river_profile()
    base = draw_meadow(base, P, top, bot, fog=0.5)
    base = draw_treeline(base, P, 0.34)
    base = draw_river(base, P, top, bot, mode)
    base = draw_road(base, P, top, bot)
    base = draw_bridge(base, P, top, bot)
    base = draw_cliff(base, P, mode)
    base = draw_grove(base, P, mode)
    if mode == 'dusk':
        # evening grade on the land: cooler, darker, violet shadows; the sky is already the dusk gradient
        land = np.arange(H) >= HORIZON - 26
        land = land[:, None] & (base.sum(-1) >= 0)
        rgb = base[land]
        lum = rgb.mean(-1, keepdims=True)
        graded = rgb * P['land_mul'] + P['land_add'] + np.clip(lum - 0.55, 0, 1) * P['warm'] * 0.35
        base[land] = np.clip(graded, 0, 1)
    return np.clip(base, 0, 1)


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    for mode in ('day', 'dusk'):
        a = compose(mode)
        im = Image.fromarray((a * 255 + 0.5).astype(np.uint8), 'RGB')
        im.resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(HERE, 'out', '_valley_%s_3x.png' % mode))
        print('wrote out/_valley_%s_3x.png' % mode)
