// Episode 7 maps, part A (E7-maps-a, EPISODE7_PLAN 3, 4.1 to 4.5, 4.10, 4.11): the Cloudhouse Inn, Chart Room and Zephyr
// Landing patches, the White Road, the Courier's Waystation, Palehaven and its four interiors. The name stones are modeled
// by E7-world's state search (tools/maps/ep7_check.mjs, installed into mapcheck's walk and validate) over the pack's own rule
// (src/data/ep7/field/remember.js). Exact cells in docs/MAPS_EP7_A.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadMap, loadDb, validate, walk, buildGrid, listMapIds } from '../../tools/maps/mapcheck.mjs';

await (await import('../../src/data/ep7/index.js')).register();
const db = await loadDb();
const MINE = ['ep7_white_road', 'ep7_waystation', 'ep7_palehaven', 'ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory', 'ep7_ph_watch'];
const EP6 = ['ep6_zl_inn', 'ep6_zl_charts', 'ep6_zephyr'];
const maps = {};
for (const id of [...MINE, ...EP6]) maps[id] = await loadMap(id);
const P = await import('../../src/data/maps/ep7_patches.js');
const { EP7_NPCS } = await import('../../src/data/ep7/npcs.js');
const { EP7_LINES } = await import('../../src/data/ep7/text.js');
const { ZONES } = await import('../../src/data/encounters.js');
const { lines: EP1_LINES } = await import('../../src/data/story/ep1.js');
const EPISODES = await import('../../src/game/episodes.js');
const STORY = await import('../../src/data/ep7/story.js');
const PATCHED = { ep6_zl_inn: P.withEp7Wake(maps.ep6_zl_inn), ep6_zl_charts: P.withEp7Charts(maps.ep6_zl_charts), ep6_zephyr: P.withNorthBerth(maps.ep6_zephyr) };

const byId = (m, id) => m.events.find((e) => e.id === id);
const key = (x, y) => `${x},${y}`;
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const live = (e, flags) => toList(e.if).every((f) => flags.has(f)) && !toList(e.ifNot).some((f) => flags.has(f));
/** Errors that only say a wave-7c neighbour's map (E7-maps-b's Vault floor and Stillheart) is not written yet. */
const pending = (e) => /target map (ep7_vault_f1|ep7_stillheart) not found/.test(e)
  && !fs.existsSync(path.join(NEXT, 'src', 'data', 'maps', `${/target map (\w+)/.exec(e)[1]}.js`));
const targets = {};
for (const id of listMapIds()) if (id !== 'ep7_patches' && id !== 'ep6_patches' && id !== 'ep5_patches' && id !== 'ep4_patches') targets[id] = await loadMap(id);
Object.assign(targets, PATCHED);

const EP6_DONE = ['ep6_complete', 'isles_restored', 'beacon_lit', 'library_reached', 'scribe_defeated', 'compass_restored',
  'zephyr_arrived', 'met_aeris', 'charts_seen', 'anchor_learned', 'windward_pass', 'ep5_complete', 'ep4_complete', 'ep3_complete',
  'ep2_complete', 'ep1_complete', 'mira_joined', 'bram_joined'];
const STARTED = [...EP6_DONE, 'ep7_morning_done', 'ep7_started'];
const BOARDED = [...STARTED, 'ep7_boarded'];
const ROAD = [...BOARDED, 'road_arrived'];
const ROAD_ON = [...ROAD, 'vex_carved', 'road_fight_done', 'first_stone_read'];
const TOWN = [...ROAD_ON, 'call_learned', 'saw_sevens', 'saw_palehaven', 'palehaven_arrived'];
const KEEPER = [...TOWN, 'met_keeper', 'keeper_told', 'vault_open'];
const REOPENED = [...KEEPER, 'vault_entered', 'phantom_defeated', 'stillheart_restored', 'page_whole', 'nox_named', 'doors_reopened'];

