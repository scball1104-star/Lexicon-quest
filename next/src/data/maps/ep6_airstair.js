// The Airstair (26 x 46, field, clear day). EPISODE6_PLAN 4.1 and 5.1; exact cells and the bot's route in
// docs/MAPS_EP6_A.md section 2.
//
// A black basalt sea stack under the skyport, plank landings bolted to its south face, rope stairs up the faces between
// them, the great chain (overhead decor) hanging through the gaps from the skyport into the sea. Bottom (south) to top:
//   The foot (rows 43..45): the plank quay round the stack's base and a short jetty (6..10, 44..45) beside Yara's ship
//      (moored in the sea, west). stack_foot (12,43) is where the berth's boat lands; the boat door stack_boat
//      (12..13, 44) sails back to Saffron Haven's water stairs from airstair_arrived; airstair_foot on enter. A wood chest
//      (hi_potion x2) at the quay's east end (20,43).
//   Landing 1 (rows 37..39): a rope stair (8, 40..42) up from the quay. mira_trig is the whole column x 12: mira_asks, Bram
//      a landing below at bram_rope (9,43). No foe.
//   Landing 2 (rows 30..33): a rope stair (18, 34..36) up. fight_row is the whole column x 11 (if mira_asked):
//      airstair_fight, the scripted e6a_first; the harriers drop in at foes_drop (8,31) / foes_drop_b (8,32). After the
//      fight one placed group (e6a_wolves) wanders the west end.
//   Landing 3 (rows 22..26): **Lesson A (ride).** A rope stair (4, 27..29) up to the west deck (2..8), open sky north of
//      it; the stair breaks: a slot of cloudbank six wide (9..14, rows 19..29) with the great chain hanging in it (its
//      foot bolted to landing 2 at chain_foot (12,30)), and the east ledge (15..22) beyond. Lane A, row 23, x 9..14 '>' lands on (15,23); lane A2, row 25, x 9..14 '<' brings the party back to
//      (8,25). first_trig is the whole column x 6 (first_gust: Ilex in his harness at ilex_rope (7,22)). From the
//      approach (the stair's top, (4,26)) the deck, both streams with their chevrons and the far ledge share one phone
//      screen (MAPS_EP6_A.md 2.3).
//   Landing 4 (rows 15..18): a rope stair (19, 19..21) up from the east ledge. **Lesson B (a post stops you).** Lane B,
//      column x 15, rows 14..7 '^', from the deck's north edge (15,15) to the top deck (15,6), with the mooring post mo_b
//      on its third cell (15,12) beside the side ledge (13..14, 11..13): the ride stops at the post; step off west to the
//      ledge's wood chest (dead_letter #1, letter_1_found, while letters_started; else hi_ether), or step north and ride
//      on to the top. Lane B2, column x 17, rows 7..14 'v', carries the party from the top back down to (17,15). East of
//      the deck a basalt outcrop (20..23, 12..17) with a cracked face (21,16..17): Dash Strike opens it to the iron chest
//      in the pocket (21,13). One group (e6a_mixed).
//   The top (rows 0..6): the skyport's first paving (13..20), Bennet's winch stall (bennet_winch (19,2)), isles_trig the
//      whole row y 4 (isles_view; the decal isles_far over the cloud west, storm_far north-east, both overhead). The exit
//      north (16..17, 0) to Zephyr Landing's south stair.
// wind: four lanes (A, A2, B, B2), no vane, kind 'open'.
import { grid, box, put, rows, hash01, sign, object, trigger, enemy, chest, enter, npc } from './_kit.js';

const W = 26, H = 46;
const g = grid(W, H, '~');

