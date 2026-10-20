"""Episode 2 portraits (E2-sprites): elian, anwen, tovin, lena, aurel (48 and 32), drawn here from shapes rather than
cut from a painting (no painted sources exist for them).

Each portrait is a list of layers painted back to front on a 6x canvas in 46 x 46 portrait units (the frame
interior): every layer is a mask (ellipse, polygon, tube) filled with a master-palette colour, given form with a
lit upper-left bevel and a shaded lower-right bevel, and hair and beards get strands (thin random tubes in their
own lighter and darker steps). The canvas is then area-downscaled, quantized to a small palette harmonized to the
master palette, despeckled and framed exactly like the Episode 1 portraits made from the NPC paintings (Tess, Iris,
Hazel, Hob), so they sit in the same dialogue window. Light from the upper left, faces three-quarter to the left
(toward the speaker's text).

    portrait(pid, n)  -> rgba n x n with the 1 px bevel frame (n = 48 or 32)
    IDS
"""
import math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
import pal as P
from pix import hex2rgb, box_resize, palette_from, quantize, remove_orphans, blank

IDS = ['elian', 'anwen', 'tovin', 'lena', 'aurel']
U = 46            # portrait units (the frame interior at 48)
S = 6             # supersampling
N = U * S


def C(ref):
    c = hex2rgb(P.color(ref, 'portraits'))
    return np.array([c[0] / 255, c[1] / 255, c[2] / 255], np.float32)


# ----------------------------------------------------------------------------- masks (portrait units)
def _im():
    return Image.new('L', (N, N), 0)


# composition zoom: the drawings are laid out in 46 units around (23, 21) and shown at Z, so the face fills the
# window like the Episode 1 portraits (the shoulders run off the bottom edge)
Z, ZX, ZY = 1.34, 23.0, 21.5


def _x(x):
    return ZX + (x - ZX) * Z


def _y(y):
    return ZY + (y - ZY) * Z


def ellipse(cx, cy, rx, ry, rot=0.0):
    if rot == 0:
        im = _im()
        ImageDraw.Draw(im).ellipse([(_x(cx) - rx * Z) * S, (_y(cy) - ry * Z) * S, (_x(cx) + rx * Z) * S,
                                    (_y(cy) + ry * Z) * S], fill=255)
        return np.asarray(im) > 127
    pts = []
    for i in range(48):
        t = 2 * math.pi * i / 48
        x, y = rx * math.cos(t), ry * math.sin(t)
        r = math.radians(rot)
        pts.append((cx + x * math.cos(r) - y * math.sin(r), cy + x * math.sin(r) + y * math.cos(r)))
    return poly(pts)


def poly(pts):
    im = _im()
    ImageDraw.Draw(im).polygon([(_x(x) * S, _y(y) * S) for x, y in pts], fill=255)
    return np.asarray(im) > 127


def bez(pts, n=40):
    pts = np.asarray(pts, np.float32)
    out = []
    for i in range(n + 1):
        t = i / n
        p = pts.copy()
        while len(p) > 1:
            p = p[:-1] * (1 - t) + p[1:] * t
        out.append(p[0])
    return out


def tube(pts, w0, w1=None):
    """a stroke along a bezier, width w0 tapering to w1 (portrait units)"""
    w1 = w0 if w1 is None else w1
    im = _im()
    d = ImageDraw.Draw(im)
    c = [(_x(x), _y(y)) for x, y in bez(pts)]
    for i in range(len(c) - 1):
        t = i / (len(c) - 1)
        w = (w0 + (w1 - w0) * t) * S * Z
        (x0, y0), (x1, y1) = c[i], c[i + 1]
        d.line([(x0 * S, y0 * S), (x1 * S, y1 * S)], fill=255, width=max(1, int(round(w))))
        d.ellipse([x1 * S - w / 2, y1 * S - w / 2, x1 * S + w / 2, y1 * S + w / 2], fill=255)
    return np.asarray(im) > 127


