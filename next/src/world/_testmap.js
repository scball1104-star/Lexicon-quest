// Scratch maps for building and testing the field before W2-maps' real maps land (DESIGN 5.1 format plus the
// conventions in docs/WORLD.md). Three maps: a riverside town corner with the gate, the hero's home interior
// and a two-room Archive floor with every mechanism. Ids start with an underscore so they never collide
// with COMMON.md map ids. Kept after launch as the fixture for qa/world tests.

const row = (s) => s;

export const TEST_TOWN = {
  id: '_testtown', name: 'Test Town', area: 'town', music: 'willowmere', ambience: 'river_birds', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'grass',
  start: { x: 12, y: 18, dir: 'down' },
  legend: { '.': 'grass', ',': 'tallgrass', '=': 'dirt', 'o': 'plaza', 's': 'sand', '~': 'water', '-': 'shallow',
    '^': 'cliff_top', '|': 'cliff_face', 'S': 'cliff_stairs_top', 'm': 'cliff_stairs_mid', 'z': 'cliff_stairs_bot',
    'L': 'ledge_s_a', 'M': 'ledge_s_m', 'R': 'ledge_s_b', 'F': 'fence_wood', 'W': 'wall_low' },
  ground: [
    row('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'),
    row('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'),
    row('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'),
    row('||||||||||||||||||S|||||||||||||||||'),
    row('||||||||||||||||||m|||||||||||||||||'),
    row('..................z........s~~~~s...'),
    row('.........................LMR.s~~~~s.'),
    row('...........................s~~~~s...'),
    row('..........................,s~~~~s...'),
    row('.........................,,s~~~~s,..'),
    row('.........................,,s~~~~s,,.'),
    row('...........................s~~~~s,..'),
    row('.==========================s~~~~s...'),
    row('ooooooooooooooooooooooooooo=~~~~===='),
    row('ooooooooooooooooooooooooooo=~~~~===='),
    row('....oooooooooooooooooo.....s~~~~s...'),
    row('....oooooooooooooooooo.....s~~~~s...'),
    row('....oooooooooooooooooo....,s~~~~s...'),
    row('....oooooooooooooooooo.....s~~--s...'),
    row('....oooooooooooooooooo.....s~---s...'),
    row('............==.............s~~--s...'),
    row('............==.............s~~~~s...'),
    row('..FFFFFFFF..==..FFFFFFFFF..s~~~~s...'),
    row('............==.............s~~~~s...'),
    row('............==.............s~~~~s...'),
    row('............==.............s~~~~s...'),
  ],
  overlays: [
    { t: 'hydrangea_violet', x: 2, y: 15 }, { t: 'flowers_white', x: 3, y: 15 }, { t: 'hydrangea_blue', x: 2, y: 16 },
    { t: 'flowers_yellow', x: 23, y: 16 }, { t: 'hydrangea_blue', x: 24, y: 17 }, { t: 'flowers_pink', x: 1, y: 19 },
    { t: 'flowers_violet', x: 23, y: 19 }, { t: 'pebbles_1', x: 26, y: 9 }, { t: 'tuft_0', x: 6, y: 20 },
    { t: 'flowers_white', x: 34, y: 6 }, { t: 'leaves', x: 20, y: 8 }, { t: 'pebbles_0', x: 33, y: 9 },
    { t: 'flowers_red', x: 15, y: 8 }, { t: 'tuft_1', x: 22, y: 21 }, { t: 'flowers_blue', x: 34, y: 20 },
  ],
  decor: [
    { t: 'hero_home', x: 1, y: 11 }, { t: 'bakery', x: 8, y: 11 }, { t: 'inn', x: 15, y: 11 },
    { t: 'tree_willow', x: 24, y: 9 }, { t: 'tree_willow', x: 2, y: 19 }, { t: 'tree_willow', x: 23, y: 20 },
    { t: 'tree_pine', x: 34, y: 8 }, { t: 'bush', x: 33, y: 16 }, { t: 'bush', x: 23, y: 7 },
    { t: 'lamp_post', x: 7, y: 13, state: 1 }, { t: 'lamp_post', x: 20, y: 13, state: 1 }, { t: 'lamp_post', x: 11, y: 20, state: 1 },
    { t: 'bench', x: 16, y: 17 }, { t: 'well', x: 12, y: 16 }, { t: 'hedge_flowers', x: 4, y: 18 },
    { t: 'town_gate', x: 10, y: 24 }, { t: 'arch_ruin', x: 33, y: 17 },
    { t: 'bridge_stone_h_n_l', x: 27, y: 13 }, { t: 'bridge_stone_h_n_m', x: 28, y: 13, w: 4 }, { t: 'bridge_stone_h_n_r', x: 32, y: 13 },
    { t: 'bridge_stone_h_s_l', x: 27, y: 14 }, { t: 'bridge_stone_h_s_m', x: 28, y: 14, w: 4 }, { t: 'bridge_stone_h_s_r', x: 32, y: 14 },
    { t: 'bridge_stone_h_arch_m', x: 28, y: 15, w: 4 },
    { t: 'signpost_arrow', x: 33, y: 12 }, { t: 'market_stall_fruit', x: 18, y: 16 },
  ],
  events: [
    { id: 'mael', type: 'npc', x: 14, y: 17, dir: 'down' },
    { id: 'tess', type: 'npc', x: 15, y: 21, dir: 'down' },
    { id: 'wick', type: 'npc', x: 5, y: 17, dir: 'right' },
    { id: 'lark', type: 'npc', x: 6, y: 18, dir: 'left' },
    { id: 'loaf', type: 'npc', x: 7, y: 11, dir: 'down' },
    { id: 'the_duke', type: 'npc', x: 25, y: 17, dir: 'left' },
    { id: 'edda', type: 'npc', x: 22, y: 9, dir: 'down' },
    { id: 'bram', type: 'npc', x: 9, y: 23, dir: 'up' },
    { id: 'holt', type: 'npc', x: 16, y: 23, dir: 'up' },
    { id: 'door_home', type: 'door', x: 3, y: 11, to: ['_testhome', 6, 7, 'up'], kind: 'door' },
    { id: 'door_bakery', type: 'door', x: 11, y: 11, to: ['_testhome', 7, 7, 'up'], kind: 'door' },
    { id: 'door_inn', type: 'door', x: 19, y: 11, to: ['_testhome', 7, 7, 'up'], kind: 'door' },
    { id: 'stairs_archive', type: 'door', x: 34, y: 17, to: ['_testdungeon', 24, 13, 'down'], kind: 'stairs' },
    { id: 'sign_square', type: 'sign', x: 5, y: 16, text: 'sign_square', sprite: 'signpost' },
    { id: 'sign_bakery', type: 'sign', x: 11, y: 10, text: 'sign_bakery', tile: 'sign_bakery', fade: 'shop' },
    { id: 'sign_inn', type: 'sign', x: 18, y: 10, text: 'sign_inn', tile: 'sign_inn', fade: 'inn' },
    { id: 'town_sign', type: 'sign', x: 12, y: 23, text: 'town_sign', fade: 'gate', dir: 'up' },
    { id: 'well', type: 'sign', x: 12, y: 16, text: 'well' },
    { id: 'chest_1', type: 'chest', x: 34, y: 6, tier: 'wood', item: 'potion', qty: 2 },
    { id: 'chest_2', type: 'chest', x: 26, y: 20, tier: 'iron' },
    { id: 'duck_nest', type: 'object', x: 26, y: 18, sprite: 'bush', script: 'duck_nest' },
    { id: 'trig_fading', type: 'trigger', x: 3, y: 12, script: 'fading_sign' },
    { id: 'trig_gate_inner', type: 'trigger', x: 12, y: 22, w: 2, h: 1, script: 'south_gate' },
    { id: 'trig_leave', type: 'trigger', x: 12, y: 24, w: 2, h: 1, script: 'leave_town' },
    { id: 'trig_return', type: 'trigger', x: 0, y: 0, script: 'return_to_willowmere', on: 'enter' },
    { id: 'slime_a', type: 'enemy', x: 34, y: 10, sprite: 'ink_slime', encounter: 'valley_slimes', move: 'wander', radius: 3 },
    { id: 'wolf_a', type: 'enemy', x: 34, y: 21, sprite: 'briar_wolf', encounter: 'valley_wolves', move: 'chase', radius: 4 },
    { id: 'ferry', type: 'ferry', x: 33, y: 13, text: 'ferry_landing', rideIf: 'nella_bell_done', to: ['_testtown', 12, 18, 'down'] },
  ],
  exits: [
    { x: 12, y: 25, w: 2, h: 1, to: ['_testdungeon', 24, 13, 'down'] },
    { x: 35, y: 13, w: 1, h: 2, to: ['_testtown', 1, 13, 'right'] },
  ],
  marks: {
    home_door: [3, 12], bakery_sign: [11, 10], bakery_door: [11, 12], well: [12, 17], bell_tower: [18, 4],
    gate_inner: [12, 22], town_sign: [12, 21], return_spot: [12, 19], meet_holt: [12, 20],
    gather_garrick: [2, 13], meet_garrick: [10, 18], gather_iris: [24, 13], meet_iris: [14, 18],
    gather_oren: [11, 12], meet_oren: [11, 18], gather_hazel: [3, 12], meet_hazel: [13, 18], gather_mael: [20, 13], meet_mael: [12, 17],
  },
};

