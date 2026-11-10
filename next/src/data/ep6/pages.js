// Episode 6's page close-ups (the insert frame of world/closeup.js, 208 x 96), EPISODE6_PLAN 9.4, CRITIQUE_6 item 3 and
// CRITIQUE_7 item 7: the payoffs shown, in stages. The pack's index.js calls register() (after `world`), which puts the four
// kinds on PAGE_KINDS; story.js opens them through page(s, kind, mode) only when the kind is registered.
//
//   ep6_slip      { mode: 'burned' }  the boarding slip from the bird: Zephyr Landing to the Storm Observatory, four seat
//                                     lines, three names, the fourth seat a lightning burn (ep6_morning)
//   ep6_manifest  { mode: 'struck' }  the fleet's last crew list: twelve numbered lines in a pilot's hand, the twelfth
//                                     scratched so hard the paper is thin (chart_room)
//                 { mode: 'restored' } the same list; the twelfth line writes itself back in: Pippa Voss (scribe_after)
//   ep6_letter    (one mode)          Vex's letter in the warm hand: three lines, a clean blank where the signature was,
//                                     the counter-seal under the blank (an open book with one line, in red wax) (vex_falls)
//   ep6_page      { mode: 'name' }    the first page: the hero's name written for the first time, the brightest thing on
//                                     the page (it writes itself in)
//                 { mode: 'seal' }    the counter-seal under it, the same open book with one line (fades in over `name`)
//                 { mode: 'torn' }    "Keep this one." in full and under it the start of another line, torn straight across
//                                     ("Carried down the White Road by"), the bottom of the page a real ragged tear (fades
//                                     in over `seal`) (cloud_library)
//
// Code-made, like EP5_PAGES: words are set in the game's font, never painted, so they stay exact. THE WARM HAND is drawn
// exactly as Episode 5's ep5_page drew Ishra's (the main font, ink #6e3a1a, slanted 2 px across the line, src/data/ep5/
// pages.js), so the k of "Keep" and "asked" in Vex's letter and on the first page is Ishra's k: seen, not told.

import { BAYER4 } from '../../core/renderer.js';
import { PAGE_KINDS } from '../../world/closeup.js';

const INK = '#14101e';
/** The warm hand of "Keep this one." (Episode 5's ep5_page: the main font, this ink, slant 2). */
export const WARM_HAND = { color: '#6e3a1a', slant: 2 };
const PAPER = ['#a98a56', '#c8ab72', '#dcc38c', '#ead8a8', '#f3e7c4'];           // a good page (the letter, the manifest)
const OLD_PAPER = ['#5e4630', '#7a5d3a', '#957447', '#ac8a57', '#c09f6a'];       // the first page: old, in the room's light
const CARD = ['#b9ad94', '#d2c6aa', '#e2d8bd', '#ece4cc', '#f5efdc'];            // the slip's card
const DESK = ['#1d1520', '#2a1e24', '#3a2a2a', '#4a3630'];                       // the table under the slip, the shelf under the page
const BRASS = '#cfaa52', BRASS_HI = '#efd78c', BRASS_DK = '#6b5127';
const CLERK = '#24325c';                                                        // the clerk's stamp ink (the slip)
const PILOT = '#2a2340';                                                        // a pilot's pen (the manifest)
const NAME_LIGHT = '#fff4d6', NAME_GLOW = '#e9b65a';                            // the hero's name on the first page
const WAX = ['#4a1418', '#7a2028', '#a8323a', '#cf5a52'];
const BURN = ['#120c0c', '#2d1b1f', '#571f28', '#b34532', '#eba14d', '#f9d77a'];

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** Deterministic hash in 0..1 (the same page on every opening). */
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
/** Fill a rect from a ramp, value fn(x, y, w, h) (dithered). */
function fillRamp(g, x0, y0, x1, y1, R, fn) {
  const w = x1 - x0, h = y1 - y0, img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, gg, b] = hex(ramp(R, fn(x, y, w, h), x + x0, y + y0));
    const i = (y * w + x) * 4;
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, x0, y0);
}
/** Paper over a rect, darker toward its edges. */
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
 * One line of the game's font on a page (Episode 5's helper, so the warm hand is the same hand). o: { font, scale, color,
 * align: 'center', slant (px across the height), fit (widest px before a scaled line drops to its natural size), glow (a
 * colour: a soft halo drawn first), alpha }.
 */
