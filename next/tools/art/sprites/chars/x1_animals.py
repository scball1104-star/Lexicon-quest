"""animal_sheep (X1-sprites): hand-pixeled 16x16 sheep in the style of animals.py (a 1 px dark outline, a warm
two-step light), four facings (down, left, right = left mirrored, up) and three poses (stand, walk A, walk B) plus a
graze pose that rides in the blink slot, so the field's humanoid actor code (`<id>_<dir>_<0|1|2|blink>`) draws it
unchanged. A second variant, animal_sheep_tufted, has a heavier fleece, a topknot and a red ear tag (the fold's
sheep). Origin (8, 15) = feet, like every animal.

Legend: 0 outline, w W x X wool (light to deep), f F face (dark, lighter), e eye, l leg, L hoof, r red tag, t tuft
"""

PAL = {
    '0': 'shadow:0', 'w': 'stone_warm:5', 'W': 'stone_warm:4', 'x': 'stone_warm:3', 'X': 'stone_warm:2',
    'f': 'stone_cool:2', 'F': 'stone_cool:3', 'e': 'metal:4', 'l': 'stone_cool:1', 'L': 'shadow:1',
    'r': 'roof_red:4', 'R': 'roof_red:2', 't': 'metal:4', 'u': 'stone_warm:5', 'g': 'grass:3', 'G': 'grass:2',
}
PAL_TUFT = dict(PAL, w='metal:4', W='stone_warm:5', x='stone_warm:4', X='stone_warm:3')

# ---- left-facing (the head at the left); the body shared by stand and walk, the head and legs swapped
BODY_L = """
................
................
................
................
.......0000.....
.....00wwwwW00..
....0wwWwwwwWW0.
...0wwwWwwWwwwx0
...0wWwwwWwwwWx0
...0wwWwwwWwwxX0
...0xwwWwwxWxxX0
....0xxWxxxXXX0.
.....00xXxXX00..
................
................
................
"""
# the head, stamped over the body at (0, 6); 'z' = leave
HEAD_L = """
..000..
.0fFF0.
0fFFfF0
0feFFf0
0fFFf0.
.0ff0..
"""
HEAD_L_GRAZE = """
.......
.......
.......
.00000.
0fFFFf0
0feFFf0
0fFFFf0
.0ffff0
"""
EAR_L = """
0F0
.0.
"""
# legs at rows 13..15, drawn after the body. Near legs are 2 px wide (F) and the far legs 1 px (f); the outline pass
# leaves a dark pixel between them, so each pair reads as two legs and not a block.
def _legs(walk):
    """returns {(x,y): char}; walk 0 stand, 1 / 2 the two stride poses (the raised legs are one row short)"""
    px = {}

    def leg(x, y1, near):
        for y in range(13, y1 + 1):
            px[(x, y)] = 'F' if near else 'f'
            if near:
                px[(x + 1, y)] = 'F'
        px[(x, y1)] = 'L'
        if near:
            px[(x + 1, y1)] = 'L'
    if walk == 0:
        leg(5, 15, True); leg(8, 15, False); leg(11, 15, True); leg(14, 15, False)
    elif walk == 1:
        leg(4, 15, True); leg(8, 14, False); leg(12, 14, True); leg(14, 15, False)
    else:
        leg(6, 14, True); leg(8, 15, False); leg(10, 15, True); leg(14, 14, False)
    return px


CURLS = [(6, 7), (7, 7), (10, 6), (11, 6), (13, 8), (12, 8), (8, 10), (9, 10), (11, 11), (7, 8)]


def _curls(cv, dx=0):
    for (x, y) in CURLS:
        x += dx
        if 0 <= x < 16 and cv[y][x] in 'wW':
            cv[y][x] = 'x' if cv[y][x] == 'W' else 'W'


def _stamp(canvas, txt, x0, y0, skip='.'):
    for j, row in enumerate(txt.strip('\n').split('\n')):
        for i, ch in enumerate(row):
            if ch != skip and 0 <= y0 + j < 16 and 0 <= x0 + i < 16:
                canvas[y0 + j][x0 + i] = ch


def _blank():
    return [['.'] * 16 for _ in range(16)]


def _outline(cv):
    add = []
    for y in range(16):
        for x in range(16):
            if cv[y][x] == '.':
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < 16 and 0 <= xx < 16 and cv[yy][xx] not in '.0':
                        add.append((y, x)); break
    for y, x in add:
        cv[y][x] = '0'


