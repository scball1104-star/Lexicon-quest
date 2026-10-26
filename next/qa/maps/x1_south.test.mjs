// X1-maps-south: x1_millrace, x1_mill, x1_culvert (EXPANSION1_PLAN 3.2, 3.6, 4.7 to 4.9, 4.11, 6.1). The maps are x1 pack
// files: the test registers the pack's data, merges the x1 tile fragment and the x1 sprite atlases into mapcheck's database the
// way ensurePack does (mapcheck.mjs itself reads tiles.json only) and loads the three modules directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NEXT, loadMap, loadAll, loadDb, validate, walk, buildGrid, eventCells } from '../../tools/maps/mapcheck.mjs';
import { mergeTileFragment } from '../../src/game/packs.js';

const rd = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const db = await loadDb();
mergeTileFragment(db.tiles, rd('assets/tiles/x1_tiles.json'));
Object.assign(db.enemiesField.sprites, rd('assets/sprites/x1_enemies_field.json').sprites);
Object.assign(db.npcAtlas.sprites, rd('assets/sprites/x1_npcs.json').sprites);
await (await import(pathToFileURL(path.join(NEXT, 'src/data/x1/index.js')).href)).register();

const IDS = ['x1_millrace', 'x1_mill', 'x1_culvert'];
const maps = await loadAll();
const M = Object.fromEntries(IDS.map((id) => [id, maps[id]]));
const FLAGS = ['first_fight_done', 'archive_f1_done'];
// the one error the integrate wave owns: events.js GATE_SPRITES and mapcheck GATE_SPRITE_IDS do not list x1_gate_culvert yet
const SEAM = /^gate gate_drain: sprite x1_gate_culvert$/;
const ev = (m, id) => m.events.find((e) => e.id === id);
const cell = (e) => [e.x, e.y];
const key = (x, y) => `${x},${y}`;
const man = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** Shortest walkable path between two cells on the collision grid of the map as a save with `flags` sees it. */
function pathBetween(map, from, to, flags = FLAGS) {
  const m = { ...map, events: map.events.filter((e) => (e.if == null || [].concat(e.if).every((f) => flags.includes(f))) && (e.ifNot == null || ![].concat(e.ifNot).some((f) => flags.includes(f)))) };
  const g = buildGrid(m, db);
  const free = (x, y) => x >= 0 && y >= 0 && x < g.W && y < g.H && g.code[y][x] === 'none';
  const prev = new Map([[key(...from), null]]);
  const q = [from];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    if (x === to[0] && y === to[1]) break;
    for (const [dx, dy] of Object.values(DIRV)) {
      const nx = x + dx, ny = y + dy;
      if (!free(nx, ny) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), [x, y]); q.push([nx, ny]);
    }
  }
  if (!prev.has(key(...to))) return null;
  const out = [];
  for (let c = to; c; c = prev.get(key(...c))) out.push(c);
  return out.reverse();
}

/** Every cell a visible group may stand on: its post, plus its wander radius or patrol path. */
function foeCells(e) {
  if (e.move === 'patrol') {
    const out = [[e.x, e.y]]; let [x, y] = [e.x, e.y];
    for (const d of e.path) { x += DIRV[d][0]; y += DIRV[d][1]; out.push([x, y]); }
    return out;
  }
  const r = e.move === 'wander' ? (e.radius || 1) : 0;
  const out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r) out.push([e.x + dx, e.y + dy]);
  return out;
}

// ------------------------------------------------------------------------------------------------ validity
for (const id of IDS) {
  test(`${id}: validates (ids, targets, plans, walk); the only error is the gate sprite seam`, () => {
    const r = validate(M[id], db, maps, {});
    assert.deepEqual(r.errors.filter((e) => !SEAM.test(e)), []);
    for (const w of r.warnings) assert.match(w, /not built yet \(pending in x1_links\.json\)/, `${id}: unexpected warning ${w}`);
    assert.ok(db.BANNERS[id], `banner ${id}`);
  });
}

test('the module fields: ids, sizes, areas, music, lighting, respawn', () => {
  const want = { x1_millrace: [52, 32, 'field', 'millrace'], x1_mill: [16, 12, 'interior', 'millrace'], x1_culvert: [28, 20, 'dungeon', 'mystery'] };
  for (const [id, [w, h, area, music]] of Object.entries(want)) {
    const m = M[id];
    assert.equal(m.id, id); assert.equal(m.ground[0].length, w); assert.equal(m.ground.length, h);
    assert.equal(m.area, area); assert.equal(m.music, music);
    for (const row of m.ground) assert.equal(row.length, w);
  }
  assert.equal(M.x1_millrace.respawn, 'reentry');
  assert.equal(M.x1_culvert.lighting.dark, 0.4);
  assert.equal(M.x1_millrace.ambience, 'river_birds');
  assert.equal(M.x1_culvert.ambience, 'river_birds');
});

