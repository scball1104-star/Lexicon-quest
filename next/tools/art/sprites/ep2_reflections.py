"""The Other Selves (E2-sprites): the party's reflections, stepped out of the great mirror of the Court's F2.

Battle (`refl_hero`, `refl_mira`, `refl_bram`, packed into enemies_battle): each party member's own battle frames
(party_battle, built just before this runs) flipped to face RIGHT and recoloured into clear glass (W12,
recolour_glass: an eight-step indigo-violet-cyan-white ramp by lightness, a light rim, glint stripes, the owner's
signature accent kept); the hero's reflection has a blank face (no eyes, no mouth: "Nameless Reflection"). The
W11-era flat violet `recolour` is kept for reference and no longer used. Weapons follow the owner's first weapon: hero sword, Mira staff, Bram spear.
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


# W12 (CRITIQUE_4 item 9): the battle frames were one flat violet (the face, the hair and the coat all one value), so
# the Other Selves read as cutouts. They are now their owners' frames in clear glass: an eight-step glass ramp by
# lightness (deep indigo, violet, periwinkle, cyan, pale, white: the same family as the W11 timeline heads, GLASS4 in
# build_heads.py) that keeps the owner's own value structure (hair darker than face, coat folds, the weapon), a
# light rim on the edges that face the mirror's light and a deep indigo edge below, two diagonal glint stripes that
# sit at the same place relative to the feet in every frame, and each owner's signature accent kept in colour: the
# hero's white scarf (and no face), Mira's staff gem in cyan, Bram's shield cross in gold.
GLASS8 = ['#1a1238', '#2c2266', '#463a98', '#6a5ab8', '#6f94d4', '#82cfe4', '#cdf0f7', '#f6faff']
GLINT = (-4.0, 6.0)      # diagonal glint bands: x - ox - 0.45 * (y - oy) in [g, g + 2) (relative to the feet)
SIG = {
    'mira': {'#e8fffb': '#ffffff', '#b4e4f2': '#8af0e8', '#6ab3e4': '#3cb8d8', '#3e88ca': '#2a8cb8'},
    'bram': {'#f9d77a': '#f9d77a'},
}


def _hex(c):
    return '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in c[:3])


def recolour_glass(a, pid, ox, oy, blank_face=False):
    """party frame (as drawn, facing left) -> glass reflection; flip after. (ox, oy) = the feet in this frame."""
    a = a.copy()
    op = a[..., 3] > 0.5
    H, W = op.shape
    skin = skin_mask(a)
    p = np.pad(skin, 1)
    nskin = sum(p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx].astype(int) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    eyes = op & ~skin & (nskin >= 4)
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    L = lab[..., 0]
    t = np.clip((L - 0.24) / 0.72, 0, 1)
    idx = np.clip(np.round(t * 7).astype(int), 0, 7)
    # the face is pale glass a step above its own value, so hair and face separate
    idx = np.where(skin, np.clip(idx + 1, 5, 6), idx)
    # glint stripes (two diagonal bands, fixed relative to the feet)
    yy, xx = np.mgrid[0:H, 0:W]
    u = (xx - ox) - 0.45 * (yy - oy)
    for g, lift in ((GLINT[0], 2), (GLINT[1], 1)):
        band = op & (u >= g) & (u < g + 2) & ~skin & ~eyes
        idx = np.where(band, np.minimum(7, idx + lift), idx)
    # edges: light rim where the edge faces up or toward the mirror (this frame's right = the reflection's left after
    # the flip, where the backlight sits), a deep indigo edge below
    pp = np.pad(op, 1)
    up_open = op & ~pp[:-2, 1:-1]
    side_open = op & ~pp[1:-1, 2:]
    down_open = op & ~pp[2:, 1:-1]
    left_open = op & ~pp[1:-1, :-2]
    ring = up_open | side_open | down_open | left_open
    cols = np.array([hex2rgb(h) for h in GLASS8], np.float32) / 255
    out = a.copy()
    out[op, :3] = cols[idx][op]
    out[ring, :3] = cols[0]
    rim = (up_open | side_open) & ~down_open & (L > 0.22)
    out[rim, :3] = cols[6]
    # the hero's white scarf and every near-white stays white (the blade, the scarf)
    white = op & (L > 0.88) & ~ring
    out[white, :3] = cols[7]
    if blank_face:
        out[eyes, :3] = cols[6]           # the Nameless Reflection: no eyes, one smooth pane
    else:
        out[eyes, :3] = cols[1]           # dark glass eyes, so the pale glass face reads as a face
    for src, dst in SIG.get(pid, {}).items():
        m = op & np.all(np.abs(a[..., :3] - np.array(hex2rgb(src), np.float32) / 255) < 1.5 / 255, -1)
        out[m, :3] = np.array(hex2rgb(dst), np.float32) / 255
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
            f = flip_x(recolour_glass(_frame(m, sh, n), pid, ox0, oy0, blank_face=(pid == 'hero')))
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
            # W12: the field frames take the same glass as the battle frames (the origin is the field cell's feet)
            ox, oy = m.get('origin', [12, 31])
            blk[d] = [recolour_glass(_frame(m, sh, f'{pid}_{d}_{k}'), pid, ox, oy, blank_face=(pid == 'hero'))
                      for k in ('0', '1', '2', 'blink')]
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
