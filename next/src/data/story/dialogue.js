// Dialogue helpers shared by story data, NPCs, quests and the content tests. Pure: no DOM, no engine.
//
// Conditional entries use one shape everywhere (NPC talk, inspect lines, party chat):
//   { if: 'flag' | ['flagA', 'flagB'], ifNot: 'flag' | [...], lines: [...], scene?: 'sceneId' }
// `if` = every listed flag must be set. `ifNot` = none of the listed flags may be set.
// The first matching entry wins; the last entry of a list should have no conditions (the fallback).
//
// A line is a string (said by the default speaker) or { who, text } for a different speaker
// (party member interjections, narration with who: null). One line = one dialogue box.
//
// Text tokens: {hero} is the player's chosen name. Color codes: {c:gold}text{/c} (see core/font.js).

export const BOX_COLS = 42;     // wrap width in characters (DESIGN, W1-content brief)
export const BOX_ROWS = 3;      // max lines per box
export const HERO_NAME_MAX = 8; // longest hero name the boxes are written to survive
export const CHOICE_COLS = 28;  // longest choice option

const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** True when an entry's if/ifNot conditions hold for this flag lookup. */
export function matches(entry, hasFlag) {
  if (!entry) return false;
  for (const f of toList(entry.if)) if (!hasFlag(f)) return false;
  for (const f of toList(entry.ifNot)) if (hasFlag(f)) return false;
  return true;
}

/** First matching conditional entry, or null. */
export function pick(entries, hasFlag) {
  for (const e of entries || []) if (matches(e, hasFlag)) return e;
  return null;
}

/** True when a value is a conditional list (array of { if/ifNot/lines } objects). */
export function isConditional(value) {
  return Array.isArray(value) && value.length > 0 && value.every(
    (e) => e && typeof e === 'object' && !('text' in e) && ('lines' in e || 'scene' in e));
}

/**
 * Normalize an inspect/talk value into boxes: [{ who, text }].
 * value: string | (string | {who,text})[] | conditional list. defaultWho: speaker for plain strings.
 */
export function resolve(value, hasFlag = () => false, defaultWho = null) {
  if (value == null) return [];
  if (typeof value === 'string') return [{ who: defaultWho, text: value }];
  if (isConditional(value)) {
    const e = pick(value, hasFlag);
    return e && e.lines ? resolve(e.lines, hasFlag, defaultWho) : [];
  }
  return value.map((l) => (typeof l === 'string' ? { who: defaultWho, text: l } : { who: l.who ?? null, text: l.text }));
}

/** Replace {hero} (and any other {key} in ctx) with values. Leaves color codes alone. */
export function fill(text, ctx = {}) {
  return String(text).replace(/\{(hero|[a-z_]+)\}/g, (m, k) => (k in ctx ? String(ctx[k]) : m));
}

/** Remove {c:name} and {/c} color codes. */
export function stripCodes(text) {
  return String(text).replace(/\{c:[a-z0-9_#]+\}|\{\/c\}/gi, '');
}

/** Greedy word wrap at `cols` characters. Honors explicit \n. Returns the lines. */
export function wrap(text, cols = BOX_COLS) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/ +/)) {
      if (!word) continue;
      if (!line) line = word;
      else if (line.length + 1 + word.length <= cols) line += ' ' + word;
      else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

/** Lines a box will take once {hero} is the longest allowed name and color codes are gone. */
export function boxLines(text, { cols = BOX_COLS, heroName = 'W'.repeat(HERO_NAME_MAX) } = {}) {
  return wrap(stripCodes(fill(text, { hero: heroName })), cols);
}

/** True when the text fits one dialogue box. */
export function fits(text, opts = {}) {
  const lines = boxLines(text, opts);
  const cols = opts.cols ?? BOX_COLS;
  return lines.length <= (opts.rows ?? BOX_ROWS) && lines.every((l) => l.length <= cols);
}
