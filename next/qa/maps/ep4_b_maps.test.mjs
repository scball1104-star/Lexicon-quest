// Episode 4 maps, part B (E4-maps-b, EPISODE4_PLAN 4.4 to 4.9, 5.1): the Sunken Keep's three floors and the Drowned
// Throne. Water is the pack's own rule (src/data/ep4/field/tide.js); the whole-map state search is tools/maps/ep4_check.mjs
// (validate runs it). This file adds: the plan tables, the STAGING_EP4 marks, each puzzle's start state and intended
// solution, the critical path from F1's Water Gate to the Drowned Throne and back by the boats, every chest, and the
// reload rule: a game saved on any cell the party can reach, with any set of seals washed and floodgates latched, reloads
// with every basin at its start level onto a floor it can walk out of.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadAll, loadDb, validate, loadStaging, buildGrid, walk } from '../../tools/maps/mapcheck.mjs';
import { analyse } from '../../tools/maps/ep4_check.mjs';
import { classify, washes, compile } from '../../src/data/ep4/field/tide.js';

await (await import('../../src/data/ep4/index.js')).register();
const db = await loadDb();
const MINE = ['ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3', 'ep4_keep_crown'];
const maps = await loadAll();
const staging = loadStaging();
const { EP4_LINES, EP4_BOOKS } = await import('../../src/data/ep4/text.js');
const { EP4_ZONES } = await import('../../src/data/ep4/encounters.js');
const { EP4_MAP_IDS } = await import('../../src/data/ep4/maps.js');

const byId = (m, id) => m.events.find((e) => e.id === id);
/** The tide search for a keep floor, mapcheck's plain walk for the throne room (no tide block). Same report shape. */
const search = (m, opts = {}) => (m.tide ? analyse(m, db, opts) : { errors: [], report: walk(m, db, opts) });
const key = (x, y) => `${x},${y}`;
const KEYS = ['tide_key', 'seal_key'];
const PRINCIPLES = ['principle_voice', 'principle_truth', 'principle_mercy'];

/** The map frozen at a tide state: water cells, floating or grounded pontoons, wheels and posts as stands (plain walk). */
function frozen(m, state) {
  const c = classify(m, state);
  const W = m.ground[0].length;
  const rows = m.ground.map((r) => r.split(''));
  for (const i of c.flooded) rows[Math.floor(i / W)][i % W] = '¤';
  for (const i of c.solid) rows[Math.floor(i / W)][i % W] = '#';
  const events = [];
  for (const e of m.events) if (e.type === 'gate' && (state.open || []).includes(e.id)) for (let k = 0; k < (e.w || 1); k++) rows[e.y][e.x + k] = '.';
  for (const e of m.events) {
    if (e.type === 'tidewheel' || e.type === 'tidepost') { events.push({ ...e, type: 'object', sprite: 'tide_post' }); continue; }
    if (e.type === 'pontoon' || e.type === 'forgery' || e.type === 'floodgate') continue;
    if (e.type === 'gate' && (state.open || []).includes(e.id)) continue;
    events.push(e);
  }
  const { tide, ...rest } = m;
  return { ...rest, legend: { ...m.legend, '¤': 'tide_water' }, ground: rows.map((r) => r.join('')), events };
}
function codesOf(f) { return buildGrid(f, db).code; }
/** Cells reached on foot from `from` in one frozen state (no wheel turns, no warps). */
function walkFrom(m, state, from) {
  const f = frozen(m, state);
  const code = codesOf(f);
  const W = f.ground[0].length, H = f.ground.length;
  const seen = new Set([key(...from)]), q = [from];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k)) continue;
      const c = code[ny][nx];
      if (c !== 'none') continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return seen;
}
/** Is event `e` touched (stood on or faced) from the set of cells? */
const touches = (set, e) => {
  const cells = [];
  for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) cells.push([e.x + i, e.y + j]);
  return cells.some(([x, y]) => set.has(key(x, y)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => set.has(key(x + dx, y + dy))));
};

