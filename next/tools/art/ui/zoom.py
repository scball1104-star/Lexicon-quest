"""Crop a region of an out/ PNG (given in 1x coords of a 3x image) and upscale for close inspection."""
import sys
from PIL import Image
src, x, y, w, h, k = sys.argv[1], *map(int, sys.argv[2:7])
base = int(sys.argv[7]) if len(sys.argv) > 7 else 3
im = Image.open(src)
im = im.crop((x*base, y*base, (x+w)*base, (y+h)*base))
im = im.resize((w*k, h*k), Image.NEAREST)
im.save(sys.argv[8] if len(sys.argv) > 8 else 'out/_zoom.png')
