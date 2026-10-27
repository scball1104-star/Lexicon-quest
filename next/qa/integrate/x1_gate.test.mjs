// X1-integrate: the switch, the budget stage and the seams the earlier waves left (docs/briefs/X1-integrate.md, plan 15).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(NEXT, p), 'utf8');
const rj = (p) => JSON.parse(rd(p));

test('the switch is on: every region on, the maps listed, the budget at the X1-integrate stage', async () => {
  const live = await import(pathToFileURL(path.join(NEXT, 'src/data/x1/live.js')).href);
  assert.equal(live.X1_LIVE, true, 'X1_LIVE');
  for (const r of ['west', 'south', 'north', 'wild']) assert.equal(live.X1_REGIONS[r], true, `region ${r}`);
  const enc = await import(pathToFileURL(path.join(NEXT, 'src/data/x1/encounters.js')).href);
  assert.equal(enc.X1_MAPS_LISTED, true, 'X1_MAPS_LISTED');
  const r = rj('qa/pwa/budget_ratchet.json');
  assert.equal(r.stage, 'after-X1-integrate');
  assert.equal(r.initialMB, 6.38, 'the ratchet is exactly the stage value');
  assert.equal(r.capMB, 6.5);
  assert.equal(r.tapPromptMB, 2.34);   // moved 2.32 -> 2.34 for H2 (tapPromptHistory)
  assert.equal(r.tapCapMB, 2.5);
});

test('seam 1: the two gate sprite pairs are in events.js and mapcheck, and their art exists', () => {
  const ev = rd('src/world/events.js'), mc = rd('tools/maps/mapcheck.mjs');
  const tiles = rj('assets/tiles/x1_tiles.json').objects;
  for (const k of ['x1_gate_culvert', 'x1_gate_barrow']) {
    assert.match(ev, new RegExp(`${k}: \\['${k}_closed', '${k}_open'\\]`), `GATE_SPRITES ${k}`);
    assert.ok(mc.includes(`'${k}'`), `mapcheck GATE_SPRITE_IDS ${k}`);
    assert.ok(tiles[`${k}_closed`] && tiles[`${k}_open`], `art ${k}`);
  }
});

test('seam 2: the three heavy-block skins resolve to art, and the field draws a named skin', () => {
  const tiles = rj('assets/tiles/x1_tiles.json').objects;
  for (const k of ['x1_millstone', 'x1_cider_barrel', 'x1_driftlog']) assert.ok(tiles[k], k);
  assert.match(rd('src/world/events.js'), /const skin = heavy && ev\.sprite && ev\.sprite !== 'push_block'/);
});

test('seam 3: every x1 zone names a battle backdrop that battle.js knows, and its art is in the pack manifest', async () => {
  const src = rd('src/scenes/battle.js');
  const enc = await import(pathToFileURL(path.join(NEXT, 'src/data/x1/encounters.js')).href);
  const man = rj('assets/x1_manifest.json');
  const known = new Set([...src.matchAll(/^  ([a-z_0-9]+): \{ asset: '([a-z_0-9]+)'/gm)].map((m) => m[1]));
  const assets = Object.fromEntries([...src.matchAll(/^  ([a-z_0-9]+): \{ asset: '([a-z_0-9]+)'/gm)].map((m) => [m[1], m[2]]));
  for (const z of Object.values(enc.X1_ZONES)) {
    assert.ok(known.has(z.backdrop), `${z.id}: backdrop ${z.backdrop} is a BACKDROPS key`);
    if (z.backdrop.startsWith('x1_')) assert.ok(man.atlases[assets[z.backdrop]], `${z.id}: ${assets[z.backdrop]} is an atlas of the x1 pack`);
  }
  for (const [zone, art] of Object.entries(enc.X1_BACKDROP_ART)) assert.ok(rj(`assets/backdrops/x1_${art}.json`) && man.atlases[`x1_${art}`], `${zone}: ${art}`);
});

test('seam 4: the eight tracks and two ambiences are in the audio manifest with files, and the maps and bosses name them', async () => {
  const a = rj('assets/audio/manifest.json');
  const tracks = ['the_downs', 'high_moor', 'wethers_barrow', 'orrery', 'larchhill', 'millrace', 'boss_reeve', 'boss_millstone'];
  for (const t of tracks) {
    assert.ok(a.music[t] && a.music[t].src, `music ${t}`);
    assert.ok(fs.existsSync(path.join(NEXT, a.music[t].src)), `file of ${t}`);
  }
  for (const m of ['moor_wind', 'larchhill_hum']) assert.ok(a.ambience[m] && fs.existsSync(path.join(NEXT, a.ambience[m].src)), `ambience ${m}`);
  const maps = fs.readdirSync(path.join(NEXT, 'src/data/maps')).filter((f) => f.startsWith('x1_'));
  const used = new Set();
  for (const f of maps) { const t = rd(`src/data/maps/${f}`); for (const m of t.matchAll(/music: '([a-z_]+)'/g)) used.add(m[1]); for (const m of t.matchAll(/ambience: '([a-z_]+)'/g)) used.add(m[1]); }
  const encSrc = rd('src/data/x1/encounters.js');
  for (const m of encSrc.matchAll(/music: '([a-z_]+)'/g)) used.add(m[1]);
  for (const t of ['the_downs', 'high_moor', 'wethers_barrow', 'orrery', 'larchhill', 'millrace', 'boss_reeve', 'boss_millstone', 'moor_wind', 'larchhill_hum']) assert.ok(used.has(t), `${t} is wired to a map or a boss`);
});

test('seam 5 and 6: a turning wheel cycles turnAnim; the sheep is a 16 x 16 animal', () => {
  assert.match(rd('src/world/tilemap.js'), /const turning = !!m\.turnAnim && p\.state > 0/);
  assert.match(rd('src/world/actors.js'), /animal_sheep: 'sheep'/);
  const w = rj('assets/tiles/x1_tiles.json').objects.x1_mill_wheel;
  assert.deepEqual(w.turnAnim.frames, [1, 2, 3, 4]);
  assert.equal(w.frames.length, 5);
});

test('seams 8 and 9: the Barrow plate has its glow, the star plate keeps Mira quiet, the slabs have their sound', () => {
  assert.match(rd('src/data/maps/x1_barrow.js'), /light\('plate_glow', 25, 6/);
  assert.match(rd('src/data/maps/x1_orrery.js'), /appraiseBark: false/);
  assert.match(rd('src/data/maps/x1_barrow.js'), /sfx: 'slab_slide'/);
  const a = rj('assets/audio/manifest.json');
  assert.ok(a.sfx.slab_slide && a.sfx.slab_slide.pack === 'x1');
});

test('the Barrow gate stays open once opened (the hearth saves behind it and blocks reset on a reload)', () => {
  assert.match(rd('src/data/maps/x1_barrow.js'), /gate\('gate_reeve', 17, 4, GATE_SPRITE, \{ flag: 'x1_gate_reeve_open' \}\)/);
});

test('no em dash anywhere in next/ source or docs the integrate agent wrote', () => {
  for (const p of ['qa/integrate/autoplay_x1.py', 'qa/integrate/x1_shots.py', 'qa/integrate/story_time_x1.py', 'qa/integrate/x1_mksave.mjs', 'qa/saves/x1_compat.test.mjs', 'qa/saves/x1_saves.py', 'qa/autoplay.py']) {
    assert.ok(!rd(p).includes(String.fromCharCode(0x2014)), `${p} has an em dash`);
  }
});
