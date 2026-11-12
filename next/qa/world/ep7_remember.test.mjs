// Episode 7 name stones (E7-world): the pure rule (src/data/ep7/field/remember.js) on the test map and on small fixtures, then
// the real TileMap, events.js, the stone system (src/data/ep7/field) and the REAL FieldScene methods (tryLeaderStep, canStep,
// onLeaderArrived, partyFollow, playerInput, interact, rebuildParty) on a headless field with real Actors and a scripted
// input layer: a read and a crossing, two held at once, the third letting the first go (and the far frost door melting with a
// pan), a re-read reordering, a refused read (fade under the party) and a refused hold (frost under the party), a frost door
// freezing and melting, `start` holds on arrival, holds resetting on re-entry, no new save field, a save on a held path cell
// reloading on ground, an enemy never standing on a path cell, the Lantern stone, the held-key read, reduceMotion, the lamp
// pools, the tints and the aurora limits, timings, a headless walk of the test map's main path, and the map tool
// (tools/maps/ep7_check.mjs through mapcheck's one line) on the test map and on broken fixtures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import * as EV from '../../src/world/events.js';
import { Silverglass } from '../../src/world/silverglass.js';
import { TINTS, NIGHT_TINTS, LAMP_TINTS } from '../../src/world/lighting.js';
import { FieldScene } from '../../src/scenes/field.js';
import { createGame, addMember, serialize, markOpened } from '../../src/game/state.js';
import { BARKS } from '../../src/data/text.js';
import * as STORY from '../../src/game/story.js';
import { compile, initial, held, read, walkable, changed, states, oldest, keyOf, hasRemember } from '../../src/data/ep7/field/remember.js';
import { attach } from '../../src/data/ep7/field/events.js';
import { DRAW_FRAMES, FLICKER_FRAMES } from '../../src/data/ep7/field/system.js';
import { ensureArt, FALLBACK_OBJECTS, FALLBACK_TERRAINS } from '../../src/data/ep7/field/art.js';
import { AURORA, WHITEOUT_TINT, AURORA_TINT, level, frameAt, bandOf, luma } from '../../src/data/ep7/field/aurora.js';
import { TEST_REMEMBER } from '../../src/data/ep7/field/_testremember.js';
import * as world from '../../src/data/ep7/world.js';
import { EP7_LINES } from '../../src/data/ep7/text.js';
import { within } from '../_perf.mjs';

