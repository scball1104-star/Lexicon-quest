"""Paper-doll parts for the six Expansion 1 townsfolk (X1-sprites). Same legend and 24x32 cell as npc_parts.py;
nothing in the shared part tables is edited: x1_npcs.py calls register() to add these to the live tables at build time.

New hats:        flat_cap (Brindle), sou_wester (Ferrick), veil_hat (Yarrow, a straw brim with a dotted mesh veil)
New accessories: crook (Brindle), pipe (Ferrick), bobbin (Tamsin), cuffs and spec_chain (Hesper: sleeves that swallow
                 the hands, spectacles on a chain), chime_staff and patches (Odo), smoker (Yarrow)
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def grid(txt):
    return txt.strip('\n')


def outline(cv, ch='0'):
    """add a 1 px outline ring (4-neighbour) around every non-'.' pixel of a char canvas (list of lists)"""
    H, W = len(cv), len(cv[0])
    add = []
    for y in range(H):
        for x in range(W):
            if cv[y][x] != '.':
                continue
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and cv[yy][xx] not in '.0':
                    add.append((y, x)); break
    for y, x in add:
        cv[y][x] = ch
    return cv


def canvas(w, h):
    return [['.'] * w for _ in range(h)]


def to_txt(cv):
    return '\n'.join(''.join(r) for r in cv)


# ------------------------------------------------------------------ hats
# 24 wide, row 0 sits at head row 0 + HAT_DY. Hat class legend: n (darkest) o v y (lightest).
HATS_X1 = {
 # Brindle: a flat wool cap pulled low, a short peak at the front
 'flat_cap': {
  'down': """
..........0000..........
........00yyyvv00.......
.......0yyvvvvvvo0......
......0yvvvvvvvvvoo0....
......0oonnnnnnnnoo0....
.......0000000000.......
""",
  'left': """
..........0000..........
........00yyyvv00.......
.......0yyvvvvvvo0......
......0yvvvvvvvvvoo0....
.....0oonnnnnnnnoo0.....
.....00000000000........
""",
  'up': """
..........0000..........
........00yyyvv00.......
.......0yyvvvvvvo0......
......0yvvvvvvvvvoo0....
......0oonnnnnnnnoo0....
.......0000000000.......
""",
 },
 # Ferrick: a sou'wester, a rounded crown, a short front brim and a long flap down the back of the neck
 'sou_wester': {
  'down': """
..........0000..........
.........0yyyvv0........
.......00yyvvvvvo0......
......0yyvvvvvvvvoo0....
.....0yvvvvvvvvvvvoo0...
.....0oonnnnnnnnnnoo0...
......00000000000000....
""",
  'left': """
..........0000..........
.........0yyyvv0........
.......00yyvvvvvo0......
......0yyvvvvvvvvoo0....
....00yvvvvvvvvvvvoo0...
...0yyoonnnnnnnnnnoon0..
....0000000000000000n0..
...............0ooonn0..
................0onnn0..
.................0000...
""",
  'up': """
..........0000..........
.........0yyyvv0........
.......00yyvvvvvo0......
......0yyvvvvvvvvoo0....
.....0yvvvvvvvvvvvoo0...
.....0oovvvvvvvvvvoo0...
.....0ooooovvvvvooon0...
......0onnoooooonnn0....
.......0nnnnnnnnnn0.....
........000000000.......
""",
 },
 # Yarrow: a wide straw brim; the veil is a dotted mesh in the 'V' (cream) of her secondary ramp, hanging to the
 # collar, open enough that the face shows through (alternate pixels only)
 'veil_hat': {
  'down': """
..........0000..........
........00yyyv00........
.......0yyvvvvvo0.......
......0oonnnnnnoo0......
...000vyyvvvvvvvoo000...
..0yyvvvvvvvvvvooooon0..
...0000000000000000000..
.....V.V.V.V.V.V.V......
......V.V.V.V.V.V.......
.....V.V.V.V.V.V.V......
......V.V.V.V.V.V.......
.....V.V.V.V.V.V.V......
......V.V.V.V.V.V.......
.......V.V.V.V.V........
........V.V.V.V.........
.........V.V.V..........
""",
  'left': """
