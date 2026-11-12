"""Episode 7 battle stages and key art (E7-tiles, EPISODE7_PLAN 9.3, 5.2) -> assets/backdrops/ep7_<id>.png + .json.

    python ep7_build.py                          # every recipe
    python ep7_build.py ep7_battle_stillheart    # one
    python ep7_build.py --mock                   # also the stage mocks, both Stillheart grades and an aurora frame
                                                 # (out/mock_stage_ep7_*), and the numbers (out/ep7_stage_check.json)

Two stages come from the painting (environments cell 6, the Hollow North: the frozen cathedral, the pine forest, the
aurora; cell 7 stays held for Episode 8) and three are composed in code (the hall, the sanctum, the Stillheart over a
cell 6 sky crop). Every file is a lossless indexed PNG; the json carries {bandY, bandAlpha} (the battle scene draws its
indigo band itself), backdropId (the BACKDROPS key src/data/ep7/encounters.js names: the file id) and fallback.

THE FROZEN AND THAW GRADES (the Stillheart only, plan 9.3; CRITIQUE_7 item 1: never a screen over the frozen one). The
frozen grade is the stage as composed. The thaw grade is its own recipe in OKLab, the Episode 5 DAY_TONE pixel path
(src/data/ep5/scene.js dayTone, with this json's `grades.thaw.tone`): lightness lifted on a curve 1 - (1 - L)^lift,
chroma x chroma, a warm cast toward amber (hue in radians in the a/b plane), over rows 0..grades.thaw.rows[1] (the floor
under the band keeps one value so a foe that reads frozen reads thawed). Each grade's mean luma is measured on the phone
crop (the 384 x 216 screen scaled by 390/216, nearest: the same mean), band drawn: thaw at least 0.10 above frozen.
Cross-fade frozen to thaw over 30 frames when the ward thaws (phase 3).

THE AURORA (runtime, plan 5.2, a safety rule): a slow band of green and violet light over the sky rows of the sanctum and
the Stillheart, `aurora` in the json: 3 frames, one every 30 game frames, the band's centre line y(x) = y + amp * sin(x /
period + frame * phase), its strength a gaussian of `width` rows, colour `color` added at `alpha` x strength; never a flash,
never more than +0.05 luma at any pixel between consecutive frames (measured here, the wrap 2 -> 0 included), off under
reduceMotion (frame 0, still).
"""
import json, math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.normpath(os.path.join(HERE, '..', 'tiles')))
import build as B
from ep6_build import hx, h32, lum, mix, calm_band, clear_tone, stone_floor, Foes

DST, OUT, W, H = B.DST, B.OUT, B.W, B.H
CELL = 6
BAND = (118, 0.44)
THAW_TONE = {'lift': 1.9, 'warm': 0.0, 'chroma': 1.15, 'cast': 0.03, 'hue': 0.95}
AURORA = {'color': '#5fd3a2', 'color2': '#9062c3', 'alpha': 0.16, 'frames': 3, 'everyFrames': 30, 'y': 34, 'amp': 9,
          'period': 46.0, 'phase': 0.45, 'width': 14, 'maxStepLuma': 0.05,
          'how': 'add color (mixed 70/30 with color2 along x) x alpha x exp(-((y - yc(x)) / width)^2) to every sky row, '
                 'yc(x) = y + amp * sin(x / period + phase * sin(2 pi frame / 3)); frames 0, 1, 2 one every everyFrames game frames; '
                 'off under reduceMotion (frame 0); never a flash'}

SN = lambda i: hx(['#56648a', '#8090b2', '#a9b8d0', '#c9d4e3', '#e2e8f0'][i])
SC = lambda i: hx(['#251d34', '#2e2b4c', '#4c445c', '#66637f', '#8e8997', '#b3b6c4'][i])
IC = lambda i: hx(['#3e88ca', '#6ab3e4', '#b4e4f2', '#e8fffb'][i])
AG = lambda i: hx(['#2f9e7e', '#5fd3a2', '#a9f2cf'][i])
INKB = hx('#1a1334')
WHITE = hx('#f6f4ee')
GOLD = hx('#f9d77a')
AMBER = hx('#eba14d')


