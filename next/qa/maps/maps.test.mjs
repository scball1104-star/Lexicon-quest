// Map validity (DESIGN 5.1, W2-maps brief): every map module loads, is rectangular with a complete legend,
// every tile/object/prop/sprite id exists, every door/exit lands on walkable ground, every STAGING.md mark and
// named event exists, enemy counts match encounters.js ZONES plans, the critical path is reachable with the
// gates modeled (keys, plates, switches, the Lantern), and no chest is unreachable.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, MAP_IDS, listMapIds, loadAll, loadDb, validate, walk, parseStagingChecklist, buildGrid } from '../../tools/maps/mapcheck.mjs';

const db = await loadDb();
const maps = await loadAll();
const staging = parseStagingChecklist(fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING.md'), 'utf8'));
const results = Object.fromEntries(Object.entries(maps).map(([id, m]) => [id, validate(m, db, maps, { staging })]));

test('every COMMON.md map id has a module and no module is unexpected', () => {
  assert.deepEqual(listMapIds().sort(), [...MAP_IDS].sort());
  for (const id of MAP_IDS) assert.equal(maps[id].id, id, `module ${id} exports id ${maps[id].id}`);
});

test('STAGING.md section 5 parsed into a checklist for every map', () => {
  for (const id of MAP_IDS) assert.ok(staging[id], `no checklist row for ${id}`);
  assert.ok(staging.willowmere.marks.includes('gather_oren'));
  assert.ok(staging.willowmere.npcs.includes('loaf'));
  assert.ok(staging.archive_boss.marks.includes('fragment_spot'));
  assert.ok(staging.archive_boss.actors.includes('archivore'));
  assert.ok(staging.valley.objects.includes('prop_ferry_bell'));
  assert.ok(staging.archive_f3.chestFlags.includes('stacks_key_found'));
});

for (const id of MAP_IDS) {
  test(`${id}: validates (ids, targets, NPC coverage, enemy plan, STAGING marks)`, () => {
    const r = results[id];
    assert.deepEqual(r.errors, []);
  });
}

test('every map has a banner, start and lighting block', () => {
  for (const id of MAP_IDS) {
    const m = maps[id];
    assert.ok(db.BANNERS[id], `banner ${id}`);
    assert.ok(m.start && Number.isInteger(m.start.x) && Number.isInteger(m.start.y), `start ${id}`);
    assert.ok(m.lighting && typeof m.lighting.dark === 'number', `lighting ${id}`);
    assert.ok(m.legend && m.ground.length > 0, `ground ${id}`);
    for (const row of m.ground) assert.equal(row.length, m.ground[0].length, `${id} rows rectangular`);
  }
});

test('event ids are unique per map and npc events match npcsOnMap exactly', () => {
  for (const id of MAP_IDS) {
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
      if (db.ENCOUNTERS[encId].boss) assert.equal(m.events.filter((e) => e.type === 'actor' && e.id === encId).length, n, `${zoneId} boss ${encId}`);
      else assert.equal(counts[encId] || 0, n, `${zoneId} ${encId}`);
    }
  }
  // no enemies outside the zones, and none in town or interiors
  for (const id of MAP_IDS) if (!db.ZONES[id]) assert.equal(maps[id].events.filter((e) => e.type === 'enemy').length, 0, `${id} has enemies`);
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
  valley: ['archive_door_trig', 'penny', 'quill', 'milestone', 'prop_ferry_bell', 'ferry_post', 'chest_hollow', 'chest_cliff',
    'e_wolves_a', 'e_wolves_b', 'e_slimes', 'e_scarab_a', 'e_scarab_b', 'e_mixed', 'e_pack'],
  archive_f1: ['chest_d', 'chest_b', 'chest_i', 'chest_f', 'prop_letter', 'keydoor_i', 'stairs_f2', 'bell_trig', 'block_c', 'plate_c', 'block_h1', 'block_h2', 'catalog_drawers'],
  archive_f2: ['chest_eg', 'chest_wg', 'prop_letter', 'echo_warden', 'warden_trig', 'lantern_pedestal', 'switch_hub', 'stairs_f3', 'f2_exit_trig', 'hidden_ink_1', 'hidden_ink_2'],
  archive_f3: ['chest_key', 'chest_cache', 'chest_quill', 'prop_letter', 'boss_door', 'bell_trig', 'thirteenth_bell_prop', 'keeper_font', 'shortcut_f1',
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
  for (const id of MAP_IDS) {
    const r = walk(maps[id], db, { lantern: true });
    for (const e of r.events) if (e.type === 'chest') assert.ok(e.reached, `${id}: chest ${e.id} unreachable even with the Lantern`);
  }
  // and without the Lantern the Whisperwood secret stays sealed
  const r = walk(maps.valley, db);
  assert.equal(r.events.find((e) => e.id === 'chest_whisperwood').reached, false);
});

test('gates really gate: F1 needs both plate puzzles and the key; F2 needs the Lantern; F3 needs the three crystals', () => {
  const f1 = results.archive_f1.walk;
  assert.ok(f1.opened.includes('gate_c') && f1.opened.includes('gate_h') && f1.opened.includes('keydoor_i'), f1.log.join('; '));
  assert.ok(f1.keys.includes('archive_key'));
  // without the plates the stairs are unreachable: remove the plates and re-walk
  const noPlates = { ...maps.archive_f1, events: maps.archive_f1.events.filter((e) => e.type !== 'plate') };
  const r1 = walk(noPlates, db);
  assert.equal(r1.events.find((e) => e.id === 'stairs_f2').reached, false, 'F1 stairs reachable without the plates');
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

test('story marks sit on walkable cells where scenes walk actors to them', () => {
  const WALK_MARKS = {
    hero_home: ['bedside'], willowmere: ['home_door', 'bakery_door', 'gate_inner', 'return_spot', 'meet_holt', 'meet_garrick', 'meet_iris',
      'meet_oren', 'meet_hazel', 'meet_mael', 'gather_garrick', 'gather_iris', 'gather_oren', 'gather_hazel', 'gather_mael'],
    library: ['mira_meet'], valley: ['door_step', 'root_exit'], archive_f1: ['catalog_drawer'], archive_boss: ['fragment_spot'],
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
