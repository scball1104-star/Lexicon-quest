// E6-pack (EPISODE6_PLAN 13.2, 11.1): the ep6 pack table entry, the switch, the four core seams, the pack entry (ORDER, guarded
// modules, the ep5 pack first, idempotent register(engine), the audio merge on every path) and the quick start's loadout.
// Pure node tests: no browser, no network. The order trap is qa/core/ep6_maps_order.test.mjs; saves qa/saves/ep6_*; the title
// offer and the hooks qa/ui/ep6_title.test.mjs; the browser check and the chain timings qa/ui/ep6_saves_headless.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PACKS, ensurePack, packEnabled, packsForMap, packForMap, packsToAwait, resetPacks, forcePack } from '../../src/game/packs.js';
import { EP5_LIVE, EP6_LIVE } from '../../src/game/episodes.js';
import { landing } from '../../src/game/packFallback.js';
import { CREDITS_HANDOFF } from '../../src/game/story.js';
import { END_CARD_EP5 } from '../../src/data/ep5/text.js';
import * as ep5 from '../../src/data/ep5/index.js';
import * as ep6 from '../../src/data/ep6/index.js';
import { LOADOUTS } from '../../tools/sim/loadouts.mjs';
import '../../tools/sim/ep4.mjs';
import '../../tools/sim/ep5.mjs';   // adds the ep5_* loadouts

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(NEXT, rel));

test('pack table: the ep6 entry is exactly plan 13.2 seam 1, behind EP6_LIVE', () => {
  const d = PACKS.ep6;
  assert.ok(d, 'PACKS.ep6');
  assert.equal(d.entry, '../data/ep6/index.js');
  assert.equal(d.prefix, 'ep6_');
  assert.equal(d.assets, 'assets/ep6_manifest.json');
  assert.equal(d.audioPack, 'ep6');
  assert.equal(d.hard, true);
  assert.deepEqual(d.touches, ['ep5_sh_inn', 'ep5_saffron']);
  assert.equal(d.wanted({}), false);
  assert.equal(d.wanted({ ep5_complete: true }), true);
  assert.equal(d.wanted({ ep6_started: true }), true);
  assert.equal(d.wanted({ ep4_complete: true, ep5_started: true }), false, 'an Episode 5 run before its credits does not want it');
  assert.equal(d.enabled(), EP6_LIVE);
  assert.equal(typeof EP6_LIVE, 'boolean', 'seam 2: the switch (E6-integrate flips it on the branch; shipping stays with Scott or Stephen)');
  assert.equal(EP5_LIVE, true);
  // ep5 comes first in the table, so packForMap still names ep5 for the two shared maps; packsForMap names both
  assert.equal(packForMap('ep5_sh_inn').id, 'ep5');
  assert.deepEqual(packsForMap('ep5_sh_inn').map((p) => p.id), ['ep5', 'ep6']);
  assert.deepEqual(packsForMap('ep5_saffron').map((p) => p.id), ['ep5', 'ep6']);
  assert.deepEqual(packsForMap('ep5_lab_f2').map((p) => p.id), ['ep5'], 'other Episode 5 maps do not wait for ep6');
  assert.deepEqual(packsForMap('ep4_vw_inn').map((p) => p.id), ['ep4', 'ep5'], 'Episode 4 maps unchanged');
  assert.equal(packForMap('ep6_zephyr').id, 'ep6');
  assert.equal(packForMap('ep6_obs_f2').prefixed, true);
  assert.ok(exists('assets/ep6_manifest.json'), 'the (generated) asset fragment exists, so a load never 404s');
  assert.ok(!exists('src/data/ep6/live.js'), 'no live.js: the switch is in episodes.js and nothing of the pack is precached');
  const order = Object.keys(PACKS);
  assert.ok(order.indexOf('ep5') < order.indexOf('ep6'), 'ep5 before ep6 in the table');
});

