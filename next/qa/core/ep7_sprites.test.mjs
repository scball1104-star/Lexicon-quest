// Episode 7 sprite atlases (E7-sprites): every id the pack's data names has its frames, every frame sits inside its sheet with
// the loader's default origin (the pack merge copies frames, not origins), no frame name clashes with a base atlas or another
// pack (the base would win the merge silently), every look the White Phantom's phases name exists with every derived frame the
// scene asks for (ai.js enterPhase forwards `sprite`, so a missing look means no look change), and every look has one HUD anchor
// over the crown, the same in all three (CRITIQUE_8 item 1).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const pngSize = (p) => { const b = fs.readFileSync(path.join(NEXT, p)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

const ATLASES = {
  ep7_npcs: ['assets/sprites/ep7_npcs.json', 'assets/sprites/npcs.json'],
  ep7_enemies_battle: ['assets/sprites/ep7_enemies_battle.json', 'assets/sprites/enemies_battle.json'],
  ep7_bosses_battle: ['assets/sprites/ep7_bosses_battle.json', 'assets/sprites/bosses_battle.json'],
  ep7_enemies_field: ['assets/sprites/ep7_enemies_field.json', 'assets/sprites/enemies_field.json'],
  ep7_portraits: ['assets/sprites/ep7_portraits.json', 'assets/sprites/portraits.json'],
  ep7_heads: ['assets/ui/ep7_heads.json', 'assets/ui/heads.json'],
};
const OTHER = ['ep6', 'ep5', 'ep4', 'x1', 'x2', 'cave', 'tier', 'worldmap'];
const DERIVED = ['idle_1', 'attack', 'hurt', 'die_0', 'die_1', 'die_2'];
const LOOKS = ['white_phantom', 'white_phantom_ward', 'white_phantom_thaw'];

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

test('battle frames use the default bottom-centre origin; the boss looks fit the 160 x 144 boss cell', () => {
  for (const id of ['ep7_enemies_battle', 'ep7_bosses_battle']) {
    const j = read(ATLASES[id][0]);
    for (const [n, r] of Object.entries(j.frames)) assert.deepEqual(j.origin[n], [Math.floor(r[2] / 2), r[3] - 1], n);
  }
  const bb = read(ATLASES.ep7_bosses_battle[0]);
  for (const l of LOOKS) assert.ok(bb.frames[l][2] <= 160 && bb.frames[l][3] <= 144, `${l} fits the boss cell`);
});

test('the ids Episode 7 names have art, and every look a Phantom phase names exists with every frame', async () => {
  const { EP7_ENEMIES } = await import('../../src/data/ep7/enemies.js');
  const eb = read(ATLASES.ep7_enemies_battle[0]), bb = read(ATLASES.ep7_bosses_battle[0]);
  const ef = read(ATLASES.ep7_enemies_field[0]), hd = read(ATLASES.ep7_heads[0]);
  const has = (n) => !!(eb.frames[n] || bb.frames[n]);
  for (const [id, e] of Object.entries(EP7_ENEMIES)) {
    assert.ok(has(id), `battle frame ${id}`);
    assert.ok(hd.frames[`head_${id}`], `head ${id}`);
    for (const s of DERIVED) assert.ok(has(`${id}_${s}`), `${id}_${s}`);
    if (e.charge || e.boss || ['snow_wisp', 'hush_owl', 'frostbound_revenant', 'closed_gate', 'lost_letter'].includes(id)) assert.ok(has(`${id}_cast`), `${id}_cast`);
    for (const ph of e.phases || []) {
      assert.ok(ph.sprite, `phase ${ph.id} names its look`);
      assert.ok(has(ph.sprite), `phase look ${ph.sprite}`);
      for (const s of [...DERIVED, 'cast']) assert.ok(has(`${ph.sprite}_${s}`), `${ph.sprite}_${s}`);
    }
  }
  assert.deepEqual(EP7_ENEMIES.white_phantom.phases.map((p) => p.sprite), LOOKS);
  for (const id of LOOKS) {
    assert.ok(bb.frames[id], id);
    assert.equal(eb.external[id], 'bosses_battle');
  }
  const FIELD = ['rime_wolf', 'snow_wisp', 'hush_owl', 'crystal_crawler', 'frostbound_revenant', 'ice_knight', 'rimed_page',
    'pale_lantern', 'phantom_avatar', 'phantom_avatar_back'];
  for (const id of FIELD) assert.ok(ef.frames[`${id}_0`] && ef.frames[`${id}_1`] && ef.sprites[id], `field ${id}`);
  const po = read(ATLASES.ep7_portraits[0]);
  assert.deepEqual(po.frames.phantom_48.slice(2), [48, 48]);
  assert.deepEqual(po.frames.phantom_32.slice(2), [32, 32]);
  assert.deepEqual(po.portraits.phantom, { 48: 'phantom_48', 32: 'phantom_32' });
});

