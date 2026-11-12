// The Stillheart (34 x 24, dungeon, tint aurora, dark 0.25; no banner). EPISODE7_PLAN 4.9; exact cells in docs/MAPS_EP7_B.md.
// A round floor of nave ice under the broken roof, the aurora overhead, the heart of ice in the middle (the stillheart object,
// 3 x 2 at 15..17, 9..10) with the White Phantom's map actor standing over it, and the ice block with the half page beside it.
// Widened from the plan's 26 to 34 so the staged marks keep 12 tiles from the sides (STAGING_EP7 section 3, the camera rule).
//
//   Entry (16,20) from floor III's inner grate; the stair nave_down (15..17,21) goes back to floor III's round door landing.
//   phantom_trig (row 16, if stillheart_open) stops the party on party_stop (16,14), the Phantom (16,11) and the heart framed
//   together above it. After phantom_defeated: the Phantom is gone, the door square_return (5,12) goes straight down to
//   Palehaven's Vault door (whole_page runs on that arrival), and an enter trigger replays phantom_after on a reload between
//   the win and stillheart_restored. From stillheart_restored: the heart thawed, the page block opened, the seventh list on
//   the floor where the Phantom knelt (list_spot, an inspect). From doors_reopened (the ending, entered from Palehaven's
//   nave_door onto `roof`): night, the star_stair rising at (19..21, 2..8) from stair_foot (20,9); kept for Episode 8.
import { door, object, trigger, sign, actor, enter } from './_kit.js';
import { vaultGrid } from './ep7_vault_f1.js';

const W = 34, H = 24;
const S = vaultGrid(W, H, '#');
const { set, box } = S;

// the round floor: an ellipse round (16.5, 12.5)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const dx = (x - 16.5) / 11.6, dy = (y - 12.5) / 8.6;
  if (dx * dx + dy * dy <= 1) set(x, y, '.');
}
box(15, 21, 17, 21, '.');                  // the stair down (nave_down)
const R = S.rows();

const decor = [
  { t: 'frostfire', x: 8, y: 9 }, { t: 'frostfire', x: 25, y: 9 }, { t: 'crystal', x: 7, y: 16 }, { t: 'crystal', x: 26, y: 16 },
  { t: 'auroraobelisk', x: 10, y: 6 }, { t: 'auroraobelisk', x: 23, y: 6 },
  { t: 'iced_door', x: 5, y: 12, state: 1, if: 'phantom_defeated' },
  { t: 'star_stair', x: 19, y: 8, if: 'doors_reopened' },
];

const events = [
  enter('sh_after', 'phantom_after'),
  enter('sh_ending', 'ep7_ending'),
  door('nave_down', 15, 21, ['ep7_vault_f3', 17, 9, 'down'], { w: 3, kind: 'stairs' }),
  door('square_return', 5, 12, ['ep7_palehaven', 31, 7, 'down'], { if: 'phantom_defeated' }),
  object('heart', 15, 10, 'stillheart', { w: 3, state: 0, text: 'ep7_stillheart_heart', ifNot: 'stillheart_restored' }),
  object('heart_thawed', 15, 10, 'stillheart', { w: 3, state: 3, text: 'ep7_stillheart_heart', if: 'stillheart_restored' }),
  actor('white_phantom', 16, 11, 'phantom_avatar', 'down', { ifNot: 'phantom_defeated' }),
  object('page_block', 19, 10, 'page_block', { state: 0, text: 'ep7_page_block', ifNot: 'stillheart_restored' }),
  object('page_block_open', 19, 10, 'page_block', { state: 1, text: 'ep7_page_block', if: 'stillheart_restored' }),
  sign('seventh_floor', 16, 12, 'ep7_seventh_floor', { solid: false, if: 'stillheart_restored' }),
  sign('broken_roof', 16, 3, 'ep7_broken_roof', { solid: false, dir: 'up' }),
  sign('star_stair_sign', 20, 8, 'ep7_star_stair', { solid: false, if: 'doors_reopened' }),
  trigger('phantom_trig', 6, 16, 22, 1, 'phantom', { if: 'stillheart_open' }),
];

export default {
  id: 'ep7_stillheart', name: 'The Stillheart', area: 'dungeon',
  music: null, ambience: 'vault_hush', tileset: 'ep7',
  lighting: { tint: [{ if: 'doors_reopened', id: 'night' }, { if: 'phantom_defeated', id: 'none' }, { id: 'aurora' }], dark: 0.25 },
  under: 'nave_ice',
  legend: { '.': 'nave_ice', '#': 'nave_top', '|': 'nave_face', o: 'nave_out_face', v: 'nave_out_top' },
  ground: R.ground,
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [16, 20], entry: [16, 20], heart: [16, 10], party_stop: [16, 14], party_stop_m: [15, 14], party_stop_b: [17, 14],
    nox_enter: [16, 18], list_spot: [16, 12], page_block: [19, 11],
    roof: [16, 15], roof_m: [15, 15], roof_b: [17, 15], nox_roof: [13, 13], vex_rail: [12, 15], aeris_rail: [21, 15],
    stair_foot: [20, 9], square_door: [6, 12],
  },
  start: { x: 16, y: 20, dir: 'up' },
};
