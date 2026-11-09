"""Episode 5 battle stages and key art (E5-tiles, EPISODE5_PLAN 9.3) -> assets/backdrops/ep5_<id>.png + .json.

    python ep5_build.py                  # every recipe
    python ep5_build.py ep5_battle_sea   # one
    python ep5_build.py --mock           # also the stage mocks, both grades (out/mock_stage_ep5_*), and the numbers
                                         # (out/ep5_stage_check.json)

CRITIQUE_6 item 5: four Episode 4 stages were one painting, all outdoors. Here two come from the painting (environments
cell 4, the desert observatory; cells 5 to 7 are held for later episodes) and three are composed in code (the sea, the
gallery, the well). Every file is a lossless indexed PNG; the json carries {bandY, bandAlpha} (the battle scene draws its
indigo band itself), backdropId (the BACKDROPS key src/data/ep5/encounters.js names) and fallback, plus `grades`.

THE STAGE BAND. CRITIQUE_6 found foes hard to read on dark painted stages, and a green foe vanished on a green stage. Every
stage keeps a calm band where the foes stand (rows about 112 to 170, feet at 146): low texture, a mid value between the
episode's two foe families (gold sun foes, about luma 0.55, and indigo star foes, about 0.15) and a hue neither family
has, so a gold foe reads lighter than it and an indigo foe darker. The painted crops are flattened and pulled to that value
under the band; the composed stages are drawn that way.

DAY AND NIGHT GRADES (the Turning Sky, plan 6.3 and 9.3): one PNG per stage; the scene draws Night as painted and Day as
    1. multiply  `day.multiply` at `day.multiplyAlpha` over the whole backdrop (dims the stars and the violet),
    2. screen    `day.screen`   at `day.screenAlpha`   over the whole backdrop (the warm lift),
cross-faded over 20 frames on a Turn. The json `grades` block carries the recipe and the measured mean luma of each grade
on the phone crop (Day must be at least 0.12 above Night).
"""
import json, math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build as B

DST, OUT, W, H = B.DST, B.OUT, B.W, B.H
CELL = 4
DAY = {'multiply': '#ffcf8a', 'multiplyAlpha': 0.5, 'screen': '#ffe2a6', 'screenAlpha': 0.56}
BAND = (118, 0.44)

RECIPES = {
    'ep5_battle_sea': dict(compose='sea', extras=3, max_pair=0.15, stage=BAND, backdropId='ep5_sea', fallback='valley',
                           note='the Saffron Wind at night: stars, a crescent moon and its path on black water, the rail '
                                'and the mast; the foes stand on the lantern-lit deck (composed)'),
    'ep5_battle_dunes': dict(cell=CELL, zoom=2.2, frameX=1.0, frameY=0.35, bright=1.0, contrast=0.95, sat=0.95, extras=4,
                             stage=BAND, calm=(112, 0.55, 0.52, 0.55), backdropId='ep5_dunes', fallback='valley',
                             note='the Caravan Road and the Shifting Dunes: environments cell 4, the right half (dunes, '
                                  'mesas, the aqueduct), no domes; the sand under the band flattened to a calm mid value'),
    'ep5_battle_gallery': dict(compose='gallery', extras=3, max_pair=0.15, stage=BAND, backdropId='ep5_gallery',
                               fallback='archive',
                               note='the Gallery of False Horizons and the Mirage Knight: a sandstone arcade, painted '
                                    'horizons, two window shafts, a pale stone floor (composed)'),
    'ep5_battle_well': dict(compose='well', extras=3, max_pair=0.15, stage=BAND, backdropId='ep5_well', fallback='archive',
                            note='the Well of Tomorrow: basalt shaft walls with star-glass seams, the sky a coin of '
                                 'stars overhead, two lamps on rails lighting the floor where the foes stand (composed)'),
    'ep5_battle_oracle': dict(cell=CELL, zoom=1.75, frameX=0.15, frameY=-0.35, bright=0.92, contrast=1.0, sat=1.0, extras=4,
                              stage=(118, 0.48), calm=(116, 0.6, 0.62, 0.6), vignette=0.3, backdropId='ep5_oracle',
                              fallback='boss',
                              note='the Sand Oracle: a tight crop on the great armillary and the star sky (cell 4), the '
                                   'floor under the band calmed'),
    'ep5_dialog_keyart': dict(cell=CELL, zoom=1.03, frameY=0.4, bright=0.62, contrast=0.9, sat=0.9, extras=4, vignette=0.55,
                              backdropId=None, fallback='dialog_keyart_ep3',
                              note='Episode 5 title cards and CREDITS_EP5: cell 4 darkened, vignette'),
}


