"""battle_east_road (E2-tiles, EPISODE2_PLAN 9.3): the Fading Road at dusk, composed like compose_valley.py.

A misty lowland under a silver-violet dusk: a pale moon, soft violet cloud bands, low hazed ridges, the still
mere across the middle distance mirroring the sky, the Court of Mirrors a far glint of glass on its far shore,
a line of silver birches along the water, bands of ground mist over the meadow, the dirt road fading into the
mist, and two big silver birches (the tile kit's tree_birch_silver) framing the stage. The floor below the
band is the terrain's own grass fill, graded to dusk. Returns float RGB (H, W, 3) for build.py to quantize.
"""
import json, os
import numpy as np
from PIL import Image
import compose_valley as V
from compose_valley import W, H, HORIZON, BAND_Y, hx, C, mix, Layer, smooth_profile, ellipse_mask, poly_mask

NEXT = V.NEXT


def palette():
    return dict(
        sky=[(0, C('ink', 2)), (0.30, C('ink', 3)), (0.56, C('ink', 4)), (0.76, hx('#9062c3')),
             (0.90, hx('#bc94e2')), (1.0, hx('#e2e0de'))],
        cloud_lit=hx('#bc94e2'), cloud_body=hx('#9062c3'), cloud_shade=hx('#7162bd'), cloud_dark=hx('#522a84'),
        haze=mix(hx('#bc94e2'), hx('#e2e0de'), 0.35),
        tree_haze=hx('#7162bd'),
        ridge_far=mix(hx('#522a84'), hx('#7162bd'), 0.55), ridge_near=hx('#3f4186'),
        tree_far=hx('#1a1334'), tree_far_lit=hx('#36195a'),
        land_mul=np.array([0.62, 0.58, 0.74], np.float32), land_add=np.array([0.02, 0.01, 0.07], np.float32),
        warm=hx('#bc94e2'),
    )


def wisp(layer, P, cx, cy, w, h, seed):
    """A thin dusk cloud streak: a flat band tapering at both ends, its top edge lit by the low sun, its
    underside a shade darker, a ragged end or two."""
    prof = smooth_profile(seed, int(w) + 2, cells=(24, 8), amp=(1.0, 0.5))
    for i in range(int(w)):
        t = i / max(1, w - 1)
        th = h * (1 - abs(2 * t - 1) ** 2.2) + prof[i] * 0.9
        if th < 0.6:
            continue
        x = int(cx - w / 2 + i)
        yc = cy + prof[(i + 7) % len(prof)] * 1.2
        y0, y1 = int(round(yc - th)), int(round(yc + th * 0.6))
        for y in range(y0, y1 + 1):
            c = P['cloud_body']
            if y == y0:
                c = P['cloud_lit']
            elif y == y1 and y1 > y0 + 1:
                c = P['cloud_shade']
            layer.put(x, y, c)


def draw_moon(base):
    cx, cy, r = 300, 34, 8
    for y in range(cy - 22, cy + 23):
        for x in range(cx - 22, cx + 23):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d < r:
                base[y, x] = hx('#f6f4ee') if d < r - 1.5 or (x - cx) + (y - cy) < 0 else hx('#e2e0de')
                if 2 < d < 5 and (x * 3 + y) % 7 == 0:
                    base[y, x] = hx('#e2e0de')
            elif d < r + 12:
                k = (1 - (d - r) / 12) ** 2 * 0.45
                base[y, x] = mix(base[y, x], hx('#e2e0de'), k)
    return base


MERE_TOP, MERE_BOT = HORIZON - 5, HORIZON + 13


