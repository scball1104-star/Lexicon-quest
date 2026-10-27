// The Deep Stacks, band three: the Court Below (B40 to B59). Room prefabs for gen.js, registered by bands345.js.
//
// The Stacks under the Court of Mirrors: the Court's gallery kit (court_gallery walls, violet marquetry floor, glass
// panels, black glass, silver inlay on the floor, mirrors and blank portraits on the faces, glass benches, dead beam
// lenses and receptors, still silver water) with the Stacks' own shelves, lecterns and strewn index cards. Cold stone
// and glass; candelabra for light, dead receptors for a cyan glow.
//
// Prefab shape, chars and rules: see prefabs.js (this file follows it exactly). Band chars:
//   .  gallery_floor   s  glass_floor   d  throne_floor (black glass)   c b  carpets   m  stone_floor
//   w  mere_water (blocked)   i  ink (blocked)
import { shelves, drawers } from './prefabs.js';

const P = (id, tags, rows, extra = {}) => ({ id, tags, rows, ...extra });

/** Blank portraits along the upper face row, one every two cells from x0 (32x32 overlays, dy -2). */
export const portraits = (x0, n, start = 0) => {
  const kinds = ['portrait_blank', 'portrait_blank_2', 'portrait_blank_3'];
  const out = [];
  for (let i = 0; i < n; i++) out.push([kinds[(start + i) % 3], x0 + i * 2, -2]);
  return out;
};
/** Mirror panels along the upper face row, x0..x1 (16x32 overlays). */
export const mirrors = (x0, x1) => {
  const out = [];
  for (let x = x0; x <= x1; x++) out.push([x % 2 ? 'mirror_wall' : 'glass_pane_cracked', x, -2]);
  return out;
};
/** A rectangle of silver inlay on the floor (corners, lines, a socket at the centre of the north side), inclusive. */
export const inlay = (x0, y0, x1, y1) => {
  const out = [['inlay_corner_nw', x0, y0], ['inlay_corner_ne', x1, y0], ['inlay_corner_sw', x0, y1], ['inlay_corner_se', x1, y1]];
  for (let x = x0 + 1; x < x1; x++) out.push(['inlay_h', x, y0], ['inlay_h', x, y1]);
  for (let y = y0 + 1; y < y1; y++) out.push(['inlay_v', x0, y], ['inlay_v', x1, y]);
  return out;
};
/** A stone bridge (2 deck rows, an arch row under) across water from x0 to x1 with its north deck row at y. */
export const stoneBridge = (x0, x1, y) => {
  const out = [];
  const end = (x) => (x === x0 ? 'l' : x === x1 ? 'r' : 'm');
  for (let x = x0; x <= x1; x++) out.push([`bridge_stone_h_n_${end(x)}`, x, y], [`bridge_stone_h_s_${end(x)}`, x, y + 1], [`bridge_stone_h_arch_${end(x)}`, x, y + 2]);
  return out;
};
/** A stone bridge, 3 cells wide, from row y0 (north) to y1 (south). */
export const stoneBridgeV = (x, y0, y1) => {
  const out = [];
  for (let y = y0; y <= y1; y++) {
    const r = y === y0 ? 'n' : y === y1 ? 's' : 'm';
    out.push([`bridge_stone_v_${r}_w`, x, y], [`bridge_stone_v_${r}_m`, x + 1, y], [`bridge_stone_v_${r}_e`, x + 2, y]);
  }
  return out;
};

const WARM = '#ffd9a0', CYAN = '#8af0e8';

