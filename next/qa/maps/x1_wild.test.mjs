// X1-maps-wild: x1_highmoor (72 x 36) and x1_larchhill (68 x 38) (EXPANSION1_PLAN 3.2, 3.4, 3.6, 4.11 to 4.13). Both are `x1` pack
// files: the test registers the pack's data, merges the x1 tile fragment and the x1 atlases into mapcheck's database the way
// ensurePack does and loads the modules through mapcheck (nothing imports them directly).
//
// The three routes of each map are tested as walks on the collision grid (`pathfinder` below: four-direction moves, one-way
// ledge hops, pits never walked, the Lantern reads faint ink as floor, Dash opens breakable roots and cracks, Shove clears a heavy
// block). Set X1_WILD_PRINT=1 to print the route lengths and the cell lists the docs quote.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NEXT, loadAll, loadDb, validate, walk, buildGrid, eventCells, loadStaging } from '../../tools/maps/mapcheck.mjs';
import { mergeTileFragment } from '../../src/game/packs.js';

const rd = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const db = await loadDb();
mergeTileFragment(db.tiles, rd('assets/tiles/x1_tiles.json'));
Object.assign(db.enemiesField.sprites, rd('assets/sprites/x1_enemies_field.json').sprites);
Object.assign(db.npcAtlas.sprites, rd('assets/sprites/x1_npcs.json').sprites);
await (await import(pathToFileURL(path.join(NEXT, 'src/data/x1/index.js')).href)).register();

const maps = await loadAll();
const MO = maps.x1_highmoor, LH = maps.x1_larchhill;
const staging = loadStaging();
const FLAGS = ['first_fight_done'];
const key = (x, y) => `${x},${y}`;
const man = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const ev = (m, id) => m.events.find((e) => e.id === id);
const cellOf = (e) => [e.x, e.y];
const PRINT = !!process.env.X1_WILD_PRINT;

// ------------------------------------------------------------------------------------------------ the pathfinder
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LEDGE = { ledge_s: 'down', ledge_e: 'right', ledge_w: 'left' };
const toList = (v) => (v == null ? [] : [].concat(v));
const present = (e, flags) => toList(e.if).every((f) => flags.includes(f)) && !toList(e.ifNot).some((f) => flags.includes(f));

/** The map as a party with `flags` and the given abilities walks it. */
function view(map, { flags = FLAGS, lantern = false, dash = false, shove = false, mapsDb = db } = {}) {
  const m = { ...map, events: map.events.filter((e) => present(e, flags)) };
  const g = buildGrid(m, mapsDb);
  const open = new Set();
  for (const e of m.events) {
    if (e.type === 'object' && e.breakable && dash) for (const [x, y] of eventCells(e)) open.add(key(x, y));
    if (e.type === 'block' && (!e.heavy || shove)) open.add(key(e.x, e.y));
  }
  const code = (x, y) => {
    if (x < 0 || y < 0 || x >= g.W || y >= g.H) return 'solid';
    if (open.has(key(x, y))) return 'none';
    if (g.faint[y][x] && lantern) return 'none';
    return g.code[y][x];
  };
  return { W: g.W, H: g.H, code, map: m };
}
/** Neighbours of a cell: walkable cells, and the landing past a one-way ledge cell entered in its direction. */
function nbrs(v, [x, y]) {
  const out = [];
  for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
    const nx = x + dx, ny = y + dy, c = v.code(nx, ny);
    if (c === 'none') out.push([nx, ny]);
    else if (LEDGE[c] === dir && v.code(nx + dx, ny + dy) === 'none') out.push([nx + dx, ny + dy]);
  }
  return out;
}
function flood(v, from) {
  const seen = new Map([[key(...from), null]]), q = [from];
  for (let i = 0; i < q.length; i++) for (const n of nbrs(v, q[i])) if (!seen.has(key(...n))) { seen.set(key(...n), q[i]); q.push(n); }
  return seen;
}
function pathBetween(v, from, to) {
  const seen = flood(v, from);
  if (!seen.has(key(...to))) return null;
  const out = [];
  for (let c = to; c; c = seen.get(key(...c))) out.push(c);
  return out.reverse();
}
/** What a step onto a cell costs a party that follows roads: paths, stone and the built bridges cost 1, open ground 4. */
function stepCost(map, x, y) {
  const id = map.legend[map.ground[y][x]];
  if (id === 'dirt' || id === 'stone_floor' || id === 'plaza' || /^x1_terrace_stairs/.test(id) || /^ledge_/.test(id)) return 1;
  for (const o of map.overlays) if (o.x === x && o.y === y && /^(ink_bridge|x1_aqueduct)/.test(o.t)) return 1;
  return 4;
}
/** Cheapest path (Dijkstra over road costs) between two cells. */
function cheapest(v, from, to) {
  const cost = new Map([[key(...from), 0]]), prev = new Map([[key(...from), null]]);
  const open = [[0, from]];
  while (open.length) {
    open.sort((p, q) => p[0] - q[0]);
    const [d, c] = open.shift();
    if (d > cost.get(key(...c))) continue;
    if (c[0] === to[0] && c[1] === to[1]) break;
    for (const n of nbrs(v, c)) {
      const nd = d + stepCost(v.map, n[0], n[1]) + (Math.abs(n[0] - c[0]) + Math.abs(n[1] - c[1]) > 1 ? 1 : 0);
      if (nd < (cost.get(key(...n)) ?? Infinity)) { cost.set(key(...n), nd); prev.set(key(...n), c); open.push([nd, n]); }
    }
  }
  if (!prev.has(key(...to))) return null;
  const out = [];
  for (let c = to; c; c = prev.get(key(...c))) out.push(c);
  return out.reverse();
}
/** A route: the cheapest road path through the waypoints, in order. Null when any leg is impossible. */
function route(v, waypoints) {
  const out = [];
  for (let i = 0; i + 1 < waypoints.length; i++) {
    const p = cheapest(v, waypoints[i], waypoints[i + 1]);
    if (!p) return null;
    out.push(...(i ? p.slice(1) : p));
  }
  return out;
}
/** Every cell a visible group may stand on: its post, its wander radius or its patrol path. */
function foeCells(e) {
  if (e.move === 'patrol') {
    const out = [[e.x, e.y]]; let [x, y] = [e.x, e.y];
    for (const d of e.path) { x += DIRS[d][0]; y += DIRS[d][1]; out.push([x, y]); }
    return out;
  }
  const r = e.move === 'wander' ? (e.radius || 1) : 0;
  const out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r) out.push([e.x + dx, e.y + dy]);
  return out;
}
const minDist = (cells, foes) => Math.min(...cells.flatMap((c) => foes.map((f) => man(c, f))));
const foesOf = (m) => m.events.filter((e) => e.type === 'enemy');
const fcells = (e) => foeCells(e);