test('every Phantom look has its HUD anchor, one anchor over the crown in all three', () => {
  const bb = read(ATLASES.ep7_bosses_battle[0]);
  assert.ok(bb.hud, 'hud block');
  const first = bb.hud[LOOKS[0]];
  for (const l of LOOKS) {
    const h = bb.hud[l];
    assert.ok(h && Array.isArray(h.crown) && Array.isArray(h.head) && Array.isArray(h.headPx), `hud ${l}`);
    assert.deepEqual(h.crown, first.crown, `${l} crown anchor matches Outer Frost`);
    assert.deepEqual(h.headPx, first.headPx, `${l} head box matches Outer Frost`);
    const [, , w, fh] = bb.frames[l];
    const [dx, dy] = h.crown;
    // the anchor is inside the frame, in its top fifth (the crown), and inside the head box
    assert.ok(Math.abs(dx) <= w / 2 && -dy <= fh - 1 && -dy >= fh * 0.8, `${l} crown anchor in the top of the frame`);
    assert.ok(dx >= h.headPx[0] && dx <= h.headPx[1] && dy >= h.headPx[2] && dy <= h.headPx[3], `${l} anchor inside the head box`);
    for (const f of h.head) assert.ok(f >= 0 && f <= 1, `${l} head fractions`);
  }
});

test('every npc and field sprite id the story and npcs name resolves to a frame', () => {
  const np = read(ATLASES.ep7_npcs[0]), npBase = read(ATLASES.ep7_npcs[1]);
  const packs = ['ep5', 'ep6'].map((k) => `assets/sprites/${k}_npcs.json`).filter((p) => fs.existsSync(path.join(NEXT, p))).map(read);
  const ef = read(ATLASES.ep7_enemies_field[0]);
  const eb = read(ATLASES.ep7_enemies_battle[0]);
  const src = ['src/data/ep7/story.js', 'src/data/ep7/npcs.js'].map((p) => fs.readFileSync(path.join(NEXT, p), 'utf8')).join('\n');
  const ids = new Set([...src.matchAll(/sprite:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]));
  assert.ok(ids.size > 5);
  for (const id of ids) {
    const ok = np.frames[`${id}_down_0`] || npBase.frames[`${id}_down_0`] || packs.some((p) => p.frames[`${id}_down_0`]) ||
      ef.frames[`${id}_0`] || eb.frames[id];
    assert.ok(ok, `sprite ${id}`);
  }
  for (const id of ['npc_keeper', 'npc_keeper_mid', 'npc_keeper_young', 'npc_keeper_mother', 'npc_courier_m', 'npc_bryn', 'npc_eira',
    'npc_sol', 'npc_maera', 'npc_torr', 'npc_mirael', 'npc_north_watchkeeper']) {
    for (const d of ['down', 'left', 'right', 'up']) for (const k of ['0', '1', '2', 'blink']) assert.ok(np.frames[`${id}_${d}_${k}`], `${id}_${d}_${k}`);
  }
});

test('no em dash in the Episode 7 sprite notes', () => {
  for (const [p] of Object.values(ATLASES)) assert.ok(!fs.readFileSync(path.join(NEXT, p), 'utf8').includes(String.fromCharCode(0x2014)), p);
});
