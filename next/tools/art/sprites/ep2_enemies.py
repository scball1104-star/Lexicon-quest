"""Episode 2 foes with their own battle frames (E2-sprites): the Fading Road and the Court of Mirrors.

Every painted foe is cut from ../assets/art/enemies.png (4x2 grid), area-downscaled at 1x straight from the
painting (no non-integer scaling), recoloured per material with gradient maps onto master ramps, then put
through the shared cleanup (master-palette snap, near-duplicate merge, despeckle, ramp-darkest outline) and
hand edits (eyes, glints, a crown, a blank visor):

  mist_wolf        cell 2 at 60 px in the painting's own silver-grey (Episode 1 never shipped it): pale fur,
                   a cold blue mane fading to mist, gold eyes
  glassback        cell 3 at 50 px: shell of silverglass (ice-blue panes, white specular), steel legs, cyan eye
  quicksilver      cell 0 at 48 px: liquid mercury (metal ramp), dark mirror eyes with a white catch-light
  quicksilver_bead cell 0 at 26 px, its own small 1x frame (the split child)
  glint_wisp       cell 1 at 56 px: pale silver-lilac rags, white-lilac eyes, glints in the hem
  glass_sentinel   cell 4 at 88 px: slate blocks, glass ribbons, a silverglass core that glows cyan
  borrowed_shadow  cell 1 at 72 px: violet-black, silver eyes, rim-lit for the dark Court
  faceless_knight  cell 5 at 96 px: slate and black plate, a blank visor, a black cape, a dark tower shield
  false_sorrow     cell 7 at 84 px in the painting's own icy white-blue (the weeping phantom)
  false_pride      cell 5 at 96 px: gold and white plate, a white cape, a gold crown
  shard_swarm      hand-pixeled: six glass shards in a loose ring (lost_page frames as the motion base)

Derived frames (idle_1, attack, hurt, cast for casters, die_0..2) reuse the Episode 1 recipes of each foe's
kin from anim_frames.py, so every Episode 2 foe moves like its Episode 1 counterpart.

    base()                 -> {id: rgba}               facing RIGHT, origin bottom-centre
    atlas_frames()         -> [(name, rgba, ox, oy)]   base + derived, for anim_atlas.append
"""
import numpy as np
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import cleanup as CL
import anim_frames as AF
from hollow_enemies import consolidate, col, pad_top, outline_new


def gmap(a, mask, stops, gamma=1.0, snap=False):
    """gradient map of the masked pixels by OKLab lightness, stretched over their own 2..99 percentile;
    gamma < 1 pushes the material lighter (mercury, pale rags)"""
    out = a.copy()
    sel = mask & (a[..., 3] > 0.5)
    if not sel.any():
        return out
    lab = to_oklab(a[sel][:, :3])
    L = lab[:, 0]
    lo, hi = np.percentile(L, 2), np.percentile(L, 99)
    t = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1) ** gamma
    ts = np.array([s[0] for s in stops], np.float32)
    if snap:
        # every pixel takes the stop nearest its t: exact master colours, no in-between greys to snap astray
        idx = np.argmin(np.abs(t[:, None] - ts[None, :]), 1)
        out[sel, :3] = np.array([col(s[1]) for s in stops], np.float32)[idx]
        return out
    labs = to_oklab(np.array([col(s[1]) for s in stops], np.float32))
    o = np.stack([np.interp(t, ts, labs[:, i]) for i in range(3)], -1)
    out[sel, :3] = np.clip(from_oklab(o), 0, 1)
    return out

IDS = ['mist_wolf', 'glassback', 'quicksilver', 'quicksilver_bead', 'glint_wisp', 'glass_sentinel',
       'borrowed_shadow', 'faceless_knight', 'false_sorrow', 'false_pride', 'shard_swarm']
CASTERS = ('glint_wisp', 'borrowed_shadow', 'false_sorrow', 'quicksilver')


def lch_img(a):
    m = a[..., 3] > 0.5
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(a.shape[:2] + (3,))
    L = lab[..., 0]
    C = np.hypot(lab[..., 1], lab[..., 2])
    h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    return m, L, C, h


def hue_mask(a, lo, hi, cmin=0.06, lmin=0.0, lmax=1.1):
    m, L, C, h = lch_img(a)
    if lo <= hi:
        hm = (h >= lo) & (h < hi)
    else:
        hm = (h >= lo) | (h < hi)
    return m & hm & (C > cmin) & (L >= lmin) & (L <= lmax)


