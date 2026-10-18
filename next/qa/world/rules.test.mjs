// Field rules without a browser: collision and ledge rules, the follower chain, the Lufia II enemy step
// rule, and switch/plate AND logic for gates. The FieldScene methods run against small fakes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FieldScene } from '../../src/scenes/field.js';
import { Actor, EnemyBrain, WALK_FRAMES } from '../../src/world/actors.js';
import { fireTarget } from '../../src/world/events.js';
import { TILE } from '../../src/world/tilemap.js';

const canStep = FieldScene.prototype.canStep;
const partyFollow = FieldScene.prototype.partyFollow;

function fakeMap(rows, codes = {}) {
  const C = { '.': 'none', '#': 'solid', '~': 'water', 'v': 'ledge_s', '>': 'ledge_e', '<': 'ledge_w', 'p': 'pit', 'c': 'counter', ...codes };
  return {
    inBounds: (x, y) => y >= 0 && y < rows.length && x >= 0 && x < rows[0].length,
    codeAt: (x, y) => (y >= 0 && y < rows.length && x >= 0 && x < rows[0].length ? C[rows[y][x]] : 'void'),
    blockedAt(x, y) { const c = this.codeAt(x, y); return c === 'solid' || c === 'water' || c === 'counter' || c === 'void'; },
    mark: () => null,
  };
}
function fakeField(map, actors = []) {
  const f = { map, actors, leader: null, followers: [], entities: new Map(), byTile: new Map() };
  f.actorAt = (x, y, except = null, any = false) => actors.find((a) => a !== except && (any || (a.solid && a.kind !== 'party')) && a.tx === x && a.ty === y) || null;
  f.canStep = (...args) => canStep.call(f, ...args);
  f.onActorLeave = () => {}; f.onActorEnter = () => {};
  return f;
}
const party = (x, y) => ({ kind: 'party', tx: x, ty: y, solid: false });
const npc = (x, y) => ({ kind: 'npc', tx: x, ty: y, solid: true });

test('collision codes: solid, water, counter and void block; none is open', () => {
  const f = fakeField(fakeMap(['.#~c']));
  const L = party(0, 0);
  assert.equal(canStep.call(f, L, 0, 0, 1, 0, 'right'), false);
  assert.equal(canStep.call(f, L, 0, 0, 2, 0, 'right'), false);
  assert.equal(canStep.call(f, L, 0, 0, 3, 0, 'right'), false);
  assert.equal(canStep.call(f, L, 0, 0, -1, 0, 'left'), false);
  assert.equal(canStep.call(f, L, 1, 0, 0, 0, 'left'), true);
});

test('one-way ledges: only the party, only in the ledge direction, and it is a hop', () => {
  const f = fakeField(fakeMap(['.', 'v', '.']));
  const L = party(0, 0);
  assert.equal(canStep.call(f, L, 0, 0, 0, 1, 'down'), 'hop');
  assert.equal(canStep.call(f, L, 0, 2, 0, 1, 'up'), false);
  const N = npc(0, 0);
  assert.equal(canStep.call(f, N, 0, 0, 0, 1, 'down'), false);
  const g = fakeField(fakeMap(['.>.', '.<.']));
  assert.equal(canStep.call(g, L, 0, 0, 1, 0, 'right'), 'hop');
  assert.equal(canStep.call(g, L, 2, 0, 1, 0, 'left'), false);
  assert.equal(canStep.call(g, L, 2, 1, 1, 1, 'left'), 'hop');
});

test('pits swallow the party and repel everyone else; actors block each other', () => {
  const n = npc(1, 0);
  const f = fakeField(fakeMap(['..p']), [n]);
  const L = party(0, 0);
  assert.equal(canStep.call(f, L, 1, 0, 2, 0, 'right'), true);
  assert.equal(canStep.call(f, n, 1, 0, 2, 0, 'right'), false);
  assert.equal(canStep.call(f, L, 0, 0, 1, 0, 'right'), false);        // the npc stands there
  f.leader = L; f.followers = [];
  assert.equal(canStep.call(f, n, 1, 0, 0, 0, 'left'), false);         // npcs never step onto the party
});

test('follower chain: each follower steps into the tile the one ahead leaves', () => {
  const mk = (x, y) => {
    const a = { tx: x, ty: y, fromX: x * TILE, fromY: y * TILE, moving: false, dir: 'down', steps: [] };
    a.startStep = (nx, ny, dur) => { a.fromX = a.tx * TILE; a.fromY = a.ty * TILE; a.steps.push([nx, ny, dur]); a.tx = nx; a.ty = ny; a.moving = true; };
    a.setPos = (nx, ny) => { a.tx = nx; a.ty = ny; };
    return a;
  };
  const leader = mk(5, 5), m = mk(5, 6), b = mk(5, 7);
  const f = { leader, followers: [m, b] };
  // the leader has just started a step from (5,5) to (6,5)
  leader.fromX = 5 * TILE; leader.fromY = 5 * TILE; leader.tx = 6; leader.ty = 5;
  partyFollow.call(f, WALK_FRAMES);
  assert.deepEqual(m.steps, [[5, 5, WALK_FRAMES]]);
  assert.deepEqual(b.steps, [[5, 6, WALK_FRAMES]]);
  // a follower already on the tile ahead stays put
  m.moving = false; b.moving = false; m.steps = []; b.steps = [];
  leader.fromX = 6 * TILE; leader.fromY = 5 * TILE; leader.tx = 7; leader.ty = 5;
  partyFollow.call(f, WALK_FRAMES);
  assert.deepEqual(m.steps, [[6, 5, WALK_FRAMES]]);
  assert.deepEqual(b.steps, [[5, 5, WALK_FRAMES]]);
});