function line(mk, g, r, str, x, y, o = {}) {
  const t = mk(), c = t.getContext('2d'), font = o.font || 'main';
  r.font(font).draw(c, str, 0, 0, { color: o.color || INK, font, shadow: false, outline: false });
  const tw = r.measure(str, font), lh = 20;
  const scale = o.fit && tw * (o.scale || 1) > o.fit ? 1 : o.scale || 1;
  const dx = o.align === 'center' ? x - Math.round((tw * scale) / 2) : x;
  g.imageSmoothingEnabled = false;
  const put = (ox, oy, src, a) => {
    g.globalAlpha = a;
    for (let row = 0; row < lh; row++) {
      const shift = o.slant ? Math.round(((lh - row) / lh) * o.slant) : 0;
      g.drawImage(src, 0, row, tw + 2, 1, dx + shift + ox, y + row * scale + oy, (tw + 2) * scale, scale);
    }
    g.globalAlpha = 1;
  };
  if (o.glow) {
    const h = mk(), hc = h.getContext('2d');
    r.font(font).draw(hc, str, 0, 0, { color: o.glow, font, shadow: false, outline: false });
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(ox, oy, h, 0.35);
  }
  put(0, 0, t, o.alpha == null ? 1 : o.alpha);
  return { x: dx, w: Math.round(tw * scale) + (o.slant || 0), h: Math.round(11 * scale) };
}
const hand = (o = {}) => ({ ...WARM_HAND, ...o });
const heroName = (o) => String(o.name || 'Hero');

/** The counter-seal: an open book (two pages meeting at a dipped spine) with one line on its right page. */
function openBook(g, cx, cy, c, a = 1, line1 = c, s = 1) {
  // each page: its top edge arching up from the spine to the outer corner, the outer edge, the bottom edge dipping to
  // the spine; a second line under each bottom edge (the pages beneath); the spine; one written line on the right page
  const W = Math.round(13 * s), Hh = Math.round(9 * s);
  for (const side of [-1, 1]) {
    for (let k = 0; k <= W; k++) {
      const t = k / W, lift = Math.round(Math.sin(t * Math.PI * 0.9) * 2 * s + t * s);
      px(g, cx + side * k, cy - lift, c, a);                                      // the top edge
      px(g, cx + side * k, cy + Hh - Math.round(t * 2 * s), c, a);                // the bottom edge
      if (k > 1 && k < W) px(g, cx + side * k, cy + Hh + 1 - Math.round(t * 2 * s), c, a * 0.6);
    }
    const ox = cx + side * W, top = cy - Math.round(Math.sin(0.9 * Math.PI) * 2 * s + s), bot = cy + Hh - Math.round(2 * s);
    seg(g, ox, top, ox, bot, c, a);
  }
  seg(g, cx, cy, cx, cy + Hh + 1, c, a);
  seg(g, cx + Math.round(3 * s), cy + Math.round(3 * s), cx + Math.round(10 * s), cy + Math.round(2 * s), line1, a);
}

// ================================================================================================ the boarding slip
/** Where the burn of the fourth seat sits (tests). */
export const BURN_AT = { x: 64, y: 82 };

