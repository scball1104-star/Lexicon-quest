// C2-story-ui: the Archivist's scenes (src/data/cave/story.js). Every path of every scene through the content harness: the
// cutscene API only, input lock balance, the writing rules, the box budgets, the flags, the two guarded seams (world.js
// beginReading, the plaque screen), the return lines by lastExit, and the hall install (Hollis, the desk, the plaque, the
// lectern) on the real hand-made hall through the pack entry.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.LQ_CAVE_ON = true;
const { ensurePack } = await import('../../src/game/packs.js');
const packResult = await ensurePack('cave', { quiet: true, warm: false });
const S = await import('../../src/data/cave/story.js');
const TXT = await import('../../src/data/cave/text.js');
const W = await import('../../src/data/cave/world.js');
const { explore, runOnce, API } = await import('../content/_harness.mjs');
const { fits, boxLines, CHOICE_COLS } = await import('../../src/data/story/dialogue.js');
const { SCENES, LINES, sceneAllowed, sceneById } = await import('../../src/game/story.js');
const { FLAG_IDS } = await import('../../src/data/quests.js');
const { NPCS, talkTo, speakerName, isPresent } = await import('../../src/data/npcs.js');
const { peekMap } = await import('../../src/world/maps.js');
const B100 = (await import('../../src/data/cave/maps/cave_b100.js')).default;
const { newGameEp2 } = await import('../../src/game/state.js');
const CAVE = await import('../../src/game/cave.js');

const { rawScenes, scenes, SCENE_CONDITIONS, SCENE_MAP, BOX_BUDGET, CAVE_FLAGS, PROBE, SEAM, HALL_EVENT_IDS, VAULT_TOTAL } = S;
const IDS = ['stacks_locked', 'stacks_talk', 'stacks_intro', 'stacks_enter', 'stacks_vault', 'stacks_return', 'stacks_record', 'stacks_no_save', 'binder_intro', 'binder_cleared'];
const EM_DASH = String.fromCharCode(0x2014);
const ops = (log, op) => log.filter((e) => e.op === op);
const boxes = (log) => ops(log, 'say').length;
const texts = (log) => log.flatMap((e) => (e.op === 'say' ? [e.args[1]] : e.op === 'title' ? [e.args[0], e.args[1] && e.args[1].sub] : e.op === 'choice' ? e.args[0] : [])).filter(Boolean);

// A world that accepts every reading, so the explore runs are deterministic; the seam tests swap it.
const okWorld = () => { const calls = []; return { calls, beginReading: async (...a) => { calls.push(a); return { ok: true, seed: 1, floor: 1 }; } }; };
SEAM.world = okWorld();
PROBE.game = () => null;
PROBE.engine = () => null;

const RUNS = {};
for (const [id, fn] of Object.entries(rawScenes)) RUNS[id] = await explore(fn, { flags: [] });
const maxBoxes = (runs) => Math.max(...runs.map((r) => boxes(r.log)));

test('the pack entry registered story.js before world.js: the ten scenes are mine in the shared table, the plaques are the inspect lines', () => {
  assert.equal(packResult.ok, true, JSON.stringify(packResult));
  assert.deepEqual(Object.keys(scenes).sort(), [...IDS].sort());
  for (const id of IDS) {
    assert.ok(id in SCENE_CONDITIONS && id in SCENE_MAP && id in BOX_BUDGET, `${id}: condition, map and budget`);
    assert.equal(SCENES[id], scenes[id], `${id}: the shared table holds this file's scene, not world.js's fallback`);
  }
  for (const id of Object.keys(SCENE_CONDITIONS)) assert.ok(id in scenes, `condition for unknown scene ${id}`);
  for (const [id, text] of Object.entries(TXT.PLAQUES)) assert.equal(LINES[id], text, `${id} is the inspect line`);
  assert.ok(W.worldModules().story && W.worldModules().text, 'world.js saw both modules');
  for (const k of Object.keys(TXT.STACKS_TEXT)) assert.equal(W.textOf(k), TXT.STACKS_TEXT[k], `world.js textOf(${k}) reads text.js`);
  assert.equal(W.floorTagOf(23), 'B23');
  // the guards the field asks about before holding an arrival scene
  const flags = (set) => (f) => set.includes(f);
  assert.equal(sceneAllowed('stacks_intro', flags([])), true);
  assert.equal(sceneAllowed('stacks_intro', flags(['deep_stacks_open'])), false);
  assert.equal(sceneAllowed('stacks_enter', flags([])), false);
  assert.equal(sceneAllowed('stacks_locked', flags(['ep1_complete'])), false);
  assert.equal(sceneAllowed('binder_cleared', flags(['deep_stacks_cleared'])), true);
});

