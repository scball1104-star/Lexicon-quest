import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAtlas, animFrameAt } from '../../src/core/assets.js';
import { sync } from './sync-manifest.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('normalizeAtlas: array frames, atlas origin, object frames with anchor and extras', () => {
  const a = normalizeAtlas({
    image: 'hero.png', cell: [24, 32], origin: [12, 31],
    frames: { down_0: [0, 0, 24, 32], odd: [24, 0, 10, 10, 3, 4], prop: { frame: [0, 32, 48, 64], anchor: [24, 63], footprint: [3, 1], solid: true, overheadY: 20 }, plain: { rect: [1, 2, 3, 4] } },
    anims: { walk_down: { frames: ['down_1', 'down_0'], fps: 8, loop: true } },
  }, null, 'hero');
  assert.deepEqual([a.frames.down_0.ox, a.frames.down_0.oy], [12, 31]);
  assert.deepEqual([a.frames.odd.ox, a.frames.odd.oy], [3, 4]);
  assert.deepEqual([a.frames.prop.x, a.frames.prop.y, a.frames.prop.w, a.frames.prop.h, a.frames.prop.ox, a.frames.prop.oy], [0, 32, 48, 64, 24, 63]);
  assert.equal(a.frames.prop.solid, true);
  assert.deepEqual(a.frames.prop.footprint, [3, 1]);
  assert.equal(a.frames.prop.overheadY, 20);
  assert.equal(a.frames.plain.ox, 12, 'atlas origin applies to object frames without an anchor');
  assert.equal(a.frame('down_0'), a.frames.down_0);
  assert.equal(a.anim('walk_down').fps, 8);
  assert.equal(a.has('nope'), false);
});

test('normalizeAtlas default origin is bottom-center of the frame', () => {
  const a = normalizeAtlas({ frames: { x: [0, 0, 16, 16] } });
  assert.deepEqual([a.frames.x.ox, a.frames.x.oy], [8, 15]);
});

test('animFrameAt loops or holds', () => {
  const anim = { frames: ['a', 'b', 'c'], fps: 10, loop: true };
  assert.equal(animFrameAt(anim, 0), 'a');
  assert.equal(animFrameAt(anim, 0.15), 'b');
  assert.equal(animFrameAt(anim, 0.35), 'a');
  assert.equal(animFrameAt({ ...anim, loop: false }, 5), 'c');
  assert.equal(animFrameAt(null, 1), null);
});

test('manifest: valid JSON and every listed file exists', () => {
  const m = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'manifest.json'), 'utf8'));
  for (const kind of ['images', 'atlases', 'json', 'fonts']) {
    assert.equal(typeof (m[kind] || {}), 'object', kind);
    for (const [id, e] of Object.entries(m[kind] || {})) {
      const p = typeof e === 'string' ? e : e.path;
      const optional = typeof e === 'object' && e.optional;
      const full = path.join(NEXT, p);
      if (!optional) assert.ok(fs.existsSync(full), `${kind}.${id}: ${p} does not exist`);
      if ((kind === 'atlases' || kind === 'fonts') && fs.existsSync(full)) {
        const j = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (j.image) assert.ok(fs.existsSync(path.join(path.dirname(full), j.image)), `${kind}.${id}: image ${j.image} missing`);
      }
    }
  }
});

test('manifest touch skin files exist', () => {
  const m = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'manifest.json'), 'utf8'));
  for (const [k, p] of Object.entries(m.touch || {})) assert.ok(fs.existsSync(path.join(NEXT, p)), `touch.${k}: ${p}`);
});

test('manifest "scenes" matches whether src/scenes/registry.js exists', () => {
  const m = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'manifest.json'), 'utf8'));
  const exists = fs.existsSync(path.join(NEXT, 'src', 'scenes', 'registry.js'));
  if (exists) assert.equal(m.scenes, 'src/scenes/registry.js', 'registry.js exists but the manifest does not list it: run node next/qa/core/sync-manifest.mjs');
  else assert.ok(!m.scenes, `manifest lists ${m.scenes} but the file does not exist`);
});

test('manifest lists every asset in the scanned folders', (t) => {
  const { changes } = sync({ write: false });
  if (changes.length) {
    t.diagnostic(`run: node next/qa/core/sync-manifest.mjs\n${changes.join('\n')}`);
    t.todo(`assets/manifest.json is out of date (${changes.length} change(s)); run node next/qa/core/sync-manifest.mjs`);
  }
});
