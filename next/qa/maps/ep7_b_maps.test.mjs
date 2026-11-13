// Episode 7 maps, part B (E7-maps-b, EPISODE7_PLAN 4.6 to 4.11, 5.4, 7.6): the Frostbound Vault's three floors and the
// Stillheart. The name stone rule is the pack's own (src/data/ep7/field/remember.js); the whole-map state search, the
// authoring and softlock rules, the decision count, the loop-home and 1.3x walk limits are tools/maps/ep7_check.mjs (validate
// runs it). This file adds: the plan tables (enemy plans, stones, named events, the gold line), the STAGING_EP7 marks (present,
// on ground, off every path and frost cell) and the camera rule, the decision budget per floor against plan 4.10, every
// state of every floor free of strands under the real story flags, every chest reachable in some state, the reload-home rule
// (a save anywhere a floor lets the party stand reloads with the authored holds and still reaches a way off), the lifts both
// ways, and the critical path from F1's basin to the Stillheart, F2 starting with Dagny held.
//
// Transitional (wave 7c): Palehaven (E7-maps-a) is built beside this file. While src/data/maps/ep7_palehaven.js does not
// exist in this checkout, the two doors that lead to it (F1's stair, the Stillheart's square_return) report "target map
// ep7_palehaven not found"; that one message is tolerated here and nothing else is. Once Palehaven exists the doors must land
// on its ground.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadAll, loadDb, validate, buildGrid, walk, eventCells, withFlags } from '../../tools/maps/mapcheck.mjs';
import { analyse as analyseRaw, PLAN_BUDGET, TOTAL_BUDGET, MAIN_FLAGS } from '../../tools/maps/ep7_check.mjs';
import { compile } from '../../src/data/ep7/field/remember.js';

await (await import('../../src/data/ep7/index.js')).register();
const db = await loadDb();
const maps = await loadAll();
const { EP7_ZONES } = await import('../../src/data/ep7/encounters.js');
const { EP7_GOLD_LINE } = await import('../../src/data/ep7/shops.js');
const { EP7_STONES } = await import('../../src/data/ep7/text.js');
const FLOORS = ['ep7_vault_f1', 'ep7_vault_f2', 'ep7_vault_f3'];
const MINE = [...FLOORS, 'ep7_stillheart'];
const k = (x, y) => `${x},${y}`;
const DXY = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const byId = (m, id) => m.events.find((e) => e.id === id);
const PALEHAVEN = fs.existsSync(path.join(NEXT, 'src', 'data', 'maps', 'ep7_palehaven.js'));
const transitional = (e) => !PALEHAVEN && /target map ep7_palehaven not found/.test(e);

// the story flags each floor is played under (the real run's, at that floor)
const F1 = ['vault_open', 'vault_entered', 'vault_f1_arrived'];
const F2 = [...F1, 'keeper_memory_1', 'stillheart_key_found', 'vault_f1_done', 'vault_f2_arrived'];
const F2_WON = [...F2, 'keeper_memory_2', 'bell_found', 'lantern_defeated'];
const F3 = [...F2_WON, 'vault_f2_done', 'vault_f3_arrived'];
const F3_OPEN = [...F3, 'keeper_memory_3', 'keeper_came', 'stillheart_open'];
const KEYS = ['stillheart_key'];
// the stone search builds its base grid from every event; under story flags, hand it the map a save with those flags sees
// (an absent closed door must not stand in the way), then search with the flags
const flagged = new Map();
function analyse(m, d, opts = {}) {
  if (!opts.flags) return analyseRaw(m, d, opts);
  const key = opts.flags.join(',');
  let per = flagged.get(m);
  if (!per) flagged.set(m, (per = new Map()));
  if (!per.has(key)) per.set(key, withFlags(m, opts.flags));
  return analyseRaw(per.get(key), d, opts);
}

