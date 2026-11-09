// Episode 5 maps, part A (E5-maps-a, EPISODE5_PLAN 3, 4.1 to 4.5, 4.10): the Floodwatch Inn and Valewyn patches, the
// Saffron Wind, the Caravan Road, Saffron Haven and its four interiors. Sun and shade are modeled by the pack's own rule
// (src/data/ep5/field/shade.js): `frozen(map, hour)` turns every sand cell that runs at that hour into running_sand (water)
// and every shade event into a plain solid object, so mapcheck's plain walk answers "can the party get there at this
// hour"; the whole-map state search (every hour, latches) is tools/maps/ep5_check.mjs, which validate() runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadAll, loadDb, validate, walk, buildGrid, loadStaging } from '../../tools/maps/mapcheck.mjs';
import { light, runMask } from '../../src/data/ep5/field/shade.js';

await (await import('../../src/data/ep5/index.js')).register();
const db = await loadDb();
const MINE = ['ep5_ship', 'ep5_caravan_road', 'ep5_saffron', 'ep5_sh_inn', 'ep5_sh_shop', 'ep5_sh_smithy', 'ep5_sh_observatory'];
const maps = await loadAll();
const staging = loadStaging();
const P = await import('../../src/data/maps/ep5_patches.js');
const valewyn = (await import('../../src/data/maps/ep4_valewyn.js')).default;
const vwInn = (await import('../../src/data/maps/ep4_vw_inn.js')).default;
const { EP5_ZONES } = await import('../../src/data/ep5/encounters.js');
const { EP5_NPCS } = await import('../../src/data/ep5/npcs.js');
const { EP5_LINES } = await import('../../src/data/ep5/text.js');
const { EP5_LIVE } = await import('../../src/game/episodes.js');

const byId = (m, id) => m.events.find((e) => e.id === id);
const key = (x, y) => `${x},${y}`;
const LAB_F1 = path.join(NEXT, 'src', 'data', 'maps', 'ep5_lab_f1.js');
const EP4_DONE = ['ep4_complete', 'vw_restored', 'vw_arrived', 'saw_valewyn', 'keep_ferry_open', 'paper_regent_defeated', 'ep3_complete', 'ep2_complete', 'ep1_complete'];
const live = (e, flags) => [].concat(e.if || []).every((f) => flags.has(f)) && ![].concat(e.ifNot || []).some((f) => flags.has(f));

/** The map frozen at one hour: running sand as water, shade events as solid objects, no shade block (walk() is plain). */
function frozen(m, hour) {
  const W = m.ground[0].length;
  const g = buildGrid({ ...m, events: [] }, db);
  const solid = new Uint8Array(W * m.ground.length);
  for (let y = 0; y < m.ground.length; y++) for (let x = 0; x < W; x++) if (g.code[y][x] === 'solid' || g.code[y][x] === 'void') solid[y * W + x] = 1;
  const run = runMask(m, { hour, solid }, light(m, { hour, solid }));
  const rows = m.ground.map((r) => r.split(''));
  for (let i = 0; i < run.length; i++) if (run[i]) rows[Math.floor(i / W)][i % W] = '¤';
  const events = m.events.map((e) => (['sundial', 'standstone', 'lampcart'].includes(e.type) ? { ...e, type: 'object', sprite: 'obelisk', text: 'ep5_obelisk' } : e));
  const { shade, ...rest } = m;
  return { ...rest, legend: { ...m.legend, '¤': 'running_sand' }, ground: rows.map((r) => r.join('')), events };
}
const reachAt = (m, hour, opts = {}) => new Set(walk(frozen(m, hour), db, opts).reachable);

