// Episode 6 maps, part A (E6-maps-a, EPISODE6_PLAN 3, 4.1 to 4.4, 4.10): the Dune Lantern Rest and Saffron Haven patches,
// the Airstair, Zephyr Landing and its four interiors. Gust lanes are modeled by E6-world's state search
// (tools/maps/ep6_check.mjs, installed into mapcheck's walk and validate) over the pack's own rule
// (src/data/ep6/field/wind.js); none of these maps has a vane, so every lane is live in the one authored state.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadMap, loadDb, validate, walk, buildGrid, loadStaging, listMapIds } from '../../tools/maps/mapcheck.mjs';
import { compile, live, follow } from '../../src/data/ep6/field/wind.js';

await (await import('../../src/data/ep6/index.js')).register();
const db = await loadDb();
const MINE = ['ep6_airstair', 'ep6_zephyr', 'ep6_zl_inn', 'ep6_zl_shop', 'ep6_zl_workshop', 'ep6_zl_charts'];
const maps = {};
for (const id of [...MINE, 'ep5_saffron', 'ep5_sh_inn']) maps[id] = await loadMap(id);
const staging = loadStaging();
const P = await import('../../src/data/maps/ep6_patches.js');
const { EP6_ZONES } = await import('../../src/data/ep6/encounters.js');
const { EP6_NPCS } = await import('../../src/data/ep6/npcs.js');
const { EP6_LINES } = await import('../../src/data/ep6/text.js');
const { EP6_LIVE } = await import('../../src/game/episodes.js');
const STORY = await import('../../src/data/ep6/story.js');

const byId = (m, id) => m.events.find((e) => e.id === id);
const key = (x, y) => `${x},${y}`;
const F1 = path.join(NEXT, 'src', 'data', 'maps', 'ep6_obs_f1.js');
const live6 = (e, flags) => [].concat(e.if || []).every((f) => flags.has(f)) && ![].concat(e.ifNot || []).some((f) => flags.has(f));
const EP5_DONE = ['ep5_complete', 'haven_restored', 'haven_arrived', 'road_landed', 'ep5_started', 'ship_boarded', 'bells_done',
  'moonwell_woken', 'star_reading_done', 'gnomon_get', 'oracle_defeated', 'ep4_complete', 'ep3_complete', 'ep2_complete', 'ep1_complete'];
const STAIR = [...EP5_DONE, 'ep6_morning_done', 'ep6_started', 'ep6_boarded', 'airstair_arrived'];
/** Errors that only say a wave-6c neighbour's map (E6-maps-b's ep6_obs_f1) is not written yet. */
const pending = (e) => /target map ep6_obs_f1 not found/.test(e) && !fs.existsSync(F1);
/** The maps a door of part A may target (E6-maps-b's floor once it exists). */
const targets = {};
for (const id of listMapIds()) if (id !== 'ep6_patches') targets[id] = await loadMap(id);

