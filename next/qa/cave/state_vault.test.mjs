// C1-state: the vault and its no-duplicate rule (src/game/cave.js reconcileVault, plan 2.10, 2.11 and the brief's deliverable 1):
// after enter, bank, enter, bank every vault unique exists exactly once across worn slots and `gear`; a unique worn in the
// overworld stays worn through a reading; a missing copy is added, a surplus is removed from the bag and never from a slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import register from '../../src/data/cave/index.js';
import { newGameEp2, addGear, serialize } from '../../src/game/state.js';
import { equipGear } from '../../src/game/inventory.js';
import { CAVE_UNIQUE_IDS, CAVE_UNIQUES } from '../../src/data/cave/items.js';
import { UNIQUES } from '../../src/data/items.js';
import { enter, foundBlue, foundBookmark, bank, die, clear, descend, vaultIds, reconcileVault, uniqueInstance, BINDER_QUILL_ID } from '../../src/game/cave.js';

await register();

const PEN = 'cave_catalogue_pen', MAIL = 'cave_shelf_mail', HOOD = 'cave_reading_hood', MANTLE = 'cave_damp_mantle', BOOTS = 'cave_root_boots';
const baseOf = (v) => (v ? (typeof v === 'string' ? v : v.base) : null);
/** How many copies of a unique the overworld holds: worn (party and reserve) plus the bag. */
function copies(g, id) {
  let n = 0;
  for (const m of [...g.party, ...(g.reserve || [])]) for (const v of Object.values(m.equip || {})) if (baseOf(v) === id) n++;
  return { worn: n, bag: g.gear.filter((it) => baseOf(it) === id).length };
}
const total = (g, id) => { const c = copies(g, id); return c.worn + c.bag; };

test('enter, bank, enter, bank: every vault unique exists exactly once in the overworld, and once in the run bag at B1', () => {
  const g = newGameEp2('Arden');
  enter(g); foundBlue(g, PEN); foundBlue(g, MAIL); foundBookmark(g); bank(g);
  assert.deepEqual(vaultIds(g), [PEN, MAIL]);
  for (const id of [PEN, MAIL]) assert.equal(total(g, id), 1, `${id} once after the first bank`);
  enter(g);
  for (const id of [PEN, MAIL]) assert.deepEqual(copies(g, id), { worn: 0, bag: 1 }, `${id} once in the run bag`);
  foundBlue(g, HOOD); foundBookmark(g); bank(g);
  assert.deepEqual(vaultIds(g), [PEN, MAIL, HOOD]);
  for (const id of [PEN, MAIL, HOOD]) assert.equal(total(g, id), 1, `${id} once after the second bank`);
  // and a third cycle with nothing found changes no count
  enter(g); foundBookmark(g); bank(g);
  for (const id of [PEN, MAIL, HOOD]) assert.equal(total(g, id), 1, `${id} once after the third bank`);
  assert.equal(g.gear.filter((it) => String(it.base).startsWith('cave_')).length, 3);
});

test('a vault unique worn in the overworld is snapshotted worn, handed to the run as a bag copy, and comes back worn (once)', () => {
  const g = newGameEp2('Arden');
  enter(g); foundBlue(g, MANTLE); foundBookmark(g); bank(g);
  const hero = g.party[0];
  assert.ok(equipGear(g, hero, 'mantle', g.gear.find((it) => it.base === MANTLE).uid).ok);
  assert.deepEqual(copies(g, MANTLE), { worn: 1, bag: 0 });
  const wornBefore = serialize(g).party[0].equip;
  enter(g);
  assert.equal(g.party[0].equip.mantle, null, 'nothing worn in the run');
  assert.deepEqual(copies(g, MANTLE), { worn: 0, bag: 1 }, 'the run has its own copy');
  descend(g); foundBookmark(g); bank(g);
  assert.deepEqual(g.party[0].equip, wornBefore, 'worn exactly as before');
  assert.deepEqual(copies(g, MANTLE), { worn: 1, bag: 0 });
  // the same through a death
  enter(g); die(g);
  assert.deepEqual(g.party[0].equip, wornBefore);
  assert.deepEqual(copies(g, MANTLE), { worn: 1, bag: 0 });
});

