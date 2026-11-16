// Episode 8's page close-ups (the insert frame of world/closeup.js, 208 x 96), EPISODE8_PLAN 9.4 and EPISODE8 sections 1
// and 4: the twist shown in pictures, in stages, each stage's words reaching full strength only on the box that says them.
// The pack's index.js calls register() (after `world`), which puts the seven kinds on PAGE_KINDS; story.js opens them
// through s.closeup(kind, { mode, step }) behind a PAGE_KINDS[kind] guard.
//
//   ep8_note        (one mode)                Vex's note in his slanting hand (ep8_morning)
//   ep8_card        { mode: 'card' }          the reader's card in the cold hand, the desk's stamp in the corner: a key
//                                             laid across an open book, the key's bow cracked (meet_librarian)
//                   { mode: 'beside' }        the card beside a page of the order: the same hand (keeper_memory_b)
//   ep8_seal        { mode: 'tag' }           a linen tag on grey wool, the same stamp (elowen_scriptorium)
//                   { mode: 'match' }         beside it the corner of Hazel's blanket: worn soft, the same wool and tag, the
//                                             name in river-water thread
//                   { mode: 'run' }           Elowen's register: one line a brown run nobody can read
//   ep8_first_word  { mode: 'rubbed' }        Meya's one word lifting off the page (first_word)
//                   { mode: 'read' }          the word coming back
//   ep8_could_not   { mode: 'run', step }     the Concordance's sworn page (keeper_memory_c): step 1 "nobody's doing"
//                                             written over the cause; step 2 the ink running across the warnings, the
//                                             account and eleven names, and off the page
//                   { mode: 'note' }          "I could not." in the cold hand, tucked in a grey blanket
//   ep8_shelf       { mode: 'shelved' }       the first page in its place on the first shelf (last_page)
//                   { mode: 'run', step }     the Concordance's ink running back UP its page: step 1 the birth line; step 2
//                                             the eleven names; step 3 the warnings and the cause, "nobody's doing" lifting
//                                             off and under it the First Keeper's own name, a smudge the camera never
//                                             resolves
//                   { mode: 'star' }          the eighth star taking the counter-seal, the brightest thing on it
//   ep8_last_page   (one mode)                the final page, empty, turning (last_page)
//
// THE REVEAL. Every mode's new words are in `base` and the picture before them in `over`; closeup.js runs `over` off (how
// 'run') over `frames` frames. A stepped mode (PAGE_STEPS) is opened once per box with { step }: each step's picture holds
// the earlier steps at full and runs only its own new words in, so a step's words reach full alpha only on its own box.
// reveal(kind, mode, t, step) is the alpha of the words new at that step, t frames after the page was asked; fadeFrames
// gives the count a scene holds for.
//
// Code-made, like EP5 to EP7_PAGES: words are set in the game's font, never painted. THE COLD HAND is the lists' (Episode
// 7's COLD_HAND: a grey-blue ink leaning back); THE WARM HAND is Episode 5's to 7's (its k the same k); VEX'S HAND slants
// hard forward in a black-brown; the MIDWIFE'S HAND is plain and upright; the blanket's name is stitched in river-water blue.

import { BAYER4 } from '../../core/renderer.js';
import { PAGE_KINDS } from '../../world/closeup.js';
import { WARM_HAND, COLD_HAND, TOP_LINES, SIGNATURE, MARK_DATE } from '../ep7/pages.js';

export { WARM_HAND, COLD_HAND };
const INK = '#14101e';
/** Vex's hand: slanting hard forward, black-brown. */
export const VEX_HAND = { color: '#2a1a14', slant: 4 };
/** The midwife's hand on the birth line: plain and upright. */
export const MIDWIFE_HAND = { color: '#3a2a1c' };
/** River-water blue: the thread of the name on the blanket. */
export const RIVER_THREAD = '#5f8fc0';
const PAPER = ['#a98a56', '#c8ab72', '#dcc38c', '#ead8a8', '#f3e7c4'];
const CREAM = ['#c9b88f', '#d9c9a0', '#e6d8b4', '#efe4c6', '#f5ecd4'];
const CARD = ['#b7b2a6', '#c9c4b8', '#d8d4ca', '#e6e2d8', '#f1eee6'];            // the reader's card: cool card stock
const WOOL = ['#4c4a52', '#5c5a63', '#6d6b74', '#7e7c86', '#908e98'];            // grey infirmary wool
const LINEN = ['#bfb49c', '#cfc4ab', '#ddd3bb', '#e9e0ca'];
const VIOLET = ['#14101e', '#20143f', '#2c1d55', '#3a2770'];
const SHELF = ['#2d1b1f', '#482826', '#6e3d2c', '#8f5533'];
const SMUDGE = ['#8f8170', '#9d8f7c', '#ab9d88'];
const RUN_BROWN = '#6e4a2a';
const GOLD = '#f9d77a', GOLD_HI = '#fff7d6';

