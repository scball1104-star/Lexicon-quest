// E5-pack (EPISODE5_PLAN 13.2, 11.1): the ep5 pack table entry, the switch, the core seams, the pack entry (ORDER, guarded
// modules, the ep4 pack first, idempotent register(engine), the audio merge on every path) and the quick start's loadout.
// Pure node tests: no browser, no network. The RULE_EXT seam is qa/core/ep5_rule_ext.test.mjs; the order trap
// qa/core/ep5_maps_order.test.mjs; saves qa/saves/ep5_*; the title offer and debug hook qa/ui/ep5_title.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PACKS, ensurePack, packEnabled, packsForMap, packForMap, packsToAwait, resetPacks, forcePack } from '../../src/game/packs.js';
import { EP4_LIVE, EP5_LIVE, newestWith } from '../../src/game/episodes.js';
import { landing } from '../../src/game/packFallback.js';
import { CREDITS_HANDOFF } from '../../src/game/story.js';
import { END_CARD_EP4 } from '../../src/data/ep4/text.js';
import * as ep4 from '../../src/data/ep4/index.js';
import * as ep5 from '../../src/data/ep5/index.js';
import { LOADOUTS } from '../../tools/sim/loadouts.mjs';
import '../../tools/sim/ep4.mjs';   // adds the ep4_* loadouts

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(NEXT, rel));

test('pack table: the ep5 entry is exactly plan 13.2 seam 1, behind EP5_LIVE', () => {
  const d = PACKS.ep5;
  assert.ok(d, 'PACKS.ep5');
  assert.equal(d.entry, '../data/ep5/index.js');
  assert.equal(d.prefix, 'ep5_');
  assert.equal(d.assets, 'assets/ep5_manifest.json');
  assert.equal(d.audioPack, 'ep5');
  assert.equal(d.hard, true);
  assert.deepEqual(d.touches, ['ep4_vw_inn', 'ep4_valewyn']);
  assert.equal(d.wanted({}), false);
  assert.equal(d.wanted({ ep4_complete: true }), true);
  assert.equal(d.wanted({ ep5_started: true }), true);
  assert.equal(d.wanted({ ep3_complete: true, ep4_started: true }), false);
  assert.equal(d.enabled(), EP5_LIVE);
  assert.equal(EP5_LIVE, true, 'E5-integrate flipped the switch on the branch (shipping stays with Scott or Stephen)');
  assert.equal(EP4_LIVE, true);
  // ep4 comes first in the table, so packForMap still names ep4 for the two shared maps; packsForMap names both
  assert.equal(packForMap('ep4_vw_inn').id, 'ep4');
  assert.deepEqual(packsForMap('ep4_vw_inn').map((p) => p.id), ['ep4', 'ep5']);
  assert.deepEqual(packsForMap('ep4_valewyn').map((p) => p.id), ['ep4', 'ep5']);
  assert.deepEqual(packsForMap('ep4_keep_f1').map((p) => p.id), ['ep4'], 'other Episode 4 maps do not wait for ep5');
  assert.equal(packForMap('ep5_saffron').id, 'ep5');
  assert.equal(packForMap('ep5_lab_oracle').prefixed, true);
  assert.ok(exists('assets/ep5_manifest.json'), 'the (generated) asset fragment exists, so a load never 404s');
  assert.ok(!exists('src/data/ep5/live.js'), 'no live.js: the switch is in episodes.js and nothing of the pack is precached');
  const order = Object.keys(PACKS);
  assert.ok(order.indexOf('ep4') < order.indexOf('ep5'), 'ep4 before ep5 in the table');
});

