// Court of Mirrors, III: The Unnamed Throne (44 x 32, dungeon, dark 0.6). EPISODE2_PLAN 4.6.
//
// Three wings, three vows, one door. The beam is also a light source here (plan 5.1).
//   The Hall of Vows (hub): arrival from F2 through the great mirror; a black mirror floor; the empty glass throne with
//      the crowned reflection under it; the vow door in the north face (three crystals: one per receptor). Corridors
//      west, east and south. A Keeper mirror back to F2, and (once the floor is reached) one to the F1 landing.
//   Throne Antechamber (behind the vow door): the silver font, the black feather on a glass bench, the throne door.
//   West wing, Belonging: the darkest wing, lit only by the beam. The moon window shines down the west side; three
//      mirrors walk the beam around a ring of pillars to the vow mirror's crystal at the ring's heart. A side niche on
//      the beam's way down holds the Paper Crown (seen in its glow). Two shard swarms.
//   East wing, Mercy: a chasm between the entry floor and the north floor. A lens on the entry floor shines east; the
//      first mirror lays a bridge north over the chasm, the second sends the beam east into the crystal. A Faceless
//      Knight patrols across the beam (enemies never block it). The chasm drops to a lower ledge in the same wing; its
//      stair climbs back (one way). Two groups and a third on the ledge.
//   South wing, Courage: the moon window shines down the wing's west end; the heavy mirror stands two tiles east of the
//      silver socket on the beam's line. Bram shoves it twice, it is turned, and the beam runs east along a long bridge
//      over the chasm into the crystal. Lantern secret: a hidden ink bridge from the east end to the Keeper's cache
//      (the Hollowcrown, the Keeper's note).
import { grid, box, put, rows, room, wallDepth, door, sign, object, trigger, enemy, chest, gate, steps, enter, pit, light,
  beam, mirror, receptor, mirrorDoor, dullMirror, silverFont } from './_kit.js';

const W = 44, H = 32;
const g = grid(W, H, '#');
room(g, 17, 4, 26, 10, '.', '|');           // TA Throne Antechamber
room(g, 16, 15, 27, 22, '.', '|');          // the Hall of Vows (hub)
room(g, 3, 6, 13, 22, '.', '|');            // West wing (Belonging)
room(g, 30, 6, 41, 11, '.', '|');           // East wing north floor (Mercy)
box(g, 30, 12, 41, 15, 'p');                // the chasm
box(g, 30, 16, 41, 22, '.');                // East wing entry floor
room(g, 37, 26, 41, 28, '.', '|');          // the lower ledge (where the chasm drops you)
room(g, 10, 26, 19, 29, '.', '|');          // South wing, west part (Courage)
box(g, 20, 24, 25, 29, 'p');                // the south chasm (faces cut away so it reads as a drop)
room(g, 26, 26, 30, 29, '.', '|');          // South wing, east part
room(g, 33, 27, 35, 29, '.', '|');          // the Keeper's cache (Lantern)
put(g, 31, 28, 'p'); put(g, 32, 28, 'p');   // the gap the hidden ink bridge spans
// passages and notches
box(g, 14, 18, 15, 19, '.');                // hub <-> west wing
box(g, 28, 18, 29, 19, '.');                // hub <-> east wing
put(g, 17, 23, '.');                        // notch: hub <-> south wing (a door in the wing's north face)
put(g, 21, 11, '.');                        // notch behind the vow door
put(g, 2, 15, '.'); put(g, 2, 16, '.');     // the Paper Crown niche
// floors: carpet runners to the doors (black mirror everywhere else)
box(g, 21, 4, 22, 10, 'r');
const ground = rows(wallDepth(g.map((r) => r)));