...........0000.........
.........00yyyv00.......
........0yyvvvvvo0......
.......0oonnnnnnoo0.....
....000vyyvvvvvvvoo000..
...0yyvvvvvvvvvvooooon0.
....0000000000000000000.
.......V.V.V.V.V.V......
........V.V.V.V.V.......
.......V.V.V.V.V.V......
........V.V.V.V.V.......
.......V.V.V.V.V.V......
........V.V.V.V.V.......
.........V.V.V.V........
""",
  'up': """
..........0000..........
........00yyyv00........
.......0yyvvvvvo0.......
......0oonnnnnnoo0......
...000vyyvvvvvvvoo000...
..0yyvvvvvvvvvvooooon0..
...0000000000000000000..
.....V.V.V.V.V.V.V......
......V.V.V.V.V.V.......
.....V.V.V.V.V.V.V......
......V.V.V.V.V.V.......
.....V.V.V.V.V.V.V......
......V.V.V.V.V.V.......
""",
 },
}
HAT_DY_X1 = {'flat_cap': 1, 'sou_wester': 1, 'veil_hat': 1}


# ------------------------------------------------------------------ accessories (grid, dx, dy)
def _crook(h=30):
    """a tall shepherd's crook: a staff two px wide with a round hook at the top curling outward (right), wood ramp
    u U X; 9 px wide"""
    import math
    W = 8
    cv = canvas(W, h)
    sx = 1
    for y in range(5, h):
        cv[y][sx] = 'X'; cv[y][sx + 1] = 'U'
        if (y // 4) % 3 == 1:
            cv[y][sx + 1] = 'u'
    cx, cy, r = sx + 1.0 + 2.1, 4.3, 2.3
    for y in range(0, 10):
        for x in range(0, W):
            dx, dy = x + 0.5 - cx, cy - (y + 0.5)
            d = math.hypot(dx, dy)
            ang = math.degrees(math.atan2(dy, dx))
            if abs(d - r) <= 0.98 and (ang >= -15 or (dx > 0 and ang >= -75)):
                if d > r + 0.1:
                    cv[y][x] = 'X' if ang > 30 else 'U'
                else:
                    cv[y][x] = 'U' if ang > 30 else 'u'
    # a green cord near the hand
    for x in (sx, sx + 1):
        cv[18][x] = 'g'; cv[19][x] = 'G'
    return to_txt(outline(cv))


def _chime_staff(h=30):
    """Odo's staff, cut from a chime post: a thick (three px) grained post, a notched head with two hanging
    metal chimes (m M N) and a lashing"""
    W = 8
    cv = canvas(W, h)
    for y in range(6, h):
        cv[y][2] = 'X'; cv[y][3] = 'U'; cv[y][4] = 'u'
        if y % 5 == 2:
            cv[y][3] = 'u'
    # head: a crossbar with two chimes hanging
    for x in range(0, 7):
        cv[4][x] = 'U' if x not in (0, 6) else 'u'
        cv[5][x] = 'u' if x else 'u'
    cv[4][2] = 'X'; cv[4][3] = 'X'
    for x in (1, 5):
        cv[6][x] = 'M'; cv[7][x] = 'N'; cv[8][x] = 'N'; cv[9][x] = 'm'
    cv[3][3] = 'u'
    for x in (2, 3, 4):
        cv[18][x] = 'g'; cv[19][x] = 'G'
    return to_txt(outline(cv))


CROOK = _crook()
CHIME = _chime_staff()
CROOK_ROWS = len(CROOK.split('\n'))
CHIME_ROWS = len(CHIME.split('\n'))


ACC_X1 = {
 'crook': {
  'down': (CROOK, 16, 2),
  'left': (CROOK, 0, 3),
  'up': (CROOK, 16, 2),
 },
 'chime_staff': {
  'down': (CHIME, 0, 2),
  'left': (CHIME, 2, 3),
  'up': (CHIME, 0, 2),
 },
 # Ferrick's pipe: a short stem from the mouth and a dark bowl, one wisp of pale smoke
 'pipe': {
  'down': ("""
