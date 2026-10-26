// X1-world small checks (brief item 5): (a) a `pit` area event whose `to` is another map, (b) a door with `if` and a solid
// object with `ifNot`, (c) the cost of ambientFx 'motes' on a big field map. The gates the new maps depend on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pitDropAt, present } from '../../src/world/events.js';
import { Particles } from '../../src/world/particles.js';
import { createRng } from '../../src/core/rng.js';
import { loadDb, loadAll, walk, validate, NEXT } from '../../tools/maps/mapcheck.mjs';
import { makeField, FIXTURE } from './x1_fixture.mjs';

const FIELD_JS = fs.readFileSync(path.join(NEXT, 'src', 'scenes', 'field.js'), 'utf8');
/** The source of one method of FieldScene (from its name to the next method at the same indent). */
function method(name) {
  const i = FIELD_JS.search(new RegExp(`^  (async )?${name}\\(`, 'm'));
  assert.ok(i >= 0, `${name} exists`);
  const rest = FIELD_JS.slice(i + 1);
  const j = rest.search(/\n  (async )?[a-zA-Z_]+\([^)]*\) \{/);
  return rest.slice(0, j < 0 ? rest.length : j);
}

// ------------------------------------------------------------------------------------------------ 5a: the pit
test('5a: a pit area event whose `to` is another map hands that target to the fall; an `if` on it is respected', () => {
  const f = makeField();
  assert.equal(f.entities.get('x1_pit_hole').present, false, 'its flag is off');
  assert.deepEqual(pitDropAt(f, 14, 1), FIXTURE.pitTo, 'flag off: the map\'s own pitTo, never the other map');
  f.setFlag('x1fx_pit_on');
  assert.equal(f.entities.get('x1_pit_hole').present, true);
  assert.deepEqual(pitDropAt(f, 14, 1), ['_x1fx_other', 5, 6, 'left'], 'flag on: the other map, landing facing left');
  assert.deepEqual(pitDropAt(f, 15, 2), ['_x1fx_other', 5, 6, 'left'], 'every cell of the area');
  assert.deepEqual(pitDropAt(f, 16, 1), FIXTURE.pitTo, 'outside the area');
  f.setFlag('x1fx_pit_on', false);
  assert.deepEqual(pitDropAt(f, 14, 1), FIXTURE.pitTo, 'and it goes away again');
});

test('5a: the fall is a plain warp (kind pit, the given facing) with no damage anywhere on its path', () => {
  const fall = method('fallInPit');
  assert.match(fall, /warpTo\(t\[0\], t\[1\], t\[2\], t\[3\] \|\| 'down', 'pit'\)/, 'cross-map targets go through warpTo like a door');
  const warp = method('warpTo');
  for (const [name, src] of [['fallInPit', fall], ['warpTo', warp]]) {
    assert.ok(!/\bhp\b|damage|hurt|wound|knock/i.test(src), `${name} does not touch party HP`);
  }
  assert.match(warp, /fall/, 'the fall sound');
});

test('5a: mapcheck validates a cross-map pit target like a door (walkable arrival on an existing map)', async () => {
  const db = await loadDb();
  const maps = await loadAll();
  const mk = (to) => ({ ...FIXTURE, id: '_x1pit', events: [{ id: 'pit', type: 'pit', x: 14, y: 1, w: 2, h: 2, to }], exits: [], marks: { start: [3, 5] }, pitTo: undefined });
  assert.deepEqual(validate(mk(['valley', 36, 8, 'down']), db, maps, { links: [] }).errors.filter((e) => /pit/.test(e)), []);
  assert.ok(validate(mk(['valley', 0, 0, 'down']), db, maps, { links: [] }).errors.some((e) => /pit pit: target valley 0,0/.test(e)));
});