// the fake asset store has no props atlas: the chests' and the wolf's own art is not what this file tests
const warn = console.warn;
console.warn = (...a) => { if (!/unknown object "chest_|sprite|atlas/.test(String(a[0]))) warn(...a); };
const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const T = TEST_REMEMBER;
const M = compile(T);
STORY.registerStory({ scenes: {}, lines: EP7_LINES, conditions: {} });
world.register();

/** A scripted input layer with the real API the field reads (heldDir, pressed, held). */
function makeInput() {
  const heldSet = new Set(), pressedNow = new Set();
  let order = 0;
  const ord = {};
  return {
    lastDevice: 'keyboard',
    hold(a) { if (!heldSet.has(a)) { heldSet.add(a); pressedNow.add(a); ord[a] = ++order; } },
    release(a) { heldSet.delete(a); },
    endFrame() { pressedNow.clear(); },
    pressed: (a) => pressedNow.has(a),
    held: (a) => heldSet.has(a),
    heldDir() { let best = null, o = -1; for (const d of ['up', 'down', 'left', 'right']) if (heldSet.has(d) && ord[d] > o) { best = d; o = ord[d]; } return best; },
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
  if (!game) {
    game = createGame('Arden'); addMember(game, 'mira'); addMember(game, 'bram');
    for (const k of ['ep7_started', 'mira_joined', 'bram_joined']) game.flags[k] = true;
  }
  const f = Object.create(FieldScene.prototype);
  Object.assign(f, {
    engine, name: 'field', game, actors: [], entities: new Map(), byTile: new Map(), enterTriggers: [], inputLocked: 0, frame: 0, time: 0,
    sessionGone: new Set(), dungeonGone: new Map(), reentryGone: new Map(), warned: new Set(), pendingWarp: null, dead: false, loading: false,
    stepCount: 0, pendingBarks: [], fxTriggers: [], fxDone: new Set(), sliding: [], menuAsked: false, mapId: mod.id, sfx, barks: [], warps: [], scenes: [],
    lantern: 0,
  });
  engine.scene = f;
  f.hasFlag = (k) => !!game.flags[k];
  ensureArt(TILES, engine);
  f.map = new TileMap(engine, mod, { hasFlag: f.hasFlag });
  f.particles = { puff() {}, sparkle() {}, sway() {}, burst() {} };
  f.fog = { onLeaderArrived() {} };
  f.abilities = { usePressed() {}, cycle() {}, handleTouch() {}, update() {}, float: null };
  f.cutscene = { running: null, api: {} };
  // a camera that knows what a 384 x 216 window round the leader shows (the far-change pan reads it)
  f.pans = [];
  f.camera = {
    x: 0, y: 0, W: 384, H: 216, snapTo() {}, update() {},
    visible(x, y, w, h) { const L = f.leader, cx = L.tx * 16 + 8, cy = L.ty * 16 + 8; return x + w > cx - 192 && x < cx + 192 && y + h > cy - 108 && y < cy + 108; },
    panTo: async (x, y) => { f.pans.push([Math.floor(x / 16), Math.floor(y / 16)]); }, returnTo: async () => {},
  };
  f.lighting = { dark: 0, tintName: 'none', tint: null, tintFade: null, setTint(n) { this.tintName = n; }, draw() {} };
  f.rng = { chance: (p) => (f.frame * 7919 % 100) / 100 < p, pick: (a) => a[(f.frame * 31 + a.length) % a.length] };
  f.barkCalls = [];
  f.bark = (k) => { f.barkCalls.push(k); if (game.counters[`bark:${k}`]) return; f.barks.push(k); game.counters[`bark:${k}`] = 1; };
  f.showBoxes = async () => {};
  f.runScene = (id) => { f.scenes.push(id); };
  f.warpTo = (...a) => { f.warps.push(a); };
  f.touchEnemy = () => {};
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
function frame(f, brains = false) {
  f.frame++;
  const L = f.leader;
  const canControl = !f.inputLocked && !f.pendingWarp;
  let arrived = false;
  for (const a of f.actors) { const got = a.update(); if (got && a === L) arrived = true; }
  if (arrived) f.onLeaderArrived();
  if (brains && !f.inputLocked) for (const a of f.actors) if (a.kind === 'enemy' && a.brain) a.brain.tick(f);
  f.glass.update();
  f.playerInput(canControl, arrived);
  f.engine.input.endFrame();
}
/** Frames with the microtasks flushed between them (a read awaits its animation). */
async function frames(f, n, brains = false) { for (let i = 0; i < n; i++) { frame(f, brains); for (let k = 0; k < 6; k++) await Promise.resolve(); } }
const quiet = (f) => !f.leader.moving && !f.inputLocked && !f.stones.anim && !f.followers.some((a) => a.moving);
async function settle(f, max = 200) { for (let i = 0; i < max; i++) { await frames(f, 1); if (quiet(f)) return i; } return max; }
/** Tap: hold until the leader starts a step (or turns to face a wall), then release, then settle. */
async function tap(f, dir) {
  f.engine.input.hold(dir);
  for (let i = 0; i < 4 && !f.leader.moving; i++) await frames(f, 1);
  f.engine.input.release(dir);
  await settle(f);
}
async function walk(f, dirs) { for (const d of dirs) await tap(f, d); }
/** Face a direction without stepping (the cell ahead is a cairn), then press confirm and let the read finish. */
async function readFacing(f, dir) {
  f.leader.dir = dir;
  f.engine.input.hold('confirm');
  await frames(f, 1);
  f.engine.input.release('confirm');
  await settle(f, 120);
}
const at = (f) => [f.leader.tx, f.leader.ty];
const code = (f, x, y) => f.map.codeAt(x, y);
const H = (f) => f.stones.held().join('');
const frameOf = (f, id) => f.entities.get(id).prop.state;

// ---------------------------------------------------------------- the rule
test('rule: the test map compiles: five stones, eight cairns, capacity 2, the grip on arrival, 26 ordered holds', () => {
  assert.deepEqual(M.errors, []);
  assert.equal(M.W, 34); assert.equal(M.H, 21);
  assert.deepEqual(M.stones, ['a', 'b', 'c', 'd', 'e']);
  assert.equal(M.cairns.length, 8);
  assert.equal(M.capacity, 2);
  assert.deepEqual(M.start, ['d']);
  assert.deepEqual(initial(M), { order: ['d'] });
  assert.equal(states(M).length, 26, 'ordered holds of up to 2 from 5 stones: 1 + 5 + 20');
  assert.deepEqual([M.pathOf.a.length, M.pathOf.b.length, M.pathOf.c.length, M.pathOf.d.length, M.pathOf.e.length], [6, 7, 5, 0, 5]);
  assert.equal(M.frostOf.d.length, 1);
  assert.ok(hasRemember(T));
});

test('rule: a read holds the newest; over capacity the oldest lets go; a re-read moves a held stone to newest', () => {
  let s = initial(M);
  let r = read(M, s, 'a', [[6, 14]]);
  assert.ok(r.ok); assert.deepEqual(r.state.order, ['d', 'a']); assert.deepEqual(r.letGo, []); assert.equal(r.reread, false);
  assert.equal(oldest(M, r.state), 'd', 'two held: the oldest goes next');
  assert.equal(walkable(M, r.state, 9, 15), true, 'path a open');
  assert.equal(walkable(M, r.state, 29, 15), false, 'the door is shut while d is held');
  s = r.state;
  r = read(M, s, 'c', [[13, 15]]);
  assert.ok(r.ok); assert.deepEqual(r.state.order, ['a', 'c']); assert.deepEqual(r.letGo, ['d']);
  assert.equal(walkable(M, r.state, 29, 15), true, 'd let go: the door melts');
  assert.deepEqual(changed(M, s, r.state).sort((a, b) => a - b), [...M.pathOf.c, ...M.frostOf.d].sort((a, b) => a - b));
  r = read(M, r.state, 'a', [[13, 17]]);
  assert.ok(r.ok && r.reread); assert.deepEqual(r.state.order, ['c', 'a'], 're-read: a is newest, c goes next'); assert.deepEqual(r.letGo, []);
  assert.equal(walkable(M, r.state, 3, 3), null, 'not a rule cell: the base map decides');
  assert.equal(keyOf(M, r.state), 'ca');
  assert.equal(read(M, r.state, 'z').refused, 'unknown');
});

test('rule: refused reads change nothing: fade under a party cell, ice under a party cell', () => {
  const s = { order: ['a', 'b'] };
  const r = read(M, s, 'c', [[13, 15], [12, 15], [11, 15]]);
  assert.equal(r.ok, false); assert.equal(r.refused, 'fade'); assert.equal(r.state, s, 'the same state object');
  assert.equal(read(M, s, 'c', [[13, 15], [14, 15]]).ok, true, 'everyone on ground: fine');
  const g = read(M, { order: ['a', 'c'] }, 'd', [[28, 15], [29, 15]]);
  assert.equal(g.refused, 'frost', 'a follower on the melted door: the door may not freeze round them');
  assert.equal(read(M, { order: ['d', 'a'] }, 'd', [[29, 15]]).ok, true, 'a re-read of a held frost stone freezes nothing new');
  const idx = read(M, s, 'c', [12 + 15 * 34]);
  assert.equal(idx.refused, 'fade', 'party cells may be cell indices');
});

test('rule: the model is deterministic and pure (no timers, no randomness); names never enter the rule', () => {
  const a = compile(T), b = compile({ ...T, events: T.events.map((e) => (e.type === 'namestone' ? { ...e, name: 'stone_other' } : e)) });
  for (const st of states(a)) for (const s of a.stones) {
    const ra = read(a, st, s, [[3, 17]]), rb = read(b, st, s, [[3, 17]]);
    assert.deepEqual([ra.ok, ra.state.order, ra.letGo], [rb.ok, rb.state.order, rb.letGo]);
  }
  const src = fs.readFileSync(path.join(NEXT, 'src', 'data', 'ep7', 'field', 'remember.js'), 'utf8');
  assert.ok(!/Math\.random|setTimeout|setInterval|Date\.now|performance/.test(src), 'remember.js is pure');
  assert.ok(!/\.name\b/.test(src.replace(/^\s*\/\/.*$/gm, '')), 'the rule never reads a stone name');
});

test('rule: parse errors: rows, letters, a stone without a cairn, six stones, a path and a frost cell on one cell', () => {
  const base = { id: 'fx', ground: ['_____', '_____'], legend: { _: 'fade' }, events: [{ id: 's1', type: 'namestone', stone: 'a', x: 0, y: 0, name: 'stone_asta' }] };
  assert.match(compile({ ...base, remember: { paths: ['aaaaa'] } }).errors.join(), /1 rows/);
  assert.match(compile({ ...base, remember: { paths: ['aA...', '.....'] } }).errors.join(), /"A" at 1,0/);
  assert.match(compile({ ...base, remember: { paths: ['ab...', '.....'] } }).errors.join(), /stone "b" has cells but no namestone/);
  assert.match(compile({ ...base, remember: { paths: ['a....', '.....'], frost: ['A....', '.....'] } }).errors.join(), /a path cell and a frost cell/);
  const six = { ...base, ground: ['______'], remember: { paths: ['abcdef'] }, events: 'abcdef'.split('').map((s, i) => ({ id: 'n' + s, type: 'namestone', stone: s, x: i, y: 0, name: 'x' })) };
  assert.match(compile(six).errors.join(), /6 stones \(at most 5/);
  assert.match(compile({ ...base, remember: { paths: ['a....', '.....'], start: ['q'] } }).errors.join(), /not a stone/);
  assert.equal(compile({ id: 'none', ground: ['.'] }), null);
});

test('rule: timing: compile, a read and a full walkability sweep of a 40 x 40 map with 5 stones and 200 path cells, under 1 ms', () => {
  const W = 40, G = Array.from({ length: 40 }, () => '_'.repeat(W));
  const P = Array.from({ length: 40 }, () => Array(W).fill('.'));
  let n = 0;
  for (let y = 2; y < 38 && n < 200; y += 2) for (let x = 2; x < 38 && n < 200; x++) { P[y][x] = 'abcde'[(y >> 1) % 5]; n++; }
  const mod = { id: 'fx40', ground: G, legend: { _: 'fade' }, remember: { capacity: 2, paths: P.map((r) => r.join('')) },
    events: 'abcde'.split('').map((s, i) => ({ id: 'n' + s, type: 'namestone', stone: s, x: 0, y: i, name: 'x' })) };
  assert.equal(n, 200);
  const m = compile(mod);
  assert.deepEqual(m.errors, []);
  const party = [[1, 1], [1, 2], [1, 3]];
  const st = within(1, () => {
    const t0 = performance.now();
    let s = initial(m);
    for (let k = 0; k < 20; k++) { const r = read(m, s, 'abcde'[k % 5], party); s = r.state; changed(m, { order: [] }, s); }
    return (performance.now() - t0) / 20;
  });
  assert.ok(st.ok, st.msg('a read and its recompute'));
  const sw = within(1, () => {
    const t0 = performance.now();
    const cold = compile(mod);
    let c = 0; for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (walkable(cold, { order: ['a', 'b'] }, x, y)) c++;
    return performance.now() - t0;
  });
  assert.ok(sw.ok, sw.msg('a cold compile and a full sweep'));
  console.log(`  # remember.js 40x40, 5 stones, 200 path cells: ${st.best.toFixed(4)} ms a read, ${sw.best.toFixed(4)} ms compile + sweep`);
});

// ---------------------------------------------------------------- the field
test('field: arrival: the start hold (d) shuts the door, every path is fade (void), the cairns show the hold', () => {
  const f = makeField();
  assert.ok(f.stones.active);
  assert.equal(H(f), 'd');
  assert.equal(code(f, 29, 15), 'solid', 'the frost door is solid ice');
  for (const i of M.pathOf.a) assert.equal(f.map.base[(i / 34) | 0][i % 34], 'void');
  assert.equal(frameOf(f, 'ns_d'), 1, 'd lit (one held: nothing goes next yet)');
  assert.equal(frameOf(f, 'ns_a1'), 0, 'a dim');
  assert.equal(f.canStep(f.leader, 6, 15, 7, 15, 'right'), false, 'the party cannot step onto fade');
  assert.equal(code(f, 6, 13), 'solid', 'a cairn is solid');
  assert.ok(f.entities.get('ns_e').prop.alpha < 0.5, 'the Keeper-ink stone is faint until the Lantern finds it');
});

test('field: a read and a crossing: confirm at ns_a1 holds a, path a opens, the party walks across; two held at once', async () => {
  const f = makeField(T, null, {}, [6, 14, 'up']);
  await readFacing(f, 'up');
  assert.equal(H(f), 'da', 'held d and a at once');
  assert.ok(f.sfx.includes('stone_hold'));
  assert.equal(f.stones.line && f.stones.line.text, 'ASTA. The road remembers her.', 'one float line with the name');
  assert.deepEqual([f.stones.line.x, f.stones.line.y], [6 * 16 + 8, 13 * 16 - 22], 'over the stone');
  assert.ok(f.barks.includes('first_held'));
  for (const i of M.pathOf.a) assert.equal(f.map.codeAt(i % 34, (i / 34) | 0), 'none');
  assert.equal(code(f, 29, 15), 'solid', 'd still held: the door stays shut');
  assert.equal(frameOf(f, 'ns_a1'), 1);
  assert.ok([1, 2].includes(frameOf(f, 'ns_d')), 'the oldest of a full hold is lit and guttering');
  assert.equal(frameOf(f, 'ns_a2'), 1, 'both cairns of one stone light');
  await walk(f, ['down', 'right', 'right', 'right', 'right', 'right', 'right', 'right']);
  assert.deepEqual(at(f), [13, 15], 'across the fade on the held path');
  assert.equal(f.stones.lastRead.ms < 1, true, `read recompute ${f.stones.lastRead.ms} ms`);
});

test('field: the third name lets the first go: d goes, the far door melts and the camera pans to it', async () => {
  const f = makeField(T, null, {}, [6, 14, 'up']);
  await readFacing(f, 'up');
  await walk(f, ['down', 'right', 'right', 'right', 'right', 'right', 'right', 'right']);
  assert.deepEqual(at(f), [13, 15]);
  await readFacing(f, 'up');               // ns_c1, right above the landing
  assert.equal(H(f), 'ac');
  assert.deepEqual(f.stones.lastRead.letGo, ['d']);
  assert.equal(code(f, 29, 15), 'none', 'the frost door melted');
  assert.ok(f.sfx.includes('stone_letgo'));
  assert.ok(f.barks.includes('first_letgo'));
  assert.equal(f.stones.lastRead.far, 1, 'the door is far and off screen');
  assert.deepEqual(f.pans, [[29, 15]], 'the reveal panned to it');
  assert.equal(frameOf(f, 'ns_d'), 0, 'd dim again');
  assert.equal(code(f, 9, 15), 'none', 'a still held behind the party');
});

test('field: a re-read reorders: hold a, b; re-read a at ns_a2 and b goes next; reading c then lets b go, not a', async () => {
  const f = makeField(T, null, {}, [13, 17, 'down']);
  f.stones.setHeld(['a', 'b']);
  assert.equal(f.stones.debugState().oldest, 'a');
  await readFacing(f, 'down');            // ns_a2
  assert.equal(H(f), 'ba');
  assert.equal(f.stones.debugState().oldest, 'b');
  assert.ok(f.barks.includes('first_reread'));
  await walk(f, ['up', 'up']);
  assert.deepEqual(at(f), [13, 15]);
  await readFacing(f, 'up');               // ns_c1
  assert.equal(H(f), 'ac', 'b let go; a kept');
  assert.equal(code(f, 16, 7), 'void', 'path b is fade again');
  assert.equal(code(f, 9, 15), 'none');
});

test('field: a refused read (fade under the party): the followers still on path a, a oldest; then a refused hold (frost)', async () => {
  const f = makeField(T, null, {}, [6, 14, 'up']);
  await readFacing(f, 'up');
  await walk(f, ['down', 'right', 'right', 'right', 'right', 'right', 'right', 'right']);
  f.stones.setHeld(['a', 'b']);
  // walk back onto the landing so the followers trail on path a: leader (13, 15), followers (12, 15) and (11, 15)
  await walk(f, ['left', 'left', 'right', 'right']);
  assert.deepEqual(at(f), [13, 15]);
  assert.ok(f.followers.some((a) => M.owner[a.ty * 34 + a.tx] === 0), 'a follower stands on path a');
  const sfx0 = f.sfx.length;
  await readFacing(f, 'up');
  assert.equal(H(f), 'ab', 'nothing changed');
  assert.equal(f.stones.lastRead.refused, 'fade');
  assert.ok(f.sfx.slice(sfx0).includes('buzzer'));
  assert.ok(f.barks.includes('would_fade'));
  await readFacing(f, 'up');
  assert.equal(f.stones.line.text, "Not while we're on it.", 'the second refusal: a float line, the bark said once');
  assert.equal(f.barks.filter((b) => b === 'would_fade').length, 1);
  // the frost refusal: the party comes back from F through the melted door, a follower on it; read ns_d from (28, 15)
  const g = makeField(T, null, {}, [30, 15, 'left']);
  g.stones.setHeld(['a', 'c']);
  assert.equal(code(g, 29, 15), 'none');
  await walk(g, ['left', 'left']);
  assert.deepEqual(at(g), [28, 15]);
  assert.ok(g.followers.some((a) => a.tx === 29 && a.ty === 15), 'a follower on the door cell');
  await readFacing(g, 'up');
  assert.equal(g.stones.lastRead.refused, 'frost');
  assert.equal(H(g), 'ac');
  // step clear and read again: the door freezes (frost_seal), and melts again when d goes
  await walk(g, ['left', 'left', 'right']);
  assert.ok(!g.followers.some((a) => a.tx === 29));
  g.leader.dir = 'up';
  assert.deepEqual(at(g), [27, 15]);
  await walk(g, ['right']);
  await readFacing(g, 'up');
  assert.equal(H(g), 'cd');
  assert.equal(code(g, 29, 15), 'solid', 'the door froze');
  assert.ok(g.sfx.includes('frost_seal'));
});

test('field: holds reset on re-entry; no new save field; a save on a held path cell reloads on ground', async () => {
  const f = makeField(T, null, {}, [6, 14, 'up']);
  const keys0 = Object.keys(serialize(f.game)).sort();
  await readFacing(f, 'up');
  await walk(f, ['down', 'right', 'right', 'right']);
  assert.deepEqual(at(f), [9, 15], 'standing on path a');
  const save = serialize(f.game);
  assert.deepEqual(Object.keys(save).sort(), keys0, 'no new save field');
  assert.ok(!JSON.stringify(save).includes('"order"'), 'the holds are not in the save');
  assert.deepEqual(save.pos, { x: 9, y: 15, dir: 'right' });
  // reload: the map is rebuilt with the authored holds (only d), path a is fade again: the party wakes on the nearest ground
  const g = makeField(T, save, {}, [save.pos.x, save.pos.y, save.pos.dir]);
  assert.equal(H(g), 'd', 'the authored holds on arrival');
  assert.ok(g.stones.rescued, 'rescued');
  const [x, y] = at(g);
  assert.equal(g.map.codeAt(x, y) === 'none' || g.map.codeAt(x, y) === 'solid', true);
  assert.equal(M.owner[y * 34 + x], -1, 'not on a path cell');
  assert.ok(Math.abs(x - 9) + Math.abs(y - 15) <= 4, `the nearest ground (${x}, ${y})`);
  assert.deepEqual([g.game.pos.x, g.game.pos.y], [x, y]);
});

test('field: an enemy never stands on a path or frost cell, held or not', async () => {
  const f = makeField(T, null, {}, [3, 17, 'up']);
  f.stones.setHeld(['b', 'e']);
  const wolf = f.entities.get('wolf_n').actor;
  assert.ok(wolf && wolf.kind === 'enemy');
  assert.equal(f.canStep(wolf, 16, 3, 16, 4, 'down'), false, 'a held path cell is closed to an enemy');
  assert.equal(f.canStep(f.leader, 16, 3, 16, 4, 'down'), true, 'and open to the party');
  f.stones.setHeld(['a', 'c']);
  assert.equal(f.canStep(wolf, 28, 15, 29, 15, 'right'), false, 'a melted frost cell is closed to an enemy too');
  // let it wander a long while beside the open paths b and e
  f.stones.setHeld(['b', 'e']);
  wolf.brain.home = [16, 3]; wolf.brain.radius = 4;
  let onRule = 0, moved = 0;
  for (let i = 0; i < 2400; i++) {
    frame(f, true);
    if (M.owner[wolf.ty * 34 + wolf.tx] >= 0 || M.frostOwner[wolf.ty * 34 + wolf.tx] >= 0) onRule++;
    if (wolf.moving) moved++;
  }
  assert.ok(moved > 20, `the wolf wandered (${moved} moving frames)`);
  assert.equal(onRule, 0);
});

test('field: the stone in Keeper ink: faint and unreadable until the Lantern finds it, then an ordinary stone', async () => {
  const f = makeField(T, null, {}, [13, 1, 'left']);
  f.game.items.lantern_of_recall = 1;
  assert.equal(f.hiddenInkNear(), true, 'the Lantern hint knows it');
  await readFacing(f, 'left');
  assert.equal(H(f), 'd', 'not read');
  assert.equal(f.stones.line.text, 'The name is too pale to read.');
  f.lantern = 100;
  await frames(f, 1);
  f.lantern = 0;
  assert.equal(f.hiddenInkNear(), false);
  assert.equal(f.entities.get('ns_e').prop.alpha, 1);
  await readFacing(f, 'left');
  assert.equal(H(f), 'de');
  assert.equal(code(f, 9, 2), 'none');
  // found for good: a fresh field (re-entry) shows it found (the Episode 1 ink rule), held again only by a read
  const g = makeField(T, f.game, {}, [13, 1, 'left']);
  assert.equal(g.entities.get('ns_e').prop.alpha, 1);
  assert.equal(H(g), 'd');
});

test('field: a direction held across a read neither drops nor adds a step', async () => {
  const f = makeField(T, null, {}, [13, 15, 'up']);
  f.stones.setHeld(['d', 'a']);
  const input = f.engine.input;
  input.hold('confirm');
  await frames(f, 1);
  input.release('confirm');
  assert.ok(f.stones.anim && f.inputLocked > 0, 'the read holds input for its animation');
  await frames(f, 3);
  input.hold('right');                          // a thumb lands on the pad mid-read and stays there
  let lockedMoves = 0, firstFree = -1, k = 0;
  for (; k < 60; k++) {
    await frames(f, 1);
    if (f.inputLocked && f.leader.moving) lockedMoves++;
    if (!f.inputLocked && firstFree < 0) firstFree = k;
    if (firstFree >= 0 && f.leader.moving) break;
  }
  assert.equal(lockedMoves, 0, 'no step while the read holds input');
  assert.ok(k - firstFree <= 1, `the held direction steps at once when the read lets go (${k - firstFree} frames)`);
  const steps0 = f.stepCount;
  // hold exactly long enough for two more steps to start, then let go: the leader finishes the step under way and stops
  while (f.stepCount < steps0 + 2) await frames(f, 1);
  input.release('right');
  await settle(f);
  assert.equal(f.stepCount, steps0 + 2, 'no extra step after the release');
  assert.deepEqual(at(f), [16, 15], 'three cells right of the landing: the first step and two more');
  assert.equal(H(f), 'ac');
});

test('field: reduceMotion: the read is instant (no animation, no lock past the press); the aurora is not drawn', async () => {
  const f = makeField(T, null, { reduceMotion: true }, [6, 14, 'up']);
  f.engine.input.hold('confirm');
  await frames(f, 1);
  f.engine.input.release('confirm');
  assert.equal(f.stones.anim, null);
  assert.equal(H(f), 'da');
  await frames(f, 1);
  assert.equal(f.inputLocked, 0);
  // the oldest held rests on its guttering frame instead of flickering
  for (let i = 0; i < FLICKER_FRAMES * 3; i++) frame(f);
  assert.equal(frameOf(f, 'ns_d'), 2);
  let drawn = 0;
  f.engine.renderer.ctx = new Proxy({}, { get: (t, k) => (k === 'drawImage' ? () => { drawn++; } : () => {}) });
  const auroraMap = { ...T, id: 'ep7_testaurora', lighting: { tint: 'aurora', dark: 0.3 } };
  const g = makeField(auroraMap, null, { reduceMotion: true });
  g.stones.drawAurora({ ctx: { drawImage: () => { drawn++; } } });
  assert.equal(drawn, 0);
});

test('field: the oldest held flickers slowly (every 30 frames); the animation lasts 16 frames', async () => {
  const f = makeField(T, null, {}, [6, 14, 'up']);
  f.engine.input.hold('confirm');
  await frames(f, 1);
  f.engine.input.release('confirm');
  let n = 0;
  while (f.stones.anim) { await frames(f, 1); n++; }
  assert.ok(n >= DRAW_FRAMES - 1 && n <= DRAW_FRAMES + 1, `${n} frames`);
  const seen = [];
  for (let i = 0; i < FLICKER_FRAMES * 4; i++) { frame(f); seen.push(frameOf(f, 'ns_d')); }
  let changes = 0;
  for (let i = 1; i < seen.length; i++) if (seen[i] !== seen[i - 1]) changes++;
  assert.ok(changes >= 3 && changes <= 5, `${changes} changes in ${FLICKER_FRAMES * 4} frames`);
  assert.ok(seen.every((v) => v === 1 || v === 2));
});

test('field: on a dark map a lamp pool burns over every held stone (and faintly along its path)', () => {
  const f = makeField({ ...T, id: 'ep7_testdark', lighting: { tint: 'none', dark: 0.45 } });
  f.lighting.dark = 0.45;
  f.stones.setHeld(['d', 'a']);
  const L = f.stones.lights();
  const pools = L.filter((l) => l.kind === 'warm');
  assert.equal(pools.length, 3, 'ns_d, ns_a1 and ns_a2');
  assert.ok(pools.find((l) => l.x === 28 * 16 + 8).flicker, 'the oldest held flickers');
  assert.ok(L.some((l) => l.kind === 'cool'), 'faint light along the held path');
  f.lighting.dark = 0;
  assert.deepEqual(f.stones.lights(), []);
});

test('field: timings: stone logic under 3 ms a frame, a read under 1 ms of recompute', async () => {
  const f = makeField(T, null, {}, [6, 14, 'up']);
  await readFacing(f, 'up');
  f.stones.stats.maxUpdateMs = 0;
  for (let i = 0; i < 300; i++) frame(f);
  assert.ok(f.stones.stats.maxUpdateMs < 3, `${f.stones.stats.maxUpdateMs} ms`);
  const r = within(1, () => { const t0 = performance.now(); f.stones.setHeld(['a', 'c']); f.stones.setHeld(['d', 'a']); return (performance.now() - t0) / 2; });
  assert.ok(r.ok, r.msg('a hold change on the real field'));
});

test('walk: the test map headless, start to the goal: read a, cross, read c (the door melts), walk on, through the door', async () => {
  const f = makeField();
  await walk(f, ['up', 'up', 'up', 'right', 'right', 'right']);
  assert.deepEqual(at(f), [6, 14]);
  await readFacing(f, 'up');
  await walk(f, ['down', 'right', 'right', 'right', 'right', 'right', 'right', 'right']);
  await readFacing(f, 'up');
  await walk(f, ['down', ...Array(6).fill('right'), ...Array(6).fill('right'), ...Array(4).fill('right'), 'up', 'right', 'right', 'right']);
  assert.deepEqual(at(f), [31, 15], 'beside chest_f');
  assert.equal(f.stones.reads, 2, 'two decisions');
});

// ---------------------------------------------------------------- tints, the aurora, art, barks
test('tints: whiteout and aurora registered; aurora lights lamps; the party floor stays readable (computed)', () => {
  assert.equal(TINTS.whiteout, WHITEOUT_TINT);
  assert.equal(TINTS.aurora, AURORA_TINT);
  assert.ok(NIGHT_TINTS.has('aurora') && LAMP_TINTS.has('aurora'));
  assert.ok(!NIGHT_TINTS.has('whiteout') && !LAMP_TINTS.has('whiteout'), 'the whiteout is a day blizzard: no lamps');
  // a multiply estimate on the snow floor (the browser measure is qa/world/ep7_lab.py): the aurora keeps it over 0.22
  const mul = (c, t) => { const a = parseInt(c.slice(1), 16), b = parseInt(t.color.slice(1), 16); const ch = (s) => { const x = (a >> s) & 255, y = (b >> s) & 255; return x * (1 - t.alpha + t.alpha * y / 255); }; return (0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0)) / 255; };
  assert.ok(mul('#5b6478', AURORA_TINT) * (1 - 0.3 * 0.9) >= 0.22 * 0.6, 'even dark flagstone stays off black (the lab measures the real frame)');
});

test('aurora: 3 frames, one every 30 game frames; no pixel moves more than one step (0.04) between frames, the cycle included', () => {
  assert.equal(AURORA.frames, 3); assert.equal(AURORA.every, 30);
  assert.deepEqual([0, 29, 30, 59, 60, 89, 90].map((k) => frameAt(k)), [0, 0, 1, 1, 2, 2, 0]);
  const W = 34 * 16, Hh = 9 * 16;
  let worst = 0, any = 0;
  for (let k = 0; k < 3; k++) for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const a = level(k, x, y, Hh), b = level((k + 1) % 3, x, y, Hh);
    worst = Math.max(worst, Math.abs(a - b));
    if (a) any++;
  }
  assert.ok(any > 1000, 'the ribbons are there');
  assert.ok(worst <= 1, `at most one step a pixel between frames (${worst})`);
  const maxLumaJump = AURORA.step * Math.max(...AURORA.colors.map((c) => Math.max(luma(c), 1 - luma(c))));
  assert.ok(maxLumaJump <= AURORA.limit, `the worst luma change a pixel can see: ${maxLumaJump.toFixed(3)} (limit ${AURORA.limit})`);
  assert.ok(AURORA.step * AURORA.levels <= 0.25, 'the ribbons stay soft');
  assert.deepEqual(bandOf({ ground: Array(40).fill('.') }), [0, 9]);
  assert.deepEqual(bandOf({ ground: Array(40).fill('.'), lighting: { aurora: { y0: 2, y1: 6 } } }), [2, 6]);
});

test('art: stand-ins fill only missing ids (E7-tiles wins); the fade is void and lowest; cairns are solid with 3 frames', () => {
  const db = { terrains: { snowfield: { mine: true } }, objects: {}, terrainOrder: ['grass'] };
  const added = ensureArt(db);
  assert.ok(added.includes('fade') && !added.includes('snowfield'));
  assert.equal(db.terrains.snowfield.mine, true, 'never replaced');
  assert.equal(db.terrainOrder[0], 'fade');
  assert.equal(db.terrains.fade.collision, 'void');
  for (const id of FALLBACK_OBJECTS) { assert.equal(db.objects[id].frames.length, 3); assert.equal(db.objects[id].collision, 'solid'); }
  assert.deepEqual(FALLBACK_TERRAINS, ['fade', 'snowfield']);
});

test('barks: the plan\'s first-time lines; text.js (E7-story) wins where it has them', () => {
  for (const id of ['first_held', 'first_letgo', 'first_reread', 'first_grip', 'would_fade']) assert.ok(BARKS[id], id);
  for (const [id, v] of Object.entries(world.STONE_BARKS)) for (const b of v) for (const l of b.lines) assert.ok(!/\u2014/.test(l.text), `${id}: no em dash`);
  assert.deepEqual(world.TEST_MAP_IDS, ['ep7_testremember']);
});

// ---------------------------------------------------------------- the map tool
const mc = await import('../../tools/maps/mapcheck.mjs');
const ck = await import('../../tools/maps/ep7_check.mjs');
const db = await mc.loadDb();

test('mapcheck: the test map: 0 errors, every chest reached, 2 decisions, no loop home, through mapcheck\'s one line', () => {
  const r = mc.walk(T, db);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(mc.buildGrid(T, db).errors, []);
  assert.deepEqual(r.unreached, []);
  assert.equal(r.stones.decisions, 2);
  assert.deepEqual(r.stones.solution, ['ns_a1@6,14', 'ns_c1@13,15']);
  assert.ok(r.stones.steps <= 1.3 * r.stones.straight);
  assert.equal(r.stones.stranded, 0);
  assert.ok(r.stones.states <= 26);
  const src = fs.readFileSync(path.join(NEXT, 'tools', 'maps', 'mapcheck.mjs'), 'utf8');
  assert.equal(src.split('\n').filter((l) => l.includes('ep7_check.mjs')).length, 1, 'one line in mapcheck.mjs');
});

test('mapcheck: broken fixtures: a stranded state, an enemy on a path, a path over ground, a cairn on a path, a stone over budget', () => {
  const errs = (mod) => ck.analyse(mod, db, {}).errors.join('\n');
  // without the far cairns, an island loses its way back (b let go on N with only e there, and so on)
  const lone = { ...T, id: 'fx_lone', events: T.events.filter((e) => !['ns_a2', 'ns_b2', 'ns_c2'].includes(e.id)) };
  assert.match(errs(lone), /softlock/);
  const foe = { ...T, id: 'fx_foe', events: [...T.events, { id: 'wolf_p', type: 'enemy', x: 9, y: 15, sprite: 'briar_wolf', encounter: 'e7w_wolves', move: 'wander' }] };
  assert.match(errs(foe), /enemy wolf_p stands on a path or frost cell/);
  const ground = { ...T, id: 'fx_ground', ground: T.ground.map((r, y) => (y === 15 ? r.slice(0, 7) + 's' + r.slice(8) : r)) };
  assert.match(errs(ground), /path cell 7,15 .* not the fade/);
  const onPath = { ...T, id: 'fx_onpath', events: T.events.map((e) => (e.id === 'ns_b1' ? { ...e, x: 16, y: 8 } : e)) };
  assert.match(errs(onPath), /namestone ns_b1: stands on a path or frost cell/);
  const tight = { ...T, id: 'ep7_vault_f2', remember: { ...T.remember, goal: ['goal_f'] } };
  assert.equal(ck.analyse(tight, db, {}).report.stones.decisions, 2);
  const over = { ...T, id: 'fx_over', remember: { ...T.remember, budget: 1 } };
  assert.match(errs(over), /2 decisions on the critical path, plan 4.10 allows 1/);
  assert.deepEqual(ck.PLAN_BUDGET, { ep7_white_road: 4, ep7_vault_f1: 4, ep7_vault_f2: 3, ep7_vault_f3: 5 });
  assert.equal(Object.values(ck.PLAN_BUDGET).reduce((a, b) => a + b, 0), ck.TOTAL_BUDGET);
  const shut = { ...T, id: 'fx_shut', events: T.events.filter((e) => e.id !== 'ns_e' ) };
  assert.match(errs(shut), /stone "e" has cells but no namestone/);
});

test('mapcheck: a loop home: a re-read far behind the furthest point is caught; one further on is not', () => {
  // progress along a corridor is x; the party reads a at x 2, walks to x 20, comes back to x 9 to re-read a: 11 behind
  const trail = [{ i: 2, read: { id: 'na', stone: 'a' } }, ...Array.from({ length: 18 }, (_, k) => ({ i: 3 + k })), ...Array.from({ length: 11 }, (_, k) => ({ i: 19 - k })), { i: 9, read: { id: 'na2', stone: 'a' } }];
  assert.deepEqual(ck.loopHome(trail, (i) => i), [{ id: 'na2', behind: 11 }]);
  // the same stone read again at a cairn further on (x 24): not a loop
  const on = [{ i: 2, read: { id: 'na', stone: 'a' } }, ...Array.from({ length: 22 }, (_, k) => ({ i: 3 + k })), { i: 24, read: { id: 'na3', stone: 'a' } }];
  assert.deepEqual(ck.loopHome(on, (i) => i), []);
  // the rule says more than 6: eight back is a loop, six back is not
  const near = [{ i: 2, read: { id: 'na', stone: 'a' } }, { i: 12 }, { i: 4, read: { id: 'na', stone: 'a' } }];
  assert.deepEqual(ck.loopHome(near, (i) => i), [{ id: 'na', behind: 8 }], 'eight back: a loop');
  assert.deepEqual(ck.loopHome([{ i: 2, read: { id: 'na', stone: 'a' } }, { i: 8 }, { i: 2, read: { id: 'na', stone: 'a' } }], (i) => i), [], 'six back: allowed');
});
