// Episode 8 maps, part B (E8-maps-b, EPISODE8_PLAN 4.4 to 4.11, 5.1, 5.4): the First Library's three floors and the Last
// Word. The book rule is the pack's own (src/data/ep8/field/popbooks.js); the whole-map state search, the authoring and
// softlock rules, the decision count, the loop-home and 1.3x walk limits are tools/maps/ep8_check.mjs (validate runs it on
// the bare map). This file adds: the critical path through all four maps with books, under each floor's real main-path
// flag set (the search builds its grid only from the events present under those flags; no flags means none set); no state
// strands the party, from the start and from every lift landing (a save anywhere reloads with the authored books); every
// chest reachable; both CHOOSE routes reach the keyhole; every lift two-way and every shortcut landing beside a fountain;
// the camera rule on every focus mark STAGING_EP8 lists; every STAGING mark and named event, stage marks on ground and off
// every page cell and trigger; the decision count against plan 4.10; the enemy plans; house rules on my files.
//
// Transitional (wave 8c): the Scriptorium (E8-maps-a) is built beside this file, so the two doors that lead to it
// (to_scriptorium, square_return) report "target map ep8_scriptorium not found" until it lands; that message is tolerated
// while src/data/maps/ep8_scriptorium.js does not exist. While E8-battle's src/data/ep8/encounters.js is not in this
// checkout, its encounter, item and zone messages are tolerated too and the enemy plan is read from plan 4.5 to 4.8.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadAll, loadDb, validate, buildGrid, eventCells, present } from '../../tools/maps/mapcheck.mjs';
import { analyse, PLAN_BUDGET, PLAN_OPTIONAL, CAMERA } from '../../tools/maps/ep8_check.mjs';
import { compile, AXES } from '../../src/data/ep8/field/popbooks.js';

await (await import('../../src/data/ep8/index.js')).register();
const db = await loadDb();
const MINE = ['ep8_library_f1', 'ep8_library_f2', 'ep8_library_f3', 'ep8_last_word'];
const FLOORS = MINE.slice(0, 3);
const maps = await loadAll();
const exists = (f) => fs.existsSync(path.join(NEXT, ...f.split('/')));
const SCRIPTORIUM = exists('src/data/maps/ep8_scriptorium.js');
const BATTLE = exists('src/data/ep8/encounters.js');
const transitional = (e) => (!SCRIPTORIUM && /target map ep8_scriptorium not found/.test(e))
  || (!BATTLE && /(encounter \w+ missing|item \w+ unknown|key \w+ unknown)/.test(e));
const k = (x, y) => `${x},${y}`;
const byId = (m, id) => m.events.find((e) => e.id === id);

// the story flags each floor is played under (the real run's, at that floor; plan 2.2, flags.js)
const EP7 = ['ep7_complete', 'doors_reopened', 'mira_joined', 'bram_joined', 'lantern_get'];
const F1 = [...EP7, 'ep8_morning_done', 'ep8_started', 'ep8_roofed', 'stair_arrived', 'first_rub_done', 'first_book_read', 'eraser_seen',
  'saw_scriptorium', 'scriptorium_arrived', 'read_learned', 'librarian_met', 'card_read', 'elowen_met', 'library_open', 'library_entered',
  'lib_f1_arrived'];
const F1_BACK = [...F1, 'keeper_memory_a', 'ink_key_found'];
const F2 = [...F1_BACK, 'library_f1_done', 'lib_f2_arrived'];
const F2_WON = [...F2, 'keeper_memory_b', 'sentry_tried', 'sentry_defeated'];
const F2_DONE = [...F2_WON, 'library_f2_done'];
const F3 = [...F2_DONE, 'lib_f3_arrived'];
const F3_NAMED = [...F3, 'keeper_memory_c', 'beginning_seen', 'name_told'];
const LW = [...F3_NAMED, 'vex_arrived', 'eraser_tried', 'answered_yes'];
const LW_WON = [...LW, 'eraser_defeated', 'lexicon_restored', 'fragment8_get', 'keeper_named'];
const LW_END = [...LW_WON, 'ending_return', 'page_shelved', 'night_read', 'eighth_star', 'hero_kept'];
const SIDE = ['drift_started', 'page_names_found', 'page_order_found', 'page_correction_found', 'archive_open'];
/** Each map's main-path flag sets (none set, then the floor's run). */
const RUNS = {
  ep8_library_f1: { none: [], F1, 'F1 back': F1_BACK, 'F1 side': [...F1, ...SIDE], 'F1 done': [...F2_DONE] },
  ep8_library_f2: { none: [], F2, 'F2 won': F2_WON, 'F2 done': F2_DONE, 'F2 side': [...F2, ...SIDE] },
  ep8_library_f3: { none: [], F3, 'F3 memory': [...F3, 'keeper_memory_c', 'beginning_seen'], 'F3 named': F3_NAMED },
};

