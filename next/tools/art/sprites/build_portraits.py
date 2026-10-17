"""Portraits -> assets/sprites/portraits.png/.json (48x48 dialogue, 32x32 menu; 1 px bevel frame).

Sources: ../assets/art/portraits.png (4x2 grid, painted). Each portrait is a square crop around the face,
area-downscaled, quantized to a per-portrait palette harmonized toward the master palette, despeckled,
then framed.
"""
import os
from pix import *
import pal as P

# id: (cell index, crop centre x, crop centre y, crop size for 48, crop size for 32)  in cell pixels (443 cell)
CROPS = {
    'hero':         (0, 212, 160, 300, 220),
    'mira':         (1, 218, 165, 300, 220),
    'bram':         (2, 212, 160, 300, 220),
    'mael':         (3, 218, 170, 300, 230),
    'noble_lady':   (4, 214, 165, 300, 220),
    'silver_rogue': (5, 214, 160, 300, 220),
    'goggles_smith': (6, 214, 150, 300, 220),
    'hooded_sage':  (7, 214, 165, 300, 220),
}


def cell_img(src, i):
    H, W = src.shape[:2]
    c, r = i % 4, i // 4
    x0, x1 = int(round(c * W / 4)), int(round((c + 1) * W / 4))
    y0, y1 = int(round(r * H / 2)), int(round((r + 1) * H / 2))
    return src[y0:y1, x0:x1]


def square(cell, cx, cy, s):
    h, w = cell.shape[:2]
    x0 = int(round(cx - s / 2)); y0 = int(round(cy - s / 2))
    x0 = max(0, min(w - s, x0)); y0 = max(0, min(h - s, y0))
    return cell[y0:y0 + s, x0:x0 + s]


def harmonize(pal, max_de=0.035):
    """snap palette entries to the master palette where perceptually very close"""
    master = np.array([hex2rgb(h) for h in P.all_colors()], np.float32) / 255
    ml = to_oklab(master)
    pl = to_oklab(pal)
    out = pal.copy()
    for i in range(len(pal)):
        d = np.linalg.norm(ml - pl[i], axis=1)
        j = d.argmin()
        if d[j] < max_de:
            out[i] = master[j]
    return out


def frame(img):
    """img: (n-2)x(n-2) opaque -> n x n with a 1px bevel frame"""
    h, w = img.shape[:2]
    out = blank(w + 2, h + 2)
    out[1:-1, 1:-1] = img
    light = np.array(hex2rgb(P.color('metal:3')), np.float32) / 255
    mid = np.array(hex2rgb(P.color('stone_cool:4')), np.float32) / 255
    dark = np.array(hex2rgb(P.color('ink:2')), np.float32) / 255
    for x in range(w + 2):
        out[0, x, :3] = light; out[-1, x, :3] = dark
    for y in range(h + 2):
        out[y, 0, :3] = light; out[y, -1, :3] = dark
    out[0, -1, :3] = mid; out[-1, 0, :3] = mid
    out[..., 3] = 1
    return out


def backdrop(h, w):
    bg = np.array(hex2rgb(P.color('roof_blue:0')), np.float32) / 255
    bg2 = np.array(hex2rgb(P.color('roof_blue:1')), np.float32) / 255
    base = np.zeros((h, w, 4), np.float32)
    for y in range(h):
        t = y / h
        base[y, :, :3] = bg * (1 - t * 0.6) + bg2 * (t * 0.6)
    base[..., 3] = 1
    return base


def rekey_backdrop(crop, tol=0.075):
    """replace the painted navy backdrop (connected to the border) with the shared portrait backdrop"""
    from scipy import ndimage as ndi
    lab = to_oklab(crop[..., :3].reshape(-1, 3)).reshape(crop.shape[:2] + (3,))
    corners = np.concatenate([lab[:6, :6].reshape(-1, 3), lab[:6, -6:].reshape(-1, 3)])
    ref = np.median(corners, 0)
    close = np.linalg.norm(lab - ref, axis=-1) < tol
    labl, n = ndi.label(close)
    border = set(np.unique(np.concatenate([labl[0], labl[-1], labl[:, 0], labl[:, -1]]))) - {0}
    m = np.isin(labl, list(border))
    m = ndi.binary_opening(m, iterations=1)
    out = crop.copy()
    bd = backdrop(*crop.shape[:2])
    out[m] = bd[m]
    # protect the lift step from brightening the backdrop: remember mask on the array
    return out


def make(cell, cx, cy, s, n, k, med=7, de=0.10, sharp=0.6, fixes=None, lift=0.22):
    from scipy.ndimage import median_filter
    crop = square(cell, cx, cy, s).copy()
    crop = rekey_backdrop(crop)
    if med > 1:
        for ch in range(3):
            crop[..., ch] = median_filter(crop[..., ch], size=med)
    d = box_resize(crop, n - 2, n - 2)
    d[..., 3] = 1
    d = unsharp(d, sharp, 0.7)
    if lift:
        # the painted sheet is dark: lift mid-tones so faces read inside a blue window
        lab = to_oklab(d[..., :3].reshape(-1, 3))
        lab[:, 0] = np.clip(lab[:, 0] ** (1.0 / (1.0 + lift)) * (1 + lift * 0.15), 0, 1)
        lab[:, 1:] *= 1 + lift * 0.4
        d[..., :3] = np.clip(from_oklab(lab), 0, 1).reshape(d.shape[:2] + (3,))
    if lift:
        bd = backdrop(*d.shape[:2])
        dl = to_oklab(bd[..., :3].reshape(-1, 3)).reshape(d.shape[:2] + (3,))
        cl = to_oklab(d[..., :3].reshape(-1, 3)).reshape(d.shape[:2] + (3,))
        # pixels that are (lifted) backdrop go back to the exact backdrop colour
        ref = to_oklab(np.array([[np.median(d[:3, :3, i]) for i in range(3)]], np.float32))[0]
        near = np.linalg.norm(cl - ref, axis=-1) < 0.05
        from scipy import ndimage as ndi
        labl, _n = ndi.label(near)
        border = set(np.unique(np.concatenate([labl[0], labl[-1], labl[:, 0], labl[:, -1]]))) - {0}
        m = np.isin(labl, list(border))
        d[m] = bd[m]
    pal = palette_from(d, k, seed=3)
    pal = harmonize(pal)
    q = quantize(d, pal)
    q = remove_orphans(q, passes=2, max_de=de, min_opaque_nb=8)
    if fixes:
        for (x, y, col) in fixes:
            c = hex2rgb(P.color(col, 'portraits') if not col.startswith('#') else col)
            q[y, x, :3] = np.array(c, np.float32) / 255
    return frame(q)


