"""Episode 7 foes with their own battle frames (E7-sprites): the White Road, the Frostbound Vault's three floors and the
Pale Lantern (docs/EPISODE7_PLAN.md 6.2 and 6.4).

Every painted foe is cut from ../assets/art/enemies.png (4x2 grid) at 1x straight from the painting (no non-integer
scaling), recoloured per material with gradient maps onto master ramps (snow white, ice blue, pine black, aurora violet,
aurora green), put through the shared cleanup and finished with hand edits. Each is cut at the size of the earlier foe of
the same cell, so the Episode 1 to 6 derived-frame recipes fit it. None reads as its Episode 6 cousin:

  rime_wolf            cell 2 at 60 px  snow-white fur shaded ice blue (the Squall Wolf was storm slate), a pine-black
                                        mane tipped aurora violet, frost crusted on the jaw and muzzle, ice-blue eyes
  snow_wisp            cell 0 at 48 px  a white jelly shaded aurora violet (the Gale Sprite was cobalt), snowflakes
                                        falling inside it, two dark eyes with a violet glint
  hush_owl             cell 6 at 70 px  white and grey plumage barred grey (the Storm Harrier was cobalt), gold talons
                                        and beak, one gold eye with a dark pupil
  crystal_crawler      cell 3 at 50 px  a clear ice-crystal shell with facet lines (the Rigger Beetle was riveted brass),
                                        aurora-green legs and horns, pine-black underside
  frostbound_revenant  cell 7 at 84 px  as painted (the icy skeletal phantom the cell was drawn as; the Lightning Manta
                                        recoloured it violet), snapped to the master palette, a pine-black void under the
                                        hood and two ice-blue eyes burning in the skull
  ice_knight           cell 5 at 96 px  plate of clear ice over steel joints, a pine-black cape with a frosted hem, the
                                        trim steel, a violet glint in the visor
  pale_lantern         cell 1 at 92 px  (mini-boss) frost-white and ice-blue robes, a great iron lantern drawn into the
                                        hood where the glow was, its light cold blue

The Rime-Written Page is drawn in code (ep7_drawn.py), as are the Closed Gate and the Lost Letter.

The contrast rule (Episode 7's stages are white snow and dark vault stone): after the cleanup every foe gets a DARK outline
(every edge pixel lighter than L 0.30 becomes shadow:0, so a white foe holds on snow) and, just inside it on the upper and
left edges, a 1 px cool rim in ice blue (it holds on the dark vault floors). CRITIQUE_6 item 8.

    base()          -> {id: rgba}               facing RIGHT, origin bottom-centre
    atlas_frames()  -> [(name, rgba, ox, oy)]   base + derived (AF.ORDER)
"""
import os
import numpy as np
from scipy import ndimage as ndi
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import cleanup as CL
import anim_frames as AF
from hollow_enemies import consolidate, col
from ep2_enemies import gmap, lch_img, stamp
import ep5_enemies as E5

IDS = ['rime_wolf', 'snow_wisp', 'hush_owl', 'crystal_crawler', 'frostbound_revenant', 'ice_knight']
BOSS_IDS = ['pale_lantern']
ALL_IDS = IDS + BOSS_IDS

# ----------------------------------------------------------------------------- the contrast rule (E5's, a cool side)
E5.RIM.setdefault('frost', ('ice:2', 'ice:3'))             # (left edge, top edge): ice blue
E5.RIM.setdefault('frost_field', ('ice:3', 'metal:4'))     # a step brighter for the dark vault floors at map scale
dark_outline = E5.dark_outline
side_rim = E5.side_rim
edge_mask = E5.edge_mask
put = E5.put


def contrast(a, side='frost'):
    return side_rim(dark_outline(a), side)


# ----------------------------------------------------------------------------- ramps
SNOW = [(0.0, 'shadow:0'), (0.12, 'ink:2'), (0.24, 'roof_blue:3'), (0.38, 'stone_cool:4'), (0.5, 'stone_cool:5'),
        (0.62, 'ice:2'), (0.78, 'metal:3'), (1.0, 'metal:4')]
PINE = [(0.0, 'shadow:0'), (0.5, 'foliage_dark:0'), (1.0, 'foliage_dark:1')]
AURORA = [(0.0, 'roof_purple:1'), (0.3, 'roof_purple:2'), (0.6, 'cloth_purple:3'), (0.85, 'cloth_purple:4'),
          (1.0, 'cloth_purple:5')]
