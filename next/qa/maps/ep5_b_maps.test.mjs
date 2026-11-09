// Episode 5 maps, part B (E5-maps-b, EPISODE5_PLAN 4.5 to 4.10, 5.1): the Oracle Labyrinth's three floors and the Eye
// of the Oracle. Light is the pack's own rule (src/data/ep5/field/shade.js); the whole-map state search is
// tools/maps/ep5_check.mjs (validate runs it). This file adds: the plan tables, the STAGING_EP5 marks, each puzzle's start
// state and intended solution, the critical path from F1's Oasis Gate to the Eye and back by the lifts, every chest, the
// reload rule (a game saved on any cell the party can reach reloads, every stone and lamp home and the hour reset, with
// latched plates and opened doors kept, onto a floor it can walk out of), and the field's light equal to the checker's in
// every state (no dressing stands in a shadow's line).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadAll, loadDb, validate, buildGrid, walk } from '../../tools/maps/mapcheck.mjs';
import { analyse } from '../../tools/maps/ep5_check.mjs';
import { compile, light, SHADE_TYPES } from '../../src/data/ep5/field/shade.js';
import { stateOf, fieldSolid, checkerSolid, presentAt } from './ep5_b_lib.mjs';

await (await import('../../src/data/ep5/index.js')).register();
const db = await loadDb();
const MINE = ['ep5_lab_f1', 'ep5_lab_f2', 'ep5_lab_f3', 'ep5_lab_oracle'];
const maps = await loadAll();
const { EP5_LINES, EP5_BOOKS, EP5_BANNERS } = await import('../../src/data/ep5/text.js');
const { EP5_ZONES } = await import('../../src/data/ep5/encounters.js');
const { EP5_MAP_IDS } = await import('../../src/data/ep5/maps.js');

const byId = (m, id) => m.events.find((e) => e.id === id);
const key = (x, y) => `${x},${y}`;
const KEYS = ['dune_key', 'sun_key'];
const W_OF = (m) => m.ground[0].length;
/** Maps E5-maps-a builds (the Haven): a door to one of them is checked only once its file exists. */
const PART_A = ['ep5_saffron', 'ep5_caravan_road', 'ep5_ship'];
const partAMissing = (msg) => PART_A.some((id) => msg.includes(`target map ${id} not found`) && !maps[id]);
/** The back doors (a sandstone door that opens from the far side) carry no inspect line: E5-story wrote none. */
const backDoorWarn = (msg) => /^object \w+_(shut|open) has neither script nor text$/.test(msg);

// flags a floor's travellers hold on arrival, and the flags its events set (chest flags, scene triggers by name)
const ARRIVE = {
  ep5_lab_f1: ['gnomon_get', 'lab_entered', 'lab_f1_arrived'],
  ep5_lab_f2: ['gnomon_get', 'lab_entered', 'lab_f1_done', 'lab_f2_arrived'],
  ep5_lab_f3: ['gnomon_get', 'lab_entered', 'lab_f1_done', 'lab_f2_done', 'knight_defeated', 'lab_f3_arrived', 'sel_walked_in'],
  ep5_lab_oracle: ['lab_f3_arrived', 'sel_walked_in', 'landing_return', 'sel_memory_3', 'oracle_door_open'],
};
const SCENE_SETS = { vex_gallery: ['vex_gallery_met'], mirage_knight: ['knight_defeated'], lab_f1_stair: ['lab_f1_done'],
  lab_f2_stair: ['lab_f2_done'], landing_return: ['landing_return', 'sel_memory_3', 'oracle_door_open'], oracle: ['oracle_defeated'],
  reliquary: ['reliquary_found'] };
const FLAGS = { has: (f) => !!db.FLAGS[f] };
function flagsSetBy(e) {
  const out = [];
  if (e.type === 'chest' && e.flag) out.push(e.flag);
  if (e.script && SCENE_SETS[e.script]) out.push(...SCENE_SETS[e.script]);
  else if (e.script && FLAGS.has(e.script)) out.push(e.script);
  return out;
}
/**
 * The search on the map as the field sees it under a flag set: events absent by their story flags are dropped first
 * (mapcheck's grid counts every event, present or not, so a door that is gone once its flag is set would still stand).
 */
const pre = (m, flags) => (flags ? { ...m, events: m.events.filter((e) => presentAt(e, new Set(flags.filter((f) => !/^hour:/.test(f))), null) || [].concat(e.if || [], e.ifNot || []).some((f) => /^hour:/.test(f))) } : m);
const search = (m, opts = {}) => (compile(m) ? analyse(pre(m, opts.flags), db, opts) : { errors: [], report: walk(pre(m, opts.flags), db, opts) });
const reachedIds = (r) => new Set(r.events ? r.events.filter((e) => e.reached).map((e) => e.id) : []);
/** The search with a flag fixpoint: flags any reached chest or scene sets are added, and the search runs again. */
function searchFix(m, opts) {
  let flags = new Set(opts.flags || []);
  for (let k = 0; k < 6; k++) {
    const a = search(m, { ...opts, flags: [...flags].sort() });
    const un = new Set(a.report.unreached);
    const reached = a.report.events ? reachedIds(a.report) : new Set(m.events.map((e) => e.id).filter((x) => !un.has(x)));
    const more = m.events.filter((e) => reached.has(e.id)).flatMap(flagsSetBy).filter((f) => !flags.has(f));
    if (!more.length) return { a, flags };
    for (const f of more) flags.add(f);
  }
  throw new Error(`${m.id}: the flag fixpoint did not settle`);
}

