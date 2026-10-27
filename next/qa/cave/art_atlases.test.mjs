// C2-sprites-boss: the cave pack atlases. cave_props (the red and blue chests, the plaque, the trapdoor), cave_bosses_battle
// (the Binder's three looks with every frame the boss scene asks for) and cave_enemies_field (the Binder's map avatar) exist,
// are listed by the pack manifest (qa/core/sync-manifest.mjs --pack cave), pack their frames the X1 way (origin = bottom-centre
// exactly, since the loader's merge copies frames but not an origin table), and resolve through the real code paths: the
// battle Actor after mergeAtlasInto() into bosses_battle, the field's resolveSprite after the merge into enemies_field.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAtlas, mergeAtlasInto, mergeBaseOf } from '../../src/core/assets.js';
import { Actor, DIE_STEP, BREATHE } from '../../src/battle/scene/actors.js';
import { resolveSprite } from '../../src/world/actors.js';
import { PACKS } from '../../src/game/packs.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const png = (p) => {
  const b = fs.readFileSync(path.join(NEXT, p));
  assert.equal(b.toString('ascii', 1, 4), 'PNG', `${p} is a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const SPR = 'assets/sprites';
const LOOKS = ['binder', 'binder_loose', 'binder_binding'];
const STATES = ['idle_1', 'attack', 'hurt', 'cast', 'devour', 'die_0', 'die_1', 'die_2'];

test('the three atlases exist, their images are PNGs, and the pack manifest lists them (run sync-manifest --pack cave)', () => {
  for (const id of ['cave_props', 'cave_bosses_battle', 'cave_enemies_field']) {
    const j = read(`${SPR}/${id}.json`);
    assert.equal(j.image, `${id}.png`);
    png(`${SPR}/${id}.png`);
  }
  const man = read('assets/cave_manifest.json');
  for (const id of ['cave_props', 'cave_bosses_battle', 'cave_enemies_field']) assert.equal(man.atlases[id], `${SPR}/${id}.json`, `${id} in assets/cave_manifest.json`);
  assert.equal(PACKS.cave.prefix, 'cave_');
  assert.equal(PACKS.cave.assets, 'assets/cave_manifest.json');
  // which bases the loader merges them into: the two battle / field atlases merge; props is not a merge base (the integrator reads it)
  assert.equal(mergeBaseOf('cave_bosses_battle'), 'bosses_battle');
  assert.equal(mergeBaseOf('cave_enemies_field'), 'enemies_field');
  assert.equal(mergeBaseOf('cave_props'), null);
});

test('cave_props: chest_red and chest_blue (closed, open), plaque (plain, glint), trapdoor (closed, open), 16x16, props.json shape', () => {
  const j = read(`${SPR}/cave_props.json`);
  const im = png(`${SPR}/cave_props.png`);
  assert.equal(j.tile, 16);
  const want = { chest_red: ['chest_red_closed', 'chest_red_open'], chest_blue: ['chest_blue_closed', 'chest_blue_open'],
    plaque: ['plaque_0', 'plaque_1'], trapdoor: ['trapdoor_closed', 'trapdoor_open'] };
  assert.deepEqual(Object.keys(j.objects).sort(), Object.keys(want).sort());
  for (const [id, names] of Object.entries(want)) {
    const o = j.objects[id];
    assert.deepEqual(o.frameNames, names, id);
    assert.deepEqual(o.footprint, [1, 1]);
    assert.equal(typeof o.solid, 'boolean');
    assert.deepEqual(o.frame, o.frames[0]);
    for (const [x, y, w, h] of o.frames) {
      assert.equal(w, 16); assert.equal(h, 16);
      assert.ok(x >= 0 && y >= 0 && x + w <= im.w && y + h <= im.h, `${id} frame inside the image`);
    }
    assert.ok(o.anchor[0] === 8 && o.anchor[1] >= 14 && o.anchor[1] <= 15, `${id} anchor at the footprint's bottom-centre`);
  }
  assert.equal(j.objects.chest_red.solid, true); assert.equal(j.objects.chest_blue.solid, true);
  assert.equal(j.objects.plaque.solid, false); assert.equal(j.objects.trapdoor.solid, false);
});

