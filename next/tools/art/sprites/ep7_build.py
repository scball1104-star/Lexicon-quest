"""Build the Episode 7 sprite atlases (E7-sprites). Called by build_all.py (one `ep7` step) or alone:

    python ep7_build.py            (deterministic)

Writes ONLY pack atlases (docs/PWA_PACKS.md: merged into their base atlas by the loader, never edited in place):

    assets/sprites/ep7_npcs.png/.json            the Palehaven cast, Nox at three ages, her mother, Marten (ep7_npcs.py)
    assets/sprites/ep7_enemies_battle.png/.json  the seven foes, the Pale Lantern, the Closed Gate and the Lost Letter:
                                                 base + idle_1, attack, hurt, cast (where used), die_0..2
                                                 (ep7_enemies.py, ep7_drawn.py)
    assets/sprites/ep7_bosses_battle.png/.json   white_phantom, white_phantom_ward, white_phantom_thaw: the same set, plus
                                                 `hud`: the one HUD anchor over the crown (ep7_phantom.py)
    assets/sprites/ep7_enemies_field.png/.json   field sprites of the eight foes + phantom_avatar(_back)   (ep7_field.py)
    assets/sprites/ep7_portraits.png/.json       phantom_48 / _32 (a 1x crop of the Outer Frost frame)
    assets/ui/ep7_heads.png/.json                timeline heads                                             (ep7_heads.py)

Every battle frame is padded so its origin is exactly the loader's default, bottom-centre (x1_build.center_on_origin):
the pack merge copies frames, not an `origin` table. Previews: tools/art/sprites/out/ep7/ (python ep7_preview.py).
"""
import os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from pix import *
import pal as P
import anim_frames as AF
import anim_atlas as AA
from x1_build import pack_frames

OUT7 = os.path.join(OUT, 'ep7')
PHANTOM_LOOKS = ['white_phantom', 'white_phantom_ward', 'white_phantom_thaw']
DRAWN = ['rimed_page', 'closed_gate', 'lost_letter']
DRAWN_CASTERS = ('rimed_page', 'closed_gate', 'lost_letter')


def portrait_centre():
    """(x, y) centres in the Outer Frost frame for the 48 crop (the antler crown, the skull and an eye socket, the cloak's
    shoulder edge) and the 32 crop (the skull under the crown)"""
    import ep7_phantom as PH
    sx, sy = PH.skull_xy()
    return {48: (sx + 4, sy + 10), 32: (sx + 4, sy + 4)}