/** Frames each mode's (or step's) new words take to reach full alpha. */
export const PAGE_FADE = {
  ep8_note: { one: 44 },
  ep8_card: { card: 48, beside: 40 },
  ep8_seal: { tag: 40, match: 48, run: 44 },
  ep8_first_word: { rubbed: 60, read: 54 },
  ep8_could_not: { run: [40, 72], note: 44 },
  ep8_shelf: { shelved: 44, run: [48, 48, 60], star: 50 },
  ep8_last_page: { one: 50 },
};
/** The steps a stepped mode is opened in, one box each. */
export const PAGE_STEPS = { ep8_could_not: { run: 2 }, ep8_shelf: { run: 3 } };
export function stepsOf(kind, mode) { return (PAGE_STEPS[kind] && PAGE_STEPS[kind][mode]) || 1; }
const clampStep = (kind, mode, step) => Math.max(1, Math.min(stepsOf(kind, mode), Math.round(step || 1)));
/** The fade-in of a kind's mode (and step), in frames (undefined mode = the kind's one mode). */
export function fadeFrames(kind, mode, step) {
  const k = PAGE_FADE[kind];
  if (!k) return 0;
  const v = k[mode || 'one'] ?? k.one ?? 0;
  return Array.isArray(v) ? v[clampStep(kind, mode, step) - 1] : v;
}
/** Alpha of the words new at a mode's step, t frames after the page was asked (0 before, 1 from fadeFrames on). */
export function reveal(kind, mode, t, step) { const n = fadeFrames(kind, mode, step); return n ? Math.max(0, Math.min(1, t / n)) : 1; }
export const textAlpha = reveal;

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function rnd(a, b, s = 0) { const v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); }
function noise(x, y) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j;
  const a = rnd(i, j), b = rnd(i + 1, j), c = rnd(i, j + 1), d = rnd(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function ramp(R, v, x, y) {
  const f = Math.max(0, Math.min(R.length - 1, v)), i = Math.floor(f);
  const th = (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  return R[Math.min(R.length - 1, f - i > th ? i + 1 : i)];
}
function fillRamp(g, x0, y0, x1, y1, R, fn) {
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, gg, b] = hex(ramp(R, fn(x, y, w, h), x + x0, y + y0));
    const i = (y * w + x) * 4;
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, x0, y0);
}
function paper(g, x0, y0, x1, y1, R = PAPER, lift = 0) {
  fillRamp(g, x0, y0, x1, y1, R, (x, y, w, h) => {
    const n = noise(x / 13, y / 9) * 0.6 + noise(x / 5, y / 4) * 0.4;
    const edge = Math.min(x, w - 1 - x, y * 2, (h - 1 - y) * 2);
    return 1.2 + lift + n * 2.4 + Math.min(0, edge - 8) * 0.14;
  });
}
function wool(g, x0, y0, x1, y1, R = WOOL) {
  // a soft weave: a two-pixel twill and a little nap
  fillRamp(g, x0, y0, x1, y1, R, (x, y) => 1.6 + ((x + y) % 4 < 2 ? 0.5 : -0.3) + noise(x / 6, y / 5) * 1.2);
}
function px(g, x, y, c, a = 1) { g.globalAlpha = a; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; }
function rect(g, x, y, w, h, c, a = 1) { g.globalAlpha = a; g.fillStyle = c; g.fillRect(x, y, w, h); g.globalAlpha = 1; }
function seg(g, x0, y0, x1, y1, c, a = 1) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let k = 0; k <= n; k++) px(g, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c, a);
}
function frame(g, w, h, c) {
  rect(g, 0, 0, w, 1, INK); rect(g, 0, h - 1, w, 1, INK); rect(g, 0, 0, 1, h, INK); rect(g, w - 1, 0, 1, h, INK);
  rect(g, 1, 1, w - 2, 1, c); rect(g, 1, h - 2, w - 2, 1, c); rect(g, 1, 1, 1, h - 2, c); rect(g, w - 2, 1, 1, h - 2, c);
}
/** One line of the game's font (the Episode 5 to 7 helper, so a hand is the same hand). o: { color, slant, align, scale,
 *  glow, alpha }. Returns { x, w, at(i) }. */
