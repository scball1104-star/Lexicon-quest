// Sun and shade, the rule (E5-world, docs/EPISODE5_PLAN.md 4.5 and 5.1). Pure: no DOM, no canvas, no audio, no timers, no
// randomness. The field (./system.js) and the map tools (tools/maps/ep5_check.mjs) both read light through this file.
//
// A map with the mechanic carries a `shade` block (docs/WORLD_EP5.md has the full contract):
//   shade: {
//     hour: 'noon',                    // the hour on entry: 'dawn' | 'noon' | 'dusk' | 'night' (night: no sun at all)
//     sand:   [ '....ssss....', ... ], // 's' = sand (same size as ground); any other character = not sand
//     roof:   [ '############', ... ], // optional, or `roof: true` for a fully roofed map: '#' = the sun never reaches it
//     groove: [ '..gggg......', ... ], // optional: 'g' = a groove cell (a cell whose legend id is `groove` is one too)
//     tint:   false,                   // optional: keep the map's own tint (default: the tint follows the hour)
//   }
// ONE rule for the whole episode: sand that light reaches RUNS (impassable); sand in shade or in the dark HOLDS (firm).
// Light comes from three sources:
//   sun      (dawn, noon, dusk; open-sky cells): every open cell is lit except a caster's shadow. A caster of height h
//            throws its shadow west 2h cells at dawn, north h cells at noon, east 2h cells at dusk; a shadow stops at the
//            first stopper (a wall or solid tile, a closed gate, another caster, a lamp, a dial).
//   window   (`window` events, at their `hours`): a beam `lanes` cells wide (default 1; extra lanes run south or east)
//            along the facing direction for `reach` cells (default 12) from the cell in front of the window; a wall ends
//            it; a caster or lamp in the beam shades every cell behind it to the beam's end (or the next wall).
//            `faces: 'down'` is an oculus: it lights its own cell.
//   lamp     (`lampcart` events, any hour): every cell within `r` (default 3, Chebyshev) is lit, except the cells of the
//            lamp's own row and column behind a stopper (shadows fall only along the four lines; diagonals are lit).
//
//   compile(map)                 the parsed model (cached per map object); model.errors lists authoring problems
//   light(map, state)            { lit, shadow, beam, lamp, segs } (Uint8Array per cell; segs: each shadow and beam drawn)
//   lit(map, state)              Set of lit cell indices
//   running(map, state)          Set of sand cells that run (lit sand); firm(map, state): the sand that holds
//   plates(map, state)           [{ id, lit, on }] each sun plate's light state and whether it is on (latched counts)
//   latches(map, state)          ids of `latch` plates whose condition holds now and that are not latched yet (monotone)
//   hourFlag(key, hour)          the virtual flags `hour:<name>` (`hour:dusk`), else undefined
//
// state: { hour?, pos?: { id: [x, y] | index }, absent?: Iterable<id>, solid?: Uint8Array | (i) => bool, latched?: Iterable<id> }
//   pos: where each caster and lamp stands now (missing: its authored cell); absent: shade events not present (if/ifNot);
//   solid: the cells that stop light besides the casters, lamps and dials (walls, solid tiles, closed gates).