# ----------------------------------------------------------------------------- recolours (on the quantized cut)
def rc_mist(a):
    """silver-grey fur stays near the painting; the saturated blue mane cools and pales toward mist"""
    m, L, C, h = lch_img(a)
    blue = consolidate(m & (h > 200) & (h < 320) & (C > 0.06), m)
    gold = m & (h > 55) & (h < 110) & (C > 0.08)
    blue &= ~gold
    fur = m & ~blue & ~gold
    a = gmap(a, fur, [(0.0, 'shadow:1'), (0.14, 'shadow:2'), (0.3, 'stone_cool:2'), (0.48, 'stone_cool:3'),
                      (0.66, 'stone_cool:4'), (0.84, 'stone_cool:5'), (1.0, 'metal:3')])
    a = gmap(a, blue, [(0.0, 'water:1'), (0.22, 'water:2'), (0.45, 'water:3'), (0.68, 'water:4'),
                       (0.86, 'ice:2'), (1.0, 'ice:3')], gamma=0.85)
    a = gmap(a, gold, [(0.0, 'gold:1'), (0.5, 'gold:3'), (1.0, 'gold:4')])
    return a


def rc_glassback(a):
    """green shell -> silverglass panes (deep water to ice white), gold legs and horns -> cold steel"""
    m, L, C, h = lch_img(a)
    green = consolidate(m & (h > 110) & (h < 200) & (C > 0.05), m)
    rest = m & ~green
    a = gmap(a, green, [(0.0, 'water:1'), (0.2, 'water:2'), (0.42, 'water:3'), (0.64, 'water:4'),
                        (0.84, 'ice:2'), (1.0, 'ice:3')], gamma=0.8)
    a = gmap(a, rest, [(0.0, 'shadow:1'), (0.18, 'stone_cool:1'), (0.4, 'stone_cool:2'), (0.62, 'stone_cool:3'),
                       (0.82, 'stone_cool:4'), (1.0, 'metal:2')])
    return a


def rc_quick(a, eye_box):
    """green slime -> liquid mercury; the yellow eyes and grin become dark mirror pools; veins -> pale glints"""
    m, L, C, h = lch_img(a)
    H, W = a.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    x0, y0, x1, y1 = eye_box
    in_eye = (xs >= x0 * W) & (xs < x1 * W) & (ys >= y0 * H) & (ys < y1 * H)
    yel = m & (h > 95) & (h < 140) & (C > 0.08)
    eyes = yel & in_eye
    veins = yel & ~in_eye
    body = m & ~yel
    a = gmap(a, body, [(0.0, 'stone_cool:1'), (0.16, 'stone_cool:2'), (0.34, 'stone_cool:3'), (0.52, 'stone_cool:4'),
                       (0.7, 'stone_cool:5'), (0.84, 'metal:2'), (0.94, 'metal:3'), (1.0, 'metal:4')], gamma=0.62)
    a = gmap(a, eyes, [(0.0, 'ink:1'), (0.6, 'ink:2'), (1.0, 'water:1')])
    a = gmap(a, veins, [(0.0, 'stone_cool:4'), (0.6, 'metal:2'), (1.0, 'metal:3')])
    return a


def rc_wisp(a):
    """purple rags -> pale silver-lilac; the blue eyes -> white-lilac glow"""
    m, L, C, h = lch_img(a)
    eye = m & (h > 220) & (h < 275) & (C > 0.13) & (L > 0.5)
    body = m & ~eye
    a = gmap(a, body, [(0.0, 'ink:2'), (0.12, 'ink:3'), (0.26, 'stone_cool:3'), (0.42, 'ink:4'),
                       (0.58, 'stone_cool:4'), (0.72, 'cloth_purple:5'), (0.86, 'stone_cool:5'), (1.0, 'metal:3')], gamma=0.7)
    a = gmap(a, eye, [(0.0, 'magic_violet:3'), (1.0, 'metal:4')])
    return a


def rc_shadow(a):
    """purple rags -> violet-black; the blue eyes -> silver"""
    m, L, C, h = lch_img(a)
    eye = m & (h > 220) & (h < 275) & (C > 0.13) & (L > 0.5)
    body = m & ~eye
    a = gmap(a, body, [(0.0, 'ink:1'), (0.3, 'ink:1'), (0.5, 'hair_violet:2'), (0.7, 'ink:2'), (0.86, 'hair_violet:3'),
                       (1.0, 'roof_purple:3')])
    a = gmap(a, eye, [(0.0, 'metal:3'), (1.0, 'metal:4')])
    return a


