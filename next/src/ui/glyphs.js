// Device-aware button glyphs: ONE place decides which glyph (or word) a prompt shows for the input device
// the player is using (CRITIQUE_2 D10). Every screen writes `{i:btn_<action>}` (via btn()) and the resolver
// installed here picks the frame: keyboard key caps, gamepad buttons, or, on the touch layout, the tap
// glyphs for A / B and small word caps (MENU, RUN, LANTERN) drawn in the same style as the key caps, so a
// phone never shows a "Z" or "E" key the player does not have.
//
//   bindGlyphs(engine)            installed at boot (title.js install) and again once the engine has installed its
//                                 UI art (engine 'loaded'), which replaces the fonts' resolver (W15: the device-aware
//                                 resolver was lost there, so phones showed the E and Q key caps)
//   btn('confirm')                -> '{i:btn_confirm}' (the inline code; the resolver does the rest)
//   {i:btn_pageR_shove}           an action with the ability it means (W15): the E / RB glyph on a keyboard or pad,
//                                 on touch the word the touch ability button shows (SHOVE, DASH, APPRAISE, LANTERN);
//                                 a bare {i:btn_pageR} on touch says what the button would do now (the field's
//                                 ability context), and {i:btn_pageL} on touch is the swap tab's icon
//   hasBtn('pageR', engine)       -> true when the current device shows something for that action
//   deviceOf(engine)              -> 'keyboard' | 'gamepad' | 'touch'
//   glyphNameFor('confirm', 'touch', table) -> ui frame name | 'word:MENU' | null   (pure, node-tested)
//   promptWord(engine, 'confirm') -> 'Tap' on touch, '{i:btn_confirm}' elsewhere (for "Press X" prompts)

import { touchUi } from './list.js';

/** Words the touch layout shows for actions that have an on-screen control but no glyph in ui.json. */
export const TOUCH_WORDS = { menu: 'MENU', start: 'MENU', run: 'RUN', pageR: 'USE' };
/** The touch ability button's word per field ability (abilities.js SHORT, in caps): {i:btn_pageR_<ability>}. */
export const ABILITY_WORDS = { dash: 'DASH', appraise: 'APPRAISE', lantern: 'LANTERN', shove: 'SHOVE' };
/** Touch frames for actions whose on-screen control is an icon: pageL is the ability swap tab. */
const TOUCH_FRAMES = { pageL: 'icon_swap' };

/** 'pageR_shove' -> ['pageR', 'shove']; 'confirm' -> ['confirm', null]. Actions never contain '_'. */
export function splitBtn(code) {
  const s = String(code || '');
  const i = s.indexOf('_');
  return i < 0 ? [s, null] : [s.slice(0, i), s.slice(i + 1) || null];
}
/** Fallback names when a device table lacks an action entirely (nothing drawn would eat 13 px). */
const PROMPT_WORDS = { touch: { confirm: 'Tap', cancel: 'B', start: 'Tap', menu: 'MENU' } };

/** The input device prompts should speak to: gamepad and touch when last used, otherwise the keyboard. */
export function deviceOf(engine) {
  const d = engine && engine.input ? engine.input.lastDevice : 'keyboard';
  if (d === 'gamepad') return 'gamepad';
  if (d === 'touch') return 'touch';
  if (d === 'mouse' && touchUi(engine)) return 'touch';
  return 'keyboard';
}

/**
 * Frame name for an action on a device. `table` is ui.json buttonGlyphs ({ keyboard: {...}, gamepad, touch }).
 * Returns a ui frame name, 'word:<WORD>' for a drawn word cap (touch only), or null when the device has nothing
 * (the keyboard table is the last resort for keyboard and gamepad, never for touch).
 */
export function glyphNameFor(action, device, table = {}, variant = null) {
  if (variant == null && String(action).includes('_')) [action, variant] = splitBtn(action);
  const t = table[device] || {};
  if (t[action]) return t[action];
  if (device === 'touch') {
    if (TOUCH_FRAMES[action]) return TOUCH_FRAMES[action];
    if (action === 'pageR' && variant && ABILITY_WORDS[variant]) return `word:${ABILITY_WORDS[variant]}`;
    return TOUCH_WORDS[action] ? `word:${TOUCH_WORDS[action]}` : null;
  }
  return (table.keyboard && table.keyboard[action]) || null;
}

/** The ability the field's tool button would use now (the touch button's word), or null off the field. */
export function liveAbility(engine) {
  try {
    const stack = (engine && engine.stack) || [];
    for (let i = stack.length - 1; i >= 0; i--) {
      const f = stack[i];
      if (f && f.name === 'field' && f.abilities && typeof f.abilities.context === 'function') { const c = f.abilities.context(); return (c && c.id) || null; }
    }
  } catch (err) { return null; }
  return null;
}

/** Inline code for an action's glyph (unchanged contract: `{i:btn_<action>}`). */
export function btn(action) { return `{i:btn_${action}}`; }

/** True when the current device will draw something for `{i:btn_<action>}`. */
export function hasBtn(action, engine) {
  const ui = engine && engine.assets && engine.assets.has('ui') ? engine.assets.atlas('ui') : null;
  const table = (ui && ui.meta && ui.meta.buttonGlyphs) || {};
  return !!glyphNameFor(action, deviceOf(engine), table);
}