// ------------------------------------------------------------------------------------------------ the maps are clean
test('my four maps validate clean (mapcheck with the ep8 pack: book authoring, softlock and decision rules included)', () => {
  for (const id of MINE) {
    assert.ok(maps[id], `${id} exists`);
    const r = validate(maps[id], db, maps);
    assert.deepEqual(r.errors.filter((e) => !transitional(e)), [], `${id}: ${r.errors.join('; ')}`);
    assert.deepEqual(r.warnings, [], `${id} warnings`);
    for (const row of maps[id].ground) assert.equal(row.length, maps[id].ground[0].length, `${id} rectangular`);
  }
  assert.deepEqual([maps.ep8_library_f1.ground[0].length, maps.ep8_library_f1.ground.length], [40, 30]);
  assert.deepEqual([maps.ep8_library_f2.ground[0].length, maps.ep8_library_f2.ground.length], [40, 30]);
  assert.deepEqual([maps.ep8_library_f3.ground[0].length, maps.ep8_library_f3.ground.length], [34, 40]);
  assert.deepEqual([maps.ep8_last_word.ground[0].length, maps.ep8_last_word.ground.length], [28, 24]);
});

// ------------------------------------------------------------------------------------------------ the critical path
test('the critical path through all four maps with books: every floor under every main-path flag set, no strand, budget met', () => {
  let total = 0;
  for (const id of FLOORS) {
    for (const [name, flags] of Object.entries(RUNS[id])) {
      const a = analyse(maps[id], db, { flags });
      assert.deepEqual(a.errors, [], `${id} [${name}]: ${a.errors.join('; ')}`);
      assert.equal(a.report.books.stranded, 0, `${id} [${name}] strands`);
    }
    const run = Object.keys(RUNS[id])[1];
    const b = analyse(maps[id], db, { flags: RUNS[id][run] }).report.books;
    assert.equal(b.decisions, PLAN_BUDGET[id], `${id}: ${b.decisions} decisions (plan 4.10: ${PLAN_BUDGET[id]})`);
    assert.ok(b.steps <= 1.3 * b.straight, `${id}: walk ${b.steps} vs straight ${b.straight}`);
    total += b.decisions;
  }
  assert.equal(total, 12, 'the Library: 4 + 4 + 4 of the episode\'s 16');
  // the doors chain the floors in order, every landing walkable ground and off every page cell
  const chain = [['ep8_library_f1', 'lift_up', F1_BACK, 'ep8_library_f2'], ['ep8_library_f2', 'lift_up', F2_WON, 'ep8_library_f3'],
    ['ep8_library_f3', 'ink_door', F3_NAMED, 'ep8_last_word']];
  for (const [from, door, flags, to] of chain) {
    const e = byId(maps[from], door);
    assert.ok(e && present(e, new Set(flags)) && e.to[0] === to, `${from} ${door} -> ${to}`);
    const r = analyse(maps[from], db, { flags }).report;
    assert.ok(eventCells(e).some(([x, y]) => r.reachable.includes(k(x, y))), `${from} ${door} reachable under the run's flags`);
    const [, x, y] = e.to;
    const g = buildGrid({ ...maps[to], events: [] }, db);
    assert.equal(g.code[y][x], 'none', `${door} lands on ground in ${to}`);
    assert.equal(maps[to].start.x === x && maps[to].start.y === y, true, `${door} lands on ${to}'s start`);
  }
  // the Last Word: entry to the trigger row before the fight, then the lectern and the way home after it
  const lw = maps.ep8_last_word;
  for (const flags of [LW, LW_WON, LW_END]) {
    const r = validate({ ...lw, events: lw.events.filter((e) => present(e, new Set(flags))) }, db, maps).walk;
    const reach = new Set(r.reachable);
    for (const m of ['party_stop', 'lectern', 'dais', 'nox_spot', 'vex_stop', 'shelf_stage']) assert.ok(reach.has(k(...lw.marks[m])), `${m} reachable`);
    assert.ok(eventCells(byId(lw, 'word_down')).some(([x, y]) => reach.has(k(x, y))), 'word_down reachable: a lost fight never strands');
  }
  assert.ok(present(byId(lw, 'eraser_trig'), new Set(LW)) && !present(byId(lw, 'eraser_trig'), new Set(LW_WON)));
  assert.ok(present(byId(lw, 'square_return'), new Set(LW_WON)) && !present(byId(lw, 'square_return'), new Set(LW)));
});

