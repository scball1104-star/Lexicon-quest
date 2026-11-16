// The ep8 pack's hooks into the shell (E8-pack; docs/EPISODE8_PLAN.md 5.3, 10 and 13.2). index.js runs register(engine, mods)
// after every data module, so the other agents' exports are in `mods` (each one optional: a missing module or export only
// skips its hook, reported in the result's `waiting`).
//
//   CREDITS_HANDOFF[8]        story.js reads it (creditsPending by `flag`): CREDITS_EP8 from credits.js (or text.js) and
//                             END_CARD_EP8 (E8-story; this file's END_CARD_EP8 until text.js has one); the credits wake the
//                             party at home (hero_home, mark bed: plan 5.3), music `the_last_word`, counter credits8_rolled
//   CREDITS_HANDOFF[7].endCard  END_CARD_EP7_LIVE while EP8_LIVE ("Episode 8 begins in the morning."); unchanged while off. The
//                             Episode 7 wake (ep7_ph_watch, watch_cot) is never moved: the Watch fires ep8_morning (plan 3)
//   QUEST_EXT                 ['ep8_started', MAIN_QUEST_EP8] from quests.js (E8-story), ahead of Episode 7's entry
//   globalThis.LQ_EP8         { title(scene), offer(save, search), start(engine, name, slot), pickRunSlot }: scenes/title.js
//                             calls LQ_EP8.title(this); the row, picker and name entry are ./title.js (E8-scene-ui), loaded on
//                             first use
//   LQ_DEBUG.newGameEp8       async (name, { slot, scene: 'field' | 'none' }) -> { map, slot } | null when every slot is full
//
// The quick start (start, LQ_DEBUG.newGameEp8) brings up the ep7 pack (which brings up ep6, ep5, ep4 and ep3) and then this one,
// with the ep4 to ep7 audio fragments (ep6's sky_wind for the Stair, ep7's palehaven for Act I) and the ep8 one merged into the
// engine's manifest, BEFORE the fade in (PLAYTEST_REVIEW_6 fix 3).
import { CREDITS_HANDOFF } from '../../game/story.js';
import { QUEST_EXT } from '../quests.js';
import { EP8_LIVE, pickRunSlot } from '../../game/episodes.js';
import { ensurePack, onPackReady } from '../../game/packs.js';
import { peekMap } from '../../world/maps.js';
import { cleanName } from '../../game/state.js';
import { END_CARD_EP7 } from '../ep7/text.js';
import { readyPacks as readyEp7 } from '../ep7/hooks.js';
import { newGameEp8, EP8_START } from './start.js';
import { mapsListed, isMissing, register as registerEp8 } from './index.js';

/** The Episode 7 end card once Episode 8 is live (EPISODE8_PLAN 5.3). */
export const END_CARD_EP7_LIVE = { ...END_CARD_EP7, sub: 'Episode 8 begins in the morning.' };
/** The last end card (plan 5.3), used until text.js exports its own END_CARD_EP8. */
export const END_CARD_EP8 = { text: 'The End', sub: 'Every road is open. The Deep Stacks wait under the library.', frames: 300 };
/** Where the Episode 8 credits wake the party (plan 3.6 and 5.3: home, Episode 1's handoff shape). */
export const WAKE8 = { map: 'hero_home', mark: 'bed' };
export const EP8_ROW_LABEL = 'Episode 8: new party';
export const EP8_ROW_HELP = 'A ready party at Lv 31. Your own save stays under Continue.';

/** The handoff entry for Episode 8, or null while neither credits.js nor text.js has CREDITS_EP8 (plan 5.3). */
export function handoff8(credits, text) {
  const cards = (credits && credits.CREDITS_EP8) || (text && text.CREDITS_EP8);
  if (!Array.isArray(cards)) return null;
  const endCard = (text && text.END_CARD_EP8) || (credits && credits.END_CARD_EP8) || END_CARD_EP8;
  return { cards, music: 'the_last_word', ...WAKE8, counter: 'credits8_rolled', endCard, flag: 'ep8_complete' };
}

function urlEp(search) { try { return new URLSearchParams(search || '').get('ep'); } catch (err) { return null; } }

