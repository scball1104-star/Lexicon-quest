"""Contact sheet of native (x1) shots: crop a region from each, scale, lay out in a row.
    python next/qa/world/contact.py out.png x0 y0 x1 y1 scale shot1 shot2 ...   (shot names without _x1.png)"""
import sys, pathlib
from PIL import Image
OUT = pathlib.Path(__file__).resolve().parent / 'out'
name, x0, y0, x1, y1, sc, *shots = sys.argv[1:]
x0, y0, x1, y1, sc = int(x0), int(y0), int(x1), int(y1), int(sc)
w, h = (x1 - x0) * sc, (y1 - y0) * sc
sheet = Image.new('RGB', (len(shots) * (w + 4), h), (255, 0, 255))
for i, s in enumerate(shots):
    im = Image.open(OUT / f'{s}_x1.png').crop((x0, y0, x1, y1)).resize((w, h), Image.NEAREST)
    sheet.paste(im, (i * (w + 4), 0))
sheet.save(OUT / name)
print(OUT / name)
