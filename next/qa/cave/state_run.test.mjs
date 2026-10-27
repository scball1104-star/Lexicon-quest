// C1-state: the Deep Stacks run state (src/game/cave.js) against docs/DEEP_STACKS_PLAN.md sections 2, 7 and 8 and the
// C1-state brief: enter resets exactly, the vault's uniques are in `gear` at B1, bank restores byte for byte except the added
// blues and the spent Bookmark, die restores and drops this run's blues only, record arithmetic, Quit equals die, clear.
import test from 'node:test';
import assert from 'node:assert/strict';
import register from '../../src/data/cave/index.js';
import { createGame, newGameEp2, addMember, addGear, give, count, serialize, deserialize, setFlag } from '../../src/game/state.js';
import { newMember, knownSkills, PARTY } from '../../src/data/party.js';
import { equipGear } from '../../src/game/inventory.js';
import { UNIQUES, KEY_ITEMS } from '../../src/data/items.js';
import { KEEPERS_BOOKMARK_ID, BINDER_QUILL_ID as DATA_QUILL_ID, CAVE_UNIQUES } from '../../src/data/cave/items.js';
import {
  ensureCave, emptyCave, canEnter, enter, descend, foundBlue, foundBookmark, hasBookmark, bookmarks, noteChest, noteKills, bank, die, quit,
  clear, resumeInfo, inRun, floorOf, vaultIds, recordOf, bluesOf, riseAvailable, takeRise, wearsProp, suspendMeta,
  BOOKMARK_ID, BINDER_QUILL_ID, CLEARED_FLAG, FLOORS, RISE_HP, SECOND_LIFE_PROP,
} from '../../src/game/cave.js';

await register();

const PEN = 'cave_catalogue_pen';       // band 1 sword
const MAIL = 'cave_shelf_mail';         // band 1 body (anyone)
const MANTLE = 'cave_damp_mantle';      // band 2 mantle (anyone)
const BINDING = 'cave_forge_binding';   // band 5 body (hero, bram), prop second_life

/** The Episode 2 quick start: Lv 9, three members, worn gear, 900 gold, a bag, ep1_complete set. Plus two loose pieces and a counter. */
function ready() {
  const g = newGameEp2('Arden');
  addGear(g, 'hatchet'); addGear(g, 'leather_boots');
  g.playtime = 1000;
  g.counters.steps = 123;
  g.opened['willowmere:chest_1'] = true;
  return g;
}
const stripCave = (g) => { const s = serialize(g); delete s.cave; return s; };

test('the ids this module hard-codes are the ones C1-data registered', () => {
  assert.equal(BOOKMARK_ID, KEEPERS_BOOKMARK_ID);
  assert.equal(BINDER_QUILL_ID, DATA_QUILL_ID);
  assert.ok(KEY_ITEMS[BOOKMARK_ID] && KEY_ITEMS[BOOKMARK_ID].counted && KEY_ITEMS[BOOKMARK_ID].use === 'cave_bank');
  assert.ok(UNIQUES[BINDER_QUILL_ID] && UNIQUES[BINDER_QUILL_ID].cave);
  assert.equal(CAVE_UNIQUES[BINDING].prop, SECOND_LIFE_PROP);
  assert.equal(FLOORS, 100);
});

test('ensureCave: a new game has no cave; ensureCave fills the exact plan shape once and keeps it', () => {
  const g = createGame('Arden');
  assert.equal(g.cave, undefined);
  const c = ensureCave(g);
  assert.deepEqual(c, { vault: [], record: { floor: 0, readings: 0, clears: 0, time: 0 }, run: null, snapshot: null });
  assert.deepEqual(c, emptyCave());
  assert.equal(ensureCave(g), c, 'the same object the second time');
  assert.equal(inRun(g), false); assert.equal(floorOf(g), 0); assert.deepEqual(vaultIds(g), []); assert.equal(resumeInfo(g), null);
  // a half-broken cave is repaired, not replaced
  g.cave = { vault: [PEN, 7, PEN], record: { floor: '3' }, run: { floor: 5 }, snapshot: null };
  const r = ensureCave(g);
  assert.deepEqual(r.vault, [PEN]);
  assert.deepEqual(r.record, { floor: 0, readings: 0, clears: 0, time: 0 });
  assert.equal(r.run, null, 'a run with no snapshot cannot be restored, so it is dropped');
  assert.equal(inRun(g), false);
});