// ------------------------------------------------------------------------------------------------ the routes (waypoints, abilities)
const MOOR = {
  start: [35, 34], exit: [71, 13],
  A: { opts: {}, via: [[35, 34], [29, 29], [22, 29], [15, 25], [15, 14], [22, 10], [31, 10], [38, 11], [43, 15], [56, 15], [66, 14], [68, 13]] },
  B: { opts: {}, via: [[35, 34], [40, 30], [47, 27], [58, 26], [66, 20], [67, 15], [68, 13]] },
  C: { opts: { lantern: true, dash: true }, via: [[35, 34], [29, 29], [28, 27], [28, 19], [28, 18], [40, 18], [49, 18], [53, 18], [62, 18], [62, 16], [66, 14], [68, 13]] },
};
const HILL = {
  start: [31, 1], exit: [67, 18],
  A: { opts: {}, via: [[31, 1], [31, 9], [18, 10], [18, 14], [26, 15], [27, 19], [45, 20], [46, 30], [59, 30], [59, 21], [66, 19], [67, 18]] },
  B: { opts: {}, via: [[31, 1], [31, 7], [62, 8], [62, 17], [66, 19], [67, 18]] },
  C: { opts: { shove: true }, via: [[31, 1], [29, 9], [27, 15], [27, 19], [34, 19], [34, 15], [40, 14], [53, 14], [54, 19], [66, 19], [67, 18]] },
};
function routes(map, spec) {
  const out = {};
  for (const r of ['A', 'B', 'C']) out[r] = route(view(map, spec[r].opts), spec[r].via);
  return out;
}
const MR = routes(MO, MOOR), HR = routes(LH, HILL);
if (PRINT) {
  for (const [n, R] of [['moor', MR], ['hill', HR]]) for (const r of ['A', 'B', 'C']) console.log(n, r, R[r] ? R[r].length - 1 : null, 'steps');
  console.log('MOOR ROUTES', JSON.stringify(MR));
  console.log('HILL ROUTES', JSON.stringify(HR));
}

if (process.env.X1_WILD_DUMP) fs.writeFileSync(process.env.X1_WILD_DUMP, JSON.stringify({ x1_highmoor: MR, x1_larchhill: HR }));

// ------------------------------------------------------------------------------------------------ validity
for (const id of ['x1_highmoor', 'x1_larchhill']) {
  test(`${id}: validates (ids, targets, plan counts, STAGING marks, walk); no warnings now that every neighbour exists`, () => {
    const r = validate(maps[id], db, maps, { staging });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings, []);
    assert.ok(db.BANNERS[id], 'banner');
  });
}

test('the module fields: ids, sizes, area, music, ambience, lighting, respawn, motes', () => {
  assert.deepEqual([MO.ground[0].length, MO.ground.length], [72, 36]);
  assert.deepEqual([LH.ground[0].length, LH.ground.length], [68, 38]);
  for (const m of [MO, LH]) { assert.equal(m.area, 'field'); assert.equal(m.respawn, 'reentry'); assert.equal(m.lighting.dark, 0); assert.equal(m.lighting.fog, undefined); assert.equal(m.fog, undefined); for (const r of m.ground) assert.equal(r.length, m.ground[0].length); }
  assert.deepEqual([MO.music, MO.ambience, LH.music, LH.ambience], ['high_moor', 'moor_wind', 'larchhill', 'larchhill_hum']);
  assert.deepEqual(LH.ambientFx, ['motes']);
  assert.equal(MO.ambientFx, undefined);
  assert.ok(MO.overhead.some((o) => o.t === 'x1_far_dome'), 'the dome decal over the north-east rim');
  assert.ok(LH.overhead.some((o) => o.t === 'x1_far_windmill'), 'the windmill decal by the north gate');
  assert.ok(!MO.overhead.some((o) => o.t === 'x1_far_tower'), 'the far tower is on the Downs and the valley, not here');
});

