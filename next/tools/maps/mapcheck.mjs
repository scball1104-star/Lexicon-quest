// Map loader, collision grid, reachability walk and validation for src/data/maps/*.js.
// Shared by tools/maps/preview.py (spawns node) and qa/maps/*.test.mjs (imports). Pure node, no DOM.
//
//   node tools/maps/mapcheck.mjs dump <mapId>          JSON of the resolved map module
//   node tools/maps/mapcheck.mjs walk <mapId>          reachability report (JSON)
//   node tools/maps/mapcheck.mjs check [mapId ...] [--pack x1]   validation report for every map (exit 1 on errors)
//   node tools/maps/mapcheck.mjs list                  map ids found in src/data/maps
//   node tools/maps/mapcheck.mjs walk <mapId> [flags]  the walk under a comma list of story flags (gated events,
//                                                      overlays and overhead tiles filtered; Episode 2)
//   node tools/maps/mapcheck.mjs beams <mapId> [flags] beam traces for the preview: the start state and, per receptor
//                                                      and per bridge, the first configuration the walk found that
//                                                      lights it
//
// Episode 2 (E2-maps): maps with beam / mirror / receptor events walk through beamWalk(): a search over (mirror
// configuration, cell) per beam system with src/world/beam.js tracing, receptors as gate sources, latches as an outer
// fixpoint, bridges walkable only while lit, pushes and shoves of movable mirrors, and a softlock count. W9 breakables
// (`opens`) are modeled in both walks.
//
// X1-world: an `object` with `appraise: true` is an unlocker like a breakable: it counts as read once a reachable cell
// has it within the Appraise range (src/world/abilities.js APPRAISE_RANGE) on the line or one tile either side, with no
// wall between (appraiseReach), and an event with `behind: 'appraise:<object id>'` is reached only after that. Missing door
// / exit / pit target maps listed in tools/maps/x1_links.json (pendingLinks) are warnings, any other missing target is an error.
//
// Collision model (docs/MAPS.md section 3): a cell's code comes from its legend id (terrain collision,
// wall systems solid, plain tiles their own code); an overlay replaces it with the overlay tile's code;
// decor footprints are solid except doorAt / passable cells; events add their own cells (door cells are
// walkable, gates and locked doors solid until opened, mechanism sprites solid). The walk models gates:
// a gate opens when every switch/plate targeting it is reachable (plates also need a push block on the
// map), a locked door opens once its key chest/pot is reachable, hidden ink becomes walkable once the
// lantern pedestal is reachable, shelves are passable once their switch is reachable, pits drop to pitTo.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { traceBeams } from '../../src/world/beam.js';
import { APPRAISE_RANGE } from '../../src/world/abilities.js';

export const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAPS_DIR = path.join(NEXT, 'src', 'data', 'maps');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

export function listMapIds() {
  return fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith('.js') && !f.startsWith('_')).map((f) => f.slice(0, -3)).sort();
}

export async function loadMap(id) {
  const file = path.join(MAPS_DIR, `${id}.js`);
  if (!fs.existsSync(file)) throw new Error(`no map module ${id}`);
  const m = await import(pathToFileURL(file).href);
  return m.default;
}

let _db = null;
export async function loadDb() {
  if (_db) return _db;
  const a = (p) => path.join(NEXT, 'assets', p);
  const tiles = readJson(a('tiles/tiles.json'));
  const props = readJson(a('sprites/props.json'));
  const npcAtlas = readJson(a('sprites/npcs.json'));
  const enemiesField = readJson(a('sprites/enemies_field.json'));
  const partyField = readJson(a('sprites/party_field.json'));
  // Expansion packs ship tiles and sprites as fragments: merge them the way the pack loader does so x1_/x2_ ids resolve.
  const maybe = (p) => { try { return readJson(a(p)); } catch (e) { return null; } };
  // the Deep Stacks' props (chest_red, chest_blue, plaque, trapdoor) live in the cave pack's own atlas (src/data/cave/world.js merges them)
  const caveProps = maybe('sprites/cave_props.json');
  if (caveProps && caveProps.objects) props.objects = { ...caveProps.objects, ...props.objects };
  for (const px of ['x1', 'x2']) {
    const frag = maybe(`tiles/${px}_tiles.json`);
    if (frag) for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) tiles[k] = { ...(tiles[k] || {}), ...Object.fromEntries(Object.entries(frag[k] || {}).filter(([id]) => !(id in (tiles[k] || {})))) };
    for (const [base, atlas] of [['npcs', npcAtlas], ['enemies_field', enemiesField]]) {
      const f = maybe(`sprites/${px}_${base}.json`);
      if (f) for (const k of ['frames', 'anims', 'sprites']) if (f[k]) atlas[k] = { ...(atlas[k] || {}), ...f[k], ...(atlas[k] || {}) };
    }
  }
  const src = (p) => import(pathToFileURL(path.join(NEXT, 'src', 'data', p)).href);
  const npcs = await src('npcs.js');
  const enc = await src('encounters.js');
  const gstory = await src('../game/story.js');          // X1: the live tables (a pack's register() adds to them)
  const text = await src('text.js');
  const items = await src('items.js');
  const quests = await src('quests.js');
  _db = {
    tiles, props, npcAtlas, enemiesField, partyField,
    NPCS: npcs.NPCS, npcsOnMap: npcs.npcsOnMap,
    ENCOUNTERS: enc.ENCOUNTERS, ZONES: enc.ZONES,
    // Episode 1 + 2 scenes and inspect lines (ids never collide; qa/content tests it), plus whatever a registered pack added
    scenes: gstory.SCENES, barks: text.BARKS, lines: gstory.LINES, BOOKS: text.BOOKS, BANNERS: text.BANNERS,
    ITEMS: items.ITEMS, FLAGS: quests.FLAGS,
  };
  return _db;
}

// ------------------------------------------------------------------------------------------------ ids
export function tileCode(db, id) {
  const { tiles } = db;
  if (tiles.terrains[id]) return tiles.terrains[id].collision;
  for (const w of Object.keys(tiles.walls)) if (id === `${w}_top` || id === `${w}_face`) return 'solid';
  if (tiles.tiles[id]) return tiles.tiles[id].collision;
  if (tiles.overlays && tiles.overlays[id]) return tiles.overlays[id].collision || 'none';
  return null;
}
export function isTileId(db, id) { return tileCode(db, id) != null; }
export function isObjectId(db, id) { return !!(db.tiles.objects[id] || db.props.objects[id]); }
export function spriteExists(db, id) {
  return !!(db.npcAtlas.sprites[id] || db.enemiesField.sprites[id] || db.partyField.frames[`${id}_down_0`]);
}
export function tileSize(db, id) {
  const t = db.tiles.tiles[id];
  return t ? [Math.max(1, (t.w || 16) / 16), Math.max(1, (t.h || 16) / 16)] : [1, 1];
}

/** Cells an object covers as solid and the cells it leaves walkable (doorAt / passable). */
export function objectCells(db, t, x, y) {
  const solid = [], open = [];
  const o = db.tiles.objects[t];
  if (o) {
    for (const [dx, dy] of o.footprint || []) solid.push([x + dx, y + dy]);
    if (o.doorAt) open.push([x + o.doorAt[0], y + o.doorAt[1]]);
    return { solid, open, collision: o.collision || 'solid' };
  }
  const p = db.props.objects[t];
  if (p) {
    const [w, h] = p.footprint || [1, 1];
    const pass = new Set((p.passable || []).map(([dx, dy]) => `${x + dx},${y + dy}`));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const c = [x + i, y - j];
      (pass.has(`${c[0]},${c[1]}`) || p.solid === false ? open : solid).push(c);
    }
    return { solid, open, collision: 'solid' };
  }
  return null;
}

/** Cells an event occupies (x,y plus w/h). */
export function eventCells(e) {
  const out = [];
  const w = e.w || 1, h = e.h || 1;
  if (e.type === 'shelf') { for (const [px, py] of e.positions || []) out.push([px, py], [px + 1, py]); return out; }
  if (e.type === 'font') { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([e.x + i, e.y - j]); return out; }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([e.x + i, e.y + j]);
  return out;
}

// Event types that block the walk when solid, and whether the walk may pass through them anyway.
const SOLID_TYPES = new Set(['npc', 'actor', 'chest', 'object', 'block', 'pot', 'brazier', 'font', 'save', 'sign', 'book', 'ferry',
  'beam', 'mirror', 'receptor']);
const PASS_THROUGH = new Set(['actor', 'enemy', 'block', 'pot']);   // despawn, fight, push, break

