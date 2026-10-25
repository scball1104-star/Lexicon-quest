"""Party field sprites -> assets/sprites/party_field.png/.json (24x32 cells).

Layout: one 4-row block per character (rows down, left, right, up), columns stand, step A, step B, blink.
Run: python build_party_field.py
"""
import sys, os, importlib
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars'))
from pix import *
import pal as P
import walk as W

CHARS = ['hero', 'mira', 'bram']
DIRS = ['down', 'left', 'right', 'up']
CELL = (24, 32)


def char_frames(name):
    mod = importlib.import_module(name)
    leg = P.resolve(mod.PAL, name)
    g = lambda txt: parse_grid(grid_from_text(txt), leg, w=24)
    out = {}
    for d, src in (('down', 'DOWN'), ('up', 'UP'), ('left', 'LEFT')):
        st = g(getattr(mod, src))
        assert st.shape[:2] == (32, 24), (name, d, st.shape)
        spec = mod.WALK[d]
        if 'region' in spec:
            a = W.side_step(st, spec, g(mod.LEFT_A))
            b = W.side_step(st, spec, g(mod.LEFT_B))
        else:
            a = W.front_step(st, spec, 1)
            b = W.front_step(st, spec, 0)
        bl = st.copy()
        for (x, y, ch) in mod.BLINK.get(d, []):
            c = hex2rgb(leg[ch]); bl[y, x] = (c[0] / 255, c[1] / 255, c[2] / 255, 1)
        out[d] = [st, a, b, bl]
    out['right'] = [flip_x(f) for f in out['left']]
    return out


def build():
    frames = []
    anims = {}
    names = {}
    for c in CHARS:
        fr = char_frames(c)
        names[c] = fr
        for d in DIRS:
            for i, f in enumerate(fr[d]):
                n = f'{c}_{d}_{i}' if i < 3 else f'{c}_{d}_blink'
                frames.append((n, f))
            anims[f'{c}_walk_{d}'] = {'frames': [f'{c}_{d}_1', f'{c}_{d}_0', f'{c}_{d}_2', f'{c}_{d}_0'], 'fps': 8, 'loop': True}
            anims[f'{c}_idle_{d}'] = {'frames': [f'{c}_{d}_0'] * 22 + [f'{c}_{d}_blink'] + [f'{c}_{d}_0'], 'fps': 8, 'loop': True}
    import bram_grey as BG
    if BG.ENABLED:          # the single Bram-grey flag (bram_grey.py; default OFF, Scott's decision pending)
        frames = [(n, BG.apply(f) if n.startswith('bram_') else f) for n, f in frames]
    sheet, rects = pack_rows(frames, CELL, 4)
    save_png(sheet, os.path.join(DST, 'party_field.png'))
    meta = {'image': 'party_field.png', 'cell': list(CELL), 'origin': [12, 31],
            'layout': 'per character a 4-row block (down, left, right, up); columns stand, stepA, stepB, blink',
            'frames': rects, 'anims': anims}
    write_json(os.path.join(DST, 'party_field.json'), meta)
    # contact sheets
    items = [(n, f) for n, f in frames]
    contact(items, os.path.join(OUT, 'party_field_4x.png'), scale=4, cols=8, title='party_field 4x: stand, stepA, stepB, blink')
    seq = []
    for c in CHARS:
        for d in DIRS:
            f = names[c][d]
            seq += [(f'{c} {d}', f[1]), ('', f[0]), ('', f[2]), ('', f[0])]
    contact(seq, os.path.join(OUT, 'party_walk_strip_4x.png'), scale=4, cols=16, title='walk cycle (A, stand, B, stand) at 8 fps')
    # animated gif
    gif = []
    for k in range(8):
        canvas = Image.new('RGB', (12 * 28 * 3, 32 * 3 + 6), (86, 128, 70))
        x = 0
        for c in CHARS:
            for d in DIRS:
                f = names[c][d][[1, 0, 2, 0][k % 4]]
                t = upscale(f, 3)
                canvas.paste(t, (x, 3), t); x += 28 * 3
        gif.append(canvas)
    gif[0].save(os.path.join(OUT, 'party_walk_3x.gif'), save_all=True, append_images=gif[1:], duration=125, loop=0)
    # 1x/2x on a grass colour to judge real size
    strip = blank(12 * 26, 32)
    x = 0
    for c in CHARS:
        for d in DIRS:
            paste(strip, names[c][d][0], x, 0); x += 26
    sb = on_bg(strip, (90, 144, 50))
    im = Image.new('RGB', (sb.shape[1] * 3 + 10, sb.shape[0] * 6 + 10), (90, 144, 50))
    im.paste(upscale(sb, 1), (0, 0)); im.paste(upscale(sb, 2), (0, 36)); im.paste(upscale(sb, 3), (0, 36 + 68))
    im.save(os.path.join(OUT, 'party_field_1x2x3x.png'))
    return meta


if __name__ == '__main__':
    m = build()
    print('party_field frames', len(m['frames']))
