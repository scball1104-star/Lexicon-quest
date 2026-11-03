// Foundry F3, the Home (polish-world, PLAYTEST_REVIEW_5 #6): the order puzzle on the real map, on a headless field (the
// real TileMap, events.js, silverglass.js and src/world/ep3 against a fake engine, as e3_field.test.mjs).
//
// The design: "cool this, then redirect to that". sl_home starts '\' and spills onto the floor at the entrance. Turned
// '/', the water runs through the junction (23,26) into the crate's slot and cools the slag plug (22,27). Only then can
// Bram shove ore_home (22,29) all the way up, over the cooled plug into the corner (22,26) (three shoves); the dammed
// junction sends the water down its south arm into the lake round the anvil. Shoved first, the crate stops under the
// molten plug. Every state the
// party can reach (any turn, any shove, a reload between any two) can still finish the puzzle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import { buildEntities, refreshEntities, moveBlock, blockCanMove } from '../../src/world/events.js';
import { Silverglass } from '../../src/world/silverglass.js';
import { attach, turnSluice } from '../../src/world/ep3/index.js';
import F3 from '../../src/data/maps/ep3/foundry_f3.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });

// the fake engine loads one atlas: the chests and the feather prop have no art here (warned once per build)
const warn = console.warn;
console.warn = (...a) => { if (!/^\[tilemap:foundry_f3\] unknown object/.test(String(a[0]))) warn(...a); };

const ENTRANCE = [25, 26];
const PLUG = [22, 27], CORNER = [22, 26], BELOW = [22, 28], CRATE0 = [22, 29], PUDDLE = [25, 26], LAKE = [23, 28], ANVIL_SPOT = [26, 28];

function makeField(game = null) {
  const sfx = [];
  const engine = {
    assets: { json: () => TILES, has: () => false, atlas: () => null, img: () => null },
    renderer: { createLayer: (w, h) => ({ w, h, ctx }), shake() {}, flash() {}, W: 384, H: 216 },
    audio: { sfx: (id) => sfx.push(id) },
    after: (n, fn) => fn(), waitFrames: async () => {}, settings: {},
  };
  game = game || { flags: { foundry_f3_arrived: true }, counters: {}, opened: {}, items: {} };
  const f = { engine, game, sfx, entities: new Map(), byTile: new Map(), actors: [], barks: [], scenes: [], warps: [], sessionGone: new Set(), frame: 0 };
  f.rng = { int: (a) => a, range: (a) => a };
  engine.scene = f;
  f.name = 'field';
  f.hasFlag = (k) => !!game.flags[k];
  f.setFlag = (k, v = true) => { if (v === false) delete game.flags[k]; else game.flags[k] = v; refreshEntities(f); f.map.refreshGated(f.hasFlag); f.glass.markDirty(); };
  f.map = new TileMap(engine, F3, { hasFlag: f.hasFlag });
  f.mapId = F3.id;
  f.particles = { sparkle() {}, burst() {}, puff() {} };
  f.bark = (k) => { f.barks.push(k); };
  f.showBoxes = async () => {};
  f.runScene = (id) => { f.scenes.push(id); };
  f.actorAt = () => null;
  f.addActor = () => {};
  f.removeActor = () => {};
  f.warnOnce = () => {};
  f.enemyGone = () => true;
  f.slideProp = (p, x, y) => { f.map.moveProp(p, x, y); return Promise.resolve(); };
  f.camera = { x: 0, y: 0, W: 384, H: 216, visible: () => true };
  f.leader = { tx: ENTRANCE[0], ty: ENTRANCE[1], dir: 'down', moving: false };
  f.cutscene = { running: null };
  f.inputLocked = 0;
  f.lockInput = () => { f.inputLocked++; };
  f.unlockInput = () => { f.inputLocked = Math.max(0, f.inputLocked - 1); };
  f.lighting = { dark: 0.5, draw() {} };
  f.collectLights = () => [];
  f.useDoor = () => 'door';
  f.warpTo = async (...a) => { f.warps.push(a); };
  f.debugState = () => ({ map: f.mapId });
  f.glass = new Silverglass(f);
  attach(f);
  buildEntities(f);
  f.glass.reset();
  settle(f);
  return f;
}
const ent = (f, id) => f.entities.get(id);
const frames = (f, n) => { for (let i = 0; i < n; i++) { f.frame++; f.glass.update(); } };
/** Run until the cooling front is done (the field's own pace: two frames a ring). */
const settle = (f) => { frames(f, 2); for (let i = 0; i < 400 && f.quench.front.length; i++) frames(f, 1); frames(f, 2); };
const code = (f, [x, y]) => f.map.codeAt(x, y);
const crate = (f) => [ent(f, 'ore_home').x, ent(f, 'ore_home').y];
const reload = (f) => makeField(JSON.parse(JSON.stringify(f.game)));
const turn = async (f) => { await turnSluice(f, ent(f, 'sl_home')); settle(f); };
const shove = async (f, dir = 'up') => { const r = await moveBlock(f, ent(f, 'ore_home'), dir); settle(f); return !!r; };
const homeEnds = (f) => f.quench.result.streams.filter((s) => s.id === 'sp_home').map((s) => s.end);
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** Cells the party can walk to from the Home's entrance (props, the crate and slag block; troughs and crust do not). */
function reach(f) {
  const seen = new Set([ENTRANCE.join(',')]);
  const q = [ENTRANCE];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of Object.values(DIRV)) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (seen.has(k) || f.map.codeAt(nx, ny) !== 'none') continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return seen;
}
/** Can the party shove the crate `d` now: standing behind it on reachable floor, and the far cell free? */
const pushable = (f, d) => { const [cx, cy] = crate(f); return reach(f).has(`${cx - DIRV[d][0]},${cy - DIRV[d][1]}`) && blockCanMove(f, ent(f, 'ore_home'), d); };
const solved = (f) => code(f, LAKE) === 'none' && reach(f).has(ANVIL_SPOT.join(','));

