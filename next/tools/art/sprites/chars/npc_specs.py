"""Townsfolk definitions: body, head, hat, beard, accessories and material ramps (master-palette refs).
Names follow W1-content's cast (see assets/sprites/README.md)."""


def R(name, *idx):
    return ['%s:%d' % (name, i) for i in idx]


HAIR = {
    'brown': R('hair_brown', 1, 2, 3, 4),
    'dark': ['hair_brown:0', 'hair_brown:1', 'hair_brown:2', 'hair_brown:3'],
    'auburn': ['roof_red:1', 'roof_red:2', 'roof_red:3', 'wood:4'],
    'ginger': ['roof_red:2', 'roof_red:3', 'roof_red:4', 'fire:3'],
    'blonde': R('gold', 1, 2, 3, 4),
    'gray': R('stone_cool', 2, 3, 4, 5),
    'white': ['stone_cool:4', 'stone_cool:5', 'metal:3', 'metal:4'],
    'black': ['ink:0', 'ink:1', 'ink:2', 'stone_cool:2'],
    'navy': R('ink', 1, 2, 3, 4),
}
CREAM = ['stone_warm:3', 'stone_warm:4', 'stone_warm:5', 'metal:4']
WHITE = ['stone_cool:4', 'stone_cool:5', 'metal:3', 'metal:4']

NPCS = {
    'npc_elder': dict(name='Elder Mael', body='robe', head='elder', beard='long', hat='hood', over=['staff'],
                      no_arms=True,
                      pal={'hair': HAIR['white'], 'top': R('roof_green', 1, 2, 3, 4), 'hat': R('roof_green', 1, 2, 3, 4),
                           'sec': R('gold', 1, 2, 3, 4), 'accent': R('wood', 2, 3, 4),
                           'glow': ['grass:4', 'grass:5']}),
    'npc_tess': dict(name='Tess', body='tunic', head='pony', over=['satchel'],
                     pal={'hair': HAIR['brown'], 'top': ['magic_cyan:0', 'magic_cyan:1', 'roof_green:4', 'magic_cyan:2'], 'bottom': R('shadow', 1, 2, 3),
                          'accent': R('wood', 2, 3, 4), 'wood': R('wood', 2, 3, 4)}),
    'npc_baker': dict(name='Oren', body='stout', head='short', hat='baker_cap', beard='short', over=['apron_wide'],
                      pal={'hair': HAIR['brown'], 'top': R('path', 0, 1, 2, 3), 'hat': WHITE, 'sec': WHITE,
                           'bottom': R('earth', 1, 2, 3)}),
    'npc_ferry': dict(name='Nella', body='dress', head='long', over=['scarf'],
                      pal={'hair': HAIR['blonde'], 'top': R('cloth_blue', 1, 2, 3, 4), 'sec': CREAM,
                           'bottom': R('cloth_blue', 1, 2, 3)}),
    'npc_innkeeper': dict(name='Hob', body='stout', head='short', beard='full', over=['apron_wide', 'mug'],
                          no_arms=True,
                          pal={'hair': HAIR['dark'], 'top': R('roof_red', 1, 2, 3, 4), 'sec': CREAM,
                               'bottom': R('earth', 1, 2, 3), 'glow': ['gold:3', 'gold:4']}),
    'npc_shopkeeper': dict(name='Pell', body='robe', head='short', hat='turban', beard='mustache',
                           pal={'skin': R('skin_med', 0, 1, 2, 3), 'hair': HAIR['dark'], 'top': R('gold', 1, 2, 3, 4),
                                'sec': R('cloth_blue', 1, 2, 3, 4), 'hat': WHITE, 'accent': R('cloth_blue', 2, 3, 4)}),
    'npc_smith': dict(name='Garrick', body='stout', head='elder', beard='full', over=['apron_wide', 'hammer'],
                      no_arms=True,
                      pal={'hair': HAIR['white'], 'top': CREAM, 'sec': R('wood', 1, 2, 3, 4),
                           'bottom': R('shadow', 1, 2, 3), 'skin': R('skin_light', 0, 1, 1, 2)}),
    'npc_child_a': dict(name='Wick', body='child', head='short', head_dy=5,
                        pal={'hair': HAIR['brown'], 'top': R('roof_red', 1, 2, 3, 4), 'bottom': R('earth', 1, 2, 3)}),
    'npc_child_b': dict(name='Lark', body='child', head='pony', head_dy=5,
                        pal={'hair': HAIR['blonde'], 'top': R('blossom', 0, 1, 2, 3), 'bottom': R('cloth_blue', 1, 2, 3)}),
    'npc_guard': dict(name='Holt', body='tunic', head='short', hat='helmet', over=['spear'], no_arms=True,
                      pal={'hair': HAIR['brown'], 'top': R('cloth_blue', 1, 2, 3, 4), 'bottom': R('shadow', 1, 2, 3),
                           'accent': R('gold', 2, 3, 4)}),
    'npc_old_woman': dict(name='Edda', body='dress', head='bun', over=['shawl'],
                          pal={'hair': HAIR['gray'], 'top': R('earth', 1, 2, 3, 4), 'sec': R('cloth_purple', 1, 2, 3, 4),
                               'bottom': R('earth', 1, 2, 3)}),
    'npc_farmer': dict(name='Cobb', body='tunic', head='short', hat='straw_hat',
                       pal={'hair': HAIR['brown'], 'top': R('roof_green', 1, 2, 3, 4), 'hat': R('sand', 0, 1, 2, 3),
                            'bottom': R('earth', 1, 2, 3)}),
    'npc_scholar': dict(name='Iris', body='robe', head='bun', over=['glasses', 'book'],
                        pal={'hair': HAIR['navy'], 'top': R('cloth_blue', 1, 2, 3, 4), 'sec': R('gold', 1, 2, 3, 4),
                             'wood': R('roof_red', 1, 2, 3)}),
    'npc_parent': dict(name='Hazel', body='dress', head='long', over=['apron'],
                       pal={'hair': HAIR['auburn'], 'top': R('roof_green', 1, 2, 3, 4), 'sec': CREAM,
                            'bottom': R('roof_green', 1, 2, 3)}),
    'npc_bellkeeper': dict(name='Pip', body='robe', head='elder', beard='short', over=['lantern'], no_arms=True,
                           pal={'hair': HAIR['gray'], 'top': R('cloth_purple', 1, 2, 3, 4), 'sec': R('gold', 1, 2, 3, 4),
                                'glow': ['fire:4', 'fire:5']}),
}