def rc_sentinel(a):
    """brown stone -> slate; the cream ribbons -> silverglass; the gold core -> cyan"""
    m, L, C, h = lch_img(a)
    core = m & (h > 60) & (h < 110) & (C > 0.12) & (L > 0.72)
    ribbon = m & (L > 0.72) & ~core
    ribbon = consolidate(ribbon, m, passes=1)
    ribbon &= ~core
    stone = m & ~core & ~ribbon
    a = gmap(a, stone, [(0.0, 'shadow:0'), (0.14, 'shadow:1'), (0.3, 'shadow:2'), (0.48, 'stone_cool:2'),
                        (0.66, 'stone_cool:3'), (0.84, 'stone_cool:4'), (1.0, 'stone_cool:5')])
    a = gmap(a, ribbon, [(0.0, 'water:2'), (0.4, 'water:3'), (0.75, 'water:4'), (1.0, 'ice:2')])
    a = gmap(a, core, [(0.0, 'magic_cyan:2'), (0.5, 'magic_cyan:3'), (1.0, 'magic_cyan:4')])
    return a


def knight_masks(a):
    m, L, C, h = lch_img(a)
    cape = consolidate(m & (h > 230) & (h < 300) & (C > 0.07) & (L < 0.62), m)
    gold = m & (h > 50) & (h < 110) & (C > 0.06)
    rest = m & ~cape & ~gold
    return m, L, C, h, cape, gold, rest


def rc_knight(a):
    m, L, C, h, cape, gold, rest = knight_masks(a)
    a = gmap(a, rest, [(0.0, 'shadow:0'), (0.16, 'shadow:1'), (0.34, 'shadow:2'), (0.52, 'stone_cool:2'),
                       (0.7, 'stone_cool:3'), (0.86, 'stone_cool:4'), (1.0, 'stone_cool:5')])
    a = gmap(a, cape, [(0.0, 'shadow:0'), (0.4, 'ink:1'), (0.8, 'shadow:1'), (1.0, 'shadow:2')])
    a = gmap(a, gold, [(0.0, 'shadow:2'), (0.6, 'stone_cool:2'), (1.0, 'stone_cool:3')])
    return a


def rc_pride(a):
    m, L, C, h, cape, gold, rest = knight_masks(a)
    a = gmap(a, rest, [(0.0, 'wood:1'), (0.14, 'wood:2'), (0.3, 'wood:3'), (0.48, 'gold:2'), (0.66, 'gold:3'),
                       (0.82, 'gold:4'), (0.94, 'gold:5'), (1.0, 'metal:4')])
    a = gmap(a, cape, [(0.0, 'stone_warm:1'), (0.25, 'stone_warm:2'), (0.5, 'stone_warm:3'), (0.75, 'stone_warm:4'),
                       (0.9, 'stone_warm:5'), (1.0, 'metal:4')])
    a = gmap(a, gold, [(0.0, 'stone_warm:3'), (0.5, 'stone_warm:5'), (1.0, 'metal:4')])
    return a


SPECS = {
    'mist_wolf': dict(cell=2, h=60, k=16, rc=rc_mist, flip=True, eyes=[(93, 233)], eye_col='gold:4'),
    'glassback': dict(cell=3, h=50, k=16, rc=rc_glassback, flip=True),
    'quicksilver': dict(cell=0, h=48, k=10, rc='quick', eye_box=(0.36, 0.42, 0.7, 0.68), blur=3.0),
    'quicksilver_bead': dict(cell=0, h=26, k=8, rc='quick', eye_box=(0.36, 0.42, 0.7, 0.68), blur=4.0),
    'glint_wisp': dict(cell=1, h=56, k=14, rc=rc_wisp),
    'glass_sentinel': dict(cell=4, h=88, k=16, rc=rc_sentinel),
    'borrowed_shadow': dict(cell=1, h=72, k=14, rc=rc_shadow, eyes=[(230, 68), (240, 68)], eye_col='metal:4'),
    'faceless_knight': dict(cell=5, h=96, k=18, rc=rc_knight, flip=True, keep=0.05, dist=20),
    'false_sorrow': dict(cell=7, h=84, k=14, rc=None),
    'false_pride': dict(cell=5, h=96, k=18, rc=rc_pride, flip=True, keep=0.05, dist=20),
}


