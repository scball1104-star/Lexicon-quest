// The Saffron Wind (28 x 14, field). EPISODE5_PLAN 4.1; exact cells in docs/MAPS_EP5_A.md section 2.
//
// Yara's copper-trimmed ship at night, bow to the east, on a black sea. The deck (deck_planks) runs x 2..21, rows 3..10,
// and narrows to a stepped bow (x 22..24); the copper rail (ship_rail, line16) runs round it. The mast stands amidships at
// (16..17, 7) with its furled saffron sail overhead; two deck lanterns on the north rail; lashed cloth crates aft and
// forward; the hatch; the helm at the stern (3,7) with Yara behind it (yara_wheel (2,7), the scene spawn).
//
// The crossing, west to east and back:
//   - arrival deck_start (5,7) facing the bow (Valewyn's boat door berth_sail lands here); ship_night on enter puts Mira at
//     the north rail (mira_rail (9,3)) and sends Bram to the bow (bram_bow (23,6));
//   - bow_trig, the whole column x 21 (rows 3..10): ship_bram, the hero two tiles from Bram (bow_stage (21,6));
//   - fight_row, the whole column x 14 (rows 3..10), present from bram_asked: walking back aft past the mast runs
//     ship_fight; the two foes drop ahead of the party at foes_drop (11,5) and foes_drop_b (11,9);
//   - after ship_first_fight_done the tint is dawn and the gangway door (20,11) in the south rail by the bow leads down to
//     the Caravan Road's jetty.
// e_e5s_first is the zone plan's anchor for the scripted fight (EP5_ZONES.ep5_ship plan: e5s_first x1). The scene spawns
// its own two foes, so the anchor's flags never hold together (if bram_asked, ifNot bram_asked) and it never stands on
// the deck: no free fight, no double. No chest, no other enemy.
import { grid, put, rows, sign, enter, trigger, enemy } from './_kit.js';

const W = 28, H = 14;
const g = grid(W, H, 'n');

// ---------------------------------------------------------------- the hull: deck cells, then the rail round them
const DECK = new Set();
const deck = (x, y) => DECK.add(`${x},${y}`);
for (let x = 2; x <= 21; x++) for (let y = 3; y <= 10; y++) deck(x, y);
for (let y = 4; y <= 9; y++) deck(22, y);
for (let y = 5; y <= 8; y++) deck(23, y);
for (let y = 6; y <= 7; y++) deck(24, y);
for (const k of DECK) { const [x, y] = k.split(',').map(Number); put(g, x, y, 'k'); }
// the rail: every sea cell that touches the deck (8-neighbourhood), so the stepped bow closes
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (DECK.has(`${x},${y}`)) continue;
  let touch = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (DECK.has(`${x + dx},${y + dy}`)) touch = true;
  if (touch) put(g, x, y, 'r');
}
// the hull's side under the south rail (one row of planking below every rail cell that has the sea under it), so the deck
// reads as a ship seen from above and to the south, not as a raft
const HULL = [];
for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'r' && g[y + 1][x] === 'n' && y >= 10) HULL.push([x, y + 1]);
for (const [x, y] of HULL) put(g, x, y, 'h');
for (const [x, y] of HULL) {
  const l = g[y][x - 1] === 'h' || g[y][x - 1] === 'H' || g[y][x - 1] === 'L', r = g[y][x + 1] === 'h' || g[y][x + 1] === 'R';
  if (!l) put(g, x, y, 'L'); else if (!r) put(g, x, y, 'R');
}
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- dressing
const decor = [
  { t: 'mast', x: 16, y: 7 },                       // footprint (16..17, 7); the furled sail overhead
  { t: 'ship_lantern', x: 6, y: 3 }, { t: 'ship_lantern', x: 19, y: 3 },
  { t: 'ship_wheel', x: 3, y: 7 },
  { t: 'hatch', x: 7, y: 8 },                       // (7..8, 8)
  { t: 'crates_lashed', x: 3, y: 10 },              // (3..4, 10)
  { t: 'crate_lashed', x: 12, y: 10 },
  { t: 'crates_lashed', x: 18, y: 10 },             // (18..19, 10)
  { t: 'crate_lashed', x: 20, y: 4 },
  // the stern's stores and the water for the crossing
  { t: 'barrel', x: 2, y: 3 }, { t: 'barrel', x: 3, y: 3 }, { t: 'barrel', x: 2, y: 10 },
  { t: 'water_jars', x: 12, y: 3 }, { t: 'crate', x: 13, y: 3 },
  { t: 'water_jars', x: 9, y: 10 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('ship_enter', 'ship_night'),
  trigger('bow_trig', 21, 3, 1, 8, 'ship_bram'),
  trigger('fight_row', 14, 3, 1, 8, 'ship_fight', { if: 'bram_asked' }),
  // the zone plan's anchor for the scripted fight: never present (see the header)
  enemy('e_e5s_first', 11, 7, 'dust_harrier', 'e5s_first', 'guard', { if: 'bram_asked', ifNot: 'bram_asked' }),
  // the gangway at the bow, once the coast is up
  { id: 'gangway_down', type: 'door', x: 20, y: 11, to: ['ep5_caravan_road', 2, 13, 'right'], kind: 'door', sprite: 'gangway', if: 'ship_first_fight_done' },
  // inspect lines
  sign('crates_sign', 3, 10, 'ep5_deck_crates'),
  sign('crates_sign_b', 18, 10, 'ep5_deck_crates'),
  sign('mast_sign', 16, 7, 'ep5_mast'),
  sign('lantern_sign', 6, 3, 'ep5_ship_lantern'),
  sign('lantern_sign_b', 19, 3, 'ep5_ship_lantern'),
  sign('wheel_sign', 3, 7, 'ep5_ship_wheel'),
  sign('sea_sign_n', 11, 2, 'ep5_night_sea'),
  sign('sea_sign_s', 6, 11, 'ep5_night_sea'),
];

export default {
  id: 'ep5_ship', name: 'The Saffron Wind', area: 'field',
  music: 'mystery', ambience: 'mere_still', tileset: 'town',
  lighting: { tint: [{ if: 'ship_first_fight_done', id: 'dawn' }, { id: 'night' }], dark: 0 },
  under: 'deck_planks',
  legend: { 'k': 'deck_planks', 'n': 'night_sea', 'r': 'ship_rail', 'h': 'wall_planks_top_m', 'L': 'wall_planks_top_l', 'R': 'wall_planks_top_r' },
  ground,
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    deck_start: [5, 7], deck_stage: [9, 5], deck_stage_b: [10, 5], mira_rail: [9, 3], bram_bow: [23, 6], bow_stage: [21, 6],
    yara_wheel: [2, 7], foes_drop: [11, 5], foes_drop_b: [11, 9], gangway: [20, 10],
  },
  start: { x: 5, y: 7, dir: 'right' },
};
