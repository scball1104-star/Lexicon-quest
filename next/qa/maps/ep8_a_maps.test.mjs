// Episode 8 maps, part A (E8-maps-a, EPISODE8_PLAN 3, 4.1 to 4.4, 4.9 to 4.11): the Keeper's Watch and Stillheart patches,
// the Stair of Written Light, the Scriptorium, its four interiors and the bell tower at night. The pop-up books are modeled by
// E8-world's state search (tools/maps/ep8_check.mjs, installed into mapcheck's walk and validate) over the pack's own rule
// (src/data/ep8/field/popbooks.js). Exact cells in docs/MAPS_EP8_A.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadMap, loadDb, validate, walk, buildGrid, listMapIds } from '../../tools/maps/mapcheck.mjs';
import { cameraRule } from '../../tools/maps/ep8_check.mjs';
import { compile } from '../../src/data/ep8/field/popbooks.js';

await (await import('../../src/data/ep8/index.js')).register();
const db = await loadDb();
const MINE = ['ep8_stair', 'ep8_scriptorium', 'ep8_sc_inn', 'ep8_sc_shop', 'ep8_sc_atelier', 'ep8_sc_index', 'ep8_bell_night'];
const EP7 = ['ep7_ph_watch', 'ep7_stillheart'];
const maps = {};
for (const id of [...MINE, ...EP7]) maps[id] = await loadMap(id);
const P = await import('../../src/data/maps/ep8_patches.js');
const STORY = await import('../../src/data/ep8/story.js');
const EPISODES = await import('../../src/game/episodes.js');
const { ZONES, ENCOUNTERS } = await import('../../src/data/encounters.js');
const { ITEMS } = await import('../../src/data/items.js');
const BELL = (await import('../../src/data/maps/bell_tower.js'));
const PATCHED = { ep7_ph_watch: P.withEp8Wake(maps.ep7_ph_watch), ep7_stillheart: P.withStairDoor(maps.ep7_stillheart) };

const byId = (m, id) => m.events.find((e) => e.id === id);
const key = (x, y) => `${x},${y}`;
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const live = (e, flags) => toList(e.if).every((f) => flags.has(f)) && !toList(e.ifNot).some((f) => flags.has(f));
const mapFile = (id) => fs.existsSync(path.join(NEXT, 'src', 'data', 'maps', `${id}.js`));
/**
 * Errors that only say a wave-8c neighbour is not on this branch yet: E8-maps-b's Library and Last Word maps (door targets),
 * E8-battle's encounters and the drift_page item (wave 8a, merged on scott/e8-int). Each is asserted absent once its owner lands.
 */
const pending = (e) => {
  let m = /target map (\w+) not found/.exec(e);
  if (m) return /^ep8_(library_f[123]|last_word)$/.test(m[1]) && !mapFile(m[1]);
  m = /encounter (e8s_\w+) missing/.exec(e);
  if (m) return !ENCOUNTERS[m[1]];
  m = /item (drift_page) unknown/.exec(e);
  if (m) return !ITEMS[m[1]];
  return false;
};
const targets = {};
for (const id of listMapIds()) if (!/^ep\d_patches$/.test(id)) targets[id] = await loadMap(id);
Object.assign(targets, PATCHED);

const EP7_DONE = ['ep7_complete', 'doors_reopened', 'ep6_complete', 'ep5_complete', 'ep4_complete', 'ep3_complete', 'ep2_complete',
  'ep1_complete', 'mira_joined', 'bram_joined', 'lantern_get', 'phantom_defeated', 'stillheart_restored', 'nox_named'];
const STARTED = [...EP7_DONE, 'ep8_morning_done', 'ep8_started'];
const ROOFED = [...STARTED, 'ep8_roofed'];
const STAIR = [...ROOFED, 'stair_arrived'];
const STAIR_ON = [...STAIR, 'first_rub_done', 'first_book_read', 'eraser_seen'];
const TOWN = [...STAIR_ON, 'saw_scriptorium', 'scriptorium_arrived'];
const TOWN_MID = [...TOWN, 'read_learned', 'librarian_met', 'card_read', 'elowen_met', 'library_open'];
const OPENED = [...TOWN_MID, 'library_entered', 'library_f1_done', 'library_f2_done', 'name_told', 'eraser_defeated', 'keeper_named',
  'ending_return', 'page_shelved', 'scriptorium_open'];

