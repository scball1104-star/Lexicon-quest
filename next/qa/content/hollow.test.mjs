// W6-content: Whisperwood Hollow, the optional side dungeon. Scenes and flags, the Lost Bridge side quest, the
// post-clear lines, the Briar Alpha (data and its two phase changes), the Thornwake unique and its loot rule, and
// the simulator targets for the zone. Map validity and reachability live in qa/maps/maps.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scenes, lines, SCENE_CONDITIONS } from '../../src/data/story/ep1.js';
import { FLAGS, SIDE_QUESTS, journal } from '../../src/data/quests.js';
import { talkTo } from '../../src/data/npcs.js';
import { ITEMS, UNIQUES, EQUIPMENT } from '../../src/data/items.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ENCOUNTERS, ZONES, ZONE_ORDER, OPTIONAL_ZONES } from '../../src/data/encounters.js';
import { BOSS_LOOT, ZONE_LOOT } from '../../src/data/loot-tables.js';
import { resolve } from '../../src/data/story/dialogue.js';
import { playthrough, runOnce } from './_harness.mjs';
import { runSuite, checkTargets, runBattle, LOADOUTS, TARGETS } from '../../tools/sim/simulate.mjs';

const ops = (log, op) => log.filter((e) => e.op === op);
const has = (list) => (f) => list.includes(f);
const SCENES = ['quill_hint', 'hollow_entry', 'hollow_alpha', 'hollow_after'];
const HOLLOW_FLAGS = ['lost_bridge_started', 'hollow_found', 'briar_alpha_defeated', 'hollow_cleared'];
const PARTY = ['mira_joined', 'bram_joined'];

test('hollow scenes and flags exist, are guarded, and the boss encounter sets the defeat flag', () => {
  for (const id of SCENES) {
    assert.equal(typeof scenes[id], 'function', id);
    assert.ok(SCENE_CONDITIONS[id], `${id} needs a guard`);
  }
  for (const f of HOLLOW_FLAGS) assert.ok(FLAGS[f], `flag ${f}`);
  assert.equal(ENCOUNTERS.whisperwood_alpha.flag, 'briar_alpha_defeated');
});

