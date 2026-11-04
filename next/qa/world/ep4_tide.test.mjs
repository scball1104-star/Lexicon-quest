// Episode 4 tide locks (E4-world): the pure rule (src/data/ep4/field/tide.js) on the test map, then the real TileMap,
// events.js and the tide system (src/data/ep4/field) on a headless field (fake engine, no canvas): every level, floating
// and grounded pontoons, a wash that survives a reload, a latched floodgate, a 2-level basin, levels reset on re-entry,
// a wheel never flooding its own stand, the virtual tide flags, the boat door, timings; and the map tool's walk of the
// test map (tools/maps/ep4_check.mjs through mapcheck's one line).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import { buildEntities, refreshEntities, interactables, GATE_SPRITES, COUNTING_GATES, EXT } from '../../src/world/events.js';
import { Silverglass } from '../../src/world/silverglass.js';
import { TINTS, tintSpec } from '../../src/world/lighting.js';
import { mergeTileFragment } from '../../src/game/packs.js';
import { compile, classify, water, washes, gateOpen, nextLevel, tideFlag, bands, levelsOf } from '../../src/data/ep4/field/tide.js';
import { attach } from '../../src/data/ep4/field/events.js';
import { BAND_FRAMES } from '../../src/data/ep4/field/system.js';
import { TEST_TIDE } from '../../src/data/ep4/field/_testtide.js';
import * as world from '../../src/data/ep4/world.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
mergeTileFragment(TILES, JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'ep4_tiles.json'), 'utf8')));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const T = TEST_TIDE;
const I = (x, y) => y * T.ground[0].length + x;

function makeField(mod = T, game = null, settings = {}) {
  const sfx = [];
  const engine = {
    assets: { json: () => TILES, has: () => false, atlas: () => null, img: () => ({ width: 1, height: 1 }) },
    renderer: { createLayer: (w, h) => ({ w, h, ctx }), shake() {}, flash() {}, W: 384, H: 216 },
    audio: { sfx: (id) => sfx.push(id) },
    after: (n, fn) => fn(), waitFrames: async () => {}, settings, input: { pressed: () => false },
  };
  game = game || { flags: {}, counters: {}, opened: {}, items: {} };
  const f = { engine, game, sfx, entities: new Map(), byTile: new Map(), actors: [], barks: [], scenes: [], warps: [], sessionGone: new Set(), frame: 0 };
  engine.scene = f;
  f.name = 'field';
  f.hasFlag = (k) => !!game.flags[k];
  f.setFlag = (k, v = true) => { if (v === false) delete game.flags[k]; else game.flags[k] = v; refreshEntities(f); f.map.refreshGated(f.hasFlag); f.glass.markDirty(); };
  f.map = new TileMap(engine, mod, { hasFlag: f.hasFlag });
  f.mapId = mod.id;
  f.particles = { sparkle() {}, burst() {}, puff() {} };
  f.bark = (k) => { f.barks.push(k); };
  f.showBoxes = async () => {};
  f.runScene = (id) => { f.scenes.push(id); };
  f.actorAt = (x, y) => f.actors.find((a) => a.tx === x && a.ty === y) || null;
  f.addActor = (a) => f.actors.push(a);
  f.removeActor = (a) => { f.actors = f.actors.filter((b) => b !== a); };
  f.warnOnce = () => {};
  f.enemyGone = () => false;
  f.slideProp = (p, x, y) => { f.map.moveProp(p, x, y); return Promise.resolve(); };
  f.camera = { x: 0, y: 0, W: 384, H: 216, visible: () => true };
  f.leader = { tx: 16, ty: 15, dir: 'up', moving: false };
  f.cutscene = { running: null };
  f.inputLocked = 0;
  f.lockInput = () => { f.inputLocked++; };
  f.unlockInput = () => { f.inputLocked = Math.max(0, f.inputLocked - 1); };
  f.lighting = { dark: 0, draw() {} };
  f.collectLights = () => [];
  f.useDoor = () => 'door';
  f.warpTo = async (...a) => { f.warps.push(a); };
  f.debugState = () => ({ map: f.mapId });
  f.glass = new Silverglass(f);
  attach(f);
  buildEntities(f);
  f.glass.reset();
  return f;
}
const frames = (f, n) => { for (let i = 0; i < n; i++) { f.frame++; f.glass.update(); } };
const code = (f, x, y) => f.map.codeAt(x, y);
async function turn(f, id) {
  const p = f.tide.turn(f.entities.get(id));
  for (let i = 0; i < BAND_FRAMES + 8; i++) { await Promise.resolve(); frames(f, 1); }
  return p;
}
const give = (f, id) => { f.game.items[id] = 1; };

