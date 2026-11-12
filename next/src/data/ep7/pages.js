// Episode 7's page close-ups (the insert frame of world/closeup.js, 208 x 96), EPISODE7_PLAN 9.4, CRITIQUE_6 item 3,
// CRITIQUE_7 item 7 and CRITIQUE_8 item 5: the payoffs shown, in stages, and each stage's words reaching full strength only
// on the box that says them. The pack's index.js calls register() (after `world`), which puts the seven kinds on PAGE_KINDS;
// story.js opens them through page(s, kind, mode) only when the kind is registered.
//
//   ep7_chart    { mode: 'fading' }   the skychart's north: the realm's names, the north pale, one valley's name lifting
//                                     off the paper over 40 frames (ep7_morning)
//   ep7_carving  { mode: 'fading' }   VEX QUILL cut fresh into the ice wall, then half its letters going white one by one
//                                     (name_under_ice)
//                { mode: 'whole' }    every letter there, cut deep (doors_reopen)
//   ep7_tally    (one mode)           the doorframe tally: strokes in rows, every seventh crossed, a white patch at the top
//                                     where a name was (waystation)
//   ep7_tag      (one mode)           Mara's tag on the bell, in a strong square hand, her maker's stamp (listening_bell)
//   ep7_seventh  (one mode)           the North's list: cheap grey paper, the cold hand, the empty-book seal; the line about
//                                     the page is the brightest thing on it (phantom_after)
//   ep7_page     { mode: 'half' }     the bottom half of the first page in its ice: frosted white, unreadable (phantom_after)
//                { mode: 'joined' }   the two halves meeting, the torn line running on (whole_page)
//                { mode: 'mark' }     Marten's carrier mark and the date, its seven crossed (whole_page)
//                { mode: 'signed' }   the signature, "Nox.", the brightest thing on the page (whole_page)
//   ep7_letter   { mode: 'restored' } Marten's letter, the address come back: TESS, AT WILLOWMERE; MARTEN in the corner, a
//                                     crossed seven in the date (doors_reopen)
//
// THE FADE-IN (CRITIQUE_8 item 5). Every mode's new words are in `base` and the stage before them in `over`: closeup.js
// runs `over` off (how 'run': a cross-fade, the new words rising from 0 to full alpha) or writes `base`'s words in (how
// 'wipe') over `frames` frames from the first drawn frame. PAGE_FADE[kind][mode] is that count; fadeFrames(kind, mode)
// gives it to a scene that must hold until the words are at full (whole_page waits 56 frames after `signed`; signed takes
// 48), and textAlpha(kind, mode, t) is the alpha of the mode's words t frames after the page was asked.
//
// Code-made, like EP5_PAGES and EP6_PAGES: words are set in the game's font, never painted, so they stay exact. THE WARM HAND
// is Episode 5's and Episode 6's (WARM_HAND from src/data/ep6/pages.js: the main font, ink #6e3a1a, slanted 2 px across the
// line), so the k of "Keep" is the same k: seen, not told. MARTEN'S HAND is rough and square (upright, a pixel of jitter on
// alternate letters, a heavy blue-black), every 7 crossed with a bar. MARA'S HAND on the tag is a third, strong square hand
// (upright, doubled one pixel across: bold). THE COLD HAND is the lists' (a grey-blue ink leaning back).

import { BAYER4 } from '../../core/renderer.js';
import { PAGE_KINDS } from '../../world/closeup.js';
import { WARM_HAND } from '../ep6/pages.js';