test('nothing is fetched while EP5_LIVE is false: ensurePack skips without importing, the call sites do not wait for it', async () => {
  resetPacks();
  let calls = 0;
  // the switch is on since E5-integrate: the off state is asserted through the `enabled` override the switch feeds
  const r = await ensurePack('ep5', { importer: async () => { calls++; return {}; }, quiet: true, enabled: false });
  assert.equal(r.skipped, true);
  assert.equal(calls, 0, 'the entry was not imported');
  assert.equal(packEnabled('ep5', { enabled: false }), false);
  assert.equal(packEnabled('ep5'), EP5_LIVE);
  const done4 = { ep4_complete: true, ep3_complete: true, ep2_complete: true, ep1_complete: true };
  assert.ok(!packsToAwait(done4, { enabled: false }).includes('ep5'), 'an Episode 4 finisher does not wait for the pack while it is off');
  assert.equal(packsToAwait(done4).includes('ep5'), EP5_LIVE, 'an Episode 4 finisher waits for the pack only while live');
  assert.equal(packsToAwait({ ep5_started: true }).includes('ep5'), EP5_LIVE);
  resetPacks();
});

test('register(engine): a forced ensurePack hands the engine to the entry and starts the ep5 audio pack', async () => {
  resetPacks();
  let got = 'unset';
  const loaded = [];
  const engine = { audio: { manifest: { sfx: {}, music: {}, ambience: {}, jingles: {} }, loadPack: (id) => { loaded.push(id); return Promise.resolve(); } } };
  forcePack('ep5');   // ?pack=ep5 (QA)
  const r = await ensurePack('ep5', { engine, importer: async () => ({ register: (e) => { got = e; return { id: 'ep5', loaded: [], skipped: [] }; } }), packFiles: null, warm: false, quiet: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(got, engine);
  assert.deepEqual(loaded, ['ep3', 'ep4', 'ep5'], 'ep3 and ep4 start with it (#96: every hard pack above at once)');
  resetPacks();
});

test('seam 3: the title hook line loads the packs only when live with an Episode 4 finisher, or with ?ep=5', () => {
  const t = read('src/scenes/title.js');
  const lines = t.split('\n').filter((l) => l.includes('LQ_EP5'));
  assert.equal(lines.length, 1, 'one hook line');
  const line = lines[0];
  assert.match(line, /EP5_LIVE && newestWith\(e\.save, 'ep4_complete'\)/);
  assert.ok(!/[\u0000-\u0008\u000b-\u001f]/.test(line), 'no control characters in the hook line');
  const m = /\/(\[\?&\]ep=5[^/]*)\//.exec(line);
  assert.ok(m, 'the ?ep=5 test');
  const re = new RegExp(m[1]);
  assert.ok(re.test('?debug=1&ep=5') && re.test('?ep=5') && !re.test('?ep=4') && !re.test('?ep=55'), `the ?ep=5 test matches (${m[1]})`);
  // both fetches start at once (ep5's entry orders the registration: ep4 first), each with the engine
  assert.match(line, /forcePack\('ep5'\); ensurePack\('ep4', \{ engine: e \}\); ensurePack\('ep5', \{ engine: e \}\)\.then\(\(\) => globalThis\.LQ_EP5 && LQ_EP5\.title\(this\)\)/);
  assert.match(t, /import \{[^}]*EP5_LIVE, newestWith \} from '\.\.\/game\/episodes\.js'/);
  // the Episode 4 hook line is untouched
  assert.match(t, /if \(\(EP4_LIVE && this\.ep3\.slot != null\) \|\| \/\[\?&\]ep=4\\b\/\.test/);
});

test('newestWith (exported for the hook) finds the newest slot with a flag; nothing on an empty or missing save', () => {
  const envs = { 1: { savedAt: '2026-11-01T00:00:00Z', data: { flags: { ep4_complete: true }, heroName: 'Old' } },
    2: { savedAt: '2026-11-07T00:00:00Z', data: { flags: { ep4_complete: true }, heroName: 'New' } }, 3: { data: { flags: {} } } };
  const save = { slots: 3, loadEnvelope: (n) => envs[n] || null };
  assert.deepEqual(newestWith(save, 'ep4_complete'), { slot: 2, at: Date.parse('2026-11-07T00:00:00Z'), name: 'New' });
  assert.equal(newestWith(save, 'ep5_complete'), null);
  assert.equal(newestWith(null, 'ep4_complete'), null);
});

test('seam 5: an Episode 5 save lands where an Episode 4 one does (Emberpeak east road end), never on Test Town', () => {
  for (const id of ['ep5_ship', 'ep5_saffron', 'ep5_lab_f2', 'ep5_lab_oracle', 'ep5_somethingnew']) {
    assert.deepEqual(landing(id), landing('ep4_keep_f1'), `${id} lands as an ep4 map does`);
    assert.equal(landing(id)[0], 'emberpeak');
  }
  assert.equal(landing('ep7_x'), null);   // ep6 lands the same way since E6-pack (qa/core/ep6_pack.test.mjs)
  assert.equal(landing('ep55_x'), null);
  assert.equal(landing('ep4_vw_inn')[0], 'emberpeak', 'Episode 4 unchanged');
  assert.equal(landing('pk_inn'), null);
  assert.match(read('src/game/packFallback.js'), /\/\^ep\[456\]_\/\.test\(id\) \? E/);
});

test('pack entry: ORDER, missing modules skipped, idempotent, the ep4 pack registered first, maps and hooks run', async () => {
  assert.deepEqual(ep5.ORDER, ['flags', 'enemies', 'items', 'skills', 'loot', 'encounters', 'sky', 'shops', 'ai', 'npcs', 'quests',
    'text', 'story', 'ledger', 'audio', 'world', 'pages', 'maps', 'hooks', 'start', 'scene']);
  assert.ok(!ep5.ORDER.includes('title'), 'title is loaded on first use by hooks.js');
  const p1 = ep5.register();
  const p2 = ep5.register();
  assert.equal(p1, p2, 'the same promise');
  const r = await p1;
  assert.equal(r.id, 'ep5');
  for (const name of ['maps', 'hooks', 'start']) assert.ok(r.loaded.includes(name), `${name} loaded`);
  for (const name of ep5.ORDER) {
    const there = exists(`src/data/ep5/${name}.js`);
    assert.equal(r.loaded.includes(name), there, `${name}: loaded exactly when the file exists`);
    assert.equal(r.skipped.includes(name), !there, `${name}: skipped exactly when the file is missing`);
  }
  assert.equal(ep5.EP5_READY, true);
  assert.equal(ep4.EP4_READY, true, 'the ep4 pack registered first (Valewyn NPCs, Episode 4 maps)');
  assert.ok(CREDITS_HANDOFF[4], 'the ep4 hooks ran before the ep5 hooks');
  assert.ok(globalThis.LQ_EP5 && typeof globalThis.LQ_EP5.title === 'function' && typeof globalThis.LQ_EP5.start === 'function');
  assert.equal(CREDITS_HANDOFF[4].endCard.sub, EP5_LIVE ? 'Episode 5 begins in the morning.' : END_CARD_EP4.sub,
    'the Episode 4 end card says Episode 5 begins in the morning while EP5_LIVE, unchanged while off');
  assert.equal(ep5.EP5_MAPS_LISTED, ep5.mapsListed());
  if (!exists('src/data/ep5/encounters.js')) assert.equal(ep5.EP5_MAPS_LISTED, false);
  const src = read('src/data/ep5/index.js');
  assert.ok(src.indexOf('await ensureEp4(engine)') < src.indexOf('for (const name of ORDER)'), 'run() awaits ep4 before the first ep5 module');
});

test('audio: mergeAudio adds ids, never overwrites one, declares packs.ep5; the runtime manifest is found on .real too', () => {
  const man = { music: { saffron: { src: 'x' } }, sfx: { cursor: { src: 'c.wav' } }, ambience: {}, jingles: {}, packs: { ep4: { sfx: [] } } };
  const frag = { music: { saffron: { src: 'other' }, labyrinth: { src: 'm.mp3' } }, sfx: { cursor: { src: 'no.wav' }, sun_dial: { src: 'assets/audio/sfx/ep5_sun_dial.wav', pack: 'ep5' } },
    ambience: { desert_wind: { src: 'a.mp3' } }, pack: { sfx: ['sun_dial'] } };
  const r = ep5.mergeAudio(man, frag);
  assert.equal(man.music.saffron.src, 'x', 'kept');
  assert.equal(man.sfx.cursor.src, 'c.wav', 'kept');
  assert.ok(man.music.labyrinth && man.sfx.sun_dial && man.ambience.desert_wind);
  assert.deepEqual(man.packs.ep5, { sfx: ['sun_dial'] });
  assert.deepEqual(man.packs.ep4, { sfx: [] }, 'the ep4 entry is untouched');
  assert.deepEqual(r.clashes.sort(), ['music.saffron', 'sfx.cursor']);
  assert.equal(ep5.mergeAudio(man, frag).added, 0, 'a second merge adds nothing');
  const inner = { sfx: {} };
  assert.equal(ep5.audioManifestOf({ audio: { real: { manifest: inner } } }), inner);
  assert.equal(ep5.audioManifestOf({ audio: { manifest: inner } }), inner);
  assert.equal(ep5.audioManifestOf(null), null);
});

test('the quick start\'s packs: readyPacks(engine) leaves every ep4 and ep5 audio id in that engine\'s manifest', async () => {
  const { readyPacks } = await import('../../src/data/ep5/hooks.js');
  const base = JSON.parse(read('assets/audio/manifest.json'));
  const engine = { audio: { real: { manifest: base }, loadPack: () => Promise.resolve() } };   // the safeAudio wrapper shape
  await readyPacks(engine);
  const frag = async (rel) => (exists(rel) ? ep5.audioFragment(await import(pathToFileURL(path.join(NEXT, rel)).href)) : null);
  let checked = 0;
  for (const [rel, pack] of [['src/data/ep4/audio.js', 'ep4'], ['src/data/ep5/audio.js', 'ep5']]) {
    const f = await frag(rel);
    if (!f) { assert.equal(pack, 'ep5', 'the ep4 fragment exists'); continue; }
    for (const kind of ['music', 'sfx', 'ambience', 'jingles']) {
      for (const id of Object.keys(f[kind] || {})) { assert.ok(base[kind] && base[kind][id], `${pack} ${kind}.${id} resolves after the quick start's readyPacks`); checked++; }
    }
    if (f.pack) assert.ok(base.packs && base.packs[pack], `manifest.packs.${pack} declared`);
  }
  assert.ok(checked > 5, `checked ${checked} ids`);
});

test('start: the quick start party mirrors the simulator loadout (ep5_ship when it exists, else ep4_keep_crown + the two)', async () => {
  const { EP5_START, EP5_LOADOUT } = await import('../../src/data/ep5/start.js');
  if (exists('tools/sim/ep5.mjs')) await import('../../tools/sim/ep5.mjs');
  const L = LOADOUTS.ep5_ship;
  for (const id of ['hero', 'mira', 'bram']) {
    if (L) { assert.deepEqual(EP5_START.members[id].equip, L[id].equip, `${id} equip = ep5_ship`); continue; }
    const baseRow = LOADOUTS[EP5_LOADOUT.source][id];
    assert.deepEqual(EP5_START.members[id].equip, { ...baseRow.equip, ...(EP5_LOADOUT.plus[id] || {}) }, `${id} equip = ep4_keep_crown + plus`);
    assert.deepEqual(EP5_START.members[id].mastery, baseRow.mastery, `${id} mastery`);
    assert.equal(EP5_START.members[id].weapon, baseRow.weapon);
  }
  const all = Object.values(EP5_START.members).flatMap((m) => Object.values(m.equip));
  for (const id of ['first_bell_hammer', 'regents_seal', 'tidewarden_trident']) assert.ok(all.includes(id), `${id} is worn (plan 10.4)`);
});
