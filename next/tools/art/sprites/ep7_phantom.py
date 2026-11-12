"""The White Phantom (E7-sprites): three battle looks from ../assets/art/bosses.png cell 6 at 1x inside the 160 x 144 boss
cell (the painting: a skeletal icy spectral sentinel with an antler crown and a ragged frozen cloak, an ice blade low on
its right, ice shards hovering round it). Not flipped: the figure faces out of the painting, its blade low on the far
side, and the light falls from the upper left as on every other boss.

  white_phantom        Outer Frost: as painted, held to the master palette (snow white, ice blue, the dark navy of the
                       skeleton), the skull redrawn clean with two cold blue eyes so it reads at phone size
  white_phantom_ward   The Frozen Ward: the cloak spread behind it like a door (a tall arch of frozen cloth from the
                       shoulders to the ground), an iron gate and three letters frozen into it, the crown frosted white
  white_phantom_thaw   Thawlight: the frost cracking off in plates (dark crack lines over the cloak, plates sliding and
                       falling away), the crown dripping, a warm light in the chest

Every look is drawn on the same canvas from the same cut, so the skull, the crown and the feet stand on the same pixels in
all three: one HUD anchor holds over the crown in every phase (CRITIQUE_8 item 1; HUD below). The ward's door is drawn
behind the figure, never over it. Focal point (CRITIQUE_4 item 15): the skull and its two blue eyes under the antler crown
are the brightest place on the body in Outer Frost and the Ward; in Thawlight the chest light is the second.

Contrast rule as ep7_enemies.py: a dark outline and an ice-blue rim.

    base()          -> {id: rgba}              facing RIGHT (toward the party), origin bottom-centre
    atlas_frames()  -> [(name, rgba, ox, oy)]
    hud()           -> {look: {'crown': [dx, dy], 'head': [x0, x1, y0, y1]}}  the HUD anchor (from the origin) and the
                       head box (fractions of the frame, layout.js HEAD_BOX format), identical in all three looks
    avatar()        -> {'phantom_avatar': [f0, f1], 'phantom_avatar_back': [f0, f1]}  the field avatar, 2-frame idle
"""
import numpy as np
from scipy import ndimage as ndi
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import cleanup as CL
import anim_frames as AF
from hollow_enemies import col
from ep2_enemies import gmap, lch_img, stamp
import ep7_enemies as E7

TH = 128
IDS = ['white_phantom', 'white_phantom_ward', 'white_phantom_thaw']
PADX = 7
PADT = 3

FROST = [(0.0, 'shadow:0'), (0.1, 'ink:1'), (0.2, 'ink:2'), (0.32, 'roof_blue:2'), (0.44, 'roof_blue:3'),
         (0.56, 'stone_cool:4'), (0.68, 'stone_cool:5'), (0.8, 'ice:2'), (0.9, 'metal:3'), (1.0, 'metal:4')]


def cut(th=TH, k=20):
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 6), keep_frac=0.02, max_dist=60)
    tw, th2 = fit_size(obj, th=th)
    d, _ = pixelize2(obj, tw, th2, k=k, sharpen=0.0, max_de=0.10, ring=False)
    return d


def recolour(d):
    m, L, C, h = lch_img(d)
    warm = m & (h > 30) & (h < 140) & (C > 0.05)
    a = gmap(d, m & ~warm, FROST, gamma=0.95)
    a = gmap(a, warm, [(0.0, 'stone_cool:3'), (1.0, 'stone_cool:5')])   # the painting's stray gold flecks go to frost
    return a


def clean(d):
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    d = CL.majority_despeckle(d, passes=2, max_de=0.12, max_island=3, protect=prot)
    return d


def pad(d):
    H, W = d.shape[:2]
    big = blank(W + 2 + 2 * PADX, H + 2 + PADT)
    big[1 + PADT:-1, 1 + PADX:-1 - PADX] = d
    big = drop_specks(big, 4)
    return CL.ramp_outline(big)


put = E7.put

# the skull on the 128 px cut (painting coordinates before padding), found by eye on the cut at 5x: the face's top-left
SKULL_CUT = (68, 17)
SKULL = ['..WWWWW..',
         '.WWWWWWw.',
         'WWWWWWWww',
         'WkkkWkkkw',
         'WkBkWkBkw',
         'WkkkWkkkw',
         '.WWWkWWw.',
         '.WwkwkWw.',
         '..wkwkw..',
         '...www...']
