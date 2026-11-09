"""Episode 5 sprite previews and the contrast check (E5-sprites; read-only on the atlases and on E5-tiles' backdrops and
tile sheet, writes only tools/art/sprites/out/ep5/):

  anim_<group>_3x.png         every Episode 5 battle id with its derived frames
  compare_beings_<n>x_<bg>    the Sand Oracle (two looks), the Mirage Knight and the Tomorrow Husk beside the Paper Regent,
                              the Cinder Warden and the Nameless King, so all read as different beings
  stage_<backdrop>_<grade>    the foes on E5-tiles' battle backdrops (ep5_battle_*), night as painted and the day grade the
                              JSON names, band drawn, at 1x and at phone scale (x1.806 nearest, the 844 x 390 screen)
  stage_mock_<sand|night>     every foe on a flat bright-sand stage and a flat night-sky stage (the Episode 4 mock pattern)
  field_<floor>_<n>x.png      every field foe on each floor's mock (the real ep5.png terrains, the floor's tint and dark)
  npc_scene_<n>x.png          the cast in a row on dune sand
  contrast.json               per foe and stage: the share of its silhouette edge at least 0.15 luma off the ground behind

    python ep5_preview.py
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from PIL import Image
from pix import *

OUT5 = os.path.join(OUT, 'ep5')
NEXT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BACKD = os.path.join(NEXT, 'assets', 'backdrops')
TILES = os.path.join(NEXT, 'assets', 'tiles')
PHONE = 390 / 216      # = 1.806: the 384 x 216 screen on an 844 x 390 phone


def atlas(name, folder=DST):
    j = json.load(open(os.path.join(folder, name + '.json'), encoding='utf-8'))
    im = np.asarray(Image.open(os.path.join(folder, j['image'])).convert('RGBA')).astype(np.float32) / 255
    return j, im


def frame(j, im, n):
    x, y, w, h = j['frames'][n]
    return im[y:y + h, x:x + w]


def upscale_arr(a, k):
    return np.repeat(np.repeat(a, k, 0), k, 1)


def phone(a):
    H, W = a.shape[:2]
    return to_pil(a).resize((int(round(W * 390 / 216)), 390 if H == 216 else int(round(H * 390 / 216))), Image.NEAREST)


def luma(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def over(dst, src, x, y):
    h, w = src.shape[:2]
    a = src[..., 3:4]
    dst[y:y + h, x:x + w, :3] = dst[y:y + h, x:x + w, :3] * (1 - a) + src[..., :3] * a
    return dst


# ----------------------------------------------------------------------------- derived-frame sheets
def anim_sheets():
    import x1_enemies as XE
    import ep5_enemies as E, ep5_oracle as OR, ep5_build as B
    fut = {}
    for n, img, ox, oy in B.future_frames():
        key = '_'.join(n.split('_')[:2])
        fut.setdefault(key, []).append((n, img, ox, oy))

    def fo(eid):
        if eid in OR.IDS:
            return OR.frames_of(eid)
        if eid in fut:
            return fut[eid]
        return E.frames_of(eid)
    XE.frames_of = fo
    groups = {'a': E.IDS[:4], 'b': E.IDS[4:] + ['future_hunger', 'future_fear'], 'knights': ['mirage_knight', 'mirage_double']}
    for g, ids in groups.items():
        XE.anim_sheet(os.path.join(OUT5, f'anim_{g}_3x.png'), ids, scale=3, bg=(24, 22, 40))
    XE.anim_sheet(os.path.join(OUT5, 'anim_oracle_2x.png'), OR.IDS, scale=2, bg=(24, 22, 40))


# ----------------------------------------------------------------------------- side by side with the other bosses
def stage_row(items, bg, gap=8):
    H = max(i.shape[0] for i in items) + 2 * gap
    W = sum(i.shape[1] for i in items) + gap * (len(items) + 1)
    out = np.zeros((H, W, 4), np.float32)
    out[..., :3] = np.array(bg, np.float32) / 255
    out[..., 3] = 1
    x = gap
    for i in items:
        over(out, i, x, H - gap - i.shape[0])
        x += i.shape[1] + gap
    return out


def compare():
    jb, ib = atlas('bosses_battle')
    j4b, i4b = atlas('ep4_bosses_battle')
    j5b, i5b = atlas('ep5_bosses_battle')
    j5e, i5e = atlas('ep5_enemies_battle')
    items = [frame(j5b, i5b, 'oracle'), frame(j5b, i5b, 'oracle_true'), frame(j5e, i5e, 'mirage_knight'),
             frame(j5e, i5e, 'tomorrow_husk'), frame(j4b, i4b, 'paper_regent'), frame(jb, ib, 'cinder_warden'),
             frame(jb, ib, 'nameless_king')]
    for bg, tag in (((22, 20, 44), 'night'), ((228, 203, 150), 'sand')):
        s = stage_row(items, bg)
        save_png(s, os.path.join(OUT5, f'compare_beings_1x_{tag}.png'))
        to_pil(upscale_arr(s, 3)).save(os.path.join(OUT5, f'compare_beings_3x_{tag}.png'))


# ----------------------------------------------------------------------------- battle stages and the contrast measure
BAND = (0x14 / 255, 0x10 / 255, 0x1e / 255)


def hexf(h):
    return np.array([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], np.float32) / 255


def backdrop(name, grade):
    j = json.load(open(os.path.join(BACKD, f'ep5_battle_{name}.json'), encoding='utf-8'))
    im = np.asarray(Image.open(os.path.join(BACKD, j['image'])).convert('RGBA')).astype(np.float32) / 255
    im = im.copy()
    g = j.get('grades', {}).get('day')
    if grade == 'day' and isinstance(g, dict):
        y0, y1 = g.get('rows', [0, j.get('bandY', 118)])
        m, ma = hexf(g['multiply']), g['multiplyAlpha']
        s, sa = hexf(g['screen']), g['screenAlpha']
        reg = im[y0:y1, :, :3]
        reg = reg * (1 - ma) + reg * m * ma
        reg = reg * (1 - sa) + (1 - (1 - reg) * (1 - s)) * sa
        im[y0:y1, :, :3] = reg
    by, ba = j.get('bandY', 118), j.get('bandAlpha', 0.44)
    im[by:, :, :3] = im[by:, :, :3] * (1 - ba) + np.array(BAND) * ba
    return im


def mock(kind):
    """the Episode 4 mock pattern: a flat stage. sand: the brightest desert floor (sand ramp, a lighter sky); night: the
    darkest (shadow and ink, a few stars)"""
    import pal as P
    c = lambda r: np.array(hex2rgb(P.color(r)), np.float32) / 255
    im = np.zeros((216, 384, 4), np.float32)
    im[..., 3] = 1
    if kind == 'sand':
        im[:118, :, :3] = c('sand:3')
        im[118:, :, :3] = c('sand:2')
        im[118, :, :3] = c('path:3')
    else:
        im[:118, :, :3] = c('ink:1')
        im[118:, :, :3] = c('shadow:0')
        rng = np.random.RandomState(3)
        for _ in range(60):
            im[rng.randint(0, 110), rng.randint(0, 384), :3] = c('metal:4')
    return im


SLOTS = [(78, 178), (150, 166), (210, 182)]          # feet of up to three foes (the left half of the stage)
BOSS_SLOT = (118, 186)


def place(stage, sprites, slots):
    """composite sprites with their feet on the slots; returns the stage and each sprite's mask on it"""
    out = stage.copy()
    masks = []
    for spr, (fx, fy) in zip(sprites, slots):
        h, w = spr.shape[:2]
        x, y = int(fx - w // 2), int(fy - h + 1)
        x = max(0, min(out.shape[1] - w, x)); y = max(0, min(out.shape[0] - h, y))
        over(out, spr, x, y)
        m = np.zeros(out.shape[:2], bool)
        m[y:y + h, x:x + w] = spr[..., 3] > 0.5
        masks.append(m)
    return out, masks


def edge_contrast(stage_bg, comp, m, thr=0.15):
    """the share of the sprite's silhouette edge (its outer pixel ring) whose luma is at least thr away from the ground
    pixel just outside it, and the mean difference"""
    p = np.pad(m, 1)
    outer = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~m
    inner_edge = m & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    Lc = luma(comp[..., :3])
    Lb = luma(stage_bg[..., :3])
    ys, xs = np.nonzero(inner_edge)
    diffs = []
    H, W = m.shape
    for y, x in zip(ys, xs):
        nb = [(y + dy, x + dx) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)) if 0 <= y + dy < H and 0 <= x + dx < W and outer[y + dy, x + dx]]
        if nb:
            diffs.append(max(abs(Lc[y, x] - Lb[yy, xx]) for yy, xx in nb))
    d = np.array(diffs) if diffs else np.zeros(1)
    # the 2 px band: the dark outline AND the rim just inside it; the better of the two per edge pixel is what reads
    return float((d >= thr).mean()), float(d.mean())


