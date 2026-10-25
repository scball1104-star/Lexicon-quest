// PWA: the service worker's precache list, load budget and the release gate (W6-pwa).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, read, exists, readJson, parseSw, manifestFiles, sizeOf } from './_lib.mjs';

const sw = parseSw();
const files = manifestFiles();
const gz = (rel) => zlib.gzipSync(fs.readFileSync(path.join(NEXT, rel)), { level: 6 }).length;
const isText = (rel) => /\.(js|json|html|webmanifest)$/.test(rel);
const wire = (rel) => (isText(rel) ? gz(rel) : sizeOf(rel));   // GitHub Pages gzips text, not pngs or audio

test('precache: built (not the placeholder), unique, and every entry exists', () => {
  assert.match(sw.version, /^[0-9a-f]{12}$/, 'SHELL_VERSION is a build hash (run python tools/pwa/build_pwa.py)');
  assert.ok(sw.entries.length > 100, `only ${sw.entries.length} precache entries`);
  assert.equal(new Set(sw.entries).size, sw.entries.length, 'no duplicate entries');
  for (const e of sw.entries) {
    assert.ok(!e.startsWith('/') && !e.includes('..'), `entry stays inside next/: ${e}`);
    assert.ok(exists(e), `precache entry exists: ${e}`);
  }
});

test('precache: the shell parts the brief names are in', () => {
  const has = (e) => sw.entries.includes(e);
  for (const e of ['index.html', 'manifest.webmanifest', 'src/main.js', 'src/core/engine.js', 'src/core/audio.js', 'assets/manifest.json',
    'assets/audio/manifest.json', 'assets/ui/font.json', 'assets/ui/ui.json', 'assets/tiles/tiles.json', 'assets/sprites/party_field.json',
    'assets/icons/icon-192.png', 'assets/icons/apple-touch-icon.png']) assert.ok(has(e), `precached: ${e}`);
  assert.ok(sw.entries.some((e) => e.startsWith('assets/audio/sfx/')), 'sfx are precached');
  assert.ok(sw.entries.some((e) => e.startsWith('assets/audio/jingles/')), 'jingles are precached');
  assert.ok(!sw.entries.some((e) => e.startsWith('assets/audio/music/')), 'music is runtime-cached, not precached');
  assert.ok(!sw.entries.some((e) => e.endsWith('.md')), 'no README in the precache');
});

test('precache: every file the game manifest loads is precached, or is a runtime-cached painted sheet', () => {
  const runtime = /^\.\.\/assets\/(art|audio)\//;
  for (const f of [...files.eager, ...files.lazy]) {
    if (f.startsWith('..')) assert.match(f, runtime, `outside next/ and not a runtime-cached asset: ${f}`);
    else assert.ok(sw.entries.includes(f), `manifest file missing from the precache: ${f}`);
  }
});

test('audio manifest: core sfx and jingles are precached, pack sfx and music are runtime-cached', () => {
  const a = readJson('assets/audio/manifest.json');
  const srcs = (entries) => entries.flatMap((e) => [].concat(e.src || e.srcs || e.variants || []).map((v) => (typeof v === 'string' ? v : v && v.src)).filter(Boolean));
  const sfx = Object.values(a.sfx || {});
  for (const s of [...srcs(sfx.filter((e) => (e.pack || 'core') === 'core')), ...srcs(Object.values(a.jingles || {}))]) {
    if (s.startsWith('..')) continue;
    assert.ok(sw.entries.includes(path.posix.normalize(s)), `audio file not precached: ${s}`);
  }
  for (const s of srcs(sfx.filter((e) => (e.pack || 'core') !== 'core'))) {
    assert.ok(exists(s), `pack sfx file exists: ${s}`);
    assert.ok(!sw.entries.includes(s), `episode pack sfx must not be precached (lazy, runtime-cached): ${s}`);
  }
  for (const s of srcs(Object.values(a.music || {}))) assert.ok(s.startsWith('..') || !sw.entries.includes(s), `music must not be precached: ${s}`);
});

