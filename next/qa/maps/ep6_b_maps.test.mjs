// Episode 6 maps, part B (E6-maps-b, EPISODE6_PLAN 4.4 to 4.10, 5.1): the Storm Observatory's three floors, the Scribe's
// Eyrie and the Cloud Library. The gust lane rule is the pack's own (src/data/ep6/field/wind.js); the whole-map state search
// and the authoring and softlock rules are tools/maps/ep6_check.mjs (validate runs it). This file adds: the plan tables (enemy
// plans, vanes, posts, named events), the STAGING_EP6 marks (present, on ground, off every lane), each puzzle's start state
// blocking and its intended solution opening it (a search with the vane state held fixed: no toggles), every chest reachable,
// and the critical path from the Airstair's foot through the town and the Observatory to the library and back to the town,
// plus the F2 lift down to F1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadAll, loadDb, validate, buildGrid, walk, eventCells } from '../../tools/maps/mapcheck.mjs';
import { compile, follow, live, DXY } from '../../src/data/ep6/field/wind.js';

await (await import('../../src/data/ep6/index.js')).register();
const db = await loadDb();
const MINE = ['ep6_obs_f1', 'ep6_obs_f2', 'ep6_obs_f3', 'ep6_obs_eyrie', 'ep6_library'];
const maps = await loadAll();
const { EP6_ZONES } = await import('../../src/data/ep6/encounters.js');
const k = (x, y) => `${x},${y}`;
const byId = (m, id) => m.events.find((e) => e.id === id);

// ------------------------------------------------------------------------------------------------ a fixed-state search
/**
 * The cells the party reaches from `from` with the lanes held in state `mask` (bit k: group k turned), no vane turned.
 * Steps onto ground; a step onto a live lane cell is its whole ride (wind.js follow); same-map doors and pits land.
 * Every breakable counts as broken, every locked door as shut; `lantern` reveals faint bridges.
 */
function reach(m, from, mask = 0, { lantern = false } = {}) {
  const model = compile(m);
  const grid = buildGrid(m, db);
  const W = grid.W, H = grid.H;
  const A = model ? live(model, mask) : null;
  const lane = (x, y) => !!model && model.anyLane[y * W + x];
  const evAt = new Map();
  for (const e of m.events) for (const [x, y] of eventCells(e)) { if (!evAt.has(k(x, y))) evAt.set(k(x, y), []); evAt.get(k(x, y)).push(e); }
  const code = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return 'solid';
    if (lane(x, y)) return 'void';
    let c = grid.code[y][x];
    if (grid.faint[y][x] && lantern) c = 'none';
    for (const e of evAt.get(k(x, y)) || []) {
      if (e.type === 'object' && e.breakable) c = 'none';
      if (e.type === 'vane') c = 'solid';
      if (e.type === 'enemy') c = 'none';
    }
    return c;
  };
  const blocked = (x, y, isLane) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return true;
    if (isLane) return (evAt.get(k(x, y)) || []).some((e) => ['npc', 'vane', 'chest', 'object'].includes(e.type));
    return code(x, y) !== 'none';
  };
  const seen = new Set([k(...from)]);
  const q = [from];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of DXY) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      let to = null;
      if (A && A[ny * W + nx] >= 0) {
        if (blocked(nx, ny, true)) continue;
        const r = follow(model, { turned: model.groups.filter((_, i) => mask & (1 << i)) }, [nx, ny], blocked);
        to = r.path[r.path.length - 1];
      } else {
        const c = code(nx, ny);
        if (c === 'pit' && m.pitTo && m.pitTo[0] === m.id) to = [m.pitTo[1], m.pitTo[2]];
        else if (c === 'none') to = [nx, ny];
      }
      if (to && !seen.has(k(...to))) { seen.add(k(...to)); q.push(to); }
    }
  }
  return seen;
}
const touches = (set, e) => eventCells(e).some(([x, y]) => [[0, 0], ...DXY].some(([dx, dy]) => set.has(k(x + dx, y + dy))));
const maskOf = (m, groups) => groups.reduce((a, g) => a | (1 << compile(m).groups.indexOf(g)), 0);

// ------------------------------------------------------------------------------------------------ the maps are clean
test('my five maps validate clean (mapcheck with the ep6 pack: authoring, softlock and reload rules included)', () => {
  for (const id of MINE) {
    assert.ok(maps[id], `${id} exists`);
    const r = validate(maps[id], db, maps);
    assert.deepEqual(r.errors, [], `${id}: ${r.errors.join('; ')}`);
    assert.deepEqual(r.warnings, [], `${id} warnings`);
  }
});