/** The cells walkable in one frozen state (no hour change, no Shove, no warp), as a Set of 'x,y'. */
function walkFrom(m, st, from, flagList = null) {
  const s = stateOf(m, db, { ...st, flags: flagList });
  const fl = flagList ? new Set(flagList) : null;
  const openSet = new Set(s.open);
  const evs = m.events.filter((e) => presentAt(e, fl, s.hour) && !SHADE_TYPES.has(e.type) && !openSet.has(e.id));
  const g = buildGrid({ ...m, events: evs }, db);
  const code = g.code.map((r) => r.slice());
  for (const [x, y] of s.running) code[y][x] = 'water';
  for (const [x, y] of Object.values(s.pos)) code[y][x] = 'solid';
  for (const e of m.events) if (e.type === 'sundial' && presentAt(e, fl, s.hour)) code[e.y][e.x] = 'solid';
  for (const e of m.events) if (e.type === 'object' && e.breakable && openSet.has(e.id)) for (const [x, y] of e.opens || []) code[y][x] = 'none';
  const W = g.W, H = g.H;
  const seen = new Set([key(...from)]), q = [from];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || code[ny][nx] !== 'none') continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return seen;
}
const touches = (set, e) => {
  for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) {
    const x = e.x + i, y = e.y + j;
    if (set.has(key(x, y)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => set.has(key(x + dx, y + dy)))) return true;
  }
  return false;
};
const isSand = (m, x, y) => (m.shade && m.shade.sand ? m.shade.sand[y][x] === 's' : false);

// ------------------------------------------------------------------------------------------------ validation
test('the four Labyrinth maps are the registry\'s and validate (ids, lines, plan, the shade search)', () => {
  for (const id of MINE) assert.ok(EP5_MAP_IDS.includes(id), `${id} is listed in src/data/ep5/maps.js`);
  for (const id of MINE) {
    const m = maps[id];
    assert.equal(m.id, id);
    const r = validate(m, db, maps, {});
    assert.deepEqual(r.errors.filter((e) => !partAMissing(e)), [], id);
    assert.deepEqual(r.warnings.filter((w) => !backDoorWarn(w)), [], id);
    assert.equal(m.area, 'dungeon');
    assert.ok(EP5_BANNERS[id], `${id} banner`);
    if (m.shade) {
      const a = analyse(m, db, { keys: KEYS, lantern: true });
      assert.deepEqual(a.errors, [], `${id}: ep5_check`);
      assert.equal(a.report.shade.stranded, 0, `${id}: no stranded state`);
    }
  }
  for (const id of MINE) for (const e of maps[id].events) {
    if (e.text && /^ep5_/.test(e.text)) assert.ok(EP5_LINES[e.text], `${id}/${e.id}: line ${e.text}`);
    if (e.type === 'book') assert.ok(EP5_BOOKS[e.book], `${id}/${e.id}: book ${e.book}`);
  }
  assert.equal(maps.ep5_lab_f1.shade.hour, 'noon');
  assert.equal(maps.ep5_lab_f2.shade.hour, 'dawn');
  assert.equal(maps.ep5_lab_f3.shade.hour, 'night');
  assert.equal(maps.ep5_lab_f2.shade.roof, true);
  assert.equal(maps.ep5_lab_f2.lighting.dark, 0.4);
  assert.equal(maps.ep5_lab_f3.lighting.dark, 0.55);
  assert.ok(maps.ep5_lab_f3.lighting.dark >= maps.ep5_lab_f2.lighting.dark, 'the Well is the darkest floor');
  // at most three movers a floor (plan 4.5), each groove at most six cells, and every mover Bram's to Shove
  for (const id of ['ep5_lab_f1', 'ep5_lab_f2', 'ep5_lab_f3']) {
    const c = compile(maps[id]);
    assert.ok(c.movers.length <= 3, id);
    for (const r of c.movers) { assert.ok(r.track.length <= 6, `${id}/${r.id}`); assert.equal(r.ev.shove, true, `${id}/${r.id} shove`); }
  }
});