test('the Lost Bridge plays start to finish once: hint, entry, the Alpha, the stone', async () => {
  const { set, logs } = await playthrough(scenes, ['quill_hint', 'hollow_entry', 'hollow_alpha',
    'quill_hint', 'hollow_entry', 'hollow_alpha', 'hollow_after'], { flags: [...PARTY, 'lantern_get'] });
  for (const f of HOLLOW_FLAGS) assert.ok(set.has(f), `missing ${f}`);
  const says = (id, i) => ops(logs[id][i], 'say').length;
  assert.ok(says('quill_hint', 0) >= 3);
  assert.equal(says('hollow_entry', 0), 2, 'the entry is two boxes');
  for (const id of ['quill_hint', 'hollow_entry', 'hollow_alpha']) assert.equal(says(id, 1), 0, `${id} replays`);
  assert.equal(says('hollow_after', 0), 0, 'the stone plays once');
  const battle = ops(logs.hollow_alpha[0], 'battle')[0];
  assert.deepEqual(battle.args.slice(0, 2), ['whisperwood_alpha', { boss: true, canFlee: false }]);
  // hollow_after: the Alpha leaves, the camera finds the stone, the three names, Mira's note, then the flag
  const all = logs.hollow_alpha[0];
  assert.ok(ops(all, 'despawn').some((e) => e.args[0] === 'whisperwood_alpha'));
  assert.ok(ops(all, 'camera.panTo').some((e) => e.args[0] === 'plaque'));
  const text = ops(all, 'say').map((e) => e.args[1]).join(' ');
  assert.match(text, /Sorrel\. Ansel\. Wren\./);
  assert.match(text, /The Archive isn't the only place names are kept/);
  const sets = ops(all, 'setFlag').map((e) => e.args[0]);
  assert.equal(sets[sets.length - 1], 'hollow_cleared');
});

test('hollow_entry without the Lantern: two boxes, the quest starts, the bridge stays unfound', async () => {
  const { log } = await runOnce(scenes.hollow_entry, { flags: PARTY, branchFlags: false });
  assert.equal(ops(log, 'say').length, 2);
  assert.deepEqual(ops(log, 'setFlag').map((e) => e.args[0]), ['lost_bridge_started']);
  const lit = await runOnce(scenes.hollow_entry, { flags: [...PARTY, 'lantern_get', 'lost_bridge_started'], branchFlags: false });
  assert.ok(ops(lit.log, 'say').some((e) => /Raise the Lantern with \{i:btn_pageR\}/.test(e.args[1])), 'names the button');
  assert.deepEqual(ops(lit.log, 'camera.panTo')[0].args, ['bridge_far', 30]);
  assert.deepEqual(ops(lit.log, 'setFlag').map((e) => e.args[0]), ['hollow_found']);
});

test('hollow_alpha is a W5 boss intro: silence, pan 40, dialogue, BRIAR ALPHA card, shake, flash, theme, battle', async () => {
  const { log } = await runOnce(scenes.hollow_alpha, { flags: [...PARTY, 'lantern_get', 'hollow_found'], branchFlags: false });
  const order = log.map((e) => e.op);
  assert.equal(log[order.indexOf('music')].args[0], null, 'silence first');
  assert.deepEqual(ops(log, 'camera.panTo')[0].args, ['whisperwood_alpha', 40]);
  const title = ops(log, 'title')[0];
  assert.deepEqual(title.args, ['BRIAR ALPHA', { sub: 'Warden of the Lost Bridge', frames: 100 }]);
  const ti = log.indexOf(title), bi = order.indexOf('battle');
  assert.ok(ops(log.slice(0, ti), 'say').length >= 5);
  const between = log.slice(ti, bi);
  assert.ok(ops(between, 'shake').length && ops(between, 'flash').length);
  assert.equal(ops(between, 'say').length, 0);
  assert.equal(ops(between, 'music')[0].args[0], 'battle');
  // a quit after the win but before the stone: the trigger runs the stone instead of the fight
  const again = await runOnce(scenes.hollow_alpha, { flags: [...PARTY, 'briar_alpha_defeated'], branchFlags: false });
  assert.equal(ops(again.log, 'battle').length, 0);
  assert.ok(ops(again.log, 'setFlag').some((e) => e.args[0] === 'hollow_cleared'));
});

test('journal side quest "The Lost Bridge" runs from Quill\'s hint to the clear', () => {
  const q = SIDE_QUESTS.find((x) => x.id === 'lost_bridge');
  assert.ok(q);
  assert.deepEqual([q.title, q.giver, q.start, q.done, q.reward],
    ['The Lost Bridge', 'quill', 'lost_bridge_started', 'hollow_cleared', 'thornwake']);
  const entry = (flags) => journal(has(flags)).side.find((x) => x.id === 'lost_bridge');
  assert.equal(entry([]), undefined, 'not in the journal before the hint');
  const texts = [];
  for (const flags of [['lost_bridge_started'], ['lost_bridge_started', 'hollow_found'],
    ['lost_bridge_started', 'hollow_found', 'briar_alpha_defeated']]) {
    const e = entry(flags);
    assert.equal(e.done, false);
    texts.push(e.text);
  }
  assert.equal(new Set(texts).size, 3, 'each step has its own journal line');
  assert.match(texts[0], /Quill/);
  assert.equal(entry(['lost_bridge_started', 'hollow_found', 'briar_alpha_defeated', 'hollow_cleared']).done, true);
});

test('post-clear lines: Quill, the Pilgrim\'s Rest bench and the stone remember the three names', () => {
  const after = ['bram_joined', 'lost_bridge_started', 'hollow_cleared'];
  const join = (boxes) => boxes.map((b) => b.text).join(' ');
  assert.match(join(talkTo('quill', has(after)).lines), /Sorrel, Ansel, Wren/);
  assert.match(join(resolve(lines.pilgrim_bench, has(after))), /SORREL\. ANSEL\. WREN\./);
  assert.doesNotMatch(join(resolve(lines.pilgrim_bench, has([]))), /SORREL/);
  assert.match(join(resolve(lines.lost_bridge_plaque, has(after))), /SORREL\. ANSEL\. WREN\./);
  assert.doesNotMatch(join(resolve(lines.lost_bridge_plaque, has([]))), /SORREL/);
});

test('Briar Alpha: a large briar wolf with its own frame, two phase changes, weak to fire and axe, shields 3', () => {
  const a = ENEMIES.briar_alpha;
  assert.equal(a.name, 'Briar Alpha');
  assert.ok(a.boss && a.size === 'large');
  assert.equal(a.ai, 'phased');
  assert.equal(a.shields, 3);
  assert.deepEqual([...a.weak].sort(), ['axe', 'fire']);
  assert.deepEqual([a.sprite.frame, a.sprite.scale || 1, a.sprite.tint || null], ['briar_alpha', 1, null], 'its own 1x frame, no scale or tint (W8-art)');
  const [p0, p1, p2] = a.phases;
  assert.equal(p0.at, 1);
  assert.equal(p1.at, 0.5); assert.ok(ENEMIES[p1.summon], 'calls one wolf at 50%');
  assert.equal(p2.at, 0.25); assert.equal(p2.haste, true, 'Haste at 25%');
  const enc = ENCOUNTERS.whisperwood_alpha;
  assert.ok(enc.boss && enc.noFlee && enc.noElite);
  assert.deepEqual(enc.enemies, ['briar_alpha']);
  assert.equal(enc.zone, 'whisperwood_hollow');
  assert.ok(ZONES.whisperwood_hollow.optional && OPTIONAL_ZONES.includes('whisperwood_hollow'));
  assert.ok(!ZONE_ORDER.includes('whisperwood_hollow'), 'the EXP curve never counts on the side dungeon');
});

test('Briar Alpha phases fire in a real battle: Pack Call summons a wolf, Thorn Rage hastes it', () => {
  let checked = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const r = runBattle({ zone: 'whisperwood_hollow', level: 7, encounter: 'whisperwood_alpha', seed, policy: 'competent', trace: true });
    if (!r.win) continue;
    const phases = r.log.filter((e) => e.type === 'phase').map((e) => e.id);
    assert.deepEqual(phases, ['pack_call', 'thornrage'], `seed ${seed}: both phases, in order, none skipped`);
    const i1 = r.log.findIndex((e) => e.type === 'phase' && e.id === 'pack_call');
    assert.equal(r.log.slice(i1).find((e) => e.type === 'summon').id, 'thornback_wolf');
    const i2 = r.log.findIndex((e) => e.type === 'phase' && e.id === 'thornrage');
    assert.ok(r.log.slice(i2).some((e) => e.type === 'status_add' && e.status === 'haste' && e.target === 'e0'));
    checked++;
  }
  assert.ok(checked >= 6);
});