// ------------------------------------------------------------------------------------------------ the patches
test('withEp5Wake and withShipBerth keep every Episode 4 cell, mark and event, only add, and are idempotent', () => {
  for (const [base, fn, added] of [
    [vwInn, P.withEp5Wake, ['ep5_wake']],
    [valewyn, P.withShipBerth, ['ship_moored', 'ship_moored_sign', 'ship_berth', 'berth_sail', 'berth_south']],
  ]) {
    const p = fn(base);
    assert.notEqual(p, base);
    assert.deepEqual(p.ground, base.ground);
    assert.deepEqual(p.overlays, base.overlays);
    assert.deepEqual(p.decor, base.decor);
    for (const [k, v] of Object.entries(base.marks)) assert.deepEqual(p.marks[k], v, `mark ${k}`);
    for (const e of base.events) assert.deepEqual(byId(p, e.id), e, `event ${e.id} unchanged`);
    assert.equal(p.events.length, base.events.length + added.length);
    for (const id of added) assert.ok(byId(p, id), id);
    assert.equal(fn(p), p, 'idempotent');
    assert.equal(fn({ ...base, id: 'other' }).id, 'other', 'other maps pass through');
  }
  const w = P.withEp5Wake(vwInn);
  const wake = byId(w, 'ep5_wake');
  assert.deepEqual([wake.on, wake.script, wake.if], ['enter', 'ep5_morning', 'ep4_complete']);
  for (const mk of ['inn_bed', 'yara_table', 'mira_window', 'inn_stage', 'inn_stage_b']) assert.ok(w.marks[mk], mk);
});

test('the ep5 pack registers the patched Floodwatch Inn and Valewyn over the ep4 modules', async () => {
  const { peekMap } = await import('../../src/world/maps.js');
  const r = await (await import('../../src/data/ep5/maps.js')).register();
  assert.ok(r.patchFile, 'ep5_patches.js found');
  assert.ok(peekMap('ep4_vw_inn').events.some((e) => e.id === 'ep5_wake'));
  assert.ok(peekMap('ep4_valewyn').events.some((e) => e.id === 'ship_berth'));
  for (const id of MINE) assert.ok(r.loaded.includes(id), `${id} registered by the pack`);
});

test('Valewyn with Episode 4 complete and EP5_LIVE off: no ship, no berth, no door, and it walks exactly as Episode 4', () => {
  assert.equal(EP5_LIVE, false, 'the switch stays off on this branch until E5-integrate');
  const p = P.withShipBerth(valewyn);
  const flags = new Set(EP4_DONE);
  for (const id of ['ship_moored', 'ship_moored_sign', 'ship_berth', 'berth_sail', 'berth_south']) assert.ok(!live(byId(p, id), flags), `${id} absent`);
  const ep4 = new Set(walk(valewyn, db, { flags: EP4_DONE }).reachable);
  const got = new Set(walk(p, db, { flags: EP4_DONE }).reachable);
  assert.deepEqual([...got].sort(), [...ep4].sort());
  // nothing in the inn either: the wake trigger needs ep4_complete, and the scene's guard needs EP5_LIVE (story.js)
  const w = P.withEp5Wake(vwInn);
  assert.deepEqual(new Set(walk(w, db, { flags: EP4_DONE }).reachable), new Set(walk(vwInn, db, { flags: EP4_DONE }).reachable));
});

test('Valewyn with ship_boarded: the berth lands on the deck; with road_landed: it lands at the Haven water stairs', () => {
  const p = P.withShipBerth(valewyn);
  const boarded = new Set([...EP4_DONE, 'ep5_started', 'ship_boarded']);
  const landed = new Set([...boarded, 'road_landed']);
  assert.ok(live(byId(p, 'berth_sail'), boarded) && !live(byId(p, 'berth_south'), boarded));
  assert.ok(!live(byId(p, 'berth_sail'), landed) && live(byId(p, 'berth_south'), landed));
  assert.ok(live(byId(p, 'ship_berth'), new Set([...EP4_DONE, 'ep5_started'])) && !live(byId(p, 'ship_berth'), boarded));
  // the berth and the cell it is read from are reachable from the ferry landing
  const r = new Set(walk(p, db, { flags: [...boarded] }).reachable);
  assert.ok(r.has(key(P.BERTH.x, P.BERTH.y)) && r.has(key(...P.BERTH.land)), 'berth reachable');
  for (const mk of ['berth_yara', 'berth_stage', 'berth_stage_m', 'berth_stage_b', 'berth_land']) assert.ok(r.has(key(...p.marks[mk])), `mark ${mk} reachable`);
  // the sail door lands on the deck's deck_start, the south door on the Haven's dock, both walkable and not on a door
  const [m1, x1, y1] = byId(p, 'berth_sail').to;
  assert.equal(m1, 'ep5_ship');
  assert.deepEqual([x1, y1], maps.ep5_ship.marks.deck_start);
  assert.deepEqual([x1, y1], [maps.ep5_ship.start.x, maps.ep5_ship.start.y]);
  const [m2, x2, y2] = byId(p, 'berth_south').to;
  assert.equal(m2, 'ep5_saffron');
  assert.deepEqual([x2, y2], maps.ep5_saffron.marks.dock);
  assert.ok(new Set(walk(maps.ep5_saffron, db).reachable).has(key(x2, y2)));
  // and the Haven's boat lands back on the berth's quay cell
  assert.deepEqual(byId(maps.ep5_saffron, 'haven_boat').to.slice(0, 3), ['ep4_valewyn', ...P.BERTH.land]);
  const pr = validate(p, db, { ...maps, ep4_valewyn: p }, { staging });
  assert.deepEqual(pr.errors, []);
});