export const TEST_HOME = {
  id: '_testhome', name: 'Test Home', area: 'interior', music: null, ambience: null, tileset: 'interior',
  lighting: { tint: 'dawn', dark: 0 },
  under: 'wood_floor',
  start: { x: 4, y: 3, dir: 'down' },
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'r': 'carpet_red' },
  ground: [
    row('##############'),
    row('#||||||||||||#'),
    row('#||||||||||||#'),
    row('#............#'),
    row('#............#'),
    row('#....rrrr....#'),
    row('#....rrrr....#'),
    row('#............#'),
    row('######..######'),
    row('##############'),
  ],
  overlays: [
    { t: 'window_in_curtain_red', x: 2, y: 1 }, { t: 'window_in', x: 12, y: 1 },
    { t: 'in_barrel', x: 1, y: 7 }, { t: 'in_crate', x: 2, y: 7 }, { t: 'in_pot', x: 12, y: 7 },
    { t: 'chair_right', x: 9, y: 5 }, { t: 'chair_left', x: 12, y: 5 },
  ],
  decor: [
    { t: 'bed_single', x: 4, y: 3 }, { t: 'hearth', x: 8, y: 3 }, { t: 'table_round', x: 10, y: 5 },
    { t: 'shelf_potions', x: 1, y: 3 }, { t: 'bookshelf', x: 11, y: 3 },
  ],
  events: [
    { id: 'hazel', type: 'npc', x: 9, y: 5, dir: 'down' },
    { id: 'door_out', type: 'door', x: 6, y: 8, w: 2, h: 1, to: ['_testtown', 3, 12, 'down'], kind: 'door' },
    { id: 'home_bookshelf', type: 'book', x: 11, y: 3, book: 'tales_of_the_keepers' },
    { id: 'home_hearth', type: 'sign', x: 9, y: 3, text: 'home_hearth' },
    { id: 'home_window', type: 'sign', x: 12, y: 2, text: 'home_window' },
    { id: 'trig_wake', type: 'trigger', x: 0, y: 0, script: 'wake_up', on: 'enter' },
  ],
  exits: [],
  marks: { bed: [4, 3], bedside: [5, 4], hazel_start: [9, 5] },
};

