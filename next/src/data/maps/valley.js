// Willowmere Valley: 60 x 40 field. The river runs north to south through the middle; Willowmere's gate opens
// onto the south-west corner; the road runs east over the stone bridge (Penny's cart at its far end), then north
// along the east bank as the pilgrim road, past the fork (milestone, signpost, Pilgrim's Rest) to the Rootbound
// Archive grown into the north cliff. North landing with the empty bell post; Nella's bell in the shallows below
// it. West: the meadow, the hollow tree cache and a cliff with a ledge shortcut; east: the Whisperwood edge.
import { grid, box, put, rows, scatter, bridgeH, ledge, npc, door, sign, object, trigger, enemy, chest, hash01, steps } from './_kit.js';

const W = 60, H = 40;
const g = grid(W, H, '.');

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
// the river (cols 27..32, bending), banks, the bridge gap, the shallows below the north landing
const RIVER = [];                                   // [x0, x1] per row, a gentle S-bend
for (let y = 6; y < H; y++) {
  const wob = y < 12 ? 0 : y < 18 ? 1 : y < 24 ? 2 : y < 27 ? 1 : y < 30 ? 0 : y < 33 ? -1 : y < 37 ? 0 : 1;
  const x0 = 27 + wob, x1 = 32 + wob;
  RIVER[y] = [x0, x1];
  for (let x = x0; x <= x1; x++) put(g, x, y, '~');
  if (y >= 7 && !(y >= 33 && y <= 34) && hash01(0, y, 11) < 0.85) put(g, x0 - 1, y, 's');
  if (y >= 7 && !(y >= 33 && y <= 34) && hash01(1, y, 11) < 0.85) put(g, x1 + 1, y, 's');
}
box(g, 30, 11, 32, 13, '-');                      // shallows that hold Nella's bell
put(g, 33, 12, 's');
// tributary from the east with the washed-out ford
box(g, 47, 19, 59, 21, '~');
put(g, 46, 20, '-'); put(g, 46, 19, 's'); put(g, 46, 21, 's'); put(g, 45, 19, 's'); put(g, 45, 21, 's');
box(g, 47, 18, 59, 18, 's'); box(g, 47, 22, 59, 22, 's');
// ink pool at the Whisperwood edge (the Lantern secret)
box(g, 53, 29, 55, 32, 'i');
// roads: west road from the gate to the bridge, the bridge, the pilgrim road north, the fork roads
box(g, 0, 33, 26, 34, '=');
box(g, 34, 33, 36, 34, '=');
box(g, 35, 8, 36, 21, '=');
box(g, 36, 22, 37, 27, '=');
box(g, 35, 28, 36, 34, '=');
put(g, 37, 21, '='); put(g, 37, 28, '=');
box(g, 37, 20, 45, 20, '=');
box(g, 33, 20, 34, 20, '=');
box(g, 35, 6, 36, 7, '=');
// a fenced pasture in the west meadow (the sheep are out)
for (let x = 3; x <= 11; x++) { put(g, x, 18, 'F'); put(g, x, 23, 'F'); }
for (let y = 19; y <= 22; y++) { put(g, 3, y, 'F'); put(g, 11, y, 'F'); }
put(g, 7, 23, '.');
box(g, 4, 19, 10, 22, ',');
// north landing sand and the Archive forecourt
box(g, 33, 8, 34, 10, 's');
box(g, 33, 6, 40, 7, '=');
put(g, 32, 7, 's'); put(g, 33, 7, 's');
// meadow texture: tall grass drifts
for (let y = 6; y < H; y++) for (let x = 0; x < W; x++) {
  if (g[y][x] !== '.') continue;
  const n = hash01(x >> 1, y >> 1, 21);
  if (n < 0.22 && hash01(x, y, 22) < 0.8) put(g, x, y, ',');
}
// clear tall grass off the road verges and the forecourt
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === ',' && (y >= 31 && y <= 36 && x <= 37)) put(g, x, y, '.');

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
];

