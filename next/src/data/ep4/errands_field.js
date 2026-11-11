// Penny's travelling cart on the field (issue #100, errands.js MERCHANT). Part of the lazy ep4 pack; imported by errands.js
// register(engine) only, never by a core file. No map module is edited: attach(field) wraps this field's glass.reset (the
// field calls it right after building a map's entities, on every map load), and the cart's NPC event joins the entities of a
// stop map there, the way the worldmap pack's stones and Episode 4's tide attach to the same seam. The event carries the stop's
// flags (if: this stop, ifNot: the next), so the field's own refresh shows and hides her as flags change.

import { refreshEntities } from '../../world/events.js';
import { MERCHANT } from './errands.js';

/** The NPC events Penny may stand on for a map id: [ev] (one per stop on that map). Pure. */
export function merchantEvents(mapId) {
  const out = [];
  MERCHANT.stops.forEach((s, i) => {
    if (s.map !== mapId) return;
    const next = MERCHANT.stops[i + 1];
    out.push({ type: 'npc', id: MERCHANT.id, x: s.x, y: s.y, dir: s.dir, if: s.flag, ...(next ? { ifNot: next.flag } : {}) });
  });
  return out;
}

/** Add the cart's event to the field's current map once (idempotent). Returns how many were added. */
export function addMerchant(field) {
  if (!field || !field.map || !field.entities || !field.byTile) return 0;
  let added = 0;
  for (const ev of merchantEvents(field.mapId)) {
    if (field.entities.has(ev.id)) continue;
    const ent = { ev, id: ev.id, type: 'npc', x: ev.x, y: ev.y, cells: [[ev.x, ev.y]], prop: null, actor: null, state: null, present: false, data: {} };
    field.entities.set(ent.id, ent);
    const k = `${ev.x},${ev.y}`;
    if (!field.byTile.has(k)) field.byTile.set(k, []);
    field.byTile.get(k).push(ent);
    added++;
  }
  if (added) refreshEntities(field);   // creates her actor when the stop's flags hold
  return added;
}

/** Wrap this field's glass.reset so the cart joins each new map. Idempotent per field. */
export function attach(field) {
  if (!field || field.xrMerchant || !field.glass) return false;
  field.xrMerchant = true;
  const g = field.glass;
  const reset = g.reset.bind(g);
  g.reset = (...a) => { addMerchant(field); return reset(...a); };
  if (field.map && !field.loading) addMerchant(field);
  return true;
}
