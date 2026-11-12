// The White Road (33 x 80, field). EPISODE7_PLAN 4.1; exact cells, edge distances and the bot's route in docs/MAPS_EP7_A.md 2.
//
// A pale road climbing north from a frozen lake through black pines to Palehaven's South Icegate, with three stretches the
// North has forgotten: flat white fade across the whole width, crossed only where a name stone holds a path (E7-world's
// `remember` block, src/data/ep7/field/). Bottom (south) to top (north):
//   The lake (y 67 to 79): the Kestrel on the ice (8..13, 72..74; its hull is a solid inspect), the party lands at
//      lake_landing (15,74); the boat door kestrel_back (14,74) back to Zephyr Landing from road_arrived; a wood chest.
//   The Traveler's Wall (9..14, 59..61) on the west side of the road: wall_trig row y 66 runs name_under_ice; Vex kneels at
//      vex_wall (13,62), the party stops on wall_stop (13,65), two clear rows below him.
//   The first bite: fight_row y 57 (if vex_carved) runs road_fight; the wolves drop at foes_drop (14,55) and (17,55).
//   Gap A (fade y 43..48, Lesson A: read, cross): the road climbs a west spur (9..12, 45..48) and the white runs eight cells
//      east (13..20, 45..46) to an east spur (21..24, 43..46). Asta's cairns at (12,48) and (23,46). first_trig y 53 runs
//      first_stone (Sol at sol_twine (15,50), the party on stone_stage (15,52)). From the spur the stone, the gap, its ghost
//      trail and the far spur are one phone screen.
//   Gap B (fade y 31..38, Lesson B: two at once): Bo's path (19..20, 37..38) to a ledge (18..22, 34..36), Nyx's path
//      (19..20, 31..33) off it; reading Nyx lets Asta go, behind. Ilka's path (9..17, 35) west to her ledge (5..8, 34..36)
//      and the iron chest (Torr's plaque #1 from streets_started, else a Hi-Ether): 1 optional decision. The owls on the far
//      side.
//   The high stretch (y 25..30): whiteout_trig y 29 runs whiteout (whiteout_mid (16,26), mira_fade (14,27), bram_fade (18,27)).
//   Gap C (fade y 22..24, Lesson C: let go safely): Senna's path (15..16, 22..24); reading her lets the oldest (Bo) go behind.
//   The Courier's Waystation (22..25, 16..19, door (24,19)) and the Courier's Strongbox round its back corner (26,16, gold 1,500).
//   The Icegate (14..18, 9..12): icegate_trig y 13 runs palehaven_view; the passage's row y 10 is the exit to ep7_palehaven
//      south_gate; the palehaven_far decal hangs in the overhead layer over the unreachable rows above (11..21, 0..6).
// Main path: 4 stone decisions (asta, bo, nyx, senna); Ilka 1 optional. Every path has a cairn at each end, so neither side
// can be stranded and the road walks back down after any reset.
import { grid, box, put, rows, sign, trigger, enter, npc, door, chest, enemy } from './_kit.js';

const W = 33, H = 80;
const g = grid(W, H, 's');

// ---------------------------------------------------------------- the three gaps (the fade crosses the whole width)
box(g, 0, 22, W - 1, 24, 'f');          // Gap C
box(g, 0, 31, W - 1, 38, 'f');          // Gap B
box(g, 0, 43, W - 1, 48, 'f');          // Gap A
box(g, 18, 34, 22, 36, 's');            // Gap B's middle ledge
box(g, 5, 34, 8, 36, 's');              // Ilka's ledge
box(g, 9, 45, 12, 48, 's');             // Gap A's west spur (from the south shore)
box(g, 21, 43, 24, 46, 's');            // Gap A's east spur (to the north shore)

// ---------------------------------------------------------------- the lake
box(g, 3, 68, 29, 78, 'L');
for (const [x0, x1, y] of [[3, 5, 68], [27, 29, 68], [3, 3, 69], [29, 29, 69], [3, 4, 78], [26, 29, 78], [3, 3, 77], [29, 29, 77]]) box(g, x0, y, x1, y, 's');
box(g, 23, 73, 27, 76, 'w');            // the open lead, dark water
put(g, 23, 73, 's'); put(g, 27, 76, 'L');