// ---------------------------------------------------------------- decor
const pines = [];
function pine(x, y) { pines.push({ t: 'tree_pine', x, y }); }
// north cliff top: a tree line with gaps, the big willows over the Archive door
for (let x = 1; x < 59; x += 2) if (hash01(x, 1, 41) < 0.75 && (x < 24 || x > 35)) pine(x, 1 + (hash01(x, 2, 42) < 0.5 ? 0 : 2));
// Whisperwood: dense pines on the east edge, thinning westward, a clearing around the ink pool
for (let y = 6; y < H; y += 2) for (let x = 46; x < 60; x += 2) {
  const edge = (x - 46) / 14;
  if (y >= 18 && y <= 22) continue;                             // tributary
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
  { t: 'lamp_post', x: 37, y: 8, state: 1 }, { t: 'lamp_post', x: 34, y: 33, state: 1 },
  { t: 'crates_barrels', x: 40, y: 31 },
];

// ---------------------------------------------------------------- events
const events = [
  trigger('valley_enter', 0, 0, 1, 1, 'valley_arrival', { on: 'enter' }),
  trigger('archive_door_trig', 36, 7, 1, 1, 'archive_door'),
  door('archive_entrance', 36, 5, ['archive_f1', 20, 27, 'up'], { w: 2, h: 1, if: 'archive_entered' }),
  // NPCs
  npc('penny', 39, 32, 'down'),
  npc('quill', 40, 22, 'left'),
  // scripted objects and inspectables
  object('milestone', 37, 19, 'prop_milestone', { script: 'milestone' }),
  object('prop_ferry_bell', 31, 12, 'prop_ferry_bell', { script: 'ferry_bell_found', if: 'nella_quest_started', ifNot: 'ferry_bell_found', solid: false }),
  object('campfire', 39, 22, 'brazier_lit', { text: 'pilgrim_rest' }),
  sign('valley_fork_sign', 34, 19, 'valley_fork_sign', { solid: false }),
  sign('hollow_tree', 15, 26, 'hollow_tree', { solid: false }),
  sign('bridge_plaque', 25, 32, 'bridge_plaque', { solid: false }),
  sign('whisperwood_edge', 49, 33, 'whisperwood_edge', { solid: false }),
  sign('archive_door_carving', 37, 5, 'archive_door_carving', { solid: false }),
  { id: 'ferry_post', type: 'ferry', x: 34, y: 8, text: 'ferry_post_valley', to: ['willowmere', 43, 5, 'left'], rideIf: 'nella_bell_done', solid: false },
  // chests: the hollow tree cache, the cliff-top chest, the Whisperwood secret (Lantern)
  chest('chest_hollow', 16, 25, 'wood', { item: 'echo_herb', qty: 2 }),
  chest('chest_cliff', 4, 8, 'iron', { item: 'hatchet' }),
  chest('chest_whisperwood', 57, 31, 'gold', { item: 'thornwake' }),
  // visible enemies: 7 per encounters.js ZONES.valley.plan (wolves first, the pack deepest)
  enemy('e_wolves_a', 12, 31, 'briar_wolf', 'valley_wolves', 'wander', { radius: 3 }),
  enemy('e_wolves_b', 9, 10, 'briar_wolf', 'valley_wolves', 'guard'),
  enemy('e_slimes', 22, 27, 'ink_slime', 'valley_slimes', 'wander', { radius: 3 }),
  enemy('e_scarab_a', 41, 27, 'moss_scarab', 'valley_scarab', 'patrol', { path: steps('up', 4, 'right', 3, 'down', 4, 'left', 3) }),
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
  marks: { archive_door: [36, 6], door_step: [36, 7], root_exit: [39, 7], fork: [35, 20], north_landing: [34, 9] },
  start: { x: 1, y: 33, dir: 'right' },
};
