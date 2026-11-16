// The ep8 pack's map registry (E8-pack; docs/EPISODE8_PLAN.md 2.1, 3 and 13). index.js runs register() after `pages` and before
// `hooks`; it also calls prefetch() at the very start of the pack, so the map files download while the ep7 pack comes up.
//
// The order trap (plan 3.3): registerMap() overwrites by id and the ep7 pack registers `ep7_ph_watch` and `ep7_stillheart`
// itself (after awaiting ep6 for its own patches), so a patch registered first would be replaced and lost without a word.
// register() therefore awaits the ep7 maps registry's own register() FIRST, then reads the registered modules back with
// peekMap() and registers the patched ones (ep8_patches.js, E8-maps-a: withEp8Wake(ep7_ph_watch), withStairDoor(ep7_stillheart);
// identity while that file or an export does not exist). Every Episode 7 event and mark stays; a patch only adds.
//
// The eleven Episode 8 maps are a fixed, guarded list: a map module that does not exist yet (wave 8c writes them) is skipped
// and reported, so the map agents only create files this list already names. Every fetch starts at once; only the
// registration is ordered.
import { registerMap, peekMap } from '../../world/maps.js';
import { storedAll } from '../../game/packs.js';
import { isMissing } from '../ep4/index.js';
import hero_home from '../maps/hero_home.js';

export const EP8_MAP_IDS = ['ep8_stair', 'ep8_scriptorium', 'ep8_sc_inn', 'ep8_sc_shop', 'ep8_sc_atelier', 'ep8_sc_index',
  'ep8_library_f1', 'ep8_library_f2', 'ep8_library_f3', 'ep8_last_word', 'ep8_bell_night'];
/** Episode 7 map id -> the patch export of ep8_patches.js that edits it (plan 3: 1 and 2). */
export const PATCHES = { ep7_ph_watch: 'withEp8Wake', ep7_stillheart: 'withStairDoor' };
/**
 * Core map id -> [the module, the patch export] (E8-fixes: home's reload at the door). Not in the pack's `touches`, for the
 * reason ep7/maps.js gives for CORE_PATCHES: the field would hold every Episode 1 player at hero_home's door for this pack.
 * Registered over the core module (or what a pack registered for it), so loadMap finds it once this pack is up.
 */
export const CORE_PATCHES = { hero_home: [hero_home, 'withHomeDoor'] };
export const PATCH_FILE = '../maps/ep8_patches.js';
const FILES = [...EP8_MAP_IDS.map((id) => `../maps/${id}.js`), PATCH_FILE];

const identity = (m) => m;
let done = null;
let fetched = null;
let report = null;

async function imp(file, importer, absent) {
  if (absent && absent.has(file)) return null;
  try { return await importer(file); }
  catch (e) { if (isMissing(e, file.slice(file.lastIndexOf('/')))) return null; throw e; }
}

/**
 * Patch one registered map (pure apart from registerMap): read it with peekMap, apply the patch, register the result.
 * Returns true when a patched module was registered.
 */
export function applyPatch(id, patch) {
  const base = peekMap(id);
  if (!base || typeof patch !== 'function') return false;
  const out = patch(base);
  if (!out || out === base) return false;
  registerMap(out);
  return true;
}

/**
 * In the browser, fetch every map file at once before importing any (the ep4 rule): a network failure throws, so the pack fails
 * and ensurePack retries, instead of a failed import() that the page caches for its life. A 404 is a map that is not written
 * yet: it is skipped without an import. Node and tests (opts.importer) skip the fetch. Memoized; resolves the Set of 404 files.
 */
export function prefetch(opts = {}) {
  if (opts.importer || typeof fetch !== 'function' || !/^https?:/.test(import.meta.url)) return Promise.resolve(new Set());
  if (!fetched) {
    const absent = new Set();
    const hrefs = FILES.map((f) => new URL(f, import.meta.url).href);
    // every map already in the worker's cache (packs.js storedAll): no fetch, and none can be a 404
    fetched = storedAll(hrefs).then((all) => (all ? absent : Promise.all(FILES.map(async (f, i) => {
      const r = await fetch(hrefs[i]);
      if (r.status === 404) absent.add(f);
      else if (!r.ok) throw new Error(`[ep8] ${f}: ${r.status}`);
    })).then(() => absent))).catch((e) => { fetched = null; throw e; });
  }
  return fetched;
}

async function run(opts) {
  const absent = await prefetch(opts);
  const importer = opts.importer || ((p) => import(p));
  // the eleven maps and the patch file start importing now (they read nothing registered); only registration waits below
  const mapsP = Promise.all(EP8_MAP_IDS.map((id) => imp(`../maps/${id}.js`, importer, absent)));
  const patchP = imp(PATCH_FILE, importer, absent);
  mapsP.catch(() => {}); patchP.catch(() => {});
  // 1. the ep7 maps first (they own ep7_ph_watch and ep7_stillheart; ep7's registry awaits ep6's, and so on). Idempotent.
  const ep7 = await importer('../ep7/maps.js');
  if (ep7 && typeof ep7.register === 'function') await ep7.register();
  // 2. the eleven maps, registered in list order
  const loaded = [], skipped = [];
  const got = await mapsP;
  EP8_MAP_IDS.forEach((id, i) => {
    const mod = got[i] && (got[i].default || got[i].map);
    if (mod && mod.id) { registerMap(mod); loaded.push(id); } else skipped.push(id);
  });
  // 3. the patches, onto the modules the ep7 pack registered
  const P = (await patchP) || {};
  const patched = [];
  for (const [id, name] of Object.entries(PATCHES)) if (applyPatch(id, P[name] || identity)) patched.push(id);
  const patchedCore = [];
  for (const [id, [mod, name]] of Object.entries(CORE_PATCHES)) {
    const base = peekMap(id) || mod, out = typeof P[name] === 'function' ? P[name](base) : base;
    if (out && out !== base) { registerMap(out); patchedCore.push(id); }
  }
  report = { loaded, skipped, patched, patchedCore, patchFile: Object.values(PATCHES).some((n) => typeof P[n] === 'function') };
  return report;
}

/** Register the maps and the patches. Idempotent. Resolves { loaded, skipped, patched, patchedCore, patchFile }. opts.importer: tests. */
export function register(engine, mods, opts = {}) {
  if (!done) done = run(opts).catch((e) => { done = null; throw e; });
  return done;
}

/** The last register() result, or null (tests and tools). */
export function mapReport() { return report; }

export default register;
