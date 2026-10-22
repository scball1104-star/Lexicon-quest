"""W12 (CRITIQUE_4 item 5): the Episode 2 portraits repainted to Episode 1's standard with the SDF renderer
(portrait_sdf.py): three-quarter view toward the dialogue text, key light from the upper left, 4 to 5 skin steps,
hair in clusters, shoulders.

    portrait(pid, n) -> rgba n x n with the 1 px bevel frame (n = 48 or 32)
    canvas(pid)      -> the 6x render (rgb), for previews
    IDS

Stand-ins considered (brief W12 item 1): the unused painted cells `hooded_sage` and `noble_lady`. `noble_lady` is a
young crowned noblewoman and fits none of the five. `hooded_sage` was tried as Sister Anwen (hood recoloured to
grey, gold trim to silver, amber eyes to grey-blue): it reads as a gaunt, stern old man with loose hair, not a warm
sister in a wimple, so it was not used. Both cells stay unassigned.
"""
import math
import numpy as np
from PIL import Image, ImageDraw
import pal as P
import portrait_sdf as SD
from portrait_sdf import N, S

IDS = ['elian', 'anwen', 'tovin', 'lena', 'aurel']


def C(ref):
    return SD.hexrgb(P.color(ref, 'portraits'))


def hx(ref):
    return P.color(ref, 'portraits') if not ref.startswith('#') else ref


def backdrop():
    top, bot = C('roof_blue:0'), C('roof_blue:1')
    a = np.zeros((N, N, 3))
    for y in range(N):
        t = y / N * 0.6
        a[y] = top * (1 - t) + bot * t
    return a


# skin ramps, dark -> light (hue-shifted: violet-brown shadow, warm light); master colours plus in-betweens
SKIN = {
    'young': ['#3a2230', '#73372c', '#ad5d3e', '#d4835a', '#eba979', '#f5c393', '#fad6ae'],
    'weathered': ['#2d1b1f', '#5e2e28', '#94523a', '#bc7150', '#d28c62', '#e4a676', '#efbd8e'],
    'older': ['#3a2230', '#6e3529', '#a4593f', '#c97b58', '#e09c74', '#eeb990', '#f6cfaa'],
    'pale': ['#3a2a3a', '#6b4448', '#9e6858', '#c4886c', '#daa688', '#e8c0a2', '#f2d4ba'],
}


# ----------------------------------------------------------------------------- the shared head
def head(m, g, skin='skin', lips='lips', jaw=1.0, chin=1.0, nose=1.0, cheek=1.0, brow=1.0, age=0.0, ears=True,
         neck=True, neck_mat=None):
    """a three-quarter head in local units (origin at the head centre, the face along +z, y down)"""
    m.ell(g, (0, -2.6, -1.2), (9.3, 10.5, 10.1), skin)
    m.ell(g, (0, 4.0, 1.4), (7.0 * jaw, 7.4, 7.5), skin, k=3.6)
    m.ell(g, (0, 9.7, 4.3), (2.9 * chin, 2.2, 2.6), skin, k=2.4)
    for sx in (-1, 1):
        m.ell(g, (sx * 4.5, 1.6, 5.2), (2.5 * cheek, 2.0, 2.4), skin, k=2.0)
    m.ell(g, (0, -2.7, 6.7), (6.0, 1.45 * brow, 2.0), skin, k=2.0)
    for sx in (-1, 1):
        m.sub(g, 'ell', ((sx * 3.5, 0.1, 8.3), (1.9, 1.6, 1.6)), k=1.5)
    for sx in (-1, 1):
        m.ell(g, (sx * 3.5, 0.35, 6.2), (2.0, 1.7, 1.9), skin, k=0.7)
    # nose: bridge, tip, wings
    m.cap(g, (0, -1.4, 7.9), (0, 3.3 * nose, 9.7 + 0.4 * (nose - 1)), 0.72, 1.05, skin, k=1.1)
    m.ell(g, (0, 3.8 * nose, 9.5 + 0.5 * (nose - 1)), (1.22, 1.1, 1.15), skin, k=0.7)
    for sx in (-1, 1):
        m.ell(g, (sx * 1.45, 4.35 * nose, 8.2), (0.95, 0.8, 1.0), skin, k=0.6)
    # mouth
    m.ell(g, (0, 6.8, 7.2), (2.15, 0.62, 0.95), lips, k=0.8)
    m.ell(g, (0, 7.8, 7.0), (1.8, 0.72, 0.95), lips, k=0.8)
    if ears:
        for sx in (-1, 1):
            m.ell(g, (sx * 8.8, 1.0, -0.9), (1.1, 2.8, 1.9), skin, k=0.8)
    if neck:
        m.cap(g, (0, 6.0, -2.4), (0, 22.0, -3.4), 4.2, 4.9, neck_mat or skin, k=2.2)


def face_surface(m, g, pts, zstart=30.0):
    """local (x, y) -> local (x, y, z) on the surface along the local -z ray"""
    out = []
    for x, y in pts:
        t = 0.0
        p = None
        for _ in range(200):
            W = g.to_world([[x, y, zstart - t]])
            d = m.eval(W)[0]
            if d < 0.01:
                p = (x, y, zstart - t)
                break
            t += max(d * 0.8, 0.01)
            if t > 60:
                break
        out.append(p if p else (x, y, 0.0))
    return np.array(out, np.float64)