// ------------------------------------------------------------------------------------------------ the patches
test('withEp7Wake, withEp7Charts and withNorthBerth keep every Episode 6 cell, mark and event, only add, and are idempotent', () => {
  for (const [id, fn, added, marks] of [
    ['ep6_zl_inn', P.withEp7Wake, ['ep7_wake'], []],
    ['ep6_zl_charts', P.withEp7Charts, ['ep7_wake_charts', 'opening_stage', 'north_frost', 'north_window_look'],
      ['charts_dawn', 'charts_dawn_m', 'charts_dawn_b', 'aeris_table7', 'compass_table', 'north_window']],
    ['ep6_zephyr', P.withNorthBerth, ['north_gangway', 'north_gangway_trig', 'berth_white_road'],
      ['aeris_gangway7', 'vex_seat', 'gangway7', 'gangway7_m', 'gangway7_b']],
  ]) {
    const base = maps[id];
    const snap = JSON.stringify(base);
    const p = fn(base);
    assert.equal(JSON.stringify(base), snap, `${id}: the input is not mutated`);
    assert.notEqual(p, base);
    for (const k of ['ground', 'legend', 'overlays', 'decor', 'overhead', 'exits', 'start', 'lighting', 'wind']) assert.deepEqual(p[k], base[k], `${id} ${k}`);
    for (const [k, v] of Object.entries(base.marks)) assert.deepEqual(p.marks[k], v, `${id} mark ${k}`);
    for (const e of base.events) assert.deepEqual(byId(p, e.id), e, `${id} event ${e.id} unchanged`);
    assert.equal(p.events.length, base.events.length + added.length);
    for (const a of added) assert.ok(byId(p, a), `${id}: ${a}`);
    for (const mk of marks) assert.ok(p.marks[mk] && !(mk in base.marks), `${id}: mark ${mk} new`);
    assert.equal(fn(p), p, 'idempotent');
    assert.equal(fn({ ...base, id: 'other' }).id, 'other', 'other maps pass through');
    assert.equal(fn(null), null);
  }
  for (const f of ['ep6_zl_inn.js', 'ep6_zl_charts.js', 'ep6_zephyr.js']) {
    assert.ok(!/ep7_/.test(fs.readFileSync(path.join(NEXT, 'src', 'data', 'maps', f), 'utf8')), `${f} untouched`);
  }
});

test('the ep7 pack registers the patched inn, Chart Room and Zephyr Landing over the ep6 modules', async () => {
  const { peekMap } = await import('../../src/world/maps.js');
  const r = await (await import('../../src/data/ep7/maps.js')).register();
  assert.ok(r.patchFile, 'ep7_patches.js found');
  assert.deepEqual([...r.patched].sort(), [...EP6].sort());
  assert.ok(peekMap('ep6_zl_inn').events.some((e) => e.id === 'ep7_wake'));
  assert.ok(peekMap('ep6_zl_charts').events.some((e) => e.id === 'ep7_wake_charts'));
  assert.ok(peekMap('ep6_zephyr').events.some((e) => e.id === 'north_gangway'));
  for (const id of MINE) assert.ok(r.loaded.includes(id), `${id} registered by the pack`);
});

