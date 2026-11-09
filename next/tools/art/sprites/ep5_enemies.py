"""Episode 5 foes with their own battle frames (E5-sprites): the crossing, the Caravan Road and the Oracle Labyrinth.

Every foe is cut from ../assets/art/enemies.png (4x2 grid) at 1x straight from the painting (no non-integer scaling;
the Mirage Double is a second cut of the same cell at 86 px, never a resample of the Knight), recoloured per material
with gradient maps onto master ramps (desert gold, ochre, rust, sandstone, lapis and night indigo), put through the
shared cleanup and finished with hand edits. Each uses a different painted cell, at the size of the earlier foe of the
same cell, so the Episode 1 to 4 derived-frame recipes fit it. None reads as its Episode 4 cousin:

  dune_stalker   cell 2 at 60 px  sun   sand-gold fur with dark stripes, a dark rust mane, a hot gold eye
  dune_scarab    cell 3 at 50 px  sun   a gold shell inlaid with lapis, lapis legs and trim (it is a beetle, as painted)
  dust_harrier   cell 6 at 70 px  sun   ochre and rust feathers, a bone beak and talons
  silt_reaver    cell 1 at 72 px  star  dust-coloured robes, sand streaming from the sleeves, star-blue eyes
  starsilt       cell 0 at 48 px  star  deep indigo jelly with white and gold star specks, two gold star eyes
  horizon_shade  cell 7 at 84 px  star  night indigo above a bright horizon line, pale dusk gold below it
  tomorrow_husk  cell 4 at 88 px  sun   pale sandstone with lapis bands and an hourglass for a heart
  mirage_knight  cell 5 at 96 px  sun   sun-bronze plate, a sandstone cape, a sun-gold blade; the shield's face a
                                        painted sea horizon under the sky it is not (night: a moon on the water)
  mirage_double  cell 5 at 86 px  star  the Knight in indigo and silver; its shield shows the day sea and a sun

The contrast rule (Episode 5's stages are bright sand and night sky): after the cleanup every foe gets a DARK outline
(every edge pixel lighter than L 0.30 becomes shadow:0) and, just inside it on the upper and left edges, a 1 px
side-coded rim: gold for sun foes, pale blue for star foes (CRITIQUE_6 item 8). The dark line holds on sand, the light
line holds on night.

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

IDS = ['dune_stalker', 'dune_scarab', 'dust_harrier', 'silt_reaver', 'starsilt', 'horizon_shade', 'tomorrow_husk']
BOSS_IDS = ['mirage_knight']
ADD_IDS = ['mirage_double']
ALL_IDS = IDS + BOSS_IDS + ADD_IDS
SIDE = {'dune_stalker': 'sun', 'dune_scarab': 'sun', 'dust_harrier': 'sun', 'silt_reaver': 'star', 'starsilt': 'star',
        'horizon_shade': 'star', 'tomorrow_husk': 'sun', 'mirage_knight': 'sun', 'mirage_double': 'star',
        'oracle': 'sun', 'future_hunger': 'sun', 'future_fear': 'star'}

# ----------------------------------------------------------------------------- the contrast rule
DARK = 'shadow:0'
RIM = {'sun': ('gold:4', 'gold:5'), 'star': ('ice:1', 'ice:2')}       # (left edge, top edge)


def edge_mask(a):
    al = a[..., 3] > 0.5
    p = np.pad(al, 1)
    return al & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])


def dark_outline(a, max_L=0.30):
    """every edge pixel lighter than max_L (OKLab) becomes the darkest master colour: the silhouette holds on sand"""
    a = a.copy()
    e = edge_mask(a)
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(a.shape[:2] + (3,))
    a[e & (lab[..., 0] > max_L), :3] = col(DARK)
    return a


def side_rim(a, side, min_nb=6, right=False):
    """a 1 px light line just inside the dark outline on the upper and left edges (and the right ones too with
    right=True: the field sprites, which a night tint dims), in the side's colour (gold sun, pale blue star): the
    silhouette holds on the night stage. Thin strands (fewer than min_nb opaque neighbours) keep their own colour."""
    a = a.copy()
    al = a[..., 3] > 0.5
    H, W = al.shape
    e = edge_mask(a)
    p = np.pad(al, 1)
    top_e = e & ~p[:-2, 1:-1]
    left_e = e & ~p[1:-1, :-2]
    nb = sum(p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx].astype(np.int32) for dy in (-1, 0, 1) for dx in (-1, 0, 1)) - al
    inner = al & ~e & (nb >= min_nb)
    pt, pl = np.pad(top_e, 1), np.pad(left_e, 1)
    rim_top = inner & pt[:-2, 1:-1]
    rim_left = inner & pl[1:-1, :-2] & ~rim_top
    if right:
        right_e = e & ~p[1:-1, 2:]
        pr = np.pad(right_e, 1)
        rim_left |= inner & pr[1:-1, 2:] & ~rim_top
    a[rim_left, :3] = col(RIM[side][0])
    a[rim_top, :3] = col(RIM[side][1])
    return a


def contrast(a, side):
    return side_rim(dark_outline(a), side)


def put(a, x, y, ref):
    H, W = a.shape[:2]
    x, y = int(x), int(y)
    if 0 <= y < H and 0 <= x < W:
        a[y, x, :3] = col(ref); a[y, x, 3] = 1


# ----------------------------------------------------------------------------- recolours (on the quantized cut, painting orientation)
def rc_stalker(a):
    """silver-white wolf -> sand-gold fur; the blue flame mane -> a dark rust mane; dark stripes across back and flank"""
    m, L, C, h = lch_img(a)
    blue = consolidate(m & (h > 200) & (h < 320) & (C > 0.06), m)
    gold = m & (h > 55) & (h < 110) & (C > 0.08)
    blue &= ~gold
    fur = m & ~blue & ~gold
    a = gmap(a, fur, [(0.0, 'shadow:0'), (0.1, 'wood:0'), (0.22, 'wood:1'), (0.36, 'wood:2'), (0.5, 'wood:3'),
                      (0.64, 'wood:4'), (0.78, 'gold:3'), (0.9, 'sand:2'), (1.0, 'sand:3')], gamma=0.9)
    a = gmap(a, blue, [(0.0, 'shadow:0'), (0.3, 'wood:0'), (0.6, 'wood:1'), (0.85, 'roof_red:1'), (1.0, 'roof_red:2')])
    a = gmap(a, gold, [(0.0, 'gold:4'), (1.0, 'gold:5')])
    # stripes: diagonal dark bands on the fur's upper two thirds (the painting faces left; the flip comes later)
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    band = ((xs * 0.55 + ys) % 8 < 1.6) & (ys > H * 0.22) & (ys < H * 0.62) & (xs > W * 0.18) & (xs < W * 0.62)
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    sel = fur & band & ndi.binary_erosion(m, iterations=2) & (lab[..., 0] > 0.45)
    a[sel, :3] = col('wood:1')
    return a


def rc_scarab(a):
    """the painted beetle is bronze with a green sheen: the bronze shell, horns and legs -> gold; the green sheen -> lapis
    inlay (bright lapis where it shone); the dark underside -> night blue"""
    m, L, C, h = lch_img(a)
    green = consolidate(m & (h > 110) & (h < 200) & (C > 0.05), m, passes=1)
    glow = green & (L > 0.72)
    lapis = green & ~glow
    warm = m & ~green & (h > 30) & (h < 120) & (C > 0.04)
    dark = m & ~green & ~warm
    a = gmap(a, warm, [(0.0, 'wood:0'), (0.14, 'wood:1'), (0.3, 'wood:2'), (0.46, 'gold:2'), (0.64, 'gold:3'),
                       (0.82, 'gold:4'), (1.0, 'gold:5')], gamma=0.95)
    a = gmap(a, lapis, [(0.0, 'cloth_blue:1'), (0.35, 'cloth_blue:2'), (0.7, 'cloth_blue:3'), (1.0, 'cloth_blue:4')])
    a = gmap(a, glow, [(0.0, 'water:4'), (1.0, 'ice:2')])
    a = gmap(a, dark, [(0.0, 'shadow:0'), (0.4, 'ink:1'), (0.75, 'cloth_blue:0'), (1.0, 'cloth_blue:1')])
    return a


def rc_harrier(a):
    """blue-and-gold roc -> ochre and rust feathers (rust in the shadows, ochre in the light, pale sand at the tips);
    the gold talons and beak -> bone"""
    m, L, C, h = lch_img(a)
    warm = m & (h > 40) & (h < 120) & (C > 0.07)
    lab, n = ndi.label(warm)
    if n:
        sz = ndi.sum(warm, lab, range(1, n + 1))
        warm = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 3])
    feath = m & ~warm
    a = gmap(a, feath, [(0.0, 'shadow:0'), (0.1, 'wood:0'), (0.22, 'roof_red:1'), (0.36, 'roof_red:2'), (0.5, 'roof_red:3'),
                        (0.62, 'wood:3'), (0.74, 'gold:2'), (0.86, 'wood:5'), (1.0, 'sand:3')], gamma=0.95)
    a = gmap(a, warm, [(0.0, 'wood:0'), (0.35, 'stone_warm:3'), (0.7, 'stone_warm:4'), (1.0, 'stone_warm:5')])
    return a


def rc_reaver(a):
    """purple shroud -> dust-coloured robes; the blue eyes -> star blue"""
    m, L, C, h = lch_img(a)
    eye = m & (h > 200) & (h < 275) & (C > 0.12) & (L > 0.55)
    body = m & ~eye
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.12, 'stone_warm:1'), (0.26, 'earth:2'), (0.42, 'path:1'),
                       (0.58, 'path:2'), (0.74, 'path:3'), (0.88, 'sand:2'), (1.0, 'sand:3')], gamma=1.15)
    a = gmap(a, eye, [(0.0, 'water:4'), (1.0, 'ice:3')])
    return a


def rc_starsilt(a):
    """green slime -> deep indigo jelly; the yellow veins -> faint lavender currents; the yellow eyes -> gold stars"""
    m, L, C, h = lch_img(a)
    yel = m & (h > 70) & (h < 140) & (C > 0.08) & (L > 0.62)
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
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
    a = gmap(a, body, [(0.0, 'ink:1'), (0.22, 'ink:2'), (0.46, 'ink:3'), (0.68, 'cloth_blue:3'), (0.86, 'ink:4'),
                       (1.0, 'cloth_blue:4')], gamma=0.8)
    a = gmap(a, veins, [(0.0, 'ink:3'), (1.0, 'ink:4')])
    a = gmap(a, eyes, [(0.0, 'gold:4'), (1.0, 'gold:5')])
    _STARS['starsilt'] = eyes
    return a


_STARS = {}


def rc_shade(a, horizon=0.46):
    """white-blue ghost -> night indigo above the horizon, pale dusk gold below it; the cyan eyes -> pale star blue"""
    m, L, C, h = lch_img(a)
    glow = m & (h > 170) & (h < 250) & (C > 0.1) & (L > 0.68)
    H, W = a.shape[:2]
    ys = np.mgrid[0:H, 0:W][0]
    hy = int(round(H * horizon))
    up = m & ~glow & (ys < hy)
    dn = m & ~glow & (ys >= hy)
    a = gmap(a, up, [(0.0, 'shadow:0'), (0.16, 'ink:0'), (0.34, 'ink:1'), (0.54, 'ink:2'), (0.76, 'ink:3'), (1.0, 'cloth_blue:3')],
             gamma=1.4)
    a = gmap(a, dn, [(0.0, 'wood:0'), (0.16, 'wood:2'), (0.34, 'wood:3'), (0.52, 'gold:2'), (0.72, 'gold:3'), (0.88, 'path:4'),
                     (1.0, 'sand:3')], gamma=1.1)
    a = gmap(a, glow, [(0.0, 'ice:2'), (1.0, 'ice:3')])
    # the horizon: a bright line across the body, a warm glow under it
    row = m[hy]
    a[hy, row, :3] = col('gold:5')
    a[hy + 1, m[hy + 1], :3] = col('gold:4')
    a[hy - 1, m[hy - 1] & (L[hy - 1] < 2), :3] = col('cloth_blue:3')
    return a


HUSK_STRIPS = [(20, 8, 34, 37), (38, 34, 48, 68), (62, 8, 72, 40), (68, 42, 78, 64), (0, 46, 6, 66)]


def rc_husk(a):
    """brown stone blocks -> pale sandstone (lighter than the tome golem); its cream bands -> lapis; the gold core is
    replaced by the hourglass in finish()"""
    m, L, C, h = lch_img(a)
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    near = np.hypot(xs - W * 0.6, ys - H * 0.3) < H * 0.12
    core = m & (h > 60) & (h < 110) & (C > 0.12) & (L > 0.72) & near
    # the hanging cream strips: their colour overlaps the stone's lit faces, so they are found inside hand boxes (cut
    # pixels at 88 px, painting orientation) and by their yellow
    box = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in HUSK_STRIPS:
        box[y0:y1, x0:x1] = True
    band = ndi.binary_closing(m & box & (h > 74) & (C > 0.055) & (L > 0.46), iterations=1) & m & box & ~core
    stone = m & ~core & ~band
    a = gmap(a, stone, [(0.0, 'shadow:1'), (0.12, 'stone_warm:1'), (0.28, 'earth:2'), (0.44, 'path:1'), (0.6, 'path:2'),
                        (0.76, 'path:3'), (0.9, 'sand:2'), (1.0, 'sand:3')], gamma=0.8)
    a = gmap(a, band, [(0.0, 'cloth_blue:1'), (0.45, 'cloth_blue:2'), (0.8, 'cloth_blue:3'), (1.0, 'cloth_blue:4')])
    a = gmap(a, core, [(0.0, 'gold:3'), (1.0, 'gold:4')])
    return a


def rc_knight(a, night=False):
    """silver plate -> sun-bronze (the Double: indigo); the blue cape -> sandstone (the Double: deep blue); the gold trim
    -> bright gold (the Double: silver); the blue glow (blade, visor) -> sun gold (the Double: star blue)"""
    m, L, C, h = lch_img(a)
    cape = consolidate(m & (h > 230) & (h < 300) & (C > 0.07) & (L < 0.62), m)
    gold = m & (h > 50) & (h < 110) & (C > 0.06)
    glow = m & (h > 170) & (h < 270) & (C > 0.06) & (L > 0.62)
    rest = m & ~cape & ~gold & ~glow
    if not night:
        a = gmap(a, rest, [(0.0, 'shadow:0'), (0.12, 'wood:0'), (0.25, 'wood:1'), (0.4, 'wood:2'), (0.55, 'wood:3'),
                           (0.7, 'wood:4'), (0.84, 'wood:5'), (1.0, 'gold:4')], gamma=0.9)
        a = gmap(a, cape, [(0.0, 'shadow:0'), (0.25, 'stone_warm:1'), (0.5, 'stone_warm:2'), (0.75, 'path:2'), (1.0, 'path:3')])
        a = gmap(a, gold, [(0.0, 'gold:2'), (0.5, 'gold:4'), (1.0, 'gold:5')])
        a = gmap(a, glow, [(0.0, 'fire:3'), (0.5, 'fire:4'), (1.0, 'fire:5')])
    else:
        a = gmap(a, rest, [(0.0, 'shadow:0'), (0.15, 'ink:0'), (0.3, 'ink:1'), (0.48, 'ink:2'), (0.66, 'ink:3'),
                           (0.84, 'cloth_blue:3'), (1.0, 'ink:4')], gamma=0.95)
        a = gmap(a, cape, [(0.0, 'shadow:0'), (0.3, 'roof_blue:0'), (0.65, 'roof_blue:1'), (1.0, 'roof_blue:2')])
        a = gmap(a, gold, [(0.0, 'stone_cool:3'), (0.5, 'metal:2'), (1.0, 'metal:4')])
        a = gmap(a, glow, [(0.0, 'ice:1'), (0.5, 'ice:2'), (1.0, 'ice:3')])
    return a


SPECS = {
    'dune_stalker': dict(cell=2, h=60, k=16, rc=rc_stalker, flip=True, eyes=[(93, 233)], eye_col='gold:5'),
    'dune_scarab': dict(cell=3, h=50, k=16, rc=rc_scarab, flip=True),
    'dust_harrier': dict(cell=6, h=70, k=16, rc=rc_harrier, keep=0.03, dist=30),
    'silt_reaver': dict(cell=1, h=72, k=14, rc=rc_reaver, eyes=[(230, 68), (240, 68)], eye_col='ice:3'),
    'starsilt': dict(cell=0, h=48, k=14, rc=rc_starsilt),
    'horizon_shade': dict(cell=7, h=84, k=14, rc=rc_shade, lift='shadow'),
    'tomorrow_husk': dict(cell=4, h=88, k=16, rc=rc_husk),
    'mirage_knight': dict(cell=5, h=96, k=18, rc=rc_knight, flip=True, keep=0.05, dist=20),
    'mirage_double': dict(cell=5, h=86, k=18, rc=lambda a: rc_knight(a, night=True), flip=True, keep=0.05, dist=20),
}


def make(eid, src):
    spec = SPECS[eid]
    obj = main_object(grid_cell(src, 4, 2, spec['cell']), keep_frac=spec.get('keep', 0.04), max_dist=spec.get('dist', 40))
    tw, th = fit_size(obj, th=spec['h'])
    d, _ = pixelize2(obj, tw, th, k=spec['k'], sharpen=0.0, max_de=0.10, ring=False)
    face = shield_src(d) if eid in ('mirage_knight', 'mirage_double') else None
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
            put(big, x, y, spec['eye_col'])
            if eid == 'dune_stalker':
                put(big, x - 1, y, 'gold:4')
                put(big, x - 1, y - 1, 'shadow:0'); put(big, x, y - 1, 'shadow:0'); put(big, x, y + 1, 'shadow:0')
    if face is not None:
        fb = np.zeros(big.shape[:2], bool)
        fb[1:-1, 1:-1] = face
        _FACE[eid] = ndi.binary_erosion(fb[:, ::-1] if spec.get('flip') else fb, iterations=1)
    if spec.get('flip'):
        big = flip_x(big)
    return finish(eid, big)


# ----------------------------------------------------------------------------- hand edits
def star_specks(a, n=14, seed=5, cross=3):
    """white and gold star specks in the jelly's interior; the first `cross` are small four-point stars"""
    rng = np.random.RandomState(seed)
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    inner = ndi.binary_erosion(al, iterations=3)
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    inner &= lab[..., 0] < 0.5                        # not on the eyes or the lit top
    ys, xs = np.nonzero(inner)
    if not len(ys):
        return a
    placed = []
    for i in rng.permutation(len(ys)):
        y, x = ys[i], xs[i]
        if any(abs(x - px) < 5 and abs(y - py) < 4 for px, py in placed):
            continue
        k = len(placed)
        if k < cross:
            put(a, x, y, 'metal:4')
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put(a, x + dx, y + dy, 'cloth_blue:4')
        else:
            put(a, x, y, 'metal:4' if k % 3 else 'gold:4')
        placed.append((x, y))
        if len(placed) >= n:
            break
    return a


