// The ep6 pack's hooks into the shell (E6-pack; docs/EPISODE6_PLAN.md 5.3, 10 and 13.2). index.js runs register(engine, mods)
// after every data module, so the other agents' exports are in `mods` (each one optional: a missing module or export only
// skips its hook, reported in the result's `waiting`).
//
//   CREDITS_HANDOFF[6]        story.js reads it (creditsPending by `flag`): CREDITS_EP6 and END_CARD_EP6 from text.js (E6-story)
//   CREDITS_HANDOFF[5].endCard  END_CARD_EP5_LIVE while EP6_LIVE ("Episode 6 begins in the morning."); unchanged while off
//   QUEST_EXT                 ['ep6_started', MAIN_QUEST_EP6] from quests.js (E6-story), ahead of Episode 5's entry
//   globalThis.LQ_EP6         { title(scene), offer(save, search), start(engine, name, slot), pickRunSlot }: scenes/title.js
//                             calls LQ_EP6.title(this); the row, picker and name entry are ./title.js (E6-scene-ui), loaded on
//                             first use
//   LQ_DEBUG.newGameEp6       async (name, { slot, scene: 'field' | 'none' }) -> { map, slot } | null when every slot is full
//
// The quick start (start, LQ_DEBUG.newGameEp6) brings up the ep5 pack (which brings up ep4) and then this one, with the ep4,
// ep5 and ep6 audio fragments merged into the engine's manifest, BEFORE the fade in (PLAYTEST_REVIEW_6 fix 3).
import { CREDITS_HANDOFF } from '../../game/story.js';
import { QUEST_EXT } from '../quests.js';
import { EP6_LIVE, pickRunSlot } from '../../game/episodes.js';
import { ensurePack, onPackReady } from '../../game/packs.js';
import { peekMap } from '../../world/maps.js';
import { cleanName } from '../../game/state.js';
import { END_CARD_EP5 } from '../ep5/text.js';
import { readyPacks as readyEp5 } from '../ep5/hooks.js';
import { newGameEp6, EP6_START } from './start.js';
import { mapsListed, isMissing, register as registerEp6 } from './index.js';

/** The Episode 5 end card once Episode 6 is live (EPISODE6_PLAN 5.3). */
export const END_CARD_EP5_LIVE = { ...END_CARD_EP5, sub: 'Episode 6 begins in the morning.' };
export const EP6_ROW_LABEL = 'Episode 6: new party';
export const EP6_ROW_HELP = 'A ready party at Lv 25. Your own save stays under Continue.';

/** The handoff entry for Episode 6, or null while text.js has no CREDITS_EP6 (plan 5.3). */
export function handoff6(text) {
  if (!text || !Array.isArray(text.CREDITS_EP6)) return null;
  return { cards: text.CREDITS_EP6, music: 'zephyr', map: 'ep6_zl_inn', mark: 'inn_bed', counter: 'credits6_rolled',
    endCard: text.END_CARD_EP6 || null, flag: 'ep6_complete' };
}

function urlEp(search) { try { return new URLSearchParams(search || '').get('ep'); } catch (err) { return null; } }

/** The newest base-game slot with ep5_complete ({ slot, name } or null). A Fine Print run never offers Episode 6 (plan 10.7). */
function newestFinisher(save) {
  let best = null;
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    let env = null;
    try { env = save.loadEnvelope(n); } catch (err) { env = null; }
    const d = env && env.data;
    if (!d || !d.flags || !d.flags.ep5_complete || d.flags.tier_1) continue;
    const at = Date.parse(env.savedAt || '') || 0;
    if (!best || at > best.at) best = { slot: n, at, name: (env.meta && env.meta.name) || d.heroName || null };
  }
  return best;
}

/**
 * The Episode 6 title row: { show, url, name, slot }. Shown when the switch is live and a (base game) slot has ep5_complete,
 * or with `?ep=6` once the Episode 6 maps are listed (a developer entry). opts.live / opts.mapsListed override (tests). Pure.
 */
export function ep6Offer(save, search = '', opts = {}) {
  const live = opts.live != null ? !!opts.live : EP6_LIVE;
  const listed = opts.mapsListed != null ? !!opts.mapsListed : mapsListed();
  const best = newestFinisher(save);
  const url = urlEp(search) === '6' && listed;
  return { show: (live && !!best) || url, url, name: best ? best.name : null, slot: best ? best.slot : null };
}

/**
 * Every pack the quick start needs, up, with the ep4, ep5 and ep6 audio fragments in the engine's manifest. The ep5 hooks'
 * readyPacks brings up ep4 and ep5 (each through ensurePack, then its entry's register(engine)); then this pack the same way.
 * ensurePack is a no-op while a switch is off; the direct register(engine) calls make sure the registration and the audio
 * merge happened with THIS engine whatever path loaded a pack first. Resolves when the ep6 pack has registered.
 */
export async function readyPacks(engine) {
  await readyEp5(engine);
  await ensurePack('ep6', engine ? { engine } : {});
  await registerEp6(engine);
}

/** newGameEp6(name, { slot }), the field awake in the Dune Lantern Rest, after readyPacks. The run saves only to its own slot. */
export async function startEpisode6(engine, name, slot = 0) {
  const e = engine;
  await readyPacks(e);
  const g = newGameEp6(cleanName(name), { slot });
  e.game = g;
  return e.fadeTo(() => {
    if (e.hasScene('field')) e.reset('field', { map: g.map, mark: EP6_START.mark, dir: 'down' });
    else e.reset('_uiStage', {});
  }, { duration: 0.8 });
}

