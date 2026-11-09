// Episode 5's field event types and the shade system's attachment (E5-world, docs/EPISODE5_PLAN.md 5.1).
// Imported by ../world.js when the ep5 pack registers; never in the first download.
//
//   sundial     { free? (false: needs the gnomon), sprite? ('sundial'), lockedText? }       confirm: Dawn / Noon / Dusk
//   standstone  { h? (2; 1 low block, 2 standing stone, 3 obelisk), shove?, push?, sprite? }  a caster; solid
//   window      { faces ('west' | 'east' | 'north' | 'south' | 'down'), hours, reach? (12), lanes? (1), sprite? }
//   lampcart    { r? (3), shove?, push?, sprite? ('lamp_cart') }                              a light; solid
//   sunplate    { when ('lit' | 'shade'), latch?, flag?, script?, target?, sprite? ('sun_plate') }   a gate source
//
// attach(field) is idempotent per field instance: it adds field.shade and wraps this field's glass.reset / update /
// drawBeams, collectLights, setFlag (the hour keeps its tint), syncTimeOfDay (the tint on arrival), tryLeaderStep (`push`),
// hasFlag (`hour:<name>`), debugState, and the field's abilities.resolve / shove (Bram's Shove reaches stones and lamps),
// the way Episode 4's tide attaches (src/data/ep4/field/events.js). Every create() above attaches first, and ../world.js
// attaches every field the engine enters, so the battle sky hears the hour of every map.

import { EXT, INTERACT_TYPES, GATE_SPRITES, SOURCE_TYPES, entitiesAt } from '../../../world/events.js';
import { DIRS } from '../../../world/pathfind.js';
import { Shade, isHourFlag } from './system.js';
import { compile, DIAL_HOURS } from './shade.js';
import { ensureArt, STONE_SPRITE } from './art.js';

Object.assign(GATE_SPRITES, {
  sun_gate: GATE_SPRITES.sun_gate || ['sun_gate_closed', 'sun_gate_open'],
  moon_gate: GATE_SPRITES.moon_gate || ['moon_gate_closed', 'moon_gate_open'],
  // E5-tiles' Labyrinth doors (E5-integrate): the Sun Keyhole (3 wide, door_boss style) and the one-cell sandstone door
  sun_keyhole: GATE_SPRITES.sun_keyhole || ['sun_keyhole_closed', 'sun_keyhole_open'],
  door_dune: GATE_SPRITES.door_dune || ['door_dune_closed', 'door_dune_open'],
});
INTERACT_TYPES.add('sundial');
SOURCE_TYPES.add('sunplate');

const MOVERS = new Set(['standstone', 'lampcart']);

const prop = (field, ent, t, state, solid) => {
  const map = field.map;
  ensureArt(map.db, field.engine, map);
  if (!t || !map.db.objects || !map.db.objects[t]) { field.warnOnce('ep5prop:' + t, `unknown object "${t}" (${ent.id})`); return null; }
  const p = map.addProp({ t, x: ent.x, y: ent.y, state: state || 0, id: ent.id, kind: 'event', solid });
  ent.prop = p;
  return p;
};
const hourIndex = (field) => {
  const s = field.shade, m = compile(field.map.mod);
  const h = s && s.active && s.mapRef === field.map ? s.hour : m ? m.hour : 'noon';
  return Math.max(0, DIAL_HOURS.indexOf(h));
};

EXT.sundial = {
  create(field, ent) { attach(field); prop(field, ent, ent.ev.sprite || 'sundial', hourIndex(field)); },
  interact: (field, ent) => (field.shade ? field.shade.chooseHour(ent) : null),
};
EXT.standstone = {
  create(field, ent) {
    attach(field);
    const h = Math.max(1, Math.min(3, ent.ev.h == null ? 2 : ent.ev.h | 0));
    prop(field, ent, ent.ev.sprite || STONE_SPRITE[h], 0);
  },
};
EXT.lampcart = {
  create(field, ent) { attach(field); prop(field, ent, ent.ev.sprite || 'lamp_cart', 0); },
};
EXT.window = {
  create(field, ent) {
    attach(field);
    const m = compile(field.map.mod), rec = m && m.byId.get(ent.id);
    const s = field.shade, h = s && s.active && s.mapRef === field.map ? s.hour : m ? m.hour : null;
    prop(field, ent, ent.ev.sprite || 'window_horizon', rec && rec.hours.has(h) ? 1 : 0, false);
  },
};
EXT.sunplate = {
  create(field, ent) {
    attach(field);
    ent.state = 'off';
    prop(field, ent, ent.ev.sprite || 'sun_plate', ent.ev.when === 'shade' ? 2 : 0, false);
  },
};