// ------------------------------------------------------------------------------------------------ validation
test('the four Keep maps are the registry\'s and validate (ids, lines, plan, the tide search) with every chest and wheel reached', () => {
  for (const id of MINE) assert.ok(EP4_MAP_IDS.includes(id), `${id} is listed in src/data/ep4/maps.js`);
  for (const id of MINE) {
    const m = maps[id];
    assert.equal(m.id, id);
    const r = validate(m, db, maps, { staging });
    assert.deepEqual(r.errors, [], id);
    assert.deepEqual(r.warnings, [], id);
    const a = search(m, { keys: KEYS, lantern: true });
    assert.deepEqual(a.errors, [], `${id}: ep4_check`);
    const un = new Set(a.report.unreached);
    for (const e of m.events) if (['chest', 'tidewheel', 'door', 'locked_door', 'object', 'trigger', 'enemy', 'actor', 'gate', 'sign', 'book', 'font'].includes(e.type)) {
      assert.ok(!un.has(e.id), `${id}: ${e.type} ${e.id} reached`);
    }
    if (m.tide) assert.equal(a.report.tide.stranded, 0, `${id}: no stranded state`);
    assert.equal(m.ambience, 'keep_drip');
    assert.equal(m.area, 'dungeon');
    assert.ok(db.BANNERS[id], `${id} banner`);
  }
  // every inspect line and book is the pack's
  for (const id of MINE) for (const e of maps[id].events) {
    if (e.text && /^(ep4_|sign_ep4_)/.test(e.text)) assert.ok(EP4_LINES[e.text], `${id}/${e.id}: line ${e.text}`);
    if (e.type === 'book') assert.ok(EP4_BOOKS[e.book], `${id}/${e.id}: book ${e.book}`);
  }
});

test('enemy and chest tables match the plan (4.5 to 4.8)', () => {
  for (const id of ['ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3']) {
    const plan = Object.fromEntries(EP4_ZONES[id].plan.filter(([e]) => e !== 'barrister'));
    const got = {};
    for (const e of maps[id].events.filter((x) => x.type === 'enemy')) got[e.encounter] = (got[e.encounter] || 0) + 1;
    assert.deepEqual(got, plan, id);
    for (const e of maps[id].events.filter((x) => x.type === 'enemy')) assert.equal(e.sprite, db.ENCOUNTERS[e.encounter].leader, `${e.id} draws its leader`);
  }
  const chests = (id) => maps[id].events.filter((e) => e.type === 'chest').map((e) => [e.tier, e.item || null, e.flag || null, e.if || null]);
  assert.deepEqual(chests('ep4_keep_f1').sort(), [
    ['wood', 'hi_potion', null, null], ['wood', 'nilo_bell', 'nilo_bell_found', 'nilo_started'], ['wood', 'tide_key', 'tide_key_f1', null],
    ['gold', 'seal_key', 'seal_key_found', null], ['gold', 'tidewalker_boots', null, null], ['iron', null, null, null]].sort());
  assert.deepEqual(chests('ep4_keep_f2').sort(), [
    ['iron', null, null, null], ['gold', 'hi_ether', null, 'coffer_found'], ['wood', 'tide_key', 'tide_key_f2', null], ['wood', 'hi_potion', null, null]].sort());
  assert.equal(byId(maps.ep4_keep_f2, 'chest_cache').gold, 190);
  assert.deepEqual(chests('ep4_keep_f3').sort(), [
    ['gold', 'tidewarden_spear', null, null], ['iron', null, null, null], ['wood', 'lamp_oil', null, null]].sort());
  assert.equal(maps.ep4_keep_crown.events.filter((e) => e.type === 'chest').length, 0);
  // the bosses: the Barrister on its bench with its arena trigger, the Paper Regent on the throne
  assert.equal(byId(maps.ep4_keep_f2, 'barrister_trig').script, 'barrister');
  assert.equal(byId(maps.ep4_keep_crown, 'paper_regent').sprite, 'paper_regent_avatar');
  assert.equal(byId(maps.ep4_keep_crown, 'regent_trig').script, 'paper_regent');
});