AURORA_GREEN = [(0.0, 'foliage_dark:1'), (0.25, 'roof_green:2'), (0.5, 'roof_green:3'), (0.75, 'magic_cyan:2'),
                (1.0, 'magic_cyan:3')]
GREYWHITE = [(0.0, 'shadow:0'), (0.12, 'shadow:2'), (0.26, 'stone_cool:2'), (0.42, 'stone_cool:3'), (0.58, 'stone_cool:4'),
             (0.74, 'stone_cool:5'), (0.88, 'metal:3'), (1.0, 'metal:4')]
ICEGLASS = [(0.0, 'shadow:0'), (0.12, 'ink:1'), (0.24, 'water:1'), (0.38, 'water:2'), (0.52, 'water:3'), (0.66, 'ice:1'),
            (0.8, 'ice:2'), (0.92, 'ice:3'), (1.0, 'metal:4')]
STEEL = [(0.0, 'shadow:1'), (0.3, 'stone_cool:2'), (0.6, 'stone_cool:4'), (0.85, 'stone_cool:5'), (1.0, 'metal:3')]
GOLD = [(0.0, 'wood:2'), (0.35, 'gold:3'), (0.7, 'gold:4'), (1.0, 'gold:5')]


# ----------------------------------------------------------------------------- recolours (on the quantized cut, painting orientation)
def rc_wolf(a):
    """the silver wolf -> snow white shaded ice blue; the blue flame mane -> pine black with aurora-violet tips; the gold
    eyes -> ice blue (stamped in finish())"""
    m, L, C, h = lch_img(a)
    blue = consolidate(m & (h > 200) & (h < 320) & (C > 0.06), m)
    gold = m & (h > 55) & (h < 110) & (C > 0.08)
    blue &= ~gold
    fur = m & ~blue & ~gold
    a = gmap(a, fur, SNOW, gamma=0.85)
    lit = blue & (L > np.percentile(L[blue], 75)) if blue.any() else blue
    a = gmap(a, blue & ~lit, PINE, gamma=1.0)
    a = gmap(a, lit, [(0.0, 'roof_purple:2'), (0.5, 'cloth_purple:3'), (1.0, 'cloth_purple:4')])
    a = gmap(a, gold, [(0.0, 'ice:2'), (1.0, 'ice:3')])
    return a


_EYES = {}


def rc_wisp(a):
    """the green slime -> a white jelly shaded aurora violet; the yellow veins -> faint ice lines; the yellow eyes -> dark
    eyes (redrawn in finish())"""
    m, L, C, h = lch_img(a)
    yel = m & (h > 70) & (h < 140) & (C > 0.08) & (L > 0.62)
    H, W = a.shape[:2]
    lab, n = ndi.label(yel)
    eyes = np.zeros_like(yel)
    if n:
        sz = ndi.sum(yel, lab, range(1, n + 1))
        for i, v in enumerate(sz):
            cyx = ndi.center_of_mass(yel, lab, i + 1)
            if 2 <= v <= 14 and 0.3 * H < cyx[0] < 0.62 * H:
                eyes |= lab == i + 1
    veins = yel & ~eyes
    body = m & ~yel
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.1, 'roof_purple:2'), (0.22, 'cloth_purple:3'), (0.36, 'cloth_purple:4'),
                       (0.5, 'magic_violet:3'), (0.64, 'ice:3'), (0.8, 'metal:3'), (1.0, 'metal:4')], gamma=0.45)
    a = gmap(a, veins, [(0.0, 'ice:2'), (1.0, 'ice:3')])
    a = gmap(a, eyes, [(0.0, 'shadow:0'), (1.0, 'shadow:1')])
    a = CL.majority_despeckle(a, passes=2, max_de=0.12, max_island=3, protect=eyes)
    _EYES['snow_wisp'] = eyes
    return a


def rc_owl(a):
    """the painted roc: its blue feathers -> white and grey (white at the lit tips and the breast); its gold -> gold"""
    m, L, C, h = lch_img(a)
    H, W = a.shape[:2]
    xs = np.mgrid[0:H, 0:W][1]
    # the beak and the talons (the right of the painting); the gold flecks on the tail feathers go white with the rest
    warm = m & (h > 30) & (h < 120) & (C > 0.035) & (L > 0.3) & (xs > W * 0.6)
    lab, n = ndi.label(warm)
    if n:
        sz = ndi.sum(warm, lab, range(1, n + 1))
        warm = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 5])
    feath = m & ~warm
    a = gmap(a, feath, GREYWHITE, gamma=0.5)
    a = gmap(a, warm, GOLD)
    return a


