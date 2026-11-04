"""Lyra's own portrait (E4-fixes-B, CRITIQUE_6 item 10): the base noble_lady portrait (portraits.webp cell 4) reads
twenty-something; EPISODE4 section 3 gives "fifties, dark skin, braided black hair with grey in it". Same face, same
palette and style, aged by hand-placed edits on the 48 and 32 px frames:

  - grey at the temples and a streak through the curls (the hair's violet-grey highlights go silver, the brown curls
    nearest the face go grey),
  - a few age lines: crow's feet at the outer eye corners, a fold under each eye, the lines from nose to mouth.

    lyra_frames() -> {'lyra_48': rgba uint8, 'lyra_32': rgba uint8}   (written to ep4_portraits by ep4_build.py)
"""
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SPR = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'assets', 'sprites'))


def hx(s):
    return np.array([int(s[i:i + 2], 16) for i in (1, 3, 5)], np.uint8)


SILVER = {'#4c445c': '#8e8997', '#695464': '#8e8997', '#877aa5': '#b3b6c4'}
GREY_CURL = {'#482826': '#66637f', '#6e3d2c': '#8e8997'}


def frame(name):
    m = json.load(open(os.path.join(SPR, 'portraits.json')))
    im = np.asarray(Image.open(os.path.join(SPR, m['image'])).convert('RGBA'))
    x, y, w, h = m['frames'][name][:4]
    return im[y:y + h, x:x + w].copy()


def recolor(a, mask, table):
    for src, dst in table.items():
        m = mask & (np.abs(a[..., :3].astype(int) - hx(src)).sum(-1) == 0)
        a[m, :3] = hx(dst)


def age(a, s):
    """s = scale (1.0 for the 48 px frame, 32/48 for the 32 px one): the face ellipse, temples and line marks scale"""
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    cx, cy, rx, ry = 24 * s, 26 * s, 10.5 * s, 14 * s
    face = ((xs + 0.5 - cx) / rx) ** 2 + ((ys + 0.5 - cy) / ry) ** 2 <= 1.0
    inner = (xs >= 2) & (ys >= 2) & (xs < W - 2) & (ys < H - 2)          # never the portrait's frame line
    hair = ~face & (ys < 34 * s) & inner
    # the temples: the curls framing the face, from the brow down past the ear; their violet-grey lights go silver
    ring = ((xs + 0.5 - cx) / (rx + 5 * s)) ** 2 + ((ys + 0.5 - cy) / (ry + 4 * s)) ** 2 <= 1.0
    temple = hair & ring & (ys > 9 * s)
    recolor(a, temple, SILVER)
    pick = ((xs * 7 + ys * 13) % 5) < 3
    recolor(a, temple & pick, GREY_CURL)
    # one streak through the curls, from the crown down the left side
    streak = hair & (np.abs((xs - 6 * s) + (ys - 4 * s) * 0.35 - 6 * s) < 1.2 * max(s, 0.8)) & (ys > 4 * s)
    recolor(a, streak, {**GREY_CURL, **SILVER})
    # age lines (in the skin's own darks)
    line, fold = hx('#6e3d2c'), hx('#8f5533')
    pts = []
    if s == 1.0:
        pts = [((12, 20), line), ((12, 22), line), ((36, 20), line), ((36, 22), line),       # crow's feet
               ((16, 24), fold), ((17, 24), fold), ((31, 24), fold), ((32, 24), fold),       # under the eyes
               ((19, 30), fold), ((18, 31), fold), ((18, 32), fold), ((30, 30), fold), ((31, 31), fold), ((31, 32), fold)]
    else:
        pts = [((8, 13), line), ((24, 13), line), ((11, 16), fold), ((21, 16), fold), ((12, 20), fold), ((20, 20), fold)]
    for (x, y), c in pts:
        if a[y, x, 3] and face[y, x]:
            a[y, x, :3] = c
    return a


def lyra_frames():
    return {'lyra_48': age(frame('noble_lady_48'), 1.0), 'lyra_32': age(frame('noble_lady_32'), 32 / 48)}


if __name__ == '__main__':
    out = os.path.join(HERE, 'out', 'ep4')
    os.makedirs(out, exist_ok=True)
    f = lyra_frames()
    row = [frame('noble_lady_48'), f['lyra_48']]
    can = Image.new('RGBA', (48 * 2 + 4 + 32 * 2 + 4, 48), (20, 20, 30, 255))
    can.paste(Image.fromarray(row[0]), (0, 0)); can.paste(Image.fromarray(row[1]), (50, 0))
    can.paste(Image.fromarray(frame('noble_lady_32')), (100, 8)); can.paste(Image.fromarray(f['lyra_32']), (134, 8))
    can.resize((can.width * 6, can.height * 6), Image.NEAREST).save(os.path.join(out, 'lyra_portrait_6x.png'))