export { WARM_HAND };
const INK = '#14101e';
/** Marten's hand: rough and square, his sevens crossed. */
export const MARTEN_HAND = { color: '#1f2338', jitter: true, cross7: true };
/** Mara's hand on the tag: strong and square (bold, upright). */
export const MARA_HAND = { color: '#2a1a12', bold: true };
/** The cold hand of the lists. */
export const COLD_HAND = { color: '#3a4a6a', slant: -1 };
const PAPER = ['#a98a56', '#c8ab72', '#dcc38c', '#ead8a8', '#f3e7c4'];
const OLD_PAPER = ['#5e4630', '#7a5d3a', '#957447', '#ac8a57', '#c09f6a'];
const CHEAP = ['#5a5c66', '#6e7079', '#83858c', '#9a9ca2', '#b0b1b5'];            // the North's cheap grey paper
const CHART = ['#8a7a58', '#a8946a', '#c2ad80', '#d6c497', '#e6d8b0'];
const SEA = ['#3c5a78', '#4e7090', '#6488a6'];
const ICE = ['#3e88ca', '#6ab3e4', '#9ccbe8', '#b4e4f2', '#e8fffb'];                // the ice wall
const WOOD = ['#2d1b1f', '#482826', '#6e3d2c', '#8f5533', '#b87942'];
const BRONZE = ['#482826', '#8f5533', '#c38334', '#eba14d'];
const DESK = ['#1d1520', '#2a1e24', '#3a2a2a', '#4a3630'];
const FROST = '#eef4fa', FROST_HI = '#f8fbff';
const NAME_LIGHT = '#fff4d6', NAME_GLOW = '#e9b65a';
const COLD_LIGHT = '#f4f8ff', COLD_GLOW = '#9cc0e8';

/** Frames each mode's words take to reach full alpha (the count closeup.js runs `over` off over). */
export const PAGE_FADE = {
  ep7_chart: { fading: 40 },
  ep7_carving: { fading: 90, whole: 50 },
  ep7_tally: { one: 36 },
  ep7_tag: { one: 48 },
  ep7_seventh: { one: 48 },
  ep7_page: { half: 40, joined: 50, mark: 44, signed: 48 },
  ep7_letter: { restored: 60 },
};
/** The fade-in of a kind's mode, in frames (undefined mode = the kind's one mode). */
export function fadeFrames(kind, mode) { const k = PAGE_FADE[kind]; return k ? (k[mode || 'one'] ?? k.one ?? 0) : 0; }
/** Alpha of a mode's words t frames after the page was asked (0 before, 1 from fadeFrames on). */
export function textAlpha(kind, mode, t) { const n = fadeFrames(kind, mode); return n ? Math.max(0, Math.min(1, t / n)) : 1; }

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
/**
 * One line of the game's font (Episode 5's and 6's helper, so the warm hand is the same hand). o: { font, scale, color, align:
 * 'center', slant (px across the height, negative leans back), fit, glow, alpha, jitter (alternate letters a pixel up: a rough
 * hand), bold (doubled a pixel across), cross7 (a bar across every 7) }. Returns { x, w, h, at(i) } (at: x of the i-th char).
 */
function line(mk, g, r, str, x, y, o = {}) {
  const t = mk(), c = t.getContext('2d'), font = o.font || 'main';
  const drawStr = (cc, col) => {
    if (!o.jitter) { r.font(font).draw(cc, str, 0, 2, { color: col, font, shadow: false, outline: false }); return; }
    for (let i = 0; i < str.length; i++) {
      const cx = r.measure(str.slice(0, i), font);
      r.font(font).draw(cc, str[i], cx, 2 + ((i % 2) ? -1 : 0) + (i % 3 === 2 ? 1 : 0), { color: col, font, shadow: false, outline: false });
    }
  };
  drawStr(c, o.color || INK);
  const tw = r.measure(str, font), lh = 20;
  const scale = o.fit && tw * (o.scale || 1) > o.fit ? 1 : o.scale || 1;
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
    drawStr(hc, o.glow);
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(ox, oy, hl, 0.35);
  }
  const al = o.alpha == null ? 1 : o.alpha;
  put(0, 0, t, al);
  if (o.bold) put(1, 0, t, al);
  const at = (i) => dx + Math.round(r.measure(str.slice(0, i), font) * scale);
  if (o.cross7) {
    for (let i = 0; i < str.length; i++) if (str[i] === '7') {
      const cx = at(i), cw = Math.max(3, Math.round((r.measure(str.slice(0, i + 1), font) - r.measure(str.slice(0, i), font)) * scale));
      rect(g, cx, y + Math.round(4 * scale), cw, Math.max(1, Math.round(scale)), o.color || INK, al);
    }
  }
  return { x: dx, w: Math.round(tw * scale) + Math.abs(o.slant || 0), h: Math.round(11 * scale), at };
}
const hand = (o = {}) => ({ ...WARM_HAND, ...o });
const heroName = (o) => String(o.name || 'Hero');
const modeOf = (o, modes) => (modes.includes(o.mode) ? o.mode : modes[0]);
/** The beat before: its picture as `over`, run off (cross-fade) over the mode's frames. */
function stages(mk, draw, from, to, kind, mode) {
  const base = mk(), over = mk();
  draw(base.getContext('2d'), to);
  draw(over.getContext('2d'), from);
  return { base, over, how: 'run', frames: fadeFrames(kind, mode) };
}