test('the wake triggers: Episode 6 complete, never twice; charts_dawn is CHARTS_STAGE; the switch gates the scene', () => {
  for (const [id, tid] of [['ep6_zl_inn', 'ep7_wake'], ['ep6_zl_charts', 'ep7_wake_charts']]) {
    const t = byId(PATCHED[id], tid);
    assert.deepEqual([t.type, t.script, t.on, t.if, t.ifNot], ['trigger', 'ep7_morning', 'enter', 'ep6_complete', 'ep7_morning_done'], tid);
  }
  const C = PATCHED.ep6_zl_charts;
  assert.deepEqual(C.marks.charts_dawn, STORY.CHARTS_STAGE, 'the warp lands on the mark the scene stages on');
  assert.ok(C.events.some((e) => e.type === 'opening_stage'), 'the ep3 opening_stage event (leaderAt, openingTint)');
  const inner = buildGrid({ ...C, events: [] }, db);
  for (const mk of ['charts_dawn', 'charts_dawn_m', 'charts_dawn_b', 'aeris_table7']) {
    const [x, y] = C.marks[mk];
    assert.equal(inner.code[y][x], 'none', `${mk} walkable`);
  }
  assert.deepEqual([C.marks.aeris_table7[0], C.marks.aeris_table7[1] + 2], C.marks.charts_dawn, 'two rows below Aeris');
  const sky = byId(C, 'skychart');
  assert.ok(C.marks.compass_table[1] === sky.y && C.marks.compass_table[0] >= sky.x && C.marks.compass_table[0] < sky.x + sky.w, 'the skychart cell');
  // the frost shows only between the Episode 6 credits and the morning
  const frost = byId(C, 'north_frost');
  assert.ok(!live(frost, new Set(EP6_DONE.slice(1))) && live(frost, new Set(EP6_DONE)) && !live(frost, new Set(STARTED)));
  assert.ok(live(byId(C, 'north_window_look'), new Set(STARTED)));
  // the switch: with EP7_LIVE off the scene returns at once, so the inn and the Chart Room walk exactly as Episode 6's
  assert.equal(STORY.SCENE_CONDITIONS.ep7_morning.live, true);
  assert.equal(STORY.GATE.live, EPISODES.EP7_LIVE === true);
  for (const id of ['ep6_zl_inn', 'ep6_zl_charts']) {
    assert.deepEqual(new Set(walk(PATCHED[id], db, { flags: EP6_DONE }).reachable), new Set(walk(maps[id], db, { flags: EP6_DONE }).reachable), id);
  }
});

test('Zephyr Landing with Episode 6 complete and EP7_LIVE off: no gangway, no trigger, no door, the same walk', () => {
  const p = PATCHED.ep6_zephyr;
  const flags = new Set(EP6_DONE);
  for (const id of ['north_gangway', 'north_gangway_trig', 'berth_white_road']) assert.ok(!live(byId(p, id), flags), `${id} absent`);
  assert.deepEqual(new Set(walk(p, db, { flags: EP6_DONE }).reachable), new Set(walk(maps.ep6_zephyr, db, { flags: EP6_DONE }).reachable));
  assert.equal(STORY.SCENE_CONDITIONS.ep7_board.if, 'ep7_started', 'only ep7_morning (the switch) sets ep7_started');
  if (EPISODES.EP7_LIVE !== true) assert.equal(STORY.GATE.live, false, 'the switch is off: nothing in Episode 7 is reachable');
});

test('Zephyr Landing with ep7_started, then ep7_boarded: the gangway, then the berth lands at the lake; the Kestrel comes home', () => {
  const p = PATCHED.ep6_zephyr;
  const started = new Set(STARTED), boarded = new Set(BOARDED);
  assert.ok(live(byId(p, 'north_gangway'), started) && live(byId(p, 'north_gangway_trig'), started) && !live(byId(p, 'berth_white_road'), started));
  assert.ok(!live(byId(p, 'north_gangway'), boarded) && live(byId(p, 'berth_white_road'), boarded));
  for (const flags of [STARTED, BOARDED]) {
    const r = new Set(walk(p, db, { flags }).reachable);
    for (const mk of ['gangway7', 'gangway7_m', 'gangway7_b', 'aeris_gangway7', 'vex_seat', 'north_dock']) assert.ok(r.has(key(...p.marks[mk])), `${mk} reachable`);
  }
  assert.ok(new Set(walk(p, db, { flags: BOARDED }).reachable).has(key(P.GANGWAY.x, P.GANGWAY.y)), 'the boat door on the gangway is reachable');
  // the berth lands on the road's start, walkable; the Kestrel's door home lands on the north dock, off the gangway
  const [m1, x1, y1] = byId(p, 'berth_white_road').to;
  const R = maps.ep7_white_road;
  assert.equal(m1, 'ep7_white_road');
  assert.deepEqual([x1, y1], R.marks.lake_landing);
  assert.deepEqual([x1, y1], [R.start.x, R.start.y]);
  const back = byId(R, 'kestrel_back');
  assert.equal(back.if, 'road_arrived');
  assert.deepEqual(back.to.slice(0, 3), ['ep6_zephyr', ...maps.ep6_zephyr.marks.north_dock]);
  assert.notDeepEqual(maps.ep6_zephyr.marks.north_dock, [P.GANGWAY.x, P.GANGWAY.y]);
  assert.deepEqual(validate(p, db, targets, {}).errors.filter((e) => !pending(e)), []);
});