// ------------------------------------------------------------------------------------------------ the marks of 4.11
const MARKS = {
  x1_millrace: 'valley_gate drovers_gate signpost mill_door wheel pin_socket weir ferrick jetty larch_gate culvert bank_crack stone',
  x1_mill: 'door table ledger stones',
  x1_culvert: 'entrance plate_1 plate_2 gate pump pin_chest hearth golem_spot golem_chest',
};
const EVENTS = {
  x1_millrace: 'ferrick x1_mill_wheel block_stone chest_mr_stone chest_mr_orchard chest_mr_bank x1_crack_bank e_mr_weevils e_mr_wolves door_mill x1_mill_barred culvert_door',
  x1_mill: 'x1_flour_table mill_ledger_obj',
  x1_culvert: 'block_b1 block_b2 plate_b1 plate_b2 gate_drain chest_cv_pin chest_cv_drain chest_cv_golem x1_crack_drain culvert_font golem_trig millstone_golem e_cv_blots e_cv_wraith',
};
for (const id of IDS) {
  test(`${id}: every mark and named event of plan 4.11 exists`, () => {
    for (const name of MARKS[id].split(' ')) assert.ok(M[id].marks[name], `mark ${name}`);
    for (const e of EVENTS[id].split(' ')) assert.ok(ev(M[id], e), `event ${e}`);
  });
}

test('marks that scenes walk to or stand on are walkable and reachable', () => {
  const needs = { x1_millrace: ['valley_gate', 'drovers_gate', 'mill_door', 'pin_socket', 'jetty', 'culvert', 'larch_gate', 'weir', 'bank_crack'],
    x1_mill: ['door', 'table', 'ledger', 'stones'], x1_culvert: ['entrance', 'plate_1', 'plate_2', 'gate', 'pump', 'pin_chest', 'hearth', 'golem_spot', 'golem_chest'] };
  for (const id of IDS) {
    const w = walk(M[id], db, { flags: FLAGS });
    for (const name of needs[id]) {
      const m = w.marks.find((x) => x.name === name);
      assert.ok(m.walkable, `${id} mark ${name} walkable`);
      assert.ok(m.reached, `${id} mark ${name} reached`);
    }
  }
});

// ------------------------------------------------------------------------------------------------ plan counts, loot, flags
test('plan counts: 2 groups (millrace), 2 groups + the boss actor (culvert); fixed chest contents', () => {
  const count = (m, t) => m.events.filter((e) => e.type === 'enemy' && e.encounter === t).length;
  assert.equal(count(M.x1_millrace, 'mr_weevils'), 1); assert.equal(count(M.x1_millrace, 'mr_wolves'), 1);
  assert.equal(M.x1_millrace.events.filter((e) => e.type === 'enemy').length, 2);
  assert.equal(count(M.x1_culvert, 'cv_blots'), 1); assert.equal(count(M.x1_culvert, 'cv_wraith'), 1);
  assert.equal(M.x1_culvert.events.filter((e) => e.type === 'enemy').length, 2);
  assert.equal(M.x1_culvert.events.filter((e) => e.type === 'actor' && e.id === 'millstone_golem').length, 1);
  assert.equal(M.x1_mill.events.filter((e) => e.type === 'enemy').length, 0);
  const pin = ev(M.x1_culvert, 'chest_cv_pin');
  assert.equal(pin.tier, 'wood'); assert.equal(pin.item, 'millstone_pin'); assert.equal(pin.flag, 'pin_found');
  assert.equal(ev(M.x1_millrace, 'chest_mr_orchard').tier, 'wood'); assert.equal(ev(M.x1_millrace, 'chest_mr_orchard').item, undefined);
  assert.equal(ev(M.x1_millrace, 'chest_mr_bank').tier, 'wood');
  assert.equal(ev(M.x1_millrace, 'chest_mr_stone').tier, 'iron'); assert.equal(ev(M.x1_millrace, 'chest_mr_stone').item, 'phoenix_feather');
  assert.equal(ev(M.x1_millrace, 'chest_mr_stone_b').item, 'honey_roll'); assert.equal(ev(M.x1_millrace, 'chest_mr_stone_b').qty, 3);
  assert.equal(ev(M.x1_culvert, 'chest_cv_drain').tier, 'wood'); assert.equal(ev(M.x1_culvert, 'chest_cv_golem').tier, 'iron');
});

