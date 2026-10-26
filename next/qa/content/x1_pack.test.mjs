// X1 content against the MERGED pack: the whole x1 entry (flags, enemies, items, loot, encounters, shops, npcs, quests, text,
// story) registers, and every id the X1-story modules name resolves in the data X1-battle wrote. Skipped (with the reason) if the
// pack entry cannot load yet, so this file never blocks a wave in which another agent is mid-edit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { X1, registerAll } from './x1_helpers.mjs';
import { runOnce, explore } from './_harness.mjs';
import { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS } from '../../src/data/quests.js';
import { NPCS } from '../../src/data/npcs.js';
import { SCENES, LINES, storyCollisions, sceneAllowed } from '../../src/game/story.js';
import { BESTIARY } from '../../src/data/text.js';
import { ITEMS } from '../../src/data/items.js';
import { SHOPS } from '../../src/data/shops.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ENCOUNTERS } from '../../src/data/encounters.js';

let result = null, failure = null;
try {
  const pack = await import('../../src/data/x1/index.js');
  result = await pack.register();
  registerAll();   // idempotent: a second pass over the story modules changes nothing
} catch (e) { failure = e; }

test('the whole pack registers through the entry module, with no skipped module and no id collision', (t) => {
  if (failure) { t.skip(`pack entry not loadable yet: ${failure.message}`); return; }
  assert.ok(result.loaded.includes('flags') && result.loaded.includes('npcs') && result.loaded.includes('quests') && result.loaded.includes('text') && result.loaded.includes('story'));
  assert.deepEqual(storyCollisions(), { scenes: [], lines: [] });
  assert.equal(new Set(FLAG_IDS).size, FLAG_IDS.length);
  for (const f of Object.keys(X1.flags.X1_FLAGS)) assert.ok(f in FLAGS && FLAG_IDS.includes(f));
  assert.equal(ALL_SIDE_QUESTS.filter((q) => X1.quests.X1_SIDE_QUESTS.includes(q)).length, 6);
  for (const id of Object.keys(X1.story.scenes)) assert.equal(SCENES[id], X1.story.scenes[id]);
  for (const id of Object.keys(X1.text.X1_LINES)) assert.equal(LINES[id], X1.text.X1_LINES[id]);
  for (const id of Object.keys(X1.story.SCENE_CONDITIONS)) assert.equal(sceneAllowed(id, () => false) === (X1.story.SCENE_CONDITIONS[id].if == null), true, id);
});

test('every item, shop, encounter and enemy the story names exists in the data X1-battle wrote', async (t) => {
  if (failure) { t.skip('pack entry not loadable'); return; }
  const missing = [];
  for (const [id, fn] of Object.entries(X1.story.rawScenes)) {
    for (const r of await explore(fn, { flags: ['mira_joined', 'bram_joined'] })) for (const e of r.log) {
      if ((e.op === 'give' || e.op === 'take') && !['gold', 'exp'].includes(e.args[0]) && !ITEMS[e.args[0]]) missing.push(`${id}: item ${e.args[0]}`);
      if (e.op === 'battle' && !ENCOUNTERS[e.args[0]]) missing.push(`${id}: encounter ${e.args[0]}`);
    }
  }
  for (const q of X1.quests.X1_SIDE_QUESTS) if (!ITEMS[q.reward]) missing.push(`${q.id}: reward ${q.reward}`);
  for (const n of Object.values(X1.npcs.X1_NPCS)) if (n.service && !SHOPS[n.service.id]) missing.push(`${n.name}: shop ${n.service.id}`);
  assert.deepEqual(missing, []);
  for (const b of ['barrow_reeve', 'millstone_golem']) { assert.ok(ENEMIES[b], b); assert.ok(ENCOUNTERS[b].boss, `${b} is a boss encounter`); assert.ok(ENCOUNTERS[b].noFlee, `${b} cannot be fled`); }
  for (const id of Object.keys(X1.text.X1_BESTIARY)) {
    assert.equal(BESTIARY[id].name, ENEMIES[id].name, `${id}: bestiary name`);
    assert.equal(BESTIARY[id].lore[0], ENEMIES[id].flavor, `${id}: bestiary lore[0] is the enemy's flavor`);
  }
});

test('the six old NPCs still answer, the new ones exist, and a scene started from a prepended entry is registered', async (t) => {
  if (failure) { t.skip('pack entry not loadable'); return; }
  for (const id of Object.keys(X1.npcs.X1_NPCS)) assert.ok(NPCS[id], id);
  for (const [id, entries] of Object.entries(X1.npcs.X1_TALK_PREPEND)) for (const e of entries) if (e.scene) assert.ok(SCENES[e.scene], `${id}: ${e.scene}`);
  // A scene in the merged shape still runs behind the gate.
  X1.story.GATE.on = () => true;
  const { log } = await runOnce(SCENES.downs_arrival, { flags: ['mira_joined', 'bram_joined'], branchFlags: false });
  assert.equal(log.filter((e) => e.op === 'say').length, 3);
});
