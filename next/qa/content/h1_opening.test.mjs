// H1 (docs/briefs/H1-opening.md, deliverable 7): the first five minutes of a New Game.
// The cold open "The Thirteenth Toll" (toll_1..toll_12, thirteenth_toll on map bell_tower), the shortened wake-up,
// the remembered Oren choice, the yard slime fight, and the rules every new box obeys. Pure: node only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, SCENE_CONDITIONS, PROLOGUE, ATTRACT, TOLL_NAMES, TOLL_FLAGS, TOLL_HOLD, THIRTEENTH_SILENCE, COLD_OPEN_LINE,
  H1_FLAGS } from '../../src/data/story/ep1.js';
import { FLAGS } from '../../src/data/quests.js';
import { NPCS } from '../../src/data/npcs.js';
import { PARTY, newMember } from '../../src/data/party.js';
import { ENCOUNTERS, rollEncounter } from '../../src/data/encounters.js';
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { createGame, newGameEp2, COLD_OPEN_START, START_MAP } from '../../src/game/state.js';
import { coldOpenWanted, coldOpenEntry, latestToll, tollCaption, captionAlpha } from '../../src/scenes/prologue.js';
import BELL_TOWER, { TOLL_STEPS, TOP_STEP } from '../../src/data/maps/bell_tower.js';
import WILLOWMERE from '../../src/data/maps/willowmere.js';
import { fits, boxLines, CHOICE_COLS } from '../../src/data/story/dialogue.js';
import { playthrough, runOnce, NEXT } from './_harness.mjs';
import { loadDb, loadAll, validate, walk, buildGrid, loadStaging } from '../../tools/maps/mapcheck.mjs';

const ops = (log, op) => log.filter((e) => e.op === op);
const CLIMB = [...TOLL_FLAGS, 'thirteenth_toll'];
const EM_DASH = String.fromCharCode(0x2014);   // never written literally: rules.test.mjs scans this folder for it

// ------------------------------------------------------------------------------------------------ the flow
test('a New Game sets cold_open_done on the thirteenth toll, then intro_done at home, in that order', async () => {
  const { set, logs } = await playthrough(scenes, [...CLIMB, 'wake_up']);
  assert.ok(set.has('cold_open_done') && set.has('intro_done'));
  const order = [];
  for (const id of [...CLIMB, 'wake_up']) for (const e of logs[id][0]) if (e.op === 'setFlag') order.push(e.args[0]);
  assert.deepEqual(order, [...TOLL_FLAGS, 'cold_open_done', 'intro_done']);
  // each toll scene: one bell, no box, no card, no press of any kind
  for (const f of TOLL_FLAGS) {
    const log = logs[f][0];
    assert.deepEqual(ops(log, 'sfx').map((e) => e.args[0]), ['bell_toll'], `${f}: one toll`);
    assert.equal(ops(log, 'say').length + ops(log, 'title').length + ops(log, 'choice').length, 0, `${f}: no box, no card`);
    assert.ok(ops(log, 'wait').some((e) => e.args[0] === TOLL_HOLD), `${f}: holds the hero for TOLL_HOLD`);
  }
  // the mystery bed enters on the sixth toll and nowhere else on the stair
  for (const f of TOLL_FLAGS) assert.deepEqual(ops(logs[f][0], 'music').map((e) => e.args[0]), f === 'toll_6' ? ['mystery'] : [], f);
});

test('the twelve names, in the brief\'s order, each an existing character of the cast', () => {
  assert.deepEqual(TOLL_NAMES, ['Hazel', 'Mael', 'Oren', 'Pip', 'Tess', 'Iris', 'Holt', 'Garrick', 'Nella', 'Wick', 'Edda', 'Bram']);
  const cast = new Set([...Object.values(NPCS).map((n) => n.name), ...Object.values(PARTY).map((p) => p.name)]);
  const inCast = (name) => [...cast].some((n) => n === name || n.split(' ').includes(name));
  for (const name of TOLL_NAMES) assert.ok(inCast(name), `${name} is not in the cast`);
  assert.equal(new Set(TOLL_NAMES).size, 12);
  for (let n = 1; n <= 12; n++) assert.equal(tollCaption(n).replace(/ /g, ''), TOLL_NAMES[n - 1].toUpperCase());
});

