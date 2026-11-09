// The Caravan Road (52 x 28, field, open sky, start hour noon). EPISODE5_PLAN 4.2 and 5.1; exact cells and the solution for
// the autoplay bot in docs/MAPS_EP5_A.md section 3.
//
// A paved caravan road (caravan_paving, rows 12..14) runs east over firm dunes from a stone jetty to the last dune above
// Saffron Haven. Four stretches, west to east:
//   The Jetty (x 0..11): the stone pier (x 0..5, rows 12..14) where the gangway lands (jetty (2,13)); the Saffron Wind
//      moored in the bay north of it until the party reaches the Haven; the dead caravan camp (tent, fire pit, loads) with
//      the wood chest (hi_potion x2); one group on the dunes south of the road.
//   The Glass Flat (x 12..26): a band of running sand five wide (x 17..21) from the top of the map to the bottom: the
//      only way east. road_trig is the whole column x 12. West of the flat the dial dial_road (14,10) on its paved apron.
//      **Lesson A (one dial, one shadow).** The obelisk ob_flat (h 3) stands at (23,13) on the east plaza with ONE paving
//      cell (22,13) between it and the sand (WORLD_EP5's first trap: a shadow bridge starts at its caster, so it must
//      end on a cell the party can step off onto). Noon (the start): its shadow lies north on the plaza, (23,10..12), and
//      Omar sits in it at omar_spot (23,10), above the obelisk's sprite (the cells (23,11..12) behind it hold nothing);
//      the whole flat runs. Dawn: the shadow lies west six cells, (17..22, 13), the firm bridge on the road's row. Dusk:
//      east along the road. Flat, obelisk, dial and the far road share one screen from the dial (phone frame
//      ep5_caravan_road_flat_dawn_phone.png).
//      **Lesson B (the hours are a choice).** North of the road the sand island (18..20, 5..6) with its palm and chest.
//      Two standing stones on paved plinths make a two-step stair of noon shadows from the west bank: ss_step (17,10)
//      shades (17,8..9), ss_isle (18,9) shades (18,7..8): bank (16,8) -> (17,8) -> (18,8) -> (18,7) -> the island (18,6).
//      Noon is the start hour, so the stair is there on arrival; dawn throws both shadows onto the bank (one dead-end cell
//      (17,9)), dusk lays a firm patch (18..21, 9..10) that only touches the east bank and leads nowhere.
//      The chest: caravan_bell #1 (flag bell_1_found) while bells_started, else hi_ether (two events, one cell).
//      dial_road_e (27,15) on the east side: a party coming back from the Haven (the hour resets to noon) can set dawn.
//   Omar's shade tent (x 27..36): the striped awning (29..31, 9..11), the campfire tent_fire (30,12: tent_rest, safe,
//      rest) with Omar's seat fire_omar (30,11) behind it and the party's marks two rows below him, either side of the fire (30,13); the safe stones; two
//      groups on the dunes.
//   The Last Dune (x 37..51): the old cistern (38..42, 16..21), a sandstone ruin whose cracked face (40,20) Dash Strike
//      opens to the iron chest (40,17); the road climbs to the crest (rows 6..9); haven_view is the whole column x 44
//      (rows 6..27); the decal haven_far over the drop beyond the crest (overhead (41,0)); the exit east (x 51, rows 6..9)
//      to Saffron Haven's south gate.
import { grid, box, put, rows, hash01, sign, object, trigger, enemy, chest, enter, npc } from './_kit.js';

