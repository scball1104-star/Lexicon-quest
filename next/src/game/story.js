// Story glue for the field (W2-world, E2-world): scene lookup across both episodes, inspect text, books, barks,
// flag-driven visual states (conditional banners, music and tints) and the two episode-ending handoffs. Pure
// except `takeBark` and the credits helpers, which read and write the game object they are given.

import { scenes as EP1_SCENES, lines as EP1_LINES } from '../data/story/ep1.js';
import { scenes as EP2_SCENES, lines as EP2_LINES } from '../data/story/ep2.js';
import { BOOKS, BANNERS, BARKS, CREDITS, CREDITS_EP2, END_CARD_EP2 } from '../data/text.js';
import { SCENE_CONDITIONS as EP1_CONDITIONS } from '../data/story/ep1.js';
import { SCENE_CONDITIONS as EP2_CONDITIONS } from '../data/story/ep2.js';
import { resolve, pick, matches } from '../data/story/dialogue.js';
import { speakerName } from '../data/npcs.js';

export { CREDITS, CREDITS_EP2, BANNERS };

/** Every scene of both episodes (ids never collide: qa/content and qa/world test it). */
export const SCENES = { ...EP1_SCENES, ...EP2_SCENES };
/** Every inspect line id of both episodes. */
export const LINES = { ...EP1_LINES, ...EP2_LINES };
// Pack scenes (XP-packs): a pack's story module calls registerStory({ scenes, lines, conditions }) from its register().
const EXTRA_CONDITIONS = {};
const registered = { scenes: [], lines: [] };   // ids a pack tried to register that already belonged to something else

/**
 * Add a pack's scenes, inspect lines and scene guards to the shared tables (SCENES, LINES and the condition lookup that
 * sceneAllowed reads). An id that is already taken by a DIFFERENT value is never overwritten: it is reported in the result and
 * by storyCollisions(). Registering the same value again is a no-op, so register() may run twice.
 * Returns { scenes: [collided ids], lines: [collided ids], conditions: [collided ids] }.
 */
export function registerStory({ scenes = {}, lines = {}, conditions = {} } = {}) {
  const out = { scenes: [], lines: [], conditions: [] };
  const put = (table, id, v, bucket) => {
    if (id in table) { if (table[id] !== v) { bucket.push(id); } return; }
    table[id] = v;
  };
  for (const [id, v] of Object.entries(scenes)) put(SCENES, id, v, out.scenes);
  for (const [id, v] of Object.entries(lines)) put(LINES, id, v, out.lines);
  for (const [id, c] of Object.entries(conditions)) {
    if (id in EP1_CONDITIONS || id in EP2_CONDITIONS) { out.conditions.push(id); continue; }
    put(EXTRA_CONDITIONS, id, c, out.conditions);
  }
  for (const id of out.scenes) if (!registered.scenes.includes(id)) registered.scenes.push(id);
  for (const id of out.lines) if (!registered.lines.includes(id)) registered.lines.push(id);
  return out;
}

/** Ids defined by both episodes, or registered by a pack over an existing id (should stay empty; a collision means one shadows the other). */
export function storyCollisions() {
  const sc = Object.keys(EP2_SCENES).filter((k) => k in EP1_SCENES);
  const li = Object.keys(EP2_LINES).filter((k) => k in EP1_LINES);
  return { scenes: [...sc, ...registered.scenes], lines: [...li, ...registered.lines] };
}

/**
 * Would the scene's own guard let it run now ({ if, ifNot } in SCENE_CONDITIONS)? A scene with no conditions does.
 * The field asks before it holds an arrival scene for the location banner (W15).
 */
export function sceneAllowed(id, hasFlag) {
  const c = EP1_CONDITIONS[id] || EP2_CONDITIONS[id] || EXTRA_CONDITIONS[id];
  if (!c) return !!SCENES[id];
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

/**
 * A map field that may be a first-match conditional list (EPISODE2_PLAN 5.5): `music: [{ if: 'nh_restored', id:
 * 'hollowmere' }, { id: 'hollow' }]`, the same for `lighting.tint`. A plain value is returned as is; a list with no
 * match gives null.
 */
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

/**
 * Banner text for a map: { title, sub } (falls back to the module's name). `BANNERS[id].states` (Episode 2) is a
 * first-match list of { if, ifNot, title, sub } checked before the base title (Nameless Hollow -> Hollowmere).
 */
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

/**
 * A first-time companion remark. Returns the boxes to show (empty when none applies or it was shown before)
 * and records it in the save (counters) so it never repeats.
 */
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

/**
 * The tint a map should show for the current flags. While the town's names are fading the outdoor town
 * maps take a faint ink cast; after the Archivore everything is back to its own colours.
 */
export function tintFor(mapId, baseTint, hasFlag) {
  const base = pickConditional(baseTint, hasFlag) || 'none';
  if (mapId === 'willowmere' && hasFlag('signs_fading') && !hasFlag('archivore_defeated')) return base === 'none' || base === 'day' ? 'ink_light' : base;
  return base;
}

/**
 * Which credits should roll now: 1 (ep1_complete set, Episode 1 credits not yet rolled in this save), 2 (the same
 * for ep2_complete and credits2_rolled), or 0. Truthy-compatible with the old boolean.
 */
export function creditsPending(game, hasFlag) {
  if (hasFlag('ep1_complete') && !game.counters.credits_rolled) return 1;
  if (hasFlag('ep2_complete') && !game.counters.credits2_rolled) return 2;
  return 0;
}
export function markCreditsRolled(game, episode = 1) {
  if (episode === 2) game.counters.credits2_rolled = 1; else game.counters.credits_rolled = 1;
}
/**
 * The episode handoffs: the cards, the credits music and where the party wakes afterwards. Episode 1 wakes at home
 * (hero_home, bed); Episode 2 in Hollowmere's inn (nh_inn, inn_bed), after `endCard` (W15: "To be continued").
 * Both in day light.
 */
export const CREDITS_HANDOFF = {
  1: { cards: CREDITS, music: null, map: 'hero_home', mark: 'bed', counter: 'credits_rolled' },
  2: { cards: CREDITS_EP2, music: 'hollowmere', map: 'nh_inn', mark: 'inn_bed', counter: 'credits2_rolled', endCard: END_CARD_EP2 },
};