test('the wheel, the barred door, the ledger and the sill: ids, scripts and flag gates', () => {
  const wheel = ev(M.x1_millrace, 'x1_mill_wheel');
  assert.equal(wheel.type, 'object'); assert.equal(wheel.script, 'pin_place'); assert.equal(wheel.ifNot, 'mill_turning');
  assert.ok(db.scenes.pin_place && db.scenes.mill_done);
  assert.equal(ev(M.x1_millrace, 'door_mill').if, 'archivore_defeated');
  assert.equal(ev(M.x1_millrace, 'x1_mill_barred').ifNot, 'archivore_defeated');
  assert.deepEqual(cell(ev(M.x1_millrace, 'door_mill')), cell(ev(M.x1_millrace, 'x1_mill_barred')));
  assert.equal(ev(M.x1_mill, 'mill_ledger_obj').script, 'list_ledger'); assert.ok(db.scenes.list_ledger);
  assert.equal(ev(M.x1_mill, 'x1_sill_rolls').if, 'mill_done');
  assert.equal(ev(M.x1_culvert, 'golem_trig').script, 'golem_intro'); assert.ok(db.scenes.golem_intro);
  assert.equal(ev(M.x1_culvert, 'millstone_golem').ifNot, 'millstone_golem_defeated');
  assert.ok(db.ENCOUNTERS.millstone_golem && db.ENCOUNTERS.millstone_golem.flag === 'millstone_golem_defeated');
  assert.ok(ev(M.x1_millrace, 'x1_mill_wheel_turning').if === 'mill_turning');
  assert.equal(M.x1_culvert.events.find((e) => e.type === 'trigger' && e.on === 'enter').script, 'culvert_entry');
  assert.equal(M.x1_millrace.events.find((e) => e.type === 'trigger' && e.on === 'enter').script, 'millrace_arrival');
});

// ------------------------------------------------------------------------------------------------ links and landings
test('return doors land in front of their doors, both ways', () => {
  const mr = M.x1_millrace, mill = M.x1_mill, cv = M.x1_culvert;
  const dm = ev(mr, 'door_mill');
  assert.deepEqual(dm.to.slice(0, 3), ['x1_mill', ...cell(ev(mill, 'mill_exit'))]);       // lands on the gap cell, facing up
  const me = ev(mill, 'mill_exit');
  assert.deepEqual(me.to, ['x1_millrace', dm.x, dm.y + 1, 'down']);                        // the cell in front of the mill door
  assert.deepEqual(M.x1_mill.start, { x: me.x, y: me.y - 1, dir: 'up' });
  const cd = ev(mr, 'culvert_door'), ce = ev(cv, 'culvert_exit');
  assert.deepEqual(cd.to, ['x1_culvert', ...cv.marks.entrance, 'down']);
  assert.deepEqual(ce.to, ['x1_millrace', cd.x, cd.y + 1, 'down']);
  assert.deepEqual(cv.marks.entrance, [ce.x, ce.y + 1]);
  assert.deepEqual(mr.marks.culvert, [cd.x, cd.y + 1]);
  assert.deepEqual(mr.marks.mill_door, [dm.x, dm.y + 1]);
  // the arch decor puts its doorAt on the door event
  const arch = mr.decor.find((d) => d.t === 'x1_culvert_arch');
  assert.deepEqual([arch.x + 1, arch.y], cell(cd));
  const bld = mr.decor.find((d) => d.t === 'x1_mill_building');
  assert.deepEqual([bld.x + 3, bld.y], cell(dm));
  assert.deepEqual([bld.x + 7, bld.y], cell(wheelOf(mr)));                                // the wheel hangs at the prefab's wheelAt
});
function wheelOf(m) { return ev(m, 'x1_mill_wheel'); }

