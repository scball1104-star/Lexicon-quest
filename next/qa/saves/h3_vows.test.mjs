// H3-vows: the save fields `vow` and `vowsKept` (docs/VOWS.md). Round-trip with and without a vow; every old fixture
// (no vow fields) loads with vow null and vowsKept []; a vow in a save survives the trip and settles after the load.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGame, addMember, serialize, deserialize, newGameEp2, newGameEp3, saveMeta } from '../../src/game/state.js';
import { takeVow, vowEvent, settleVow, vowLine, activeVow } from '../../src/game/vows.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');

test('a new game starts with vow null and vowsKept [], and both round-trip through serialize / deserialize', () => {
  const g = createGame('Arden');
  assert.equal(g.vow, null); assert.deepEqual(g.vowsKept, []);
  const back = deserialize(serialize(g));
  assert.equal(back.vow, null); assert.deepEqual(back.vowsKept, []);
  assert.deepEqual(saveMeta(back), saveMeta(g), 'the slot summary does not change');
  for (const quick of [newGameEp2('Arden'), newGameEp3('Arden')]) {
    assert.equal(quick.vow, null); assert.deepEqual(quick.vowsKept, []);
    const q = deserialize(serialize(quick));
    assert.equal(q.vow, null); assert.deepEqual(q.vowsKept, []);
  }
});

test('an active vow, a broken vow and the kept list all survive the round trip and keep working after it', () => {
  const g = createGame('Arden'); addMember(g, 'mira'); addMember(g, 'bram');
  g.counters.battles = 4;
  takeVow(g, 'mira_stands');
  const a = deserialize(serialize(g));
  assert.deepEqual(a.vow, { id: 'mira_stands', chapter: 1, battles: 4, state: 'active', brokenBy: null });
  assert.equal(vowLine(a), 'Vow: Mira stands');
  assert.equal(activeVow(a).id, 'mira_stands');
  // kept after the load
  a.counters.battles = 5;
  const k = settleVow(a);
  assert.equal(k.kind, 'kept'); assert.equal(a.party[1].mastery.staff, 4);
  assert.deepEqual(a.vowsKept, [{ id: 'mira_stands', chapter: 1, paid: true }]);
  const b = deserialize(serialize(a));
  assert.deepEqual(b.vowsKept, [{ id: 'mira_stands', chapter: 1, paid: true }]); assert.equal(b.vow, null);
  // broken, saved, loaded: still broken, settles to its line
  takeVow(b, 'no_flee'); vowEvent(b, { type: 'flee' });
  const c = deserialize(serialize(b));
  assert.equal(c.vow.state, 'broken'); assert.equal(c.vow.brokenBy, 'flee');
  assert.equal(vowLine(c), 'Vow ended');
  assert.equal(settleVow(c).kind, 'broken'); assert.equal(c.vow, null);
  assert.equal(c.vowsKept.length, 1);
});

test('every old save fixture (no vow fields) loads with vow null and vowsKept [], and nothing else about it changes', () => {
  const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 4, 'fixtures present');
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(FIXTURES, f), 'utf8'));
    const data = raw.game || raw.data || raw;   // a fixture may wrap the game
    assert.ok(!('vow' in data) && !('vowsKept' in data), `${f} predates the vow fields`);
    const g = deserialize(data);
    assert.ok(g, `${f} deserializes`);
    assert.equal(g.vow, null, `${f}: vow null`);
    assert.deepEqual(g.vowsKept, [], `${f}: vowsKept []`);
    // the old fields are untouched: the loaded game, minus the two defaults, is the fixture plus the other defaults it lacked
    const again = deserialize(data);
    delete again.vow; delete again.vowsKept;
    for (const k of Object.keys(data)) assert.deepEqual(again[k], data[k], `${f}: ${k} unchanged`);
    // and a vow can be taken on it at once
    assert.ok(takeVow(g, 'no_flee'), `${f}: a vow can be taken`);
    assert.equal(vowLine(g), 'Vow: No fleeing');
  }
});

test('a save written with the fields and read by code that fills defaults keeps them as written (no migration rewrites them)', () => {
  const g = createGame('Arden'); addMember(g, 'mira');
  g.vowsKept = [{ id: 'no_fury', chapter: 1, paid: true }, { id: 'no_fury', chapter: 1, paid: false }];
  takeVow(g, 'no_heal');
  const json = JSON.stringify(serialize(g));
  const back = deserialize(JSON.parse(json));
  assert.deepEqual(back.vowsKept, g.vowsKept);
  assert.deepEqual(back.vow, g.vow);
  assert.notEqual(back.vowsKept, g.vowsKept, 'a copy, not the same array');
});