// ---------------------------------------------------------------- the road (packed ice on firm ground)
const road = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y][x] === 's') put(g, x, y, 'r'); };
road(15, 53, 16, 67);                   // up from the lake
road(10, 51, 16, 52);                   // the jog west to the spur
road(10, 45, 11, 50);                   // up the west spur
put(g, 12, 45, 'r'); put(g, 12, 46, 'r');
road(21, 39, 22, 46);                   // the east spur and up
road(19, 39, 20, 40);
road(19, 34, 20, 36);                   // over the middle ledge
road(19, 27, 20, 30);                   // the north shore of Gap B
road(15, 27, 18, 28);
road(15, 10, 16, 26);                   // the high stretch to the Icegate
road(17, 20, 24, 20);                   // the branch to the Waystation door
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- the stones (remember: capacity 2, five stones)
const P = grid(W, H, '.');
const path = (ch, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(P, x, y, ch); };
path('a', 13, 45, 20, 46);              // Asta: across Gap A, eight cells
path('b', 19, 37, 20, 38);              // Bo: the south shore of Gap B to the ledge
path('n', 19, 31, 20, 33);              // Nyx: the ledge to the north shore
path('i', 9, 35, 17, 35);               // Ilka: the ledge west to her chest (optional)
path('s', 15, 22, 16, 24);              // Senna: across Gap C
const paths = rows(P.map((r) => r));

const stone = (id, letter, x, y, name) => ({ id, type: 'namestone', stone: letter, x, y, name });
const STONES = [
  stone('ns_asta', 'a', 12, 48, 'stone_asta'), stone('ns_asta_n', 'a', 23, 46, 'stone_asta'),
  stone('ns_bo', 'b', 18, 39, 'stone_bo'), stone('ns_bo_n', 'b', 22, 36, 'stone_bo'),
  stone('ns_nyx', 'n', 22, 34, 'stone_nyx'), stone('ns_nyx_n', 'n', 21, 30, 'stone_nyx'),
  stone('ns_ilka', 'i', 18, 36, 'stone_ilka'), stone('ns_ilka_w', 'i', 8, 34, 'stone_ilka'),
  stone('ns_senna', 's', 14, 25, 'stone_senna'), stone('ns_senna_n', 's', 17, 21, 'stone_senna'),
];

// ---------------------------------------------------------------- dressing
// black pines (2 x 4, solid at the foot) ring the road; the treeline at y 12 closes the top either side of the Icegate
const PINES = [
  // the treeline at the Icegate (feet on y 12)
  0, 2, 4, 6, 8, 10, 12, 19, 21, 23, 25, 27, 29, 31].map((x) => [x, 12]).concat([
  // above the treeline (scenery behind the decal's sides)
  [1, 5], [5, 7], [24, 6], [29, 4], [3, 9], [26, 9], [8, 3], [23, 2],
  // the top stretch and the Waystation
  [1, 16], [4, 19], [8, 15], [10, 19], [28, 15], [30, 19], [1, 20], [27, 20],
  // the high stretch
  [2, 27], [6, 29], [10, 27], [25, 29], [29, 26], [31, 29],
  // between Gap A and Gap B
  [2, 40], [6, 42], [13, 40], [26, 41], [30, 39],
  // the south shore of Gap A, the first bite, the wall
  [2, 51], [6, 54], [24, 50], [28, 53], [1, 57], [5, 60], [20, 60], [25, 58], [29, 62], [2, 64], [22, 64], [27, 66], [6, 66],
  // round the lake
  [0, 71], [1, 75], [30, 71], [30, 75],
]);
const decor = [
  ...PINES.map(([x, y]) => ({ t: 'black_pine', x, y })),
  { t: 'icegate', x: 14, y: 12 },
  { t: 'waystation_hut', x: 22, y: 19 },
  { t: 'traveler_wall', x: 9, y: 61 },
  { t: 'kestrel', x: 8, y: 74 },
  { t: 'snowbank', x: 26, y: 15 }, { t: 'snowbank', x: 20, y: 15 },
  { t: 'snowbank', x: 3, y: 46 }, { t: 'snowbank', x: 27, y: 44 },
  { t: 'snowbank', x: 4, y: 25 }, { t: 'snowbank', x: 24, y: 26 },
  { t: 'snowbank', x: 18, y: 63 }, { t: 'snowbank', x: 9, y: 55 }, { t: 'snowbank', x: 21, y: 54 },
  { t: 'snowbank', x: 18, y: 68 }, { t: 'snowbank', x: 6, y: 69 },
  { t: 'bridge_post', x: 17, y: 49 },          // Sol's twine stake
  { t: 'crystal', x: 13, y: 12 },
];
const overhead = [
  { t: 'palehaven_far', x: 11, y: 0 },        // Palehaven and the cathedral beyond the Icegate (palehaven_view pans here)
];

