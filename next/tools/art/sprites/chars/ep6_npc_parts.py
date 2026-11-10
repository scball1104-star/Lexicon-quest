"""Paper-doll parts for the Episode 6 townsfolk of Zephyr Landing (E6-sprites). Same legend and 24x32 cell as
npc_parts.py; nothing in the shared part tables is edited: ep6_npcs.py calls register() to add these to the live tables
at build time.

New accessories:
  sky_compass    Aeris: the Sky Compass on a chain (a brass chain in a V down the chest to a round brass compass)
  coat_buttons   Aeris: two rows of brass buttons down the aviator coat's front
  cord_sash      Liora: a navigator's sash of knotted cords from the shoulder to the hip (rope with knot beads)
  letter         Liora: a folded letter held at the hip, its red seal showing
  dividers       Suri: a cartographer's brass dividers pushed through her braid (a narrow inverted V by the head)
  ink_hands      Suri: ink to the wrists (her hands and the cuffs above them)
  signal_tabs    Pippa: the signal-jacket's reflective brass tabs (shoulders and the chest strap)
  rope_hank      Bennet: a hank of rope hung at the hip (Yara's coil is on the shoulder; his is a rigger's hank)
  flower_pot     Thea: a pot of floating skyflowers held in both hands
Class letters as npc_parts.py: hat n o v y (dark to light), accent g G Y, metal m M N O, wood u U X, skin w s S T, sec l b B V,
glow z Z.
"""

ACC_EP6 = {
    # a brass chain from both shoulders meeting on the chest, a round compass hanging from it (glass z, needle Y)
    'sky_compass': {
        'down': ("""
G......G
.G....G.
..G..G..
...GG...
..0MM0..
.0MzZM0.
.0MYzM0.
..0MM0..
""", 8, 14),
        'left': ("""
G...
.G..
..G.
.0MM0
0MzZM0
0MYzM0
.0MM0.
""", 8, 15),
    },
    'coat_buttons': {
        'down': ("""
G...G
.....
.....
G...G
.....
.....
G...G
""", 10, 17),
        'left': ("""
G
.
.
G
.
.
G
""", 7, 17),
    },
    # knotted cords: a rope band from the left shoulder (screen right) across to the right hip, knot beads on it
    'cord_sash': {
        'down': ("""
.........UX
........UXU
.......XUU.
......UXg..
.....UXU...
....XUU....
...UXg.....
..UXU......
.XUU.......
.Ug........
..U........
..X........
""", 6, 14),
        'left': ("""
..UX
.UXU
UXg.
XU..
Ug..
U...
X...
""", 7, 16),
        'up': ("""
UX.........
UXU........
.UUX.......
..gXU......
...UXU.....
....UUX....
.....gXU...
......UXU..
.......UUX.
........gU.
........U..
........X..
""", 7, 14),
    },
    # a folded letter at the hip (screen left from the front), a red seal on it
    'letter': {
        'down': ("""
000000
0OOON0
0ONgN0
0NNNM0
000000
""", 1, 21),
        'left': ("""
00000
0OON0
0NgN0
0NNM0
00000
""", 3, 21),
    },
    # brass dividers through the braid: a narrow inverted V of brass with a pin head, by the side of the head
    'dividers': {
        'down': ("""
..Y..
..G..
.G.G.
.G.G.
G...G
""", 16, 1),
        'left': ("""
..Y..
..G..
.G.G.
.G.G.
G...G
""", 14, 1),
        'up': ("""
..Y..
..G..
.G.G.
.G.G.
G...G
""", 3, 1),
    },
    # ink to the wrists: the hands and the sleeve cuff above them stained ink
    'ink_hands': {
        'down': ('\n'.join(['....mMm..........mMm....',
                            '....mmM..........Mmm....']), 0, 21),
        'up': ('\n'.join(['....mMm..........mMm....',
                          '....mmM..........Mmm....']), 0, 21),
    },
    # Pippa's signal-jacket: brass tabs on both shoulders and down the chest strap
    'signal_tabs': {
        'down': ("""
Y..........Y
G..........G
....Y..Y....
....G..G....
....Y..Y....
""", 6, 14),
        'left': ("""
Y....
G....
...Y.
...G.
...Y.
""", 8, 14),
        'up': ("""
Y..........Y
G..........G
""", 6, 14),
    },
    # Bennet's rigger's hank of rope at the hip (screen right from the front)
    'rope_hank': {
        'down': ("""
.0000.
0XUUX0
0U00U0
0X00X0
0UXXU0
.0UU0.
.0X0..
.0U0..
""", 16, 19),
        'left': ("""
.0000.
0XUUX0
0U00U0
0X00X0
0UXXU0
.0UU0.
""", 13, 19),
        'up': ("""
.0000.
0XUUX0
0U00U0
0X00X0
0UXXU0
.0UU0.
.0X0..
.0U0..
""", 2, 19),
    },
    # Thea's pot of floating skyflowers, held in front in both hands: a clay pot, two blooms and a leaf
    'flower_pot': {
        'down': ("""
..0z0.0Z0.
.0zZz0ZzZ0
..0z0g0Z0.
...0gGg0..
..0000000.
..0XUUUu0.
...0UUu0..
...00000..
""", 7, 17),
        'left': ("""
.0z0.0Z0
0zZz0ZzZ
.0z0g0Z0
..0gGg0.
.000000.
.0XUUu0.
..0Uu0..
..0000..
""", 0, 17),
    },
}


def register():
    """add the Episode 6 parts to the live paper-doll tables (idempotent)"""
    import npc_bodies as NB
    NB.ACC.update(ACC_EP6)