// ---------------------------------------------------------------- the pure rule
test('rule: the test map parses, three basins, every wheel, post, pontoon, seal and floodgate found', () => {
  const m = compile(T);
  assert.deepEqual(m.errors, []);
  assert.deepEqual(m.ids, ['a', 'b', 'c']);
  assert.equal(m.basins.c.levels, 2);
  assert.equal(m.wheels.length, 3); assert.equal(m.posts.length, 3); assert.equal(m.pontoons.length, 6);
  assert.equal(m.forgeries[0].wet, I(8, 4), 'a seal in a wall face reads the canal cell below it');
  assert.equal(m.floodgates[0].at, 2);
});

test('rule: every level of basin a: low all dry, mid the canal, high the walkway too; the stand never', () => {
  for (const [L, canal, walk] of [[0, false, false], [1, true, false], [2, true, true]]) {
    const w = water(T, { levels: { a: L } });
    assert.equal(w.has(I(5, 5)), canal, `canal at ${L}`);
    assert.equal(w.has(I(9, 9)), walk, `walkway at ${L}`);
    assert.equal(w.has(I(5, 12)) || w.has(I(5, 13)), false, 'the wheel stand');
    assert.equal(w.has(I(9, 7)), canal, 'the stair at height 0 floods with the canal');
  }
  assert.equal(nextLevel(0, 3), 1); assert.equal(nextLevel(2, 3), 0); assert.equal(nextLevel(1, 2), 0);
});

test('rule: pontoons ground at low (solid), float at mid and high (walkable), sink outside their rides', () => {
  const lo = classify(T, { levels: { b: 0 } }), mid = classify(T, { levels: { b: 1 } }), hi = classify(T, { levels: { b: 2 } });
  for (const y of [7, 8, 9, 10, 11]) {
    assert.ok(lo.grounded.has(I(24, y)) && lo.solid.has(I(24, y)), `grounded ${y}`);
    assert.ok(mid.floats.has(I(24, y)) && !mid.flooded.has(I(24, y)), `floats ${y}`);
    assert.ok(hi.floats.has(I(24, y)));
  }
  assert.ok(mid.flooded.has(I(23, 9)) && !mid.flooded.has(I(24, 6)), 'canal water, walkway dry at mid');
  assert.ok(hi.flooded.has(I(24, 6)), 'the walkway floods at high');
  // the punt rides [1] in the 2-level basin c: floats at mid, sits at low; a [1]-rider at a level it does not ride sinks
  assert.ok(classify(T, { levels: { c: 1 } }).floats.has(I(17, 18)));
  assert.ok(classify(T, { levels: { c: 0 } }).grounded.has(I(17, 18)));
  const sinker = { ...T, events: [...T.events.filter((e) => e.id !== 'pt_9'), { id: 'pt_9', type: 'pontoon', x: 24, y: 9, rides: [1] }] };
  assert.ok(classify(sinker, { levels: { b: 2 } }).sunk.has(I(24, 9)));
  assert.ok(classify(sinker, { levels: { b: 2 } }).flooded.has(I(24, 9)));
});

test('rule: a seal washes only above its mark, once, and stays washed', () => {
  assert.deepEqual(washes(T, { levels: { a: 1 } }), [], 'mid stands below the h 1 seal');
  assert.deepEqual(washes(T, { levels: { a: 2 } }), ['seal_a']);
  assert.deepEqual(washes(T, { levels: { a: 2 }, washed: new Set(['seal_a']) }), [], 'monotone');
  assert.ok(classify(T, { levels: { a: 1 } }).solid.has(I(8, 3)));
  assert.ok(!classify(T, { levels: { a: 0 }, washed: ['seal_a'] }).solid.has(I(8, 3)));
});

test('rule: the floodgate opens at its level and only a latch keeps it', () => {
  const fg = compile(T).floodgates[0];
  assert.equal(gateOpen(T, { levels: { b: 1 } }, fg), false);
  assert.equal(gateOpen(T, { levels: { b: 2 } }, fg), true);
  assert.equal(gateOpen(T, { levels: { b: 0 }, latched: new Set(['fg_b']) }, fg), true);
});

