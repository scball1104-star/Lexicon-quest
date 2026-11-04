// The Sunken Keep, I: The Tidegate Causeway (40 x 30, dungeon, dark 0.2). EPISODE4_PLAN 4.5; exact cells in
// docs/MAPS_EP4_B.md. The teaching floor for tide locks: each room adds one idea (plan 5.1's ladder).
//
//   A  the Water Gate (south): the Keep ferry lands at start (19,27); the boat home (19..20,28); the tide font; the tide log
//      on its lectern. Hale's punt (22..23,28) waits here once the council chose the shelter. North up the archway into B.
//   B  the Papered Door (puzzle B, wash): basin a (3 levels, start low). A canal (h0, rows 10..12) under the north face, a
//      kerb (row 13, stair at 21), a walkway (h1, rows 14..15), a kerb (row 16, stair at 12), the wheel's stand (rows
//      17..19, outside the basin) with wh_a. The canal door (17,9) is papered over (seal_b, h 1). Low: the door is dry and
//      sealed. Mid: water stands in the canal, under the seal. High: the walkway goes under, the water closes over the
//      seal and it washes off for good. Low again: walk the canal floor and through the door north into X. No enemies.
//   X  the Notice Hall: the wood chest and the way east (26..27, 4..7) down into C.
//   C  the Pontoons (puzzle C, float): basin b (3 levels, start low). A channel (h0, x 32..33) runs the room's height
//      between two kerbs. The west bank (x 27..30) has wh_b and a stair down (31,10) to the channel floor: at low it is a
//      dead end with Nilo's bell chest (if nilo_started) under the Tidegate. Two pontoons (32..33,16) sit on the floor;
//      at mid they float level with the kerb gaps (31,16) and (34,16): the way east. The east bank (x 35..38, rows
//      13..20): the Tide Key chest, a group, wh_b2. Two groups in C.
//   E  the North Gallery (inside C, x 35..38, rows 8..11): raised over the east bank. Its lip (row 12) goes under only at
//      high water, and the pontoon pt_e (36,12) rises with it: the gallery's gold chest holds the Sunken Seal Key. wh_b3
//      stands on the gallery. One group.
//   F  the Eastern Tidegate: the floodgate tidegate (32..33,7) in C's north face over the channel. High water lifts its
//      counterweight; it latches (tidegate_open). Lower the water and walk the channel floor north through it to the
//      lift landing (x 29..36, rows 2..4): the iron chest, one group, the stair down to F2 (keep_f1_lift in front).
//   D  the Audience Hall (west, behind door_d, the Tide Key): reached from A by the west corridor and the anteroom.
//      memory1_trig crosses row 14 (lyra_memory_1). A cracked face (6,3, Dash Strike) hides the niche with the gold chest
//      (Tidewalker Boots). Two groups.
// Every isolated landing has its own wheel (wh_b2, wh_b3), so a game saved anywhere reloads, with every basin back at its
// start level, onto a floor the party can walk out of (qa/maps/ep4_b_maps.test.mjs, the reload test).
// Solution for the bot (wheel inputs): B: wh_a x2 (mid, then high: seal_b washes), wh_a x1 (low); the stair (21,13), the
// canal floor, the door (17,9) north into X; east down into C. C: wh_b x1 (mid); cross the pontoons at row 16; open
// chest_tide_key. wh_b2 x1 (high): pt_e floats and the tidegate lifts and latches. North over pt_e (36,12) to the
// gallery; open chest_seal_key; back over pt_e. wh_b2 x2 (low, mid); cross west at row 16. wh_b x2 (high, low); the stair
// (31,10), the channel floor north through the tidegate (32..33,7), lift_trig, lift_f2. Optional: D with the Tide Key
// (A, the west corridor, door_d), memory1_trig, Dash at crack_d.
import { wallDepth, door, sign, object, trigger, enemy, chest, lockedDoor, steps, enter, book } from './_kit.js';

// ------------------------------------------------------------------------------------------------ the keep kit
// Shared by the four Keep maps (ep4_keep_f2, ep4_keep_f3 and ep4_keep_crown import it). Pure data helpers.

/**
 * A blank keep grid: ground chars (all wall '#'), basin ids and floor heights ('.' = none). set/box write a cell (or a
 * rectangle) with an optional basin and height; room() carves a floor with its two face rows; finish() runs the W8 wall
 * depth and returns { ground, basin, height } as row strings.
 */
