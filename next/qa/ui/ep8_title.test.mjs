// E8-pack (EPISODE8_PLAN 10.5, 5.3): the Episode 8 title offer and the pack hooks. Pure node tests over a fake storage. The
// row's drawing and its picker are ./title.js (E8-scene-ui, wave 8d); here only when it may show, and that nothing else changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { serialize, saveMeta } from '../../src/game/state.js';
import { CREDITS_HANDOFF } from '../../src/game/story.js';
import { QUEST_EXT } from '../../src/data/quests.js';
import { EP8_LIVE } from '../../src/game/episodes.js';
import { END_CARD_EP7 } from '../../src/data/ep7/text.js';
import { register as registerEp7 } from '../../src/data/ep7/index.js';
import { ep8Offer, HOOKS, END_CARD_EP7_LIVE, EP8_ROW_LABEL, EP8_ROW_HELP, register as registerHooks, unregister, relandPatched } from '../../src/data/ep8/hooks.js';
import { newGameEp8, EP7_DONE_FLAGS } from '../../src/data/ep8/start.js';
import { newGameEp7 } from '../../src/data/ep7/start.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => createSave({ storage: memoryStorage(), log: () => {} });
function withGame(save, slot, flags = {}, name = 'Sol') {
  const g = newGameEp7(name, { slot });
  for (const f of EP7_DONE_FLAGS) g.flags[f] = true;
  Object.assign(g.flags, flags);
  save.save(slot, serialize(g), saveMeta(g));
  return g;
}

test('?ep=8 is hidden while EP8_MAPS_LISTED is false, and shows once the maps are listed', () => {
  const save = fresh();
  assert.equal(ep8Offer(save, '?ep=8').show, false, 'the real switches: off and unlisted');
  assert.equal(ep8Offer(save, '?ep=8', { mapsListed: false }).show, false);
  assert.equal(ep8Offer(save, '?ep=8', { mapsListed: true }).show, true);
  assert.equal(ep8Offer(save, '?ep=8', { mapsListed: true }).url, true);
  assert.equal(ep8Offer(save, '?ep=7', { mapsListed: true }).show, false);
  assert.equal(ep8Offer(save, '?ep=88', { mapsListed: true }).show, false);
});

test('live: shown once any base-game slot has ep7_complete, naming the newest; never for a Fine Print run; off by default', () => {
  const save = fresh();
  assert.equal(ep8Offer(save, '', { live: true }).show, false, 'no saves');
  withGame(save, 1, { ep7_complete: false });
  assert.equal(ep8Offer(save, '', { live: true }).show, false, 'Episode 7 not finished');
  withGame(save, 2, { tier_1: true }, 'Fine');
  assert.equal(ep8Offer(save, '', { live: true }).show, false, 'a Fine Print run does not count (plan 10.7)');
  withGame(save, 3, {}, 'Wren');
  const o = ep8Offer(save, '', { live: true });
  assert.equal(o.show, true);
  assert.equal(o.slot, 3);
  assert.equal(o.name, 'Wren');
  assert.equal(ep8Offer(save, '', { live: false }).show, false, 'off: nothing, whatever the saves hold');
  assert.equal(ep8Offer(save, '').show, EP8_LIVE, 'the real switch decides');
});

test('the row text matches plan 5.3 and 10.5', () => {
  assert.equal(EP8_ROW_LABEL, 'Episode 8: new party');
  assert.equal(EP8_ROW_HELP, 'A ready party at Lv 31. Your own save stays under Continue.');
  assert.equal(END_CARD_EP7_LIVE.sub, 'Episode 8 begins in the morning.');
  assert.equal(END_CARD_EP7_LIVE.text, END_CARD_EP7.text);
  assert.equal(END_CARD_EP7_LIVE.backdrop, END_CARD_EP7.backdrop);
  for (const s of [EP8_ROW_LABEL, EP8_ROW_HELP, END_CARD_EP7_LIVE.sub]) assert.ok(!/[^\x20-\x7e]/.test(s) && s.length <= 60, `plain ASCII, short: ${s}`);
});

test('LQ_EP8.title adds nothing and loads no title code while there is nothing to offer', async () => {
  const scene = { name: 'title', engine: { save: fresh() }, menu: { items: [{ id: 'new' }, { id: 'continue' }] } };
  assert.equal(await HOOKS.title(scene), false);
  assert.deepEqual(scene.menu.items.map((i) => i.id), ['new', 'continue']);
});