function line(mk, g, r, str, x, y, o = {}) {
  const t = mk(), c = t.getContext('2d'), font = o.font || 'main';
  r.font(font).draw(c, str, 0, 2, { color: o.color || INK, font, shadow: false, outline: false });
  const tw = r.measure(str, font), lh = 20, scale = o.scale || 1;
  const dx = o.align === 'center' ? x - Math.round((tw * scale) / 2) : x;
  g.imageSmoothingEnabled = false;
  const put = (ox, oy, src, a) => {
    g.globalAlpha = a;
    for (let row = 0; row < lh; row++) {
      const s = o.slant || 0;
      const shift = s ? Math.round(((lh - row) / lh) * s) : 0;
      g.drawImage(src, 0, row, tw + 3, 1, dx + shift + ox, y - 2 * scale + row * scale + oy, (tw + 3) * scale, scale);
    }
    g.globalAlpha = 1;
  };
  if (o.glow) {
    const hl = mk(), hc = hl.getContext('2d');
    r.font(font).draw(hc, str, 0, 2, { color: o.glow, font, shadow: false, outline: false });
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(ox, oy, hl, 0.35);
  }
  put(0, 0, t, o.alpha == null ? 1 : o.alpha);
  const at = (i) => dx + Math.round(r.measure(str.slice(0, i), font) * scale);
  return { x: dx, w: Math.round(tw * scale) + Math.abs(o.slant || 0), at };
}
const heroName = (o) => String(o.name || 'Hero');
const modeOf = (o, modes) => (modes.includes(o.mode) ? o.mode : modes[0]);
/** The picture before as `over`, run off (cross-fade) over the mode's (step's) frames. */
function stages(mk, draw, from, to, kind, mode, step) {
  const base = mk(), over = mk();
  draw(base.getContext('2d'), to);
  draw(over.getContext('2d'), from);
  return { base, over, how: 'run', frames: fadeFrames(kind, mode, step) };
}

// ================================================================================================ the stamp and the seal
/** The office seal of the Concordance key: a key laid across an open book, the key's bow cracked. `key: false` is the
 *  empty seal (the key taken out). Drawn by one function on the card, the tag and (in the tiles) the door, so it is the
 *  same mark everywhere. */
export function stamp(g, cx, cy, c, key = true, k = 1) {
  // k: the pixel size (2 on the tag's close-up); every mark is laid on a k-pixel grid round (cx, cy)
  const dot = (x, y) => rect(g, Math.round(cx + x * k), Math.round(cy + y * k), k, k, c);
  const line_ = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) dot(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n)); };
  for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2; dot(Math.round(Math.cos(a) * 12), Math.round(Math.sin(a) * 10)); }
  // the open book: two pages curving up from the spine, their bottoms, their outer edges
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 8; i++) { dot(side * i, -2 - Math.round(Math.sin((i / 8) * Math.PI * 0.9) * 2)); dot(side * i, 5 - Math.round((i / 8) * 2)); }
    line_(side * 8, -3, side * 8, 3);
  }
  line_(0, -2, 0, 5);
  if (!key) return;
  // the key laid across it: the shaft, two teeth, and the bow (a ring at the left) with a crack through it
  line_(-5, 1, 10, 1);
  dot(8, 2); dot(10, 2); dot(10, 3);
  for (let i = 0; i < 12; i++) { if (i === 1 || i === 2) continue; const a = (i / 12) * Math.PI * 2; dot(-8 + Math.round(Math.cos(a) * 3), 1 + Math.round(Math.sin(a) * 3)); }
  dot(-6, -3); dot(-5, -4);
}
/** Where the stamp sits on the card and on the tag (tests compare them). */
export const CARD_STAMP = { x: 178, y: 72 };
export const TAG_STAMP = { x: 104, y: 48 };