SKULL_LEG = {'W': 'metal:3', 'w': 'stone_cool:5', 'k': 'shadow:0', 'B': 'ice:1'}


def skull_xy():
    return SKULL_CUT[0] + 1 + PADX, SKULL_CUT[1] + 1 + PADT


def head(a):
    x, y = skull_xy()
    return stamp(a, SKULL, SKULL_LEG, x, y)


def crown_mask(a):
    """the antlers: everything opaque above the skull's top row, inside the crown's span"""
    H, W = a.shape[:2]
    sx, sy = skull_xy()
    m = np.zeros((H, W), bool)
    m[:sy + 1, sx - 27:sx + 31] = True
    return m & (a[..., 3] > 0.5)


def frost_crown(a):
    """the Ward's crown frosted over: the antlers go white (their lit side metal:4, the rest ice:3) and every tine tip
    carries a white crystal one pixel proud"""
    cm = crown_mask(a) & ~E7.edge_mask(a)
    m, L, C, h = lch_img(a)
    for y, x in zip(*np.nonzero(cm)):
        put(a, x, y, 'metal:4' if L[y, x] > 0.55 else 'ice:2')
    al = a[..., 3] > 0.5
    H, W = a.shape[:2]
    cm2 = crown_mask(a)
    for y, x in zip(*np.nonzero(cm2)):
        if y > 0 and not al[y - 1, x] and (x % 2 == 0):
            put(a, x, y - 1, 'metal:4')
    return a


def drip_crown(a):
    """Thawlight's crown dripping: under each tine's low points a drop of ice-blue water, some of them falling"""
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    cm = crown_mask(a)
    sx, sy = skull_xy()
    n = 0
    for x in range(W):
        ys = np.nonzero(cm[:, x])[0]
        if not len(ys):
            continue
        y = ys.max()
        if y < sy - 1 and x % 2 == 0 and y + 4 < H and not al[y + 1, x]:
            put(a, x, y, 'ice:1')
            put(a, x, y + 1, 'ice:1')
            if not al[y + 2, x]:
                put(a, x, y + 2, 'water:4')
            if n % 2 == 0 and not al[y + 4, x]:
                put(a, x, y + 4, 'ice:1')
            n += 1
    return a


def chest_light(a, strength=1.0):
    """a warm light in the chest: a small gold-white core in the rib cage, a warm halo dithered on the ribs round it"""
    sx, sy = skull_xy()
    cx, cy = sx + 4, sy + 30
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    r = 7 * strength
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            if not (0 <= y < H and 0 <= x < W) or not al[y, x]:
                continue
            d = np.hypot(x - cx, (y - cy) * 1.1)
            if d <= 1.2:
                put(a, x, y, 'fire:5')
            elif d <= 2.4:
                put(a, x, y, 'fire:4')
            elif d <= 4.0 and (x + y) % 2 == 0:
                put(a, x, y, 'gold:4')
            elif d <= r and (x + y) % 4 == 0:
                put(a, x, y, 'gold:3')
    return a


