"""Field avatar of the Nameless King (E2-sprites): the battle King at map scale, drawn from shapes at 1x like
archivore_avatar.py (every part a mask painted with its own ramp: base, a lit top/left edge, a shaded bottom/
right edge, then a 1 px outline in the dark of that ramp, back to front).

The battle sprite (bosses_battle `nameless_king`) is a tall figure in pale-blue mirrored plate under a deep blue
cape with a jagged hem, a hood holding a glass veil, a fractured crown of glass tines, a long glass sword and a
ring of floating shards. This avatar keeps those reads at 40 x 50.

    front(i) -> rgba   facing the camera (the scene's "the King faces down"); i = 0, 1 (shards bob, hem sways)
    back(i)  -> rgba   seen from behind (the hood and the cape's seam, the crown's back, the sword at his side)
Feet = bottom-centre. Frontal and nearly symmetric, so the field's left/right flip changes little.
"""
import numpy as np
from PIL import Image, ImageDraw
import pal as P
from pix import hex2rgb

W, H = 40, 50
CX = 20
WHO = 'nameless_king_avatar'
YS, XS = np.mgrid[0:H, 0:W]


def C(ref):
    c = hex2rgb(P.color(ref, WHO))
    return np.array([c[0] / 255, c[1] / 255, c[2] / 255, 1.0], np.float32)


CAPE = dict(base='cloth_blue:2', light='cloth_blue:3', dark='cloth_blue:1', outline='water:0')
CAPE_IN = dict(base='cloth_blue:1', light='cloth_blue:2', dark='water:0', outline='water:0')
ROBE = dict(base='ice:2', light='metal:4', dark='water:4', outline='water:1')
PLATE = dict(base='stone_cool:5', light='metal:3', dark='stone_cool:3', outline='shadow:1')
HOOD = dict(base='stone_cool:4', light='stone_cool:5', dark='stone_cool:3', outline='shadow:1')
CROWN = dict(base='metal:2', light='metal:4', dark='stone_cool:4', outline='shadow:1')
GLASS = dict(base='water:4', light='ice:3', dark='water:3', outline='water:1')
VEIL = dict(base='water:0', light='water:1', dark='water:0', outline='shadow:0')


def poly(pts):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=1)
    return np.asarray(im) > 0


def ellipse(cx, cy, rx, ry):
    return ((XS + 0.5 - cx) / rx) ** 2 + ((YS + 0.5 - cy) / ry) ** 2 <= 1.0


def nb(m, dx, dy):
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


def paint(cv, m, r, light=((0, -1), (-1, 0)), dark=((0, 1), (1, 0)), outline=True):
    cv[m] = C(r['base'])
    for d in dark:
        cv[edge(m, *d)] = C(r['dark'])
    for d in light:
        cv[edge(m, *d)] = C(r['light'])
    if outline:
        cv[ring(m) & (cv[..., 3] < 0.5)] = C(r['outline'])
        cv[ring(m) & (cv[..., 3] >= 0.5)] = C(r['outline'])


def diamond(cx, cy, w, h):
    return poly([(cx, cy - h / 2), (cx + w / 2, cy), (cx, cy + h / 2), (cx - w / 2, cy)])


def hem_points(y0, x0, x1, n, depth, sway):
    """jagged hem: n downward points between x0 and x1, the hem's bottom row at y0"""
    pts = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        pts.append((x + (sway if i % 2 else 0), y0 - (0 if i % 2 else depth)))
    return pts


def cape_mask(sway, back=False):
    top = [(CX - 7, 15), (CX + 7, 15)]
    right = [(CX + 13, 30), (CX + 18, 46)]
    left = [(CX - 18, 46), (CX - 13, 30)]
    hem = hem_points(49, CX + 18, CX - 18, 12, 3, sway)
    return poly(top + right + hem + left)


def shards(cv, i):
    for k, (x, y, w, h) in enumerate([(3.5, 13, 3, 6), (36.5, 9, 3, 6), (2.5, 31, 3, 5), (37.5, 28, 3, 5)]):
        dy = (1 if (k + i) % 2 else -1) if i else 0
        m = diamond(x, y + dy, w, h)
        paint(cv, m, GLASS)
        ys, xs = np.nonzero(m)
        if len(ys):
            cv[ys.min() + 1, xs.min() + (1 if xs.max() > xs.min() else 0)] = C('metal:4')


def crown(cv, back=False):
    # glass tines rising from a narrow band; the second from the right is snapped short (the fractured crown)
    tines = [(CX - 5.5, 5, 2.4), (CX - 2.8, 2, 2.4), (CX + 0.5, 0, 2.6), (CX + 3.6, 5.5, 2.4), (CX + 6.2, 4, 2.4)]
    m = np.zeros((H, W), bool)
    for (x, top, w) in tines:
        m |= poly([(x - w / 2, 9.5), (x, top), (x + w / 2, 9.5)])
    band = poly([(CX - 6.5, 8.5), (CX + 7.5, 8.5), (CX + 7, 10.6), (CX - 6, 10.6)])
    paint(cv, m & ~band, GLASS, light=((-1, 0),), dark=((1, 0),))
    paint(cv, band, CROWN)
    if not back:
        for x in (CX - 3, CX + 1, CX + 4):
            cv[9, x] = C('magic_cyan:3')


SWORD = dict(base='ice:2', light='metal:4', dark='water:4', outline='water:0')