// ================================================================================================ the skychart
/** Where the lifting valley's name sits (tests): it is gone from the finished page. */
export const VALLEY_NAME = { text: 'Snowrest Vale', x: 116, y: 22 };
const CHART_NAMES = [['Willowmere', 40, 76], ['Valewyn', 150, 70], ['Emberpeak', 112, 50], ['Zephyr Landing', 18, 52]];

function chartBase(mk, g, r, w, h) {
  // a sea chart on the skychart table: parchment, the sea washed blue in the west, the coast inked, the north pale
  paper(g, 0, 0, w, h, CHART, 0.4);
  fillRamp(g, 0, 0, 34, h, SEA, (x, y) => 1.4 + noise(x / 9, y / 7) * 1.2 - x / 30);
  for (let y = 0; y < h; y++) {
    const cx = 30 + Math.round(Math.sin(y / 9) * 4 + Math.sin(y / 3.1) * 1.5);
    px(g, cx, y, '#3a2a1c'); px(g, cx + 1, y, '#6e5634', 0.6);
  }
  // mountains along the north and a river to Willowmere
  for (let k = 0; k < 7; k++) { const mx = 60 + k * 20, my = 36 + (k % 2) * 3; seg(g, mx - 5, my + 4, mx, my - 2, '#5a4426'); seg(g, mx, my - 2, mx + 5, my + 4, '#5a4426'); }
  for (let t = 0; t < 70; t++) px(g, 100 - t * 0.7 + Math.sin(t / 6) * 3, 44 + t * 0.5, '#4e7090', 0.8);
  // a compass rose
  for (let k = 0; k < 16; k++) px(g, 186 + Math.cos((k * Math.PI) / 8) * 6, 82 + Math.sin((k * Math.PI) / 8) * 6, '#6e5634');
  seg(g, 186, 74, 186, 90, '#6e5634'); seg(g, 178, 82, 194, 82, '#6e5634'); px(g, 186, 73, '#b34532');
  for (const [s, x, y] of CHART_NAMES) line(mk, g, r, s, x, y, { color: '#3a2a1c' });
  // the north going pale: a frost wash over the top rows, strongest at the top (paper turning to nothing)
  fillRamp(g, 0, 0, w, 30, ['#e6d8b0', '#efe6cc', '#f6f2e4', FROST], (x, y) => 3 - y / 10 + (noise(x / 7, y / 4) - 0.5));
  line(mk, g, r, 'THE NORTH', 60, 4, { color: '#a89a80' });
  frame(g, w, h, '#6e5634');
}
function ep7_chart(mk, r, o) {
  const w = mk().width, h = mk().height;
  return stages(mk, (g, withName) => {
    chartBase(mk, g, r, w, h);
    if (withName) line(mk, g, r, VALLEY_NAME.text, VALLEY_NAME.x, VALLEY_NAME.y, { color: '#3a2a1c' });
    // where it was: nothing; the north's pale wash runs on over it as if it had never been inked
  }, true, false, 'ep7_chart', 'fading');
}

// ================================================================================================ the carving
export const CARVED = 'VEX QUILL';
/** The letters that go white in `fading` (indices into CARVED): half of them, never the space. */
export const WHITENED = [1, 4, 6, 8];
export const CARVE_AT = { x: 104, y: 36, scale: 2 };

