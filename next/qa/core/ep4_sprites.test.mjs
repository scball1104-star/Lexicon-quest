// Episode 4 sprite atlases (E4-sprites): every id the pack's data names has its frames, every frame sits inside its
// sheet with the loader's default origin (the pack merge copies frames, not origins), and no frame name clashes with a
// base atlas (the base would win the merge silently).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const pngSize = (p) => { const b = fs.readFileSync(path.join(NEXT, p)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

const ATLASES = {
  ep4_npcs: ['assets/sprites/ep4_npcs.json', 'assets/sprites/npcs.json'],
  ep4_enemies_battle: ['assets/sprites/ep4_enemies_battle.json', 'assets/sprites/enemies_battle.json'],
  ep4_bosses_battle: ['assets/sprites/ep4_bosses_battle.json', 'assets/sprites/bosses_battle.json'],
  ep4_enemies_field: ['assets/sprites/ep4_enemies_field.json', 'assets/sprites/enemies_field.json'],
  ep4_portraits: ['assets/sprites/ep4_portraits.json', 'assets/sprites/portraits.json'],
  ep4_heads: ['assets/ui/ep4_heads.json', 'assets/ui/heads.json'],
};

test('every frame is inside its sheet and no name clashes with the base atlas', () => {
  for (const [id, [p, base]] of Object.entries(ATLASES)) {
    const j = read(p), b = read(base);
    const [W, H] = pngSize(path.join(path.dirname(p), j.image));
    for (const [n, [x, y, w, h]] of Object.entries(j.frames)) {
      assert.ok(x >= 0 && y >= 0 && x + w <= W && y + h <= H, `${id} ${n} out of bounds`);
      assert.ok(!(n in b.frames), `${id} ${n} clashes with ${base}`);
    }
    for (const [an, a] of Object.entries(j.anims || {})) for (const f of a.frames) assert.ok(f in j.frames, `${id} anim ${an} -> ${f}`);
  }
});

test('battle frames use the default bottom-centre origin', () => {
  for (const id of ['ep4_enemies_battle', 'ep4_bosses_battle']) {
    const j = read(ATLASES[id][0]);
    for (const [n, r] of Object.entries(j.frames)) assert.deepEqual(j.origin[n], [Math.floor(r[2] / 2), r[3] - 1], n);
  }
});

test('the ids Episode 4 names have art', async () => {
  const { EP4_ENEMIES } = await import('../../src/data/ep4/enemies.js');
  const eb = read(ATLASES.ep4_enemies_battle[0]), bb = read(ATLASES.ep4_bosses_battle[0]);
  const ef = read(ATLASES.ep4_enemies_field[0]), hd = read(ATLASES.ep4_heads[0]);
  for (const id of Object.keys(EP4_ENEMIES)) {
    assert.ok(eb.frames[id] || bb.frames[id], `battle frame ${id}`);
    assert.ok(hd.frames[`head_${id}`], `head ${id}`);
    for (const s of ['idle_1', 'attack', 'hurt', 'die_0', 'die_1', 'die_2']) assert.ok(eb.frames[`${id}_${s}`] || bb.frames[`${id}_${s}`], `${id}_${s}`);
  }
  for (const id of ['paper_regent_ward', 'paper_regent_charter']) assert.ok(bb.frames[id], id);
  for (const id of ['paper_regent', 'paper_regent_ward', 'paper_regent_charter']) assert.equal(eb.external[id], 'bosses_battle');
  for (const id of ['flood_hound', 'lockjaw_crab', 'ink_bloom', 'drowned_watch', 'gutter_phantom', 'blank_decree',
    'waterlogged_sentinel', 'barrister', 'paper_regent_avatar', 'paper_regent_avatar_back']) {
    assert.ok(ef.frames[`${id}_0`] && ef.frames[`${id}_1`] && ef.sprites[id], `field ${id}`);
  }
  const np = read(ATLASES.ep4_npcs[0]);
  for (const id of ['npc_lyra', 'npc_hale', 'npc_nilo', 'npc_dorian', 'npc_joss', 'npc_vance', 'npc_linn', 'npc_sori', 'npc_king', 'npc_boatman']) {
    for (const d of ['down', 'left', 'right', 'up']) for (const k of ['0', '1', '2', 'blink']) assert.ok(np.frames[`${id}_${d}_${k}`], `${id}_${d}_${k}`);
  }
  const po = read(ATLASES.ep4_portraits[0]);
  assert.deepEqual(po.frames.paper_regent_48.slice(2), [48, 48]);
  assert.deepEqual(po.frames.paper_regent_32.slice(2), [32, 32]);
});
