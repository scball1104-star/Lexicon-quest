// Lighting rules without a browser (W4-world-polish): the dithered radial falloff is banded, its band edges
// are the only place the Bayer threshold matters, the dark-room ambient is cool, and the night tint is
// deeper and less saturated than dusk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandBrightness, ambientFor, BANDS, TINTS, LIGHT_TINTS, NIGHT_TINTS, tintSpec } from '../../src/world/lighting.js';

test('falloff: 4 bands, brightest at the centre, zero beyond the edge, never increasing outward', () => {
  assert.equal(BANDS.length, 4);
  assert.equal(bandBrightness(0, 0, 0), 1);
  assert.equal(bandBrightness(1.2, 3, 3), 0);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    let prev = 1;
    for (let d = 0; d <= 1.2; d += 0.01) { const b = bandBrightness(d, x, y); assert.ok(b <= prev + 1e-9, `d=${d} x=${x} y=${y}`); prev = b; }
  }
});

test('falloff: inside a band every pixel agrees; at a band edge the Bayer pattern splits them (a dithered ring)', () => {
  const inside = new Set();
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) inside.add(bandBrightness(0.45, x, y));
  assert.equal(inside.size, 1, 'mid-band: one value');
  const edge = new Set();
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) edge.add(bandBrightness(0.56, x, y));
  assert.equal(edge.size, 2, 'band edge: two values mixed by the threshold');
});

test('ambient: dimmer with dark, cool (blue above red above green), never above white', () => {
  const a = ambientFor(0.7), b = ambientFor(0.15);
  assert.ok(a[2] > a[0] && a[0] > a[1]);
  assert.ok(b[0] > a[0] && b[1] > a[1] && b[2] > a[2]);
  for (const c of ambientFor(0)) assert.ok(c <= 255);
  assert.deepEqual(ambientFor(1), [0, 0, 0]);
});

test('light kinds: fire is warm, the party cool, the Lantern green', () => {
  assert.ok(LIGHT_TINTS.warm[0] > LIGHT_TINTS.warm[2]);
  assert.ok(LIGHT_TINTS.cool[2] > LIGHT_TINTS.cool[0]);
  assert.ok(LIGHT_TINTS.lantern[1] > LIGHT_TINTS.lantern[0] && LIGHT_TINTS.lantern[1] > LIGHT_TINTS.lantern[2]);
});

test('tints: night is darker and less saturated than dusk; day and none are no tint', () => {
  assert.equal(tintSpec('day'), null);
  assert.equal(tintSpec('none'), null);
  assert.ok(TINTS.night.alpha > TINTS.dusk.alpha);
  assert.ok(TINTS.night.desat > TINTS.dusk.desat);
  assert.ok(NIGHT_TINTS.has('night') && NIGHT_TINTS.has('dusk') && !NIGHT_TINTS.has('dawn'));
  assert.deepEqual(tintSpec('#102030'), { color: '#102030', alpha: 0.4 });
});
