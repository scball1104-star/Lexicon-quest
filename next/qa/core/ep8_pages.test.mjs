// E8-tiles: the Episode 8 close-up pages (src/data/ep8/pages.js, EPISODE8_PLAN 9.4). register() puts the seven kinds on
// PAGE_KINDS without replacing another pack's; every kind draws each of its modes (and each step of a stepped mode) as a
// full 208 x 96 page; every mode and step exposes its reveal (PAGE_FADE, fadeFrames, reveal) with its new words in `base`
// and the picture before in `over`, so a step's words reach full alpha only on its own box; a stepped run holds its earlier
// steps; the First Keeper's own name is a smudge with no glyph in it; the eighth star is the brightest thing on `star`; the
// card and the tag carry the same stamp (one function); the warm and cold hands are Episode 7's; every kind and mode
// story.js asks for (when E8-story's story.js is there) is known. Drawn on a small software canvas with a block font, so no
// browser is needed; tools/art/tiles/ep8_pages_shots.py renders the real thing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_KINDS, INSERT } from '../../src/world/closeup.js';
import { WARM_HAND as WARM7, COLD_HAND as COLD7 } from '../../src/data/ep7/pages.js';
import { EP8_PAGES, PAGE_MODES, PAGE_STEPS, fadeFrames, reveal, stepsOf, register, WARM_HAND, COLD_HAND, NOTE_LINES,
  CARD_LINES, BIRTH_LINE, BIRTH_LINES, NOBODYS, COULD_NOT, OWN_NAME, STAR_AT, CARD_STAMP, TAG_STAMP, stamp } from '../../src/data/ep8/pages.js';

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
const KINDS = ['ep8_note', 'ep8_card', 'ep8_seal', 'ep8_first_word', 'ep8_could_not', 'ep8_shelf', 'ep8_last_page'];
const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cases = () => {
  const out = [];
  for (const [k, modes] of Object.entries(PAGE_MODES)) for (const mode of modes) for (let s = 1; s <= stepsOf(k, mode); s++) out.push([k, mode, s]);
  return out;
};

test('register puts the seven kinds on PAGE_KINDS, idempotent, never replacing another pack', () => {
  const other = () => ({ base: mk() });
  PAGE_KINDS.ep7_page = PAGE_KINDS.ep7_page || other;
  const before = PAGE_KINDS.ep7_page;
  assert.deepEqual(register(), KINDS);
  register();
  for (const k of KINDS) assert.equal(PAGE_KINDS[k], EP8_PAGES[k], k);
  assert.equal(PAGE_KINDS.ep7_page, before);
});

test('every kind draws each mode and step as a full insert page; twelve modes on five kinds plus two single ones', () => {
  const multi = Object.values(PAGE_MODES).filter((m) => m[0] !== undefined).flat();
  assert.equal(multi.length, 12, 'the twelve modes of plan 9.4');
  for (const [k, mode, step] of cases()) {
    const P = EP8_PAGES[k](mk, R, { name: 'Arden', mode, step });
    assert.ok(P.base instanceof Canvas, `${k} ${mode} ${step}`);
    let opaque = 0;
    for (let i = 3; i < P.base.data.length; i += 4) if (P.base.data[i] === 255) opaque++;
    assert.equal(opaque, INSERT.w * INSERT.h, `${k} ${mode} ${step}: the page covers the insert`);
  }
});

test('every mode and step exposes its reveal: words in base, the picture before in over, full alpha only after its frames', () => {
  for (const [k, mode, step] of cases()) {
    const P = EP8_PAGES[k](mk, R, { name: 'Arden', mode, step });
    const n = fadeFrames(k, mode, step);
    assert.ok(n > 0, `${k} ${mode} ${step}`);
    assert.equal(P.frames, n, `${k} ${mode} ${step}: runs over its PAGE_FADE frames`);
    assert.ok(P.over instanceof Canvas && P.how === 'run', `${k} ${mode} ${step}: a cross-fade from the picture before`);
    let diff = 0;
    for (let i = 0; i < P.base.data.length; i += 4) if (P.base.data[i] !== P.over.data[i] || P.base.data[i + 1] !== P.over.data[i + 1]) diff++;
    assert.ok(diff > 20, `${k} ${mode} ${step}: the step changes the page (${diff} px)`);
    assert.equal(reveal(k, mode, 0, step), 0);
    assert.ok(reveal(k, mode, n - 1, step) < 1, 'not full before its box');
    assert.equal(reveal(k, mode, n, step), 1);
  }
  assert.deepEqual(PAGE_STEPS, { ep8_could_not: { run: 2 }, ep8_shelf: { run: 3 } });
  assert.equal(stepsOf('ep8_card', 'card'), 1);
});

