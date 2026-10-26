"""Expansion 1 foes (X1-sprites): the Wethers' Barrow and the Millrace Culvert.

Each is cut from ../assets/art/enemies.png (4x2 grid) at 1x (no non-integer scaling), recoloured per material with
gradient maps onto master ramps, put through the shared cleanup, lifted and rim-lit (CRITIQUE_2 D3 / CRITIQUE_4 item 8)
and finished with hand edits, exactly like ep3_enemies.py. Three foes, each from the cell of its Episode 1 body:

  barrow_shade     cell 1 at 72 px (the page wraith's body): pale green-white, a grandmother grown thin; a candle-green
                   lamp for eyes, rim-lit for the dark barrow stage
  barrow_reeve     cell 5 at 96 px (the Echo Warden's body): bone-white plate, moss on the cape and shoulders, a
                   shepherd's crook in place of the sword, twelve tally notches on the shield and a thirteenth blank
  millstone_golem  cell 4 at 88 px (the Tome Golem's body): granite grey, a cracked grindstone for a torso, flour dust

    base()          -> {id: rgba}               facing RIGHT, origin bottom-centre
    atlas_frames()  -> {atlas: [(name, rgba, ox, oy)]}  base + derived, for anim_atlas.append
"""
import os
import numpy as np
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import cleanup as CL
import anim_frames as AF
from hollow_enemies import consolidate, col, pad_top, outline_new
from ep2_enemies import gmap, lch_img, stamp

IDS = ['barrow_shade', 'barrow_reeve', 'millstone_golem']
BOSS_IDS = ['barrow_reeve', 'millstone_golem']
CASTERS = ('barrow_shade', 'barrow_reeve')     # the shade chills (hush), the Reeve counts: both have a cast tell


# ----------------------------------------------------------------------------- recolours
# pale green-white is not in the master palette (its greens are saturated, its whites are grey): six per-sprite
# extras, a deep teal to a green-tinged white (reported in the README's "outside the master palette" list)
SHADE_RAMP = ['#1f3b37', '#31594c', '#5a8c72', '#90bf9f', '#c2e2c8', '#e3f4e2', '#f5fcf0']


def rc_shade(a):
    """purple shroud -> pale green-white (deep teal in the folds, minty white on the lit edges); the blue eyes ->
    two soft candle-green lamps"""
    m, L, C, h = lch_img(a)
    eye = m & (h > 220) & (h < 275) & (C > 0.13) & (L > 0.5)
    body = m & ~eye
    a = gmap(a, body, [(0.0, SHADE_RAMP[0]), (0.14, SHADE_RAMP[1]), (0.3, SHADE_RAMP[2]), (0.5, SHADE_RAMP[3]),
                       (0.7, SHADE_RAMP[4]), (0.88, SHADE_RAMP[5]), (1.0, SHADE_RAMP[6])], gamma=0.85)
    a = gmap(a, eye, [(0.0, 'grass:4'), (1.0, 'grass:5')])
    return a


def knight_masks(a):
    m, L, C, h = lch_img(a)
    cape = consolidate(m & (h > 230) & (h < 300) & (C > 0.07) & (L < 0.62), m)
    gold = m & (h > 50) & (h < 110) & (C > 0.06)
    rest = m & ~cape & ~gold
    return m, L, C, h, cape, gold, rest


def rc_reeve(a):
    """silver plate -> bone white; the blue cape -> deep moss; the gold trim -> weathered bronze-green"""
    m, L, C, h, cape, gold, rest = knight_masks(a)
    a = gmap(a, rest, [(0.0, 'shadow:1'), (0.14, 'stone_warm:0'), (0.3, 'stone_warm:1'), (0.46, 'stone_warm:2'),
                       (0.64, 'stone_warm:3'), (0.82, 'stone_warm:4'), (1.0, 'stone_warm:5')], gamma=0.9)
    a = gmap(a, cape, [(0.0, 'foliage_dark:0'), (0.3, 'foliage_dark:1'), (0.6, 'foliage_dark:2'), (0.85, 'grass:1'),
                       (1.0, 'grass:2')])
    a = gmap(a, gold, [(0.0, 'foliage_dark:2'), (0.4, 'grass:1'), (0.75, 'grass:2'), (1.0, 'grass:3')])
    return a


