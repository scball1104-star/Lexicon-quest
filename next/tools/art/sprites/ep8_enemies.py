"""Episode 8 foes with their own battle frames (E8-sprites): the Stair of Written Light and the First Library's three floors,
and the Unnamed Sentry (docs/EPISODE8_PLAN.md 6.2 and 6.4).

Every painted foe is cut from ../assets/art/enemies.png (4x2 grid) at 1x straight from the painting (no non-integer
scaling), recoloured per material with gradient maps onto master ramps (ink black, violet, cream paper and gold, the
First Library's palette), put through the shared cleanup and finished with hand edits. Each is cut at the size of the earlier
foe of the same cell, so the Episode 1 to 7 derived-frame recipes fit it. None reads as its Episode 7 cousin (Episode 7's
were snow white and ice blue):

  index_hound         cell 2 at 60 px  ink-black fur shaded indigo (the Rime Wolf was snow white), a violet mane,
                                       card-drawer ribs on its flank (cream drawer fronts with gold pulls), gold eyes
  margin_imp          cell 0 at 48 px  an ink jelly, black shaded violet (the Snow Wisp was a white jelly), gold flecks
                                       floating in it, two gold eyes
  paper_crane         cell 6 at 70 px  a folded-paper crane: cream paper (the Hush Owl was grey-barred white), violet
                                       ink fold creases with a lit edge, a gold beak and talons, an ink eye
  gnawing_bookworm    cell 3 at 50 px  a parchment grub: the shell to cream parchment ruled with ink lines of writing
                                       (the Crystal Crawler was ice), the head, horns and legs gold, an ink underside
  catalog_wraith      cell 1 at 72 px  a violet wraith shaded ink (the Pale Lantern was frost white), gold eyes, a
                                       trail of cream index cards fluttering from its rags
  inkbound_librarian  cell 5 at 96 px  plate of ink (navy-black, violet-lit) trimmed gilt (the Ice Knight was clear ice),
                                       the blade ink with a gold edge, the shield a great return stamp: an ink-black face
                                       in a gilt rim with the Library's open book cut into it, a violet glint in the visor
  unnamed_sentry      cell 5 at 108 px (mini-boss) the same armour the other way round: gilt plate over ink joints, an
                                       ink cape, a gilt shield with an ink boss, the blade gold, and a BLANK faceplate
                                       drawn over the helmet (cream, no eyes, no mouth); unnamed_sentry_cracked is the
                                       50% look: the faceplate split by a black crack with a chip fallen out

The Struck-Out Page is drawn in code (ep8_drawn.py), as are Grief and Change.

The contrast rule (Episode 8's stages are a violet void, white pages and dark ink stacks): after the cleanup every foe gets
a DARK outline (every edge pixel lighter than L 0.30 becomes shadow:0, so a cream foe holds on the white page) and, just
inside it on the upper and left edges, a 1 px WARM rim in gold (it holds on the violet void and the ink floors).
CRITIQUE_6 item 8.

    base()          -> {id: rgba}               facing RIGHT, origin bottom-centre
    atlas_frames()  -> [(name, rgba, ox, oy)]   base + derived (AF.ORDER)
"""
import os
import numpy as np
from scipy import ndimage as ndi
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import cleanup as CL
import anim_frames as AF
from hollow_enemies import consolidate, col
from ep2_enemies import gmap, lch_img, stamp
import ep5_enemies as E5

IDS = ['index_hound', 'margin_imp', 'paper_crane', 'gnawing_bookworm', 'catalog_wraith', 'inkbound_librarian']
SENTRY = ['unnamed_sentry', 'unnamed_sentry_cracked']
ALL_IDS = IDS + SENTRY

# ----------------------------------------------------------------------------- the contrast rule (E5's, a warm side)
E5.RIM.setdefault('gilt', ('gold:3', 'gold:4'))             # (left edge, top edge): gold
E5.RIM.setdefault('gilt_field', ('gold:4', 'gold:5'))       # a step brighter for the dark floors at map scale
dark_outline = E5.dark_outline
side_rim = E5.side_rim
edge_mask = E5.edge_mask
put = E5.put