test('exits and arrivals: the plan 3.2 table (valley, Downs, Larchhill, the hay chute)', () => {
  const ex = M.x1_millrace.exits;
  const to = (t) => ex.find((x) => x.to[0] === t);
  assert.deepEqual([to('valley').x, to('valley').y, to('valley').w], [22, 0, 3]); assert.deepEqual(to('valley').to, ['valley', 23, 38, 'up']);
  assert.deepEqual(to('x1_downs').to, ['x1_downs', 40, 32, 'up']); assert.equal(to('x1_downs').y, 0); assert.ok(to('x1_downs').x >= 3 && to('x1_downs').x + to('x1_downs').w - 1 <= 5);
  assert.deepEqual(to('x1_larchhill').to, ['x1_larchhill', 66, 18, 'left']); assert.equal(to('x1_larchhill').x, 0); assert.deepEqual([to('x1_larchhill').y, to('x1_larchhill').h], [12, 2]);
  // the arrivals of the other maps' links (valley (23,1), the Drovers' Road (4,1), Larchhill (1,12), the jetty (12,20)) are walkable, off the exit
  // cells, and the hay chute lands on the jetty's deck
  const g = buildGrid(M.x1_millrace, db);
  for (const [x, y] of [[23, 1], [4, 1], [1, 12], [12, 20]]) assert.equal(g.code[y][x], 'none', `arrival ${x},${y}`);
  const exitCells = new Set(); for (const x of ex) for (let j = 0; j < x.h; j++) for (let i = 0; i < x.w; i++) exitCells.add(key(x.x + i, x.y + j));
  for (const [x, y] of [[23, 1], [4, 1], [1, 12]]) assert.ok(!exitCells.has(key(x, y)), `arrival ${x},${y} is not an exit cell`);
  assert.deepEqual(M.x1_millrace.marks.valley_gate, [23, 1]); assert.deepEqual(M.x1_millrace.marks.drovers_gate, [4, 1]); assert.deepEqual(M.x1_millrace.marks.jetty, [12, 20]);
  // the jetty is a deck over water: its far end is deck, the cells beside it are water
  const deck = M.x1_millrace.overlays.filter((o) => /^bridge_wood_v_/.test(o.t));
  assert.ok(deck.some((o) => o.y === 20 && o.x === 12) && deck.some((o) => o.y === 25));
  assert.equal(db.tiles.terrains[M.x1_millrace.legend[M.x1_millrace.ground[24][10]]].collision, 'water');
  // the ground in front of every exit is walkable too
  for (const [x, y] of [[23, 0], [4, 0], [0, 12]]) assert.ok(exitCells.has(key(x, y)));
  // the valley and the hub's target cells exist (valley (23,38) is walkable today)
  const vg = buildGrid(maps.valley, db);
  assert.equal(vg.code[38][23], 'none');
});

// ------------------------------------------------------------------------------------------------ placement rules (plan 3.6)
test('field foes: no group within 6 tiles of an NPC or a door arrival cell, 3+ tiles off every lane, one route foe-free', () => {
  const mr = M.x1_millrace;
  const foes = mr.events.filter((e) => e.type === 'enemy');
  assert.ok(foes.every((e) => e.move !== 'chase'), 'no chase foe on this map (they would need 6 tiles from every lane)');
  const npcs = mr.events.filter((e) => e.type === 'npc').map(cell);
  const arrivals = [[23, 1], [4, 1], [1, 12], [12, 20], mr.marks.mill_door, mr.marks.culvert, ...mr.exits.map((x) => [x.x, x.y])];
  for (const f of foes) for (const c of foeCells(f)) {
    for (const n of npcs) assert.ok(man(c, n) >= 6, `${f.id} ${c} within 6 of NPC ${n}`);
    for (const a of arrivals) assert.ok(man(c, a) >= 6, `${f.id} ${c} within 6 of arrival ${a}`);
  }
  // lanes: entrance -> hamlet, mill, landing, culvert (shortest walkable paths)
  const M2 = mr.marks;
  const lanes = [['valley_gate', 'mill_door'], ['drovers_gate', 'mill_door'], ['larch_gate', 'mill_door'], ['valley_gate', 'ferrick'], ['larch_gate', 'ferrick'],
    ['mill_door', 'culvert'], ['jetty', 'mill_door'], ['jetty', 'ferrick'], ['mill_door', 'pin_socket']];
  for (const [a, b] of lanes) {
    const from = M2[a], to = a === 'larch_gate' || b !== 'ferrick' ? M2[b] : [M2.ferrick[0], M2.ferrick[1] - 1];
    const p = pathBetween(mr, from, b === 'ferrick' ? [M2.ferrick[0] + 1, M2.ferrick[1]] : to);
    assert.ok(p, `lane ${a} -> ${b} exists`);
    for (const f of foes) for (const c of foeCells(f)) for (const q of p) assert.ok(man(c, q) >= 3, `${f.id} at ${c} is within 3 of lane ${a} -> ${b} at ${q}`);
  }
  // the culvert and the cracked wall are reached without crossing a group's ground only for the arch; the crack sits 6+ from the wolves' end
  for (const f of foes) assert.ok(f.respawn === undefined);
  assert.ok(man([40, 28], mr.marks.culvert) >= 8, 'the wolves end 8 tiles from the arch');
});

