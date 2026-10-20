// Map validity (DESIGN 5.1, W2-maps brief): every map module loads, is rectangular with a complete legend,
// every tile/object/prop/sprite id exists, every door/exit lands on walkable ground, every STAGING.md mark and
// named event exists, enemy counts match encounters.js ZONES plans, the critical path is reachable with the
// gates modeled (keys, plates, switches, the Lantern), and no chest is unreachable.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, MAP_IDS, MAP_IDS_EP2, listMapIds, loadAll, loadDb, validate, walk, parseStagingChecklist, buildGrid, loadStaging } from '../../tools/maps/mapcheck.mjs';

// COMMON.md maps plus the optional side dungeon (W6-content); Episode 2's eleven maps (E2-maps, qa/maps/ep2_maps.test.mjs).
const EP1_IDS = [...MAP_IDS, 'whisperwood_hollow'];
const ALL_IDS = [...EP1_IDS, ...MAP_IDS_EP2];

const db = await loadDb();
const maps = await loadAll();
const staging = parseStagingChecklist(fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING.md'), 'utf8'));
// validation reads both checklists (STAGING.md section 5 and STAGING_EP2.md section 4, merged per map)
const results = Object.fromEntries(Object.entries(maps).map(([id, m]) => [id, validate(m, db, maps, { staging: loadStaging() })]));

test('every COMMON.md map id has a module and no module is unexpected', () => {
  assert.deepEqual(listMapIds().sort(), [...ALL_IDS].sort());
  for (const id of ALL_IDS) assert.equal(maps[id].id, id, `module ${id} exports id ${maps[id].id}`);
});

test('STAGING.md section 5 parsed into a checklist for every map', () => {
  for (const id of EP1_IDS) assert.ok(staging[id], `no checklist row for ${id}`);
  assert.ok(staging.willowmere.marks.includes('gather_oren'));
  assert.ok(staging.willowmere.npcs.includes('loaf'));
  assert.ok(staging.archive_boss.marks.includes('fragment_spot'));
  assert.ok(staging.archive_boss.actors.includes('archivore'));
  assert.ok(staging.valley.objects.includes('prop_ferry_bell'));
  assert.ok(staging.archive_f3.chestFlags.includes('stacks_key_found'));
});

for (const id of ALL_IDS) {
  test(`${id}: validates (ids, targets, NPC coverage, enemy plan, STAGING marks)`, () => {
    const r = results[id];
    assert.deepEqual(r.errors, []);
  });
}

test('every map has a banner, start and lighting block', () => {
  for (const id of ALL_IDS) {
    const m = maps[id];
    assert.ok(db.BANNERS[id], `banner ${id}`);
    assert.ok(m.start && Number.isInteger(m.start.x) && Number.isInteger(m.start.y), `start ${id}`);
    assert.ok(m.lighting && typeof m.lighting.dark === 'number', `lighting ${id}`);
    assert.ok(m.legend && m.ground.length > 0, `ground ${id}`);
    for (const row of m.ground) assert.equal(row.length, m.ground[0].length, `${id} rows rectangular`);
  }
});

test('event ids are unique per map and npc events match npcsOnMap exactly', () => {
  for (const id of ALL_IDS) {
    const ids = maps[id].events.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, `${id} duplicate event ids`);
    const placed = maps[id].events.filter((e) => e.type === 'npc').map((e) => e.id).sort();
    const expected = db.npcsOnMap(id).map((n) => n.id).sort();
    assert.deepEqual(placed, expected, `${id} npc placement`);
  }
});

test('visible enemy counts match ZONES plans and the boss actors exist', () => {
  for (const [zoneId, zone] of Object.entries(db.ZONES)) {
    const m = maps[zoneId];
    const counts = {};
    for (const e of m.events) if (e.type === 'enemy') counts[e.encounter] = (counts[e.encounter] || 0) + 1;
    for (const [encId, n] of zone.plan) {
      // a boss is an actor with the encounter's id, or (the Other Selves) the step trigger running the scene of that id
      const bossEvents = m.events.filter((e) => e.type === 'actor' && e.id === encId);
      if (db.ENCOUNTERS[encId].boss) assert.equal((bossEvents.length ? bossEvents : m.events.filter((e) => e.type === 'trigger' && e.script === encId)).length, n, `${zoneId} boss ${encId}`);
      else assert.equal(counts[encId] || 0, n, `${zoneId} ${encId}`);
    }
  }
  // no enemies outside the zones, and none in town or interiors
  for (const id of ALL_IDS) if (!db.ZONES[id]) assert.equal(maps[id].events.filter((e) => e.type === 'enemy').length, 0, `${id} has enemies`);
});