test('a stepped run holds its earlier steps: step k+1 starts from step k finished', () => {
  for (const [k, n] of [['ep8_could_not', 2], ['ep8_shelf', 3]]) {
    for (let s = 1; s < n; s++) {
      const A = finished(EP8_PAGES[k](mk, R, { mode: 'run', step: s }));
      const B = EP8_PAGES[k](mk, R, { mode: 'run', step: s + 1 }).over;
      assert.deepEqual(Array.from(A.data), Array.from(B.data), `${k} step ${s + 1} begins where ${s} ends`);
    }
  }
});

test('the First Keeper own name is a smudge the camera never resolves (no glyph colour in it)', () => {
  const P = finished(EP8_PAGES.ep8_shelf(mk, R, { mode: 'run', step: 3 }));
  const { x, y, w, h } = OWN_NAME;
  for (const c of [COLD_HAND.color, WARM_HAND.color, '#3a2a1c', '#14101e']) assert.equal(countColour(P, c, y, y + h, x, x + w), 0, c);
  const before = EP8_PAGES.ep8_shelf(mk, R, { mode: 'run', step: 3 }).over;
  assert.ok(countColour(before, COLD_HAND.color, y - 4, y + h, x, x + w) > 0, "nobody's doing was there before it lifted off");
});

test('the eighth star and its sign are the brightest thing on star', () => {
  const P = finished(EP8_PAGES.ep8_shelf(mk, R, { mode: 'star' }));
  const { at } = brightest(P);
  assert.ok(Math.abs(at[0] - STAR_AT.x) <= 10 && at[1] >= STAR_AT.y - 6 && at[1] <= STAR_AT.y + 18, `brightest at ${at}`);
});

test('the card and the tag carry the same stamp (one function); the hands are Episode 7 hands', () => {
  const a = mk(), b = mk();
  stamp(a.getContext(), 40, 40, '#7a3040');
  stamp(b.getContext(), 40, 40, '#7a3040');
  assert.deepEqual(Array.from(a.data), Array.from(b.data));
  const card = finished(EP8_PAGES.ep8_card(mk, R, { mode: 'card' }));
  const tag = finished(EP8_PAGES.ep8_seal(mk, R, { mode: 'tag' }));
  assert.ok(countColour(card, '#7a3040', CARD_STAMP.y - 12, CARD_STAMP.y + 12, CARD_STAMP.x - 14, CARD_STAMP.x + 14) > 20, 'the card stamp');
  assert.ok(countColour(tag, '#7a3040', TAG_STAMP.y - 24, TAG_STAMP.y + 24, TAG_STAMP.x - 28, TAG_STAMP.x + 28) > 40, 'the tag stamp');
  const empty = mk();
  stamp(empty.getContext(), 40, 40, '#7a3040', false);
  assert.ok(countColour(empty, '#7a3040') < countColour(a, '#7a3040'), 'the empty seal: the key taken out');
  assert.equal(WARM_HAND, WARM7);
  assert.equal(COLD_HAND, COLD7);
});

test('the words are the plan and bible words, ASCII, no em dash', () => {
  assert.deepEqual(NOTE_LINES, ['Gone up first.', 'Somebody has to knock.', '- V']);
  assert.equal(CARD_LINES.join(' '), 'Welcome, readers. Please return what you borrow.');
  assert.equal(BIRTH_LINES.join(' '), BIRTH_LINE);
  assert.equal(NOBODYS, "nobody's doing");
  assert.equal(COULD_NOT, 'I could not.');
  const src = fs.readFileSync(path.join(NEXT, 'src/data/ep8/pages.js'), 'utf8');
  assert.ok(!src.includes(String.fromCharCode(0x2014)), 'no em dash');
  assert.ok(/^[\x09\x0a\x20-\x7e]*$/.test(src), 'ASCII only');
});

test('every kind and mode story.js opens is known (when E8-story story.js is there)', () => {
  const p = path.join(NEXT, 'src/data/ep8/story.js');
  if (!fs.existsSync(p)) return;
  const story = fs.readFileSync(p, 'utf8');
  const asked = [...story.matchAll(/closeup\(\s*'(ep8_\w+)'(?:\s*,\s*\{[^}]*mode:\s*'(\w+)')?/g)].map((m) => [m[1], m[2]]);
  for (const [k, mode] of asked) assert.ok(PAGE_MODES[k] && PAGE_MODES[k].includes(mode), `${k} ${mode} is a known mode`);
});