class Painter:
    """screen-space painting over a render at 6x, with occlusion against the depth buffer"""

    def __init__(self, r):
        self.r = r
        self.a = r.rgb.copy()

    def result(self):
        """rgb plus the figure mask as a 4th channel (finish keeps the grain off the backdrop)"""
        return np.concatenate([self.a, self.r.hit[..., None].astype(np.float64)], -1)

    def _mask_poly(self, W):
        im = Image.new('L', (N, N), 0)
        ImageDraw.Draw(im).polygon([(x * S, y * S) for x, y, _ in W], fill=255)
        return np.asarray(im) > 127

    def _mask_line(self, W, w0, w1=None):
        w1 = w0 if w1 is None else w1
        im = Image.new('L', (N, N), 0)
        d = ImageDraw.Draw(im)
        n = len(W)
        for i in range(n - 1):
            t = i / max(n - 2, 1)
            w = (w0 + (w1 - w0) * t) * S
            (x0, y0, _), (x1, y1, _) = W[i], W[i + 1]
            d.line([(x0 * S, y0 * S), (x1 * S, y1 * S)], fill=255, width=max(1, int(round(w))))
            d.ellipse([x1 * S - w / 2, y1 * S - w / 2, x1 * S + w / 2, y1 * S + w / 2], fill=255)
        return np.asarray(im) > 127

    def _front(self, W, tol=1.0):
        zc = float(np.mean([p[2] for p in W]))
        return self.r.depth <= zc + tol

    def poly(self, W, col, tol=1.0, clip=None):
        m = self._mask_poly(W) & self._front(W, tol)
        if clip is not None:
            m &= clip
        self.a[m] = col if np.ndim(col) == 1 else col[m]
        return m

    def line(self, W, w, col, w1=None, tol=1.0, clip=None, alpha=1.0):
        m = self._mask_line(W, w, w1) & self._front(W, tol)
        if clip is not None:
            m &= clip
        self.a[m] = self.a[m] * (1 - alpha) + np.asarray(col) * alpha
        return m

    def dot(self, x, y, rad, col):
        yy, xx = np.mgrid[0:N, 0:N]
        m = (xx + 0.5 - x * S) ** 2 + (yy + 0.5 - y * S) ** 2 <= (rad * S) ** 2
        self.a[m] = col
        return m


EYE_K = 1.14          # the painted Episode 1 cast has large, dark eyes; the features read at 48 px only this big
BROW_K = 1.3


def eye(p, m, g, cx, cy, side, w=1.95, h=1.0, iris=0.95, look=0.35, iris_cols=('earth:1', 'earth:3'),
        lid='#2d1b1f', crease='#6e3d2c', white='#e8dccc', white_sh='#b8a69a', tired=0.0, squint=0.0, lash_low='#8f5533',
        tilt=0.0):
    """an almond on the eyeball sphere, iris, pupil, catch-light, heavy upper lash, crease; side -1 near / +1 far"""
    w, h, iris = w * EYE_K, h * EYE_K, iris * EYE_K
    R = 2.3
    cz = 8.0 - 0.15
    hh = h * (1 - squint)

    def on(x, y, dz=0.0):
        z2 = max(R * R - x * x - y * y, 0.0)
        return g.to_world([[cx + x, cy + y + tilt * x * side, (cz - R) + math.sqrt(z2) + dz]])[0]

    xs = np.linspace(-w, w, 17)
    up = [on(x, -hh * (1 - (x / w) ** 2) ** 0.85 - 0.12 * hh * (x * side / w)) for x in xs]
    lo = [on(x, 0.72 * hh * (1 - (x / w) ** 2) ** 1.15) for x in xs[::-1]]
    ring = up + lo
    wm = p.poly(ring, SD.hexrgb(white), tol=1.2)
    # the upper third of the white is in the lid's shadow
    shade_ring = up + [on(x, -hh * 0.45) for x in xs[::-1]]
    p.poly(shade_ring, SD.hexrgb(white_sh), tol=1.2, clip=wm)
    # iris and pupil (a disc on the sphere, clipped by the lids)
    ang = np.linspace(0, 2 * math.pi, 40)
    ix = look * side * 0 + look
    ir = [on(ix + iris * math.cos(a), 0.05 + iris * 1.05 * math.sin(a), 0.05) for a in ang]
    p.poly(ir, C(iris_cols[1]), tol=1.4, clip=wm)
    ir2 = [on(ix + iris * 0.95 * math.cos(a), 0.05 + iris * math.sin(a), 0.05) for a in ang if math.sin(a) < -0.1]
    if len(ir2) > 2:
        p.poly(ir2 + [on(ix, 0.0, 0.05)], C(iris_cols[0]), tol=1.4, clip=wm)
    pu = [on(ix + iris * 0.45 * math.cos(a), 0.1 + iris * 0.5 * math.sin(a), 0.06) for a in ang]
    p.poly(pu, SD.hexrgb('#14101e'), tol=1.4, clip=wm)
    hl = on(ix - iris * 0.45, -iris * 0.4, 0.1)
    if p.r.depth[int(hl[1] * S), int(hl[0] * S)] <= hl[2] + 1.4:
        p.dot(hl[0], hl[1], 0.42, SD.hexrgb('#f6f4ee'))
    # lids: a heavy upper lash line (thicker at the outer corner), a thin lower lash, the crease above
    outer = 1 if side > 0 else -1
    lash = up + [on(w * 1.15 * outer, -hh * 0.05)] if outer > 0 else [on(-w * 1.15, -hh * 0.05)] + up
    p.line(lash, 1.15, SD.hexrgb(lid), w1=0.85, tol=1.4)
    p.line([on(x, 0.72 * hh * (1 - (x / w) ** 2) ** 1.15 + 0.15) for x in np.linspace(-w * 0.2 * -outer, w * outer, 7)],
           0.45, SD.hexrgb(lash_low), tol=1.4)
    p.line([on(x, -hh - 0.85 - 0.25 * (1 - (x / w) ** 2)) for x in np.linspace(-w * 0.85, w * 0.95, 9)], 0.45,
           SD.hexrgb(crease), tol=1.6, alpha=0.65)
    if tired:
        p.line([on(x, 0.72 * hh + 0.95) for x in np.linspace(-w * 0.7, w * 0.7, 7)], 0.4, SD.hexrgb(crease), tol=1.6,
               alpha=0.45 * tired)