test('Thornwake: the one Thornwake, a rare-tier axe with poison on hit, the Alpha\'s guaranteed drop', () => {
  const t = UNIQUES.thornwake;
  assert.ok(t && ITEMS.thornwake && ITEMS.thornwake.name === t.name);
  assert.deepEqual([t.name, t.rarity, t.slot, t.type], ['Thornwake', 'legendary', 'weapon', 'axe']);
  assert.ok(t.stats.poisonOnHit > 0, 'bleed-style poison on hit');
  assert.ok(t.stats.atk > EQUIPMENT.battle_axe.stats.atk && t.stats.atk < EQUIPMENT.bearded_axe.stats.atk, 'rare-tier numbers');
  assert.ok(t.stats.atk < UNIQUES.lanternheart.stats.atk, 'Lanternheart stays the prize');
  assert.equal(Object.values(ITEMS).filter((i) => i.name === 'Thornwake').length, 1, 'exactly one Thornwake');
  assert.equal(ENEMIES.briar_alpha.uniqueDrop, 'thornwake');
  assert.deepEqual([BOSS_LOOT.briar_alpha.unique, BOSS_LOOT.briar_alpha.table], ['thornwake', 'boss']);
  assert.ok(ZONE_LOOT.whisperwood_hollow);
  // the Whisperwood pool chest keeps its own legendary spear under a new name
  assert.equal(UNIQUES.pilgrim_reach.type, 'spear');
});

