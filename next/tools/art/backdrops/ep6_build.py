"""Episode 6 battle stages and key art (E6-tiles, EPISODE6_PLAN 9.3, 5.2) -> assets/backdrops/ep6_<id>.png + .json.

    python ep6_build.py                     # every recipe
    python ep6_build.py ep6_battle_storm    # one
    python ep6_build.py --mock              # also the stage mocks with the real ep6 foes, both grades
                                            # (out/mock_stage_ep6_*), and the numbers (out/ep6_stage_check.json)

Two stages come from the painting (environments cell 5, the floating isles in sunlight; cells 6 and 7 are held for
Episodes 7 and 8) and three are composed in code (the relay hall, the storm, the Eyrie). Every file is a lossless indexed
PNG; the json carries {bandY, bandAlpha} (the battle scene draws its indigo band itself), backdropId (the BACKDROPS key
src/data/ep6/encounters.js names) and fallback, and for the storm stages `grades`, `rain` and `lightning`.

THE STAGE BAND. Every stage keeps a calm band where the foes stand (rows about 112 to 170, feet at 146): low texture and
a mid value between the episode's two foe families (Aloft foes are pale and white-rimmed, grounded foes brass-rimmed and
darker), so both read. The painted crops are flattened and pulled to that value under the band; the composed stages are
drawn that way.

THE STORM AND CLEAR GRADES (plan 9.3, CRITIQUE_7 item 1: never a screen over the storm). The storm stages (`storm`,
`eyrie`) are drawn in their storm grade (as composed, with the rain layer on top at runtime). The clear grade is its own
recipe in OKLab, the Episode 5 DAY_TONE pixel path (src/data/ep5/scene.js dayTone, with this json's `grades.clear.tone`):
lightness lifted on a curve 1 - (1 - L)^lift (the darks lift most, the painting's light and dark kept), chroma kept x
chroma, a small warm cast toward peach (hue in radians in the a/b plane), no violet turn (warm 0: the storm is slate, not
violet), over rows 0 to grades.clear.rows[1] (the floor under the band keeps one value so a foe that reads in the storm reads
in the clear); and the rain layer off. Each grade's mean luma is measured on the phone crop (the 384 x 216 screen scaled by
390/216, nearest: the same mean), band drawn: clear at least 0.12 above storm.

THE RAIN (runtime, storm grade only): thin slanted streaks drawn over rows 0..bandY, `rain` in the json (colour, alpha,
slope, spacing, length, speed). THE LIGHTNING (plan 5.2, a safety rule): a soft far-wall flash drawn over the storm backdrop
only, `lightning` in the json: a radial glow behind the storm wall at (x, y, r) in a pale cold colour whose per-pixel luma
rise is at most +0.12 at its peak (measured here on the composed pixels), rising over 3 frames and falling over 9, at most
once in any 4 seconds (minIntervalMs 4000), never a full-screen white, off under reduceMotion.
"""
import json, math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.normpath(os.path.join(HERE, '..', 'tiles')))
import build as B

DST, OUT, W, H = B.DST, B.OUT, B.W, B.H
CELL = 5
BAND = (118, 0.44)
CLEAR_TONE = {'lift': 2.3, 'warm': 0.0, 'chroma': 1.1, 'cast': 0.022, 'hue': 1.2}
RAIN = {'color': '#b5c3da', 'alpha': 0.22, 'slope': 0.35, 'spacing': 9, 'length': 7, 'speed': 5, 'rows': 'bandY',
        'how': 'storm grade only: every `spacing` px along x (offset per row band by a hash), a 1 px streak `length` px long '
               'leaning `slope` px right per px down, falling `speed` px a frame, drawn over rows 0..bandY at `alpha`; off in '
               'the clear grade and under reduceMotion (then drawn still)'}
LIGHTNING = {'color': '#e8fffb', 'peakLumaRise': 0.12, 'minIntervalMs': 4000, 'riseFrames': 3, 'fallFrames': 9,
             'how': 'a soft far-wall flash over the storm backdrop only: add `color` x k x falloff(d / r) to every pixel '
                    'inside the circle (x, y, r), falloff (1 - d)^2, k chosen so no pixel\'s luma rises more than '
                    'peakLumaRise; at most once in any minIntervalMs (a hard rule, plan 5.2); off under reduceMotion; '
                    'never a full-screen white'}


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


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def ep6_extra():
    import ep6_kit
    return [hx(c) for c in ep6_kit.EXTRA]


