// The ep5 pack's map registry (E5-pack; docs/EPISODE5_PLAN.md 2.1, 3 and 13). index.js runs register() after `pages` and before
// `hooks`; it also calls prefetch() at the very start of the pack, so the map files download while the ep4 pack comes up.
//
// The order trap (plan 3.3): registerMap() overwrites by id and the ep4 pack registers `ep4_vw_inn` and `ep4_valewyn` itself
// (after awaiting ep3 for its own patches), so a patch registered first would be replaced and lost without a word. register()
// therefore awaits the ep4 maps registry's own register() FIRST, then reads the registered modules back with peekMap() and
// registers the patched ones (ep5_patches.js, E5-maps-a: withEp5Wake(ep4_vw_inn), withShipBerth(ep4_valewyn); identity while
// that file does not exist). Every Episode 4 event and mark stays; the patch only adds.
//
// The eleven Episode 5 maps are a fixed, guarded list: a map module that does not exist yet (wave 5c writes them) is skipped
// and reported, so the map agents only create files this list already names.
import { registerMap, peekMap } from '../../world/maps.js';
import { storedAll } from '../../game/packs.js';
import { isMissing } from '../ep4/index.js';

export const EP5_MAP_IDS = ['ep5_ship', 'ep5_caravan_road', 'ep5_saffron', 'ep5_sh_inn', 'ep5_sh_shop', 'ep5_sh_smithy',
  'ep5_sh_observatory', 'ep5_lab_f1', 'ep5_lab_f2', 'ep5_lab_f3', 'ep5_lab_oracle'];
/** Episode 4 map id -> the patch export of ep5_patches.js that edits it. */
export const PATCHES = { ep4_vw_inn: 'withEp5Wake', ep4_valewyn: 'withShipBerth' };
export const PATCH_FILE = '../maps/ep5_patches.js';
const FILES = [...EP5_MAP_IDS.map((id) => `../maps/${id}.js`), PATCH_FILE];

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
      else if (!r.ok) throw new Error(`[ep5] ${f}: ${r.status}`);
    })).then(() => absent))).catch((e) => { fetched = null; throw e; });
  }
  return fetched;
}

async function run(opts) {
  const absent = await prefetch(opts);
  const importer = opts.importer || ((p) => import(p));
  // 1. the ep4 maps first (they own ep4_vw_inn and ep4_valewyn; ep4's registry awaits ep3 itself). Idempotent.
  const ep4 = await importer('../ep4/maps.js');
  if (ep4 && typeof ep4.register === 'function') await ep4.register();
  // 2. the eleven maps (imported at once, registered in list order)
  const loaded = [], skipped = [];
  const got = await Promise.all(EP5_MAP_IDS.map((id) => imp(`../maps/${id}.js`, importer, absent)));
  EP5_MAP_IDS.forEach((id, i) => {
    const mod = got[i] && (got[i].default || got[i].map);
    if (mod && mod.id) { registerMap(mod); loaded.push(id); } else skipped.push(id);
  });
  // 3. the patches, onto the modules the ep4 pack registered
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