test('doors and exits round-trip: every interior door returns to the town cell in front of its building', () => {
  const town = maps.willowmere;
  for (const d of town.events.filter((e) => e.type === 'door')) {
    const [mid, x, y] = d.to;
    const back = maps[mid].events.find((e) => e.type === 'door' && e.to[0] === 'willowmere');
    assert.ok(back, `${mid} has a door back to town`);
    // the interior's exit lands next to the town door (within 1 tile)
    assert.ok(Math.abs(back.to[1] - d.x) <= 1 && Math.abs(back.to[2] - d.y) <= 1, `${mid} exit lands by its town door (${back.to} vs ${d.x},${d.y})`);
    // and the town door lands on the interior's exit cell
    assert.ok(Math.abs(x - back.x) <= 1 && Math.abs(y - back.y) <= 1, `town door into ${mid} lands on its exit cell`);
  }
});

test('the story route is connected: town gate -> valley -> Archive door -> F1 -> F2 -> F3 -> boss -> root passage', () => {
  const hop = (from, pred, label) => {
    const e = maps[from].events.find(pred) || (maps[from].exits || []).find(pred);
    assert.ok(e, `${from}: ${label}`);
    return e.to;
  };
  let to = hop('willowmere', (e) => e.to && e.to[0] === 'valley' && e.x === 20, 'gate exit');
  assert.equal(to[0], 'valley');
  to = hop('valley', (e) => e.type === 'door' && e.to[0] === 'archive_f1', 'Archive door');
  assert.deepEqual(to.slice(0, 3), ['archive_f1', maps.archive_f1.start.x, maps.archive_f1.start.y]);
  to = hop('archive_f1', (e) => e.type === 'door' && e.to[0] === 'archive_f2', 'stairs to F2');
  to = hop('archive_f2', (e) => e.type === 'door' && e.to[0] === 'archive_f3', 'stairs to F3');
  to = hop('archive_f3', (e) => e.type === 'door' && e.to[0] === 'archive_boss', 'boss door passage');
  assert.equal(to[0], 'archive_boss');
  to = hop('archive_boss', (e) => e.type === 'door' && e.to[0] === 'valley', 'root passage');
  const [, x, y] = to;
  assert.deepEqual([x, y], maps.valley.marks.root_exit, 'root passage lands on the valley root_exit mark');
});

// Reachability: what each walk must reach, with the gates modeled by tools/maps/mapcheck.mjs walk().
const MUST_REACH = {
  willowmere: ['door_home', 'door_bakery', 'door_chapel', 'door_inn', 'door_library', 'door_shop', 'door_smithy', 'mael', 'tess', 'nella',
    'bram', 'holt', 'edda', 'wick', 'lark', 'cobb', 'the_duke', 'loaf', 'duck_nest', 'south_gate_trig', 'leave_town_trig', 'fading_sign_trig', 'ferry_landing'],
  valley: ['archive_door_trig', 'first_fight_trig', 'penny', 'quill', 'milestone', 'campfire', 'pilgrim_bench', 'pilgrim_note', 'prop_ferry_bell', 'ferry_post', 'chest_hollow', 'chest_cliff',
    'e_wolves_a', 'e_wolves_b', 'e_slimes', 'e_scarab_a', 'e_scarab_b', 'e_mixed', 'e_pack'],
  archive_f1: ['chest_d', 'chest_b', 'chest_i', 'chest_f', 'prop_letter', 'keydoor_i', 'stairs_f2', 'bell_trig', 'block_c', 'plate_c', 'block_h1', 'block_h2', 'catalog_drawers',
    'shortcut_b', 'shortcut_j', 'shortcut_b_stairs', 'shortcut_j_stairs'],
  archive_f2: ['chest_eg', 'chest_wg', 'prop_letter', 'echo_warden', 'warden_trig', 'lantern_pedestal', 'switch_hub', 'stairs_f3', 'f2_exit_trig', 'hidden_ink_1', 'hidden_ink_2', 'keeper_font_f2'],
  archive_f3: ['chest_key', 'chest_cache', 'chest_quill', 'prop_letter', 'boss_door', 'bell_trig', 'thirteenth_bell_prop', 'keeper_font', 'shortcut_f1', 'crystal_plaque',
    'crystal_a', 'crystal_b', 'crystal_c', 'gate_bk', 'cache_up', 'brazier_ws1', 'brazier_cr1', 'brazier_pr1', 'hidden_ink_3'],
  archive_boss: ['archivore', 'root_passage_exit', 'back_to_f3'],
  hero_home: ['home_exit', 'hazel', 'home_doorframe', 'home_blanket', 'home_hearth', 'home_loom', 'home_window', 'home_bookshelf'],
  library: ['library_exit', 'iris', 'mira', 'library_up', 'library_down', 'book_map', 'book_history', 'book_tales', 'mira_desk'],
  chapel: ['chapel_exit', 'pip', 'save_bell', 'chapel_plaque', 'chapel_ropes', 'chapel_pews'],
  inn: ['inn_exit', 'hob', 'barnaby', 'inn_up', 'inn_down', 'inn_guestbook'],
  smithy: ['smithy_exit', 'garrick', 'anvil', 'starter_dough', 'forge'],
  bakery: ['bakery_exit', 'oren', 'hal', 'bakery_crock', 'flour_bin'],
  item_shop: ['shop_exit', 'pell'],
};