def contrast(a, side='gilt'):
    return side_rim(dark_outline(a), side)


# ----------------------------------------------------------------------------- ramps
INKFUR = [(0.0, 'shadow:0'), (0.14, 'ink:1'), (0.3, 'ink:2'), (0.5, 'ink:3'), (0.72, 'hair_violet:4'), (0.88, 'ink:4'),
          (1.0, 'cloth_purple:5')]
VIOLET = [(0.0, 'roof_purple:1'), (0.3, 'roof_purple:2'), (0.6, 'cloth_purple:3'), (0.85, 'cloth_purple:4'),
          (1.0, 'cloth_purple:5')]
CREAM = [(0.0, 'shadow:1'), (0.12, 'stone_warm:1'), (0.26, 'stone_warm:2'), (0.42, 'stone_warm:3'), (0.58, 'stone_warm:4'),
         (0.76, 'stone_warm:5'), (1.0, 'metal:4')]
PARCH = [(0.0, 'stone_warm:1'), (0.2, 'stone_warm:2'), (0.4, 'stone_warm:3'), (0.62, 'stone_warm:4'), (0.84, 'stone_warm:5'),
         (1.0, 'metal:4')]
GOLD = [(0.0, 'wood:2'), (0.35, 'gold:2'), (0.65, 'gold:3'), (0.85, 'gold:4'), (1.0, 'gold:5')]
GILT = [(0.0, 'wood:1'), (0.18, 'wood:2'), (0.36, 'gold:2'), (0.6, 'gold:3'), (0.82, 'gold:4'), (1.0, 'gold:5')]
DARKGILT = [(0.0, 'shadow:0'), (0.16, 'ink:1'), (0.32, 'wood:1'), (0.48, 'wood:2'), (0.64, 'gold:2'), (0.8, 'gold:3'),
            (0.93, 'gold:4'), (1.0, 'gold:5')]
INKPLATE = [(0.0, 'shadow:0'), (0.16, 'ink:1'), (0.34, 'ink:2'), (0.52, 'hair_violet:3'), (0.7, 'ink:3'),
            (0.86, 'cloth_purple:3'), (1.0, 'ink:4')]
INKCAPE = [(0.0, 'shadow:0'), (0.4, 'ink:1'), (0.75, 'hair_violet:2'), (1.0, 'hair_violet:3')]


# ----------------------------------------------------------------------------- recolours (on the quantized cut, painting orientation)
def rc_hound(a):
    """the silver wolf -> ink black shaded indigo; the blue flame mane -> violet; the gold eyes stay gold (stamped in
    finish())"""
    m, L, C, h = lch_img(a)
    blue = consolidate(m & (h > 200) & (h < 320) & (C > 0.06), m)
    gold = m & (h > 55) & (h < 110) & (C > 0.08)
    blue &= ~gold
    fur = m & ~blue & ~gold
    a = gmap(a, fur, INKFUR, gamma=0.9)
    a = gmap(a, blue, VIOLET, gamma=0.9)
    a = gmap(a, gold, [(0.0, 'gold:3'), (1.0, 'gold:5')])
    return a


_EYES = {}


def rc_imp(a):
    """the green slime -> an ink jelly (black, violet in the light); the yellow veins -> gold flecks; the eyes kept for
    finish()"""
    m, L, C, h = lch_img(a)
    yel = m & (h > 70) & (h < 140) & (C > 0.08) & (L > 0.62)
    H, W = a.shape[:2]
    lab, n = ndi.label(yel)
    eyes = np.zeros_like(yel)
    if n:
        sz = ndi.sum(yel, lab, range(1, n + 1))
        for i, v in enumerate(sz):
            cyx = ndi.center_of_mass(yel, lab, i + 1)
            if 2 <= v <= 14 and 0.3 * H < cyx[0] < 0.62 * H:
                eyes |= lab == i + 1
    veins = yel & ~eyes
    body = m & ~yel
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.16, 'ink:1'), (0.32, 'hair_violet:2'), (0.5, 'hair_violet:3'),
                       (0.68, 'cloth_purple:3'), (0.85, 'cloth_purple:4'), (1.0, 'magic_violet:3')], gamma=0.85)
    a = gmap(a, veins, [(0.0, 'gold:3'), (1.0, 'gold:5')])
    a = gmap(a, eyes, [(0.0, 'shadow:0'), (1.0, 'shadow:1')])
    a = CL.majority_despeckle(a, passes=2, max_de=0.12, max_island=3, protect=eyes | veins)
    _EYES['margin_imp'] = eyes
    return a


