// The Deep Stacks, band four: the Ember Shelves (B60 to B79). Room prefabs for gen.js, registered by bands345.js.
//
// The Stacks under Emberpeak: the foundry galleries' brick walls (forge.png `galleries`) over ash and cinder floors,
// iron plate where the shelving stood, dry troughs cut in the floor, cooled slag and the odd channel still molten,
// charred shelves and burnt ledgers, ore crates, iron benches, tool racks, memorial stones; ember pits and iron lamps
// for light. Ash and cinder.
//
// Prefab shape, chars and rules: see prefabs.js (this file follows it exactly). Band chars:
//   .  ash_floor   c  foundry_floor (iron plate)   b  cinder_path   m  ash_ground   s  stone_floor   d  crucible_floor
//   w  slag (molten, blocked, lights the room)   i  ink (blocked)
import { shelves, drawers } from './prefabs.js';

const P = (id, tags, rows, extra = {}) => ({ id, tags, rows, ...extra });

/** A slag-brick inset along the face, x0..x1: top pieces on the upper row, bottom pieces on the lower (16x16 each). */
export const slagWall = (x0, x1) => {
  const out = [];
  for (let x = x0; x <= x1; x++) {
    const e = x === x0 ? 'l' : x === x1 ? 'r' : 'm';
    out.push([`wall_slag_top_${e}`, x, -2], [`wall_slag_bot_${e}`, x, -1]);
  }
  return out;
};
/** A dry trough across the floor from x0 to x1 on row y (ends capped). */
export const troughH = (x0, x1, y, wet = false) => {
  const s = wet ? '_wet' : '';
  const out = [];
  for (let x = x0; x <= x1; x++) out.push([x === x0 ? `trough_end_w${s}` : x === x1 ? `trough_end_e${s}` : `trough_h${s}`, x, y]);
  return out;
};
/** A dry trough down the floor from y0 to y1 in column x (ends capped). */
export const troughV = (x, y0, y1, wet = false) => {
  const s = wet ? '_wet' : '';
  const out = [];
  for (let y = y0; y <= y1; y++) out.push([y === y0 ? `trough_end_n${s}` : y === y1 ? `trough_end_s${s}` : `trough_v${s}`, x, y]);
  return out;
};
/** A stone bridge, 3 cells wide, from row y0 (north) to y1 (south): the decks are walkable, over slag or water. */
export const stoneBridgeV = (x, y0, y1) => {
  const out = [];
  for (let y = y0; y <= y1; y++) {
    const r = y === y0 ? 'n' : y === y1 ? 's' : 'm';
    out.push([`bridge_stone_v_${r}_w`, x, y], [`bridge_stone_v_${r}_m`, x + 1, y], [`bridge_stone_v_${r}_e`, x + 2, y]);
  }
  return out;
};
const drifts = (...pts) => pts.map(([x, y], i) => [`ash_drift_${'abc'[i % 3]}`, x, y]);

const EMBER_L = '#e06b39', LAMP = '#f9d77a';