/** The rule cells (path or frost) of a map, as a Set of "x,y". */
function ruleCells(m) {
  const c = compile(m), out = new Set();
  if (!c) return out;
  for (let i = 0; i < c.N; i++) if (c.owner[i] >= 0 || c.frostOwner[i] >= 0) out.add(k(i % c.W, (i / c.W) | 0));
  return out;
}
/** The door (or opened locked door) to `target` the search reaches: its `to`, or null. */
function doorTo(id, target, opts) {
  const m = maps[id];
  const r = m.remember ? analyse(m, db, opts).report : walk(opts.flags ? withFlags(m, opts.flags) : m, db, opts);
  const cells = new Set(r.reachable);
  const flags = opts.flags ? new Set(opts.flags) : null;
  const on = (e) => !flags || ([].concat(e.if || []).every((f) => flags.has(f)) && [].concat(e.ifNot || []).every((f) => !flags.has(f)));
  for (const e of m.events) {
    if (!Array.isArray(e.to) || e.to[0] !== target || !on(e)) continue;
    if (e.type === 'door' && eventCells(e).some(([x, y]) => cells.has(k(x, y)))) return e.to;
    if (e.type === 'locked_door' && (r.opened || []).includes(e.id)) return e.to;
  }
  return null;
}
const ground = (id) => buildGrid({ ...maps[id], events: [] }, db);

// ------------------------------------------------------------------------------------------------ the maps are clean
test('my four maps validate clean (mapcheck with the ep7 pack: authoring, softlock and decision rules included)', () => {
  for (const id of MINE) {
    assert.ok(maps[id], `${id} exists`);
    const r = validate(maps[id], db, maps);
    assert.deepEqual(r.errors.filter((e) => !transitional(e)), [], `${id}: ${r.errors.join('; ')}`);
    // the Stillheart has no banner by design (EP7_BANNERS stops at F3)
    assert.deepEqual(r.warnings.filter((w) => !(id === 'ep7_stillheart' && /no banner/.test(w))), [], `${id} warnings`);
  }
});

