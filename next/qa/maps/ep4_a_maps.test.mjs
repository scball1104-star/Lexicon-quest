// Episode 4 maps, part A (E4-maps-a, EPISODE4_PLAN 3, 4.1 to 4.3, 4.9): the Emberpeak and Coal Lantern Inn patches, the
// Flood Road, Valewyn and its four interiors. The water is modeled by the pack's own rule (src/data/ep4/field/tide.js): a
// state is a level per basin; the map is walked frozen at that state (water cells, grounded or floating pontoons, wheels
// and posts as solid stands). The whole-map state search is tools/maps/ep4_check.mjs (validate below runs it).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadAll, loadDb, validate, walk, loadStaging } from '../../tools/maps/mapcheck.mjs';
import { classify } from '../../src/data/ep4/field/tide.js';

await (await import('../../src/data/ep4/index.js')).register();
const db = await loadDb();
const MINE = ['ep4_flood_road', 'ep4_valewyn', 'ep4_vw_inn', 'ep4_vw_shop', 'ep4_vw_forge', 'ep4_vw_palace'];
const maps = await loadAll();
const staging = loadStaging();
const P = await import('../../src/data/maps/ep4_patches.js');
const emberpeak = (await import('../../src/data/maps/ep3/emberpeak.js')).default;
const pkInn = (await import('../../src/data/maps/ep3/pk_inn.js')).default;
const EP3_DONE = ['ep3_complete', 'pk_restored', 'pk_arrived', 'met_veyra', 'met_ilya', 'foundry_entered', 'ep2_complete', 'ep1_complete'];
const { EP4_LINES, EP4_BOOKS } = await import('../../src/data/ep4/text.js');
const { EP4_NPCS } = await import('../../src/data/ep4/npcs.js');
const { EP4_ZONES } = await import('../../src/data/ep4/encounters.js');

const byId = (m, id) => m.events.find((e) => e.id === id);
const key = (x, y) => `${x},${y}`;

/** The map frozen at a tide state (levels per basin): plain cells and solid stands, no `tide` block (so walk() is plain). */
function frozen(m, levels) {
  const c = classify(m, { levels });
  const W = m.ground[0].length;
  const rows = m.ground.map((r) => r.split(''));
  for (const i of c.flooded) rows[Math.floor(i / W)][i % W] = '¤';
  const events = [];
  for (const e of m.events) {
    if (e.type === 'tidewheel' || e.type === 'tidepost') { events.push({ ...e, type: 'object' }); continue; }
    if (e.type === 'pontoon') { if (c.grounded.has(e.y * W + e.x)) events.push({ ...e, type: 'object' }); continue; }
    events.push(e);
  }
  const { tide, ...rest } = m;
  return { ...rest, legend: { ...m.legend, '¤': 'tide_water' }, ground: rows.map((r) => r.join('')), events };
}
const reach = (m, levels, opts = {}) => new Set(walk(frozen(m, levels), db, opts).reachable);

// ------------------------------------------------------------------------------------------------ the patches
test('withEastRoad keeps every Episode 3 cell, mark and event, and only adds', () => {
  const p = P.withEastRoad(emberpeak);
  assert.notEqual(p, emberpeak);
  assert.deepEqual(p.ground, emberpeak.ground);
  for (const [k, v] of Object.entries(emberpeak.marks)) assert.deepEqual(p.marks[k], v, `mark ${k}`);
  for (const e of emberpeak.events) {
    const q = byId(p, e.id);
    assert.ok(q, `event ${e.id} kept`);
    if (e.id === 'east_road_sign') assert.deepEqual({ ...q, text: e.text }, e);
    else assert.deepEqual(q, e, `event ${e.id} unchanged`);
  }
  for (const o of emberpeak.overlays) assert.ok(p.overlays.includes(o));
  for (const id of ['east_road_trig', 'rope_ladder', 'east_road_down', 'ep4_wake_pk']) assert.ok(byId(p, id), id);
  assert.equal(P.withEastRoad(p), p, 'idempotent');
  // the sign's last two states are Episode 3's east_road_sign, word for word
  const ep4 = EP4_LINES.east_road_sign_ep4;
  assert.deepEqual(ep4.slice(-2).map((s) => s.lines), [['The east road. Flooded past the ridge.', 'Someone has scratched a bell and an arrow under it.'], 'The east road. Flooded past the ridge.']);
  const w = P.withEp4Wake(pkInn);
  assert.deepEqual(w.ground, pkInn.ground);
  assert.ok(byId(w, 'ep4_wake') && byId(w, 'ep4_wake').on === 'enter' && byId(w, 'ep4_wake').script === 'ep4_morning');
  for (const m of ['inn_bed', 'ada_hearth', 'garrick_door']) assert.ok(w.marks[m], m);
});

