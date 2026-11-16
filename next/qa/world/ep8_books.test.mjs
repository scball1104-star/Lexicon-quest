// Episode 8 pop-up books (E8-world): the pure rule (src/data/ep8/field/popbooks.js) on the test map and on small fixtures,
// then the real TileMap, events.js, the book system (src/data/ep8/field) and the REAL FieldScene methods (tryLeaderStep,
// canStep, onLeaderArrived, partyFollow, playerInput, interact, rebuildParty) on a headless field with real Actors and a
// scripted input layer: a read and a crossing, a bridge refused under the party, a book read from either side (walls), a
// short end, a wall refused on a party cell, pages refused onto a foe, a pair swapping and a pair refused, a bridge and a
// wall from one book, the ghost, `start` states on arrival, states resetting on re-entry, no new save field, a save on a
// bridge reloading on ground, a foe never standing on a page cell, the Lantern book, the held-key read, reduceMotion, the
// animation lengths, the far pan, the lamp pools, the motes, the tints, timings, a headless walk of the main path, and the
// map tool (tools/maps/ep8_check.mjs through mapcheck's one line) on the test map and on broken fixtures.
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
import { createGame, addMember, serialize } from '../../src/game/state.js';
import { BARKS } from '../../src/data/text.js';
import { compile, initial, read, walkable, changed, covered, states, pages, sideOf, openDir, hasPopbooks, MAX_BOOKS } from '../../src/data/ep8/field/popbooks.js';
import { attach } from '../../src/data/ep8/field/events.js';
import { OPEN_FRAMES, FOLD_FRAMES, ribbonOf } from '../../src/data/ep8/field/system.js';
import { ensureArt, bookSprite, FALLBACK_OBJECTS, FALLBACK_TERRAINS, MOTES, motePixels, moteLuma, PAL } from '../../src/data/ep8/field/art.js';
import { RUBOUT_TINT, VIOLET_TINT, RUBOUT_IN, RUBOUT_OUT, tintedLuma, luma, FLOOR_MIN } from '../../src/data/ep8/field/light.js';
import { TEST_BOOKS } from '../../src/data/ep8/field/_testbooks.js';
import * as world from '../../src/data/ep8/world.js';
import { within } from '../_perf.mjs';