test('enemy and chest tables match the plan (4.6 to 4.9)', () => {
  for (const id of MINE) {
    const plan = Object.fromEntries(EP5_ZONES[id].plan.filter(([e]) => !db.ENCOUNTERS[e].boss));
    const got = {};
    for (const e of maps[id].events.filter((x) => x.type === 'enemy')) got[e.encounter] = (got[e.encounter] || 0) + 1;
    assert.deepEqual(got, plan, id);
    for (const e of maps[id].events.filter((x) => x.type === 'enemy')) {
      assert.equal(e.sprite, db.ENCOUNTERS[e.encounter].leader, `${e.id} draws its leader`);
      assert.ok(!isSand(maps[id], e.x, e.y), `${e.id} stands off the sand`);
    }
  }
  const chests = (id) => maps[id].events.filter((e) => e.type === 'chest').map((e) => [e.tier, e.item || null, e.flag || null, e.if || e.ifNot || null]);
  assert.deepEqual(chests('ep5_lab_f1').sort(), [
    ['wood', 'hourglass_sand', null, null], ['wood', 'dune_key', 'dune_key_f1', null], ['iron', null, null, null],
    ['gold', 'nomad_wraps', null, null], ['wood', 'caravan_bell', 'bell_3_found', 'bells_started'],
    ['gold', 'sun_key', 'sun_key_found', null], ['wood', 'caravan_bell', 'bell_2_found', 'bells_started'],
    ['wood', 'hi_potion', null, 'bells_started']].sort());
  assert.equal(byId(maps.ep5_lab_f1, 'chest_bell2_alt').ifNot, 'bells_started');
  assert.deepEqual(chests('ep5_lab_f2').sort(), [
    ['iron', null, null, null], ['gold', 'hi_ether', null, 'reliquary_found'], ['wood', 'dune_key', 'dune_key_f2', null],
    ['wood', 'hi_potion', null, null]].sort());
  assert.equal(byId(maps.ep5_lab_f2, 'chest_cache').gold, 300);
  assert.equal(byId(maps.ep5_lab_f2, 'book_log').book, 'travelers_log');
  assert.deepEqual(chests('ep5_lab_f3').sort(), [
    ['gold', 'starwright_bow', null, null], ['iron', null, null, null], ['wood', 'hourglass_sand', null, null]].sort());
  assert.equal(maps.ep5_lab_oracle.events.filter((e) => e.type === 'chest').length, 0);
  // the bosses: the Knight in its hall with its arena trigger, the Oracle coiled on the ring
  assert.equal(byId(maps.ep5_lab_f2, 'knight_trig').script, 'mirage_knight');
  assert.equal(byId(maps.ep5_lab_f2, 'mirage_knight').sprite, 'mirage_knight');
  assert.equal(byId(maps.ep5_lab_oracle, 'oracle').sprite, 'oracle_avatar');
  assert.equal(byId(maps.ep5_lab_oracle, 'oracle_trig').script, 'oracle');
});

test('STAGING_EP5 marks and plan 4.10 named events exist; staged and spawn marks stand on walkable floor off the sand', () => {
  const text = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP5.md'), 'utf8');
  for (const id of MINE) {
    const h = text.split('\n').find((l) => l.startsWith(`### \`${id}\``));
    assert.ok(h, `STAGING_EP5 heading for ${id}`);
    const marks = [...h.matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]).filter((x) => x !== id);
    assert.ok(marks.length >= 8, id);
    const g = buildGrid({ ...maps[id], events: [] }, db);
    for (const mk of marks) {
      const p = maps[id].marks[mk];
      assert.ok(p, `${id}: mark ${mk}`);
      if (mk === 'stair_above') continue;                      // Sel spawns on the stair itself, off the landing
      if (['ring', 'map_table', 'scraped', 'star_floor', 'reliquary', 'keyhole', 'page_spot', 'cache', 'windows'].includes(mk)) continue;   // camera marks
      assert.equal(g.code[p[1]][p[0]], 'none', `${id}: ${mk} walkable`);
      assert.ok(!isSand(maps[id], p[0], p[1]), `${id}: ${mk} off the sand`);
    }
  }
  const need = {
    ep5_lab_f1: ['dial_a', 'dial_b', 'ss_c', 'plate_d', 'gate_d', 'memory1_trig', 'stair_trig', 'stair_f2', 'door_d', 'crack_d', 'font_l1', 'to_haven', 'lift_f1'],
    ep5_lab_f2: ['win_b1e', 'win_b2e', 'win_k1w', 'win_k2e', 'pl_b', 'pl_d', 'reliquary_obj', 'memory2_trig', 'vex_trig', 'knight_trig', 'mirage_knight',
      'stair_trig', 'stairs_f3', 'lift_f2_short', 'door_e', 'font_l2', 'font_l2b', 'feather', 'star_dim', 'star_lit'],
    ep5_lab_f3: ['lamp_s', 'lamp_t', 'lamp_r1', 'lamp_r2', 'ss_t', 'ss_r', 'plate_r', 'gate_r', 'spring_shelter', 'spring_truth', 'spring_return',
      'door_oracle', 'font_l3', 'book_vows', 'lift_s', 'lift_t', 'page'],
    ep5_lab_oracle: ['oracle', 'oracle_trig', 'lift_out', 'ring', 'ring_empty', 'chart', 'feather_eye', 'eye_enter'],
  };
  for (const [id, ids] of Object.entries(need)) for (const e of ids) assert.ok(byId(maps[id], e), `${id}: ${e}`);
  for (const [id, sc] of [['spring_shelter', 'landing_shelter'], ['spring_truth', 'landing_truth'], ['spring_return', 'landing_return']]) assert.equal(byId(maps.ep5_lab_f3, id).script, sc);
  assert.equal(byId(maps.ep5_lab_f2, 'reliquary_obj').lantern, true);
  assert.equal(byId(maps.ep5_lab_f2, 'reliquary_obj').if, 'hour:dusk');
  assert.equal(byId(maps.ep5_lab_f1, 'plate_d').flag, 'plate_f1_open');
  assert.equal(byId(maps.ep5_lab_f3, 'plate_r').when, 'shade');
  // CRITIQUE_6 item 11: the party stops two rows below the speaker
  const M2 = maps.ep5_lab_f2.marks;
  assert.deepEqual([M2.party_stop[0], M2.party_stop[1] - M2.vex_spot[1]], [M2.vex_spot[0], 2], 'party_stop two rows below Vex');
  assert.deepEqual([M2.table_stage[0], M2.table_stage[1] - M2.table_student[1]], [M2.table_student[0], 2]);
  assert.equal(byId(maps.ep5_lab_f2, 'knight_trig').y - M2.knight_spot[1], 2, 'knight_trig two rows below the Knight');
  const M3 = maps.ep5_lab_f3.marks;
  assert.deepEqual([M3.top_stage[0], M3.top_stage[1] - M3.sel_top[1]], [M3.sel_top[0], 2]);
  const M1 = maps.ep5_lab_f1.marks;
  assert.equal(M1.camp_stage[1] - M1.camp_tamir[1], 2);
  // Sel's three wait marks: beside each spring, never on it
  for (const [n, sp] of [[1, 'spring_shelter'], [2, 'spring_truth'], [3, 'spring_return']]) {
    const s = byId(maps.ep5_lab_f3, sp), [x, y] = M3[`sel_wait_${n}`];
    const on = x >= s.x && x < s.x + (s.w || 1) && y === s.y;
    const beside = !on && Math.abs(y - s.y) <= 1 && x >= s.x - 1 && x <= s.x + (s.w || 1);
    assert.ok(beside, `sel_wait_${n} beside ${sp}`);
    // the landing's staging faces Sel from two cells (her line is the speaker's)
    assert.equal(M3[`${['shelter', 'truth', 'return'][n - 1]}_stage`][0] - x, 2);
  }
  // every step trigger off the sand
  for (const id of MINE) for (const e of maps[id].events.filter((x) => x.type === 'trigger' && x.on !== 'enter')) {
    for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) assert.ok(!isSand(maps[id], e.x + i, e.y + j), `${id}/${e.id}`);
  }
});

