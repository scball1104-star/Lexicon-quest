// The Storm Observatory, I: The Windward Causeways (42 x 30, dungeon, open sky). EPISODE6_PLAN 4.5 and 5.1; exact cells and
// every puzzle's solution in docs/MAPS_EP6_B.md. The teaching floor for gust lanes: sunlit plank decks and stormglass
// platforms floating on cloud, white wind streaming between them, each deck adding one idea (plan 5.1's ladder).
//
//   A  the Recovery Alcove (south): arrival (21,27) from Zephyr Landing's east airstair, the breeze font, the ballast chest,
//      the gangway home (20..22,29), and once obs_f2_done the brass lift (24,25) back up to floor II's Bellows Hall (25,15),
//      the other end of F2's shortcut down. North over the plank bridge (20..21,23) onto the south ledge.
//   B  Two Ways In (puzzle B, where you step in decides where you land): one lane bends round the glass deck from its
//      south-west corner (12,19). Its west arm (column x 12, rows 13..19) blows north: stepped into from the west ledge
//      (x 8..11) it lands the party on the north deck (12,12), the way on. Its south arm (row 19, x 13..23) blows east:
//      stepped into from the south ledge it lands them on the east spur (24,19) and its potion chest; the spur's lane
//      (26,21) then (23..26,22) brings them back. A one-cell gust (10,13) drops from the north deck to the west ledge.
//   C  the First Vane (puzzle C, turn a lane): the boardwalk runs east from the north deck to the near deck (x 34..39,
//      rows 4..12). Its lane (row 7, x 30..33) blows east, into the near deck and away from the relay deck the party needs;
//      vane_c (35,6) turns group a and it blows west. Ride it to the relay deck (x 24..29, rows 3..8): the old signal relay
//      and memory1_trig (column x 29).
//   D  the Post (puzzle D, a post you reach only from one side): group a is the whole Windward Run (row 7): turned, it also
//      blows west from the relay deck (x 8..23), past the key balcony (x 19..22, rows 5..6) without stopping, to the west
//      deck (x 2..7, rows 6..11). There vane_cw (5,8), the same group, turns it back east. Ride in from the west: at (18,7)
//      the Run bends north into the post mo_d (18,6) beside the balcony, which catches the party. A Dash crate (3,12) opens
//      the niche with the Skyhand Boots (and the third dead letter); the Star-Sail Supply Coffer (2,6). Every lane of the
//      group runs along row 7, so every vane of it points the way its lanes blow (east, then west).
//   E  the Upper Deck (x 12..22, rows 1..3): from the post, a step north rides the column (18,4..6) up to it. The lift up
//      (21,1) with lift_trig (21,2) (obs_f1_lift). vane_e (13,1) turns group b: the lane row 2 (x 7..11), blowing in from
//      the dead-end deck (x 2..6, rows 1..3), blows out to it and its letter chest; that deck's gust (4,4..5) drops to the
//      west deck. A one-cell gust (23,3) blows from the upper deck to the relay deck.
//
// Every way home is a ride or a walk that holds in every vane state (qa/maps/ep6_b_maps.test.mjs): in the authored state
// the Run blows home east from the balcony to the relay deck and on to the near deck; vane_cw sets it so from the west
// deck, and the upper deck has the lift.
// Solution for the bot (vane toggles and rides): from the south ledge step north at (12,20) or east from the west ledge
// (11,14..18): the ride lands on the north deck. East along the boardwalk to the near deck: vane_c from (35,7). Step west
// from (34,7): ride to the relay deck (29,7) (memory1_trig). Step west from (24,7): ride the Run to the west deck (7,7).
// vane_cw from (5,9). Step east from (7,7): the post catches the party at (18,6). East onto the balcony: chest_key (22,5)
// from (21,5). Back west onto the post, step north: ride to the upper deck (18,3). lift_trig (21,2), lift_up (21,1).
// Optional: chest_es from (27,16) after the south arm; Dash at crate_d from (3,11) south; vane_e from (13,2), step west from
// (12,2) for the dead-end deck's letter chest (2,2).
import { door, object, trigger, enemy, chest, steps, enter } from './_kit.js';

