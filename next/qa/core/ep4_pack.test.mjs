// E4-pack (EPISODE4_PLAN 13.2, 11.1): the ep4 pack table entry, the switch, the core seams, the pack entry (ORDER, guarded
// modules, idempotent register(engine), the audio merge) and the hooks. Pure node tests: no browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKS, ensurePack, packEnabled, packsForMap, packForMap, packsToAwait, resetPacks, forcePack } from '../../src/game/packs.js';
import { EP4_LIVE, EP3_LIVE } from '../../src/game/episodes.js';
import { CREDITS_HANDOFF, creditsPending } from '../../src/game/story.js';
import { QUEST_EXT, mainQuestFor, MAIN_QUEST, MAIN_QUEST_EP2, MAIN_QUEST_EP3 } from '../../src/data/quests.js';
import { SCRIPTS, POLICY_EXT, competentPolicy } from '../../src/battle/ai.js';
import { END_CARD_EP3 } from '../../src/data/text.js';
import * as ep4 from '../../src/data/ep4/index.js';
import { LOADOUTS } from '../../tools/sim/loadouts.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');

test('pack table: the ep4 entry is exactly plan 13.2 seam 1, behind EP4_LIVE', () => {
  const d = PACKS.ep4;
  assert.ok(d, 'PACKS.ep4');
  assert.equal(d.entry, '../data/ep4/index.js');
  assert.equal(d.prefix, 'ep4_');
  assert.equal(d.assets, 'assets/ep4_manifest.json');
  assert.equal(d.audioPack, 'ep4');
  assert.equal(d.hard, true);
  assert.deepEqual(d.touches, ['emberpeak', 'pk_inn']);
  assert.equal(d.wanted({}), false);
  assert.equal(d.wanted({ ep3_complete: true }), true);
  assert.equal(d.wanted({ ep4_started: true }), true);
  assert.equal(d.wanted({ ep2_complete: true, ep3_started: true }), false);
  assert.equal(d.enabled(), EP4_LIVE);
  assert.equal(EP4_LIVE, false, 'the switch ships off; E4-integrate flips it on the branch');
  assert.equal(EP3_LIVE, true);
  // the ep3 pack comes first in the table, so packForMap still names ep3 for the two shared maps; packsForMap names both
  assert.equal(packForMap('emberpeak').id, 'ep3');
  assert.deepEqual(packsForMap('emberpeak').map((p) => p.id), ['ep3', 'ep4']);
  assert.deepEqual(packsForMap('pk_inn').map((p) => p.id), ['ep3', 'ep4']);
  assert.equal(packForMap('ep4_valewyn').id, 'ep4');
  assert.equal(packForMap('ep4_keep_crown').prefixed, true);
  assert.ok(fs.existsSync(path.join(NEXT, 'assets', 'ep4_manifest.json')), 'the (generated) asset fragment exists, so a load never 404s');
  assert.ok(!fs.existsSync(path.join(NEXT, 'src', 'data', 'ep4', 'live.js')) || /^[^\n]*export \{ EP4_LIVE \}/.test(read('src/data/ep4/live.js')),
    'live.js (always precached) is absent or a one-line re-export');
});

test('nothing is fetched while EP4_LIVE is false: ensurePack skips without importing, the watchers do not wait for it', async () => {
  resetPacks();
  let calls = 0;
  const r = await ensurePack('ep4', { importer: async () => { calls++; return {}; }, quiet: true });
  assert.equal(r.skipped, true);
  assert.equal(calls, 0, 'the entry was not imported');
  assert.equal(packEnabled('ep4'), false);
  assert.ok(!packsToAwait({ ep3_complete: true, ep2_complete: true }).includes('ep4'));
  resetPacks();
});

