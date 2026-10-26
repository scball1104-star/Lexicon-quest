// The Keepers' Cellar (28 x 20, dungeon, dark 0.6): where the Keepers kept their ink and their oil (EXPANSION1_PLAN 4.6).
//
// Pale blue-grey tile under a band of stars (the x1 cellar kit). A quiet puzzle floor, one fight, no boss: the reward is the chart.
//
//   A. The Landing      x 1..6, y 14..18   arrival (3,14) from the Orrery hatch; the font (5,16); the stair back up at (3,13)
//   B. The Well Hall    x 8..18, y 13..18  a ring round a dry well (a pit); the single wraith patrols the east half of the ring
//   C. The Constellation Floor  x 1..26, y 3..9   a field of pits. The entry platform E (11..14, 9) is reached by the corridor
//      (12..13, 10..12) from the Well Hall; its two inlaid star cells point at the first faint bridge cell (12,8). The route is
//      31 cells of faint ink bridge (26 main + 5 fork) (`ink_bridge_*_faint`): a zigzag of single cells, one fork west to the nook (chest), the
//      main route east to the dais (the gold chest with the star chart and the Keeper's note). The Lantern reveals cells within
//      its radius and they stay revealed; falling drops you, harmlessly, at the Landing (`pitTo`).
//   D. The Seed Vault   x 20..26, y 14..17  east of the Well Hall behind a cracked wall (Dash); an iron chest.
//
// The route as cells is in docs/maps/X1_NORTH.md and is exported below as ROUTE for tests and the autoplay bot.
//
// Pack file: loaded by the `x1` pack on first entry (src/game/packs.js); tile ids are the x1 fragment's.
import { grid, box, put, rows, room, wallDepth, enter, door, stairs, chest, object, enemy, light, brazier, steps } from './_kit.js';

const W = 28, H = 20;

// ---------------------------------------------------------------- the ink route (main route, then the fork)
// (12,8) is the first cell, straight north of the entry platform. Each leg is [dx, dy, count].
const legs = [[0, -1, 5], [1, 0, 2], [0, 1, 4], [1, 0, 2], [0, -1, 4], [1, 0, 2], [0, 1, 4], [1, 0, 2]];
const ROUTE_MAIN = [[12, 8]];
for (const [dx, dy, n] of legs) for (let i = 0; i < n; i++) {
  const [x, y] = ROUTE_MAIN[ROUTE_MAIN.length - 1];
  ROUTE_MAIN.push([x + dx, y + dy]);
}
// the fork leaves the main route at (12,6) and runs west to the nook platform
const ROUTE_FORK = [[11, 6], [10, 6], [9, 6], [8, 6], [7, 6]];
export const ROUTE = { main: ROUTE_MAIN, fork: ROUTE_FORK };

// ---------------------------------------------------------------- terrain
const g = grid(W, H, '#');
room(g, 1, 14, 6, 18, '.', '|');          // A the Landing (faces rows 12..13)
room(g, 8, 13, 18, 18, '.', '|');         // B the Well Hall (faces rows 11..12)
room(g, 1, 3, 26, 9, 'p', '|');           // C the Constellation Floor: pits (faces rows 1..2)
room(g, 20, 14, 26, 17, '.', '|');        // D the Seed Vault (faces rows 12..13)
box(g, 7, 16, 7, 17, '.');                // the doorway between the Landing and the Well Hall
put(g, 3, 13, '.');                       // the notch under the stair (drawn by the stairs_up object)
box(g, 12, 10, 13, 12, '.');              // the corridor up from the Well Hall into C
box(g, 11, 9, 14, 9, '.');                // the entry platform E
box(g, 12, 9, 13, 9, 'i');                // two inlaid stars point at the first faint cell
box(g, 11, 15, 13, 16, 'p');              // the dry well (a pit; falling lands at A)
box(g, 8, 13, 18, 13, 'a'); box(g, 8, 18, 18, 18, 'a');   // the ring path wears a slate border
box(g, 8, 14, 8, 17, 'a'); box(g, 18, 14, 18, 17, 'a');
box(g, 12, 13, 13, 13, '.');              // ...except where the corridor leaves it
box(g, 4, 4, 6, 6, '.');                  // the nook platform
box(g, 21, 3, 26, 8, '.');                // the dais platform (the pit field ends at x 20)
box(g, 22, 4, 25, 7, 'i');                // the inlaid star floor of the dais
// the route's cells are pit ground under the faint overlays (they read as pits until the Lantern)
const ground = rows(wallDepth(g.map((r) => r.replace(/p/g, 'P'))).map((r) => r.replace(/P/g, 'p')));