function ep6_slip(mk, r, o) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  fillRamp(g, 0, 0, w, h, DESK, (x, y) => 1 + noise(x / 30, y / 6) * 1.6 + (y % 12 === 0 ? -0.6 : 0));
  // the card, a little skewed on the table, its stub perforated on the right
  paper(g, 6, 4, 202, 93, CARD, 0.3);
  for (let y = 6; y < 92; y += 3) px(g, 160, y, '#8f8470');
  rect(g, 7, 4, 194, 1, '#f9f4e4');
  // the header: a brass winged compass and the route
  const cx = 18, cy = 12;
  for (let k = 0; k < 12; k++) px(g, cx + Math.cos((k * Math.PI) / 6) * 4, cy + Math.sin((k * Math.PI) / 6) * 4, BRASS);
  seg(g, cx - 2, cy, cx + 2, cy, BRASS_DK); seg(g, cx, cy - 2, cx, cy + 2, BRASS_DK);
  seg(g, cx - 9, cy - 2, cx - 5, cy, BRASS); seg(g, cx + 5, cy, cx + 9, cy - 2, BRASS);
  line(mk, g, r, 'BOARDING SLIP', 30, 6, { color: CLERK });
  line(mk, g, r, 'Zephyr Landing to the Storm Observatory', 12, 20, { color: CLERK });
  rect(g, 12, 32, 144, 1, '#8f8470');
  // the four seats: the clerk's stamp, three names, the fourth a lightning burn
  const names = [heroName(o), 'Mira', 'Bram'];
  for (let i = 0; i < 4; i++) {
    const y = 36 + i * 14;
    line(mk, g, r, `Seat ${i + 1}`, 14, y, { color: CLERK });
    rect(g, 48, y + 11, 104, 1, '#a89c82');
    if (i < 3) line(mk, g, r, names[i], 54, y, { color: CLERK, fit: 96 });
  }
  // the burn: a black scorch with a jagged lightning bite, a hot rim and soot round it
  const bx = BURN_AT.x, by = BURN_AT.y;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -16; dx <= 40; dx++) {
    const x = bx + dx, y = by + dy;
    const zig = Math.abs(((dx + 64) % 10) - 5) * 0.9 - 2;           // a zigzag edge along the bite
    const n = noise(x / 4, y / 3);
    const d = Math.hypot(dx / (22 + n * 10), (dy + zig * 0.5) / (5 + n * 2.5));
    if (d > 1.35) continue;
    const th = (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
    if (d < 0.62) px(g, x, y, BURN[0]);
    else if (d < 0.78) px(g, x, y, d < 0.7 ? BURN[3] : BURN[2]);
    else if (d < 0.86) px(g, x, y, BURN[4]);
    else if (th < (1.35 - d) * 1.6) px(g, x, y, BURN[1], 0.7);
  }
  // a lightning fork scorched out of the burn toward the stub
  seg(g, bx + 26, by - 4, bx + 32, by + 1, BURN[1]); seg(g, bx + 32, by + 1, bx + 30, by + 3, BURN[1]);
  seg(g, bx + 30, by + 3, bx + 38, by + 6, BURN[1]);
  // the stub: a stamp of the skyport and the silver ribbon from the bird's leg
  for (let k = 0; k < 20; k++) px(g, 181 + Math.cos((k * Math.PI) / 10) * 9, 40 + Math.sin((k * Math.PI) / 10) * 9, CLERK, 0.7);
  for (let k = 0; k < 12; k++) px(g, 181 + Math.cos((k * Math.PI) / 6) * 4, 40 + Math.sin((k * Math.PI) / 6) * 4, CLERK, 0.7);
  seg(g, 172, 38, 177, 40, CLERK, 0.7); seg(g, 185, 40, 190, 38, CLERK, 0.7);
  for (let k = 0; k < 30; k++) {
    const x = 168 + k, y = 70 + Math.round(Math.sin(k / 4) * 3) + (k > 20 ? (k - 20) : 0);
    px(g, x, y, '#e2e0de'); px(g, x, y + 1, '#b3b6c4'); if (k % 5 === 0) px(g, x, y - 1, '#f6f4ee');
  }
  frame(g, w, h, BRASS_DK);
  return { base };
}

// ================================================================================================ the manifest
const ROW = (i) => ({ x: i < 6 ? 12 : 110, y: 22 + (i % 6) * 12 });
/** Where the twelfth line sits (tests). */
export const TWELFTH = { x: 110, y: 82, w: 92, h: 11 };