export const COURT = [
  // ---------------------------------------------------------------- halls
  P('crt_mirror_hall', ['hall'], [
    '....bb......',
    '....bb......',
    'F...bb....F.',
    '....bb......',
    '....bb.....C',
    '....bb......',
  ], {
    decor: [['glass_bench', 1, 1], ['glass_bench', 8, 1], ['pillar', 0, 0], ['pillar', 11, 0], ['candelabra', 2, 4], ['candelabra', 9, 4]],
    face: [...mirrors(0, 3), ['gallery_window', 5, -2], ...mirrors(7, 10)],
    overhead: [['hanging_lamp', 2, 2], ['hanging_lamp', 8, 2]],
    lights: [[2, 3, 3, WARM], [8, 3, 3, WARM]],
    decals: [['index_cards', 6, 4], ['ink_puddle_0', 0, 5]],
    weight: 2,
  }),
  P('crt_portrait_hall', ['hall'], [
    '.............',
    '.F.........F.',
    '.....sss.....',
    '.....sss.....',
    '......C......',
    '.............',
  ], {
    decor: [['pillar', 2, 1], ['pillar', 10, 1], ['pillar', 2, 4], ['pillar', 10, 4], ['book_stack', 0, 5], ['candelabra', 12, 0], ['candelabra', 0, 0]],
    face: [...portraits(1, 2), ['gallery_rose', 5, -2], ...portraits(9, 2, 1)],
    decals: [...inlay(4, 1, 8, 4), ['index_cards', 11, 5], ['ink_puddle_1', 1, 5]],
    weight: 2,
  }),
  P('crt_glass_hall', ['hall'], [
    '...........',
    '.F.......F.',
    '..sssssss..',
    '..sssssss..',
    '..sssssss..',
    '.....C.....',
    '...........',
  ], {
    decor: [['glass_bench', 1, 6], ['glass_bench', 8, 6], ['pillar', 0, 0], ['pillar', 10, 0], ['receptor', 5, 1]],
    face: [...shelves(0, 3), ['gallery_window', 5, -2], ...shelves(7, 10)],
    lights: [[5, 2, 4, CYAN]],
    decals: [['index_cards', 1, 5], ['index_cards', 9, 4]],
    minFloor: 43,
  }),
  P('crt_pool_hall', ['hall', 'wet'], [
    '............',
    '.F..wwww....',
    '....wwww..F.',
    '....wwww....',
    '............',
    'C...........',
  ], {
    decor: [['pillar', 0, 2], ['candelabra', 11, 0], ['candelabra', 11, 5], ['glass_bench', 1, 4], ['glass_bench', 9, 4]],
    face: [...mirrors(0, 1), ['wall_ink_seep', 5, -2], ...mirrors(8, 11)],
    lights: [[11, 1, 4, WARM], [11, 4, 4, WARM]],
    decals: [...inlay(3, 0, 8, 4), ['ink_puddle_0', 1, 5], ['index_cards', 10, 3]],
    weight: 2,
  }),
  P('crt_colonnade', ['hall'], [
    '..............',
    'F............F',
    '..............',
    '......C.......',
    '..............',
  ], {
    decor: [['pillar', 1, 0], ['pillar', 4, 0], ['pillar', 9, 0], ['pillar', 12, 0], ['pillar', 1, 4], ['pillar', 4, 4], ['pillar', 9, 4], ['pillar', 12, 4],
      ['candelabra', 6, 0], ['candelabra', 7, 0]],
    face: [...portraits(2, 2), ...shelves(6, 7), ...portraits(10, 2, 2)],
    lights: [[6, 1, 5, WARM]],
    decals: [['index_cards', 3, 2], ['ink_puddle_1', 10, 2], ['index_cards', 12, 3]],
    minFloor: 42,
  }),
  P('crt_black_hall', ['hall'], [
    '....dd......',
    '....dd......',
    'F...dd....F.',
    '....dd......',
    '....dd......',
    '..C.dd......',
  ], {
    decor: [['pillar', 1, 0], ['pillar', 8, 0], ['pillar', 1, 5], ['pillar', 8, 5], ['candelabra', 3, 0], ['candelabra', 6, 0], ['beam_lens', 11, 3]],
    face: [['mirror_wall', 0, -2], ...shelves(2, 3), ['mirror_wall', 4, -2], ...shelves(6, 7), ['mirror_wall', 9, -2]],
    lights: [[3, 1, 4, WARM], [6, 1, 4, WARM], [11, 3, 3, CYAN]],
    decals: [['inlay_v', 3, 1], ['inlay_v', 6, 1], ['inlay_v', 3, 4], ['inlay_v', 6, 4], ['index_cards', 9, 4]],
    minFloor: 46,
  }),
  // ---------------------------------------------------------------- aisles
  P('crt_shelf_aisle', ['aisle'], [
    '.........',
    '.F.......',
    '.........',
    '.........',
    '.......F.',
    '.........',
    '....C....',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_a', 5, 2], ['shelf_wide', 1, 5], ['shelf_b', 6, 5], ['candelabra', 8, 0], ['book_stack', 0, 6]],
    face: [...shelves(0, 2), ...mirrors(4, 8)],
    decals: [['index_cards', 7, 1], ['ink_puddle_1', 3, 0]],
    weight: 2,
  }),
  P('crt_bench_aisle', ['aisle'], [
    '..........',
    '.F........',
    '..........',
    '..........',
    '........F.',
    '.........C',
  ], {
    decor: [['glass_bench', 1, 2], ['glass_bench', 4, 2], ['glass_bench', 7, 2], ['glass_bench', 2, 4], ['glass_bench', 5, 4], ['candelabra', 9, 0], ['candelabra', 0, 0]],
    face: [...portraits(1, 2), ...shelves(5, 8)],
    lights: [[9, 1, 3, WARM], [0, 1, 3, WARM]],
    decals: [['inlay_h', 1, 3], ['inlay_h', 2, 3], ['inlay_h', 3, 3], ['inlay_h', 6, 3], ['inlay_h', 7, 3], ['inlay_h', 8, 3], ['index_cards', 8, 1]],
  }),
  P('crt_lens_aisle', ['aisle'], [
    '.........',
    '..F......',
    '.........',
    '.........',
    '......F..',
    '.........',
    'C........',
  ], {
    decor: [['beam_lens', 1, 2], ['beam_lens', 7, 2], ['beam_lens', 1, 5], ['beam_lens', 7, 5], ['shelf_b', 3, 2], ['shelf_b', 4, 5], ['book_stack', 8, 6]],
    face: [...shelves(0, 1), ['gallery_window', 4, -2], ...shelves(7, 8)],
    lights: [[1, 2, 3, CYAN], [7, 2, 3, CYAN], [1, 5, 3, CYAN], [7, 5, 3, CYAN]],
    decals: [['index_cards', 5, 1], ['ink_puddle_0', 4, 6]],
    minFloor: 44,
  }),
  P('crt_narrow_gallery', ['aisle'], [
    '........',
    '.F......',
    '........',
    '........',
    '.....F..',
    '........',
    '......C.',
    '........',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_a', 5, 2], ['shelf_wide', 2, 5], ['shelf_b', 0, 5], ['candelabra', 0, 0], ['candelabra', 7, 7]],
    face: [...mirrors(0, 2), ...drawers(4, 7)],
    lights: [[0, 1, 3, WARM], [7, 6, 3, WARM]],
    decals: [['index_cards', 3, 7], ['ink_puddle_1', 6, 4]],
    minFloor: 41,
  }),
  P('crt_cabinet_row', ['aisle'], [
    '..........',
    '..........',
    'F........F',
    '..........',
    '...C......',
  ], {
    decor: [['card_cabinet', 1, 1], ['card_cabinet', 4, 1], ['card_cabinet', 7, 1], ['glass_bench', 6, 4], ['book_stack', 9, 4]],
    face: [...drawers(0, 2), ['gallery_window', 4, -2], ...drawers(6, 9)],
    overhead: [['hanging_lamp', 4, 2]],
    lights: [[4, 3, 3, WARM]],
    decals: [['index_cards', 0, 4], ['index_cards', 5, 3]],
  }),
  // ---------------------------------------------------------------- reading rooms
  P('crt_reading_room', ['reading'], [
    '.........',
    '.........',
    '...F.....',
    '.........',
    '........C',
    '.........',
  ], {
    decor: [['reading_table', 1, 1], ['reading_table', 6, 1], ['lectern', 4, 4], ['candelabra', 0, 0], ['candelabra', 8, 0], ['book_stack', 0, 5], ['pillar', 2, 5]],
    face: [...shelves(1, 3), ['gallery_window', 4, -2], ...shelves(5, 7)],
    overhead: [['hanging_lamp', 1, 1], ['hanging_lamp', 6, 1]],
    lights: [[1, 2, 3, WARM], [6, 2, 3, WARM]],
    decals: [['index_cards', 5, 3]],
    weight: 2,
  }),
  P('crt_study', ['reading', 'small'], [
    '......',
    '......',
    '..F...',
    '.....C',
  ], {
    decor: [['reading_table', 1, 1], ['lectern', 4, 1], ['candelabra', 0, 0], ['book_stack', 0, 3]],
    face: [...mirrors(0, 2), ...shelves(3, 5)],
    overhead: [['hanging_lamp', 1, 1]],
    lights: [[1, 2, 3, WARM]],
  }),
  P('crt_scriptorium', ['reading'], [
    '...........',
    '...........',
    '.F.........',
    '...........',
    '.........F.',
    '...C.......',
  ], {
    decor: [['reading_table', 1, 1], ['reading_table', 4, 1], ['reading_table', 7, 1], ['reading_table', 1, 3], ['reading_table', 4, 3],
      ['lectern', 9, 2], ['candelabra', 10, 0], ['candelabra', 0, 5], ['book_stack', 10, 5]],
    face: [...shelves(0, 4), ['gallery_window', 5, -2], ...shelves(6, 10)],
    overhead: [['hanging_lamp', 2, 2], ['hanging_lamp', 6, 1]],
    lights: [[2, 3, 3, WARM], [6, 2, 3, WARM]],
    decals: [['index_cards', 6, 5], ['ink_puddle_1', 8, 5]],
    minFloor: 45,
  }),
  P('crt_lectern_ring', ['reading'], [
    '.........',
    '..F......',
    '....s....',
    '...sss...',
    '....s....',
    '......F..',
    '.C.......',
  ], {
    decor: [['lectern', 1, 1], ['lectern', 7, 1], ['lectern', 1, 5], ['lectern', 7, 5], ['receptor', 4, 3], ['candelabra', 0, 0], ['candelabra', 8, 0]],
    face: [...shelves(1, 7)],
    lights: [[4, 3, 4, CYAN]],
    decals: [...inlay(2, 1, 6, 5), ['index_cards', 8, 6]],
    minFloor: 43,
  }),
  P('crt_desk_row', ['reading'], [
    '........',
    '........',
    '.F......',
    '........',
    '.....F..',
    'C.......',
  ], {
    decor: [['reading_table', 0, 1], ['reading_table', 3, 1], ['reading_table', 6, 1], ['card_cabinet', 6, 5], ['candelabra', 7, 0]],
    face: [...drawers(0, 7)],
    overhead: [['hanging_lamp', 3, 2]],
    lights: [[3, 3, 3, WARM]],
    decals: [['index_cards', 4, 5], ['inlay_h', 2, 3], ['inlay_h', 3, 3], ['inlay_h', 4, 3]],
  }),
  P('crt_ink_study', ['reading', 'small'], [
    '.......',
    '.......',
    '..ii...',
    '..ii.F.',
    'C......',
  ], {
    decor: [['reading_table', 4, 1], ['candelabra', 0, 0], ['candelabra', 6, 0], ['book_stack', 6, 4]],
    face: [...shelves(0, 2), ['wall_ink_seep', 3, -2], ...mirrors(4, 6)],
    lights: [[0, 1, 3, WARM], [6, 1, 3, WARM]],
    decals: [['ink_puddle_0', 1, 3], ['ink_puddle_1', 4, 4], ['index_cards', 5, 1]],
  }),
  // ---------------------------------------------------------------- small rooms
  P('crt_cell', ['small'], [
    '.....',
    '..F..',
    '.....',
    '.....',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 4, 0], ['book_stack', 4, 3]],
    face: [['gallery_window', 2, -2]],
    decals: [['inlay_h', 1, 3], ['inlay_h', 2, 3], ['inlay_h', 3, 3]],
    weight: 2,
  }),
  P('crt_side_room', ['small'], [
    '......',
    '.F....',
    '......',
    '......',
  ], {
    decor: [['glass_bench', 3, 2], ['candelabra', 0, 0], ['book_stack', 5, 3]],
    face: [...shelves(1, 4)],
    decals: [['index_cards', 1, 3]],
    weight: 2,
  }),
  P('crt_lamp_cell', ['small'], [
    '......',
    '......',
    '.F....',
    '.....C',
    '......',
  ], {
    decor: [['lectern', 2, 1], ['candelabra', 0, 4]],
    face: [...shelves(0, 2), ...drawers(3, 5)],
    overhead: [['hanging_lamp', 2, 2]],
    lights: [[2, 3, 3, WARM]],
  }),
  P('crt_mirror_cell', ['small'], [
    '......',
    '......',
    '..F...',
    '......',
  ], {
    decor: [['mirror_stand', 0, 1], ['mirror_stand', 5, 1], ['candelabra', 5, 3]],
    face: [...mirrors(0, 5)],
    lights: [[5, 3, 3, WARM]],
    decals: [...inlay(1, 0, 4, 3)],
    minFloor: 42,
  }),
  P('crt_pane_cell', ['small'], [
    '.......',
    '...s...',
    '.F.s...',
    '...s..C',
  ], {
    decor: [['glass_bench', 0, 0], ['glass_bench', 5, 0], ['book_stack', 0, 3]],
    face: [...shelves(0, 1), ['gallery_window', 3, -2], ...shelves(5, 6)],
    decals: [['index_cards', 5, 2]],
  }),
  P('crt_inlay_cell', ['small'], [
    '......',
    '......',
    '.F..F.',
    '......',
    '......',
  ], {
    decor: [['receptor', 2, 0], ['receptor', 3, 0], ['book_stack', 5, 4]],
    face: [...shelves(0, 5)],
    lights: [[2, 1, 4, CYAN]],
    decals: [...inlay(0, 1, 5, 4)],
    minFloor: 41,
  }),
  // ---------------------------------------------------------------- dead ends and alcoves
  P('crt_alcove', ['dead', 'small'], [
    '.....',
    '..C..',
    '.....',
    '.F...',
  ], {
    decor: [['candelabra', 0, 0], ['candelabra', 4, 0], ['book_stack', 4, 3]],
    face: [['wall_glyph_revealed', 2, -2], ...mirrors(0, 1), ...mirrors(3, 4)],
    decals: [['index_cards', 3, 2]],
    weight: 2,
  }),
  P('crt_niche', ['dead', 'small'], [
    '.....',
    'C....',
    '....F',
    '.....',
  ], {
    decor: [['card_cabinet', 2, 3], ['candelabra', 4, 0], ['book_stack', 0, 3]],
    face: [...drawers(0, 4)],
    decals: [['ink_puddle_0', 1, 2]],
    weight: 2,
  }),
  P('crt_closet', ['dead', 'small'], [
    '......',
    '......',
    '.C..F.',
    '......',
  ], {
    decor: [['shelf_a', 0, 1], ['shelf_a', 4, 1], ['book_stack', 5, 3]],
    face: [...shelves(0, 5)],
    decals: [['index_cards', 0, 3]],
  }),
  P('crt_vault', ['dead', 'small'], [
    '......',
    '..dd..',
    '.dCCd.',
    '..dd..',
    '.F....',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 5, 0], ['pillar', 0, 4], ['pillar', 5, 4]],
    face: [['wall_glyph_revealed', 2, -2], ['gallery_window', 3, -2]],
    lights: [[2, 2, 3, CYAN]],
    decals: [...inlay(1, 1, 4, 3)],
    minFloor: 44,
  }),
  P('crt_pool_alcove', ['dead', 'small', 'wet'], [
    '.......',
    '..www..',
    '..www..',
    '.......',
    'F.....C',
  ], {
    decor: [['candelabra', 0, 0], ['candelabra', 6, 0]],
    face: [['mirror_wall', 3, -2], ...shelves(0, 1), ...shelves(5, 6)],
    lights: [[0, 1, 3, WARM], [6, 1, 3, WARM]],
    decals: [['ink_puddle_1', 1, 3], ['inlay_v', 1, 1], ['inlay_v', 1, 2], ['inlay_v', 5, 1], ['inlay_v', 5, 2]],
  }),
  P('crt_portrait_alcove', ['dead', 'small'], [
    '......',
    '......',
    '....C.',
    '.F....',
  ], {
    decor: [['glass_bench', 0, 1], ['candelabra', 5, 0], ['book_stack', 0, 3]],
    face: [...portraits(0, 3)],
    lights: [[5, 1, 3, WARM]],
    decals: [['index_cards', 2, 1]],
  }),
  P('crt_glass_niche', ['dead', 'small'], [
    '......',
    '.ssss.',
    '.sCCs.',
    '.F....',
  ], {
    decor: [['beam_lens', 0, 0], ['beam_lens', 5, 0]],
    face: [['gallery_rose', 1, -2], ['mirror_wall', 4, -2]],
    lights: [[0, 1, 3, CYAN], [5, 1, 3, CYAN]],
    minFloor: 47,
  }),
  // ---------------------------------------------------------------- odd shapes
  P('crt_bent_gallery', ['hall'], [
    '..........',
    '.F........',
    '..........',
    '......####',
    '......||||',
    '..F...C...',
    '..........',
  ], {
    decor: [['shelf_wide', 2, 2], ['glass_bench', 7, 1], ['candelabra', 0, 0], ['candelabra', 9, 0], ['book_stack', 9, 6]],
    face: [...mirrors(0, 3), ...drawers(5, 9)],
    decals: [['index_cards', 4, 6], ['ink_puddle_1', 8, 2]],
    minFloor: 43,
  }),
  P('crt_split_room', ['reading'], [
    '.........',
    '..F......',
    '...##....',
    '...||....',
    '......F..',
    'C........',
  ], {
    decor: [['reading_table', 0, 1], ['reading_table', 6, 1], ['lectern', 4, 5], ['candelabra', 8, 0]],
    face: [...shelves(0, 2), ...mirrors(6, 8)],
    overhead: [['hanging_lamp', 7, 2]],
    lights: [[7, 3, 3, WARM]],
    decals: [['index_cards', 2, 4]],
  }),
  // ---------------------------------------------------------------- set pieces (at most one per floor)
  P('crt_throne_hall', ['set', 'hall'], [
    '......dd......',
    '......dd......',
    '.F....dd....F.',
    '......dd......',
    '......dd......',
    '....C.dd......',
    '......dd......',
  ], {
    decor: [['throne_glass', 6, 1], ['pillar', 4, 0], ['pillar', 9, 0], ['pillar', 4, 6], ['pillar', 9, 6],
      ['candelabra', 0, 0], ['candelabra', 13, 0], ['glass_bench', 1, 4], ['glass_bench', 11, 4], ['book_stack', 13, 6]],
    face: [...portraits(0, 3), ['gallery_rose', 6, -2], ...portraits(9, 2, 1), ['mirror_wall', 13, -2]],
    overhead: [['hanging_lamp', 2, 3], ['hanging_lamp', 11, 3]],
    lights: [[2, 4, 3, WARM], [11, 4, 3, WARM], [6, 1, 4, CYAN]],
    decals: [...inlay(4, 1, 9, 5), ['index_cards', 3, 5], ['index_cards', 10, 5]],
    noDoor: 'n',
    minFloor: 43,
    weight: 2,
  }),
  P('crt_silver_well', ['set', 'wet'], [
    '...........',
    '..wwwwwww..',
    '..wwwwwww..',
    'F.wwwwwww.F',
    '..wwwwwww..',
    '..wwwwwww..',
    '...........',
  ], {
    decor: [['candelabra', 0, 0], ['candelabra', 10, 0], ['candelabra', 0, 6], ['candelabra', 10, 6]],
    face: [['gallery_rose', 4, -2], ...mirrors(0, 2), ...mirrors(8, 10)],
    decals: [...stoneBridgeV(4, 1, 5), ['ink_puddle_0', 1, 5], ['ink_puddle_1', 9, 1]],
    lights: [[5, 3, 4, CYAN]],
    noDoor: 'ns',
    minFloor: 42,
  }),
  P('crt_hall_of_panes', ['set', 'hall'], [
    '...........',
    '.F......s..',
    '....ss..ss.',
    '........ss.',
    '.....C.....',
    'F..........',
  ], {
    decor: [['shelf_b', 1, 2], ['book_stack', 3, 1], ['book_stack', 4, 4], ['book_stack', 10, 0], ['shelf_a', 6, 2], ['pillar', 10, 5], ['card_cabinet', 7, 5]],
    face: [...shelves(0, 1), ['glass_pane_cracked', 3, -2], ['glass_pane_cracked', 5, -2], ...shelves(7, 8), ['glass_pane_cracked', 10, -2]],
    decals: [['index_cards', 5, 1], ['index_cards', 2, 5], ['index_cards', 8, 1], ['ink_puddle_0', 6, 4]],
    minFloor: 42,
  }),
  P('crt_mirror_vault', ['set', 'dead'], [
    '........',
    '........',
    '..BC....',
    '........',
    '...F....',
  ], {
    decor: [['mirror_stand', 0, 1], ['mirror_stand', 7, 1], ['mirror_heavy', 0, 4], ['mirror_heavy', 7, 4], ['candelabra', 3, 0], ['candelabra', 4, 0]],
    face: [...mirrors(0, 7)],
    decals: [...inlay(1, 1, 6, 3), ['index_cards', 5, 3]],
    lights: [[4, 2, 3, WARM]],
    minFloor: 43,
  }),
];