// ------------------------------------------------------------------------------------------------ validation
test('every map of part A validates (ids, lines, NPC records, enemy plan, the shade search) and every chest is reached', () => {
  for (const id of MINE) {
    const r = validate(maps[id], db, maps, { staging });
    // the north gate's door targets E5-maps-b's ep5_lab_f1 (same wave): tolerated only while that file does not exist
    const errs = r.errors.filter((e) => !(/target map ep5_lab_f1 not found/.test(e) && !fs.existsSync(LAB_F1)));
    assert.deepEqual(errs, [], id);
    assert.deepEqual(r.walk.unreached || [], [], `${id}: unreached`);
    if (r.walk.shade) assert.equal(r.walk.shade.stranded, 0, `${id}: a reachable state that cannot get back`);
  }
});

test('NPC records of part A each stand once on their map; enemy counts match the zone plans', () => {
  for (const [id, rec] of Object.entries(EP5_NPCS)) {
    if (!MINE.includes(rec.map)) continue;
    assert.equal(maps[rec.map].events.filter((e) => e.type === 'npc' && e.id === id).length, 1, `${id} on ${rec.map}`);
  }
  for (const zid of ['ep5_ship', 'ep5_caravan_road']) {
    const got = {};
    for (const e of maps[zid].events.filter((x) => x.type === 'enemy')) got[e.encounter] = (got[e.encounter] || 0) + 1;
    assert.deepEqual(got, Object.fromEntries(EP5_ZONES[zid].plan), zid);
  }
  for (const id of ['ep5_saffron', 'ep5_sh_inn', 'ep5_sh_shop', 'ep5_sh_smithy', 'ep5_sh_observatory']) {
    assert.equal(maps[id].events.filter((e) => e.type === 'enemy').length, 0, `${id} has no enemies`);
  }
  // the deck's plan anchor never stands on the deck (the scene spawns its own two foes)
  const a = byId(maps.ep5_ship, 'e_e5s_first');
  for (const flags of [[], ['bram_asked'], ['bram_asked', 'ship_first_fight_done']]) assert.ok(!live(a, new Set(flags)));
});

test('every sign, object and book of part A reads a line or book the pack registers', () => {
  for (const id of MINE) for (const e of maps[id].events) {
    if (e.type === 'sign' || (e.type === 'object' && e.text)) assert.ok(db.lines[e.text], `${id}: ${e.id} -> ${e.text}`);
    if (e.type === 'book') assert.ok(db.BOOKS[e.book], `${id}: ${e.id} -> ${e.book}`);
  }
  for (const k of ['ep5_deck_crates', 'ep5_mast', 'ep5_ship_lantern', 'ep5_ship_wheel', 'ep5_night_sea', 'ep5_jetty', 'ep5_dead_camp',
    'ep5_glass_flat', 'ep5_tent', 'ep5_safe_stones', 'ep5_haven_far', 'ep5_waystone', 'ep5_bulletin', 'ep5_mural', 'ep5_camels',
    'ep5_packed_loads', 'ep5_armillary', 'ep5_bell_rack', 'ep5_water_stairs', 'sign_ep5_inn', 'sign_ep5_shop', 'sign_ep5_smithy',
    'sign_ep5_tower', 'sign_ep5_north_gate', 'ep5_star_charts', 'ep5_rings']) {
    assert.ok(EP5_LINES[k], k);
    assert.ok(MINE.some((id) => maps[id].events.some((e) => e.text === k)), `${k} is read somewhere on part A's maps`);
  }
});

