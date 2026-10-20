"""Field avatar of the Archivore (W8-art, CRITIQUE_3 #10): the same creature as the battle boss at map scale.

The battle sprite (bosses_battle `archivore`) is an open book with one great gold eye, fanned parchment
wings, violet horns, a gold blade under the book and violet ink tendrils. Its map stand-in was a small book
with an eye that read as a beetle on a rug. This one is drawn from shapes at 1x (no downscale mush): every
part is a mask painted with its own ramp (base, a lit top edge, a shaded bottom edge) and a 1 px outline in
the dark of that ramp, back to front, so overlaps get clean separation lines. The eye is hand-pixeled.

    frames()  -> [rgba, rgba, rgba]  (W x H, feet = bottom-centre, the body hovers HOVER px above the feet)
    frame 0: wings up, body 1 px low   frame 1: wings down, body high   frame 2: wings level (in-between)
The field code alternates _0 and _1 (a slow flap with a 1 px hover bob); the atlas anim plays 0, 2, 1, 2.
Facing: frontal and symmetric, so the field's left/right flip changes nothing.
"""
import math
import numpy as np
from PIL import Image, ImageDraw
import pal as P
from pix import hex2rgb

W, H = 55, 52
CX = 27              # centre column (the sprite is 27 + 1 + 27 wide)
HOVER = 5            # empty rows between the lowest pixel and the feet row (the shadow shows there)
WHO = 'archivore_avatar'


def C(ref):
    c = hex2rgb(P.color(ref, WHO))
    return np.array([c[0] / 255, c[1] / 255, c[2] / 255, 1.0], np.float32)


# ramps: base, light (lit edge), dark (shaded edge), outline (1 px ring in the dark of the material). The plum
# shades are the battle sprite's own colours (bosses_battle archivore: #3c1e3d #4b2a47 #724755, eye #f6c830),
# so the two read as one creature; they are per-sprite extras like the battle sheet's.
FEATHER = dict(base='stone_warm:4', light='stone_warm:5', dark='path:2', deep='path:1', outline='#3c1e3d')
PLUM = dict(base='#4b2a47', light='#724755', dark='#3c1e3d', outline='shadow:1')
TENDRIL = dict(base='#4b2a47', light='hair_violet:4', dark='#3c1e3d', outline='shadow:1')
PAGES = dict(base='stone_warm:4', light='stone_warm:5', dark='path:2', outline='earth:1')
PLATE = dict(base='wood:2', light='gold:3', dark='wood:1', outline='earth:0')
BLADE = dict(base='path:2', light='wood:5', dark='path:1', outline='earth:0')

YS, XS = np.mgrid[0:H, 0:W]


# ----------------------------------------------------------------------------- mask helpers
def poly(pts):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=1)
    return np.asarray(im) > 0


def ellipse(cx, cy, rx, ry):
    return ((XS + 0.5 - cx) / rx) ** 2 + ((YS + 0.5 - cy) / ry) ** 2 <= 1.0


def nb(m, dx, dy):
    """value of m at (x + dx, y + dy), False outside"""
    out = np.zeros_like(m)
    ys = slice(max(0, -dy), H - max(0, dy)); yd = slice(max(0, dy), H - max(0, -dy))
    xs = slice(max(0, -dx), W - max(0, dx)); xd = slice(max(0, dx), W - max(0, -dx))
    out[ys, xs] = m[yd, xd]
    return out


def edge(m, dx, dy):
    return m & ~nb(m, dx, dy)


def ring(m):
    d = m | nb(m, 1, 0) | nb(m, -1, 0) | nb(m, 0, 1) | nb(m, 0, -1)
    return d & ~m


def bezier(pts, n=64):
    pts = np.asarray(pts, np.float32)
    out = []
    for i in range(n + 1):
        t = i / n
        p = pts.copy()
        while len(p) > 1:
            p = p[:-1] * (1 - t) + p[1:] * t
        out.append(p[0])
    return np.array(out)


def tube(pts, r0, r1):
    """a tapering stroke along a bezier: pixels whose centre is within r(t) of the curve"""
    c = bezier(pts)
    m = np.zeros((H, W), bool)
    for i, (x, y) in enumerate(c):
        t = i / (len(c) - 1)
        r = r0 + (r1 - r0) * t
        m |= (XS + 0.5 - x) ** 2 + (YS + 0.5 - y) ** 2 <= r * r
    return m