test('register(engine): ensurePack hands the engine to the entry and starts the ep4 audio pack', async () => {
  resetPacks();
  let got = 'unset';
  const loaded = [];
  const engine = { audio: { manifest: { sfx: {}, music: {}, ambience: {}, jingles: {} }, loadPack: (id) => { loaded.push(id); return Promise.resolve(); } } };
  forcePack('ep4');   // ?pack=ep4 (QA)
  const r = await ensurePack('ep4', { engine, importer: async () => ({ register: (e) => { got = e; return { id: 'ep4', loaded: [], skipped: [] }; } }), packFiles: null, warm: false, quiet: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(got, engine);
  assert.deepEqual(loaded, ['ep4']);
  resetPacks();
});

test('seam 4: creditsPending reads each handoff entry\'s flag (1 to 3 unchanged in meaning; a pack adds 4)', () => {
  for (const [n, flag, counter] of [[1, 'ep1_complete', 'credits_rolled'], [2, 'ep2_complete', 'credits2_rolled'], [3, 'ep3_complete', 'credits3_rolled']]) {
    assert.equal(CREDITS_HANDOFF[n].flag, flag);
    assert.equal(CREDITS_HANDOFF[n].counter, counter);
  }
  const has = (set) => (f) => set.includes(f);
  const g = { counters: {} };
  assert.equal(creditsPending(g, has([])), 0);
  assert.equal(creditsPending(g, has(['ep1_complete'])), 1);
  assert.equal(creditsPending({ counters: { credits_rolled: 1 } }, has(['ep1_complete', 'ep2_complete'])), 2);
  assert.equal(creditsPending({ counters: { credits_rolled: 1, credits2_rolled: 1 } }, has(['ep1_complete', 'ep2_complete', 'ep3_complete'])), 3);
  assert.equal(creditsPending({ counters: { credits_rolled: 1, credits2_rolled: 1, credits3_rolled: 1 } }, has(['ep1_complete', 'ep2_complete', 'ep3_complete'])), 0);
  assert.equal(creditsPending({ counters: { credits_rolled: 1, credits2_rolled: 1, credits3_rolled: 1 } }, has(['ep1_complete', 'ep2_complete', 'ep3_complete', 'ep4_complete'])), 0,
    'no entry 4 until the pack adds it');
  CREDITS_HANDOFF[4] = { cards: [], counter: 'credits4_rolled', flag: 'ep4_complete' };
  try {
    assert.equal(creditsPending({ counters: { credits_rolled: 1, credits2_rolled: 1, credits3_rolled: 1 } }, has(['ep1_complete', 'ep2_complete', 'ep3_complete', 'ep4_complete'])), 4);
  } finally { delete CREDITS_HANDOFF[4]; }
});

test('seam 5: QUEST_EXT is checked first by mainQuestFor; empty, nothing changes', () => {
  const has = (set) => (f) => set.includes(f);
  assert.deepEqual(QUEST_EXT, []);
  assert.equal(mainQuestFor(has([])), MAIN_QUEST);
  assert.equal(mainQuestFor(has(['ep1_complete'])), MAIN_QUEST_EP2);
  assert.equal(mainQuestFor(has(['ep1_complete', 'ep3_started'])), MAIN_QUEST_EP3);
  const Q4 = { id: 'main_ep4', steps: [] };
  QUEST_EXT.push(['ep4_started', Q4]);
  try {
    assert.equal(mainQuestFor(has(['ep1_complete', 'ep3_started'])), MAIN_QUEST_EP3);
    assert.equal(mainQuestFor(has(['ep1_complete', 'ep3_started', 'ep4_started'])), Q4);
  } finally { QUEST_EXT.length = 0; }
});

test('seams 6 and 7: Heat carries quench/word/sfx; SCRIPTS and POLICY_EXT exported; BACKDROPS exported', () => {
  const rules = read('src/battle/rules.js');
  assert.match(rules, /heatQuench: \(d\.heat && d\.heat\.quench\) \|\| 'ice'/);
  assert.match(rules, /types\.includes\(tgt\.heatQuench\)/);
  assert.match(rules, /u\.heatWord \|\| 'Quenched!'/);
  assert.match(rules, /u\.heatSfx \|\| 'quench_hiss'/);
  assert.ok(SCRIPTS.basic && SCRIPTS.cinder_warden, 'the house scripts are in the exported table (packs add barrister, paper_regent)');
  assert.ok(Array.isArray(POLICY_EXT) && POLICY_EXT.length === 0);
  // POLICY_EXT is asked first: a rule that answers wins, one that returns null falls through to the house brain
  const act = { type: 'defend' };
  POLICY_EXT.push(() => act);
  try { assert.equal(competentPolicy({}, {}), act); } finally { POLICY_EXT.length = 0; }
  assert.match(read('src/scenes/battle.js'), /\nexport const BACKDROPS = \{/);
});

test('seam 3: the title hook line forces and loads the pack only when live with a finished record, or with ?ep=4', () => {
  const t = read('src/scenes/title.js');
  const line = t.split('\n').find((l) => l.includes('LQ_EP4'));
  assert.ok(line, 'the hook line');
  assert.match(line, /EP4_LIVE && this\.ep3\.slot != null/);
  assert.match(line, /ep=4/);
  assert.match(line, /forcePack\('ep4'\); ensurePack\('ep4'\)\.then\(\(\) => globalThis\.LQ_EP4 && LQ_EP4\.title\(this\)\)/);
});

test('pack entry: ORDER, missing modules skipped, idempotent, maps and hooks run, LQ_EP4 installed', async () => {
  assert.deepEqual(ep4.ORDER, ['flags', 'enemies', 'items', 'skills', 'loot', 'encounters', 'shops', 'ai', 'npcs', 'quests', 'text',
    'story', 'ledger', 'audio', 'world', 'maps', 'hooks', 'start', 'title']);
  const p1 = ep4.register();
  const p2 = ep4.register();
  assert.equal(p1, p2, 'the same promise');
  const r = await p1;
  assert.equal(r.id, 'ep4');
  for (const name of ['maps', 'hooks', 'start']) assert.ok(r.loaded.includes(name), `${name} loaded`);
  for (const name of ep4.ORDER) {
    if (name === 'title') continue;   // loaded on first use by hooks.js
    const there = fs.existsSync(path.join(NEXT, 'src', 'data', 'ep4', `${name}.js`));
    assert.equal(r.loaded.includes(name), there, `${name}: loaded exactly when the file exists`);
    assert.equal(r.skipped.includes(name), !there, `${name}: skipped exactly when the file is missing`);
  }
  assert.equal(ep4.EP4_READY, true);
  assert.ok(globalThis.LQ_EP4 && typeof globalThis.LQ_EP4.title === 'function');
  assert.equal(CREDITS_HANDOFF[3].endCard, END_CARD_EP3, 'Episode 3 end card unchanged while EP4_LIVE is false');
});

test('audio: mergeAudio adds ids, never overwrites one, and declares packs.ep4', () => {
  const man = { music: { valewyn: { src: 'x' } }, sfx: { cursor: { src: 'c.wav' } }, ambience: {}, jingles: {}, packs: { ep3: { sfx: [] } } };
  const frag = { music: { valewyn: { src: 'other' }, sunken_keep: { src: 'm.mp3' } }, sfx: { cursor: { src: 'no.wav' }, tide_wheel: { src: 'assets/audio/sfx/ep4_tide_wheel.wav', pack: 'ep4' } },
    ambience: { canal_rain: { src: 'a.mp3' } }, pack: { sfx: ['tide_wheel'] } };
  const r = ep4.mergeAudio(man, frag);
  assert.equal(man.music.valewyn.src, 'x', 'kept');
  assert.equal(man.sfx.cursor.src, 'c.wav', 'kept');
  assert.ok(man.music.sunken_keep && man.sfx.tide_wheel && man.ambience.canal_rain);
  assert.deepEqual(man.packs.ep4, { sfx: ['tide_wheel'] });
  assert.deepEqual(r.clashes.sort(), ['music.valewyn', 'sfx.cursor']);
  assert.equal(ep4.mergeAudio(man, frag).added, 0, 'a second merge adds nothing');
  assert.deepEqual(ep4.audioFragment({ AUDIO: { sfx: {} } }), { sfx: {} });
  assert.deepEqual(ep4.audioFragment({ music: { a: 1 }, pack: { sfx: [] } }), { music: { a: 1 }, pack: { sfx: [] } });
  assert.equal(ep4.audioFragment({ register() {} }), null);
});

test('start: the quick start party mirrors the simulator loadout (ep4_flood_road when it exists, else foundry_heart + the two)', async () => {
  const { EP4_START, EP4_LOADOUT } = await import('../../src/data/ep4/start.js');
  const L = LOADOUTS.ep4_flood_road;
  for (const id of ['hero', 'mira', 'bram']) {
    if (L) {
      assert.deepEqual(EP4_START.members[id].equip, L[id].equip, `${id} equip = ep4_flood_road`);
      continue;
    }
    const base = LOADOUTS[EP4_LOADOUT.source][id];
    assert.deepEqual(EP4_START.members[id].equip, { ...base.equip, ...(EP4_LOADOUT.plus[id] || {}) }, `${id} equip = foundry_heart + plus`);
    assert.deepEqual(EP4_START.members[id].mastery, base.mastery, `${id} mastery`);
  }
  assert.equal(EP4_START.members.bram.equip.axe, 'first_bell_hammer');
  assert.equal(EP4_START.members.hero.equip.charm, 'warden_heart');
});

// The rest of plan 10.7 needs the maps, the story or a scene (E4-integrate turns these on once they exist).
test('pending: an Episode 3 credits fixture reaches ep4_morning with EP4_LIVE on, and not with it off', { skip: 'needs src/data/ep4/story.js ep4_morning and the pk_inn wake patch (E4-story, E4-maps-a); E4-integrate turns it on' }, () => {});
test('pending: with Episode 3 complete flags and EP4_LIVE off the washout is impassable; with east_road_open the exit is reachable', { skip: 'needs ep4_patches.js withEastRoad and ep4_flood_road (E4-maps-a); E4-integrate turns it on' }, () => {});
test('pending: an Episode 4 save made mid-keep reloads with washed seals and latched floodgates', { skip: 'needs g.washed (E4-world) and the keep maps (E4-maps-b); E4-integrate turns it on' }, () => {});