def drawn_frames():
    import ep7_drawn as DR
    import ep7_enemies as E7
    out = []
    for fid, img in DR.base().items():
        H, W = img.shape[:2]
        out.append((fid, img, W // 2, H - 1))
        fr = E7.pack7(fid, img, DR.derived(fid, img))
        out += [(f'{fid}_{n}', *fr[n]) for n in AF.ORDER if n in fr and (n != 'cast' or fid in DRAWN_CASTERS)]
    return out


def battle_atlas(frames, name, ids, width, external=None, notes='', extra=None):
    sheet, rects, origin = pack_frames(frames, width=width)
    anims = {}
    for eid in ids:
        anims.update(AA.enemy_anims(eid, rects))
    AA.save_indexed(sheet, os.path.join(DST, f'{name}.png'))
    meta = {'image': f'{name}.png', 'frames': rects, 'origin': origin, 'anims': anims, 'facing': 'right'}
    if external:
        meta['external'] = external
    if extra:
        meta.update(extra)
    meta['notes'] = notes
    write_json(os.path.join(DST, f'{name}.json'), meta)
    return meta


NOTES_BATTLE = ('Episode 7 pack atlas, merged into enemies_battle. Base frame <id> facing RIGHT, origin bottom-centre (the default; '
                'the `origin` table agrees). Derived <id>_idle_1, _attack, _hurt, _die_0..2 for every id, _cast for snow_wisp, '
                'hush_owl, frostbound_revenant, ice_knight, pale_lantern, rimed_page, closed_gate, lost_letter; anims <id>_idle and '
                '<id>_die. Draw 1x, untinted. rime_wolf, snow_wisp, hush_owl, crystal_crawler, ice_knight (enemies.png cells 2, 0, '
                '6, 3, 5, recoloured snow white, ice blue, pine black and aurora violet), frostbound_revenant (cell 7 as painted, '
                'the skull redrawn), pale_lantern (cell 1 at 92 px, frost white with a great lantern in the hood, its light cold '
                'blue), rimed_page, closed_gate, lost_letter (drawn in code; the Gate and the Letter each stand on their own ground '
                'shadow). Every foe carries a dark outline and an ice-blue rim. The White Phantom lives in bosses_battle (see '
                '`external`).')
NOTES_BOSS = ('Episode 7 pack atlas, merged into bosses_battle. The White Phantom (bosses.png cell 6, 1x, not flipped) in three '
              'looks: white_phantom (Outer Frost, as painted), white_phantom_ward (The Frozen Ward: the cloak spread behind it like '
              'a door with an iron gate and three letters frozen into it, the crown frosted), white_phantom_thaw (Thawlight: the '
              'frost cracking off in plates, the crown dripping, a warm light in the chest). Each has _idle_1, _attack, _hurt, '
              '_cast, _die_0..2. The phases name their look: outer_frost -> white_phantom, frozen_ward -> white_phantom_ward, '
              'thawlight -> white_phantom_thaw (src/data/ep7/enemies.js; ai.js enterPhase forwards it as `sprite`). `hud`: one '
              'anchor per look, the same in all three (CRITIQUE_8 item 1): `crown` is the top of the antler crown above the skull '
              'as [dx, dy] from the bottom-centre origin (dy negative, up); `headPx` the crown and skull box [x0, x1, y0, y1] from '
              'the origin; `head` the same box as fractions of that look\'s frame (layout.js HEAD_BOX format).')


def hud_meta(rects):
    """the Phantom's HUD anchor per look, from ep7_phantom.hud() (measured on the untrimmed canvas, so it is turned into
    offsets from the origin, which the packing keeps), plus the head box as fractions of each look's packed frame"""
    import ep7_phantom as PH
    b = PH.base()
    out = {}
    for look in PHANTOM_LOOKS:
        a = b[look]
        H, W = a.shape[:2]
        ox, oy = W // 2, H - 1
        sx, sy = PH.skull_xy()
        cm = PH.crown_mask(a)
        ys, xs = np.nonzero(cm)
        top = int(ys.min())
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        y1 = sy + len(PH.SKULL)
        cx = sx + len(PH.SKULL[0]) // 2
        px = [x0 - ox, x1 - ox, top - oy, y1 - oy]
        r = rects[look]
        fx, fy = r[2] // 2, r[3] - 1           # the packed frame's origin
        frac = [round((px[0] + fx) / r[2], 3), round((px[1] + fx) / r[2], 3), round((px[2] + fy) / r[3], 3),
                round((px[3] + fy) / r[3], 3)]
        out[look] = {'crown': [cx - ox, top - oy], 'headPx': px, 'head': frac}
    return out


def field_atlas():
    import ep7_field as F
    f = F.frames()
    sh = Shelf(256, pad=1)
    anims, sizes, items = {}, {}, []
    for vid, imgs in f.items():
        names = []
        for i, im in enumerate(imgs):
            n = f'{vid}_{i}'
            sh.add(n, im); items.append((n, im)); names.append(n)
        anims[f'{vid}_idle'] = {'frames': names, 'fps': 2 if 'avatar' in vid else 4, 'loop': True}
        h, w = imgs[0].shape[:2]
        sizes[vid] = {'size': [w, h], 'origin': [w // 2, h - 1]}
    sheet, rects = sh.render()
    AA.save_indexed(sheet, os.path.join(DST, 'ep7_enemies_field.png'))
    meta = {'image': 'ep7_enemies_field.png', 'frames': rects, 'anims': anims, 'sprites': sizes, 'facing': 'left',
            'notes': 'Episode 7 pack atlas, merged into enemies_field. Frames face LEFT (flip for right), 2-frame idle, origin '
                     'bottom-centre. Each foe carries its own dark outline (it holds on snow and on the white fade) and a 1 px '
                     'ice rim inside it (it holds on the dark vault floors), so a FIELD_LOOK entry is not needed. '
                     'phantom_avatar (front) and phantom_avatar_back (seen from behind, mirrored) are the White Phantom standing '
                     'over the heart in the Stillheart.'}
    write_json(os.path.join(DST, 'ep7_enemies_field.json'), meta)
    return meta, f, items


def portraits(phantom):
    import build_portraits as BP
    c = portrait_centre()
    p48 = BP.make_from_frame(phantom, *c[48], 48)
    p32 = BP.make_from_frame(phantom, *c[32], 32)
    sh = Shelf(128, pad=0)
    sh.add('phantom_48', p48)
    sh.add('phantom_32', p32)
    sheet, rects = sh.render()
    AA.save_indexed(sheet, os.path.join(DST, 'ep7_portraits.png'))
    meta = {'image': 'ep7_portraits.png', 'frames': rects,
            'portraits': {'phantom': {'48': 'phantom_48', '32': 'phantom_32'}},
            'sources': {'phantom': 'battle frame white_phantom (Outer Frost; 1x crop, E7-sprites)'},
            'notes': 'Episode 7 pack atlas, merged into portraits. phantom: the antler crown, the skull with its cold blue eye '
                     'sockets and the frozen cloak at the shoulder (48), the skull under the crown (32), cropped at 1x from the '
                     'Outer Frost battle frame. Nox has no portrait (plan 9.5); hooded_sage is held for the First Keeper.'}
    write_json(os.path.join(DST, 'ep7_portraits.json'), meta)
    return meta, p48, p32


def build():
    # extras (colours outside the master palette) are not used by Episode 7; keep the shared registry as it was
    saved = {k: set(v) for k, v in P.EXTRAS.items()}
    try:
        return _build()
    finally:
        P.EXTRAS.clear()
        P.EXTRAS.update(saved)


def _build():
    t0 = time.time()
    os.makedirs(OUT7, exist_ok=True)
    import ep7_npcs, ep7_enemies as E7, ep7_phantom as PH, ep7_heads as HD
    mn, _ = ep7_npcs.previews()
    fb = E7.atlas_frames() + drawn_frames()
    ids_b = E7.ALL_IDS + DRAWN
    mb = battle_atlas(fb, 'ep7_enemies_battle', ids_b, 256, external={k: 'bosses_battle' for k in PHANTOM_LOOKS}, notes=NOTES_BATTLE)
    fo = PH.atlas_frames()
    sheet, rects, origin = pack_frames(fo, width=512)
    mo = battle_atlas(fo, 'ep7_bosses_battle', PHANTOM_LOOKS, 512, notes=NOTES_BOSS, extra={'hud': hud_meta(rects)})
    mf, ff, fitems = field_atlas()
    HD.build(ff)
    mp, p48, p32 = portraits(PH.base()['white_phantom'])
    for s in (1, 4):
        contact(fitems, os.path.join(OUT7, f'ep7_enemies_field_{s}x.png'), scale=s, cols=6, bg=(226, 234, 242),
                title='ep7_enemies_field at %dx (facing left)' % s if s > 1 else None, label=s > 1)
    contact([('phantom 48', p48), ('phantom 32', p32)], os.path.join(OUT7, 'ep7_portraits_6x.png'), scale=6, cols=2,
            title='ep7_portraits at 6x')
    contact([('phantom 48', p48), ('phantom 32', p32)], os.path.join(OUT7, 'ep7_portraits_1x.png'), scale=1, cols=2, label=False)
    print('ep7: %d npc frames, %d battle frames, %d boss frames, %d field frames in %.1fs' % (
        len(mn['frames']), len(mb['frames']), len(mo['frames']), len(mf['frames']), time.time() - t0))
    return {'npcs': mn, 'battle': mb, 'bosses': mo, 'field': mf, 'portraits': mp}


if __name__ == '__main__':
    build()