export const DIAL_HOURS = ['dawn', 'noon', 'dusk'];
export const HOURS = ['dawn', 'noon', 'dusk', 'night'];
export const SHADE_TYPES = new Set(['sundial', 'standstone', 'window', 'lampcart', 'sunplate']);
export const MAX_MOVERS = 3;
export const MAX_GROOVE = 6;
export const DEFAULT_REACH = 12;
export const DEFAULT_LAMP_R = 3;
/** The sun's direction and the shadow length per unit of caster height. */
export const SUN = { dawn: ['west', 2], noon: ['north', 1], dusk: ['east', 2] };
export const FACING = { west: [-1, 0], east: [1, 0], north: [0, -1], south: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const ORTHO = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const cache = new WeakMap();

const rowsOf = (v) => (Array.isArray(v) ? v : []);

/** Parse a map's shade block (or its shade events alone) once. null for a map with neither. */
export function compile(map) {
  if (!map) return null;
  const evs = map.events || [];
  if (!map.shade && !evs.some((e) => e && SHADE_TYPES.has(e.type))) return null;
  const hit = cache.get(map);
  if (hit && hit.src === map.shade && hit.nev === evs.length) return hit;
  const S = map.shade || {}, errors = [];
  const H = (map.ground || []).length, W = H ? map.ground[0].length : 0;
  const N = W * H;
  const hour = S.hour == null ? (map.shade ? 'noon' : 'night') : S.hour;
  if (!HOURS.includes(hour)) errors.push(`shade: hour ${S.hour} is not dawn, noon, dusk or night`);
  const sand = new Uint8Array(N), roof = new Uint8Array(N), groove = new Uint8Array(N);
  const grid = (rows, name, ch, out) => {
    if (!rows.length) return;
    if (rows.length !== H) errors.push(`shade: ${name} has ${rows.length} rows, ground has ${H}`);
    for (let y = 0; y < Math.min(H, rows.length); y++) {
      const r = String(rows[y] || '');
      if (r.length !== W) errors.push(`shade: ${name} row ${y} has ${r.length} columns, expected ${W}`);
      for (let x = 0; x < Math.min(W, r.length); x++) if (r[x] === ch) out[y * W + x] = 1;
    }
  };
  grid(rowsOf(S.sand), 'sand', 's', sand);
  if (S.roof === true) roof.fill(1); else grid(rowsOf(S.roof), 'roof', '#', roof);
  grid(rowsOf(S.groove), 'groove', 'g', groove);
  // a cell whose legend id is the groove terrain is a groove cell too (E5-tiles' `groove`)
  const legend = map.legend || {};
  for (let y = 0; y < H; y++) {
    const r = map.ground[y] || '';
    for (let x = 0; x < W; x++) { const id = legend[r[x]]; if (id && /^groove/.test(id)) groove[y * W + x] = 1; }
  }
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const model = { src: map.shade, nev: evs.length, W, H, N, hour, sand, roof, groove, tintFollows: map.shade ? S.tint !== false : false,
    openSky: false, casters: [], lamps: [], windows: [], plates: [], dials: [], movers: [], errors, byId: new Map() };
  for (let i = 0; i < N; i++) if (!roof[i]) { model.openSky = true; break; }
  for (const e of evs) {
    if (!e || !SHADE_TYPES.has(e.type)) continue;
    const ok = inb(e.x, e.y);
    if (!ok) { errors.push(`${e.type} ${e.id}: ${e.x},${e.y} is off the map`); continue; }
    const rec = { id: e.id, ev: e, type: e.type, x: e.x, y: e.y, i: e.y * W + e.x };
    if (e.type === 'standstone') {
      rec.h = Math.max(1, Math.min(3, e.h == null ? 2 : e.h | 0));
      if (e.h != null && (e.h < 1 || e.h > 3)) errors.push(`standstone ${e.id}: h ${e.h} (1 low block, 2 standing stone, 3 obelisk)`);
      rec.mover = !!(e.shove || e.push);
      model.casters.push(rec);
    } else if (e.type === 'lampcart') {
      rec.r = Math.max(1, e.r == null ? DEFAULT_LAMP_R : e.r | 0);
      rec.mover = !!(e.shove || e.push);
      model.lamps.push(rec);
    } else if (e.type === 'window') {
      const f = e.faces || 'west';
      if (!FACING[f] && f !== 'down') errors.push(`window ${e.id}: faces ${f} (west, east, north, south or down)`);
      rec.down = f === 'down';
      rec.d = FACING[f] || [0, 0];
      rec.hours = new Set(Array.isArray(e.hours) ? e.hours : e.hours ? [e.hours] : []);
      for (const h of rec.hours) if (!DIAL_HOURS.includes(h)) errors.push(`window ${e.id}: hour ${h} is not dawn, noon or dusk`);
      if (!rec.hours.size) errors.push(`window ${e.id}: no hours`);
      rec.reach = e.reach == null ? DEFAULT_REACH : Math.max(1, e.reach | 0);
      rec.lanes = Math.max(1, (e.lanes | 0) || 1);
      model.windows.push(rec);
    } else if (e.type === 'sunplate') {
      rec.when = e.when === 'shade' ? 'shade' : 'lit';
      if (e.when != null && e.when !== 'lit' && e.when !== 'shade') errors.push(`sunplate ${e.id}: when ${e.when} (lit or shade)`);
      rec.latch = !!(e.latch || e.flag);
      model.plates.push(rec);
    } else if (e.type === 'sundial') model.dials.push(rec);
    model.byId.set(e.id, rec);
  }
  // movers: the groove they ride (the 4-connected groove cells around the authored cell)
  for (const r of [...model.casters, ...model.lamps]) {
    if (!r.mover) continue;
    model.movers.push(r);
    if (!groove[r.i]) { errors.push(`${r.type} ${r.id}: a movable ${r.type === 'lampcart' ? 'lamp' : 'caster'} must stand on a groove cell`); r.track = [r.i]; continue; }
    const seen = new Set([r.i]), q = [r.i];
    while (q.length) {
      const i = q.pop(), x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of ORTHO) {
        const nx = x + dx, ny = y + dy, j = ny * W + nx;
        if (inb(nx, ny) && groove[j] && !seen.has(j)) { seen.add(j); q.push(j); }
      }
    }
    r.track = [...seen].sort((a, b) => a - b);
    if (r.track.length > MAX_GROOVE) errors.push(`${r.type} ${r.id}: its groove has ${r.track.length} cells (at most ${MAX_GROOVE})`);
  }
  if (model.movers.length > MAX_MOVERS) errors.push(`shade: ${model.movers.length} movable casters and lamps (at most ${MAX_MOVERS})`);
  cache.set(map, model);
  return model;
}

