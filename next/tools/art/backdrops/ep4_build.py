"""Episode 4 battle stages and key art (E4-tiles, EPISODE4_PLAN 9.3) -> assets/backdrops/ep4_<id>.png + .json.

    python ep4_build.py                 # the recipes not replaced by a painting (PAINTED)
    python ep4_build.py ep4_battle_keep # one
    python ep4_build.py --mock          # also the 3x stage mocks with real sprites (out/mock_stage_ep4_*_3x.png)

The recipes live here, not in build.py's table (plan 11.1): build.py is imported read-only for its cell cut, grade and
palette quantizer. Source art: environments.webp cell 3 (Valewyn: a flooded royal keep, arches with blue banners, the
crowned statue over turquoise water) only; cells 4 to 7 are held for later episodes. The Flood Road has no painting,
so it is composed here (rain over drowned fields, hedgerows, a drowned farm roof, the far Keep), the compose_valley /
compose_ash_road approach. Every file is a lossless indexed PNG (the E3 size rule). The json carries {bandY, bandAlpha}
(the battle scene draws its indigo band itself), backdropId (the BACKDROPS key the zone data names) and fallback.
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build as B
import compose_valley as V
from compose_valley import W, H, HORIZON, hx, mix, Layer, smooth_profile

DST, OUT = B.DST, B.OUT
CELL = 3
# Runway paintings since 2026-11-05 (quantize_still.py, sources in reports/lexicon_quest_ep4/art_source of the PKA repo):
# a bare run must not overwrite them; name one to rebuild its old recipe on purpose
PAINTED = {'ep4_battle_flood_road', 'ep4_battle_keep', 'ep4_battle_archive_deep', 'ep4_battle_witness', 'ep4_battle_throne'}

# file id -> recipe (build.py keys) + backdropId (the BACKDROPS key in src/data/ep4/encounters.js) + fallback
RECIPES = {
    'ep4_battle_flood_road': dict(compose=True, extras=2, max_pair=0.15, stage=(118, 0.44), backdropId='ep4_flood_road',
                                  fallback='valley',
                                  note='the Flood Road: rain over drowned fields, hedgerows, a drowned farm roof, the far '
                                       'Keep on the horizon (composed)'),
    'ep4_battle_keep': dict(cell=CELL, zoom=1.0, frameY=0.0, bright=0.8, contrast=0.95, sat=0.9, extras=4,
                            tint=('#3a9aa6', 0.16), stage=(118, 0.42), backdropId='ep4_keep', fallback='archive',
                            note='the Sunken Keep F1 (and F3 until ep4_witness is registered): cell 3, brightness 0.8, '
                                 'cool teal grade'),
    'ep4_battle_archive_deep': dict(cell=CELL, zoom=1.12, frameX=-0.6, frameY=0.2, bright=0.55, contrast=1.0, sat=0.95,
                                    extras=4, tint=('#1a6f7a', 0.34), vignette=0.25, stage=(118, 0.46),
                                    backdropId='ep4_archive_deep', fallback='archive_deep',
                                    note='Archives Below Water and the Inkbound Barrister: cell 3 on the arcade, '
                                         'brightness 0.55, deep green-blue grade'),
    'ep4_battle_witness': dict(cell=CELL, zoom=1.4, frameX=-0.85, frameY=-0.2, bright=0.72, contrast=0.92, sat=0.7,
                               extras=4, tint=('#d8d4e4', 0.16), stage=(118, 0.44), backdropId='ep4_witness',
                               fallback='archive',
                               note='the Court of Witnesses: cell 3, a tighter crop on the arches and banners, '
                                    'pale marble grade'),
    'ep4_battle_throne': dict(cell=CELL, zoom=1.85, frameX=0.22, frameY=-0.45, bright=0.74, contrast=1.05, sat=1.0,
                              extras=4, tint=('#eba14d', 0.16), vignette=0.34, stage=(118, 0.48),
                              backdropId='ep4_throne', fallback='boss',
                              note='the Paper Regent: a tight crop on the crowned statue, a gold rim'),
    'ep4_dialog_keyart': dict(cell=CELL, zoom=1.0, frameY=0.0, bright=0.62, contrast=0.9, sat=0.85, extras=4,
                              vignette=0.55, backdropId=None, fallback='dialog_keyart_ep3',
                              note='Episode 4 title cards and CREDITS_EP4: cell 3 darkened, vignette'),
}


# ====================================================================== the Flood Road, composed
def flood_road():
    """A wet grey morning on the Flood Road: rain cloud heaped in soft banks, the far city (the crowned statue, the
    Keep's spires) as a cool silhouette on the horizon over a bright sheet of flood water, drowned hedgerows with
    round trees along them running into the water, a farm roof and a fence half under, flooded grass in front, rain."""
    import math
    base = np.zeros((H, W, 3), np.float32)
    P = dict(sky=[(0, hx('#4c445c')), (0.35, hx('#66637f')), (0.7, hx('#8e8997')), (1.0, hx('#b3b6c4'))],
             cloud_lit=hx('#b3b6c4'), cloud_body=hx('#8e8997'), cloud_shade=hx('#66637f'), cloud_dark=hx('#4c445c'))
    V.draw_sky(base, P, blend=0.35)
    L = Layer()
    for i, (cx, cy, w, h) in enumerate([(50, 22, 96, 15), (170, 14, 80, 12), (292, 24, 110, 16), (372, 12, 50, 10),
                                        (110, 52, 70, 9), (228, 48, 60, 8), (330, 58, 70, 8), (20, 64, 46, 6)]):
        V.cloud(L, P, cx, cy, w, h, seed=4400 + i, flat=0.6)
    base = L.composite_onto(base, hx('#8e8997'), 0.15)
    # the far city on the horizon: statue on the left, the Keep with spires to the right, all one cool tone
    L = Layer()
    by = HORIZON - 2
    far, far_lit = hx('#66637f'), hx('#8e8997')
    for x in range(232, 336):
        top = by - 10 - int(3 * math.sin((x - 232) * 0.2))
        if 258 <= x <= 312:
            top = by - 20 - (4 if 272 <= x <= 298 else 0)
        for y in range(top, by + 1):
            L.put(x, y, far_lit if (x - 232) % 9 == 0 else far)
    for (tx, h, hw) in ((268, 38, 2), (284, 48, 3), (300, 38, 2), (250, 26, 1), (324, 24, 1)):
        for k in range(h):
            w = min(hw, k // 4)
            for x in range(tx - w, tx + w + 1):
                L.put(x, by - h + k, far_lit if x < tx else far)
    # the statue on its drum, catching the light
    for y in range(by - 10, by + 1):
        for x in range(206, 222):
            L.put(x, y, far)
    for y in range(by - 30, by - 10):
        half = 2 + (y - (by - 30)) * 0.2
        for x in range(int(214 - half), int(214 + half) + 1):
            L.put(x, y, hx('#b3b6c4') if x < 214 else far_lit)
    for x in range(212, 217):
        L.put(x, by - 33, hx('#b3b6c4'))
        L.put(x, by - 32, hx('#b3b6c4'))
    L.put(212, by - 35, hx('#eba14d')); L.put(214, by - 36, hx('#f9d77a')); L.put(216, by - 35, hx('#eba14d'))
    base = L.composite_onto(base, hx('#b3b6c4'), 0.25)
    # the flood: a bright sheet across the middle distance, reflections of the sky and the city
    top_w = HORIZON - 2
    for y in range(top_w, HORIZON + 26):
        f = (y - top_w) / 28.0
        for x in range(W):
            c = mix(hx('#b3b6c4'), hx('#8e8997'), f)
            if (x * 3 + y * 7) % 17 == 0:
                c = hx('#e2e0de')
            if 232 <= x <= 336 and (y - top_w) < 12 and y % 2 == 0:
                c = mix(c, far, 0.6)
            if 210 <= x <= 218 and (y - top_w) < 16 and y % 2 == 0:
                c = hx('#e2e0de')
            base[y, x] = mix(c, hx('#317aa1'), 0.22 + f * 0.2)
    # drowned hedgerows: three lines receding, round trees on them, each line breaking into the water
    hedges = [(HORIZON + 6, 0.55, 40, 290), (HORIZON + 14, 0.4, -10, 230), (HORIZON + 24, 0.2, 120, 400)]
    for i, (hy, haze, x0, x1) in enumerate(hedges):
        L = Layer()
        prof = smooth_profile(4500 + i, W, cells=(30, 10), amp=(1.0, 0.4))
        dark, mid, lit = hx('#1c3730'), hx('#285743'), hx('#397951')
        for x in range(max(0, x0), min(W, x1)):
            y = int(hy + prof[x] * 1.2)
            th = 2 + i
            for yy in range(y - th, y + 1):
                L.put(x, yy, lit if yy == y - th else (mid if yy < y else dark))
        for k in range(4 + i * 2):
            tx = x0 + 14 + (V.h32(4510 + i, k) % max(1, (x1 - x0 - 28)))
            if not (0 <= tx < W):
                continue
            r = 3 + i + V.h32(4520 + i, k) % (2 + i)
            ty = int(hy + prof[min(W - 1, tx)] * 1.2) - th - r + 2
            for yy in range(ty - r, ty + r + 1):
                for xx in range(tx - r - 1, tx + r + 2):
                    if math.hypot((xx - tx) / (r + 1.0), (yy - ty) / float(r)) <= 1.0:
                        c = lit if (xx < tx and yy < ty) else (mid if yy < ty + r // 2 else dark)
                        L.put(xx, yy, c)
            for yy in range(ty + r, ty + r + 3):
                L.put(tx, yy, hx('#2d1b1f'))
        base = L.composite_onto(base, hx('#8e8997'), haze)
        # the hedge's reflection in the flood
        for x in range(max(0, x0), min(W, x1)):
            y = int(hy + prof[x] * 1.2) + 1
            if y + 1 < H and (x + i) % 2 == 0:
                base[y + 1, x] = mix(base[y + 1, x], dark, 0.45)
    # a drowned farm roof and a fence running into the water
    for y in range(HORIZON + 10, HORIZON + 21):
        half = (y - (HORIZON + 10)) * 1.5 + 1
        for x in range(int(150 - half), int(150 + half) + 1):
            c = hx('#87332e') if ((x // 3) + y) % 2 else hx('#571f28')
            if x > 150:
                c = mix(c, hx('#2d1b1f'), 0.3)
            base[y, x] = c
    for x in range(132, 170):
        base[HORIZON + 21, x] = hx('#e2e0de') if x % 3 else hx('#b3b6c4')
    for k in range(9):
        fx = 40 + k * 12
        fy = HORIZON + 30 - k // 3
        for y in range(fy - 6, fy + 1):
            base[y, fx] = hx('#6e3d2c')
        for x in range(fx, fx + 12):
            if k < 8:
                base[fy - 4, x] = hx('#8f5533')
        base[fy + 1, fx] = hx('#e2e0de')
    # the near bank: flooded grass darkening toward the front (ordered dither), flat pools reflecting the sky
    pools = [(40, 140, 34, 4), (150, 160, 46, 5), (300, 136, 40, 4), (230, 190, 60, 7), (70, 200, 50, 6),
             (350, 176, 36, 5), (120, 124, 22, 2), (250, 128, 26, 3)]
    for y in range(HORIZON + 26, H):
        f = (y - HORIZON - 26) / max(1, H - HORIZON - 26)
        for x in range(W):
            n = V.h32(x // 2, y // 2, 4601) % 13
            dark = ((x * 5 + y * 3) % 8) / 8.0 < f * 1.2 - 0.2
            c = (hx('#285743') if n else hx('#397951')) if dark else (hx('#397951') if n else hx('#4f9e6e'))
            if y == HORIZON + 26:
                c = hx('#285743')
            base[y, x] = c
    for (px, py, rx, ry) in pools:
        for y in range(py - ry, py + ry + 1):
            for x in range(px - rx, px + rx + 1):
                if not (0 <= x < W and 0 <= y < H):
                    continue
                d = ((x - px) / float(rx)) ** 2 + ((y - py) / float(ry)) ** 2
                if d > 1.0:
                    continue
                c = mix(hx('#8e8997'), hx('#317aa1'), 0.3)
                if y < py - ry * 0.4:
                    c = mix(hx('#66637f'), hx('#1a6f7a'), 0.4)
                if (x * 3 + y) % 11 == 0:
                    c = hx('#b3b6c4')
                if d > 0.82 and y < py:
                    c = hx('#1c3730')
                base[y, x] = c
    for k in range(40):
        rx = V.h32(4650, k) % W
        ry = HORIZON + 30 + V.h32(4651, k) % 20
        for j in range(3 + k % 3):
            if ry - j >= 0:
                base[ry - j, rx] = hx('#4f9e6e') if j else hx('#285743')
    # rain: slanted streaks, sparse, brighter against the dark
    for i in range(260):
        x0 = V.h32(4701, i) % W
        y0 = V.h32(4702, i) % H
        for k in range(5):
            x, y = x0 - k // 2, y0 + k
            if 0 <= x < W and 0 <= y < H:
                base[y, x] = mix(base[y, x], hx('#e2e0de'), 0.4)
    return np.clip(base, 0, 1)


# ====================================================================== write
def write(fid, a, rec, extras):
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
            'extraColors': ex, 'colors': int(len(cols))}
    if rec.get('compose'):
        meta['composed'] = 'tools/art/backdrops/ep4_build.py (flood_road)'
    if rec.get('stage'):
        meta['bandY'] = int(rec['stage'][0])
        meta['bandAlpha'] = float(rec['stage'][1])
        meta['bandNote'] = 'not baked: the battle scene fills rows bandY..216 with indigo #14101e at bandAlpha under the sprites'
    if rec.get('backdropId'):
        meta['backdropId'] = rec['backdropId']
    meta['fallback'] = rec.get('fallback')
    with open(os.path.join(DST, fid + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(out, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fid + '_3x.png'))
    Image.fromarray(out, 'RGB').save(os.path.join(OUT, fid + '_x1.png'))
    print('%-26s colours %3d  extras %-40s %6d bytes' % (fid, len(cols), ex or '-', os.path.getsize(os.path.join(DST, fid + '.png'))))
    return meta


def build_one(fid):
    rec = RECIPES[fid]
    if rec.get('compose'):
        a = flood_road()
    else:
        im = B.cell_window(rec['cell'], rec.get('zoom', 1.0), rec.get('frameY', 0.0), rec.get('frameX', 0.0))
        a = B.downscale(im)
        a = B.unsharp(a, 0.55, 1.0)
        a = B.grade(a, rec)
    return write(fid, a, rec, rec.get('extras', 0))


def mocks():
    import mock_stage as M
    M.SETUPS.update({
        'ep4_flood_road': ('ep4_battle_flood_road', ['briar_wolf', 'moss_scarab', 'ink_slime'], 0.0),
        'ep4_keep': ('ep4_battle_keep', ['ink_slime', 'page_wraith', 'tome_golem'], 0.0),
        'ep4_archive_deep': ('ep4_battle_archive_deep', ['ink_wraith', 'tome_golem', 'page_wraith'], 0.0),
        'ep4_witness': ('ep4_battle_witness', ['page_wraith', 'tome_golem', 'bookmite'], 0.0),
        'ep4_throne': ('ep4_battle_throne', ['archivore'], 0.0),
    })
    spr = M.Sprites(os.path.join(M.NEXT, 'assets', 'sprites'))
    os.makedirs(M.OUT, exist_ok=True)
    for n in ('ep4_flood_road', 'ep4_keep', 'ep4_archive_deep', 'ep4_witness', 'ep4_throne'):
        M.render(n, spr)


def main(argv):
    want = [a for a in argv[1:] if not a.startswith('-')] or [f for f in RECIPES if f not in PAINTED]
    for fid in want:
        build_one(fid)
    if '--mock' in argv:
        mocks()


if __name__ == '__main__':
    main(sys.argv)