test('simulator: the whisperwood zone row meets its targets at Lv 6 and 7', () => {
  assert.ok(LOADOUTS.whisperwood_hollow && TARGETS.whisperwood_alpha);
  const rows = runSuite({ n: 60, zones: ['whisperwood_hollow'], elites: false });
  assert.deepEqual(checkTargets(rows, []), []);
  for (const lv of [6, 7]) {
    const c = rows.find((r) => r.encounter === 'whisperwood_alpha' && r.level === lv && r.policy === 'competent');
    const n = rows.find((r) => r.encounter === 'whisperwood_alpha' && r.level === lv && r.policy === 'naive');
    assert.ok(c.rounds >= 6 && c.rounds <= 9, `Lv ${lv}: competent ${c.rounds} rounds`);
    assert.ok(n.win <= 0.6 && n.win < c.win, `Lv ${lv}: naive wins ${n.win}`);
  }
});

// ------------------------------------------------------------------------------------------------ W10
test('W10: after the Lantern, the pool is pointed at once in lantern_get, once in the valley, and in Talk', async () => {
  const { partyChat } = await import('../../src/data/quests.js');
  const say = (log) => ops(log, 'say').map((e) => `${e.args[0]}: ${e.args[1]}`).join(' | ');
  // lantern_get: Bram names the pool only when Quill has told them about it
  const told = await runOnce(scenes.lantern_get, { flags: [...PARTY, 'echo_warden_defeated', 'lost_bridge_started'] });
  assert.match(say(told.log), /bram: A lamp that finds things\. Quill's lost bridge/);
  const untold = await runOnce(scenes.lantern_get, { flags: [...PARTY, 'echo_warden_defeated'] });
  assert.doesNotMatch(say(untold.log), /Quill/);
  // the valley reminder: one box, once, and never before the Lantern or after the hollow is found
  const r1 = await runOnce(scenes.quill_reminder, { flags: [...PARTY, 'lantern_get', 'lost_bridge_started'] });
  assert.equal(ops(r1.log, 'say').length, 1);
  assert.match(say(r1.log), /black pool, east of the fork/);
  const r2 = await runOnce(scenes.quill_reminder, { flags: [...PARTY, 'lantern_get'] });
  assert.match(say(r2.log), /scribe at the Pilgrim's Rest/);
  for (const flags of [[...PARTY], [...PARTY, 'lantern_get', 'hollow_found'], [...PARTY, 'lantern_get', 'quill_reminded']]) {
    const r = await runOnce(scenes.quill_reminder, { flags });
    assert.equal(ops(r.log, 'say').length, 0, `quiet with ${flags.join(',')}`);
  }
  assert.ok(FLAGS.quill_reminded);
  // Talk: the lost bridge nudge wins the one side slot over Tess's letters
  const flags = [...PARTY, 'met_mael', 'left_town', 'archive_entered', 'archive_f1_done', 'echo_warden_defeated', 'lantern_get',
    'lost_bridge_started', 'tess_quest_started'];
  const chat = partyChat(has(flags), 'archive_f2');
  assert.equal(chat.side.length, 1);
  assert.equal(chat.side[0].who, 'bram');
  assert.match(chat.side[0].text, /Quill's pool, east of the fork/);
});

test('W10: hollow_alpha picks the Alpha tier from story progress and stages the briar_alpha sprite', async () => {
  const base = [...PARTY, 'lantern_get', 'lost_bridge_started', 'hollow_found'];
  const pick = async (extra) => ops((await runOnce(scenes.hollow_alpha, { flags: [...base, ...extra] })).log, 'battle')[0].args[0];
  assert.equal(await pick([]), 'whisperwood_alpha');
  assert.equal(await pick(['boss_door_open']), 'whisperwood_alpha_t1');
  assert.equal(await pick(['boss_door_open', 'archivore_defeated']), 'whisperwood_alpha_t2');
  for (const id of ['whisperwood_alpha_t1', 'whisperwood_alpha_t2']) {
    const e = ENCOUNTERS[id];
    assert.deepEqual([e.flag, e.boss, e.noFlee, e.enemies.join(), e.zone], ['briar_alpha_defeated', true, true, 'briar_alpha', 'whisperwood_hollow']);
    assert.ok(e.elite && e.elite.mods.every((m) => m.startsWith('elder')), `${id} is an Elder`);
  }
  const elder = await runOnce(scenes.hollow_alpha, { flags: [...base, 'archivore_defeated'] });
  assert.ok(ops(elder.log, 'say').some((e) => /muzzle is grey/.test(e.args[1])), 'the late Alpha is described as older');
});
