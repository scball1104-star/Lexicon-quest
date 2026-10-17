import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, addMember, addGear, give, count } from '../../src/game/state.js';
import { memberStats } from '../../src/battle/rules.js';
import * as inv from '../../src/game/inventory.js';

function party() {
  const g = createGame('Arden');
  addMember(g, 'mira'); addMember(g, 'bram');
  return g;
}

test('equipKeys lists weapon types first, then armor slots', () => {
  const g = party();
  assert.deepEqual(inv.equipKeys(g.party[0]), ['sword', 'axe', 'body', 'head', 'charm', 'boots', 'mantle']);
  assert.deepEqual(inv.equipKeys(g.party[1]).slice(0, 2), ['staff', 'bow']);
});

test('fits respects weapon types and who lists', () => {
  const g = party();
  const [hero, mira, bram] = g.party;
  assert.ok(inv.fits(hero, 'sword', 'longsword'));
  assert.ok(!inv.fits(hero, 'axe', 'longsword'), 'a sword never goes in the axe key');
  assert.ok(!inv.fits(mira, 'staff', 'longsword'));
  assert.ok(inv.fits(bram, 'body', 'bronze_plate'));
  assert.ok(!inv.fits(hero, 'body', 'bronze_plate'), 'bronze plate is Bram only');
  assert.ok(inv.fits(mira, 'body', 'scholar_robe'));
  assert.ok(!inv.fits(bram, 'head', 'silver_circlet'));
});

test('equipGear moves instances between the bag and the member, keeps the old piece', () => {
  const g = party();
  const hero = g.party[0];
  const uid = addGear(g, 'longsword');
  assert.equal(g.gear.length, 1);
  const before = memberStats(hero).atk;
  const out = inv.equipGear(g, hero, 'sword', uid);
  assert.ok(out.ok);
  assert.equal(hero.equip.sword.base, 'longsword');
  assert.ok(memberStats(hero).atk > before, 'ATK rose');
  assert.equal(g.gear.length, 1, 'the short sword went back to the bag');
  assert.equal(g.gear[0].base, 'short_sword');
  assert.ok(g.gear[0].uid, 'returned gear has a uid');
  const bad = inv.equipGear(g, hero, 'axe', g.gear[0].uid);
  assert.ok(!bad.ok, 'cannot put a sword in the axe key');
});

test('unequip keeps at least one weapon and clamps HP/MP', () => {
  const g = party();
  const hero = g.party[0];
  assert.ok(!inv.unequip(g, hero, 'sword').ok, 'the only weapon stays');
  const uid = addGear(g, 'hatchet');
  assert.ok(inv.equipGear(g, hero, 'axe', uid).ok);
  assert.ok(inv.unequip(g, hero, 'sword').ok, 'with an axe equipped the sword may come off');
  assert.equal(hero.weapon, 'axe', 'active weapon follows');
  assert.equal(hero.equip.sword, null);
  // Max HP shrink clamps hp.
  const bram = g.party[2];
  const charm = addGear(g, 'bronze_charm');
  inv.equipGear(g, bram, 'charm', charm);
  bram.hp = memberStats(bram).maxHp;
  inv.unequip(g, bram, 'charm');
  assert.ok(bram.hp <= memberStats(bram).maxHp);
});

test('optimize equips the best candidates and removeAll empties what it can', () => {
  const g = party();
  const bram = g.party[2];
  addGear(g, 'iron_pike'); addGear(g, 'chain_shirt'); addGear(g, 'iron_helm'); addGear(g, 'leather_boots'); addGear(g, 'longsword');
  const atk0 = memberStats(bram).atk, def0 = memberStats(bram).def;
  const n = inv.optimize(g, bram);
  assert.ok(n >= 3, `optimize made ${n} changes`);
  assert.equal(bram.equip.spear.base, 'iron_pike');
  assert.equal(bram.equip.body.base, 'chain_shirt');
  assert.ok(memberStats(bram).atk > atk0 && memberStats(bram).def > def0);
  assert.equal(inv.optimize(g, bram), 0, 'second pass changes nothing');
  const removed = inv.removeAll(g, bram);
  assert.ok(removed >= 4);
  assert.ok(bram.equip.spear || bram.equip.axe, 'one weapon stays');
});