def rc_millstone(a):
    """brown stone blocks -> granite grey; the cream bands -> flour white; the gold core -> pale ground stone"""
    m, L, C, h = lch_img(a)
    core = m & (h > 60) & (h < 110) & (C > 0.12) & (L > 0.72)
    band = consolidate(m & (L > 0.72) & ~core, m, passes=1) & ~core
    plate = m & ~core & ~band
    a = gmap(a, plate, [(0.0, 'shadow:1'), (0.14, 'shadow:2'), (0.3, 'stone_cool:2'), (0.5, 'stone_cool:3'),
                        (0.7, 'stone_cool:4'), (0.88, 'stone_cool:5'), (1.0, 'metal:2')], gamma=1.05)
    a = gmap(a, band, [(0.0, 'stone_warm:4'), (0.5, 'stone_warm:5'), (1.0, 'metal:4')])
    a = gmap(a, core, [(0.0, 'stone_warm:3'), (0.5, 'stone_warm:4'), (1.0, 'stone_warm:5')])
    return a


# rim colours: the barrow's niche light is warm green-white, the culvert's lamp is cool and wet
SHADE_RIM = dict(left='roof_green:4', top='ice:2', max_L=0.55)
REEVE_RIM = dict(left='stone_warm:3', top='stone_warm:5', max_L=0.5)
GOLEM_RIM = dict(left='stone_cool:5', top='metal:3', max_L=0.55)

SPECS = {
    'barrow_shade': dict(cell=1, h=72, k=14, rc=rc_shade, eyes=[(230, 68), (240, 68)], eye_col='grass:5', brow=False,
                         lift='roof_green', rim=SHADE_RIM),
    'barrow_reeve': dict(cell=5, h=96, k=18, rc=rc_reeve, flip=True, keep=0.05, dist=20, rim=REEVE_RIM),
    'millstone_golem': dict(cell=4, h=88, k=16, rc=rc_millstone, rim=GOLEM_RIM),
}


def make(eid, src):
    spec = SPECS[eid]
    obj = main_object(grid_cell(src, 4, 2, spec['cell']), keep_frac=spec.get('keep', 0.04),
                      max_dist=spec.get('dist', 40))
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
    big = CL.ramp_outline(big)
    if eid == 'barrow_shade':
        # the extras sit on no master ramp, so ramp_outline picked a brown for some tips: one outline for the shade
        al = big[..., 3] > 0.5
        pp = np.pad(al, 1)
        edge = al & ~(pp[:-2, 1:-1] & pp[2:, 1:-1] & pp[1:-1, :-2] & pp[1:-1, 2:])
        Lm = to_oklab(big[..., :3].reshape(-1, 3)).reshape(big.shape[:2] + (3,))[..., 0]
        big[edge & (Lm < 0.42), :3] = col(SHADE_RAMP[0])
        # and the painting's few warm specks (the mapped rags' brown tips) take the shade's mid-dark
        lab = to_oklab(big[..., :3].reshape(-1, 3)).reshape(big.shape[:2] + (3,))
        hue = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
        warm = al & (hue < 110) & (np.hypot(lab[..., 1], lab[..., 2]) > 0.03)
        big[warm, :3] = col(SHADE_RAMP[1])
    if spec.get('eyes'):
        oh, ow = obj.shape[:2]
        ec = col(spec['eye_col'])
        for sx, sy in spec['eyes']:
            x = int(round(sx * tw / ow)) + 1
            y = int(round(sy * th / oh)) + 1
            big[y, x, :3] = ec; big[y, x, 3] = 1
    if spec.get('flip'):
        big = flip_x(big)
    return finish(eid, big)


def rim(a, spec):
    """a 1 px rim light on the upper-left edges (ep3_enemies.rim): every dark outline pixel with a transparent
    neighbour above or to the left takes the foe's rim colour"""
    if spec.get('lift'):
        a = CL.lift_darkest(a, spec['lift'])
    r = spec['rim']
    a = a.copy()
    al = a[..., 3] > 0.5
    H, W = al.shape
    p = np.pad(al, 1)
    up, left = p[:-2, 1:-1], p[1:-1, :-2]
    edge = al & (~up | ~left)
    nb = sum(p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx].astype(np.int32)
             for dy in (-1, 0, 1) for dx in (-1, 0, 1)) - al.astype(np.int32)
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(H, W, 3)
    sel = edge & (nb >= r.get('min_nb', 4)) & (lab[..., 0] < r['max_L'])
    top = sel & ~up
    a[sel, :3] = col(r['left'])
    a[top, :3] = col(r['top'])
    return a


