// #86 (CRITIQUE_9 items 2, 3, 6, 9, 10; Scott, 2026-11-11): the story and pacing fixes.
//   2  a second fight in the first minutes (library_ink, chained from mira_joins) and a shorter walk to the valley
//   3  a few lines in Episodes 2 to 4 that keep "the first page" in the player's hand, never answering it
//   6  Episode 6 F3 trimmed (story boxes on the main path: 41 before, 29 now)
//   9  Fury and Combo taught in words: two first-time field lines after the first fight in which each lit
//   10 "Ledger" means one thing in player text: the player's Ledger (the kept-names book, src/data/ledger.js)
// Pure: node only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { scenes as EP1, SCENE_CONDITIONS as EP1_COND, H1_FLAGS } from '../../src/data/story/ep1.js';
import { scenes as EP2 } from '../../src/data/story/ep2.js';
import { scenes as EP3, GATE as GATE3 } from '../../src/data/story/ep3.js';
import { scenes as EP4 } from '../../src/data/ep4/story.js';
import { scenes as EP6, GATE as GATE6 } from '../../src/data/ep6/story.js';
import { register as registerEp4Flags } from '../../src/data/ep4/flags.js';
import { register as registerEp5Flags } from '../../src/data/ep5/flags.js';
import { register as registerEp6Flags } from '../../src/data/ep6/flags.js';
import { ENCOUNTERS, rollEncounter } from '../../src/data/encounters.js';
import { BARKS } from '../../src/data/text.js';
import { newMember } from '../../src/data/party.js';
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { EP1_DONE_FLAGS } from '../../src/game/state.js';
import LIBRARY from '../../src/data/maps/library.js';
import { fits, boxLines } from '../../src/data/story/dialogue.js';
import { runOnce, NEXT } from './_harness.mjs';
import { loadDb, loadAll, buildGrid } from '../../tools/maps/mapcheck.mjs';

registerEp4Flags(); registerEp5Flags(); registerEp6Flags();
GATE3.live = true; GATE6.live = true;
const ops = (log, op) => log.filter((e) => e.op === op);
const says = (log) => ops(log, 'say');
const EM_DASH = String.fromCharCode(0x2014);

// ------------------------------------------------------------------------------------------------ item 2
test('library_ink: chained from mira_joins after mira_joined; two slimes, the hero and Mira, no flee; a win sets ink_fight_done', async () => {
  const join = await runOnce(EP1.mira_joins, { flags: ['intro_done', 'met_mael'], branchFlags: false });
  const joined = join.log.findIndex((e) => e.op === 'setFlag' && e.args[0] === 'mira_joined');
  const fight = join.log.findIndex((e) => e.op === 'battle');
  assert.ok(joined > 0 && fight > joined, 'Mira joins, then the ink comes back');
  assert.equal(join.log[fight].args[0], 'library_ink');
  assert.equal(join.log[fight].args[1].canFlee, false);
  assert.ok(join.log.at(-2).op === 'setFlag' && join.log.at(-2).args[0] === 'ink_fight_done');
  const spawned = ops(join.log, 'spawn').filter((e) => e.args[1].sprite === 'ink_slime').map((e) => e.args[0]);
  assert.deepEqual(spawned, ['ink_a', 'ink_b']);
  for (const id of spawned) assert.ok(ops(join.log, 'despawn').some((e) => e.args[0] === id), `${id} despawns after the win`);
  const own = await runOnce(EP1.library_ink, { flags: ['mira_joined'], branchFlags: false });
  assert.equal(says(own.log).length, 4, 'one narration, two Mira boxes before, one after');
  for (const e of says(own.log)) { assert.ok(fits(e.args[1]), boxLines(e.args[1]).join(' / ')); assert.ok(!e.args[1].includes(EM_DASH)); }
  const lose = await runOnce(EP1.library_ink, { flags: ['mira_joined'], decisions: [1], branchFlags: false });
  assert.ok(!lose.log.some((e) => e.op === 'setFlag'), 'a loss sets nothing');
  assert.deepEqual(EP1_COND.library_ink, { if: 'mira_joined', ifNot: ['ink_fight_done', 'bram_joined'] });
  assert.ok('ink_fight_done' in H1_FLAGS);
});

test('library_ink never reaches a save past the opening, and a finished Episode 1 never replays it', async () => {
  for (const flags of [EP1_DONE_FLAGS, ['mira_joined', 'bram_joined'], ['mira_joined', 'ink_fight_done'], []]) {
    const r = await runOnce(EP1.library_ink, { flags, branchFlags: false });
    assert.equal(r.log.filter((e) => e.op !== 'hasFlag').length, 0, `nothing runs with ${flags.join(', ') || 'no flags'}`);
  }
  const done = await runOnce(EP1.mira_joins, { flags: EP1_DONE_FLAGS, branchFlags: false });
  assert.equal(ops(done.log, 'battle').length, 0, 'mira_joins itself is behind mira_joined');
});

