"""Episode 2 field (map) sprites for the visible foes (E2-sprites). Like the Whisperwood Hollow variants, most are
their Episode 1 kin's hand-pixeled grids (chars/enemy_field.py) in their own master-palette colours, so each
reads as the same breed at map scale as in battle; the shard swarm is a new small grid. Facing LEFT, 2 frames.

    VARIANTS_EP2  {id: (source grid id, palette)}
    SWARM         {'size', 'pal', 'frames'} (16 x 16, a loose cluster of glass shards)
"""

VARIANTS_EP2 = {
    # the silver mist wolf: grey fur, a pale blue mane like breath in cold air
    'mist_wolf': ('briar_wolf', {
        '0': 'shadow:0', 'r': 'stone_cool:2', 'R': 'stone_cool:3', 'x': 'stone_cool:4', 'X': 'stone_cool:5',
        'g': 'water:2', 'G': 'water:3', 'H': 'water:4', 'Y': 'gold:4', 'w': 'metal:4', 'n': 'ink:1'}),
    # a beetle with a silverglass shell and steel legs
    'glassback': ('moss_scarab', {
        '0': 'water:0', 'a': 'water:2', 'b': 'water:3', 'c': 'water:4', 'd': 'ice:2', 'W': 'metal:4',
        'g': 'stone_cool:2', 'G': 'stone_cool:3', 'H': 'stone_cool:4', 'Y': 'stone_cool:5'}),
    # liquid mercury with dark mirror eyes
    'quicksilver': ('ink_slime', {
        '0': 'shadow:1', 'a': 'stone_cool:3', 'b': 'stone_cool:4', 'c': 'stone_cool:5', 'd': 'metal:3',
        'W': 'metal:4', 'Y': 'ink:2', 'y': 'ink:1'}),
    'quicksilver_bead': ('ink_slime', {
        '0': 'shadow:1', 'a': 'stone_cool:3', 'b': 'stone_cool:4', 'c': 'stone_cool:5', 'd': 'metal:3',
        'W': 'metal:4', 'Y': 'ink:2', 'y': 'ink:1'}),
    # pale silver-lilac rags, white eyes
    'glint_wisp': ('page_wraith', {
        '0': 'ink:2', 'i': 'roof_purple:2', 'I': 'cloth_purple:3', 'j': 'cloth_purple:4', 'l': 'stone_cool:4',
        'm': 'cloth_purple:5', 'n': 'stone_cool:5', 'o': 'metal:3', 'e': 'magic_violet:3', 'E': 'metal:4'}),
    # violet-black rags, silver eyes
    'borrowed_shadow': ('page_wraith', {
        '0': 'ink:0', 'i': 'ink:1', 'I': 'ink:1', 'j': 'hair_violet:2', 'l': 'ink:2', 'm': 'hair_violet:3',
        'n': 'roof_purple:2', 'o': 'roof_purple:3', 'e': 'metal:3', 'E': 'metal:4'}),
    # slate blocks, glass ribbons, a cyan core
    'glass_sentinel': ('tome_golem', {
        '0': 'shadow:0', 'k': 'shadow:2', 'K': 'stone_cool:2', 'l': 'stone_cool:3', 'L': 'stone_cool:4',
        'W': 'stone_cool:5', 'g': 'water:3', 'G': 'magic_cyan:2', 'Y': 'magic_cyan:3', 'Z': 'magic_cyan:4',
        'p': 'water:4'}),
    # slate and black plate, a black cape, the pale blank faceplate
    'faceless_knight': ('echo_warden', {
        '0': 'shadow:0', 'M': 'shadow:2', 'N': 'stone_cool:2', 'O': 'stone_cool:3', 'P': 'stone_cool:4',
        'Q': 'stone_cool:5', 'B': 'ink:0', 'C': 'ink:1', 'D': 'shadow:2', 'g': 'stone_cool:2', 'G': 'stone_cool:3',
        'k': 'shadow:2', 'K': 'stone_cool:2', 'L': 'stone_cool:3', 'e': 'metal:3'}),
    # gold and white plate, a white cape, a red jewel
    'false_pride': ('echo_warden', {
        '0': 'wood:0', 'M': 'wood:2', 'N': 'gold:2', 'O': 'gold:3', 'P': 'gold:4', 'Q': 'gold:5',
        'B': 'stone_warm:3', 'C': 'stone_warm:4', 'D': 'stone_warm:5', 'g': 'metal:3', 'G': 'metal:4',
        'k': 'gold:3', 'K': 'gold:4', 'L': 'gold:5', 'e': 'roof_red:4'}),
    # the weeping phantom in ice
    'false_sorrow': ('ink_wraith', {
        '0': 'water:0', 'i': 'water:1', 'I': 'water:2', 'j': 'water:3', 'J': 'water:4', 'v': 'ice:1',
        'V': 'ice:2', 's': 'stone_cool:5', 'S': 'metal:4', 'e': 'magic_cyan:4'}),
}

SWARM = {'size': (16, 16), 'pal': {'0': 'water:1', 'L': 'ice:3', 'k': 'ice:2', 'K': 'water:4', 'W': 'metal:4'},
         'frames': ["""
................
.....0..........
....0W0.....0...
....0Lk0...0W0..
....0kK0...0L0..
.....0K0...0K0..
......00....0...
..0.......0.....
.0W0.....0W0....
.0Lk0....0LK0...
..0K0.....0K0...
...00......00...
.......0........
......0W0.......
......0K0.......
.......0........
""", """
................
................
.....0.......0..
....0W0.....0W0.
....0Lk0....0L0.
....0kK0....0K0.
.....0K0.....0..
......00........
.0........0.....
0W0......0W0....
0Lk0.....0LK0...
.0K0......0K0...
..00...0...00...
......0W0.......
......0K0.......
.......0........
"""]}
