// Entry module of the ep5 pack (Episode 5, The Last Prophecy; docs/EPISODE5_PLAN.md 13). ensurePack('ep5') (src/game/packs.js)
// imports this file and calls register(engine); Node tools and tests import it and call register() themselves. Written by
// E5-pack; nobody else edits it. The Episode 4 entry (src/data/ep4/index.js) is the model, with three differences:
//
// 1. The ep4 pack registers FIRST. Episode 5's story uses Valewyn's NPCs and patches Episode 4's maps (plan 3.3), so run()
//    awaits ensurePack('ep4', { engine }) before any ep5 module but maps.js is even imported (the fetches still overlap:
//    ensurePack('ep4') is a no-op when the title or the field started it already, and the ep5 code and map files start
//    downloading before the wait, prefetchCode() and maps.js prefetch()). Every ep5 module is evaluated after the ep4 pack
//    has registered and registers in ORDER, one after the other.
// 2. The order is
//        flags, enemies, items, skills, loot, encounters, sky, shops, ai, npcs, quests, text, story, ledger, audio, world,
//        pages, maps, hooks, start, scene
//    (`sky` is the Turning Sky on rules.js RULE_EXT, `pages` the close-up kinds, `scene` the battle presentation). `title`
//    (the title row, E5-scene-ui) is not in it: hooks.js loads it on first use.
// 3. The audio fragment (src/data/ep5/audio.js) is merged into engine.audio.manifest on every path that brings the pack up,
//    the quick start included (hooks.js calls register(engine) again with the engine before the fade in).
//
// Each module's register (named export `register`, or the default export when that is a function) is called as
// fn(engine, modules()). A module that does not exist yet is skipped (listed in `skipped`); one that exists but throws is
// NOT swallowed. register() is idempotent: the same promise after success; a retry after a failure re-runs only what did
// not finish; a later call with an engine merges the audio fragment if an engine-less call (Node) ran first.
import { ensurePack } from '../../game/packs.js';
import { isMissing, audioFragment, mergeAudio as mergeAudioAs } from '../ep4/index.js';

export { isMissing, audioFragment };
export const ID = 'ep5';
export const ORDER = ['flags', 'enemies', 'items', 'skills', 'loot', 'encounters', 'sky', 'shops', 'ai', 'npcs', 'quests', 'text',
  'story', 'ledger', 'audio', 'world', 'pages', 'maps', 'hooks', 'start', 'scene'];

/** True once register() has finished. */
export let EP5_READY = false;
/** Mirrors encounters.js `EP5_MAPS_LISTED` (E5-maps-b flips it there): until true `?ep=5` shows no title row. */
export let EP5_MAPS_LISTED = false;

const mods = {};            // name -> module namespace of every module that loaded
const finished = new Set(); // names whose register() has returned
let running = null;
let audioMerged = null;     // the manifest object the fragment went into

/** The module namespaces that loaded (for tests, tools and the other modules' register(engine, mods)). */
export function modules() { return { ...mods }; }

let absent = new Set();     // modules the browser prefetch saw answer 404 (not written yet): skipped without an import()

async function load(name) {
  if (mods[name]) return mods[name];
  if (absent.has(name)) return null;
  try { mods[name] = await import(`./${name}.js`); }
  catch (e) { if (isMissing(e, `/ep5/${name}.js`)) return null; throw e; }
  return mods[name];
}

/** Merge an audio fragment into a live manifest in place, as manifest.packs.ep5; never overwrites an id. Pure. */
export function mergeAudio(manifest, frag, packId = ID) { return mergeAudioAs(manifest, frag, packId); }

/** The engine's live audio manifest (core/engine.js safeAudio keeps the runtime on `.real`), or null. */
export function audioManifestOf(engine) {
  const a = engine && engine.audio;
  return (a && (a.manifest || (a.real && a.real.manifest))) || null;
}

function mergeInto(engine) {
  const man = audioManifestOf(engine);
  if (!man || audioMerged === man || !mods.audio) return null;
  const r = mergeAudio(man, audioFragment(mods.audio));
  audioMerged = man;
  if (r.clashes.length) console.warn(`[ep5] audio ids already defined (kept): ${r.clashes.join(', ')}`);
  return r;
}

/**
 * The ep4 pack, registered with this engine. Through ensurePack, so in the browser its art, tiles and audio come up too; when
 * the ep4 switch is off (a test, a tool) its entry is registered directly. A failed ep4 load fails this pack (ensurePack retries).
 */
export async function ensureEp4(engine) {
  const r = await ensurePack('ep4', engine ? { engine } : {});
  if (r && !r.ok) throw new Error(`[ep5] the ep4 pack did not load (${(r.failed || []).join(', ')})`);
  const ep4 = await import('../ep4/index.js');
  return ep4.register(engine);   // idempotent; with an engine it merges the ep4 audio fragment if that has not happened yet
}

/**
 * In the browser, fetch every module of ORDER at once (the files download while the ep4 pack comes up, then import() reads them
 * from the cache) and note the ones that answer 404, so a module not written yet costs no import() of its own. A network error
 * marks nothing: that module's import() then decides, as without the prefetch. Node: nothing to do. Resolves the 404 set.
 */
export function prefetchCode() {
  if (typeof fetch !== 'function' || !/^https?:/.test(import.meta.url)) return Promise.resolve(new Set());
  const out = new Set();
  return Promise.all(ORDER.map((n) => fetch(new URL(`./${n}.js`, import.meta.url).href)
    .then((r) => { if (r.status === 404) out.add(n); }, () => {}))).then(() => out);
}

async function run(engine) {
  const loaded = [], skipped = [];
  // start the ep5 code and map files downloading now, while the ep4 pack comes up; maps.register() awaits the same map fetch
  const code = prefetchCode();
  const early = load('maps').then((m) => (m && typeof m.prefetch === 'function' ? m.prefetch() : null));
  early.catch(() => {});
  await ensureEp4(engine);
  absent = await code;
  for (const name of ORDER) {
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
  EP5_MAPS_LISTED = mapsListed();
  EP5_READY = true;
  return { id: ID, loaded, skipped };
}

/** Register the pack's content into the shared tables (after the ep4 pack's). Idempotent. Resolves { id, loaded, skipped }. */
export function register(engine) {
  if (!running) running = run(engine).catch((e) => { running = null; throw e; });
  else if (engine) running.then(() => mergeInto(engine), () => {});
  return running;
}

/** Is the map list on (re-read from encounters.js, which E5-maps-b edits)? */
export function mapsListed() { const enc = mods.encounters; return !!(enc && enc.EP5_MAPS_LISTED === true); }

export default register;