_SHELL = {}


def rc_crawler(a):
    """the green shell -> clear ice crystal; the bronze body, horns and legs -> aurora green; the dark underside -> pine
    black. Facets are cut in finish()"""
    m, L, C, h = lch_img(a)
    green = consolidate(m & (h > 110) & (h < 200) & (C > 0.05), m, passes=1)
    warm = m & ~green & (h > 30) & (h < 120) & (C > 0.04)
    dark = m & ~green & ~warm
    a = gmap(a, green, [(0.0, 'water:2'), (0.2, 'water:3'), (0.4, 'ice:1'), (0.6, 'ice:2'), (0.8, 'ice:3'),
                          (1.0, 'metal:4')], gamma=0.7)
    a = gmap(a, warm, AURORA_GREEN, gamma=0.9)
    a = gmap(a, dark, PINE)
    _SHELL['crystal_crawler'] = green
    return a


def rc_revenant(a):
    """as painted: no recolour (the cleanup snaps it to the master palette). The void under the hood is lifted to pine
    black in finish()"""
    return a


def rc_knight(a):
    """silver plate -> clear ice; the blue cape -> pine black; the gold trim -> steel; the blue glow (blade, visor) ->
    ice white with an aurora-violet core"""
    m, L, C, h = lch_img(a)
    cape = consolidate(m & (h > 230) & (h < 300) & (C > 0.07) & (L < 0.62), m)
    gold = m & (h > 50) & (h < 110) & (C > 0.06)
    glow = m & (h > 170) & (h < 270) & (C > 0.06) & (L > 0.62)
    rest = m & ~cape & ~gold & ~glow
    a = gmap(a, rest, ICEGLASS, gamma=0.85)
    a = gmap(a, cape, PINE, gamma=1.1)
    a = gmap(a, gold, STEEL)
    a = gmap(a, glow, [(0.0, 'ice:2'), (0.6, 'ice:3'), (1.0, 'metal:4')])
    return a


def rc_lantern(a):
    """purple shroud -> frost-white robes shaded ice blue (pine black in the deepest folds); the blue eyes are replaced
    by the lantern in finish()"""
    m, L, C, h = lch_img(a)
    eye = m & (h > 200) & (h < 275) & (C > 0.12) & (L > 0.55)
    body = m & ~eye
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.1, 'foliage_dark:0'), (0.2, 'ink:2'), (0.32, 'roof_blue:3'), (0.46, 'stone_cool:4'),
                       (0.58, 'stone_cool:5'), (0.7, 'ice:2'), (0.84, 'metal:3'), (1.0, 'metal:4')], gamma=0.7)
    a = gmap(a, eye, [(0.0, 'shadow:0'), (1.0, 'shadow:1')])
    return a


SPECS = {
    'rime_wolf': dict(cell=2, h=60, k=16, rc=rc_wolf, flip=True, eyes=[(93, 233)]),
    'snow_wisp': dict(cell=0, h=48, k=14, rc=rc_wisp),
    'hush_owl': dict(cell=6, h=70, k=16, rc=rc_owl, keep=0.03, dist=30),
    'crystal_crawler': dict(cell=3, h=50, k=16, rc=rc_crawler, flip=True),
    'frostbound_revenant': dict(cell=7, h=84, k=14, rc=rc_revenant),
    'ice_knight': dict(cell=5, h=96, k=18, rc=rc_knight, flip=True, keep=0.05, dist=20),
    'pale_lantern': dict(cell=1, h=92, k=14, rc=rc_lantern),
}


def make(eid, src):
    spec = SPECS[eid]
    obj = main_object(grid_cell(src, 4, 2, spec['cell']), keep_frac=spec.get('keep', 0.04), max_dist=spec.get('dist', 40))
    tw, th = fit_size(obj, th=spec['h'])
    d, _ = pixelize2(obj, tw, th, k=spec['k'], sharpen=0.0, max_de=0.10, ring=False)
    d = spec['rc'](d)
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 6 if th > 30 else 3)
    if spec.get('lift'):
        big = CL.lift_darkest(big, spec['lift'])
    big = CL.ramp_outline(big)
    if spec.get('eyes'):
        oh, ow = obj.shape[:2]
        for sx, sy in spec['eyes']:
            x = int(round(sx * tw / ow)) + 1
            y = int(round(sy * th / oh)) + 1
            _EYE_AT[eid] = (x, y, spec.get('flip', False), big.shape[1])
    if spec.get('flip'):
        big = flip_x(big)
    return finish(eid, big)