test('every scene runs on every path using only the cutscene API, and locks input in balance', async () => {
  for (const [id, fn] of Object.entries(scenes)) {
    const runs = await explore(fn, { flags: [] });
    assert.ok(runs.length >= 1, id);
    for (const r of runs) {
      assert.equal(ops(r.log, 'lockInput').length, ops(r.log, 'unlockInput').length, `${id}: lock/unlock mismatch`);
      for (const e of r.log) assert.ok(API.has(e.op.split('.')[0]), `${id}: ${e.op}`);
    }
  }
  assert.ok(RUNS.stacks_enter.length >= 4, 'the offer branches (Begin, The record, Not yet; Go down, Stay)');
  assert.ok(RUNS.stacks_talk.length >= 6, 'the desk dispatches the intro and the offer');
});

test('the writing rules: ASCII, no em dash, every box fits 3 lines of 42, choices fit, Hollis never says responsibility', () => {
  let n = 0;
  for (const id of IDS) for (const r of RUNS[id]) {
    for (const t of texts(r.log)) {
      n++;
      assert.ok(/^[ -~\n]*$/.test(t), `${id}: non-ASCII in ${t}`);
      assert.ok(!t.includes(EM_DASH), `${id}: em dash in ${t}`);
      assert.doesNotMatch(t, /responsib/i, `${id}: ${t}`);
      assert.doesNotMatch(t, /erased|forgetting spell|magic|list-writer|Eraser|First Keeper|curse/i, `${id}: explains the forgetting: ${t}`);
    }
    for (const e of r.log) {
      if (e.op === 'say') assert.ok(fits(e.args[1]), `${id}: ${boxLines(e.args[1]).join(' / ')}`);
      if (e.op === 'choice') for (const o of e.args[0]) assert.ok(o.length <= CHOICE_COLS, `${id}: choice ${o}`);
    }
  }
  assert.ok(n >= 40, `${n} strings checked`);
});

test('box budgets: each scene within its budget, the intro says the three rules in three boxes, the offer is one box and a choice', () => {
  for (const id of IDS) assert.ok(maxBoxes(RUNS[id]) <= BOX_BUDGET[id], `${id}: ${maxBoxes(RUNS[id])} boxes, budget ${BOX_BUDGET[id]}`);
  const intro = RUNS.stacks_intro.map((r) => r.log);
  for (const log of intro) {
    const said = ops(log, 'say').map((e) => e.args[1]);
    assert.deepEqual(said.slice(0, 4), [TXT.LINES.greet, TXT.LINES.rule_1, TXT.LINES.rule_2, TXT.LINES.rule_3], 'greeting, then the three rules, one each');
    assert.ok(ops(log, 'setFlag').some((e) => e.args[0] === 'deep_stacks_open'), 'the intro opens the Stacks');
    assert.equal(said[4], TXT.LINES.offer, 'then the offer');
  }
  const enter = RUNS.stacks_enter.map((r) => r.log);
  for (const log of enter) {
    assert.equal(ops(log, 'say')[0].args[1], TXT.LINES.offer);
    assert.deepEqual(ops(log, 'choice')[0].args[0], [TXT.LINES.offer_yes, TXT.LINES.offer_record, TXT.LINES.offer_no]);
  }
  for (const id of ['stacks_locked', 'stacks_no_save', 'binder_cleared']) assert.equal(maxBoxes(RUNS[id]), 1, `${id}: one box`);
});