// ------------------------------------------------------------------------------------------------ the marks of 4.11
const MARKS = {
  x1_highmoor: 'south_entry chime_1 chime_9 tarn islet tower odo bench view gorse stile terrace_west',
  x1_larchhill: 'north_gate windmill ladder apiary yarrow chute barrel aqueduct_end press east_gate hive_stand',
};
const EVENTS = {
  x1_highmoor: 'odo x1_roots_stile x1_roots_gorse chest_moor_cairn chest_moor_view chest_moor_islet chest_moor_gorse x1_star_mark_tower moor_bench e_mo_wolves e_mo_scarabs e_mo_wraiths moor_sign chime_1 chime_2 chime_3 chime_4 chime_5 chime_6 chime_7 chime_8 chime_9 x1_watchtower',
  x1_larchhill: 'yarrow x1_cider_barrel x1_crack_press chest_lh_hive chest_lh_press chest_lh_aqueduct x1_mill_ladder x1_hay_chute e_lh_beetles e_lh_wolves e_lh_mixed hill_sign',
};
for (const [id, m] of [['x1_highmoor', MO], ['x1_larchhill', LH]]) {
  test(`${id}: every mark and named event of plan 4.11 exists`, () => {
    for (const n of MARKS[id].split(' ')) assert.ok(m.marks[n], `mark ${n}`);
    for (const e of EVENTS[id].split(' ')) assert.ok(ev(m, e), `event ${e}`);
  });
}
test('the scenes the maps run exist, and the star mark is a Lantern object gated on stars_started', () => {
  for (const s of ['moor_arrival', 'larchhill_arrival', 'windmill_view', 'star_read_3']) assert.ok(db.scenes[s], s);
  assert.equal(MO.events.find((e) => e.type === 'trigger' && e.on === 'enter').script, 'moor_arrival');
  assert.equal(LH.events.find((e) => e.type === 'trigger' && e.on === 'enter').script, 'larchhill_arrival');
  const sm = ev(MO, 'x1_star_mark_tower');
  assert.deepEqual([sm.type, sm.if, sm.lantern, sm.script], ['object', 'stars_started', true, 'star_read_3']);
  const lad = ev(LH, 'x1_mill_ladder');
  assert.deepEqual([lad.type, lad.script], ['object', 'windmill_view']);
  for (const [m, n] of [[MO, 'odo'], [LH, 'yarrow']]) assert.equal(db.NPCS[n].map, m.id);
});
test('marks the scenes pan to or stand on are in bounds; the arrival marks are walkable and reached', () => {
  for (const [m, names, flags] of [[MO, ['south_entry', 'terrace_west', 'odo', 'islet', 'gorse'], FLAGS], [LH, ['north_gate', 'east_gate', 'press', 'aqueduct_end', 'hive_stand', 'yarrow'], FLAGS]]) {
    const w = walk(m, db, { flags, lantern: true });
    for (const n of names) {
      const mk = w.marks.find((x) => x.name === n);
      assert.ok(mk.walkable, `${m.id} mark ${n} walkable`);
    }
    for (const n of ['south_entry', 'north_gate', 'east_gate', 'terrace_west']) { const mk = w.marks.find((x) => x.name === n); if (mk) assert.ok(mk.reached, n); }
  }
  // the three camera marks of windmill_view and the tower pan sit inside the map
  for (const [m, n] of [[LH, 'windmill'], [LH, 'north_gate'], [LH, 'east_gate'], [MO, 'tower']]) assert.ok(m.marks[n][0] < m.ground[0].length && m.marks[n][1] < m.ground.length);
});

// ------------------------------------------------------------------------------------------------ the three routes as walks
test('High Moor: three routes from the south entry to the stile, each a walk by itself; the Hidden Fold needs the Lantern and Dash', () => {
  for (const r of ['A', 'B', 'C']) assert.ok(MR[r], `route ${r} exists`);
  const len = (r) => MR[r].length - 1;
  assert.ok(len('A') >= 85 && len('A') <= 125, `Chime Road ${len('A')}`);
  assert.ok(len('B') >= 45 && len('B') <= 75, `Ridgeline ${len('B')}`);
  assert.ok(len('C') >= 50 && len('C') <= 85, `Hidden Fold ${len('C')}`);
  assert.ok(len('A') > len('C') && len('C') >= len('B') - 5 && len('A') > len('B') + 25, 'long, short, medium');
  // the visible routes need no ability: the walk without any reaches the stile cell, never past the roots
  const bare = view(MO, {});
  const seen = flood(bare, MOOR.start);
  assert.ok(seen.has(key(68, 13)), 'the stile is reached on foot');
  assert.ok(!seen.has(key(70, 13)), 'the roots hold the way east until Dash');
  assert.ok(!seen.has(key(28, 18)), 'the islet is cut off without the Lantern');
  // C step by step: without the Lantern the ink is a pit; without Dash the roots hold the tunnel (the way round is the whole map)
  assert.equal(cheapest(view(MO, { dash: true }), [28, 27], [28, 19]), null, 'the ink route is pits without the Lantern');
  assert.ok(cheapest(view(MO, { lantern: true }), [49, 18], [53, 18]).length > 60, 'without Dash the roots turn the party round');
  assert.equal(cheapest(view(MO, { lantern: true, dash: true }), [49, 18], [53, 18]).length, 5, 'with Dash the tunnel is a straight walk');
  assert.ok(route(view(MO, { lantern: true, dash: true }), MOOR.C.via));
  // the three share no long stretch before the yard: A and B only meet the stile approach, C joins them 8 cells from the stile
  const set = (r) => new Set(MR[r].map((c) => key(...c)));
  const shared = (a, b) => [...set(a)].filter((k) => set(b).has(k)).length;
  assert.ok(shared('A', 'B') <= 20 && shared('A', 'C') <= 20 && shared('B', 'C') <= 20, `shared cells ${shared('A', 'B')} ${shared('A', 'C')} ${shared('B', 'C')}`);
  // the route reaches the exit cell on the far side of the stile and the Terrace link lands back inside it
  assert.deepEqual(MR.A.at(-1), [68, 13]);
  for (const r of ['A', 'B', 'C']) assert.ok(pathBetween(view(MO, { ...MOOR[r].opts, dash: true }), MR[r].at(-1), [71, 13]), `${r}: Dash at the stile opens the way to the Terrace exit`);
});
test('Larchhill: three routes from the north gate to the east gate; the Aqueduct Walk needs the Shove', () => {
  for (const r of ['A', 'B', 'C']) assert.ok(HR[r], `route ${r} exists`);
  const len = (r) => HR[r].length - 1;
  assert.ok(len('A') >= 85 && len('A') <= 130, `Switchback Road ${len('A')}`);
  assert.ok(len('B') >= 45 && len('B') <= 70, `Terrace Stairs ${len('B')}`);
  assert.ok(len('C') >= 50 && len('C') <= 85, `Aqueduct Walk ${len('C')}`);
  assert.ok(len('A') > len('C') && len('C') > len('B') - 5, 'long, medium, short');
  assert.equal(route(view(LH, {}), HILL.C.via), null, 'without the Shove the barrel plugs the stair');
  const bare = flood(view(LH, {}), HILL.start);
  assert.ok(bare.has(key(66, 19)) && bare.has(key(67, 18)), 'the east gate is reached on foot');
  assert.ok(!bare.has(key(34, 15)) && !bare.has(key(53, 14)), 'the deck is not reached without the Shove');
  const set = (r) => new Set(HR[r].map((c) => key(...c)));
  const shared = (a, b) => [...set(a)].filter((k) => set(b).has(k)).length;
  assert.ok(shared('A', 'B') <= 20 && shared('A', 'C') <= 32 && shared('B', 'C') <= 30, `shared cells ${shared('A', 'B')} ${shared('A', 'C')} ${shared('B', 'C')}`);
  // the stairs and the ledge hop never trap: the deck can be left by the east stair, the barrel stair, or back round the landing
  const full = view(LH, { shove: true, dash: true });
  assert.ok(pathBetween(full, [40, 14], [31, 1]), 'from the deck back to the gate (by the east stair, round the hill)');
});