def rc_crane(a):
    """the painted roc: its blue feathers -> cream paper (lighter at the lit tips); its gold -> gold"""
    m, L, C, h = lch_img(a)
    H, W = a.shape[:2]
    xs = np.mgrid[0:H, 0:W][1]
    warm = m & (h > 30) & (h < 120) & (C > 0.035) & (L > 0.3) & (xs > W * 0.6)
    lab, n = ndi.label(warm)
    if n:
        sz = ndi.sum(warm, lab, range(1, n + 1))
        warm = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 5])
    paper = m & ~warm
    a = gmap(a, paper, CREAM, gamma=0.55)
    a = gmap(a, warm, GOLD)
    return a


_SHELL = {}


def rc_worm(a):
    """the green shell -> cream parchment; the bronze head, horns and legs -> gold; the dark underside -> ink"""
    m, L, C, h = lch_img(a)
    green = consolidate(m & (h > 110) & (h < 200) & (C > 0.05), m, passes=1)
    warm = m & ~green & (h > 30) & (h < 120) & (C > 0.04)
    dark = m & ~green & ~warm
    a = gmap(a, green, PARCH, gamma=0.8)
    a = gmap(a, warm, GOLD, gamma=0.9)
    a = gmap(a, dark, [(0.0, 'shadow:0'), (0.5, 'ink:1'), (1.0, 'ink:2')])
    _SHELL['gnawing_bookworm'] = green
    return a


def rc_wraith(a):
    """the violet shroud -> violet shaded deep into ink (deeper than the painting: the cards must read against it); the
    blue eyes -> gold (redrawn in finish())"""
    m, L, C, h = lch_img(a)
    eye = m & (h > 200) & (h < 275) & (C > 0.12) & (L > 0.62)
    body = m & ~eye
    a = gmap(a, body, [(0.0, 'shadow:0'), (0.14, 'ink:1'), (0.3, 'roof_purple:1'), (0.46, 'roof_purple:2'),
                       (0.62, 'cloth_purple:3'), (0.8, 'cloth_purple:4'), (1.0, 'cloth_purple:5')], gamma=1.05)
    a = gmap(a, eye, [(0.0, 'gold:4'), (1.0, 'gold:5')])
    return a


_GLASS = {}


def glass_mask(a, m, L, C, h):
    """the mirror shield's glass: the largest light, cool mass of the knight (the blade is the second, and thin); filled
    so its facets go with it"""
    gm = m & (h > 160) & (h < 280) & (L > 0.5)
    lab, n = ndi.label(ndi.binary_closing(gm, iterations=2))
    if not n:
        return gm
    sz = ndi.sum(gm, lab, range(1, n + 1))
    g = ndi.binary_fill_holes(lab == int(np.argmax(sz)) + 1)
    return g & m


def rc_librarian(a):
    """silver plate -> ink plate lit violet; the blue cape -> ink; the gold trim -> gilt; the blue glow (blade, visor)
    -> ink; the mirror shield's glass -> the ink face of a great return stamp (its emblem in finish())"""
    m, L, C, h = lch_img(a)
    glass = glass_mask(a, m, L, C, h)
    cape = consolidate(m & (h > 230) & (h < 300) & (C > 0.07) & (L < 0.62), m) & ~glass
    gold = m & (h > 50) & (h < 110) & (C > 0.06) & ~glass
    glow = m & (h > 170) & (h < 270) & (C > 0.06) & (L > 0.62) & ~glass
    rest = m & ~cape & ~gold & ~glow & ~glass
    a = gmap(a, glass, [(0.0, 'shadow:0'), (0.5, 'ink:1'), (1.0, 'ink:2')], gamma=1.0)
    _GLASS['inkbound_librarian'] = glass
    a = gmap(a, rest, INKPLATE, gamma=1.0)
    a = gmap(a, cape, INKCAPE, gamma=1.1)
    a = gmap(a, gold, GILT)
    a = gmap(a, glow, [(0.0, 'ink:2'), (0.6, 'ink:3'), (1.0, 'ink:4')])
    return a


