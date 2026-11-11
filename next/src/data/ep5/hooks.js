// The ep5 pack's hooks into the shell (E5-pack; docs/EPISODE5_PLAN.md 5.3, 10 and 13.2). index.js runs register(engine, mods)
// after every data module, so the other agents' exports are in `mods` (each one optional: a missing module or export only
// skips its hook, reported in the result's `waiting`).
//
//   CREDITS_HANDOFF[5]        story.js reads it (creditsPending by `flag`): CREDITS_EP5 and END_CARD_EP5 from text.js (E5-story)
//   CREDITS_HANDOFF[4].endCard  END_CARD_EP4_LIVE while EP5_LIVE ("Episode 5 begins in the morning."); unchanged while off
//   QUEST_EXT                 ['ep5_started', MAIN_QUEST_EP5] from quests.js (E5-story), ahead of Episode 4's entry
//   globalThis.LQ_EP5         { title(scene), offer(save, search), start(engine, name, slot), pickRunSlot }: scenes/title.js
//                             calls LQ_EP5.title(this); the row, picker and name entry are ./title.js (E5-scene-ui), loaded on
//                             first use
//   LQ_DEBUG.newGameEp5       async (name, { slot, scene: 'field' | 'none' }) -> { map, slot } | null when every slot is full
//
// The quick start (start, LQ_DEBUG.newGameEp5) brings up the ep4 pack and then this one, with both audio fragments merged into
// the engine's manifest, BEFORE the fade in (PLAYTEST_REVIEW_6 fix 3: a quick-start party heard no Episode 4 sound).
import { CREDITS_HANDOFF } from '../../game/story.js';
import { QUEST_EXT } from '../quests.js';
import { EP5_LIVE, pickRunSlot } from '../../game/episodes.js';
import { ensurePack, onPackReady } from '../../game/packs.js';
import { peekMap } from '../../world/maps.js';
import { cleanName } from '../../game/state.js';
import { END_CARD_EP4 } from '../ep4/text.js';
import { register as registerEp4 } from '../ep4/index.js';
import { newGameEp5, EP5_START } from './start.js';
import { mapsListed, isMissing, register as registerEp5 } from './index.js';

/** The Episode 4 end card once Episode 5 is live (EPISODE5_PLAN 5.3). */
export const END_CARD_EP4_LIVE = { ...END_CARD_EP4, sub: 'Episode 5 begins at sea.' };
/** Where the Episode 4 credits wake the party while Episode 5 is live (issue #99), and where they did before. */
export const OPENING5 = { map: 'ep5_ship', mark: 'deck_start' };
export const EP4_WAKE_OFF = { map: 'ep4_vw_inn', mark: 'inn_bed' };
export const EP5_ROW_LABEL = 'Episode 5: new party';
export const EP5_ROW_HELP = 'A ready party at Lv 21. Your own save stays under Continue.';

/** The handoff entry for Episode 5, or null while text.js has no CREDITS_EP5 (plan 5.3). */
export function handoff5(text) {
  if (!text || !Array.isArray(text.CREDITS_EP5)) return null;
  return { cards: text.CREDITS_EP5, music: 'saffron', map: 'ep5_sh_inn', mark: 'inn_bed', counter: 'credits5_rolled',
    endCard: text.END_CARD_EP5 || null, flag: 'ep5_complete' };
}

function urlEp(search) { try { return new URLSearchParams(search || '').get('ep'); } catch (err) { return null; } }

/** The newest base-game slot with ep4_complete ({ slot, name } or null). A Fine Print run never offers Episode 5 (EPISODE5 10.11). */
function newestFinisher(save) {
  let best = null;
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    let env = null;
    try { env = save.loadEnvelope(n); } catch (err) { env = null; }
    const d = env && env.data;
    if (!d || !d.flags || !d.flags.ep4_complete || d.flags.tier_1) continue;
    const at = Date.parse(env.savedAt || '') || 0;
    if (!best || at > best.at) best = { slot: n, at, name: (env.meta && env.meta.name) || d.heroName || null };
  }
  return best;
}

