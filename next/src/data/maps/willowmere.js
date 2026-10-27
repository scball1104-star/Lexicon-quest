// Willowmere: river town, west bank, south end of the valley. 48 x 32.
// Geography follows docs/story/STAGING.md section 3: Lantern Square with the well and the chapel bell tower
// north of it, the library east (chicken run behind it), the hero's home and Oren's bakery on the west lane,
// the Lantern Inn and ferry landing in the north-east, Edda's twelve beds along the river road, the main
// road south to the south square (notice board, Tess) and the gate (Bram left, Holt right).
import { grid, box, put, rows, scatter, bridgeH, npc, door, sign, object, trigger, chest } from './_kit.js';
import { x1On } from '../x1/live.js';

// X1 (docs/maps/X1_HUB.md): the west gate and Wick's hole, all behind x1On('west'); switched off the module is exactly the baseline.
const X1_W = x1On('west');

const W = 48, H = 32;
const g = grid(W, H, '.');
// river: north edge and east edge
box(g, 0, 0, 47, 2, '~');
box(g, 44, 0, 47, 31, '~');
put(g, 43, 0, '~'); put(g, 43, 1, '~'); put(g, 42, 0, '~');
put(g, 44, 10, '-'); put(g, 44, 11, '-'); put(g, 45, 10, '-'); put(g, 44, 19, '-'); put(g, 44, 20, '-'); put(g, 44, 21, '-'); put(g, 45, 20, '-');
// banks
put(g, 6, 3, 'ss'); put(g, 14, 3, 'ssss'); put(g, 20, 3, 'ss');
box(g, 38, 3, 43, 7, 's');                        // ferry landing sand
box(g, 43, 8, 43, 31, 's'); put(g, 43, 14, '.'); put(g, 43, 15, '.'); put(g, 43, 16, '.');
put(g, 42, 26, 's'); put(g, 42, 27, 's'); put(g, 43, 25, 's');
// reeds by the Duke's nest and along the bank
put(g, 23, 3, ',,,'); put(g, 24, 4, ','); put(g, 40, 8, ',,'); put(g, 41, 9, ',');
put(g, 5, 3, ','); put(g, 13, 4, ',,'); put(g, 18, 3, ',');
// Lantern Square (plaza) with softened corners, library apron, chapel and inn forecourts
box(g, 12, 14, 33, 20, 'o');
put(g, 12, 14, '.'); put(g, 12, 20, '.'); put(g, 33, 20, '.');
box(g, 28, 21, 42, 22, 'o');
box(g, 28, 23, 33, 23, 'o'); box(g, 38, 23, 42, 23, 'o');
put(g, 28, 23, '.'); put(g, 42, 21, '.');
box(g, 33, 13, 36, 13, 'o');                      // inn forecourt
box(g, 15, 13, 25, 13, 'o');                      // chapel forecourt
// west lane to the hero's home and bakery, the alley (Loaf) and the north-west houses
box(g, 1, 16, 11, 17, '=');
put(g, 1, 16, '.');
box(g, 7, 9, 7, 15, '=');
box(g, 1, 9, 1, 15, '='); put(g, 2, 9, '=');
put(g, 8, 9, '=='); put(g, 9, 9, '=');
// river road from the square's north-east corner to the ferry landing
box(g, 25, 4, 42, 5, '=');
box(g, 26, 6, 27, 13, '=');
put(g, 25, 6, '='); put(g, 28, 12, '=');
// main road south: square to the gate
box(g, 20, 21, 21, 31, '=');
// south square
box(g, 15, 25, 27, 28, 'o');
put(g, 15, 25, '.'); put(g, 27, 25, '.'); put(g, 15, 28, '.'); put(g, 27, 28, '.');
box(g, 20, 25, 21, 28, '=');
// paths to the item shop and the smithy, the big house, and the south-east houses
box(g, 9, 26, 14, 26, '='); put(g, 13, 25, '=');
box(g, 28, 26, 32, 26, '='); put(g, 29, 25, '=');
box(g, 4, 25, 9, 25, '=');
box(g, 4, 29, 19, 29, '=');
box(g, 22, 29, 42, 29, '='); put(g, 34, 29, '='); put(g, 40, 29, '=');
box(g, 9, 27, 9, 28, '=');
// fences: the inn yard (south of the river road), chicken run, gardens
for (let x = 28; x <= 38; x++) put(g, x, 6, 'F');
// chicken run behind the library
for (let x = 37; x <= 42; x++) { put(g, x, 8, 'F'); put(g, x, 13, 'F'); }
for (let y = 9; y <= 12; y++) { put(g, 37, y, 'F'); put(g, 42, y, 'F'); }
put(g, 42, 10, '.');                                // run gate opens onto the east bank
box(g, 38, 9, 41, 12, ',');
// big house garden
for (let y = 18; y <= 26; y++) put(g, 0, y, 'F');
for (let x = 1; x <= 8; x++) put(g, x, 26, 'F');
// north-west garden fence between the two houses and the bank
for (let x = 1; x <= 6; x++) put(g, x, 3, 'F');
// town wall along the south edge, broken by the gate (cols 18..23)
for (let x = 1; x <= 17; x++) put(g, x, 30, 'W');
for (let x = 24; x <= 42; x++) put(g, x, 30, 'W');
put(g, 2, 31, ',,'); put(g, 30, 31, ',,,'); put(g, 40, 31, ',,');