export const TEST_DUNGEON = {
  id: '_testdungeon', name: 'Test Archive', area: 'dungeon', music: 'archive', ambience: 'archive_hush', tileset: 'archive',
  lighting: { tint: 'none', dark: 0.72, lights: [{ x: 10, y: 4, r: 44 }] },
  under: 'archive_floor',
  start: { x: 24, y: 13, dir: 'down' },
  pitTo: ['_testdungeon', 3, 15, 'down'],
  legend: { '#': 'archive_top', '|': 'archive_face', '.': 'archive_floor', 'p': 'pit', 'i': 'ink', 'm': 'moss', 'c': 'carpet_blue' },
  ground: [
    row('##############################'),
    row('##############################'),
    row('#||||||||||||||||||||||||||||#'),
    row('#||||||||||||||||||||||||||||#'),
    row('#..........#.........pppp....#'),
    row('#..........#.........pppp....#'),
    row('#..........#..iiiii..........#'),
    row('#..........#..iiiii..........#'),
    row('#..........#..iiiii..........#'),
    row('#............................#'),
    row('####################.#########'),
    row('#||||||||||||||||||||||||||||#'),
    row('#||||||||||||||||||||||||||||#'),
    row('#............................#'),
    row('#............................#'),
    row('#............mmm.............#'),
    row('#............mmm.............#'),
    row('#............................#'),
    row('#............................#'),
    row('#............................#'),
    row('##############################'),
    row('##############################'),
  ],
  overlays: [
    { t: 'wall_shelf_l', x: 2, y: 2 }, { t: 'wall_shelf_m', x: 3, y: 2 }, { t: 'wall_shelf_m', x: 4, y: 2 }, { t: 'wall_shelf_r', x: 5, y: 2 },
    { t: 'wall_glyph_faint', x: 16, y: 2 }, { t: 'wall_cracked', x: 26, y: 2 },
    { t: 'wall_shelf_l', x: 14, y: 11 }, { t: 'wall_shelf_r', x: 15, y: 11 },
    { t: 'ink_bridge_h_faint', x: 14, y: 7 }, { t: 'ink_bridge_h_faint', x: 15, y: 7 }, { t: 'ink_bridge_h_faint', x: 16, y: 7 },
    { t: 'ink_bridge_h_faint', x: 17, y: 7 }, { t: 'ink_bridge_h_faint', x: 18, y: 7 },
    { t: 'roots_0', x: 1, y: 9 }, { t: 'roots_1', x: 27, y: 4 }, { t: 'roots_2', x: 20, y: 19 }, { t: 'ink_puddle_0', x: 9, y: 8 },
    { t: 'ink_puddle_1', x: 24, y: 17 },
  ],
  decor: [
    { t: 'shelf_a', x: 2, y: 5 }, { t: 'shelf_b', x: 5, y: 5 }, { t: 'reading_table', x: 25, y: 8 },
    { t: 'candelabra', x: 10, y: 4 }, { t: 'root_column', x: 27, y: 9 }, { t: 'reading_table_long', x: 16, y: 13 },
    { t: 'shelf_wide', x: 24, y: 19 }, { t: 'candelabra', x: 8, y: 13 },
  ],
  events: [
    { id: 'stairs_out', type: 'door', x: 24, y: 12, to: ['_testtown', 34, 18, 'down'], kind: 'stairs', sprite: 'stairs_up' },
    { id: 'door_a', type: 'locked_door', x: 6, y: 12, key: 'archive_key', sprite: 'door_key', to: ['_testdungeon', 20, 10, 'up'] },
    { id: 'door_a_back', type: 'door', x: 20, y: 10, to: ['_testdungeon', 6, 13, 'down'], kind: 'door' },
    { id: 'gate_b', type: 'gate', x: 12, y: 12, sprite: 'door_locked', state: 'closed' },
    { id: 'block_b', type: 'block', x: 10, y: 16 },
    { id: 'plate_b', type: 'plate', x: 14, y: 18, target: 'gate_b' },
    { id: 'switch_b', type: 'switch', x: 20, y: 18, target: 'shelf_b', state: 'off', kind: 'floor' },
    { id: 'shelf_b', type: 'shelf', x: 21, y: 15, sprite: 'shelf_moving', positions: [[21, 15], [21, 18]], state: 0 },
    { id: 'crystal_b', type: 'switch', x: 4, y: 18, kind: 'crystal', sprite: 'crystal_switch_blue', state: 'off', target: [] },
    { id: 'chest_key', type: 'chest', x: 3, y: 14, tier: 'iron', item: 'archive_key', qty: 1 },
    { id: 'pot_1', type: 'pot', x: 26, y: 13, item: 'potion' }, { id: 'pot_2', type: 'pot', x: 27, y: 13 }, { id: 'pot_3', type: 'pot', x: 27, y: 14, gold: 12 },
    { id: 'chest_hidden', type: 'chest', x: 28, y: 13, tier: 'gold' },
    { id: 'brazier_1', type: 'brazier', x: 18, y: 14, lit: false }, { id: 'brazier_2', type: 'brazier', x: 27, y: 18, lit: false },
    { id: 'font_b', type: 'font', x: 2, y: 18, sprite: 'rune_shrine' },
    { id: 'pedestal', type: 'object', x: 26, y: 7, sprite: 'lantern_pedestal', script: 'lantern_get', ifNot: 'lantern_get' },
    { id: 'pedestal_empty', type: 'object', x: 26, y: 7, sprite: 'lantern_pedestal_empty', text: 'reading_desk', if: 'lantern_get' },
    { id: 'glyph', type: 'sign', x: 16, y: 3, text: 'hidden_ink_1', hiddenInk: true },
    { id: 'drawers', type: 'sign', x: 3, y: 3, text: 'catalog_drawers' },
    { id: 'mite_b', type: 'enemy', x: 26, y: 17, sprite: 'bookmite', encounter: 'f1_mites', move: 'wander', radius: 2 },
    { id: 'wraith_b', type: 'enemy', x: 5, y: 16, sprite: 'page_wraith', encounter: 'f1_wraith', move: 'patrol', path: ['right', 'right', 'right', 'down', 'left', 'left', 'left', 'up'] },
    { id: 'slime_a', type: 'enemy', x: 8, y: 7, sprite: 'ink_slime', encounter: 'f1_slimes', move: 'chase' },
    { id: 'golem_a', type: 'enemy', x: 22, y: 8, sprite: 'tome_golem', encounter: 'f1_mixed', move: 'guard' },
    { id: 'trig_bell', type: 'trigger', x: 13, y: 9, w: 3, h: 1, script: 'archive_f1_bell' },
    { id: 'trig_arrive', type: 'trigger', x: 0, y: 0, script: 'archive_f1_arrival', on: 'enter' },
    { id: 'echo_warden', type: 'actor', x: 24, y: 6, sprite: 'echo_warden', dir: 'down', ifNot: 'echo_warden_defeated' },
    { id: 'trig_warden', type: 'trigger', x: 22, y: 9, w: 5, h: 1, script: 'echo_warden' },
  ],
  exits: [],
  marks: { catalog_drawer: [3, 4], lantern_pedestal: [26, 8], echo_warden: [24, 6] },
};

