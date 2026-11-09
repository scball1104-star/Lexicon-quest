// E5-tiles: the Episode 5 close-up pages (src/data/ep5/pages.js, EPISODE5_PLAN 9.4). register() puts exactly the kinds
// story.js opens on PAGE_KINDS without replacing another pack's; every mode builds a 208 x 96 page; the prophecy and the
// restored chart write themselves in (over + wipe); the blank letter has lost its top name; and in the restored chart the
// hero's star is the brightest thing on the page. Drawn on a small software canvas (fillRect, image data, drawImage with
// alpha) with a block font, so no browser is needed; tools/art/tiles/ep5_pages_shots.py renders the real thing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_KINDS, INSERT } from '../../src/world/closeup.js';
import { EP5_PAGES, HERO_STAR, RESTORED_STAGES, register } from '../../src/data/ep5/pages.js';

const rgb = (c) => { const n = parseInt(String(c).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

class Ctx {
  constructor(cv) { this.cv = cv; this.fillStyle = '#000000'; this.globalAlpha = 1; this.imageSmoothingEnabled = false; }
  blend(x, y, r, g, b, a) {
    const { width: w, height: h, data } = this.cv;
    if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
    const i = (y * w + x) * 4, da = data[i + 3] / 255, oa = a + da * (1 - a);
    if (oa <= 0) return;
    data[i] = Math.round((r * a + data[i] * da * (1 - a)) / oa);
    data[i + 1] = Math.round((g * a + data[i + 1] * da * (1 - a)) / oa);
    data[i + 2] = Math.round((b * a + data[i + 2] * da * (1 - a)) / oa);
    data[i + 3] = Math.round(oa * 255);
  }
  fillRect(x, y, w, h) {
    const [r, g, b] = rgb(this.fillStyle);
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.blend(xx, yy, r, g, b, this.globalAlpha);
  }
  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  putImageData(img, x, y) {
    const { width: W, data } = this.cv;
    for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
      const X = x + xx, Y = y + yy;
      if (X < 0 || Y < 0 || X >= W || Y >= this.cv.height) continue;
      const s = (yy * img.width + xx) * 4, d = (Y * W + X) * 4;
      for (let k = 0; k < 4; k++) data[d + k] = img.data[s + k];
    }
  }
  getImageData(x, y, w, h) {
    const img = this.createImageData(w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const s = ((y + yy) * this.cv.width + x + xx) * 4, d = (yy * w + xx) * 4;
      for (let k = 0; k < 4; k++) img.data[d + k] = this.cv.data[s + k];
    }
    return img;
  }
  drawImage(src, ...a) {
    let [sx, sy, sw, sh, dx, dy, dw, dh] = a.length === 2 ? [0, 0, src.width, src.height, a[0], a[1], src.width, src.height]
      : a.length === 4 ? [0, 0, src.width, src.height, a[0], a[1], a[2], a[3]] : a;
    for (let yy = 0; yy < dh; yy++) for (let xx = 0; xx < dw; xx++) {
      const X = Math.floor(sx + (xx * sw) / dw), Y = Math.floor(sy + (yy * sh) / dh);
      if (X < 0 || Y < 0 || X >= src.width || Y >= src.height) continue;
      const i = (Y * src.width + X) * 4;
      this.blend(Math.round(dx + xx), Math.round(dy + yy), src.data[i], src.data[i + 1], src.data[i + 2], (src.data[i + 3] / 255) * this.globalAlpha);
    }
  }
}
class Canvas {
  constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); this.ctx = new Ctx(this); }
  getContext() { return this.ctx; }
}
const mk = () => new Canvas(INSERT.w, INSERT.h);
// a block font: every non-space character is a 4 x 7 block in the asked colour, advance 5
const R = {
  measure: (s) => String(s).length * 5,
  font: () => ({ draw(c, s, x, y, o) { c.fillStyle = o.color; for (let i = 0; i < s.length; i++) if (s[i] !== ' ') c.fillRect(x + i * 5, y + 2, 4, 7); } }),
};
const luma = (d, i) => (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
/** The page as it rests once its animation is done: a wipe writes `over` in; a run (or a cross-fade) leaves the base. */
function finished(P) {
  const c = mk();
  c.getContext().drawImage(P.base, 0, 0);
  if (P.over && P.how !== 'run') c.getContext().drawImage(P.over, 0, 0);
  return c;
}

test('register puts the three kinds on PAGE_KINDS, idempotent, never replacing another pack', () => {
  const other = () => ({ base: mk() });
  PAGE_KINDS.charter = PAGE_KINDS.charter || other;
  const before = PAGE_KINDS.charter;
  assert.deepEqual(register(), ['ep5_letter', 'ep5_chart', 'ep5_page']);
  register();
  for (const k of ['ep5_letter', 'ep5_chart', 'ep5_page']) assert.equal(PAGE_KINDS[k], EP5_PAGES[k], k);
  assert.equal(PAGE_KINDS.charter, before);
});

test('every mode the story opens builds a full insert page', () => {
  const cases = [['ep5_letter', 'full'], ['ep5_letter', 'blank'], ['ep5_chart', 'prophecy'], ['ep5_chart', 'restored'],
    ...RESTORED_STAGES.map((m) => ['ep5_chart', m]), ['ep5_chart', 'road'], ['ep5_page', undefined]];
  for (const [k, mode] of cases) {
    const P = EP5_PAGES[k](mk, R, { name: 'Arden', mode });
    assert.ok(P.base instanceof Canvas, `${k} ${mode}`);
    const d = P.base.data;
    let opaque = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] === 255) opaque++;
    assert.equal(opaque, INSERT.w * INSERT.h, `${k} ${mode}: the page covers the insert`);
    if (mode === 'prophecy' || mode === 'restored') assert.equal(P.how, 'wipe', mode);
  }
});

