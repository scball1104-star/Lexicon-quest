// E7-tiles: the Episode 7 close-up pages (src/data/ep7/pages.js, EPISODE7_PLAN 9.4). register() puts exactly the seven
// kinds story.js opens on PAGE_KINDS without replacing another pack's; every mode story.js asks for is known and builds a
// 208 x 96 page; every mode exposes its fade-in (PAGE_FADE, fadeFrames, textAlpha) with its new words in `base` and the beat
// before in `over`, so the words reach full alpha only over the scene's box (CRITIQUE_8 item 5); `signed` is at full before
// whole_page reads it (it waits 56 frames); the carving whitens half its letters; the tally keeps a white patch; the Seventh
// List's page line and the page's signature are the brightest things on them; the warm hand is Episode 6's. Drawn on a small
// software canvas with a block font, so no browser is needed; tools/art/tiles/ep7_pages_shots.py renders the real thing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_KINDS, INSERT } from '../../src/world/closeup.js';
import { WARM_HAND as WARM6 } from '../../src/data/ep6/pages.js';
import { EP7_PAGES, PAGE_MODES, PAGE_FADE, fadeFrames, textAlpha, WARM_HAND, MARTEN_HAND, register, SIGNATURE_AT,
  SEVENTH_PAGE_Y, TALLY_PATCH, TALLY_ROWS, TALLY_PER_ROW, CARVE_AT, WHITENED, CARVED, VALLEY_NAME } from '../../src/data/ep7/pages.js';

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

const winLuma = (c, x, y) => (luma(c.data, (y * INSERT.w + x) * 4) + luma(c.data, (y * INSERT.w + x + 1) * 4) + luma(c.data, ((y + 1) * INSERT.w + x) * 4) + luma(c.data, ((y + 1) * INSERT.w + x + 1) * 4)) / 4;
function brightest(c, skip = () => false) {
  let best = -1, at = null;
  for (let y = 2; y < INSERT.h - 3; y++) for (let x = 2; x < INSERT.w - 3; x++) { if (skip(x, y)) continue; const v = winLuma(c, x, y); if (v > best) { best = v; at = [x, y]; } }
  return { best, at };
}
const KINDS = ['ep7_chart', 'ep7_carving', 'ep7_tally', 'ep7_tag', 'ep7_seventh', 'ep7_page', 'ep7_letter'];

test('register puts the seven kinds on PAGE_KINDS, idempotent, never replacing another pack', () => {
  const other = () => ({ base: mk() });
  PAGE_KINDS.ep6_page = PAGE_KINDS.ep6_page || other;
  const before = PAGE_KINDS.ep6_page;
  assert.deepEqual(register(), KINDS);
  register();
  for (const k of KINDS) assert.equal(PAGE_KINDS[k], EP7_PAGES[k], k);
  assert.equal(PAGE_KINDS.ep6_page, before);
});

test('every kind and mode story.js opens is registered and builds a full insert page', () => {
  const story = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src/data/ep7/story.js'), 'utf8');
  const asked = [...story.matchAll(/page\(s, '(ep7_\w+)'(?:, '(\w+)')?\)/g)].map((m) => [m[1], m[2]]);
  assert.ok(asked.length >= 11, `story.js opens ${asked.length} pages`);
  for (const [k, mode] of asked) assert.ok(PAGE_MODES[k] && PAGE_MODES[k].includes(mode), `${k} ${mode} is a known mode`);
  for (const k of KINDS) assert.ok(asked.some(([kk]) => kk === k), `${k} is opened by story.js`);
  for (const [k, modes] of Object.entries(PAGE_MODES)) for (const mode of modes) {
    const P = EP7_PAGES[k](mk, R, { name: 'Arden', mode });
    assert.ok(P.base instanceof Canvas, `${k} ${mode}`);
    let opaque = 0;
    for (let i = 3; i < P.base.data.length; i += 4) if (P.base.data[i] === 255) opaque++;
    assert.equal(opaque, INSERT.w * INSERT.h, `${k} ${mode}: the page covers the insert`);
  }
});

test('every mode exposes its fade-in: words in base, the beat before in over, full alpha only after PAGE_FADE frames', () => {
  for (const [k, modes] of Object.entries(PAGE_MODES)) for (const mode of modes) {
    const P = EP7_PAGES[k](mk, R, { name: 'Arden', mode });
    const n = fadeFrames(k, mode);
    assert.ok(n > 0, `${k} ${mode} has a fade-in`);
    assert.equal(P.frames, n, `${k} ${mode}: the page runs over its PAGE_FADE frames`);
    assert.ok(P.over && ['run', 'wipe'].includes(P.how), `${k} ${mode} animates from the beat before`);
    assert.equal(textAlpha(k, mode, 0), 0);
    assert.ok(textAlpha(k, mode, n / 2) > 0.4 && textAlpha(k, mode, n / 2) < 0.6);
    assert.equal(textAlpha(k, mode, n), 1);
    let diff = 0;
    for (let i = 0; i < P.base.data.length; i += 4) if (P.base.data[i] !== P.over.data[i] || P.base.data[i + 1] !== P.over.data[i + 1]) diff++;
    assert.ok(diff > 20, `${k} ${mode}: ${diff} pixels arrive`);
  }
  assert.deepEqual(Object.keys(PAGE_FADE).sort(), KINDS.slice().sort());
  // whole_page holds 56 frames after asking for `signed` before Mira reads it: the signature is at full by then
  assert.ok(fadeFrames('ep7_page', 'signed') <= 56);
  assert.ok(fadeFrames('ep7_chart', 'fading') <= 44 + 12, 'the valley lifts off inside the morning scene wait');
});