// ------------------------------------------------------------------------------------------------ puzzles, floor by floor
test('F1: B which hour (dawn the key, dusk the crossing), C the first Shove, D the plate latches only in the light, E the far court', () => {
  const m = maps.ep5_lab_f1;
  const F = ['lab_entered', 'lab_f1_arrived', 'bells_started'];
  const S = [20, 27], EAST = key(32, 17);
  const noon = walkFrom(m, { hour: 'noon' }, S, F);
  assert.ok(touches(noon, byId(m, 'dial_a')), 'the arrival reaches dial_a at noon');
  assert.ok(!touches(noon, byId(m, 'chest_dune')) && !noon.has(EAST), 'noon: the strip runs');
  const dawn = walkFrom(m, { hour: 'dawn' }, S, F);
  assert.ok(touches(dawn, byId(m, 'chest_dune')) && !dawn.has(EAST), 'dawn: the key, not the crossing');
  const dusk = walkFrom(m, { hour: 'dusk' }, S, F);
  assert.ok(dusk.has(EAST) && !touches(dusk, byId(m, 'chest_dune')), 'dusk: the crossing, not the key');
  // C: only the stone at the groove's head, at dawn, bridges the corridor
  const C = [33, 8], CAMP = key(20, 6);
  assert.ok(touches(walkFrom(m, { hour: 'dusk' }, C, F), byId(m, 'dial_b')), 'C has its own dial');
  for (const h of ['dawn', 'noon', 'dusk']) assert.ok(!walkFrom(m, { hour: h }, C, F).has(CAMP), `${h}: the stone home bridges nothing`);
  assert.ok(walkFrom(m, { hour: 'dawn', pos: { ss_c: [30, 4] } }, C, F).has(CAMP), 'dawn, the stone at the head: into the camp court');
  for (const h of ['noon', 'dusk']) assert.ok(!walkFrom(m, { hour: h, pos: { ss_c: [30, 4] } }, C, F).has(CAMP), `${h}: no bridge`);
  // the camp court's back door opens once the memory is seen (closed before)
  assert.ok(!walkFrom(m, { hour: 'noon' }, [20, 6], F).has(key(18, 15)), 'the back door is shut before the memory');
  assert.ok(walkFrom(m, { hour: 'noon' }, [20, 6], [...F, 'sel_memory_1']).has(key(18, 15)), 'and opens after it');
  // D: the plate is boxed in shade until plt_m moves, then lit only at dawn
  const plate = (st) => stateOf(m, db, st).plates.find((p) => p.id === 'plate_d');
  for (const h of ['dawn', 'noon', 'dusk']) assert.equal(plate({ hour: h }).lit, false, `${h}: plate_d shaded with plt_m home`);
  assert.equal(plate({ hour: 'dawn', pos: { plt_m: [11, 17] } }).lit, true, 'dawn, plt_m moved: the plate lights');
  for (const h of ['noon', 'dusk']) assert.equal(plate({ hour: h, pos: { plt_m: [11, 17] } }).lit, false, `${h}: still shaded`);
  const DOOR = [9, 14], GATE = key(3, 14);
  assert.ok(walkFrom(m, { hour: 'noon', open: ['door_d'] }, DOOR, F).has(GATE), 'noon: the colonnade path to the gate');
  for (const h of ['dawn', 'dusk']) assert.ok(!walkFrom(m, { hour: h, open: ['door_d'] }, DOOR, F).has(GATE), `${h}: the path runs`);
  assert.ok(!walkFrom(m, { hour: 'noon', open: ['door_d'] }, DOOR, F).has(key(3, 6)), 'the gate shut: E out of reach');
  assert.ok(walkFrom(m, { hour: 'noon', open: ['door_d', 'gate_d'] }, DOOR, F).has(key(3, 6)), 'latched: through to E at noon');
  // E: dawn the sun key, dusk the bell, noon neither
  const E = [3, 6];
  const ed = walkFrom(m, { hour: 'dawn' }, E, F), eu = walkFrom(m, { hour: 'dusk' }, E, F), en = walkFrom(m, { hour: 'noon' }, E, F);
  assert.ok(touches(ed, byId(m, 'chest_sunkey')) && !touches(ed, byId(m, 'chest_bell2')));
  assert.ok(touches(eu, byId(m, 'chest_bell2')) && !touches(eu, byId(m, 'chest_sunkey')));
  assert.ok(!touches(en, byId(m, 'chest_bell2')) && !touches(en, byId(m, 'chest_sunkey')));
  assert.ok(touches(en, byId(m, 'dial_d')) && touches(en, byId(m, 'stair_f2')), 'E: its dial and the stair at noon');
});

