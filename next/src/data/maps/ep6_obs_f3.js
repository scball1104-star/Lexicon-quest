// The Storm Observatory, III: The Eye of the Storm (36 x 40, dungeon, tint storm, dark 0.5). EPISODE6_PLAN 4.7 and 5.1;
// exact cells and every solution in docs/MAPS_EP6_B.md. A white stone spire climbing through the inside of the storm,
// bottom (south) to top (north): three landings, each a block of the spire (x 15..20) ringed by a ring lane over slate
// cloud, a post at each landing's stair, a signal lamp dark until the party lights it.
//
//   The first landing (x 8..27, rows 32..37): arrival (18,35) from floor II's lift (lift_down 10,32 goes back), the font
//      font_w3, the Kestrel's berth on the west (aeris_turns). Lit by the landing lamp.
//   Anchor (puzzle: a ring and a post): the ring (x 14..21, rows 27..31) runs clockwise; step in from the landing anywhere
//      on its south row and it carries the party up its west side and along its north row to the post mo_anchor (17,27)
//      under the stair. North onto the Anchor deck (x 11..21, rows 24..26): lamp_anchor (19,24), the Pilot's Charter. The
//      ring spills at (21,31) back onto the landing: from the post, a step on (east) is the way home.
//   Listen (puzzle: a ring that turns): the ring (x 14..21, rows 19..23) runs clockwise and spills west at (14,21) onto the
//      west ledge (x 11..13, rows 21..23): its only post mo_listen (17,19) lies on the stretch the ride never reaches from
//      the deck. vane_listen (12,24) turns group a: counter-clockwise, the ring is closed and every ride ends at the post.
//      North onto the Listen deck (x 13..22, rows 16..18): lamp_listen (14,16). Off the west ledge, the hidden Keeper
//      bridge (8..10,22, Lantern) to the Windborne Spear (6,22).
//   The broken causeway (x 16..18, rows 12..15; west edge broken at rows 13..14): fall_trig (row 15, vex_falls), Vex at
//      vex_edge (17,12), the party two clear rows below on party_stop_fall (17,15), Bram's line from bram_line (18,13) to
//      vex_hang (19,13) over cloud.
//   Return (puzzle: two halves of one ring): the ring (x 14..21, rows 7..11) is open at the causeway (16..18,11) and parted
//      at the top by a stone (17..18,7). Its west half (group c, vane_r_w at 18,11) blows down to the causeway; turned it
//      blows up the west side to the stone. Its east half (group b, vane_r_e at 17,6 on the stone) blows up to the stone;
//      turned it blows down the east side to the far post mo_return (21,10). Both halves the same way round (clockwise):
//      a full circuit from the causeway to the post. East off the post onto the east deck (x 22..26, rows 8..11):
//      lamp_return (25,8). North up the stair (24..25, 6..7) to the beacon platform.
//   The beacon platform (x 12..26, rows 3..5): Pippa's crates and lamp (pippa_spot 15,3), beacon_trig (column x 23),
//      beacon_font once pippa_found, the Sky Compass Keyhole door_scribe (21..23,2) to the Eyrie.
//   The long gust (column x 27, rows 9..31) blows from the east deck and the Listen deck's east stair straight down to the
//      landing (27,32): the way home from the top in every vane state.
// Solution for the bot: step north onto the Anchor ring from (16,32): the post (17,27). North to (17,26); lamp_anchor from
// (19,25). vane_listen from (12,25); step north from (16,24): the post (17,19). North to (17,18); lamp_listen from (14,17).
// North across fall_trig (16..18,15). vane_r_w from (17,11); step west from (16,11): land on the stone (17,7). vane_r_e
// from (17,7); step east from (18,7): the post (21,10). East to (22,10); lamp_return from (25,9). North up the stair to the
// platform, west across beacon_trig. door_scribe from (22,3) with the Sky Compass Key. Optional: with the Lantern, west
// from (11,22) over the bridge to chest_spear (6,22).
import { door, sign, object, trigger, enemy, chest, book, lockedDoor, enter } from './_kit.js';
import { skyGrid, vane, mooring, windFont, lift, glow } from './ep6_obs_f1.js';

const W = 36, H = 40;
const S = skyGrid(W, H, 'c');
const { set, box, lane, laneBox, turn, turnBox } = S;