export function keepGrid(W, H) {
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const B = Array.from({ length: H }, () => Array(W).fill('.'));
  const Hh = Array.from({ length: H }, () => Array(W).fill('.'));
  const set = (x, y, ch, b = null, h = null) => {
    g[y][x] = ch;
    B[y][x] = b || '.';
    Hh[y][x] = b ? String(h) : '.';
  };
  const box = (x0, y0, x1, y1, ch, b = null, h = null) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch, b, h); };
  const room = (x0, y0, x1, y1, faces = 2, floor = '.') => {
    for (let y = y0 - faces; y < y0; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && g[y][x] === '#') set(x, y, '|');
    box(x0, y0, x1, y1, floor);
  };
  const finish = () => ({
    ground: wallDepth(g.map((r) => r.join(''))),
    basin: B.map((r) => r.join('')),
    height: Hh.map((r) => r.join('')),
  });
  return { g, B, Hh, W, H, set, box, room, finish };
}

/** The legend shared by the keep floors for one wall system (causeway, archive_stacks, witness) and its floor. */
export function keepLegend(sys, floor, extra = {}) {
  const marble = sys === 'witness';
  return {
    '#': `${sys}_top`, '|': `${sys}_face`, 'o': `${sys}_out_face`, 'v': `${sys}_out_top`, '.': floor,
    'c': 'canal_floor', '~': 'tide_water',
    'L': marble ? 'ledge_lip_marble' : 'ledge_lip', 'F': marble ? 'ledge_face_marble' : 'ledge_face',
    'N': 'canal_stair_n', 'S': 'canal_stair_s', 'E': 'canal_stair_e', 'W': 'canal_stair_w',
    ...extra,
  };
}

export const wheel = (id, x, y, basin, extra = {}) => ({ id, type: 'tidewheel', x, y, basin, ...extra });
export const post = (id, x, y, basin) => ({ id, type: 'tidepost', x, y, basin });
export const pontoon = (id, x, y, basin, extra = {}) => ({ id, type: 'pontoon', x, y, basin, ...extra });
export const forgery = (id, x, y, basin, h, target, extra = {}) => ({ id, type: 'forgery', x, y, basin, h, target, ...extra });
/** A boat door (plan 5.2): two cells, the punt drawn over them. */
export const boat = (id, x, y, to, extra = {}) => ({ id, type: 'door', x, y, w: 2, h: 1, to, kind: 'boat', sprite: 'boat', ...extra });
/** The tide font: rest and save (font_tide, 2 x 1). */
export const tideFont = (id, x, y) => ({ id, type: 'font', x, y, w: 2, h: 1, text: 'ep4_font_tide', sprite: 'font_tide', safe: true });
/** A one-cell canal door in a face (door_canal), opened by its forgery. */
export const canalDoor = (id, x, y, extra = {}) => ({ id, type: 'gate', x, y, w: 1, h: 1, sprite: 'door_canal', state: 'closed', text: 'ep4_washed_door', ...extra });

// ------------------------------------------------------------------------------------------------ the floor
const W = 40, H = 30;
const K = keepGrid(W, H);
const { set, box, room } = K;

room(10, 4, 25, 6);                          // X  the Notice Hall (faces 2..3)
room(10, 10, 25, 19);                        // B  the Papered Door (faces 8..9)
room(15, 24, 24, 27);                        // A  the Water Gate (faces 22..23)
room(27, 8, 38, 20);                         // C  the Pontoons (faces 6..7)
room(29, 2, 36, 4);                          // F  the lift landing (faces 0..1)
room(1, 5, 8, 20);                           // D  the Audience Hall (faces 3..4)
room(1, 24, 8, 27);                          //    its anteroom (faces 22..23)
// passages
box(19, 20, 20, 23, '.');                    // A -> B, the archway
box(17, 7, 17, 8, '.');                      // B's papered door -> X (the door sits at 17,9)
box(26, 4, 27, 7, '.');                      // X -> C, down into C's north-west corner
box(32, 5, 33, 6, '.');                      // the tidegate (32..33,7) -> the lift landing
box(4, 21, 5, 22, '.');                      // door_d (4..5,23) -> D
box(9, 25, 14, 26, '.');                     // A -> the anteroom (the west corridor)
box(5, 1, 7, 2, '.');                        // the niche behind D's cracked face (6,3)
box(15, 28, 24, 28, '~');                    // the Water Gate's moorings (open water)
room(26, 24, 38, 28); box(26, 24, 38, 28, '~'); box(25, 28, 25, 28, '~');   // the flooded outer court, out to the river