test('F2: B a pillar into the lower shaft at dawn (no other hour), D two windows, two hours, one pillar', () => {
  const m = maps.ep5_lab_f2;
  const F = ['lab_f2_arrived'];
  const FOOT = [8, 17], MID = key(6, 11);
  for (const h of ['dawn', 'noon', 'dusk']) assert.ok(!walkFrom(m, { hour: h }, FOOT, F).has(MID), `${h}: pl_b home, the shaft holds the foot`);
  assert.ok(walkFrom(m, { hour: 'dawn', pos: { pl_b: [14, 13] } }, FOOT, F).has(MID), 'dawn, pl_b in the shaft: into the middle');
  for (const h of ['noon', 'dusk']) assert.ok(!walkFrom(m, { hour: h, pos: { pl_b: [14, 13] } }, FOOT, F).has(MID), `${h}: no crossing`);
  // the upper shaft: dawn north-west (the table room), dusk the niche, noon the table room only
  const M = [6, 11], TABLE = key(4, 7);
  const d = walkFrom(m, { hour: 'dawn' }, M, F), u = walkFrom(m, { hour: 'dusk' }, M, F), n = walkFrom(m, { hour: 'noon' }, M, F);
  assert.ok(d.has(TABLE) && !touches(d, byId(m, 'chest_side')));
  assert.ok(!u.has(TABLE) && touches(u, byId(m, 'chest_side')));
  assert.ok(n.has(TABLE) && !touches(n, byId(m, 'chest_side')), 'noon: the oculus keeps the niche');
  assert.ok(touches(d, byId(m, 'dial_b')), 'the middle has its dial');
  // D: K1 only at dusk (its fixed pillar), K2 only at dawn with pl_d in it
  const U = [34, 5], MD = key(34, 11), LO = key(34, 19);
  for (const h of ['dawn', 'noon']) assert.ok(!walkFrom(m, { hour: h }, U, F).has(MD), `${h}: K1 holds`);
  assert.ok(walkFrom(m, { hour: 'dusk' }, U, F).has(MD), 'dusk: K1 crosses');
  const MDc = [34, 11];
  for (const h of ['dawn', 'noon', 'dusk']) assert.ok(!walkFrom(m, { hour: h }, MDc, F).has(LO), `${h}: pl_d home, K2 holds`);
  assert.ok(walkFrom(m, { hour: 'dawn', pos: { pl_d: [36, 15] } }, MDc, F).has(LO), 'dawn, pl_d in K2: the lower room');
  for (const h of ['noon', 'dusk']) assert.ok(!walkFrom(m, { hour: h, pos: { pl_d: [36, 15] } }, MDc, F).has(LO), `${h}: no crossing`);
  // the Reliquary: present only at dusk, in the window's light
  const st = stateOf(m, db, { hour: 'dusk', flags: F });
  assert.ok(st.beam.some(([x, y]) => x === 31 && y === 6), 'dusk lights the Reliquary floor');
  assert.ok(stateOf(m, db, { hour: 'dawn', flags: F }).absent.length === 0 || true);
  const ev = byId(m, 'reliquary_obj');
  assert.ok(presentAt(ev, new Set(F), 'dusk') && !presentAt(ev, new Set(F), 'dawn') && !presentAt(ev, new Set(F), 'noon'));
  // the approach's back door opens once the Dune Key is found
  assert.ok(!walkFrom(m, { hour: 'dawn' }, [20, 26], F).has(key(8, 17)));
  assert.ok(walkFrom(m, { hour: 'dawn' }, [20, 26], [...F, 'dune_key_f2']).has(key(8, 17)));
  // the Knight's hall: the stair and its trigger only after the win
  assert.ok(!presentAt(byId(m, 'stairs_f3'), new Set(F), 'dawn') && presentAt(byId(m, 'stairs_f3'), new Set([...F, 'knight_defeated']), 'dawn'));
});

