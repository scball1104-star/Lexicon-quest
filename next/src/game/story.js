// Story glue for the field (W2-world): scene lookup, inspect text, books, barks, flag-driven visual states
// and the Episode 1 ending handoff. Pure except `bark` and `creditsPending` which read engine.game.

import { scenes as EP1_SCENES, lines as EP1_LINES } from '../data/story/ep1.js';
import { BOOKS, BANNERS, BARKS, CREDITS } from '../data/text.js';
import { resolve, pick } from '../data/story/dialogue.js';
import { speakerName } from '../data/npcs.js';

export { CREDITS, BANNERS };

/** The scripted scene for an id (already wrapped with its guard and input lock), or null. */
export function sceneById(id) { return EP1_SCENES[id] || null; }
export function sceneIds() { return Object.keys(EP1_SCENES); }

/** Inspect text as dialogue boxes [{ who, text }] (narration unless a line names a speaker). */
export function inspectBoxes(lineId, hasFlag) {
  const v = EP1_LINES[lineId];
  if (v == null) return [{ who: null, text: `(${lineId})` }];
  return resolve(v, hasFlag, null);
}

/** A book as boxes: gold title, then each page as narration. */
export function bookBoxes(bookId) {
  const b = BOOKS[bookId];
  if (!b) return [{ who: null, text: `(${bookId})` }];
  return [{ who: null, text: `{c:gold}${b.title}{/c}` }, ...b.pages.map((p) => ({ who: null, text: p }))];
}

/** Banner text for a map: { title, sub } (falls back to the module's name). */
export function bannerFor(mapId, mod) {
  const b = BANNERS[mapId];
  if (b) return { title: b.title, sub: b.sub || null };
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
  const base = baseTint || 'none';
  if (mapId === 'willowmere' && hasFlag('signs_fading') && !hasFlag('archivore_defeated')) return base === 'none' || base === 'day' ? 'ink_light' : base;
  return base;
}

/** True when the credits should roll now (ep1_complete set and not yet rolled in this save). */
export function creditsPending(game, hasFlag) {
  return hasFlag('ep1_complete') && !game.counters.credits_rolled;
}
export function markCreditsRolled(game) { game.counters.credits_rolled = 1; }
