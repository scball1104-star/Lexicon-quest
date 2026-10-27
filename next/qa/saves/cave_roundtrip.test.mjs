// C1-state: the Deep Stacks and the serializer (plan 2.9 and 8; the brief's deliverable 3). A game mid-run keeps `cave` whole
// through serialize / deserialize and the run can still be banked, died or resumed after the load; every old save fixture
// (no `cave`) loads with `cave` undefined, ensureCave fills the exact plan shape, and nothing else about the save changes; a
// save carrying H3's vow fields and a cave run survives the trip with both intact. state.js was not edited: `cave` rides the
// existing serializer because it clones the whole object.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import register from '../../src/data/cave/index.js';
import { createGame, addMember, newGameEp2, newGameEp3, serialize, deserialize, saveMeta, setFlag } from '../../src/game/state.js';
import { takeVow, vowLine, activeVow, settleVow } from '../../src/game/vows.js';
import { equipGear } from '../../src/game/inventory.js';
import {
  ensureCave, canEnter, enter, descend, foundBlue, foundBookmark, bank, die, resumeInfo, inRun, floorOf, vaultIds, recordOf, suspendMeta,
  riseAvailable, SUSPEND_SLOT,
} from '../../src/game/cave.js';

await register();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const PEN = 'cave_catalogue_pen', MANTLE = 'cave_damp_mantle', BINDING = 'cave_forge_binding';
const EMPTY = { vault: [], record: { floor: 0, readings: 0, clears: 0, time: 0 }, run: null, snapshot: null };

test('a game mid-run round-trips with `cave` intact (run, snapshot, vault, record) and resumes where it was', () => {
  const g = newGameEp2('Arden'); g.playtime = 500;
  enter(g, { seed: 1234, playtime: 500 }); foundBlue(g, PEN); foundBookmark(g); bank(g, { playtime: 600 });
  enter(g, { seed: 99, playtime: 600 });
  for (let i = 0; i < 22; i++) descend(g);
  foundBlue(g, MANTLE); foundBookmark(g, 2);
  assert.ok(equipGear(g, g.party[0], 'mantle', g.gear.find((it) => it.base === MANTLE).uid).ok);
  g.party[1].hp = 3; g.gold = 77; g.map = 'cave_b23'; g.pos = { x: 5, y: 6, dir: 'left' };
  const json = JSON.stringify(serialize(g));
  const back = deserialize(JSON.parse(json));
  assert.deepEqual(back.cave, g.cave);
  assert.notEqual(back.cave, g.cave, 'a copy');
  assert.notEqual(back.cave.snapshot, g.cave.snapshot);
  assert.equal(inRun(back), true); assert.equal(floorOf(back), 23);
  assert.deepEqual(resumeInfo(back), { floor: 23, seed: 99, blues: 1 });
  assert.deepEqual(vaultIds(back), [PEN]);
  assert.deepEqual(recordOf(back), { floor: 23, readings: 2, clears: 0, time: 100 });
  assert.equal(back.party[0].level, 1); assert.equal(back.party[1].hp, 3); assert.equal(back.gold, 77); assert.equal(back.map, 'cave_b23');
  assert.equal(back.party[0].equip.mantle.base, MANTLE);
  assert.deepEqual(canEnter(back), { ok: false, why: 'in_run' });
  // the suspend envelope's meta
  const meta = suspendMeta(back);
  assert.deepEqual(meta.cave, { floor: 23, seed: 99 });
  assert.deepEqual({ ...meta, cave: undefined }, { ...saveMeta(back), cave: undefined });
  assert.equal(SUSPEND_SLOT, 'cave');
});

test('after the load the run still banks (blues to the vault, the overworld back) or dies, exactly as the unsaved game would', () => {
  const g = newGameEp2('Arden');
  enter(g, { seed: 7, playtime: 0 }); for (let i = 0; i < 9; i++) descend(g); foundBlue(g, PEN); foundBookmark(g);
  const a = deserialize(serialize(g));
  const b = deserialize(serialize(g));
  const ra = bank(a, { playtime: 40 }), rg = bank(g, { playtime: 40 });
  assert.deepEqual(ra, rg);
  assert.deepEqual(serialize(a), serialize(g), 'the banked game is the same whether or not it was saved mid-run');
  assert.equal(a.party[0].level, 9); assert.deepEqual(vaultIds(a), [PEN]);
  const rb = die(b, { playtime: 40 });
  assert.deepEqual(rb, { ok: true, floor: 10, lost: [PEN], elapsed: 40, cause: 'wipe' });
  assert.deepEqual(vaultIds(b), []);
  assert.equal(b.party[0].level, 9); assert.equal(b.gold, 900);
});

test('a game between readings round-trips: the vault, the record and inRun false, and a new reading starts from the loaded copy', () => {
  const g = newGameEp2('Arden');
  enter(g); foundBlue(g, PEN); foundBookmark(g); bank(g);
  const back = deserialize(serialize(g));
  assert.deepEqual(back.cave, { ...EMPTY, vault: [PEN], record: { floor: 1, readings: 1, clears: 0, time: 0 }, inRun: false });
  assert.equal(inRun(back), false); assert.equal(resumeInfo(back), null);
  assert.deepEqual(canEnter(back), { ok: true, why: null });
  const r = enter(back);
  assert.deepEqual(r.vault, [PEN]);
  assert.deepEqual(back.gear.map((it) => it.base), [PEN]);
});