// ------------------------------------------------------------------------------------------------ the patches
test('withEp8Wake and withStairDoor keep every Episode 7 cell, mark and event, only add, and are idempotent', () => {
  for (const [id, fn, added, marks] of [
    ['ep7_ph_watch', P.withEp8Wake, ['ep8_wake'], []],
    ['ep7_stillheart', P.withStairDoor, ['ep8_roof_enter', 'stair_door_look', 'stair_up'], ['aeris_roof', 'stair_stage', 'stair_stage_m', 'stair_stage_b']],
  ]) {
    const base = maps[id];
    const snap = JSON.stringify(base);
    const p = fn(base);
    assert.equal(JSON.stringify(base), snap, `${id}: the input is not mutated`);
    assert.notEqual(p, base);
    for (const k of ['ground', 'legend', 'overlays', 'decor', 'exits', 'start', 'lighting', 'music', 'ambience']) assert.deepEqual(p[k], base[k], `${id} ${k}`);
    for (const [k, v] of Object.entries(base.marks)) assert.deepEqual(p.marks[k], v, `${id} mark ${k}`);
    for (const e of base.events) assert.deepEqual(byId(p, e.id), e, `${id} event ${e.id} unchanged`);
    assert.equal(p.events.length, base.events.length + added.length);
    for (const a of added) assert.ok(byId(p, a), `${id}: ${a}`);
    for (const mk of marks) assert.ok(p.marks[mk] && !(mk in base.marks), `${id}: mark ${mk} new`);
    // everything added waits on an Episode 8 flag (the wake on ep7_complete, which the scene's own guard gates on EP8_LIVE)
    for (const e of p.events.filter((x) => !base.events.includes(x))) assert.ok(toList(e.if).length, `${id} ${e.id} is gated`);
    for (const o of (p.overhead || []).slice((base.overhead || []).length)) assert.equal(o.if, 'ep8_started', `${id}: the added overhead waits on ep8_started`);
    assert.equal(fn(p), p, 'idempotent');
    assert.equal(fn({ ...base, id: 'other' }).id, 'other', 'other maps pass through');
    assert.equal(fn(null), null);
  }
  for (const f of ['ep7_ph_watch.js', 'ep7_stillheart.js', 'bell_tower.js']) {
    assert.ok(!/ep8_/.test(fs.readFileSync(path.join(NEXT, 'src', 'data', 'maps', f), 'utf8')), `${f} untouched`);
  }
});

test('the patch order: a bare ep7 module stays bare; the ep8 pack patches what the ep7 pack registered, and only those two', async () => {
  const { peekMap, registerMap } = await import('../../src/world/maps.js');
  const M8 = await import('../../src/data/ep8/maps.js');
  assert.deepEqual(M8.PATCHES, { ep7_ph_watch: 'withEp8Wake', ep7_stillheart: 'withStairDoor' });
  const r = await M8.register();
  assert.ok(r.patchFile, 'ep8_patches.js found');
  assert.deepEqual([...r.patched].sort(), [...EP7].sort());
  for (const id of MINE) assert.ok(r.loaded.includes(id), `${id} registered by the pack`);
  // what the ep7 pack registers (the bare modules) carries nothing of Episode 8 until the ep8 pack patches it
  registerMap(maps.ep7_ph_watch); registerMap(maps.ep7_stillheart);
  assert.ok(!peekMap('ep7_ph_watch').events.some((e) => e.id === 'ep8_wake'), 'with ep7 only: no Episode 8 trigger');
  assert.ok(!peekMap('ep7_stillheart').events.some((e) => e.id === 'stair_up'), 'with ep7 only: no stair door');
  assert.ok(M8.applyPatch('ep7_ph_watch', P.withEp8Wake) && M8.applyPatch('ep7_stillheart', P.withStairDoor));
  assert.ok(peekMap('ep7_ph_watch').events.some((e) => e.id === 'ep8_wake'));
  assert.ok(peekMap('ep7_stillheart').events.some((e) => e.id === 'stair_up'));
  assert.ok(!M8.applyPatch('ep7_ph_watch', P.withEp8Wake), 'a second patch changes nothing');
});

