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

# ------------------------------------------------------------------ Episode 2 (E2-sprites): the Nameless Hollow,
# the Court and the rival. Packed in their own band under the Episode 1 blocks and the animals (build_npcs.py),
# so no Episode 1 rect moves. Looks from docs/story/EPISODE2.md (cast) and EPISODE2_PLAN.md 9.2.
HAIR.update({
    'sandy': ['path:1', 'path:2', 'path:3', 'sand:2'],
    'greying': ['stone_warm:1', 'stone_warm:2', 'stone_warm:3', 'stone_warm:4'],
    'silver': ['stone_cool:3', 'stone_cool:5', 'metal:3', 'metal:4'],
})
LEATHER = R('wood', 1, 2, 3, 4)
SILVER = ['stone_cool:3', 'stone_cool:4', 'stone_cool:5', 'metal:3']

NPCS_EP2 = {
    # Mayor Elian: about twenty, slight, sandy hair, a wine-red mayor's coat several sizes too big (the long robe
    # body, hem on his shoes), gold trim, the ledger always under his arm
    'npc_elian': dict(name='Elian', body='robe', head='short', over=['book'],
                      pal={'hair': HAIR['sandy'], 'top': R('roof_red', 1, 2, 3, 4), 'sec': R('gold', 1, 2, 3, 4),
                           'accent': R('gold', 2, 3, 4), 'wood': R('earth', 1, 2, 3)}),
    # Sister Anwen: sixties, a grey habit and hood stitched with silver thread, the chapel register
    'npc_anwen': dict(name='Sister Anwen', body='robe', head='bun', hat='hood', over=['book'],
                      pal={'hair': HAIR['gray'], 'top': R('stone_cool', 1, 2, 3, 4), 'hat': R('stone_cool', 1, 2, 3, 4),
                           'sec': ['metal:1', 'stone_cool:5', 'metal:3', 'metal:4'], 'accent': ['stone_cool:4', 'metal:3', 'metal:4'],
                           'wood': R('cloth_purple', 1, 2, 3)}),
    # Tovin the ferryman: old, weathered, an ochre oilskin, grey stubble, his oar
    'npc_tovin': dict(name='Tovin', body='tunic', head='short', beard='short', over=['oar'], no_arms=True,
                      pal={'hair': HAIR['gray'], 'top': ['earth:2', 'earth:3', 'path:2', 'path:3'], 'bottom': R('shadow', 1, 2, 3),
                           'skin': ['skin_light:0', 'skin_light:1', 'skin_light:1', 'skin_light:2'], 'wood': R('wood', 2, 3, 4)}),
    # Lena the watchmaker: fifties, greying bun, spectacles, a plum dress and an apron of tiny tools
    'npc_lena': dict(name='Lena', body='dress', head='bun', over=['glasses', 'apron'],
                     pal={'hair': HAIR['greying'], 'top': R('roof_purple', 1, 2, 3, 4), 'sec': LEATHER,
                          'bottom': R('roof_purple', 1, 2, 3)}),
    # Vessa the glassblower: goggles up, a leather apron, a glowing glass piece in hand
    'npc_vessa': dict(name='Vessa', body='tunic', head='pony', hat='goggles', over=['apron_wide', 'mug'], no_arms=True,
                      pal={'hair': HAIR['ginger'], 'top': CREAM, 'sec': LEATHER, 'bottom': R('earth', 1, 2, 3),
                           'hat': R('wood', 1, 2, 3, 4), 'metal': R('gold', 1, 2, 3, 4), 'glow': ['magic_cyan:3', 'magic_cyan:4']}),
    # Nico: errand boy, eight or so, an ochre tunic
    'npc_nico': dict(name='Nico', body='child', head='short', head_dy=5,
                     pal={'hair': HAIR['dark'], 'top': R('gold', 1, 2, 3, 4), 'bottom': R('earth', 1, 2, 3)}),
    # Sava the weaver: gentle, black hair, a green dress and a gold-patterned shawl of her own weaving
    'npc_sava': dict(name='Sava', body='dress', head='long', over=['shawl'],
                     pal={'hair': HAIR['black'], 'top': R('roof_green', 1, 2, 3, 4), 'sec': R('gold', 1, 2, 3, 4),
                          'bottom': R('roof_green', 1, 2, 3), 'skin': R('skin_med', 0, 1, 2, 3)}),
    # Corin the watchman: the Hollow's gate watch in slate grey (Holt, Willowmere's guard, wears blue)
    'npc_corin': dict(name='Corin', body='tunic', head='short', hat='helmet', over=['spear'], no_arms=True,
                      pal={'hair': HAIR['dark'], 'top': R('stone_cool', 1, 2, 3, 4), 'bottom': R('shadow', 1, 2, 3),
                           'accent': ['stone_cool:4', 'metal:3', 'metal:4']}),
    # Orla: old, Keeper-born, white bun, a deep blue dress and a teal shawl
    'npc_orla': dict(name='Orla', body='dress', head='bun', over=['shawl'],
                     pal={'hair': HAIR['white'], 'top': R('cloth_blue', 1, 2, 3, 4), 'sec': R('magic_cyan', 0, 1, 2, 3),
                          'bottom': R('cloth_blue', 1, 2, 3)}),
    # Wren: the Signless Inn's cheerful innkeeper, ginger ponytail, mustard dress, cream apron, a mug
    'npc_wren': dict(name='Wren', body='dress', head='pony', over=['apron', 'mug'], no_arms=True,
                     pal={'hair': HAIR['auburn'], 'top': R('gold', 1, 2, 3, 4), 'sec': CREAM, 'bottom': R('earth', 1, 2, 3),
                          'glow': ['gold:3', 'gold:4']}),
    # Fitch: the Hollow Provisioner, stout, mustache, a plum shirt and a leather apron
    'npc_fitch': dict(name='Fitch', body='stout', head='short', beard='mustache', over=['apron_wide'],
                      pal={'hair': HAIR['dark'], 'top': R('cloth_purple', 1, 2, 3, 4), 'sec': LEATHER,
                           'bottom': R('shadow', 1, 2, 3), 'skin': R('skin_med', 0, 1, 2, 3)}),
    # Vex Quill: silver hair, a crimson scarf, a long dark leather coat
    'npc_vex': dict(name='Vex Quill', body='robe', head='long', over=['scarf'],
                    pal={'hair': HAIR['silver'], 'top': ['ink:0', 'ink:1', 'shadow:2', 'stone_cool:2'],
                         'sec': R('roof_red', 1, 2, 3, 4), 'bottom': R('ink', 0, 1, 2), 'accent': R('gold', 2, 3, 4)}),
    # Aurel (after aurel_named): a silver robe, a long grey beard, no crown
    'npc_aurel': dict(name='Aurel', body='robe', head='elder', beard='long',
                      pal={'hair': HAIR['gray'], 'top': SILVER, 'sec': R('water', 2, 3, 4, 5), 'accent': R('water', 3, 4, 5)}),
}

