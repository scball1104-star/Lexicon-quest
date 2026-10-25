"""Episode 3 field (map) sprites for the visible foes (E3-sprites): their Episode 1 kin's hand-pixeled grids
(chars/enemy_field.py) in charcoal, soot, bronze and ember palettes, so each reads as the same breed as in battle.
build_enemies.build_field adds a warm 1 px rim light on the upper-left edge of every frame (CRITIQUE_4 item 8:
visible enemies must not vanish into the dark floor) and an ember accent cluster is part of each palette.
Facing LEFT, 2 frames.

    VARIANTS_EP3  {id: (source grid id, palette)}
"""

VARIANTS_EP3 = {
    'cinder_hound': ('briar_wolf', {
        '0': 'shadow:0', 'r': 'shadow:2', 'R': 'stone_warm:1', 'x': 'stone_warm:2', 'X': 'stone_warm:3',
        'g': 'roof_red:3', 'G': 'fire:2', 'H': 'fire:3', 'Y': 'fire:5', 'w': 'fire:4', 'n': 'ink:1'}),
    'cinder_beetle': ('moss_scarab', {
        '0': 'shadow:0', 'a': 'shadow:2', 'b': 'stone_warm:1', 'c': 'stone_warm:2', 'd': 'roof_red:3', 'W': 'fire:4',
        'g': 'roof_red:2', 'G': 'roof_red:3', 'H': 'fire:3', 'Y': 'fire:5'}),
    'slag_slime': ('ink_slime', {
        '0': 'wood:0', 'a': 'roof_red:1', 'b': 'roof_red:2', 'c': 'roof_red:4', 'd': 'fire:2', 'W': 'fire:4',
        'Y': 'fire:5', 'y': 'roof_red:3'}),
    'ashbound_miner': ('page_wraith', {
        '0': 'shadow:0', 'i': 'shadow:2', 'I': 'stone_warm:1', 'j': 'stone_warm:2', 'l': 'stone_warm:2',
        'm': 'stone_warm:3', 'n': 'stone_warm:3', 'o': 'stone_warm:4', 'e': 'fire:3', 'E': 'fire:5'}),
    'furnace_construct': ('tome_golem', {
        '0': 'wood:0', 'k': 'wood:1', 'K': 'wood:2', 'l': 'wood:3', 'L': 'wood:4', 'W': 'gold:3', 'g': 'roof_red:3',
        'G': 'fire:3', 'Y': 'fire:4', 'Z': 'fire:5', 'p': 'roof_red:4'}),
    'soot_phantom': ('ink_wraith', {
        '0': 'shadow:0', 'i': 'shadow:1', 'I': 'shadow:2', 'j': 'stone_warm:1', 'J': 'stone_warm:2',
        'v': 'stone_warm:2', 'V': 'stone_warm:3', 's': 'stone_warm:3', 'S': 'stone_warm:4', 'e': 'fire:4'}),
    'forge_defender': ('echo_warden', {
        '0': 'wood:0', 'M': 'wood:1', 'N': 'wood:2', 'O': 'wood:3', 'P': 'wood:4', 'Q': 'gold:3', 'B': 'roof_red:1',
        'C': 'roof_red:2', 'D': 'roof_red:3', 'g': 'gold:2', 'G': 'gold:3', 'k': 'wood:2', 'K': 'wood:3', 'L': 'wood:4',
        'e': 'fire:5'}),
}