HOURGLASS = ['kkkkkkkkk',
             'kYYYYYYYk',
             '.kIiiiIk.',
             '.kiSSSik.',
             '..kiSik..',
             '...kSk...',
             '...kSk...',
             '..kiSik..',
             '.kiiSiik.',
             '.kiSSSik.',
             'kYYYYYYYk',
             'kkkkkkkkk']


def hourglass(a, cx, cy):
    """the husk's heart: an hourglass in a dark socket, gold frame, pale glass, gold sand running"""
    H, W = a.shape[:2]
    for y in range(int(cy - 8), int(cy + 9)):
        for x in range(int(cx - 7), int(cx + 8)):
            if 0 <= y < H and 0 <= x < W and a[y, x, 3] > 0.5 and np.hypot((x - cx) / 7.0, (y - cy) / 8.5) <= 1.0:
                a[y, x, :3] = col('shadow:0')
    leg = {'k': 'wood:0', 'Y': 'gold:4', 'I': 'ice:3', 'i': 'water:3', 'S': 'gold:5'}
    return stamp(a, HOURGLASS, leg, int(cx) - 4, int(cy) - 6)


def sand_streams(a, starts, seed=2, length=13):
    """sand pouring from the sleeves: thin broken columns of grains below each (x, y) start, sparser as they fall"""
    rng = np.random.RandomState(seed)
    H, W = a.shape[:2]
    for (x0, y0) in starts:
        x = x0
        for i in range(length):
            y = y0 + i
            if y >= H:
                break
            if i > 3 and rng.rand() < 0.18 + i * 0.03:
                continue
            if i and i % 4 == 0:
                x += rng.choice([-1, 0, 0, 1])
            if 0 <= x < W and a[y, x, 3] < 0.5:
                a[y, x, :3] = col('sand:2' if i % 3 else 'sand:3'); a[y, x, 3] = 1
    return a