// the fake asset store has no props atlas: the chests' and the slime's own art is not what this file tests
const warn = console.warn;
console.warn = (...a) => { if (!/unknown object "chest_|sprite|atlas/.test(String(a[0]))) warn(...a); };
const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const T = TEST_BOOKS;
const M = compile(T);
const W = T.ground[0].length;
// the pack registers E8-story's text (barks, realm lines) before the world, as index.js does
const story = await import('../../src/data/ep8/text.js');
story.register();
world.register();
const VOID = (x, y) => (T.legend[T.ground[y][x]] === 'void_violet' ? 'void' : 'none');
const ix = (x, y) => y * W + x;

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
    renderer: { createLayer: (w, h) => ({ w, h, ctx, canvas: {} }), shake() {}, W: 384, H: 216, ctx, drawLayer() {}, withAlpha: (a, fn) => fn() },
    audio: { sfx: (id) => sfx.push(id) }, input, settings, stack: [], cave: null,
    after: (n, fn) => fn(), waitFrames: async () => {}, hasScene: () => false,
  };
  if (!game) {
    game = createGame('Arden'); addMember(game, 'mira'); addMember(game, 'bram');
    for (const k of ['ep8_started', 'mira_joined', 'bram_joined']) game.flags[k] = true;
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
  f.pans = [];
  f.camWindow = [192, 108];
  f.camera = {
    x: 0, y: 0, W: 384, H: 216, snapTo() {}, update() {},
    visible(x, y, w, h) { const L = f.leader, cx = L.tx * 16 + 8, cy = L.ty * 16 + 8, [hw, hh] = f.camWindow; return x + w > cx - hw && x < cx + hw && y + h > cy - hh && y < cy + hh; },
    panTo: async (x, y) => { f.pans.push([Math.floor(x / 16), Math.floor(y / 16)]); }, returnTo: async () => {},
  };
  f.lighting = { dark: 0, tintName: 'none', tint: null, tintFade: null, setTint(n) { this.tintName = n; }, draw() {} };
  f.rng = { chance: (p) => (f.frame * 7919 % 100) / 100 < p, pick: (a) => a[(f.frame * 31 + a.length) % a.length] };
  f.bark = (k) => { if (game.counters[`bark:${k}`]) return; f.barks.push(k); game.counters[`bark:${k}`] = 1; };
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
async function frames(f, n, brains = false) { for (let i = 0; i < n; i++) { frame(f, brains); for (let k = 0; k < 6; k++) await Promise.resolve(); } }
const quiet = (f) => !f.leader.moving && !f.inputLocked && !f.books.anim && !f.followers.some((a) => a.moving);
async function settle(f, max = 200) { for (let i = 0; i < max; i++) { await frames(f, 1); if (quiet(f)) return i; } return max; }
async function tap(f, dir) {
  f.engine.input.hold(dir);
  for (let i = 0; i < 4 && !f.leader.moving; i++) await frames(f, 1);
  f.engine.input.release(dir);
  await settle(f);
}
async function walk(f, dirs) { for (const d of dirs) await tap(f, d); }
/** Face a direction without stepping (the cell ahead is a book), then press confirm and let the read finish. */
async function readFacing(f, dir) {
  f.leader.dir = dir;
  f.engine.input.hold('confirm');
  await frames(f, 1);
  f.engine.input.release('confirm');
  await settle(f, 120);
}
const at = (f) => [f.leader.tx, f.leader.ty];
const code = (f, x, y) => f.map.codeAt(x, y);
const S = (f) => f.books.state;
const st = (o) => M.books.map((id) => o[id] || '-').join('');
/** Put a follower on a cell (a lab framing of where the party trails). */
function place(a, x, y) { a.tx = x; a.ty = y; a.x = x * 16; a.y = y * 16; a.moving = false; }

// ---------------------------------------------------------------- the rule
test('rule: the test map compiles: six books, one pair, 405 legal states (729 less the pair both open), all shut on arrival', () => {
  assert.deepEqual(M.errors, []);
  assert.deepEqual([M.W, M.H], [30, 22]);
  assert.deepEqual(M.books, ['a', 'c', 'k', 'l', 'p', 'q']);
  assert.equal(M.pair[M.index.get('p')], M.index.get('q'));
  assert.equal(M.pair[M.index.get('q')], M.index.get('p'));
  assert.equal(initial(M), '------');
  assert.equal(states(M).length, 3 ** 6 - 4 * 3 ** 4);
  assert.ok(states(M).every((s) => !(s[4] !== '-' && s[5] !== '-')), 'a pair never both open');
  assert.equal(M.events.length, 6);
  assert.ok(hasPopbooks(T));
  assert.equal(MAX_BOOKS, 6);
});

test('rule: a read opens away from the reader; pages over void walk, over floor block; a read of an open book shuts it', () => {
  // A from the south (3, 13): its pages stand north over the gap
  let r = read(M, initial(M), 'a', 's', [[3, 13]]);
  assert.ok(r.ok); assert.equal(r.opened, 'a'); assert.equal(r.dir, 'n'); assert.deepEqual(r.closed, []);
  assert.equal(openDir(M, r.state, 'a'), 'n');
  assert.deepEqual(pages(M, r.state, 'a').sort((x, y) => x - y), [ix(3, 8), ix(4, 8), ix(3, 9), ix(4, 9), ix(3, 10), ix(4, 10), ix(3, 11), ix(4, 11)]);
  assert.equal(walkable(M, r.state, VOID, 3, 9), true, 'a page over void is a bridge');
  assert.equal(walkable(M, r.state, VOID, 3, 14), null, 'the other side is not covered: the base decides');
  // K from the south: its pages stand north on the floor, walls; from the north they stand south
  const k1 = read(M, initial(M), 'k', 's', [[6, 17]]);
  assert.equal(k1.dir, 'n');
  assert.equal(walkable(M, k1.state, VOID, 6, 14), false, 'a page over floor is a wall');
  const k2 = read(M, initial(M), 'k', 'n', [[6, 15]]);
  assert.equal(k2.dir, 's');
  assert.equal(walkable(M, k2.state, VOID, 7, 18), false);
  assert.equal(walkable(M, k2.state, VOID, 7, 14), null);
  // an open book read from either long side shuts
  const shut1 = read(M, k2.state, 'k', 'n', [[6, 15]]), shut2 = read(M, k1.state, 'k', 's', [[6, 17]]);
  assert.ok(shut1.ok && shut2.ok);
  assert.equal(shut1.state, initial(M)); assert.equal(shut2.state, initial(M));
  assert.equal(read(M, k1.state, 'k', 'n', [[6, 15]]).refused, 'bridge_under_party', 'standing in its own wall cells: never (a reader there is on pages)');
  assert.deepEqual(shut1.closed, ['k']); assert.equal(shut1.opened, null);
  assert.deepEqual(changed(M, initial(M), k1.state).length, 6);
  // the sides: a short end is no side; unknown books
  assert.equal(sideOf(M, 'k', 6, 17), 's'); assert.equal(sideOf(M, 'k', 7, 15), 'n');
  assert.equal(sideOf(M, 'k', 5, 16), 'end'); assert.equal(sideOf(M, 'k', 8, 16), 'end'); assert.equal(sideOf(M, 'k', 1, 1), null);
  assert.equal(sideOf(M, 'p', 9, 4), 'w'); assert.equal(sideOf(M, 'p', 11, 3), 'e');
  assert.equal(read(M, initial(M), 'k', 'e', []).refused, 'side');
  assert.equal(read(M, initial(M), 'z', 's', []).refused, 'unknown');
});

test('rule: the three refusals change nothing: a wall on the party, a bridge from under it, pages onto a foe or trigger', () => {
  const s0 = initial(M);
  const w = read(M, s0, 'k', 's', [[6, 17], [6, 14]]);
  assert.equal(w.ok, false); assert.equal(w.refused, 'wall_on_party'); assert.equal(w.state, s0, 'the same state');
  const a = st({ a: 'n' });
  const b = read(M, a, 'a', 'n', [[3, 11], [3, 10], [3, 9]]);
  assert.equal(b.refused, 'bridge_under_party');
  assert.equal(read(M, a, 'a', 's', [[3, 13], [3, 9]]).refused, 'bridge_under_party', 'a follower still on the bridge');
  assert.equal(read(M, a, 'a', 's', [[3, 13], [2, 13]]).ok, true, 'everyone on ground: fine');
  const o = read(M, s0, 'k', 's', [[6, 17]], [[7, 14]]);
  assert.equal(o.refused, 'onto_actor');
  assert.equal(read(M, s0, 'k', 's', [[6, 17]], [[2, 18]]).ok, true, 'a foe elsewhere does not matter');
  assert.equal(read(M, s0, 'k', 's', [ix(6, 17), ix(7, 13)]).refused, 'wall_on_party', 'party cells may be cell indices');
});

test('rule: pairs: opening one shuts the other first (one read); refused when the folding pair is under the party', () => {
  const p = read(M, initial(M), 'p', 'w', [[9, 3]]);
  assert.equal(p.state, st({ p: 'e' }));
  const q = read(M, p.state, 'q', 'w', [[16, 5], [16, 4], [15, 4]]);
  assert.ok(q.ok); assert.equal(q.opened, 'q'); assert.deepEqual(q.closed, ['p']);
  assert.equal(q.state, st({ q: 'e' }), 'P folded');
  assert.equal(walkable(M, q.state, VOID, 12, 3), null, 'P\'s bridge is void again');
  assert.equal(read(M, p.state, 'q', 'w', [[16, 5], [15, 4], [14, 4]]).refused, 'bridge_under_party', 'a follower still on P\'s bridge');
  // closing a pair does not open its partner
  const qs = read(M, q.state, 'q', 'w', [[16, 5]]);
  assert.equal(qs.state, initial(M));
});

test('rule: deterministic and pure (no timers, no randomness); realms and names never enter the rule', () => {
  const plain = compile({ ...T, popbooks: { ...T.popbooks, books: Object.fromEntries(Object.entries(T.popbooks.books).map(([k, v]) => [k, { ...v, realm: undefined }])) } });
  for (const s of states(M)) for (const id of M.books) for (const side of ['n', 's', 'e', 'w']) {
    const a = read(M, s, id, side, [[3, 13]]), b = read(plain, s, id, side, [[3, 13]]);
    assert.deepEqual([a.ok, a.state, a.refused], [b.ok, b.state, b.refused]);
  }
  const src = fs.readFileSync(path.join(NEXT, 'src', 'data', 'ep8', 'field', 'popbooks.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/Math\.random|setTimeout|setInterval|Date\.now|performance/.test(src), 'popbooks.js is pure');
  const readFn = src.slice(src.indexOf('export function read('), src.indexOf('export function covered('));
  assert.ok(!/realm|\.name\b/.test(readFn), 'read() never looks at a realm or a name');
});

test('rule: parse errors: axis, length, one owner a cell, a page on a book, pairs, events, start, seven books', () => {
  const g = ['__________', '__________', '__________', '__________', '__________'];
  const base = (books, events, extra = {}) => ({ id: 'fx', ground: g, legend: { _: 'void_violet' }, popbooks: { books, ...extra }, events });
  const ev = (b, x, y, id = 'pb_' + b) => ({ id, type: 'popbook', book: b, x, y });
  const errs = (mod) => compile(mod).errors.join('\n');
  assert.match(errs(base({ a: { x: 1, y: 1, axis: 'up', length: 2 } }, [ev('a', 1, 1)])), /axis "up"/);
  assert.match(errs(base({ a: { x: 1, y: 1, axis: 'ns', length: 0 } }, [ev('a', 1, 1)])), /length 0/);
  assert.match(errs(base({ a: { x: 1, y: 2, axis: 'ns', length: 2 }, b: { x: 4, y: 1, axis: 'ew', length: 2 } }, [ev('a', 1, 2), ev('b', 4, 1)])), /page cell of books a and b|its w pages lie on book a|lie on book/);
  assert.match(errs(base({ a: { x: 1, y: 2, axis: 'ns', length: 3 } }, [ev('a', 1, 2)])), /run off the map/);
  assert.match(errs(base({ a: { x: 1, y: 2, axis: 'ns', length: 1, pair: 'z' } }, [ev('a', 1, 2)])), /pair "z"/);
  assert.match(errs(base({ a: { x: 1, y: 2, axis: 'ns', length: 1, pair: 'b' }, b: { x: 6, y: 2, axis: 'ns', length: 1, pair: 'c' }, c: { x: 6, y: 0, axis: 'ew', length: 1 } }, [ev('a', 1, 2), ev('b', 6, 2), ev('c', 6, 0)])), /pairs c/);
  assert.match(errs(base({ a: { x: 1, y: 2, axis: 'ns', length: 1 } }, [])), /book "a" has no popbook event/);
  assert.match(errs(base({ a: { x: 1, y: 2, axis: 'ns', length: 1 } }, [ev('a', 2, 2)])), /at 2,2, but book a is at 1,2/);
  assert.match(errs(base({ a: { x: 1, y: 2, axis: 'ns', length: 1 } }, [ev('a', 1, 2), ev('a', 1, 2, 'pb_x')])), /two events/);
  assert.match(errs(base({ a: { x: 1, y: 2, axis: 'ns', length: 1 } }, [ev('a', 1, 2)], { start: { a: 'e' } })), /opens n or s/);
  assert.match(errs(base({ a: { x: 1, y: 2, axis: 'ns', length: 1, pair: 'b' }, b: { x: 6, y: 2, axis: 'ns', length: 1 } }, [ev('a', 1, 2), ev('b', 6, 2)], { start: { a: 'n', b: 's' } })), /both open/);
  const seven = Object.fromEntries('abcdefg'.split('').map((c, i) => [c, { x: i, y: 1, axis: 'ew', length: 1 }]));
  assert.match(errs({ ...base(seven, 'abcdefg'.split('').map((c, i) => ev(c, i, 1))), ground: Array(5).fill('_'.repeat(20)) }), /7 books \(at most 6/);
  assert.equal(compile({ id: 'none', ground: ['.'] }), null);
});

test('rule: timing: compile, a read and a full walkability sweep of a 40 x 40 map with 6 books, under 1 ms', () => {
  const G = Array.from({ length: 40 }, () => '_'.repeat(40));
  const books = {}, events = [];
  for (let k = 0; k < 6; k++) { const id = 'abcdef'[k]; books[id] = { x: 2 + k * 6, y: 18, axis: 'ns', length: 6, pair: k % 2 ? 'abcdef'[k - 1] : undefined }; events.push({ id: 'pb_' + id, type: 'popbook', book: id, x: 2 + k * 6, y: 18 }); }
  const mod = { id: 'fx40', ground: G, legend: { _: 'void_violet' }, popbooks: { books }, events };
  const m = compile(mod);
  assert.deepEqual(m.errors, []);
  const party = [[1, 1], [1, 2], [1, 3]];
  const base = () => 'void';
  const r1 = within(1, () => {
    const t0 = performance.now();
    let s = initial(m);
    for (let k = 0; k < 24; k++) { const r = read(m, s, 'abcdef'[k % 6], k % 4 < 2 ? 's' : 'n', party); s = r.state; changed(m, initial(m), s); }
    return (performance.now() - t0) / 24;
  });
  assert.ok(r1.ok, r1.msg('a read and its recompute'));
  const r2 = within(1, () => {
    const t0 = performance.now();
    const cold = compile(mod);
    let c = 0; const s = 'n-s-n-';
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (walkable(cold, s, base, x, y)) c++;
    return performance.now() - t0;
  });
  assert.ok(r2.ok, r2.msg('a cold compile and a full sweep'));
  console.log(`  # popbooks.js 40x40, 6 books: ${r1.best.toFixed(4)} ms a read, ${r2.best.toFixed(4)} ms compile + sweep`);
});

// ---------------------------------------------------------------- the field
test('field: arrival: every book shut and solid, every page cell its own code, the Lantern book faint, the stand-in books', () => {
  const f = makeField();
  assert.ok(f.books.active);
  assert.equal(S(f), '------');
  for (const i of M.def[0].pagesOf.n) assert.equal(f.map.base[(i / W) | 0][i % W], 'void');
  assert.equal(code(f, 3, 12), 'solid'); assert.equal(code(f, 4, 12), 'solid', 'both cells of a book are solid');
  assert.equal(code(f, 6, 14), 'none', 'K\'s pages are plain floor while it is shut');
  assert.equal(f.entities.get('pb_a').prop.t, 'ep8w_book_ns');
  assert.equal(f.entities.get('pb_p').prop.t, 'ep8w_book_ew');
  assert.equal(f.entities.get('pb_a').prop.state, 0, 'ivory ribbon, shut');
  assert.equal(f.entities.get('pb_p').prop.state, 4 * ribbonOf(T, 'p'), 'the pair\'s ribbon colour');
  assert.ok(f.entities.get('pb_l').prop.alpha < 0.5, 'the Keeper-ink book is faint until the Lantern finds it');
  assert.deepEqual(f.entities.get('pb_a').cells.length, 2, 'facing either half reads it');
});

test('field: a read and a crossing: confirm at A from the south, its pages stand north, the party walks the bridge to N', async () => {
  const f = makeField(T, null, {}, [3, 13, 'up']);
  await readFacing(f, 'up');
  assert.equal(S(f), st({ a: 'n' }));
  assert.ok(f.sfx.includes('page_open'));
  assert.ok(f.barks.includes('first_open'));
  assert.equal(f.books.line && f.books.line.text, 'WILLOWMERE. The willow stands up out of the page.', 'the realm line, once');
  for (const i of M.def[0].pagesOf.n) assert.equal(f.map.codeAt(i % W, (i / W) | 0), 'none');
  assert.equal(f.entities.get('pb_a').prop.state, 3, 'open frame');
  await walk(f, ['left', 'up', 'up', 'right', 'up', 'up', 'up', 'up']);
  assert.deepEqual(at(f), [3, 7], 'across the void on the bridge');
  assert.ok(f.books.lastRead.ms < 1, `read recompute ${f.books.lastRead.ms} ms`);
});

test('field: a bridge is never taken from under the party: read A from its own bridge, refused; the bark once, then a line', async () => {
  const f = makeField(T, null, {}, [3, 13, 'up']);
  await readFacing(f, 'up');
  await walk(f, ['left', 'up', 'up', 'right']);
  assert.deepEqual(at(f), [3, 11]);
  const sfx0 = f.sfx.length;
  await readFacing(f, 'down');
  assert.equal(S(f), st({ a: 'n' }), 'nothing changed');
  assert.equal(f.books.lastRead.refused, 'bridge_under_party');
  assert.ok(f.sfx.slice(sfx0).includes('buzzer'));
  assert.ok(f.barks.includes('would_fold'));
  await readFacing(f, 'down');
  assert.equal(f.books.line.text, "Not while we're standing on it.");
  assert.equal(f.barks.filter((b) => b === 'would_fold').length, 1);
});

test('field: the side decides the way: K from the south stands north, from the north stands south; walls; a short end', async () => {
  const f = makeField(T, null, {}, [6, 17, 'up']);
  await readFacing(f, 'up');
  assert.equal(S(f), st({ k: 'n' }));
  for (const [x, y] of [[6, 13], [7, 13], [6, 15], [7, 15]]) assert.equal(code(f, x, y), 'solid', `${x},${y} a wall`);
  assert.ok(f.barks.includes('first_wall'));
  assert.ok(!f.barks.includes('first_open'), 'no bridge, so not first_open');
  await readFacing(f, 'up');
  assert.equal(S(f), '------', 'read again from the south: it shuts');
  assert.ok(f.sfx.includes('page_fold'));
  await walk(f, ['right', 'right', 'up', 'up', 'left']);
  assert.deepEqual(at(f), [7, 15]);
  await readFacing(f, 'down');
  assert.equal(S(f), st({ k: 's' }), 'from the north: south');
  assert.equal(code(f, 7, 18), 'solid'); assert.equal(code(f, 7, 14), 'none');
  // the short end: nothing changes; Mira says why once
  const g = makeField(T, null, {}, [5, 16, 'right']);
  await readFacing(g, 'right');
  assert.equal(S(g), '------');
  assert.equal(g.books.lastRead.refused, 'side');
  assert.ok(g.barks.includes('first_side'));
  await readFacing(g, 'right');
  assert.equal(g.books.line.text, 'Read it from a long side.');
});

test('field: a wall never lands on the party (wall_on_party) and pages never open onto a foe (onto_actor)', async () => {
  const f = makeField(T, null, {}, [6, 17, 'up']);
  place(f.followers[0], 6, 14);
  await readFacing(f, 'up');
  assert.equal(f.books.lastRead.refused, 'wall_on_party');
  assert.equal(S(f), '------');
  const g = makeField(T, null, {}, [6, 17, 'up']);
  const slime = g.entities.get('slime_s').actor;
  place(slime, 7, 14);
  await readFacing(g, 'up');
  assert.equal(g.books.lastRead.refused, 'onto_actor');
  assert.equal(S(g), '------');
  assert.ok(g.sfx.includes('buzzer'));
});

test('field: a pair swaps: Q read from the island shuts P behind the party; refused while a follower is on P\'s bridge', async () => {
  const f = makeField(T, null, {}, [16, 5, 'right']);
  f.books.setState({ p: 'e' });
  assert.equal(code(f, 12, 3), 'none', 'P\'s bridge stands');
  await readFacing(f, 'right');
  assert.equal(S(f), st({ q: 'e' }));
  assert.deepEqual(f.books.lastRead.closed, ['p']);
  assert.equal(code(f, 12, 3), 'void', 'P folded');
  assert.equal(code(f, 19, 5), 'none', 'Q bridges to E1');
  assert.ok(f.sfx.includes('page_open') && f.sfx.includes('page_fold'));
  assert.ok(f.barks.includes('first_pair'));
  assert.equal(f.entities.get('pb_p').prop.state % 4, 0, 'P shut');
  const g = makeField(T, null, {}, [16, 5, 'right']);
  g.books.setState({ p: 'e' });
  place(g.followers[1], 14, 4);
  await readFacing(g, 'right');
  assert.equal(g.books.lastRead.refused, 'bridge_under_party');
  assert.equal(S(g), st({ p: 'e' }));
});

test('field: one book, a bridge and a wall: C from the north bridges the gap and stands on E2\'s floor', async () => {
  const f = makeField(T, null, {}, [24, 5, 'down']);
  await readFacing(f, 'down');
  assert.equal(S(f), st({ c: 's' }));
  assert.deepEqual([code(f, 24, 7), code(f, 25, 8)], ['none', 'none']);
  assert.deepEqual([code(f, 24, 9), code(f, 25, 10)], ['solid', 'solid']);
  assert.ok(f.barks.includes('first_open') && f.barks.includes('first_wall'));
  await walk(f, ['left', 'down', 'down', 'right', 'down', 'right', 'right', 'down']);
  assert.deepEqual(at(f), [26, 9], 'off by the far ledge, round the wall');
});

test('field: the ghost: facing a shut book from a long side shows its pages-to-be; an open one the cells that clear', async () => {
  const f = makeField(T, null, {}, [3, 13, 'up']);
  await frames(f, 1);
  let gh = f.books.ghost;
  assert.ok(gh && gh.mode === 'open' && gh.cells.length === 8);
  assert.ok(gh.cells.includes(ix(3, 8)) && !gh.cells.includes(ix(3, 14)), 'away from the reader');
  await readFacing(f, 'up');
  await frames(f, 1);
  gh = f.books.ghost;
  assert.ok(gh && gh.mode === 'clear' && gh.cells.length === 8);
  const g = makeField(T, null, {}, [5, 16, 'right']);
  await frames(g, 1);
  assert.equal(g.books.ghost, null, 'a short end shows nothing');
  const h = makeField(T, null, {}, [26, 12, 'down']);
  await frames(h, 1);
  assert.equal(h.books.ghost, null, 'a book in Keeper ink shows nothing until found');
});

test('field: `start` states on arrival; re-entry resets; no new save field; a save on a bridge reloads on ground', async () => {
  const opened = { ...T, id: 'ep8_teststart', popbooks: { ...T.popbooks, start: { a: 'n', p: 'e' } } };
  const s = makeField(opened);
  assert.equal(S(s), st({ a: 'n', p: 'e' }));
  assert.equal(code(s, 3, 9), 'none');
  const f = makeField(T, null, {}, [3, 13, 'up']);
  const keys0 = Object.keys(serialize(f.game)).sort();
  await readFacing(f, 'up');
  await walk(f, ['left', 'up', 'up', 'right', 'up', 'up']);
  assert.deepEqual(at(f), [3, 9], 'on the bridge');
  const save = serialize(f.game);
  assert.deepEqual(Object.keys(save).sort(), keys0, 'no new save field');
  assert.ok(!JSON.stringify(save).includes('"n-----"'), 'the state is not in the save');
  const g = makeField(T, save, {}, [save.pos.x, save.pos.y, save.pos.dir]);
  assert.equal(S(g), '------', 'the authored state on arrival');
  assert.ok(g.books.rescued, 'rescued');
  const [x, y] = at(g);
  assert.equal(g.map.codeAt(x, y), 'none');
  assert.equal(M.owner[ix(x, y)] >= 0 && covered(M, S(g), ix(x, y)), false);
  assert.ok(Math.abs(x - 3) + Math.abs(y - 9) <= 4, `the nearest ground (${x}, ${y})`);
  assert.deepEqual([g.game.pos.x, g.game.pos.y], [x, y]);
  // a save beside a wall that `start` raises: woken on ground too
  const walled = { ...T, id: 'ep8_testwalled', popbooks: { ...T.popbooks, start: { k: 'n' } } };
  const h = makeField(walled, null, {}, [6, 14, 'down']);
  assert.ok(h.books.rescued);
  assert.equal(h.map.codeAt(...at(h)), 'none');
});

test('field: a foe never stands on a page cell, open or shut', async () => {
  const f = makeField(T, null, {}, [4, 19, 'up']);
  const slime = f.entities.get('slime_s').actor;
  assert.ok(slime && slime.kind === 'enemy');
  assert.equal(f.canStep(slime, 5, 14, 6, 14, 'right'), false, 'a shut book\'s page cell is closed to a foe');
  assert.equal(f.canStep(f.leader, 5, 14, 6, 14, 'right'), true, 'and open to the party');
  slime.brain.home = [5, 15]; slime.brain.radius = 4; slime.brain.stepRule = 'free';   // a dungeon foe answers steps: let it walk on its own clock
  let onPage = 0, moved = 0;
  for (let i = 0; i < 2400; i++) {
    frame(f, true);
    if (M.owner[ix(slime.tx, slime.ty)] >= 0) onPage++;
    if (slime.moving) moved++;
  }
  assert.ok(moved > 20, `the slime wandered (${moved} moving frames)`);
  assert.equal(onPage, 0);
});

test('field: the Keeper-ink book: unreadable until the Lantern finds it, then an ordinary book', async () => {
  const f = makeField(T, null, {}, [26, 12, 'down']);
  f.game.items.lantern_of_recall = 1;
  assert.equal(f.hiddenInkNear(), true, 'the Lantern hint knows it');
  await readFacing(f, 'down');
  assert.equal(S(f), '------');
  assert.equal(f.books.line.text, 'The ink is too pale to read.');
  f.lantern = 100;
  await frames(f, 1);
  f.lantern = 0;
  assert.equal(f.hiddenInkNear(), false);
  assert.equal(f.entities.get('pb_l').prop.alpha, 1);
  await readFacing(f, 'down');
  assert.equal(S(f), st({ l: 's' }));
  assert.equal(code(f, 26, 16), 'none');
  const g = makeField(T, f.game, {}, [26, 12, 'down']);
  assert.equal(g.entities.get('pb_l').prop.alpha, 1, 'found for good');
  assert.equal(S(g), '------');
});

test('field: a direction held across a read neither drops nor adds a step', async () => {
  const f = makeField(T, null, {}, [3, 13, 'up']);
  const input = f.engine.input;
  input.hold('confirm');
  await frames(f, 1);
  input.release('confirm');
  assert.ok(f.books.anim && f.inputLocked > 0, 'the read holds input for its animation');
  await frames(f, 3);
  input.hold('down');
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
  while (f.stepCount < steps0 + 2) await frames(f, 1);
  input.release('down');
  await settle(f);
  assert.equal(f.stepCount, steps0 + 2, 'no extra step after the release');
  assert.deepEqual(at(f), [3, 16], 'three cells down: the first step and two more');
  assert.equal(S(f), st({ a: 'n' }));
});

test('field: the open lasts 16 frames, the fold 12; reduceMotion makes both instant and draws no motes', async () => {
  const f = makeField(T, null, {}, [6, 17, 'up']);
  f.engine.input.hold('confirm'); await frames(f, 1); f.engine.input.release('confirm');
  let n = 0;
  while (f.books.anim) { await frames(f, 1); n++; }
  assert.ok(n >= OPEN_FRAMES - 1 && n <= OPEN_FRAMES + 1, `open ${n} frames`);
  await settle(f);
  f.engine.input.hold('confirm'); await frames(f, 1); f.engine.input.release('confirm');
  n = 0;
  while (f.books.anim) { await frames(f, 1); n++; }
  assert.ok(n >= FOLD_FRAMES - 1 && n <= FOLD_FRAMES + 1, `fold ${n} frames`);
  assert.equal(OPEN_FRAMES, 16); assert.equal(FOLD_FRAMES, 12);
  const g = makeField(T, null, { reduceMotion: true }, [6, 17, 'up']);
  g.engine.input.hold('confirm'); await frames(g, 1); g.engine.input.release('confirm');
  assert.equal(g.books.anim, null);
  assert.equal(S(g), st({ k: 'n' }));
  await frames(g, 1);
  assert.equal(g.inputLocked, 0);
  assert.equal(g.books.moteFrameNow(), null, 'no motes under reduceMotion');
});

test('field: a change more than 6 tiles off and off screen pans the camera to it (confirm skips)', async () => {
  const f = makeField(T, null, {}, [16, 5, 'right']);
  f.books.setState({ p: 'e' });
  f.camWindow = [40, 40];
  await readFacing(f, 'right');
  assert.equal(S(f), st({ q: 'e' }));
  assert.ok(f.books.lastRead.far >= 1, `far cells ${f.books.lastRead.far}`);
  assert.deepEqual(f.pans, [[11, 3]], 'panned to P\'s folding page');
  const g = makeField(T, null, {}, [3, 13, 'up']);
  await readFacing(g, 'up');
  assert.deepEqual(g.pans, [], 'a near change does not pan');
});

test('field: on a dark map a warm pool over every open book and along its bridge; none in daylight', () => {
  const f = makeField({ ...T, id: 'ep8_testdark', lighting: { tint: 'none', dark: 0.3 } });
  f.lighting.dark = 0.3;
  f.books.setState({ a: 'n', c: 's' });
  const L = f.books.lights();
  assert.ok(L.length >= 4, `${L.length} lights`);
  assert.ok(L.some((l) => l.r === 40 && Math.abs(l.x - (3 * 16 + 16)) < 1), 'a pool on A');
  f.lighting.dark = 0;
  assert.deepEqual(f.books.lights(), []);
});

test('field: drawing: the motes only over uncovered void, paused under rubout; pages and the ghost draw; timings', async () => {
  let draws = 0, fills = 0;
  const g = new Proxy({}, { get: (t, k) => (k === 'drawImage' ? () => { draws++; } : k === 'fillRect' ? () => { fills++; } : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  const f = makeField(T, null, {}, [3, 13, 'up']);
  f.books.setState({ a: 'n' });
  f.frame = 30;
  await frames(f, 1);
  f.camera.x = 0; f.camera.y = 0;
  f.books.drawLow({ ctx: g, W: 384, H: 216 });
  assert.equal(f.books.moteFrame, 1);
  assert.ok(draws >= 8, `the bridge pages drawn (${draws})`);
  assert.ok(fills > 40, `the motes (one fill a run of void) and the ghost drew (${fills})`);
  f.lighting.tintName = 'rubout';
  assert.equal(f.books.moteFrameNow(), 0, 'paused under rubout');
  f.lighting.tintName = 'none';
  const r = within(3, () => { const best = []; for (let k = 0; k < 5; k++) { const t0 = performance.now(); f.books.drawLow({ ctx: g, W: 384, H: 216 }); best.push(performance.now() - t0); } return Math.min(...best); });
  assert.ok(r.ok, r.msg('the book layer draw (fake canvas)'));
  f.books.stats.maxUpdateMs = 0;
  for (let i = 0; i < 300; i++) frame(f);
  assert.ok(f.books.stats.maxUpdateMs < 3, `${f.books.stats.maxUpdateMs} ms`);
});

test('walk: the test map headless, start to the goal: A, cross, P, cross, Q (P folds), cross, C, the ledge, the chest', async () => {
  const f = makeField();
  await walk(f, ['up', 'up', 'up', 'up', 'up', 'left']);
  assert.deepEqual(at(f), [3, 14]);
  await walk(f, ['up']);
  assert.deepEqual(at(f), [3, 13]);
  await readFacing(f, 'up');
  await walk(f, ['left', 'up', 'up', 'right', 'up', 'up', 'up', 'up']);
  assert.deepEqual(at(f), [3, 7]);
  await walk(f, ['right', 'right', 'right', 'right', 'right', 'right', 'up', 'up', 'up']);
  assert.deepEqual(at(f), [9, 4]);
  await readFacing(f, 'right');
  await walk(f, ['down', 'right', 'right', 'up', 'right', 'right', 'right', 'right', 'right', 'down']);
  assert.deepEqual(at(f), [16, 5]);
  await readFacing(f, 'right');
  assert.equal(S(f), st({ a: 'n', q: 'e' }), 'A still stands behind; P folded');
  await walk(f, ['down', 'down', 'right', 'right', 'up', 'right', 'right', 'right', 'right', 'right', 'up', 'right']);
  assert.deepEqual(at(f), [24, 5]);
  await readFacing(f, 'down');
  await walk(f, ['left', 'down', 'down', 'right', 'down', 'right', 'right', 'down', 'down', 'right', 'right']);
  assert.deepEqual(at(f), [28, 10], 'beside chest_e');
  assert.equal(f.books.reads, 4, 'four decisions');
});

// ---------------------------------------------------------------- tints, motes, art, barks
test('tints: rubout and violet registered, lamps light under both; the party floor stays at or above 0.22 (estimated)', () => {
  assert.equal(TINTS.rubout, RUBOUT_TINT);
  assert.equal(TINTS.violet, VIOLET_TINT);
  for (const id of ['rubout', 'violet']) assert.ok(NIGHT_TINTS.has(id) && LAMP_TINTS.has(id), id);
  assert.deepEqual([RUBOUT_IN, RUBOUT_OUT], [120, 60]);
  const marble = PAL.marble.base;
  assert.ok(tintedLuma(marble, RUBOUT_TINT) >= FLOOR_MIN, `marble under rubout ${tintedLuma(marble, RUBOUT_TINT).toFixed(3)}`);
  assert.ok(tintedLuma(marble, VIOLET_TINT, 0.2) >= FLOOR_MIN, `marble under violet at dark 0.2 ${tintedLuma(marble, VIOLET_TINT, 0.2).toFixed(3)}`);
  // the readability pairs of plan 5.1, from the recipe (the lab measures the real frame)
  assert.ok(luma(PAL.paper.base) - luma(PAL.void.base) >= 0.35, 'page against void');
  assert.ok(luma(marble) - luma(PAL.void.base) >= 0.12, 'void below floor');
  assert.ok(luma(PAL.ghost.gold) - luma(PAL.void.base) >= 0.15, 'ghost against void');
  assert.ok(luma(marble) - luma(PAL.ghost.dark) >= 0.15, 'ghost against floor (its dark edge)');
});

test('motes: 3 frames, one every 30 game frames; one mote adds at most 0.03 luma, so no pixel jumps more between frames', () => {
  assert.deepEqual([MOTES.frames, MOTES.every], [3, 30]);
  assert.ok(moteLuma() <= MOTES.limit, `a mote adds ${moteLuma().toFixed(4)} luma (limit ${MOTES.limit})`);
  const sets = [0, 1, 2].map((k) => new Set(motePixels(k).map(([x, y]) => `${x},${y}`)));
  assert.ok(sets.every((s) => s.size >= MOTES.count), 'the motes are there');
  assert.notDeepEqual([...sets[0]], [...sets[1]], 'they move');
  // a pixel is lit by at most one mote in a frame, so between two frames it changes by 0 or one mote's light
  for (let k = 0; k < 3; k++) assert.equal(new Set(motePixels(k).map(String)).size, motePixels(k).length);
});

test('art: stand-ins fill only missing ids (E8-tiles wins); the void is void and lowest; books are solid with 16 frames', () => {
  const db = { terrains: { marble_page: { mine: true } }, objects: {}, terrainOrder: ['grass'] };
  const added = ensureArt(db);
  assert.ok(added.includes('void_violet') && !added.includes('marble_page'));
  assert.equal(db.terrains.marble_page.mine, true, 'never replaced');
  assert.equal(db.terrainOrder[0], 'void_violet');
  assert.equal(db.terrains.void_violet.collision, 'void');
  for (const id of FALLBACK_OBJECTS) { assert.equal(db.objects[id].frames.length, 16); assert.equal(db.objects[id].collision, 'solid'); assert.equal(db.objects[id].footprint.length, 2); }
  assert.deepEqual(FALLBACK_TERRAINS, ['void_violet', 'marble_page']);
  // E8-tiles' ids win: popbook_ns / popbook_ew, or popbook when its footprint has the orientation
  assert.equal(bookSprite({ objects: { popbook_ew: {} } }, 'ew'), 'popbook_ew');
  assert.equal(bookSprite({ objects: { popbook: { footprint: [[0, 0], [1, 0]] } } }, 'ns'), 'popbook');
  assert.equal(bookSprite({ objects: { popbook: { footprint: [[0, 0], [1, 0]] } } }, 'ew'), 'ep8w_book_ew');
  assert.equal(bookSprite({ objects: { x: {} } }, 'ns', { sprite: 'x' }), 'x');
  // pairs share a ribbon colour, unpaired books are ivory
  assert.equal(ribbonOf(T, 'a'), 0);
  assert.equal(ribbonOf(T, 'p'), ribbonOf(T, 'q'));
  assert.ok(ribbonOf(T, 'p') > 0);
});

test('barks: the book barks and realm lines are E8-story\'s (text.js), the world keeps no copy; the test map is registered', async () => {
  assert.equal(world.BOOK_BARKS, undefined, 'no placeholder barks in world.js');
  for (const id of world.BOOK_BARK_IDS) {
    assert.equal(BARKS[id], story.EP8_BARKS[id], id);
    for (const b of BARKS[id]) for (const l of b.lines) assert.ok(!/\u2014/.test(l.text), `${id}: no em dash`);
  }
  // every realm a map may name has its line under the key the field reads by default (ep8_realm_<realm>)
  const { LINES } = await import('../../src/game/story.js');
  for (const realm of ['willowmere', 'hollow', 'emberpeak', 'valewyn', 'desert', 'isles', 'north']) {
    const key = `ep8_realm_${realm}`;
    assert.ok(Object.values(story.EP8_REALMS).some((r) => r.key === key), key);
    assert.equal(typeof LINES[key], 'string', key);
  }
  assert.deepEqual(world.TEST_MAP_IDS, ['ep8_testbooks']);
  assert.ok(EV.EXT.popbook && EV.INTERACT_TYPES.has('popbook'));
});

// ---------------------------------------------------------------- the map tool
const mc = await import('../../tools/maps/mapcheck.mjs');
const ck = await import('../../tools/maps/ep8_check.mjs');
const db = await mc.loadDb();

test('mapcheck: the test map: 0 errors, every chest reached, 4 decisions, nothing stranded, through mapcheck\'s one line', () => {
  const r = mc.walk(T, db);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(mc.buildGrid(T, db).errors, []);
  assert.deepEqual(r.unreached, []);
  assert.equal(r.books.decisions, 4);
  assert.deepEqual(r.books.solution.map((s) => s.split('@')[0]), ['pb_a', 'pb_p', 'pb_q', 'pb_c']);
  assert.ok(r.books.steps <= 1.3 * r.books.straight);
  assert.equal(r.books.stranded, 0);
  assert.ok(r.books.states <= r.books.legal && r.books.legal === 405);
  const src = fs.readFileSync(path.join(NEXT, 'tools', 'maps', 'mapcheck.mjs'), 'utf8');
  assert.equal(src.split('\n').filter((l) => l.includes('ep8_check.mjs')).length, 1, 'one line in mapcheck.mjs');
});

test('mapcheck: broken fixtures: stranding, a foe and a chest on pages, a book on void, a reading cell on another\'s pages, budget, arrival', () => {
  const errs = (mod, o = {}) => ck.analyse(mod, db, o).errors.join('\n');
  // without the way back, the island and E1 strand the party once Q has shut P
  assert.match(errs({ ...T, id: 'fx_lone', events: T.events.filter((e) => e.id !== 'way_back') }), /softlock/);
  assert.match(errs({ ...T, id: 'fx_foe', events: [...T.events, { id: 'slime_p', type: 'enemy', x: 6, y: 14, sprite: 'ink_slime', encounter: 'valley_slimes', move: 'wander' }] }), /enemy slime_p stands on a page cell/);
  assert.match(errs({ ...T, id: 'fx_chest', events: [...T.events, { id: 'chest_p', type: 'chest', x: 7, y: 18, tier: 'wood', item: 'potion' }] }), /chest chest_p stands on a page cell/);
  const voidBook = { ...T, id: 'fx_void', ground: T.ground.map((r, y) => (y === 16 ? r.slice(0, 6) + '__' + r.slice(8) : r)) };
  assert.match(errs(voidBook), /popbook pb_k: its cell 6,16 is void, not ground/);
  const cross = { ...T, id: 'fx_cross', popbooks: { ...T.popbooks, books: { ...T.popbooks.books, k: { x: 3, y: 16, axis: 'ns', length: 1 } } }, events: T.events.map((e) => (e.id === 'pb_k' ? { ...e, x: 3, y: 16 } : e)) };
  assert.match(errs(cross), /page cell of books a and k|reading cell .* is a page cell of book a/);
  assert.match(errs({ ...T, id: 'fx_over', popbooks: { ...T.popbooks, budget: 3 } }), /4 decisions on the critical path, plan 4.10 allows 3 \(traded\)/);
  assert.equal(ck.analyse({ ...T, id: 'ep8_stair' }, db, {}).report.books.budget, 4, 'the plan figure by map id');
  assert.match(errs({ ...T, id: 'fx_arrive', start: { x: 6, y: 14, dir: 'up' } }), /arrival start at 6,14 is on a page cell/);
  assert.match(errs({ ...T, id: 'fx_goal', popbooks: { ...T.popbooks, goal: ['nowhere'] } }), /goal "nowhere" is not a mark/);
  assert.deepEqual(ck.PLAN_BUDGET, { ep8_stair: 4, ep8_library_f1: 4, ep8_library_f2: 4, ep8_library_f3: 4 });
  assert.equal(Object.values(ck.PLAN_BUDGET).reduce((a, b) => a + b, 0), ck.TOTAL_BUDGET);
  assert.equal(ck.budgetTotal({ a: { decisions: 9 }, b: { decisions: 8 } }).ok, false);
});

test('mapcheck: the grid comes only from the events present under the flags searched; no flags means none set', () => {
  // a crate on N's lateral step, present only with `crate_down`: without the flag the path is open, with it the bridge to P
  // can not be stepped on and the critical path fails; an `ifNot` crate is the reverse
  const crate = (extra) => ({ ...T, id: 'ep8_fx_crate', events: [...T.events, { id: 'crate', type: 'object', x: 11, y: 5, sprite: 'crate', text: 'x', ...extra }] });
  const a = crate({ if: 'crate_down' });
  assert.deepEqual(ck.analyse(a, db, {}).errors, [], 'no flags: the crate is not there');
  assert.match(ck.analyse(a, db, { flags: ['crate_down'] }).errors.join('\n'), /never reaches "goal_e"|softlock|not reachable/);
  const b = crate({ ifNot: 'crate_gone' });
  assert.match(ck.analyse(b, db, {}).errors.join('\n'), /never reaches "goal_e"|softlock|not reachable/, 'no flags: an ifNot crate stands');
  assert.deepEqual(ck.analyse(b, db, { flags: ['crate_gone'] }).errors, []);
});

test('mapcheck: no solution reads out of order into a softlock: every reachable state still reaches the entrance', () => {
  const r = ck.analyse(T, db, {}).report;
  assert.equal(r.books.stranded, 0);
  assert.ok(r.books.nodes > 1000, `${r.books.nodes} nodes searched`);
  // the order trap: if the door home is gone AND P could still be shut by Q, a player who reads Q first strands; caught
  const lone = ck.analyse({ ...T, id: 'fx_order', events: T.events.filter((e) => e.id !== 'way_back') }, db, {});
  assert.ok(lone.report.books.stranded > 0);
});

test('mapcheck: the camera rule reads STAGING_EP8 focus marks; a loop home is caught', () => {
  // STAGING_EP8's own format: "(W x H: band): `mark` (x, y: left, right, top, bottom), ..." over wrapped lines, a note's name
  // in parentheses is not a mark, and the list ends at the next bullet
  const md = '- Focus marks, `ep8_fx` (40 x 30: x 12 to 27, y 7 to 22): `near` (3, 15: 3, 36, 15, 14), `mid`\n'
    + '  (20, 15: 20, 19, 15, 14), `far` (20, 2: 20, 19, 2, 27). (`trig` at y 1 is a trigger, not a focus.)\n- `other` (1, 1)\n';
  assert.deepEqual(ck.focusMarks('ep8_fx', md), ['near', 'mid', 'far']);
  // the real file: every map with a focus line yields its marks (the old pattern matched none of them)
  for (const [id, first] of [['ep8_stair', 'foot_stage'], ['ep8_scriptorium', 'codex'], ['ep8_library_f1', 'crossing'],
    ['ep8_library_f2', 'pair'], ['ep8_library_f3', 'memory_c_spot'], ['ep8_last_word', 'lectern']]) {
    const marks = ck.focusMarks(id);
    assert.ok(marks.length >= 5 && marks[0] === first, `${id}: ${marks.join(' ')}`);
  }
  assert.ok(!ck.focusMarks('ep8_stair').includes('margin'), 'a note is not a mark');
  const map = { id: 'ep8_fx', ground: Array(30).fill('_'.repeat(40)), marks: { near: [3, 15], mid: [20, 15], far: [20, 2] } };
  const c = ck.cameraRule(map, md);
  assert.equal(c.margins.length, 3);
  assert.deepEqual(c.margins.map((g) => g.ok), [false, true, false]);
  assert.match(c.errors.join('\n'), /near .* 3 tiles from a side/);
  assert.match(c.errors.join('\n'), /far .* 2 tiles from the top or bottom/);
  assert.deepEqual(ck.cameraRule({ ...map, ground: Array(12).fill('_'.repeat(20)) }, md).errors.length, 0, 'a one-screen map is exempt');
  assert.match(ck.cameraRule({ ...map, marks: {} }, md).errors[0], /not a mark/);
  const trail = [{ i: 2, read: { id: 'pa', k: 0 } }, ...Array.from({ length: 18 }, (_, k) => ({ i: 3 + k })), { i: 9, read: { id: 'pa', k: 0 } }];
  assert.deepEqual(ck.loopHome(trail, (i) => i), [{ id: 'pa', behind: 11 }]);
  assert.deepEqual(ck.loopHome([{ i: 2, read: { id: 'pa', k: 0 } }, { i: 8 }, { i: 2, read: { id: 'pa', k: 0 } }], (i) => i), [], 'six back: allowed');
});

// ---------------------------------------------------------------- E8-seams: the shipped sheet's shapes, the solo bell night
test('E8-tiles\' ew books stand on their own cells: the prop anchor puts the footprint on the book (not one row up)', async () => {
  const { propAnchor } = await import('../../src/data/ep8/field/events.js');
  const ew = { footprint: [[0, 0], [0, -1]], anchor: [0, 2] }, ns = { footprint: [[0, 0], [1, 0]], anchor: [0, 1] };
  assert.deepEqual(propAnchor(ew, 7, 16), [7, 17], 'popbook_ew is anchored on its lower cell');
  assert.deepEqual(propAnchor(ns, 33, 8), [33, 8]);
  assert.deepEqual(propAnchor(null, 3, 4), [3, 4]);
  // on a real TileMap with the shipped fragment's popbook_ew: the prop's cells are the book's cells
  const EP8T = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'ep8_tiles.json'), 'utf8'));
  const db = { ...TILES, objects: { ...TILES.objects, popbook_ew: EP8T.objects.popbook_ew, popbook_realm_ew: EP8T.objects.popbook_realm_ew } };
  assert.equal(bookSprite(db, 'ew'), 'popbook_ew');
  assert.equal(bookSprite(db, 'ew', null, true), 'popbook_realm_ew', 'a realm book takes the realm sprite');
  const [ax, ay] = propAnchor(db.objects.popbook_ew, 5, 6);
  const cells = db.objects.popbook_ew.footprint.map(([dx, dy]) => [ax + dx, ay + dy]).sort((a, b) => a[1] - b[1]);
  assert.deepEqual(cells, [[5, 6], [5, 7]]);
});

test('the Dash stacks get their own art: drawer_stack_dash\'s two frames as 16 x 32 breakable tiles', async () => {
  const { DRAWER_TILES } = await import('../../src/data/ep8/field/art.js');
  const EP8T = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'ep8_tiles.json'), 'utf8'));
  const db = { tiles: {}, objects: { drawer_stack_dash: { ...EP8T.objects.drawer_stack_dash } }, terrains: {}, terrainOrder: [] };
  const added = ensureArt(db);
  assert.ok(added.includes(DRAWER_TILES.whole) && added.includes(DRAWER_TILES.broken));
  assert.deepEqual([db.tiles[DRAWER_TILES.whole].w, db.tiles[DRAWER_TILES.whole].h, db.tiles[DRAWER_TILES.whole].collision], [16, 32, 'solid']);
  assert.equal(db.tiles[DRAWER_TILES.broken].collision, 'none');
  assert.deepEqual([db.tiles[DRAWER_TILES.broken].x, db.tiles[DRAWER_TILES.broken].y], EP8T.objects.drawer_stack_dash.frames[1].slice(0, 2));
  assert.equal(db.tiles[DRAWER_TILES.whole].sheet, 'ep8.png');
  assert.deepEqual(ensureArt(db).filter((id) => id.startsWith('ep8_drawer')), [], 'idempotent');
});

test('the bell night is solo: the hero alone on the field, followers hidden, the party itself untouched and back on the next map', async () => {
  const { isSolo, soloParty } = await import('../../src/data/ep8/field/solo.js');
  const bell = (await import('../../src/data/maps/ep8_bell_night.js')).default;
  assert.ok(isSolo(bell), 'ep8_bell_night says party: solo');
  const f = makeField({ ...T, party: 'solo' });
  assert.deepEqual(f.followers, [], 'no followers on a solo map');
  assert.deepEqual(f.actors.filter((a) => a.kind === 'party').map((a) => a.id), [f.leader.id]);
  assert.equal(f.game.party.length, 3, 'game.party is never touched');
  const saved = JSON.parse(JSON.stringify(serialize(f.game)));
  assert.equal(saved.party.length, 3, 'the save keeps the whole party');
  // walking: nobody follows
  await tap(f, 'down');
  assert.deepEqual(f.followers, []);
  // a member rejoining mid-map (rebuildParty with no position) stays hidden too
  f.rebuildParty();
  assert.deepEqual(f.followers, []);
  // the next map (not solo): loadMap drops every actor, rebuildParty makes the followers again
  f.map.mod = T;
  for (const a of f.actors.slice()) f.removeActor(a);
  f.rebuildParty(T.start.x, T.start.y, 'up');
  assert.equal(f.followers.length, 2, 'Mira and Bram follow again');
  assert.equal(soloParty(f), 0, 'not solo: nothing hidden');
  // an ordinary map is never touched
  const g = makeField(T);
  assert.equal(g.followers.length, 2);
});
