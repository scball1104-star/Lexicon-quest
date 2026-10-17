import sys, importlib
sys.path.insert(0, 'chars')
from pix import *
import pal as P
mod = importlib.import_module(sys.argv[1])
names = sys.argv[2].split(',')
legend = P.resolve(mod.PAL, sys.argv[1])
items = []
for n in names:
    g = grid_from_text(getattr(mod, n))
    for i, r in enumerate(g):
        if len(r) != len(g[0]): print(n, 'row', i, 'len', len(r), 'expected', len(g[0]))
    if len(g) != 32: print(n, 'rows', len(g))
    a = parse_grid(g, legend)
    items.append((n, a))
scale = int(sys.argv[3]) if len(sys.argv) > 3 else 10
contact(items, os.path.join(OUT, 'draft.png'), scale=scale, cols=8)
strip = blank(sum(a.shape[1] + 4 for _, a in items), max(a.shape[0] for _, a in items))
x = 0
for _, a in items:
    paste(strip, a, x, 0); x += a.shape[1] + 4
sb = on_bg(strip, (86, 128, 70))
W = sum(sb.shape[1] * s + 8 for s in (1, 2, 3))
im = Image.new('RGB', (W, sb.shape[0] * 3), (86, 128, 70))
x = 0
for s in (1, 2, 3):
    im.paste(upscale(sb, s), (x, 0)); x += sb.shape[1] * s + 8
im.save(os.path.join(OUT, 'draft_small.png'))