// ------------------------------------------------------------------------------------------------ the deck
test('the Saffron Wind: bow trigger and fight row cut the deck, the gangway waits for the fight', () => {
  const m = maps.ep5_ship;
  const r = new Set(walk(m, db).reachable);
  for (const [tid, col] of [['bow_trig', 21], ['fight_row', 14]]) {
    const t = byId(m, tid);
    for (let y = 0; y < m.ground.length; y++) if (r.has(key(col, y))) assert.ok(y >= t.y && y < t.y + t.h, `${tid}: column ${col} row ${y} open outside it`);
  }
  assert.equal(byId(m, 'fight_row').if, 'bram_asked');
  const gw = byId(m, 'gangway_down');
  assert.equal(gw.if, 'ship_first_fight_done');
  assert.deepEqual(gw.to, ['ep5_caravan_road', ...maps.ep5_caravan_road.marks.jetty, 'right']);
  // before the fight the deck has no way off it
  const before = new Set(walk(m, db, { flags: ['ship_boarded', 'ship_arrived', 'bram_asked'] }).reachable);
  assert.ok(!before.has(key(gw.x, gw.y)));
  assert.ok(r.has(key(gw.x, gw.y)));
  assert.equal(m.events.filter((e) => e.type === 'chest').length, 0);
});

// ------------------------------------------------------------------------------------------------ the road
const ROAD = maps.ep5_caravan_road;
const JETTY = ROAD.marks.jetty;
const EXIT = [51, 7];
const EAST_IN = maps.ep5_saffron.exits[0].to.slice(1, 3);

test('the Caravan Road at its start hour (noon) does not cross the Glass Flat; at dawn it does; dusk does not', () => {
  assert.equal(ROAD.shade.hour, 'noon');
  const noon = reachAt(ROAD, 'noon');
  const dawn = reachAt(ROAD, 'dawn');
  const dusk = reachAt(ROAD, 'dusk');
  assert.ok(!noon.has(key(...EXIT)), 'noon reaches the Haven');
  assert.ok(dawn.has(key(...EXIT)), 'dawn does not reach the Haven');
  assert.ok(!dusk.has(key(...EXIT)), 'dusk reaches the Haven');
  // the bridge is the obelisk's dawn shadow on the road's row, and it ends on paving the party can step off onto
  for (let x = 17; x <= 21; x++) assert.ok(dawn.has(key(x, 13)), `bridge ${x},13`);
  const ob = byId(ROAD, 'ob_flat');
  assert.deepEqual([ob.x, ob.y, ob.h], [23, 13, 3]);
  assert.equal(ROAD.ground[13][22], 'p', 'one paving cell between the obelisk and the sand');
  assert.ok(dawn.has(key(22, 13)) && dawn.has(key(22, 12)) && dawn.has(key(22, 14)));
  // the dial is reachable at the start hour from the jetty, and faced from paving
  assert.ok(noon.has(key(14, 11)));
  // a party coming back from the Haven arrives at noon and reaches the east dial
  const back = reachAt(ROAD, 'noon', { start: [EAST_IN[0], EAST_IN[1]] });
  const de = byId(ROAD, 'dial_road_e');
  assert.ok(back.has(key(de.x, de.y - 1)) || back.has(key(de.x, de.y + 1)) || back.has(key(de.x - 1, de.y)));
});

test('the island chest is reached only at noon, by the two-step stair of noon shadows', () => {
  const noon = reachAt(ROAD, 'noon');
  for (const hour of ['dawn', 'dusk']) assert.ok(!reachAt(ROAD, hour).has(key(19, 6)), `the island at ${hour}`);
  for (const c of [[17, 8], [18, 8], [18, 7], [18, 6], [19, 6]]) assert.ok(noon.has(key(...c)), `${c} at noon`);
  const bell = byId(ROAD, 'chest_isle_bell'), plain = byId(ROAD, 'chest_isle');
  assert.deepEqual([bell.item, bell.flag, bell.if], ['caravan_bell', 'bell_1_found', 'bells_started']);
  assert.deepEqual([plain.item, plain.ifNot], ['hi_ether', 'bells_started']);
  assert.deepEqual([bell.x, bell.y], [plain.x, plain.y]);
});