const overlays = [
  // the bridges (dim = pit until a beam crosses)
  ...[12, 13, 14, 15].map((y) => ({ t: 'glass_bridge_v_dim', x: 34, y })),              // Mercy: the entry floor -> north floor
  ...[20, 21, 22, 23, 24, 25].map((x) => ({ t: 'glass_bridge_h_dim', x, y: 27 })),      // Courage: the long bridge
  // the hidden ink bridge to the Keeper's cache (Lantern)
  { t: 'ink_bridge_h_faint', x: 31, y: 28 }, { t: 'ink_bridge_h_faint', x: 32, y: 28 },
  { t: 'wall_glyph_faint', x: 34, y: 25 },
  // the crowned reflection under the empty throne (a reflection-only decal on the black mirror)
  { t: 'crowned_reflection', x: 21, y: 20 },
  // the heavy mirror's socket on the Courage line, and inlays from each crystal toward the vow door
  { t: 'inlay_socket', x: 12, y: 27, inlay: 'rec_courage' },
  // Belonging's line comes in from the west corridor, Mercy's from the east, both into the vow door's crystals
  ...[16, 17, 18, 19].map((x) => ({ t: 'inlay_h', x, y: 18, inlay: 'rec_belonging' })),
  { t: 'inlay_corner_nw', x: 20, y: 18, inlay: 'rec_belonging' }, { t: 'inlay_v', x: 20, y: 17, inlay: 'rec_belonging' },
  { t: 'inlay_v', x: 20, y: 16, inlay: 'rec_belonging' }, { t: 'inlay_corner_se', x: 20, y: 15, inlay: 'rec_belonging' },
  { t: 'inlay_h', x: 21, y: 15, inlay: 'rec_belonging' },
  ...[24, 25, 26, 27].map((x) => ({ t: 'inlay_h', x, y: 18, inlay: 'rec_mercy' })),
  { t: 'inlay_corner_ne', x: 23, y: 18, inlay: 'rec_mercy' }, { t: 'inlay_v', x: 23, y: 17, inlay: 'rec_mercy' },
  { t: 'inlay_v', x: 23, y: 16, inlay: 'rec_mercy' }, { t: 'inlay_corner_sw', x: 23, y: 15, inlay: 'rec_mercy' },
  { t: 'inlay_h', x: 22, y: 15, inlay: 'rec_mercy' },
  // wall mirrors
  { t: 'mirror_wall', x: 19, y: 2 }, { t: 'mirror_wall', x: 24, y: 2 }, { t: 'mirror_wall', x: 16, y: 13 }, { t: 'mirror_wall', x: 27, y: 13 },
];

const decor = [
  { t: 'door_throne_open', x: 20, y: 3 },
  { t: 'door_glass_open', x: 17, y: 25 },
  { t: 'stairs_glass_up', x: 39, y: 25 },
  { t: 'throne_glass', x: 21, y: 19 },
  { t: 'glass_bench', x: 24, y: 7 },
  // the ring of pillars around Belonging's crystal
  { t: 'pillar', x: 5, y: 10 }, { t: 'pillar', x: 9, y: 10 }, { t: 'pillar', x: 5, y: 14 }, { t: 'pillar', x: 9, y: 14 },
  { t: 'pillar', x: 7, y: 15 }, { t: 'pillar', x: 5, y: 12 },
  { t: 'candelabra', x: 17, y: 4 }, { t: 'candelabra', x: 26, y: 7 },
  { t: 'candelabra', x: 16, y: 21 }, { t: 'candelabra', x: 27, y: 21 },
  { t: 'pillar', x: 31, y: 21 }, { t: 'pillar', x: 41, y: 21 },
];

