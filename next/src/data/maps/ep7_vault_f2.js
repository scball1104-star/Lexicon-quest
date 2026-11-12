// The Frostbound Vault, II: The Hall of Borrowed Light (40 x 30, dungeon, roofed, dark 0.45). EPISODE7_PLAN 4.7, 4.10 and 5.1;
// exact cells and the solution in docs/MAPS_EP7_B.md. A long dark hall of letter-stone platforms over the fade. The only light
// is borrowed: a lamp pool burns over every held stone (the field system draws it from the held set), so the dark itself
// shows what the party holds. The inversion: the floor starts with Dagny held (`start: ['d']`, the Phantom's grip), and her
// frost door D shuts the arch out of the hall. The way on is to let her go.
//
//   A  Stair Foot (x 2..10, rows 23..27): arrival (6,26) by the lift from floor I's balcony (lift_down 3,23 goes back), the
//      font font_v2 (8..9,24). North through the gap (5..6,22) into the hall.
//   B  The Grip (the hall x 2..14, rows 12..21; the arch D at 15,16..17 in its east wall): Hakon's stone (11,17) and Runa's
//      (14,15), with Dagny's own (14,18) lit beside the arch. Read both and Dagny, the oldest, lets go: the arch melts. Hakon's path (column x 18, rows 11..13) runs north
//      from the platform past the arch (x 16..20, rows 14..19) to the near side of the bell bay; Runa's (column x 26, rows
//      11..15) from the bell landing down to the Lamp Gallery. The letter wall (the wall block 9..14,12..14, its face at
//      12,14) with memory2_trig (row 21). Two groups.
//   C  The Bell Bay (puzzle C, borrowed light): the near side (x 12..18, rows 6..10) is dark. Dagny's own stone stands on it
//      (18,7): read her back and her lamp lights her path (row 8, x 19..21) across to the bell landing (x 22..27, rows 5..10);
//      Hakon, the oldest, goes behind, and the arch far below freezes again. The Listening Bell (24..25,5); bell_trig (column
//      x 22, rows 6..9) stops the party on bell_stop (24,8), two clear rows below the tag.
//   D  The Side Galleries (optional, east): Tuva's stone in the Lamp Gallery (30,16) holds her path north (column x 31, rows
//      14..15) to the lower gallery (x 30..36, rows 9..13): two witness pages, a potion chest, one group. Kell's stone there
//      (31,9) holds his (column x 32, rows 7..8) up to the upper gallery (x 30..33, rows 4..6) and the third page. The
//      Reliquary nook (x 35..37, rows 4..6) is behind frost door R (34,5): Runa's door, shut while she is held; holding Tuva
//      and Kell lets her go, so it stands open. reliquary_obj (ep7_reliquary) and, once reliquary_open, the gold chest and
//      the Keeper Book. 2 optional reads.
//   E  The Lamp Gallery (x 21..33, rows 16..26): font_v2b (23..24,16) before the arena, the iron chest by the arena door
//      (1,200 gold, the gold line), lantern_trig (row 18), the Pale Lantern at lantern_spot (27,22). After the win: lift_trig
//      (row 25), lift_up (25,26) to floor III, and once vault_f2_done lift_f2_down (29,26) to floor I's basin. Floor I's
//      basin lift and floor III's stair land at (23,17), under the font. No stone on any shortcut.
//
// The bot: hakon from (12,17) facing left; runa from (14,16) facing up (Dagny lets go, the arch melts); east through the arch,
// north over Hakon's path to (18,10); dagny_2 from (18,8) facing up; east over her path to (22,8) (bell_trig); south from
// (26,10) over Runa's path to (26,16); font_v2b; south across lantern_trig; after the win lift_trig, lift_up (25,26).
import { door, object, trigger, enemy, chest, sign, book, actor, enter } from './_kit.js';
import { vaultGrid, stone, thawFont, lift } from './ep7_vault_f1.js';

const W = 40, H = 30;
const S = vaultGrid(W, H, '#');
const { set, box, path, frost } = S;

