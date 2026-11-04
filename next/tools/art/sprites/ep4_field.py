"""Episode 4 field (map) sprites (E4-sprites): the visible foes and the Paper Regent's map avatar.

Foes: their Episode 1 kin's hand-pixeled grids (chars/enemy_field.py) in the Episode 4 palettes, so each reads as the
same breed as in battle, with a 1 px rim light on the upper-left edge (CRITIQUE_4 item 8: a visible enemy must not
vanish into the Keep's wet dark floor). Facing LEFT, 2 frames, origin bottom-centre.

  flood_hound <- briar_wolf      lockjaw_crab <- moss_scarab     ink_bloom <- ink_slime     drowned_watch <- echo_warden
  gutter_phantom <- ink_wraith   blank_decree <- lost_page       waterlogged_sentinel <- tome_golem
  barrister <- page_wraith (a black gown, the white collar, papers)

paper_regent_avatar (front) and paper_regent_avatar_back: the boss at map scale (40 x 54), drawn from shapes at 1x like
warden_avatar.py: turquoise robes wound with cream scroll bands and red seals, a dark hood with two cyan eyes under a
gold crown, the trident held at its right side. The face and crown are the bright place.

    frames()  -> {id: [rgba, rgba]}
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from PIL import Image, ImageDraw
from pix import *
import pal as P
import enemy_field as EF
from ep3_enemies import rim
import ep4_enemies as E4

VARIANTS = {
    'flood_hound': ('briar_wolf', {
        '0': 'shadow:0', 'r': 'shadow:2', 'R': 'stone_cool:2', 'x': 'stone_cool:3', 'X': 'stone_cool:4',
        'g': 'foliage_dark:1', 'G': 'roof_green:2', 'H': 'roof_green:3', 'Y': 'gold:4', 'w': 'stone_cool:5', 'n': 'ink:1'}),
    'lockjaw_crab': ('moss_scarab', {
        '0': 'shadow:0', 'a': 'shadow:2', 'b': 'stone_cool:2', 'c': 'stone_cool:3', 'd': 'stone_cool:4', 'W': 'stone_warm:5',
        'g': 'roof_red:1', 'G': 'roof_red:3', 'H': 'roof_red:4', 'Y': 'stone_warm:4'}),
    'ink_bloom': ('ink_slime', {
        '0': 'shadow:0', 'a': 'ink:1', 'b': 'ink:2', 'c': 'ink:3', 'd': 'roof_blue:3', 'W': 'water:4',
        'Y': 'ice:2', 'y': 'water:3'}),
    'drowned_watch': ('echo_warden', {
        '0': 'shadow:0', 'M': 'foliage_dark:1', 'N': 'roof_green:2', 'O': 'stone_cool:2', 'P': 'stone_cool:3', 'Q': 'stone_cool:4',
        'B': 'foliage_dark:0', 'C': 'foliage_dark:1', 'D': 'roof_green:2', 'g': 'wood:3', 'G': 'gold:2', 'k': 'magic_cyan:1',
        'K': 'magic_cyan:2', 'L': 'magic_cyan:3', 'e': 'magic_cyan:4'}),
    'gutter_phantom': ('ink_wraith', {
        '0': 'shadow:0', 'i': 'foliage_dark:0', 'I': 'foliage_dark:1', 'j': 'roof_green:2', 'J': 'roof_green:3',
        'v': 'roof_green:2', 'V': 'roof_green:3', 's': 'roof_green:4', 'S': 'stone_cool:4', 'e': 'gold:4'}),
    'blank_decree': ('lost_page', {
        '0': 'stone_warm:1', 'I': 'stone_warm:2', 'l': 'stone_warm:3', 'm': 'stone_warm:4', 'n': 'stone_warm:4',
        'o': 'stone_warm:5', 'V': 'roof_red:3', 'W': 'metal:4'}),
    'waterlogged_sentinel': ('tome_golem', {
        '0': 'shadow:0', 'k': 'shadow:2', 'K': 'stone_cool:2', 'l': 'stone_cool:3', 'L': 'stone_cool:4', 'W': 'stone_cool:5',
        'g': 'roof_green:2', 'G': 'magic_cyan:2', 'Y': 'magic_cyan:3', 'Z': 'magic_cyan:4', 'p': 'stone_warm:3'}),
    'barrister': ('page_wraith', {
        '0': 'shadow:0', 'i': 'ink:0', 'I': 'ink:1', 'j': 'shadow:2', 'l': 'stone_cool:2', 'm': 'stone_cool:3',
        'n': 'stone_cool:4', 'o': 'metal:2', 'e': 'ice:2', 'E': 'ice:3'}),
}


# E4-fixes-B (CRITIQUE_6 item 9): the crab is no longer the scarab's grid with a horn. Its own 16 x 16, seen from the
# front: two big rust pincers raised either side (the near jaw open), eye stalks with pale beads, a wide flat barnacled
# shell, legs splayed. Same keys as the scarab palette (a..d shell, W light, g/G/H rust, Y barnacle).
CRAB = [
    ['................',
     '.000........000.',
     '0HHG0......0GHH0',
     '0H00G0....0G00H0',
     '0HGGG0W00W0GGGH0',
     '.0GGg0a00a0gGG0.',
     '...0g0000000g0..',
     '..00dWWdddddc00.',
     '.0dWddYdddcccc0.',
     '0cddddddcccccbb0',
     '0bccYcccccbbbba0',
     '.0bbbbbbbbbbaa0.',
     '..0aaa0000aaa0..',
     '.0G0G0....0G0G0.',
     '0G.0G0....0G0.G0',
     '0..0........0..0'],
    ['................',
     '................',
     '.000........000.',
     '0HHG0......0GHH0',
     '0HHGG0W00W0GGHH0',
     '.0GGg0a00a0gGG0.',
     '...0g0000000g0..',
     '..00dWWdddddc00.',
     '.0dWddYdddcccc0.',
     '0cddddddcccccbb0',
     '0bccYcccccbbbba0',
     '.0bbbbbbbbbbaa0.',
     '..0aaa0000aaa0..',
     '..0G0G0..0G0G0..',
     '.0G.0G0..0G0.G0.',
     '.0..0......0..0.'],
]
# the eyes of the phantom: a 2 x 2 gold cluster (CRITIQUE_6 item 8 asks for an accent of at least 2 x 2)
PHANTOM_EYES = [(9, 5), (11, 5)]


def foe_frames():
    out = {}
    for vid, (src, pal) in VARIANTS.items():
        d = EF.FIELD[src]
        if vid == 'lockjaw_crab':
            d = {'size': (16, 16), 'frames': [chr(10).join(g) for g in CRAB]}
        leg = P.resolve(pal, 'field_' + vid)
        w, h = d['size']
        imgs = [parse_grid(grid_from_text(g), leg, w=w, h=h) for g in d['frames']]
        if vid == 'ink_bloom':
            imgs = [seal(im) for im in imgs]
        if vid == 'gutter_phantom':
            imgs = [eyes2(im) for im in imgs]
        out[vid] = [rim(im, {'rim': E4.FIELD_RIM[vid]}) for im in imgs]
    return out


def eyes2(im):
    """the phantom's two lantern eyes as 2 x 2 gold clusters with a hot top pixel (frame-independent: found as the
    gold pixels of the grid)"""
    im = im.copy()
    g4 = np.array(hex2rgb(P.color('gold:4')), np.float32) / 255
    g5 = np.array(hex2rgb(P.color('gold:5')), np.float32) / 255
    g3 = np.array(hex2rgb(P.color('gold:3')), np.float32) / 255
    ys, xs = np.nonzero((np.abs(im[..., :3] - g4).sum(-1) < 0.02) & (im[..., 3] > 0.5))
    for y, x in zip(ys, xs):
        im[y, x, :3] = g5
        sx = -1 if x == xs.min() else 1
        for (dx, dy) in ((sx, 0), (0, 1), (sx, 1)):
            if 0 <= y + dy < im.shape[0] and 0 <= x + dx < im.shape[1]:
                im[y + dy, x + dx, :3] = g4 if dy == 0 else g3
                im[y + dy, x + dx, 3] = 1
    return im


def seal(im):
    """a 2 x 2 red seal in the ink blot's lower body (frame-independent: the lowest-middle opaque spot)"""
    im = im.copy()
    H, W = im.shape[:2]
    c = np.array(hex2rgb(P.color('roof_red:3')), np.float32) / 255
    c2 = np.array(hex2rgb(P.color('roof_red:4')), np.float32) / 255
    for (x, y, cc) in ((9, 11, c2), (10, 11, c), (9, 12, c), (10, 12, c)):
        if im[y, x, 3] > 0.5:
            im[y, x, :3] = cc
    return im