test('with Episode 7 complete and EP8_LIVE off, the Watch and the Stillheart walk exactly as Episode 7\'s', () => {
  const flags = new Set(EP7_DONE);
  assert.equal(STORY.SCENE_CONDITIONS.ep8_morning.live, true, 'the wake scene needs the switch');
  if (EPISODES.EP8_LIVE !== true) assert.equal(STORY.GATE.live, false, 'the switch is off');
  const t = byId(PATCHED.ep7_ph_watch, 'ep8_wake');
  assert.deepEqual([t.type, t.script, t.on, t.if, t.ifNot], ['trigger', 'ep8_morning', 'enter', 'ep7_complete', 'ep8_morning_done']);
  for (const e of ['ep8_roof_enter', 'stair_door_look', 'stair_up']) assert.ok(!live(byId(PATCHED.ep7_stillheart, e), flags), `${e} absent`);
  for (const id of EP7) {
    assert.deepEqual(new Set(walk(PATCHED[id], db, { flags: EP7_DONE }).reachable), new Set(walk(maps[id], db, { flags: EP7_DONE }).reachable), id);
  }
  // the Watch's own marks for ep8_morning (STAGING: the patch adds no mark)
  for (const mk of ['keeper_chair', 'watch_stage', 'watch_stage_m', 'watch_stage_b', 'watch_cot']) assert.ok(PATCHED.ep7_ph_watch.marks[mk], mk);
});

test('the Stillheart stair door: on stair_foot from ep8_roofed, lands on the Stair\'s foot on ground; the Stair\'s way back lands on ground', () => {
  const S = PATCHED.ep7_stillheart;
  const door = byId(S, 'stair_up');
  assert.deepEqual([door.x, door.y], maps.ep7_stillheart.marks.stair_foot);
  assert.equal(door.if, 'ep8_roofed');
  assert.deepEqual(door.to.slice(0, 3), ['ep8_stair', ...STORY.STAIR_FOOT]);
  const stair = maps.ep8_stair;
  assert.deepEqual(stair.marks.stair_bottom, STORY.STAIR_FOOT);
  assert.deepEqual([stair.start.x, stair.start.y], STORY.STAIR_FOOT);
  const sg = buildGrid({ ...stair, events: [] }, db);
  assert.equal(sg.code[STORY.STAIR_FOOT[1]][STORY.STAIR_FOOT[0]], 'none', 'the stair door lands on walkable ground');
  const back = byId(stair, 'stair_down');
  assert.equal(back.to[0], 'ep7_stillheart');
  const hg = buildGrid({ ...S, events: [] }, db);
  assert.equal(hg.code[back.to[2]][back.to[1]], 'none', 'the way back lands on walkable ground');
  assert.notDeepEqual([back.to[1], back.to[2]], [door.x, door.y], 'not on the door itself');
  // the roof scene's marks, walkable and reachable once ep8_started
  const r = new Set(walk(S, db, { flags: STARTED }).reachable);
  for (const mk of ['stair_foot', 'stair_stage', 'stair_stage_m', 'stair_stage_b', 'aeris_roof', 'roof']) {
    const [x, y] = S.marks[mk];
    assert.ok(r.has(key(x, y)), `${mk} reachable`);
  }
  assert.ok(new Set(walk(S, db, { flags: ROOFED }).reachable).has(key(door.x, door.y)), 'the door is reachable');
  assert.deepEqual(validate(S, db, targets, {}).errors.filter((e) => !pending(e)), []);
});

