// Pack assets (src/core/assets.js): a pack atlas (x1_npcs ...) is merged into its base atlas in either arrival order, the pack's
// own manifest loads without touching the main one, and sync-manifest keeps prefixed files out of the main manifest.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAssets, normalizeAtlas, mergeAtlasInto, mergeBaseOf, MERGE_BASES } from '../../src/core/assets.js';
import { scan, syncPack, packOfFile } from './sync-manifest.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'http://localhost/next/';

function withFetch(files, fn) {
  const real = globalThis.fetch;
  const asked = [];
  globalThis.fetch = async (href) => {
    const rel = String(href).replace(BASE, '');
    asked.push(rel);
    if (!(rel in files)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(files[rel])) };
  };
  return Promise.resolve(fn(asked)).finally(() => { globalThis.fetch = real; });
}

test('mergeBaseOf: only <pack>_<base> ids merge', () => {
  assert.equal(mergeBaseOf('x1_npcs'), 'npcs');
  assert.equal(mergeBaseOf('x2_enemies_field'), 'enemies_field');
  assert.equal(mergeBaseOf('x1_enemies_battle'), 'enemies_battle');
  assert.equal(mergeBaseOf('x2_bosses_battle'), 'bosses_battle');
  assert.equal(mergeBaseOf('x1_portraits'), 'portraits');
  assert.equal(mergeBaseOf('x1_heads'), 'heads');
  for (const id of ['npcs', 'party_field', 'battle_valley', 'x1_misc', 'x1_backdrop_downs', 'heads', '_npcs']) assert.equal(mergeBaseOf(id), null, id);
  assert.deepEqual(MERGE_BASES, ['npcs', 'enemies_battle', 'enemies_field', 'bosses_battle', 'portraits', 'heads']);
});

test('mergeAtlasInto: frames and meta merge in place, the base wins a clash, offsets follow the stacked image', () => {
  const base = normalizeAtlas({ frames: { a_down_0: [0, 0, 24, 32], clash: [24, 0, 8, 8] }, anims: { a: { frames: ['a_down_0'] } }, sprites: { a: { size: [24, 32] } } }, { naturalHeight: 64, naturalWidth: 96 }, 'npcs');
  const extra = normalizeAtlas({ frames: { b_down_0: [0, 0, 24, 32, 3, 31], clash: [30, 0, 8, 8] }, anims: { b: { frames: ['b_down_0'] }, a: { frames: ['WRONG'] } }, sprites: { b: { size: [24, 32] }, a: { size: [1, 1] } }, origins: { b_down_0: [9, 9] } }, { naturalHeight: 40, naturalWidth: 128 }, 'x1_npcs');
  const held = base.frames;
  let composed = null;
  const r = mergeAtlasInto(base, extra, (a, b, yoff) => { composed = { a, b, yoff }; return 'CANVAS'; });
  assert.deepEqual(r, { merged: 1, skipped: 1 });
  assert.equal(composed.yoff, 64);
  assert.equal(base.image, 'CANVAS');
  assert.equal(base.frames, held, 'the same frames object (holders see it)');
  assert.deepEqual([base.frames.b_down_0.x, base.frames.b_down_0.y, base.frames.b_down_0.ox, base.frames.b_down_0.oy], [0, 64, 3, 31]);
  assert.equal(base.frames.clash.x, 24, 'the base frame wins');
  assert.deepEqual(base.anims.a.frames, ['a_down_0']); assert.ok(base.anims.b);
  assert.deepEqual(base.meta.sprites.a.size, [24, 32]); assert.deepEqual(base.meta.sprites.b.size, [24, 32]);
  assert.equal(mergeAtlasInto(base, extra, () => 'AGAIN').already, true, 'idempotent');
  assert.equal(base.image, 'CANVAS');
  // no DOM: the merge is refused and the base untouched
  const b2 = normalizeAtlas({ frames: { a: [0, 0, 8, 8] } }, { naturalHeight: 8 }, 'npcs');
  const e2 = normalizeAtlas({ frames: { z: [0, 0, 8, 8] } }, { naturalHeight: 8 }, 'x1_npcs');
  assert.equal(mergeAtlasInto(b2, e2, () => null).failed, true);
  assert.equal(b2.frames.z, undefined);
  // pure data (Node tests, no images): frames merge with no offset
  const b3 = normalizeAtlas({ frames: { a: [0, 0, 8, 8] } }, null, 'npcs');
  const e3 = normalizeAtlas({ frames: { z: [0, 5, 8, 8] } }, null, 'x1_npcs');
  mergeAtlasInto(b3, e3);
  assert.equal(b3.frames.z.y, 5);
});

