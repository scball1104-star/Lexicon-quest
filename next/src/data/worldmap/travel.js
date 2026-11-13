// Travel on the world map (issue #103, docs/WORLD_MAP_PLAN.md wave 3 and section 2.3). Part of the lazy `worldmap` pack.
//
// Choosing a visited town in the map's list takes the party there: a short route animation over the map (scene.js), then a
// fade, and the party stands beside that town's map stone facing into the town. The rules (plan 2.3, Scott's defaults of
// 2026-11-11): destinations are visited towns and their docks only, never a dungeon floor; travel is free, with no battles;
// the map opens from the stones, the field menu's Map row and (as they are built) the ship and Kestrel decks.
//
//   destinations(game, ctx)   the towns list with why each row may or may not be taken (pure)
//   routeOf(from, to, flags)  the legs the animation draws: road, sea (Yara's ship) or air (the Kestrel) (pure)
//   packsFor(mapId, flags)    the packs the arrival map needs before the party may leave (pure over packs.js)
//   readyPacks(ids)           ensure them, bounded: { ok } or { ok: false, why: 'offline' } (never rejects)
//   arrive(engine, field, d)  the fade and the map load: the field's own loadMap, so music, the banner, the safe point and the
//                             autosave (to the run's own slot, game.autosaveSlot) are exactly those of any map change.
//
// Nothing here writes a flag or a quest: travel moves the party and the field's autosave records where it stands.

import { PACKS, packEnabled, packReady, packWanted, packsForMap, ensurePack } from '../../game/packs.js';
import { POINTS } from './layout.js';
import { PLACE, STONES, TOWN_MAP, mapState, mapUnlocked, VISITED } from './data.js';

/** Frames of the route animation: 2 to 3 s by its length on the painting. Reduce motion: a cut, then this short hold. */
export const ROUTE_MIN = 120, ROUTE_MAX = 180, CUT_HOLD = 36;
/** The longest wait for the arrival's packs after the animation (the field's hard-pack guard). */
export const PACK_WAIT_MS = 8000;

// The ways between the painting's points (layout.js POINTS): one road network, the sea lane Yara's ship sails (Episode 5) and
// the Airstair up to the Isles, and the Kestrel's way north from Zephyr to Palehaven (Episode 7: there is no road). Air travel
// (the Kestrel) ignores it and flies straight.
export const WAYS = [
  ['willowmere', 'valley', 'road'], ['willowmere', 'thornfold', 'road'], ['valley', 'archive', 'road'],
  ['valley', 'east_road', 'road'], ['east_road', 'hollowmere', 'road'], ['hollowmere', 'court', 'road'],
  ['hollowmere', 'sand_road', 'road'], ['sand_road', 'emberpeak', 'road'], ['emberpeak', 'foundry', 'road'],
  ['emberpeak', 'flood_road', 'road'], ['flood_road', 'valewyn', 'road'], ['valewyn', 'keep', 'road'],
  ['valewyn', 'sea_lane', 'sea'], ['sea_lane', 'caravan_road', 'sea'], ['caravan_road', 'saffron', 'road'],
  ['saffron', 'labyrinth', 'road'], ['saffron', 'airstair', 'road'], ['airstair', 'zephyr', 'road'],
  ['zephyr', 'palehaven', 'air'],
];

/** Maps aboard a vehicle mid-crossing: the story's own crossing, so the map is view only there (plan 2.3 item 5). */
export const ABOARD = /^ep5_ship$/;

/** Is the Kestrel the party's to fly (Episode 6 opened it)? Same reading as data.js mapState's `kestrel`. Pure. */
export const kestrelOpen = (flags = {}) => !!(flags.aeris_came || flags.library_reached);

/**
 * The route from point `from` to town `to`: { legs: [{ mode, pts: [[x, y] ...] }], mode, len }. `mode` is the leg the party
 * arrives by (it picks the stone: a dock after sea or air when the town has one). Null when no way joins them. Pure.
 */