test('the plan tables: enemy plans, vanes and posts, named events', () => {
  for (const id of ['ep6_obs_f1', 'ep6_obs_f2', 'ep6_obs_f3']) {
    const m = maps[id];
    const counts = {};
    for (const e of m.events) if (e.type === 'enemy') counts[e.encounter] = (counts[e.encounter] || 0) + 1;
    for (const [enc, n] of EP6_ZONES[id].plan) if (enc !== 'gale_engine') assert.equal(counts[enc] || 0, n, `${id} ${enc}`);
    assert.ok(m.events.filter((e) => e.type === 'vane').length <= 3, `${id} at most 3 vanes`);
  }
  const need = {
    ep6_obs_f1: ['vane_c', 'vane_e', 'mo_d', 'chest_key', 'memory1_trig', 'lift_trig', 'lift_up', 'font_w1', 'to_zephyr'],
    ep6_obs_f2: ['vane_b1', 'vane_b2', 'vane_d', 'locker_obj', 'memory2_trig', 'vex_trig', 'engine_trig', 'lift_trig', 'lift_up',
      'lift_f2_short', 'font_w2', 'font_w2b', 'log_1', 'log_2', 'log_3', 'chest_locker', 'gale_engine'],
    ep6_obs_f3: ['mo_anchor', 'mo_return', 'vane_listen', 'vane_r_e', 'vane_r_w', 'lamp_anchor', 'lamp_listen', 'lamp_return',
      'fall_trig', 'beacon_trig', 'door_scribe', 'font_w3', 'beacon_font', 'chest_spear'],
    ep6_obs_eyrie: ['scribe', 'scribe_trig', 'kestrel_up', 'aeris_t', 'eyrie_enter'],
    ep6_library: ['first_shelf', 'kestrel_down', 'library_enter'],
  };
  for (const [id, ids] of Object.entries(need)) for (const e of ids) assert.ok(byId(maps[id], e), `${id}: ${e}`);
  assert.equal(byId(maps.ep6_obs_f1, 'chest_key').item, 'compass_key');
  assert.equal(byId(maps.ep6_obs_f1, 'chest_key').flag, 'compass_key_found');
  assert.equal(byId(maps.ep6_obs_f2, 'gale_engine').ifNot, 'engine_defeated');
  assert.equal(byId(maps.ep6_obs_f3, 'door_scribe').key, 'compass_key');
  for (const n of ['anchor', 'listen', 'return']) assert.equal(byId(maps.ep6_obs_f3, `lamp_${n}`).script, `pledge_${n}`);
});

