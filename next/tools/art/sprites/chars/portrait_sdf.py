"""W12 (CRITIQUE_4 item 5): a tiny signed-distance-field portrait renderer for the Episode 2 cast.

The W11-era Episode 2 portraits were flat 2D shapes: frontal, symmetric, one flat skin step, hair as one mass, no
light direction. The Episode 1 portraits are downscaled paintings: three-quarter view, a key light from the upper
left, 4 to 5 skin steps, hair in lit and shadowed clusters, shoulders. To reach that without a painting, each
character is modelled here as a handful of smooth-unioned primitives (ellipsoids, tapered capsules, curved hair
locks) in head and body groups, turned three-quarters toward the dialogue text, ray-marched orthographically at 6x,
lit from the upper left (wrap diffuse, soft cast shadows so the fringe and the nose throw shade, ambient occlusion
in the creases), mapped onto each material's ramp, then the small features (eyes, brows, mouth, spectacles, stitch
lines) are painted in screen space at their projected 3D positions. `finish` downscales, quantizes to a per-portrait
palette harmonized to the master palette, despeckles and frames exactly like every other portrait.

Coordinates: portrait units (46 = the frame interior at 48 px); x right, y DOWN, z toward the viewer. A group's yaw
turns its +z (the face) toward +x (the viewer's right, toward the dialogue text).

    m = Model(); g = m.group('head', origin, yaw, pitch, roll, scale)
    m.ell(g, c, r, mat, k=..)   m.cap(g, a, b, r0, r1, mat, k=..)   m.lock(g, pts, r0, r1, mat)   m.sub(...)
    m.paint(g, 'ell', c, r, mat, on=('skin',))          a material decal on the surface inside a volume
    img = render(m, MATS, light=...)                     -> Render (rgb, depth, mat, normal, lock tag)
"""
import math
import numpy as np

S = 6
U = 46
N = U * S


def _rot(yaw, pitch, roll):
    y, p, r = (math.radians(v) for v in (yaw, pitch, roll))
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(p), -math.sin(p)], [0, math.sin(p), math.cos(p)]])
    Rz = np.array([[math.cos(r), -math.sin(r), 0], [math.sin(r), math.cos(r), 0], [0, 0, 1]])
    return Ry @ Rx @ Rz


class Group:
    def __init__(self, origin, yaw=0.0, pitch=0.0, roll=0.0, scale=1.0):
        self.o = np.asarray(origin, np.float64)
        self.R = _rot(yaw, pitch, roll)
        self.s = float(scale)

    def to_local(self, P):
        return ((P - self.o) @ self.R) / self.s

    def to_world(self, L):
        return (np.asarray(L, np.float64) * self.s) @ self.R.T + self.o

    def dir_world(self, v):
        return np.asarray(v, np.float64) @ self.R.T


def sd_ell(q, c, r):
    p = (q - c) / r
    k0 = np.sqrt((p * p).sum(1))
    k1 = np.sqrt(((p / r) ** 2).sum(1))
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sd_cap(q, a, b, r0, r1):
    pa = q - a
    ba = b - a
    h = np.clip((pa @ ba) / max(float(ba @ ba), 1e-9), 0, 1)
    return np.sqrt(((pa - h[:, None] * ba) ** 2).sum(1)) - (r0 + (r1 - r0) * h)


def sd_box(q, c, r, rad=0.0):
    d = np.abs(q - c) - (np.asarray(r) - rad)
    return np.sqrt((np.maximum(d, 0) ** 2).sum(1)) + np.minimum(d.max(1), 0) - rad


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def bezier(pts, n):
    pts = np.asarray(pts, np.float64)
    out = []
    for i in range(n + 1):
        t = i / n
        p = pts.copy()
        while len(p) > 1:
            p = p[:-1] * (1 - t) + p[1:] * t
        out.append(p[0])
    return np.array(out)


