"""Episode 7 sprite previews and the contrast check (E7-sprites; read-only on the atlases, and on E7-tiles' tile sheet and
backdrops when they exist, here or in the E7-tiles checkout named by LQ_EP7_TILES; writes only tools/art/sprites/out/ep7/
and the combined contact sheet next/qa/out/e7_sprites_contact.png):

  anim_<group>_3x.png         every Episode 7 battle id with its derived frames
  compare_beings_<n>x_<bg>    the White Phantom, the Pale Lantern and the Frostbound Revenant beside the Storm Scribe, the
                              Lightning Manta and the Sand Oracle: six different beings (the brief's side-by-side check);
                              compare_cousins_* puts each foe beside its Episode 6 cousin of the same cell
  stage_<name>_<grade>        the foes on E7-tiles' battle backdrops (ep7_battle_*) when they exist, else on two mocks: a
                              bright snow day and a dark vault (band drawn), at 1x and at phone scale (x1.806 nearest)
  ward_slots_<bg>             the Phantom in the Ward look with the Closed Gate and the Lost Letter in front-row foe slots
                              beside it, the party's front line drawn, the Phantom's crown anchor marked in all three looks
  field_<floor>_<n>x.png      every field foe on each floor (the real ep7.png terrains when E7-tiles has made them, else
                              code-drawn floors: snow, ice path, the fade, frost brick, ice glass, letter stone, white nave),
                              with the floor's tint and dark, at 3x and at phone scale
  npc_scene_<n>x.png          the cast in a row on snow
  contrast.json               per foe and stage: the share of its silhouette edge at least 0.15 luma off the ground behind

    python ep7_preview.py
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from PIL import Image, ImageDraw
from pix import *
import ep5_preview as P5

OUT7 = os.path.join(OUT, 'ep7')
BACKD = P5.BACKD
TILES = P5.TILES
TILES_ALT = os.environ.get('LQ_EP7_TILES', r'D:\lq-ep6\next\assets\tiles')
atlas, frame, over, phone, upscale_arr = P5.atlas, P5.frame, P5.over, P5.phone, P5.upscale_arr
band_contrast, place, stage_row, tint, darken, hexf = P5.band_contrast, P5.place, P5.stage_row, P5.tint, P5.darken, P5.hexf
CONTACT = os.path.join(NEXT, 'qa', 'out', 'e7_sprites_contact.png')


def C(ref):
    import pal as P
    return np.array(hex2rgb(P.color(ref)), np.float32) / 255


# ----------------------------------------------------------------------------- derived-frame sheets
def anim_sheets():
    import x1_enemies as XE
    import ep7_enemies as E, ep7_phantom as PH, ep7_build as B
    dr = {}
    for n, img, ox, oy in B.drawn_frames():
        key = next(k for k in B.DRAWN if n == k or n.startswith(k + '_'))
        dr.setdefault(key, []).append((n, img, ox, oy))

    def fo(eid):
        if eid in PH.IDS:
            return PH.frames_of(eid)
        if eid in dr:
            return dr[eid]
        return E.frames_of(eid)
    XE.frames_of = fo
    groups = {'a': E.IDS[:3], 'b': E.IDS[3:], 'lantern': ['pale_lantern'], 'drawn': B.DRAWN}
    paths = []
    for g, ids in groups.items():
        p = os.path.join(OUT7, f'anim_{g}_3x.png')
        XE.anim_sheet(p, ids, scale=3, bg=(30, 34, 52))
        paths.append(p)
    p = os.path.join(OUT7, 'anim_phantom_2x.png')
    XE.anim_sheet(p, PH.IDS, scale=2, bg=(30, 34, 52))
    paths.append(p)
    return paths


# ----------------------------------------------------------------------------- side by side with the other bosses
def compare():
    j5b, i5b = atlas('ep5_bosses_battle')
    j6b, i6b = atlas('ep6_bosses_battle')
    j6e, i6e = atlas('ep6_enemies_battle')
    j7b, i7b = atlas('ep7_bosses_battle')
    j7e, i7e = atlas('ep7_enemies_battle')
    items = [frame(j7b, i7b, 'white_phantom'), frame(j7e, i7e, 'pale_lantern'), frame(j7e, i7e, 'frostbound_revenant'),
             frame(j6b, i6b, 'scribe'), frame(j6e, i6e, 'lightning_manta'), frame(j5b, i5b, 'oracle')]
    for bg, tag in (((30, 34, 52), 'vault'), ((226, 234, 242), 'snow')):
        s = stage_row(items, bg)
        save_png(s, os.path.join(OUT7, f'compare_beings_1x_{tag}.png'))
        to_pil(upscale_arr(s, 3)).save(os.path.join(OUT7, f'compare_beings_3x_{tag}.png'))
    # each foe beside its Episode 6 cousin of the same painted cell
    pairs = [('rime_wolf', 'squall_wolf'), ('snow_wisp', 'gale_sprite'), ('hush_owl', 'storm_harrier'),
             ('crystal_crawler', 'rigger_beetle'), ('frostbound_revenant', 'lightning_manta'), ('pale_lantern', 'signal_wraith'),
             ('rimed_page', 'storm_page')]
    items = []
    for a, b in pairs:
        items += [frame(j7e, i7e, a), frame(j6e, i6e, b)]
    for bg, tag in (((30, 34, 52), 'vault'), ((226, 234, 242), 'snow')):
        s = stage_row(items, bg)
        to_pil(upscale_arr(s, 2)).save(os.path.join(OUT7, f'compare_cousins_2x_{tag}.png'))
    return os.path.join(OUT7, 'compare_beings_3x_vault.png')


# ----------------------------------------------------------------------------- battle stages and the contrast measure
def backdrop(name):
    j = json.load(open(os.path.join(BACKD, f'ep7_battle_{name}.json'), encoding='utf-8'))
    im = np.asarray(Image.open(os.path.join(BACKD, j['image'])).convert('RGBA')).astype(np.float32) / 255
    im = im.copy()
    by, ba = j.get('bandY', 118), j.get('bandAlpha', 0.44)
    im[by:, :, :3] = im[by:, :, :3] * (1 - ba) + np.array(P5.BAND) * ba
    return im


def mock(kind):
    """flat stages: snow (the brightest: a pale sky over a snow floor) and vault (the darkest: navy stone, a dark floor,
    a few cold lamp specks); the band drawn as the scene draws it"""
    im = np.zeros((216, 384, 4), np.float32)
    im[..., 3] = 1
    if kind == 'snow':
        im[:120, :, :3] = C('ice:3')
        im[120:, :, :3] = C('metal:4')
        im[120, :, :3] = C('stone_cool:5')
    else:
        im[:120, :, :3] = C('shadow:2')
        im[120:, :, :3] = C('shadow:1')
        rng = np.random.RandomState(4)
        for _ in range(40):
            x, y = rng.randint(0, 380), rng.randint(0, 112)
            im[y, x, :3] = C('water:3')
    ba = 0.55                                  # layout.js BAND: y 120, alpha 0.55, #292657
    im[120:, :, :3] = im[120:, :, :3] * (1 - ba) + hexf('#292657') * ba
    return im


# layout.js: one baseline (y 146) for both sides; ENEMY_X by group size; BOSS_SLOT x 98; the party leader's feet at x 290
SLOTS = [(52, 146), (124, 146), (196, 146)]
BOSS_SLOT = (98, 146)
GROUPS = {
    'road': [['rime_wolf', 'rime_wolf'], ['rime_wolf', 'snow_wisp'], ['hush_owl', 'hush_owl']],
    'vault': [['snow_wisp', 'snow_wisp', 'hush_owl'], ['crystal_crawler', 'crystal_crawler'], ['rime_wolf', 'frostbound_revenant']],
    'hall': [['ice_knight', 'snow_wisp'], ['frostbound_revenant', 'frostbound_revenant'], ['ice_knight', 'hush_owl', 'crystal_crawler'],
             ['pale_lantern']],
    'sanctum': [['rimed_page', 'rimed_page'], ['ice_knight', 'rimed_page'], ['frostbound_revenant', 'rimed_page']],
    'stillheart': [['white_phantom'], ['closed_gate', 'white_phantom_ward', 'lost_letter'], ['white_phantom_thaw']],
}
_A = {}


def sprite_of(eid):
    jb, ib = _A['b']
    je, ie = _A['e']
    return frame(jb, ib, eid) if eid in jb['frames'] else frame(je, ie, eid)


# the ward: the Gate and the Letter in front-row foe slots right of the Phantom, between it and the party, each 72 px HUD
# row under its own feet without meeting the other's (centres 78 apart), the Letter 12+ px clear of the party leader's
# 32 px sprite (left edge 274). Proposed for E7-scene-ui as WARD_SPOTS { closed_gate: 150, lost_letter: 228 }, y 146.
WARD_SLOTS = [(150, 146), (98, 146), (228, 146)]
PARTY_X = 274             # the party leader's sprite's left edge (feet x 290, 32 px wide)
PARTY_FEET = [290, 318, 346]


def slots_for(group):
    if len(group) == 1:
        return [BOSS_SLOT]
    if 'white_phantom_ward' in group:
        return WARD_SLOTS
    if len(group) == 2:
        return [(78, 146), (164, 146)]
    return SLOTS


def stages():
    _A['e'] = atlas('ep7_enemies_battle')
    _A['b'] = atlas('ep7_bosses_battle')
    results = {}
    names = [n for n in GROUPS if os.path.exists(os.path.join(BACKD, f'ep7_battle_{n}.json'))]
    plans = [(n, 'painted') for n in names] + [('mock', 'snow'), ('mock', 'vault')]
    outs = []
    for name, grade in plans:
        bg = backdrop(name) if name != 'mock' else mock(grade)
        groups = GROUPS.get(name) or [['rime_wolf', 'snow_wisp', 'hush_owl'], ['crystal_crawler', 'frostbound_revenant', 'rimed_page'],
                                      ['ice_knight', 'snow_wisp'], ['pale_lantern'],
                                      ['closed_gate', 'white_phantom_ward', 'lost_letter'], ['white_phantom'], ['white_phantom_thaw']]
        shots = []
        for group in groups:
            comp, masks = place(bg, [sprite_of(e) for e in group], slots_for(group))
            sh = C('shadow:1')
            for eid, m in zip(group, masks):
                m = m & ~(np.abs(comp[..., :3] - sh).sum(-1) < 0.01)
                results.setdefault(eid, {})[f'{name}_{grade}'] = round(band_contrast(bg, comp, m), 3)
            shots.append(comp)
        sheet = np.concatenate(shots, 0)
        tag = f'stage_{name}_{grade}'
        save_png(sheet, os.path.join(OUT7, f'{tag}_1x.png'))
        for i, s in enumerate(shots):
            phone(s).save(os.path.join(OUT7, f'{tag}_phone_{i}.png'))
        outs.append(sheet)
    return results, outs


def ward_slots():
    """the Ward with its two adds in front-row slots, a party line at PARTY_X, each add's HUD row under its own feet, and the
    Phantom's crown anchor marked in all three looks (the cross must sit on the crown in every look). Returns the gaps"""
    import ep7_build as B
    jb, ib = _A['b']
    hud = jb['hud']
    out = {}
    rows = []
    for bgk, bg in (('snow', mock('snow')), ('vault', mock('vault'))):
        order = ('white_phantom_ward', 'closed_gate', 'lost_letter')
        comp, masks = place(bg, [sprite_of(e) for e in order], [WARD_SLOTS[1], WARD_SLOTS[0], WARD_SLOTS[2]])
        # the party: stand-in 32 x 32 bodies on their feet
        for fx in PARTY_FEET:
            comp[114:146, fx - 16:fx + 16, :3] = C('fire:3')
            comp[114, fx - 16:fx + 16, :3] = C('fire:5')
        # HUD rows (72 x 14) under the adds' feet, as enemyRowAnchor places them (x = feet - 36, y = feet + 2)
        for (fx, fy) in (WARD_SLOTS[0], WARD_SLOTS[2]):
            x0 = max(4, fx - 36)
            comp[fy + 2:fy + 16, x0:x0 + 72, :3] = C('ui_blue:2')
            comp[fy + 2, x0:x0 + 72, :3] = C('ui_blue:5')
        rows.append(comp)
        for eid, m in zip(('closed_gate', 'lost_letter'), (masks[1], masks[2])):
            xs = np.nonzero(m.any(0))[0]
            out[f'{eid}_right_edge_to_party_px'] = int(PARTY_X - xs.max() - 1)
    g, l = WARD_SLOTS[0][0], WARD_SLOTS[2][0]
    out['rows_gap_px'] = int((l - 36) - (g - 36 + 72))
    out['letter_row_right_edge_to_party_px'] = int(PARTY_X - (l - 36 + 72))
    # the crown anchor in every look, at the boss slot: a cross where the HUD anchor says the crown is
    looks = []
    for look in B.PHANTOM_LOOKS:
        st = mock('vault')
        comp, _ = place(st, [sprite_of(look)], [BOSS_SLOT])
        cx, cy = BOSS_SLOT[0] + hud[look]['crown'][0], BOSS_SLOT[1] + hud[look]['crown'][1]
        for d in range(-4, 5):
            if 0 <= cx + d < 384:
                comp[cy, cx + d, :3] = C('fire:5')
            if 0 <= cy + d < 216:
                comp[cy + d, cx, :3] = C('fire:5')
        looks.append(comp)
    sheet = np.concatenate(rows, 0)
    save_png(sheet, os.path.join(OUT7, 'ward_slots_1x.png'))
    to_pil(upscale_arr(sheet, 2)).save(os.path.join(OUT7, 'ward_slots_2x.png'))
    lk = np.concatenate(looks, 1)
    to_pil(upscale_arr(lk, 2)).save(os.path.join(OUT7, 'phantom_anchor_2x.png'))
    return out, sheet, lk