def brow(p, m, g, side, x0, x1, y, arch=0.5, w0=1.0, w1=0.6, col='#482826', dy_out=0.0):
    xs = np.linspace(x0, x1, 9) * side
    pts = [(x, y - arch * (1 - ((x * side - (x0 + x1) / 2) / ((x1 - x0) / 2)) ** 2) + dy_out * (abs(x) - x0) / (x1 - x0))
           for x in xs]
    L = face_surface(m, g, pts)
    W = g.to_world(L + np.array([0, 0, 0.15]))
    p.line(list(W), w0 * BROW_K, SD.hexrgb(col), w1=w1 * BROW_K, tol=1.5)


def mouth(p, m, g, w=2.0, y=7.25, smile=0.0, col='#5a2f2a', w0=0.55):
    xs = np.linspace(-w, w, 11)
    pts = [(x, y - smile * (x / w) ** 2 + 0.15 * smile) for x in xs]
    L = face_surface(m, g, pts)
    W = g.to_world(L + np.array([0, 0, 0.1]))
    p.line(list(W), w0, SD.hexrgb(col), tol=1.5)


def nostrils(p, m, g, nose=1.0, col='#5a2f2a'):
    for sx in (-1, 1):
        L = face_surface(m, g, [(sx * 0.95, 4.55 * nose)])
        W = g.to_world(L + np.array([0, 0, 0.1]))[0]
        if p.r.depth[int(W[1] * S), int(W[0] * S)] <= W[2] + 1.0:
            p.dot(W[0], W[1], 0.42, SD.hexrgb(col))


def strands(p, m, g, locks, per=3, width=0.32, dark=0.78, light=1.14, seed=3):
    """thin streaks along each hair lock (clipped to that lock's visible pixels): strands inside the clusters"""
    rng = np.random.RandomState(seed)
    for lid, pts in locks:
        P0 = SD.bezier(pts, 12)
        W = g.to_world(P0)
        own = (p.r.tag == lid)
        if not own.any():
            continue
        # offsets across the lock, perpendicular to its screen direction
        d = W[-1, :2] - W[0, :2]
        nrm = np.array([-d[1], d[0]]) / max(np.linalg.norm(d), 1e-6)
        for j in range(per):
            off = (j - (per - 1) / 2) * 0.75 + rng.uniform(-0.25, 0.25)
            Wj = W.copy()
            Wj[:, :2] += nrm[None, :] * off
            t0 = rng.uniform(0.0, 0.25)
            t1 = rng.uniform(0.7, 1.0)
            seg = Wj[int(t0 * 12):int(t1 * 12) + 1]
            if len(seg) < 2:
                continue
            mk = p._mask_line(list(seg), width) & own
            f = dark if j % 2 == 0 else light
            p.a[mk] = np.clip(p.a[mk] * f, 0, 1)


def finish(rgb, n, k=24, crop=None, sharp=0.5, grain=0.016):
    """downscale, quantize, harmonize, despeckle, frame (as build_portraits.make_extra)"""
    from build_portraits import harmonize, frame
    from pix import box_resize, palette_from, quantize, remove_orphans
    a = rgb
    if crop is not None:
        x0, y0, s = crop
        a = a[int(y0 * S):int((y0 + s) * S), int(x0 * S):int((x0 + s) * S)]
    fig = np.asarray(Image.fromarray(a[..., 3].astype(np.float32), 'F').resize((n - 2, n - 2), Image.BOX), np.float32)
    a = np.concatenate([a[..., :3].astype(np.float32), np.ones(a.shape[:2] + (1,), np.float32)], -1)
    d = box_resize(a, n - 2, n - 2)
    d[..., 3] = 1
    if sharp:
        from pix import unsharp
        d = unsharp(d, sharp, 0.8)
        d[..., :3] = np.clip(d[..., :3], 0, 1)
        d[..., 3] = 1
    if grain:
        # a painterly grain at the final pixel size, so the quantized ramps break into clusters like the painted cast
        rng = np.random.RandomState(11)
        d[..., :3] = np.clip(d[..., :3] + (rng.normal(0, grain, d.shape[:2]) * np.clip(fig, 0, 1))[..., None], 0, 1)
    pal = palette_from(d, k, seed=5)
    pal = harmonize(pal, 0.03)
    q = quantize(d, pal)
    q = remove_orphans(q, passes=1, max_de=0.04, min_opaque_nb=8)
    return frame(q)


