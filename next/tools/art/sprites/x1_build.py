"""Build the Expansion 1 sprite atlases (X1-sprites). Called by build_all.py (one `x1` step) or alone:

    python x1_build.py            (about 20 seconds; deterministic)

Writes ONLY pack atlases (docs/PWA_PACKS.md: merged into their base atlas by the loader, never edited in place):

    assets/sprites/x1_npcs.png/.json            six townsfolk, animal_sheep and animal_sheep_tufted     (x1_npcs.py)
    assets/sprites/x1_enemies_battle.png/.json  barrow_shade: base + idle_1, attack, hurt, cast, die_0..2 (x1_enemies.py)
    assets/sprites/x1_bosses_battle.png/.json   barrow_reeve and millstone_golem: the same set          (x1_enemies.py)
    assets/sprites/x1_enemies_field.png/.json   field sprites of the three foes + three rim-lit alternates (x1_field.py)
    assets/ui/x1_heads.png/.json                timeline heads of the three foes                         (x1_heads.py)

Every frame is padded so that its origin is exactly the loader's default origin, bottom-centre (floor(w / 2), h - 1): the pack
merge (core/assets.js mergeAtlasInto) copies frames but not the `origin` table enemies_battle.json uses, so a frame with an
off-centre origin would draw shifted once merged. The table is written too, for standalone readers (they agree).
Previews: tools/art/sprites/out/x1/.
"""
import os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import json
import numpy as np
from PIL import Image
from pix import *
import pal as P
import anim_frames as AF
import anim_atlas as AA
import x1_enemies as XE
import x1_field as XFd

OUTX = os.path.join(OUT, 'x1')


def center_on_origin(t, ox, oy):
    """pad a trimmed frame so its origin is exactly the default origin of a frame of its size, bottom-centre
    (floor(w / 2), h - 1): the pack merge copies frames but not an `origin` table, and the loader's default is then right
    with no per-frame number. Nothing may sit below the origin row (feet are on it)."""
    h, w = t.shape[:2]
    assert h == oy + 1, 'content below the origin row (%d rows, origin row %d)' % (h, oy)
    ox2 = max(ox, w - 1 - ox)
    out = blank(2 * ox2 + 1, h)
    out[:, ox2 - ox:ox2 - ox + w] = t
    return out, ox2, oy