// ------------------------------------------------------------------------------------------------ staging
test('every STAGING_EP6 mark of my maps exists; staging and wait marks stand on ground, off every lane', () => {
  const md = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP6.md'), 'utf8');
  const PAN_ONLY = new Set(['relay_old', 'crown', 'desk', 'engine_spot', 'shelf', 'kestrel_berth', 'spire_top', 'feather_spot',
    'vex_hang', 'post_d', 'anchor', 'listen', 'return', 'relay_manifest', 'kestrel_rim', 'pippa_spot', 'vex_spot', 'vex_shelf']);
  for (const id of MINE) {
    const m = maps[id];
    const line = md.split('\n').find((l) => l.startsWith('### `' + id + '`'));
    const marks = [...line.slice(line.indexOf('(')).matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]);
    const bare = buildGrid({ ...m, events: [] }, db);
    const model = compile(m);
    for (const name of marks) {
      const at = m.marks[name];
      assert.ok(at, `${id}: mark ${name}`);
      const [x, y] = at;
      if (model) assert.ok(!model.anyLane[y * bare.W + x] || name === 'vex_hang' || name === 'post_d', `${id}: ${name} is off every lane`);
      if (!PAN_ONLY.has(name)) assert.equal(bare.code[y][x], 'none', `${id}: ${name} (${x},${y}) stands on ground`);
    }
  }
  // CRITIQUE_7 item 8: two clear rows between Vex and the party; nobody off the edge on the rope
  const f2 = maps.ep6_obs_f2.marks, f3 = maps.ep6_obs_f3.marks;
  assert.equal(f2.party_stop[1] - f2.vex_spot[1], 3, 'F2: party_stop two clear rows below vex_spot');
  assert.equal(f3.party_stop_fall[1] - f3.vex_edge[1], 3, 'F3: party_stop_fall two clear rows below vex_edge');
  const g3 = buildGrid({ ...maps.ep6_obs_f3, events: [] }, db);
  assert.equal(g3.code[f3.bram_line[1]][f3.bram_line[0]], 'none', 'bram_line on the causeway');
  assert.equal(g3.code[f3.vex_hang[1]][f3.vex_hang[0]], 'void', 'vex_hang over cloud');
  for (const [m, block] of [[maps.ep6_obs_f2, ['vex_spot', 'party_stop', 'party_stop_m', 'party_stop_b']],
    [maps.ep6_obs_f3, ['vex_edge', 'party_stop_fall', 'party_stop_fall_m', 'party_stop_fall_b', 'bram_line']]]) {
    for (const e of m.events.filter((x) => x.type === 'enemy')) {
      const cells = [[e.x, e.y]];
      let [x, y] = [e.x, e.y];
      for (const d of e.path || []) { const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]; x += dx; y += dy; cells.push([x, y]); }
      for (const b of block) assert.ok(!cells.some(([cx, cy]) => Math.abs(cx - m.marks[b][0]) + Math.abs(cy - m.marks[b][1]) <= 1),
        `${m.id}: foe ${e.id} keeps off the staging cell ${b}`);
    }
  }
  // Aeris waits beside each lamp, never on it
  for (const n of [1, 2, 3]) {
    const lampId = ['lamp_anchor', 'lamp_listen', 'lamp_return'][n - 1];
    const L = byId(maps.ep6_obs_f3, lampId), w = f3[`aeris_wait_${n}`];
    assert.equal(Math.abs(L.x - w[0]) + Math.abs(L.y - w[1]), 1, `aeris_wait_${n} beside ${lampId}`);
  }
});

// ------------------------------------------------------------------------------------------------ puzzles
test('F1: where you step in decides where you land; the first vane; the post reached only from the west', () => {
  const m = maps.ep6_obs_f1, A = maskOf(m, ['a']);
  const s0 = reach(m, [21, 27], 0);
  assert.ok(s0.has(k(12, 12)), 'B: the west arm lands on the north deck');
  assert.ok(s0.has(k(24, 19)), 'B: the south arm lands on the east spur');
  assert.ok(touches(s0, byId(m, 'vane_c')), 'C: vane_c is reached in the authored state');
  assert.ok(!s0.has(k(29, 7)), 'C: the relay deck is shut in the authored state');
  assert.ok(!s0.has(k(21, 5)) && !s0.has(k(18, 3)), 'D and E are shut in the authored state');
  const sa = reach(m, [34, 7], A);
  assert.ok(sa.has(k(29, 7)), 'C: turned, the lane carries the party to the relay deck');
  assert.ok(sa.has(k(7, 7)), 'D: turned, the Run carries it on to the west deck');
  assert.ok(!sa.has(k(21, 5)) && !sa.has(k(18, 6)), 'D: turned, the Run passes the key balcony without stopping');
  const sw = reach(m, [7, 7], 0);
  assert.ok(sw.has(k(18, 6)), 'D: from the west, the post catches the party');
  assert.ok(touches(sw, byId(m, 'chest_key')), 'D: the Sky Compass Key from the balcony');
  assert.ok(sw.has(k(18, 3)) && touches(sw, byId(m, 'lift_up')), 'E: north from the post to the upper deck and the lift');
  assert.ok(sw.has(k(21, 27)), 'from the west deck, home to the alcove in the authored state');
  const se = reach(m, [12, 2], maskOf(m, ['b']));
  assert.ok(touches(se, byId(m, 'chest_letter2')), 'E: vane_e opens the dead-end deck');
  assert.ok(!touches(reach(m, [12, 2], 0), byId(m, 'chest_letter2')), 'E: the dead-end deck is shut until vane_e turns');
});

