"""Painted key art -> pixel-art backdrops at the game's internal resolution (384 x 216).

    python build.py            # every backdrop in RECIPES -> next/assets/backdrops/<id>.png + <id>.json
    python build.py title      # one of them
    python build.py --mock     # also render out/mock_battle_*.png with real battle sprites for review

Pipeline per backdrop (deterministic, no RNG):
  1. cut the 16:9 window out of the environments.webp cell (2 x 4 grid), with an optional zoom and
     vertical framing offset;
  2. box-downscale to 384 x 216, light unsharp mask;
  3. grade: brightness, contrast, saturation, tint, vignette. Battle stages are NOT banded here: the
     battle scene draws the indigo stage band itself from <id>.json {bandY, bandAlpha} (w4-battle contract),
     so the png stays clean and the band can move with the layout;
  4. quantize to assets/palette.json with a Bayer 4 x 4 ordered dither between the two nearest palette
     colours (dither only between colours that are perceptually close, so skies and water blend but
     edges stay crisp), plus up to EXTRA_MAX extra colours per backdrop picked greedily where the master
     palette cannot carry a hue (reported to stdout and listed in the json as "extraColors").
Previews at 3x go to out/<id>_3x.png; out/compare_<id>.png shows the old runtime recipe next to the new file.
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
REPO = os.path.normpath(os.path.join(NEXT, '..'))
SRC = os.path.join(REPO, 'assets', 'art', 'environments.webp')
DST = os.path.join(NEXT, 'assets', 'backdrops')
OUT = os.path.join(HERE, 'out')
PALETTE = os.path.join(NEXT, 'assets', 'palette.json')
W, H = 384, 216
COLS, ROWS = 2, 4
EXTRA_MAX = 4

BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16.0

# id -> recipe. cell: environments cell (row-major). zoom > 1 crops tighter; frameY in -1..1 slides the
# window up (-1) or down (+1) inside the cell. stage: (bandY, bandAlpha) written to the json for the battle
# scene's own band (rows bandY..216 under the sprites; feet stand at y 148, windows cover 152..212).
# band: (y, alpha) would bake a band into the png; left unset on purpose. extras: how many colours outside
# the master palette this backdrop may add (0..EXTRA_MAX).
RECIPES = {
    'title': dict(cell=0, zoom=1.06, frameY=-1.0, bright=1.0, contrast=1.0, sat=1.0, extras=4,
                  topShade=(0.0, 0.42, 0.14), note='Willowmere key art framed for the logo (sky kept under the title)'),
    # W5-art (CRITIQUE_2 item 3): there is no painted valley, so the valley stage is composed from the game's
    # own palette, tiles and props by compose_valley.py (daylight meadow, river, bridge, pines, cliffs) and
    # quantized like the others. battle_valley_dusk is the same scene in its evening palette (optional id).
    'battle_valley': dict(compose='day', extras=0, max_pair=0.17, stage=(118, 0.42),
                          note='valley battle stage: daytime meadow composed from the palette, tiles and props'),
    'battle_valley_dusk': dict(compose='dusk', extras=0, max_pair=0.17, stage=(118, 0.46),
                               note='valley battle stage at dusk (optional id for late-day fights)'),
    # W8-art: Whisperwood Hollow (optional dungeon) gets its own stage: a root cave under the pines with an ink
    # pool and pale shafts of light, composed by compose_hollow.py from the palette (no painting exists).
    'battle_hollow': dict(compose='hollow', extras=2, max_pair=0.15, stage=(118, 0.40),
                          note='Whisperwood Hollow battle stage: root cave, ink pool, pale light shafts (composed)'),
    'battle_archive': dict(cell=7, zoom=1.0, frameY=0.0, bright=0.82, contrast=0.88, sat=0.9, extras=4,
                           tint=('#3c3278', 0.22), stage=(118, 0.44), note='archive battle stage (cell 7 as src/scenes/battle.js)'),
    'battle_boss': dict(cell=7, zoom=1.0, frameY=0.0, bright=0.72, contrast=0.9, sat=0.95, extras=4,
                        tint=('#6e3ca0', 0.32), stage=(118, 0.46), note='boss stage: archive with the violet tint'),
    'dialog_keyart': dict(cell=0, zoom=1.0, frameY=0.0, bright=0.62, contrast=0.9, sat=0.85, extras=4,
                          vignette=0.55, note='prologue / dialog cards: darkened so text reads over it'),
    # E2-tiles (EPISODE2_PLAN 9.3): Episode 2. Cell 1 is the Nameless Hollow mirror palace (glass towers over a
    # still mere). The Fading Road has no painting, so it is composed (compose_east_road.py) like the valley.
    'battle_east_road': dict(compose='east_road', extras=0, max_pair=0.16, stage=(118, 0.44),
                             note='Fading Road battle stage: misty lowland at dusk, silver birches, the mere and a far '
                                  'glint of the Court (composed)'),
    'battle_court': dict(cell=1, zoom=1.0, frameY=0.0, bright=0.85, contrast=0.92, sat=0.9, extras=4,
                         tint=('#5a7ad2', 0.18), stage=(118, 0.42),
                         note='Court of Mirrors F1/F2 battle stage: cell 1, cool grade'),
    'battle_court_deep': dict(cell=1, zoom=1.0, frameY=0.0, bright=0.6, contrast=0.95, sat=0.95, extras=4,
                              tint=('#6e3ca0', 0.30), stage=(118, 0.46),
                              note='Court of Mirrors F3 battle stage: cell 1 darker, violet grade'),
    'battle_throne': dict(cell=1, zoom=1.55, frameX=0.08, frameY=-0.55, bright=0.68, contrast=1.0, sat=1.0, extras=4,
                          tint=('#6e3ca0', 0.34), vignette=0.35, stage=(118, 0.48),
                          note='the Nameless King: a tight crop on the glass towers, violet grade'),
    'dialog_keyart_ep2': dict(cell=1, zoom=1.0, frameY=0.0, bright=0.62, contrast=0.9, sat=0.85, extras=4,
                              vignette=0.55, note='Episode 2 title cards and CREDITS_EP2: cell 1 darkened, vignette'),
}


# ----------------------------------------------------------------------------- colour maths
def hex2rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


def rgb2hex(c):
    return '#%02x%02x%02x' % tuple(int(round(float(v) * 255)) for v in c[:3])


def srgb_to_lin(c):
    c = np.asarray(c, np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(np.asarray(c, np.float32), 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
               [0.2119034982, 0.6806995451, 0.1073969566],
               [0.0883024619, 0.2817188376, 0.6299787005]], np.float32)
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
               [1.9779984951, -2.4285922050, 0.4505937099],
               [0.0259040371, 0.7827717662, -0.8086757660]], np.float32)


def to_oklab(rgb):
    lms = np.cbrt(np.maximum(srgb_to_lin(rgb) @ M1.T, 0))
    return lms @ M2.T


def from_oklab(lab):
    lms = (np.asarray(lab, np.float32) @ np.linalg.inv(M2).T) ** 3
    return lin_to_srgb(lms @ np.linalg.inv(M1).T)


def load_palette():
    with open(PALETTE, encoding='utf-8') as f:
        p = json.load(f)
    cols = list(dict.fromkeys(p['colors']))
    return np.array([hex2rgb(h) for h in cols], np.float32)


# ----------------------------------------------------------------------------- source and grading
def cell_window(cell, zoom=1.0, frameY=0.0, frameX=0.0):
    im = Image.open(SRC).convert('RGB')
    cw, ch = im.width // COLS, im.height // ROWS
    cx, cy = (cell % COLS) * cw, (cell // COLS) * ch
    sw, sh = cw, int(round(cw * H / W))
    if sh > ch:
        sh = ch
        sw = int(round(ch * W / H))
    sw, sh = int(round(sw / zoom)), int(round(sh / zoom))
    xslack = (cw - sw) / 2.0
    ox = cx + int(round(xslack + frameX * xslack))      # frameX in -1..1 slides the window left / right (E2)
    slack = (ch - sh) / 2.0
    oy = cy + int(round(slack + frameY * slack))
    return im.crop((ox, oy, ox + sw, oy + sh))


def downscale(im):
    small = im.resize((W, H), Image.BOX)
    a = np.asarray(small).astype(np.float32) / 255.0
    return a


def unsharp(a, amount=0.55, radius=1.0):
    from scipy.ndimage import gaussian_filter
    out = a.copy()
    for c in range(3):
        bl = gaussian_filter(a[..., c], radius)
        out[..., c] = np.clip(a[..., c] + amount * (a[..., c] - bl), 0, 1)
    return out


def grade(a, rec):
    lab = to_oklab(a.reshape(-1, 3)).reshape(H, W, 3)
    lab[..., 0] = lab[..., 0] * rec.get('bright', 1.0)
    lab[..., 0] = 0.5 + (lab[..., 0] - 0.5) * rec.get('contrast', 1.0)
    lab[..., 1:] *= rec.get('sat', 1.0)
    a = np.clip(from_oklab(lab.reshape(-1, 3)).reshape(H, W, 3), 0, 1)
    if rec.get('tint'):
        col, k = rec['tint']
        t = hex2rgb(col)
        # multiply-ish tint: pull toward the tint colour, stronger in the lights
        a = a * (1 - k) + (a * t * 1.6) * k
        a = np.clip(a, 0, 1)
    ys = (np.arange(H, dtype=np.float32) + 0.5) / H
    xs = (np.arange(W, dtype=np.float32) + 0.5) / W
    if rec.get('topShade'):
        y0, y1, k = rec['topShade']
        t = np.clip((y1 - ys) / max(y1 - y0, 1e-3), 0, 1)
        a = a * (1 - (k * t * t)[:, None, None])
    if rec.get('vignette'):
        v = rec['vignette']
        dx = (xs[None, :] - 0.5) / 0.72
        dy = (ys[:, None] - 0.45) / 0.62
        d = np.sqrt(dx * dx + dy * dy)
        k = np.clip((d - 0.55) / 0.6, 0, 1) ** 1.4 * v
        a = a * (1 - k)[..., None]
    if rec.get('band'):
        by, alpha = rec['band']
        indigo = hex2rgb('#14101e')
        feather = 14
        k = np.clip((ys * H - (by - feather)) / feather, 0, 1)
        k = ((k * k * (3 - 2 * k)) * alpha)[:, None, None]
        a = a * (1 - k) + indigo * k
    return np.clip(a, 0, 1)


# ----------------------------------------------------------------------------- quantization
def nearest2(lab, plab):
    """indices of the nearest and second nearest palette colours per pixel (chunked)."""
    n = len(lab)
    i1 = np.empty(n, np.int64); i2 = np.empty(n, np.int64)
    for s in range(0, n, 32768):
        d = ((lab[s:s + 32768, None, :] - plab[None]) ** 2).sum(-1)
        o = np.argsort(d, axis=1)[:, :2]
        i1[s:s + 32768] = o[:, 0]; i2[s:s + 32768] = o[:, 1]
    return i1, i2


def quantize_ordered(a, pal, max_pair=0.14):
    """Ordered dither between the two nearest palette colours (OKLab). A pixel at colour c with nearest
    p1 and second p2 takes p2 when its projection along p1->p2 exceeds the Bayer threshold. Pairs that
    are far apart (> max_pair) are not dithered: a sky can blend two blues, an edge cannot blend a
    lamp into the night."""
    lab = to_oklab(a.reshape(-1, 3))
    plab = to_oklab(pal)
    wl = np.array([1.0, 1.0, 1.0], np.float32)
    i1, i2 = nearest2(lab * wl, plab * wl)
    p1, p2 = plab[i1], plab[i2]
    v = p2 - p1
    vv = (v * v).sum(-1)
    t = ((lab - p1) * v).sum(-1) / np.maximum(vv, 1e-9)
    dist = np.sqrt(vv)
    t = np.where(dist > max_pair, 0.0, np.clip(t, 0, 1))
    thr = np.tile(BAYER4, (H // 4 + 1, W // 4 + 1))[:H, :W].reshape(-1)
    idx = np.where(t > thr, i2, i1)
    return idx.reshape(H, W)


def pick_extras(a, pal, n_extra, min_de=0.045):
    """Greedy extra colours: k-means candidates over the pixels the palette carries worst; keep the one
    that cuts the total OKLab error most, repeat. Candidates too close to an existing colour are skipped."""
    if n_extra <= 0:
        return pal, []
    lab = to_oklab(a.reshape(-1, 3))
    extras = []
    for _ in range(n_extra):
        plab = to_oklab(pal)
        i1, _ = nearest2(lab, plab)
        err = np.sqrt(((lab - plab[i1]) ** 2).sum(-1))
        base = err.sum()
        if base / len(err) < 0.02:
            break
        worst = err > np.percentile(err, 70)
        pts = lab[worst]
        if len(pts) > 20000:
            pts = pts[::len(pts) // 20000]
        cands = kmeans(pts, 8)
        best, gain = None, 0.0
        dark_L = float(to_oklab(hex2rgb('#14101e')[None])[0, 0])
        for c in cands:
            if np.sqrt(((plab - c) ** 2).sum(-1)).min() < min_de:
                continue
            if c[0] < dark_L + 0.04:
                continue   # never darker than the palette's darkest (no near-black extras)
            e2 = np.sqrt(((lab - c) ** 2).sum(-1))
            g = base - np.minimum(err, e2).sum()
            if g > gain:
                best, gain = c, g
        if best is None or gain < base * 0.012:
            break
        rgb = np.clip(from_oklab(best[None])[0], 0, 1)
        rgb = np.round(rgb * 255) / 255
        pal = np.concatenate([pal, rgb[None]], 0)
        extras.append(rgb2hex(rgb))
    return pal, extras


def kmeans(X, k, iters=20):
    rng = np.random.default_rng(7)
    X = np.asarray(X, np.float32)
    if len(X) <= k:
        return X.copy()
    C = X[rng.choice(len(X), k, replace=False)]
    for _ in range(iters):
        d = ((X[:, None, :] - C[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        newC = C.copy()
        for j in range(k):
            m = lab == j
            if m.any():
                newC[j] = X[m].mean(0)
        if np.allclose(newC, C, atol=1e-5):
            break
        C = newC
    return C


# ----------------------------------------------------------------------------- old recipe (for the comparison strip)
def old_runtime(cell, bright=1.0, tint=None, band=True):
    """What src/scenes/battle.js does today: smooth downscale, posterize to steps of 10, tint, band."""
    im = cell_window(cell, 1.0, 0.0).resize((W, H), Image.BILINEAR)
    a = np.asarray(im).astype(np.float32)
    a = np.minimum(255, np.round(a * bright / 10) * 10) / 255.0
    if tint:
        col, k = tint
        a = a * (1 - k) + hex2rgb(col) * k
    if band:
        for y in range(int(H * 0.62), H):
            t = (y - H * 0.62) / (H * 0.38)
            k = 0.55 * min(1, t * 1.4)
            a[y] = a[y] * (1 - k) + hex2rgb('#0a0816') * k
    return np.clip(a, 0, 1)


# ----------------------------------------------------------------------------- build
def build_one(bid, rec, pal):
    if rec.get('compose') == 'hollow':
        import compose_hollow
        a = compose_hollow.compose(rec['compose'])
    elif rec.get('compose') == 'east_road':
        import compose_east_road
        a = compose_east_road.compose(rec['compose'])
    elif rec.get('compose'):
        import compose_valley
        a = compose_valley.compose(rec['compose'])
    else:
        im = cell_window(rec['cell'], rec.get('zoom', 1.0), rec.get('frameY', 0.0), rec.get('frameX', 0.0))
        a = downscale(im)
        a = unsharp(a, 0.55, 1.0)
        a = grade(a, rec)
    pal2, extras = pick_extras(a, pal, min(EXTRA_MAX, rec.get('extras', 0)))
    idx = quantize_ordered(a, pal2, rec.get('max_pair', 0.14))
    out = (pal2[idx] * 255 + 0.5).astype(np.uint8)
    img = Image.fromarray(out, 'RGB')
    os.makedirs(DST, exist_ok=True)
    img.save(os.path.join(DST, bid + '.png'), optimize=True)
    meta = {'image': bid + '.png', 'w': W, 'h': H, 'cell': rec.get('cell'), 'note': rec.get('note', ''),
            'extraColors': extras, 'colors': int(len(np.unique(idx)))}
    if rec.get('compose'):
        meta['composed'] = 'tools/art/backdrops/%s.py (%s)' % (
            {'hollow': 'compose_hollow', 'east_road': 'compose_east_road'}.get(rec['compose'], 'compose_valley'),
            rec['compose'])
    if rec.get('stage'):
        meta['bandY'] = int(rec['stage'][0])
        meta['bandAlpha'] = float(rec['stage'][1])
        meta['bandNote'] = 'not baked: the battle scene fills rows bandY..216 with indigo #14101e at bandAlpha under the sprites'
    with open(os.path.join(DST, bid + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.makedirs(OUT, exist_ok=True)
    img.resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, bid + '_3x.png'))
    # comparison strip: old runtime recipe (left) vs new (right), both at 2x
    if (bid.startswith('battle') or bid == 'title') and rec.get('cell') is not None:
        old = old_runtime(rec['cell'], 1.0 if bid == 'title' else rec.get('bright', 1.0),
                          None if bid in ('title', 'battle_valley') else rec.get('tint'), band=bid != 'title')
        oi = Image.fromarray((old * 255 + 0.5).astype(np.uint8), 'RGB')
        strip = Image.new('RGB', (W * 4 + 6, H * 2), (20, 16, 30))
        strip.paste(oi.resize((W * 2, H * 2), Image.NEAREST), (0, 0))
        strip.paste(img.resize((W * 2, H * 2), Image.NEAREST), (W * 2 + 6, 0))
        strip.save(os.path.join(OUT, 'compare_%s.png' % bid))
    print('%-15s cell %s  colors %3d  extras %s' % (bid, rec.get('cell', 'composed'), meta['colors'], extras or '-'))
    return meta


def mock_battle():
    """Composite the real battle sprites over battle_valley / battle_archive / battle_boss at the layout
    slots, 3x, so the density match can be judged (out/mock_battle_<id>_3x.png)."""
    import json as _j
    SP = os.path.join(NEXT, 'assets', 'sprites')

    def atlas(n):
        with open(os.path.join(SP, n + '.json'), encoding='utf-8') as f:
            m = _j.load(f)
        return m, Image.open(os.path.join(SP, m['image'])).convert('RGBA')

    pb, pbi = atlas('party_battle')
    eb, ebi = atlas('enemies_battle')
    bb, bbi = atlas('bosses_battle')
    party = [('hero_sword_idle_0', 298, 104), ('mira_staff_idle_0', 320, 125), ('bram_spear_idle_0', 342, 146)]
    setups = {
        'battle_valley': [('briar_wolf', eb, ebi, 54, 122), ('moss_scarab', eb, ebi, 122, 140), ('ink_slime', eb, ebi, 194, 152)],
        'battle_archive': [('page_wraith', eb, ebi, 74, 134), ('tome_golem', eb, ebi, 156, 150)],
        'battle_boss': [('archivore', bb, bbi, 98, 146), ('lost_page_1', bb, bbi, 200, 70)],
    }
    for bid, foes in setups.items():
        p = os.path.join(DST, bid + '.png')
        if not os.path.exists(p):
            continue
        bg = Image.open(p).convert('RGBA')
        with open(os.path.join(DST, bid + '.json'), encoding='utf-8') as f:
            meta = _j.load(f)
        if meta.get('bandY') is not None:
            band = Image.new('RGBA', (W, H - meta['bandY']), (20, 16, 30, int(round(meta['bandAlpha'] * 255))))
            bg.alpha_composite(band, (0, meta['bandY']))
        for name, m, img, fx, fy in foes:
            x, y, w, h = m['frames'][name]
            ox, oy = m['origin'][name]
            bg.alpha_composite(img.crop((x, y, x + w, y + h)), (fx - ox, fy - oy))
        for name, fx, fy in party:
            x, y, w, h = pb['frames'][name]
            ox, oy = pb.get('origin', [19, 39])
            bg.alpha_composite(pbi.crop((x, y, x + w, y + h)), (fx - ox, fy - oy))
        # the two bottom windows, as flat boxes, so the visible stage area is judged honestly
        box = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        from PIL import ImageDraw
        d = ImageDraw.Draw(box)
        d.rectangle((4, 152, 95, 211), fill=(30, 46, 110, 235), outline=(226, 224, 222, 255))
        d.rectangle((98, 152, 379, 211), fill=(30, 46, 110, 235), outline=(226, 224, 222, 255))
        bg.alpha_composite(box)
        bg.convert('RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, 'mock_%s_3x.png' % bid))
        print('wrote', os.path.join(OUT, 'mock_%s_3x.png' % bid))


def main(argv):
    pal = load_palette()
    want = [a for a in argv[1:] if not a.startswith('-')] or list(RECIPES)
    for bid in want:
        build_one(bid, RECIPES[bid], pal)
    if '--mock' in argv:
        mock_battle()


if __name__ == '__main__':
    main(sys.argv)
