// Helpers for the Oracle Labyrinth maps (E5-maps-b): the light of one state as the FIELD sees it, for the previews
// (tools/maps/previews/ep5_lab_render.py) and qa/maps/ep5_b_maps.test.mjs. Pure node, no DOM.
//
// Why a field-side solid: the field's light stops at map.base walls (tiles, overlays, decor pieces and buildings) plus
// closed gates and locked doors, while mapcheck's bare grid also counts decor props (palms, jars, stones of the dressing).
// fieldSolid() is the field's set; checkerSolid() the checker's. The test asserts the two give the same light in every
// state, so no dressing ever stands in a shadow's line.
//
//   node qa/maps/ep5_b_lib.mjs dump <mapId> '<json opts>'   one state as JSON (opts: hour, pos {id:[x,y]}, flags [..] or
//                                                            null (every event), latched [plate ids], open [gate/door ids])
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDb, buildGrid, loadMap } from '../../tools/maps/mapcheck.mjs';
import { compile, light, runMask, plates, hourFlag, isHourFlag } from '../../src/data/ep5/field/shade.js';

const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const isWall = (c) => c === 'solid' || c === 'void';

/** Is the event present under a flag set (null = every event) at an hour (the virtual hour:<name> flags)? */
export function presentAt(e, flags, hour) {
  for (const f of toList(e.if)) { if (isHourFlag(f)) { if (!hourFlag(f, hour)) return false; } else if (flags && !flags.has(f)) return false; }
  for (const f of toList(e.ifNot)) { if (isHourFlag(f)) { if (hourFlag(f, hour)) return false; } else if (flags && flags.has(f)) return false; }
  return true;
}

function objectKind(db, t) {
  const o = db.tiles.objects && db.tiles.objects[t];
  if (o) return o.kind || 'prop';
  return db.props && db.props.objects && db.props.objects[t] ? 'prop' : null;
}

/** The field's light stoppers besides casters, lamps and dials: map.base walls plus closed gates and locked doors. */
export function fieldSolid(map, db, { open = [], flags = null, hour = null } = {}) {
  const decor = (map.decor || []).filter((d) => { const k = objectKind(db, d.t); return k !== 'prop'; });
  return withGates(map, buildGrid({ ...map, events: [], decor }, db), { open, flags, hour });
}
/** The checker's stoppers (tools/maps/ep5_check.mjs): the bare grid with every decor footprint. */
export function checkerSolid(map, db, { open = [], flags = null, hour = null } = {}) {
  return withGates(map, buildGrid({ ...map, events: [] }, db), { open, flags, hour });
}
function withGates(map, g, { open, flags, hour }) {
  const W = g.W, H = g.H, s = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isWall(g.code[y][x])) s[y * W + x] = 1;
  const opened = new Set(open);
  for (const e of map.events || []) {
    if ((e.type !== 'gate' && e.type !== 'locked_door') || opened.has(e.id) || !presentAt(e, flags, hour || 'noon')) continue;
    for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) { const x = e.x + i, y = e.y + j; if (x >= 0 && y >= 0 && x < W && y < H) s[y * W + x] = 1; }
  }
  return s;
}

/**
 * One state of a map as the field draws it. opts: hour, pos { id: [x, y] }, flags (array or null), latched (plate ids),
 * open (gate, locked door and breakable ids drawn open). Gates a plate targets open by the plate (met or latched).
 */
export function stateOf(map, db, opts = {}) {
  const m = compile(map);
  if (!m) {
    const t = (map.lighting || {}).tint;
    return { hour: opts.hour || (['dawn', 'dusk', 'night'].includes(t) ? t : 'noon'), running: [], shade: [], lit: [], beam: [], lampLit: [],
      plates: [], open: [...(opts.open || [])], lamps: [], pos: {}, absent: [], plain: true };
  }
  const hour = opts.hour || m.hour;
  const flags = opts.flags == null ? null : new Set(opts.flags);
  const latched = new Set(opts.latched || []);
  const absent = new Set((map.events || []).filter((e) => m.byId.has(e.id) && !presentAt(e, flags, hour)).map((e) => e.id));
  let open = new Set(opts.open || []);
  let st, L, pl;
  for (let pass = 0; pass < 2; pass++) {
    const solid = fieldSolid(map, db, { open: [...open], flags, hour });
    st = { hour, pos: opts.pos || {}, absent, solid, latched };
    L = light(map, st);
    pl = plates(map, st, L);
    const on = new Set(pl.filter((p) => p.on).map((p) => p.id));
    const next = new Set(opts.open || []);
    for (const g of map.events || []) {
      if (g.type !== 'gate') continue;
      const src = (map.events || []).filter((p) => p.type === 'sunplate' && toList(p.target).includes(g.id) && !absent.has(p.id));
      if (src.length && src.every((p) => on.has(p.id))) next.add(g.id);
    }
    if (next.size === open.size && [...next].every((x) => open.has(x))) break;
    open = next;
  }
  const run = runMask(map, st, L);
  const W = m.W, xy = (i) => [i % W, (i / W) | 0];
  const out = { hour, running: [], shade: [], lit: [], beam: [], lampLit: [], plates: pl, open: [...open], lamps: [], pos: {} };
  for (let i = 0; i < m.N; i++) {
    if (run[i]) out.running.push(xy(i));
    if (L.shadow[i] && !L.lit[i] && !st.solid[i]) out.shade.push(xy(i));
    if (L.lit[i]) out.lit.push(xy(i));
    if (L.beam[i]) out.beam.push(xy(i));
    if (L.lamp[i]) out.lampLit.push(xy(i));
  }
  for (const r of [...m.casters, ...m.lamps]) {
    if (absent.has(r.id)) continue;
    const p = (opts.pos || {})[r.id];
    out.pos[r.id] = p ? [p[0], p[1]] : [r.x, r.y];
    if (r.type === 'lampcart') out.lamps.push([...out.pos[r.id], r.r]);
  }
  out.absent = [...absent];
  return out;
}

async function main() {
  const [cmd, id, json] = process.argv.slice(2);
  if (cmd !== 'dump') { console.log('usage: node qa/maps/ep5_b_lib.mjs dump <mapId> <json opts>'); return; }
  const db = await loadDb();
  const map = await loadMap(id);
  const opts = json ? JSON.parse(json) : {};
  const s = stateOf(map, db, opts);
  process.stdout.write(JSON.stringify({ map, state: s }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