test('F2: the two fans, one order; the side fan the main route leaves alone', () => {
  const m = maps.ep6_obs_f2, a = maskOf(m, ['a']), ab = maskOf(m, ['a', 'b']), c = maskOf(m, ['c']);
  const s0 = reach(m, [6, 26], 0);
  assert.ok(touches(s0, byId(m, 'vane_b1')), 'vane_b1 is reached from the stair foot');
  assert.ok(!s0.has(k(14, 18)), 'the south-east platform is shut until vane_b1 turns');
  const sa = reach(m, [6, 26], a);
  assert.ok(sa.has(k(14, 18)) && touches(sa, byId(m, 'vane_b2')), 'turned, b1 duct reaches fan b2');
  assert.ok(!sa.has(k(18, 13)), 'the manifest platform is shut until vane_b2 turns');
  const sab = reach(m, [6, 26], ab);
  assert.ok(sab.has(k(18, 13)) && sab.has(k(18, 7)), 'b2 duct to the manifest relay and on into the crown room');
  assert.ok(touches(sab, byId(m, 'vex_trig')) && touches(sab, byId(m, 'engine_trig')), 'the crown relay and the bellows hall');
  assert.ok(!sab.has(k(34, 11)), 'the locker ledge is shut in the main route\'s states');
  assert.ok(reach(m, [30, 9], ab | c).has(k(34, 11)), 'vane_d turned: the side duct to the locker ledge');
  for (const mask of [0, a, ab, ab | c, c]) assert.ok(reach(m, [18, 7], mask).has(k(6, 26)), `from the crown room home in state ${mask}`);
  // the north-west platform's chest is an out-and-back from the manifest platform (PLAYTEST_REVIEW_8 item 3): one ride west,
  // one ride back east, in every state, never home and through the fans again
  for (const mask of [0, a, ab, ab | c]) {
    const nw = reach(m, [10, 12], mask);
    assert.ok(nw.has(k(14, 11)) && nw.has(k(18, 13)), `from the north-west platform back to the manifest platform in state ${mask}`);
  }
});

test('F3: a ring and a post; a ring that turns; two halves of one ring; the hidden Keeper bridge', () => {
  const m = maps.ep6_obs_f3, a = maskOf(m, ['a']), b = maskOf(m, ['b']), c = maskOf(m, ['c']);
  const s0 = reach(m, [18, 35], 0);
  assert.ok(s0.has(k(17, 27)) && s0.has(k(17, 26)), 'Anchor: the ring carries the party to the post and the deck');
  assert.ok(touches(s0, byId(m, 'vane_listen')), 'vane_listen reached in the authored state');
  assert.ok(!s0.has(k(17, 18)) && !s0.has(k(17, 19)), 'Listen: clockwise, the post is never reached');
  const sa = reach(m, [18, 35], a);
  assert.ok(sa.has(k(17, 19)) && sa.has(k(17, 16)), 'Listen: counter-clockwise, the post and the deck');
  assert.ok(!sa.has(k(17, 7)), 'Return: the stone is shut with the west half blowing down');
  assert.ok(!reach(m, [18, 35], a | b).has(k(22, 10)), 'Return: the east half alone never reaches the far post');
  const sac = reach(m, [18, 35], a | c);
  assert.ok(sac.has(k(17, 7)) && !sac.has(k(21, 10)), 'Return: the west half up reaches the stone, not the post');
  const sabc = reach(m, [18, 35], a | b | c);
  assert.ok(sabc.has(k(21, 10)) && sabc.has(k(22, 10)), 'Return: both halves the same way, a full circuit to the far post');
  assert.ok(touches(sabc, byId(m, 'door_scribe')) && touches(sabc, byId(m, 'beacon_trig')), 'the beacon platform and the keyhole');
  for (const mask of [0, a, a | c, a | b | c, b, c]) {
    for (const from of [[17, 16], [22, 10], [17, 4], [17, 26]]) {
      const r = reach(m, from, mask);
      if (r.size > 1) assert.ok(r.has(k(18, 35)) || touches(r, byId(m, 'lift_down')), `home from ${from} in state ${mask}`);
    }
  }
  assert.ok(!touches(reach(m, [11, 22], a), byId(m, 'chest_spear')), 'the spear needs the Lantern');
  assert.ok(touches(reach(m, [11, 22], a, { lantern: true }), byId(m, 'chest_spear')), 'the Lantern bridge to the spear');
});

test('every chest of my maps is reachable in some state (the Lantern for the spear, the key for the keyhole)', () => {
  for (const id of MINE) {
    const r = walk(maps[id], db, { lantern: true, keys: ['compass_key'] });
    const seen = new Set(r.events.filter((e) => e.reached).map((e) => e.id));
    for (const e of maps[id].events.filter((x) => x.type === 'chest')) assert.ok(seen.has(e.id), `${id}: ${e.id}`);
  }
});

