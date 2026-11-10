// E6-pack (EPISODE6_PLAN 10.5, 5.3): the Episode 6 title offer and the pack hooks. Pure node tests over a fake storage. The
// row's drawing and its picker are ./title.js (E6-scene-ui, wave 6d); here only when it may show, and that nothing else changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { serialize, saveMeta } from '../../src/game/state.js';
import { CREDITS_HANDOFF } from '../../src/game/story.js';
import { QUEST_EXT } from '../../src/data/quests.js';
import { EP6_LIVE } from '../../src/game/episodes.js';
import { END_CARD_EP5 } from '../../src/data/ep5/text.js';
import { register as registerEp5 } from '../../src/data/ep5/index.js';
import { ep6Offer, HOOKS, END_CARD_EP5_LIVE, EP6_ROW_LABEL, EP6_ROW_HELP, register as registerHooks, unregister, handoff6 } from '../../src/data/ep6/hooks.js';
import { newGameEp6, EP5_DONE_FLAGS } from '../../src/data/ep6/start.js';
import { newGameEp5 } from '../../src/data/ep5/start.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => createSave({ storage: memoryStorage(), log: () => {} });
function withGame(save, slot, flags = {}, name = 'Sol') {
  const g = newGameEp5(name, { slot });
  for (const f of EP5_DONE_FLAGS) g.flags[f] = true;
  Object.assign(g.flags, flags);
  save.save(slot, serialize(g), saveMeta(g));
  return g;
}

test('?ep=6 is hidden while EP6_MAPS_LISTED is false, and shows once the maps are listed', () => {
  const save = fresh();
  assert.equal(ep6Offer(save, '?ep=6').show, false, 'the real switches: off and unlisted');
  assert.equal(ep6Offer(save, '?ep=6', { mapsListed: false }).show, false);
  assert.equal(ep6Offer(save, '?ep=6', { mapsListed: true }).show, true);
  assert.equal(ep6Offer(save, '?ep=6', { mapsListed: true }).url, true);
  assert.equal(ep6Offer(save, '?ep=5', { mapsListed: true }).show, false);
  assert.equal(ep6Offer(save, '?ep=66', { mapsListed: true }).show, false);
});

test('live: shown once any base-game slot has ep5_complete, naming the newest; never for a Fine Print run; off by default', () => {
  const save = fresh();
  assert.equal(ep6Offer(save, '', { live: true }).show, false, 'no saves');
  withGame(save, 1, { ep5_complete: false });
  assert.equal(ep6Offer(save, '', { live: true }).show, false, 'Episode 5 not finished');
  withGame(save, 2, { tier_1: true }, 'Fine');
  assert.equal(ep6Offer(save, '', { live: true }).show, false, 'a Fine Print run does not count (plan 10.7)');
  withGame(save, 3, {}, 'Wren');
  const o = ep6Offer(save, '', { live: true });
  assert.equal(o.show, true);
  assert.equal(o.slot, 3);
  assert.equal(o.name, 'Wren');
  assert.equal(ep6Offer(save, '', { live: false }).show, false, 'off: nothing, whatever the saves hold');
  assert.equal(EP6_LIVE, false);
  assert.equal(ep6Offer(save, '').show, false, 'the real switch is off in wave 6a');
});

test('the row text matches plan 10.5 and 5.3', () => {
  assert.equal(EP6_ROW_LABEL, 'Episode 6: new party');
  assert.equal(EP6_ROW_HELP, 'A ready party at Lv 25. Your own save stays under Continue.');
  assert.equal(END_CARD_EP5_LIVE.sub, 'Episode 6 begins in the morning.');
  assert.equal(END_CARD_EP5_LIVE.text, END_CARD_EP5.text);
  assert.equal(END_CARD_EP5_LIVE.backdrop, END_CARD_EP5.backdrop);
  for (const s of [EP6_ROW_LABEL, EP6_ROW_HELP, END_CARD_EP5_LIVE.sub]) assert.ok(!/[^\x20-\x7e]/.test(s) && s.length <= 60, `plain ASCII, short: ${s}`);
});

test('LQ_EP6.title adds nothing and loads no title code while there is nothing to offer', async () => {
  const scene = { name: 'title', engine: { save: fresh() }, menu: { items: [{ id: 'new' }, { id: 'continue' }] } };
  assert.equal(await HOOKS.title(scene), false);
  assert.deepEqual(scene.menu.items.map((i) => i.id), ['new', 'continue']);
});