const W = 52, H = 28;
const g = grid(W, H, 'd');
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// ---------------------------------------------------------------- terrain
// the sea on the west, a bay north of the jetty for the ship
box(g, 0, 0, 3, 27, 'w');
box(g, 4, 3, 6, 11, 'w');
put(g, 4, 2, 'w'); put(g, 4, 15, 'w'); put(g, 4, 16, 'w'); put(g, 4, 21, 'w'); box(g, 4, 23, 5, 27, 'w');
// the jetty and the west road
box(g, 0, 12, 5, 14, 'p');
box(g, 6, 12, 16, 14, 'p');
put(g, 9, 11, 'p'); put(g, 10, 15, 'p');                  // ragged edges where the sand drifts back
// the dial's paved apron
box(g, 13, 10, 15, 11, 'p');
// the Glass Flat: dune sand on the ground (firm when shaded, running_sand when lit: the shade block below)
box(g, 17, 0, 21, 27, 's');
put(g, 17, 10, 'p'); put(g, 18, 9, 'p');                  // the two stones' plinths
box(g, 18, 5, 20, 6, 'p');                                // the island
// the east plaza round the obelisk, the road on east, Omar's camp, the east dial's apron
box(g, 22, 9, 26, 15, 'p');
box(g, 27, 13, 38, 15, 'p');
box(g, 28, 8, 34, 12, 'p');
box(g, 26, 15, 28, 16, 'p');
// the road climbs to the crest and runs along it to the exit
box(g, 39, 12, 41, 14, 'p'); box(g, 40, 10, 42, 11, 'p'); box(g, 41, 8, 43, 9, 'p');
box(g, 42, 7, 51, 8, 'p');
// the drop beyond the last dune (under the decal), the crest's edge
box(g, 41, 0, 51, 5, 'v');
put(g, 40, 0, 'v'); put(g, 40, 1, 'v');
// the old cistern: a sandstone ruin, top band rows 16..19, its south face rows 20..21; a pocket inside behind the crack
box(g, 38, 16, 42, 19, '#');
box(g, 38, 20, 42, 21, '|');
box(g, 39, 17, 41, 18, 'c');
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- the shade block (open sky, start noon)
const sand = grid(W, H, '.');
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ground[y][x] === 's') put(sand, x, y, 's');

// ---------------------------------------------------------------- dressing
const SAFE_STONES = [[33, 16], [35, 17], [37, 16], [39, 15], [41, 15], [43, 13], [44, 11], [45, 10]];
const overlays = [
  // tufts of dry grass and pebbles on the dunes, kept off the road and the flat
  ...(() => {
    const out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (ground[y][x] !== 'd') continue;
      const h = hash01(x, y, 51);
      if (h < 0.035) out.push({ t: h < 0.018 ? 'tuft_0' : 'tuft_1', x, y });
      else if (h < 0.06) out.push({ t: 'pebbles_' + (Math.floor(hash01(x, y, 52) * 3)), x, y });
    }
    return out;
  })(),
  // the safe stones Omar sets out every morning (small white stones across the dune toward the crest)
  ...SAFE_STONES.map(([x, y], i) => ({ t: i % 2 ? 'pebbles_1' : 'pebbles_0', x, y })),
];
const decor = [
  // the jetty's mooring posts and the dead camp
  { t: 'mooring_post', x: 1, y: 15 }, { t: 'mooring_post', x: 3, y: 15 }, { t: 'mooring_post', x: 2, y: 11 },
  { t: 'tent_caravan', x: 7, y: 10 },                     // (7..9, 10)
  { t: 'camel_load', x: 8, y: 8 }, { t: 'camel_load', x: 11, y: 8 },
  { t: 'water_jars', x: 7, y: 15 },
  // palms along the shore and by the flat
  { t: 'palm', x: 5, y: 1 }, { t: 'palm', x: 6, y: 18 }, { t: 'palm', x: 8, y: 23 }, { t: 'palm', x: 14, y: 3 },
  { t: 'palm', x: 20, y: 5 },                             // on the island
  { t: 'palm', x: 11, y: 21 }, { t: 'palm', x: 25, y: 4 }, { t: 'palm', x: 24, y: 21 },
  // the east plaza, the camp
  { t: 'water_jars', x: 26, y: 9 },
  { t: 'tent_omar', x: 29, y: 11 },                       // poles (29,11) and (31,11), the awning over rows 9..10
  { t: 'water_jars', x: 32, y: 10 }, { t: 'camel_load', x: 34, y: 9 }, { t: 'camel_rest', x: 33, y: 11 },
  // the last dune
  { t: 'palm', x: 37, y: 9 }, { t: 'palm', x: 36, y: 23 }, { t: 'palm', x: 43, y: 17 }, { t: 'palm', x: 47, y: 22 },
  { t: 'camel_load', x: 49, y: 14 }, { t: 'palm', x: 50, y: 11 },
];

