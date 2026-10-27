// The Deep Stacks, band five: the Forge of Names (B80 to B99). Room prefabs for gen.js, registered by bands345.js.
//
// The bottom of the Stacks: the Heartforge's crucible kit (forge.png `crucible` walls: dark iron banded with ember
// flecks) over riveted plate, water running in the floor troughs, molten slag in the channels, anvils, bellows, pipes
// and valves, waterwheels and basins, the Keepers' name drawers along the faces; iron lamps, ember pits and the slag
// itself for light. Iron and bellows. B100 (maps/cave_b100.js) is hand-made in the same kit.
//
// Prefab shape, chars and rules: see prefabs.js (this file follows it exactly). Band chars:
//   .  crucible_floor   c  foundry_floor (plate)   b  carpet_red   m  ash_floor   s  stone_floor   d  ash_ground
//   w  slag (molten, blocked, lights the room)   i  ink (blocked)
import { shelves, drawers } from './prefabs.js';

const P = (id, tags, rows, extra = {}) => ({ id, tags, rows, ...extra });

export const slagWall = (x0, x1) => {
  const out = [];
  for (let x = x0; x <= x1; x++) {
    const e = x === x0 ? 'l' : x === x1 ? 'r' : 'm';
    out.push([`wall_slag_top_${e}`, x, -2], [`wall_slag_bot_${e}`, x, -1]);
  }
  return out;
};
export const troughH = (x0, x1, y, wet = true) => {
  const s = wet ? '_wet' : '';
  const out = [];
  for (let x = x0; x <= x1; x++) out.push([x === x0 ? `trough_end_w${s}` : x === x1 ? `trough_end_e${s}` : `trough_h${s}`, x, y]);
  return out;
};
export const troughV = (x, y0, y1, wet = true) => {
  const s = wet ? '_wet' : '';
  const out = [];
  for (let y = y0; y <= y1; y++) out.push([y === y0 ? `trough_end_n${s}` : y === y1 ? `trough_end_s${s}` : `trough_v${s}`, x, y]);
  return out;
};
export const stoneBridgeV = (x, y0, y1) => {
  const out = [];
  for (let y = y0; y <= y1; y++) {
    const r = y === y0 ? 'n' : y === y1 ? 's' : 'm';
    out.push([`bridge_stone_v_${r}_w`, x, y], [`bridge_stone_v_${r}_m`, x + 1, y], [`bridge_stone_v_${r}_e`, x + 2, y]);
  }
  return out;
};
const crust = (...pts) => pts.map(([x, y], i) => [['slag_crust', 'slag_crust_b', 'slag_crust_c'][i % 3], x, y]);

const EMBER_L = '#e06b39', LAMP = '#f9d77a', STEAM = '#b4e4f2';