// ------------------------------------------------------------------------------------------------ validation
test('every map of part A validates (ids, lines, NPC records, enemy plan, the book search) and every event is reached', () => {
  for (const id of MINE) {
    const r = validate(maps[id], db, targets, {});
    assert.deepEqual(r.errors.filter((e) => !pending(e)), [], id);
    assert.deepEqual(r.walk.unreached || [], [], `${id}: unreached`);
    if (r.walk.books) assert.equal(r.walk.books.stranded, 0, `${id}: a reachable state that cannot get back`);
  }
});

/** STAGING_EP8's focus marks of a map: every `name` (x, y in its "Focus marks, `map`" paragraph. */
function stagedFocus(mapId) {
  const text = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP8.md'), 'utf8');
  const i = text.indexOf('Focus marks, `' + mapId + '`');
  if (i < 0) return [];
  const end = text.slice(i).search(/\n(- |#|\n)/);
  const para = text.slice(i, end < 0 ? undefined : i + end).replace(/\n\s*/g, ' ');
  return [...para.matchAll(/`(\w+)` \(\d+, \d+/g)].map((m) => m[1]).filter((n) => n !== mapId);
}

test('the camera rule: every STAGING_EP8 focus mark of part A sits 12 from the sides and 7 from the top and bottom', () => {
  for (const id of ['ep8_stair', 'ep8_scriptorium', 'ep7_stillheart']) {
    const map = id === 'ep7_stillheart' ? PATCHED[id] : maps[id];
    const names = [...stagedFocus(id), ...(id === 'ep7_stillheart' ? ['aeris_roof'] : [])];   // STAGING proposes aeris_roof's cell
    assert.ok(names.length >= 2, `${id}: STAGING lists its focus marks (${names})`);
    const W = map.ground[0].length, H = map.ground.length;
    for (const n of names) {
      const xy = map.marks[n];
      assert.ok(xy, `${id}: focus mark ${n} exists`);
      const [x, y] = xy;
      if (W > 24) assert.ok(Math.min(x, W - 1 - x) >= 12, `${id} ${n} (${x},${y}): ${Math.min(x, W - 1 - x)} from a side`);
      if (H > 13) assert.ok(Math.min(y, H - 1 - y) >= 7, `${id} ${n} (${x},${y}): ${Math.min(y, H - 1 - y)} from the top or bottom`);
    }
    assert.deepEqual(cameraRule(map).errors, [], id);
  }
});

test('the Stair: foot to the South Margin through the book search, 4 decisions (willow, b, c closed, c opened), no loop home', () => {
  const S = maps.ep8_stair;
  for (const flags of [STAIR, STAIR_ON]) {
    const r = walk(S, db, { flags });
    const b = r.books;
    assert.equal(b.stranded, 0);
    assert.equal(b.decisions, 4, 'plan 4.10: A 1, B 1, C 2');
    assert.deepEqual(b.solution.map((x) => x.split('@')[0]), ['pb_willow', 'pb_b', 'pb_c', 'pb_c']);
    assert.ok(b.steps <= 1.3 * b.straight, `walk ${b.steps} vs straight ${b.straight}`);
    const reach = new Set(r.reachable);
    for (const mk of ['stair_bottom', 'foot_stage', 'gap_a_stage', 'desk_stage', 'eraser_far', 'eraser_low', 'margin', 'north_exit', 'ledge_b']) {
      assert.ok(reach.has(key(...S.marks[mk])), `${mk} reached`);
    }
  }
  // the books: four, the Willowmere realm book at Gap A, pb_c starts open (a wall on the island, a bridge over the lower gap)
  const m = compile(S);
  assert.deepEqual(m.errors, []);
  assert.equal(S.popbooks.books.a.realm, 'willowmere');
  assert.deepEqual(S.popbooks.start, { c: 's' });
  assert.equal(byId(S, 'pb_willow').text, 'ep8_realm_willowmere');
  for (const id of ['pb_willow', 'pb_ledge', 'pb_b', 'pb_c']) assert.equal(byId(S, id).type, 'popbook', id);
  // without the books the Stair is broken at the first gap
  const bare = { ...S, popbooks: undefined, events: S.events.filter((e) => e.type !== 'popbook') };
  const r0 = new Set(walk(bare, db, { flags: STAIR_ON }).reachable);
  assert.ok(!r0.has(key(...S.marks.desk_stage)) && !r0.has(key(...S.marks.margin)));
});

test('the Stair: no book cell or page cell under an actor, a trigger or a staged mark; the ledge chest needs the ledge book', () => {
  const S = maps.ep8_stair;
  const m = compile(S);
  const W = S.ground[0].length;
  const pageCells = new Set();
  for (const d of m.def) for (const dir of Object.keys(d.pagesOf)) for (const i of d.pagesOf[dir]) pageCells.add(key(i % W, Math.floor(i / W)));
  const bookCells = new Set(Object.values(S.popbooks.books).flatMap((b) => (b.axis === 'ns' ? [[b.x, b.y], [b.x + 1, b.y]] : [[b.x, b.y], [b.x, b.y + 1]])).map(([x, y]) => key(x, y)));
  for (const e of S.events.filter((x) => x.type !== 'popbook' && x.type !== 'light' && !(x.on === 'enter'))) {
    for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) {
      const c = key(e.x + i, e.y + j);
      assert.ok(!pageCells.has(c) && !bookCells.has(c), `${e.id} at ${c} on a book or page cell`);
    }
  }
  for (const mk of ['foot_stage', 'gap_a_stage', 'desk_stage', 'nox_foot', 'nox_gap_a', 'nox_desk']) {
    for (const suf of ['', '_m', '_b']) {
      const xy = S.marks[mk + suf];
      if (!xy) continue;
      assert.ok(!pageCells.has(key(...xy)) && !bookCells.has(key(...xy)), `${mk + suf} on a book or page cell`);
    }
  }
  const r = walk(S, db, { flags: STAIR_ON });
  const at = r.books.firstAt.chest_ledge;
  assert.ok(at.split(' ').includes('l:e'), `the ledge chest is reached with the ledge book open east (${at})`);
});

test('the Stair: enemies against ZONES.ep8_stair.plan, the chests, the save point and the two-way page lift', () => {
  const S = maps.ep8_stair;
  const foes = S.events.filter((e) => e.type === 'enemy');
  const count = {};
  for (const e of foes) count[e.encounter] = (count[e.encounter] || 0) + 1;
  assert.deepEqual(count, { e8s_first: 1, e8s_hounds: 1, e8s_cranes: 1 });
  if (ZONES.ep8_stair) assert.deepEqual(Object.fromEntries(ZONES.ep8_stair.plan), count);
  const first = byId(S, 'e_e8s_first');
  assert.ok(!live(first, new Set(STAIR)) && !live(first, new Set(STAIR_ON)), 'the scripted fight\'s anchor is never present');
  assert.equal(byId(S, 'satchel').gold, 2000);   // E8-battle's EP8_GOLD_LINE (BATTLE.md 17)
  assert.deepEqual([byId(S, 'chest_foot').tier, byId(S, 'chest_ledge').tier, byId(S, 'satchel').tier], ['wood', 'iron', 'gold']);
  assert.equal(byId(S, 'chest_ledge_page').flag, 'drift_1_found');
  assert.equal(byId(S, 'desk_save').text, 'ep8_desk');
  for (const id of ['lift_foot', 'lift_margin']) assert.equal(byId(S, id).if, 'saw_scriptorium', id);
  assert.equal(byId(S, 'lift_foot').to[0], 'ep8_stair');
  assert.equal(byId(S, 'lift_margin').to[0], 'ep8_stair');
});

// ------------------------------------------------------------------------------------------------ the Scriptorium
test('the Scriptorium: its scenes\' triggers and marks, the NPCs on their marks, the two-state objects and doors by flag', () => {
  const T = maps.ep8_scriptorium;
  for (const mk of ['south_gate', 'quinn_gate', 'nox_gate_s', 'gate_stage', 'gate_stage_m', 'gate_stage_b', 'sign_a', 'codex', 'codex_n',
    'codex_s', 'codex_w', 'codex_e', 'nox_codex', 'meya_steps', 'steps_stage', 'steps_stage_m', 'steps_stage_b', 'stall', 'elowen_stall',
    'stall_stage', 'stall_stage_m', 'stall_stage_b', 'nox_stall', 'library_gate', 'nox_gate', 'library_stage', 'library_stage_m',
    'library_stage_b', 'index_door', 'nox_index', 'arun_post', 'vex_step', 'folio_stage', 'folio_stage_m', 'folio_stage_b', 'ione_spot',
    'fen_spot', 'lexicon_door', 'inn_door', 'shop_door', 'atelier_door', 'crowd_a', 'crowd_b', 'crowd_c', 'crowd_d', 'crowd_e', 'crowd_f',
    'library_cliff']) assert.ok(T.marks[mk], `mark ${mk}`);
  const npcAt = { quinn: 'quinn_gate', elowen: 'elowen_stall', meya: 'meya_steps', ione: 'ione_spot', arun: 'arun_post', fen: 'fen_spot', vex8: 'vex_step' };
  for (const [id, mk] of Object.entries(npcAt)) assert.deepEqual([byId(T, id).x, byId(T, id).y], T.marks[mk], `${id} on ${mk}`);
  const scenes = { sc_arrive: 'scriptorium_arrival', sc_open: 'scriptorium_open', word_trig: 'first_word', gate_trig: 'library_door', home_trig: 'home' };
  for (const [id, sc] of Object.entries(scenes)) assert.equal(byId(T, id).script, sc, id);
  // the staged marks walkable (no NPC, object or trigger on them) and reachable in town
  const grid = buildGrid({ ...T, events: [] }, db);
  const reach = new Set(walk(T, db, { flags: TOWN_MID }).reachable);
  const trig = T.events.filter((e) => e.type === 'trigger' && e.on !== 'enter');
  const onTrig = (x, y) => trig.some((e) => x >= e.x && x < e.x + (e.w || 1) && y >= e.y && y < e.y + (e.h || 1));
  for (const st of ['gate_stage', 'steps_stage', 'stall_stage', 'library_stage', 'folio_stage']) {
    for (const suf of ['', '_m', '_b']) {
      const [x, y] = T.marks[st + suf];
      assert.equal(grid.code[y][x], 'none', `${st + suf} walkable`);
      assert.ok(!onTrig(x, y), `${st + suf} not on a trigger`);
      assert.ok(reach.has(key(x, y)), `${st + suf} reachable`);
    }
  }
  // flag states
  const before = new Set(TOWN_MID), after = new Set(OPENED);
  for (const s of ['sign_a', 'sign_b', 'sign_c', 'sign_d', 'sign_e', 'sign_f', 'candle_1', 'candle_2', 'candle_3']) {
    assert.ok(live(byId(T, s), before) && !live(byId(T, s), after), `${s} before`);
    const done = byId(T, `${s}_done`) || byId(T, `${s}_lit`);
    assert.ok(!live(done, before) && live(done, after), `${s} after`);
  }
  assert.ok(!live(byId(T, 'library_door'), new Set(TOWN)) && live(byId(T, 'library_door'), before));
  assert.ok(!live(byId(T, 'lexicon_door'), before) && live(byId(T, 'lexicon_door'), after));
  assert.ok(live(byId(T, 'folio_lit'), new Set([...TOWN, 'concordance_started', 'concordance_lit'])));
  assert.equal(byId(T, 'folio_lit').text, 'ep8_folio');
  assert.equal(byId(T, 'library_door').to[0], 'ep8_library_f1');
  assert.equal(byId(T, 'lexicon_door').to[0], 'ep8_last_word');
  // the Stair and the Scriptorium link both ways, each landing on ground off the other's exit
  const sx = maps.ep8_stair.exits[0], tx = T.exits[0];
  assert.deepEqual(sx.to.slice(0, 3), ['ep8_scriptorium', ...T.marks.south_gate]);
  assert.equal(tx.to[0], 'ep8_stair');
  assert.equal(buildGrid({ ...maps.ep8_stair, events: [] }, db).code[tx.to[2]][tx.to[1]], 'none');
  for (const id of ['door_inn', 'door_shop', 'door_atelier', 'door_index']) {
    const d = byId(T, id);
    const dest = maps[d.to[0]];
    assert.equal(buildGrid({ ...dest, events: [] }, db).code[d.to[2]][d.to[1]], 'none', `${id} lands on ground`);
    const back = dest.events.find((e) => e.type === 'door' && e.to[0] === 'ep8_scriptorium');
    assert.equal(grid.code[back.to[2]][back.to[1]], 'none', `${dest.id}'s exit lands on ground`);
  }
});

test('the interiors copy their Willowmere layouts; the Index: the trigger two tiles in, its own save key, the desk by flag', () => {
  for (const [id, from] of [['ep8_sc_inn', 'inn'], ['ep8_sc_shop', 'item_shop'], ['ep8_sc_atelier', 'smithy'], ['ep8_sc_index', 'chapel']]) {
    assert.deepEqual(maps[id].ground, targets[from].ground, `${id} has ${from}'s layout`);
    assert.deepEqual(maps[id].start, targets[from].start, `${id} has ${from}'s start`);
  }
  const I = maps.ep8_sc_index;
  const t = byId(I, 'index_trig');
  assert.equal(I.start.y - t.y, 1, 'the trigger row is two tiles in from the door');
  assert.equal(byId(I, 'save_bell_index').text, 'ep8_index_bell');
  assert.deepEqual([byId(I, 'ep8_librarian').x, byId(I, 'ep8_librarian').y], I.marks.librarian_desk);
  assert.equal(byId(I, 'ep8_librarian').ifNot, 'librarian_met');
  assert.equal(byId(I, 'first_keeper').if, 'keeper_named');
  for (const mk of ['index_stage', 'desk', 'librarian_desk', 'party_stop', 'party_stop_m', 'party_stop_b', 'back_door']) assert.ok(I.marks[mk], mk);
  assert.deepEqual(maps.ep8_sc_inn.marks.inn_bed, [17, 7]);
  assert.deepEqual([byId(maps.ep8_sc_atelier, 'sorel').x, byId(maps.ep8_sc_atelier, 'sorel').y], maps.ep8_sc_atelier.marks.counter);
});

test('the bell night: bell_tower\'s layout under a new id, the toll steps re-pointed, the thirteenth, the beam marks, solo', () => {
  const B = maps.ep8_bell_night;
  for (const k of ['ground', 'legend', 'overlays', 'decor', 'start', 'under']) assert.deepEqual(B[k], BELL.default[k], k);
  assert.deepEqual(B.marks.stair_foot, STORY.BELL_FOOT);
  BELL.TOLL_STEPS.forEach(([x, y], i) => {
    const t = byId(B, `trig_toll_${i + 1}`);
    assert.deepEqual([t.x, t.y, t.script], [x, y, `ep8_toll_${i + 1}`]);
  });
  assert.equal(byId(B, 'trig_thirteenth').script, 'thirteenth_name');
  assert.equal(byId(B, 'bell_night_enter').on, 'enter');
  assert.ok(!B.events.some((e) => /^toll_|thirteenth_toll/.test(e.script || '')), 'no cold-open scene');
  assert.equal(byId(B, 'keep_one').text, 'ep8_keep_one');
  for (const mk of ['mira_beam', 'bram_beam', 'bells', 'top']) assert.ok(B.marks[mk], mk);
  assert.equal(B.party, 'solo');
  assert.equal(B.lighting.tint, 'night');
  assert.equal(BELL.default.id, 'bell_tower', 'the cold open is untouched');
});

test('no Episode 8 map of part A names an older episode\'s text key or a bare scriptorium id', () => {
  for (const id of MINE) for (const e of maps[id].events) {
    assert.notEqual(e.id, 'scriptorium');
    for (const k of [e.text].filter(Boolean)) assert.ok(/^(ep8_|sign_ep8_)/.test(k), `${id} ${e.id}: ${k}`);
  }
});