// ------------------------------------------------------------------------------------------------ the Observatory kit
// Shared by the five Episode 6 maps of this file's family (ep6_obs_f2, ep6_obs_f3, ep6_obs_eyrie, ep6_library import it).
// Pure data helpers.

/**
 * A blank sky grid with its wind layers. set/box write ground chars; lane/laneBox write a base lane arrow; turn writes a
 * group's turned arrow ('x' calm). rows() returns { ground, lanes, turned } as row strings (turned only for used groups).
 */
export function skyGrid(W, H, fill = 'c') {
  const g = Array.from({ length: H }, () => Array(W).fill(fill));
  const L = Array.from({ length: H }, () => Array(W).fill('.'));
  const T = {};
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, ch) => { if (inb(x, y)) g[y][x] = ch; };
  const box = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };
  const lane = (x, y, ch) => { if (inb(x, y)) L[y][x] = ch; };
  const laneBox = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) lane(x, y, ch); };
  const turn = (group, x, y, ch) => {
    if (!T[group]) T[group] = Array.from({ length: H }, () => Array(W).fill('.'));
    if (inb(x, y)) T[group][y][x] = ch;
  };
  const turnBox = (group, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) turn(group, x, y, ch); };
  const rows = () => {
    const r = (a) => a.map((row) => row.join(''));
    const turned = {};
    for (const [k, v] of Object.entries(T)) turned[k] = r(v);
    return { ground: r(g), lanes: r(L), turned };
  };
  return { W, H, g, L, T, inb, set, box, lane, laneBox, turn, turnBox, rows };
}

/** A weathervane (outdoors) or a fan and lever (indoors: sprite fan_vane) that turns its group. */
export const vane = (id, x, y, group, extra = {}) => ({ id, type: 'vane', x, y, group, ...extra });
/** A mooring post on a lane cell: a ride stops on its cell. */
export const mooring = (id, x, y, extra = {}) => ({ id, type: 'mooring', x, y, ...extra });
/** The wind font (rest and save: font_wind, 2 x 1). */
export const windFont = (id, x, y, extra = {}) =>
  ({ id, type: 'font', x, y, w: 2, h: 1, text: 'ep6_breeze_font', sprite: 'font_wind', safe: true, ...extra });
/** An Observatory lift: a door of kind lift; the brass cage is drawn as decor on the same cell (lift_brass). */
export const lift = (id, x, y, to, extra = {}) => ({ id, type: 'door', x, y, to, kind: 'lift', ...extra });
/** A lamp pool (Lighting) at a cell: r in tiles. */
export const glow = (id, x, y, r, extra = {}) => ({ id, type: 'light', x, y, r, color: '#ffd27a', ...extra });

// ------------------------------------------------------------------------------------------------ the floor
const W = 42, H = 30;
const S = skyGrid(W, H, 'c');
const { box, lane, laneBox, turnBox } = S;

// decks ('p' skyplank, 'g' stormglass, 'b' skybridge)
box(18, 24, 24, 28, 'p');                 // A  the Recovery Alcove
box(20, 29, 22, 29, 'b');                 //    the gangway home
box(20, 23, 21, 23, 'b');                 //    the bridge north to the south ledge
box(12, 20, 22, 22, 'p');                 // B  the south ledge
box(8, 14, 11, 22, 'p');                  //    the west ledge
box(9, 9, 22, 12, 'p');                   //    the north deck
box(13, 13, 21, 18, 'g');                 //    the glass deck the lane bends round
box(24, 15, 28, 20, 'p');                 //    the east spur
box(23, 11, 33, 12, 'b');                 // C  the boardwalk east
box(34, 4, 39, 12, 'p');                  //    the near deck
box(24, 3, 29, 8, 'g');                   //    the relay deck
box(19, 5, 22, 6, 'g');                   // D  the key balcony
box(2, 6, 7, 11, 'p');                    //    the west deck
box(3, 12, 3, 13, 'p');                   //    the neck behind the Dash crate
box(2, 14, 5, 16, 'p');                   //    the niche
box(12, 1, 22, 3, 'p');                   // E  the upper deck
box(2, 1, 6, 3, 'p');                     //    the dead-end deck