test('each step tolls once and only in order: a skipped step is silent, a repeat is silent', async () => {
  const skip = await playthrough(scenes, ['toll_3']);                       // toll_2 never rang
  assert.equal(ops(skip.logs.toll_3[0], 'sfx').length, 0);
  assert.ok(!skip.set.has('toll_3'));
  const twice = await playthrough(scenes, ['toll_1', 'toll_1', 'toll_2', 'toll_1']);
  assert.equal(twice.logs.toll_1.flat().filter((e) => e.op === 'sfx').length, 1, 'the first step rings once');
  assert.ok(twice.set.has('toll_2'));
  const early = await playthrough(scenes, ['thirteenth_toll']);
  assert.equal(early.logs.thirteenth_toll[0].filter((e) => e.op !== 'hasFlag').length, 0, 'the top does nothing before the twelfth toll');
  for (let i = 0; i < TOLL_FLAGS.length; i++) {
    const c = SCENE_CONDITIONS[TOLL_FLAGS[i]];
    assert.deepEqual(c, i === 0 ? { ifNot: 'toll_1' } : { if: TOLL_FLAGS[i - 1], ifNot: TOLL_FLAGS[i] });
  }
  assert.deepEqual(SCENE_CONDITIONS.thirteenth_toll, { if: 'toll_12', ifNot: 'cold_open_done' });
});

test('the thirteenth toll: the alarm bell, no name, the hero\'s "!", 90 to 120 frames of silence, black, one card', async () => {
  const { log } = await runOnce(scenes.thirteenth_toll, { flags: TOLL_FLAGS, branchFlags: false });
  const names = log.map((e) => e.op);
  const bell = log.findIndex((e) => e.op === 'sfx' && e.args[0] === 'bell_first');
  assert.ok(bell >= 0, 'bell_first rings');
  assert.equal(log[names.indexOf('music')].args[0], null, 'silence before the alarm bell');
  const fade = log.findIndex((e) => e.op === 'fade' && e.args[0] === 'out');
  assert.ok(fade > bell, 'fades to black after the toll');
  const between = log.slice(bell, fade);
  assert.equal(ops(between, 'say').length + ops(between, 'title').length, 0, 'no name, no box between the toll and the black');
  assert.ok(between.some((e) => e.op === 'emote' && e.args[0] === 'hero' && e.args[1] === '!'));
  assert.ok(between.some((e) => e.op === 'camera.panTo' && e.args[0] === 'bells'));
  const silence = between.filter((e) => e.op === 'wait').reduce((s, e) => s + e.args[0], 0) + between.filter((e) => e.op === 'camera.panTo').reduce((s, e) => s + (e.args[1] || 0), 0);
  assert.ok(silence >= 90 && silence <= 120, `silence ${silence} frames`);
  const cards = ops(log.slice(fade), 'title');
  assert.equal(cards.length, 1, 'one card at most after the black');
  assert.equal(cards[0].args[0], PROLOGUE[0]);
  assert.equal(PROLOGUE.length, 1, 'the six-card prologue is gone');
  assert.ok(log.at(-2).op === 'setFlag' && log.at(-2).args[0] === 'cold_open_done', 'cold_open_done is the last thing it does');
});