def put(a, x, y, ref):
    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]:
        a[y, x, :3] = col(ref); a[y, x, 3] = 1


def crook(a, pad, sx=74, w=4):
    """the shepherd's crook, in place of the sword: a wooden staff three pixels wide standing at the right hand, its
    hook curling over toward the party above the helm. Staff top and ground are found from the sprite."""
    H, W = a.shape[:2]
    new = np.zeros((H, W), bool)
    # ground: the lowest opaque row under the right leg
    ys = np.nonzero(a[:, 58:72, 3].max(1) > 0.5)[0]
    ground = int(ys.max()) - 1
    r = 5.5
    cx, cy = sx + w / 2 - 0.5 + r, r + 3.2          # hook ring centre and radius
    top = int(cy)
    orig = a.copy()
    for y in range(top, ground + 1):
        for i in range(w):
            ref = ('earth:4', 'earth:3', 'earth:3', 'earth:2')[i] if (y // 5 + i) % 7 else ('earth:3', 'earth:2', 'earth:2', 'earth:1')[i]
            put(a, sx + i, y, ref); new[y, sx + i] = True
    for y in range(int(cy - r - 3), int(cy + r + 3)):
        for x in range(int(cx - r - 3), int(cx + r + 4)):
            dx, dyu = x - cx, cy - y
            d = np.hypot(dx, dyu)
            ang = np.degrees(np.arctan2(dyu, dx))
            if not (ang >= -2 or (dx > 0 and ang >= -62)):
                continue
            if abs(d - r) <= 1.55:
                ring = (d - r)                       # negative = inner edge
                if ring < -0.5:
                    ref = 'earth:2'
                elif ring > 0.5:
                    ref = 'earth:4' if ang > 20 else 'earth:3'
                else:
                    ref = 'earth:3'
                put(a, x, y, ref); new[y, x] = True
    # a little lashing of green cord and two moss tufts so it belongs to the barrow
    for y in (ground - 22, ground - 21):
        for i in range(w):
            put(a, sx + i, y, 'grass:1' if y % 2 else 'grass:2')
    for (x, y) in ((sx - 1, ground - 14), (sx + w, ground - 30), (sx + w, ground - 31), (sx - 1, ground - 40)):
        put(a, x, y, 'grass:2'); new[y, x] = True
    # the fingers close over the staff: the hand's own pixels go back on top
    hand = np.zeros((H, W), bool)
    hand[pad + 46:pad + 62, 68:78] = True
    keep = hand & (orig[..., 3] > 0.5)
    a[keep] = orig[keep]
    a = outline_new(a, new, 'earth:0')
    ring = np.zeros((H, W), bool)
    p = np.pad(new, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~(orig[..., 3] > 0.5)
    staff = (new | ring) & ~keep
    return a, staff


def reeve(a):
    """edits on the right-facing base: the sword goes, the crook comes; twelve tally notches on the shield and a
    thirteenth that was never cut"""
    PAD = 12
    a = pad_top(a, PAD)
    a[44 + PAD:, 77:] = 0                          # the blade (x >= 77, below the hand)
    for r in range(3):                             # twelve notches: three rows of four, 1 px wide, 4 tall
        for c in range(4):
            x = 25 + c * 3
            for k in range(4):
                put(a, x, 38 + r * 8 + k + PAD, 'stone_warm:0')
    # the thirteenth: a shallow scratch that stops after one pixel
    put(a, 37, 54 + PAD, 'stone_warm:1')
    # the focal point (CRITIQUE_4 item 15): two small lamps in the dark of the visor, the shade's candle-green
    put(a, 51, 25, 'grass:5'); put(a, 53, 25, 'grass:5')
    return a


def grindstone(a, cx=53, cy=33, R=13.0):
    """a cracked grindstone for a torso: a pale ground-stone disc set into the chest, a dark axle hole, furrows in
    eight sectors, a crack from the rim through the hole"""
    H, W = a.shape[:2]
    for y in range(int(cy - R - 1), int(cy + R + 2)):
        for x in range(int(cx - R - 1), int(cx + R + 2)):
            dx, dy = x - cx, y - cy
            d = np.hypot(dx, dy)
            if d > R + 0.4 or a[y, x, 3] < 0.5:
                continue
            ang = (np.degrees(np.arctan2(dy, dx)) + 360) % 45
            lit = (-dx - dy) / (2 * R)                 # +1 upper-left, -1 lower-right
            if d > R - 0.6:
                ref = 'shadow:1'
            elif d > R - 2.0:
                ref = 'stone_cool:4' if lit > 0.1 else 'stone_cool:3'
            elif d < 2.3:
                ref = 'shadow:0'
            elif d < 3.4:
                ref = 'stone_cool:2'
            else:
                furrow = (ang < 2.4 or ang > 45 - 0.4) and (int(round((np.degrees(np.arctan2(dy, dx)) + 360) / 45)) % 2 == 0) and 4.2 < d < R - 2.8
                if furrow:
                    ref = 'stone_warm:2'
                elif lit > 0.35:
                    ref = 'stone_warm:5'
                elif lit > -0.1:
                    ref = 'stone_warm:4'
                else:
                    ref = 'stone_warm:3'
            put(a, x, y, ref)
    crack = [(63, 21), (62, 23), (61, 25), (59, 26), (58, 28), (57, 30), (55, 32), (54, 33), (52, 35), (51, 37), (49, 38),
             (48, 40), (47, 42), (45, 43)]
    for i, (x, y) in enumerate(crack):
        put(a, x, y, 'shadow:0')
        if i % 2 == 0:
            put(a, x - 1, y, 'shadow:1')
    for (x, y) in crack[2:9]:
        put(a, x + 1, y, 'stone_warm:5')
    return a


def flour(a, seed=5):
    """flour dust: the up-facing edges of the stone take a white dither, and a few motes hang in the air round it"""
    rng = np.random.RandomState(seed)
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    up = np.zeros_like(al)
    up[1:] = al[1:] & ~al[:-1]
    ys, xs = np.nonzero(up)
    for y, x in zip(ys, xs):
        if rng.rand() < 0.6:
            put(a, x, y, 'metal:4' if rng.rand() < 0.6 else 'stone_warm:5')
            if y + 1 < H and al[y + 1, x] and rng.rand() < 0.35:
                put(a, x, y + 1, 'stone_warm:5')
    # motes: isolated pixels in the clear just above and beside the body, never on the outline ring
    clear = ~np.pad(al, 3)[3:-3, 3:-3] if False else ~al
    placed = 0
    for _ in range(400):
        x, y = int(rng.randint(2, W - 2)), int(rng.randint(2, H - 24))
        if clear[y - 2:y + 3, x - 2:x + 3].all():
            near = al[max(0, y - 8):y + 9, max(0, x - 8):x + 9].any()
            if near:
                put(a, x, y, 'metal:3' if rng.rand() < 0.5 else 'stone_warm:4')
                placed += 1
                if placed >= 9:
                    break
    return a


def finish(eid, a):
    spec = SPECS[eid]
    if eid == 'millstone_golem':
        a = grindstone(a)
        a = flour(a)
    a = rim(a, spec)
    if eid == 'barrow_reeve':
        a = reeve(a)
        a, staff = crook(a, 12)
        _STAFF['mask'] = staff
    return a


_CACHE = {}
_STAFF = {}


def build():
    if not _CACHE:
        src = load_src('enemies.png')
        for eid in SPECS:
            _CACHE[eid] = make(eid, src)
    return _CACHE


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames (anim_frames recipes)
TALLY = [(25 + c * 3, 38 + 12 + r * 8 + k) for r in range(3) for c in range(4) for k in range(4)]
HAND = (75, 66)               # the Reeve's fist on the padded base (the crook turns about it)
DISC = (53, 33, 13.5)         # the grindstone: centre x, y and radius


def glow_to(a, mask, steps, min_L=0.6, min_step=2):
    """AF.glow onto an arbitrary list of hex or ramp refs (the shade's own green-white ramp)"""
    out = a.copy()
    lab = AF.lab_of(a)
    cols = [col(s) for s in steps]
    sl = [to_oklab(c.reshape(1, 3))[0, 0] for c in cols]
    sel = mask & AF.opaque(a) & (lab[..., 0] > min_L)
    for y, x in zip(*np.nonzero(sel)):
        j = int(np.argmin([abs(lab[y, x, 0] - s) for s in sl]))
        out[y, x, :3] = cols[max(min_step, j)]
    return out


def f_shade(img):
    """ep2_enemies.f_wraith (the page wraith's recipe, same cell and size) with a green-white cast glow: the shade
    gathers its hush; sparks are candle-green and mint"""
    from ep2_enemies import f_wraith
    raw = f_wraith(img, 1.0, 'ice', 2, ['grass:5', 'ice:3', SHADE_RAMP[5]], ('roof_green', 'stone_cool', 'ice', 'shadow'))
    a = AF.canvas(img)
    arm_l = AF.m_poly(a, [(0, 2), (30, 2), (30, 48), (0, 48)]) & ~AF.m_rect(a, (26, 0, 52, 24))
    arm_r = AF.m_rect(a, (52, 22, 70, 40))
    f = AF.move(a, arm_l, AF.cp(30, 22), ty=-2)
    f = AF.move(f, arm_r, AF.cp(52, 30), angle=-34)
    f = glow_to(f, AF.m_rect(f, (36, 0, 54, 20)) | AF.m_rect(f, (56, 0, 80, 30)), SHADE_RAMP[3:], 0.62, 1)
    raw['cast'] = AF.sparkles(f, [(40, -4, 2), (52, -2, 1), (30, -6, 1), (64, 2, 2), (6, 0, 1), (46, -8, 1)],
                              ['grass:5', SHADE_RAMP[6], 'ice:3'])
    return {k: ((greenify(v[0]), v[1]) if isinstance(v, tuple) else greenify(v)) for k, v in raw.items()}


def greenify(a, to=3):
    """edge_lift and the shared recipes reach for the nearest master ramp, and for the shade's extras that can be a brown
    or orange: any warm pixel (hue below 110, some chroma) goes onto the shade ramp (the candle-green eyes are hue 115+)"""
    a = a.copy()
    lab = to_oklab(a[..., :3].reshape(-1, 3)).reshape(a.shape[:2] + (3,))
    hue = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    warm = (a[..., 3] > 0.5) & (hue < 110) & (np.hypot(lab[..., 1], lab[..., 2]) > 0.03)
    a[warm, :3] = col(SHADE_RAMP[to])
    return a


def f_reeve(img):
    """The Reeve. The body takes the Echo Warden's moves (breathe, lean to strike, recoil) with the crook as its own
    rigid part turning about the fist: planted at rest, swung forward in the attack (the hook comes down over the
    party), thrown back when hit, raised when it counts (the tally glows, the lamps flare)."""
    stm = _STAFF['mask']
    body = np.where(stm[..., None], 0, img)
    staff = np.where(stm[..., None], img, 0)
    Bc, Sc = AF.canvas(body), AF.canvas(staff)
    hand = AF.cp(*HAND)
    SEAM = 78
    out = {}
    out['idle_1'] = AF.over(AF.rise(Bc, SEAM), Sc)
    bf = AF.lean(Bc, SEAM + 2, 4, taper=20)
    sf = AF.xform(Sc, hand, angle=44, tx=4)
    out['attack'] = AF.over(bf, sf)
    bf = AF.lean(Bc, SEAM + 2, -2, taper=18)
    sf = AF.xform(Sc, hand, angle=-8, tx=-2)
    f = AF.over(bf, sf)
    f, dox = AF.squash(f, (40 + 12, 70 + 12), (28, 60))
    f = AF.eyes_closed(f, (48, 20, 58, 30), min_chroma=0.1, min_L=0.6)
    out['hurt'] = (AF.edge_lift(f, 2, prefer=('stone_warm', 'shadow', 'foliage_dark', 'grass', 'earth')), dox)
    # cast: the Reeve counts. The crook rises a hand's breadth, the twelve notches light, the lamps flare
    bf = AF.rise(Bc, SEAM)
    for (x, y) in TALLY:
        yy, xx = y + AF.PAD, x + AF.PAD
        if bf[yy, xx, 3] > 0.5:
            bf[yy, xx, :3] = col('grass:5')
    for (x, y) in ((51, 24), (53, 24), (51, 26), (53, 26)):
        bf[y + AF.PAD, x + AF.PAD, :3] = col('grass:4'); bf[y + AF.PAD, x + AF.PAD, 3] = 1
    sf = AF.xform(Sc, hand, angle=0, ty=-3)
    f = AF.over(bf, sf)
    f = AF.sparkles(f, [(30, 4, 2), (20, 12, 1), (44, 6, 1), (36, -2, 1), (58, 4, 1), (27, 20, 1)],
                    ['grass:5', 'stone_warm:5', 'grass:4'])
    out['cast'] = f
    return out


def f_golem(img):
    """anim_frames.f_tome_golem for the Millstone Golem: the grindstone TURNS when it strikes (the disc is rotated
    22 degrees about its axle, so the furrows swing), flour bursts off the fist, and a hit knocks flour loose"""
    a = AF.canvas(img)
    cx, cy, R = DISC
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    disc = ((xx - AF.PAD - cx) ** 2 + (yy - AF.PAD - cy) ** 2) <= (R + 0.5) ** 2
    arm = AF.m_rect(a, (74, 8, 91, 52)) & ~disc
    out = {}
    out['idle_1'] = AF.rise(a, 60)
    f = AF.move(a, arm, AF.cp(79, 14), angle=-18, fill=AF.m_rect(a, (70, 16, 80, 52)))
    f = AF.rise(f, 58, -2)
    f = AF.move(f, disc & AF.opaque(f), AF.cp(cx, cy), angle=22, keep=True, fix=False)
    f = AF.lean(f, 62, 2, taper=16)
    f = AF.sparkles(f, [(86, 20, 2), (92, 26, 1), (84, 14, 1), (90, 12, 1), (80, 8, 1), (94, 18, 1)],
                    ['metal:4', 'stone_warm:5', 'stone_warm:4'])
    out['attack'] = f
    f = AF.lean(a, 62, -3, taper=16)
    f, dox = AF.squash(f, (24, 44), (22, 66))
    f = AF.sparkles(f, [(44, 10, 2), (62, 6, 1), (30, 14, 1), (70, 12, 2), (20, 30, 1), (78, 28, 1)],
                    ['metal:4', 'stone_warm:5', 'stone_warm:4'])
    out['hurt'] = (AF.edge_lift(f, 2, prefer=('stone_cool', 'shadow', 'stone_warm', 'metal')), dox)
    return out


DIE = {
    'barrow_shade': dict(edge='ice:3', ash=SHADE_RAMP[4]),
    'barrow_reeve': dict(edge='grass:5', ash='stone_warm:4'),
    'millstone_golem': dict(edge='metal:4', ash='stone_warm:4'),
}


def pack(eid, img, raw):
    """anim_frames._pack with the foe's own death colours: the shade pales, the Reeve burns candle-green and
    crumbles to bone dust, the Golem is ground to flour"""
    ox, oy = AF.origin_of(img)
    out = {}
    for n, v in raw.items():
        im, dox = (v if isinstance(v, tuple) else (v, 0))
        out[n] = (im, ox + dox, oy)
    seed = sum(ord(c) for c in eid) * 7 + 3
    for i, lv in enumerate(AF.DIE_LEVELS):
        out[f'die_{i}'] = (AF.dissolve(AF.canvas(img), lv, seed, **DIE[eid]), ox, oy)
    return out


def derived(eid, img):
    # the Reeve's crook swings well past the 16 px canvas margin of the Episode 1 recipes: widen it for his frames only
    # (every AF function reads AF.PAD, and pack() finds the origin through it, so the frames stay aligned)
    old = AF.PAD
    if eid == 'barrow_reeve':
        AF.PAD = 72
    try:
        raw = {'barrow_shade': f_shade, 'barrow_reeve': f_reeve, 'millstone_golem': f_golem}[eid](img)
        return pack(eid, img, raw)
    finally:
        AF.PAD = old


def frames_of(eid):
    """[(name, rgba, ox, oy)]: base then derived in AF.ORDER"""
    img = build()[eid]
    H, W = img.shape[:2]
    out = [(eid, img, W // 2, H - 1)]
    fr = derived(eid, img)
    out += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    return out


def anim_sheet(path, ids=None, scale=3, bg=(34, 28, 30)):
    from PIL import Image, ImageDraw
    rows = []
    for eid in (ids or IDS):
        rows.append([(n[len(eid) + 1:] or 'base',) + AF.trim(img, ox, oy) for n, img, ox, oy in frames_of(eid)])
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
            tile = to_pil(t).resize((t.shape[1] * scale, t.shape[0] * scale), Image.NEAREST)
            im.paste(tile, (x * scale, y * scale), tile)
            d.text((i * cw * scale + 3, j * rh * scale + 2), lab, fill=(230, 230, 210))
    im.save(path)


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'x1'), exist_ok=True)
    b = base()
    for bg, tag in (((34, 28, 30), 'dark'), ((86, 76, 70), 'mid')):
        contact(list(b.items()), os.path.join(OUT, 'x1', f'enemies_base_4x_{tag}.png'), scale=4, cols=3, bg=bg,
                title='X1 foes (base) at 4x')
    for eid in IDS:
        anim_sheet(os.path.join(OUT, 'x1', f'anim_{eid}_3x.png'), [eid], scale=3)
