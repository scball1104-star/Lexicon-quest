"""Episode 6 field (map) sprites (E6-sprites): the visible foes, the Gale Engine and the Storm Scribe's map avatar.

Foes: their Episode 1 kin's hand-pixeled grids (chars/enemy_field.py) in the Episode 6 palettes, so each reads as the same
breed as in battle; the Storm Harrier takes Episode 5's hawk grid (ep5_field.HARRIER) in cobalt, and the Lightning Manta
has no kin on the map, so it is drawn in code (a ray seen from the front, wings up and wings down, its spark lines on
them). Facing LEFT, 2 frames, origin bottom-centre. Every one carries the contrast rule of ep6_enemies.py baked in: the
grid's own outline is the darkest master colour (it holds on the bright cloud and the sunlit planks) and a 1 px side rim
just inside it on the upper, left and right edges (cloud white for Aloft foes, brass for grounded ones) holds on F2's
dark grating and F3's slate cloud (CRITIQUE_6 item 8). A FIELD_LOOK entry is not needed.

  squall_wolf <- briar_wolf (slate, white streaks, a cobalt mane)   gale_sprite <- ink_slime (cloud white, blue eyes)
  rigger_beetle <- moss_scarab (brass shell, rivets, rope legs)       signal_wraith <- page_wraith (slate, a lamp in the hood)
  storm_harrier <- ep5 dust_harrier grid (cobalt, white breast)      lightning_manta (new, drawn)
  storm_page <- lost_page (storm paper, blue runes, a blue eye)      gale_engine <- tome_golem (brass, cobalt bands, a fan)
  scribe_avatar, scribe_avatar_back: ep6_scribe.avatar()

    frames()  -> {id: [rgba, rgba]}
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from pix import *
import pal as P
import enemy_field as EF
import ep5_field as F5
import ep6_enemies as E6

VARIANTS = {
    'squall_wolf': ('briar_wolf', {
        '0': 'shadow:0', 'r': 'stone_cool:1', 'R': 'stone_cool:2', 'x': 'stone_cool:3', 'X': 'stone_cool:4',
        'g': 'roof_blue:1', 'G': 'roof_blue:2', 'H': 'roof_blue:3', 'Y': 'ice:3', 'w': 'metal:4', 'n': 'ink:1'}),
    'gale_sprite': ('ink_slime', {
        '0': 'shadow:0', 'a': 'cloth_blue:3', 'b': 'cloth_blue:4', 'c': 'stone_cool:5', 'd': 'metal:4', 'W': 'metal:4',
        'Y': 'water:3', 'y': 'roof_blue:1'}),
    'rigger_beetle': ('moss_scarab', {
        '0': 'shadow:0', 'a': 'wood:1', 'b': 'gold:2', 'c': 'gold:3', 'd': 'gold:4', 'W': 'gold:5',
        'g': 'earth:2', 'G': 'path:1', 'H': 'path:3', 'Y': 'ice:2'}),
    'signal_wraith': ('page_wraith', {
        '0': 'shadow:0', 'i': 'shadow:1', 'I': 'stone_cool:1', 'j': 'stone_cool:2', 'l': 'stone_cool:3', 'm': 'stone_cool:4',
        'n': 'stone_cool:5', 'o': 'metal:3', 'e': 'fire:4', 'E': 'fire:5'}),
    'storm_page': ('lost_page', {
        '0': 'shadow:0', 'I': 'water:4', 'l': 'stone_cool:3', 'm': 'stone_cool:4', 'n': 'stone_cool:5', 'o': 'metal:3',
        'V': 'roof_blue:1', 'W': 'ice:3'}),
    'gale_engine': ('tome_golem', {
        '0': 'shadow:0', 'k': 'wood:1', 'K': 'wood:2', 'l': 'gold:2', 'L': 'gold:3', 'W': 'gold:4',
        'g': 'roof_blue:1', 'G': 'roof_blue:3', 'Y': 'metal:4', 'Z': 'ice:3', 'p': 'roof_blue:2'}),
}
HARRIER_PAL = {'0': 'shadow:0', 'H': 'metal:3', 'h': 'stone_cool:5', 'w': 'metal:4', 'Y': 'gold:5',
               'X': 'roof_blue:4', 'x': 'roof_blue:3', 'r': 'roof_blue:1', 'R': 'roof_blue:2', 'q': 'gold:3'}


def manta(up):
    """a ray seen from the front: a diamond body with two yellow eyes, two broad wings (up: tips raised; down: tips
    level and swept), a thin tail with a spark at its tip, yellow spark lines zigzagging along each wing"""
    from PIL import Image, ImageDraw
    W, H = 24, 20
    m = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(m)
    if up:
        wings = [[(11, 6), (1, 1), (3, 6), (8, 11)], [(12, 6), (22, 1), (20, 6), (15, 11)]]
    else:
        wings = [[(11, 6), (0, 8), (2, 10), (8, 12)], [(12, 6), (23, 8), (21, 10), (15, 12)]]
    for w in wings:
        dr.polygon(w, fill=255)
    dr.polygon([(11.5, 3), (16, 8), (11.5, 14), (7, 8)], fill=255)
    al = np.asarray(m) > 0
    img = blank(W, H)
    for y in range(H):
        for x in range(W):
            if not al[y, x]:
                continue
            ref = 'roof_purple:3' if y < 7 else ('roof_purple:2' if y < 10 else 'roof_purple:1')
            if abs(x - 11.5) < 3 and 4 <= y <= 12:
                ref = 'cloth_purple:4' if y < 8 else 'roof_purple:3'
            img[y, x] = list(E6.col(ref)) + [1]
    # tail
    for (x, y, ref) in ((11, 14, 'roof_purple:2'), (12, 15, 'roof_purple:2'), (12, 16, 'roof_purple:1'), (11, 17, 'roof_purple:1'),
                        (11, 18, 'fire:5')):
        img[y, x] = list(E6.col(ref)) + [1]
    # eyes
    for x in (10, 13):
        img[7, x] = list(E6.col('fire:5')) + [1]
    # spark lines along the wings (a zigzag from the body out)
    pts = ([(8, 8), (6, 6), (5, 8), (3, 6)] if up else [(8, 9), (6, 8), (4, 10), (2, 9)])
    for sgn in (1, -1):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            n = max(abs(x1 - x0), abs(y1 - y0))
            for k in range(n + 1):
                x = int(round(x0 + (x1 - x0) * k / n)); y = int(round(y0 + (y1 - y0) * k / n))
                if sgn < 0:
                    x = W - 1 - x
                if al[y, x]:
                    img[y, x] = list(E6.col('fire:4')) + [1]
    # outline ring
    a = img[..., 3] > 0.5
    p = np.pad(a, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~a
    img[ring] = list(E6.col('shadow:0')) + [1]
    return img


def grid_frames(src):
    d = EF.FIELD[src]
    return d['size'], d['frames']


def render(vid):
    if vid == 'storm_harrier':
        leg = P.resolve(HARRIER_PAL, 'field_' + vid)
        return [parse_grid(g, leg, w=24, h=20) for g in F5.HARRIER]
    if vid == 'lightning_manta':
        return [manta(True), manta(False)]
    src, pal = VARIANTS[vid]
    (w, h), grids = grid_frames(src)
    leg = P.resolve(pal, 'field_' + vid)
    return [parse_grid(grid_from_text(g), leg, w=w, h=h) for g in grids]


def finish(vid, im):
    im = im.copy()
    H, W = im.shape[:2]
    c = E6.col
    if vid == 'squall_wolf':
        # white wind streaks along the flank: two short dashes on the lit fur
        X = (np.abs(im[..., :3] - c('stone_cool:3')).sum(-1) < 0.02) | (np.abs(im[..., :3] - c('stone_cool:4')).sum(-1) < 0.02)
        for (x, y) in ((6, 10), (7, 10), (8, 10), (9, 12), (10, 12), (11, 12), (5, 13), (6, 13)):
            if X[y, x]:
                im[y, x, :3] = c('metal:4')
    if vid == 'rigger_beetle':
        for (x, y) in ((9, 8), (12, 8), (8, 10), (11, 10), (14, 10)):
            if im[y, x, 3] > 0.5:
                im[y, x, :3] = c('gold:5')
                if im[y + 1, x, 3] > 0.5:
                    im[y + 1, x, :3] = c('wood:0')
    if vid == 'signal_wraith':
        # the signal lamp in the hood (the kin's two eyes become one lamp with a warm halo)
        dy = 0 if im[1, 9, 3] > 0.5 else 1
        for (x, y, ref) in ((10, 6, 'fire:5'), (9, 6, 'fire:4'), (11, 6, 'fire:4'), (10, 5, 'gold:4'), (10, 7, 'gold:3')):
            im[y + dy, x, :3] = c(ref); im[y + dy, x, 3] = 1
    if vid == 'gale_engine':
        # the fan: the gold core becomes a cobalt disc with a white blade
        for (x, y, ref) in ((11, 10, 'roof_blue:3'), (12, 10, 'metal:4'), (11, 11, 'metal:4'), (12, 11, 'roof_blue:3'),
                            (11, 12, 'roof_blue:2'), (12, 12, 'roof_blue:2')):
            if im[y, x, 3] > 0.5:
                im[y, x, :3] = c(ref)
    side = E6.WIND[vid]
    if side == 'ground':
        side = 'ground_field'      # a step brighter than the battle rim: F2's dark 0.35 and F3's 0.5 dim it
    return E6.side_rim(E6.dark_outline(im), side, min_nb=5, right=True)


FOES = ['squall_wolf', 'gale_sprite', 'rigger_beetle', 'signal_wraith', 'storm_harrier', 'lightning_manta', 'storm_page',
        'gale_engine']


def frames():
    out = {}
    for vid in FOES:
        out[vid] = [finish(vid, im) for im in render(vid)]
    import ep6_scribe as S
    out.update(S.avatar())
    return out


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep6'), exist_ok=True)
    items = []
    for k, v in frames().items():
        items += [(f'{k}_{i}', im) for i, im in enumerate(v)]
    for bg, tag in (((214, 226, 240), 'cloud'), ((40, 44, 66), 'storm')):
        contact(items, os.path.join(OUT, 'ep6', f'ep6_field_6x_{tag}.png'), scale=6, cols=6, bg=bg,
                title='ep6 field sprites at 6x (facing left)')