// the chasms: the fade between the platforms, where the paths cross (the rest is the hall's dark stone)
box(16, 11, 19, 13, '_');                  // the platform past the arch / the bay's near side (Hakon)
box(19, 5, 21, 10, '_');                   // the near side / the bell landing (Dagny)
box(22, 11, 29, 15, '_');                  // the bell landing / the Lamp Gallery (Runa)
box(30, 14, 34, 15, '_');                  // the Lamp Gallery / the lower side gallery (Tuva)
box(29, 7, 35, 8, '_');                    // the lower / the upper side gallery (Kell)
box(28, 4, 29, 13, '_');                   // the drop between the bell landing and the side galleries
// A
box(2, 23, 10, 27, '.');                   // Stair Foot
box(5, 22, 6, 22, '.');                    //   the gap north
// B
box(2, 12, 14, 21, '.');                   // the hall of the grip
box(9, 12, 14, 14, '#');                   //   the letter wall (faces on rows 13..14)
box(15, 12, 15, 21, '#');                  //   its east wall, and the arch in it
box(16, 14, 20, 19, '.');                  //   the platform past the arch
frost(15, 16, 'd', '.'); frost(15, 17, 'd', '.');
// C
box(12, 6, 18, 10, '.');                   // the near side of the bell bay
box(22, 5, 27, 10, '.');                   // the bell landing
// D
box(30, 9, 36, 13, '.');                   // the lower side gallery
box(30, 4, 33, 6, '.');                    // the upper side gallery
set(34, 4, '#'); set(34, 6, '#');
frost(34, 5, 'r', '.');                    //   the Reliquary door (Runa's)
box(35, 4, 37, 6, '.');                    //   the Reliquary nook
// E
box(22, 16, 33, 26, '.');                  // the Lamp Gallery
box(2, 27, 37, 29, '#');                   // the floor's south wall

path(18, 11, 18, 13, 'h');                 // Hakon: the platform to the bay's near side
path(19, 8, 21, 8, 'd');                   // Dagny: the near side to the bell landing
path(26, 11, 26, 15, 'r');                 // Runa: the bell landing down to the Lamp Gallery
path(31, 14, 31, 15, 't');                 // Tuva: the Lamp Gallery to the lower side gallery
path(32, 7, 32, 8, 'k');                   // Kell: up to the upper side gallery

const R = S.rows();

const decor = [
  { t: 'lift_frost', x: 3, y: 23 }, { t: 'frostfire', x: 2, y: 27 }, { t: 'frostfire', x: 10, y: 27 },
  { t: 'frostfire', x: 2, y: 21 }, { t: 'frostfire', x: 14, y: 21 },
  { t: 'listening_bell', x: 24, y: 5 },
  { t: 'crystal', x: 36, y: 9 }, { t: 'crystal', x: 30, y: 6 },
  { t: 'frostfire', x: 22, y: 26 }, { t: 'frostfire', x: 33, y: 26 },
  { t: 'lift_frost', x: 25, y: 26, if: 'lantern_defeated' }, { t: 'lift_frost', x: 29, y: 26, if: 'vault_f2_done' },
];

