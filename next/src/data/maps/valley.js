// Willowmere Valley: 60 x 40 field. The river runs north to south through the middle; Willowmere's gate opens
// onto the south-west corner; the road runs east over the stone bridge (Penny's cart at its far end), then north
// along the east bank as the pilgrim road, past the fork (milestone, signpost, Pilgrim's Rest) to the Rootbound
// Archive grown into the north cliff. North landing with the empty bell post; Nella's bell in the shallows below
// it. West: the meadow, the hollow tree cache and a cliff with a ledge shortcut; east: the Whisperwood edge.
//
// W9-abilities: the plateau's south face is cracked at (4,14): Dash Strike opens a grotto with an iron chest
// (`chest_grotto`, hidden until the rock breaks). It sits west of the first-fight cut, so the hero can try the dash
// before the first battle; the wall_broken overlay under it only tells the map tools the grotto floor is open.
//
// Shapes (CRITIQUE_2 item 6): the roads bend and widen, the tall grass and flower drifts are value-noise blobs,
// the tributary and the ink pool have ragged banks and the cliff-top tree line is broken. Every mark, event and
// the walk model are unchanged from the straight version (qa/maps asserts them).
import { grid, box, put, rows, scatter, bridgeH, npc, door, sign, object, trigger, enemy, chest, hash01, steps } from './_kit.js';

const W = 60, H = 40;
const g = grid(W, H, '.');

/** Smooth value noise in [0,1): bilinear blend of hash01 at a lattice of `cell` tiles. */
function vnoise(x, y, cell, salt) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash01(gx, gy, salt), b = hash01(gx + 1, gy, salt), c = hash01(gx, gy + 1, salt), d = hash01(gx + 1, gy + 1, salt);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