test('the plan tables: enemy plans, the stones (five at most, every one a text key), named events, the gold line', () => {
  for (const id of MINE) {
    const m = maps[id];
    const counts = {};
    for (const e of m.events) if (e.type === 'enemy') counts[e.encounter] = (counts[e.encounter] || 0) + 1;
    for (const [enc, n] of EP7_ZONES[id].plan) {
      if (db.ENCOUNTERS[enc].boss) assert.equal(m.events.filter((e) => e.type === 'actor' && e.id === enc).length, n, `${id} boss ${enc}`);
      else assert.equal(counts[enc] || 0, n, `${id} ${enc}`);
    }
  }
  const stonesOf = (m) => new Set(m.events.filter((e) => e.type === 'namestone').map((e) => e.stone));
  for (const id of FLOORS) {
    const m = maps[id];
    assert.ok(stonesOf(m).size <= 5, `${id}: at most 5 stones`);
    for (const e of m.events.filter((x) => x.type === 'namestone')) {
      assert.ok(Object.values(EP7_STONES).some((s) => s.key === e.name), `${id} ${e.id}: name ${e.name} is an EP7_STONES key`);
      assert.equal(e.sprite, 'name_plate', `${id} ${e.id}: a dungeon plate`);
    }
    assert.equal(m.remember.capacity, 2, `${id}: capacity 2`);
  }
  const need = {
    ep7_vault_f1: ['ns_arvo', 'ns_liesl', 'ns_oskar', 'ns_sigrid', 'chest_key', 'chest_cache', 'chest_boots', 'crate_d', 'crate_e',
      'memory1_trig', 'lift_trig', 'lift_up', 'lift_f1_up', 'font_v1', 'to_palehaven', 'f1_enter'],
    ep7_vault_f2: ['ns_dagny', 'ns_hakon', 'ns_runa', 'ns_tuva', 'ns_kell', 'reliquary_obj', 'chest_reliquary', 'book_keeper', 'page_door',
      'page_flame', 'page_lost', 'memory2_trig', 'bell_trig', 'lantern_trig', 'pale_lantern', 'lift_trig', 'lift_up', 'lift_f2_down',
      'lift_down', 'font_v2', 'font_v2b', 'chest_gallery', 'f2_enter'],
    ep7_vault_f3: ['ns_ylva', 'ns_greta', 'ns_anders', 'ns_ida', 'ns_solveig', 'memory3_trig', 'keeper_trig', 'round_door', 'round_door_open',
      'grate', 'chest_road_home', 'font_v3', 'lift_down', 'charter_book', 'f3_enter'],
    ep7_stillheart: ['white_phantom', 'heart', 'heart_thawed', 'page_block', 'page_block_open', 'nave_down', 'square_return', 'phantom_trig',
      'sh_after', 'sh_ending'],
  };
  for (const [id, ids] of Object.entries(need)) for (const e of ids) assert.ok(byId(maps[id], e), `${id}: ${e}`);
  const f1 = maps.ep7_vault_f1, f2 = maps.ep7_vault_f2, f3 = maps.ep7_vault_f3, sh = maps.ep7_stillheart;
  assert.deepEqual(f2.remember.start, ['d'], 'F2 starts with Dagny held (the grip)');
  assert.ok(f2.remember.frost.some((r) => r.includes('D')) && f2.remember.frost.some((r) => r.includes('R')), 'F2 frost doors D and R');
  assert.equal(byId(f1, 'chest_key').item, 'stillheart_key');
  assert.equal(byId(f1, 'chest_key').flag, 'stillheart_key_found');
  assert.equal(byId(f3, 'grate').key, 'stillheart_key');
  assert.equal(byId(f3, 'ns_solveig').lantern, true, 'the hidden stone is in Keeper ink');
  assert.equal(byId(f3, 'chest_road_home').item, 'road_home');
  assert.equal(byId(f3, 'round_door').ifNot, 'stillheart_open');
  assert.equal(byId(f2, 'reliquary_obj').script, 'ep7_reliquary');
  assert.equal(byId(f2, 'chest_reliquary').if, 'reliquary_open');
  assert.equal(byId(f2, 'chest_reliquary').gold, 450);
  for (const p of ['page_door', 'page_flame', 'page_lost']) assert.equal(byId(f2, p).flag, `${p}_found`);
  assert.equal(byId(sh, 'white_phantom').sprite, 'phantom_avatar');
  assert.equal(byId(sh, 'white_phantom').ifNot, 'phantom_defeated');
  assert.equal(byId(sh, 'square_return').if, 'phantom_defeated');
  assert.equal(byId(sh, 'phantom_trig').if, 'stillheart_open');
  // the gold line (plan 7.6): the chests EP7_GOLD_LINE names hold exactly its gold
  const main = Object.fromEntries(EP7_GOLD_LINE.mainChests.map(([w, , g]) => [w, g]));
  assert.equal(byId(f1, 'chest_cache').gold, main.ep7_vault_f1, 'F1: the Winterwatch Provision Cache');
  assert.equal(byId(f2, 'chest_gallery').gold, main.ep7_vault_f2, 'F2: the Lamp Gallery chest');
  // every font and save point names its own Episode 7 text key (PLAYTEST_REVIEW_8 item 7)
  for (const id of FLOORS) for (const e of maps[id].events.filter((x) => x.type === 'font')) assert.match(e.text, /^ep7_/, `${id} ${e.id}`);
});

// ------------------------------------------------------------------------------------------------ staging and the camera
const STAGING = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP7.md'), 'utf8');
const PAN_ONLY = new Set(['frozen_gate', 'letter_wall', 'bell_bay', 'lantern_spot', 'heart', 'nave_dark', 'memory3_spot', 'stair_foot', 'page_block']);

