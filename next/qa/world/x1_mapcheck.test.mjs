// X1-world: the mapcheck side of the shared contracts. An `appraise` object is an unlocker like a breakable (a fixture map
// proves it, both walks), `behind: 'appraise:<id>'` is validated, and the pending-link allowlist (tools/maps/x1_links.json)
// turns a missing target map into a warning only when it is listed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadDb, loadAll, walk, validate, appraiseReach, loadPendingLinks, NEXT } from '../../tools/maps/mapcheck.mjs';
import { APPRAISE_RANGE } from '../../src/world/abilities.js';
import './x1_fixture.mjs';       // registers the fixture's lines (x1fx_*) into the shared LINES that mapcheck reads

const db = await loadDb();
const maps = await loadAll();

// A 22 x 9 field: the party starts in the west pocket; a cliff wall (x = 8) divides it completely.
function fx(events, extra = {}) {
  const row = (s) => s.padEnd(22, '.');
  return {
    id: '_x1mc', name: 'X1 mapcheck fixture', area: 'field', music: 'valley', under: 'grass',
    start: { x: 1, y: 2, dir: 'right' },
    legend: { '.': 'grass', '#': 'cliff_top' },
    ground: [row(''), row(''), row(''), row(''), row(''), row(''), row(''), row(''), row('')]
      .map((r) => r.slice(0, 8) + '#' + r.slice(9)),
    overlays: [], decor: [], marks: { start: [1, 2] },
    events,
    ...extra,
  };
}
const chestBehind = (plate = 'plate') => ({ id: 'chest', type: 'chest', x: 3, y: 6, tier: 'iron', item: 'potion', behind: `appraise:${plate}` });
const reached = (r, id) => r.events.find((e) => e.id === id).reached;

test('APPRAISE_RANGE is the one constant: mapcheck reads it from abilities.js', () => {
  assert.equal(APPRAISE_RANGE, 5);
});

test('appraiseReach: range, the line, one tile off it, and walls (the same geometry as appraiseTarget)', () => {
  const open = () => 'none';
  const inb = (x, y) => x >= 0 && y >= 0 && x < 30 && y < 30;
  const obj = (x, y) => ({ type: 'object', x, y });
  const at = (cells) => new Set(cells.map(([x, y]) => `${x},${y}`));
  assert.ok(appraiseReach(at([[0, 0]]), obj(5, 0), open, inb), 'five tiles on the line');
  assert.equal(appraiseReach(at([[0, 0]]), obj(6, 0), open, inb), null, 'six is out');
  assert.ok(appraiseReach(at([[0, 0]]), obj(3, 1), open, inb), 'one tile off the line');
  assert.equal(appraiseReach(at([[0, 0]]), obj(1, 1), open, inb), null, 'beside the leader is not ahead');
  assert.equal(appraiseReach(at([[0, 0]]), obj(5, 2), open, inb), null, 'two tiles off the line');
  assert.ok(appraiseReach(at([[10, 10]]), obj(10, 5), open, inb), 'north');
  assert.equal(appraiseReach(at([[0, 0]]), obj(5, 0), (x) => (x === 2 ? 'solid' : 'none'), inb), null, 'a wall on the line');
  assert.ok(appraiseReach(at([[0, 0]]), obj(2, 0), (x) => (x === 2 ? 'solid' : 'none'), inb), 'the object itself may be the solid thing');
  assert.equal(appraiseReach(new Set(), obj(1, 0), open, inb), null, 'nobody can stand anywhere');
});

test('walk: an appraise object in range of a reachable cell unlocks what is behind it; behind a wall it does not', () => {
  const plate = (x, y) => ({ id: 'plate', type: 'object', x, y, sprite: 'signboard', appraise: true, appraiseText: 'x1fx_plate_appraise' });
  // in range: the party starts at (1, 2); the plate stands at (5, 2), the chest is hidden behind it
  let r = walk(fx([plate(5, 2), chestBehind()]), db);
  assert.deepEqual(r.appraised, ['plate']);
  assert.ok(r.log.includes('appraised plate'));
  assert.equal(reached(r, 'chest'), true, 'reachable once the plate is read');
  // behind the cliff wall at x = 8 (the party is in the west pocket, the wall is solid on every line)
  r = walk(fx([plate(11, 2), chestBehind()], { start: { x: 6, y: 2, dir: 'right' } }), db);
  assert.deepEqual(r.appraised, [], 'no line of sight through the wall');
  assert.equal(reached(r, 'chest'), false);
  // a plain breakable-style behind is unchanged: a chest next to the floor is reached with no unlocker involved
  r = walk(fx([{ id: 'c2', type: 'chest', x: 3, y: 6, tier: 'wood', item: 'potion' }]), db);
  assert.equal(reached(r, 'c2'), true);
  // the other cell of the same pocket: standing one tile off the line also reads it
  r = walk(fx([plate(5, 3), chestBehind()]), db);
  assert.deepEqual(r.appraised, ['plate'], 'one tile off the line from the start');
});