test('plan 4.9 named events and every STAGING_EP4 mark of part B exist; walk-to and spawn marks stand on walkable floor', () => {
  const text = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP4.md'), 'utf8');
  for (const id of MINE) {
    const h = text.split('\n').find((l) => l.startsWith(`### \`${id}\``));
    assert.ok(h, `STAGING_EP4 heading for ${id}`);
    const marks = [...h.matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]).filter((x) => x !== id);
    assert.ok(marks.length >= 6, id);
    for (const mk of marks) assert.ok(maps[id].marks[mk], `${id}: mark ${mk}`);
  }
  const need = {
    ep4_keep_f1: ['wh_a', 'wh_b', 'seal_b', 'tidegate', 'memory1_trig', 'door_d', 'crack_d', 'pt_e', 'lift_trig', 'boat_vw', 'hale_punt', 'font_k1', 'tide_log'],
    ep4_keep_f2: ['wh_a', 'wh_b', 'wh_c', 'seal_d', 'coffer_obj', 'memory2_trig', 'vex_trig', 'feather_dry', 'barrister_trig', 'barrister', 'door_e', 'stair_trig', 'stairs_f3', 'boat_f2_short', 'font_k2', 'font_k2b', 'book_ledger'],
    ep4_keep_f3: ['petition_gate', 'stone_voice', 'stone_truth', 'stone_mercy', 'witness_lectern', 'gate_trig', 'door_throne', 'dam_t', 'boat_f3_short', 'font_k3', 'keeper_note', 'principles_sign'],
    ep4_keep_crown: ['paper_regent', 'throne', 'throne_empty', 'regent_trig', 'boat_crown_out', 'witness_page', 'crown_enter'],
  };
  for (const [id, ids] of Object.entries(need)) for (const e of ids) assert.ok(byId(maps[id], e), `${id}: ${e}`);
  assert.deepEqual(Object.keys(maps.ep4_keep_f1.tide.basins), ['a', 'b']);
  assert.deepEqual(Object.keys(maps.ep4_keep_f2.tide.basins), ['a', 'b', 'c']);
  assert.ok(byId(maps.ep4_keep_f3, 'dam_t').heavy, 'the Truth dam is a heavy block (Shove)');
  assert.deepEqual(byId(maps.ep4_keep_f3, 'petition_gate').flags, PRINCIPLES);
  assert.equal(byId(maps.ep4_keep_f2, 'coffer_obj').if, 'tide:c>=2');
  assert.equal(byId(maps.ep4_keep_f2, 'coffer_obj').lantern, true);
  // marks a scene walks to or spawns an actor at stand on walkable floor (camera-only marks may sit anywhere)
  const walkTo = { ep4_keep_f1: ['start', 'audience_regent', 'audience_boatman', 'audience_guard'], ep4_keep_f2: ['arrival', 'scriptorium_regent', 'scriptorium_scribe', 'barrister_spot'],
    ep4_keep_f3: ['arrival', 'lectern', 'memory3_regent', 'gate_spot'], ep4_keep_crown: ['party_stop', 'lyra_enter', 'lyra_sign', 'charter_spot', 'throne'] };
  for (const [id, list] of Object.entries(walkTo)) {
    const a = search(maps[id], { keys: KEYS, lantern: true });
    const marks = Object.fromEntries(a.report.marks.map((m) => [m.name, m]));
    for (const mk of list) assert.ok(marks[mk] && marks[mk].walkable, `${id}: ${mk} walkable`);
  }
  // the crown's walk targets are on the regent's path from the south mouth
  const crown = new Set(search(maps.ep4_keep_crown, {}).report.reachable);
  for (const mk of ['party_stop', 'lyra_enter', 'lyra_sign', 'charter_spot', 'table']) assert.ok(crown.has(key(...maps.ep4_keep_crown.marks[mk])), `crown: ${mk} reached`);
});

