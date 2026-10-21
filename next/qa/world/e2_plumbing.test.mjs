// Episode 2 story plumbing (E2-world, EPISODE2_PLAN 5.5 and 5.6): both episodes' scenes and lines merged, the
// conditional map fields, the Episode 2 credits handoff, the quick start, the cutscene's gold, reflection rules,
// mirror and fog transitions, mist areas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneById, sceneIds, inspectBoxes, storyCollisions, pickConditional, bannerFor, tintFor, creditsPending, markCreditsRolled, CREDITS_HANDOFF, CREDITS_EP2 } from '../../src/game/story.js';
import { scenes as EP1, lines as EP1_LINES } from '../../src/data/story/ep1.js';
import { scenes as EP2, lines as EP2_LINES } from '../../src/data/story/ep2.js';
import { newGameEp2, EP1_DONE_FLAGS, EP2_START, createGame } from '../../src/game/state.js';
import { FLAGS } from '../../src/data/quests.js';
import { ITEMS } from '../../src/data/items.js';
import { LOADOUTS } from '../../tools/sim/loadouts.mjs';
import { reflectionStyle, hasNoReflection, inGlass } from '../../src/world/reflections.js';
import { transitionOpts } from '../../src/world/transitions.js';
import { mistAreasOf } from '../../src/scenes/field.js';
import { Cutscene } from '../../src/world/cutscene.js';
import { TINTS, LAMP_TINTS, NIGHT_TINTS } from '../../src/world/lighting.js';

test('both episodes are merged: every scene and line resolves, and no id is shared', () => {
  assert.deepEqual(storyCollisions(), { scenes: [], lines: [] });
  for (const id of Object.keys(EP1)) assert.equal(sceneById(id), EP1[id]);
  for (const id of Object.keys(EP2)) assert.equal(sceneById(id), EP2[id]);
  assert.equal(sceneIds().length, Object.keys(EP1).length + Object.keys(EP2).length);
  const no = () => false;
  for (const id of Object.keys(EP2_LINES)) assert.notEqual(inspectBoxes(id, no)[0].text, `(${id})`, id);
  for (const id of Object.keys(EP1_LINES)) assert.notEqual(inspectBoxes(id, no)[0].text, `(${id})`, id);
});

test('conditional map fields: first match wins, plain values pass through', () => {
  const music = [{ if: 'nh_restored', id: 'hollowmere' }, { id: 'hollow' }];
  assert.equal(pickConditional(music, () => false), 'hollow');
  assert.equal(pickConditional(music, (f) => f === 'nh_restored'), 'hollowmere');
  assert.equal(pickConditional('valley', () => false), 'valley');
  assert.equal(pickConditional([{ if: 'x', id: 'a' }], () => false), null);
  assert.equal(pickConditional([{ ifNot: 'x', id: 'a' }, { id: 'b' }], () => true), 'b');
  const tint = [{ if: 'nh_restored', id: 'none' }, { id: 'hollow_dusk' }];
  assert.equal(tintFor('nameless_hollow', tint, () => false), 'hollow_dusk');
  assert.equal(tintFor('nameless_hollow', tint, () => true), 'none');
  assert.equal(tintFor('valley', undefined, () => false), 'none');
});

test('banners with states: the Nameless Hollow becomes Hollowmere', () => {
  assert.equal(bannerFor('nameless_hollow', null, () => false).title, 'Nameless Hollow');
  const b = bannerFor('nameless_hollow', null, (f) => f === 'nh_restored');
  assert.deepEqual(b, { title: 'Hollowmere', sub: 'The Remembered Square' });
  assert.equal(bannerFor('willowmere', null, () => true).title, 'Willowmere');
  assert.equal(bannerFor('nameless_hollow').title, 'Nameless Hollow', 'callers without flags get the base banner');
});

test('the credits handoffs: Episode 1, then Episode 2 with its own cards, counter and wake point', () => {
  const g = createGame('A');
  const has = (f) => !!g.flags[f];
  assert.equal(creditsPending(g, has), 0);
  g.flags.ep1_complete = true;
  assert.equal(creditsPending(g, has), 1);
  markCreditsRolled(g, 1);
  assert.equal(creditsPending(g, has), 0);
  g.flags.ep2_complete = true;
  assert.equal(creditsPending(g, has), 2);
  markCreditsRolled(g, 2);
  assert.equal(g.counters.credits2_rolled, 1);
  assert.equal(creditsPending(g, has), 0);
  assert.equal(CREDITS_HANDOFF[2].cards, CREDITS_EP2);
  assert.deepEqual([CREDITS_HANDOFF[2].map, CREDITS_HANDOFF[2].mark, CREDITS_HANDOFF[2].music], ['nh_inn', 'inn_bed', 'hollowmere']);
  assert.deepEqual([CREDITS_HANDOFF[1].map, CREDITS_HANDOFF[1].mark], ['hero_home', 'bed']);
});