/**
 * The Episode 5 title row: { show, url, name, slot }. Shown when the switch is live and a (base game) slot has ep4_complete,
 * or with `?ep=5` once the Episode 5 maps are listed (a developer entry). opts.live / opts.mapsListed override (tests). Pure.
 */
export function ep5Offer(save, search = '', opts = {}) {
  const live = opts.live != null ? !!opts.live : EP5_LIVE;
  const listed = opts.mapsListed != null ? !!opts.mapsListed : mapsListed();
  const best = newestFinisher(save);
  const url = urlEp(search) === '5' && listed;
  return { show: (live && !!best) || url, url, name: best ? best.name : null, slot: best ? best.slot : null };
}

/**
 * Both packs up and both audio fragments in the engine's manifest. ensurePack brings each pack's art, tiles and audio (and is a
 * no-op while a switch is off); the direct register(engine) calls make sure the registration and the audio merge happened with
 * THIS engine whatever path loaded the pack first. Resolves when the ep5 pack has registered; rejects only if a register fails.
 */
export async function readyPacks(engine) {
  const o = engine ? { engine } : {};
  await ensurePack('ep4', o);
  await registerEp4(engine);
  await ensurePack('ep5', o);
  await registerEp5(engine);
}

/** newGameEp5(name, { slot }), the field awake in the Floodwatch Inn, after readyPacks. The run saves only to its own slot. */
export async function startEpisode5(engine, name, slot = 0) {
  const e = engine;
  await readyPacks(e);
  const g = newGameEp5(cleanName(name), { slot });
  e.game = g;
  return e.fadeTo(() => {
    if (e.hasScene('field')) e.reset('field', { map: g.map, mark: EP5_START.mark, dir: 'down' });
    else e.reset('_uiStage', {});
  }, { duration: 0.8 });
}

export const HOOKS = {
  offer: ep5Offer,
  start: startEpisode5,
  pickRunSlot,
  /** Add the row to a title scene (./title.js, E5-scene-ui). Resolves false while there is nothing to offer or no title code. */
  title(scene) {
    const e = scene && scene.engine;
    const offer = ep5Offer(e && e.save, typeof location !== 'undefined' ? location.search : '');
    if (!offer.show) return Promise.resolve(false);
    return import('./title.js').then((m) => (typeof m.offerRow === 'function' ? m.offerRow(scene, offer, HOOKS) : false))
      .catch((err) => { if (!isMissing(err, '/ep5/title.js')) console.warn('[ep5] title row', err); return false; });
  },
};

function installDebug(engine) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || typeof D.register !== 'function' || D.newGameEp5) return;
  /** LQ_DEBUG.newGameEp5(name, { slot, scene }): without `slot` it picks the run's own slot like the title does. Async. */
  D.register('newGameEp5', async (name = 'Hero', o = {}) => {
    const eng = engine || (typeof window !== 'undefined' && window.LQ_ENGINE) || null;
    let slot = o.slot;
    if (slot == null) {
      const pick = pickRunSlot(eng && eng.save);
      if (!pick.ok) return null;
      slot = pick.slot;
    }
    if (eng) await readyPacks(eng);
    const g = newGameEp5(name, { ...o, slot });
    if (!eng) return { map: g.map, slot, game: g };
    eng.game = g;
    if (o.scene === 'none' || !eng.hasScene('field')) return { map: g.map, slot };
    eng.reset('field', { map: g.map, mark: EP5_START.mark, dir: 'down' });
    return { map: g.map, slot };
  });
}

