"""Episode 8 sprite previews (E8-sprites; read-only on the atlases, writes only tools/art/sprites/out/ep8/):

  anim_<group>_3x.png          every Episode 8 battle id with its derived frames
  compare_cousins_2x_<bg>      each foe beside its Episode 7 cousin of the same painted cell (none may read as a cousin)
  stage_<look>_phone.png       the Eraser in each of its four looks on a void stage (the band drawn as the scene draws
                               it) at phone scale (x1.806 nearest), Grief and Change in front-row foe slots in the Rejected
                               Truths, the party's front line drawn, the one hood anchor marked (a red cross) in all four
  stage_sentry_phone.png       the Unnamed Sentry (whole and cracked) with two Struck-Out Pages
  field_<floor>_phone.png      every field foe, the Eraser's avatar and the cast on code-drawn floors at phone scale:
                               parchment (the Scriptorium), marble (the town's page-stones), the white page (F3) and the
                               violet void (the stair's edge)
  rows.json                    the measured gaps between the under-the-feet rows' bodies and the party's front line

    python ep8_preview.py
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from PIL import Image, ImageDraw
from pix import *
import ep5_preview as P5

OUT8 = os.path.join(OUT, 'ep8')
atlas, frame, over, phone, upscale_arr, stage_row = P5.atlas, P5.frame, P5.over, P5.phone, P5.upscale_arr, P5.stage_row


def C(ref):
    import pal as P
    return np.array(hex2rgb(P.color(ref)), np.float32) / 255


def anim_sheets():
    import x1_enemies as XE
    import ep8_enemies as E, ep8_eraser as ER, ep8_build as B
    dr = {}
    for n, img, ox, oy in B.drawn_frames():
        key = next(k for k in B.DRAWN if n == k or n.startswith(k + '_'))
        dr.setdefault(key, []).append((n, img, ox, oy))

    def fo(eid):
        if eid in ER.IDS:
            return ER.frames_of(eid)
        if eid in dr:
            return dr[eid]
        return E.frames_of(eid)
    XE.frames_of = fo
    groups = {'a': E.IDS[:3], 'b': E.IDS[3:], 'sentry': E.SENTRY, 'drawn': B.DRAWN}
    paths = []
    for g, ids in groups.items():
        p = os.path.join(OUT8, f'anim_{g}_3x.png')
        XE.anim_sheet(p, ids, scale=3, bg=(52, 30, 84))
        paths.append(p)
    p = os.path.join(OUT8, 'anim_eraser_2x.png')
    XE.anim_sheet(p, ER.IDS, scale=2, bg=(52, 30, 84))
    paths.append(p)
    return paths


def compare():
    j7, i7 = atlas('ep7_enemies_battle')
    j8, i8 = atlas('ep8_enemies_battle')
    pairs = [('index_hound', 'rime_wolf'), ('margin_imp', 'snow_wisp'), ('paper_crane', 'hush_owl'),
             ('gnawing_bookworm', 'crystal_crawler'), ('catalog_wraith', 'pale_lantern'), ('inkbound_librarian', 'ice_knight'),
             ('unnamed_sentry', 'ice_knight'), ('struck_page', 'rimed_page')]
    items = []
    for a, b in pairs:
        items += [frame(j8, i8, a), frame(j7, i7, b)]
    out = []
    for bg, tag in (((52, 30, 84), 'void'), ((238, 230, 214), 'page')):
        s = stage_row(items, bg)
        p = os.path.join(OUT8, f'compare_cousins_2x_{tag}.png')
        to_pil(upscale_arr(s, 2)).save(p)
        out.append(p)
    return out


# ----------------------------------------------------------------------------- battle stages
BAND = P5.BAND
PARTY_LEFT = 274                 # the hero's sprite at slot 290 (as ep7's scene measures it)
BOSS_FEET = (118, 190)
FRONT = [(176, 186), (226, 186)]  # two front-row foe slots (feet), right of the boss and short of the party


def stage_bg():
    im = np.zeros((216, 384, 4), np.float32)
    im[..., 3] = 1
    for y in range(216):
        t = y / 216.0
        im[y, :, :3] = C('hair_violet:2') * (1 - t) + C('shadow:1') * t
    rng = np.random.RandomState(8)
    for _ in range(40):
        x, y = rng.randint(0, 384), rng.randint(0, 150)
        im[y, x, :3] = C('gold:4') if rng.rand() < 0.5 else C('stone_warm:5')
    by, ba = 118, 0.44
    im[by:, :, :3] = im[by:, :, :3] * (1 - ba) + np.array(BAND) * ba
    return im


def party_line(im):
    """the party's front line: three grey placeholder bodies (24 x 32) from x 274 on, feet at y 186"""
    for i, x in enumerate((PARTY_LEFT, PARTY_LEFT + 30, PARTY_LEFT + 60)):
        y = 154 + i * 6
        im[y:y + 32, x:x + 24, :3] = im[y:y + 32, x:x + 24, :3] * 0.4 + C('stone_cool:4') * 0.6


def put_sprite(im, img, ox, oy, fx, fy):
    h, w = img.shape[:2]
    x, y = fx - ox, fy - oy
    over(im, img, x, y)
    return x, y