// ================================================================================================ Vex's note
export const NOTE_LINES = ['Gone up first.', 'Somebody has to knock.', '- V'];
function ep8_note(mk, r) {
  const w = mk().width, h = mk().height;
  return stages(mk, (g, words) => {
    fillRamp(g, 0, 0, w, h, SHELF, (x, y) => 1.4 + noise(x / 20, y / 3) * 1.4);          // the Watch's table
    // a folded scrap, torn along its top, the fold's crease across it
    paper(g, 24, 10, 184, 88, PAPER, 0.4);
    for (let x = 24; x < 184; x++) { const t = Math.round(rnd(x, 1, 5) * 3); rect(g, x, 10, 1, t, SHELF[1]); }
    seg(g, 24, 48, 183, 48, PAPER[1], 0.6);
    if (words) NOTE_LINES.forEach((s, i) => line(mk, g, r, s, i === 2 ? 132 : 36, 20 + i * 20, VEX_HAND));
    frame(g, w, h, SHELF[3]);
  }, false, true, 'ep8_note', 'one');
}

// ================================================================================================ the reader's card
export const CARD_LINES = ['Welcome, readers.', 'Please return', 'what you borrow.'];
export const ORDER_LINES = ['No more losses.', 'Take every name', 'that hurts to hear.'];
function readerCard(mk, g, r, x0, y0, x1, y1, words) {
  paper(g, x0, y0, x1, y1, CARD, 0.3);
  for (let y = y0 + 18; y < y1 - 4; y += 12) seg(g, x0 + 4, y, x1 - 4, y, '#9aa4b8', 0.5);     // ruled
  rect(g, x0, y0, x1 - x0, 3, '#7a6aa0');                                                     // the Library's violet band
  if (words) CARD_LINES.forEach((s, i) => line(mk, g, r, s, x0 + 8, y0 + 8 + i * 12, COLD_HAND));
}
function ep8_card(mk, r, o) {
  const mode = modeOf(o, ['card', 'beside']);
  const w = mk().width, h = mk().height;
  if (mode === 'card') {
    return stages(mk, (g, words) => {
      fillRamp(g, 0, 0, w, h, SHELF, (x, y) => 1.2 + noise(x / 16, y / 4) * 1.6);      // the high desk
      readerCard(mk, g, r, 14, 8, 196, 90, words);
      stamp(g, CARD_STAMP.x, CARD_STAMP.y, '#7a3040');
      frame(g, w, h, SHELF[3]);
    }, false, true, 'ep8_card', 'card');
  }
  // beside: the card on the left, the memory's page of the order on the right: the same cold hand
  return stages(mk, (g, words) => {
    fillRamp(g, 0, 0, w, h, SHELF, (x, y) => 1.2 + noise(x / 16, y / 4) * 1.6);
    readerCard(mk, g, r, 6, 10, 104, 88, true);
    paper(g, 110, 6, 202, 90, CREAM, 0.1);
    if (words) ORDER_LINES.forEach((s, i) => line(mk, g, r, s, 116, 14 + i * 14, COLD_HAND));
    frame(g, w, h, SHELF[3]);
  }, false, true, 'ep8_card', 'beside');
}