def rc_sentry(a):
    """silver plate -> gilt, its shadows ink (gilt over ink); the blue cape -> ink; the gold trim -> bright gilt; the
    mirror shield's glass -> ink lit violet (a dark shield against the gilt body); the blue glow (blade) -> gold"""
    m, L, C, h = lch_img(a)
    glass = glass_mask(a, m, L, C, h)
    cape = consolidate(m & (h > 230) & (h < 300) & (C > 0.07) & (L < 0.62), m) & ~glass
    gold = m & (h > 50) & (h < 110) & (C > 0.06) & ~glass
    glow = m & (h > 170) & (h < 270) & (C > 0.06) & (L > 0.62) & ~glass
    rest = m & ~cape & ~gold & ~glow & ~glass
    a = gmap(a, rest, DARKGILT, gamma=1.1)
    a = gmap(a, glass, INKPLATE, gamma=0.9)
    a = gmap(a, cape, INKCAPE, gamma=1.1)
    a = gmap(a, gold, GILT, gamma=0.8)
    a = gmap(a, glow, [(0.0, 'gold:3'), (0.6, 'gold:4'), (1.0, 'gold:5')])
    return a


SPECS = {
    'index_hound': dict(cell=2, h=60, k=16, rc=rc_hound, flip=True, eyes=[(93, 233)]),
    'margin_imp': dict(cell=0, h=48, k=14, rc=rc_imp),
    'paper_crane': dict(cell=6, h=70, k=16, rc=rc_crane, keep=0.03, dist=30),
    'gnawing_bookworm': dict(cell=3, h=50, k=16, rc=rc_worm, flip=True),
    'catalog_wraith': dict(cell=1, h=72, k=14, rc=rc_wraith),
    'inkbound_librarian': dict(cell=5, h=96, k=18, rc=rc_librarian, flip=True, keep=0.05, dist=20),
    'unnamed_sentry': dict(cell=5, h=108, k=18, rc=rc_sentry, flip=True, keep=0.05, dist=20),
}

_EYE_AT = {}


def make(eid, src):
    spec = SPECS[eid]
    obj = main_object(grid_cell(src, 4, 2, spec['cell']), keep_frac=spec.get('keep', 0.04), max_dist=spec.get('dist', 40))
    tw, th = fit_size(obj, th=spec['h'])
    d, _ = pixelize2(obj, tw, th, k=spec['k'], sharpen=0.0, max_de=0.10, ring=False)
    d = spec['rc'](d)
    d = CL.snap_master(d, 0.04)
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 6 if th > 30 else 3)
    big = CL.ramp_outline(big)
    if spec.get('eyes'):
        oh, ow = obj.shape[:2]
        for sx, sy in spec['eyes']:
            x = int(round(sx * tw / ow)) + 1
            y = int(round(sy * th / oh)) + 1
            _EYE_AT[eid] = (x, y, spec.get('flip', False), big.shape[1])
    if spec.get('flip'):
        big = flip_x(big)
    return big


# ----------------------------------------------------------------------------- hand edits
def hound_face(a):
    """the hound's gold eye under a dark brow (facing right)"""
    if 'index_hound' in _EYE_AT:
        x, y, fl, w = _EYE_AT['index_hound']
        if fl:
            x = w - 1 - x
        put(a, x, y, 'gold:5'); put(a, x - 1, y, 'gold:3')
        for dx in (-1, 0, 1):
            put(a, x + dx, y - 1, 'shadow:0')
        put(a, x + 1, y, 'shadow:0')
    return a