test('canEnter: needs ep1_complete, a party, and no run in progress', () => {
  const g = createGame('Arden');
  assert.deepEqual(canEnter(g), { ok: false, why: 'ep1_incomplete' });
  assert.equal(enter(g), null, 'enter refuses what canEnter refuses');
  setFlag(g, 'ep1_complete');
  assert.deepEqual(canEnter(g), { ok: true, why: null });
  g.party = [];
  assert.deepEqual(canEnter(g), { ok: false, why: 'no_party' });
  const h = ready();
  assert.ok(enter(h));
  assert.deepEqual(canEnter(h), { ok: false, why: 'in_run' });
  assert.equal(enter(h), null);
});

test('enter resets every member to level 1 exactly: stats, EXP 0, full level-1 HP/MP, level-1 skills, mastery 0, nothing worn', () => {
  const g = ready();
  const r = enter(g, { seed: 42, playtime: 1000 });
  assert.deepEqual(r, { seed: 42, floor: 1, vault: [] });
  assert.equal(g.party.length, 3);
  for (const m of g.party) {
    const fresh = newMember(m.id, { level: 1, name: m.name });
    assert.equal(m.level, 1); assert.equal(m.exp, 0); assert.equal(m.fury, 0);
    assert.equal(m.hp, fresh.hp); assert.equal(m.mp, fresh.mp);
    assert.equal(m.name, m.id === 'hero' ? 'Arden' : PARTY[m.id].name);
    assert.equal(m.weapon, PARTY[m.id].start.weapon);
    assert.deepEqual(Object.keys(m.equip).sort(), Object.keys(fresh.equip).sort());
    for (const v of Object.values(m.equip)) assert.equal(v, null, `${m.id} wears nothing`);
    assert.deepEqual(m.mastery, Object.fromEntries(PARTY[m.id].weapons.map((w) => [w, 0])));
    assert.deepEqual(knownSkills(m).sort(), knownSkills(fresh).sort(), `${m.id} knows the level-1 skills only`);
  }
  assert.deepEqual(g.gear, []); assert.equal(g.gearNext, 1);
  assert.deepEqual(g.items, {}); assert.equal(g.gold, 0);
  // untouched: flags, counters, opened, bestiary, map, pos, playtime
  assert.equal(g.flags.ep1_complete, true); assert.equal(g.counters.steps, 123); assert.equal(g.opened['willowmere:chest_1'], true);
  assert.equal(g.map, 'hero_home'); assert.equal(g.playtime, 1000);
  // the run and the snapshot
  assert.equal(inRun(g), true); assert.equal(floorOf(g), 1);
  assert.deepEqual(g.cave.run, { seed: 42, floor: 1, blues: [], chests: 0, kills: 0, started: 1000, lastBlueFloor: 0, rises: [] });
  assert.deepEqual(recordOf(g), { floor: 1, readings: 1, clears: 0, time: 0 });
  assert.deepEqual(Object.keys(g.cave.snapshot).sort(), ['gear', 'gearNext', 'gold', 'items', 'lastSafe', 'map', 'party', 'playtime', 'pos', 'reserve']);
  assert.equal(g.cave.snapshot.party[0].level, 9);
  assert.equal(g.cave.snapshot.gold, 900);
  assert.deepEqual(resumeInfo(g), { floor: 1, seed: 42, blues: 0 });
});

test('enter: the seed defaults from the game seed and the reading number; it is a uint32 and differs between readings', () => {
  const a = ready(); a.seed = 777;
  const r1 = enter(a); die(a);
  const r2 = enter(a); die(a);
  const b = ready(); b.seed = 777;
  assert.equal(enter(b).seed, r1.seed, 'the same game seed and reading give the same run seed');
  assert.notEqual(r1.seed, r2.seed);
  for (const s of [r1.seed, r2.seed]) assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff);
});

