import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, SAVE_VERSION, DEFAULT_SETTINGS } from '../../src/core/save.js';

function fakeStorage() {
  const m = new Map();
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}
const quiet = () => {};

test('save/load roundtrip uses lq-next-slot-<n> keys', () => {
  const storage = fakeStorage();
  const s = createSave({ storage, log: quiet, now: () => '2026-10-17T12:00:00.000Z' });
  const data = { party: ['hero', 'mira'], flags: { intro_done: true }, gold: 120, map: { id: 'willowmere', x: 5, y: 9 } };
  assert.equal(s.save(1, data, { name: 'Ash', level: 3, location: 'Willowmere' }), true);
  assert.ok(storage.m.has('lq-next-slot-1'));
  assert.deepEqual(s.load(1), data);
  const env = s.loadEnvelope(1);
  assert.equal(env.v, SAVE_VERSION);
  assert.equal(env.savedAt, '2026-10-17T12:00:00.000Z');
  assert.equal(env.meta.name, 'Ash');
  assert.equal(s.exists(2), false);
  assert.equal(s.load(2), null);
});

test('list() summarizes slots 1..3 (and 0 on request)', () => {
  const s = createSave({ storage: fakeStorage(), log: quiet });
  s.save(2, { a: 1 }, { name: 'B' });
  const list = s.list();
  assert.deepEqual(list.map((x) => x.slot), [1, 2, 3]);
  assert.deepEqual(list.map((x) => x.exists), [false, true, false]);
  assert.equal(list[1].meta.name, 'B');
  assert.equal(s.list(true).length, 4);
});

test('corrupt JSON and wrong shapes load as null without throwing', () => {
  const storage = fakeStorage();
  const s = createSave({ storage, log: quiet });
  storage.setItem('lq-next-slot-1', '{not json');
  storage.setItem('lq-next-slot-2', '[1,2,3]');
  storage.setItem('lq-next-slot-3', JSON.stringify({ v: SAVE_VERSION + 5, data: {} }));
  assert.equal(s.load(1), null);
  assert.equal(s.load(2), null);
  assert.equal(s.load(3), null, 'saves from a newer version are refused');
});

test('a throwing storage (private mode, quota) never throws into the game', () => {
  const boom = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); } };
  const s = createSave({ storage: boom, log: quiet });
  assert.equal(s.save(1, { x: 1 }), false);
  assert.equal(s.load(1), null);
  assert.equal(s.remove(1), false);
  assert.deepEqual(s.loadSettings(), { ...DEFAULT_SETTINGS });
  assert.equal(s.saveSettings({ music: 0.2 }), false);
});

test('unserializable data fails cleanly', () => {
  const s = createSave({ storage: fakeStorage(), log: quiet });
  const cyc = {}; cyc.self = cyc;
  assert.equal(s.save(1, cyc), false);
});

test('slot numbers are validated', () => {
  const s = createSave({ storage: fakeStorage(), log: quiet });
  assert.throws(() => s.save(4, {}), RangeError);
  assert.throws(() => s.load(-1), RangeError);
  assert.equal(s.save(0, { auto: true }), true, 'slot 0 is the autosave slot');
});

test('settings merge over defaults and keep unknown keys', () => {
  const storage = fakeStorage();
  const s = createSave({ storage, log: quiet });
  assert.deepEqual(s.loadSettings(), { ...DEFAULT_SETTINGS });
  s.saveSettings({ music: 0.25, futureOption: 'x' });
  assert.ok(storage.m.has('lq-next-settings'));
  const loaded = s.loadSettings();
  assert.equal(loaded.music, 0.25);
  assert.equal(loaded.sfx, DEFAULT_SETTINGS.sfx);
  assert.equal(loaded.futureOption, 'x');
});

test('migrations run in order', () => {
  const storage = fakeStorage();
  storage.setItem('lq-next-slot-1', JSON.stringify({ v: 0, data: { hp: 5 } }));
  const s = createSave({ storage, log: quiet });
  assert.equal(s.load(1), null, 'no migration registered yet');
  s.registerMigration(0, (e) => ({ ...e, v: 1, data: { ...e.data, mp: 0 } }));
  assert.deepEqual(s.load(1), { hp: 5, mp: 0 });
});

test('export/import validates before writing', () => {
  const s = createSave({ storage: fakeStorage(), log: quiet });
  s.save(1, { k: 'v' });
  const raw = s.exportSlot(1);
  assert.equal(s.importSlot(3, raw), true);
  assert.deepEqual(s.load(3), { k: 'v' });
  assert.equal(s.importSlot(2, 'garbage'), false);
  assert.equal(s.exists(2), false);
});