test('reconcileVault: a missing copy is added to the bag, a surplus is removed from the bag, never from a worn slot', () => {
  const g = newGameEp2('Arden');
  enter(g); foundBlue(g, PEN); foundBlue(g, BOOTS); foundBookmark(g); bank(g);
  // lose the pen somehow (a debug take, an old bug): it comes back
  g.gear = g.gear.filter((it) => it.base !== PEN);
  assert.deepEqual(reconcileVault(g), { added: [PEN], removed: [] });
  assert.equal(total(g, PEN), 1);
  // three boots: one worn, two in the bag: the bag loses one, the worn one stays
  assert.ok(equipGear(g, g.party[0], 'boots', g.gear.find((it) => it.base === BOOTS).uid).ok);
  addGear(g, uniqueInstance(BOOTS)); addGear(g, uniqueInstance(BOOTS));
  assert.deepEqual(copies(g, BOOTS), { worn: 1, bag: 2 });
  assert.deepEqual(reconcileVault(g), { added: [], removed: [BOOTS, BOOTS] });
  assert.deepEqual(copies(g, BOOTS), { worn: 1, bag: 0 });
  // two worn (two members): nothing in the bag to take, both stay
  g.party[1].equip.boots = uniqueInstance(BOOTS);
  assert.deepEqual(reconcileVault(g), { added: [], removed: [] });
  assert.deepEqual(copies(g, BOOTS), { worn: 2, bag: 0 });
  // a clean state reconciles to nothing
  g.party[1].equip.boots = null;
  assert.deepEqual(reconcileVault(g), { added: [], removed: [] });
  assert.equal(g.party[0].equip.boots.base, BOOTS);
});

test('a snapshot that already holds a copy of a vault unique is not doubled by the exits (the duplicate rule across bank and die)', () => {
  const g = newGameEp2('Arden');
  enter(g); foundBlue(g, PEN); foundBookmark(g); bank(g);
  for (let i = 0; i < 3; i++) { enter(g); foundBookmark(g); bank(g); assert.equal(total(g, PEN), 1, `bank ${i}`); }
  for (let i = 0; i < 3; i++) { enter(g); die(g); assert.equal(total(g, PEN), 1, `die ${i}`); }
  enter(g); while (descend(g) < 100); clear(g);
  assert.equal(total(g, PEN), 1); assert.equal(total(g, BINDER_QUILL_ID), 1);
  enter(g); while (descend(g) < 100); clear(g);
  assert.equal(total(g, BINDER_QUILL_ID), 1);
  assert.deepEqual(vaultIds(g), [PEN, BINDER_QUILL_ID]);
});

test('the whole set: all sixteen blues banked over sixteen readings, each exactly once; the bag at B1 then holds all sixteen', () => {
  const g = newGameEp2('Arden');
  for (const id of CAVE_UNIQUE_IDS) { enter(g); foundBlue(g, id); foundBookmark(g); assert.ok(bank(g).ok); }
  assert.deepEqual(vaultIds(g), CAVE_UNIQUE_IDS);
  for (const id of CAVE_UNIQUE_IDS) assert.equal(total(g, id), 1, id);
  enter(g);
  assert.deepEqual(g.gear.map((it) => it.base), CAVE_UNIQUE_IDS);
  assert.deepEqual(g.gear.map((it) => it.uid), CAVE_UNIQUE_IDS.map((_, i) => i + 1), 'fresh uids from 1');
  for (const it of g.gear) {
    assert.equal(it.unique, true); assert.equal(it.rarity, 'legendary'); assert.deepEqual(it.affixes, []);
    assert.equal(it.name, CAVE_UNIQUES[it.base].name);
    assert.equal(UNIQUES[it.base].noSell, true, 'never sells');
  }
});

test('uniqueInstance throws a clear error for an id the pack has not registered (never a silent empty item)', () => {
  assert.throws(() => uniqueInstance('cave_not_a_thing'), /not registered/);
  const inst = uniqueInstance(PEN);
  assert.equal(inst.base, PEN); assert.equal(inst.uid, undefined);
});