test('every old save fixture (no `cave`) loads with cave undefined; ensureCave fills the exact plan shape; nothing else changes', () => {
  const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 4, 'fixtures present');
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(FIXTURES, f), 'utf8'));
    const data = raw.game || raw.data || raw;
    assert.ok(!('cave' in data), `${f} predates the Stacks`);
    const g = deserialize(data);
    assert.ok(g, `${f} deserializes`);
    assert.equal(g.cave, undefined, `${f}: deserialize invents nothing`);
    assert.ok(!('cave' in serialize(g)), `${f}: saved back without a cave field, byte for byte an old save`);
    assert.equal(inRun(g), false); assert.equal(floorOf(g), 0); assert.equal(resumeInfo(g), null);
    assert.deepEqual(vaultIds(g), []); assert.deepEqual(recordOf(g), EMPTY.record);
    assert.deepEqual(g.cave, EMPTY, `${f}: the read-only views filled the shape lazily`);
    // every field the fixture had is untouched by ensureCave
    const again = deserialize(data);
    ensureCave(again);
    for (const k of Object.keys(data)) assert.deepEqual(again[k], data[k], `${f}: ${k} unchanged`);
    // the gate reads the fixture's own story state
    const expect = data.flags && data.flags.ep1_complete ? { ok: true, why: null } : { ok: false, why: 'ep1_incomplete' };
    assert.deepEqual(canEnter(again), expect, `${f}: canEnter`);
    // and a finished fixture can start a reading at once and come back whole
    if (expect.ok) {
      const before = serialize(again); delete before.cave;
      assert.ok(enter(again), `${f}: enter`);
      assert.equal(again.party[0].level, 1);
      assert.deepEqual(again.items, {}); assert.equal(again.gold, 0);
      foundBookmark(again);
      assert.ok(bank(again).ok, `${f}: bank`);
      const after = serialize(again); delete after.cave;
      assert.deepEqual(after, before, `${f}: the overworld restored byte for byte`);
    }
  }
});

test('the quick starts and a fresh game carry no cave field until the Stacks are touched', () => {
  for (const g of [createGame('Arden'), newGameEp2('Arden'), newGameEp3('Arden')]) {
    assert.equal(g.cave, undefined);
    const back = deserialize(serialize(g));
    assert.equal(back.cave, undefined);
    assert.deepEqual(saveMeta(back), saveMeta(g));
  }
});

test('H3 vow fields and a cave run survive one round trip together, and both keep working after the load', () => {
  const g = createGame('Arden'); addMember(g, 'mira'); addMember(g, 'bram');
  setFlag(g, 'ep1_complete');
  g.counters.battles = 4;
  g.vowsKept = [{ id: 'no_fury', chapter: 1, paid: true }];
  assert.ok(takeVow(g, 'mira_stands'), 'the vow is taken before the reading');
  enter(g, { seed: 3, playtime: 10 }); for (let i = 0; i < 4; i++) descend(g);
  foundBlue(g, BINDING); foundBookmark(g);
  assert.ok(equipGear(g, g.party[2], 'body', g.gear.find((it) => it.base === BINDING).uid).ok);
  const back = deserialize(serialize(g));
  // vows intact
  assert.deepEqual(back.vow, { id: 'mira_stands', chapter: 1, battles: 4, state: 'active', brokenBy: null });
  assert.deepEqual(back.vowsKept, [{ id: 'no_fury', chapter: 1, paid: true }]);
  assert.equal(vowLine(back), 'Vow: Mira stands'); assert.equal(activeVow(back).id, 'mira_stands');
  // cave intact
  assert.deepEqual(back.cave, g.cave);
  assert.deepEqual(resumeInfo(back), { floor: 5, seed: 3, blues: 1 });
  assert.equal(riseAvailable(back, 'bram'), true, 'the worn Binding still grants its rise after the load');
  // the vow settles inside the run without touching the cave, then the run banks without touching the vow record
  back.counters.battles = 5;
  const k = settleVow(back);
  assert.equal(k.kind, 'kept');
  assert.equal(back.party[1].mastery.staff, 4, 'the vow paid mastery to the run party (the Stacks keep what the run earns until exit)');
  assert.deepEqual(back.vowsKept, [{ id: 'no_fury', chapter: 1, paid: true }, { id: 'mira_stands', chapter: 1, paid: true }]);
  assert.equal(back.vow, null);
  assert.deepEqual(resumeInfo(back), { floor: 5, seed: 3, blues: 1 }, 'the vow did not touch the run');
  const r = bank(back, { playtime: 70 });
  assert.deepEqual(r, { ok: true, floor: 5, blues: [BINDING], elapsed: 60, bookmarkUsed: true });
  assert.equal(back.party[1].mastery.staff, 0, 'the overworld party is the snapshot: the run\'s mastery, vow pay included, stays in the Stacks');
  assert.deepEqual(back.vowsKept, [{ id: 'no_fury', chapter: 1, paid: true }, { id: 'mira_stands', chapter: 1, paid: true }], 'the kept list is not snapshotted');
  assert.equal(back.vow, null);
  assert.deepEqual(vaultIds(back), [BINDING]);
  const again = deserialize(serialize(back));
  assert.deepEqual(again.cave, back.cave); assert.deepEqual(again.vowsKept, back.vowsKept);
});

test('a save written with a cave run and read by code that fills defaults keeps the run as written (no migration rewrites it)', () => {
  const g = newGameEp2('Arden');
  enter(g, { seed: 11, playtime: 0 }); descend(g); foundBookmark(g);
  const json = JSON.stringify(serialize(g));
  const back = deserialize(JSON.parse(json));
  assert.deepEqual(back.cave, JSON.parse(json).cave);
  assert.equal(back.autosaveSlot, 0); assert.equal(back.vow, null); assert.deepEqual(back.vowsKept, []);
  assert.deepEqual(saveMeta(back), saveMeta(g));
});
