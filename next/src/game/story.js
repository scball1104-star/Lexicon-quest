// Story glue for the field: scenes, inspect text, books, barks, flag-driven banners/music/tints, credits handoffs.

import { scenes as EP1_SCENES, lines as EP1_LINES } from '../data/story/ep1.js';
import { scenes as EP2_SCENES, lines as EP2_LINES } from '../data/story/ep2.js';
import { scenes as EP3_SCENES, lines as EP3_LINES, SCENE_CONDITIONS as EP3_CONDITIONS, GATE as EP3_GATE } from '../data/story/ep3.js';
import { BOOKS, BANNERS, BARKS, CREDITS, CREDITS_EP2, END_CARD_EP2, CREDITS_EP3, END_CARD_EP3, END_CARD_EP2_LIVE } from '../data/text.js';
import { EP3_LIVE } from './episodes.js';
import { SCENE_CONDITIONS as EP1_CONDITIONS } from '../data/story/ep1.js';
import { SCENE_CONDITIONS as EP2_CONDITIONS } from '../data/story/ep2.js';
import { resolve, pick, matches } from '../data/story/dialogue.js';
import { speakerName } from '../data/npcs.js';

export { CREDITS, CREDITS_EP2, CREDITS_EP3, BANNERS };

/** Every scene and inspect line id of the three episodes (ids never collide: qa/content and qa/world test it). */
export const SCENES = { ...EP1_SCENES, ...EP2_SCENES, ...EP3_SCENES };
export const LINES = { ...EP1_LINES, ...EP2_LINES, ...EP3_LINES };
const BASE_CONDITIONS = { ...EP1_CONDITIONS, ...EP2_CONDITIONS, ...EP3_CONDITIONS };
// Pack scenes (XP-packs): a pack's story module calls registerStory({ scenes, lines, conditions }) from its register().
const EXTRA_CONDITIONS = {};
const registered = { scenes: [], lines: [] };   // ids a pack tried to register that already belonged to something else

/** Add a pack's scenes, lines and guards; a taken id is never overwritten (reported). Returns the collided ids. */
export function registerStory({ scenes = {}, lines = {}, conditions = {} } = {}) {
  const out = { scenes: [], lines: [], conditions: [] };
  const put = (table, id, v, bucket) => {
    if (id in table) { if (table[id] !== v) { bucket.push(id); } return; }
    table[id] = v;
  };
  for (const [id, v] of Object.entries(scenes)) put(SCENES, id, v, out.scenes);
  for (const [id, v] of Object.entries(lines)) put(LINES, id, v, out.lines);
  for (const [id, c] of Object.entries(conditions)) {
    if (id in BASE_CONDITIONS) { out.conditions.push(id); continue; }
    put(EXTRA_CONDITIONS, id, c, out.conditions);
  }
  for (const id of out.scenes) if (!registered.scenes.includes(id)) registered.scenes.push(id);
  for (const id of out.lines) if (!registered.lines.includes(id)) registered.lines.push(id);
  return out;
}

/** Ids defined by two episodes, or registered by a pack over an existing id (should stay empty; a collision means one shadows the other). */
export function storyCollisions() {
  const sc = [...Object.keys(EP2_SCENES).filter((k) => k in EP1_SCENES), ...Object.keys(EP3_SCENES).filter((k) => k in EP1_SCENES || k in EP2_SCENES)];
  const li = [...Object.keys(EP2_LINES).filter((k) => k in EP1_LINES), ...Object.keys(EP3_LINES).filter((k) => k in EP1_LINES || k in EP2_LINES)];
  return { scenes: [...sc, ...registered.scenes], lines: [...li, ...registered.lines] };
}

/** Would the scene's own guard let it run now (SCENE_CONDITIONS)? */
export function sceneAllowed(id, hasFlag) {
  const c = BASE_CONDITIONS[id] || EXTRA_CONDITIONS[id];
  if (!c) return !!SCENES[id];
  if (c.live && !EP3_GATE.live) return false;
  const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  return list(c.if).every((f) => hasFlag(f)) && !list(c.ifNot).some((f) => hasFlag(f));
}

/** The scripted scene for an id (already wrapped with its guard and input lock), or null. */
export function sceneById(id) { return SCENES[id] || null; }
export function sceneIds() { return Object.keys(SCENES); }

