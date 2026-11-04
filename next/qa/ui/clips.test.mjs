// Moving paintings (docs/MEDIA_BUILD.md 5): the asset id -> clip map, the fallback to the still, the re-dither and the
// lazy/cache rules. The browser half (a clip really drawn, a 404 leaving the still) is qa/ui/clips_headless.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLIP_IDS, clipUrl, backdropClip } from '../../src/ui/keyart.js';
import { layer, buildLut, redither, dissolve, oklab, clipState } from '../../src/ui/clips/player.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
// Valley and Fading Road keep their stills: two rounds of Runway clips both pushed in (Scott, 2026-11-03).
const FIVE = ['paint_card_bell_tower', 'paint_card_bells', 'paint_card_hollowmere', 'paint_card_binder_spine',
  'paint_battle_hollow'];

test('clip map: exactly the five approved paintings, each with its still, mirrored by the build tool', () => {
  assert.deepEqual([...CLIP_IDS].sort(), [...FIVE].sort());
  for (const id of FIVE) {
    assert.equal(clipUrl(id), `assets/clips/${id}.webm`);
    assert.ok(fs.existsSync(path.join(NEXT, 'assets', 'backdrops', `${id}.png`)), `${id}: the still (first frame and fallback) exists`);
  }
  for (const id of ['paint_card_stacks_hall', 'paint_battle_valley', 'paint_battle_east_road', 'paint_battle_valley_dusk', 'battle_valley', 'title', 'dialog_keyart', '', null, undefined]) assert.equal(clipUrl(id), null, `${id} has no clip`);
  const py = read('tools/art/backdrops/build_clips.py');
  const m = /CLIP_IDS = \[([^\]]+)\]/.exec(py);
  assert.ok(m, 'build_clips.py names its ids');
  assert.deepEqual([...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort(), [...FIVE].sort(), 'build_clips.py CLIP_IDS = keyart.js CLIP_IDS');
});

test('the four places draw those paintings (and no field code names a clip)', () => {
  assert.match(read('src/data/story/ep1.js'), /card: 'paint_card_bells'/);
  assert.match(read('src/data/story/ep1.js'), /card: 'paint_card_bell_tower'/);
  assert.match(read('src/data/cave/story.js'), /T\.clear_card[^\n]*card: 'paint_card_binder_spine'/);
  assert.match(read('src/scenes/prologue.js'), /card: data\.card \|\| 'paint_card_bell_tower'/, 'the title attract loop shows the bell tower');
  assert.match(read('src/scenes/battle.js'), /backdropClip\(e\.renderer, PAINTED\[bl\.key\]\)/);
  for (const f of ['src/scenes/field.js', 'src/world/maps.js', 'src/world/tilemap.js']) assert.doesNotMatch(read(f), /clips\/player|backdropClip/, `${f} never plays a clip`);
});

test('shipped clips: listed in clips.json, on disk, VP9 WebM, inside the size target', () => {
  const p = path.join(NEXT, 'assets', 'clips', 'clips.json');
  if (!fs.existsSync(p)) return;
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(m.fps, 12);
  for (const [id, e] of Object.entries(m.clips)) {
    assert.ok(FIVE.includes(id), `${id} is one of the seven`);
    const f = path.join(NEXT, 'assets', 'clips', `${id}.webm`);
    const b = fs.readFileSync(f);
    assert.equal(b.readUInt32BE(0), 0x1a45dfa3, `${id}: an EBML (WebM) file`);
    assert.ok(b.includes(Buffer.from('V_VP9')), `${id}: VP9`);
    assert.equal(e.bytes, b.length, `${id}: clips.json is current (python tools/art/backdrops/build_clips.py)`);
    assert.ok(b.length <= 400 * 1024, `${id}: ${b.length} bytes, target 200 to 400 KB`);
  }
});

test('fallback: no VP9 (no document here), reduce motion, an id with no clip, or no still all give null (the still draws)', () => {
  const prep = { W: 384, H: 216, idx: new Uint16Array(384 * 216), colors: [0], rungs: [new Uint16Array([0])] };
  const r = { settings: {}, assets: { has: () => false, url: (p) => p } };
  assert.equal(layer(r, 'paint_card_bells', prep), null, 'cannot play VP9 -> still');
  assert.equal(layer({ ...r, settings: { reduceMotion: true } }, 'paint_card_bells', prep), null, 'reduce motion -> still');
  assert.equal(layer(r, 'paint_card_stacks_hall', prep), null, 'no clip -> still');
  assert.equal(layer(r, 'paint_card_bells', null), null, 'no still prepared -> nothing');
  assert.deepEqual(clipState(), {}, 'nothing started loading');
  assert.equal(backdropClip(r, 'paint_battle_valley'), null, 'the battle hook draws the still while nothing is loaded');
  assert.equal(backdropClip(r, 'battle_valley'), null);
});