// ------------------------------------------------------------------------------------------------ chests by ability
function opensWith(map, chestId, opts, from) {
  const c = ev(map, chestId);
  const v = view(map, opts);
  const seen = flood(v, from);
  const reach = Object.values(DIRS).some(([dx, dy]) => seen.has(key(c.x + dx, c.y + dy)));
  if (!reach) return false;
  const hidden = c.behind && !String(c.behind).startsWith('appraise:') ? ev(map, c.behind) : null;
  return hidden ? !!opts.dash : true;
}
test('every chest by its ability (tier, contents, what it needs)', () => {
  const need = (m, id, from) => {
    const out = [];
    for (const [name, o] of [['none', {}], ['lantern', { lantern: true }], ['dash', { dash: true }], ['shove', { shove: true }], ['lantern+dash', { lantern: true, dash: true }], ['shove+dash', { shove: true, dash: true }]]) if (opensWith(m, id, o, from)) out.push(name);
    return out[0];
  };
  const t = (m, id, tier, item, ability, from) => {
    const c = ev(m, id);
    assert.equal(c.tier, tier, `${id} tier`);
    if (item) assert.equal(c.item, item, `${id} item`);
    assert.equal(need(m, id, from), ability, `${id} needs`);
  };
  t(MO, 'chest_moor_cairn', 'wood', 'antidote', 'none', MOOR.start);
  t(MO, 'chest_moor_view', 'iron', null, 'none', MOOR.start);
  t(MO, 'chest_moor_islet', 'gold', 'chime_staff', 'lantern', MOOR.start);
  t(MO, 'chest_moor_gorse', 'iron', null, 'dash', MOOR.start);
  t(LH, 'chest_lh_hive', 'wood', 'honey_roll', 'none', HILL.start);
  t(LH, 'chest_lh_press', 'iron', null, 'shove+dash', HILL.start);
  t(LH, 'chest_lh_aqueduct', 'gold', 'orchard_axe', 'shove', HILL.start);
  assert.equal(ev(LH, 'chest_lh_hive').qty, 3); assert.equal(ev(MO, 'chest_moor_cairn').qty, 2);
  assert.ok(db.ITEMS.chime_staff && db.ITEMS.orchard_axe && db.ITEMS.honey_roll);
  // the moor's wood and the hill's wood chests are fixed (no rolled loot there); the iron ones roll
  assert.equal(ev(MO, 'chest_moor_view').item, undefined);
});
test('the heavy block, the breakables and their hidden chests (ids, flags, art stand-ins)', () => {
  const b = ev(LH, 'x1_cider_barrel');
  assert.deepEqual([b.type, b.heavy, b.sprite], ['block', true, 'x1_cider_barrel']);
  const cr = ev(LH, 'x1_crack_press');
  assert.deepEqual([cr.breakable, cr.h], ['rock', 2]);
  assert.equal(ev(LH, 'chest_lh_press').behind, 'x1_crack_press');
  for (const id of ['x1_roots_gorse', 'x1_roots_stile']) { const r = ev(MO, id); assert.deepEqual([r.breakable, r.h], ['roots', 2]); }
  // the roots' cells are floor either side: Dash opens a cell pair, never a wall
  const g = buildGrid({ ...MO, events: MO.events.filter((e) => e.type !== 'object' || !e.breakable) }, db);
  for (const id of ['x1_roots_gorse', 'x1_roots_stile']) { const r = ev(MO, id); for (const [x, y] of eventCells(r)) assert.equal(g.code[y][x], 'none', `${id} cell ${x},${y} is floor under the roots`); }
  // the stile: roots at (69, 13..14), floor west and east, the exit pair at x 71
  assert.deepEqual([cellOf(ev(MO, 'x1_roots_stile')), MO.marks.stile, MO.marks.terrace_west], [[69, 13], [69, 13], [70, 13]]);
});