// ------------------------------------------------------------------------------------------------ flags
/** Is a flag-gated entry (event, overlay, overhead tile) present under `flags` (a Set)? No flags = everything. */
export function present(e, flags) {
  if (!flags) return true;
  for (const f of toList(e.if)) if (!flags.has(f)) return false;
  for (const f of toList(e.ifNot)) if (flags.has(f)) return false;
  return true;
}
/** The map as a save with exactly these flags sees it: absent events, overlays and overhead tiles removed. */
export function withFlags(map, flags) {
  const f = flags instanceof Set ? flags : new Set(flags || []);
  return {
    ...map,
    events: (map.events || []).filter((e) => present(e, f)),
    overlays: (map.overlays || []).filter((o) => present(o, f)),
    overhead: (map.overhead || []).filter((o) => present(o, f)),
  };
}
/** First-match conditional map field (`music`, `lighting.tint`): a plain value or [{ if, ifNot, id }, ...]. */
export function pickConditional(v, flags) {
  if (!Array.isArray(v)) return v;
  for (const c of v) if (present(c, flags)) return c.id;
  return null;
}

// ------------------------------------------------------------------------------------------------ grid
export function buildGrid(map, db) {
  const errors = [];
  const H = map.ground.length, W = map.ground[0].length;
  const code = Array.from({ length: H }, () => new Array(W).fill('solid'));
  const why = Array.from({ length: H }, () => new Array(W).fill(''));
  const faint = Array.from({ length: H }, () => new Array(W).fill(null));
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, c, reason) => { if (inb(x, y)) { code[y][x] = c; why[y][x] = reason; } };

  for (let y = 0; y < H; y++) {
    if (map.ground[y].length !== W) errors.push(`row ${y} has ${map.ground[y].length} columns, expected ${W}`);
    for (let x = 0; x < map.ground[y].length; x++) {
      const ch = map.ground[y][x];
      const id = map.legend[ch];
      if (!id) { errors.push(`legend has no entry for '${ch}' at ${x},${y}`); continue; }
      const c = tileCode(db, id);
      if (c == null) { errors.push(`legend '${ch}' -> unknown tile id ${id}`); continue; }
      set(x, y, c, id);
    }
  }
  for (const o of map.overlays || []) {
    const c = tileCode(db, o.t);
    if (c == null) { errors.push(`overlay ${o.t} at ${o.x},${o.y} is not a tile id`); continue; }
    if (!inb(o.x, o.y)) { errors.push(`overlay ${o.t} at ${o.x},${o.y} is off the map`); continue; }
    const [, th] = tileSize(db, o.t);
    for (let j = 0; j < th; j++) {
      set(o.x, o.y + j, c, o.t);
      if (/_faint$/.test(o.t)) faint[o.y + j][o.x] = o.t;
    }
  }
  for (const d of map.decor || []) {
    if (isObjectId(db, d.t)) {
      const cells = objectCells(db, d.t, d.x, d.y);
      for (const [x, y] of cells.solid) {
        if (!inb(x, y)) { errors.push(`decor ${d.t} at ${d.x},${d.y} footprint leaves the map (${x},${y})`); continue; }
        set(x, y, cells.collision, `decor:${d.t}`);
      }
      for (const [x, y] of cells.open) set(x, y, 'none', `door:${d.t}`);
    } else if (isTileId(db, d.t)) {
      const c = tileCode(db, d.t);
      for (let j = 0; j < (d.h || 1); j++) for (let i = 0; i < (d.w || 1); i++) {
        if (!inb(d.x + i, d.y + j)) errors.push(`decor tile ${d.t} at ${d.x + i},${d.y + j} is off the map`);
        set(d.x + i, d.y + j, c, d.t);
      }
    } else errors.push(`decor ${d.t} at ${d.x},${d.y} is neither an object nor a tile id`);
  }
  for (const e of map.events || []) {
    const cells = eventCells(e);
    for (const [x, y] of cells) if (!inb(x, y) && !(e.on === 'enter')) errors.push(`event ${e.id} at ${x},${y} is off the map`);
    if (e.type === 'door') for (const [x, y] of cells) set(x, y, 'none', `door:${e.id}`);
    else if (e.type === 'gate' || e.type === 'locked_door') for (const [x, y] of cells) set(x, y, 'solid', `${e.type}:${e.id}`);
    else if (e.type === 'shelf') for (const [px, py] of e.positions) for (let i = 0; i < 2; i++) set(px + i, py, 'solid', `shelf:${e.id}`);
    else if (e.type === 'switch' && e.kind === 'crystal') set(e.x, e.y, 'solid', `crystal:${e.id}`);
    else if (e.type === 'npc') { const n = db.NPCS[e.id]; if (!n || n.solid !== false) set(e.x, e.y, 'solid', `npc:${e.id}`); }
    else if (SOLID_TYPES.has(e.type) && e.solid !== false) for (const [x, y] of cells) set(x, y, 'solid', `${e.type}:${e.id}`);
  }
  return { W, H, code, why, faint, errors };
}

// ------------------------------------------------------------------------------------------------ walk
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LEDGE_OK = { ledge_s: 'down', ledge_e: 'right', ledge_w: 'left' };

function eventIndex(map) {
  const byCell = new Map();
  for (const e of map.events || []) for (const [x, y] of eventCells(e)) {
    const k = `${x},${y}`;
    if (!byCell.has(k)) byCell.set(k, []);
    byCell.get(k).push(e);
  }
  return byCell;
}

/**
 * X1: can the party read the Appraise object `e` from some cell of `seen` (a Set of "x,y")? The same geometry as
 * abilities.js appraiseTarget: facing one of four directions, the object is within `range` tiles ahead, on the line or
 * (from 2 tiles out) one tile either side of it, and no wall ('solid' or 'void' by `codeAt`) stands on an earlier cell of
 * the line. Returns the standing cell [x, y] and the facing, or null. Pure.
 */
export function appraiseReach(seen, e, codeAt, inb, range = APPRAISE_RANGE) {
  const cells = new Set(eventCells(e).map(([x, y]) => `${x},${y}`));
  for (const k of seen) {
    const [x, y] = k.split(',').map(Number);
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const px = -dy, py = dx;
      for (let i = 1; i <= range; i++) {
        const cx = x + dx * i, cy = y + dy * i;
        if (!inb(cx, cy)) break;
        let hit = false;
        for (const s of [0, -1, 1]) {
          if (s && i < 2) continue;
          if (cells.has(`${cx + px * s},${cy + py * s}`)) hit = true;
        }
        if (hit) return { at: [x, y], dir };
        const c = codeAt(cx, cy);
        if (c === 'solid' || c === 'void') break;
      }
    }
  }
  return null;
}

/** Is this event hidden behind an Appraise object (`behind: 'appraise:<id>'`) that has not been read? */
const hiddenByAppraise = (e, appraised) => typeof e.behind === 'string' && e.behind.startsWith('appraise:') && !appraised.has(e.behind.slice('appraise:'.length));

