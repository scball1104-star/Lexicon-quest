"""zoom.py src.png x y w h scale out.png : crop a region of a 1x image and enlarge it (nearest)."""
import sys
from PIL import Image
src, x, y, w, h, s, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
im = Image.open(src).crop((x, y, x + w, y + h))
im.resize((w * s, h * s), Image.NEAREST).save(out)
