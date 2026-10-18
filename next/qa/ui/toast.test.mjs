// The received-item toast's rarity mapping (W5-systems): name color, sound, jingle and the legendary beam.
import test from 'node:test';
import assert from 'node:assert/strict';
import { toastSpec, BEAM_HOLD } from '../../src/ui/toast.js';
import { makeUnique, rollItem } from '../../src/battle/loot.js';
import { createRng } from '../../src/core/rng.js';

test('consumables and key items: gold name, item_get / key_item jingle, no beam', () => {
  const p = toastSpec('potion', 2);
  assert.equal(p.text, 'Received {c:gold}Potion{/c} x2');
  assert.equal(p.jingle, 'item_get'); assert.equal(p.sfx, null); assert.equal(p.beam, false); assert.equal(p.icon, 'potion');
  const k = toastSpec('lantern_of_recall');
  assert.equal(k.jingle, 'key_item'); assert.equal(k.icon, 'lantern'); assert.equal(k.beam, false);
  const u = toastSpec('mystery_thing');
  assert.equal(u.text, 'Received {c:gold}mystery_thing{/c}'); assert.equal(u.icon, 'bag');
});

test('common gear (an id or a plain instance): white name, item_get, weapon icon16', () => {
  const s = toastSpec('iron_pike');
  assert.equal(s.rarity, 'common'); assert.equal(s.jingle, 'item_get'); assert.ok(s.icon16, 'weapons use the 16 px icon');
  const inst = toastSpec({ base: 'chain_shirt', rarity: 'common', affixes: [], name: 'Chain Shirt', uid: 3 });
  assert.equal(inst.text, 'Received {c:common}Chain Shirt{/c}');
  assert.equal(inst.icon, 'armor'); assert.equal(inst.icon16, false); assert.equal(inst.beam, false);
});

test('magic and rare gear: rarity-colored name and the rarity drop sound instead of the jingle', () => {
  const rng = createRng(7);
  const magic = rollItem(rng, { ilvl: 4, rarity: 'magic', base: 'longsword' });
  const m = toastSpec(magic);
  assert.match(m.text, /^Received \{c:magic\}.*Longsword.*\{\/c\}$/);
  assert.equal(m.sfx, 'drop_magic'); assert.equal(m.jingle, null); assert.equal(m.beam, false);
  const rare = rollItem(rng, { ilvl: 5, rarity: 'rare', base: 'iron_helm' });
  const r = toastSpec(rare);
  assert.match(r.text, /^Received \{c:rare\}/);
  assert.equal(r.sfx, 'drop_rare'); assert.equal(r.jingle, null); assert.equal(r.beam, false);
});

test('legendary and set gear: the beam for 1.5 s plus drop_legendary', () => {
  const L = toastSpec(makeUnique('lanternheart'));
  assert.equal(L.text, 'Received {c:legendary}Lanternheart{/c}');
  assert.equal(L.sfx, 'drop_legendary'); assert.equal(L.jingle, null);
  assert.equal(L.beam, true); assert.equal(L.frames, BEAM_HOLD); assert.equal(BEAM_HOLD, 90, '1.5 s at 60 Hz');
  const S = toastSpec(makeUnique('wayfarer_boots'));
  assert.equal(S.rarity, 'set'); assert.equal(S.beam, true); assert.equal(S.sfx, 'drop_legendary');
  assert.match(S.text, /\{c:set\}Wayfarer Boots\{\/c\}/);
  // a unique by id string gets the same treatment as its instance
  const byId = toastSpec('mirrorguard_mail');
  assert.equal(byId.rarity, 'legendary'); assert.equal(byId.beam, true);
});

test('caller overrides: silent, custom sound, beam off', () => {
  const s = toastSpec(makeUnique('lanternheart'), 1, { jingle: false, sfx: false, beam: false, frames: 30 });
  assert.equal(s.jingle, null); assert.equal(s.sfx, null); assert.equal(s.beam, false); assert.equal(s.frames, 30);
  const t = toastSpec('potion', 1, { jingle: 'quest_done' });
  assert.equal(t.jingle, 'quest_done');
});