/** How much of a field foe's own colour comes back over the night or dusk tint (0 = fully tinted, 1 = untinted). */
export const FOE_LIFT = 0.55;
const LIFT_TINTS = new Set(['night', 'dusk']);
/**
 * On an Episode 5 map under the night or dusk tint, every field foe on screen is drawn once more after the lighting at
 * FOE_LIFT alpha, so its dark outline and side-coded rim (gold sun, pale blue star) keep their contrast instead of sinking
 * into a silhouette; the foe still sits in the scene's light. Day tints and other episodes' maps are untouched.
 */
function liftFoes(field, r, cam) {
  const map = field.map, Lt = field.lighting;
  if (!map || !/^ep5_/.test(map.id || '') || !Lt || !LIFT_TINTS.has(Lt.tintName)) return;
  let pushed = false;
  for (const a of field.actors) {
    if (!a.visible || !a.spr || a.spr.kind !== 'enemy' || !cam.visible(a.px - 8, a.py - 24, 32, 40, 8)) continue;
    if (!pushed) { r.pushCamera(cam.x, cam.y); pushed = true; }
    const was = a.alpha;
    a.alpha = (was == null ? 1 : was) * FOE_LIFT;
    try { a.draw(r, field.time, { shadow: false }); } finally { a.alpha = was; }
  }
  if (pushed) r.popCamera();
}

/**
 * Props whose object lists `shiftFrames` (the Haven's waystone, E5-tiles): while the tint is dusk or night their state steps
 * through those frames about every 200 ms (the carved names blur and settle); by day they rest on the first. A prop in a
 * state outside the list (the still waystone, frame 3) is left alone. The list is cached per map.
 */
function shiftGlyphs(field) {
  const map = field.map;
  if (!map || !map.props || (field.frame | 0) % 12) return;
  if (field._shiftMap !== map) {
    field._shiftMap = map;
    const objs = (map.db && map.db.objects) || {};
    field._shiftProps = map.props.filter((p) => objs[p.t] && Array.isArray(objs[p.t].shiftFrames) && objs[p.t].shiftFrames.includes(p.state));
  }
  if (!field._shiftProps.length) return;
  const t = field.lighting && field.lighting.tintName, dark = t === 'dusk' || t === 'night';
  for (const p of field._shiftProps) {
    const sf = map.db.objects[p.t].shiftFrames, k = sf.indexOf(p.state);
    if (k < 0) continue;
    const want = dark ? sf[(k + 1) % sf.length] : sf[0];
    if (want !== p.state) map.setPropState(p, want);
  }
}

/** The stone or lamp the leader faces, if Bram's Shove can work on it (`shove: true`), else null. */
function facedMover(field) {
  const L = field.leader;
  if (!L || !field.shade || !field.shade.active) return null;
  const [dx, dy] = DIRS[L.dir];
  const x = L.tx + dx, y = L.ty + dy;
  return entitiesAt(field, x, y).find((e) => e.present && MOVERS.has(e.type) && e.ev.shove) || null;
}