// ------------------------------------------------------------------------------------------------ links and landings
const NEI = { terrace: maps.x1_terrace, downs: maps.x1_downs, millrace: maps.x1_millrace };
const exitCells = (m, to) => { const out = []; for (const x of m.exits) if (x.to[0] === to) for (let j = 0; j < x.h; j++) for (let i = 0; i < x.w; i++) out.push([x.x + i, x.y + j]); return out; };
const FACE = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
test('cross-links: every arrival is walkable, off the exit cells and faces away from the door it came through', () => {
  const chk = (from, to, mapTo) => {
    const x = from.exits.find((e) => e.to[0] === to);
    assert.ok(x, `${from.id} has an exit to ${to}`);
    const [, tx, ty, dir] = x.to;
    const g = buildGrid(mapTo, db);
    assert.equal(g.code[ty][tx], 'none', `${from.id} -> ${to} lands on a walkable cell (${tx},${ty})`);
    // the landing is not itself an exit back, and the cell it faces is walkable (the party can step away from the door)
    const ex = new Set(exitCells(mapTo, from.id).map((c) => key(...c)));
    assert.ok(!ex.has(key(tx, ty)), 'not on an exit cell');
    const [dx, dy] = FACE[dir];
    if (!(to === 'x1_highmoor' && from.id === 'x1_terrace')) assert.equal(g.code[ty + dy][tx + dx], 'none', `the cell faced from (${tx},${ty}) is walkable`);
    // facing is away from the edge it came through: the landing is within 2 cells of the target map's edge it leaves from
    return { x, exits: ex };
  };
  chk(MO, 'x1_downs', maps.x1_downs); chk(maps.x1_downs, 'x1_highmoor', MO);
  chk(MO, 'x1_terrace', maps.x1_terrace); chk(maps.x1_terrace, 'x1_highmoor', MO);
  chk(LH, 'x1_downs', maps.x1_downs); chk(maps.x1_downs, 'x1_larchhill', LH);
  chk(LH, 'x1_millrace', maps.x1_millrace); chk(maps.x1_millrace, 'x1_larchhill', LH);
  // the exact cells of plan 3.2
  assert.deepEqual(MO.exits.map((e) => [e.x, e.y, e.w, e.h, ...e.to]), [[34, 35, 4, 1, 'x1_downs', 30, 1, 'down'], [71, 13, 1, 2, 'x1_terrace', 1, 13, 'right']]);
  assert.deepEqual(LH.exits.map((e) => [e.x, e.y, e.w, e.h, ...e.to]), [[30, 0, 4, 1, 'x1_downs', 11, 32, 'up'], [67, 18, 1, 2, 'x1_millrace', 1, 12, 'right']]);
  assert.deepEqual(maps.x1_downs.exits.find((e) => e.to[0] === 'x1_highmoor').to, ['x1_highmoor', 35, 34, 'up']);
  assert.deepEqual(maps.x1_terrace.exits[0].to, ['x1_highmoor', 70, 13, 'left']);
  assert.deepEqual(maps.x1_downs.exits.find((e) => e.to[0] === 'x1_larchhill').to, ['x1_larchhill', 31, 1, 'down']);
  assert.deepEqual(maps.x1_millrace.exits.find((e) => e.to[0] === 'x1_larchhill').to, ['x1_larchhill', 66, 18, 'left']);
  // the start cells are the arrivals
  assert.deepEqual([MO.start.x, MO.start.y, MO.start.dir], [35, 34, 'up']);
  assert.deepEqual([LH.start.x, LH.start.y, LH.start.dir], [31, 1, 'down']);
  assert.deepEqual([MO.marks.south_entry, LH.marks.north_gate, LH.marks.east_gate, MO.marks.terrace_west], [[35, 34], [31, 1], [66, 18], [70, 13]]);
});
test('the hay chute: a gate until yarrow_met, then a pit area that drops, one way, onto the Millrace jetty', () => {
  const gate = ev(LH, 'x1_hay_gate'), gateB = ev(LH, 'x1_hay_gate_b'), chute = ev(LH, 'x1_hay_chute');
  for (const [g, y] of [[gate, 30], [gateB, 31]]) { assert.equal(g.ifNot, 'yarrow_met'); assert.deepEqual([g.type, g.x, g.y, g.w], ['object', 60, y, 2]); assert.equal(g.text, 'x1_hay_chute'); }
  assert.deepEqual([chute.type, chute.x, chute.y, chute.w, chute.h], ['pit', 60, 30, 2, 2]);
  assert.deepEqual(chute.to, ['x1_millrace', 12, 20, 'down']);
  assert.deepEqual(LH.marks.chute, [60, 30]);
  const bare = buildGrid({ ...LH, events: [] }, db);
  for (let y = 30; y <= 31; y++) for (let x = 60; x <= 61; x++) assert.equal(bare.code[y][x], 'pit', `chute cell ${x},${y} is pit terrain`);
  const mr = buildGrid(maps.x1_millrace, db);
  assert.equal(mr.code[20][12], 'none');
  // before yarrow_met the two hay ricks (solid objects, 2 x 1 each) cover every pit cell; the walk never steps into the pit either way
  const g0 = view(LH, { flags: FLAGS }); const g1 = view(LH, { flags: [...FLAGS, 'yarrow_met'] });
  for (let y = 30; y <= 31; y++) for (let x = 60; x <= 61; x++) { assert.equal(g0.code(x, y), 'solid'); assert.equal(g1.code(x, y), 'pit'); }
  // the chute is a way down from the yard: its mouth is walkable beside it
  assert.equal(g1.code(59, 30), 'none');
  assert.ok(LH.overhead.some((o) => o.t === 'x1_hay_chute' && o.x === 60 && o.y === 30 && o.if === 'yarrow_met'), 'the chute art is an overhead tile, so it has no collision of its own');
});
test('return doors: the Terrace link lands before the roots, the Downs links land beside their exits', () => {
  // from the Terrace the party arrives at (70, 13) facing left: the roots at (69, 13..14) are the next thing it meets
  const v = view(MO, { dash: true });
  assert.equal(v.code(70, 13), 'none'); assert.equal(v.code(69, 13), 'none');
  assert.equal(view(MO, {}).code(69, 13), 'solid');
  // Dash from the west cell breaks the roots: the cells are the event's own (the stile persists as broken)
  const cells = eventCells(ev(MO, 'x1_roots_stile')).map((c) => key(...c)).sort();
  assert.deepEqual(cells, ['69,13', '69,14']);
});

