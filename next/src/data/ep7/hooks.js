// The ep7 pack's hooks into the shell (E7-pack; docs/EPISODE7_PLAN.md 5.3, 10 and 13.2). index.js runs register(engine, mods)
// after every data module, so the other agents' exports are in `mods` (each one optional: a missing module or export only
// skips its hook, reported in the result's `waiting`).
//
//   CREDITS_HANDOFF[7]        story.js reads it (creditsPending by `flag`): CREDITS_EP7 and END_CARD_EP7 from text.js (E7-story);
//                             the credits wake the party in the Keeper's Watch (ep7_ph_watch, mark watch_cot: plan 5.3, 2026-11-11)
//   CREDITS_HANDOFF[6].endCard  END_CARD_EP6_LIVE while EP7_LIVE ("Episode 7 begins in the morning."); unchanged while off. The
//                             Episode 6 wake (ep6_zl_inn, inn_bed) is never moved: the inn fires ep7_morning (plan 3)
//   QUEST_EXT                 ['ep7_started', MAIN_QUEST_EP7] from quests.js (E7-story), ahead of Episode 6's entry
//   globalThis.LQ_EP7         { title(scene), offer(save, search), start(engine, name, slot), pickRunSlot }: scenes/title.js
//                             calls LQ_EP7.title(this); the row, picker and name entry are ./title.js (E7-scene-ui), loaded on
//                             first use
//   LQ_DEBUG.newGameEp7       async (name, { slot, scene: 'field' | 'none' }) -> { map, slot } | null when every slot is full
//
// The quick start (start, LQ_DEBUG.newGameEp7) brings up the ep6 pack (which brings up ep5, ep4 and ep3) and then this one,
// with the ep4, ep5, ep6 (zephyr, Act I) and ep7 audio fragments merged into the engine's manifest, BEFORE the fade in
// (PLAYTEST_REVIEW_6 fix 3).
import { CREDITS_HANDOFF } from '../../game/story.js';
import { QUEST_EXT } from '../quests.js';
import { EP7_LIVE, pickRunSlot } from '../../game/episodes.js';
import { ensurePack, onPackReady } from '../../game/packs.js';
import { peekMap } from '../../world/maps.js';
import { cleanName } from '../../game/state.js';
import { END_CARD_EP6 } from '../ep6/text.js';
import { readyPacks as readyEp6 } from '../ep6/hooks.js';
import { newGameEp7, EP7_START } from './start.js';
import { mapsListed, isMissing, register as registerEp7 } from './index.js';

/** The Episode 6 end card once Episode 7 is live (EPISODE7_PLAN 5.3). */
export const END_CARD_EP6_LIVE = { ...END_CARD_EP6, sub: 'Episode 7 begins in the morning.' };
/** Where the Episode 7 credits wake the party (plan 5.3, 2026-11-11: the Watch, not the Lodge). */
export const WAKE7 = { map: 'ep7_ph_watch', mark: 'watch_cot' };
export const EP7_ROW_LABEL = 'Episode 7: new party';
export const EP7_ROW_HELP = 'A ready party at Lv 28. Your own save stays under Continue.';

/** The handoff entry for Episode 7, or null while text.js has no CREDITS_EP7 (plan 5.3). */
export function handoff7(text) {
  if (!text || !Array.isArray(text.CREDITS_EP7)) return null;
  return { cards: text.CREDITS_EP7, music: 'palehaven', ...WAKE7, counter: 'credits7_rolled',
    endCard: text.END_CARD_EP7 || null, flag: 'ep7_complete' };
}

function urlEp(search) { try { return new URLSearchParams(search || '').get('ep'); } catch (err) { return null; } }

/** The newest base-game slot with ep6_complete ({ slot, name } or null). A Fine Print run never offers Episode 7 (plan 10.7). */
function newestFinisher(save) {
  let best = null;
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    let env = null;
    try { env = save.loadEnvelope(n); } catch (err) { env = null; }
    const d = env && env.data;
    if (!d || !d.flags || !d.flags.ep6_complete || d.flags.tier_1) continue;
    const at = Date.parse(env.savedAt || '') || 0;
    if (!best || at > best.at) best = { slot: n, at, name: (env.meta && env.meta.name) || d.heroName || null };
  }
  return best;
}