// lanes (base = the authored state)
laneBox(12, 13, 12, 19, '^');             // B  the west arm (lands 12,12)
laneBox(13, 19, 23, 19, '>');             //    the south arm (lands 24,19)
lane(10, 13, 'v');                        //    north deck -> west ledge (lands 10,14)
lane(26, 21, 'v'); laneBox(23, 22, 26, 22, '<');   // the east spur home (lands 22,22)
laneBox(30, 7, 33, 7, '>');               // C  group a: east into the near deck (lands 34,7)
turnBox('a', 30, 7, 33, 7, '<');          //    turned: west to the relay deck (lands 29,7)
laneBox(8, 7, 23, 7, '>'); lane(18, 7, '^');      // D  the Windward Run, group a: east, bending north at (18,7)
turnBox('a', 8, 7, 23, 7, '<');           //    turned: west the whole way (lands 7,7)
laneBox(18, 4, 18, 6, '^');               //    the post's column up to the upper deck (lands 18,3)
laneBox(7, 2, 11, 2, '>');                // E  group b: the dead-end deck -> the upper deck (lands 12,2)
turnBox('b', 7, 2, 11, 2, '<');           //    turned: out to the dead-end deck (lands 6,2)
laneBox(4, 4, 4, 5, 'v');                 //    the dead-end deck -> the west deck (lands 4,6)
lane(23, 3, '>');                         //    the upper deck -> the relay deck (lands 24,3)

const R = S.rows();

// ---------------------------------------------------------------- dressing (no prop on a lane's landing cell or a post)
const decor = [
  // A: the alcove
  { t: 'windsock', x: 18, y: 27 }, { t: 'bollard', x: 24, y: 28 }, { t: 'bollard', x: 18, y: 28 },
  { t: 'skyflowers', x: 23, y: 27 }, { t: 'windstone', x: 24, y: 27 }, { t: 'lift_brass', x: 24, y: 25, if: 'obs_f2_done' },
  // B
  { t: 'bollard', x: 8, y: 22 }, { t: 'rotor', x: 22, y: 9 }, { t: 'bollard', x: 28, y: 20 }, { t: 'windsock', x: 21, y: 13 },
  { t: 'cargo_net', x: 14, y: 22 }, { t: 'windstone', x: 8, y: 14 }, { t: 'skyflowers', x: 16, y: 16 },
  { t: 'skyflowers', x: 10, y: 19 }, { t: 'windstone', x: 13, y: 9 },
  // C
  { t: 'bollard', x: 39, y: 12 }, { t: 'rotor', x: 39, y: 4 }, { t: 'signal_lamp', x: 28, y: 3, state: 1 },
  { t: 'windsock', x: 24, y: 8 }, { t: 'cargo_net', x: 37, y: 4 },
  // D
  { t: 'bollard', x: 7, y: 11 }, { t: 'windstone', x: 5, y: 16 },
  // E
  { t: 'lift_brass', x: 21, y: 1 }, { t: 'rotor', x: 22, y: 1 }, { t: 'bollard', x: 6, y: 1 }, { t: 'windsock', x: 12, y: 3 },
];