function pilotScribble(g, x, y, i) {
  // a pilot's pen: a name in a quick hand, not readable at this size (only the twelfth line's name is ever read)
  let cx = x;
  const words = 1 + Math.floor(rnd(i, 3, 6) * 2);
  for (let k = 0; k < words; k++) {
    const len = 12 + Math.floor(rnd(i, k, 7) * 22);
    for (let s = 0; s < len; s++) {
      const yy = y + 6 + Math.round(Math.sin((s + i * 3) * 1.3) * 1.5 + (rnd(i, s, 8) > 0.8 ? -2 : 0));
      px(g, cx + s, yy, PILOT, 0.9);
      if (rnd(i, s, 9) > 0.7) px(g, cx + s, yy - 1, PILOT, 0.7);
    }
    px(g, cx, y + 2, PILOT); px(g, cx, y + 3, PILOT); px(g, cx, y + 4, PILOT);       // a capital's stroke
    cx += len + 5;
  }
}
function manifestPage(mk, r, g, w, h) {
  paper(g, 0, 0, w, h, PAPER);
  // pinned: a brass pin at each top corner, a fold across the middle
  for (const x of [6, w - 7]) { rect(g, x - 1, 3, 3, 3, BRASS); px(g, x, 3, BRASS_HI); }
  for (let x = 2; x < w - 2; x++) if (x % 2) px(g, x, 48, '#b89c6a', 0.6);
  line(mk, g, r, 'CREW LIST', 12, 4, { color: PILOT });
  line(mk, g, r, 'Capt. Aeris', w - 12 - r.measure('Capt. Aeris', 'main'), 4, { color: PILOT });
  rect(g, 12, 17, w - 24, 1, PILOT, 0.6);
  for (let i = 0; i < 12; i++) {
    const { x, y } = ROW(i);
    line(mk, g, r, `${i + 1}.`, x, y, { color: PILOT });
    if (i < 11) pilotScribble(g, x + 16, y, i);
    rect(g, x + 14, y + 10, 78, 1, '#b89c6a', 0.7);
  }
}
/** The twelfth line scratched out so hard the paper is thin: pale bare fibre, scratch strokes across it, no name. */
function scratched(g) {
  const { x, y, w, h } = TWELFTH;
  for (let yy = y; yy < y + h; yy++) for (let xx = x + 14; xx < x + w; xx++) {
    const n = noise(xx / 3, yy / 2);
    px(g, xx, yy, n > 0.55 ? '#f6f0d8' : '#efe6c6');
  }
  for (let k = 0; k < 9; k++) {
    const x0 = x + 16 + k * 8, y0 = y + 1 + Math.floor(rnd(k, 1, 11) * 3);
    seg(g, x0, y0 + 6, x0 + 12, y0, '#c9b088');
    seg(g, x0 + 2, y0 + 8, x0 + 13, y0 + 3, '#d8c49c');
  }
}
function ep6_manifest(mk, r, o) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  manifestPage(mk, r, g, w, h);
  scratched(g);
  frame(g, w, h, BRASS_DK);
  if (o.mode !== 'restored') return { base };
  // restored: the twelfth line writes itself back in (a wipe over the struck page): the paper whole again, her name
  const over = mk(), c = over.getContext('2d');
  const { x, y, w: tw, h: th } = TWELFTH;
  fillRamp(c, x + 14, y, x + tw, y + th, PAPER, (xx, yy) => 2.2 + noise((xx + x) / 13, (yy + y) / 9) * 1.4);
  rect(c, x + 14, y + 10, 78, 1, '#b89c6a', 0.7);
  line(mk, c, r, 'Pippa Voss', x + 18, y, { color: '#120c1e', glow: '#e9d9a8' });
  return { base, over, how: 'wipe', frames: 70 };
}

// ================================================================================================ Vex's letter
/** The clean blank where the signature was (tests): it is the cleanest paper on the page. */
export const SIGNATURE_BLANK = { x: 112, y: 58, w: 74, h: 12 };
export const LETTER_LINES = ["Keep a child's first page", 'where no list can read it.', 'You will be asked for nothing else.'];

function waxSeal(g, cx, cy) {
  for (let dy = -12; dy <= 12; dy++) for (let dx = -14; dx <= 14; dx++) {
    const d = Math.hypot(dx, dy * 1.15) + Math.sin(Math.atan2(dy, dx) * 7) * 0.6;
    if (d > 13) continue;
    const lit = -(dx + dy) / 18;
    px(g, cx + dx, cy + dy, d > 11.6 ? WAX[0] : lit > 0.35 ? WAX[3] : lit > -0.25 ? WAX[2] : WAX[1]);
  }
  // the book pressed into the wax: dark lines, a lit lip under each (the impression)
  openBook(g, cx + 1, cy - 2, WAX[3], 0.8, WAX[3], 0.72);
  openBook(g, cx, cy - 3, WAX[0], 1, WAX[0], 0.72);
}
function ep6_letter(mk, r) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  paper(g, 0, 0, w, h, PAPER);
  for (let y = 2; y < h - 2; y++) if (y % 2) px(g, 104, y, '#b89c6a', 0.5);              // the fold
  for (let x = 2; x < w - 2; x++) if (x % 3) px(g, x, 47, '#b89c6a', 0.35);
  LETTER_LINES.forEach((s, i) => line(mk, g, r, s, 14, 8 + i * 15, hand()));
  // where the signature should be: a clean blank, as if the name had been lifted off (the cleanest paper on the page)
  const B = SIGNATURE_BLANK;
  fillRamp(g, B.x, B.y, B.x + B.w, B.y + B.h, ['#ead8a8', '#f0e2b8', '#f3e7c4'], (x, y) => 1.4 + noise(x / 9, y / 5) * 0.8);
  for (let x = B.x; x < B.x + B.w; x++) { px(g, x, B.y - 1, '#d6bf8e', 0.6); px(g, x, B.y + B.h, '#cfb684', 0.6); }
  px(g, B.x - 3, B.y + 9, WARM_HAND.color); px(g, B.x - 2, B.y + 8, WARM_HAND.color);        // a pen's last touch before it
  waxSeal(g, B.x + B.w / 2, 83);
  frame(g, w, h, '#8f7448');
  return { base };
}