// ------------------------------------------------------------------------------------------------ puzzles, floor by floor
test('F1: B washes the seal only at high, C floats at mid, E rises at high, F latches at high (the teaching ladder)', () => {
  const m = maps.ep4_keep_f1;
  const start = { levels: { a: 0, b: 0 } };
  assert.deepEqual(washes(m, start), [], 'the arrival washes nothing');
  assert.deepEqual(washes(m, { levels: { a: 1, b: 0 } }), [], 'mid: the water stands under the seal');
  assert.deepEqual(washes(m, { levels: { a: 2, b: 0 } }), ['seal_b'], 'high washes seal_b');
  const S = [19, 27];
  const r0 = walkFrom(m, start, S);
  assert.ok(touches(r0, byId(m, 'wh_a')), 'the Water Gate reaches wh_a at the start levels');
  assert.ok(!r0.has(key(17, 7)), 'the papered door is shut at the start');
  const rw = walkFrom(m, { levels: { a: 0, b: 0 }, open: ['door_papered'], washed: ['seal_b'] }, S);
  for (const c of [[17, 7], [17, 5], [27, 8], [29, 13]]) assert.ok(rw.has(key(...c)), `washed and low: ${c}`);
  assert.ok(!walkFrom(m, { levels: { a: 2, b: 0 }, open: ['door_papered'], washed: ['seal_b'] }, S).has(key(17, 10)), 'high: the canal is under water');
  // C: low, the channel floor is a dead end (Nilo's chest) and the east bank is out of reach; mid, the pontoons cross
  const W0 = walkFrom(m, start, [29, 13]);
  assert.ok(W0.has(key(33, 9)) && touches(W0, byId(m, 'chest_nilo')), 'low: the channel floor and the bell chest');
  assert.ok(!W0.has(key(36, 15)), 'low: no way east');
  const W1 = walkFrom(m, { levels: { a: 0, b: 1 } }, [29, 13]);
  assert.ok(W1.has(key(36, 15)) && touches(W1, byId(m, 'chest_tide_key')), 'mid: east over the pontoons to the Tide Key');
  assert.ok(!W1.has(key(36, 9)), 'mid: the gallery is still above the lip');
  const W2 = walkFrom(m, { levels: { a: 0, b: 2 } }, [36, 15]);
  assert.ok(W2.has(key(36, 9)) && touches(W2, byId(m, 'chest_seal_key')), 'high: pt_e rises to the gallery and the Seal Key');
  // F: the floodgate opens at b high and latches; low again walks the channel floor through it to the lift
  const mc = compile(m);
  const fg = mc.floodgates.find((g) => g.id === 'tidegate');
  assert.equal(fg.at, 2); assert.ok(fg.latch);
  const lift = walkFrom(persisted(m, new Set(['tidegate'])), start, [29, 13]);
  assert.ok(lift.has(key(33, 3)) && touches(lift, byId(m, 'lift_trig')), 'latched and low: through the tidegate to the lift');
  assert.ok(!walkFrom(m, start, [29, 13]).has(key(33, 3)), 'shut: no way to the lift');
});

