// Issue #74 fix 1 (docs/ACCESSIBILITY.md item 1): the device's "reduce motion" request applies until the player sets
// Reduce motion. Before the fix the boot merged the stored settings (defaults included, so reduceMotion: false was
// always present) over the device value, and the device was never heard.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, bootSettings, prefersReducedMotion, DEFAULT_SETTINGS } from '../../src/core/save.js';
import { Engine } from '../../src/core/engine.js';
import { resetSettings } from '../../src/scenes/config.js';

function fakeStorage() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } };
}
const quiet = () => {};
/** A matchMedia that answers the reduce-motion query with `reduce`. */
const fakeMatchMedia = (reduce) => (q) => ({ matches: q === '(prefers-reduced-motion: reduce)' ? reduce : false, media: q });
/** What the engine does at boot: the raw stored object, then the device. */
function boot(storage, reduce) {
  const save = createSave({ storage, log: quiet });
  return { save, settings: bootSettings(save.loadSettings({}), prefersReducedMotion(fakeMatchMedia(reduce))) };
}
/** Engine.setSetting on a stand-in engine (no canvas in node). */
function fakeEngine(save, settings, osReduce) {
  return { save, settings, osReduceMotion: osReduce, renderer: { resize() {} }, touch: null, emit() {}, _applyVolumes() {} };
}

test('prefersReducedMotion reads a matchMedia and never throws', () => {
  assert.equal(prefersReducedMotion(fakeMatchMedia(true)), true);
  assert.equal(prefersReducedMotion(fakeMatchMedia(false)), false);
  assert.equal(prefersReducedMotion(null), false);
  assert.equal(prefersReducedMotion(() => { throw new Error('no'); }), false);
});

test('fresh storage follows the device both ways', () => {
  assert.equal(boot(fakeStorage(), true).settings.reduceMotion, true, 'the device asks for reduce: on');
  assert.equal(boot(fakeStorage(), false).settings.reduceMotion, false);
  const s = boot(fakeStorage(), true).settings;
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) if (k !== 'reduceMotion') assert.deepEqual(s[k], v, `${k} keeps its default`);
});

test('old saved settings: other choices kept, an untouched Reduce motion follows the device, a chosen On stays On', () => {
  // A build before the fix saved every setting, reduceMotion: false included, the first time anything changed.
  const old = fakeStorage();
  old.setItem('lq-next-settings', JSON.stringify({ ...DEFAULT_SETTINGS, music: 0.3, textSpeed: 1, reduceMotion: false }));
  const a = boot(old, true).settings;
  assert.equal(a.music, 0.3); assert.equal(a.textSpeed, 1);
  assert.equal(a.reduceMotion, true, 'a stored false the player never set does not override the device');
  assert.equal(boot(old, false).settings.reduceMotion, false);
  const on = fakeStorage();
  on.setItem('lq-next-settings', JSON.stringify({ ...DEFAULT_SETTINGS, reduceMotion: true }));
  assert.equal(boot(on, false).settings.reduceMotion, true, 'only a player could have stored On: it stays On');
  const junk = fakeStorage();
  junk.setItem('lq-next-settings', '{not json');
  assert.equal(boot(junk, true).settings.reduceMotion, true, 'corrupt settings still boot, following the device');
});

test('a Reduce motion the player sets overrides the device after a reload; Reset hands it back', () => {
  const storage = fakeStorage();
  const first = boot(storage, true);
  assert.equal(first.settings.reduceMotion, true);
  const e = fakeEngine(first.save, first.settings, true);
  Engine.prototype.setSetting.call(e, 'reduceMotion', false);   // the player turns it Off in Config
  assert.equal(boot(storage, true).settings.reduceMotion, false, 'Off survives a reload on a reduce-motion device');
  Engine.prototype.setSetting.call(e, 'music', 0.5);            // another setting saved later keeps the choice
  assert.equal(boot(storage, true).settings.reduceMotion, false);
  // Config "Reset to defaults" (scenes/config.js reset): the device value, and the choice mark cleared.
  e.setSetting = Engine.prototype.setSetting;
  resetSettings(e);
  assert.equal(e.settings.reduceMotion, true, 'Reset writes the device value, not false');
  assert.equal(e.settings.music, DEFAULT_SETTINGS.music);
  assert.equal(boot(storage, false).settings.reduceMotion, false, 'after Reset it follows the device again');
  assert.equal(boot(storage, true).settings.reduceMotion, true);
});
