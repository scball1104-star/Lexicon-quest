// Entry module of the ep7 pack (Episode 7, The Vanishing World; docs/EPISODE7_PLAN.md 13). ensurePack('ep7') (src/game/packs.js)
// imports this file and calls register(engine); Node tools and tests import it and call register() themselves. Written by
// E7-pack; nobody else edits it. The Episode 6 entry (src/data/ep6/index.js) is the model, with these differences:
//
// 1. The ep6 pack registers FIRST (it awaits ep5, which awaits ep4, which awaits ep3). Episode 7 starts in Zephyr Landing and
//    patches three Episode 6 maps (plan 3), so run() awaits the ep6 pack before any ep7 module is evaluated. The fetches still
//    overlap: ensurePack('ep7') starts every hard pack above it at once (packs.js, issue #96), and the ep7 code and map files
//    start downloading before the wait (prefetchCode() and maps.js prefetch()). Only the registration is ordered.
// 2. The order is
//        flags, enemies, items, skills, loot, encounters, rime, shops, ai, npcs, quests, text, story, ledger, audio, world,
//        pages, maps, hooks, start, scene
//    (`rime` is Rime on rules.js RULE_EXT, `pages` the close-up kinds, `scene` the battle presentation). `title` (the title
//    row, E7-scene-ui) is not in it: hooks.js loads it on first use.
// 3. The audio fragment (src/data/ep7/audio.js, E7-audio) is merged into engine.audio.manifest on every path that brings the
//    pack up, the quick start included (hooks.js calls register(engine) again with the engine before the fade in).
//
// Each module's register (named export `register`, or the default export when that is a function) is called as
// fn(engine, modules()). A module that does not exist yet is skipped (listed in `skipped`); one that exists but throws is
// NOT swallowed. register() is idempotent: the same promise after success; a retry after a failure re-runs only what did
// not finish; a later call with an engine merges the audio fragment if an engine-less call (Node) ran first.
import { ensurePack, storedAll } from '../../game/packs.js';
import { isMissing, audioFragment, mergeAudio as mergeAudioAs } from '../ep4/index.js';

export { isMissing, audioFragment };
export const ID = 'ep7';
export const ORDER = ['flags', 'enemies', 'items', 'skills', 'loot', 'encounters', 'rime', 'shops', 'ai', 'npcs', 'quests', 'text',
  'story', 'ledger', 'audio', 'world', 'pages', 'maps', 'hooks', 'start', 'scene'];

/** True once register() has finished. */
export let EP7_READY = false;
/** Mirrors encounters.js `EP7_MAPS_LISTED` (E7-maps-b flips it there): until true `?ep=7` shows no title row. */
export let EP7_MAPS_LISTED = false;

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
  catch (e) { if (isMissing(e, `/ep7/${name}.js`)) return null; throw e; }
  return mods[name];
}

/** Merge an audio fragment into a live manifest in place, as manifest.packs.ep7; never overwrites an id. Pure. */
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
  if (r.clashes.length) console.warn(`[ep7] audio ids already defined (kept): ${r.clashes.join(', ')}`);
  return r;
}

/**
 * The ep6 pack (and through it ep5, ep4 and ep3), registered with this engine. Through ensurePack, so in the browser its art,
 * tiles and audio come up too; when a switch is off (a test, a tool) its entry is registered directly. A failed ep6 load fails
 * this pack (ensurePack retries).
 */
export async function ensureEp6(engine) {
  const r = await ensurePack('ep6', engine ? { engine } : {});
  if (r && !r.ok) throw new Error(`[ep7] the ep6 pack did not load (${(r.failed || []).join(', ')})`);
  const ep6 = await import('../ep6/index.js');
  return ep6.register(engine);   // idempotent; with an engine it merges the ep6 audio fragment (zephyr) if that has not happened yet
}

/**
 * In the browser, fetch every module of ORDER at once (the files download while the ep6 pack comes up, then import() reads them
 * from the cache) and note the ones that answer 404, so a module not written yet costs no import() of its own. A network error
 * marks nothing: that module's import() then decides, as without the prefetch. Node: nothing to do. Resolves the 404 set.
 */
export function prefetchCode() {
  if (typeof fetch !== 'function' || !/^https?:/.test(import.meta.url)) return Promise.resolve(new Set());
  const out = new Set();
  const hrefs = ORDER.map((n) => new URL(`./${n}.js`, import.meta.url).href);
  // every module already in the worker's cache: none can answer 404 and import() reads them from there, so fetch none
  return storedAll(hrefs).then((all) => (all ? out : Promise.all(hrefs.map((h, i) => fetch(h)
    .then((r) => { if (r.status === 404) out.add(ORDER[i]); }, () => {}))).then(() => out)));
}

async function run(engine) {
  const loaded = [], skipped = [];
  // start the ep7 code and map files downloading now, while the ep6 pack comes up; maps.register() awaits the same map fetch
  const code = prefetchCode();
  const early = load('maps').then((m) => (m && typeof m.prefetch === 'function' ? m.prefetch() : null));
  early.catch(() => {});
  await ensureEp6(engine);
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
  EP7_MAPS_LISTED = mapsListed();
  EP7_READY = true;
  return { id: ID, loaded, skipped };
}

/** Register the pack's content into the shared tables (after the ep6 pack's). Idempotent. Resolves { id, loaded, skipped }. */
export function register(engine) {
  if (!running) running = run(engine).catch((e) => { running = null; throw e; });
  else if (engine) running.then(() => mergeInto(engine), () => {});
  return running;
}

/** Is the map list on (re-read from encounters.js, which E7-maps-b edits)? */
export function mapsListed() { const enc = mods.encounters; return !!(enc && enc.EP7_MAPS_LISTED === true); }

export default register;
