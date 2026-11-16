"""Episode 8 field (map) sprites (E8-sprites): the visible foes, the Unnamed Sentry and the Eraser's map avatar (the stair
figure).

Foes: their Episode 1 kin's hand-pixeled grids (chars/enemy_field.py) in the Episode 8 palettes, so each reads as the same
breed as in battle; the Folded Crane takes Episode 5's hawk grid (ep5_field.HARRIER) in cream paper with a gold beak and an
ink crease down each wing. Facing LEFT, 2 frames, origin bottom-centre. Every one carries the contrast rule of
ep8_enemies.py baked in: its outline is the darkest master colour (it holds on the cream parchment, the marble and the white
page of F3) and a 1 px gold rim just inside it on the upper, left and right edges (it holds on the violet void and the
dark ink floors). CRITIQUE_6 item 8. A FIELD_LOOK entry is not needed.

  index_hound <- briar_wolf (ink fur, a violet mane, a cream drawer)     margin_imp <- ink_slime (ink, gold flecks)
  paper_crane <- ep5 dust_harrier grid (cream paper, gold beak)          gnawing_bookworm <- moss_scarab (parchment, gold)
  catalog_wraith <- page_wraith (violet, gold eyes, a card)              inkbound_librarian <- echo_warden (ink, gilt)
  struck_page <- lost_page (cream, violet lines, the black bar)          unnamed_sentry <- echo_warden (gilt, blank face)
  eraser_avatar, eraser_avatar_back: ep8_eraser.avatar()

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
import ep8_enemies as E8

VARIANTS = {
    'index_hound': ('briar_wolf', {
        '0': 'shadow:0', 'r': 'ink:2', 'R': 'ink:3', 'x': 'hair_violet:4', 'X': 'ink:4',
        'g': 'roof_purple:2', 'G': 'cloth_purple:3', 'H': 'cloth_purple:4', 'Y': 'gold:4', 'w': 'stone_warm:5', 'n': 'ink:1'}),
    'margin_imp': ('ink_slime', {
        '0': 'shadow:0', 'a': 'ink:1', 'b': 'hair_violet:3', 'c': 'cloth_purple:3', 'd': 'cloth_purple:4', 'W': 'gold:5',
        'Y': 'gold:4', 'y': 'gold:3'}),
    'gnawing_bookworm': ('moss_scarab', {
        '0': 'shadow:0', 'a': 'stone_warm:3', 'b': 'stone_warm:4', 'c': 'stone_warm:5', 'd': 'metal:4', 'W': 'metal:4',
        'g': 'gold:2', 'G': 'gold:3', 'H': 'gold:4', 'Y': 'gold:5'}),
    'catalog_wraith': ('page_wraith', {
        '0': 'shadow:0', 'i': 'ink:1', 'I': 'roof_purple:2', 'j': 'cloth_purple:3', 'l': 'roof_purple:1', 'm': 'cloth_purple:3',
        'n': 'cloth_purple:4', 'o': 'cloth_purple:5', 'e': 'gold:4', 'E': 'gold:5'}),
    'inkbound_librarian': ('echo_warden', {
        '0': 'shadow:0', 'M': 'ink:1', 'N': 'ink:2', 'O': 'ink:3', 'P': 'hair_violet:4', 'Q': 'ink:4',
        'B': 'shadow:1', 'C': 'ink:1', 'D': 'hair_violet:2', 'g': 'gold:2', 'G': 'gold:3',
        'k': 'gold:3', 'K': 'gold:4', 'L': 'gold:5', 'e': 'magic_violet:3'}),
    'unnamed_sentry': ('echo_warden', {
        '0': 'shadow:0', 'M': 'wood:2', 'N': 'gold:2', 'O': 'gold:3', 'P': 'gold:4', 'Q': 'gold:5',
        'B': 'shadow:1', 'C': 'ink:1', 'D': 'hair_violet:2', 'g': 'ink:1', 'G': 'ink:2',
        'k': 'ink:2', 'K': 'ink:3', 'L': 'cloth_purple:3', 'e': 'stone_warm:5'}),
    'struck_page': ('lost_page', {
        '0': 'shadow:0', 'I': 'cloth_purple:3', 'l': 'stone_warm:3', 'm': 'stone_warm:4', 'n': 'stone_warm:5', 'o': 'metal:4',
        'V': 'cloth_purple:4', 'W': 'metal:4'}),
}
CRANE_PAL = {'0': 'shadow:0', 'H': 'metal:4', 'h': 'stone_warm:5', 'w': 'gold:3', 'Y': 'gold:4',
             'X': 'stone_warm:4', 'x': 'stone_warm:3', 'r': 'hair_violet:3', 'R': 'stone_warm:4', 'q': 'gold:3'}


def grid_frames(src):
    d = EF.FIELD[src]
    return d['size'], d['frames']


def render(vid):
    if vid == 'paper_crane':
        leg = P.resolve(CRANE_PAL, 'field_' + vid)
        return [parse_grid(g, leg, w=24, h=20) for g in F5.HARRIER]
    src, pal = VARIANTS[vid]
    (w, h), grids = grid_frames(src)
    leg = P.resolve(pal, 'field_' + vid)
    return [parse_grid(grid_from_text(g), leg, w=w, h=h) for g in grids]


def _set(im, pts):
    H, W = im.shape[:2]
    c = E8.col
    for (x, y, ref) in pts:
        if 0 <= x < W and 0 <= y < H:
            im[y, x, :3] = c(ref); im[y, x, 3] = 1


def finish(vid, im):
    im = im.copy()
    H, W = im.shape[:2]
    al = im[..., 3] > 0.5
    if vid == 'index_hound':
        # one cream drawer front with a gold pull on the flank (the card-drawer ribs at map scale)
        ys, xs = np.nonzero(al)
        cx, cy = int(xs.mean()) + 1, int(ys.mean())
        _set(im, [(cx, cy, 'stone_warm:5'), (cx + 1, cy, 'stone_warm:5'), (cx, cy + 1, 'gold:4'), (cx + 1, cy + 1, 'stone_warm:5'),
                  (cx - 1, cy, 'shadow:0'), (cx + 2, cy, 'shadow:0'), (cx - 1, cy + 1, 'shadow:0'), (cx + 2, cy + 1, 'shadow:0')])
    if vid == 'unnamed_sentry':
        # the blank faceplate: the helmet's face filled cream (no eyes), the frame's darkest outline kept round it
        ys, xs = np.nonzero(al)
        top = int(ys.min())
        cols = np.nonzero(al[top + 2])[0]
        cx = int(round(cols.mean())) if len(cols) else W // 2
        _set(im, [(cx + dx, top + dy, 'stone_warm:5' if dx < 1 else 'stone_warm:4') for dx in (-1, 0, 1) for dy in (2, 3, 4)])
    if vid == 'struck_page':
        # the black bar struck through the page, corner to corner, a gold lip above it
        ys, xs = np.nonzero(al)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        n = x1 - x0
        for i in range(n + 1):
            x = x0 + i
            y = y0 + 1 + int(round(i * (y1 - y0 - 3) / max(1, n)))
            if al[y, x]:
                _set(im, [(x, y, 'shadow:0')])
                if y - 1 >= 0 and al[y - 1, x]:
                    _set(im, [(x, y - 1, 'gold:4')])
    if vid == 'catalog_wraith':
        # a cream index card trailing low behind (right of) the wraith, which faces left
        ys, xs = np.nonzero(al)
        x, y = int(xs.max()) - 1, int(ys.max()) - 4
        _set(im, [(x + i, y + j, 'shadow:0' if i in (0, 3) or j in (0, 2) else 'stone_warm:5') for i in range(4) for j in range(3)])
    return E8.side_rim(E8.dark_outline(im), 'gilt_field', min_nb=5, right=True)


FOES = ['index_hound', 'margin_imp', 'paper_crane', 'gnawing_bookworm', 'catalog_wraith', 'inkbound_librarian', 'struck_page',
        'unnamed_sentry']


def frames():
    out = {}
    for vid in FOES:
        out[vid] = [finish(vid, im) for im in render(vid)]
    import ep8_eraser as ER
    out.update(ER.avatar())
    return out


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'ep8'), exist_ok=True)
    items = []
    for k, v in frames().items():
        items += [(f'{k}_{i}', im) for i, im in enumerate(v)]
    for bg, tag in (((238, 230, 214), 'page'), ((52, 30, 84), 'void')):
        contact(items, os.path.join(OUT, 'ep8', f'ep8_field_6x_{tag}.png'), scale=6, cols=6, bg=bg,
                title='ep8 field sprites at 6x (facing left)')
