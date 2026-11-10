// E6-tiles: the ep6 tile fragment (assets/tiles/ep6_tiles.json + ep6.png) merges into the live tile database with no
// clash against tiles.json and the x1, ep4 and ep5 fragments (the packs always loaded under ep6); every id EPISODE6_PLAN
// 9.1 asks for exists with its collision code and frame count (the frame rules E6-world draws by: arrow order 0 up, 1
// right, 2 down, 3 left); every rect sits inside the sheet; the voids are the lowest terrains; the backdrops carry their
// band, their BACKDROPS key, the storm and clear grades (clear at least 0.12 over storm, measured) and the lightning
// limits of plan 5.2; and none of it reaches the main manifest (the first download).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeTileFragment } from '../../src/game/packs.js';
import { packOfFile } from './sync-manifest.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const frag = read('assets/tiles/ep6_tiles.json');
const OTHERS = ['assets/tiles/x1_tiles.json', 'assets/tiles/ep4_tiles.json', 'assets/tiles/ep5_tiles.json'];

function pngSize(p) {
  const b = fs.readFileSync(path.join(NEXT, p));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

test('ep6 fragment merges into tiles.json (+ x1, ep4, ep5) with no clash; the voids lowest, the floors below the holes', () => {
  const db = read('assets/tiles/tiles.json');
  for (const f of OTHERS) assert.deepEqual(mergeTileFragment(db, read(f)).clashes, [], f);
  const r = mergeTileFragment(db, frag);
  assert.deepEqual(r.clashes, []);
  assert.ok(r.added > 60);
  const o = db.terrainOrder;
  for (const t of ['cloudbank', 'storm_cloud', 'duct_shaft']) assert.ok(o.indexOf(t) >= 0 && o.indexOf(t) < o.indexOf('archive_floor'), `${t} below every core terrain`);
  for (const t of ['relay_grate', 'spire_stone', 'skyport_paving', 'skybridge', 'stormglass', 'skyplank', 'skywalk']) {
    assert.ok(o.indexOf(t) > o.indexOf('duct_shaft') && o.indexOf(t) < o.indexOf('pit'), t);
  }
  assert.ok(o.indexOf('skywalk') > o.indexOf('skyplank'), 'a bridge draws its plank ends over a deck');
  for (const t of ['gust_lane', 'gust_duct', 'sea_foam']) assert.ok(o.indexOf(t) > o.indexOf('pit'), `${t} last`);
});

test('every ep6 id is unique against tiles.json and the x1, ep4 and ep5 fragments (a legend id names one thing)', () => {
  const others = {};
  for (const f of ['assets/tiles/tiles.json', ...OTHERS]) {
    const d = read(f);
    for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) for (const id of Object.keys(d[k] || {})) others[id] = `${f} ${k}`;
  }
  for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const id of Object.keys(frag[k])) assert.ok(!others[id], `${k}.${id} also in ${others[id]}`);
  // the plan's sprite name `mooring_post` is Episode 4's timber post: the lane mooring is gust_mooring
  assert.ok(!frag.objects.mooring_post && frag.objects.gust_mooring);
});

test('the plan ids exist with their collision codes and frames', () => {
  const T = frag.terrains, Wl = frag.walls, Ti = frag.tiles, O = frag.objects;
  for (const t of ['cloudbank', 'storm_cloud', 'gust_lane', 'gust_duct']) {
    assert.equal(T[t].collision, 'void', t);
    assert.equal(T[t].autotile, 'A1', t);
    assert.deepEqual(T[t].anim, { frames: [0, 1, 2, 1], frameDx: 32, ms: 260 }, t);
  }
  assert.equal(T.duct_shaft.collision, 'void');
  for (const t of ['skyplank', 'stormglass', 'skybridge', 'skyport_paving', 'relay_grate', 'spire_stone']) {
    assert.equal(T[t].collision, 'none', t);
    assert.equal(T[t].autotile, 'A2', t);
  }
  assert.equal(T.skywalk.collision, 'none');
  assert.equal(T.skywalk.autotile, 'A1');
  assert.equal(T.sea_foam.collision, 'water');
  for (const w of ['causeway_rail', 'relay_hall', 'spire', 'basalt_stack']) {
    assert.equal(Wl[w].collision, 'solid', w);
    assert.equal(Wl[w + '_out'].collision, 'solid', w);
    assert.ok(Wl[w].faceStyles.length >= 4, w);
  }
  // the lane kit, in E6-world's frame rules (src/data/ep6/field/art.js): arrow 0 up, 1 right, 2 down, 3 left
  const DIRS = ['up', 'right', 'down', 'left'];
  const shape = { vane: [16, 32, 8], fan_vane: [16, 32, 8], gust_mooring: [16, 32, 12], gust_streak: [16, 16, 12],
    gust_chevron: [16, 16, 8] };
  for (const [id, [w, h, n]] of Object.entries(shape)) {
    assert.equal(O[id].rect[2], w, `${id} width`);
    assert.equal(O[id].rect[3], h, `${id} height`);
    assert.equal(O[id].frames.length, n, `${id} frames`);
    assert.deepEqual(O[id].dirs, DIRS, `${id} dirs`);
  }
  assert.equal(O.vane.collision, 'solid');
  assert.equal(O.fan_vane.collision, 'solid');
  assert.equal(O.gust_mooring.collision, 'none');
  assert.deepEqual(O.gust_mooring.footprint, []);
  for (const id of ['gust_streak', 'gust_chevron']) assert.equal(O[id].collision, 'none', id);
  const frames = { signal_lamp: 2, lamp_storm: 2, relay: 3, chimes: 3, departure_board: 4, beacon: 2, scribe_desk: 2,
    first_shelf: 2, crate_dash: 2, supply_coffer: 2 };
  for (const [id, n] of Object.entries(frames)) assert.equal(O[id].frames.length, n, id);
  assert.deepEqual(O.departure_board.shiftFrames, [0, 1, 2]);
  for (const id of ['quills', 'wind_script', 'font_wind', 'windsock', 'rotor']) assert.ok(O[id].anim && O[id].anim.frameDx, id);
  for (const id of ['speaking_tube', 'post_rack', 'windstone', 'bollard', 'bridge_post', 'lamp_sky', 'flower_bed', 'cargo_net',
    'feather_grille', 'skyflowers', 'lift_brass']) assert.ok(O[id], id);
  for (const id of ['beacon', 'kestrel', 'great_chain', 'quills', 'wind_script', 'feather_grille', 'skyflowers']) assert.equal(O[id].collision, 'none', id);
  assert.deepEqual(O.kestrel.rect.slice(2), [96, 48]);
  assert.deepEqual(O.great_chain.rect.slice(2), [32, 128]);
  assert.deepEqual(O.scribe_desk.rect.slice(2), [64, 64]);
  assert.ok(O.sky_keyhole_closed && O.sky_keyhole_open);
  assert.equal(O.sky_keyhole_open.kind, 'door');
  assert.deepEqual(O.sky_keyhole_open.doorAt, [1, 0]);
  assert.deepEqual(O.lift_brass.doorAt, [0, 0]);
  for (const id of ['signal_lamp', 'lamp_storm', 'beacon', 'font_wind', 'lamp_sky']) assert.ok(O[id].light, `${id} light`);
  for (const id of ['inn_cloudhouse', 'shop_aeris', 'workshop_galewing', 'tower_signal', 'house_sky_a', 'house_sky_b']) {
    assert.equal(O[id].kind, 'building', id);
    assert.ok(Array.isArray(O[id].doorAt), id);
  }
  for (const t of ['rope_rail']) {
    assert.equal(Ti[t].collision, 'solid');
    assert.equal(Ti[t].autotile, 'line16');
  }
  assert.equal(Ti.rope_stair.collision, 'none');
  assert.ok(Ti.isles_far && Ti.isles_far.w === 160 && Ti.isles_far.h === 96);
  assert.ok(Ti.storm_far && Ti.storm_far.w === 128 && Ti.storm_far.h === 80);
});