// ================================================================================================ the tag and the blanket
export const REGISTER_RUN = { x: 30, y: 52, w: 150, h: 10 };
function linenTag(g, x0, y0, x1, y1) {
  fillRamp(g, x0, y0, x1, y1, LINEN, (x, y) => 1.6 + ((x + y) % 2 ? 0.3 : -0.2) + noise(x / 4, y / 4) * 0.9);
  rect(g, x0, y0, x1 - x0, 1, LINEN[0]); rect(g, x0, y1 - 1, x1 - x0, 1, LINEN[0]);
  for (let y = y0 + 2; y < y1 - 1; y += 3) px(g, x0 + 1, y, '#8a7f6a');                     // the stitches holding it on
}
function stitchedName(mk, g, r, name, x, y) {
  // the name in river-water thread, large and stitched: the letters drawn at 2x, then every third pixel along each row
  // dropped back to the wool so it reads as thread, not ink
  const t = mk(), c = t.getContext('2d');
  line(mk, c, r, name, 0, 4, { color: RIVER_THREAD, scale: 2 });
  g.drawImage(t, x, y);
  for (let yy = 0; yy < 24; yy++) for (let xx = 0; xx < 96; xx++) if ((xx + yy * 2) % 5 === 0) px(g, x + xx, y + yy, '#6d6b74', 0.25);
}
function ep8_seal(mk, r, o) {
  const mode = modeOf(o, ['tag', 'match', 'run']);
  const w = mk().width, h = mk().height;
  if (mode === 'run') {
    return stages(mk, (g, ran) => {
      paper(g, 0, 0, w, h, CREAM, 0);                                                         // the great register
      for (let y = 10; y < h - 4; y += 12) seg(g, 6, y + 9, w - 6, y + 9, '#b8a888', 0.7);
      for (let k = 0; k < 7; k++) {
        if (k === 3) continue;
        const y = 10 + k * 12;
        for (let x = 10; x < 190; x += 1) if (rnd(x >> 2, k, 7) > 0.32 && (x & 3) !== 3) rect(g, x, y + 4, 1, 3 + ((x * 7 + k) % 2), WARM_HAND.color, 0.85);
      }
      // the one line: a brown run nobody can read (before: just a blank line waiting)
      if (ran) {
        const { x, y, w: rw, h: rh } = REGISTER_RUN;
        for (let k = 0; k < rw; k++) {
          const hh = rh * (0.45 + 0.55 * noise(k / 9, 3)) * (1 - k / (rw * 1.4));
          for (let j = 0; j < hh; j++) px(g, x + k, y + j, RUN_BROWN, 0.85 - j / (rh * 1.6));
        }
        for (let k = 0; k < 14; k++) seg(g, x + 20 + k * 9, y + rh - 2, x + 20 + k * 9 + 1, y + rh + 6 + (k % 3) * 3, RUN_BROWN, 0.6);
      }
      frame(g, w, h, '#8f7448');
    }, false, true, 'ep8_seal', 'run');
  }
  const drawTag = (g, x0, y0, k = 1) => { linenTag(g, x0, y0, x0 + 44, y0 + 30); stamp(g, x0 + 22, y0 + 14, '#7a3040', true, k); };
  if (mode === 'tag') {
    return stages(mk, (g, shown) => {
      wool(g, 0, 0, w, h);
      for (let y = 0; y < h; y++) px(g, 60 + Math.round(Math.sin(y / 7) * 2), y, WOOL[0]);   // a fold in the blanket
      linenTag(g, TAG_STAMP.x - 34, TAG_STAMP.y - 30, TAG_STAMP.x + 34, TAG_STAMP.y + 30);
      if (shown) stamp(g, TAG_STAMP.x, TAG_STAMP.y, '#7a3040', true, 2);
      frame(g, w, h, WOOL[3]);
    }, false, true, 'ep8_seal', 'tag');
  }
  // match: left, the infirmary blanket with its tag; right, the corner of Hazel's blanket, worn soft, the same tag, the
  // name in river-water thread
  return stages(mk, (g, shown) => {
    wool(g, 0, 0, 102, h);
    drawTag(g, 30, 36);
    wool(g, 106, 0, w, h, ['#545259', '#64626b', '#75737c', '#86848e', '#96949e']);           // older, softer, paler
    for (let k = 0; k < 120; k++) px(g, 106 + rnd(k, 1, 9) * 100, rnd(k, 2, 9) * h, WOOL[4], 0.5);   // pilled nap: worn soft
    rect(g, 102, 0, 4, h, INK);
    drawTag(g, 150, 8);
    if (shown) stitchedName(mk, g, r, heroName(o), 112, 50);
    frame(g, w, h, WOOL[3]);
  }, false, true, 'ep8_seal', 'match');
}