test('Emberpeak with Episode 3 complete and EP4_LIVE off: the washout is shut and nothing of Episode 4 fires', async () => {
  const { EP4_LIVE } = await import('../../src/game/episodes.js');
  const p = P.withEastRoad(emberpeak);
  const ep3 = new Set(walk(emberpeak, db, { flags: EP3_DONE }).reachable);
  const off = walk(p, db, { flags: EP3_DONE });
  const got = new Set(off.reachable);
  assert.deepEqual([...got].sort(), [...ep3].sort(), 'the patched map walks exactly as Episode 3 shipped');
  for (const [x, y] of [[38, 14], [38, 15], [39, 15]]) assert.ok(!got.has(key(x, y)), `${x},${y} is water`);
  // with the switch off nothing sets ep4_started, so the trigger and the door are absent
  if (!EP4_LIVE) {
    const flags = new Set(EP3_DONE);
    const live = (e) => [].concat(e.if || []).every((f) => flags.has(f)) && ![].concat(e.ifNot || []).some((f) => flags.has(f));
    for (const id of ['east_road_trig', 'rope_ladder', 'east_road_down']) assert.ok(!live(byId(p, id)), `${id} absent`);
  }
  // the ep4 pack registers the patched modules over the ep3 ones
  const { peekMap } = await import('../../src/world/maps.js');
  await (await import('../../src/data/ep4/maps.js')).register();
  assert.ok(peekMap('emberpeak').events.some((e) => e.id === 'east_road_trig'));
  assert.ok(peekMap('pk_inn').events.some((e) => e.id === 'ep4_wake'));
});

test('Emberpeak with east_road_open: the drop is reachable and climbs down to the Flood Road', () => {
  const p = P.withEastRoad(emberpeak);
  const flags = [...EP3_DONE, 'ep4_started', 'east_road_open'];
  const r = new Set(walk(p, db, { flags }).reachable);
  for (const [x, y] of [[36, 14], [38, 14], [38, 15], [39, 15]]) assert.ok(r.has(key(x, y)), `${x},${y}`);
  const d = byId(p, 'east_road_down');
  assert.deepEqual(d.to, ['ep4_flood_road', 1, 15, 'right']);
  const road = maps.ep4_flood_road;
  assert.ok(road.exits.some((x) => x.to[0] === 'emberpeak' && x.to[1] === 37 && x.to[2] === 15));
  assert.ok(r.has(key(37, 15)), 'the road exit lands on a reachable Emberpeak cell');
});

// ------------------------------------------------------------------------------------------------ validation
test('every map of part A validates (ids, lines, NPC records, enemy plan, the tide search) and every chest is reached', () => {
  for (const id of MINE) {
    const r = validate(maps[id], db, maps, { staging });
    // the Keep ferry's target is E4-maps-b's ep4_keep_f1 (same wave): tolerated only while that file does not exist
    const errs = r.errors.filter((e) => !(/target map ep4_keep_f1 not found/.test(e) && !fs.existsSync(path.join(NEXT, 'src', 'data', 'maps', 'ep4_keep_f1.js'))));
    assert.deepEqual(errs, [], id);
    const un = (r.walk && r.walk.unreached) || [];
    const chests = maps[id].events.filter((e) => e.type === 'chest').map((e) => e.id);
    for (const c of chests) assert.ok(!un.includes(c), `${id}: chest ${c} reached`);
  }
  // the patched Emberpeak validates too
  const pr = validate(P.withEastRoad(emberpeak), db, { ...maps, emberpeak: P.withEastRoad(emberpeak) }, { staging });
  assert.deepEqual(pr.errors, []);
});