for (const [id, ids] of Object.entries(MUST_REACH)) {
  test(`${id}: critical path and rewards are reachable from the start`, () => {
    const r = results[id].walk;
    assert.ok(r && !r.error, `walk ran for ${id}`);
    const reached = Object.fromEntries(r.events.map((e) => [e.id, e.reached]));
    for (const eid of ids) {
      assert.ok(eid in reached, `${id}: event ${eid} exists`);
      assert.ok(reached[eid], `${id}: ${eid} unreachable (walk log: ${r.log.join('; ')})`);
    }
  });
}

test('every chest is reachable (the Whisperwood chest once the Lantern is held)', () => {
  for (const id of ALL_IDS) {
    const r = walk(maps[id], db, { lantern: true });
    for (const e of r.events) if (e.type === 'chest') assert.ok(e.reached, `${id}: chest ${e.id} unreachable even with the Lantern`);
  }
  // and without the Lantern the Whisperwood secret stays sealed
  const r = walk(maps.valley, db);
  assert.equal(r.events.find((e) => e.id === 'chest_whisperwood').reached, false);
});

// The walk model ignores `if` flags on doors; the engine hides a flag-gated door until its flag is set. `sealed`
// is a map as a fresh party sees it: every `if`-gated door and object removed (the F1 back-stair, the F3 shortcut end).
const sealed = (m) => ({ ...m, events: m.events.filter((e) => !((e.type === 'door' || e.type === 'object') && e.if)) });

test('gates really gate: F1 needs both plate puzzles and the key; F2 needs the Lantern; F3 needs the three crystals', () => {
  const f1 = walk(sealed(maps.archive_f1), db);
  assert.ok(f1.opened.includes('gate_c') && f1.opened.includes('gate_h') && f1.opened.includes('keydoor_i'), f1.log.join('; '));
  assert.ok(f1.keys.includes('archive_key'));
  assert.ok(f1.events.find((e) => e.id === 'stairs_f2').reached, 'a fresh party reaches the F1 stairs the long way');
  // without the plates the stairs are unreachable: remove the plates and re-walk
  const noPlates = { ...sealed(maps.archive_f1), events: sealed(maps.archive_f1).events.filter((e) => e.type !== 'plate') };
  const r1 = walk(noPlates, db);
  assert.equal(r1.events.find((e) => e.id === 'stairs_f2').reached, false, 'F1 stairs reachable without the plates');
  // and without the key chest the key door stays shut
  const noKey = { ...sealed(maps.archive_f1), events: sealed(maps.archive_f1).events.filter((e) => e.id !== 'chest_d') };
  const r1k = walk(noKey, db);
  assert.equal(r1k.events.find((e) => e.id === 'stairs_f2').reached, false, 'F1 stairs reachable without the Archive Key');
  const f2 = results.archive_f2.walk;
  assert.ok(f2.lantern, 'F2 walk picks up the Lantern');
  const noLantern = { ...maps.archive_f2, events: maps.archive_f2.events.filter((e) => e.id !== 'lantern_pedestal') };
  const r2 = walk(noLantern, db);
  assert.equal(r2.events.find((e) => e.id === 'stairs_f3').reached, false, 'F2 stairs reachable without the Lantern');
  const f3 = results.archive_f3.walk;
  assert.ok(f3.opened.includes('gate_bk') && f3.keys.includes('stacks_key'), f3.log.join('; '));
  // make one crystal unusable (a hidden switch needs the Lantern, which F3's walk does not grant) and the key stays sealed
  const stuck = { ...maps.archive_f3, events: maps.archive_f3.events.map((e) => (e.id === 'crystal_c' ? { ...e, hidden: true } : e)) };
  const r3 = walk(stuck, db);
  assert.equal(r3.events.find((e) => e.id === 'chest_key').reached, false, 'Stacks Key reachable with a crystal unlit');
});