// ground ('c' storm_cloud, '.' spire_stone, '#' / '|' the spire's walls)
box(19, 0, 25, 0, '#'); box(19, 1, 25, 2, '|');   // the crown: the keyhole's face
box(12, 3, 26, 5, '.');                   // the beacon platform
set(17, 6, '.');                          // the stone's neck (vane_r_e)
box(17, 7, 18, 7, '.');                   // Return: the stone that parts the ring
box(15, 8, 20, 8, '#'); box(15, 9, 20, 10, '|');  //         the spire block
box(16, 11, 18, 11, '.');                 //         the ring's open foot (the causeway's head)
box(22, 8, 26, 11, '.');                  //         the east deck
box(24, 6, 25, 7, '.');                   //         the stair up to the platform
box(16, 12, 18, 15, '.'); box(16, 13, 16, 14, 'c');   // the broken causeway
box(13, 16, 22, 18, '.');                 // Listen: the deck
box(23, 17, 26, 18, '.');                 //         its east stair to the long gust
box(15, 20, 20, 20, '#'); box(15, 21, 20, 22, '|');  //         the spire block
box(11, 21, 13, 23, '.');                 //         the west ledge
box(5, 21, 7, 23, '.');                   //         the Keeper's island (the Windborne Spear)
box(11, 24, 21, 26, '.');                 // Anchor: the deck
box(15, 28, 20, 28, '#'); box(15, 29, 20, 30, '|');  //         the spire block
box(8, 32, 27, 37, '.');                  // the first landing

// lanes (base = the authored state)
// Return, west half (group c): down to the causeway; turned, up to the stone
lane(16, 7, '<'); lane(15, 7, '<'); lane(14, 7, 'v'); laneBox(14, 8, 14, 10, 'v'); lane(14, 11, '>'); lane(15, 11, '>');
turn('c', 15, 11, '<'); turn('c', 14, 11, '^'); turnBox('c', 14, 8, 14, 10, '^'); turn('c', 14, 7, '>'); turn('c', 15, 7, '>'); turn('c', 16, 7, '>');
// Return, east half (group b): up to the stone; turned, down to the post
laneBox(21, 8, 21, 10, '^'); lane(21, 7, '<'); lane(20, 7, '<'); lane(19, 7, '<');
turn('b', 19, 7, '>'); turn('b', 20, 7, '>'); turn('b', 21, 7, 'v'); turnBox('b', 21, 8, 21, 10, 'v');
// Listen (group a): clockwise, spilling west at (14,21); turned, counter-clockwise and closed
laneBox(14, 19, 20, 19, '>'); lane(21, 19, 'v'); laneBox(21, 20, 21, 22, 'v'); lane(21, 23, '<'); laneBox(15, 23, 20, 23, '<');
lane(14, 23, '^'); lane(14, 22, '^'); lane(14, 21, '<'); lane(14, 20, '^');
turnBox('a', 15, 19, 21, 19, '<'); turn('a', 14, 19, 'v'); turnBox('a', 14, 20, 14, 22, 'v'); turn('a', 14, 23, '>');
turnBox('a', 15, 23, 20, 23, '>'); turn('a', 21, 23, '^'); turnBox('a', 21, 20, 21, 22, '^');
// Anchor (no vane): clockwise, spilling south at (21,31) onto the landing
laneBox(14, 27, 20, 27, '>'); lane(21, 27, 'v'); laneBox(21, 28, 21, 31, 'v'); laneBox(15, 31, 20, 31, '<');
lane(14, 31, '^'); laneBox(14, 28, 14, 30, '^');
// the long gust home
laneBox(27, 9, 27, 31, 'v');

const R = S.rows();

// ---------------------------------------------------------------- dressing (no prop on a landing cell or a post)
const decor = [
  // the first landing
  { t: 'lift_brass', x: 10, y: 32 }, { t: 'signal_lamp', x: 15, y: 33, state: 0 }, { t: 'signal_lamp', x: 22, y: 33, state: 1 },
  { t: 'windstone', x: 8, y: 37 }, { t: 'windstone', x: 27, y: 37 }, { t: 'bollard', x: 8, y: 32 },
  // Anchor deck
  { t: 'windstone', x: 11, y: 26 },
  // the beacon platform: Pippa's crates
  { t: 'ore_crate', x: 12, y: 3 }, { t: 'ore_crate', x: 12, y: 4 }, { t: 'signal_lamp', x: 14, y: 3, state: 1 },
  { t: 'windstone', x: 26, y: 5 },
];

/** A landing's signal lamp: dark (its pledge scene) until the flag, then lit (its line), with its light pool. */
const signalLamp = (id, x, y, flag) => [
  object(id, x, y, 'lamp_storm', { script: flag, ifNot: flag, state: 0 }),
  object(`${id}_lit`, x, y, 'lamp_storm', { text: `ep6_${id}`, if: flag, state: 1 }),
  glow(`l_${id}`, x, y, 4, { if: flag }),
];