// ------------------------------------------------------------------------------------------------ validation
test('every map of part A validates (ids, lines, NPC records, enemy plan, the stone search) and every event is reached', () => {
  for (const id of MINE) {
    const r = validate(maps[id], db, targets, {});
    assert.deepEqual(r.errors.filter((e) => !pending(e)), [], id);
    assert.deepEqual((r.walk.unreached || []).filter((u) => !(id === 'ep7_palehaven' && ['vault_door', 'nave_door'].includes(u))), [], `${id}: unreached`);
    if (r.walk.stones) assert.equal(r.walk.stones.stranded, 0, `${id}: a reachable state that cannot get back`);
  }
});

test('the White Road: lake to Icegate through the state search, 4 decisions (asta, bo, nyx, senna), no loop home', () => {
  const R = maps.ep7_white_road;
  const r = walk(R, db, { flags: ROAD_ON });
  const reach = new Set(r.reachable);
  for (const mk of ['lake_landing', 'wall_stop', 'stone_stage', 'whiteout_mid', 'waystation_door', 'icegate', 'north_exit', 'ilka_ledge']) {
    assert.ok(reach.has(key(...R.marks[mk])), `${mk} reached`);
  }
  const s = r.stones;
  assert.equal(s.stranded, 0);
  assert.equal(s.decisions, 4, 'plan 4.10: A 1, B 2, C 1');
  assert.deepEqual(s.solution.map((x) => x.split('@')[0]), ['ns_asta', 'ns_bo', 'ns_nyx', 'ns_senna']);
  assert.ok(s.steps <= 1.3 * s.straight, `walk ${s.steps} vs straight ${s.straight}`);
  assert.deepEqual(R.remember.goal, ['waystation_door', 'exit']);
  assert.equal(R.remember.capacity, 2);
  // without the stones the road is broken at the first gap
  const bare = { ...R, remember: { ...R.remember, paths: R.remember.paths.map((row) => row.replace(/[a-z]/g, '.')) } };
  const r0 = new Set(walk(bare, db, { flags: ROAD_ON }).reachable);
  assert.ok(!r0.has(key(...R.marks.north_exit)) && !r0.has(key(...R.marks.ledge_b)));
  // every path has a cairn at each end (two cairns per stone), and the Ilka detour is optional (1 read)
  const cairns = {};
  for (const e of R.events.filter((x) => x.type === 'namestone')) cairns[e.stone] = (cairns[e.stone] || 0) + 1;
  assert.deepEqual(cairns, { a: 2, b: 2, n: 2, i: 2, s: 2 });
  assert.equal(s.firstAt.chest_ilka.length, 2, 'Ilka\'s chest needs her path and Bo\'s held together');
});