test('every STAGING_EP7 mark of my maps exists; standing marks are on ground, off every path and frost cell', () => {
  for (const id of MINE) {
    const m = maps[id];
    const line = STAGING.split('\n').find((l) => l.startsWith('### `' + id + '`'));
    assert.ok(line, `STAGING_EP7 has a section for ${id}`);
    const marks = [...line.slice(line.indexOf('(')).matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]);
    const bare = ground(id), rules = ruleCells(m);
    for (const name of marks) {
      const at = m.marks[name];
      assert.ok(at, `${id}: mark ${name}`);
      assert.ok(!rules.has(k(...at)), `${id}: ${name} is off every path and frost cell`);
      if (!PAN_ONLY.has(name)) assert.equal(bare.code[at[1]][at[0]], 'none', `${id}: ${name} (${at}) stands on ground`);
    }
  }
});

test('the camera rule: every focus mark 12 tiles from the sides and 7 from the top and bottom (STAGING_EP7 section 3)', () => {
  for (const id of MINE) {
    const m = maps[id], W = m.ground[0].length, H = m.ground.length;
    const i = STAGING.indexOf('- Focus marks, `' + id + '`');
    assert.ok(i >= 0, `focus marks listed for ${id}`);
    const ends = ['\n- ', '\n\n', '\n#'].map((t) => STAGING.indexOf(t, i + 3)).filter((j) => j > 0);
    const text = STAGING.slice(i, Math.min(...ends));
    const names = [...text.slice(text.indexOf('):') + 2).split('(')[0].matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]);
    assert.ok(names.length >= 4, `${id}: focus list parsed (${names})`);
    for (const n of names) {
      const [x, y] = m.marks[n];
      if (W > 24) assert.ok(x >= 12 && x <= W - 1 - 12, `${id}: ${n} (${x},${y}) is 12 tiles from the sides`);
      if (H > 14) assert.ok(y >= 7 && y <= H - 1 - 7, `${id}: ${n} (${x},${y}) is 7 tiles from the top and bottom`);
    }
  }
  const f2 = maps.ep7_vault_f2, sh = maps.ep7_stillheart, f3 = maps.ep7_vault_f3;
  const bell = f2.decor.find((d) => d.t === 'listening_bell');
  assert.equal(f2.marks.bell_stop[1] - bell.y, 3, 'bell_stop: two clear rows below the tag');
  assert.equal(f2.marks.bell_stop[0], bell.x, 'bell_stop under the bell');
  const trig = byId(f2, 'bell_trig');
  assert.ok(eventCells(trig).some(([x, y]) => Math.abs(x - f2.marks.bell_stop[0]) + Math.abs(y - f2.marks.bell_stop[1]) <= 3), 'bell_trig beside bell_stop');
  // the Phantom and the heart framed together with the party on the phone (one 24 x 13.5 tile view)
  const ph = byId(sh, 'white_phantom'), ps = sh.marks.party_stop, ht = sh.marks.heart;
  for (const p of [[ph.x, ph.y], ht]) assert.ok(Math.abs(p[0] - ps[0]) <= 10 && ps[1] - p[1] >= 2 && ps[1] - p[1] <= 6, `party_stop frames ${p}`);
  // the Keeper waits beside each landing's stone, on ground
  const stones = f3.events.filter((e) => e.type === 'namestone');
  for (const n of ['keeper_wait_1', 'keeper_wait_2']) {
    const w = f3.marks[n];
    assert.ok(stones.some((s) => Math.abs(s.x - w[0]) + Math.abs(s.y - w[1]) === 1), `${n} beside a stone`);
  }
  const rd = byId(f3, 'round_door');
  assert.ok(Math.abs(f3.marks.keeper_wait_3[0] - rd.x) <= 2 && f3.marks.keeper_wait_3[1] === rd.y + 1, 'keeper_wait_3 by the round door');
});

