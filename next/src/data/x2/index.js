// Entry module of the x2 pack ("The Mere Country"). ensurePack('x2') (src/game/packs.js) imports this file and calls
// register(); Node tools and tests import it themselves and call register() too. Written by XP-packs; nobody else edits it.
//
// register() imports each data module behind a guard and calls the module's register() (named export `register`, or the
// default export when that is a function) in this fixed order:
//     flags, enemies, items, loot, encounters, shops, npcs, quests, text, story
// A module that does not exist yet is skipped (listed in the result's `skipped`), so the agents that write the modules plug
// in just by exporting register(). A module that exists but throws is NOT swallowed: the error reaches the caller.
// register() is idempotent (the same promise after success; a retry after a failure re-runs only what did not finish).
// Registration MUTATES the shared objects (ENEMIES, ITEMS, ENCOUNTERS, ZONES via the non-enumerable defineProperty pattern,
// ZONE_LOOT, SHOPS, NPCS, FLAGS and FLAG_IDS, ALL_SIDE_QUESTS, BANTER, BANNERS, BOOKS, BARKS, BESTIARY, SCENES and LINES via
// registerStory, prependTalk): there is no "append a line to a data file" merge anywhere.

export const ID = 'x2';
export const ORDER = ['flags', 'enemies', 'items', 'loot', 'encounters', 'shops', 'npcs', 'quests', 'text', 'story'];

/** True once register() has finished (also readable as `X2_READY`). */
export let X2_READY = false;
/** Mirrors encounters.js `X2_MAPS_LISTED`: the zones are enumerable in ZONES only after X2-integrate flips it there. */
export let X2_MAPS_LISTED = false;

const mods = {};            // name -> module namespace of every module that loaded
const finished = new Set(); // names whose register() has returned
let running = null;

/** The module namespaces that loaded (for tests and tools). */
export function modules() { return { ...mods }; }

function missing(e, name) {
  const m = String((e && e.message) || e);
  if (e && e.code === 'ERR_MODULE_NOT_FOUND') {   // Node: only when the missing file is this very module, not something it imports
    const gone = /Cannot find module '([^']+)'/.exec(m);
    return !!gone && /[\\/]x2[\\/]/.test(gone[1]) && gone[1].endsWith(`${name}.js`);
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
  const enc = mods.encounters;
  X2_MAPS_LISTED = !!(enc && enc.X2_MAPS_LISTED === true);
  X2_READY = true;
  return { id: ID, loaded, skipped };
}

/** Register the pack's content into the shared tables. Idempotent. Resolves { id, loaded: [...], skipped: [...] }. */
export function register() {
  if (!running) running = run().catch((e) => { running = null; throw e; });
  return running;
}

export default register;
