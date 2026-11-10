// Episode 6 gust lanes (E6-world): the pure rule (src/data/ep6/field/wind.js) on the test map and on small fixtures, then the
// real TileMap, events.js, the wind system (src/data/ep6/field) and the REAL FieldScene methods (tryLeaderStep, canStep,
// onLeaderArrived, partyFollow, playerInput, rebuildParty) on a headless field with real Actors and a scripted input layer:
// a straight ride, a bend, a post stop and stepping off it, a blocked stop and stepping off it, a vane toggle and its
// refusal, every vane of a group moving together, the loop guard, vanes resetting on re-entry, no new save field, a save on
// a lane cell reloading on it able to step off, a reload mid-lane carried to its stop, an enemy never entering a lane, the
// held-key landing (one cell, no extra step), the storm tint and the lightning limits, timings, and the map tool's walk of
// the test map (tools/maps/ep6_check.mjs through mapcheck's one line).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import * as EV from '../../src/world/events.js';
import { Silverglass } from '../../src/world/silverglass.js';
import { Actor } from '../../src/world/actors.js';
import { TINTS, NIGHT_TINTS, LAMP_TINTS } from '../../src/world/lighting.js';
import { FieldScene } from '../../src/scenes/field.js';
import { createGame, addMember, serialize } from '../../src/game/state.js';
import { BARKS } from '../../src/data/text.js';
import { peekMap } from '../../src/world/maps.js';
import { compile, live, ride, follow, canTurn, toggled, vaneArrow, changed, maskOf, MAX_RIDE } from '../../src/data/ep6/field/wind.js';
import { attach } from '../../src/data/ep6/field/events.js';
import { RIDE_FRAMES, SWING_FRAMES } from '../../src/data/ep6/field/system.js';
import { ensureArt, FALLBACK_OBJECTS, CHEVRON } from '../../src/data/ep6/field/art.js';
import { STORM_TINT, LIGHTNING, FLASH_ALPHA, flashLevel, flashStarts, luma } from '../../src/data/ep6/field/storm.js';
import { TEST_WIND } from '../../src/data/ep6/field/_testwind.js';
import * as world from '../../src/data/ep6/world.js';