function iceWall(g, w, h) {
  fillRamp(g, 0, 0, w, h, ICE, (x, y) => 2.2 + noise(x / 11, y / 6) * 1.2 + (y % 19 === 0 ? -0.8 : 0) - Math.abs(x - w / 2) / w);
  // old names, pale and half gone, carved all over (glyph bars)
  for (let row = 0; row < 7; row++) {
    const y = 6 + row * 13;
    let x = 4 + ((row * 17) % 23);
    while (x < w - 10) {
      const L = 8 + Math.floor(rnd(x, row, 3) * 18);
      if (row < 2 || row > 4 || x < 40 || x > 168) {
        for (let k = 0; k < L; k++) if ((k * 5 + row) % 6) { px(g, x + k, y, '#3e88ca', 0.55); px(g, x + k, y + 1, '#e8fffb', 0.5); }
      }
      x += L + 6;
    }
  }
}
function carvedName(mk, g, r, white, deep) {
  const { x, y, scale } = CARVE_AT;
  const shadow = line(mk, g, r, CARVED, x + 1, y + 1, { scale, align: 'center', color: '#e8fffb' });       // the lit lip of the cut
  const cut = line(mk, g, r, CARVED, x, y, { scale, align: 'center', color: deep ? '#0e153b' : '#1d3775' });
  for (const i of white) {
    // a letter gone white: frost filling its cut, the same shape drawn over it in the wall's bare white
    for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [1, 1]]) line(mk, g, r, CARVED[i], cut.at(i) + ox, y + oy, { scale, color: FROST });
  }
  return shadow;
}
function ep7_carving(mk, r, o) {
  const mode = modeOf(o, ['fading', 'whole']);
  const w = mk().width, h = mk().height;
  const draw = (g, st) => {
    iceWall(g, w, h);
    if (st === 'fresh') carvedName(mk, g, r, [], false);
    else if (st === 'faded') carvedName(mk, g, r, WHITENED, false);
    else carvedName(mk, g, r, [], true);
    frame(g, w, h, '#24559b');
  };
  if (mode === 'fading') {
    // VEX QUILL cut fresh (base), then the letters going white one by one (the wipe writes the faded state in, left
    // to right, a letter at a time as the wipe passes it)
    const base = mk(), over = mk();
    draw(base.getContext('2d'), 'fresh');
    draw(over.getContext('2d'), 'faded');
    return { base, over, how: 'wipe', frames: fadeFrames('ep7_carving', 'fading') };
  }
  return stages(mk, draw, 'faded', 'whole', 'ep7_carving', 'whole');
}

// ================================================================================================ the tally
/** The white patch where a name was (tests). */
export const TALLY_PATCH = { x: 60, y: 6, w: 88, h: 14 };
export const TALLY_ROWS = 5, TALLY_PER_ROW = 21;

function doorframe(g, w, h) {
  fillRamp(g, 0, 0, w, h, WOOD, (x, y) => 2.2 + noise(x / 30, y / 3) * 1.4 + (x % 37 === 0 ? -1 : 0));
  for (let y = 0; y < h; y += 1) if (rnd(3, y, 9) > 0.85) seg(g, 4, y, w - 4, y, WOOD[1], 0.35);   // the grain
}
function tallyMarks(g, alpha = 1) {
  let n = 0;
  for (let row = 0; row < TALLY_ROWS; row++) {
    const y = 28 + row * 13;
    for (let k = 0; k < TALLY_PER_ROW; k++) {
      n++;
      const x = 16 + k * 8 + Math.floor(k / 7) * 6;
      seg(g, x, y, x + 1, y + 9, '#1a0f0c', alpha); seg(g, x + 1, y, x + 2, y + 9, WOOD[4], alpha * 0.6);
      if (n % 7 === 0) seg(g, x - 9, y + 6, x + 4, y + 2, '#1a0f0c', alpha);       // every seventh crossed with a bar
    }
  }
}
function ep7_tally(mk) {
  const w = mk().width, h = mk().height;
  return stages(mk, (g, marks) => {
    doorframe(g, w, h);
    const P = TALLY_PATCH;
    // where a name would go: a smooth white patch, the wood shaved and frosted clean
    fillRamp(g, P.x, P.y, P.x + P.w, P.y + P.h, ['#e2d6c4', '#efe8dc', '#f6f4ee'], (x, y) => 1.4 + noise(x / 9, y / 4) * 0.8);
    if (marks) tallyMarks(g);
    frame(g, w, h, WOOD[1]);
  }, false, true, 'ep7_tally', 'one');
}

// ================================================================================================ Mara's tag
export const TAG_LINES = ['TUNED TO THE ONE DOWN IN', 'THE VALLEY, AS YOU ASKED.', 'WHEN IT RINGS THERE,', 'THIS RINGS HERE.'];
export const TAG_SIGN = 'GOOD HANDS. MARA';

