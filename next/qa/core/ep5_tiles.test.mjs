// E5-tiles: the ep5 tile fragment (assets/tiles/ep5_tiles.json + ep5.png) merges into the live tile database with no
// clash against tiles.json, the x1 and the ep4 fragments; every id EPISODE5_PLAN 9.1 asks for exists with its collision
// code and frame count (the shapes E5-world's stand-ins assume, src/data/ep5/field/art.js); every rect sits inside the
// sheet; the backdrops carry their band and grade recipe; and none of it reaches the main manifest (the first download).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeTileFragment } from '../../src/game/packs.js';
import { packOfFile } from './sync-manifest.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const frag = read('assets/tiles/ep5_tiles.json');

function pngSize(p) {
  const b = fs.readFileSync(path.join(NEXT, p));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

test('ep5 fragment merges into tiles.json (+ x1, + ep4) with no clash', () => {
  const db = read('assets/tiles/tiles.json');
  for (const f of ['assets/tiles/x1_tiles.json', 'assets/tiles/ep4_tiles.json']) assert.deepEqual(mergeTileFragment(db, read(f)).clashes, []);
  const r = mergeTileFragment(db, frag);
  assert.deepEqual(r.clashes, []);
  assert.ok(r.added > 80);
  const o = db.terrainOrder;
  // floors below the holes; the groove above every floor it is cut into; dune_sand above them all; running sand on top
  for (const t of ['caravan_paving', 'dune_court', 'gallery_tile', 'well_basalt', 'star_glass', 'deck_planks', 'groove', 'dune_sand']) {
    assert.ok(o.indexOf(t) >= 0 && o.indexOf(t) < o.indexOf('pit'), t);
  }
  for (const t of ['caravan_paving', 'dune_court', 'gallery_tile', 'well_basalt']) assert.ok(o.indexOf('groove') > o.indexOf(t), `groove above ${t}`);
  assert.ok(o.indexOf('dune_sand') > o.indexOf('groove'));
  assert.ok(o.indexOf('running_sand') > o.indexOf('dune_sand'));
});

test('no ep5 id shadows an id of another kind (a legend id must name one thing)', () => {
  const others = {};
  for (const f of ['assets/tiles/tiles.json', 'assets/tiles/x1_tiles.json', 'assets/tiles/ep4_tiles.json']) {
    const d = read(f);
    for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const id of Object.keys(d[k] || {})) others[id] = `${f} ${k}`;
  }
  for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const id of Object.keys(frag[k])) assert.ok(!others[id], `${k}.${id} also in ${others[id]}`);
});

test('the plan ids exist with their collision codes and frames', () => {
  const T = frag.terrains, Wl = frag.walls, Ti = frag.tiles, O = frag.objects;
  for (const t of ['dune_sand', 'caravan_paving', 'groove', 'dune_court', 'gallery_tile', 'well_basalt', 'star_glass', 'deck_planks']) {
    assert.equal(T[t].collision, 'none', t);
    assert.equal(T[t].autotile, 'A2', t);
  }
  for (const t of ['running_sand', 'night_sea']) {
    assert.equal(T[t].collision, 'water', t);
    assert.equal(T[t].autotile, 'A1', t);
    assert.equal(T[t].anim.frameDx, 32, t);
  }
  for (const w of ['dune_court', 'horizon_gallery', 'well_shaft']) {
    assert.equal(Wl[w].collision, 'solid');
    assert.equal(Wl[w + '_out'].collision, 'solid');
    assert.ok(Wl[w].faceStyles.length >= 4, w);
  }
  // E5-world's stand-in shapes (field/art.js): the real art keeps them
  const shape = { sundial: [16, 32, 3], obelisk: [16, 48, 1], standing_stone: [16, 32, 1], low_block: [16, 32, 1],
    pillar_gallery: [16, 32, 1], lamp_cart: [16, 32, 1], sun_plate: [16, 16, 4], window_horizon: [16, 16, 2],
    sun_gate_closed: [16, 32, 1], sun_gate_open: [16, 32, 1], moon_gate_closed: [16, 32, 1], moon_gate_open: [16, 32, 1] };
  for (const [id, [w, h, n]] of Object.entries(shape)) {
    assert.ok(O[id], id);
    assert.equal(O[id].rect[2], w, `${id} width`);
    assert.equal(O[id].rect[3], h, `${id} height`);
    assert.equal(O[id].frames ? O[id].frames.length : 1, n, `${id} frames`);
  }
  for (const id of ['obelisk', 'standing_stone', 'low_block', 'pillar_gallery', 'lamp_cart', 'sundial']) assert.equal(O[id].collision, 'solid', id);
  assert.equal(O.sun_plate.collision, 'none');
  assert.ok(O.lamp_cart.light && O.lamp_cart.anim);
  for (const id of ['sun_gate', 'moon_gate', 'sun_keyhole', 'door_dune']) {
    assert.ok(O[id + '_closed'] && O[id + '_open'], id);
    assert.ok(Array.isArray(O[id + '_open'].doorAt), id);
    assert.equal(O[id + '_open'].kind, 'door', id);
  }
  const frames = { window_horizon_face: 2, star_floor: 3, painted_horizon: 3, spring: 2, vow_stone: 3, oracle_ring: 2,
    reliquary: 2, page_glass: 2, cracked_base: 2, waystone: 4, bulletin: 2, moonwell: 2, armillary_rings: 2, bell_rack: 4,
    star_charts: 2, ship_moored: 2 };
  for (const [id, n] of Object.entries(frames)) assert.equal(O[id].frames.length, n, id);
  assert.deepEqual(O.waystone.shiftFrames, [0, 1, 2]);
  for (const id of ['inn_lantern', 'shop_cloth', 'smithy_copper', 'tower_armillary', 'house_dome_a', 'house_dome_b', 'house_flat']) {
    assert.equal(O[id].kind, 'building', id);
    assert.ok(Array.isArray(O[id].doorAt), id);
  }
  assert.equal(O.arcade_serai.kind, 'building');
  for (const id of ['armillary', 'mural_stars', 'palm', 'camel_rest', 'camel_stand', 'camel_load', 'tent_caravan', 'stall_saffron',
    'stall_indigo', 'lamp_brass', 'lantern_hanging', 'forge_copper', 'campfire_desert', 'tent_omar', 'camp_ruin', 'mast',
    'ship_lantern', 'crate_lashed', 'crates_lashed', 'hatch', 'ship_wheel', 'gangway', 'feather_glass', 'chart_glow',
    'font_oasis', 'map_table', 'stair_sand_down', 'stair_well_down', 'lift_cage', 'obelisk_scraped']) assert.ok(O[id], id);
  for (const id of ['armillary', 'mural_stars', 'rug_saffron', 'star_floor', 'feather_glass', 'chart_glow']) assert.equal(O[id].collision, 'none', id);
  for (const t of ['wall_sandstone', 'ship_rail']) {
    assert.equal(Ti[t].collision, 'solid');
    assert.equal(Ti[t].autotile, 'line16');
  }
  assert.ok(Ti.haven_far && Ti.haven_far.w === 160 && Ti.haven_far.h === 96);
  assert.equal(Ti.water_stair.collision, 'none');
});