def shift(m, dx, dy):
    """mask shifted by (dx, dy) portrait units (bevels stay the same on-screen width at any zoom)"""
    return ndi.shift(m.astype(np.uint8), (dy * S, dx * S), order=0, mode='constant', cval=0) > 0


def rows_below(y):
    """mask of the canvas rows below drawing-unit y"""
    return np.mgrid[0:N, 0:N][0] > _y(y) * S


def rows_above(y):
    return np.mgrid[0:N, 0:N][0] < _y(y) * S


# ----------------------------------------------------------------------------- painting
class Canvas:
    def __init__(self):
        self.a = np.zeros((N, N, 3), np.float32)
        top, bot = C('roof_blue:0'), C('roof_blue:1')
        for y in range(N):
            t = y / N * 0.6
            self.a[y] = top * (1 - t) + bot * t
        self.cover = np.zeros((N, N), bool)

    def fill(self, m, ref, lit=None, shade=None, depth=1.2, rim=None, clip=None):
        """fill a mask; lit/shade: refs for the upper-left / lower-right bevels of `depth` units"""
        if clip is not None:
            m = m & clip
        self.a[m] = C(ref)
        if shade:
            sm = m & ~shift(m, -depth, -depth)
            self.a[sm] = C(shade)
        if lit:
            lm = m & ~shift(m, depth, depth)
            self.a[lm] = C(lit)
        if rim:
            r = m & ~shift(m, -0.5, 0) & ~sm if shade else m & ~shift(m, -0.5, 0)
            self.a[r] = C(rim)
        self.cover |= m
        return m

    def strands(self, region, refs, n, length, width, angle, curl=0.25, seed=1, spread=18):
        """thin strokes of hair or beard inside `region`; angle in degrees (0 = down, 90 = left)"""
        rng = np.random.RandomState(seed)
        ys, xs = np.nonzero(region)
        if not len(ys):
            return
        for i in range(n):
            k = rng.randint(len(ys))
            x, y = ZX + (xs[k] / S - ZX) / Z, ZY + (ys[k] / S - ZY) / Z
            a = math.radians(angle + rng.uniform(-spread, spread))
            L = length * rng.uniform(0.6, 1.2)
            dx, dy = math.sin(a) * L, math.cos(a) * L
            bend = rng.uniform(-curl, curl) * L
            pts = [(x, y), (x + dx / 2 + bend * math.cos(a), y + dy / 2 - bend * math.sin(a)), (x + dx, y + dy)]
            m = tube(pts, width, width * 0.4) & region
            self.a[m] = C(refs[i % len(refs)])

    def line(self, pts, w, ref, clip=None, w1=None):
        m = tube(pts, w, w1)
        if clip is not None:
            m &= clip
        self.a[m] = C(ref)
        return m

    def dot(self, x, y, r, ref):
        m = ellipse(x, y, r, r)
        self.a[m] = C(ref)


SKINS = {
    'light': dict(base='skin_light:2', lit='skin_light:3', shade='skin_light:1', deep='skin_light:0', blush='blossom:2'),
    'weathered': dict(base='skin_light:1', lit='skin_light:2', shade='skin_light:0', deep='wood:2', blush='roof_red:3'),
    'pale': dict(base='skin_light:2', lit='skin_light:3', shade='stone_warm:3', deep='skin_light:0', blush='blossom:2'),
}