function makersStamp(g, cx, cy, c) {
  // an anvil and a bell, pressed into the card
  rect(g, cx - 7, cy + 4, 14, 2, c); rect(g, cx - 4, cy + 6, 8, 2, c); rect(g, cx - 2, cy + 8, 4, 2, c); rect(g, cx - 6, cy + 10, 12, 1, c);
  for (let k = 0; k < 8; k++) { const hw = 1 + Math.floor(k / 2); rect(g, cx - hw, cy - 6 + k, hw * 2 + 1, 1, c); }
  px(g, cx, cy - 7, c);
}
function ep7_tag(mk, r) {
  const w = mk().width, h = mk().height;
  return stages(mk, (g, words) => {
    fillRamp(g, 0, 0, w, h, BRONZE, (x, y) => 1.6 + noise(x / 20, y / 8) * 1.4 - Math.abs(y - 48) / 60);   // the bell's waist
    paper(g, 18, 6, 190, 92, PAPER, 0.6);
    rect(g, 18, 6, 172, 1, '#f9f4e4');
    // the cord through a punched hole, frost on the card's edges
    for (let k = 0; k < 8; k++) px(g, 104, 7 + k, '#3a2a1c');
    rect(g, 102, 10, 4, 4, '#2d1b1f');
    for (let x = 18; x < 190; x++) if (rnd(x, 1, 21) > 0.6) px(g, x, 91 - Math.floor(rnd(x, 2, 22) * 3), FROST);
    if (words) {
      TAG_LINES.forEach((s, i) => line(mk, g, r, s, 26, 18 + i * 14, MARA_HAND));
      line(mk, g, r, TAG_SIGN, 26, 76, MARA_HAND);
    }
    makersStamp(g, 172, 76, words ? '#7a5d3a' : '#a98a56');
    frame(g, w, h, BRONZE[0]);
  }, false, true, 'ep7_tag', 'one');
}

// ================================================================================================ the Seventh List
export const SEVENTH_LINES = ['THE NORTH.', 'LET IT FORGET EVERY SOUL', 'WHO CAN STILL READ'];
export const SEVENTH_PAGE_LINE = 'THE FIRST ERASED PAGE.';
export const SEVENTH_PAGE_Y = 58;

function emptyBook(g, cx, cy, c) {
  // the seal of the empty book: an open book with nothing on its pages
  for (const side of [-1, 1]) {
    for (let k = 0; k <= 11; k++) { px(g, cx + side * k, cy - Math.round(Math.sin((k / 11) * Math.PI * 0.9) * 2), c); px(g, cx + side * k, cy + 8 - Math.round((k / 11) * 2), c); }
    seg(g, cx + side * 11, cy - 1, cx + side * 11, cy + 6, c);
  }
  seg(g, cx, cy, cx, cy + 9, c);
}
function ep7_seventh(mk, r) {
  const w = mk().width, h = mk().height;
  return stages(mk, (g, words) => {
    fillRamp(g, 0, 0, w, h, ['#1d2a40', '#2a3a58', '#3e5578'], (x, y) => 1 + noise(x / 14, y / 7) * 1.2);    // the ice it lies in
    paper(g, 10, 4, 198, 92, CHEAP, -0.3);
    for (let y = 8; y < 90; y += 2) if (rnd(y, 4, 31) > 0.7) seg(g, 12, y, 196, y, CHEAP[1], 0.3);         // pulp streaks
    if (words) {
      SEVENTH_LINES.forEach((s, i) => line(mk, g, r, s, 20, 10 + i * 15, COLD_HAND));
      line(mk, g, r, SEVENTH_PAGE_LINE, 20, SEVENTH_PAGE_Y, { ...COLD_HAND, color: COLD_LIGHT, glow: COLD_GLOW });
    }
    emptyBook(g, 172, 76, words ? '#1a2238' : CHEAP[2]);
    // frost creeping in at the corners
    for (const [cx, cy] of [[10, 4], [198, 92]]) for (let k = 0; k < 90; k++) {
      const a = rnd(k, cx, 41) * Math.PI * 2, d = rnd(k, cy, 42) * 10;
      px(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, '#aeb8c6', 0.8);
    }
    frame(g, w, h, '#24324c');
  }, false, true, 'ep7_seventh', 'one');
}