test('the Flood Road plan: enemies, chests, marks, named events', () => {
  const m = maps.ep4_flood_road;
  const plan = Object.fromEntries(EP4_ZONES.ep4_flood_road.plan);
  const got = {};
  for (const e of m.events.filter((x) => x.type === 'enemy')) got[e.encounter] = (got[e.encounter] || 0) + 1;
  assert.deepEqual(got, plan);
  assert.equal(byId(m, 'chest_punt').item, 'hi_potion');
  assert.equal(byId(m, 'chest_grotto_fr').tier, 'iron');
  for (const id of ['e_e4r_first', 'wh_lane', 'pt_lane', 'post_lane', 'ferry_fire', 'hale', 'nilo', 'first_fight_trig', 'lane_trig', 'vw_view_trig', 'ferry_vw']) assert.ok(byId(m, id), id);
  for (const mk of ['entry', 'lane', 'fire', 'hale_spot', 'nilo_spot', 'bluff', 'valewyn_far', 'ferry']) assert.ok(m.marks[mk], mk);
  assert.equal(byId(m, 'ferry_fire').rest, true);
  assert.equal(byId(m, 'ferry_vw').if, 'saw_valewyn');
  assert.equal(m.tide.basins.l.levels, 2);
  assert.equal(m.tide.basins.l.start, 1);
  // first_fight_trig covers every passable cell of column 7
  const r = reach(m, { l: 1 });
  const t = byId(m, 'first_fight_trig');
  for (let y = 0; y < m.ground.length; y++) if (r.has(key(7, y))) assert.ok(y >= t.y && y < t.y + t.h, `column 7 row ${y} under the trigger`);
});

test('the drowned lane: shut at mid, open at low, the punt chest needs the drain and then the raise', () => {
  const m = maps.ep4_flood_road;
  const START = [1, 15], STAND = [15, 13], PLOT = [15, 10], EAST = [40, 16], FERRY = [48, 16];
  // at the start level the road ends at the water; the stand and the plot are out of reach
  const mid = reach(m, { l: 1 }, { start: START });
  for (const c of [EAST, STAND, PLOT]) assert.ok(!mid.has(key(...c)), `start, mid: ${c} not reached`);
  assert.ok(mid.has('13,13'), 'the road apron faces wh_lane at the start level');
  // drained: the road goes on east and the stand is reached by its stair; the punt is aground, so the plot is not
  const low = reach(m, { l: 0 }, { start: START });
  for (const c of [EAST, STAND, FERRY]) assert.ok(low.has(key(...c)), `start, low: ${c}`);
  assert.ok(!low.has(key(...PLOT)), 'low: the punt is aground, the plot is shut');
  // raised again from the stand (which never floods): the punt floats to the plot and the chest
  const fromStand = reach(m, { l: 1 }, { start: STAND });
  assert.ok(fromStand.has(key(...PLOT)), 'mid from the stand: the plot');
  assert.ok(!fromStand.has(key(...EAST)), 'mid from the stand: the lane is under again');
  // a party back from Valewyn by the ferry (levels reset to mid) reaches the far lock and so can drain the lane west
  const back = reach(m, { l: 1 }, { start: FERRY });
  assert.ok(back.has('26,14'), 'the ferry landing reaches the far lock wh_lane_e');
  assert.ok(!back.has(key(...START)), 'and the west needs the drain');
  assert.ok(reach(m, { l: 0 }, { start: FERRY }).has(key(...START)), 'low from the ferry: home');
  // every enemy, NPC and trigger of the lane stands off the basin; the wheels' faced cells never flood
  for (const id of ['wh_lane', 'wh_lane_e']) {
    const w = byId(m, id);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = w.x + dx, y = w.y + dy;
      if (low.has(key(x, y)) || mid.has(key(x, y)) || fromStand.has(key(x, y)) || back.has(key(x, y))) assert.equal(m.tide.basin[y][x], '.', `${id}: faced from ${x},${y} off the basin`);
    }
  }
});