const asSet = (v) => (v instanceof Set ? v : new Set(v || []));
function posOf(m, rec, pos) {
  const p = pos && (pos instanceof Map ? pos.get(rec.id) : pos[rec.id]);
  if (p == null) return rec.i;
  return typeof p === 'number' ? p : p[1] * m.W + p[0];
}

/** Where every present caster, lamp and dial stands in this state: { casters: [[rec, i]], lamps: [[rec, i]], occ: Uint8Array }. */
export function placed(map, state = {}) {
  const m = compile(map);
  const absent = asSet(state.absent);
  const occ = new Uint8Array(m ? m.N : 0);
  const casters = [], lamps = [];
  if (!m) return { casters, lamps, occ };
  for (const r of m.casters) if (!absent.has(r.id)) { const i = posOf(m, r, state.pos); casters.push([r, i]); occ[i] = 1; }
  for (const r of m.lamps) if (!absent.has(r.id)) { const i = posOf(m, r, state.pos); lamps.push([r, i]); occ[i] = 1; }
  for (const r of m.dials) if (!absent.has(r.id)) occ[r.i] = 1;
  return { casters, lamps, occ };
}

/**
 * Light of a state. Returns { hour, lit, shadow, beam, lamp, segs } where lit/shadow/beam/lamp are Uint8Array(N): lit = the
 * cell is lit by anything; shadow = it lies in a shadow some caster or stopper throws (drawn as shade unless lit); beam = a
 * window lights it; lamp = a lamp lights it. segs: [{ id, kind: 'sun' | 'beam' | 'beamshadow' | 'lamp', cells: [i, ...] }]
 * in the order from the caster or window outward (the hour sweep animates them).
 */
export function light(map, state = {}) {
  const m = compile(map);
  if (!m) return null;
  const { W, H, N } = m;
  const hour = state.hour || m.hour;
  const { casters, lamps, occ } = placed(map, state);
  const sol = state.solid;
  const solidAt = !sol ? () => false : typeof sol === 'function' ? sol : (i) => !!sol[i];
  const stop = (i) => occ[i] === 1 || solidAt(i);
  const wall = (i) => solidAt(i) && occ[i] !== 1;
  const lit = new Uint8Array(N), shadow = new Uint8Array(N), beam = new Uint8Array(N), lampLit = new Uint8Array(N);
  const segs = [];
  const sun = SUN[hour];
  if (sun) {
    for (let i = 0; i < N; i++) if (!m.roof[i]) lit[i] = 1;
    const [dx, dy] = FACING[sun[0]];
    for (const [r, i0] of casters) {
      const len = r.h * sun[1];
      let x = i0 % W, y = (i0 / W) | 0;
      const cells = [];
      for (let k = 0; k < len; k++) {
        x += dx; y += dy;
        if (x < 0 || y < 0 || x >= W || y >= H) break;
        const j = y * W + x;
        if (stop(j)) break;
        cells.push(j);
      }
      for (const j of cells) if (!m.roof[j]) { shadow[j] = 1; lit[j] = 0; }
      segs.push({ id: r.id, kind: 'sun', cells: cells.filter((j) => !m.roof[j]) });
    }
  }
  for (const w of m.windows) {
    if (asSet(state.absent).has(w.id) || !w.hours.has(hour)) continue;
    if (w.down) { beam[w.i] = 1; segs.push({ id: w.id, kind: 'beam', cells: [w.i] }); continue; }
    const [dx, dy] = w.d, px = Math.abs(dy), py = Math.abs(dx);    // extra lanes run south (east-west beams) or east
    for (let lane = 0; lane < w.lanes; lane++) {
      let x = w.x + px * lane, y = w.y + py * lane;
      const on = [], off = [];
      let dark = false;
      for (let k = 0; k < w.reach; k++) {
        x += dx; y += dy;
        if (x < 0 || y < 0 || x >= W || y >= H) break;
        const j = y * W + x;
        if (wall(j)) break;
        if (occ[j]) { dark = true; continue; }
        if (dark) off.push(j); else on.push(j);
      }
      for (const j of on) beam[j] = 1;
      for (const j of off) shadow[j] = 1;
      segs.push({ id: w.id, kind: 'beam', lane, cells: on });
      if (off.length) segs.push({ id: w.id, kind: 'beamshadow', lane, cells: off });
    }
  }
  for (const [r, i0] of lamps) {
    const x0 = i0 % W, y0 = (i0 / W) | 0, R = r.r;
    const cells = [];
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (!dx || !dy) continue;
      const x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      cells.push(y * W + x);
    }
    const dark = [];
    for (const [dx, dy] of ORTHO) {
      let blocked = false;
      for (let k = 1; k <= R; k++) {
        const x = x0 + dx * k, y = y0 + dy * k;
        if (x < 0 || y < 0 || x >= W || y >= H) break;
        const j = y * W + x;
        if (stop(j)) { blocked = true; continue; }
        (blocked ? dark : cells).push(j);
      }
    }
    for (const j of cells) lampLit[j] = 1;
    for (const j of dark) shadow[j] = 1;
    segs.push({ id: r.id, kind: 'lamp', cells });
    if (dark.length) segs.push({ id: r.id, kind: 'lampshadow', cells: dark });
  }
  for (let i = 0; i < N; i++) if (beam[i] || lampLit[i]) lit[i] = 1;
  return { hour, lit, shadow, beam, lamp: lampLit, segs };
}

