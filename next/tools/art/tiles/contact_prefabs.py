"""Contact sheet of every prefab building at 2x -> out/contact_prefabs.png.  python contact_prefabs.py"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prefabs
from PIL import Image
ims = []
for pid, fn in prefabs.PREFABS.items():
    cv, meta = fn()
    ims.append(cv.image())
W = 900; x = y = 0; rowh = 0; pos = []
for im in ims:
    if x + im.width > W: x, y, rowh = 0, y + rowh + 8, 0
    pos.append((x, y)); x += im.width + 8; rowh = max(rowh, im.height)
sheet = Image.new('RGBA', (W, y + rowh), (90, 144, 50, 255))
for im, p in zip(ims, pos): sheet.paste(im, p, im)
sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save('out/contact_prefabs.png')
print(sheet.size)