export const FORGE = [
  // ---------------------------------------------------------------- halls
  P('frg_iron_hall', ['hall'], [
    '....cc......',
    '....cc......',
    'F...cc....F.',
    '....cc......',
    '....cc.....C',
    '....cc......',
  ], {
    decor: [['anvil_oath', 1, 1], ['anvil_oath', 9, 1], ['pillar', 0, 0], ['pillar', 11, 0], ['lamp_ember', 2, 4], ['lamp_ember', 9, 4], ['pipes_valve', 7, 1]],
    face: [...drawers(0, 3), ...slagWall(5, 6), ...drawers(7, 10)],
    lights: [[2, 4, 4, LAMP], [9, 4, 4, LAMP]],
    decals: [...crust([6, 4], [0, 5]), ...troughV(3, 0, 5), ...troughV(6, 0, 5)],
    weight: 2,
  }),
  P('frg_trough_hall', ['hall'], [
    '.............',
    '.F.........F.',
    '.............',
    '.............',
    '......C......',
    '.............',
    '.............',
  ], {
    decor: [['pillar', 2, 1], ['pillar', 10, 1], ['pillar', 2, 5], ['pillar', 10, 5], ['basin', 6, 6], ['spout_cistern', 0, 0], ['lamp_ember', 12, 0]],
    face: [...drawers(1, 3), ...slagWall(5, 7), ...drawers(9, 11)],
    lights: [[12, 1, 4, LAMP], [6, 6, 3, STEAM]],
    decals: [...troughH(1, 11, 2), ...troughV(6, 3, 5), ['trough_t_s_wet', 6, 2], ['splash_puddle', 1, 3], ...crust([11, 5])],
    weight: 2,
  }),
  P('frg_plate_hall', ['hall'], [
    '...........',
    '.F.......F.',
    '..ccccccc..',
    '..ccccccc..',
    '..ccccccc..',
    '.....C.....',
    '...........',
  ], {
    decor: [['bench_iron', 1, 6], ['bench_iron', 8, 6], ['pillar', 0, 0], ['pillar', 10, 0], ['ember_pit', 5, 1]],
    face: [...drawers(0, 3), ['wall_glyph_faint', 5, -2], ...drawers(7, 10)],
    lights: [[5, 1, 5, EMBER_L]],
    decals: [...crust([1, 5], [9, 4], [4, 6])],
    minFloor: 83,
  }),
  P('frg_slag_hall', ['hall', 'wet'], [
    '............',
    '.F..wwww....',
    '....wwww..F.',
    '....wwww....',
    '............',
    'C...........',
  ], {
    decor: [['pillar', 0, 2], ['lamp_ember', 11, 0], ['lamp_ember', 11, 5], ['ore_crate', 1, 4], ['anvil_oath', 9, 4]],
    face: [...slagWall(0, 1), ['wall_ink_seep', 5, -2], ...drawers(8, 11)],
    lights: [[11, 1, 4, LAMP], [11, 4, 4, LAMP]],
    decals: [...crust([3, 1], [8, 2], [3, 3], [8, 3], [1, 5])],
    weight: 2,
  }),
  P('frg_colonnade', ['hall'], [
    '..............',
    'F............F',
    '..............',
    '......C.......',
    '..............',
  ], {
    decor: [['pillar', 1, 0], ['pillar', 4, 0], ['pillar', 9, 0], ['pillar', 12, 0], ['pillar', 1, 4], ['pillar', 4, 4], ['pillar', 9, 4], ['pillar', 12, 4],
      ['lamp_ember', 6, 0], ['lamp_ember', 7, 0]],
    face: [...drawers(2, 3), ...slagWall(6, 7), ...drawers(10, 11)],
    lights: [[6, 1, 5, LAMP]],
    decals: [...troughH(2, 11, 2), ...crust([3, 4], [12, 3])],
    minFloor: 82,
  }),
  P('frg_pipe_hall', ['hall'], [
    '....bb......',
    '....bb......',
    'F...bb....F.',
    '....bb......',
    '....bb......',
    '..C.bb......',
  ], {
    decor: [['pipes_v', 1, 0], ['pipes_valve', 8, 0], ['pipes_v', 1, 5], ['pipes_valve', 8, 5], ['ember_pit', 3, 0], ['ember_pit', 6, 0], ['waterwheel', 10, 3]],
    face: [['wall_cracked', 0, -2], ...drawers(2, 3), ['wall_glyph_revealed', 4, -2], ...drawers(6, 7), ['wall_cracked', 9, -2]],
    lights: [[3, 1, 4, EMBER_L], [6, 1, 4, EMBER_L], [10, 3, 3, STEAM]],
    decals: [...troughV(9, 0, 2), ['splash_puddle', 9, 3], ...crust([11, 5])],
    minFloor: 86,
  }),
  // ---------------------------------------------------------------- aisles
  P('frg_drawer_stacks', ['aisle'], [
    '.........',
    '.F.......',
    '.........',
    '.........',
    '.......F.',
    '.........',
    '....C....',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_a', 5, 2], ['shelf_wide', 1, 5], ['shelf_b', 6, 5], ['lamp_ember', 8, 0], ['ledger_burned', 0, 6]],
    face: [...drawers(0, 8)],
    lights: [[8, 1, 4, LAMP]],
    decals: [...crust([7, 1], [3, 0])],
    weight: 2,
  }),
  P('frg_crate_aisle', ['aisle'], [
    '..........',
    '.F........',
    '..........',
    '..........',
    '........F.',
    '.........C',
  ], {
    decor: [['ore_crate', 1, 2], ['ore_crate', 2, 2], ['ore_crate', 5, 2], ['ore_crate', 6, 2], ['ore_crate', 7, 2], ['bench_iron', 2, 4], ['bench_iron', 5, 4],
      ['lamp_ember', 9, 0], ['lamp_ember', 0, 0]],
    face: [...drawers(1, 3), ...slagWall(5, 8)],
    lights: [[9, 1, 4, LAMP], [0, 1, 4, LAMP]],
    decals: [...crust([8, 1], [3, 5])],
  }),
  P('frg_anvil_row', ['aisle'], [
    '.........',
    '..F......',
    '.........',
    '.........',
    '......F..',
    '.........',
    'C........',
  ], {
    decor: [['anvil_oath', 1, 2], ['anvil_oath', 7, 2], ['anvil_oath', 1, 5], ['anvil_oath', 7, 5], ['tool_rack', 3, 2], ['bellows_decor', 4, 5], ['ore_crate', 8, 6]],
    face: [...drawers(0, 1), ...slagWall(3, 5), ...drawers(7, 8)],
    lights: [[4, 3, 3, EMBER_L]],
    decals: [...troughH(0, 8, 3), ['splash_puddle', 5, 1]],
    minFloor: 84,
  }),
  P('frg_narrow_stacks', ['aisle'], [
    '........',
    '.F......',
    '........',
    '........',
    '.....F..',
    '........',
    '......C.',
    '........',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_a', 5, 2], ['shelf_wide', 2, 5], ['shelf_b', 0, 5], ['lamp_ember', 0, 0], ['lamp_ember', 7, 7]],
    face: [...drawers(0, 2), ...drawers(4, 7)],
    lights: [[0, 1, 4, LAMP], [7, 6, 4, LAMP]],
    decals: [...crust([3, 7], [6, 4])],
    minFloor: 81,
  }),
  P('frg_rack_row', ['aisle'], [
    '..........',
    '..........',
    'F........F',
    '..........',
    '...C......',
  ], {
    decor: [['tool_rack', 1, 1], ['tool_rack', 4, 1], ['tool_rack', 7, 1], ['bench_iron', 6, 4], ['pipes_valve', 9, 4]],
    face: [...drawers(0, 2), ...slagWall(4, 5), ...drawers(6, 9)],
    lights: [[4, 2, 3, LAMP]],
    decals: [...troughH(0, 9, 3), ...crust([0, 4])],
  }),
  // ---------------------------------------------------------------- reading rooms
  P('frg_reading_room', ['reading'], [
    '.........',
    '.........',
    '...F.....',
    '.........',
    '........C',
    '.........',
  ], {
    decor: [['reading_table', 1, 1], ['reading_table', 6, 1], ['lectern', 4, 4], ['lamp_ember', 0, 0], ['lamp_ember', 8, 0], ['ledger_burned', 0, 5], ['pillar', 2, 5]],
    face: [...drawers(1, 3), ['wall_glyph_faint', 4, -2], ...drawers(5, 7)],
    lights: [[0, 1, 4, LAMP], [8, 1, 4, LAMP]],
    decals: [...crust([5, 3])],
    weight: 2,
  }),
  P('frg_study', ['reading', 'small'], [
    '......',
    '......',
    '..F...',
    '.....C',
  ], {
    decor: [['reading_table', 1, 1], ['lectern', 4, 1], ['lamp_ember', 0, 0], ['ledger_burned', 0, 3]],
    face: [...drawers(0, 5)],
    lights: [[0, 1, 4, LAMP]],
  }),
  P('frg_ledger_room', ['reading'], [
    '...........',
    '...........',
    '.F.........',
    '...........',
    '.........F.',
    '...C.......',
  ], {
    decor: [['reading_table', 1, 1], ['reading_table', 4, 1], ['reading_table', 7, 1], ['reading_table', 1, 3], ['reading_table', 4, 3],
      ['lectern', 9, 2], ['lamp_ember', 10, 0], ['ember_pit', 0, 5], ['ledger_burned', 10, 5]],
    face: [...drawers(0, 4), ...slagWall(5, 5), ...drawers(6, 10)],
    lights: [[10, 1, 4, LAMP], [0, 4, 4, EMBER_L]],
    decals: [...crust([6, 5], [8, 5])],
    minFloor: 85,
  }),
  P('frg_basin_ring', ['reading'], [
    '.........',
    '..F......',
    '....c....',
    '...ccc...',
    '....c....',
    '......F..',
    '.C.......',
  ], {
    decor: [['basin', 1, 1], ['basin', 7, 1], ['basin', 1, 5], ['basin', 7, 5], ['spout_cistern', 4, 3], ['ore_crate', 0, 0], ['ore_crate', 8, 0]],
    face: [...drawers(1, 7)],
    lights: [[4, 3, 4, STEAM]],
    decals: [...troughH(2, 6, 2), ...troughH(2, 6, 4), ['splash_puddle', 8, 6]],
    minFloor: 83,
  }),
  P('frg_desk_row', ['reading'], [
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
    decals: [...troughH(1, 6, 3), ...crust([4, 5])],
  }),
  P('frg_valve_study', ['reading', 'small'], [
    '.......',
    '.......',
    '..ii...',
    '..ii.F.',
    'C......',
  ], {
    decor: [['reading_table', 4, 1], ['pipes_valve', 0, 0], ['pipes_v', 6, 0], ['ledger_burned', 6, 4]],
    face: [...drawers(0, 2), ['wall_ink_seep', 3, -2], ...slagWall(4, 6)],
    lights: [[6, 1, 3, LAMP]],
    decals: [['ink_puddle_0', 1, 3], ...crust([4, 4], [5, 1])],
  }),
  // ---------------------------------------------------------------- small rooms
  P('frg_cell', ['small'], [
    '.....',
    '..F..',
    '.....',
    '.....',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 4, 0], ['ore_crate', 4, 3]],
    face: [['wall_glyph_faint', 2, -2]],
    decals: [...crust([1, 3])],
    weight: 2,
  }),
  P('frg_side_room', ['small'], [
    '......',
    '.F....',
    '......',
    '......',
  ], {
    decor: [['bench_iron', 3, 2], ['lamp_ember', 0, 0], ['ore_crate', 5, 3]],
    face: [...drawers(1, 4)],
    lights: [[0, 1, 4, LAMP]],
    decals: [...crust([1, 3])],
    weight: 2,
  }),
  P('frg_lamp_cell', ['small'], [
    '......',
    '......',
    '.F....',
    '.....C',
    '......',
  ], {
    decor: [['lectern', 2, 1], ['lamp_ember', 0, 4]],
    face: [...drawers(0, 2), ...slagWall(3, 5)],
    lights: [[0, 4, 4, LAMP]],
  }),
  P('frg_pipe_cell', ['small'], [
    '......',
    '......',
    '..F...',
    '......',
  ], {
    decor: [['pipes_v', 0, 1], ['pipes_valve', 5, 1], ['ember_pit', 5, 3], ['pipes_v', 0, 3]],
    face: [...slagWall(0, 5)],
    lights: [[5, 3, 4, EMBER_L]],
    decals: [...troughH(1, 4, 0)],
    minFloor: 82,
  }),
  P('frg_crust_cell', ['small'], [
    '.......',
    '...m...',
    '.F.m...',
    '...m..C',
  ], {
    decor: [['bench_iron', 0, 0], ['bench_iron', 5, 0], ['ore_crate', 0, 3]],
    face: [...drawers(0, 1), ['wall_cracked', 3, -2], ...drawers(5, 6)],
    decals: [...crust([5, 2], [1, 1], [3, 2])],
  }),
  P('frg_crate_cell', ['small'], [
    '......',
    '......',
    '.F..F.',
    '......',
    '......',
  ], {
    decor: [['ore_crate', 2, 0], ['ore_crate', 3, 0], ['ore_crate', 5, 4]],
    face: [...drawers(0, 5)],
    decals: [...troughH(0, 5, 3)],
    minFloor: 81,
  }),
  // ---------------------------------------------------------------- dead ends and alcoves
  P('frg_alcove', ['dead', 'small'], [
    '.....',
    '..C..',
    '.....',
    '.F...',
  ], {
    decor: [['lamp_ember', 0, 0], ['lamp_ember', 4, 0], ['ore_crate', 4, 3]],
    face: [['wall_glyph_revealed', 2, -2], ...drawers(0, 1), ...drawers(3, 4)],
    lights: [[0, 1, 4, LAMP], [4, 1, 4, LAMP]],
    decals: [...crust([3, 2])],
    weight: 2,
  }),
  P('frg_niche', ['dead', 'small'], [
    '.....',
    'C....',
    '....F',
    '.....',
  ], {
    decor: [['tool_rack', 2, 3], ['ember_pit', 4, 0], ['ore_crate', 0, 3]],
    face: [...drawers(0, 4)],
    lights: [[4, 1, 4, EMBER_L]],
    decals: [...crust([1, 2])],
    weight: 2,
  }),
  P('frg_closet', ['dead', 'small'], [
    '......',
    '......',
    '.C..F.',
    '......',
  ], {
    decor: [['shelf_a', 0, 1], ['shelf_a', 4, 1], ['ledger_burned', 5, 3]],
    face: [...drawers(0, 5)],
    decals: [...crust([0, 3])],
  }),
  P('frg_vault', ['dead', 'small'], [
    '......',
    '..cc..',
    '.cCCc.',
    '..cc..',
    '.F....',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 5, 0], ['lamp_ember', 0, 4], ['lamp_ember', 5, 4]],
    face: [['wall_glyph_revealed', 2, -2], ...slagWall(3, 4)],
    lights: [[0, 4, 4, LAMP], [5, 4, 4, LAMP]],
    minFloor: 84,
  }),
  P('frg_slag_alcove', ['dead', 'small', 'wet'], [
    '.......',
    '..www..',
    '..www..',
    '.......',
    'F.....C',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 6, 0]],
    face: [...slagWall(2, 4), ...drawers(0, 1), ...drawers(5, 6)],
    decals: [...crust([1, 3], [5, 3], [1, 1], [5, 1])],
  }),
  P('frg_wheel_alcove', ['dead', 'small'], [
    '......',
    '......',
    '....C.',
    '.F....',
  ], {
    decor: [['waterwheel', 0, 1], ['lamp_ember', 5, 0], ['basin', 0, 3]],
    face: [...drawers(0, 5)],
    lights: [[5, 1, 4, LAMP], [1, 2, 3, STEAM]],
    decals: [...troughH(2, 4, 1), ['splash_puddle', 2, 3]],
  }),
  P('frg_grate_niche', ['dead', 'small'], [
    '......',
    '.cccc.',
    '.cCCc.',
    '.F....',
  ], {
    decor: [['pipes_v', 0, 0], ['pipes_v', 5, 0], ['ember_pit', 5, 3]],
    face: [['wall_cracked', 1, -2], ['wall_glyph_revealed', 4, -2]],
    lights: [[5, 3, 4, EMBER_L]],
    decals: [...crust([0, 2], [5, 1])],
    minFloor: 87,
  }),
  // ---------------------------------------------------------------- odd shapes
  P('frg_bent_gallery', ['hall'], [
    '..........',
    '.F........',
    '..........',
    '......####',
    '......||||',
    '..F...C...',
    '..........',
  ], {
    decor: [['shelf_wide', 2, 2], ['anvil_oath', 7, 1], ['lamp_ember', 0, 0], ['lamp_ember', 9, 0], ['ore_crate', 9, 6]],
    face: [...drawers(0, 3), ...slagWall(5, 9)],
    lights: [[0, 1, 4, LAMP], [9, 1, 4, LAMP]],
    decals: [...crust([4, 6], [8, 2])],
    minFloor: 83,
  }),
  P('frg_split_room', ['reading'], [
    '.........',
    '..F......',
    '...##....',
    '...||....',
    '......F..',
    'C........',
  ], {
    decor: [['reading_table', 0, 1], ['tool_rack', 6, 1], ['lamp_ember', 8, 0], ['basin', 4, 5]],
    face: [...drawers(0, 2), ...slagWall(6, 8)],
    lights: [[8, 1, 4, LAMP], [4, 5, 3, STEAM]],
    decals: [...troughV(4, 2, 4), ...crust([7, 5])],
  }),
  // ---------------------------------------------------------------- set pieces (at most one per floor)
  P('frg_fan_hall', ['set', 'hall'], [
    '.............',
    '.............',
    '.F.........F.',
    '.............',
    '.............',
    '....BC.......',
    '.............',
  ], {
    decor: [['fan_great', 5, 3], ['pillar', 2, 0], ['pillar', 10, 0], ['pillar', 2, 6], ['pillar', 10, 6], ['lamp_ember', 0, 0], ['lamp_ember', 12, 0],
      ['bench_iron', 1, 4], ['bench_iron', 10, 4], ['ore_crate', 12, 6], ['ore_crate', 0, 6]],
    face: [...drawers(0, 3), ...slagWall(5, 7), ...drawers(9, 12)],
    lights: [[0, 1, 4, LAMP], [12, 1, 4, LAMP]],
    decals: [...crust([3, 4], [9, 5], [6, 6])],
    noDoor: 'n',
    minFloor: 83,
    weight: 2,
  }),
  P('frg_crucible', ['set', 'wet'], [
    '...........',
    '..wwwwwww..',
    '..wwwwwww..',
    'F.wwwwwww.F',
    '..wwwwwww..',
    '..wwwwwww..',
    '...........',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 10, 0], ['pillar', 0, 6], ['pillar', 10, 6]],
    face: [...slagWall(3, 7), ...drawers(0, 2), ...drawers(8, 10)],
    decals: [...stoneBridgeV(4, 1, 5), ...crust([1, 5], [9, 1], [1, 1], [9, 5])],
    noDoor: 'ns',
    minFloor: 82,
  }),
  P('frg_bellows_hall', ['set', 'hall'], [
    '...........',
    '...F.......',
    '...........',
    '...........',
    '....BC.....',
    'F..........',
  ], {
    decor: [['furnace_mouth', 1, 1], ['furnace_mouth', 8, 1], ['bellows_decor', 4, 1], ['ore_crate', 10, 0], ['ore_crate', 10, 5], ['tool_rack', 7, 5], ['anvil_oath', 3, 5]],
    face: [...slagWall(0, 2), ...drawers(4, 6), ...slagWall(8, 10)],
    lights: [[1, 1, 5, EMBER_L], [8, 1, 5, EMBER_L]],
    decals: [...crust([5, 1], [6, 2], [2, 3], [9, 4])],
    minFloor: 82,
  }),
  P('frg_name_vault', ['set', 'dead'], [
    '........',
    '........',
    '..BC....',
    '........',
    '...F....',
  ], {
    decor: [['card_cabinet', 0, 1], ['card_cabinet', 6, 1], ['card_cabinet', 0, 4], ['card_cabinet', 6, 4], ['lamp_ember', 3, 0], ['lamp_ember', 4, 0]],
    face: [...drawers(0, 7)],
    decals: [['index_cards', 1, 2], ['index_cards', 5, 3]],
    lights: [[4, 1, 4, LAMP]],
    minFloor: 83,
  }),
];

