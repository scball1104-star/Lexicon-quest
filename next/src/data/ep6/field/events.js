// Episode 6's field event types and the gust lane system's attachment (E6-world, docs/EPISODE6_PLAN.md 4.4 and 5.1).
// Imported by ../world.js when the ep6 pack registers; never in the first download.
//
//   vane     { group ('a' | 'b' | 'c'), sprite? ('vane'; 'fan_vane' indoors) }   solid; confirm while facing turns its group
//   mooring  { sprite? (unused: the post is drawn with the lanes) }              on a lane cell; a ride stops on it
//
// attach(field) is idempotent per field instance: it adds field.wind and wraps this field's glass.reset / update /
// drawBeams (the lane layer under the actors) / drawFlares (code vane heads), onLeaderArrived (the carry), canStep (the
// leader may step onto a live lane cell; nobody else), tryLeaderStep (a direction held through a ride takes no extra step),
// lighting.draw (the storm's soft lightning) and debugState, the way Episode 5's shade attaches. Every create() above
// attaches first, and ../world.js attaches every field the engine enters (maps with lanes and no vane).

import { EXT, INTERACT_TYPES } from '../../../world/events.js';
import { Wind } from './system.js';
import { compile, live, vaneArrow } from './wind.js';
import { ensureArt } from './art.js';
import { flashLevel, drawFlash } from './storm.js';

INTERACT_TYPES.add('vane');

const prop = (field, ent, t, state) => {
  const map = field.map;
  ensureArt(map.db, field.engine, map);
  if (!t || !map.db.objects || !map.db.objects[t]) { field.warnOnce('ep6prop:' + t, `unknown object "${t}" (${ent.id})`); return null; }
  const p = map.addProp({ t, x: ent.x, y: ent.y, state: state || 0, id: ent.id, kind: 'event' });
  ent.prop = p;
  return p;
};

/** The authored frame of a vane (before the system resets for this map): see art.js for the layout. */
function firstFrame(field, ent, t) {
  const m = compile(field.map.mod);
  const o = field.map.db.objects && field.map.db.objects[t];
  const n = o && o.frames ? o.frames.length : 1;
  if (!m) return 0;
  const g = ent.ev.group != null ? String(ent.ev.group) : null;
  let a = vaneArrow(m, 0, g);
  if (a < 0) { const k = m.groups.indexOf(g); a = k >= 0 ? vaneArrow(m, 1 << k, g) : 0; }
  a = Math.max(0, a);
  return n >= 8 ? a : n >= 4 ? a : 0;
}

EXT.vane = {
  create(field, ent) { attach(field); const t = ent.ev.sprite || 'vane'; prop(field, ent, t, firstFrame(field, ent, t)); },
  interact: (field, ent) => (field.wind ? field.wind.turnVane(ent) : null),
};
EXT.mooring = {
  create(field) { attach(field); },
};

const seedOf = (id) => { let h = 0; for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 997; };

/** The storm's lightning after the lighting (screen pixels): F3 and the Eyrie (tint `storm`) or `lighting.lightning: true`. */
function lightning(field, r, cam) {
  const map = field.map, Lt = field.lighting, w = field.wind;
  if (!map || !Lt || !w) return;
  const want = Lt.tintName === 'storm' || !!(map.mod && map.mod.lighting && map.mod.lighting.lightning);
  if (!want || Lt.tintFade) { w.lastFlash = null; return; }
  const level = flashLevel(field.frame | 0, seedOf(map.id), w.still);
  const alpha = drawFlash(r, cam, level, (x, y) => w.cloud(x, y), map.w, map.h);
  w.lastFlash = { frame: field.frame | 0, level, alpha };
}

export function attach(field) {
  if (!field || field.wind) return field && field.wind;
  const w = field.wind = new Wind(field);
  const wrap = (obj, name, fn) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].ep6) return null;
    const orig = obj[name].bind(obj);
    const f = function (...a) { return fn(orig, ...a); };
    f.ep6 = true;
    obj[name] = f;
    return orig;
  };
  wrap(field.glass, 'reset', (o) => { o(); w.reset(); });
  wrap(field.glass, 'update', (o) => { o(); w.update(); });
  wrap(field.glass, 'drawBeams', (o, r, t) => { w.drawLow(r, t); o(r, t); });
  wrap(field.glass, 'drawFlares', (o, r, t) => { o(r, t); w.drawVaneHeads(r); });
  const arrive = wrap(field, 'onLeaderArrived', (o) => w.arrived(o));
  if (arrive) w.origArrive = arrive;
  // the leader (and only the leader, from input) may step onto a live lane cell; the cell is `void` for everyone else
  wrap(field, 'canStep', (o, actor, x, y, nx, ny, dir) => {
    if (actor && actor === field.leader && w.mayEnter(nx, ny)) {
      const other = field.actorAt(nx, ny, actor);
      return !(other && other.kind !== 'party');
    }
    return o(actor, x, y, nx, ny, dir);
  });
  // a direction held through a ride takes no extra step when the ride ends: it must be released (or another pressed) first
  wrap(field, 'tryLeaderStep', (o, dir, dur) => (w.active && w.holding(dir) ? false : o(dir, dur)));
  wrap(field.lighting, 'draw', (o, r, cam, lights, lanternAt) => { o(r, cam, lights, lanternAt); lightning(field, r, cam); });
  wrap(field, 'debugState', (o) => ({ ...o(), wind: w.debugState() }));
  installDebug(field);
  return w;
}

function installDebug(field) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || !D.commands || D.commands().includes('wind')) return;
  const cur = () => { const e = field.engine, f = e && (e.stack || []).find((sc) => sc && sc.name === 'field'); return f && f.wind ? f : null; };
  D.register('wind', () => { const f = cur(); return f ? { ...f.wind.debugState(), flash: f.wind.lastFlash || null } : null; });
  /** LQ_DEBUG.turnVane(idOrGroup, { force }): as confirm on that vane would (canTurn, the swing); resolves the wind state. */
  D.register('turnVane', async (id, o = {}) => {
    const f = cur();
    if (!f || !f.wind.active) return null;
    const ent = f.entities.get(id);
    const ok = ent && ent.type === 'vane' ? await f.wind.turnVane(ent) : o.force || !ent ? await f.wind.turn(id) : false;
    return { ok, state: f.wind.debugState() };
  });
  /** LQ_DEBUG.windLive(): the live arrows as rows ('.' none, ^ > v <), for a test to compare with the map. */
  D.register('windLive', () => {
    const f = cur();
    if (!f || !f.wind.active) return null;
    const m = f.wind.m, A = live(m, f.wind.mask), rows = [];
    for (let y = 0; y < m.H; y++) { let s = ''; for (let x = 0; x < m.W; x++) s += A[y * m.W + x] < 0 ? '.' : '^>v<'[A[y * m.W + x]]; rows.push(s); }
    return rows;
  });
}