export function routeOf(from, to, flags = {}) {
  const a = POINTS[from], b = POINTS[to];
  if (!a || !b) return null;
  if (from === to) return { legs: [], mode: 'road', len: 0 };
  if (kestrelOpen(flags)) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { legs: [{ mode: 'air', pts: [a.slice(), b.slice()] }], mode: 'air', len };
  }
  const nb = {};
  for (const [p, q, m] of WAYS) { (nb[p] = nb[p] || []).push([q, m]); (nb[q] = nb[q] || []).push([p, m]); }
  const prev = { [from]: null }, queue = [from];
  while (queue.length) {
    const p = queue.shift();
    if (p === to) break;
    for (const [q, m] of nb[p] || []) if (!(q in prev)) { prev[q] = [p, m]; queue.push(q); }
  }
  if (!(to in prev)) return null;
  const steps = [];
  for (let p = to; prev[p]; p = prev[p][0]) steps.unshift([prev[p][0], p, prev[p][1]]);
  const legs = [];
  let len = 0;
  for (const [p, q, m] of steps) {
    const last = legs[legs.length - 1];
    if (!last || last.mode !== m) legs.push({ mode: m, pts: [POINTS[p].slice()] });
    legs[legs.length - 1].pts.push(POINTS[q].slice());
    len += Math.hypot(POINTS[q][0] - POINTS[p][0], POINTS[q][1] - POINTS[p][1]);
  }
  return { legs, mode: legs.length ? legs[legs.length - 1].mode : 'road', len };
}

/** Frames the animation runs for a route (0 under Reduce motion: a cut). Pure. */
export function routeFrames(route, reduce) {
  if (reduce || !route) return 0;
  return Math.round(Math.max(ROUTE_MIN, Math.min(ROUTE_MAX, ROUTE_MIN + route.len * 0.25)));
}

/** The point and mode `t` (0..1) of the way along a route, by length. Pure. */
export function routeAt(route, t) {
  const segs = [];
  for (const l of route.legs) for (let i = 1; i < l.pts.length; i++) segs.push([l.pts[i - 1], l.pts[i], l.mode]);
  if (!segs.length) return { x: 0, y: 0, mode: 'road', dx: 0, dy: 1 };
  let d = Math.max(0, Math.min(1, t)) * route.len;
  for (const [a, b, mode] of segs) {
    const n = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= n || segs[segs.length - 1][1] === b) {
      const k = n ? Math.min(1, d / n) : 1;
      return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, mode, dx: b[0] - a[0], dy: b[1] - a[1] };
    }
    d -= n;
  }
  const [a, b, mode] = segs[segs.length - 1];
  return { x: b[0], y: b[1], mode, dx: b[0] - a[0], dy: b[1] - a[1] };
}

/**
 * Where travel to a town by a mode lands: { map, x, y, dir, stone }. Sea or air arrives at the town's dock when it has one
 * (Saffron's harbour, Zephyr's sky docks), everything else at its gate. Pure.
 */
export function arrivalOf(town, mode = 'road') {
  const map = TOWN_MAP[town];
  const list = map && STONES[map];
  if (!list || !list.length) return null;
  const dock = list.find((s) => /_(dock|ferry)$/.test(s.id));
  const gate = list.find((s) => !/_(dock|ferry)$/.test(s.id)) || list[0];
  const s = (mode === 'sea' || mode === 'air') && dock ? dock : gate;
  return { map, x: s.at[0], y: s.at[1], dir: s.at[2], stone: s.id };
}

/**
 * The packs the field needs to stand on `mapId`: a prefixed map's own pack, a pack that patches the map when this save wants
 * it, and the Fine Print pack for a tier_1 save (its shop rows), with every hard pack above a needed hard pack (the chain
 * registers in order). Enabled packs only. Pure over the packs table. (loadMap also waits, bounded, for a hard pack that
 * patches the map but that this save does not want yet; the party never needs it there, so travel does not wait for it.)
 */
export function packsFor(mapId, flags = {}, opts) {
  const m = String(mapId || '');
  const ids = new Set();
  for (const { id } of packsForMap(m, opts)) {
    const d = PACKS[id];
    if (!packEnabled(id, opts)) continue;
    if (m.startsWith(d.prefix) || packWanted(id, flags, opts)) ids.add(id);
  }
  if (packEnabled('tier', opts) && packWanted('tier', flags, opts)) ids.add('tier');
  const hard = Object.keys(PACKS).filter((id) => PACKS[id].hard);
  const top = Math.max(-1, ...[...ids].map((id) => hard.indexOf(id)));
  for (let i = 0; i < top; i++) if (packEnabled(hard[i], opts)) ids.add(hard[i]);
  return Object.keys(PACKS).filter((id) => ids.has(id));
}

/**
 * Ensure these packs, bounded by `ms`. Resolves { ok: true } when every one is up, else { ok: false, why: 'offline', failed }
 * (a pack whose files are not cached and the network is down fails its fetch; a wait past `ms` counts the same: the party
 * never leaves for a map that cannot load). Never rejects.
 */