test('the road: plan chests and finds, marks, triggers that cut the map, no stranding at any hour', () => {
  const r = validate(ROAD, db, maps, { staging }).walk;
  assert.equal(r.shade.stranded, 0);
  assert.equal(r.shade.firstAt.chest_isle.split('|')[0], 'noon');
  assert.equal(r.shade.firstAt.chest_cistern.split('|')[0], 'dawn');
  assert.equal(byId(ROAD, 'chest_jetty').item, 'hi_potion');
  assert.equal(byId(ROAD, 'chest_jetty').qty, 2);
  assert.equal(byId(ROAD, 'chest_cistern').tier, 'iron');
  assert.equal(byId(ROAD, 'chest_cistern').behind, 'crack_cistern');
  assert.equal(byId(ROAD, 'tent_fire').rest, true);
  assert.equal(byId(ROAD, 'tent_fire').safe, true);
  assert.equal(byId(ROAD, 'dial_road').free, true);
  // road_trig and haven_view_trig are whole columns: no way round either at any hour
  for (const [tid, col] of [['road_trig', 12], ['haven_view_trig', 44]]) {
    const t = byId(ROAD, tid);
    for (const hour of ['noon', 'dawn']) {
      const reach = reachAt(ROAD, hour);
      for (let y = 0; y < ROAD.ground.length; y++) if (reach.has(key(col, y))) assert.ok(y >= t.y && y < t.y + t.h, `${tid} ${hour} row ${y}`);
    }
  }
  // the exit lands on the Haven's south gate arrival, and the Haven's south exit lands on the road's east edge
  assert.deepEqual(ROAD.exits[0].to, ['ep5_saffron', ...maps.ep5_saffron.marks.south_gate, 'up']);
  assert.ok(reachAt(ROAD, 'noon', { start: [EAST_IN[0], EAST_IN[1]] }).has(key(...EXIT)));
  // nothing that stands or steps is on sand
  for (const e of ROAD.events) if (['npc', 'enemy', 'trigger', 'chest', 'sundial', 'standstone'].includes(e.type)) {
    const hh = e.on === 'enter' ? 0 : e.type === 'trigger' ? e.h || 1 : 1;   // a stone's h is its height, not its cells
    for (let j = 0; j < hh; j++) for (let i = 0; i < (e.w || 1); i++) assert.notEqual(ROAD.shade.sand[e.y + j][e.x + i], 's', `${e.id} on sand`);
  }
});

// ------------------------------------------------------------------------------------------------ the Haven
test('Saffron Haven: doors round-trip, the gates, the two states, and the north door to the Labyrinth', () => {
  const H = maps.ep5_saffron;
  for (const [did, mid] of [['door_inn', 'ep5_sh_inn'], ['door_shop', 'ep5_sh_shop'], ['door_smithy', 'ep5_sh_smithy'], ['door_tower', 'ep5_sh_observatory']]) {
    const d = byId(H, did);
    const inner = maps[mid];
    const back = inner.events.find((e) => e.type === 'door' && e.to[0] === 'ep5_saffron');
    assert.ok(back, `${mid} has a door back`);
    assert.ok(Math.abs(back.to[1] - d.x) <= 1 && Math.abs(back.to[2] - d.y) <= 1, `${mid} exit lands by its door`);
    assert.ok(Math.abs(d.to[1] - back.x) <= 1 && Math.abs(d.to[2] - back.y) <= 1, `${did} lands on the exit cell`);
  }
  const nd = byId(H, 'north_door');
  assert.deepEqual([nd.to[0], nd.if], ['ep5_lab_f1', 'gnomon_get']);
  assert.equal(byId(H, 'gate_trig').if, 'star_reading_done');
  assert.equal(byId(H, 'gate_trig').script, 'sel_gate');
  assert.equal(byId(H, 'haven_boat').if, 'road_landed');
  // the north gate's trigger fills the gap in the wall: the only way north
  const r = new Set(walk(H, db).reachable);
  const t = byId(H, 'gate_trig');
  for (let x = 0; x < 44; x++) if (r.has(key(x, 4))) assert.ok(x >= t.x && x < t.x + t.w, `wall row open at ${x}`);
  // the two states of the waystone, the bulletin, the bell rack, the Moonwell
  for (const [a, b, f] of [['waystone', 'waystone_still', 'haven_restored'], ['bulletin', 'bulletin_open', 'haven_restored'],
    ['bell_rack', 'bell_rack_full', 'bells_done'], ['moonwell', 'moonwell_rest', 'moonwell_woken']]) {
    assert.equal(byId(H, a).ifNot, f); assert.equal(byId(H, b).if, f);
    assert.deepEqual([byId(H, a).x, byId(H, a).y], [byId(H, b).x, byId(H, b).y]);
  }
  assert.ok(byId(H, 'moonwell_rest').rest && byId(H, 'moonwell_rest').safe);
  assert.deepEqual(H.lighting.tint, [{ if: 'haven_restored', id: 'none' }, { id: 'dusk' }]);
  for (const e of H.events.filter((x) => /^loads_[a-f]$/.test(x.id))) assert.equal(e.ifNot, 'haven_restored');
  // the scenes the town runs
  assert.equal(byId(H, 'haven_enter').script, 'haven_arrival');
  assert.equal(byId(H, 'haven_every_road').script, 'every_road');
  assert.equal(byId(H, 'moonwell').script, 'moonwell');
});

