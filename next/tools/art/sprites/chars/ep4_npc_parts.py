"""Paper-doll parts for the Episode 4 townsfolk (E4-sprites). Same legend and 24x32 cell as npc_parts.py; nothing in the
shared part tables is edited: ep4_npcs.py calls register() to add these to the live tables at build time.

New hats:        circlet (Lyra: a slender gold band with a sapphire at the brow), crown (the King: a small gold crown
                 with two sapphires)
New accessories: keyring (Joss: a brass ring of keys at the hip), crank (Joss: the Lockwright's iron crank in hand)
Class letters as npc_parts.py: hat n o v y (dark to light), accent g G Y, metal m M N O, wood u U X.
"""

HATS_EP4 = {
    'circlet': {
        'down': '\n'.join(['.' * 24] * 6 + ['...........yy...........',
                                            '.....ovvvvvGGvvvvvo.....']),
        'left': '\n'.join(['.' * 24] * 6 + ['......y.................',
                                            '.....oGGvvvvvvvvo.......']),
        'up': '\n'.join(['.' * 24] * 7 + ['.....ovvvvvvvvvvvvo.....']),
    },
    'crown': {
        'down': '\n'.join(['.........y.yy.y.........',
                           '........yvyvvyvy........',
                           '........oGvvvvGo........',
                           '........ovvvvvvo........']),
        'left': '\n'.join(['.......y.yy.y...........',
                           '......yvyvvyvy..........',
                           '......oGvvvvvo..........',
                           '......ovvvvvvo..........']),
        'up': '\n'.join(['.........y.yy.y.........',
                         '........yvyvvyvy........',
                         '........ovvvvvvo........',
                         '........ovvvvvvo........']),
    },
}
HAT_DY_EP4 = {'circlet': 0, 'crown': 0}

ACC_EP4 = {
    # Joss's ring of keys hangs at the left hip (screen right in the down view)
    'keyring': {
        'down': ("""
.MM.
M..N
M..N
.NN.
.m.m
.m..
""", 15, 21),
        'left': ("""
.MM.
M..N
.NN.
.m.m
""", 12, 21),
        'up': ("""
.MM.
M..N
M..N
.NN.
""", 5, 21),
    },
    # the Lockwright's Crank: an iron L-bar with a wooden grip, held low at his side
    'crank': {
        'down': ("""
.0000
0XUU0
00m00
.0M0.
.0M0.
.0M0.
.0M0.
00MM0
0MMMN0
000000
""", 18, 16),
        'left': ("""
0000.
0UUX0
00m00
.0M0.
.0M0.
.0M0.
.0M0.
0MM00
0NMMM0
000000
""", 1, 16),
    },
}


def register():
    """add the Episode 4 parts to the live paper-doll tables (idempotent)"""
    import npc_parts as NP
    import npc_bodies as NB
    NP.HATS.update(HATS_EP4)
    NP.HAT_DY.update(HAT_DY_EP4)
    NB.ACC.update(ACC_EP4)