/** A "press X" fragment: the glyph where the device has one, else a word ('Tap' on touch). */
export function promptWord(engine, action) {
  const dev = deviceOf(engine);
  if (hasBtn(action, engine)) return btn(action);
  return (PROMPT_WORDS[dev] && PROMPT_WORDS[dev][action]) || action;
}

// ---------------------------------------------------------------- word caps (touch): 3x5 capitals in a key cap
// Rows top to bottom, '#' = ink; the same cap palette as assets/ui btn_key_* (ink rim, cream top, light face,
// grey right edge, slate bottom).
const TINY = {
  A: '.#./#.#/###/#.#/#.#', B: '##./#.#/##./#.#/##.', C: '.##/#../#../#../.##', D: '##./#.#/#.#/#.#/##.',
  E: '###/#../##./#../###', F: '###/#../##./#../#..', G: '.##/#../#.#/#.#/.##', H: '#.#/#.#/###/#.#/#.#',
  I: '###/.#./.#./.#./###', J: '..#/..#/..#/#.#/.#.', K: '#.#/#.#/##./#.#/#.#', L: '#../#../#../#../###',
  M: '#.#/###/###/#.#/#.#', N: '##./#.#/#.#/#.#/#.#', O: '.#./#.#/#.#/#.#/.#.', P: '##./#.#/##./#../#..',
  Q: '.#./#.#/#.#/##./..#', R: '##./#.#/##./#.#/#.#', S: '.##/#../.#./..#/##.', T: '###/.#./.#./.#./.#.',
  U: '#.#/#.#/#.#/#.#/###', V: '#.#/#.#/#.#/#.#/.#.', W: '#.#/#.#/###/###/#.#', X: '#.#/#.#/.#./#.#/#.#',
  Y: '#.#/#.#/.#./.#./.#.', Z: '###/..#/.#./#../###', ' ': '.../.../.../.../...',
};
const CAP = { rim: '#14101e', top: '#f6f4ee', face: '#e2e0de', edge: '#b3b6c4', bottom: '#66637f', ink: '#14101e' };
const wordCaps = new Map();

/** Draw (and cache) an 11 px tall key cap with a 3x5 word on it. Returns { image, x, y, w, h } or null. */
export function wordCap(word) {
  if (typeof document === 'undefined') return null;
  const key = String(word).toUpperCase();
  let c = wordCaps.get(key);
  if (c) return c;
  const letters = [...key].map((ch) => TINY[ch] || TINY[' ']);
  const tw = letters.length * 4 - 1;
  const w = tw + 6, h = 11;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const px = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  px(1, 0, w - 2, h, CAP.rim); px(0, 1, w, h - 2, CAP.rim);            // rounded rim
  px(1, 1, w - 2, 1, CAP.top);                                          // highlight row
  px(1, 2, w - 2, 6, CAP.face);                                         // face rows 2..7
  px(w - 2, 2, 1, 6, CAP.edge);                                         // right edge
  px(1, 8, w - 2, 2, CAP.bottom);                                       // bottom lip rows 8..9
  letters.forEach((rows, i) => {
    rows.split('/').forEach((row, y) => { [...row].forEach((ch, x) => { if (ch === '#') px(3 + i * 4 + x, 2 + y, 1, 1, CAP.ink); }); });
  });
  c = { image: cv, x: 0, y: 0, w, h };
  wordCaps.set(key, c);
  return c;
}

/**
 * Install the device-aware resolver over the engine's own (which only knows the ui.json tables). Call once
 * after boot; safe to call again. Non-button icons keep going to the previous resolver.
 */
export function bindGlyphs(engine) {
  const fonts = engine && engine.fonts;
  if (!fonts || typeof fonts.setIconResolver !== 'function') return false;
  const main = fonts.get ? fonts.get('main') : null;
  const prev = main && main.iconResolver && !main.iconResolver.__lqGlyphs ? main.iconResolver : (main && main.iconResolver && main.iconResolver.__prev) || null;
  const resolve = (id) => {
    if (!id.startsWith('btn_')) return prev ? prev(id) : null;
    const ui = engine.assets && engine.assets.has('ui') ? engine.assets.atlas('ui') : null;
    const table = (ui && ui.meta && ui.meta.buttonGlyphs) || {};
    const dev = deviceOf(engine);
    let [action, variant] = splitBtn(id.slice(4));
    if (dev === 'touch' && action === 'pageR' && !variant) variant = liveAbility(engine);
    const name = glyphNameFor(action, dev, table, variant);
    if (!name) return prev ? prev(id) : null;
    if (name.startsWith('word:')) return wordCap(name.slice(5));
    const f = ui && ui.frames[name];
    return f ? { image: ui.image, x: f.x, y: f.y, w: f.w, h: f.h } : (prev ? prev(id) : null);
  };
  resolve.__lqGlyphs = true;
  resolve.__prev = prev;
  fonts.setIconResolver(resolve);
  // The engine installs its own (table-only) resolver with the UI art at the end of boot, after the scene modules
  // ran this: wrap that one too, once, or the device-aware glyphs never reach the screen.
  if (!engine.loaded && typeof engine.on === 'function' && !engine.__lqGlyphsRebind) {
    engine.__lqGlyphsRebind = true;
    const off = engine.on('loaded', () => { off(); engine.__lqGlyphsRebind = false; bindGlyphs(engine); });
  }
  return true;
}