test('walk: reading the plate can follow another unlocker (the gap in the wall is a breakable roots wall)', () => {
  // the party can reach the roots at once; broken roots open the wall cell, the east side becomes reachable, and from
  // there the plate on the east side is in range. Without the roots, nothing east is reached.
  const wall = { id: 'roots', type: 'object', x: 8, y: 4, sprite: 'signboard', breakable: 'roots', opens: [[8, 4]] };
  const plate = { id: 'plate', type: 'object', x: 14, y: 4, sprite: 'signboard', appraise: true, appraiseText: 'x1fx_plate_appraise' };
  const chest = { id: 'chest', type: 'chest', x: 14, y: 6, tier: 'iron', item: 'potion', behind: 'appraise:plate' };
  const m = fx([wall, plate, chest], { start: { x: 1, y: 4, dir: 'right' } });
  const r = walk(m, db);
  assert.ok(r.log.includes('broke roots'));
  assert.deepEqual(r.appraised, ['plate']);
  assert.equal(reached(r, 'chest'), true);
  const noRoots = walk(fx([plate, chest], { start: { x: 1, y: 4, dir: 'right' } }), db);
  assert.equal(reached(noRoots, 'chest'), false);
});

test('walk (the beam walk of the Court maps): an appraise object unlocks there too', () => {
  const beam = { id: 'src', type: 'beam', x: 4, y: 0, dir: 'down', sprite: 'beam_window' };
  const mirror = { id: 'm1', type: 'mirror', x: 4, y: 6, state: 0, sprite: 'mirror_stand', fixed: true };
  const plate = { id: 'plate', type: 'object', x: 5, y: 2, sprite: 'signboard', appraise: true, appraiseText: 'x1fx_plate_appraise' };
  const r = walk(fx([beam, mirror, plate, chestBehind()]), db);
  assert.ok(r.beams, 'this map walks as a beam map');
  assert.deepEqual(r.appraised, ['plate']);
  assert.equal(reached(r, 'chest'), true);
  const hidden = walk(fx([beam, mirror, { ...plate, x: 11 }, chestBehind()], { start: { x: 6, y: 2, dir: 'right' } }), db);
  assert.deepEqual(hidden.appraised, []);
  assert.equal(reached(hidden, 'chest'), false);
});

test('validate: appraise objects need lines that exist; behind: appraise:<id> must name an appraise object on the map', () => {
  const plate = { id: 'plate', type: 'object', x: 5, y: 2, sprite: 'signboard', appraise: true, appraiseText: 'x1fx_plate_appraise' };
  let v = validate(fx([plate, chestBehind()]), db, maps);
  assert.deepEqual(v.errors.filter((e) => /plate|chest/.test(e)), [], 'a good pair validates');
  assert.ok(!v.warnings.some((w) => /neither script nor text/.test(w)), 'an appraise object needs no confirm text');
  v = validate(fx([{ ...plate, appraiseText: 'nope_no_such_lines' }, chestBehind()]), db, maps);
  assert.ok(v.errors.some((e) => /appraiseText nope_no_such_lines missing/.test(e)));
  v = validate(fx([{ ...plate, appraiseText: undefined }, chestBehind()]), db, maps);
  assert.ok(v.errors.some((e) => /needs appraiseText/.test(e)));
  v = validate(fx([plate, chestBehind('ghost')]), db, maps);
  assert.ok(v.errors.some((e) => /behind appraise:ghost is not an appraise object/.test(e)));
  const notAppraise = { ...plate, appraise: false, text: 'x1fx_patch_text' };
  v = validate(fx([notAppraise, chestBehind()]), db, maps);
  assert.ok(v.errors.some((e) => /behind appraise:plate is not an appraise object/.test(e)), 'a plain object is not a target');
});

// ------------------------------------------------------------------------------------------------ the allowlist
const door = (to) => ({ id: 'dr', type: 'door', x: 2, y: 2, to, kind: 'door' });

test('a missing target map is an error unless x1_links.json lists it for that source map, then a warning', () => {
  const m = fx([door(['x1_not_built_yet', 3, 3, 'down'])]);
  let v = validate(m, db, maps, { links: [] });
  assert.ok(v.errors.some((e) => /target map x1_not_built_yet not found/.test(e)));
  v = validate(m, db, maps, { links: [{ from: '_x1mc', to: 'x1_not_built_yet', cell: [2, 2] }] });
  assert.deepEqual(v.errors.filter((e) => /x1_not_built_yet/.test(e)), []);
  assert.ok(v.warnings.some((w) => /x1_not_built_yet is not built yet/.test(w)));
  v = validate(m, db, maps, { links: [{ from: 'some_other_map', to: 'x1_not_built_yet' }] });
  assert.ok(v.errors.some((e) => /not found/.test(e)), 'listed for another source: still an error');
  v = validate(m, db, maps, { links: [{ from: '_x1mc', to: 'x1_other_name' }] });
  assert.ok(v.errors.some((e) => /not found/.test(e)), 'a typo in the target is not hidden by an entry for another');
});