// ================================================================================================ the first page, whole
export const PAGE_STAGES = ['half', 'joined', 'mark', 'signed'];
/** The tear between the halves (the bottom half came from the ice, the top from Vex). */
export const SEAM_Y = 42;
export const TOP_LINES = ['Keep this one.', 'Carried down the White Road by'];
export const RUN_ON = ['Marten, courier of Willowmere,', "at his sister's asking."];
export const MARK_DATE = '17 Deepwinter';
export const SIGNATURE = 'Nox.';
export const SIGNATURE_AT = { x: 150, y: 70 };
export const BOTTOM_LINES_Y = [46, 58];

export function seamAt(x) {
  return SEAM_Y + Math.round(Math.sin(x / 23) * 2 + Math.sin(x / 7.3 + 1) * 1.2 + (rnd(x, 3, 13) - 0.5) * 2.4);
}
function carrierMark(g, x, y, c) {
  // the courier's post horn, drawn quick: a coil and a bell mouth
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; px(g, x + 5 + Math.cos(a) * 4, y + 5 + Math.sin(a) * 3, c); }
  seg(g, x + 9, y + 5, x + 16, y + 2, c); seg(g, x + 16, y + 2, x + 16, y + 9, c); seg(g, x + 9, y + 6, x + 16, y + 9, c);
}
function topHalf(mk, g, r, o, w) {
  for (let x = 0; x < w; x++) {
    const t = seamAt(x);
    for (let y = 0; y <= t; y++) px(g, x, y, ramp(OLD_PAPER, 1.6 + noise(x / 13, y / 9) * 2.2, x, y));
  }
  line(mk, g, r, heroName(o), 104, 2, hand({ align: 'center' }));
  line(mk, g, r, TOP_LINES[0], 104, 15, hand({ align: 'center' }));
  line(mk, g, r, TOP_LINES[1], 104, 28, hand({ align: 'center' }));
}
function bottomHalf(mk, g, r, w, h, frosted) {
  for (let x = 0; x < w; x++) {
    const t = seamAt(x);
    for (let y = t + 1; y < h; y++) px(g, x, y, ramp(OLD_PAPER, 1.6 + noise(x / 13, y / 9) * 2.2, x, y));
    px(g, x, t + 1, '#d8c49c');
  }
  if (!frosted) {
    RUN_ON.forEach((s, i) => line(mk, g, r, s, 104, BOTTOM_LINES_Y[i], hand({ align: 'center' })));
    return;
  }
  // frosted white: a crust of rime over the paper, the lines only pale bars under it, unreadable
  for (let x = 0; x < w; x++) for (let y = seamAt(x) + 1; y < h; y++) {
    const n = noise(x / 4, y / 3);
    px(g, x, y, n > 0.62 ? FROST_HI : FROST, n > 0.3 ? 0.92 : 0.8);
  }
  for (const yy of BOTTOM_LINES_Y) for (let x = 30; x < 178; x++) if ((x * 7) % 11 > 2) px(g, x, yy + 5, '#c9d4e3', 0.9);
}
function pageStage(mk, g, r, o, st, w, h) {
  if (st === 'half') {
    // the bottom half in its block of ice: the ice round it, the top of the insert empty ice
    fillRamp(g, 0, 0, w, h, ICE, (x, y) => 2.4 + noise(x / 12, y / 8) * 1.2 - y / 120);
    bottomHalf(mk, g, r, w, h, true);
    frame(g, w, h, '#24559b');
    return;
  }
  if (st === 'apart') {
    fillRamp(g, 0, 0, w, h, DESK, (x, y) => 1.2 + noise(x / 20, y / 5) * 1.2);
    topHalf(mk, g, r, o, w);
    bottomHalf(mk, g, r, w, h, true);
    frame(g, w, h, '#8f7448');
    return;
  }
  topHalf(mk, g, r, o, w);
  bottomHalf(mk, g, r, w, h, false);
  if (st === 'mark' || st === 'signed') {
    carrierMark(g, 22, 70, MARTEN_HAND.color);
    line(mk, g, r, MARK_DATE, 44, 72, MARTEN_HAND);
  }
  if (st === 'signed') {
    line(mk, g, r, SIGNATURE, SIGNATURE_AT.x, SIGNATURE_AT.y, hand({ scale: 2, slant: WARM_HAND.slant * 2, color: NAME_LIGHT, glow: NAME_GLOW, align: 'center' }));
  }
  frame(g, w, h, '#8f7448');
}
function ep7_page(mk, r, o) {
  const mode = modeOf(o, PAGE_STAGES);
  const w = mk().width, h = mk().height;
  const draw = (g, st) => pageStage(mk, g, r, o, st, w, h);
  if (mode === 'half') {
    // the half page comes up through the ice: from bare ice, the frosted page appears
    return stages(mk, (g, st) => (st ? draw(g, 'half') : fillRamp(g, 0, 0, w, h, ICE, (x, y) => 2.4 + noise(x / 12, y / 8) * 1.2 - y / 120)),
      false, true, 'ep7_page', 'half');
  }
  const before = { joined: 'apart', mark: 'joined', signed: 'mark' }[mode];
  return stages(mk, draw, before, mode, 'ep7_page', mode);
}

