"""Episode 8 battle stages and key art (E8-tiles, EPISODE8_PLAN 9.3) -> assets/backdrops/ep8_<id>.png + .json.

    python ep8_build.py                          # every recipe
    python ep8_build.py ep8_battle_lastword      # one
    python ep8_build.py --mock                   # also the stage mocks, both Last Word grades and the white-out peak
                                                 # (out/mock_stage_ep8_*), and the numbers (out/ep8_stage_check.json)

Three stages come from the painting (environments cell 7, the First Library: the colossal library, books and glyphs
circling a luminous open book, the violet void and the warm gold light; held for Episode 8) and two are composed in code
(the palimpsest galleries, the unwritten page). The Stair's stage is cell 7's sky with steps of written light composed
over it. Every file is a lossless indexed PNG; the json carries {bandY, bandAlpha} (the battle scene draws its indigo band
itself), backdropId (the BACKDROPS key E8-battle's encounters.js names: the file id) and fallback.

THE VIOLET AND GOLD GRADES (the Last Word only, plan 9.3; never a screen over the violet one). The violet grade is the
stage as composed. The gold grade is its own OKLab recipe, the Episode 5 DAY_TONE pixel path (src/data/ep5/scene.js
dayTone, with this json's `grades.gold.tone`): lightness lifted on a curve 1 - (1 - L)^lift, chroma x chroma, a warm cast
toward amber (hue in radians in the a/b plane), over rows 0..grades.gold.rows[1] (the floor under the band keeps one
value so a foe that reads violet reads gold). Each grade's mean luma is measured on the phone crop (the 384 x 216 screen
scaled by 390/216, nearest: the same mean), band drawn: gold at least 0.10 above violet. Cross-fade violet to gold over
30 frames when the ward breaks (phase 3).

THE WHITE-OUT (phase 4, a safety rule): a separate overlay, never baked: `whiteout` in the json: colour, peak alpha and
frames such that no pixel rises more than +0.15 luma over the gold grade at the peak, and the ramp spends at most 30
frames rising (measured here: maxRiseLuma). Off under reduceMotion (a cut to the peak alpha's half, no ramp).
"""
import json, math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.normpath(os.path.join(HERE, '..', 'tiles')))
import build as B
from ep6_build import hx, h32, lum, mix, calm_band, clear_tone, Foes

DST, OUT, W, H = B.DST, B.OUT, B.W, B.H
CELL = 7
BAND = (118, 0.44)
GOLD_TONE = {'lift': 1.8, 'warm': 0.0, 'chroma': 1.12, 'cast': 0.045, 'hue': 1.05}
WHITEOUT = {'color': '#fff7d6', 'alpha': 0.0, 'frames': 30, 'holdFrames': 12, 'capLuma': 0.15,
            'how': 'over the gold grade: lerp every pixel toward color by alpha * t (t 0..1 over frames, then hold, then '
                   'back over frames); alpha is set here so the brightest rise anywhere is at most capLuma; never a flash'}

VOID = hx('#2c1d55')
VOID_DEEP = hx('#20143f')
GOLD = hx('#f9d77a')
GOLD2 = hx('#c38334')
AMBER = hx('#eba14d')
CREAM = hx('#f5ecd4')
CREAM2 = hx('#e6d8b4')
FOLD = hx('#c9b88f')
INKB = hx('#14101e')
VL = [hx(c) for c in ('#a8a098', '#8f8781', '#78706c', '#615958')]
BP = [hx('#aca4bc'), hx('#9a92ad')]


def ep8_extra():
    import ep8_kit
    return [hx(c) for c in ep8_kit.EXTRA]


def gold_tone(a, rows=None):
    return clear_tone(a, GOLD_TONE, rows)


