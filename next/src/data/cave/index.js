// Entry module of the cave pack ("the Deep Stacks", docs/DEEP_STACKS_PLAN.md). ensurePack('cave') (src/game/packs.js, the entry
// C2-world adds) imports this file and calls register(); Node tools and tests import it themselves and call register() too.
// Written by C1-data; the X1 shape (src/data/x1/index.js), so nobody edits a shared data file.
//
// register() imports each data module behind a guard and calls the module's register() (named export `register`, or the default
// export when that is a function) in this fixed order:
//     items, loot, foes, story, text, world
// (story and text are C2-story-ui's; world is C2-world's glue, last so the real scenes and text win over its fallbacks; world.js
// itself loads bands345.js and the two hand-made maps behind the same guard). A module that does not exist yet is skipped (listed
// in the result's `skipped`), so the agents that write the modules plug in just by exporting register(). A module that exists but
// throws is NOT swallowed: the error reaches the caller. register() is idempotent (the same promise after success; a retry after a
// failure re-runs only what did not finish).
// What registration MUTATES (and nothing else): UNIQUES, KEY_ITEMS and ITEMS (the seventeen uniques, the Bookmark), ZONE_LOOT
// (cave_band_1..5) and BOSS_LOOT (binder), ZONES (cave_band_1..5 and cave_boss, non-enumerable), ENEMIES (binder) and
// ENCOUNTERS (cave_binder). The per-floor encounters are NOT registered here: the integrator calls foes.js
// registerFloorEncounters(floorEncounters(seed, floor)) when a floor is generated, and loot.js setLootFloor(floor) on arrival.

export const ID = 'cave';
export const ORDER = ['items', 'loot', 'foes', 'story', 'text', 'world'];

/** True once register() has finished (also readable as `CAVE_READY`). */
export let CAVE_READY = false;

const mods = {};            // name -> module namespace of every module that loaded
const finished = new Set(); // names whose register() has returned
let running = null;

/** The module namespaces that loaded (for tests and tools). */
export function modules() { return { ...mods }; }

function missing(e, name) {
  const m = String((e && e.message) || e);
  if (e && e.code === 'ERR_MODULE_NOT_FOUND') {   // Node: only when the missing file is this very module, not something it imports
    const gone = /Cannot find module '([^']+)'/.exec(m);
    return !!gone && /[\\/]cave[\\/]/.test(gone[1]) && gone[1].endsWith(`${name}.js`);
  }
  // Browsers do not say why; a nested broken import looks the same. ensurePack cross-checks `skipped` against pack_files.json.
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to load module script/i.test(m);
}

async function load(name) {
  if (mods[name]) return mods[name];
  try { mods[name] = await import(`./${name}.js`); }
  catch (e) { if (missing(e, name)) return null; throw e; }
  return mods[name];
}

async function run() {
  const loaded = [], skipped = [];
  for (const name of ORDER) {
    const m = await load(name);
    if (!m) { skipped.push(name); continue; }
    if (!finished.has(name)) {
      const fn = typeof m.register === 'function' ? m.register : typeof m.default === 'function' ? m.default : null;
      if (fn) await fn();
      finished.add(name);
    }
    loaded.push(name);
  }
  CAVE_READY = true;
  return { id: ID, loaded, skipped };
}

/** Register the pack's content into the shared tables. Idempotent. Resolves { id, loaded: [...], skipped: [...] }. */
export function register() {
  if (!running) running = run().catch((e) => { running = null; throw e; });
  return running;
}

export default register;