test('every flag a scene sets, reads or guards on is declared (FLAG_IDS after register, or this module\'s own)', () => {
  const known = new Set([...FLAG_IDS, ...Object.keys(CAVE_FLAGS), 'ep1_complete']);
  for (const id of Object.keys(CAVE_FLAGS)) assert.ok(FLAG_IDS.includes(id), `${id} reached FLAG_IDS at register`);
  for (const id of IDS) for (const r of RUNS[id]) for (const e of r.log) {
    if (e.op === 'setFlag' || e.op === 'hasFlag') assert.ok(known.has(e.args[0]), `${id}: unknown flag ${e.args[0]}`);
  }
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) for (const f of [].concat(c.if || [], c.ifNot || [])) assert.ok(known.has(f), `${id}: condition flag ${f}`);
  // every speaker is Hollis or narration; every mark the Binder scenes pan to exists on B100
  for (const id of IDS) for (const r of RUNS[id]) for (const e of r.log) {
    if (e.op === 'say') assert.ok(e.args[0] === null || e.args[0] === 'hollis', `${id}: speaker ${e.args[0]}`);
    if (e.op === 'camera.panTo') assert.ok(B100.marks[e.args[0]], `${id}: B100 mark ${e.args[0]}`);
    if (e.op === 'face') assert.deepEqual(e.args, ['hollis', 'hero'], id);
  }
});

test('the seam: Begin then Go down calls world.beginReading once; a refusing world gets the refused line; no world sets only a flag', async () => {
  const w = okWorld(); SEAM.world = w;
  const yes = await runOnce(rawScenes.stacks_enter, { decisions: [0, 0], branchFlags: false });
  assert.equal(w.calls.length, 1, 'beginReading once');
  assert.deepEqual(ops(yes.log, 'say').map((e) => e.args[1]), [TXT.LINES.offer, TXT.LINES.confirm], 'the offer and the confirm, nothing after a reading begins');
  const stay = await runOnce(rawScenes.stacks_enter, { decisions: [0, 1], branchFlags: false });
  assert.equal(w.calls.length, 1, 'Stay never begins');
  assert.equal(ops(stay.log, 'say').pop().args[1], TXT.LINES.stay);
  const no = await runOnce(rawScenes.stacks_enter, { decisions: [2], branchFlags: false });
  assert.equal(boxes(no.log), 1, 'Not yet: the offer box only');
  SEAM.world = { beginReading: async () => ({ ok: false, why: 'in_run' }) };
  const refused = await runOnce(rawScenes.stacks_enter, { decisions: [0, 0], branchFlags: false });
  assert.equal(ops(refused.log, 'say').pop().args[1], TXT.LINES.refused);
  SEAM.world = null;
  const none = await runOnce(rawScenes.stacks_enter, { decisions: [0, 0], branchFlags: false });
  assert.ok(ops(none.log, 'setFlag').some((e) => e.args[0] === 'stacks_reading_requested'), 'without world.js only the flag is set');
  assert.ok(!ops(none.log, 'say').some((e) => e.args[1] === TXT.LINES.refused), 'and nobody is refused');
  SEAM.world = okWorld();
});

test('stacks_vault: one box the first time a reading starts with a vault, nothing when the vault is empty or the reminder was given', async () => {
  const g = newGameEp2('Arden');
  PROBE.game = () => g;
  let r = await runOnce(rawScenes.stacks_vault, { branchFlags: false });
  assert.equal(boxes(r.log), 0, 'an empty vault: nothing');
  CAVE.ensureCave(g).vault.push('cave_catalogue_pen');
  r = await runOnce(rawScenes.stacks_vault, { branchFlags: false });
  assert.deepEqual(ops(r.log, 'say').map((e) => e.args[1]), [TXT.LINES.vault]);
  assert.ok(ops(r.log, 'setFlag').some((e) => e.args[0] === 'stacks_vault_reminded'));
  r = await runOnce(rawScenes.stacks_vault, { flags: ['stacks_vault_reminded'], branchFlags: false });
  assert.equal(boxes(r.log), 0, 'reminded once');
  // chained from the offer before the reading begins
  const w = okWorld(); SEAM.world = w;
  r = await runOnce(rawScenes.stacks_enter, { decisions: [0, 0], branchFlags: false });
  const said = ops(r.log, 'say').map((e) => e.args[1]);
  assert.deepEqual(said, [TXT.LINES.offer, TXT.LINES.confirm, TXT.LINES.vault]);
  assert.ok(r.log.findIndex((e) => e.op === 'say' && e.args[1] === TXT.LINES.vault) < r.log.length, 'the reminder comes before beginReading');
  assert.equal(w.calls.length, 1);
  PROBE.game = () => null;
});