const events = [
  enter('f3_enter', 'court_f3_arrival'),
  // ---- the Hall of Vows
  gate('door_vow', 21, 14, 'door_vow', { to: ['court_f3', 21, 11, 'up'], text: 'vow_door_face' }),
  door('notch_vow', 21, 11, ['court_f3', 21, 15, 'down']),
  trigger('vow_door_trig', 21, 15, 2, 1, 'vow_door'),
  sign('throne_sign', 21, 19, 'black_floor'),
  dullMirror('dull_f2', 16, 15, 'court_f2_done', 'court_wall_mirror'),
  mirrorDoor('mirror_f3_f2', 16, 15, ['court_f2', 9, 12, 'down'], 'court_f2_done'),
  dullMirror('dull_f1', 27, 15, 'court_f3_arrived', 'court_wall_mirror'),
  mirrorDoor('mirror_f3_short', 27, 15, ['court_f1', 23, 26, 'down'], 'court_f3_arrived'),
  door('south_door', 17, 25, ['court_f3', 17, 23, 'up']),
  door('notch_south', 17, 23, ['court_f3', 17, 26, 'down']),
  // ---- Throne Antechamber
  door('throne_door', 21, 3, ['court_throne', 12, 17, 'up'], { kind: 'door' }),
  silverFont('font_f3', 18, 9),
  // W11 (CRITIQUE_4 item 14): the black feather itself (it was drawn with the letter prop); `glint` keeps its sparkle
  object('feather_obj', 24, 7, 'prop_feather_black', { script: 'black_feather', ifNot: 'black_feather_found', solid: false, glint: true }),
  sign('bench_sign', 25, 7, 'glass_bench', { solid: false }),
  chest('chest_ta', 26, 4, 'wood', { item: 'silver_salve', qty: 2 }),
  // ---- West wing: Belonging
  beam('beam_w', 4, 5, 'down', 'beam_window', { text: 'moon_window' }),
  mirror('m_w1', 4, 20, 0),
  mirror('m_w2', 11, 20, 1),
  mirror('m_w3', 11, 12, 0),
  receptor('rec_belonging', 7, 12, 'door_vow', { latch: true, flag: 'vow_belonging', script: 'vow_belonging' }),
  object('vow_mirror_b', 7, 11, 'mirror_tall', { state: 1, text: 'vow_mirror' }),
  chest('chest_crown', 2, 15, 'gold', { item: 'paper_crown', flag: 'paper_crown_found' }),
  // ---- East wing: Mercy
  beam('beam_e', 30, 19, 'right', 'beam_lens', { text: 'court_lens' }),
  mirror('m_e1', 34, 19, 1),
  mirror('m_e2', 34, 8, 1),
  receptor('rec_mercy', 39, 8, 'door_vow', { face: 'left', latch: true, flag: 'vow_mercy', script: 'vow_mercy' }),
  object('vow_mirror_m', 39, 6, 'mirror_tall', { state: 1, text: 'vow_mirror' }),
  pit('chasm_e', 30, 12, 12, 4, ['court_f3', 39, 27, 'up']),
  door('ledge_stairs', 39, 25, ['court_f3', 39, 22, 'down'], { kind: 'stairs' }),
  chest('chest_e', 41, 6, 'iron'),
  chest('chest_ledge', 41, 28, 'iron'),
  // ---- South wing: Courage
  beam('beam_s', 12, 25, 'down', 'beam_window', { text: 'moon_window' }),
  mirror('mirh_c', 14, 27, 0, { heavy: true, text: 'heavy_mirror' }),
  sign('socket_sign', 12, 28, 'floor_socket', { solid: false }),
  receptor('rec_courage', 30, 27, 'door_vow', { face: 'left', latch: true, flag: 'vow_courage', script: 'vow_courage' }),
  object('vow_mirror_c', 29, 26, 'mirror_tall', { state: 1, text: 'vow_mirror' }),
  chest('chest_hollowcrown', 35, 28, 'gold', { item: 'hollowcrown' }),
  sign('court_note', 34, 26, 'court_note', { lantern: true }),
  // ---- lights (dark 0.6): the hub and the antechamber are candlelit; Belonging has none but the beam
  light('l_hub_a', 17, 20, 5), light('l_hub_b', 26, 20, 5), light('l_ta', 21, 6, 6), light('l_font', 18, 8, 3),
  light('l_e', 35, 18, 5), light('l_s', 15, 27, 4), light('l_ledge', 39, 27, 3), light('l_cache', 34, 28, 2),
  // ---- enemies: 8 per ZONES.court_f3.plan
  enemy('e_w_shards_a', 8, 8, 'shard_swarm', 'c3_shards', 'wander', { radius: 2 }),
  enemy('e_w_shards_b', 7, 18, 'shard_swarm', 'c3_shards', 'chase'),
  enemy('e_e_knight', 31, 17, 'faceless_knight', 'c3_knights', 'patrol', { path: steps('right', 9, 'left', 9) }),
  enemy('e_e_mixed', 37, 10, 'faceless_knight', 'c3_mixed', 'guard'),
  enemy('e_ledge_knight', 38, 27, 'faceless_knight', 'c3_knights', 'guard'),
  enemy('e_s_shadow_a', 11, 29, 'borrowed_shadow', 'c3_shadow', 'wander', { radius: 1 }),
  enemy('e_s_shadow_b', 17, 26, 'borrowed_shadow', 'c3_shadow', 'chase'),
  enemy('e_s_mixed', 28, 29, 'faceless_knight', 'c3_mixed', 'guard'),
];

export default {
  id: 'court_f3', name: 'The Unnamed Throne', area: 'dungeon',
  music: 'mystery', ambience: 'court_hush', tileset: 'court',
  lighting: { tint: 'none', dark: 0.6 },
  under: 'throne_floor',
  pitTo: ['court_f3', 21, 16, 'down'],
  legend: { '#': 'court_throne_top', '|': 'court_throne_face', 'v': 'court_throne_out_top', 'o': 'court_throne_out_face',
    '.': 'throne_floor', 'r': 'carpet_red', 'p': 'pit' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    arrival: [16, 16], hub_center: [21, 17], vow_door: [21, 14], vow_belonging: [7, 12], vow_mercy: [39, 8], vow_courage: [30, 27],
    feather: [24, 7], font: [18, 10], throne_door: [21, 3], ledge: [39, 27],
  },
  start: { x: 16, y: 16, dir: 'down' },
};