// ------------------------------------------------------------------------------------------------
// W5 story-maps: the teaching fight, the campfire, the F2 font, the F1 back-stair, the F3 swap and plaque.
// ------------------------------------------------------------------------------------------------
const byId = (m, id) => m.events.find((e) => e.id === id);

test('valley: the wolf pack chases at the bend and the first-fight trigger spans the road before it', () => {
  const v = maps.valley;
  const wolves = byId(v, 'e_wolves_a');
  assert.deepEqual([wolves.x, wolves.y, wolves.move, wolves.encounter], [14, 33, 'chase', 'valley_wolves']);
  const t = byId(v, 'first_fight_trig');
  assert.equal(t.script, 'first_fight');
  assert.ok(t.x < wolves.x - 5, 'the trigger fires before the pack notices the party (chase radius 5)');
  const g = buildGrid(v, db);
  // unavoidable: every passable cell in the trigger's column is inside it, so the meadow offers no way round
  const inTrig = (x, y) => x >= t.x && x < t.x + (t.w || 1) && y >= t.y && y < t.y + (t.h || 1);
  for (let y = 0; y < g.H; y++) assert.ok(g.code[y][t.x] !== 'none' || inTrig(t.x, y), `column ${t.x} is open at row ${y} outside the trigger`);
  assert.ok(inTrig(t.x, 33) && inTrig(t.x, 34), 'the road rows are in it');
  assert.equal(v.ground[wolves.y][wolves.x], '=', 'the pack waits on the road');
  assert.ok(v.start.x < t.x, 'the gate is west of the cut');
  // the road is still continuous from the gate to the bridge deck and to the Archive forecourt (walk model)
  const r = results.valley.walk;
  for (const [x, y] of [[1, 33], [14, 33], [25, 33], [35, 33], [36, 20], [36, 8], [36, 7]]) assert.ok(r.reachable.includes(`${x},${y}`), `road cell ${x},${y} reachable`);
  assert.equal(g.code[33][1], 'none');
});

test('valley: the campfire runs campfire_rest, rests and is safe; the bench carries its sign; no font or bell was added', () => {
  const v = maps.valley;
  const c = byId(v, 'campfire');
  assert.equal(c.type, 'object');
  assert.deepEqual([c.x, c.y, c.script, c.safe, c.rest, c.sprite], [39, 22, 'campfire_rest', true, true, 'brazier_lit']);
  assert.deepEqual(v.marks.campfire, [39, 22]);
  assert.equal(byId(v, 'pilgrim_bench').text, 'pilgrim_bench');
  assert.equal(v.events.filter((e) => e.type === 'font' || e.type === 'save').length, 0);
  // the campfire can be reached from a tile beside it (the bench is south, Quill east)
  const r = results.valley.walk;
  assert.ok(r.reachable.includes('38,22') || r.reachable.includes('39,21'));
});

test('valley shapes: the roads bend and widen, the tall grass is in blobs, the Whisperwood pool is not a rectangle', () => {
  const g = maps.valley.ground;
  const widths = (y) => g[y].split('').filter((c) => c === '=').length;
  // the west road: its width (per column) changes at least twice across its run (CRITIQUE_2 item 6)
  let changes = 0, prev = null;
  for (let x = 0; x <= 25; x++) { const w = [32, 33, 34, 35].filter((y) => g[y][x] === '=').length; if (prev != null && w !== prev) changes++; prev = w; }
  assert.ok(changes >= 2, `the west road changes width ${changes} times`);
  // the pilgrim road: its west edge is not one straight column
  const edges = new Set();
  for (let y = 8; y <= 19; y++) edges.add(g[y].indexOf('='));
  assert.ok(edges.size >= 2, 'the pilgrim road bends');
  assert.ok([10, 14, 18, 24, 28, 32].some((y) => widths(y) >= 3), 'the pilgrim road widens somewhere');
  // tall grass: a fair share, and not laid out as 2x2 blocks (some rows have odd-length runs)
  let tall = 0, odd = 0;
  for (const row of g) { tall += row.split('').filter((c) => c === ',').length; for (const run of row.match(/,+/g) || []) if (run.length % 2 === 1) odd++; }
  assert.ok(tall > 120 && tall < 600, `tall grass share ${tall}`);
  assert.ok(odd >= 10, 'tall grass runs are irregular');
  // no tall grass touches a road cell
  for (let y = 1; y < g.length - 1; y++) for (let x = 1; x < g[0].length - 1; x++) {
    if (g[y][x] !== '=') continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) assert.notEqual(g[y + dy][x + dx], ',', `tall grass on the verge at ${x + dx},${y + dy}`);
  }
  // the ink pool: ragged, but the bridge row still spans ink and the west landing is grass
  const inkRows = [28, 29, 30, 31, 32, 33].map((y) => g[y].split('').filter((c) => c === 'i').length);
  assert.ok(new Set(inkRows).size >= 2, 'the pool is not a rectangle');
  for (const x of [53, 54, 55]) assert.equal(g[31][x], 'i');
  for (const x of [51, 52]) assert.ok(g[31][x] === '.' || g[31][x] === ',', `the landing at ${x},31 is grass`);
});