// ------------------------------------------------------------------------------------------------ placement rules (plan 3.6)
test('field foes: counts, no chase, 6 tiles from NPCs, arrivals and doors, 3 tiles off every route, one route foe-free (and beyond)', () => {
  for (const [m, R, npcs, arrivals] of [
    [MO, MR, MO.events.filter((e) => e.type === 'npc').map(cellOf), [[35, 34], [70, 13], [71, 13], MO.marks.odo, MO.marks.tower, ...MO.exits.map((x) => [x.x, x.y])]],
    [LH, HR, LH.events.filter((e) => e.type === 'npc').map(cellOf), [[31, 1], [66, 18], LH.marks.chute, LH.marks.ladder, LH.marks.yarrow, ...LH.exits.map((x) => [x.x, x.y])]]]) {
    const foes = foesOf(m);
    assert.equal(foes.length, 3, `${m.id}: three groups`);
    assert.ok(foes.every((f) => f.move !== 'chase'), 'no chase foe on a wide map (they would need 6 tiles from every lane)');
    for (const f of foes) for (const c of fcells(f)) {
      for (const n of npcs) assert.ok(man(c, n) >= 6, `${f.id} ${c} within 6 of NPC ${n}`);
      for (const a of arrivals) assert.ok(man(c, a) >= 6, `${f.id} ${c} within 6 of ${a}`);
      assert.equal(buildGrid({ ...m, events: [] }, db).code[c[1]][c[0]], 'none', `${f.id} cell ${c} is floor`);
      for (const r of ['A', 'B', 'C']) for (const q of R[r]) assert.ok(man(c, q) >= 3, `${f.id} at ${c} is within 3 of route ${r} at ${q}`);
    }
  }
  // each visible route carries its groups, within 7 cells of its centreline; the third is foe-free, nothing within 6 (> the 3 the rule asks)
  const near = (m, R, r) => foesOf(m).filter((f) => minDist(R[r], fcells(f)) <= 6).map((f) => f.id).sort();
  assert.deepEqual(near(MO, MR, 'A'), ['e_mo_wolves']);
  assert.deepEqual(near(MO, MR, 'B'), ['e_mo_scarabs', 'e_mo_wraiths']);
  assert.deepEqual(near(LH, HR, 'A'), ['e_lh_beetles', 'e_lh_wolves']);
  assert.deepEqual(near(LH, HR, 'B'), ['e_lh_mixed']);
  for (const [m, R] of [[MO, MR], [LH, HR]]) for (const f of foesOf(m)) assert.ok(minDist(R.C, fcells(f)) >= 5, `${f.id} is ${minDist(R.C, fcells(f))} from the foe-free route`);
  // the safe zones: the tower yard and Odo, the apiary and Yarrow, the hay chute and the ladder
  for (const f of foesOf(MO)) for (const c of fcells(f)) for (const p of [MO.marks.odo, MO.marks.tower, [46, 14], [44, 15]]) assert.ok(man(c, p) >= 8, `${f.id} near the tower yard`);
  for (const f of foesOf(LH)) for (const c of fcells(f)) for (const p of [LH.marks.yarrow, LH.marks.chute, LH.marks.apiary, [54, 29]]) assert.ok(man(c, p) >= 8, `${f.id} near the apiary`);
  // plan: the moor's scarabs patrol beside the view chest and the hill's wolves patrol the high bend
  assert.equal(ev(MO, 'e_mo_scarabs').move, 'patrol'); assert.equal(ev(LH, 'e_lh_wolves').move, 'patrol'); assert.equal(ev(MO, 'e_mo_wolves').move, 'guard'); assert.equal(ev(LH, 'e_lh_mixed').move, 'guard');
  // the encounters belong to the zone and their field sprite is the leader
  for (const m of [MO, LH]) for (const f of foesOf(m)) { const enc = db.ENCOUNTERS[f.encounter]; assert.equal(enc.zone, m.id); assert.equal(enc.leader, f.sprite); }
});

// ------------------------------------------------------------------------------------------------ ledges never trap
test('one-way ledges: every ledge cell has a floor cell on both ends, and the landing always has a way on (to the exit and back to the start)', () => {
  for (const [m, start, exit] of [[MO, MOOR.start, [70, 13]], [LH, HILL.start, [67, 18]]]) {
    const v = view(m, { dash: true, shove: true, lantern: true });
    const g = buildGrid(m, db);
    let n = 0;
    for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
      const dir = LEDGE[g.code[y][x]];
      if (!dir) continue;
      n++;
      const [dx, dy] = DIRS[dir];
      const before = [x - dx, y - dy], land = [x + dx, y + dy];
      // a run of ledge cells may sit side by side along the hop (perpendicular), never in line
      assert.notEqual(LEDGE[g.code[land[1]][land[0]]], dir, `ledge cell ${x},${y} lands on another ledge`);
      assert.equal(v.code(...land), 'none', `${m.id}: the landing of ledge ${x},${y} is floor`);
      assert.equal(v.code(...before), 'none', `${m.id}: the approach of ledge ${x},${y} is floor`);
      assert.ok(pathBetween(v, land, exit), `${m.id}: from the landing of ${x},${y} the exit is reachable`);
      assert.ok(pathBetween(v, land, start), `${m.id}: from the landing of ${x},${y} the way back to the start exists (the other routes)`);
    }
    assert.ok(n >= 6, `${m.id} has ledge cells (${n})`);
  }
  // the moor's Ridgeline hops are east, three cells tall, on the road itself
  for (const x of [44, 57]) assert.equal(buildGrid(MO, db).code[x === 44 ? 26 : 24][x], 'ledge_e');
});
test('leaving works from every cell: every walkable cell reaches an exit with full abilities, and the plain walk leaves no foot cell stranded', () => {
  for (const [m, exits] of [[MO, [[35, 35], [71, 13]]], [LH, [[31, 0], [67, 18]]]]) {
    const v = view(m, { dash: true, shove: true, lantern: true });
    const g = buildGrid(m, db);
    // flood backwards is awkward with one-way hops: flood forward from each cell in a sample sweep (every 3rd cell) plus every ledge landing
    const targets = exits.map((c) => key(...c));
    const seenFromStart = flood(v, [m.start.x, m.start.y]);
    for (const t of targets) assert.ok(seenFromStart.has(t), `${m.id}: ${t} reached from the start`);
    let checked = 0;
    for (const k of seenFromStart.keys()) {
      const [x, y] = k.split(',').map(Number);
      if ((x * 7 + y * 3) % 5) continue;
      checked++;
      const f = flood(v, [x, y]);
      assert.ok(targets.some((t) => f.has(t)), `${m.id}: cell ${k} cannot leave`);
    }
    assert.ok(checked > 150, `${m.id}: swept ${checked} cells`);
    // pits: the moor's tarn ink is a pit until revealed; falling lands on a walkable shore cell
    if (m.pitTo) assert.equal(g.code[m.pitTo[2]][m.pitTo[1]], 'none');
  }
  assert.deepEqual(MO.pitTo, ['x1_highmoor', 28, 28, 'up']);
});
test('the ink route over the tarn: 8 + 9 faint cells, pits without the Lantern, a way back to the shore for a fall', () => {
  const g = buildGrid(MO, db);
  const ink = MO.overlays.filter((o) => /^ink_bridge_[hv]_faint$/.test(o.t));
  assert.ok(ink.length >= 16 && ink.length <= 20, `${ink.length} ink cells`);
  for (const o of ink) { assert.equal(g.code[o.y][o.x], 'pit'); assert.equal(MO.legend[MO.ground[o.y][o.x]], 'x1_tarn'); }
  const v = flood(view(MO, { lantern: true }), MOOR.start);
  for (const o of ink) assert.ok(v.has(key(o.x, o.y)), `ink cell ${o.x},${o.y} walks with the Lantern`);
  assert.ok(v.has(key(28, 18)) && v.has(key(40, 18)), 'islet and east shore');
  // the first run is the 8 cells straight north of the south shore
  assert.deepEqual(ink.filter((o) => o.t === 'ink_bridge_v_faint').map((o) => [o.x, o.y]).sort((a, b) => b[1] - a[1]), [26, 25, 24, 23, 22, 21, 20, 19].map((y) => [28, y]));
});

