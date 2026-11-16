// The solo map contract (EPISODE8_PLAN 4.9, STAGING_EP8 section 2): a map whose module says `party: 'solo'` (ep8_bell_night,
// the cold open's climb played again) shows the leader alone. The followers are taken off the field after every
// rebuildParty on such a map; game.party is never touched, so the save, the menu and the next map's party are the whole
// party again (loadMap removes every actor and rebuildParty makes the followers fresh on the next map). Pack code: the
// field scene is not edited. ./events.js attach(field) wraps rebuildParty with soloWrap.
// Never in the first download (the ep8 pack).

/** Is this map solo? */
export const isSolo = (mod) => !!(mod && mod.party === 'solo');

/** Take the followers off the field when its map is solo. Returns how many were hidden. */
export function soloParty(field) {
  if (!field || !field.map || !isSolo(field.map.mod)) return 0;
  const list = field.followers || [];
  if (!list.length) return 0;
  for (const f of list) if (typeof field.removeActor === 'function') field.removeActor(f);
  const n = list.length;
  field.followers = [];
  return n;
}

/** Wrap a field's rebuildParty once (idempotent) so a solo map never keeps followers; applies at once to the map it is on. */
export function soloWrap(field) {
  if (!field || typeof field.rebuildParty !== 'function') return false;
  if (!field.rebuildParty.ep8solo) {
    const orig = field.rebuildParty.bind(field);
    const w = function (...a) { const r = orig(...a); soloParty(field); return r; };
    w.ep8solo = true;
    field.rebuildParty = w;
  }
  soloParty(field);
  return true;
}
