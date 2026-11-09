"""Build the Episode 5 sprite atlases (E5-sprites). Called by build_all.py (one `ep5` step) or alone:

    python ep5_build.py            (deterministic)

Writes ONLY pack atlases (docs/PWA_PACKS.md: merged into their base atlas by the loader, never edited in place):

    assets/sprites/ep5_npcs.png/.json            thirteen townsfolk and memory actors, plus the Dune Host  (ep5_npcs.py)
    assets/sprites/ep5_enemies_battle.png/.json  the seven foes, the Mirage Knight and its Double, the two False Futures:
                                                 base + idle_1, attack, hurt, cast (where used), die_0..2  (ep5_enemies.py, ep5_futures.py)
    assets/sprites/ep5_bosses_battle.png/.json   oracle, oracle_futures, oracle_true: the same set           (ep5_oracle.py)
    assets/sprites/ep5_enemies_field.png/.json   field sprites of the eight foes + oracle_avatar(_back)     (ep5_field.py)
    assets/sprites/ep5_portraits.png/.json       oracle_48 / _32 (a 1x crop of The Read Sky frame)
    assets/ui/ep5_heads.png/.json                timeline heads                                             (ep5_heads.py)

Every battle frame is padded so its origin is exactly the loader's default, bottom-centre (x1_build.center_on_origin):
the pack merge copies frames, not an `origin` table. Previews: tools/art/sprites/out/ep5/ (python ep5_preview.py).
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

OUT5 = os.path.join(OUT, 'ep5')
ORACLE_LOOKS = ['oracle', 'oracle_futures', 'oracle_true']
FUTURES = ['future_hunger', 'future_fear']
PORTRAIT_CROP = {48: (62, 80), 32: (74, 74)}     # centre (x, y) in the oracle frame: the mask and one golden claw at 48


def future_frames():
    import ep5_futures as FU
    import ep5_enemies as E5
    out = []
    for fid, img in FU.base().items():
        H, W = img.shape[:2]
        out.append((fid, img, W // 2, H - 1))
        fr = E5.pack5(fid, img, FU.derived(fid, img))
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


NOTES_BATTLE = ('Episode 5 pack atlas, merged into enemies_battle. Base frame <id> facing RIGHT, origin bottom-centre (the default; '
                'the `origin` table agrees). Derived <id>_idle_1 (breathe), _attack, _hurt, _die_0..2 for every id, _cast for '
                'dust_harrier, silt_reaver, starsilt, horizon_shade, mirage_knight, mirage_double, future_hunger, future_fear; anims '
                '<id>_idle and <id>_die. Draw 1x, untinted. dune_stalker, dune_scarab, dust_harrier, silt_reaver, starsilt, '
                'horizon_shade, tomorrow_husk (enemies.png cells 2, 3, 6, 1, 0, 7, 4), mirage_knight (cell 5 at 96 px), '
                'mirage_double (cell 5 cut again at 86 px), future_hunger and future_fear (drawn in code). Every foe carries a '
                'dark outline and a side rim (gold sun, pale blue star). The Sand Oracle lives in bosses_battle (see `external`).')
NOTES_BOSS = ('Episode 5 pack atlas, merged into bosses_battle. The Sand Oracle (bosses.png cell 4, 1x, not flipped: the stinger '
              'points at the party) in three looks: oracle (The Read Sky: the ivory mask), oracle_futures (False Futures: a ring '
              'of drifting sand, the mask cracked), oracle_true (The True Horizon: the head plates split, a face of stars). Each '
              'has _idle_1, _attack, _hurt, _cast, _die_0..2. The phases name their look: read_sky -> oracle, false_futures -> '
              'oracle_futures, true_horizon -> oracle_true (src/data/ep5/enemies.js).')


def field_atlas():
    import ep5_field as F
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
    AA.save_indexed(sheet, os.path.join(DST, 'ep5_enemies_field.png'))
    meta = {'image': 'ep5_enemies_field.png', 'frames': rects, 'anims': anims, 'sprites': sizes, 'facing': 'left',
            'notes': 'Episode 5 pack atlas, merged into enemies_field. Frames face LEFT (flip for right), 2-frame idle, origin '
                     'bottom-centre. Each foe carries its own dark outline and a 1 px side rim inside it (gold sun, pale blue '
                     'star), so a FIELD_LOOK entry is not needed. oracle_avatar (front) and oracle_avatar_back (seen from behind, '
                     'mirrored) are the Sand Oracle coiled on the ring in the Eye of the Oracle.'}
    write_json(os.path.join(DST, 'ep5_enemies_field.json'), meta)
    return meta, f, items


def portraits(oracle):
    import build_portraits as BP
    p48 = BP.make_from_frame(oracle, *PORTRAIT_CROP[48], 48)
    p32 = BP.make_from_frame(oracle, *PORTRAIT_CROP[32], 32)
    sh = Shelf(128, pad=0)
    sh.add('oracle_48', p48)
    sh.add('oracle_32', p32)
    sheet, rects = sh.render()
    AA.save_indexed(sheet, os.path.join(DST, 'ep5_portraits.png'))
    meta = {'image': 'ep5_portraits.png', 'frames': rects,
            'portraits': {'oracle': {'48': 'oracle_48', '32': 'oracle_32'}},
            'sources': {'oracle': 'battle frame oracle (The Read Sky; 1x crop, E5-sprites)'},
            'notes': 'Episode 5 pack atlas, merged into portraits. oracle: the ivory mask on the gold head and one golden claw '
                     '(48), the mask alone (32), cropped at 1x from The Read Sky battle frame. Sel has no portrait (plan 9.5).'}
    write_json(os.path.join(DST, 'ep5_portraits.json'), meta)
    return meta, p48, p32


def build():
    # extras (colours outside the master palette) are not used by Episode 5; keep the shared registry as it was
    saved = {k: set(v) for k, v in P.EXTRAS.items()}
    try:
        return _build()
    finally:
        P.EXTRAS.clear()
        P.EXTRAS.update(saved)


def _build():
    t0 = time.time()
    os.makedirs(OUT5, exist_ok=True)
    import ep5_npcs, ep5_enemies as E5, ep5_oracle as OR, ep5_heads as HD
    mn, _ = ep5_npcs.previews()
    fb = E5.atlas_frames() + future_frames()
    ids_b = E5.ALL_IDS + FUTURES
    mb = battle_atlas(fb, 'ep5_enemies_battle', ids_b, 256, external={k: 'bosses_battle' for k in ORACLE_LOOKS}, notes=NOTES_BATTLE)
    fo = OR.atlas_frames()
    mo = battle_atlas(fo, 'ep5_bosses_battle', ORACLE_LOOKS, 512, notes=NOTES_BOSS)
    mf, ff, fitems = field_atlas()
    HD.build(ff)
    mp, p48, p32 = portraits(OR.base()['oracle'])
    for s in (1, 3):
        contact(fitems, os.path.join(OUT5, f'ep5_enemies_field_{s}x.png'), scale=s, cols=6, bg=(52, 60, 62),
                title='ep5_enemies_field at %dx (facing left)' % s if s > 1 else None, label=s > 1)
    contact([('oracle 48', p48), ('oracle 32', p32)], os.path.join(OUT5, 'ep5_portraits_6x.png'), scale=6, cols=2,
            title='ep5_portraits at 6x')
    contact([('oracle 48', p48), ('oracle 32', p32)], os.path.join(OUT5, 'ep5_portraits_1x.png'), scale=1, cols=2, label=False)
    print('ep5: %d npc frames, %d battle frames, %d boss frames, %d field frames in %.1fs' % (
        len(mn['frames']), len(mb['frames']), len(mo['frames']), len(mf['frames']), time.time() - t0))
    return {'npcs': mn, 'battle': mb, 'bosses': mo, 'field': mf, 'portraits': mp}


if __name__ == '__main__':
    build()