test('a save anywhere reloads with the authored books and still reaches a way off: from the start and every landing', () => {
  const landings = {};
  for (const id of MINE) for (const e of maps[id].events) if (Array.isArray(e.to) && maps[e.to[0]] && MINE.includes(e.to[0])) {
    (landings[e.to[0]] = landings[e.to[0]] || []).push([e.id, e.to[1], e.to[2]]);
  }
  for (const id of FLOORS) {
    const all = Object.entries(RUNS[id]).filter(([n]) => n !== 'none');
    for (const [name, flags] of all) for (const [via, x, y] of landings[id] || []) {
      const a = analyse(maps[id], db, { flags, start: [x, y] });
      const strand = a.errors.filter((e) => /softlock/.test(e));
      assert.deepEqual(strand, [], `${id} [${name}] from ${via}'s landing (${x},${y})`);
    }
  }
});

test('every chest is reachable in some state (the side stories open)', () => {
  for (const id of FLOORS) {
    const flags = [...Object.values(RUNS[id]).at(-1), ...SIDE];
    const r = analyse(maps[id], db, { flags });
    assert.deepEqual(r.errors.filter((e) => /chest/.test(e)), [], `${id}`);
    for (const e of maps[id].events) if (e.type === 'chest' && present(e, new Set(flags))) assert.ok(!r.report.unreached.includes(e.id), `${id} ${e.id}`);
  }
});

test('both CHOOSE routes reach the keyhole, and each alone does', () => {
  const f3 = maps.ep8_library_f3;
  for (const [keep, drop] of [['c1', 'c2'], ['c2', 'c1']]) {
    const books = { ...f3.popbooks.books };
    delete books[drop];
    books[keep] = { ...books[keep] };
    delete books[keep].pair;
    const one = { ...f3, popbooks: { ...f3.popbooks, books }, events: f3.events.filter((e) => !(e.type === 'popbook' && e.book === drop)) };
    const a = analyse(one, db, { flags: F3 });
    assert.deepEqual(a.errors, [], `CHOOSE by ${keep} alone: ${a.errors.join('; ')}`);
    assert.ok(a.report.books.solution.some((s) => s.startsWith(`pb_${keep}@`)), `the route reads ${keep}`);
  }
  assert.equal(f3.popbooks.books.c1.pair, 'c2', 'CHOOSE is a pair: only one way stands');
});

