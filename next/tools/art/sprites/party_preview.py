"""quick preview of one character's field frames + a walk strip"""
import sys, importlib
sys.path.insert(0, 'chars')
from pix import *
import pal as P
import walk as W

def build_char(mod, who):
    leg = P.resolve(mod.PAL, who)
    g = lambda n: parse_grid(grid_from_text(getattr(mod, n)), leg)
    frames = {}
    for d, src in (('down', 'DOWN'), ('up', 'UP'), ('left', 'LEFT')):
        st = g(src)
        spec = mod.WALK[d]
        if d == 'left':
            la = parse_grid(grid_from_text(mod.LEFT_A), leg)
            lb = parse_grid(grid_from_text(mod.LEFT_B), leg)
            a = W.side_step(st, spec, la); b = W.side_step(st, spec, lb)
        else:
            a = W.front_step(st, spec, 1); b = W.front_step(st, spec, 0)
        frames[d] = [st, a, b]
        if d in mod.BLINK:
            bl = st.copy()
            for (x, y, ch) in mod.BLINK[d]:
                c = hex2rgb(leg[ch]); bl[y, x] = (c[0]/255, c[1]/255, c[2]/255, 1)
            frames[d].append(bl)
    frames['right'] = [flip_x(f) for f in frames['left']]
    return frames

if __name__ == '__main__':
    name = sys.argv[1]
    mod = importlib.import_module(name)
    fr = build_char(mod, name)
    items = []
    for d in ('down', 'left', 'right', 'up'):
        for i, f in enumerate(fr[d]):
            items.append((f'{d}{i}', f))
    contact(items, os.path.join(OUT, f'prev_{name}_frames.png'), scale=6, cols=4)
    # walk strips: A, stand, B, stand per direction at 3x
    seq = []
    for d in ('down', 'left', 'right', 'up'):
        f = fr[d]
        seq += [(d, f[1]), ('', f[0]), ('', f[2]), ('', f[0])]
    contact(seq, os.path.join(OUT, f'prev_{name}_walk.png'), scale=4, cols=8)
    # animated gif at 4x, 8 fps
    gif = []
    for k in range(8):
        canvas = Image.new('RGB', (4 * 24 * 4 + 40, 32 * 4 + 8), (86, 128, 70))
        for di, d in enumerate(('down', 'left', 'right', 'up')):
            f = fr[d][[1, 0, 2, 0][k % 4]]
            canvas.paste(upscale(f, 4), (di * (24 * 4 + 10), 4), upscale(f, 4))
        gif.append(canvas)
    gif[0].save(os.path.join(OUT, f'prev_{name}_walk.gif'), save_all=True, append_images=gif[1:], duration=125, loop=0)