_EYE_AT = {}


# ----------------------------------------------------------------------------- hand edits
def find_light(a, box, hue=(180, 260), minL=0.7):
    """the lightest pixel of a hue in a box (fractions x0, y0, x1, y1) or None"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    b = np.zeros((H, W), bool)
    b[int(H * box[1]):int(H * box[3]), int(W * box[0]):int(W * box[2])] = True
    cand = b & m & (h > hue[0]) & (h < hue[1]) & (L > minL)
    if not cand.any():
        return None
    ys, xs = np.nonzero(cand)
    i = int(np.argmax(L[ys, xs]))
    return int(xs[i]), int(ys[i])


def wolf_face(a):
    """the wolf's eye (facing right): an ice-blue eye under a dark lid; frost crusted along the jaw and muzzle (ice and
    white flecks on the lower head) and three short icicles hanging from the jaw"""
    H, W = a.shape[:2]
    if 'rime_wolf' in _EYE_AT:
        x, y, fl, w = _EYE_AT['rime_wolf']
        if fl:
            x = w - 1 - x
        put(a, x, y, 'ice:3'); put(a, x - 1, y, 'ice:1')
        for dx in (-1, 0, 1):
            put(a, x + dx, y - 1, 'shadow:0')
        put(a, x + 1, y, 'shadow:0')
    al = a[..., 3] > 0.5
    e = edge_mask(a)
    # frost on the jaw and muzzle (the head's lower front, measured on the 60 px cut): ice-blue crystals and white glints
    # dithered over the fur, and two short icicles under the jaw
    for y in range(int(H * 0.58), int(H * 0.76)):
        for x in range(int(W * 0.8), W):
            if al[y, x] and not e[y, x] and (x + y) % 2 == 0:
                put(a, x, y, 'ice:1' if (x * 3 + y) % 5 else 'metal:4')
    for x in (int(W * 0.86), int(W * 0.93)):
        ys = np.nonzero(al[:int(H * 0.8), x])[0]
        if len(ys):
            y = ys.max()
            put(a, x, y, 'ice:2'); put(a, x, y + 1, 'ice:3')
    return a


def wisp_eyes(a):
    """two dark eyes with a violet glint; snowflakes falling inside the jelly (white specks and small crosses)"""
    eyes = _EYES.get('snow_wisp')
    big = np.zeros(a.shape[:2], bool)
    if eyes is not None:
        big[1:-1, 1:-1] = eyes
    lab, n = ndi.label(big)
    if n > 2:
        sz = ndi.sum(big, lab, range(1, n + 1))
        keep = [int(i) + 1 for i in np.argsort(sz)[::-1][:2]]
    else:
        keep = list(range(1, n + 1))
    EYE = ['.kkk.', 'kKKVk', 'kKKKk', '.kkk.']
    leg = {'k': 'shadow:0', 'K': 'roof_purple:1', 'V': 'magic_violet:4'}
    spots = []
    for i in keep:
        ys, xs = np.nonzero(lab == i)
        cx, cy = int(round(xs.mean())), int(round(ys.mean()))
        a = stamp(a, EYE, leg, cx - 2, cy - 1)
        spots.append((cx, cy))
    # snow inside: crosses and dots on the jelly's interior, away from the eyes
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    inner = ndi.binary_erosion(al, iterations=2)
    rng = np.random.RandomState(11)
    placed = 0
    for _ in range(400):
        x, y = rng.randint(2, W - 2), rng.randint(int(H * 0.25), H - 3)
        if not inner[y, x] or any(abs(x - sx) < 5 and abs(y - sy) < 4 for sx, sy in spots):
            continue
        m, L, C, h = lch_img(a[y - 1:y + 2, x - 1:x + 2])
        if L[1, 1] > 0.85:
            continue
        if placed % 3 == 0:
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                put(a, x + dx, y + dy, 'metal:4' if (dx, dy) == (0, 0) else 'ice:3')
        else:
            put(a, x, y, 'metal:4')
        spots.append((x, y))
        placed += 1
        if placed >= 9:
            break
    return a


def owl_bars(a):
    """grey bars across the white plumage (short dashes, every fourth row, on the lit feathers) and a gold eye with a
    dark pupil in the head (the head faces right: the lightest gold-free white at the upper right)"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    e = edge_mask(a)
    lit = m & ~e & (L > 0.82) & (C < 0.05)
    lit = ndi.binary_erosion(lit, iterations=1) | (lit & ndi.binary_erosion(m, iterations=2))
    rng = np.random.RandomState(3)
    for y in range(3, H - 3, 4):
        x = rng.randint(0, 3)
        while x < W - 2:
            if lit[y, x] and lit[y, x + 1]:
                put(a, x, y, 'stone_cool:3'); put(a, x + 1, y, 'stone_cool:4')
                x += 5 + rng.randint(0, 3)
            else:
                x += 1
    return a