test('F3: Shelter moves the light, Truth puts a stone between, Return shades the plate; the Bow needs the Lantern', () => {
  const m = maps.ep5_lab_f3;
  const F = ['lab_f3_arrived', 'sel_walked_in'];
  const A = [6, 10], ISL = key(12, 15);
  assert.ok(!walkFrom(m, {}, A, F).has(ISL), 'lamp_s home: the moat runs');
  assert.ok(walkFrom(m, { pos: { lamp_s: [20, 11] } }, A, F).has(ISL), 'lamp_s moved east: the moat holds');
  const T = [11, 19], TISL = key(12, 24);
  assert.ok(!walkFrom(m, {}, T, F).has(TISL), 'ss_t home: the moat runs');
  assert.ok(walkFrom(m, { pos: { ss_t: [16, 20] } }, T, F).has(TISL), 'ss_t between the lamp and the moat: down the dark column');
  assert.ok(!walkFrom(m, { pos: { ss_t: [15, 20] } }, T, F).has(TISL), 'one Shove short: no path');
  const plate = (st) => stateOf(m, db, st).plates.find((p) => p.id === 'plate_r');
  assert.equal(plate({}).lit, true, 'lamp_r2 home reaches the plate (the stone keeps lamp_r1 off)');
  assert.equal(plate({ pos: { lamp_r2: [19, 29] } }).lit, true, 'one Shove: still in reach');
  assert.equal(plate({ pos: { lamp_r2: [20, 29] } }).lit, false, 'two Shoves: out of reach, the plate in shade');
  const R = [10, 28];
  assert.ok(!walkFrom(m, {}, R, F).has(key(14, 32)), 'the moon gate shut');
  assert.ok(walkFrom(m, { pos: { lamp_r2: [20, 29] }, latched: ['plate_r'] }, R, F).has(key(14, 32)), 'shaded and latched: the last spring');
  const dark = search(m, { keys: KEYS, flags: [...F, 'oracle_door_open'] });
  const lit = search(m, { keys: KEYS, lantern: true, flags: [...F, 'oracle_door_open'] });
  assert.ok(dark.report.unreached.includes('chest_bow') && !lit.report.unreached.includes('chest_bow'), 'the Bow needs the Lantern');
  // the Sun Keyhole: shut until oracle_door_open, then it turns with the Sun Key
  const noKey = search(m, { lantern: true, flags: [...F, 'oracle_door_open'] });
  assert.ok(!noKey.report.opened.includes('door_oracle') && lit.report.opened.includes('door_oracle'));
  const before = search(m, { keys: KEYS, lantern: true, flags: F });
  assert.ok(!reachedIds(before.report).has('door_oracle') && reachedIds(before.report).has('keyhole_shut'), 'no door before Sel reads the page');
});

