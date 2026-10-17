"""Parts for the party battle poses (32x40 cells, facing LEFT).

Weapons are authored pointing 'up' and 'up_fwd' (up-left, 45 deg); other angles come from lossless 90 deg
rotations. Each weapon grid has a grip point (gx, gy). Arms use class chars: l m = sleeve (shadow, base),
r R x = hand/glove (dark, base, light), '0' outline; each character maps them to its own colours.
"""

WPAL = {
 '0': 'shadow:0', 'P': 'metal:4', 'O': 'metal:3', 'N': 'metal:2', 'M': 'metal:1',
 'g': 'gold:2', 'G': 'gold:3', 'Y': 'gold:4',
 'r': 'wood:1', 'R': 'wood:2', 'x': 'wood:3', 'X': 'wood:4',
 'h': 'water:3', 'i': 'water:4', 'k': 'ice:2', 'K': 'ice:3', 'w': 'stone_warm:5',
}

# name: {angle: (grid, (gx, gy))}
WEAPONS = {
 'sword': {
  'up': ("""
..00..
.0PN0.
.0ON0.
.0ON0.
.0ON0.
.0ON0.
.0ON0.
.0ON0.
.0MN0.
0gYGg0
.0Rr0.
.0xR0.
.0GG0.
..00..
""", (2, 11)),
  'up_fwd': ("""
00..........
0PO0........
.0ON0.......
..0ON0......
...0ON0.....
....0ON0.00.
.....0ON0G0.
......0MNG0.
.....0GGg0..
....0g00Rr0.
.....0..0xR0
.........0G0
..........0.
""", (9, 10)),
 },
 'axe': {
  'up': ("""
.0000..
0PON00.
0ONNRx0
0ONMRx0
0NMMRx0
.000Rx0
...0Rx0
...0Rx0
...0Rx0
...0Rx0
...0rR0
...000.
""", (4, 8)),
  'up_fwd': ("""
..000.......
.0PO00......
0ONNN0......
0OMNMx0.....
.0NMx0x0....
..00x0Rx0...
.....0Rx0...
......0Rx0..
.......0Rx0.
........0rR0
.........00.
""", (7, 8)),
 },
 'staff': {
  'up': ("""
...0...
..0k0..
.0kKi0.
.0hKi0.
0g0h0g0
.0gGg0.
..0x0..
..0R0..
..0x0..
..0R0..
..0x0..
..0R0..
..0x0..
..0R0..
..0x0..
..0R0..
..0x0..
..0R0..
..0x0..
..0R0..
..0r0..
...0...
""", (3, 12)),
  'up_fwd': ("""
.000..........
0kKi0.........
0hKi0g0.......
.0hh0G0.......
.0g00x0.......
..0GG0R0......
.....0x0......
......0R0.....
.......0x0....
........0R0...
.........0x0..
..........0R0.
...........0r0
............0.
""", (8, 9)),
 },
 'spear': {
  'up': ("""
..0..
.0P0.
0PON0
0ONM0
.0N0.
.0g0.
.0G0.
.0x0.
.0R0.
.0x0.
.0R0.
.0x0.
.0R0.
.0x0.
.0R0.
.0x0.
.0R0.
.0x0.
.0R0.
.0r0.
..0..
""", (2, 13)),
  'up_fwd': ("""
000..........
0PO0.........
0ONN0........
.0NM00.......
..00g0.......
....0Gx0.....
.....0xR0....
......0xR0...
.......0xR0..
........0xR0.
.........0rR0
..........000
""", (8, 8)),
 },
}
# bow: held upright in front (string toward the archer, on the right)
BOW = {
 'hold': ("""
..00..
.0xR0.
0xR0w.
0x0.w.
0R0.w.
0R0.w.
0G0.w.
0R0.w.
0R0.w.
0x0.w.
0xR0w.
.0xR0.
..00..
""", (1, 6)),
 'drawn': ("""
....00......
...0xR0.....
..0xR0.w....
..0x0...w...
..0R0....w..
00R0......w.
NMGrrrrrrrww
00R0......w.
..0R0....w..
..0x0...w...
..0xR0.w....
...0xR0.....
....00......
""", (3, 6)),
}

# arms: pose -> (grid, anchor (shoulder) xy, hand xy)
ARMS = {
 'down': ("""
0mll0
0xRr0
0xRr0
0RRr0
.000.
""", (2, 0), (2, 3)),
 'fwd': ("""
.0000000
0RRxxll0
0RRrrlm0
.0000000
""", (6, 1), (1, 1)),
 'fwd_down': ("""
....0m0
...0ll0
..0xR0.
.0xR0..
0RR0...
.00....
""", (5, 0), (1, 4)),
 'up': ("""
.00.
0RR0
0Rx0
0Rx0
0ll0
0lm0
""", (1, 5), (1, 1)),
 'up_fwd': ("""
.00....
0RR0...
0Rx0...
.0xR0..
..0ll0.
...0ll0
....0m0
""", (5, 6), (1, 1)),
 'up_back': ("""
....00.
...0RR0
...0xR0
..0Rx0.
.0ll0..
0ll0...
0m0....
""", (1, 6), (4, 1)),
 'back_low': ("""
0ml0...
.0ll0..
..0xR0.
...0RR0
....00.
""", (1, 0), (4, 3)),
}

ARM_PAL = {
 'hero': {'0': 'hair_brown:0', 'l': 'stone_warm:4', 'm': 'stone_warm:5', 'r': 'wood:1', 'R': 'wood:2', 'x': 'wood:3'},
 'mira': {'0': 'hair_violet:0', 'l': 'cloth_purple:2', 'm': 'cloth_purple:3', 'r': 'skin_light:1', 'R': 'skin_light:2', 'x': 'skin_light:3'},
 'bram': {'0': 'metal:0', 'l': 'stone_cool:4', 'm': 'metal:2', 'r': 'metal:1', 'R': 'stone_cool:4', 'x': 'metal:3'},
}

# body without the near arm (LEFT view, 24x32). Hero keeps the pauldron; Mira loses the staff and hand.
HERO_NOARM_ROWS = {
 19: "........1DCCCCCCB1.0lk0.",
 20: "........1DCCCCCB1...0k0.",
 21: "........0rRGRRRr0....0..",
 22: "........1BCCCCCB1.......",
 23: "........1BCCCCCCB1......",
}
HERO_SHOULDER = (9, 19)
MIRA_SHOULDER = (7, 18)
BRAM_FAR_HAND = (14, 21)

# kneeling legs (replace rows hip.. of the LEFT view after the upper body drops by KNEEL_DROP)
KNEEL_DROP = 5
KNEEL = {
 'hero': """
........1GGGGGGgg1......
.......0qqpppqpqq0......
......0xXxqp0qqp0.......
.....0RxRR00.0qq0.......
....0RRxRRr0.0RxR0......
.....0000000.00000......
""",
 'mira': """
...1GonnnnmllmmmmmmGg1..
...1GYGGonmllmmmgGGGg1..
....111GGGGGggggg1111...
.......0RxR03sss0.......
......0RRxRr03RR3.......
.......000000333........
""",
 'bram': """
........2NOM2BBBBBCG1...
.......2NOMM2.1GGg11....
......0RxxR2NOM2........
.....0RxxRRr0MN2........
.....0000000000.........
""",
}
