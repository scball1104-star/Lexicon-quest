"""Preview scenes for compose.py. Each is one screen (24 x 14 tiles) unless noted.
Decor entries whose id is a tiles.json object/tile come from this tool; ids found in assets/sprites/props.json
(trees, lamp posts, benches...) belong to the sprites agent and are drawn read-only, only to judge context."""

SCENES = {}


def scene(name, **kw):
    kw['name'] = name
    SCENES[name] = kw
    return kw


def row_fill(t, x0, x1, y, **kw):
    return [dict(t=t, x=x, y=y, **kw) for x in range(x0, x1 + 1)]


# ------------------------------------------------------------------ Willowmere riverside corner
_bridge = []
for _r, _y in (('n', 7), ('s', 8)):
    _bridge.append({'t': 'bridge_stone_h_%s_l' % _r, 'x': 13, 'y': _y})
    _bridge += row_fill('bridge_stone_h_%s_m' % _r, 14, 17, _y)
    _bridge.append({'t': 'bridge_stone_h_%s_r' % _r, 'x': 18, 'y': _y})
_bridge += row_fill('bridge_stone_h_arch_m', 14, 17, 9)

scene('riverside',
      legend={'.': 'grass', ',': 'tallgrass', '=': 'dirt', 'o': 'plaza', 's': 'sand', '~': 'water', '-': 'shallow',
              'F': 'fence_wood'},
      ground=[
          '............sss~~~~ss...',
          '............ss~~~~~ss...',
          '............ss~~~~ss....',
          '.............s~~~~ss....',
          '.............s~~~~s.....',
          '.............s~~~~s.....',
          'ooooooooooooo=~~~~=====.',
          'ooooooooooooo=~~~~======',
          'ooooooooooooo=~~~~======',
          'oooo....===..s~~~~s.....',
          '...........=Fs~~~~s,,...',
          '..........==Fs~~-~s,,,..',
          '..........=.Fs~---ss....',
          '..........=..ss~~~s.....',
      ],
      overlays=[{'t': 'hydrangea_violet', 'x': 5, 'y': 9}, {'t': 'flowers_white', 'x': 6, 'y': 9},
                {'t': 'hydrangea_blue', 'x': 7, 'y': 9}, {'t': 'flowers_yellow', 'x': 21, 'y': 10},
                {'t': 'hydrangea_blue', 'x': 22, 'y': 12}, {'t': 'flowers_pink', 'x': 2, 'y': 11},
                {'t': 'flowers_violet', 'x': 4, 'y': 12}, {'t': 'pebbles_1', 'x': 19, 'y': 12},
                {'t': 'tuft_0', 'x': 7, 'y': 12}, {'t': 'flowers_white', 'x': 0, 'y': 13},
                {'t': 'leaves', 'x': 12, 'y': 3}],
      decor=[{'t': 'hero_home', 'x': 0, 'y': 5}, {'t': 'bakery', 'x': 6, 'y': 5},
             {'t': 'house_small', 'x': 20, 'y': 5},
             {'t': 'tree_willow', 'x': 11, 'y': 4}, {'t': 'lamp_post', 'x': 12, 'y': 6, 'state': 1},
             {'t': 'lamp_post', 'x': 19, 'y': 9, 'state': 1}, {'t': 'bench', 'x': 2, 'y': 9},
             {'t': 'tree_willow', 'x': 8, 'y': 13}] + _bridge,
      actors=[{'x': 9, 'y': 8}, {'x': 15, 'y': 8, 'dir': 'right'}])