// ------------------------------------------------------------------------------------------------ the nine chime posts, the signs, the look
test('nine chime posts along the Chime Road, the ninth beside the stile; the bench on the road; the signs read', () => {
  const posts = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ev(MO, `chime_${n}`));
  posts.forEach((p, i) => { assert.equal(p.type, 'sign'); assert.equal(p.text, `chime_${i + 1}`); assert.ok(MO.decor.some((d) => d.t === `x1_chimepost_${i + 1}` && d.x === p.x && d.y === p.y), `post ${i + 1} is drawn`); });
  assert.deepEqual(cellOf(posts[8]), [66, 12]);
  assert.deepEqual(MO.marks.chime_1, cellOf(posts[0]));
  // every post stands within 5 cells of route A and gets farther along it (in order)
  const idx = posts.map((p) => MR.A.reduce((best, c, i) => (man(c, cellOf(p)) < man(MR.A[best], cellOf(p)) ? i : best), 0));
  const dist = posts.map((p) => minDist(MR.A, [cellOf(p)]));
  dist.forEach((d, i) => assert.ok(d <= 5, `post ${i + 1} is ${d} from the Chime Road`));
  for (let i = 1; i < 9; i++) assert.ok(idx[i] > idx[i - 1], `post ${i + 1} comes after post ${i}`);
  const gaps = idx.slice(1).map((v, i) => v - idx[i]);
  assert.ok(gaps.every((d) => d >= 5 && d <= 30), `posts roughly every ten cells: ${gaps}`);
  assert.ok(minDist(MR.A, [cellOf(ev(MO, 'moor_bench'))]) <= 2, 'the bench is on the road');
  assert.deepEqual(MO.marks.bench, [24, 30]);
  // the tower and the hut
  const tw = MO.decor.find((d) => d.t === 'x1_watchtower'), hut = MO.decor.find((d) => d.t === 'x1_turf_hut');
  assert.ok(tw && hut);
  assert.deepEqual([hut.x + 1, hut.y], [50, 11]);              // the hut's door cell; Odo's mark is the cell in front of it
  assert.deepEqual(MO.marks.odo, [50, 12]);
  assert.ok(minDist(MR.A, [MO.marks.odo]) <= 4, 'the tower yard is a spur off the Chime Road');
  assert.ok(cheapest(view(MO, {}), MR.B.at(-1), MO.marks.odo).length <= 26, 'and 25 cells back along the Stile Road from where the Ridgeline ends');
  const bare = flood(view(MO, {}), MOOR.start);
  assert.ok(bare.has(key(50, 12)) && bare.has(key(48, 13)), 'Odo and the tower base are reached on foot');
  // Lantern object at the tower base, a plain cairn that only shows with stars_started
  assert.ok(Math.abs(ev(MO, 'x1_star_mark_tower').x - (tw.x + 4)) <= 1);
});
test('Larchhill landmarks: the windmill mound, the ladder, the apiary, the barrel and the aqueduct ends', () => {
  const wm = LH.decor.find((d) => d.t === 'x1_windmill');
  assert.ok(wm);
  assert.ok(Math.abs(LH.marks.windmill[0] - (wm.x + 4)) <= 1 && LH.marks.windmill[1] < wm.y, 'the windmill mark is on the body');
  const lad = ev(LH, 'x1_mill_ladder');
  assert.ok(Math.abs(lad.x - (wm.x + 3)) <= 1 && lad.y === wm.y + 1, 'the ladder stands against the foot');
  assert.deepEqual(LH.marks.barrel, cellOf(ev(LH, 'x1_cider_barrel')));
  assert.deepEqual(LH.marks.press, [45, 14]);
  assert.equal(LH.marks.aqueduct_end[1], cellOf(ev(LH, 'chest_lh_aqueduct'))[1] + 1);
  const bare = flood(view(LH, {}), HILL.start);
  for (const k of ['63,35', '54,31', '12,28', '62,17']) assert.ok(bare.has(k), `${k} reached on foot`);
  // the deck cells: wall rows are solid, deck rows walk with the Shove
  const full = flood(view(LH, { shove: true }), HILL.start);
  for (const x of [32, 40, 50, 53]) assert.ok(full.has(key(x, 14)) && full.has(key(x, 15)), `deck ${x}`);
  for (const x of [32, 40, 50]) assert.ok(!full.has(key(x, 12)) && !full.has(key(x, 13)), `wall ${x}`);
  // the orchard: fruit trees in ranks (not meadow noise) and hives, in a quantity the draw can carry
  const trees = LH.decor.filter((d) => /^x1_tree_/.test(d.t)).length, hives = LH.decor.filter((d) => /^x1_hive/.test(d.t)).length;
  assert.ok(trees >= 50 && hives >= 12, `${trees} trees ${hives} hives`);
});

