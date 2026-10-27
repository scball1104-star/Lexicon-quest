"""The Deep Stacks props (C2-sprites-boss) -> assets/sprites/cave_props.png/.json

    python cave_props.py            (deterministic; writes the atlas and out/cave/props_8x.png)

A pack atlas in props.json's shape (image, tile, objects.<id> with frame, anchor, footprint, solid, overheadY, frames,
frameNames). `props` is NOT one of the loader's merge bases (core/assets.js MERGE_BASES), so the integrator reads these
objects from the `cave_props` atlas itself (assets.atlas('cave_props').meta.objects) when `props` lacks the id.

Objects:
    chest_red    the Stacks lending: the wood chest's silhouette in red lacquer, black iron straps, a brass clasp
    chest_blue   the Stacks giving: deep blue lacquer, brass straps and clasp, a white glint on the lid rim (rare at a glance)
    plaque       a brass wall plaque for the landings (frames: plain, glint), hung on a face cell
    trapdoor     the library's sealed hatch (frames: closed, open); solid: false, the stairs event sits on its cell
Grids follow chars/smallprops.py (CHEST_CLOSED / CHEST_OPEN are reused, the legends are new). Colours are master ramps.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
from pix import *
import pal as P
import smallprops as SP

OUTC = os.path.join(OUT, 'cave')

# red lacquer: the roof_red ramp (lid top catches an orange-gold light), black iron straps, brass clasp
RED = {'0': 'roof_red:0', 'r': 'roof_red:1', 'R': 'roof_red:2', 'x': 'roof_red:3', 'X': 'roof_red:4', 'Y': 'roof_red:5',
       'm': 'shadow:2', 'M': 'stone_cool:3', 'g': 'gold:2', 'G': 'gold:3', 'H': 'gold:4', 'z': 'ink:1', 'Z': 'ink:2'}
# deep blue lacquer: the roof_blue ramp with a sky-blue sheen, brass straps and clasp
BLUE = {'0': 'water:0', 'r': 'roof_blue:1', 'R': 'roof_blue:2', 'x': 'roof_blue:3', 'X': 'roof_blue:4', 'Y': 'water:4',
        'm': 'gold:2', 'M': 'gold:3', 'g': 'gold:3', 'G': 'gold:4', 'H': 'gold:5', 'z': 'ink:1', 'Z': 'ink:2'}

# the blue chest's lid rim: a white glint (ice:3) on the upper-left so it reads as the rare one on a phone
BLUE_GLINT_CLOSED = [(2, 4), (3, 4), (2, 5)]
BLUE_GLINT_OPEN = [(2, 2), (3, 2), (2, 3)]

PLAQUE_PAL = {'0': 'gold:0', 'g': 'gold:1', 'G': 'gold:2', 'H': 'gold:3', 'J': 'gold:4', 'W': 'gold:5',
              's': 'stone_cool:1', 'k': 'ink:0', 'i': 'metal:4'}
PLAQUE = """
................
................
..000000000000..
.0JJJJJJJJJJJH0.
.0JHHHHHHHHHHG0.
.0HHggggggggHG0.
.0HHHHHHHHHHHG0.
.0HHgggggggHHG0.
.0HHHHHHHHHHHG0.
.0HHggggggggHG0.
.0HGGGGGGGGGGg0.
.0GGGGGGGGGGGg0.
..000000000000..
................
................
................
"""
PLAQUE_GLINT = [(3, 3), (4, 3), (3, 4), (12, 10)]
PLAQUE_SCREWS = [(3, 3), (12, 3), (3, 11), (12, 11)]

TRAP_PAL = {'0': 'wood:0', 'r': 'wood:1', 'R': 'wood:2', 'x': 'wood:3', 'X': 'wood:4',
            'm': 'stone_cool:1', 'M': 'stone_cool:2', 'N': 'stone_cool:3', 'O': 'metal:2',
            'k': 'ink:0', 'K': 'ink:1', 'z': 'shadow:1', 'S': 'stone_cool:2', 'T': 'stone_cool:3'}
TRAP_CLOSED = """
................
mMMMMMMMMMMMMMMm
MNxxxxxxxxxxxxNM
MxRXxxRXxxRXxxxM
MxRxxxRxxxRxxxxM
MxRxxxRxxxRxxxxM
MxRxxxRxxxRxOOxM
MxRxxxRxxxRxOkxM
MxRxxxRxxxRxOOxM
MxRxxxRxxxRxxxxM
MxRxxxRxxxRxxxxM
MxRxxxRxxxRxxxxM
MxrrrrrrrrrrrrxM
MN0000000000000M
mMMMMMMMMMMMMMMm
................
"""
TRAP_OPEN = """
.MMMMMMMMMMMMM..
.MxXXXXXXXXXXxM.
.MxRRRRRRRRRRxM.
.M0rrrrrrrrrr0M.
mMMMMMMMMMMMMMMm
MNkkkkkkkkkkkkNM
MkkkkkkkkkkkkkkM
MkkKKKKKKKKKKkkM
MkkKTTTTTTTTKkkM
MkkKSSSSSSSSKkkM
MkkKKKKKKKKKKkkM
MkkkkkkkkkkkkkkM
MkkkkkkkkkkkkkkM
MNkkkkkkkkkkkkNM
mMMMMMMMMMMMMMMm
................
"""


def grid(txt, legend, who):
    return parse_grid(grid_from_text(txt), P.resolve(legend, who))


def chest(legend, who, glint, open_):
    img = grid(SP.CHEST_OPEN if open_ else SP.CHEST_CLOSED, legend, who)
    if glint:
        c = np.array(hex2rgb(P.color('ice:3')), np.float32) / 255
        for x, y in glint:
            img[y, x, :3] = c
    return img


def plaque(glint):
    img = grid(PLAQUE, PLAQUE_PAL, 'plaque')
    sc = np.array(hex2rgb(P.color('stone_cool:1')), np.float32) / 255
    for x, y in PLAQUE_SCREWS:
        img[y, x, :3] = sc
    if glint:
        w = np.array(hex2rgb(P.color('gold:5')), np.float32) / 255
        for x, y in PLAQUE_GLINT:
            img[y, x, :3] = w
    return img


def collect():
    return {
        'chest_red_closed': chest(RED, 'chest_red', None, False),
        'chest_red_open': chest(RED, 'chest_red', None, True),
        'chest_blue_closed': chest(BLUE, 'chest_blue', BLUE_GLINT_CLOSED, False),
        'chest_blue_open': chest(BLUE, 'chest_blue', BLUE_GLINT_OPEN, True),
        'plaque_0': plaque(False),
        'plaque_1': plaque(True),
        'trapdoor_closed': grid(TRAP_CLOSED, TRAP_PAL, 'trapdoor'),
        'trapdoor_open': grid(TRAP_OPEN, TRAP_PAL, 'trapdoor'),
    }


META = {
    'chest_red': dict(fp=[1, 1], solid=True, frames=['chest_red_closed', 'chest_red_open'], anchor=[8, 14]),
    'chest_blue': dict(fp=[1, 1], solid=True, frames=['chest_blue_closed', 'chest_blue_open'], anchor=[8, 14]),
    'plaque': dict(fp=[1, 1], solid=False, frames=['plaque_0', 'plaque_1'], anchor=[8, 15]),
    'trapdoor': dict(fp=[1, 1], solid=False, frames=['trapdoor_closed', 'trapdoor_open'], anchor=[8, 15]),
}

NOTES = ('Deep Stacks pack props (C2-sprites-boss). Same shape as props.json: anchor = bottom-centre of the footprint in frame '
         'px; frames/frameNames = state alternates (closed/open, plain/glint). `props` is not a loader merge base: read these '
         'objects from this atlas (assets.atlas("cave_props").meta.objects) when props.json lacks the id. chest_red and '
         'chest_blue are the chest tiers red and blue (DEEP_STACKS_PLAN 9); plaque hangs on a face cell (solid false, the wall '
         'carries the collision); trapdoor lies on the library floor under the stairs event (solid false, state 1 = open).')


def build():
    imgs = collect()
    sh = Shelf(128, pad=2)
    for n in sorted(imgs):
        sh.add(n, imgs[n])
    sheet, rects = sh.render()
    save_png(sheet, os.path.join(DST, 'cave_props.png'))
    objects = {}
    for pid, m in META.items():
        frames = m['frames']
        o = {'frame': rects[frames[0]], 'anchor': m['anchor'], 'footprint': m['fp'], 'solid': m['solid'], 'overheadY': 0,
             'frames': [rects[f] for f in frames], 'frameNames': frames}
        objects[pid] = o
    meta = {'image': 'cave_props.png', 'tile': 16, 'notes': NOTES, 'objects': objects}
    write_json(os.path.join(DST, 'cave_props.json'), meta)
    os.makedirs(OUTC, exist_ok=True)
    contact([(n, imgs[n]) for n in sorted(imgs)], os.path.join(OUTC, 'props_8x.png'), scale=8, cols=4, title='cave_props at 8x')
    # beside the existing tiers, on a dark floor, at 6x: red and blue must read apart from wood, iron and gold
    import json
    pj = json.load(open(os.path.join(DST, 'props.json'), encoding='utf-8'))
    pim = from_pil(__import__('PIL.Image', fromlist=['Image']).open(os.path.join(DST, pj['image'])).convert('RGBA'))
    row = []
    for t in ('wood', 'iron', 'gold'):
        x, y, w, h = pj['objects']['chest_' + t]['frame']
        row.append(('chest_' + t, pim[y:y + h, x:x + w]))
    row += [('chest_red', imgs['chest_red_closed']), ('chest_blue', imgs['chest_blue_closed'])]
    contact(row, os.path.join(OUTC, 'chests_tiers_6x.png'), scale=6, cols=5, bg=(38, 30, 44), title='chest tiers at 6x')
    return imgs, meta


if __name__ == '__main__':
    imgs, meta = build()
    print(len(meta['objects']), 'objects')