// X1 W7: the lane runs out to the gate
if (X1_W) box(g, 0, 16, 1, 17, '=');

const ground = rows(g);

// ------------------------------------------------------------------ overlays
const overlays = [
  // Edda's twelve beds (row 3, cols 26..37) and the thirteenth bed (col 39) with no stake
  ...['hydrangea_blue', 'flowers_yellow', 'hydrangea_violet', 'flowers_pink', 'hydrangea_blue', 'flowers_red',
    'hydrangea_violet', 'flowers_white', 'hydrangea_blue', 'flowers_violet', 'hydrangea_violet', 'flowers_yellow']
    .map((t, i) => ({ t, x: 26 + i, y: 3 })),
  { t: 'flowers_white', x: 39, y: 3 },
  ...bridgeH(42, 46, 4, 'wood', true),            // ferry pier
  // square dressing
  { t: 'hydrangea_blue', x: 11, y: 19 }, { t: 'hydrangea_violet', x: 11, y: 18 }, { t: 'flowers_white', x: 11, y: 20 },
  { t: 'hydrangea_blue', x: 34, y: 16 }, { t: 'hydrangea_violet', x: 34, y: 18 }, { t: 'flowers_pink', x: 34, y: 17 },
  { t: 'pebbles_0', x: 14, y: 19 }, { t: 'pebbles_1', x: 30, y: 15 }, { t: 'pebbles_2', x: 24, y: 23 },
  // gardens
  { t: 'flowers_red', x: 1, y: 25 }, { t: 'flowers_yellow', x: 2, y: 25 }, { t: 'flowers_pink', x: 6, y: 25 }, { t: 'hydrangea_violet', x: 7, y: 25 },
  { t: 'hydrangea_blue', x: 1, y: 19 }, { t: 'flowers_white', x: 1, y: 20 },
  { t: 'flowers_white', x: 2, y: 4 }, { t: 'flowers_blue', x: 5, y: 4 }, { t: 'flowers_yellow', x: 6, y: 4 },
  { t: 'flowers_pink', x: 13, y: 9 }, { t: 'flowers_white', x: 14, y: 9 },
  { t: 'flowers_white', x: 37, y: 25 }, { t: 'flowers_blue', x: 38, y: 24 }, { t: 'flowers_violet', x: 43, y: 27 },
  { t: 'flowers_yellow', x: 2, y: 28 }, { t: 'flowers_white', x: 5, y: 28 }, { t: 'hydrangea_blue', x: 7, y: 28 },
  // chicken run pecked ground
  { t: 'pebbles_1', x: 39, y: 10 }, { t: 'tuft_0', x: 40, y: 11 },
  ...scatter(ground, ['.'], ['tuft_0', 'tuft_1', 'pebbles_0', 'leaves'], 0.05, 3),
  ...scatter(ground, [','], ['flowers_white', 'flowers_yellow'], 0.2, 5),
  ...(X1_W ? [{ t: 'wall_broken', x: 6, y: 30 }] : []),
];