# ----------------------------------------------------------------------------- the Paper Regent's avatar
AW, AH = 40, 54
ACX = 20
YS, XS = np.mgrid[0:AH, 0:AW]


def C(ref):
    c = hex2rgb(P.color(ref, 'paper_regent_avatar'))
    return np.array([c[0] / 255, c[1] / 255, c[2] / 255, 1.0], np.float32)


ROBE = dict(base='magic_cyan:1', light='magic_cyan:2', dark='roof_green:2', outline='shadow:0')
ROBE_IN = dict(base='roof_green:2', light='roof_green:3', dark='foliage_dark:1', outline='shadow:0')
BAND = dict(base='stone_warm:4', light='stone_warm:5', dark='stone_warm:3', outline='stone_warm:1')
GOLD = dict(base='gold:3', light='gold:4', dark='gold:2', outline='wood:0')
HOOD = dict(base='roof_green:1', light='magic_cyan:1', dark='shadow:1', outline='shadow:0')


def poly(pts):
    im = Image.new('L', (AW, AH), 0)
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=1)
    return np.asarray(im) > 0


def ellipse(cx, cy, rx, ry):
    return ((XS + 0.5 - cx) / rx) ** 2 + ((YS + 0.5 - cy) / ry) ** 2 <= 1.0


def nb(m, dx, dy):
    out = np.zeros_like(m)
    ys = slice(max(0, -dy), AH - max(0, dy)); yd = slice(max(0, dy), AH - max(0, -dy))
    xs = slice(max(0, -dx), AW - max(0, dx)); xd = slice(max(0, dx), AW - max(0, -dx))
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
        o = ring(m) & (cv[..., 3] < 0.5)
        cv[o] = C(r['outline'])