test('every rect is inside ep5.png and every entry names it', () => {
  const { w, h } = pngSize('assets/tiles/ep5.png');
  const inside = (x, y, rw, rh, id) => assert.ok(x >= 0 && y >= 0 && x + rw <= w && y + rh <= h, `${id} ${x},${y} ${rw}x${rh}`);
  for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const v of Object.values(frag[k])) assert.equal(v.sheet, 'ep5.png');
  for (const [id, m] of Object.entries(frag.terrains)) {
    inside(m.x, m.y, 32 * (m.anim ? 3 : 1), 48, id);
    for (const [vx, vy] of m.variants) inside(vx, vy, 16, 16, id);
  }
  for (const [id, m] of Object.entries(frag.walls)) {
    inside(m.top[0], m.top[1], 32, 48, id);
    inside(m.face[0], m.face[1], 32, 32, id);
    for (const st of m.faceStyles || []) for (const [bx, by] of st) inside(bx, by, 32, 32, id);
  }
  for (const [id, m] of Object.entries(frag.tiles)) inside(m.x, m.y, m.w || 16, m.h || 16, id);
  for (const [id, m] of Object.entries(frag.objects)) {
    for (const r of m.frames || [m.rect]) inside(...r, id);
    if (m.anim) inside(m.rect[0] + Math.max(...m.anim.frames) * m.anim.frameDx, m.rect[1], m.rect[2], m.rect[3], id);
  }
});

test('ep5 art belongs to the ep5 pack, never the main manifest; the stages carry band and grades', () => {
  const main = JSON.stringify(read('assets/manifest.json'));
  const stages = ['ep5_battle_sea', 'ep5_battle_dunes', 'ep5_battle_gallery', 'ep5_battle_well', 'ep5_battle_oracle'];
  for (const f of ['assets/tiles/ep5.png', 'assets/tiles/ep5_tiles.json', ...stages.map((b) => `assets/backdrops/${b}.png`), 'assets/backdrops/ep5_dialog_keyart.png']) {
    assert.equal(packOfFile(f), 'ep5', f);
    assert.ok(!main.includes(path.basename(f)), f);
  }
  const ids = new Set();
  for (const b of stages) {
    const m = read(`assets/backdrops/${b}.json`);
    assert.equal(m.image, b + '.png');
    assert.ok(m.bandY > 0 && m.bandAlpha > 0, b);
    ids.add(m.backdropId);
    const g = m.grades;
    assert.ok(g && g.day && g.day.multiply && g.day.screen, b);
    assert.ok(g.meanLuma.day - g.meanLuma.night >= 0.12, `${b}: Day ${g.meanLuma.day} at least 0.12 over Night ${g.meanLuma.night}`);
  }
  // the keys src/data/ep5/encounters.js names
  for (const id of ['ep5_sea', 'ep5_dunes', 'ep5_gallery', 'ep5_well', 'ep5_oracle']) assert.ok(ids.has(id), id);
  assert.equal(read('assets/backdrops/ep5_dialog_keyart.json').image, 'ep5_dialog_keyart.png');
});