def stages():
    jb, ib = atlas('ep8_bosses_battle')
    je, ie = atlas('ep8_enemies_battle')
    gaps = {}
    out = []
    for look in ('eraser', 'eraser_truths', 'eraser_remembers', 'eraser_silence'):
        im = stage_bg()
        party_line(im)
        img = frame(jb, ib, look)
        H, W = img.shape[:2]
        put_sprite(im, img, W // 2, H - 1, *BOSS_FEET)
        if look == 'eraser_truths':
            for eid, (fx, fy) in zip(('truth_grief', 'truth_change'), FRONT):
                a = frame(je, ie, eid)
                h, w = a.shape[:2]
                put_sprite(im, a, w // 2, h - 1, fx, fy)
                bp = je['rows'][eid]['bodyPx']
                gaps[eid] = PARTY_LEFT - (fx + bp[1])
        hx, hy = jb['hud'][look]['hood']
        ax, ay = BOSS_FEET[0] + hx, BOSS_FEET[1] + hy
        pil = phone(im)
        d = ImageDraw.Draw(pil)
        k = 390 / 216
        X, Y = ax * k, ay * k
        d.line([(X - 6, Y), (X + 6, Y)], fill=(255, 40, 40), width=2)
        d.line([(X, Y - 6), (X, Y + 6)], fill=(255, 40, 40), width=2)
        p = os.path.join(OUT8, f'stage_{look}_phone.png')
        pil.save(p)
        out.append(p)
    # the Sentry and its two pages
    for look in ('unnamed_sentry', 'unnamed_sentry_cracked'):
        im = stage_bg()
        party_line(im)
        a = frame(je, ie, look)
        h, w = a.shape[:2]
        put_sprite(im, a, w // 2, h - 1, 110, 190)
        if look == 'unnamed_sentry_cracked':
            for (fx, fy) in FRONT:
                b = frame(je, ie, 'struck_page')
                hh, ww = b.shape[:2]
                put_sprite(im, b, ww // 2, hh - 1, fx, fy)
        bp = je['rows'][look]['bodyPx']
        gaps[look] = PARTY_LEFT - (110 + bp[1])
        p = os.path.join(OUT8, f'stage_{look}_phone.png')
        phone(im).save(p)
        out.append(p)
    json.dump(gaps, open(os.path.join(OUT8, 'rows.json'), 'w'), indent=1)
    return out, gaps


# ----------------------------------------------------------------------------- field floors
def floor(kind, w, h):
    im = np.zeros((h, w, 4), np.float32)
    im[..., 3] = 1
    rng = np.random.RandomState(5)
    if kind == 'parchment':
        im[..., :3] = C('stone_warm:5')
        for _ in range(w * h // 30):
            x, y = rng.randint(0, w), rng.randint(0, h)
            im[y, x, :3] = C('stone_warm:4')
    elif kind == 'marble':
        im[..., :3] = C('metal:3')
        for y in range(0, h, 16):
            im[y, :, :3] = C('stone_cool:4')
        for x in range(0, w, 16):
            im[:, x, :3] = C('stone_cool:4')
        for _ in range(w * h // 60):
            x, y = rng.randint(0, w), rng.randint(0, h)
            im[y, x, :3] = C('stone_cool:5')
    elif kind == 'white_page':
        im[..., :3] = C('metal:4')
        for y in range(6, h, 8):
            im[y, :, :3] = C('stone_warm:5')
    else:
        for y in range(h):
            im[y, :, :3] = C('hair_violet:2') * (1 - y / h) + C('roof_purple:1') * (y / h)
        for _ in range(w * h // 80):
            x, y = rng.randint(0, w), rng.randint(0, h)
            im[y, x, :3] = C('gold:4')
    return im


def field_phone():
    jf, iff = atlas('ep8_enemies_field')
    jn, inn = atlas('ep8_npcs')
    foes = ['index_hound', 'margin_imp', 'paper_crane', 'gnawing_bookworm', 'catalog_wraith', 'inkbound_librarian',
            'struck_page', 'unnamed_sentry', 'eraser_avatar', 'eraser_avatar_back']
    npcs = ['npc_librarian', 'npc_first_keeper', 'npc_elowen', 'npc_ione', 'npc_fen', 'npc_quinn', 'npc_sorel', 'npc_arun',
            'npc_meya', 'npc_elowen_m']
    out = []
    for kind in ('parchment', 'marble', 'white_page', 'void'):
        im = floor(kind, 384, 128)
        x = 6
        for fid in foes:
            a = frame(jf, iff, f'{fid}_0')
            h, w = a.shape[:2]
            over(im, a, x, 60 - h)
            x += w + 6
        x = 6
        for nid in npcs:
            a = frame(jn, inn, f'{nid}_down_0')
            over(im, a, x, 122 - 32)
            x += 30
        p = os.path.join(OUT8, f'field_{kind}_phone.png')
        phone(im).save(p)
        out.append(p)
    return out


if __name__ == '__main__':
    os.makedirs(OUT8, exist_ok=True)
    paths = anim_sheets() + compare()
    sp, gaps = stages()
    paths += sp + field_phone()
    print('\n'.join(paths))
    print('rows gap to the party (px, >= 12 wanted):', gaps)