# ----------------------------------------------------------------------------- Elian
def elian():
    """about twenty, slight, sandy hair, a wine-red mayor's coat several sizes too big, the ledger under his arm"""
    m = SD.Model()
    g = m.group((20.6, 22.6, 0), yaw=24, pitch=-3, roll=-2, scale=1.5)
    b = m.group((22.0, 52.0, -8), yaw=10, pitch=0, roll=0, scale=1.12)
    head(m, g, jaw=0.95, chin=0.9, nose=0.98)
    # the coat: shoulders far wider than the boy inside, a high standing collar with gold piping
    m.ell(b, (0, 2.0, 0), (24.0, 10.5, 10.0), 'coat')
    m.ell(b, (-8.5, -6.5, 5.6), (3.6, 5.2, 1.8), 'coat', k=1.6)             # the standing collar, near wing
    m.ell(b, (8.5, -6.5, 4.4), (3.6, 5.2, 1.8), 'coat', k=1.6)              # far wing
    m.paint(b, 'ell', ((-0.5, 0.5, 9), (4.4, 11, 6)), 'shirt', on=('coat',))
    m.paint(b, 'cap', ((-4.6, -7, 9), (-6.2, 12, 9), 0.6, 0.6), 'gold', on=('coat',))
    m.paint(b, 'cap', ((3.8, -7, 9), (5.4, 12, 9), 0.6, 0.6), 'gold', on=('coat',))
    m.paint(b, 'cap', ((-6.0, -11.2, 7.5), (-11.6, -2.0, 7.6), 0.5, 0.5), 'gold', on=('coat',))
    m.paint(b, 'cap', ((6.0, -11.2, 6.5), (11.6, -2.0, 6.6), 0.5, 0.5), 'gold', on=('coat',))
    # the ledger's corner under his near arm
    m.box(b, (-17.5, 2.5, 10.0), (4.6, 6.5, 1.6), 'ledger', rad=0.6)
    m.paint(b, 'box', ((-17.5, -4.1, 10.0), (4.8, 0.5, 1.8)), 'page', on=('ledger',))
    m.paint(b, 'box', ((-13.0, 2.5, 10.0), (0.5, 6.6, 1.8)), 'page', on=('ledger',))
    # sandy hair: a soft cap and a mop of locks, the fringe falling in uneven points, swept toward his left
    m.ell(g, (0, -5.4, -2.0), (10.0, 9.8, 10.6), 'hair')
    rng = np.random.RandomState(4)
    locks = []
    for i, x0 in enumerate(np.linspace(-7.8, 7.4, 10)):
        tipx = x0 + 2.0 + rng.uniform(-0.8, 0.8)
        tipy = -3.4 + rng.uniform(-1.2, 1.4) + (0.6 if i % 3 == 1 else 0)
        pts = [(x0 * 0.5, -12.8, 0.5), (x0 * 0.85, -11.4, 7.0), (tipx - 0.4, -7.2, 9.7), (tipx + 0.9, tipy, 9.2)]
        locks.append((m.lock(g, pts, 2.3, 0.45, 'hair', k=0.7), pts))
    for sx in (-1, 1):
        for j, z0 in enumerate((5.0, 2.0, -1.0, -4.0)):
            pts = [(sx * 7.0, -10.8, z0), (sx * 9.9, -6.2, z0 + 0.8), (sx * 10.4, -1.0, z0 + 0.2),
                   (sx * (9.4 + 0.4 * j), 2.2 + j * 0.7 + rng.uniform(-0.4, 0.4), z0 - 0.6)]
            locks.append((m.lock(g, pts, 2.3, 0.6, 'hair', k=0.7), pts))
    for j, x0 in enumerate(np.linspace(-7, 7, 6)):
        pts = [(x0 * 0.8, -13.2, -3.5), (x0 * 1.25, -10.5, -9.0), (x0 * 1.2, -3.5, -10.6), (x0 * 1.05, 2.6, -9.2)]
        locks.append((m.lock(g, pts, 2.6, 0.9, 'hair', k=0.7), pts))
    mats = {
        'skin': dict(ramp=SKIN['young'], amb=0.27, wrap=0.42, noise=0.025, nfreq=1.2, ao=0.7, rim=0.25),
        'lips': dict(ramp=['#3a2230', '#6e3d2c', '#a65a48', '#c97a60', '#dc967a', '#eab092'], amb=0.3, wrap=0.45, ao=0.6),
        'hair': dict(ramp=['#2d1b1f', '#5a3a2a', '#896042', '#ae8458', '#c3a57c', '#e4cb96', '#f6e4b9'], amb=0.08,
                     wrap=0.2, lockvar=0.12, noise=0.05, nfreq=3.0, spec=0.22, shine=10, ao=2.4, rim=0.3),
        'coat': dict(ramp=['#1e1022', '#3d1626', '#571f28', '#87332e', '#b34532', '#d0603e'], amb=0.12, wrap=0.25,
                     noise=0.03, nfreq=0.9, rim=0.3),
        'shirt': dict(ramp=['#4c445c', '#8e8997', '#cfc4b8', '#ebdfc8', '#f6f4ee'], amb=0.2, wrap=0.3),
        'gold': dict(ramp=['#482826', '#8f5533', '#c38334', '#eba14d', '#f9d77a'], amb=0.2, wrap=0.2, spec=0.3),
        'ledger': dict(ramp=['#1e1022', '#2d1b1f', '#482826', '#6a4532', '#896042'], amb=0.2, wrap=0.2),
        'page': dict(ramp=['#7e6d6e', '#cfb89c', '#ebdfc8', '#f6f4ee'], amb=0.25, wrap=0.3),
    }
    r = SD.render(m, mats, bg=backdrop())
    p = Painter(r)
    strands(p, m, g, locks)
    for side, cx in ((-1, -3.5), (1, 3.5)):
        eye(p, m, g, cx, 0.1, side, w=1.9, h=1.1, iris=0.92, look=0.45, iris_cols=('earth:1', 'earth:3'), tired=0.25,
            crease='#8f5533')
        brow(p, m, g, side, 1.4, 5.6, -3.0, arch=0.55, w0=0.85, w1=0.55, col='#6a4532', dy_out=0.2)
    nostrils(p, m, g)
    mouth(p, m, g, w=1.9, y=7.28, smile=-0.12, col='#6e2f2c')
    return p.result()


def crease(p, m, g, pts, w, col, alpha=0.7, w1=None):
    """a line drawn on the face surface through local (x, y) points: wrinkles, folds, seams"""
    L = face_surface(m, g, pts)
    W = g.to_world(L + np.array([0, 0, 0.12]))
    p.line(list(W), w, SD.hexrgb(col), w1=w1, tol=1.6, alpha=alpha)


def age_lines(p, m, g, col, n_crow=2, folds=True, forehead=0, under=True, alpha=0.6):
    for sx in (-1, 1):
        for k in range(n_crow):
            crease(p, m, g, [(sx * 5.6, -0.3 + k * 0.9), (sx * 6.6, -0.6 + k * 1.3)], 0.35, col, alpha)
        if folds:
            crease(p, m, g, [(sx * 1.9, 4.2), (sx * 2.9, 5.6), (sx * 3.1, 7.4)], 0.42, col, alpha)
        if under:
            crease(p, m, g, [(sx * 2.4, 1.85), (sx * 3.5, 2.25), (sx * 4.6, 1.9)], 0.35, col, alpha * 0.8)
    for k in range(forehead):
        crease(p, m, g, [(-3.8, -5.6 - k * 1.1), (0, -5.9 - k * 1.1), (3.8, -5.6 - k * 1.1)], 0.35, col, alpha * 0.8)