const events = [
  enter('f3_enter', 'obs_f3_arrival'),
  // ---- the first landing
  lift('lift_down', 10, 32, ['ep6_obs_f2', 24, 16, 'down']),
  windFont('font_w3', 24, 33),
  object('kestrel_moored', 2, 35, 'kestrel', { if: 'aeris_came', solid: false, text: 'ep6_kestrel' }),
  enemy('e_l', 25, 36, 'lightning_manta', 'e6o3_manta', 'guard'),
  // ---- Anchor
  mooring('mo_anchor', 17, 27),
  ...signalLamp('lamp_anchor', 19, 24, 'pledge_anchor'),
  book('charter', 20, 24, 'pilot_charter'),
  vane('vane_listen', 12, 24, 'a'),
  // ---- Listen
  mooring('mo_listen', 17, 19),
  ...signalLamp('lamp_listen', 14, 16, 'pledge_listen'),
  enemy('e_w', 11, 23, 'storm_page', 'e6o3_pages', 'guard'),
  chest('chest_spear', 6, 22, 'gold', { item: 'windborne_spear' }),
  enemy('e_s', 24, 17, 'lightning_manta', 'e6o3_manta', 'patrol', { path: ['right', 'left'] }),
  // ---- the broken causeway
  trigger('fall_trig', 16, 15, 3, 1, 'vex_falls'),
  sign('causeway_sign', 16, 12, 'ep6_broken_causeway', { solid: false }),
  // ---- Return
  vane('vane_r_w', 18, 11, 'c'),
  vane('vane_r_e', 17, 6, 'b'),
  mooring('mo_return', 21, 10),
  sign('spire_sign', 17, 10, 'ep6_spire', { dir: 'up' }),
  ...signalLamp('lamp_return', 25, 8, 'pledge_return'),
  chest('chest_r', 26, 11, 'iron'),
  // ---- the beacon platform
  object('crates', 13, 3, 'ore_crate', { text: 'ep6_crates' }),
  chest('chest_ballast', 12, 5, 'wood', { item: 'ballast_stone', qty: 2 }),
  trigger('beacon_trig', 23, 3, 1, 3, 'fifth_voice'),
  windFont('beacon_font', 19, 3, { if: 'pippa_found' }),
  enemy('e_p', 26, 3, 'storm_page', 'e6o3_mixed', 'guard'),
  object('keyhole_shut', 21, 2, 'sky_keyhole_closed', { w: 3, text: 'ep6_sky_keyhole', ifNot: 'scribe_door_open' }),
  lockedDoor('door_scribe', 21, 2, 'compass_key', ['ep6_obs_eyrie', 11, 18, 'up'],
    { w: 3, sprite: 'door_boss', text: 'ep6_sky_keyhole', if: 'scribe_door_open' }),
  glow('l_beacon', 14, 4, 3),
];

export default {
  id: 'ep6_obs_f3', name: 'The Eye of the Storm', area: 'dungeon',
  music: 'mystery', ambience: 'storm_rumble', tileset: 'ep6',
  lighting: { tint: 'storm', dark: 0.5 },
  under: 'storm_cloud',
  legend: { c: 'storm_cloud', '.': 'spire_stone', '#': 'spire_top', '|': 'spire_face' },
  ground: R.ground,
  wind: { kind: 'ring', lanes: R.lanes, turned: R.turned },
  overlays: [8, 9, 10].map((x) => ({ t: 'ink_bridge_h_faint', x, y: 22 })),
  pitTo: ['ep6_obs_f3', 11, 22, 'left'],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [18, 35], arrival: [18, 35], font: [24, 34], spire_top: [16, 4], lift_down: [10, 33],
    kestrel_berth: [5, 34], aeris_top: [9, 33], kestrel_stage: [9, 35], kestrel_stage_m: [8, 35], kestrel_stage_b: [10, 35],
    anchor_in: [16, 32], anchor: [19, 24], anchor_stage: [18, 26], anchor_stage_m: [17, 26], anchor_stage_b: [19, 26],
    aeris_wait_1: [18, 24], vane_listen: [12, 25],
    listen_in: [16, 24], listen: [14, 16], listen_stage: [15, 18], listen_stage_m: [14, 18], listen_stage_b: [16, 18],
    aeris_wait_2: [15, 16], west_ledge: [13, 21], lantern_at: [11, 22],
    vex_edge: [17, 12], vex_hang: [19, 13], bram_line: [18, 13], vex_ahead: [17, 11],
    party_stop_fall: [17, 15], party_stop_fall_m: [16, 15], party_stop_fall_b: [18, 15],
    vane_r_w: [17, 11], stone: [17, 7], return: [25, 8], return_stage: [24, 10], return_stage_m: [23, 10], return_stage_b: [25, 10],
    aeris_wait_3: [24, 8], east_deck: [22, 10],
    pippa_spot: [15, 3], aeris_beacon: [17, 3], beacon_stage: [15, 5], beacon_stage_m: [14, 5], beacon_stage_b: [16, 5],
    keyhole: [22, 3],
  },
  start: { x: 18, y: 35, dir: 'up' },
};