// ---------------------------------------------------------------- terrain
// the sea round the stack's base, the cloud above it
box(g, 0, 37, 25, 45, 's');
// the top: the skyport's first paving, the exit north
box(g, 13, 1, 20, 6, 'k'); box(g, 16, 0, 17, 0, 'k');
// the side ledge beside lane B's post
box(g, 13, 11, 14, 13, 'p');
// the outcrop east of landing 4 with the pocket behind its cracked face
box(g, 20, 12, 23, 15, '#'); box(g, 20, 16, 23, 17, '|'); box(g, 21, 13, 22, 14, 'c');
// landing 4 and its face down to the east ledge
box(g, 13, 15, 19, 18, 'p'); box(g, 20, 18, 23, 18, 'p');
box(g, 15, 19, 22, 19, '#'); box(g, 15, 20, 22, 21, '|');
box(g, 13, 19, 14, 19, '~');
// landing 3: the west deck (open sky north of it), the east ledge
box(g, 2, 22, 8, 26, 'p');
box(g, 15, 22, 22, 26, 'p');
// face down to landing 2 (west and east; the slot between them is open cloud)
box(g, 2, 27, 8, 27, '#'); box(g, 2, 28, 8, 29, '|');
box(g, 15, 27, 22, 27, '#'); box(g, 15, 28, 22, 29, '|');
// landing 2, its face, landing 1, the stack's base face, the quay and the jetty
box(g, 2, 30, 22, 33, 'p');
box(g, 2, 34, 22, 34, '#'); box(g, 2, 35, 22, 36, '|');
box(g, 2, 37, 22, 39, 'p');
box(g, 6, 40, 22, 40, '#'); box(g, 6, 41, 22, 42, '|');
box(g, 6, 43, 20, 43, 'p');
box(g, 6, 44, 10, 45, 'p');
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- the wind: four lanes over the cloud
const L = grid(W, H, '.');
for (let x = 9; x <= 14; x++) { put(L, x, 23, '>'); put(L, x, 25, '<'); }      // A (east) and A2 (home)
for (let y = 7; y <= 14; y++) { put(L, 15, y, '^'); put(L, 17, y, 'v'); }      // B (up, the post) and B2 (down)
const lanes = rows(L.map((r) => r));

// ---------------------------------------------------------------- dressing
const ROPE = [[8, 40], [8, 41], [8, 42], [18, 34], [18, 35], [18, 36], [4, 27], [4, 28], [4, 29], [19, 19], [19, 20], [19, 21]];
const overlays = [
  ...ROPE.map(([x, y]) => ({ t: 'rope_stair', x, y })),
];
const CHAIN = (x, yBottom) => ({ t: 'great_chain', x, y: yBottom });
const decor = [
  // skyflowers in the cracks of the old paving at the top (floor decor)
  ...(() => {
    const out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (ground[y][x] === 'k' && hash01(x, y, 61) < 0.07) out.push({ t: 'skyflowers', x, y });
    }
    return out;
  })(),
  // the foot: Yara's ship, the quay
  { t: 'ship_moored', x: 0, y: 45, state: 0 },
  { t: 'bollard', x: 10, y: 45 },
  { t: 'lamp_sky', x: 6, y: 43 },
  // landing 1 and 2
  { t: 'lamp_sky', x: 3, y: 37 }, { t: 'cargo_net', x: 20, y: 37 }, { t: 'windstone', x: 5, y: 37 },
  { t: 'lamp_sky', x: 21, y: 30 }, { t: 'bollard', x: 14, y: 30 }, { t: 'crates_barrels', x: 2, y: 33 },
  // landing 3: a lamp at the west deck, a windsock on the east ledge streaming east (the way the stream goes)
  { t: 'lamp_sky', x: 2, y: 22 }, { t: 'bollard', x: 8, y: 26 },
  { t: 'windsock', x: 22, y: 22 }, { t: 'lamp_sky', x: 15, y: 26 },
  // landing 4
  { t: 'lamp_sky', x: 13, y: 18 }, { t: 'rotor', x: 18, y: 15 },
  // the top: Bennet's winch (the net of goods, the crates), lamps at the head of the stair
  { t: 'cargo_net', x: 18, y: 3 }, { t: 'crates_barrels', x: 13, y: 1 },
  { t: 'lamp_sky', x: 15, y: 1 }, { t: 'lamp_sky', x: 18, y: 1 }, { t: 'windsock', x: 20, y: 6 },
];
// the great chain: down the slot of landing 3 and the chasm of landing 4 (the landings are bolted in front of it)
const overhead = [
  CHAIN(11, 7), CHAIN(11, 14), CHAIN(11, 22), CHAIN(11, 29),
  { t: 'isles_far', x: 0, y: 8 },
  { t: 'storm_far', x: 18, y: 7 },
];