// ================================================================================================ the first page
/** The hero's name on the first page (tests): its box. */
export const NAME_BOX = { y: 4, h: 26 };
const SEAL_AT = { x: 104, y: 34 };
export const TEAR_Y = 77;
export const PAGE_STAGES = ['name', 'seal', 'torn'];

/** The tear's line: y of the torn edge at x (ragged: a long wave, short jags, single fibres). */
export function tearAt(x) {
  return TEAR_Y + Math.round(Math.sin(x / 23) * 2 + Math.sin(x / 7.3 + 1) * 1.2 + (rnd(x, 3, 13) - 0.5) * 2.4);
}
function firstPage(g, w, h) {
  // the old page, darkened at its edges, lying in the room's light
  paper(g, 0, 0, w, h, OLD_PAPER);
  for (let y = 4; y < h - 4; y++) if (y % 2) px(g, 104, y, '#5e4630', 0.45);             // the old fold
}
function nameOf(mk, g, r, o) {
  // the warm hand at twice the size (the main font, the same slant angle: 2 px per line becomes 4 at scale 2)
  return line(mk, g, r, heroName(o), 104, NAME_BOX.y, { scale: 2, fit: 170, align: 'center', color: NAME_LIGHT,
    glow: NAME_GLOW, slant: WARM_HAND.slant * 2 });
}
function sealOf(g) { openBook(g, SEAL_AT.x, SEAL_AT.y, WARM_HAND.color, 1, WARM_HAND.color); }
/** Draw the page as it rests at a stage (0 the bare page, 1 + the name, 2 + the seal, 3 + the lines and the tear). */
function pageStage(mk, g, r, o, stage, w, h) {
  firstPage(g, w, h);
  if (stage >= 2) sealOf(g);
  if (stage >= 3) {
    line(mk, g, r, 'Keep this one.', 104, 52, hand({ align: 'center' }));
    line(mk, g, r, 'Carried down the White Road by', 104, 68, hand({ align: 'center' }));
    // the tear: everything below the ragged line is gone (the shelf's dark wood shows); the torn edge shows pale fibre
    for (let x = 0; x < w; x++) {
      const t = tearAt(x);
      for (let y = t + 1; y < h; y++) px(g, x, y, ramp(DESK, 1.4 + noise(x / 20, y / 5) * 1.2, x, y));
      px(g, x, t, '#d8c49c');
      if (rnd(x, 7, 14) > 0.72) px(g, x, t + 1, '#c8b08a');                              // a fibre hanging over the edge
      if (rnd(x, 8, 15) > 0.86) px(g, x, t - 1, '#e6d4ac');
    }
  }
  if (stage >= 1) nameOf(mk, g, r, o);
  frame(g, w, h, '#8f7448');
}
function ep6_page(mk, r, o) {
  const k = Math.max(0, PAGE_STAGES.indexOf(o.mode));
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  if (k === 0) {
    // the name writes itself in, in the warm hand, light on the old page
    pageStage(mk, g, r, o, 0, w, h);
    const over = mk(), c = over.getContext('2d');
    nameOf(mk, c, r, o);
    return { base, over, how: 'wipe', frames: 80 };
  }
  pageStage(mk, g, r, o, k + 1, w, h);
  const over = mk();
  pageStage(mk, over.getContext('2d'), r, o, k, w, h);
  return { base, over, how: 'run', frames: 50 };
}

export const EP6_PAGES = { ep6_slip, ep6_manifest, ep6_letter, ep6_page };
/** The modes each kind opens in (story.js). */
export const PAGE_MODES = { ep6_slip: ['burned'], ep6_manifest: ['struck', 'restored'], ep6_letter: [undefined], ep6_page: PAGE_STAGES };

/** Register the four kinds on PAGE_KINDS (another pack's kinds stay). Idempotent. */
export function register() {
  for (const [k, fn] of Object.entries(EP6_PAGES)) if (!PAGE_KINDS[k] || PAGE_KINDS[k] === fn) PAGE_KINDS[k] = fn;
  return Object.keys(EP6_PAGES);
}

export default register;