// ================================================================================================ the first word
export const FIRST_WORD = 'Begin';
export const FIRST_WORD_AT = { x: 104, y: 34, scale: 2 };
function meyaPage(g, w, h) {
  fillRamp(g, 0, 0, w, h, SHELF, () => 1.5);
  paper(g, 8, 4, 104, 92, CREAM, 0.2);
  paper(g, 104, 4, 200, 92, CREAM, 0);
  seg(g, 104, 4, 104, 91, '#b8a888');
}
function ep8_first_word(mk, r, o) {
  const mode = modeOf(o, ['rubbed', 'read']);
  const w = mk().width, h = mk().height;
  const { x, y, scale } = FIRST_WORD_AT;
  const draw = (g, st) => {
    meyaPage(g, w, h);
    if (st === 'whole') line(mk, g, r, FIRST_WORD, x, y, { ...WARM_HAND, scale, align: 'center' });
    else if (st === 'lifting') {
      // the letters gone: a scatter of ink dust drifting up off where they were
      for (let k = 0; k < 70; k++) px(g, x - 36 + rnd(k, 3, 1) * 72, y - 4 - rnd(k, 4, 1) * 26, WARM_HAND.color, 0.25 + rnd(k, 5, 1) * 0.4);
    } else if (st === 'read') line(mk, g, r, FIRST_WORD, x, y, { ...WARM_HAND, scale, align: 'center', glow: GOLD });
    frame(g, w, h, '#8f7448');
  };
  if (mode === 'rubbed') return stages(mk, draw, 'whole', 'lifting', 'ep8_first_word', 'rubbed');
  return stages(mk, draw, 'lifting', 'read', 'ep8_first_word', 'read');
}

// ================================================================================================ the sworn page
export const WARNING_LINE = 'After the Jubilee.';
export const NOBODYS = "nobody's doing";
export const COULD_NOT = 'I could not.';
export const BIRTH_LINE = 'A child, to Elowen, Keeper of the Scriptorium.';
/** Where the cause line sits and where the First Keeper's own name lies under it: drawn as a smudge, never glyphs. */
export const CAUSE_AT = { x: 14, y: 52 };
export const OWN_NAME = { x: 112, y: 52, w: 62, h: 10 };
const NAME_ROWS = [66, 74, 82];
export const BIRTH_LINES = ['A child, to Elowen,', 'Keeper of the Scriptorium.'];
function swornPage(mk, g, r, w, h, opt) {
  // opt: { warnings, cause, nobodys, names, birth, smudge, run (0..1 how far the ink has run down) }
  fillRamp(g, 0, 0, w, h, SHELF, () => 1.4);                                                  // the stand under it
  paper(g, 6, 2, 202, 94, CREAM, 0.3);
  rect(g, 6, 2, 196, 2, '#5a3a20');
  if (opt.birth) BIRTH_LINES.forEach((s, i) => line(mk, g, r, s, 12, 5 + i * 10, { ...MIDWIFE_HAND, alpha: opt.birth }));
  if (opt.warnings) for (let i = 0; i < 3; i++) {
    const y = 25 + i * 9;
    for (let x = 12; x < 92; x++) if (rnd(x >> 2, i, 21) > 0.3 && (x & 3) !== 3) rect(g, x, y + 2, 1, 3, '#4a3a2a', 0.8 * opt.warnings);
    line(mk, g, r, WARNING_LINE, 96, y, { ...COLD_HAND, alpha: opt.warnings });
  }
  if (opt.cause) for (let x = CAUSE_AT.x; x < 104; x++) if (rnd(x >> 2, 9, 22) > 0.3 && (x & 3) !== 3) rect(g, x, CAUSE_AT.y + 2, 1, 3, '#4a3a2a', 0.8 * opt.cause);
  if (opt.smudge) {
    const { x, y, w: sw, h: sh } = OWN_NAME;
    fillRamp(g, x, y, x + sw, y + sh, SMUDGE, (xx, yy) => 0.6 + noise(xx / 5, yy / 3) * 1.6);
  }
  if (opt.nobodys) line(mk, g, r, NOBODYS, OWN_NAME.x, CAUSE_AT.y - 2, { ...COLD_HAND, alpha: opt.nobodys });
  if (opt.names) for (let k = 0; k < 11; k++) {
    const y = NAME_ROWS[k % 3], x = 14 + Math.floor(k / 3) * 48 + (k % 3) * 4;
    for (let j = 0; j < 30; j++) if (rnd(j >> 1, k, 23) > 0.25 && (j % 5) !== 4) rect(g, x + j, y + 1, 1, 4, '#3a2a1c', 0.85 * opt.names);
  }
  if (opt.run) {
    // the ink running: drips down from the cause line across everything, off the bottom
    for (let k = 0; k < 40; k++) {
      const x = 10 + rnd(k, 1, 24) * 188, len = (20 + rnd(k, 2, 24) * 60) * opt.run;
      const y0 = CAUSE_AT.y - 30 + rnd(k, 3, 24) * 30;
      for (let j = 0; j < len; j++) { const yy = y0 + j; if (yy < h - 2) { px(g, x + Math.sin(j / 6) * 1.5, yy, RUN_BROWN, 0.9); px(g, x + 1 + Math.sin(j / 6) * 1.5, yy, RUN_BROWN, 0.5); } }
    }
  }
  frame(g, w, h, '#8f7448');
}
function ep8_could_not(mk, r, o) {
  const mode = modeOf(o, ['run', 'note']);
  const w = mk().width, h = mk().height;
  if (mode === 'note') {
    return stages(mk, (g, words) => {
      wool(g, 0, 0, w, h);
      paper(g, 58, 26, 152, 70, CARD, 0.2);
      for (let k = 0; k < 6; k++) px(g, 58 + k * 18, 70, WOOL[0]);                            // tucked under the wool
      rect(g, 52, 66, 106, 8, WOOL[2]);
      if (words) line(mk, g, r, COULD_NOT, 70, 40, COLD_HAND);
      frame(g, w, h, WOOL[3]);
    }, false, true, 'ep8_could_not', 'note');
  }
  const step = clampStep('ep8_could_not', 'run', o.step);
  const st = (s) => (s === 0 ? { warnings: 1, cause: 1, names: 1 } : s === 1 ? { warnings: 1, cause: 1, names: 1, nobodys: 1 }
    : { warnings: 0.25, cause: 0.2, names: 0.15, nobodys: 1, run: 1 });
  return stages(mk, (g, s) => swornPage(mk, g, r, w, h, st(s)), step - 1, step, 'ep8_could_not', 'run', step);
}

