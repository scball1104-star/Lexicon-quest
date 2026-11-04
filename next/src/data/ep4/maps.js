// The ep4 pack's map registry (E4-pack; docs/EPISODE4_PLAN.md 2.1, 3 and 13). index.js runs register() after `world` (the
// field code the maps need) and before `hooks`.
//
// The order trap (plan 3.3): registerMap() overwrites by id and the ep3 pack registers `emberpeak` and `pk_inn` itself, so a
// patch registered first would be replaced and lost without a word. register() therefore awaits the ep3 pack's own register()
// FIRST, then reads the registered modules back with peekMap() and registers the patched ones (ep4_patches.js, E4-maps-a:
// withEastRoad(emberpeak), withEp4Wake(pk_inn); identity while that file does not exist).
//
// The ten Episode 4 maps are a fixed, guarded list: a map module that does not exist yet (wave 4c writes them) is skipped
// and reported, so the map agents only create files this list already names.
import { registerMap, peekMap } from '../../world/maps.js';
import { isMissing } from './index.js';

export const EP4_MAP_IDS = ['ep4_flood_road', 'ep4_valewyn', 'ep4_vw_inn', 'ep4_vw_shop', 'ep4_vw_forge', 'ep4_vw_palace',
  'ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3', 'ep4_keep_crown'];
/** Core or ep3 map id -> the patch export of ep4_patches.js that edits it. */
export const PATCHES = { emberpeak: 'withEastRoad', pk_inn: 'withEp4Wake' };

const identity = (m) => m;
let done = null;
let report = null;

async function imp(file, importer) {
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

async function run(opts) {
  const importer = opts.importer || ((p) => import(p));
  // 1. the ep3 pack first (it owns emberpeak and pk_inn): its register() is idempotent and imports nothing it has not got
  const ep3 = await importer('../maps/ep3/index.js');
  if (ep3 && typeof ep3.register === 'function') await ep3.register();
  // 2. the ten maps
  const loaded = [], skipped = [];
  for (const id of EP4_MAP_IDS) {
    const m = await imp(`../maps/${id}.js`, importer);
    const mod = m && (m.default || m.map);
    if (mod && mod.id) { registerMap(mod); loaded.push(id); } else skipped.push(id);
  }
  // 3. the patches, onto the modules the ep3 pack registered
  const P = (await imp('../maps/ep4_patches.js', importer)) || {};
  const patched = [];
  for (const [id, name] of Object.entries(PATCHES)) if (applyPatch(id, P[name] || identity)) patched.push(id);
  report = { loaded, skipped, patched, patchFile: !!P[PATCHES.emberpeak] || !!P[PATCHES.pk_inn] };
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
