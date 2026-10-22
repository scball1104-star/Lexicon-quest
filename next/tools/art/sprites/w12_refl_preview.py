"""W12 preview: the Other Selves' battle frames (enemies_battle.json) beside their owners' party frames.

    python w12_refl_preview.py [tag]      -> out/w12/refl_<tag>_8x.png (rows: hero, mira, bram; columns: owner, then
                                             base, idle_1, attack, hurt, cast, die_1 of the reflection, on the stage colour)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
from PIL import Image, ImageDraw
from pix import DST, OUT, flip_x, from_pil

STATES = ['', '_idle_1', '_attack', '_hurt', '_cast', '_die_1']
OWN = {'refl_hero': 'hero_sword_idle_0', 'refl_mira': 'mira_staff_idle_0', 'refl_bram': 'bram_spear_idle_0'}


def sheet(name):
    m = json.load(open(os.path.join(DST, name + '.json'), encoding='utf-8'))
    return m, from_pil(Image.open(os.path.join(DST, m['image'])))


def frame(m, sh, n):
    x, y, w, h = m['frames'][n]
    return sh[y:y + h, x:x + w]


def on_bg(a, bg):
    out = np.zeros(a.shape[:2] + (3,), np.float32)
    out[:] = np.array(bg, np.float32) / 255
    al = a[..., 3:4]
    out = out * (1 - al) + a[..., :3] * al
    return Image.fromarray((out * 255).astype(np.uint8))


def main(tag='now', frames=None):
    em, es = sheet('enemies_battle')
    pm, ps = sheet('party_battle')
    S = 8
    W, H = 40, 44
    cols = 1 + len(STATES)
    img = Image.new('RGB', (cols * (W * S + 8) + 8, 3 * (H * S + 24) + 8), (34, 30, 46))
    d = ImageDraw.Draw(img)
    for r, rid in enumerate(OWN):
        cells = [('owner', flip_x(frame(pm, ps, OWN[rid])))]
        for st in STATES:
            n = rid + st
            src = frames.get(n) if frames else None
            cells.append((n, src if src is not None else frame(em, es, n)))
        for c, (lab, a) in enumerate(cells):
            x0 = 8 + c * (W * S + 8)
            y0 = 8 + r * (H * S + 24)
            tile = on_bg(a, (58, 40, 92)).resize((a.shape[1] * S, a.shape[0] * S), Image.NEAREST)
            img.paste(tile, (x0, y0 + 16))
            d.text((x0, y0), lab, fill=(240, 236, 220))
    os.makedirs(os.path.join(OUT, 'w12'), exist_ok=True)
    img.save(os.path.join(OUT, 'w12', f'refl_{tag}_8x.png'))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'now')