test('exits and pits to a pending map are warnings too; an entry whose target exists is ignored (the real checks still run)', () => {
  const links = [{ from: '_x1mc', to: 'x1_not_built_yet' }, { from: '_x1mc', to: 'valley' }];
  const m = fx([{ id: 'pit', type: 'pit', x: 10, y: 1, w: 2, h: 2, to: ['x1_not_built_yet', 1, 1, 'down'] }],
    { exits: [{ x: 21, y: 2, w: 1, h: 2, to: ['x1_not_built_yet', 1, 2, 'right'] }] });
  const v = validate(m, db, maps, { links });
  assert.deepEqual(v.errors.filter((e) => /not found/.test(e)), []);
  assert.equal(v.warnings.filter((w) => /not built yet/.test(w)).length, 2);
  // valley exists, so its entry is never consulted: a bad arrival cell is still an error
  const bad = fx([door(['valley', 0, 0, 'down'])]);
  const vb = validate(bad, db, maps, { links });
  assert.ok(vb.errors.some((e) => /target valley 0,0/.test(e)), 'existing targets keep their cell checks');
  const vg = validate(fx([door(['valley', 1, 28, 'right'])]), db, maps, { links });
  assert.deepEqual(vg.errors.filter((e) => /valley/.test(e)), []);
});

test('x1_links.json: well formed, seeded from plan 3.2, and consistent with the maps that exist', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(NEXT, 'tools', 'maps', 'x1_links.json'), 'utf8'));
  const links = loadPendingLinks();
  assert.ok(Array.isArray(raw.links) && links.length === raw.links.length);
  const seen = new Set();
  for (const l of links) {
    assert.match(l.from, /^x1_[a-z]+$/, `from ${l.from}`);
    assert.match(l.to, /^x1_[a-z]+$/, `to ${l.to}`);
    assert.ok(l.cell === null || (Array.isArray(l.cell) && l.cell.length === 2 && l.cell.every(Number.isInteger)), `${l.from} -> ${l.to} cell`);
    const k = `${l.from}>${l.to}>${JSON.stringify(l.cell)}`;
    assert.ok(!seen.has(k), `no duplicate ${k}`);
    seen.add(k);
  }
  // every x1 map named in plan 2.1 appears as a source and as a target somewhere in the list
  const ids = ['x1_downs', 'x1_loomhouse', 'x1_barrow', 'x1_terrace', 'x1_orrery', 'x1_cellar', 'x1_millrace', 'x1_mill', 'x1_culvert', 'x1_highmoor', 'x1_larchhill'];
  for (const id of ids) {
    assert.ok(links.some((l) => l.from === id), `${id} has a pending link out`);
    assert.ok(links.some((l) => l.to === id), `${id} is a pending target`);
  }
  // the plan 3.2 pairs, both directions
  const has = (a, b) => links.some((l) => l.from === a && l.to === b);
  for (const [a, b] of [['x1_downs', 'x1_highmoor'], ['x1_highmoor', 'x1_downs'], ['x1_highmoor', 'x1_terrace'], ['x1_terrace', 'x1_highmoor'],
    ['x1_downs', 'x1_millrace'], ['x1_millrace', 'x1_downs'], ['x1_downs', 'x1_larchhill'], ['x1_larchhill', 'x1_downs'],
    ['x1_larchhill', 'x1_millrace'], ['x1_millrace', 'x1_larchhill'], ['x1_terrace', 'x1_orrery'], ['x1_orrery', 'x1_cellar'],
    ['x1_millrace', 'x1_mill'], ['x1_millrace', 'x1_culvert'], ['x1_downs', 'x1_loomhouse'], ['x1_downs', 'x1_barrow']]) assert.ok(has(a, b), `${a} -> ${b}`);
});

test('the real maps: no listed link changes what the existing maps report (errors, warnings and walks stay as before)', () => {
  for (const id of Object.keys(maps)) {
    if (id.startsWith('x1_')) continue;
    const a = validate(maps[id], db, maps, { links: [] });
    const b = validate(maps[id], db, maps);
    assert.deepEqual(b.errors, a.errors, id);
    assert.deepEqual(b.warnings, a.warnings, id);
    assert.deepEqual(b.walk.unreached, a.walk.unreached, id);
  }
});

test('an exit with an if is an error: the field ignores flags on the map-level exits list (use a door event)', () => {
  const m = fx([], { exits: [{ x: 21, y: 2, w: 1, h: 2, to: ['valley', 1, 28, 'right'], if: 'x1fx_open' }] });
  const v = validate(m, db, maps);
  assert.ok(v.errors.some((e) => /exit at 21,2.*ignored|flags/.test(e)), v.errors.join(' | '));
});
