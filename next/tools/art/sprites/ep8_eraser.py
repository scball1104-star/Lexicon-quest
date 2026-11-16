"""The Eraser (E8-sprites): four battle looks from ../assets/art/bosses.png cell 7 at 1x inside the 160 x 144 boss cell (the
painting: a looming violet void entity in black robes, an empty white face under a hood, a dark ring over the head, two
pale clawed hands, erased book pages floating round it). Not flipped: the figure faces out of the painting; the light
falls from the upper left as on every other boss.

  eraser            Closed Book: as painted, held to the master palette (black and ink robes lit violet, the pages cream,
                    the face the brightest white on the body), the face redrawn clean and empty so it reads at phone size
  eraser_truths     The Rejected Truths: the robes spread behind it like the two covers of an open book (violet leather
                    in ordered dither, the gilt edge, the cream page block along the fore-edge and the foot, a tooled
                    panel, gilt corner protectors), and on each a tipped-in page with one thing it refused: a small grey
                    hooded figure (Grief) on the left, a page with a door ajar on gold light (Change) on the right
  eraser_remembers  The Keeper Remembers: the old face half drawn in gold lines through the white (a brow, an eye, the
                    line of the nose, half a mouth, the cheek), the other half still blank
  eraser_silence    The Last Silence: the robes from the waist down torn into blank pages (cream sheets with nothing on
                    them, ragged at the hem), the face gone to a white glare that spills over the hood, the floating pages
                    stopped and blank

Every look is drawn on the same canvas from the same cut, so the hood, the face and the feet stand on the same pixels in
all four: one HUD anchor holds over the hood in every phase (CRITIQUE_8 item 1; hud() below). The covers are drawn behind
the figure, never over it; the glare stays below the hood's top. Focal point (CRITIQUE_4 item 15): the empty face under the
hood is the brightest place on the body in every look.

Contrast rule as ep8_enemies.py: a dark outline and a warm gilt rim.

    base()          -> {id: rgba}              origin bottom-centre
    atlas_frames()  -> [(name, rgba, ox, oy)]
    hud()           -> {look: {'hood': [dx, dy], 'headPx': [x0, x1, y0, y1], 'head': [fractions]}}
    avatar()        -> {'eraser_avatar': [f0, f1], 'eraser_avatar_back': [f0, f1]}  the stair figure, 2-frame idle
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
import ep8_enemies as E8

TH = 128
IDS = ['eraser', 'eraser_truths', 'eraser_remembers', 'eraser_silence']
PADX = 14
PADT = 3

ROBE = [(0.0, 'shadow:0'), (0.16, 'ink:1'), (0.32, 'hair_violet:2'), (0.48, 'hair_violet:3'), (0.64, 'roof_purple:2'),
        (0.8, 'cloth_purple:3'), (1.0, 'cloth_purple:4')]
INK = [(0.0, 'shadow:0'), (0.35, 'ink:1'), (0.7, 'shadow:2'), (1.0, 'hair_violet:2')]
PAGES = [(0.0, 'stone_warm:3'), (0.4, 'stone_warm:4'), (0.75, 'stone_warm:5'), (1.0, 'metal:3')]


def cut(th=TH, k=20, keep=0.02, dist=60):
    src = load_src('bosses.png')
    obj = main_object(grid_cell(src, 4, 2, 7), keep_frac=keep, max_dist=dist)
    tw, th2 = fit_size(obj, th=th)
    d, _ = pixelize2(obj, tw, th2, k=k, sharpen=0.0, max_de=0.10, ring=False)
    return d


def recolour(d):
    m, L, C, h = lch_img(d)
    light = m & (L > 0.72) & (C < 0.07)
    violet = m & ~light & (h > 255) & (h < 345) & (C > 0.05)
    warm = m & ~light & (h > 30) & (h < 120) & (C > 0.05)
    dark = m & ~light & ~violet & ~warm
    a = gmap(d, violet, ROBE, gamma=1.0)
    a = gmap(a, dark, INK, gamma=1.0)
    a = gmap(a, light, PAGES, gamma=0.9)
    a = gmap(a, warm, [(0.0, 'gold:2'), (1.0, 'gold:4')])
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


put = E8.put

# the face on the 128 px cut (painting coordinates before padding), found by eye on the cut at 5x: its top-left
FACE_CUT = (62, 16)
FACE = ['...kkkkk...',
        '..kWWWWWk..',
        '.kWWWWWWwk.',
        '.kWWWWWWwk.',
        'kWWWWWWWwwk',
        'kWWWWWWWwwk',
        'kWWWWWWWwwk',
        'kWWWWWWWwwk',
        'kWWWWWWwwwk',
        '.kWWWWWwwk.',
        '.kWWWWwwwk.',
        '..kWWwwwk..',
        '...kwwwk...',
        '....kkk....']
FACE_LEG = {'W': 'metal:4', 'w': 'metal:3', 'k': 'shadow:0'}
# the old face half drawn in gold over the white (its left half: the light side), (x, y) inside the FACE grid: the left
# contour of the face traced in gold, a brow, an eye with a dark pupil, the line of the nose, half a mouth, a cheekbone
GOLD_LINES = {'gold:4': [(3, 1), (2, 2), (1, 3), (1, 4), (0, 5), (0, 6), (0, 7), (0, 8), (1, 9), (1, 10), (2, 11), (3, 12),
                         (2, 4), (3, 4), (4, 4),
                         (2, 10), (3, 10), (4, 10)],
              'gold:5': [(3, 6), (4, 6)],
              'gold:3': [(5, 5), (5, 6), (5, 7), (4, 8), (2, 8), (5, 0), (4, 0)],
              'shadow:0': [(4, 7)]}


def face_xy():
    return FACE_CUT[0] + 1 + PADX, FACE_CUT[1] + 1 + PADT


def head(a):
    x, y = face_xy()
    return stamp(a, FACE, FACE_LEG, x, y)


def hood_top():
    """the HUD anchor: the top of the hood over the face's left edge (the top-left of the body proper; the dark ring
    above the hood is not counted)"""
    x, y = face_xy()
    return x + 2, y - 4


def gold_face(a):
    x, y = face_xy()
    for ref, pts in GOLD_LINES.items():
        for (i, j) in pts:
            put(a, x + i, y + j, ref)
    return a


def glare(a):
    """the face gone to a white glare: every face pixel the brightest white, a solid halo of white round it, dithered at
    its rim, over the hood (never above the hood's top: the anchor holds)"""
    x, y = face_xy()
    H, W = a.shape[:2]
    cx, cy = x + len(FACE[0]) / 2.0, y + len(FACE) / 2.0
    ax, ay = hood_top()
    al = a[..., 3] > 0.5
    for yy in range(ay + 1, int(cy + 13)):
        for xx in range(int(cx - 13), int(cx + 13)):
            if not (0 <= yy < H and 0 <= xx < W) or not al[yy, xx]:
                continue
            d = np.hypot(xx - cx, (yy - cy) * 0.75)
            if d < 7.5:
                put(a, xx, yy, 'metal:4')
            elif d < 9.0:
                put(a, xx, yy, 'metal:3' if (xx + yy) % 2 else 'metal:4')
            elif d < 11 and (xx + yy) % 2 == 0:
                put(a, xx, yy, 'stone_warm:5')
            elif d < 12.5 and (xx + yy) % 4 == 0:
                put(a, xx, yy, 'stone_warm:4')
    return a


def blank_pages(a, frac=0.58, seed=3):
    """the robes torn to blank pages from the waist down: loose sheets of different sizes (cream, empty: a white top
    edge, a shadowed right edge and foot), staggered and overlapping, with gaps where the dark robe shows through and a
    ragged hem; the floating pages go blank white"""
    H, W = a.shape[:2]
    out = a.copy()
    al = a[..., 3] > 0.5
    e = E8.edge_mask(a)
    y0 = int(H * frac)
    rng = np.random.RandomState(seed)
    sheets = []
    y = y0
    row = 0
    while y < H - 4:
        x = PADX - 4 + (row % 2) * 4 + rng.randint(0, 4)
        while x < W - PADX:
            pw, ph = 6 + rng.randint(0, 4), 9 + rng.randint(0, 4)
            if rng.rand() > 0.28:
                sheets.append((x, y + rng.randint(-1, 2), pw, ph))
            x += pw + 2 + rng.randint(0, 3)
        y += 8 + rng.randint(0, 3)
        row += 1
    for (x, y, pw, ph) in sheets:
        for j in range(ph):
            for i in range(pw):
                xx, yy = x + i, y + j
                if not (0 <= yy < H and 0 <= xx < W) or not al[yy, xx] or e[yy, xx]:
                    continue
                if j >= ph - 2 and (i * 3 + x) % 4 == 0:
                    continue                                   # the torn foot of the sheet
                if i == pw - 1 or j == ph - 1:
                    ref = 'stone_warm:3'
                elif j == 0:
                    ref = 'metal:4'
                elif i == 0:
                    ref = 'metal:3'
                else:
                    ref = 'stone_warm:5'
                out[yy, xx, :3] = col(ref)
    m, L, C, h = lch_img(out)
    lab, n = ndi.label(al)
    if n > 1:
        sz = ndi.sum(al, lab, range(1, n + 1))
        main = lab == int(np.argmax(sz)) + 1
        for yy, xx in zip(*np.nonzero(al & ~main & ~e)):
            out[yy, xx, :3] = col('metal:3' if L[yy, xx] > 0.5 else 'stone_warm:4')
    return out


BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16.0
LEATHER = ['shadow:0', 'roof_purple:1', 'roof_purple:2', 'cloth_purple:3', 'cloth_purple:4']


def board_masks(a):
    """the two boards (left, right): a cover each, hinged at the shoulders beside the body and opening out to the floor"""
    H, W = a.shape[:2]
    fx, fy = face_xy()
    cx = fx + len(FACE[0]) // 2
    top = fy + 22
    bot = H - 5
    out = []
    for side in (-1, 1):
        bd = np.zeros((H, W), bool)
        inner = np.full(H, -1, np.int32)
        outer = np.full(H, -1, np.int32)
        for y in range(top, bot + 1):
            t = (y - top) / float(bot - top)
            # the outer edge bows a little (a board under its own weight), the inner edge follows the robe
            xi = cx + side * (16 + int(round(10 * t)))
            xo = cx + side * (24 + int(round(48 * t - 5 * np.sin(np.pi * t))))
            lo, hi = max(1, min(xi, xo)), min(W - 2, max(xi, xo))
            bd[y, lo:hi + 1] = True
            inner[y], outer[y] = xi, xo
        out.append((side, bd, inner, outer, top, bot))
    return out


def covers(a):
    """the robes spread like the two covers of an open book, behind the figure's outer folds (never over the hood, the
    face or the middle of the body): violet leather lit from the upper left (ordered dither, no hatching), a dark hinge
    where each board meets the robe, the gilt edge, the cream page block showing along the fore-edge and the foot (three
    stacked leaves), a tooled panel with gilt corner stops, and gilt corner protectors at the outer corners"""
    H, W = a.shape[:2]
    out = a.copy()
    for side, bd, inner, outer, top, bot in board_masks(a):
        ys, xs = np.nonzero(bd)
        lit = side < 0
        for y, x in zip(ys, xs):
            t = (y - top) / float(bot - top)
            d_out = abs(x - outer[y])
            d_in = abs(x - inner[y])
            d_bot = bot - y
            d_top = y - top
            e = min(d_out, d_bot, d_top)
            ref = None
            if e == 0 or d_in == 0:
                ref = 'shadow:0'
            elif d_top == 1 and d_out > 1:
                ref = 'gold:4' if lit else 'gold:3'
            elif e == 1:
                ref = ('gold:4' if (lit and d_out == 1) else 'gold:3') if d_bot > 1 else 'gold:2'
            elif d_top > 1 and 2 <= min(d_out, d_bot) <= 4:
                # the page block: three leaves, the middle one shaded, a gap every few px along the edge
                k = min(d_out, d_bot)
                run = y if d_out <= d_bot else x
                if k == 3:
                    ref = 'stone_warm:4' if (run % 7) else 'stone_warm:3'
                else:
                    ref = ('metal:3' if lit and k == 2 else 'stone_warm:5') if (run % 9) else 'stone_warm:4'
            elif d_top > 1 and min(d_out, d_bot) == 5:
                ref = 'gold:2'
            elif d_in <= 2:
                ref = 'ink:1' if d_in == 1 else 'roof_purple:1'
            else:
                # leather: lighter high and toward the lit side, a soft fall-off at the hinge
                across = min(1.0, d_in / 14.0)
                v = (0.62 if lit else 0.42) + 0.28 * (1 - t) - 0.12 * (1 - across) + (0.06 if lit else -0.04) * (1 - d_out / 40.0)
                # the tooled panel: a dark blind rule 4 px inside the page block
                if min(d_out, d_bot, max(0, d_in - 3)) == 9 and d_top > 9:
                    ref = 'roof_purple:1'
                else:
                    lv = max(0.0, min(0.999, v)) * (len(LEATHER) - 2) + 1
                    n = int(lv)
                    if (lv - n) > BAYER4[y % 4, x % 4]:
                        n += 1
                    ref = LEATHER[min(len(LEATHER) - 1, n)]
            out[y, x, :3] = col(ref)
            out[y, x, 3] = 1
        # gilt corner stops on the tooled panel and corner protectors at the outer corners
        for (yy, k) in ((bot, 7), (top, 6)):
            xo = outer[yy] if outer[yy] >= 0 else None
            if xo is None:
                continue
            for dy in range(0, k):
                for dx in range(0, k):
                    if dx + dy >= k:
                        continue
                    y2 = yy - dy if yy == bot else yy + dy
                    x2 = xo - side * dx
                    if not (0 <= y2 < H and 0 <= x2 < W and bd[y2, x2]):
                        continue
                    edge = dx == 0 or dy == 0
                    if dx + dy == k - 1:
                        c = 'shadow:0'
                    elif edge:
                        c = 'shadow:0' if (dx == 0 and dy == 0) else ('gold:4' if (lit or dy == 0) else 'gold:3')
                    else:
                        c = 'gold:4' if dx + dy == 1 else ('gold:3' if (dx + dy) % 3 else 'gold:2')
                    out[y2, x2, :3] = col(c)
                    out[y2, x2, 3] = 1
    return out


# The two truths it refused, each on a cream page tipped into its cover: Grief (a small grey hooded figure, head bowed,
# one cold tear) on the left board, Change (a page with a door standing ajar on gold light) on the right.
GRIEF_ICON = ['....kkkk....',
              '...kWWWWk...',
              '..kWWWWWWk..',
              '..kWkkkkWk..',
              '..kWkkkiWk..',
              '..kWWkkkWk..',
              '.kWWWWWWWWk.',
              '.kWwWWWWwWk.',
              'kWWwWWWWwWWk',
              'kWwwWWWWwwWk',
              'kWwwwWWwwwWk',
              'kkkkkkkkkkkk']
CHANGE_ICON = ['kkkkkkkkk...',
               'kPPPPPPPPkk.',
               'kPPPPPPPPpPk',
               'kPPkkkkkPPPk',
               'kPPkGGvvkPPk',
               'kPPkGGvvkPPk',
               'kPPkGgvvkPPk',
               'kPPkGGvvkPPk',
               'kPPkGGvvkPPk',
               'kPPkGgvvkPPk',
               'kPPPPPPPPPPk',
               'kkkkkkkkkkkk']
PLATE_W, PLATE_H = 18, 18


def plate(a, x0, y0, icon, legend, lit):
    """a cream page tipped into the cover: dark edge, a gilt frame, a shaded right and foot, the icon centred"""
    H, W = a.shape[:2]
    for j in range(PLATE_H):
        for i in range(PLATE_W):
            y, x = y0 + j, x0 + i
            if not (0 <= y < H and 0 <= x < W):
                continue
            e = min(i, j, PLATE_W - 1 - i, PLATE_H - 1 - j)
            if e == 0:
                c = 'shadow:0'
            elif e == 1:
                c = 'gold:4' if (lit and (i == 1 or j == 1)) else 'gold:3' if (i == 1 or j == 1) else 'gold:2'
            elif i >= PLATE_W - 3 or j >= PLATE_H - 3:
                c = 'stone_warm:4'
            else:
                c = 'stone_warm:5'
            a[y, x, :3] = col(c)
            a[y, x, 3] = 1
    ih, iw = len(icon), len(icon[0])
    return stamp(a, icon, legend, x0 + (PLATE_W - iw) // 2, y0 + (PLATE_H - ih) // 2)


def truths_in_folds(a):
    """Grief (left) and Change (right) on their pages, set into the covers at about knee height"""
    out = a
    for side, bd, inner, outer, top, bot in board_masks(a):
        y = top + int(round(0.6 * (bot - top)))
        mid = (inner[y] + outer[y]) // 2 + side * 2
        x0, y0 = mid - PLATE_W // 2, y - PLATE_H // 2
        if side < 0:
            out = plate(out, x0, y0, GRIEF_ICON, {'k': 'shadow:0', 'W': 'stone_cool:4', 'w': 'stone_cool:3', 'i': 'ice:2'}, True)
        else:
            out = plate(out, x0, y0, CHANGE_ICON, {'k': 'shadow:0', 'P': 'stone_warm:5', 'p': 'stone_warm:3', 'G': 'gold:4',
                                                    'g': 'gold:5', 'v': 'hair_violet:2'}, False)
    return out


_CACHE = {}


def build():
    if _CACHE:
        return _CACHE
    d = clean(recolour(cut()))
    base0 = head(pad(d))
    for look in IDS:
        a = base0.copy()
        if look == 'eraser_remembers':
            a = gold_face(a)
        if look == 'eraser_silence':
            a = blank_pages(a)
        a = E8.contrast(a)
        if look == 'eraser_truths':
            a = covers(a)
            a = truths_in_folds(a)
        if look == 'eraser_silence':
            a = glare(a)
        _CACHE[look] = a
    return _CACHE


def base():
    return dict(build())


def hud():
    """one HUD anchor for all four looks: the top of the hood over the face (dx from the bottom-centre origin, dy up
    from it, negative), and the head box (the hood and the face) in px from the origin and as frame fractions"""
    b = build()
    out = {}
    ax, ay = hood_top()
    fx, fy = face_xy()
    for look in IDS:
        H, W = b[look].shape[:2]
        ox, oy = W // 2, H - 1
        px = [fx - 3 - ox, fx + len(FACE[0]) + 3 - ox, ay - oy, fy + len(FACE) - oy]
        out[look] = {'hood': [ax - ox, ay - oy], 'headPx': px,
                     'head': [round((px[0] + ox) / W, 3), round((px[1] + ox) / W, 3), round((px[2] + oy) / H, 3),
                              round((px[3] + oy) / H, 3)]}
    return out


# ----------------------------------------------------------------------------- derived frames
def recipe(img, look):
    """idle_1 the robes breathe (the body rises a pixel over the hem); attack it leans in toward the party (right);
    hurt the recoil; cast the white flares and pages of light rise (The Keeper Remembers: gold sparks)"""
    H, W = img.shape[:2]
    a = AF.canvas(img)
    I = lambda v: int(round(v))
    out = {}
    seam = I(H * 0.72) + AF.PAD
    out['idle_1'] = AF.rise(a, seam)
    out['attack'] = AF.lean(a, seam, 5, taper=I(H * 0.45))
    g = AF.lean(a, seam, -4, taper=I(H * 0.45))
    g, dox = AF.squash(g, (I(H * 0.3), I(H * 0.6)), (I(W * 0.3), I(W * 0.7)))
    out['hurt'] = (AF.edge_lift(g, 2, prefer=('ink', 'hair_violet', 'shadow', 'roof_purple')), dox)
    m, L, C, h = lch_img(a)
    if look == 'eraser_remembers':
        f = AF.glow(a, m & (h > 40) & (h < 110) & (C > 0.06), 'gold', 0.55, 1)
        sp = ['gold:5', 'gold:4', 'metal:4']
    else:
        f = AF.glow(a, m & (L > 0.85), 'magic_violet', 0.55, 1)
        sp = ['metal:4', 'stone_warm:5', 'cloth_purple:4']
    out['cast'] = AF.sparkles(f, [(I(W * 0.5), -4, 2), (I(W * 0.62), 0, 1), (I(W * 0.36), -6, 1), (I(W * 0.76), 6, 2),
                                   (I(W * 0.18), 14, 1), (I(W * 0.9), 20, 1), (I(W * 0.44), -10, 1)], sp)
    return out


def derived(bid, img):
    return E8.pack8(bid, img, recipe(img, bid))


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


# ----------------------------------------------------------------------------- the field avatar (the stair figure)
AV_H = 46
AV_FACE = ['.kkkk.',
           'kWWWwk',
           'kWWWwk',
           'kWWwwk',
           'kWWwwk',
           '.kWwk.',
           '..kk..']
AV_BACK = ['.kkkk.',
           'kiiiik',
           'kiiiik',
           'kiiiik',
           'kiiiik',
           '.kiik.',
           '..kk..']
AV_LEG = {'k': 'shadow:0', 'W': 'metal:4', 'w': 'metal:3', 'i': 'ink:1'}
SLEEVE = [['..kk....',
           '.kVvk...',
           'kVvvvk..',
           'kvvvvvk.',
           '.kvvvvvk',
           '..kkvvk.',
           '....kk..'],
          ['........',
           '..kkk...',
           '.kVvvk..',
           'kVvvvvk.',
           'kvvvvvvk',
           '.kkvvvk.',
           '...kk...']]


def avatar():
    """eraser_avatar (front) and eraser_avatar_back at map scale, the figure on the stair: a second cut of the painting
    at 46 px (never a resample of the battle frame), only the figure kept (the pages drop out at this size); the face is
    redrawn by hand so it reads at phone size (an empty white face, front; the back of the hood, back, the cut
    mirrored); a sleeve trails off its far side and stirs between the two frames, and frame 1 lifts the robe a pixel."""
    d = cut(th=AV_H, k=12)
    a = recolour(d)
    a = CL.snap_master(a, 0.04)
    a = CL.merge_close(a, 0.04)
    H, W = a.shape[:2]
    big = blank(W + 8, H + 3)
    big[2:-1, 1:-7] = a
    al = big[..., 3] > 0.5
    lab, n = ndi.label(al)
    if n > 1:
        sz = ndi.sum(al, lab, range(1, n + 1))
        big[lab != int(np.argmax(sz)) + 1] = 0
    # the floating pages that touch the body at this size are lifted off: light pixels in the outer third go
    m, L, C, h = lch_img(big)
    Hh, Ww = big.shape[:2]
    xs = np.mgrid[0:Hh, 0:Ww][1]
    ys = np.mgrid[0:Hh, 0:Ww][0]
    k = AV_H / float(TH)
    fx = int(round((FACE_CUT[0] + 5) * k)) + 1
    fy = int(round(FACE_CUT[1] * k)) + 2
    stray = m & (L > 0.62) & ((np.abs(xs - fx) > 6) | (ys > fy + 10))
    big[stray] = 0
    # one solid figure at map scale: holes filled with the robe's dark, specks merged
    al = big[..., 3] > 0.5
    holes = ndi.binary_fill_holes(al) & ~al
    big[holes] = np.array([*col('ink:1'), 1.0], np.float32)
    big = CL.majority_despeckle(big, passes=2, max_de=0.14, max_island=3)
    big = CL.ramp_outline(big)
    front = E8.side_rim(E8.dark_outline(big), 'gilt_field')
    back = front[:, ::-1].copy()
    bx = back.shape[1] - 1 - fx
    front = stamp(front, AV_FACE, AV_LEG, fx - 3, fy)
    back = stamp(back, AV_BACK, AV_LEG, bx - 2, fy)
    out = {}
    leg = {'k': 'shadow:0', 'V': 'cloth_purple:3', 'v': 'roof_purple:2'}
    for name, f0 in (('eraser_avatar', front), ('eraser_avatar_back', back)):
        frames = []
        for i in range(2):
            f = f0.copy()
            if i == 1:
                cut_y = int(Hh * 0.6)
                f[:cut_y - 1] = f0[1:cut_y]
                f[cut_y - 1] = f0[cut_y - 1]
            g = SLEEVE[i] if name == 'eraser_avatar' else [r[::-1] for r in SLEEVE[i]]
            sy = int(Hh * 0.5)
            al2 = f[..., 3] > 0.5
            # the sleeve trails from the body's far edge at mid height (front: the right; back: the left), overlapping
            # the edge by two pixels so it hangs from the robe
            row = np.nonzero(al2[sy + 3])[0]
            sx = (row.max() - 2) if name == 'eraser_avatar' else (row.min() - len(g[0]) + 3)
            for j, r in enumerate(g):
                for ii, ch in enumerate(r):
                    xx, yy = sx + ii - (0 if name == 'eraser_avatar' else 0), sy + j
                    if ch != '.' and 0 <= xx < Ww and 0 <= yy < Hh and not al2[yy, xx]:
                        f[yy, xx, :3] = col(leg[ch]); f[yy, xx, 3] = 1
            frames.append(f)
        out[name] = frames
    return out


if __name__ == '__main__':
    import os
    os.makedirs(os.path.join(OUT, 'ep8'), exist_ok=True)
    b = base()
    for bg, tag in (((238, 230, 214), 'page'), ((52, 30, 84), 'void')):
        contact(list(b.items()), os.path.join(OUT, 'ep8', f'eraser_looks_3x_{tag}.png'), scale=3, cols=4, bg=bg,
                title='The Eraser: Closed Book, The Rejected Truths, The Keeper Remembers, The Last Silence (3x)')
    av = avatar()
    items = [(f'{k}_{i}', v) for k, fr in av.items() for i, v in enumerate(fr)]
    contact(items, os.path.join(OUT, 'ep8', 'eraser_avatar_6x.png'), scale=6, cols=4, bg=(238, 230, 214))
    print(hud())
