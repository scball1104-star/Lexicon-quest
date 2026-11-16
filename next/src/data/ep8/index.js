// Entry module of the ep8 pack (Episode 8, The Last Word; docs/EPISODE8_PLAN.md 13). ensurePack('ep8') (src/game/packs.js)
// imports this file and calls register(engine); Node tools and tests import it and call register() themselves. Written by
// E8-pack; nobody else edits it. The Episode 7 entry (src/data/ep7/index.js) is the model, with these differences:
//
// 1. The ep7 pack registers FIRST (it awaits ep6, which awaits ep5, then ep4, then ep3). Episode 8 starts in the Keeper's Watch
//    and patches two Episode 7 maps (plan 3), so run() awaits the ep7 pack before any ep8 module is evaluated. The fetches still
//    overlap: ensurePack('ep8') starts every hard pack above it at once (packs.js, issue #96), and the ep8 code and map files
//    start downloading before the wait (prefetchCode() and maps.js prefetch()). Only the registration is ordered.
// 2. The order is
//        flags, enemies, items, skills, loot, encounters, erasure, shops, ai, npcs, quests, text, credits, story, ledger, audio,
//        world, pages, maps, hooks, start, scene
//    (`erasure` is Erasure on rules.js RULE_EXT, `credits` the whole game's credits, `pages` the close-up kinds, `scene` the
//    battle presentation). `title` (the title row, E8-scene-ui) is not in it: hooks.js loads it on first use.
// 3. The audio fragment (src/data/ep8/audio.js, E8-audio) is merged into engine.audio.manifest on every path that brings the
//    pack up, the quick start included (hooks.js calls register(engine) again with the engine before the fade in).
//
// Each module's register (named export `register`, or the default export when that is a function) is called as
// fn(engine, modules()). A module that does not exist yet is skipped (listed in `skipped`); one that exists but throws is
// NOT swallowed. register() is idempotent: the same promise after success; a retry after a failure re-runs only what did
// not finish; a later call with an engine merges the audio fragment if an engine-less call (Node) ran first.
import { ensurePack, storedAll } from '../../game/packs.js';
import { isMissing, audioFragment, mergeAudio as mergeAudioAs } from '../ep4/index.js';

export { isMissing, audioFragment };
export const ID = 'ep8';
export const ORDER = ['flags', 'enemies', 'items', 'skills', 'loot', 'encounters', 'erasure', 'shops', 'ai', 'npcs', 'quests', 'text',
  'credits', 'story', 'ledger', 'audio', 'world', 'pages', 'maps', 'hooks', 'start', 'scene'];

/** True once register() has finished. */
export let EP8_READY = false;
/** Mirrors encounters.js `EP8_MAPS_LISTED` (E8-maps-b flips it there): until true `?ep=8` shows no title row. */
export let EP8_MAPS_LISTED = false;

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
  catch (e) { if (isMissing(e, `/ep8/${name}.js`)) return null; throw e; }
  return mods[name];
}

/** Merge an audio fragment into a live manifest in place, as manifest.packs.ep8; never overwrites an id. Pure. */
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
  if (r.clashes.length) console.warn(`[ep8] audio ids already defined (kept): ${r.clashes.join(', ')}`);
  return r;
}

/**
 * The ep7 pack (and through it ep6, ep5, ep4 and ep3), registered with this engine. Through ensurePack, so in the browser its
 * art, tiles and audio come up too; when a switch is off (a test, a tool) its entry is registered directly. A failed ep7 load
 * fails this pack (ensurePack retries).
 */
export async function ensureEp7(engine) {
  const r = await ensurePack('ep7', engine ? { engine } : {});
  if (r && !r.ok) throw new Error(`[ep8] the ep7 pack did not load (${(r.failed || []).join(', ')})`);
  const ep7 = await import('../ep7/index.js');
  return ep7.register(engine);   // idempotent; with an engine it merges the ep7 audio fragment (palehaven) if that has not happened yet
}

/**
 * In the browser, fetch every module of ORDER at once (the files download while the ep7 pack comes up, then import() reads them
 * from the cache) and note the ones that answer 404, so a module not written yet costs no import() of its own. A network error
 * marks nothing: that module's import() then decides, as without the prefetch. Node: nothing to do. Resolves the 404 set.
 */
export function prefetchCode() {
  if (typeof fetch !== 'function' || !/^https?:/.test(import.meta.url)) return Promise.resolve(new Set());
  const out = new Set();
  const hrefs = ORDER.map((n) => new URL(`./${n}.js`, import.meta.url).href);
  // every module already in the worker's cache: none can answer 404 and import() reads them from there, so fetch none
  return storedAll(hrefs).then((all) => (all ? out : Promise.all(hrefs.map((h, i) => fetch(h, { cache: 'force-cache' })
    .then((r) => { if (r.status === 404) out.add(ORDER[i]); }, () => {}))).then(() => out)));
}

async function run(engine) {
  const loaded = [], skipped = [];
  // start the ep8 code and map files downloading now, while the ep7 pack comes up; maps.register() awaits the same map fetch
  const code = prefetchCode();
  const early = load('maps').then((m) => (m && typeof m.prefetch === 'function' ? m.prefetch() : null));
  early.catch(() => {});
  await ensureEp7(engine);
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
  EP8_MAPS_LISTED = mapsListed();
  EP8_READY = true;
  return { id: ID, loaded, skipped };
}

/** Register the pack's content into the shared tables (after the ep7 pack's). Idempotent. Resolves { id, loaded, skipped }. */
export function register(engine) {
  if (!running) running = run(engine).catch((e) => { running = null; throw e; });
  else if (engine) running.then(() => mergeInto(engine), () => {});
  return running;
}

/** Is the map list on (re-read from encounters.js, which E8-maps-b edits)? */
export function mapsListed() { const enc = mods.encounters; return !!(enc && enc.EP8_MAPS_LISTED === true); }

export default register;