def face(cv, sk, cx=23, cy=21, rx=9.6, ry=11.5, jaw=0.0, age=0, ear=True):
    """the head: ears, face oval with a narrower jaw, cheek shadow on the right, a neck"""
    s = SKINS[sk]
    neck = poly([(cx - 4.5, cy + 6), (cx + 3.5, cy + 6), (cx + 4, cy + 18), (cx - 5, cy + 18)])
    cv.fill(neck, s['shade'])
    cv.fill(neck & ~shift(neck, 2.5, 0), s['deep'])
    if ear:
        cv.fill(ellipse(cx - rx + 0.6, cy + 1.5, 2.0, 3.1), s['base'], shade=s['shade'], depth=0.8)
        cv.fill(ellipse(cx + rx - 0.3, cy + 1.5, 1.7, 2.9), s['shade'], shade=s['deep'], depth=0.8)
    head = ellipse(cx, cy, rx, ry) & rows_above(cy + 4)
    chin = poly([(cx - rx + 0.3, cy + 2), (cx + rx - 0.3, cy + 2), (cx + rx * (0.62 + jaw), cy + ry * 0.62),
                 (cx + 2.2, cy + ry + 0.3), (cx - 2.8, cy + ry + 0.3), (cx - rx * (0.66 + jaw), cy + ry * 0.62)])
    m = head | chin
    cv.fill(m, s['base'], lit=s['lit'], shade=s['shade'], depth=1.4)
    # form: the far (right) side turns into shadow through a half-tone, the near cheek and brow catch the light,
    # a warm flush on the cheeks
    half = m & ellipse(cx + rx * 0.62, cy + 1.5, rx * 0.62, ry * 1.08)
    cv.a[half] = 0.5 * C(s['base']) + 0.5 * C(s['shade'])
    dark = m & ellipse(cx + rx * 0.95, cy + 2, rx * 0.42, ry * 0.98)
    cv.a[dark] = C(s['shade'])
    cv.a[m & ellipse(cx - rx * 0.42, cy - ry * 0.28, rx * 0.36, ry * 0.3)] = 0.5 * C(s['base']) + 0.5 * C(s['lit'])
    for side, k in ((-1, 0.35), (1, 0.22)):
        bl = m & ellipse(cx + side * rx * 0.5, cy + ry * 0.28, rx * 0.22, ry * 0.12)
        cv.a[bl] = (1 - k) * cv.a[bl] + k * C(s['blush'])
    cv.a[m & ~shift(m, -1.0, -1.0)] = C(s['shade'])
    # under the chin
    cv.a[(neck & ~m) & shift(m, 0, 1.6)] = C(s['deep'])
    return m


def eyes(cv, sk, cx=23, ey=21, gap=4.6, iris='water:3', iris_dk='water:2', lid='hair_brown:0', size=1.12, look=-0.5,
         tired=0, squint=0.0, glasses=None, brow_ref='hair_brown:1', brow_tilt=0.0, brow_raise=0.0, brow_w=1.1):
    s = SKINS[sk]
    for side in (-1, 1):
        x = cx + side * gap + (0.4 if side > 0 else 0)
        w = 2.5 * size * (0.92 if side > 0 else 1.0)
        h = 1.65 * size * (1 - squint)
        white = ellipse(x, ey, w, h)
        cv.fill(white, 'stone_warm:5')
        cv.a[white & ~shift(white, 0, -0.6)] = C('stone_warm:4')
        ir = ellipse(x + look, ey + 0.1, 1.35 * size, min(1.5 * size, h + 0.2)) & white
        cv.fill(ir, iris)
        cv.a[ir & ~shift(ir, 0, 0.9)] = C(iris_dk)
        cv.fill(ellipse(x + look, ey + 0.2, 0.62 * size, 0.8 * size) & white, 'ink:0')
        cv.dot(x + look - 0.55, ey - 0.55, 0.45, 'metal:4')
        # upper lid: a thick lash line, lower lash thin
        cv.line([(x - w - 0.3, ey - h * 0.15), (x, ey - h - 0.35), (x + w + 0.2, ey - h * 0.25)], 1.0, lid)
        cv.line([(x - w - 0.2, ey - h * 0.1), (x - w + 0.6, ey + h * 0.5)], 0.5, lid)
        cv.line([(x - w * 0.7, ey + h + 0.1), (x + w * 0.6, ey + h + 0.2)], 0.4, s['shade'])
        if tired:
            cv.line([(x - w * 0.8, ey + h + 1.2), (x, ey + h + 1.7), (x + w * 0.8, ey + h + 1.1)], 0.45, s['shade'])
        # brow
        by = ey - 3.2 * size - brow_raise * (1 if side < 0 else 0.3)
        t = brow_tilt * side
        cv.line([(x - w - 0.4, by + 0.4 + t), (x, by - 0.4), (x + w + 0.4, by + 0.3 - t)], brow_w, brow_ref, w1=brow_w * 0.7)
        if glasses:
            ring = ellipse(x, ey + 0.2, 3.5, 3.0) & ~ellipse(x, ey + 0.2, 2.8, 2.3)
            cv.a[ring] = C(glasses)
            cv.a[ring & ~shift(ring, 0.6, 0.6)] = C('gold:4')
    if glasses:
        cv.line([(cx - gap + 3.4, ey - 0.2), (cx, ey - 0.8), (cx + gap - 3.0, ey - 0.2)], 0.5, glasses)


