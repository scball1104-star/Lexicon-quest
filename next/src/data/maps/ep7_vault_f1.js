// The Frostbound Vault, I: The Vanishing Steps (40 x 30, dungeon, galleries over the fade). EPISODE7_PLAN 4.6, 4.10 and 5.1;
// exact cells and the solution in docs/MAPS_EP7_B.md. The teaching floor for name stones: frost-brick galleries and ice-glass
// landings with the white of the forgotten between them, a stone on every landing, the undercroft wall along the top.
//
//   A  the Thawlight Basin (x 17..23, rows 24..28): arrival (20,27) from Palehaven's Vault door (the stair 19..21,29 goes
//      back), the basin font font_v1 (22..23,25), a wood chest, and once vault_f2_done the frost lift lift_f1_up (17,25) up to
//      floor II's Lamp Gallery, the other end of F2's shortcut down (it lands at 22,26, under the font). North over the brick
//      bridge (20..21,23) onto the Reach gallery.
//   B  By Reach (puzzle B, the next path is the one you just read): the Reach gallery (x 14..26, rows 18..22, two groups).
//      Arvo's stone (15,18) holds his path north (column x 14, rows 15..17) to the Liesl landing (x 10..15, rows 10..14);
//      Liesl's stone there (15,11) holds hers east (row 12, x 16..21) to the gate landing. Read, cross, read, cross.
//   C  Keep the Near One (puzzle C, re-read to choose who goes): the gate landing (x 22..28, rows 9..15), the frozen gate
//      (the icegate, posts 23 and 27 on row 12) and memory1_trig (column x 22). Two held paths meet here: Liesl's (behind)
//      and Arvo's, whose second stretch (row 5, x 27..29) runs from the islet (x 30..34, rows 3..7) to the balcony. The third
//      stone, Sigrid (28,9), holds the bent path to the islet (29..31,10 and 31,8..9). Read Sigrid with Arvo the oldest and
//      Arvo lets go: his road to the balcony goes white. Re-read Arvo first (his stone 28,14 on the landing), so Liesl is the
//      oldest, then read Sigrid: Liesl goes, behind you, and both roads ahead hold. (Reading Sigrid, then Arvo again, is the
//      same two reads.)
//   D  the Side Gallery (optional, west): Oskar's stone (10,12) on the Liesl landing holds his path west (row 13, x 6..9) to
//      the lower gallery (x 2..5, rows 12..15); with Liesl still held, her third stretch (column x 4, rows 8..11) reaches the
//      upper gallery (x 4..9, rows 4..7): the iron chest (Torr's plaque #2, or a Hi-Ether) and a Dash-cracked ice crate (3,5)
//      before the Winterwatch Boots (2,5). 1 optional read (Liesl is already held from B).
//   E  the Northern Balcony (x 12..26, rows 3..6, 0 reads: Arvo's second stretch is held from C): the Stillheart Crystal Key
//      (gold, 13,3), the Winterwatch Provision Cache (iron, 1,500 gold, 19,3, the gold line of plan 7.6), the lift up (24,3)
//      with lift_trig (24,4) (vault_f1_lift), and a Dash crate (13,6) over Torr's plaque #3 (13,7).
//
// Every stone has a cairn at both ends of each stretch the way home needs (qa/maps/ep7_b_maps.test.mjs: no state strands the
// party). The bot: arvo from (15,19); north to (14,14); liesl from (15,12); east to (22,12) (memory1_trig); arvo again from
// (28,15) facing up; sigrid from (28,10) facing up; east and north over the bent path to (31,7); west over row 5 to the
// balcony; chest_key from (13,4); lift_trig (24,4), lift_up (24,3).
import { door, object, trigger, enemy, chest, sign, enter, wallDepth } from './_kit.js';

// ------------------------------------------------------------------------------------------------ the Vault kit
// Shared by the four maps of this family (ep7_vault_f2, ep7_vault_f3, ep7_stillheart import it). Pure data helpers.

/**
 * A Vault grid: ground chars (fill, the fade '_' by default; fadeCh is the fade under a path), a path layer (lowercase letter: that stone's path cell) and a frost layer
 * (uppercase: its frost door cell). rows() turns every wall '#' within two cells above a non-wall cell into a face '|', runs
 * the W8 wall depth over the rest and returns { ground, paths, frost } as row strings.
 */
export function vaultGrid(W, H, fill = '_', fadeCh = '_') {
  const g = Array.from({ length: H }, () => Array(W).fill(fill));
  const P = Array.from({ length: H }, () => Array(W).fill('.'));
  const F = Array.from({ length: H }, () => Array(W).fill('.'));
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, ch) => { if (inb(x, y)) g[y][x] = ch; };
  const box = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };
  /** A path stretch of stone `s` (lowercase) over the fade: the ground under it is the fade. */
  const path = (x0, y0, x1, y1, s) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) { P[y][x] = s; g[y][x] = fadeCh; }
  };
  /** A frost door cell of stone `s` over floor `floorCh`. */
  const frost = (x, y, s, floorCh) => { if (inb(x, y)) { F[y][x] = s.toUpperCase(); if (floorCh) g[y][x] = floorCh; } };
  const rows = () => {
    const out = g.map((r) => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (out[y][x] !== '#') continue;
      for (let d = 1; d <= 2; d++) if (y + d < H && g[y + d][x] !== '#' && g[y + d][x] !== '|') { out[y][x] = '|'; break; }
    }
    const r = (a) => a.map((row) => row.join(''));
    return { ground: wallDepth(r(out)), paths: r(P), frost: r(F) };
  };
  return { W, H, g, P, F, inb, set, box, path, frost, rows };
}