/** The newest base-game slot with ep7_complete ({ slot, name } or null). A Fine Print run never offers Episode 8 (plan 10.7). */
function newestFinisher(save) {
  let best = null;
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    let env = null;
    try { env = save.loadEnvelope(n); } catch (err) { env = null; }
    const d = env && env.data;
    if (!d || !d.flags || !d.flags.ep7_complete || d.flags.tier_1) continue;
    const at = Date.parse(env.savedAt || '') || 0;
    if (!best || at > best.at) best = { slot: n, at, name: (env.meta && env.meta.name) || d.heroName || null };
  }
  return best;
}

/**
 * The Episode 8 title row: { show, url, name, slot }. Shown when the switch is live and a (base game) slot has ep7_complete,
 * or with `?ep=8` once the Episode 8 maps are listed (a developer entry). opts.live / opts.mapsListed override (tests). Pure.
 */
export function ep8Offer(save, search = '', opts = {}) {
  const live = opts.live != null ? !!opts.live : EP8_LIVE;
  const listed = opts.mapsListed != null ? !!opts.mapsListed : mapsListed();
  const best = newestFinisher(save);
  const url = urlEp(search) === '8' && listed;
  return { show: (live && !!best) || url, url, name: best ? best.name : null, slot: best ? best.slot : null };
}

/**
 * Every pack the quick start needs, up, with the ep4 to ep8 audio fragments in the engine's manifest. The ep7 hooks' readyPacks
 * brings up ep4 to ep7 (each through ensurePack, then its entry's register(engine)); then this pack the same way. ensurePack is
 * a no-op while a switch is off; the direct register(engine) calls make sure the registration and the audio merge happened with
 * THIS engine whatever path loaded a pack first. Resolves when the ep8 pack has registered.
 */
export async function readyPacks(engine) {
  await readyEp7(engine);
  await ensurePack('ep8', engine ? { engine } : {});
  await registerEp8(engine);
}

/** newGameEp8(name, { slot }), the field awake in the Keeper's Watch, after readyPacks. The run saves only to its own slot. */
export async function startEpisode8(engine, name, slot = 0) {
  const e = engine;
  await readyPacks(e);
  const g = newGameEp8(cleanName(name), { slot });
  e.game = g;
  return e.fadeTo(() => {
    if (e.hasScene('field')) e.reset('field', { map: g.map, mark: EP8_START.mark, dir: 'down' });
    else e.reset('_uiStage', {});
  }, { duration: 0.8 });
}

export const HOOKS = {
  offer: ep8Offer,
  start: startEpisode8,
  pickRunSlot,
  /** Add the row to a title scene (./title.js, E8-scene-ui). Resolves false while there is nothing to offer or no title code. */
  title(scene) {
    const e = scene && scene.engine;
    const offer = ep8Offer(e && e.save, typeof location !== 'undefined' ? location.search : '');
    if (!offer.show) return Promise.resolve(false);
    return import('./title.js').then((m) => (typeof m.offerRow === 'function' ? m.offerRow(scene, offer, HOOKS) : false))
      .catch((err) => { if (!isMissing(err, '/ep8/title.js')) console.warn('[ep8] title row', err); return false; });
  },
};

function installDebug(engine) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || typeof D.register !== 'function' || D.newGameEp8) return;
  /** LQ_DEBUG.newGameEp8(name, { slot, scene }): without `slot` it picks the run's own slot like the title does. Async. */
  D.register('newGameEp8', async (name = 'Hero', o = {}) => {
    const eng = engine || (typeof window !== 'undefined' && window.LQ_ENGINE) || null;
    let slot = o.slot;
    if (slot == null) {
      const pick = pickRunSlot(eng && eng.save);
      if (!pick.ok) return null;
      slot = pick.slot;
    }
    if (eng) await readyPacks(eng);
    const g = newGameEp8(name, { ...o, slot });
    if (!eng) return { map: g.map, slot, game: g };
    eng.game = g;
    if (o.scene === 'none' || !eng.hasScene('field')) return { map: g.map, slot };
    eng.reset('field', { map: g.map, mark: EP8_START.mark, dir: 'down' });
    return { map: g.map, slot };
  });
}