test('cave_bosses_battle: every look has the base and the eight derived frames, anims idle and die, origin = bottom-centre exactly, 1x boss scale', () => {
  const j = read(`${SPR}/cave_bosses_battle.json`);
  const im = png(`${SPR}/cave_bosses_battle.png`);
  assert.equal(j.facing, 'right');
  for (const id of LOOKS) {
    assert.ok(j.frames[id], `${id} base frame`);
    for (const s of STATES) assert.ok(j.frames[`${id}_${s}`], `${id}_${s}`);
    assert.deepEqual(j.anims[`${id}_idle`].frames, [id, `${id}_idle_1`]);
    assert.deepEqual(j.anims[`${id}_die`].frames, [`${id}_die_0`, `${id}_die_1`, `${id}_die_2`]);
    assert.equal(j.anims[`${id}_die`].loop, false);
    const [, , w, h] = j.frames[id];
    assert.ok(w >= 120 && w <= 176 && h >= 110 && h <= 160, `${id} is boss-sized (${w}x${h})`);
  }
  assert.equal(Object.keys(j.frames).length, LOOKS.length * (1 + STATES.length));
  for (const [n, [x, y, w, h]] of Object.entries(j.frames)) {
    assert.ok(x >= 0 && y >= 0 && x + w <= im.w && y + h <= im.h, `${n} inside the image`);
    assert.deepEqual(j.origin[n], [Math.floor(w / 2), h - 1], `${n}: origin is the loader's default (bottom-centre)`);
  }
  // the looks are reshaped, not only recoloured: Loose Leaves lifts and spreads the wings (a taller trimmed frame than the
  // bound look); the Archivore's base is 148x139, the Binder's trims to its own box (the pixel proof is the preview sheet
  // tools/art/sprites/out/cave/binder_looks_4x.png)
  assert.ok(j.frames.binder_loose[3] > j.frames.binder[3], `loose ${j.frames.binder_loose[3]} taller than bound ${j.frames.binder[3]}`);
  const arch = read(`${SPR}/bosses_battle.json`).frames.archivore;
  assert.notDeepEqual(j.frames.binder.slice(2), arch.slice(2));
});

test('the battle Actor resolves the Binder through the real merge: base, states, the phase swap to the other looks, the die steps', () => {
  const load = (id) => normalizeAtlas(read(`${SPR}/${id}.json`), null, id);
  const atlases = { enemies_battle: load('enemies_battle'), bosses_battle: load('bosses_battle'), party_battle: load('party_battle') };
  const r = mergeAtlasInto(atlases.bosses_battle, load('cave_bosses_battle'), () => null);
  assert.equal(r.merged, LOOKS.length * (1 + STATES.length)); assert.equal(r.skipped, 0, 'no frame name clashes with the base boss sheet');
  const eng = { frame: 0, assets: { has: (id) => !!atlases[id], atlas: (id) => atlases[id] } };
  const a = new Actor(eng, { uid: 'e0', side: 'enemy', id: 'binder', name: 'The Binder', hp: 6500, maxHp: 6500, mp: 99, maxMp: 99, boss: true }, { x: 98, y: 146 });
  assert.equal(a.atlasId, 'bosses_battle'); assert.equal(a.stem, 'binder');
  a.bobPhase = 0; eng.frame = 0; assert.equal(a.enemyFrame().name, 'binder');
  eng.frame = BREATHE; assert.equal(a.enemyFrame().name, 'binder_idle_1');
  a.setPose('attack'); assert.equal(a.enemyFrame().name, 'binder_attack');
  a.setPose('cast'); assert.equal(a.enemyFrame().name, 'binder_cast');
  a.setPose('devour'); assert.equal(a.enemyFrame().name, 'binder_devour');
  a.setPose('hurt'); assert.equal(a.enemyFrame().name, 'binder_hurt');
  // phase 2 and 3 (ai.js emits `sprite` on the phase; the scene calls swapSprite): the looks swap, the states follow
  a.swapSprite('binder_loose'); a.hurtT = 0; a.setPose('idle'); eng.frame = 0;
  assert.equal(a.stem, 'binder_loose'); assert.equal(a.enemyFrame().name, 'binder_loose');
  a.setPose('devour'); assert.equal(a.enemyFrame().name, 'binder_loose_devour');
  a.swapSprite('binder_binding'); a.setPose('attack'); assert.equal(a.enemyFrame().name, 'binder_binding_attack');
  a.setPose('die'); assert.equal(a.enemyFrame().name, 'binder_binding_die_0');
  for (let i = 0; i < DIE_STEP; i++) { eng.frame++; a.update(); }
  assert.equal(a.enemyFrame().name, 'binder_binding_die_1');
  for (let i = 0; i < DIE_STEP * 3; i++) { eng.frame++; a.update(); }
  assert.equal(a.enemyFrame().name, 'binder_binding_die_2');
  // the frame sizes the scene draws
  assert.ok(a.w >= 100 && a.h >= 100, `drawn at 1x (${a.w}x${a.h})`);
});