// ------------------------------------------------------------------------------------------------ the patches
test('withEp6Wake and withSkyBerth keep every Episode 5 cell, mark and event, only add, and are idempotent', () => {
  for (const [base, fn, added, marks] of [
    [maps.ep5_sh_inn, P.withEp6Wake, ['ep6_wake'], ['bird_sill', 'mira_window6', 'inn_stage6', 'inn_stage6_b']],
    [maps.ep5_saffron, P.withSkyBerth, ['ship_moored', 'sky_berth', 'sky_berth_trig', 'berth_north'], ['berth_stage6', 'berth_stage6_m', 'berth_stage6_b', 'berth_land6']],
  ]) {
    const snap = JSON.stringify(base);
    const p = fn(base);
    assert.equal(JSON.stringify(base), snap, 'the input is not mutated');
    assert.notEqual(p, base);
    for (const k of ['ground', 'legend', 'overlays', 'decor', 'overhead', 'exits', 'start', 'lighting']) assert.deepEqual(p[k], base[k], k);
    for (const [k, v] of Object.entries(base.marks)) assert.deepEqual(p.marks[k], v, `mark ${k}`);
    for (const e of base.events) assert.deepEqual(byId(p, e.id), e, `event ${e.id} unchanged`);
    assert.equal(p.events.length, base.events.length + added.length);
    for (const id of added) assert.ok(byId(p, id), id);
    for (const mk of marks) assert.ok(p.marks[mk], mk);
    assert.equal(fn(p), p, 'idempotent');
    assert.equal(fn({ ...base, id: 'other' }).id, 'other', 'other maps pass through');
    assert.equal(fn(null), null);
  }
  // Valewyn's boat on the same quay is untouched, and the berth never shares its cells
  const s = P.withSkyBerth(maps.ep5_saffron);
  const boat = byId(s, 'haven_boat');
  assert.deepEqual(boat, byId(maps.ep5_saffron, 'haven_boat'));
  for (const id of ['sky_berth', 'berth_north']) assert.ok(byId(s, id).y !== boat.y || byId(s, id).x >= boat.x + boat.w, id);
  // the files never edit an Episode 5 module: no ep5 map file names this pack's ids
  for (const f of ['ep5_saffron.js', 'ep5_sh_inn.js']) {
    const src = fs.readFileSync(path.join(NEXT, 'src', 'data', 'maps', f), 'utf8');
    assert.ok(!/ep6_/.test(src), `${f} untouched`);
  }
});

test('the ep6 pack registers the patched Dune Lantern Rest and Saffron Haven over the ep5 modules', async () => {
  const { peekMap } = await import('../../src/world/maps.js');
  const r = await (await import('../../src/data/ep6/maps.js')).register();
  assert.ok(r.patchFile, 'ep6_patches.js found');
  assert.ok(peekMap('ep5_sh_inn').events.some((e) => e.id === 'ep6_wake'));
  assert.ok(peekMap('ep5_saffron').events.some((e) => e.id === 'sky_berth'));
  for (const id of MINE) assert.ok(r.loaded.includes(id), `${id} registered by the pack`);
});

test('the wake trigger: the guest room, reachable marks, Episode 5 complete, never twice; the switch gates the scene', () => {
  const w = P.withEp6Wake(maps.ep5_sh_inn);
  const t = byId(w, 'ep6_wake');
  assert.deepEqual([t.type, t.script, t.if, t.ifNot, t.on], ['trigger', 'ep6_morning', 'ep5_complete', 'ep6_morning_done', undefined]);
  const inRoom = ([x, y]) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h;
  assert.ok(inRoom(w.marks.inn_bed), 'inn_bed (the credits wake point) stands on the trigger: it fires on arrival there');
  // the room's marks are reachable from inn_bed without a door (a cutscene walk never takes one)
  const room = buildGrid({ ...w, events: w.events.filter((e) => e.type !== 'door') }, db);
  const seen = new Set([key(...w.marks.inn_bed)]);
  const q = [w.marks.inn_bed];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (room.code[ny] && room.code[ny][nx] === 'none' && !seen.has(key(nx, ny))) { seen.add(key(nx, ny)); q.push([nx, ny]); }
    }
  }
  for (const mk of ['mira_window6', 'inn_stage6', 'inn_stage6_b']) assert.ok(seen.has(key(...w.marks[mk])) && inRoom(w.marks[mk]), mk);
  // every cell of the taproom is off the trigger: a party entering from the street meets it at the head of the stair
  assert.ok(!inRoom([10, 10]) && !inRoom([15, 2]), 'the street door and the stair landing are off the trigger');
  assert.ok(seen.has('15,3') && inRoom([15, 3]), 'the first step down from the stair landing is on it');
  // with the switch off the scene does nothing (story.js guard), and the inn walks exactly as Episode 5's
  assert.equal(EP6_LIVE, false, 'EP6_LIVE is off until E6-integrate');
  assert.equal(STORY.SCENE_CONDITIONS.ep6_morning.live, true);
  assert.equal(STORY.GATE.live, EP6_LIVE);
  assert.deepEqual(new Set(walk(w, db, { flags: EP5_DONE }).reachable), new Set(walk(maps.ep5_sh_inn, db, { flags: EP5_DONE }).reachable));
});