def band_contrast(stage_bg, comp, m, thr=0.15):
    """as edge_contrast, but each edge pixel may be read by its outline OR the rim pixel just inside it (the pair the
    contrast rule draws): the share of edge pixels where either is at least thr off the ground"""
    p = np.pad(m, 1)
    edge = m & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    Lc = luma(comp[..., :3]); Lb = luma(stage_bg[..., :3])
    H, W = m.shape
    ok, n = 0, 0
    for y, x in zip(*np.nonzero(edge)):
        outs = [(y + dy, x + dx) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)) if 0 <= y + dy < H and 0 <= x + dx < W and not m[y + dy, x + dx]]
        ins = [(y - dy, x - dx) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)) if 0 <= y - dy < H and 0 <= x - dx < W and m[y - dy, x - dx]]
        if not outs:
            continue
        g = np.mean([Lb[a] for a in outs])
        best = max([abs(Lc[y, x] - g)] + [abs(Lc[a] - g) for a in ins])
        ok += best >= thr
        n += 1
    return ok / max(1, n)


GROUPS = {
    'sea': [['dust_harrier', 'dune_scarab']],
    'dunes': [['dune_stalker', 'dune_scarab', 'starsilt'], ['dust_harrier', 'silt_reaver', 'dune_stalker']],
    'gallery': [['horizon_shade', 'silt_reaver', 'starsilt'], ['tomorrow_husk', 'dune_scarab'], ['mirage_double', 'mirage_knight']],
    'well': [['tomorrow_husk', 'horizon_shade', 'starsilt']],
    'oracle': [['oracle'], ['future_hunger', 'oracle_futures', 'future_fear'], ['oracle_true']],
}


