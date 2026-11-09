// Episode 5's page close-ups (the insert frame of world/closeup.js, 208 x 96), EPISODE5_PLAN 9.4 and CRITIQUE_6 item 3:
// the payoffs shown, never only told. The pack's index.js calls register() (after `world`), which puts the three kinds on
// PAGE_KINDS; story.js opens them through page(s, kind, mode) only when the kind is registered.
//
//   ep5_letter   { mode: 'full' }   Sel's letter in the dark: three names in star ink (the hero's, Mira's, Bram's)
//                { mode: 'blank' }  the morning after: the top name gone to a smudge of starlight (ep5_morning)
//   ep5_chart    { mode: 'prophecy' } the chart's sky: one faint star beside Laleh's empty space; the prophecy writes
//                                    itself in starlight across it (star_reading)
//                { mode: 'restored' } the struck stars light again (they write themselves in); the hero's star in the
//                                    space, the brightest thing on the page; under it the counter-seal drawn in stars (an
//                                    open book with one line) and "Keep this one." in starlight (oracle_after)
//                { mode: 'road' }     a line of caravan stars leading north and west from the Haven to a library above
//                                    the clouds, the new reading (ep5_ending)
//   ep5_page     Ishra's page, sealed in glass: the canon line in a warm, careful hand (sel_memory_3)
//
// Code-made, like EP4_PAGES: words are always set in the game's font, never painted, so they stay exact; the art is
// stars, paper and glass. A painted page could drop in behind the words by replacing paper() or sky() alone.

import { BAYER4 } from '../../core/renderer.js';
import { PAGE_KINDS } from '../../world/closeup.js';

