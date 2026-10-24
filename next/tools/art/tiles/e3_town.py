"""E3-tiles preview scenes, part 2: Emberpeak's Bellows Square and the contact sheets (imported by e3_scenes.py)."""


def scenes(base):
    S = {}
    g = [['.'] * 30 for _ in range(22)]
    for y in range(8, 13):
        for x in range(9, 21):
            g[y][x] = 'p'
    for y in range(13, 22):
        for x in (17, 18):
            g[y][x] = 'p'
    for y in (13, 14):
        for x in range(0, 30):
            g[y][x] = 'p'
    decor = [
        {'t': 'bell_tower_ember', 'x': 1, 'y': 10, 'state': 0},
        {'t': 'bellhouse', 'x': 9, 'y': 7},
        {'t': 'house_ember_b', 'x': 16, 'y': 7},
        {'t': 'house_ember_a', 'x': 24, 'y': 6},
        {'t': 'shop_vent', 'x': 3, 'y': 19},
        {'t': 'smithy_ember', 'x': 10, 'y': 19},
        {'t': 'inn_coal', 'x': 21, 'y': 19},
        {'t': 'memorial', 'x': 12, 'y': 10},
        {'t': 'coolant_station', 'x': 17, 'y': 11},
        {'t': 'proclamation_board', 'x': 9, 'y': 11},
        {'t': 'ember_pit', 'x': 11, 'y': 12}, {'t': 'ember_pit', 'x': 20, 'y': 12},
        {'t': 'lamp_ember', 'x': 8, 'y': 13}, {'t': 'lamp_ember', 'x': 21, 'y': 13},
        {'t': 'bench_iron', 'x': 14, 'y': 12},
        {'t': 'charred_pine', 'x': 28, 'y': 12}, {'t': 'charred_stump', 'x': 29, 'y': 15},
    ]
    ov = [{'t': 'ash_drift_a', 'x': 6, 'y': 15}, {'t': 'ash_drift_b', 'x': 7, 'y': 16},
          {'t': 'ash_drift_c', 'x': 14, 'y': 15}, {'t': 'ash_drift_a', 'x': 26, 'y': 16},
          {'t': 'ash_drift_b', 'x': 5, 'y': 9}, {'t': 'ash_drift_c', 'x': 22, 'y': 10}]
    S['ember_town'] = {
        'name': 'ember_town', 'legend': {'.': 'ash_ground', 'p': 'cinder_path'},
        'ground': [''.join(r) for r in g], 'under': 'ash_ground', 'frame': 0, 'decor': decor, 'overlays': ov,
        'px_overlays': [('memorial_plate_soft', 12 * 16 + 8, 8 * 16 + 10),
                        ('memorial_plate_flat', 12 * 16 + 32, 8 * 16 + 10)],
        'actors': [{'x': 14, 'y': 13, 'dir': 'up'}], 'map_id': None}
    S['ember_town_ringing'] = dict(
        S['ember_town'], name='ember_town_ringing',
        decor=[dict(d, state=1) if d['t'] == 'bell_tower_ember' else d for d in decor],
        px_overlays=[('memorial_plate_soft_lettered', 12 * 16 + 8, 8 * 16 + 10),
                     ('memorial_plate_flat_lettered', 12 * 16 + 32, 8 * 16 + 10)])

    def lineup(name, floor, W, H, rows):
        gg = [['.'] * W for _ in range(H)]
        return {'name': name, 'legend': {'.': floor}, 'ground': [''.join(r) for r in gg], 'under': floor, 'frame': 0,
                'decor': rows, 'overlays': [], 'actors': [], 'map_id': None}
    f_rows = []
    x = 1
    for oid, st, w in [('spout_wall', None, 2), ('spout_cistern', None, 2), ('sluice', 0, 2), ('sluice', 1, 2),
                       ('basin', 0, 2), ('basin', 1, 2), ('waterwheel', 0, 3), ('waterwheel', 1, 3),
                       ('ore_crate', None, 2), ('anvil_oath', 0, 2), ('anvil_oath', 1, 2), ('ledger_burned', None, 2),
                       ('pipes_h', None, 2), ('pipes_v', None, 2), ('pipes_elbow', None, 2), ('pipes_valve', None, 2)]:
        d = {'t': oid, 'x': x, 'y': 3}
        if st is not None:
            d['state'] = st
        f_rows.append(d)
        x += w
    x = 1
    for oid, w in [('hot_grate_closed', 3), ('hot_grate_open', 3), ('ore_lift_closed', 3), ('ore_lift_open', 3),
                   ('font_cistern', 3), ('furnace_mouth', 3), ('bellows_decor', 3), ('tool_rack', 3)]:
        f_rows.append({'t': oid, 'x': x, 'y': 7})
        x += w
    x = 1
    for st in range(5):
        f_rows.append({'t': 'bell_gate', 'x': x, 'y': 12, 'state': st})
        x += 4
    f_rows.append({'t': 'door_crucible', 'x': x, 'y': 12, 'state': 0})
    f_rows.append({'t': 'door_crucible', 'x': x + 4, 'y': 12, 'state': 1})
    S['forge_contact'] = lineup('forge_contact', 'foundry_floor', 32, 15, f_rows)
    S['forge_contact_big'] = lineup('forge_contact_big', 'foundry_floor', 26, 8, [
        {'t': 'heartforge', 'x': 1, 'y': 5, 'state': 0}, {'t': 'heartforge', 'x': 8, 'y': 5, 'state': 1},
        {'t': 'fan_great', 'x': 15, 'y': 5, 'state': 0}, {'t': 'fan_great', 'x': 19, 'y': 5, 'state': 2}])
    e_rows = []
    x = 1
    for oid, w in [('sand_milestone', 2), ('carters_fire', 2), ('lamp_ember', 2), ('ember_pit', 2), ('charred_stump', 2),
                   ('coolant_station', 3), ('proclamation_board', 3), ('bench_iron', 3), ('cart_penny', 4)]:
        e_rows.append({'t': oid, 'x': x, 'y': 3})
        x += w
    e_rows.append({'t': 'charred_pine', 'x': x + 1, 'y': 5})
    e_rows += [{'t': 'foundry_gate_closed', 'x': 1, 'y': 10}, {'t': 'foundry_gate_open', 'x': 7, 'y': 10},
               {'t': 'memorial', 'x': 14, 'y': 10}, {'t': 'shelter_ruin', 'x': 20, 'y': 10}]
    S['ember_contact'] = lineup('ember_contact', 'ash_ground', 30, 12, e_rows)
    S['ember_contact']['px_overlays'] = [('memorial_plate_soft', 14 * 16 + 8, 8 * 16 + 10),
                                         ('memorial_plate_flat_lettered', 14 * 16 + 32, 8 * 16 + 10)]
    return S