/**
 * A cold first entry (E5-integrate): the field waits at most 8 s for a map's packs (field.js loadMap), and on a slow phone the
 * ep4 pack alone can take longer, so ep4_vw_inn or ep4_valewyn may come up as the ep4 pack registered it, without this pack's
 * patch (no wake trigger, no berth). Once the ep5 pack is ready, a field still standing on the unpatched module is re-entered
 * where the party stands (the same-map dither), when it matters: the inn while ep5_morning is still to come, Valewyn once
 * Episode 5 has started. Waits for the field to be idle (bounded). Returns true when it re-entered.
 */
export const PATCHED_MAPS = ['ep4_vw_inn', 'ep4_valewyn'];
export function relandPatched(engine, tries = 40) {
  const f = engine && (engine.stack || []).find((sc) => sc && sc.name === 'field');
  if (!f || f.dead || !f.map || !f.game || !PATCHED_MAPS.includes(f.mapId)) return false;
  const mod = peekMap(f.mapId), fl = f.game.flags || {};
  if (!mod || f.map.mod === mod) return false;
  if (f.mapId === 'ep4_vw_inn' ? !fl.ep4_complete || fl.ep5_morning_done : !fl.ep5_started) return false;
  const L = f.leader;
  if (f.loading || f.pendingWarp || f.inputLocked || (f.cutscene && f.cutscene.running) || engine.scene !== f || !L || L.moving) {
    if (tries > 0 && typeof engine.after === 'function') engine.after(30, () => relandPatched(engine, tries - 1));
    return false;
  }
  f.warpTo(f.mapId, L.tx, L.ty, L.dir, 'warp');
  return true;
}

let done = false;
let card4Off;   // CREDITS_HANDOFF[4].endCard as the ep4 pack left it (unregister puts it back)

/** Install every hook whose data exists. Idempotent. Returns { installed: [...], waiting: [...] }. */
export function register(engine, mods = {}) {
  const installed = [], waiting = [];
  const h5 = handoff5(mods.text);
  if (h5) { if (!CREDITS_HANDOFF[5]) CREDITS_HANDOFF[5] = h5; installed.push('credits5'); } else waiting.push('credits5 (text.js CREDITS_EP5)');
  if (EP5_LIVE && CREDITS_HANDOFF[4]) {
    if (card4Off === undefined) card4Off = CREDITS_HANDOFF[4].endCard;
    CREDITS_HANDOFF[4].endCard = (mods.text && mods.text.END_CARD_EP4_LIVE) || END_CARD_EP4_LIVE;
    installed.push('endcard4');
    // issue #99: the Episode 4 credits wake the party aboard Yara's ship at night, not in the Floodwatch Inn
    Object.assign(CREDITS_HANDOFF[4], OPENING5);
    installed.push('opening5');
  }
  const q = mods.quests && mods.quests.MAIN_QUEST_EP5;
  if (q) { if (!QUEST_EXT.some(([f]) => f === 'ep5_started')) QUEST_EXT.unshift(['ep5_started', q]); installed.push('quest'); }
  else waiting.push('quest (quests.js MAIN_QUEST_EP5)');
  globalThis.LQ_EP5 = HOOKS;
  installed.push('title');
  // the developer entry ?ep=5 (once the maps are listed) opens the story's switch, as ?ep=4 does for Episode 4 (ep4/scene.js)
  if (mods.story && mods.story.GATE && typeof location !== 'undefined' && /[?&]ep=5(&|$)/.test(location.search || '') && mapsListed()) mods.story.GATE.live = true;
  installDebug(engine);
  if (engine && !done) onPackReady('ep5', () => relandPatched(engine));
  done = true;
  return { installed, waiting };
}

/** Tests: take the global hooks away again and put the Episode 4 end card back (the tables keep entry 5, as a loaded pack's do). */
export function unregister() {
  if (globalThis.LQ_EP5 === HOOKS) delete globalThis.LQ_EP5;
  if (card4Off !== undefined && CREDITS_HANDOFF[4]) Object.assign(CREDITS_HANDOFF[4], { endCard: card4Off }, EP4_WAKE_OFF);
  card4Off = undefined;
  done = false;
}
export function hooksInstalled() { return done; }

export default register;
