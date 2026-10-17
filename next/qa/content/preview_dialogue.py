"""Render Episode 1 dialogue boxes the way the game will show them, for review.

Uses the real bitmap font and window skin from assets/ui (W1-ui-art), the window gradient spec in
window.json, and painted key art / portraits from ../assets/art as stand-ins until the in-game backdrops
and 48x48 portraits exist. Output: qa/content/out/dialogue_<scene>.png at 3x, nearest neighbor.

  python qa/content/preview_dialogue.py mael_intro mira_joins south_gate ...
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.dirname(os.path.dirname(HERE))
REPO = os.path.dirname(NEXT)
OUT = os.path.join(HERE, 'out')
W, H, SCALE = 384, 216, 3
HERO = 'Wolfgang'  # an 8-letter name, the longest the script is written for

COLORS = {'gold': (249, 215, 122), 'cyan': (126, 224, 232), 'red': (240, 110, 100), 'white': (248, 248, 240)}
SHADOW = (20, 16, 30)


def load_font():
    meta = json.load(open(os.path.join(NEXT, 'assets', 'ui', 'font.json'), encoding='utf-8'))
    img = Image.open(os.path.join(NEXT, 'assets', 'ui', meta['image'])).convert('RGBA')
    return meta, img


def tinted(glyph, color):
    solid = Image.new('RGBA', glyph.size, color + (255,))
    solid.putalpha(glyph.getchannel('A'))
    return solid


def parse(text):
    """Split into (char, colorName) pairs, honoring {c:name}..{/c}."""
    out, color, i = [], 'white', 0
    while i < len(text):
        if text.startswith('{c:', i):
            j = text.index('}', i)
            color = text[i + 3:j]
            i = j + 1
            continue
        if text.startswith('{/c}', i):
            color = 'white'
            i += 4
            continue
        out.append((text[i], color))
        i += 1
    return out


def width(font, s):
    meta = font[0]
    w, prev = 0, ''
    for ch in s:
        if ch == ' ':
            w += meta['spaceAdvance']
        else:
            g = meta['glyphs'].get(ch)
            w += g[6] if g else 6
            w += meta.get('kerning', {}).get(prev + ch, 0)
        prev = ch
    return w


def wrap(font, text, max_w):
    plain = ''.join(c for c, _ in parse(text))
    words, lines, line = plain.split(' '), [], ''
    for word in words:
        cand = word if not line else line + ' ' + word
        if width(font, cand) <= max_w:
            line = cand
        else:
            lines.append(line)
            line = word
    lines.append(line)
    # Re-attach colors by walking the parsed stream in step with the wrapped plain text.
    stream = parse(text)
    colored, k = [], 0
    for ln in lines:
        row = []
        for _ in ln:
            while k < len(stream) and stream[k][0] == ' ' and (not row):
                k += 1
            row.append(stream[k])
            k += 1
        while k < len(stream) and stream[k][0] == ' ':
            k += 1
        colored.append(row)
    return colored


def draw_text(canvas, font, row, x, y):
    meta, img = font
    prev = ''
    for ch, color in row:
        if ch == ' ':
            x += meta['spaceAdvance']
            prev = ch
            continue
        g = meta['glyphs'].get(ch)
        if not g:
            x += 6
            continue
        gx, gy, gw, gh, xo, yo, adv = g
        x += meta.get('kerning', {}).get(prev + ch, 0)
        glyph = img.crop((gx, gy, gx + gw, gy + gh))
        canvas.alpha_composite(tinted(glyph, SHADOW), (x + xo + 1, y + yo + 1))
        canvas.alpha_composite(tinted(glyph, COLORS.get(color, COLORS['white'])), (x + xo, y + yo))
        x += adv
        prev = ch


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def window(canvas, x, y, w, h, skin, scheme='blue', alpha=0.92):
    meta, img = skin
    fr = meta['frames']['std']
    inset = fr['fillInset']
    cols = meta['colors'][scheme]
    top, mid, bot = hexrgb(cols['top']), hexrgb(cols['mid']), hexrgb(cols['bottom'])
    fill = Image.new('RGBA', (w - 2 * inset, h - 2 * inset))
    fh = fill.size[1]
    d = ImageDraw.Draw(fill)
    for r in range(fh):
        t = r / max(1, fh - 1)
        if t < 0.45:
            a, b, u = top, mid, t / 0.45
        else:
            a, b, u = mid, bot, (t - 0.45) / 0.55
        c = tuple(round(a[i] + (b[i] - a[i]) * u) for i in range(3))
        d.line([(0, r), (fill.size[0], r)], fill=c + (round(255 * alpha),))
    canvas.alpha_composite(fill, (x + inset, y + inset))
    rx, ry, rw, rh = fr['rect']
    bl, bt, br, bb = fr['border']
    src = img.crop((rx, ry, rx + rw, ry + rh))

    def piece(sx, sy, sw, sh, dx, dy, dw, dh):
        if dw <= 0 or dh <= 0:
            return
        p = src.crop((sx, sy, sx + sw, sy + sh)).resize((dw, dh), Image.NEAREST)
        canvas.alpha_composite(p, (dx, dy))
    piece(0, 0, bl, bt, x, y, bl, bt)
    piece(rw - br, 0, br, bt, x + w - br, y, br, bt)
    piece(0, rh - bb, bl, bb, x, y + h - bb, bl, bb)
    piece(rw - br, rh - bb, br, bb, x + w - br, y + h - bb, br, bb)
    piece(bl, 0, rw - bl - br, bt, x + bl, y, w - bl - br, bt)
    piece(bl, rh - bb, rw - bl - br, bb, x + bl, y + h - bb, w - bl - br, bb)
    piece(0, bt, bl, rh - bt - bb, x, y + bt, bl, h - bt - bb)
    piece(rw - br, bt, br, rh - bt - bb, x + w - br, y + bt, br, h - bt - bb)


def backdrop(scene):
    env = Image.open(os.path.join(REPO, 'assets', 'art', 'environments.png')).convert('RGB')
    cw, ch = env.size[0] // 2, env.size[1] // 4
    cell = 0 if not scene.startswith(('archive', 'thirteenth', 'lantern', 'echo', 'find_letter', 'boss')) else 1
    img = env.crop(((cell % 2) * cw, (cell // 2) * ch, (cell % 2 + 1) * cw, (cell // 2 + 1) * ch))
    img = img.resize((W, H), Image.BOX).convert('RGBA')
    shade = Image.new('RGBA', (W, H), (10, 8, 20, 70))
    img.alpha_composite(shade)
    return img


PORTRAIT_CELL = {'hero': 0, 'mira': 1, 'bram': 2, 'mael': 3}


def portrait(pid):
    if pid not in PORTRAIT_CELL:
        return None
    src = Image.open(os.path.join(REPO, 'assets', 'art', 'portraits.png')).convert('RGB')
    cw, ch = src.size[0] // 4, src.size[1] // 2
    i = PORTRAIT_CELL[pid]
    cell = src.crop((i * cw, 0, (i + 1) * cw, ch))
    side = min(cell.size)
    cell = cell.crop(((cell.size[0] - side) // 2, 0, (cell.size[0] - side) // 2 + side, side))
    return cell.resize((48, 48), Image.BOX).convert('RGBA')


def render_box(font, skin, box, scene):
    canvas = backdrop(scene)
    x, y, w, h = 6, H - 6 - 52, W - 12, 52
    window(canvas, x, y, w, h, skin)
    tx = x + 8
    p = portrait(box['portrait']) if box.get('portrait') else None
    if p:
        canvas.alpha_composite(p, (x + 3, y + 2))
        tx = x + 3 + 48 + 7
    max_w = x + w - 8 - tx
    text = box['text'].replace('{hero}', HERO)
    rows = wrap(font, text, max_w)
    for i, row in enumerate(rows[:3]):
        draw_text(canvas, font, row, tx, y + 7 + i * 11)
    name = box['name'].replace('{hero}', HERO)
    if name:
        nw = width(font, name) + 14
        window(canvas, x + 2, y - 15, nw, 17, skin)
        draw_text(canvas, font, parse(name), x + 9, y - 11)
    overflow = len(rows) > 3
    return canvas, overflow, max_w


def main():
    ids = sys.argv[1:] or ['mael_intro', 'mira_joins', 'south_gate', 'archive_door', 'archivore']
    boxes = json.loads(subprocess.run(['node', os.path.join('qa', 'content', '_boxes.mjs'), *ids], cwd=NEXT,
                                      capture_output=True, text=True, timeout=60, check=True).stdout)
    font = load_font()
    skin = (json.load(open(os.path.join(NEXT, 'assets', 'ui', 'window.json'), encoding='utf-8')),
            Image.open(os.path.join(NEXT, 'assets', 'ui', 'window.png')).convert('RGBA'))
    os.makedirs(OUT, exist_ok=True)
    by_scene = {}
    for b in boxes:
        by_scene.setdefault(b['scene'], []).append(b)
    bad = 0
    for scene, items in by_scene.items():
        frames = []
        for b in items:
            img, overflow, _ = render_box(font, skin, b, scene)
            bad += overflow
            frames.append(img.crop((0, H - 80, W, H)))  # the bottom band holds the window
        cols = 2
        rows = (len(frames) + cols - 1) // cols
        sheet = Image.new('RGBA', (W * cols, 80 * rows), (0, 0, 0, 255))
        for i, f in enumerate(frames):
            sheet.alpha_composite(f, ((i % cols) * W, (i // cols) * 80))
        sheet = sheet.resize((sheet.size[0] * 2, sheet.size[1] * 2), Image.NEAREST)
        path = os.path.join(OUT, f'dialogue_{scene}.png')
        sheet.convert('RGB').save(path)
        print(path, len(frames), 'boxes')
    # One full-screen frame at 3x for the overall look.
    full, _, max_w = render_box(font, skin, by_scene[ids[0]][0], ids[0])
    full = full.resize((W * SCALE, H * SCALE), Image.NEAREST)
    full.convert('RGB').save(os.path.join(OUT, f'dialogue_full_{ids[0]}.png'))
    print('text width', max_w, 'px; boxes over 3 lines:', bad)


if __name__ == '__main__':
    main()