def drawer_ribs(a):
    """card-drawer ribs: three narrow drawer fronts set into the black fur along the flank where the ribs would be,
    each cream with a dark frame, a gold pull and a white label slip, following the rib arc (measured on the 60 px cut)"""
    H, W = a.shape[:2]
    DR = ['kkkk', 'kPPk', 'kGPk', 'kPPk', 'kWPk', 'kkkk']
    leg = {'k': 'shadow:0', 'P': 'stone_warm:5', 'G': 'gold:4', 'W': 'metal:4'}
    for (fx, fy) in ((0.38, 0.37), (0.45, 0.34), (0.52, 0.37)):
        a = stamp(a, DR, leg, int(round(W * fx)), int(round(H * fy)))
    return a


def imp_eyes(a):
    """two gold eyes with dark pupils in the jelly"""
    eyes = _EYES.get('margin_imp')
    big = np.zeros(a.shape[:2], bool)
    if eyes is not None:
        big[1:-1, 1:-1] = eyes
    lab, n = ndi.label(big)
    if n > 2:
        sz = ndi.sum(big, lab, range(1, n + 1))
        keep = [int(i) + 1 for i in np.argsort(sz)[::-1][:2]]
    else:
        keep = list(range(1, n + 1))
    EYE = ['.kkk.', 'kYGkk', 'kGGkk', '.kkk.']
    leg = {'k': 'shadow:0', 'G': 'gold:4', 'Y': 'gold:5'}
    for i in keep:
        ys, xs = np.nonzero(lab == i)
        cx, cy = int(round(xs.mean())), int(round(ys.mean()))
        a = stamp(a, EYE, leg, cx - 2, cy - 1)
    return a


def crane_folds(a):
    """the crease lines of folded paper: straight violet-ink creases across the wings and body, each with a lit edge
    on its upper side; an ink eye by the beak"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    e = edge_mask(a)
    paper = m & ~e & (C < 0.06)
    paper = ndi.binary_erosion(paper, iterations=1)
    for (x0, y0, x1, y1) in ((0.05, 0.15, 0.55, 0.6), (0.25, 0.05, 0.6, 0.5), (0.1, 0.55, 0.7, 0.45), (0.55, 0.3, 0.85, 0.75)):
        n = int(max(abs(x1 - x0) * W, abs(y1 - y0) * H))
        for i in range(n + 1):
            x = int(round((x0 + (x1 - x0) * i / n) * W))
            y = int(round((y0 + (y1 - y0) * i / n) * H))
            if 0 <= y < H and 0 <= x < W and paper[y, x]:
                put(a, x, y, 'hair_violet:3')
                if y - 1 >= 0 and paper[y - 1, x]:
                    put(a, x, y - 1, 'metal:4')
    # the eye: just behind the gold beak (upper right)
    warm = m & (h > 40) & (h < 120) & (C > 0.07)
    box = np.zeros((H, W), bool)
    box[:int(H * 0.55), int(W * 0.7):] = True
    bk = warm & box
    if bk.any():
        ys, xs = np.nonzero(bk)
        bx, by = int(xs.min()), int(ys.min())
        a = stamp(a, ['kk', 'kk'], {'k': 'shadow:0'}, bx - 3, by)
    return a


def worm_lines(a):
    """lines of writing ruled across the parchment shell: short ink dashes on every third row, a margin rule"""
    s = _SHELL.get('gnawing_bookworm')
    if s is None:
        return a
    shell = np.zeros(a.shape[:2], bool)
    shell[1:-1, 1:-1] = s[:, ::-1]
    shell = ndi.binary_erosion(shell, iterations=1) & (a[..., 3] > 0.5) & ~edge_mask(a)
    H, W = a.shape[:2]
    rng = np.random.RandomState(8)
    for y in range(2, H - 2, 3):
        x = rng.randint(0, 3)
        while x < W - 2:
            if shell[y, x] and shell[y, x + 1]:
                n = 2 + rng.randint(0, 3)
                for i in range(n):
                    if x + i < W and shell[y, x + i]:
                        put(a, x + i, y, 'ink:2')
                x += n + 1 + rng.randint(0, 2)
            else:
                x += 1
    return a


def wraith_cards(a):
    """index cards trailing from the wraith's rags: cream cards with a ruled line and a violet header, tumbling down
    and back from the hem (drawn only where nothing stands)"""
    H, W = a.shape[:2]
    CARD = ['kkkkkkkkk', 'kVVVVVVVk', 'kPPPPPPPk', 'kPkkkkPPk', 'kPPPPPPPk', 'kPkkkPPPk', 'kkkkkkkkk']
    CARD_T = ['..kkkk...', '.kVVVVk..', 'kPVVPPPk.', 'kPPPkkPk.', '.kPPPPPPk', '.kPkkPPk.', '..kPPPk..', '...kkk...']
    leg = {'k': 'shadow:0', 'P': 'stone_warm:5', 'V': 'cloth_purple:4'}
    al = a[..., 3] > 0.5
    out = a
    for i, (fx, fy) in enumerate(((0.04, 0.6), (0.14, 0.78), (0.0, 0.84), (0.3, 0.86))):
        x, y = int(W * fx), int(H * fy)
        g = CARD if i % 2 == 0 else CARD_T
        out = stamp(out, g, leg, x, y)
    return out


def wraith_eyes(a):
    """two gold eyes in the hood's dark"""
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    gold = m & (h > 50) & (h < 110) & (C > 0.06) & (L > 0.7)
    box = np.zeros((H, W), bool)
    box[:int(H * 0.4), int(W * 0.3):int(W * 0.8)] = True
    g = gold & box
    if g.any():
        ys, xs = np.nonzero(g)
        for x, y in zip(xs, ys):
            put(a, x, y, 'gold:5')
    return a