test('the Millrace safe zones: the yard and the mill door stay clear of every group by 6 tiles', () => {
  const mr = M.x1_millrace;
  for (const f of mr.events.filter((e) => e.type === 'enemy')) for (const c of foeCells(f)) {
    assert.ok(man(c, mr.marks.ferrick) >= 6); assert.ok(man(c, mr.marks.mill_door) >= 6); assert.ok(man(c, mr.marks.pin_socket) >= 6);
  }
});

// ------------------------------------------------------------------------------------------------ reach by ability
/** The map as a save with no Dash and no Shove sees it: a crack is solid wall and the heavy block is solid scenery. */
function withoutAbilities(m, { dash = false, shove = false } = {}) {
  return { ...m, events: m.events.map((e) => {
    if (e.type === 'object' && e.breakable && !dash) { const { breakable, behind, ...rest } = e; return { ...rest, solid: true, w: 1, h: 2 }; }
    if (e.type === 'block' && e.heavy && !shove) return { ...e, type: 'object', sprite: e.sprite || 'push_block', text: 'cliff_crack' };
    return e;
  }) };
}
/** mapcheck's walk does not hide a `behind` chest: a chest behind a crack or a heavy block that stays shut counts as not reached. */
function logicalUnreached(map, w, { dash, shove }) {   // `map` is the ORIGINAL module (the walk ran on a stripped copy)
  const out = new Set(w.unreached);
  for (const e of map.events) {
    if (e.type !== 'chest' || !e.behind) continue;
    const t = map.events.find((x) => x.id === e.behind);
    if (t && t.breakable && !dash) out.add(e.id);
  }
  if (!shove) for (const e of map.events) if (e.type === 'chest' && e.id.startsWith('chest_mr_stone')) out.add(e.id);
  return [...out].sort();
}
test('x1_millrace: everything is reachable with the abilities; without them only the Dash and Shove chests are not', () => {
  const full = walk(M.x1_millrace, db, { flags: FLAGS });
  assert.deepEqual(full.unreached, []);
  const run = (o) => { const m = withoutAbilities(M.x1_millrace, o); return logicalUnreached(M.x1_millrace, walk(m, db, { flags: FLAGS }), o); };
  assert.deepEqual(run({}), ['chest_mr_bank', 'chest_mr_stone', 'chest_mr_stone_b']);
  assert.deepEqual(run({ dash: true }), ['chest_mr_stone', 'chest_mr_stone_b']);
  assert.deepEqual(run({ shove: true }), ['chest_mr_bank']);
  assert.deepEqual(run({ dash: true, shove: true }), []);
  // the other chest (the orchard's) and everything else needs no ability
  const bare = walk(withoutAbilities(M.x1_millrace), db, { flags: FLAGS });
  assert.ok(!bare.unreached.includes('chest_mr_orchard') && !bare.unreached.includes('ferrick') && !bare.unreached.includes('culvert_door'));
  // before the Archivore the mill door is a barred sign; after, a door
  const before = walk(M.x1_millrace, db, { flags: FLAGS });
  assert.ok(!before.events.some((e) => e.id === 'door_mill'));
  const after = walk(M.x1_millrace, db, { flags: [...FLAGS, 'archivore_defeated'] });
  assert.ok(after.events.some((e) => e.id === 'door_mill' && e.reached));
  // the Millrace road is shut before archive_f1_done only on the valley's side (the hub's oak and door), so the map itself is open with the first-fight flag alone
  assert.deepEqual(walk(M.x1_millrace, db, { flags: ['first_fight_done'] }).unreached, []);
});
test('x1_millrace: the stone cellar opens only when the millstone is shoved off its mouth (a block stands on the only cell)', () => {
  const mr = M.x1_millrace;
  const blk = ev(mr, 'block_stone');
  assert.equal(blk.heavy, true);
  const g = buildGrid({ ...mr, events: mr.events.filter((e) => e.id !== 'block_stone' && e.id !== 'chest_mr_stone' && e.id !== 'chest_mr_stone_b') }, db);
  // with the block gone, the stone cells and the mouth: the T's inside is reachable only through (31,15)
  const [bx, by] = cell(blk);
  const inside = [[bx, by + 1], [bx, by + 2], [bx - 1, by + 2], [bx + 1, by + 2]];
  for (const [x, y] of inside) assert.equal(g.code[y][x], 'none', `cellar cell ${x},${y}`);
  const seen = new Set([key(bx, by + 1)]); const q = [[bx, by + 1]];
  for (let i = 0; i < q.length; i++) for (const [dx, dy] of Object.values(DIRV)) {
    const [nx, ny] = [q[i][0] + dx, q[i][1] + dy];
    if (seen.has(key(nx, ny)) || g.code[ny][nx] !== 'none' || (nx === bx && ny === by)) continue;
    seen.add(key(nx, ny)); q.push([nx, ny]);
  }
  assert.equal(seen.size, inside.length, 'the cellar is sealed except through the block cell');
  // open floor on both sides of the block, so it can be shoved either way and never traps
  assert.equal(g.code[by][bx - 1], 'none'); assert.equal(g.code[by][bx + 1], 'none');
  assert.equal(g.code[by][bx - 2], 'none'); assert.equal(g.code[by][bx + 2], 'none');
  // and the block never stands on a lane the party must use: the mill door is reachable around it both ways
  assert.ok(pathBetween({ ...mr, events: mr.events.filter((e) => e.id !== 'block_stone') }, mr.marks.mill_door, mr.marks.pin_socket));
});

