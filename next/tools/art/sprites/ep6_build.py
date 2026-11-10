"""Build the Episode 6 sprite atlases (E6-sprites). Called by build_all.py (one `ep6` step) or alone:

    python ep6_build.py            (deterministic)

Writes ONLY pack atlases (docs/PWA_PACKS.md: merged into their base atlas by the loader, never edited in place):

    assets/sprites/ep6_npcs.png/.json            the Zephyr Landing cast, the young Aeris, two deckhands, the Cloudhouse Host (ep6_npcs.py)
    assets/sprites/ep6_enemies_battle.png/.json  the seven foes, the Gale Engine, the False Beacon and the Broken Compass:
                                                 base + idle_1, attack, hurt, cast (where used), die_0..2  (ep6_enemies.py, ep6_drawn.py)
    assets/sprites/ep6_bosses_battle.png/.json   scribe, scribe_ward, scribe_chart: the same set           (ep6_scribe.py)
    assets/sprites/ep6_enemies_field.png/.json   field sprites of the eight foes + scribe_avatar(_back)    (ep6_field.py)
    assets/sprites/ep6_portraits.png/.json       scribe_48 / _32 (a 1x crop of The Wind Script frame)
    assets/ui/ep6_heads.png/.json                timeline heads                                             (ep6_heads.py)

Every battle frame is padded so its origin is exactly the loader's default, bottom-centre (x1_build.center_on_origin):
the pack merge copies frames, not an `origin` table. Previews: tools/art/sprites/out/ep6/ (python ep6_preview.py).
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

OUT6 = os.path.join(OUT, 'ep6')
SCRIBE_LOOKS = ['scribe', 'scribe_ward', 'scribe_chart']
DRAWN = ['storm_page', 'false_beacon', 'broken_compass']
# centre (x, y) in the scribe frame: the bone mask, its eye and beak, the near edge of the far wing and the quill by the
# beak at 48; the mask and beak alone at 32
PORTRAIT_CROP = {48: (106, 62), 32: (106, 61)}


def drawn_frames():
    import ep6_drawn as DR
    import ep6_enemies as E6
    out = []
    for fid, img in DR.base().items():
        H, W = img.shape[:2]
        out.append((fid, img, W // 2, H - 1))
        fr = E6.pack6(fid, img, DR.derived(fid, img))
        out += [(f'{fid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    return out


def battle_atlas(frames, name, ids, width, external=None, notes=''):
    sheet, rects, origin = pack_frames(frames, width=width)
    anims = {}
    for eid in ids:
        anims.update(AA.enemy_anims(eid, rects))
    AA.save_indexed(sheet, os.path.join(DST, f'{name}.png'))
    meta = {'image': f'{name}.png', 'frames': rects, 'origin': origin, 'anims': anims, 'facing': 'right'}
    if external:
        meta['external'] = external
    meta['notes'] = notes
    write_json(os.path.join(DST, f'{name}.json'), meta)
    return meta


NOTES_BATTLE = ('Episode 6 pack atlas, merged into enemies_battle. Base frame <id> facing RIGHT, origin bottom-centre (the default; '
                'the `origin` table agrees). Derived <id>_idle_1, _attack, _hurt, _die_0..2 for every id, _cast for gale_sprite, '
                'signal_wraith, lightning_manta, gale_engine, storm_page, false_beacon, broken_compass; anims <id>_idle and '
                '<id>_die. Draw 1x, untinted. squall_wolf, gale_sprite, rigger_beetle, signal_wraith, storm_harrier, '
                'lightning_manta (enemies.png cells 2, 0, 3, 1, 6, 7), gale_engine (cell 4 at 100 px, a fan in the core, bellows '
                'on its back), storm_page, false_beacon, broken_compass (drawn in code; the Beacon and the Compass each stand on '
                'their own ground shadow). Every foe carries a dark outline and a side rim (cloud white Aloft, brass grounded). '
                'The Storm Scribe lives in bosses_battle (see `external`).')
NOTES_BOSS = ('Episode 6 pack atlas, merged into bosses_battle. The Storm Scribe (bosses.png cell 5, 1x, not flipped: the beak '
              'points at the party) in three looks: scribe (The Wind Script, as painted), scribe_ward (The Storm Script Ward: '
              'a ring of false lamplight and a brass compass rose behind it, the quills scattered), scribe_chart (The True Sky '
              'Chart: the wings opened and bright with the Wind Script on them, lightning in the wingtips). Each has _idle_1, '
              '_attack, _hurt, _cast, _die_0..2. The phases name their look: wind_script -> scribe, storm_ward -> scribe_ward, '
              'true_sky_chart -> scribe_chart (src/data/ep6/enemies.js; ai.js enterPhase forwards it as `sprite`).')


def field_atlas():
    import ep6_field as F
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
    AA.save_indexed(sheet, os.path.join(DST, 'ep6_enemies_field.png'))
    meta = {'image': 'ep6_enemies_field.png', 'frames': rects, 'anims': anims, 'sprites': sizes, 'facing': 'left',
            'notes': 'Episode 6 pack atlas, merged into enemies_field. Frames face LEFT (flip for right), 2-frame idle, origin '
                     'bottom-centre. Each foe carries its own dark outline and a 1 px side rim inside it (cloud white Aloft, '
                     'brass grounded), so a FIELD_LOOK entry is not needed. scribe_avatar (front) and scribe_avatar_back (seen '
                     'from behind, mirrored) are the Storm Scribe perched in the Scribe\'s Eyrie.'}
    write_json(os.path.join(DST, 'ep6_enemies_field.json'), meta)
    return meta, f, items


def portraits(scribe):
    import build_portraits as BP
    p48 = BP.make_from_frame(scribe, *PORTRAIT_CROP[48], 48)
    p32 = BP.make_from_frame(scribe, *PORTRAIT_CROP[32], 32)
    sh = Shelf(128, pad=0)
    sh.add('scribe_48', p48)
    sh.add('scribe_32', p32)
    sheet, rects = sh.render()
    AA.save_indexed(sheet, os.path.join(DST, 'ep6_portraits.png'))
    meta = {'image': 'ep6_portraits.png', 'frames': rects,
            'portraits': {'scribe': {'48': 'scribe_48', '32': 'scribe_32'}},
            'sources': {'scribe': 'battle frame scribe (The Wind Script; 1x crop, E6-sprites)'},
            'notes': 'Episode 6 pack atlas, merged into portraits. scribe: the bone mask with its blue eye and hooked beak, '
                     'the far wing and a quill (48), the mask and beak alone (32), cropped at 1x from The Wind Script battle '
                     'frame. Aeris has no portrait (plan 9.5).'}
    write_json(os.path.join(DST, 'ep6_portraits.json'), meta)
    return meta, p48, p32


def build():
    # extras (colours outside the master palette) are not used by Episode 6; keep the shared registry as it was
    saved = {k: set(v) for k, v in P.EXTRAS.items()}
    try:
        return _build()
    finally:
        P.EXTRAS.clear()
        P.EXTRAS.update(saved)


def _build():
    t0 = time.time()
    os.makedirs(OUT6, exist_ok=True)
    import ep6_npcs, ep6_enemies as E6, ep6_scribe as SC, ep6_heads as HD
    mn, _ = ep6_npcs.previews()
    fb = E6.atlas_frames() + drawn_frames()
    ids_b = E6.ALL_IDS + DRAWN
    mb = battle_atlas(fb, 'ep6_enemies_battle', ids_b, 256, external={k: 'bosses_battle' for k in SCRIBE_LOOKS}, notes=NOTES_BATTLE)
    fo = SC.atlas_frames()
    mo = battle_atlas(fo, 'ep6_bosses_battle', SCRIBE_LOOKS, 512, notes=NOTES_BOSS)
    mf, ff, fitems = field_atlas()
    HD.build(ff)
    mp, p48, p32 = portraits(SC.base()['scribe'])
    for s in (1, 4):
        contact(fitems, os.path.join(OUT6, f'ep6_enemies_field_{s}x.png'), scale=s, cols=6, bg=(52, 60, 62),
                title='ep6_enemies_field at %dx (facing left)' % s if s > 1 else None, label=s > 1)
    contact([('scribe 48', p48), ('scribe 32', p32)], os.path.join(OUT6, 'ep6_portraits_6x.png'), scale=6, cols=2,
            title='ep6_portraits at 6x')
    contact([('scribe 48', p48), ('scribe 32', p32)], os.path.join(OUT6, 'ep6_portraits_1x.png'), scale=1, cols=2, label=False)
    print('ep6: %d npc frames, %d battle frames, %d boss frames, %d field frames in %.1fs' % (
        len(mn['frames']), len(mb['frames']), len(mo['frames']), len(mf['frames']), time.time() - t0))
    return {'npcs': mn, 'battle': mb, 'bosses': mo, 'field': mf, 'portraits': mp}


if __name__ == '__main__':
    build()