// ---------------------------------------------------------------- overlays
const bridgeKind = (cells, i) => {
  const [x, y] = cells[i];
  const vert = (i > 0 && cells[i - 1][0] === x) || (i + 1 < cells.length && cells[i + 1][0] === x);
  return vert ? 'v' : 'h';
};
const overlays = [];
ROUTE_MAIN.forEach(([x, y], i) => overlays.push({ t: `ink_bridge_${bridgeKind(ROUTE_MAIN, i)}_faint`, x, y }));
// the fork: row 6 leaves the main route westward; its first cell is horizontal, all of it horizontal
ROUTE_FORK.forEach(([x, y]) => overlays.push({ t: 'ink_bridge_h_faint', x, y }));
overlays.push(
  { t: 'roots_0', x: 2, y: 18 }, { t: 'roots_1', x: 26, y: 17 },
);

// ---------------------------------------------------------------- decor
const decor = [
  { t: 'stairs_up', x: 3, y: 13 },
  { t: 'candelabra', x: 1, y: 14 }, { t: 'candelabra', x: 6, y: 14 },
  { t: 'candelabra', x: 8, y: 13 }, { t: 'candelabra', x: 18, y: 13 },
  { t: 'pillar', x: 10, y: 15 }, { t: 'pillar', x: 14, y: 15 }, { t: 'pillar', x: 10, y: 17 }, { t: 'pillar', x: 14, y: 17 },
  { t: 'x1_armillary_statue', x: 23, y: 3 },              // a small Keeper's armillary over the dais
  { t: 'book_stack', x: 2, y: 18 }, { t: 'book_stack', x: 20, y: 17 },
  { t: 'candelabra', x: 21, y: 14 }, { t: 'candelabra', x: 26, y: 14 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('cellar_enter', 'cellar_entry'),
  stairs('cellar_exit', 3, 13, ['x1_orrery', 12, 5, 'down']),
  { id: 'cellar_font', type: 'font', x: 5, y: 16, w: 2, h: 1, text: 'cellar_font', sprite: 'font_silver', safe: true },
  // the entry platform's two braziers light the star cells; the dais and the nook glow from the inlay
  brazier('brazier_e1', 11, 9, true), brazier('brazier_e2', 14, 9, true),
  light('light_a', 4, 16, 5, '#9fd8ff'), light('light_b', 13, 14, 6, '#9fd8ff'), light('light_e', 12, 9, 5, '#ffd9a0'),
  light('light_dais', 23, 6, 5, '#9fd8ff'), light('light_nook', 5, 5, 3, '#9fd8ff'), light('light_vault', 23, 15, 4, '#9fd8ff'),
  // chests: the nook (rolled), the dais (the Keeper's star chart; gold), the Seed Vault (behind the cracked wall; Dash)
  chest('chest_cl_nook', 5, 5, 'wood'),
  chest('chest_cl_chart', 22, 4, 'gold', { item: 'star_chart' }),
  object('x1_crack_vault', 19, 15, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2, opens: [[19, 15], [19, 16]] }),
  chest('chest_cl_vault', 23, 15, 'iron', { item: 'echo_herb', qty: 3 }),
  // the Keeper's last note on the dais (the scene sets stars_done)
  object('cellar_note', 25, 4, 'lectern', { script: 'cellar_note' }),
  // the one fight: a wraith pair walks the east half of the ring (dungeon foes step when the party steps)
  enemy('e_cl_wraiths', 15, 14, 'ink_wraith', 'cl_wraiths', 'patrol', { path: steps('right', 3, 'down', 4, 'left', 3, 'up', 4) }),
];

export default {
  id: 'x1_cellar', name: "The Keepers' Cellar", area: 'dungeon',
  music: 'orrery', ambience: null, tileset: 'town',
  lighting: { tint: 'none', dark: 0.6 },
  under: 'x1_cellar_floor',
  pitTo: ['x1_cellar', 3, 15, 'down'],
  legend: { '#': 'x1_cellar_top', '|': 'x1_cellar_face', 'o': 'x1_cellar_out_face', 'v': 'x1_cellar_out_top',
    '.': 'x1_cellar_floor', 'a': 'x1_cellar_slate', 'i': 'x1_cellar_inlay', 'p': 'pit' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: { entrance: [3, 14], font: [5, 17], well: [12, 14], route_start: [12, 9], dais: [22, 5], nook: [5, 5], vault: [22, 15] },
  start: { x: 3, y: 14, dir: 'down' },
};