test('rule: an inlet basin stops at a dam (a block), virtual flags, band order', () => {
  const mod = { ...T, tide: { ...T.tide, basins: { ...T.tide.basins, a: { ...T.tide.basins.a, inlet: [[2, 5]] } } } };
  assert.ok(water(mod, { levels: { a: 1 } }).has(I(15, 5)));
  const dammed = water(mod, { levels: { a: 1 }, dams: [I(6, 4), I(6, 5), I(6, 6)] });
  assert.ok(dammed.has(I(3, 5)) && !dammed.has(I(10, 5)), 'east of the dam stays dry');
  assert.equal(tideFlag('tide:a>=2', { a: 2 }), true);
  assert.equal(tideFlag('tide:a=0', { a: 1 }), false);
  assert.equal(tideFlag('tide:z>=1', { a: 1 }), undefined);
  assert.equal(tideFlag('met_joss', { a: 1 }), undefined);
  const b = bands(T, water(T, { levels: { a: 1 } }), water(T, { levels: { a: 2 } }), [5, 12], BAND_FRAMES);
  assert.ok(b.length > 20 && b.every(([, k]) => k >= 0 && k < BAND_FRAMES));
  const near = b.find(([i]) => i === I(5, 10)), far = b.find(([i]) => i === I(15, 8));
  assert.ok(near[1] < far[1], 'rising water spreads out from the wheel');
  const d = bands(T, water(T, { levels: { a: 2 } }), water(T, { levels: { a: 0 } }), [5, 12], BAND_FRAMES);
  assert.ok(d.find(([i]) => i === I(15, 4))[1] < d.find(([i]) => i === I(5, 8))[1], 'falling water leaves the far end first');
});

// ---------------------------------------------------------------- the field
test('field: registrations (types, door pairs, petition sockets, flood_grey) and the pack hook', () => {
  for (const t of ['tidewheel', 'tidepost', 'pontoon', 'forgery', 'floodgate']) assert.ok(EXT[t], t);
  for (const k of ['door_canal', 'floodgate', 'door_seal', 'petition_gate']) assert.deepEqual(GATE_SPRITES[k], [`${k}_closed`, `${k}_open`]);
  assert.ok(COUNTING_GATES.has('petition_gate'));
  assert.deepEqual(tintSpec('flood_grey'), { color: '#93a5a2', alpha: 0.62, desat: 0.38 });
  assert.ok(TINTS.flood_grey);
  const handlers = [];
  const out = world.register({ on: (ev, fn) => handlers.push([ev, fn]), stack: [] });
  assert.deepEqual(out.tests, ['ep4_testtide']);
  assert.equal(handlers[0][0], 'scene');
});

test('field: start levels on arrival (a mid, b low, c mid), collision follows, the wheel stands dry', () => {
  const f = makeField();
  const d = f.tide.debugState();
  assert.deepEqual(d.levels, { a: 1, b: 0, c: 1 });
  assert.equal(code(f, 3, 5), 'solid', 'post_a in the canal');
  assert.equal(code(f, 4, 5), 'water');
  assert.equal(code(f, 9, 9), 'none');
  assert.equal(code(f, 24, 9), 'solid', 'grounded pontoon');
  assert.equal(code(f, 23, 9), 'none', 'the dry canal floor of b');
  assert.equal(code(f, 12, 18), 'solid', 'post_c');
  assert.equal(code(f, 13, 18), 'water', 'the lane under water');
  assert.equal(code(f, 17, 18), 'none', 'the punt floats');
  assert.equal(code(f, 8, 3), 'solid', 'the papered door');
  assert.equal(code(f, 20, 3), 'solid', 'the floodgate shut');
  assert.equal(f.entities.get('wh_a').prop.state, 1, 'wheel frame = level');
  assert.equal(f.entities.get('post_a').prop.state, 1);
  assert.equal(f.sfx.length, 0, 'a quiet arrival');
  // the wheels answer confirm, the pontoon does not
  assert.equal(interactables(f, 5, 12)[0].id, 'wh_a');
  assert.equal(interactables(f, 24, 9).length, 0);
});