/**
 * A cold first entry (the ep7 pack's rule): the field waits at most 8 s for a map's packs (field.js loadMap), and on a slow phone
 * the chain ep3 to ep7 alone can take longer, so ep7_ph_watch or ep7_stillheart may come up as the ep7 pack registered it,
 * without this pack's patch (no wake trigger, no stair door). Once the ep8 pack is ready, a field still standing on the
 * unpatched module is re-entered where the party stands (the same-map dither), when it matters: the Watch while ep8_morning is
 * still to come, the Stillheart once Episode 8 has started. Only while EP8_LIVE. Waits for the field to be idle (bounded).
 * True when it re-entered.
 */
export const PATCHED_MAPS = ['ep7_ph_watch', 'ep7_stillheart'];
export function relandPatched(engine, tries = 40, live = EP8_LIVE) {
  const f = engine && (engine.stack || []).find((sc) => sc && sc.name === 'field');
  if (!live || !f || f.dead || !f.map || !f.game || !PATCHED_MAPS.includes(f.mapId)) return false;
  const mod = peekMap(f.mapId), fl = f.game.flags || {};
  if (!mod || f.map.mod === mod) return false;
  if (f.mapId === 'ep7_stillheart' ? !fl.ep8_started : !fl.ep7_complete || fl.ep8_morning_done) return false;
  const L = f.leader;
  if (f.loading || f.pendingWarp || f.inputLocked || (f.cutscene && f.cutscene.running) || engine.scene !== f || !L || L.moving) {
    if (tries > 0 && typeof engine.after === 'function') engine.after(30, () => relandPatched(engine, tries - 1, live));
    return false;
  }
  f.warpTo(f.mapId, L.tx, L.ty, L.dir, 'warp');
  return true;
}

let done = false;
let card7Off;   // CREDITS_HANDOFF[7].endCard as the ep7 pack left it (unregister puts it back)

/** Install every hook whose data exists. Idempotent. Returns { installed: [...], waiting: [...] }. opts.live: tests. */
export function register(engine, mods = {}, opts = {}) {
  const live = opts.live != null ? !!opts.live : EP8_LIVE;
  const installed = [], waiting = [];
  const h8 = handoff8(mods.credits, mods.text);
  if (h8) { if (!CREDITS_HANDOFF[8]) CREDITS_HANDOFF[8] = h8; installed.push('credits8'); } else waiting.push('credits8 (credits.js CREDITS_EP8)');
  if (live && CREDITS_HANDOFF[7]) {
    if (card7Off === undefined) card7Off = CREDITS_HANDOFF[7].endCard;
    CREDITS_HANDOFF[7].endCard = (mods.text && mods.text.END_CARD_EP7_LIVE) || END_CARD_EP7_LIVE;
    installed.push('endcard7');
  }
  const q = mods.quests && mods.quests.MAIN_QUEST_EP8;
  if (q) { if (!QUEST_EXT.some(([f]) => f === 'ep8_started')) QUEST_EXT.unshift(['ep8_started', q]); installed.push('quest'); }
  else waiting.push('quest (quests.js MAIN_QUEST_EP8)');
  globalThis.LQ_EP8 = HOOKS;
  installed.push('title');
  // the developer entry ?ep=8 (once the maps are listed) opens the story's switch, as ?ep=7 does for Episode 7
  if (mods.story && mods.story.GATE && typeof location !== 'undefined' && /[?&]ep=8(&|$)/.test(location.search || '') && mapsListed()) mods.story.GATE.live = true;
  installDebug(engine);
  if (engine && !done) onPackReady('ep8', () => relandPatched(engine));
  done = true;
  return { installed, waiting };
}

/** Tests: take the global hooks away again and put the Episode 7 end card back (the tables keep entry 8, as a loaded pack's do). */
export function unregister() {
  if (globalThis.LQ_EP8 === HOOKS) delete globalThis.LQ_EP8;
  if (card7Off !== undefined && CREDITS_HANDOFF[7]) CREDITS_HANDOFF[7].endCard = card7Off;
  card7Off = undefined;
  done = false;
}
export function hooksInstalled() { return done; }

export default register;