export const EMBER = [
  // ---------------------------------------------------------------- halls
  P('emb_ash_hall', ['hall'], [
    '....cc......',
    '....cc......',
    'F...cc....F.',
    '....cc......',
    '....cc.....C',
    '....cc......',
  ], {
    decor: [['bench_iron', 1, 1], ['bench_iron', 8, 1], ['pillar', 0, 0], ['pillar', 11, 0], ['ember_pit', 2, 4], ['ember_pit', 9, 4]],
    face: [...shelves(0, 3), ...slagWall(5, 6), ...shelves(7, 10)],
    lights: [[2, 4, 4, EMBER_L], [9, 4, 4, EMBER_L]],
    decals: [...drifts([6, 4], [0, 5], [10, 1]), ['slag_crust', 3, 3]],
    weight: 2,
  }),
  P('emb_trough_hall', ['hall'], [
    '.............',
    '.F.........F.',
    '.............',
    '.............',
    '......C......',
    '.............',
    '.............',
  ], {
    decor: [['pillar', 2, 1], ['pillar', 10, 1], ['pillar', 2, 5], ['pillar', 10, 5], ['ore_crate', 0, 6], ['lamp_ember', 12, 0], ['lamp_ember', 0, 0]],
    face: [...drawers(1, 3), ...slagWall(5, 7), ...drawers(9, 11)],
    lights: [[12, 1, 4, LAMP], [0, 1, 4, LAMP]],
    decals: [...troughH(3, 9, 2), ...troughV(6, 3, 6), ['trough_t_s', 6, 2], ...drifts([11, 5], [1, 3])],
    weight: 2,
  }),
  P('emb_cinder_hall', ['hall'], [
    '...........',
    '.F.......F.',
    '..bbbbbbb..',
    '..bbbbbbb..',
    '..bbbbbbb..',
    '.....C.....',
    '...........',
  ], {
    decor: [['bench_iron', 1, 6], ['bench_iron', 8, 6], ['pillar', 0, 0], ['pillar', 10, 0], ['ember_pit', 5, 1]],
    face: [...shelves(0, 3), ['wall_cracked', 5, -2], ...shelves(7, 10)],
    lights: [[5, 1, 5, EMBER_L]],
    decals: [...drifts([1, 5], [9, 4], [4, 6]), ['slag_crust_b', 10, 5]],
    minFloor: 63,
  }),
  P('emb_slag_hall', ['hall', 'wet'], [
    '............',
    '.F..wwww....',
    '....wwww..F.',
    '....wwww....',
    '............',
    'C...........',
  ], {
    decor: [['pillar', 0, 2], ['lamp_ember', 11, 0], ['lamp_ember', 11, 5], ['ore_crate', 1, 4], ['bench_iron', 8, 4]],
    face: [...slagWall(0, 1), ['wall_ink_seep', 5, -2], ...shelves(8, 11)],
    lights: [[11, 1, 4, LAMP], [11, 4, 4, LAMP]],
    decals: [['slag_crust', 3, 1], ['slag_crust_c', 8, 2], ['slag_crust_b', 3, 3], ['slag_crust', 8, 3], ...drifts([1, 5], [10, 3])],
    weight: 2,
  }),
  P('emb_colonnade', ['hall'], [
    '..............',
    'F............F',
    '..............',
    '......C.......',
    '..............',
  ], {
    decor: [['pillar', 1, 0], ['pillar', 4, 0], ['pillar', 9, 0], ['pillar', 12, 0], ['pillar', 1, 4], ['pillar', 4, 4], ['pillar', 9, 4], ['pillar', 12, 4],
      ['ember_pit', 6, 0], ['ember_pit', 7, 0]],
    face: [...drawers(2, 3), ...slagWall(6, 7), ...drawers(10, 11)],
    lights: [[6, 1, 5, EMBER_L]],
    decals: [...drifts([3, 2], [10, 2], [12, 3]), ['slag_crust_b', 7, 4]],
    minFloor: 62,
  }),
  P('emb_plate_hall', ['hall'], [
    '....cc......',
    '....cc......',
    'F...cc....F.',
    '....cc......',
    '....cc......',
    '..C.cc......',
  ], {
    decor: [['pillar', 1, 0], ['pillar', 8, 0], ['pillar', 1, 5], ['pillar', 8, 5], ['ember_pit', 3, 0], ['ember_pit', 6, 0], ['coolant_station', 10, 3]],
    face: [['wall_cracked', 0, -2], ...shelves(2, 3), ['wall_glyph_faint', 4, -2], ...shelves(6, 7), ['wall_cracked', 9, -2]],
    lights: [[3, 1, 4, EMBER_L], [6, 1, 4, EMBER_L]],
    decals: [...troughV(3, 1, 4), ...troughV(6, 1, 4), ...drifts([9, 4])],
    minFloor: 66,
  }),
  // ---------------------------------------------------------------- aisles
  P('emb_charred_stacks', ['aisle'], [
    '.........',
    '.F.......',
    '.........',
    '.........',
    '.......F.',
    '.........',
    '....C....',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_a', 5, 2], ['shelf_wide', 1, 5], ['shelf_b', 6, 5], ['ember_pit', 8, 0], ['ledger_burned', 0, 6]],
    face: [...shelves(0, 2), ...slagWall(4, 8)],
    lights: [[8, 1, 4, EMBER_L]],
    decals: [...drifts([7, 1], [3, 0])],
    weight: 2,
  }),
  P('emb_crate_aisle', ['aisle'], [
    '..........',
    '.F........',
    '..........',
    '..........',
    '........F.',
    '.........C',
  ], {
    decor: [['ore_crate', 1, 2], ['ore_crate', 2, 2], ['ore_crate', 5, 2], ['ore_crate', 6, 2], ['ore_crate', 7, 2], ['bench_iron', 2, 4], ['bench_iron', 5, 4],
      ['lamp_ember', 9, 0], ['lamp_ember', 0, 0]],
    face: [...drawers(1, 3), ...shelves(5, 8)],
    lights: [[9, 1, 4, LAMP], [0, 1, 4, LAMP]],
    decals: [...drifts([8, 1], [3, 5])],
  }),
  P('emb_bench_aisle', ['aisle'], [
    '.........',
    '..F......',
    '.........',
    '.........',
    '......F..',
    '.........',
    'C........',
  ], {
    decor: [['bench_iron', 1, 2], ['bench_iron', 6, 2], ['bench_iron', 1, 5], ['bench_iron', 6, 5], ['shelf_b', 3, 2], ['shelf_b', 4, 5], ['ledger_burned', 8, 6]],
    face: [...shelves(0, 1), ...slagWall(3, 5), ...shelves(7, 8)],
    decals: [...troughH(0, 8, 3), ...drifts([5, 1], [4, 6])],
    minFloor: 64,
  }),
  P('emb_narrow_shelves', ['aisle'], [
    '........',
    '.F......',
    '........',
    '........',
    '.....F..',
    '........',
    '......C.',
    '........',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_a', 5, 2], ['shelf_wide', 2, 5], ['shelf_b', 0, 5], ['ember_pit', 0, 0], ['ember_pit', 7, 7]],
    face: [...shelves(0, 2), ...drawers(4, 7)],
    lights: [[0, 1, 4, EMBER_L], [7, 6, 4, EMBER_L]],
    decals: [...drifts([3, 7], [6, 4])],
    minFloor: 61,
  }),
  P('emb_rack_row', ['aisle'], [
    '..........',
    '..........',
    'F........F',
    '..........',
    '...C......',
  ], {
    decor: [['tool_rack', 1, 1], ['tool_rack', 4, 1], ['tool_rack', 7, 1], ['bench_iron', 6, 4], ['ore_crate', 9, 4]],
    face: [...drawers(0, 2), ...slagWall(4, 5), ...drawers(6, 9)],
    lights: [[4, 2, 3, LAMP]],
    decals: [...drifts([0, 4], [5, 3])],
  }),
  // ---------------------------------------------------------------- reading rooms
  P('emb_reading_room', ['reading'], [
    '.........',
    '.........',
    '...F.....',
    '.........',
    '........C',
    '.........',
  ], {
    decor: [['reading_table', 1, 1], ['reading_table', 6, 1], ['lectern', 4, 4], ['ember_pit', 0, 0], ['ember_pit', 8, 0], ['ledger_burned', 0, 5], ['pillar', 2, 5]],
    face: [...shelves(1, 3), ['wall_cracked', 4, -2], ...shelves(5, 7)],
    lights: [[0, 1, 4, EMBER_L], [8, 1, 4, EMBER_L]],
    decals: [...drifts([5, 3])],
    weight: 2,
  }),
  P('emb_study', ['reading', 'small'], [
    '......',
    '......',
    '..F...',
    '.....C',
  ], {
    decor: [['reading_table', 1, 1], ['lectern', 4, 1], ['ember_pit', 0, 0], ['ledger_burned', 0, 3]],
    face: [...drawers(0, 2), ...shelves(3, 5)],
    lights: [[0, 1, 4, EMBER_L]],
  }),
  P('emb_ledger_room', ['reading'], [
    '...........',
    '...........',
    '.F.........',
    '...........',
    '.........F.',
    '...C.......',
  ], {
    decor: [['reading_table', 1, 1], ['reading_table', 4, 1], ['reading_table', 7, 1], ['reading_table', 1, 3], ['reading_table', 4, 3],
      ['lectern', 9, 2], ['lamp_ember', 10, 0], ['ember_pit', 0, 5], ['ledger_burned', 10, 5]],
    face: [...shelves(0, 4), ...slagWall(5, 5), ...shelves(6, 10)],
    lights: [[10, 1, 4, LAMP], [0, 4, 4, EMBER_L]],
    decals: [...drifts([6, 5], [8, 5])],
    minFloor: 65,
  }),
  P('emb_pit_ring', ['reading'], [
    '.........',
    '..F......',
    '....c....',
    '...ccc...',
    '....c....',
    '......F..',
    '.C.......',
  ], {
    decor: [['lectern', 1, 1], ['lectern', 7, 1], ['lectern', 1, 5], ['lectern', 7, 5], ['ember_pit', 4, 3], ['ore_crate', 0, 0], ['ore_crate', 8, 0]],
    face: [...shelves(1, 7)],
    lights: [[4, 3, 5, EMBER_L]],
    decals: [...drifts([8, 6], [0, 6])],
    minFloor: 63,
  }),
  P('emb_desk_row', ['reading'], [
    '........',
    '........',
    '.F......',
    '........',
    '.....F..',
    'C.......',
  ], {
    decor: [['reading_table', 0, 1], ['reading_table', 3, 1], ['reading_table', 6, 1], ['coolant_station', 6, 5], ['lamp_ember', 7, 0]],
    face: [...drawers(0, 7)],
    lights: [[7, 1, 4, LAMP]],
    decals: [...troughH(1, 6, 3), ...drifts([4, 5])],
  }),
  P('emb_ash_study', ['reading', 'small'], [
    '.......',
    '.......',
    '..ii...',
    '..ii.F.',
    'C......',
  ], {
    decor: [['reading_table', 4, 1], ['ember_pit', 0, 0], ['ember_pit', 6, 0], ['ledger_burned', 6, 4]],
    face: [...shelves(0, 2), ['wall_ink_seep', 3, -2], ...slagWall(4, 6)],
    lights: [[0, 1, 4, EMBER_L], [6, 1, 4, EMBER_L]],
    decals: [['ink_puddle_0', 1, 3], ...drifts([4, 4], [5, 1])],
  }),
  // ---------------------------------------------------------------- small rooms
  P('emb_cell', ['small'], [
    '.....',
    '..F..',
    '.....',
    '.....',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 4, 0], ['charred_stump', 4, 3]],
    face: [['wall_cracked', 2, -2]],
    decals: [...drifts([1, 3])],
    weight: 2,
  }),
  P('emb_side_room', ['small'], [
    '......',
    '.F....',
    '......',
    '......',
  ], {
    decor: [['bench_iron', 3, 2], ['ember_pit', 0, 0], ['ore_crate', 5, 3]],
    face: [...shelves(1, 4)],
    lights: [[0, 1, 4, EMBER_L]],
    decals: [...drifts([1, 3])],
    weight: 2,
  }),
  P('emb_lamp_cell', ['small'], [
    '......',
    '......',
    '.F....',
    '.....C',
    '......',
  ], {
    decor: [['lectern', 2, 1], ['lamp_ember', 0, 4]],
    face: [...shelves(0, 2), ...drawers(3, 5)],
    lights: [[0, 4, 4, LAMP]],
  }),
  P('emb_stump_cell', ['small'], [
    '......',
    '......',
    '..F...',
    '......',
  ], {
    decor: [['charred_stump', 0, 1], ['charred_stump', 5, 1], ['ember_pit', 5, 3], ['sand_milestone', 0, 3]],
    face: [...slagWall(0, 5)],
    lights: [[5, 3, 4, EMBER_L]],
    decals: [...drifts([2, 0], [3, 3])],
    minFloor: 62,
  }),
  P('emb_drift_cell', ['small'], [
    '.......',
    '...m...',
    '.F.m...',
    '...m..C',
  ], {
    decor: [['bench_iron', 0, 0], ['bench_iron', 5, 0], ['ore_crate', 0, 3]],
    face: [...shelves(0, 1), ['wall_cracked', 3, -2], ...shelves(5, 6)],
    decals: [...drifts([5, 2], [1, 1], [3, 2])],
  }),
  P('emb_crate_cell', ['small'], [
    '......',
    '......',
    '.F..F.',
    '......',
    '......',
  ], {
    decor: [['ore_crate', 2, 0], ['ore_crate', 3, 0], ['ore_crate', 5, 4]],
    face: [...shelves(0, 5)],
    decals: [...troughH(0, 5, 3)],
    minFloor: 61,
  }),
  // ---------------------------------------------------------------- dead ends and alcoves
  P('emb_alcove', ['dead', 'small'], [
    '.....',
    '..C..',
    '.....',
    '.F...',
  ], {
    decor: [['ember_pit', 0, 0], ['ember_pit', 4, 0], ['ore_crate', 4, 3]],
    face: [['wall_glyph_revealed', 2, -2], ...shelves(0, 1), ...shelves(3, 4)],
    lights: [[0, 1, 4, EMBER_L], [4, 1, 4, EMBER_L]],
    decals: [...drifts([3, 2])],
    weight: 2,
  }),
  P('emb_niche', ['dead', 'small'], [
    '.....',
    'C....',
    '....F',
    '.....',
  ], {
    decor: [['tool_rack', 2, 3], ['lamp_ember', 4, 0], ['ore_crate', 0, 3]],
    face: [...drawers(0, 4)],
    lights: [[4, 1, 4, LAMP]],
    decals: [...drifts([1, 2])],
    weight: 2,
  }),
  P('emb_closet', ['dead', 'small'], [
    '......',
    '......',
    '.C..F.',
    '......',
  ], {
    decor: [['shelf_a', 0, 1], ['shelf_a', 4, 1], ['ledger_burned', 5, 3]],
    face: [...shelves(0, 5)],
    decals: [...drifts([0, 3])],
  }),
  P('emb_vault', ['dead', 'small'], [
    '......',
    '..cc..',
    '.cCCc.',
    '..cc..',
    '.F....',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 5, 0], ['ember_pit', 0, 4], ['ember_pit', 5, 4]],
    face: [['wall_glyph_revealed', 2, -2], ...slagWall(3, 4)],
    lights: [[0, 4, 4, EMBER_L], [5, 4, 4, EMBER_L]],
    minFloor: 64,
  }),
  P('emb_slag_alcove', ['dead', 'small', 'wet'], [
    '.......',
    '..www..',
    '..www..',
    '.......',
    'F.....C',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 6, 0]],
    face: [...slagWall(2, 4), ...shelves(0, 1), ...shelves(5, 6)],
    decals: [['slag_crust', 1, 3], ['slag_crust_b', 5, 3], ['slag_crust_c', 1, 1], ['slag_crust', 5, 1]],
  }),
  P('emb_board_alcove', ['dead', 'small'], [
    '......',
    '......',
    '....C.',
    '.F....',
  ], {
    decor: [['proclamation_board', 0, 1], ['lamp_ember', 5, 0], ['ore_crate', 0, 3]],
    face: [...drawers(0, 5)],
    lights: [[5, 1, 4, LAMP]],
    decals: [...drifts([2, 1])],
  }),
  P('emb_ash_niche', ['dead', 'small'], [
    '......',
    '.mmmm.',
    '.mCCm.',
    '.F....',
  ], {
    decor: [['charred_stump', 0, 0], ['charred_stump', 5, 0], ['ember_pit', 5, 3]],
    face: [['wall_cracked', 1, -2], ['wall_glyph_revealed', 4, -2]],
    lights: [[5, 3, 4, EMBER_L]],
    decals: [...drifts([0, 2], [5, 1])],
    minFloor: 67,
  }),
  // ---------------------------------------------------------------- odd shapes
  P('emb_bent_gallery', ['hall'], [
    '..........',
    '.F........',
    '..........',
    '......####',
    '......||||',
    '..F...C...',
    '..........',
  ], {
    decor: [['shelf_wide', 2, 2], ['bench_iron', 7, 1], ['ember_pit', 0, 0], ['ember_pit', 9, 0], ['ore_crate', 9, 6]],
    face: [...shelves(0, 3), ...slagWall(5, 9)],
    lights: [[0, 1, 4, EMBER_L], [9, 1, 4, EMBER_L]],
    decals: [...drifts([4, 6], [8, 2])],
    minFloor: 63,
  }),
  P('emb_split_room', ['reading'], [
    '.........',
    '..F......',
    '...##....',
    '...||....',
    '......F..',
    'C........',
  ], {
    decor: [['reading_table', 0, 1], ['tool_rack', 6, 1], ['lamp_ember', 8, 0], ['charred_stump', 4, 5]],
    face: [...shelves(0, 2), ...slagWall(6, 8)],
    lights: [[8, 1, 4, LAMP]],
    decals: [...drifts([2, 4], [7, 5])],
  }),
  // ---------------------------------------------------------------- set pieces (at most one per floor)
  P('emb_memorial_hall', ['set', 'hall'], [
    '.............',
    '.............',
    '.F.........F.',
    '.............',
    '.............',
    '....BC.......',
    '.............',
  ], {
    decor: [['memorial', 4, 1], ['pillar', 2, 0], ['pillar', 10, 0], ['pillar', 2, 6], ['pillar', 10, 6], ['ember_pit', 0, 0], ['ember_pit', 12, 0],
      ['bench_iron', 1, 4], ['bench_iron', 10, 4], ['ore_crate', 12, 6], ['ore_crate', 0, 6]],
    face: [...drawers(0, 3), ...slagWall(5, 7), ...drawers(9, 12)],
    lights: [[0, 1, 4, EMBER_L], [12, 1, 4, EMBER_L], [6, 2, 4, LAMP]],
    decals: [...drifts([3, 4], [9, 5], [6, 6])],
    noDoor: 'n',
    minFloor: 63,
    weight: 2,
  }),
  P('emb_cistern', ['set', 'wet'], [
    '...........',
    '..wwwwwww..',
    '..wwwwwww..',
    'F.wwwwwww.F',
    '..wwwwwww..',
    '..wwwwwww..',
    '...........',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 10, 0], ['pillar', 0, 6], ['pillar', 10, 6]],
    face: [...slagWall(3, 7), ...shelves(0, 2), ...shelves(8, 10)],
    decals: [...stoneBridgeV(4, 1, 5), ['slag_crust', 1, 5], ['slag_crust_b', 9, 1], ['slag_crust_c', 1, 1], ['slag_crust', 9, 5]],
    noDoor: 'ns',
    minFloor: 62,
  }),
  P('emb_forge_front', ['set', 'hall'], [
    '...........',
    '...F.......',
    '...........',
    '...........',
    '.....C.....',
    'F..........',
  ], {
    decor: [['furnace_mouth', 1, 1], ['furnace_mouth', 8, 1], ['bellows_decor', 4, 1], ['ore_crate', 10, 0], ['ore_crate', 10, 5], ['tool_rack', 7, 5], ['anvil_oath', 3, 5]],
    face: [...slagWall(0, 2), ...drawers(4, 6), ...slagWall(8, 10)],
    lights: [[1, 1, 5, EMBER_L], [8, 1, 5, EMBER_L]],
    decals: [['slag_crust', 5, 1], ['slag_crust_b', 6, 2], ...drifts([2, 3], [9, 4])],
    minFloor: 62,
  }),
  P('emb_ash_vault', ['set', 'dead'], [
    '........',
    '........',
    '..BC....',
    '........',
    '...F....',
  ], {
    decor: [['ore_crate', 0, 1], ['ore_crate', 7, 1], ['ore_crate', 0, 4], ['tool_rack', 6, 4], ['ember_pit', 3, 0], ['ember_pit', 4, 0]],
    face: [...drawers(0, 7)],
    decals: [...drifts([1, 2], [5, 3])],
    lights: [[4, 1, 4, EMBER_L]],
    minFloor: 63,
  }),
];