# ----------------------------------------------------------------------------- Tovin
def tovin():
    """old, weathered, grey stubble, an ochre oilskin with the collar up and a sou'wester"""
    m = SD.Model()
    g = m.group((21.0, 24.4, 0), yaw=22, pitch=-2, roll=1.5, scale=1.44)
    b = m.group((22.0, 52.0, -8), yaw=8, scale=1.12)
    head(m, g, jaw=1.06, chin=1.05, nose=1.06, cheek=1.1, brow=1.2)
    # oilskin coat, collar turned up around the jaw
    m.ell(b, (0, 2.0, 0), (24.5, 10.5, 10.0), 'oilskin')
    for sx, z in ((-1, 5.8), (1, 4.6)):
        m.ell(b, (sx * 8.0, -8.0, z), (4.6, 6.2, 2.2), 'oilskin', k=1.4)
    m.paint(b, 'cap', ((0.5, -6, 10), (1.5, 14, 10), 0.45, 0.45), 'seam', on=('oilskin',))
    for yy in (-1.0, 4.5):
        m.paint(b, 'ell', ((-1.4, yy, 9.6), (0.8, 0.8, 1.2)), 'button', on=('oilskin',))
    # the sou'wester: a deep crown and a broad brim, longer at the back
    m.ell(g, (0, -8.8, -1.2), (9.9, 5.2, 10.6), 'oilskin')
    m.ell(g, (0, -6.0, 0.4), (16.5, 0.85, 15.0), 'oilskin', k=0.9)
    m.paint(g, 'ell', ((0, -6.9, -1.0), (10.3, 0.8, 11.0)), 'band', on=('oilskin',))
    # grey hair under the brim at the temples and the nape
    locks = []
    for sx in (-1, 1):
        for j, z0 in enumerate((3.0, 0.0, -3.0)):
            pts = [(sx * 8.6, -6.0, z0), (sx * 9.8, -3.5, z0), (sx * 10.0, -0.5, z0 - 0.4), (sx * 9.4, 1.4 + j * 0.5, z0 - 0.8)]
            locks.append((m.lock(g, pts, 1.6, 0.5, 'grey', k=0.6), pts))
    # a bristling grey moustache over the mouth, stubble on the jaw and lip
    m.ell(g, (0, 5.6, 8.7), (2.9, 0.95, 1.2), 'grey', k=0.5)
    for sx in (-1, 1):
        m.ell(g, (sx * 2.3, 6.4, 8.0), (1.1, 1.3, 1.0), 'grey', k=0.5)
    m.paint(g, 'ell', ((0, 7.6, 2.0), (9.6, 6.6, 9.0)), 'stubble', on=('skin', 'lips'))
    m.paint(g, 'ell', ((0, 1.6, 4.0), (8.6, 4.6, 8.0)), 'skin', on=('stubble',))
    m.paint(g, 'ell', ((0, 4.4, 9.6), (2.0, 1.4, 1.6)), 'skin', on=('stubble',))
    mats = {
        'skin': dict(ramp=SKIN['weathered'], amb=0.28, wrap=0.45, noise=0.04, nfreq=1.6, ao=0.8, rim=0.22),
        'lips': dict(ramp=SKIN['weathered'], amb=0.18, wrap=0.4, ao=0.9),
        'stubble': dict(ramp=['#2d1b1f', '#5a3a36', '#86625a', '#a6857a', '#bea092', '#d2b8a8'], amb=0.26, wrap=0.44,
                        ao=0.8, noise=0.12, nfreq=2.2, nseed=5),
        'grey': dict(ramp=['#2e2b4c', '#4c445c', '#7c7690', '#a8a8b8', '#cfd0da', '#ecebee'], amb=0.15, wrap=0.3,
                     lockvar=0.1, noise=0.08, nfreq=5.0, ao=1.5),
        'oilskin': dict(ramp=['#2d1b1f', '#5a3a1e', '#8f6326', '#b8862f', '#d6a63e', '#ecc65a'], amb=0.12, wrap=0.25,
                        noise=0.04, nfreq=1.1, spec=0.35, shine=18, rim=0.25),
        'band': dict(ramp=['#2d1b1f', '#482826', '#6e3d2c', '#8f5533'], amb=0.2, wrap=0.3),
        'seam': dict(ramp=['#2d1b1f', '#482826', '#6a4532', '#896042'], amb=0.2, wrap=0.3),
        'button': dict(ramp=['#2d1b1f', '#482826', '#6e3d2c', '#b87942'], amb=0.2, wrap=0.2, spec=0.4),
    }
    r = SD.render(m, mats, bg=backdrop())
    p = Painter(r)
    strands(p, m, g, locks, per=2)
    for side, cx in ((-1, -3.5), (1, 3.5)):
        eye(p, m, g, cx, 0.3, side, w=1.8, h=0.95, iris=0.85, look=0.4, iris_cols=('water:1', 'water:3'), squint=0.4,
            tired=1.0, crease='#5a2f2a', lid='#2d1b1f')
        brow(p, m, g, side, 1.2, 5.8, -2.8, arch=0.4, w0=1.25, w1=0.8, col='#a8a8b8', dy_out=0.5)
    age_lines(p, m, g, '#5a2f2a', n_crow=3, folds=True, forehead=0, alpha=0.7)
    nostrils(p, m, g, nose=1.06, col='#2d1b1f')
    mouth(p, m, g, w=1.7, y=7.35, smile=-0.25, col='#3a2230')
    return p.result()