test('enter clears the generated floors\' one-shot keys (closed chests again next reading) and keeps every other key', () => {
  const g = ready();
  g.opened['cave_b12:chest_3'] = true; g.opened['cave_b100:door'] = true; g.opened['cave_landing0:plaque'] = true;
  enter(g);
  assert.deepEqual(Object.keys(g.opened).sort(), ['cave_landing0:plaque', 'willowmere:chest_1']);
});

test('the vault\'s uniques are in `gear` at B1 with fresh uids, nothing worn, and a second enter builds them again', () => {
  const g = ready();
  enter(g); foundBlue(g, PEN); foundBlue(g, MAIL); foundBookmark(g); bank(g);
  assert.deepEqual(vaultIds(g), [PEN, MAIL]);
  const r = enter(g);
  assert.deepEqual(r.vault, [PEN, MAIL]);
  assert.deepEqual(g.gear.map((it) => [it.base, it.uid, it.unique, it.rarity]), [[PEN, 1, true, 'legendary'], [MAIL, 2, true, 'legendary']]);
  assert.equal(g.gearNext, 3);
  for (const m of g.party) for (const v of Object.values(m.equip)) assert.equal(v, null, 'not auto-equipped (the Archivist reminds the player)');
  assert.deepEqual(g.items, {}); assert.equal(g.gold, 0);
});

test('descend counts up to 100 and keeps the record\'s deepest floor; the counters note chests and kills', () => {
  const g = ready();
  assert.equal(descend(g), 0, 'not in a run');
  enter(g);
  assert.equal(descend(g), 2); assert.equal(descend(g), 3);
  assert.equal(floorOf(g), 3); assert.equal(recordOf(g).floor, 3);
  for (let i = 0; i < 200; i++) descend(g);
  assert.equal(floorOf(g), 100); assert.equal(recordOf(g).floor, 100);
  assert.equal(noteChest(g), 1); assert.equal(noteChest(g), 2); assert.equal(noteKills(g, 3), 3); assert.equal(noteKills(g), 4);
  assert.equal(g.cave.run.chests, 2); assert.equal(g.cave.run.kills, 4);
});

test('foundBlue: adds to run.blues and `gear`, remembers the floor, refuses duplicates, non-cave items and out-of-run calls', () => {
  const g = ready();
  assert.equal(foundBlue(g, PEN), null, 'not in a run');
  enter(g); descend(g); descend(g);
  const uid = foundBlue(g, PEN);
  assert.equal(uid, 1);
  assert.deepEqual(bluesOf(g), [PEN]);
  assert.equal(g.cave.run.lastBlueFloor, 3);
  assert.deepEqual(g.gear.map((it) => [it.base, it.uid]), [[PEN, 1]]);
  assert.equal(foundBlue(g, PEN), null, 'the same blue twice');
  assert.equal(foundBlue(g, 'lanternheart'), null, 'not a cave unique');
  assert.equal(foundBlue(g, 'no_such_thing'), null);
  assert.equal(g.gear.length, 1);
  assert.deepEqual(vaultIds(g), [], 'the vault only changes on bank');
});

test('the Bookmark: a counted key item; foundBookmark, hasBookmark, bookmarks', () => {
  const g = ready(); enter(g);
  assert.equal(hasBookmark(g), false); assert.equal(bookmarks(g), 0);
  assert.equal(foundBookmark(g), 1); assert.equal(foundBookmark(g, 2), 3);
  assert.equal(hasBookmark(g), true); assert.equal(bookmarks(g), 3); assert.equal(count(g, BOOKMARK_ID), 3);
});

