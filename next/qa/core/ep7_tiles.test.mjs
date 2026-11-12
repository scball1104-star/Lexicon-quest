// E7-tiles: the ep7 tile fragment (assets/tiles/ep7_tiles.json + ep7.png) merges into the live tile database with no clash
// against tiles.json and EVERY other ep*_tiles.json / x1 fragment (Episode 6's mooring_post collided with Episode 4's); every
// id EPISODE7_PLAN 9.1 asks for exists with its collision code and frame count (the frame rules E7-world draws by); the fade
// is the lowest terrain and void; every rect sits inside the sheet; the Kestrel stays Episode 6's prop; the backdrops carry
// their band, their BACKDROPS key (the ids src/data/ep7/encounters.js names), the frozen and thaw grades (thaw at least 0.10
// over frozen, measured, a tone and never a screen) and the aurora's limits (plan 5.2: at most +0.05 luma a step); and none of
// it reaches the main manifest (the first download).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeTileFragment } from '../../src/game/packs.js';
import { packOfFile } from './sync-manifest.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const frag = read('assets/tiles/ep7_tiles.json');
const OTHERS = fs.readdirSync(path.join(NEXT, 'assets/tiles')).filter((f) => /_tiles\.json$/.test(f) && f !== 'ep7_tiles.json')
  .map((f) => `assets/tiles/${f}`);

function pngSize(p) {
  const b = fs.readFileSync(path.join(NEXT, p));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

test('ep7 fragment merges into tiles.json (+ every other fragment) with no clash; the fade lowest, the floors below the holes', () => {
  assert.ok(OTHERS.includes('assets/tiles/ep6_tiles.json') && OTHERS.includes('assets/tiles/ep4_tiles.json'), OTHERS.join());
  const db = read('assets/tiles/tiles.json');
  for (const f of ['assets/tiles/x1_tiles.json', 'assets/tiles/ep4_tiles.json', 'assets/tiles/ep5_tiles.json', 'assets/tiles/ep6_tiles.json']) {
    assert.deepEqual(mergeTileFragment(db, read(f)).clashes, [], f);
  }
  const r = mergeTileFragment(db, frag);
  assert.deepEqual(r.clashes, []);
  assert.ok(r.added > 50);
  const o = db.terrainOrder;
  assert.ok(o.indexOf('fade') >= 0 && o.indexOf('fade') < o.indexOf('archive_floor'), 'fade below every core terrain');
  const floors = ['permafrost', 'snowfield', 'icebrick', 'frostmosaic', 'frostbrick', 'letter_stone', 'nave_ice', 'iceglass', 'icebridge', 'icepath'];
  for (const t of floors) assert.ok(o.indexOf(t) > o.indexOf('fade') && o.indexOf(t) < o.indexOf('pit'), t);
  assert.ok(o.indexOf('icepath') > o.indexOf('snowfield'), 'a held path draws its own lip over snow');
  for (const t of ['frozen_lake', 'lake_water']) assert.ok(o.indexOf(t) > o.indexOf('pit'), `${t} last`);
  assert.ok(o.indexOf('lake_water') > o.indexOf('frozen_lake'), 'the open lead draws its ice shelf over the lake');
});

test('every ep7 id is unique against tiles.json and every other fragment (a legend id names one thing)', () => {
  const others = {};
  for (const f of ['assets/tiles/tiles.json', ...OTHERS]) {
    const d = read(f);
    for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) for (const id of Object.keys(d[k] || {})) others[id] = `${f} ${k}`;
  }
  for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const id of Object.keys(frag[k])) assert.ok(!others[id], `${k}.${id} also in ${others[id]}`);
  // the plan's traps: waystone (ep5), kestrel and signal_lamp (ep6), hearth (core) are taken; the Kestrel is reused
  for (const id of ['waystone', 'kestrel', 'signal_lamp', 'hearth', 'mooring_post']) assert.ok(!frag.objects[id] && !frag.tiles[id], id);
  assert.ok(read('assets/tiles/ep6_tiles.json').objects.kestrel, 'the Kestrel is Episode 6\'s prop');
});