test('every rect is inside ep6.png and every entry names it', () => {
  const { w, h } = pngSize('assets/tiles/ep6.png');
  const inside = (x, y, rw, rh, id) => assert.ok(x >= 0 && y >= 0 && x + rw <= w && y + rh <= h, `${id} ${x},${y} ${rw}x${rh}`);
  for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const v of Object.values(frag[k])) assert.equal(v.sheet, 'ep6.png');
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

test('ep6 art belongs to the ep6 pack, never the main manifest; the stages carry band, key, grades and lightning', () => {
  const main = JSON.stringify(read('assets/manifest.json'));
  const stages = { ep6_battle_sky: 'ep6_airstair', ep6_battle_causeway: 'ep6_causeways', ep6_battle_relays: 'ep6_relays',
    ep6_battle_storm: 'ep6_storm', ep6_battle_eyrie: 'ep6_eyrie' };
  for (const f of ['assets/tiles/ep6.png', 'assets/tiles/ep6_tiles.json', ...Object.keys(stages).map((b) => `assets/backdrops/${b}.png`),
    'assets/backdrops/ep6_dialog_keyart.png']) {
    assert.equal(packOfFile(f), 'ep6', f);
    assert.ok(!main.includes(path.basename(f)), f);
  }
  // the keys src/data/ep6/encounters.js names
  const enc = fs.readFileSync(path.join(NEXT, 'src/data/ep6/encounters.js'), 'utf8');
  for (const [b, key] of Object.entries(stages)) {
    const m = read(`assets/backdrops/${b}.json`);
    assert.equal(m.image, b + '.png');
    assert.equal(m.backdropId, key, b);
    assert.ok(m.bandY > 0 && m.bandAlpha > 0, b);
    assert.ok(enc.includes(`'${key}'`), `${key} named in encounters.js`);
  }
  for (const b of ['ep6_battle_storm', 'ep6_battle_eyrie']) {
    const m = read(`assets/backdrops/${b}.json`);
    const g = m.grades;
    assert.ok(g && g.clear && g.clear.tone && g.clear.rain === false, b);
    assert.ok(!g.clear.screen && !g.clear.multiply, `${b}: the clear grade is a tone, never a screen over the storm`);
    for (const k of ['lift', 'chroma', 'cast', 'hue']) assert.equal(typeof g.clear.tone[k], 'number', `${b} tone.${k}`);
    assert.ok(g.meanLuma.clear - g.meanLuma.storm >= 0.12, `${b}: clear ${g.meanLuma.clear} at least 0.12 over storm ${g.meanLuma.storm}`);
    assert.ok(m.rain && m.rain.alpha > 0, `${b} rain`);
    const L = m.lightning;
    assert.ok(L.peakLumaRise <= 0.12 && L.measured.maxPixelLumaRise <= 0.1205, `${b}: lightning peak +${L.measured.maxPixelLumaRise}`);
    assert.ok(L.minIntervalMs >= 4000, `${b}: at most one flash in 4 s`);
  }
  assert.equal(read('assets/backdrops/ep6_dialog_keyart.json').image, 'ep6_dialog_keyart.png');
});
