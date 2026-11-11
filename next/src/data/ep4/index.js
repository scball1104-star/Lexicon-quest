// Entry module of the ep4 pack (Episode 4, The Sunken Keep; docs/EPISODE4_PLAN.md 13). ensurePack('ep4') (src/game/packs.js)
// imports this file and calls register(engine); Node tools and tests import it and call register() themselves. Written by
// E4-pack; nobody else edits it.
//
// register(engine) imports each module of this folder behind a guard and calls its register (named export `register`, or the
// default export when that is a function) as fn(engine, modules()), in this fixed order:
//     flags, enemies, items, skills, loot, encounters, shops, ai, npcs, quests, text, story, ledger, audio, world, maps,
//     hooks, start, errands, title
// A module that does not exist yet is skipped (listed in the result's `skipped`), so the agents that write the modules plug
// in just by exporting register(). A module that exists but throws is NOT swallowed: the error reaches the caller.
// `audio` needs no register(): its fragment ({ music, sfx, ambience, jingles, pack }, the assets/audio/manifest.json shape) is
// merged into engine.audio.manifest here, never overwriting an id, before ensurePack starts audio.loadPack('ep4').
// `title` is the pack's title row (E4-scene-ui); hooks.js loads it on first use, so it is listed last and only checked here.
// register() is idempotent: the same promise after success; a retry after a failure re-runs only what did not finish; a
// later call with an engine merges the audio fragment if an engine-less call (Node) ran first.

export const ID = 'ep4';
export const ORDER = ['flags', 'enemies', 'items', 'skills', 'loot', 'encounters', 'shops', 'ai', 'npcs', 'quests', 'text',
  'story', 'ledger', 'audio', 'world', 'maps', 'hooks', 'start', 'errands', 'title'];
/** Loaded on first use by hooks.js, never imported by register() (the title code is only needed on the title screen). */
const LAZY = new Set(['title']);

/** True once register() has finished. */
export let EP4_READY = false;
/** Mirrors encounters.js `EP4_MAPS_LISTED` (E4-maps-b flips it there): until true `?ep=4` shows no title row. */
export let EP4_MAPS_LISTED = false;

const mods = {};            // name -> module namespace of every module that loaded
const finished = new Set(); // names whose register() has returned
let running = null;
let audioMerged = null;     // the manifest object the fragment went into

/** The module namespaces that loaded (for tests, tools and the other modules' register(engine, mods)). */
export function modules() { return { ...mods }; }

/** Is this import error "the file `file` does not exist" (and not a broken import inside an existing file)? */
export function isMissing(e, file) {
  const m = String((e && e.message) || e);
  if (e && e.code === 'ERR_MODULE_NOT_FOUND') {   // Node: only when the missing file is this very module
    const gone = /Cannot find module '([^']+)'/.exec(m);
    return !!gone && gone[1].replace(/\\/g, '/').endsWith(file);
  }
  // Browsers do not say why; a nested broken import looks the same. ensurePack cross-checks `skipped` against pack_files.json.
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to load module script/i.test(m);
}

async function load(name) {
  if (mods[name]) return mods[name];
  try { mods[name] = await import(`./${name}.js`); }
  catch (e) { if (isMissing(e, `/ep4/${name}.js`)) return null; throw e; }
  return mods[name];
}

/** The audio fragment a module exports: AUDIO, the default object, or its named music/sfx/ambience/jingles/pack. */
export function audioFragment(m) {
  if (!m) return null;
  if (m.AUDIO && typeof m.AUDIO === 'object') return m.AUDIO;
  if (m.default && typeof m.default === 'object') return m.default;
  const out = {};
  for (const k of ['music', 'sfx', 'ambience', 'jingles', 'pack']) if (m[k] && typeof m[k] === 'object') out[k] = m[k];
  return Object.keys(out).length ? out : null;
}

/**
 * Merge an audio fragment into a live audio manifest IN PLACE: every music/sfx/ambience/jingles id it does not have yet, and
 * `pack` as manifest.packs.ep4. Never overwrites an id (reported in `clashes`). Pure. Returns { added, clashes }.
 */
export function mergeAudio(manifest, frag, packId = ID) {
  const out = { added: 0, clashes: [] };
  if (!manifest || !frag) return out;
  for (const kind of ['music', 'sfx', 'ambience', 'jingles']) {
    const sec = frag[kind];
    if (!sec || typeof sec !== 'object') continue;
    manifest[kind] = manifest[kind] || {};
    for (const [id, v] of Object.entries(sec)) {
      if (id in manifest[kind]) { if (manifest[kind][id] !== v) out.clashes.push(`${kind}.${id}`); continue; }
      manifest[kind][id] = v; out.added++;
    }
  }
  if (frag.pack && typeof frag.pack === 'object') {
    manifest.packs = manifest.packs || {};
    if (!manifest.packs[packId]) { manifest.packs[packId] = frag.pack; out.added++; }
  }
  return out;
}

function mergeInto(engine) {
  // the engine wraps the runtime (core/engine.js safeAudio): its manifest is on `.real` (PLAYTEST_REVIEW_6 fix 3: the quick start was silent)
  const a = engine && engine.audio, man = a && (a.manifest || (a.real && a.real.manifest));
  if (!man || audioMerged === man) return null;
  const r = mergeAudio(man, audioFragment(mods.audio));
  audioMerged = man;
  if (r.clashes.length) console.warn(`[ep4] audio ids already defined (kept): ${r.clashes.join(', ')}`);
  return r;
}

async function run(engine) {
  const loaded = [], skipped = [];
  for (const name of ORDER) {
    if (LAZY.has(name)) continue;
    const m = await load(name);
    if (!m) { skipped.push(name); continue; }
    if (!finished.has(name)) {
      const fn = typeof m.register === 'function' ? m.register : typeof m.default === 'function' ? m.default : null;
      if (fn) await fn(engine, modules());
      finished.add(name);
    }
    if (name === 'audio') mergeInto(engine);
    loaded.push(name);
  }
  const enc = mods.encounters;
  EP4_MAPS_LISTED = !!(enc && enc.EP4_MAPS_LISTED === true);
  EP4_READY = true;
  return { id: ID, loaded, skipped };
}

/** Register the pack's content into the shared tables. Idempotent. Resolves { id, loaded: [...], skipped: [...] }. */
export function register(engine) {
  if (!running) running = run(engine).catch((e) => { running = null; throw e; });
  else if (engine) running.then(() => mergeInto(engine), () => {});
  return running;
}

/** Tests: is the map list on (re-read from encounters.js, which E4-maps-b edits)? */
export function mapsListed() { const enc = mods.encounters; return !!(enc && enc.EP4_MAPS_LISTED === true); }

export default register;
