// Map loader, collision grid, reachability walk and validation for src/data/maps/*.js.
// Shared by tools/maps/preview.py (spawns node) and qa/maps/*.test.mjs (imports). Pure node, no DOM.
//
//   node tools/maps/mapcheck.mjs dump <mapId>          JSON of the resolved map module
//   node tools/maps/mapcheck.mjs walk <mapId>          reachability report (JSON)
//   node tools/maps/mapcheck.mjs check [mapId ...]     validation report for every map (exit 1 on errors)
//   node tools/maps/mapcheck.mjs list                  map ids found in src/data/maps
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
  const src = (p) => import(pathToFileURL(path.join(NEXT, 'src', 'data', p)).href);
  const npcs = await src('npcs.js');
  const enc = await src('encounters.js');
  const story = await src('story/ep1.js');
  const text = await src('text.js');
  const items = await src('items.js');
  const quests = await src('quests.js');
  _db = {
    tiles, props, npcAtlas, enemiesField, partyField,
    NPCS: npcs.NPCS, npcsOnMap: npcs.npcsOnMap,
    ENCOUNTERS: enc.ENCOUNTERS, ZONES: enc.ZONES,
    scenes: story.scenes, lines: story.lines, BOOKS: text.BOOKS, BANNERS: text.BANNERS,
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
const SOLID_TYPES = new Set(['npc', 'actor', 'chest', 'object', 'block', 'pot', 'brazier', 'font', 'save', 'sign', 'book', 'ferry']);
const PASS_THROUGH = new Set(['actor', 'enemy', 'block', 'pot']);   // despawn, fight, push, break

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

export function walk(map, db, opts = {}) {
  const grid = buildGrid(map, db);
  const { W, H, code, faint } = grid;
  const events = map.events || [];
  const byId = new Map(events.map((e) => [e.id, e]));
  const byCell = eventIndex(map);
  const flags = new Set(opts.flags || []);
  const start = opts.start || (map.start ? [map.start.x, map.start.y] : null);
  if (!start) return { ...grid, error: 'map has no start' };

  const state = { opened: new Set(), keys: new Set(opts.keys || []), lantern: !!opts.lantern, shelves: new Set(), log: [] };
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const evAt = (x, y) => byCell.get(`${x},${y}`) || [];

  const effective = (x, y) => {
    let c = code[y][x];
    if (faint[y][x] && state.lantern) {
      const rid = faint[y][x].replace('_faint', '_revealed');
      c = tileCode(db, rid) ?? c;
    }
    for (const e of evAt(x, y)) {
      if (flags.size && e.if && !toList(e.if).every((f) => flags.has(f))) continue;
      if ((e.type === 'gate' || e.type === 'locked_door') && state.opened.has(e.id)) return 'none';
      if (e.type === 'shelf' && state.shelves.has(e.id)) return 'none';
      if (PASS_THROUGH.has(e.type)) return 'none';
    }
    return c;
  };

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
      if (e.type === 'locked_door' && !state.opened.has(e.id) && state.keys.has(e.key) && touchable(seen, e)) { state.opened.add(e.id); state.log.push(`unlocked ${e.id}`); changed = true; }
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
    reachable: [...seen], events: [], marks: [], unreached: [],
  };
  for (const e of events) {
    const reached = e.on === 'enter' ? true : touchable(seen, e);
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

const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// ------------------------------------------------------------------------------------------------ STAGING checklist
export function parseStagingChecklist(md) {
  const out = {};
  const sec = md.split(/^## 5\. Marks checklist/m)[1];
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
      const plural = /npcs|objects|actors|chests|marks/.test(head);
      parts.forEach((part, i) => {
        const names = [...part.matchAll(/`([^`]+)`/g)].flatMap((m) => m[1].split(/\s+/));
        if (!names.length) return;
        const kw = (i === 0 || plural) ? head : '';
        if (/npc/.test(kw)) entry.npcs.push(...names);
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
  'archive_f1', 'archive_f2', 'archive_f3', 'archive_boss'];
const EVENT_TYPES = new Set(['npc', 'actor', 'door', 'chest', 'sign', 'book', 'object', 'trigger', 'enemy', 'switch', 'plate',
  'block', 'gate', 'locked_door', 'shelf', 'brazier', 'font', 'save', 'ferry', 'light', 'pit', 'pot']);
const CHEST_TIERS = new Set(['wood', 'iron', 'gold']);
const DIR_NAMES = new Set(['up', 'down', 'left', 'right']);

/**
 * Validate one map. `maps` = { id: module } for door/exit targets (grids built lazily).
 * Returns { errors, warnings, walk }.
 */
export function validate(map, db, maps, { staging = null } = {}) {
  const errors = [], warnings = [];
  const E = (m) => errors.push(m);
  const Wn = (m) => warnings.push(m);
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
          if (enc.zone !== map.id) E(`enemy ${e.id}: encounter ${e.encounter} belongs to zone ${enc.zone}`);
          if (enc.leader !== e.sprite) Wn(`enemy ${e.id}: sprite ${e.sprite} is not the leader ${enc.leader} of ${e.encounter}`);
        }
        if (!['wander', 'patrol', 'chase', 'guard'].includes(e.move)) E(`enemy ${e.id}: move ${e.move}`);
        if (e.move === 'patrol' && !(Array.isArray(e.path) && e.path.every((d) => DIR_NAMES.has(d)))) E(`enemy ${e.id}: patrol needs a path of directions`);
        break;
      }
      case 'door': {
        if (!Array.isArray(e.to) || e.to.length < 3) E(`door ${e.id}: to must be [map,x,y,dir]`);
        else checkTarget(e.to, `door ${e.id}`, map, maps, db, E);
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
        if (!e.script && !e.text) Wn(`object ${e.id} has neither script nor text`);
        break;
      }
      case 'trigger': if (!db.scenes[e.script]) E(`trigger ${e.id}: scene ${e.script} missing`); break;
      case 'switch': case 'plate': {
        for (const t of toList(e.target)) if (!(map.events || []).some((x) => x.id === t && ['gate', 'shelf', 'locked_door'].includes(x.type))) E(`${e.type} ${e.id}: target ${t} is not a gate/shelf`);
        break;
      }
      case 'gate': case 'locked_door': {
        if (!['door_locked', 'door_key', 'door_boss'].includes(e.sprite)) E(`${e.type} ${e.id}: sprite ${e.sprite}`);
        if (e.to) checkTarget(e.to, `${e.type} ${e.id}`, map, maps, db, E);
        if (e.type === 'locked_door' && !db.ITEMS[e.key]) E(`locked_door ${e.id}: key ${e.key} unknown`);
        break;
      }
      case 'shelf': if (!Array.isArray(e.positions) || e.positions.length < 2) E(`shelf ${e.id}: needs 2+ positions`); break;
      case 'pit': if (e.to) checkTarget(e.to, `pit ${e.id}`, map, maps, db, E); break;
      default: break;
    }
    for (const f of [...toList(e.if), ...toList(e.ifNot)]) if (!db.FLAGS[f]) E(`event ${e.id}: flag ${f} not declared`);
  }
  if (map.pitTo) checkTarget(map.pitTo, 'pitTo', map, maps, db, E);
  for (const x of map.exits || []) {
    if (!Array.isArray(x.to)) E(`exit at ${x.x},${x.y} has no to`);
    else checkTarget(x.to, `exit at ${x.x},${x.y}`, map, maps, db, E);
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
        const actors = (map.events || []).filter((e) => e.type === 'actor' && e.id === encId);
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

function checkTarget(to, label, map, maps, db, E) {
  const [mid, x, y, dir] = to;
  if (dir && !DIR_NAMES.has(dir)) E(`${label}: bad dir ${dir}`);
  const target = mid === map.id ? map : maps[mid];
  if (!target) { E(`${label}: target map ${mid} not found`); return; }
  const g = gridFor(target, db);
  if (!(x >= 0 && y >= 0 && x < g.W && y < g.H)) { E(`${label}: target ${mid} ${x},${y} is off the map`); return; }
  if (g.code[y][x] !== 'none') E(`${label}: target ${mid} ${x},${y} is ${g.code[y][x]} (${g.why[y][x]}), not walkable`);
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
  const db = await loadDb();
  if (cmd === 'walk') {
    const m = await loadMap(rest[0]);
    const r = walk(m, db);
    process.stdout.write(JSON.stringify(r));
    return;
  }
  if (cmd === 'check') {
    const maps = await loadAll();
    const staging = parseStagingChecklist(fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING.md'), 'utf8'));
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
  console.log('usage: mapcheck.mjs list | dump <id> | walk <id> | check [ids]');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
