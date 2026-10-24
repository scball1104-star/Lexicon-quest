// The episode switch and the quick-start slot choice (E3-saves, EPISODE3_PLAN section 10). Pure: no DOM, no engine.
// `episodeOffers(save, search)` says which title rows to show; `pickRunSlot(save)` says where an Episode 3 quick start
// may save without ever touching another run. E3-integrate flips EP3_LIVE; nothing a player can reach changes before.
import * as encounters from '../data/encounters.js';

/** The master switch. While false: ep3_morning never runs, the sand gate stays chained, no Episode 3 row on the title. */
export const EP3_LIVE = false;

/** True once E3-battle/E3-maps list the Episode 3 zones in encounters.js (`EP3_MAPS_LISTED`); until then `?ep=3` shows nothing. */
export function ep3MapsListed() { return encounters.EP3_MAPS_LISTED === true; }

/** The title row and help for the Episode 3 quick start (shown by E3-scene-ui when `episodeOffers().ep3.show`). */
export const EP3_ROW_LABEL = 'Episode 3: new party';
export const EP3_ROW_HELP = 'A ready party at Lv 13. Your own save stays under Continue.';
export const SLOTS_FULL_NOTICE = 'Every save slot holds a game. Free one on the Load page first.';

function urlEp(search) {
  try { return new URLSearchParams(search || '').get('ep'); } catch (err) { return null; }
}

/** The newest save (slots 0..n) whose flags include `flag`: { slot, at, name } or null. */
function newestWith(save, flag) {
  let best = null;
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    let env = null;
    try { env = save.loadEnvelope(n); } catch (err) { env = null; }
    const d = env && env.data;
    if (!d || !d.flags || !d.flags[flag]) continue;
    const at = Date.parse(env.savedAt || '') || 0;
    if (!best || at > best.at) best = { slot: n, at, name: (env.meta && env.meta.name) || d.heroName || null };
  }
  return best;
}

/** { show, url, name, slot }: Episode 2 is offered; the newest `ep1_complete` save names the hero. Pure. */
export function ep2Offer(save, search = '') {
  const url = urlEp(search) === '2';
  const best = newestWith(save, 'ep1_complete');
  return { show: url || !!best, url, name: best ? best.name : null, slot: best ? best.slot : null };
}

/**
 * Both quick-start offers: { ep2, ep3 }. `ep2` is exactly ep2Offer. `ep3.show` is true when the switch is live and any
 * slot has `ep2_complete`, or with `?ep=3` once the Episode 3 maps are listed (a developer entry). `opts.live` and
 * `opts.mapsListed` override the module switches (tests). Pure.
 */
export function episodeOffers(save, search = '', opts = {}) {
  const live = opts.live != null ? !!opts.live : EP3_LIVE;
  const listed = opts.mapsListed != null ? !!opts.mapsListed : ep3MapsListed();
  const best = newestWith(save, 'ep2_complete');
  const url = urlEp(search) === '3' && listed;
  const show = (live && !!best) || url;
  return {
    ep2: ep2Offer(save, search),
    ep3: { show, url, name: best ? best.name : null, slot: best ? best.slot : null },
  };
}

/** True when slot n holds anything (a readable game or unreadable bytes: both are someone's save). */
function occupied(save, n) {
  try {
    if (typeof save.exists === 'function') return !!save.exists(n);
    return !!save.loadEnvelope(n);
  } catch (err) { return true; }
}

/**
 * Where an Episode 3 quick start may save its run (plan 10.3). Slot 0 if empty; else the first empty manual slot with
 * a one-line notice; else a refusal. It never offers Replace and never names an occupied slot. Pure.
 *   { ok: true, slot: 0, notice: null } | { ok: true, slot: n, notice } | { ok: false, slot: null, notice }
 */
export function pickRunSlot(save) {
  if (!save) return { ok: false, slot: null, notice: SLOTS_FULL_NOTICE };
  if (!occupied(save, 0)) return { ok: true, slot: 0, notice: null };
  const n = Number.isFinite(save.slots) ? save.slots : 3;
  for (let i = 1; i <= n; i++) {
    if (!occupied(save, i)) return { ok: true, slot: i, notice: `This party will save to slot ${i}.` };
  }
  return { ok: false, slot: null, notice: SLOTS_FULL_NOTICE };
}