test('archive_f1: the back-stair joins the stairs landing and the antechamber both ways once the bell has tolled', () => {
  const f1 = maps.archive_f1;
  const b = byId(f1, 'shortcut_b'), j = byId(f1, 'shortcut_j');
  for (const d of [b, j]) { assert.equal(d.type, 'door'); assert.equal(d.kind, 'stairs'); assert.equal(d.if, 'archive_f1_done'); }
  assert.deepEqual(b.to, ['archive_f1', j.x, j.y, 'down']);
  assert.deepEqual(j.to, ['archive_f1', b.x, b.y, 'down']);
  for (const id of ['shortcut_b_stairs', 'shortcut_j_stairs']) { const o = byId(f1, id); assert.equal(o.sprite, 'stairs_up'); assert.equal(o.if, 'archive_f1_done'); }
  assert.deepEqual([b.x, b.y], [33, 3], 'J end beside the stairs down');
  assert.deepEqual([j.x, j.y], [7, 23], 'B end in the antechamber by the exit');
  // with the back-stair open, the landing is a few steps from the exit: J is reached without the plates
  const open = { ...maps.archive_f1, events: maps.archive_f1.events.filter((e) => e.type !== 'plate') };
  assert.ok(walk(open, db).events.find((e) => e.id === 'stairs_f2').reached, 'the open back-stair reaches the landing');
  // the F3 shortcut still waits for archive_f2_done, so F3 is never reachable from F1 early
  assert.equal(byId(f1, 'shortcut_f3').if, 'archive_f2_done');
  assert.equal(byId(f1, 'chest_d').flag, 'archive_key_found');
});

test('archive_f2: one Keeper\'s font in the stairs room, safe, with its own two-box text; nothing else was added', () => {
  const f2 = maps.archive_f2;
  const fonts = f2.events.filter((e) => (e.type === 'font' || e.type === 'save') && e.id !== 'keeper_font_f2_hall');
  assert.equal(fonts.length, 1);
  const f = fonts[0];
  assert.deepEqual([f.id, f.type, f.text, f.safe, f.w, f.h], ['keeper_font_f2', 'font', 'keeper_font_galleries', true, 4, 2]);
  assert.ok(f.x >= 33 && f.x + f.w - 1 <= 38 && f.y - f.h + 1 >= 12 && f.y <= 17, 'inside the stairs room (33..38, 12..17)');
  assert.ok(db.lines.keeper_font_galleries.length === 2);
  // the stairs and the exit trigger stay clear of it
  const stairs = byId(f2, 'stairs_f3'), trig = byId(f2, 'f2_exit_trig');
  const cells = new Set(); for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) cells.add(`${f.x + i},${f.y - j}`);
  assert.ok(!cells.has(`${stairs.x},${stairs.y}`) && !cells.has(`${stairs.x},${stairs.y + 1}`));
  for (let j = 0; j < trig.h; j++) for (let i = 0; i < trig.w; i++) assert.ok(!cells.has(`${trig.x + i},${trig.y + j}`), 'font off the exit trigger');
  for (const id of ['archive_f1', 'archive_f3', 'archive_boss', 'valley']) {
    const n = maps[id].events.filter((e) => e.type === 'font' || e.type === 'save').length;
    assert.equal(n, id === 'archive_f3' ? 1 : 0, `${id} fonts`);
  }
});