.....mM.
uuuuuMm0
.0000000
""", 12, 10),
  'left': ("""
.mM..
MmuuU
.0000
""", 2, 10),
 },
 # Tamsin's bobbin: a wooden pin through the bun, red thread wound at one end
 'bobbin': {
  'down': ("""
uuXuuuGGgg
""", 7, 1),
  'left': ("""
uuXuuGGgg
""", 14, 4),
  'up': ("""
uuXuuuGGgg
""", 7, 1),
 },
 # Hesper's coat is too big: the sleeves hang past the hands, a brass-trimmed cuff at the end. Rows start at the
 # cuff row of the robe (row 20). Mirrored for the right arm.
 'cuffs': {
  'down': ("""
...0DCCCc0.....0CCCCck0.
...0DCCCc0.....0CCCcck0.
...0DCCcc0.....0CCcccck0
...0DCCcc0.....0CCccck0.
...0gGGGg0.....0gGGGgg0.
....00000.......000000..
""".replace('0DCCCc0.....0CCCCck0.', '0DCCCc0.....0cCCCck0.'), 0, 20),
  'left': ("""
.0DCCc0
.0DCcc0
.0DCcc0
.0gGGg0
..00000
""", 4, 21),
  'up': ("""
...0DCCCc0.....0cCCCck0.
...0DCCCc0.....0cCCCck0.
...0DCCcc0.....0ccCCck0.
...0DCCcc0.....0cCCcck0.
...0gGGGg0.....0gGGGgg0.
....00000.......000000..
""", 0, 20),
 },
 # spectacles hang on a thin brass chain that loops behind the ears and down to the chest
 'spec_chain': {
  'down': ("""
G...........G
G...........G
.G.........G.
..G.......G..
...G.....G...
....G...G....
.....GGG.....
......Y......
""", 6, 10),
  'left': ("""
G
G
.G
.G
..G
...G
....GY
""", 14, 10),
 },
 # Yarrow's smoker: a tin can with a bellows and a spout, a curl of smoke
 'smoker': {
  'down': ("""
....N...
...N.N..
....0m0.
.000mMm0
0uUUMNm0
0XUUMNm0
0uUUMNm0
.00000m0
""", 17, 19),
  'left': ("""
..N..
.N.N.
..0m0
.0mMm0
0UUNMm0
0UUNMm0
.00000
""", 3, 20),
 },
 # Odo's patches: stitched squares of other cloth on the grey cloak (sec / accent / bottom classes)
 'patches': {
  'down': ("""
0ooo0
0ovo0
0ovn0
""", 7, 18),
  'left': ("""
0ooo0
0ovo0
0ovn0
""", 9, 19),
  'up': ("""
0GGG0
0GYG0
0Ggg0
""", 13, 21),
 },
 'patches2': {
  'down': ("""
0GGG0
0GYG0
0Ggg0
""", 14, 24),
  'left': ("""
0PPP0
0PPp0
0ppp0
""", 10, 26),
  'up': ("""
0ooo0
0ovo0
0ovn0
""", 6, 18),
 },
 'patches3': {
  'down': ("""
0PPPP0
0PPpp0
0pppp0
""", 6, 28),
  'left': ("""
0GGG0
0GYG0
0Ggg0
""", 8, 29),
  'up': ("""
0PPPP0
0PPpp0
0pppp0
""", 8, 27),
 },
}


def register():
    """add the X1 parts to the live paper-doll tables (idempotent)"""
    import npc_parts as NP
    import npc_bodies as NB
    NP.HATS.update(HATS_X1)
    NP.HAT_DY.update(HAT_DY_X1)
    NB.ACC.update(ACC_X1)