def nose_mouth(cv, sk, cx=23, ny=26, my=30.2, smile=0.3, mw=2.6, lips='roof_red:3'):
    s = SKINS[sk]
    cv.line([(cx + 0.6, ny - 3.5), (cx + 1.4, ny - 0.4), (cx + 0.4, ny + 0.4)], 0.55, s['shade'])
    cv.dot(cx - 0.5, ny - 0.4, 0.55, s['lit'])
    cv.dot(cx + 0.9, ny + 0.4, 0.38, s['deep'])
    cv.line([(cx - mw, my - smile), (cx, my + 0.3), (cx + mw * 0.9, my - smile * 0.8)], 0.55, s['deep'])
    cv.line([(cx - mw * 0.55, my + 1.0), (cx + mw * 0.5, my + 1.0)], 0.5, lips)


def wrinkles(cv, sk, cx=23, ey=21, gap=4.6, n=2, mouth=True, forehead=0):
    s = SKINS[sk]
    for side in (-1, 1):
        x = cx + side * (gap + 3.3)
        for k in range(n):
            cv.line([(x, ey - 0.6 + k * 1.2), (x + side * 1.4, ey - 0.2 + k * 1.5)], 0.35, s['shade'])
    if mouth:
        cv.line([(cx - 3.2, 26.8), (cx - 3.9, 30.6)], 0.45, s['shade'])
        cv.line([(cx + 3.4, 26.8), (cx + 4.0, 30.2)], 0.45, s['shade'])
    for k in range(forehead):
        cv.line([(cx - 4, 13.2 + k * 1.3), (cx + 4, 13.0 + k * 1.3)], 0.35, s['shade'])


def hair_shadow(cv, hair, skin_face, sk, depth=1.4):
    """the fringe casts a soft shadow on the brow"""
    m = skin_face & shift(hair, 0, depth) & ~hair
    cv.a[m] = 0.4 * cv.a[m] + 0.6 * C(SKINS[sk]['shade'])


def finish(cv, n, k=24):
    """downscale to the portrait size, quantize, harmonize, despeckle, frame (as build_portraits.make_extra)"""
    from build_portraits import harmonize, frame
    a = np.concatenate([cv.a, np.ones((N, N, 1), np.float32)], -1)
    d = box_resize(a, n - 2, n - 2)
    d[..., 3] = 1
    pal = palette_from(d, k, seed=5)
    pal = harmonize(pal, 0.035)
    q = quantize(d, pal)
    q = remove_orphans(q, passes=1, max_de=0.05, min_opaque_nb=8)
    return frame(q)