test('F2: B two heights in one basin, D two basins in series (order forced by reach)', () => {
  const m = maps.ep4_keep_f2;
  const L = (a, b, c) => ({ levels: { a, b, c } });
  assert.deepEqual(washes(m, L(1, 0, 0)), [], 'the arrival washes nothing');
  const DOCK = [8, 17], N = [11, 5], G = [3, 9];
  assert.ok(walkFrom(m, L(1, 0, 0), DOCK).has(key(...N)), 'start mid: the crates reach the north landing');
  assert.ok(!walkFrom(m, L(1, 0, 0), DOCK).has(key(...G)), 'mid: the gallery crate sits on its sill');
  assert.ok(!walkFrom(m, L(0, 0, 0), DOCK).has(key(...N)), 'low: every crate aground');
  const hi = walkFrom(m, L(2, 0, 0), DOCK);
  assert.ok(hi.has(key(...G)) && touches(hi, byId(m, 'chest_gallery')), 'high: the column reaches the gallery and its chest');
  assert.ok(!hi.has(key(7, 10)), 'high: the reading island is under');
  // D
  const WS = [26, 10];
  assert.ok(touches(walkFrom(m, L(1, 0, 0), WS), byId(m, 'wh_c')), 'b low: wh_c stands on the dry channel floor');
  assert.ok(!touches(walkFrom(m, L(1, 1, 0), WS), byId(m, 'wh_c')), 'b mid: wh_c is under water');
  assert.ok(touches(walkFrom(m, L(1, 0, 0), WS), byId(m, 'vex_trig')), 'b low: the channel floor leads to the Dry Room');
  assert.deepEqual(washes(m, L(1, 0, 1)), [], 'c mid: the water stands under seal_d');
  assert.deepEqual(washes(m, L(1, 0, 2)), ['seal_d'], 'c high washes seal_d');
  assert.deepEqual(washes(m, L(1, 2, 0)), [], 'basin b never washes seal_d');
  const KEYROOM = [35, 4];
  assert.ok(!walkFrom(m, L(1, 1, 0), WS).has(key(...KEYROOM)), 'not washed: the key room is shut');
  const solved = walkFrom(m, { ...L(1, 1, 0), open: ['door_keyroom'], washed: ['seal_d'] }, WS);
  assert.ok(solved.has(key(...KEYROOM)) && touches(solved, byId(m, 'chest_tide_key')), 'washed, c low, b mid: the crates and the walkway to the Tide Key');
  assert.ok(!walkFrom(m, { ...L(1, 1, 2), open: ['door_keyroom'], washed: ['seal_d'] }, WS).has(key(...KEYROOM)), 'c high: the walkway is under');
  // the coffer: present only at c high, read from the dry south stand
  const ss = walkFrom(m, L(1, 0, 2), [30, 16]);
  assert.ok(touches(ss, byId(m, 'coffer_obj')), 'the coffer is faced from the south stand');
  const cl = classify(m, L(1, 0, 2));
  assert.ok(cl.water.has(14 * 40 + 36), 'the Keeper marks are under water at c high (true ink)');
  // the Court Room: door_e from the approach, the arena row, the stair and the boat after the win
  const ap = walkFrom(m, { ...L(1, 0, 0), open: [] }, [20, 26]);
  assert.ok(touches(ap, byId(m, 'door_e')) && !ap.has(key(20, 19)));
  assert.equal(byId(m, 'stairs_f3').to[0], 'ep4_keep_f3');
  assert.deepEqual(byId(m, 'scriptorium_pit').to.slice(0, 3), ['ep4_keep_f1', 28, 14]);
});