test('bank with no blues restores every snapshot field byte for byte (the whole game minus `cave` is as before the run)', () => {
  const g = ready();
  const before = stripCave(g);
  enter(g, { playtime: 1000 }); descend(g); descend(g);
  // the run changes everything it may touch
  g.party[0].level = 7; g.party[0].exp = 999; g.party[0].hp = 1; g.party[1].mastery.staff = 50;
  addGear(g, 'iron_pike'); equipGear(g, g.party[2], 'spear', g.gear[0].uid);
  give(g, 'potion', 5); g.gold = 321; g.map = 'cave_b3'; g.pos = { x: 1, y: 1, dir: 'up' }; g.lastSafe = { map: 'cave_b3', pos: { x: 1, y: 1, dir: 'up' } };
  foundBookmark(g);
  assert.deepEqual(bank(g, { playtime: 1300 }), { ok: true, floor: 3, blues: [], elapsed: 300, bookmarkUsed: true });
  assert.deepEqual(stripCave(g), before);
  assert.equal(inRun(g), false); assert.equal(resumeInfo(g), null);
  assert.deepEqual(g.cave, { vault: [], record: { floor: 3, readings: 1, clears: 0, time: 300 }, run: null, snapshot: null, inRun: false });
});

test('bank refuses outside a run and without a Bookmark, changing nothing', () => {
  const g = ready();
  assert.deepEqual(bank(g), { ok: false, why: 'not_in_run' });
  enter(g); descend(g); foundBlue(g, PEN);
  const mid = serialize(g);
  assert.deepEqual(bank(g), { ok: false, why: 'no_bookmark' });
  assert.deepEqual(serialize(g), mid);
  assert.equal(inRun(g), true);
});

test('bank with blues: the snapshot comes back, then this run\'s blues join the vault and `gear` (uids continue the snapshot\'s)', () => {
  const g = ready();
  const before = stripCave(g);
  enter(g); descend(g); foundBlue(g, PEN); descend(g); foundBlue(g, MAIL); foundBookmark(g, 2);
  const r = bank(g, { playtime: 1000 });
  assert.deepEqual(r, { ok: true, floor: 3, blues: [PEN, MAIL], elapsed: 0, bookmarkUsed: true });
  assert.deepEqual(vaultIds(g), [PEN, MAIL]);
  const after = stripCave(g);
  assert.deepEqual(after.gear.slice(0, before.gear.length), before.gear, 'the old bag first, untouched');
  assert.deepEqual(after.gear.slice(before.gear.length).map((it) => [it.base, it.uid]), [[PEN, before.gearNext], [MAIL, before.gearNext + 1]]);
  assert.equal(after.gearNext, before.gearNext + 2);
  assert.equal(count(g, BOOKMARK_ID), 0, 'spares are the Stacks\' too: run items do not come out');
  for (const k of Object.keys(before)) if (k !== 'gear' && k !== 'gearNext') assert.deepEqual(after[k], before[k], `${k} restored`);
});

test('a blue worn in the run stays worn on the restored member when that slot is free, else goes to `gear`', () => {
  const g = ready();
  enter(g);
  foundBlue(g, PEN); foundBlue(g, MANTLE);
  const hero = g.party[0];
  assert.ok(equipGear(g, hero, 'sword', g.gear.find((it) => it.base === PEN).uid).ok);
  assert.ok(equipGear(g, hero, 'mantle', g.gear.find((it) => it.base === MANTLE).uid).ok);
  const idOf = (v) => (typeof v === 'string' ? v : v && v.base);   // the quick start wears base ids, a played save wears instances
  assert.equal(idOf(g.cave.snapshot.party[0].equip.sword), 'lanternheart', 'the overworld hero holds Lanternheart in that slot');
  assert.equal(g.cave.snapshot.party[0].equip.mantle, null, 'and wears no mantle');
  foundBookmark(g);
  assert.ok(bank(g).ok);
  const h = g.party[0];
  assert.equal(h.level, 9);
  assert.equal(idOf(h.equip.sword), 'lanternheart', 'the overworld sword is back');
  assert.equal(h.equip.mantle && h.equip.mantle.base, MANTLE, 'the mantle stays worn: the slot was free');
  assert.equal(h.equip.mantle.uid, undefined, 'a worn instance carries no uid');
  assert.deepEqual(g.gear.filter((it) => it.base === PEN).length, 1, 'the pen went to the bag: the slot was taken');
  assert.deepEqual(g.gear.filter((it) => it.base === MANTLE).length, 0);
  assert.deepEqual(vaultIds(g), [PEN, MANTLE]);
});

