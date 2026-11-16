// E8-pack (EPISODE8_PLAN 13.2 seam 5, BATTLE 14.8): the one `commands` call point at the end of rules.js commands(). A RULE_EXT
// hook's commands(state, unit, list, ctx) is called once per commands build, for a party member, after every row is built, and
// may edit the rows in place (Erasure disables a rubbed-out row with a reason). With no such hook every Episode 1 to 7 fight
// builds exactly the rows it built before the seam (qa/core/ep8_commands_fixture.json, written without the line).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULE_EXT } from '../../src/battle/rules.js';
import { battle, untilTurn } from '../battle/_helpers.mjs';
import { build, FIXTURE } from './ep8_commands_fixture.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('the seam is one line at the end of the commands builder, and RULE_EXT documents commands beside start and afterAction', () => {
  const src = fs.readFileSync(path.join(NEXT, 'src/battle/rules.js'), 'utf8');
  const lines = src.split('\n').filter((l) => /\bh\.commands\b/.test(l));
  assert.equal(lines.length, 1, 'one call point');
  const at = src.indexOf(lines[0]);
  assert.ok(src.slice(at, at + 200).includes('return out;'), 'right before commands() returns its list');
  assert.match(src, /RULE_EXT[^\n]*\n?[^\n]*commands\(state, unit, list, ctx\)|commands\(state, unit, list, ctx\)[^\n]*\n[^\n]*RULE_EXT/);
  for (const h of RULE_EXT) assert.equal(typeof h.commands, 'undefined', 'no Episode 1 to 7 rule has a commands hook');
});

test('a battle with no commands hook builds exactly the Episodes 1 to 7 rows of the fixture', () => {
  assert.ok(!RULE_EXT.some((h) => h.commands) && !RULE_EXT.commands);
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const got = build();
  assert.equal(got.length, want.length);
  assert.deepEqual(got.map((d) => d.key), want.map((d) => d.key));
  for (let i = 0; i < got.length; i++) assert.deepEqual(got[i], want[i], `${want[i].key}: the same rows on every party turn`);
  assert.ok(want.every((d) => d.turns.length > 0) && new Set(want.map((d) => d.key.slice(0, 3))).size === 7, 'two fights for each of Episodes 1 to 7');
});

test('a hook is called once per commands build, for party members only, with the finished list, and its edits stand', () => {
  const calls = [];
  const hook = {
    commands(state, u, list, ctx) {
      calls.push({ uid: u.uid, n: list.length, last: list[list.length - 1].id, state, ctx });
      const tech = list.find((c) => c.id === 'tech');
      if (u.id === 'mira' && tech) { tech.enabled = false; tech.reason = 'Rubbed out'; }
    },
  };
  RULE_EXT.push(hook);
  try {
    const b = battle(['ink_slime', 'ink_slime'], { level: 10 });
    const plain = b.commands('hero');
    assert.equal(calls.length, 1, 'once for one build');
    assert.equal(calls[0].uid, 'hero');
    assert.equal(calls[0].n, plain.length, 'the hook saw the finished list');
    assert.equal(calls[0].last, 'flee', 'after the last row');
    assert.equal(calls[0].state.now != null || typeof calls[0].state === 'object', true, 'the battle state');
    assert.equal(typeof calls[0].ctx.emit, 'function', 'and the rule context');
    const mira = b.commands('mira');
    assert.equal(calls.length, 2);
    const tech = mira.find((c) => c.id === 'tech');
    assert.deepEqual([tech.enabled, tech.reason], [false, 'Rubbed out'], 'the edit is in the returned rows');
    assert.equal(b.commands('hero').find((c) => c.id === 'tech').reason !== 'Rubbed out', true, 'only where the hook said');
    const foe = b.units().find((x) => x.side === 'enemy');
    assert.deepEqual(b.commands(foe.uid), [], 'a foe has no rows');
    assert.equal(calls.length, 3, 'and no hook call for a foe');
    untilTurn(b, b.units().find((x) => x.id === 'bram').uid);
    const before = calls.length;
    b.commands();
    assert.equal(calls.length, before + 1, 'the current unit: one more call');
  } finally { RULE_EXT.splice(RULE_EXT.indexOf(hook), 1); }
  // the plan's literal form, a commands function on RULE_EXT itself, is called the same way
  let n = 0;
  RULE_EXT.commands = () => { n++; };
  try { battle(['ink_slime'], { level: 10 }).commands('hero'); assert.equal(n, 1); } finally { delete RULE_EXT.commands; }
});