test('hooks: credits entry 8 only with CREDITS_EP8; the Episode 7 end card stays while off; the quest goes first', async () => {
  await registerEp7();   // CREDITS_HANDOFF[7] is the ep7 pack's
  assert.ok(CREDITS_HANDOFF[7]);
  const cards = [{ heading: 'X', lines: [] }];
  const Q8 = { id: 'main_ep8', steps: [] };
  const had = QUEST_EXT.slice();
  const had8 = CREDITS_HANDOFF[8];
  const card7 = CREDITS_HANDOFF[7].endCard;
  const r = registerHooks(null, { credits: { CREDITS_EP8: cards }, quests: { MAIN_QUEST_EP8: Q8 } });
  try {
    assert.ok(r.installed.includes('credits8') && r.installed.includes('quest'));
    assert.equal(r.installed.includes('endcard7'), EP8_LIVE, 'the end card is left alone while EP8_LIVE is false');
    assert.equal(CREDITS_HANDOFF[8].flag, 'ep8_complete');
    if (!EP8_LIVE) assert.deepEqual(CREDITS_HANDOFF[7].endCard, END_CARD_EP7, 'off: unchanged');
    assert.deepEqual([CREDITS_HANDOFF[7].map, CREDITS_HANDOFF[7].mark], ['ep7_ph_watch', 'watch_cot'], 'the Episode 7 wake never moves');
    assert.deepEqual(QUEST_EXT[0], ['ep8_started', Q8], 'Episode 8 is asked before Episode 7');
    assert.equal(globalThis.LQ_EP8, HOOKS);
    registerHooks(null, { credits: { CREDITS_EP8: cards }, quests: { MAIN_QUEST_EP8: Q8 } });
    assert.equal(QUEST_EXT.filter(([f]) => f === 'ep8_started').length, 1, 'idempotent');
  } finally {
    unregister();
    if (had8) CREDITS_HANDOFF[8] = had8; else delete CREDITS_HANDOFF[8];
    QUEST_EXT.length = 0; QUEST_EXT.push(...had);
  }
  assert.equal(globalThis.LQ_EP8, undefined);
  assert.equal(CREDITS_HANDOFF[7].endCard, card7);
  // the live path (as E8-integrate's flip will run it): the end card swaps, and unregister puts it back
  const live = registerHooks(null, {}, { live: true });
  try {
    assert.ok(live.installed.includes('endcard7'));
    assert.equal(CREDITS_HANDOFF[7].endCard.sub, 'Episode 8 begins in the morning.');
    assert.equal(CREDITS_HANDOFF[7].map, 'ep7_ph_watch', 'live: the wake still does not move');
  } finally { unregister(); }
  assert.equal(CREDITS_HANDOFF[7].endCard, card7, 'unregister restores the Episode 7 end card');
  const w = registerHooks(null, {});
  try { assert.ok(w.waiting.some((x) => x.startsWith('credits8')) && w.waiting.some((x) => x.startsWith('quest'))); } finally { unregister(); }
});

test('relandPatched does nothing while EP8_LIVE is false, and only on the two patched maps', () => {
  const field = (mapId, flags) => ({ name: 'field', mapId, map: { mod: {} }, game: { flags }, leader: { tx: 1, ty: 1, dir: 'down' }, warpTo() { this.warped = true; } });
  const f = field('ep7_ph_watch', { ep7_complete: true });
  if (!EP8_LIVE) assert.equal(relandPatched({ stack: [f], scene: f }, 0), false, 'the real switch, off: never');
  assert.equal(relandPatched({ stack: [f], scene: f }, 0, false), false);
  assert.ok(!f.warped);
  const g = field('ep7_palehaven', { ep7_complete: true });
  assert.equal(relandPatched({ stack: [g], scene: g }, 0, true), false, 'not a patched map');
});

test('LQ_DEBUG.newGameEp8 picks the run\'s own slot, readies every pack, refuses when every slot is full, and never writes', async () => {
  const cmds = {};
  globalThis.window = { LQ_DEBUG: { register: (n, fn) => { cmds[n] = fn; } } };
  try {
    const save = fresh();
    withGame(save, 0);
    const resets = [];
    const merged = { music: {}, sfx: {}, ambience: {}, jingles: {} };
    const engine = { save, game: null, hasScene: () => true, reset: (n, d) => resets.push([n, d]), audio: { manifest: merged, loadPack: () => Promise.resolve() } };
    registerHooks(engine, {});
    assert.equal(typeof cmds.newGameEp8, 'function');
    const r = await cmds.newGameEp8('Ada');
    assert.deepEqual(r, { map: 'ep7_ph_watch', slot: 1 });
    assert.equal(engine.game.autosaveSlot, 1);
    assert.equal(engine.game.chapter, 8);
    assert.deepEqual(resets, [['field', { map: 'ep7_ph_watch', mark: 'watch_cot', dir: 'down' }]]);
    assert.ok(merged.ambience.sky_wind, 'the ep6 audio fragment (sky_wind, the Stair) reached this engine before the field');
    assert.ok(merged.music.palehaven, 'the ep7 audio fragment (palehaven, Act I) too');
    assert.ok(merged.packs && merged.packs.ep4 && merged.packs.ep5 && merged.packs.ep6 && merged.packs.ep7, 'the ep4 to ep7 sfx packs are declared on this engine');
    assert.equal(save.exportSlot(1), null, 'nothing written until the field autosaves');
    for (let n = 1; n <= 3; n++) withGame(save, n);
    assert.equal(await cmds.newGameEp8('Ada'), null);
  } finally { unregister(); delete globalThis.window; }
});

test('LQ_EP8.start: every pack first, then the game, then the fade; it saves only to the slot it was given', async () => {
  const save = fresh();
  withGame(save, 0);
  let faded = null;
  const resets = [];
  const engine = { save, game: null, hasScene: () => true, reset: (n, d) => resets.push([n, d]), fadeTo: (fn) => { faded = fn; return Promise.resolve(); },
    audio: { manifest: { music: {}, sfx: {}, ambience: {}, jingles: {} }, loadPack: () => Promise.resolve() } };
  await HOOKS.start(engine, '  Bea  ', 2);
  assert.equal(engine.game.heroName, 'Bea');
  assert.equal(engine.game.autosaveSlot, 2);
  assert.ok(engine.audio.manifest.music.palehaven && engine.audio.manifest.ambience.sky_wind, 'the ep6 and ep7 fragments are in before the fade');
  assert.equal(typeof faded, 'function');
  faded();
  assert.deepEqual(resets, [['field', { map: 'ep7_ph_watch', mark: 'watch_cot', dir: 'down' }]]);
  assert.equal(save.exportSlot(2), null);
  assert.ok(save.exportSlot(0), 'the other run is still there');
  assert.equal(newGameEp8('X').map, engine.game.map);
});