def owl_eye(a):
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    # the beak is the gold mass at the upper right; the eye sits just behind it, above
    warm = m & (h > 40) & (h < 120) & (C > 0.07)
    box = np.zeros((H, W), bool)
    box[:int(H * 0.55), int(W * 0.7):] = True
    bk = warm & box
    if not bk.any():
        return a
    ys, xs = np.nonzero(bk)
    bx, by = int(xs.min()), int(ys.min())
    x, y = bx - 3, by - 1
    EYE = ['.kk.', 'kGYk', 'kGkk', '.kk.']
    return stamp(a, EYE, {'k': 'shadow:0', 'G': 'gold:4', 'Y': 'gold:5'}, x - 1, y - 1)


def facets(a):
    """facet lines cut across the crystal shell: dark ice-blue diagonals with a white glint on their upper side, and two
    bright highlights"""
    s = _SHELL.get('crystal_crawler')
    if s is None:
        return a
    shell = np.zeros(a.shape[:2], bool)
    shell[1:-1, 1:-1] = s[:, ::-1]
    shell = ndi.binary_erosion(shell, iterations=1) & (a[..., 3] > 0.5) & ~edge_mask(a)
    ys, xs = np.nonzero(shell)
    if not len(ys):
        return a
    for (x0, y0, dx, dy) in ((0.3, 0.0, 1, 1), (0.62, 0.0, -1, 1), (0.1, 0.45, 1, 0)):
        x = xs.min() + (xs.max() - xs.min()) * x0
        y = ys.min() + (ys.max() - ys.min()) * y0
        for _ in range(60):
            xi, yi = int(round(x)), int(round(y))
            if 0 <= yi < a.shape[0] and 0 <= xi < a.shape[1] and shell[yi, xi]:
                put(a, xi, yi, 'water:3')
                if yi - 1 >= 0 and shell[yi - 1, xi]:
                    put(a, xi, yi - 1, 'metal:4' if (xi + yi) % 3 == 0 else 'ice:3')
            x += dx * (0.8 if dy else 1.0)
            y += dy * 0.6
    return a


REV_SKULL = (46, 7)      # the skull's top-left on the 84 px cut (painting coordinates, + 1 for the padding), found by eye


def revenant_void(a):
    """the skull under the frost crown, redrawn clean so it reads at 1x: a white skull with dark sockets and two ice-blue
    eyes burning in them (the painting's blue eyes are lost in the cut)"""
    SK = ['..WWW..',
          '.WWwWW.',
          'WkkWkkW',
          'WkBwkBW',
          '.WWkWW.',
          '.wkwkw.',
          '..WWw..']
    return stamp(a, SK, {'W': 'metal:3', 'w': 'stone_cool:5', 'k': 'shadow:0', 'B': 'ice:1'}, *REV_SKULL)


def frost_hem(a, frac=0.82, ref=('metal:4', 'ice:3')):
    """frost on a hem: on the lowest rows of the figure, every other opaque interior pixel of the bottom edge rows goes
    white or ice"""
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    e = edge_mask(a)
    for x in range(W):
        ys = np.nonzero(al[:, x])[0]
        if not len(ys) or ys.max() < H * frac:
            continue
        y = ys.max() - 1
        if al[y, x] and not e[y, x] and (x % 2 == 0):
            put(a, x, y, ref[0] if x % 4 == 0 else ref[1])
    return a