/** A name stone cairn (a dungeon plate): `name` is the EP7_STONES key stone_<name>. Two cairns of one letter are one stone. */
export const stone = (id, letter, x, y, extra = {}) =>
  ({ id, type: 'namestone', stone: letter, x, y, name: `stone_${id.replace(/^ns_/, '').replace(/_\d+$/, '')}`, sprite: 'name_plate', ...extra });
/** The Thawlight Recovery Basin (rest and save: font_thaw, 2 x 1) with its own Episode 7 text key. */
export const thawFont = (id, x, y, extra = {}) =>
  ({ id, type: 'font', x, y, w: 2, h: 1, text: 'ep7_thawlight_basin', sprite: 'font_thaw', safe: true, ...extra });
/** A Vault lift: a door of kind lift; the ice-glass cage is decor on the same cell (lift_frost, door cell (0, 0)). */
export const lift = (id, x, y, to, extra = {}) => ({ id, type: 'door', x, y, to, kind: 'lift', ...extra });

// ------------------------------------------------------------------------------------------------ the floor
const W = 40, H = 30;
const S = vaultGrid(W, H, '_');
const { set, box, path } = S;

box(0, 0, W - 1, 2, '#');                  // the undercroft wall along the top (faces on rows 1..2)
// A
box(17, 24, 23, 28, 'b');                  // the Thawlight Basin
box(19, 29, 21, 29, 'b');                  //   the stair down to Palehaven
box(20, 23, 21, 23, 'b');                  //   the bridge north
// B
box(14, 18, 26, 22, 'b');                  // the Reach gallery
box(10, 10, 15, 14, 'g');                  // the Liesl landing
// C
box(22, 9, 28, 15, 'g');                   // the gate landing
box(30, 3, 34, 7, 'g');                    // the islet
// D
box(2, 12, 5, 15, 'b');                    // the lower side gallery
box(4, 4, 9, 7, 'b');                      // the upper side gallery
set(3, 5, 'b'); set(2, 5, 'b');            //   the crate's neck and the boots' nook
// E
box(12, 3, 26, 6, 'b');                    // the Northern Balcony
set(13, 7, 'b');                           //   the plaque nook under the balcony crate

// the paths (lowercase = that stone's path over the fade)
path(14, 15, 14, 17, 'a');                 // B  Arvo: the Reach gallery to the Liesl landing
path(16, 12, 21, 12, 'l');                 //    Liesl: the Liesl landing to the gate landing
path(29, 10, 31, 10, 's'); path(31, 8, 31, 9, 's');   // C  Sigrid: the gate landing to the islet (bent)
path(27, 5, 29, 5, 'a');                   //    Arvo's second stretch: the islet to the balcony
path(6, 13, 9, 13, 'o');                   // D  Oskar: the Liesl landing to the lower side gallery
path(4, 8, 4, 11, 'l');                    //    Liesl's third stretch: up to the upper side gallery

const R = S.rows();

// ---------------------------------------------------------------- dressing (never on a path cell)
const decor = [
  { t: 'lift_frost', x: 17, y: 25, if: 'vault_f2_done' }, { t: 'frostfire', x: 23, y: 28 }, { t: 'frostfire', x: 17, y: 27 },
  { t: 'crystal', x: 26, y: 22 }, { t: 'frostfire', x: 14, y: 22 }, { t: 'crystal', x: 10, y: 14 },
  { t: 'icegate', x: 23, y: 12 },
  { t: 'crystal', x: 34, y: 3 }, { t: 'frostfire', x: 22, y: 15 },
  { t: 'crystal', x: 9, y: 4 }, { t: 'crystal', x: 2, y: 15 },
  { t: 'winterwatch_cache', x: 20, y: 3 }, { t: 'lift_frost', x: 24, y: 3 }, { t: 'frostfire', x: 12, y: 5 }, { t: 'frostfire', x: 26, y: 6 },
];

