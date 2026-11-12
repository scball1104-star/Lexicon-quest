// E7-pack (EPISODE7_PLAN 13.2, 11.1): the ep7 pack table entry, the switch, the four core seams, the pack entry (ORDER, guarded
// modules, the ep6 pack first, idempotent register(engine), the audio merge on every path) and the quick start's loadout.
// Pure node tests: no browser, no network. The order trap is qa/core/ep7_maps_order.test.mjs; saves qa/saves/ep7_*; the title
// offer and the hooks qa/ui/ep7_title.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PACKS, ensurePack, packEnabled, packsForMap, packForMap, packsToAwait, resetPacks, forcePack } from '../../src/game/packs.js';
import { EP6_LIVE, EP7_LIVE } from '../../src/game/episodes.js';
import { landing } from '../../src/game/packFallback.js';
import { CREDITS_HANDOFF } from '../../src/game/story.js';
import { END_CARD_EP6 } from '../../src/data/ep6/text.js';
import * as ep6 from '../../src/data/ep6/index.js';
import * as ep7 from '../../src/data/ep7/index.js';
import { LOADOUTS } from '../../tools/sim/loadouts.mjs';
import '../../tools/sim/ep4.mjs';
import '../../tools/sim/ep5.mjs';
import '../../tools/sim/ep6.mjs';   // adds the ep6_* loadouts

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(NEXT, rel));

test('pack table: the ep7 entry is exactly plan 13.2 seam 1, behind EP7_LIVE', () => {
  const d = PACKS.ep7;
  assert.ok(d, 'PACKS.ep7');
  assert.equal(d.entry, '../data/ep7/index.js');
  assert.equal(d.prefix, 'ep7_');
  assert.equal(d.assets, 'assets/ep7_manifest.json');
  assert.equal(d.audioPack, 'ep7');
  assert.equal(d.hard, true);
  assert.deepEqual(d.touches, ['ep6_zl_inn', 'ep6_zl_charts', 'ep6_zephyr']);
  assert.equal(d.wanted({}), false);
  assert.equal(d.wanted({ ep6_complete: true }), true);
  assert.equal(d.wanted({ ep7_started: true }), true);
  assert.equal(d.wanted({ ep5_complete: true, ep6_started: true }), false, 'an Episode 6 run before its credits does not want it');
  assert.equal(d.enabled(), EP7_LIVE);
  assert.equal(typeof EP7_LIVE, 'boolean', 'seam 2: the switch (E7-integrate flips it on the branch; shipping stays with Scott or Stephen)');
  assert.equal(EP6_LIVE, true);
  // ep6 comes first in the table, so packForMap still names ep6 for the three shared maps; packsForMap names both
  for (const id of ['ep6_zl_inn', 'ep6_zl_charts', 'ep6_zephyr']) {
    assert.equal(packForMap(id).id, 'ep6');
    assert.deepEqual(packsForMap(id).map((p) => p.id), ['ep6', 'ep7'], `${id} waits for both packs`);
  }
  assert.deepEqual(packsForMap('ep6_obs_f2').map((p) => p.id), ['ep6'], 'other Episode 6 maps do not wait for ep7');
  assert.deepEqual(packsForMap('ep5_sh_inn').map((p) => p.id), ['ep5', 'ep6'], 'Episode 5 maps unchanged');
  assert.equal(packForMap('ep7_palehaven').id, 'ep7');
  assert.equal(packForMap('ep7_vault_f2').prefixed, true);
  assert.ok(exists('assets/ep7_manifest.json'), 'the (generated) asset fragment exists, so a load never 404s');
  assert.ok(!exists('src/data/ep7/live.js'), 'no live.js: the switch is in episodes.js and nothing of the pack is precached');
  const order = Object.keys(PACKS);
  assert.ok(order.indexOf('ep6') < order.indexOf('ep7'), 'ep6 before ep7 in the table (the hard chain)');
  assert.deepEqual(order.filter((id) => PACKS[id].hard), ['ep3', 'ep4', 'ep5', 'ep6', 'ep7']);
});