test('stacks_return: one or two boxes by lastExit.how (bank with names, bank with none, die with and without losses, quit, clear)', async () => {
  const run = async (lastExit) => {
    const g = newGameEp2('Arden'); CAVE.ensureCave(g).lastExit = lastExit;
    PROBE.game = () => g;
    const { log } = await runOnce(rawScenes.stacks_return, { branchFlags: false });
    return ops(log, 'say').map((e) => e.args[1]);
  };
  assert.deepEqual(await run({ how: 'bank', floor: 23, blues: ['a', 'b', 'c'], lost: [] }), ['Three names kept. The Stacks noticed.', TXT.LINES.bank_kept_2]);
  assert.deepEqual(await run({ how: 'bank', floor: 9, blues: ['a'], lost: [] }), ['One name kept. The Stacks noticed.', TXT.LINES.bank_kept_2]);
  assert.deepEqual(await run({ how: 'bank', floor: 12, blues: [], lost: [] }), ['The book is closed and nothing new is kept. B12 is written down. That is not nothing.']);
  assert.deepEqual(await run({ how: 'die', floor: 31, blues: [], lost: ['a'] }), [TXT.LINES.die, TXT.LINES.die_lost]);
  assert.deepEqual(await run({ how: 'die', floor: 4, blues: [], lost: [] }), [TXT.LINES.die, 'They took back what they lent. Nothing of yours went with it. B4 is written down.']);
  assert.deepEqual(await run({ how: 'quit', floor: 2, blues: [], lost: [] }), [TXT.LINES.quit, TXT.LINES.quit_2]);
  assert.deepEqual(await run({ how: 'clear', floor: 100, blues: ['cave_binders_quill'], lost: [] }), [TXT.LINES.clear, TXT.LINES.clear_2]);
  PROBE.game = () => null;
  assert.equal((await runOnce(rawScenes.stacks_return, { branchFlags: false })).log.filter((e) => e.op === 'say').length, 1, 'no lastExit: the bank line, never a crash');
});

test('stacks_record: the record line by the record, then the plaque screen through the engine seam (a fake engine)', async () => {
  const pushed = [];
  const scenesReg = new Map();
  const engine = { pushAwait: async (name, data) => { pushed.push([name, data]); }, registerScene: (n, c) => scenesReg.set(n, c), hasScene: (n) => scenesReg.has(n), game: null };
  PROBE.engine = () => engine;
  PROBE.game = () => null;
  let r = await runOnce(rawScenes.stacks_record, { branchFlags: false });
  assert.deepEqual(ops(r.log, 'say').map((e) => e.args[1]), [TXT.LINES.record_none]);
  assert.equal(pushed.length, 0, 'no game: no screen');
  const g = newGameEp2('Arden'); engine.game = g;
  CAVE.ensureCave(g).record.floor = 23;
  PROBE.game = () => g;
  r = await runOnce(rawScenes.stacks_record, { branchFlags: false });
  assert.deepEqual(ops(r.log, 'say').map((e) => e.args[1]), ['B23 is the deepest page anyone has read. The vault is empty. The blue chests are waiting.']);
  assert.equal(pushed.length, 1); assert.equal(pushed[0][0], 'stacks');
  assert.ok(scenesReg.has('stacks'), 'the screen scene was registered on first use');
  g.cave.vault.push('cave_catalogue_pen', 'cave_reading_hood', 'cave_cellar_key', 'cave_root_boots');
  r = await runOnce(rawScenes.stacks_record, { branchFlags: false });
  assert.deepEqual(ops(r.log, 'say').map((e) => e.args[1]), [`B23 is the deepest page anyone has read. 4 of ${VAULT_TOTAL} names in the vault. The rest are waiting.`]);
  const data = pushed[1][1];
  assert.equal(data.rows.length, VAULT_TOTAL); assert.equal(data.total, 61);   // C4-uniques: sixty in three grades and the Quill
  assert.deepEqual(data.rows.filter((x) => x.held).map((x) => x.id), ['cave_catalogue_pen', 'cave_reading_hood', 'cave_cellar_key', 'cave_root_boots']);
  assert.equal(data.rows[60].id, 'cave_binders_quill', 'the Quill is last');
  assert.deepEqual(data.record, { floor: 23, readings: 0, clears: 0, time: 0 });
  // "The record" in the offer opens the same screen
  r = await runOnce(rawScenes.stacks_enter, { decisions: [1], branchFlags: false });
  assert.equal(pushed.length, 3);
  PROBE.engine = () => null; PROBE.game = () => null;
});