// ------------------------------------------------------------------ decor
const decor = [
  // buildings (anchor = bottom-left footprint tile)
  { t: 'house_small', x: 1, y: 8 },
  { t: 'house_medium', x: 8, y: 8 },
  { t: 'hero_home', x: 2, y: 15 },
  { t: 'bakery', x: 8, y: 15 },
  { t: 'chapel_bell_tower', x: 16, y: 13 },
  { t: 'inn', x: 29, y: 12 },
  { t: 'library', x: 33, y: 22 },
  { t: 'item_shop', x: 10, y: 25 },
  { t: 'smithy', x: 25, y: 25 },
  { t: 'house_large', x: 1, y: 24 },
  { t: 'house_medium', x: 33, y: 28 },
  { t: 'house_small', x: 39, y: 28 },
  { t: 'town_gate', x: 18, y: 30 },
  // square furniture
  { t: 'well', x: 22, y: 17 },
  { t: 'lamp_post', x: 15, y: 16, state: 1 }, { t: 'lamp_post', x: 30, y: 16, state: 1 },
  { t: 'lamp_post', x: 19, y: 22, state: 1 }, { t: 'lamp_post', x: 27, y: 13, state: 1 },
  { t: 'lamp_post', x: 22, y: 28, state: 1 }, { t: 'lamp_post', x: 16, y: 29, state: 1 }, { t: 'lamp_post', x: 25, y: 29, state: 1 },
  { t: 'lamp_post', x: 12, y: 17, state: 1 },
  { t: 'bench', x: 16, y: 19 }, { t: 'bench', x: 28, y: 19 }, { t: 'bench', x: 24, y: 27 },
  { t: 'signboard', x: 13, y: 15 },                 // LANTERN SQUARE sign
  { t: 'signboard', x: 17, y: 26 },                 // notice board
  { t: 'signboard', x: 25, y: 4 },                  // garden plaque
  { t: 'market_stall_fruit', x: 29, y: 22 },
  { t: 'market_stall_cloth', x: 14, y: 20 },
  { t: 'hedge_flowers', x: 13, y: 21 }, { t: 'hedge_flowers', x: 30, y: 24 },
  { t: 'crates_barrels', x: 31, y: 27 }, { t: 'barrel', x: 36, y: 9 },
  { t: 'anvil', x: 31, y: 25 },
  // trees
  { t: 'tree_willow', x: 14, y: 4 }, { t: 'tree_willow', x: 20, y: 4 }, { t: 'tree_willow', x: 44, y: 24 },
  { t: 'tree_willow', x: 8, y: 22 },
  { t: 'tree_pine', x: 9, y: 31 }, { t: 'tree_pine', x: 12, y: 31 }, { t: 'tree_pine', x: 28, y: 31 },
  { t: 'tree_pine', x: 33, y: 31 }, { t: 'tree_pine', x: 15, y: 11 }, { t: 'tree_pine', x: 6, y: 6 },
  { t: 'tree_pine', x: 25, y: 9 }, { t: 'tree_pine', x: 14, y: 7 }, ...(X1_W ? [] : [{ t: 'tree_pine', x: 6, y: 31 }]),   // X1: it stood on Wick's chest
  { t: 'tree_pine', x: 11, y: 29 }, { t: 'tree_pine', x: 3, y: 28 }, { t: 'tree_pine', x: 38, y: 31 },
  { t: 'hedge_flowers', x: 16, y: 6 }, { t: 'bush', x: 19, y: 6 }, { t: 'bush', x: 20, y: 6 },
  { t: 'bush', x: 10, y: 20 }, { t: 'bush', x: 35, y: 15 }, { t: 'bush', x: 24, y: 21 },
  { t: 'bush', x: 38, y: 7 }, { t: 'bush', x: 41, y: 3 }, { t: 'bush', x: 36, y: 26 },
  { t: 'bush', x: 13, y: 10 }, { t: 'bush', x: 5, y: 28 }, { t: 'bush', x: 1, y: 22 },
  ...(X1_W ? [{ t: 'lamp_post', x: 1, y: 15, state: 1 }] : []),
];