test('captions need no press: drawn by the overlay for the hold, the opening line is under 42 characters', () => {
  assert.ok(COLD_OPEN_LINE.length < 42 && !COLD_OPEN_LINE.includes(EM_DASH));
  assert.equal(latestToll({}), 0);
  assert.equal(latestToll({ toll_1: true, toll_2: true, toll_3: true }), 3);
  assert.equal(latestToll({ toll_12: true }), 12);
  assert.equal(captionAlpha(-1, TOLL_HOLD), null, 'not yet');
  assert.ok(captionAlpha(0, TOLL_HOLD) === 0 && captionAlpha(TOLL_HOLD / 2, TOLL_HOLD) === 1, 'fades in to full');
  assert.ok(captionAlpha(TOLL_HOLD - 1, TOLL_HOLD) > 0 && captionAlpha(TOLL_HOLD - 1, TOLL_HOLD) < 0.2, 'nearly gone as control returns');
  assert.equal(captionAlpha(TOLL_HOLD, TOLL_HOLD), null, 'gone when the hold ends');
  assert.ok(THIRTEENTH_SILENCE >= 30);
});

// ------------------------------------------------------------------------------------------------ who sees it
test('a save with intro_done never runs the cold open, and newGameEp2 never does; a fresh game always does', () => {
  const fresh = createGame('Arden');
  assert.ok(coldOpenWanted(fresh));
  assert.deepEqual(coldOpenEntry(fresh), { map: 'bell_tower', mark: 'stair_foot', dir: 'up' });
  assert.deepEqual(coldOpenEntry(fresh), { map: COLD_OPEN_START.map, mark: COLD_OPEN_START.mark, dir: COLD_OPEN_START.dir });
  const old = createGame('Arden'); old.flags.intro_done = true;
  assert.ok(!coldOpenWanted(old));
  assert.equal(coldOpenEntry(old).map, START_MAP);
  const climbed = createGame('Arden'); climbed.flags.cold_open_done = true;
  assert.ok(!coldOpenWanted(climbed));
  const ep2 = newGameEp2('Arden');
  assert.ok(!coldOpenWanted(ep2) && ep2.flags.intro_done, 'the Episode 2 start holds intro_done and goes to bed');
  assert.equal(coldOpenEntry(ep2).map, 'hero_home');
  assert.ok(!coldOpenWanted(null));
  // the map itself has no way in or out: only the hand-off reaches it
  assert.deepEqual(BELL_TOWER.exits, []);
  assert.equal(BELL_TOWER.events.filter((e) => e.type === 'door').length, 0);
  // wake_up still guards itself on intro_done, so an old save in bed is untouched
  assert.deepEqual(SCENE_CONDITIONS.wake_up, { ifNot: 'intro_done' });
});

test('the H1 flags are declared in FLAGS with a meaning', () => {
  for (const [f, d] of Object.entries(H1_FLAGS)) {
    assert.ok(f in FLAGS, f);
    assert.ok(/^[a-z][a-z0-9_]*$/.test(f) && typeof d === 'string' && d.length > 5, f);
  }
  for (const f of ['cold_open_done', 'yard_fight_done', 'oren_truth', 'oren_lie', ...TOLL_FLAGS]) assert.ok(f in H1_FLAGS, f);
});

// ------------------------------------------------------------------------------------------------ wake up, the choice
test('wake_up: at most four boxes plus the one choice, the potions, intro_done; the bell line confirms, not reports', async () => {
  for (const pick of [0, 1]) {
    const { log } = await runOnce(scenes.wake_up, { decisions: [pick], branchFlags: false });
    const says = ops(log, 'say');
    assert.ok(says.length <= 4, `choice ${pick}: ${says.length} boxes`);
    assert.equal(ops(log, 'choice').length, 1);
    assert.ok(says.every((e) => e.args[0] === 'hazel'));
    assert.match(says[1].args[1], /You heard them too/);
    assert.match(says[1].args[1], /thirteen/);
    assert.deepEqual(ops(log, 'give')[0].args, ['potion', 2]);
    assert.ok(log.some((e) => e.op === 'setFlag' && e.args[0] === 'intro_done'));
  }
});