def cracks(a, seed=5):
    """frost cracking off in plates: the cloak below the shoulders is cut into plates (a Voronoi of seeds over the
    cloak) by crack lines (dark, with a white lip on their upper side); a few plates have fallen away and show the dark
    under-layer, and their chips fall beside the body"""
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    e = E7.edge_mask(a)
    sx, sy = skull_xy()
    rng = np.random.RandomState(seed)
    body = al & ~e
    body[:sy + 16] = False
    ys, xs = np.nonzero(body)
    seeds = np.stack([xs, ys], 1)[rng.choice(len(xs), 44, replace=False)].astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot(xx[..., None] - seeds[:, 0], (yy[..., None] - seeds[:, 1]) * 1.2)
    o = np.sort(d, -1)
    near = np.argmin(d, -1)
    crack = body & ((o[..., 1] - o[..., 0]) < 1.1)
    out = a.copy()
    sizes = np.bincount(near[body], minlength=len(seeds))
    fallen = [int(i) for i in np.argsort(sizes)[len(seeds) // 2:][::7][:3]]
    for y, x in zip(*np.nonzero(body & np.isin(near, fallen))):
        out[y, x, :3] = col('roof_blue:1' if (x + y) % 2 else 'roof_blue:2')
    for y, x in zip(*np.nonzero(crack)):
        out[y, x, :3] = col('ink:1')
        if y > 0 and body[y - 1, x] and not crack[y - 1, x]:
            out[y - 1, x, :3] = col('metal:4')
    # chips falling beside the body: small plates with an outline
    CHIP = ['.kk.', 'kWik', 'kiik', '.kk.']
    for (x, y) in ((PADX + 2, H - 40), (PADX + 6, H - 26), (W - PADX - 8, H - 44), (W - PADX - 4, H - 30), (W - PADX - 11, H - 20)):
        if not al[y:y + 4, x:x + 4].any():
            out = stamp(out, CHIP, {'k': 'shadow:0', 'W': 'metal:4', 'i': 'ice:2'}, x, y)
    return out


def ward_door(a):
    """the cloak spread behind the Phantom like a door: a tall arch of frozen cloth from the shoulders to the ground,
    ragged at its edges, with an iron gate frozen into its middle and three folded letters frozen into the cloth, all drawn
    only where nothing stands (behind the figure)"""
    H, W = a.shape[:2]
    sx, sy = skull_xy()
    cx = sx + 4
    top = sy + 8
    x0, x1 = 2, W - 3
    bot = H - 3
    out = a.copy()
    free = a[..., 3] < 0.5
    rng = np.random.RandomState(4)
    rag = {x: rng.randint(0, 3) for x in range(W)}

    def inside(x, y):
        # an arch: straight sides, a round top centred on the figure
        rx = (x1 - x0) / 2.0
        mx = (x0 + x1) / 2.0
        if y < top:
            return False
        ty = top + rx * 0.55 * (1 - np.sqrt(max(0.0, 1 - ((x - mx) / rx) ** 2)))
        return y >= ty and x0 + rag[y % W] <= x <= x1 - rag[(y * 3) % W] and y <= bot - rag[x]

    door = np.zeros((H, W), bool)
    for y in range(H):
        for x in range(W):
            if inside(x, y):
                door[y, x] = True
    # cloth: dark navy shaded by vertical folds, frost on the folds' ridges
    for y, x in zip(*np.nonzero(door & free)):
        f = (x * 5 // 7) % 6
        ref = ('ink:2', 'roof_blue:1', 'roof_blue:2', 'roof_blue:3', 'roof_blue:2', 'roof_blue:1')[f]
        if f == 3 and (y % 4 == 0):
            ref = 'ice:2'
        if y > bot - 8 - rag[x] and (x + y) % 2 == 0:
            ref = 'metal:4' if f in (2, 3) else 'ice:2'                 # frost along the hem
        out[y, x, :3] = col(ref); out[y, x, 3] = 1
    # the gate frozen into it: an arched grille of iron bars behind the figure's middle, ice in its gaps
    gx0, gx1, gy0, gy1 = x0 + 4, x1 - 4, top + 14, bot - 10
    for y in range(gy0, gy1):
        for x in range(gx0, gx1 + 1):
            if not (0 <= x < W) or not free[y, x] or not door[y, x]:
                continue
            u = (x - gx0) / float(gx1 - gx0)
            arch = gy0 + int(round(8 * (2 * u - 1) ** 2))
            if y < arch:
                continue
            ref = None
            if (x - gx0) % 7 == 0:
                ref = 'stone_cool:4'
            elif (x - gx0) % 7 == 1:
                ref = 'shadow:1'
            elif y in (arch, arch + 1) or (y - gy0) % 16 in (0, 1):
                ref = 'stone_cool:4' if y == arch or (y - gy0) % 16 == 0 else 'shadow:1'
            elif (x + y) % 9 == 0:
                ref = 'ice:2'
            else:
                continue                                                 # the cloth shows between the bars
            out[y, x, :3] = col(ref); out[y, x, 3] = 1
    # three letters frozen into the cloth: cream envelopes with a red seal and a white crust of ice
    LET = ['iiiiiiiiiii',
           'iWPPPPPPPPi',
           'ipPPPPPPPpi',
           'iPpPPPPPpPi',
           'iPPpPRPpPPi',
           'iPPPpRpPPPi',
           'iPPPPPPPPPi',
           'iiiiiiiiiii']
    leg = {'i': 'ice:2', 'W': 'metal:4', 'P': 'stone_warm:5', 'p': 'stone_warm:3', 'R': 'roof_red:3'}
    for (lx, ly) in ((x0 + 4, top + 22), (x1 - 15, top + 12), (x1 - 14, bot - 34)):
        for j, row in enumerate(LET):
            for i, ch in enumerate(row):
                x, y = lx + i, ly + j
                if 0 <= x < W and 0 <= y < H and free[y, x]:
                    out[y, x, :3] = col(leg[ch]); out[y, x, 3] = 1
    # the door's outline (dark) and its lit left edge (ice), only on the door's own border
    d2 = out[..., 3] > 0.5
    p = np.pad(door & free, 1)
    border = (door & free) & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    for y, x in zip(*np.nonzero(border)):
        lit = x < (x0 + x1) / 2.0 or y < top + 20
        out[y, x, :3] = col('ice:2' if lit else 'shadow:0')
    p2 = np.pad(door & free | ~free, 1)
    for y, x in zip(*np.nonzero(border)):
        if 0 < x < W - 1 and 0 < y < H - 1:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                if out[y + dy, x + dx, 3] < 0.5:
                    out[y + dy, x + dx, :3] = col('shadow:0'); out[y + dy, x + dx, 3] = 1
    return out


_CACHE = {}


def build():
    if _CACHE:
        return _CACHE
    d0 = cut()
    d, _ = recolour(d0), None
    d = clean(d)
    base0 = pad(d)
    base0 = head(base0)
    for look in IDS:
        a = base0.copy()
        if look == 'white_phantom_ward':
            a = frost_crown(a)
        if look == 'white_phantom_thaw':
            a = cracks(a)
            a = chest_light(a)
        a = E7.contrast(a)
        if look == 'white_phantom_ward':
            a = ward_door(a)
        if look == 'white_phantom_thaw':
            a = drip_crown(a)
        _CACHE[look] = a
    return _CACHE


def base():
    return dict(build())


def hud():
    """one HUD anchor for all three looks: the top of the crown, above the skull (dx from the bottom-centre origin,
    dy up from it, negative), and the head box (the crown and the skull) as frame fractions"""
    b = build()
    out = {}
    for look in IDS:
        a = b[look]
        H, W = a.shape[:2]
        sx, sy = skull_xy()
        cm = crown_mask(a)
        ys, xs = np.nonzero(cm)
        top = int(ys.min()) if len(ys) else 0
        cx = sx + len(SKULL[0]) // 2
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        out[look] = {'crown': [cx - W // 2, top - (H - 1)],
                     'head': [round(x0 / W, 3), round(x1 / W, 3), round(top / H, 3), round((sy + len(SKULL)) / H, 3)]}
    return out


# ----------------------------------------------------------------------------- derived frames
def recipe(img, look):
    """idle_1 the cloak breathes (the body rises a pixel over the hem); attack it leans in toward the party; hurt the
    recoil; cast the frost flares white (Thawlight: the chest light flares) and ice sparks rise"""
    H, W = img.shape[:2]
    a = AF.canvas(img)
    I = lambda v: int(round(v))
    out = {}
    seam = I(H * 0.72) + AF.PAD
    out['idle_1'] = AF.rise(a, seam)
    out['attack'] = AF.lean(a, seam, 5, taper=I(H * 0.45))
    g = AF.lean(a, seam, -4, taper=I(H * 0.45))
    g, dox = AF.squash(g, (I(H * 0.3), I(H * 0.6)), (I(W * 0.3), I(W * 0.7)))
    out['hurt'] = (AF.edge_lift(g, 2, prefer=('ink', 'roof_blue', 'shadow', 'stone_cool')), dox)
    m, L, C, h = lch_img(a)
    if look == 'white_phantom_thaw':
        f = AF.glow(a, m & (h > 40) & (h < 110) & (C > 0.06), 'fire', 0.55, 1)
        sp = ['fire:5', 'gold:4', 'metal:4']
    else:
        f = AF.glow(a, m & (L > 0.8), 'ice', 0.55, 1)
        sp = ['metal:4', 'ice:3', 'ice:2']
    out['cast'] = AF.sparkles(f, [(I(W * 0.5), -4, 2), (I(W * 0.62), 0, 1), (I(W * 0.36), -6, 1), (I(W * 0.76), 6, 2),
                                   (I(W * 0.18), 14, 1), (I(W * 0.9), 20, 1), (I(W * 0.44), -10, 1)], sp)
    return out


def derived(bid, img):
    return E7.pack7(bid, img, recipe(img, bid))


def frames_of(bid):
    img = build()[bid]
    H, W = img.shape[:2]
    fr = derived(bid, img)
    return [(bid, img, W // 2, H - 1)] + [(f'{bid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]


def atlas_frames():
    out = []
    for bid in IDS:
        out += frames_of(bid)
    return out


# ----------------------------------------------------------------------------- the field avatar
AV_H = 48
AV_HEAD = ['.k..k.......k..k.',
           'kWkkWk.....kWkkWk',
           '.kWWk.......kWWk.',
           '..kWWk.....kWWk..',
           '...kWWkkkkkWWk...',
           '....kkWWWWWkk....',
           '.....kWWWWWk.....',
           '.....kBkWkBk.....',
           '.....kWWkWWk.....',
           '......kwkwk......',
           '.......kkk.......']
AV_HEAD_BACK = ['.k..k.......k..k.',
                'kWkkWk.....kWkkWk',
                '.kWWk.......kWWk.',
                '..kWWk.....kWWk..',
                '...kWWkkkkkWWk...',
                '....kkWWWWWkk....',
                '.....kWWWWwk.....',
                '.....kWWWWwk.....',
                '.....kwWWwwk.....',
                '......kwwwk......',
                '.......kkk.......']
AV_LEG = {'k': 'shadow:0', 'W': 'metal:3', 'w': 'stone_cool:5', 'B': 'ice:1'}


def avatar():
    """phantom_avatar (front) and phantom_avatar_back at map scale, standing over the heart: a second cut of the painting
    at 48 px (never a resample of the battle frame), only the figure kept (the shards drop out at this size); the skull
    is redrawn by hand so it reads at phone size (two cold blue eyes, front; the back of the skull, back, the cut
    mirrored). Frame 1 lifts the cloak a pixel."""
    d = cut(th=AV_H, k=12)
    a = recolour(d)
    a = CL.snap_master(a, 0.04)
    a = CL.merge_close(a, 0.04)
    H, W = a.shape[:2]
    big = blank(W + 2, H + 3)
    big[2:-1, 1:-1] = a
    al = big[..., 3] > 0.5
    lab, n = ndi.label(al)
    if n > 1:
        sz = ndi.sum(al, lab, range(1, n + 1))
        big[lab != int(np.argmax(sz)) + 1] = 0
    big = CL.ramp_outline(big)
    # the crown and the skull are redrawn by hand (the cut's antlers blur into a fork at this size): the cut above the
    # skull is cleared and the head stamped with its top on row 1
    k = AV_H / float(TH)
    hx = int(round((SKULL_CUT[0] + 4) * k)) + 1
    hy = int(round(SKULL_CUT[1] * k)) + 2
    big[:hy - 1, hx - 10:hx + 11] = 0
    pad_top = max(0, 7 - hy)
    if pad_top:
        big = np.concatenate([blank(big.shape[1], pad_top), big], 0)
        hy += pad_top
    front = E7.side_rim(E7.dark_outline(big), 'frost', right=True)
    back = front[:, ::-1].copy()
    bx = back.shape[1] - 1 - hx
    # the head goes on after the contrast rule (its antlers are one pixel wide and carry their own outline)
    front = stamp(front, AV_HEAD, AV_LEG, hx - 8, hy - 6)
    back = stamp(back, AV_HEAD_BACK, AV_LEG, bx - 8, hy - 6)
    out = {}
    for name, f0 in (('phantom_avatar', front), ('phantom_avatar_back', back)):
        f1 = f0.copy()
        Hh = f0.shape[0]
        cut_y = int(Hh * 0.6)
        f1[:cut_y - 1] = f0[1:cut_y]
        f1[cut_y - 1] = f0[cut_y - 1]
        out[name] = [f0, f1]
    return out


if __name__ == '__main__':
    import os
    os.makedirs(os.path.join(OUT, 'ep7'), exist_ok=True)
    b = base()
    for bg, tag in (((226, 234, 242), 'snow'), ((30, 34, 52), 'vault')):
        contact(list(b.items()), os.path.join(OUT, 'ep7', f'phantom_looks_3x_{tag}.png'), scale=3, cols=3, bg=bg,
                title='The White Phantom: Outer Frost, The Frozen Ward, Thawlight (3x)')
    av = avatar()
    items = [(f'{k}_{i}', v) for k, fr in av.items() for i, v in enumerate(fr)]
    contact(items, os.path.join(OUT, 'ep7', 'phantom_avatar_6x.png'), scale=6, cols=4, bg=(200, 214, 230))
    print(hud())