test('nothing is fetched while EP6_LIVE is false: ensurePack skips without importing, the call sites do not wait for it', async () => {
  resetPacks();
  let calls = 0;
  // the off state is asserted through the `enabled` override the switch feeds, so this holds before and after the flip
  const r = await ensurePack('ep6', { importer: async () => { calls++; return {}; }, quiet: true, enabled: false });
  assert.equal(r.skipped, true);
  assert.equal(calls, 0, 'the entry was not imported');
  assert.equal(packEnabled('ep6', { enabled: false }), false);
  assert.equal(packEnabled('ep6'), EP6_LIVE);
  const done5 = { ep5_complete: true, ep4_complete: true, ep3_complete: true, ep2_complete: true, ep1_complete: true };
  assert.ok(!packsToAwait(done5, { enabled: false }).includes('ep6'), 'an Episode 5 finisher does not wait for the pack while it is off');
  assert.ok(!packsToAwait({ ep6_started: true }, { enabled: false }).includes('ep6'));
  assert.equal(packsToAwait(done5).includes('ep6'), EP6_LIVE, 'an Episode 5 finisher waits for the pack only while live');
  assert.ok(packsToAwait(done5, { enabled: true }).includes('ep6'), 'and does once the switch is on');
  const done4 = { ep4_complete: true, ep3_complete: true, ep2_complete: true, ep1_complete: true };
  assert.ok(!packsToAwait(done4, { enabled: true }).includes('ep6'), 'an Episode 4 save (no ep5_complete) never wants the pack');
  resetPacks();
});

