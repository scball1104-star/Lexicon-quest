"""Episode 7 field (map) sprites (E7-sprites): the visible foes, the Pale Lantern and the White Phantom's map avatar.

Foes: their Episode 1 kin's hand-pixeled grids (chars/enemy_field.py) in the Episode 7 palettes, so each reads as the same
breed as in battle; the Hush Owl takes Episode 5's hawk grid (ep5_field.HARRIER: front-on, two eyes, which is an owl's
face) in white and grey with gold eyes. Facing LEFT, 2 frames, origin bottom-centre. Every one carries the contrast rule
of ep7_enemies.py baked in: its outline is the darkest master colour (it holds on the white snow and the white fade) and a
1 px ice rim just inside it on the upper, left and right edges (it holds on the dark vault floors and the frost brick).
CRITIQUE_6 item 8. A FIELD_LOOK entry is not needed.

  rime_wolf <- briar_wolf (snow fur, a pine-black mane tipped violet)    snow_wisp <- ink_slime (white, violet, dark eyes)
  hush_owl <- ep5 dust_harrier grid (white and grey, gold eyes)          crystal_crawler <- moss_scarab (ice shell, green legs)
  frostbound_revenant <- ink_wraith (frost white, ice eyes)              ice_knight <- echo_warden (ice plate, pine cape)
  rimed_page <- lost_page (rimed paper, blue lines, icicles)             pale_lantern <- page_wraith (white hood, a lantern)
  phantom_avatar, phantom_avatar_back: ep7_phantom.avatar()

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
import ep7_enemies as E7

VARIANTS = {
    'rime_wolf': ('briar_wolf', {
        '0': 'shadow:0', 'r': 'stone_cool:4', 'R': 'stone_cool:5', 'x': 'metal:3', 'X': 'metal:4',
        'g': 'foliage_dark:0', 'G': 'foliage_dark:1', 'H': 'cloth_purple:3', 'Y': 'ice:1', 'w': 'metal:4', 'n': 'ink:1'}),
    'snow_wisp': ('ink_slime', {
        '0': 'shadow:0', 'a': 'cloth_purple:3', 'b': 'magic_violet:3', 'c': 'ice:3', 'd': 'metal:4', 'W': 'metal:4',
        'Y': 'shadow:0', 'y': 'roof_purple:2'}),
    'crystal_crawler': ('moss_scarab', {
        '0': 'shadow:0', 'a': 'ice:1', 'b': 'ice:2', 'c': 'ice:3', 'd': 'metal:4', 'W': 'metal:4',
        'g': 'roof_green:3', 'G': 'magic_cyan:2', 'H': 'magic_cyan:3', 'Y': 'magic_cyan:4'}),
    'frostbound_revenant': ('ink_wraith', {
        '0': 'shadow:0', 'i': 'roof_blue:2', 'I': 'stone_cool:4', 'j': 'stone_cool:5', 'J': 'metal:3',
        'v': 'ice:2', 'V': 'metal:4', 's': 'metal:3', 'S': 'metal:4', 'e': 'ice:1'}),
    'ice_knight': ('echo_warden', {
        '0': 'shadow:0', 'M': 'water:2', 'N': 'water:3', 'O': 'ice:1', 'P': 'ice:2', 'Q': 'metal:4',
        'B': 'foliage_dark:0', 'C': 'foliage_dark:1', 'D': 'roof_green:2', 'g': 'stone_cool:3', 'G': 'stone_cool:4',
        'k': 'ice:1', 'K': 'ice:2', 'L': 'ice:3', 'e': 'magic_violet:3'}),
    'rimed_page': ('lost_page', {
        '0': 'shadow:0', 'I': 'water:3', 'l': 'stone_cool:4', 'm': 'stone_cool:5', 'n': 'ice:3', 'o': 'metal:4',
        'V': 'water:3', 'W': 'metal:4'}),
    'pale_lantern': ('page_wraith', {
        '0': 'shadow:0', 'i': 'ink:1', 'I': 'ice:2', 'j': 'metal:3', 'l': 'water:3', 'm': 'ice:2', 'n': 'metal:3',
        'o': 'metal:4', 'e': 'ice:2', 'E': 'metal:4'}),
}
OWL_PAL = {'0': 'shadow:0', 'H': 'metal:4', 'h': 'stone_cool:5', 'w': 'gold:3', 'Y': 'gold:4',
           'X': 'metal:3', 'x': 'stone_cool:5', 'r': 'stone_cool:3', 'R': 'stone_cool:4', 'q': 'gold:3'}


def grid_frames(src):
    d = EF.FIELD[src]
    return d['size'], d['frames']


def render(vid):
    if vid == 'hush_owl':
        leg = P.resolve(OWL_PAL, 'field_' + vid)
        return [parse_grid(g, leg, w=24, h=20) for g in F5.HARRIER]
    src, pal = VARIANTS[vid]
    (w, h), grids = grid_frames(src)
    leg = P.resolve(pal, 'field_' + vid)
    return [parse_grid(grid_from_text(g), leg, w=w, h=h) for g in grids]


def finish(vid, im):
    im = im.copy()
    H, W = im.shape[:2]
    c = E7.col
    al = im[..., 3] > 0.5
    if vid == 'rime_wolf':
        # frost on the jaw: the muzzle (the head faces left) gets two ice pixels and a white glint
        for (x, y, ref) in ((2, 11, 'ice:2'), (3, 12, 'ice:1'), (2, 12, 'metal:4')):
            if al[y, x]:
                im[y, x, :3] = c(ref)
    if vid == 'pale_lantern':
        # the lantern in the hood: an iron cap, a cold-blue glass with a white flame, an iron base
        dy = 0 if im[1, 9, 3] > 0.5 else 1
        for (x, y, ref) in ((10, 4, 'stone_cool:3'), (9, 5, 'shadow:0'), (10, 5, 'ice:2'), (11, 5, 'shadow:0'),
                            (9, 6, 'ice:2'), (10, 6, 'metal:4'), (11, 6, 'ice:2'), (9, 7, 'shadow:0'), (10, 7, 'stone_cool:3'),
                            (11, 7, 'shadow:0'), (8, 6, 'water:3'), (12, 6, 'water:3')):
            im[y + dy, x, :3] = c(ref); im[y + dy, x, 3] = 1
    if vid == 'rimed_page':
        # icicles from the page's foot and rime along its top
        for (x, y, ref) in ((5, 12, 'ice:2'), (5, 13, 'ice:3'), (9, 12, 'ice:2'), (12, 12, 'ice:2'), (12, 13, 'ice:3')):
            if 0 <= y < H and im[y, x, 3] < 0.5:
                im[y, x, :3] = c(ref); im[y, x, 3] = 1
    return E7.side_rim(E7.dark_outline(im), 'frost_field', min_nb=5, right=True)


FOES = ['rime_wolf', 'snow_wisp', 'hush_owl', 'crystal_crawler', 'frostbound_revenant', 'ice_knight', 'rimed_page',
        'pale_lantern']


def frames():
    out = {}
    for vid in FOES:
        out[vid] = [finish(vid, im) for im in render(vid)]
    import ep7_phantom as PH
    out.update(PH.avatar())
    return out


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep7'), exist_ok=True)
    items = []
    for k, v in frames().items():
        items += [(f'{k}_{i}', im) for i, im in enumerate(v)]
    for bg, tag in (((226, 234, 242), 'snow'), ((30, 34, 52), 'vault')):
        contact(items, os.path.join(OUT, 'ep7', f'ep7_field_6x_{tag}.png'), scale=6, cols=6, bg=bg,
                title='ep7 field sprites at 6x (facing left)')