SL = lambda i: hx(['#1b212c', '#283040', '#3a4457', '#58647b', '#7c889e'][i])
BRS = lambda i: hx(['#6b5127', '#a17e3a', '#cfaa52', '#efd78c'][i])
CLD = lambda i: hx(['#8d9dbb', '#b5c3da', '#d9e2ef'][i])
WHITE = hx('#f6f4ee')


def calm_band(a, y0, alpha, target, desat=0.0):
    """Under the stage band: flatten local texture and pull the luma toward `target`, a 12-row feather above y0."""
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


# ====================================================================== the clear tone (a port of ep5 scene.js dayTone)
def clear_tone(a, t=CLEAR_TONE, rows=None):
    """The clear grade over rows [0, rows) (None = all): OKLab lightness lifted 1 - (1 - L)^lift, chroma x chroma, a warm
    cast (no violet turn: warm 0). The same arithmetic as src/data/ep5/scene.js dayTone with this tone."""
    out = a.copy()
    r = slice(0, rows) if rows else slice(None)
    x = a[r]
    lab = B.to_oklab(x.reshape(-1, 3))
    L, aa, bb = lab[:, 0], lab[:, 1], lab[:, 2]
    C = np.hypot(aa, bb)
    ua = np.where(C > 0, aa / np.maximum(C, 1e-9), 0)
    ub = np.where(C > 0, bb / np.maximum(C, 1e-9), 0)
    wa, wb = math.cos(t['hue']), math.sin(t['hue'])
    L2 = 1 - (1 - np.maximum(0, L)) ** t['lift']
    k = C * t['chroma']
    lab2 = np.stack([L2, ua * k + wa * t['cast'], ub * k + wb * t['cast']], -1)
    out[r] = np.clip(B.from_oklab(lab2).reshape(x.shape), 0, 1)
    return out


def rain_layer(a, by, frame=0):
    """The storm grade's rain over rows 0..by (the runtime layer, mirrored here for the measure and the mocks)."""
    out = a.copy()
    col, al = hx(RAIN['color']), RAIN['alpha']
    sp, ln, sl = RAIN['spacing'], RAIN['length'], RAIN['slope']
    for x0 in range(-60, W, sp):
        off = h32(x0, 6991) % 40 + frame * RAIN['speed']
        for y0 in range(-40 + off % 40, by, 40):
            for k in range(ln):
                y = y0 + k
                x = int(round(x0 + (h32(x0, 6992) % 7) + y * sl))
                if 0 <= x < W and 0 <= y < by:
                    out[y, x] = mix(out[y, x], col, al)
    return out


def lightning_at(a, spot, peak=None):
    """The soft flash at its peak over the composed pixels: per-pixel luma rise limited to peakLumaRise."""
    x0, y0, r = spot
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt((xx - x0) ** 2 + (yy - y0) ** 2) / r
    f = np.clip(1 - d, 0, 1) ** 2
    col = hx(LIGHTNING['color'])
    lc = float(lum(col[None, None, :])[0, 0])
    k = (peak if peak is not None else LIGHTNING['peakLumaRise']) / lc
    out = np.clip(a + col[None, None, :] * (k * f)[..., None], 0, 1)
    return out


# ====================================================================== composed stages
def billows(base, rect, seed, ramp, lobes=26, rmin=10, rmax=26, light=(-0.6, -0.8)):
    """Storm billows: round lobes in a rect, lit from the upper left, darker low; drawn back (top) to front (bottom)."""
    x0, y0, x1, y1 = rect
    rng = [(h32(seed, i, 1) % (x1 - x0) + x0, h32(seed, i, 2) % (y1 - y0) + y0, rmin + h32(seed, i, 3) % (rmax - rmin))
           for i in range(lobes)]
    rng.sort(key=lambda t: t[1])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for (cx, cy, r) in rng:
        dx, dy = (xx - cx) / r, (yy - cy) / r
        d = np.sqrt(dx * dx + dy * dy)
        m = d <= 1.0
        litv = -(dx * light[0] * -1 + dy * light[1] * -1)
        litv = -(dx * 0.6 + dy * 0.8)
        v = 1.6 + litv * 1.1 - (yy / H) * 1.0
        rim = (d > 0.84) & (litv > 0.3)
        v = np.where(rim, 3.6, v)
        v = np.clip(v, 0, len(ramp) - 1.001)
        i = v.astype(int)
        f = (v - i)[..., None]
        R = np.stack(ramp)
        col = R[i] * (1 - f) + R[np.minimum(i + 1, len(ramp) - 1)] * f
        base[m] = col[m]
    return base