test('newGameEp2: a Lv 9 party in the simulator\'s east_road loadout, Episode 1 done, in bed at home', () => {
  const g = newGameEp2('Arden', { seed: 7 });
  assert.equal(g.heroName, 'Arden');
  assert.deepEqual(g.party.map((m) => [m.id, m.level]), [['hero', 9], ['mira', 9], ['bram', 9]]);
  const L = LOADOUTS.east_road;
  for (const m of g.party) {
    assert.equal(m.weapon, L[m.id].weapon, `${m.id} weapon`);
    for (const [slot, id] of Object.entries(L[m.id].equip)) assert.equal(m.equip[slot], id, `${m.id} ${slot}`);
    assert.deepEqual({ ...m.mastery, ...L[m.id].mastery }, m.mastery, `${m.id} mastery`);
    assert.ok(m.hp > 0 && m.mp >= 0 && m.exp > 0);
  }
  assert.equal(g.gold, 900);
  assert.deepEqual(g.items, { potion: 6, hi_potion: 3, ether: 4, phoenix_feather: 1, name_fragment_1: 1, lantern_of_recall: 1 });
  for (const f of ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done',
    'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'ep1_complete']) assert.equal(g.flags[f], true, f);
  for (const f of EP1_DONE_FLAGS) assert.ok(FLAGS[f], `${f} is a declared flag`);
  assert.ok(!g.flags.ep2_started && !g.flags.ep2_morning_done, 'Episode 2 has not begun');
  assert.equal(g.counters.credits_rolled, 1);
  assert.deepEqual([g.map, g.pos.x, g.pos.y], ['hero_home', 4, 3]);
  for (const id of Object.keys(EP2_START.items)) assert.ok(ITEMS[id], `${id} exists`);
  assert.equal(creditsPending(g, (f) => !!g.flags[f]), 0, 'no credits roll on waking');
});

test('newGameEp2 starts at Episode 1\'s full-clear EXP, so a fresh start meets the Episode 2 curve (W11)', async () => {
  const { progression } = await import('../../tools/sim/simulate.mjs');
  const ep1End = progression(1).at(-1).exp;
  assert.equal(EP2_START.exp, ep1End, 'EP2_START.exp follows the simulator\'s Episode 1 full clear');
  for (const m of newGameEp2('Arden', { seed: 7 }).party) assert.equal(m.exp, ep1End, `${m.id} exp`);
});

test('the cutscene API gives gold: give(\'gold\', n)', async () => {
  const got = [];
  const F = { engine: { waitFrames: async () => {} }, giveGold: async (n) => got.push(['gold', n]), giveItem: async (id, q) => got.push([id, q]) };
  const cs = new Cutscene(F);
  await cs.api.give('gold', 90);
  await cs.api.give('hi_ether', 2);
  assert.deepEqual(got, [['gold', 90], ['hi_ether', 2]]);
});

test('reflections: who has a face in the water', () => {
  const before = () => false, after = (f) => f === 'nh_restored';
  const A = (id, kind, spriteId = 'npc_farmer') => ({ id, kind, spriteId, visible: true, alpha: 1 });
  // a Hollow NPC record says noReflection: none until the town is restored
  assert.equal(reflectionStyle(A('corin', 'npc'), before), null);
  assert.ok(reflectionStyle(A('corin', 'npc'), after));
  // Hollow scene spawns: nh_* ids and spawns of a noReflection NPC (elian_f)
  assert.ok(hasNoReflection(A('nh_crowd_a', 'spawn'), before));
  assert.ok(hasNoReflection(A('elian_f', 'spawn', 'npc_elian'), before));
  assert.ok(!hasNoReflection(A('elian_f', 'spawn', 'npc_elian'), after));
  // the King never
  assert.ok(hasNoReflection(A('nameless_king', 'actor'), after));
  assert.ok(hasNoReflection(A('aurel_k', 'spawn'), after));
  // strangers and the party do
  assert.ok(reflectionStyle(A('penny_e', 'npc'), before));
  assert.ok(reflectionStyle(A('mira', 'party'), before));
  // the hero: a faceless smudge, then a faint whole reflection
  const hero = A('hero', 'party');
  assert.equal(reflectionStyle(hero, before).hero, 'smudge');
  assert.equal(reflectionStyle(hero, before).alpha, 0.12);
  assert.equal(reflectionStyle(hero, after).hero, 'faint');
  assert.equal(reflectionStyle(hero, after).alpha, 0.2);
  // Vex Quill is in the glass, not in the room
  assert.ok(inGlass({ id: 'vex' }));
  assert.equal(reflectionStyle(A('vex', 'spawn'), before), null);
});

test('mirror and fog transfers dissolve to white and grey; other kinds keep their colours', () => {
  assert.equal(transitionOpts('mirror').style, 'dither');
  assert.equal(transitionOpts('mirror').color, '#f2f6ff');
  assert.equal(transitionOpts('fog').color, '#d8dde6');
  assert.equal(transitionOpts('door').color, '#06050c');
  assert.equal(transitionOpts('stairs', { x: 3, y: 4 }).style, 'iris');
});

test('mist areas from ambientFx; the Hollow\'s dusk lights lamps without fireflies', () => {
  assert.equal(mistAreasOf({ ambientFx: ['motes'] }), undefined);
  assert.equal(mistAreasOf({ ambientFx: ['mist'] }), null);
  assert.deepEqual(mistAreasOf({ ambientFx: [{ fx: 'mist', area: { x: 20, y: 0, w: 20, h: 36 } }] }), [{ x: 20, y: 0, w: 20, h: 36 }]);
  assert.ok(TINTS.hollow_dusk && LAMP_TINTS.has('hollow_dusk') && !NIGHT_TINTS.has('hollow_dusk'));
});