test('Gap A reads in one phone screen at the approach; Gap B shows both stones and the ledge together', () => {
  const R = maps.ep7_white_road;
  const view = (cx, cy) => {
    const W = R.ground[0].length, H = R.ground.length;
    const x0 = Math.max(0, Math.min(W - 24, cx - 12)), y0 = Math.max(0, Math.min(H - 13.5, cy - 6.75));
    return ([x, y]) => x >= x0 && x < x0 + 24 && y >= y0 && y + 1 <= y0 + 13.5;
  };
  const asta = byId(R, 'ns_asta'), asta2 = byId(R, 'ns_asta_n');
  const seeA = view(asta.x - 1, asta.y);   // the party reading the stone from the spur
  const aCells = [];
  R.remember.paths.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'a') aCells.push([x, y]); }));
  for (const c of [[asta.x, asta.y], [asta2.x, asta2.y], ...aCells]) assert.ok(seeA(c), `Gap A: ${c} on screen from the stone`);
  const bo = byId(R, 'ns_bo'), nyx = byId(R, 'ns_nyx');
  const seeB = view(bo.x, bo.y + 1);       // the party reading Bo's stone from the south shore
  for (const c of [[bo.x, bo.y], [nyx.x, nyx.y], R.marks.ledge_b]) assert.ok(seeB(c), `Gap B: ${c} on screen from Bo's stone`);
});

test('every chest of part A is reachable in some state; the plaque replaces the ether once Torr has asked', () => {
  for (const id of MINE) {
    for (const flags of [TOWN, [...TOWN, 'streets_started']]) {
      const r = walk(maps[id], db, { flags });
      const reach = new Set(r.reachable);
      for (const c of maps[id].events.filter((e) => e.type === 'chest' && live(e, new Set(flags)))) {
        const ok = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => reach.has(key(c.x + dx, c.y + dy)));
        assert.ok(ok, `${id}: ${c.id} reachable with ${flags.length} flags`);
      }
    }
  }
  const R = maps.ep7_white_road;
  assert.equal(byId(R, 'chest_ilka_plaque').flag, 'street_1_found');
  assert.equal(byId(R, 'chest_ilka_plaque').if, 'streets_started');
  assert.equal(byId(R, 'chest_ilka').ifNot, 'streets_started');
  assert.equal(byId(R, 'strongbox').gold, 1500);
});

test('NPC records of part A each stand once on their map; enemy counts match the zone plan; no foe off the road', () => {
  for (const [id, rec] of Object.entries(EP7_NPCS)) {
    if (!MINE.includes(rec.map)) continue;
    assert.equal(maps[rec.map].events.filter((e) => e.type === 'npc' && e.id === id).length, 1, `${id} on ${rec.map}`);
  }
  const got = {};
  for (const e of maps.ep7_white_road.events.filter((x) => x.type === 'enemy')) got[e.encounter] = (got[e.encounter] || 0) + 1;
  assert.deepEqual(got, Object.fromEntries(ZONES.ep7_white_road.plan));
  for (const id of MINE.slice(1)) assert.equal(maps[id].events.filter((e) => e.type === 'enemy').length, 0, `${id} has no enemies`);
  const anchor = byId(maps.ep7_white_road, 'e_e7w_first');
  for (const flags of [[], ['vex_carved'], ['vex_carved', 'road_fight_done']]) assert.ok(!live(anchor, new Set(flags)), 'the plan anchor never stands');
  assert.equal(byId(maps.ep7_white_road, 'e_e7w_wolves').if, 'road_fight_done');
});

