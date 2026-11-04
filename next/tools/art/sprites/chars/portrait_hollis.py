"""Hollis, the Archivist of the Deep Stacks (CRITIQUE_STACKS 21: he spoke with a name tab and no portrait).

The W12 SDF portrait renderer (portraits_w12.py: three-quarter view, key light upper left, hair in clusters, shoulders),
matched to his field sprite `npc_scholar`: indigo hair drawn up into a knot on the crown, a blue Keeper's robe with gold
piping down the front. The rest is from his record (cave/text.js HOLLIS): the one Keeper who stayed down when the
Archive went quiet, dry and kind. So: late fifties, pale from years under the library, grey at the temples, small
round reading lenses low on the nose, a level look over them and the corner of a smile.

    hollis()             -> the 6x render with the figure mask (rgba float)
    portrait(n)          -> n x n rgba with the 1 px bevel frame (48 for dialogue, 32 for menus)
"""
import numpy as np
import portrait_sdf as SD
import portraits_w12 as W


def hollis():
    m = SD.Model()
    g = m.group((21.2, 23.6, 0), yaw=22, pitch=-3, roll=-1.5, scale=1.44)
    b = m.group((22.0, 50.5, -8), yaw=9, scale=1.14)
    W.head(m, g, jaw=0.97, chin=1.0, nose=1.08, cheek=0.95, brow=1.1)
    # the Keeper's robe: narrow shoulders, a high crossed collar, gold piping down the front edge
    m.ell(b, (0, 2.0, 0), (22.5, 10.5, 10.0), 'robe')
    for sx, z in ((-1, 5.6), (1, 4.4)):
        m.ell(b, (sx * 6.8, -7.6, z), (4.0, 5.6, 2.0), 'robe', k=1.5)
    m.paint(b, 'cap', ((-3.8, -9.5, 9.2), (2.6, 12, 9.4), 0.7, 0.7), 'gold', on=('robe',))
    m.paint(b, 'cap', ((4.6, -9.5, 8.4), (-0.6, 3.0, 9.6), 0.6, 0.6), 'gold', on=('robe',))
    # hair: indigo, combed back flat over the skull, grey at the temples, drawn up into a knot on the crown
    m.ell(g, (0, -6.6, -3.0), (9.7, 8.6, 10.0), 'hair')
    m.ell(g, (0.4, -14.4, -3.2), (3.8, 3.2, 3.8), 'hair', k=0.6)          # the knot
    m.paint(g, 'ell', ((0.4, -12.2, -3.0), (3.2, 0.7, 3.4)), 'gold', on=('hair',))   # its band
    locks = []
    for i, x0 in enumerate(np.linspace(-6.5, 6.5, 7)):
        pts = [(x0 * 0.85, -9.4, 7.4), (x0 * 0.65, -12.2, 3.6), (x0 * 0.35, -13.2, -0.6), (x0 * 0.1, -12.8, -3.4)]
        locks.append((m.lock(g, pts, 1.7, 0.6, 'hair', k=0.6), pts))
    for sx in (-1, 1):
        for j, z0 in enumerate((3.6, 0.6, -2.6)):
            pts = [(sx * 8.0, -8.6, z0), (sx * 9.4, -5.8, z0), (sx * 9.6, -2.6, z0 - 0.4), (sx * 9.1, -0.6 + j * 0.4, z0 - 1.0)]
            locks.append((m.lock(g, pts, 1.3, 0.45, 'grey' if j == 0 else 'hair', k=0.6), pts))
    mats = {
        'skin': dict(ramp=W.SKIN['pale'], amb=0.3, wrap=0.45, noise=0.035, nfreq=1.4, ao=0.7, rim=0.18, shadow_floor=0.3),
        'lips': dict(ramp=W.SKIN['pale'], amb=0.22, wrap=0.42, ao=0.8),
        'hair': dict(ramp=['#14101e', '#1d1a2c', '#2a2258', '#3e3478', '#56499a', '#7666b8'], amb=0.1, wrap=0.22,
                     lockvar=0.12, noise=0.05, nfreq=3.5, spec=0.25, shine=12, ao=2.0, rim=0.3),
        'grey': dict(ramp=['#1d1a2c', '#2e2b4c', '#4c445c', '#66637f', '#8e8997', '#a8a8b8'], amb=0.15, wrap=0.3,
                     lockvar=0.1, noise=0.08, nfreq=5.0, ao=1.5),
        'robe': dict(ramp=['#14101e', '#1d2a58', '#24407e', '#2f5aa6', '#4378c4', '#6a9ad8'], amb=0.12, wrap=0.26,
                     noise=0.03, nfreq=1.0, rim=0.28),
        'gold': dict(ramp=['#482826', '#8f5533', '#c38334', '#eba14d', '#f9d77a'], amb=0.2, wrap=0.2, spec=0.35),
    }
    r = SD.render(m, mats, bg=W.backdrop())
    p = W.Painter(r)
    W.strands(p, m, g, locks, per=2)
    for side, cx in ((-1, -3.5), (1, 3.5)):
        W.eye(p, m, g, cx, 0.2, side, w=1.75, h=0.9, iris=0.85, look=0.5, iris_cols=('stone_cool:1', 'stone_cool:3'),
              tired=0.7, squint=0.2, crease='#6b4448', lid='#3a2a3a')
        W.brow(p, m, g, side, 1.3, 5.6, -3.0, arch=0.35, w0=1.1, w1=0.7, col='#a8a8b8', dy_out=0.4)
    W.age_lines(p, m, g, '#6b4448', n_crow=2, folds=True, forehead=1, alpha=0.5)
    W.nostrils(p, m, g, nose=1.08, col='#3a2a3a')
    W.mouth(p, m, g, w=1.7, y=7.3, smile=0.22, col='#5a2f2a')
    # the reading lenses: two small gold rims low on the nose, a bridge between them, a white glint on the near one
    gold, glint = SD.hexrgb('#eba14d'), SD.hexrgb('#f6f4ee')
    for sx in (-1, 1):
        ring = [(sx * 3.5 + 1.9 * np.cos(a), 1.6 + 1.5 * np.sin(a)) for a in np.linspace(0, 2 * np.pi, 13)]
        L = W.face_surface(m, g, ring)
        p.line(list(g.to_world(L + np.array([0, 0, 0.35]))), 0.5, gold, tol=2.5)
    L = W.face_surface(m, g, [(-1.6, 1.0), (0, 0.7), (1.6, 1.0)])
    p.line(list(g.to_world(L + np.array([0, 0, 0.35]))), 0.45, gold, tol=2.5)
    L = W.face_surface(m, g, [(-4.4, 0.8)])
    Wp = g.to_world(L + np.array([0, 0, 0.4]))[0]
    p.dot(Wp[0], Wp[1], 0.45, glint)
    return p.result()


_CANVAS = []


def canvas():
    if not _CANVAS:
        _CANVAS.append(hollis())
    return _CANVAS[0]


def portrait(n):
    if n == 48:
        return W.finish(canvas(), 48, k=26)
    return W.finish(canvas(), 32, k=20, crop=(4, 1, 38))
