// The Deep Stacks: hand-authored room prefabs for the floor generator (docs/DEEP_STACKS_PLAN.md section 4).
//
// Two bands live here: the Catalogue (B1 to B19, the archive sheet's catalog kit: warm wood, carpets, shelves, lamps)
// and the Root Cellars (B20 to B39, the stacks kit over earth: roots, moss, water, braziers). Bands three to five
// (prefabs_b3..5.js, C2-sprites-boss) plug in through gen.js registerBand().
//
// A prefab is the FLOOR of one room as ASCII rows (the generator adds the walls, the two face rows above and the
// corridors) plus its dressing, relative to the room's top-left floor cell (0,0). Row chars:
//   .  the band's main floor        c b  carpet red / blue    m  moss        s  stone flags (gallery_stone)
//   d  old boards (stacks_wood)     w  water (blocked)        i  ink (blocked)
//   #  an interior wall block       |  a face cell the author puts under an interior wall block
//   C  a chest spot (floor)   B  the preferred blue chest spot (also a chest spot)   F  a foe spot (floor)
//   S  a stairs column (the stairs_down object goes in the face above this floor cell)
//   A  an arrival column (the stairs_up object goes in the face above)   P  the plaque spot (landings)
// Marks sit on plain floor; the generator turns them back into '.'.
// `decor`: [id, x, y] props (anchor = bottom-left footprint tile), `face`: [id, x, dy] overlays on the face rows
// (dy = -2 upper, -1 lower; a 16x32 overlay at dy -2 covers both rows), `decals`: [id, x, y] floor overlays,
// `overhead`: [id, x, y] tiles above actors (hanging lamps), `lights`: [x, y, r, color] light events,
// `noDoor`: sides that never take a corridor ('n' 's' 'e' 'w'), `weight`: pick weight (default 1).
// Tags: hall | aisle | reading | small | dead | set | wet. 'dead' rooms are dead-end shaped (a chest alcove);
// 'set' rooms are set pieces the generator uses at most once per floor.
//
// Every tile id must exist in assets/tiles/tiles.json or assets/sprites/props.json (qa/cave/gen_shape.test.mjs checks).

/** Prop footprints [w, h] (h rows up from the anchor row) for the walk model and the door-candidate rules. */
export const PROPS = {
  shelf_a: [2, 1], shelf_b: [2, 1], shelf_wide: [3, 1], shelf_rooted: [2, 1], card_cabinet: [2, 1],
  reading_table: [2, 1], reading_table_long: [3, 1], lectern: [1, 1], book_stack: [1, 1],
  candelabra: [1, 1], brazier_lit: [1, 1], brazier_unlit: [1, 1], pillar: [1, 1], pillar_oak: [1, 1],
  root_column: [2, 1], lantern_pedestal_empty: [1, 1], push_block: [1, 1],
  barrel: [1, 1], crate: [1, 1], bush: [1, 1], bench: [2, 1], cairn: [1, 1], floodwrack: [2, 1], pot: [1, 1],
  stairs_up: [0, 0], stairs_down: [0, 0],   // door objects: the anchor cell is the open doorway
};

/** Overlay tile sizes in cells [w, h] when not 1x1 (collision follows tiles.json; the walk model only needs the cells). */
export const OVERLAY_SIZE = {
  wall_shelf_l: [1, 2], wall_shelf_m: [1, 2], wall_shelf_r: [1, 2], wall_drawers_l: [1, 2], wall_drawers_m: [1, 2], wall_drawers_r: [1, 2],
  great_catalog_dial: [2, 2], gallery_window: [1, 2], gallery_rose: [3, 2], wall_cracked: [1, 2], wall_broken: [1, 2],
  wall_glyph_faint: [1, 2], wall_glyph_revealed: [1, 2], root_drape: [1, 2], wall_ink_seep: [1, 2], hanging_lamp: [1, 2],
  root_mass_a: [2, 1], root_mass_b: [1, 2],
};

/** Overlays that change a cell's collision (everything else keeps the cell's own code). */
export const OVERLAY_OPEN = new Set(['ink_bridge_h_revealed', 'ink_bridge_v_revealed', 'wall_broken',
  'bridge_wood_h_n_l', 'bridge_wood_h_n_m', 'bridge_wood_h_n_r', 'bridge_wood_h_s_l', 'bridge_wood_h_s_m', 'bridge_wood_h_s_r',
  'bridge_wood_v_n_w', 'bridge_wood_v_n_e', 'bridge_wood_v_m_w', 'bridge_wood_v_m_e', 'bridge_wood_v_s_w', 'bridge_wood_v_s_e',
  'bridge_stone_h_n_l', 'bridge_stone_h_n_m', 'bridge_stone_h_n_r', 'bridge_stone_h_s_l', 'bridge_stone_h_s_m', 'bridge_stone_h_s_r']);

const MARKS = { C: 'chest', B: 'blue', F: 'foe', S: 'stairs', A: 'arrival', P: 'plaque' };
const FLOOR_CHARS = new Set(['.', 'c', 'b', 'm', 's', 'd']);
const BLOCKED_CHARS = new Set(['w', 'i', '#', '|']);

/** A run of wall shelves along the upper face row, x0..x1 (at least two cells). */
export const shelves = (x0, x1) => {
  const out = [];
  for (let x = x0; x <= x1; x++) out.push([`wall_shelf_${x === x0 ? 'l' : x === x1 ? 'r' : 'm'}`, x, -2]);
  return out;
};
/** A run of card drawers along the upper face row. */
export const drawers = (x0, x1) => {
  const out = [];
  for (let x = x0; x <= x1; x++) out.push([`wall_drawers_${x === x0 ? 'l' : x === x1 ? 'r' : 'm'}`, x, -2]);
  return out;
};
/** A wooden plank bridge (2 rows of deck, piles under) across water from x0 to x1 with its north deck row at y. */
export const plankBridge = (x0, x1, y) => {
  const out = [];
  const end = (x) => (x === x0 ? 'l' : x === x1 ? 'r' : 'm');
  for (let x = x0; x <= x1; x++) {
    out.push([`bridge_wood_h_n_${end(x)}`, x, y], [`bridge_wood_h_s_${end(x)}`, x, y + 1], [`bridge_wood_h_piles_${end(x)}`, x, y + 2]);
  }
  return out;
};
/** A vertical plank bridge, 2 cells wide, from row y0 (north) to y1 (south). */
export const plankBridgeV = (x, y0, y1) => {
  const out = [];
  for (let y = y0; y <= y1; y++) {
    const r = y === y0 ? 'n' : y === y1 ? 's' : 'm';
    out.push([`bridge_wood_v_${r}_w`, x, y], [`bridge_wood_v_${r}_e`, x + 1, y]);
  }
  return out;
};

const P = (id, tags, rows, extra = {}) => ({ id, tags, rows, ...extra });

// ------------------------------------------------------------------------------------------------ parsing
/**
 * Parse a prefab definition into the shape the generator uses: cells (marks stripped), mark lists, a solid grid of the
 * dressing, door candidates per side. Pure; the result is cached on the definition.
 */