test('the page in four beats: half frosted, joined runs on, the mark, the signature brightest on signed', () => {
  const pages = ['half', 'joined', 'mark', 'signed'].map((mode) => EP7_PAGES.ep7_page(mk, R, { name: 'Arden', mode }));
  const done = pages.map((P) => finished(P));
  const warm = (c, y0, y1) => countColour(c, WARM_HAND.color, y0, y1, 10, 200);
  assert.equal(warm(done[0], 0, 96), 0, 'half: nothing readable');
  assert.ok(warm(done[1], 44, 70) > 150, 'joined: the torn line runs on in the warm hand');
  assert.equal(countColour(done[1], MARTEN_HAND.color, 66, 90, 10, 140), 0, 'joined: no mark yet');
  assert.ok(countColour(done[2], MARTEN_HAND.color, 66, 90, 10, 140) > 40, 'mark: the carrier mark and the date');
  const { best, at } = brightest(done[3]);
  assert.ok(Math.abs(at[0] - SIGNATURE_AT.x) < 40 && at[1] >= SIGNATURE_AT.y - 4 && at[1] < SIGNATURE_AT.y + 26, `brightest at ${at}`);
  const rest = brightest(done[3], (x, y) => Math.abs(x - SIGNATURE_AT.x) < 44 && y >= SIGNATURE_AT.y - 6 && y < SIGNATURE_AT.y + 28).best;
  assert.ok(best - rest > 0.12, `the signature (${best.toFixed(2)}) over the rest (${rest.toFixed(2)})`);
  assert.deepEqual(WARM_HAND, WARM6);
});

test('the Seventh List: the page line is the brightest thing on it', () => {
  const c = finished(EP7_PAGES.ep7_seventh(mk, R, {}));
  const { best, at } = brightest(c);
  assert.ok(at[1] >= SEVENTH_PAGE_Y - 3 && at[1] < SEVENTH_PAGE_Y + 12, `brightest at ${at}`);
  const rest = brightest(c, (x, y) => y >= SEVENTH_PAGE_Y - 5 && y < SEVENTH_PAGE_Y + 14).best;
  assert.ok(best - rest > 0.1, `${best.toFixed(2)} over ${rest.toFixed(2)}`);
});

test('the carving whitens half its letters one by one; whole cuts every letter deep', () => {
  const P = EP7_PAGES.ep7_carving(mk, R, { mode: 'fading' });
  assert.equal(P.how, 'wipe');
  assert.ok(WHITENED.length >= 4 && WHITENED.every((i) => CARVED[i] !== ' '), 'whitened letters');
  const fresh = countColour(P.base, '#1d3775', CARVE_AT.y - 2, CARVE_AT.y + 22);
  const fadedC = finished(P);
  const faded = countColour(fadedC, '#1d3775', CARVE_AT.y - 2, CARVE_AT.y + 22);
  assert.ok(fresh > 150 && faded < fresh * 0.8, `cut ${fresh}, after the whitening ${faded}`);
  const whole = finished(EP7_PAGES.ep7_carving(mk, R, { mode: 'whole' }));
  assert.ok(countColour(whole, '#0e153b', CARVE_AT.y - 2, CARVE_AT.y + 22) >= fresh * 0.9, 'every letter, deep');
});

test('the tally keeps a white patch where a name was; the chart loses one valley name', () => {
  const c = finished(EP7_PAGES.ep7_tally(mk, R, {}));
  const P = TALLY_PATCH;
  let s = 0;
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) s += luma(c.data, (y * INSERT.w + x) * 4);
  assert.ok(s / (P.w * P.h) > 0.8, 'the patch is white');
  assert.equal(Math.floor((TALLY_ROWS * TALLY_PER_ROW) / 7), 15);
  const chart = EP7_PAGES.ep7_chart(mk, R, { mode: 'fading' });
  assert.equal(chart.how, 'run');
  const at = (cv) => countColour(cv, '#3a2a1c', VALLEY_NAME.y, VALLEY_NAME.y + 10, VALLEY_NAME.x, VALLEY_NAME.x + 66);
  assert.ok(at(chart.over) > 50 && at(chart.base) === 0, 'the valley name is on the beat before and gone at rest');
});