test('the plan ids exist with their collision codes and frames', () => {
  const T = frag.terrains, Wl = frag.walls, Ti = frag.tiles, O = frag.objects;
  assert.equal(T.fade.collision, 'void');
  assert.equal(T.fade.autotile, 'A1');
  assert.deepEqual(T.fade.anim.frames, [0, 1], 'two frames of a slow grain');
  assert.ok(T.fade.anim.ms >= 1000, 'slow');
  for (const t of ['icepath', 'snowfield', 'frostbrick', 'iceglass', 'icebridge', 'letter_stone', 'nave_ice', 'permafrost', 'icebrick',
    'frostmosaic', 'frozen_lake']) {
    assert.equal(T[t].collision, 'none', t);
    assert.equal(T[t].autotile, 'A2', t);
  }
  assert.equal(T.lake_water.collision, 'water');
  for (const w of ['icewall', 'vault_wall', 'bell_hall', 'nave']) {
    assert.equal(Wl[w].collision, 'solid', w);
    assert.equal(Wl[w + '_out'].collision, 'solid', w);
    assert.ok(Wl[w].faceStyles.length >= 3, w);
  }
  assert.ok(Wl.vault_wall.faceStyleByMap.ep7_vault_f1 && Wl.bell_hall.faceStyleByMap.ep7_vault_f2 && Wl.nave.faceStyleByMap.ep7_vault_f3);
  // the name-stone kit, in E7-world's frame rules: 0 dim, 1 lit, 2 and 3 the oldest held's flicker
  for (const id of ['namestone', 'name_plate']) {
    assert.deepEqual(O[id].rect.slice(2), [16, 32], id);
    assert.equal(O[id].frames.length, 4, id);
    assert.equal(O[id].collision, 'solid', id);
    assert.deepEqual(O[id].flicker, { frames: [2, 3], ms: 500 }, id);
    assert.ok(O[id].light && O[id].light.frames.join() === '1,2,3', `${id} light only while held`);
  }
  assert.equal(O.frost_door.frames.length, 4);
  assert.equal(O.frost_door.collision, 'none', 'the frost grid decides');
  assert.equal(O.ghost_trail.frames.length, 2);
  assert.equal(O.ghost_trail.recipe.color, '#c3cad6');
  const frames = { listening_bell: 4, stillheart: 6, round_door: 2, page_block: 2, crate_dash_ice: 2, winterwatch_cache: 2,
    returning_hearth: 4, iced_door: 2, vanishing_mark: 2, courier_stove: 3 };
  for (const [id, n] of Object.entries(frames)) assert.equal(O[id].frames.length, n, id);
  for (const id of ['star_stair', 'font_thaw', 'crystal', 'frostfire']) assert.ok(O[id].anim && O[id].anim.frameDx, id);
  assert.deepEqual(O.stillheart.rect.slice(2), [48, 64], 'the heart is 3 x 4');
  assert.deepEqual(O.stillheart.frozenFrames, [0, 1, 2]);
  assert.deepEqual(O.stillheart.thawFrames, [3, 4, 5]);
  assert.deepEqual(O.traveler_wall.rect.slice(2), [96, 48], 'the wall is 6 x 3');
  assert.deepEqual(O.round_door.rect.slice(2), [48, 48]);
  assert.deepEqual(O.round_door.doorAt, [1, 0]);
  assert.equal(O.round_door.kind, 'door');
  assert.deepEqual(O.lift_frost.doorAt, [0, 0]);
  assert.deepEqual(O.returning_hearth.rect.slice(2), [32, 48]);
  for (const id of ['star_stair', 'iced_door', 'tally_frame', 'frost_door', 'ghost_trail']) assert.equal(O[id].collision, 'none', id);
  for (const id of ['post_box', 'snowpine', 'black_pine', 'snowbank', 'icegate', 'auroraobelisk', 'watch_cots']) assert.ok(O[id], id);
  for (const id of ['namestone', 'returning_hearth', 'courier_stove', 'font_thaw', 'crystal', 'frostfire', 'stillheart']) assert.ok(O[id].light, `${id} light`);
  for (const id of ['lodge_thawlight', 'shop_northwind', 'armory_glassice', 'keepers_watch', 'house_snow_a', 'house_snow_b', 'waystation_hut']) {
    assert.equal(O[id].kind, 'building', id);
    assert.ok(Array.isArray(O[id].doorAt), id);
  }
  assert.ok(Ti.palehaven_far && Ti.palehaven_far.w === 176 && Ti.palehaven_far.h === 112);
  assert.ok(Ti.cathedral_far && Ti.cathedral_far.frames.length === 2 && Ti.cathedral_far.frameMs >= 3000, 'never faster than once in 3 s');
  // the colours the master palette cannot carry are listed
  assert.equal(frag.extraColors.length, 13);
});

