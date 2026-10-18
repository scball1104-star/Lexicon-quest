// Map module loader: real maps from src/data/maps/<id>.js (W2-maps), scratch maps from ./_testmap.js.
//
//   const mod = await loadMap('willowmere');     // null when no such map exists anywhere
//   registerMap(mod)                             // tests and tools can add modules at runtime
//
// A missing real map is probed with one dynamic import (cached, so each id costs at most one request).

import { TEST_MAPS } from './_testmap.js';

const cache = new Map();
const extra = new Map();

export function registerMap(mod) { if (mod && mod.id) extra.set(mod.id, mod); }
export function knownTestMaps() { return Object.keys(TEST_MAPS); }

export async function loadMap(id) {
  if (!id) return null;
  if (extra.has(id)) return extra.get(id);
  if (cache.has(id)) return cache.get(id);
  let mod = null;
  if (/^[a-z0-9_]+$/i.test(id) && !id.startsWith('_')) {
    try {
      const m = await import(`../data/maps/${id}.js`);
      mod = m.default || m.map || null;
      if (mod && !mod.id) mod.id = id;
    } catch (e) {
      mod = null;
    }
  }
  if (!mod) mod = TEST_MAPS[id] || null;
  cache.set(id, mod);
  return mod;
}

/** Synchronous lookup of a map that has already been loaded or registered. */
export function peekMap(id) { return extra.get(id) || cache.get(id) || TEST_MAPS[id] || null; }