test('register(engine): a forced ensurePack hands the engine to the entry and starts the ep6 audio pack', async () => {
  resetPacks();
  let got = 'unset';
  const loaded = [];
  const engine = { audio: { manifest: { sfx: {}, music: {}, ambience: {}, jingles: {} }, loadPack: (id) => { loaded.push(id); return Promise.resolve(); } } };
  forcePack('ep6');   // ?pack=ep6 (QA)
  const r = await ensurePack('ep6', { engine, importer: async () => ({ register: (e) => { got = e; return { id: 'ep6', loaded: [], skipped: [] }; } }), packFiles: null, warm: false, quiet: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(got, engine);
  assert.deepEqual(loaded, ['ep6']);
  resetPacks();
});

test('seam 3: one title hook line, live with an Episode 5 finisher or ?ep=6, starts both fetches and calls LQ_EP6.title', () => {
  const t = read('src/scenes/title.js');
  const lines = t.split('\n').filter((l) => l.includes('LQ_EP6'));
  assert.equal(lines.length, 1, 'one hook line');
  const line = lines[0];
  assert.match(line, /EP6_LIVE && newestWith\(e\.save, 'ep5_complete'\)/);
  assert.ok(!/[\u0000-\u0008\u000b-\u001f]/.test(line), 'no control characters in the hook line');
  const m = /\/(\[\?&\]ep=6[^/]*)\//.exec(line);
  assert.ok(m, 'the ?ep=6 test');
  const re = new RegExp(m[1]);
  assert.ok(re.test('?debug=1&ep=6') && re.test('?ep=6') && !re.test('?ep=5') && !re.test('?ep=66'), `the ?ep=6 test matches (${m[1]})`);
  // both fetches start at once (ep6's entry orders the registration: ep5 first, which awaits ep4), each with the engine
  assert.match(line, /forcePack\('ep6'\); ensurePack\('ep5', \{ engine: e \}\); ensurePack\('ep6', \{ engine: e \}\)\.then\(\(\) => globalThis\.LQ_EP6 && LQ_EP6\.title\(this\)\)/);
  assert.match(t, /import \{[^}]*EP6_LIVE, EP5_LIVE, newestWith \} from '\.\.\/game\/episodes\.js'/);   // EP5_LIVE stays next to newestWith (ep5_pack.test)
  // the Episode 4 and 5 hook lines are untouched
  assert.match(t, /if \(\(EP4_LIVE && this\.ep3\.slot != null\) \|\| \/\[\?&\]ep=4\\b\/\.test/);
  assert.equal(t.split('\n').filter((l) => l.includes('LQ_EP5')).length, 1);
  assert.match(t, /forcePack\('ep5'\); ensurePack\('ep4', \{ engine: e \}\); ensurePack\('ep5', \{ engine: e \}\)\.then\(\(\) => globalThis\.LQ_EP5 && LQ_EP5\.title\(this\)\); \}   \/\/ Episode 5/);
});

test('seam 4: an Episode 6 save lands where an Episode 4 or 5 one does (Emberpeak east road end), never on Test Town', () => {
  for (const id of ['ep6_airstair', 'ep6_zephyr', 'ep6_zl_inn', 'ep6_obs_f2', 'ep6_obs_eyrie', 'ep6_library', 'ep6_somethingnew']) {
    assert.deepEqual(landing(id), landing('ep5_lab_f2'), `${id} lands as an ep5 map does`);
    assert.equal(landing(id)[0], 'emberpeak');
  }
  assert.equal(landing('ep7_x'), null);
  assert.equal(landing('ep66_x'), null);
  assert.equal(landing('ep4_vw_inn')[0], 'emberpeak', 'Episode 4 unchanged');
  assert.equal(landing('ep5_saffron')[0], 'emberpeak', 'Episode 5 unchanged');
  assert.equal(landing('pk_inn'), null);
  assert.match(read('src/game/packFallback.js'), /\/\^ep\[456\]_\/\.test\(id\) \? E/);
});

test('pack entry: ORDER, missing modules skipped, idempotent, the ep5 pack registered first, maps and hooks run', async () => {
  assert.deepEqual(ep6.ORDER, ['flags', 'enemies', 'items', 'skills', 'loot', 'encounters', 'gale', 'shops', 'ai', 'npcs', 'quests',
    'text', 'story', 'ledger', 'audio', 'world', 'pages', 'maps', 'hooks', 'start', 'scene']);
  assert.ok(!ep6.ORDER.includes('title'), 'title is loaded on first use by hooks.js');
  const p1 = ep6.register();
  const p2 = ep6.register();
  assert.equal(p1, p2, 'the same promise');
  const r = await p1;
  assert.equal(r.id, 'ep6');
  for (const name of ['maps', 'hooks', 'start']) assert.ok(r.loaded.includes(name), `${name} loaded`);
  for (const name of ep6.ORDER) {
    const there = exists(`src/data/ep6/${name}.js`);
    assert.equal(r.loaded.includes(name), there, `${name}: loaded exactly when the file exists`);
    assert.equal(r.skipped.includes(name), !there, `${name}: skipped exactly when the file is missing`);
  }
  assert.equal(ep6.EP6_READY, true);
  assert.equal(ep5.EP5_READY, true, 'the ep5 pack registered first (Saffron Haven, the Episode 5 maps)');
  assert.ok(CREDITS_HANDOFF[5], 'the ep5 hooks ran before the ep6 hooks');
  assert.ok(globalThis.LQ_EP6 && typeof globalThis.LQ_EP6.title === 'function' && typeof globalThis.LQ_EP6.start === 'function'
    && typeof globalThis.LQ_EP6.offer === 'function');
  if (!EP6_LIVE) assert.deepEqual(CREDITS_HANDOFF[5].endCard, END_CARD_EP5, 'EP6_LIVE false: the Episode 5 end card is unchanged');
  assert.equal(CREDITS_HANDOFF[5].endCard.sub, EP6_LIVE ? 'Episode 6 begins in the morning.' : 'Episode 6 is not playable yet.', 'the Episode 5 end card follows the switch');
  assert.equal(ep6.EP6_MAPS_LISTED, ep6.mapsListed());
  assert.equal(ep6.EP6_MAPS_LISTED, true, 'the maps are listed (E6-integrate, wave 6d)');
  const src = read('src/data/ep6/index.js');
  assert.ok(src.indexOf('await ensureEp5(engine)') < src.indexOf('for (const name of ORDER)'), 'run() awaits ep5 before the first ep6 module');
  assert.ok(src.indexOf('prefetchCode()') < src.indexOf('await ensureEp5(engine)'), 'the ep6 fetches start before the wait');
});

test('audio: mergeAudio adds ids, never overwrites one, declares packs.ep6; the ep5 entry is untouched', () => {
  const man = { music: { saffron: { src: 'x' } }, sfx: { thunder: { src: 'c.wav' } }, ambience: {}, jingles: {}, packs: { ep5: { sfx: ['sun_dial'] } } };
  const frag = { music: { saffron: { src: 'other' }, zephyr: { src: 'm.mp3' } }, sfx: { thunder: { src: 'no.wav' }, gust_carry: { src: 'assets/audio/sfx/ep6_gust_carry.wav', pack: 'ep6' } },
    ambience: { sky_wind: { src: 'a.mp3' } }, pack: { sfx: ['gust_carry'] } };
  const r = ep6.mergeAudio(man, frag);
  assert.equal(man.music.saffron.src, 'x', 'kept');
  assert.equal(man.sfx.thunder.src, 'c.wav', 'kept');
  assert.ok(man.music.zephyr && man.sfx.gust_carry && man.ambience.sky_wind);
  assert.deepEqual(man.packs.ep6, { sfx: ['gust_carry'] });
  assert.deepEqual(man.packs.ep5, { sfx: ['sun_dial'] });
  assert.deepEqual(r.clashes.sort(), ['music.saffron', 'sfx.thunder']);
  assert.equal(ep6.mergeAudio(man, frag).added, 0, 'a second merge adds nothing');
  const inner = { sfx: {} };
  assert.equal(ep6.audioManifestOf({ audio: { real: { manifest: inner } } }), inner);
});

test('the quick start\'s packs: readyPacks(engine) leaves every ep4, ep5 and ep6 audio id in that engine\'s manifest', async () => {
  const { readyPacks } = await import('../../src/data/ep6/hooks.js');
  const base = JSON.parse(read('assets/audio/manifest.json'));
  const engine = { audio: { real: { manifest: base }, loadPack: () => Promise.resolve() } };   // the safeAudio wrapper shape
  await readyPacks(engine);
  const frag = async (rel) => (exists(rel) ? ep6.audioFragment(await import(pathToFileURL(path.join(NEXT, rel)).href)) : null);
  let checked = 0;
  const pending = [];
  for (const [rel, pack] of [['src/data/ep4/audio.js', 'ep4'], ['src/data/ep5/audio.js', 'ep5'], ['src/data/ep6/audio.js', 'ep6']]) {
    const f = await frag(rel);
    if (!f) { assert.equal(pack, 'ep6', `the ${pack} fragment exists`); pending.push(pack); continue; }
    for (const kind of ['music', 'sfx', 'ambience', 'jingles']) {
      for (const id of Object.keys(f[kind] || {})) { assert.ok(base[kind] && base[kind][id], `${pack} ${kind}.${id} resolves after the quick start's readyPacks`); checked++; }
    }
    if (f.pack) assert.ok(base.packs && base.packs[pack], `manifest.packs.${pack} declared`);
  }
  if (pending.length) console.log('# src/data/ep6/audio.js not written yet (E6-audio, wave 6c): only the ep4 and ep5 ids are checked');
  assert.ok(checked > 10, `checked ${checked} ids`);
});

test('start: the quick start party is the simulator ep6_airstair loadout (tools/sim/ep6.mjs)', async () => {
  const { EP6_START, EP6_LOADOUT } = await import('../../src/data/ep6/start.js');
  await import('../../tools/sim/ep6.mjs');
  assert.equal(EP6_LOADOUT.source, 'ep6_airstair');
  const L = LOADOUTS.ep6_airstair;
  assert.ok(L, 'LOADOUTS.ep6_airstair');
  for (const id of ['hero', 'mira', 'bram']) {
    assert.deepEqual(EP6_START.members[id].equip, L[id].equip, `${id} equip = ep6_airstair`);
    assert.deepEqual(EP6_START.members[id].mastery, L[id].mastery, `${id} mastery`);
    assert.equal(EP6_START.members[id].weapon, L[id].weapon);
  }
  const all = Object.values(EP6_START.members).flatMap((m) => Object.values(m.equip));
  for (const id of ['oracle_mask', 'caravan_compass']) assert.ok(all.includes(id), `${id} is worn (plan 10.4)`);
});
