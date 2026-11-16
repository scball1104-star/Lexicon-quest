"""Build the Episode 8 sprite atlases (E8-sprites). Called by build_all.py (one `ep8` step) or alone:

    python ep8_build.py            (deterministic)

Writes ONLY pack atlases (docs/PWA_PACKS.md: merged into their base atlas by the loader, never edited in place):

    assets/sprites/ep8_npcs.png/.json            the Scriptorium and Library cast, the First Keeper in three looks, Elowen
                                                 at two ages, the nurse, the two counter recolours, the bundle and the
                                                 blanket (ep8_npcs.py)
    assets/sprites/ep8_enemies_battle.png/.json  the seven foes, the Unnamed Sentry (two looks), Grief and Change: base +
                                                 idle_1, attack, hurt, cast (where used), die_0..2 (ep8_enemies.py,
                                                 ep8_drawn.py), plus `rows`: the feet anchor and body box of the foes whose
                                                 HUD row sits under their feet (the Sentry, Grief, Change)
    assets/sprites/ep8_bosses_battle.png/.json   eraser, eraser_truths, eraser_remembers, eraser_silence: the same set, plus
                                                 `hud`: the one HUD anchor over the hood (ep8_eraser.py)
    assets/sprites/ep8_enemies_field.png/.json   field sprites of the eight foes + eraser_avatar(_back)     (ep8_field.py)
    assets/sprites/ep8_portraits.png/.json       first_keeper_48 / _32 (the built hooded_sage cell, copied pixel for
                                                 pixel, no redraw) and eraser_48 / _32 (a 1x crop of the Closed Book frame)
    assets/ui/ep8_heads.png/.json                timeline heads                                             (ep8_heads.py)

Every battle frame is padded so its origin is exactly the loader's default, bottom-centre (x1_build.center_on_origin):
the pack merge copies frames, not an `origin` table. Previews: tools/art/sprites/out/ep8/ (python ep8_preview.py).
"""
import os, sys, time, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from PIL import Image
from pix import *
import pal as P
import anim_frames as AF
import anim_atlas as AA
from x1_build import pack_frames

OUT8 = os.path.join(OUT, 'ep8')
ERASER_LOOKS = ['eraser', 'eraser_truths', 'eraser_remembers', 'eraser_silence']
DRAWN = ['struck_page', 'truth_grief', 'truth_change']
ROW_UNDER_FEET = ['unnamed_sentry', 'unnamed_sentry_cracked', 'truth_grief', 'truth_change']