# ----------------------------------------------------------------------------- Lena
def lena():
    """fifties, a greying bun, round gold spectacles, a wry look, a plum dress with a lace collar, an apron of tools"""
    m = SD.Model()
    g = m.group((21.4, 22.8, 0), yaw=22, pitch=-2, roll=-3, scale=1.46)
    b = m.group((22.0, 50.0, -8), yaw=8, scale=1.08)
    head(m, g, jaw=0.94, chin=0.9, nose=0.96, cheek=1.0)
    m.ell(b, (0, 2.0, 0), (22.0, 10.5, 10.0), 'dress')
    # the apron bib and its strap of tiny tools
    m.paint(b, 'box', ((-1.0, 6.0, 9.0), (6.4, 6.0, 4.0)), 'apron', on=('dress',))
    m.paint(b, 'cap', ((-7.6, -0.3, 10), (5.4, -0.3, 10), 0.55, 0.55), 'strap', on=('apron',))
    for k, xx in enumerate((-5.6, -3.3, -1.0, 1.4, 3.6)):
        m.cap(b, (xx, -1.6, 8.6), (xx + 0.2, 3.6, 9.0), 0.42, 0.36, 'tool' if k % 2 else 'brass', k=0.2)
    # the lace collar: a row of small scallops along the neckline
    for k in range(9):
        t = (k - 4) / 4.0
        m.ell(b, (t * 7.6, -8.6 + abs(t) * 1.6, 7.0 - abs(t) * 2.4), (1.25, 1.0, 0.8), 'lace', k=0.3)
    # greying hair swept back into a bun
    m.ell(g, (0, -5.0, -2.4), (10.0, 9.8, 10.7), 'hair')
    locks = []
    for i, x0 in enumerate(np.linspace(-7.6, 7.6, 9)):
        pts = [(x0, -4.6 - abs(x0) * 0.25, 8.6 - abs(x0) * 0.45), (x0 * 1.05, -10.6, 5.5), (x0 * 0.7, -12.6, -1.0),
               (x0 * 0.3 + 1.0, -11.0, -6.0)]
        locks.append((m.lock(g, pts, 1.9, 1.2, 'hair', k=0.8), pts))
    for sx in (-1, 1):
        pts = [(sx * 8.4, -3.0, 3.0), (sx * 10.0, -6.0, -1.0), (sx * 8.0, -10.0, -5.5), (sx * 2.0, -11.0, -7.0)]
        locks.append((m.lock(g, pts, 2.0, 1.4, 'hair', k=0.8), pts))
    m.ell(g, (1.0, -12.8, -6.5), (5.0, 4.4, 4.8), 'hair', k=0.8)
    for j in range(5):
        a = j * 1.25
        pts = [(1.0 + 4.0 * math.cos(a), -12.8 + 3.4 * math.sin(a), -3.0),
               (1.0 + 2.0 * math.cos(a + 0.8), -12.8 + 1.8 * math.sin(a + 0.8), -2.2), (1.0, -12.8, -2.0)]
        locks.append((m.lock(g, pts, 1.3, 0.6, 'hair', k=0.4), pts))
    # the grey streak at the near temple
    m.paint(g, 'cap', ((-6.0, -4.2, 8.0), (-3.0, -13.0, 4.0), 1.2, 1.2), 'streak', on=('hair',))
    mats = {
        'skin': dict(ramp=SKIN['older'], amb=0.22, wrap=0.38, noise=0.03, nfreq=1.4, ao=0.75, rim=0.25, gamma=1.15),
        'lips': dict(ramp=['#3a2230', '#6e3d2c', '#9c4a3e', '#bc6656', '#d4826c', '#e29a82'], amb=0.28, wrap=0.42, ao=0.7),
        'hair': dict(ramp=['#2e2b4c', '#584951', '#7e6d6e', '#a18f85', '#bfb2a8', '#d8d0c8'], amb=0.1, wrap=0.25,
                     lockvar=0.1, noise=0.05, nfreq=3.0, spec=0.18, shine=10, ao=2.0, rim=0.25),
        'streak': dict(ramp=['#4c445c', '#8e8997', '#b3b6c4', '#d8dae2', '#f0f0f4'], amb=0.15, wrap=0.25, ao=1.5),
        'dress': dict(ramp=['#1a1334', '#36195a', '#522a84', '#6e3a96', '#8d58b0', '#a878c4'], amb=0.12, wrap=0.25,
                      noise=0.03, nfreq=1.0, rim=0.25),
        'apron': dict(ramp=['#2d1b1f', '#482826', '#6e3d2c', '#8f5533', '#b87942'], amb=0.15, wrap=0.3, noise=0.04, nfreq=2),
        'strap': dict(ramp=['#1e1022', '#2d1b1f', '#482826', '#6e3d2c'], amb=0.2, wrap=0.3),
        'tool': dict(ramp=['#2e2b4c', '#66637f', '#b3b6c4', '#e2e0de', '#f6f4ee'], amb=0.2, wrap=0.2, spec=0.5),
        'brass': dict(ramp=['#482826', '#8f5533', '#c38334', '#eba14d', '#f9d77a'], amb=0.2, wrap=0.2, spec=0.5),
        'lace': dict(ramp=['#66637f', '#a99fa8', '#d8cfc4', '#efe6d8', '#fbf6ee'], amb=0.28, wrap=0.4),
    }
    r = SD.render(m, mats, bg=backdrop())
    p = Painter(r)
    strands(p, m, g, locks, per=3)
    for side, cx in ((-1, -3.5), (1, 3.5)):
        eye(p, m, g, cx, 0.1, side, w=1.8, h=0.9, iris=0.85, look=0.55, iris_cols=('roof_green:2', 'roof_green:4'),
            tired=0.4, crease='#6e3d2c')
        brow(p, m, g, side, 1.3, 5.6, -3.2 - (0.7 if side < 0 else 0.0), arch=0.6 if side < 0 else 0.35, w0=0.8, w1=0.5,
             col='#7e6d6e', dy_out=0.1)
    # round gold spectacles: a ring around each eye on the face plane, a glint on the near lens, a bridge
    for side, cx in ((-1, -3.5), (1, 3.5)):
        ring = [g.to_world([[cx + 2.45 * math.cos(a), 0.2 + 2.25 * math.sin(a), 9.7]])[0] for a in np.linspace(0, 2 * math.pi, 41)]
        p.line(ring, 0.85, C('gold:1'), tol=2.8)
        p.line(ring[22:36], 0.5, C('gold:4'), tol=2.8)
        if side < 0:
            gl = [g.to_world([[cx - 1.2 + 0.5 * t, -0.9 + 0.6 * t, 9.4]])[0] for t in (0, 1)]
            p.line(gl, 0.35, SD.hexrgb('#f6f4ee'), tol=2.5, alpha=0.8)
    p.line(list(g.to_world([[-1.1, -0.3, 9.9], [0, -0.9, 10.3], [1.1, -0.3, 9.9]])), 0.7, C('gold:1'), tol=2.8)
    p.line(list(g.to_world([[-6.0, -0.3, 8.0], [-8.6, 0.0, 4.0]])), 0.45, C('gold:2'), tol=2.0)
    age_lines(p, m, g, '#7a4a3a', n_crow=2, folds=True, forehead=1, alpha=0.5)
    nostrils(p, m, g, nose=0.96)
    # the wry mouth: one corner up
    L = face_surface(m, g, [(x, 7.3 - 0.35 * max(0, x) ** 1.4 / 1.8 + 0.05 * x) for x in np.linspace(-1.8, 1.9, 11)])
    p.line(list(g.to_world(L + np.array([0, 0, 0.1]))), 0.5, SD.hexrgb('#6e2f2c'), tol=1.5)
    return p.result()