def trident(cv, i):
    """the trident at its right side (screen right in the front view), its head above the shoulder"""
    x = ACX + 13
    for y in range(9, 52):
        cv[y, x] = C('gold:3'); cv[y, x + 1] = C('gold:2')
    cv[8:10, x - 3:x + 5] = C('gold:2')
    for px in (x - 3, x, x + 4):
        cv[2:8, px] = C('gold:4' if px == x else 'gold:3')
        cv[1, px] = C('gold:4')
    o = ring(cv[..., 3] > 0.5) & (YS < 54)
    return o


def robe_body(cv, i, back):
    # outer robe: a wide flared bell, the hem rippling
    pts = [(ACX - 7, 14), (ACX + 7, 14), (ACX + 15, 50), (ACX + 9, 53), (ACX + 3, 51), (ACX - 3, 53), (ACX - 9, 51), (ACX - 15, 52)]
    paint(cv, poly(pts), ROBE)
    if not back:
        inner = poly([(ACX - 4, 18), (ACX + 4, 18), (ACX + 7, 50), (ACX - 7, 50)])
        paint(cv, inner, ROBE_IN, outline=False)
    # scroll bands wound round the robe (diagonals), each a cream strip with a lit top edge
    for k, (y0, y1) in enumerate(((22, 30), (32, 40), (42, 48))):
        band = poly([(ACX - 14 + k, y0), (ACX + 14 - k, y0 + 4 + (i if k == 1 else 0)), (ACX + 14 - k, y0 + 7),
                     (ACX - 14 + k, y0 + 3)])
        band &= cv[..., 3] > 0.5
        paint(cv, band, BAND, outline=False)
        # one red seal on each band (front only)
        if not back:
            sx = ACX - 5 + k * 5
            sy = y0 + 2 + k
            cv[sy:sy + 2, sx:sx + 2] = C('roof_red:3')
            cv[sy, sx] = C('roof_red:4')
    # shoulders: the scroll stole over them
    stole = ellipse(ACX, 15, 10, 3.6)
    paint(cv, stole, BAND)