# ----------------------------------------------------------------------------- the five
def elian():
    """about twenty, slight, sandy hair, a wine-red mayor's coat several sizes too big, the ledger"""
    cv = Canvas()
    # coat: shoulders far wider than the boy inside, a high collar standing off the neck, gold trim, white shirt
    coat = poly([(-2, 46), (1, 37), (9, 33.5), (17, 32), (29, 32), (37, 33.5), (45, 37), (48, 46)])
    cv.fill(coat, 'roof_red:2', lit='roof_red:3', shade='roof_red:1', depth=1.5)
    shirt = poly([(18, 32), (28, 32), (26.5, 46), (19.5, 46)])
    hair_back = ellipse(23, 15.5, 12.2, 11.2)
    cv.fill(hair_back, 'path:1')
    fm = face(cv, 'light', rx=9.2, ry=11.3, jaw=-0.04)
    cv.fill(shirt & ~ellipse(23, 21, 9.2, 11.3), 'stone_warm:5', shade='stone_warm:4')
    cv.line([(23, 34), (23, 46)], 0.5, 'stone_warm:3')
    for side in (-1, 1):
        lap = poly([(23 + side * 4.5, 32.5), (23 + side * 13, 33), (23 + side * 11, 46), (23 + side * 5.5, 46)])
        cv.fill(lap, 'roof_red:3', lit='roof_red:4', shade='roof_red:2', depth=1.0)
        cv.line([(23 + side * 4.6, 32.6), (23 + side * 5.7, 46)], 0.8, 'gold:3')
        collar = poly([(23 + side * 4.2, 27.5), (23 + side * 10, 30.5), (23 + side * 12.5, 34.5), (23 + side * 6.5, 35)])
        cv.fill(collar, 'roof_red:2', lit='roof_red:4', shade='roof_red:1', depth=0.9)
        cv.line([(23 + side * 4.2, 27.7), (23 + side * 10, 30.6)], 0.6, 'gold:4')
    cv.dot(18.6, 39.5, 0.8, 'gold:4'); cv.dot(18.9, 43.5, 0.8, 'gold:4')
    # the ledger's corner under his arm, bottom left
    led = poly([(0, 40), (9, 38.5), (10.5, 46), (0, 46)])
    cv.fill(led, 'earth:2', lit='earth:3', shade='earth:1', depth=0.8)
    cv.line([(0.5, 41.2), (9.2, 39.7)], 0.5, 'sand:3')
    eyes(cv, 'light', iris='earth:3', iris_dk='earth:1', lid='hair_brown:1', tired=1, brow_ref='path:1',
         brow_tilt=-0.5, brow_raise=0.2)
    nose_mouth(cv, 'light', smile=-0.1, mw=2.3, lips='roof_red:4')
    # sandy hair: a soft mop with a fringe falling over the brow, swept to his left
    top = poly([(11.5, 18), (12, 10), (16, 5.2), (23, 3.6), (30, 5.2), (34.4, 10), (35, 18), (32.5, 13.5),
                (28, 12.6), (24, 15.4), (21.5, 12.8), (17.5, 15.6), (14.5, 13.8), (12.5, 19)])
    hair = cv.fill(top, 'path:2', lit='path:3', shade='path:1', depth=1.0)
    cv.strands(hair, ['path:3', 'sand:2', 'path:1', 'path:3'], 70, 4.5, 0.55, 15, seed=3)
    cv.strands(hair & rows_above(9), ['sand:2', 'sand:3'], 14, 3, 0.5, 40, seed=4)
    hair_shadow(cv, hair, fm, 'light')
    side = poly([(11.6, 17), (13, 14), (13.4, 23), (11.8, 24)])
    cv.fill(side, 'path:1', lit='path:2')
    return cv