export function walk(map, db, opts = {}) {
  if (opts.flags) map = withFlags(map, new Set(opts.flags));
  if (hasBeams(map)) return beamWalk(map, db, opts);
  const grid = buildGrid(map, db);
  const { W, H, code, faint } = grid;
  const events = map.events || [];
  const byId = new Map(events.map((e) => [e.id, e]));
  const byCell = eventIndex(map);
  const flags = new Set(opts.flags || []);
  const start = opts.start || (map.start ? [map.start.x, map.start.y] : null);
  if (!start) return { ...grid, error: 'map has no start' };

  const state = { opened: new Set(), keys: new Set(opts.keys || []), lantern: !!opts.lantern, shelves: new Set(), broken: new Set(), openCells: new Set(), appraised: new Set(), log: [] };
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const evAt = (x, y) => byCell.get(`${x},${y}`) || [];

  const effective = (x, y) => {
    let c = code[y][x];
    if (faint[y][x] && state.lantern) {
      const rid = faint[y][x].replace('_faint', '_revealed');
      c = tileCode(db, rid) ?? c;
    }
    if (state.openCells.has(`${x},${y}`)) return 'none';
    for (const e of evAt(x, y)) {
      if (flags.size && e.if && !toList(e.if).every((f) => flags.has(f))) continue;
      if (e.type === 'object' && e.breakable && state.broken.has(e.id)) return 'none';
      if ((e.type === 'gate' || e.type === 'locked_door') && state.opened.has(e.id)) return 'none';
      if (e.type === 'shelf' && state.shelves.has(e.id)) return 'none';
      if (PASS_THROUGH.has(e.type)) return 'none';
    }
    return c;
  };

  const effective2 = (x, y) => effective(x, y);   // the code a line of sight meets (events and broken walls included)

  const pitTarget = (x, y) => {
    for (const e of evAt(x, y)) if (e.type === 'pit' && e.to) return e.to;
    return map.pitTo || null;
  };

  const bfs = () => {
    const seen = new Set([`${start[0]},${start[1]}`]);
    const q = [start];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny)) continue;
        const k = `${nx},${ny}`;
        if (seen.has(k)) continue;
        const c = effective(nx, ny);
        let ok = c === 'none' || c === 'pit';
        if (LEDGE_OK[c]) ok = LEDGE_OK[c] === dir;
        if (!ok) continue;
        seen.add(k);
        if (c === 'pit') {
          const t = pitTarget(nx, ny);
          if (t && t[0] === map.id && inb(t[1], t[2]) && !seen.has(`${t[1]},${t[2]}`)) { seen.add(`${t[1]},${t[2]}`); q.push([t[1], t[2]]); }
          continue;
        }
        q.push([nx, ny]);
        for (const e of evAt(nx, ny)) {
          const to = e.to;
          if ((e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && state.opened.has(e.id))) && to && to[0] === map.id && inb(to[1], to[2])) {
            const tk = `${to[1]},${to[2]}`;
            if (!seen.has(tk)) { seen.add(tk); q.push([to[1], to[2]]); }
          }
        }
      }
    }
    return seen;
  };

  const touchable = (seen, e) => {
    for (const [x, y] of eventCells(e)) {
      if (seen.has(`${x},${y}`)) return true;
      for (const [dx, dy] of Object.values(DIRS)) if (seen.has(`${x + dx},${y + dy}`)) return true;
    }
    return false;
  };

  let seen = bfs();
  for (let iter = 0; iter < 20; iter++) {
    let changed = false;
    const hasBlock = events.some((e) => e.type === 'block' && touchable(seen, e));
    for (const e of events) {
      if (e.type === 'chest' || e.type === 'pot') {
        if (e.item && /_key$/.test(e.item) && !state.keys.has(e.item) && touchable(seen, e)) { state.keys.add(e.item); state.log.push(`${e.item} from ${e.id}`); changed = true; }
      }
      if (e.type === 'object' && e.script === 'lantern_get' && !state.lantern && touchable(seen, e)) { state.lantern = true; state.log.push(`lantern from ${e.id}`); changed = true; }
      // W9 Dash Strike: a breakable the party can reach is broken and its `opens` cells become floor
      if (e.type === 'object' && e.breakable && !state.broken.has(e.id) && touchable(seen, e)) {
        state.broken.add(e.id); for (const [x, y] of e.opens || []) state.openCells.add(`${x},${y}`);
        state.log.push(`broke ${e.id}`); changed = true;
      }
      if (e.type === 'locked_door' && !state.opened.has(e.id) && state.keys.has(e.key) && touchable(seen, e)) { state.opened.add(e.id); state.log.push(`unlocked ${e.id}`); changed = true; }
      // X1 Appraise: a reachable cell with the object in range and line reads it (like a breakable, once, for good)
      if (e.type === 'object' && e.appraise && !state.appraised.has(e.id) && appraiseReach(seen, e, effective2, inb)) {
        state.appraised.add(e.id); state.log.push(`appraised ${e.id}`); changed = true;
      }
      if ((e.type === 'gate' || e.type === 'shelf') && !state.opened.has(e.id) && !state.shelves.has(e.id)) {
        const sources = events.filter((s) => (s.type === 'switch' || s.type === 'plate') && toList(s.target).includes(e.id));
        if (!sources.length) continue;
        const ready = sources.every((s) => touchable(seen, s) && !(s.hidden && !state.lantern) && !(s.type === 'plate' && !hasBlock));
        if (ready) { (e.type === 'gate' ? state.opened : state.shelves).add(e.id); state.log.push(`opened ${e.id} via ${sources.map((s) => s.id).join('+')}`); changed = true; }
      }
    }
    if (!changed) break;
    seen = bfs();
  }

  const report = {
    id: map.id, W, H, start, errors: grid.errors, opened: [...state.opened, ...state.shelves], keys: [...state.keys], lantern: state.lantern, log: state.log,
    appraised: [...state.appraised], reachable: [...seen], events: [], marks: [], unreached: [],
  };
  for (const e of events) {
    const reached = e.on === 'enter' ? true : touchable(seen, e) && !hiddenByAppraise(e, state.appraised);
    report.events.push({ id: e.id, type: e.type, reached });
    if (!reached) report.unreached.push(e.id);
  }
  for (const [name, [x, y]] of Object.entries(map.marks || {})) {
    const walkable = inb(x, y) && effective(x, y) === 'none';
    const reached = seen.has(`${x},${y}`);
    report.marks.push({ name, x, y, walkable, reached });
  }
  report.floorCells = 0;
  report.grid = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) { const c = effective(x, y); row.push(c); if (c === 'none') report.floorCells++; }
    report.grid.push(row);
  }
  return report;
}


// ------------------------------------------------------------------------------------------------ beams (Episode 2)
// The Court of Mirrors' puzzles (EPISODE2_PLAN 5.1) are modeled as a search over (configuration, cell): a
// configuration is the state of every turnable mirror (0 = '/', 1 = backslash) and the cell of every movable thing
// (push blocks, push and heavy mirrors). From a cell the party may step (bridges walkable only while lit; a dim
// bridge is a pit), turn an adjacent mirror, or push/shove an adjacent movable one tile (never onto a bridge, never
// into a wall). Receptors light per configuration; a gate whose sources are receptors opens while they are lit, and
// a `latch` receptor, once lit in any reachable configuration, stays lit (an outer fixpoint, like keys and
// switches). The tracer is E2-world's src/world/beam.js. Softlocks: every reachable state must still reach a cell
// that leaves the map (a map-to-map door, an exit, a ferry, the start), because leaving resets mirrors and blocks.

export function hasBeams(map) {
  return (map.events || []).some((e) => e.type === 'beam' || e.type === 'mirror' || e.type === 'receptor');
}

/** Cells whose ground or overlay tile lets a beam through (tiles.json `beam: 'pass'`). */
export function passGrid(map, db) {
  const H = map.ground.length, W = map.ground[0].length;
  const out = Array.from({ length: H }, () => new Array(W).fill(false));
  const isPass = (id) => !!(db.tiles.tiles[id] && db.tiles.tiles[id].beam === 'pass');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isPass(map.legend[map.ground[y][x]])) out[y][x] = true;
  for (const o of map.overlays || []) if (o.y >= 0 && o.y < H && o.x >= 0 && o.x < W && isPass(o.t)) out[o.y][o.x] = true;
  return out;
}

export const BRIDGE_RE = /^glass_bridge_[hv]_dim$/;