def find_drops(a, box):
    """the lowest opaque pixel of each column inside box (x0, y0, x1, y1), as (x, y + 1) starts for falling sand,
    every third column"""
    x0, y0, x1, y1 = box
    out = []
    for x in range(x0, x1, 3):
        col_ = a[y0:y1, x, 3] > 0.5
        if col_.any():
            out.append((x, y0 + int(np.nonzero(col_)[0].max()) + 1))
    return out


def shield_src(d):
    """the crystal face of the painted mirror shield, found on the quantized cut BEFORE the recolour (the recolour makes
    the plate and the face one bronze): the light, cool pixels inside the warden recipe's shield polygon (drawn on the
    flipped frame, scaled to the frame height), mirrored back into the painting's orientation"""
    from PIL import Image, ImageDraw
    H, W = d.shape[:2]
    Hb, Wb = H + 2, W + 2
    k = Hb / 98.0
    pts = [(15, 6), (48, 6), (48, 50), (32, 78), (15, 50)]
    im = Image.new('L', (Wb, Hb), 0)
    ImageDraw.Draw(im).polygon([(x * k, y * k) for x, y in pts], fill=255)
    poly = (np.asarray(im) > 0)[:, ::-1][1:-1, 1:-1]
    m, L, C, h = lch_img(d)
    warm = (h > 40) & (h < 120) & (C > 0.05)
    face = poly & m & ~warm & (L > 0.42)
    face = ndi.binary_closing(face, iterations=2) & poly & m & ~warm
    face = ndi.binary_fill_holes(face)
    face = ndi.binary_opening(face, iterations=1)
    lab, n = ndi.label(face)
    if n:
        sz = ndi.sum(face, lab, range(1, n + 1))
        face = lab == int(np.argmax(sz)) + 1
    return face