/** The band's legend: every char a prefab may use, mapped to tiles.json ids. */
export const COURT_LEGEND = {
  '#': 'court_gallery_top', '|': 'court_gallery_face', 'v': 'court_gallery_out_top', 'o': 'court_gallery_out_face',
  '.': 'gallery_floor', 'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'stone_floor', 's': 'glass_floor', 'd': 'throne_floor',
  'w': 'mere_water', 'i': 'ink',
};

/** The band's landing (every tenth floor): the Court's silver pool and benches, the plaque between two portraits. */
const row = (...parts) => parts.join('');
const W = '#';
export const COURT_LANDING = {
  id: 'landing_court',
  rows: [
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row('###', '||||||||||||', '###########'),
    row('###', '||||||||||||', '###', '||||||', '##'),
    row('###', '..A......P..', '###', '||||||', '##'),
    row('###', '............', '###', '..S...', '##'),
    row('###', '...wwww.....', '...', '......', '##'),
    row('###', '...wwww.....', '...', '......', '##'),
    row('###', '............', '###', '......', '##'),
    row('###', '..........C.', '###########'),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
    row(W.repeat(26)),
  ],
  decor: [['candelabra', 3, 5], ['candelabra', 14, 5], ['pillar', 3, 10], ['pillar', 14, 10], ['glass_bench', 4, 9], ['glass_bench', 11, 9],
    ['receptor', 12, 6], ['candelabra', 18, 6], ['candelabra', 23, 6], ['book_stack', 23, 9], ['glass_bench', 18, 9]],
  face: [['portrait_blank', 6, 3], ['mirror_wall', 8, 3], ['mirror_wall', 9, 3], ['wall_glyph_revealed', 12, 3], ['wall_shelf_l', 13, 3], ['wall_shelf_r', 14, 3],
    ['portrait_blank_2', 21, 4], ['mirror_wall', 23, 4]],
  decals: [...inlay(5, 6, 10, 9), ['index_cards', 11, 6], ['ink_puddle_0', 19, 9]],
  overhead: [['hanging_lamp', 8, 6]],
  lights: [[8, 7, 3, WARM], [5, 5, 3, WARM], [20, 6, 3, WARM], [12, 6, 3, CYAN]],
};