const events = [
  enter('f1_enter', 'obs_f1_arrival'),
  // ---- A: the Recovery Alcove
  door('to_zephyr', 20, 29, ['ep6_zephyr', 44, 6, 'left'], { w: 3, kind: 'stairs', if: 'obs_entered' }),
  windFont('font_w1', 22, 25),
  chest('chest_a', 18, 25, 'wood', { item: 'ballast_stone', qty: 2 }),
  object('chimes_a', 19, 24, 'chimes', { text: 'ep6_chimes_tied' }),
  lift('lift_f2_back', 24, 25, ['ep6_obs_f2', 25, 15, 'down'], { if: 'obs_f2_done' }),   // the shortcut's way back up (the Bellows Hall)
  // ---- B: Two Ways In
  chest('chest_es', 28, 16, 'wood', { item: 'hi_potion', qty: 2 }),
  chest('chest_b', 20, 14, 'iron'),
  object('chimes_b', 9, 9, 'chimes', { text: 'ep6_chimes_tied' }),
  enemy('e_wl', 9, 17, 'gale_sprite', 'e6o1_sprites', 'patrol', { path: steps('up', 2, 'down', 2) }),
  enemy('e_nd', 16, 10, 'rigger_beetle', 'e6o1_beetles', 'guard'),
  enemy('e_es', 26, 17, 'squall_wolf', 'e6o1_mixed', 'guard'),
  // ---- C: the First Vane
  vane('vane_c', 35, 6, 'a'),
  object('chimes_c', 38, 9, 'chimes', { text: 'ep6_chimes_tied' }),
  enemy('e_nc', 37, 11, 'squall_wolf', 'e6o1_mixed', 'patrol', { path: steps('left', 1, 'right', 1) }),
  object('relay_old', 26, 3, 'relay', { text: 'ep6_relay', state: 0 }),
  trigger('memory1_trig', 29, 3, 1, 6, 'aeris_memory_1'),
  // ---- D: the Post
  mooring('mo_d', 18, 6),
  chest('chest_key', 22, 5, 'gold', { item: 'compass_key', flag: 'compass_key_found' }),
  vane('vane_cw', 5, 8, 'a'),
  chest('coffer_d', 2, 6, 'iron'),
  object('crate_d', 3, 12, 'wall_cracked', { breakable: 'rock', text: 'ep6_dash_crate', h: 2, opens: [[3, 12], [3, 13]] }),
  chest('chest_boots', 2, 15, 'gold', { item: 'skyhand_boots', behind: 'crate_d' }),
  chest('chest_letter3', 4, 15, 'wood', { item: 'dead_letter', flag: 'letter_3_found', if: 'letters_started', behind: 'crate_d' }),
  chest('chest_letter3_alt', 4, 15, 'wood', { item: 'hi_ether', ifNot: 'letters_started', behind: 'crate_d' }),
  enemy('e_wd', 6, 10, 'gale_sprite', 'e6o1_sprites', 'guard'),
  // ---- E: the Upper Deck
  vane('vane_e', 13, 1, 'b'),
  chest('chest_letter2', 2, 2, 'wood', { item: 'dead_letter', flag: 'letter_2_found', if: 'letters_started' }),
  chest('chest_letter2_alt', 2, 2, 'wood', { item: 'hi_ether', ifNot: 'letters_started' }),
  enemy('e_e', 16, 2, 'storm_harrier', 'e6o1_harriers', 'patrol', { path: steps('right', 1, 'left', 1) }),
  trigger('lift_trig', 21, 2, 1, 1, 'obs_f1_lift'),
  lift('lift_up', 21, 1, ['ep6_obs_f2', 6, 26, 'up']),
];

export default {
  id: 'ep6_obs_f1', name: 'The Windward Causeways', area: 'dungeon',
  music: 'storm_observatory', ambience: 'sky_wind', tileset: 'ep6',
  lighting: { tint: 'none', dark: 0 },
  under: 'cloudbank',
  legend: { c: 'cloudbank', p: 'skyplank', g: 'stormglass', b: 'skybridge', '.': 'skyplank' },   // '.': the floor a Dash carves (carveOpenings), never the cloud
  ground: R.ground,
  wind: { kind: 'open', lanes: R.lanes, turned: R.turned },
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [21, 27], alcove: [21, 27], font: [22, 26], ways_in: [14, 17],
    west_in: [11, 16], south_in: [16, 20], north_deck: [12, 12], east_spur: [24, 19],
    vane_c: [35, 7], near_in: [34, 7],
    relay_old: [26, 3], relay_stage: [26, 6], relay_stage_m: [25, 6], relay_stage_b: [27, 6], relay_aeris: [26, 4], relay_lamp: [28, 4],
    run_in: [24, 7], west_deck: [7, 7], vane_cw: [5, 9], post_d: [18, 6], key_deck: [21, 5],
    upper_deck: [18, 2], lift_up: [21, 2], vane_e: [13, 2], dead_end: [3, 2], dash_at: [3, 11],
  },
  start: { x: 21, y: 27, dir: 'up' },
};
