// The ep4 pack's hooks into the shell (E4-pack; docs/EPISODE4_PLAN.md 5.3, 10 and 13.2). index.js runs register(engine, mods)
// after every data module, so the other agents' exports are in `mods` (each one optional: a missing module or export only
// skips its hook, reported in the result's `waiting`).
//
//   CREDITS_HANDOFF[4]        story.js reads it (creditsPending by `flag`): CREDITS_EP4 and END_CARD_EP4 from text.js (E4-story)
//   CREDITS_HANDOFF[3].endCard  END_CARD_EP3_LIVE while EP4_LIVE ("Episode 4 begins in the morning."); unchanged while off
//   QUEST_EXT                 ['ep4_started', MAIN_QUEST_EP4] from quests.js (E4-story): mainQuestFor switches on ep4_started
//   globalThis.LQ_EP4         { title(scene), offer(save, search), start(engine, name, slot) }: scenes/title.js calls
//                             LQ_EP4.title(this); the row, picker and name entry are ./title.js (E4-scene-ui), loaded on first use
//   LQ_DEBUG.newGameEp4       (name, { slot, scene: 'field' | 'none' }) -> { map, slot } | null when every slot is full
import { CREDITS_HANDOFF } from '../../game/story.js';
import { QUEST_EXT } from '../quests.js';
import { EP4_LIVE, pickRunSlot } from '../../game/episodes.js';
import { packsToAwait, awaitPacks } from '../../game/packs.js';
import { cleanName } from '../../game/state.js';
import { END_CARD_EP3 } from '../text.js';
import { newGameEp4, EP4_START } from './start.js';
import { mapsListed } from './index.js';

/** The Episode 3 end card once Episode 4 is live (EPISODE4_PLAN 5.3). */
export const END_CARD_EP3_LIVE = { ...END_CARD_EP3, sub: 'Episode 4 begins in the morning.' };
export const EP3_END_CARD_OFF = END_CARD_EP3;
export const EP4_ROW_LABEL = 'Episode 4: new party';
export const EP4_ROW_HELP = 'A ready party at Lv 17. Your own save stays under Continue.';

/** The handoff entry for Episode 4, or null while text.js has no CREDITS_EP4. */
export function handoff4(text) {
  if (!text || !Array.isArray(text.CREDITS_EP4)) return null;
  return { cards: text.CREDITS_EP4, music: 'valewyn', map: 'ep4_vw_inn', mark: 'inn_bed', counter: 'credits4_rolled',
    endCard: text.END_CARD_EP4 || null, flag: 'ep4_complete' };
}

function urlEp(search) { try { return new URLSearchParams(search || '').get('ep'); } catch (err) { return null; } }

/** The newest slot whose flags include `flag`: { slot, name } or null. */
function newestWith(save, flag) {
  let best = null;
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    let env = null;
    try { env = save.loadEnvelope(n); } catch (err) { env = null; }
    const d = env && env.data;
    if (!d || !d.flags || !d.flags[flag] || d.flags.tier_1) continue;   // a Fine Print run never offers Episode 4 (EPISODE4 10.6)
    const at = Date.parse(env.savedAt || '') || 0;
    if (!best || at > best.at) best = { slot: n, at, name: (env.meta && env.meta.name) || d.heroName || null };
  }
  return best;
}

/**
 * The Episode 4 title row: { show, url, name, slot }. Shown when the switch is live and a (base game) slot has ep3_complete,
 * or with `?ep=4` once the Episode 4 maps are listed (a developer entry). opts.live / opts.mapsListed override (tests). Pure.
 */
export function ep4Offer(save, search = '', opts = {}) {
  const live = opts.live != null ? !!opts.live : EP4_LIVE;
  const listed = opts.mapsListed != null ? !!opts.mapsListed : mapsListed();
  const best = newestWith(save, 'ep3_complete');
  const url = urlEp(search) === '4' && listed;
  return { show: (live && !!best) || url, url, name: best ? best.name : null, slot: best ? best.slot : null };
}