def sword(cv, side=1):
    """the glass sword held point-down at his side, the blade standing clear of the cape's edge"""
    hx = CX + side * 13 + (0.5 if side > 0 else 0)
    tip = (hx + side * 4.5, 48.5)
    blade = poly([(hx - 1.4, 27), (hx + 1.6, 27), (tip[0] + 0.6, tip[1] - 3), tip, (tip[0] - 1.0, tip[1] - 3)])
    paint(cv, blade, SWORD, light=((-1, 0),), dark=((1, 0),))
    ys, xs = np.nonzero(blade)
    for y in range(28, 45, 4):
        row = xs[ys == y]
        if len(row):
            cv[y, row.min()] = C('metal:4')
    guard = poly([(hx - 3.5, 24.5), (hx + 3.5, 24.5), (hx + 3.5, 26.6), (hx - 3.5, 26.6)])
    paint(cv, guard, PLATE)
    cv[25, int(hx)] = C('magic_cyan:3')
    grip = poly([(hx - 0.8, 20.5), (hx + 1.2, 20.5), (hx + 1.2, 24.5), (hx - 0.8, 24.5)])
    paint(cv, grip, HOOD)


def front(i=0):
    cv = np.zeros((H, W, 4), np.float32)
    sway = 1 if i else 0
    shards(cv, i)
    cape = cape_mask(sway)
    paint(cv, cape, CAPE)
    # the cape's inner lining shows down both sides of the robe
    inner = cape & poly([(CX - 9, 20), (CX + 9, 20), (CX + 13, 48), (CX - 13, 48)])
    paint(cv, inner, CAPE_IN, outline=False)
    robe = poly([(CX - 4.5, 16), (CX + 5.5, 16), (CX + 9, 49)] + hem_points(49, CX + 9, CX - 8, 6, 2, -sway) + [(CX - 8, 49)])
    paint(cv, robe, ROBE)
    # mirrored plates: the robe deepens toward the hem, plate seams run down it, a bright centre ridge
    inner = robe & ~ring(robe) & ~edge(robe, -1, 0) & ~edge(robe, 1, 0)
    cv[inner & (YS > 38)] = C('water:4')
    cv[inner & (YS > 44)] = C('water:3')
    for x in (CX - 3, CX + 3):
        cv[(XS == x) & inner & (YS > 21) & (YS < 46)] = C('water:3')
    cv[(XS == CX) & inner & (YS > 19) & (YS < 42)] = C('metal:4')
    cv[(XS == CX + 1) & inner & (YS > 19) & (YS < 40)] = C('ice:3')
    belt = robe & (YS >= 27) & (YS <= 28)
    cv[belt] = C('stone_cool:4')
    cv[belt & (YS == 27)] = C('stone_cool:5')
    cv[belt & ((XS == CX) | (XS == CX + 1))] = C('magic_cyan:3')
    # cape folds catching the light
    for x0 in (CX - 14, CX + 13):
        fold = cape & ~inner & poly([(x0, 30), (x0 + 1, 30), (x0 + 2.5, 47), (x0 - 1, 47)]) & ~ring(cape)
        cv[fold & (cv[..., 3] > 0.5)] = C('cloth_blue:3')
    # pauldrons
    for s in (-1, 1):
        paint(cv, ellipse(CX + s * 8, 18, 4.6, 3.4), PLATE)
    # hood and veil
    hood = (ellipse(CX + 0.5, 14.5, 5.6, 6.5) & (YS < 20)) | poly([(CX - 5, 15), (CX + 6, 15), (CX + 7.5, 20.5), (CX - 6.5, 20.5)])
    paint(cv, hood, HOOD)
    veil = ellipse(CX + 0.5, 15, 3.0, 4.2) & (YS > 10)
    paint(cv, veil, VEIL, light=(), dark=(), outline=False)
    cv[ring(veil) & hood & (YS > 12)] = C('shadow:1')
    for k, y in enumerate(range(13, 18)):
        x = CX + 2 - k
        if veil[y, x]:
            cv[y, x] = C('water:3' if k else 'ice:2')
    crown(cv)
    sword(cv, 1)
    return cv


def back(i=0):
    cv = np.zeros((H, W, 4), np.float32)
    sway = 1 if i else 0
    shards(cv, i)
    sword(cv, -1)
    cape = cape_mask(sway, back=True)
    paint(cv, cape, CAPE)
    # folds: two darker channels and the centre seam
    for x0 in (CX - 7, CX + 6):
        fold = cape & poly([(x0, 24), (x0 + 1.5, 24), (x0 + 3, 47), (x0 - 1.5, 47)])
        cv[fold & ~ring(cape)] = C('cloth_blue:1')
    seam = cape & (XS == CX) & (YS > 19)
    cv[seam & ~ring(cape)] = C('cloth_blue:3')
    for s in (-1, 1):
        paint(cv, ellipse(CX + s * 8, 18, 4.6, 3.4), PLATE)
    hood = (ellipse(CX + 0.5, 14.5, 5.6, 6.5) & (YS < 20)) | poly([(CX - 5, 15), (CX + 6, 15), (CX + 7.5, 21), (CX - 6.5, 21)])
    paint(cv, hood, HOOD)
    cv[hood & (YS > 13) & (XS == CX)] = C('stone_cool:3')
    crown(cv, back=True)
    return cv


def frames():
    return [front(0), front(1), back(0), back(1)]