test('every text key on part A is Episode 7\'s own and registered; the save points name their own keys', () => {
  for (const m of [...MINE.map((id) => maps[id]), PATCHED.ep6_zl_charts, PATCHED.ep6_zephyr]) {
    for (const e of m.events) for (const k of [e.text, e.name].filter((x) => typeof x === 'string')) {
      assert.ok(!(k in EP1_LINES), `${m.id} ${e.id}: Episode 1 text key ${k}`);
      if (MINE.includes(m.id)) assert.ok(db.lines[k] || EP7_LINES[k], `${m.id} ${e.id}: line ${k}`);
    }
    for (const e of m.events.filter((x) => x.type === 'book')) assert.ok(db.BOOKS[e.book], `${m.id} ${e.id}: book ${e.book}`);
  }
  assert.equal(byId(maps.ep7_ph_watch, 'save_bell_watch').text, 'ep7_watch_bell');
  assert.equal(byId(maps.ep7_waystation, 'stove_lit').text, 'ep7_stove');
  for (const id of ['stove_lit', 'hearth_lit', 'hearth_dawn', 'watch_cots']) {
    const e = byId(maps.ep7_waystation, id) || byId(maps.ep7_palehaven, id) || byId(maps.ep7_ph_watch, id);
    assert.ok(e.rest, `${id} rests`);
  }
  // the inspect lines STAGING_EP7 section 5 names for part A are each read by some event (the stone looks are E7-world's)
  const used = new Set();
  for (const m of [...MINE.map((id) => maps[id]), PATCHED.ep6_zl_charts]) for (const e of m.events) if (e.text) used.add(e.text);
  for (const k of ['ep7_north_window', 'ep7_frozen_lake', 'ep7_kestrel_lake', 'ep7_snowpine', 'ep7_travelers_wall', 'ep7_fade', 'ep7_ghost_trail',
    'ep7_sol_twine', 'ep7_icegate', 'ep7_palehaven_far', 'ep7_strongbox', 'ep7_tally', 'ep7_post_box', 'ep7_stove', 'ep7_bench', 'ep7_woodpile',
    'ep7_vanishing_mark', 'ep7_iced_door', 'ep7_hearth_cold', 'ep7_beacon_north', 'ep7_keeper_notice', 'ep7_vault_gate', 'ep7_cathedral_far',
    'ep7_aurora_crystal', 'sign_ep7_inn', 'sign_ep7_shop', 'sign_ep7_armory', 'sign_ep7_watch', 'ep7_letters_face', 'ep7_empty_frame',
    'ep7_cold_lamp', 'ep7_watch_oath', 'ep7_watch_bell', 'ep7_watch_cots']) assert.ok(used.has(k), `inspect ${k} read on part A`);
});

test('the two-state objects of Palehaven: the hearth, the iced doors, the Vanishing Mark, the gate, the Vault and nave doors', () => {
  const T = maps.ep7_palehaven;
  const at = (flags) => new Set(T.events.filter((e) => live(e, new Set(flags))).map((e) => e.id));
  const town = at(TOWN), started = at([...TOWN, 'hearth_started']), lit = at([...TOWN, 'hearth_started', 'hearth_lit']), reo = at(REOPENED);
  assert.ok(town.has('hearth') && !town.has('hearth_ring') && !town.has('hearth_lit'));
  assert.ok(started.has('hearth_ring') && byId(T, 'hearth_ring').script === 'hearth_light');
  assert.ok(lit.has('hearth_lit') && !lit.has('hearth_ring'));
  assert.ok(reo.has('hearth_dawn') && !reo.has('hearth'));
  for (const d of ['iced_a', 'iced_b', 'iced_c', 'iced_d', 'iced_e', 'iced_f']) {
    assert.ok(town.has(d) && !town.has(`${d}_open`) && reo.has(`${d}_open`) && !reo.has(d), d);
  }
  assert.ok(town.has('vanishing_mark') && reo.has('vanishing_mark_filled'));
  // the grille closes the gate until vault_open; the Vault door then, the nave door from doors_reopened
  const shut = new Set(walk(T, db, { flags: [...TOWN, 'met_keeper', 'keeper_told'] }).reachable);
  const open = new Set(walk(T, db, { flags: KEEPER }).reachable);
  assert.ok(!shut.has(key(...T.marks.vault_door)) && open.has(key(...T.marks.vault_door)));
  assert.ok(live(byId(T, 'vault_door'), new Set(KEEPER)) && !live(byId(T, 'nave_door'), new Set(KEEPER)) && live(byId(T, 'nave_door'), new Set(REOPENED)));
  assert.deepEqual(byId(T, 'vault_door').to, ['ep7_vault_f1', 20, 27, 'up'], 'plan 4.6: basin (20, 27)');
  for (const [tid, sc] of [['square_page', 'whole_page'], ['square_doors', 'doors_reopen'], ['palehaven_enter', 'palehaven_arrival']]) {
    assert.equal(byId(T, tid).script, sc);
  }
});

