"""OKLCh recolour recipes for enemy variants (applied to pixelized sprites)."""
import numpy as np
from pix import to_oklab, from_oklab


def lch(a):
    m = a[..., 3] > 0.5
    lab = to_oklab(a[m][:, :3])
    L = lab[:, 0]; C = np.hypot(lab[:, 1], lab[:, 2]); h = np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360
    return m, L, C, h


def put(a, m, L, C, h):
    out = a.copy()
    hr = np.radians(h)
    out[m, :3] = np.clip(from_oklab(np.stack([L, C * np.cos(hr), C * np.sin(hr)], -1)), 0, 1)
    return out


def lerp_hue(h_dark, h_light, L):
    t = np.clip((L - 0.25) / 0.6, 0, 1)
    return h_dark + (h_light - h_dark) * t


def sepia_ink(a, accent_keep=None, ink_dark=0.32):
    """parchment body (warm, light) with ink-dark shadows; strong saturated accents (eyes) kept if accent_keep"""
    m, L, C, h = lch(a)
    keep = np.zeros_like(L, bool)
    if accent_keep is not None:
        keep = accent_keep(L, C, h)
    L2 = np.where(keep, L, L * 1.02 + 0.02)
    # dark values go to ink (blue-violet), lights to parchment (warm yellow)
    t = np.clip((L2 - ink_dark) / 0.35, 0, 1)
    hue = 285 * (1 - t) + 75 * t
    hue = np.where(t > 0.5, 75 - (1 - t) * 20, hue)
    C2 = np.where(t < 0.5, 0.06 * (1 - t * 2) + 0.025, 0.035 + 0.05 * (t - 0.5))
    L2 = np.where(t < 0.5, L2 * 0.85, L2)
    return put(a, m, np.where(keep, L, L2), np.where(keep, C, C2), np.where(keep, h, hue))


def brown_green(a):
    """wolf: blue/violet fur flame -> briar green, neutral grey fur -> warm brown, keep yellow eyes"""
    m, L, C, h = lch(a)
    blue = (h > 200) & (h < 320) & (C > 0.035)
    eye = (h > 60) & (h < 110) & (C > 0.08)
    h2 = h.copy(); C2 = C.copy(); L2 = L.copy()
    # blue mane -> green leaves (hue 140), slightly lighter
    h2[blue] = 140 + (h[blue] - 260) * 0.2
    C2[blue] = np.clip(C[blue] * 0.9, 0, 0.13)
    L2[blue] = L[blue] * 1.08
    # grey fur -> brown (hue 55), chroma by lightness
    grey = ~blue & ~eye
    h2[grey] = 55 + (L[grey] - 0.5) * 30
    C2[grey] = 0.03 + 0.06 * np.clip(1 - np.abs(L[grey] - 0.55) * 1.6, 0, 1)
    L2[grey] = L[grey] * 0.88
    return put(a, m, L2, C2, h2)


def dark_ink(a):
    """icy wraith -> ink wraith: lights become mid ink-violet, darks deep indigo, brightest become cyan glow"""
    m, L, C, h = lch(a)
    t = np.clip((L - 0.3) / 0.65, 0, 1)
    L2 = 0.16 + t * 0.42
    hue = 280 - t * 20
    C2 = 0.05 + t * 0.07
    glow = L > 0.93
    L2 = np.where(glow, 0.82, L2); hue = np.where(glow, 195, hue); C2 = np.where(glow, 0.09, C2)
    return put(a, m, L2, C2, hue)


def gradient_map(a, stops, keep=None, stretch=True, keep_fn=None):
    """map OKLab lightness through a list of (t, '#hex') stops (t in 0..1 of the sprite's L range).
    keep(L,C,h)->mask leaves those pixels unchanged; keep_fn(rgb)->rgb transforms kept pixels."""
    from pix import hex2rgb
    m, L, C, h = lch(a)
    k = keep(L, C, h) if keep is not None else np.zeros_like(L, bool)
    Ls = L[~k] if (~k).any() else L
    lo, hi = (np.percentile(Ls, 2), np.percentile(Ls, 99)) if stretch else (0.0, 1.0)
    t = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1)
    ts = np.array([s[0] for s in stops], np.float32)
    cols = np.array([hex2rgb(s[1]) for s in stops], np.float32) / 255
    labs = to_oklab(cols)
    out_lab = np.stack([np.interp(t, ts, labs[:, i]) for i in range(3)], -1)
    rgb = np.clip(from_oklab(out_lab), 0, 1)
    res = a.copy()
    idx = np.nonzero(m)
    cur = res[idx][:, :3]
    newc = np.where(k[:, None], cur if keep_fn is None else keep_fn(cur), rgb)
    res[idx[0], idx[1], :3] = newc
    return res