test('fading_sign remembers the answer: the truth sets oren_truth, the kind lie sets oren_lie', async () => {
  const truth = await runOnce(scenes.fading_sign, { flags: ['intro_done'], decisions: [0], branchFlags: false });
  const lie = await runOnce(scenes.fading_sign, { flags: ['intro_done'], decisions: [1], branchFlags: false });
  const flagsOf = (log) => ops(log, 'setFlag').map((e) => e.args[0]);
  assert.ok(flagsOf(truth.log).includes('oren_truth') && !flagsOf(truth.log).includes('oren_lie'));
  assert.ok(flagsOf(lie.log).includes('oren_lie') && !flagsOf(lie.log).includes('oren_truth'));
  assert.ok(flagsOf(truth.log).includes('saw_fading_sign') && flagsOf(lie.log).includes('saw_fading_sign'), 'the main route is unchanged either way');
  assert.deepEqual(ops(truth.log, 'choice')[0].args[0], ["Oren's Ovens.", "I can't remember either."]);
});

test('exactly one later Oren line differs by the choice (the starter quest\'s end); the rest is unchanged', async () => {
  const base = ['starter_quest_started', 'starter_found'];
  const texts = async (extra) => {
    const { log } = await runOnce(scenes.oren_starter, { flags: [...base, ...extra], branchFlags: false });
    return ops(log, 'say').map((e) => e.args[1]);
  };
  const none = await texts([]), truth = await texts(['oren_truth']), lie = await texts(['oren_lie']);
  assert.equal(truth.length, none.length + 1);
  assert.equal(lie.length, none.length + 1);
  const only = (a) => a.filter((t) => !none.includes(t));
  assert.equal(only(truth).length, 1);
  assert.equal(only(lie).length, 1);
  assert.notEqual(only(truth)[0], only(lie)[0]);
  assert.match(only(truth)[0], /my name/);
  assert.match(only(lie)[0], /forgotten too/);
  assert.deepEqual(truth.filter((t) => none.includes(t)), none, 'every other box is the same, in the same order');
});

// ------------------------------------------------------------------------------------------------ the yard slime
test('yard_slime: after the sign, one ink_slime, no flee, the hero alone; a win pays one Oren line and the flag', async () => {
  const enc = ENCOUNTERS.yard_slime;
  assert.deepEqual(enc.enemies, ['ink_slime']);
  assert.ok(enc.noFlee && enc.noElite);
  assert.deepEqual(SCENE_CONDITIONS.yard_slime, { if: 'saw_fading_sign', ifNot: 'yard_fight_done' });
  const win = await runOnce(scenes.yard_slime, { flags: ['saw_fading_sign'], branchFlags: false });
  const b = ops(win.log, 'battle')[0];
  assert.equal(b.args[0], 'yard_slime');
  assert.equal(b.args[1].canFlee, false);
  assert.equal(ops(win.log, 'addMember').length, 0, 'nobody joins: the hero fights alone');
  assert.ok(ops(win.log, 'spawn').some((e) => e.args[0] === 'yard_slime' && e.args[1].sprite === 'ink_slime'), 'the slime is on the field before the fight');
  assert.ok(ops(win.log, 'despawn').some((e) => e.args[0] === 'yard_slime'), 'and gone after');
  const says = ops(win.log, 'say');
  assert.equal(says.filter((e) => e.args[0] == null).length, 1, 'one narration box before the fight');
  assert.equal(says.filter((e) => e.args[0] === 'oren_out').length, 1, 'one Oren line after');
  assert.ok(win.log.at(-2).op === 'setFlag' && win.log.at(-2).args[0] === 'yard_fight_done');
  for (const e of says) assert.doesNotMatch(e.args[1], /press|button|tutorial|Lunge|Appraise/i);
  const lose = await runOnce(scenes.yard_slime, { flags: ['saw_fading_sign'], decisions: [1], branchFlags: false });
  assert.ok(!lose.log.some((e) => e.op === 'setFlag'), 'a loss sets nothing: the trigger fires again on reload');
  const early = await runOnce(scenes.yard_slime, { flags: [], branchFlags: false });
  assert.equal(early.log.filter((e) => e.op !== 'hasFlag').length, 0, 'nothing before the sign');
});

