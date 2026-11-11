// The ep6 pack's map registry (E6-pack; docs/EPISODE6_PLAN.md 2.1, 3 and 13). index.js runs register() after `pages` and before
// `hooks`; it also calls prefetch() at the very start of the pack, so the map files download while the ep5 pack comes up.
//
// The order trap (plan 3.3): registerMap() overwrites by id and the ep5 pack registers `ep5_sh_inn` and `ep5_saffron` itself
// (after awaiting ep4 for its own patches), so a patch registered first would be replaced and lost without a word. register()
// therefore awaits the ep5 maps registry's own register() FIRST, then reads the registered modules back with peekMap() and
// registers the patched ones (ep6_patches.js, E6-maps-a: withEp6Wake(ep5_sh_inn), withSkyBerth(ep5_saffron); identity while
// that file does not exist). Every Episode 5 event and mark stays; the patch only adds.
//
// The eleven Episode 6 maps are a fixed, guarded list: a map module that does not exist yet (wave 6c writes them) is skipped
// and reported, so the map agents only create files this list already names.
import { registerMap, peekMap } from '../../world/maps.js';
import { storedAll } from '../../game/packs.js';
import { isMissing } from '../ep4/index.js';

export const EP6_MAP_IDS = ['ep6_airstair', 'ep6_zephyr', 'ep6_zl_inn', 'ep6_zl_shop', 'ep6_zl_workshop', 'ep6_zl_charts',
  'ep6_obs_f1', 'ep6_obs_f2', 'ep6_obs_f3', 'ep6_obs_eyrie', 'ep6_library'];
/** Episode 5 map id -> the patch export of ep6_patches.js that edits it. */
export const PATCHES = { ep5_sh_inn: 'withEp6Wake', ep5_saffron: 'withSkyBerth', ep5_sh_observatory: 'withObsWake' };   // the last: issue #99
export const PATCH_FILE = '../maps/ep6_patches.js';
const FILES = [...EP6_MAP_IDS.map((id) => `../maps/${id}.js`), PATCH_FILE];

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
 * In the browser, fetch every map file at once before importing any (the ep4 rule, E4-integrate): a network failure throws, so
 * the pack fails and ensurePack retries, instead of a failed import() that the page caches for its life. A 404 is a map that
 * is not written yet: it is skipped without an import. Node and tests (opts.importer) skip the fetch. Memoized; resolves the
 * Set of files that answered 404.
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
      else if (!r.ok) throw new Error(`[ep6] ${f}: ${r.status}`);
    })).then(() => absent))).catch((e) => { fetched = null; throw e; });
  }
  return fetched;
}

async function run(opts) {
  const absent = await prefetch(opts);
  const importer = opts.importer || ((p) => import(p));
  // 1. the ep5 maps first (they own ep5_sh_inn and ep5_saffron; ep5's registry awaits ep4's, which awaits ep3). Idempotent.
  const ep5 = await importer('../ep5/maps.js');
  if (ep5 && typeof ep5.register === 'function') await ep5.register();
  // 2. the eleven maps (imported at once, registered in list order)
  const loaded = [], skipped = [];
  const got = await Promise.all(EP6_MAP_IDS.map((id) => imp(`../maps/${id}.js`, importer, absent)));
  EP6_MAP_IDS.forEach((id, i) => {
    const mod = got[i] && (got[i].default || got[i].map);
    if (mod && mod.id) { registerMap(mod); loaded.push(id); } else skipped.push(id);
  });
  // 3. the patches, onto the modules the ep5 pack registered
  const P = (await imp(PATCH_FILE, importer, absent)) || {};
  const patched = [];
  for (const [id, name] of Object.entries(PATCHES)) if (applyPatch(id, P[name] || identity)) patched.push(id);
  report = { loaded, skipped, patched, patchFile: Object.values(PATCHES).some((n) => typeof P[n] === 'function') };
  return report;
}

/** Register the maps and the patches. Idempotent. Resolves { loaded, skipped, patched, patchFile }. opts.importer: tests. */
export function register(engine, mods, opts = {}) {
  if (!done) done = run(opts).catch((e) => { done = null; throw e; });
  return done;
}

/** The last register() result, or null (tests and tools). */
export function mapReport() { return report; }

export default register;