test('nothing is fetched while EP7_LIVE is false: ensurePack skips without importing, the call sites do not wait for it', async () => {
  resetPacks();
  let calls = 0;
  const r = await ensurePack('ep7', { importer: async () => { calls++; return {}; }, quiet: true, enabled: false });
  assert.equal(r.skipped, true);
  assert.equal(calls, 0, 'the entry was not imported');
  assert.equal(packEnabled('ep7', { enabled: false }), false);
  assert.equal(packEnabled('ep7'), EP7_LIVE);
  if (!EP7_LIVE) {
    let real = 0;
    const r2 = await ensurePack('ep7', { importer: async () => { real++; return {}; }, quiet: true });
    assert.equal(r2.skipped, true, 'the real switch, off: skipped');
    assert.equal(real, 0);
  }
  const done6 = { ep6_complete: true, ep5_complete: true, ep4_complete: true, ep3_complete: true, ep2_complete: true, ep1_complete: true };
  assert.ok(!packsToAwait(done6, { enabled: false }).includes('ep7'), 'an Episode 6 finisher does not wait for the pack while it is off');
  assert.ok(!packsToAwait({ ep7_started: true }, { enabled: false }).includes('ep7'));
  assert.equal(packsToAwait(done6).includes('ep7'), EP7_LIVE, 'an Episode 6 finisher waits for the pack only while live');
  assert.ok(packsToAwait(done6, { enabled: true }).includes('ep7'), 'and does once the switch is on');
  const done5 = { ep5_complete: true, ep4_complete: true, ep3_complete: true, ep2_complete: true, ep1_complete: true };
  assert.ok(!packsToAwait(done5, { enabled: true }).includes('ep7'), 'an Episode 5 save (no ep6_complete) never wants the pack');
  assert.ok(!packsToAwait({ ...done5, ep6_started: true }, { enabled: true }).includes('ep7'), 'nor a run in the middle of Episode 6');
  resetPacks();
});

test('register(engine): a forced ensurePack hands the engine to the entry and starts every hard pack above it at once', async () => {
  resetPacks();
  let got = 'unset';
  const loaded = [];
  const engine = { audio: { manifest: { sfx: {}, music: {}, ambience: {}, jingles: {} }, loadPack: (id) => { loaded.push(id); return Promise.resolve(); } } };
  forcePack('ep7');   // ?pack=ep7 (QA)
  const r = await ensurePack('ep7', { engine, importer: async () => ({ register: (e) => { got = e; return { id: 'ep7', loaded: [], skipped: [] }; } }), packFiles: null, warm: false, quiet: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(got, engine);
  assert.deepEqual(loaded, ['ep3', 'ep4', 'ep5', 'ep6', 'ep7'], 'ep3 to ep6 start with it (#96: every hard pack above at once)');
  resetPacks();
});

test('seam 3: one title hook line, live with an Episode 6 finisher or ?ep=7, starts ep6 and ep7, then calls LQ_EP7.title', () => {
  const t = read('src/scenes/title.js');
  const lines = t.split('\n').filter((l) => l.includes('LQ_EP7'));
  assert.equal(lines.length, 1, 'one hook line');
  const line = lines[0];
  assert.match(line, /EP7_LIVE && newestWith\(e\.save, 'ep6_complete'\)/);
  assert.ok(!/[\u0000-\u0008\u000b-\u001f]/.test(line), 'no control characters in the hook line');
  const m = /\/(\[\?&\]ep=7[^/]*)\//.exec(line);
  assert.ok(m, 'the ?ep=7 test');
  const re = new RegExp(m[1]);
  assert.ok(re.test('?debug=1&ep=7') && re.test('?ep=7') && !re.test('?ep=6') && !re.test('?ep=77'), `the ?ep=7 test matches (${m[1]})`);
  // both fetches start at once; the ep7 promise settles only after the ep7 entry awaited the ep6 pack (index.js ensureEp6), so
  // LQ_EP7.title runs after ep6, then ep7, have registered
  assert.match(line, /forcePack\('ep7'\); ensurePack\('ep6', \{ engine: e \}\); ensurePack\('ep7', \{ engine: e \}\)\.then\(\(\) => globalThis\.LQ_EP7 && LQ_EP7\.title\(this\)\)/);
  assert.match(read('src/data/ep7/index.js'), /await ensureEp6\(engine\)/);
  assert.match(t, /import \{[^}]*EP7_LIVE, EP6_LIVE, EP5_LIVE, newestWith \} from '\.\.\/game\/episodes\.js'/);
  // the Episode 4 to 6 hook lines are untouched
  assert.equal(t.split('\n').filter((l) => l.includes('LQ_EP6')).length, 1);
  assert.match(t, /forcePack\('ep6'\); ensurePack\('ep5', \{ engine: e \}\); ensurePack\('ep6', \{ engine: e \}\)\.then\(\(\) => globalThis\.LQ_EP6 && LQ_EP6\.title\(this\)\); \}/);
  assert.match(read('src/game/episodes.js'), /^export const EP7_LIVE = (true|false);$/m);
});

