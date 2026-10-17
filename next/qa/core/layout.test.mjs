import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, parseColor, mixColor, BAYER4 } from '../../src/core/renderer.js';

const L = (o) => computeLayout({ gameW: 384, gameH: 216, ...o });

test('1920x1080 desktop: exact 5x, no bars', () => {
  const v = L({ devW: 1920, devH: 1080, dpr: 1 });
  assert.equal(v.scale, 5); assert.equal(v.integer, true);
  assert.deepEqual([v.x, v.y, v.w, v.h], [0, 0, 1920, 1080]);
});

test('1440x900 and 1366x768: integer 3x, centered', () => {
  let v = L({ devW: 1440, devH: 900, dpr: 1 });
  assert.equal(v.scale, 3);
  assert.deepEqual([v.x, v.y, v.w, v.h], [144, 126, 1152, 648]);
  v = L({ devW: 1366, devH: 768, dpr: 1 });
  assert.equal(v.scale, 3);
  assert.equal(v.x, 107); assert.equal(v.y, 60);
});

test('scale is computed in device pixels (crisp on high-DPI)', () => {
  // 1536x864 CSS at dpr 1.25 = 1920x1080 device: 5 device px per game px.
  const v = L({ devW: 1920, devH: 1080, dpr: 1.25 });
  assert.equal(v.scale, 5);
  assert.equal(v.cssScale, 4);
});

test('below 2x falls back to exact fit; fit and sharp modes are non-integer', () => {
  const v = L({ devW: 600, devH: 400, dpr: 1 });
  assert.ok(v.scale < 2 && !v.integer);
  assert.equal(v.w, 600);
  const s = L({ devW: 1440, devH: 900, dpr: 1, mode: 'sharp' });
  assert.equal(s.scale, 1440 / 384);
  const f = L({ devW: 1440, devH: 900, dpr: 1, mode: 'fit' });
  assert.equal(f.w, 1440);
});

test('phone landscape 844x390 @3 with touch: 5x and controls in the side bars', () => {
  const v = L({ devW: 2532, devH: 1170, dpr: 3, touch: { minBar: 84 } });
  assert.equal(v.scale, 5);
  assert.equal(v.touchMode, 'bars');
  assert.equal(v.bars.left, 102);
  assert.equal(v.cssH, 360);
});

test('tablet landscape drops one integer step to make room for controls', () => {
  // 1180x820 CSS @2: max 6x leaves 14 px bars; 5x leaves 110 px.
  const v = L({ devW: 2360, devH: 1640, dpr: 2, touch: { minBar: 84 } });
  assert.equal(v.scale, 5);
  assert.equal(v.touchMode, 'bars');
});

test('small phone without room: overlay controls at the max integer scale', () => {
  const v = L({ devW: 1334, devH: 750, dpr: 2, touch: { minBar: 84 } });
  assert.equal(v.scale, 3);
  assert.equal(v.touchMode, 'overlay');
});

test('portrait touch: game near the top, controls below', () => {
  const v = L({ devW: 1170, devH: 2532, dpr: 3, touch: { minBar: 84 } });
  assert.equal(v.touchMode, 'below');
  assert.equal(v.scale, 3);
  assert.ok(v.bars.top < v.bars.bottom / 3, `top ${v.bars.top} bottom ${v.bars.bottom}`);
});

test('safe-area insets are respected', () => {
  const v = L({ devW: 2532, devH: 1170, dpr: 3, safe: { l: 47, r: 47, t: 0, b: 21 } });
  assert.ok(v.x >= 47 * 3);
  assert.ok(v.y + v.h <= 1170 - 21 * 3);
});

test('color helpers', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(parseColor('#10203040').slice(0, 3), [16, 32, 48]);
  assert.equal(mixColor('#000000', '#ffffff', 0.5), 'rgb(128,128,128)');
  assert.equal(new Set(BAYER4).size, 16);
});