// the fake asset store has no props atlas: the chests' own art is not what this file tests
const warn = console.warn;
console.warn = (...a) => { if (!/unknown object "chest_/.test(String(a[0]))) warn(...a); };
const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const T = TEST_WIND;
const M = compile(T);
const xy = (p) => p.map(([x, y]) => `${x},${y}`).join(' ');
/** Ground of the test map: walkable when it is a deck and not the pillar (12, 4). */
const groundBlocked = (x, y, lane) => {
  if (lane) return false;
  const c = (T.ground[y] || '')[x];
  return c !== 'w' || (x === 12 && y === 4) || T.events.some((e) => (e.type === 'vane' || e.type === 'chest') && e.x === x && e.y === y);
};

/** A scripted input layer with the real API the field reads (heldDir, pressed, held). */
function makeInput() {
  const held = new Set(), pressedNow = new Set();
  let order = 0;
  const ord = {};
  return {
    lastDevice: 'keyboard',
    hold(a) { if (!held.has(a)) { held.add(a); pressedNow.add(a); ord[a] = ++order; } },
    release(a) { held.delete(a); },
    endFrame() { pressedNow.clear(); },
    pressed: (a) => pressedNow.has(a),
    held: (a) => held.has(a),
    heldDir() { let best = null, o = -1; for (const d of ['up', 'down', 'left', 'right']) if (held.has(d) && ord[d] > o) { best = d; o = ord[d]; } return best; },
    repeat: () => false,
  };
}

function makeField(mod = T, game = null, settings = {}, at = null) {
  const sfx = [];
  const input = makeInput();
  const engine = {
    assets: { json: () => TILES, has: () => false, atlas: () => null, img: () => ({ width: 1, height: 1 }), setImage() {} },
    renderer: { createLayer: (w, h) => ({ w, h, ctx }), shake() {}, W: 384, H: 216, ctx, drawLayer() {}, withAlpha: (a, fn) => fn() },
    audio: { sfx: (id) => sfx.push(id) }, input, settings, stack: [], cave: null,
    after: (n, fn) => fn(), waitFrames: async () => {}, hasScene: () => false,
  };
  if (!game) { game = createGame('Arden'); addMember(game, 'mira'); addMember(game, 'bram'); game.flags.ep6_started = true; game.flags.mira_joined = true; game.flags.bram_joined = true; }
  const f = Object.create(FieldScene.prototype);
  Object.assign(f, {
    engine, name: 'field', game, actors: [], entities: new Map(), byTile: new Map(), enterTriggers: [], inputLocked: 0, frame: 0, time: 0,
    sessionGone: new Set(), dungeonGone: new Map(), reentryGone: new Map(), warned: new Set(), pendingWarp: null, dead: false, loading: false,
    stepCount: 0, pendingBarks: [], fxTriggers: [], fxDone: new Set(), sliding: [], menuAsked: false, mapId: mod.id, sfx, barks: [], warps: [], scenes: [],
  });
  engine.scene = f;
  f.hasFlag = (k) => !!game.flags[k];
  ensureArt(TILES, engine);
  f.map = new TileMap(engine, mod, { hasFlag: f.hasFlag });
  f.particles = { puff() {}, sparkle() {}, sway() {} };
  f.fog = { onLeaderArrived() {} };
  f.abilities = { usePressed() {}, cycle() {}, handleTouch() {}, update() {}, float: null };
  f.cutscene = { running: null, api: {} };
  f.camera = { x: 0, y: 0, W: 384, H: 216, visible: () => true, panTo: async () => {}, returnTo: async () => {}, snapTo() {}, update() {} };
  f.lighting = { dark: 0, tintName: 'none', tint: null, tintFade: null, setTint(n) { this.tintName = n; }, draw() {} };
  // takeBark's once-per-save rule: a bark the save has heard is not said again
  f.barks = []; f.barkCalls = [];
  f.bark = (k) => { f.barkCalls.push(k); if (game.counters[`bark:${k}`]) return; f.barks.push(k); game.counters[`bark:${k}`] = 1; };
  f.showBoxes = async () => {};
  f.runScene = (id) => { f.scenes.push(id); };
  f.warpTo = (...a) => { f.warps.push(a); };
  f.touchEnemy = () => {};
  f.collectLights = () => [];
  f.debugState = () => ({ map: f.mapId });
  f.glass = new Silverglass(f);
  attach(f);
  const s = at || [mod.start.x, mod.start.y, mod.start.dir];
  f.rebuildParty(s[0], s[1], s[2] || 'up');
  EV.buildEntities(f);
  f.glass.reset();
  return f;
}

/** One logic frame, the order FieldScene.update uses for what matters here (actors, arrivals, behaviours, glass, input). */
function frame(f) {
  f.frame++;
  const L = f.leader;
  const canControl = !f.inputLocked && !f.pendingWarp;
  let arrived = false;
  for (const a of f.actors) { const got = a.update(); if (got && a === L) arrived = true; }
  if (arrived) f.onLeaderArrived();
  f.glass.update();
  f.playerInput(canControl, arrived);
  f.engine.input.endFrame();
}
const frames = (f, n) => { for (let i = 0; i < n; i++) frame(f); };
/** Hold a direction for n frames (a real thumb), then release. */
function hold(f, dir, n) { f.engine.input.hold(dir); frames(f, n); f.engine.input.release(dir); }
/** Tap: hold until the leader starts a step, then release, then run until everything settles. */
function tap(f, dir, settle = 80) {
  f.engine.input.hold(dir);
  for (let i = 0; i < 4 && !f.leader.moving; i++) frame(f);
  f.engine.input.release(dir);
  settleAll(f, settle);
}
function settleAll(f, max = 200) {
  for (let i = 0; i < max; i++) { frame(f); if (!f.leader.moving && !f.inputLocked && !f.wind.carry && !f.wind.settle && !f.wind.anim && !f.followers.some((a) => a.moving)) return i; }
  return max;
}
const at = (f) => [f.leader.tx, f.leader.ty];
const flushAsync = async (n = 40) => { for (let i = 0; i < n; i++) { await Promise.resolve(); frame(f0); } };
let f0 = null;
async function turnVane(f, id) {
  f0 = f;
  const p = f.wind.turnVane(f.entities.get(id));
  for (let i = 0; i < SWING_FRAMES + 6; i++) { await Promise.resolve(); frame(f); }
  return p;
}

// ---------------------------------------------------------------- the rule
test('rule: the test map compiles: one group, two posts, two vanes, every lane cell void-able', () => {
  assert.deepEqual(M.errors, []);
  assert.equal(M.W, 32); assert.equal(M.H, 23);
  assert.deepEqual(M.groups, ['a']);
  assert.deepEqual([...M.posts.values()].sort(), ['mo_c', 'mo_g']);
  assert.deepEqual(M.vanes.map((v) => `${v.id}:${v.group}`), ['vane_a:a', 'vane_a2:a']);
  const A0 = live(M, 0), A1 = live(M, 1);
  let n0 = 0, n1 = 0;
  for (let i = 0; i < M.N; i++) { if (A0[i] >= 0) n0++; if (A1[i] >= 0) n1++; }
  assert.equal(n0, 6 + 7 + 10 + 10 + 4 + 3 + 6 + 3 + 6 + 5 + 2, 'authored live cells');
  assert.equal(n1, n0 - 5 + 2, 'turned: G calm (5), K live (2)');
});

test('rule: a straight ride lands on the first ground cell; a bend counts; stepping in against the wind lands you back', () => {
  const a = ride(M, 0, [6, 19], 'right', groundBlocked);
  assert.equal(a.stop, 'land');
  assert.equal(xy(a.path), '7,19 8,19 9,19 10,19 11,19 12,19 13,19');
  assert.equal(a.bends, 0);
  const b = ride(M, 0, [15, 16], 'up', groundBlocked);
  assert.equal(b.stop, 'land');
  assert.equal(xy(b.path), '15,15 15,14 15,13 16,13 17,13 18,13 19,13 20,13');
  assert.equal(b.bends, 1, 'up, then right: one bend (lane to lane by each cell\'s arrow)');
  const j = ride(M, 0, [6, 18], 'right', groundBlocked);
  assert.equal(xy(j.path), '7,18 6,18', 'lane J blows west: the step in sets you back on the deck');
  assert.equal(ride(M, 0, [6, 20], 'right', groundBlocked).stop, 'none', 'cloud is not a lane: no ride');
});

test('rule: a post stops the ride on its cell; riding on from the post reaches the far deck', () => {
  const c = ride(M, 0, [3, 17], 'up', groundBlocked);
  assert.equal(c.stop, 'post');
  assert.equal(xy(c.path), '3,16 3,15 3,14 3,13');
  const on = ride(M, 0, [3, 13], 'up', groundBlocked);
  assert.equal(on.stop, 'land');
  assert.equal(xy(on.path.slice(-2)), '3,7 3,6');
  const st = { turned: new Set(), absent: new Set(['mo_c']) };
  assert.equal(ride(M, st, [3, 17], 'up', groundBlocked).stop, 'land', 'a post that is not present (if / ifNot) does not stop the ride');
});

test('rule: blocked stops: a solid prop at the landing, an actor ahead, the map edge', () => {
  const e = ride(M, 0, [7, 4], 'right', groundBlocked);
  assert.equal(e.stop, 'blocked');
  assert.equal(xy(e.path), '8,4 9,4 10,4 11,4', 'the pillar at 12,4 stops the ride on 11,4');
  const actor = (x, y, lane) => (lane && x === 10 && y === 19) || groundBlocked(x, y, lane);
  const g = ride(M, 0, [6, 19], 'right', actor);
  assert.equal(g.stop, 'blocked');
  assert.equal(xy(g.path), '7,19 8,19 9,19', 'an actor on the lane ahead stops the ride a cell short');
  const edge = { id: 'fx_edge', ground: ['ww~~~'], legend: { w: 'wood_floor', '~': 'cloudbank' }, wind: { lanes: ['..>>>'] }, events: [] };
  const r = ride(compile(edge), 0, [1, 0], 'right', (x, y, lane) => !lane && x >= 2);
  assert.equal(r.stop, 'blocked');
  assert.equal(xy(r.path), '2,0 3,0 4,0');
});

test('rule: the loop guard: a ring with no exit stops on revisiting a cell; a long lane stops after 64 cells', () => {
  const ring = { id: 'fx_ring', ground: ['w~~', '~~~'], legend: { w: 'wood_floor', '~': 'cloudbank' }, wind: { lanes: ['.>v', '.^<'] }, events: [] };
  const r = ride(compile(ring), 0, [0, 0], 'right', (x, y, lane) => !lane);
  assert.equal(r.stop, 'guard');
  assert.equal(r.path.length, 5, 'four ring cells and the first one again');
  const long = { id: 'fx_long', ground: ['w' + '~'.repeat(80)], legend: { w: 'wood_floor', '~': 'cloudbank' }, wind: { lanes: ['.' + '>'.repeat(80)] }, events: [] };
  const L = ride(compile(long), 0, [0, 0], 'right', (x, y, lane) => !lane);
  assert.equal(L.stop, 'guard');
  assert.ok(L.path.length <= MAX_RIDE + 1, `${L.path.length} cells`);
});

test('rule: a vane turns its group; the turn is refused when a party cell would go calm; the vanes show the group arrow', () => {
  assert.equal(vaneArrow(M, 0, 'a'), 0, 'authored: lane G up');
  assert.equal(vaneArrow(M, 1, 'a'), 1, 'turned: lane K right');
  const t = toggled(M, 0, 'a');
  assert.equal(maskOf(M, t), 1);
  assert.equal(maskOf(M, toggled(M, t, 'a')), 0);
  assert.deepEqual(canTurn(M, 0, 'a', [[25, 7]]), { ok: false, why: 'drop', cells: [[25, 7]] }, 'on the post mo_g: G would go calm');
  assert.equal(canTurn(M, 0, 'a', [[22, 10], [21, 11]]).ok, true, 'on the deck: fine');
  assert.equal(canTurn(M, 0, 'zz', []).why, 'group');
  assert.equal(canTurn(M, 1, 'a', [[27, 12]]).ok, false, 'turning back with the party on lane K: K would go calm');
  assert.equal(canTurn(M, 1, 'a', [[29, 12]]).ok, true, 'on deck X: fine');
  const ch = changed(M, 0, 1);
  assert.equal(ch.length, 7);
  // turned: G is calm, so the step from deck NE up at 25,10 is no ride; K carries the party to deck X
  assert.equal(ride(M, 1, [25, 10], 'up', groundBlocked).stop, 'none');
  assert.equal(xy(ride(M, 1, [26, 12], 'right', groundBlocked).path), '27,12 28,12 29,12');
});

test('rule: authoring errors are reported, not thrown', () => {
  const bad = { id: 'fx_bad', ground: ['www', 'www'], legend: { w: 'wood_floor' }, wind: { lanes: ['.?.'], turned: { a: ['..', '...', '...'], b: ['...', '...'], c: ['x..', '...'], d: ['.x.', '...'] } },
    events: [{ id: 'mo', type: 'mooring', x: 0, y: 1 }, { id: 'v', type: 'vane', x: 2, y: 1, group: 'q' }] };
  const e = compile(bad).errors.join('\n');
  for (const s of ['"?"', 'lanes has 1 rows', 'turned.a has 3 rows', 'turned.b changes no cell', '4 vane groups', 'mooring mo', 'vane v: group q']) assert.ok(e.includes(s), `${s} in\n${e}`);
});

test('rule: 42 x 40 with 3 vane groups and 300 lane cells: live + a ride + canTurn under 1 ms; a toggle under 1 ms', () => {
  const W = 42, H = 40;
  const lanes = Array.from({ length: H }, (_, y) => (y % 4 === 1 ? '.' + '>'.repeat(W - 2) + '.' : '.'.repeat(W)));
  const tg = (g) => Array.from({ length: H }, (_, y) => (y % 4 === 1 && (y >> 2) % 3 === g ? '.' + '<'.repeat(W - 2) + '.' : '.'.repeat(W)));
  const mod = { id: 'perf', ground: Array(H).fill('w' + '~'.repeat(W - 2) + 'w'), legend: { w: 'wood_floor', '~': 'cloudbank' },
    wind: { lanes, turned: { a: tg(0), b: tg(1), c: tg(2) } }, events: [{ id: 'v1', type: 'vane', x: 0, y: 0, group: 'a' }, { id: 'v2', type: 'vane', x: 0, y: 2, group: 'b' }, { id: 'v3', type: 'vane', x: 0, y: 4, group: 'c' }] };
  const m = compile(mod);
  let n = 0; const A = live(m, 0); for (let i = 0; i < m.N; i++) if (A[i] >= 0) n++;
  assert.ok(n >= 300, `${n} lane cells`);
  const blocked = (x, y, lane) => !lane && x > 0 && x < W - 1;
  for (let i = 0; i < 20; i++) ride(m, i & 7, [0, 1], 'right', blocked);
  const t0 = performance.now();
  const K = 400;
  for (let i = 0; i < K; i++) { const s = i & 7; live(m, s); ride(m, s, [0, 1 + 4 * (i % 10)], 'right', blocked); canTurn(m, s, 'abc'[i % 3], [[3, 1], [5, 5]]); }
  const ms = (performance.now() - t0) / K;
  assert.ok(ms < 1, `${ms.toFixed(3)} ms per state`);
  // a toggle's recompute from cold (no cached state): changed() builds both arrays
  const cold = compile({ ...mod });
  const t1 = performance.now();
  changed(cold, 0, 1); changed(cold, 1, 3); changed(cold, 3, 7);
  const tm = (performance.now() - t1) / 3;
  assert.ok(tm < 1, `toggle recompute ${tm.toFixed(3)} ms`);
  console.log(`  # wind.js 42x40, 3 groups, ${n} lane cells: ${ms.toFixed(4)} ms per state, toggle ${tm.toFixed(4)} ms`);
});

// ---------------------------------------------------------------- the field
test('field: registrations (types, the storm tint on the night and lamp sets, barks, the test map, the stand-in art)', () => {
  for (const t of ['vane', 'mooring']) assert.ok(EV.EXT[t] && EV.EXT[t].create, t);
  assert.ok(EV.INTERACT_TYPES.has('vane'));
  assert.ok(!EV.INTERACT_TYPES.has('mooring'));
  world.register();
  assert.equal(TINTS.storm, STORM_TINT);
  assert.ok(NIGHT_TINTS.has('storm') && LAMP_TINTS.has('storm'), 'lamps light under the storm tint');
  for (const k of ['first_ride', 'first_post', 'first_vane', 'first_duct', 'first_ring', 'vane_would_drop']) assert.ok(BARKS[k], k);
  assert.ok(peekMap('ep6_testwind'));
  const db = { objects: {}, terrains: {}, terrainOrder: ['grass'] };
  assert.deepEqual(ensureArt(db).sort(), [...FALLBACK_OBJECTS, 'cloudbank'].sort());
  assert.equal(db.terrains.cloudbank.collision, 'void');
  assert.equal(db.terrainOrder[0], 'cloudbank', 'cloudbank is the lowest terrain (decks draw their edges over it)');
  assert.equal(db.objects.vane.collision, 'solid');
  assert.equal(db.objects.gust_mooring.collision, 'none');
  assert.equal(db.objects.vane.frames.length, 8);
  assert.equal(db.objects.gust_mooring.frames.length, 12);
  const real = { objects: { vane: { real: true } }, terrains: { cloudbank: { real: true } }, terrainOrder: ['cloudbank'] };
  ensureArt(real);
  assert.ok(real.objects.vane.real && real.terrains.cloudbank.real, 'E6-tiles\' ids are never replaced');
  assert.ok(CHEVRON.size >= 6, 'the chevron is at least 6 x 6 px (plan 5.1)');
});

test('field: every lane cell is void for everyone; the leader may step on from input; an enemy never enters a lane', () => {
  const f = makeField();
  assert.ok(f.wind.active);
  assert.equal(f.map.codeAt(7, 19), 'void');
  assert.equal(f.map.codeAt(25, 9), 'void');
  f.map.recomputeCell(7, 19);
  assert.equal(f.map.codeAt(7, 19), 'void', 'the override survives a recompute');
  const foe = new Actor(f, { id: 'foe', kind: 'enemy', sprite: 'hero', x: 14, y: 19 });
  f.addActor(foe);
  assert.equal(f.canStep(foe, 13, 19, 12, 19, 'left'), false, 'an enemy never steps onto a lane');
  const npc = new Actor(f, { id: 'npc', kind: 'npc', sprite: 'hero', x: 14, y: 18 });
  f.addActor(npc);
  assert.equal(f.canStep(npc, 13, 18, 12, 18, 'left'), false, 'nor an NPC walker');
  f.leader.setPos(6, 19, 'right');
  assert.equal(f.canStep(f.leader, 6, 19, 7, 19, 'right'), true, 'the leader may');
  f.lockInput();
  assert.equal(f.canStep(f.leader, 6, 19, 7, 19, 'right'), false, 'not while input is held (a scene routing the hero never crosses a lane)');
  f.unlockInput();
  assert.equal(f.canStep(f.leader, 6, 20, 7, 20, 'right'), false, 'cloud stays cloud');
});

test('field: a straight ride at RUN pace, the party follows, gust_carry then gust_land, first_ride once', () => {
  const f = makeField(T, null, {}, [6, 19, 'right']);
  tap(f, 'right');
  assert.deepEqual(at(f), [13, 19]);
  assert.equal(f.wind.lastRide.stop, 'land');
  assert.ok(f.sfx.includes('gust_carry') && f.sfx.includes('gust_land'));
  assert.ok(f.sfx.indexOf('gust_carry') < f.sfx.indexOf('gust_land'));
  assert.equal(f.inputLocked, 0);
  assert.deepEqual(f.barks, ['first_ride']);
  assert.equal(f.game.pos.x, 13);
  for (const a of f.followers) assert.equal(f.map.codeAt(a.tx, a.ty), 'none', `follower ${a.id} on ground at ${a.tx},${a.ty}`);
  // the ride takes one RUN step per cell
  const g = makeField(T, null, {}, [6, 19, 'right']);
  g.engine.input.hold('right');
  let n = 0;
  while (!g.wind.carry && n < 30) { frame(g); n++; }
  g.engine.input.release('right');
  const t0 = g.frame;
  while (!(g.leader.tx === 13 && !g.leader.moving) && g.frame - t0 < 200) frame(g);
  assert.equal(g.frame - t0, 6 * RIDE_FRAMES, `six cells at ${RIDE_FRAMES} frames`);
  while (g.wind.carry && g.frame - t0 < 200) frame(g);
  assert.ok(g.frame - t0 <= 6 * RIDE_FRAMES + 2 * RIDE_FRAMES, 'the followers settle onto the deck within two more steps');
  // again: no second bark
  tap(f, 'left'); tap(f, 'left');
  assert.equal(f.barks.filter((k) => k === 'first_ride').length, 1);
});

test('field: the held-key landing: holding the direction through the ride lands on exactly one cell and takes no extra step', () => {
  const f = makeField(T, null, {}, [6, 19, 'right']);
  f.engine.input.hold('right');
  const cells = new Set();
  for (let i = 0; i < 140; i++) { frame(f); if (!f.leader.moving) cells.add(`${f.leader.tx},${f.leader.ty}`); }
  assert.deepEqual(at(f), [13, 19], 'landed on 13,19 and stayed there with the key still held');
  assert.equal(f.wind.hold, 'right');
  assert.equal(f.leader.moving, false);
  // release and press again: a fresh press walks on
  f.engine.input.release('right'); frame(f);
  assert.equal(f.wind.hold, null);
  tap(f, 'right');
  assert.deepEqual(at(f), [14, 19]);
  // another direction pressed while still holding: it moves at once (read fresh)
  const g = makeField(T, null, {}, [6, 19, 'right']);
  g.engine.input.hold('right');
  frames(g, 120);
  g.engine.input.hold('down');
  frames(g, 3);
  assert.deepEqual([g.leader.tx, g.leader.ty], [13, 20], 'down pressed during the hold: one step down');
  // the same through a post stop: holding up from deck S stops on mo_c and does not ride on
  const h = makeField(T, null, {}, [3, 17, 'up']);
  h.engine.input.hold('up');
  frames(h, 140);
  assert.deepEqual(at(h), [3, 13], 'held up through the ride: stays on the post');
});

test('field: the bend, the post and stepping off it, riding on from the post, first_post', () => {
  const f = makeField(T, null, {}, [15, 16, 'up']);
  tap(f, 'up');
  assert.deepEqual(at(f), [20, 13]);
  assert.equal(f.wind.lastRide.bends, 1);
  const p = makeField(T, null, {}, [3, 17, 'up']);
  tap(p, 'up');
  assert.deepEqual(at(p), [3, 13]);
  assert.equal(p.wind.lastRide.stop, 'post');
  assert.ok(p.sfx.includes('mooring_catch'));
  assert.ok(p.barks.includes('first_post'));
  tap(p, 'left');
  assert.deepEqual(at(p), [2, 13], 'stepped off onto the ledge');
  tap(p, 'right');
  assert.deepEqual(at(p), [3, 13], 'back onto the post: it holds (path of one cell)');
  tap(p, 'up');
  assert.deepEqual(at(p), [3, 6], 'ride on to deck N');
  assert.equal(p.map.codeAt(...at(p)), 'none');
});

test('field: a blocked stop (the pillar), the step ahead refused, stepping off south', () => {
  const f = makeField(T, null, {}, [7, 4, 'right']);
  tap(f, 'right');
  assert.deepEqual(at(f), [11, 4]);
  assert.equal(f.wind.lastRide.stop, 'blocked');
  tap(f, 'right');
  assert.deepEqual(at(f), [11, 4], 'the cell ahead is what stopped it');
  tap(f, 'up');
  assert.deepEqual(at(f), [11, 4], 'cloud above');
  tap(f, 'down');
  assert.deepEqual(at(f), [11, 5], 'onto deck P');
});

test('field: a vane toggle swings for 20 frames (input held only then), every vane of the group moves, first_vane; the refusal', async () => {
  const f = makeField(T, null, {}, [22, 10, 'left']);
  const v1 = f.entities.get('vane_a'), v2 = f.entities.get('vane_a2');
  assert.equal(v1.prop.state, 0, 'authored: arrow up, white (frame 0)');
  assert.equal(v2.prop.state, 0);
  assert.equal(f.map.codeAt(21, 10), 'solid', 'a vane is solid');
  f0 = f;
  const p = f.wind.turnVane(v1);
  let lockedFrames = 0;
  for (let i = 0; i < SWING_FRAMES + 6; i++) { await Promise.resolve(); if (f.inputLocked) lockedFrames++; frame(f); }
  assert.equal(await p, true);
  assert.ok(lockedFrames >= SWING_FRAMES - 1 && lockedFrames <= SWING_FRAMES + 2, `held for ${lockedFrames} frames`);
  assert.equal(f.inputLocked, 0);
  assert.equal(v1.prop.state, 4 + 1, 'turned: arrow right, gold (frame 5)');
  assert.equal(v2.prop.state, 5, 'the other vane of group a moved with it');
  assert.ok(f.sfx.includes('vane_turn'));
  assert.ok(f.barks.includes('first_vane'));
  assert.ok(f.wind.lastTurn.ms < 1, `recompute ${f.wind.lastTurn.ms} ms`);
  assert.equal(f.wind.isLive(25, 9), false);
  assert.equal(f.wind.isLive(27, 12), true);
  // reduceMotion: instant
  const g = makeField(T, null, { reduceMotion: true }, [22, 10, 'left']);
  f0 = g;
  const q = g.wind.turnVane(g.entities.get('vane_a'));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(await q, true);
  assert.equal(g.entities.get('vane_a').prop.state, 5);
  // the refusal: standing on mo_g, facing vane_a2
  const r = makeField(T, null, {}, [25, 10, 'up']);
  tap(r, 'up');
  assert.deepEqual(at(r), [25, 7]);
  r.leader.dir = 'left';
  assert.equal(await r.wind.turnVane(r.entities.get('vane_a2')), false);
  assert.ok(r.barks.includes('vane_would_drop'));
  assert.ok(r.sfx.includes('buzzer'));
  assert.equal(r.wind.mask, 0, 'nothing turned');
  assert.equal(await r.wind.turnVane(r.entities.get('vane_a2')), false);
  assert.equal(r.barks.filter((k) => k === 'vane_would_drop').length, 1, 'said once; then a short float line');
  assert.ok(r.abilities.float && /Not while/.test(r.abilities.float.text));
  // a confirm reaches the vane through the real interact path (EXT.vane.interact)
  const s = makeField(T, null, { reduceMotion: true }, [22, 10, 'left']);
  const ent = EV.interactables(s, 21, 10)[0];
  assert.equal(ent && ent.id, 'vane_a');
  await EV.EXT.vane.interact(s, ent);
  assert.equal(s.wind.mask, 1);
});

test('field: the turned lane K, then home by lane M; followers settle on ground after a landing', async () => {
  const f = makeField(T, null, { reduceMotion: true }, [22, 10, 'left']);
  await f.wind.turn('a');
  f.leader.setPos(26, 12, 'right'); f.rebuildParty(26, 12, 'right');
  tap(f, 'right');
  assert.deepEqual(at(f), [29, 12]);
  for (const a of f.followers) assert.ok(!M.anyLane[a.ty * M.W + a.tx], `${a.id} off the lane`);
  f.leader.setPos(29, 14, 'left'); f.rebuildParty(29, 14, 'left');
  tap(f, 'left');
  assert.deepEqual(at(f), [26, 14]);
});

test('field: vanes reset on re-entry; no new save field', async () => {
  const f = makeField(T, null, { reduceMotion: true }, [22, 10, 'left']);
  const before = Object.keys(serialize(f.game)).sort().join(',');
  await f.wind.turn('a');
  assert.equal(f.wind.mask, 1);
  const after = Object.keys(serialize(f.game)).sort().join(',');
  assert.equal(after, before, 'the save has the same fields');
  assert.ok(!JSON.stringify(serialize(f.game)).includes('vane'), 'no vane state is saved');
  // re-entry: the entities and the map are rebuilt, the system resets
  f.map = new TileMap(f.engine, T, { hasFlag: f.hasFlag });
  EV.buildEntities(f);
  f.glass.reset();
  assert.equal(f.wind.mask, 0);
  assert.equal(f.entities.get('vane_a').prop.state, 0);
  assert.equal(f.wind.isLive(25, 9), true);
});

test('field: a save on a lane cell reloads on that cell, able to step off; a save on a calm cell wakes on ground; mid-lane is carried', async () => {
  // on the post (live in the authored state): stays, steps off
  const g = createGame('Arden'); addMember(g, 'mira'); addMember(g, 'bram'); g.flags.ep6_started = true;
  const f = makeField(T, g, {}, [3, 13, 'up']);
  frames(f, 3);
  assert.deepEqual(at(f), [3, 13], 'no ride on load');
  assert.equal(f.wind.carry, null);
  tap(f, 'left');
  assert.deepEqual(at(f), [2, 13]);
  // on the blocked stop
  const b = makeField(T, null, {}, [11, 4, 'right']);
  frames(b, 3);
  assert.deepEqual(at(b), [11, 4]);
  tap(b, 'down');
  assert.deepEqual(at(b), [11, 5]);
  // on K (live only when turned): the authored lanes make it calm: the party wakes on the nearest ground
  const k = makeField(T, null, {}, [27, 12, 'right']);
  assert.ok(!M.anyLane[k.leader.ty * M.W + k.leader.tx] && k.map.codeAt(k.leader.tx, k.leader.ty) === 'none', `rescued to ${at(k)}`);
  assert.equal(Math.abs(k.leader.tx - 27) + Math.abs(k.leader.ty - 12), 1);
  // mid-lane (a position recorded during a ride): the wind carries the party on to its stop once the field is quiet
  const m = makeField(T, null, {}, [9, 19, 'right']);
  assert.equal(m.wind.pending, true);
  settleAll(m, 200);
  assert.deepEqual(at(m), [13, 19]);
});

test('storm: the tint, and the lightning limits (at most +0.12 luma, at most once in 4 s, nothing under reduceMotion)', () => {
  assert.ok(STORM_TINT.alpha > 0 && STORM_TINT.desat > 0.2, 'slate, low saturation');
  const hour = 60 * 60 * 10;
  for (const seed of [0, 7, 431]) {
    const s = flashStarts(hour, seed);
    assert.ok(s.length > 60, `${s.length} flashes in ten minutes`);
    for (let i = 1; i < s.length; i++) assert.ok(s[i] - s[i - 1] >= 240, `gap ${s[i] - s[i - 1]} frames`);
    let peak = 0, on = 0, last = -1e9, gapMin = Infinity;
    for (let t = 0; t < hour; t++) {
      const v = flashLevel(t, seed);
      assert.ok(v >= 0 && v <= 1);
      peak = Math.max(peak, v);
      if (v > 0 && on === 0) { if (t - last < gapMin) gapMin = t - last; last = t; }
      on = v > 0 ? 1 : 0;
    }
    assert.ok(gapMin >= 240, `flashes start at least 240 frames apart (${gapMin})`);
    assert.ok(peak * FLASH_ALPHA * luma(LIGHTNING.color) <= LIGHTNING.peak + 1e-9, `peak luma gain ${(peak * FLASH_ALPHA * luma(LIGHTNING.color)).toFixed(4)}`);
    for (let t = 0; t < 3000; t++) assert.equal(flashLevel(t, seed, true), 0, 'reduceMotion: none');
  }
  assert.ok(LIGHTNING.peak <= 0.12);
});

test('field: timings: an update frame and a ride step under 3 ms; the drawing pass runs headless', () => {
  const f = makeField(T, null, {}, [6, 19, 'right']);
  f.engine.input.hold('right');
  let worst = 0;
  for (let i = 0; i < 80; i++) { const t0 = performance.now(); frame(f); worst = Math.max(worst, performance.now() - t0); }
  assert.ok(worst < 3, `worst frame ${worst.toFixed(3)} ms`);
  assert.ok(f.wind.stats.maxUpdateMs < 1, `wind update ${f.wind.stats.maxUpdateMs} ms`);
  f.wind.drawLow(f.engine.renderer, 0.5);
  f.wind.drawVaneHeads(f.engine.renderer);
  assert.ok(f.wind.layers && f.wind.layers.length === 3);
  console.log(`  # field frame worst ${worst.toFixed(3)} ms, ride ${f.wind.stats.rideMs} ms`);
});

test('mapcheck: the test map walks clean through mapcheck (ep6_check installed by its one line)', async () => {
  const mc = await import('../../tools/maps/mapcheck.mjs');
  const { analyse, hasWind } = await import('../../tools/maps/ep6_check.mjs');
  const db = await mc.loadDb();
  assert.ok(hasWind(T));
  const a = analyse(T, db, {});
  assert.deepEqual(a.errors, []);
  assert.deepEqual(a.report.unreached, [], 'every chest, vane and post reached in some state');
  assert.equal(a.report.wind.states, 2);
  assert.equal(a.report.wind.stranded, 0);
  assert.ok(a.report.wind.firstAt.chest_x.includes('a'), 'chest_x needs group a turned');
  const r = mc.walk(T, db, {});
  assert.deepEqual(r.unreached, []);
  const g = mc.buildGrid(T, db);
  assert.deepEqual(g.errors.filter((e) => /wind|lane|vane|mooring/.test(e)), []);
  // a broken fixture: a vane on a lane cell, an NPC on a lane, an arrival on a lane, a lane that loops, an island with no way back
  const bad = JSON.parse(JSON.stringify(T));
  bad.id = 'ep6_testwind_bad';
  bad.events.push({ id: 'v_on_lane', type: 'vane', x: 8, y: 19, group: 'a' });
  bad.events.push({ id: 'npc_lane', type: 'npc', x: 9, y: 18 });
  bad.wind.lanes[0] = '.>v' + bad.wind.lanes[0].slice(3);
  bad.wind.lanes[1] = '.^<' + bad.wind.lanes[1].slice(3);
  bad.start = { x: 10, y: 19, dir: 'up' };
  const e = analyse(bad, db, {}).errors.join('\n');
  for (const s of ['vane v_on_lane', 'npc npc_lane stands on a lane', 'arrival start', 'loops']) assert.ok(e.includes(s), `${s} in\n${e}`);
});
