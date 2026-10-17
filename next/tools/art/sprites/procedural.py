"""Procedurally shaded pieces, quantized to master ramps: the Thirteenth Bell, ground shadows."""
import math
import numpy as np
from pix import *
import pal as P


def rgb(ref):
    return np.array(hex2rgb(P.color(ref)), np.float32) / 255


def thirteenth_bell():
    W = H = 48
    img = blank(W, H)
    bronze = [rgb(r) for r in ('wood:0', 'wood:1', 'wood:2', 'gold:1', 'gold:2', 'gold:3', 'gold:4')]
    patina = [rgb(r) for r in ('roof_green:1', 'roof_green:2', 'roof_green:3', 'roof_green:4')]
    cx, top, lip = 24.0, 6, 37
    tilt = math.radians(-9)  # bell leans left
    from scipy.ndimage import gaussian_filter
    noise = gaussian_filter(np.random.default_rng(7).random((H, W)), 2.2)
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    rng = np.random.default_rng(13)

    def hw(t):  # half width, t 0 (crown) .. 1 (lip): dome, waist, flared lip
        if t < 0.18:
            return 4 + 7.5 * math.sqrt(t / 0.18)
        base = 11.5 + 1.5 * (t - 0.18)
        if t > 0.55:
            base += 8.0 * ((t - 0.55) / 0.45) ** 2.2
        return base

    def bell_space(x, y):
        px, py = x + 0.5 - cx, y + 0.5 - lip
        rx = px * math.cos(-tilt) - py * math.sin(-tilt)
        ry = px * math.sin(-tilt) + py * math.cos(-tilt) + lip
        return rx, ry

    L = np.array([-0.62, -0.55, 0.56]); L /= np.linalg.norm(L)
    for y in range(H):
        for x in range(W):
            rx, ry = bell_space(x, y)
            if ry < top or ry > lip + 1.5:
                continue
            t = (ry - top) / (lip - top)
            w = hw(min(t, 1.0))
            if abs(rx) > w:
                continue
            nx = rx / w
            nz = math.sqrt(max(0.0, 1 - nx * nx))
            ny = -0.35 if t > 0.4 else -0.15
            n = np.array([nx, ny, nz]); n /= np.linalg.norm(n)
            inten = max(0.0, float(n @ L)) * 0.85 + 0.12
            if ry > lip - 1.0:
                inten *= 0.75  # lip underside
            if abs(t - 0.22) < 0.03 or abs(t - 0.82) < 0.025:
                inten = inten * 0.8 + 0.12  # cast bands
            i = int(np.clip(round(inten * 6.2), 1, 6))
            c = bronze[i]
            if noise[y, x] > (0.52 if t > 0.45 else 0.7) and i <= 5:
                c = patina[min(3, max(0, i - 2))]
            img[y, x, :3] = c; img[y, x, 3] = 1
    # mouth interior sliver
    for x in range(W):
        for y in range(H):
            rx, ry = bell_space(x, y)
            if lip + 0.2 < ry < lip + 3.2 and abs(rx) < hw(1.0) - 1.5 - (ry - lip) * 0.6:
                img[y, x, :3] = rgb('ink:1' if ry < lip + 2 else 'ink:0'); img[y, x, 3] = 1
    # crown loop
    for (x, y) in [(21, 2), (22, 1), (23, 1), (24, 1), (25, 2), (20, 3), (26, 3), (20, 4), (26, 4), (21, 5), (25, 5)]:
        img[y, x, :3] = bronze[3]; img[y, x, 3] = 1
    for (x, y) in [(22, 2), (23, 2), (21, 3)]:
        img[y, x, :3] = bronze[5]; img[y, x, 3] = 1
    # crack
    crack = [(30, 38), (30, 37), (29, 36), (29, 35), (30, 34), (30, 33), (29, 32), (28, 31), (28, 30), (29, 29),
             (29, 28), (28, 27), (27, 26), (27, 25)]
    for (x, y) in crack:
        if img[y, x, 3] > 0:
            img[y, x, :3] = bronze[0]
            if img[y, x - 1, 3] > 0:
                img[y, x - 1, :3] = bronze[2]
            if x + 1 < W and img[y, x + 1, 3] > 0:
                img[y, x + 1, :3] = bronze[5] if y < 32 else bronze[4]
    # ground mound
    for y in range(36, 46):
        for x in range(2, 46):
            d = ((x - 24) / 22) ** 2 + ((y - 44) / 8.5) ** 2
            if d < 1 and img[y, x, 3] == 0:
                k = 'earth:1' if y > 42 else ('earth:2' if (x + y) % 5 else 'earth:3')
                if y < 39:
                    k = 'grass:2' if (x * 7 + y) % 3 else 'grass:3'
                img[y, x, :3] = rgb(k); img[y, x, 3] = 1
    # roots
    roots = [
        [(2, 45), (7, 41), (11, 35), (14, 27), (17, 19), (21, 13), (26, 11), (31, 13)],
        [(46, 44), (41, 40), (37, 34), (35, 29)],
        [(4, 47), (13, 42), (24, 40), (35, 42), (45, 47)],
    ]
    rmask = np.zeros((H, W), np.int32)
    for ri, pts in enumerate(roots):
        for a, b in zip(pts, pts[1:]):
            n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 3) + 1
            for s in range(n + 1):
                t = s / n
                x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t
                rad = 1.6 if ri < 3 else 1.1
                for yy in range(int(y - 2), int(y + 3)):
                    for xx in range(int(x - 2), int(x + 3)):
                        if 0 <= xx < W and 0 <= yy < H and (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= rad * rad:
                            rmask[yy, xx] = ri + 1
    root_cols = [rgb(r) for r in ('earth:0', 'earth:1', 'earth:2', 'earth:3')]
    for y in range(H):
        for x in range(W):
            if rmask[y, x]:
                up = y > 0 and rmask[y - 1, x] == rmask[y, x]
                lf = x > 0 and rmask[y, x - 1] == rmask[y, x]
                dn = y < H - 1 and rmask[y + 1, x] == rmask[y, x]
                c = root_cols[2]
                if not up or not lf:
                    c = root_cols[3]
                if not dn:
                    c = root_cols[1]
                img[y, x, :3] = c; img[y, x, 3] = 1
    out = img.copy()
    for y in range(H):
        for x in range(W):
            if rmask[y, x] == 0 and img[y, x, 3] > 0:
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and rmask[yy, xx]:
                        out[y, x, :3] = rgb('shadow:0'); break
    img = outline(out, mode='outer', strength=0.6)
    return img


def ellipse_shadow(w, h, alpha=None):
    role = P.master()['roles']['shadow_overlay']
    col = np.array(hex2rgb(role['color']), np.float32) / 255
    alpha = role['alpha'] if alpha is None else alpha
    a = blank(w, h)
    cx, cy = w / 2, h / 2
    for y in range(h):
        for x in range(w):
            d = ((x + 0.5 - cx) / (w / 2)) ** 2 + ((y + 0.5 - cy) / (h / 2)) ** 2
            if d <= 1.0:
                a[y, x, :3] = col
                a[y, x, 3] = alpha if d < 0.6 else alpha * 0.6
    return a