function beamWalk(map, db, opts = {}) {
  const events = map.events || [];
  const W = map.ground[0].length, H = map.ground.length, N = W * H;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const idx = (x, y) => y * W + x;
  const start = opts.start || (map.start ? [map.start.x, map.start.y] : null);
  if (!start) return { error: 'map has no start' };

  const mirrors = events.filter((e) => e.type === 'mirror');
  // push blocks stay out of the configuration (the state space would explode): one in a beam's line blocks it until the
  // party can reach it, then counts as pushed aside (qa/maps checks each such block has room to leave the line)
  const movables = events.filter((e) => e.type === 'mirror' && (e.push || e.heavy));
  const blocks = events.filter((e) => e.type === 'block');
  const turnables = mirrors.filter((e) => !e.fixed);
  const moveSet = new Set(movables);
  const staticEvents = events.filter((e) => !moveSet.has(e) && e.type !== 'mirror' && e.type !== 'block');
  const sg = buildGrid({ ...map, events: staticEvents }, db);
  // beam code: no actors (they never block a beam), no movables or mirrors (placed per configuration)
  const bg = buildGrid({ ...map, events: staticEvents.filter((e) => !['npc', 'actor', 'enemy'].includes(e.type)) }, db);
  const pass = passGrid(map, db);
  const bridge = new Uint8Array(N);
  for (const o of map.overlays || []) if (BRIDGE_RE.test(o.t) && inb(o.x, o.y)) bridge[idx(o.x, o.y)] = 1;
  const byCell = eventIndex({ events: staticEvents });
  const evAt = (x, y) => byCell.get(`${x},${y}`) || [];
  const doorCell = new Uint8Array(N);
  for (const e of staticEvents) if (e.type === 'door') for (const [x, y] of eventCells(e)) if (inb(x, y)) doorCell[idx(x, y)] = 1;
  const gates = events.filter((e) => e.type === 'gate' || e.type === 'locked_door');
  const receptors = events.filter((e) => e.type === 'receptor');
  const recAt = new Map(receptors.map((r) => [idx(r.x, r.y), r]));
  const sources = events.filter((e) => e.type === 'beam').map((e) => ({ id: e.id, x: e.x, y: e.y, dir: e.dir || 'down' }));
  const recSources = (gid) => receptors.filter((r) => toList(r.target).includes(gid));

  const g = { opened: new Set(), keys: new Set(opts.keys || []), lantern: !!opts.lantern, shelves: new Set(), latched: new Set(), pushed: new Set(),
    broken: new Set(), openCells: new Set(), appraised: new Set(), log: [] };

  // ---- beam systems: a source and every mirror its light can ever reach (both states of each turnable mirror, every
  // cell a movable mirror can be pushed to). Systems that share a mirror merge. The search runs per system with the
  // other systems' mirrors at their authored states (the wings of F3 are independent; a joint search would explode).
  const movRegion = new Map();
  for (const m of movables) {
    const seen = new Set([idx(m.x, m.y)]);
    const q = [[m.x, m.y]];
    const free = (x, y) => inb(x, y) && sg.code[y][x] === 'none' && !bridge[idx(x, y)] && !doorCell[idx(x, y)];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of Object.values(DIRS)) {
        // a push needs the party standing behind the mirror and a free cell ahead
        if (!free(x + dx, y + dy) || !(free(x - dx, y - dy) || (x - dx === m.x && y - dy === m.y))) continue;
        const k = idx(x + dx, y + dy);
        if (!seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); }
      }
    }
    movRegion.set(m, seen);
  }
  const fixedAt = new Map(mirrors.filter((m) => !moveSet.has(m)).map((m) => [idx(m.x, m.y), m]));
  const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const TURN = [{ right: 'up', up: 'right', left: 'down', down: 'left' }, { right: 'down', down: 'right', left: 'up', up: 'left' }];
  const systems = sources.map((s) => ({ sources: [s.id], mir: new Set() }));
  sources.forEach((src, si) => {
    const S = systems[si];
    for (let round = 0; round < 8; round++) {
      const seenB = new Set(), cells = new Set();
      const stack = [[src.x, src.y, src.dir]];
      while (stack.length) {
        const [x, y, d] = stack.pop();
        const nx = x + DV[d][0], ny = y + DV[d][1];
        if (!inb(nx, ny)) continue;
        const k = idx(nx, ny), sk = k * 4 + ['up', 'down', 'left', 'right'].indexOf(d);
        if (seenB.has(sk)) continue;
        seenB.add(sk); cells.add(k);
        if (recAt.has(k)) continue;
        const fm = fixedAt.get(k);
        if (fm) {
          if (!fm.fixed) S.mir.add(fm);
          for (const st of fm.fixed ? [fm.state ? 1 : 0] : [0, 1]) stack.push([nx, ny, TURN[st][d]]);
          continue;
        }
        if (movables.some((m) => S.mir.has(m) && movRegion.get(m).has(k))) for (const st of [0, 1]) stack.push([nx, ny, TURN[st][d]]);
        const c = bg.code[ny][nx];
        const gateHere = evAt(nx, ny).some((e) => e.type === 'gate' || e.type === 'locked_door');
        if ((c === 'solid' || c === 'void') && !pass[ny][nx] && !gateHere) continue;
        stack.push([nx, ny, d]);
      }
      let grew = false;
      for (const m of movables) if (!S.mir.has(m) && [...movRegion.get(m)].some((k) => cells.has(k))) { S.mir.add(m); grew = true; }
      if (!grew) break;
    }
  });
  // merge systems that share a mirror
  for (let i = 0; i < systems.length; i++) for (let j = i + 1; j < systems.length; j++) {
    if (!systems[i] || !systems[j]) continue;
    if ([...systems[j].mir].some((m) => systems[i].mir.has(m))) {
      systems[i].sources.push(...systems[j].sources);
      for (const m of systems[j].mir) systems[i].mir.add(m);
      systems[j] = null;
    }
  }
  const sysList = systems.filter(Boolean);
  if (!sysList.length) sysList.push({ sources: [], mir: new Set() });

  // ---- configurations (per system): st = its turnable mirrors' states, pos = its movable mirrors' cells
  const cfgs = [], cfgIdx = new Map();
  function cfgId(sys, st, pos) {
    const k = sys.key + ':' + st.join('') + '|' + pos.join(',');
    let id = cfgIdx.get(k);
    if (id == null) { id = cfgs.length; cfgIdx.set(k, id); cfgs.push({ sys, st, pos, info: null }); }
    return id;
  }
  sysList.forEach((s, i) => {
    s.key = i;
    s.turn = turnables.filter((m) => s.mir.has(m));
    s.move = movables.filter((m) => s.mir.has(m));
  });
  const mirrorPos = (c, m) => { const j = c.sys.move.indexOf(m); return j >= 0 ? c.pos[j] : idx(m.x, m.y); };
  const mirrorState = (c, m) => { const i = c.sys.turn.indexOf(m); return i >= 0 ? c.st[i] : (m.state ? 1 : 0); };

  function info(id) {
    const c = cfgs[id];
    if (c.info) return c.info;
    const movAt = new Map();
    for (const m of movables) movAt.set(mirrorPos(c, m), m);
    const mir = mirrors.map((m) => { const p = mirrorPos(c, m); return { id: m.id, x: p % W, y: Math.floor(p / W), state: mirrorState(c, m) }; });
    const blocksAt = new Set(blocks.filter((b) => !g.pushed.has(b.id)).map((b) => idx(b.x, b.y)));
    let open = new Set(g.opened), tr = null;
    for (let iter = 0; iter < 4; iter++) {
      const code = (x, y) => {
        if (!inb(x, y)) return 'void';
        if (blocksAt.has(idx(x, y))) return 'solid';
        for (const e of evAt(x, y)) if ((e.type === 'gate' || e.type === 'locked_door') && open.has(e.id)) return 'none';
        return bg.code[y][x];
      };
      tr = traceBeams({ w: W, h: H, code, pass: (x, y) => inb(x, y) && pass[y][x], sources, mirrors: mir,
        receptors: receptors.map((r) => ({ id: r.id, x: r.x, y: r.y, face: r.face || null })) });
      const next = new Set(g.opened);
      for (const gt of gates) {
        const rs = recSources(gt.id);
        if (rs.length && rs.every((r) => tr.litReceptors.has(r.id) || g.latched.has(r.id))) next.add(gt.id);
      }
      if (next.size === open.size) break;
      open = next;
    }
    const litCells = new Set();
    for (const k of tr.lit) { const [x, y] = k.split(',').map(Number); litCells.add(idx(x, y)); }
    const codeArr = new Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      let cc = sg.code[y][x];
      if (sg.faint[y][x] && g.lantern) cc = tileCode(db, sg.faint[y][x].replace('_faint', '_revealed')) ?? cc;
      if (bridge[k]) cc = litCells.has(k) ? 'none' : 'pit';
      if (g.openCells.has(k)) cc = 'none';
      for (const e of evAt(x, y)) {
        if ((e.type === 'gate' || e.type === 'locked_door') && open.has(e.id)) cc = 'none';
        if (e.type === 'shelf' && g.shelves.has(e.id)) cc = 'none';
        if (e.type === 'actor' || e.type === 'pot' || e.type === 'enemy') cc = 'none';
        if (e.type === 'object' && e.breakable && g.broken.has(e.id)) cc = 'none';
      }
      codeArr[k] = cc;
    }
    for (const m of mirrors) codeArr[mirrorPos(c, m)] = 'solid';
    c.info = { code: codeArr, lit: litCells, litReceptors: tr.litReceptors, open, trace: tr, movAt };
    return c.info;
  }

  const pitTarget = (x, y) => {
    for (const e of evAt(x, y)) if (e.type === 'pit' && e.to) return e.to;
    return map.pitTo || null;
  };

  let everLit = new Set(), firstLit = {}, firstBridge = new Map(), seenAll = new Set(), softlocks = [], statesTotal = 0, cfgSeen = new Set();

  function searchSystem(sys, recordEdges) {
    const st0 = sys.turn.map((m) => (m.state ? 1 : 0));
    const pos0 = sys.move.map((m) => idx(m.x, m.y));
    const seen = new Set();
    const q = [];
    const from = [], to = [];
    const s0 = cfgId(sys, st0, pos0) * N + idx(start[0], start[1]);
    seen.add(s0); q.push(s0);
    const add = (prev, s) => {
      if (recordEdges) { from.push(prev); to.push(s); }
      if (!seen.has(s)) { seen.add(s); q.push(s); }
    };
    for (let qi = 0; qi < q.length; qi++) {
      const s = q[qi];
      const cid = Math.floor(s / N), cell = s % N;
      const x = cell % W, y = Math.floor(cell / W);
      const inf = info(cid);
      const c = cfgs[cid];
      if (!cfgSeen.has(cid)) {
        cfgSeen.add(cid);
        for (const r of inf.litReceptors) if (!everLit.has(r)) { everLit.add(r); firstLit[r] = cid; }
        for (const k of inf.lit) if (bridge[k] && !firstBridge.has(k)) firstBridge.set(k, cid);
      }
      for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny)) continue;
        const nk = idx(nx, ny);
        const cc = inf.code[nk];
        let ok = cc === 'none' || cc === 'pit';
        if (LEDGE_OK[cc]) ok = LEDGE_OK[cc] === dir;
        if (ok) {
          if (cc === 'pit') {
            const t = pitTarget(nx, ny);
            if (t && t[0] === map.id && inb(t[1], t[2])) add(s, cid * N + idx(t[1], t[2]));
          } else {
            add(s, cid * N + nk);
            for (const e of evAt(nx, ny)) {
              const tt = e.to;
              if ((e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && inf.open.has(e.id))) && tt && tt[0] === map.id && inb(tt[1], tt[2])) add(s, cid * N + idx(tt[1], tt[2]));
            }
          }
        }
        // turn an adjacent mirror of this system
        sys.turn.forEach((m, i) => {
          if (mirrorPos(c, m) !== nk) return;
          const st = c.st.slice(); st[i] ^= 1;
          add(s, cfgId(sys, st, c.pos) * N + cell);
        });
        // push / shove an adjacent movable mirror of this system one tile away from the party (never onto a bridge or
        // a door cell, never into anything solid)
        const mv = inf.movAt.get(nk);
        const j = mv ? sys.move.indexOf(mv) : -1;
        if (j >= 0) {
          const tx = nx + dx, ty = ny + dy;
          if (inb(tx, ty)) {
            const tk = idx(tx, ty);
            const blocked = evAt(tx, ty).some((e) => SOLID_TYPES.has(e.type) && e.solid !== false && e.type !== 'pot' && e.type !== 'actor');
            if (inf.code[tk] === 'none' && !bridge[tk] && !doorCell[tk] && !inf.movAt.has(tk) && !blocked) {
              const pos = c.pos.slice(); pos[j] = tk;
              add(s, cfgId(sys, c.st, pos) * N + cell);
            }
          }
        }
      }
    }
    if (recordEdges) {
      const safeCell = new Set([idx(start[0], start[1])]);
      for (const e of events) if (e.type === 'door' && e.to && e.to[0] !== map.id) for (const [x, y] of eventCells(e)) safeCell.add(idx(x, y));
      for (const e of events) if (e.type === 'ferry') for (const [dx, dy] of [[0, 0], ...Object.values(DIRS)]) if (inb(e.x + dx, e.y + dy)) safeCell.add(idx(e.x + dx, e.y + dy));
      for (const x of map.exits || []) for (let jj = 0; jj < (x.h || 1); jj++) for (let i = 0; i < (x.w || 1); i++) safeCell.add(idx(x.x + i, x.y + jj));
      const rev = new Map();
      for (let i = 0; i < from.length; i++) { const t = to[i]; let l = rev.get(t); if (!l) { l = []; rev.set(t, l); } l.push(from[i]); }
      const good = new Set();
      const gq = [];
      for (const s of seen) if (safeCell.has(s % N)) { good.add(s); gq.push(s); }
      for (let qi = 0; qi < gq.length; qi++) for (const p of rev.get(gq[qi]) || []) if (!good.has(p)) { good.add(p); gq.push(p); }
      for (const s of seen) if (!good.has(s)) softlocks.push(s);
    }
    for (const s of seen) seenAll.add(s % N);
    statesTotal += seen.size;
  }

  function search(recordEdges) {
    for (const c of cfgs) c.info = null;
    everLit = new Set(); firstLit = {}; firstBridge = new Map(); seenAll = new Set(); softlocks = []; statesTotal = 0; cfgSeen = new Set();
    for (const sys of sysList) searchSystem(sys, recordEdges);
  }

  const cellsOf = () => { const out = new Set(); for (const c of seenAll) out.add(`${c % W},${Math.floor(c / W)}`); return out; };
  const touchable = (seenCells, e) => {
    for (const [x, y] of eventCells(e)) {
      if (seenCells.has(`${x},${y}`)) return true;
      for (const [dx, dy] of Object.values(DIRS)) if (seenCells.has(`${x + dx},${y + dy}`)) return true;
    }
    return false;
  };

  search(false);
  let seenCells = cellsOf();
  for (let iter = 0; iter < 20; iter++) {
    let changed = false;
    for (const r of receptors) if (r.latch && everLit.has(r.id) && !g.latched.has(r.id)) { g.latched.add(r.id); g.log.push(`latched ${r.id}`); changed = true; }
    const hasBlock = events.some((e) => e.type === 'block' && touchable(seenCells, e));
    for (const b of blocks) if (!g.pushed.has(b.id) && touchable(seenCells, b)) { g.pushed.add(b.id); g.log.push(`pushed ${b.id} aside`); changed = true; }
    for (const e of events) {
      if (e.type === 'object' && e.breakable && !g.broken.has(e.id) && touchable(seenCells, e)) {
        g.broken.add(e.id); for (const [x, y] of e.opens || []) if (inb(x, y)) g.openCells.add(idx(x, y));
        g.log.push(`broke ${e.id}`); changed = true;
      }
      if (e.type === 'chest' || e.type === 'pot') {
        if (e.item && /_key$/.test(e.item) && !g.keys.has(e.item) && touchable(seenCells, e)) { g.keys.add(e.item); g.log.push(`${e.item} from ${e.id}`); changed = true; }
      }
      if (e.type === 'object' && e.script === 'lantern_get' && !g.lantern && touchable(seenCells, e)) { g.lantern = true; g.log.push(`lantern from ${e.id}`); changed = true; }
      if (e.type === 'locked_door' && !g.opened.has(e.id) && g.keys.has(e.key) && touchable(seenCells, e)) { g.opened.add(e.id); g.log.push(`unlocked ${e.id}`); changed = true; }
      if (e.type === 'object' && e.appraise && !g.appraised.has(e.id) && appraiseReach(seenCells, e, (x, y) => (g.openCells.has(idx(x, y)) ? 'none' : sg.code[y][x]), inb)) {
        g.appraised.add(e.id); g.log.push(`appraised ${e.id}`); changed = true;
      }
      if ((e.type === 'gate' || e.type === 'shelf') && !g.opened.has(e.id) && !g.shelves.has(e.id)) {
        const srcs = events.filter((s) => (s.type === 'switch' || s.type === 'plate') && toList(s.target).includes(e.id));
        const recs = recSources(e.id);
        if (!srcs.length && !recs.length) continue;
        if (recs.length && !recs.every((r) => g.latched.has(r.id))) continue;   // receptor gates open per configuration
        const ready = srcs.every((s) => touchable(seenCells, s) && !(s.hidden && !g.lantern) && !(s.type === 'plate' && !hasBlock));
        if (ready) { (e.type === 'gate' ? g.opened : g.shelves).add(e.id); g.log.push(`opened ${e.id} via ${[...srcs, ...recs].map((s) => s.id).join('+')}`); changed = true; }
      }
    }
    if (!changed) break;
    search(false);
    seenCells = cellsOf();
  }
  // final pass with edges for the softlock check
  search(opts.softlock !== false);
  seenCells = cellsOf();

  const describe = (cid) => {
    const c = cfgs[cid];
    const states = {}, positions = {};
    c.sys.turn.forEach((m, i) => { states[m.id] = c.st[i]; });
    c.sys.move.forEach((m, j) => { positions[m.id] = [c.pos[j] % W, Math.floor(c.pos[j] / W)]; });
    return { states, positions };
  };
  const startCfg = (sys) => cfgId(sys, sys.turn.map((m) => (m.state ? 1 : 0)), sys.move.map((m) => idx(m.x, m.y)));
  const c0id = startCfg(sysList[0]);
  const report = {
    id: map.id, W, H, start, errors: sg.errors, opened: [...g.opened, ...g.shelves], keys: [...g.keys], lantern: g.lantern, log: g.log,
    reachable: [...seenCells], events: [], marks: [], unreached: [],
    beams: true, systems: sysList.map((s) => ({ sources: s.sources, mirrors: [...s.mir].map((m) => m.id) })),
    configs: cfgs.length, states: statesTotal, latched: [...g.latched], litReceptors: [...everLit],
    startLit: [...info(c0id).litReceptors],
    receptorConfigs: Object.fromEntries(Object.entries(firstLit).map(([r, cid]) => [r, describe(cid)])),
    // per configuration that first lit some bridge cell: the cells it lit first (tools: one view per bridge)
    bridgeConfigs: (() => {
      const by = new Map();
      for (const [k, cid] of firstBridge) { if (!by.has(cid)) by.set(cid, []); by.get(cid).push(`${k % W},${Math.floor(k / W)}`); }
      return [...by].map(([cid, cells]) => ({ ...describe(cid), cells }));
    })(),
    bridgeCells: [...firstBridge.keys()].map((k) => `${k % W},${Math.floor(k / W)}`),
    softlocks: softlocks.length,
    softlockSamples: softlocks.slice(0, 5).map((s) => ({ cell: [(s % N) % W, Math.floor((s % N) / W)], ...describe(Math.floor(s / N)) })),
  };
  const everLitCells = new Set();
  for (const cid of cfgSeen) for (const k of info(cid).lit) everLitCells.add(k);
  report.everLitCells = [...everLitCells].map((k) => `${k % W},${Math.floor(k / W)}`);
  report.appraised = [...g.appraised];
  for (const e of events) {
    const reached = e.on === 'enter' ? true : touchable(seenCells, e) && !hiddenByAppraise(e, g.appraised);
    report.events.push({ id: e.id, type: e.type, reached });
    if (!reached) report.unreached.push(e.id);
  }
  const c0 = info(c0id);
  for (const [name, [x, y]] of Object.entries(map.marks || {})) {
    const walkable = inb(x, y) && c0.code[idx(x, y)] === 'none';
    report.marks.push({ name, x, y, walkable, reached: seenCells.has(`${x},${y}`) });
  }
  report.floorCells = 0;
  report.grid = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) { const cc = c0.code[idx(x, y)]; row.push(cc); if (cc === 'none') report.floorCells++; }
    report.grid.push(row);
  }
  /** Beam trace for a described configuration { states, positions } (tools and tests). Not JSON. */
  Object.defineProperty(report, 'traceOf', { enumerable: false, value: (desc = {}) => {
    const all = { sys: { key: 'all', turn: turnables, move: movables } };
    all.st = turnables.map((m) => (desc.states && desc.states[m.id] != null ? desc.states[m.id] : (m.state ? 1 : 0)));
    all.pos = movables.map((m) => (desc.positions && desc.positions[m.id] ? idx(desc.positions[m.id][0], desc.positions[m.id][1]) : idx(m.x, m.y)));
    return info(cfgId(all.sys, all.st, all.pos)).trace;
  } });
  return report;
}