# ----------------------------------------------------------------------------- Aurel
def aurel():
    """the Nameless King unmasked: Elian's face grown old and tired, bald on the crown like his field sprite, long grey
    hair from the temples, a long grey beard, a silver robe with a high collar"""
    m = SD.Model()
    g = m.group((21.0, 22.0, 0), yaw=24, pitch=-4, roll=-2, scale=1.44)
    b = m.group((22.0, 53.0, -8), yaw=10, scale=1.12)
    head(m, g, jaw=1.0, chin=0.95, nose=1.02, cheek=1.05, brow=1.15)
    m.ell(b, (0, 2.0, 0), (24.0, 10.5, 10.0), 'robe')
    for sx, z in ((-1, 5.0), (1, 3.8)):
        m.ell(b, (sx * 9.6, -9.0, z), (4.4, 7.0, 1.8), 'robe', k=1.4)
        m.paint(b, 'cap', ((sx * 5.4, -15.6, z + 1.8), (sx * 13.6, -3.0, z + 1.8), 0.55, 0.55), 'trim', on=('robe',))
    # the long grey beard from the cheeks to the chest (locks over a small base), a moustache over it
    m.ell(g, (0, 9.0, 4.6), (6.4, 6.4, 4.4), 'beard', k=1.2)
    locks = []
    rng = np.random.RandomState(13)
    for i, x0 in enumerate(np.linspace(-6.4, 6.4, 13)):
        zf = 8.2 - (x0 / 6.4) ** 2 * 4.0
        pts = [(x0, 2.6 + abs(x0) * 0.3, zf - 0.6), (x0 * 1.02, 8.5, zf + 0.2),
               (x0 * 0.78 + rng.uniform(-0.4, 0.4), 14.0, zf - 1.2), (x0 * 0.4 + rng.uniform(-0.8, 0.8), 19.0 + rng.uniform(-1.5, 1.0), zf - 3.0)]
        locks.append((m.lock(g, pts, 1.5, 0.45, 'beard', k=1.5), pts))
    for sx in (-1, 1):
        pts = [(sx * 0.5, 5.15, 9.6), (sx * 2.0, 5.3, 9.3), (sx * 3.2, 6.4, 8.4), (sx * 3.7, 8.4, 7.4)]
        locks.append((m.lock(g, pts, 1.05, 0.4, 'beard', k=0.5), pts))
    # grey hair: the crown of his head is bald (as his field sprite, npc_aurel), long grey hair falls from the temples
    # and the back of the head past the ears to the collar
    for sx in (-1, 1):
        for j, z0 in enumerate((3.6, 1.2, -1.2, -3.6, -6.0, -8.2)):
            L = 6.0 + (j * 1.4) + rng.uniform(-1.0, 1.0)
            wav = 0.7 * (1 if j % 2 else -1)
            pts = [(sx * 8.4, -6.4 + j * 0.25, z0), (sx * (10.4 + wav * 0.4), -2.6, z0 + 0.4),
                   (sx * (10.3 - wav * 0.5), 1.0 + L * 0.4, z0 - 0.4), (sx * (10.0 + j * 0.35 + wav * 0.3), 3.0 + L, z0 - 1.2)]
            locks.append((m.lock(g, pts, 1.75, 0.5, 'hair', k=1.3), pts))
    for x0 in np.linspace(-6.0, 6.0, 7):
        pts = [(x0, -7.0, -8.6), (x0 * 1.15, -2.0, -10.2), (x0 * 1.1, 4.0, -9.6), (x0, 9.0, -8.2)]
        locks.append((m.lock(g, pts, 2.0, 0.8, 'hair', k=1.3), pts))
    mats = {
        'skin': dict(ramp=SKIN['pale'], amb=0.24, wrap=0.42, noise=0.035, nfreq=1.6, ao=0.85, rim=0.3),
        'lips': dict(ramp=SKIN['pale'], amb=0.2, wrap=0.4, ao=0.9),
        'beard': dict(ramp=['#2e2b4c', '#4c445c', '#787080', '#a09ca6', '#c8c6cc', '#e6e4e6'], amb=0.16, wrap=0.35,
                      lockvar=0.1, ao=1.2, rim=0.2),
        'hair': dict(ramp=['#2e2b4c', '#4c445c', '#7a7488', '#a29eaa', '#c8c4cc', '#e4e2e6'], amb=0.12, wrap=0.3,
                     lockvar=0.1, spec=0.15, shine=10, ao=1.4, rim=0.25),
        'band': dict(ramp=['#66637f', '#a8a8b8', '#d0d0d8', '#ecebee'], amb=0.2, wrap=0.3),
        'robe': dict(ramp=['#1d2034', '#2e2b4c', '#4c4f6c', '#7c809c', '#a8acc4', '#d0d4e2'], amb=0.12, wrap=0.25,
                     noise=0.03, nfreq=1.0, spec=0.2, shine=16, rim=0.3, rimcol='#6ab3e4'),
        'trim': dict(ramp=['#1d3775', '#24559b', '#3e88ca', '#6ab3e4', '#b4e4f2'], amb=0.25, wrap=0.3, spec=0.3),
    }
    r = SD.render(m, mats, bg=backdrop())
    p = Painter(r)
    strands(p, m, g, locks, per=3)
    for side, cx in ((-1, -3.5), (1, 3.5)):
        eye(p, m, g, cx, 0.2, side, w=1.85, h=0.82, iris=0.85, look=0.45, iris_cols=('earth:1', 'earth:3'), tired=1.2,
            squint=0.1, crease='#6b4a52', lid='#2e2b4c')
        brow(p, m, g, side, 1.2, 5.8, -2.9, arch=0.3, w0=1.15, w1=0.7, col='#b3b6c4', dy_out=0.7)
    age_lines(p, m, g, '#6b4a52', n_crow=3, folds=False, forehead=2, alpha=0.6)
    nostrils(p, m, g, nose=1.02, col='#3a2a3a')
    return p.result()