test('the Armillary Tower: the reading trigger fills the nave two rows in, the save bell, the charts in two states', () => {
  const O = maps.ep5_sh_observatory;
  const t = byId(O, 'reading_trig');
  assert.deepEqual([t.script, t.if, t.y], ['star_reading', 'met_sel', 11]);
  const r = new Set(walk(O, db).reachable);
  for (let x = 0; x < 18; x++) if (r.has(key(x, 11)) && x <= 10) assert.ok(x >= t.x && x < t.x + t.w, `nave row 11 open at ${x}`);
  assert.ok(O.events.some((e) => e.type === 'save'));
  assert.equal(O.lighting.tint, 'night');
  assert.equal(O.music, 'orrery');
  assert.ok(byId(O, 'charts_west').ifNot === 'chart_restored' && byId(O, 'charts_west_new').if === 'chart_restored');
  assert.deepEqual(maps.ep5_sh_inn.marks.inn_bed, [17, 7]);
  assert.ok(r.has(key(...O.marks.door_sel)));
});

// ------------------------------------------------------------------------------------------------ STAGING_EP5 marks
/** STAGING_EP5 section 3: "### `map` (marks `a`, `b`, ...)" (and the patch rows' "patch: ...; marks ..."). */
function stagingMarks() {
  const md = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP5.md'), 'utf8');
  const out = {};
  for (const line of md.split('\n')) {
    const m = /^### (.*)$/.exec(line);
    if (!m) continue;
    const ids = [...m[1].matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]);
    const head = m[1].split('(')[0];
    const mapIds = [...head.matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]);
    const marksPart = (m[1].split('marks')[1] || '');
    const marks = [...marksPart.matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]);
    for (const id of mapIds) out[id] = { marks, all: ids, shared: mapIds.length > 1 ? mapIds : null };
  }
  return out;
}
// marks the camera pans to or a scene names but nobody walks to (the decal, an object, a building's roof)
const CAMERA_ONLY = new Set(['flat', 'dial', 'haven_far', 'waystone', 'bulletin', 'roof_view', 'fire']);
const DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