test('field: wheel b low, mid, high, low: the pontoon bridge, the walkway flood, the floodgate latch', async () => {
  const f = makeField();
  give(f, 'lock_crank');
  await turn(f, 'wh_b');
  assert.equal(f.tide.levels.b, 1);
  assert.deepEqual(f.sfx.slice(0, 2), ['tide_wheel', 'water_rise']);
  for (const y of [7, 8, 9, 10, 11]) assert.equal(code(f, 24, y), 'none', `bridge ${y}`);
  assert.equal(code(f, 23, 9), 'water');
  assert.equal(f.entities.get('pt_9').prop.state === 1 || f.entities.get('pt_9').prop.state === 2, true, 'afloat frame');
  assert.ok(f.barks.includes('first_tide'));
  f.leader.tx = 24; f.leader.ty = 9; frames(f, 1);
  assert.ok(f.barks.includes('first_float'), 'standing on a float');
  f.leader.tx = 20; f.leader.ty = 15; frames(f, 1);
  await turn(f, 'wh_b');
  assert.equal(code(f, 24, 6), 'water', 'high: the walkway floods');
  assert.equal(code(f, 20, 3), 'none'); assert.equal(code(f, 21, 3), 'none');
  assert.ok(f.game.flags._t_tidegate && f.game.opened['ep4_testtide:fg_b']);
  assert.ok(f.sfx.includes('gate_open'));
  await turn(f, 'wh_b');
  assert.equal(f.tide.levels.b, 0);
  assert.equal(code(f, 20, 3), 'none', 'latched: stays open at low');
  assert.equal(code(f, 24, 9), 'solid', 'grounded again');
  assert.equal(f.sfx.filter((s) => s === 'water_drain').length, 1);
});

test('field: the wash at high, kept through a reload; levels reset on re-entry', async () => {
  const f = makeField();
  give(f, 'lock_crank');
  await turn(f, 'wh_a');            // mid -> high
  frames(f, 80);                    // the red ink cloud runs its course
  assert.deepEqual(f.game.washed, { ep4_testtide: ['seal_a'] });
  assert.ok(f.sfx.includes('seal_wash'));
  assert.ok(f.barks.includes('first_wash'));
  assert.equal(f.entities.get('seal_a').prop.state, 2, 'washed frame');
  assert.equal(f.entities.get('g_paper').state, 'open', 'the seal was the canal door\'s source');
  await turn(f, 'wh_a');            // high -> low
  assert.equal(code(f, 8, 4), 'none');
  assert.equal(code(f, 8, 3), 'none', 'the open canal door');
  assert.equal(interactables(f, 8, 3).length, 0, 'a washed seal is just a doorway');
  // reload: the same save on a fresh field (the game object round-trips through JSON as save.js does)
  const g2 = JSON.parse(JSON.stringify(f.game));
  const f2 = makeField(T, g2);
  assert.deepEqual(f2.tide.debugState().levels, { a: 1, b: 0, c: 1 }, 'every basin back at its start');
  assert.deepEqual(f2.tide.debugState().washed, ['seal_a']);
  assert.equal(f2.entities.get('seal_a').prop.state, 2);
  assert.equal(f2.entities.get('g_paper').state, 'open');
  assert.equal(code(f2, 8, 4), 'water', 'mid again');
  assert.equal(f2.sfx.length, 0);
});

test('field: the 2-level farm wheel needs no crank; the lane drains and the punt grounds', async () => {
  const f = makeField();
  await turn(f, 'wh_c');
  assert.equal(f.tide.levels.c, 0);
  assert.equal(code(f, 13, 18), 'none');
  assert.equal(code(f, 17, 18), 'solid');
  await turn(f, 'wh_c');
  assert.equal(f.tide.levels.c, 1, 'low, mid, low');
});

test('field: a crank wheel without the crank does not turn', async () => {
  const f = makeField();
  assert.equal(await turn(f, 'wh_a'), false);
  assert.equal(f.tide.levels.a, 1);
  assert.ok(f.sfx.includes('door_locked'));
});

test('field: no level of any basin floods a wheel\'s stand or the cells it is faced from', () => {
  const m = compile(T);
  for (const w of m.wheels) for (let L = 0; L < m.basins[w.b].levels; L++) {
    const wat = water(T, { levels: { [w.b]: L } });
    for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) assert.ok(!wat.has(I(w.x + dx, w.y + dy)), `${w.id} ${dx},${dy} at ${L}`);
  }
});