test('yard fight: a lone Lv 1 hero wins with Attack only, never dies from full HP, in a handful of rounds (200 seeded battles)', () => {
  const N = 200;
  let wins = 0, kos = 0, minHp = Infinity;
  const rounds = [];
  for (let i = 0; i < N; i++) {
    const rng = makeRng(i * 7919 + 17);
    const party = [newMember('hero', { level: 1 })];
    const spec = rollEncounter('yard_slime', rng, { noElite: true });
    const b = createBattle({ party, enemies: spec.enemies, rng,
      options: { inventory: { potion: 2 }, boss: false, canFlee: false, zone: 'valley', encounter: 'yard_slime', bestiary: {}, flags: [] } });
    let steps = 0;
    while (!b.isOver() && steps++ < 500) {
      const u = b.current();
      if (u.side === 'party') { const evs = b.perform(partyAction(b, 'naive')); if (evs.length === 1 && evs[0].type === 'invalid') b.perform({ type: 'defend' }); }
      else b.runEnemyTurn();
    }
    const r = b.result();
    const hero = b.units().find((x) => x.side === 'party');
    if (r && r.outcome === 'victory') wins++;
    if (!hero.alive) kos++;
    minHp = Math.min(minHp, hero.alive ? hero.hp / hero.maxHp : 0);
    rounds.push(r ? r.rounds : 99);
  }
  rounds.sort((a, b) => a - b);
  assert.equal(wins, N, 'every battle is won');
  assert.equal(kos, 0, 'the hero never falls');
  assert.ok(minHp >= 0.3, `worst case keeps ${Math.round(minHp * 100)}% HP`);
  assert.ok(rounds[0] >= 2, 'never a one-round fight');
  assert.ok(rounds[Math.floor(N / 2)] <= 5, `median ${rounds[Math.floor(N / 2)]} rounds`);
  assert.ok(rounds[Math.floor(N * 0.95)] <= 9, `95th percentile ${rounds[Math.floor(N * 0.95)]} rounds`);
});

// ------------------------------------------------------------------------------------------------ the maps
const db = await loadDb();
const maps = await loadAll();

test('bell_tower validates; the climb is one path, every toll step in order, each followed by a plain step', () => {
  const r = validate(maps.bell_tower, db, maps, { staging: loadStaging() });
  assert.deepEqual(r.errors, []);
  const w = walk(maps.bell_tower, db);
  const reached = new Set(w.reachable);
  for (const [x, y] of [...TOLL_STEPS, TOP_STEP]) assert.ok(reached.has(`${x},${y}`), `step ${x},${y} reachable`);
  assert.ok(reached.has(`${BELL_TOWER.marks.stair_foot[0]},${BELL_TOWER.marks.stair_foot[1]}`));
  assert.equal(TOLL_STEPS.length, 12);
  const g = buildGrid(maps.bell_tower, db);
  const trig = new Map();
  for (const e of maps.bell_tower.events) if (e.type === 'trigger') trig.set(`${e.x},${e.y}`, e.script);
  TOLL_STEPS.forEach(([x, y], i) => {
    assert.equal(trig.get(`${x},${y}`), TOLL_FLAGS[i], `step ${i + 1} runs ${TOLL_FLAGS[i]}`);
    // the cell the climb continues to is a plain walkable cell with no trigger (the held-direction rule)
    assert.equal(g.code[y - 1][x], 'none', `the cell above step ${i + 1} is walkable`);
    assert.ok(!trig.has(`${x},${y - 1}`), `no trigger right above step ${i + 1}`);
  });
  assert.equal(trig.get(`${TOP_STEP[0]},${TOP_STEP[1]}`), 'thirteenth_toll');
  // climbing order: every later step is higher up the tower or on a later flight
  assert.ok(BELL_TOWER.lighting.dark >= 0.6 && BELL_TOWER.music === null, 'dark and silent');
  assert.equal(BELL_TOWER.start.dir, 'up');
});

