// Map module loader: real maps from src/data/maps/<id>.js (W2-maps), scratch maps from ./_testmap.js.
//
//   const mod = await loadMap('willowmere');     // null when no such map exists anywhere
//   registerMap(mod)                             // tests and tools can add modules at runtime
//
// A missing real map is probed with one dynamic import (cached, so each id costs at most one request).
//
// Pack guard (XP-packs, docs/PWA_PACKS.md): a map id that starts with a pack prefix (x1_downs), or that a pack edits (its
// `touches` list: valley, willowmere ...), first asks ensurePack(pack) and waits for it for at most 1.5 s.
//   - a prefixed map whose pack is enabled but did not load in time resolves null: the door that leads there only exists once
//     the pack is ready, so this is "not reachable", never an error;
//   - a touched map loads unpatched (the pack's edits are gated by x1On()/x2On(), false until the pack is ready) and is rebuilt:
//     when the pack becomes ready every touched map already in the cache is marked stale, and the next loadMap of it re-imports
//     the module under a new version query (`?v=n`; the service worker ignores the query), so the next transition shows the
//     patched version. peekMap keeps answering with the old module until the new one replaces it.
// While a pack's switch is off (X1_LIVE / X2_LIVE false) the guard does nothing and loadMap behaves exactly as before.

import { TEST_MAPS } from './_testmap.js';
import { PACKS, packForMap, packEnabled, packReady, ensurePack, onPackReady, GUARD_MS } from '../game/packs.js';

const cache = new Map();
const extra = new Map();
const stale = new Set();        // touched maps cached before their pack was ready
const fails = new Map();        // id -> failed imports (the browser caches a failed import: a retry needs a new URL)
const versions = new Map();     // map id -> re-import counter (the ?v= query)
let hooked = false;

export function registerMap(mod) { if (mod && mod.id) extra.set(mod.id, mod); }
export function knownTestMaps() { return Object.keys(TEST_MAPS); }

function hook() {
  if (hooked) return;
  hooked = true;
  for (const id of Object.keys(PACKS)) {
    onPackReady(id, () => { for (const m of PACKS[id].touches) if (cache.has(m)) stale.add(m); });
  }
}

/** Wait (at most GUARD_MS) for the pack a map needs. Resolves immediately when no pack is involved or it is ready. */
async function guard(id) {
  const hit = packForMap(id);
  if (!hit || !packEnabled(hit.id) || packReady(hit.id)) return hit;
  await new Promise((resolve) => {
    const t = setTimeout(resolve, GUARD_MS);
    ensurePack(hit.id).then(() => { clearTimeout(t); resolve(); });
  });
  return hit;
}

export async function loadMap(id) {
  if (!id) return null;
  if (extra.has(id)) return extra.get(id);
  hook();
  const hit = packForMap(id);
  const needs = hit && packEnabled(hit.id) && !packReady(hit.id);
  if (needs) await guard(id);
  if (hit && hit.prefixed && packEnabled(hit.id) && !packReady(hit.id)) return null;   // the pack never arrived: no such place
  if (cache.has(id) && !stale.has(id)) return cache.get(id);
  let mod = null;
  if (/^[a-z0-9_]+$/i.test(id) && !id.startsWith('_')) {
    try {
      const v = (stale.has(id) ? (versions.get(id) || 0) + 1 : (versions.get(id) || 0)) + 1000 * (fails.get(id) || 0);
      const m = await import(v ? `../data/maps/${id}.js?v=${v}` : `../data/maps/${id}.js`);
      if (stale.has(id)) { stale.delete(id); versions.set(id, v); }
      mod = m.default || m.map || null;
      if (mod && !mod.id) mod.id = id;
    } catch (e) {
      mod = null;
      fails.set(id, (fails.get(id) || 0) + 1);
      if (stale.has(id) && cache.get(id)) { stale.delete(id); return cache.get(id); }   // the rebuild failed: keep what we had
    }
  }
  if (!mod) mod = TEST_MAPS[id] || null;
  if (!mod && hit && hit.prefixed) return null;   // not cached: the next visit tries again
  cache.set(id, mod);
  return mod;
}

/** Synchronous lookup of a map that has already been loaded or registered. */
export function peekMap(id) { return extra.get(id) || cache.get(id) || TEST_MAPS[id] || null; }

/** Tests: the touched maps waiting for a rebuild. */
export function staleMaps() { return [...stale]; }
