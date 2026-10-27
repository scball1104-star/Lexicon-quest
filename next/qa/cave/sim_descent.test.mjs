// C3-sim-bot: the Deep Stacks descent simulator (tools/sim/cave.mjs) is deterministic per seed, plays the game's own floors,
// fights and chests, and a short run (5 seeds, B1 to B20) fits the test budget with sane numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const S = await import('../../tools/sim/cave.mjs');
const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const strip = (r) => ({ ...r, floors: r.floors.map((f) => ({ ...f })) });

test('runDescent is deterministic per seed and seeds differ', () => {
  const a = S.runDescent({ seed: 7, floors: 6, binder: false });
  const b = S.runDescent({ seed: 7, floors: 6, binder: false });
  assert.deepEqual(strip(a), strip(b), 'the same seed, the same descent');
  const c = S.runDescent({ seed: 8, floors: 6, binder: false });
  assert.notDeepEqual(a.floors.map((f) => f.rounds), c.floors.map((f) => f.rounds), 'another seed, other fights');
  // the party starts as the plan says (level 1, empty hands) and grows by the real curve
  assert.equal(a.floors[0].level, 1);
  assert.ok(a.floors[a.floors.length - 1].level > 4, `Lv ${a.floors[a.floors.length - 1].level} on B6`);
  for (const f of a.floors) assert.ok(f.fights === 0 || f.rounds.every((r) => r > 0), `B${f.floor} rounds`);
});

test('the descent plays the generated floors: every placed foe is fought, every chest opened, landings fight nothing', () => {
  const seen = [];
  const r = S.runDescent({ seed: 3, floors: 11, binder: false, onFloor: ({ floor, mod, row }) => seen.push({ floor, mod, row }) });
  for (const { floor, mod, row } of seen) {
    const foes = mod.events.filter((e) => e.type === 'enemy').length;
    const chests = mod.events.filter((e) => e.type === 'chest').length;
    if (r.died === floor) continue;
    assert.equal(row.fights, foes, `B${floor}: ${row.fights} fights of ${foes} foes`);
    assert.equal(row.chests, chests, `B${floor}: ${row.chests} chests of ${chests}`);
    if (floor === 10) { assert.equal(foes, 0, 'B10 is a landing'); assert.equal(chests, 1, 'one red chest on a landing'); }
  }
});

test('a short run (5 seeds, B1 to B20) fits the budget and reports every table', () => {
  const t0 = Date.now();
  const s = S.runCave({ seeds: 5, seed0: 11, floors: 20, jobs: 1 });
  const ms = Date.now() - t0;
  assert.ok(ms < 90000, `${ms} ms`);
  assert.equal(s.runs.length, 5);
  assert.deepEqual(s.bands.map((b) => b.id), ['B1-B9', 'B10-B29']);
  for (const b of s.bands) {
    assert.ok(b.entered > 0 && b.deathRate >= 0 && b.deathRate <= 1, b.id);
    if (b.fights) { assert.ok(b.rounds > 1 && b.rounds < 8, `${b.id} rounds ${b.rounds}`); assert.ok(b.hpLost > 0 && b.hpLost < 0.5, `${b.id} HP lost ${b.hpLost}`); }
  }
  const b10 = s.arrival.find((a) => a.floor === 10);
  assert.ok(b10.n > 0 && Math.abs(b10.mean - 12) <= S.CAVE_TARGETS.arrivalDrift, `B10 arrival Lv ${b10.mean}`);
  assert.ok(s.runs.every((r) => !r.genError), 'no generator refusal on these seeds');
  const text = S.formatCave(s);
  for (const k of ['| band |', '| decade |', '| arrival |', 'Bookmarks:', 'Wipes by floor:']) assert.ok(text.includes(k), k);
  assert.ok(!text.includes(String.fromCharCode(0x2014)), 'no em dash in the report');
});

test('worker threads give the same numbers as one thread', async () => {
  const one = S.runCave({ seeds: 3, seed0: 21, floors: 5, jobs: 1 });
  const two = await S.runCave({ seeds: 3, seed0: 21, floors: 5, jobs: 2 });
  const view = (s) => s.runs.map((r) => [r.seed, r.died, r.reached, r.floors.map((f) => [f.level, f.fights, f.rounds.join(',')])]);
  assert.deepEqual(view(two), view(one));
});

test('simulate.mjs --cave dispatches to the descent', () => {
  const r = spawnSync(process.execPath, ['tools/sim/simulate.mjs', '--cave', '--seeds', '2', '--floors', '3', '--jobs', '1', '--quiet'], { cwd: NEXT, encoding: 'utf8', timeout: 120000 });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes('Deep Stacks descent: 2 seeds'), r.stdout.slice(0, 300));
  assert.ok(!r.stdout.includes('Progression (fight each zone plan once'), 'the base suite does not run under --cave');
});
