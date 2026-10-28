// Painted stages (docs/MEDIA_BUILD.md 1): the Runway paintings Scott approved on 2026-10-27 sit beside the composed stages
// as `assets/backdrops/paint_battle_<key>.png`, load lazily (never in the precache) and win over the composed stage once
// they are in; until then the composed stage is the placeholder. This pins the files, the sidecars, the lazy rule and
// the battle scene's preference.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(NEXT, p), 'utf8');
const PAINTED = ['valley', 'hollow', 'east_road'];

test('every painted stage has its png and sidecar, at the game size, under 80 colours, beside its composed placeholder', () => {
  for (const k of PAINTED) {
    const png = path.join(NEXT, 'assets', 'backdrops', `paint_battle_${k}.png`);
    assert.ok(fs.existsSync(png), `paint_battle_${k}.png`);
    assert.ok(fs.existsSync(path.join(NEXT, 'assets', 'backdrops', `battle_${k}.png`)), `the composed placeholder battle_${k}.png stays`);
    const meta = JSON.parse(rd(`assets/backdrops/paint_battle_${k}.json`));
    assert.equal(meta.w, 384); assert.equal(meta.h, 216);
    assert.equal(meta.source, 'runway');
    assert.ok(meta.colors <= 80, `${k}: ${meta.colors} colours`);
    assert.ok(Number.isFinite(meta.bandY) && Number.isFinite(meta.bandAlpha), `${k}: band values`);
    // PNG header: width and height at bytes 16..24
    const b = fs.readFileSync(png);
    assert.equal(b.readUInt32BE(16), 384); assert.equal(b.readUInt32BE(20), 216);
    assert.ok(b.length < 170 * 1024, `${k}: ${b.length} bytes (a painted stage stays under 170 KB)`);
  }
});

test('the battle scene prefers the painting once loaded and keeps the composed stage as the placeholder', () => {
  const src = rd('src/scenes/battle.js');
  for (const k of PAINTED) assert.match(src, new RegExp(`${k}: 'paint_battle_${k}'`), `PAINTED.${k}`);
  assert.match(src, /for \(const id of \[\.\.\.BACKDROP_ASSETS, \.\.\.PAINTED_ASSETS\]\)/, 'the paintings are path-loaded with the composed stages');
  assert.match(src, /const painted = paintedArt\(assets, key\);\s*\n\s*const art = painted \|\| backdropArt\(assets, rec\.asset\);/, 'the painting wins when present');
  assert.match(src, /\|\| paintedReady\(e, this\.backdropLayer\)\)/, 'a composed layer is rebuilt when the painting arrives');
});

test('painted stages are lazy: out of the precache shell list and inside the runtime pattern', () => {
  const py = rd('tools/pwa/build_pwa.py');
  assert.match(py, /LAZY_PREFIXES = \('assets\/backdrops\/paint_',\)/);
  assert.match(py, /and not is_lazy\(p\.relative_to\(NEXT\)\.as_posix\(\)\)/, 'shell_files skips them');
  assert.match(py, /alts \+= \[re\.escape\(pre\) for pre in LAZY_PREFIXES\]/, 'PACK_PATTERN caches them at runtime');
  const sw = rd('sw.js');
  for (const k of PAINTED) assert.ok(!sw.includes(`assets/backdrops/paint_battle_${k}.png`), `${k} is not precached`);
});
