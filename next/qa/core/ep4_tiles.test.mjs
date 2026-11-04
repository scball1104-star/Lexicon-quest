// E4-tiles: the ep4 tile fragment (assets/tiles/ep4_tiles.json + ep4.png) merges into the live tile database with no
// clash against tiles.json or the x1 fragment, every id the plan (EPISODE4_PLAN 9.1) names exists with its collision
// code, every rect sits inside the sheet, and the ep4 art never reaches the main manifest (the first download).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeTileFragment } from '../../src/game/packs.js';
import { packOfFile } from './sync-manifest.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const frag = read('assets/tiles/ep4_tiles.json');

function pngSize(p) {
  const b = fs.readFileSync(path.join(NEXT, p));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

test('ep4 fragment merges into tiles.json (+ x1) with no clash', () => {
  const db = read('assets/tiles/tiles.json');
  const x1 = mergeTileFragment(db, read('assets/tiles/x1_tiles.json'));
  assert.deepEqual(x1.clashes, []);
  const r = mergeTileFragment(db, frag);
  assert.deepEqual(r.clashes, []);
  assert.ok(r.added > 60);
  // floors sit below the holes; tide_water above every floor
  const o = db.terrainOrder;
  for (const t of ['causeway_floor', 'keep_archive_floor', 'witness_floor', 'canal_floor']) assert.ok(o.indexOf(t) < o.indexOf('pit'), t);
  assert.ok(o.indexOf('canal_floor') > o.indexOf('witness_floor'));
  assert.ok(o.indexOf('tide_water') > o.indexOf('canal_floor'));
});

test('the plan ids exist with their collision codes', () => {
  const T = frag.terrains, Wl = frag.walls, Ti = frag.tiles, O = frag.objects;
  for (const t of ['causeway_floor', 'keep_archive_floor', 'witness_floor', 'canal_floor', 'flood_grass', 'mud_path', 'marble_walk']) {
    assert.equal(T[t].collision, 'none', t);
  }
  assert.equal(T.tide_water.collision, 'water');
  assert.equal(T.tide_water.autotile, 'A1');
  for (const w of ['causeway', 'archive_stacks', 'witness']) {
    assert.equal(Wl[w].collision, 'solid');
    assert.equal(Wl[w + '_out'].collision, 'solid');
    assert.ok(Wl[w].faceStyles.length >= 4, w);
  }
  for (const t of ['canal_stair_s', 'canal_stair_n', 'canal_stair_e', 'canal_stair_w']) assert.equal(Ti[t].collision, 'none');
  for (const t of ['ledge_face', 'ledge_face_marble', 'ledge_lip', 'ledge_lip_marble']) {
    assert.equal(Ti[t].collision, 'solid');
    assert.equal(Ti[t].autotile, 'line16');
  }
  const frames = { tide_wheel: 3, tide_post: 3, pontoon: 4, book_crate: 4, seal_paper: 3, flood_board: 3, great_lock: 2,
    principle_stone_voice: 2, principle_stone_truth: 2, principle_stone_mercy: 2, petition_gate_closed: 4,
    witness_lectern: 2, throne_paper: 2, boat: 2 };
  for (const [id, n] of Object.entries(frames)) assert.equal(O[id].frames.length, n, id);
  for (const id of ['floodgate', 'door_seal', 'door_canal', 'petition_gate']) {
    assert.ok(O[id + '_closed'] && O[id + '_open'], id);
    assert.ok(O[id + '_open'].doorAt, id);
  }
  for (const id of ['inn_flood', 'shop_river', 'forge_crown', 'regent_hall', 'house_vw_a', 'house_vw_b']) {
    assert.equal(O[id].kind, 'building');
    assert.ok(Array.isArray(O[id].doorAt), id);
  }
  for (const id of ['statue_faceless', 'glass_dome', 'lantern_chain', 'font_tide', 'rope_ladder', 'sandbags', 'roof_drowned_a']) assert.ok(O[id], id);
  assert.equal(O.rope_ladder.collision, 'none');
  assert.ok(Ti.valewyn_far);
});

test('every rect is inside ep4.png and every entry names it', () => {
  const { w, h } = pngSize('assets/tiles/ep4.png');
  const inside = (x, y, rw, rh, id) => assert.ok(x >= 0 && y >= 0 && x + rw <= w && y + rh <= h, `${id} ${x},${y} ${rw}x${rh}`);
  for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const v of Object.values(frag[k])) assert.equal(v.sheet, 'ep4.png');
  for (const [id, m] of Object.entries(frag.terrains)) inside(m.x, m.y, 32 * (m.anim ? 3 : 1), 48, id);
  for (const [id, m] of Object.entries(frag.tiles)) inside(m.x, m.y, m.w || 16, m.h || 16, id);
  for (const [id, m] of Object.entries(frag.objects)) {
    for (const r of m.frames || [m.rect]) inside(...r, id);
    if (m.anim) inside(m.rect[0] + Math.max(...m.anim.frames) * m.anim.frameDx, m.rect[1], m.rect[2], m.rect[3], id);
  }
});

test('ep4 art belongs to the ep4 pack, never the main manifest', () => {
  const main = JSON.stringify(read('assets/manifest.json'));
  for (const f of ['assets/tiles/ep4.png', 'assets/tiles/ep4_tiles.json', 'assets/backdrops/ep4_battle_keep.png']) {
    assert.equal(packOfFile(f), 'ep4', f);
    assert.ok(!main.includes(path.basename(f)), f);
  }
  for (const b of ['ep4_battle_flood_road', 'ep4_battle_keep', 'ep4_battle_archive_deep', 'ep4_battle_witness', 'ep4_battle_throne', 'ep4_dialog_keyart']) {
    const m = read(`assets/backdrops/${b}.json`);
    assert.equal(m.image, b + '.png');
    if (b.includes('battle')) assert.ok(m.bandY > 0 && m.bandAlpha > 0, b);
  }
});