def shield_box(a, x0=0.0, x1=1.0):
    """the shield: the largest light mass in the knight's lower-left (facing right, the shield is on the near side,
    screen left): measured on the cut as a box"""
    H, W = a.shape[:2]
    return int(W * 0.0), int(W * 0.45), int(H * 0.2), int(H * 0.82)


def librarian_stamp(a):
    """the shield's glass is the ink face of a great return stamp: a gilt rim inside its gold frame and the Library's
    open book cut into the middle in gilt lines"""
    g = _GLASS.get('inkbound_librarian')
    if g is None or not g.any():
        return a
    H, W = a.shape[:2]
    sh = np.zeros((H, W), bool)
    sh[1:-1, 1:-1] = g[:, ::-1]
    ring = sh & ~ndi.binary_erosion(sh, iterations=1)
    for y, x in zip(*np.nonzero(ring)):
        put(a, x, y, 'gold:2' if (x + y) % 2 else 'gold:3')
    ys, xs = np.nonzero(sh)
    cx, cy = int(round(xs.mean())), int(round(ys.mean()))
    BOOK = ['.GG.....GG.',
            'GYYG...GYYG',
            'GYYYG.GYYYG',
            'GYYYYGYYYYG',
            'GYYYYGYYYYG',
            '.GGGGGGGGG.',
            '.....G.....']
    return stamp(a, BOOK, {'G': 'gold:3', 'Y': 'cloth_purple:3'}, cx - 5, cy - 3)


def visor_glint(a, ref=('magic_violet:3', 'magic_violet:4')):
    H, W = a.shape[:2]
    m, L, C, h = lch_img(a)
    box = np.zeros((H, W), bool)
    box[int(H * 0.04):int(H * 0.16), int(W * 0.3):int(W * 0.75)] = True
    dark = box & m & (L < 0.3) & ~edge_mask(a)
    if not dark.any():
        return a
    ys, xs = np.nonzero(dark)
    i = int(np.argmin(np.abs(ys - ys.mean()) + np.abs(xs - xs.mean())))
    put(a, xs[i], ys[i], ref[0]); put(a, xs[i] + 1, ys[i], ref[1])
    return a


def helm_box(a):
    """the helmet's face: the opaque rows from the top of the head down a ninth of the height, at the helmet's columns
    (the plume and the tip of the head are left alone)"""
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    rows = np.nonzero(al[:, int(W * 0.35):int(W * 0.75)].any(1))[0]
    top = int(rows.min())
    band = al[top + 4:top + 16, int(W * 0.3):int(W * 0.8)]
    xs = np.nonzero(band.any(0))[0] + int(W * 0.3)
    return int(xs.min()), int(xs.max()), top, top + 16


