"""render an atlas frame with a coordinate grid (for placing hand fixes)"""
import sys, json
from pix import *
from PIL import ImageDraw, ImageFont
def gridview(a, scale, path, x0=0, y0=0):
    h, w = a.shape[:2]
    bgc = on_bg(a, (60, 80, 60))
    img = upscale(bgc, scale).convert('RGB')
    pad = 22
    canvas = Image.new('RGB', (img.size[0] + pad, img.size[1] + pad), (30, 30, 30))
    canvas.paste(img, (pad, pad))
    d = ImageDraw.Draw(canvas)
    f = ImageFont.load_default()
    for x in range(w + 1):
        col = (255, 60, 60) if (x + x0) % 5 == 0 else (0, 0, 0)
        d.line([(pad + x * scale, pad), (pad + x * scale, pad + h * scale)], fill=col)
        if (x + x0) % 5 == 0 and x < w: d.text((pad + x * scale + 1, 2), str(x + x0), fill=(255, 255, 0), font=f)
    for y in range(h + 1):
        col = (255, 60, 60) if (y + y0) % 5 == 0 else (0, 0, 0)
        d.line([(pad, pad + y * scale), (pad + w * scale, pad + y * scale)], fill=col)
        if (y + y0) % 5 == 0 and y < h: d.text((1, pad + y * scale + 1), str(y + y0), fill=(255, 255, 0), font=f)
    canvas.save(path)
if __name__ == '__main__':
    atlas, name = sys.argv[1], sys.argv[2]
    scale = int(sys.argv[3]) if len(sys.argv) > 3 else 12
    crop = [int(v) for v in sys.argv[4].split(',')] if len(sys.argv) > 4 else None
    meta = json.load(open(os.path.join(DST, atlas + '.json')))
    sheet = from_pil(Image.open(os.path.join(DST, meta['image'])))
    fr = meta['frames'] if 'frames' in meta else {k: v['frame'] for k, v in meta['objects'].items()}
    x, y, w, h = fr[name]
    a = sheet[y:y + h, x:x + w]
    ox = oy = 0
    if crop:
        cx0, cy0, cx1, cy1 = crop
        a = a[cy0:cy1, cx0:cx1]; ox, oy = cx0, cy0
    gridview(a, scale, os.path.join(OUT, 'grid_' + name + '.png'), ox, oy)
