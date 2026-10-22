"""W12 preview: the Episode 2 portraits from chars/portraits_w12.py next to the shipped ones and Episode 1 refs.

    python w12_portrait_preview.py [ids...]      -> out/w12/portraits_<id>.png and out/w12/portraits_w12_48_6x.png
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from PIL import Image, ImageDraw
from pix import DST, OUT

W12 = os.path.join(OUT, 'w12')


def shipped(pid, size=48):
    m = json.load(open(os.path.join(DST, 'portraits.json'), encoding='utf-8'))
    sh = Image.open(os.path.join(DST, 'portraits.png')).convert('RGB')
    f = m['frames'].get(f'{pid}_{size}')
    return sh.crop((f[0], f[1], f[0] + f[2], f[1] + f[3])) if f else None


def to_img(a):
    return Image.fromarray((np.clip(a[..., :3], 0, 1) * 255).astype(np.uint8))


def main(ids):
    import portraits_w12 as PW
    os.makedirs(W12, exist_ok=True)
    row = []
    refs = [(r, shipped(r)) for r in ('mael', 'garrick', 'hob', 'pip')]
    for pid in ids:
        t = time.time()
        big = PW.canvas(pid)
        p48 = to_img(PW.portrait(pid, 48))
        p32 = to_img(PW.portrait(pid, 32))
        print(f'{pid}: {time.time() - t:.1f}s', flush=True)
        old = shipped(pid)
        tiles = [('render 6x', to_img(big).resize((288, 288), Image.LANCZOS)),
                 ('new 48 @6x', p48.resize((288, 288), Image.NEAREST)),
                 ('new 32 @6x', p32.resize((192, 192), Image.NEAREST))]
        if old is not None:
            tiles.append(('old 48 @6x', old.resize((288, 288), Image.NEAREST)))
        tiles += [(f'{n} (Ep1)', im.resize((288, 288), Image.NEAREST)) for n, im in refs[:2]]
        W = sum(t.width for _, t in tiles) + 12 * (len(tiles) + 1)
        sheet = Image.new('RGB', (W, 288 + 40), (34, 30, 46))
        d = ImageDraw.Draw(sheet)
        x = 12
        for lab, im in tiles:
            sheet.paste(im, (x, 28))
            d.text((x, 8), lab, fill=(240, 236, 220))
            x += im.width + 12
        sheet.save(os.path.join(W12, f'portraits_{pid}.png'))
        row.append((pid, p48, old))
    # every new 48 at 6x in one strip with the Episode 1 references
    cells = [(pid, p) for pid, p, _ in row] + refs
    sheet = Image.new('RGB', (len(cells) * (288 + 12) + 12, 288 + 40), (34, 30, 46))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(cells):
        sheet.paste(im.resize((288, 288), Image.NEAREST), (12 + i * 300, 28))
        d.text((12 + i * 300, 8), n, fill=(240, 236, 220))
    sheet.save(os.path.join(W12, 'portraits_w12_48_6x.png'))


if __name__ == '__main__':
    main(sys.argv[1:] or ['elian'])