const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// ------------------------------------------------------------------------------------------------ STAGING checklist
export function parseStagingChecklist(md, { section = /^## 5\. Marks checklist/m, ep2 = false } = {}) {
  const out = {};
  const sec = md.split(section)[1];
  if (!sec) return out;
  const body = sec.split(/^## /m)[0];
  for (const line of body.split('\n')) {
    const cells = line.split('|').map((s) => s.trim());
    if (cells.length < 3 || !/^`[a-z0-9_]+`$/.test(cells[1])) continue;
    const mapId = cells[1].replace(/`/g, '');
    const entry = { marks: [], npcs: [], objects: [], actors: [], chestFlags: [] };
    for (const seg of cells[2].split(';')) {
      // "objects `a`, `b`" (plural keyword) lists several names; "actor `x`, `mark`" (singular) names one.
      const parts = seg.split(',');
      const head = parts[0].split('`')[0].toLowerCase();
      const plural = /npcs|objects|actors|chests|marks/.test(head) || (ep2 && /signs|triggers|receptors|doors|events/.test(head));
      parts.forEach((part, i) => {
        const names = [...part.matchAll(/`([^`]+)`/g)].flatMap((m) => m[1].split(/\s+/));
        if (!names.length) return;
        const kw = (i === 0 || plural) ? head : '';
        // STAGING_EP2.md also names signs, enemies, triggers, receptors and doors: all named events
        if (ep2 && /sign|enem|trigger|receptor|door|event|book/.test(kw)) entry.objects.push(...names);
        else if (/npc/.test(kw)) entry.npcs.push(...names);
        else if (/chest/.test(kw)) entry.chestFlags.push(...names);
        else if (/object/.test(kw)) entry.objects.push(...names);
        else if (/actor/.test(kw)) entry.actors.push(...names);
        else entry.marks.push(...names);
      });
    }
    out[mapId] = entry;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ validation
export const MAP_IDS = ['hero_home', 'willowmere', 'inn', 'item_shop', 'smithy', 'library', 'chapel', 'bakery', 'valley',
  'archive_f1', 'archive_f2', 'archive_f3', 'archive_boss',
  'bell_tower'];   // H1: the cold open's bell tower stair (a New Game's first map; no door in or out)
/** Episode 2 maps (EPISODE2_PLAN 2.1). */
export const MAP_IDS_EP2 = ['east_road', 'nameless_hollow', 'nh_hall', 'nh_chapel', 'nh_inn', 'nh_shop', 'nh_smithy',
  'court_f1', 'court_f2', 'court_f3', 'court_throne'];
const EVENT_TYPES = new Set(['npc', 'actor', 'door', 'chest', 'sign', 'book', 'object', 'trigger', 'enemy', 'switch', 'plate',
  'block', 'gate', 'locked_door', 'shelf', 'brazier', 'font', 'save', 'ferry', 'light', 'pit', 'pot', 'beam', 'mirror', 'receptor']);
const GATE_SPRITE_IDS = ['door_locked', 'door_key', 'door_boss', 'door_glass', 'door_glass_key', 'door_vow', 'door_throne', 'x1_gate_culvert', 'x1_gate_barrow'];
const DOOR_KINDS = new Set(['door', 'stairs', 'mirror', 'fog']);
const CHEST_TIERS = new Set(['wood', 'iron', 'gold', 'red', 'blue']);   // red and blue: the Deep Stacks (src/data/cave/world.js)
const DIR_NAMES = new Set(['up', 'down', 'left', 'right']);

/**
 * Validate one map. `maps` = { id: module } for door/exit targets (grids built lazily).
 * Returns { errors, warnings, walk }.
 */
export function validate(map, db, maps, { staging = null, links = loadPendingLinks() } = {}) {
  const errors = [], warnings = [];
  const E = (m) => errors.push(m);
  const Wn = (m) => warnings.push(m);
  const T = (to, label) => checkTarget(to, label, map, maps, db, E, Wn, links);
  if (!map || typeof map !== 'object') return { errors: ['module has no default export object'], warnings };
  for (const k of ['id', 'name', 'area', 'legend', 'ground', 'events', 'marks', 'start']) if (map[k] == null) E(`missing field ${k}`);
  if (!['town', 'field', 'dungeon', 'interior', 'world'].includes(map.area)) E(`area ${map.area} is not town|field|dungeon|interior|world`);
  if (errors.length) return { errors, warnings };
  const grid = buildGrid(map, db);
  errors.push(...grid.errors);
  const { W, H } = grid;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const used = new Set(map.ground.join(''));
  for (const ch of used) if (!map.legend[ch]) E(`ground uses '${ch}' which the legend lacks`);
  if (map.under && !db.tiles.terrains[map.under]) E(`under ${map.under} is not a terrain`);

  const ids = new Set();
  for (const e of map.events || []) {
    if (!e.id) { E(`event without id at ${e.x},${e.y}`); continue; }
    if (ids.has(e.id)) E(`duplicate event id ${e.id}`);
    ids.add(e.id);
    if (!EVENT_TYPES.has(e.type)) E(`event ${e.id}: unknown type ${e.type}`);
    if (e.dir && !DIR_NAMES.has(e.dir)) E(`event ${e.id}: bad dir ${e.dir}`);
    switch (e.type) {
      case 'npc': {
        const n = db.NPCS[e.id];
        if (!n) E(`npc event ${e.id} is not in npcs.js`);
        else if (n.map !== map.id) E(`npc ${e.id} belongs on ${n.map}, placed on ${map.id}`);
        if (e.sprite && !spriteExists(db, e.sprite)) E(`npc ${e.id}: sprite ${e.sprite} missing`);
        break;
      }
      case 'actor': if (!spriteExists(db, e.sprite)) E(`actor ${e.id}: sprite ${e.sprite} missing`); break;
      case 'enemy': {
        if (!db.enemiesField.sprites[e.sprite]) E(`enemy ${e.id}: field sprite ${e.sprite} missing`);
        const enc = db.ENCOUNTERS[e.encounter];
        if (!enc) E(`enemy ${e.id}: encounter ${e.encounter} missing`);
        else {
          // a Deep Stacks encounter belongs to its band's zone (cave_band_k), not to the generated floor it stands on
          if (enc.zone !== map.id && !(enc.cave && /^cave_/.test(map.id))) E(`enemy ${e.id}: encounter ${e.encounter} belongs to zone ${enc.zone}`);
          if (enc.leader !== e.sprite) Wn(`enemy ${e.id}: sprite ${e.sprite} is not the leader ${enc.leader} of ${e.encounter}`);
        }
        if (!['wander', 'patrol', 'chase', 'guard'].includes(e.move)) E(`enemy ${e.id}: move ${e.move}`);
        if (e.move === 'patrol' && !(Array.isArray(e.path) && e.path.every((d) => DIR_NAMES.has(d)))) E(`enemy ${e.id}: patrol needs a path of directions`);
        break;
      }
      case 'door': {
        if (!Array.isArray(e.to) || e.to.length < 3) E(`door ${e.id}: to must be [map,x,y,dir]`);
        else T(e.to, `door ${e.id}`);
        if (!DOOR_KINDS.has(e.kind || 'door')) E(`door ${e.id}: kind ${e.kind}`);
        if (e.kind === 'mirror' && e.sprite && e.sprite !== 'mirror_tall') E(`door ${e.id}: a mirror door draws sprite mirror_tall (or none: the throne room's great mirror)`);
        if (e.kind === 'fog' && (!e.to || e.to[0] !== map.id)) E(`door ${e.id}: a fog door is a same-map transfer`);
        break;
      }
      case 'chest': {
        if (!CHEST_TIERS.has(e.tier)) E(`chest ${e.id}: tier ${e.tier}`);
        if (e.item && !db.ITEMS[e.item]) E(`chest ${e.id}: item ${e.item} unknown`);
        if (e.flag && !db.FLAGS[e.flag]) E(`chest ${e.id}: flag ${e.flag} not declared in quests.js`);
        break;
      }
      case 'pot': if (e.item && !db.ITEMS[e.item]) E(`pot ${e.id}: item ${e.item} unknown`); break;
      case 'sign': case 'ferry': if (!db.lines[e.text]) E(`${e.type} ${e.id}: lines id ${e.text} missing`); break;
      case 'font': if (e.text && !db.lines[e.text]) E(`font ${e.id}: lines id ${e.text} missing`); break;
      case 'book': if (!db.BOOKS[e.book]) E(`book ${e.id}: book ${e.book} missing`); break;
      case 'object': {
        if (!isObjectId(db, e.sprite) && !isTileId(db, e.sprite)) E(`object ${e.id}: sprite ${e.sprite} missing`);
        if (e.script && !db.scenes[e.script]) E(`object ${e.id}: scene ${e.script} missing`);
        if (e.text && !db.lines[e.text]) E(`object ${e.id}: lines id ${e.text} missing`);
        if (e.appraise) {
          // X1: an Appraise object shows its appraiseText in the window (events.appraiseBoxes)
          if (!e.appraiseText && !e.text) E(`object ${e.id}: an appraise object needs appraiseText`);
          else if (e.appraiseText && !db.lines[e.appraiseText]) E(`object ${e.id}: appraiseText ${e.appraiseText} missing`);
        } else if (e.appraiseText) Wn(`object ${e.id}: appraiseText without appraise: true`);
        if (!e.script && !e.text && !e.appraise) Wn(`object ${e.id} has neither script nor text`);
        break;
      }
      case 'trigger': if (e.bark && !e.script) { if (db.barks && !db.barks[e.bark]) E(`trigger ${e.id}: bark ${e.bark} missing`); } else if (!db.scenes[e.script]) E(`trigger ${e.id}: scene ${e.script} missing`); break;
      case 'switch': case 'plate': case 'receptor': {
        for (const t of toList(e.target)) if (!(map.events || []).some((x) => x.id === t && ['gate', 'shelf', 'locked_door'].includes(x.type))) E(`${e.type} ${e.id}: target ${t} is not a gate/shelf`);
        if (e.type === 'receptor') {
          if (!['receptor', 'receptor_wall'].includes(e.sprite)) E(`receptor ${e.id}: sprite ${e.sprite}`);
          if (e.face && !DIR_NAMES.has(e.face)) E(`receptor ${e.id}: face ${e.face}`);
          if (e.script && !db.scenes[e.script]) E(`receptor ${e.id}: scene ${e.script} missing`);
          if (e.flag && !db.FLAGS[e.flag]) E(`receptor ${e.id}: flag ${e.flag} not declared`);
          if (e.flag && !e.latch) E(`receptor ${e.id}: a flag persists a latch, so it needs latch: true`);
        }
        break;
      }
      case 'beam':
        if (!DIR_NAMES.has(e.dir)) E(`beam ${e.id}: dir ${e.dir}`);
        if (!['beam_window', 'beam_lens'].includes(e.sprite)) E(`beam ${e.id}: sprite ${e.sprite}`);
        break;
      case 'mirror':
        if (e.state !== 0 && e.state !== 1) E(`mirror ${e.id}: state must be 0 ('/') or 1 (backslash)`);
        if (!['mirror_stand', 'mirror_heavy'].includes(e.sprite)) E(`mirror ${e.id}: sprite ${e.sprite}`);
        if (e.heavy && e.sprite !== 'mirror_heavy') E(`mirror ${e.id}: a heavy mirror draws mirror_heavy`);
        break;
      case 'gate': case 'locked_door': {
        if (!GATE_SPRITE_IDS.includes(e.sprite)) E(`${e.type} ${e.id}: sprite ${e.sprite}`);
        if (e.to) T(e.to, `${e.type} ${e.id}`);
        if (e.type === 'locked_door' && !db.ITEMS[e.key]) E(`locked_door ${e.id}: key ${e.key} unknown`);
        break;
      }
      case 'shelf': if (!Array.isArray(e.positions) || e.positions.length < 2) E(`shelf ${e.id}: needs 2+ positions`); break;
      case 'pit': if (e.to) T(e.to, `pit ${e.id}`); break;
      default: break;
    }
    for (const f of [...toList(e.if), ...toList(e.ifNot)]) if (!db.FLAGS[f]) E(`event ${e.id}: flag ${f} not declared`);
    if (typeof e.behind === 'string' && e.behind.startsWith('appraise:')) {
      const tid = e.behind.slice('appraise:'.length);
      if (!(map.events || []).some((o) => o.id === tid && o.type === 'object' && o.appraise)) E(`event ${e.id}: behind ${e.behind} is not an appraise object on this map`);
    }
  }
  for (const o of [...(map.overlays || []), ...(map.overhead || [])]) for (const f of [...toList(o.if), ...toList(o.ifNot)]) if (!db.FLAGS[f]) E(`overlay ${o.t} at ${o.x},${o.y}: flag ${f} not declared`);
  for (const v of [map.music, map.lighting && map.lighting.tint]) if (Array.isArray(v)) for (const c of v) for (const f of [...toList(c.if), ...toList(c.ifNot)]) if (!db.FLAGS[f]) E(`conditional field: flag ${f} not declared`);
  if (map.pitTo) T(map.pitTo, 'pitTo');
  for (const x of map.exits || []) {
    // the field fires every `exits` entry whatever the flags (scenes/field.js onLeaderArrived): a gated way out is a `door` event
    if (x.if != null || x.ifNot != null) E(`exit at ${x.x},${x.y}: if/ifNot are ignored by the field on the exits list; gate it with a door event`);
    if (!Array.isArray(x.to)) E(`exit at ${x.x},${x.y} has no to`);
    else T(x.to, `exit at ${x.x},${x.y}`);
    for (let j = 0; j < (x.h || 1); j++) for (let i = 0; i < (x.w || 1); i++) if (!inb(x.x + i, x.y + j)) E(`exit cell ${x.x + i},${x.y + j} off map`);
  }
  for (const [name, m] of Object.entries(map.marks || {})) {
    if (!Array.isArray(m) || m.length !== 2 || !inb(m[0], m[1])) E(`mark ${name} is not an in-bounds [x,y]`);
  }
  const inBed = map.marks && map.marks.bed && map.marks.bed[0] === map.start.x && map.marks.bed[1] === map.start.y;
  if (!inb(map.start.x, map.start.y) || (grid.code[map.start.y][map.start.x] !== 'none' && !inBed)) E(`start ${map.start.x},${map.start.y} is not a walkable cell`);
  // NPC coverage
  for (const n of db.npcsOnMap(map.id)) {
    const placed = (map.events || []).filter((e) => e.type === 'npc' && e.id === n.id);
    if (placed.length !== 1) E(`npc ${n.id} placed ${placed.length} times (needs exactly 1)`);
  }
  // enemy plan
  const zone = db.ZONES[map.id];
  if (zone) {
    const counts = {};
    for (const e of map.events || []) if (e.type === 'enemy') counts[e.encounter] = (counts[e.encounter] || 0) + 1;
    for (const [encId, n] of zone.plan) {
      const enc = db.ENCOUNTERS[encId];
      if (enc.boss) {
        // a boss stands on the map as an actor with the encounter's id, or (the Other Selves) a step trigger runs the
        // scene of that id, which spawns the fighters itself
        let actors = (map.events || []).filter((e) => e.type === 'actor' && e.id === encId);
        if (!actors.length) actors = (map.events || []).filter((e) => e.type === 'trigger' && e.script === encId);
        if (actors.length !== n) E(`boss ${encId}: ${actors.length} actor events, plan says ${n}`);
      } else if ((counts[encId] || 0) !== n) E(`enemy plan ${encId}: placed ${counts[encId] || 0}, plan says ${n}`);
    }
    for (const encId of Object.keys(counts)) if (!zone.plan.some(([id]) => id === encId)) E(`enemy encounter ${encId} is not in the ${map.id} plan`);
  }
  // STAGING checklist
  if (staging && staging[map.id]) {
    const s = staging[map.id];
    for (const m of s.marks) if (!map.marks || !map.marks[m]) E(`STAGING mark ${m} missing`);
    for (const id of [...s.npcs, ...s.objects, ...s.actors]) if (!ids.has(id)) E(`STAGING event ${id} missing`);
    for (const f of s.chestFlags) if (!(map.events || []).some((e) => e.type === 'chest' && e.flag === f)) E(`STAGING chest with flag ${f} missing`);
  }
  // things that stand on the floor must stand on walkable ground (checked against the grid without events)
  const base = buildGrid({ ...map, events: [] }, db);
  const STANDING = new Set(['npc', 'enemy', 'actor', 'block', 'plate', 'switch', 'pot', 'chest', 'brazier']);
  for (const e of map.events || []) {
    if (!STANDING.has(e.type)) continue;
    if (e.type === 'npc' && db.NPCS[e.id] && db.NPCS[e.id].move === 'sleep') continue;   // sleepers lie on beds
    const cells = [[e.x, e.y]];
    for (const [x, y] of cells) if (inb(x, y) && base.code[y][x] !== 'none') E(`${e.type} ${e.id} stands on ${base.code[y][x]} (${base.why[y][x]}) at ${x},${y}`);
  }
  if (!db.BANNERS[map.id]) Wn(`no banner for ${map.id} in text.js`);
  const w = walk(map, db);
  return { errors, warnings, walk: w, grid };
}

function checkTarget(to, label, map, maps, db, E, Wn, links = []) {
  let [mid, x, y, dir] = to;
  if (dir && !DIR_NAMES.has(dir)) E(`${label}: bad dir ${dir}`);
  const target = mid === map.id ? map : maps[mid];
  // x and y both null: the party lands on the target's `start` (scenes/field.js loadMap; the library's trapdoor into the Stacks' hall)
  if (target && x == null && y == null && target.start) { x = target.start.x; y = target.start.y; }
  if (!target) {
    // X1: a link whose target map is built later (tools/maps/x1_links.json) is a warning; an entry whose target exists is never reached
    if (links.some((l) => l.from === map.id && l.to === mid)) Wn(`${label}: target map ${mid} is not built yet (pending in x1_links.json)`);
    else E(`${label}: target map ${mid} not found`);
    return;
  }
  const g = gridFor(target, db);
  if (!(x >= 0 && y >= 0 && x < g.W && y < g.H)) { E(`${label}: target ${mid} ${x},${y} is off the map`); return; }
  if (g.code[y][x] !== 'none') E(`${label}: target ${mid} ${x},${y} is ${g.code[y][x]} (${g.why[y][x]}), not walkable`);
}

/**
 * X1 (EXPANSION1_PLAN 11.4): tools/maps/x1_links.json is `{ "links": [{ from, to, cell }] }`, the cross-links whose
 * target map does not exist yet when the source map is built. `from` and `to` are map ids (they are what `check` matches);
 * `cell` is the plan's agreed source cell [x, y] (or null) and is documentation only, because map authors fix the
 * exact cells. Read once; a missing or broken file lists nothing.
 */
let _links = null;
export function loadPendingLinks() {
  if (_links) return _links;
  try {
    const j = readJson(path.join(NEXT, 'tools', 'maps', 'x1_links.json'));
    _links = (Array.isArray(j) ? j : j.links || []).filter((l) => l && l.from && l.to);
  } catch { _links = []; }
  return _links;
}
/** STAGING.md section 5 (Episode 1) and STAGING_EP2.md section 4 (Episode 2), merged per map id (EP2 adds). */
export function loadStaging() {
  const rd = (f) => fs.readFileSync(path.join(NEXT, 'docs', 'story', f), 'utf8');
  const ep1 = parseStagingChecklist(rd('STAGING.md'));
  const ep2 = parseStagingChecklist(rd('STAGING_EP2.md'), { section: /^## 4\. Marks and named events checklist/m, ep2: true });
  for (const [id, e] of Object.entries(ep2)) {
    if (!ep1[id]) { ep1[id] = e; continue; }
    for (const k of Object.keys(e)) ep1[id][k] = [...ep1[id][k], ...e[k]];
  }
  return ep1;
}
export function loadStagingEp2() {
  return parseStagingChecklist(fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP2.md'), 'utf8'),
    { section: /^## 4\. Marks and named events checklist/m, ep2: true });
}
const _grids = new WeakMap();
function gridFor(map, db) {
  if (!_grids.has(map)) _grids.set(map, buildGrid(map, db));
  return _grids.get(map);
}

export async function loadAll(ids = null) {
  const out = {};
  for (const id of ids || listMapIds()) out[id] = await loadMap(id);
  return out;
}

// ------------------------------------------------------------------------------------------------ CLI
async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'list') { console.log(listMapIds().join('\n')); return; }
  if (cmd === 'dump') { const m = await loadMap(rest[0]); process.stdout.write(JSON.stringify(m)); return; }
  // X1: `--pack x1` (or x2) registers that pack's data first, so its npcs, flags, lines, scenes and encounters validate
  // (note: a pack's npcs for the existing hub maps then report as unplaced until X1-maps-hub places them)
  const pi = rest.indexOf('--pack');
  if (pi >= 0) {
    const ids = String(rest[pi + 1] || '').split(',').filter(Boolean);
    rest.splice(pi, 2);
    for (const id of ids) await (await import(pathToFileURL(path.join(NEXT, 'src', 'data', id, 'index.js')).href)).register();
  }
  const db = await loadDb();
  if (cmd === 'walk') {
    const m = await loadMap(rest[0]);
    const r = walk(m, db, rest[1] ? { flags: rest[1].split(',').filter(Boolean) } : {});
    process.stdout.write(JSON.stringify(r));
    return;
  }
  if (cmd === 'check') {
    const maps = await loadAll();
    const staging = loadStaging();
    let bad = 0;
    for (const id of rest.length ? rest : Object.keys(maps)) {
      const r = validate(maps[id], db, maps, { staging });
      const un = r.walk ? r.walk.unreached : [];
      console.log(`${id}: ${r.errors.length} errors, ${r.warnings.length} warnings, unreached: ${un.join(' ') || 'none'}`);
      for (const e of r.errors) console.log('  ERROR ' + e);
      for (const w of r.warnings) console.log('  warn  ' + w);
      if (r.walk && r.walk.log.length) console.log('  walk: ' + r.walk.log.join('; '));
      bad += r.errors.length;
    }
    process.exit(bad ? 1 : 0);
  }
  if (cmd === 'beams') {
    // beam traces for the preview: the start configuration and, per receptor, the first configuration the walk found
    // that lights it (with the bridges it lights); flags as a comma list in rest[1]
    const m = await loadMap(rest[0]);
    const flags = rest[1] ? rest[1].split(',').filter(Boolean) : null;
    const r = walk(m, db, { lantern: true, ...(flags ? { flags } : {}) });
    if (!r.beams) { process.stdout.write(JSON.stringify({ start: null, solved: [] })); return; }
    const js = (t) => ({ beams: t.beams, lit: [...t.lit], litReceptors: [...t.litReceptors], splashes: t.splashes });
    const solved = Object.entries(r.receptorConfigs).map(([rec, desc]) => ({ receptor: rec, ...desc, trace: js(r.traceOf(desc)) }));
    for (const b of r.bridgeConfigs) solved.push({ receptor: `bridge ${b.cells[0]}`, ...b, trace: js(r.traceOf(b)) });
    process.stdout.write(JSON.stringify({ start: js(r.traceOf({})), solved, latched: r.latched, softlocks: r.softlocks, states: r.states, configs: r.configs }));
    return;
  }
  console.log('usage: mapcheck.mjs list | dump <id> | walk <id> | beams <id> [flags] | check [ids]');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