// ---------------------------------------------------------------- events
const events = [
  enter('road_landing', 'ep7_landing'),
  // the lake: the Kestrel's hull (solid, read), the boat home from road_arrived, the wood chest
  sign('kestrel_hull', 8, 72, 'ep7_kestrel_lake', { w: 6, h: 3 }),
  door('kestrel_back', 14, 74, ['ep6_zephyr', 22, 5, 'down'], { kind: 'boat', sprite: 'gangway', if: 'road_arrived' }),
  chest('chest_lake', 26, 70, 'wood', { item: 'hi_potion', qty: 2 }),
  sign('lake_sign', 20, 76, 'ep7_frozen_lake', { solid: false }),
  sign('pine_sign', 2, 64, 'ep7_snowpine'),
  // the Traveler's Wall
  trigger('wall_trig', 0, 66, W, 1, 'name_under_ice', { if: 'road_arrived', ifNot: 'vex_carved' }),
  sign('travelers_wall', 11, 61, 'ep7_travelers_wall'),
  // the first bite: the scripted fight's plan anchor never stands (the scene spawns its own wolves); the group after it
  trigger('fight_row', 0, 57, W, 1, 'road_fight', { if: 'vex_carved', ifNot: 'road_fight_done' }),
  enemy('e_e7w_first', 14, 55, 'rime_wolf', 'e7w_first', 'guard', { if: 'vex_carved', ifNot: 'vex_carved' }),
  enemy('e_e7w_wolves', 25, 55, 'rime_wolf', 'e7w_wolves', 'wander', { radius: 2, if: 'road_fight_done' }),
  // Gap A: Sol at his twine, the first lesson, the white and its trail
  npc('sol', 15, 50, 'down'),
  trigger('first_trig', 0, 53, W, 1, 'first_stone', { if: 'road_arrived', ifNot: 'first_stone_read' }),
  sign('sol_twine_stake', 17, 49, 'ep7_sol_twine'),
  sign('fade_sign', 14, 42, 'ep7_fade', { solid: false }),
  sign('ghost_sign', 13, 47, 'ep7_ghost_trail', { solid: false }),
  // Gap B: the owls on the far side, Ilka's chest (Torr's plaque once he has asked)
  enemy('e_e7w_owls', 26, 28, 'hush_owl', 'e7w_owls', 'wander', { radius: 2 }),
  chest('chest_ilka_plaque', 6, 35, 'iron', { item: 'street_plaque', qty: 1, flag: 'street_1_found', if: 'streets_started' }),
  chest('chest_ilka', 6, 35, 'iron', { item: 'hi_ether', qty: 1, ifNot: 'streets_started' }),
  // the high stretch: the whiteout
  trigger('whiteout_trig', 0, 29, W, 1, 'whiteout', { if: 'first_stone_read', ifNot: 'call_learned' }),
  // the Waystation and the Courier's Strongbox behind it
  door('door_waystation', 24, 19, ['ep7_waystation', 7, 7, 'up']),
  chest('strongbox', 26, 16, 'gold', { gold: 1500 }),
  sign('strongbox_sign', 25, 17, 'ep7_strongbox'),
  // the Icegate
  trigger('icegate_trig', 0, 13, W, 1, 'palehaven_view', { if: 'road_arrived', ifNot: 'saw_palehaven' }),
  sign('icegate_sign', 14, 12, 'ep7_icegate'),
  sign('palehaven_far_sign', 18, 12, 'ep7_palehaven_far'),
  ...STONES,
];

export default {
  id: 'ep7_white_road', name: 'The White Road', area: 'field',
  music: 'high_moor', ambience: 'snow_wind', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'snowfield',
  legend: { 's': 'snowfield', 'f': 'fade', 'r': 'icepath', 'L': 'frozen_lake', 'w': 'lake_water' },
  ground,
  remember: { capacity: 2, paths, goal: ['waystation_door', 'exit'] },
  overlays: [],
  decor,
  overhead,
  events,
  exits: [{ x: 15, y: 10, w: 3, h: 1, to: ['ep7_palehaven', 23, 34, 'up'] }],
  marks: {
    // the lake (ep7_landing)
    lake_landing: [15, 74], landing_stage: [15, 72], landing_stage_m: [14, 72], landing_stage_b: [16, 72],
    aeris_landing: [15, 70], vex_landing: [17, 72], vex_ahead_l: [16, 58],
    // the Traveler's Wall (name_under_ice)
    vex_wall: [13, 62], wall_stop: [13, 65], wall_stop_m: [12, 65], wall_stop_b: [14, 65], vex_ahead: [16, 54],
    // the first bite (road_fight)
    fight_row: [15, 57], foes_drop: [14, 55], foes_drop_b: [17, 55],
    // Gap A (first_stone)
    sol_twine: [15, 50], stone_stage: [15, 52], stone_stage_m: [14, 52], stone_stage_b: [16, 52], gap_a: [16, 45],
    // Gap B
    gap_b: [16, 36], ledge_b: [20, 35], ilka_ledge: [6, 36],
    // the high stretch (whiteout)
    whiteout_mid: [16, 26], mira_fade: [14, 27], bram_fade: [18, 27],
    // Gap C, the Waystation, the Icegate
    gap_c: [16, 23], waystation_door: [24, 20], strongbox: [26, 17], icegate: [16, 11], north_exit: [16, 12],
    palehaven_far: [16, 3],
  },
  start: { x: 15, y: 74, dir: 'up' },
};