export const EMBER_LEGEND = {
  '#': 'galleries_top', '|': 'galleries_face', 'v': 'galleries_out_top', 'o': 'galleries_out_face',
  '.': 'ash_floor', 'c': 'foundry_floor', 'b': 'cinder_path', 'm': 'ash_ground', 's': 'stone_floor', 'd': 'crucible_floor',
  'w': 'slag', 'i': 'ink',
};

/** The band's landing: an ash hall with a cinder path to the stair, a dry trough, ember pits, the memorial plates. */
const row = (...parts) => parts.join('');
const W = '#';
export const EMBER_LANDING = {
  id: 'landing_ember',
  rows: [
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row('###', '||||||||||||', '###########'),
    row('###', '||||||||||||', '###', '||||||', '##'),
    row('###', '..A......P..', '###', '||||||', '##'),
    row('###', '............', '###', '..S...', '##'),
    row('###', '....bbbbbbbb', 'bbb', 'bb....', '##'),
    row('###', '....b.......', '...', '......', '##'),
    row('###', '....b.......', '###', '......', '##'),
    row('###', '..........C.', '###########'),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
  ],
  decor: [['ember_pit', 3, 5], ['ember_pit', 14, 5], ['pillar', 3, 10], ['pillar', 14, 10], ['bench_iron', 5, 9], ['memorial', 9, 9],
    ['ore_crate', 18, 6], ['lamp_ember', 23, 6], ['ore_crate', 23, 9], ['tool_rack', 18, 9]],
  face: [['wall_drawers_l', 7, 3], ['wall_drawers_m', 8, 3], ['wall_drawers_r', 9, 3], ['wall_glyph_revealed', 12, 3], ['wall_shelf_l', 13, 3], ['wall_shelf_r', 14, 3],
    ...slagWall(22, 23).map(([t, x, dy]) => [t, x, 4 + dy + 2])],
  decals: [...troughH(5, 10, 6), ['ash_drift_a', 6, 8], ['ash_drift_b', 12, 9], ['ash_drift_c', 19, 8], ['slag_crust', 4, 10]],
  overhead: [],
  lights: [[3, 5, 4, EMBER_L], [14, 5, 4, EMBER_L], [23, 6, 4, LAMP], [10, 9, 3, LAMP]],
};