// ------------------------------------------------------------------ events
const events = [
  trigger('return_enter', 0, 0, 1, 1, 'return_to_willowmere', { on: 'enter' }),
  // doors into every interior (target = the interior's door cell, facing up into the room)
  door('door_home', 4, 15, ['hero_home', 12, 10, 'up']),
  door('door_bakery', 11, 15, ['bakery', 9, 9, 'up']),
  door('door_chapel', 18, 13, ['chapel', 9, 13, 'up']),
  door('door_inn', 33, 12, ['inn', 11, 11, 'up']),
  door('door_library', 38, 22, ['library', 10, 14, 'up']),
  door('door_shop', 13, 25, ['item_shop', 7, 10, 'up']),
  door('door_smithy', 29, 25, ['smithy', 8, 10, 'up']),
  // story triggers
  trigger('fading_sign_trig', 4, 16, 1, 1, 'fading_sign'),
  // H1: the yard slime cut (ep1.js yard_slime): column 12 over every passable row, so the first fight is not walked around
  trigger('yard_slime_trig', 12, 3, 1, 27, 'yard_slime'),
  trigger('south_gate_trig', 20, 28, 2, 1, 'south_gate'),
  trigger('leave_town_trig', 20, 29, 2, 1, 'leave_town'),
  // NPCs (sprites, movement and talk come from npcs.js)
  npc('mael', 24, 17, 'down'),
  npc('tess', 18, 27, 'down'),
  npc('nella', 42, 5, 'right'),
  npc('edda', 32, 5, 'up'),
  npc('holt', 24, 29, 'up'),
  npc('bram', 17, 29, 'up'),
  npc('cobb', 39, 11, 'down'),
  npc('henrietta', 38, 10, 'left'),
  npc('bertha', 40, 12, 'right'),
  npc('wick', 19, 18, 'right'),
  npc('lark', 26, 19, 'left'),
  npc('the_duke', 24, 4, 'left'),
  npc('loaf', 7, 12, 'down'),
  // side quest objects
  object('duck_nest', 23, 3, 'bush', { script: 'duck_nest' }),
  // signs (fade: which flag-driven blank state applies, tile: the kit sign the facade shows)
  sign('sign_bakery', 12, 15, 'sign_bakery', { tile: 'sign_bakery', fade: 'shop' }),
  sign('sign_inn', 35, 12, 'sign_inn', { tile: 'sign_inn', fade: 'inn' }),
  sign('sign_shop', 14, 25, 'sign_shop', { tile: 'sign_item', fade: 'shop' }),
  sign('sign_smithy', 27, 25, 'sign_smithy', { tile: 'sign_smith', fade: 'shop' }),
  sign('sign_library', 37, 22, 'sign_library', { tile: 'sign_library', fade: 'shop' }),
  sign('sign_chapel', 19, 13, 'sign_chapel', { tile: 'sign_chapel' }),
  sign('sign_square', 13, 15, 'sign_square', { fade: 'square', solid: false }),
  sign('town_sign', 20, 29, 'town_sign', { fade: 'gate', solid: false, on: 'interact' }),
  sign('notice_board', 17, 26, 'notice_board', { solid: false }),
  sign('well', 22, 17, 'well', { solid: false }),
  sign('flowerbeds', 31, 4, 'flowerbeds', { solid: false }),
  sign('garden_plaque', 25, 4, 'garden_plaque', { solid: false }),
  // Episode 2 (E2-maps): GONE TO THE FORD. G. nailed on the smithy door while Garrick is at the ford (the door still opens)
  sign('smithy_ford_note', 29, 25, 'smithy_ford_note', { if: 'garrick_at_ford', solid: false }),
  { id: 'ferry_landing', type: 'ferry', x: 45, y: 4, text: 'ferry_landing', to: ['valley', 34, 9, 'left'], rideIf: 'nella_bell_done', solid: false },
  ...(X1_W ? [
    // X1: Orchard Lane gate (a door once first_fight_done, two posts and Holt's notice before); Wick's hole
    door('x1_west_gate', 0, 16, ['x1_downs', 54, 25, 'left'], { w: 1, h: 2, if: 'first_fight_done' }),
    object('x1_orchard_gate', 0, 16, 'signpost', { text: 'x1_orchard_gate', ifNot: 'first_fight_done' }),
    object('x1_orchard_gate_b', 0, 17, 'signpost', { text: 'x1_orchard_gate', ifNot: 'first_fight_done' }),
    // W7: an arrow post beside the arrival cell (1, 16), and one bark
    object('x1_west_post', 1, 18, 'signpost_arrow', { text: 'x1_west_post', if: 'first_fight_done' }),
    trigger('x1_west_hint_w', 0, 13, 6, 7, null, { bark: 'first_west_gate', if: 'first_fight_done' }),
    object('x1_wall_crack', 6, 30, 'wall_cracked', { breakable: 'rock', text: 'x1_wall_crack', h: 2 }),
    chest('x1_chest_wall', 6, 31, 'wood', { item: 'echo_herb', qty: 2, behind: 'x1_wall_crack' }),
  ] : []),
];

export default {
  id: 'willowmere', name: 'Willowmere', area: 'town',
  music: 'willowmere', ambience: 'river_birds', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'grass',
  legend: { '.': 'grass', ',': 'tallgrass', '=': 'dirt', 'o': 'plaza', 's': 'sand', '~': 'water', '-': 'shallow',
    'F': 'fence_wood', 'W': 'wall_low' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [{ x: 20, y: 31, w: 2, h: 1, to: ['valley', 1, 33, 'right'] }],
  marks: {
    home_door: [4, 16], bakery_sign: [12, 13], bakery_door: [11, 16],
    yard: [13, 14],                       // H1: where the yard slime drops in
    well: [22, 17], bell_tower: [22, 6],
    gate_inner: [20, 28], town_sign: [20, 29],
    return_spot: [22, 19], meet_holt: [22, 21],
    gather_garrick: [29, 26], meet_garrick: [24, 20],
    gather_iris: [38, 23], meet_iris: [24, 18],
    gather_oren: [11, 16], meet_oren: [20, 20],
    gather_hazel: [4, 16], meet_hazel: [20, 18],
    gather_mael: [18, 13], meet_mael: [22, 16],
    ...(X1_W ? { west_gate: [1, 16] } : {}),
  },
  start: { x: 20, y: 24, dir: 'up' },
};
