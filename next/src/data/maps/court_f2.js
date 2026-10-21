// Court of Mirrors, II: The Hall of Other Selves (40 x 30, dungeon, dark 0.25). EPISODE2_PLAN 4.5.
//
// The beam lays bridges. A ring of galleries around a central void, the Well of Reflections:
//   P  the Portrait Hall (north-west): the stairs from F1 land here; blank portraits along the north face; the child's
//      portrait in the west alcove (with a wood chest). Everything that falls into a pit climbs back out here.
//   NG the North Gallery: Puzzle 1 (teach bridges). The skylight in NG's north face shines down onto m_n1. Untouched,
//      the beam runs west through the Portrait Hall; turned once, it runs east along a dim glass rail over the
//      three-cell moat into the East Gallery, and the rail lights into a bridge. One group.
//   EG the East Gallery: two groups and the glass key. A fixed mirror where the first bridge lands turns the beam south
//      down the gallery's arm to m_e1 (Puzzle 2, one beam, two bridges): '\' sends it east along bridge A over a chasm
//      to the Keeper's portrait alcove (optional, an iron chest); '/' sends it west along bridge B across the Well to
//      the Island. Lighting one darkens the other. One group in the arm.
//   The Island: the reflection pool (Mira's second memory), m_i1 at bridge B's end: turned '/', it sends the beam south
//      along bridge C to the South Gallery. Bridge B is upstream of m_i1, so it stays lit: the island is never a trap.
//   SG the South Gallery: three groups, the King's portrait, the Remembrance Cache (after all three portraits), and at
//      its west end the locked glass door into the West Wing.
//   WW the West Wing: the font room, the corridor of the great mirror (Vex), the round Arena (the Other Selves). After
//      the fight the arena's great mirror is the way down to F3, and beside it a Keeper mirror to the F1 landing.
import { grid, box, put, rows, room, wallDepth, door, sign, object, trigger, enemy, chest, gate, lockedDoor, steps, enter,
  beam, mirror, mirrorDoor, dullMirror, silverFont, light } from './_kit.js';

const W = 40, H = 30;
const g = grid(W, H, '#');
room(g, 5, 3, 12, 7, '.', '|');             // P  Portrait Hall
room(g, 2, 5, 3, 7, '.', '|');              // P  the west alcove (the child's portrait)
room(g, 15, 3, 24, 7, '.', '|');            // NG North Gallery
room(g, 28, 3, 37, 7, '.', '|');            // EG north room
box(g, 30, 8, 34, 17, '.');                 // EG the arm (continues the north room)
room(g, 37, 10, 38, 14, '.', '|');          // the Keeper's alcove
room(g, 2, 11, 3, 18, '.', '|');            // WW the corridor of the great mirror
room(g, 4, 15, 5, 18, '.', '|');            // WW the font room (with the corridor's south end)
room(g, 6, 11, 13, 18, '.', '|');           // WW the Arena
room(g, 2, 22, 37, 26, '.', '|');           // SG South Gallery
// the Well of Reflections, the moat and the chasm
box(g, 15, 9, 28, 18, 'p');
box(g, 25, 4, 27, 6, 'p');
box(g, 35, 11, 36, 13, 'p');
// the Island
box(g, 19, 11, 22, 14, 'i');
put(g, 19, 11, 'w'); put(g, 20, 11, 'w'); put(g, 19, 12, 'w'); put(g, 20, 12, 'w');   // the reflection pool
// passages and notches
box(g, 4, 5, 4, 7, '.');                    // P <-> its west alcove
box(g, 13, 5, 14, 6, '.');                  // P <-> NG
put(g, 29, 12, '.');                        // the arm's doorway onto bridge B
box(g, 21, 19, 21, 21, '.');                // bridge C's landing through SG's north wall
box(g, 4, 11, 5, 12, '.');                  // the corridor's top <-> the Arena
put(g, 2, 19, '.');                         // notch behind door_w
// the Arena is round: cut its corners
for (const [x, y] of [[6, 18], [13, 18], [6, 17], [13, 17], [13, 11], [13, 12]]) put(g, x, y, '#');
// runners
box(g, 8, 3, 9, 7, 'r');                    // P: the hall's carpet under the stairs
box(g, 7, 13, 12, 16, 'r');                 // the Arena's floor medallion
const ground = rows(wallDepth(g.map((r) => r)));