test('library fight: the Lv 1 hero and Mira win it every time on the naive policy, in a handful of rounds (200 seeded battles)', () => {
  const enc = ENCOUNTERS.library_ink;
  assert.deepEqual(enc.enemies, ['ink_slime', 'ink_slime']);
  assert.ok(enc.noFlee && enc.noElite && enc.power < 1 && enc.hp < 1);
  const N = 200;
  let wins = 0, kos = 0;
  const rounds = [];
  for (let i = 0; i < N; i++) {
    const rng = makeRng(i * 6007 + 29);
    const party = [newMember('hero', { level: 1 }), newMember('mira', { level: 1 })];
    const spec = rollEncounter('library_ink', rng, { noElite: true });
    const b = createBattle({ party, enemies: spec.enemies, rng,
      options: { inventory: { potion: 2 }, boss: false, canFlee: false, zone: 'valley', encounter: 'library_ink', bestiary: {}, flags: [] } });
    let steps = 0;
    while (!b.isOver() && steps++ < 600) {
      const u = b.current();
      if (u.side === 'party') { const evs = b.perform(partyAction(b, 'naive')); if (evs.length === 1 && evs[0].type === 'invalid') b.perform({ type: 'defend' }); }
      else b.runEnemyTurn();
    }
    const r = b.result();
    if (r && r.outcome === 'victory') wins++;
    kos += b.units().filter((x) => x.side === 'party' && !x.alive).length;
    rounds.push(r ? r.rounds : 99);
  }
  rounds.sort((a, b) => a - b);
  assert.equal(wins, N, 'every battle is won');
  assert.ok(kos <= N * 0.02, `party members down: ${kos} in ${N}`);
  assert.ok(rounds[Math.floor(N / 2)] <= 6, `median ${rounds[Math.floor(N / 2)]} rounds`);
  assert.ok(rounds[Math.floor(N * 0.95)] <= 10, `95th percentile ${rounds[Math.floor(N * 0.95)]} rounds`);
});

test('library: the ink marks are open floor, off the hero\'s door cell', async () => {
  const db = await loadDb();
  const maps = await loadAll();
  const g = buildGrid(maps.library, db);
  for (const k of ['ink_a', 'ink_b']) {
    const [x, y] = LIBRARY.marks[k];
    assert.equal(g.code[y][x], 'none', `${k} (${x},${y}) is walkable`);
    assert.notDeepEqual([x, y], [LIBRARY.start.x, LIBRARY.start.y]);
  }
});

