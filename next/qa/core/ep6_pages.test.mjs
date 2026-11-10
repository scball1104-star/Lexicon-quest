// E6-tiles: the Episode 6 close-up pages (src/data/ep6/pages.js, EPISODE6_PLAN 9.4). register() puts exactly the four
// kinds story.js opens on PAGE_KINDS without replacing another pack's; every mode builds a 208 x 96 page; the restored
// manifest writes the twelfth line in (wipe) and the struck one has no name on it; the letter's signature is a clean
// blank; on the first page the hero's name is the brightest thing, it writes itself in, then the seal and then the torn
// line each fade in over the beat before, "Keep this one." only on the last, and the tear is ragged (not a straight crop).
// Drawn on a small software canvas (fillRect, image data, drawImage with alpha) with a block font, so no browser is needed;
// tools/art/tiles/ep6_pages_shots.py renders the real thing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_KINDS, INSERT } from '../../src/world/closeup.js';
import { EP6_PAGES, PAGE_MODES, PAGE_STAGES, NAME_BOX, SIGNATURE_BLANK, TWELFTH, TEAR_Y, tearAt, WARM_HAND, register } from '../../src/data/ep6/pages.js';

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
  drawImage(src, ...a) {
    const [sx, sy, sw, sh, dx, dy, dw, dh] = a.length === 2 ? [0, 0, src.width, src.height, a[0], a[1], src.width, src.height]
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
/** The page as it rests once its animation is done: a wipe writes `over` in; a run (a cross-fade) leaves the base. */
function finished(P) {
  const c = mk();
  c.getContext().drawImage(P.base, 0, 0);
  if (P.over && P.how !== 'run') c.getContext().drawImage(P.over, 0, 0);
  return c;
}
const countColour = (c, hexc, y0 = 0, y1 = INSERT.h, x0 = 0, x1 = INSERT.w) => {
  const [r, g, b] = rgb(hexc);
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * INSERT.w + x) * 4; if (c.data[i] === r && c.data[i + 1] === g && c.data[i + 2] === b) n++; }
  return n;
};

test('register puts the four kinds on PAGE_KINDS, idempotent, never replacing another pack', () => {
  const other = () => ({ base: mk() });
  PAGE_KINDS.ep5_page = PAGE_KINDS.ep5_page || other;
  const before = PAGE_KINDS.ep5_page;
  assert.deepEqual(register(), ['ep6_slip', 'ep6_manifest', 'ep6_letter', 'ep6_page']);
  register();
  for (const k of ['ep6_slip', 'ep6_manifest', 'ep6_letter', 'ep6_page']) assert.equal(PAGE_KINDS[k], EP6_PAGES[k], k);
  assert.equal(PAGE_KINDS.ep5_page, before);
});

test('every kind and mode story.js opens is registered and builds a full insert page', () => {
  const story = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src/data/ep6/story.js'), 'utf8');
  const asked = [...story.matchAll(/page\(s, '(ep6_\w+)'(?:, '(\w+)')?\)/g)].map((m) => [m[1], m[2]]);
  assert.ok(asked.length >= 7, `story.js opens ${asked.length} pages`);
  for (const [k, mode] of asked) assert.ok(PAGE_MODES[k] && PAGE_MODES[k].includes(mode), `${k} ${mode} is a known mode`);
  for (const [k, modes] of Object.entries(PAGE_MODES)) for (const mode of modes) {
    const P = EP6_PAGES[k](mk, R, { name: 'Arden', mode });
    assert.ok(P.base instanceof Canvas, `${k} ${mode}`);
    let opaque = 0;
    for (let i = 3; i < P.base.data.length; i += 4) if (P.base.data[i] === 255) opaque++;
    assert.equal(opaque, INSERT.w * INSERT.h, `${k} ${mode}: the page covers the insert`);
    if (P.over) assert.ok(['wipe', 'run'].includes(P.how) && P.frames > 0, `${k} ${mode} animates`);
  }
});

test('the manifest: no name on the struck twelfth line; restored writes "Pippa Voss" in (a wipe)', () => {
  const { x, y, w, h } = TWELFTH;
  const struck = finished(EP6_PAGES.ep6_manifest(mk, R, { mode: 'struck' }));
  const P = EP6_PAGES.ep6_manifest(mk, R, { mode: 'restored' });
  assert.equal(P.how, 'wipe');
  const restored = finished(P);
  assert.equal(countColour(struck, '#120c1e', y, y + h, x, x + w), 0, 'the struck line holds no name');
  assert.ok(countColour(restored, '#120c1e', y, y + h, x, x + w) > 100, 'the restored line holds her name');
});