// ------------------------------------------------------------------------------------------------ the critical path
/** Does the search from `start` on `id` reach a door (or exit) to `target`? Returns that door's landing [map, x, y]. */
function doorTo(id, start, target, opts = {}) {
  const m = maps[id];
  const r = walk(m, db, { start, keys: ['compass_key', 'windward_pass'], ...opts });
  const cells = new Set(r.reachable);
  for (const e of m.events) {
    if (!Array.isArray(e.to) || e.to[0] !== target) continue;
    if (eventCells(e).some(([x, y]) => cells.has(k(x, y)) || DXY.some(([dx, dy]) => cells.has(k(x + dx, y + dy)) && ['locked_door', 'gate'].includes(e.type)))) return e.to;
  }
  for (const x of m.exits || []) if (x.to[0] === target && cells.has(k(x.x, x.y))) return x.to;
  return null;
}

test('the critical path: the Airstair foot, the town, F1 to the Eyrie, the library and back to the town; the F2 lift to F1', () => {
  const legs = [];
  const air = maps.ep6_airstair, zep = maps.ep6_zephyr;
  if (air && zep) {
    const t1 = doorTo('ep6_airstair', [air.start.x, air.start.y], 'ep6_zephyr');
    assert.ok(t1, 'the Airstair reaches Zephyr Landing');
    legs.push(['ep6_zephyr', t1]);
    const t2 = doorTo('ep6_zephyr', [t1[1], t1[2]], 'ep6_obs_f1');
    assert.ok(t2, 'Zephyr Landing reaches the east airstair to F1');
    assert.deepEqual(t2.slice(1, 3), [21, 27], 'the east airstair lands in the Recovery Alcove');
  }
  const chain = [['ep6_obs_f1', [21, 27], 'ep6_obs_f2'], ['ep6_obs_f2', null, 'ep6_obs_f3'], ['ep6_obs_f3', null, 'ep6_obs_eyrie'],
    ['ep6_obs_eyrie', null, 'ep6_library'], ['ep6_library', null, 'ep6_zephyr']];
  let at = null;
  for (const [id, start, next] of chain) {
    const from = start || [at[1], at[2]];
    const to = doorTo(id, from, next);
    assert.ok(to, `${id} from ${from} reaches ${next}`);
    if (maps[next]) {
      const g = buildGrid(maps[next], db);
      assert.equal(g.code[to[2]][to[1]], 'none', `${id} -> ${next} lands on ground (${to[1]},${to[2]})`);
      const model = compile(maps[next]);
      if (model) assert.ok(!model.anyLane[to[2] * g.W + to[1]], `${id} -> ${next} lands off every lane`);
    }
    at = to;
  }
  assert.ok(doorTo('ep6_obs_f2', [24, 16], 'ep6_obs_f1'), 'the F2 lift down to F1 (lift_f2_short) from the bellows hall');
  assert.deepEqual(byId(maps.ep6_obs_f2, 'lift_f2_short').to.slice(0, 3), ['ep6_obs_f1', 21, 27]);
  assert.equal(byId(maps.ep6_obs_f2, 'lift_f2_short').if, 'obs_f2_done');
  assert.ok(doorTo('ep6_obs_f3', [18, 35], 'ep6_obs_f2'), 'F3 lift down to F2');
  assert.ok(doorTo('ep6_obs_f1', [21, 27], 'ep6_zephyr'), 'F1 alcove back to the town');
  // the shortcut's way back up (PLAYTEST_REVIEW_8 item 2): F1's alcove lift to F2's Bellows Hall once obs_f2_done
  const back = byId(maps.ep6_obs_f1, 'lift_f2_back');
  assert.deepEqual(back.to.slice(0, 3), ['ep6_obs_f2', 25, 15]);
  assert.equal(back.if, 'obs_f2_done');
  const up = doorTo('ep6_obs_f1', [21, 27], 'ep6_obs_f2');
  assert.ok(up, 'the alcove reaches a lift up to F2');
  const f2 = buildGrid(maps.ep6_obs_f2, db), f2m = compile(maps.ep6_obs_f2);
  assert.equal(f2.code[15][25], 'none', 'the alcove lift lands on ground in the Bellows Hall');
  assert.ok(!f2m.anyLane[15 * f2.W + 25], 'and off every duct');
  assert.ok(reach(maps.ep6_obs_f2, [25, 15], 0).has(k(25, 14)) && reach(maps.ep6_obs_f2, [25, 15], 0).has(k(24, 14)),
    'from the landing both lifts (down to F1, up to F3) are one step away');
});