def make(eid, src):
    spec = SPECS[eid]
    obj = main_object(grid_cell(src, 4, 2, spec['cell']), keep_frac=spec.get('keep', 0.04),
                      max_dist=spec.get('dist', 40))
    tw, th = fit_size(obj, th=spec['h'])
    if spec.get('blur'):
        obj = soften(obj, spec['blur'])
    d, _ = pixelize2(obj, tw, th, k=spec['k'], sharpen=0.0, max_de=0.10, ring=False)
    rc = spec['rc']
    if rc == 'quick':
        d = rc_quick(d, spec['eye_box'])
    elif rc is not None:
        d = rc(d)
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 6 if th > 30 else 3)
    big = CL.ramp_outline(big)
    if spec.get('eyes'):
        oh, ow = obj.shape[:2]
        ec = col(spec['eye_col'])
        dark = col('ink:0')
        for sx, sy in spec['eyes']:
            x = int(round(sx * tw / ow)) + 1
            y = int(round(sy * th / oh)) + 1
            big[y, x, :3] = ec; big[y, x, 3] = 1
            if spec.get('brow', True) and eid.endswith('wolf'):
                big[y, x - 1, :3] = ec * 0.8; big[y, x - 1, 3] = 1
                big[y - 1, x - 1:x + 1, :3] = dark
                big[y + 1, x, :3] = dark
    if spec.get('flip'):
        big = flip_x(big)
    return finish(eid, big)


