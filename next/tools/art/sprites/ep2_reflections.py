"""The Other Selves (E2-sprites): the party's reflections, stepped out of the great mirror of the Court's F2.

Battle (`refl_hero`, `refl_mira`, `refl_bram`, packed into enemies_battle): each party member's own battle frames
(party_battle, built just before this runs) flipped to face RIGHT and recoloured onto a silver-violet glass ramp
by lightness, with white eyes; the hero's reflection has a blank face (no eyes, no mouth: "Nameless
Reflection"). Weapons follow the owner's first weapon: hero sword, Mira staff, Bram spear.
  base <- <id>_<w>_idle_0, idle_1 <- _idle_1, attack <- _strike, hurt <- <id>_hurt, cast <- <id>_cast,
  die_0..2 <- the shared dissolve. Origin: the owner's feet, mirrored.

Field (`refl_hero` ... in npcs.png as 4-direction character blocks, and `refl_<id>_0/1` in enemies_field):
party_field frames through the same recolour (the scenes spawn them as walking actors).

    battle_frames()  -> [(name, rgba, ox, oy)]
    field_blocks()   -> {refl_id: {dir: [stand, stepA, stepB, blink]}}
"""
import json
import numpy as np
from pix import *
import pal as P
import anim_frames as AF
from hollow_enemies import col

IDS = {'refl_hero': ('hero', 'sword'), 'refl_mira': ('mira', 'staff'), 'refl_bram': ('bram', 'spear')}

# the glass ramp by OKLab lightness (absolute, so every frame of a reflection maps the same way)
GLASS = [(0.00, 'ink:1'), (0.16, 'roof_purple:1'), (0.32, 'roof_purple:2'), (0.47, 'cloth_purple:3'),
         (0.61, 'cloth_purple:4'), (0.75, 'cloth_purple:5'), (0.89, 'stone_cool:5'), (1.01, 'metal:3')]
SHEEN = {'roof_purple:1': 'roof_purple:2', 'roof_purple:2': 'cloth_purple:3', 'cloth_purple:3': 'stone_cool:4',
         'stone_cool:4': 'cloth_purple:5', 'cloth_purple:5': 'stone_cool:5', 'stone_cool:5': 'metal:3'}
SKIN = 'cloth_purple:4'          # the face reads as cold violet glass
SKIN_LIT = 'cloth_purple:5'
EYE = 'metal:4'


def _master_set(ramps):
    s = set()
    for r in ramps:
        for h in P.ramp(r):
            s.add(tuple(int(v) for v in hex2rgb(h)))
    return s


SKIN_COLS = None


def skin_mask(a):
    global SKIN_COLS
    if SKIN_COLS is None:
        SKIN_COLS = _master_set(('skin_light', 'skin_med'))
    q = np.round(a[..., :3] * 255).astype(int)
    m = np.zeros(a.shape[:2], bool)
    for c in SKIN_COLS:
        m |= np.all(q == np.array(c), -1)
    return m & (a[..., 3] > 0.5)


def recolour(a, blank_face=False):
    """party frame -> glass reflection (still facing the party frame's way; flip after)"""
    a = a.copy()
    op = a[..., 3] > 0.5
    skin = skin_mask(a)
    H, W = op.shape
    # eye pixels: non-skin pixels inside the face with at least 4 skin neighbours of 8
    p = np.pad(skin, 1)
    nskin = sum(p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx].astype(int) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    eyes = op & ~skin & (nskin >= 4)
    # only the upper face (mouth and hand pixels stay glass)
    if skin.any():
        ys, xs = np.nonzero(skin)
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    L = lab[..., 0]
    ts = np.array([s[0] for s in GLASS])
    cols = np.array([col(s[1]) for s in GLASS], np.float32)
    t = np.clip((L - 0.16) / 0.66, 0, 1) ** 0.85
    idx = np.argmin(np.abs(t[..., None] - ts[None, None, :]), -1)
    out = a.copy()
    out[op, :3] = cols[idx][op]
    # one material, one glass: isolated single pixels take their majority neighbour (no armour speckle)
    import cleanup as CL
    out = CL.despeckle(out, protect=eyes)
    out = CL.despeckle(out, protect=eyes)
    # the outline ring stays the darkest step
    pp = np.pad(op, 1)
    ring = op & ~(pp[:-2, 1:-1] & pp[2:, 1:-1] & pp[1:-1, :-2] & pp[1:-1, 2:])
    out[ring & (L < 0.42), :3] = col('ink:1')
    # face: flat cold glass with a lit pixel where the skin was lightest
    out[skin, :3] = col(SKIN)
    if skin.any():
        out[skin & (L > np.percentile(L[skin], 80)), :3] = col(SKIN_LIT)
    if blank_face:
        out[eyes, :3] = col(SKIN)
    else:
        out[eyes, :3] = col(EYE)
    return out


def _sheet(name):
    m = json.load(open(os.path.join(DST, name + '.json'), encoding='utf-8'))
    sh = from_pil(Image.open(os.path.join(DST, m['image'])))
    return m, sh


def _frame(m, sh, n):
    x, y, w, h = m['frames'][n]
    return sh[y:y + h, x:x + w].copy()


def battle_frames():
    m, sh = _sheet('party_battle')
    ox0, oy0 = m['origin']
    out = []
    for rid, (pid, w) in IDS.items():
        src = {'': f'{pid}_{w}_idle_0', 'idle_1': f'{pid}_{w}_idle_1', 'attack': f'{pid}_{w}_strike',
               'hurt': f'{pid}_hurt', 'cast': f'{pid}_cast'}
        frames = {}
        for suf, n in src.items():
            f = flip_x(recolour(_frame(m, sh, n), blank_face=(pid == 'hero')))
            frames[suf] = f
        base = frames['']
        H, W = base.shape[:2]
        ox, oy = W - 1 - ox0, oy0
        out.append((rid, base, ox, oy))
        for suf in ('idle_1', 'attack', 'hurt', 'cast'):
            out.append((f'{rid}_{suf}', frames[suf], ox, oy))
        # the die steps on the padded canvas, origin moved with the pad
        cv = AF.canvas(base)
        for i, f in enumerate(AF.die_frames(cv, rid)):
            out.append((f'{rid}_die_{i}', f, ox + AF.PAD, oy + AF.PAD))
    return out


def field_blocks():
    m, sh = _sheet('party_field')
    out = {}
    for rid, (pid, w) in IDS.items():
        blk = {}
        for d in ('down', 'left', 'right', 'up'):
            blk[d] = [recolour(_frame(m, sh, f'{pid}_{d}_{k}'), blank_face=(pid == 'hero')) for k in ('0', '1', '2', 'blink')]
        out[rid] = blk
    return out


if __name__ == '__main__':
    fr = battle_frames()
    contact([(n, f) for n, f, _, _ in fr if not n.endswith(('die_0', 'die_2'))], os.path.join(OUT, 'e2', 'refl_battle_6x.png'),
            scale=6, cols=6, bg=(40, 44, 70))
    fb = field_blocks()
    items = []
    for rid, blk in fb.items():
        for d in ('down', 'left', 'right', 'up'):
            items.append((f'{rid} {d}', blk[d][0]))
    contact(items, os.path.join(OUT, 'e2', 'refl_field_6x.png'), scale=6, cols=4, bg=(40, 44, 70))
