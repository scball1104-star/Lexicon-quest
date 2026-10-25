"""Field avatar of the Cinder Warden (E3-sprites): the boss at map scale, drawn from shapes at 1x like
king_avatar.py (each part a mask painted with its own ramp: base, a lit top/left edge, a shaded bottom/right edge,
then a 1 px outline). A bronze hulk in a dark red cape with a hooded dark helm, a halo ring, a lantern on each
pauldron and the great hammer at its right side. The chest furnace is the one bright place (CRITIQUE_4 item 15).

    front(i) -> rgba   facing the camera (the furnace window in the chest); i = 0, 1 (the glow and lamps pulse)
    back(i)  -> rgba   seen from behind (the cape, a vent grille glowing on the back plate, the hammer at his side)
44 x 54, feet = bottom-centre.
"""
import numpy as np
from PIL import Image, ImageDraw
import pal as P
from pix import hex2rgb

W, H = 44, 54
CX = 22
WHO = 'cinder_warden_avatar'
YS, XS = np.mgrid[0:H, 0:W]


def C(ref):
    c = hex2rgb(P.color(ref, WHO))
    return np.array([c[0] / 255, c[1] / 255, c[2] / 255, 1.0], np.float32)


BRONZE = dict(base='wood:2', light='wood:4', dark='wood:1', outline='shadow:0')
PLATE = dict(base='wood:3', light='gold:3', dark='wood:2', outline='shadow:0')
CAPE = dict(base='roof_red:1', light='roof_red:2', dark='shadow:1', outline='shadow:0')
HELM = dict(base='shadow:1', light='wood:3', dark='shadow:0', outline='shadow:0')
IRON = dict(base='wood:1', light='wood:3', dark='shadow:1', outline='shadow:0')


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


def paint(cv, m, r, light=((0, -1), (-1, 0)), dark=((0, 1), (1, 0))):
    cv[m] = C(r['base'])
    for d in dark:
        cv[edge(m, *d)] = C(r['dark'])
    for d in light:
        cv[edge(m, *d)] = C(r['light'])
    cv[ring(m)] = C(r['outline'])


def hammer(cv, i, back=False):
    handle = poly([(CX + 10, 18), (CX + 12, 18), (CX + 16, 40), (CX + 14, 41)])
    paint(cv, handle, IRON, light=((-1, 0),), dark=((1, 0),))
    head = poly([(CX + 12, 36), (CX + 21, 36), (CX + 21, 50), (CX + 12, 50)])
    paint(cv, head, BRONZE)
    # molten seams in the barrel and a drip under it
    for y in (39, 43, 47):
        cv[y, CX + 13:CX + 20] = C('fire:3' if i == 0 else 'fire:4')
    cv[51, CX + 16] = C('fire:4'); cv[52, CX + 16] = C('roof_red:3')


def common(cv, i, back):
    # cape behind everything
    cape = poly([(CX - 9, 14), (CX + 9, 14), (CX + 14, 48), (CX - 14, 48)])
    paint(cv, cape, CAPE, light=((-1, 0),), dark=((1, 0),))
    # halo ring behind the head: a thin ember ring with four spikes
    halo = ellipse(CX, 7, 8, 7) & ~ellipse(CX, 7, 6.2, 5.4)
    cv[halo] = C('roof_red:3')
    for (x, y) in ((CX, -0), (CX - 8, 3), (CX + 7, 3)):
        if 0 <= y < H:
            cv[y, x] = C('fire:3')
    # legs and feet
    for sx in (-1, 1):
        leg = poly([(CX + sx * 2, 37), (CX + sx * 8, 37), (CX + sx * 8.5, 51), (CX + sx * 1.5, 51)])
        paint(cv, leg, BRONZE)
        foot = poly([(CX + sx * 1, 49), (CX + sx * 10, 49), (CX + sx * 10, 53), (CX + sx * 0.5, 53)])
        paint(cv, foot, PLATE)
    # torso
    torso = poly([(CX - 11, 14), (CX + 11, 14), (CX + 9, 38), (CX - 9, 38)])
    paint(cv, torso, PLATE)
    # pauldrons with a lantern each
    for sx in (-1, 1):
        pd = ellipse(CX + sx * 12, 16, 5, 4.2)
        paint(cv, pd, BRONZE)
        lx = CX + sx * 15
        cv[10:13, lx] = C('wood:1')
        cv[13:15, lx - 1:lx + 1] = C('fire:3' if (i + (sx > 0)) % 2 == 0 else 'fire:2')
        cv[15, lx - 1:lx + 1] = C('roof_red:3')
    # helm: a dark hood with a face void
    head = ellipse(CX, 8, 6, 6.5)
    paint(cv, head, HELM)
    return torso


def front(i=0):
    cv = np.zeros((H, W, 4), np.float32)
    common(cv, i, False)
    # the face: a dark void with two ember eyes
    cv[8:12, CX - 3:CX + 4] = C('shadow:0')
    cv[8, CX - 2] = C('fire:5'); cv[8, CX + 2] = C('fire:5')
    # the furnace window: the brightest disc
    win = ellipse(CX, 25, 6, 7)
    cv[ring(win)] = C('shadow:0')
    k = np.clip(((1 - np.sqrt(((XS + 0.5 - CX) / 6) ** 2 + ((YS + 0.5 - 25) / 7) ** 2)) * 4.2).astype(int), 0, 3)
    ramp = ['fire:2', 'fire:3', 'fire:4', 'fire:5'] if i == 0 else ['fire:3', 'fire:4', 'fire:5', 'metal:4']
    for j, r in enumerate(ramp):
        cv[win & (k == j)] = C(r)
    cv[win & (np.abs(XS + 0.5 - CX) < 0.7)] = C('shadow:0')
    cv[win & (np.abs(YS - 25) < 0.6)] = C('shadow:0')
    hammer(cv, i)
    return cv


def back(i=0):
    cv = np.zeros((H, W, 4), np.float32)
    common(cv, i, True)
    # hood closed at the back, a vent grille glowing on the back plate (the furnace exhaust)
    cv[7:13, CX - 4:CX + 5] = C('shadow:1')
    for y in (19, 22, 25, 28):
        cv[y, CX - 5:CX + 6] = C('fire:3' if i == 0 else 'fire:4')
        cv[y + 1, CX - 5:CX + 6] = C('roof_red:2')
    # the cape's seam
    cv[30:48, CX] = C('shadow:1')
    hammer(cv, i, True)
    return cv


def frames():
    return [front(0), front(1), back(0), back(1)]