# ------------------------------------------------------------------ Episode 3 (E3-sprites): Emberpeak and the
# Foundry. Packed at the END of the Episode 2 band (build_npcs.py), so no earlier rect moves. Looks from
# docs/story/EPISODE3.md section 3 and EPISODE3_PLAN.md 9.2.
HAIR.update({
    'copper': ['roof_red:2', 'roof_red:3', 'roof_red:4', 'fire:2'],
    'ash_grey': ['shadow:3', 'stone_warm:1', 'stone_warm:2', 'stone_warm:3'],
})
BRASS = R('gold', 1, 2, 3, 4)
IRON = ['shadow:2', 'stone_cool:2', 'stone_cool:3', 'stone_cool:4']
SOOT_COAT = ['shadow:2', 'roof_red:1', 'roof_red:2', 'roof_red:3']

NPCS_EP3 = {
    # Foreman Veyra: fifties, soot-streaked (a smoky dark coat, ash-grey hair), sleeves rolled, a whistle on a cord
    'npc_veyra': dict(name='Foreman Veyra', body='tunic', head='bun', over=['whistle'],
                      pal={'hair': HAIR['ash_grey'], 'top': SOOT_COAT, 'bottom': R('shadow', 1, 2, 3),
                           'skin': R('skin_med', 0, 1, 2, 3), 'accent': R('gold', 2, 3, 4)}),
    # Ilya the Bell Founder: copper beard, brass goggles, leather apron (matches the goggles_smith portrait)
    'npc_ilya': dict(name='Ilya', body='stout', head='short', beard='full', hat='goggles', over=['apron_wide'],
                     pal={'hair': HAIR['copper'], 'top': CREAM, 'sec': LEATHER, 'bottom': R('shadow', 1, 2, 3),
                          'hat': BRASS, 'metal': BRASS, 'skin': R('skin_light', 0, 1, 2, 3)}),
    # Sella: the Emberpeak weaponsmith, mid-thirties, quick, a dark ponytail, a leather apron and her tongs/hammer
    'npc_sella': dict(name='Sella', body='tunic', head='pony', over=['apron', 'hammer'], no_arms=True,
                      pal={'hair': HAIR['dark'], 'top': R('roof_red', 1, 2, 3, 4), 'sec': LEATHER,
                           'bottom': R('shadow', 1, 2, 3), 'skin': R('skin_med', 0, 1, 2, 3)}),
    # Harl the Surveyor: writes pressure readings (a notebook), a khaki coat, grey at the temples
    'npc_harl': dict(name='Harl', body='tunic', head='short', over=['book'],
                     pal={'hair': HAIR['greying'], 'top': R('sand', 0, 1, 2, 3), 'bottom': R('earth', 1, 2, 3),
                          'wood': R('roof_red', 1, 2, 3)}),
    # Bess the Cook: the Coal Lantern Inn, a white cook's cap, a deep green dress, a wide apron
    'npc_bess': dict(name='Bess', body='dress', head='bun', hat='baker_cap', over=['apron_wide'],
                     pal={'hair': HAIR['black'], 'top': R('roof_green', 1, 2, 3, 4), 'hat': WHITE, 'sec': WHITE,
                          'bottom': R('roof_green', 1, 2, 3), 'skin': R('skin_med', 0, 1, 2, 3)}),
    # Taro the Riveter: Ventworks Supplies, a brass hard hat, a mustache, a rivet hammer
    'npc_taro': dict(name='Taro', body='tunic', head='short', beard='mustache', hat='helmet', over=['hammer'],
                     no_arms=True,
                     pal={'hair': HAIR['dark'], 'top': R('cloth_blue', 1, 2, 3, 4), 'hat': BRASS,
                          'bottom': R('shadow', 1, 2, 3), 'accent': BRASS, 'metal': BRASS, 'skin': R('skin_med', 0, 1, 2, 3)}),
    # Rusk the Watch: the gate watch in iron grey with an ember trim, a spear
    'npc_rusk': dict(name='Rusk', body='tunic', head='short', hat='helmet', over=['spear'], no_arms=True,
                     pal={'hair': HAIR['brown'], 'top': IRON, 'bottom': R('shadow', 1, 2, 3), 'hat': IRON,
                          'accent': R('roof_red', 2, 3, 4)}),
    # Mara of the First Bell (memory actor): auburn hair tied back, a founder's apron, a bell hammer
    'npc_mara': dict(name='Mara', body='tunic', head='pony', over=['apron_wide', 'hammer'], no_arms=True,
                     pal={'hair': HAIR['auburn'], 'top': CREAM, 'sec': LEATHER, 'bottom': R('earth', 1, 2, 3),
                          'skin': R('skin_light', 0, 1, 2, 3)}),
    # the Valewyn courier: a soaked royal cloak (dark wet blue hood), gold sash, a dispatch satchel
    'npc_courier_v': dict(name='Valewyn courier', body='tunic', head='short', hat='hood', over=['satchel'],
                          pal={'hair': HAIR['dark'], 'top': R('cloth_blue', 0, 1, 2, 3), 'hat': R('cloth_blue', 0, 1, 2, 3),
                               'bottom': R('shadow', 1, 2, 3), 'accent': R('gold', 2, 3, 4), 'wood': R('wood', 1, 2, 3)}),
}