def paint(cv, m, ramp, light=((0, -1),), dark=((0, 1),), outline=True):
    cv[m] = C(ramp['base'])
    for d in dark:
        cv[edge(m, *d)] = C(ramp['dark'])
    for d in light:
        cv[edge(m, *d)] = C(ramp['light'])
    if outline:
        cv[ring(m)] = C(ramp['outline'])


# ----------------------------------------------------------------------------- parts
# Sunburst wings as on the battle sprite: broad feathers fanned from behind the book, the top ones rising past
# the horns, the bottom ones sweeping down beside the tendrils. (angle above the horizontal, length, width)
FEATHERS = [(78, 13, 7), (57, 18, 8), (36, 21, 8), (15, 22, 8), (-6, 21, 8), (-27, 18, 8), (-48, 13, 7)]


def feather_mask(root, ang, L, wmax, side):
    a = math.radians(ang)
    d = np.array([side * math.cos(a), -math.sin(a)])
    n = np.array([-d[1], d[0]])
    left, right = [], []
    for i in range(15):
        t = i / 14
        p = np.array(root, np.float32) + d * L * t
        grow = min(1.0, 0.45 + t / 0.5) ** 0.7
        taper = max(0.0, 1 - max(0.0, (t - 0.5) / 0.5)) ** 0.9
        hw = max(0.5, wmax / 2 * grow * taper)
        left.append(p + n * hw)
        right.append(p - n * hw)
    return poly([tuple(q) for q in left + right[::-1]]), d


def wing(cv, side, lift, spread):
    root = (CX + 0.5 + side * 5.0, 22.0)
    for i, (ang, L, w) in enumerate(FEATHERS):
        a = ang + lift * (0.4 + 0.6 * (i / (len(FEATHERS) - 1))) + spread * (i - 3)
        m, d = feather_mask(root, a, L, w, side)
        paint(cv, m, FEATHER)
        # the vane below the shaft is in shade, then the root under the book
        n = np.array([-d[1], d[0]])
        if n[1] < 0:
            n = -n
        v = (XS + 0.5 - root[0]) * n[0] + (YS + 0.5 - root[1]) * n[1]
        u = (XS + 0.5 - root[0]) * d[0] + (YS + 0.5 - root[1]) * d[1]
        cv[m & (v > 0.4) & ~edge(m, 0, 1) & ~edge(m, 0, -1)] = C('path:3')
        cv[m & (u < 7.5) & ~edge(m, 0, -1)] = C(FEATHER['dark'])
        cv[m & (u < 5.0)] = C(FEATHER['deep'])
        # the tip catches the light
        cv[m & (u > L * 0.78) & ~edge(m, 0, 1)] = C(FEATHER['light'])


def horn(cv, side):
    s = side
    c = CX + 0.5
    pts = [(c + s * 5.0, 14.0), (c + s * 13.5, 11.0), (c + s * 14.5, 2.5), (c + s * 9.0, 0.8)]
    m = tube(pts, 3.0, 0.7)
    paint(cv, m, PLUM, light=((s, 0), (0, -1)), dark=((-s, 0), (0, 1)))


def tendril(cv, side, sway, which):
    s = side
    c = CX + 0.5
    if which == 0:   # outer: sweeps out and curls back up
        pts = [(c + s * 7, 31), (c + s * 13, 33), (c + s * (16 + sway), 39), (c + s * (13 + sway), 44.5), (c + s * (10 + sway), 41.0)]
        r0, r1 = 2.0, 0.6
    else:            # inner: hangs beside the blade and hooks outward
        pts = [(c + s * 4, 34), (c + s * 6, 39), (c + s * (5 + sway), 44), (c + s * (8 + sway), 46.0)]
        r0, r1 = 1.7, 0.6
    m = tube(pts, r0, r1)
    paint(cv, m, TENDRIL, light=((0, -1), (-s, 0)), dark=((0, 1),))


def blade(cv):
    m = poly([(CX - 2.0, 33), (CX + 3.0, 33), (CX + 0.5, 47.0)])
    paint(cv, m, BLADE, light=((-1, 0),), dark=((1, 0),))
    cv[m & (XS == CX) & (YS > 34) & (YS < 42)] = C('gold:4')


BODY = [(CX - 2.5, 9.5), (CX - 6.5, 10.5), (CX - 9.0, 13.5), (CX - 10.0, 18.5), (CX - 10.0, 25.5), (CX - 8.4, 30.5),
        (CX - 5.4, 34.5), (CX + 0.5, 37.6), (CX + 6.4, 34.5), (CX + 9.4, 30.5), (CX + 11.0, 25.5), (CX + 11.0, 18.5),
        (CX + 10.0, 13.5), (CX + 7.5, 10.5), (CX + 3.5, 9.5)]


