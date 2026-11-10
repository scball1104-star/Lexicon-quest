"""Episode 6 foes with their own battle frames (E6-sprites): the Airstair, the Windward Causeways, the Hall of Broken
Signals and the Eye of the Storm (docs/EPISODE6_PLAN.md 6.2 and 6.4).

Every painted foe is cut from ../assets/art/enemies.png (4x2 grid) at 1x straight from the painting (no non-integer
scaling), recoloured per material with gradient maps onto master ramps (storm slate, cloud white, cobalt, brass, rope,
storm violet), put through the shared cleanup and finished with hand edits. Each is cut at the size of the earlier foe of
the same cell, so the Episode 1 to 5 derived-frame recipes fit it (the Gale Engine is cut larger and its recipe scaled).
None reads as its Episode 5 cousin (or its Episode 2 one: the Mist Wolf kept the painting's silver):

  squall_wolf     cell 2 at 60 px  ground  storm-slate fur (darker than the Mist Wolf), white wind streaks swept back
                                           along the flank, a cobalt mane, pale blue eyes
  gale_sprite     cell 0 at 48 px  aloft   a cloud-white jelly shaded cobalt, its veins a wind swirl, two blue wind eyes
  rigger_beetle   cell 3 at 50 px  ground  a brass shell with rows of rivets, rope-coloured legs and horns, slate below
  signal_wraith   cell 1 at 72 px  aloft   slate robes; a signal lamp burning in the hood (a warm lamp, not eyes)
  storm_harrier   cell 6 at 70 px  aloft   near as painted: cobalt wings, white breast, pale gold talons and beak
  lightning_manta cell 7 at 84 px  aloft   the ragged cloak spread as a ray's wings: storm violet, yellow spark lines
                                           zigzagging along each wing, two yellow eyes
  gale_engine     cell 4 at 100 px ground  (mini-boss) brass blocks with cobalt bands, a fan drawn into the core
                                           (four cobalt blades round a brass hub), leather bellows on its back

The storm_page, false_beacon and broken_compass are drawn in code (ep6_drawn.py).

The contrast rule (Episode 6's stages are bright cloud and dark storm slate): after the cleanup every foe gets a DARK
outline (every edge pixel lighter than L 0.30 becomes shadow:0) and, just inside it on the upper and left edges, a 1 px
side-coded rim: cloud white for Aloft foes, brass for grounded ones (plan 6.2, CRITIQUE_6 item 8). The dark line holds
on cloud, the light line on the storm.

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

IDS = ['squall_wolf', 'gale_sprite', 'rigger_beetle', 'signal_wraith', 'storm_harrier', 'lightning_manta']
BOSS_IDS = ['gale_engine']
ALL_IDS = IDS + BOSS_IDS
WIND = {'squall_wolf': 'ground', 'gale_sprite': 'aloft', 'rigger_beetle': 'ground', 'signal_wraith': 'aloft',
        'storm_harrier': 'aloft', 'lightning_manta': 'aloft', 'storm_page': 'aloft', 'gale_engine': 'ground',
        'scribe': 'aloft', 'false_beacon': 'aloft', 'broken_compass': 'ground'}

# ----------------------------------------------------------------------------- the contrast rule (E5's, two new sides)
E5.RIM.setdefault('aloft', ('metal:3', 'metal:4'))        # (left edge, top edge): cloud white
E5.RIM.setdefault('ground', ('gold:3', 'gold:4'))         # brass
E5.RIM.setdefault('ground_field', ('gold:4', 'gold:5'))   # brass, a step brighter for the dark floors
dark_outline = E5.dark_outline
side_rim = E5.side_rim
edge_mask = E5.edge_mask
put = E5.put


def contrast(a, eid):
    return side_rim(dark_outline(a), WIND[eid])


def dist_rim(a, eid):
    return side_rim(dark_outline(a), WIND[eid], min_nb=5, right=True)


# ----------------------------------------------------------------------------- recolours (on the quantized cut, painting orientation)
SLATE = [(0.0, 'shadow:0'), (0.12, 'shadow:1'), (0.26, 'stone_cool:1'), (0.42, 'stone_cool:2'), (0.6, 'stone_cool:3'),
         (0.8, 'stone_cool:4'), (1.0, 'stone_cool:5')]
COBALT = [(0.0, 'shadow:0'), (0.2, 'roof_blue:1'), (0.45, 'roof_blue:2'), (0.7, 'roof_blue:3'), (1.0, 'roof_blue:4')]
BRASS = [(0.0, 'wood:0'), (0.14, 'wood:1'), (0.3, 'wood:2'), (0.46, 'gold:2'), (0.64, 'gold:3'), (0.84, 'gold:4'),
         (1.0, 'gold:5')]
ROPE = [(0.0, 'earth:1'), (0.25, 'earth:2'), (0.5, 'path:1'), (0.75, 'path:3'), (1.0, 'sand:2')]
CLOUD = [(0.0, 'cloth_blue:3'), (0.12, 'cloth_blue:3'), (0.28, 'cloth_blue:4'), (0.46, 'ice:2'), (0.64, 'stone_cool:5'),
         (0.82, 'metal:3'), (1.0, 'metal:4')]
VIOLET = [(0.0, 'shadow:0'), (0.14, 'hair_violet:1'), (0.3, 'roof_purple:1'), (0.46, 'roof_purple:2'),
          (0.62, 'roof_purple:3'), (0.8, 'cloth_purple:4'), (1.0, 'cloth_purple:5')]


def rc_wolf(a):
    """silver-white wolf -> storm slate fur (a step darker than the Mist Wolf's silver); the blue flame mane -> cobalt;
    the gold eyes stay as eyes but go pale blue in finish(); white wind streaks swept back along the flank"""
    m, L, C, h = lch_img(a)
    blue = consolidate(m & (h > 200) & (h < 320) & (C > 0.06), m)
    gold = m & (h > 55) & (h < 110) & (C > 0.08)
    blue &= ~gold
    fur = m & ~blue & ~gold
    a = gmap(a, fur, SLATE, gamma=1.15)
    a = gmap(a, blue, COBALT)
    a = gmap(a, gold, [(0.0, 'ice:2'), (1.0, 'ice:3')])
    # streaks: white wind lines swept back along the flank (the painting faces left, so "back" is to the right): on
    # every fifth row of the fur's upper two thirds, dashes four to six pixels long that climb a pixel toward the tail
    H, W = a.shape[:2]
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    ok = fur & ndi.binary_erosion(m, iterations=2) & (lab[..., 0] > 0.3)
    rng = np.random.RandomState(7)
    for y0 in range(int(H * 0.24), int(H * 0.64), 5):
        x = int(W * 0.34) + (y0 * 3) % 5
        while x < W * 0.9:
            n = 4 + rng.randint(0, 3)
            for i in range(n):
                xx, yy = x + i, y0 - (1 if i >= n - 2 else 0)
                if 0 <= yy < H and 0 <= xx < W and ok[yy, xx]:
                    a[yy, xx, :3] = col('metal:4' if i < n - 2 else 'stone_cool:5')
            x += n + 4 + rng.randint(0, 4)
    return a


def rc_sprite(a):
    """green slime -> a cloud-white jelly shaded cobalt; the yellow veins -> a pale wind swirl; the yellow eyes -> blue
    wind eyes"""
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
    a = gmap(a, body, CLOUD, gamma=0.55)
    a = gmap(a, veins, [(0.0, 'ice:1'), (1.0, 'ice:2')])
    a = gmap(a, eyes, [(0.0, 'water:2'), (1.0, 'water:3')])
    a = CL.majority_despeckle(a, passes=2, max_de=0.12, max_island=3, protect=eyes)
    _EYES['gale_sprite'] = eyes
    return a


_EYES = {}


def rc_beetle(a):
    """bronze beetle with a green sheen: the green shell -> brass; the bronze body, horns and legs -> rope; the dark
    underside -> storm slate. Rivets are punched in finish()"""
    m, L, C, h = lch_img(a)
    green = consolidate(m & (h > 110) & (h < 200) & (C > 0.05), m, passes=1)
    warm = m & ~green & (h > 30) & (h < 120) & (C > 0.04)
    dark = m & ~green & ~warm
    H, W = a.shape[:2]
    ys = np.mgrid[0:H, 0:W][0]
    legs = warm & (ys > H * 0.58)
    head = warm & ~legs
    a = gmap(a, green, BRASS, gamma=0.9)
    a = gmap(a, legs, ROPE, gamma=0.9)
    a = gmap(a, head, [(0.0, 'shadow:0'), (0.2, 'shadow:1'), (0.4, 'stone_cool:1'), (0.6, 'stone_cool:2'), (0.8, 'stone_cool:3'),
                       (1.0, 'stone_cool:4')], gamma=1.0)
    a = gmap(a, dark, [(0.0, 'shadow:0'), (0.4, 'shadow:1'), (0.75, 'stone_cool:1'), (1.0, 'stone_cool:2')])
    _SHELL['rigger_beetle'] = green
    return a


_SHELL = {}


def rc_wraith(a):
    """purple shroud -> slate robes (cobalt in the deepest folds); the blue eyes are replaced by the lamp in finish()"""
    m, L, C, h = lch_img(a)
    eye = m & (h > 200) & (h < 275) & (C > 0.12) & (L > 0.55)
    body = m & ~eye
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.1, 'ink:1'), (0.24, 'shadow:2'), (0.4, 'stone_cool:2'), (0.58, 'stone_cool:3'),
                       (0.76, 'stone_cool:4'), (1.0, 'stone_cool:5')], gamma=1.1)
    a = gmap(a, eye, [(0.0, 'shadow:0'), (1.0, 'shadow:1')])
    return a


def rc_harrier(a):
    """the painted roc: its blue feathers -> cobalt (white at the lit tips, on the breast); its gold -> pale gold"""
    m, L, C, h = lch_img(a)
    warm = m & (h > 40) & (h < 120) & (C > 0.07)
    lab, n = ndi.label(warm)
    if n:
        sz = ndi.sum(warm, lab, range(1, n + 1))
        warm = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 3])
    feath = m & ~warm
    a = gmap(a, feath, [(0.0, 'shadow:0'), (0.1, 'roof_blue:0'), (0.24, 'roof_blue:1'), (0.4, 'roof_blue:2'),
                        (0.56, 'roof_blue:3'), (0.72, 'roof_blue:4'), (0.86, 'ice:2'), (1.0, 'metal:4')], gamma=1.0)
    a = gmap(a, warm, [(0.0, 'wood:2'), (0.35, 'gold:3'), (0.7, 'gold:4'), (1.0, 'gold:5')])
    return a


def rc_manta(a):
    """white-blue ghost -> storm violet; the cyan eyes -> yellow; the spark lines are drawn in finish()"""
    m, L, C, h = lch_img(a)
    glow = m & (h > 170) & (h < 250) & (C > 0.1) & (L > 0.68)
    body = m & ~glow
    a = gmap(a, body, VIOLET, gamma=1.25)
    a = gmap(a, glow, [(0.0, 'fire:4'), (1.0, 'fire:5')])
    return a


ENG_K = 100 / 88.0
ENGINE_STRIPS = [tuple(int(round(v * ENG_K)) for v in b) for b in E5.HUSK_STRIPS]


def rc_engine(a):
    """brown stone blocks -> brass (deeper than the Ep3 furnace bronze, lit gold on the faces); the cream strips -> cobalt
    bands; the gold core is replaced by the fan in finish()"""
    m, L, C, h = lch_img(a)
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    near = np.hypot(xs - W * 0.6, ys - H * 0.3) < H * 0.12
    core = m & (h > 60) & (h < 110) & (C > 0.12) & (L > 0.72) & near
    box = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in ENGINE_STRIPS:
        box[y0:y1, x0:x1] = True
    band = ndi.binary_closing(m & box & (h > 74) & (C > 0.055) & (L > 0.46), iterations=1) & m & box & ~core
    stone = m & ~core & ~band
    a = gmap(a, stone, [(0.0, 'shadow:0'), (0.1, 'wood:0'), (0.24, 'wood:1'), (0.4, 'wood:2'), (0.56, 'gold:2'),
                        (0.74, 'gold:3'), (0.9, 'gold:4'), (1.0, 'gold:5')], gamma=0.95)
    a = gmap(a, band, [(0.0, 'roof_blue:1'), (0.4, 'roof_blue:2'), (0.75, 'roof_blue:3'), (1.0, 'roof_blue:4')])
    a = gmap(a, core, [(0.0, 'gold:3'), (1.0, 'gold:4')])
    return a


SPECS = {
    'squall_wolf': dict(cell=2, h=60, k=16, rc=rc_wolf, flip=True),
    'gale_sprite': dict(cell=0, h=48, k=14, rc=rc_sprite),
    'rigger_beetle': dict(cell=3, h=50, k=16, rc=rc_beetle, flip=True),
    'signal_wraith': dict(cell=1, h=72, k=14, rc=rc_wraith),
    'storm_harrier': dict(cell=6, h=70, k=16, rc=rc_harrier, keep=0.03, dist=30),
    'lightning_manta': dict(cell=7, h=84, k=14, rc=rc_manta, lift='shadow'),
    'gale_engine': dict(cell=4, h=100, k=16, rc=rc_engine),
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
    if spec.get('flip'):
        big = flip_x(big)
    return finish(eid, big)


# ----------------------------------------------------------------------------- hand edits
def wolf_eye(a):
    """the wolf's eye (facing right): a pale blue eye with a dark lid line, found as the lightest blue pixel in the head"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    box = np.zeros((H, W), bool)
    box[int(H * 0.15):int(H * 0.5), int(W * 0.55):W] = True
    cand = box & m & (h > 180) & (h < 260) & (L > 0.75)
    if not cand.any():
        return a
    ys, xs = np.nonzero(cand)
    i = int(np.argmax(L[ys, xs]))
    y, x = ys[i], xs[i]
    put(a, x, y, 'ice:3'); put(a, x - 1, y, 'ice:2')
    for dx in (-1, 0, 1):
        put(a, x + dx, y - 1, 'shadow:0')
    return a


def wind_swirl(a, cx, cy, r, ref=('metal:4', 'ice:2'), turns=1.4, start=0.0):
    """a small spiral of wind (two refs: the head of the line bright, its tail softer)"""
    n = int(r * 9)
    for i in range(n):
        t = i / max(1, n - 1)
        ang = start + t * turns * 2 * np.pi
        rr = r * (1 - 0.75 * t)
        x, y = cx + rr * np.cos(ang), cy + rr * np.sin(ang) * 0.7
        if 0 <= int(y) < a.shape[0] and 0 <= int(x) < a.shape[1] and a[int(y), int(x), 3] > 0.5:
            put(a, x, y, ref[0] if t < 0.5 else ref[1])
    return a


def sprite_eyes(a):
    """two wind eyes: a blue iris with a white swirl highlight and a dark rim"""
    eyes = _EYES.get('gale_sprite')
    big = np.zeros(a.shape[:2], bool)
    if eyes is not None:
        big[1:-1, 1:-1] = eyes
    lab, n = ndi.label(big)
    if n > 2:
        sz = ndi.sum(big, lab, range(1, n + 1))
        keep = [int(i) + 1 for i in np.argsort(sz)[::-1][:2]]
    else:
        keep = list(range(1, n + 1))
    EYE = ['.kkk.', 'kWbbk', 'kbBbk', '.kkk.']
    leg = {'k': 'roof_blue:0', 'W': 'metal:4', 'b': 'water:3', 'B': 'water:2'}
    for i in keep:
        ys, xs = np.nonzero(lab == i)
        cx, cy = int(round(xs.mean())), int(round(ys.mean()))
        a = stamp(a, EYE, leg, cx - 2, cy - 1)
    return a


def rivets(a):
    """rows of rivets on the brass shell: a bright head with a dark pixel under it, every fourth pixel along rows that
    follow the shell's curve (every fifth row from the top of the shell)"""
    shell = np.zeros(a.shape[:2], bool)
    s = _SHELL.get('rigger_beetle')
    if s is None:
        return a
    s = s[:, ::-1]                               # the shell mask is in painting orientation; the frame is flipped
    shell[1:-1, 1:-1] = s
    shell = ndi.binary_erosion(shell, iterations=1) & (a[..., 3] > 0.5) & ~edge_mask(a)
    ys, xs = np.nonzero(shell)
    if not len(ys):
        return a
    y0 = ys.min()
    for y in range(y0 + 2, ys.max(), 5):
        row = np.nonzero(shell[y])[0]
        if len(row) < 4:
            continue
        for x in range(row.min() + 1, row.max(), 4):
            if shell[y, x] and y + 1 < a.shape[0]:
                put(a, x, y, 'gold:5')
                put(a, x + 1, y, 'wood:0')
                put(a, x, y + 1, 'wood:0')
        # the seam the rivets close: a dark line one row above, broken where the rivets are
        for x in row:
            if shell[y - 1, x] and (x - row.min() - 1) % 4:
                put(a, x, y - 1, 'wood:2')
    return a


def signal_lamp(a):
    """a signal lamp burning in the hood's dark void: a 3 x 3 bright core (warm white), a gold halo pixel ring and light
    falling on the hood's inner lip"""
    H, W = a.shape[:2]
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    box = np.zeros((H, W), bool)
    box[int(H * 0.02):int(H * 0.32), int(W * 0.4):int(W * 0.85)] = True
    dark = box & (lab[..., 0] < 0.3) & (a[..., 3] > 0.5) & ~edge_mask(a)
    lb, n = ndi.label(dark)
    if not n:
        return a
    sz = ndi.sum(dark, lb, range(1, n + 1))
    void = lb == int(np.argmax(sz)) + 1
    ys, xs = np.nonzero(void)
    cx = int(round(xs.mean()))
    cy = int(ys.min() + max(2, (ys.max() - ys.min()) * 0.5))
    for y in range(cy - 3, cy + 4):
        for x in range(cx - 3, cx + 4):
            d = np.hypot(x - cx, y - cy)
            if 0 <= y < H and 0 <= x < W and a[y, x, 3] > 0.5 and not edge_mask(a)[y, x]:
                if d <= 1.0:
                    put(a, x, y, 'fire:5')
                elif d <= 1.9:
                    put(a, x, y, 'fire:4')
                elif d <= 2.9 and void[y, x]:
                    put(a, x, y, 'gold:3')
    # a lamp has a frame: two dark bars across the light
    put(a, cx - 2, cy, 'wood:0'); put(a, cx + 2, cy, 'wood:0')
    _LAMP['signal_wraith'] = (cx, cy)
    return a


_LAMP = {}


def spark_lines(a, seed=4):
    """yellow spark lines zigzagging out along the manta's wings (from the body toward each wing edge)"""
    H, W = a.shape[:2]
    al = (a[..., 3] > 0.5) & ~edge_mask(a)
    inner = ndi.binary_erosion(al, iterations=1)
    rng = np.random.RandomState(seed)
    cx = W * 0.5
    paths = [(cx - 6, H * 0.36, -1, -0.25), (cx - 5, H * 0.5, -1, 0.15), (cx - 4, H * 0.64, -1, 0.45),
             (cx + 6, H * 0.36, 1, -0.25), (cx + 5, H * 0.5, 1, 0.15), (cx + 4, H * 0.64, 1, 0.45)]
    for (x, y, sgn, slope) in paths:
        pts = [(x, y)]
        for i in range(1, 20):
            x += sgn * 3
            y += slope * 3 + (2.2 if i % 2 else -2.2)
            pts.append((x, y))
        stop = False
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
            for k in range(n + 1):
                xi = int(round(x0 + (x1 - x0) * k / n)); yi = int(round(y0 + (y1 - y0) * k / n))
                if not (0 <= yi < H and 0 <= xi < W) or not inner[yi, xi]:
                    stop = True
                    break
                put(a, xi, yi, 'fire:4' if k % 4 else 'fire:5')
            if stop:
                break
    return a


def fan_core(a, cx, cy, r=7.5, phase=0.0, glow=False):
    """the Gale Engine's heart: a round fan in a dark housing, four swept cobalt blades with white leading edges round
    a brass hub; phase turns the blades (radians)"""
    H, W = a.shape[:2]
    for y in range(int(cy - r - 2), int(cy + r + 3)):
        for x in range(int(cx - r - 2), int(cx + r + 3)):
            if not (0 <= y < H and 0 <= x < W):
                continue
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = np.hypot(dx, dy)
            if d > r + 1.5:
                continue
            if d > r + 0.5:
                put(a, x, y, 'gold:4' if dx + dy < 0 else 'wood:1')      # the housing ring
                continue
            if d <= 1.8:
                put(a, x, y, 'gold:5' if dx + dy < 0 else 'gold:3')     # the hub
                continue
            ang = (np.arctan2(dy, dx) - phase - d * 0.16) % (np.pi / 2)  # four blades, swept
            if ang < 0.62:
                ref = 'metal:4' if ang < 0.16 else ('ice:2' if glow else 'roof_blue:3')
            elif ang < 0.9:
                ref = 'roof_blue:2'
            else:
                ref = 'ice:1' if glow else 'shadow:0'                     # the dark between the blades
            put(a, x, y, ref)
    return a


BELLOWS_W = 10


def bellows(a, rows, x_left, pump=0.0, width=11):
    """leather bellows strapped to the Engine's back (its left: it faces the party on the right): an upright accordion
    between a brass head plate and a brass foot plate, its pleats stepping out and in down the outer edge (lit folds,
    shaded folds, dark valleys), each row running right until it meets the body; a brass pipe from the foot plate into
    the back. pump in 0..1 squeezes the pleats together (the plates move toward each other). Drawn behind the body."""
    H, W = a.shape[:2]
    y0, y1 = rows
    out = a.copy()
    body = a[..., 3] > 0.5
    sq = int(round(pump * 4))
    y0, y1 = y0 + sq // 2, y1 - (sq - sq // 2)
    for y in range(y0, y1 + 1):
        j = y - y0
        if j < 2 or y > y1 - 2:
            edge = 0
            ref_row = ('gold:4', 'gold:2') if (j == 0 or y == y1 - 1) else ('gold:3', 'wood:1')
        else:
            ph = (j - 2) % 4
            edge = (0, 1, 2, 1)[ph]
            ref_row = None
        x = x_left + edge
        while x < W and not body[y, x] and x < x_left + width + 30:
            if out[y, x, 3] < 0.5:
                if ref_row:
                    ref = ref_row[0] if x < x_left + 3 else ref_row[1]
                else:
                    ref = ('wood:4', 'wood:3', 'wood:1', 'wood:2')[(j - 2) % 4]
                    if x == x_left + edge:
                        ref = 'wood:0' if ref in ('wood:1', 'wood:2') else 'wood:3'
                out[y, x, :3] = col(ref); out[y, x, 3] = 1
            x += 1
    # the pipe: from under the foot plate, down and into the back
    py = y1 + 1
    for (dx, dy, ref) in ((4, 0, 'gold:3'), (5, 0, 'gold:4'), (4, 1, 'gold:3'), (5, 1, 'gold:4'), (4, 2, 'wood:1'),
                          (5, 2, 'gold:3'), (6, 2, 'gold:4'), (7, 2, 'gold:4'), (6, 3, 'wood:1'), (7, 3, 'wood:1')):
        x, y = x_left + dx, py + dy
        if 0 <= y < H and 0 <= x < W and out[y, x, 3] < 0.5:
            out[y, x, :3] = col(ref); out[y, x, 3] = 1
    x, y = x_left + 8, py + 2
    while x < W and y < H and out[y, x, 3] < 0.5:
        out[y, x, :3] = col('gold:4'); out[y, x, 3] = 1
        out[y + 1, x, :3] = col('wood:1'); out[y + 1, x, 3] = 1
        x += 1
    return out


def engine_core_xy(a):
    """the fan's centre: where the painted gold core was (the husk's hourglass spot scaled to the 100 px cut)"""
    return int(round(53 * ENG_K)), int(round(27 * ENG_K))


ENGINE_PAD = BELLOWS_W + 2


def finish(eid, a):
    """per-foe hand edits on the right-facing base, then the contrast rule (dark outline, side rim)"""
    H, W = a.shape[:2]
    if eid == 'squall_wolf':
        a = wolf_eye(a)
    if eid == 'gale_sprite':
        a = wind_swirl(a, W * 0.5, H * 0.72, 7.5, start=0.6)
        a = sprite_eyes(a)
    if eid == 'rigger_beetle':
        a = rivets(a)
    if eid == 'signal_wraith':
        a = signal_lamp(a)
    if eid == 'gale_engine':
        cx, cy = engine_core_xy(a)
        a = fan_core(a, cx, cy)
        big = blank(W + ENGINE_PAD, H)
        big[:, ENGINE_PAD:] = a
        a = bellows(big, (int(H * 0.08), int(H * 0.44)), ENGINE_PAD - 9)
    a = contrast(a, eid)
    if eid == 'lightning_manta':
        a = spark_lines(a)
    return a


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
def pack6(eid, base, raw):
    """anim_frames._pack with a storm death: the dissolve front runs white and the drifting flakes are cloud"""
    ox, oy = AF.origin_of(base)
    out = {}
    for n, v in raw.items():
        img, dox = (v if isinstance(v, tuple) else (v, 0))
        out[n] = (img, ox + dox, oy)
    seed = sum(ord(c) for c in eid) * 17 + 5
    for i, lv in enumerate(AF.DIE_LEVELS):
        out[f'die_{i}'] = (AF.dissolve(AF.canvas(base), lv, seed, edge='metal:4', ash='ice:2'), ox, oy)
    return out


BLUE_GLOW = [(0.0, 'water:4'), (0.5, 'ice:2'), (1.0, 'ice:3')]
LAMP_GLOW = [(0.0, 'gold:4'), (0.5, 'fire:4'), (1.0, 'fire:5')]
SPARK_GLOW = [(0.0, 'fire:3'), (0.5, 'fire:4'), (1.0, 'fire:5')]


def f_engine(img):
    """f_tome_golem with its coordinates scaled to the 100 px cut and shifted past the bellows; the cast spins the fan
    to white and the bellows squeeze"""
    a = AF.canvas(img)
    k = ENG_K
    I = lambda v: int(round(v))
    S = lambda r: tuple(I(v * k) + (ENGINE_PAD if i % 2 == 0 else 0) for i, v in enumerate(r))
    out = {}
    arm = AF.m_rect(a, S((74, 8, 91, 52)))
    out['idle_1'] = AF.rise(a, I(60 * k) + AF.PAD)
    f = AF.move(a, arm, AF.cp(I(79 * k) + ENGINE_PAD, I(14 * k)), angle=-18, fill=AF.m_rect(a, S((70, 16, 80, 52))))
    f = AF.rise(f, I(58 * k) + AF.PAD, -2)
    out['attack'] = AF.lean(f, I(62 * k) + AF.PAD, 2, taper=I(16 * k))
    f = AF.lean(a, I(62 * k) + AF.PAD, -3, taper=I(16 * k))
    f, dox = AF.squash(f, (I(24 * k), I(44 * k)), (I(22 * k) + ENGINE_PAD, I(66 * k) + ENGINE_PAD))
    out['hurt'] = (AF.edge_lift(f, 2, prefer=('wood', 'gold', 'roof_blue', 'shadow')), dox)
    return out


def engine_frames(img):
    """the Engine's own frames re-run the hand edits so the fan turns between them: idle_1 the fan a quarter turn on,
    cast the fan white-hot (the bellows squeezed, wind streaks off the vents)"""
    raw = f_engine(img)
    H, W = img.shape[:2]
    cx, cy = engine_core_xy(img)
    cx += ENGINE_PAD
    for n in ('idle_1', 'attack'):
        f = raw[n]
        f = fan_core(f, cx + AF.PAD, cy + AF.PAD - (1 if n == 'idle_1' else 2), phase=0.5)
        raw[n] = f
    c = AF.canvas(img)
    c = fan_core(c, cx + AF.PAD, cy + AF.PAD, phase=0.9, glow=True)
    m, L, Cc, h = lch_img(c)
    c = AF.sparkles(c, [(AF.PAD + 2, AF.PAD + int(H * 0.2), 1), (AF.PAD, AF.PAD + int(H * 0.3), 2),
                        (AF.PAD + 4, AF.PAD + int(H * 0.42), 1), (AF.PAD + W - 4, AF.PAD + int(H * 0.08), 1)],
                    ['metal:4', 'ice:3'])
    raw['cast'] = c
    return raw


def derived(eid, img):
    import ep3_enemies as E3
    H, W = img.shape[:2]
    if eid == 'squall_wolf':
        from hollow_enemies import f_wolf
        raw = f_wolf(img, 1.0, 0, 0, prefer=('shadow', 'stone_cool', 'roof_blue', 'metal'))
    elif eid == 'rigger_beetle':
        raw = AF.f_moss_scarab(img, prefer=('shadow', 'wood', 'gold', 'path', 'earth'))
    elif eid == 'storm_harrier':
        raw = E3.f_specter(img)
        c = raw['cast']
        c, dox = (c if isinstance(c, tuple) else (c, 0))
        m, L, C, h = lch_img(c)
        raw['cast'] = (gmap(c, m & (h < 70) & (C > 0.1) & (L > 0.5), BLUE_GLOW), dox)
    elif eid == 'signal_wraith':
        raw = AF.f_page_wraith(img)
        raw['cast'] = E5.remap_violet(raw['cast'], LAMP_GLOW)
    elif eid == 'gale_sprite':
        raw = AF.f_ink_slime(img)
        raw['hurt'] = AF.edge_lift(AF.lean(AF.canvas(img), 40, -2, taper=14), 2, prefer=('cloth_blue', 'ink', 'shadow'))
        a = AF.canvas(img)
        m, L, C, h = lch_img(a)
        f = AF.glow(a, m & (h > 200) & (h < 280) & (C > 0.08), 'ice', 0.5, 2)
        f = wind_swirl(f, AF.PAD + W * 0.5, AF.PAD + H * 0.45, 12, ref=('metal:4', 'ice:2'), start=1.2)
        raw['cast'] = AF.sparkles(f, [(int(W * 0.5), -3, 2), (int(W * 0.2), 2, 1), (int(W * 0.8), -1, 2), (int(W * 0.36), -7, 1)],
                                  ['metal:4', 'ice:3'])
    elif eid == 'lightning_manta':
        raw = dict(AF.f_ink_wraith(img))
        raw['cast'] = E5.remap_violet(raw['cast'], SPARK_GLOW)
        c, dox = raw['cast'] if isinstance(raw['cast'], tuple) else (raw['cast'], 0)
        m, L, C, h = lch_img(c)
        c = AF.glow(c, m & (h > 60) & (h < 110) & (L > 0.7), 'fire', 0.5, 1)
        raw['cast'] = (AF.sparkles(c, [(int(W * 0.1), 6, 2), (int(W * 0.9), 6, 2), (int(W * 0.5), -4, 1), (int(W * 0.3), -1, 1)],
                                   ['fire:5', 'fire:4']), dox)
    elif eid == 'gale_engine':
        raw = engine_frames(img)
    else:
        raw = {}
    return pack6(eid, img, raw)


CASTERS = ('gale_sprite', 'signal_wraith', 'lightning_manta', 'gale_engine')


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


CLOUD_BG = (214, 226, 240)
STORM_BG = (40, 44, 66)

if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep6'), exist_ok=True)
    b = base()
    for bg, tag in ((CLOUD_BG, 'cloud'), (STORM_BG, 'storm')):
        contact(list(b.items()), os.path.join(OUT, 'ep6', f'enemies_base_4x_{tag}.png'), scale=4, cols=4, bg=bg,
                title='Episode 6 foes (base) at 4x')
