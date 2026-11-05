// Episode 4's page close-ups (the insert frame of world/closeup.js, 208 x 96): the charter, "Keep this one." and the
// Witness Book page. Registered into PAGE_KINDS by scene.js; opened by regent_after in story.js.
//
//   charter              the relief charter with OPEN over the water; { run: true } lets the scraped CLOSE run off it
//   keep                 the hero's name on the water-stained page and the hurried line under it
//   witness              { stage: 'sign' } the hero's name, Lyra's written in; { stage: 'v' } both names, the third mark, the feather
//
// Code-made parchment: words are always set here, never painted, so they stay exact. A painted page drops in behind them
// by replacing paper() alone.

import { BAYER4 } from '../../core/renderer.js';

const INK = '#14101e';
const PAPER = ['#a98a56', '#c8ab72', '#dcc38c', '#ead8a8', '#f3e7c4'];
const WASH = ['#6f9c8e', '#86ae9c', '#9cbda8', '#b1cbb6', '#c4d8c4'];
const FLOOD = ['#1f5a5c', '#2f7570', '#4a8f82', '#6fac98', '#a0cbb4'];
const WOOD = ['#2a1a14', '#3a2418', '#4d3020', '#5f3e2a'];
const GOLD = '#c9a24a', RED = '#a8332c', HAND = '#c85a1e', FOAM = '#dff2e6';

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** Soft value noise, the same page on every opening. */
function noise(x, y) {
  const at = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j;
  const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function ramp(R, v, x, y) {
  const f = Math.max(0, Math.min(R.length - 1, v)), i = Math.floor(f);
  const th = (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  return R[Math.min(R.length - 1, f - i > th ? i + 1 : i)];
}
/** Parchment (or `R`) over a rect, dithered, darker toward its edges. */
function paper(g, x0, y0, x1, y1, R = PAPER) {
  const w = x1 - x0, h = y1 - y0, img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = noise(x / 13, y / 9) * 0.6 + noise(x / 5, y / 4) * 0.4;
    const edge = Math.min(x, w - 1 - x, y * 2, (h - 1 - y) * 2);
    const [r, gg, b] = hex(ramp(R, 1.2 + n * 2.6 + Math.min(0, edge - 8) * 0.14, x + x0, y + y0));
    const i = (y * w + x) * 4;
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, x0, y0);
}
function frame(g, w, h) {
  g.fillStyle = INK; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
  g.fillStyle = GOLD; g.fillRect(1, 1, w - 2, 1); g.fillRect(1, h - 2, w - 2, 1); g.fillRect(1, 1, 1, h - 2); g.fillRect(w - 2, 1, 1, h - 2);
}
/** One line of the game's font on a page. opts: { font, scale, fit: widest px, color, align: 'center', slant: px across the height } */
function line(mk, g, r, str, x, y, o = {}) {
  const t = mk(), c = t.getContext('2d'), font = o.font || 'main';
  r.font(font).draw(c, str, 0, 0, { color: o.color || INK, font, shadow: false, outline: false });
  const tw = r.measure(str, font), lh = 20;
  const scale = o.fit && tw * (o.scale || 1) > o.fit ? 1 : o.scale || 1;   // a long name drops to its natural size
  const dx = o.align === 'center' ? x - Math.round((tw * scale) / 2) : x;
  g.imageSmoothingEnabled = false;
  for (let row = 0; row < lh; row++) {
    const shift = o.slant ? Math.round(((lh - row) / lh) * o.slant) : 0;
    g.drawImage(t, 0, row, tw + 2, 1, dx + shift, y + row * scale, (tw + 2) * scale, scale);
  }
}
const hero = (r, o) => String(o.name || 'Hero');

function charter(mk, r, o) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height, tide = 66, big = { font: 'large', scale: 2, align: 'center' };
  paper(g, 0, 0, w, h);
  const clean = mk();
  clean.getContext('2d').drawImage(base, 2, 2, w - 4, 32, 2, 2, w - 4, 32);   // the bare page behind the word, to cover OPEN until CLOSE runs
  line(mk, g, r, 'OPEN', w / 2, 2, big);
  line(mk, g, r, 'THE RIVER GATES IN FLOOD', w / 2, 36, { align: 'center' });
  g.fillStyle = '#5a4630';
  for (let row = 0; row < 2; row++) for (let x = 24 + row * 7; x < w - 26; x += 11 + ((x * 7) % 5)) g.fillRect(x, 50 + row * 6, 6 + ((x * 3) % 4), 1);
  const img = g.getImageData(0, 0, w, h);
  for (let x = 0; x < w; x++) {
    const top = tide + Math.round(Math.sin(x / 11) * 1.5 + Math.sin(x / 4) * 0.7);
    for (let y = top; y < h; y++) {
      const [R, G, B] = hex(y === top ? FOAM : ramp(FLOOD, 3.4 - ((y - top) / (h - top)) * 3 + noise(x / 16, y / 3) * 0.9, x, y));
      const i = (y * w + x) * 4;
      img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B;
    }
  }
  g.putImageData(img, 0, 0);
  frame(g, w, h);
  const drip = mk(), c = drip.getContext('2d');
  line(mk, c, r, 'CLOSE', w / 2, 2, { ...big, color: RED });
  if (!o.run) { g.drawImage(clean, 0, 0); g.drawImage(drip, 0, 0); return { base }; }
  c.fillStyle = RED;
  for (let x = 66; x < 142; x += 5 + ((x * 3) % 5)) c.fillRect(x, 24, 1 + (x % 2), 6 + ((x * 5) % 34));
  return { base, over: clean, drip, how: 'run', frames: 90 };
}