def pack_frames(frames, width=256, pad=2):
    """[(name, rgba, ox, oy)] -> (sheet, {name: [x, y, w, h]}, {name: [ox, oy]}); trimmed, centred on the origin, shelf-packed
    tallest first"""
    items = []
    for name, img, ox, oy in frames:
        t, tox, toy = AF.trim(img, ox, oy)
        t, tox, toy = center_on_origin(t, tox, toy)
        items.append((name, t, tox, toy))
    order = sorted(range(len(items)), key=lambda i: (-items[i][1].shape[0], i))
    sh = Shelf(width, pad=pad)
    for i in order:
        sh.add(items[i][0], items[i][1])
    sheet, rects = sh.render()
    origin = {n: [int(tox), int(toy)] for n, _, tox, toy in items}
    for n, r in rects.items():
        assert origin[n] == [r[2] // 2, r[3] - 1], (n, origin[n], r)
    return sheet, rects, origin


def battle_atlas(ids, name, external=None, notes=''):
    frames = []
    for eid in ids:
        frames += XE.frames_of(eid)
    sheet, rects, origin = pack_frames(frames, width=512 if name.endswith('bosses_battle') else 256)
    anims = {}
    for eid in ids:
        anims.update(AA.enemy_anims(eid, rects))
    AA.save_indexed(sheet, os.path.join(DST, f'{name}.png'))
    meta = {'image': f'{name}.png',
            'frames': rects,
            'origin': origin, 'anims': anims, 'facing': 'right'}
    if external:
        meta['external'] = external
    meta['notes'] = notes
    write_json(os.path.join(DST, f'{name}.json'), meta)
    return meta, frames


NOTES_BATTLE = ('X1 pack atlas, merged into enemies_battle. Base frame <id> facing RIGHT, origin = bottom-centre per frame (the default, bottom-centre, which '
                'is exact for every frame; the table `origin` agrees); derived frames <id>_idle_1 (breathe, alternates every 36 frames), _attack, '
                '_hurt, _cast, _die_0..2 as the Episode 1 foes (anim_frames.py); anims <id>_idle and <id>_die. Draw 1x, untinted. '
                'barrow_shade: pale green-white, rim-lit. Colours outside the master palette (no ramp carries a pale green-white), also used by its field sprite and head: ' + ', '.join(XE.SHADE_RAMP) + '.')
NOTES_BOSS = ('X1 pack atlas, merged into bosses_battle (the battle code also finds these ids through enemies_battle.json `external`). '
              'barrow_reeve: bone plate, moss, a shepherd crook (frame 97x110 incl. the crook above the helm); _attack swings the crook '
              'forward, _cast is the count (the crook rises, the twelve tally notches and the visor lamps glow). millstone_golem: granite '
              'grey, a cracked grindstone torso that turns in _attack, flour dust. Both have _idle_1, _attack, _hurt, _cast (Reeve only; '
              'the Golem falls back to _attack), _die_0..2. 1x, untinted.')


# ----------------------------------------------------------------------------- field atlas
def alt_field():
    """rim-lit alternates of three existing field foes that are weakest on dark floors (the barrow's flagstone, the culvert's
    wet brick): x1_thornback_wolf, x1_ink_blot, x1_ink_wraith. Same frames, a 1 px light rim on the upper-left edge."""
    j = json.load(open(os.path.join(DST, 'enemies_field.json'), encoding='utf-8'))
    im = np.asarray(Image.open(os.path.join(DST, j['image'])).convert('RGBA')).astype(np.float32) / 255
    rims = {'thornback_wolf': dict(left='stone_cool:4', top='metal:2', max_L=0.5),
            'ink_blot': dict(left='ink:4', top='magic_violet:2', max_L=0.45),
            'ink_wraith': dict(left='ink:4', top='magic_violet:3', max_L=0.45, min_nb=2)}
    out = {}
    for k, r in rims.items():
        fr = []
        for i in (0, 1):
            x, y, w, h = j['frames'][f'{k}_{i}']
            fr.append(XE.rim(im[y:y + h, x:x + w].copy(), {'rim': r}))
        out['x1_' + k] = fr
    return out


def field_atlas():
    f = XFd.frames()
    f.update(alt_field())
    sh = Shelf(256, pad=1)
    anims, sizes, items = {}, {}, []
    fps = {'barrow_shade': 3, 'barrow_reeve': 3, 'millstone_golem': 4}
    for vid, imgs in f.items():
        names = []
        for i, im in enumerate(imgs):
            n = f'{vid}_{i}'
            sh.add(n, im); items.append((n, im)); names.append(n)
        anims[f'{vid}_idle'] = {'frames': names, 'fps': fps.get(vid, 4), 'loop': True}
        h, w = imgs[0].shape[:2]
        sizes[vid] = {'size': [w, h], 'origin': [w // 2, h - 1]}
    sheet, rects = sh.render()
    save_png(sheet, os.path.join(DST, 'x1_enemies_field.png'))
    meta = {'image': 'x1_enemies_field.png', 'frames': rects, 'anims': anims, 'sprites': sizes, 'facing': 'left',
            'notes': 'X1 pack atlas, merged into enemies_field. Frames face LEFT (flip for right), 2-frame idle, origin = bottom-centre (the default). '
                     'barrow_shade 24x24, millstone_golem 24x24, barrow_reeve 24x36 (the map avatar of the optional boss: a bone knight with a '
                     'crook taller than it). Each carries a 1 px rim light on the upper-left edge (CRITIQUE_4 item 8). x1_thornback_wolf, '
                     'x1_ink_blot, x1_ink_wraith are the existing foes with the same rim for the dark floors of the Barrow, Cellar and Culvert '
                     '(use them on those maps if the plain ones are too dim).'}
    write_json(os.path.join(DST, 'x1_enemies_field.json'), meta)
    return meta, items


def build():
    # the shade's six green-white extras are reported in the atlas notes below, not in the shared README that build_all
    # generates from P.EXTRAS (a shared file this agent does not own): keep the registry as it was
    saved = {k: set(v) for k, v in P.EXTRAS.items()}
    try:
        return _build()
    finally:
        P.EXTRAS.clear()
        P.EXTRAS.update(saved)


def _build():
    t0 = time.time()
    os.makedirs(OUTX, exist_ok=True)
    import x1_npcs, x1_heads
    x1_npcs.previews()
    mb, fb = battle_atlas(['barrow_shade'], 'x1_enemies_battle',
                          external={'barrow_reeve': 'bosses_battle', 'millstone_golem': 'bosses_battle'}, notes=NOTES_BATTLE)
    mo, fo = battle_atlas(['barrow_reeve', 'millstone_golem'], 'x1_bosses_battle', notes=NOTES_BOSS)
    mf, fitems = field_atlas()
    x1_heads.build()
    # previews
    for eid in XE.IDS:
        XE.anim_sheet(os.path.join(OUTX, f'anim_{eid}_3x.png'), [eid], scale=3)
    base = XE.base()
    for bg, tag in (((34, 28, 30), 'dark'), ((86, 76, 70), 'mid')):
        contact(list(base.items()), os.path.join(OUTX, f'enemies_base_4x_{tag}.png'), scale=4, cols=3, bg=bg, title='X1 foes (base) at 4x')
    contact(fitems, os.path.join(OUTX, 'x1_enemies_field_6x.png'), scale=6, cols=6, title='x1_enemies_field at 6x (facing left)')
    print('x1: %d battle frames, %d boss frames, %d field frames in %.1fs' % (len(mb['frames']), len(mo['frames']), len(mf['frames']), time.time() - t0))
    return {'battle': mb, 'bosses': mo, 'field': mf}


if __name__ == '__main__':
    build()