def stone_floor(a, y0, ramp, seed, rows_px=(6, 8, 10, 13, 16, 20, 25)):
    """A white stone deck in perspective from y0 down: courses widening toward the viewer, joints, a centre ring."""
    y = y0
    k = 0
    while y < H:
        hgt = rows_px[min(k, len(rows_px) - 1)]
        wblock = 24 + k * 10
        off = (k % 2) * wblock // 2
        for yy in range(y, min(H, y + hgt)):
            t = (yy - y) / max(1, hgt - 1)
            for x in range(W):
                u = (x - W // 2) * (1.0 + (yy - y0) / 120.0)
                c = ramp[2] if t < 0.85 else ramp[1]
                if yy == y:
                    c = ramp[3]
                if int(u + off + 4000) % wblock == 0:
                    c = ramp[1]
                n = h32(x // 3, yy // 2, seed) % 23
                if n == 0:
                    c = ramp[1]
                a[yy, x] = c
        y += hgt
        k += 1
    return a


def storm():
    """F3's stage: a slate storm wall over the white spire's landing, the spire rising on the left with a lamp, broken
    causeway stones hanging in the storm, a white stone deck under the band (rain and lightning are runtime layers)."""
    a = np.zeros((H, W, 3), np.float32)
    for y in range(H):
        t = y / 120.0
        a[y, :] = mix(SL(0), SL(2), min(1, t ** 0.9))
    ramp = [SL(0), SL(1), SL(2), SL(3), SL(4)]
    billows(a, (0, -10, W, 70), 7101, ramp, lobes=22, rmin=14, rmax=34)
    billows(a, (0, 40, W, 118), 7102, ramp, lobes=28, rmin=10, rmax=26)
    # a pale seam of far light along the storm's base (where the lightning sits)
    for y in range(92, 112):
        k = (1 - abs(y - 102) / 10.0) * 0.18
        a[y] = mix(a[y], CLD(0), max(0, k))
    # hanging causeway stones
    for (cx, cy, w, h) in ((250, 70, 26, 8), (310, 52, 18, 6), (330, 96, 22, 7)):
        for y in range(cy, cy + h):
            for x in range(cx, cx + w - (y - cy)):
                a[y, x] = CLD(2) if y == cy else (CLD(1) if y < cy + h - 2 else SL(3))
    # the spire: a white cylinder on the left, brass bands, a lamp
    sx0, sx1 = 46, 98
    for y in range(0, 124):
        for x in range(sx0, sx1):
            u = (x - sx0) / (sx1 - sx0)
            v = 0.95 - abs(u - 0.32) * 0.9
            c = mix(CLD(0), WHITE, max(0, min(1, v)))
            if (y + int(6 * math.cos((u - 0.5) * math.pi))) % 14 == 0:
                c = c * 0.86
            a[y, x] = c
        a[y, sx0] = SL(1)
        a[y, sx1 - 1] = SL(1)
    for by in (30, 88):
        for x in range(sx0, sx1):
            a[by, x] = BRS(2)
            a[by + 1, x] = BRS(0)
    # the lamp on the spire (a warm window and its glow)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = np.clip(1 - np.sqrt((xx - 72) ** 2 + (yy - 60) ** 2) / 34.0, 0, 1) ** 2
    a = np.clip(a + g[..., None] * hx('#f9d77a') * 0.35, 0, 1)
    for y in range(52, 66):
        for x in range(66, 78):
            a[y, x] = hx('#f9d77a') if (x + y) % 3 else hx('#fff7d6')
    # the deck
    a = stone_floor(a, 124, [SL(2), CLD(0), CLD(1), CLD(2)], 7103)
    for y in range(118, 124):
        a[y] = mix(a[y], SL(1), 0.6)
    return a


def relays():
    """F2's stage and the Gale Engine's: a brass relay hall: slate panels with brass trim, four relay cabinets with lit
    dials, speaking tubes, a pipe run along the top, two warm lamp pools, a dark brass grating floor under the band."""
    a = np.zeros((H, W, 3), np.float32)
    for y in range(H):
        a[y, :] = mix(SL(1), SL(2), min(1, y / 118.0))
    # panels
    for x in range(W):
        if x % 32 == 0:
            a[:118, x] = SL(0)
        elif x % 32 == 1:
            a[:118, x] = SL(3)
    for y in (14, 58, 102):
        a[y, :] = BRS(2)
        a[y + 1, :] = BRS(0)
    # the pipe run
    for y in range(4, 10):
        a[y, :] = mix(BRS(1), BRS(3), 1 - abs(y - 6) / 3.0)
    for x in range(0, W, 48):
        a[3:11, x:x + 3] = BRS(0)
    # relay cabinets with dials
    for i, cx in enumerate((44, 140, 244, 340)):
        a[30:112, cx - 16:cx + 16] = SL(2)
        a[30:112, cx - 16] = SL(0)
        a[30:112, cx + 15] = SL(0)
        a[30, cx - 16:cx + 16] = BRS(2)
        for k, dy in enumerate((48, 74)):
            yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
            d = np.sqrt((xx - cx) ** 2 + (yy - dy) ** 2)
            a[(d < 9) & (d >= 7.5)] = BRS(2)
            a[d < 7.5] = hx('#e2e0de')
            lit = (i + k) % 3 != 0
            a[(d < 2.5)] = hx('#eba14d') if lit else SL(1)
        a[96:102, cx - 4:cx + 4] = hx('#f9d77a') if i % 2 == 0 else hx('#e06b39')
    # speaking tubes between cabinets
    for cx in (92, 292):
        for y in range(40, 118):
            a[y, cx - 3:cx + 3] = mix(BRS(1), BRS(3), 0.5)
            a[y, cx - 3] = BRS(0)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - cx) / 1.0) ** 2 + ((yy - 40) / 0.8) ** 2)
        a[(d < 11) & (d >= 9)] = BRS(3)
        a[d < 9] = SL(0)
    # floor: dark brass grating in perspective
    for y in range(118, H):
        t = (y - 118) / (H - 118)
        for x in range(W):
            u = (x - W / 2) / (1 + t * 1.5)
            gx = int(u + 4000) % 12 == 0
            gy = (y - 118) % max(3, int(4 + t * 10)) == 0
            a[y, x] = BRS(1) if (gx or gy) else mix(SL(1), SL(2), 0.4)
    # two warm lamp pools
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for (lx, ly) in ((92, 30), (292, 30)):
        g = np.clip(1 - np.sqrt(((xx - lx) / 70.0) ** 2 + ((yy - ly - 70) / 110.0) ** 2), 0, 1) ** 1.6
        a = np.clip(a + g[..., None] * hx('#eba14d') * 0.42, 0, 1)
        a[ly - 6:ly + 6, lx - 5:lx + 5] = hx('#fff7d6')
    return a


