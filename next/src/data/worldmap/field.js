// The map stones (waystones) on the field (issue #97, WORLD_MAP_PLAN 2.3 item 4). Part of the lazy `worldmap` pack: nothing
// in a core file imports this module, and no map module is edited.
//
// A stone is an event of the pack's own type `worldmap_stone` at a cell of data.js STONES. attach(field) wraps this field's
// glass.reset (the field calls it right after building a map's entities, on every map load) so the stones of the new map
// join its entities there, the way Episode 4's attach wraps the same seam (src/data/ep4/field/events.js). A field already
// standing on a stone map when the pack comes up gets its stones at once (addStones). Interact: the map screen, view only.
// The stone is drawn lit while the party stands within two cells of it (the wrapped glass.update reads that per frame).

import { EXT, INTERACT_TYPES } from '../../world/events.js';
import { STONES } from './data.js';

export const TYPE = 'worldmap_stone';
export const NEAR = 2;   // cells: the rune lights within this distance of the leader

INTERACT_TYPES.add(TYPE);
EXT[TYPE] = {
  create(field, ent) {
    const map = field.map;
    if (!map || !map.db || !map.db.objects || !map.db.objects[TYPE]) return;
    ent.prop = map.addProp({ t: TYPE, x: ent.x, y: ent.y, state: 0, id: ent.id, kind: 'event', solid: true });
  },
  interact: (field) => openMap(field.engine, { from: 'stone' }),
};

/** Push the map screen (the pack registered it) and wait for it to close. Resolves false when it is not there. */
export async function openMap(engine, data = {}) {
  if (!engine || typeof engine.hasScene !== 'function' || !engine.hasScene('worldmap')) return false;
  await engine.pushAwait('worldmap', { from: data.from || 'menu' });
  return true;
}

/** The stones of the field's current map, added to its entities once each (idempotent). Returns how many were added. */
export function addStones(field) {
  const list = field && field.map ? STONES[field.mapId] : null;
  if (!list || !field.entities || !field.byTile) return 0;
  const objs = field.map.db && field.map.db.objects;
  if (!objs || !objs[TYPE]) return 0;            // the pack's tile fragment is not merged yet: the pack-ready hook adds them
  let n = 0;
  for (const s of list) {
    if (field.entities.has(s.id)) continue;
    const ev = { id: s.id, type: TYPE, x: s.x, y: s.y };
    const ent = { ev, id: s.id, type: TYPE, x: s.x, y: s.y, cells: [[s.x, s.y]], prop: null, actor: null, state: null, present: true, data: {} };
    field.entities.set(ent.id, ent);
    const k = `${s.x},${s.y}`;
    if (!field.byTile.has(k)) field.byTile.set(k, []);
    field.byTile.get(k).push(ent);
    EXT[TYPE].create(field, ent);
    n++;
  }
  return n;
}

/** Light the rune of every stone near the leader (frame 1), dim the rest (frame 0). Cheap: a map has two stones at most. */
export function syncStones(field) {
  const list = field && field.map ? STONES[field.mapId] : null;
  const L = field && field.leader;
  if (!list || !L || !field.entities) return;
  for (const s of list) {
    const ent = field.entities.get(s.id);
    if (!ent || !ent.prop) continue;
    const want = Math.abs(L.tx - s.x) + Math.abs(L.ty - s.y) <= NEAR ? 1 : 0;
    if (ent.prop.state !== want) field.map.setPropState(ent.prop, want);
  }
}

/** Wrap this field's glass.reset (stones join each new map) and glass.update (the rune lights). Idempotent per field. */
export function attach(field) {
  if (!field || field.wmStones || !field.glass) return false;
  field.wmStones = true;
  const g = field.glass;
  const reset = g.reset.bind(g), update = typeof g.update === 'function' ? g.update.bind(g) : null;
  g.reset = (...a) => { addStones(field); return reset(...a); };
  if (update) g.update = (...a) => { syncStones(field); return update(...a); };
  if (field.map && !field.loading) addStones(field);
  return true;
}
