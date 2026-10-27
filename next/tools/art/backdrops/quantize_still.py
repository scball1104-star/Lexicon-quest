"""Quantize a painted still into a game backdrop (384 x 216, the palette, Bayer dither), the same path build.py
takes for the key-art cells, so a Runway (or any) painting can be judged at the game's own pixel density.

    python quantize_still.py in.png out.png [--extras 4] [--max-pair 0.14] [--sharpen 0.55] [--x3 out_3x.png]

Prints the colour count. Read-only on the input. Pairs with build.py (import, no copy of its maths)."""
import argparse, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B


def main(argv):
    p = argparse.ArgumentParser()
    p.add_argument('src'); p.add_argument('dst')
    p.add_argument('--extras', type=int, default=4); p.add_argument('--max-pair', type=float, default=0.14)
    p.add_argument('--sharpen', type=float, default=0.55); p.add_argument('--x3', default=None)
    a = p.parse_args(argv)
    im = Image.open(a.src).convert('RGB')
    # crop to 16:9 around the centre, then the build's own downscale, sharpen and quantize
    W, H = B.W, B.H
    tw = im.width if im.width / im.height <= W / H else int(round(im.height * W / H))
    th = int(round(tw * H / W)) if tw == im.width else im.height
    ox, oy = (im.width - tw) // 2, (im.height - th) // 2
    im = im.crop((ox, oy, ox + tw, oy + th))
    arr = B.downscale(im)
    if a.sharpen > 0: arr = B.unsharp(arr, a.sharpen, 1.0)
    pal = B.load_palette()
    pal2, extras = B.pick_extras(arr, pal, min(B.EXTRA_MAX, a.extras))
    idx = B.quantize_ordered(arr, pal2, a.max_pair)
    out = (pal2[idx] * 255 + 0.5).astype(np.uint8)
    img = Image.fromarray(out, 'RGB')
    img.save(a.dst, optimize=True)
    if a.x3: img.resize((W * 3, H * 3), Image.NEAREST).save(a.x3, optimize=True)
    print(f'{a.dst}: {len(np.unique(idx))} colours, {len(extras)} extras, {os.path.getsize(a.dst)} bytes')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