const events = [
  enter('f2_enter', 'vault_f2_arrival'),
  // ---- A: Stair Foot
  lift('lift_down', 3, 23, ['ep7_vault_f1', 23, 4, 'down']),
  thawFont('font_v2', 8, 24),
  // ---- B: The Grip
  stone('ns_dagny', 'd', 14, 18),
  stone('ns_hakon', 'h', 11, 17),
  stone('ns_runa', 'r', 14, 15),
  stone('ns_hakon_2', 'h', 17, 10),
  stone('ns_hakon_3', 'h', 19, 14),          // on the platform past the arch: a reload there (Dagny held again) reads its way home
  stone('ns_runa_2', 'r', 12, 6),
  sign('letter_wall', 12, 14, 'ep7_letter_wall', { solid: false, dir: 'up' }),
  sign('frost_sign', 16, 14, 'ep7_frost_door', { solid: false }),
  trigger('memory2_trig', 2, 21, 13, 1, 'keeper_memory_2'),
  chest('chest_b', 2, 12, 'iron'),
  enemy('e_hall', 4, 17, 'frostbound_revenant', 'e7v2_revenants', 'guard'),
  enemy('e_hall2', 6, 14, 'ice_knight', 'e7v2_mixed', 'patrol', { path: ['left', 'left', 'right', 'right'] }),
  enemy('e_plat', 19, 18, 'ice_knight', 'e7v2_mixed', 'guard'),
  // ---- C: The Bell Bay
  stone('ns_dagny_2', 'd', 18, 7),
  stone('ns_dagny_3', 'd', 22, 10),
  stone('ns_runa_3', 'r', 27, 10),
  sign('lamp_sign', 13, 9, 'ep7_borrowed_lamp', { solid: false }),
  sign('bell_sign', 24, 5, 'ep7_listening_bell', { solid: false }),
  sign('tag_sign', 25, 5, 'ep7_mara_tag', { solid: false }),
  trigger('bell_trig', 22, 6, 1, 4, 'listening_bell'),
  // ---- D: The Side Galleries
  stone('ns_tuva', 't', 30, 16),
  stone('ns_tuva_2', 't', 30, 13),
  stone('ns_kell', 'k', 31, 9),
  stone('ns_kell_2', 'k', 33, 6),
  chest('page_door', 36, 10, 'wood', { item: 'witness_page', flag: 'page_door_found' }),
  chest('page_flame', 36, 13, 'wood', { item: 'witness_page', flag: 'page_flame_found' }),
  chest('page_lost', 30, 4, 'wood', { item: 'witness_page', flag: 'page_lost_found' }),
  chest('chest_d', 34, 13, 'wood', { item: 'hi_potion', qty: 2 }),
  enemy('e_side', 33, 11, 'ice_knight', 'e7v2_knights', 'guard'),
  sign('reliquary_door', 34, 4, 'ep7_reliquary_door', { solid: false }),
  object('reliquary_obj', 35, 4, 'winterwatch_cache', { w: 2, script: 'ep7_reliquary', state: 0 }),
  chest('chest_reliquary', 37, 6, 'gold', { gold: 450, item: 'hi_ether', qty: 2, if: 'reliquary_open' }),
  book('book_keeper', 35, 6, 'keeper_book', { if: 'reliquary_open' }),
  // ---- E: The Lamp Gallery
  thawFont('font_v2b', 23, 16),
  stone('ns_runa_4', 'r', 27, 16),
  chest('chest_gallery', 32, 17, 'iron', { gold: 1200, item: 'hi_ether', qty: 1 }),
  trigger('lantern_trig', 22, 18, 12, 1, 'pale_lantern'),
  actor('pale_lantern', 27, 22, 'pale_lantern', 'up', { ifNot: 'lantern_defeated' }),
  trigger('lift_trig', 24, 25, 7, 1, 'vault_f2_lift'),
  lift('lift_up', 25, 26, ['ep7_vault_f3', 17, 35, 'up'], { if: 'lantern_defeated' }),
  lift('lift_f2_down', 29, 26, ['ep7_vault_f1', 22, 26, 'up'], { if: 'vault_f2_done' }),   // the shortcut down (the basin)
];

export default {
  id: 'ep7_vault_f2', name: 'The Hall of Borrowed Light', area: 'dungeon',
  music: 'frostbound_vault', ambience: 'vault_hush', tileset: 'ep7',
  lighting: { tint: 'none', dark: 0.45 },
  under: 'fade',
  legend: { _: 'fade', '.': 'letter_stone', '#': 'bell_hall_top', '|': 'bell_hall_face', o: 'bell_hall_out_face', v: 'bell_hall_out_top' },
  ground: R.ground,
  remember: { capacity: 2, paths: R.paths, frost: R.frost, start: ['d'], goal: ['memory2_stage', 'bell_stop', 'arena_stage', 'lift_up'] },
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [6, 26], arrival: [6, 26], font: [8, 25], lift_down: [3, 24],
    grip: [12, 17], hakon_face: [12, 17], runa_face: [14, 16], arch: [15, 16], past_arch: [17, 16],
    letter_wall: [12, 14], memory2_stage: [13, 17], memory2_stage_m: [12, 17], memory2_stage_b: [14, 17],
    keeper_gate_m2: [12, 15], courier_snow: [6, 20], courier_stop: [13, 15],
    near_side: [15, 8], dagny_face: [18, 8], bell_bay: [24, 7], bell_stop: [24, 8], bell_stop_m: [23, 8], bell_stop_b: [25, 8],
    side_galleries: [33, 11], tuva_face: [30, 17], kell_face: [31, 10], reliquary: [35, 5],
    arena: [27, 21], lantern_spot: [27, 22], arena_stage: [27, 19], arena_stage_m: [26, 19], arena_stage_b: [28, 19],
    font_b: [24, 17], shortcut_in: [23, 17], lift_up: [25, 25], lift_f2_down: [29, 25],
  },
  start: { x: 6, y: 26, dir: 'up' },
};