test('archive_f2: the entry hall font is the rest point before the Warden (W10, PLAYTEST_REVIEW_2 fix 1)', () => {
  const f2 = maps.archive_f2;
  const hall = byId(f2, 'keeper_font_f2_hall');
  assert.deepEqual([hall.type, hall.text, hall.safe, hall.w, hall.h], ['font', 'keeper_font_hall', true, 4, 2]);
  assert.ok(typeof db.lines.keeper_font_hall === 'string' && db.lines.keeper_font_hall.length > 0);
  assert.ok(hall.x >= 15 && hall.x + hall.w - 1 <= 25 && hall.y - hall.h + 1 >= 4 && hall.y <= 8, 'inside the entry hall (15..25, 4..8)');
  // without the Lantern (no pedestal): the hall font and the Warden are reachable, the stairs-room font is not
  const dark = walk({ ...f2, events: f2.events.filter((e) => e.script !== 'lantern_get') }, db);
  const reached = (id) => dark.events.find((e) => e.id === id).reached;
  assert.equal(dark.lantern, false);
  assert.ok(reached('keeper_font_f2_hall'), 'hall font before the Lantern');
  assert.ok(reached('warden_trig') && reached('echo_warden'), 'the Warden before the Lantern');
  assert.equal(reached('keeper_font_f2'), false, 'the stairs-room font stays behind the hidden-ink bridge');
  // the walk from the stairs up to the hub stays open (carpet column 20) and the font does not touch the stairs
  const g = buildGrid(f2, db);
  for (let y = 4; y <= 11; y++) assert.equal(g.code[y][20], 'none', `entry column open at y ${y}`);
});

test('archive_f3: the corridor patrol is the lighter ink group, the two-wraith guard sits in the alcove; the plaque is by the crystals', () => {
  const f3 = maps.archive_f3;
  const cor = byId(f3, 'e_cor_ink'), ws = byId(f3, 'e_ws_wraiths');
  assert.deepEqual([cor.x, cor.y, cor.encounter, cor.move], [5, 20, 'f3_ink', 'patrol']);
  assert.deepEqual([ws.x, ws.y, ws.encounter, ws.move], [3, 14, 'f3_wraiths', 'guard']);
  assert.ok(!byId(f3, 'e_cor_wraiths') && !byId(f3, 'e_ws_ink_b'));
  const counts = {};
  for (const e of f3.events) if (e.type === 'enemy') counts[e.encounter] = (counts[e.encounter] || 0) + 1;
  assert.deepEqual(counts, { f3_ink: 2, f3_golem: 2, f3_wraiths: 2, f3_mixed: 2 });
  const p = byId(f3, 'crystal_plaque');
  assert.equal(p.type, 'sign');
  const gate = byId(f3, 'gate_bk');
  assert.ok(Math.abs(p.x - gate.x) <= 3 && Math.abs(p.y - gate.y) <= 1, 'the plaque sits beside the barred door');
  assert.ok(f3.overlays.some((o) => o.t === 'wall_glyph_revealed' && o.x === p.x && o.y === p.y - 1), 'drawn as a glyph on the face');
  assert.ok(results.archive_f3.walk.events.find((e) => e.id === 'crystal_plaque').reached);
});

test('story marks sit on walkable cells where scenes walk actors to them', () => {
  const WALK_MARKS = {
    hero_home: ['bedside'], willowmere: ['home_door', 'bakery_door', 'gate_inner', 'return_spot', 'meet_holt', 'meet_garrick', 'meet_iris',
      'meet_oren', 'meet_hazel', 'meet_mael', 'gather_garrick', 'gather_iris', 'gather_oren', 'gather_hazel', 'gather_mael'],
    library: ['mira_meet'], valley: ['door_step', 'root_exit'], archive_f1: ['catalog_drawer'], archive_f2: ['font'], archive_boss: ['fragment_spot'],
  };
  for (const [id, names] of Object.entries(WALK_MARKS)) {
    const r = results[id].walk;
    for (const n of names) {
      const m = r.marks.find((k) => k.name === n);
      assert.ok(m, `${id}: mark ${n}`);
      assert.ok(m.walkable && m.reached, `${id}: mark ${n} at ${m.x},${m.y} must be walkable and reachable`);
    }
  }
  // door_step keeps the tiles left and right open (Bram and Mira step aside), and the bed has floor below it
  const v = buildGrid(maps.valley, db);
  const [dx, dy] = maps.valley.marks.door_step;
  assert.equal(v.code[dy][dx - 1], 'none'); assert.equal(v.code[dy][dx + 1], 'none');
  const h = buildGrid(maps.hero_home, db);
  const [bx, by] = maps.hero_home.marks.bed;
  assert.equal(h.code[by + 1][bx], 'none', 'floor below the bed');
  assert.deepEqual([bx, by], [4, 3], 'bed mark matches START_POS in game/state.js');
});