/** Inspect text as dialogue boxes [{ who, text }] (narration unless a line names a speaker). */
export function inspectBoxes(lineId, hasFlag) {
  const v = LINES[lineId];
  if (v == null) return [{ who: null, text: `(${lineId})` }];
  return resolve(v, hasFlag, null);
}

/** A plain value, or the first matching entry of a conditional list [{ if, ifNot, id }] (null when none). */
export function pickConditional(value, hasFlag) {
  if (!Array.isArray(value)) return value;
  for (const e of value) {
    if (e == null) continue;
    if (typeof e !== 'object') return e;
    if ((e.if == null && e.ifNot == null) || (hasFlag && matches(e, hasFlag))) return e.id ?? e.value ?? null;
  }
  return null;
}

/** A book as boxes: gold title, then each page as narration. */
export function bookBoxes(bookId) {
  const b = BOOKS[bookId];
  if (!b) return [{ who: null, text: `(${bookId})` }];
  return [{ who: null, text: `{c:gold}${b.title}{/c}` }, ...b.pages.map((p) => ({ who: null, text: p }))];
}

/** Banner { title, sub } for a map: BANNERS[id].states first match, else the base title or module name. */
export function bannerFor(mapId, mod, hasFlag) {
  const b = BANNERS[mapId];
  if (b) {
    if (hasFlag && Array.isArray(b.states)) {
      for (const st of b.states) if (st && matches(st, hasFlag)) return { title: st.title || b.title, sub: st.sub === undefined ? b.sub || null : st.sub || null };
    }
    return { title: b.title, sub: b.sub || null };
  }
  return mod && mod.name ? { title: mod.name, sub: null } : null;
}

/** A first-time companion remark's boxes (once per save, recorded in counters). */
export function takeBark(game, key, hasFlag) {
  const entries = BARKS[key];
  if (!entries) return [];
  const k = `bark:${key}`;
  if (game.counters[k]) return [];
  const e = pick(entries, hasFlag);
  if (!e) return [];
  game.counters[k] = 1;
  return e.lines.map((l) => ({ who: l.who ?? null, text: l.text }));
}

/** Display name for a speaker id, with spawned-actor names supplied by the caller. */
export function nameFor(who, actorName) {
  if (actorName) return actorName;
  return speakerName(who) || (who ? String(who) : '');
}

/** Sign state from flags: 'normal' | 'fading' | 'restored'. */
export function signState(hasFlag) {
  if (hasFlag('archivore_defeated')) return 'restored';
  if (hasFlag('signs_fading')) return 'fading';
  return 'normal';
}
/** The WILLOWMERE gate sign: half faded once the party has left town, whole again after the Archivore. */
export function gateSignState(hasFlag) {
  if (hasFlag('archivore_defeated')) return 'restored';
  if (hasFlag('left_town')) return 'half';
  return 'normal';
}

/** The tint a map shows for the current flags (Willowmere's ink cast while names fade). */
export function tintFor(mapId, baseTint, hasFlag) {
  const base = pickConditional(baseTint, hasFlag) || 'none';
  if (mapId === 'willowmere' && hasFlag('signs_fading') && !hasFlag('archivore_defeated')) return base === 'none' || base === 'day' ? 'ink_light' : base;
  return base;
}

/** Which episode's credits should roll now (its handoff `flag` set, its counter not), or 0. Packs add entries. */
export function creditsPending(game, hasFlag) {
  for (const [n, h] of Object.entries(CREDITS_HANDOFF)) if (h.flag && hasFlag(h.flag) && !game.counters[h.counter]) return +n;
  return 0;
}
export function markCreditsRolled(game, episode = 1) {
  game.counters[(CREDITS_HANDOFF[episode] || CREDITS_HANDOFF[1]).counter] = 1;
}
/** Per episode: credits cards and music, the wake map and mark (day light), the counter, the end card. */
export const CREDITS_HANDOFF = {
  1: { cards: CREDITS, music: null, map: 'hero_home', mark: 'bed', counter: 'credits_rolled', flag: 'ep1_complete' },
  2: { cards: CREDITS_EP2, music: 'hollowmere', map: 'nh_inn', mark: 'inn_bed', counter: 'credits2_rolled', flag: 'ep2_complete', endCard: EP3_LIVE ? END_CARD_EP2_LIVE : END_CARD_EP2 },
  3: { cards: CREDITS_EP3, music: 'first_bell', map: 'pk_inn', mark: 'inn_bed', counter: 'credits3_rolled', flag: 'ep3_complete', endCard: END_CARD_EP3 },
};
