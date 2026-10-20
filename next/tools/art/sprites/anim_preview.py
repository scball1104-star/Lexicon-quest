"""Contact sheets of the derived battle frames at 4x.

    python anim_preview.py [id ...]   straight from the generator (no atlas write): out/anim_<id>_4x.png
                                      (ids: the enemies, archivore, echo_warden, lost_page)
    python anim_preview.py --atlas    from the BUILT atlases, origin-aligned: out/anim_atlas_<stem>_<k>x.png
"""
import os, sys, json
import numpy as np
from PIL import Image
from pix import OUT, DST, contact
import anim_frames as AF


def load_atlas(name):
    with open(os.path.join(DST, name + '.json'), encoding='utf-8') as f:
        j = json.load(f)
    im = Image.open(os.path.join(DST, name + '.png')).convert('RGBA')
    return j, np.asarray(im, np.float32) / 255


def frame(j, a, n):
    x, y, w, h = j['frames'][n]
    return a[y:y + h, x:x + w].copy()


def derive(eid):
    """(base, {suffix: (img, ox, oy)}) for any battle id"""
    if eid in AF.ENEMY_RECIPES:
        j, a = load_atlas('enemies_battle')
        base = frame(j, a, eid)
        return base, AF.derive_enemy(eid, base)
    j, a = load_atlas('bosses_battle')
    if eid == 'archivore':
        base = frame(j, a, eid)
        return base, AF.archivore_frames(base)
    if eid == 'echo_warden':
        base = frame(j, a, eid)
        return base, AF.echo_warden_frames(base)
    if eid == 'lost_page':
        base = frame(j, a, 'lost_page_1')
        return base, AF.lost_page_frames(base)
    raise KeyError(eid)


def sheet(eid, scale=4, cols=8):
    base, fr = derive(eid)
    items = [(eid, AF.canvas(base))]
    for n in AF.ORDER:
        if n in fr:
            items.append((n, fr[n][0]))
    p = os.path.join(OUT, f'anim_{eid}_{scale}x.png')
    contact(items, p, scale=scale, cols=cols, bg=(92, 96, 124), title=f'{eid}: base + derived frames at {scale}x (padded canvas, origin aligned)')
    return p


ALL = list(AF.ENEMY_RECIPES) + ['archivore', 'echo_warden', 'lost_page']

def atlas_sheets(scale=4):
    """Contact sheets straight from the BUILT atlases (what ships): every frame of each enemy / boss stem, drawn
    origin-aligned on one baseline, and the party extras. out/anim_atlas_<stem>_<scale>x.png"""
    from PIL import Image, ImageDraw
    paths = []
    for name in ('enemies_battle', 'bosses_battle'):
        j, a = load_atlas(name)
        stems = [n for n in ('ink_slime', 'page_wraith', 'briar_wolf', 'moss_scarab', 'bookmite', 'tome_golem', 'ink_wraith', 'archivore', 'echo_warden', 'lost_page') if n in j['frames']]
        for stem in stems:
            names = [stem] + [f'{stem}_{s}' for s in AF.ORDER if f'{stem}_{s}' in j['frames']]
            if len(names) == 1:
                continue
            fr = [(n, frame(j, a, n), j['origin'][n]) for n in names]
            L = max(o[0] for _, _, o in fr); R = max(f.shape[1] - o[0] for _, f, o in fr)
            T = max(o[1] for _, _, o in fr); B = max(f.shape[0] - o[1] for _, f, o in fr)
            cw, ch = L + R, T + B
            s = scale if cw * scale * min(8, len(fr)) < 6000 else 2
            cols = min(8 if s == 4 else 6, len(fr))
            rows = (len(fr) + cols - 1) // cols
            img = Image.new('RGB', ((cw * s + 8) * cols, (ch * s + 22) * rows + 18), (92, 96, 124))
            d = ImageDraw.Draw(img)
            d.text((4, 3), f'{stem}: atlas frames at {s}x, origin-aligned (feet on the line)', fill=(240, 240, 220))
            for i, (n, f, o) in enumerate(fr):
                x0 = (i % cols) * (cw * s + 8) + 4; y0 = (i // cols) * (ch * s + 22) + 18
                tile = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
                tile.alpha_composite(Image.fromarray((f * 255 + 0.5).astype('uint8'), 'RGBA'), (L - o[0], T - o[1]))
                img.paste(tile.resize((cw * s, ch * s), Image.NEAREST), (x0, y0), tile.resize((cw * s, ch * s), Image.NEAREST))
                d.line([(x0, y0 + T * s), (x0 + cw * s, y0 + T * s)], fill=(140, 150, 180))
                d.text((x0 + 2, y0 + ch * s + 4), n, fill=(235, 235, 210))
            p = os.path.join(OUT, f'anim_atlas_{stem}_{s}x.png')
            img.save(p)
            paths.append(p)
    j, a = load_atlas('party_battle')
    items = [(n, frame(j, a, n)) for n in j['frames'] if n.endswith(('_crit', '_combo', '_levelup')) and n.count('_') == 2]
    p = os.path.join(OUT, f'anim_atlas_party_extras_{scale}x.png')
    contact(items, p, scale=scale, cols=6, title=f'party_battle W6 extras at {scale}x (crit, combo, levelup per weapon)')
    paths.append(p)
    return paths


if __name__ == '__main__':
    if sys.argv[1:] == ['--atlas']:
        for p in atlas_sheets():
            print(p)
    else:
        for eid in (sys.argv[1:] or ALL):
            print(sheet(eid, 2 if eid in ('archivore',) else 4, 4 if eid == 'archivore' else 8))