def eyrie():
    """The Storm Scribe's stage: the storm's ring round an open eye (the eye is environments cell 5's sky and clouds),
    the ring's slate billows spiralling, the stormglass desk on the far side of a round white deck."""
    im = B.cell_window(CELL, 2.2, -1.0, 0.25)
    sky = B.downscale(im)
    a = sky.copy()
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ex, ey, rx, ry = 192.0, 30.0, 150.0, 70.0
    d = np.sqrt(((xx - ex) / rx) ** 2 + ((yy - ey) / ry) ** 2)
    ang = np.arctan2(yy - ey, (xx - ex) * ry / rx)
    sw = np.sin(ang * 3 + d * 9.0) * 0.5 + 0.5
    ring = np.clip((d - 0.78) / 0.25, 0, 1)
    ramp = np.stack([SL(0), SL(1), SL(2), SL(3), SL(4)])
    v = np.clip(1.0 + sw * 2.2 - np.clip(d - 1.1, 0, 1) * 1.4, 0, 3.999)
    i = v.astype(int)
    f = (v - i)[..., None]
    stormc = ramp[i] * (1 - f) + ramp[np.minimum(i + 1, 4)] * f
    a = mix(a, stormc, ring[..., None])
    # the eye's rim lit cold
    rim = (np.abs(d - 0.8) < 0.03)
    a[rim] = mix(a[rim], CLD(1), 0.6)
    # the desk on the far side of the deck: a stormglass slab in perspective (a pale top face narrowing away, a dark
    # front edge) on a white stone plinth with a brass band, an inkwell and two pages on it
    for y in range(96, 104):
        t = (y - 96) / 7.0
        half = int(26 + t * 8)
        for x in range(192 - half, 192 + half):
            a[y, x] = mix(hx('#b4e4f2'), hx('#6ab3e4'), t) if (x + y) % 9 else hx('#e8fffb')
        a[y, 192 - half] = SL(1)
        a[y, 192 + half - 1] = SL(1)
    a[104:107, 158:226] = hx('#24559b')
    a[107, 158:226] = SL(0)
    for y in range(108, 119):
        for x in range(170, 214):
            u = (x - 170) / 43.0
            a[y, x] = mix(WHITE, CLD(0), u) if y != 110 else BRS(2)
        a[y, 170] = SL(1)
        a[y, 213] = SL(1)
    a[97:100, 176:186] = WHITE
    a[98, 177:185] = SL(3)
    a[98:101, 200:206] = WHITE
    a[96:99, 212:215] = hx('#1a1334')
    # the deck: round white stone, a brass ring inlay
    a = stone_floor(a, 118, [SL(2), CLD(0), CLD(1), CLD(2)], 7203)
    dd = np.sqrt(((xx - 192) / 210.0) ** 2 + ((yy - 230) / 90.0) ** 2)
    a[(np.abs(dd - 0.95) < 0.012) & (yy > 118)] = BRS(2)
    return a


