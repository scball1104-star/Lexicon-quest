"""Episode 5 field (map) sprites (E5-sprites): the visible foes, the Mirage Knight and the Sand Oracle's map avatar.

Foes: their Episode 1 kin's hand-pixeled grids (chars/enemy_field.py) in the Episode 5 palettes, so each reads as the same
breed as in battle; the Dust Harrier has no kin on the map, so it is a new 24 x 20 grid (a hawk seen from the front,
wings up and wings down). Facing LEFT, 2 frames, origin bottom-centre. Every one carries the contrast rule of ep5_enemies.py baked in: the
grid's own outline is the darkest master colour (it holds on the bright sand of the road and the F1 courts), and a 1 px
side rim just inside it on the upper, left and right edges (gold for sun foes, pale blue for star foes) holds on the F2 gallery
and the F3 night well (CRITIQUE_6 item 8). src/data/ep5/field may still add a FIELD_LOOK entry; the frames do not need one.

  dune_stalker <- briar_wolf   dune_scarab <- moss_scarab   silt_reaver <- page_wraith   starsilt <- ink_slime
  horizon_shade <- ink_wraith (indigo above its horizon line, gold below)   tomorrow_husk <- tome_golem
  mirage_knight <- echo_warden (bronze, its shield a night sea)   dust_harrier (new)
  oracle_avatar, oracle_avatar_back: ep5_oracle.avatar()

    frames()  -> {id: [rgba, rgba]}
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from pix import *
import pal as P
import enemy_field as EF
import ep5_enemies as E5

VARIANTS = {
    'dune_stalker': ('briar_wolf', {
        '0': 'shadow:0', 'r': 'wood:2', 'R': 'wood:3', 'x': 'gold:3', 'X': 'sand:2',
        'g': 'wood:0', 'G': 'wood:1', 'H': 'roof_red:2', 'Y': 'gold:5', 'w': 'stone_warm:5', 'n': 'ink:1'}),
    'dune_scarab': ('moss_scarab', {
        '0': 'shadow:0', 'a': 'wood:1', 'b': 'gold:2', 'c': 'gold:3', 'd': 'gold:4', 'W': 'gold:5',
        'g': 'cloth_blue:1', 'G': 'cloth_blue:2', 'H': 'cloth_blue:3', 'Y': 'water:4'}),
    'silt_reaver': ('page_wraith', {
        '0': 'shadow:0', 'i': 'stone_warm:1', 'I': 'earth:2', 'j': 'path:1', 'l': 'path:2', 'm': 'path:3',
        'n': 'sand:2', 'o': 'sand:3', 'e': 'ice:2', 'E': 'ice:3'}),
    'starsilt': ('ink_slime', {
        '0': 'shadow:0', 'a': 'ink:2', 'b': 'ink:3', 'c': 'cloth_blue:3', 'd': 'ink:4', 'W': 'metal:4',
        'Y': 'gold:5', 'y': 'gold:3'}),
    'horizon_shade': ('ink_wraith', {
        '0': 'shadow:0', 'i': 'ink:1', 'I': 'ink:2', 'j': 'ink:3', 'J': 'cloth_blue:3', 'v': 'ink:2', 'V': 'ink:3',
        's': 'cloth_blue:3', 'S': 'ink:4', 'e': 'ice:3'}),
    'tomorrow_husk': ('tome_golem', {
        '0': 'shadow:0', 'k': 'stone_warm:1', 'K': 'path:1', 'l': 'path:2', 'L': 'path:3', 'W': 'sand:3',
        'g': 'wood:1', 'G': 'gold:3', 'Y': 'ice:3', 'Z': 'gold:5', 'p': 'cloth_blue:2'}),
    'mirage_knight': ('echo_warden', {
        '0': 'shadow:0', 'M': 'wood:1', 'N': 'wood:3', 'O': 'wood:4', 'P': 'gold:3', 'Q': 'gold:4',
        'B': 'stone_warm:1', 'C': 'stone_warm:2', 'D': 'path:2', 'g': 'gold:2', 'G': 'gold:4',
        'k': 'water:1', 'K': 'roof_blue:2', 'L': 'ink:2', 'e': 'fire:4'}),
}
# the gold lower half of the Horizon Shade (rows from SHADE_HY down), same keys
SHADE_GOLD = {'0': 'shadow:0', 'i': 'wood:2', 'I': 'wood:3', 'j': 'gold:2', 'J': 'gold:3', 'v': 'wood:3', 'V': 'gold:2',
              's': 'gold:3', 'S': 'gold:4', 'e': 'ice:3'}
SHADE_HY = 11

HARRIER_PAL = {'0': 'shadow:0', 'H': 'stone_warm:4', 'h': 'stone_warm:3', 'w': 'stone_warm:5', 'Y': 'gold:5',
               'X': 'sand:2', 'x': 'wood:4', 'r': 'roof_red:2', 'R': 'wood:3', 'q': 'roof_red:3'}
# a hawk seen from the front, wings up (frame 0) and swept down (frame 1); front-on, so it reads the same flipped
HARRIER = [
    ['0......................0',
     'X0....................0X',
     'xX0..................0Xx',
     'rxX0................0Xxr',
     '0rxX0..............0Xxr0',
     '.0rxX0....0000....0Xxr0.',
     '..0rxX0..0HHHH0..0Xxr0..',
     '...0rxX00HYHHYH00Xxr0...',
     '....0rxXR0HwwH0RXxr0....',
     '.....0rRRR0ww0RRRr0.....',
     '......0RRRRRRRRRR0......',
     '......0rRRqRRqRRr0......',
     '.......0rRRRRRRr0.......',
     '........0rRRRRr0........',
     '........0qRrrRq0........',
     '.......0qq0rr0qq0.......',
     '.......0q0.00.0q0.......',
     '........0..ww..0........',
     '...........0w0..........',
     '........................'],
    ['........................',
     '........................',
     '........................',
     '..........0000..........',
     '.........0HHHH0.........',
     '........0HYHHYH0........',
     '...000000HHwwHH000000...',
     '.00XXXXR0HHwwHH0RXXXX00.',
     '0XxxxxRRR00ww00RRRxxxxX0',
     '0xrrrrRRRRRRRRRRRRrrrrx0',
     '.0rr00rRRRRRRRRRRr00rr0.',
     '..00..0rRRqRRqRRr0..00..',
     '......0rRRRRRRRRr0......',
     '.......0rRRRRRRr0.......',
     '........0qRrrRq0........',
     '.......0qq0rr0qq0.......',
     '.......0q0.00.0q0.......',
     '........0..ww..0........',
     '...........0w0..........',
     '........................'],
]
assert all(len(r) == 24 for g in HARRIER for r in g) and all(len(g) == 20 for g in HARRIER)


def grid_frames(src):
    d = EF.FIELD[src]
    return d['size'], d['frames']


def render(vid):
    if vid == 'dust_harrier':
        leg = P.resolve(HARRIER_PAL, 'field_' + vid)
        return [parse_grid(g, leg, w=24, h=20) for g in HARRIER]
    src, pal = VARIANTS[vid]
    (w, h), grids = grid_frames(src)
    leg = P.resolve(pal, 'field_' + vid)
    imgs = [parse_grid(grid_from_text(g), leg, w=w, h=h) for g in grids]
    if vid == 'horizon_shade':
        gl = P.resolve(SHADE_GOLD, 'field_' + vid)
        low = [parse_grid(grid_from_text(g), gl, w=w, h=h) for g in grids]
        for im, lo in zip(imgs, low):
            im[SHADE_HY:] = lo[SHADE_HY:]
            row = im[SHADE_HY, :, 3] > 0.5
            edge = E5.edge_mask(im)[SHADE_HY]
            im[SHADE_HY, row & ~edge, :3] = E5.col('gold:5')
    return imgs


def finish(vid, im):
    im = im.copy()
    H, W = im.shape[:2]
    if vid == 'dune_stalker':
        # dark stripes on the flank: every third column of the light fur in the body band
        X = (np.abs(im[..., :3] - E5.col('gold:3')).sum(-1) < 0.02) | (np.abs(im[..., :3] - E5.col('sand:2')).sum(-1) < 0.02)
        for y in range(9, 16):
            for x in (5, 8, 11):
                if X[y, x]:
                    im[y, x, :3] = E5.col('wood:1')
    if vid == 'dune_scarab':
        # two lapis inlay pixels on the shell
        for (x, y) in ((10, 8), (12, 9), (9, 10)):
            if im[y, x, 3] > 0.5:
                im[y, x, :3] = E5.col('cloth_blue:3')
    if vid == 'starsilt':
        for (x, y, ref) in ((5, 12, 'metal:4'), (10, 11, 'gold:4'), (12, 13, 'metal:4')):
            if im[y, x, 3] > 0.5:
                im[y, x, :3] = E5.col(ref)
    if vid == 'tomorrow_husk':
        # the hourglass heart: the gold core becomes a glass with sand at top and bottom
        for (x, y, ref) in ((11, 10, 'gold:4'), (12, 10, 'gold:4'), (11, 11, 'ice:3'), (12, 11, 'ice:3'),
                            (11, 12, 'gold:5'), (12, 12, 'gold:5')):
            im[y, x, :3] = E5.col(ref)
    if vid == 'mirage_knight':
        # the shield's face: a night sea under a moon (the grid's ice pixels), the horizon at row 16
        for y in range(H):
            for x in range(0, 12):
                if im[y, x, 3] < 0.5:
                    continue
                c = im[y, x, :3]
                if any(np.abs(c - E5.col(r)).sum() < 0.02 for r in ('water:1', 'roof_blue:2', 'ink:2')):
                    im[y, x, :3] = E5.col('ink:2' if y < 16 else ('ice:2' if y == 16 else 'water:1'))
        for (x, y, ref) in ((7, 15, 'metal:4'), (8, 15, 'ice:3'), (6, 18, 'ice:2'), (8, 19, 'ice:2')):
            if im[y, x, 3] > 0.5:
                im[y, x, :3] = E5.col(ref)
    return E5.side_rim(E5.dark_outline(im), E5.SIDE[vid], min_nb=5, right=True)


FOES = ['dune_stalker', 'dune_scarab', 'dust_harrier', 'silt_reaver', 'starsilt', 'horizon_shade', 'tomorrow_husk',
        'mirage_knight']


def frames():
    out = {}
    for vid in FOES:
        out[vid] = [finish(vid, im) for im in render(vid)]
    import ep5_oracle as O
    out.update(O.avatar())
    return out


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep5'), exist_ok=True)
    items = []
    for k, v in frames().items():
        items += [(f'{k}_{i}', im) for i, im in enumerate(v)]
    for bg, tag in (((228, 196, 140), 'sand'), ((18, 16, 40), 'night')):
        contact(items, os.path.join(OUT, 'ep5', f'ep5_field_6x_{tag}.png'), scale=6, cols=6, bg=bg,
                title='ep5 field sprites at 6x (facing left)')