# ------------------------------------------------------------------ Lantern Square with the bell tower
scene('lantern_square',
      legend={'.': 'grass', 'o': 'plaza', '=': 'dirt', ',': 'tallgrass'},
      ground=[
          '........................',
          '........................',
          '........................',
          '........................',
          '........................',
          '........................',
          '........................',
          '........................',
          '........o...........o...',
          'oooooooooooooooooooooooo',
          'oooooooooooooooooooooooo',
          'oooooooooooooooooooooooo',
          '..oooooooooooooooooooo..',
          '...ooooooooooooooooo....',
      ],
      overlays=[{'t': 'hydrangea_blue', 'x': 0, 'y': 12}, {'t': 'hydrangea_violet', 'x': 1, 'y': 13},
                {'t': 'flowers_white', 'x': 0, 'y': 13}, {'t': 'hydrangea_blue', 'x': 23, 'y': 12},
                {'t': 'flowers_yellow', 'x': 22, 'y': 13}, {'t': 'hydrangea_violet', 'x': 23, 'y': 13}],
      decor=[{'t': 'inn', 'x': 0, 'y': 8}, {'t': 'chapel_bell_tower', 'x': 8, 'y': 9},
             {'t': 'item_shop', 'x': 18, 'y': 8},
             {'t': 'well', 'x': 14, 'y': 12}, {'t': 'market_stall_fruit', 'x': 19, 'y': 12},
             {'t': 'lamp_post', 'x': 7, 'y': 10, 'state': 1}, {'t': 'lamp_post', 'x': 17, 'y': 10, 'state': 1},
             {'t': 'bench', 'x': 9, 'y': 12}, {'t': 'signpost_arrow', 'x': 4, 'y': 12}],
      actors=[{'x': 12, 'y': 11}])

# ------------------------------------------------------------------ test scenes
scene('terrain_test',
      legend={'.': 'grass', ',': 'tallgrass', '=': 'dirt', 'o': 'plaza', 's': 'sand', '~': 'water',
              '-': 'shallow', 'm': 'moss', 'f': 'stone_floor', 'p': 'pit', 'i': 'ink', 'w': 'wood_floor',
              'r': 'carpet_red', 'b': 'carpet_blue'},
      ground=[
          '..........ssss~~~~ss....',
          '..,,,.....sss~~~~~~ss...',
          '.,,,,,....ss~~~~~~~ss...',
          '..,,,..===ss~~~--~~~s...',
          '.......=..ss~~----~~s...',
          '..=====...s~~~~--~~~ss..',
          '..=.......ss~~~~~~~~sss.',
          '..=..ooooo.sss~~~~~ssss.',
          '..=..ooooo..ssss~~~ss...',
          '..===ooooo====sss~~ss...',
          '.....ooooo......sss.....',
          '.....oo.oo..............',
          '..........,,,...........',
          '.........,,,,,..........',
      ],
      overlays=[{'t': 'flowers_white', 'x': 1, 'y': 8}, {'t': 'flowers_violet', 'x': 3, 'y': 11},
                {'t': 'hydrangea_blue', 'x': 9, 'y': 7}, {'t': 'pebbles_0', 'x': 4, 'y': 5}],
      actors=[{'x': 7, 'y': 8}])

scene('dungeon_test', under='stone_floor',
      legend={'f': 'stone_floor', 'p': 'pit', 'i': 'ink', 'm': 'moss', 'w': 'wood_floor', 'r': 'carpet_red',
              'b': 'carpet_blue'},
      ground=[
          'ffffffffffffffffffffffff',
          'ffffffffffffffffffffffff',
          'ffpppppffffffffffiiiifff',
          'ffpppppffmmmfffiiiiiifff',
          'ffpppffffmmmmfffiiiiffff',
          'ffpppfffffmmffffffffffff',
          'ffffffffffffffffffffffff',
          'fffwwwwwwwwwwwwwwwwwwfff',
          'fffwwrrrrrrwwwbbbbbbwfff',
          'fffwwrrrrrrwwwbbbbbbwfff',
          'fffwwrrrwrrwwwbbbbbbwfff',
          'fffwwrrrrrrwwwwwwwwwwfff',
          'fffwwwwwwwwwwwwwwwwwwfff',
          'ffffffffffffffffffffffff',
      ])

scene('cliff_test',
      legend={'.': 'grass', '=': 'dirt', '^': 'cliff_top', '|': 'cliff_face', 'S': 'cliff_stairs_top',
              's': 'cliff_stairs_mid', 'z': 'cliff_stairs_bot', 'L': 'ledge_s_a', 'M': 'ledge_s_m', 'R': 'ledge_s_b',
              '~': 'water', ',': 'tallgrass'},
      ground=[
          '^^^^^^^^^^^^^^^^^^^^^^^^',
          '^^^^^^^^^^^^^^^^^^^^^^^^',
          '^^^^^^^^^^^^^^^^^^^^^^^^',
          '^^^^^^^^||||S|||||^^^^^^',
          '^^^^^^^^||||s|||||^^^^^^',
          '^^^^^^^^....z.....^^^^^^',
          '||||||||...==.....||||||',
          '||||||||....=.....||||||',
          '............=...........',
          '..LMMMMR....=....,,,....',
          '............=...,,,,,...',
          '...........==...........',
          '...~~~~...==............',
          '..~~~~~~..=.............',
      ],
      actors=[{'x': 12, 'y': 7}])

