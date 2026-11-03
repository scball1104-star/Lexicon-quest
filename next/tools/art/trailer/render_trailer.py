"""Render the 30 s title trailer (brief: reports/lexicon_quest_media_upgrade/trailer/brief_trailer.md, 30 s cut).

    python render_trailer.py OUT_DIR [--clip downs.webm] [--format wide|tall|square|all] [--stills]

Everything is the 384 by 216 game frame drawn with the game's own assets (painted cards, title backdrop, logo,
bitmap fonts) and the gate's desktop captures (qa/out/desktop-*.png, 5x the game frame), scaled up with no
smoothing. Stills push in slowly (resampled at output size so the motion stays smooth). The opening is the Downs
Runway clip from the video test, already quantized to the game palette. Audio = the Suno Pro title theme plus the
thirteenth toll at 0:06. Formats: wide 1920x1080 (5x, text over the picture), tall 1152x2048 and square 1152x1152
(3x, the frame centred, text in the bands). Read-only on the game; needs ffmpeg (imageio_ffmpeg's binary is found)."""
import argparse, json, os, shutil, subprocess, sys
from PIL import Image, ImageDraw

NEXT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
A = lambda *p: os.path.join(NEXT, 'assets', *p)
FPS = 30
GW, GH = 384, 216
ADDRESS = 'scball1104-star.github.io/Lexicon-quest/next'

# (start s, end s, picture, zoom from, zoom to). Pictures: ('clip',), ('img', path), ('black',)
SHOTS = [
    (0.0, 1.0, ('black',), 1.0, 1.0),
    (1.0, 5.0, ('clip',), 1.0, 1.0),
    (5.0, 8.0, ('img', A('backdrops', 'paint_card_bell_tower.png')), 1.0, 1.06),
    (8.0, 14.0, ('img', os.path.join(NEXT, 'qa', 'out', 'desktop-field_town_morning.png')), 1.0, 1.05),
    (14.0, 16.5, ('img', os.path.join(NEXT, 'qa', 'out', 'desktop-battle_command.png')), 1.02, 1.0),
    (16.5, 20.0, ('img', os.path.join(NEXT, 'qa', 'out', 'desktop-battle_boss.png')), 1.0, 1.04),
    (20.0, 25.0, ('img', A('backdrops', 'paint_card_bells.png')), 1.0, 1.06),
    (25.0, 30.0, ('img', A('backdrops', 'title.png')), 1.04, 1.0),
]
# (start s, end s, text, font, band) - band darkens behind the line where the picture is busy (gameplay)
LINES = [
    (2.0, 5.0, 'In Aethelgard, every name is a promise.', 'large', False),
    (8.6, 13.8, 'In the river town of Willowmere, names are fading from the signs.', 'large', True),
    (20.4, 24.8, 'And in a tower that holds twelve bells, a thirteenth has begun to ring.', 'large', False),
    (26.2, 30.0, 'Play it now, free, in your browser.', 'large', False),
    (26.8, 30.0, ADDRESS, 'small', False),
]
LOGO_IN = 25.4
TOLL_AT = 6.0
DUR = 30.0
XFADE = 0.3  # seconds of cross-dissolve into each shot after the first


def find_ffmpeg():
    w = shutil.which('ffmpeg')
    if w:
        return w
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


class Font:
    def __init__(self, name):
        meta = json.load(open(A('ui', name + '.json'), encoding='utf-8'))
        self.img = Image.open(A('ui', meta['image'])).convert('RGBA')
        self.lh, self.space, self.g = meta['lineHeight'], meta['spaceAdvance'], meta['glyphs']

    def width(self, s):
        return sum(self.space if c == ' ' else (self.g[c][6] if c in self.g else self.space) for c in s)

    def wrap(self, s, maxw):
        out, cur = [], ''
        for word in s.split(' '):
            t = (cur + ' ' + word).strip()
            if cur and self.width(t) > maxw:
                out.append(cur); cur = word
            else:
                cur = t
        return out + [cur]

    def mask(self, s):
        """One line as an L mask (glyph coverage), its width and the line height."""
        m = Image.new('L', (max(1, self.width(s)), self.lh), 0)
        x = 0
        for c in s:
            if c == ' ' or c not in self.g:
                x += self.space; continue
            gx, gy, gw, gh, ox, oy, adv = self.g[c]
            m.paste(self.img.crop((gx, gy, gx + gw, gy + gh)).getchannel('A'), (x + ox, oy))
            x += adv
        return m