_FACE = {}

FACEPLATE = ['..kkkkkk..',
             '.kWWWWWWk.',
             'kWWWWWWwwk',
             'kWWWWWWwwk',
             'kWWWWWWwwk',
             'kWWWWWwwwk',
             'kWWWWWwwwk',
             '.kWWWwwwk.',
             '..kwwwwk..',
             '...kkkk...']
FACE_AT = (53, 8)       # the helmet's face on the 108 px cut (+ 1 padding), found by eye on the cut at 6x
FACE_LEG = {'k': 'shadow:0', 'W': 'stone_warm:5', 'w': 'stone_warm:4'}
CRACK = [(5, 1), (5, 2), (4, 3), (5, 4), (6, 5), (5, 6), (4, 7), (4, 8)]


def sentry_face(a):
    """the blank faceplate: a cream oval with no eyes and no mouth set into the gilt helmet, its lit side to the upper
    left (the light of every boss)"""
    H, W = a.shape[:2]
    fx, fy = int(round(FACE_AT[0] * W / 107.0)), int(round(FACE_AT[1] * H / 110.0))
    _FACE['xy'] = (fx, fy)
    return stamp(a, FACEPLATE, FACE_LEG, fx, fy)


def crack_face(a):
    """the 50% look: a black crack splits the faceplate top to bottom, a chip of it fallen out (the ink under it shows)
    and two shards falling beside the head"""
    fx, fy = _FACE['xy']
    for (x, y) in CRACK:
        put(a, fx + x, fy + y, 'shadow:0')
        put(a, fx + x + 1, fy + y, 'stone_warm:3' if y < 6 else 'shadow:1')
    for (x, y) in ((6, 2), (7, 2), (7, 3), (6, 3)):
        put(a, fx + x, fy + y, 'ink:1')
    H, W = a.shape[:2]
    al = a[..., 3] > 0.5
    for (sx, sy) in ((fx + 12, fy + 12), (fx + 14, fy + 18)):
        if 0 <= sy < H - 2 and 0 <= sx < W - 2 and not al[sy:sy + 2, sx:sx + 2].any():
            a = stamp(a, ['kW', 'Wk'], {'k': 'shadow:0', 'W': 'stone_warm:5'}, sx, sy)
    return a


def finish(eid, a):
    """per-foe hand edits on the right-facing base, then the contrast rule (dark outline, warm rim)"""
    if eid == 'index_hound':
        a = drawer_ribs(hound_face(a))
    if eid == 'margin_imp':
        a = imp_eyes(a)
    if eid == 'paper_crane':
        a = crane_folds(a)
    if eid == 'gnawing_bookworm':
        a = worm_lines(a)
    if eid == 'catalog_wraith':
        a = wraith_eyes(a)
    if eid == 'inkbound_librarian':
        a = librarian_stamp(a)
        a = visor_glint(a)
    if eid in ('unnamed_sentry', 'unnamed_sentry_cracked'):
        a = sentry_face(a)
        if eid == 'unnamed_sentry_cracked':
            a = crack_face(a)
    a = contrast(a)
    if eid == 'catalog_wraith':
        a = wraith_cards(a)
    return a


_CACHE = {}


def build():
    if not _CACHE:
        src = load_src('enemies.png')
        cut = {}
        for eid in SPECS:
            cut[eid] = make(eid, src)
        for eid in IDS:
            _CACHE[eid] = finish(eid, cut[eid].copy())
        for eid in SENTRY:
            _CACHE[eid] = finish(eid, cut['unnamed_sentry'].copy())
    return _CACHE


def base():
    return dict(build())


# ----------------------------------------------------------------------------- derived frames
def pack8(eid, base, raw):
    """anim_frames._pack with an ink death: the dissolve front runs gold and the drifting ash is violet ink"""
    ox, oy = AF.origin_of(base)
    out = {}
    for n, v in raw.items():
        img, dox = (v if isinstance(v, tuple) else (v, 0))
        out[n] = (img, ox + dox, oy)
    seed = sum(ord(c) for c in eid) * 17 + 7
    for i, lv in enumerate(AF.DIE_LEVELS):
        out[f'die_{i}'] = (AF.dissolve(AF.canvas(base), lv, seed, edge='gold:4', ash='cloth_purple:3'), ox, oy)
    return out


