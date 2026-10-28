// H7-hard-road: Fine Print's carry (src/data/tier/tier.js carryRecord). Scott 2026-10-27: "carry the character into the tier".
// Kept: levels, EXP, mastery, gear (worn and in the bag), the bag's consumables, gold, the bestiary, the vows kept.
// Reset: story flags (cold_open_done with them, so the cold open plays), key items, opened chests, counters, the vow carried.
// Mira and Bram wait in `reserve` and join at their own scenes (state.js addMember moves a reserve member into the party).
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGameEp3, addMember, addGear, give, serialize, deserialize, member, createGame } from '../../src/game/state.js';
import { coldOpenWanted, coldOpenEntry } from '../../src/scenes/prologue.js';
import { vowsPaid } from '../../src/game/vows.js';
import { memberStats } from '../../src/battle/rules.js';
import { KEY_ITEMS } from '../../src/data/items.js';
import { carryRecord, tierOf, TIER_FLAG } from '../../src/data/tier/tier.js';

/** A finished Episode 2 record: the Episode 3 quick start's party (Lv 13, ep2_complete), lived in a little. */
function finished() {
  const g = newGameEp3('Arden', { slot: 2, seed: 7 });
  addGear(g, 'silverglass_blade');
  addGear(g, { base: 'glass_helm', rarity: 'rare', ilvl: 12, name: 'Pale Watch', affixes: [{ id: 'of_clarity', tier: 3, value: 80 }] });
  give(g, 'archive_key', 2);
  g.opened = { 'valley:chest_1': true };
  g.counters = { battles: 412, credits_rolled: 1, credits2_rolled: 1 };
  g.bestiary = { briar_wolf: { seen: true, killed: 9, weak: ['fire'] } };
  g.vowsKept = [{ id: 'no_flee', chapter: 1, paid: true }, { id: 'no_heal', chapter: 2, paid: true }];
  g.vow = { id: 'no_flee', chapter: 2, battles: 410, state: 'active', brokenBy: null };
  g.playtime = 21600;
  g.party[1].mastery.bow = 222;
  return serialize(g);
}

test('the carry keeps the character: levels, EXP, mastery, worn gear, the bag, gold, the bestiary', () => {
  const rec = finished();
  const g = carryRecord(rec, { slot: 1, seed: 3 });
  assert.equal(g.heroName, 'Arden');
  assert.deepEqual(g.party.map((m) => m.id), ['hero'], 'the hero starts alone, as the story does');
  const src = deserialize(rec);
  for (const m of [...g.party, ...g.reserve]) {
    const was = src.party.find((x) => x.id === m.id);
    assert.equal(m.level, was.level, `${m.id} level`);
    assert.equal(m.exp, was.exp, `${m.id} EXP`);
    assert.deepEqual(m.mastery, was.mastery, `${m.id} mastery`);
    assert.deepEqual(m.equip, was.equip, `${m.id} worn gear`);
    assert.equal(m.weapon, was.weapon);
    const s = memberStats(m);
    assert.equal(m.hp, s.maxHp, `${m.id} rested`); assert.equal(m.mp, s.maxMp); assert.equal(m.fury, 0);
  }
  assert.equal(g.reserve.find((m) => m.id === 'mira').mastery.bow, 222);
  assert.deepEqual(g.gear, src.gear, 'the bag of gear');
  assert.ok(g.gearNext > Math.max(...g.gear.map((it) => it.uid)), 'new gear never reuses a carried uid');
  assert.equal(g.gold, src.gold);
  assert.deepEqual(g.bestiary, src.bestiary);
  assert.equal(g.playtime, src.playtime);
  for (const [id, q] of Object.entries(src.items)) {
    if (KEY_ITEMS[id]) assert.ok(!(id in g.items), `${id}: a key item is the story's and starts over`);
    else assert.equal(g.items[id], q, `${id}: the bag's consumables`);
  }
});

test('the carry resets the story: flags (only tier_1), chests, counters, the vow carried; chapter 1, so the cold open plays', () => {
  const g = carryRecord(finished(), { slot: 1 });
  assert.deepEqual(g.flags, { [TIER_FLAG]: true });
  assert.equal(g.tier, 1);
  assert.equal(tierOf(g), 1);
  assert.equal(tierOf(createGame('Pip')), 0, 'a new game is not the tier');
  assert.equal(tierOf(deserialize(finished())), 0, 'nor is the finished record itself');
  assert.deepEqual(g.opened, {}, 'every chest is closed again');
  assert.deepEqual(g.counters, {});
  assert.equal(g.chapter, 1);
  assert.equal(g.vow, null, 'no vow is carried in progress');
  assert.ok(coldOpenWanted(g), 'cold_open_done reset with the rest');
  assert.equal(coldOpenEntry(g).map, 'bell_tower');
  assert.equal(g.autosaveSlot, 1, 'the run saves to its own slot');
  assert.equal(carryRecord(finished(), { slot: 0 }).autosaveSlot, 0);
});

test('the vows kept are carried, and this lap\'s vows pay again', () => {
  const g = carryRecord(finished(), { slot: 1 });
  assert.equal(g.vowsKept.length, 2, 'carried');
  assert.ok(g.vowsKept.every((k) => k.chapter === 0), 'marked as kept before the tier');
  assert.equal(vowsPaid(g, 1), 0, 'chapter 1 of this lap starts with nothing paid');
  assert.equal(vowsPaid(g, 2), 0);
});

test('Mira and Bram wait in reserve and join at their scenes with everything they carried', () => {
  const g = carryRecord(finished(), { slot: 1 });
  assert.deepEqual(g.reserve.map((m) => m.id), ['mira', 'bram']);
  const mira = g.reserve[0];
  const kept = JSON.parse(JSON.stringify(mira));
  const joined = addMember(g, 'mira');
  assert.deepEqual(g.party.map((m) => m.id), ['hero', 'mira'], 'the library scene\'s addMember brings her in');
  assert.deepEqual(g.reserve.map((m) => m.id), ['bram']);
  assert.equal(joined, g.party[1]);
  assert.deepEqual(JSON.parse(JSON.stringify(joined)), kept, 'her level, gear and mastery as carried');
  addMember(g, 'mira');
  assert.equal(g.party.length, 2, 'a second addMember is a no-op');
  addMember(g, 'bram');
  assert.deepEqual(g.party.map((m) => m.id), ['hero', 'mira', 'bram']);
  assert.equal(g.reserve.length, 0);
  assert.equal(member(g, 'bram').level, deserialize(finished()).party.find((m) => m.id === 'bram').level);
});

test('off the tier addMember is unchanged: an empty reserve, a new member at the leader\'s level', () => {
  const g = createGame('Pip');
  g.party[0].level = 4;
  const m = addMember(g, 'mira');
  assert.equal(m.level, 4);
  assert.deepEqual(g.party.map((x) => x.id), ['hero', 'mira']);
  const bare = { party: [{ id: 'hero', level: 2 }] };
  assert.equal(addMember(Object.assign(bare, { reserve: [] }), 'bram').id, 'bram');
});

test('a tier record can be carried again (a finished Fine Print run): the flag is set once', () => {
  const lap = carryRecord(finished(), { slot: 1 });
  lap.flags.ep2_complete = true;
  const again = carryRecord(serialize(lap), { slot: 3 });
  assert.deepEqual(again.flags, { [TIER_FLAG]: true });
  assert.equal(again.autosaveSlot, 3);
  assert.equal(carryRecord(null), null);
});
