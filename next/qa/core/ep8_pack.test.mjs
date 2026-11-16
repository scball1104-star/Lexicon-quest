// E8-pack (EPISODE8_PLAN 13.2, 11.1): the ep8 pack table entry, the switch, the core seams 1 to 4 (seam 5, the commands call
// point, is qa/core/ep8_commands.test.mjs), the pack entry (ORDER, guarded modules, the ep7 pack first, idempotent
// register(engine), the audio merge on every path) and the quick start's loadout. Pure node tests: no browser, no network. The
// order trap is qa/core/ep8_maps_order.test.mjs; saves qa/saves/ep8_*; the title offer and the hooks qa/ui/ep8_title.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PACKS, ensurePack, packEnabled, packsForMap, packForMap, packsToAwait, resetPacks, forcePack } from '../../src/game/packs.js';
import { EP7_LIVE, EP8_LIVE } from '../../src/game/episodes.js';
import { landing } from '../../src/game/packFallback.js';
import { CREDITS_HANDOFF } from '../../src/game/story.js';
import { END_CARD_EP7 } from '../../src/data/ep7/text.js';
import * as ep7 from '../../src/data/ep7/index.js';
import * as ep8 from '../../src/data/ep8/index.js';
import { LOADOUTS } from '../../tools/sim/loadouts.mjs';
import '../../tools/sim/ep4.mjs';
import '../../tools/sim/ep5.mjs';
import '../../tools/sim/ep6.mjs';
import '../../tools/sim/ep7.mjs';   // adds the ep7_* loadouts

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(NEXT, rel));

test('pack table: the ep8 entry is exactly plan 13.2 seam 1, behind EP8_LIVE (false)', () => {
  const d = PACKS.ep8;
  assert.ok(d, 'PACKS.ep8');
  assert.equal(d.entry, '../data/ep8/index.js');
  assert.equal(d.prefix, 'ep8_');
  assert.equal(d.assets, 'assets/ep8_manifest.json');
  assert.equal(d.audioPack, 'ep8');
  assert.equal(d.hard, true);
  assert.deepEqual(d.touches, ['ep7_ph_watch', 'ep7_stillheart']);
  assert.equal(d.wanted({}), false);
  assert.equal(d.wanted({ ep7_complete: true }), true);
  assert.equal(d.wanted({ ep8_started: true }), true);
  assert.equal(d.wanted({ ep6_complete: true, ep7_started: true }), false, 'an Episode 7 run before its credits does not want it');
  assert.equal(d.enabled(), EP8_LIVE);
  assert.equal(EP8_LIVE, false, 'seam 2: the switch stays off until E8-integrate flips it on the branch');
  assert.equal(EP7_LIVE, true);
  assert.match(read('src/game/episodes.js'), /^export const EP8_LIVE = false;$/m);
  // ep7 comes first in the table, so packForMap still names ep7 for the two shared maps; packsForMap names both
  for (const id of ['ep7_ph_watch', 'ep7_stillheart']) {
    assert.equal(packForMap(id).id, 'ep7');
    assert.deepEqual(packsForMap(id).map((p) => p.id), ['ep7', 'ep8'], `${id} waits for both packs`);
  }
  assert.deepEqual(packsForMap('ep7_palehaven').map((p) => p.id), ['ep7'], 'other Episode 7 maps do not wait for ep8');
  assert.deepEqual(packsForMap('ep6_zl_inn').map((p) => p.id), ['ep6', 'ep7'], 'Episode 6 maps unchanged');
  assert.equal(packForMap('ep8_scriptorium').id, 'ep8');
  assert.equal(packForMap('ep8_library_f2').prefixed, true);
  assert.equal(packForMap('hero_home'), null, 'no core map waits on the pack (the credits wake at home is a goto, plan 3.6)');
  assert.ok(!exists('src/data/ep8/live.js'), 'no live.js: the switch is in episodes.js and nothing of the pack is precached');
  const order = Object.keys(PACKS);
  assert.ok(order.indexOf('ep7') < order.indexOf('ep8'), 'ep7 before ep8 in the table (the hard chain)');
  assert.deepEqual(order.filter((id) => PACKS[id].hard), ['ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep8']);
});

