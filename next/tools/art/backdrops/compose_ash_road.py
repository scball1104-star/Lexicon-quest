"""battle_ash_road (E3-tiles, EPISODE3_PLAN 9.3): the Old Sand Road under Emberpeak, composed like compose_valley.py.

A smoky dusk: a sky from indigo to a burnt orange, thick ash cloud bands lit from below, the Emberpeak massif on
the horizon with a molten glow and thin slag falls running down it, two rows of grey ash hills, charred pines
(bare black trunks, a few lit twigs), the carters' dirt road climbing away in the ash, embers drifting. The stage
floor below the band is ash ground (cool grey with warm specks). Returns float RGB (H, W, 3) for build.py.
"""
import numpy as np
from PIL import Image
import compose_valley as V
from compose_valley import W, H, HORIZON, BAND_Y, hx, C, mix, Layer, smooth_profile, poly_mask

BASE_Y = HORIZON + 4


def palette():
    return dict(
        sky=[(0, hx('#14101e')), (0.22, hx('#1a1334')), (0.46, hx('#36195a')), (0.66, hx('#571f28')),
             (0.82, hx('#b34532')), (0.93, hx('#e06b39')), (1.0, hx('#eba14d'))],
        haze=mix(hx('#b34532'), hx('#e06b39'), 0.4),
    )


def ash_clouds(base):
    """Heavy cloud bands: dark undersides catching the glow of the mountain below them."""
    L = Layer()
    for i, (cx, cy, w, h) in enumerate([(70, 20, 150, 7), (230, 14, 130, 6), (340, 30, 110, 7), (140, 42, 170, 7),
                                        (300, 56, 140, 6), (36, 62, 100, 5), (190, 70, 140, 5)]):
        prof = smooth_profile(900 + i, int(w) + 2, cells=(30, 10), amp=(1.0, 0.5))
        for k in range(int(w)):
            t = k / max(1, w - 1)
            th = h * (1 - abs(2 * t - 1) ** 1.8) + prof[k] * 1.4
            if th < 0.8:
                continue
            x = int(cx - w / 2 + k)
            y0, y1 = int(cy - th), int(cy + th * 0.7)
            for y in range(y0, y1 + 1):
                f = (y - y0) / max(1, y1 - y0)
                low = (cy / 80.0)
                if f < 0.25:
                    c = hx('#36195a') if low < 0.6 else hx('#571f28')
                elif f < 0.75:
                    c = hx('#522a84') if low < 0.45 else hx('#87332e')
                else:
                    c = hx('#b34532') if low > 0.5 else hx('#7040aa')
                if y == y1 and low > 0.55:
                    c = hx('#e06b39')
                L.put(x, y, c)
    return L.composite_onto(base, hx('#571f28'), 0.18)


def mountain(base):
    """Emberpeak: a dark massif with a molten crown, lit west faces, slag falls and the town's windows high up."""
    L = Layer()
    peaks = [(262, 170, 78), (318, 120, 52), (205, 110, 40), (352, 90, 36), (150, 90, 24), (60, 90, 18)]
    prof = smooth_profile(17, W, cells=(20, 8), amp=(1.0, 0.45))
    tops = np.zeros(W, np.float32)
    for x in range(W):
        y = float(BASE_Y)
        for (cx, hw, h) in peaks:
            u = abs(x - cx) / hw
            if u < 1:
                y = min(y, BASE_Y - h * (1 - u ** 0.9))
        tops[x] = y + prof[x] * 2.2
    for x in range(W):
        top = int(round(tops[x]))
        slope = tops[min(W - 1, x + 2)] - tops[max(0, x - 2)]       # >0: descending to the right (a lit face)
        for y in range(top, BASE_Y + 1):
            f = (y - top) / max(1, BASE_Y - top)
            n = V.h32(x // 2, y // 2, 19) % 11
            c = hx('#2e2b4c') if (f < 0.5 and slope > 0.4) else hx('#251d34')
            if n == 0:
                c = hx('#4c445c') if f < 0.6 else hx('#2e2b4c')
            if f > 0.85 and n < 3:
                c = hx('#571f28')
            if y == top:
                c = hx('#e06b39') if x % 3 else hx('#eba14d')
            elif y == top + 1:
                c = hx('#b34532')
            L.put(x, y, c)
    # slag falls: molten threads from just under the crown down the crags
    for i, fx in enumerate((236, 252, 270, 288, 306, 330, 212)):
        top = int(tops[fx]) + 6 + (i * 5) % 9
        ln = 22 + (V.h32(77, i) % 22)
        for y in range(top, min(BASE_Y, top + ln)):
            xx = fx + int(round(np.sin(y * 0.3 + i * 2) * 1.2))
            c = hx('#f9d77a') if (y + i) % 6 == 0 else (hx('#eba14d') if y % 2 else hx('#e06b39'))
            L.put(xx, y, c)
            L.put(xx + 1, y, hx('#b34532'))
    # the town's windows clinging to the mountain
    for k in range(14):
        wx = 224 + (V.h32(81, k) % 100)
        wy = int(tops[wx]) + 12 + V.h32(82, k) % 22
        if wy < BASE_Y - 2:
            L.put(wx, wy, hx('#f9d77a'))
            L.put(wx, wy + 1, hx('#e06b39'))
    base = L.composite_onto(base, hx('#571f28'), 0.18)
    ys, xs = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xs - 262) / 130.0) ** 2 + ((ys - 60) / 50.0) ** 2)
    k = np.clip(1 - d, 0, 1) ** 2 * 0.40
    base = base * (1 - k[..., None]) + hx('#e06b39') * k[..., None]
    return base


