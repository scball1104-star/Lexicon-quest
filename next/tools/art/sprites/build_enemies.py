"""Enemy battle sprites -> assets/sprites/enemies_battle.png/.json

Painted sources (../assets/art/enemies.png 4x2) are cut out, area-downscaled, quantized to a per-sprite
palette, recoloured per variant, re-quantized to k colours and snapped to the master palette, despeckled
with a majority filter (cleanup.py, CRITIQUE_1 C8), and given a 1 px outer outline in the darkest step of
each material's ramp. Feature fixes (eyes) are hand-placed pixels.
"""
import os
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import recolor as RC
from build_portraits import harmonize
import cleanup as CL

# id: (cell, target height, k, recolour fn, options)
ENEMIES = {
    'ink_slime':   dict(cell=0, h=48, k=14),
    'page_wraith': dict(cell=1, h=72, k=14, recolor='sepia', eyes=[(230, 68), (240, 68)], eye_col='magic_cyan:3', brow=False),
    'briar_wolf':  dict(cell=2, h=60, k=16, recolor='briar', flip=True, eyes=[(93, 233)], eye_col='gold:4', brow=True),
    'moss_scarab': dict(cell=3, h=50, k=16, flip=True),
    'bookmite':    dict(cell=3, h=38, k=12, recolor='sepia_mite', flip=True),
    'tome_golem':  dict(cell=4, h=88, k=16),
    'ink_wraith':  dict(cell=7, h=84, k=14, recolor='ink'),
}


def R(ref):
    return P.color(ref)


def recolour(a, how):
    if how in ('sepia', 'sepia_mite'):
        stops = [(0.0, R('ink:0')), (0.16, R('ink:1')), (0.30, R('ink:2')), (0.44, R('earth:2')),
                 (0.58, R('earth:4')), (0.72, R('path:3')), (0.86, R('sand:2')), (1.0, R('sand:3'))]
        if how == 'sepia_mite':
            stops = [(0.0, R('ink:0')), (0.14, R('ink:2')), (0.3, R('earth:1')), (0.46, R('earth:2')),
                     (0.62, R('earth:3')), (0.8, R('path:3')), (1.0, R('sand:3'))]
        if how == 'sepia':
            # glowing blue eyes stay, pushed to cyan glow
            keep = lambda L, C, h: (h > 220) & (h < 275) & (C > 0.13) & (L > 0.5)
            glow = lambda rgb: np.tile(np.array(hex2rgb(R('magic_cyan:3')), np.float32) / 255, (len(rgb), 1))
            return RC.gradient_map(a, stops, keep=keep, keep_fn=glow)
        keep = lambda L, C, h: (L > 0.97)
        return RC.gradient_map(a, stops, keep=keep)
    if how == 'ink':
        stops = [(0.0, R('ink:0')), (0.2, R('ink:1')), (0.4, R('ink:2')), (0.62, R('ink:3')),
                 (0.82, R('ink:4')), (1.0, R('magic_violet:3'))]
        keep = lambda L, C, h: (L > 0.97)
        return RC.gradient_map(a, stops, keep=keep)
    if how == 'briar':
        return RC.brown_green(a)
    return a


def make_enemy(eid, spec, src):
    obj = main_object(grid_cell(src, 4, 2, spec['cell']), keep_frac=0.04, max_dist=40)
    tw, th = fit_size(obj, th=spec['h'])
    d, pal = pixelize2(obj, tw, th, k=spec['k'], sharpen=0.0, max_de=0.10, ring=False)
    if spec.get('recolor'):
        d = recolour(d, spec['recolor'])     # maps the k quantized colours, so the count stays at k
    d = CL.snap_master(d, spec.get('snap', 0.04))
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 6)
    big = CL.ramp_outline(big)
    if spec.get('eyes'):
        # hand-placed eye accents mapped from the painting (they vanish in the area downscale)
        oh, ow = obj.shape[:2]
        ec = np.array(hex2rgb(P.color(spec['eye_col'])), np.float32) / 255
        dark = np.array(hex2rgb(P.color('ink:0')), np.float32) / 255
        for sx, sy in spec['eyes']:
            x = int(round(sx * tw / ow)) + 1
            y = int(round(sy * th / oh)) + 1
            big[y, x, :3] = ec; big[y, x, 3] = 1
            if spec.get('brow'):
                big[y, x - 1, :3] = ec * 0.8; big[y, x - 1, 3] = 1
                big[y - 1, x - 1:x + 1, :3] = dark
                big[y + 1, x, :3] = dark
    if spec.get('flip'):
        big = flip_x(big)
    return big


def build():
    src = load_src('enemies.png')
    out = {}
    for eid, spec in ENEMIES.items():
        out[eid] = make_enemy(eid, spec, src)
    return out


def build_battle():
    e = build()
    sh = Shelf(256, pad=2)
    for eid in ENEMIES:
        sh.add(eid, e[eid])
    sheet, rects = sh.render()
    save_png(sheet, os.path.join(DST, 'enemies_battle.png'))
    meta = {'image': 'enemies_battle.png', 'frames': rects,
            'origin': {n: [r[2] // 2, r[3] - 1] for n, r in rects.items()},
            'facing': 'right',
            'external': {'echo_warden': 'bosses_battle', 'archivore': 'bosses_battle', 'lost_page': 'bosses_battle'},
            'notes': 'One frame per enemy, facing RIGHT toward the party. origin = bottom-centre. Idle breathe, hit flash and death dissolve are procedural in code. echo_warden, archivore and lost_page live in bosses_battle.json.'}
    write_json(os.path.join(DST, 'enemies_battle.json'), meta)
    contact(list(e.items()), os.path.join(OUT, 'enemies_battle_4x.png'), scale=4, cols=4, title='enemies_battle at 4x (facing right)')
    return meta


def build_field():
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars'))
    import enemy_field as EF
    sh = Shelf(256, pad=1)
    items = []
    anims = {}
    sizes = {}
    for eid, d in EF.FIELD.items():
        leg = P.resolve(d['pal'], 'field_' + eid)
        w, h = d['size']
        names = []
        for i, gtxt in enumerate(d['frames']):
            im = parse_grid(grid_from_text(gtxt), leg, w=w, h=h)
            n = f'{eid}_{i}'
            sh.add(n, im)
            items.append((n, im))
            names.append(n)
        anims[f'{eid}_idle'] = {'frames': names, 'fps': 3 if eid in ('page_wraith', 'ink_wraith', 'archivore', 'lost_page') else 4, 'loop': True}
        sizes[eid] = {'size': [w, h], 'origin': [w // 2, h - 1]}
    sheet, rects = sh.render()
    save_png(sheet, os.path.join(DST, 'enemies_field.png'))
    meta = {'image': 'enemies_field.png', 'frames': rects, 'anims': anims, 'sprites': sizes, 'facing': 'left',
            'notes': 'Visible map enemies. Frames face LEFT; draw flipped (scaleX -1) when moving right. 2-frame idle/hop; when an enemy steps, show frame 1 for the step. origin = bottom-centre (feet on the tile bottom).'}
    write_json(os.path.join(DST, 'enemies_field.json'), meta)
    contact(items, os.path.join(OUT, 'enemies_field_6x.png'), scale=6, cols=6, title='enemies_field at 6x (facing left)')
    return meta


if __name__ == '__main__':
    build_battle()
    build_field()
