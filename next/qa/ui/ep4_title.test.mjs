// E4-pack (EPISODE4_PLAN 10.5): the Episode 4 title offer and the pack hooks. Pure node tests over a fake storage. The row's
// drawing and its picker are ./title.js (E4-scene-ui, wave 4d); here only when it may show, and that nothing else changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { serialize, saveMeta, newGameEp3 } from '../../src/game/state.js';
import { CREDITS_HANDOFF } from '../../src/game/story.js';
import { END_CARD_EP3 } from '../../src/data/text.js';
import { EP4_LIVE } from '../../src/game/episodes.js';
import { ep4Offer, HOOKS, END_CARD_EP3_LIVE, EP4_ROW_LABEL, EP4_ROW_HELP, register as registerHooks, unregister, handoff4 } from '../../src/data/ep4/hooks.js';
import { EP3_DONE_FLAGS } from '../../src/data/ep4/start.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => createSave({ storage: memoryStorage(), log: () => {} });
function withGame(save, slot, flags = {}, name = 'Sol') {
  const g = newGameEp3(name, { slot });
  for (const f of EP3_DONE_FLAGS) g.flags[f] = true;
  Object.assign(g.flags, flags);
  save.save(slot, serialize(g), saveMeta(g));
  return g;
}

test('?ep=4 is hidden while EP4_MAPS_LISTED is false, and shows once the maps are listed', () => {
  const save = fresh();
  assert.equal(ep4Offer(save, '?ep=4').show, false, 'the real switches: off and unlisted');
  assert.equal(ep4Offer(save, '?ep=4', { mapsListed: false }).show, false);
  assert.equal(ep4Offer(save, '?ep=4', { mapsListed: true }).show, true);
  assert.equal(ep4Offer(save, '?ep=4', { mapsListed: true }).url, true);
  assert.equal(ep4Offer(save, '?ep=3', { mapsListed: true }).show, false);
});

test('live: shown once any base-game slot has ep3_complete, naming the newest; never for a Fine Print run', () => {
  const save = fresh();
  assert.equal(ep4Offer(save, '', { live: true }).show, false, 'no saves');
  withGame(save, 1, { ep3_complete: false });
  assert.equal(ep4Offer(save, '', { live: true }).show, false, 'Episode 3 not finished');
  withGame(save, 2, { tier_1: true }, 'Fine');
  assert.equal(ep4Offer(save, '', { live: true }).show, false, 'a Fine Print run does not count (EPISODE4 10.6)');
  withGame(save, 3, {}, 'Wren');
  const o = ep4Offer(save, '', { live: true });
  assert.equal(o.show, true);
  assert.equal(o.slot, 3);
  assert.equal(o.name, 'Wren');
  assert.equal(ep4Offer(save, '', { live: false }).show, false, 'off: nothing, whatever the saves hold');
});

test('the row text matches plan 10.5', () => {
  assert.equal(EP4_ROW_LABEL, 'Episode 4: new party');
  assert.equal(EP4_ROW_HELP, 'A ready party at Lv 17. Your own save stays under Continue.');
  assert.equal(END_CARD_EP3_LIVE.sub, 'Episode 4 begins in the morning.');
  assert.equal(END_CARD_EP3_LIVE.text, END_CARD_EP3.text);
  assert.equal(END_CARD_EP3_LIVE.backdrop, END_CARD_EP3.backdrop);
});

test('LQ_EP4.title adds nothing and loads no title code while there is nothing to offer', async () => {
  const scene = { name: 'title', engine: { save: fresh() }, menu: { items: [{ id: 'new' }, { id: 'continue' }] } };
  assert.equal(await HOOKS.title(scene), false);
  assert.deepEqual(scene.menu.items.map((i) => i.id), ['new', 'continue']);
});

test('hooks: credits entry 4 only with text.js CREDITS_EP4; the Episode 3 end card stays while EP4_LIVE is false', () => {
  assert.equal(handoff4(null), null);
  assert.equal(handoff4({}), null);
  const cards = [{ heading: 'X', lines: [] }];
  assert.deepEqual(handoff4({ CREDITS_EP4: cards, END_CARD_EP4: { text: 'End of Episode 4' } }),
    { cards, music: 'valewyn', map: 'ep4_vw_inn', mark: 'inn_bed', counter: 'credits4_rolled', endCard: { text: 'End of Episode 4' }, flag: 'ep4_complete' });
  const r = registerHooks(null, { text: { CREDITS_EP4: cards }, quests: {} });
  try {
    assert.ok(r.installed.includes('credits4'));
    assert.ok(r.waiting.some((w) => w.startsWith('quest')));
    assert.equal(CREDITS_HANDOFF[4].flag, 'ep4_complete');
    assert.equal(CREDITS_HANDOFF[3].endCard, EP4_LIVE ? END_CARD_EP3_LIVE : END_CARD_EP3, 'off: unchanged; live (E4-integrate): the morning card');
    assert.equal(globalThis.LQ_EP4, HOOKS);
  } finally { unregister(); delete CREDITS_HANDOFF[4]; }
  assert.equal(globalThis.LQ_EP4, undefined);
});

test('LQ_DEBUG.newGameEp4 picks the run\'s own slot, refuses when every slot is full, and never writes', async () => {
  const cmds = {};
  globalThis.window = { LQ_DEBUG: { register: (n, fn) => { cmds[n] = fn; } } };
  try {
    const save = fresh();
    withGame(save, 0);
    const resets = [];
    const engine = { save, game: null, hasScene: () => true, reset: (n, d) => resets.push([n, d]) };
    registerHooks(engine, {});
    assert.equal(typeof cmds.newGameEp4, 'function');
    const r = cmds.newGameEp4('Ada');
    assert.deepEqual(r, { map: 'pk_inn', slot: 1 });
    assert.equal(engine.game.autosaveSlot, 1);
    assert.deepEqual(resets, [['field', { map: 'pk_inn', mark: 'inn_bed', dir: 'down' }]]);
    assert.equal(save.exportSlot(1), null, 'nothing written until the field autosaves');
    for (let n = 1; n <= 3; n++) withGame(save, n);
    assert.equal(cmds.newGameEp4('Ada'), null);
  } finally { unregister(); delete globalThis.window; }
});