GOLD_GLOW = [(0.0, 'gold:3'), (0.5, 'gold:4'), (1.0, 'gold:5')]
VIOLET_GLOW = [(0.0, 'cloth_purple:4'), (0.5, 'magic_violet:3'), (1.0, 'magic_violet:4')]


def derived(eid, img):
    import ep3_enemies as E3
    from ep2_enemies import f_wraith
    H, W = img.shape[:2]
    if eid == 'index_hound':
        from hollow_enemies import f_wolf
        raw = f_wolf(img, 1.0, 0, 0, prefer=('shadow', 'ink', 'hair_violet', 'roof_purple', 'cloth_purple'))
    elif eid == 'gnawing_bookworm':
        raw = AF.f_moss_scarab(img, prefer=('shadow', 'ink', 'earth', 'path', 'sand', 'gold'))
    elif eid == 'paper_crane':
        raw = E3.f_specter(img)
        c = raw['cast']
        c, dox = (c if isinstance(c, tuple) else (c, 0))
        m, L, C, h = lch_img(c)
        raw['cast'] = (gmap(c, m & (h < 70) & (C > 0.1) & (L > 0.5), GOLD_GLOW), dox)
    elif eid == 'margin_imp':
        raw = AF.f_ink_slime(img)
        raw['hurt'] = AF.edge_lift(AF.lean(AF.canvas(img), 40, -2, taper=14), 2, prefer=('ink', 'hair_violet', 'shadow'))
        a = AF.canvas(img)
        m, L, C, h = lch_img(a)
        f = AF.glow(a, m & (h > 50) & (h < 110) & (C > 0.06), 'gold', 0.55, 2)
        raw['cast'] = AF.sparkles(f, [(int(W * 0.5), -3, 2), (int(W * 0.2), 2, 1), (int(W * 0.8), -1, 2), (int(W * 0.36), -7, 1)],
                                  ['gold:5', 'gold:4', 'magic_violet:4'])
    elif eid == 'catalog_wraith':
        raw = f_wraith(img, img.shape[0] / 72.0, 'gold', 2, ['gold:5', 'gold:4', 'stone_warm:5'],
                       ('shadow', 'ink', 'roof_purple', 'cloth_purple'))
        raw['cast'] = E5.remap_violet(raw['cast'], GOLD_GLOW)
    elif eid == 'inkbound_librarian':
        raw = E5.knight_scaled(img, 1.0)
        raw['cast'] = E5.remap_violet(raw['cast'], VIOLET_GLOW)
    elif eid in SENTRY:
        raw = E5.knight_scaled(img, H / 98.0)
        raw['cast'] = E5.remap_violet(raw['cast'], GOLD_GLOW)
    else:
        raw = {}
    return pack8(eid, img, raw)


CASTERS = ('margin_imp', 'paper_crane', 'catalog_wraith', 'inkbound_librarian', 'unnamed_sentry', 'unnamed_sentry_cracked')


def frames_of(eid):
    img = build()[eid]
    H, W = img.shape[:2]
    out = [(eid, img, W // 2, H - 1)]
    fr = derived(eid, img)
    out += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr and (n != 'cast' or eid in CASTERS)]
    return out


def atlas_frames(ids=None):
    out = []
    for eid in (ids or ALL_IDS):
        out += frames_of(eid)
    return out


VOID_BG = (52, 30, 84)
PAGE_BG = (238, 230, 214)

if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep8'), exist_ok=True)
    b = base()
    for bg, tag in ((PAGE_BG, 'page'), (VOID_BG, 'void')):
        contact(list(b.items()), os.path.join(OUT, 'ep8', f'enemies_base_4x_{tag}.png'), scale=4, cols=4, bg=bg,
                title='Episode 8 foes (base) at 4x')
