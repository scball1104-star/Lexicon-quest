// Episode 3 maps (E3-maps, EPISODE3_PLAN 3 to 5): Hollowmere's east gate, the Old Sand Road, Emberpeak and its four
// interiors, the Ashen Foundry F1 to F3 and the Heartforge. The water is modeled by tools/maps/quench.mjs with E3-world's
// own tracer (src/world/ep3/flow.js traceFlow and quenchCells): per spout system every assignment of the reachable
// sluices and every cell a reachable block can be shoved to. Every puzzle's start state solves nothing critical, the
// intended solution does, the critical path needs it, and the softlock rules of plan 5.1 hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, MAP_IDS_EP2, MAP_IDS_EP3, listMapIds, loadAll, loadMap, loadDb, validate, walk, buildGrid, loadStaging, parseStagingChecklist } from '../../tools/maps/mapcheck.mjs';
import { flowGrid, traceWater } from '../../tools/maps/quench.mjs';
import { MAX_BODY } from '../../src/world/ep3/flow.js';
import { EP3_MAPS_LISTED, EP3_ZONE_ORDER, ZONES } from '../../src/data/encounters.js';

const db = await loadDb();
const maps = await loadAll();
const staging = loadStaging();
const ep3Staging = parseStagingChecklist(fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP3.md'), 'utf8'),
  { section: /^## 4\. Marks and named events checklist/m, ep2: true });
const byId = (m, id) => m.events.find((e) => e.id === id);
const reached = (r, id) => { const e = r.events.find((x) => x.id === id); assert.ok(e, `${r.id}: event ${id} exists`); return e.reached; };
const reachedCell = (r, x, y) => r.reachable.includes(`${x},${y}`);
/** The map with every sluice fixed at its authored state and every block turned into an immovable crate (no player input). */
const frozen = (m) => ({ ...m, events: m.events.map((e) => (e.type === 'sluice' ? { ...e, fixed: true } : e.type === 'block' ? { ...e, type: 'object', text: 'ore_crate' } : e)) });
/** The map with these sluices fixed at a state (the rest as authored, turnable). */
const fix = (m, states) => ({ ...m, events: m.events.map((e) => (e.type === 'sluice' && e.id in states ? { ...e, state: states[e.id], fixed: true } : e)) });

const PROGRESS = {
  sand_road: { flags: ['sand_gate_open', 'sand_road_arrived'] },
  emberpeak: { flags: ['pk_arrived', 'met_veyra', 'met_ilya', 'foundry_entered'] },
  pk_inn: {}, pk_shop: {}, pk_smithy: { flags: ['met_ilya', 'forge_relit'] }, pk_bellhouse: { flags: ['mirror_sigil_get', 'pk_arrived'] },
  foundry_f1: { flags: ['foundry_entered', 'foundry_f1_arrived', 'sand_started'] },
  foundry_f2: { flags: ['foundry_f1_done', 'foundry_f2_arrived', 'ledger_found', 'bellows_specter_defeated', 'foundry_f2_done'], lantern: true },
  foundry_f3: { flags: ['foundry_f2_done', 'foundry_f3_arrived'], keys: ['crucible_hook'], lantern: true },
  foundry_heart: { flags: ['bell_gate_open', 'cinder_warden_defeated'] },
};
const walks = {};
const walkOf = (id) => (walks[id] ||= walk(maps[id], db, PROGRESS[id] || {}));

test('the ten maps exist, live in the ep3 pack folder (never the precached core) and EP3_MAPS_LISTED lists their zones', () => {
  for (const id of MAP_IDS_EP3) {
    assert.ok(listMapIds().includes(id), id);
    assert.ok(fs.existsSync(path.join(NEXT, 'src', 'data', 'maps', 'ep3', `${id}.js`)), `${id} in src/data/maps/ep3/`);
    assert.ok(!fs.existsSync(path.join(NEXT, 'src', 'data', 'maps', `${id}.js`)), `${id} is not a core module`);
  }
  assert.equal(EP3_MAPS_LISTED, true);
  for (const z of EP3_ZONE_ORDER) { assert.ok(Object.keys(ZONES).includes(z), `${z} listed`); assert.ok(maps[z], `${z} has a map`); }
  // the core nameless_hollow.js and nh_inn.js are untouched by Episode 3: no east gate in the module itself
  const core = fs.readFileSync(path.join(NEXT, 'src', 'data', 'maps', 'nameless_hollow.js'), 'utf8');
  assert.ok(!/sand_chain|sand_road/.test(core), 'the gate rides on the pack');
});

test('the pack entry registers every map and the two edited core maps under their own ids', async () => {
  const pack = await import('../../src/data/maps/ep3/index.js');
  const r = await pack.register();
  assert.deepEqual([...r.loaded].sort(), [...MAP_IDS_EP3, 'nameless_hollow', 'nh_inn'].sort());
  const { loadMap: fieldLoad } = await import('../../src/world/maps.js');
  for (const id of MAP_IDS_EP3) assert.equal((await fieldLoad(id)).id, id);
  assert.ok((await fieldLoad('nameless_hollow')).events.some((e) => e.id === 'sand_chain'));
  assert.ok((await fieldLoad('nh_inn')).marks.smith_seat);
});

test('every Episode 3 map validates (ids, targets, NPC coverage, enemy plan, STAGING_EP3 marks and named events)', () => {
  for (const id of [...MAP_IDS_EP3, 'nameless_hollow', 'nh_inn']) {
    const r = validate(maps[id], db, maps, { staging });
    assert.deepEqual(r.errors, [], id);
  }
  for (const id of ['nameless_hollow', 'sand_road', 'emberpeak', 'pk_bellhouse', 'foundry_f1', 'foundry_f2', 'foundry_f3', 'foundry_heart', 'nh_inn']) assert.ok(ep3Staging[id], `STAGING_EP3 row ${id}`);
});

test('every STAGING_EP3 mark a scene walks to is walkable and reached under the episode flags', () => {
  const WALK_TO = {
    nameless_hollow: ['sand_gate', 'vessa_gate', 'penny_cart_h'], sand_road: ['town_gate', 'smith_crate', 'rise_smith'],
    emberpeak: ['memorial', 'bellhouse_door', 'bell_rope', 'gather_veyra', 'gather_ilya', 'gather_rusk', 'gather_bess', 'gather_garrick', 'gate_smith', 'memorial_smith'],
    pk_bellhouse: ['bellhouse_in'], foundry_heart: ['party_stop', 'garrick_anvil', 'bram_anvil', 'garrick_enter'], foundry_f3: ['gate_spot'],
  };
  const hollow = walk(maps.nameless_hollow, db, { flags: ['ep2_complete', 'ep3_started'] });
  for (const [id, names] of Object.entries(WALK_TO)) {
    const r = id === 'nameless_hollow' ? hollow : walkOf(id);
    for (const n of names) {
      const mk = r.marks.find((m) => m.name === n);
      assert.ok(mk, `${id} mark ${n}`);
      assert.ok(mk.walkable && mk.reached, `${id} mark ${n} at ${mk.x},${mk.y} walkable ${mk.walkable} reached ${mk.reached}`);
    }
  }
});

// ------------------------------------------------------------------------------------------------ Hollowmere's east gate
test('Hollowmere: the east gate is chained with Episode 2 complete and opens only with sand_gate_open', async () => {
  const ep2 = walk(maps.nameless_hollow, db, { flags: ['ep1_complete', 'ep2_complete', 'nh_restored'] });
  assert.equal(reached(ep2, 'sand_chain'), true, 'the chain is seen');
  assert.equal(ep2.events.find((e) => e.id === 'sand_gate_exit'), undefined, 'no exit before the gate opens');
  const mid = walk(maps.nameless_hollow, db, { flags: ['ep1_complete', 'ep2_complete', 'ep3_started'] });
  assert.equal(mid.events.find((e) => e.id === 'sand_gate_exit'), undefined, 'still no exit before sand_gate (the scene) opens it');
  assert.equal(reached(mid, 'sand_gate_trig'), true, 'the trigger is on the spur');
  const open = walk(maps.nameless_hollow, db, { flags: ['ep1_complete', 'ep2_complete', 'ep3_started', 'sand_gate_open'] });
  assert.equal(reached(open, 'sand_gate_exit'), true);
  assert.deepEqual(byId(maps.nameless_hollow, 'sand_gate_exit').to.slice(0, 3), ['sand_road', 1, 22]);
  assert.equal(byId(maps.nameless_hollow, 'sand_chain').ifNot, 'sand_gate_open');
  assert.equal(byId(maps.nameless_hollow, 'sand_gate_trig').if, 'ep3_started');
  // every Episode 2 mark, event and reachable cell of the core module is unchanged
  const core = await loadMap('nameless_hollow', { unpatched: true });
  for (const [k, v] of Object.entries(core.marks)) assert.deepEqual(maps.nameless_hollow.marks[k], v, `mark ${k}`);
  for (const e of core.events) assert.deepEqual(byId(maps.nameless_hollow, e.id), e, `event ${e.id}`);
  const before = walk(core, db, { flags: ['ep1_complete', 'ep2_complete', 'nh_restored'] });
  const after = new Set(ep2.reachable);
  const GATE_CELLS = new Set(['42,25', '42,26', '42,27', '42,28']);   // the two gateposts and the chain stand there now
  for (const c of before.reachable) if (!GATE_CELLS.has(c)) assert.ok(after.has(c), `cell ${c} still reachable`);
  assert.deepEqual(before.unreached, ep2.unreached.filter((id) => byId(core, id)), 'the same Episode 2 events reached');
});

// ------------------------------------------------------------------------------------------------ the critical path
test('the Episode 3 critical path: Hollowmere -> sand road -> Emberpeak -> F1 -> F2 -> F3 -> Heartforge -> lift home', () => {
  const link = (from, id, to) => {
    const e = byId(maps[from], id) || (maps[from].exits || []).find((x) => x.to[0] === to);
    assert.ok(e, `${from} has a way to ${to}`);
    assert.equal((e.to || [])[0], to, `${from} ${id} -> ${to}`);
    return e;
  };
  link('nameless_hollow', 'sand_gate_exit', 'sand_road');
  const toTown = link('sand_road', null, 'emberpeak');
  assert.ok(reachedCell(walkOf('sand_road'), toTown.x, toTown.y), 'the road reaches the town gate (over the crust)');
  assert.equal(reached(walkOf('emberpeak'), 'foundry_lift'), true);
  link('emberpeak', 'foundry_lift', 'foundry_f1');
  assert.equal(reached(walkOf('foundry_f1'), 'gate_lift'), true);
  assert.ok(walkOf('foundry_f1').opened.includes('gate_lift'), 'the wheel opens the lift');
  link('foundry_f1', 'gate_lift', 'foundry_f2');
  assert.equal(reached(walkOf('foundry_f2'), 'stairs_f3'), true);
  assert.equal(reached(walkOf('foundry_f2'), 'specter_trig'), true);
  link('foundry_f2', 'stairs_f3', 'foundry_f3');
  const f3 = walkOf('foundry_f3');
  for (const a of ['anvil_hand', 'anvil_heart', 'anvil_home', 'vex_trig', 'gate_trig']) assert.equal(reached(f3, a), true, a);
  assert.ok(f3.opened.includes('bell_gate') && f3.opened.includes('door_heart'), 'the three oaths open the Bell Gate; the hook the door');
  link('foundry_f3', 'door_heart', 'foundry_heart');
  assert.equal(reached(walkOf('foundry_heart'), 'warden_trig'), true);
  assert.equal(reached(walkOf('foundry_heart'), 'lift_heart_up'), true);
  link('foundry_heart', 'lift_heart_up', 'emberpeak');
  assert.deepEqual(byId(maps.foundry_heart, 'lift_heart_up').to.slice(0, 3), ['emberpeak', 19, 6]);
  // shortcuts back to F1's landing
  assert.equal(byId(maps.foundry_f2, 'lift_f2_short').if, 'foundry_f2_done');
  assert.equal(byId(maps.foundry_f3, 'lift_f3_short').if, 'foundry_f3_arrived');
});

test('every Episode 3 chest is reachable (Lantern, Ash Keys, the sand side story) and no event is out of reach', () => {
  for (const id of MAP_IDS_EP3) {
    const r = walkOf(id);
    const chests = maps[id].events.filter((e) => e.type === 'chest');
    for (const c of chests) assert.equal(reached(r, c.id), true, `${id} ${c.id}`);
    // the lift home of the Heartforge and the lit forge are flag-gated decor-like doors: everything else is reached
    assert.deepEqual(r.unreached, [], `${id} unreached (log: ${r.log.join('; ')})`);
  }
  // the Tempered Lexicon Blade needs the Lantern
  assert.equal(reached(walk(maps.foundry_f3, db, { ...PROGRESS.foundry_f3, lantern: false }), 'chest_blade'), false);
});

test('enemy and chest tables match the plan', () => {
  const count = (id, type) => maps[id].events.filter((e) => e.type === type).length;
  assert.deepEqual(MAP_IDS_EP3.map((id) => [id, count(id, 'enemy')]).filter(([, n]) => n),
    [['sand_road', 3], ['foundry_f1', 6], ['foundry_f2', 3], ['foundry_f3', 4]]);   // E3-fixes-world: four foes cut (PLAYTEST_REVIEW_5 1d)
  const tiers = (id) => maps[id].events.filter((e) => e.type === 'chest').map((e) => e.tier).sort().join(',');
  assert.equal(tiers('sand_road'), 'iron,wood');
  assert.equal(tiers('foundry_f1'), 'gold,gold,iron,wood,wood,wood');
  assert.equal(tiers('foundry_f2'), 'gold,iron,wood,wood');
  assert.equal(tiers('foundry_f3'), 'gold,iron,wood');
  assert.equal(byId(maps.foundry_f1, 'chest_key').flag, 'ash_key_f1');
  assert.equal(byId(maps.foundry_f2, 'chest_key2').flag, 'ash_key_f2');
  assert.equal(byId(maps.foundry_f1, 'chest_hook').flag, 'crucible_hook_found');
  assert.equal(byId(maps.foundry_f1, 'chest_hopper').if, 'sand_started');
  assert.equal(byId(maps.foundry_f2, 'chest_cache').if, 'ledger_found');
});

// ------------------------------------------------------------------------------------------------ the puzzles
// Each puzzle: frozen (no paddle turned, no crate shoved) its goal is out of reach; with the walk's search it is reached;
// with the documented solution fixed in place it is reached too.
const PUZZLES = [
  { map: 'sand_road', goal: (r) => reachedCell(r, 50, 7), solution: { sl_road: 1 }, name: 'the slag river (sl_road)' },
  { map: 'foundry_f1', goal: (r) => reachedCell(r, 28, 17), solution: { sl_b: 1 }, name: 'F1 B, the Slag Hall' },
  { map: 'foundry_f1', goal: (r) => reached(r, 'chest_key'), name: 'F1 C, the dam (Shove ore_c)' },
  { map: 'foundry_f1', goal: (r) => reached(r, 'chest_hook'), solution: { sl_d: 1 }, name: 'F1 D, the balcony span' },
  { map: 'foundry_f1', goal: (r) => r.opened.includes('gate_lift'), solution: { sl_b: 1, sl_d: 1, sl_f1: 1, sl_f2: 1 }, name: 'F1 F, the wheel' },
  { map: 'foundry_f2', goal: (r) => reached(r, 'records_cage'), solution: { sl_g: 1 }, name: 'F2 B, the hot gates' },
  { map: 'foundry_f2', goal: (r) => reached(r, 'specter_trig'), solution: { sl_g: 1, sl_d1: 1, sl_d2: 1 }, name: 'F2 D, the series' },
  { map: 'foundry_f3', goal: (r) => reached(r, 'anvil_hand'), solution: { sl_h1: 0, sl_h2: 1 }, name: 'F3 the Hand' },
  { map: 'foundry_f3', goal: (r) => reached(r, 'anvil_heart'), solution: { sl_k1: 1, sl_k2: 1 }, name: 'F3 the Heart' },
  { map: 'foundry_f3', goal: (r) => reached(r, 'anvil_home'), solution: { sl_home: 0 }, name: 'F3 the Home (cool the plug, then dam the junction)' },
];
for (const p of PUZZLES) {
  test(`${p.name}: the start state solves nothing, the intended solution does`, () => {
    const opts = PROGRESS[p.map] || {};
    assert.equal(p.goal(walk(frozen(maps[p.map]), db, opts)), false, 'frozen: out of reach');
    assert.equal(p.goal(walkOf(p.map)), true, 'searched: reached');
    if (p.solution) assert.equal(p.goal(walk(fix(maps[p.map], p.solution), db, opts)), true, 'the documented solution reaches it');
  });
}

test('F1 B teaches permanence: the start state crusts pool 1 (the ledge) and nothing on the way east', () => {
  const r = walkOf('foundry_f1');
  const start = new Set(r.water.startCrust);
  assert.ok(start.has('14,17') && start.has('15,20'), 'pool 1 cools whole the moment the floor loads');
  assert.ok(![...start].some((k) => +k.split(',')[0] >= 24), 'pool 2 stays molten until the paddle turns');
  assert.ok(r.water.crust.includes('24,14') && r.water.crust.includes('14,14'), 'both pools end crusted');
});

test('F1 C: the crate dams the trough where it stands; shoved, the water goes on', () => {
  const f1 = walkOf('foundry_f1');
  assert.ok(!f1.water.startFilled.includes('bs_c'), 'the crate dams bs_c');
  assert.ok(f1.water.basinConfigs.bs_c.blocks.ore_c, 'filled with the crate moved');
});

// F3 Home (PLAYTEST_REVIEW_5 #6): the order puzzle. Turn sl_home to cool the plug, then Shove the crate over it into the
// junction's straight arm; the dammed water takes the south arm into the lake round the anvil.
test('F3 Home: an order puzzle: the paddle alone cools only the plug, the crate alone moves nowhere, both in turn cool the lake', () => {
  const f3 = walkOf('foundry_f3');
  const LAKE = '23,28', PLUG = '22,27';
  assert.ok(!f3.water.startCrust.includes(PLUG) && !f3.water.startCrust.includes(LAKE), 'the start state cools nothing');
  assert.deepEqual(f3.water.start.splashes.filter((s) => s.y >= 26).map((s) => [s.x, s.y, s.floor]), [[25, 26, true]], 'the start water puddles at the entrance');
  const plug = f3.water.crustConfigs.find((c) => c.cell === PLUG);
  assert.deepEqual(plug.states, { sl_home: 0 }, "the plug cools with the paddle turned '/'");
  assert.deepEqual(plug.blocks.ore_home, [22, 29], 'with the crate where it stands');
  const lake = f3.water.crustConfigs.find((c) => c.cell === LAKE);
  assert.deepEqual(lake.states, { sl_home: 0 }, 'the lake needs the paddle turned too');
  assert.deepEqual(lake.blocks.ore_home, [22, 26], 'and the crate in the corner (22,26), over the cooled plug');
  // the paddle alone: the plug cools, the lake does not
  const paddle = walk({ ...maps.foundry_f3, events: maps.foundry_f3.events.map((e) => (e.id === 'ore_home' ? { ...e, type: 'object', text: 'ore_crate' } : e)) }, db, PROGRESS.foundry_f3);
  assert.ok(paddle.water.crust.includes(PLUG) && !paddle.water.crust.includes(LAKE), 'paddle only: plug crust, lake molten');
  assert.equal(reached(paddle, 'anvil_home'), false);
  // the crate alone (paddle fixed at its start): the plug never cools, so the crate never reaches the corner
  const crate = walk(fix(maps.foundry_f3, { sl_home: 1 }), db, PROGRESS.foundry_f3);
  assert.ok(!crate.water.crust.includes(PLUG) && !crate.water.crust.includes(LAKE), 'crate only: nothing cools');
  assert.equal(reached(crate, 'anvil_home'), false);
  assert.equal(reached(f3, 'anvil_home'), true, 'both, in turn: the anvil');
});

test('softlock rules (plan 5.1): basins latch, troughs are walkable, every sluice is reachable, systems stay small, slag pools are bodies of 96 or fewer', () => {
  for (const id of MAP_IDS_EP3) {
    const m = maps[id];
    const r = walkOf(id);
    for (const b of m.events.filter((e) => e.type === 'basin')) assert.equal(b.latch, true, `${id} ${b.id} latches`);
    for (const s of m.events.filter((e) => e.type === 'sluice')) assert.equal(reached(r, s.id), true, `${id} ${s.id} reachable`);
    for (const sys of (r.water || { systems: [] }).systems) assert.ok(sys.sluices.length <= 6, `${id} system ${sys.spouts} has ${sys.sluices.length} sluices`);
    const fg = flowGrid(m, db);
    const g = buildGrid({ ...m, events: [] }, db);
    const seen = new Set();
    for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
      if (fg[y][x] === 'channel') assert.equal(g.code[y][x], 'none', `${id} trough at ${x},${y} walkable`);
      if (fg[y][x] !== 'slag' || seen.has(`${x},${y}`)) continue;
      let n = 0; const q = [[x, y]]; seen.add(`${x},${y}`);
      while (q.length) {
        const [cx, cy] = q.pop(); n++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`;
          if (nx < 0 || ny < 0 || nx >= g.W || ny >= g.H || seen.has(k) || fg[ny][nx] !== 'slag') continue;
          seen.add(k); q.push([nx, ny]);
        }
      }
      assert.ok(n <= MAX_BODY, `${id} slag body at ${x},${y} has ${n} cells (max ${MAX_BODY})`);
    }
  }
});

test('water never takes walkable floor away: crust only adds, a parked crate never walls the party in', () => {
  for (const id of MAP_IDS_EP3) {
    const m = maps[id];
    if (!m.events.some((e) => e.type === 'block')) continue;
    // with every block solid where it stands, the party still reaches the start's exits (troughs and floor round it)
    const solidBlocks = { ...m, events: m.events.map((e) => (e.type === 'block' ? { ...e, type: 'object', text: 'ore_crate' } : e)) };
    const r = walk(solidBlocks, db, PROGRESS[id] || {});
    for (const e of m.events.filter((x) => x.type === 'door' && x.to && x.to[0] !== id && !x.if)) assert.equal(reached(r, e.id), true, `${id} ${e.id}`);
  }
});

test('the tools trace with the field: traceWater is src/world/ep3/flow.js (corners follow trough arms)', () => {
  const m = maps.foundry_f1;
  const fg = flowGrid(m, db);
  const t = traceWater({ w: 40, h: 30, flow: (x, y) => fg[y][x], arms: (x, y) => fg.arms[y][x], solid: () => false,
    sources: [{ id: 'sp_e', x: 22, y: 1, dir: 'down' }], sluices: [{ id: 'sl_f1', x: 22, y: 6, state: 1 }, { id: 'sl_f2', x: 36, y: 6, state: 1 }],
    basins: [{ id: 'bs_wheel', x: 36, y: 23, face: 'up' }] });
  assert.ok(t.filled.has('bs_wheel'), 'the wheel line runs E3-world\'s tracer to the wheel');
  assert.ok(t.crust.has('29,7'), 'the whole little pool in C cools (quenchCells)');
});