export const FORGE_LEGEND = {
  '#': 'crucible_top', '|': 'crucible_face', 'v': 'crucible_out_top', 'o': 'crucible_out_face',
  '.': 'crucible_floor', 'c': 'foundry_floor', 'b': 'carpet_red', 'm': 'ash_floor', 's': 'stone_floor', 'd': 'ash_ground',
  'w': 'slag', 'i': 'ink',
};

/** The band's landing: a plate hall with a water trough down the middle, anvil and bellows, the name drawers either side of the plaque. */
const row = (...parts) => parts.join('');
const W = '#';
export const FORGE_LANDING = {
  id: 'landing_forge',
  rows: [
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row('###', '||||||||||||', '###########'),
    row('###', '||||||||||||', '###', '||||||', '##'),
    row('###', '..A......P..', '###', '||||||', '##'),
    row('###', '............', '###', '..S...', '##'),
    row('###', '....cccc....', '...', '......', '##'),
    row('###', '....cccc....', '...', '......', '##'),
    row('###', '............', '###', '......', '##'),
    row('###', '..........C.', '###########'),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
  ],
  decor: [['lamp_ember', 3, 5], ['lamp_ember', 14, 5], ['pillar', 3, 10], ['pillar', 14, 10], ['anvil_oath', 5, 9], ['bellows_decor', 11, 9],
    ['waterwheel', 18, 6], ['lamp_ember', 23, 6], ['ore_crate', 23, 9], ['basin', 18, 9]],
  face: [['wall_drawers_l', 6, 3], ['wall_drawers_m', 7, 3], ['wall_drawers_m', 8, 3], ['wall_drawers_r', 9, 3], ['wall_glyph_revealed', 12, 3],
    ['wall_drawers_l', 13, 3], ['wall_drawers_r', 14, 3], ['wall_slag_top_l', 22, 4], ['wall_slag_top_r', 23, 4], ['wall_slag_bot_l', 22, 5], ['wall_slag_bot_r', 23, 5]],
  decals: [...troughV(8, 6, 9), ['splash_puddle', 8, 10], ...crust([4, 7], [11, 8], [19, 9])],
  overhead: [],
  lights: [[3, 5, 4, LAMP], [14, 5, 4, LAMP], [23, 6, 4, LAMP], [18, 7, 3, STEAM]],
};
