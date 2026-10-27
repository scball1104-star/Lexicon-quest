// C2-world: beginReading, endReading for every `how`, resumeReading and the save slot rules, against a fake engine (no scenes
// drawn: o.warp false, a save over a memory storage, a stack of named scenes for popToField). What cave.js promises is checked
// here only as far as the glue must keep it: the party restored before anything else, the suspend save written per floor and
// gone on every exit, lastExit shaped for the story scene.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.LQ_CAVE_ON = true;
const { ensurePack } = await import('../../src/game/packs.js');
await ensurePack('cave', { quiet: true, warm: false });
const W = await import('../../src/data/cave/world.js');
const { createSave, SUSPEND_SLOTS, SLOT_COUNT } = await import('../../src/core/save.js');
const { newGameEp2, serialize } = await import('../../src/game/state.js');
const CAVE = await import('../../src/game/cave.js');
const { peekMap } = await import('../../src/world/maps.js');
const { arrivalOf } = await import('../../src/data/cave/gen.js');

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
}
/** A fake engine: a save over memory, a scene stack of names, reset/pop/push recorded, no renderer. */
function fakeEngine(game) {
  const e = {
    game, save: createSave({ storage: memoryStorage() }), stack: [], calls: [],
    get scene() { return this.stack[this.stack.length - 1] || null; },
    get scenes() { return this.stack.slice(); },
    pop(r) { this.calls.push(['pop', r]); return this.stack.pop(); },
    push(n, d) { this.calls.push(['push', n, d]); const s = { name: n, data: d }; this.stack.push(s); return s; },
    reset(n, d) { this.calls.push(['reset', n, d]); this.stack = [{ name: n, data: d }]; },
    hasScene() { return false; },
    waitFrames: async () => {},
    after(n, fn) { this.calls.push(['after', n]); fn(); },
    audio: { sfx() {} }, toasts: null, assets: null, transition: null,
  };
  return e;
}
const stripCave = (g) => { const s = serialize(g); delete s.cave; return s; };

test('beginReading: cave.enter, B1 and B2 registered, the suspend save written in slot cave with the floor in its meta', async () => {
  const g = newGameEp2('Arden');
  const e = fakeEngine(g);
  const before = stripCave(g);
  const r = await W.beginReading(e, g, { seed: 11, warp: false });
  assert.deepEqual({ ok: r.ok, seed: r.seed, floor: r.floor }, { ok: true, seed: 11, floor: 1 });
  assert.deepEqual(r.arrival, arrivalOf(11, 1));
  assert.ok(peekMap('cave_b1') && peekMap('cave_b2'));
  assert.equal(g.party[0].level, 1); assert.deepEqual(g.items, {}); assert.equal(g.gold, 0);
  assert.equal(e.save.exists('cave'), true, 'the suspend save');
  const env = e.save.loadEnvelope('cave');
  assert.deepEqual(env.meta.cave, { floor: 1, seed: 11 });
  assert.equal(env.data.cave.run.floor, 1);
  assert.deepEqual(stripCave(CAVE.bank(structuredClone(g), { free: true }) && (() => { const h = structuredClone(g); CAVE.bank(h, { free: true }); return h; })()), before, 'what cave.bank restores is the game as it was before the reading');
  const again = await W.beginReading(e, g, { seed: 11, warp: false });
  assert.deepEqual(again, { ok: false, why: 'in_run' }, 'a second reading cannot start inside the first');
});

test('endReading(bank): refused without a Bookmark; with one the party is restored, the suspend save is gone, lastExit names the blues', async () => {
  const g = newGameEp2('Arden');
  const e = fakeEngine(g);
  const before = stripCave(g);
  await W.beginReading(e, g, { seed: 5, warp: false });
  for (let i = 0; i < 4; i++) CAVE.descend(g);
  CAVE.foundBlue(g, 'cave_catalogue_pen');
  const no = await W.endReading(e, g, 'bank', { warp: false });
  assert.deepEqual(no, { ok: false, why: 'no_bookmark' });
  assert.equal(CAVE.inRun(g), true, 'still inside');
  CAVE.foundBookmark(g, 1);
  const r = await W.endReading(e, g, 'bank', { warp: false });
  assert.equal(r.ok, true); assert.equal(r.floor, 5); assert.deepEqual(r.blues, ['cave_catalogue_pen']);
  assert.equal(CAVE.inRun(g), false);
  assert.equal(e.save.exists('cave'), false, 'the suspend save is deleted on bank');
  assert.deepEqual(g.cave.lastExit.how, 'bank'); assert.deepEqual(g.cave.lastExit.blues, ['cave_catalogue_pen']); assert.deepEqual(g.cave.lastExit.lost, []);
  assert.equal(g.cave.lastExit.floor, 5);
  assert.deepEqual(CAVE.vaultIds(g), ['cave_catalogue_pen']);
  // the overworld is back: everything but the added unique and the vault
  const after = stripCave(g);
  const added = after.gear.filter((it) => it.base === 'cave_catalogue_pen');
  assert.equal(added.length, 1, 'the blue is in the restored bag');
  after.gear = after.gear.filter((it) => it.base !== 'cave_catalogue_pen'); after.gearNext = before.gearNext;
  assert.deepEqual(after, before);
  assert.deepEqual(await W.endReading(e, g, 'bank', { warp: false }), { ok: false, why: 'not_in_run' });
});