test('F3: Voice (a sequence), Truth (a dam and two seals), Mercy (the dark), the gate', () => {
  const m = maps.ep4_keep_f3;
  const L = (v, t, mm) => ({ levels: { v, t, m: mm } });
  assert.deepEqual(washes(m, L(0, 0, 0)), [], 'the arrival washes nothing');
  // Voice
  const L1 = [11, 15], L2 = [5, 9], ISL = [11, 7];
  assert.ok(walkFrom(m, L(0, 0, 0), L1).has(key(...L2)), 'low: the causeway to the second landing');
  assert.ok(!walkFrom(m, L(1, 0, 0), L1).has(key(...L2)), 'mid: the causeway is under');
  assert.ok(!walkFrom(m, L(0, 0, 0), L2).has(key(...ISL)), 'low: the pontoons sit on the floor');
  const vm = walkFrom(m, L(1, 0, 0), L2);
  assert.ok(vm.has(key(...ISL)) && touches(vm, byId(m, 'stone_voice')), 'mid from L2: the pontoons to the island and its stone');
  assert.ok(!walkFrom(m, L(2, 0, 0), L2).has(key(...ISL)), 'high: the pontoons are under');
  // Truth: dammed, the wheel moves nothing but the culvert; shoved, mid washes the low seal, high the high one
  const dam = byId(m, 'dam_t'), damI = dam.y * 44 + dam.x;
  const dammed = (t) => ({ ...L(0, t, 0), dams: [damI] });
  assert.deepEqual(washes(m, dammed(2)), [], 'dammed: high washes nothing');
  assert.equal(classify(m, dammed(2)).water.size, 1, 'dammed: the water stands in the culvert mouth alone');
  assert.deepEqual(washes(m, L(0, 1, 0)), ['seal_t1'], 'open, mid: the low seal');
  assert.deepEqual(washes(m, L(0, 2, 0)).sort(), ['seal_t1', 'seal_t2'], 'open, high: both');
  const L3 = [35, 18];
  const shove = walkFrom(m, dammed(0), L3);
  assert.ok(shove.has(key(39, 8)), 'the causeway reaches the shove step beside the block');
  assert.ok(!shove.has(key(37, 8)), 'the pocket is only ever the block\'s');
  const tr = walkFrom(m, { ...L(0, 0, 0), open: ['door_t1', 'door_t2'], washed: ['seal_t1', 'seal_t2'] }, L3);
  assert.ok(touches(tr, byId(m, 'stone_truth')) && touches(tr, byId(m, 'chest_alcove')), 'washed and low: the stone and the alcove chest');
  // Mercy: only high water floats the whole line of boats; the island holds the stone, the ink bridge the spear
  const LM = [21, 23], IS = [10, 28];
  assert.ok(!walkFrom(m, L(0, 0, 1), LM).has(key(...IS)), 'mid: the two sills keep their boats aground');
  const mh = walkFrom(m, L(0, 0, 2), LM);
  assert.ok(mh.has(key(...IS)) && touches(mh, byId(m, 'stone_mercy')), 'high: the boats to the island');
  const lanterns = (m.decor || []).filter((d) => d.t === 'lantern_chain' && d.y >= 26);
  const wet = classify(m, L(0, 0, 2)).water;
  assert.ok(lanterns.length >= 3 && lanterns.every((d) => wet.has(d.y * 44 + d.x)), 'high: every Mercy lantern hangs over water (its light)');
  assert.ok(lanterns.every((d) => !classify(m, L(0, 0, 0)).water.has(d.y * 44 + d.x)), 'low: none does (the dark)');
  const lit = analyse(m, db, { lantern: true, keys: KEYS });
  const dark = analyse(m, db, { keys: KEYS });
  assert.ok(!lit.report.unreached.includes('chest_spear') && dark.report.unreached.includes('chest_spear'), 'the spear needs the Lantern');
  assert.ok(classify(m, L(0, 0, 2)).water.has(28 * 44 + 12), 'the Keeper note is under high water (true ink)');
  // the gate opens only on all three principles; the throne door needs the Seal Key
  const g = byId(m, 'petition_gate');
  assert.equal(g.sprite, 'petition_gate'); assert.equal(g.w, 3);
  const noKey = analyse(m, db, { lantern: true, keys: ['tide_key'] });
  assert.ok(!noKey.report.opened.includes('door_throne'));
  assert.ok(lit.report.opened.includes('door_throne') && lit.report.opened.includes('petition_gate'));
  assert.deepEqual(byId(m, 'door_throne').to.slice(0, 3), ['ep4_keep_crown', 11, 18]);
});