class Prim:
    __slots__ = ('kind', 'args', 'mat', 'op', 'k', 'g', 'tag', 'on', 'lo', 'hi')

    def __init__(self, kind, args, mat, op, k, g, tag=-1, on=None):
        self.kind, self.args, self.mat, self.op, self.k, self.g, self.tag, self.on = kind, args, mat, op, k, g, tag, on
        self.lo = self.hi = None

    def dist(self, q):
        if self.kind == 'ell':
            return sd_ell(q, *self.args)
        if self.kind == 'cap':
            return sd_cap(q, *self.args)
        if self.kind == 'box':
            return sd_box(q, *self.args)
        if self.kind == 'chain':                 # a lock: tapered capsules along a bezier
            pts, rs = self.args
            d = None
            for i in range(len(pts) - 1):
                di = sd_cap(q, pts[i], pts[i + 1], rs[i], rs[i + 1])
                d = di if d is None else np.minimum(d, di)
            return d
        raise ValueError(self.kind)


class Model:
    def __init__(self):
        self.groups = []
        self.prims = []
        self.paints = []
        self.mats = {}
        self.nlocks = 0

    def group(self, origin, yaw=0.0, pitch=0.0, roll=0.0, scale=1.0):
        g = Group(origin, yaw, pitch, roll, scale)
        self.groups.append(g)
        return g

    def _mid(self, mat):
        if mat not in self.mats:
            self.mats[mat] = len(self.mats)
        return self.mats[mat]

    def ell(self, g, c, r, mat, k=0.0):
        self.prims.append(Prim('ell', (np.array(c, float), np.array(r, float)), self._mid(mat), 'u', k, g))

    def cap(self, g, a, b, r0, r1, mat, k=0.0):
        self.prims.append(Prim('cap', (np.array(a, float), np.array(b, float), float(r0), float(r1)), self._mid(mat), 'u', k, g))

    def box(self, g, c, r, mat, rad=0.0, k=0.0):
        self.prims.append(Prim('box', (np.array(c, float), np.array(r, float), rad), self._mid(mat), 'u', k, g))

    def lock(self, g, pts, r0, r1, mat, k=0.25, n=5):
        p = bezier(pts, n)
        rs = np.linspace(r0, r1, n + 1)
        self.prims.append(Prim('chain', (p, rs), self._mid(mat), 'u', k, g, tag=self.nlocks))
        self.nlocks += 1
        return self.nlocks - 1

    def sub(self, g, kind, args, k=0.0):
        a = tuple(np.array(v, float) if isinstance(v, (list, tuple)) else v for v in args)
        self.prims.append(Prim(kind, a, -1, 's', k, g))

    def paint(self, g, kind, args, mat, on=None, soft=0.0):
        """a material decal: surface points inside the volume (distance < soft) take `mat` (only over `on` mats)"""
        a = tuple(np.array(v, float) if isinstance(v, (list, tuple)) else v for v in args)
        on_ids = None if on is None else tuple(self._mid(m) for m in on)
        self.paints.append(Prim(kind, a, self._mid(mat), 'p', soft, g, on=on_ids))

    # ------------------------------------------------------------------ evaluation
    def eval(self, P, want_mat=False):
        loc = [g.to_local(P) for g in self.groups]
        gi = {id(g): i for i, g in enumerate(self.groups)}
        n = len(P)
        d = np.full(n, 1e9)
        if want_mat:
            mat = np.full(n, -1, np.int32)
            tag = np.full(n, -1, np.int32)
        for pr in self.prims:
            q = loc[gi[id(pr.g)]]
            di = pr.dist(q) * pr.g.s
            if pr.op == 'u':
                if want_mat:
                    # the closest surface so far owns the point (a later subtraction can hand it to a later prim)
                    u = di < d
                    mat[u] = pr.mat
                    tag[u] = pr.tag
                d = smin(d, di, pr.k)
            else:
                d = smax(d, -di, pr.k)
        if not want_mat:
            return d
        for pr in self.paints:
            q = loc[gi[id(pr.g)]]
            di = pr.dist(q) * pr.g.s
            m = di < pr.k
            if pr.on is not None:
                m &= np.isin(mat, pr.on)
            mat[m] = pr.mat
        return d, mat, tag