// ------------------------------------------------------------------------------------------------ lifts and shortcuts
test('every lift is two-way, and every shortcut lands beside a fountain', () => {
  const pairs = [
    ['ep8_library_f1', 'lift_up', 'ep8_library_f2', 'lift_down', F2],
    ['ep8_library_f1', 'lift_l1_up', 'ep8_library_f2', 'lift_l2_down', F2_DONE],
    ['ep8_library_f2', 'lift_up', 'ep8_library_f3', 'lift_down', F3],
    ['ep8_library_f3', 'ink_door', 'ep8_last_word', 'word_down', F3_NAMED],
  ];
  for (const [a, da, b, db_, flags] of pairs) {
    const f = new Set(flags);
    const ea = byId(maps[a], da), eb = byId(maps[b], db_);
    assert.ok(ea && present(ea, f) && ea.to[0] === b, `${a} ${da} up to ${b}`);
    assert.ok(eb && present(eb, f) && eb.to[0] === a, `${b} ${db_} back to ${a}`);
    for (const [e, m] of [[ea, b], [eb, a]]) {
      const g = buildGrid({ ...maps[m], events: [] }, db);
      assert.equal(g.code[e.to[2]][e.to[1]], 'none', `${e.id} lands on ground`);
    }
  }
  // the shortcuts of plan 5.4: each lands next to a fountain, and needs no book
  const nearFont = (m, x, y) => m.events.some((e) => e.type === 'font' && eventCells(e).some(([fx, fy]) => Math.abs(fx - x) + Math.abs(fy - y) <= 1));
  for (const [id, ev] of [['ep8_library_f1', 'lift_l1_up'], ['ep8_library_f2', 'lift_l2_down'], ['ep8_library_f3', 'lift_down']]) {
    const e = byId(maps[id], ev);
    assert.ok(nearFont(maps[e.to[0]], e.to[1], e.to[2]), `${id} ${ev} lands beside a fountain on ${e.to[0]}`);
  }
  // the Episode 6 trap (PLAYTEST_REVIEW_8 item 2): the shortcut down has its lift back up, both on library_f2_done
  assert.equal(byId(maps.ep8_library_f1, 'lift_l1_up').if, 'library_f2_done');
  assert.equal(byId(maps.ep8_library_f2, 'lift_l2_down').if, 'library_f2_done');
  // a fountain on every floor where the plan puts one (the bot rests there)
  for (const [id, ids] of [['ep8_library_f1', ['font_l1']], ['ep8_library_f2', ['font_l2', 'font_l2b']], ['ep8_library_f3', ['font_l3']]]) {
    for (const f of ids) assert.equal(byId(maps[id], f)?.type, 'font', `${id} ${f}`);
  }
});