test('seam 4: an Episode 7 save lands where an Episode 4 to 6 one does (Emberpeak east road end), never on Test Town', () => {
  for (const id of ['ep7_white_road', 'ep7_waystation', 'ep7_palehaven', 'ep7_ph_watch', 'ep7_vault_f2', 'ep7_stillheart', 'ep7_somethingnew']) {
    assert.deepEqual(landing(id), landing('ep6_obs_f2'), `${id} lands as an ep6 map does`);
    assert.equal(landing(id)[0], 'emberpeak');
  }
  assert.equal(landing('ep8_x'), null);
  assert.equal(landing('ep77_x'), null);
  for (const id of ['ep4_vw_inn', 'ep5_saffron', 'ep6_zephyr']) assert.equal(landing(id)[0], 'emberpeak', `${id} unchanged`);
  assert.equal(landing('pk_inn'), null);
  assert.match(read('src/game/packFallback.js'), /\/\^ep\[4567\]_\/\.test\(id\) \? E/);
});

test('pack entry: ORDER, missing modules skipped, idempotent, the ep6 pack registered first, maps and hooks run', async () => {
  assert.deepEqual(ep7.ORDER, ['flags', 'enemies', 'items', 'skills', 'loot', 'encounters', 'rime', 'shops', 'ai', 'npcs', 'quests',
    'text', 'story', 'ledger', 'audio', 'world', 'pages', 'maps', 'hooks', 'start', 'scene']);
  assert.ok(!ep7.ORDER.includes('title'), 'title is loaded on first use by hooks.js');
  const p1 = ep7.register();
  const p2 = ep7.register();
  assert.equal(p1, p2, 'the same promise');
  const r = await p1;
  assert.equal(r.id, 'ep7');
  for (const name of ['maps', 'hooks', 'start']) assert.ok(r.loaded.includes(name), `${name} loaded`);
  for (const name of ep7.ORDER) {
    const there = exists(`src/data/ep7/${name}.js`);
    assert.equal(r.loaded.includes(name), there, `${name}: loaded exactly when the file exists`);
    assert.equal(r.skipped.includes(name), !there, `${name}: skipped exactly when the file is missing`);
  }
  assert.equal(ep7.EP7_READY, true);
  assert.equal(ep6.EP6_READY, true, 'the ep6 pack registered first (Zephyr Landing, the Episode 6 maps)');
  assert.ok(CREDITS_HANDOFF[6], 'the ep6 hooks ran before the ep7 hooks');
  assert.ok(globalThis.LQ_EP7 && typeof globalThis.LQ_EP7.title === 'function' && typeof globalThis.LQ_EP7.start === 'function'
    && typeof globalThis.LQ_EP7.offer === 'function');
  if (!EP7_LIVE) assert.deepEqual(CREDITS_HANDOFF[6].endCard, END_CARD_EP6, 'EP7_LIVE false: the Episode 6 end card is unchanged');
  assert.equal(CREDITS_HANDOFF[6].endCard.sub, EP7_LIVE ? 'Episode 7 begins in the morning.' : 'Episode 7 is not playable yet.', 'the Episode 6 end card follows the switch');
  assert.deepEqual([CREDITS_HANDOFF[6].map, CREDITS_HANDOFF[6].mark], ['ep6_zl_inn', 'inn_bed'], 'the Episode 6 wake never moves (plan 3)');
  assert.equal(ep7.EP7_MAPS_LISTED, ep7.mapsListed());
  if (!exists('src/data/ep7/encounters.js')) assert.equal(ep7.EP7_MAPS_LISTED, false, 'no encounters.js yet: the maps are not listed');
  const src = read('src/data/ep7/index.js');
  assert.ok(src.indexOf('await ensureEp6(engine)') < src.indexOf('for (const name of ORDER)'), 'run() awaits ep6 before the first ep7 module');
  assert.ok(src.indexOf('prefetchCode()') < src.indexOf('await ensureEp6(engine)'), 'the ep7 fetches start before the wait');
  assert.equal(ep7.register(), p1, 'still the same promise after success');
});

