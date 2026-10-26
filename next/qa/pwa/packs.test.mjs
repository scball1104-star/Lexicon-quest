// Expansion packs and the PWA (XP-packs, docs/PWA_PACKS.md): no pack file is precached or preloaded, the generated list of pack
// files is current and every file exists, every file a pack manifest names exists, the packs are inside their wire caps, and the
// service worker has its runtime route for them.
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NEXT, read, exists, readJson, parseSw, sizeOf } from './_lib.mjs';

const { PACKS } = await import(pathToFileURL(path.join(NEXT, 'src', 'game', 'packs.js')).href);
const sw = parseSw();
const lists = readJson('assets/pack_files.json');
const ratchet = readJson('qa/pwa/budget_ratchet.json');
const MB = 1048576;
const wire = (rel) => (/\.(js|json|html|webmanifest)$/.test(rel) ? zlib.gzipSync(fs.readFileSync(path.join(NEXT, rel)), { level: 6 }).length : sizeOf(rel));

/** The prefix rule of XP-packs.md section 1, written independently of tools/pwa/build_pwa.py (the test checks the tool against it). */
function ownedBy(rel, id) {
  const pre = PACKS[id].prefix;
  if (rel === `src/data/${id}/live.js`) return false;
  if (rel.startsWith(`src/data/${id}/`)) return true;
  if (rel.startsWith(`src/data/maps/${pre}`) && rel.endsWith('.js')) return true;
  if (rel === `assets/${id}_manifest.json`) return true;
  const m = /^assets\/(tiles|sprites|ui|backdrops)\/([^/]+)$/.exec(rel);
  return !!m && (m[2].startsWith(pre) || m[2].replace(/\.[^.]+$/, '') === id);
}
function walk(dir, out = []) {
  for (const f of fs.readdirSync(path.join(NEXT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, f.name);
    if (f.name === 'out' || f.name === 'node_modules') continue;
    if (f.isDirectory()) walk(rel, out); else out.push(rel);
  }
  return out;
}

test('pack table: both packs, and the mirror tools/pwa/packs.json equals it', () => {
  assert.deepEqual(Object.keys(PACKS).sort(), ['x1', 'x2']);
  const mirror = readJson('tools/pwa/packs.json');
  for (const [id, d] of Object.entries(PACKS)) {
    assert.deepEqual(mirror[id], { entry: d.entry, prefix: d.prefix, assets: d.assets, audioPack: d.audioPack, touches: d.touches }, `mirror of ${id}`);
    assert.ok(exists(path.posix.join('src/game', d.entry)), `${id} entry module exists`);
    assert.ok(exists('src/data/' + id + '/live.js'), `${id} live.js exists (the switch is in the initial bundle)`);
  }
});

test('no pack file is in the precache or the modulepreload block; live.js is', () => {
  const html = read('index.html');
  const block = html.slice(html.indexOf('<!-- modulepreload:begin'), html.indexOf('<!-- modulepreload:end'));
  for (const id of Object.keys(PACKS)) {
    for (const e of sw.entries) assert.ok(!ownedBy(e, id), `pack file in the precache: ${e}`);
    for (const m of block.matchAll(/href="([^"]+)"/g)) assert.ok(!ownedBy(m[1], id), `pack file preloaded: ${m[1]}`);
    assert.ok(sw.entries.includes(`src/data/${id}/live.js`), `${id}/live.js is precached`);
    assert.ok(sw.entries.includes('src/game/packs.js'), 'packs.js is precached');
  }
});

test('assets/pack_files.json: current, sorted, every file exists, covers the whole prefix rule', () => {
  for (const id of Object.keys(PACKS)) {
    const listed = lists[id];
    assert.ok(Array.isArray(listed), `${id} is listed`);
    assert.deepEqual(listed, [...listed].sort(), `${id} list is sorted`);
    for (const f of listed) assert.ok(exists(f), `listed pack file exists: ${f}`);
    assert.ok(listed.includes(`src/data/${id}/index.js`), `${id} entry is listed`);
    assert.ok(listed.includes(`assets/${id}_manifest.json`), `${id} manifest is listed`);
    assert.ok(!listed.includes(`src/data/${id}/live.js`), 'live.js is not a pack file');
    // Currency follows the release-gate convention of precache.test.mjs: day to day (other agents add pack files all the time)
    // a stale list is a WARNING; LQ_RELEASE=1 (and the wave-close checklist) makes it a failure. Existence above is always hard.
    const onDisk = [...walk('src'), ...walk('assets')].filter((r) => !r.endsWith('.md') && ownedBy(r, id)).sort();
    const same = JSON.stringify(listed) === JSON.stringify(onDisk);
    if (!same && process.env.LQ_RELEASE === '1') assert.deepEqual(listed, onDisk, `${id}: assets/pack_files.json is stale (run python tools/pwa/build_pwa.py)`);
    if (!same) console.log(`# WARNING (fails with LQ_RELEASE=1): ${id} assets/pack_files.json is stale (run python tools/pwa/build_pwa.py)`);
  }
});

test('every file a pack manifest names exists and is in its pack list', () => {
  for (const [id, d] of Object.entries(PACKS)) {
    const m = readJson(d.assets);
    const named = [];
    for (const kind of ['images', 'json', 'atlases', 'fonts']) {
      for (const e of Object.values(m[kind] || {})) {
        const rel = typeof e === 'string' ? e : e.path;
        named.push(rel);
        if (kind === 'atlases' || kind === 'fonts') {
          const j = readJson(rel);
          if (j.image) named.push(path.posix.join(path.posix.dirname(rel), j.image));
        }
      }
    }
    for (const rel of named) {
      assert.ok(!rel.startsWith('..'), `${id}: pack manifests name files inside next/ only: ${rel}`);
      assert.ok(exists(rel), `${id} manifest names a missing file: ${rel}`);
      assert.ok(lists[id].includes(rel), `${id} manifest file is not in pack_files.json: ${rel}`);
      assert.ok(ownedBy(rel, id), `${id} manifest names a file without the ${d.prefix} prefix: ${rel}`);
    }
  }
});

test('pack wire sizes are inside the caps (code, data and art; audio is budgeted separately)', () => {
  const lines = [];
  for (const [id, cap] of Object.entries(ratchet.packCapsMB)) {
    const total = lists[id].reduce((n, f) => n + wire(f), 0);
    lines.push(`${id} ${(total / MB).toFixed(3)} MB of ${cap}`);
    assert.ok(total < cap * MB, `pack ${id} is ${(total / MB).toFixed(2)} MB on the wire, cap ${cap} MB`);
  }
  assert.deepEqual(ratchet.packCapsMB, { x1: 1.0, x2: 0.8 }, 'the pack caps are fixed');
  console.log(`# pack sizes: ${lines.join('; ')}`);
});

test('service worker: pack route into the runtime cache that activation keeps; pattern covers the packs', () => {
  const text = sw.text;
  assert.match(text, /const PACK_PATTERN = "[^"]+";/, 'generated PACK_PATTERN');
  const pattern = new RegExp(JSON.parse(/const PACK_PATTERN = ("[^"]+");/.exec(text)[1]));
  for (const id of Object.keys(PACKS)) {
    for (const f of lists[id]) assert.ok(pattern.test(f), `PACK_PATTERN misses ${f}`);
    assert.ok(pattern.test(`src/data/maps/${PACKS[id].prefix}downs.js`));
    assert.ok(pattern.test(`assets/tiles/${id}.png`) && pattern.test(`assets/tiles/${id}_tiles.json`));
  }
  assert.ok(pattern.test('assets/pack_files.json'));
  for (const e of sw.entries) if (!/^src\/data\/x[12]\/live\.js$/.test(e)) assert.ok(!pattern.test(e), `a precached shell file matches the pack pattern: ${e}`);
  assert.match(text, /kind === 'runtime' \|\| kind === 'pack'/, 'pack files take the stale-while-revalidate route');
  assert.match(text, /const RUNTIME_CACHE = 'lq-next-runtime-v1'/);
  const activate = text.slice(text.indexOf("addEventListener('activate'"), text.indexOf('// ---------------------------------------------------------------- helpers'));
  assert.ok(activate.includes("n.startsWith(SHELL_PREFIX) && n !== SHELL_CACHE"), 'activation only deletes old shell caches, so a shell release never evicts a pack');
  assert.ok(!activate.includes('RUNTIME_CACHE'), 'activation never touches the runtime cache');
});

test('the ratchet file: stage, ceilings and caps are consistent', () => {
  assert.equal(ratchet.capMB, 6.5); assert.equal(ratchet.tapCapMB, 2.5);
  assert.deepEqual(Object.keys(ratchet.stages), ['today', 'after-XP-packs', 'after-X1-integrate', 'after-X2-integrate']);
  assert.deepEqual(Object.values(ratchet.stages).map((s) => s.initialMB), [6.30, 6.33, 6.38, 6.45]);
  assert.ok(ratchet.initialMB === ratchet.stages[ratchet.stage].initialMB, 'the ratchet sits at its stage value');
  assert.ok(ratchet.tapPromptMB <= 2.32);
});