// ---------------------------------------------------------------- events
const LT = 'letters_started';
const events = [
  enter('airstair_enter', 'airstair_foot'),
  // ---- the foot
  { id: 'stack_boat', type: 'door', x: 12, y: 44, w: 2, to: ['ep5_saffron', 10, 27, 'up'], kind: 'boat', sprite: 'boat', if: 'airstair_arrived' },
  sign('sea_stack_sign', 14, 42, 'ep6_sea_stack', { solid: false }),
  sign('chain_sign', 11, 42, 'ep6_great_chain', { solid: false }),
  sign('rope_sign', 9, 42, 'ep6_rope_stair', { solid: false }),
  chest('chest_foot', 20, 43, 'wood', { item: 'hi_potion', qty: 2 }),
  // ---- landing 1: mira_asks (the whole column x 12)
  trigger('mira_trig', 12, 37, 1, 3, 'mira_asks'),
  // ---- landing 2: the scripted fight (the whole column x 11), the plan anchor never stands, the group after the fight
  trigger('fight_row', 11, 30, 1, 4, 'airstair_fight', { if: 'mira_asked' }),
  enemy('e_e6a_first', 8, 31, 'storm_harrier', 'e6a_first', 'guard', { if: 'mira_asked', ifNot: 'mira_asked' }),
  enemy('e_e6a_wolves', 5, 31, 'squall_wolf', 'e6a_wolves', 'wander', { radius: 2, if: 'airstair_fight_done' }),
  // ---- landing 3: lesson A
  trigger('first_trig', 6, 22, 1, 5, 'first_gust'),
  sign('lane_sign', 8, 22, 'ep6_gust_lane', { solid: false }),
  sign('cloud_sign', 2, 26, 'ep6_cloudbank', { solid: false }),
  // ---- landing 4: lesson B, the outcrop
  { id: 'mo_b', type: 'mooring', x: 15, y: 12 },
  chest('chest_post_letter', 13, 12, 'wood', { item: 'dead_letter', qty: 1, flag: 'letter_1_found', if: LT }),
  chest('chest_post', 13, 12, 'wood', { item: 'hi_ether', qty: 1, ifNot: LT }),
  sign('post_sign', 14, 11, 'ep6_mooring_post', { solid: false }),
  object('crack_outcrop', 21, 16, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2, opens: [[21, 16], [21, 17], [21, 15]] }),
  chest('chest_outcrop', 21, 13, 'iron', { behind: 'crack_outcrop' }),
  enemy('e_e6a_mixed', 16, 17, 'squall_wolf', 'e6a_mixed', 'wander', { radius: 2 }),
  // ---- the top
  trigger('isles_trig', 13, 4, 8, 1, 'isles_view'),
  sign('isles_sign', 13, 3, 'ep6_isles_far', { solid: false }),
  sign('winch_sign', 18, 3, 'ep6_winch'),
  npc('bennet_winch', 19, 2, 'down'),
];

export default {
  id: 'ep6_airstair', name: 'The Airstair', area: 'field',
  respawn: 'reentry',
  music: 'high_moor', ambience: 'sky_wind', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'cloudbank',
  legend: {
    '~': 'cloudbank', 's': 'sea_foam', 'p': 'skyplank', 'c': 'skyplank', 'k': 'skyport_paving',
    '#': 'basalt_stack_top', '|': 'basalt_stack_face',
    '.': 'skyplank',   // not in the ground: the floor a Dash-broken crack is carved to (events.js carveOpenings; else `under`, the cloud)
  },
  ground,
  wind: { kind: 'open', lanes },
  overlays,
  decor,
  overhead,
  events,
  exits: [{ x: 16, y: 0, w: 2, h: 1, to: ['ep6_zephyr', 22, 32, 'up'] }],
  marks: {
    // the foot (airstair_foot)
    stack_foot: [12, 43], yara_boat: [6, 44], foot_stage: [8, 44], foot_stage_m: [7, 44], foot_stage_b: [9, 44], chain_foot: [12, 30],
    // landing 1 (mira_asks): Bram a landing below
    mira_rope: [15, 38], mira_stage: [13, 38], bram_rope: [9, 43],
    // landing 2 (airstair_fight)
    fight_row: [11, 31], foes_drop: [8, 31], foes_drop_b: [8, 32],
    // landing 3 (first_gust): Ilex at the slot's edge by the chain, the party two rows below him
    ilex_rope: [7, 22], gust_stage: [7, 24], gust_stage_m: [6, 24], gust_stage_b: [8, 24], lane_a: [8, 23],
    // landing 4: the post's ledge (the lane cell itself is never a mark)
    post_b: [14, 12],
    // the top (isles_view)
    isles_far: [5, 11], storm_far: [22, 9], bennet_winch: [19, 2], north_exit: [16, 1],
  },
  start: { x: 12, y: 43, dir: 'up' },
};