// ------------------------------------------------------------------------------------------------ the decision budget
test('plan 4.10: the critical path of each floor within its decisions (F1 4, F2 3, F3 5), no loop home, at most 1.3x the walk', () => {
  let sum = 0;
  const want = { ep7_vault_f1: 4, ep7_vault_f2: 3, ep7_vault_f3: 5 };
  for (const id of FLOORS) {
    const a = analyse(maps[id], db, {});
    const st = a.report.stones;
    assert.deepEqual(a.errors.filter((e) => /stones|namestone/.test(e)), [], `${id}: ${a.errors.join('; ')}`);
    assert.ok(st.decisions != null, `${id}: the critical path is counted`);
    assert.ok(st.decisions <= PLAN_BUDGET[id], `${id}: ${st.decisions} decisions, plan ${PLAN_BUDGET[id]}`);
    assert.equal(st.decisions, want[id], `${id}: the floor spends its whole share`);
    assert.ok(st.steps <= 1.3 * st.straight, `${id}: walk ${st.steps}, straight ${st.straight}`);
    console.log(`  ${id}: ${st.decisions} decisions, walk ${st.steps} (straight ${st.straight}), reads ${st.solution.join(' ')}`);
    sum += st.decisions;
  }
  assert.ok(sum + PLAN_BUDGET.ep7_white_road <= TOTAL_BUDGET, `the Vault's ${sum} and the White Road's ${PLAN_BUDGET.ep7_white_road} within ${TOTAL_BUDGET}`);
  // the intended solutions (MAPS_EP7_B.md): F2 lets Dagny go forward (the reads that release her are the paths onward)
  assert.deepEqual(analyse(maps.ep7_vault_f2, db, {}).report.stones.solution.map((s) => s.split('@')[0]), ['ns_hakon', 'ns_runa', 'ns_dagny_2']);
  assert.deepEqual(analyse(maps.ep7_vault_f1, db, {}).report.stones.solution.map((s) => s.split('@')[0]), ['ns_arvo', 'ns_liesl', 'ns_arvo_3', 'ns_sigrid']);
  assert.deepEqual(analyse(maps.ep7_vault_f3, db, {}).report.stones.solution.map((s) => s.split('@')[0]),
    ['ns_ylva', 'ns_greta', 'ns_anders', 'ns_ylva_3', 'ns_ida']);
});

test('the stone search under every main-path flag set (MAIN_FLAGS): only the events present, 0 errors, the same decisions', () => {
  const want = { ep7_white_road: 4, ep7_vault_f1: 4, ep7_vault_f2: 3, ep7_vault_f3: 5 };
  for (const [id, sets] of Object.entries(MAIN_FLAGS)) {
    for (const [name, flags] of [['no flags', []], ...Object.entries(sets)]) {
      const a = analyseRaw(maps[id], db, { flags });
      assert.deepEqual(a.errors, [], `${id} [${name}]`);
      assert.equal(a.report.stones.decisions, want[id], `${id} [${name}]: decisions`);
      assert.equal(a.report.stones.stranded, 0, `${id} [${name}]: stranded`);
    }
  }
});

test('the optional reads: F1 side gallery 1 (Oskar, with Liesl held), F2 Reliquary 2 (Tuva and Kell); the Road Home needs the Lantern', () => {
  // F1: from the Liesl landing holding Arvo and Liesl, one read reaches the boots' gallery
  const f1 = maps.ep7_vault_f1;
  const side = analyse({ ...f1, remember: { ...f1.remember, start: ['a', 'l'], goal: ['upper_gallery'] } }, db, { start: f1.marks.liesl_face });
  assert.equal(side.report.stones.decisions, 1, 'F1 side gallery: 1 read');
  const f2 = maps.ep7_vault_f2;
  const rel = analyse({ ...f2, remember: { ...f2.remember, start: ['r', 'd'], goal: ['reliquary'] } }, db, { start: f2.marks.font_b });
  assert.equal(rel.report.stones.decisions, 2, 'F2 Reliquary: 2 reads');
  const f3 = maps.ep7_vault_f3;
  const dark = analyse(f3, db, { lantern: false });
  assert.ok(dark.report.unreached.includes('chest_road_home'), 'without the Lantern the Road Home is out of reach');
  assert.ok(!analyse(f3, db, { lantern: true }).report.unreached.includes('chest_road_home'), 'with it, in reach');
});