# extra portraits from the larger NPC paintings in interior-sprites.png (cell, size, dx, dy, recolour)
EXTRA = {
    'tess':    (4, 66, 0, -2, None),
    'iris':    (3, 62, 0, 1, None),
    'nella':   (6, 66, -4, -2, None),
    'pell':    (5, 66, 0, -2, None),
    'hazel':   (1, 64, 0, 3, None),
    'hob':     (7, 66, 0, -2, None),
    'garrick': (2, 70, 6, -2, 'iron_grey'),
    'pip':     (0, 70, 8, -2, 'chapel_purple'),
}


def recolour_portrait(a, how):
    import recolor as RC
    m, L, C, h = RC.lch(a)
    H = a.shape[0]
    ys = np.nonzero(a[..., 3] > 0.5)[0]
    if how == 'iron_grey':
        # dark, low-chroma brown hair/beard -> iron grey (lighter, cool)
        sel = (L < 0.42) & (C < 0.09) & (h > 20) & (h < 100)
        L2 = np.where(sel, 0.30 + L * 0.95, L)
        C2 = np.where(sel, 0.012, C)
        h2 = np.where(sel, 260.0, h)
        return RC.put(a, m, L2, C2, h2)
    if how == 'chapel_purple':
        sel = (h > 100) & (h < 175) & (C > 0.03)
        h2 = np.where(sel, 305.0, h)
        return RC.put(a, m, L, C, h2)
    return a


def make_extra(src, ci, size, dx, dy, how, n, k):
    from srcutil import grid_cell
    cell = grid_cell(src, 4, 4, ci)
    al = cell[..., 3] > 0.5
    ys, xs = np.nonzero(al)
    top = ys.min()
    band = al[top:top + 40]
    bx = np.nonzero(band.any(0))[0]
    cols = np.nonzero(band)[1]
    cx = int(cols.mean())
    x0 = max(0, cx - size // 2 + dx); y0 = max(0, top + dy)
    crop = cell[y0:y0 + size, x0:x0 + size].copy()
    if how:
        crop = recolour_portrait(crop, how)
    base = backdrop(*crop.shape[:2])
    comp = paste(base, crop, 0, 0)
    d = box_resize(comp, n - 2, n - 2)
    d[..., 3] = 1
    pal = palette_from(d, k, seed=5)
    pal = harmonize(pal, 0.03)
    q = quantize(d, pal)
    q = remove_orphans(q, passes=1, max_de=0.05, min_opaque_nb=8)
    return frame(q)


def build():
    src = load_src('portraits.png')
    big, small = [], []
    for pid, (ci, cx, cy, s48, s32) in CROPS.items():
        cell = cell_img(src, ci)
        big.append((pid, make(cell, cx, cy, s48, 48, 18)))
        small.append((pid, make(cell, cx, cy - 10, s32, 32, 16, med=9)))
    isrc = load_src('interior-sprites.png')
    for pid, (ci, size, dx, dy, how) in EXTRA.items():
        big.append((pid, make_extra(isrc, ci, size, dx, dy, how, 48, 26)))
        small.append((pid, make_extra(isrc, ci, int(size * 0.8), dx, dy + int(size * 0.16), how, 32, 20)))
    return big, small


def build_atlas():
    big, small = build()
    sh = Shelf(256, pad=0)
    for pid, im in big:
        sh.add(pid + '_48', im)
    for pid, im in small:
        sh.add(pid + '_32', im)
    sheet, rects = sh.render()
    save_png(sheet, os.path.join(DST, 'portraits.png'))
    ids = [p for p, _ in big]
    meta = {'image': 'portraits.png', 'frames': rects,
            'portraits': {p: {'48': p + '_48', '32': p + '_32'} for p in ids},
            'sources': {p: ('portraits.webp cell %d' % CROPS[p][0]) if p in CROPS else ('interior-sprites.png cell %d' % EXTRA[p][0]) for p in ids},
            'unassigned': ['noble_lady', 'silver_rogue', 'goggles_smith', 'hooded_sage'],
            'notes': '48x48 for dialogue, 32x32 for menus; both include a 1 px bevel frame and their own dark backdrop.'}
    write_json(os.path.join(DST, 'portraits.json'), meta)
    contact(big, os.path.join(OUT, 'portraits_48_4x.png'), scale=4, cols=4, title='portraits 48x48 at 4x')
    contact(small, os.path.join(OUT, 'portraits_32_4x.png'), scale=4, cols=8, title='portraits 32x32 at 4x')
    return meta


if __name__ == '__main__':
    build_atlas()