def anwen():
    """sixties, a grey habit and veil stitched with silver thread, a white wimple, kind eyes"""
    cv = Canvas()
    veil = poly([(4, 46), (6, 30), (9, 14), (14, 6), (23, 3.2), (32, 6), (37, 14), (40, 30), (42, 46)])
    cv.fill(veil, 'stone_cool:3', lit='stone_cool:4', shade='stone_cool:2', depth=1.6)
    # folds of the veil
    for pts in ([(10, 24), (8.5, 34), (7.5, 46)], [(36, 24), (37.5, 34), (38.5, 46)], [(13, 30), (12, 46)]):
        cv.line(pts, 0.9, 'stone_cool:2', clip=veil)
    # silver thread along the veil's edge
    edge = veil & ~shift(veil, 1.4, 0) & ~shift(veil, -1.4, 0)
    habit = poly([(6, 46), (10, 36), (17, 33), (29, 33), (36, 36), (40, 46)])
    cv.fill(habit, 'stone_cool:2', lit='stone_cool:3', shade='stone_cool:1', depth=1.2)
    wimple = ellipse(23, 22.5, 11.6, 13.2)
    cv.fill(wimple, 'stone_warm:5', lit='metal:4', shade='stone_warm:4', depth=1.0)
    m = face(cv, 'light', rx=8.6, ry=10.6, cy=22, ear=False)
    band = poly([(13.2, 13.6), (23, 11.5), (32.8, 13.6), (33, 16.4), (23, 14.6), (13, 16.4)])
    cv.fill(band, 'stone_warm:5', lit='metal:4', shade='stone_warm:4', depth=0.6)
    # silver embroidery: a running stitch on the band and the veil's inner border
    for k in range(9):
        cv.line([(14.2 + k * 2.1, 14.6 - abs(k - 4) * 0.42), (15.2 + k * 2.1, 14.4 - abs(k - 4) * 0.42)], 0.45, 'metal:3')
    inner = ellipse(23, 21.5, 12.6, 14.3) & ~ellipse(23, 21.5, 11.8, 13.5) & veil
    cv.a[inner] = C('metal:2')
    eyes(cv, 'light', ey=22, gap=4.3, iris='stone_cool:4', iris_dk='stone_cool:2', lid='earth:1', size=0.92,
         tired=1, brow_ref='stone_cool:4', brow_w=0.9)
    wrinkles(cv, 'light', ey=22, gap=4.3, n=2, mouth=True, forehead=0)
    nose_mouth(cv, 'light', ny=27, my=31, smile=0.6, mw=2.4, lips='roof_red:4')
    # a small silver chain and pendant at the collar
    cv.line([(18, 33.2), (23, 36.2), (28, 33.2)], 0.4, 'metal:3')
    cv.fill(ellipse(23, 37.6, 1.1, 1.4), 'metal:3', lit='metal:4', shade='stone_cool:4', depth=0.4)
    return cv


def tovin():
    """old, weathered, grey stubble, an ochre oilskin with the collar up and a sou'wester"""
    cv = Canvas()
    coat = poly([(-1, 46), (2, 37), (11, 33), (35, 33), (44, 37), (47, 46)])
    cv.fill(coat, 'path:1', lit='path:2', shade='earth:2', depth=1.6)
    cv.line([(23, 35), (23, 46)], 0.7, 'earth:2')
    for side in (-1, 1):
        col = poly([(23 + side * 3, 29), (23 + side * 10.5, 31), (23 + side * 12, 37.5), (23 + side * 4.5, 38)])
        cv.fill(col, 'path:2', lit='path:3', shade='path:1', depth=0.9)
    m = face(cv, 'weathered', rx=9.4, ry=11.0, cy=22, jaw=0.08)
    # grey stubble over the jaw and lip
    jaw = m & ~ellipse(23, 18, 10, 9.6) & rows_below(26)
    cv.strands(jaw, ['stone_cool:4', 'stone_cool:3', 'stone_cool:5'], 140, 0.9, 0.42, 0, curl=0.1, seed=7, spread=40)
    moust = ellipse(23.4, 29.3, 4.4, 1.3)
    cv.fill(moust, 'stone_cool:4', lit='stone_cool:5', shade='stone_cool:3', depth=0.4)
    eyes(cv, 'weathered', ey=22.5, gap=4.4, iris='water:2', iris_dk='water:1', lid='wood:1', squint=0.38, tired=1,
         brow_ref='stone_cool:4', brow_w=1.5, brow_tilt=0.5)
    wrinkles(cv, 'weathered', ey=22.5, gap=4.4, n=3, mouth=True, forehead=0)
    s = SKINS['weathered']
    cv.line([(20.8, 31.3), (23.4, 31.0), (26, 31.3)], 0.5, s['deep'])
    nose_mouth(cv, 'weathered', ny=27.2, my=40, smile=0, mw=0.1, lips='skin_light:1')
    # sou'wester: a deep crown and a broad brim longer at the back, oilskin ochre
    crown = poly([(12, 16), (13, 8), (17, 4), (23, 3), (30, 4), (34, 8), (34.6, 16)])
    cv.fill(crown, 'path:2', lit='path:3', shade='path:1', depth=1.4)
    cv.line([(13, 14.5), (23, 13.2), (34, 14.5)], 0.9, 'earth:3')
    brim = poly([(6.5, 17.8), (12, 14.6), (23, 13.6), (35, 14.6), (41, 19.5), (36, 18.4), (23, 17.2), (11, 18.6)])
    cv.fill(brim, 'path:3', lit='sand:2', shade='path:1', depth=0.8)
    cv.a[m & shift(brim, 0, 1.6) & ~brim] = 0.45 * cv.a[m & shift(brim, 0, 1.6) & ~brim] + 0.55 * C('skin_light:0')
    # grey hair under the brim at the temple
    tuft = poly([(13.6, 18), (16, 17.5), (15, 23), (13.6, 22.5)])
    cv.fill(tuft, 'stone_cool:4', lit='stone_cool:5')
    return cv


