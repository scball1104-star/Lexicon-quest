// Episode 5 sprite atlases (E5-sprites): every id the pack's data names has its frames, every frame sits inside its
// sheet with the loader's default origin (the pack merge copies frames, not origins), no frame name clashes with a base
// atlas (the base would win the merge silently), and the phase looks the Oracle's data names exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const pngSize = (p) => { const b = fs.readFileSync(path.join(NEXT, p)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

const ATLASES = {
  ep5_npcs: ['assets/sprites/ep5_npcs.json', 'assets/sprites/npcs.json'],
  ep5_enemies_battle: ['assets/sprites/ep5_enemies_battle.json', 'assets/sprites/enemies_battle.json'],
  ep5_bosses_battle: ['assets/sprites/ep5_bosses_battle.json', 'assets/sprites/bosses_battle.json'],
  ep5_enemies_field: ['assets/sprites/ep5_enemies_field.json', 'assets/sprites/enemies_field.json'],
  ep5_portraits: ['assets/sprites/ep5_portraits.json', 'assets/sprites/portraits.json'],
  ep5_heads: ['assets/ui/ep5_heads.json', 'assets/ui/heads.json'],
};
// every other pack atlas of the same base: a name clash with any of them would be silent too
const OTHER = ['ep4', 'x1', 'cave'];

test('every frame is inside its sheet and no name clashes with the base or another pack', () => {
  for (const [id, [p, base]] of Object.entries(ATLASES)) {
    const j = read(p), b = read(base);
    const others = OTHER.map((k) => path.join(path.dirname(base), `${k}_${path.basename(base)}`))
      .filter((q) => fs.existsSync(path.join(NEXT, q))).map(read);
    const [W, H] = pngSize(path.join(path.dirname(p), j.image));
    for (const [n, [x, y, w, h]] of Object.entries(j.frames)) {
      assert.ok(x >= 0 && y >= 0 && x + w <= W && y + h <= H, `${id} ${n} out of bounds`);
      assert.ok(!(n in b.frames), `${id} ${n} clashes with ${base}`);
      for (const o of others) assert.ok(!(n in o.frames), `${id} ${n} clashes with another pack`);
    }
    for (const [an, a] of Object.entries(j.anims || {})) for (const f of a.frames) assert.ok(f in j.frames, `${id} anim ${an} -> ${f}`);
  }
});

test('battle frames use the default bottom-centre origin', () => {
  for (const id of ['ep5_enemies_battle', 'ep5_bosses_battle']) {
    const j = read(ATLASES[id][0]);
    for (const [n, r] of Object.entries(j.frames)) assert.deepEqual(j.origin[n], [Math.floor(r[2] / 2), r[3] - 1], n);
  }
});

test('the ids Episode 5 names have art', async () => {
  const { EP5_ENEMIES } = await import('../../src/data/ep5/enemies.js');
  const eb = read(ATLASES.ep5_enemies_battle[0]), bb = read(ATLASES.ep5_bosses_battle[0]);
  const ef = read(ATLASES.ep5_enemies_field[0]), hd = read(ATLASES.ep5_heads[0]);
  const has = (n) => !!(eb.frames[n] || bb.frames[n]);
  for (const [id, e] of Object.entries(EP5_ENEMIES)) {
    assert.ok(has(id), `battle frame ${id}`);
    assert.ok(hd.frames[`head_${id}`], `head ${id}`);
    for (const s of ['idle_1', 'attack', 'hurt', 'die_0', 'die_1', 'die_2']) assert.ok(has(`${id}_${s}`), `${id}_${s}`);
    for (const ph of e.phases || []) if (ph.sprite) {
      assert.ok(has(ph.sprite), `phase look ${ph.sprite}`);
      for (const s of ['idle_1', 'attack', 'hurt', 'cast']) assert.ok(has(`${ph.sprite}_${s}`), `${ph.sprite}_${s}`);
    }
  }
  for (const id of ['oracle', 'oracle_futures', 'oracle_true']) {
    assert.ok(bb.frames[id], id);
    assert.equal(eb.external[id], 'bosses_battle');
  }
  const FIELD = ['dune_stalker', 'dune_scarab', 'dust_harrier', 'silt_reaver', 'starsilt', 'horizon_shade', 'tomorrow_husk',
    'mirage_knight', 'oracle_avatar', 'oracle_avatar_back'];
  for (const id of FIELD) assert.ok(ef.frames[`${id}_0`] && ef.frames[`${id}_1`] && ef.sprites[id], `field ${id}`);
  const po = read(ATLASES.ep5_portraits[0]);
  assert.deepEqual(po.frames.oracle_48.slice(2), [48, 48]);
  assert.deepEqual(po.frames.oracle_32.slice(2), [32, 32]);
  assert.deepEqual(po.portraits.oracle, { 48: 'oracle_48', 32: 'oracle_32' });
});

test('every npc and field sprite id the story and npcs name resolves to a frame', () => {
  const np = read(ATLASES.ep5_npcs[0]), npBase = read(ATLASES.ep5_npcs[1]);
  const ef = read(ATLASES.ep5_enemies_field[0]);
  const src = ['src/data/ep5/story.js', 'src/data/ep5/npcs.js'].map((p) => fs.readFileSync(path.join(NEXT, p), 'utf8')).join('\n');
  const ids = new Set([...src.matchAll(/sprite:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]));
  assert.ok(ids.size > 5);
  for (const id of ids) {
    const ok = np.frames[`${id}_down_0`] || npBase.frames[`${id}_down_0`] || ef.frames[`${id}_0`];
    assert.ok(ok, `sprite ${id}`);
  }
  for (const id of ['npc_sel', 'npc_yara', 'npc_kamal', 'npc_nasrin', 'npc_laleh', 'npc_omar', 'npc_yasmin', 'npc_hassan',
    'npc_ishra', 'npc_tamir', 'npc_young_sel', 'npc_traveler', 'npc_traveler_b', 'npc_dune_host']) {
    for (const d of ['down', 'left', 'right', 'up']) for (const k of ['0', '1', '2', 'blink']) assert.ok(np.frames[`${id}_${d}_${k}`], `${id}_${d}_${k}`);
  }
});

test('no em dash in the Episode 5 sprite notes', () => {
  for (const [p] of Object.values(ATLASES)) assert.ok(!fs.readFileSync(path.join(NEXT, p), 'utf8').includes(String.fromCharCode(0x2014)), p);
});