export function parsePrefab(def) {
  if (def._parsed) return def._parsed;
  const rows = def.rows;
  const h = rows.length, w = rows[0].length;
  for (const r of rows) if (r.length !== w) throw new Error(`prefab ${def.id}: ragged rows`);
  const cells = [];
  const marks = { chest: [], blue: [], foe: [], stairs: [], arrival: [], plaque: [] };
  for (let y = 0; y < h; y++) {
    let out = '';
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (MARKS[ch]) { marks[MARKS[ch]].push([x, y]); out += '.'; continue; }
      if (!FLOOR_CHARS.has(ch) && !BLOCKED_CHARS.has(ch)) throw new Error(`prefab ${def.id}: bad char '${ch}' at ${x},${y}`);
      out += ch;
    }
    cells.push(out);
  }
  marks.chest.push(...marks.blue);   // a blue spot is a chest spot too
  // solid cells inside the room: blocked chars, prop footprints, overlays that are not open
  const solid = Array.from({ length: h }, () => new Array(w).fill(false));
  const taken = Array.from({ length: h }, () => new Array(w).fill(false));   // cells a corridor may not open into
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (BLOCKED_CHARS.has(cells[y][x])) { solid[y][x] = true; taken[y][x] = true; }
  for (const [t, x, y] of def.decor || []) {
    const fp = PROPS[t];
    if (!fp) throw new Error(`prefab ${def.id}: unknown prop ${t} (add it to PROPS)`);
    for (let j = 0; j < fp[1]; j++) for (let i = 0; i < fp[0]; i++) {
      const cx = x + i, cy = y - j;
      if (cy < 0 || cy >= h || cx < 0 || cx >= w) throw new Error(`prefab ${def.id}: prop ${t} at ${x},${y} leaves the room`);
      if (BLOCKED_CHARS.has(cells[cy][cx])) throw new Error(`prefab ${def.id}: prop ${t} at ${x},${y} stands on '${cells[cy][cx]}'`);
      solid[cy][cx] = true; taken[cy][cx] = true;
    }
    if (fp[0] === 0) taken[y][x] = true;
  }
  const bridged = Array.from({ length: h }, () => new Array(w).fill(false));
  for (const [t, x, y] of def.decals || []) {
    const [ow, oh] = OVERLAY_SIZE[t] || [1, 1];
    for (let j = 0; j < oh; j++) for (let i = 0; i < ow; i++) {
      const cx = x + i, cy = y + j;
      if (cy < 0 || cy >= h || cx < 0 || cx >= w) throw new Error(`prefab ${def.id}: decal ${t} at ${x},${y} leaves the room`);
      if (OVERLAY_OPEN.has(t)) { solid[cy][cx] = false; bridged[cy][cx] = true; }
    }
  }
  for (const [t, x, dy] of def.face || []) {
    if (dy !== -1 && dy !== -2) throw new Error(`prefab ${def.id}: face overlay ${t} needs dy -1 or -2`);
    if (x < 0 || x >= w) throw new Error(`prefab ${def.id}: face overlay ${t} at ${x} leaves the room`);
  }
  for (const [x, y] of [...marks.chest, ...marks.foe, ...marks.stairs, ...marks.arrival, ...marks.plaque]) {
    if (solid[y][x]) throw new Error(`prefab ${def.id}: a mark at ${x},${y} sits on a solid cell`);
  }
  for (const [x, y] of [...marks.stairs, ...marks.arrival, ...marks.plaque]) {
    if (y !== 0) throw new Error(`prefab ${def.id}: stairs, arrival and plaque marks sit on row 0 (under the north face)`);
  }
  for (const [x, y] of marks.chest) taken[y][x] = true;
  // every open cell must be 4-connected to every other (no pocket boxed in by props): marks and door openings depend on it
  {
    let first = null, count = 0;
    const walkable = (x, y) => !solid[y][x] && (FLOOR_CHARS.has(cells[y][x]) || bridged[y][x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (walkable(x, y)) { count++; if (!first) first = [x, y]; }
    const seen = new Set();
    const q = first ? [first] : [];
    if (first) seen.add(first.join(','));
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || !walkable(nx, ny) || seen.has(`${nx},${ny}`)) continue;
        seen.add(`${nx},${ny}`); q.push([nx, ny]);
      }
    }
    if (seen.size !== count) throw new Error(`prefab ${def.id}: ${count - seen.size} floor cell(s) are boxed in by props`);
  }
  // door candidates: 2-cell openings on each side whose edge cells and the cells one inward are free floor
  const free = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !taken[y][x] && FLOOR_CHARS.has(cells[y][x]);
  const no = new Set((def.noDoor || '').split(''));
  const doors = { n: [], s: [], e: [], w: [] };
  for (let x = 0; x + 1 < w; x++) {
    if (!no.has('n') && free(x, 0) && free(x + 1, 0) && free(x, 1) && free(x + 1, 1)) doors.n.push(x);
    if (!no.has('s') && free(x, h - 1) && free(x + 1, h - 1) && free(x, h - 2) && free(x + 1, h - 2)) doors.s.push(x);
  }
  for (let y = 0; y + 1 < h; y++) {
    if (!no.has('w') && free(0, y) && free(0, y + 1) && free(1, y) && free(1, y + 1)) doors.w.push(y);
    if (!no.has('e') && free(w - 1, y) && free(w - 1, y + 1) && free(w - 2, y) && free(w - 2, y + 1)) doors.e.push(y);
  }
  // stair / arrival columns: a free floor column under the north face (the object is 2 cells wide; x+1 stays face)
  const cols = [];
  for (let x = 0; x < w; x++) if (free(x, 0) && free(x, 1) && !marks.chest.some(([cx, cy]) => cx === x && cy <= 1)) cols.push(x);
  const usable = Object.values(doors).reduce((n, l) => n + l.length, 0);
  if (usable < 2) throw new Error(`prefab ${def.id}: fewer than two door openings`);
  if (!marks.foe.length) throw new Error(`prefab ${def.id}: no foe spot`);
  const parsed = { id: def.id, tags: def.tags, w, h, cells, marks, solid, taken, doors, cols, weight: def.weight || 1,
    decor: def.decor || [], face: def.face || [], decals: def.decals || [], overhead: def.overhead || [], lights: def.lights || [],
    minFloor: def.minFloor || 0 };
  def._parsed = parsed;
  return parsed;
}