test('field: reduceMotion applies a level at once; a band animation takes 24 frames', async () => {
  const f = makeField(T, null, { reduceMotion: true });
  give(f, 'lock_crank');
  await f.tide.turn(f.entities.get('wh_b'));
  assert.equal(f.tide.anim, null);
  assert.equal(f.tide.debugState().drawn, f.tide.debugState().water);
  const g = makeField();
  give(g, 'lock_crank');
  const p = g.tide.turn(g.entities.get('wh_b'));
  await Promise.resolve(); await Promise.resolve();
  frames(g, 1);
  const mid = g.tide.debugState();
  assert.ok(mid.anim != null && mid.drawn < mid.water, 'the water arrives band by band');
  frames(g, BAND_FRAMES);
  await p;
  assert.equal(g.tide.debugState().drawn, g.tide.debugState().water);
});

test('field: the virtual tide flag shows and hides an event with the water', async () => {
  const mod = { ...T, events: [...T.events, { id: 'marks', type: 'object', x: 10, y: 9, sprite: 'tide_post', text: 'ep4_keeper_marks', if: 'tide:a>=2', lantern: true }] };
  const f = makeField(mod);
  give(f, 'lock_crank');
  assert.equal(f.entities.get('marks').present, false, 'mid: not there');
  await turn(f, 'wh_a');
  assert.equal(f.entities.get('marks').present, true, 'high: there');
  f.lantern = 60; f.leader.tx = 10; f.leader.ty = 12; frames(f, 2);
  assert.ok(f.barks.includes('first_true_ink'));
  await turn(f, 'wh_a');
  assert.equal(f.entities.get('marks').present, false);
});

test('field: a boat door rides with the sound of water', async () => {
  const mod = { ...T, events: [...T.events, { id: 'boat_x', type: 'door', kind: 'boat', x: 16, y: 14, to: ['ep4_valewyn', 5, 5, 'up'] }] };
  const f = makeField(mod);
  const ent = f.entities.get('boat_x');
  assert.equal(ent.prop && ent.prop.t, 'boat', 'a boat without a sprite gets the boat');
  await f.useDoor(ent);
  assert.ok(f.sfx.includes('water_rise'));
  assert.deepEqual(f.warps[0], ['ep4_valewyn', 5, 5, 'up', 'door']);
});

test('timing: a level change recomputes under 2 ms, a field frame under 3 ms', async () => {
  const f = makeField();
  give(f, 'lock_crank');
  for (let k = 0; k < 6; k++) await turn(f, 'wh_b');
  const d = f.tide.debugState();
  assert.ok(d.maxApplyMs < 2, `apply ${d.maxApplyMs} ms`);
  let worst = 0;
  for (let i = 0; i < 120; i++) { frames(f, 1); worst = Math.max(worst, f.tide.stats.updateMs); }
  assert.ok(worst < 3, `update ${worst} ms`);
});

// ---------------------------------------------------------------- the map tool
test('mapcheck: the test map validates through the one line, every chest reached, no softlock', async () => {
  const mc = await import('../../tools/maps/mapcheck.mjs');
  const db = await mc.loadDb();
  const r = mc.validate(T, db, { [T.id]: T }, {});
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.walk.unreached, []);
  assert.equal(r.walk.tide.stranded, 0);
  assert.match(r.walk.tide.firstAt.chest_ca, /\|1\|/, 'closet A only after the wash');
  assert.match(r.walk.tide.firstAt.chest_cb, /\|1\|0$/, 'closet B only after the latch');
  assert.match(r.walk.tide.firstAt.chest_c, /c0/, 'the south room at low');
});

test('mapcheck: the rules catch a flooding stand, a free step between heights, a stranding state', async () => {
  const mc = await import('../../tools/maps/mapcheck.mjs');
  const db = await mc.loadDb();
  const bad = (fn) => { const mod = JSON.parse(JSON.stringify(T)); fn(mod); return mc.validate(mod, db, { [mod.id]: mod }, {}).errors.join('\n'); };
  assert.match(bad((m) => { const w = m.events.find((e) => e.id === 'wh_a'); w.x = 5; w.y = 9; }), /party would stand at|own cell/);
  assert.match(bad((m) => { m.ground[7] = m.ground[7].replace('N', 'L'); m.ground[11] = m.ground[11].slice(0, 12) + 'f' + m.ground[11].slice(13); }), /no stair or ledge between/);
  assert.match(bad((m) => { m.events.push({ id: 'e_x', type: 'enemy', x: 3, y: 9, sprite: 'flood_hound', encounter: 'none', move: 'guard' }); }), /stands on 3,9, which floods/);
  // the door out of closet A taken away: once inside, nothing leads back
  assert.match(bad((m) => { m.events = m.events.filter((e) => e.id !== 'back_a'); }), /tide softlock/);
});