test('every STAGING_EP5 mark of part A exists, and every mark a scene walks to is walkable, reachable and off sand', () => {
  const S = stagingMarks();
  const patched = { ep4_vw_inn: P.withEp5Wake(vwInn), ep4_valewyn: P.withShipBerth(valewyn) };
  const all = { ...maps, ...patched };
  const flagsFor = {
    ep4_valewyn: [...EP4_DONE, 'ep5_started'], ep4_vw_inn: EP4_DONE,
  };
  for (const id of [...MINE, 'ep4_vw_inn', 'ep4_valewyn']) {
    const entry = S[id];
    assert.ok(entry, `STAGING_EP5 has a section for ${id}`);
    const m = all[id];
    const bare = buildGrid({ ...m, events: [] }, db);
    const reach = m.shade ? reachAt(m, m.shade.hour) : new Set(walk(m, db, flagsFor[id] ? { flags: flagsFor[id] } : {}).reachable);
    const reachDawn = m.shade ? reachAt(m, 'dawn') : reach;
    for (const mk of entry.marks) {
      // STAGING names a few event ids beside the marks (ship_moored ...); those are events
      if (m.events.some((e) => e.id === mk) && !(m.marks && m.marks[mk])) continue;
      // a heading shared by several maps (the three shops) lists their marks together: each must be on one of them
      if (entry.shared && !(m.marks && m.marks[mk])) {
        assert.ok(entry.shared.some((o) => all[o] && all[o].marks && all[o].marks[mk]), `${mk} missing on ${entry.shared.join(', ')}`);
        continue;
      }
      assert.ok(m.marks && m.marks[mk], `${id}: mark ${mk} missing`);
      if (CAMERA_ONLY.has(mk)) continue;
      const [x, y] = m.marks[mk];
      assert.equal(bare.code[y][x], 'none', `${id}: mark ${mk} (${x},${y}) is ${bare.code[y][x]} (${bare.why[y][x]})`);
      // an NPC record stands on its own mark (sel_spot, counter ...): then a cell beside it must be reachable
      const held = m.events.some((e) => e.type === 'npc' && e.x === x && e.y === y);
      const ok = (cx, cy) => reach.has(key(cx, cy)) || reachDawn.has(key(cx, cy));
      assert.ok(held ? DIRS4.some(([dx, dy]) => ok(x + dx, y + dy)) : ok(x, y), `${id}: mark ${mk} (${x},${y}) unreachable`);
      if (m.shade) assert.notEqual(m.shade.sand[y][x], 's', `${id}: mark ${mk} on sand`);
    }
  }
  // the staging triples: X two tiles from the speaker, X_m and X_b either side of X
  const H = maps.ep5_saffron.marks;
  for (const s of ['waystone_stage', 'sel_stage', 'moonwell_stage', 'gate_stage']) {
    assert.equal(H[`${s}_m`][1], H[s][1]); assert.equal(H[`${s}_b`][1], H[s][1]);
    assert.equal(H[`${s}_m`][0], H[s][0] - 1); assert.equal(H[`${s}_b`][0], H[s][0] + 1);
  }
  assert.deepEqual([H.sel_stage[0], H.sel_stage[1] - 2], H.sel_spot);
  assert.deepEqual([H.moonwell_stage[0], H.moonwell_stage[1] - 2], H.moonwell);
  assert.deepEqual([H.gate_stage[0], H.gate_stage[1] - 2], H.gate_sel);
  assert.deepEqual([H.waystone_stage[0], H.waystone_stage[1] - 2], H.yasmin_gate);
  assert.deepEqual([H.roof_stage[0], H.roof_stage[1] - 2], H.roof_laleh);
  const O = maps.ep5_sh_observatory.marks;
  assert.deepEqual([O.reading_stage[0], O.reading_stage[1] - 2], O.laleh_spot);
  const R = ROAD.marks;
  assert.deepEqual([R.fire_stage[0], R.fire_stage[1] - 2], R.fire_omar);   // two tiles below Omar, the fire between them
  // NPC records stand on their marks
  assert.deepEqual([byId(maps.ep5_saffron, 'sel').x, byId(maps.ep5_saffron, 'sel').y], H.sel_spot);
  assert.deepEqual([byId(maps.ep5_saffron, 'nasrin').x, byId(maps.ep5_saffron, 'nasrin').y], H.nasrin_bench);
  assert.deepEqual([byId(maps.ep5_saffron, 'kamal').x, byId(maps.ep5_saffron, 'kamal').y], H.moonwell);
  assert.deepEqual([byId(maps.ep5_saffron, 'yara').x, byId(maps.ep5_saffron, 'yara').y], H.water_stairs);
  assert.deepEqual([byId(maps.ep5_saffron, 'tamir').x, byId(maps.ep5_saffron, 'tamir').y], H.tamir_spot);
  assert.deepEqual([byId(ROAD, 'omar').x, byId(ROAD, 'omar').y], R.omar_spot);
  assert.deepEqual([byId(maps.ep5_sh_observatory, 'laleh').x, byId(maps.ep5_sh_observatory, 'laleh').y], O.laleh_spot);
});

test('Omar sits in the obelisk\'s noon shade, above its sprite, never on a cell the sprite hides', () => {
  const ob = byId(ROAD, 'ob_flat'), om = byId(ROAD, 'omar');
  assert.equal(om.x, ob.x);
  assert.equal(om.y, ob.y - ob.h, 'the last cell of the noon shadow');
  const W = ROAD.ground[0].length;
  const L = light(ROAD, { hour: 'noon' });
  assert.equal(L.lit[om.y * W + om.x], 0, 'shaded at noon');
});
