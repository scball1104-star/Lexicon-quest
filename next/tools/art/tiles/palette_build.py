"""Build next/assets/palette.json and palette.png.

Deterministic. Method (DESIGN 6.1):
  1. k-means (k=40, fixed seed, in OKLab) over the opaque pixels of the existing painted sheets in
     ../assets/art (environments, world-sprites, interior-sprites, party-sprites, portraits).
  2. Hand-curated hue-shifted ramps (dark -> light; shadows lean violet/indigo, highlights lean warm/yellow).
     The curated values were picked against those cluster centroids.
  3. Merge: every curated color that sits close to a source centroid (OKLab distance < 0.06) is nudged 25%
     toward it, unless that would break the ramp's monotonic lightness. Ramps share colors on purpose
     (a ramp is a path through one master palette), which keeps the unique count low.

Run:  python palette_build.py        (writes next/assets/palette.json and palette.png)
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
ART = os.path.normpath(os.path.join(NEXT, '..', 'assets', 'art'))
OUT_JSON = os.path.join(NEXT, 'assets', 'palette.json')
OUT_PNG = os.path.join(NEXT, 'assets', 'palette.png')

# ---------------------------------------------------------------- curated ramps (dark -> light)
RAMPS = {
    # neutrals / darks
    'shadow':       ['#14101e', '#221c33', '#332b4a', '#4a4463'],
    'ink':          ['#14101e', '#1e1236', '#2c2558', '#433c86', '#6a64c0'],
    'stone_cool':   ['#221c33', '#332b4a', '#4a4463', '#66637f', '#8a8aa0', '#b3b6c4'],
    'metal':        ['#332b4a', '#66637f', '#b3b6c4', '#dcdde2', '#f6f4ee'],
    'stone_warm':   ['#332b4a', '#5a4b55', '#7d6e70', '#a39389', '#c8b8a4', '#e8dcc4'],
    # browns
    'wood':         ['#2b1a22', '#46282a', '#6a3c2e', '#8f5634', '#b5773f', '#d49d58'],
    'earth':        ['#2b1a22', '#46282a', '#654636', '#876447', '#a8855c'],
    'path':         ['#654636', '#876447', '#a8855c', '#c6a674', '#e0c896'],
    'sand':         ['#a8855c', '#c6a674', '#e0c896', '#f6e3b0'],
    'hair_brown':   ['#2b1a22', '#46282a', '#6a3c2e', '#8f5634', '#b5773f'],
    # greens
    'grass':        ['#1c3a34', '#285530', '#3d7230', '#5a9032', '#82ae3a', '#b6cc58'],
    'foliage_dark': ['#142430', '#1c3a34', '#285530', '#3d7230'],
    'roof_green':   ['#142430', '#1c3a34', '#245a4a', '#2f7a5a', '#4f9e6e'],
    # blues
    'water':        ['#101540', '#1a3478', '#1f58a2', '#2f86c8', '#5cb4e4', '#b4e4f2'],
    'ice':          ['#2f86c8', '#5cb4e4', '#b4e4f2', '#e8fffb'],
    'roof_blue':    ['#101540', '#1d2a6e', '#2c449c', '#3e64c0', '#6a92dc'],
    'cloth_blue':   ['#101540', '#1d2a6e', '#2c449c', '#3e64c0', '#6a92dc'],
    'ui_blue':      ['#101540', '#1d2a6e', '#2c449c', '#3e64c0', '#6a92dc', '#dcdde2'],
    'magic_cyan':   ['#1a3478', '#1c7aa0', '#2ec4d0', '#8af0e8', '#e8fffb'],
    # violets
    'roof_purple':  ['#1e1236', '#36195a', '#522a84', '#7040aa', '#9564c8'],
    'cloth_purple': ['#1e1236', '#36195a', '#522a84', '#7040aa', '#9564c8', '#bc94e2'],
    'hair_violet':  ['#14101e', '#1e1236', '#36195a', '#522a84', '#7040aa'],
    'magic_violet': ['#522a84', '#7040aa', '#9564c8', '#bc94e2', '#f6f4ee'],
    # reds / warm lights
    'roof_red':     ['#2b1a22', '#5a1c2c', '#8c2e30', '#b84836', '#e0703a', '#f0a44a'],
    'fire':         ['#5a1c2c', '#b84836', '#e0703a', '#f0a44a', '#fcd870', '#fff7d6'],
    'gold':         ['#46282a', '#8f5634', '#c4842a', '#f0a44a', '#fcd870', '#fff7d6'],
    'blossom':      ['#5a1c2c', '#a83a6e', '#e070a0', '#fcc4dc'],
    # skin
    'skin_dark':    ['#2b1a22', '#46282a', '#6a3c2e', '#8f5634', '#b5773f'],
    'skin_med':     ['#6a3c2e', '#a65f45', '#cf8a60', '#eab486'],
    'skin_light':   ['#a65f45', '#cf8a60', '#eab486', '#fbe0c8'],
}

# colors whose role makes them fixed anchors (never nudged)
LOCKED = {'#14101e', '#f6f4ee', '#fff7d6', '#e8fffb'}


# ---------------------------------------------------------------- color math
def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb2hex(c):
    return '#%02x%02x%02x' % tuple(int(round(max(0, min(255, float(v))))) for v in c)


def _lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def _delin(c):
    c = np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.maximum(c, 0), 1 / 2.4) - 0.055)
    return c * 255.0


def rgb2oklab(rgb):
    rgb = np.asarray(rgb, np.float64)
    r, g, b = _lin(rgb[..., 0]), _lin(rgb[..., 1]), _lin(rgb[..., 2])
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], -1)


def oklab2rgb(lab):
    lab = np.asarray(lab, np.float64)
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return np.stack([_delin(r), _delin(g), _delin(bb)], -1)


# ---------------------------------------------------------------- k-means over the source art
SOURCES = ['environments.png', 'world-sprites.png', 'interior-sprites.png', 'party-sprites.png', 'portraits.png']


def source_pixels(per_sheet=30000, seed=7):
    rng = np.random.default_rng(seed)
    allpx = []
    for name in SOURCES:
        im = Image.open(os.path.join(ART, name)).convert('RGBA')
        a = np.asarray(im).reshape(-1, 4)
        a = a[a[:, 3] > 200][:, :3]
        lum = a.mean(1)
        a = a[lum > 14]  # drop near-black matte so it does not dominate
        if len(a) > per_sheet:
            a = a[np.sort(rng.choice(len(a), per_sheet, replace=False))]
        allpx.append(a)
    return np.concatenate(allpx).astype(np.float64)


def kmeans(X, k=40, iters=30, seed=11):
    rng = np.random.default_rng(seed)
    C = [X[rng.integers(len(X))]]
    for _ in range(k - 1):
        d = np.min(((X[:, None, :] - np.array(C)[None]) ** 2).sum(-1), axis=1)
        C.append(X[rng.choice(len(X), p=d / d.sum())])
    C = np.array(C)
    lab = None
    for _ in range(iters):
        lab = np.argmin(((X[:, None, :] - C[None]) ** 2).sum(-1), axis=1)
        for j in range(k):
            m = X[lab == j]
            if len(m):
                C[j] = m.mean(0)
    cnt = np.bincount(lab, minlength=k)
    order = np.argsort(-cnt, kind='stable')
    return C[order], cnt[order]


def build():
    X = source_pixels()
    C, cnt = kmeans(rgb2oklab(X))
    Crgb = oklab2rgb(C)

    unique = []
    for ramp in RAMPS.values():
        for h in ramp:
            if h not in unique:
                unique.append(h)
    mapping = {}
    for h in unique:
        if h in LOCKED:
            mapping[h] = h
            continue
        lab = rgb2oklab(np.array(hex2rgb(h), np.float64))
        d = np.sqrt(((C - lab) ** 2).sum(-1))
        j = int(np.argmin(d))
        mapping[h] = rgb2hex(oklab2rgb(lab + 0.25 * (C[j] - lab))) if d[j] < 0.06 else h

    def L(hx):
        return float(rgb2oklab(np.array(hex2rgb(hx), np.float64))[0])

    changed = True
    while changed:
        changed = False
        for name, ramp in RAMPS.items():
            vals = [mapping[h] for h in ramp]
            for i in range(1, len(vals)):
                if L(vals[i]) <= L(vals[i - 1]) + 0.02:
                    for h in (ramp[i], ramp[i - 1]):
                        if mapping[h] != h:
                            mapping[h] = h
                            changed = True
    ramps = {n: [mapping[h] for h in r] for n, r in RAMPS.items()}
    colors = []
    for r in ramps.values():
        for h in r:
            if h not in colors:
                colors.append(h)
    nudged = sum(1 for h in unique if mapping[h] != h)
    data = {
        'version': 1,
        'generator': 'next/tools/art/tiles/palette_build.py',
        'notes': ('Master palette for Lexicon Quest NEXT. Ramps run dark to light and are hue-shifted '
                  '(shadows toward indigo/violet, highlights toward warm yellow). Ramps share entries: each ramp '
                  'is a path through the master list. Darkest color is #14101e (never pure black). '
                  'Outline a material with its ramp outline entry (the darkest step), not a universal black. '
                  'Built from k-means over ../assets/art sheets merged with hand-curated ramps.'),
        'darkest': '#14101e',
        'count': len(colors),
        'colors': colors,
        'ramps': ramps,
        'outline': {n: r[0] for n, r in ramps.items()},
        'roles': {
            'shadow_overlay': {'color': '#14101e', 'alpha': 0.42,
                               'use': 'cast shadows on ground; tiles bake this as alpha pixels'},
            'interact_accent_gold': ramps['gold'][4],
            'interact_accent_cyan': ramps['magic_cyan'][3],
            'white': '#f6f4ee',
        },
        'sourceClusters': [{'hex': rgb2hex(c), 'share': round(float(n) / float(cnt.sum()), 4)}
                           for c, n in zip(Crgb, cnt)],
        'nudged': nudged,
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, 'w', newline='\n') as f:
        json.dump(data, f, indent=1)
    draw_png(data)
    print('palette: %d unique colors, %d ramps, %d nudged toward source clusters' % (len(colors), len(ramps), nudged))


def draw_png(data):
    ramps = data['ramps']
    sw, sh, lab = 46, 22, 96
    W = lab + 6 * (sw + 2) + 10
    per = (W - 12) // 18
    H = 24 + len(ramps) * (sh + 4) + 30 + ((data['count'] + per - 1) // per) * 18 + 10
    im = Image.new('RGB', (W, H), hex2rgb('#221c33'))
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.load_default(size=10)
    except TypeError:
        font = ImageFont.load_default()
    dr.text((6, 5), 'Lexicon Quest NEXT palette  (%d colors)' % data['count'], fill=hex2rgb('#f6f4ee'), font=font)
    y = 24
    for name, r in ramps.items():
        dr.text((6, y + 5), name, fill=hex2rgb('#dcdde2'), font=font)
        for i, h in enumerate(r):
            x = lab + i * (sw + 2)
            dr.rectangle([x, y, x + sw - 1, y + sh - 1], fill=hex2rgb(h))
            Lm = sum(hex2rgb(h)) / 3
            dr.text((x + 2, y + 11), h[1:], fill=(20, 16, 30) if Lm > 120 else (240, 236, 230), font=font)
        y += sh + 4
    y += 8
    dr.text((6, y), 'master list (ramp order)', fill=hex2rgb('#f6f4ee'), font=font)
    y += 16
    for i, h in enumerate(data['colors']):
        x = 6 + (i % per) * 18
        yy = y + (i // per) * 18
        dr.rectangle([x, yy, x + 15, yy + 15], fill=hex2rgb(h))
    im.save(OUT_PNG)


if __name__ == '__main__':
    build()
