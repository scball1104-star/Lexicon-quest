// Episode 3 map helpers (E3-maps): the quench kit (EPISODE3_PLAN 5.1) and the foundry doors. Pure, plain data.
//
// Troughs, slag and crust are ground tiles (legend chars); the field turns wet frames on where water runs and swaps slag
// for crust where it crosses (E3-world). The events below draw themselves.

/** Water source. `spout_wall` sits in a north face's lower row and pours south; `spout_cistern` stands on the floor. */
export const spout = (id, x, y, dir = 'down', sprite = 'spout_wall', extra = {}) => ({ id, type: 'spout', x, y, dir, sprite, ...extra });
/** Sluice paddle at a trough junction: state 0 = '/', 1 = '\' (turns water as a mirror turns a beam). Solid, faced. */
export const sluice = (id, x, y, state, extra = {}) => ({ id, type: 'sluice', x, y, state, sprite: 'sluice', text: 'sluice_paddle', ...extra });
/** Basin (or waterwheel): fills when water arrives through `face`; a latched gate source. */
export const basin = (id, x, y, target, extra = {}) =>
  ({ id, type: 'basin', x, y, target, sprite: 'basin', latch: true, ...extra });
/** A hot grate set in a 2-tile wall face (gate sprite pair hot_grate_closed / hot_grate_open). */
export const hotGate = (id, x, y, extra = {}) => ({ id, type: 'gate', x, y, w: 2, h: 1, sprite: 'hot_grate', state: 'closed', text: 'hot_grate_shut', ...extra });
/** An ore lift door: a transfer of kind 'lift' (lift_rumble, a fade). `sprite` draws the open car. */
export const lift = (id, x, y, to, extra = {}) => ({ id, type: 'door', x, y, w: 2, h: 1, to, kind: 'lift', sprite: 'ore_lift_open', ...extra });
/** Cistern font: rest and save, a safe point (font_cistern, 2 x 1). */
export const cisternFont = (id, x, y) => ({ id, type: 'font', x, y, w: 2, h: 1, text: 'font_cistern', sprite: 'font_cistern', safe: true });
/** Heavy ore crate (Bram's Shove). */
export const oreCrate = (id, x, y) => ({ id, type: 'block', x, y, sprite: 'ore_crate', heavy: true });

/** Trough tile id for the arms present at a cell ('N','E','S','W' letters in any order). */
export function troughFor(arms) {
  const a = new Set(arms.split(''));
  const n = a.has('N'), e = a.has('E'), s = a.has('S'), w = a.has('W');
  const k = (n ? 1 : 0) + (e ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0);
  if (k === 4) return 'trough_x';
  if (k === 3) return `trough_t_${!n ? 'n' : !e ? 'e' : !s ? 's' : 'w'}`;
  if (k === 2) {
    if (n && s) return 'trough_v';
    if (e && w) return 'trough_h';
    return `trough_${n ? 'n' : 's'}${e ? 'e' : 'w'}`;
  }
  if (k === 1) return `trough_end_${n ? 'n' : e ? 'e' : s ? 's' : 'w'}`;   // a dead end, open toward its one arm
  return 'trough_x';
}

/**
 * Lay trough runs into a ground row list. `runs` is a list of polylines [[x, y], [x, y], ...] (axis-aligned legs); the
 * arms of every cell are joined across all runs, `ends` marks cells whose run continues off the trough (a pour into a
 * spout or a basin, or onto slag) so the end tile opens that way. Returns { cells: Map 'x,y' -> tile id }. The caller
 * maps tile ids to legend chars.
 */
export function troughCells(runs, extraArms = {}) {
  const arms = new Map();
  const add = (x, y, d) => { const k = `${x},${y}`; arms.set(k, (arms.get(k) || '') + d); };
  for (const pl of runs) {
    for (let i = 0; i + 1 < pl.length; i++) {
      let [x0, y0] = pl[i]; const [x1, y1] = pl[i + 1];
      const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
      while (x0 !== x1 || y0 !== y1) {
        const nx = x0 + dx, ny = y0 + dy;
        add(x0, y0, dx > 0 ? 'E' : dx < 0 ? 'W' : dy > 0 ? 'S' : 'N');
        add(nx, ny, dx > 0 ? 'W' : dx < 0 ? 'E' : dy > 0 ? 'N' : 'S');
        x0 = nx; y0 = ny;
      }
    }
  }
  for (const [k, d] of Object.entries(extraArms)) arms.set(k, (arms.get(k) || '') + d);
  const out = new Map();
  for (const [k, a] of arms) out.set(k, troughFor(a));
  return out;
}

/** Legend chars for the trough tiles, slag and crust (shared by every Episode 3 map). */
export const TROUGH_LEGEND = {
  H: 'trough_h', V: 'trough_v', 1: 'trough_ne', 2: 'trough_nw', 3: 'trough_se', 4: 'trough_sw',
  5: 'trough_t_n', 6: 'trough_t_e', 7: 'trough_t_s', 8: 'trough_t_w', X: 'trough_x',
  '!': 'trough_end_n', ')': 'trough_end_e', '(': 'trough_end_s', '<': 'trough_end_w',
  S: 'slag', K: 'slag_crust',
};
const CHAR_OF = Object.fromEntries(Object.entries(TROUGH_LEGEND).map(([c, id]) => [id, c]));

/** Write trough runs into a mutable row list (see troughCells). */
export function layTroughs(g, runs, extraArms = {}) {
  for (const [k, id] of troughCells(runs, extraArms)) {
    const [x, y] = k.split(',').map(Number);
    g[y] = g[y].slice(0, x) + CHAR_OF[id] + g[y].slice(x + 1);
  }
}