test('endReading(die) and (quit): restored, this run\'s blues lost, the vault from before kept, the record keeps the floor', async () => {
  for (const how of ['die', 'quit']) {
    const g = newGameEp2('Arden');
    g.cave = { vault: ['cave_shelf_mail'], record: { floor: 3, readings: 1, clears: 0, time: 0 }, run: null, snapshot: null };
    CAVE.reconcileVault(g);
    const e = fakeEngine(g);
    const before = stripCave(g);
    await W.beginReading(e, g, { seed: 9, warp: false });
    for (let i = 0; i < 7; i++) CAVE.descend(g);
    CAVE.foundBlue(g, 'cave_reading_hood');
    assert.equal(e.save.exists('cave'), true);
    const r = await W.endReading(e, g, how, { warp: false });
    assert.equal(r.ok, true); assert.equal(r.floor, 8); assert.deepEqual(r.lost, ['cave_reading_hood']); assert.equal(r.cause, how === 'quit' ? 'quit' : 'wipe');
    assert.equal(e.save.exists('cave'), false, `the suspend save is deleted on ${how}`);
    assert.deepEqual(g.cave.lastExit, { ...g.cave.lastExit, how, floor: 8, blues: [], lost: ['cave_reading_hood'] });
    assert.deepEqual(CAVE.vaultIds(g), ['cave_shelf_mail'], 'the vault from earlier readings is untouched');
    assert.equal(CAVE.recordOf(g).floor, 8);
    assert.deepEqual(stripCave(g), before, `${how} restores the overworld byte for byte`);
  }
});

test('endReading(clear) at B100: the Quill joins the vault, deep_stacks_cleared is set, no Bookmark needed', async () => {
  const g = newGameEp2('Arden');
  const e = fakeEngine(g);
  await W.beginReading(e, g, { seed: 3, warp: false });
  for (let i = 0; i < 99; i++) CAVE.descend(g);
  assert.equal(CAVE.floorOf(g), 100);
  const r = await W.endReading(e, g, 'clear', { warp: false });
  assert.equal(r.ok, true); assert.equal(r.cleared, true); assert.equal(r.bookmarkUsed, false);
  assert.ok(CAVE.vaultIds(g).includes('cave_binders_quill'));
  assert.equal(g.flags.deep_stacks_cleared, true);
  assert.equal(g.cave.lastExit.how, 'clear');
  assert.equal(CAVE.recordOf(g).clears, 1);
});

test('popToField pops a menu (close) and anything else above the field, never the field', () => {
  const e = fakeEngine(newGameEp2('Arden'));
  let closed = 0;
  e.stack = [{ name: 'title' }, { name: 'field' }, { name: 'menu', close() { closed++; e.stack.pop(); } }, { name: 'dialog' }];
  assert.equal(W.popToField(e), 2);
  assert.equal(closed, 1);
  assert.deepEqual(e.stack.map((s) => s.name), ['title', 'field']);
  assert.equal(W.popToField(e), 0);
  assert.equal(W.fieldOf(e).name, 'field');
});

test('resumeReading: the suspend save is loaded, the floor rebuilt from (seed, floor) and the field reset at its arrival', async () => {
  const g = newGameEp2('Arden');
  const e = fakeEngine(g);
  await W.beginReading(e, g, { seed: 21, warp: false });
  for (let i = 0; i < 22; i++) CAVE.descend(g);
  // the field would write the suspend save on arrival; here the test does what field.autosave does
  e.save.save('cave', serialize(g), CAVE.suspendMeta(g));
  const e2 = fakeEngine(null);
  e2.save = e.save;
  const r = await W.resumeReading(e2);
  assert.deepEqual({ ok: r.ok, floor: r.floor, seed: r.seed }, { ok: true, floor: 23, seed: 21 });
  assert.deepEqual(r.arrival, arrivalOf(21, 23));
  assert.ok(e2.game && CAVE.inRun(e2.game) && CAVE.floorOf(e2.game) === 23);
  assert.ok(peekMap('cave_b23') && peekMap('cave_b24'), 'B23 and B24 are registered');
  const reset = e2.calls.find((c) => c[0] === 'reset');
  assert.deepEqual(reset, ['reset', 'field', { map: 'cave_b23', x: r.arrival[0], y: r.arrival[1], dir: 'down' }]);
  assert.deepEqual(await W.resumeReading(fakeEngine(null)), { ok: false, why: 'no_run' }, 'nothing to resume without the save');
});

test('core/save.js: the suspend slot is a named slot; list() never shows it; the numeric rule is unchanged', () => {
  assert.deepEqual(SUSPEND_SLOTS, ['cave']);
  const s = createSave({ storage: memoryStorage() });
  assert.equal(s.exists('cave'), false);
  assert.equal(s.save('cave', { a: 1 }, { cave: { floor: 4, seed: 1 } }), true);
  assert.equal(s.exists('cave'), true);
  assert.deepEqual(s.loadEnvelope('cave').meta, { cave: { floor: 4, seed: 1 } });
  assert.deepEqual(s.list(true).map((x) => x.slot), [0, 1, 2, 3], 'list() loops the numbered slots only');
  assert.equal(s.remove('cave'), true);
  assert.equal(s.exists('cave'), false);
  assert.throws(() => s.save(SLOT_COUNT + 1, {}), RangeError);
  assert.throws(() => s.save('nope', {}), RangeError);
});

test('the debug state carries what the bots read: floor, seed, blues, bookmarks, vault, record', async () => {
  const g = newGameEp2('Arden');
  const e = fakeEngine(g);
  await W.beginReading(e, g, { seed: 2, warp: false });
  CAVE.foundBookmark(g, 2);
  const d = W.debugState(g);
  assert.equal(d.inRun, true); assert.equal(d.floor, 1); assert.equal(d.seed, 2); assert.deepEqual(d.blues, []); assert.equal(d.bookmarks, 2);
  assert.deepEqual(d.vault, []); assert.deepEqual(d.record, { floor: 1, readings: 1, clears: 0, time: 0 }); assert.equal(d.tag, 'B1');
  assert.ok(Array.isArray(d.blueFloors) && d.blueFloors.length);
});