# ----------------------------------------------------------------------------- field floors at phone scale
def _tiles_dir():
    for d in (TILES, TILES_ALT):
        if os.path.exists(os.path.join(d, 'ep7_tiles.json')) and os.path.exists(os.path.join(d, 'ep7.png')):
            return d
    return None


def terrain_tiles(tid):
    d = _tiles_dir()
    if not d:
        raise FileNotFoundError('ep7 tiles')
    j = json.load(open(os.path.join(d, 'ep7_tiles.json'), encoding='utf-8'))
    sheet = np.asarray(Image.open(os.path.join(d, 'ep7.png')).convert('RGBA')).astype(np.float32) / 255
    t = j['terrains'][tid]
    vs = t.get('variants') or []
    tiles = [sheet[y:y + 16, x:x + 16] for x, y in vs] or [sheet[t['y'] + 16:t['y'] + 32, t['x']:t['x'] + 16]]
    ws = t.get('variantWeights') or []
    if len(ws) != len(tiles):
        ws = [1] * len(tiles)
    return tiles, ws


def real_floor(tid, w, h, seed):
    tiles, ws = terrain_tiles(tid)
    p = np.array(ws, np.float64)
    p /= p.sum()
    rng = np.random.RandomState(seed)
    out = np.zeros((h, w, 4), np.float32)
    out[..., 3] = 1
    for ty in range(0, h, 16):
        for tx in range(0, w, 16):
            t = tiles[rng.choice(len(tiles), p=p)]
            out[ty:ty + 16, tx:tx + 16, :3] = t[:min(16, h - ty), :min(16, w - tx), :3]
    return out


