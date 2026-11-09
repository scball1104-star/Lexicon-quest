// E5-pack (EPISODE5_PLAN 10.5): the Episode 5 title offer and the pack hooks. Pure node tests over a fake storage. The row's
// drawing and its picker are ./title.js (E5-scene-ui, wave 5d); here only when it may show, and that nothing else changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { serialize, saveMeta } from '../../src/game/state.js';
import { CREDITS_HANDOFF } from '../../src/game/story.js';
import { QUEST_EXT } from '../../src/data/quests.js';
import { EP5_LIVE } from '../../src/game/episodes.js';
import { END_CARD_EP4 } from '../../src/data/ep4/text.js';
import { register as registerEp4 } from '../../src/data/ep4/index.js';
import { ep5Offer, HOOKS, END_CARD_EP4_LIVE, EP5_ROW_LABEL, EP5_ROW_HELP, register as registerHooks, unregister, handoff5 } from '../../src/data/ep5/hooks.js';
import { newGameEp5, EP4_DONE_FLAGS } from '../../src/data/ep5/start.js';
import { newGameEp4 } from '../../src/data/ep4/start.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => createSave({ storage: memoryStorage(), log: () => {} });
function withGame(save, slot, flags = {}, name = 'Sol') {
  const g = newGameEp4(name, { slot });
  for (const f of EP4_DONE_FLAGS) g.flags[f] = true;
  Object.assign(g.flags, flags);
  save.save(slot, serialize(g), saveMeta(g));
  return g;
}

test('?ep=5 is hidden while EP5_MAPS_LISTED is false, and shows once the maps are listed', () => {
  const save = fresh();
  assert.equal(ep5Offer(save, '?ep=5').show, false, 'the real switches: off and unlisted');
  assert.equal(ep5Offer(save, '?ep=5', { mapsListed: false }).show, false);
  assert.equal(ep5Offer(save, '?ep=5', { mapsListed: true }).show, true);
  assert.equal(ep5Offer(save, '?ep=5', { mapsListed: true }).url, true);
  assert.equal(ep5Offer(save, '?ep=4', { mapsListed: true }).show, false);
  assert.equal(ep5Offer(save, '?ep=55', { mapsListed: true }).show, false);
});

test('live: shown once any base-game slot has ep4_complete, naming the newest; never for a Fine Print run', () => {
  const save = fresh();
  assert.equal(ep5Offer(save, '', { live: true }).show, false, 'no saves');
  withGame(save, 1, { ep4_complete: false });
  assert.equal(ep5Offer(save, '', { live: true }).show, false, 'Episode 4 not finished');
  withGame(save, 2, { tier_1: true }, 'Fine');
  assert.equal(ep5Offer(save, '', { live: true }).show, false, 'a Fine Print run does not count (EPISODE5 10.11)');
  withGame(save, 3, {}, 'Wren');
  const o = ep5Offer(save, '', { live: true });
  assert.equal(o.show, true);
  assert.equal(o.slot, 3);
  assert.equal(o.name, 'Wren');
  assert.equal(ep5Offer(save, '', { live: false }).show, false, 'off: nothing, whatever the saves hold');
  assert.equal(ep5Offer(save, '').show, EP5_LIVE, 'the real switch decides');
});

test('the row text matches plan 10.5 and 5.3', () => {
  assert.equal(EP5_ROW_LABEL, 'Episode 5: new party');
  assert.equal(EP5_ROW_HELP, 'A ready party at Lv 21. Your own save stays under Continue.');
  assert.equal(END_CARD_EP4_LIVE.sub, 'Episode 5 begins in the morning.');
  assert.equal(END_CARD_EP4_LIVE.text, END_CARD_EP4.text);
  assert.equal(END_CARD_EP4_LIVE.backdrop, END_CARD_EP4.backdrop);
  for (const s of [EP5_ROW_LABEL, EP5_ROW_HELP, END_CARD_EP4_LIVE.sub]) assert.ok(!/[^\x20-\x7e]/.test(s) && s.length <= 60, `plain ASCII, short: ${s}`);
});

test('LQ_EP5.title adds nothing and loads no title code while there is nothing to offer', async () => {
  const scene = { name: 'title', engine: { save: fresh() }, menu: { items: [{ id: 'new' }, { id: 'continue' }] } };
  assert.equal(await HOOKS.title(scene), false);
  assert.deepEqual(scene.menu.items.map((i) => i.id), ['new', 'continue']);
});