// ---------------------------------------------------------------- terrain
// north cliff band (the Archive is grown into it), with the face rows below the top
box(g, 0, 0, 59, 3, '^');
box(g, 0, 4, 59, 5, '|');
box(g, 26, 0, 32, 5, '~');                        // the river pours out of the cliffs
// west plateau: a ring of cliff top (rows 7 and 13, cols 2 and 16) around walkable grass, a 2-row face
// under the south ring, stairs cut through the ring at col 15, a grassy ledge slope at cols 7..9
box(g, 2, 7, 16, 13, '^');
box(g, 3, 8, 15, 12, '.');
box(g, 2, 14, 16, 15, '|');
put(g, 15, 13, 'S'); put(g, 15, 14, 't'); put(g, 15, 15, 'z');
put(g, 7, 13, 'L'); put(g, 8, 13, 'M'); put(g, 9, 13, 'R');
put(g, 7, 14, '.'); put(g, 8, 14, '.'); put(g, 9, 14, '.');
put(g, 7, 15, '.'); put(g, 8, 15, '.'); put(g, 9, 15, '.');
// the river (cols 27..32, bending), banks with the odd bulge, the bridge gap, the shallows below the landing
const RIVER = [];                                   // [x0, x1] per row, a gentle S-bend
for (let y = 6; y < H; y++) {
  const wob = y < 12 ? 0 : y < 18 ? 1 : y < 24 ? 2 : y < 27 ? 1 : y < 30 ? 0 : y < 33 ? -1 : y < 37 ? 0 : 1;
  const x0 = 27 + wob, x1 = 32 + wob;
  RIVER[y] = [x0, x1];
  for (let x = x0; x <= x1; x++) put(g, x, y, '~');
  if (y >= 7 && !(y >= 33 && y <= 34)) {
    if (hash01(0, y, 11) < 0.85) put(g, x0 - 1, y, 's');
    if (hash01(1, y, 11) < 0.85) put(g, x1 + 1, y, 's');
    if (hash01(2, y, 12) < 0.28) put(g, x0 - 2, y, 's');     // a wider bank here and there
    if (hash01(3, y, 12) < 0.28) put(g, x1 + 2, y, 's');
  }
}
box(g, 30, 11, 32, 13, '-');                      // shallows that hold Nella's bell
put(g, 33, 12, 's');
// tributary from the east with the washed-out ford: a ragged channel, two to four rows deep
for (let x = 47; x < W; x++) {
  const top = 19 - (hash01(x, 0, 13) < 0.3 ? 1 : 0);
  const bot = 21 + (hash01(x, 1, 13) < 0.3 ? 1 : 0);
  for (let y = top; y <= bot; y++) put(g, x, y, '~');
  put(g, x, top - 1, 's'); put(g, x, bot + 1, 's');
}
put(g, 46, 20, '-'); put(g, 46, 19, 's'); put(g, 46, 21, 's'); put(g, 45, 19, 's'); put(g, 45, 21, 's');
// ink pool at the Whisperwood edge (the Lantern secret): a blot, with a tongue of land at the bridge's west end
for (const [x0, x1, y] of [[53, 54, 28], [52, 55, 29], [52, 55, 30], [53, 55, 31], [52, 55, 32], [53, 55, 33]]) box(g, x0, y, x1, y, 'i');
// roads. One span per row: the west road from the gate to the bridge wanders north and widens twice, the pilgrim
// road leans into the bank and opens out at the slope, the fork and the Pilgrim's Rest.
const ROAD = {
  // west road (gate at x 0, bridge deck from x 26)
  32: [[5, 17]], 33: [[0, 25]], 34: [[0, 9], [18, 25]], 35: [[22, 25]],
};
const PILGRIM = {
  6: [33, 40], 7: [33, 40], 8: [35, 36], 9: [35, 36], 10: [35, 37], 11: [35, 37], 12: [36, 37], 13: [36, 37],
  14: [35, 37], 15: [35, 37], 16: [35, 36], 17: [35, 36], 18: [35, 37], 19: [35, 36], 20: [33, 45], 21: [35, 37],
  22: [36, 37], 23: [36, 37], 24: [36, 38], 25: [36, 38], 26: [36, 37], 27: [36, 37], 28: [35, 37], 29: [35, 36],
  30: [35, 36], 31: [35, 36], 32: [34, 36], 33: [34, 36], 34: [34, 36],
};
for (const [y, spans] of Object.entries(ROAD)) for (const [x0, x1] of spans) box(g, x0, +y, x1, +y, '=');
for (const [y, [x0, x1]] of Object.entries(PILGRIM)) box(g, x0, +y, x1, +y, '=');
// a fenced pasture in the west meadow (the sheep are out)
for (let x = 3; x <= 11; x++) { put(g, x, 18, 'F'); put(g, x, 23, 'F'); }
for (let y = 19; y <= 22; y++) { put(g, 3, y, 'F'); put(g, 11, y, 'F'); }
put(g, 7, 23, '.');
box(g, 4, 19, 10, 22, ',');
// north landing sand and the Archive forecourt
box(g, 33, 8, 34, 10, 's');
put(g, 32, 7, 's'); put(g, 33, 7, 's');
// meadow texture: tall grass drifts as irregular blobs (two octaves of value noise plus a little grain)
for (let y = 6; y < H; y++) for (let x = 0; x < W; x++) {
  if (g[y][x] !== '.') continue;
  const n = 0.55 * vnoise(x, y, 6, 21) + 0.3 * vnoise(x, y, 3, 23) + 0.15 * hash01(x, y, 22);
  if (n > 0.58) put(g, x, y, ',');
}
// keep the verges clear: no tall grass touching a road cell, and none in the Archive forecourt
const isRoad = (x, y) => y >= 0 && y < H && x >= 0 && x < W && g[y][x] === '=';
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (g[y][x] !== ',') continue;
  let near = y <= 9 && x >= 31 && x <= 42;
  for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (isRoad(x + dx, y + dy)) { near = true; break; }
  if (near) put(g, x, y, '.');
}

const ground = rows(g);