// ------------------------------------------------------------------------------------------------ no strands, every chest
test('no state strands the party: under the real story flags every reachable state gets back to a way off', () => {
  const runs = [['ep7_vault_f1', F1], ['ep7_vault_f1', [...F1, 'keeper_memory_1', 'streets_started']], ['ep7_vault_f2', F2], ['ep7_vault_f2', F2_WON],
    ['ep7_vault_f2', [...F2_WON, 'vault_f2_done']], ['ep7_vault_f3', F3], ['ep7_vault_f3', F3_OPEN]];
  for (const [id, flags] of runs) {
    const a = analyse(maps[id], db, { flags, keys: KEYS });
    assert.equal(a.report.stones.stranded, 0, `${id} under ${flags.slice(-2)}`);
    assert.deepEqual(a.errors.filter((e) => /softlock/.test(e)), [], `${id}: ${a.errors.join('; ')}`);
  }
});

test('every chest of my maps is reachable in some state (the Lantern for the Road Home, the Dash crates broken)', () => {
  // no flags means none set (an `if` chest is absent), so a chest gated on a story flag is checked under that flag too
  const PAGES = ['page_door_found', 'page_flame_found', 'page_lost_found', 'reliquary_open'];
  const sets = { ep7_vault_f1: [[], ['streets_started']], ep7_vault_f2: [[], PAGES], ep7_vault_f3: [[]] };
  for (const id of FLOORS) {
    const runs = sets[id].map((flags) => ({ flags: new Set(flags), r: analyseRaw(maps[id], db, { flags, lantern: true, keys: KEYS }).report }));
    const on = (e, f) => [].concat(e.if || []).every((x) => f.has(x)) && [].concat(e.ifNot || []).every((x) => !f.has(x));
    for (const e of maps[id].events.filter((x) => x.type === 'chest')) {
      assert.ok(runs.some(({ flags, r }) => on(e, flags) && !r.unreached.includes(e.id)), `${id}: ${e.id}`);
    }
  }
  const rel = analyse(maps.ep7_vault_f2, db, { flags: [...F2, 'page_door_found', 'page_flame_found', 'page_lost_found', 'reliquary_open'] }).report;
  assert.ok(!rel.unreached.includes('chest_reliquary') && !rel.unreached.includes('book_keeper'), 'the Reliquary chest once opened');
});

// ------------------------------------------------------------------------------------------------ the reload-home rule
test('reload home: a save anywhere on a floor reloads with the authored holds, on ground, and still reaches a way off', () => {
  const runs = [['ep7_vault_f1', F1], ['ep7_vault_f2', F2], ['ep7_vault_f3', F3]];
  const bad = [];
  for (const [id, flags] of runs) {
    const m = maps[id], rules = ruleCells(m), bare = ground(id);
    const all = analyse(m, db, { flags, keys: KEYS }).report;
    const exits = m.events.filter((e) => e.type === 'door' && Array.isArray(e.to) && e.to[0] !== id
      && [].concat(e.if || []).every((f) => flags.includes(f)));
    // every path or frost cell the party could stand on has ground within 3 tiles (the field's rescue lands there)
    for (const c of rules) {
      const [x, y] = c.split(',').map(Number);
      let near = false;
      for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3 && !near; dx++) {
        const nx = x + dx, ny = y + dy;
        if (Math.abs(dx) + Math.abs(dy) <= 3 && ny >= 0 && nx >= 0 && ny < bare.H && nx < bare.W && bare.code[ny][nx] === 'none' && !rules.has(k(nx, ny))) near = true;
      }
      assert.ok(near, `${id}: rule cell ${c} has ground within 3 tiles`);
    }
    // a save on every fourth ground cell the party can reach: with the holds back to `start`, a way off is still reached
    const cells = all.reachable.filter((c) => !rules.has(c)).filter((_, i) => i % 4 === 0);
    for (const c of cells) {
      const [x, y] = c.split(',').map(Number);
      const r = analyse(m, db, { flags, keys: KEYS, start: [x, y] }).report;
      const seen = new Set(r.reachable);
      const home = seen.has(k(m.start.x, m.start.y)) || exits.some((e) => eventCells(e).some(([ex, ey]) => seen.has(k(ex, ey))));
      if (!home) bad.push(`${id} ${c}`);
    }
  }
  assert.deepEqual(bad, [], 'saves that cannot get home');
});