# ------------------------------------------------------------------ Rootbound Archive room
scene('archive_room', under='archive_floor',
      legend={'#': 'archive_top', '|': 'archive_face', '.': 'archive_floor', 'p': 'pit', 'i': 'ink',
              'm': 'moss', 'f': 'stone_floor', 'c': 'carpet_blue'},
      ground=[
          '########################',
          '#||||||||||||||||||||||#',
          '#||||||||||||||||||||||#',
          '#......................#',
          '#......................#',
          '#..........cccc........#',
          '#..........cccc..pppp..#',
          '#..........cccc..pppp..#',
          '#...............ppppp..#',
          '#..iii..........pppp...#',
          '#.iiiii................#',
          '#..iii.............mm..#',
          '#.................mmm..#',
          '########################',
      ],
      overlays=[{'t': 'wall_shelf_l', 'x': 2, 'y': 1}, {'t': 'wall_shelf_m', 'x': 3, 'y': 1},
                {'t': 'wall_shelf_m', 'x': 4, 'y': 1}, {'t': 'wall_shelf_r', 'x': 5, 'y': 1},
                {'t': 'wall_shelf_l', 'x': 15, 'y': 1}, {'t': 'wall_shelf_r', 'x': 16, 'y': 1},
                {'t': 'wall_cracked', 'x': 8, 'y': 1}, {'t': 'plate_up', 'x': 7, 'y': 10},
                {'t': 'switch_on', 'x': 13, 'y': 10}, {'t': 'ink_bridge_h_revealed', 'x': 17, 'y': 8},
                {'t': 'ink_bridge_h_revealed', 'x': 18, 'y': 8}, {'t': 'ink_bridge_h_faint', 'x': 19, 'y': 8},
                {'t': 'ink_bridge_h_faint', 'x': 20, 'y': 8},
                {'t': 'roots_0', 'x': 1, 'y': 3}, {'t': 'roots_1', 'x': 21, 'y': 3}, {'t': 'roots_2', 'x': 9, 'y': 12},
                {'t': 'ink_puddle_0', 'x': 6, 'y': 9}, {'t': 'ink_puddle_1', 'x': 14, 'y': 12}],
      decor=[{'t': 'door_key_closed', 'x': 11, 'y': 2}, {'t': 'stairs_up', 'x': 19, 'y': 2},
             {'t': 'shelf_a', 'x': 2, 'y': 6}, {'t': 'shelf_b', 'x': 5, 'y': 6}, {'t': 'shelf_moving', 'x': 8, 'y': 6},
             {'t': 'candelabra', 'x': 10, 'y': 4}, {'t': 'brazier_lit', 'x': 14, 'y': 4},
             {'t': 'push_block', 'x': 7, 'y': 8}, {'t': 'reading_table', 'x': 19, 'y': 5},
             {'t': 'lantern_pedestal', 'x': 11, 'y': 11}, {'t': 'root_column', 'x': 21, 'y': 10},
             {'t': 'crystal_switch_blue', 'x': 15, 'y': 11}],
      actors=[{'x': 12, 'y': 8}])