// ------------------------------------------------------------------------------------------------ 5b: gates
test('5b: a door with `if` does not exist while its flag is off, appears when it is set, and goes away when it is cleared', () => {
  const f = makeField();
  const door = f.entities.get('x1_gate_door');
  assert.equal(present(f, door.ev), false);
  assert.equal(door.present, false, 'hidden: the field fires only entities that are present');
  f.setFlag('x1fx_open');
  assert.equal(door.present, true);
  f.setFlag('x1fx_open', false);
  assert.equal(door.present, false);
  // the field only ever fires a door that is present (onLeaderArrived)
  const arrived = method('onLeaderArrived');
  assert.match(arrived, /for \(const ent of EV\.entitiesAt\(this, L\.tx, L\.ty\)\) \{\s*if \(!ent\.present\) continue;/, 'the arrival loop skips absent entities');
});

test('5b: a solid object with `ifNot` blocks until its flag is set, and stops blocking at once', () => {
  const f = makeField();
  const oak = f.entities.get('x1_oak');
  assert.equal(oak.present, true);
  assert.equal(f.map.blockedAt(12, 8), true, 'the oak blocks its cell');
  f.setFlag('x1fx_open');
  assert.equal(oak.present, false);
  assert.equal(f.map.blockedAt(12, 8), false, 'the cell is free the moment the flag is set');
  f.setFlag('x1fx_open', false);
  assert.equal(f.map.blockedAt(12, 8), true, 'and shut again if the flag is cleared');
});

test('5b: a map-level `exits` entry takes no flags (the field fires it always): the gate is a door event', () => {
  const fire = method('onLeaderArrived');
  const exits = fire.slice(fire.indexOf('this.map.mod.exits'));
  assert.ok(!/\bex\.(if|ifNot)\b/.test(exits.slice(0, 400)), 'the field does not read ex.if (mapcheck reports an exits entry with if as an error)');
});

test('5b: mapcheck, walking with a flag set, drops the ifNot object and the way east opens', async () => {
  const db = await loadDb();
  const mod = {
    id: '_x1gate', name: 'gate', area: 'field', music: 'valley', under: 'grass', legend: { '.': 'grass', '#': 'cliff_top' },
    // a one-tile corridor, row 1: the oak stands in it
    ground: ['#'.repeat(12), '#' + '.'.repeat(10) + '#', '#'.repeat(12)],
    overlays: [], decor: [], marks: { start: [1, 1] }, start: { x: 1, y: 1, dir: 'right' },
    events: [
      { id: 'oak', type: 'object', x: 6, y: 1, sprite: 'signboard', ifNot: 'x1fx_open', text: 'x1fx_patch_text' },
      { id: 'far_chest', type: 'chest', x: 9, y: 1, tier: 'wood', item: 'potion' },
    ],
  };
  const shut = walk(mod, db);
  assert.equal(shut.events.find((e) => e.id === 'far_chest').reached, false, 'default walk: every event present, the oak blocks');
  const open = walk(mod, db, { flags: ['x1fx_open'] });
  assert.equal(open.events.find((e) => e.id === 'far_chest').reached, true, 'with the flag the oak is gone');
});

// ------------------------------------------------------------------------------------------------ 5c: motes
test('5c: ambient motes cost the same on a 72 x 36 field as anywhere: capped at 26, view-relative, well under 0.3 ms a frame', () => {
  const rng = createRng(7);
  let rects = 0;
  const g = new Proxy({}, { get: (t, k) => (k === 'fillRect' ? () => { rects++; } : t[k]), set: (t, k, v) => { t[k] = v; return true; } });
  const field = { engine: {}, rng, leader: { feetX: 100, feetY: 100 }, map: { inBounds: () => true, terrainAt: () => 'grass', blockedAt: () => false, W: 72, H: 36 } };
  const fx = new Particles(field);
  fx.setAmbient(['motes']);
  const cam = { x: 700, y: 300, W: 384, H: 216, visible: () => true };
  const r = { ctx: g, W: 384, H: 216 };
  for (let i = 0; i < 600; i++) { fx.update(cam); }            // warm up past one full mote life
  assert.ok(fx.count('mote') <= 26, 'capped');
  assert.ok(fx.count('mote') >= 10, 'and it does fill the view');
  for (const p of fx.list) assert.ok(p.x >= cam.x - 20 && p.x <= cam.x + cam.W + 20 && p.y >= cam.y - 20 && p.y <= cam.y + cam.H + 20, 'spawned in view');
  const N = 3000;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) { fx.update(cam); fx.draw(r, cam, 'above'); }
  const per = (performance.now() - t0) / N;
  rects = 0; fx.draw(r, cam, 'above');
  assert.ok(rects <= 26 * 2, `at most about 52 one-pixel fills a frame (saw ${rects})`);
  assert.ok(per < 0.3, `update + draw (${per.toFixed(4)} ms) under the 0.3 ms budget, in node with a stub canvas`);
  // the cost has no map-size term: the same code on a small map spawns and draws exactly the same way
  field.map = { ...field.map, W: 20, H: 20 };
  const fy = new Particles(field);
  fy.setAmbient(['motes']);
  for (let i = 0; i < 600; i++) fy.update(cam);
  assert.equal(fy.count('mote') <= 26, true);
});