test('doors and exits agree both ways between the road, the Waystation, the town and its interiors', () => {
  const R = maps.ep7_white_road, T = maps.ep7_palehaven;
  const land = (to) => { const m = maps[to[0]]; const g = buildGrid({ ...m, events: [] }, db); return g.code[to[2]][to[1]]; };
  assert.deepEqual(R.exits[0].to.slice(0, 3), ['ep7_palehaven', ...T.marks.south_gate]);
  assert.deepEqual(T.exits[0].to.slice(0, 3), ['ep7_white_road', ...R.marks.north_exit]);
  for (const [m, id, other] of [[R, 'door_waystation', 'waystation_exit'], [T, 'door_watch', 'watch_exit'], [T, 'door_inn', 'inn_exit'],
    [T, 'door_shop', 'shop_exit'], [T, 'door_armory', 'armory_exit']]) {
    const d = byId(m, id);
    assert.equal(land(d.to), 'none', `${id} lands on floor`);
    const back = byId(maps[d.to[0]], other);
    assert.equal(back.to[0], m.id);
    assert.equal(land(back.to), 'none', `${other} lands on floor`);
    assert.ok(Math.abs(back.to[1] - d.x) <= 1 && back.to[2] === d.y + 1, `${other} lands in front of ${id}`);
  }
});

// ------------------------------------------------------------------------------------------------ STAGING_EP7
const STAGING = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP7.md'), 'utf8');
const flat = STAGING.replace(/\n\s*/g, ' ');
function stagingMarks(map) {
  const head = new RegExp('### `' + map + '` \\(([^\\n]*)\\)').exec(STAGING);
  if (!head) return [];
  const out = [];
  const txt = head[1].replace(/`crowd_a` to `crowd_f`/, ['a', 'b', 'c', 'd', 'e', 'f'].map((c) => '`crowd_' + c + '`').join(', '));
  for (const m of txt.matchAll(/`(\w+)`/g)) out.push(m[1]);
  return out;
}
function focusMarks(map) {
  const m = new RegExp('Focus marks, `' + map + '` \\([^)]*\\): ((?:`\\w+`(?:, )?)+)').exec(flat);
  return m ? [...m[1].matchAll(/`(\w+)`/g)].map((x) => x[1]) : [];
}
// marks that are camera targets over the white, on a wall face or a solid prop: present, never stood on
const PAN_ONLY = new Set(['gap_a', 'gap_b', 'gap_c', 'palehaven_far', 'cathedral_far', 'vault_gate', 'hearth', 'north_window', 'compass_table',
  'stove', 'tally', 'frame']);
// names in the headings that are events, not marks
const EVENT_NAMES = new Set(['ep7_wake_charts', 'north_frost', 'withEp7Charts', 'withNorthBerth', 'north_gangway', 'berth_white_road', 'fight_row']);

test('STAGING_EP7 marks are present on part A, walkable (camera-only marks excepted), never on a path, frost or fade cell', () => {
  for (const id of [...MINE, 'ep6_zl_charts', 'ep6_zephyr']) {
    const m = PATCHED[id] || maps[id];
    const want = stagingMarks(id).filter((n) => !EVENT_NAMES.has(n) || m.marks[n]);
    assert.ok(['ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory'].includes(id) || want.length, `${id}: STAGING lists marks`);
    const g = buildGrid({ ...m, events: [] }, db);
    const paths = m.remember ? m.remember.paths : null;
    for (const n of want) {
      if (n === 'opening_stage') continue;
      assert.ok(m.marks[n], `${id}: mark ${n}`);
      const [x, y] = m.marks[n];
      if (PAN_ONLY.has(n)) continue;
      assert.equal(g.code[y][x], 'none', `${id}: ${n} (${x},${y}) walkable`);
      assert.notEqual(m.legend[m.ground[y][x]], 'fade', `${id}: ${n} on the fade`);
      if (paths) assert.equal(paths[y][x], '.', `${id}: ${n} on a path cell`);
    }
  }
});

