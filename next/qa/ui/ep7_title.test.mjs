// E7-pack (EPISODE7_PLAN 10.5, 5.3): the Episode 7 title offer and the pack hooks. Pure node tests over a fake storage. The
// row's drawing and its picker are ./title.js (E7-scene-ui, wave 7d); here only when it may show, and that nothing else changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { serialize, saveMeta } from '../../src/game/state.js';
import { CREDITS_HANDOFF } from '../../src/game/story.js';
import { QUEST_EXT } from '../../src/data/quests.js';
import { EP7_LIVE } from '../../src/game/episodes.js';
import { END_CARD_EP6 } from '../../src/data/ep6/text.js';
import { register as registerEp6 } from '../../src/data/ep6/index.js';
import { ep7Offer, HOOKS, END_CARD_EP6_LIVE, EP7_ROW_LABEL, EP7_ROW_HELP, register as registerHooks, unregister, handoff7, relandPatched } from '../../src/data/ep7/hooks.js';
import { newGameEp7, EP6_DONE_FLAGS } from '../../src/data/ep7/start.js';
import { newGameEp6 } from '../../src/data/ep6/start.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => createSave({ storage: memoryStorage(), log: () => {} });
function withGame(save, slot, flags = {}, name = 'Sol') {
  const g = newGameEp6(name, { slot });
  for (const f of EP6_DONE_FLAGS) g.flags[f] = true;
  Object.assign(g.flags, flags);
  save.save(slot, serialize(g), saveMeta(g));
  return g;
}

test('?ep=7 is hidden while EP7_MAPS_LISTED is false, and shows once the maps are listed', () => {
  const save = fresh();
  assert.equal(ep7Offer(save, '?ep=7').show, false, 'the real switches: off and unlisted');
  assert.equal(ep7Offer(save, '?ep=7', { mapsListed: false }).show, false);
  assert.equal(ep7Offer(save, '?ep=7', { mapsListed: true }).show, true);
  assert.equal(ep7Offer(save, '?ep=7', { mapsListed: true }).url, true);
  assert.equal(ep7Offer(save, '?ep=6', { mapsListed: true }).show, false);
  assert.equal(ep7Offer(save, '?ep=77', { mapsListed: true }).show, false);
});

test('live: shown once any base-game slot has ep6_complete, naming the newest; never for a Fine Print run; off by default', () => {
  const save = fresh();
  assert.equal(ep7Offer(save, '', { live: true }).show, false, 'no saves');
  withGame(save, 1, { ep6_complete: false });
  assert.equal(ep7Offer(save, '', { live: true }).show, false, 'Episode 6 not finished');
  withGame(save, 2, { tier_1: true }, 'Fine');
  assert.equal(ep7Offer(save, '', { live: true }).show, false, 'a Fine Print run does not count (plan 10.7)');
  withGame(save, 3, {}, 'Wren');
  const o = ep7Offer(save, '', { live: true });
  assert.equal(o.show, true);
  assert.equal(o.slot, 3);
  assert.equal(o.name, 'Wren');
  assert.equal(ep7Offer(save, '', { live: false }).show, false, 'off: nothing, whatever the saves hold');
  assert.equal(ep7Offer(save, '').show, EP7_LIVE, 'the real switch decides');
});

test('the row text matches plan 10.5 and 5.3', () => {
  assert.equal(EP7_ROW_LABEL, 'Episode 7: new party');
  assert.equal(EP7_ROW_HELP, 'A ready party at Lv 28. Your own save stays under Continue.');
  assert.equal(END_CARD_EP6_LIVE.sub, 'Episode 7 begins in the morning.');
  assert.equal(END_CARD_EP6_LIVE.text, END_CARD_EP6.text);
  assert.equal(END_CARD_EP6_LIVE.backdrop, END_CARD_EP6.backdrop);
  for (const s of [EP7_ROW_LABEL, EP7_ROW_HELP, END_CARD_EP6_LIVE.sub]) assert.ok(!/[^\x20-\x7e]/.test(s) && s.length <= 60, `plain ASCII, short: ${s}`);
});

test('LQ_EP7.title adds nothing and loads no title code while there is nothing to offer', async () => {
  const scene = { name: 'title', engine: { save: fresh() }, menu: { items: [{ id: 'new' }, { id: 'continue' }] } };
  assert.equal(await HOOKS.title(scene), false);
  assert.deepEqual(scene.menu.items.map((i) => i.id), ['new', 'continue']);
});