def sprite_of(eid):
    j5e, i5e = _A['e']
    j5b, i5b = _A['b']
    return frame(j5b, i5b, eid) if eid in j5b['frames'] else frame(j5e, i5e, eid)


_A = {}


def slots_for(group):
    if len(group) == 1:
        return [BOSS_SLOT]
    if 'oracle_futures' in group:
        return [(40, 150), (126, 188), (222, 150)]
    if 'mirage_knight' in group:
        return [(70, 170), (170, 182)]
    return SLOTS


def stages():
    _A['e'] = atlas('ep5_enemies_battle')
    _A['b'] = atlas('ep5_bosses_battle')
    results = {}
    names = [n for n in GROUPS if os.path.exists(os.path.join(BACKD, f'ep5_battle_{n}.json'))]
    plans = [(n, g) for n in names for g in ('night', 'day')] + [('mock', 'sand'), ('mock', 'night')]
    for name, grade in plans:
        bg = backdrop(name, grade) if name != 'mock' else mock(grade)
        groups = GROUPS.get(name) or [['dune_stalker', 'dune_scarab', 'dust_harrier'], ['silt_reaver', 'starsilt', 'horizon_shade'],
                                      ['tomorrow_husk', 'mirage_knight'], ['mirage_double', 'future_hunger', 'future_fear'],
                                      ['oracle'], ['oracle_true']]
        shots = []
        for gi, group in enumerate(groups):
            sl = slots_for(group) if not (name == 'mock' and len(group) == 2) else [(90, 182), (220, 182)]
            comp, masks = place(bg, [sprite_of(e) for e in group], sl)
            for eid, m in zip(group, masks):
                share = band_contrast(bg, comp, m)
                results.setdefault(eid, {})[f'{name}_{grade}'] = round(share, 3)
            shots.append(comp)
        sheet = np.concatenate(shots, 0)
        tag = f'stage_{name}_{grade}'
        save_png(sheet, os.path.join(OUT5, f'{tag}_1x.png'))
        phone(shots[0]).save(os.path.join(OUT5, f'{tag}_phone.png'))
    with open(os.path.join(OUT5, 'contrast.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(results, f, indent=1, sort_keys=True)
    return results


# ----------------------------------------------------------------------------- field floors at phone scale
def terrain_tiles(tid):
    j = json.load(open(os.path.join(TILES, 'ep5_tiles.json'), encoding='utf-8'))
    sheet = np.asarray(Image.open(os.path.join(TILES, 'ep5.png')).convert('RGBA')).astype(np.float32) / 255
    t = j['terrains'][tid]
    vs = t.get('variants') or []
    ws = t.get('variantWeights') or [1] * len(vs)
    tiles = [sheet[y:y + 16, x:x + 16] for x, y in vs] or [sheet[t['y'] + 16:t['y'] + 32, t['x']:t['x'] + 16]]
    return tiles, ws


def floor(tid, w, h, seed=1, accent=None):
    tiles, ws = terrain_tiles(tid)
    p = np.array(ws, np.float64)
    p /= p.sum()
    rng = np.random.RandomState(seed)
    out = np.zeros((h, w, 4), np.float32)
    out[..., 3] = 1
    for ty in range(0, h, 16):
        for tx in range(0, w, 16):
            t = tiles[rng.choice(len(tiles), p=p)]
            if accent and rng.rand() < 0.12:
                at, _ = terrain_tiles(accent)
                t = at[0]
            out[ty:ty + 16, tx:tx + 16, :3] = t[:min(16, h - ty), :min(16, w - tx), :3]
    return out


def tint(a, t):
    if not t:
        return a
    out = a.copy()
    c = hexf(t['color'])
    out[..., :3] = out[..., :3] * (1 - t['alpha']) + out[..., :3] * c * t['alpha']
    if t.get('desat'):
        L = luma(out[..., :3])[..., None]
        out[..., :3] = out[..., :3] * (1 - t['desat']) + L * t['desat']
    if t.get('glow'):
        out[..., :3] = np.clip(out[..., :3] + hexf(t['glow']) * t.get('glowAlpha', 0), 0, 1)
    return out


def darken(a, dark):
    if dark <= 0:
        return a
    out = a.copy()
    base = 1 - dark
    amb = np.clip(np.array([base * 0.92, base * 0.90, base * 1.12]), 0, 1)
    out[..., :3] = out[..., :3] * amb + hexf('#1a1430') * dark * 0.5
    return np.clip(out, 0, 1)


TINT = {'night': {'color': '#262a66', 'alpha': 0.84, 'desat': 0.42}, 'dawn': {'color': '#ffd6a6', 'alpha': 0.30},
        'noon': {'color': '#fff1d6', 'alpha': 0.22, 'glow': '#fff4dc', 'glowAlpha': 0.05}}
FLOORS = [
    ('ship_deck_night', 'deck_planks', None, 'night', 0.0),
    ('road_noon', 'dune_sand', None, 'noon', 0.0),
    ('f1_courts_noon', 'dune_court', None, 'noon', 0.0),
    ('f1_courts_night', 'dune_court', None, 'night', 0.0),
    ('f2_gallery_dawn', 'gallery_tile', None, 'dawn', 0.4),
    ('f3_well_dark', 'well_basalt', 'star_glass', None, 0.55),
    ('eye_oracle', 'well_basalt', 'star_glass', None, 0.3),
]


def field_phone():
    j, im = atlas('ep5_enemies_field')
    names = [n for n in j['frames'] if n.endswith('_0') and 'avatar' not in n]
    results = {}
    rows = []
    for tag, tid, acc, t, dark in FLOORS:
        try:
            fl = floor(tid, 16 * 24, 64, seed=len(tag), accent=acc)
        except (KeyError, FileNotFoundError):
            continue
        comp = fl.copy()
        x = 12
        masks = []
        sprites = [frame(j, im, n) for n in names]
        if tag == 'eye_oracle':
            sprites = [frame(j, im, 'oracle_avatar_0'), frame(j, im, 'oracle_avatar_back_0')]
            names_here = ['oracle_avatar', 'oracle_avatar_back']
        else:
            names_here = [n[:-2] for n in names]
        for s in sprites:
            h, w = s.shape[:2]
            y = 56 - h
            over(comp, s, x, y)
            m = np.zeros(comp.shape[:2], bool)
            m[y:y + h, x:x + w] = s[..., 3] > 0.5
            masks.append(m)
            x += max(w, 24) + 22
        lit_bg = darken(tint(fl, TINT.get(t)), dark)
        lit = darken(tint(comp, TINT.get(t)), dark)
        for n, m in zip(names_here, masks):
            results.setdefault(n, {})[tag] = round(band_contrast(lit_bg, lit, m), 3)
        save_png(lit, os.path.join(OUT5, f'field_{tag}_1x.png'))
        to_pil(upscale_arr(lit, 3)).save(os.path.join(OUT5, f'field_{tag}_3x.png'))
        rows.append(lit)
    if rows:
        sheet = np.concatenate(rows, 0)
        save_png(sheet, os.path.join(OUT5, 'field_floors_1x.png'))
        phone(sheet).save(os.path.join(OUT5, 'field_floors_phone.png'))
    return results


def npc_scene():
    j, im = atlas('ep5_npcs')
    ids = list(j['sprites'].keys())
    items = [frame(j, im, f'{i}_down_0') for i in ids]
    try:
        fl = floor('dune_sand', 16 * 23, 48, seed=5)
    except (KeyError, FileNotFoundError):
        fl = mock('sand')[:48, :352]
    x = 4
    for s in items:
        over(fl, s, x, 44 - s.shape[0])
        x += 25
    save_png(fl, os.path.join(OUT5, 'npc_scene_1x.png'))
    to_pil(upscale_arr(fl, 3)).save(os.path.join(OUT5, 'npc_scene_3x.png'))


if __name__ == '__main__':
    os.makedirs(OUT5, exist_ok=True)
    anim_sheets()
    compare()
    st = stages()
    fp = field_phone()
    npc_scene()
    allr = {'battle': st, 'field': fp}
    with open(os.path.join(OUT5, 'contrast.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(allr, f, indent=1, sort_keys=True)
    worst = sorted(((v, k, s) for k, d in st.items() for s, v in d.items()))[:6]
    print('battle: worst edge-contrast shares', worst)
    worstf = sorted(((v, k, s) for k, d in fp.items() for s, v in d.items()))[:6]
    print('field: worst', worstf)
    print('previews in', OUT5)