// ---------------------------------------------------------------- overlays
const overlays = [
  ...bridgeH(26, 33, 33, 'stone', true),
  ...bridgeH(30, 33, 8, 'wood', true),            // the north landing pier
  { t: 'door_double_closed', x: 36, y: 4 },         // the Archive's great door, set into the cliff face
  { t: 'ink_bridge_h_faint', x: 53, y: 31 }, { t: 'ink_bridge_h_faint', x: 54, y: 31 }, { t: 'ink_bridge_h_faint', x: 55, y: 31 },
  { t: 'roots_0', x: 34, y: 5 }, { t: 'roots_1', x: 39, y: 5 }, { t: 'roots_2', x: 40, y: 7 }, { t: 'roots_1', x: 33, y: 7 },
  ...scatter(ground, ['.'], ['flowers_white', 'flowers_yellow', 'tuft_0', 'tuft_1', 'pebbles_0', 'flowers_violet', 'leaves'], 0.07, 31),
  ...scatter(ground, [','], ['flowers_yellow', 'flowers_white', 'flowers_pink'], 0.12, 32),
  ...scatter(ground, ['s'], ['pebbles_0', 'pebbles_1', 'pebbles_2'], 0.3, 33),
  { t: 'hydrangea_blue', x: 38, y: 22 }, { t: 'hydrangea_violet', x: 41, y: 23 },
  { t: 'roots_1', x: 50, y: 28 }, { t: 'roots_0', x: 52, y: 28 },   // roots spill out of the hollow's mouth
  { t: 'wall_broken', x: 4, y: 14 },                // W9: the grotto behind the cracked face (drawn over by the crack)
];