def ep7_extra():
    import ep7_kit
    return [hx(c) for c in ep7_kit.EXTRA]


def thaw_tone(a, rows=None):
    return clear_tone(a, THAW_TONE, rows)


def aurora_layer(a, k, rows):
    """The runtime aurora at frame k over rows 0..rows (mirrored here for the measure and the mocks)."""
    out = a.copy()
    yy, xx = np.mgrid[0:rows, 0:W].astype(np.float32)
    yc = AURORA['y'] + AURORA['amp'] * np.sin(xx / AURORA['period'] + AURORA['phase'] * math.sin(2 * math.pi * k / 3))
    s = np.exp(-((yy - yc) / AURORA['width']) ** 2)
    t = (np.sin(xx / 61.0) * 0.5 + 0.5)[..., None]
    col = hx(AURORA['color']) * (1 - 0.3 * t) + hx(AURORA['color2']) * 0.3 * t
    out[:rows] = np.clip(out[:rows] + col * (AURORA['alpha'] * s)[..., None], 0, 1)
    return out


# ====================================================================== composed stages
def pillar_col(a, x0, x1, y0, y1, aurora=True):
    for x in range(x0, x1):
        u = (x - x0) / max(1, x1 - x0 - 1)
        c = SN(4) if u < 0.12 else (AG(2) * 0.5 + SN(3) * 0.5 if (u < 0.25 and aurora) else IC(2) if u < 0.55
                                    else IC(1) if u < 0.8 else hx('#3e88ca') if u < 0.93 else hx('#24559b'))
        for y in range(y0, y1):
            a[y, x] = c * (0.97 if (y // 12) % 2 else 1.0)
            if y % 24 == 0:
                a[y, x] = IC(2) if u < 0.5 else hx('#24559b')


def hall():
    """F2's stage and the Pale Lantern's: a dark hall of letter niches (rows of arched niches, some lit warm with letters
    standing in them, most dark), dark ashlar, two warm lamp pools on a dark letter-stone floor under the band."""
    a = np.zeros((H, W, 3), np.float32)
    for y in range(H):
        a[y, :] = mix(SC(0), SC(1), min(1, y / 118.0))
    for y in range(0, 118):
        for x in range(W):
            course = y // 10
            if y % 10 == 0 or (x + (course % 2) * 16) % 32 == 0:
                a[y, x] = INKB
    lit = {(1, 1), (4, 0), (6, 2), (9, 1), (2, 2)}
    for row, ny in enumerate((14, 52, 88)):
        for col, nx in enumerate(range(14, W, 38)):
            for y in range(ny, ny + 26):
                for x in range(nx, nx + 20):
                    arch = y < ny + 8 and math.hypot(x + 0.5 - (nx + 10), y + 0.5 - (ny + 9)) > 10
                    if arch:
                        continue
                    edge = x in (nx, nx + 19) or y == ny + 25
                    if edge:
                        a[y, x] = SC(2)
                    elif (col, row) in lit:
                        a[y, x] = mix(hx('#a18f85'), hx('#584951'), (y - ny) / 26.0)
                        if y in (ny + 16, ny + 20) and (x - nx) % 3:
                            a[y, x] = hx('#c38334')
                    else:
                        a[y, x] = hx('#14101e')
                        if y in (ny + 16, ny + 20) and (x - nx) % 3:
                            a[y, x] = SC(1)
            if (col, row) in lit:
                a[ny + 8:ny + 12, nx + 8:nx + 12] = GOLD
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # the floor: dark letter stone in perspective
    for y in range(118, H):
        t = (y - 118) / (H - 118)
        for x in range(W):
            u = (x - W / 2) / (1 + t * 1.6)
            gx = int(u + 4000) % 28 == 0
            gy = (y - 118) % max(3, int(5 + t * 12)) == 0
            a[y, x] = SC(0) if (gx or gy) else mix(SC(1), SC(2), 0.35)
    for (lx, ly) in ((96, 70), (288, 70)):
        g = np.clip(1 - np.sqrt(((xx - lx) / 80.0) ** 2 + ((yy - ly - 60) / 110.0) ** 2), 0, 1) ** 1.6
        a = np.clip(a + g[..., None] * AMBER * 0.45, 0, 1)
        a[ly - 4:ly + 5, lx - 3:lx + 4] = hx('#fff7d6')
        a[ly - 6, lx - 4:lx + 5] = SC(0)
        a[ly + 5, lx - 4:lx + 5] = SC(0)
    return a


def sanctum():
    """F3's stage: the nave from below: tall ice pillars rising out of the white floor into the dark, the broken roof's
    night between them (the aurora is the runtime layer), the nave's white slabs under the band."""
    a = np.zeros((H, W, 3), np.float32)
    for y in range(H):
        a[y, :] = mix(hx('#14101e'), hx('#292657'), min(1, y / 118.0) ** 0.8)
    for y in range(0, 100):
        for x in range(W):
            if h32(x, y, 7301) % 211 == 0:
                a[y, x] = SN(3)
    for (x0, w) in ((10, 34), (96, 26), (176, 30), (254, 26), (334, 36)):
        pillar_col(a, x0, x0 + w, 0, 124)
        a[0:6, x0 - 3:x0 + w + 3] = SN(2)
        a[112:124, x0 - 4:x0 + w + 4] = SN(3)
    # the white nave floor
    a = stone_floor(a, 124, [SN(1), SN(2), SN(3), SN(4)], 7302)
    for y in range(118, 124):
        a[y] = mix(a[y], SN(1), 0.5)
    return a


def stillheart():
    """The White Phantom's stage: cell 6's aurora sky through the broken roof (a crop of the sky over the cathedral),
    two broken arches of ice framing it, the heart of ice on its dais in the middle (a tall faceted crystal cluster, the
    names inside it), a round white floor under the band. Composed in its frozen grade; the thaw is a tone."""
    im = B.cell_window(CELL, 2.6, -1.0, 0.35)
    sky = B.downscale(im)
    a = sky * 0.82
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # the broken roof: a dark vault of ice-stone across the top, torn open in the middle (a ragged hole onto the sky)
    for x in range(W):
        hole = abs(x - 192) < 118 + 14 * math.sin(x * 0.21) + 6 * math.sin(x * 0.67)
        depth = 6 + int(8 * math.sin(x * 0.13) ** 2) if hole else 34 + int(10 * (abs(x - 192) / 192.0))
        for y in range(0, depth):
            u = y / max(1.0, depth)
            a[y, x] = SC(1) if u < 0.6 else SC(2) if u < 0.85 else SN(1)
        a[depth, x] = SN(3)
        if not hole and x % 37 < 2:
            a[depth:depth + 4 + x % 5, x] = IC(3)        # icicles off the roof's torn edge
    # side pillars
    for (x0, w) in ((0, 22), (W - 22, 22)):
        pillar_col(a, x0, x0 + w, 0, 124, aurora=False)
    # the heart: a crystal cluster on a dais
    xtals = [(168, 112, 14, 46, -0.22), (216, 112, 14, 52, 0.2), (192, 112, 20, 86, 0.0)]
    for (xc, by, hw, ht, lean) in xtals:
        for y in range(by - ht, by):
            t = (by - y) / float(ht)
            w = hw if t < 0.74 else hw * (1 - t) / 0.26
            mid = xc + lean * (by - y)
            for x in range(int(round(mid - w)), int(round(mid + w)) + 1):
                u = (x - (mid - w)) / max(1.0, 2 * w)
                c = SN(4) if u < 0.3 else IC(2) if u < 0.62 else IC(1) if u < 0.85 else hx('#3e88ca')
                if abs(u - 0.3) < 0.03 or abs(u - 0.62) < 0.03:
                    c = IC(3)
                a[y, x] = c
            a[y, int(round(mid - w))] = hx('#1d3775')
            a[y, int(round(mid + w))] = hx('#1d3775')
    for i in range(14):
        bx = 180 + (i * 7) % 22
        by = 104 - (i * 11) % 70
        a[by, bx:bx + 3 + i % 3] = hx('#24559b')
    g = np.clip(1 - np.sqrt(((xx - 192) / 70.0) ** 2 + ((yy - 70) / 60.0) ** 2), 0, 1) ** 2
    a = np.clip(a + g[..., None] * IC(2) * 0.18, 0, 1)
    a[112:120, 150:234] = SC(2)
    a[112, 150:234] = SN(3)
    a = stone_floor(a, 124, [SN(1), SN(2), SN(3), SN(4)], 7303)
    for y in range(118, 124):
        a[y] = mix(a[y], SN(1), 0.5)
    # frost haze over the frozen grade (the thaw's tone lifts and warms it; it is part of the composition)
    haze = np.clip(1 - yy / 124.0, 0, 1) * 0.08
    a[:124] = mix(a[:124], SN(3)[None, None, :], haze[:124, :, None])
    return a


COMPOSE = {'hall': hall, 'sanctum': sanctum, 'stillheart': stillheart}

RECIPES = {
    'ep7_battle_road': dict(cell=CELL, zoom=1.7, frameX=-0.85, frameY=0.55, bright=1.0, contrast=1.0, sat=0.95, extras=4,
                            stage=BAND, calm=(112, 0.6, 0.55, 0.12), backdropId='ep7_battle_road', fallback='valley',
                            note='the White Road: environments cell 6, the black pines and the snow on the climb, the '
                                 'lamp posts; the snow under the band calmed to a mid value'),
    'ep7_battle_vault': dict(cell=CELL, zoom=1.9, frameX=0.62, frameY=-0.45, bright=0.95, contrast=1.0, sat=1.0, extras=4,
                             stage=BAND, calm=(112, 0.6, 0.45, 0.12), backdropId='ep7_battle_vault', fallback='archive',
                             note='F1 the Vanishing Steps: environments cell 6, a crop on the frozen cathedral front and '
                                  'its rose window; the cliff under the band calmed'),
    'ep7_battle_hall': dict(compose='hall', extras=0, max_pair=0.15, stage=BAND, backdropId='ep7_battle_hall',
                            fallback='archive',
                            note='F2 the Hall of Borrowed Light and the Pale Lantern: a dark hall of letter niches, a few '
                                 'lit, two lamp pools, a dark letter-stone floor (composed)'),
    'ep7_battle_sanctum': dict(compose='sanctum', extras=0, max_pair=0.15, stage=BAND, backdropId='ep7_battle_sanctum',
                               fallback='boss', aurora=True,
                               note='F3 the Stillheart Sanctum: tall ice pillars rising into the night, the white nave '
                                    'floor (composed); the aurora is a runtime layer'),
    'ep7_battle_stillheart': dict(compose='stillheart', extras=4, max_pair=0.15, stage=(118, 0.46),
                                  backdropId='ep7_battle_stillheart', fallback='boss', grades=True, aurora=True,
                                  note='the White Phantom: cell 6\'s aurora sky through the broken roof, two broken ice '
                                       'arches, the heart of ice on its dais, a round white floor (composed over a cell 6 '
                                       'sky crop); frozen and thaw grades; the aurora is a runtime layer'),
    'ep7_dialog_keyart': dict(cell=CELL, zoom=1.03, frameY=0.0, bright=0.66, contrast=0.92, sat=0.92, extras=4,
                              vignette=0.55, backdropId=None, fallback='ep6_dialog_keyart',
                              note='Episode 7 title cards and CREDITS_EP7: cell 6 darkened, vignette'),
}


def staged(img, by, ba):
    out = img.copy()
    out[by:] = out[by:] * (1 - ba) + hx('#14101e') * ba
    return out


def write(fid, a, rec):
    pal = B.load_palette()
    if rec.get('compose'):
        pal = np.concatenate([pal, np.stack(ep7_extra())], 0)
    if rec.get('extras'):
        pal2, ex = B.pick_extras(a, pal, min(B.EXTRA_MAX, rec.get('extras', 0)))
    else:
        pal2, ex = pal, []
    idx = B.quantize_ordered(a, pal2, rec.get('max_pair', 0.14))
    out = (pal2[idx] * 255 + 0.5).astype(np.uint8)
    cols = np.unique(out.reshape(-1, 3), axis=0)
    lut = {tuple(c): i for i, c in enumerate(cols)}
    idxim = np.array([lut[tuple(p)] for p in out.reshape(-1, 3)], np.uint8).reshape(H, W)
    pim = Image.fromarray(idxim, 'P')
    pim.putpalette(cols.astype(np.uint8).flatten().tolist())
    os.makedirs(DST, exist_ok=True)
    pim.save(os.path.join(DST, fid + '.png'), optimize=True)
    meta = {'image': fid + '.png', 'w': W, 'h': H, 'cell': rec.get('cell', CELL if fid.endswith('stillheart') else None),
            'note': rec.get('note', ''), 'extraColors': ex, 'colors': int(len(cols)),
            'source': 'composed' if rec.get('compose') else 'environments.webp cell %d' % CELL}
    if rec.get('compose'):
        meta['composed'] = 'tools/art/backdrops/ep7_build.py (%s); palette.json plus the ep7 sheet colours (ep7_kit.EXTRA)' % rec['compose']
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
        fz = staged(img, by, ba)
        th = staged(thaw_tone(img, rows=by), by, ba)
        meta['grades'] = {
            'frozen': 'as composed (the aurora layer over it)',
            'thaw': {'tone': dict(THAW_TONE), 'rows': [0, int(by)]},
            'how': 'thaw: over rows thaw.rows the Episode 5 DAY_TONE pixel path (src/data/ep5/scene.js dayTone) with '
                   'thaw.tone (the lift and a warm amber cast, warm 0: no violet turn); cross-fade frozen to thaw over 30 '
                   'frames when the ward thaws (phase 3). Never a screen or multiply over the frozen grade (CRITIQUE_7 '
                   'item 1).',
            'meanLuma': {'frozen': round(float(lum(fz).mean()), 4), 'thaw': round(float(lum(th).mean()), 4)},
            'skyLuma': {'frozen': round(float(lum(fz[:100]).mean()), 4), 'thaw': round(float(lum(th[:100]).mean()), 4)},
            'measured': 'phone crop (the 384 x 216 screen scaled by 1.806, nearest: the same mean), band drawn'}
    if rec.get('aurora'):
        by, ba = rec['stage']
        fr = [aurora_layer(img, k, by) for k in range(3)]
        steps = [float((lum(fr[(k + 1) % 3]) - lum(fr[k])).__abs__().max()) for k in range(3)]
        rise = float((lum(fr[0]) - lum(img)).max())
        meta['aurora'] = dict(AURORA, rows=[0, int(by)],
                              measured={'maxStepLuma': round(max(steps), 4), 'maxRiseOverStage': round(rise, 4),
                                        'steps': [round(s, 4) for s in steps]})
    with open(os.path.join(DST, fid + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(out, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_3x.png'))
    if rec.get('grades'):
        by = rec['stage'][0]
        t8 = (thaw_tone(img, rows=by) * 255 + 0.5).astype(np.uint8)
        Image.fromarray(t8, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_thaw_3x.png'))
    if rec.get('aurora'):
        by = rec['stage'][0]
        a8 = (aurora_layer(img, 1, by) * 255 + 0.5).astype(np.uint8)
        Image.fromarray(a8, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_aurora_3x.png'))
    print('%-24s colours %3d  extras %-34s %6d bytes' % (fid, len(cols), ex or '-', os.path.getsize(os.path.join(DST, fid + '.png'))))
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


# ====================================================================== mocks (stand-in foes until E7-sprites lands)
SETUPS = {
    'ep7_road': ('ep7_battle_road', ['rime_wolf', 'snow_wisp', 'rime_wolf'], None),
    'ep7_vault': ('ep7_battle_vault', ['snow_wisp', 'crystal_crawler', 'snow_wisp'], None),
    'ep7_hall': ('ep7_battle_hall', ['ice_knight', 'frostbound_revenant'], None),
    'ep7_lantern': ('ep7_battle_hall', ['pale_lantern'], None),
    'ep7_sanctum': ('ep7_battle_sanctum', ['rimed_page', 'ice_knight', 'rimed_page'], 'aurora'),
    'ep7_stillheart': ('ep7_battle_stillheart', ['white_phantom'], 'aurora'),
    'ep7_stillheart_thaw': ('ep7_battle_stillheart', ['white_phantom'], 'thaw'),
}
STAND_IN = {'rime_wolf': 'squall_wolf', 'snow_wisp': 'gale_sprite', 'crystal_crawler': 'rigger_beetle',
            'ice_knight': 'signal_wraith', 'frostbound_revenant': 'storm_page', 'pale_lantern': 'gale_engine',
            'rimed_page': 'storm_page', 'white_phantom': 'scribe'}


class Foes7(Foes):
    def __init__(self):
        Foes.__init__(self)
        self.at = [a for a in (self._atlas('ep7_enemies_battle'), self._atlas('ep7_bosses_battle'),
                               self._atlas('ep6_enemies_battle'), self._atlas('ep6_bosses_battle')) if a]
        self.used_stand_in = set()

    def get(self, fid):
        r = Foes.get(self, fid)
        if r is None and fid in STAND_IN:
            self.used_stand_in.add(fid)
            r = Foes.get(self, STAND_IN[fid])
        return r


def render_stage(setup, foes):
    import mock_stage as M
    from scipy.ndimage import binary_dilation
    bid, names, grade = SETUPS[setup]
    bg = Image.open(os.path.join(DST, bid + '.png')).convert('RGB')
    a = np.asarray(bg).astype(np.float32) / 255.0
    with open(os.path.join(DST, bid + '.json'), encoding='utf-8') as f:
        meta = json.load(f)
    by, ba = meta['bandY'], meta['bandAlpha']
    if grade == 'thaw':
        a = thaw_tone(a, rows=by)
    elif grade == 'aurora':
        a = aurora_layer(a, 1, by)
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
        stats.append({'foe': n, 'stand_in': STAND_IN.get(n) if n in foes.used_stand_in else None,
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
    return stats


def mocks():
    foes = Foes7()
    res = {'how': 'stand-in foes from the ep6 atlases until E7-sprites lands (stand_in names the sprite used); '
                  'distinct_px = share of the body more than 0.12 (OKLab) from the ring round it; aim >= 0.6',
           'setups': {}}
    for setup in SETUPS:
        res['setups'][setup] = render_stage(setup, foes)
    with open(os.path.join(OUT, 'ep7_stage_check.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(res, f, indent=1)
    print('stage mocks written:', ', '.join(SETUPS))
    return res


def main(argv):
    want = [a for a in argv[1:] if not a.startswith('-')] or list(RECIPES)
    for fid in want:
        build_one(fid)
    if '--mock' in argv:
        mocks()


if __name__ == '__main__':
    main(sys.argv)