def ash_hills(base):
    """Two rows of grey-brown hills, hazed with the sky's red."""
    for row, (by, domes, col, crest, k, seed) in enumerate((
            (HORIZON + 2, [(30, 90, 14), (140, 100, 10), (260, 80, 12), (350, 90, 15)], hx('#4c445c'), hx('#7e6d6e'), 0.38, 21),
            (HORIZON + 8, [(80, 90, 9), (200, 70, 6), (310, 100, 10)], hx('#2e2b4c'), hx('#584951'), 0.22, 22))):
        L = Layer()
        prof = smooth_profile(seed, W, cells=(36, 14), amp=(1.0, 0.5))
        for x in range(W):
            top = int(round(V.hill_top(domes, by, x) + prof[x] * 1.4))
            for y in range(top, by + 4):
                L.put(x, y, crest if y == top else col)
        base = L.composite_onto(base, hx('#b34532'), k)
    return base


def ground(base):
    """Ash ground below the hills: cool grey with warm specks, graded darker toward the front."""
    for y in range(HORIZON + 8, H):
        f = (y - (HORIZON + 8)) / (H - HORIZON - 8)
        for x in range(W):
            n = V.h32(x // 2, y // 2, 41) % 17
            c = mix(hx('#584951'), hx('#4c445c'), min(1.0, f * 1.3))
            if n == 0 and (x + y) % 3 == 0:
                c = hx('#7e6d6e')
            elif n == 1 and (x + y) % 4 == 0:
                c = hx('#2e2b4c')
            elif n == 2 and f > 0.2 and (x * y) % 7 == 0:
                c = hx('#87332e')
            if f < 0.25:
                c = mix(c, hx('#b34532'), (0.25 - f) * 0.9)
            base[y, x] = c
    return base


def road(base):
    """The carters' road: a sand-and-ash track that bends away toward the mountain (perspective, S curve)."""
    path = [hx('#584951'), hx('#7e6d6e'), hx('#a18f85')]
    for y in range(HORIZON + 6, H):
        f = (y - HORIZON - 6) / (H - HORIZON - 6)
        cx = 205 - 70 * f ** 1.2 + 26 * np.sin(f * 3.1) * (1 - f * 0.4)
        half = 3 + 56 * f ** 1.4
        for x in range(int(cx - half), int(cx + half) + 1):
            if not (0 <= x < W):
                continue
            u = abs(x - cx) / max(half, 1)
            n = V.h32(x, y // 2, 91) % 9
            c = path[1] if n > 1 else path[0]
            if n == 8 and u < 0.8:
                c = path[2]
            if u > 0.82:
                c = path[0]
            if abs(abs(x - cx) - half * 0.45) < 0.6 and n < 6 and f > 0.15:
                c = path[0]                                        # wheel ruts
            if f < 0.3:
                c = mix(c, hx('#b34532'), (0.3 - f) * 1.0)
            base[y, x] = c
    return base


def charred_pine(L, cx, by, h, seed, lit=False):
    """A burnt pine: a black trunk, a few bare limbs, a stub of needles at the crown; one limb edge lit by the glow."""
    trunk = hx('#14101e')
    glow = hx('#b34532')
    for y in range(by - h, by + 1):
        L.put(cx, y, trunk)
        if y > by - h * 0.7:
            L.put(cx + 1, y, trunk)
    for j in range(3 + h // 14):
        ly = by - h + 3 + j * (h // 4)
        ln = 3 + (V.h32(seed, j) % 5)
        sd = 1 if j % 2 == 0 else -1
        for k in range(1, ln + 1):
            x = cx + sd * k
            y = ly - k // 2
            L.put(x, y, trunk)
            if lit and k % 2 == 0:
                L.put(x, y - 1, glow)
    L.put(cx, by - h - 1, trunk)
    if lit:
        for y in range(by - h, by - 2, 3):
            L.put(cx - 1, y, glow)


def pines(base):
    far = Layer()
    for i, x in enumerate(range(8, W, 17)):
        if 100 < x < 150:
            continue
        h = 14 + V.h32(31, i) % 12
        charred_pine(far, x + V.h32(32, i) % 6, HORIZON + 14 + V.h32(33, i) % 3, h, 40 + i)
    base = far.composite_onto(base, hx('#571f28'), 0.35)
    near = Layer()
    for (x, by, h, s) in ((14, 142, 62, 51), (338, 138, 68, 52), (372, 146, 50, 53), (-4, 152, 46, 54)):
        charred_pine(near, x, by, h, s, lit=True)
    return near.composite_onto(base, hx('#571f28'), 0.08)


def embers(base):
    for i in range(46):
        x = (V.h32(61, i) % (W - 4)) + 2
        y = 10 + V.h32(62, i) % 150
        c = hx('#f9d77a') if i % 4 == 0 else (hx('#eba14d') if i % 2 else hx('#e06b39'))
        base[y, x] = c
        if i % 5 == 0:
            base[y + 1, x] = hx('#b34532')
    return base


def compose(mode='ash_road'):
    P = palette()
    base = np.zeros((H, W, 3), np.float32)
    V.draw_sky(base, P, blend=0.25)
    base = ash_clouds(base)
    base = mountain(base)
    base = ash_hills(base)
    base = ground(base)
    base = road(base)
    base = pines(base)
    base = embers(base)
    return np.clip(base, 0, 1)


if __name__ == '__main__':
    import os
    a = compose()
    im = Image.fromarray((a * 255 + 0.5).astype(np.uint8), 'RGB')
    os.makedirs(os.path.join(V.HERE, 'out'), exist_ok=True)
    im.resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(V.HERE, 'out', '_ash_road_3x.png'))
    print('wrote out/_ash_road_3x.png')