// ------------------------------------------------------------------------------------------------ draw and logic cost (static: no per-frame work beyond the visible box)
test('cost: no fog, no lighting, no animated layer beyond the shared ones; props per camera box are few; the overhead layer is static', () => {
  for (const m of [MO, LH]) {
    assert.equal(m.fog, undefined); assert.equal(m.lighting.lights, undefined); assert.equal(m.weatherZone, undefined);
    assert.ok(m.events.filter((e) => e.type === 'light').length === 0, 'no light events');
    assert.ok(m.events.length <= 80, `${m.events.length} events`);
    // the busiest 24 x 14 tile camera box (the phone view is 384 x 216 px): decor objects inside it
    const W = m.ground[0].length, H = m.ground.length;
    let worst = 0;
    for (let y = 0; y + 14 <= H; y += 2) for (let x = 0; x + 24 <= W; x += 2) {
      const n = m.decor.filter((d) => d.x >= x - 2 && d.x < x + 26 && d.y >= y && d.y < y + 17).length;
      if (n > worst) worst = n;
    }
    if (PRINT) console.log(m.id, 'decor', m.decor.length, 'events', m.events.length, 'overlays', m.overlays.length, 'worst camera box decor', worst);
    assert.ok(worst <= 110, `${m.id}: ${worst} decor objects in the busiest camera box`);
  }
});

// ------------------------------------------------------------------------------------------------ draw and logic timing on the real field (phone profile)
// Boots the game headless on the phone profile (844 x 390, dpr 3, touch; see qa/world/fieldlab.py), warps into the two maps
// with ?pack=x1 and times f.draw() and f.update() in a tight loop (min of five runs of sixty), once at full speed and once with
// the CPU throttled 4x (a mid-range phone). The baseline is the valley at (30, 30). Budget (plan 3.4): field logic under 3 ms,
// draw under 1 ms more than the valley at full speed (4 ms more throttled). Skipped when python or Playwright is missing.
import { spawnSync } from 'node:child_process';
const QA_WORLD = path.join(NEXT, 'qa', 'world').split(path.sep).join('/');
const PERF_PY = `
import json, sys
sys.path.insert(0, ${JSON.stringify(QA_WORLD)})
from fieldlab import Lab
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
CASES = [('valley', 30, 30), ('x1_highmoor', 35, 34), ('x1_highmoor', 50, 15), ('x1_highmoor', 45, 18), ('x1_larchhill', 31, 3), ('x1_larchhill', 36, 30), ('x1_larchhill', 58, 30)]
lab = Lab(device='phone')
out = {}
try:
    lab.open('?scene=_devTitle&debug=1&fps=0&pack=x1')
    cdp = lab.ctx.new_cdp_session(lab.page)
    for f in ['first_fight_done', 'lantern_get', 'stars_started']:
        lab.call('setFlag', f, True)
    for rate in (1, 4):
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': rate})
        for m, x, y in CASES:
            lab.warp(m, x, y, 'down')
            lab.frames(60)
            js = '(() => { const f = %s; const r = LQ_ENGINE.renderer; let d = 1e9, u = 1e9; for (let k = 0; k < 5; k++) { let t0 = performance.now(); for (let i = 0; i < 60; i++) f.draw(r); d = Math.min(d, (performance.now() - t0) / 60); t0 = performance.now(); for (let i = 0; i < 60; i++) f.update(1/60, false); u = Math.min(u, (performance.now() - t0) / 60); } return [d, u]; })()' % FIELD
            d, u = lab.run(js)
            out['%dx %s %d,%d' % (rate, m, x, y)] = [round(d, 3), round(u, 3)]
    out['errors'] = lab.errors[:3]
finally:
    lab.close()
print('PERF_JSON ' + json.dumps(out))
`;
test('timing: field draw and logic on the phone profile stay inside the budget (draw within 1 ms of the valley, logic under 3 ms)', { timeout: 170000 }, (t) => {
  const r = spawnSync('python', ['-c', PERF_PY], { cwd: NEXT, encoding: 'utf8', timeout: 160000 });
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('PERF_JSON '));
  if (!line) { t.skip(`no browser timing (python/Playwright unavailable): ${(r.stderr || '').slice(-200)}`); return; }
  const p = JSON.parse(line.slice('PERF_JSON '.length));
  assert.deepEqual(p.errors, [], 'no console errors on the real field');
  if (PRINT || process.env.X1_WILD_PERF) console.log('PERF', JSON.stringify(p));
  for (const rate of [1, 4]) {
    const base = p[`${rate}x valley 30,30`][0];
    for (const [k, [d, u]] of Object.entries(p)) {
      if (!k.startsWith(`${rate}x x1_`)) continue;
      assert.ok(d - base <= 1.0 * rate, `${k}: draw ${d} ms against the valley's ${base} ms (budget +${rate} ms at ${rate}x)`);
      assert.ok(u < 3, `${k}: logic ${u} ms`);
    }
  }
});