export const HOOKS = {
  offer: ep6Offer,
  start: startEpisode6,
  pickRunSlot,
  /** Add the row to a title scene (./title.js, E6-scene-ui). Resolves false while there is nothing to offer or no title code. */
  title(scene) {
    const e = scene && scene.engine;
    const offer = ep6Offer(e && e.save, typeof location !== 'undefined' ? location.search : '');
    if (!offer.show) return Promise.resolve(false);
    return import('./title.js').then((m) => (typeof m.offerRow === 'function' ? m.offerRow(scene, offer, HOOKS) : false))
      .catch((err) => { if (!isMissing(err, '/ep6/title.js')) console.warn('[ep6] title row', err); return false; });
  },
};

function installDebug(engine) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || typeof D.register !== 'function' || D.newGameEp6) return;
  /** LQ_DEBUG.newGameEp6(name, { slot, scene }): without `slot` it picks the run's own slot like the title does. Async. */
  D.register('newGameEp6', async (name = 'Hero', o = {}) => {
    const eng = engine || (typeof window !== 'undefined' && window.LQ_ENGINE) || null;
    let slot = o.slot;
    if (slot == null) {
      const pick = pickRunSlot(eng && eng.save);
      if (!pick.ok) return null;
      slot = pick.slot;
    }
    if (eng) await readyPacks(eng);
    const g = newGameEp6(name, { ...o, slot });
    if (!eng) return { map: g.map, slot, game: g };
    eng.game = g;
    if (o.scene === 'none' || !eng.hasScene('field')) return { map: g.map, slot };
    eng.reset('field', { map: g.map, mark: EP6_START.mark, dir: 'down' });
    return { map: g.map, slot };
  });
}

/**
 * A cold first entry (the ep5 pack's rule, E5-integrate): the field waits at most 8 s for a map's packs (field.js loadMap), and
 * on a slow phone the chain ep3, ep4, ep5 alone can take longer, so ep5_sh_inn or ep5_saffron may come up as the ep5 pack
 * registered it, without this pack's patch (no wake trigger, no berth). Once the ep6 pack is ready, a field still standing on
 * the unpatched module is re-entered where the party stands (the same-map dither), when it matters: the inn while ep6_morning
 * is still to come, Saffron Haven once Episode 6 has started. Waits for the field to be idle (bounded). True when it re-entered.
 */
export const PATCHED_MAPS = ['ep5_sh_inn', 'ep5_saffron'];
export function relandPatched(engine, tries = 40) {
  const f = engine && (engine.stack || []).find((sc) => sc && sc.name === 'field');
  if (!f || f.dead || !f.map || !f.game || !PATCHED_MAPS.includes(f.mapId)) return false;
  const mod = peekMap(f.mapId), fl = f.game.flags || {};
  if (!mod || f.map.mod === mod) return false;
  if (f.mapId === 'ep5_sh_inn' ? !fl.ep5_complete || fl.ep6_morning_done : !fl.ep6_started) return false;
  const L = f.leader;
  if (f.loading || f.pendingWarp || f.inputLocked || (f.cutscene && f.cutscene.running) || engine.scene !== f || !L || L.moving) {
    if (tries > 0 && typeof engine.after === 'function') engine.after(30, () => relandPatched(engine, tries - 1));
    return false;
  }
  f.warpTo(f.mapId, L.tx, L.ty, L.dir, 'warp');
  return true;
}

let done = false;
let card5Off;   // CREDITS_HANDOFF[5].endCard as the ep5 pack left it (unregister puts it back)

/** Install every hook whose data exists. Idempotent. Returns { installed: [...], waiting: [...] }. */
export function register(engine, mods = {}) {
  const installed = [], waiting = [];
  const h6 = handoff6(mods.text);
  if (h6) { if (!CREDITS_HANDOFF[6]) CREDITS_HANDOFF[6] = h6; installed.push('credits6'); } else waiting.push('credits6 (text.js CREDITS_EP6)');
  if (EP6_LIVE && CREDITS_HANDOFF[5]) {
    if (card5Off === undefined) card5Off = CREDITS_HANDOFF[5].endCard;
    CREDITS_HANDOFF[5].endCard = (mods.text && mods.text.END_CARD_EP5_LIVE) || END_CARD_EP5_LIVE;
    installed.push('endcard5');
  }
  const q = mods.quests && mods.quests.MAIN_QUEST_EP6;
  if (q) { if (!QUEST_EXT.some(([f]) => f === 'ep6_started')) QUEST_EXT.unshift(['ep6_started', q]); installed.push('quest'); }
  else waiting.push('quest (quests.js MAIN_QUEST_EP6)');
  globalThis.LQ_EP6 = HOOKS;
  installed.push('title');
  // the developer entry ?ep=6 (once the maps are listed) opens the story's switch, as ?ep=5 does for Episode 5
  if (mods.story && mods.story.GATE && typeof location !== 'undefined' && /[?&]ep=6(&|$)/.test(location.search || '') && mapsListed()) mods.story.GATE.live = true;
  installDebug(engine);
  if (engine && !done) onPackReady('ep6', () => relandPatched(engine));
  done = true;
  return { installed, waiting };
}

/** Tests: take the global hooks away again and put the Episode 5 end card back (the tables keep entry 6, as a loaded pack's do). */
export function unregister() {
  if (globalThis.LQ_EP6 === HOOKS) delete globalThis.LQ_EP6;
  if (card5Off !== undefined && CREDITS_HANDOFF[5]) CREDITS_HANDOFF[5].endCard = card5Off;
  card5Off = undefined;
  done = false;
}
export function hooksInstalled() { return done; }

export default register;