// B, basin a: canal (h0), kerb (h1), walkway (h1), kerb (outside), the stand
box(10, 10, 25, 12, 'c', 'a', 0);
box(10, 13, 25, 13, 'L', 'a', 1); set(21, 13, 'N', 'a', 0);
box(10, 14, 25, 15, '.', 'a', 1);
box(10, 16, 25, 16, 'L'); set(12, 16, 'N', 'a', 1);
// C, basin b: the west bank, its kerb, the channel, the east kerb, the gallery, its lip, the east bank
box(31, 8, 31, 20, 'L'); set(31, 10, 'E', 'b', 0); set(31, 16, '.');
box(32, 8, 33, 20, 'c', 'b', 0);
box(34, 8, 34, 20, 'L'); set(34, 16, '.');
box(35, 12, 38, 12, 'F', 'b', 1); set(36, 12, 'c', 'b', 1);
// D: the dais under the north face, a drowned trough either side of the aisle
box(2, 5, 7, 6, 'm');
box(1, 9, 2, 12, '~'); box(7, 9, 8, 12, '~');

const R = K.finish();

// ---------------------------------------------------------------- dressing
const decor = [
  // A: the quay
  { t: 'mooring_post', x: 15, y: 27 }, { t: 'mooring_post', x: 24, y: 27 },
  { t: 'lectern', x: 16, y: 25 }, { t: 'sandbag', x: 24, y: 25 },
  { t: 'lantern_chain', x: 17, y: 24 }, { t: 'lantern_chain', x: 22, y: 24 },
  // B: mooring posts along the walkway, lanterns over the canal
  { t: 'mooring_post', x: 14, y: 17 }, { t: 'mooring_post', x: 25, y: 17 },
  { t: 'lantern_chain', x: 13, y: 11 }, { t: 'lantern_chain', x: 23, y: 11 },
  { t: 'sandbag', x: 24, y: 19 }, { t: 'sandbag', x: 10, y: 19 },
  // X: the notice hall
  { t: 'pillar', x: 13, y: 4 }, { t: 'pillar', x: 20, y: 4 }, { t: 'pillar', x: 24, y: 4 },
  { t: 'book_stack', x: 11, y: 6 }, { t: 'proclamation_board', x: 15, y: 3 },
  // C: lanterns over the channel, crates on the banks
  { t: 'lantern_chain', x: 32, y: 11 }, { t: 'lantern_chain', x: 33, y: 18 },
  { t: 'mooring_post', x: 30, y: 15 }, { t: 'mooring_post', x: 35, y: 17 },
  { t: 'sandbags', x: 27, y: 20 }, { t: 'book_stack', x: 38, y: 13 },
  // the outer court: Valewyn's drowned roofs beyond the Water Gate
  { t: 'roof_drowned_a', x: 28, y: 26 }, { t: 'roof_drowned_b', x: 33, y: 25 }, { t: 'chimney_drowned', x: 31, y: 27 },
  { t: 'roof_drowned_a', x: 36, y: 28 }, { t: 'mooring_post', x: 26, y: 24 },
  // the lift landing
  { t: 'stairs_down', x: 33, y: 1 }, { t: 'lantern_chain', x: 30, y: 2 },
  // D: pillars down the aisle, candelabra on the dais
  { t: 'pillar', x: 3, y: 8 }, { t: 'pillar', x: 6, y: 8 }, { t: 'pillar', x: 3, y: 15 }, { t: 'pillar', x: 6, y: 15 },
  { t: 'candelabra', x: 2, y: 5 }, { t: 'candelabra', x: 7, y: 5 },
  { t: 'bench_iron', x: 3, y: 18 }, { t: 'bench_iron', x: 5, y: 18 },
  { t: 'lantern_chain', x: 2, y: 10 }, { t: 'lantern_chain', x: 7, y: 10 },
];