test('fading signs carry the tile and fade state the renderer needs; the gate sign is interact-only', () => {
  const signs = maps.willowmere.events.filter((e) => e.type === 'sign' && e.fade);
  assert.ok(signs.length >= 7);
  for (const s of signs) assert.ok(['shop', 'inn', 'square', 'gate'].includes(s.fade), s.id);
  const gate = signs.find((s) => s.id === 'town_sign');
  assert.equal(gate.on, 'interact');
  assert.deepEqual([gate.x, gate.y], maps.willowmere.marks.town_sign);
});

// ------------------------------------------------------------------------------------------------
// W6-content: Whisperwood Hollow, the optional side dungeon under the valley's Whisperwood pool.
// ------------------------------------------------------------------------------------------------
test('whisperwood_hollow: 28 x 20, one dark floor with braziers, doors both ways with the valley pool edge', () => {
  const m = maps.whisperwood_hollow;
  assert.equal(m.ground.length, 20); assert.equal(m.ground[0].length, 28);
  assert.equal(m.area, 'dungeon');
  assert.equal(m.lighting.dark, 0.5);
  assert.ok(m.events.filter((e) => e.type === 'brazier').length >= 2, 'braziers to light');
  const mouth = byId(maps.valley, 'hollow_mouth'), out = byId(m, 'hollow_exit');
  assert.deepEqual(mouth.to.slice(0, 3), ['whisperwood_hollow', m.start.x, m.start.y], 'the root arch lands on the hollow start');
  assert.equal(out.to[0], 'valley');
  assert.ok(Math.abs(out.to[1] - mouth.x) <= 1 && Math.abs(out.to[2] - mouth.y) <= 1, 'the stairs land by the root arch');
  const vg = maps.valley.ground;
  let ink = false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (vg[mouth.y + dy]?.[mouth.x + dx] === 'i') ink = true;
  assert.ok(ink, 'the mouth is at the ink pool edge');
  assert.ok(maps.valley.decor.some((d) => d.t === 'arch_ruin' && Math.abs(d.x - mouth.x) <= 1 && d.y === mouth.y), 'an arch marks the mouth');
  const chest = byId(maps.valley, 'chest_whisperwood');
  assert.deepEqual([chest.x, chest.y, chest.tier, chest.item], [57, 31, 'gold', 'pilgrim_reach'], 'the pool secret stays put');
  for (const k of ['entrance', 'bridge_near', 'bridge_far', 'alpha_spot', 'plaque', 'gold_chest']) assert.ok(m.marks[k], `mark ${k}`);
});

test('whisperwood_hollow: the Lantern opens it, the plate opens the den, everything is reachable with the Lantern', () => {
  const m = maps.whisperwood_hollow;
  const reached = (r, id) => r.events.find((e) => e.id === id).reached;
  const dark = results.whisperwood_hollow.walk;   // no Lantern: the far shore is out of reach
  assert.equal(dark.lantern, false);
  assert.ok(reached(dark, 'hollow_exit') && reached(dark, 'old_piles'));
  for (const id of ['h_wolves_a', 'h_blot', 'chest_bay', 'block_m', 'gate_b', 'whisperwood_alpha', 'chest_alpha']) assert.equal(reached(dark, id), false, `${id} without the Lantern`);
  const lit = walk(m, db, { lantern: true });
  assert.deepEqual(lit.unreached, [], lit.log.join('; '));
  assert.ok(lit.opened.includes('gate_b'));
  for (const k of ['bridge_far', 'alpha_spot', 'gold_chest']) assert.ok(lit.marks.find((x) => x.name === k).reached, `mark ${k} with the Lantern`);
  const noBlock = walk({ ...m, events: m.events.filter((e) => e.type !== 'block') }, db, { lantern: true });
  for (const id of ['whisperwood_alpha', 'chest_alpha', 'lost_bridge_plaque']) assert.equal(reached(noBlock, id), false, `${id} without the block`);
  // the lost bridge is exactly the hidden-ink crossing of the pool on row 16
  const faint = m.overlays.filter((o) => /^ink_bridge_.*_faint$/.test(o.t));
  assert.ok(faint.length >= 4 && faint.every((o) => o.y === m.marks.bridge_near[1]));
});

