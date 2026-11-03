"""E3-fixes-battle (CRITIQUE_5 item 1): value pass on the Cinder Warden's Tempered Iron and Molten Shell frames in
assets/sprites/bosses_battle.png, so the body reads as a dark shape on the red forge backdrop.

Run once on the sheet ep3_warden.py / build_bosses.py wrote (it reads the untouched copy given by --src, default the
sheet itself, and refuses a sheet it already passed: a marker pixel is not used, it checks the body luma instead).
  - body plate (everything that is not glow, rim or outline) darkened about two steps, hue kept
  - speckle merged: a 3x3 majority pass over the darkened body tones (glow, rim and outline untouched)
  - a warm 1 px top light just inside the upper silhouette (the forge side)
  - the furnace grate, lamps, seams and the orange rim are left exactly as they were (the focal point stays the eye)
Fold this into tools/art/sprites/ep3_warden.py if the sheet is ever rebuilt.
"""
import argparse, json, pathlib, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
NEXT = pathlib.Path(__file__).resolve().parents[3]
SHEET = NEXT / 'assets/sprites/bosses_battle.png'
LOOKS = ('cinder_warden', 'cinder_warden_molten')
RIM = (150, 78, 44)

def luma(rgb): return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

def pass_frame(c):
    rgb = c[..., :3].astype(float) / 255; m = c[..., 3] > 0
    L = luma(rgb); mx = rgb.max(-1); mn = rgb.min(-1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    warm = rgb[..., 0] >= rgb[..., 2]
    glow = m & ((warm & (mx > 0.8) & (sat > 0.4)) | (L > 0.75))     # lamps, seams, white heat (the hottest colours only)
    # the furnace grate: the largest red blob, filled, is kept whole (the focal point)
    lab, n = ndi.label(m & (rgb[..., 0] > 1.6 * rgb[..., 1]) & (rgb[..., 0] > 0.3))
    if n: glow |= ndi.binary_dilation(ndi.binary_fill_holes(lab == 1 + np.argmax(ndi.sum(np.ones_like(lab), lab, range(1, n + 1)))), iterations=1) & m
    # outline and rim: a pixel with a transparent 4-neighbour
    pad = np.pad(m, 1); edge = m & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    body = m & ~glow & ~edge
    k = np.where(L < 0.3, 0.58, 0.72)[..., None]
    out = rgb.copy(); out[body] = (rgb * k)[body]
    # majority pass over body tones (merge speckle into value groups)
    q = (out * 255).astype(int); key = (q[..., 0] << 16) | (q[..., 1] << 8) | q[..., 2]
    res = key.copy(); H, W = key.shape
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not body[y, x]: continue
            win = key[y - 1:y + 2, x - 1:x + 2][body[y - 1:y + 2, x - 1:x + 2]]
            v, n = np.unique(win, return_counts=True)
            if n.max() >= 5 and (key[y, x] == v).sum() == 1 and (win == key[y, x]).sum() <= 2: res[y, x] = v[n.argmax()]
    q = np.stack([(res >> 16) & 255, (res >> 8) & 255, res & 255], -1)
    # a hot top light: the body pixel just under a top edge (the forge is above and behind) takes a warm mid tone
    top = body & np.pad(edge, ((1, 0), (0, 0)))[:-1] & ~np.pad(m, ((2, 0), (0, 0)))[:-2]
    q[top] = RIM
    c2 = c.copy(); c2[..., :3] = np.where(body[..., None], q, c[..., :3]); return c2, float(luma(rgb)[body].mean()), float(luma(q / 255)[body].mean())

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--src', default=str(SHEET)); ap.add_argument('--out', default=str(SHEET)); a = ap.parse_args()
    src = Image.open(a.src); rgba = np.array(src.convert('RGBA'))
    fr = json.loads((NEXT / 'assets/sprites/bosses_battle.json').read_text())['frames']
    names = [n for n in fr if n.startswith(LOOKS) and not n.startswith('cinder_warden_quenched')]
    for n in names:
        x, y, w, h = fr[n]; c = rgba[y:y + h, x:x + w]
        if n == 'cinder_warden' and luma(c[..., :3][c[..., 3] > 0] / 255).mean() < 0.17: sys.exit('already passed')
        c2, l0, l1 = pass_frame(c); rgba[y:y + h, x:x + w] = c2; print(f'{n:32} body luma {l0:.3f} -> {l1:.3f}')
    img = Image.fromarray(rgba, 'RGBA')
    # keep the sheet paletted, exactly: one palette entry per colour, the last index transparent
    alpha = rgba[..., 3]; vis = alpha > 0
    cols, inv = np.unique(rgba[vis][:, :3], axis=0, return_inverse=True)
    assert len(cols) <= 255, len(cols)
    idx = np.full(alpha.shape, 255, np.uint8); idx[vis] = inv.reshape(-1)
    p = [int(v) for v in cols.reshape(-1)] + [0, 0, 0] * (256 - len(cols))
    outp = Image.fromarray(idx, 'P'); outp.putpalette(p); outp.save(a.out, optimize=True, transparency=255)
    print('colours', len(cols))
    back = np.array(Image.open(a.out).convert('RGBA'))
    print('lossless:', bool((back[alpha > 0][:, :3] == rgba[alpha > 0][:, :3]).all() and (back[..., 3] > 0).sum() == (alpha > 0).sum()))

main()
