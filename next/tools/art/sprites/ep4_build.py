"""Build the Episode 4 sprite atlases (E4-sprites). Called by build_all.py (one `ep4` step) or alone:

    python ep4_build.py            (deterministic)

Writes ONLY pack atlases (docs/PWA_PACKS.md: merged into their base atlas by the loader, never edited in place):

    assets/sprites/ep4_npcs.png/.json            ten townsfolk and memory actors                          (ep4_npcs.py)
    assets/sprites/ep4_enemies_battle.png/.json  the seven foes, the Barrister and its witness, the two writs:
                                                 base + idle_1, attack, hurt, cast (where used), die_0..2  (ep4_enemies.py, ep4_writs.py)
    assets/sprites/ep4_bosses_battle.png/.json   paper_regent, paper_regent_ward, paper_regent_charter: the same set (ep4_regent.py)
    assets/sprites/ep4_enemies_field.png/.json   field sprites of the eight foes + paper_regent_avatar(_back)  (ep4_field.py)
    assets/sprites/ep4_portraits.png/.json       paper_regent_48 / _32 (a 1x crop of the Forged Edicts frame)
    assets/ui/ep4_heads.png/.json                timeline heads                                              (ep4_heads.py)

Every battle frame is padded so its origin is exactly the loader's default, bottom-centre (x1_build.center_on_origin):
the pack merge copies frames, not an `origin` table. Previews: tools/art/sprites/out/ep4/.
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

OUT4 = os.path.join(OUT, 'ep4')
REGENT_LOOKS = ['paper_regent', 'paper_regent_ward', 'paper_regent_charter']
PORTRAIT_CROP = {48: (62, 32), 32: (62, 30)}     # centre (x, y) in the paper_regent frame


def writ_frames():
    import ep4_writs as WR
    out = []
    for wid, img in WR.base().items():
        H, W = img.shape[:2]
        out.append((wid, img, W // 2, H - 1))
        from ep4_enemies import pack4
        fr = pack4(wid, img, WR.derived(wid, img))
        out += [(f'{wid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
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


NOTES_BATTLE = ('Episode 4 pack atlas, merged into enemies_battle. Base frame <id> facing RIGHT, origin bottom-centre (the default; '
                'the `origin` table agrees). Derived <id>_idle_1 (breathe), _attack, _hurt, _die_0..2 for every id, _cast for ink_bloom, '
                'gutter_phantom, blank_decree, barrister, barrister_witness, writ_silence, writ_oblivion; anims <id>_idle and <id>_die. '
                'Draw 1x, untinted. flood_hound, lockjaw_crab, ink_bloom, drowned_watch, gutter_phantom, blank_decree, waterlogged_sentinel '
                '(enemies.png cells 2, 3, 0, 5, 7, 6, 4), barrister (cell 1, the 96 px mini-boss cell), barrister_witness (cell 6, small), '
                'writ_silence and writ_oblivion (drawn in code). The Paper Regent lives in bosses_battle (see `external`).')
NOTES_BOSS = ('Episode 4 pack atlas, merged into bosses_battle. The Paper Regent (bosses.png cell 3, 1x, flipped so the trident is on the '
              "party's side) in three looks: paper_regent (Forged Edicts), paper_regent_ward (Royal Ward: the halo of floating writs), "
              'paper_regent_charter (The True Charter: bare vellum, a paper crown, the trident a pen). Each has _idle_1, _attack, _hurt, '
              '_cast, _die_0..2. A phase that wants its look names it: royal_ward -> paper_regent_ward, true_charter -> paper_regent_charter.')


def field_atlas():
    import ep4_field as F
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
    save_png(sheet, os.path.join(DST, 'ep4_enemies_field.png'))
    meta = {'image': 'ep4_enemies_field.png', 'frames': rects, 'anims': anims, 'sprites': sizes, 'facing': 'left',
            'notes': 'Episode 4 pack atlas, merged into enemies_field. Frames face LEFT (flip for right), 2-frame idle, origin bottom-centre. '
                     'Each foe carries a 1 px rim light on the upper-left edge. paper_regent_avatar (40x54, frontal) and '
                     'paper_regent_avatar_back (seen from behind) are the boss on the Drowned Throne map.'}
    write_json(os.path.join(DST, 'ep4_enemies_field.json'), meta)
    return meta, f, items


def portraits(regent):
    import build_portraits as BP
    p48 = BP.make_from_frame(regent, *PORTRAIT_CROP[48], 48)
    p32 = BP.make_from_frame(regent, *PORTRAIT_CROP[32], 32)
    import ep4_lyra
    ly = {k: v.astype(np.float32) / 255 for k, v in ep4_lyra.lyra_frames().items()}
    sh = Shelf(128, pad=0)
    sh.add('paper_regent_48', p48)
    sh.add('paper_regent_32', p32)
    sh.add('lyra_48', ly['lyra_48'])
    sh.add('lyra_32', ly['lyra_32'])
    sheet, rects = sh.render()
    save_png(sheet, os.path.join(DST, 'ep4_portraits.png'))
    meta = {'image': 'ep4_portraits.png', 'frames': rects,
            'portraits': {'paper_regent': {'48': 'paper_regent_48', '32': 'paper_regent_32'},
                          'lyra': {'48': 'lyra_48', '32': 'lyra_32'}},
            'sources': {'paper_regent': 'battle frame paper_regent (1x crop, E4-sprites)',
                        'lyra': 'noble_lady (portraits.webp cell 4) aged by hand: grey at the temples, age lines (ep4_lyra.py, E4-fixes-B)'},
            'notes': 'Episode 4 pack atlas, merged into portraits. paper_regent: the crown, the hood and its two cyan eyes, cropped at 1x '
                     'from the Forged Edicts battle frame. lyra: the noble_lady face aged to her fifties (CRITIQUE_6 item 10); her '
                     'speaker tags and npcs name it as portrait id `lyra` (until they do, they still show noble_lady).'}
    write_json(os.path.join(DST, 'ep4_portraits.json'), meta)
    return meta, p48, p32


def build():
    # extras (colours outside the master palette) are not used by Episode 4; keep the shared registry as it was
    saved = {k: set(v) for k, v in P.EXTRAS.items()}
    try:
        return _build()
    finally:
        P.EXTRAS.clear()
        P.EXTRAS.update(saved)


def _build():
    t0 = time.time()
    os.makedirs(OUT4, exist_ok=True)
    import ep4_npcs, ep4_enemies as E4, ep4_regent as RG, ep4_heads as HD
    ep4_npcs.previews()
    fb = E4.atlas_frames() + writ_frames()
    ids_b = E4.ALL_IDS + ['writ_silence', 'writ_oblivion']
    mb = battle_atlas(fb, 'ep4_enemies_battle', ids_b, 256, external={k: 'bosses_battle' for k in REGENT_LOOKS}, notes=NOTES_BATTLE)
    fo = RG.atlas_frames()
    mo = battle_atlas(fo, 'ep4_bosses_battle', REGENT_LOOKS, 512, notes=NOTES_BOSS)
    mf, ff, fitems = field_atlas()
    HD.build(ff)
    mp, p48, p32 = portraits(RG.base()['paper_regent'])
    # previews
    contact(fitems, os.path.join(OUT4, 'ep4_enemies_field_6x.png'), scale=6, cols=6, title='ep4_enemies_field at 6x (facing left)',
            bg=(52, 60, 62))
    contact([('paper_regent 48', p48), ('paper_regent 32', p32)], os.path.join(OUT4, 'ep4_portraits_6x.png'), scale=6, cols=2,
            title='ep4_portraits at 6x')
    print('ep4: %d battle frames, %d boss frames, %d field frames in %.1fs' % (len(mb['frames']), len(mo['frames']), len(mf['frames']), time.time() - t0))
    return {'battle': mb, 'bosses': mo, 'field': mf, 'portraits': mp}


if __name__ == '__main__':
    build()