export function readyPacks(ids, ms = PACK_WAIT_MS, opts) {
  const list = (ids || []).filter((id) => !packReady(id));
  if (!list.length) return Promise.resolve({ ok: true, failed: [] });
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, why: 'offline', failed: list.slice(), timeout: true }); } }, ms);
    if (t && t.unref) t.unref();
    Promise.all(list.map((id) => ensurePack(id, opts).catch(() => ({ id, ok: false })))).then((rs) => {
      if (done) return;
      done = true; clearTimeout(t);
      const failed = list.filter((id, i) => !rs[i] || !rs[i].ok);
      resolve(failed.length ? { ok: false, why: 'offline', failed } : { ok: true, failed: [] });
    });
  });
}

/** The field scene under the map screen (the menu may sit between them), or null. */
export function fieldOf(engine) {
  const st = (engine && engine.stack) || [];
  for (let i = st.length - 1; i >= 0; i--) if (st[i] && st[i].name === 'field') return st[i];
  return null;
}

/** What the guard rails read from the engine: { from, mapId, area, scene, coldOpen, cave, busy, flags }. */
export function travelCtx(engine, from = 'menu') {
  const f = fieldOf(engine);
  if (!f || f.dead || !f.map) return { from, busy: true, flags: (engine && engine.game && engine.game.flags) || {} };
  const g = f.game || engine.game || {};
  return {
    from, mapId: f.mapId, area: (f.map.mod && f.map.mod.area) || null,
    scene: !!(f.cutscene && f.cutscene.running) || !!f.coldOpen,
    cave: !!(engine.cave && typeof engine.cave.inRun === 'function' && engine.cave.inRun(g)),
    busy: !!(f.loading || f.pendingWarp || f.packReturn || engine.transition),
    flags: g.flags || {},
  };
}

/**
 * Why travel is shut from here (a TEXT.why key), or null when it is open. A stone stands only in a town, so only the menu row
 * (and the debug hook) can open the map in a dungeon, where it stays view only; the Deep Stacks are a dungeon wherever the
 * menu says. Pure.
 */
export function blockOf(ctx = {}) {
  if (ctx.busy) return 'busy';
  if (ctx.scene) return 'scene';
  if (!mapUnlocked(ctx.flags || {})) return 'locked';
  if (ctx.cave || (ctx.area === 'dungeon' && ctx.from !== 'stone')) return 'dungeon';
  if (ABOARD.test(String(ctx.mapId || ''))) return 'aboard';
  return null;
}

/**
 * The towns list for a game and a context: [{ id, ok, why, route, arrive }] in the map's own order (mapState.towns). `why`:
 * null (travel there), 'rumour' (heard of only: stays disabled), 'here' (the party stands on that town's map) or the guard's
 * reason (every row shut alike). Pure.
 */
export function destinations(game = {}, ctx = {}) {
  const st = mapState(game);
  const flags = game.flags || {};
  const block = blockOf({ ...ctx, flags: ctx.flags || flags });
  const from = st.here;
  return st.towns.map((id) => {
    const visited = st.places[id] === VISITED;
    const route = visited && from ? routeOf(from, id, flags) : null;
    const arrive = visited && route ? arrivalOf(id, route.mode) : null;
    let why = null;
    if (!visited) why = 'rumour';
    else if (!arrive || !PLACE[id]) why = 'locked';
    else if (TOWN_MAP[id] === (ctx.mapId || game.map)) why = 'here';
    else if (block) why = block;
    return { id, ok: !why, why, route, arrive };
  });
}

/**
 * Take the party to `dest` ({ map, x, y, dir }): cover the screen, close the map (and the menu under it), load the map with the
 * field's own loadMap (a landmark: the safe point moves there; the autosave runs as on every map change), uncover. The field
 * holds its input and its pendingWarp for the whole fade, as warpTo does. Resolves when the screen is uncovered.
 */
export function arrive(engine, field, dest) {
  if (!field || field.pendingWarp) return Promise.resolve(false);
  field.inputLocked++;
  const p = engine.fadeTo(async () => {
    while (engine.scene && engine.scene !== field && engine.stack.includes(field)) engine.pop();
    await field.loadMap(dest.map, dest.x, dest.y, dest.dir, { landmark: true });
  }, { style: 'fade', duration: 0.8, hold: 0.25 }).then(() => {
    field.inputLocked = Math.max(0, field.inputLocked - 1);
    field.pendingWarp = null;
    return true;
  });
  field.pendingWarp = p;
  return p;
}