test('nothing is fetched while EP8_LIVE is false: ensurePack skips without importing, the call sites do not wait for it', async () => {
  resetPacks();
  let calls = 0;
  const r = await ensurePack('ep8', { importer: async () => { calls++; return {}; }, quiet: true });
  assert.equal(r.skipped, true, 'the real switch, off: skipped');
  assert.equal(calls, 0, 'the entry was not imported');
  assert.equal(packEnabled('ep8'), false);
  const done7 = { ep7_complete: true, ep6_complete: true, ep5_complete: true, ep4_complete: true, ep3_complete: true, ep2_complete: true, ep1_complete: true };
  assert.ok(!packsToAwait(done7).includes('ep8'), 'an Episode 7 finisher does not wait for the pack while it is off');
  assert.ok(!packsToAwait({ ep8_started: true }).includes('ep8'));
  assert.ok(packsToAwait(done7, { enabled: true }).includes('ep8'), 'and does once the switch is on');
  const done6 = { ...done7, ep7_complete: false };
  assert.ok(!packsToAwait(done6, { enabled: true }).includes('ep8'), 'an Episode 6 save (no ep7_complete) never wants the pack');
  assert.ok(!packsToAwait({ ...done6, ep7_started: true }, { enabled: true }).includes('ep8'), 'nor a run in the middle of Episode 7');
  resetPacks();
});

test('register(engine): a forced ensurePack hands the engine to the entry and starts every hard pack above it at once', async () => {
  resetPacks();
  let got = 'unset';
  const loaded = [];
  const engine = { audio: { manifest: { sfx: {}, music: {}, ambience: {}, jingles: {} }, loadPack: (id) => { loaded.push(id); return Promise.resolve(); } } };
  forcePack('ep8');   // ?pack=ep8 (QA)
  const r = await ensurePack('ep8', { engine, importer: async () => ({ register: (e) => { got = e; return { id: 'ep8', loaded: [], skipped: [] }; } }), packFiles: null, warm: false, quiet: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(got, engine);
  assert.deepEqual(loaded, ['ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep8'], 'ep3 to ep7 start with it (#96: every hard pack above at once)');
  resetPacks();
});

test('seam 3: one title hook line, live with an Episode 7 finisher or ?ep=8, starts ep7 and ep8, then calls LQ_EP8.title', () => {
  const t = read('src/scenes/title.js');
  const lines = t.split('\n').filter((l) => l.includes('LQ_EP8'));
  assert.equal(lines.length, 1, 'one hook line');
  const line = lines[0];
  assert.match(line, /EP8_LIVE && newestWith\(e\.save, 'ep7_complete'\)/);
  assert.ok(!/[\u0000-\u0008\u000b-\u001f]/.test(line), 'no control characters in the hook line');
  const m = /\/(\[\?&\]ep=8[^/]*)\//.exec(line);
  assert.ok(m, 'the ?ep=8 test');
  const re = new RegExp(m[1]);
  assert.ok(re.test('?debug=1&ep=8') && re.test('?ep=8') && !re.test('?ep=7') && !re.test('?ep=88'), `the ?ep=8 test matches (${m[1]})`);
  // both fetches start at once; the ep8 promise settles only after the ep8 entry awaited the ep7 pack (index.js ensureEp7), so
  // LQ_EP8.title runs after ep7, then ep8, have registered
  assert.match(line, /forcePack\('ep8'\); ensurePack\('ep7', \{ engine: e \}\); ensurePack\('ep8', \{ engine: e \}\)\.then\(\(\) => globalThis\.LQ_EP8 && LQ_EP8\.title\(this\)\)/);
  assert.match(read('src/data/ep8/index.js'), /await ensureEp7\(engine\)/);
  assert.match(t, /import \{[^}]*EP8_LIVE, EP7_LIVE, EP6_LIVE, EP5_LIVE, newestWith \} from '\.\.\/game\/episodes\.js'/);
  assert.ok(t.indexOf("LQ_EP7.title(this)") < t.indexOf("LQ_EP8.title(this)"), 'after the Episode 7 hook');
  assert.equal(t.split('\n').filter((l) => l.includes('LQ_EP7')).length, 1, 'the Episode 7 hook line is untouched');
});

test('seam 4: an Episode 8 save lands where an Episode 4 to 7 one does (Emberpeak east road end), never on Test Town', () => {
  for (const id of ['ep8_stair', 'ep8_scriptorium', 'ep8_sc_index', 'ep8_library_f2', 'ep8_last_word', 'ep8_bell_night', 'ep8_somethingnew']) {
    assert.deepEqual(landing(id), landing('ep7_palehaven'), `${id} lands as an ep7 map does`);
    assert.equal(landing(id)[0], 'emberpeak');
  }
  assert.equal(landing('ep9_x'), null);
  assert.equal(landing('ep88_x'), null);
  for (const id of ['ep4_vw_inn', 'ep5_saffron', 'ep6_zephyr', 'ep7_ph_watch']) assert.equal(landing(id)[0], 'emberpeak', `${id} unchanged`);
  assert.equal(landing('hero_home'), null);
  assert.match(read('src/game/packFallback.js'), /\/\^ep\[45678\]_\/\.test\(id\) \? E/);
});

test('build tool and budget files: the ep8 sound prefixes are lazy, the cap is 1.0 MB', () => {
  const py = read('tools/pwa/build_pwa.py');
  const lazy = /LAZY_PREFIXES = \(([^)]*)\)/s.exec(py)[1];
  for (const p of ['assets/audio/sfx/ep8_', 'assets/audio/ambience/ep8_']) assert.ok(lazy.includes(`'${p}'`), `${p} in LAZY_PREFIXES`);
  assert.equal(JSON.parse(read('qa/pwa/budget_ratchet.json')).packCapsMB.ep8, 1.0);
});