test('audio: mergeAudio adds ids, never overwrites one, declares packs.ep7; the ep6 entry is untouched', () => {
  const man = { music: { zephyr: { src: 'x' } }, sfx: { ice: { src: 'c.wav' } }, ambience: {}, jingles: {}, packs: { ep6: { sfx: ['gust_carry'] } } };
  const frag = { music: { zephyr: { src: 'other' }, palehaven: { src: 'm.mp3' } }, sfx: { ice: { src: 'no.wav' }, stone_hold: { src: 'assets/audio/sfx/ep7_stone_hold.wav', pack: 'ep7' } },
    ambience: { snow_wind: { src: 'a.mp3' } }, pack: { sfx: ['stone_hold'] } };
  const r = ep7.mergeAudio(man, frag);
  assert.equal(man.music.zephyr.src, 'x', 'kept');
  assert.equal(man.sfx.ice.src, 'c.wav', 'kept');
  assert.ok(man.music.palehaven && man.sfx.stone_hold && man.ambience.snow_wind);
  assert.deepEqual(man.packs.ep7, { sfx: ['stone_hold'] });
  assert.deepEqual(man.packs.ep6, { sfx: ['gust_carry'] });
  assert.deepEqual(r.clashes.sort(), ['music.zephyr', 'sfx.ice']);
  assert.equal(ep7.mergeAudio(man, frag).added, 0, 'a second merge adds nothing');
  const inner = { sfx: {} };
  assert.equal(ep7.audioManifestOf({ audio: { real: { manifest: inner } } }), inner);
});

test('the quick start\'s packs: readyPacks(engine) leaves every ep4 to ep7 audio id in that engine\'s manifest (zephyr too)', async () => {
  const { readyPacks } = await import('../../src/data/ep7/hooks.js');
  const base = JSON.parse(read('assets/audio/manifest.json'));
  const engine = { audio: { real: { manifest: base }, loadPack: () => Promise.resolve() } };   // the safeAudio wrapper shape
  await readyPacks(engine);
  const frag = async (rel) => (exists(rel) ? ep7.audioFragment(await import(pathToFileURL(path.join(NEXT, rel)).href)) : null);
  let checked = 0;
  const pending = [];
  for (const [rel, pack] of [['src/data/ep4/audio.js', 'ep4'], ['src/data/ep5/audio.js', 'ep5'], ['src/data/ep6/audio.js', 'ep6'], ['src/data/ep7/audio.js', 'ep7']]) {
    const f = await frag(rel);
    if (!f) { assert.equal(pack, 'ep7', `the ${pack} fragment exists`); pending.push(pack); continue; }
    for (const kind of ['music', 'sfx', 'ambience', 'jingles']) {
      for (const id of Object.keys(f[kind] || {})) { assert.ok(base[kind] && base[kind][id], `${pack} ${kind}.${id} resolves after the quick start's readyPacks`); checked++; }
    }
    if (f.pack) assert.ok(base.packs && base.packs[pack], `manifest.packs.${pack} declared`);
  }
  assert.ok(base.music.zephyr, 'Act I plays zephyr (the ep6 fragment)');
  if (pending.length) console.log('# src/data/ep7/audio.js not written yet (E7-audio, wave 7c): only the ep4 to ep6 ids are checked');
  assert.ok(checked > 10, `checked ${checked} ids`);
});

test('start: the quick start party is the simulator ep7_white_road loadout, or plan 10.4\'s fallback until it exists', async () => {
  const { EP7_START, EP7_LOADOUT } = await import('../../src/data/ep7/start.js');
  let simEp7 = false;
  if (exists('tools/sim/ep7.mjs')) { await import('../../tools/sim/ep7.mjs'); simEp7 = true; }
  const L = LOADOUTS.ep7_white_road;
  if (simEp7 && L) {
    for (const id of ['hero', 'mira', 'bram']) {
      assert.deepEqual(EP7_START.members[id].equip, L[id].equip, `${id} equip = ep7_white_road`);
      assert.deepEqual(EP7_START.members[id].mastery, L[id].mastery, `${id} mastery`);
      assert.equal(EP7_START.members[id].weapon, L[id].weapon);
    }
  } else {
    console.log('# tools/sim/ep7.mjs LOADOUTS.ep7_white_road not here yet (E7-battle, wave 7a): checked against ep6_obs_eyrie plus the two charms');
    assert.equal(EP7_LOADOUT.source, 'ep6_obs_eyrie');
    const E = LOADOUTS.ep6_obs_eyrie;
    for (const id of ['hero', 'mira', 'bram']) {
      assert.deepEqual(EP7_START.members[id].equip, { ...E[id].equip, ...(EP7_LOADOUT.plus[id] || {}) }, `${id} equip = ep6_obs_eyrie + plan 10.4`);
      assert.deepEqual(EP7_START.members[id].mastery, E[id].mastery, `${id} mastery`);
      assert.equal(EP7_START.members[id].weapon, E[id].weapon);
    }
  }
  const all = Object.values(EP7_START.members).flatMap((m) => Object.values(m.equip));
  for (const id of ['scribe_quill', 'kestrel_wings']) assert.ok(all.includes(id), `${id} is worn (plan 10.4)`);
});