// ---------------------------------------------------------------- decor
const pines = [];
function pine(x, y) { pines.push({ t: 'tree_pine', x, y }); }
// north cliff top: a broken tree line, trunks at varied depth with gaps and the odd pair, clear of the Archive
for (let x = 1; x < 59; x++) {
  if (x >= 24 && x <= 35) continue;
  const r = hash01(x, 1, 41);
  if (r < 0.42) pine(x, Math.floor(hash01(x, 2, 42) * 3));
  else if (r < 0.52) { pine(x, 0); pine(x, 2 + (hash01(x, 3, 42) < 0.5 ? 0 : 1)); }
}
// Whisperwood: dense pines on the east edge, thinning westward, a clearing around the ink pool
for (let y = 6; y < H; y += 2) for (let x = 46; x < 60; x += 2) {
  const edge = (x - 46) / 14;
  if (y >= 16 && y <= 23) continue;                             // tributary and its banks
  if (x >= 47 && x <= 59 && y >= 26 && y <= 36) continue;       // clearing + pool (ringed by hand below)
  if (hash01(x, y, 43) < 0.25 + edge * 0.7) pine(x + (hash01(x, y, 44) < 0.5 ? 0 : 1), y + (hash01(x, y, 45) < 0.5 ? 0 : 1));
}
// ring the ink pool so the only way in is the gap at (48,31)
for (const [x, y] of [[49, 26], [51, 26], [53, 26], [55, 26], [57, 26], [59, 27], [59, 29], [59, 31], [59, 33], [59, 35], [57, 37], [55, 37], [53, 37], [51, 37], [49, 36], [47, 27], [47, 35]]) pine(x, y);
// south edge and the west meadow: scattered trees and the hollow willow
for (const [x, y] of [[2, 37], [6, 38], [12, 37], [18, 38], [23, 37], [38, 37], [43, 38], [48, 37], [20, 30], [4, 27], [24, 24], [1, 25], [19, 22], [1, 17], [13, 17], [21, 11], [19, 7]]) pine(x, y);
const decor = [
  ...pines,
  { t: 'tree_willow', x: 33, y: 3 }, { t: 'tree_willow', x: 39, y: 3 }, { t: 'tree_willow', x: 36, y: 2 },
  { t: 'root_column', x: 34, y: 5 }, { t: 'root_column', x: 38, y: 5 },
  { t: 'tree_willow', x: 24, y: 13 }, { t: 'tree_willow', x: 34, y: 27 }, { t: 'tree_willow', x: 23, y: 31 },
  { t: 'tree_willow', x: 15, y: 26 },               // the hollow tree
  { t: 'bush', x: 14, y: 25 }, { t: 'bush', x: 17, y: 25 }, { t: 'bush', x: 18, y: 26 }, { t: 'bush', x: 14, y: 24 }, { t: 'bush', x: 17, y: 24 },
  { t: 'bush', x: 20, y: 32 }, { t: 'bush', x: 41, y: 31 },
  { t: 'bush', x: 44, y: 9 }, { t: 'bush', x: 37, y: 16 }, { t: 'bush', x: 40, y: 12 },
  { t: 'bush', x: 56, y: 30 }, { t: 'bush', x: 56, y: 32 }, { t: 'bush', x: 57, y: 30 }, { t: 'bush', x: 57, y: 32 }, { t: 'bush', x: 58, y: 31 },
  { t: 'bush', x: 56, y: 29 }, { t: 'bush', x: 56, y: 33 }, { t: 'bush', x: 52, y: 28 }, { t: 'bush', x: 52, y: 33 },
  { t: 'bush', x: 48, y: 30 }, { t: 'bush', x: 48, y: 32 }, { t: 'bush', x: 57, y: 29 }, { t: 'bush', x: 57, y: 33 }, { t: 'bush', x: 58, y: 30 }, { t: 'bush', x: 58, y: 32 },
  { t: 'bush', x: 4, y: 9 }, { t: 'bush', x: 10, y: 9 }, { t: 'bush', x: 13, y: 12 }, { t: 'bush', x: 5, y: 12 },
  { t: 'bench', x: 41, y: 24 }, { t: 'crates_barrels', x: 41, y: 21 },
  { t: 'market_stall_cloth', x: 37, y: 31 },        // Penny's cart
  { t: 'signpost_arrow', x: 34, y: 19 },            // the fork sign
  { t: 'signpost', x: 34, y: 8 },                   // the empty bell post
  { t: 'signboard', x: 25, y: 32 },                 // bridge plaque
  { t: 'signboard', x: 49, y: 33 },                 // Whisperwood edge
  { t: 'bench', x: 38, y: 23 },                     // the dry log bench of the Pilgrim's Rest
  { t: 'signboard', x: 40, y: 25 },                 // the pilgrims' note (the Whisperwood hint)
  { t: 'arch_ruin', x: 50, y: 27 },                 // the root arch at the pool's edge: the mouth of Whisperwood Hollow
  { t: 'lamp_post', x: 37, y: 8, state: 1 }, { t: 'lamp_post', x: 34, y: 33, state: 1 },
  { t: 'crates_barrels', x: 40, y: 31 },
];