// ------------------------------------------------------------------------------------------------ Episode 2
// E2-world fixtures for the silverglass beams, bridges, receptors, sliding mirrors, mirror and fog doors,
// reflections, mist, flag-gated overlays and conditional music / tint (qa/world/e2_*.test.mjs, fieldlab shots).
// `_testcourt`: room A (x 1-13) holds the moon window `src_a` shining south onto mirror `m1`; turned to '\' the
// beam crosses the glass slot at (14,8), lights the bridge over the chasm (x 16-19, row 8) and the receptor `r1`,
// which opens the glass gate `g1` in room B's north face. `mh` (heavy) and `mp` (push) test sliding mirrors.
const courtRows = () => {
  const out = [];
  out.push('#'.repeat(30), '#'.repeat(30), '#' + '|'.repeat(28) + '#', '#' + '|'.repeat(28) + '#');
  for (let y = 4; y <= 13; y++) {
    const mid = y === 8 ? 'S' : y === 11 ? '.' : '#';
    out.push('#' + '.'.repeat(13) + mid + '.' + 'pppp' + '.'.repeat(9) + '#');
  }
  out.push('#'.repeat(30), '#'.repeat(30));
  return out;
};
export const TEST_COURT = {
  id: '_testcourt', name: 'Test Court', area: 'dungeon', music: 'archive', ambience: null, tileset: 'court',
  lighting: { tint: 'none', dark: 0 },
  under: 'glass_floor',
  start: { x: 6, y: 11, dir: 'up' },
  legend: { '#': 'court_top', '|': 'court_face', '.': 'glass_floor', 'p': 'pit', 'S': 'glass_slot' },
  ground: courtRows(),
  overlays: [
    { t: 'glass_bridge_h_dim', x: 16, y: 8 }, { t: 'glass_bridge_h_dim', x: 17, y: 8 },
    { t: 'glass_bridge_h_dim', x: 18, y: 8 }, { t: 'glass_bridge_h_dim', x: 19, y: 8 },
    { t: 'inlay_v', x: 24, y: 7, inlay: 'r1' }, { t: 'inlay_v', x: 24, y: 6, inlay: 'r1' }, { t: 'inlay_v', x: 24, y: 5, inlay: 'r1' },
    { t: 'inlay_corner_se', x: 24, y: 4, inlay: 'r1' },
    { t: 'chalk_crown', x: 6, y: 13, if: '_test_gated' },
  ],
  decor: [],
  pitTo: ['_testcourt', 15, 9, 'down'],
  events: [
    { id: 'src_a', type: 'beam', x: 4, y: 3, dir: 'down', sprite: 'beam_window' },
    { id: 'm1', type: 'mirror', x: 4, y: 8, state: 0, text: 'court_lens' },
    { id: 'r1', type: 'receptor', x: 24, y: 8, face: 'left', target: 'g1', latch: true, flag: '_test_r1_lit' },
    { id: 'g1', type: 'gate', x: 22, y: 3, w: 2, sprite: 'door_glass', state: 'closed' },
    { id: 'mh', type: 'mirror', x: 8, y: 10, state: 0, heavy: true },
    { id: 'mp', type: 'mirror', x: 11, y: 12, state: 1, push: true },
    { id: 'mirror_d', type: 'door', kind: 'mirror', sprite: 'mirror_tall', x: 26, y: 12, to: ['_testmere', 20, 7, 'down'], if: 'mirror_sigil_get' },
  ],
  exits: [],
  marks: { window: [4, 4], bridge: [17, 8], receptor: [24, 8], gate: [22, 4] },
};
/** The same room in the dark (F3's west wing): the beam is the light. */
export const TEST_COURT_DARK = { ...TEST_COURT, id: '_testcourt_dark', lighting: { tint: 'none', dark: 0.6 }, pitTo: ['_testcourt_dark', 15, 9, 'down'],
  events: TEST_COURT.events.map((e) => (e.id === 'mirror_d' ? { ...e, to: ['_testmere', 20, 7, 'down'] } : e)) };