test('hooks: credits entry 7 (the Watch) only with text.js CREDITS_EP7; the Episode 6 end card stays while off; the quest goes first', async () => {
  await registerEp6();   // CREDITS_HANDOFF[6] is the ep6 pack's
  assert.ok(CREDITS_HANDOFF[6]);
  assert.equal(handoff7(null), null);
  assert.equal(handoff7({}), null);
  const cards = [{ heading: 'X', lines: [] }];
  assert.deepEqual(handoff7({ CREDITS_EP7: cards, END_CARD_EP7: { text: 'To be continued' } }),
    { cards, music: 'palehaven', map: 'ep7_ph_watch', mark: 'watch_cot', counter: 'credits7_rolled', endCard: { text: 'To be continued' }, flag: 'ep7_complete' });
  const Q7 = { id: 'main_ep7', steps: [] };
  const had = QUEST_EXT.slice();
  const had7 = CREDITS_HANDOFF[7];
  const card6 = CREDITS_HANDOFF[6].endCard;
  const r = registerHooks(null, { text: { CREDITS_EP7: cards }, quests: { MAIN_QUEST_EP7: Q7 } });
  try {
    assert.ok(r.installed.includes('credits7') && r.installed.includes('quest'));
    assert.equal(r.installed.includes('endcard6'), EP7_LIVE, 'the end card is left alone while EP7_LIVE is false');
    assert.equal(CREDITS_HANDOFF[7].flag, 'ep7_complete');
    if (!EP7_LIVE) assert.deepEqual(CREDITS_HANDOFF[6].endCard, END_CARD_EP6, 'off: unchanged');
    assert.deepEqual([CREDITS_HANDOFF[6].map, CREDITS_HANDOFF[6].mark], ['ep6_zl_inn', 'inn_bed'], 'the Episode 6 wake never moves');
    assert.deepEqual(QUEST_EXT[0], ['ep7_started', Q7], 'Episode 7 is asked before Episode 6');
    assert.equal(globalThis.LQ_EP7, HOOKS);
    registerHooks(null, { text: { CREDITS_EP7: cards }, quests: { MAIN_QUEST_EP7: Q7 } });
    assert.equal(QUEST_EXT.filter(([f]) => f === 'ep7_started').length, 1, 'idempotent');
  } finally {
    unregister();
    if (had7) CREDITS_HANDOFF[7] = had7; else delete CREDITS_HANDOFF[7];
    QUEST_EXT.length = 0; QUEST_EXT.push(...had);
  }
  assert.equal(globalThis.LQ_EP7, undefined);
  assert.equal(CREDITS_HANDOFF[6].endCard, card6);
  // the live path (as E7-integrate's flip will run it): the end card swaps, and unregister puts it back
  const live = registerHooks(null, {}, { live: true });
  try {
    assert.ok(live.installed.includes('endcard6'));
    assert.equal(CREDITS_HANDOFF[6].endCard.sub, 'Episode 7 begins in the morning.');
    assert.equal(CREDITS_HANDOFF[6].map, 'ep6_zl_inn', 'live: the wake still does not move');
  } finally { unregister(); }
  assert.equal(CREDITS_HANDOFF[6].endCard, card6, 'unregister restores the Episode 6 end card');
  const w = registerHooks(null, {});
  try { assert.ok(w.waiting.some((x) => x.startsWith('credits7')) && w.waiting.some((x) => x.startsWith('quest'))); } finally { unregister(); }
});

test('relandPatched does nothing while EP7_LIVE is false, and only on the three patched maps', () => {
  const field = (mapId, flags) => ({ name: 'field', mapId, map: { mod: {} }, game: { flags }, leader: { tx: 1, ty: 1, dir: 'down' }, warpTo() { this.warped = true; } });
  const f = field('ep6_zl_inn', { ep6_complete: true });
  const engine = { stack: [f], scene: f };
  assert.equal(relandPatched(engine, 0, false), false, 'off: never');
  assert.ok(!f.warped);
  const g = field('ep6_obs_f2', { ep6_complete: true });
  assert.equal(relandPatched({ stack: [g], scene: g }, 0, true), false, 'not a patched map');
});

test('LQ_DEBUG.newGameEp7 picks the run\'s own slot, readies every pack, refuses when every slot is full, and never writes', async () => {
  const cmds = {};
  globalThis.window = { LQ_DEBUG: { register: (n, fn) => { cmds[n] = fn; } } };
  try {
    const save = fresh();
    withGame(save, 0);
    const resets = [];
    const merged = { music: {}, sfx: {}, ambience: {}, jingles: {} };
    const engine = { save, game: null, hasScene: () => true, reset: (n, d) => resets.push([n, d]), audio: { manifest: merged, loadPack: () => Promise.resolve() } };
    registerHooks(engine, {});
    assert.equal(typeof cmds.newGameEp7, 'function');
    const r = await cmds.newGameEp7('Ada');
    assert.deepEqual(r, { map: 'ep6_zl_inn', slot: 1 });
    assert.equal(engine.game.autosaveSlot, 1);
    assert.equal(engine.game.chapter, 7);
    assert.deepEqual(resets, [['field', { map: 'ep6_zl_inn', mark: 'inn_bed', dir: 'down' }]]);
    assert.ok(merged.music.zephyr, 'the ep6 audio fragment (zephyr, Act I) reached this engine before the field');
    assert.ok(merged.packs && merged.packs.ep4 && merged.packs.ep5 && merged.packs.ep6, 'the ep4 to ep6 sfx packs are declared on this engine');
    assert.equal(save.exportSlot(1), null, 'nothing written until the field autosaves');
    for (let n = 1; n <= 3; n++) withGame(save, n);
    assert.equal(await cmds.newGameEp7('Ada'), null);
  } finally { unregister(); delete globalThis.window; }
});

test('LQ_EP7.start: every pack first, then the game, then the fade; it saves only to the slot it was given', async () => {
  const save = fresh();
  withGame(save, 0);
  let faded = null;
  const resets = [];
  const engine = { save, game: null, hasScene: () => true, reset: (n, d) => resets.push([n, d]), fadeTo: (fn) => { faded = fn; return Promise.resolve(); },
    audio: { manifest: { music: {}, sfx: {}, ambience: {}, jingles: {} }, loadPack: () => Promise.resolve() } };
  await HOOKS.start(engine, '  Bea  ', 2);
  assert.equal(engine.game.heroName, 'Bea');
  assert.equal(engine.game.autosaveSlot, 2);
  assert.ok(engine.audio.manifest.music.zephyr, 'the ep6 fragment is in before the fade');
  assert.equal(typeof faded, 'function');
  faded();
  assert.deepEqual(resets, [['field', { map: 'ep6_zl_inn', mark: 'inn_bed', dir: 'down' }]]);
  assert.equal(save.exportSlot(2), null);
  assert.ok(save.exportSlot(0), 'the other run is still there');
  assert.equal(newGameEp7('X').map, engine.game.map);
});