// ---------------------------------------------------------------- events
const events = [
  trigger('valley_enter', 0, 0, 1, 1, 'valley_arrival', { on: 'enter' }),
  // the teaching fight: a step trigger down the whole of column 7 (every passable cell at x 7, from the strip
  // above the plateau to the south edge), so the road cannot be skirted through the meadow; the pack waits at
  // the bend (14,33), two tiles outside its chase radius from the trigger
  trigger('first_fight_trig', 7, 6, 1, 34, 'first_fight'),
  trigger('archive_door_trig', 36, 7, 1, 1, 'archive_door'),
  door('archive_entrance', 36, 5, ['archive_f1', 20, 27, 'up'], { w: 2, h: 1, if: 'archive_entered' }),
  // the Whisperwood Hollow: the root arch's passable middle cell at the pool's edge is the door down
  door('hollow_mouth', 51, 27, ['whisperwood_hollow', 2, 13, 'down']),
  // NPCs
  npc('penny', 39, 32, 'down'),
  npc('quill', 40, 22, 'left'),
  // scripted objects and inspectables
  object('milestone', 37, 19, 'prop_milestone', { script: 'milestone' }),
  object('prop_ferry_bell', 31, 12, 'prop_ferry_bell', { script: 'ferry_bell_found', if: 'nella_quest_started', ifNot: 'ferry_bell_found', solid: false }),
  // the Pilgrim's Rest campfire: the fireside scene, then the field's rest flow (`rest: true`; a `safe` landmark)
  object('campfire', 39, 22, 'brazier_lit', { script: 'campfire_rest', text: 'pilgrim_rest', safe: true, rest: true }),
  sign('pilgrim_bench', 38, 23, 'pilgrim_bench', { solid: false }),
  sign('valley_fork_sign', 34, 19, 'valley_fork_sign', { solid: false }),
  sign('hollow_tree', 15, 26, 'hollow_tree', { solid: false }),
  sign('bridge_plaque', 25, 32, 'bridge_plaque', { solid: false }),
  sign('whisperwood_edge', 49, 33, 'whisperwood_edge', { solid: false }),
  sign('pilgrim_note', 40, 25, 'pilgrim_note', { solid: false }),
  sign('archive_door_carving', 37, 5, 'archive_door_carving', { solid: false }),
  { id: 'ferry_post', type: 'ferry', x: 34, y: 8, text: 'ferry_post_valley', to: ['willowmere', 43, 5, 'left'], rideIf: 'nella_bell_done', solid: false },
  // chests: the hollow tree cache, the cliff-top chest, the Whisperwood secret (Lantern)
  chest('chest_hollow', 16, 25, 'wood', { item: 'echo_herb', qty: 2 }),
  chest('chest_cliff', 4, 8, 'iron', { item: 'hatchet' }),
  chest('chest_whisperwood', 57, 31, 'gold', { item: 'pilgrim_reach' }),
  // W9-abilities: Dash Strike breaks the cracked face; the grotto's chest appears behind it
  object('crack_plateau', 4, 14, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2 }),
  chest('chest_grotto', 4, 15, 'iron', { item: 'phoenix_feather', behind: 'crack_plateau' }),
  // visible enemies: 7 per encounters.js ZONES.valley.plan (the wolf pack at the gate chases, the pack deepest)
  enemy('e_wolves_a', 14, 33, 'briar_wolf', 'valley_wolves', 'chase'),
  enemy('e_wolves_b', 9, 10, 'briar_wolf', 'valley_wolves', 'guard'),
  enemy('e_slimes', 22, 27, 'ink_slime', 'valley_slimes', 'wander', { radius: 3 }),
  enemy('e_scarab_a', 43, 27, 'moss_scarab', 'valley_scarab', 'patrol', { path: steps('up', 3, 'right', 2, 'down', 3, 'left', 2) }),
  enemy('e_scarab_b', 44, 13, 'moss_scarab', 'valley_scarab', 'wander', { radius: 3 }),
  enemy('e_mixed', 42, 10, 'briar_wolf', 'valley_mixed', 'chase'),
  enemy('e_pack', 39, 14, 'briar_wolf', 'valley_pack', 'chase'),
];

export default {
  id: 'valley', name: 'Willowmere Valley', area: 'field',
  music: 'valley', ambience: 'wind_valley', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  weather: 'rain', weatherZone: { x: 0, y: 0, w: 60, h: 19 },
  pitTo: ['valley', 51, 31, 'left'],
  under: 'grass',
  legend: { '.': 'grass', ',': 'tallgrass', '=': 'dirt', 's': 'sand', '~': 'water', '-': 'shallow', 'i': 'ink', 'F': 'fence_wood',
    '^': 'cliff_top', '|': 'cliff_face', 'S': 'cliff_stairs_top', 't': 'cliff_stairs_mid', 'z': 'cliff_stairs_bot',
    'L': 'ledge_s_a', 'M': 'ledge_s_m', 'R': 'ledge_s_b' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [{ x: 0, y: 33, w: 1, h: 2, to: ['willowmere', 20, 30, 'up'] }],
  marks: { archive_door: [36, 6], door_step: [36, 7], root_exit: [39, 7], fork: [35, 20], north_landing: [34, 9], campfire: [39, 22],
    hollow_mouth: [51, 28] },
  start: { x: 1, y: 33, dir: 'right' },
};