def head(cv, i, back):
    hood = ellipse(ACX, 9, 5.5, 6.2)
    paint(cv, hood, HOOD)
    if not back:
        face = ellipse(ACX, 10, 3.3, 3.6)
        cv[face] = C('shadow:0')
        eye = 'magic_cyan:4' if i == 0 else 'ice:3'
        cv[9, ACX - 2] = C(eye); cv[9, ACX - 1] = C('magic_cyan:2')
        cv[9, ACX + 1] = C('magic_cyan:2'); cv[9, ACX + 2] = C(eye)
    # the crown: a gold band with five points over the hood
    crown = poly([(ACX - 5, 5), (ACX + 5, 5), (ACX + 5, 2), (ACX + 4, 0), (ACX + 3, 2), (ACX + 1, -1), (ACX, 2), (ACX - 1, -1),
                  (ACX - 3, 2), (ACX - 4, 0), (ACX - 5, 2)])
    paint(cv, crown, GOLD)
    if not back:
        cv[3, ACX] = C('magic_cyan:3')      # the crown's jewel


def avatar(i=0, back=False):
    cv = np.zeros((AH, AW, 4), np.float32)
    if back:
        robe_body(cv, i, True)
        head(cv, i, True)
        # the back: the scroll's loose end hangs down the spine
        tail = poly([(ACX - 2, 16), (ACX + 2, 16), (ACX + 3, 44), (ACX - 1, 46)])
        paint(cv, tail, BAND, outline=False)
        trident_at(cv, i, left=True)
    else:
        robe_body(cv, i, False)
        head(cv, i, False)
        trident_at(cv, i, left=False)
    return cv


def trident_at(cv, i, left=False):
    """the gold trident, held at the figure's right hand: screen right from the front, screen left from behind"""
    x = ACX + 14 if not left else ACX - 15
    hand = (24, x)
    for y in range(8, 53):
        cv[y, x] = C('gold:3'); cv[y, x + 1] = C('gold:2')
    for xx in range(x - 3, x + 5):
        cv[8, xx] = C('gold:3'); cv[9, xx] = C('gold:2')
    for px in (x - 3, x, x + 4):
        for y in range(2, 8):
            cv[y, px] = C('gold:4' if px == x else 'gold:3')
        cv[1, px] = C('gold:4')
    # an outline ring round the metal where it touches transparency
    m = np.zeros((AH, AW), bool)
    m[1:53, x - 3:x + 5] = True
    metal = m & (cv[..., 3] > 0.5) & (np.abs(cv[..., 0] - C('gold:3')[0]) < 0.3)
    o = ring(metal) & (cv[..., 3] < 0.5)
    cv[o] = C('wood:0')
    # the hand
    cv[hand[0]:hand[0] + 3, x - 1:x + 2] = C('magic_cyan:2')
    cv[hand[0] + 2, x - 1:x + 2] = C('roof_green:2')


def frames():
    f = foe_frames()
    f['paper_regent_avatar'] = [avatar(0), avatar(1)]
    f['paper_regent_avatar_back'] = [avatar(0, True), avatar(1, True)]
    return f


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep4'), exist_ok=True)
    items = []
    for k, v in frames().items():
        items += [(f'{k}_{i}', im) for i, im in enumerate(v)]
    contact(items, os.path.join(OUT, 'ep4', 'ep4_field_6x.png'), scale=6, cols=6, bg=(52, 60, 62), title='ep4 field sprites at 6x (facing left)')