_FACE = {}


BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def ramp_at(ramp, t, x, y):
    """an ordered-dither pick along a list of refs: t in 0..1, so the bands meet in a 4x4 Bayer blend, not a hard step"""
    f = t * (len(ramp) - 1)
    i = int(f)
    return ramp[min(len(ramp) - 1, i + (1 if (f - i) > BAYER[y % 4, x % 4] else 0))]


def paint_horizon(a, face, night):
    """a sea horizon in the shield: the sky the Knight is not (night: indigo, stars, a moon) or the Double's day (pale
    sky, a sun); the horizon line, then the sea darkening toward the shield's point with wave lines, and the light's
    path broken into dashes down it"""
    if not face.any():
        return a
    ys, xs = np.nonzero(face)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    hy = int(round(y0 + (y1 - y0) * 0.5))
    cx = int(round(x0 + (x1 - x0) * 0.5))
    if night:
        sky = ['ink:1', 'ink:2', 'ink:3', 'roof_blue:2', 'roof_blue:3']
        sea = ['roof_blue:2', 'water:1', 'water:0']
        wave = 'roof_blue:3'
        disc = ('metal:4', 'ice:3')
        glint = ('ice:3', 'ice:2')
        line = 'ice:2'
    else:
        sky = ['water:3', 'water:4', 'ice:2', 'ice:3']
        sea = ['water:3', 'water:2', 'water:1']
        wave = 'water:4'
        disc = ('gold:4', 'fire:3')
        glint = ('gold:5', 'gold:4')
        line = 'metal:4'
    for y, x in zip(ys, xs):
        if y < hy:
            ref = ramp_at(sky, (y - y0) / max(1, hy - 1 - y0), x, y)
        elif y == hy:
            ref = line
        else:
            t = (y - hy - 1) / max(1, y1 - hy - 1)
            ref = ramp_at(sea, t, x, y)
            if (y - hy) % 3 == 0 and (x * 3 + y) % 7 < 3:
                ref = wave
        put(a, x, y, ref)
    # the disc rises out of the horizon
    r = max(2.5, (x1 - x0) * 0.12)
    dcy = hy - r * 0.35
    for y in range(int(dcy - r - 1), hy):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = np.hypot(x + 0.5 - cx, y + 0.5 - dcy)
            if d <= r and 0 <= y < a.shape[0] and 0 <= x < a.shape[1] and face[y, x]:
                put(a, x, y, disc[0] if (x + 0.5 - cx) + (y + 0.5 - dcy) < r * 0.4 else disc[1])
    # the light's path: dashes on every other row, wider and sparser toward the viewer
    for y in range(hy + 1, y1 + 1, 2):
        k = (y - hy) // 2
        span = 1 + k // 2
        for x in range(cx - span, cx + span + 1):
            if 0 <= x < a.shape[1] and face[y, x] and (x - cx + k) % 3 != 2:
                put(a, x, y, glint[0] if abs(x - cx) <= span // 2 else glint[1])
    # the shield's own rim round the painting: lit gold on the upper left, dark gold on the lower right
    ring = ndi.binary_dilation(face, iterations=1) & ~face & (a[..., 3] > 0.5) & ~edge_mask(a)
    ry, rx = np.nonzero(ring)
    for y, x in zip(ry, rx):
        lit = (y > 0 and face[y - 1, x]) is False and ((x + 1 < a.shape[1] and face[y, x + 1]) or (y + 1 < a.shape[0] and face[y + 1, x]))
        put(a, x, y, ('gold:4' if lit else 'gold:2') if night else ('metal:3' if lit else 'stone_cool:3'))   # the Knight gold, the Double silver
    rng = np.random.RandomState(9 if night else 10)
    yy = np.mgrid[0:a.shape[0], 0:a.shape[1]][0]
    if night:
        sy, sx = np.nonzero(face & (yy < hy - r * 1.6))
        placed = []
        for i in rng.permutation(len(sy)):
            if any(abs(sx[i] - px) < 4 and abs(sy[i] - py) < 3 for px, py in placed):
                continue
            put(a, sx[i], sy[i], 'metal:4' if len(placed) % 2 else 'ice:3')
            placed.append((sx[i], sy[i]))
            if len(placed) >= 7:
                break
    else:
        gy = int(y0 + (hy - y0) * 0.35)
        for (dx, dy) in ((-2, 0), (-1, -1), (1, -1), (2, 0)):
            put(a, cx + int(r) + 4 + dx, gy + dy, 'ink:2')
    return a


def hood_eyes(a, ref=('ice:3', 'water:4')):
    """two star-blue eyes in the hood's dark void (the largest dark component in the head box)"""
    H, W = a.shape[:2]
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    box = np.zeros((H, W), bool)
    box[int(H * 0.02):int(H * 0.32), int(W * 0.4):int(W * 0.85)] = True
    dark = box & (lab[..., 0] < 0.3) & (a[..., 3] > 0.5) & ~edge_mask(a)
    lb, n = ndi.label(dark)
    if not n:
        return a
    sz = ndi.sum(dark, lb, range(1, n + 1))
    ys, xs = np.nonzero(lb == int(np.argmax(sz)) + 1)
    cx = int(round(xs.mean()))
    ey = int(ys.min() + max(2, (ys.max() - ys.min()) * 0.45))
    for x in (cx - 2, cx + 1):
        put(a, x, ey, ref[0]); put(a, x + 1, ey, ref[0]); put(a, x, ey + 1, ref[1])
    return a


def finish(eid, a):
    """per-foe hand edits on the right-facing base, then the contrast rule (dark outline, side rim)"""
    H, W = a.shape[:2]
    if eid == 'starsilt':
        a = star_specks(a)
    if eid == 'silt_reaver':
        a = hood_eyes(a)
    if eid == 'tomorrow_husk':
        a = hourglass(a, 53, 27)
    if eid in ('mirage_knight', 'mirage_double'):
        a = paint_horizon(a, _FACE[eid] & (a[..., 3] > 0.5) & ~edge_mask(a), night=(eid == 'mirage_knight'))
    a = contrast(a, SIDE[eid])
    if eid == 'silt_reaver':
        a = sand_streams(a, find_drops(a, (2, int(H * 0.1), int(W * 0.34), int(H * 0.45))) +
                         find_drops(a, (int(W * 0.72), int(H * 0.3), W - 1, int(H * 0.6))))
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
def pack5(eid, base, raw):
    """anim_frames._pack with a desert death: the dissolve front runs gold and the drifting flakes are sand"""
    ox, oy = AF.origin_of(base)
    out = {}
    for n, v in raw.items():
        img, dox = (v if isinstance(v, tuple) else (v, 0))
        out[n] = (img, ox + dox, oy)
    seed = sum(ord(c) for c in eid) * 13 + 7
    for i, lv in enumerate(AF.DIE_LEVELS):
        out[f'die_{i}'] = (AF.dissolve(AF.canvas(base), lv, seed, edge='gold:4', ash='sand:2'), ox, oy)
    return out


def remap_violet(c, ramp):
    """recipes that glow violet or cyan (the Episode 1 ink wraith, the page wraith): re-map those light pixels onto
    the foe's own ramp"""
    c, dox = (c if isinstance(c, tuple) else (c, 0))
    m, L, C, h = lch_img(c)
    hot = m & (((h > 240) & (h < 345)) | ((h > 170) & (h < 240))) & (C > 0.06) & (L > 0.6)
    c = gmap(c, hot, ramp)
    return (c, dox)


GOLD_GLOW = [(0.0, 'gold:3'), (0.5, 'gold:4'), (1.0, 'gold:5')]
STAR_GLOW = [(0.0, 'ice:1'), (0.5, 'ice:2'), (1.0, 'ice:3')]


def knight_scaled(img, k):
    """ep2's f_knight with the warden recipe's coordinates scaled by k (the Double is a smaller cut)"""
    from ep2_enemies import f_knight
    S0 = AF.WARDEN
    sc = lambda p: (int(round(p[0] * k)), int(round(p[1] * k)))
    S = dict(S0, shield=tuple(int(round(v * k)) for v in S0['shield']), shield_poly=[sc(p) for p in S0['shield_poly']],
             hand=sc(S0['hand']), tip=sc(S0['tip']), hilt=tuple(int(round(v * k)) for v in S0['hilt']),
             seam=int(round(S0['seam'] * k)), visor=tuple(int(round(v * k)) for v in S0['visor']))
    AF.WARDEN = S
    try:
        raw = f_knight(img, dy=0, prefer=('shadow', 'ink', 'wood', 'gold', 'cloth_blue', 'stone_warm'))
        f, dox = AF.warden(img, None, 'cast')
        raw['cast'] = (f, dox)
    finally:
        AF.WARDEN = S0
    return raw


def derived(eid, img):
    from ep2_enemies import f_mercury
    import ep3_enemies as E3
    H, W = img.shape[:2]
    if eid == 'dune_stalker':
        from hollow_enemies import f_wolf
        raw = f_wolf(img, 1.0, 0, 0, prefer=('shadow', 'wood', 'gold', 'roof_red'))
    elif eid == 'dune_scarab':
        raw = AF.f_moss_scarab(img, prefer=('shadow', 'wood', 'gold', 'cloth_blue'))
    elif eid == 'dust_harrier':
        raw = E3.f_specter(img)
        c = raw['cast']
        c, dox = (c if isinstance(c, tuple) else (c, 0))
        m, L, C, h = lch_img(c)
        # the ember of the cast recipe becomes a hot gold dust devil in the chest and talons
        raw['cast'] = (gmap(c, m & (h < 70) & (C > 0.1) & (L > 0.5), GOLD_GLOW), dox)
    elif eid == 'silt_reaver':
        raw = AF.f_page_wraith(img)
        raw['cast'] = remap_violet(raw['cast'], STAR_GLOW)
    elif eid == 'starsilt':
        raw = AF.f_ink_slime(img)
        raw['hurt'] = AF.edge_lift(AF.lean(AF.canvas(img), 40, -2, taper=14), 2, prefer=('ink', 'shadow', 'cloth_blue'))
        a = AF.canvas(img)
        m, L, C, h = lch_img(a)
        f = AF.glow(a, m & (L > 0.62), 'ice', 0.55, 2)
        raw['cast'] = AF.sparkles(f, [(int(W * 0.5), -3, 2), (int(W * 0.25), 1, 1), (int(W * 0.75), -1, 2), (int(W * 0.4), -7, 1)],
                                  ['metal:4', 'gold:4', 'ice:3'])
    elif eid == 'horizon_shade':
        raw = dict(AF.f_ink_wraith(img))
        raw['cast'] = remap_violet(raw['cast'], STAR_GLOW)
    elif eid == 'tomorrow_husk':
        raw = AF.f_tome_golem(img)
    elif eid == 'mirage_knight':
        raw = knight_scaled(img, 1.0)
        raw['cast'] = remap_violet(raw['cast'], GOLD_GLOW)
    elif eid == 'mirage_double':
        raw = knight_scaled(img, H / 98.0)
        raw['cast'] = remap_violet(raw['cast'], STAR_GLOW)
    else:
        raw = {}
    return pack5(eid, img, raw)


CASTERS = ('dust_harrier', 'silt_reaver', 'starsilt', 'horizon_shade', 'mirage_knight', 'mirage_double')


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


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep5'), exist_ok=True)
    b = base()
    for bg, tag in (((228, 196, 140), 'sand'), ((18, 16, 40), 'night')):
        contact(list(b.items()), os.path.join(OUT, 'ep5', f'enemies_base_3x_{tag}.png'), scale=3, cols=5, bg=bg,
                title='Episode 5 foes (base) at 3x')