export function attach(field) {
  if (!field || field.shade) return field && field.shade;
  const s = field.shade = new Shade(field);
  const wrap = (obj, name, fn) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].ep5) return;
    const orig = obj[name].bind(obj);
    const w = function (...a) { return fn(orig, ...a); };
    w.ep5 = true;
    obj[name] = w;
  };
  wrap(field.glass, 'reset', (o) => { o(); s.reset(); });
  wrap(field.glass, 'update', (o) => { o(); s.update(); shiftGlyphs(field); });
  wrap(field.glass, 'drawBeams', (o, r, t) => { s.drawLow(r, t); o(r, t); });
  wrap(field, 'collectLights', (o) => { const out = o(); out.push(...s.lights()); return out; });
  // field foes stay readable under the night and dusk tints (E5-integrate; plan 9.2, CRITIQUE_6 C8): see liftFoes
  wrap(field.lighting, 'draw', (o, r, cam, lights, lanternAt) => { o(r, cam, lights, lanternAt); liftFoes(field, r, cam); });
  // the map's tint on arrival is the hour's (field.loadMap sets the map tint after glass.reset, then calls syncTimeOfDay)
  wrap(field, 'syncTimeOfDay', (o) => { if (s.tintPending) { s.tintPending = false; s.applyTint(0); } return o(); });
  // a flag set outside a scene re-reads the map tint: on a shade map the hour keeps its own
  wrap(field, 'setFlag', (o, flag, value) => {
    const Lt = field.lighting;
    const keep = Lt ? { tint: Lt.tint, tintName: Lt.tintName, tintFade: Lt.tintFade } : null;
    const r = o(flag, value);
    if (Lt && s.active && s.m.tintFollows && !field.inputLocked && !s.busy) {
      const want = s.hourTint();
      if (Lt.tintName !== want) {
        if (keep.tintName === want) { Lt.tint = keep.tint; Lt.tintName = keep.tintName; Lt.tintFade = keep.tintFade; }
        else Lt.setTint(want, 30);
      }
    }
    return r;
  });
  // `push: true` (Shove's fallback): walking into a stone or lamp slides it along its groove
  wrap(field, 'tryLeaderStep', (o, dir, dur) => {
    if (s.active && field.leader) {
      const [dx, dy] = DIRS[dir];
      const ent = entitiesAt(field, field.leader.tx + dx, field.leader.ty + dy).find((e) => e.present && MOVERS.has(e.type) && e.ev.push);
      if (ent) { field.leader.dir = dir; s.pushCaster(ent, dir); return false; }
    }
    return o(dir, dur);
  });
  wrap(field, 'hasFlag', (o, k) => (isHourFlag(k) ? s.hourFlag(k) : o(k)));
  if (field.map && field.map.hasFlag) field.map.hasFlag = field.hasFlag;
  wrap(field, 'debugState', (o) => ({ ...o(), shade: s.debugState() }));
  const ab = field.abilities;
  if (ab) {
    // a faced stone or lamp with `shove: true` is Bram's, first (as a heavy block is)
    wrap(ab, 'resolve', (o) => {
      const ent = ab.has && ab.has('shove') ? facedMover(field) : null;
      if (ent) return { id: 'shove', kind: 'heavy', target: ent, at: [ent.x, ent.y] };
      return o();
    });
    wrap(ab, 'shove', (o, c) => (c && c.target && MOVERS.has(c.target.type) ? s.shoveWith(ab, c) : o(c)));
  }
  // the leader's tile, for a scene that stages by where the party came in (ep5_morning: the guest room or the taproom)
  const api = field.cutscene && field.cutscene.api;
  if (api && !api.leaderAt) api.leaderAt = () => (field.leader ? [field.leader.tx, field.leader.ty] : null);
  installDebug(field);
  return s;
}

function installDebug(field) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || !D.commands || D.commands().includes('shade')) return;
  const cur = () => { const e = field.engine, f = e && (e.stack || []).find((sc) => sc && sc.name === 'field'); return f && f.shade ? f : null; };
  D.register('shade', () => { const f = cur(); return f ? f.shade.debugState() : null; });
  /** LQ_DEBUG.setHour('dawn'): as a dial would (the sweep included); resolves the shade state. */
  D.register('setHour', async (h) => {
    const f = cur();
    if (!f || !f.shade.active) return null;
    await f.shade.setHour(h);
    return f.shade.debugState();
  });
  /** LQ_DEBUG.shoveCaster(id, dir): Bram's Shove from wherever the party is (the rules as in play); resolves the verdict. */
  D.register('shoveCaster', async (id, dir) => {
    const f = cur(), ent = f && f.entities.get(id);
    if (!ent || !MOVERS.has(ent.type)) return null;
    const v = f.shade.canShove(ent, dir);
    if (v.ok) { f.lockInput(); try { await f.shade.moveCaster(ent, v.to, 22, ent.type === 'lampcart' ? 'lamp_roll' : 'block_push'); } finally { f.unlockInput(); } }
    return { ...v, state: f.shade.debugState() };
  });
}