class Render:
    pass


def march(model, X, Y, z0=60.0, zmax=140.0, iters=220):
    n = X.size
    t = np.zeros(n)
    hit = np.zeros(n, bool)
    alive = np.ones(n, bool)
    for _ in range(iters):
        idx = np.nonzero(alive)[0]
        if not len(idx):
            break
        P = np.stack([X[idx], Y[idx], z0 - t[idx]], 1)
        d = model.eval(P)
        h = d < 0.01
        hit[idx[h]] = True
        alive[idx[h]] = False
        step = np.maximum(d * 0.75, 0.004)
        t[idx[~h]] += step[~h]
        alive &= t < zmax
    return hit, z0 - t


def normals(model, P, e=0.08):
    k = np.array([[1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1]], np.float64)
    nn = np.zeros_like(P)
    for v in k:
        nn += v[None, :] * model.eval(P + v * e)[:, None]
    return nn / np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-9)


def soft_shadow(model, P, L, k=7.0, steps=40, t0=0.35, tmax=24.0):
    res = np.ones(len(P))
    t = np.full(len(P), t0)
    alive = np.ones(len(P), bool)
    for _ in range(steps):
        idx = np.nonzero(alive)[0]
        if not len(idx):
            break
        d = model.eval(P[idx] + L[None, :] * t[idx, None])
        res[idx] = np.minimum(res[idx], np.clip(k * d / t[idx], 0, 1))
        t[idx] += np.clip(d, 0.08, 1.5)
        dead = (d < 0.002) | (t[idx] > tmax)
        res[idx[d < 0.002]] = 0
        alive[idx[dead]] = False
    return np.clip(res, 0, 1)


def occlusion(model, P, Nn, n=5, step=0.55):
    occ = np.zeros(len(P))
    w = 1.0
    for i in range(1, n + 1):
        h = step * i
        d = model.eval(P + Nn * h)
        occ += w * np.clip(h - d, 0, None)
        w *= 0.6
    return np.clip(1 - 0.32 * occ, 0, 1)


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float64) / 255


def ramp_lookup(ramp, v):
    cols = np.array([hexrgb(c) for c in ramp])
    x = np.clip(v, 0, 1) * (len(cols) - 1)
    i = np.clip(np.floor(x).astype(int), 0, len(cols) - 2)
    f = (x - i)[:, None]
    return cols[i] * (1 - f) + cols[i + 1] * f


def value_noise(P, freq, seed):
    """smooth pseudo-noise in [-1, 1] from a few random plane waves (deterministic)"""
    rng = np.random.RandomState(seed)
    v = np.zeros(len(P))
    for _ in range(5):
        d = rng.normal(size=3)
        d /= np.linalg.norm(d)
        v += np.sin(P @ d * freq * rng.uniform(0.7, 1.4) + rng.uniform(0, 6.28))
    return v / 2.2