// ================================================================================================ the shelf, the run back, the star
export const STAR_AT = { x: 104, y: 30 };
function counterSeal(g, cx, cy, c) {
  // an open book with one line written in it
  for (const side of [-1, 1]) {
    for (let k = 0; k <= 9; k++) { px(g, cx + side * k, cy - Math.round(Math.sin((k / 9) * Math.PI * 0.9) * 2), c); px(g, cx + side * k, cy + 6 - Math.round((k / 9) * 2), c); }
    seg(g, cx + side * 9, cy - 1, cx + side * 9, cy + 4, c);
  }
  seg(g, cx, cy, cx, cy + 7, c);
  seg(g, cx - 7, cy + 2, cx - 2, cy + 2, c);
}
function ep8_shelf(mk, r, o) {
  const mode = modeOf(o, ['shelved', 'run', 'star']);
  const w = mk().width, h = mk().height;
  if (mode === 'shelved') {
    return stages(mk, (g, placed) => {
      fillRamp(g, 0, 0, w, h, SHELF, (x, y) => 1 + noise(x / 10, y / 30));
      // old spines on either side
      for (let x = 4; x < w - 4; x += 7) {
        if (x > 60 && x < 150) continue;
        rect(g, x, 8 + (x % 3) * 2, 6, 80, ['#6e2a2a', '#2c4797', '#285743', '#522a84', '#6e3d2c'][(x >> 3) % 5]);
        rect(g, x, 20, 6, 1, GOLD);
      }
      rect(g, 0, 88, w, 6, SHELF[0]);
      if (placed) {
        paper(g, 64, 6, 146, 88, CREAM, 0.4);
        line(mk, g, r, TOP_LINES[0], 70, 10, WARM_HAND);
        line(mk, g, r, MARK_DATE, 70, 30, { color: '#1f2338' });
        counterSeal(g, 126, 54, '#3a2a1c');
        line(mk, g, r, SIGNATURE, 112, 72, { ...WARM_HAND, color: '#3a1a10' });
      } else rect(g, 64, 6, 82, 82, '#0e0a14');                                               // the empty place
      frame(g, w, h, SHELF[3]);
    }, false, true, 'ep8_shelf', 'shelved');
  }
  if (mode === 'star') {
    return stages(mk, (g, lit) => {
      fillRamp(g, 0, 0, w, h, VIOLET, (x, y) => 2.4 - y / 60 + noise(x / 20, y / 10) * 0.6);
      const signs = [[30, 70], [54, 50], [78, 64], [130, 64], [154, 50], [178, 70], [104, 76]];
      for (const [x, y] of signs) { px(g, x, y, GOLD); px(g, x - 1, y, '#c38334'); px(g, x + 1, y, '#c38334'); px(g, x, y - 1, '#c38334'); px(g, x, y + 1, '#c38334'); }
      const { x, y } = STAR_AT;
      if (lit) {
        for (let k = 1; k < 7; k++) { px(g, x - k, y, GOLD, 1 - k / 8); px(g, x + k, y, GOLD, 1 - k / 8); px(g, x, y - k, GOLD, 1 - k / 8); px(g, x, y + k, GOLD, 1 - k / 8); }
        rect(g, x - 1, y - 1, 3, 3, GOLD_HI);
        counterSeal(g, x, y + 10, GOLD_HI);
      } else px(g, x, y, '#5a4a70');
      frame(g, w, h, VIOLET[3]);
    }, false, true, 'ep8_shelf', 'star');
  }
  // run: the ink running back UP the page, one box a step
  const step = clampStep('ep8_shelf', 'run', o.step);
  const st = (s) => [
    { run: 1, warnings: 0.25, cause: 0.2, names: 0.15, nobodys: 1 },
    { birth: 1, run: 0.6, warnings: 0.25, cause: 0.2, names: 0.15, nobodys: 1 },
    { birth: 1, names: 1, run: 0.3, warnings: 0.25, cause: 0.2, nobodys: 1 },
    { birth: 1, names: 1, warnings: 1, cause: 1, smudge: 1 },
  ][s];
  return stages(mk, (g, s) => swornPage(mk, g, r, w, h, st(s)), step - 1, step, 'ep8_shelf', 'run', step);
}