const events = [
  enter('f1_enter', 'vault_f1_arrival'),
  // ---- A: the Thawlight Basin
  door('to_palehaven', 19, 29, ['ep7_palehaven', 31, 7, 'down'], { w: 3, kind: 'stairs', if: 'vault_entered' }),
  thawFont('font_v1', 22, 25),
  chest('chest_a', 18, 28, 'wood', { item: 'ember_tea', qty: 2 }),
  lift('lift_f1_up', 17, 25, ['ep7_vault_f2', 23, 17, 'down'], { if: 'vault_f2_done' }),   // the shortcut up (the Lamp Gallery)
  sign('basin_sign', 18, 24, 'ep7_thawlight_basin', { solid: false }),
  // ---- B: By Reach
  stone('ns_arvo', 'a', 15, 18),
  stone('ns_arvo_2', 'a', 13, 14),
  stone('ns_liesl', 'l', 15, 11),
  chest('chest_b', 25, 22, 'wood', { item: 'hi_potion', qty: 2 }),
  enemy('e_rg', 23, 20, 'rime_wolf', 'e7v1_mixed', 'guard'),
  enemy('e_rw', 17, 21, 'snow_wisp', 'e7v1_wisps', 'patrol', { path: ['right', 'right', 'left', 'left'] }),
  enemy('e_ll', 11, 11, 'rime_wolf', 'e7v1_mixed', 'guard'),
  sign('brick_sign', 20, 18, 'ep7_frost_brick', { solid: false }),
  sign('glass_sign', 12, 10, 'ep7_ice_glass', { solid: false }),
  // ---- C: Keep the Near One
  trigger('memory1_trig', 22, 9, 1, 7, 'keeper_memory_1'),
  sign('gate_sign', 25, 12, 'ep7_frozen_gate', { solid: false, dir: 'up' }),
  stone('ns_liesl_2', 'l', 23, 15),
  stone('ns_arvo_3', 'a', 28, 14),
  stone('ns_sigrid', 's', 28, 9),
  stone('ns_sigrid_2', 's', 33, 7),
  enemy('e_gl', 26, 14, 'snow_wisp', 'e7v1_wisps', 'guard'),
  // ---- D: the Side Gallery
  stone('ns_oskar', 'o', 10, 12),
  stone('ns_oskar_2', 'o', 5, 12),
  stone('ns_liesl_3', 'l', 5, 7),
  chest('chest_plaque2', 8, 4, 'iron', { item: 'street_plaque', flag: 'street_2_found', if: 'streets_started' }),
  chest('chest_plaque2_alt', 8, 4, 'iron', { item: 'hi_ether', ifNot: 'streets_started' }),
  object('crate_d', 3, 5, 'crate_dash_ice', { breakable: 'rock', text: 'ep7_dash_ice', opens: [[3, 5]] }),
  chest('chest_boots', 2, 5, 'gold', { item: 'winterwatch_boots', behind: 'crate_d' }),
  enemy('e_sg', 7, 6, 'crystal_crawler', 'e7v1_crawlers', 'guard'),
  // ---- E: the Northern Balcony
  chest('chest_key', 13, 3, 'gold', { item: 'stillheart_key', flag: 'stillheart_key_found' }),
  chest('chest_cache', 19, 3, 'iron', { gold: 1500, item: 'hi_potion', qty: 1 }),
  sign('cache_sign', 20, 3, 'ep7_winterwatch_cache', { solid: false }),
  object('crate_e', 13, 6, 'crate_dash_ice', { breakable: 'rock', text: 'ep7_dash_ice', opens: [[13, 6]] }),
  chest('chest_plaque3', 13, 7, 'wood', { item: 'street_plaque', flag: 'street_3_found', if: 'streets_started', behind: 'crate_e' }),
  chest('chest_plaque3_alt', 13, 7, 'wood', { item: 'ember_tea', ifNot: 'streets_started', behind: 'crate_e' }),
  trigger('lift_trig', 24, 4, 1, 1, 'vault_f1_lift'),
  lift('lift_up', 24, 3, ['ep7_vault_f2', 6, 26, 'up']),
];

export default {
  id: 'ep7_vault_f1', name: 'The Vanishing Steps', area: 'dungeon',
  music: 'frostbound_vault', ambience: 'vault_hush', tileset: 'ep7',
  lighting: { tint: 'none', dark: 0 },
  under: 'fade',
  legend: { _: 'fade', b: 'frostbrick', g: 'iceglass', '#': 'vault_wall_top', '|': 'vault_wall_face', o: 'vault_wall_out_face', v: 'vault_wall_out_top',
    '.': 'frostbrick' },   // '.': the floor a Dash carves (carveOpenings), never the fade
  ground: R.ground,
  remember: { capacity: 2, paths: R.paths, goal: ['memory1_stage', 'key_face', 'lift_up'] },
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [20, 27], basin: [20, 27], font: [22, 26], lift_f1_up: [17, 26], shortcut_in: [22, 26],
    by_reach: [20, 20], arvo_face: [15, 19], liesl_land: [14, 14], liesl_face: [15, 12],
    frozen_gate: [25, 11], mother_gate: [25, 11], girl_gate: [25, 13],
    memory1_stage: [25, 15], memory1_stage_m: [24, 15], memory1_stage_b: [26, 15],
    keep_near: [25, 13], arvo_again: [28, 15], sigrid_face: [28, 10], islet: [32, 5],
    side_gallery: [4, 13], oskar_face: [11, 12], upper_gallery: [6, 5], dash_at: [4, 5],
    balcony: [20, 5], key_face: [13, 4], lift_up: [24, 4], plaque3_face: [13, 6],
  },
  start: { x: 20, y: 27, dir: 'up' },
};