test('Saffron Haven with Episode 5 complete and EP6_LIVE off: no ship, no gangway, no trigger, no door, the same walk', () => {
  const p = P.withSkyBerth(maps.ep5_saffron);
  const flags = new Set(EP5_DONE);
  for (const id of ['ship_moored', 'sky_berth', 'sky_berth_trig', 'berth_north']) assert.ok(!live6(byId(p, id), flags), `${id} absent`);
  assert.deepEqual(new Set(walk(p, db, { flags: EP5_DONE }).reachable), new Set(walk(maps.ep5_saffron, db, { flags: EP5_DONE }).reachable));
  // nothing but ep6_morning sets ep6_started, and that scene needs the switch
  assert.ok(STORY.SCENE_CONDITIONS.ep6_board.if === 'ep6_started');
});

test('Saffron Haven with ep6_started / ep6_boarded: the gangway, then the boat to the stack foot; the boat home lands on the quay', () => {
  const p = P.withSkyBerth(maps.ep5_saffron);
  const started = new Set([...EP5_DONE, 'ep6_morning_done', 'ep6_started']);
  const boarded = new Set([...started, 'ep6_boarded']);
  assert.ok(live6(byId(p, 'sky_berth'), started) && live6(byId(p, 'sky_berth_trig'), started) && !live6(byId(p, 'berth_north'), started));
  assert.ok(!live6(byId(p, 'sky_berth'), boarded) && live6(byId(p, 'berth_north'), boarded));
  for (const flags of [started, boarded]) {
    const r = new Set(walk(p, db, { flags: [...flags] }).reachable);
    assert.ok(r.has(key(...P.BERTH.land)), 'the quay cell the gangway is read from is reachable');
    if (flags === boarded) assert.ok(r.has(key(P.BERTH.x, P.BERTH.y)), 'the boat door on the gangway is reachable');
    for (const mk of ['berth_stage6', 'berth_stage6_m', 'berth_stage6_b', 'berth_land6', 'water_stairs']) {
      if (mk !== 'water_stairs') assert.ok(r.has(key(...p.marks[mk])), `mark ${mk} reachable`);
    }
  }
  // the berth door lands on the Airstair's stack_foot, its start, walkable
  const [m1, x1, y1] = byId(p, 'berth_north').to;
  assert.equal(m1, 'ep6_airstair');
  assert.deepEqual([x1, y1], maps.ep6_airstair.marks.stack_foot);
  assert.deepEqual([x1, y1], [maps.ep6_airstair.start.x, maps.ep6_airstair.start.y]);
  // the stack's boat comes home onto the berth's quay cell (not onto the door)
  const back = byId(maps.ep6_airstair, 'stack_boat');
  assert.equal(back.if, 'airstair_arrived');
  assert.deepEqual(back.to.slice(0, 3), ['ep5_saffron', ...P.BERTH.land]);
  const pr = validate(p, db, { ...targets, ep5_saffron: p }, { staging });
  assert.deepEqual(pr.errors, []);
});

// ------------------------------------------------------------------------------------------------ validation
test('every map of part A validates (ids, lines, NPC records, enemy plan, the wind search) and every event is reached', () => {
  for (const id of MINE) {
    const r = validate(maps[id], db, targets, { staging });
    assert.deepEqual(r.errors.filter((e) => !pending(e)), [], id);
    assert.deepEqual(r.walk.unreached || [], [], `${id}: unreached`);
    if (r.walk.wind) assert.equal(r.walk.wind.stranded, 0, `${id}: a reachable state that cannot get back`);
  }
});

