"""helpers to cut objects out of the painted source grids"""
import numpy as np
from scipy import ndimage as ndi
from pix import crop_alpha


def grid_cell(a, cols, rows, i):
    H, W = a.shape[:2]
    c, r = i % cols, i // cols
    x0, x1 = int(round(c * W / cols)), int(round((c + 1) * W / cols))
    y0, y1 = int(round(r * H / rows)), int(round((r + 1) * H / rows))
    return a[y0:y1, x0:x1].copy()


def main_object(a, thr=0.3, keep_frac=0.03, dilate=2, max_dist=None):
    """keep the biggest connected component plus any component at least keep_frac of it
    (optionally only those within max_dist px of the biggest one's bbox)."""
    m = a[..., 3] > thr
    lab, n = ndi.label(m, structure=np.ones((3, 3)))
    if n == 0:
        return a
    sizes = ndi.sum(m, lab, range(1, n + 1))
    bi = int(np.argmax(sizes)) + 1
    big = sizes.max()
    keep_ids = []
    if max_dist is not None:
        ys, xs = np.nonzero(lab == bi)
        bx0, bx1, by0, by1 = xs.min() - max_dist, xs.max() + max_dist, ys.min() - max_dist, ys.max() + max_dist
    for i, s in enumerate(sizes):
        if s < big * keep_frac:
            continue
        if max_dist is not None:
            ys, xs = np.nonzero(lab == i + 1)
            if xs.max() < bx0 or xs.min() > bx1 or ys.max() < by0 or ys.min() > by1:
                continue
        keep_ids.append(i + 1)
    keep = np.isin(lab, keep_ids)
    keep = ndi.binary_dilation(keep, iterations=dilate)
    out = a.copy()
    out[~keep] = 0
    return crop_alpha(out, 0, 0.02)[0]


def fit_size(obj, th=None, tw=None):
    h, w = obj.shape[:2]
    if th is not None:
        return max(1, int(round(w * th / h))), th
    return tw, max(1, int(round(h * tw / w)))
