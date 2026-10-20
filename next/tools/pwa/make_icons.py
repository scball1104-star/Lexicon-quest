"""Generate the PWA icons from the logo and the hero portrait (W6-pwa).

  python next/tools/pwa/make_icons.py            writes next/assets/icons/*.png and a 3x preview sheet in tools/pwa/out/

Sources (read only):  assets/ui/logo.png (frame "logo" from logo.json) and assets/sprites/portraits.png
(frame "hero_48" from portraits.json). Colors are the palette.json ramps (ink, gold).

Outputs, all PNG:
  icon-192.png, icon-512.png                  manifest purpose "any": rounded square, transparent corners
  icon-maskable-192.png, icon-maskable-512.png  purpose "maskable": full bleed, art kept inside the 80 % safe circle
  apple-touch-icon.png (180)                   iOS home screen: full bleed, opaque (iOS rounds the corners itself)
  favicon-32.png                               browser tab

The art is drawn once at 512 px with the portrait at 6x (or 5x for the maskable safe zone) nearest-neighbor, so the
pixels stay square, then the smaller sizes are Lanczos downscales of that master.
"""
import json
import math
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parents[1]
OUT_DIR = NEXT / 'assets' / 'icons'
PREVIEW = HERE / 'out'

INK = {'deep': (13, 10, 22), 'dark': (20, 16, 30), 'low': (26, 19, 52), 'mid': (41, 38, 87), 'high': (63, 65, 134), 'glow': (113, 98, 189)}
GOLD = {'shade': (143, 85, 51), 'dark': (195, 131, 52), 'mid': (235, 161, 77), 'light': (249, 215, 122), 'pale': (255, 247, 214)}


def frame_of(json_path, name):
    j = json.loads(json_path.read_text(encoding='utf-8'))
    x, y, w, h = j['frames'][name][:4]
    return j.get('image', ''), (x, y, x + w, y + h)


def load_sources():
    img, box = frame_of(NEXT / 'assets' / 'sprites' / 'portraits.json', 'hero_48')
    portrait = Image.open(NEXT / 'assets' / 'sprites' / img).convert('RGBA').crop(box)
    img, box = frame_of(NEXT / 'assets' / 'ui' / 'logo.json', 'logo')
    logo = Image.open(NEXT / 'assets' / 'ui' / img).convert('RGBA').crop(box)
    return portrait, logo


def background(size):
    """Indigo vertical gradient with a soft glow behind the portrait and a few gold motes (deterministic)."""
    y = np.linspace(0, 1, size)[:, None]
    top, bot = np.array(INK['low'], float), np.array(INK['deep'], float)
    base = top[None, None, :] * (1 - y[:, :, None]) + bot[None, None, :] * y[:, :, None]
    base = np.repeat(base, size, axis=1)
    yy, xx = np.mgrid[0:size, 0:size]
    d = np.hypot((xx - size * 0.5) / (size * 0.52), (yy - size * 0.40) / (size * 0.46))
    glow = np.clip(1 - d, 0, 1) ** 1.6
    base = base * (1 - 0.85 * glow[:, :, None]) + np.array(INK['mid'], float)[None, None, :] * 0.85 * glow[:, :, None]
    im = Image.fromarray(np.clip(base, 0, 255).astype('uint8'), 'RGB').convert('RGBA')
    px = im.load()
    seed = 7
    k = size / 512
    for _ in range(26):
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        mx = seed % size
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        my = seed % size
        col = GOLD['dark'] if seed & 8 else INK['high']
        s = max(1, round(3 * k))
        for dx in range(s):
            for dy in range(s):
                if 0 <= mx + dx < size and 0 <= my + dy < size:
                    px[mx + dx, my + dy] = col + (255,)
    return im


def gold_frame(im, box, t):
    """A gold bevel around box=(x0,y0,x1,y1), t px thick: bright top-left, dark bottom-right."""
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = box
    for i in range(t):
        col = GOLD['pale'] if i == 0 else GOLD['light'] if i < t - 1 else GOLD['mid']
        d.line([(x0 - 1 - i, y0 - 1 - i), (x1 + i, y0 - 1 - i)], fill=col + (255,))
        d.line([(x0 - 1 - i, y0 - 1 - i), (x0 - 1 - i, y1 + i)], fill=col + (255,))
        dark = GOLD['dark'] if i < t - 1 else GOLD['shade']
        d.line([(x0 - 1 - i, y1 + i), (x1 + i, y1 + i)], fill=dark + (255,))
        d.line([(x1 + i, y0 - 1 - i), (x1 + i, y1 + i)], fill=dark + (255,))


def compose_master(portrait, logo, maskable):
    S = 512
    im = background(S)
    pk = 5 if maskable else 6
    pw = 48 * pk
    gap = 18
    block_h = pw + gap + logo.height
    top = (S - block_h) // 2 - (4 if maskable else 0)
    px0 = (S - pw) // 2
    # Soft drop shadow under the portrait, then the portrait, its gold frame, the wordmark.
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([px0 + 6, top + 10, px0 + pw + 6, top + pw + 10], fill=(0, 0, 0, 150))
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))
    im.alpha_composite(portrait.resize((pw, pw), Image.NEAREST), (px0, top))
    gold_frame(im, (px0, top, px0 + pw - 1, top + pw - 1), 5 if not maskable else 4)
    lx = (S - logo.width) // 2
    ly = top + pw + gap
    im.alpha_composite(logo, (lx, ly))
    return im


def rounded(im, radius):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=radius, fill=255)
    out = im.copy()
    out.putalpha(mask)
    return out


def main():
    portrait, logo = load_sources()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    any_master = compose_master(portrait, logo, False)
    mask_master = compose_master(portrait, logo, True)
    any_master = rounded(any_master, 96)
    written = {}

    def save(name, im, size):
        out = im if im.width == size else im.resize((size, size), Image.LANCZOS)
        out.save(OUT_DIR / name, optimize=True)
        written[name] = out

    save('icon-512.png', any_master, 512)
    save('icon-192.png', any_master, 192)
    save('icon-maskable-512.png', mask_master, 512)
    save('icon-maskable-192.png', mask_master, 192)
    save('apple-touch-icon.png', mask_master.convert('RGB').convert('RGBA'), 180)
    save('favicon-32.png', compose_master(portrait, logo, False).resize((32, 32), Image.LANCZOS), 32)

    # Preview: every icon on a gray card, maskable shown under a circular mask as Android would crop it.
    sheet = Image.new('RGBA', (1180, 560), (58, 58, 64, 255))
    x = 20
    for name in ['icon-512.png', 'icon-maskable-512.png']:
        sheet.alpha_composite(written[name].resize((340, 340), Image.LANCZOS), (x, 20))
        x += 360
    circ = written['icon-maskable-512.png'].resize((340, 340), Image.LANCZOS)
    m = Image.new('L', (340, 340), 0)
    ImageDraw.Draw(m).ellipse([0, 0, 339, 339], fill=255)
    circ.putalpha(m)
    sheet.alpha_composite(circ, (x, 20))
    x = 20
    for name in ['icon-192.png', 'icon-maskable-192.png', 'apple-touch-icon.png', 'favicon-32.png']:
        sheet.alpha_composite(written[name], (x, 380 if name != 'favicon-32.png' else 428))
        x += written[name].width + 24
    sheet.convert('RGB').save(PREVIEW / 'icons_preview.png')
    for n, im in written.items():
        print(f'{n}: {im.width}x{im.height}, {(OUT_DIR / n).stat().st_size} bytes')


if __name__ == '__main__':
    main()