/**
 * The Episode 7 title row: { show, url, name, slot }. Shown when the switch is live and a (base game) slot has ep6_complete,
 * or with `?ep=7` once the Episode 7 maps are listed (a developer entry). opts.live / opts.mapsListed override (tests). Pure.
 */
export function ep7Offer(save, search = '', opts = {}) {
  const live = opts.live != null ? !!opts.live : EP7_LIVE;
  const listed = opts.mapsListed != null ? !!opts.mapsListed : mapsListed();
  const best = newestFinisher(save);
  const url = urlEp(search) === '7' && listed;
  return { show: (live && !!best) || url, url, name: best ? best.name : null, slot: best ? best.slot : null };
}

/**
 * Every pack the quick start needs, up, with the ep4 to ep7 audio fragments in the engine's manifest. The ep6 hooks' readyPacks
 * brings up ep4, ep5 and ep6 (each through ensurePack, then its entry's register(engine)); then this pack the same way.
 * ensurePack is a no-op while a switch is off; the direct register(engine) calls make sure the registration and the audio
 * merge happened with THIS engine whatever path loaded a pack first. Resolves when the ep7 pack has registered.
 */
export async function readyPacks(engine) {
  await readyEp6(engine);
  await ensurePack('ep7', engine ? { engine } : {});
  await registerEp7(engine);
}

/** newGameEp7(name, { slot }), the field awake in the Cloudhouse Inn, after readyPacks. The run saves only to its own slot. */
export async function startEpisode7(engine, name, slot = 0) {
  const e = engine;
  await readyPacks(e);
  const g = newGameEp7(cleanName(name), { slot });
  e.game = g;
  return e.fadeTo(() => {
    if (e.hasScene('field')) e.reset('field', { map: g.map, mark: EP7_START.mark, dir: 'down' });
    else e.reset('_uiStage', {});
  }, { duration: 0.8 });
}

export const HOOKS = {
  offer: ep7Offer,
  start: startEpisode7,
  pickRunSlot,
  /** Add the row to a title scene (./title.js, E7-scene-ui). Resolves false while there is nothing to offer or no title code. */
  title(scene) {
    const e = scene && scene.engine;
    const offer = ep7Offer(e && e.save, typeof location !== 'undefined' ? location.search : '');
    if (!offer.show) return Promise.resolve(false);
    return import('./title.js').then((m) => (typeof m.offerRow === 'function' ? m.offerRow(scene, offer, HOOKS) : false))
      .catch((err) => { if (!isMissing(err, '/ep7/title.js')) console.warn('[ep7] title row', err); return false; });
  },
};

function installDebug(engine) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || typeof D.register !== 'function' || D.newGameEp7) return;
  /** LQ_DEBUG.newGameEp7(name, { slot, scene }): without `slot` it picks the run's own slot like the title does. Async. */
  D.register('newGameEp7', async (name = 'Hero', o = {}) => {
    const eng = engine || (typeof window !== 'undefined' && window.LQ_ENGINE) || null;
    let slot = o.slot;
    if (slot == null) {
      const pick = pickRunSlot(eng && eng.save);
      if (!pick.ok) return null;
      slot = pick.slot;
    }
    if (eng) await readyPacks(eng);
    const g = newGameEp7(name, { ...o, slot });
    if (!eng) return { map: g.map, slot, game: g };
    eng.game = g;
    if (o.scene === 'none' || !eng.hasScene('field')) return { map: g.map, slot };
    eng.reset('field', { map: g.map, mark: EP7_START.mark, dir: 'down' });
    return { map: g.map, slot };
  });
}