test('willowmere: the yard cut covers every passable cell of column 12 and the yard mark is open', () => {
  const g = buildGrid(maps.willowmere, db);
  const cut = maps.willowmere.events.find((e) => e.id === 'yard_slime_trig');
  assert.ok(cut && cut.script === 'yard_slime' && cut.w === 1);
  for (let y = 0; y < g.H; y++) {
    if (g.code[y][12] !== 'none') continue;
    assert.ok(y >= cut.y && y < cut.y + cut.h, `column 12 row ${y} is passable but outside the cut`);
  }
  const [yx, yy] = WILLOWMERE.marks.yard;
  assert.equal(g.code[yy][yx], 'none', 'the slime drops onto open ground');
  const [bx, by] = WILLOWMERE.marks.bakery_door;
  assert.equal(g.code[by + 1][bx], 'none', 'Oren can step down from the bakery door');
});

// ------------------------------------------------------------------------------------------------ the rules
test('every new box fits (3 lines of 42 with an 8-letter hero), every choice fits, and no em dash anywhere new', async () => {
  const bad = [];
  const check = (where, log) => {
    for (const e of log) {
      if (e.op === 'say' || e.op === 'title') { const t = e.args[e.op === 'say' ? 1 : 0]; if (!fits(t)) bad.push(`${where}: ${boxLines(t).join(' / ')}`); if (t.includes(EM_DASH)) bad.push(`${where}: em dash`); }
      if (e.op === 'choice') for (const o of e.args[0]) { if (o.length > CHOICE_COLS) bad.push(`${where} choice: ${o}`); if (o.includes(EM_DASH)) bad.push(`${where}: em dash in choice`); }
    }
  };
  for (const f of TOLL_FLAGS) check(f, (await runOnce(scenes[f], { flags: TOLL_FLAGS.slice(0, TOLL_FLAGS.indexOf(f)), branchFlags: false })).log);
  check('thirteenth_toll', (await runOnce(scenes.thirteenth_toll, { flags: TOLL_FLAGS, branchFlags: false })).log);
  for (const pick of [0, 1]) check('wake_up', (await runOnce(scenes.wake_up, { decisions: [pick], branchFlags: false })).log);
  for (const pick of [0, 1]) check('fading_sign', (await runOnce(scenes.fading_sign, { flags: ['intro_done'], decisions: [pick], branchFlags: false })).log);
  check('yard_slime', (await runOnce(scenes.yard_slime, { flags: ['saw_fading_sign'], branchFlags: false })).log);
  for (const f of ['oren_truth', 'oren_lie']) check(`oren_starter+${f}`, (await runOnce(scenes.oren_starter, { flags: ['starter_quest_started', 'starter_found', f], branchFlags: false })).log);
  for (const t of [...PROLOGUE, ...ATTRACT, COLD_OPEN_LINE]) { if (!fits(t)) bad.push(`card: ${t}`); if (t.includes(EM_DASH)) bad.push(`card em dash: ${t}`); }
  for (const t of [...TOLL_NAMES, ...Object.values(H1_FLAGS)]) if (t.includes(EM_DASH)) bad.push(`em dash: ${t}`);
  for (const rel of ['src/data/maps/bell_tower.js', 'src/scenes/prologue.js', 'src/data/story/ep1.js', 'qa/content/h1_opening.test.mjs']) {
    if (readFileSync(join(NEXT, rel), 'utf8').includes(EM_DASH)) bad.push(`${rel}: em dash in source`);
  }
  assert.deepEqual(bad, []);
});