function keep(mk, r, o) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height;
  paper(g, 0, 0, w, h, WASH);
  line(mk, g, r, hero(r, o), w / 2, 12, { font: 'large', scale: 2, fit: w - 24, align: 'center' });
  line(mk, g, r, 'Keep this one.', w / 2, 62, { font: 'large', align: 'center', color: HAND, slant: 5 });
  frame(g, w, h);
  return { base };
}

function feather(g, x, y) {
  for (let i = 0; i < 60; i++) {
    const half = Math.round(Math.pow(Math.sin(((i + 2) / 66) * Math.PI), 0.7) * 7), cy = y - Math.round(i * 0.3);
    g.fillStyle = i % 6 === 3 ? '#39457a' : INK;
    g.fillRect(x + i, cy - half, 1, half * 2 + 1);
  }
  g.fillStyle = '#6b78b0';
  for (let i = -12; i < 60; i++) g.fillRect(x + i, y - Math.round(i * 0.3), 1, 1);
}

function witness(mk, r, o) {
  const base = mk(), g = base.getContext('2d'), w = base.width, h = base.height, m = 12;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { g.fillStyle = ramp(WOOD, 1.3 + noise(x / 30, y / 3) * 1.9, x, y); g.fillRect(x, y, 1, 1); }
  paper(g, m, 4, w - m, h - 4);
  const row = (i) => 6 + i * 29;
  g.fillStyle = '#7a5f3e';
  for (const i of [0, 1]) for (let x = m + 10; x < 128; x += 3) g.fillRect(x, row(i) + 26, 2, 1);
  const name = (str, i, c) => line(mk, c, r, str, m + 12, row(i), { font: 'large', scale: 2, fit: 110, slant: 2 });
  name(hero(r, o), 0, g);
  frame(g, w, h);
  if (o.stage === 'sign') {
    const over = mk();
    name('Lyra', 1, over.getContext('2d'));
    return { base, over, how: 'wipe', frames: 70 };
  }
  name('Lyra', 1, g);
  name('V.', 2, g);
  feather(g, 124, 84);
  frame(g, w, h);
  return { base };
}

export const EP4_PAGES = { charter, keep, witness };