test('the camera rule: every focus mark of STAGING_EP7 on part A sits 12 from the sides and 7 from the top and bottom', () => {
  const rows = [];
  for (const id of [...MINE, 'ep6_zl_charts', 'ep6_zephyr']) {
    const m = PATCHED[id] || maps[id];
    const W = m.ground[0].length, H = m.ground.length;
    for (const n of focusMarks(id)) {
      const [x, y] = m.marks[n];
      if (W > 24) assert.ok(x >= 12 && x <= W - 13, `${id}: ${n} x ${x} (W ${W})`);
      if (H > 13) assert.ok(y >= 7 && y <= H - 8, `${id}: ${n} y ${y} (H ${H})`);
      rows.push(n);
    }
  }
  assert.ok(rows.length >= 25, 'the focus lists were read');
  // the rooms that fit one screen are exempt on both axes
  for (const id of ['ep7_waystation', 'ep7_ph_watch', 'ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory']) {
    assert.ok(maps[id].ground[0].length <= 24 && maps[id].ground.length <= 13, `${id} fits one screen`);
  }
  // the staged trios stand side by side: X_m one left, X_b one right
  for (const id of MINE) {
    const mk = maps[id].marks;
    for (const n of Object.keys(mk)) {
      if (!mk[`${n}_m`] || !mk[`${n}_b`]) continue;
      assert.deepEqual(mk[`${n}_m`], [mk[n][0] - 1, mk[n][1]], `${id}: ${n}_m`);
      assert.deepEqual(mk[`${n}_b`], [mk[n][0] + 1, mk[n][1]], `${id}: ${n}_b`);
    }
  }
});

test('no event, trigger, NPC or enemy of the road stands on a path cell; the triggers cross the whole road', () => {
  const R = maps.ep7_white_road;
  const W = R.ground[0].length;
  for (const e of R.events) {
    for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) {
      const x = e.x + i, y = e.y + j;
      if (e.type === 'trigger' && e.on === 'enter') continue;
      assert.equal(R.remember.paths[y][x], '.', `${e.id} at ${x},${y}`);
    }
  }
  for (const id of ['wall_trig', 'fight_row', 'first_trig', 'whiteout_trig', 'icegate_trig']) {
    const t = byId(R, id);
    assert.ok(t.x === 0 && t.w === W && t.h === 1, `${id} spans the width`);
  }
  // order up the road: the wall, the fight, the first stone, the whiteout, the Icegate
  const ys = ['wall_trig', 'fight_row', 'first_trig', 'whiteout_trig', 'icegate_trig'].map((id) => byId(R, id).y);
  assert.deepEqual([...ys].sort((a, b) => b - a), ys);
});

test('part A files: LF only, ASCII, no em dash', () => {
  const files = [...MINE.map((id) => `src/data/maps/${id}.js`), 'src/data/maps/ep7_patches.js', 'qa/maps/ep7_a_maps.test.mjs',
    'tools/maps/previews/ep7_white_road_render.py', 'docs/MAPS_EP7_A.md'];
  for (const f of files) {
    const p = path.join(NEXT, ...f.split('/'));
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, 'utf8');
    assert.ok(!txt.includes('\r'), `${f}: CR`);
    assert.ok(!txt.includes(String.fromCharCode(0x2014)), `${f}: em dash`);
    assert.ok(/^[\x09\x0a\x20-\x7e]*$/.test(txt), `${f}: non-ASCII`);
  }
});