test('re-dither: palette pixels come back as themselves; a blurred two-colour dither comes back as the Bayer pattern', () => {
  const colors = [0x14101e, 0x3c3278, 0x4a3f8c, 0xe8d8a0, 0x7a5a30];
  const lut = buildLut(colors);
  const W = 8, H = 8, data = new Uint8ClampedArray(W * H * 4), out = new Uint16Array(W * H);
  for (let i = 0; i < W * H; i++) { const c = colors[i % colors.length]; data.set([c >> 16, (c >> 8) & 255, c & 255, 255], i * 4); }
  redither(lut, data, W, H, out);
  for (let i = 0; i < W * H; i++) assert.equal(out[i], i % colors.length, `pixel ${i}`);
  // the halfway colour of the two close indigos -> about half of each, in the Bayer cells
  const a = colors[1], b = colors[2];
  const mid = [((a >> 16) + (b >> 16)) >> 1, (((a >> 8) & 255) + ((b >> 8) & 255)) >> 1, ((a & 255) + (b & 255)) >> 1];
  for (let i = 0; i < W * H; i++) data.set([...mid, 255], i * 4);
  redither(lut, data, W, H, out);
  const ones = [...out].filter((v) => v === 2).length;
  assert.ok([...out].every((v) => v === 1 || v === 2), 'only the two colours of the pair');
  assert.ok(ones >= 20 && ones <= 44, `about half take the second colour (${ones} of 64)`);
  // the same input gives the same pattern (stable between frames)
  const again = redither(lut, data, W, H, new Uint16Array(W * H));
  assert.deepEqual([...again], [...out]);
  // far apart colours are never dithered (max pair): halfway between ink and cream is one solid colour
  const c0 = colors[0], c3 = colors[3];
  for (let i = 0; i < W * H; i++) data.set([((c0 >> 16) + (c3 >> 16)) >> 1, (((c0 >> 8) & 255) + ((c3 >> 8) & 255)) >> 1, ((c0 & 255) + (c3 & 255)) >> 1, 255], i * 4);
  assert.equal(new Set(redither(lut, data, W, H, out)).size, 1);
  assert.ok(Math.abs(oklab(255, 255, 255)[0] - 1) < 1e-3 && Math.abs(oklab(0, 0, 0)[0]) < 1e-6, 'OKLab white L = 1, black L = 0');
});

test('dissolve: step 0 is the still, the last step is the clip, the steps between grow monotonically', () => {
  const W = 8, H = 8, from = new Uint16Array(W * H).fill(1), to = new Uint16Array(W * H).fill(2), out = new Uint16Array(W * H);
  let prev = -1;
  for (let k = 0; k <= 8; k++) {
    const n = [...dissolve(from, to, W, H, k, 8, out)].filter((v) => v === 2).length;
    if (k === 0) assert.equal(n, 0);
    if (k === 8) assert.equal(n, W * H);
    assert.ok(n > prev); prev = n;
  }
});

test('offline rules: clips and the player are lazy (never precached, runtime-cached), loaded by import() only', () => {
  const py = read('tools/pwa/build_pwa.py');
  const m = /LAZY_PREFIXES = \(([^)]*)\)/.exec(py);
  assert.ok(m && m[1].includes("'assets/clips/'") && m[1].includes("'src/ui/clips/'"), 'build_pwa.py LAZY_PREFIXES lists the clips and the player');
  const sw = read('sw.js');
  const pre = sw.slice(sw.indexOf('const PRECACHE = ['), sw.indexOf('];', sw.indexOf('const PRECACHE = [')));
  assert.doesNotMatch(pre, /assets\/clips\/|src\/ui\/clips\//, 'nothing of the clips is in the precache');
  assert.doesNotMatch(read('index.html'), /src\/ui\/clips\//, 'the player is not modulepreloaded');
  const k = read('src/ui/keyart.js');
  assert.doesNotMatch(k, /^import[^\n]*clips\/player/m, 'keyart.js imports the player lazily');
  assert.match(k, /import\('\.\/clips\/player\.js'\)/);
});
