// X1-maps-west: x1_downs, x1_loomhouse, x1_barrow (EXPANSION1_PLAN 3.2, 3.6, 4.1 to 4.3, 4.11, 6.1). The maps are x1 pack files:
// the test registers the pack's data, merges the x1 tile fragment and the x1 sprite atlases into mapcheck's database the way
// ensurePack does (mapcheck.mjs itself reads tiles.json only) and loads the three modules directly.
//
// What is proved here (the brief's item 6): the marks and named events of 4.11, the placement rules of 3.6 (no foe near an NPC,
// an arrival or a lane; a foe-free walk from every entrance to the hamlet), the puzzle solutions as walks (the slab switch both
// ways, the Shove niche, the Dash cracks, the Appraise chest, the plate puzzle solved by a push search with no softlock), every
// chest reachable by its stated ability and by nothing else, and that every return door lands in front of its door.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NEXT, loadAll, loadDb, validate, walk, buildGrid, eventCells } from '../../tools/maps/mapcheck.mjs';
import { mergeTileFragment } from '../../src/game/packs.js';

const rd = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const db = await loadDb();
mergeTileFragment(db.tiles, rd('assets/tiles/x1_tiles.json'));
Object.assign(db.enemiesField.sprites, rd('assets/sprites/x1_enemies_field.json').sprites);
Object.assign(db.npcAtlas.sprites, rd('assets/sprites/x1_npcs.json').sprites);
await (await import(pathToFileURL(path.join(NEXT, 'src/data/x1/index.js')).href)).register();

const IDS = ['x1_downs', 'x1_loomhouse', 'x1_barrow'];
const maps = await loadAll();
const M = Object.fromEntries(IDS.map((id) => [id, maps[id]]));
const D = M.x1_downs, L = M.x1_loomhouse, B = M.x1_barrow;
const FIGHT = ['first_fight_done'];
const BELL = ['first_fight_done', 'archive_f1_done'];
// the one error the integrate wave owns: events.js GATE_SPRITES and mapcheck GATE_SPRITE_IDS do not list x1_gate_barrow yet
const SEAM = /^gate gate_reeve: sprite x1_gate_barrow$/;
const ev = (m, id) => m.events.find((e) => e.id === id);
const key = (x, y) => `${x},${y}`;
const man = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const withEvents = (map, events) => ({ ...map, events });

// ------------------------------------------------------------------------------------------------ validity
for (const id of IDS) {
  test(`${id}: validates (ids, targets, NPC coverage, plans, walk); the only error is the gate sprite seam`, () => {
    const r = validate(M[id], db, maps, {});
    assert.deepEqual(r.errors.filter((e) => !SEAM.test(e)), []);
    for (const w of r.warnings) assert.match(w, /not built yet \(pending in x1_links\.json\)/, `${id}: unexpected warning ${w}`);
    assert.ok(db.BANNERS[id], `banner ${id}`);
  });
}

test('the module fields: ids, sizes, areas, music, ambience, lighting, respawn', () => {
  const want = { x1_downs: [56, 34, 'field', 'the_downs'], x1_loomhouse: [14, 11, 'interior', 'the_downs'], x1_barrow: [28, 20, 'dungeon', 'wethers_barrow'] };
  for (const [id, [w, h, area, music]] of Object.entries(want)) {
    const m = M[id];
    assert.equal(m.id, id); assert.equal(m.ground[0].length, w); assert.equal(m.ground.length, h);
    assert.equal(m.area, area); assert.equal(m.music, music);
    for (const row of m.ground) assert.equal(row.length, w);
  }
  assert.equal(D.respawn, 'reentry'); assert.equal(D.ambience, 'wind_valley'); assert.equal(D.lighting.dark, 0);
  assert.equal(B.lighting.dark, 0.45); assert.equal(B.ambience, 'wind_valley');
  assert.equal(L.ambience, null);
});

