// H7-hard-road: Fine Print is a pack (src/data/tier/**, docs/PWA_PACKS.md): out of the first download and the precache except
// its switch, loaded by the title for a record that can carry and by any tier_1 game. The shell holds one guarded line in each
// file it touches, and nothing else of the tier. Strings in one place, no em dashes, and the old working name is not an id.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKS, ensurePack, resetPacks, packWanted, packsToAwait } from '../../src/game/packs.js';
import { register, unregister, HOOKS } from '../../src/data/tier/index.js';
import { TIER } from '../../src/data/tier/text.js';
import { parseSw } from '../pwa/_lib.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const walk = (dir, out = []) => {
  for (const f of fs.readdirSync(path.join(NEXT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, f.name);
    if (f.name === 'out') continue;
    if (f.isDirectory()) walk(rel, out); else out.push(rel);
  }
  return out;
};

test('the pack row: entry, no art, wanted by a tier_1 game only, always enabled', () => {
  const d = PACKS.tier;
  assert.ok(d, 'PACKS.tier');
  assert.equal(d.entry, '../data/tier/index.js');
  assert.equal(d.assets, 'assets/tier_manifest.json');
  assert.equal(d.audioPack, null);
  assert.deepEqual(d.touches, []);
  assert.ok(fs.existsSync(path.join(NEXT, 'src/game', d.entry)));
  const m = JSON.parse(read(d.assets));
  for (const k of ['images', 'atlases', 'json', 'fonts']) assert.deepEqual(m[k], {}, `the manifest names no ${k}`);
  assert.equal(packWanted('tier', { tier_1: true }), true);
  assert.equal(packWanted('tier', { ep2_complete: true }), false, 'a finished record loads it from the title only');
  assert.equal(packWanted('tier', {}), false);
  assert.ok(d.enabled());
});

test('ensurePack(tier) registers the hooks; register() is idempotent; unregister() takes the hooks away', async () => {
  unregister();
  resetPacks();
  assert.ok(packsToAwait({ tier_1: true }).includes('tier'), 'a tier game waits for the pack (at most 1.5 s)');
  const r = await ensurePack('tier', { importer: (p) => import(new URL(p, new URL('../../src/game/', import.meta.url)).href), warm: false, quiet: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(globalThis.LQ_TIER, HOOKS);
  assert.deepEqual(register(), { ok: true, skipped: [] });
  for (const k of ['foe', 'drops', 'title']) assert.equal(typeof HOOKS[k], 'function');
  unregister();
  assert.equal(globalThis.LQ_TIER, undefined);
  resetPacks();
});

test('the shell: one guarded line per file it touches, and none in the hot files the tier does not need', () => {
  const seams = {
    'src/battle/rules.js': /if \(globalThis\.LQ_TIER\) \(\{ hp, atk, mag, def, spd, exp, gold \} = LQ_TIER\.foe\(/,
    'src/battle/loot.js': /const tier = globalThis\.LQ_TIER && LQ_TIER\.drops\(rng, killed, opts\); if \(tier\) return tier;/,
    'src/scenes/title.js': /if \(this\.ep3\.slot != null\) ensurePack\('tier'\)/,
    'src/game/state.js': /const r = \(g\.reserve \|\| \[\]\)\.findIndex\(\(m\) => m\.id === id\); if \(r >= 0\) g\.party\.push/,
    'src/game/packs.js': /^ {2}tier: \{ entry: '\.\.\/data\/tier\/index\.js'/m,
  };
  for (const [f, re] of Object.entries(seams)) {
    const t = read(f);
    assert.match(t, re, `${f}: the seam`);
    const hits = t.split('\n').filter((l) => /LQ_TIER|Fine Print|data\/tier/.test(l));
    assert.equal(hits.length, 1, `${f}: exactly one line (${hits.length})`);
  }
  for (const f of ['src/scenes/field.js', 'src/data/text.js', 'src/data/encounters.js', 'src/main.js', 'src/data/expcurve.js', 'src/data/shops.js', 'src/data/loot-tables.js']) {
    assert.ok(!/LQ_TIER|tier_1|data\/tier/.test(read(f)), `${f}: untouched by the tier`);
  }
});

test('precache: the tier pack is out of the shell and the preload; only its switch is in', () => {
  const pre = parseSw().entries;
  const files = walk('src/data/tier');
  assert.ok(files.includes('src/data/tier/live.js') && files.includes('src/data/tier/index.js'));
  const lists = JSON.parse(read('assets/pack_files.json'));
  if (!lists.tier) {
    // the generated lists are refreshed at the wave close (python tools/pwa/build_pwa.py); until then say so, do not fail
    console.log('# WARNING: assets/pack_files.json has no tier list yet (run python tools/pwa/build_pwa.py)');
    return;
  }
  for (const f of files) {
    if (f === 'src/data/tier/live.js') { assert.ok(pre.includes(f), 'live.js is precached'); continue; }
    assert.ok(!pre.includes(f), `pack file in the precache: ${f}`);
    assert.ok(lists.tier.includes(f), `listed as a pack file: ${f}`);
  }
  const html = read('index.html');
  assert.ok(!/src\/data\/tier\/(?!live)/.test(html), 'no tier pack file is preloaded');
});

test('strings: every player-facing line in TIER, the name Fine Print, no em dash; the working name is no id', () => {
  assert.equal(TIER.name, 'Fine Print');
  assert.equal(TIER.row, 'Fine Print');
  const all = JSON.stringify(TIER);
  assert.ok(!/\u2014/.test(all), 'no em dash in TIER');
  for (const f of walk('src/data/tier')) assert.ok(!/\u2014/.test(read(f)), `${f}: no em dash`);
  for (const f of ['docs/TIER.md', 'tools/sim/tier.mjs', ...walk('qa/tier').filter((x) => /\.(mjs|py)$/.test(x))]) {
    if (fs.existsSync(path.join(NEXT, f))) assert.ok(!/\u2014/.test(read(f)), `${f}: no em dash`);
  }
  for (const f of walk('src').filter((x) => x.endsWith('.js'))) assert.ok(!/hard_road|hardRoad|HARD_ROAD(?!\.md|'s)/.test(read(f)), `${f}: no hard_road id (the plan doc docs/HARD_ROAD.md may be named)`);
});