// ------------------------------------------------------------------------------------------------ the lifts and the critical path
test('the lifts both ways from the first build: each shortcut lands on ground beside a font and needs no stone', () => {
  const f1 = maps.ep7_vault_f1, f2 = maps.ep7_vault_f2, f3 = maps.ep7_vault_f3;
  const up = byId(f1, 'lift_f1_up'), down = byId(f2, 'lift_f2_down');
  assert.equal(up.if, 'vault_f2_done');
  assert.equal(down.if, 'vault_f2_done');
  assert.equal(up.to[0], 'ep7_vault_f2');
  assert.equal(down.to[0], 'ep7_vault_f1');
  const besideFont = (m, x, y) => m.events.some((e) => e.type === 'font' && eventCells(e).some(([fx, fy]) => Math.abs(fx - x) + Math.abs(fy - y) === 1));
  for (const [lift, mapId] of [[up, 'ep7_vault_f2'], [down, 'ep7_vault_f1'], [byId(f3, 'lift_down'), 'ep7_vault_f2']]) {
    const g = ground(mapId), [, x, y] = lift.to;
    assert.equal(g.code[y][x], 'none', `${lift.id} lands on ground (${x},${y})`);
    assert.ok(!ruleCells(maps[mapId]).has(k(x, y)), `${lift.id} lands off every rule cell`);
    assert.ok(besideFont(maps[mapId], x, y), `${lift.id} lands beside a font`);
  }
  // with the holds as authored (no read), the landing reaches the other lifts: F2's Lamp Gallery (up, down) and F1's basin
  const noRead = (id, from, flags) => analyse({ ...maps[id], events: maps[id].events.filter((e) => e.type !== 'namestone') }, db, { flags, start: from }).report;
  const g2 = noRead('ep7_vault_f2', [up.to[1], up.to[2]], [...F2_WON, 'vault_f2_done']);
  const s2 = new Set(g2.reachable);
  for (const id of ['lift_up', 'lift_f2_down', 'font_v2b']) assert.ok(eventCells(byId(f2, id)).some(([x, y]) => [[0, 0], ...DXY].some(([dx, dy]) => s2.has(k(x + dx, y + dy)))), `F2 landing reaches ${id} with no read`);
  const g1 = noRead('ep7_vault_f1', [down.to[1], down.to[2]], [...F1, 'vault_f2_done']);
  const s1 = new Set(g1.reachable);
  for (const id of ['lift_f1_up', 'font_v1', 'to_palehaven']) assert.ok(eventCells(byId(f1, id)).some(([x, y]) => [[0, 0], ...DXY].some(([dx, dy]) => s1.has(k(x + dx, y + dy)))), `F1 landing reaches ${id} with no read`);
  // the round trip: F1's basin lift up and F2's lift down both found by the search
  assert.ok(doorTo('ep7_vault_f1', 'ep7_vault_f2', { flags: [...F1, 'vault_f2_done'] }), 'F1 basin -> F2');
  assert.ok(doorTo('ep7_vault_f2', 'ep7_vault_f1', { flags: [...F2_WON, 'vault_f2_done'], start: [up.to[1], up.to[2]] }), 'F2 Lamp Gallery -> F1');
  assert.ok(doorTo('ep7_vault_f3', 'ep7_vault_f2', { flags: F3 }), 'F3 first landing -> F2');
});

