// Episode 4 seam fixes (E4-seamfix, 2026-11-04): the scene twins Joss / joss_t and Ada / ada_t are never on screen
// together, in crown_remembers, in ep4_ending, or after them; the compound flag they use; and the council shelter's
// inspect line (ep4_shelter) in the house style.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NPCS, isPresent } from '../../src/data/npcs.js';
import { FLAGS } from '../../src/data/quests.js';
import { fits, boxLines } from '../../src/data/story/dialogue.js';
import { register as regFlags } from '../../src/data/ep4/flags.js';
import { register as regNpcs, SCENE_TWIN } from '../../src/data/ep4/npcs.js';
import { EP4_LINES } from '../../src/data/ep4/text.js';
import { scenes, GATE, SCENE_CONDITIONS } from '../../src/data/ep4/story.js';
import { compoundTerms, compoundFlag, withCompound, isCompoundFlag } from '../../src/data/ep4/field/seams.js';
import { runOnce, NEXT } from './_harness.mjs';
import { EP3_DONE } from './ep4_boxes.mjs';

GATE.live = true;
regFlags(); regNpcs();

// The map NPC each scene spawn stands in for (all on ep4_valewyn).
const TWINS = { joss: 'joss_t', ada: 'ada_t' };
const VW_SCENES = ['crown_remembers', 'ep4_ending'];

test('compound flags: all:a,!b reads every term; unknown keys are not compound', () => {
  assert.deepEqual(compoundTerms('all:charter_restored,!ep4_complete'), [['charter_restored', true], ['ep4_complete', false]]);
  assert.equal(compoundTerms('charter_restored'), null);
  assert.equal(isCompoundFlag('all:'), false);
  const h = (set) => (f) => set.has(f);
  assert.equal(compoundFlag(SCENE_TWIN, h(new Set())), false);
  assert.equal(compoundFlag(SCENE_TWIN, h(new Set(['charter_restored']))), true);
  assert.equal(compoundFlag(SCENE_TWIN, h(new Set(['charter_restored', 'vw_restored']))), true);
  assert.equal(compoundFlag(SCENE_TWIN, h(new Set(['charter_restored', 'vw_restored', 'ep4_complete']))), false);
  assert.equal(compoundFlag('tide:c>=2', h(new Set())), undefined);
  // every term is a declared flag
  for (const [f] of compoundTerms(SCENE_TWIN)) assert.ok(f in FLAGS, `term ${f}`);
});

test('Joss and Ada: show conditions hide them through the scene window and bring them back after', () => {
  assert.deepEqual(NPCS.joss.show, { ifNot: SCENE_TWIN });
  assert.deepEqual(NPCS.ada.show, { if: 'vw_arrived', ifNot: SCENE_TWIN });
  const at = (...fl) => withCompound((f) => fl.includes(f));
  const base = ['vw_arrived', 'met_regent', 'met_joss', 'keep_f2_done'];
  for (const id of Object.keys(TWINS)) {
    assert.equal(isPresent(id, at(...base)), true, `${id} before the Keep is won`);
    assert.equal(isPresent(id, at(...base, 'paper_regent_defeated', 'charter_restored')), false, `${id} in crown_remembers`);
    assert.equal(isPresent(id, at(...base, 'charter_restored', 'tide_bell_rung', 'vw_restored')), false, `${id} in ep4_ending`);
    assert.equal(isPresent(id, at(...base, 'charter_restored', 'vw_restored', 'ep4_complete')), true, `${id} after ep4_complete`);
  }
  assert.equal(isPresent('ada', at()), false, 'Ada still waits for vw_arrived');
});

test('the scene window covers every guard of a Valewyn scene that spawns a twin', () => {
  // the scene can only run while its guard holds; the guard must imply the twin window (charter_restored, no ep4_complete)
  for (const id of VW_SCENES) {
    const c = SCENE_CONDITIONS[id];
    const ifs = [c.if].flat().filter(Boolean), nots = [c.ifNot].flat().filter(Boolean);
    const impliesCharter = ifs.includes('charter_restored') || ifs.includes('vw_restored');   // vw_restored is set after charter_restored
    assert.ok(impliesCharter, `${id}: guard implies charter_restored`);
    assert.ok(nots.includes('ep4_complete') || nots.includes('vw_restored'), `${id}: guard implies no ep4_complete`);
  }
});

test('replaying crown_remembers and ep4_ending: never a twin and its NPC at once; exactly one NPC each after', async () => {
  const flags = [...EP3_DONE, 'ep4_started', 'east_road_open', 'saw_valewyn', 'vw_arrived', 'met_regent', 'met_joss', 'keep_ferry_open',
    'keep_f1_done', 'keep_f2_done', 'hero_signed', 'paper_regent_defeated', 'charter_restored', 'lyra_named', 'lyra_truth', 'council_shelter'];
  // the log of the real scene (crown_remembers chains ep4_ending); replay it op by op
  const { log } = await runOnce(scenes.crown_remembers, { flags, branchFlags: false, mapId: 'ep4_valewyn' });
  const ops = log.filter((e) => e.op === 'spawn' || e.op === 'despawn' || e.op === 'setFlag');
  assert.ok(ops.some((e) => e.op === 'setFlag' && e.args[0] === 'ep4_complete'), 'the chain reaches ep4_complete');
  const set = new Set(flags);
  const spawned = new Set();
  const h = withCompound((f) => set.has(f));
  const seen = { joss: 0, ada: 0 };
  const check = (where) => {
    for (const [npc, twin] of Object.entries(TWINS)) {
      const n = (isPresent(npc, h) ? 1 : 0) + (spawned.has(twin) ? 1 : 0);
      assert.ok(n <= 1, `${where}: ${npc} and ${twin} both on screen`);
      if (spawned.has(twin)) seen[npc]++;
    }
  };
  check('scene start');
  for (const [i, e] of ops.entries()) {
    if (e.op === 'spawn') spawned.add(e.args[0]);
    else if (e.op === 'despawn') spawned.delete(e.args[0]);
    else if (e.args[1] !== false) set.add(e.args[0]);
    check(`op ${i} ${e.op} ${e.args[0]}`);
  }
  assert.ok(seen.joss > 0 && seen.ada > 0, 'both twins were spawned in the replay');
  assert.equal(spawned.size, 0, `actors left after the scene: ${[...spawned]}`);
  for (const npc of Object.keys(TWINS)) assert.equal(isPresent(npc, h), true, `${npc} back after ep4_complete`);
});

test('ep4_shelter: the council shelter reads in the house style', () => {
  const v = EP4_LINES.ep4_shelter;
  assert.ok(v, 'ep4_shelter is a line');
  const texts = (Array.isArray(v) ? v : [v]).flatMap((e) => (typeof e === 'string' ? [e] : [e.lines].flat()));
  assert.ok(texts.length >= 2);
  for (const t of texts) {
    assert.ok(/^[\x20-\x7e]*$/.test(t), `ASCII: ${t}`);
    assert.ok(!t.includes(String.fromCharCode(0x2014)), 'no em dash');
    assert.ok(fits(t), `fits a box: ${boxLines(t).join(' / ')}`);
  }
  // the map's shelter object: if it names a line, it is this one (E4-maps-a adds text: 'ep4_shelter' to vw_shelter)
  const src = readFileSync(join(NEXT, 'src', 'data', 'maps', 'ep4_valewyn.js'), 'utf8');
  const m = /object\('vw_shelter'[^\n]*?text: '([a-z0-9_]+)'/.exec(src);
  if (m) assert.equal(m[1], 'ep4_shelter');
});