def render(model, mats, light=(-0.55, -0.62, 0.56), bg=None, fill=(0.45, -0.1, 0.3)):
    """mats: {name: dict(ramp=[hex dark..light], amb=0.18, wrap=0.3, spec=0.0, gamma=1.0, noise=0.0, lockvar=0.0)}"""
    xs = (np.arange(N) + 0.5) / S
    X, Y = np.meshgrid(xs, xs)
    X, Y = X.ravel(), Y.ravel()
    hit, z = march(model, X, Y)
    r = Render()
    r.hit = hit.reshape(N, N)
    r.depth = np.where(hit, z, -1e9).reshape(N, N)
    idx = np.nonzero(hit)[0]
    P = np.stack([X[idx], Y[idx], z[idx]], 1)
    Nn = normals(model, P)
    _, mat, tag = model.eval(P, want_mat=True)
    L = np.asarray(light, np.float64)
    L /= np.linalg.norm(L)
    F = np.asarray(fill, np.float64)
    F /= np.linalg.norm(F)
    sh = soft_shadow(model, P + Nn * 0.05, L)
    ao = occlusion(model, P, Nn)
    rgb = np.zeros((N * N, 3))
    if bg is not None:
        rgb[:] = bg.reshape(-1, 3)
    names = {v: k for k, v in model.mats.items()}
    out_col = np.zeros((len(idx), 3))
    val = np.zeros(len(idx))
    for mid, name in names.items():
        sel = mat == mid
        if not sel.any():
            continue
        spec = mats[name]
        ndl = Nn[sel] @ L
        w = spec.get('wrap', 0.3)
        dif = np.clip((ndl + w) / (1 + w), 0, 1)
        lit = dif * (sh[sel] * (1 - spec.get('shadow_floor', 0.0)) + spec.get('shadow_floor', 0.0))
        v = spec.get('amb', 0.16) + (1 - spec.get('amb', 0.16)) * lit
        v = v * (ao[sel] ** spec.get('ao', 1.0))
        v += spec.get('fill', 0.06) * np.clip(Nn[sel] @ F, 0, 1)
        if spec.get('noise'):
            v += spec['noise'] * value_noise(P[sel], spec.get('nfreq', 1.6), spec.get('nseed', 1))
        if spec.get('lockvar'):
            t = tag[sel]
            rng = np.random.RandomState(spec.get('nseed', 7))
            offs = rng.uniform(-1, 1, size=max(model.nlocks, 1))
            v += np.where(t >= 0, offs[np.clip(t, 0, None)] * spec['lockvar'], 0)
        if spec.get('spec'):
            Hh = L + np.array([0, 0, 1.0])
            Hh /= np.linalg.norm(Hh)
            sp = np.clip(Nn[sel] @ Hh, 0, 1) ** spec.get('shine', 24) * sh[sel]
            v += spec['spec'] * sp
        v = np.clip(v, 0, 1) ** spec.get('gamma', 1.0)
        val[sel] = v
        col = ramp_lookup(spec['ramp'], v)
        if spec.get('rim'):
            # a cool rim from the backdrop on the far (shadow) edge, as in the painted Episode 1 portraits
            nz = Nn[sel][:, 2]
            k = spec['rim'] * np.clip(1 - nz, 0, 1) ** 3 * np.clip(Nn[sel][:, 0] * 1.2 + 0.1, 0, 1)
            col = col * (1 - k[:, None]) + hexrgb(spec.get('rimcol', '#6891d9'))[None, :] * k[:, None]
        out_col[sel] = col
    rgb[idx] = out_col
    r.rgb = rgb.reshape(N, N, 3)
    r.mat = np.full(N * N, -1, np.int32)
    r.mat[idx] = mat
    r.mat = r.mat.reshape(N, N)
    r.tag = np.full(N * N, -1, np.int32)
    r.tag[idx] = tag
    r.tag = r.tag.reshape(N, N)
    r.val = np.zeros(N * N)
    r.val[idx] = val
    r.val = r.val.reshape(N, N)
    r.normal = np.zeros((N * N, 3))
    r.normal[idx] = Nn
    r.normal = r.normal.reshape(N, N, 3)
    r.model = model
    return r


def project(g, local_pts):
    """local points of a group -> (screen x, y in portrait units, world z)"""
    W = g.to_world(np.atleast_2d(local_pts))
    return W


def visible(r, W, tol=0.6):
    """True per world point when it is on (or in front of) the rendered surface"""
    out = []
    for x, y, z in W:
        i, j = int(min(N - 1, max(0, y * S))), int(min(N - 1, max(0, x * S)))
        out.append(z >= r.depth[i, j] - tol)
    return np.array(out)