/** newGameEp4(name, { slot }), the field awake in the Signless Inn. The run saves only to its own slot. */
export function startEpisode4(engine, name, slot = 0) {
  const e = engine;
  const g = newGameEp4(cleanName(name), { slot });
  e.game = g;
  return e.fadeTo(() => {
    const enter = () => {
      if (e.hasScene('field')) e.reset('field', { map: g.map, mark: EP4_START.mark, dir: 'down' });
      else e.reset('_uiStage', {});
    };
    const ids = packsToAwait(g.flags);
    return ids.length ? awaitPacks(ids).then(enter) : enter();
  }, { duration: 0.8 });
}

export const HOOKS = {
  offer: ep4Offer,
  start: startEpisode4,
  pickRunSlot,
  /** Add the row to a title scene (./title.js, E4-scene-ui). Resolves false while there is nothing to offer or no title code. */
  title(scene) {
    const e = scene && scene.engine;
    const offer = ep4Offer(e && e.save, typeof location !== 'undefined' ? location.search : '');
    if (!offer.show) return Promise.resolve(false);
    return import('./title.js').then((m) => (typeof m.offerRow === 'function' ? m.offerRow(scene, offer, HOOKS) : false))
      .catch((err) => { console.warn('[ep4] title row', err); return false; });
  },
};

function installDebug(engine) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || typeof D.register !== 'function' || D.newGameEp4) return;
  /** LQ_DEBUG.newGameEp4(name, { slot, scene }): without `slot` it picks the run's own slot like the title does. */
  D.register('newGameEp4', (name = 'Hero', o = {}) => {
    const eng = engine || (typeof window !== 'undefined' && window.LQ_ENGINE) || null;
    let slot = o.slot;
    if (slot == null) {
      const pick = pickRunSlot(eng && eng.save);
      if (!pick.ok) return null;
      slot = pick.slot;
    }
    const g = newGameEp4(name, { ...o, slot });
    if (!eng) return { map: g.map, slot, game: g };
    eng.game = g;
    if (o.scene === 'none' || !eng.hasScene('field')) return { map: g.map, slot };
    eng.reset('field', { map: g.map, mark: EP4_START.mark, dir: 'down' });
    return { map: g.map, slot };
  });
}

let done = false;
/** Install every hook whose data exists. Idempotent. Returns { installed: [...], waiting: [...] }. */
export function register(engine, mods = {}) {
  const installed = [], waiting = [];
  const h4 = handoff4(mods.text);
  if (h4) { if (!CREDITS_HANDOFF[4]) CREDITS_HANDOFF[4] = h4; installed.push('credits4'); } else waiting.push('credits4 (text.js CREDITS_EP4)');
  if (EP4_LIVE) {
    CREDITS_HANDOFF[3].endCard = (mods.text && mods.text.END_CARD_EP3_LIVE) || END_CARD_EP3_LIVE;
    installed.push('endcard3');
  }
  const q = mods.quests && mods.quests.MAIN_QUEST_EP4;
  if (q) { if (!QUEST_EXT.some(([f]) => f === 'ep4_started')) QUEST_EXT.unshift(['ep4_started', q]); installed.push('quest'); }
  else waiting.push('quest (quests.js MAIN_QUEST_EP4)');
  globalThis.LQ_EP4 = HOOKS;
  installed.push('title');
  installDebug(engine);
  done = true;
  return { installed, waiting };
}

/** Tests: take the global hooks away again and put the Episode 3 end card back (the tables keep entry 4, as a loaded pack's do). */
export function unregister() {
  if (globalThis.LQ_EP4 === HOOKS) delete globalThis.LQ_EP4;
  CREDITS_HANDOFF[3].endCard = EP3_END_CARD_OFF;
  done = false;
}
export function hooksInstalled() { return done; }

export default register;
