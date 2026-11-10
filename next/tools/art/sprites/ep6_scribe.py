"""The Storm Scribe (E6-sprites): three battle looks from ../assets/art/bosses.png cell 5 at 1x inside the 160 x 144 boss
cell (the painting: a winged ink-and-cloud beast with electric-blue feathers, a bone mask with a blue eye and a hooked
beak, gold filigree, a bank of cloud under it and runic quills hovering round it). Not flipped: the beak already points
right, at the party.

  scribe        The Wind Script: as painted, held to the master palette by material (ink feathers, electric-blue
                lines, bone, gold, cloud), the quills hovering where they were
  scribe_ward   The Storm Script Ward: a ring of false lamplight and a spinning brass compass rose behind it, the quills
                scattered (thrown wide, tumbling)
  scribe_chart  The True Sky Chart: the wings opened (each turned out from the shoulder) like sails with the Wind Script's
                lines written along them, the feathers bright, lightning in the wingtips

Focal point (CRITIQUE_4 item 15): the bone mask and its blue eye are the one bright place on the body in every look
(the chart's script lines and lightning are the second). Contrast rule as ep6_enemies.py: a dark outline and a cloud-white
rim (the Scribe is Aloft).

    base()          -> {id: rgba}              facing RIGHT, origin bottom-centre
    atlas_frames()  -> [(name, rgba, ox, oy)]
    avatar()        -> {'scribe_avatar': [f0, f1], 'scribe_avatar_back': [f0, f1]}  the field avatar, 2-frame idle
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
import ep6_enemies as E6

TH = 128
IDS = ['scribe', 'scribe_ward', 'scribe_chart']
PADX = 8
PADT = 8

INK = [(0.0, 'shadow:0'), (0.12, 'ink:1'), (0.26, 'roof_blue:1'), (0.42, 'roof_blue:2'), (0.58, 'roof_blue:3'),
       (0.74, 'roof_blue:4'), (0.88, 'water:4'), (1.0, 'ice:2')]
INK_BRIGHT = [(0.0, 'ink:1'), (0.1, 'roof_blue:2'), (0.24, 'roof_blue:3'), (0.4, 'roof_blue:4'), (0.58, 'water:4'),
              (0.76, 'ice:2'), (0.9, 'ice:3'), (1.0, 'metal:4')]
ELEC = [(0.0, 'water:3'), (0.5, 'water:4'), (1.0, 'ice:2')]
GOLD = [(0.0, 'wood:1'), (0.3, 'gold:2'), (0.6, 'gold:3'), (0.85, 'gold:4'), (1.0, 'gold:5')]
BONE = [(0.0, 'stone_warm:2'), (0.3, 'stone_warm:3'), (0.6, 'stone_warm:4'), (0.85, 'stone_warm:5'), (1.0, 'metal:4')]
CLOUDS = [(0.0, 'roof_blue:2'), (0.25, 'cloth_blue:3'), (0.5, 'cloth_blue:4'), (0.75, 'stone_cool:5'), (1.0, 'metal:3')]


def cut(th=TH, k=18):
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 5), keep_frac=0.02, max_dist=60)
    tw, th2 = fit_size(obj, th=th)
    d, _ = pixelize2(obj, tw, th2, k=k, sharpen=0.0, max_de=0.10, ring=False)
    return d


def masks(d):
    """materials by colour and place: the head box (upper right) holds the bone; the cloud is the pale low-chroma mass
    away from it; the electric lines are the saturated light blues; gold is warm"""
    m, L, C, h = lch_img(d)
    H, W = d.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W]
    warm = m & (h > 30) & (h < 115) & (C > 0.03) & (L > 0.35)
    head = (xs > W * 0.6) & (xs < W * 0.92) & (ys > H * 0.2) & (ys < H * 0.55)
    bone = m & head & (L > 0.6) & ((C < 0.07) | (warm & (L > 0.72)))
    warm &= ~bone
    elec = m & ~warm & ~bone & (h > 200) & (h < 280) & (C > 0.1) & (L > 0.6)
    cloud = m & ~warm & ~bone & ~elec & (L > 0.56) & (C < 0.1)
    cloud = ndi.binary_opening(cloud, iterations=1) | (cloud & (L > 0.7))
    ink = m & ~warm & ~bone & ~elec & ~cloud
    return m, warm, bone, elec, cloud, ink


def recolour(d, bright=False):
    m, warm, bone, elec, cloud, ink = masks(d)
    a = gmap(d, ink, INK_BRIGHT if bright else INK, gamma=1.15)
    a = gmap(a, elec, ELEC)
    a = gmap(a, warm, GOLD)
    a = gmap(a, bone, BONE)
    a = gmap(a, cloud, CLOUDS, gamma=0.8)
    return a, (m, warm, bone, elec, cloud, ink)


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


def put(a, x, y, ref):
    E6.put(a, x, y, ref)


# the head: the eye found as the brightest blue in the head box (it is the focal point, so it is redrawn clean)
EYE_CUT = (95, 51)        # the eye on the 128 px battle cut (painting coordinates, before padding), found by eye


def head_eye(a):
    """the eye in the bone mask, redrawn clean: a pale blue iris with a white catch-light in a dark socket"""
    x, y = EYE_CUT[0] + 1 + PADX, EYE_CUT[1] + 1 + PADT
    EYE = ['.kkk.', 'kIIik', 'kIWik', '.kkk.']
    a = stamp(a, EYE, {'k': 'shadow:0', 'I': 'ice:2', 'i': 'water:4', 'W': 'metal:4'}, x - 2, y - 1)
    return a, (x, y)


def components(a, body_frac=0.5):
    """(body mask, [quill masks]): the largest opaque component is the beast and its cloud; the long thin ones with
    gold in them are the quills"""
    al = a[..., 3] > 0.5
    lab, n = ndi.label(al)
    if not n:
        return al, []
    sz = ndi.sum(al, lab, range(1, n + 1))
    big = int(np.argmax(sz)) + 1
    m, L, C, h = lch_img(a)
    warm = m & (h > 40) & (h < 115) & (C > 0.06)
    quills = []
    for i in range(1, n + 1):
        if i == big or sz[i - 1] < 10:
            continue
        q = lab == i
        if (q & warm).sum() >= 2:
            quills.append(q)
    return lab == big, quills


def scatter_quills(a, quills, seed=5):
    """the ward throws the quills wide: each is lifted off and set down further out from the centre, turned a little"""
    H, W = a.shape[:2]
    out = a.copy()
    for q in quills:
        out[q] = 0
    rng = np.random.RandomState(seed)
    cx, cy = W / 2.0, H * 0.5
    for i, q in enumerate(quills):
        ys, xs = np.nonzero(q)
        qy, qx = ys.mean(), xs.mean()
        vx, vy = qx - cx, qy - cy
        d = max(1.0, np.hypot(vx, vy))
        push = 9 + rng.randint(0, 5)
        tx, ty = int(round(vx / d * push)), int(round(vy / d * push)) - 3 * (i % 2)
        ang = (35 + rng.rand() * 40) * (1 if i % 2 else -1)
        piece = np.zeros_like(a)
        piece[q] = a[q]
        moved = AF.xform(piece, (qx, qy), angle=ang, tx=tx, ty=ty)
        sel = (moved[..., 3] > 0.5) & (out[..., 3] < 0.5)
        out[sel] = moved[sel]
    return out


def compass_rose(a, cx, cy, R, spin=0.0):
    """the Ward's spinning brass compass rose, BEHIND the beast (drawn only where nothing stands): a thin brass ring with
    ticks and an eight-point rose of brass and dark bronze"""
    H, W = a.shape[:2]
    out = a.copy()
    free = a[..., 3] < 0.5
    ang = np.radians(spin)
    for y in range(H):
        for x in range(W):
            if not free[y, x]:
                continue
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = np.hypot(dx, dy)
            th = np.arctan2(dy, dx) - ang
            ref = None
            if R - 1.0 < d <= R:
                ref = 'gold:4' if dy < 0 else 'gold:3'
                if int((np.degrees(th) + 360) % 22.5) < 2:
                    ref = 'gold:5'
            elif R - 2.0 < d <= R - 1.0 and int((np.degrees(th) + 360) % 22.5) < 3:
                ref = 'gold:3'
            else:
                # the rose: a point's half-width falls off with distance; long points at 0/90/180/270
                k = (th % (np.pi / 4))
                k = min(k, np.pi / 4 - k)
                long_ = int(round(((th % (2 * np.pi)) / (np.pi / 4)))) % 2 == 0
                reach = R - 3 if long_ else R * 0.62
                if d < reach and k * d < (reach - d) * 0.16 and d > 4:
                    side = ((th % (np.pi / 4)) < np.pi / 8)
                    ref = ('gold:4' if side else 'gold:2') if long_ else ('gold:3' if side else 'wood:2')
            if ref:
                out[y, x, :3] = col(ref); out[y, x, 3] = 1
    return out


def lamplight_ring(a, cx, cy, rx, ry):
    """the false lamplight: a ring of warm dithered light round the Scribe, behind the body, brightest at the top"""
    H, W = a.shape[:2]
    out = a.copy()
    for y in range(H):
        for x in range(W):
            if a[y, x, 3] > 0.5:
                continue
            d = np.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
            if 0.93 < d <= 1.0:
                top = y < cy
                if (x + y) % 2 == 0 or (top and d > 0.965):
                    out[y, x, :3] = col('fire:4' if (top and d > 0.965) else 'gold:3'); out[y, x, 3] = 1
    return out


def lamps(a, cx, cy, rx, ry, n=6):
    """small false lamps on the ring: a bright core with a warm cross"""
    for i in range(n):
        t = np.pi * (1.1 + 0.8 * i / (n - 1))
        x, y = int(round(cx + rx * np.cos(t))), int(round(cy + ry * np.sin(t)))
        for (dx, dy, r) in ((0, 0, 'fire:5'), (1, 0, 'fire:4'), (-1, 0, 'fire:4'), (0, 1, 'gold:4'), (0, -1, 'fire:4')):
            if 0 <= y + dy < a.shape[0] and 0 <= x + dx < a.shape[1]:
                put(a, x + dx, y + dy, r)
    return a


def wing_masks(a, eye):
    """the two wings (painting orientation, beak right): the near wing is the mass up and left of the shoulder, the far
    wing the mass up and right of the head"""
    H, W = a.shape[:2]
    ex, ey = eye if eye else (int(W * 0.72), int(H * 0.36))
    left = AF.m_poly(a, [(0, 0), (int(W * 0.52), 0), (int(W * 0.52), int(H * 0.42)), (int(W * 0.3), int(H * 0.62)),
                         (0, int(H * 0.62))])
    right = AF.m_poly(a, [(int(W * 0.6), 0), (W, 0), (W, int(ey - 6)), (int(ex - 4), int(ey - 9)), (int(W * 0.6), int(H * 0.18))])
    return left, right


def script_lines(a, mask, shoulder, seed=3, n=6):
    """the Wind Script written along a wing opened like a sail: lines radiating from the shoulder to the wing's edge
    (the sail's ribs), each a run of script (dashes of two or three dark ink pixels with a gap) on the bright feathers"""
    H, W = a.shape[:2]
    inner = ndi.binary_erosion(mask & (a[..., 3] > 0.5), iterations=1) & ~edge_of(a)
    ys, xs = np.nonzero(inner)
    if not len(ys):
        return a
    sx, sy = shoulder
    angs = np.arctan2(ys - sy, xs - sx)
    lo, hi = np.percentile(angs, 8), np.percentile(angs, 92)
    rng = np.random.RandomState(seed)
    for j in range(n):
        th = lo + (hi - lo) * (j + 0.5) / n
        r = 6.0
        k = 0
        while r < 90:
            x, y = int(round(sx + r * np.cos(th))), int(round(sy + r * np.sin(th)))
            if not (0 <= x < W and 0 <= y < H):
                break
            if inner[y, x]:
                ph = k % 5
                if ph < 3:
                    put(a, x, y, 'shadow:0' if (ph == 0 and rng.rand() < 0.5) else 'ink:1')
                k += 1
            r += 1.0
    return a


def edge_of(a):
    return E6.edge_mask(a)


def lightning(a, tips, seed=9):
    """bolts from the wingtips outward: jagged three-pixel steps, a white core and a cyan edge"""
    H, W = a.shape[:2]
    rng = np.random.RandomState(seed)
    for (x, y, dx, dy) in tips:
        for i in range(9):
            nx = x + dx * 2 + (rng.randint(-1, 2) if i else 0)
            ny = y + dy * 2 + (rng.randint(-1, 2) if i else 0)
            n = max(abs(nx - x), abs(ny - y), 1)
            for k in range(n + 1):
                px, py = int(round(x + (nx - x) * k / n)), int(round(y + (ny - y) * k / n))
                if 0 <= px < W and 0 <= py < H:
                    if a[py, px, 3] < 0.5 or True:
                        put(a, px, py, 'metal:4')
                    for ox, oy in ((1, 0), (0, 1)):
                        if 0 <= px + ox < W and 0 <= py + oy < H and a[py + oy, px + ox, 3] < 0.5:
                            put(a, px + ox, py + oy, 'water:4')
            x, y = nx, ny
            if not (0 <= x < W and 0 <= y < H):
                break
    return a


def wingtips(a, left, right):
    """(x, y, dx, dy) at the outer tip of each wing"""
    out = []
    for m, dx in ((left, -1), (right, 1)):
        ys, xs = np.nonzero(m)
        if not len(ys):
            continue
        score = (xs * dx) - ys * 0.6
        i = int(np.argmax(score))
        out.append((int(xs[i]), int(ys[i]), dx, -1))
    return out


_CACHE = {}
_INFO = {}


def build():
    if _CACHE:
        return _CACHE
    d0 = cut()
    for look in IDS:
        d, _ = recolour(d0)
        d = clean(d)
        a = pad(d)
        a, eye = head_eye(a)
        body, quills = components(a)
        H, W = a.shape[:2]
        if look == 'scribe_ward':
            a = scatter_quills(a, quills)
        if look == 'scribe_chart':
            left, right = wing_masks(a, eye)
            sh_l = AF.cp(int(W * 0.46), int(H * 0.36))
            sh_r = AF.cp(int(W * 0.66), int(H * 0.26))
            c = AF.canvas(a)
            c = AF.move(c, AF.m_poly(c, [(0, 0), (int(W * 0.52), 0), (int(W * 0.52), int(H * 0.42)), (int(W * 0.3), int(H * 0.62)),
                                         (0, int(H * 0.62))]), sh_l, angle=-9, keep=True)
            P_ = AF.PAD
            a = c[P_:P_ + H, P_:P_ + W].copy()
            a, eye = head_eye(a)
            left, right = wing_masks(a, eye)
            for wm in (left, right):
                # the sail: the wing's feathers drawn smooth and pale (three tones), so the script reads on it
                sail = ndi.binary_erosion(wm & (a[..., 3] > 0.5), iterations=1)
                a = gmap(a, sail, [(0.0, 'roof_blue:1'), (0.2, 'roof_blue:2'), (0.42, 'roof_blue:3'), (0.62, 'water:4'),
                                   (0.82, 'ice:2'), (1.0, 'ice:3')], gamma=0.85)
                a = CL.snap_master(a, 0.06)
            a = script_lines(a, left, (int(W * 0.46), int(H * 0.36)), n=7)
            a = script_lines(a, right, (int(W * 0.66), int(H * 0.28)), seed=4, n=4)
        a = E6.contrast(a, 'scribe')
        if look == 'scribe_ward':
            # behind the beast and after the contrast rule (light and a far ring take no outline)
            cx, cy = W / 2.0, H * 0.46
            a = compass_rose(a, cx, cy, min(W, H) * 0.44, spin=12)
            a = lamplight_ring(a, cx, cy, W * 0.49, H * 0.47)
            a = lamps(a, cx, cy, W * 0.49, H * 0.47)
        if look == 'scribe_chart':
            left, right = wing_masks(a, eye)
            a = lightning(a, wingtips(a, left, right))
        _CACHE[look] = a
        _INFO[look] = {'eye': eye}
    return _CACHE


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames
def recipe(img, look):
    """idle_1 the wings lift and the body rises a pixel; attack the body lunges toward the party, the wings sweep down;
    hurt the recoil; cast the electric blue flares (the chart: the script and the lightning) and sparks rise"""
    H, W = img.shape[:2]
    a = AF.canvas(img)
    I = lambda v: int(round(v))
    out = {}
    wing_l = AF.m_poly(a, [(AF.PAD, AF.PAD), (AF.PAD + I(W * 0.5), AF.PAD), (AF.PAD + I(W * 0.5), AF.PAD + I(H * 0.4)),
                           (AF.PAD, AF.PAD + I(H * 0.55))])
    wing_r = AF.m_poly(a, [(AF.PAD + I(W * 0.6), AF.PAD), (AF.PAD + W, AF.PAD), (AF.PAD + W, AF.PAD + I(H * 0.22)),
                           (AF.PAD + I(W * 0.6), AF.PAD + I(H * 0.2))])
    sh_l = AF.cp(I(W * 0.47), I(H * 0.38))
    sh_r = AF.cp(I(W * 0.64), I(H * 0.24))
    seam = I(H * 0.62) + AF.PAD
    f = AF.rise(a, seam)
    f = AF.move(f, wing_l, sh_l, angle=-4, keep=True)
    out['idle_1'] = AF.move(f, wing_r, sh_r, angle=4, keep=True)
    f = AF.move(a, wing_l, sh_l, angle=8, keep=True)
    f = AF.move(f, wing_r, sh_r, angle=-6, keep=True)
    out['attack'] = AF.lean(f, seam, 5, taper=I(H * 0.4))
    g = AF.lean(a, seam, -4, taper=I(H * 0.4))
    g, dox = AF.squash(g, (I(H * 0.3), I(H * 0.6)), (I(W * 0.3), I(W * 0.7)))
    out['hurt'] = (AF.edge_lift(g, 2, prefer=('ink', 'roof_blue', 'shadow', 'gold')), dox)
    m, L, C, h = lch_img(a)
    hot = m & (h > 200) & (h < 280) & (C > 0.08) & (L > 0.62)
    f = AF.glow(a, hot, 'ice', 0.55, 1)
    if look == 'scribe_ward':
        warm = m & (h > 50) & (h < 110) & (L > 0.75)
        f = AF.glow(f, warm, 'fire', 0.6, 1)
    out['cast'] = AF.sparkles(f, [(I(W * 0.5), -4, 2), (I(W * 0.62), 0, 1), (I(W * 0.36), -6, 1), (I(W * 0.76), 6, 2),
                                   (I(W * 0.18), 14, 1), (I(W * 0.9), 20, 1), (I(W * 0.44), -10, 1)],
                              ['metal:4', 'ice:3', 'water:4'] if look != 'scribe_ward' else ['fire:5', 'gold:4', 'ice:3'])
    return out


def derived(bid, img):
    return E6.pack6(bid, img, recipe(img, bid))


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
AV_H = 46
AV_HEAD = ['..kkkk...',
           '.kWWWWk..',
           'kWWWkIWk.',
           'kwWWWWWWk',
           '.kwwkkWYk',
           '..kk..kk.']
AV_HEAD_BACK = ['..kkkk...',
                '.kbBBbk..',
                'kbBGGBbk.',
                'kbBBBBBbk',
                '.kbbkkbbk',
                '..kk..kk.']
AV_LEG = {'k': 'shadow:0', 'W': 'stone_warm:5', 'w': 'stone_warm:3', 'I': 'ice:3', 'Y': 'stone_warm:4',
          'b': 'ink:2', 'B': 'roof_blue:2', 'G': 'gold:4'}


def avatar():
    """scribe_avatar (front) and scribe_avatar_back at map scale, perched: a second cut of the painting at 46 px (never a
    resample of the battle frame), only the beast and its cloud kept (loose quills drop out at this size); the head is
    redrawn by hand so it reads at phone size: a bone mask with a pale blue eye and a hooked beak (front), a dark crown of
    feathers with a gold crest seen from behind (back, the cut mirrored). Frame 1 lifts the wings a pixel."""
    d = cut(th=AV_H, k=12)
    a, _ = recolour(d)
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
    k = AV_H / float(TH)
    hx, hy = int(round(EYE_CUT[0] * k)) + 1, int(round(EYE_CUT[1] * k)) + 2
    front = stamp(big.copy(), AV_HEAD, AV_LEG, hx - 5, hy - 2)
    back = big[:, ::-1].copy()
    bx = back.shape[1] - 1 - hx
    back = stamp(back, AV_HEAD_BACK, AV_LEG, bx - 3, hy - 2)
    out = {}
    for name, img in (('scribe_avatar', front), ('scribe_avatar_back', back)):
        f0 = E6.side_rim(E6.dark_outline(img), 'aloft', right=True)
        f1 = f0.copy()
        Hh = f0.shape[0]
        cut_y = int(Hh * 0.55)
        f1[:cut_y - 1] = f0[1:cut_y]
        f1[cut_y - 1] = f0[cut_y - 1]
        out[name] = [f0, f1]
    return out


if __name__ == '__main__':
    import os
    os.makedirs(os.path.join(OUT, 'ep6'), exist_ok=True)
    b = base()
    for bg, tag in (((214, 226, 240), 'cloud'), ((34, 36, 58), 'storm')):
        contact(list(b.items()), os.path.join(OUT, 'ep6', f'scribe_looks_3x_{tag}.png'), scale=3, cols=3, bg=bg,
                title='The Storm Scribe: The Wind Script, The Storm Script Ward, The True Sky Chart (3x)')
    av = avatar()
    items = [(f'{k}_{i}', v) for k, fr in av.items() for i, v in enumerate(fr)]
    contact(items, os.path.join(OUT, 'ep6', 'scribe_avatar_6x.png'), scale=6, cols=4, bg=(120, 150, 190))