test('NPC records of part A each stand once on their map; enemy counts match the zone plan; no foe in town', () => {
  for (const [id, rec] of Object.entries(EP6_NPCS)) {
    if (!MINE.includes(rec.map)) continue;
    assert.equal(maps[rec.map].events.filter((e) => e.type === 'npc' && e.id === id).length, 1, `${id} on ${rec.map}`);
  }
  const got = {};
  for (const e of maps.ep6_airstair.events.filter((x) => x.type === 'enemy')) got[e.encounter] = (got[e.encounter] || 0) + 1;
  assert.deepEqual(got, Object.fromEntries(EP6_ZONES.ep6_airstair.plan));
  for (const id of MINE.slice(1)) assert.equal(maps[id].events.filter((e) => e.type === 'enemy').length, 0, `${id} has no enemies`);
  // the scripted fight's plan anchor never stands on the map (the scene spawns its own two harriers)
  const a = byId(maps.ep6_airstair, 'e_e6a_first');
  for (const flags of [[], ['mira_asked'], ['mira_asked', 'airstair_fight_done']]) assert.ok(!live6(a, new Set(flags)));
  assert.equal(byId(maps.ep6_airstair, 'e_e6a_wolves').if, 'airstair_fight_done');
});

test('every sign, object and book of part A reads a line or book the pack registers; every kit line is read somewhere', () => {
  for (const id of MINE) for (const e of maps[id].events) {
    if (e.type === 'sign' || (e.type === 'object' && e.text)) assert.ok(db.lines[e.text], `${id}: ${e.id} -> ${e.text}`);
    if (e.type === 'book') assert.ok(db.BOOKS[e.book], `${id}: ${e.id} -> ${e.book}`);
  }
  const all = [...MINE.map((id) => maps[id]), P.withSkyBerth(maps.ep5_saffron)];
  for (const k of ['ep6_ship_berth', 'ep6_sea_stack', 'ep6_great_chain', 'ep6_rope_stair', 'ep6_isles_far', 'ep6_winch', 'ep6_gust_lane',
    'ep6_cloudbank', 'ep6_mooring_post', 'ep6_board', 'ep6_chimes', 'ep6_post_rack', 'ep6_beacon', 'ep6_kestrel', 'ep6_dock_four',
    'ep6_cloud_garden', 'ep6_storm_far', 'sign_ep6_inn', 'sign_ep6_shop', 'sign_ep6_workshop', 'sign_ep6_tower',
    'sign_ep6_east_airstair', 'ep6_skychart', 'ep6_manifest_wall']) {
    assert.ok(EP6_LINES[k], k);
    assert.ok(all.some((m) => m.events.some((e) => e.text === k)), `${k} is read somewhere on part A's maps`);
  }
  assert.ok(maps.ep6_zl_charts.events.some((e) => e.type === 'book' && e.book === 'flight_manifests'));
});

// ------------------------------------------------------------------------------------------------ the Airstair
const STACK = maps.ep6_airstair;
const EXIT = STACK.exits[0];

test('the Airstair: from the foot to the town exit through the state search; without the wind the stair is broken', () => {
  const r = new Set(walk(STACK, db, { flags: STAIR }).reachable);
  for (let i = 0; i < EXIT.w; i++) assert.ok(r.has(key(EXIT.x + i, EXIT.y)), 'the exit north is reached');
  assert.deepEqual(EXIT.to, ['ep6_zephyr', ...maps.ep6_zephyr.marks.south_stair, 'up']);
  // the lanes carry the critical path: with the wind block taken away (lane cells are plain cloud) the top is out of reach,
  // and so is the east ledge past landing 3's gap
  const still = { ...STACK, wind: undefined };
  const r0 = new Set(walk(still, db, { flags: STAIR }).reachable);
  assert.ok(!r0.has(key(EXIT.x, EXIT.y)), 'no way up without lane A and lane B');
  assert.ok(!r0.has('15,23'), 'the east ledge needs lane A');
  // and the way home: Zephyr's south stair lands on the top of the stack, which walks back to the boat
  const back = maps.ep6_zephyr.exits[0].to;
  assert.equal(back[0], 'ep6_airstair');
  assert.ok(r.has(key(back[1], back[2])));
  const home = byId(STACK, 'stack_boat');
  assert.ok(r.has(key(home.x, home.y)), 'the boat home is reached from the top too (every state gets back)');
});