// ================================================================================================ the letter, restored
export const LETTER_ADDRESS = 'TESS, AT WILLOWMERE';
export const LETTER_FROM = 'MARTEN';
export const LETTER_DATE = '7 Thawmonth';
export const ADDRESS_AT = { x: 104, y: 34 };

function envelope(g, w, h) {
  paper(g, 0, 0, w, h, PAPER, 0.2);
  // the flap's fold lines and a broken wax seal
  seg(g, 2, 2, 104, 30, '#b89c6a', 0.6); seg(g, w - 3, 2, 104, 30, '#b89c6a', 0.6);
  for (let dy = -4; dy <= 4; dy++) for (let dx = -5; dx <= 5; dx++) if (Math.hypot(dx, dy * 1.2) < 5) px(g, 104 + dx, 30 + dy, dx + dy < 0 ? '#a8323a' : '#7a2028');
  seg(g, 101, 27, 107, 33, '#4a1418');
  // water stains: it went south on the wrong ship
  for (let k = 0; k < 40; k++) px(g, 30 + Math.cos(k / 6.4) * 14, 76 + Math.sin(k / 6.4) * 8, '#b89c6a', 0.5);
  // the stamp
  rect(g, w - 30, 6, 20, 24, '#e2d6c4'); rect(g, w - 28, 8, 16, 20, '#4064b9'); px(g, w - 20, 16, '#f9d77a');
}
function ep7_letter(mk, r) {
  const w = mk().width, h = mk().height;
  const base = mk(), over = mk();
  const draw = (g, restored) => {
    envelope(g, w, h);
    line(mk, g, r, LETTER_FROM, 10, 6, MARTEN_HAND);
    line(mk, g, r, LETTER_DATE, 10, 18, MARTEN_HAND);
    if (restored) line(mk, g, r, LETTER_ADDRESS, ADDRESS_AT.x, ADDRESS_AT.y + 12, { ...MARTEN_HAND, align: 'center', scale: 1 });
    else {
      // the address gone: frosted blank where it was
      fillRamp(g, 40, ADDRESS_AT.y + 10, 168, ADDRESS_AT.y + 26, ['#ead8a8', '#f0e2b8', FROST], (x, y) => 1.4 + noise(x / 7, y / 4));
    }
    rect(g, 40, ADDRESS_AT.y + 26, 128, 1, '#8f7448', 0.6);
    frame(g, w, h, '#8f7448');
  };
  draw(base.getContext('2d'), true);
  draw(over.getContext('2d'), false);
  // the address comes back (a cross-fade off the frosted blank)
  return { base, over, how: 'run', frames: fadeFrames('ep7_letter', 'restored') };
}

export const EP7_PAGES = { ep7_chart, ep7_carving, ep7_tally, ep7_tag, ep7_seventh, ep7_page, ep7_letter };
/** The modes each kind opens in (story.js; undefined = the kind's one mode). */
export const PAGE_MODES = {
  ep7_chart: ['fading'], ep7_carving: ['fading', 'whole'], ep7_tally: [undefined], ep7_tag: [undefined],
  ep7_seventh: [undefined], ep7_page: PAGE_STAGES, ep7_letter: ['restored'],
};

/** Register the seven kinds on PAGE_KINDS (another pack's kinds stay). Idempotent. */
export function register() {
  for (const [k, fn] of Object.entries(EP7_PAGES)) if (!PAGE_KINDS[k] || PAGE_KINDS[k] === fn) PAGE_KINDS[k] = fn;
  return Object.keys(EP7_PAGES);
}

export default register;