// ------------------------------------------------------------------------------------------------ STAGING
const staging = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP8.md'), 'utf8');
/** The marks of a map's section 3 heading: "### `<map>` (marks `a`, `b`, ...)". */
function stagedMarks(id) {
  const line = staging.split('\n').find((l) => l.startsWith(`### \`${id}\` (marks`));
  return line ? [...line.matchAll(/`(\w+)`/g)].map((m) => m[1]).filter((m) => m !== id) : [];
}
/** The focus marks of a map's "Focus marks, `<map>`" paragraph (every `name` followed by a cell). */
function focusMarks(id) {
  const flat = staging.replace(/\n\s*/g, ' ');
  const at = flat.indexOf(`Focus marks, \`${id}\``);
  if (at < 0) return [];
  const end = flat.indexOf('. ', flat.indexOf('):', at) + 2);
  const para = flat.slice(at, end > 0 ? end : undefined);
  return [...para.matchAll(/`(\w+)` \(\d+, \d+/g)].map((m) => m[1]);
}

test('every STAGING mark exists; stage marks stand on ground, off every page cell, book and trigger', () => {
  for (const id of MINE) {
    const m = maps[id];
    const marks = stagedMarks(id);
    assert.ok(marks.length >= 10, `${id}: the STAGING heading lists its marks`);
    for (const name of marks) assert.ok(m.marks[name], `${id}: mark ${name}`);
    const c = compile(m);
    const page = new Set();
    if (c) for (let i = 0; i < c.N; i++) if (c.owner[i] >= 0 || c.bookAt[i] >= 0) page.add(k(i % c.W, (i / c.W) | 0));
    const trig = new Set();
    for (const e of m.events) if (e.type === 'trigger' && e.on !== 'enter') for (const [x, y] of eventCells(e)) trig.add(k(x, y));
    const g = buildGrid({ ...m, events: m.events.filter((e) => e.type !== 'trigger') }, db);
    for (const name of marks) {
      const stage = /_stage(_[mb])?$/.test(name) || (marks.includes(`${name}_m`) && marks.includes(`${name}_b`));
      if (!stage) continue;
      const [x, y] = m.marks[name];
      assert.equal(g.code[y][x], 'none', `${id} ${name} (${x},${y}) on ground`);
      assert.ok(!page.has(k(x, y)), `${id} ${name} off every page cell`);
      assert.ok(!trig.has(k(x, y)), `${id} ${name} off every trigger`);
    }
  }
});

test('the camera rule: every focus mark 12 tiles from the sides and 7 from the top and bottom', () => {
  for (const id of MINE) {
    const m = maps[id];
    const W = m.ground[0].length, H = m.ground.length;
    const focus = focusMarks(id);
    assert.ok(focus.length >= 5, `${id}: STAGING lists its focus marks (${focus.join(' ')})`);
    for (const name of focus) {
      const [x, y] = m.marks[name];
      if (W > CAMERA.screenW) assert.ok(Math.min(x, W - 1 - x) >= CAMERA.sides, `${id} ${name} (${x},${y}) sides`);
      if (H > CAMERA.screenH) assert.ok(Math.min(y, H - 1 - y) >= CAMERA.ends, `${id} ${name} (${x},${y}) top/bottom`);
    }
  }
});

test('the named events STAGING_EP8 section 2 asks of these maps, with their flags', () => {
  const need = {
    ep8_library_f1: [['f1_enter', 'catalog_arrival'], ['memory_a_trig', 'keeper_memory_a'], ['lift_trig', 'library_f1_lift']],
    ep8_library_f2: [['f2_enter', 'palimpsest_arrival'], ['memory_b_trig', 'keeper_memory_b'], ['sentry_trig', 'unnamed_sentry'],
      ['lift_trig', 'library_f2_lift'], ['archive_obj', 'uncensored_archive']],
    ep8_library_f3: [['f3_enter', 'unwritten_arrival'], ['memory_c_trig', 'keeper_memory_c'], ['name_trig', 'the_name']],
    ep8_last_word: [['eraser_trig', 'eraser'], ['lw_after', 'eraser_after'], ['lw_choice', 'last_choice'], ['lw_page', 'last_page'],
      ['lectern_trig', 'last_choice']],
  };
  for (const [id, list] of Object.entries(need)) for (const [ev, script] of list) {
    const e = byId(maps[id], ev);
    assert.ok(e && e.script === script, `${id} ${ev} runs ${script}`);
    assert.ok(db.scenes[script], `scene ${script} registered`);
  }
  const chest = (id, flag) => maps[id].events.find((e) => e.type === 'chest' && e.flag === flag);
  assert.equal(chest('ep8_library_f1', 'ink_key_found').item, 'ink_key');
  for (const f of ['page_names_found', 'page_order_found', 'page_correction_found']) assert.ok(chest('ep8_library_f2', f), f);
  assert.equal(byId(maps.ep8_library_f2, 'chest_archive').if, 'archive_open');
  assert.equal(byId(maps.ep8_library_f3, 'ink_door').if, 'name_told');
  assert.equal(byId(maps.ep8_library_f3, 'keyhole').ifNot, 'name_told');
  for (const o of ['great_lexicon', 'first_shelf', 'star_dome']) assert.equal(byId(maps.ep8_last_word, o)?.type, 'object', o);
  for (const d of ['word_down', 'square_return']) assert.equal(byId(maps.ep8_last_word, d)?.type, 'door', d);
  // the realm books, by their STAGING ids and text keys (section 4)
  const realms = { ep8_library_f1: { pb_hollow: 'ep8_realm_hollow', pb_ember: 'ep8_realm_emberpeak' },
    ep8_library_f2: { pb_valewyn: 'ep8_realm_valewyn', pb_desert: 'ep8_realm_desert' },
    ep8_library_f3: { pb_isles: 'ep8_realm_isles', pb_north: 'ep8_realm_north' } };
  for (const [id, list] of Object.entries(realms)) for (const [ev, key] of Object.entries(list)) {
    const e = byId(maps[id], ev);
    assert.ok(e && e.type === 'popbook' && e.name === key && maps[id].popbooks.books[e.book].realm, `${id} ${ev}`);
    assert.ok(db.lines[key], `${key} is a line`);
  }
  // inspect lines of section 6 on each map
  const inspects = { ep8_library_f1: ['ep8_drawer_wall', 'ep8_alcove', 'ep8_dash_drawers', 'ep8_north_shelf', 'ep8_doorway'],
    ep8_library_f2: ['ep8_overwritten', 'ep8_printing_room', 'ep8_page_names', 'ep8_page_order', 'ep8_page_correction', 'ep8_archive_shelf', 'ep8_seal_gallery'],
    ep8_library_f3: ['ep8_blank_page', 'ep8_see', 'ep8_shelter', 'ep8_choose', 'ep8_charter', 'ep8_keyhole', 'ep8_hidden_ink'],
    ep8_last_word: ['ep8_great_lexicon', 'ep8_first_shelf', 'ep8_star_dome', 'ep8_lectern'] };
  for (const [id, keys] of Object.entries(inspects)) for (const key of keys) {
    assert.ok(maps[id].events.some((e) => e.text === key), `${id} uses ${key}`);
    assert.ok(db.lines[key], `${key} is a line`);
  }
  for (const id of FLOORS) for (const e of maps[id].events) if (e.type === 'font') assert.equal(e.text, 'ep8_fountain', `${id} ${e.id}`);
});

test('the plan tables: books per map, pairs only where plan 4.6 and 4.7 put them, optional books, enemy plans', () => {
  for (const id of FLOORS) {
    const c = compile(maps[id]);
    assert.ok(c && !c.errors.length && c.books.length <= 6, id);
  }
  assert.ok(Object.values(maps.ep8_library_f1.popbooks.books).every((b) => !b.pair), 'no pairs on floor I');
  assert.ok(Object.values(maps.ep8_library_f2.popbooks.books).every((b) => b.pair), 'every book on floor II is a palimpsest pair');
  assert.equal(maps.ep8_library_f2.popbooks.start.y, 'n', 'floor II starts with the wrong version open');
  // optional reads: the books the critical path never reads (plan 4.10: 1, 2, 1)
  for (const id of FLOORS) {
    const sol = analyse(maps[id], db, { flags: Object.values(RUNS[id])[1] }).report.books.solution.map((s) => s.split('@')[0]);
    const optional = maps[id].events.filter((e) => e.type === 'popbook' && !sol.includes(e.id) && !['pb_c1', 'pb_c2'].includes(e.id));
    assert.equal(optional.length, PLAN_OPTIONAL[id], `${id}: ${optional.map((e) => e.id)}`);
  }
  const plan = BATTLE ? null : {
    ep8_library_f1: { e8l1_wraiths: 2, e8l1_worms: 1, e8l1_mixed: 2 },
    ep8_library_f2: { e8l2_librarian: 1, e8l2_cranes: 1, e8l2_mixed: 2 },
    ep8_library_f3: { e8l3_pages: 2, e8l3_librarian: 2, e8l3_mixed: 1 },
  };
  for (const id of FLOORS) {
    const counts = {};
    for (const e of maps[id].events) if (e.type === 'enemy') counts[e.encounter] = (counts[e.encounter] || 0) + 1;
    const want = plan ? plan[id] : Object.fromEntries(db.ZONES[id].plan.filter(([enc]) => !db.ENCOUNTERS[enc].boss));
    assert.deepEqual(counts, want, `${id} enemy plan`);
  }
  assert.equal(maps.ep8_library_f2.events.filter((e) => e.type === 'trigger' && e.script === 'unnamed_sentry').length, 1);
  assert.equal(maps.ep8_last_word.events.filter((e) => e.type === 'trigger' && e.script === 'eraser').length, 1);
  assert.equal(maps.ep8_last_word.events.filter((e) => e.type === 'enemy').length, 0);
});

test('house rules on my files: LF, ASCII, no em dash, no banned word', () => {
  const BANNED = new RegExp(['cross', 'word|ana', 'gram|word ', 'puzzle|letter ', 'puzzle|un', 'scramble|word ', 'search'].join(''), 'i');
  const files = [...MINE.map((id) => `src/data/maps/${id}.js`), 'qa/maps/ep8_b_maps.test.mjs', 'qa/maps/ep8_b_preview.py', 'docs/MAPS_EP8_B.md'];
  for (const f of files) {
    if (!exists(f)) { assert.ok(f.endsWith('.md'), `${f} exists`); continue; }
    const t = fs.readFileSync(path.join(NEXT, ...f.split('/')), 'utf8');
    assert.ok(/^[\x09\x0a\x20-\x7e]*$/.test(t), `${f}: ASCII and LF only`);
    assert.ok(!BANNED.test(t.replace(/const BANNED = new RegExp\(\[.*\]\.join\(''\), 'i'\);/, '')), `${f}: banned word`);
  }
});