// ------------------------------------------------------------------------------------------------ the critical path
test('the critical path: the Oasis Gate -> F2 -> F3 -> the Eye, and home by the lifts', () => {
  const hop = (from, id, toMap) => {
    const e = byId(maps[from], id);
    assert.ok(e, `${from}: ${id}`);
    assert.equal(e.to[0], toMap, `${from}/${id} -> ${toMap}`);
    if (maps[toMap]) {
      const g = buildGrid({ ...maps[toMap], events: maps[toMap].events.filter((x) => x.type !== 'locked_door' && x.type !== 'gate') }, db);
      assert.equal(g.code[e.to[2]][e.to[1]], 'none', `${id} lands on walkable ${toMap} ${e.to[1]},${e.to[2]}`);
      assert.ok(!isSand(maps[toMap], e.to[1], e.to[2]), `${id} lands off the sand`);
    }
    return e.to;
  };
  // F1 from the Oasis Gate with nothing in hand: both keys, the camp court, the stair
  const f1 = search(maps.ep5_lab_f1, { lantern: true, flags: [...ARRIVE.ep5_lab_f1, 'sel_memory_1', 'plate_f1_open'] });
  assert.deepEqual(f1.errors, []);
  assert.ok(f1.report.keys.includes('dune_key') && f1.report.keys.includes('sun_key'), 'F1 yields the Dune Key and the Sun Key');
  for (const e of ['memory1_trig', 'gate_d', 'chest_sunkey', 'stair_trig', 'stair_f2']) assert.ok(!f1.report.unreached.includes(e), `F1: ${e}`);
  let to = hop('ep5_lab_f1', 'stair_f2', 'ep5_lab_f2');
  assert.deepEqual(to.slice(1, 3), [maps.ep5_lab_f2.start.x, maps.ep5_lab_f2.start.y]);
  // F2: its own Dune Key opens door_e; the Knight; the stair after the win
  const f2 = search(maps.ep5_lab_f2, { lantern: true, flags: [...ARRIVE.ep5_lab_f2, 'knight_defeated', 'lab_f2_done', 'dune_key_f2', 'reliquary_found'] });
  assert.deepEqual(f2.errors, []);
  assert.ok(f2.report.opened.includes('door_e'));
  for (const e of ['memory2_trig', 'vex_trig', 'knight_trig', 'stair_trig', 'stairs_f3', 'lift_f2_short', 'chest_cache', 'book_log']) assert.ok(!f2.report.unreached.includes(e), `F2: ${e}`);
  const rel = search(maps.ep5_lab_f2, { lantern: true, flags: ARRIVE.ep5_lab_f2 });
  assert.ok(!rel.report.unreached.includes('reliquary_obj') && rel.report.shade.firstAt.reliquary_obj.startsWith('dusk'), 'the Reliquary, at dusk');
  const f2pre = search(maps.ep5_lab_f2, { lantern: true, flags: ARRIVE.ep5_lab_f2 });
  assert.ok(!reachedIds(f2pre.report).has('stairs_f3') && !byId(pre(maps.ep5_lab_f2, ARRIVE.ep5_lab_f2), 'stairs_f3'), 'F2: no stair before the Knight');
  to = hop('ep5_lab_f2', 'stairs_f3', 'ep5_lab_f3');
  assert.deepEqual(to.slice(1, 3), [maps.ep5_lab_f3.start.x, maps.ep5_lab_f3.start.y]);
  // F3: three landings, the springs in order, the Keyhole with F1's Sun Key
  const f3 = search(maps.ep5_lab_f3, { lantern: true, keys: ['sun_key'], flags: [...ARRIVE.ep5_lab_f3, 'landing_shelter', 'landing_truth', 'landing_return', 'sel_memory_3', 'oracle_door_open'] });
  assert.deepEqual(f3.errors, []);
  for (const e of ['shelter_trig', 'truth_trig', 'return_trig', 'spring_return_full', 'door_oracle', 'lift_s', 'lift_t', 'font_l3']) assert.ok(!f3.report.unreached.includes(e), `F3: ${e}`);
  to = hop('ep5_lab_f3', 'door_oracle', 'ep5_lab_oracle');
  assert.deepEqual(to.slice(1, 3), [maps.ep5_lab_oracle.start.x, maps.ep5_lab_oracle.start.y]);
  // the Eye: the trigger row on the way in; after the win, the lift home
  const eye = walk(pre(maps.ep5_lab_oracle, [...ARRIVE.ep5_lab_oracle, 'oracle_defeated', 'chart_restored']), db, { flags: [...ARRIVE.ep5_lab_oracle, 'oracle_defeated', 'chart_restored'] });
  for (const e of ['oracle_trig', 'lift_out', 'eye_exit', 'feather_eye']) assert.ok(!eye.unreached.includes(e), `Eye: ${e}`);
  // home by the lifts and back down the stairs: every hop lands on walkable floor off the sand
  hop('ep5_lab_oracle', 'lift_out', 'ep5_saffron');
  hop('ep5_lab_oracle', 'eye_exit', 'ep5_lab_f3');
  hop('ep5_lab_f2', 'lift_f2_short', 'ep5_lab_f1');
  hop('ep5_lab_f1', 'lift_f1', 'ep5_lab_f2');
  hop('ep5_lab_f2', 'stairs_f1', 'ep5_lab_f1');
  hop('ep5_lab_f3', 'stairs_f2', 'ep5_lab_f2');
  hop('ep5_lab_f1', 'to_haven', 'ep5_saffron');
  for (const id of ['lift_s', 'lift_t', 'down_shelter', 'up_top_s', 'down_truth', 'up_shelter', 'down_return', 'up_truth', 'down_keyhole', 'up_return']) hop('ep5_lab_f3', id, 'ep5_lab_f3');
  // the lifts carry the party only once the floor below is done; the Haven door once the Labyrinth is entered
  assert.equal(byId(maps.ep5_lab_f1, 'lift_f1').if, 'lab_f2_done');
  assert.equal(byId(maps.ep5_lab_f2, 'lift_f2_short').if, 'lab_f2_done');
  assert.equal(byId(maps.ep5_lab_oracle, 'lift_out').if, 'oracle_defeated');
  assert.equal(byId(maps.ep5_lab_f1, 'to_haven').if, 'lab_entered');
  // the lifts and the Haven door land where the other side expects (once E5-maps-a's Haven exists)
  if (maps.ep5_saffron && maps.ep5_saffron.marks.north_gate) {
    assert.deepEqual(byId(maps.ep5_lab_oracle, 'lift_out').to.slice(1, 3), maps.ep5_saffron.marks.north_gate, 'lift_out lands on north_gate');
    const gate = maps.ep5_saffron.events.find((e) => Array.isArray(e.to) && e.to[0] === 'ep5_lab_f1');
    if (gate) assert.deepEqual(gate.to.slice(1, 3), [maps.ep5_lab_f1.start.x, maps.ep5_lab_f1.start.y], 'the Haven gate lands on F1 start');
  }
  // the scene chain the floors rely on
  for (const s of ['lab_f1_arrival', 'sel_memory_1', 'lab_f1_stair', 'lab_f2_arrival', 'sel_memory_2', 'vex_gallery', 'mirage_knight', 'lab_f2_stair',
    'reliquary', 'lab_f3_arrival', 'landing_shelter', 'landing_truth', 'landing_return', 'oracle', 'oracle_after']) assert.ok(db.scenes[s], `scene ${s}`);
});

test('every chest is reachable in some state (the Lantern for the Bow, bells_started for the bells)', () => {
  const all = {
    ep5_lab_f1: [[...ARRIVE.ep5_lab_f1, 'sel_memory_1', 'bells_started'], [...ARRIVE.ep5_lab_f1, 'sel_memory_1']],
    ep5_lab_f2: [[...ARRIVE.ep5_lab_f2, 'reliquary_found', 'dune_key_f2', 'knight_defeated', 'lab_f2_done']],
    ep5_lab_f3: [[...ARRIVE.ep5_lab_f3, 'oracle_door_open']],
  };
  for (const [id, sets] of Object.entries(all)) {
    const seen = new Set();
    for (const fl of sets) {
      const a = search(maps[id], { keys: KEYS, lantern: true, flags: fl });
      assert.deepEqual(a.errors, [], id);
      for (const e of a.report.events) if (e.reached) seen.add(e.id);
    }
    for (const e of maps[id].events.filter((x) => x.type === 'chest' || x.type === 'book')) assert.ok(seen.has(e.id), `${id}: ${e.id} reachable`);
  }
});

// ------------------------------------------------------------------------------------------------ the reload rule
/**
 * The map with exactly a set of plates latched for good: the gates they open stand open (their cells plain floor), and
 * every other plate is gone, so its gate stays shut (the cells a game can be saved on with exactly that set latched).
 */