// ---------------------------------------------------------------- events
const B1 = 'bells_started';
const events = [
  enter('road_enter', 'road_landing'),
  // ---- the jetty
  object('ship_jetty', 0, 11, 'ship_moored', { state: 0, solid: false, text: 'ep5_ship_moored', ifNot: 'haven_arrived' }),
  sign('jetty_sign', 3, 15, 'ep5_jetty'),
  sign('camp_sign', 7, 10, 'ep5_dead_camp'),
  chest('chest_jetty', 10, 10, 'wood', { item: 'hi_potion', qty: 2 }),
  enemy('e_e5r_stalkers', 9, 20, 'dune_stalker', 'e5r_stalkers', 'wander', { radius: 2 }),
  // ---- the Glass Flat
  trigger('road_trig', 12, 0, 1, H, 'road_shade'),
  { id: 'dial_road', type: 'sundial', x: 14, y: 10, free: true },
  { id: 'ob_flat', type: 'standstone', x: 23, y: 13, h: 3 },
  sign('obelisk_sign', 23, 13, 'ep5_obelisk', { solid: false }),
  sign('flat_sign', 16, 15, 'ep5_glass_flat', { sprite: 'signpost' }),
  npc('omar', 23, 10, 'down'),
  { id: 'ss_step', type: 'standstone', x: 17, y: 10, h: 2 },
  { id: 'ss_isle', type: 'standstone', x: 18, y: 9, h: 2 },
  chest('chest_isle_bell', 19, 5, 'wood', { item: 'caravan_bell', qty: 1, flag: 'bell_1_found', if: B1 }),
  chest('chest_isle', 19, 5, 'wood', { item: 'hi_ether', qty: 1, ifNot: B1 }),
  { id: 'dial_road_e', type: 'sundial', x: 27, y: 16, free: true },
  // ---- Omar's tent
  object('tent_fire', 30, 12, 'campfire_desert', { script: 'tent_rest', safe: true, rest: true }),
  sign('tent_sign', 29, 11, 'ep5_tent'),
  sign('safe_stones_sign', 35, 17, 'ep5_safe_stones', { solid: false }),
  enemy('e_e5r_scarabs', 31, 20, 'dune_scarab', 'e5r_scarabs', 'wander', { radius: 2 }),
  enemy('e_e5r_mixed', 36, 5, 'dune_stalker', 'e5r_mixed', 'wander', { radius: 2 }),
  // ---- the last dune: the cistern's cracked face and the iron chest behind it
  object('crack_cistern', 40, 20, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2, opens: [[40, 20], [40, 21], [40, 19]] }),
  chest('chest_cistern', 40, 17, 'iron', { behind: 'crack_cistern' }),
  trigger('haven_view_trig', 44, 6, 1, 22, 'haven_view'),
  sign('haven_far_sign', 46, 5, 'ep5_haven_far', { solid: false }),
];

export default {
  id: 'ep5_caravan_road', name: 'The Caravan Road', area: 'field',
  respawn: 'reentry',
  music: 'ash_road', ambience: 'desert_wind', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'dune_sand',
  legend: {
    'd': 'dune_sand', 's': 'dune_sand', 'p': 'caravan_paving', 'c': 'caravan_paving', 'w': 'water',
    '#': 'dune_court_top', '|': 'dune_court_face', 'v': 'dune_court_out_top',
  },
  ground,
  shade: { hour: 'noon', sand: rows(sand.map((r) => r)) },
  overlays,
  decor,
  overhead: [{ t: 'haven_far', x: 41, y: 0 }],
  events,
  exits: [{ x: 51, y: 6, w: 1, h: 4, to: ['ep5_saffron', 21, 30, 'up'] }],
  marks: {
    jetty: [2, 13], yara_jetty: [1, 13], jetty_stage: [3, 13], jetty_stage_m: [3, 12], jetty_stage_b: [3, 14], jetty_end: [0, 13],
    flat: [19, 13], dial: [14, 10], omar_spot: [23, 10], isle: [19, 6],
    fire: [30, 12], fire_omar: [30, 11], fire_stage: [30, 13], fire_stage_m: [29, 13], fire_stage_b: [31, 13],
    last_dune: [44, 8], haven_far: [46, 3], east_exit: [50, 7],
  },
  start: { x: 2, y: 13, dir: 'right' },
};