test('hooks: credits entry 6 only with text.js CREDITS_EP6; the Episode 5 end card stays while EP6_LIVE is false; the quest goes first', async () => {
  await registerEp5();   // CREDITS_HANDOFF[5] is the ep5 pack's
  assert.ok(CREDITS_HANDOFF[5]);
  assert.equal(handoff6(null), null);
  assert.equal(handoff6({}), null);
  const cards = [{ heading: 'X', lines: [] }];
  assert.deepEqual(handoff6({ CREDITS_EP6: cards, END_CARD_EP6: { text: 'To be continued' } }),
    { cards, music: 'zephyr', map: 'ep6_zl_inn', mark: 'inn_bed', counter: 'credits6_rolled', endCard: { text: 'To be continued' }, flag: 'ep6_complete' });
  const Q6 = { id: 'main_ep6', steps: [] };
  const had = QUEST_EXT.slice();
  const had6 = CREDITS_HANDOFF[6];
  const r = registerHooks(null, { text: { CREDITS_EP6: cards }, quests: { MAIN_QUEST_EP6: Q6 } });
  try {
    assert.ok(r.installed.includes('credits6') && r.installed.includes('quest'));
    assert.ok(!r.installed.includes('endcard5'), 'the end card is left alone while EP6_LIVE is false');
    assert.equal(CREDITS_HANDOFF[6].flag, 'ep6_complete');
    assert.deepEqual(CREDITS_HANDOFF[5].endCard, END_CARD_EP5, 'off: unchanged');
    assert.equal(CREDITS_HANDOFF[5].endCard.sub, 'Episode 6 is not playable yet.');
    assert.deepEqual(QUEST_EXT[0], ['ep6_started', Q6], 'Episode 6 is asked before Episode 5');
    assert.equal(globalThis.LQ_EP6, HOOKS);
    registerHooks(null, { text: { CREDITS_EP6: cards }, quests: { MAIN_QUEST_EP6: Q6 } });
    assert.equal(QUEST_EXT.filter(([f]) => f === 'ep6_started').length, 1, 'idempotent');
  } finally {
    unregister();
    if (had6) CREDITS_HANDOFF[6] = had6; else delete CREDITS_HANDOFF[6];
    QUEST_EXT.length = 0; QUEST_EXT.push(...had);
  }
  assert.equal(globalThis.LQ_EP6, undefined);
  const w = registerHooks(null, {});
  try { assert.ok(w.waiting.some((x) => x.startsWith('credits6')) && w.waiting.some((x) => x.startsWith('quest'))); } finally { unregister(); }
});

test('LQ_DEBUG.newGameEp6 picks the run\'s own slot, readies every pack, refuses when every slot is full, and never writes', async () => {
  const cmds = {};
  globalThis.window = { LQ_DEBUG: { register: (n, fn) => { cmds[n] = fn; } } };
  try {
    const save = fresh();
    withGame(save, 0);
    const resets = [];
    const merged = { music: {}, sfx: {}, ambience: {}, jingles: {} };
    const engine = { save, game: null, hasScene: () => true, reset: (n, d) => resets.push([n, d]), audio: { manifest: merged, loadPack: () => Promise.resolve() } };
    registerHooks(engine, {});
    assert.equal(typeof cmds.newGameEp6, 'function');
    const r = await cmds.newGameEp6('Ada');
    assert.deepEqual(r, { map: 'ep5_sh_inn', slot: 1 });
    assert.equal(engine.game.autosaveSlot, 1);
    assert.equal(engine.game.chapter, 6);
    assert.deepEqual(resets, [['field', { map: 'ep5_sh_inn', mark: 'inn_bed', dir: 'down' }]]);
    assert.ok(merged.music.saffron, 'the ep5 audio fragment reached this engine before the field');
    assert.ok(merged.packs && merged.packs.ep4 && merged.packs.ep5, 'the ep4 and ep5 sfx packs are declared on this engine');
    assert.equal(save.exportSlot(1), null, 'nothing written until the field autosaves');
    for (let n = 1; n <= 3; n++) withGame(save, n);
    assert.equal(await cmds.newGameEp6('Ada'), null);
  } finally { unregister(); delete globalThis.window; }
});

test('LQ_EP6.start: every pack first, then the game, then the fade; it saves only to the slot it was given', async () => {
  const save = fresh();
  withGame(save, 0);
  let faded = null;
  const resets = [];
  const engine = { save, game: null, hasScene: () => true, reset: (n, d) => resets.push([n, d]), fadeTo: (fn) => { faded = fn; return Promise.resolve(); },
    audio: { manifest: { music: {}, sfx: {}, ambience: {}, jingles: {} }, loadPack: () => Promise.resolve() } };
  await HOOKS.start(engine, '  Bea  ', 2);
  assert.equal(engine.game.heroName, 'Bea');
  assert.equal(engine.game.autosaveSlot, 2);
  assert.ok(engine.audio.manifest.music.saffron, 'the ep5 fragment is in before the fade');
  assert.equal(typeof faded, 'function');
  faded();
  assert.deepEqual(resets, [['field', { map: 'ep5_sh_inn', mark: 'inn_bed', dir: 'down' }]]);
  assert.equal(save.exportSlot(2), null);
  assert.ok(save.exportSlot(0), 'the other run is still there');
  assert.equal(newGameEp6('X').map, engine.game.map);
});