def hx(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0


def h32(*vals):
    h = 0x811C9DC5
    for v in vals:
        h ^= (int(v) & 0xFFFFFFFF)
        h = (h * 0x01000193) & 0xFFFFFFFF
        h ^= h >> 13
        h = (h * 0x5BD1E995) & 0xFFFFFFFF
        h ^= h >> 15
    return h


def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def mix(c1, c2, t):
    return c1 * (1 - t) + c2 * t


def grade_day(a, g=DAY, rows=None):
    """The Day grade over rows [0, rows) (the sky and the far scene above the stage band; None = all rows): the floor
    where the foes stand keeps one value under both skies, so a foe that reads at night reads by day."""
    m, ma, s, sa = hx(g['multiply']), g['multiplyAlpha'], hx(g['screen']), g['screenAlpha']
    out = a.copy()
    r = slice(0, rows) if rows else slice(None)
    x = a[r]
    x = x * (1 - ma) + x * m * ma
    scr = 1 - (1 - x) * (1 - s)
    out[r] = np.clip(x * (1 - sa) + scr * sa, 0, 1)
    return out


def calm_band(a, y0, alpha, target, desat=0.0):
    """Under the stage band: flatten local texture (blend toward a wide blur) and pull the luma toward `target`, so the
    foes stand on a calm mid value. A 12-row feather above y0."""
    from scipy.ndimage import gaussian_filter
    bl = np.stack([gaussian_filter(a[..., c], 6) for c in range(3)], -1)
    ys = np.arange(H, dtype=np.float32)
    k = np.clip((ys - (y0 - 12)) / 12.0, 0, 1)[:, None, None]
    flat = mix(a, bl, alpha)
    L = lum(flat)[..., None]
    scale = np.where(L > 1e-3, (L + (target - L) * 0.55) / np.maximum(L, 1e-3), 1)
    flat = np.clip(flat * scale, 0, 1)
    if desat:
        L2 = lum(flat)[..., None]
        flat = mix(flat, L2 * hx('#d8d0c8') / 0.84, desat)
    return mix(a, flat, k)


# ====================================================================== composed: the sea
def stars(base, y1, seed, n=170, bright=1.0):
    for i in range(n):
        x = h32(seed, i, 1) % W
        y = h32(seed, i, 2) % y1
        k = h32(seed, i, 3) % 10
        c = hx('#f6f4ee') if k < 3 else (hx('#b4e4f2') if k < 7 else hx('#6891d9'))
        base[y, x] = mix(base[y, x], c, 0.9 * bright)
        if k == 0 and 1 <= x < W - 1 and 1 <= y < y1 - 1:
            for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                base[y + dy, x + dx] = mix(base[y + dy, x + dx], c, 0.5 * bright)


def sea():
    a = np.zeros((H, W, 3), np.float32)
    HZ = 76
    for y in range(HZ):
        t = y / float(HZ)
        a[y, :] = mix(hx('#0e153b'), hx('#2c4797'), t ** 1.6)
    stars(a, HZ - 6, 5101)
    # the crescent moon and its glow
    mx, my = 296, 30
    for y in range(0, HZ):
        for x in range(240, 352):
            d = math.hypot(x - mx, y - my)
            if d < 11 and math.hypot(x - mx - 5, y - my + 3) >= 9.5:
                a[y, x] = hx('#f6e4b9') if x < mx + 2 else hx('#e4cb96')
            elif 11 <= d < 26:
                a[y, x] = mix(a[y, x], hx('#4064b9'), 0.35 * (1 - (d - 11) / 15.0))
    # the sea: dark swells, the moon path
    for y in range(HZ, 120):
        t = (y - HZ) / 44.0
        for x in range(W):
            c = mix(hx('#1d2a67'), hx('#0e153b'), t)
            if (y + int(3 * math.sin(x * 0.07 + y * 0.9))) % 6 == 0:
                c = mix(c, hx('#2c4797'), 0.6)
            dx = abs(x - mx) / (5 + t * 30)
            dash = h32(x // (2 + int(t * 6)), y, 5111) % 5
            if dx < 1 and y % 2 == 0 and dash < 2 and h32(x, y, 5112) % 3:
                c = mix(hx('#e4cb96'), hx('#f6f4ee'), 1 - dx)
            a[y, x] = c
    a[HZ, :] = hx('#3e88ca') * 0.6 + a[HZ, :] * 0.4
    # the rail behind the foes: a long timber rail with posts and a copper cap, lantern light on it at the right
    ry = 100
    for x in range(W):
        for y in range(ry, ry + 5):
            c = hx('#6e3d2c') if y > ry + 1 else hx('#c38334')
            a[y, x] = c
        if x % 22 < 3:
            for y in range(ry + 5, 122):
                a[y, x] = hx('#482826') if x % 22 else hx('#6e3d2c')
    # the deck: planks running across, warm, calm under the foes, darker toward the front
    for y in range(120, H):
        t = (y - 120) / float(H - 120)
        for x in range(W):
            band = (y - 120) // 7
            c = mix(hx('#8f5533'), hx('#6e3d2c'), 0.35 + 0.15 * (band % 2))
            if (y - 120) % 7 == 0:
                c = hx('#482826')
            if (x + band * 37) % 96 == 0:
                c = hx('#482826')
            # lantern light pooled on the deck at the left and right
            for (lx, ly, r) in ((40, 132, 90), (330, 132, 110)):
                d = math.hypot((x - lx) / 1.0, (y - ly) * 2.0) / r
                if d < 1:
                    c = mix(c, hx('#b87942'), (1 - d) * 0.45)
            a[y, x] = mix(c, hx('#2d1b1f'), max(0.0, t - 0.55) * 0.9)
    # the mast and its furled sail at the far left, ropes to the rail
    for y in range(0, 122):
        for x in range(8, 18):
            a[y, x] = hx('#8f5533') if x < 12 else (hx('#6e3d2c') if x < 15 else hx('#482826'))
    for y in range(18, 30):
        for x in range(0, 60 - (y - 18) * 2):
            a[y, x] = hx('#eba14d') if (x + y) % 7 else hx('#c38334')
    for k in range(120):
        x, y = 18 + k, 24 + int(k * 0.62)
        if x < W and y < ry:
            a[y, x] = hx('#482826')
    return np.clip(a, 0, 1)


# ====================================================================== composed: the gallery
def gallery():
    a = np.zeros((H, W, 3), np.float32)
    FL = 112
    # the back wall: sandstone with a gold frieze, arches holding painted horizons
    for y in range(FL):
        for x in range(W):
            c = hx('#896042') if (x // 48 + y // 9) % 2 else hx('#7e6d6e')
            if y % 9 == 0:
                c = hx('#584951')
            a[y, x] = mix(c, hx('#2e2b4c'), min(1.0, y / 260.0))
    for y in range(6, 12):
        a[y, :] = hx('#eba14d') if y in (6, 11) else hx('#c38334')
    a[12, :] = hx('#6e3d2c')
    for i, ax in enumerate(range(16, W, 92)):
        kind = i % 3
        for y in range(22, FL - 6):
            for x in range(ax, ax + 64):
                r = 32
                d = math.hypot(x + 0.5 - (ax + r), y + 0.5 - (22 + r))
                if y < 22 + r and d > r:
                    continue
                edge = x < ax + 3 or x >= ax + 61 or (y < 22 + r and d > r - 3)
                if edge:
                    a[y, x] = hx('#2c4797') if x < ax + 2 or x >= ax + 62 or d > r - 1.5 else hx('#eba14d')
                    continue
                hz = 70 + (i % 2) * 4
                if kind == 0:
                    c = mix(hx('#b4e4f2'), hx('#6ab3e4'), (y - 22) / 50.0) if y < hz else (hx('#24559b') if (x + y) % 5 else hx('#3e88ca'))
                    if y == hz:
                        c = hx('#f6f4ee')
                elif kind == 1:
                    dune = hz + 4 * math.sin((x - ax) * 0.12)
                    c = mix(hx('#f9d77a'), hx('#e06b39'), (y - 22) / 52.0) if y < dune else (hx('#dcae62') if y < dune + 2 else hx('#c08a45'))
                else:
                    c = mix(hx('#e06b39'), hx('#b34532'), (y - 22) / 50.0)
                    if y > hz - 10 and ((x - ax) % 11 < 6 or y > hz):
                        c = hx('#1d2a67')
                    if y > hz - 8 and (x - ax) % 11 == 2 and y % 5 == 0:
                        c = hx('#f9d77a')
                a[y, x] = c
    # pilasters between the arches
    for px in range(4, W, 92):
        for y in range(13, FL):
            for x in range(px, px + 8):
                a[y, x] = hx('#c3a57c') if x < px + 3 else (hx('#a18f85') if x < px + 6 else hx('#7e6d6e'))
    # the floor: pale stone slabs in perspective, low texture, a lapis border along the wall
    for y in range(FL, H):
        t = (y - FL) / float(H - FL)
        for x in range(W):
            c = mix(hx('#cfb89c'), hx('#a18f85'), t * 0.8)
            row = int(math.log(1 + (y - FL) / 6.0) * 4)
            if (y - FL) > 0 and int(math.log(1 + (y - FL - 1) / 6.0) * 4) != row:
                c = mix(c, hx('#7e6d6e'), 0.55)
            if y < FL + 4:
                c = hx('#2c4797') if y < FL + 3 else hx('#eba14d')
            a[y, x] = c
    # two window shafts falling down-left from the upper right, across the wall and onto the floor behind the foes
    for (wx, ww) in ((300, 26), (220, 20)):
        for y in range(0, 150):
            for x in range(W):
                u = x - (wx - (y * 0.85))
                if 0 <= u < ww:
                    k = 0.30 * (1 - y / 190.0)
                    if (x + y) % 2 == 0 or u > 3:
                        a[y, x] = mix(a[y, x], hx('#fff7d6'), k)
    return np.clip(a, 0, 1)


# ====================================================================== composed: the well
def well():
    a = np.zeros((H, W, 3), np.float32)
    FL = 116
    cx = W / 2.0
    # the shaft wall: basalt courses that curve with the shaft, darker at the sides, star-glass seams
    for y in range(FL):
        for x in range(W):
            u = (x - cx) / (W / 2.0)
            curve = int(10 * u * u)
            yy = y + curve
            course = yy // 10
            blk = (x + (course % 2) * 15) // 30
            c = [hx('#2e323b'), hx('#272a32'), hx('#2b2f37')][h32(blk, course, 5301) % 3]
            if yy % 10 == 0:
                c = hx('#15171c')
                if course % 2 and (x * 7 + course) % 23 < 2:
                    c = hx('#b4e4f2')
                elif course % 2:
                    c = hx('#1d2a67')
            if (x + (course % 2) * 15) % 30 == 0:
                c = hx('#15171c')
            elif (x + (course % 2) * 15) % 30 == 1 or yy % 10 == 1:
                c = mix(c, hx('#454a55'), 0.6)
            a[y, x] = mix(c, hx('#15171c'), min(1.0, abs(u) ** 2 * 0.8))
    # the coin of night sky overhead, with stars
    for y in range(0, 40):
        for x in range(W):
            d = math.hypot((x - cx) / 120.0, (y + 30) / 64.0)
            if d < 1:
                a[y, x] = mix(hx('#1d2a67'), hx('#0e153b'), d)
                if d > 0.95:
                    a[y, x] = hx('#c38334')
    sub = np.zeros_like(a)
    sub[:] = a
    for i in range(80):
        x = int(cx - 110 + h32(5201, i, 1) % 220)
        y = h32(5201, i, 2) % 34
        if math.hypot((x - cx) / 120.0, (y + 30) / 64.0) < 0.93:
            a[y, x] = hx('#f6f4ee') if i % 3 else hx('#b4e4f2')
    # the lamps on their rails, left and right, and the rail ring round the floor
    for (lx, ly) in ((54, 70), (330, 70)):
        for y in range(ly - 40, H):
            for x in range(W):
                d = math.hypot(x - lx, (y - ly) * 1.2)
                if d < 120:
                    a[y, x] = mix(a[y, x], hx('#eba14d'), 0.30 * (1 - d / 120.0) ** 1.6)
        for y in range(ly - 8, ly + 6):
            for x in range(lx - 6, lx + 7):
                d = math.hypot(x - lx, y - ly)
                if d < 6:
                    a[y, x] = hx('#fff7d6') if d < 3 else hx('#f9d77a')
        for y in range(ly + 6, ly + 30):
            a[y, lx] = hx('#c38334')
            a[y, lx + 1] = hx('#8f5533')
    for x in range(W):
        for y in (FL - 3, FL - 2):
            a[y, x] = hx('#c38334') if y == FL - 3 else hx('#8f5533')
    # the floor: star-glass under warm lamp light, the light pooled across the band where the foes stand
    for y in range(FL, H):
        t = (y - FL) / float(H - FL)
        for x in range(W):
            c = mix(hx('#2c4797'), hx('#1d2a67'), t)
            if (x * 13 + y * 7) % 97 == 0:
                c = hx('#b4e4f2')
            warm = max(0.0, 1 - abs(y - 146) / 44.0) * (0.75 + 0.25 * math.cos((x - cx) / W * math.pi * 1.2))
            c = mix(c, hx('#b3b6c4'), min(1.0, warm * 1.1))
            a[y, x] = c
    return np.clip(a, 0, 1)


COMPOSE = {'sea': sea, 'gallery': gallery, 'well': well}


# ====================================================================== write
def write(fid, a, rec):
    pal = B.load_palette()
    pal2, ex = B.pick_extras(a, pal, min(B.EXTRA_MAX, rec.get('extras', 0)))
    idx = B.quantize_ordered(a, pal2, rec.get('max_pair', 0.14))
    out = (pal2[idx] * 255 + 0.5).astype(np.uint8)
    cols = np.unique(out.reshape(-1, 3), axis=0)
    lut = {tuple(c): i for i, c in enumerate(cols)}
    idxim = np.array([lut[tuple(p)] for p in out.reshape(-1, 3)], np.uint8).reshape(H, W)
    pim = Image.fromarray(idxim, 'P')
    pim.putpalette(cols.astype(np.uint8).flatten().tolist())
    os.makedirs(DST, exist_ok=True)
    pim.save(os.path.join(DST, fid + '.png'), optimize=True)
    meta = {'image': fid + '.png', 'w': W, 'h': H, 'cell': rec.get('cell'), 'note': rec.get('note', ''),
            'extraColors': ex, 'colors': int(len(cols)),
            'source': 'composed' if rec.get('compose') else 'environments.webp cell %d' % CELL}
    if rec.get('compose'):
        meta['composed'] = 'tools/art/backdrops/ep5_build.py (%s)' % rec['compose']
    if rec.get('stage'):
        meta['bandY'] = int(rec['stage'][0])
        meta['bandAlpha'] = float(rec['stage'][1])
        meta['bandNote'] = 'not baked: the battle scene fills rows bandY..216 with indigo #14101e at bandAlpha under the sprites'
    if rec.get('backdropId'):
        meta['backdropId'] = rec['backdropId']
    meta['fallback'] = rec.get('fallback')
    if rec.get('stage'):
        img = out.astype(np.float32) / 255.0
        night = staged(img, rec)
        day = staged(grade_day(img, rows=rec['stage'][0]), rec)
        meta['grades'] = {'night': 'as painted', 'day': dict(DAY, rows=[0, int(rec['stage'][0])]),
                          'how': 'Day: over rows day.rows (0 to bandY: the sky and the far scene, never the floor the foes '
                                 'stand on) multiply by day.multiply at day.multiplyAlpha, then screen day.screen at '
                                 'day.screenAlpha; cross-fade over 20 frames on a Turn. Night: as painted.',
                          'meanLuma': {'night': round(float(lum(night).mean()), 4), 'day': round(float(lum(day).mean()), 4)},
                          'skyLuma': {'night': round(float(lum(night[:100]).mean()), 4), 'day': round(float(lum(day[:100]).mean()), 4)},
                          'measured': 'phone crop (the 384 x 216 screen scaled by 1.806, nearest: the same mean), band drawn'}
    with open(os.path.join(DST, fid + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(out, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_3x.png'))
    Image.fromarray(out, 'RGB').save(os.path.join(OUT, fid + '_x1.png'))
    if rec.get('stage'):
        d8 = (grade_day(out.astype(np.float32) / 255.0, rows=rec['stage'][0]) * 255 + 0.5).astype(np.uint8)
        Image.fromarray(d8, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_day_3x.png'))
    print('%-22s colours %3d  extras %-34s %6d bytes' % (fid, len(cols), ex or '-', os.path.getsize(os.path.join(DST, fid + '.png'))))
    return meta


def staged(img, rec):
    """The backdrop with the battle scene's band drawn (rows bandY..216, indigo #14101e at bandAlpha)."""
    by, ba = rec['stage']
    out = img.copy()
    out[by:] = out[by:] * (1 - ba) + hx('#14101e') * ba
    return out


def build_one(fid):
    rec = RECIPES[fid]
    if rec.get('compose'):
        a = COMPOSE[rec['compose']]()
    else:
        im = B.cell_window(rec['cell'], rec.get('zoom', 1.0), rec.get('frameY', 0.0), rec.get('frameX', 0.0))
        a = B.downscale(im)
        a = B.unsharp(a, 0.55, 1.0)
        a = B.grade(a, rec)
        if rec.get('calm'):
            a = calm_band(a, *rec['calm'])
    return write(fid, a, rec)


# ====================================================================== mocks with stand-in desert foes
# E5-sprites builds the real ep5 foes in the same wave; until assets/sprites/ep5_enemies_battle.json exists, the mocks
# recolour the source cells' existing sprites the way plan 6.2 and 9.2 describe (sun foes gold and ochre, star foes indigo,
# a dark outline and a side-coded rim: gold for sun, pale blue for star) so the stages are judged against the right
# values. When the real atlas is present it is used instead.
STANDIN = {
    'dune_stalker': ('briar_wolf', 'sun', ['#482826', '#8f5533', '#c38334', '#eba14d', '#f9d77a']),
    'dune_scarab': ('moss_scarab', 'sun', ['#1d2a67', '#8f5533', '#c38334', '#eba14d', '#f9d77a']),
    'dust_harrier': ('blank_decree', 'sun', ['#571f28', '#87332e', '#b87942', '#d69c57', '#e4cb96']),
    'silt_reaver': ('page_wraith', 'star', ['#14101e', '#4c445c', '#a18f85', '#cfb89c', '#b4e4f2']),
    'starsilt': ('ink_slime', 'star', ['#0e153b', '#1d2a67', '#2c4797', '#4064b9', '#b4e4f2']),
    'horizon_shade': ('ink_wraith', 'star', ['#0e153b', '#1d2a67', '#3f4186', '#7162bd', '#f9d77a']),
    'tomorrow_husk': ('tome_golem', 'sun', ['#482826', '#7e6d6e', '#a18f85', '#cfb89c', '#eba14d']),
    'mirage_knight': ('echo_warden', 'sun', ['#2d1b1f', '#6e3d2c', '#b87942', '#d69c57', '#f9d77a']),
    'oracle': ('archivore', 'sun', ['#0e153b', '#1d2a67', '#8f5533', '#eba14d', '#fff7d6']),
}
RIM = {'sun': '#f9d77a', 'star': '#b4e4f2'}
SETUPS = {
    'ep5_sea': ('ep5_battle_sea', ['dust_harrier', 'dune_scarab']),
    'ep5_dunes': ('ep5_battle_dunes', ['dune_stalker', 'starsilt', 'dune_stalker']),
    'ep5_dunes_b': ('ep5_battle_dunes', ['dune_scarab', 'silt_reaver']),
    'ep5_gallery': ('ep5_battle_gallery', ['silt_reaver', 'dune_scarab', 'starsilt']),
    'ep5_gallery_knight': ('ep5_battle_gallery', ['mirage_knight']),
    'ep5_well': ('ep5_battle_well', ['horizon_shade', 'tomorrow_husk', 'starsilt']),
    'ep5_oracle': ('ep5_battle_oracle', ['oracle']),
}


class Foes:
    def __init__(self):
        import mock_stage as M
        self.M = M
        self.spr = M.Sprites(os.path.join(M.NEXT, 'assets', 'sprites'))
        self.ep4 = self._atlas('ep4_enemies_battle')
        self.real = self._atlas('ep5_enemies_battle') or None
        self.realb = self._atlas('ep5_bosses_battle') or None

    def _atlas(self, name):
        p = os.path.join(self.M.NEXT, 'assets', 'sprites', name + '.json')
        if not os.path.exists(p):
            return None
        with open(p, encoding='utf-8') as f:
            m = json.load(f)
        return (m, Image.open(os.path.join(os.path.dirname(p), m['image'])).convert('RGBA'))

    def _frame(self, at, name):
        m, img = at
        if name not in m['frames']:
            return None
        x, y, w, h = m['frames'][name]
        o = m.get('origin')
        ox, oy = (o[name] if isinstance(o, dict) else o) if o else (w // 2, h - 1)
        return img.crop((x, y, x + w, y + h)), ox, oy

    def get(self, fid):
        for at in (self.real, self.realb):
            if at:
                r = self._frame(at, fid)
                if r:
                    return r + (True,)
        src, side, ramp = STANDIN[fid]
        r = None
        try:
            r = self.spr.frame(src)
        except KeyError:
            r = self._frame(self.ep4, src)
        im, ox, oy = r
        return recolor(im, ramp, side), ox + 1, oy + 1, False


def recolor(im, ramp, side):
    a = np.asarray(im).astype(np.float32) / 255.0
    rgb, al = a[..., :3], a[..., 3]
    L = lum(rgb)
    lo, hi = np.percentile(L[al > 0.5], 5), np.percentile(L[al > 0.5], 97)
    t = np.clip((L - lo) / max(1e-3, hi - lo), 0, 0.999) * (len(ramp) - 1)
    cols = np.stack([hx(c) for c in ramp])
    i = t.astype(int)
    f = (t - i)[..., None]
    out = cols[i] * (1 - f) + cols[np.minimum(i + 1, len(ramp) - 1)] * f
    mask = al > 0.5
    H2, W2 = mask.shape
    pad = np.zeros((H2 + 2, W2 + 2), bool)
    pad[1:-1, 1:-1] = mask
    outline = np.zeros_like(pad)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        outline |= np.roll(np.roll(pad, dy, 0), dx, 1)
    outline &= ~pad
    res = np.zeros((H2 + 2, W2 + 2, 4), np.float32)
    res[1:-1, 1:-1, :3] = out
    res[1:-1, 1:-1, 3] = mask
    res[outline, :3] = hx('#14101e')
    res[outline, 3] = 1
    # the side-coded rim: the top-left edge pixels of the body
    edge = pad & ~np.roll(pad, 1, 0) | pad & ~np.roll(pad, 1, 1)
    res[edge, :3] = hx(RIM[side])
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), 'RGBA')


def render_stage(setup, foes, day):
    import mock_stage as M
    bid, names = SETUPS[setup]
    bg = Image.open(os.path.join(DST, bid + '.png')).convert('RGB')
    a = np.asarray(bg).astype(np.float32) / 255.0
    with open(os.path.join(DST, bid + '.json'), encoding='utf-8') as f:
        meta = json.load(f)
    by, ba = meta['bandY'], meta['bandAlpha']
    if day:
        a = grade_day(a, rows=by)
    a[by:] = a[by:] * (1 - ba) + hx('#14101e') * ba
    ground = a.copy()
    canvas = Image.fromarray((a * 255 + 0.5).astype(np.uint8)).convert('RGBA')
    units = []
    if names == ['oracle']:
        units.append(('oracle', 98, M.FEET))
    elif names == ['mirage_knight']:
        units.append(('mirage_knight', 98, M.FEET))
    else:
        for n, x in zip(names, M.ENEMY_X[len(names)]):
            units.append((n, x, M.FEET))
    stats = []
    for n, x, y in units:
        im, ox, oy, real = foes.get(n)
        sh, sox, soy = foes.spr.frame(M.shadow_for(im.width))
        canvas.alpha_composite(sh, (x - sox, y - soy + 1))
        canvas.alpha_composite(im, (x - ox, y - oy))
        # contrast: the foe's body vs the stage around it (a 6 px ring outside the silhouette), on the staged ground
        fa = np.asarray(im).astype(np.float32) / 255.0
        m = fa[..., 3] > 0.5
        x0, y0 = x - ox, y - oy
        hh, ww = m.shape
        from scipy.ndimage import binary_dilation
        big = np.zeros((H, W), bool)
        ring = np.zeros((H, W), bool)
        ys, xs = np.where(m)
        ys2, xs2 = ys + y0, xs + x0
        ok = (ys2 >= 0) & (ys2 < H) & (xs2 >= 0) & (xs2 < W)
        big[ys2[ok], xs2[ok]] = True
        ring = binary_dilation(big, iterations=6) & ~big
        body = fa[..., :3][m]
        body_l = float(lum(body).mean())
        ring_l = float(lum(ground[ring]).mean())
        bl = B.to_oklab(body.reshape(-1, 3)).mean(0)
        rl = B.to_oklab(ground[ring].reshape(-1, 3)).mean(0)
        bodylab = B.to_oklab(body.reshape(-1, 3))
        distinct = float((np.linalg.norm(bodylab - rl[None, :], axis=1) > 0.12).mean())
        stats.append({'foe': n, 'standin': not real, 'body_luma': round(body_l, 3), 'stage_luma': round(ring_l, 3),
                      'luma_gap': round(abs(body_l - ring_l), 3), 'oklab_gap': round(float(np.linalg.norm(bl - rl)), 3),
                      'distinct_px': round(distinct, 3)})
    for name, x in M.PARTY:
        im, ox, oy = foes.spr.frame(name)
        canvas.alpha_composite(im, (x - ox, M.FEET - oy))
    from PIL import ImageDraw
    box = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(box)
    for (x, y, w, h) in ((4, 4, 218, 19), (4, 152, 92, 60), (98, 152, 282, 60)):
        d.rectangle((x, y, x + w - 1, y + h - 1), fill=(30, 46, 110, 235), outline=(226, 224, 222, 255))
    d.rectangle((226, 6, 379, 23), fill=(20, 16, 30, 150))
    canvas.alpha_composite(box)
    tag = 'day' if day else 'night'
    canvas.convert('RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, 'mock_stage_%s_%s_3x.png' % (setup, tag)))
    s = 390 / 216.0
    canvas.convert('RGB').resize((int(round(W * s)), 390), Image.NEAREST).save(os.path.join(OUT, 'mock_stage_%s_%s_phone.png' % (setup, tag)))
    return stats


def mocks():
    foes = Foes()
    res = {'how': 'body = mean of the foe\'s opaque pixels; stage = mean of a 6 px ring round its silhouette on the staged '
                  'backdrop (band drawn); gaps in Rec.709 luma and OKLab distance. standin = a recolour of the source cell '
                  'sprite (E5-sprites\' atlas not built yet).', 'setups': {}}
    for setup in SETUPS:
        res['setups'][setup] = {'night': render_stage(setup, foes, False), 'day': render_stage(setup, foes, True)}
    with open(os.path.join(OUT, 'ep5_stage_check.json'), 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=1)
    worst = min((st['distinct_px'], setup, g, st['foe']) for setup, v in res['setups'].items() for g, L in v.items() for st in L)
    res['rule'] = "distinct_px = share of the foe's body pixels more than 0.12 (OKLab) from the stage around it; aim >= 0.6"
    print('stage check written; weakest foe (distinct share of its body):', worst)
    return res


def main(argv):
    want = [a for a in argv[1:] if not a.startswith('-')] or list(RECIPES)
    for fid in want:
        build_one(fid)
    if '--mock' in argv:
        mocks()


if __name__ == '__main__':
    main(sys.argv)