def lena():
    """fifties, a greying bun, round gold spectacles, a wry look, a plum dress and an apron of tiny tools"""
    cv = Canvas()
    bun = ellipse(30.5, 6.8, 5.6, 4.6)
    cv.fill(bun, 'stone_warm:2', lit='stone_warm:3', shade='stone_warm:1', depth=0.8)
    cv.strands(bun, ['stone_warm:3', 'stone_cool:4', 'stone_warm:1'], 24, 3, 0.45, 70, seed=9)
    dress = poly([(-1, 46), (2, 37), (11, 33.5), (35, 33.5), (44, 37), (47, 46)])
    cv.fill(dress, 'roof_purple:2', lit='roof_purple:3', shade='roof_purple:1', depth=1.4)
    back = ellipse(23, 17.5, 11.6, 11.5)
    cv.fill(back, 'stone_warm:1')
    fm = face(cv, 'light', rx=9.0, ry=11.1, jaw=-0.02)
    # lace collar
    for k in range(7):
        cv.fill(ellipse(15.5 + k * 2.5, 34.2 + abs(k - 3) * -0.3, 1.5, 1.2), 'stone_warm:5', shade='stone_warm:4', depth=0.4)
    # apron bib and its strap of tools
    bib = poly([(15, 37), (31, 37), (32, 46), (14, 46)])
    cv.fill(bib, 'wood:2', lit='wood:3', shade='wood:1', depth=0.9)
    for k, (x, ref) in enumerate([(17.5, 'metal:3'), (20.5, 'gold:3'), (25.5, 'metal:2'), (28.5, 'gold:4')]):
        cv.line([(x, 38.5), (x + 0.3, 43.5)], 0.7, ref)
        cv.dot(x, 38.4, 0.55, 'stone_cool:4')
    cv.line([(14.6, 39), (31.5, 39)], 0.7, 'wood:1')
    eyes(cv, 'light', iris='roof_green:3', iris_dk='roof_green:2', lid='earth:1', size=0.95, glasses='wood:2',
         brow_ref='stone_warm:2', brow_raise=1.0, brow_tilt=0.35, brow_w=0.9, look=-0.7)
    wrinkles(cv, 'light', n=1, mouth=False)
    nose_mouth(cv, 'light', smile=-0.4, mw=2.2, lips='roof_red:3')
    cv.line([(25.2, 29.6), (26.4, 29.0)], 0.5, SKINS['light']['deep'])     # the wry corner
    # greying hair swept back, a grey streak at the temple
    top = poly([(12, 19), (12.4, 11), (16.5, 6.2), (23, 4.6), (29.6, 6.2), (33.8, 11), (34.2, 19), (31.6, 12.5),
                (23, 10.4), (15, 12.6)])
    hair = cv.fill(top, 'stone_warm:2', lit='stone_warm:3', shade='stone_warm:1', depth=0.9)
    cv.strands(hair, ['stone_warm:3', 'stone_warm:1', 'stone_cool:4', 'stone_warm:3'], 70, 5, 0.5, 120, seed=11)
    cv.line([(14, 16), (17, 8.4), (22, 6)], 0.9, 'stone_cool:5')
    hair_shadow(cv, hair, fm, 'light', 1.0)
    return cv