// ================================================================================================ band one: the Catalogue
// Catalog kit (archive_f1's look): catalog_wood floor, red and blue carpets, card drawers and shelves on the faces,
// hanging lamps over the desks, oak pillars, candelabra, book stacks and index cards strewn on the floor.
export const CATALOGUE = [
  // ---------------------------------------------------------------- halls
  P('cat_long_hall', ['hall'], [
    '....cc......',
    '....cc......',
    'F...cc....F.',
    '....cc......',
    '....cc.....C',
    '....cc......',
  ], {
    decor: [['reading_table_long', 1, 1], ['reading_table_long', 7, 1], ['pillar_oak', 0, 0], ['pillar_oak', 11, 0],
      ['candelabra', 2, 4], ['candelabra', 9, 4]],
    face: [...shelves(0, 3), ['gallery_window', 5, -2], ...shelves(7, 10)],
    overhead: [['hanging_lamp', 2, 2], ['hanging_lamp', 8, 2]],
    lights: [[2, 3, 3, '#ffd9a0'], [8, 3, 3, '#ffd9a0']],
    decals: [['index_cards', 6, 4], ['roots_1', 0, 5]],
    weight: 2,
  }),
  P('cat_pillar_hall', ['hall'], [
    '..........',
    '.F......F.',
    '....cc....',
    '....cc....',
    '.....C....',
    '..........',
  ], {
    decor: [['pillar_oak', 2, 1], ['pillar_oak', 7, 1], ['pillar_oak', 2, 4], ['pillar_oak', 7, 4], ['book_stack', 0, 5], ['candelabra', 9, 0]],
    face: [...drawers(1, 3), ...drawers(6, 8)],
    decals: [['index_cards', 5, 5], ['ink_puddle_0', 9, 4]],
    weight: 2,
  }),
  P('cat_carpet_hall', ['hall'], [
    '.bbbbbbbb.',
    '.b......b.',
    '.b.F..F.b.',
    '.b......b.',
    '.bbbbbbbb.',
  ], {
    decor: [['candelabra', 0, 0], ['candelabra', 9, 0], ['reading_table', 4, 2]],
    face: [['wall_glyph_revealed', 4, -2], ...shelves(1, 2), ...shelves(7, 8)],
    overhead: [['hanging_lamp', 4, 1]],
    lights: [[4, 2, 3, '#ffd9a0']],
  }),
  P('cat_wide_hall', ['hall'], [
    '...........',
    '.F.......F.',
    '.....C.....',
    '...........',
    '...........',
    '.F.........',
    '...........',
  ], {
    decor: [['reading_table_long', 1, 3], ['reading_table_long', 7, 3], ['pillar_oak', 0, 0], ['pillar_oak', 10, 0],
      ['pillar_oak', 0, 6], ['pillar_oak', 10, 6], ['candelabra', 5, 0]],
    face: [...drawers(0, 3), ['gallery_window', 5, -2], ...drawers(7, 10)],
    overhead: [['hanging_lamp', 2, 1], ['hanging_lamp', 8, 1]],
    lights: [[2, 2, 3, '#ffd9a0'], [8, 2, 3, '#ffd9a0']],
    decals: [['index_cards', 3, 5], ['index_cards', 9, 5], ['roots_0', 10, 5]],
    minFloor: 4,
  }),
  P('cat_crossing', ['hall'], [
    '...cc...',
    'F..cc..F',
    'cccccccc',
    'cccccccc',
    '...cc...',
    '...cc..C',
  ], {
    decor: [['pillar_oak', 0, 0], ['pillar_oak', 7, 0], ['pillar_oak', 0, 5], ['candelabra', 1, 4], ['candelabra', 6, 4]],
    face: [...shelves(1, 2), ...shelves(5, 6)],
    overhead: [['hanging_lamp', 3, 1]],
    lights: [[3, 2, 3, '#ffd9a0']],
  }),
  // ---------------------------------------------------------------- aisles
  P('cat_aisle_two', ['aisle'], [
    '.........',
    '.F.......',
    '.........',
    '.........',
    '.......F.',
    '.........',
    '....C....',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_a', 5, 2], ['shelf_wide', 1, 5], ['shelf_b', 6, 5], ['candelabra', 8, 0], ['book_stack', 0, 6]],
    face: [...shelves(0, 2), ...shelves(4, 8)],
    decals: [['index_cards', 7, 1], ['ink_puddle_1', 3, 0]],
    weight: 2,
  }),
  P('cat_aisle_three', ['aisle'], [
    '..........',
    '.F........',
    '..........',
    '..........',
    '.........F',
    '..........',
    '..........',
    'C.........',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_wide', 5, 2], ['shelf_b', 1, 5], ['shelf_a', 6, 5], ['card_cabinet', 8, 7],
      ['candelabra', 9, 0]],
    face: [...shelves(0, 3), ...shelves(5, 9)],
    decals: [['index_cards', 4, 1], ['index_cards', 4, 6]],
    minFloor: 3,
  }),
  P('cat_stack_corner', ['aisle', 'small'], [
    '......',
    '.....F',
    '......',
    'C.....',
  ], {
    decor: [['shelf_a', 1, 2], ['shelf_a', 3, 2], ['book_stack', 5, 3], ['candelabra', 0, 0]],
    face: [...shelves(1, 5)],
    decals: [['index_cards', 2, 3]],
  }),
  P('cat_narrow_stacks', ['aisle'], [
    '.......',
    '.F.....',
    '.......',
    '.......',
    '....F..',
    '.......',
    '......C',
    '.......',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_a', 4, 2], ['shelf_wide', 2, 5], ['shelf_b', 0, 5], ['card_cabinet', 5, 7], ['candelabra', 0, 0]],
    face: [...shelves(0, 1), ...drawers(3, 6)],
    decals: [['ink_puddle_0', 6, 4], ['index_cards', 3, 7]],
    minFloor: 2,
  }),
  P('cat_lamp_stacks', ['aisle'], [
    '..........',
    '..........',
    'F........F',
    '..........',
    '..........',
    '..........',
    '...C......',
  ], {
    decor: [['shelf_wide', 1, 2], ['shelf_wide', 6, 2], ['shelf_wide', 1, 5], ['shelf_wide', 6, 5], ['book_stack', 9, 6]],
    face: [...shelves(0, 2), ['gallery_window', 4, -2], ...shelves(6, 9)],
    overhead: [['hanging_lamp', 4, 2]],
    lights: [[4, 3, 3, '#ffd9a0']],
    decals: [['index_cards', 0, 6]],
  }),
  // ---------------------------------------------------------------- reading rooms
  P('cat_reading_room', ['reading'], [
    '.........',
    '.........',
    '...F.....',
    '.........',
    '........C',
    '.........',
  ], {
    decor: [['reading_table', 1, 1], ['reading_table', 6, 1], ['lectern', 4, 4], ['candelabra', 0, 0], ['candelabra', 8, 0],
      ['book_stack', 0, 5], ['pillar_oak', 2, 5]],
    face: [...shelves(1, 3), ['gallery_window', 4, -2], ...shelves(5, 7)],
    overhead: [['hanging_lamp', 1, 1], ['hanging_lamp', 6, 1]],
    lights: [[1, 2, 3, '#ffd9a0'], [6, 2, 3, '#ffd9a0']],
    decals: [['index_cards', 5, 3]],
    weight: 2,
  }),
  P('cat_study', ['reading', 'small'], [
    '......',
    '......',
    '..F...',
    '.....C',
  ], {
    decor: [['reading_table', 1, 1], ['lectern', 4, 1], ['candelabra', 0, 0], ['book_stack', 0, 3]],
    face: [...drawers(0, 2), ...shelves(3, 5)],
    overhead: [['hanging_lamp', 1, 1]],
    lights: [[1, 2, 3, '#ffd9a0']],
  }),
  P('cat_scriptorium', ['reading'], [
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
    lights: [[2, 3, 3, '#ffd9a0'], [6, 2, 3, '#ffd9a0']],
    decals: [['index_cards', 6, 5], ['ink_puddle_1', 8, 5]],
    minFloor: 5,
  }),
  P('cat_lectern_ring', ['reading'], [
    '.........',
    '..F......',
    '....b....',
    '...bbb...',
    '....b....',
    '......F..',
    '.C.......',
  ], {
    decor: [['lectern', 1, 1], ['lectern', 7, 1], ['lectern', 1, 5], ['lectern', 7, 5], ['lantern_pedestal_empty', 4, 3],
      ['candelabra', 0, 0], ['candelabra', 8, 0]],
    face: [...shelves(1, 7)],
    lights: [[4, 3, 4, '#9fe8d8']],
    decals: [['index_cards', 8, 6]],
    minFloor: 3,
  }),
  P('cat_desk_row', ['reading'], [
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
    lights: [[3, 3, 3, '#ffd9a0']],
    decals: [['index_cards', 4, 5], ['roots_2', 7, 2]],
  }),
  // ---------------------------------------------------------------- small rooms and alcoves
  P('cat_alcove', ['dead', 'small'], [
    '.....',
    '..C..',
    '.....',
    '.F...',
  ], {
    decor: [['candelabra', 0, 0], ['candelabra', 4, 0], ['book_stack', 4, 3]],
    face: [['wall_glyph_revealed', 2, -2], ...shelves(0, 1), ...shelves(3, 4)],
    decals: [['index_cards', 3, 2]],
    weight: 2,
  }),
  P('cat_niche', ['dead', 'small'], [
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
  P('cat_closet', ['dead', 'small'], [
    '......',
    '......',
    '.C..F.',
    '......',
  ], {
    decor: [['shelf_a', 0, 1], ['shelf_a', 4, 1], ['book_stack', 5, 3]],
    face: [...shelves(0, 5)],
    decals: [['index_cards', 0, 3]],
  }),
  P('cat_vault', ['dead', 'small'], [
    '......',
    '..bb..',
    '.bCCb.',
    '..bb..',
    '.F....',
  ], {
    decor: [['pillar_oak', 0, 0], ['pillar_oak', 5, 0], ['pillar_oak', 0, 4], ['pillar_oak', 5, 4]],
    face: [['wall_glyph_revealed', 2, -2], ['gallery_window', 3, -2]],
    lights: [[2, 2, 3, '#9fe8d8']],
    minFloor: 4,
  }),
  P('cat_cards_alcove', ['dead', 'small'], [
    '......',
    '......',
    '....C.',
    '.F....',
  ], {
    decor: [['card_cabinet', 0, 1], ['card_cabinet', 2, 1], ['candelabra', 5, 0]],
    face: [...drawers(0, 5)],
    decals: [['index_cards', 0, 3], ['index_cards', 4, 1]],
  }),
  P('cat_ink_alcove', ['dead', 'small'], [
    '.......',
    '..iii..',
    '..iii..',
    '.......',
    'F.....C',
  ], {
    decor: [['candelabra', 0, 0], ['candelabra', 6, 0]],
    face: [['wall_cracked', 3, -2], ...shelves(0, 1), ...shelves(5, 6)],
    decals: [['ink_puddle_1', 1, 3], ['roots_0', 6, 3]],
  }),
  P('cat_side_room', ['small'], [
    '......',
    '.F....',
    '......',
    '......',
  ], {
    decor: [['reading_table', 3, 2], ['candelabra', 0, 0], ['book_stack', 5, 3]],
    face: [...shelves(1, 4)],
    decals: [['index_cards', 1, 3]],
    weight: 2,
  }),
  P('cat_cell', ['small'], [
    '.....',
    '..F..',
    '.....',
    '.....',
  ], {
    decor: [['pillar_oak', 0, 0], ['pillar_oak', 4, 0], ['book_stack', 4, 3]],
    face: [['gallery_window', 2, -2]],
    decals: [['roots_1', 0, 3]],
    weight: 2,
  }),
  P('cat_lamp_cell', ['small'], [
    '......',
    '......',
    '.F....',
    '.....C',
    '......',
  ], {
    decor: [['lectern', 2, 1], ['candelabra', 0, 4]],
    face: [...shelves(0, 2), ...drawers(3, 5)],
    overhead: [['hanging_lamp', 2, 2]],
    lights: [[2, 3, 3, '#ffd9a0']],
  }),
  P('cat_moss_room', ['small'], [
    '......',
    '.mm...',
    '.mm.F.',
    '......',
    'C.....',
  ], {
    decor: [['candelabra', 5, 0], ['book_stack', 5, 4]],
    face: [['wall_cracked', 1, -2], ...shelves(3, 5)],
    decals: [['roots_2', 0, 1], ['roots_0', 2, 3], ['ink_puddle_0', 4, 4]],
  }),
  // ---------------------------------------------------------------- odd shapes
  P('cat_bent_gallery', ['hall'], [
    '..........',
    '.F........',
    '..........',
    '......####',
    '......||||',
    '..F...C...',
    '..........',
  ], {
    decor: [['shelf_wide', 2, 2], ['reading_table', 7, 1], ['candelabra', 0, 0], ['candelabra', 9, 0], ['book_stack', 9, 6]],
    face: [...shelves(0, 3), ...drawers(5, 9)],
    decals: [['index_cards', 4, 6], ['ink_puddle_1', 8, 2]],
    minFloor: 3,
  }),
  P('cat_split_room', ['reading'], [
    '.........',
    '..F......',
    '...##....',
    '...||....',
    '......F..',
    'C........',
  ], {
    decor: [['reading_table', 0, 1], ['reading_table', 6, 1], ['lectern', 4, 5], ['candelabra', 8, 0]],
    face: [...shelves(0, 2), ...shelves(6, 8)],
    overhead: [['hanging_lamp', 7, 2]],
    lights: [[7, 3, 3, '#ffd9a0']],
    decals: [['index_cards', 2, 4]],
  }),
  P('cat_window_gallery', ['hall'], [
    '.............',
    'F...........F',
    '....cccc.....',
    '....cccc.....',
    '.............',
  ], {
    decor: [['reading_table', 1, 2], ['reading_table', 10, 2], ['pillar_oak', 0, 0], ['pillar_oak', 12, 0], ['pillar_oak', 0, 4], ['pillar_oak', 12, 4],
      ['lectern', 6, 1]],
    face: [['gallery_window', 1, -2], ...shelves(2, 4), ['gallery_rose', 5, -2], ...shelves(8, 10), ['gallery_window', 11, -2]],
    overhead: [['hanging_lamp', 3, 2], ['hanging_lamp', 9, 2]],
    lights: [[3, 3, 3, '#ffd9a0'], [9, 3, 3, '#ffd9a0'], [6, 1, 4, '#9fe8d8']],
    minFloor: 6,
  }),
  // ---------------------------------------------------------------- set pieces (at most one per floor)
  P('cat_great_catalog', ['set', 'hall'], [
    '......cc......',
    '......cc......',
    '.F....cc....F.',
    '......cc......',
    '......cc......',
    '....C.cc......',
    '......cc......',
  ], {
    decor: [['reading_table_long', 1, 3], ['reading_table_long', 10, 3], ['pillar_oak', 4, 0], ['pillar_oak', 9, 0], ['pillar_oak', 4, 6], ['pillar_oak', 9, 6],
      ['candelabra', 0, 0], ['candelabra', 13, 0], ['book_stack', 0, 6], ['book_stack', 13, 6]],
    face: [...drawers(1, 5), ['great_catalog_dial', 6, -2], ...drawers(8, 12)],
    overhead: [['hanging_lamp', 2, 3], ['hanging_lamp', 11, 3]],
    lights: [[2, 4, 3, '#ffd9a0'], [11, 4, 3, '#ffd9a0'], [6, 1, 4, '#ffd9a0']],
    decals: [['index_cards', 3, 5], ['index_cards', 10, 5], ['index_cards', 12, 1]],
    noDoor: 'n',
    minFloor: 3,
    weight: 2,
  }),
  P('cat_reading_well', ['set', 'wet'], [
    '...........',
    '..iiiiiii..',
    '..iiiiiii..',
    'F.iii.iii.F',
    '..iiiiiii..',
    '..iiiiiii..',
    '...........',
  ], {
    decor: [['lectern', 5, 3], ['candelabra', 0, 0], ['candelabra', 10, 0], ['candelabra', 0, 6], ['candelabra', 10, 6]],
    face: [['gallery_rose', 4, -2], ...shelves(0, 2), ...shelves(8, 10)],
    decals: [['ink_bridge_v_revealed', 5, 1], ['ink_bridge_v_revealed', 5, 2], ['ink_bridge_v_revealed', 5, 4], ['ink_bridge_v_revealed', 5, 5],
      ['ink_puddle_0', 1, 5], ['ink_puddle_1', 9, 1]],
    lights: [[5, 3, 4, '#9fe8d8']],
    noDoor: 'ns',
    minFloor: 2,
  }),
  P('cat_collapsed_gallery', ['set', 'hall'], [
    '...........',
    '.F......m..',
    '....mm..mm.',
    '........mm.',
    '.....C.....',
    'F..........',
  ], {
    decor: [['shelf_b', 1, 2], ['book_stack', 3, 1], ['book_stack', 4, 4], ['book_stack', 10, 0], ['shelf_a', 6, 2], ['pillar_oak', 10, 5], ['card_cabinet', 7, 5]],
    face: [...shelves(0, 1), ['wall_cracked', 3, -2], ['wall_cracked', 5, -2], ...shelves(7, 8), ['wall_cracked', 10, -2]],
    decals: [['roots_0', 5, 1], ['roots_1', 9, 4], ['roots_2', 0, 4], ['index_cards', 2, 5], ['index_cards', 8, 1], ['ink_puddle_0', 6, 4]],
    minFloor: 2,
  }),
  P('cat_rose_chapel', ['set', 'reading'], [
    '.........',
    '...bbb...',
    '...bbb...',
    '.F.bbb.F.',
    '...bbb...',
    '....C....',
  ], {
    decor: [['lantern_pedestal_empty', 4, 2], ['candelabra', 1, 0], ['candelabra', 7, 0], ['pillar_oak', 0, 5], ['pillar_oak', 8, 5], ['lectern', 1, 4], ['lectern', 7, 4]],
    face: [['gallery_window', 1, -2], ['gallery_rose', 3, -2], ['gallery_window', 7, -2]],
    lights: [[4, 2, 5, '#9fe8d8']],
    noDoor: 'n',
    minFloor: 5,
  }),
  P('cat_card_vault', ['set', 'dead'], [
    '........',
    '........',
    '..BC....',
    '........',
    '...F....',
  ], {
    decor: [['card_cabinet', 0, 1], ['card_cabinet', 6, 1], ['card_cabinet', 0, 4], ['card_cabinet', 6, 4], ['candelabra', 3, 0], ['candelabra', 4, 0]],
    face: [...drawers(0, 7)],
    decals: [['index_cards', 1, 2], ['index_cards', 5, 3]],
    lights: [[4, 2, 3, '#ffd9a0']],
    minFloor: 3,
  }),
  P('cat_two_lamp_study', ['reading', 'small'], [
    '.......',
    '.......',
    '.F...F.',
    '.......',
  ], {
    decor: [['reading_table', 0, 1], ['reading_table', 5, 1], ['lectern', 3, 3], ['book_stack', 6, 3]],
    face: [...shelves(0, 6)],
    overhead: [['hanging_lamp', 1, 1], ['hanging_lamp', 5, 1]],
    lights: [[1, 2, 3, '#ffd9a0'], [5, 2, 3, '#ffd9a0']],
  }),
  P('cat_ledger_room', ['reading', 'small'], [
    '......',
    '......',
    '.F....',
    '....C.',
  ], {
    decor: [['reading_table_long', 1, 1], ['candelabra', 5, 0], ['book_stack', 0, 3]],
    face: [...drawers(1, 4)],
    decals: [['index_cards', 5, 2]],
  }),
];

// ================================================================================================ band two: the Root Cellars
// The stacks kit (archive_f3's rooted wood walls) over packed earth: moss, pools of water with reeds, old boards, rooted
// shelves, root columns and drapes, ink seeping from the faces, braziers for light (the band is dark).
export const CELLARS = [
  // ---------------------------------------------------------------- halls
  P('cel_root_hall', ['hall'], [
    '............',
    '.F........F.',
    '............',
    '....mmm.....',
    '....mm......',
    '...........C',
    '............',
  ], {
    decor: [['root_column', 1, 2], ['root_column', 9, 2], ['brazier_lit', 0, 0], ['brazier_lit', 11, 0], ['root_column', 5, 6], ['book_stack', 0, 6]],
    face: [['root_drape', 2, -2], ...shelves(4, 7), ['wall_ink_seep', 9, -2]],
    lights: [[0, 1, 5, '#ffb070'], [11, 1, 5, '#ffb070']],
    decals: [['roots_0', 3, 5], ['roots_1', 10, 3], ['roots_2', 7, 6], ['ink_puddle_0', 8, 2]],
    weight: 2,
  }),
  P('cel_pool_hall', ['hall', 'wet'], [
    '..........',
    '.F.wwww...',
    '...wwww.F.',
    '...wwww...',
    '..........',
    'C.........',
  ], {
    decor: [['root_column', 0, 2], ['brazier_lit', 9, 0], ['brazier_lit', 9, 5], ['floodwrack', 7, 4]],
    face: [['root_drape', 0, -2], ['wall_ink_seep', 4, -2], ['root_drape', 8, -2]],
    lights: [[9, 1, 5, '#ffb070'], [9, 4, 4, '#ffb070']],
    decals: [['reeds_0', 2, 1], ['reeds_1', 7, 1], ['reeds_2', 2, 3], ['reeds_0', 7, 3], ['roots_1', 1, 5], ['tuft_0', 8, 1]],
    weight: 2,
  }),
  P('cel_boards_hall', ['hall'], [
    '....dd....',
    '....dd....',
    'F...dd...F',
    '....dd....',
    '....dd....',
    '...C......',
  ], {
    decor: [['pillar', 1, 0], ['pillar', 8, 0], ['pillar', 1, 5], ['pillar', 8, 5], ['brazier_lit', 3, 0], ['brazier_lit', 6, 0], ['crate', 9, 3]],
    face: [['root_drape', 0, -2], ...shelves(2, 3), ['root_drape', 4, -2], ...shelves(6, 7), ['root_drape', 9, -2]],
    lights: [[3, 1, 5, '#ffb070'], [6, 1, 5, '#ffb070']],
    decals: [['roots_0', 0, 4], ['roots_2', 9, 1], ['ink_puddle_1', 7, 4]],
  }),
  P('cel_column_hall', ['hall'], [
    '............',
    '............',
    '.F........F.',
    'm...........',
    'mm..........',
    '.......C....',
    '............',
  ], {
    decor: [['root_column', 2, 1], ['root_column', 8, 1], ['root_column', 2, 5], ['root_column', 8, 5], ['brazier_lit', 5, 0], ['brazier_lit', 6, 0], ['cairn', 0, 6]],
    face: [['wall_ink_seep', 1, -2], ...shelves(4, 7), ['root_drape', 10, -2]],
    lights: [[5, 1, 6, '#ffb070']],
    decals: [['roots_1', 5, 6], ['roots_0', 11, 3], ['tuft_1', 11, 6]],
    minFloor: 24,
  }),
  P('cel_long_cellar', ['hall'], [
    '.............',
    'F...........F',
    '.............',
    '......C......',
  ], {
    decor: [['barrel', 0, 0], ['barrel', 1, 0], ['crate', 0, 3], ['barrel', 12, 0], ['crate', 11, 0], ['brazier_lit', 6, 0], ['root_column', 3, 2], ['root_column', 9, 2]],
    face: [...shelves(2, 4), ['root_drape', 6, -2], ...shelves(8, 10)],
    lights: [[6, 1, 5, '#ffb070']],
    decals: [['roots_2', 4, 3], ['roots_0', 9, 3], ['ink_puddle_0', 11, 2]],
    minFloor: 22,
  }),
  // ---------------------------------------------------------------- stacks
  P('cel_rooted_stacks', ['aisle'], [
    '.........',
    '.F.......',
    '.........',
    '.........',
    '.......F.',
    '.........',
    'C........',
  ], {
    decor: [['shelf_rooted', 1, 2], ['shelf_b', 4, 2], ['shelf_rooted', 6, 5], ['shelf_rooted', 1, 5], ['brazier_lit', 8, 0], ['book_stack', 8, 6]],
    face: [...shelves(0, 2), ['root_drape', 3, -2], ...shelves(5, 8)],
    lights: [[8, 1, 5, '#ffb070']],
    decals: [['roots_0', 3, 6], ['roots_1', 0, 3], ['ink_puddle_1', 7, 1]],
    weight: 2,
  }),
  P('cel_drowned_stacks', ['aisle', 'wet'], [
    '..........',
    '.F........',
    '..wwwww...',
    '..wwwww..F',
    '..........',
    '.....C....',
  ], {
    decor: [['shelf_rooted', 3, 1], ['shelf_rooted', 7, 1], ['shelf_b', 2, 5], ['brazier_lit', 9, 0], ['floodwrack', 7, 5]],
    face: [...shelves(0, 1), ['wall_ink_seep', 2, -2], ...shelves(4, 6), ['root_drape', 8, -2]],
    lights: [[9, 1, 5, '#ffb070']],
    decals: [['reeds_1', 1, 2], ['reeds_0', 7, 2], ['reeds_2', 1, 3], ['roots_2', 9, 4]],
    minFloor: 23,
  }),
  P('cel_shelf_corner', ['aisle', 'small'], [
    '......',
    '.....F',
    '......',
    'C.....',
  ], {
    decor: [['shelf_rooted', 1, 2], ['shelf_b', 3, 2], ['brazier_lit', 0, 0], ['book_stack', 5, 3]],
    face: [...shelves(1, 5)],
    lights: [[0, 1, 4, '#ffb070']],
    decals: [['roots_0', 2, 3]],
  }),
  P('cel_ink_stacks', ['aisle'], [
    '.........',
    '.F.......',
    '.........',
    '...iii...',
    '...iii..F',
    '.........',
    'C........',
  ], {
    decor: [['shelf_rooted', 1, 2], ['shelf_rooted', 6, 2], ['shelf_b', 1, 6], ['shelf_rooted', 6, 6], ['brazier_lit', 8, 0], ['brazier_lit', 0, 0]],
    face: [...shelves(1, 3), ['wall_ink_seep', 4, -2], ...shelves(5, 7)],
    lights: [[8, 1, 5, '#ffb070'], [0, 1, 5, '#ffb070']],
    decals: [['ink_puddle_0', 2, 4], ['ink_puddle_1', 6, 5], ['roots_1', 8, 5]],
    minFloor: 25,
  }),
  P('cel_tall_stacks', ['aisle'], [
    '.......',
    '.......',
    '.......',
    '..F....',
    '.......',
    '.......',
    '....F..',
    '......C',
  ], {
    decor: [['shelf_rooted', 1, 1], ['shelf_rooted', 4, 1], ['shelf_b', 1, 5], ['shelf_rooted', 4, 5], ['brazier_lit', 0, 7], ['root_column', 2, 7]],
    face: [...shelves(0, 6)],
    lights: [[0, 6, 5, '#ffb070']],
    decals: [['roots_2', 6, 2], ['roots_0', 0, 5], ['ink_puddle_0', 5, 7]],
    minFloor: 21,
  }),
  // ---------------------------------------------------------------- stores and cellars
  P('cel_store', ['reading', 'small'], [
    '......',
    '......',
    '.F....',
    '.....C',
  ], {
    decor: [['barrel', 0, 0], ['barrel', 1, 0], ['crate', 5, 0], ['crate', 0, 3], ['brazier_lit', 3, 0]],
    face: [...shelves(0, 2), ['root_drape', 4, -2]],
    lights: [[3, 1, 4, '#ffb070']],
    decals: [['roots_1', 4, 3]],
    weight: 2,
  }),
  P('cel_oil_store', ['reading'], [
    '........',
    '........',
    '..F.....',
    '........',
    '.......F',
    'C.......',
  ], {
    decor: [['barrel', 0, 0], ['barrel', 1, 0], ['barrel', 0, 1], ['crate', 7, 0], ['crate', 6, 0], ['bench', 3, 1], ['brazier_lit', 7, 5], ['book_stack', 4, 5]],
    face: [...shelves(0, 1), ['wall_cracked', 3, -2], ...shelves(5, 7)],
    lights: [[7, 4, 5, '#ffb070']],
    decals: [['ink_puddle_1', 5, 3], ['roots_0', 2, 5]],
  }),
  P('cel_rubble_room', ['reading'], [
    '.........',
    '.F.......',
    '.........',
    '......F..',
    '.........',
    '...C.....',
  ], {
    decor: [['cairn', 0, 0], ['cairn', 1, 0], ['cairn', 8, 4], ['cairn', 6, 5], ['pillar', 4, 0], ['brazier_lit', 8, 0], ['bush', 0, 5]],
    face: [['wall_cracked', 1, -2], ['wall_cracked', 3, -2], ...shelves(5, 7)],
    lights: [[8, 1, 5, '#ffb070']],
    decals: [['pebbles_0', 2, 2], ['pebbles_2', 6, 1], ['roots_2', 8, 2], ['tuft_0', 1, 4]],
  }),
  P('cel_moss_cellar', ['reading'], [
    '..........',
    '.mm.......',
    '.mm..F....',
    '.......mm.',
    'F......mm.',
    '.....C....',
  ], {
    decor: [['root_column', 3, 1], ['brazier_lit', 9, 0], ['brazier_lit', 0, 5], ['bush', 9, 5]],
    face: [['root_drape', 1, -2], ...shelves(3, 6), ['root_drape', 8, -2]],
    lights: [[9, 1, 5, '#ffb070'], [0, 4, 5, '#ffb070']],
    decals: [['roots_0', 5, 0], ['roots_1', 9, 3], ['tuft_1', 2, 5], ['leaves', 6, 3]],
    weight: 2,
  }),
  P('cel_reading_nook', ['reading', 'small'], [
    '......',
    '......',
    '..F...',
    '.....C',
  ], {
    decor: [['reading_table', 1, 1], ['lectern', 4, 1], ['brazier_lit', 0, 0], ['book_stack', 0, 3]],
    face: [...shelves(0, 2), ['wall_ink_seep', 4, -2]],
    lights: [[0, 1, 4, '#ffb070']],
    decals: [['roots_2', 5, 2]],
  }),
  // ---------------------------------------------------------------- wet rooms
  P('cel_cistern', ['set', 'wet'], [
    '..........',
    '.F......F.',
    '.wwwwwwww.',
    '.wwwwwwww.',
    '.wwwwwwww.',
    '..........',
    '....C.....',
  ], {
    decor: [['brazier_lit', 0, 0], ['brazier_lit', 9, 0], ['brazier_lit', 0, 6], ['brazier_lit', 9, 6], ['floodwrack', 7, 5]],
    face: [['wall_ink_seep', 1, -2], ...shelves(3, 6), ['wall_ink_seep', 8, -2]],
    decals: [...plankBridgeV(4, 2, 4), ['reeds_0', 0, 2], ['reeds_1', 9, 3], ['reeds_2', 1, 5], ['reeds_0', 8, 1]],
    lights: [[0, 1, 5, '#ffb070'], [9, 1, 5, '#ffb070'], [0, 5, 5, '#ffb070'], [9, 5, 5, '#ffb070']],
    noDoor: 'n',
    minFloor: 22,
    weight: 2,
  }),
  P('cel_spring', ['wet', 'small'], [
    '.......',
    '..ww...',
    '..ww.F.',
    '.......',
    'C......',
  ], {
    decor: [['brazier_lit', 6, 0], ['cairn', 0, 1], ['bush', 6, 4]],
    face: [['wall_ink_seep', 2, -2], ['root_drape', 5, -2]],
    lights: [[6, 1, 4, '#ffb070']],
    decals: [['reeds_1', 1, 1], ['reeds_0', 4, 2], ['tuft_0', 1, 3], ['pebbles_1', 5, 3]],
    weight: 2,
  }),
  P('cel_ford', ['wet', 'hall'], [
    '...........',
    '.F.........',
    '...........',
    'wwwwwwwwwww',
    'wwwwwwwwwww',
    'wwwwwwwwwww',
    '.........F.',
    '......C....',
  ], {
    decor: [['brazier_lit', 0, 0], ['brazier_lit', 10, 0], ['brazier_lit', 0, 7], ['brazier_lit', 10, 7], ['root_column', 4, 1], ['floodwrack', 2, 6]],
    face: [['root_drape', 1, -2], ...shelves(3, 7), ['root_drape', 9, -2]],
    decals: [...plankBridgeV(5, 3, 5), ['reeds_0', 1, 2], ['reeds_2', 9, 2], ['reeds_1', 3, 6], ['reeds_0', 8, 6]],
    lights: [[0, 1, 5, '#ffb070'], [10, 1, 5, '#ffb070'], [0, 6, 5, '#ffb070'], [10, 6, 5, '#ffb070']],
    noDoor: 'ew',
    minFloor: 24,
  }),
  P('cel_pool_room', ['wet'], [
    '.........',
    '.F.......',
    '....www..',
    '....www..',
    '.......F.',
    'C........',
  ], {
    decor: [['brazier_lit', 8, 0], ['root_column', 1, 3], ['crate', 8, 5]],
    face: [...shelves(0, 2), ['wall_ink_seep', 4, -2], ['root_drape', 6, -2]],
    lights: [[8, 1, 5, '#ffb070']],
    decals: [['reeds_0', 3, 2], ['reeds_2', 7, 3], ['reeds_1', 4, 4], ['roots_0', 1, 5]],
  }),
  P('cel_ink_well', ['wet', 'small'], [
    '.......',
    '.......',
    '..iiii.',
    '..iiii.',
    'F.....C',
  ], {
    decor: [['brazier_lit', 0, 0], ['brazier_lit', 6, 0]],
    face: [['wall_ink_seep', 2, -2], ['wall_ink_seep', 4, -2]],
    lights: [[0, 1, 4, '#ffb070'], [6, 1, 4, '#ffb070']],
    decals: [['ink_puddle_0', 0, 2], ['ink_puddle_1', 6, 2]],
    noDoor: 'ew',
  }),
  // ---------------------------------------------------------------- small rooms and alcoves
  P('cel_root_alcove', ['dead', 'small'], [
    '.....',
    '..C..',
    '.....',
    '...F.',
  ], {
    decor: [['root_column', 0, 3], ['brazier_lit', 4, 0], ['book_stack', 4, 3]],
    face: [['root_drape', 0, -2], ['wall_glyph_revealed', 2, -2], ['root_drape', 4, -2]],
    lights: [[4, 1, 4, '#ffb070']],
    decals: [['roots_1', 3, 2]],
    weight: 2,
  }),
  P('cel_barrel_niche', ['dead', 'small'], [
    '.....',
    'C....',
    '....F',
    '.....',
  ], {
    decor: [['barrel', 0, 3], ['barrel', 1, 3], ['crate', 4, 0], ['brazier_lit', 4, 3]],
    face: [...shelves(0, 2), ['root_drape', 4, -2]],
    lights: [[4, 2, 4, '#ffb070']],
    decals: [['roots_0', 2, 2]],
    weight: 2,
  }),
  P('cel_mud_niche', ['dead', 'small'], [
    '.....',
    '.mm..',
    '.mCm.',
    '.F...',
  ], {
    decor: [['brazier_lit', 4, 0], ['cairn', 0, 0], ['bush', 4, 3]],
    face: [['wall_cracked', 1, -2], ['root_drape', 3, -2]],
    lights: [[4, 1, 4, '#ffb070']],
    decals: [['tuft_1', 0, 3], ['leaves', 3, 1]],
  }),
  P('cel_dry_well', ['dead', 'small'], [
    '......',
    '..ii..',
    '..ii..',
    '.F..C.',
  ], {
    decor: [['brazier_lit', 0, 0], ['brazier_lit', 5, 0], ['cairn', 0, 3]],
    face: [['wall_ink_seep', 2, -2], ['wall_ink_seep', 3, -2]],
    lights: [[0, 1, 4, '#ffb070'], [5, 1, 4, '#ffb070']],
    decals: [['ink_puddle_1', 5, 1], ['roots_2', 1, 2]],
  }),
  P('cel_root_vault', ['dead', 'small'], [
    '......',
    '.dddd.',
    '.dCCd.',
    '.dddd.',
    '.F....',
  ], {
    decor: [['root_column', 0, 0], ['root_column', 4, 0], ['brazier_lit', 0, 4], ['brazier_lit', 5, 4]],
    face: [['wall_glyph_revealed', 2, -2], ['root_drape', 3, -2]],
    lights: [[0, 3, 4, '#ffb070'], [5, 3, 4, '#ffb070']],
    minFloor: 26,
  }),
  P('cel_shelf_niche', ['dead', 'small'], [
    '......',
    '......',
    '....C.',
    '.F....',
  ], {
    decor: [['shelf_rooted', 0, 1], ['shelf_rooted', 2, 1], ['brazier_lit', 5, 0]],
    face: [...shelves(4, 5)],
    lights: [[5, 1, 4, '#ffb070']],
    decals: [['roots_0', 0, 3], ['ink_puddle_0', 4, 1]],
  }),
  P('cel_side_cellar', ['small'], [
    '......',
    '.F....',
    '......',
    '......',
  ], {
    decor: [['barrel', 4, 0], ['crate', 5, 0], ['brazier_lit', 0, 0], ['book_stack', 5, 3]],
    face: [...shelves(1, 3), ['root_drape', 5, -2]],
    lights: [[0, 1, 4, '#ffb070']],
    decals: [['roots_1', 1, 3]],
    weight: 2,
  }),
  P('cel_root_cell', ['small'], [
    '.....',
    '..F..',
    '.....',
    '.....',
  ], {
    decor: [['root_column', 0, 0], ['brazier_lit', 4, 0], ['cairn', 4, 3]],
    face: [['root_drape', 2, -2], ['wall_ink_seep', 3, -2]],
    lights: [[4, 1, 4, '#ffb070']],
    decals: [['roots_2', 0, 3], ['pebbles_0', 2, 3]],
    weight: 2,
  }),
  P('cel_moss_cell', ['small'], [
    '......',
    '......',
    '.F.mm.',
    '...mmC',
    '......',
  ], {
    decor: [['brazier_lit', 0, 0], ['bush', 0, 4], ['pillar', 5, 0]],
    face: [['wall_cracked', 1, -2], ...shelves(2, 4)],
    lights: [[0, 1, 4, '#ffb070']],
    decals: [['tuft_0', 1, 1], ['leaves', 4, 4], ['roots_0', 5, 4]],
  }),
  P('cel_pillar_cell', ['small'], [
    '.......',
    '.......',
    '.F...F.',
    '.......',
  ], {
    decor: [['pillar', 0, 0], ['pillar', 6, 0], ['pillar', 0, 3], ['pillar', 6, 3], ['brazier_lit', 3, 0]],
    face: [...shelves(1, 5)],
    lights: [[3, 1, 5, '#ffb070']],
    decals: [['roots_1', 3, 3], ['ink_puddle_1', 5, 1]],
  }),
  // ---------------------------------------------------------------- odd shapes and set pieces
  P('cel_bent_cellar', ['hall'], [
    '..........',
    '.F........',
    '..........',
    '......####',
    '......||||',
    '..F...C...',
    '..........',
  ], {
    decor: [['shelf_rooted', 2, 2], ['barrel', 8, 0], ['barrel', 9, 0], ['brazier_lit', 0, 0], ['brazier_lit', 9, 6], ['root_column', 7, 1]],
    face: [...shelves(0, 1), ['root_drape', 3, -2], ...shelves(5, 8)],
    lights: [[0, 1, 5, '#ffb070'], [9, 5, 5, '#ffb070']],
    decals: [['roots_0', 4, 6], ['ink_puddle_1', 8, 2], ['tuft_1', 0, 6]],
    minFloor: 23,
  }),
  P('cel_split_cellar', ['reading'], [
    '.........',
    '..F......',
    '...##....',
    '...||....',
    '......F..',
    'C........',
  ], {
    decor: [['reading_table', 0, 1], ['shelf_rooted', 6, 1], ['brazier_lit', 8, 0], ['cairn', 4, 5]],
    face: [...shelves(0, 2), ['wall_ink_seep', 4, -2], ...shelves(6, 8)],
    lights: [[8, 1, 5, '#ffb070']],
    decals: [['roots_2', 2, 4], ['pebbles_2', 7, 5]],
  }),
  P('cel_fallen_column', ['set', 'hall'], [
    '............',
    '.F........F.',
    '............',
    '............',
    '.....C......',
    '............',
  ], {
    decor: [['root_column', 1, 2], ['root_column', 9, 2], ['cairn', 4, 2], ['cairn', 5, 2], ['cairn', 6, 3], ['cairn', 7, 3], ['pillar', 3, 5], ['pillar', 8, 5],
      ['brazier_lit', 0, 0], ['brazier_lit', 11, 0], ['brazier_unlit', 0, 5]],
    face: [['root_drape', 1, -2], ...shelves(3, 5), ['wall_cracked', 6, -2], ...shelves(7, 9), ['wall_cracked', 10, -2]],
    lights: [[0, 1, 5, '#ffb070'], [11, 1, 5, '#ffb070']],
    decals: [['pebbles_0', 3, 1], ['pebbles_1', 8, 4], ['roots_0', 2, 5], ['roots_1', 10, 5], ['ink_puddle_0', 5, 0]],
    minFloor: 22,
  }),
  P('cel_root_heart', ['set', 'hall'], [
    '...........',
    '.F.......F.',
    '...mmmmm...',
    '...mm.mm...',
    '...mmmmm...',
    '.....C.....',
    '...........',
  ], {
    decor: [['root_column', 4, 3], ['root_column', 6, 3], ['brazier_lit', 0, 0], ['brazier_lit', 10, 0], ['brazier_lit', 0, 6], ['brazier_lit', 10, 6], ['bush', 1, 5], ['bush', 9, 5]],
    face: [['root_drape', 1, -2], ['root_drape', 2, -2], ['wall_glyph_revealed', 5, -2], ['root_drape', 8, -2], ['root_drape', 9, -2]],
    lights: [[0, 1, 5, '#ffb070'], [10, 1, 5, '#ffb070'], [0, 5, 5, '#ffb070'], [10, 5, 5, '#ffb070'], [5, 3, 4, '#9fe8d8']],
    decals: [['roots_0', 2, 2], ['roots_1', 8, 4], ['roots_2', 2, 6], ['leaves', 5, 1], ['tuft_0', 8, 6]],
    minFloor: 25,
  }),
  P('cel_sunken_store', ['set', 'dead', 'wet'], [
    '.........',
    '..wwwww..',
    '..wwwww..',
    '.BC......',
    '....F....',
  ], {
    decor: [['brazier_lit', 0, 0], ['brazier_lit', 8, 0], ['floodwrack', 5, 3]],
    face: [['wall_ink_seep', 1, -2], ...shelves(3, 5), ['wall_ink_seep', 7, -2]],
    decals: [['reeds_0', 0, 2], ['reeds_1', 8, 2], ['reeds_2', 1, 3]],
    lights: [[0, 3, 5, '#ffb070'], [8, 3, 5, '#ffb070']],
    noDoor: 'n',
    minFloor: 21,
  }),
  P('cel_plank_store', ['reading', 'small'], [
    '.dddd..',
    '.dddd..',
    '.dFdd..',
    '.....C.',
  ], {
    decor: [['crate', 5, 0], ['barrel', 6, 0], ['brazier_lit', 0, 0], ['book_stack', 6, 3]],
    face: [...shelves(1, 4), ['root_drape', 6, -2]],
    lights: [[0, 1, 4, '#ffb070']],
    decals: [['roots_1', 0, 3]],
  }),
];

/** The bands this file ships. gen.js registerBand() adds bands three to five. */
export const PREFAB_SETS = { catalogue: CATALOGUE, cellars: CELLARS };

/** Legend per band: every char a prefab may use, mapped to tiles.json ids. Shared by gen.js and the previews. */
export const LEGENDS = {
  catalogue: { '#': 'catalog_top', '|': 'catalog_face', 'v': 'catalog_out_top', 'o': 'catalog_out_face', '.': 'catalog_wood',
    'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'moss', 'i': 'ink', 's': 'gallery_stone', 'd': 'stacks_wood', 'w': 'water' },
  cellars: { '#': 'stacks_top', '|': 'stacks_face', 'v': 'stacks_out_top', 'o': 'stacks_out_face', '.': 'dirt',
    'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'moss', 'i': 'ink', 's': 'stone_floor', 'd': 'stacks_wood', 'w': 'water' },
};