test('pack entry: ORDER, missing modules skipped, idempotent, the ep7 pack registered first, maps and hooks run', async () => {
  assert.deepEqual(ep8.ORDER, ['flags', 'enemies', 'items', 'skills', 'loot', 'encounters', 'erasure', 'shops', 'ai', 'npcs', 'quests',
    'text', 'credits', 'story', 'ledger', 'audio', 'world', 'pages', 'maps', 'hooks', 'start', 'scene']);
  assert.ok(!ep8.ORDER.includes('title'), 'title is loaded on first use by hooks.js');
  const p1 = ep8.register();
  const p2 = ep8.register();
  assert.equal(p1, p2, 'the same promise');
  const r = await p1;
  assert.equal(r.id, 'ep8');
  for (const name of ['maps', 'hooks', 'start']) assert.ok(r.loaded.includes(name), `${name} loaded`);
  for (const name of ep8.ORDER) {
    const there = exists(`src/data/ep8/${name}.js`);
    assert.equal(r.loaded.includes(name), there, `${name}: loaded exactly when the file exists`);
    assert.equal(r.skipped.includes(name), !there, `${name}: skipped exactly when the file is missing`);
  }
  assert.equal(ep8.EP8_READY, true);
  assert.equal(ep7.EP7_READY, true, 'the ep7 pack registered first (the Watch, the Stillheart)');
  assert.ok(CREDITS_HANDOFF[7], 'the ep7 hooks ran before the ep8 hooks');
  assert.ok(globalThis.LQ_EP8 && typeof globalThis.LQ_EP8.title === 'function' && typeof globalThis.LQ_EP8.start === 'function'
    && typeof globalThis.LQ_EP8.offer === 'function');
  assert.deepEqual(CREDITS_HANDOFF[7].endCard, END_CARD_EP7, 'EP8_LIVE false: the Episode 7 end card is unchanged');
  assert.equal(CREDITS_HANDOFF[7].endCard.sub, 'Episode 8 is not playable yet.');
  assert.deepEqual([CREDITS_HANDOFF[7].map, CREDITS_HANDOFF[7].mark], ['ep7_ph_watch', 'watch_cot'], 'the Episode 7 wake never moves (plan 3)');
  assert.equal(ep8.EP8_MAPS_LISTED, ep8.mapsListed());
  if (!exists('src/data/ep8/encounters.js')) assert.equal(ep8.EP8_MAPS_LISTED, false, 'no encounters.js yet: the maps are not listed');
  const src = read('src/data/ep8/index.js');
  assert.ok(src.indexOf('await ensureEp7(engine)') < src.indexOf('for (const name of ORDER)'), 'run() awaits ep7 before the first ep8 module');
  assert.ok(src.indexOf('prefetchCode()') < src.indexOf('await ensureEp7(engine)'), 'the ep8 fetches start before the wait');
  assert.equal(ep8.register(), p1, 'still the same promise after success');
});