test('whisperwood_hollow: the pilgrims\' shrine is a rest point past the block gate, before the Alpha (W10)', () => {
  const m = maps.whisperwood_hollow;
  const s = byId(m, 'hollow_shrine');
  assert.deepEqual([s.type, s.sprite, s.text, s.safe], ['font', 'rune_shrine', 'pilgrim_shrine', true]);
  assert.ok(typeof db.lines.pilgrim_shrine === 'string');
  const t = byId(m, 'alpha_trig');
  assert.ok(s.y > t.y, 'the shrine sits below the trigger row (reached before the fight)');
  const lit = walk(m, db, { lantern: true });
  assert.ok(lit.events.find((e) => e.id === 'hollow_shrine').reached);
  // reachable from the notch without stepping on the trigger: flood from the notch over non-trigger floor
  const g = buildGrid(m, db);
  const notch = byId(m, 'notch_b');
  const onTrig = (x, y) => y === t.y && x >= t.x && x < t.x + t.w;
  const seen = new Set([`${notch.x},${notch.y}`]);
  const q = [[notch.x, notch.y]];
  let touches = false;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= s.x && nx < s.x + s.w && ny <= s.y && ny > s.y - s.h) touches = true;
      if (seen.has(`${nx},${ny}`) || onTrig(nx, ny) || !g.code[ny] || g.code[ny][nx] !== 'none' || ny < t.y) continue;
      seen.add(`${nx},${ny}`); q.push([nx, ny]);
    }
  }
  assert.ok(touches, 'the shrine can be used from the vestibule without crossing the trigger');
  assert.deepEqual(m.marks.shrine.length, 2);
  assert.equal(byId(m, 'whisperwood_alpha').sprite, 'briar_alpha', 'the boss-intro actor is the Alpha, not a plain wolf');
});

test('whisperwood_hollow: the push-block puzzle has a solution and the straight push is blocked', () => {
  const m = maps.whisperwood_hollow;
  const g = buildGrid({ ...m, events: [] }, db);
  const free = (x, y) => g.code[y][x] === 'none';
  const b = byId(m, 'block_m'), p = byId(m, 'plate_m');
  assert.equal(p.target, 'gate_b');
  assert.ok(p.x > b.x && p.y > b.y);
  assert.equal(free(b.x + 2, b.y), false, 'the root column stops the straight push east');
  // push south (the party stands north of it), then east (the party stands west of it)
  assert.ok(free(b.x, b.y - 1));
  for (let y = b.y + 1; y <= p.y; y++) assert.ok(free(b.x, y), `column ${b.x} open at ${y}`);
  assert.ok(free(b.x - 1, p.y));
  for (let x = b.x + 1; x <= p.x; x++) assert.ok(free(x, p.y), `row ${p.y} open at ${x}`);
});

test('whisperwood_hollow: three visible enemies, an iron and a gold chest, the Alpha behind its trigger', () => {
  const m = maps.whisperwood_hollow;
  const foes = m.events.filter((e) => e.type === 'enemy');
  assert.deepEqual(foes.map((e) => e.encounter).sort(), ['hollow_blot', 'hollow_wolves', 'hollow_wolves']);
  assert.deepEqual(foes.map((e) => e.sprite).sort(), ['ink_blot', 'thornback_wolf', 'thornback_wolf']);
  assert.ok(db.ENCOUNTERS.hollow_blot.elite, 'the ink slime of the brief is a fixed elite');
  const chests = m.events.filter((e) => e.type === 'chest');
  assert.deepEqual(chests.map((c) => c.tier).sort(), ['gold', 'iron']);
  const gold = chests.find((c) => c.tier === 'gold');
  const alpha = byId(m, 'whisperwood_alpha');
  assert.equal(alpha.type, 'actor'); assert.equal(alpha.ifNot, 'briar_alpha_defeated');
  assert.deepEqual([alpha.x, alpha.y], m.marks.alpha_spot);
  const t = byId(m, 'alpha_trig'), notch = byId(m, 'notch_b');
  assert.equal(t.script, 'hollow_alpha');
  // W10: the notch opens into the shrine vestibule below the den; the trigger row is the vestibule's only way up
  assert.equal(byId(m, 'gate_b').to[2], notch.y, 'the barred door lands on the notch');
  assert.ok(notch.x >= t.x && notch.x < t.x + t.w && notch.y > t.y + 1, 'the notch is below the trigger, past the vestibule');
  const g = buildGrid(m, db);
  for (let x = 0; x < m.ground[0].length; x++) {
    if (g.code[t.y + 1][x] !== 'none' || g.code[t.y][x] !== 'none') continue;
    assert.ok(x >= t.x && x < t.x + t.w, `vestibule column ${x} leads up past the trigger`);
  }
  assert.ok(gold.y < t.y && alpha.y < t.y, 'the gold chest is behind the Alpha');
  assert.equal(byId(m, 'hollow_enter').script, 'hollow_entry');
  assert.equal(byId(m, 'lost_bridge_plaque').lantern, true);
});