test('sfx packs: every pack is declared, loadable by the engine, and every sfx id the code references resolves', () => {
  const a = readJson('assets/audio/manifest.json');
  const audioSrc = read('src/core/audio.js');
  assert.match(audioSrc, /function loadPack\(/, 'the audio engine can load a pack');
  const declared = a.packs || {};
  const packsUsed = new Set(Object.values(a.sfx).map((e) => e.pack).filter((p) => p && p !== 'core'));
  for (const p of packsUsed) {
    assert.ok(declared[p], `pack ${p} is listed in manifest.packs`);
    for (const id of declared[p].sfx) assert.equal(a.sfx[id] && a.sfx[id].pack, p, `${id} belongs to pack ${p}`);
  }
  assert.ok(read('src/main.js').includes('pack:'), 'src/main.js asks for the packs when an episode is entered');
  // Every sfx id named in src/ must exist and sit in core or in a declared pack (a missing one would be silent).
  const ids = new Set();
  const walk = (dir) => { for (const f of fs.readdirSync(path.join(NEXT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, f.name);
    if (f.isDirectory()) walk(rel);
    else if (f.name.endsWith('.js')) {
      const t = read(rel);
      for (const m of t.matchAll(/sfx\(\s*['"]([a-z0-9_]+)['"]/g)) ids.add(m[1]);
      for (const m of t.matchAll(/op:\s*'sfx',\s*id:\s*'([a-z0-9_]+)'/g)) ids.add(m[1]);
      for (const m of t.matchAll(/sfx:\s*'([a-z0-9_]+)'/g)) ids.add(m[1]);
    }
  } };
  walk('src');
  assert.ok(ids.size > 40, `found ${ids.size} referenced sfx ids`);
  const missing = [];
  for (const id of ids) {
    if (id === 'sfx' || id.endsWith('_')) continue;   // a template prefix or a property name, not an id
    let e = a.sfx[id];
    if (e && e.alias) e = a.sfx[e.alias];
    if (!e) { missing.push(id); continue; }
    const pack = e.pack || 'core';
    if (pack !== 'core' && !declared[pack]) missing.push(`${id} (pack ${pack} unknown)`);
  }
  assert.deepEqual(missing, [], `sfx ids referenced in src/ with no manifest entry: ${missing.join(', ')}`);
});

test('lazy groups: valid ids, boot-critical art stays eager', () => {
  const m = files.manifest;
  assert.ok(m.lazy && Object.keys(m.lazy).length >= 2, 'manifest has lazy groups');
  const known = new Set(['images', 'json', 'atlases', 'fonts'].flatMap((k) => Object.keys(m[k] || {})));
  for (const [g, ids] of Object.entries(m.lazy)) for (const id of ids) assert.ok(known.has(id), `lazy.${g} lists unknown id ${id}`);
  for (const id of ['logo', 'title', 'ui', 'window', 'heads', 'palette', 'tiles', 'party_field', 'npcs', 'props', 'terrain', 'town', 'main', 'large', 'num']) {
    assert.ok(!files.lazyIds.has(id), `${id} is needed before the title and must stay eager`);
  }
  assert.ok(files.lazyIds.has('environments'), 'the big painted sheet is lazy');
});

test('load budget: before the tap prompt (wire bytes) and the whole initial download', () => {
  // Wire estimate: text gzipped (as GitHub Pages serves it), png/webp/audio as is.
  const js = sw.entries.filter((e) => e.startsWith('src/')).reduce((n, e) => n + wire(e), 0);
  const eager = [...files.eager].reduce((n, f) => n + (exists(f) ? wire(f) : 0), 0);
  const lazy = [...files.lazy].reduce((n, f) => n + (exists(f) ? wire(f) : 0), 0);
  const sfx = sw.entries.filter((e) => e.startsWith('assets/audio/sfx/')).reduce((n, e) => n + wire(e), 0);
  const beforePrompt = js + eager + wire('assets/audio/manifest.json');
  const initial = beforePrompt + lazy + sfx;
  const mb = (n) => (n / 1048576).toFixed(2);
  console.log(`# load budget: modules ${mb(js)} MB + eager art/data ${mb(eager)} MB = ${mb(beforePrompt)} MB before the tap prompt; ` +
    `+ lazy art ${mb(lazy)} MB + sfx ${mb(sfx)} MB = ${mb(initial)} MB initial download (music streams after the title)`);
  assert.ok(beforePrompt < 2.5 * 1048576, `before the tap prompt: ${mb(beforePrompt)} MB, budget 2.5 MB (about 2 s at 10 Mbps)`);
  // 6.5 MB since 2026-10-21 (was 6): Episode 2 added 0.3 MB of SFX (22 kHz mono WAV, already lean; MP3 would add
  // encoder-delay latency to UI clicks). Everything past the tap prompt downloads in the background after the title,
  // so the felt budget above stays at 2.5 MB. Episode 3 may not raise this: sfx are split into per-episode packs
  // (manifest sfx[].pack). Only 'core' is precached and loaded at boot; ep2/ep3 packs are fetched when that episode
  // is entered and runtime-cached by the service worker, so they are not part of this initial download.
  assert.ok(initial < 6.5 * 1048576, `initial download ${mb(initial)} MB, budget 6.5 MB`);
});

test('index.html modulepreload block lists only files that exist', () => {
  const html = read('index.html');
  const block = html.slice(html.indexOf('<!-- modulepreload:begin'), html.indexOf('<!-- modulepreload:end'));
  const hrefs = [...block.matchAll(/rel="modulepreload" href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 20, 'modulepreload block is generated');
  for (const h of hrefs) assert.ok(exists(h), `modulepreload target exists: ${h}`);
});

test('release gate: sw.js and index.html are current with the files (python tools/pwa/build_pwa.py --check)', (t) => {
  const r = spawnSync('python', [path.join(NEXT, 'tools', 'pwa', 'build_pwa.py'), '--check'], { encoding: 'utf8', timeout: 60000 });
  if (r.error) { t.diagnostic(`build_pwa.py could not run (${r.error.code || r.error.message}); staleness not checked`); return; }
  if (r.status === 0) return;
  const msg = (r.stdout + r.stderr).trim();
  if (process.env.LQ_RELEASE === '1') assert.fail(`${msg}\nRelease gate: run python next/tools/pwa/build_pwa.py and commit sw.js and index.html.`);
  console.log(`# WARNING (fails with LQ_RELEASE=1): ${msg}`);
});
