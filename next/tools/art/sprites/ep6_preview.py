"""Episode 6 sprite previews and the contrast check (E6-sprites; read-only on the atlases and on E6-tiles' backdrops and
tile sheet when they exist, writes only tools/art/sprites/out/ep6/):

  anim_<group>_3x.png         every Episode 6 battle id with its derived frames
  compare_beings_<n>x_<bg>    the Storm Scribe, the Gale Engine and the Lightning Manta beside the Sand Oracle, the Paper
                              Regent and the Cinder Warden: six different beings (the brief's side-by-side check)
  stage_<backdrop>_<grade>    the foes on E6-tiles' battle backdrops (ep6_battle_*) when they exist, else on two mocks: a
                              bright cloud day and a dark storm (band drawn), at 1x and at phone scale (x1.806 nearest)
  ward_slots_<bg>             the Scribe in the Ward look with the False Beacon and the Broken Compass in front-row foe
                              slots beside it (their HUD rows go under their own feet: CRITIQUE_7 item 2)
  field_<floor>_<n>x.png      every field foe on each floor's mock (the real ep6.png terrains when E6-tiles has shipped
                              them, else code-drawn floors: cloud, plank, glass, grating, spire stone, slate cloud), with
                              the floor's tint and dark, at 3x and at phone scale
  npc_scene_<n>x.png          the cast in a row on deck planks
  contrast.json               per foe and stage: the share of its silhouette edge at least 0.15 luma off the ground behind

    python ep6_preview.py
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from PIL import Image
from pix import *
import ep5_preview as P5

OUT6 = os.path.join(OUT, 'ep6')
BACKD = P5.BACKD
TILES = P5.TILES
atlas, frame, over, phone, upscale_arr = P5.atlas, P5.frame, P5.over, P5.phone, P5.upscale_arr
band_contrast, place, stage_row, tint, darken, hexf = P5.band_contrast, P5.place, P5.stage_row, P5.tint, P5.darken, P5.hexf


def C(ref):
    import pal as P
    return np.array(hex2rgb(P.color(ref)), np.float32) / 255


# ----------------------------------------------------------------------------- derived-frame sheets
def anim_sheets():
    import x1_enemies as XE
    import ep6_enemies as E, ep6_scribe as SC, ep6_build as B
    dr = {}
    for n, img, ox, oy in B.drawn_frames():
        key = next(k for k in B.DRAWN if n == k or n.startswith(k + '_'))
        dr.setdefault(key, []).append((n, img, ox, oy))

    def fo(eid):
        if eid in SC.IDS:
            return SC.frames_of(eid)
        if eid in dr:
            return dr[eid]
        return E.frames_of(eid)
    XE.frames_of = fo
    groups = {'a': E.IDS[:3], 'b': E.IDS[3:], 'engine': ['gale_engine'], 'drawn': B.DRAWN}
    for g, ids in groups.items():
        XE.anim_sheet(os.path.join(OUT6, f'anim_{g}_3x.png'), ids, scale=3, bg=(40, 44, 66))
    XE.anim_sheet(os.path.join(OUT6, 'anim_scribe_2x.png'), SC.IDS, scale=2, bg=(40, 44, 66))


# ----------------------------------------------------------------------------- side by side with the other bosses
def compare():
    jb, ib = atlas('bosses_battle')
    j4b, i4b = atlas('ep4_bosses_battle')
    j5b, i5b = atlas('ep5_bosses_battle')
    j6b, i6b = atlas('ep6_bosses_battle')
    j6e, i6e = atlas('ep6_enemies_battle')
    items = [frame(j6b, i6b, 'scribe'), frame(j6e, i6e, 'gale_engine'), frame(j6e, i6e, 'lightning_manta'),
             frame(j5b, i5b, 'oracle'), frame(j4b, i4b, 'paper_regent'), frame(jb, ib, 'cinder_warden')]
    for bg, tag in (((34, 36, 58), 'storm'), ((214, 226, 240), 'cloud')):
        s = stage_row(items, bg)
        save_png(s, os.path.join(OUT6, f'compare_beings_1x_{tag}.png'))
        to_pil(upscale_arr(s, 3)).save(os.path.join(OUT6, f'compare_beings_3x_{tag}.png'))


# ----------------------------------------------------------------------------- battle stages and the contrast measure
def backdrop(name):
    j = json.load(open(os.path.join(BACKD, f'ep6_battle_{name}.json'), encoding='utf-8'))
    im = np.asarray(Image.open(os.path.join(BACKD, j['image'])).convert('RGBA')).astype(np.float32) / 255
    im = im.copy()
    by, ba = j.get('bandY', 118), j.get('bandAlpha', 0.44)
    im[by:, :, :3] = im[by:, :, :3] * (1 - ba) + np.array(P5.BAND) * ba
    return im


def mock(kind):
    """flat stages: cloud (the brightest: a pale sky over a cloud floor) and storm (the darkest: slate sky, dark floor,
    a few rain streaks); the band drawn as the scene draws it"""
    im = np.zeros((216, 384, 4), np.float32)
    im[..., 3] = 1
    if kind == 'cloud':
        im[:118, :, :3] = C('ice:2')
        im[118:, :, :3] = C('metal:3')
        im[118, :, :3] = C('stone_cool:5')
    else:
        im[:118, :, :3] = C('shadow:2')
        im[118:, :, :3] = C('shadow:1')
        rng = np.random.RandomState(4)
        for _ in range(70):
            x, y = rng.randint(0, 380), rng.randint(0, 110)
            for k in range(4):
                im[y + k, x + k // 2, :3] = C('stone_cool:2')
    ba = 0.44
    im[118:, :, :3] = im[118:, :, :3] * (1 - ba) + np.array(P5.BAND) * ba
    return im


SLOTS = [(78, 178), (150, 166), (210, 182)]
BOSS_SLOT = (118, 190)
GROUPS = {
    'sky': [['storm_harrier', 'storm_harrier'], ['squall_wolf', 'gale_sprite']],
    'causeway': [['gale_sprite', 'gale_sprite', 'storm_harrier'], ['rigger_beetle', 'rigger_beetle'], ['squall_wolf', 'signal_wraith']],
    'relays': [['signal_wraith', 'signal_wraith'], ['lightning_manta', 'rigger_beetle'], ['gale_engine']],
    'storm': [['storm_page', 'storm_page'], ['lightning_manta', 'storm_harrier'], ['storm_page', 'rigger_beetle']],
    'eyrie': [['scribe'], ['false_beacon', 'scribe_ward', 'broken_compass'], ['scribe_chart']],
}
_A = {}


def sprite_of(eid):
    jb, ib = _A['b']
    je, ie = _A['e']
    return frame(jb, ib, eid) if eid in jb['frames'] else frame(je, ie, eid)


def slots_for(group):
    if len(group) == 1:
        return [BOSS_SLOT]
    if 'scribe_ward' in group:
        # the Beacon and the Compass in front-row foe slots either side, the Scribe behind them
        return [(64, 198), (150, 180), (252, 198)]
    if len(group) == 2:
        return [(90, 182), (220, 182)]
    return SLOTS


def stages():
    _A['e'] = atlas('ep6_enemies_battle')
    _A['b'] = atlas('ep6_bosses_battle')
    results = {}
    names = [n for n in GROUPS if os.path.exists(os.path.join(BACKD, f'ep6_battle_{n}.json'))]
    plans = [(n, 'painted') for n in names] + [('mock', 'cloud'), ('mock', 'storm')]
    for name, grade in plans:
        bg = backdrop(name) if name != 'mock' else mock(grade)
        groups = GROUPS.get(name) or [['squall_wolf', 'gale_sprite', 'rigger_beetle'], ['signal_wraith', 'storm_harrier', 'storm_page'],
                                      ['lightning_manta', 'rigger_beetle'], ['gale_engine'],
                                      ['false_beacon', 'scribe_ward', 'broken_compass'], ['scribe'], ['scribe_chart']]
        shots = []
        for group in groups:
            comp, masks = place(bg, [sprite_of(e) for e in group], slots_for(group))
            sh = C('shadow:1')
            for eid, m in zip(group, masks):
                # a drawn add's ground shadow is meant to sink into the floor: it is not part of the silhouette measured
                m = m & ~(np.abs(comp[..., :3] - sh).sum(-1) < 0.01)
                results.setdefault(eid, {})[f'{name}_{grade}'] = round(band_contrast(bg, comp, m), 3)
            shots.append(comp)
        sheet = np.concatenate(shots, 0)
        tag = f'stage_{name}_{grade}'
        save_png(sheet, os.path.join(OUT6, f'{tag}_1x.png'))
        for i, sh in enumerate(shots):
            phone(sh).save(os.path.join(OUT6, f'{tag}_phone_{i}.png'))
    return results


# ----------------------------------------------------------------------------- field floors at phone scale
def terrain_tiles(tid):
    j = json.load(open(os.path.join(TILES, 'ep6_tiles.json'), encoding='utf-8'))
    sheet = np.asarray(Image.open(os.path.join(TILES, 'ep6.png')).convert('RGBA')).astype(np.float32) / 255
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
    """code-drawn stand-ins in the floors' own ramps (E6-tiles' sheet replaces them when it exists)"""
    rng = np.random.RandomState(seed)
    out = np.zeros((h, w, 4), np.float32)
    out[..., 3] = 1
    ys, xs = np.mgrid[0:h, 0:w]
    if kind == 'cloud':
        n = (np.sin(xs * 0.21 + ys * 0.13) + np.sin(xs * 0.07 - ys * 0.31) + rng.rand(h, w) * 0.6)
        out[..., :3] = np.where((n > 0.9)[..., None], C('metal:4'), np.where((n > -0.4)[..., None], C('metal:3'), C('stone_cool:5')))
    elif kind == 'plank':
        out[..., :3] = C('wood:3')
        out[(ys % 8) == 7, :3] = C('wood:1')
        out[((ys % 8) == 0), :3] = C('wood:4')
        out[((xs + (ys // 8) * 11) % 32) == 0, :3] = C('wood:1')
    elif kind == 'glass':
        out[..., :3] = C('ice:2')
        out[((xs % 16) == 0) | ((ys % 16) == 0), :3] = C('water:4')
        out[((xs - ys) % 16) == 3, :3] = C('ice:3')
    elif kind == 'grate':
        out[..., :3] = C('shadow:1')
        out[((xs % 4) == 0) | ((ys % 4) == 0), :3] = C('wood:2')
        out[((xs % 16) == 0) | ((ys % 16) == 0), :3] = C('gold:2')
    elif kind == 'spire':
        out[..., :3] = C('stone_cool:5')
        out[((ys % 12) == 11) | (((xs + (ys // 12) * 9) % 18) == 0), :3] = C('stone_cool:3')
        out[((ys % 12) == 0), :3] = C('metal:3')
    elif kind == 'slate':
        n = (np.sin(xs * 0.17 + ys * 0.11) + rng.rand(h, w) * 0.7)
        out[..., :3] = np.where((n > 0.6)[..., None], C('stone_cool:2'), C('stone_cool:1'))
    return out


TINT = {'storm': {'color': '#5a6488', 'alpha': 0.35, 'desat': 0.2}, 'dawn': {'color': '#ffd6a6', 'alpha': 0.30}}
# (tag, E6-tiles terrain id, mock kind, tint, dark)
FLOORS = [
    ('airstair_plank', 'skyplank', 'plank', None, 0.0),
    ('airstair_cloud', 'cloudbank', 'cloud', None, 0.0),
    ('f1_glass', 'stormglass', 'glass', None, 0.0),
    ('f1_cloud', 'cloudbank', 'cloud', None, 0.0),
    ('f1_plank', 'skyplank', 'plank', None, 0.0),
    ('f2_grating', 'relay_grate', 'grate', None, 0.35),
    ('f3_spire', 'spire_stone', 'spire', 'storm', 0.5),
    ('f3_cloud', 'storm_cloud', 'slate', 'storm', 0.5),
    ('eyrie', 'spire_stone', 'spire', 'storm', 0.3),
]


def field_phone():
    j, im = atlas('ep6_enemies_field')
    names = [n for n in j['frames'] if n.endswith('_0') and 'avatar' not in n]
    results, rows, used = {}, [], {}
    for tag, tid, kind, t, dark in FLOORS:
        try:
            fl = real_floor(tid, 16 * 24, 64, seed=len(tag))
            used[tag] = 'ep6.png ' + tid
        except (KeyError, FileNotFoundError, OSError):
            fl = mock_floor(kind, 16 * 24, 64, seed=len(tag))
            used[tag] = 'mock ' + kind
        comp = fl.copy()
        x = 12
        masks = []
        if tag == 'eyrie':
            sprites = [frame(j, im, 'scribe_avatar_0'), frame(j, im, 'scribe_avatar_back_0')]
            names_here = ['scribe_avatar', 'scribe_avatar_back']
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
        save_png(lit, os.path.join(OUT6, f'field_{tag}_1x.png'))
        to_pil(upscale_arr(lit, 3)).save(os.path.join(OUT6, f'field_{tag}_3x.png'))
        rows.append(lit)
    if rows:
        sheet = np.concatenate(rows, 0)
        save_png(sheet, os.path.join(OUT6, 'field_floors_1x.png'))
        phone(sheet).save(os.path.join(OUT6, 'field_floors_phone.png'))
    return results, used


def npc_scene():
    j, im = atlas('ep6_npcs')
    ids = list(j['sprites'].keys())
    items = [frame(j, im, f'{i}_down_0') for i in ids]
    fl = mock_floor('plank', 26 * len(items) + 8, 48, seed=5)
    x = 4
    for s in items:
        over(fl, s, x, 44 - s.shape[0])
        x += 26
    save_png(fl, os.path.join(OUT6, 'npc_scene_1x.png'))
    to_pil(upscale_arr(fl, 3)).save(os.path.join(OUT6, 'npc_scene_3x.png'))
    phone(fl).save(os.path.join(OUT6, 'npc_scene_phone.png'))


if __name__ == '__main__':
    os.makedirs(OUT6, exist_ok=True)
    anim_sheets()
    compare()
    st = stages()
    fp, used = field_phone()
    npc_scene()
    allr = {'battle': st, 'field': fp, 'floors': used}
    with open(os.path.join(OUT6, 'contrast.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(allr, f, indent=1, sort_keys=True)
    worst = sorted(((v, k, s) for k, d in st.items() for s, v in d.items()))[:6]
    print('battle: worst edge-contrast shares', worst)
    worstf = sorted(((v, k, s) for k, d in fp.items() for s, v in d.items()))[:6]
    print('field: worst', worstf)
    print('floors', used)
    print('previews in', OUT6)