const overlays = [
  // the glass rails: dim until a beam runs along them (collision pit), then bridges
  ...[25, 26, 27].map((x) => ({ t: 'glass_bridge_h_dim', x, y: 5 })),                   // the moat (Puzzle 1)
  ...[23, 24, 25, 26, 27, 28].map((x) => ({ t: 'glass_bridge_h_dim', x, y: 12 })),      // bridge B: the arm -> the Island
  ...[35, 36].map((x) => ({ t: 'glass_bridge_h_dim', x, y: 12 })),                      // bridge A: the arm -> the Keeper's alcove
  ...[15, 16, 17, 18].map((y) => ({ t: 'glass_bridge_v_dim', x: 21, y })),              // bridge C: the Island -> SG
  // portraits along the Portrait Hall and the South Gallery (blank faces), the King's portrait in SG
  { t: 'portrait_blank', x: 10, y: 1 }, { t: 'portrait_blank_2', x: 5, y: 1 },
  { t: 'portrait_blank_3', x: 16, y: 1 }, { t: 'portrait_blank', x: 22, y: 1 },
  { t: 'portrait_blank_2', x: 30, y: 1 }, { t: 'portrait_blank_3', x: 35, y: 1 },
  { t: 'portrait_blank', x: 6, y: 20 }, { t: 'portrait_blank_3', x: 11, y: 20 }, { t: 'portrait_blank_2', x: 15, y: 20 },
  { t: 'portrait_blank', x: 25, y: 20 }, { t: 'portrait_blank_3', x: 34, y: 20 },
  { t: 'mirror_wall', x: 7, y: 9 }, { t: 'mirror_wall', x: 12, y: 9 },
];

const decor = [
  { t: 'stairs_glass_up', x: 6, y: 2 },
  { t: 'candelabra', x: 5, y: 3 }, { t: 'candelabra', x: 12, y: 3 },
  { t: 'glass_bench', x: 10, y: 7 },
  { t: 'candelabra', x: 15, y: 3 }, { t: 'candelabra', x: 24, y: 3 },
  { t: 'glass_bench', x: 34, y: 7 }, { t: 'candelabra', x: 28, y: 3 },
  { t: 'glass_bench', x: 9, y: 26 }, { t: 'glass_bench', x: 27, y: 26 }, { t: 'glass_bench', x: 35, y: 22 },
  { t: 'candelabra', x: 19, y: 22 }, { t: 'candelabra', x: 23, y: 22 },
  { t: 'pillar', x: 8, y: 17 }, { t: 'pillar', x: 11, y: 17 },
  // the South Gallery: a colonnade along the portraits
  { t: 'pillar', x: 9, y: 23 }, { t: 'pillar', x: 14, y: 23 }, { t: 'pillar', x: 27, y: 23 }, { t: 'pillar', x: 33, y: 23 },
  { t: 'glass_bench', x: 15, y: 26 }, { t: 'glass_bench', x: 31, y: 26 },
];

