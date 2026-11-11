"""The grey messenger bird of the Episode 6 opening (issue #99, docs/WORLD_MAP_PLAN.md section 4): npc_grey_bird.

Built into the ep6 pack's NPC atlas by ep6_npcs.py (merged into `npcs` at run time), so ep6_morning can spawn it like any
townsfolk: the frames follow the NPC scheme `<id>_<dir>_<0|1|2|blink>` in a 24 x 32 cell with the feet on the bottom row.
0 is perched, 1 and 2 are the wing beats (the walk animation plays 1, 0, 2, 0, so moving reads as flapping), blink shuts
the eye. A pale dove-grey bird (stone_cool, metal), a silver ribbon on its leg, an ochre beak (gold).
"""
import numpy as np
from pix import parse_grid, flip_x, blank
import pal as P

# a pale dove-grey so it reads against the tower's night stone (stone_cool 3 to 5, metal 3 on the chest)
LEGEND = {'o': 'shadow:0', 'd': 'stone_cool:3', 'g': 'stone_cool:4', 'l': 'stone_cool:5', 'w': 'metal:3',
          'b': 'gold:3', 's': 'metal:4', 'k': 'gold:2', 'e': 'shadow:0', 'c': 'stone_cool:4'}

# facing the camera (down); the eyes are the two `e` beside the beak
DOWN = [
    "...ooo...",
    "..olllo..",
    "..elwle..",
    "..olbloo.",
    ".ogllllgo",
    "oglwwwlgo",
    "ogllwllgo",
    ".oglllgo.",
    "..osooo..",
    "...k.k...",
]
DOWN_UP = [            # wings raised
    "o.......o",
    "lo.ooo.ol",
    "glolllolg",
    "gdelwledg",
    ".oolbloo.",
    "..ollllo.",
    ".oglwwlgo",
    ".ogllllgo",
    "..oglllo.",
    "..osooo..",
    "...k.k...",
]
DOWN_DN = [            # wings down and out
    "...ooo...",
    "..olllo..",
    "..elwle..",
    "..olbloo.",
    "oogllllgoo",
    "lgglwwwlgl",
    "olgllwllo.",
    ".o.oglgo..",
    "...osoo...",
    "....k.k...",
]
# facing left: the beak on the left, the tail to the right
LEFT = [
    "..ooo.......",
    ".ollwo......",
    "bolelo......",
    ".oollgooo...",
    "..ogllllggo.",
    "..owllldddoo",
    "..oglldddo..",
    "...oggddo...",
    "....osoo....",
    "....k.k.....",
]
LEFT_UP = [
    "......ooo...",
    "..ooo.olgo..",
    ".ollwoogldo.",
    "bolelooglo..",
    ".oollggloo..",
    "..ogllllggo.",
    "..owllldddoo",
    "...oglddo...",
    "....osoo....",
    "....k.k.....",
]
LEFT_DN = [
    "..ooo.......",
    ".ollwo......",
    "bolelo......",
    ".oollgooo...",
    "..ogllllggo.",
    "..owlllgdddo",
    "..oglodlddo.",
    "...oo.oddo..",
    "....osoo....",
    "....k.k.....",
]
# facing away (up): the back and tail
UP = [
    "...ooo...",
    "..ogggo..",
    "..ogdgo..",
    "..ooggoo.",
    ".ogdgdgo.",
    "ogddgddgo",
    "ogdddddgo",
    ".oggdggo.",
    "..ooddo..",
    "...odo...",
]


def _blink(rows):
    return [r.replace('e', 'c') for r in rows]


def _cell(rows, lift=0):
    """Place a grid bottom-centre in a 24 x 32 cell (feet on row 31, `lift` px higher while flying)."""
    art = parse_grid(rows, P.resolve(LEGEND, 'npc_grey_bird'))
    h, w = art.shape[:2]
    cell = blank(24, 32)
    x0, y0 = 12 - w // 2, 32 - h - lift
    cell[y0:y0 + h, x0:x0 + w] = art
    return cell


def frames():
    """{dir: [0, 1, 2, blink]} as float RGBA arrays (32 x 24), the shape build_npcs.npc_frames returns."""
    out = {
        'down': [_cell(DOWN), _cell(DOWN_UP, 3), _cell(DOWN_DN, 2), _cell(_blink(DOWN))],
        'left': [_cell(LEFT), _cell(LEFT_UP, 3), _cell(LEFT_DN, 2), _cell(_blink(LEFT))],
        'up': [_cell(UP), _cell(UP, 2), _cell(UP, 1), _cell(UP)],
    }
    out['right'] = [flip_x(f) for f in out['left']]
    return out


SPEC = {'name': 'Bird'}