test('the opening trims: the cut lines are gone from the main path to the valley', async () => {
  const text = (log) => says(log).map((e) => e.args[1]).join('\n');
  const mira = text((await runOnce(EP1.mira_joins, { flags: ['intro_done', 'met_mael'], branchFlags: false })).log);
  assert.doesNotMatch(mira, /speech about patience|two doors that look/);
  assert.match(mira, /writing it on my sleeve/, 'the warm beat stays');
  const bram = text((await runOnce(EP1.south_gate, { flags: ['met_mael', 'mira_joined'], branchFlags: false })).log);
  assert.doesNotMatch(bram, /Eleven rungs|wasn't a question/);
  assert.match(bram, /very tall gate/);
  assert.match(bram, /fire at Emberpeak/, 'the Episode 3 setup stays');
  const garrick = text((await runOnce(EP1.garrick_farewell, { flags: ['mira_joined', 'bram_joined'], branchFlags: false })).log);
  assert.match(garrick, /Respect the rhythm, and come home/, 'the Episode 3 callback stays');
});

// ------------------------------------------------------------------------------------------------ item 3
test('the first page stays in the player\'s hand in Episodes 2, 3 and 4, and nothing there says what it is or who keeps it', async () => {
  const E1 = ['intro_done', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete'];
  const lines = async (fn, flags) => says((await runOnce(fn, { flags, branchFlags: false })).log).map((e) => e.args[1]);
  const ep2 = await lines(EP2.vex_mirror, [...E1, 'court_f2_arrived']);
  const ep3 = await lines(EP3.vex_furnace, [...E1, 'ep2_complete', 'foundry_f3_arrived']);
  const ep4 = [];
  for (const [id, fn] of Object.entries(EP4)) {
    const r = await runOnce(fn, { flags: [...E1, 'ep2_complete', 'ep3_complete', 'paper_regent_defeated'], branchFlags: false });
    if (says(r.log).some((e) => /Keep this one/.test(e.args[1]))) ep4.push(id, ...says(r.log).map((e) => e.args[1]));
  }
  assert.ok(ep2.some((t) => /A first page\. He said it as if it were somewhere you could go\./.test(t)), 'Episode 2');
  assert.ok(ep3.some((t) => /looked in other fires/.test(t)), 'Episode 3');
  assert.ok(ep4.some((t) => /Vex's first page\. Is that this hand too\?/.test(t)), 'Episode 4');
  // held for Episodes 5 and 6: who asked Vex, that he keeps it, where it is, what it is
  for (const t of [...ep2, ...ep3, ...ep4]) assert.doesNotMatch(t, /above the clouds|asked (him|Vex)|beginning|Vex keeps|kept it/i, t);
});

// ------------------------------------------------------------------------------------------------ item 6
const F3 = [['obs_f3_arrival', []], ['pledge_anchor', ['aeris_came']], ['pledge_listen', ['pledge_anchor']], ['vex_falls', ['pledge_listen']],
  ['pledge_return', ['pledge_listen', 'vex_held']], ['fifth_voice', ['pledge_return']]];
test('Episode 6 F3: the main path\'s story boxes are 29 (41 before #86), and every Episode 7 / 8 thread is still said', async () => {
  const EP5_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_complete', 'ep3_complete',
    'ep4_complete', 'ep5_complete', 'ep6_started', 'obs_entered', 'obs_f1_done', 'obs_f2_done'];
  let n = 0;
  const all = [];
  for (const [id, f] of F3) {
    const r = await runOnce(EP6[id], { flags: [...EP5_DONE, ...f], branchFlags: false });
    n += says(r.log).length;
    all.push(...says(r.log).map((e) => e.args[1]));
  }
  assert.equal(n, 29, `F3 story boxes: ${n}`);
  const text = all.join('\n');
  for (const keep of [/A Keeper wrote that/, /took the name off the letter/, /Look at the k/, /I was fourteen/, /people who write the lists/,
    /above the clouds/, /Somebody should hold on to you/, /Pippa\. Pippa Voss/, /came back for each other/, /hunting a page/, /Sky Compass Keyhole/,
    /long way/, /ANCHOR your people/, /LISTEN for those/, /RETURN for anyone/, /I'm late/, /clean blank/, /open book/]) assert.match(text, keep);
});

// ------------------------------------------------------------------------------------------------ item 9
test('Fury and Combo: one first-time line each, short, from the party, wired from the battle to the field', () => {
  for (const k of ['first_fury', 'first_combo']) {
    const entries = BARKS[k];
    assert.ok(entries && entries.length, k);
    for (const e of entries) {
      assert.equal(e.lines.length, 1, `${k}: one line`);
      assert.ok(['mira', 'bram'].includes(e.lines[0].who), `${k}: a party line`);
      assert.ok(fits(e.lines[0].text) && boxLines(e.lines[0].text).length <= 2, `${k}: short`);
      assert.match(e.lines[0].text, k === 'first_fury' ? /Fury/ : /Combo/);
    }
  }
  const battle = readFileSync(join(NEXT, 'src/scenes/battle.js'), 'utf8');
  const field = readFileSync(join(NEXT, 'src/scenes/field.js'), 'utf8');
  assert.match(battle, /noteLessons\(this, u\);\s*\n\s*this\.menu\.open\(u\)/, 'noted as the menu opens');
  assert.match(battle, /noteLessons\(this, u\); this\.performParty\(this\.autoAction\(\)\)/, 'and as Auto acts');
  assert.match(battle, /e\.lastBattleLessons = result === 'win'/);
  assert.match(field, /e\.lastBattleLessons; e\.lastBattleLessons = null/);
  assert.match(field, /pendingBarks\.push\(`first_\$\{k\}`\)/);
});

// ------------------------------------------------------------------------------------------------ item 10
// Every string literal with a space in it (a sentence: player text, or a doc string) under src/data, src/ui, src/scenes:
// "ledger" only ever names the player's Ledger, in the few places that speak of it.
const PLAYER_LEDGER = [/the Ledger \(H2\)/, /Not a Ledger name/, /Ledger: see bennet/];
test('"Ledger" means one thing in text: the player\'s Ledger; the story\'s record books have other names', () => {
  const files = [];
  const walkDir = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walkDir(p); else if (f.endsWith('.js')) files.push(p); } };
  for (const d of ['src/data', 'src/ui', 'src/scenes']) walkDir(join(NEXT, d));
  const bad = [];
  const STR = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (const p of files) {
    if (/[\\/]ledger\.js$/.test(p)) continue;                     // the Ledger's own rows
    const src = readFileSync(p, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    for (const m of src.matchAll(STR)) {
      const t = m[1] ?? m[2] ?? m[3] ?? '';
      if (!/ /.test(t) || !/ledgers?/i.test(t)) continue;   // a word, not an id (keep_ledger, ledger_ash)
      if (PLAYER_LEDGER.some((r) => r.test(t))) continue;
      bad.push(`${p.slice(NEXT.length + 1)}: ${t.slice(0, 90)}`);
    }
  }
  assert.deepEqual(bad, []);
});