test('at rest: the paddle spills onto the floor at the entrance, the plug and the lake glow, the crate waits in its slot', () => {
  const f = makeField();
  assert.equal(ent(f, 'sl_home').state, 1, "sl_home starts '\\'");
  assert.deepEqual(homeEnds(f), [{ kind: 'splash', x: PUDDLE[0], y: PUDDLE[1], dir: 'right', floor: true }], 'a puddle at the entrance');
  assert.equal(code(f, PLUG), 'water', 'the plug is molten');
  assert.equal(code(f, LAKE), 'water', 'the lake is molten');
  assert.deepEqual(crate(f), CRATE0);
  assert.equal(f.quench.crust.size, 0, 'the Home loads with nothing cooled');
  assert.ok(reach(f).has('24,25') || reach(f).has('25,26'), 'the paddle is faced from the entrance');
  assert.equal(solved(f), false);
  // the plug is a lamp of its own (a lone slag cell off the checkerboard)
  assert.ok(f.quench.slagCells.includes(PLUG[1] * F3.ground[0].length + PLUG[0]), 'the plug lights itself');
});

test('the wrong order is visibly wrong: shoved first, the crate stops under the molten plug and will not go onto it', async () => {
  const f = makeField();
  assert.deepEqual(['up', 'down', 'left', 'right'].filter((d) => pushable(f, d)), ['up'], 'only up: lake on one side, the walls of the slot');
  assert.equal(await shove(f, 'up'), true, 'one shove: to the foot of the plug');
  assert.deepEqual(crate(f), BELOW);
  assert.deepEqual(['up', 'down', 'left', 'right'].filter((d) => pushable(f, d)), [], 'no way on: molten slag ahead, nobody behind it');
  assert.equal(await shove(f, 'up'), false, 'Bram strains; it stays');
  assert.deepEqual(crate(f), BELOW);
  assert.deepEqual(homeEnds(f)[0].kind, 'splash', 'the water still spills at the entrance');
  // recover: the missing step first, then the shoves
  await turn(f);
  assert.equal(code(f, PLUG), 'none');
  assert.deepEqual(homeEnds(f), [{ kind: 'splash', x: PLUG[0], y: PLUG[1], dir: 'down', floor: false }], 'the water sprays against the crate');
  await shove(f); await shove(f);
  assert.ok(solved(f));
});

test('the solve: turn (the plug cools), shove, shove (foam at the corner), shove (the lake cools)', async () => {
  const f = makeField();
  await turn(f);
  assert.equal(ent(f, 'sl_home').state, 0);
  assert.equal(code(f, PLUG), 'none', 'the plug is crust');
  assert.equal(code(f, LAKE), 'water', 'the lake is still molten');
  assert.deepEqual(homeEnds(f), [{ kind: 'splash', x: BELOW[0], y: BELOW[1], dir: 'down', floor: true }], 'the water runs on and puddles in front of the crate');
  assert.deepEqual(f.game.quenched.foundry_f3, [PLUG[1] * 44 + PLUG[0]], 'saved');
  assert.equal(await shove(f), true);
  assert.deepEqual(crate(f), BELOW);
  assert.deepEqual(homeEnds(f), [{ kind: 'splash', x: PLUG[0], y: PLUG[1], dir: 'down', floor: false }], 'the water sprays against the crate');
  assert.equal(await shove(f), true);
  assert.deepEqual(crate(f), PLUG);
  assert.deepEqual(homeEnds(f).map((e) => [e.kind, e.x, e.y]), [['dam', PLUG[0], PLUG[1]]], 'foam: the water stops at the crate, the lake still dry');
  assert.equal(code(f, LAKE), 'water');
  assert.equal(await shove(f), true);
  assert.deepEqual(crate(f), CORNER, 'the crate sits in the junction\'s straight arm');
  assert.equal(code(f, LAKE), 'none', 'the dammed junction turns the water into the lake: crust');
  assert.ok(homeEnds(f).some((e) => e.kind === 'splash' && e.y === 30), 'the water runs down the lake\'s west side to the floor');
  assert.ok(solved(f), 'the anvil is reached over the crust');
  // the crate is locked in the corner: no shove moves it again
  assert.deepEqual(['up', 'down', 'left', 'right'].filter((d) => pushable(f, d)), [], 'the crate is locked in the corner');
  assert.ok(f.sfx.includes('quench_hiss'));
});