test('every rect is inside ep7.png and every entry names it', () => {
  const { w, h } = pngSize('assets/tiles/ep7.png');
  const inside = (x, y, rw, rh, id) => assert.ok(x >= 0 && y >= 0 && x + rw <= w && y + rh <= h, `${id} ${x},${y} ${rw}x${rh}`);
  for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const v of Object.values(frag[k])) assert.equal(v.sheet, 'ep7.png');
  for (const [id, m] of Object.entries(frag.terrains)) {
    inside(m.x, m.y, 32 * (m.anim ? Math.max(...m.anim.frames) + 1 : 1), 48, id);
    for (const [vx, vy] of m.variants) inside(vx, vy, 16, 16, id);
  }
  for (const [id, m] of Object.entries(frag.walls)) {
    inside(m.top[0], m.top[1], 32, 48, id);
    inside(m.face[0], m.face[1], 32, 32, id);
    for (const st of m.faceStyles || []) for (const [bx, by] of st) inside(bx, by, 32, 32, id);
  }
  for (const [id, m] of Object.entries(frag.tiles)) {
    inside(m.x, m.y, m.w || 16, m.h || 16, id);
    for (const [fx, fy] of m.frames || []) inside(fx, fy, m.w, m.h, id);
  }
  for (const [id, m] of Object.entries(frag.objects)) {
    for (const r of m.frames || [m.rect]) inside(...r, id);
    if (m.anim) inside(m.rect[0] + Math.max(...m.anim.frames) * m.anim.frameDx, m.rect[1], m.rect[2], m.rect[3], id);
  }
});

test('the phone contrast numbers recorded by ep7_scenes.py pass (three pairs separately, the stones, the frost doors)', () => {
  const p = path.join(NEXT, 'tools/art/tiles/out/ep7/contrast_check.json');
  if (!fs.existsSync(p)) return;            // out/ is git-ignored: checked where the build ran
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  const P = c.three_pairs;
  assert.ok(P.ghost_vs_fade.difference >= 0.08 && P.ghost_vs_fade.pass, 'ghost trail vs fade');
  assert.ok(P.held_path_vs_fade.difference >= 0.2 && P.held_path_vs_fade.pass, 'held path vs fade, textured');
  assert.ok(P.snow_vs_fade.difference >= 0.1 && P.snow_vs_fade.pass, 'snow vs fade, textured');
  assert.ok(P.fade_flat.pass, 'the fade is flat');
  assert.ok(c.stones.namestone.pass && c.stones.name_plate.pass, 'stone states');
  for (const v of Object.values(c.frost_door)) assert.ok(v.pass, 'frost door against its floor');
});

test('ep7 art belongs to the ep7 pack, never the main manifest; the stages carry band, key, grades and aurora', () => {
  const main = JSON.stringify(read('assets/manifest.json'));
  const stages = ['ep7_battle_road', 'ep7_battle_vault', 'ep7_battle_hall', 'ep7_battle_sanctum', 'ep7_battle_stillheart'];
  for (const f of ['assets/tiles/ep7.png', 'assets/tiles/ep7_tiles.json', ...stages.map((b) => `assets/backdrops/${b}.png`),
    'assets/backdrops/ep7_dialog_keyart.png']) {
    assert.equal(packOfFile(f), 'ep7', f);
    assert.ok(!main.includes(path.basename(f)), f);
  }
  const enc = fs.readFileSync(path.join(NEXT, 'src/data/ep7/encounters.js'), 'utf8');
  for (const b of stages) {
    const m = read(`assets/backdrops/${b}.json`);
    assert.equal(m.image, b + '.png');
    assert.equal(m.backdropId, b, b);
    assert.ok(m.bandY > 0 && m.bandAlpha > 0, b);
    assert.ok(enc.includes(`'${b}'`), `${b} named in encounters.js`);
  }
  const s = read('assets/backdrops/ep7_battle_stillheart.json');
  const g = s.grades;
  assert.ok(g && g.thaw && g.thaw.tone, 'the thaw grade');
  assert.ok(!g.thaw.screen && !g.thaw.multiply, 'the thaw is a tone, never a screen over the frozen grade');
  for (const k of ['lift', 'chroma', 'cast', 'hue']) assert.equal(typeof g.thaw.tone[k], 'number', `tone.${k}`);
  assert.ok(g.meanLuma.thaw - g.meanLuma.frozen >= 0.10, `thaw ${g.meanLuma.thaw} at least 0.10 over frozen ${g.meanLuma.frozen}`);
  for (const b of ['ep7_battle_sanctum', 'ep7_battle_stillheart']) {
    const A = read(`assets/backdrops/${b}.json`).aurora;
    assert.ok(A && A.frames === 3 && A.everyFrames >= 30, `${b}: 3 frames, one every 30 game frames`);
    assert.ok(A.measured.maxStepLuma <= 0.05, `${b}: +${A.measured.maxStepLuma} luma a step`);
  }
  assert.equal(read('assets/backdrops/ep7_dialog_keyart.json').image, 'ep7_dialog_keyart.png');
});