test('every lane path on part A terminates, lands where the bot expects, and no actor, trigger or mark stands on a lane', () => {
  const EXPECT = {
    ep6_airstair: { '9,23': ['land', 15, 23], '14,25': ['land', 8, 25], '15,14': ['post', 15, 12], '15,11': ['land', 15, 6], '17,7': ['land', 17, 15] },
    ep6_zephyr: { '17,10': ['land', 17, 13], '35,22': ['land', 30, 22] },
  };
  for (const id of ['ep6_airstair', 'ep6_zephyr']) {
    const m = maps[id];
    const model = compile(m);
    assert.equal(model.groups.length, 0, `${id}: no vane on part A`);
    const L = live(model, { turned: new Set() });
    const W = m.ground[0].length;
    const lane = new Set();
    for (let i = 0; i < L.length; i++) if (L[i] >= 0) lane.add(key(i % W, Math.floor(i / W)));
    const g = buildGrid({ ...m, events: [] }, db);
    for (const k of lane) {
      const [x, y] = k.split(',').map(Number);
      assert.equal(g.code[y][x], 'void', `${id}: lane cell ${k} sits over cloud`);
      const r = follow(model, { turned: new Set() }, [x, y]);
      assert.notEqual(r.stop, 'guard', `${id}: the ride from ${k} ends`);
      assert.ok(r.path.length <= 12, `${id}: ride from ${k} is short`);
    }
    for (const [from, [stop, ex, ey]] of Object.entries(EXPECT[id])) {
      const r = follow(model, { turned: new Set() }, from.split(',').map(Number));
      assert.equal(r.stop, stop, `${id}: ${from}`);
      assert.deepEqual(r.path[r.path.length - 1], [ex, ey], `${id}: ${from} ends on ${ex},${ey}`);
    }
    for (const e of m.events) {
      if (['npc', 'enemy', 'actor', 'trigger', 'chest', 'sign', 'object', 'door'].includes(e.type)) {
        for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) assert.ok(!lane.has(key(e.x + i, e.y + j)) || e.on === 'enter', `${id}: ${e.id} on a lane`);
      }
    }
    for (const [mk, [x, y]] of Object.entries(m.marks)) assert.ok(!lane.has(key(x, y)), `${id}: mark ${mk} on a lane`);
    assert.ok(!lane.has(key(m.start.x, m.start.y)));
  }
});

