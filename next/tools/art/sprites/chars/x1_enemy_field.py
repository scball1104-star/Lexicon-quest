"""Expansion 1 field (map) sprites for the three new foes (X1-sprites): their Episode 1 kin's hand-pixeled grids
(chars/enemy_field.py) in new palettes, facing LEFT, 2 frames, with a 1 px rim light added by x1_field.py so each
reads on grass, on dark flagstone and on wet brick (CRITIQUE_4 item 8).

    VARIANTS_X1   {id: (source grid id, palette)}   barrow_shade (page wraith), millstone_golem (tome golem)
    REEVE_PAL / reeve_frames   the Reeve's avatar: the Echo Warden's grid in bone and moss on a 24x36 canvas, a crook added
"""

SHADE_HEX = ['#1f3b37', '#31594c', '#5a8c72', '#90bf9f', '#c2e2c8', '#e3f4e2', '#f5fcf0']

VARIANTS_X1 = {
    # the shade: the page wraith's hood and rags in pale green-white, candle-green eyes
    'barrow_shade': ('page_wraith', {
        '0': 'foliage_dark:0', 'i': SHADE_HEX[0], 'I': SHADE_HEX[1], 'j': SHADE_HEX[2], 'l': SHADE_HEX[3],
        'm': SHADE_HEX[4], 'n': SHADE_HEX[5], 'o': SHADE_HEX[6], 'e': 'grass:4', 'E': 'grass:5'}),
    # the golem: the tome golem's blocks in granite grey, flour-white hands and feet, a pale grindstone for the core
    'millstone_golem': ('tome_golem', {
        '0': 'shadow:0', 'k': 'stone_cool:2', 'K': 'stone_cool:3', 'l': 'stone_cool:4', 'L': 'stone_cool:5',
        'W': 'metal:3', 'g': 'stone_warm:2', 'G': 'stone_warm:3', 'Y': 'stone_warm:5', 'Z': 'shadow:1',
        'p': 'stone_warm:5'}),
}

# the Echo Warden's field grid (24x32) recoloured: bone plate (M..Q), a bone shield with moss (k K L), moss cape (B C D)
REEVE_PAL = {
    '0': 'shadow:0', 'M': 'stone_warm:1', 'N': 'stone_warm:2', 'O': 'stone_warm:3', 'P': 'stone_warm:4', 'Q': 'stone_warm:5',
    'k': 'stone_warm:3', 'K': 'stone_warm:4', 'L': 'stone_warm:5', 'B': 'foliage_dark:1', 'C': 'foliage_dark:2',
    'D': 'grass:1', 'g': 'grass:2', 'G': 'grass:3', 'e': 'grass:5',
    # the crook (wood) and moss tufts
    'u': 'earth:2', 'U': 'earth:3', 'X': 'earth:4', 'm': 'grass:2', 'M2': 'grass:3', 'c': 'earth:0',
}

def reeve_frames(grid_rows):
    """the two 24x36 frames from the kin's two 24x32 grids: [rows0, rows1] -> [rows0', rows1'] as char rows. The
    knight sits at (0, 4); the crook (staff x 19..20, hook curling left over the shoulder) stands in front of the cape."""
    out = []
    for gi, rows in enumerate(grid_rows):
        cv = [['.'] * 24 for _ in range(36)]
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch != '.':
                    cv[y + 4][x] = ch
        for y in range(8, 36):
            cv[y][19] = 'X'; cv[y][20] = 'U'
            if (y // 3) % 3 == 1:
                cv[y][20] = 'u'
        for x, y, ch in ((19, 7, 'X'), (20, 7, 'U'), (19, 6, 'X'), (20, 6, 'U'), (19, 5, 'X'), (20, 5, 'U'), (18, 4, 'X'),
                         (19, 4, 'X'), (20, 4, 'U'), (17, 4, 'X'), (16, 4, 'X'), (16, 5, 'U'), (16, 6, 'u')):
            cv[y][x] = ch
        for y in range(0, 36):
            for x in range(13, 24):
                if cv[y][x] == '.':
                    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < 36 and 0 <= xx < 24 and cv[yy][xx] in 'XUu':
                            cv[y][x] = 'c'; break
        for x, y in ((4, 17), (5, 16), (3, 22), (11, 11), (12, 12), (9, 21)):
            if cv[y][x] not in '.0':
                cv[y][x] = 'g'
        for y in (22, 23):
            cv[y][19] = 'g'; cv[y][20] = 'G'
        out.append([''.join(r) for r in cv])
    return out