COMPOSE = {'storm': storm, 'relays': relays, 'eyrie': eyrie}

RECIPES = {
    'ep6_battle_sky': dict(cell=CELL, zoom=1.5, frameX=-1.0, frameY=-0.1, bright=1.0, contrast=1.0, sat=1.0, extras=4,
                           stage=BAND, calm=(112, 0.6, 0.52, 0.15), backdropId='ep6_airstair', fallback='valley',
                           note='the Airstair: environments cell 5, the open sky over the skyport, the airship at its dock and '
                                'the near islands; the cloud under the band flattened to a calm mid value'),
    'ep6_battle_causeway': dict(cell=CELL, zoom=1.7, frameX=0.75, frameY=-0.35, bright=0.98, contrast=1.0, sat=1.0, extras=4,
                                stage=BAND, calm=(112, 0.6, 0.5, 0.15), backdropId='ep6_causeways', fallback='valley',
                                note='F1 the Windward Causeways: environments cell 5, the arched bridge and the island '
                                     'causeways over the falls; the cloud under the band calmed'),
    'ep6_battle_relays': dict(compose='relays', extras=0, max_pair=0.15, stage=BAND, backdropId='ep6_relays',
                              fallback='archive',
                              note='F2 the Hall of Broken Signals and the Gale Engine: a brass relay hall, lit dials, '
                                   'speaking tubes, two lamp pools, a dark grating floor (composed)'),
    'ep6_battle_storm': dict(compose='storm', extras=0, max_pair=0.15, stage=BAND, backdropId='ep6_storm', fallback='boss',
                             grades=True, lightning=(300, 100, 120),
                             note='F3 the Eye of the Storm: a slate storm wall, the white spire with its lamp, hanging '
                                  'causeway stones, a white stone deck (composed); rain and lightning are runtime layers'),
    'ep6_battle_eyrie': dict(compose='eyrie', extras=0, max_pair=0.15, stage=(118, 0.48), backdropId='ep6_eyrie',
                             fallback='boss', grades=True, lightning=(70, 60, 110),
                             note='the Storm Scribe: the storm\'s ring round an open eye (environments cell 5\'s sky in '
                                  'the eye), the stormglass desk, a round white deck (composed)'),
    'ep6_dialog_keyart': dict(cell=CELL, zoom=1.03, frameY=0.0, bright=0.66, contrast=0.92, sat=0.92, extras=4,
                              vignette=0.55, backdropId=None, fallback='ep5_dialog_keyart',
                              note='Episode 6 title cards and CREDITS_EP6: cell 5 darkened, vignette'),
}


# ====================================================================== write
def staged(img, by, ba):
    out = img.copy()
    out[by:] = out[by:] * (1 - ba) + hx('#14101e') * ba
    return out


