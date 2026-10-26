"""Contact sheets of the x1 sheet's objects and tiles with their ids (3x or 4x), for the critics and for me.

    python x1_contact.py                    # out/x1/contact_objects_3x.png, contact_tiles_3x.png (everything)
    python x1_contact.py x1_chime 4         # only ids containing the text, at 4x -> out/x1/contact_x1_chime_4x.png
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pxlib import OUT_DIR, TILES_DIR

BG = (86, 112, 88, 255)
BG2 = (70, 92, 74, 255)


def load():
    with open(os.path.join(TILES_DIR, 'x1_tiles.json')) as f:
        frag = json.load(f)
    sheet = Image.open(os.path.join(TILES_DIR, 'x1.png')).convert('RGBA')
    return frag, sheet


def cell_for_object(m, sheet):
    """All frames (state frames, animation frames) of an object as a list of RGBA images."""
    x, y, w, h = m['rect']
    out = []
    if m.get('frames'):
        for (fx, fy, fw, fh) in m['frames']:
            out.append(sheet.crop((fx, fy, fx + fw, fy + fh)))
        return out
    anim = m.get('anim')
    if anim:
        for k in sorted(set(anim['frames'])):
            fx = x + k * anim['frameDx']
            out.append(sheet.crop((fx, y, fx + w, y + h)))
        return out
    return [sheet.crop((x, y, x + w, y + h))]


def draw_sheet(items, scale, width, name, title=None):
    """items: list of (label, [PIL images]). Packs row by row."""
    try:
        font = ImageFont.truetype('arial.ttf', 11)
    except Exception:
        font = ImageFont.load_default()
    pad = 8
    placed = []
    x = y = pad
    rowh = 0
    for label, imgs in items:
        w = sum(i.width for i in imgs) * scale + (len(imgs) - 1) * 4 + 4
        h = max(i.height for i in imgs) * scale
        tw = max(w, int(font.getlength(label)) + 4)
        if x + tw + pad > width:
            x = pad
            y += rowh + pad + 14
            rowh = 0
        placed.append((x, y, label, imgs, tw))
        x += tw + pad
        rowh = max(rowh, h)
    H = y + rowh + pad + 20
    im = Image.new('RGBA', (width, H), BG)
    d = ImageDraw.Draw(im)
    for (x, y, label, imgs, tw) in placed:
        h = max(i.height for i in imgs) * scale
        d.rectangle((x - 2, y - 2, x + tw + 1, y + h + 13), fill=BG2)
        cx = x
        for i in imgs:
            big = i.resize((i.width * scale, i.height * scale), Image.NEAREST)
            im.alpha_composite(big, (cx, y + (h - big.height)))
            cx += big.width + 4
        d.text((x, y + h + 1), label, fill=(240, 236, 220, 255), font=font)
    out = os.path.join(OUT_DIR, 'x1', name)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.convert('RGB').save(out)
    print('wrote', out, im.size)
    return out


def main(argv):
    flt = argv[1] if len(argv) > 1 and not argv[1].isdigit() else None
    scale = int(argv[-1]) if len(argv) > 1 and argv[-1].isdigit() else 3
    frag, sheet = load()
    objs = []
    for oid, m in frag['objects'].items():
        if flt and flt not in oid:
            continue
        if 'alias of' in str(m.get('note', '')) or 'plan id' in str(m.get('note', '')):
            continue
        objs.append((oid, cell_for_object(m, sheet)))
    tiles = []
    for tid, m in frag['tiles'].items():
        if flt and flt not in tid:
            continue
        if m.get('autotile') == 'line16':
            continue
        w, h = m.get('w', 16), m.get('h', 16)
        frames = [sheet.crop((m['x'], m['y'], m['x'] + w, m['y'] + h))]
        if m.get('anim'):
            frames = [sheet.crop((m['x'] + k * m['anim']['frameDx'], m['y'], m['x'] + k * m['anim']['frameDx'] + w, m['y'] + h))
                      for k in sorted(set(m['anim']['frames']))]
        tiles.append((tid, frames))
    tag = ('_' + flt) if flt else ''
    width = 1500 if scale <= 3 else 1700
    if objs:
        draw_sheet(objs, scale, width, 'contact_objects%s_%dx.png' % (tag, scale))
    if tiles:
        draw_sheet(tiles, scale, width, 'contact_tiles%s_%dx.png' % (tag, scale))


if __name__ == '__main__':
    main(sys.argv)