def draw_mere(base, P):
    """The still mere: a band from x 120 to the right edge with a soft far shore, mirroring the sky in long
    horizontal silver streaks, the Court's reflection a vertical glint."""
    prof = smooth_profile(77, W, cells=(64, 24), amp=(1.0, 0.4))
    left = 128
    for x in range(W):
        t0 = MERE_TOP + int(prof[x] * 1.5)
        b0 = MERE_BOT + int(prof[(x + 90) % W] * 2.0)
        if x < left:
            # the near shore curls in from the left, tapering
            k = (left - x) / 60.0
            t0 += int(k * 6)
            b0 -= int(k * 4)
        if b0 <= t0:
            continue
        for y in range(t0, b0 + 1):
            f = (y - t0) / max(1, b0 - t0)
            c = mix(hx('#3f4186'), hx('#292657'), f * 0.8)
            if (y * 7 + x // 11) % 6 == 0 and f < 0.85:
                c = mix(c, hx('#bc94e2'), 0.55)
            if (y * 5 + x // 23) % 11 == 0 and f < 0.5:
                c = hx('#e2e0de')
            base[y, x] = c
        base[t0, x] = hx('#1a1334')
        base[t0 + 1, x] = mix(hx('#7162bd'), hx('#3f4186'), 0.5)
        base[b0, x] = hx('#e2e0de') if x % 3 else hx('#bc94e2')
        if b0 + 1 < H:
            base[b0 + 1, x] = mix(base[b0 + 1, x], hx('#1c3730'), 0.6)
    # moon path on the water
    for y in range(MERE_TOP + 3, MERE_BOT - 1):
        half = 2 + (y - MERE_TOP) * 0.35
        for x in range(int(300 - half), int(300 + half) + 1):
            if (y % 2 == 0) and (x + y // 2) % 3:
                base[y, x] = hx('#e2e0de') if abs(x - 300) < half * 0.5 else hx('#bc94e2')
    return base


def draw_court(base):
    """The Court of Mirrors on the far shore: a tiny cluster of glass towers, one white glint."""
    x0, by = 226, MERE_TOP + 1
    towers = [(0, 9, 2), (3, 15, 3), (7, 11, 2), (10, 19, 3), (14, 8, 2), (17, 12, 2), (20, 6, 2)]
    for (dx, h, w) in towers:
        for y in range(by - h, by):
            for x in range(x0 + dx, x0 + dx + w):
                c = hx('#3f4186')
                if x == x0 + dx and y < by - 2:
                    c = hx('#6ab3e4') if (y % 3) else hx('#b4e4f2')
                if y == by - h:
                    c = hx('#b4e4f2')
                base[y, x] = c
    base[by - 19, x0 + 10] = hx('#f6f4ee')
    base[by - 18, x0 + 11] = hx('#e8fffb')
    for y in range(MERE_TOP + 3, MERE_BOT - 4):
        if y % 2:
            base[y, x0 + 11] = hx('#b4e4f2')
            base[y, x0 + 4] = hx('#6ab3e4') if y % 4 == 1 else base[y, x0 + 4]
    return base


def draw_birch_line(base, P):
    """Silver birches along the water: thin pale trunks with dark-marked bark and soft canopy clumps."""
    L = Layer()
    x = 6
    i = 0
    while x < W:
        if 118 < x < 360 and i % 2 == 0:
            x += 11
            i += 1
            continue
        if 214 < x < 252:
            x = 252
        on_shore = x >= 118
        h = (9 + V.h32(501, i) % 7) if on_shore else (14 + V.h32(501, i) % 12)
        by = (MERE_TOP + 1) if on_shore else (HORIZON + 2 + V.h32(502, i) % 3)
        canopy = mix(hx('#1c3730'), hx('#36195a'), 0.5)
        lit = mix(hx('#397951'), hx('#7162bd'), 0.5)
        for y in range(by - h, by - 4):
            for dx in range(-3, 4):
                d = abs(dx) + abs(y - (by - h + 5)) * 0.35
                if d < 3.2 + (y - (by - h)) * 0.05 and V.h32(503, i, y, dx) % 5:
                    L.put(x + dx, y, lit if dx < 0 and y < by - h + 7 else canopy)
        for y in range(by - h + 3, by + 1):
            L.put(x, y, hx('#e2e0de') if y % 4 else hx('#251d34'))
        x += 7 + V.h32(504, i) % 9
        i += 1
    return L.composite_onto(base, P['tree_haze'], 0.30)


def draw_road(base):
    """A dirt road from the bottom left winding toward the mere, swallowed by the mist."""
    pts_l = [(0, BAND_Y + 30), (40, BAND_Y + 6), (86, HORIZON + 14), (118, HORIZON + 6)]
    pts_r = [(118, HORIZON + 6), (100, HORIZON + 14), (66, BAND_Y + 6), (36, BAND_Y + 30)]
    m = poly_mask(pts_l + pts_r)
    m[:HORIZON + 4] = False
    m[BAND_Y - 2:] = False
    path = [hx('#896042'), hx('#ae8458'), hx('#c3a57c')]
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        t = (y - HORIZON) / (BAND_Y - HORIZON)
        c = path[1] if (x + y) % 5 else path[0]
        if (x * 7 + y * 3) % 23 == 0:
            c = path[2]
        base[y, x] = c
    return base


def draw_mist(base, P):
    """Ground mist: soft pale bands over the meadow, densest at the water, dithered at their edges."""
    bands = [(HORIZON + 6, 4, 0.55, 0), (HORIZON + 13, 3, 0.40, 37), (HORIZON + 20, 4, 0.30, 71),
             (BAND_Y - 6, 3, 0.18, 113)]
    mist = hx('#e2e0de')
    for (cy, half, k, seed) in bands:
        prof = smooth_profile(600 + seed, W, cells=(96, 32), amp=(1.0, 0.6))
        for x in range(W):
            c = cy + prof[x] * 3
            amp = k * (0.55 + 0.45 * (prof[(x + 50) % W] + 1) / 2)
            for y in range(int(c - half - 2), int(c + half + 3)):
                if not (0 <= y < BAND_Y):
                    continue
                d = abs(y - c) / (half + 2)
                if d >= 1:
                    continue
                a = amp * (1 - d * d)
                base[y, x] = base[y, x] * (1 - a) + mist * a
    return base


def load_birch():
    with open(os.path.join(NEXT, 'assets', 'tiles', 'tiles.json'), encoding='utf-8') as f:
        m = json.load(f)['objects']['tree_birch_silver']
    img = Image.open(os.path.join(NEXT, 'assets', 'tiles', m['sheet'])).convert('RGBA')
    x, y, w, h = m['rect']
    return np.asarray(img.crop((x, y, x + w, y + h))).astype(np.float32) / 255.0


def compose(mode='east_road'):
    P = palette()
    base = np.zeros((H, W, 3), np.float32)
    V.draw_sky(base, P)
    base = draw_moon(base)
    clouds = Layer()
    for i, (cx, cy, w, h) in enumerate([(70, 22, 130, 3), (200, 13, 96, 2), (128, 44, 160, 3), (262, 56, 120, 2),
                                        (40, 64, 90, 2), (344, 70, 76, 2), (176, 77, 100, 1)]):
        wisp(clouds, P, cx, cy, w, h, 700 + i)
    ys = np.arange(H, dtype=np.float32)
    kcl = np.clip((ys - 30) / 50.0, 0, 1)[:, None] * 0.5
    base = clouds.composite_onto(base, P['haze'], np.broadcast_to(kcl, (H, W)))
    base = V.draw_ridges(base, P, None)
    base = V.draw_meadow(base, P, None, None, fog=0.6)
    base = draw_mere(base, P)
    base = draw_court(base)
    base = draw_birch_line(base, P)
    base = draw_road(base)
    # dusk grade on the land (below the far ridge), the mere and sky keep their own colours
    land = np.zeros((H, W), bool)
    land[MERE_BOT + 2:] = True
    rgb = base[land]
    lum = rgb.mean(-1, keepdims=True)
    base[land] = np.clip(rgb * P['land_mul'] + P['land_add'] + np.clip(lum - 0.55, 0, 1) * P['warm'] * 0.3, 0, 1)
    base = draw_mist(base, P)
    # framing birches (the tile kit's own tree), feet on the stage floor
    birch = load_birch()
    L = Layer()
    V.blit_rgba(L, birch, -34, 150 - birch.shape[0] + 4)
    V.blit_rgba(L, birch[:, ::-1], W - 52, 146 - birch.shape[0] + 4)
    tree = L.composite_onto(np.zeros_like(base), None, 0)
    a = L.a[..., None]
    shade = L.rgb * P['land_mul'] * 1.05 + P['land_add']
    base = base * (1 - a) + np.clip(shade, 0, 1) * a
    return np.clip(base, 0, 1)


if __name__ == '__main__':
    a = compose()
    im = Image.fromarray((a * 255 + 0.5).astype(np.uint8), 'RGB')
    os.makedirs(os.path.join(V.HERE, 'out'), exist_ok=True)
    im.resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(V.HERE, 'out', '_east_road_3x.png'))
    print('wrote out/_east_road_3x.png')