// the Drain Hall as a Sokoban: states (light block, heavy block, party), pushes only onto free cells, never onto a door or a gate cell
function hall() {
  const cv = M.x1_culvert;
  const g = buildGrid({ ...cv, events: cv.events.filter((e) => e.type !== 'block') }, db);
  const doors = new Set(cv.events.filter((e) => e.type === 'door' || e.type === 'gate').flatMap((e) => eventCells(e).map(([x, y]) => key(x, y))));
  const cells = []; const idx = new Map();
  // the party's floor: the hall and the mouth, flooded from the entrance (the gate is solid and the stair is a door cell)
  const [sx, sy] = [cv.marks.entrance[0], cv.marks.entrance[1] + 1];   // the cell below the arrival (the stair foot cells are doors)
  const q = [[sx, sy]]; idx.set(key(sx, sy), 0); cells.push([sx, sy]);
  for (let i = 0; i < q.length; i++) for (const [dx, dy] of Object.values(DIRV)) {
    const [nx, ny] = [q[i][0] + dx, q[i][1] + dy];
    if (idx.has(key(nx, ny)) || g.code[ny][nx] !== 'none' || doors.has(key(nx, ny))) continue;
    idx.set(key(nx, ny), cells.length); cells.push([nx, ny]); q.push([nx, ny]);
  }
  const N = cells.length;
  const nb = cells.map(([x, y]) => Object.values(DIRV).map(([dx, dy]) => (idx.has(key(x + dx, y + dy)) ? idx.get(key(x + dx, y + dy)) : -1)));
  const b1 = ev(cv, 'block_b1'), b2 = ev(cv, 'block_b2'), p1 = ev(cv, 'plate_b1'), p2 = ev(cv, 'plate_b2');
  const exitNb = new Set(); for (const [x, y] of eventCells(ev(cv, 'culvert_exit'))) for (const [dx, dy] of Object.values(DIRV)) if (idx.has(key(x + dx, y + dy))) exitNb.add(idx.get(key(x + dx, y + dy)));
  return { N, cells, idx, nb, exitNb, start: [idx.get(key(b1.x, b1.y)), idx.get(key(b2.x, b2.y)), 0], goal: [idx.get(key(p1.x, p1.y)), idx.get(key(p2.x, p2.y))], dirs: Object.keys(DIRV) };
}
/** BFS over (light, heavy, party). Returns { solved, steps, states, pushes (the solution), reach(state)->bool } */
function solve(h, { shove, until = null }) {
  const { N, nb } = h;
  const enc = (a, b, p) => (a * N + b) * N + p;
  const seen = new Int32Array(N * N * N).fill(-2);
  const q = [enc(...h.start)]; seen[q[0]] = -1;
  let goalState = -1;
  for (let i = 0; i < q.length; i++) {
    const s = q[i]; const p = s % N, b = Math.floor(s / N) % N, a = Math.floor(s / (N * N));
    if (a === h.goal[0] && b === h.goal[1] && goalState < 0) goalState = s;
    if (until && until(a, b, p)) return { hit: true };
    for (let d = 0; d < 4; d++) {
      const n = nb[p][d]; if (n < 0) continue;
      let na = a, nbk = b;
      if (n === a || n === b) {
        const t = nb[n][d]; if (t < 0 || t === a || t === b) continue;            // a block needs a free floor cell behind it
        if (n === a) na = t; else { if (!shove) continue; nbk = t; }
      }
      const e = enc(na, nbk, n);
      if (seen[e] === -2) { seen[e] = s; q.push(e); }
    }
  }
  const path = [];
  if (goalState >= 0) for (let s = goalState; s !== -1; s = seen[s]) path.push(s);
  path.reverse();
  return { solved: goalState >= 0, states: q.length, seen, q, path, enc };
}
test('x1_culvert: the Drain Hall solves with Shove, cannot without it, and no reachable state strands the party', () => {
  const h = hall();
  const withShove = solve(h, { shove: true });
  assert.ok(withShove.solved, 'both plates can be covered');
  assert.ok(withShove.path.length - 1 < 120, `the solution is short (${withShove.path.length - 1} moves)`);
  const noShove = solve(h, { shove: false });
  assert.ok(!noShove.solved, 'the heavy block needs Shove');
  // no softlock: from every reachable state the party's own floor (walking only) still reaches the entrance (leaving resets the blocks)
  const { N, nb } = h;
  let worst = 0;
  const stamp = new Int32Array(N); let tick = 0;
  for (const s of withShove.q) {
    const p = s % N, b = Math.floor(s / N) % N, a = Math.floor(s / (N * N));
    tick++; const st = [p]; stamp[p] = tick; let ok = h.exitNb.has(p);
    for (let i = 0; i < st.length && !ok; i++) for (let d = 0; d < 4; d++) {
      const n = nb[st[i]][d]; if (n < 0 || n === a || n === b || stamp[n] === tick) continue;
      stamp[n] = tick; st.push(n); if (h.exitNb.has(n)) { ok = true; break; }
    }
    if (!ok) {
      // a block parked on the stair's front cell: the party must be able to push it on (a full search from this state)
      const from = h.start; h.start = [a, b, p];
      const again = solve(h, { shove: true, until: (A, B, P) => h.exitNb.has(P) });
      h.start = from;
      assert.ok(again.hit, `state light ${h.cells[a]} heavy ${h.cells[b]} party ${h.cells[p]} cannot reach the entrance`);
    }
    worst = Math.max(worst, st.length);
  }
  assert.ok(worst > 0);
  // the gate's front cells and the crack's front cell are never sealed: a block could stand there, but the party can always shove or push it on
  // (checked by the flood above); and the heavy block can be moved back out of every cell it can be shoved to
  const back = solve({ ...h, start: [h.start[0], h.start[1], h.start[2]] }, { shove: true });
  assert.ok(back.states > 1000);
});
test('x1_culvert: the gate opens only with both plates (the walk model)', () => {
  const cv = M.x1_culvert;
  const both = walk(cv, db, { flags: FLAGS });
  assert.ok(both.opened.includes('gate_drain'));
  assert.deepEqual(both.unreached, []);
  // with no block on the map the plates cannot go down: the gate stays shut and everything behind it is out of reach
  {
    const w = walk({ ...cv, events: cv.events.filter((e) => e.type !== 'block') }, db, { flags: FLAGS });
    assert.ok(!w.opened.includes('gate_drain'));
    for (const id of ['chest_cv_pin', 'culvert_font', 'golem_trig', 'millstone_golem', 'chest_cv_golem']) assert.ok(w.unreached.includes(id), `${id} is behind the gate`);
    assert.ok(!w.unreached.includes('chest_cv_drain') && !w.unreached.includes('e_cv_blots'), 'the hall itself stays open');
  }
  // the AND: two plates, both aimed at the gate, and the solver below needs both covered
  assert.equal(cv.events.filter((e) => e.type === 'plate' && e.target === 'gate_drain').length, 2);
  const gate = ev(cv, 'gate_drain');
  assert.deepEqual(gate.to.slice(0, 3), ['x1_culvert', ...cell(ev(cv, 'notch_pump'))]);
  assert.deepEqual(ev(cv, 'notch_pump').to, ['x1_culvert', gate.x, gate.y + 1, 'down']);
  const sources = cv.events.filter((e) => e.type === 'plate').map((e) => e.target);
  assert.deepEqual(sources, ['gate_drain', 'gate_drain']);
  assert.equal(gate.sprite, 'x1_gate_culvert'); assert.ok(db.tiles.objects.x1_gate_culvert_closed && db.tiles.objects.x1_gate_culvert_open);
});
test('x1_culvert: the Dash crack hides the iron chest, the Golem trigger is the only way into the Sluice Chamber, the font comes first', () => {
  const cv = M.x1_culvert;
  const noDash = withoutAbilities(cv, { dash: false, shove: true });
  assert.deepEqual(logicalUnreached(cv, walk(noDash, db, { flags: FLAGS }), { dash: false, shove: true }), ['chest_cv_drain']);
  const crack = ev(cv, 'x1_crack_drain'), chest = ev(cv, 'chest_cv_drain');
  assert.equal(chest.behind, 'x1_crack_drain'); assert.equal(crack.breakable, 'rock'); assert.deepEqual(cell(chest), [crack.x, crack.y + 1]);
  // flood from the entrance with the trigger column blocked: the font and the pin are reachable, the Golem's chamber is not
  const t = ev(cv, 'golem_trig');
  const g = buildGrid({ ...cv, events: cv.events.filter((e) => e.type !== 'block' && e.type !== 'plate' && e.type !== 'enemy' && e.type !== 'actor') }, db);
  const blocked = new Set(eventCells(t).map(([x, y]) => key(x, y)));
  const gateCells = new Set(eventCells(ev(cv, 'gate_drain')).map(([x, y]) => key(x, y)));
  const seen = new Set([key(...cv.marks.entrance)]); const q = [cv.marks.entrance];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    const outs = Object.values(DIRV).map(([dx, dy]) => [x + dx, y + dy]);
    if (gateCells.has(key(x, y))) outs.push(cell(ev(cv, 'notch_pump')));
    if (key(x, y) === key(...cell(ev(cv, 'notch_pump')))) outs.push([x, y + 1]);
    for (const [nx, ny] of outs) {
      if (seen.has(key(nx, ny)) || blocked.has(key(nx, ny))) continue;
      const open = g.code[ny] && g.code[ny][nx] === 'none' || gateCells.has(key(nx, ny));
      if (!open) continue;
      seen.add(key(nx, ny)); q.push([nx, ny]);
    }
  }
  assert.ok(seen.has(key(...cv.marks.pin_chest)), 'the pin chest is reached before the trigger');
  assert.ok(seen.has(key(...cv.marks.hearth)), 'the font is reached before the trigger');
  assert.ok(!seen.has(key(...cv.marks.golem_spot)) && !seen.has(key(...cv.marks.golem_chest)), 'the chamber lies behind the trigger');
  // the trigger covers every floor cell of the chamber's west column that borders the landing (rows 4..9), so no step into the room skips it
  const sg = buildGrid({ ...cv, events: [] }, db);
  const col = []; for (let y = 0; y < sg.H; y++) if (sg.code[y][t.x] === 'none' && y >= 4 && y <= 9) col.push(y);
  for (const y of col) assert.ok(blocked.has(key(t.x, y)), `trigger covers ${t.x},${y}`);
  // the font sits in the way from the pump room to the trigger, so a lost fight retries at the font
  const fnt = ev(cv, 'culvert_font'); assert.equal(fnt.safe, true); assert.ok(fnt.x < t.x);
});
test('x1_mill: the interior walks, the ledger and the table are reachable, and the door lands in front of the mill door', () => {
  const w = walk(M.x1_mill, db, { flags: [...FLAGS, 'mill_done'] });
  assert.deepEqual(w.unreached, []);
  const w2 = walk(M.x1_mill, db, { flags: FLAGS });
  assert.ok(!w2.events.some((e) => e.id === 'x1_sill_rolls'), 'the sill is bare before mill_done');
});

// ------------------------------------------------------------------------------------------------ art and docs
test('the previews exist and no file of mine holds an em dash', () => {
  for (const f of ['x1_millrace.png', 'x1_mill.png', 'x1_culvert.png', 'x1_culvert_solved.png']) assert.ok(fs.existsSync(path.join(NEXT, 'tools/maps/previews', f)), f);
  assert.ok(fs.existsSync(path.join(NEXT, 'docs/maps/X1_SOUTH.md')));
  for (const f of ['src/data/maps/x1_millrace.js', 'src/data/maps/x1_mill.js', 'src/data/maps/x1_culvert.js', 'qa/maps/x1_south.test.mjs', 'docs/maps/X1_SOUTH.md']) {
    assert.ok(!fs.readFileSync(path.join(NEXT, f), 'utf8').includes(String.fromCharCode(0x2014)), `${f} has an em dash`);
  }
});