function fakeEngine() {
  const frames = { hero_down_0: [0, 0, 24, 32], ink_slime_0: [0, 0, 16, 16], ink_slime_1: [0, 0, 16, 16] };
  const atlas = { frames, anims: {}, meta: { sprites: { ink_slime: { size: [16, 16], origin: [8, 15] } } }, image: null };
  return {
    assets: { has: () => true, atlas: () => atlas },
    audio: { sfx() {} },
    waitFrames: () => Promise.resolve(),
    after() {},
  };
}

test('enemy step rule: dungeon enemies move once per player step, field enemies on their own clock', () => {
  const rows = ['.........', '.........', '.........'];
  const map = fakeMap(rows);
  const engine = fakeEngine();
  const field = fakeField(map);
  field.engine = engine;
  field.rng = { chance: () => false, pick: (a) => a[0], int: () => 0 };
  field.inputLocked = 0;
  field.touchEnemy = () => { field.touched = true; };
  const leader = new Actor(field, { id: 'hero', kind: 'party', sprite: 'hero', x: 6, y: 1, solid: false });   // 4 tiles away: inside the 5-tile chase range
  field.leader = leader; field.followers = [];
  const e = new Actor(field, { id: 'e1', kind: 'enemy', sprite: 'ink_slime', x: 2, y: 1, dir: 'left' });
  field.actors.push(e);
  const brain = new EnemyBrain(e, { move: 'chase', encounter: 'f1_slimes' }, 'player');
  e.brain = brain;
  for (let i = 0; i < 10; i++) brain.tick(field);
  assert.equal(e.moving, false, 'no player step: no enemy step');
  brain.onPlayerStep();
  brain.tick(field);
  assert.equal(e.moving, true, 'one player step: the enemy answers with one step');
  assert.equal(e.dir, 'right', 'it chases toward the leader');
  // field rule: moves on its own timer
  const e2 = new Actor(field, { id: 'e2', kind: 'enemy', sprite: 'ink_slime', x: 2, y: 2, dir: 'left' });
  const b2 = new EnemyBrain(e2, { move: 'wander', radius: 2 }, 'free');
  let moved = false;
  for (let i = 0; i < 200 && !moved; i++) { b2.tick(field); moved = e2.moving || e2.steps > 0; if (e2.moving) { e2.moving = false; } }
  assert.equal(moved, true, 'a field enemy wanders without player input');
});

test('a chasing enemy that reaches the leader starts the battle instead of stepping on it', () => {
  const map = fakeMap(['....']);
  const engine = fakeEngine();
  const field = fakeField(map);
  field.engine = engine; field.inputLocked = 0;
  field.rng = { chance: () => false, pick: (a) => a[0], int: () => 0 };
  let touched = null;
  field.touchEnemy = (a, by) => { touched = by; };
  const leader = new Actor(field, { id: 'hero', kind: 'party', sprite: 'hero', x: 1, y: 0, solid: false });
  field.leader = leader; field.followers = [];
  const e = new Actor(field, { id: 'e1', kind: 'enemy', sprite: 'ink_slime', x: 2, y: 0, dir: 'left' });
  field.actors.push(e);
  const brain = new EnemyBrain(e, { move: 'chase' }, 'player');
  brain.onPlayerStep(); brain.tick(field);
  assert.equal(touched, 'enemy');
  assert.equal(e.moving, false);
});

test('gates open only when every switch and plate that targets them is on', () => {
  const tiles = [];
  const field = {
    engine: { audio: { sfx() {} }, renderer: { shake() {} }, after(n, fn) { fn(); } },
    map: { setTile: (x, y, id) => tiles.push([x, y, id]) },
    setFlag() {},
    entities: new Map(),
  };
  const sw1 = { id: 's1', type: 'switch', present: true, state: 'off', ev: { target: 'g' } };
  const sw2 = { id: 's2', type: 'switch', present: true, state: 'off', ev: { target: ['g'] } };
  const plate = { id: 'p', type: 'plate', present: true, state: 'up', ev: { target: 'g' } };
  const gate = { id: 'g', type: 'gate', present: true, state: 'closed', ev: { cells: [[4, 4]], closed: 'wall_cracked', open: 'wall_broken' }, prop: null };
  for (const e of [sw1, sw2, plate, gate]) field.entities.set(e.id, e);
  sw1.state = 'on'; fireTarget(field, 'g');
  assert.equal(gate.state, 'closed');
  sw2.state = 'on'; fireTarget(field, 'g');
  assert.equal(gate.state, 'closed', 'the plate is still up');
  plate.state = 'down'; fireTarget(field, 'g');
  assert.equal(gate.state, 'open');
  assert.deepEqual(tiles.at(-1), [4, 4, 'wall_broken']);
  sw1.state = 'off'; fireTarget(field, 'g');
  assert.equal(gate.state, 'closed', 'releasing one source closes it again');
});