/** Set of lit cell indices (plan 5.1). */
export function lit(map, state = {}) {
  const L = light(map, state), out = new Set();
  if (L) for (let i = 0; i < L.lit.length; i++) if (L.lit[i]) out.add(i);
  return out;
}

/** Uint8Array: 1 where a sand cell runs in this state (pass `L`, a light() result, to skip the recompute). */
export function runMask(map, state = {}, L = null) {
  const m = compile(map);
  if (!m) return new Uint8Array(0);
  L = L || light(map, state);
  const out = new Uint8Array(m.N);
  const sol = state.solid;
  const wallAt = !sol ? () => false : typeof sol === 'function' ? sol : (i) => !!sol[i];
  for (let i = 0; i < m.N; i++) if (m.sand[i] && L.lit[i] && !wallAt(i)) out[i] = 1;
  return out;
}
/** Set of sand cells that run (lit sand). */
export function running(map, state = {}) {
  const r = runMask(map, state), out = new Set();
  for (let i = 0; i < r.length; i++) if (r[i]) out.add(i);
  return out;
}
/** Set of sand cells that hold (in shade or in the dark). */
export function firm(map, state = {}) {
  const m = compile(map), r = runMask(map, state), out = new Set();
  if (m) for (let i = 0; i < m.N; i++) if (m.sand[i] && !r[i]) out.add(i);
  return out;
}

/** Each sun plate in this state: [{ id, lit, met, on }]: met = its `when` holds now; on = met or latched (state.latched). */
export function plates(map, state = {}, L = null) {
  const m = compile(map);
  if (!m) return [];
  L = L || light(map, state);
  const latched = asSet(state.latched), absent = asSet(state.absent);
  const out = [];
  for (const p of m.plates) {
    if (absent.has(p.id)) continue;
    const isLit = !!L.lit[p.i];
    const met = p.when === 'lit' ? isLit : !isLit;
    out.push({ id: p.id, lit: isLit, met, on: met || (p.latch && latched.has(p.id)) });
  }
  return out;
}

/** `latch` plates whose condition holds in this state and that state.latched does not hold yet. Monotone. */
export function latches(map, state = {}, L = null) {
  const m = compile(map);
  if (!m) return [];
  const latched = asSet(state.latched);
  const byId = m.byId;
  return plates(map, state, L).filter((p) => p.met && byId.get(p.id).latch && !latched.has(p.id)).map((p) => p.id);
}

/** Can a mover step from cell i one cell in (dx, dy) along its groove? (track membership only; occupancy is the caller's) */
export function grooveNext(m, rec, i, dx, dy) {
  const x = (i % m.W) + dx, y = ((i / m.W) | 0) + dy;
  if (x < 0 || y < 0 || x >= m.W || y >= m.H) return -1;
  const j = y * m.W + x;
  return m.groove[j] && rec.track && rec.track.includes(j) ? j : -1;
}

const FLAG_RE = /^hour:(dawn|noon|dusk|night)$/;
/** Is `key` a virtual hour flag (`hour:dusk`)? */
export function isHourFlag(key) { return typeof key === 'string' && FLAG_RE.test(key); }
/** `hour:<name>` against the current hour; undefined for any other key. */
export function hourFlag(key, hour) {
  const m = FLAG_RE.exec(key || '');
  return m ? m[1] === hour : undefined;
}

/**
 * The tint an hour asks for (null at night: the map keeps its own). `noonTint` is the pack's noon tint id or 'none';
 * `dawnTint` the dawn one (the field's rose `sun_dawn` under an open sky, the core `dawn` under a roof).
 */
export function tintForHour(hour, noonTint = 'none', dawnTint = 'dawn') {
  if (hour === 'dawn') return dawnTint;
  if (hour === 'dusk') return 'dusk';
  if (hour === 'noon') return noonTint;
  return null;
}