test('audio: mergeAudio adds ids, never overwrites one, declares packs.ep8; the ep7 entry is untouched', () => {
  const man = { music: { palehaven: { src: 'x' } }, sfx: { ice: { src: 'c.wav' } }, ambience: {}, jingles: {}, packs: { ep7: { sfx: ['stone_hold'] } } };
  const frag = { music: { palehaven: { src: 'other' }, the_last_word: { src: 'm.mp3' } }, sfx: { ice: { src: 'no.wav' }, rub_out: { src: 'assets/audio/sfx/ep8_rub_out.wav', pack: 'ep8' } },
    ambience: { library_hush: { src: 'a.mp3' } }, pack: { sfx: ['rub_out'] } };
  const r = ep8.mergeAudio(man, frag);
  assert.equal(man.music.palehaven.src, 'x', 'kept');
  assert.equal(man.sfx.ice.src, 'c.wav', 'kept');
  assert.ok(man.music.the_last_word && man.sfx.rub_out && man.ambience.library_hush);
  assert.deepEqual(man.packs.ep8, { sfx: ['rub_out'] });
  assert.deepEqual(man.packs.ep7, { sfx: ['stone_hold'] });
  assert.deepEqual(r.clashes.sort(), ['music.palehaven', 'sfx.ice']);
  assert.equal(ep8.mergeAudio(man, frag).added, 0, 'a second merge adds nothing');
  const inner = { sfx: {} };
  assert.equal(ep8.audioManifestOf({ audio: { real: { manifest: inner } } }), inner);
});

test('the quick start\'s packs: readyPacks(engine) leaves every ep4 to ep8 audio id in that engine\'s manifest (sky_wind, palehaven too)', async () => {
  const { readyPacks } = await import('../../src/data/ep8/hooks.js');
  const base = JSON.parse(read('assets/audio/manifest.json'));
  const engine = { audio: { real: { manifest: base }, loadPack: () => Promise.resolve() } };   // the safeAudio wrapper shape
  await readyPacks(engine);
  const frag = async (rel) => (exists(rel) ? ep8.audioFragment(await import(pathToFileURL(path.join(NEXT, rel)).href)) : null);
  let checked = 0;
  const pending = [];
  for (const pack of ['ep4', 'ep5', 'ep6', 'ep7', 'ep8']) {
    const f = await frag(`src/data/${pack}/audio.js`);
    if (!f) { assert.equal(pack, 'ep8', `the ${pack} fragment exists`); pending.push(pack); continue; }
    for (const kind of ['music', 'sfx', 'ambience', 'jingles']) {
      for (const id of Object.keys(f[kind] || {})) { assert.ok(base[kind] && base[kind][id], `${pack} ${kind}.${id} resolves after the quick start's readyPacks`); checked++; }
    }
    if (f.pack) assert.ok(base.packs && base.packs[pack], `manifest.packs.${pack} declared`);
  }
  assert.ok(base.ambience.sky_wind, 'the Stair plays sky_wind (the ep6 fragment)');
  assert.ok(base.music.palehaven, 'Act I plays palehaven (the ep7 fragment)');
  if (pending.length) console.log('# src/data/ep8/audio.js not written yet (E8-audio, wave 8c): only the ep4 to ep7 ids are checked');
  assert.ok(checked > 20, `checked ${checked} ids`);
});

test('start: the quick start party is the simulator ep8_stair loadout, or plan 6.6\'s recipe until it exists', async () => {
  const { EP8_START, EP8_LOADOUT } = await import('../../src/data/ep8/start.js');
  let simEp8 = false;
  if (exists('tools/sim/ep8.mjs')) { await import('../../tools/sim/ep8.mjs'); simEp8 = true; }
  const L = LOADOUTS.ep8_stair;
  if (simEp8 && L) {
    for (const id of ['hero', 'mira', 'bram']) {
      assert.deepEqual(EP8_START.members[id].equip, L[id].equip, `${id} equip = ep8_stair`);
      assert.deepEqual(EP8_START.members[id].mastery, L[id].mastery, `${id} mastery`);
      assert.equal(EP8_START.members[id].weapon, L[id].weapon);
    }
  } else {
    console.log('# tools/sim/ep8.mjs LOADOUTS.ep8_stair not here yet (E8-battle, wave 8a): checked against ep7_stillheart plus the Shard and the Open Gate');
    assert.equal(EP8_LOADOUT.source, 'ep7_stillheart');
    const E = LOADOUTS.ep7_stillheart;
    for (const id of ['hero', 'mira', 'bram']) {
      assert.deepEqual(EP8_START.members[id].equip, { ...E[id].equip, ...(EP8_LOADOUT.plus[id] || {}) }, `${id} equip = ep7_stillheart + plan 6.6`);
      assert.deepEqual(EP8_START.members[id].mastery, E[id].mastery, `${id} mastery`);
      assert.equal(EP8_START.members[id].weapon, E[id].weapon);
    }
  }
  const all = Object.values(EP8_START.members).flatMap((m) => Object.values(m.equip));
  for (const id of ['stillheart_shard', 'open_gate']) assert.ok(all.includes(id), `${id} is worn (plan 6.6)`);
});
