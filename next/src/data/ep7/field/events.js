// Episode 7's field event type and the name stone system's attachment (E7-world, docs/EPISODE7_PLAN.md 4.5 and 5.1).
// Imported by ../world.js when the ep7 pack registers; never in the first download.
//
//   namestone  { stone: 'a' (a letter of the map's remember.paths / frost), name: '<text key>' (the float line),
//                sprite?: 'namestone' outdoors (field, town) | 'name_plate' indoors (dungeon, interior),
//                lantern?: true (in Keeper ink: faint and unreadable until the Lantern finds it, the Episode 1 rule) }
//              Solid, on ground, faced from ground. Confirm reads it (./remember.js). Two cairns with one letter are one stone.
//
// attach(field) is idempotent per field instance: it adds field.stones and wraps this field's glass.reset / update /
// drawBeams (the stone layer under the actors) / drawFlares (the aurora, under the roof decals), lighting.draw (the float line over the light), canStep (enemies and NPCs
// never stand on a path or frost cell), collectLights (a lamp pool over every held stone on a dark map), hiddenInkNear (the
// Lantern hint knows stones in Keeper ink) and debugState, the way Episodes 5 and 6 attach. EXT.namestone.create attaches
// first, and ../world.js attaches every field the engine enters (a map with a remember block and no stone of its own).
// Nothing here edits src/scenes/field.js.

import { EXT, INTERACT_TYPES } from '../../../world/events.js';
import { Stones } from './system.js';
import { ensureArt } from './art.js';
import { held } from './remember.js';

INTERACT_TYPES.add('namestone');

/** The cairn's art: its own `sprite`, else a cairn outdoors and an iceglass plate indoors. */
export function stoneSprite(field, ev) {
  if (ev && ev.sprite) return ev.sprite;
  const area = field && field.map && field.map.mod && field.map.mod.area;
  return area === 'dungeon' || area === 'interior' ? 'name_plate' : 'namestone';
}

EXT.namestone = {
  create(field, ent) {
    attach(field);
    const map = field.map;
    ensureArt(map.db, field.engine, map);
    const t = stoneSprite(field, ent.ev);
    if (!map.db.objects || !map.db.objects[t]) { field.warnOnce('ep7stone:' + t, `unknown object "${t}" (${ent.id})`); return; }
    ent.prop = map.addProp({ t, x: ent.x, y: ent.y, state: 0, id: ent.id, kind: 'event', solid: true });
  },
  interact: (field, ent) => (field.stones ? field.stones.readCairn(ent) : null),
};

export function attach(field) {
  if (!field || field.stones) return field && field.stones;
  const s = field.stones = new Stones(field);
  const wrap = (obj, name, fn) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].ep7) return null;
    const orig = obj[name].bind(obj);
    const f = function (...a) { return fn(orig, ...a); };
    f.ep7 = true;
    obj[name] = f;
    return orig;
  };
  wrap(field.glass, 'reset', (o) => { o(); s.reset(); });
  wrap(field.glass, 'update', (o) => { o(); s.update(); });
  wrap(field.glass, 'drawBeams', (o, r, t) => { s.drawLow(r, t); o(r, t); });
  wrap(field.glass, 'drawFlares', (o, r, t) => { o(r, t); s.drawAurora(r); });
  // the float line goes over the lighting (it must read on the white fade and in F2's dark alike)
  wrap(field.lighting, 'draw', (o, r, cam, lights, lanternAt) => { o(r, cam, lights, lanternAt); s.drawLine(r, cam); });
  wrap(field, 'canStep', (o, actor, x, y, nx, ny, dir) => (s.mayEnter(actor, nx, ny) ? o(actor, x, y, nx, ny, dir) : false));
  wrap(field, 'collectLights', (o) => { const out = o(); return s.active ? out.concat(s.lights()) : out; });
  wrap(field, 'hiddenInkNear', (o) => o() || s.inkNear());
  wrap(field, 'debugState', (o) => ({ ...o(), stones: s.debugState() }));
  installDebug(field);
  return s;
}

function installDebug(field) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || !D.commands || D.commands().includes('stones')) return;
  const cur = () => { const e = field.engine, f = e && (e.stack || []).find((sc) => sc && sc.name === 'field'); return f && f.stones ? f : null; };
  D.register('stones', () => { const f = cur(); return f ? f.stones.debugState() : null; });
  /** LQ_DEBUG.readStone(cairnIdOrLetter): as confirm on that cairn would (the first cairn of a letter). Resolves the state. */
  D.register('readStone', async (id) => {
    const f = cur();
    if (!f || !f.stones.active) return null;
    let ent = f.entities.get(id);
    if (!ent || ent.type !== 'namestone') { const c = f.stones.m.cairns.find((k) => k.stone === String(id).toLowerCase()); ent = c ? f.entities.get(c.id) : null; }
    const ok = ent ? await f.stones.readCairn(ent) : false;
    return { ok, state: f.stones.debugState() };
  });
  /** LQ_DEBUG.holdStones(['a', 'b']): set the holds directly, oldest first (a lab's framing; no sound, no animation). */
  D.register('holdStones', (order) => { const f = cur(); return f ? f.stones.setHeld(order || []) : null; });
  /** LQ_DEBUG.stonesOpen(): the walkable rule cells as rows ('.' none, 'o' open path, '#' solid frost, '_' fade, '~' melted). */
  D.register('stonesOpen', () => {
    const f = cur();
    if (!f || !f.stones.active) return null;
    const S = f.stones, m = S.m, rows = [];
    for (let y = 0; y < m.H; y++) {
      let r = '';
      for (let x = 0; x < m.W; x++) {
        const i = y * m.W + x;
        if (m.owner[i] >= 0) r += S.codeFor(i) === 'none' ? 'o' : '_';
        else if (m.frostOwner[i] >= 0) r += S.codeFor(i) === 'solid' ? '#' : '~';
        else r += '.';
      }
      rows.push(r);
    }
    return { rows, held: held(m, S.state) };
  });
}