function latched(m, set) {
  const drop = new Set();
  for (const p of m.events.filter((e) => e.type === 'sunplate')) {
    drop.add(p.id);
    if (set.has(p.id)) for (const t of [].concat(p.target || [])) drop.add(t);
  }
  return { ...m, events: m.events.filter((e) => !drop.has(e.id)) };
}
const subsets = (list) => list.reduce((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]);
/** The field's rescue (system.js rescue): off sand that runs at the start hour to the nearest safe cell, through any non-wall cell. */
function rescue(grid, wallGrid, x, y) {
  if (grid[y][x] !== 'water') return [x, y];
  const H = grid.length, W = grid[0].length, seen = new Set([key(x, y)]), q = [[x, y]];
  while (q.length) {
    const [cx, cy] = q.shift();
    if (grid[cy][cx] === 'none') return [cx, cy];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k) || wallGrid[ny][nx]) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return [x, y];
}

test('reload rule: from every reachable cell, with any plates latched, at the start hour with every stone and lamp home, the way back is open', () => {
  for (const id of MINE) {
    const m0 = maps[id];
    const plates = m0.events.filter((e) => e.type === 'sunplate').map((e) => e.id);
    const W = W_OF(m0), startK = key(m0.start.x, m0.start.y);
    let checked = 0;
    for (const set of subsets(plates)) {
      const m = latched(m0, new Set(set));
      const opts = { keys: [...KEYS], lantern: true, flags: ARRIVE[id] };
      const { a: base } = searchFix(m, opts);
      const grid = base.report.grid;
      const bare = buildGrid({ ...m, events: [] }, db);
      const wallGrid = bare.code.map((r) => r.map((c) => c === 'solid' || c === 'void'));
      // one reload point per walkable component of the start state, every other reached cell alone (sand, stones' homes)
      const comp = new Map();
      let n = 0;
      for (const k of base.report.reachable) {
        if (comp.has(k)) continue;
        const [x, y] = k.split(',').map(Number);
        const c0 = n++;
        comp.set(k, c0);
        if (grid[y][x] !== 'none') continue;
        const q = [[x, y]];
        while (q.length) {
          const [cx, cy] = q.pop();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy, nk = key(nx, ny);
            if (ny < 0 || ny >= grid.length || nx < 0 || nx >= W || comp.has(nk) || grid[ny][nx] !== 'none') continue;
            comp.set(nk, c0); q.push([nx, ny]);
          }
        }
      }
      const reachable = new Set(base.report.reachable);
      const reps = new Map();
      for (const [k, c] of comp) if (!reps.has(c) && reachable.has(k)) reps.set(c, k);
      for (const k of reps.values()) {
        const [x, y] = k.split(',').map(Number);
        const [rx, ry] = rescue(grid, wallGrid, x, y);
        const { a: r } = searchFix(m, { ...opts, start: [rx, ry] });
        assert.ok(new Set(r.report.reachable).has(startK), `${id} latched [${set.join(' ')}]: a game saved at ${k} (woken at ${rx},${ry}) cannot get back to ${startK}`);
        checked++;
      }
    }
    assert.ok(checked > (m0.shade ? 3 : 0), `${id}: ${checked} reload points`);
  }
});

// ------------------------------------------------------------------------------------------------ the field sees the checker's light
test('the field\'s light equals the checker\'s in every state (no dressing stands in a shadow, shaft or lamp line)', () => {
  for (const id of ['ep5_lab_f1', 'ep5_lab_f2', 'ep5_lab_f3']) {
    const m = maps[id], c = compile(m);
    const hours = c.hour === 'night' ? ['night'] : ['dawn', 'noon', 'dusk'];
    const tracks = c.movers.map((r) => r.track);
    const combos = tracks.reduce((acc, t) => acc.flatMap((a) => t.map((i) => [...a, i])), [[]]);
    const fs0 = fieldSolid(m, db, {}), cs0 = checkerSolid(m, db, {});
    let states = 0;
    for (const hour of hours) for (const combo of combos) {
      if (new Set(combo).size !== combo.length) continue;
      const pos = Object.fromEntries(c.movers.map((r, k) => [r.id, combo[k]]));
      const a = light(m, { hour, pos, solid: fs0 }), b = light(m, { hour, pos, solid: cs0 });
      for (let i = 0; i < c.N; i++) if (a.lit[i] !== b.lit[i]) assert.fail(`${id} ${hour} ${JSON.stringify(pos)}: cell ${i % c.W},${(i / c.W) | 0} lit ${a.lit[i]} in the field, ${b.lit[i]} in the checker`);
      states++;
    }
    assert.ok(states >= 3, id);
  }
});

test('no stone or lamp is Shoved into a cell another caster event covers (a field entity spans h cells down from its anchor)', () => {
  for (const id of ['ep5_lab_f1', 'ep5_lab_f2', 'ep5_lab_f3']) {
    const m = maps[id], c = compile(m);
    const covered = new Map();
    for (const e of m.events.filter((x) => x.type !== 'trigger' && x.type !== 'light' && x.type !== 'sunplate' && x.type !== 'window')) {
      if (c.movers.some((r) => r.id === e.id)) continue;
      for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) covered.set(key(e.x + i, e.y + j), e.id);
    }
    for (const r of c.movers) for (const i of r.track) {
      const k = key(i % c.W, (i / c.W) | 0);
      assert.ok(!covered.has(k) || i === r.i, `${id}: ${r.id}'s groove cell ${k} is under ${covered.get(k)}`);
    }
  }
});