test('Valewyn plan: doors, landings, the river quarter before and after vw_restored, the council switches', () => {
  const m = maps.ep4_valewyn;
  for (const id of ['vance', 'joss', 'sori', 'ada', 'statue', 'flood_board', 'switch_shelter', 'switch_records', 'keep_ferry_obj', 'keep_boat', 'ferry_back', 'great_lock']) assert.ok(byId(m, id), id);
  const DOORS = { door_vw_palace: 'ep4_vw_palace', door_vw_inn: 'ep4_vw_inn', door_vw_shop: 'ep4_vw_shop', door_vw_forge: 'ep4_vw_forge' };
  for (const [id, to] of Object.entries(DOORS)) {
    const d = byId(m, id);
    assert.equal(d.to[0], to);
    const back = maps[to].events.find((e) => e.type === 'door' && e.to[0] === 'ep4_valewyn');
    assert.ok(back, `${to} has a door back`);
    assert.deepEqual([back.to[1], back.to[2]], [d.x, d.y + 1], `${to} lands in front of its door`);
  }
  assert.equal(byId(m, 'keep_boat').if, 'keep_ferry_open');
  assert.deepEqual(byId(m, 'keep_boat').to.slice(0, 3), ['ep4_keep_f1', 19, 27]);
  const flooded = new Set(walk(m, db, { flags: ['saw_valewyn', 'vw_arrived', 'met_joss', 'keep_ferry_open'] }).reachable);
  const dry = new Set(walk(m, db, { flags: ['saw_valewyn', 'vw_arrived', 'met_joss', 'keep_ferry_open', 'vw_restored'] }).reachable);
  for (const c of ['1,23', '9,25', '5,29']) { assert.ok(!flooded.has(c), `${c} under water`); assert.ok(dry.has(c), `${c} dry after vw_restored`); }
  for (const c of ['21,32', '29,4', '21,14', '5,19', '38,18', '39,25', '35,11']) assert.ok(flooded.has(c), `${c} reached in the flood`);
  // the Flood Road ferry lands on ferry_in, and ferry_back lands on the road's ferry mark
  assert.deepEqual(byId(maps.ep4_flood_road, 'ferry_vw').to.slice(1, 3), m.marks.ferry_in);
  assert.deepEqual(byId(m, 'ferry_back').to.slice(1, 3), maps.ep4_flood_road.marks.ferry);
});

// ------------------------------------------------------------------------------------------------ STAGING_EP4
test('every STAGING_EP4 mark, spawn point and inspect line of part A exists, and the marks scenes walk to are reached', () => {
  const text = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP4.md'), 'utf8');
  const marksOf = (id) => {
    const h = text.split('\n').find((l) => l.startsWith(`### \`${id}\``));
    assert.ok(h, `STAGING_EP4 heading for ${id}`);
    return [...h.matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]).filter((x) => x !== id);
  };
  for (const id of ['ep4_flood_road', 'ep4_valewyn', 'ep4_vw_palace']) for (const mk of marksOf(id)) assert.ok(maps[id].marks[mk], `${id}: mark ${mk}`);
  for (const [id, mk] of [['ep4_vw_inn', 'inn_bed'], ['ep4_vw_inn', 'counter'], ['ep4_vw_shop', 'counter'], ['ep4_vw_forge', 'anvil']]) assert.ok(maps[id].marks[mk], `${id}: ${mk}`);
  // NPC records placed on their maps
  for (const [nid, n] of Object.entries(EP4_NPCS)) if (MINE.includes(n.map)) assert.ok(byId(maps[n.map], nid), `${nid} on ${n.map}`);
  // marks a scene walks to or spawns a walker at are reached (camera-only marks may sit on water or under a statue)
  const vw = maps.ep4_valewyn;
  const town = new Set(walk(vw, db, { flags: ['saw_valewyn', 'vw_arrived', 'met_joss', 'keep_ferry_open', 'charter_restored'] }).reachable);
  for (const mk of ['ferry_in', 'statue', 'board', 'canal_works', 'keep_landing', 'crowd_a', 'crowd_b', 'crowd_c', 'crowd_d', 'gather_lyra', 'gather_hale', 'gather_joss', 'gather_vance', 'plaza', 'palace_door', 'inn_door', 'shop_door', 'forge_door']) {
    assert.ok(town.has(key(...vw.marks[mk])), `ep4_valewyn: ${mk} reached`);
  }
  const road = maps.ep4_flood_road;
  const low = reach(road, { l: 0 }, { start: [1, 15] });
  for (const mk of ['entry', 'lane', 'fire', 'bluff', 'ferry']) assert.ok(low.has(key(...road.marks[mk])), `ep4_flood_road: ${mk} reached`);
  const pal = maps.ep4_vw_palace;
  assert.ok(new Set(walk(pal, db, {}).reachable).has(key(...pal.marks.table)), 'the palace table mark');
  // every inspect line and book the maps name is the pack's (or an existing core line)
  for (const id of MINE) for (const e of maps[id].events) {
    if (e.text && /^(ep4_|sign_ep4_)/.test(e.text)) assert.ok(EP4_LINES[e.text], `${id}/${e.id}: line ${e.text}`);
    if (e.type === 'book') assert.ok(EP4_BOOKS[e.book], `${id}/${e.id}: book ${e.book}`);
  }
});