test('hooks: credits entry 5 only with text.js CREDITS_EP5; the Episode 4 end card stays while EP5_LIVE is false; the quest goes first', async () => {
  await registerEp4();   // CREDITS_HANDOFF[4] is the ep4 pack's
  assert.ok(CREDITS_HANDOFF[4]);
  assert.equal(handoff5(null), null);
  assert.equal(handoff5({}), null);
  const cards = [{ heading: 'X', lines: [] }];
  assert.deepEqual(handoff5({ CREDITS_EP5: cards, END_CARD_EP5: { text: 'End of Episode 5' } }),
    { cards, music: 'saffron', map: 'ep5_sh_inn', mark: 'inn_bed', counter: 'credits5_rolled', endCard: { text: 'End of Episode 5' }, flag: 'ep5_complete' });
  const Q5 = { id: 'main_ep5', steps: [] };
  const had = QUEST_EXT.slice();
  const r = registerHooks(null, { text: { CREDITS_EP5: cards }, quests: { MAIN_QUEST_EP5: Q5 } });
  try {
    assert.ok(r.installed.includes('credits5') && r.installed.includes('quest'));
    assert.equal(CREDITS_HANDOFF[5].flag, 'ep5_complete');
    assert.equal(CREDITS_HANDOFF[4].endCard, EP5_LIVE ? END_CARD_EP4_LIVE : END_CARD_EP4, 'off: unchanged');
    assert.deepEqual(QUEST_EXT[0], ['ep5_started', Q5], 'Episode 5 is asked before Episode 4');
    assert.equal(globalThis.LQ_EP5, HOOKS);
    registerHooks(null, { text: { CREDITS_EP5: cards }, quests: { MAIN_QUEST_EP5: Q5 } });
    assert.equal(QUEST_EXT.filter(([f]) => f === 'ep5_started').length, 1, 'idempotent');
  } finally {
    unregister(); delete CREDITS_HANDOFF[5];
    QUEST_EXT.length = 0; QUEST_EXT.push(...had);
  }
  assert.equal(globalThis.LQ_EP5, undefined);
  assert.equal(CREDITS_HANDOFF[4].endCard, END_CARD_EP4);
  const w = registerHooks(null, {});
  try { assert.ok(w.waiting.some((x) => x.startsWith('credits5')) && w.waiting.some((x) => x.startsWith('quest'))); } finally { unregister(); }
});

test('LQ_DEBUG.newGameEp5 picks the run\'s own slot, readies both packs, refuses when every slot is full, and never writes', async () => {
  const cmds = {};
  globalThis.window = { LQ_DEBUG: { register: (n, fn) => { cmds[n] = fn; } } };
  try {
    const save = fresh();
    withGame(save, 0);
    const resets = [];
    const merged = { music: {}, sfx: {}, ambience: {}, jingles: {} };
    const engine = { save, game: null, hasScene: () => true, reset: (n, d) => resets.push([n, d]), audio: { manifest: merged, loadPack: () => Promise.resolve() } };
    registerHooks(engine, {});
    assert.equal(typeof cmds.newGameEp5, 'function');
    const r = await cmds.newGameEp5('Ada');
    assert.deepEqual(r, { map: 'ep4_vw_inn', slot: 1 });
    assert.equal(engine.game.autosaveSlot, 1);
    assert.equal(engine.game.chapter, 5);
    assert.deepEqual(resets, [['field', { map: 'ep4_vw_inn', mark: 'inn_bed', dir: 'down' }]]);
    assert.ok(Object.keys(merged.music).length + Object.keys(merged.sfx).length > 0, 'the ep4 audio fragment reached this engine before the field');
    assert.equal(save.exportSlot(1), null, 'nothing written until the field autosaves');
    for (let n = 1; n <= 3; n++) withGame(save, n);
    assert.equal(await cmds.newGameEp5('Ada'), null);
  } finally { unregister(); delete globalThis.window; }
});

test('LQ_EP5.start: both packs first, then the game, then the fade; it saves only to the slot it was given', async () => {
  const save = fresh();
  withGame(save, 0);
  let faded = null;
  const resets = [];
  const engine = { save, game: null, hasScene: () => true, reset: (n, d) => resets.push([n, d]), fadeTo: (fn) => { faded = fn; return Promise.resolve(); },
    audio: { manifest: { music: {}, sfx: {}, ambience: {}, jingles: {} }, loadPack: () => Promise.resolve() } };
  await HOOKS.start(engine, '  Bea  ', 2);
  assert.equal(engine.game.heroName, 'Bea');
  assert.equal(engine.game.autosaveSlot, 2);
  assert.equal(typeof faded, 'function');
  faded();
  assert.deepEqual(resets, [['field', { map: 'ep4_vw_inn', mark: 'inn_bed', dir: 'down' }]]);
  assert.equal(save.exportSlot(2), null);
  assert.ok(save.exportSlot(0), 'the other run is still there');
  assert.equal(newGameEp5('X').map, engine.game.map);
});