def mock_floor(kind, w, h, seed=1):
    """code-drawn stand-ins in the floors' own ramps (E7-tiles' sheet replaces them when it exists)"""
    rng = np.random.RandomState(seed)
    out = np.zeros((h, w, 4), np.float32)
    out[..., 3] = 1
    ys, xs = np.mgrid[0:h, 0:w]
    if kind == 'snow':
        n = (np.sin(xs * 0.21 + ys * 0.13) + np.sin(xs * 0.07 - ys * 0.31) + rng.rand(h, w) * 0.6)
        out[..., :3] = np.where((n > 0.9)[..., None], C('metal:4'), np.where((n > -0.4)[..., None], C('metal:3'), C('stone_cool:5')))
    elif kind == 'fade':
        out[..., :3] = C('metal:4')
        out[(rng.rand(h, w) > 0.97), :3] = C('metal:3')
    elif kind == 'icepath':
        out[..., :3] = C('ice:2')
        out[(rng.rand(h, w) > 0.9), :3] = C('ice:3')
    elif kind == 'frostbrick':
        out[..., :3] = C('stone_cool:4')
        out[((ys % 8) == 7) | (((xs + (ys // 8) * 8) % 16) == 0), :3] = C('stone_cool:2')
        out[((ys % 8) == 0), :3] = C('ice:3')
    elif kind == 'glass':
        out[..., :3] = C('ice:2')
        out[((xs % 16) == 0) | ((ys % 16) == 0), :3] = C('water:4')
        out[((xs - ys) % 16) == 3, :3] = C('ice:3')
    elif kind == 'letter_stone':
        out[..., :3] = C('shadow:2')
        out[((xs % 16) == 0) | ((ys % 16) == 0), :3] = C('shadow:1')
        out[((xs % 16) == 5) & ((ys % 16) > 4) & ((ys % 16) < 9), :3] = C('stone_cool:2')
    elif kind == 'nave':
        out[..., :3] = C('metal:3')
        out[((xs % 24) < 6), :3] = C('stone_cool:5')
    return out


# tints as E7-world is expected to register them (assumed until src/data/ep7/world.js lands: `aurora` a cool violet wash)
TINT = {'aurora': {'color': '#9a8ae0', 'alpha': 0.25}}
# (tag, E7-tiles terrain id, mock kind, tint, dark)
FLOORS = [
    ('road_snow', 'snowfield', 'snow', None, 0.0),
    ('road_icepath', 'icepath', 'icepath', None, 0.0),
    ('road_fade', 'fade', 'fade', None, 0.0),
    ('f1_frostbrick', 'frostbrick', 'frostbrick', None, 0.0),
    ('f1_iceglass', 'iceglass', 'glass', None, 0.0),
    ('f1_fade', 'fade', 'fade', None, 0.0),
    ('f2_letter_stone', 'letter_stone', 'letter_stone', None, 0.45),
    ('f3_nave', 'nave_ice', 'nave', 'aurora', 0.3),
    ('f3_fade', 'fade', 'fade', 'aurora', 0.3),
    ('stillheart', 'nave_ice', 'nave', 'aurora', 0.3),
]


def field_phone():
    j, im = atlas('ep7_enemies_field')
    names = [n for n in j['frames'] if n.endswith('_0') and 'avatar' not in n]
    results, rows, used = {}, [], {}
    for tag, tid, kind, t, dark in FLOORS:
        try:
            fl = real_floor(tid, 16 * 24, 64, seed=len(tag))
            used[tag] = 'ep7.png ' + tid
        except (KeyError, FileNotFoundError, OSError):
            fl = mock_floor(kind, 16 * 24, 64, seed=len(tag))
            used[tag] = 'mock ' + kind
        comp = fl.copy()
        x = 12
        masks = []
        if tag == 'stillheart':
            sprites = [frame(j, im, 'phantom_avatar_0'), frame(j, im, 'phantom_avatar_back_0')]
            names_here = ['phantom_avatar', 'phantom_avatar_back']
        else:
            sprites = [frame(j, im, n) for n in names]
            names_here = [n[:-2] for n in names]
        for s in sprites:
            h, w = s.shape[:2]
            y = 58 - h
            over(comp, s, x, y)
            m = np.zeros(comp.shape[:2], bool)
            m[y:y + h, x:x + w] = s[..., 3] > 0.5
            masks.append(m)
            x += max(w, 24) + 20
        lit_bg = darken(tint(fl, TINT.get(t)), dark)
        lit = darken(tint(comp, TINT.get(t)), dark)
        for n, m in zip(names_here, masks):
            results.setdefault(n, {})[tag] = round(band_contrast(lit_bg, lit, m), 3)
        save_png(lit, os.path.join(OUT7, f'field_{tag}_1x.png'))
        to_pil(upscale_arr(lit, 3)).save(os.path.join(OUT7, f'field_{tag}_3x.png'))
        rows.append(lit)
    sheet = np.concatenate(rows, 0)
    save_png(sheet, os.path.join(OUT7, 'field_floors_1x.png'))
    phone(sheet).save(os.path.join(OUT7, 'field_floors_phone.png'))
    return results, used, sheet


def npc_scene():
    j, im = atlas('ep7_npcs')
    ids = list(j['sprites'].keys())
    items = [frame(j, im, f'{i}_down_0') for i in ids]
    fl = mock_floor('snow', 26 * len(items) + 8, 48, seed=5)
    x = 4
    for s in items:
        over(fl, s, x, 44 - s.shape[0])
        x += 26
    save_png(fl, os.path.join(OUT7, 'npc_scene_1x.png'))
    to_pil(upscale_arr(fl, 3)).save(os.path.join(OUT7, 'npc_scene_3x.png'))
    phone(fl).save(os.path.join(OUT7, 'npc_scene_phone.png'))
    return fl


# ----------------------------------------------------------------------------- the combined contact sheet for Scott
def combined(anim_paths, field_sheet, ward_sheet, anchor_strip, npc_strip):
    from PIL import ImageFont
    font = ImageFont.load_default()
    secs = []

    def label(title, img):
        out = Image.new('RGB', (img.width, img.height + 16), (18, 20, 32))
        out.paste(img, (0, 16))
        ImageDraw.Draw(out).text((4, 2), title, fill=(240, 236, 210), font=font)
        return out

    j, im = atlas('ep7_npcs')
    ids = list(j['sprites'].keys())
    items = []
    for i in ids:
        for d in ('down', 'left', 'right', 'up'):
            items.append((f'{i[4:]} {d}' if d == 'down' else d, frame(j, im, f'{i}_{d}_0')))
    p = os.path.join(OUT7, '_c_npcs.png')
    contact(items, p, scale=3, cols=16, bg=(214, 224, 236))
    secs.append(label('NPCs (stand: down, left, right, up) at 3x', Image.open(p).convert('RGB')))
    for ap in anim_paths:
        secs.append(label('battle frames: ' + os.path.basename(ap), Image.open(ap).convert('RGB')))
    secs.append(label('the Phantom, its crown HUD anchor (cross) in Outer Frost, the Frozen Ward, Thawlight (2x)',
                      to_pil(upscale_arr(anchor_strip, 2)).convert('RGB')))
    secs.append(label('the Ward: the Closed Gate and the Lost Letter in front-row slots, rows under their feet, party line (2x)',
                      to_pil(upscale_arr(ward_sheet, 2)).convert('RGB')))
    cp = os.path.join(OUT7, 'compare_beings_3x_vault.png')
    if os.path.exists(cp):
        c = Image.open(cp).convert('RGB')
        c = c.resize((c.width * 2 // 3, c.height * 2 // 3), Image.NEAREST)
        secs.append(label('six beings: Phantom, Pale Lantern, Frostbound Revenant | Storm Scribe, Lightning Manta, Sand Oracle', c))
    secs.append(label('field sprites on each floor (phone scale)', phone(field_sheet).convert('RGB')))
    jf, imf = atlas('ep7_enemies_field')
    p = os.path.join(OUT7, '_c_field.png')
    contact([(n, frame(jf, imf, n)) for n in jf['frames']], p, scale=4, cols=10, bg=(226, 234, 242))
    secs.append(label('field frames at 4x (facing left)', Image.open(p).convert('RGB')))
    jh, ih = atlas('ep7_heads', os.path.join(NEXT, 'assets', 'ui'))
    jp, ip = atlas('ep7_portraits')
    hp = [(n[5:], frame(jh, ih, n)) for n in jh['frames']] + [(n, frame(jp, ip, n)) for n in jp['frames']]
    p = os.path.join(OUT7, '_c_heads.png')
    contact(hp, p, scale=5, cols=13, bg=(30, 46, 110))
    secs.append(label('timeline heads and the phantom portrait (48, 32) at 5x', Image.open(p).convert('RGB')))
    secs.append(label('the cast on snow (3x)', to_pil(upscale_arr(npc_strip, 3)).convert('RGB')))
    W = max(s.width for s in secs)
    H = sum(s.height + 6 for s in secs)
    out = Image.new('RGB', (W, H), (18, 20, 32))
    y = 0
    for s in secs:
        out.paste(s, (0, y))
        y += s.height + 6
    os.makedirs(os.path.dirname(CONTACT), exist_ok=True)
    out.save(CONTACT)
    return CONTACT


if __name__ == '__main__':
    os.makedirs(OUT7, exist_ok=True)
    paths = anim_sheets()
    compare()
    st, _ = stages()
    gaps, ward_sheet, anchor = ward_slots()
    fp, used, fsheet = field_phone()
    npcs = npc_scene()
    allr = {'battle': st, 'field': fp, 'floors': used, 'ward_gaps_px': gaps}
    with open(os.path.join(OUT7, 'contrast.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(allr, f, indent=1, sort_keys=True)
    worst = sorted(((v, k, s) for k, d in st.items() for s, v in d.items()))[:6]
    print('battle: worst edge-contrast shares', worst)
    worstf = sorted(((v, k, s) for k, d in fp.items() for s, v in d.items()))[:8]
    print('field: worst', worstf)
    print('floors', used)
    print('ward gaps', gaps)
    print('contact sheet', combined(paths, fsheet, ward_sheet, anchor, npcs))
    print('previews in', OUT7)