test('createAssets: a pack atlas merges into its base whichever arrives first; unknown frames fall back without an error', async () => {
  const files = {
    'assets/npcs.json': { frames: { npc_elder_down_0: [0, 0, 24, 32] } },
    'assets/x1_npcs.json': { frames: { npc_brindle_down_0: [0, 0, 24, 32] } },
    'assets/x1_manifest.json': { images: {}, atlases: { x1_npcs: 'assets/x1_npcs.json' }, json: { x1_tiles: 'assets/x1_tiles.json' }, fonts: {} },
    'assets/x1_tiles.json': { terrains: { peat: {} } },
  };
  await withFetch(files, async (asked) => {
    // base first, then the pack
    const a = createAssets({ base: BASE, log: () => {} });
    await a.load({ atlases: { npcs: 'assets/npcs.json' } });
    const held = a.atlas('npcs');
    const r = await a.loadPackManifest('assets/x1_manifest.json');
    assert.deepEqual(r.failed, []);
    assert.equal(a.atlas('npcs'), held, 'same atlas object');
    assert.ok(held.frames.npc_brindle_down_0, 'the pack NPC is found where every caller looks');
    assert.ok(held.has('npc_elder_down_0'));
    assert.ok(a.atlas('x1_npcs').frames.npc_brindle_down_0, 'and it is still its own atlas too');
    assert.deepEqual(a.json('x1_tiles').terrains, { peat: {} });
    assert.equal(a.manifest, null, 'the main manifest state is untouched');
    assert.ok(asked.includes('assets/x1_manifest.json'));

    // pack first (the base is a lazy group that arrives later), then the base
    const b = createAssets({ base: BASE, log: () => {} });
    await b.loadPackManifest('assets/x1_manifest.json');
    assert.equal(b.has('npcs'), false);
    await b.load({ atlases: { npcs: 'assets/npcs.json' } });
    assert.ok(b.atlas('npcs').frames.npc_brindle_down_0 && b.atlas('npcs').frames.npc_elder_down_0, 'merged when the base arrived');

    // a forced reload of the base (retryMissing) rebuilds the merge
    await b.load({ atlases: { npcs: 'assets/npcs.json' } }, null, { force: true });
    assert.ok(b.atlas('npcs').frames.npc_brindle_down_0, 'merge survives a reload of the base');

    // an id nobody has: placeholder frame, no throw
    const ph = b.atlas('npcs').frame('npc_nobody_down_0');
    assert.equal(ph, null);
  });
});

test('loadPackManifest: partial failure is reported, a retry loads only what failed; a missing fragment rejects', async () => {
  const files = { 'assets/x1_manifest.json': { atlases: { x1_npcs: 'assets/x1_npcs.json' }, json: { x1_tiles: 'assets/x1_tiles.json' } }, 'assets/x1_tiles.json': { terrains: {} } };
  await withFetch(files, async (asked) => {
    const a = createAssets({ base: BASE, log: () => {} });
    const r1 = await a.loadPackManifest('assets/x1_manifest.json');
    assert.deepEqual(r1.failed, ['atlas:x1_npcs']);
    files['assets/x1_npcs.json'] = { frames: { n: [0, 0, 8, 8] } };
    asked.length = 0;
    const r2 = await a.loadPackManifest('assets/x1_manifest.json');
    assert.deepEqual(r2.failed, []);
    assert.ok(!asked.includes('assets/x1_tiles.json'), 'the entry that already loaded is not fetched again');
    await assert.rejects(() => a.loadPackManifest('assets/nope_manifest.json'));
  });
});

test('sync-manifest: prefixed files never enter the main manifest and go to their own fragment', () => {
  assert.equal(packOfFile('assets/tiles/x1_tiles.json'), 'x1');
  assert.equal(packOfFile('assets/tiles/x2.png'), 'x2');
  assert.equal(packOfFile('assets/sprites/x1_npcs.png'), 'x1');
  assert.equal(packOfFile('assets/tiles/tiles.json'), null);
  assert.equal(packOfFile('assets/sprites/npcs.json'), null);
  const main = scan();
  for (const kind of Object.keys(main)) for (const [id, p] of Object.entries(main[kind])) {
    assert.ok(!/(^|\/)x[12](_|\.)/.test(p), `main manifest lists a pack file: ${kind}.${id} = ${p}`);
  }
  for (const id of ['x1', 'x2']) {
    const frag = scan(id);
    for (const kind of Object.keys(frag)) for (const p of Object.values(frag[kind])) assert.equal(packOfFile(p), id, p);
    const r = syncPack(id, { write: false });
    assert.deepEqual(r.changes, [], `assets/${id}_manifest.json is current (node qa/core/sync-manifest.mjs --pack ${id})`);
  }
  assert.ok(fs.existsSync(path.join(NEXT, 'assets', 'x1_manifest.json')));
});