test('lesson A reads in one phone screen from the stair top; lesson B shows its post from the lane entry', () => {
  // the phone frame is the game's 384 x 216 screen: 24 x 13.5 tiles round the leader, clamped to the map
  const frame = (m, [cx, cy]) => {
    const W = m.ground[0].length, H = m.ground.length;
    const x0 = Math.max(0, Math.min(W - 24, cx - 12)), y0 = Math.max(0, Math.min(H - 13, cy - 6));
    return (x, y) => x >= x0 && x < x0 + 24 && y >= y0 && y < y0 + 13;
  };
  const inA = frame(STACK, [4, 26]);                       // the rope stair's top on landing 3's west deck
  for (const c of [[8, 23], [9, 23], [14, 23], [15, 23], [9, 25], [14, 25], [8, 25], [4, 26]]) assert.ok(inA(...c), `lesson A: ${c} on screen`);
  const inB = frame(STACK, [15, 15]);                      // lane B's entry on landing 4
  for (const c of [[15, 14], [15, 13], [15, 12], [14, 12], [13, 12]]) assert.ok(inB(...c), `lesson B: ${c} on screen`);
  // the landing cell of lane A is ground nothing covers (no decor or event on it)
  assert.ok(!STACK.decor.some((d) => d.x === 15 && d.y === 23) && !STACK.events.some((e) => e.x === 15 && e.y === 23));
  // the post: on lane B's third cell, the ledge beside it with its chest (letter or ether by letters_started)
  const mo = byId(STACK, 'mo_b');
  assert.deepEqual([mo.type, mo.x, mo.y], ['mooring', 15, 12]);
  assert.equal(byId(STACK, 'chest_post_letter').flag, 'letter_1_found');
  assert.equal(byId(STACK, 'chest_post_letter').if, 'letters_started');
  assert.equal(byId(STACK, 'chest_post').ifNot, 'letters_started');
});

test('every chest of part A is reached in some state, and the outcrop chest only once Dash Strike opens the crack', () => {
  for (const flags of [STAIR, [...STAIR, 'letters_started']]) {
    const r = walk(STACK, db, { flags });
    for (const e of STACK.events.filter((x) => x.type === 'chest' && live6(x, new Set(flags)))) assert.ok(!r.unreached.includes(e.id), e.id);
  }
  const c = byId(STACK, 'chest_outcrop');
  assert.equal(c.behind, 'crack_outcrop');
  assert.equal(byId(STACK, 'crack_outcrop').breakable, 'rock');
});

// ------------------------------------------------------------------------------------------------ the town and interiors
test('Zephyr Landing: doors and interiors agree both ways, the east airstair waits for the Windward Pass', () => {
  const Z = maps.ep6_zephyr;
  for (const [door, id] of [['door_inn', 'ep6_zl_inn'], ['door_shop', 'ep6_zl_shop'], ['door_workshop', 'ep6_zl_workshop'], ['door_tower', 'ep6_zl_charts']]) {
    const d = byId(Z, door);
    const m = maps[id];
    assert.deepEqual(d.to.slice(0, 3), [id, m.start.x, m.start.y], door);
    const exit = m.events.find((e) => e.type === 'door' && e.to[0] === 'ep6_zephyr');
    assert.deepEqual(exit.to.slice(1, 3), [d.x, d.y + 1], `${id} exits below its door`);
  }
  const east = byId(Z, 'east_airstair');
  assert.equal(east.if, 'windward_pass');
  assert.deepEqual(east.to, ['ep6_obs_f1', 21, 27, 'up']);
  const before = new Set(walk(Z, db, { flags: [...STAIR, 'zephyr_arrived', 'anchor_learned'] }).reachable);
  assert.ok(before.has('44,6'), 'the causeway is walkable before the pass (east_trig stands on it)');
  for (const t of ['anchor_trig', 'east_trig']) assert.ok(byId(Z, t).if);
  // the two states of the board and the chimes, the beacon's three
  for (const [a, b] of [['board', 'board_landed'], ['chimes_a', 'chimes_a_ring'], ['chimes_b', 'chimes_b_ring'], ['chimes_c', 'chimes_c_ring']]) {
    assert.equal(byId(Z, a).ifNot, 'isles_restored');
    assert.equal(byId(Z, b).if, 'isles_restored');
  }
  assert.ok(byId(Z, 'beacon_rest').rest && byId(Z, 'beacon_rest').safe && byId(Z, 'beacon_rest').if === 'beacon_lit');
  assert.equal(byId(Z, 'beacon_ring').script, 'beacon_light');
  // the Cloudhouse's guest room: the post-credits wake point stands in it
  const inn = new Set(walk(maps.ep6_zl_inn, db).reachable);
  assert.ok(inn.has(key(...maps.ep6_zl_inn.marks.inn_bed)));
  assert.equal(byId(maps.ep6_zl_charts, 'charts_trig').if, 'met_aeris');
});