def knight_visor(a):
    """a violet glint in the visor slit: the darkest run in the helmet box gets two violet pixels"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    box = np.zeros((H, W), bool)
    box[int(H * 0.04):int(H * 0.16), int(W * 0.3):int(W * 0.75)] = True
    dark = box & m & (L < 0.3) & ~edge_mask(a)
    if not dark.any():
        return a
    ys, xs = np.nonzero(dark)
    i = int(np.argmin(np.abs(ys - ys.mean()) + np.abs(xs - xs.mean())))
    put(a, xs[i], ys[i], 'magic_violet:3'); put(a, xs[i] + 1, ys[i], 'magic_violet:4')
    return a


def lantern_head(a):
    """the great lantern drawn into the hood where the glow was: an iron cap with a ring, four bars round a cold-blue
    glass with a white flame, an iron base, and cold light falling on the hood's inner lip"""
    H, W = a.shape[:2]
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    box = np.zeros((H, W), bool)
    box[int(H * 0.0):int(H * 0.3), int(W * 0.35):int(W * 0.85)] = True
    dark = box & (lab[..., 0] < 0.32) & (a[..., 3] > 0.5) & ~edge_mask(a)
    lb, n = ndi.label(dark)
    if not n:
        return a
    sz = ndi.sum(dark, lb, range(1, n + 1))
    void = lb == int(np.argmax(sz)) + 1
    ys, xs = np.nonzero(void)
    cx = int(round(xs.mean()))
    cy = int(round(ys.mean())) + 1
    LAMP = ['.....kRk.....',
            '....kR.Rk....',
            '.....kRk.....',
            '....kSSSk....',
            '...kSsssSk...',
            '..kSSSSSSSk..',
            '.kkkkkkkkkkk.',
            '.kgIIsWsIIgk.',
            '.kIIWsWsWIIk.',
            '.kIWWsWsWWIk.',
            '.kIWWsWsWWIk.',
            '.kgIWsWsWIgk.',
            '.kgIIsIsIIgk.',
            '.kkkkkkkkkkk.',
            '..kSsssssSk..',
            '...kkkkkkk...']
    leg = {'k': 'shadow:0', 'R': 'stone_cool:3', 'S': 'stone_cool:4', 's': 'stone_cool:2', 'g': 'ice:1', 'I': 'ice:2',
           'W': 'metal:4'}
    lx, ly = cx - 6, cy - 9
    # cold light on the hood around the lamp first (only on the dark void), then the lamp over it
    for y in range(ly - 4, ly + 20):
        for x in range(lx - 5, lx + 18):
            if 0 <= y < H and 0 <= x < W and void[y, x]:
                d = np.hypot(x - cx, (y - cy) * 0.8)
                if d < 12 and (x + y) % 2 == 0:
                    put(a, x, y, 'ice:1' if d < 9 else 'water:3')
    a = stamp(a, LAMP, leg, lx, ly)
    _LAMP['pale_lantern'] = (cx, cy)
    return a


_LAMP = {}


def finish(eid, a):
    """per-foe hand edits on the right-facing base, then the contrast rule (dark outline, cool rim)"""
    if eid == 'rime_wolf':
        a = wolf_face(a)
    if eid == 'snow_wisp':
        a = wisp_eyes(a)
    if eid == 'hush_owl':
        a = owl_bars(a)
        a = owl_eye(a)
    if eid == 'crystal_crawler':
        a = facets(a)
    if eid == 'frostbound_revenant':
        a = revenant_void(a)
    if eid == 'ice_knight':
        a = knight_visor(a)
        a = frost_hem(a, 0.6)
    if eid == 'pale_lantern':
        a = lantern_head(a)
        a = frost_hem(a, 0.7)
    return contrast(a)


_CACHE = {}


def build():
    if not _CACHE:
        src = load_src('enemies.png')
        for eid in SPECS:
            _CACHE[eid] = make(eid, src)
    return _CACHE


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames
def pack7(eid, base, raw):
    """anim_frames._pack with a frost death: the dissolve front runs white and the drifting flakes are ice blue"""
    ox, oy = AF.origin_of(base)
    out = {}
    for n, v in raw.items():
        img, dox = (v if isinstance(v, tuple) else (v, 0))
        out[n] = (img, ox + dox, oy)
    seed = sum(ord(c) for c in eid) * 17 + 7
    for i, lv in enumerate(AF.DIE_LEVELS):
        out[f'die_{i}'] = (AF.dissolve(AF.canvas(base), lv, seed, edge='metal:4', ash='ice:2'), ox, oy)
    return out