// ------------------------------------------------------------------------------------------------ the critical path
test('the critical path: Valewyn -> F1 Water Gate -> F2 -> F3 -> the Drowned Throne, and home by the boats', () => {
  const hop = (from, id, toMap) => {
    const e = byId(maps[from], id);
    assert.ok(e, `${from}: ${id}`);
    assert.equal(e.to[0], toMap, `${from}/${id} -> ${toMap}`);
    return e.to;
  };
  // each floor's search from its own arrival reaches its way on (keys from earlier floors carried)
  const reached = (id, opts, evId) => {
    const a = analyse(maps[id], db, opts);
    assert.deepEqual(a.errors, [], `${id} (${JSON.stringify(opts)})`);
    assert.ok(!a.report.unreached.includes(evId), `${id}: ${evId} reached`);
    return a.report.tide ? a.report.tide.firstAt[evId] : 'plain';
  };
  if (maps.ep4_valewyn) {
    const t = hop('ep4_valewyn', 'keep_boat', 'ep4_keep_f1');
    assert.deepEqual(t.slice(1, 3), [maps.ep4_keep_f1.start.x, maps.ep4_keep_f1.start.y], 'the Keep ferry lands on F1 start');
  }
  // F1: from the Water Gate with nothing in hand: the Seal Key and the lift (keys come from the floor's own chests)
  const f1 = analyse(maps.ep4_keep_f1, db, { lantern: true });
  assert.deepEqual(f1.errors, []);
  assert.ok(f1.report.keys.includes('tide_key') && f1.report.keys.includes('seal_key'), 'F1 yields the Tide Key and the Seal Key');
  for (const e of ['lift_trig', 'lift_f2', 'chest_seal_key', 'memory1_trig']) assert.ok(!f1.report.unreached.includes(e), `F1: ${e}`);
  let to = hop('ep4_keep_f1', 'lift_f2', 'ep4_keep_f2');
  assert.deepEqual(to.slice(1, 3), [maps.ep4_keep_f2.start.x, maps.ep4_keep_f2.start.y]);
  // F2: its own Tide Key opens door_e; the arena; the stair after the win
  const f2 = analyse(maps.ep4_keep_f2, db, { lantern: true, flags: ['keep_f2_arrived', 'barrister_defeated', 'keep_f2_done', 'coffer_found', 'vex_archive_met'] });
  assert.deepEqual(f2.errors, []);
  assert.ok(f2.report.opened.includes('door_e'));
  for (const e of ['memory2_trig', 'vex_trig', 'barrister_trig', 'stair_trig', 'stairs_f3', 'boat_f2_short', 'chest_cache']) assert.ok(!f2.report.unreached.includes(e), `F2: ${e}`);
  const f2pre = analyse(maps.ep4_keep_f2, db, { lantern: true, flags: ['keep_f2_arrived'] });
  assert.ok(f2pre.report.unreached.includes('stairs_f3') || !f2pre.report.events.find((e) => e.id === 'stairs_f3').reached, 'F2: no stair before the Barrister');
  to = hop('ep4_keep_f2', 'stairs_f3', 'ep4_keep_f3');
  assert.deepEqual(to.slice(1, 3), [maps.ep4_keep_f3.start.x, maps.ep4_keep_f3.start.y]);
  // F3: three stones, the gate, the lectern, the throne door with F1's Seal Key
  const f3 = analyse(maps.ep4_keep_f3, db, { lantern: true, keys: ['seal_key'], flags: ['keep_f3_arrived'] });
  assert.deepEqual(f3.errors, []);
  for (const f of PRINCIPLES) assert.ok(f3.report.log.some((l) => l.startsWith(f)), `F3: ${f}`);
  for (const e of ['gate_trig', 'witness_lectern', 'door_throne', 'boat_f3_short', 'font_k3']) assert.ok(!f3.report.unreached.includes(e), `F3: ${e}`);
  to = byId(maps.ep4_keep_f3, 'door_throne').to;
  assert.deepEqual(to.slice(0, 3), ['ep4_keep_crown', maps.ep4_keep_crown.start.x, maps.ep4_keep_crown.start.y]);
  // the throne: the trigger row on the way in; after the win, the boat home
  const crown = search(maps.ep4_keep_crown, { flags: ['paper_regent_defeated'] });
  for (const e of ['regent_trig', 'boat_crown_out', 'witness_page', 'crown_exit']) assert.ok(!crown.report.unreached.includes(e), `crown: ${e}`);
  // home by the boats: every boat lands on a dry, walkable, non-floodable cell
  const boats = [['ep4_keep_f1', 'boat_vw'], ['ep4_keep_f1', 'hale_punt'], ['ep4_keep_f2', 'boat_f2_short'], ['ep4_keep_f3', 'boat_f3_short'], ['ep4_keep_crown', 'boat_crown_out']];
  for (const [mid, id] of boats) {
    const b = byId(maps[mid], id);
    assert.equal(b.kind, 'boat', id);
    const [tm, x, y] = b.to;
    if (!maps[tm]) continue;
    const g = buildGrid(maps[tm], db);
    assert.equal(g.code[y][x], 'none', `${id} lands on walkable ${tm} ${x},${y}`);
    if (maps[tm].tide) { const c = compile(maps[tm]); const i = y * c.W + x; assert.ok(c.basinAt[i] < 0, `${id} lands off every basin`); }
    if (tm === 'ep4_keep_f1') assert.ok(new Set(f1.report.reachable).has(key(x, y)), `${id} lands on the Water Gate`);
  }
  if (maps.ep4_valewyn) {
    assert.deepEqual(byId(maps.ep4_keep_crown, 'boat_crown_out').to.slice(1, 3), maps.ep4_valewyn.marks.keep_landing, 'the boat home lands on keep_landing');
    assert.deepEqual(byId(maps.ep4_keep_f1, 'boat_vw').to.slice(1, 3), maps.ep4_valewyn.marks.keep_landing);
    assert.deepEqual(byId(maps.ep4_keep_f1, 'hale_punt').to.slice(1, 3), maps.ep4_valewyn.marks.ferry_in);
  }
  // the scriptorium pit drops onto F1's dry west bank, never a dead end
  const [pm, px, py] = maps.ep4_keep_f2.pitTo;
  assert.equal(pm, 'ep4_keep_f1');
  assert.ok(new Set(f1.report.reachable).has(key(px, py)) && compile(maps.ep4_keep_f1).basinAt[py * 40 + px] < 0);
});