/**
 * A cold first entry (the ep6 pack's rule): the field waits at most 8 s for a map's packs (field.js loadMap), and on a slow phone
 * the chain ep3 to ep6 alone can take longer, so ep6_zl_inn, ep6_zl_charts or ep6_zephyr may come up as the ep6 pack registered
 * it, without this pack's patch (no wake trigger, no North dressing, no gangway). Once the ep7 pack is ready, a field still
 * standing on the unpatched module is re-entered where the party stands (the same-map dither), when it matters: the inn and the
 * Chart Room while ep7_morning is still to come, Zephyr Landing once Episode 7 has started. Only while EP7_LIVE (the patches
 * do nothing a player can reach before). Waits for the field to be idle (bounded). True when it re-entered.
 */
export const PATCHED_MAPS = ['ep6_zl_inn', 'ep6_zl_charts', 'ep6_zephyr'];
export function relandPatched(engine, tries = 40, live = EP7_LIVE) {
  const f = engine && (engine.stack || []).find((sc) => sc && sc.name === 'field');
  if (!live || !f || f.dead || !f.map || !f.game || !PATCHED_MAPS.includes(f.mapId)) return false;
  const mod = peekMap(f.mapId), fl = f.game.flags || {};
  if (!mod || f.map.mod === mod) return false;
  if (f.mapId === 'ep6_zephyr' ? !fl.ep7_started : !fl.ep6_complete || fl.ep7_morning_done) return false;
  const L = f.leader;
  if (f.loading || f.pendingWarp || f.inputLocked || (f.cutscene && f.cutscene.running) || engine.scene !== f || !L || L.moving) {
    if (tries > 0 && typeof engine.after === 'function') engine.after(30, () => relandPatched(engine, tries - 1, live));
    return false;
  }
  f.warpTo(f.mapId, L.tx, L.ty, L.dir, 'warp');
  return true;
}

let done = false;
let card6Off;   // CREDITS_HANDOFF[6].endCard as the ep6 pack left it (unregister puts it back)

/** Install every hook whose data exists. Idempotent. Returns { installed: [...], waiting: [...] }. opts.live: tests. */
export function register(engine, mods = {}, opts = {}) {
  const live = opts.live != null ? !!opts.live : EP7_LIVE;
  const installed = [], waiting = [];
  const h7 = handoff7(mods.text);
  if (h7) { if (!CREDITS_HANDOFF[7]) CREDITS_HANDOFF[7] = h7; installed.push('credits7'); } else waiting.push('credits7 (text.js CREDITS_EP7)');
  if (live && CREDITS_HANDOFF[6]) {
    if (card6Off === undefined) card6Off = CREDITS_HANDOFF[6].endCard;
    CREDITS_HANDOFF[6].endCard = (mods.text && mods.text.END_CARD_EP6_LIVE) || END_CARD_EP6_LIVE;
    installed.push('endcard6');
  }
  const q = mods.quests && mods.quests.MAIN_QUEST_EP7;
  if (q) { if (!QUEST_EXT.some(([f]) => f === 'ep7_started')) QUEST_EXT.unshift(['ep7_started', q]); installed.push('quest'); }
  else waiting.push('quest (quests.js MAIN_QUEST_EP7)');
  globalThis.LQ_EP7 = HOOKS;
  installed.push('title');
  // the developer entry ?ep=7 (once the maps are listed) opens the story's switch, as ?ep=6 does for Episode 6
  if (mods.story && mods.story.GATE && typeof location !== 'undefined' && /[?&]ep=7(&|$)/.test(location.search || '') && mapsListed()) mods.story.GATE.live = true;
  installDebug(engine);
  if (engine && !done) onPackReady('ep7', () => relandPatched(engine));
  done = true;
  return { installed, waiting };
}

/** Tests: take the global hooks away again and put the Episode 6 end card back (the tables keep entry 7, as a loaded pack's do). */
export function unregister() {
  if (globalThis.LQ_EP7 === HOOKS) delete globalThis.LQ_EP7;
  if (card6Off !== undefined && CREDITS_HANDOFF[6]) CREDITS_HANDOFF[6].endCard = card6Off;
  card6Off = undefined;
  done = false;
}
export function hooksInstalled() { return done; }

export default register;