const events = [
  enter('f2_enter', 'court_f2_arrival'),
  // ---- P: the Portrait Hall
  door('stairs_up', 6, 2, ['court_f1', 19, 2, 'down'], { kind: 'stairs' }),
  object('portrait_child', 2, 3, 'portrait_child', { script: 'portrait_child', w: 2, h: 2 }),
  sign('portrait_p', 10, 2, 'portrait_blank'),
  chest('chest_alcove', 3, 7, 'wood', { item: 'silver_salve', qty: 2 }),
  // ---- NG: Puzzle 1 (teach bridges)
  beam('beam_n', 18, 2, 'down', 'beam_window', { text: 'moon_window' }),
  mirror('m_n1', 18, 5, 0),
  sign('rail_sign', 24, 4, 'glass_rail', { solid: false }),
  // ---- EG: the glass key, the fixed mirror, Puzzle 2
  chest('chest_key2', 37, 3, 'wood', { item: 'glass_key', flag: 'glass_key_f2' }),
  mirror('m_e0', 32, 5, 1, { fixed: true }),
  mirror('m_e1', 32, 12, 1),
  object('portrait_keeper', 37, 8, 'portrait_keeper_empty', { script: 'portrait_keeper', w: 2, h: 2 }),
  chest('chest_keeper', 38, 14, 'iron'),
  // ---- the Island
  trigger('pool_trig', 22, 11, 1, 3, 'mira_memory_2'),
  mirror('m_i1', 21, 12, 1),
  sign('pool_sign', 20, 13, 'reflection_pool', { solid: false }),
  chest('chest_island', 19, 14, 'iron', { item: 'hi_ether', qty: 2 }),
  // ---- SG: the South Gallery
  object('portrait_king', 30, 20, 'portrait_king', { script: 'portrait_king', w: 2, h: 2 }),
  // the Remembrance Cache: 2 Ethers and 140 gold (chest `gold`), the Keeper's ledger read from the bench beside it
  chest('chest_remembrance', 37, 22, 'gold', { item: 'ether', qty: 2, gold: 140, if: 'remembrance_open' }),
  { id: 'cache_ledger', type: 'book', x: 36, y: 22, book: 'court_ledger', if: 'remembrance_open' },
  lockedDoor('door_w', 2, 21, 'glass_key', ['court_f2', 2, 19, 'up'], { sprite: 'door_glass_key' }),
  door('notch_w', 2, 19, ['court_f2', 2, 22, 'down']),
  sign('well_edge_s', 18, 21, 'well_edge', { solid: false }),
  // ---- WW: the font room, the great mirror's corridor, the Arena
  silverFont('font_f2', 4, 17),
  object('vex_glass_obj', 2, 11, 'mirror_tall', { text: 'court_wall_mirror', state: 0 }),
  trigger('vex_trig', 2, 13, 2, 1, 'vex_mirror'),
  trigger('selves_trig', 7, 11, 1, 6, 'other_selves'),
  dullMirror('arena_mirror', 9, 11, 'other_selves_defeated', 'great_mirror_f2'),
  mirrorDoor('stairs_f3', 9, 11, ['court_f3', 16, 16, 'down'], 'other_selves_defeated', { text: 'great_mirror_f2' }),
  trigger('stairs_trig', 9, 12, 1, 1, 'court_f2_stairs'),
  dullMirror('short_dull', 11, 11, 'court_f2_done', 'court_wall_mirror'),
  mirrorDoor('mirror_f2_short', 11, 11, ['court_f1', 16, 26, 'down'], 'court_f2_done'),
  // ---- lights (dark 0.25): the candelabra and the font
  light('l_p', 8, 4, 4), light('l_ng', 20, 4, 4), light('l_eg', 32, 4, 4), light('l_sg_a', 9, 24, 5),
  light('l_sg_b', 21, 23, 5), light('l_sg_c', 31, 24, 5), light('l_ww', 4, 16, 3), light('l_arena', 9, 14, 5),
  // ---- enemies: 8 per ZONES.court_f2.plan, plus the Other Selves (the arena trigger)
  enemy('e_ng_shadows', 22, 6, 'borrowed_shadow', 'c2_shadows', 'wander', { radius: 2 }),
  enemy('e_eg_knight', 30, 4, 'faceless_knight', 'c2_knight', 'guard'),
  enemy('e_eg_sentinel', 35, 6, 'glass_sentinel', 'c2_sentinel', 'wander', { radius: 2 }),
  enemy('e_arm_mixed', 31, 9, 'faceless_knight', 'c2_mixed', 'patrol', { path: steps('down', 5, 'up', 5) }),
  enemy('e_sg_shadows', 12, 24, 'borrowed_shadow', 'c2_shadows', 'chase'),
  enemy('e_sg_knight', 27, 24, 'faceless_knight', 'c2_knight', 'patrol', { path: steps('right', 5, 'left', 5) }),
  enemy('e_sg_mixed', 6, 23, 'faceless_knight', 'c2_mixed', 'guard'),
  enemy('e_ww_sentinel', 3, 16, 'glass_sentinel', 'c2_sentinel', 'guard'),
];

export default {
  id: 'court_f2', name: 'The Hall of Other Selves', area: 'dungeon',
  music: 'court', ambience: 'court_hush', tileset: 'court',
  lighting: { tint: 'none', dark: 0.25 },
  under: 'gallery_floor',
  pitTo: ['court_f2', 8, 6, 'down'],
  legend: { '#': 'court_gallery_top', '|': 'court_gallery_face', 'v': 'court_gallery_out_top', 'o': 'court_gallery_out_face',
    '.': 'gallery_floor', 'r': 'carpet_blue', 'p': 'pit', 'i': 'gallery_floor', 'w': 'mere_water' },
  // W11 (CRITIQUE_4 item 13): the island is the gallery's own violet marquetry, edged in a silver inlay, and the
  // reflection pool has a stone lip (tilemap.js rims); F1's grey flagstone no longer sits pasted in the middle.
  rims: [
    { x: 19, y: 11, w: 4, h: 4, inset: 1, thick: 1, color: '#c9cde0', hi: '#f4f6ff', lo: '#241a3a' },
    { x: 19, y: 11, w: 2, h: 2, thick: 2, color: '#6b6688', hi: '#a8a6c2', lo: '#1c1830', shade: '#3a3654' },
  ],
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    arrival: [6, 4], portrait_child: [2, 5], portrait_keeper: [37, 10], portrait_king: [30, 22], pool: [19, 12],
    vex_mirror: [2, 11], vex_glass: [2, 11], vex_scene: [3, 12], arena: [9, 15], selves_spot: [9, 13], selves_hero: [9, 12],
    // vex_scene (W11): the camera between the glass and the party
    selves_mira: [8, 13], selves_bram: [10, 13], stairs_down: [9, 12], well_return: [8, 6],
  },
  start: { x: 6, y: 4, dir: 'down' },
};