const INK = '#14101e';
const PAPER = ['#a98a56', '#c8ab72', '#dcc38c', '#ead8a8', '#f3e7c4'];
const DIM_PAPER = ['#2a2433', '#352d3c', '#423745', '#4f424d', '#5d4e55'];        // the letter, held in the dark
const SKY = ['#060816', '#0a0f26', '#0f1736', '#152048', '#1d2b5c'];
const GOLD = '#c9a24a', GOLD_HI = '#ffe79a', GOLD_DIM = '#8a6a2c';
const STAR = '#f4f8ff', STAR_BLUE = '#a8d8f0', STAR_DIM = '#5a6f9c', STRUCK = '#2a3458';
const HAND = '#6e3a1a', GLASS = ['#7f9fb0', '#a9c6d2', '#d6eaef'];

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
/** Fill a rect from a ramp, value fn(x, y) (dithered). */
function fillRamp(g, x0, y0, x1, y1, R, fn) {
  const w = x1 - x0, h = y1 - y0, img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, gg, b] = hex(ramp(R, fn(x, y, w, h), x + x0, y + y0));
    const i = (y * w + x) * 4;
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, x0, y0);
}
/** Parchment over a rect, darker toward its edges. */
function paper(g, x0, y0, x1, y1, R = PAPER) {
  fillRamp(g, x0, y0, x1, y1, R, (x, y, w, h) => {
    const n = noise(x / 13, y / 9) * 0.6 + noise(x / 5, y / 4) * 0.4;
    const edge = Math.min(x, w - 1 - x, y * 2, (h - 1 - y) * 2);
    return 1.2 + n * 2.6 + Math.min(0, edge - 8) * 0.14;
  });
}
/** The night sky of a chart: dark at the top and the corners, a faint band of the river of stars across. */
function sky(g, w, h) {
  fillRamp(g, 0, 0, w, h, SKY, (x, y) => {
    const band = Math.max(0, 1 - Math.abs((y - 30) - (x - 104) * 0.25) / 26);
    const v = 1.0 + noise(x / 18, y / 10) * 1.2 + band * 1.6 - Math.max(0, Math.abs(x - 104) - 70) * 0.03;
    return v;
  });
}
function px(g, x, y, c, a = 1) { g.globalAlpha = a; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = 1; }
function rect(g, x, y, w, h, c, a = 1) { g.globalAlpha = a; g.fillStyle = c; g.fillRect(x, y, w, h); g.globalAlpha = 1; }
/** A star: 0 a point, 1 a small cross, 2 a cross with a soft halo, 3 THE star (long rays, a white core, a dithered halo). */
function star(g, x, y, size, c = STAR) {
  x = Math.round(x); y = Math.round(y);
  if (size >= 3) {
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
      const d = Math.hypot(dx, dy);
      if (d < 3 || d > 7.5) continue;
      if ((BAYER4[(((y + dy) & 3) << 2) | ((x + dx) & 3)] + 0.5) / 16 < (7.5 - d) / 7.5 * 0.85) px(g, x + dx, y + dy, GOLD_HI, 0.55);
    }
    for (let k = -6; k <= 6; k++) { const a = 1 - Math.abs(k) / 7; px(g, x + k, y, STAR, a); px(g, x, y + k, STAR, a); }
    for (let k = -2; k <= 2; k++) { px(g, x + k, y + k, STAR, 0.5); px(g, x + k, y - k, STAR, 0.5); }
    rect(g, x - 1, y - 1, 3, 3, '#ffffff');
    return;
  }
  px(g, x, y, c);
  if (size >= 1) { px(g, x - 1, y, c, 0.6); px(g, x + 1, y, c, 0.6); px(g, x, y - 1, c, 0.6); px(g, x, y + 1, c, 0.6); }
  if (size >= 2) { px(g, x - 2, y, c, 0.3); px(g, x + 2, y, c, 0.3); px(g, x, y - 2, c, 0.3); px(g, x, y + 2, c, 0.3); }
}
/** A dotted line between two points (constellation lines). */
function dots(g, x0, y0, x1, y1, c, a = 0.7, step = 2) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let k = 0; k <= n; k += step) px(g, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c, a);
}
function frame(g, w, h, c = GOLD) {
  rect(g, 0, 0, w, 1, INK); rect(g, 0, h - 1, w, 1, INK); rect(g, 0, 0, 1, h, INK); rect(g, w - 1, 0, 1, h, INK);
  rect(g, 1, 1, w - 2, 1, c); rect(g, 1, h - 2, w - 2, 1, c); rect(g, 1, 1, 1, h - 2, c); rect(g, w - 2, 1, 1, h - 2, c);
}
/**
 * One line of the game's font on a page. o: { font, scale, color, align: 'center', slant (px across the height), fit (widest
 * px before a scaled line drops to its natural size), glow (a colour: a soft halo drawn first), alpha }.
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
}
const heroName = (o) => String(o.name || 'Hero');

// ================================================================================================ the letter
function ep5_letter(mk, r, o) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  paper(g, 0, 0, w, h, DIM_PAPER);
  // Sel's ordinary ink, unreadable in the dark: rows of faint scribble down the left
  for (let row = 0; row < 7; row++) {
    const y = 10 + row * 10;
    for (let x = 12; x < 92; x += 3 + Math.floor(rnd(row, x, 3) * 4)) {
      const len = 2 + Math.floor(rnd(x, row, 4) * 5);
      if (x + len > 94) break;
      rect(g, x, y + (rnd(x, row, 5) > 0.7 ? 1 : 0), len, 1, '#1c1726', 0.75);
    }
  }
  // Sel's mark: a small sun ring in old gold
  for (let k = 0; k < 16; k++) px(g, 22 + Math.cos((k * Math.PI) / 8) * 4, 82 + Math.sin((k * Math.PI) / 8) * 4, GOLD_DIM);
  px(g, 22, 82, GOLD);
  // the three names in star ink, glowing: the hero's, Mira's, Bram's
  const names = [heroName(o), 'Mira', 'Bram'];
  const ys = [4, 34, 64];
  names.forEach((n, i) => {
    if (i === 0 && o.mode === 'blank') {
      // the top name gone: a smudge of starlight where the letters were (a wiped, uneven smear; nothing readable)
      const cx = 150, cy = ys[0] + 13;
      for (let dy = -9; dy <= 9; dy++) for (let dx = -44; dx <= 44; dx++) {
        const n = noise((cx + dx) / 7, (cy + dy) / 4);
        const d = Math.hypot(dx / (34 + n * 14), (dy + Math.sin(dx / 9) * 2) / (5 + n * 4));
        if (d > 1) continue;
        const th = (BAYER4[(((cy + dy) & 3) << 2) | ((cx + dx) & 3)] + 0.5) / 16;
        const k = (1 - d) * (0.35 + 0.65 * n);
        if (th < k * 0.9) px(g, cx + dx, cy + dy, k > 0.45 ? '#7f9cc8' : STAR_DIM, 0.75);
      }
      for (const [sx, sy] of [[124, 14], [171, 21], [146, 12], [158, 22]]) px(g, sx, sy, STAR_BLUE, 0.55);
      return;
    }
    line(mk, g, r, n, 152, ys[i], { font: 'large', scale: 2, fit: 104, align: 'center', color: '#dff4ff', glow: '#4c8ec0', slant: 1 });
  });
  // star specks of the ink round the names
  for (const [sx, sy, s] of [[106, 30, 1], [196, 50, 0], [110, 76, 0], [198, 14, 1], [104, 56, 0]]) {
    if (o.mode === 'blank' && sy < 32) continue;
    star(g, sx, sy, s, STAR_BLUE);
  }
  frame(g, w, h, GOLD_DIM);
  return { base };
}

// ================================================================================================ the chart
const FIELD = (() => {
  const out = [];
  for (let i = 0; i < 150; i++) out.push([Math.floor(rnd(i, 1, 9) * 204) + 2, Math.floor(rnd(i, 2, 9) * 92) + 2, rnd(i, 3, 9)]);
  return out;
})();
const SPACE = { x: 132, y: 30 };                    // Laleh's empty space; the hero's star goes here
const NEIGHBOR = { x: 118, y: 36 };                 // the faint star beside it
// the counter-seal in stars: an open book (two pages meeting at the spine) with one line on its right page
const BOOK = { pts: [[148, 59], [158, 63], [168, 59], [168, 69], [158, 72], [148, 69]],
  links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 4]], line: [[161, 65], [166, 63]] };
// a known constellation of the realm (the seven wandering stars of the Haven's mural)
const SEVEN = [[30, 22], [44, 14], [58, 20], [66, 34], [54, 44], [40, 40], [48, 28]];

function chartField(g, lit) {
  for (const [x, y, k] of FIELD) {
    if (Math.hypot(x - SPACE.x, y - SPACE.y) < 9) continue;
    if (lit) star(g, x, y, k > 0.93 ? 1 : 0, k > 0.6 ? STAR : STAR_BLUE);
    else if (k > 0.45) px(g, x, y, k > 0.8 ? STAR_DIM : STRUCK);
  }
  for (let i = 0; i < SEVEN.length - 1; i++) dots(g, SEVEN[i][0], SEVEN[i][1], SEVEN[i + 1][0], SEVEN[i + 1][1], lit ? GOLD_DIM : STRUCK, 0.8, 3);
  for (const [x, y] of SEVEN) star(g, x, y, lit ? 1 : 0, lit ? STAR : STAR_DIM);
}
function emptySpace(g) {
  for (let k = 0; k < 24; k++) if (k % 2 === 0) px(g, SPACE.x + Math.cos((k * Math.PI) / 12) * 7, SPACE.y + Math.sin((k * Math.PI) / 12) * 7, GOLD, 0.85);
}

function prophecy(mk, r) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  sky(g, w, h);
  chartField(g, false);
  emptySpace(g);
  star(g, NEIGHBOR.x, NEIGHBOR.y, 1, STAR_DIM);
  frame(g, w, h);
  const over = mk(), c = over.getContext('2d');
  line(mk, c, r, 'WHEN THE LAST NIGHT TURNS,', w / 2, 56, { align: 'center', color: '#cfeaff', glow: '#3d6fae' });
  line(mk, c, r, "THE KEPT ONE'S STAR GOES OUT.", w / 2, 70, { align: 'center', color: '#cfeaff', glow: '#3d6fae' });
  return { base, over, how: 'wipe', frames: 110 };
}

function restored(mk, r, o) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  sky(g, w, h);
  chartField(g, false);
  // the counter-seal, drawn in stars, under the hero's star
  for (const [a, b] of BOOK.links) dots(g, BOOK.pts[a][0], BOOK.pts[a][1], BOOK.pts[b][0], BOOK.pts[b][1], GOLD, 0.75, 2);
  dots(g, BOOK.line[0][0], BOOK.line[0][1], BOOK.line[1][0], BOOK.line[1][1], GOLD_HI, 0.9, 1);
  for (const [x, y] of BOOK.pts) star(g, x, y, 1, STAR_BLUE);
  line(mk, g, r, 'Keep this one.', 156, 77, { align: 'center', color: '#e9d9a8', glow: '#6b5a2a', slant: 2 });
  star(g, NEIGHBOR.x, NEIGHBOR.y, 1, STAR_BLUE);
  line(mk, g, r, heroName(o), SPACE.x, SPACE.y + 9, { align: 'center', color: GOLD, fit: 80 });
  star(g, SPACE.x, SPACE.y, 3);                                  // the hero's star, the brightest thing on the page
  frame(g, w, h, GOLD_HI);
  // the struck stars light again, one by one along the chart (the wipe writes them in)
  const over = mk(), c = over.getContext('2d');
  chartField(c, true);
  return { base, over, how: 'wipe', frames: 90 };
}

function road(mk, r) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  sky(g, w, h);
  chartField(g, true);
  // the Haven: a little dome of stars at the bottom right
  const haven = [[182, 80], [188, 74], [194, 80], [176, 84], [200, 84]];
  for (const [x, y] of haven) star(g, x, y, 1, GOLD_HI);
  // the road: a line of caravan stars going north and west, lantern-gold, smaller as they go
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    pts.push([182 - t * 150 + Math.sin(t * 7) * 6, 74 - t * 58 + Math.cos(t * 5) * 3]);
  }
  for (let i = 0; i < pts.length - 1; i++) dots(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], GOLD_DIM, 0.7, 3);
  pts.forEach(([x, y], i) => star(g, x, y, i < 4 ? 2 : i < 8 ? 1 : 0, '#ffd27a'));
  // at the end of the road: a library above the clouds (a cloud of faint stars, a small house of stars on it)
  for (let k = 0; k < 26; k++) px(g, 20 + rnd(k, 1, 4) * 30, 18 + Math.sin(k) * 2 + rnd(k, 2, 4) * 4, '#c8d8f0', 0.55);
  const lib = [[26, 12], [32, 7], [38, 12], [38, 16], [26, 16]];
  for (let i = 0; i < lib.length; i++) dots(g, lib[i][0], lib[i][1], lib[(i + 1) % lib.length][0], lib[(i + 1) % lib.length][1], STAR_BLUE, 0.8, 1);
  star(g, 32, 7, 1, STAR);
  frame(g, w, h);
  return { base };
}

function ep5_chart(mk, r, o) {
  if (o.mode === 'restored') return restored(mk, r, o);
  if (o.mode === 'road') return road(mk, r, o);
  return prophecy(mk, r, o);
}

// ================================================================================================ Ishra's page
function ep5_page(mk, r) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  // the glass it was sealed in: a pale cool rim, a highlight streak
  fillRamp(g, 0, 0, w, h, GLASS, (x, y) => 0.8 + noise(x / 20, y / 6) * 0.8);
  paper(g, 6, 5, w - 6, h - 5);
  const lines = ['The future is not a single answer.', 'Carry the names of people who might', 'still choose another road.'];
  lines.forEach((s, i) => line(mk, g, r, s, 16, 14 + i * 22, { color: HAND, slant: 2 }));
  // her mark: a small sun over a line of road
  for (let k = 0; k < 12; k++) px(g, 186 + Math.cos((k * Math.PI) / 6) * 3, 76 + Math.sin((k * Math.PI) / 6) * 3, HAND, 0.8);
  dots(g, 176, 84, 196, 82, HAND, 0.8, 2);
  // the glass sheen over everything
  for (let k = 0; k < 70; k++) { px(g, 20 + k, 4 + Math.floor(k * 0.08), '#ffffff', 0.35); px(g, 24 + k, 5 + Math.floor(k * 0.08), '#ffffff', 0.18); }
  frame(g, w, h, GLASS[0]);
  return { base };
}

export const EP5_PAGES = { ep5_letter, ep5_chart, ep5_page };
/** Where the restored chart's brightest star sits (tests). */
export const HERO_STAR = { ...SPACE };

/** Register the three kinds on PAGE_KINDS (the ep4 pack's own kinds and any other pack's stay). Idempotent. */
export function register() {
  for (const [k, fn] of Object.entries(EP5_PAGES)) if (!PAGE_KINDS[k] || PAGE_KINDS[k] === fn) PAGE_KINDS[k] = fn;
  return Object.keys(EP5_PAGES);
}

export default register;