ICE_GLOW = [(0.0, 'water:4'), (0.5, 'ice:2'), (1.0, 'ice:3')]
VIOLET_GLOW = [(0.0, 'cloth_purple:4'), (0.5, 'magic_violet:3'), (1.0, 'magic_violet:4')]


def lantern_cast(img, raw):
    """the Lantern's cast: the lamp flares white and a ring of cold sparks rises from the hood"""
    c, dox = raw['cast'] if isinstance(raw['cast'], tuple) else (raw['cast'], 0)
    c = E5.remap_violet((c, 0), ICE_GLOW)[0]
    m, L, C, h = lch_img(c)
    c = AF.glow(c, m & (h > 190) & (h < 260) & (L > 0.8), 'ice', 0.6, 2)
    H, W = img.shape[:2]
    lx, ly = _LAMP.get('pale_lantern', (W // 2, H // 6))
    c = AF.sparkles(c, [(lx - 12, ly - 6, 2), (lx + 10, ly - 8, 1), (lx - 2, ly - 14, 2), (lx + 16, ly + 4, 1),
                        (lx - 18, ly + 6, 1)], ['metal:4', 'ice:3'])
    return (c, dox)


def derived(eid, img):
    import ep3_enemies as E3
    from ep2_enemies import f_wraith
    H, W = img.shape[:2]
    if eid == 'rime_wolf':
        from hollow_enemies import f_wolf
        raw = f_wolf(img, 1.0, 0, 0, prefer=('shadow', 'ink', 'water', 'ice', 'foliage_dark'))
    elif eid == 'crystal_crawler':
        raw = AF.f_moss_scarab(img, prefer=('shadow', 'foliage_dark', 'roof_green', 'water', 'ice'))
    elif eid == 'hush_owl':
        raw = E3.f_specter(img)
        c = raw['cast']
        c, dox = (c if isinstance(c, tuple) else (c, 0))
        m, L, C, h = lch_img(c)
        raw['cast'] = (gmap(c, m & (h < 70) & (C > 0.1) & (L > 0.5), ICE_GLOW), dox)
    elif eid == 'snow_wisp':
        raw = AF.f_ink_slime(img)
        raw['hurt'] = AF.edge_lift(AF.lean(AF.canvas(img), 40, -2, taper=14), 2, prefer=('roof_purple', 'cloth_purple', 'shadow'))
        a = AF.canvas(img)
        m, L, C, h = lch_img(a)
        f = AF.glow(a, m & (L > 0.62), 'ice', 0.55, 2)
        raw['cast'] = AF.sparkles(f, [(int(W * 0.5), -3, 2), (int(W * 0.2), 2, 1), (int(W * 0.8), -1, 2), (int(W * 0.36), -7, 1)],
                                  ['metal:4', 'ice:3', 'magic_violet:4'])
    elif eid == 'frostbound_revenant':
        raw = dict(AF.f_ink_wraith(img))
        raw['cast'] = E5.remap_violet(raw['cast'], ICE_GLOW)
    elif eid == 'ice_knight':
        raw = E5.knight_scaled(img, 1.0)
        raw['cast'] = E5.remap_violet(raw['cast'], VIOLET_GLOW)
    elif eid == 'pale_lantern':
        raw = f_wraith(img, img.shape[0] / 72.0, 'ice', 2, ['metal:4', 'ice:3', 'ice:2'],
                       ('shadow', 'foliage_dark', 'ink', 'water', 'ice'))
        raw['cast'] = lantern_cast(img, raw)
    else:
        raw = {}
    return pack7(eid, img, raw)


CASTERS = ('snow_wisp', 'hush_owl', 'frostbound_revenant', 'ice_knight', 'pale_lantern')


def frames_of(eid):
    img = build()[eid]
    H, W = img.shape[:2]
    out = [(eid, img, W // 2, H - 1)]
    fr = derived(eid, img)
    out += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr and (n != 'cast' or eid in CASTERS)]
    return out


def atlas_frames(ids=None):
    out = []
    for eid in (ids or ALL_IDS):
        out += frames_of(eid)
    return out


SNOW_BG = (226, 234, 242)
VAULT_BG = (30, 34, 52)

if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep7'), exist_ok=True)
    b = base()
    for bg, tag in ((SNOW_BG, 'snow'), (VAULT_BG, 'vault')):
        contact(list(b.items()), os.path.join(OUT, 'ep7', f'enemies_base_4x_{tag}.png'), scale=4, cols=4, bg=bg,
                title='Episode 7 foes (base) at 4x')