def draw_text(layer, font, s, cx, top, alpha, maxw, band=False, color=(255, 244, 222), k=1):
    """Centered lines with a dark outline, glyphs k times native (whole pixels); returns the bottom y."""
    lines = font.wrap(s, maxw)
    y = top
    if band:
        h = len(lines) * font.lh * k + 6
        ImageDraw.Draw(layer).rectangle((0, top - 3, layer.width, top - 3 + h), fill=(8, 10, 20, int(150 * alpha)))
    for ln in lines:
        m = font.mask(ln)
        if k > 1:
            m = m.resize((m.width * k, m.height * k), Image.NEAREST)
        x = cx - m.width // 2
        ink = Image.new('RGBA', m.size, color + (0,))
        ink.putalpha(m.point(lambda v: int(v * alpha)))
        dark = Image.new('RGBA', m.size, (12, 10, 24, 0))
        dark.putalpha(m.point(lambda v: int(v * alpha)))
        for dx, dy in ((-k, 0), (k, 0), (0, -k), (0, k), (k, k)):
            layer.alpha_composite(dark, (x + dx, y + dy))
        layer.alpha_composite(ink, (x, y))
        y += font.lh * k
    return y


def ramp(t, a, b, fade=0.35):
    if t < a or t >= b:
        return 0.0
    return max(0.0, min(1.0, (t - a) / fade, (b - t) / fade if b < DUR else 1.0))


def load_native(path):
    im = Image.open(path).convert('RGB')
    if im.size != (GW, GH):  # a 5x capture: back to the game frame
        im = im.resize((GW, GH), Image.NEAREST)
    return im