test('the blank letter has lost its top name; the others stay', () => {
  const count = (P, y0, y1) => {
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = 100; x < 206; x++) { const i = (y * INSERT.w + x) * 4; if (P.base.data[i] === 0xdf && P.base.data[i + 1] === 0xf4) n++; }
    return n;
  };
  const full = EP5_PAGES.ep5_letter(mk, R, { name: 'Arden', mode: 'full' });
  const blank = EP5_PAGES.ep5_letter(mk, R, { name: 'Arden', mode: 'blank' });
  assert.ok(count(full, 0, 30) > 100, 'the full letter shows the top name');
  assert.equal(count(blank, 0, 30), 0, 'the blank letter shows no top name');
  assert.ok(count(blank, 34, 94) > 150 && count(blank, 34, 94) === count(full, 34, 94), 'Mira and Bram stay');
});

for (const mode of ['restored', 'restored_3']) test(`the restored chart (${mode}): the hero's star is the brightest thing on the page`, () => {
  const P = EP5_PAGES.ep5_chart(mk, R, { name: 'Arden', mode });
  const c = finished(P), d = c.data, W = INSERT.w;
  let best = -1, at = null;
  for (let y = 3; y < INSERT.h - 4; y++) for (let x = 3; x < W - 4; x++) {
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += luma(d, ((y + dy) * W + x + dx) * 4);
    if (s > best) { best = s; at = [x, y]; }
  }
  assert.ok(Math.abs(at[0] - HERO_STAR.x) <= 1 && Math.abs(at[1] - HERO_STAR.y) <= 1, `brightest 3x3 at ${at}, the star at ${HERO_STAR.x},${HERO_STAR.y}`);
  // and nothing else comes close: the next brightest window more than 3 px away is clearly dimmer
  let second = -1;
  for (let y = 3; y < INSERT.h - 4; y++) for (let x = 3; x < W - 4; x++) {
    if (Math.abs(x - at[0]) <= 3 && Math.abs(y - at[1]) <= 3) continue;
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += luma(d, ((y + dy) * W + x + dx) * 4);
    second = Math.max(second, s);
  }
  assert.ok(best - second > 0.8, `the star (${best.toFixed(2)}) stands clear of the next brightest (${second.toFixed(2)})`);
});

test("the restored chart in three beats: the stars, then the hero's star, then the seal (E5-fixes B7)", () => {
  const pages = RESTORED_STAGES.map((mode) => EP5_PAGES.ep5_chart(mk, R, { name: 'Arden', mode }));
  assert.deepEqual(pages.map((P) => P.how), ['wipe', 'run', 'run'], 'beat 1 writes the stars in; beats 2 and 3 fade in over the beat before');
  // the seal's line "Keep this one." is set in #e9d9a8 by the block font: count those pixels on each finished beat
  const sealPx = (c) => { let n = 0; for (let i = 0; i < c.data.length; i += 4) if (c.data[i] === 0xe9 && c.data[i + 1] === 0xd9 && c.data[i + 2] === 0xa8) n++; return n; };
  const starAt = (c) => { const i = (HERO_STAR.y * INSERT.w + HERO_STAR.x) * 4; return luma(c.data, i); };
  const done = pages.map(finished);
  assert.equal(sealPx(done[0]), 0, 'beat 1: no seal'); assert.equal(sealPx(done[1]), 0, 'beat 2: no seal');
  assert.ok(sealPx(done[2]) > 50, 'beat 3: the seal and its line');
  assert.ok(starAt(done[0]) < 0.5, 'beat 1: the space is still empty');
  assert.ok(starAt(done[1]) > 0.95 && starAt(done[2]) > 0.95, "beats 2 and 3: the hero's star burns in the space");
  // each beat starts from the one before: beat 2's fading layer is beat 1's end state, beat 3's is beat 2's
  for (const k of [1, 2]) {
    const prev = done[k - 1].data, over = pages[k].over.data;
    let same = 0;
    for (let i = 0; i < prev.length; i += 4) if (prev[i] === over[i] && prev[i + 1] === over[i + 1] && prev[i + 2] === over[i + 2]) same++;
    assert.ok(same / (prev.length / 4) > 0.97, `beat ${k + 1} fades from beat ${k} (${(100 * same / (prev.length / 4)).toFixed(1)}% the same)`);
  }
  // and the last beat rests on the whole restored page
  const whole = finished(EP5_PAGES.ep5_chart(mk, R, { name: 'Arden', mode: 'restored' })).data, last = done[2].data;
  let diff = 0;
  for (let i = 0; i < last.length; i += 4) if (Math.abs(last[i] - whole[i]) + Math.abs(last[i + 1] - whole[i + 1]) + Math.abs(last[i + 2] - whole[i + 2]) > 24) diff++;
  assert.ok(diff / (last.length / 4) < 0.05, `beat 3 ends as the restored page (${(100 * diff / (last.length / 4)).toFixed(1)}% differ)`);
});