def aurel():
    """the Nameless King unmasked: Elian's face grown old and tired, faded sandy-grey hair, a long grey beard,
    a silver robe with a high collar, no crown"""
    cv = Canvas()
    robe = poly([(-1, 46), (2, 36), (11, 32.5), (35, 32.5), (44, 36), (47, 46)])
    cv.fill(robe, 'stone_cool:4', lit='stone_cool:5', shade='stone_cool:3', depth=1.6)
    for side in (-1, 1):
        col = poly([(23 + side * 6, 25), (23 + side * 12.5, 28.5), (23 + side * 13, 36), (23 + side * 7, 36)])
        cv.fill(col, 'stone_cool:5', lit='metal:3', shade='stone_cool:4', depth=0.9)
        cv.line([(23 + side * 6.1, 25.2), (23 + side * 12.5, 28.6)], 0.6, 'water:4')
    back = ellipse(23, 17, 12.4, 12.4)
    cv.fill(back, 'stone_cool:3')
    m = face(cv, 'pale', rx=9.2, ry=11.4, jaw=0.0)
    eyes(cv, 'pale', iris='earth:3', iris_dk='earth:1', lid='stone_warm:1', tired=2, brow_ref='stone_cool:5',
         brow_tilt=-0.7, brow_raise=0.0, brow_w=1.3, size=0.95)
    wrinkles(cv, 'pale', n=3, mouth=False, forehead=2)
    nose_mouth(cv, 'pale', smile=-0.5, mw=2.0, lips='stone_warm:3', my=29.6)
    # the long grey beard from the cheeks to the chest, a moustache over it
    beard = poly([(14.6, 24), (17, 30), (23, 31.5), (29.5, 30), (31.6, 24), (32.4, 30), (30, 38), (26.5, 44), (23, 46),
                  (19.5, 44), (16, 38), (13.8, 30)])
    b = cv.fill(beard, 'stone_cool:4', lit='stone_cool:5', shade='stone_cool:3', depth=1.0)
    cv.strands(b, ['stone_cool:5', 'metal:2', 'stone_cool:3', 'stone_cool:5'], 90, 5, 0.5, 0, curl=0.2, seed=13, spread=12)
    moust = poly([(18, 28.6), (23, 27.4), (28.4, 28.6), (29.6, 31), (26, 29.8), (23, 30.4), (20, 29.8), (16.8, 31)])
    cv.fill(moust, 'stone_cool:5', lit='metal:3', shade='stone_cool:4', depth=0.4)
    cv.line([(21.5, 31.2), (24.8, 31.2)], 0.5, 'stone_cool:2')
    # faded sandy-grey hair, longer than Elian's, falling past the ears; a pale band where a crown sat
    top = poly([(11.6, 26), (11.4, 12), (15.8, 6), (23, 4.2), (30.2, 6), (34.6, 12), (34.4, 26), (32, 17), (28, 12.6),
                (23, 11.6), (18, 12.6), (14, 17)])
    hair = cv.fill(top, 'stone_warm:3', lit='stone_warm:4', shade='stone_cool:3', depth=0.9)
    cv.strands(hair, ['stone_warm:4', 'stone_cool:4', 'stone_warm:2', 'stone_cool:5'], 80, 6, 0.5, 10, seed=17)
    cv.line([(14.5, 9.6), (23, 7.0), (31.5, 9.6)], 0.6, 'stone_warm:4')
    hair_shadow(cv, hair, m, 'pale', 1.0)
    return cv


PAINTERS = {'elian': elian, 'anwen': anwen, 'tovin': tovin, 'lena': lena, 'aurel': aurel}
_CANVAS = {}


def canvas(pid):
    if pid not in _CANVAS:
        _CANVAS[pid] = PAINTERS[pid]()
    return _CANVAS[pid]


def portrait(pid, n):
    return finish(canvas(pid), n, k=24 if n == 48 else 18)