test('the critical path: F1 basin to the Stillheart (F2 starting held), every leg landing on ground off every rule cell', () => {
  const legs = [
    ['ep7_vault_f1', 'ep7_vault_f2', { flags: F1 }],
    ['ep7_vault_f2', 'ep7_vault_f3', { flags: F2_WON }],
    ['ep7_vault_f3', 'ep7_stillheart', { flags: F3_OPEN, keys: KEYS }],
  ];
  let at = null;
  for (const [id, next, opts] of legs) {
    const o = at ? { ...opts, start: [at[1], at[2]] } : opts;
    const to = doorTo(id, next, o);
    assert.ok(to, `${id}${at ? ` from ${at[1]},${at[2]}` : ''} reaches ${next}`);
    const g = ground(next);
    assert.equal(g.code[to[2]][to[1]], 'none', `${id} -> ${next} lands on ground (${to[1]},${to[2]})`);
    assert.ok(!ruleCells(maps[next]).has(k(to[1], to[2])), `${id} -> ${next} lands off every rule cell`);
    at = to;
  }
  assert.deepEqual(maps.ep7_vault_f2.remember.start, ['d'], 'F2 is entered with Dagny held');
  // the F2 leg is not open before the Lantern falls, and F3's round door holds until the Keeper opens it
  assert.equal(doorTo('ep7_vault_f2', 'ep7_vault_f3', { flags: F2 }), null, 'no lift up before lantern_defeated');
  assert.equal(doorTo('ep7_vault_f3', 'ep7_stillheart', { flags: F3, keys: KEYS }), null, 'the round door holds before stillheart_open');
  assert.equal(doorTo('ep7_vault_f3', 'ep7_stillheart', { flags: F3_OPEN }), null, 'the grate needs the Stillheart Key');
  // the Stillheart: the stair back always, the square after the win
  const sh = maps.ep7_stillheart;
  assert.ok(doorTo('ep7_stillheart', 'ep7_vault_f3', { flags: F3_OPEN }), 'nave_down back to F3');
  assert.equal(doorTo('ep7_stillheart', 'ep7_palehaven', { flags: F3_OPEN }), null, 'no square_return before the win');
  assert.ok(doorTo('ep7_stillheart', 'ep7_palehaven', { flags: [...F3_OPEN, 'phantom_defeated'] }), 'square_return after the win');
  const back = byId(sh, 'nave_down').to;
  assert.equal(ground('ep7_vault_f3').code[back[2]][back[1]], 'none', 'nave_down lands on F3 ground');
  if (PALEHAVEN) {
    for (const [m, id] of [[maps.ep7_vault_f1, 'to_palehaven'], [sh, 'square_return']]) {
      const to = byId(m, id).to, g = ground('ep7_palehaven');
      assert.equal(g.code[to[2]][to[1]], 'none', `${id} lands on Palehaven ground`);
    }
  }
  // the Palehaven side (E7-maps-a): every door to my maps lands on their ground
  for (const [id, m] of Object.entries(maps)) {
    if (MINE.includes(id)) continue;
    for (const e of m.events || []) {
      if (!Array.isArray(e.to) || !MINE.includes(e.to[0])) continue;
      const g = ground(e.to[0]);
      assert.equal(g.code[e.to[2]][e.to[1]], 'none', `${id} ${e.id} -> ${e.to[0]} (${e.to[1]},${e.to[2]}) lands on ground`);
    }
  }
});