def decode_clip(ff, clip):
    p = subprocess.run([ff, '-v', 'error', '-i', clip, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, timeout=120, check=True)
    n = len(p.stdout) // (GW * GH * 3)
    return [Image.frombytes('RGB', (GW, GH), p.stdout[i * GW * GH * 3:(i + 1) * GW * GH * 3]) for i in range(n)]


def picture(shot, t, cache, clip_frames, scale):
    """The shot's picture at output scale (GW*scale by GH*scale) at time t."""
    a, b, src, z0, z1 = shot
    if src[0] == 'black':
        return Image.new('RGB', (GW * scale, GH * scale), (0, 0, 0))
    if src[0] == 'clip':
        f = clip_frames[min(len(clip_frames) - 1, int((t - a) * 12))]  # the clip plays at its own 12 fps
        base = f.resize((GW * scale, GH * scale), Image.NEAREST)
    else:
        key = (src[1], scale)
        if key not in cache:
            cache[key] = load_native(src[1]).resize((GW * scale, GH * scale), Image.NEAREST)
        base = cache[key]
    u = (t - a) / (b - a)
    z = z0 + (z1 - z0) * (u * u * (3 - 2 * u))
    if abs(z - 1) < 1e-4:
        return base
    W, H = base.size
    cw, ch = W / z, H / z
    box = ((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2)
    return base.resize((W, H), Image.LANCZOS, box=box)


def frame_picture(t, cache, clip_frames, scale):
    for i, s in enumerate(SHOTS):
        if s[0] <= t < s[1]:
            cur = picture(s, t, cache, clip_frames, scale)
            if i and t - s[0] < XFADE:
                prev = picture(SHOTS[i - 1], min(t, SHOTS[i - 1][1] - 1e-3), cache, clip_frames, scale)
                cur = Image.blend(prev, cur, (t - s[0]) / XFADE)
            if t > DUR - 0.8:  # the end fades to black with the theme
                cur = Image.blend(Image.new('RGB', cur.size), cur, max(0.0, (DUR - t) / 0.8))
            return cur
    return Image.new('RGB', (GW * scale, GH * scale))


FORMATS = {
    # name: (scale, native canvas w, h, frame top in native px)
    'wide': (5, GW, GH, 0),
    'tall': (3, GW, 683, 160),
    'square': (3, GW, 384, 64),
}


def overlay(fmt, t, fonts, logo, sub):
    """Text and logo at native canvas size (RGBA)."""
    _, cw, ch, top = FORMATS[fmt]
    layer = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    endfade = max(0.0, min(1.0, (DUR - t) / 0.8))
    wide = fmt == 'wide'
    for a, b, s, fname, band in LINES:
        al = ramp(t, a, b) * endfade
        if al <= 0:
            continue
        f = fonts[fname]
        if fmt == 'tall':  # a phone held upright: glyphs at 2x in the band under the frame, the address in the large font
            if s == ADDRESS:
                draw_text(layer, fonts['large'], s, cw // 2, top + GH + 100, al, 370)
            else:
                draw_text(layer, f, s, cw // 2, top + GH + 22, al, 176, k=2)
            continue
        if s == ADDRESS:
            y = 186 if wide else top + GH + (44 if fmt == 'tall' else 38)
        elif b > 25:
            y = 162 if wide else top + GH + (18 if fmt == 'tall' else 14)
        else:
            nl = len(f.wrap(s, 320 if wide else 340))
            y = (GH - 22 - nl * f.lh) if wide else top + GH + 16
            if wide and band is False and a < 3:
                y = GH // 2 - f.lh // 2
        draw_text(layer, f, s, cw // 2, y, al, 320 if wide else 340, band and wide)
    la = ramp(t, LOGO_IN, DUR, 0.6) * endfade
    if la > 0:
        ly = 30 if wide else (top - 60 - sub.height // 2 if fmt == 'tall' else top + 18)
        for im, yy in ((logo, ly), (sub, ly + logo.height + 2)):
            im2 = im.copy(); im2.putalpha(im.getchannel('A').point(lambda v: int(v * la)))
            layer.alpha_composite(im2, (cw // 2 - im.width // 2, yy))
    return layer


def render(fmt, out_dir, ff, clip_frames, audio, stills):
    scale, cw, ch, top = FORMATS[fmt]
    W, H = cw * scale, ch * scale
    if fmt == 'tall':
        H = 2048  # 683 * 3 = 2049: drop the last row so the encoder gets an even height
    fonts = {'large': Font('font_large'), 'small': Font('font')}
    lm = json.load(open(A('ui', 'logo.json'), encoding='utf-8'))['frames']
    li = Image.open(A('ui', 'logo.png')).convert('RGBA')
    logo = li.crop((lm['logo'][0], lm['logo'][1], lm['logo'][0] + lm['logo'][2], lm['logo'][1] + lm['logo'][3]))
    sub = li.crop((lm['subtitle'][0], lm['subtitle'][1], lm['subtitle'][0] + lm['subtitle'][2], lm['subtitle'][1] + lm['subtitle'][3]))
    out = os.path.join(out_dir, f'lexicon_quest_trailer_30s_{fmt}.mp4')
    cmd = [ff, '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-']
    cmd += audio + ['-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '192k', '-t', str(DUR), '-movflags', '+faststart', out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    cache = {}
    still_at = {int(s * FPS): n for n, s in (('1_opening', 3.5), ('2_town', 11.0), ('3_boss', 18.5), ('4_bells', 23.0), ('5_closing', 28.5))}
    for i in range(int(DUR * FPS)):
        t = i / FPS
        canvas = Image.new('RGB', (W, ch * scale), (0, 0, 0))
        canvas.paste(frame_picture(t, cache, clip_frames, scale), (0, top * scale))
        ov = overlay(fmt, t, fonts, logo, sub).resize((cw * scale, ch * scale), Image.NEAREST)
        canvas.paste(ov, (0, 0), ov)
        canvas = canvas.crop((0, 0, W, H))
        if stills and i in still_at:
            canvas.save(os.path.join(out_dir, f'still_{fmt}_{still_at[i]}.png'))
        p.stdin.write(canvas.tobytes())
    p.stdin.close()
    if p.wait(timeout=600) != 0:
        sys.exit(f'ffmpeg failed for {fmt}')
    print('TRAILER_WROTE:', out, os.path.getsize(out))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out_dir')
    ap.add_argument('--clip', required=True, help='the Downs clip, 384x216 at 12 fps')
    ap.add_argument('--format', default='all', choices=['wide', 'tall', 'square', 'all'])
    ap.add_argument('--stills', action='store_true')
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    ff = find_ffmpeg()
    clip_frames = decode_clip(ff, a.clip)
    music, toll = A('audio', 'music', 'title.mp3'), A('audio', 'sfx', 'bell_thirteenth.wav')
    ms = int(TOLL_AT * 1000)
    # ffmpeg inputs: 0 = the frames, 1 = the toll, 2 = the theme
    audio = ['-i', toll, '-i', music, '-filter_complex',
             f'[1:a]adelay={ms}|{ms},volume=0.9[b];[2:a]afade=t=out:st={DUR - 3}:d=3[m];[m][b]amix=inputs=2:normalize=0,'
             f'atrim=0:{DUR}[a]']
    for fmt in (['wide', 'tall', 'square'] if a.format == 'all' else [a.format]):
        render(fmt, a.out_dir, ff, clip_frames, audio, a.stills)


if __name__ == '__main__':
    main()
