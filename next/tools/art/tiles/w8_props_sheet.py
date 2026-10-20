"""W8-archive scratch: contact sheet of the per-floor props on their own floors (4x) -> out/w8/props.png"""
import json, os
from PIL import Image
from pxlib import TILES_DIR, OUT_DIR
db = json.load(open(os.path.join(TILES_DIR, 'tiles.json')))
sheet = Image.open(os.path.join(TILES_DIR, 'archive.png')).convert('RGBA')
ids = ['card_cabinet', 'pillar_oak', 'book_stack', 'index_cards', 'wall_drawers_l', 'wall_drawers_m', 'wall_drawers_r',
       'great_catalog_dial', 'lectern', 'hanging_lamp', 'gallery_window', 'gallery_rose', 'shelf_rooted',
       'root_drape', 'wall_ink_seep', 'root_mass_a', 'root_mass_b', 'root_arch']
out = Image.new('RGBA', (520, 120), (40, 34, 52, 255))
x = 4
y = 4
for i in ids:
    if i in db['objects']:
        r = db['objects'][i]['rect']
    else:
        t = db['tiles'][i]
        r = [t['x'], t['y'], t['w'], t['h']]
    im = sheet.crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))
    if x + r[2] > 516:
        x = 4
        y += 56
    out.alpha_composite(im, (x, y))
    x += r[2] + 4
out = out.resize((out.width * 3, out.height * 3), Image.NEAREST)
os.makedirs(os.path.join(OUT_DIR, 'w8'), exist_ok=True)
out.save(os.path.join(OUT_DIR, 'w8', 'props.png'))
print('ok')