test('recovery: turned back too early, the water spills at the entrance again; the plug stays cooled and the order still works', async () => {
  const f = makeField();
  await turn(f);
  await turn(f);
  assert.equal(homeEnds(f)[0].kind, 'splash');
  assert.deepEqual([homeEnds(f)[0].x, homeEnds(f)[0].y], PUDDLE, 'visibly wrong: the puddle is back');
  assert.equal(code(f, PLUG), 'none', 'crust stays');
  await shove(f); await shove(f); await shove(f);
  assert.deepEqual(crate(f), CORNER);
  assert.equal(code(f, LAKE), 'water', 'dammed, but the paddle sends the water east');
  await turn(f);
  assert.ok(solved(f), 'one more turn finishes it');
});

test('reload-safe: crust and the solved lake persist; the paddle and the crate reset; a reload mid-puzzle still finishes', async () => {
  const f = makeField();
  await turn(f);
  const g = reload(f);
  assert.equal(ent(g, 'sl_home').state, 1, 'the paddle is back as authored');
  assert.deepEqual(crate(g), CRATE0, 'the crate is back in its slot');
  assert.equal(code(g, PLUG), 'none', 'the plug stays crust');
  assert.equal(g.quench.front.length, 0);
  assert.deepEqual(g.sfx, [], 'a quiet load');
  await shove(g); await shove(g); await shove(g);
  assert.equal(code(g, LAKE), 'water', 'the paddle reset: the water spills at the entrance');
  await turn(g);
  assert.ok(solved(g));
  const h = reload(g);
  assert.ok(solved(h), 'the lake stays crust after a reload');
  assert.deepEqual(crate(h), CRATE0);
});

test('never a softlock: from every state the party can reach (turns, shoves, reloads, in any order) the lake can still cool', async () => {
  // a state is replayed from its action list on a fresh field (deterministic); 'reload' keeps only what the save keeps
  const play = async (acts) => {
    let f = makeField();
    for (const a of acts) {
      if (a === 'turn') await turn(f);
      else if (a === 'reload') f = reload(f);
      else await shove(f, a);
    }
    return f;
  };
  const keyOf = (f) => `${crate(f)}|${ent(f, 'sl_home').state}|${[...f.quench.crust].sort((a, b) => a - b).join('.')}`;
  const options = (f) => {
    const r = reach(f);
    const out = ['reload'];
    const sl = ent(f, 'sl_home');
    if (Object.values(DIRV).some(([dx, dy]) => r.has(`${sl.x + dx},${sl.y + dy}`))) out.push('turn');
    for (const d of Object.keys(DIRV)) if (pushable(f, d)) out.push(d);
    return out;
  };
  const nodes = new Map();      // key -> { acts, solved, next: Set(key) }
  const queue = [[]];
  while (queue.length) {
    const acts = queue.shift();
    const f = await play(acts);
    const k = keyOf(f);
    if (nodes.has(k)) continue;
    const node = { acts, solved: solved(f), next: new Set(), crate: crate(f).join(',') };
    nodes.set(k, node);
    if (node.solved) continue;
    for (const o of options(f)) {
      const g = await play([...acts, o]);
      const k2 = keyOf(g);
      node.next.add(k2);
      if (!nodes.has(k2)) queue.push([...acts, o]);
    }
    assert.ok(nodes.size < 200, 'the state space stays small');
  }
  // every unsolved state reaches a solved one
  const good = new Set([...nodes].filter(([, n]) => n.solved).map(([k]) => k));
  for (let changed = true; changed;) {
    changed = false;
    for (const [k, n] of nodes) if (!good.has(k) && [...n.next].some((x) => good.has(x))) { good.add(k); changed = true; }
  }
  for (const [k, n] of nodes) assert.ok(good.has(k), `state ${k} (after ${n.acts.join(' ') || 'nothing'}) cannot finish`);
  const cells = new Set([...nodes.values()].filter((n) => !n.solved).map((n) => n.crate));
  assert.deepEqual([...cells].sort(), ['22,26', '22,27', '22,28', '22,29'], 'before the solve the crate only ever stands in its slot');
  // the shortest solve is four actions: a turn and three shoves (the turn before the second)
  assert.ok(nodes.size >= 6, `explored ${nodes.size} states`);
  const best = Math.min(...[...nodes.values()].filter((n) => n.solved).map((n) => n.acts.filter((a) => a !== 'reload').length));
  assert.equal(best, 4);
});