def write(fid, a, rec):
    pal = B.load_palette()
    if rec.get('compose'):
        pal = np.concatenate([pal, np.stack(ep6_extra())], 0)
        ex = []
        pal2 = pal
    else:
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
        meta['composed'] = 'tools/art/backdrops/ep6_build.py (%s); palette.json plus the ep6 sheet colours (ep6_kit.EXTRA)' % rec['compose']
    if rec.get('stage'):
        meta['bandY'] = int(rec['stage'][0])
        meta['bandAlpha'] = float(rec['stage'][1])
        meta['bandNote'] = 'not baked: the battle scene fills rows bandY..216 with indigo #14101e at bandAlpha under the sprites'
    if rec.get('backdropId'):
        meta['backdropId'] = rec['backdropId']
    meta['fallback'] = rec.get('fallback')
    img = out.astype(np.float32) / 255.0
    if rec.get('stage'):
        by, ba = rec['stage']
        meta['meanLuma'] = round(float(lum(staged(img, by, ba)).mean()), 4)
    if rec.get('grades'):
        by, ba = rec['stage']
        st = staged(rain_layer(img, by), by, ba)
        cl = staged(clear_tone(img, rows=by), by, ba)
        meta['grades'] = {
            'storm': 'as composed, with the rain layer (`rain`) over rows 0..bandY',
            'clear': {'tone': dict(CLEAR_TONE), 'rows': [0, int(by)], 'rain': False},
            'how': 'clear: over rows clear.rows the Episode 5 DAY_TONE pixel path (src/data/ep5/scene.js dayTone) with '
                   'clear.tone (warm 0: no violet turn; the lift and a warm cast), the rain layer off; cross-fade storm '
                   'to clear over 20 frames when the ward tears. Never a screen or multiply over the storm (CRITIQUE_7 '
                   'item 1). storm: as composed plus the rain.',
            'meanLuma': {'storm': round(float(lum(st).mean()), 4), 'clear': round(float(lum(cl).mean()), 4)},
            'skyLuma': {'storm': round(float(lum(st[:100]).mean()), 4), 'clear': round(float(lum(cl[:100]).mean()), 4)},
            'measured': 'phone crop (the 384 x 216 screen scaled by 1.806, nearest: the same mean), band drawn'}
        meta['rain'] = dict(RAIN)
    if rec.get('lightning'):
        x0, y0, r = rec['lightning']
        by, ba = rec['stage']
        base = staged(rain_layer(img, by), by, ba)
        fl = lightning_at(base, (x0, y0, r))
        rise = lum(fl) - lum(base)
        meta['lightning'] = dict(LIGHTNING, at=[int(x0), int(y0), int(r)],
                                 measured={'maxPixelLumaRise': round(float(rise.max()), 4),
                                           'meanLumaRise': round(float(rise.mean()), 4)})
    with open(os.path.join(DST, fid + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(out, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_3x.png'))
    if rec.get('grades'):
        by = rec['stage'][0]
        c8 = (clear_tone(img, rows=by) * 255 + 0.5).astype(np.uint8)
        Image.fromarray(c8, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_clear_3x.png'))
        r8 = (rain_layer(img, by) * 255 + 0.5).astype(np.uint8)
        Image.fromarray(r8, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_storm_rain_3x.png'))
    if rec.get('lightning'):
        by = rec['stage'][0]
        l8 = (lightning_at(rain_layer(img, by), rec['lightning']) * 255 + 0.5).astype(np.uint8)
        Image.fromarray(l8, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_flash_3x.png'))
    print('%-22s colours %3d  extras %-34s %6d bytes' % (fid, len(cols), ex or '-', os.path.getsize(os.path.join(DST, fid + '.png'))))
    return meta


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


# ====================================================================== mocks with the real ep6 foes
SETUPS = {
    'ep6_airstair': ('ep6_battle_sky', ['squall_wolf', 'gale_sprite', 'squall_wolf'], None),
    'ep6_causeways': ('ep6_battle_causeway', ['storm_harrier', 'rigger_beetle', 'gale_sprite'], None),
    'ep6_relays': ('ep6_battle_relays', ['signal_wraith', 'lightning_manta'], None),
    'ep6_engine': ('ep6_battle_relays', ['gale_engine'], None),
    'ep6_storm': ('ep6_battle_storm', ['storm_page', 'lightning_manta', 'storm_page'], 'storm'),
    'ep6_storm_clear': ('ep6_battle_storm', ['storm_page', 'lightning_manta', 'storm_page'], 'clear'),
    'ep6_eyrie': ('ep6_battle_eyrie', ['scribe'], 'storm'),
    'ep6_eyrie_clear': ('ep6_battle_eyrie', ['scribe'], 'clear'),
    'ep6_eyrie_flash': ('ep6_battle_eyrie', ['scribe'], 'flash'),
}


class Foes:
    def __init__(self):
        import mock_stage as M
        self.M = M
        self.spr = M.Sprites(os.path.join(M.NEXT, 'assets', 'sprites'))
        self.at = [a for a in (self._atlas('ep6_enemies_battle'), self._atlas('ep6_bosses_battle')) if a]

    def _atlas(self, name):
        p = os.path.join(self.M.NEXT, 'assets', 'sprites', name + '.json')
        if not os.path.exists(p):
            return None
        with open(p, encoding='utf-8') as f:
            m = json.load(f)
        return (m, Image.open(os.path.join(os.path.dirname(p), m['image'])).convert('RGBA'))

    def get(self, fid):
        for m, img in self.at:
            if fid in m['frames']:
                x, y, w, h = m['frames'][fid]
                o = m.get('origin')
                ox, oy = (o[fid] if isinstance(o, dict) else o) if o else (w // 2, h - 1)
                return img.crop((x, y, x + w, y + h)), ox, oy
        return None


def render_stage(setup, foes):
    import mock_stage as M
    from scipy.ndimage import binary_dilation
    bid, names, grade = SETUPS[setup]
    bg = Image.open(os.path.join(DST, bid + '.png')).convert('RGB')
    a = np.asarray(bg).astype(np.float32) / 255.0
    with open(os.path.join(DST, bid + '.json'), encoding='utf-8') as f:
        meta = json.load(f)
    by, ba = meta['bandY'], meta['bandAlpha']
    if grade == 'clear':
        a = clear_tone(a, rows=by)
    elif grade in ('storm', 'flash'):
        a = rain_layer(a, by)
        if grade == 'flash':
            a = lightning_at(a, meta['lightning']['at'])
    a[by:] = a[by:] * (1 - ba) + hx('#14101e') * ba
    ground = a.copy()
    canvas = Image.fromarray((a * 255 + 0.5).astype(np.uint8)).convert('RGBA')
    units = [(n, 98, M.FEET) for n in names] if len(names) == 1 else [(n, x, M.FEET) for n, x in zip(names, M.ENEMY_X[len(names)])]
    stats = []
    for n, x, y in units:
        r = foes.get(n)
        if not r:
            continue
        im, ox, oy = r
        sh, sox, soy = foes.spr.frame(M.shadow_for(im.width))
        canvas.alpha_composite(sh, (x - sox, y - soy + 1))
        canvas.alpha_composite(im, (x - ox, y - oy))
        fa = np.asarray(im).astype(np.float32) / 255.0
        m = fa[..., 3] > 0.5
        big = np.zeros((H, W), bool)
        ys, xs = np.where(m)
        ys2, xs2 = ys + y - oy, xs + x - ox
        ok = (ys2 >= 0) & (ys2 < H) & (xs2 >= 0) & (xs2 < W)
        big[ys2[ok], xs2[ok]] = True
        ring = binary_dilation(big, iterations=6) & ~big
        body = fa[..., :3][m]
        rl = B.to_oklab(ground[ring].reshape(-1, 3)).mean(0)
        distinct = float((np.linalg.norm(B.to_oklab(body.reshape(-1, 3)) - rl[None, :], axis=1) > 0.12).mean())
        stats.append({'foe': n, 'body_luma': round(float(lum(body).mean()), 3), 'stage_luma': round(float(lum(ground[ring]).mean()), 3),
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
    canvas.convert('RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, 'mock_stage_%s_3x.png' % setup))
    s = 390 / 216.0
    canvas.convert('RGB').resize((int(round(W * s)), 390), Image.NEAREST).save(os.path.join(OUT, 'mock_stage_%s_phone.png' % setup))
    return stats


def mocks():
    foes = Foes()
    res = {'how': "body = mean of the foe's opaque pixels; stage = mean of a 6 px ring round its silhouette on the staged "
                  "backdrop (band drawn, grade applied); distinct_px = share of the body more than 0.12 (OKLab) from the "
                  "ring's mean; aim >= 0.6", 'setups': {}}
    for setup in SETUPS:
        res['setups'][setup] = render_stage(setup, foes)
    with open(os.path.join(OUT, 'ep6_stage_check.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(res, f, indent=1)
    worst = min(((st['distinct_px'], k, st['foe']) for k, v in res['setups'].items() for st in v), default=None)
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