test('die restores the snapshot and drops this run\'s blues only; the vault from earlier runs and the record\'s floor are kept', () => {
  const g = ready();
  enter(g); foundBlue(g, PEN); foundBookmark(g); bank(g, { playtime: 1100 });
  const before = stripCave(g);
  assert.equal(before.gear.filter((it) => it.base === PEN).length, 1);
  enter(g, { playtime: 1100 });
  for (let i = 0; i < 24; i++) descend(g);
  foundBlue(g, MAIL); foundBlue(g, MANTLE); foundBookmark(g);
  g.party[1].hp = 0; g.gold = 500;
  const r = die(g, { playtime: 1700 });
  assert.deepEqual(r, { ok: true, floor: 25, lost: [MAIL, MANTLE], elapsed: 600, cause: 'wipe' });
  assert.deepEqual(stripCave(g), before, 'the overworld, the pen included, exactly as it was');
  assert.deepEqual(vaultIds(g), [PEN]);
  assert.deepEqual(recordOf(g), { floor: 25, readings: 2, clears: 0, time: 700 });
  assert.equal(inRun(g), false);
  assert.deepEqual(die(g), { ok: false, why: 'not_in_run' });
});

test('Quit equals die: the same result and the same game afterwards, with cause "quit"', () => {
  const a = ready(); enter(a, { seed: 5, playtime: 1000 }); descend(a); foundBlue(a, PEN); foundBookmark(a);
  const b = deserialize(serialize(a));
  const ra = die(a, { playtime: 1200 });
  const rb = quit(b, { playtime: 1200 });
  assert.equal(ra.cause, 'wipe'); assert.equal(rb.cause, 'quit');
  delete ra.cause; delete rb.cause;
  assert.deepEqual(rb, ra);
  assert.deepEqual(serialize(b), serialize(a));
});

test('record arithmetic over readings: readings count every enter, floor is the deepest ever, time sums every exit', () => {
  const g = ready();
  enter(g, { playtime: 0 }); for (let i = 0; i < 9; i++) descend(g); foundBookmark(g); bank(g, { playtime: 100 });
  assert.deepEqual(recordOf(g), { floor: 10, readings: 1, clears: 0, time: 100 });
  enter(g, { playtime: 100 }); descend(g); die(g, { playtime: 130 });
  assert.deepEqual(recordOf(g), { floor: 10, readings: 2, clears: 0, time: 130 });
  enter(g, { playtime: 130 }); for (let i = 0; i < 30; i++) descend(g); quit(g, { playtime: 500 });
  assert.deepEqual(recordOf(g), { floor: 31, readings: 3, clears: 0, time: 500 });
  enter(g, { playtime: 500 }); for (let i = 0; i < 99; i++) descend(g); clear(g, { playtime: 900 });
  assert.deepEqual(recordOf(g), { floor: 100, readings: 4, clears: 1, time: 900 });
  // elapsed never goes negative on a bad clock
  enter(g, { playtime: 900 }); const r = die(g, { playtime: 10 });
  assert.equal(r.elapsed, 0); assert.equal(recordOf(g).time, 900);
});