// ------------------------------------------------------------------------------------------------ the reload rule
/**
 * The map with a set of seals washed and floodgates latched for good (persisted through a save): the seal and its door,
 * or the floodgate, become plain open floor. With `shutRest`, every other seal and floodgate is shut for good (the cells
 * a game can be saved on with exactly that set done).
 */
function persisted(m, done, shutRest = false) {
  const rows = m.ground.map((r) => r.split(''));
  const drop = new Set();
  for (const e of m.events) {
    const mine = e.type === 'forgery' || e.type === 'floodgate';
    if (!mine || (!done.has(e.id) && !shutRest)) continue;
    drop.add(e.id);
    if (!done.has(e.id)) { if (e.type === 'floodgate') for (let k = 0; k < (e.w || 2); k++) rows[e.y][e.x + k] = '#'; continue; }
    if (e.type === 'forgery') for (const t of [].concat(e.target || [])) drop.add(t);
    if (e.type === 'floodgate') for (let k = 0; k < (e.w || 2); k++) rows[e.y][e.x + k] = '.';
  }
  for (const e of m.events) if (drop.has(e.id) && e.type === 'gate' && m.events.some((f) => f.type === 'forgery' && done.has(f.id) && [].concat(f.target || []).includes(e.id))) for (let k = 0; k < (e.w || 1); k++) rows[e.y][e.x + k] = '.';
  return { ...m, ground: rows.map((r) => r.join('')), events: m.events.filter((e) => !drop.has(e.id) || (e.type === 'gate' && !rows[e.y][e.x].startsWith('.'))) };
}
const subsets = (list) => list.reduce((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]);

test('reload rule: from every reachable cell, with any seals washed and floodgates latched, at start levels, the way back is open', () => {
  for (const id of MINE.filter((x) => maps[x].tide)) {
    const m = maps[id];
    const ids = m.events.filter((e) => e.type === 'forgery' || (e.type === 'floodgate' && (e.latch || e.flag))).map((e) => e.id);
    let checked = 0;
    for (const set of subsets(ids)) {
      const mm = persisted(m, new Set(set));
      const opts = { keys: KEYS, lantern: true, flags: [...PRINCIPLES] };
      const base = analyse(persisted(m, new Set(set), true), db, opts);
      const startK = key(m.start.x, m.start.y);
      const W = m.ground[0].length;
      // group the reached cells: one representative per walkable component at the start levels, every other cell alone
      const grid = base.report.grid;
      const comp = new Map();
      let n = 0;
      for (const k of base.report.reachable) {
        if (comp.has(k)) continue;
        const [x, y] = k.split(',').map(Number);
        const id0 = n++;
        comp.set(k, id0);
        if (grid[y][x] !== 'none') continue;
        const q = [[x, y]];
        while (q.length) {
          const [cx, cy] = q.pop();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy, nk = key(nx, ny);
            if (ny < 0 || ny >= grid.length || nx < 0 || nx >= W || comp.has(nk) || grid[ny][nx] !== 'none') continue;
            comp.set(nk, id0); q.push([nx, ny]);
          }
        }
      }
      const reps = new Map();
      for (const [k, c] of comp) if (!reps.has(c) && new Set(base.report.reachable).has(k)) reps.set(c, k);
      for (const k of reps.values()) {
        const [x, y] = k.split(',').map(Number);
        const r = analyse(mm, db, { ...opts, start: [x, y] });
        const home = new Set(r.report.reachable).has(startK);
        assert.ok(home, `${id} washed [${set.join(' ')}]: a game saved at ${k} reloads stranded (start ${startK} unreachable)`);
        checked++;
      }
    }
    assert.ok(checked > 3, `${id}: ${checked} reload points`);
  }
});