def side(pose, tufted=False):
    """pose: stand | walk1 | walk2 | graze. Left-facing."""
    cv = _blank()
    _stamp(cv, BODY_L, 0, 0)
    _curls(cv)
    if tufted:
        # a heavier fleece: a second scalloped row on the back and a lower skirt
        _stamp(cv, """
......ww.ww.....
.....wwWwwWw....
""", 0, 2)
        for x in (5, 6, 7, 8, 9, 10, 11, 12, 13):
            cv[13][x] = 'x' if x % 2 else 'X'
    walk = {'stand': 0, 'walk1': 1, 'walk2': 2, 'graze': 0}[pose]
    for (x, y), ch in _legs(walk).items():
        cv[y][x] = ch
    if pose == 'graze':
        _stamp(cv, HEAD_L_GRAZE, 0, 8)
        _stamp(cv, 'fF\nFf', 4, 8)           # the neck
    else:
        _stamp(cv, HEAD_L, 0, 6)
        _stamp(cv, EAR_L, 4, 6)
        if tufted:
            _stamp(cv, 'ww\nwW', 2, 4)        # topknot
            cv[6][6] = 'r'; cv[7][6] = 'r'     # the ear tag
    _outline(cv)
    return [''.join(r) for r in cv]


# ---- front (down): the head toward the viewer
BODY_D = """
................
................
................
.....000000.....
...00wwwwwWW00..
..0wwwWwwwwWWx0.
..0wwWwwwwwWWxX0
..0wWwwwwwwWxXX0
..0wwWwwwwWwxxX0
..0xwwWwwwWxxXX0
...0xxWwwxxxXX0.
....00xxXxXX00..
................
................
................
................
"""
HEAD_D = """
.00000.
0fFFFf0
0feFeF0
0fFFFf0
.0fFf0.
..0f0..
"""
HEAD_D_GRAZE = """
.00000.
0fFFFf0
0ffFff0
.0fff0.
"""


def front(pose, tufted=False):
    cv = _blank()
    _stamp(cv, BODY_D, 0, 0)
    _curls(cv, -2)
    if tufted:
        _stamp(cv, '..ww.ww..\n.wWwwWw..', 3, 2)
    # front legs
    ph = {'stand': (0, 0), 'walk1': (-1, 0), 'walk2': (0, -1), 'graze': (0, 0)}[pose]
    for x, dy in ((4, ph[0]), (10, ph[1])):
        for y in range(12, 16 + dy):
            cv[y][x] = 'F'; cv[y][x + 1] = 'F'
        cv[15 + dy][x] = 'L'; cv[15 + dy][x + 1] = 'L'
    if pose == 'graze':
        _stamp(cv, HEAD_D_GRAZE, 4, 10)
    else:
        _stamp(cv, HEAD_D, 4, 8)
        _stamp(cv, 'F.\n.F', 3, 8); _stamp(cv, '.F\nF.', 11, 8)    # ears out to the sides
        if tufted:
            _stamp(cv, 'ww', 7, 7)
            cv[9][3] = 'r'
    _outline(cv)
    return [''.join(r) for r in cv]


BODY_U = """
................
................
................
.....000000.....
...00wwwwwWW00..
..0wwwWwwwwWWx0.
..0wwWwwwwwWWxX0
..0wWwwwwwwWxXX0
..0wwWwwwwWwxxX0
..0xwwWwwwWxxXX0
...0xxWwwxxxXX0.
....00xxXxXX00..
................
................
................
................
"""


def back(pose, tufted=False):
    cv = _blank()
    _stamp(cv, BODY_U, 0, 0)
    _curls(cv, -2)
    if tufted:
        _stamp(cv, '..ww.ww..\n.wWwwWw..', 3, 2)
    ph = {'stand': (0, 0), 'walk1': (0, -1), 'walk2': (-1, 0), 'graze': (0, 0)}[pose]
    for x, dy in ((4, ph[0]), (10, ph[1])):
        for y in range(12, 16 + dy):
            cv[y][x] = 'F'; cv[y][x + 1] = 'F'
        cv[15 + dy][x] = 'L'; cv[15 + dy][x + 1] = 'L'
    # the back of the head and two ears just over the shoulders, a nub of tail
    if pose == 'graze':
        _stamp(cv, '.0ff0.\n0fFFf0', 5, 11)
    else:
        _stamp(cv, 'F.....F', 4, 3)
        _stamp(cv, '.ffff.', 5, 3)
    cv[8][14] = 'W'; cv[9][14] = 'w'
    _outline(cv)
    return [''.join(r) for r in cv]


def flip(rows):
    return [r[::-1] for r in rows]


def sheets(tufted=False):
    """{'down': [stand, walk1, walk2, graze], 'left': [...], 'right': [...], 'up': [...]} as char rows"""
    poses = ['stand', 'walk1', 'walk2', 'graze']
    left = [side(p, tufted) for p in poses]
    return {'down': [front(p, tufted) for p in poses], 'left': left, 'right': [flip(r) for r in left],
            'up': [back(p, tufted) for p in poses]}


def palette(tufted=False):
    return PAL_TUFT if tufted else PAL