const events = [
  enter('k1_enter', 'keep_f1_arrival'),
  // ---- A: the Water Gate
  boat('boat_vw', 19, 28, ['ep4_valewyn', 29, 4, 'down'], { if: 'keep_entered' }),
  boat('hale_punt', 22, 28, ['ep4_valewyn', 21, 32, 'up'], { if: 'council_shelter' }),
  tideFont('font_k1', 22, 25),
  book('tide_log', 16, 25, 'tide_log'),
  // ---- B: the Papered Door (puzzle B)
  wheel('wh_a', 15, 18, 'a'),
  post('post_a', 11, 11, 'a'),
  canalDoor('door_papered', 17, 9),
  forgery('seal_b', 17, 9, 'a', 1, 'door_papered'),
  sign('sign_tide_post_b', 24, 13, 'ep4_keeper_marks', { solid: false }),
  // ---- X: the Notice Hall
  chest('chest_x', 10, 4, 'wood', { item: 'hi_potion', qty: 2 }),
  // ---- C: the Pontoons (puzzle C)
  wheel('wh_b', 29, 12, 'b'),
  post('post_b', 33, 12, 'b'),
  pontoon('pt_c1', 32, 16, 'b'),
  pontoon('pt_c2', 33, 16, 'b'),
  chest('chest_nilo', 32, 9, 'wood', { item: 'nilo_bell', flag: 'nilo_bell_found', if: 'nilo_started' }),
  wheel('wh_b2', 37, 15, 'b'),
  chest('chest_tide_key', 38, 19, 'wood', { item: 'tide_key', flag: 'tide_key_f1' }),
  enemy('e_c_watch', 28, 17, 'drowned_watch', 'e4k1_watch', 'patrol', { path: steps('up', 3, 'down', 3) }),
  enemy('e_c_crabs', 36, 18, 'lockjaw_crab', 'e4k1_crabs', 'wander', { radius: 1 }),
  // ---- E: the North Gallery
  pontoon('pt_e', 36, 12, 'b', { rides: [2] }),
  wheel('wh_b3', 38, 10, 'b'),
  chest('chest_seal_key', 38, 8, 'gold', { item: 'seal_key', flag: 'seal_key_found' }),
  enemy('e_e_blooms', 35, 9, 'ink_bloom', 'e4k1_blooms', 'guard'),
  // ---- F: the Eastern Tidegate and the lift landing
  { id: 'tidegate', type: 'floodgate', x: 32, y: 7, w: 2, basin: 'b', at: 2, latch: true, flag: 'tidegate_open', text: 'ep4_floodgate' },
  trigger('lift_trig', 33, 2, 2, 1, 'keep_f1_lift'),
  door('lift_f2', 33, 1, ['ep4_keep_f2', 6, 24, 'down'], { kind: 'stairs', w: 2 }),
  chest('chest_f', 29, 2, 'iron'),
  enemy('e_f_mixed', 30, 4, 'drowned_watch', 'e4k1_mixed', 'guard'),
  // ---- D: the Audience Hall
  lockedDoor('door_d', 4, 23, 'tide_key'),
  trigger('memory1_trig', 1, 14, 8, 1, 'lyra_memory_1'),
  object('crack_d', 6, 3, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2, opens: [[6, 3], [6, 4], [6, 2]] }),
  chest('chest_boots', 6, 1, 'gold', { item: 'tidewalker_boots', behind: 'crack_d' }),
  enemy('e_d_watch', 4, 11, 'drowned_watch', 'e4k1_watch', 'patrol', { path: steps('left', 1, 'right', 2, 'left', 1) }),
  enemy('e_d_crabs', 5, 17, 'lockjaw_crab', 'e4k1_crabs', 'wander', { radius: 1 }),
];

export default {
  id: 'ep4_keep_f1', name: 'The Tidegate Causeway', area: 'dungeon',
  music: 'sunken_keep', ambience: 'keep_drip', tileset: 'ep4',
  lighting: { tint: 'none', dark: 0.2, lights: [] },
  floorShade: { color: '#14101e', alpha: 0.45, rows: 8, side: 3 },
  under: 'causeway_floor',
  legend: keepLegend('causeway', 'causeway_floor', { 'm': 'marble_walk' }),
  ground: R.ground,
  tide: {
    basins: { a: { start: 0, levels: 3, wheel: 'wh_a' }, b: { start: 0, levels: 3, wheel: 'wh_b' } },
    basin: R.basin,
    height: R.height,
  },
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [19, 27], font: [22, 26], papered: [17, 10], pontoons: [32, 15], audience: [4, 10], gallery: [36, 9],
    tidegate: [32, 8], lift_down: [33, 2],
    audience_regent: [4, 6], audience_boatman: [4, 13], audience_guard: [6, 7],
    stand_a: [15, 19], stand_b: [29, 13], east_bank: [36, 15], tide_hall: [17, 5],
  },
  start: { x: 19, y: 27, dir: 'up' },
};