# ------------------------------------------------------------------ house interior (hero's home)
scene('house_interior', under='wood_floor',
      legend={'#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'r': 'carpet_red', 'b': 'carpet_blue'},
      ground=[
          '########################',
          '########################',
          '####||||||||||||||||####',
          '####||||||||||||||||####',
          '####................####',
          '####................####',
          '####................####',
          '####......rrrr......####',
          '####......rrrr......####',
          '####......rrrr......####',
          '####................####',
          '####................####',
          '###########..###########',
          '########################',
      ],
      overlays=[{'t': 'window_in_curtain_red', 'x': 9, 'y': 2}, {'t': 'window_in_curtain_red', 'x': 14, 'y': 2},
                {'t': 'in_barrel', 'x': 4, 'y': 10}, {'t': 'in_crate', 'x': 4, 'y': 11}, {'t': 'in_sacks', 'x': 5, 'y': 11},
                {'t': 'in_pot', 'x': 19, 'y': 11}, {'t': 'chair_right', 'x': 11, 'y': 5},
                {'t': 'chair_left', 'x': 14, 'y': 5}],
      decor=[{'t': 'hearth', 'x': 5, 'y': 4}, {'t': 'bed_double', 'x': 17, 'y': 5},
             {'t': 'table_round', 'x': 12, 'y': 5}, {'t': 'shelf_potions', 'x': 15, 'y': 3},
             {'t': 'stairs_in_up', 'x': 18, 'y': 3}],
      actors=[{'x': 11, 'y': 9}])


# ------------------------------------------------------------------ kit tests (not deliverables, QA only)
def _kit_house(x0, y0, color, mat):
    out = []
    for r, dy in (('ridge', 0), ('field', 1), ('eave', 2)):
        out.append({'t': 'roof_%s_%s_l' % (color, r), 'x': x0, 'y': y0 + dy})
        out.append({'t': 'roof_%s_%s_m' % (color, r), 'x': x0 + 1, 'y': y0 + dy})
        out.append({'t': 'roof_%s_%s_m' % (color, r), 'x': x0 + 2, 'y': y0 + dy})
        out.append({'t': 'roof_%s_%s_r' % (color, r), 'x': x0 + 3, 'y': y0 + dy})
    for r, dy in (('top', 3), ('bot', 4)):
        cols = ['l', 'm', 'p', 'r'] if mat == 'timber' else ['l', 'm', 'm', 'r']
        for i, c in enumerate(cols):
            out.append({'t': 'wall_%s_%s_%s' % (mat, r, c), 'x': x0 + i, 'y': y0 + dy})
    return out


_kit = _kit_house(1, 0, 'blue', 'timber') + _kit_house(6, 0, 'green', 'stone')
_kit += [{'t': 'door_arch_closed', 'x': 2, 'y': 3}, {'t': 'window_box_lit', 'x': 3, 'y': 3},
         {'t': 'door_plain_open', 'x': 8, 'y': 3}, {'t': 'window_shutter_dark', 'x': 7, 'y': 3},
         {'t': 'awning_red_l', 'x': 6, 'y': 3}, {'t': 'awning_red_m', 'x': 7, 'y': 3}, {'t': 'awning_red_r', 'x': 8, 'y': 3},
         {'t': 'sign_bakery', 'x': 9, 'y': 3}, {'t': 'banner_blue', 'x': 4, 'y': 3}]
for _x in range(12, 18):
    _kit.append({'t': 'bridge_wood_h_n_%s' % ('l' if _x == 12 else ('r' if _x == 17 else 'm')), 'x': _x, 'y': 9})
    _kit.append({'t': 'bridge_wood_h_s_%s' % ('l' if _x == 12 else ('r' if _x == 17 else 'm')), 'x': _x, 'y': 10})
for _x in range(13, 17):
    _kit.append({'t': 'bridge_wood_h_piles_m', 'x': _x, 'y': 11})
for _y in range(1, 6):
    _r = 'n' if _y == 1 else ('s' if _y == 5 else 'm')
    _kit += [{'t': 'bridge_wood_v_%s_w' % _r, 'x': 20, 'y': _y}, {'t': 'bridge_wood_v_%s_e' % _r, 'x': 21, 'y': _y}]

scene('kit_town',
      legend={'.': 'grass', '=': 'dirt', 'o': 'plaza', '~': 'water', 's': 'sand', 'F': 'fence_wood', 'W': 'wall_low',
              'I': 'fence_iron', 'S': 'stairs_stone_l', 'T': 'stairs_stone_m', 'U': 'stairs_stone_r'},
      ground=[
          '...................~~...',
          '...................~~...',
          '...................~~...',
          '...................~~...',
          '...................~~...',
          'oooooooooooo.......~~...',
          'oooooooooooo....FFF~~...',
          'FFFFF..WWWW.....F..~~...',
          'F...F..W..W..~~~~~~~~...',
          'F...F..WWWW..~~~~~~~~~..',
          'FFFFF........~~~~~~~~~..',
          '..IIIII......~~~~~~~~...',
          '..I...I..STU.ssssssss...',
          '..IIIII..STU............',
      ],
      decor=_kit + [{'t': 'well', 'x': 2, 'y': 9}, {'t': 'market_stall_cloth', 'x': 7, 'y': 12}],
      actors=[{'x': 14, 'y': 10}])

scene('cliff_test2',
      legend={'.': 'grass', '=': 'dirt', '^': 'cliff_top', '|': 'cliff_face', 'S': 'cliff_stairs2_top_l',
              'T': 'cliff_stairs2_top_r', 's': 'cliff_stairs2_mid_l', 't': 'cliff_stairs2_mid_r',
              'z': 'cliff_stairs2_bot_l', 'Z': 'cliff_stairs2_bot_r', 'e': 'ledge_e_m', 'E': 'ledge_e_a',
              'B': 'ledge_e_b', 'w': 'ledge_w_m', ',': 'tallgrass', '~': 'water'},
      ground=[
          '........................',
          '...^^^^^^^^^....,,,.....',
          '...^^^^^^^^^^^..,,,,....',
          '...^^^^^^^^^^^..........',
          '...^^^^^^^^^^^......E...',
          '...^^^^|||^^^^......e...',
          '...^^^^|||^^^^......e...',
          '...||||...||||......B...',
          '...||||...ST||......w...',
          '...||||...st||......w...',
          '..........zZ........w...',
          '..........==............',
          '...~~~~...=.............',
          '..~~~~~~..=.............',
      ],
      actors=[{'x': 10, 'y': 11}])

scene('interior_test', under='wood_floor',
      legend={'#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'x': 'interior_stone_top',
              'y': 'interior_stone_face', 's': 'stone_floor', 'C': 'counter', 'b': 'carpet_blue'},
      ground=[
          '############xxxxxxxxxxxx',
          '#||||||||||#xyyyyyyyyyyx',
          '#||||||||||#xyyyyyyyyyyx',
          '#..........#xssssssssssx',
          '#..CCCCCC..#xssssssssssx',
          '#..C....C..#xssssssssssx',
          '#..........#xssssssssssx',
          '#..bbbbbb..#xssssssssssx',
          '#..bbbbbb..#xssssssssssx',
          '#..........#xssssssssssx',
          '#..........#xssssssssssx',
          '#####..#####xxxxx..xxxxx',
          '########################',
          '########################',
      ],
      overlays=[{'t': 'window_in_curtain_blue', 'x': 3, 'y': 1}, {'t': 'window_in', 'x': 8, 'y': 1},
                {'t': 'in_barrel', 'x': 1, 'y': 3}, {'t': 'in_pot', 'x': 10, 'y': 3}, {'t': 'in_crate', 'x': 13, 'y': 10},
                {'t': 'in_sacks', 'x': 14, 'y': 10}, {'t': 'chair_down', 'x': 5, 'y': 9}, {'t': 'chair_up', 'x': 6, 'y': 10}],
      decor=[{'t': 'shelf_bread', 'x': 4, 'y': 3}, {'t': 'rack_weapons', 'x': 14, 'y': 3},
             {'t': 'table_long', 'x': 16, 'y': 7}, {'t': 'bed_single_red', 'x': 21, 'y': 5},
             {'t': 'rug_round', 'x': 16, 'y': 10}, {'t': 'stairs_in_down', 'x': 20, 'y': 10}],
      actors=[{'x': 6, 'y': 6}])

scene('archive_room2', under='archive_floor',
      legend={'#': 'archive_top', '|': 'archive_face', '.': 'archive_floor', 'p': 'pit', 'i': 'ink', 'c': 'carpet_red'},
      ground=[
          '########################',
          '########################',
          '##||||||||||||||||||||##',
          '##||||||||||||||||||||##',
          '##....................##',
          '##.........cc.........##',
          '##.........cc.........##',
          '##...pppp..cc..pppp...##',
          '##...pppp..cc..pppp...##',
          '##.........cc.........##',
          '##.........cc.........##',
          '##....................##',
          '########################',
          '########################',
      ],
      overlays=[{'t': 'wall_glyph_revealed', 'x': 4, 'y': 2}, {'t': 'wall_glyph_faint', 'x': 19, 'y': 2},
                {'t': 'wall_broken', 'x': 7, 'y': 2},
                {'t': 'plate_down', 'x': 3, 'y': 10}, {'t': 'plate_up', 'x': 20, 'y': 10},
                {'t': 'switch_ink_revealed', 'x': 9, 'y': 11}, {'t': 'switch_ink_faint', 'x': 14, 'y': 11},
                {'t': 'switch_off', 'x': 9, 'y': 4}, {'t': 'ink_bridge_v_revealed', 'x': 6, 'y': 7},
                {'t': 'ink_bridge_v_revealed', 'x': 6, 'y': 8}, {'t': 'ink_bridge_v_faint', 'x': 16, 'y': 7},
                {'t': 'ink_bridge_v_faint', 'x': 16, 'y': 8}],
      decor=[{'t': 'door_boss_closed', 'x': 10, 'y': 3}, {'t': 'door_locked_closed', 'x': 15, 'y': 3},
             {'t': 'stairs_down', 'x': 20, 'y': 6}, {'t': 'brazier_lit', 'x': 9, 'y': 5}, {'t': 'brazier_unlit', 'x': 14, 'y': 5},
             {'t': 'crystal_switch_gold', 'x': 3, 'y': 6}, {'t': 'shelf_wide', 'x': 2, 'y': 4},
             {'t': 'reading_table_long', 'x': 17, 'y': 11}, {'t': 'lantern_pedestal_empty', 'x': 12, 'y': 11},
             {'t': 'door_key_open', 'x': 2, 'y': 3}],
      actors=[{'x': 11, 'y': 9}])

scene('town_overview', legend={'.': 'grass', 'o': 'plaza', '=': 'dirt', 'W': 'wall_low', '~': 'water'},
      ground=[
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '................................',
          '..ooooooooooooooooooooooooooooo.',
          '..ooooooooooooooooooooooooooooo.',
          '..oo.....................oooooo.',
          'WWWWWWWWWW....==....WWWWWWWWWWWW',
          '..............==................',
          '..............==................',
          '..............==................',
      ],
      overlays=[{'t': 'hydrangea_blue', 'x': 6, 'y': 11}, {'t': 'flowers_white', 'x': 8, 'y': 11},
                {'t': 'hydrangea_violet', 'x': 22, 'y': 11}],
      decor=[{'t': 'house_large', 'x': 0, 'y': 8}, {'t': 'library', 'x': 7, 'y': 8},
             {'t': 'smithy', 'x': 18, 'y': 8}, {'t': 'house_medium', 'x': 25, 'y': 8},
             {'t': 'town_gate', 'x': 12, 'y': 12}, {'t': 'lamp_post', 'x': 11, 'y': 10, 'state': 1},
             {'t': 'tree_pine', 'x': 2, 'y': 14}, {'t': 'tree_pine', 'x': 28, 'y': 14}],
      actors=[{'x': 14, 'y': 13, 'dir': 'up'}])

_vb = []
for _x in range(9, 14):
    _p = 'l' if _x == 9 else ('r' if _x == 13 else 'm')
    _vb += [{'t': 'bridge_wood_h_n_' + _p, 'x': _x, 'y': 8}, {'t': 'bridge_wood_h_s_' + _p, 'x': _x, 'y': 9}]
for _x in range(10, 13):
    _vb.append({'t': 'bridge_wood_h_piles_m', 'x': _x, 'y': 10})

scene('valley', legend={'.': 'grass', ',': 'tallgrass', '=': 'dirt', '^': 'cliff_top', '|': 'cliff_face', 's': 'sand',
                        '~': 'water', '-': 'shallow', 'L': 'ledge_s_a', 'M': 'ledge_s_m', 'R': 'ledge_s_b'},
      ground=[
          '^^^^^^^^^^~~~~^^^^^^^^^^',
          '^^^^^^^^^s~~~~s^^^^^^^^^',
          '||||^^^^^s~~~~s^^^^|||||',
          '||||||||ss~~~~s||||||||.',
          '.,,....ss~~~~~ss.......,',
          ',,,,...s~~~~~~s....,,,,,',
          '.,,...ss~~~~~ss.....,,,.',
          '......s~~~~~~s.........,',
          '=====.s~~~~~s.....======',
          '.....=====s=====.==.....',
          '......s~~~~~ss......,,..',
          '..LMMMR.s~~--~s..LMMR...',
          '.......s~~~~~~s.........',
          '....,,.ss~~~~~ss...,,,..',
      ],
      overlays=[{'t': 'flowers_yellow', 'x': 3, 'y': 6}, {'t': 'flowers_white', 'x': 18, 'y': 6},
                {'t': 'pebbles_0', 'x': 16, 'y': 12}, {'t': 'flowers_violet', 'x': 1, 'y': 9}],
      decor=_vb + [{'t': 'tree_pine', 'x': 21, 'y': 4}, {'t': 'tree_pine', 'x': 1, 'y': 12},
                   {'t': 'bush', 'x': 17, 'y': 9}, {'t': 'prop_milestone', 'x': 15, 'y': 7}],
      actors=[{'x': 11, 'y': 9, 'dir': 'right'}])


# W5-art: the ink pool (3 animation frames via "frame"), faint and revealed hidden-ink bridges, ink switches,
# glyphs and the push block together (python compose.py ink_test; edit 'frame' for frames 1 and 2)
scene('ink_test', under='archive_floor', frame=0,
      legend={'#': 'archive_top', '|': 'archive_face', '.': 'archive_floor', 'p': 'pit', 'i': 'ink', 'm': 'moss',
              'c': 'carpet_red'},
      ground=[
          '########################',
          '########################',
          '##||||||||||||||||||||##',
          '##||||||||||||||||||||##',
          '##....................##',
          '##..iiii......ppp.....##',
          '##..iiiii.....ppp.....##',
          '##...iiiii....ppp.....##',
          '##....iiii............##',
          '##....................##',
          '##..iiiiiiiiiiiiiii...##',
          '##..iiiiiiiiiiiiiii...##',
          '##....................##',
          '########################',
      ],
      overlays=[{'t': 'ink_bridge_h_faint', 'x': 6, 'y': 10}, {'t': 'ink_bridge_h_faint', 'x': 7, 'y': 10},
                {'t': 'ink_bridge_h_faint', 'x': 8, 'y': 10},
                {'t': 'ink_bridge_h_revealed', 'x': 13, 'y': 10}, {'t': 'ink_bridge_h_revealed', 'x': 14, 'y': 10},
                {'t': 'ink_bridge_h_revealed', 'x': 15, 'y': 10},
                {'t': 'ink_bridge_v_revealed', 'x': 15, 'y': 5}, {'t': 'ink_bridge_v_revealed', 'x': 15, 'y': 6},
                {'t': 'ink_bridge_v_revealed', 'x': 15, 'y': 7},
                {'t': 'switch_ink_faint', 'x': 11, 'y': 6}, {'t': 'switch_ink_revealed', 'x': 11, 'y': 8},
                {'t': 'switch_off', 'x': 20, 'y': 6}, {'t': 'plate_up', 'x': 20, 'y': 8},
                {'t': 'wall_glyph_faint', 'x': 5, 'y': 2}, {'t': 'wall_glyph_revealed', 'x': 18, 'y': 2},
                {'t': 'ink_puddle_0', 'x': 3, 'y': 9}, {'t': 'ink_puddle_1', 'x': 19, 'y': 11}],
      decor=[{'t': 'push_block', 'x': 18, 'y': 5}, {'t': 'push_block', 'x': 18, 'y': 8},
             {'t': 'brazier_lit', 'x': 10, 'y': 4}, {'t': 'shelf_a', 'x': 2, 'y': 4}, {'t': 'pillar', 'x': 21, 'y': 4},
             {'t': 'stairs_down', 'x': 20, 'y': 3}, {'t': 'reading_table', 'x': 12, 'y': 4}],
      actors=[{'x': 17, 'y': 8, 'dir': 'right'}, {'x': 10, 'y': 10, 'dir': 'down'}])