def body(cv):
    b = poly(BODY)
    paint(cv, b, PLUM, light=((-1, 0), (0, -1)), dark=((1, 0), (0, 1)))
    # the open pages: an inner leaf inside the plum covers
    inner = poly([(CX - 1.5, 10.5), (CX - 6.5, 12.0), (CX - 8.0, 16.0), (CX - 8.0, 26.0), (CX - 6.0, 30.5),
                  (CX + 0.5, 34.8), (CX + 7.0, 30.5), (CX + 9.0, 26.0), (CX + 9.0, 16.0), (CX + 7.5, 12.0), (CX + 2.5, 10.5)])
    paint(cv, inner, PAGES, light=((0, -1), (-1, 0)), dark=((0, 1), (1, 0)), outline=False)
    lines = inner & (YS % 3 == 1) & (np.abs(XS - CX) > 1) & (YS > 12) & (YS < 33)
    cv[lines & ~edge(inner, 0, -1) & ~edge(inner, -1, 0) & ~edge(inner, 1, 0)] = C('path:2')
    # the dark setting around the eye (as on the battle sprite: a bright eye in a dark bezel), gold specks
    plate = ellipse(CX + 0.5, 22.5, 7.4, 6.6)
    paint(cv, plate, PLATE, light=((-1, 0), (0, -1)), dark=((1, 0), (0, 1)))
    for (x, y) in [(CX, 14), (CX, 15), (CX, 30), (CX, 31), (CX - 7, 22), (CX + 7, 22), (CX - 5, 17), (CX + 5, 17),
                   (CX - 5, 28), (CX + 5, 28)]:
        cv[y, x] = C('gold:4') if (y < 22 and x <= CX) else C('gold:3')
    for y in range(10, 14):
        cv[y, CX] = C('gold:3') if y > 10 else C('gold:4')


EYE = """
...ooooo...
.ooGYYYGoo.
oGYYYkYYYGo
oYWYyky YYo
oYyYYkYyyYo
oYYyYkYyYYo
oGYYYkYYYGo
.ooGYYYGoo.
...ooooo...
""".replace(' ', 'Y')
EYE_PAL = {'o': 'earth:0', 'G': 'gold:2', 'Y': '#f6c830', 'y': 'gold:3', 'k': 'ink:0', 'W': 'gold:5'}


def eye(cv):
    rows = [r for r in EYE.strip('\n').split('\n')]
    x0, y0 = CX - 5, 18
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != '.':
                cv[y0 + j, x0 + i] = C(EYE_PAL[ch])


def crown(cv):
    """page spikes between the horns (the fanned top edge of the book)"""
    for (dx, h) in ((-4, 2), (-1, 4), (2, 4), (5, 2)):
        x = CX + dx - 1
        m = poly([(x - 0.4, 11.0), (x + 2.4, 11.0), (x + 1.0, 10.5 - h)])
        paint(cv, m, PAGES, light=((-1, 0),), dark=((1, 0),))


# ----------------------------------------------------------------------------- frames
POSES = [  # (wing lift deg, fan spread deg, body dy, tendril sway)
    (8, 1.2, 1, 0),      # 0 wings up, fan open, body low
    (-8, -0.8, 0, 1),    # 1 wings down, fan closed, body high (the downstroke lifts it)
    (0, 0.4, 0, 0),      # 2 level
]


def render(lift, spread, dy, sway):
    cv = np.zeros((H, W, 4), np.float32)
    horn(cv, -1); horn(cv, 1)
    wing(cv, -1, lift, spread)
    wing(cv, 1, lift, spread)
    tendril(cv, -1, sway, 0); tendril(cv, 1, sway, 0)
    tendril(cv, -1, sway, 1); tendril(cv, 1, sway, 1)
    blade(cv)
    body(cv)
    crown(cv)
    eye(cv)
    # hover: the lowest pixel sits HOVER rows above the feet row (frame 2 as the reference); dy bobs the body
    low = 47
    shift = (H - 1 - HOVER) - low + dy
    out = np.zeros_like(cv)
    if shift >= 0:
        out[shift:] = cv[:H - shift]
    else:
        out[:H + shift] = cv[-shift:]
    return out


def frames():
    return [render(*p) for p in POSES]