// `_testmere`: a shore on the mere (reflective water), the fountain with its crowd (Hollow faces show none until
// nh_restored), mist over the east half, a fog loop door, the Keeper mirror back to the court, a gated sign.
const mereRows = () => {
  const out = [];
  for (let y = 0; y < 18; y++) {
    if (y < 4) out.push('~'.repeat(30));
    else if (y === 4) out.push('ssssssssssssssssssssssssssssss');
    else if (y < 13) out.push('..' + 'oooooooooooooooooooo' + '........');
    else if (y === 13) out.push('ssssssssss' + 'oooooooooooo' + '........');
    else out.push('~~~~~~~~~s' + '.'.repeat(20));
  }
  return out;
};
export const TEST_MERE = {
  id: '_testmere', name: 'Test Mere', area: 'town', ambience: null, tileset: 'town',
  music: [{ if: 'nh_restored', id: 'triumph' }, { id: 'mystery' }],
  lighting: { tint: [{ if: 'nh_restored', id: 'none' }, { id: 'hollow_dusk' }], dark: 0 },
  under: 'grass',
  start: { x: 10, y: 6, dir: 'up' },
  legend: { '.': 'grass', 'o': 'plaza', 's': 'sand', '~': 'mere_water' },
  ground: mereRows(),
  overlays: [
    { t: 'sign_blank', x: 3, y: 9, ifNot: 'nh_restored' }, { t: 'sign_hollow_inn', x: 3, y: 9, if: 'nh_restored' },
    { t: 'bridge_wood_v_m_w', x: 12, y: 3, if: '_test_bridge' }, { t: 'bridge_wood_v_m_e', x: 13, y: 3, if: '_test_bridge' },
  ],
  decor: [{ t: 'fountain', x: 12, y: 11 }, { t: 'lamp_post', x: 9, y: 9 }, { t: 'lamp_post', x: 18, y: 9 }],
  ambientFx: [{ fx: 'mist', area: { x: 20, y: 0, w: 10, h: 18 } }],
  events: [
    { id: 'nh_crowd_a', type: 'actor', x: 12, y: 12, sprite: 'npc_old_woman', dir: 'up' },
    { id: 'nh_crowd_b', type: 'actor', x: 15, y: 12, sprite: 'npc_farmer', dir: 'up' },
    { id: 'stranger', type: 'actor', x: 7, y: 6, sprite: 'npc_shopkeeper', dir: 'down' },
    { id: 'fog_a', type: 'door', kind: 'fog', x: 26, y: 14, to: ['_testmere', 22, 16, 'up'] },
    { id: 'mirror_back', type: 'door', kind: 'mirror', sprite: 'mirror_tall', x: 20, y: 6, to: ['_testcourt', 25, 12, 'down'], if: 'mirror_sigil_get' },
  ],
  exits: [],
  marks: { fountain_view: [13, 12], pond: [5, 13], mirror_in: [20, 7] },
};

export const TEST_MAPS = { _testtown: TEST_TOWN, _testhome: TEST_HOME, _testdungeon: TEST_DUNGEON,
  _testcourt: TEST_COURT, _testcourt_dark: TEST_COURT_DARK, _testmere: TEST_MERE };
export default TEST_MAPS;