// ------------------------------------------------------------------------------------------------ STAGING_EP6
/** STAGING_EP6.md section 3: per map heading, the marks it lists ("### `id` (marks `a`, `b`, ...)"). */
function stagingMarks() {
  const md = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP6.md'), 'utf8');
  const out = {};
  for (const line of md.split('\n')) {
    const m = /^### (.+?) \((?:patch: [^;]*; )?marks (.+)\)\s*$/.exec(line);
    if (!m) continue;
    const ids = [...m[1].matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]);
    const marks = [...m[2].matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]);
    for (const id of ids) out[id] = marks;
  }
  return out;
}
// marks that are camera targets over the sky or in a wall: present, never stood on
const PAN_ONLY = new Set(['isles_far', 'storm_far', 'north_far', 'roof_view', 'bird_sill', 'dock_four', 'board']);

test('STAGING_EP6 marks are present on part A, walkable (camera-only marks excepted) and never on a lane cell', () => {
  const S = stagingMarks();
  const patched = { ep5_sh_inn: P.withEp6Wake(maps.ep5_sh_inn), ep5_saffron: P.withSkyBerth(maps.ep5_saffron) };
  const all = { ...maps, ...patched };
  const ids = [...MINE, 'ep5_sh_inn', 'ep5_saffron'];
  // the three small interiors share one heading (counter, forge, inn_bed): the Host and Nova at a counter, Ilex at the forge
  const SPLIT = { ep6_zl_inn: ['counter', 'inn_bed'], ep6_zl_shop: ['counter'], ep6_zl_workshop: ['forge'] };
  for (const [id, want] of Object.entries(SPLIT)) for (const mk of want) assert.ok(S[id].includes(mk), `${id}: ${mk} in the heading`);
  let n = 0;
  for (const id of ids) {
    const list = SPLIT[id] || S[id];
    assert.ok(list && list.length, `STAGING_EP6 lists ${id}`);
    const m = all[id];
    const g = buildGrid({ ...m, events: m.events.filter((e) => e.type === 'door' || e.type === 'object' && e.solid === false) }, db);
    const flags = id === 'ep5_saffron' ? [...EP5_DONE, 'ep6_started'] : id === 'ep5_sh_inn' ? EP5_DONE : STAIR;
    const r = new Set(walk(m, db, { flags }).reachable);
    const standers = new Set(m.events.filter((e) => e.type === 'npc').map((e) => key(e.x, e.y)));
    for (const mk of list) {
      n++;
      assert.ok(m.marks[mk], `${id}: STAGING mark ${mk} present`);
      if (PAN_ONLY.has(mk) || mk === 'water_stairs') continue;
      const [x, y] = m.marks[mk];
      assert.equal(g.code[y][x], 'none', `${id}: mark ${mk} (${x},${y}) is walkable ground`);
      // a speaker's own mark holds the NPC record (the walk never stands on it); every other mark is reached
      if (!standers.has(key(x, y))) assert.ok(r.has(key(x, y)), `${id}: mark ${mk} reached`);
    }
  }
  assert.ok(n >= 90, `checked ${n} marks`);
  // the staging triples: _m one left, _b one right, none on the speaker's own cell
  for (const id of ['ep6_airstair', 'ep6_zephyr', 'ep6_zl_charts', 'ep5_saffron']) {
    const m = all[id];
    for (const [mk, [x, y]] of Object.entries(m.marks)) {
      if (!/_stage6?$/.test(mk) || !m.marks[`${mk}_m`]) continue;
      assert.deepEqual(m.marks[`${mk}_m`], [x - 1, y], `${id}: ${mk}_m one left`);
      assert.deepEqual(m.marks[`${mk}_b`], [x + 1, y], `${id}: ${mk}_b one right`);
    }
  }
});