test('cave_enemies_field: binder_avatar frames, its sprites entry, the idle anim; the field resolves it after the merge', () => {
  const j = read(`${SPR}/cave_enemies_field.json`);
  const im = png(`${SPR}/cave_enemies_field.png`);
  for (const i of [0, 1, 2]) {
    const [x, y, w, h] = j.frames[`binder_avatar_${i}`];
    assert.ok(x >= 0 && y >= 0 && x + w <= im.w && y + h <= im.h);
  }
  const s = j.sprites.binder_avatar;
  assert.deepEqual(s.size, [55, 52]); assert.deepEqual(s.origin, [27, 51]); assert.equal(s.hover, 5);
  assert.deepEqual(j.anims.binder_avatar_idle.frames, ['binder_avatar_0', 'binder_avatar_2', 'binder_avatar_1', 'binder_avatar_2']);
  const base = normalizeAtlas(read(`${SPR}/enemies_field.json`), null, 'enemies_field');
  const r = mergeAtlasInto(base, normalizeAtlas(j, null, 'cave_enemies_field'), () => null);
  assert.equal(r.merged, 3); assert.equal(r.skipped, 0);
  assert.ok(base.meta.sprites.binder_avatar, 'the sprites table merges into the base meta');
  const assets = { has: (id) => id === 'enemies_field', atlas: () => base };
  const got = resolveSprite(assets, 'binder_avatar');
  assert.equal(got.atlas, 'enemies_field'); assert.equal(got.kind, 'enemy'); assert.equal(got.w, 55); assert.equal(got.h, 52); assert.equal(got.shadow, 'huge');
  assert.ok(!got.missing);
});

test('no em dashes in anything C2-sprites-boss wrote', () => {
  const EM = String.fromCharCode(0x2014);
  const files = ['src/data/cave/bands345.js', 'src/data/cave/prefabs_b3.js', 'src/data/cave/prefabs_b4.js', 'src/data/cave/prefabs_b5.js',
    'src/data/cave/maps/cave_b100.js', 'src/data/cave/maps/cave_landing0.js', 'qa/cave/art_atlases.test.mjs', 'qa/cave/art_maps.test.mjs',
    'qa/cave/art_bands.test.mjs', 'tools/art/sprites/cave_props.py', 'tools/art/sprites/cave_binder.py', 'tools/art/sprites/cave_stage.py',
    'tools/art/sprites/cave_dump.mjs', 'tools/art/sprites/cave_map_preview.py', `${SPR}/cave_props.json`, `${SPR}/cave_bosses_battle.json`,
    `${SPR}/cave_enemies_field.json`];
  for (const f of files) {
    const p = path.join(NEXT, f);
    if (!fs.existsSync(p)) continue;
    assert.ok(!fs.readFileSync(p, 'utf8').includes(EM), `${f} contains an em dash`);
  }
});