test('clear (B100): banks without a Bookmark, keeps a held one unspent, puts the Quill in the vault once, sets the flag, counts the clear', () => {
  const g = ready();
  enter(g, { playtime: 0 });
  while (descend(g) < 100);
  foundBlue(g, PEN);
  assert.equal(hasBookmark(g), false);
  const r = clear(g, { playtime: 50 });
  assert.deepEqual(r, { ok: true, floor: 100, blues: [PEN, BINDER_QUILL_ID], elapsed: 50, bookmarkUsed: false, cleared: true });
  assert.equal(g.flags[CLEARED_FLAG], true);
  assert.deepEqual(vaultIds(g), [PEN, BINDER_QUILL_ID]);
  assert.equal(g.gear.filter((it) => it.base === BINDER_QUILL_ID).length, 1);
  assert.equal(g.party[0].level, 9, 'restored');
  assert.deepEqual(recordOf(g), { floor: 100, readings: 1, clears: 1, time: 50 });
  // a second clear with a Bookmark held: not spent, the Quill not doubled, clears 2
  enter(g, { playtime: 50 }); while (descend(g) < 100); foundBookmark(g);
  const r2 = clear(g, { playtime: 80 });
  assert.equal(r2.bookmarkUsed, false);
  assert.deepEqual(r2.blues, []);
  assert.deepEqual(vaultIds(g), [PEN, BINDER_QUILL_ID]);
  assert.equal(g.gear.filter((it) => it.base === BINDER_QUILL_ID).length, 1);
  assert.equal(recordOf(g).clears, 2);
  assert.deepEqual(clear(g), { ok: false, why: 'not_in_run' });
});

test('the second_life prop: one rise per wearer per reading; reset by the next reading; nothing outside a run', () => {
  const g = ready();
  assert.equal(riseAvailable(g, 'bram'), false);
  enter(g); foundBlue(g, BINDING);
  assert.equal(riseAvailable(g, 'bram'), false, 'in the bag, not worn');
  assert.ok(equipGear(g, g.party[2], 'body', g.gear.find((it) => it.base === BINDING).uid).ok);
  assert.equal(wearsProp(g.party[2], SECOND_LIFE_PROP), true);
  assert.equal(riseAvailable(g, 'bram'), true);
  assert.equal(riseAvailable(g, 'hero'), false);
  assert.deepEqual(takeRise(g, 'bram'), { member: 'bram', hpFrac: RISE_HP });
  assert.equal(riseAvailable(g, 'bram'), false, 'spent');
  assert.equal(takeRise(g, 'bram'), null);
  assert.deepEqual(g.cave.run.rises, ['bram']);
  foundBookmark(g); bank(g);
  assert.equal(riseAvailable(g, 'bram'), false, 'not in a run');
  enter(g);
  assert.equal(riseAvailable(g, 'bram'), false, 'the Binding is in the bag at B1');
  assert.ok(equipGear(g, g.party[2], 'body', g.gear.find((it) => it.base === BINDING).uid).ok);
  assert.equal(riseAvailable(g, 'bram'), true, 'a new reading, a new rise');
});

test('suspendMeta carries the usual summary plus the floor and seed inside a run, and nothing extra outside one', () => {
  const g = ready();
  assert.equal(suspendMeta(g).cave, undefined);
  enter(g, { seed: 9 }); for (let i = 0; i < 22; i++) descend(g);
  const m = suspendMeta(g);
  assert.deepEqual(m.cave, { floor: 23, seed: 9 });
  assert.equal(m.name, 'Arden'); assert.equal(m.level, 1); assert.deepEqual(m.party, ['hero', 'mira', 'bram']);
});

test('reserve members are snapshotted and restored but not reset (nothing reads reserve today; only the party enters)', () => {
  const g = ready();
  g.reserve = [newMember('bram', { level: 6 })]; g.party = g.party.filter((m) => m.id !== 'bram');
  enter(g);
  assert.equal(g.reserve[0].level, 6);
  assert.equal(g.party.length, 2);
  foundBookmark(g); bank(g);
  assert.equal(g.reserve[0].level, 6); assert.equal(g.party.length, 2); assert.equal(g.party[0].level, 9);
});

test('a one-member party enters and comes back whole (Episode 1 before Mira joins is gated by ep1_complete, but the shape holds)', () => {
  const g = createGame('Arden'); setFlag(g, 'ep1_complete'); g.party[0].level = 4; g.party[0].exp = 148;
  const before = stripCave(g);
  assert.ok(enter(g));
  assert.equal(g.party[0].level, 1);
  foundBookmark(g);
  assert.ok(bank(g).ok);
  assert.deepEqual(stripCave(g), before);
  addMember(g, 'mira');
  assert.ok(enter(g)); assert.equal(g.party[1].level, 1);
});