test('binder_intro: the card names what was avoided (H5 style) over one box; the retry teaches fire and light; binder_cleared is one line', () => {
  for (const r of RUNS.binder_intro) {
    const card = ops(r.log, 'title')[0];
    assert.equal(card.args[0], TXT.LINES.binder_card);
    assert.match(card.args[1].sub, /Nobody /, 'what was avoided, not what the boss is');
    assert.equal(boxes(r.log), 1);
    const met = r.log.find((e) => e.op === 'hasFlag' && e.args[0] === 'binder_met');
    const said = ops(r.log, 'say')[0].args[1];
    assert.equal(said, met && met.args[1] ? TXT.LINES.binder_retry : TXT.LINES.binder_intro);
    assert.ok(ops(r.log, 'setFlag').some((e) => e.args[0] === 'binder_met'));
  }
  assert.match(TXT.LINES.binder_retry, /Fire and light/);
  assert.deepEqual(RUNS.binder_cleared.map((r) => ops(r.log, 'say').map((e) => e.args[1])), [[TXT.LINES.binder_cleared]]);
  assert.equal(sceneById('cave_binder') != null, true, 'world.js keeps the fight scene the B100 trigger names');
});

test('install: the real hall carries Hollis at archivist, the desk trigger over the long table, the plaque sign and the lectern trigger; idempotent', () => {
  const hall = peekMap('cave_landing0');
  assert.ok(hall && !hall.fallback, 'the hand-made hall is registered');
  const by = Object.fromEntries(hall.events.filter((e) => HALL_EVENT_IDS.includes(e.id)).map((e) => [e.id, e]));
  assert.deepEqual([by.hollis.type, by.hollis.x, by.hollis.y, by.hollis.dir], ['npc', ...hall.marks.archivist, 'down']);
  assert.deepEqual([by.stacks_desk.type, by.stacks_desk.x, by.stacks_desk.y, by.stacks_desk.w, by.stacks_desk.h, by.stacks_desk.script, by.stacks_desk.on],
    ['trigger', hall.marks.archivist[0] - 1, hall.marks.archivist[1] + 1, 3, 1, 'stacks_talk', 'interact']);
  assert.deepEqual([by.plaque.type, by.plaque.x, by.plaque.y, by.plaque.text], ['sign', hall.marks.plaque[0], hall.marks.plaque[1] - 1, 'plaque_hall']);
  assert.deepEqual([by.stacks_lectern.type, by.stacks_lectern.x, by.stacks_lectern.y, by.stacks_lectern.script], ['trigger', hall.marks.record[0], hall.marks.record[1] - 1, 'stacks_record']);
  assert.equal(hall.marks.party_stop[1], hall.marks.archivist[1] + 2, 'the party talks across the desk row');
  assert.deepEqual(S.install(hall), [], 'a second install adds nothing');
  assert.equal(hall.events.filter((e) => e.id === 'hollis').length, 1);
  assert.ok(!hall.events.some((e) => e.id === 'archivist_fallback'), 'world.js kept its fallback dispatcher off');
  assert.deepEqual(S.install({ marks: {}, events: [] }), []);
  // the NPC record: the talk entries, the name, always present
  assert.equal(NPCS.hollis, TXT.HOLLIS);
  assert.equal(speakerName('hollis'), 'Hollis');
  assert.equal(isPresent('hollis', () => false), true);
  assert.deepEqual(talkTo('hollis', () => false), { scene: 'stacks_intro' });
  assert.deepEqual(talkTo('hollis', (f) => f === 'deep_stacks_open'), { scene: 'stacks_enter' });
  assert.equal(TXT.HOLLIS.sprite, 'npc_scholar');
});