test('the letter is in the warm hand, and its signature is a clean blank', () => {
  const c = finished(EP6_PAGES.ep6_letter(mk, R, {}));
  const B = SIGNATURE_BLANK;
  assert.ok(countColour(c, WARM_HAND.color, 0, 52) > 300, 'three lines in the warm hand');
  assert.equal(countColour(c, WARM_HAND.color, B.y, B.y + B.h, B.x, B.x + B.w), 0, 'nothing written in the blank');
  // the blank is the cleanest (brightest) paper on the page: its mean luma above every other band of the same size
  const mean = (x0, y0) => { let s = 0; for (let y = y0; y < y0 + B.h; y++) for (let x = x0; x < x0 + B.w; x++) s += luma(c.data, (y * INSERT.w + x) * 4); return s / (B.w * B.h); };
  const blank = mean(B.x, B.y);
  for (const [x0, y0] of [[10, 58], [20, 66], [120, 76]]) assert.ok(blank > mean(x0, y0), `blank ${blank.toFixed(3)} over ${x0},${y0}`);
});

test("the first page: the hero's name is the brightest thing on `name`, `seal` and `torn`", () => {
  for (const mode of PAGE_STAGES) {
    const c = finished(EP6_PAGES.ep6_page(mk, R, { name: 'Arden', mode })), d = c.data, W = INSERT.w;
    let best = -1, at = null, second = -1;
    const win = (x, y) => (luma(d, (y * W + x) * 4) + luma(d, (y * W + x + 1) * 4) + luma(d, ((y + 1) * W + x) * 4) + luma(d, ((y + 1) * W + x + 1) * 4)) / 4;
    for (let y = 2; y < INSERT.h - 3; y++) for (let x = 2; x < W - 3; x++) { const v = win(x, y); if (v > best) { best = v; at = [x, y]; } }
    assert.ok(at[1] >= NAME_BOX.y && at[1] < NAME_BOX.y + NAME_BOX.h, `${mode}: brightest at ${at}, inside the name's rows`);
    for (let y = NAME_BOX.y + NAME_BOX.h; y < INSERT.h - 3; y++) for (let x = 2; x < W - 3; x++) second = Math.max(second, win(x, y));
    assert.ok(best - second > 0.15, `${mode}: the name (${best.toFixed(2)}) clear of the rest of the page (${second.toFixed(2)})`);
  }
});

test('the first page in three beats: name writes in, seal and torn fade in over the beat before; "Keep this one." only on torn', () => {
  const pages = PAGE_STAGES.map((mode) => EP6_PAGES.ep6_page(mk, R, { name: 'Arden', mode }));
  assert.deepEqual(pages.map((P) => P.how), ['wipe', 'run', 'run']);
  const done = pages.map(finished);
  // the warm hand's lines sit in rows 52 to 80: none on name or seal, both on torn
  const handPx = (c) => countColour(c, WARM_HAND.color, 50, 76, 20, 190);
  assert.equal(handPx(done[0]), 0, 'name: no lines');
  assert.equal(handPx(done[1]), 0, 'seal: no lines');
  assert.ok(handPx(done[2]) > 150, 'torn: "Keep this one." and the torn line');
  // the seal: an open book in the warm hand under the name, from `seal` on
  const sealPx = (c) => countColour(c, WARM_HAND.color, 30, 46, 88, 120);
  assert.equal(sealPx(done[0]), 0);
  assert.ok(sealPx(done[1]) > 30 && sealPx(done[2]) > 30, 'the counter-seal');
  for (const k of [1, 2]) {
    const prev = done[k - 1].data, over = pages[k].over.data;
    let same = 0;
    for (let i = 0; i < prev.length; i += 4) if (prev[i] === over[i] && prev[i + 1] === over[i + 1] && prev[i + 2] === over[i + 2]) same++;
    assert.ok(same / (prev.length / 4) > 0.97, `beat ${k + 1} fades from beat ${k}`);
  }
});

test('the tear is a real tear: a ragged edge through the torn line, the page gone below it', () => {
  const ys = Array.from({ length: INSERT.w }, (_, x) => tearAt(x));
  assert.ok(Math.max(...ys) - Math.min(...ys) >= 4, 'the edge wanders');
  let steps = 0;
  for (let x = 1; x < ys.length; x++) if (ys[x] !== ys[x - 1]) steps++;
  assert.ok(steps > 60, `the edge is jagged (${steps} steps), not a straight crop`);
  assert.ok(Math.abs(ys.reduce((a, b) => a + b, 0) / ys.length - TEAR_Y) < 1.5, 'it runs straight across on average');
  const c = finished(EP6_PAGES.ep6_page(mk, R, { name: 'Arden', mode: 'torn' }));
  let dark = 0, n = 0;
  for (let x = 4; x < INSERT.w - 4; x++) for (let y = tearAt(x) + 2; y < INSERT.h - 2; y++) { n++; if (luma(c.data, (y * INSERT.w + x) * 4) < 0.2) dark++; }
  assert.ok(dark / n > 0.9, 'below the tear: the dark shelf, no paper');
});