def soften(obj, r):
    """premultiplied gaussian blur of the painting (mercury reads smooth, not bubbled); alpha kept"""
    from PIL import Image, ImageFilter
    rgb = obj[..., :3] * obj[..., 3:4]
    im = Image.fromarray((np.clip(np.concatenate([rgb, obj[..., 3:4]], -1), 0, 1) * 255).astype(np.uint8), 'RGBA')
    b = np.asarray(im.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
    out = obj.copy()
    al = np.maximum(b[..., 3:4], 1e-4)
    out[..., :3] = np.where(obj[..., 3:4] > 0, np.clip(b[..., :3] / al, 0, 1), 0)
    return out


def stamp(img, rows, legend, x0, y0, over=True, ol=None):
    """hand pixels: rows of chars ('.' = skip) mapped through legend {ch: ref}; ol: outline ref drawn on the
    transparent pixels around the new ones"""
    H, W = img.shape[:2]
    new = np.zeros((H, W), bool)
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            y, x = y0 + j, x0 + i
            if 0 <= y < H and 0 <= x < W and (over or img[y, x, 3] < 0.5):
                img[y, x, :3] = col(legend[ch]); img[y, x, 3] = 1
                new[y, x] = True
    if ol:
        img = outline_new(img, new, ol)
    return img


CROWN = ['Y...Y.Y...Y',
         'Yy.yYYYy.yY',
         'GYGGGRGGGYG',
         'gggggggggg.']
FACEPLATE = ['..aab..',
             '.aAAbb.',
             'aAAbbbc',
             'aAbbbbc',
             'aAbbbbc',
             'aAbbbbc',
             'aabbbcc',
             '.abbbc.',
             '..bcc..']


def finish(eid, a):
    """per-foe hand edits on the right-facing base"""
    if eid == 'false_pride':
        a = pad_top(a, 1)
        a[:7, 44:60] = 0                     # the helm's crest gives way to the crown
        a = stamp(a, CROWN, {'Y': 'gold:5', 'y': 'gold:4', 'G': 'gold:4', 'g': 'gold:2', 'R': 'roof_red:4'},
                  46, 4, ol='wood:0')
    elif eid == 'faceless_knight':
        a = stamp(a, FACEPLATE, {'a': 'stone_cool:5', 'A': 'metal:2', 'b': 'stone_cool:4', 'c': 'stone_cool:3'}, 49, 8)
    elif eid == 'borrowed_shadow':
        a = CL.lift_darkest(a, 'ink')
        a = CL.rim_light(a, prefer=('ink', 'hair_violet', 'shadow', 'roof_purple'), lift={'ink': 3, 'hair_violet': 3})
    return a


# ----------------------------------------------------------------------------- shard swarm (hand-built)
# six glass shards in a loose ring: (cx, cy, length, width, angle deg) on a 38 x 34 canvas; angle 0 = the
# long axis vertical, positive = clockwise. Two big, two medium, two small so the swarm never reads as a pattern.
SHARDS = [(11, 13, 13, 5.2, -22), (27, 18, 12, 5.0, 28), (19, 6, 9, 4.0, 72), (18, 27, 9, 4.0, -58),
          (5, 25, 7, 3.2, 12), (33, 6, 7, 3.2, -38)]
SW, SH = 38, 34
GLASS = dict(hi='metal:4', lit='ice:3', lit2='ice:2', mid='water:4', dark='water:3', deep='water:2', ol='water:0')


def shard(img, cx, cy, L, w, ang):
    """one crystal shard: a long diamond, widest 40% from the top tip, lit facet on the left of the axis, a white
    glint near the top, a 1 px dark outline"""
    H, W = img.shape[:2]
    t = np.radians(ang)
    ax = np.array([np.sin(t), -np.cos(t)])          # unit vector toward the top tip
    nx = np.array([np.cos(t), np.sin(t)])           # unit normal (right of the axis)
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    inside = np.zeros((H, W), bool)
    u_all = np.zeros((H, W), np.float32)
    v_all = np.zeros((H, W), np.float32)
    # supersample 4x4 for a clean edge
    acc = np.zeros((H, W), np.float32)
    for sy in range(4):
        for sx in range(4):
            px = xs + (sx + 0.5) / 4 - cx
            py = ys + (sy + 0.5) / 4 - cy
            u = px * ax[0] + py * ax[1]                 # along the axis, + toward the top tip
            v = px * nx[0] + py * nx[1]
            top, bot = L * 0.42, -L * 0.58
            half = np.where(u > 0, (top - u) / top, (u - bot) / -bot) * (w / 2)
            acc += ((u < top) & (u > bot) & (np.abs(v) < half)).astype(np.float32)
    inside = acc >= 7
    px, py = xs + 0.5 - cx, ys + 0.5 - cy
    u_all = px * ax[0] + py * ax[1]
    v_all = px * nx[0] + py * nx[1]
    for y, x in zip(*np.nonzero(inside)):
        u, v = u_all[y, x], v_all[y, x]
        lit = v < -0.15
        k = (u + L * 0.58) / L                          # 0 at the bottom tip, 1 at the top
        if lit:
            ref = GLASS['lit'] if k > 0.55 else GLASS['lit2'] if k > 0.25 else GLASS['mid']
        else:
            ref = GLASS['mid'] if k > 0.6 else GLASS['dark'] if k > 0.3 else GLASS['deep']
        img[y, x, :3] = col(ref); img[y, x, 3] = 1
    # glint: the inside pixel nearest a point 70% up the lit edge
    gx, gy = cx + ax[0] * L * 0.18 - nx[0] * w * 0.12, cy + ax[1] * L * 0.18 - nx[1] * w * 0.12
    d = np.where(inside, np.hypot(xs + 0.5 - gx, ys + 0.5 - gy), 1e9)
    y, x = np.unravel_index(np.argmin(d), d.shape)
    img[y, x, :3] = col(GLASS['hi'])
    return img, inside


def swarm(shards, W=SW, H=SH, dx=0, dy=0):
    img = blank(W, H)
    for (cx, cy, L, w, ang) in shards:
        one = blank(W, H)
        one, m = shard(one, cx + dx, cy + dy, L, w, ang)
        # outline per shard so overlapping shards separate
        p = np.pad(m, 1)
        ringm = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~m
        one[ringm, :3] = col(GLASS['ol']); one[ringm, 3] = 1
        sel = one[..., 3] > 0.5
        img[sel] = one[sel]
    return img


def shard_swarm_base():
    return swarm(SHARDS)


def shard_swarm_frames():
    """{suffix: shards list}: idle_1 (each shard drifts 1 px and turns a little, alternating), attack (the swarm
    tilts its points toward the party and surges right), hurt (scatters outward)"""
    cx0, cy0 = SW / 2, SH / 2
    idle = [(cx + (1 if i % 2 else -1) * (i % 3 == 0), cy + (1 if i % 2 == 0 else -1), L, w, a + (6 if i % 2 else -6))
            for i, (cx, cy, L, w, a) in enumerate(SHARDS)]
    attack = [(cx + 4 + (cx - cx0) * -0.2, cy + (cy - cy0) * -0.25, L, w, 60 + (a - 60) * 0.35) for (cx, cy, L, w, a) in SHARDS]
    hurt = [(cx + (cx - cx0) * 0.18 - 2, cy + (cy - cy0) * 0.18, L, w, a - 14) for (cx, cy, L, w, a) in SHARDS]
    return {'idle_1': idle, 'attack': attack, 'hurt': hurt}


_CACHE = {}


def build():
    if not _CACHE:
        src = load_src('enemies.png')
        for eid in SPECS:
            _CACHE[eid] = make(eid, src)
        _CACHE['shard_swarm'] = shard_swarm_base()
    return _CACHE


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames (W6-anim recipes)
def f_mercury(img, k):
    """anim_frames.f_ink_slime scaled by k (quicksilver k = 1, the bead about 0.56); mercury edge flare"""
    from hollow_enemies import _xf
    X, Y, R, Pt = _xf(k, 0, 0)
    I = lambda v: int(round(v))
    a = AF.canvas(img)
    H = img.shape[0]
    foot = Pt(25, H - 1)
    foot = (foot[0], AF.cp(0, H - 1)[1])
    eyes = R((18, 20, 34, 33))
    out = {}
    keep = max(2, I(5 * k))
    f = AF.xform(a, (foot[0], foot[1] + 0.5), sx=0.96, sy=1.05)
    f[AF.cy_(H - keep):] = a[AF.cy_(H - keep):]
    out['idle_1'] = f
    f = AF.xform(a, (Pt(6, 0)[0], foot[1] + 0.5), sx=1.10, sy=0.90)
    out['attack'] = AF.lean(f, I(Y(40)), max(1, I(3 * k)), taper=max(6, I(14 * k)))
    f = AF.xform(a, (foot[0], foot[1] + 0.5), sx=1.08, sy=0.88)
    f = AF.lean(f, I(Y(44)), -max(1, I(2 * k)), taper=max(6, I(14 * k)))
    out['hurt'] = AF.edge_lift(f, 2, prefer=('stone_cool', 'metal', 'shadow'))
    return out


def f_wraith(img, k, glow_ramp, glow_min_step, sparks, prefer):
    """anim_frames.f_page_wraith scaled by k with its own cast glow (the wisp, the shadow)"""
    from hollow_enemies import _xf
    X, Y, R, Pt = _xf(k, 0, 0)
    I = lambda v: int(round(v))
    a = AF.canvas(img)
    out = {}
    rags = AF.m_rect(a, R((16, 46, 70, 74)))
    arm_r = AF.m_rect(a, R((52, 22, 70, 40)))
    arm_l = AF.m_poly(a, [(X(0), Y(2)), (X(30), Y(2)), (X(30), Y(48)), (X(0), Y(48))]) & ~AF.m_rect(a, R((26, 0, 52, 24)))
    f = AF.move(a, rags, Pt(36, 44), angle=4)
    out['idle_1'] = AF.move(f, arm_r, Pt(52, 30), angle=-4)
    f = AF.move(a, arm_r, Pt(52, 30), angle=8, tx=max(2, I(4 * k)))
    out['attack'] = AF.xform(f, Pt(35, 73), angle=8)
    f = AF.xform(a, Pt(35, 73), angle=-7)
    f, dox = AF.squash(f, (I(Y(18)), I(Y(36))), (I(X(24)), I(X(46))))
    f = AF.eyes_closed(f, R((36, 6, 52, 18)), min_chroma=0.0, min_L=0.8)
    out['hurt'] = (AF.edge_lift(f, 2, prefer=prefer), dox)
    f = AF.move(a, arm_l, Pt(30, 22), ty=-2)
    f = AF.move(f, arm_r, Pt(52, 30), angle=-34)
    f = AF.glow(f, AF.m_rect(f, R((36, 0, 54, 20))) | AF.m_rect(f, R((56, 0, 80, 30))), glow_ramp, 0.62, glow_min_step)
    pts = [(I(X(40)), I(X(-4)), 2), (I(X(52)), I(X(-2)), 1), (I(X(30)), I(X(-6)), 1), (I(X(64)), I(X(2)), 2),
           (I(X(6)), 0, 1), (I(X(46)), I(X(-8)), 1)]
    out['cast'] = AF.sparkles(f, pts, sparks)
    return out


def f_sentinel(img):
    """anim_frames.f_tome_golem with a silverglass core: the core flares cyan to strike, goes dark when hit"""
    a = AF.canvas(img)
    out = {}
    arm = AF.m_rect(a, (74, 8, 91, 52))
    core = AF.accent_mask(a, (44, 18, 62, 36), min_chroma=0.06, min_L=0.55)
    out['idle_1'] = AF.rise(a, 60)
    f = AF.move(a, arm, AF.cp(79, 14), angle=-18, fill=AF.m_rect(a, (70, 16, 80, 52)))
    f = AF.rise(f, 58, -2)
    f = AF.glow(f, core, 'magic_cyan', 0.5, 4)
    out['attack'] = AF.lean(f, 62, 2, taper=16)
    f = AF.lean(a, 62, -3, taper=16)
    f, dox = AF.squash(f, (24, 44), (22, 66))
    dim = AF.accent_mask(f, (44, 20, 64, 38), min_chroma=0.06, min_L=0.55)
    f[dim, :3] = col('water:1')
    out['hurt'] = (AF.edge_lift(f, 2, prefer=('shadow', 'stone_cool', 'water', 'ice', 'magic_cyan')), dox)
    return out


def f_sorrow(img):
    """anim_frames.f_ink_wraith in ice: she weeps (cast) with a pale cyan glow and falling tear sparks"""
    a = AF.canvas(img)
    out = {}
    tails = AF.m_rect(a, (0, 52, 85, 86))
    arm_l = AF.m_rect(a, (0, 24, 40, 80)) & ~tails
    arm_r = AF.m_rect(a, (60, 20, 85, 76)) & ~tails
    out['idle_1'] = AF.move(a, tails, AF.cp(44, 50), angle=3)
    f = AF.move(a, AF.m_rect(a, (60, 20, 85, 76)), AF.cp(62, 30), angle=-16)
    out['attack'] = AF.xform(f, AF.cp(42, 85), angle=7)
    f = AF.xform(a, AF.cp(42, 85), angle=-6)
    f, dox = AF.squash(f, (22, 42), (24, 60))
    f = AF.eyes_closed(f, (42, 2, 62, 22), min_chroma=0.06, min_L=0.5)
    out['hurt'] = (AF.edge_lift(f, 2, prefer=('water', 'ice', 'stone_cool', 'metal', 'cloth_blue', 'ink')), dox)
    f = AF.move(a, arm_l, AF.cp(40, 30), angle=12, keep=True)
    f = AF.move(f, arm_r, AF.cp(60, 26), angle=-12, keep=True)
    f = AF.glow(f, AF.m_rect(f, (42, 0, 62, 22)), 'magic_cyan', 0.55, 3)
    out['cast'] = AF.sparkles(f, [(48, -4, 2), (60, -2, 1), (36, -6, 1), (78, 4, 2), (8, 6, 1), (54, -9, 1),
                                  (50, 26, 1), (56, 30, 1)], ['ice:3', 'magic_cyan:4', 'metal:4'])
    return out


def f_knight(img, dy=0, prefer=('shadow', 'stone_cool', 'ink', 'metal')):
    """anim_frames.warden (no stance) for the Faceless Knight and Pride; dy = rows added on top (Pride's crown)"""
    S0 = AF.WARDEN
    sh = lambda p: (p[0], p[1] + dy)
    h = S0['hilt']
    S = dict(S0, hand=sh(S0['hand']), tip=sh(S0['tip']), hilt=(h[0], h[1] + dy, h[2], h[3] + dy),
             seam=S0['seam'] + dy, shield_poly=[sh(p) for p in S0['shield_poly']])
    AF.WARDEN = S
    try:
        out = {}
        for pose in ('idle_1', 'attack'):
            f, dox = AF.warden(img, None, pose)
            out[pose] = (f, dox)
        # hurt: the Warden's recoil, its outline flared on the foe's own ramps (the Warden's list prefers blue)
        g = AF.lean(AF.canvas(img), S['seam'] + 2, -2, taper=18)
        g, dox = AF.squash(g, (30 + dy, 50 + dy), (24, 72))
        out['hurt'] = (AF.edge_lift(g, 2, prefer=prefer), dox)
    finally:
        AF.WARDEN = S0
    return out


def f_swarm(img):
    fr = shard_swarm_frames()
    W, H = img.shape[1] + 2 * AF.PAD, img.shape[0] + AF.PAD + AF.PADB
    out = {}
    for n, sh in fr.items():
        f = swarm(sh, W, H, AF.PAD, AF.PAD)
        if n == 'hurt':
            f = AF.edge_lift(f, 2, prefer=('water', 'ice', 'metal'))
        out[n] = f
    return out


def derived(eid, img):
    if eid == 'mist_wolf':
        from hollow_enemies import f_wolf
        raw = f_wolf(img, 1.0, 0, 0, prefer=('stone_cool', 'shadow', 'water', 'ice', 'metal'))
    elif eid == 'glassback':
        raw = AF.f_moss_scarab(img, prefer=('water', 'ice', 'stone_cool', 'shadow', 'metal'))
    elif eid in ('quicksilver', 'quicksilver_bead'):
        raw = f_mercury(img, img.shape[0] / 50.0)
    elif eid == 'glint_wisp':
        raw = f_wraith(img, img.shape[0] / 74.0, 'magic_violet', 3, ['metal:4', 'magic_violet:4', 'ice:3'],
                       ('stone_cool', 'cloth_purple', 'ink', 'metal'))
    elif eid == 'borrowed_shadow':
        raw = f_wraith(img, 1.0, 'magic_violet', 2, ['metal:4', 'magic_violet:3'],
                       ('ink', 'hair_violet', 'roof_purple', 'shadow'))
    elif eid == 'glass_sentinel':
        raw = f_sentinel(img)
    elif eid == 'faceless_knight':
        raw = f_knight(img)
    elif eid == 'false_pride':
        raw = f_knight(img, dy=1, prefer=('gold', 'wood', 'stone_warm', 'metal'))
    elif eid == 'false_sorrow':
        raw = f_sorrow(img)
    elif eid == 'shard_swarm':
        raw = f_swarm(img)
    else:
        raw = {}
    return AF._pack(eid, img, raw)


def atlas_frames():
    """[(name, rgba, ox, oy)] for anim_atlas.append: each base frame then its derived frames, in AF.ORDER"""
    out = []
    for eid, img in build().items():
        H, W = img.shape[:2]
        out.append((eid, img, W // 2, H - 1))
        fr = derived(eid, img)
        out += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    return out


def anim_sheet(path, ids=None, scale=4, bg=(40, 44, 70)):
    """one row per foe: base, then every derived frame, aligned on the origin (feet), at `scale`"""
    from PIL import Image, ImageDraw
    rows = []
    for name, img, ox, oy in atlas_frames():
        eid = next((e for e in sorted(IDS, key=len, reverse=True) if name == e or name.startswith(e + '_')), None)
        if ids and eid not in ids:
            continue
        t, tox, toy = AF.trim(img, ox, oy)
        if name == eid:
            rows.append([])
        rows[-1].append((name[len(eid) + 1:] or 'base', t, tox, toy))
    up = max(max(f[3] for f in r) for r in rows)
    down = max(max(f[1].shape[0] - f[3] for f in r) for r in rows)
    cw = max(max(max(f[2], f[1].shape[1] - f[2]) for f in r) for r in rows) * 2 + 4
    ncol = max(len(r) for r in rows)
    rh = up + down + 10
    im = Image.new('RGB', (ncol * cw * scale, len(rows) * rh * scale), bg)
    d = ImageDraw.Draw(im)
    for j, r in enumerate(rows):
        for i, (lab, t, tox, toy) in enumerate(r):
            x = i * cw + cw // 2 - tox
            y = j * rh + 8 + up - toy
            tile = upscale(t, scale)
            im.paste(tile, (x * scale, y * scale), tile)
            d.text((i * cw * scale + 3, j * rh * scale + 2), lab, fill=(230, 230, 210))
    im.save(path)


if __name__ == '__main__':
    b = base()
    contact(list(b.items()), os.path.join(OUT, 'e2', 'ep2_enemies_base_4x.png'), scale=4, cols=5, bg=(40, 44, 70),
            title='Episode 2 foes (base) at 4x')
    anim_sheet(os.path.join(OUT, 'e2', 'ep2_enemies_anim_a_3x.png'), IDS[:6], scale=3)
    anim_sheet(os.path.join(OUT, 'e2', 'ep2_enemies_anim_b_3x.png'), IDS[6:], scale=3)