def glyph(x, row, seed):
    k = (x + h32(row, seed) % 16) % 16
    return (h32(k // 3, row, seed) % 5) != 0 and k % 3 != 2


# ====================================================================== composed stages
def void_sky(a, rows):
    """The violet void with slow gold motes baked as a few still specks (the stage is a still)."""
    for y in range(rows):
        a[y, :] = mix(VOID_DEEP, VOID, min(1.0, y / float(rows)))
    for i in range(70):
        x, y = h32(i, 9001) % W, h32(i, 9002) % rows
        a[y, x] = mix(a[y, x], GOLD, 0.55 if i % 3 else 0.9)
    return a


def palimpsest():
    """F2's stage and the Unnamed Sentry's: a gallery whose walls are pages written over pages (grey sheets in courses,
    the old writing slanting faint under the new level lines), lamp niches, two warm lamp pools on a vellum floor."""
    a = np.zeros((H, W, 3), np.float32)
    for y in range(118):
        for x in range(W):
            course = y // 22
            u = (x + (course % 2) * 30) % 60
            c = VL[1] if (course + (x + (course % 2) * 30) // 60) % 3 else VL[0]
            if y % 22 == 21 or u == 59:
                c = VL[3]
            elif (x - y * 2) % 9 == 0:
                c = VL[2]
            elif (y % 22) in (6, 11, 16) and 4 < u < 55 and glyph(x // 2, y // 22 * 3 + (y % 22) // 5, 9010):
                c = hx('#2a2440') if (y % 22) != 16 else VL[3]
            a[y, x] = c
    a[:8] = mix(a[:8], INKB[None, None, :], 0.6)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for nx in (40, 152, 264, 344):
        for y in range(40, 84):
            for x in range(nx - 12, nx + 12):
                arch = y < 52 and math.hypot(x + 0.5 - nx, y + 0.5 - 52) > 12
                if arch:
                    continue
                edge = x in (nx - 12, nx + 11) or y == 83
                a[y, x] = hx('#4c445c') if edge else mix(hx('#a18f85'), hx('#584951'), (y - 40) / 44.0)
        a[56:64, nx - 2:nx + 2] = GOLD
    for y in range(118, H):
        t = (y - 118) / (H - 118)
        for x in range(W):
            u = (x - W / 2) / (1 + t * 1.6)
            gx = int(u + 4000) % 30 == 0
            gy = (y - 118) % max(3, int(5 + t * 12)) == 0
            a[y, x] = VL[3] if (gx or gy) else mix(VL[2], VL[1], 0.4)
    for (lx, ly) in ((96, 60), (288, 60)):
        g = np.clip(1 - np.sqrt(((xx - lx) / 90.0) ** 2 + ((yy - ly - 60) / 110.0) ** 2), 0, 1) ** 1.6
        a = np.clip(a + g[..., None] * AMBER * 0.42, 0, 1)
    return a


def unwritten():
    """F3's stage: white pages over the void: great blank sheets standing at angles in a round, the void deep violet
    between them, a white page floor with faint lilac rules; the brightest stage."""
    a = np.zeros((H, W, 3), np.float32)
    a = void_sky(a, 124)
    rng = [(20, 30, 70, 100, -0.15), (110, 14, 60, 104, 0.08), (196, 22, 64, 98, -0.05), (290, 12, 70, 110, 0.12),
           (-10, 60, 50, 70, 0.2), (350, 50, 50, 80, -0.2)]
    for (x0, y0, w, h, sk) in rng:
        for y in range(y0, min(124, y0 + h)):
            off = int(round((y - y0) * sk))
            for x in range(x0 + off, x0 + off + w):
                if 0 <= x < W:
                    edge = x in (x0 + off, x0 + off + w - 1) or y == y0
                    c = INKB if edge else (CREAM if x < x0 + off + w * 0.6 else CREAM2)
                    if not edge and (y - y0) % 7 == 3 and glyph(x // 2, (y - y0) // 7, 9020 + x0) and (x - x0 - off) > 4:
                        c = FOLD
                    a[y, x] = c
        # the drop shadow onto the void
        for y in range(y0 + 4, min(124, y0 + h + 3)):
            for x in range(x0 + int(round((y - y0) * sk)) + w, x0 + int(round((y - y0) * sk)) + w + 3):
                if 0 <= x < W:
                    a[y, x] = mix(a[y, x], INKB, 0.6)
    for y in range(118, H):
        t = (y - 118) / (H - 118)
        for x in range(W):
            u = (x - W / 2) / (1 + t * 1.4)
            line = (y - 118) % max(4, int(6 + t * 14)) == 0
            seam = int(u + 4000) % 64 == 0
            a[y, x] = BP[1] if (line or seam) else mix(BP[0], CREAM2, 0.25)
    for y in range(118, 124):
        a[y] = mix(a[y], BP[1], 0.5)
    return a


def stair_steps(a):
    """Over a cell 7 sky crop: broad steps of written light climbing to the upper right (amber treads, gold handwriting
    along each, the void showing through a rubbed-out gap), the near steps the battle floor."""
    a = a.copy()
    for k in range(7):
        y0 = 118 - k * 15
        x0 = -40 + k * 40
        w = 280 - k * 24
        for y in range(max(0, y0 - 10), y0 + 1):
            for x in range(max(0, x0), min(W, x0 + w)):
                gap = (k == 4 and x0 + 80 < x < x0 + 140)
                if gap:
                    continue
                v = y0 - y
                c = GOLD if v == 10 else (hx('#8f5533') if v > 3 else (hx('#6e3d2c') if v > 0 else hx('#482826')))
                if v in (6, 7) and glyph(x // 2, k, 9030):
                    c = GOLD if v == 7 else GOLD2
                a[y, x] = c
    for y in range(118, H):
        t = (y - 118) / (H - 118)
        for x in range(W):
            band = (y - 118) // max(4, int(6 + t * 10))
            c = hx('#8f5533') if band % 2 else hx('#6e3d2c')
            if (y - 118) % max(4, int(6 + t * 10)) == 0:
                c = GOLD2
            elif glyph(int((x - W / 2) / (1 + t) + 4000) // 3, band, 9031) and (y - 118) % max(4, int(6 + t * 10)) == 2:
                c = GOLD
            a[y, x] = c
    return a


COMPOSE = {'palimpsest': palimpsest, 'unwritten': unwritten}

RECIPES = {
    'ep8_battle_stair': dict(cell=CELL, zoom=1.9, frameX=0.0, frameY=-0.9, bright=0.92, contrast=1.0, sat=1.0, extras=4,
                             stage=BAND, steps=True, max_pair=0.15, backdropId='ep8_battle_stair', fallback='ep7_battle_road',
                             note='the Stair of Written Light: environments cell 7\'s violet sky and its floating books, '
                                  'steps of gold handwriting composed over it climbing right, one step rubbed out'),
    'ep8_battle_library': dict(cell=CELL, zoom=1.8, frameX=0.85, frameY=0.1, bright=0.95, contrast=1.0, sat=1.0, extras=4,
                               stage=BAND, calm=(112, 0.6, 0.42, 0.12), backdropId='ep8_battle_library',
                               fallback='archive',
                               note='F1 the Catalog of Lost Lives: environments cell 7, a crop on the lit shelves of the '
                                    'right-hand tower; the floor under the band calmed'),
    'ep8_battle_palimpsest': dict(compose='palimpsest', extras=0, max_pair=0.15, stage=BAND,
                                  backdropId='ep8_battle_palimpsest', fallback='archive',
                                  note='F2 the Palimpsest Galleries and the Unnamed Sentry: walls of pages written over '
                                       'pages, lamp niches, two lamp pools on a vellum floor (composed)'),
    'ep8_battle_unwritten': dict(compose='unwritten', extras=0, max_pair=0.15, stage=BAND,
                                 backdropId='ep8_battle_unwritten', fallback='boss',
                                 note='F3 the Unwritten Page: great blank pages standing in the violet void, a white page '
                                      'floor (composed)'),
    'ep8_battle_lastword': dict(cell=CELL, zoom=1.35, frameX=0.0, frameY=-0.35, bright=0.9, contrast=1.0, sat=1.0,
                                extras=4, stage=(118, 0.46), calm=(112, 0.5, 0.36, 0.1), backdropId='ep8_battle_lastword',
                                fallback='boss', grades=True,
                                note='the Eraser: environments cell 7\'s luminous open book over the violet void and its '
                                     'ring of floating books; violet and gold grades; the white-out is a runtime overlay'),
    'ep8_dialog_keyart': dict(cell=CELL, zoom=1.03, frameY=0.0, bright=0.66, contrast=0.92, sat=0.92, extras=4,
                              vignette=0.55, backdropId=None, fallback='ep7_dialog_keyart',
                              note='Episode 8 title cards and the end title: cell 7 darkened, vignette'),
}


def staged(img, by, ba):
    out = img.copy()
    out[by:] = out[by:] * (1 - ba) + hx('#14101e') * ba
    return out


def whiteout_alpha(gold_img):
    """The largest overlay alpha that keeps every pixel's rise under the cap (luma is linear in the lerp)."""
    col = lum(hx(WHITEOUT['color'])[None, None, :])[0, 0]
    rise_full = col - lum(gold_img)
    worst = float(rise_full.max())
    return min(1.0, WHITEOUT['capLuma'] / max(1e-6, worst)) * 0.98, worst


def write(fid, a, rec):
    pal = B.load_palette()
    if rec.get('compose') or rec.get('steps'):
        pal = np.concatenate([pal, np.stack(ep8_extra())], 0)
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
    meta = {'image': fid + '.png', 'w': W, 'h': H, 'cell': rec.get('cell'),
            'note': rec.get('note', ''), 'extraColors': ex, 'colors': int(len(cols)),
            'source': 'composed' if rec.get('compose') else 'environments.webp cell %d' % CELL}
    if rec.get('compose'):
        meta['composed'] = 'tools/art/backdrops/ep8_build.py (%s); palette.json plus the ep8 sheet colours (ep8_kit.EXTRA)' % rec['compose']
    if rec.get('steps'):
        meta['composed'] = 'tools/art/backdrops/ep8_build.py (stair_steps over a cell 7 sky crop)'
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
        vi = staged(img, by, ba)
        gd = staged(gold_tone(img, rows=by), by, ba)
        meta['grades'] = {
            'violet': 'as composed',
            'gold': {'tone': dict(GOLD_TONE), 'rows': [0, int(by)]},
            'how': 'gold: over rows gold.rows the Episode 5 DAY_TONE pixel path (src/data/ep5/scene.js dayTone) with '
                   'gold.tone (the lift and a warm amber cast, warm 0: no violet turn); cross-fade violet to gold over 30 '
                   'frames when the ward breaks (phase 3). Never a screen or multiply over the violet grade.',
            'meanLuma': {'violet': round(float(lum(vi).mean()), 4), 'gold': round(float(lum(gd).mean()), 4)},
            'skyLuma': {'violet': round(float(lum(vi[:100]).mean()), 4), 'gold': round(float(lum(gd[:100]).mean()), 4)},
            'measured': 'phone crop (the 384 x 216 screen scaled by 1.806, nearest: the same mean), band drawn'}
        al, worst = whiteout_alpha(gd)
        peak = gd * (1 - al) + hx(WHITEOUT['color']) * al
        rise = float((lum(peak) - lum(gd)).max())
        step = rise / WHITEOUT['frames']
        meta['whiteout'] = dict(WHITEOUT, alpha=round(al, 4),
                                measured={'maxRiseLuma': round(rise, 4), 'maxStepLuma': round(step, 4),
                                          'over': 'the gold grade, band drawn'})
    with open(os.path.join(DST, fid + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(out, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_3x.png'))
    if rec.get('grades'):
        by = rec['stage'][0]
        g8 = (gold_tone(img, rows=by) * 255 + 0.5).astype(np.uint8)
        Image.fromarray(g8, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_gold_3x.png'))
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
        if rec.get('steps'):
            a = stair_steps(a)
    return write(fid, a, rec)


# ====================================================================== mocks (stand-in foes until E8-sprites lands)
SETUPS = {
    'ep8_stair': ('ep8_battle_stair', ['index_hound', 'paper_crane', 'index_hound'], None),
    'ep8_library': ('ep8_battle_library', ['catalog_wraith', 'gnawing_bookworm', 'catalog_wraith'], None),
    'ep8_palimpsest': ('ep8_battle_palimpsest', ['inkbound_librarian', 'margin_imp'], None),
    'ep8_sentry': ('ep8_battle_palimpsest', ['unnamed_sentry'], None),
    'ep8_unwritten': ('ep8_battle_unwritten', ['struck_page', 'inkbound_librarian', 'struck_page'], None),
    'ep8_lastword': ('ep8_battle_lastword', ['eraser'], None),
    'ep8_lastword_gold': ('ep8_battle_lastword', ['eraser'], 'gold'),
    'ep8_lastword_whiteout': ('ep8_battle_lastword', ['eraser'], 'whiteout'),
}
STAND_IN = {'index_hound': 'rime_wolf', 'paper_crane': 'snow_wisp', 'catalog_wraith': 'frostbound_revenant',
            'gnawing_bookworm': 'crystal_crawler', 'inkbound_librarian': 'ice_knight', 'margin_imp': 'snow_wisp',
            'unnamed_sentry': 'pale_lantern', 'struck_page': 'rimed_page', 'eraser': 'white_phantom'}


class Foes8(Foes):
    def __init__(self):
        Foes.__init__(self)
        self.at = [a for a in (self._atlas('ep8_enemies_battle'), self._atlas('ep8_bosses_battle'),
                               self._atlas('ep7_enemies_battle'), self._atlas('ep7_bosses_battle'),
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
    if grade in ('gold', 'whiteout'):
        a = gold_tone(a, rows=by)
    a[by:] = a[by:] * (1 - ba) + hx('#14101e') * ba
    if grade == 'whiteout':
        al = meta['whiteout']['alpha']
        a = a * (1 - al) + hx(WHITEOUT['color']) * al
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
    canvas.alpha_composite(box)
    canvas.convert('RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, 'mock_stage_%s_3x.png' % setup))
    return stats


def mocks():
    foes = Foes8()
    res = {'how': 'stand-in foes from the ep7 and ep6 atlases until E8-sprites lands (stand_in names the sprite used); '
                  'distinct_px = share of the body more than 0.12 (OKLab) from the ring round it; aim >= 0.6',
           'setups': {}}
    for setup in SETUPS:
        res['setups'][setup] = render_stage(setup, foes)
    with open(os.path.join(OUT, 'ep8_stage_check.json'), 'w', encoding='utf-8', newline='\n') as f:
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