# ----------------------------------------------------------------------------- Anwen
def anwen():
    """sixties, a grey habit and veil stitched with silver thread, a white wimple, kind eyes"""
    m = SD.Model()
    g = m.group((21.4, 22.8, 0), yaw=20, pitch=-3, roll=-2, scale=1.46)
    b = m.group((22.0, 53.0, -8), yaw=8, scale=1.12)
    m.ell(b, (0, 2.0, 0), (23.0, 11.0, 10.0), 'habit')
    # the veil: a grey hood, open at the face, falling to the shoulders
    m.ell(g, (0, -2.4, -2.4), (12.6, 14.8, 12.2), 'veil', k=0.5)
    m.cap(g, (-11.4, 2.0, -3.0), (-14.8, 22.0, -2.0), 2.6, 5.2, 'veil', k=1.6)
    m.cap(g, (11.4, 2.0, -3.0), (14.8, 22.0, -2.0), 2.6, 5.2, 'veil', k=1.6)
    m.sub(g, 'ell', ((0, 1.6, 9.6), (9.2, 12.0, 6.4)), k=0.8)
    # the wimple: white linen framing the face inside the veil, under the chin
    m.ell(g, (0, 1.6, 0.2), (10.6, 13.4, 10.6), 'linen', k=0.4)
    m.cap(g, (0, 9.0, -0.5), (0, 19.0, -1.5), 7.4, 9.4, 'linen', k=1.4)
    m.sub(g, 'ell', ((0, 1.0, 9.8), (7.2, 9.6, 5.4)), k=0.8)
    head(m, g, jaw=0.95, chin=0.9, nose=0.95, cheek=1.05, ears=False, neck=False)
    m.ell(g, (0, -6.9, 4.4), (8.6, 2.0, 6.4), 'linen', k=0.35)
    # silver thread: a band along the veil's edge and a running stitch on the brow band
    m.paint(g, 'ell', ((0, 1.6, 9.6), (10.3, 13.1, 7.4)), 'silver', on=('veil',))
    m.paint(g, 'ell', ((0, -6.9, 4.4), (8.8, 0.35, 6.6)), 'silver', on=('linen',))
    mats = {
        'skin': dict(ramp=SKIN['older'], amb=0.3, wrap=0.45, noise=0.03, nfreq=1.4, ao=0.6, rim=0.15, shadow_floor=0.35),
        'lips': dict(ramp=SKIN['older'], amb=0.24, wrap=0.42, ao=0.7, shadow_floor=0.35),
        'linen': dict(ramp=['#4c445c', '#8e8997', '#c8c0bc', '#e6e0d8', '#f6f4ee', '#fbfaf6'], amb=0.25, wrap=0.4,
                      ao=1.2, noise=0.02, nfreq=1.5),
        'veil': dict(ramp=['#1d1a2c', '#2e2b4c', '#4c445c', '#66637f', '#8e8997', '#b3b6c4'], amb=0.12, wrap=0.25,
                     noise=0.03, nfreq=1.2, ao=1.4, rim=0.25),
        'silver': dict(ramp=['#66637f', '#a8a8b8', '#d0d0d8', '#f6f4ee'], amb=0.3, wrap=0.3, spec=0.4),
        'habit': dict(ramp=['#1d1a2c', '#2e2b4c', '#4c445c', '#66637f', '#8e8997'], amb=0.12, wrap=0.25, noise=0.03,
                      nfreq=1.0, rim=0.25),
    }
    r = SD.render(m, mats, bg=backdrop())
    p = Painter(r)
    for side, cx in ((-1, -3.5), (1, 3.5)):
        eye(p, m, g, cx, 0.2, side, w=1.75, h=0.85, iris=0.82, look=0.4, iris_cols=('stone_cool:2', 'stone_cool:4'),
            tired=0.8, squint=0.15, crease='#6e3d2c')
        brow(p, m, g, side, 1.4, 5.4, -3.0, arch=0.55, w0=0.75, w1=0.45, col='#8e8997', dy_out=0.3)
    age_lines(p, m, g, '#7a4a3a', n_crow=3, folds=True, forehead=0, alpha=0.5)
    nostrils(p, m, g, nose=0.95)
    mouth(p, m, g, w=1.8, y=7.25, smile=0.35, col='#6e2f2c')
    # a small silver pendant at the collar
    W = b.to_world([[-1.0, -8.6, 10.6]])[0]
    p.dot(W[0], W[1], 0.9, C('metal:3'))
    p.dot(W[0] - 0.3, W[1] - 0.3, 0.35, C('metal:4'))
    return p.result()


PAINTERS = {'elian': elian, 'anwen': anwen, 'tovin': tovin, 'lena': lena, 'aurel': aurel}
_CANVAS = {}


def canvas(pid):
    if pid not in _CANVAS:
        _CANVAS[pid] = PAINTERS[pid]()
    return _CANVAS[pid]


# the 32 px menu portrait is a tighter crop on the face (x0, y0, size in portrait units)
CROP32 = {'elian': (5, 2, 38)}


def portrait(pid, n):
    if n == 48:
        return finish(canvas(pid), 48, k=26)
    return finish(canvas(pid), 32, k=20, crop=CROP32.get(pid, (4, 1, 38)))