// ================================================================================================ the last page
function ep8_last_page(mk) {
  const w = mk().width, h = mk().height;
  return stages(mk, (g, turned) => {
    fillRamp(g, 0, 0, w, h, SHELF, () => 1.4);
    paper(g, 6, 4, 104, 92, CREAM, 0.2);
    paper(g, 104, 4, 202, 92, CREAM, 0.3);
    seg(g, 104, 4, 104, 91, '#b8a888');
    if (!turned) {
      // the page before still lifting over: its back faintly lined, curling from the right
      paper(g, 104, 4, 186, 92, CREAM, -0.4);
      for (let y = 12; y < 88; y += 8) seg(g, 110, y, 180, y, '#c9b88f', 0.6);
      for (let y = 4; y < 92; y++) px(g, 186 - Math.round(Math.sin((y / 88) * Math.PI) * 6), y, '#8f7448');
    }
    frame(g, w, h, '#8f7448');
  }, false, true, 'ep8_last_page', 'one');
}

export const EP8_PAGES = { ep8_note, ep8_card, ep8_seal, ep8_first_word, ep8_could_not, ep8_shelf, ep8_last_page };
/** The modes each kind opens in (story.js; undefined = the kind's one mode). */
export const PAGE_MODES = {
  ep8_note: [undefined], ep8_card: ['card', 'beside'], ep8_seal: ['tag', 'match', 'run'], ep8_first_word: ['rubbed', 'read'],
  ep8_could_not: ['run', 'note'], ep8_shelf: ['shelved', 'run', 'star'], ep8_last_page: [undefined],
};

/** Register the seven kinds on PAGE_KINDS (another pack's kinds stay). Idempotent. */
export function register() {
  for (const [k, fn] of Object.entries(EP8_PAGES)) if (!PAGE_KINDS[k] || PAGE_KINDS[k] === fn) PAGE_KINDS[k] = fn;
  return Object.keys(EP8_PAGES);
}

export default register;