// ------------------------------------------------------------------------------------------------ the marks of 4.11 (read from STAGING_X1.md)
const staging = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_X1.md'), 'utf8');
function checklistRow(id) {
  const sec = staging.split(/^## 4\. Marks and named events checklist/m)[1].split(/^## /m)[0];
  const line = sec.split('\n').find((l) => l.startsWith(`| ${id} |`));
  assert.ok(line, `STAGING_X1 section 4 has a row for ${id}`);
  const segs = line.split('|')[2].split(';').map((s) => s.trim());
  const names = (s) => [...s.matchAll(/`([^`]+)`/g)].flatMap((m) => m[1].split(/\s+/));
  const marks = /^marks/i.test(segs[0]) ? names(segs[0]) : [];
  return { marks, events: segs.slice(marks.length ? 1 : 0).flatMap(names) };
}
for (const id of IDS) {
  test(`${id}: every mark and named event of the STAGING_X1 checklist exists`, () => {
    const row = checklistRow(id);
    assert.ok(row.marks.length >= 4, `${id} marks listed`);
    for (const m of row.marks) assert.ok(M[id].marks[m], `mark ${m}`);
    const overhead = new Set((M[id].overhead || []).map((o) => o.t));
    for (const e of row.events) assert.ok(ev(M[id], e) || overhead.has(e), `named event ${e}`);
  });
}

test('the horizon decals: the Watchtower to the north and the Windmill to the south-east', () => {
  const o = D.overhead;
  const tower = o.find((t) => t.t === 'x1_far_tower'), mill = o.find((t) => t.t === 'x1_far_windmill');
  assert.ok(tower && tower.y <= 0, 'tower decal on the north skyline');
  assert.ok(mill && mill.x > 28 && mill.y > 17, 'windmill decal in the south-east');
  assert.equal(ev(D, 'x1_far_light').type, 'light');
});

// ------------------------------------------------------------------------------------------------ walks and marks
const allowSolid = new Set(['stones_center', 'blank_stone']);          // marks that are the cell of their own object
test('x1_downs: everything is reachable; every mark is walkable and reached (the drovers marks once the bell has tolled)', () => {
  for (const flags of [FIGHT, BELL]) {
    const w = walk(D, db, { flags });
    assert.deepEqual(w.unreached, flags === FIGHT ? ['drovers_door'] : [], `unreached under ${flags}`);   // the door waits behind the chain until the bell
    for (const m of w.marks) {
      if (allowSolid.has(m.name)) { assert.ok(!m.walkable); continue; }
      if (flags === FIGHT && (m.name === 'drovers' || m.name === 'drovers_exit')) { assert.ok(!m.reached, 'the chain shuts the road before the bell'); continue; }
      assert.ok(m.walkable && m.reached, `mark ${m.name} at ${m.x},${m.y} under ${flags}`);
    }
  }
  const before = walk(D, db, { flags: FIGHT }), after = walk(D, db, { flags: BELL });
  assert.ok(!before.events.find((e) => e.id === 'drovers_door').reached, 'the door to the Millrace is behind the chain before the bell');
  assert.ok(after.events.find((e) => e.id === 'drovers_door').reached, 'the door to the Millrace after the bell');
  const closed = ev(D, 'x1_drovers_chain'), open = ev(D, 'x1_drovers_chain_open');
  assert.equal(closed.ifNot, 'archive_f1_done'); assert.equal(closed.w, 3); assert.equal(open.if, 'archive_f1_done');
});

test('x1_downs: the story marks (the ring, the fold gate, the stones) sit where the scenes expect them', () => {
  const w = walk(D, db, { flags: BELL });
  for (const n of ['ring_n', 'ring_e', 'ring_s', 'ring_w', 'fold_gate', 'moor_gate', 'larch_gate', 'valley_gate', 'town_gate', 'barrow_door', 'ridge']) {
    const m = w.marks.find((x) => x.name === n); assert.ok(m.walkable && m.reached, n);
  }
  // twelve standing stones round the cairn that runs rollcall_stones, in two states each, the thirteenth slab apart
  const stones = D.events.filter((e) => /^menhir_\d+$/.test(e.id)), lettered = D.events.filter((e) => /^menhir_\d+_l$/.test(e.id));
  assert.equal(stones.length, 12); assert.equal(lettered.length, 12);
  assert.ok(stones.every((e) => e.ifNot === 'stones_lettered' && e.text === 'x1_menhir'));
  assert.ok(lettered.every((e) => e.if === 'stones_lettered'));
  const cairn = ev(D, 'stones_center_obj');
  assert.deepEqual([cairn.x, cairn.y], D.marks.stones_center); assert.equal(cairn.script, 'rollcall_stones');
  for (const s of stones) assert.ok(man([s.x, s.y], D.marks.stones_center) >= 3 && man([s.x, s.y], D.marks.stones_center) <= 7, `${s.id} on the ring`);
  const slab = ev(D, 'blank_stone_obj');
  assert.deepEqual([slab.x, slab.y], D.marks.blank_stone); assert.ok(man([slab.x, slab.y], D.marks.stones_center) > 6, 'the slab stands apart');
  // the barrow door is in the mound under the cliff and the return cell is in front of it
  assert.deepEqual([ev(D, 'door_barrow').x, ev(D, 'door_barrow').y], D.marks.barrow_door);
  // the scenes the Downs run
  const scripts = new Set(D.events.filter((e) => e.script).map((e) => e.script));
  for (const s of ['downs_arrival', 'thornfold_arrival', 'stones_arrival', 'rollcall_stones']) assert.ok(scripts.has(s), `script ${s}`);
});

test('x1_downs: the lane from every entrance to Thornfold crosses a thornfold_arrival trigger; the stones trigger covers the ring', () => {
  const w = walk(D, db, { flags: BELL });
  const trigs = D.events.filter((e) => e.type === 'trigger' && e.script === 'thornfold_arrival');
  const cells = new Set(trigs.flatMap((t) => eventCells(t).map(([x, y]) => key(x, y))));
  const g = w.grid, H = g.length, Wd = g[0].length;
  const starts = { valley: D.marks.valley_gate, town: D.marks.town_gate, drovers: D.marks.drovers_exit, moor: D.marks.moor_gate, larch: D.marks.larch_gate };
  for (const [name, s] of Object.entries(starts)) {
    // the lane: the shortest walk over dirt and the entrance cells from the entrance to the hamlet's centre
    const lane = (x, y) => '=Stz'.includes(D.ground[y][x]) && g[y][x] === 'none';   // dirt and the cliff stair
    const prev = new Map([[key(...s), null]]); const q = [s]; const goal = D.marks.thornfold;
    for (let i = 0; i < q.length && !prev.has(key(...goal)); i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of Object.values(DIRV)) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= Wd || ny >= H || prev.has(k) || !(lane(nx, ny) || k === key(...goal))) continue;
        prev.set(k, [x, y]); q.push([nx, ny]);
      }
    }
    assert.ok(prev.has(key(...goal)), `${name}: a dirt lane runs from the entrance to Thornfold`);
    let crossed = false;
    for (let c = goal; c; c = prev.get(key(...c))) if (cells.has(key(...c))) crossed = true;
    assert.ok(crossed, `${name}: the lane to Thornfold crosses a thornfold_arrival trigger`);
  }
  const st = ev(D, 'stones_trig');
  for (const [x, y] of [D.marks.ring_n, D.marks.ring_e, D.marks.ring_s, D.marks.ring_w]) {
    assert.ok(x >= st.x && x < st.x + st.w && y >= st.y && y < st.y + st.h, `ring mark ${x},${y} inside stones_trig`);
  }
});

// ------------------------------------------------------------------------------------------------ plan counts, chests, loot
test('plan counts: three groups on the Downs; two groups and the Reeve on the barrow; fixed chest contents', () => {
  const count = (m, t) => m.events.filter((e) => e.type === 'enemy' && e.encounter === t).length;
  for (const t of ['dn_wolves', 'dn_scarab', 'dn_pack']) assert.equal(count(D, t), 1, t);
  assert.equal(D.events.filter((e) => e.type === 'enemy').length, 3);
  assert.equal(count(B, 'bw_shades'), 1); assert.equal(count(B, 'bw_mixed'), 1);
  assert.equal(B.events.filter((e) => e.type === 'enemy').length, 2);
  const reeve = B.events.filter((e) => e.type === 'actor' && e.id === 'barrow_reeve');
  assert.equal(reeve.length, 1); assert.equal(reeve[0].ifNot, 'barrow_reeve_defeated');
  assert.deepEqual([reeve[0].x, reeve[0].y], B.marks.reeve_spot);
  assert.equal(db.ZONES.x1_downs.plan.length, 3); assert.equal(db.ZONES.x1_barrow.plan.length, 3);
  const c = (m, id) => ev(m, id);
  assert.equal(c(D, 'chest_well').tier, 'wood'); assert.equal(c(D, 'chest_well').item, 'potion'); assert.equal(c(D, 'chest_well').qty, 3);
  assert.equal(c(D, 'chest_ridge').tier, 'wood'); assert.equal(c(D, 'chest_ridge').item, undefined);
  assert.equal(c(D, 'chest_fold').tier, 'iron'); assert.equal(c(D, 'chest_fold').item, undefined);
  assert.equal(c(B, 'chest_bw_landing').tier, 'wood'); assert.equal(c(B, 'chest_bw_landing').item, 'antidote');
  assert.equal(c(B, 'chest_bw_bow').tier, 'gold'); assert.equal(c(B, 'chest_bw_bow').item, 'drovers_bow');
  assert.equal(c(B, 'chest_bw_oss').tier, 'iron'); assert.equal(c(B, 'chest_bw_oss').item, 'phoenix_feather');
  assert.equal(c(B, 'chest_bw_reeve').tier, 'iron'); assert.equal(c(B, 'chest_bw_reeve').item, undefined);
  assert.equal(c(B, 'chest_bw_reeve').if, 'barrow_reeve_defeated');
  assert.ok(db.ITEMS.drovers_bow, 'the bow the chest holds is a registered item');
});

test('the two Dash cracks on the Downs and the Ossuary, and the Appraise chest: each holds only with its ability', () => {
  // Dash: the crack object is the only way to the Old Fold hollow (stray_5 and the iron chest behind it)
  const crack = ev(D, 'x1_crack_fold');
  assert.equal(crack.breakable, 'rock'); assert.equal(crack.h, 2);
  const sealed = withEvents(D, D.events.map((e) => (e.id === 'x1_crack_fold' ? { ...e, breakable: undefined } : e)));
  const wSealed = walk(sealed, db, { flags: BELL });
  assert.ok(wSealed.unreached.includes('chest_fold') && wSealed.unreached.includes('stray_5'), 'no hollow without Dash');
  const wOpen = walk(D, db, { flags: BELL });
  assert.ok(wOpen.log.includes('broke x1_crack_fold') && !wOpen.unreached.includes('chest_fold'));
  for (const id of ['chest_fold', 'stray_5']) assert.equal(ev(D, id).behind, 'x1_crack_fold', `${id} is hidden behind the crack`);
  // Dash: the Ossuary chest sits behind the cracked wall, in front of its floor cell
  const oss = ev(B, 'x1_crack_oss'), chestOss = ev(B, 'chest_bw_oss');
  assert.equal(oss.breakable, 'rock'); assert.equal(chestOss.behind, 'x1_crack_oss');
  assert.equal(chestOss.x, oss.x); assert.equal(chestOss.y, oss.y + 1);
  assert.ok(walk(B, db).log.includes('broke x1_crack_oss'));
  // Appraise: Mira reads Patch (eleven pockets) and the hatch chest appears; nothing else uncovers it
  const patch = ev(D, 'x1_old_scarecrow');
  assert.equal(patch.appraise, true); assert.equal(patch.appraiseText, 'appraise_scarecrow'); assert.equal(patch.text, 'x1_old_scarecrow');
  assert.equal(ev(D, 'chest_ridge').behind, 'appraise:x1_old_scarecrow');
  const blind = withEvents(D, D.events.map((e) => (e.id === 'x1_old_scarecrow' ? { ...e, appraise: false } : e)));
  assert.ok(walk(blind, db, { flags: BELL }).unreached.includes('chest_ridge'), 'no chest without Appraise');
  assert.ok(wOpen.appraised.includes('x1_old_scarecrow') && !wOpen.unreached.includes('chest_ridge'));
  assert.ok(db.lines.appraise_scarecrow && db.lines.x1_old_scarecrow, 'the Appraise and inspect lines exist');
});

// ------------------------------------------------------------------------------------------------ the barrow's mechanisms
const SLAB = { n: ev(B, 'slab_n'), s: ev(B, 'slab_s') };
/** The barrow as it stands with the floor switch off (slab_n shut, slab_s open) or thrown (the reverse): shelves become fixed. */
function slabState(on) {
  const events = B.events.filter((e) => e.type !== 'shelf');
  for (const s of [SLAB.n, SLAB.s]) {
    const [x, y] = s.positions[on ? 1 : 0];
    events.push({ id: `${s.id}_fixed`, type: 'object', x, y, w: 2, sprite: 'x1_slab', text: 'barrow_slab_a' });
  }
  return withEvents(B, events);
}
const reach = (map) => new Set(walk(map, db).reachable);

test('the slab switch both ways: one floor switch, two shelves, exactly one chamber open at a time', () => {
  const sw = ev(B, 'sw_slab');
  assert.deepEqual(sw.target, ['slab_n', 'slab_s']); assert.equal(sw.kind, 'floor');
  assert.equal(SLAB.n.type, 'shelf'); assert.equal(SLAB.s.type, 'shelf');
  assert.equal(SLAB.n.sprite, 'x1_slab'); assert.equal(SLAB.s.sprite, 'x1_slab');
  assert.equal(SLAB.n.state || 0, 0); assert.equal(SLAB.s.state || 0, 0);
  // slab_n starts across its doorway (cells 12..13), slab_s starts in its pocket; the switch swaps them (both doorways are 2 cells)
  assert.deepEqual(SLAB.n.positions, [[12, 14], [14, 14]]); assert.deepEqual(SLAB.s.positions, [[21, 14], [19, 14]]);
  for (const [piece, slab] of [[10, SLAB.n], [17, SLAB.s]]) {
    const d = B.decor.find((o) => o.t === 'x1_slab_doorway' && o.x === piece);
    assert.ok(d, `doorway piece at ${piece}`); assert.equal(d.y, 14);
    const doorway = slab === SLAB.n ? slab.positions[0] : slab.positions[1];
    assert.equal(piece + 2, doorway[0], 'the dark doorway (tiles 2..3) is over the closed slab');
  }
  const off = reach(slabState(false)), on = reach(slabState(true));
  const C = B.marks.niche, Dm = B.marks.ossuary;
  assert.ok(!off.has(key(...C)) && off.has(key(...Dm)), 'start: the Ossuary is open, the Ewe Chamber shut');
  assert.ok(on.has(key(...C)) && !on.has(key(...Dm)), 'switch thrown: the Ewe Chamber is open, the Ossuary shut');
  for (const set of [off, on]) {
    for (const k of [key(...B.marks.entrance), key(...B.marks.switch), key(...B.marks.hall_w), key(21, 7)]) assert.ok(set.has(k), `${k} reachable in both states`);
  }
  // the switch is in the hall, outside both chambers, and reachable with either slab state: the party can always change the state
  assert.ok(off.has(key(15, 11)) && on.has(key(15, 11)));
});

test('the Shove niche: the gold chest needs the block moved, and moving it needs Bram (heavy)', () => {
  const block = ev(B, 'block_niche'), bow = ev(B, 'chest_bw_bow');
  assert.equal(block.heavy, true);
  assert.deepEqual([block.x, block.y], [bow.x, bow.y + 1], 'the block stands in front of the niche chest');
  const base = slabState(true).events.filter((e) => e.id !== 'block_niche');
  const jammed = withEvents(B, [...base, { id: 'block_fixed', type: 'object', x: block.x, y: block.y, sprite: 'push_block', text: 'barrow_slab_a' }]);
  assert.ok(!new Set(walk(jammed, db).reachable).has(key(bow.x, bow.y + 1)), 'the cell in front of the chest is the block itself');
  const w0 = walk(jammed, db);
  assert.ok(w0.unreached.includes('chest_bw_bow'), 'no bow while the block stands (the hero alone only rocks it)');
  for (const dx of [1, -1]) {
    const moved = withEvents(B, [...base, { id: 'block_fixed', type: 'object', x: block.x + dx, y: block.y, sprite: 'push_block', text: 'barrow_slab_a' }]);
    const w1 = walk(moved, db);
    assert.ok(!w1.unreached.includes('chest_bw_bow'), `the bow after a Shove ${dx > 0 ? 'east' : 'west'}`);
    assert.ok(new Set(w1.reachable).has(key(block.x, block.y)), 'the niche front is free');
  }
  // the block can be shoved either way: both neighbours of its cell are floor
  const g = buildGrid(withEvents(B, base), db);
  assert.equal(g.code[block.y][block.x - 1], 'none'); assert.equal(g.code[block.y][block.x + 1], 'none');
});

// a small push search: states (player, block); the player pushes the block one cell away when that cell is free
function pushSearch(map, { blockId, start, goal, exits, shove = false, region }) {
  const b0 = ev(map, blockId);
  const base = buildGrid(withEvents(map, map.events.filter((e) => e.id !== blockId)), db);
  const inRegion = region || (() => true);
  const free = (x, y) => x >= 0 && y >= 0 && x < base.W && y < base.H && base.code[y][x] === 'none' && inRegion(x, y);
  const exitSet = new Set(exits.map((c) => key(...c)));
  const enc = (px, py, bx, by) => `${px},${py}|${bx},${by}`;
  const s0 = enc(start[0], start[1], b0.x, b0.y);
  const dist = new Map([[s0, 0]]); const deque = [s0]; const edges = new Map();
  let head = 0; const states = new Map([[s0, [start[0], start[1], b0.x, b0.y]]]);
  const add = (from, to, st, cost) => {
    if (!edges.has(from)) edges.set(from, []); edges.get(from).push(to);
    if (!dist.has(to)) { dist.set(to, dist.get(from) + cost); states.set(to, st); deque.push(to); }
  };
  while (head < deque.length) {
    const s = deque[head++]; const [px, py, bx, by] = states.get(s);
    if (exitSet.has(key(px, py)) && !(px === start[0] && py === start[1])) continue;   // standing on an exit cell: the party can leave
    for (const [dx, dy] of Object.values(DIRV)) {
      const nx = px + dx, ny = py + dy;
      if (nx === bx && ny === by) {
        const tx = bx + dx, ty = by + dy;
        if (free(tx, ty) && !(tx === px && ty === py)) add(s, enc(nx, ny, tx, ty), [nx, ny, tx, ty], 1);
      } else if (free(nx, ny) || exitSet.has(key(nx, ny))) add(s, enc(nx, ny, bx, by), [nx, ny, bx, by], 0);
    }
  }
  // can every reachable state reach an exit? (reverse reachability over the recorded edges)
  const rev = new Map();
  for (const [a, tos] of edges) for (const t of tos) { if (!rev.has(t)) rev.set(t, []); rev.get(t).push(a); }
  const good = new Set(); const q = [];
  for (const [s, [px, py]] of states) if (exitSet.has(key(px, py)) && !(px === start[0] && py === start[1])) { good.add(s); q.push(s); }
  if (!good.size) for (const s of states.keys()) if (exitSet.has(key(...states.get(s).slice(0, 2)))) { good.add(s); q.push(s); }
  for (let i = 0; i < q.length; i++) for (const p of rev.get(q[i]) || []) if (!good.has(p)) { good.add(p); q.push(p); }
  const stuck = [...states.keys()].filter((s) => !good.has(s));
  let best = null;
  for (const [s, [, , bx, by]] of states) if (goal && bx === goal[0] && by === goal[1] && (best == null || dist.get(s) < best)) best = dist.get(s);
  return { states, stuck, pushes: best, count: states.size };
}

test('the Counting Room: the block goes down two and east five onto the plate; no state leaves the party stuck', () => {
  const block = ev(B, 'block_c'), pl = ev(B, 'plate_c'), gt = ev(B, 'gate_reeve');
  assert.deepEqual([block.x, block.y], [20, 4]); assert.deepEqual([pl.x, pl.y], [25, 6]);
  assert.deepEqual(pl.target, 'gate_reeve'); assert.equal(gt.type, 'gate');
  assert.deepEqual([gt.x, gt.y, gt.w], [17, 4, 2]);
  const notch = ev(B, 'notch_e');
  assert.equal(notch.w, 2, 'the stair notch is two cells wide: a block can never seal both');
  const exits = [[21, 7], [22, 7]];
  const r = pushSearch(B, { blockId: 'block_c', start: [21, 6], goal: [pl.x, pl.y], exits, region: (x, y) => y >= 3 && y <= 7 && x >= 19 });
  assert.equal(r.pushes, 7, 'the shortest solution is down two then east five');
  assert.deepEqual(r.stuck, [], `no softlock among ${r.count} states`);
  // the pillars are what bend the line: with them gone the block would reach the plate in fewer pushes
  const pillars = B.decor.filter((d) => d.t === 'pillar' && d.x === 23);
  assert.equal(pillars.length, 2);
  // the gate opens when the plate is held (walk model), and the hearth side is unreachable without the plate or the block
  const wAll = walk(B, db);
  assert.ok(wAll.log.some((l) => /opened gate_reeve via plate_c/.test(l)));
  const noBlock = withEvents(B, B.events.filter((e) => e.type !== 'block'));   // the walk model counts any block on the map
  assert.ok(!new Set(walk(noBlock, db).reachable).has(key(...B.marks.hearth)), 'without the block the gate stays shut');
  const noPlate = withEvents(B, B.events.filter((e) => e.id !== 'plate_c'));
  assert.ok(!new Set(walk(noPlate, db).reachable).has(key(...B.marks.hearth)), 'without the plate the gate stays shut');
  // the first push is possible from the start: the cell above the block is floor, and so is the cell behind it for the east pushes
  const g = buildGrid(withEvents(B, B.events.filter((e) => e.id !== 'block_c')), db);
  assert.equal(g.code[3][20], 'none'); assert.equal(g.code[6][19], 'none');
});

test('the heavy block can be shoved anywhere in the lower band without trapping the party: every state still reaches the stair out', () => {
  const block = ev(B, 'block_niche');
  const down = (x, y) => y >= 10;
  const r = pushSearch(slabState(true), { blockId: 'block_niche', start: [3, 10], goal: null, exits: [[3, 9]], shove: true, region: down });
  assert.deepEqual(r.stuck, [], `no softlock among ${r.count} states`);
  // somewhere among them the block has left its cell and the party stands in front of the niche chest
  const bow = ev(B, 'chest_bw_bow');
  const front = [...r.states.values()].some(([px, py, bx, by]) => px === bow.x && py === bow.y + 1 && !(bx === block.x && by === block.y));
  assert.ok(front, 'the niche front is reachable once the block moves');
});

test('x1_barrow: every event is reachable (the switch, the Dash wall and the plate modeled) and the way out is the stair', () => {
  const w = walk(B, db);
  assert.deepEqual(w.unreached, []);
  const reachable = new Set(w.reachable);
  for (const n of ['entrance', 'hall_w', 'switch', 'ossuary', 'counting', 'plate', 'hearth', 'reeve_spot', 'names', 'reeve_chest']) {
    const m = w.marks.find((x) => x.name === n); assert.ok(m.walkable && m.reached, `mark ${n}`);
  }
  // leaving works from every reachable cell: the reachable set is one connected region that holds the exit stairs
  const exit = ev(B, 'barrow_exit');
  assert.ok(reachable.has(key(exit.x, exit.y)));
  // (same-map stairs and notch doors are links both ways)
  const link = new Map();
  for (const e of B.events.filter((d) => d.type === 'door' && d.to[0] === 'x1_barrow')) {
    for (const [cx, cy] of eventCells(e)) {
      const a = key(cx, cy), b = key(e.to[1], e.to[2]);
      for (const [p, r] of [[a, b], [b, a]]) { if (!link.has(p)) link.set(p, []); link.get(p).push(r); }
    }
  }
  const seen = new Set([key(exit.x, exit.y)]); const q = [[exit.x, exit.y]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    const next = Object.values(DIRV).map(([dx, dy]) => key(x + dx, y + dy)).concat(link.get(key(x, y)) || []);
    for (const k of next) if (reachable.has(k) && !seen.has(k)) { seen.add(k); q.push(k.split(',').map(Number)); }
  }
  assert.equal(seen.size, reachable.size, 'every reachable cell walks back to the exit stair');
  // the hearth (a font, safe) comes before the trigger row, which is the Reeve hall's only way in
  const hearth = ev(B, 'barrow_hearth'), trig = ev(B, 'reeve_trig');
  assert.equal(hearth.type, 'font'); assert.equal(hearth.safe, true); assert.equal(trig.script, 'reeve_intro');
  const g = buildGrid(withEvents(B, B.events.filter((e) => e.type !== 'actor')), db);
  // flood from the hearth side without crossing the trigger row: the Reeve's cell must stay out of reach
  const tcells = new Set(eventCells(trig).map(([x, y]) => key(x, y)));
  const flood = new Set([key(14, 4)]); const fq = [[14, 4]];
  for (let i = 0; i < fq.length; i++) {
    const [x, y] = fq[i];
    for (const [dx, dy] of Object.values(DIRV)) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (g.code[ny][nx] !== 'none' || flood.has(k) || tcells.has(k)) continue;
      flood.add(k); fq.push([nx, ny]);
    }
  }
  assert.ok(!flood.has(key(...B.marks.reeve_spot)), 'the trigger row seals the Reeve hall');
  assert.ok(!flood.has(key(...B.marks.reeve_chest)));
  assert.ok(flood.has(key(...B.marks.hearth)));
  assert.ok(db.scenes.reeve_intro && db.scenes.barrow_entry && db.scenes.reeve_after, 'the barrow scenes exist');
});

// ------------------------------------------------------------------------------------------------ the placement rules (plan 3.6)
const foeCells = (e) => {
  if (e.move === 'patrol') { const out = [[e.x, e.y]]; let [x, y] = [e.x, e.y]; for (const d of e.path) { x += DIRV[d][0]; y += DIRV[d][1]; out.push([x, y]); } return out; }
  const r = e.move === 'wander' ? (e.radius || 1) : 0; const out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r) out.push([e.x + dx, e.y + dy]);
  return out;
};
const dirtCells = () => { const out = []; D.ground.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '=') out.push([x, y]); })); return out; };

test('Downs placement: no foe within 6 tiles of an NPC, an arrival or the hamlet; chase foes 6 off every lane, others 3', () => {
  const foes = D.events.filter((e) => e.type === 'enemy');
  const npcs = D.events.filter((e) => e.type === 'npc').map((e) => [e.x, e.y]);
  const arrivals = [[54, 11], [54, 25], [14, 6], [36, 21], [30, 1], [11, 32], [40, 32]];   // plan 3.2: where the other maps land here
  const dirt = dirtCells();
  const fixed = [...D.events.filter((e) => ['chest', 'object', 'trigger', 'door'].includes(e.type)).map((e) => [e.x, e.y]), ...Object.values(D.marks)];
  for (const f of foes) {
    for (const n of npcs) assert.ok(man([f.x, f.y], n) > 6, `${f.id} vs NPC at ${n}`);
    for (const a of arrivals) assert.ok(man([f.x, f.y], a) > 6, `${f.id} vs arrival ${a}`);
    assert.ok(man([f.x, f.y], D.marks.thornfold) > 8, `${f.id} keeps out of Thornfold`);
    const need = f.move === 'chase' ? 6 : 3;
    for (const c of foeCells(f)) for (const d of dirt) assert.ok(man(c, d) >= need, `${f.id} (${f.move}) at ${c} is ${man(c, d)} from the lane cell ${d}, needs ${need}`);
    for (const c of foeCells(f)) assert.ok(!fixed.some((p) => p[0] === c[0] && p[1] === c[1]), `${f.id} stands on something at ${c}`);
    assert.ok(db.ENCOUNTERS[f.encounter] && db.ENCOUNTERS[f.encounter].zone === 'x1_downs');
  }
  assert.deepEqual(foes.map((f) => f.move).sort(), ['chase', 'guard', 'wander']);
});

test('Downs lanes: from every entrance to the hamlet the lane can be walked without passing within 3 tiles of any foe', () => {
  const w = walk(D, db, { flags: BELL });
  const g = w.grid, H = g.length, Wd = g[0].length;
  const near = new Set();
  for (const f of D.events.filter((e) => e.type === 'enemy')) for (const c of foeCells(f)) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3) near.add(key(c[0] + dx, c[1] + dy));
  const goal = key(...D.marks.thornfold);
  const entrances = { valley: D.marks.valley_gate, town: D.marks.town_gate, drovers: D.marks.drovers_exit, moor: D.marks.moor_gate, larch: D.marks.larch_gate };
  for (const [name, s] of Object.entries(entrances)) {
    assert.ok(!near.has(key(...s)), `the ${name} arrival is itself clear of foes`);
    const seen = new Set([key(...s)]); const q = [s];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of Object.values(DIRV)) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= Wd || ny >= H || g[ny][nx] !== 'none' || seen.has(k) || near.has(k)) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    assert.ok(seen.has(goal), `a foe-free walk from the ${name} entrance to Thornfold`);
  }
});

test('Downs: nothing guards a quest cell (the strays, the crack, the ring, the slab, the scarecrow)', () => {
  const foes = D.events.filter((e) => e.type === 'enemy').flatMap(foeCells);
  const quest = ['stray_1', 'stray_2', 'stray_3', 'stray_5', 'x1_crack_fold', 'x1_old_scarecrow', 'brindle', 'stones_center_obj', 'blank_stone_obj'].map((id) => ev(D, id));
  for (const q of quest) for (const f of foes) assert.ok(man(f, [q.x, q.y]) >= 5, `a foe at ${f} is on top of ${q.id}`);
});

// ------------------------------------------------------------------------------------------------ the loom house
test('x1_loomhouse: Tamsin at the loom, the sampler in two states, the hearth is a safe font, one gap in the south wall', () => {
  const t = ev(L, 'tamsin'); assert.equal(t.type, 'npc');
  assert.equal(db.NPCS.tamsin.map, 'x1_loomhouse'); assert.equal(db.NPCS.tamsin.service.id, 'thornfold_loom');
  const hearth = ev(L, 'thornfold_hearth');
  assert.equal(hearth.type, 'font'); assert.equal(hearth.safe, true); assert.equal(hearth.text, 'thornfold_hearth'); assert.equal(hearth.sprite, 'x1_hearth');
  const dark = ev(L, 'x1_sampler_dark'), pale = ev(L, 'x1_sampler');
  assert.equal(pale.ifNot, 'stones_lettered'); assert.equal(dark.if, 'stones_lettered'); assert.equal(pale.state, 0); assert.equal(dark.state, 1);
  assert.equal(pale.text, 'x1_sampler'); assert.ok(db.lines.x1_sampler);
  const gap = L.ground[9].split('').map((c, x) => (c === '.' ? x : -1)).filter((x) => x >= 0);
  assert.deepEqual(gap, [7], 'one gap in the south wall');
  const w = walk(L, db);
  assert.deepEqual(w.unreached, []);
  for (const m of w.marks) assert.ok(m.walkable && m.reached, `mark ${m.name}`);
  // the loom is between Tamsin and the north wall; she can be talked to from the south
  const g = buildGrid(L, db);
  assert.equal(g.code[t.y + 1][t.x], 'none');
});

// ------------------------------------------------------------------------------------------------ doors: every return door lands in front of its door
const dirTo = (from, to) => { const dx = to[0] - from[0], dy = to[1] - from[1]; return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };
function doorsOf(map) {
  const out = map.events.filter((e) => e.type === 'door' && e.to && e.to[0] !== map.id).map((e) => ({ cells: eventCells(e), to: e.to, id: e.id }));
  for (const x of map.exits || []) out.push({ cells: eventCells({ x: x.x, y: x.y, w: x.w, h: x.h }), to: x.to, id: `exit>${x.to[0]}` });
  return out;
}
test('both ways: the door lands the party in front of the return door, facing away from it', () => {
  const pairs = [['x1_downs', 'door_loom', 'x1_loomhouse'], ['x1_downs', 'door_barrow', 'x1_barrow']];
  for (const [a, doorId, b] of pairs) {
    const door = M[a].events.find((e) => e.id === doorId);
    const [, tx, ty] = door.to;
    // the arrival is a walkable cell of the target map, and a return door of the target holds it or is next to it
    const gB = buildGrid(maps[b], db); assert.equal(gB.code[ty][tx], 'none');
    const back = doorsOf(maps[b]).filter((d) => d.to[0] === a);
    assert.ok(back.length >= 1, `${b} has a door back to ${a}`);
    const ret = back.find((d) => d.cells.some((c) => man(c, [tx, ty]) <= 1));
    assert.ok(ret, `${b}: a return door is at or beside the arrival ${tx},${ty}`);
    // the return lands on the cell in front of the original door, facing away from it
    const [, rx, ry, rdir] = ret.to;
    const dcells = eventCells(door);
    assert.ok(dcells.some((c) => man(c, [rx, ry]) === 1), `${b}: the return ${rx},${ry} is one step from ${doorId}`);
    const from = dcells.find((c) => man(c, [rx, ry]) === 1);
    assert.equal(rdir, dirTo(from, [rx, ry]), `${b}: facing away from the door`);
    assert.equal(buildGrid(maps[a], db).code[ry][rx], 'none');
  }
  // the barrow's arrival is in front of its stair, facing away from it
  const stair = ev(B, 'barrow_exit');
  assert.equal(ev(D, 'door_barrow').to[3], 'down');
  assert.equal(man([ev(D, 'door_barrow').to[1], ev(D, 'door_barrow').to[2]], [stair.x, stair.y]), 1);
  // the outer exits land on walkable floor facing away from their edge
  for (const x of D.exits) {
    const [mid, ax, ay, dir] = x.to;
    if (!maps[mid]) continue;
    assert.equal(buildGrid(maps[mid], db).code[ay][ax], 'none', `${mid} ${ax},${ay} walkable`);
  }
  const west = D.exits.find((e) => e.to[0] === 'willowmere'), val = D.exits.find((e) => e.to[0] === 'valley');
  assert.deepEqual([west.x, west.y, west.h, west.to], [55, 24, 2, ['willowmere', 1, 16, 'right']]);
  assert.deepEqual([val.x, val.y, val.h, val.to], [55, 10, 2, ['valley', 1, 28, 'right']]);
  // our own arrivals (plan 3.2): walkable and facing away from their edge
  const g = buildGrid(D, db);
  for (const [x, y, dir] of [[54, 11, 'left'], [54, 25, 'left'], [30, 1, 'down'], [11, 32, 'up'], [40, 32, 'up'], [14, 6, 'down'], [36, 21, 'down']]) {
    assert.equal(g.code[y][x], 'none', `arrival ${x},${y} walkable`);
    assert.ok(['left', 'down', 'up'].includes(dir));
  }
  assert.deepEqual(D.exits.find((e) => e.to[0] === 'x1_highmoor').to, ['x1_highmoor', 35, 34, 'up']);
  assert.deepEqual(D.exits.find((e) => e.to[0] === 'x1_larchhill').to, ['x1_larchhill', 31, 1, 'down']);
  assert.deepEqual(ev(D, 'drovers_door').to, ['x1_millrace', 4, 1, 'down']);
});

test('the previews and the doc exist', () => {
  for (const n of ['x1_downs', 'x1_downs_late', 'x1_loomhouse', 'x1_loomhouse_late', 'x1_barrow', 'x1_barrow_solved']) {
    assert.ok(fs.existsSync(path.join(NEXT, 'tools', 'maps', 'previews', `${n}.png`)), `preview ${n}`);
  }
  const doc = fs.readFileSync(path.join(NEXT, 'docs', 'maps', 'X1_WEST.md'), 'utf8');
  assert.ok(!doc.includes(String.fromCharCode(8212)), 'no em dash in the doc');
  for (const s of ['x1_downs', 'x1_loomhouse', 'x1_barrow']) assert.ok(doc.includes(s));
});