test('candidates are sorted best first and exclude ill-fitting gear', () => {
  const g = party();
  const hero = g.party[0];
  addGear(g, 'runed_saber'); addGear(g, 'longsword'); addGear(g, 'oak_staff');
  const c = inv.candidates(g, hero, 'sword');
  assert.deepEqual(c.map((x) => x.item.base), ['runed_saber', 'longsword']);
});

test('buy and sell move gold and items', () => {
  const g = party();
  g.gold = 100;
  assert.ok(inv.buyItem(g, 'potion', 3).ok);
  assert.equal(g.gold, 40); assert.equal(count(g, 'potion'), 5);
  assert.ok(!inv.buyItem(g, 'hi_potion', 1).ok, 'too poor');
  assert.equal(inv.sellConsumable(g, 'potion', 2), 20);
  assert.equal(g.gold, 60); assert.equal(count(g, 'potion'), 3);
  const uid = addGear(g, 'longsword');
  const got = inv.sellGear(g, uid);
  assert.ok(got > 0); assert.equal(g.gear.length, 0);
  assert.equal(inv.sellables(g).length, 1, 'only the potions remain sellable');
  assert.ok(inv.buyItem(g, 'hatchet', 1, 50).ok, 'gear buys at the shop price');
  assert.equal(g.gear[0].base, 'hatchet');
});

test('useItemOnMember heals, restores MP, revives and refuses no-ops', () => {
  const g = party();
  const hero = g.party[0];
  const max = memberStats(hero).maxHp;
  assert.ok(!inv.useItemOnMember(g, 'potion', hero).ok, 'full HP refuses');
  hero.hp = 10;
  const out = inv.useItemOnMember(g, 'potion', hero);
  assert.ok(out.ok); assert.equal(out.hp, Math.min(60, max - 10)); assert.equal(hero.hp, Math.min(max, 70)); assert.equal(count(g, 'potion'), 1);
  hero.hp = max - 5;
  assert.equal(inv.useItemOnMember(g, 'potion', hero).hp, 5, 'caps at max');
  give(g, 'ether', 1); hero.mp = 0;
  assert.equal(inv.useItemOnMember(g, 'ether', hero).mp, 12, 'ether caps at max MP');
  give(g, 'phoenix_feather', 1);
  assert.ok(!inv.useItemOnMember(g, 'phoenix_feather', hero).ok, 'revive needs a fallen member');
  hero.hp = 0;
  assert.ok(!inv.useItemOnMember(g, 'potion', hero).ok, 'potions do not revive');
  const rev = inv.useItemOnMember(g, 'phoenix_feather', hero);
  assert.ok(rev.ok && rev.revived && hero.hp > 0);
  give(g, 'antidote', 1);
  assert.ok(!inv.useItemOnMember(g, 'antidote', hero).ok, 'nothing to cure on the field');
  assert.equal(count(g, 'antidote'), 1, 'refused use keeps the item');
});

test('fieldSkills and useSkillOnMember: Mend heals one, costs MP', () => {
  const g = party();
  const mira = g.party[1], hero = g.party[0];
  const list = inv.fieldSkills(mira);
  assert.ok(list.some((s) => s.id === 'mend'));
  assert.ok(!list.some((s) => s.id === 'ember'), 'attack magic is not field usable');
  hero.hp = 5;
  const mp = mira.mp;
  const out = inv.useSkillOnMember(g, mira, 'mend', hero);
  assert.ok(out.ok && out.healed > 0);
  assert.equal(mira.mp, mp - 4);
  mira.mp = 0;
  assert.ok(!inv.useSkillOnMember(g, mira, 'mend', hero).ok, 'no MP');
});

test('itemLine and gearName describe instances', () => {
  assert.equal(inv.itemLine('iron_pike'), '+14 ATK, +1 DEF');
  assert.equal(inv.gearName('short_sword'), 'Short Sword');
  assert.equal(inv.gearName({ base: 'longsword', name: 'Gleaming Longsword', rarity: 'magic', affixes: [] }), 'Gleaming Longsword');
});