def drawn_frames():
    import ep8_drawn as DR
    import ep8_enemies as E8
    out = []
    for fid, img in DR.base().items():
        H, W = img.shape[:2]
        out.append((fid, img, W // 2, H - 1))
        fr = E8.pack8(fid, img, DR.derived(fid, img))
        out += [(f'{fid}_{n}', *fr[n]) for n in AF.ORDER if n in fr and (n != 'cast' or fid in DR.CASTERS)]
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
        meta.update(extra(rects) if callable(extra) else extra)
    meta['notes'] = notes
    write_json(os.path.join(DST, f'{name}.json'), meta)
    return meta


NOTES_BATTLE = ('Episode 8 pack atlas, merged into enemies_battle. Base frame <id> facing RIGHT, origin bottom-centre (the default; '
                'the `origin` table agrees). Derived <id>_idle_1, _attack, _hurt, _die_0..2 for every id, _cast for margin_imp, '
                'paper_crane, catalog_wraith, inkbound_librarian, unnamed_sentry(_cracked), struck_page, truth_grief, truth_change; '
                'anims <id>_idle and <id>_die. Draw 1x, untinted. index_hound, margin_imp, paper_crane, gnawing_bookworm, '
                'catalog_wraith, inkbound_librarian (enemies.png cells 2, 0, 6, 3, 1, 5, recoloured ink black, violet, cream paper '
                'and gold), unnamed_sentry (cell 5, gilt over ink, a blank faceplate) and unnamed_sentry_cracked (its 50% look: the '
                'faceplate cracked), struck_page, truth_grief, truth_change (drawn in code; Grief and Change stand on their own '
                'ground shadow). Every foe carries a dark outline and a gold rim. `rows`: for the foes whose HUD row sits under '
                'their feet, `feet` [dx, dy] from the origin (the origin itself) and `bodyPx` [x0, x1, y0, y1] of the opaque body '
                'from the origin, for the row-placement test (CRITIQUE_8 item 1: rows at least 12 internal px from any party '
                'sprite). The Eraser lives in bosses_battle (see `external`).')
NOTES_BOSS = ('Episode 8 pack atlas, merged into bosses_battle. The Eraser (bosses.png cell 7, 1x, not flipped) in four looks: '
              'eraser (Closed Book, as painted: black and violet robes, the empty white face, the floating pages), eraser_truths '
              '(The Rejected Truths: the robes spread like two book covers, Grief and Change small in the folds), '
              'eraser_remembers (The Keeper Remembers: the face half drawn in gold lines), eraser_silence (The Last Silence: the '
              'robes torn to blank pages, the face a white glare, the pages stopped). Each has _idle_1, _attack, _hurt, _cast, '
              '_die_0..2. The phases name their look (E8-battle\'s enemies.js `sprite`; ai.js enterPhase forwards it). `hud`: '
              'one anchor per look, the same in all four (CRITIQUE_8 item 1): `hood` is the top of the hood over the face\'s '
              'left edge (the top-left of the body; the dark ring above is not counted) as [dx, dy] from the bottom-centre '
              'origin (dy negative, up); `headPx` the hood and face box [x0, x1, y0, y1] from the origin; `head` the same box '
              'as fractions of that look\'s packed frame (layout.js HEAD_BOX format).')


def hud_meta(rects):
    import ep8_eraser as ER
    h = ER.hud()
    out = {}
    for look in ERASER_LOOKS:
        px = h[look]['headPx']
        r = rects[look]
        fx, fy = r[2] // 2, r[3] - 1
        frac = [round((px[0] + fx) / r[2], 3), round((px[1] + fx) / r[2], 3), round((px[2] + fy) / r[3], 3),
                round((px[3] + fy) / r[3], 3)]
        out[look] = {'hood': h[look]['hood'], 'headPx': px, 'head': frac}
    return {'hud': out}


def rows_meta(frames_by_name):
    def f(rects):
        out = {}
        for eid in ROW_UNDER_FEET:
            img, ox, oy = frames_by_name[eid]
            ys, xs = np.nonzero(img[..., 3] > 0.5)
            out[eid] = {'feet': [0, 0], 'bodyPx': [int(xs.min()) - ox, int(xs.max()) + 1 - ox, int(ys.min()) - oy, int(ys.max()) + 1 - oy]}
        return {'rows': out}
    return f


def field_atlas():
    import ep8_field as F
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
    AA.save_indexed(sheet, os.path.join(DST, 'ep8_enemies_field.png'))
    meta = {'image': 'ep8_enemies_field.png', 'frames': rects, 'anims': anims, 'sprites': sizes, 'facing': 'left',
            'notes': 'Episode 8 pack atlas, merged into enemies_field. Frames face LEFT (flip for right), 2-frame idle, origin '
                     'bottom-centre. Each foe carries its own dark outline (it holds on the cream parchment and the white page) '
                     'and a 1 px gold rim inside it (it holds on the violet void and the dark ink floors), so a FIELD_LOOK '
                     'entry is not needed. eraser_avatar (front) and eraser_avatar_back (seen from behind, mirrored) are the '
                     'Eraser as the figure on the stair: the empty white face under the hood, a sleeve trailing from the robe.'}
    write_json(os.path.join(DST, 'ep8_enemies_field.json'), meta)
    return meta, f, items


ERASER_CROP = {48: (-8, 14), 32: (5, 7)}     # (dx, dy) from the face's top-left to the crop centre


def portrait_frames():
    """first_keeper: the built hooded_sage cell copied from portraits.png pixel for pixel; eraser: 1x crops of the Closed
    Book frame (the white face under the hood, the hood's edge and the ring above it, a page at the shoulder (48); the
    face and the hood (32))"""
    import build_portraits as BP
    import ep8_eraser as ER
    pj = json.load(open(os.path.join(DST, 'portraits.json'), encoding='utf-8'))
    pim = np.asarray(Image.open(os.path.join(DST, pj['image'])).convert('RGBA')).astype(np.float32) / 255
    out = {}
    for n in (48, 32):
        x, y, w, h = pj['frames'][f'hooded_sage_{n}']
        out[f'first_keeper_{n}'] = pim[y:y + h, x:x + w].copy()
    fx, fy = ER.face_xy()
    look = ER.base()['eraser']
    for n in (48, 32):
        dx, dy = ERASER_CROP[n]
        out[f'eraser_{n}'] = BP.make_from_frame(look, fx + dx, fy + dy, n)
    return out


def portraits():
    fr = portrait_frames()
    sh = Shelf(128, pad=0)
    for k in ('first_keeper_48', 'eraser_48', 'first_keeper_32', 'eraser_32'):
        sh.add(k, fr[k])
    sheet, rects = sh.render()
    AA.save_indexed(sheet, os.path.join(DST, 'ep8_portraits.png'))
    meta = {'image': 'ep8_portraits.png', 'frames': rects,
            'portraits': {'first_keeper': {'48': 'first_keeper_48', '32': 'first_keeper_32'},
                          'eraser': {'48': 'eraser_48', '32': 'eraser_32'}},
            'sources': {'first_keeper': 'hooded_sage (portraits.webp cell 7), the built frames copied unchanged (E8-sprites)',
                        'eraser': 'battle frame eraser (Closed Book; 1x crop, E8-sprites)'},
            'notes': 'Episode 8 pack atlas, merged into portraits. first_keeper: the hooded_sage portrait held since Episode 1 '
                     '(the elderly hooded librarian, violet robe, pale face, gold eyes, book clasp), its built 48 and 32 frames '
                     'copied pixel for pixel under the id the Episode 8 data names; shown only from eraser_after on (the twist '
                     'in order). eraser: the empty white face under the hood with the ring above and the robe at the shoulder '
                     '(48), the face and hood (32), cropped at 1x from the Closed Book battle frame.'}
    write_json(os.path.join(DST, 'ep8_portraits.json'), meta)
    return meta, fr


def build():
    # extras (colours outside the master palette) are not used by Episode 8; keep the shared registry as it was
    saved = {k: set(v) for k, v in P.EXTRAS.items()}
    try:
        return _build()
    finally:
        P.EXTRAS.clear()
        P.EXTRAS.update(saved)


def _build():
    t0 = time.time()
    os.makedirs(OUT8, exist_ok=True)
    import ep8_npcs, ep8_enemies as E8, ep8_eraser as ER, ep8_heads as HD
    mn, _ = ep8_npcs.previews()
    fb = E8.atlas_frames() + drawn_frames()
    by_name = {n: (img, ox, oy) for n, img, ox, oy in fb}
    ids_b = E8.ALL_IDS + DRAWN
    mb = battle_atlas(fb, 'ep8_enemies_battle', ids_b, 256, external={k: 'bosses_battle' for k in ERASER_LOOKS},
                      notes=NOTES_BATTLE, extra=rows_meta(by_name))
    fo = ER.atlas_frames()
    mo = battle_atlas(fo, 'ep8_bosses_battle', ERASER_LOOKS, 512, notes=NOTES_BOSS, extra=hud_meta)
    mf, ff, fitems = field_atlas()
    HD.build(ff)
    mp, pf = portraits()
    for s in (1, 4):
        contact(fitems, os.path.join(OUT8, f'ep8_enemies_field_{s}x.png'), scale=s, cols=6, bg=(238, 230, 214),
                title='ep8_enemies_field at %dx (facing left)' % s if s > 1 else None, label=s > 1)
    items = [(k.replace('_', ' '), v) for k, v in pf.items()]
    contact(items, os.path.join(OUT8, 'ep8_portraits_6x.png'), scale=6, cols=4, title='ep8_portraits at 6x')
    contact(items, os.path.join(OUT8, 'ep8_portraits_1x.png'), scale=1, cols=4, label=False)
    print('ep8: %d npc frames, %d battle frames, %d boss frames, %d field frames in %.1fs' % (
        len(mn['frames']), len(mb['frames']), len(mo['frames']), len(mf['frames']), time.time() - t0))
    return {'npcs': mn, 'battle': mb, 'bosses': mo, 'field': mf, 'portraits': mp}


if __name__ == '__main__':
    build()
