// Silverglass on a headless field (E2-world): receptors as gate sources (AND, latch, flag, script), bridges and the
// grace rule, inlays, sliding mirrors, the vow door's crystals, flag-gated overlays and frames by state, the
// reflection budget. The real TileMap and events.js run against a fake engine (no canvas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import { buildEntities, refreshEntities, turnMirror, moveBlock, blockCanMove, sourceCount } from '../../src/world/events.js';
import { Silverglass, polyline } from '../../src/world/silverglass.js';
import { Reflections, MAX_REFLECTIONS } from '../../src/world/reflections.js';
import { TEST_COURT } from '../../src/world/_testmap.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });

function makeField(mod, flags = {}) {
  const sfx = [];
  const engine = {
    assets: { json: () => TILES, has: () => false, atlas: () => null, img: () => null },
    renderer: { createLayer: (w, h) => ({ w, h, ctx }), shake() {}, flash() {} },
    audio: { sfx: (id) => sfx.push(id) },
    after: (n, fn) => fn(), waitFrames: async () => {}, settings: {},
  };
  const game = { flags: { ...flags }, counters: {}, opened: {}, items: {} };
  const f = { engine, game, sfx, entities: new Map(), byTile: new Map(), actors: [], barks: [], scenes: [], sessionGone: new Set(), frame: 0 };
  f.hasFlag = (k) => !!game.flags[k];
  f.setFlag = (k, v = true) => { if (v === false) delete game.flags[k]; else game.flags[k] = v; refreshEntities(f); f.map.refreshGated(f.hasFlag); f.glass.markDirty(); };
  f.map = new TileMap(engine, mod, { hasFlag: f.hasFlag });
  f.particles = { sparkle() {}, burst() {}, puff() {} };
  f.bark = (k) => { f.barks.push(k); };
  f.showBoxes = async () => {};
  f.actorAt = (x, y) => f.actors.find((a) => a.tx === x && a.ty === y) || null;
  f.addActor = (a) => f.actors.push(a);
  f.removeActor = (a) => { f.actors = f.actors.filter((b) => b !== a); };
  f.warnOnce = () => {};
  f.enemyGone = () => false;
  f.slideProp = (p, x, y) => { f.map.moveProp(p, x, y); return Promise.resolve(); };
  f.camera = { visible: () => true };
  f.glass = new Silverglass(f);
  buildEntities(f);
  f.glass.reset();
  return f;
}
const ent = (f, id) => f.entities.get(id);
const idsAt = (f, x, y) => f.map.idsAt(x, y).join(',');

test('the fixture starts dark: the beam splashes west, r1 dark, g1 shut, bridges dim, nothing played', () => {
  const f = makeField(TEST_COURT);
  const d = f.glass.debugState();
  assert.equal(d.beams[0].end.kind, 'splash');
  assert.equal(d.beams[0].end.dir, 'left');
  assert.equal(ent(f, 'r1').state, 'dark');
  assert.equal(ent(f, 'g1').state, 'closed');
  assert.equal(f.map.codeAt(17, 8), 'pit');
  assert.deepEqual(f.sfx, [], 'a quiet trace on load');
});

test('turning the mirror lights the receptor, opens its gate, lays the bridge, lights the inlay', async () => {
  const f = makeField(TEST_COURT);
  await turnMirror(f, ent(f, 'm1'));
  assert.equal(ent(f, 'm1').state, 1);
  assert.equal(ent(f, 'r1').state, 'lit');
  assert.equal(ent(f, 'g1').state, 'open');
  assert.equal(ent(f, 'g1').prop.t, 'door_glass_open');
  assert.equal(f.game.flags._test_r1_lit, true, 'the latch flag is set');
  for (let x = 16; x <= 19; x++) assert.equal(f.map.codeAt(x, 8), 'none', `bridge ${x} walkable`);
  assert.ok(idsAt(f, 24, 6).includes('inlay_v_lit'));
  for (const s of ['mirror_turn', 'beam_hit', 'glass_bridge', 'gate_open']) assert.ok(f.sfx.includes(s), s);
  assert.ok(f.barks.includes('first_glass_bridge'));
  assert.equal(f.game.counters['read:court_lens'], 1, 'the lens line is read once');
});

test('latched receptors stay lit and their gates open; bridges follow the beam; grace keeps an occupied cell', async () => {
  const f = makeField(TEST_COURT);
  await turnMirror(f, ent(f, 'm1'));
  f.actors.push({ tx: 17, ty: 8 });                  // someone on the bridge
  await turnMirror(f, ent(f, 'm1'));                  // cut the beam
  assert.equal(ent(f, 'r1').state, 'lit', 'latched');
  assert.equal(ent(f, 'g1').state, 'open');
  assert.equal(f.map.codeAt(17, 8), 'none', 'grace: the occupied cell stays lit');
  assert.equal(f.map.codeAt(18, 8), 'pit', 'the empty cells dim at once');
  f.glass.update();
  assert.equal(f.map.codeAt(17, 8), 'none', 'still occupied');
  f.actors = [];
  f.glass.update();
  assert.equal(f.map.codeAt(17, 8), 'pit', 'vacated: dims');
});

test('a latch flag already set: the receptor starts lit and its gate open, silently', () => {
  const f = makeField(TEST_COURT, { _test_r1_lit: true });
  assert.equal(ent(f, 'r1').state, 'lit');
  assert.equal(ent(f, 'g1').state, 'open');
  assert.deepEqual(f.sfx, []);
});

function court(events, extra = {}) {
  return { ...TEST_COURT, id: '_testcourt_x', events: [...TEST_COURT.events.filter((e) => !['r1', 'g1', 'mh', 'mp', 'mirror_d'].includes(e.id)), ...events], ...extra };
}

test('receptors are AND sources; an unlatched one going dark closes the gate again', async () => {
  // m1 '\\' sends the beam east along row 8 to ra; a second source in room B shines on rb
  const mod = court([
    { id: 'ra', type: 'receptor', x: 24, y: 8, face: 'left', target: 'g2' },
    { id: 'src_b', type: 'beam', x: 26, y: 3, dir: 'down' },
    { id: 'rb', type: 'receptor', x: 26, y: 12, target: 'g2' },
    { id: 'g2', type: 'gate', x: 22, y: 3, w: 2, sprite: 'door_glass', state: 'closed' },
  ]);
  const f = makeField(mod);
  assert.equal(ent(f, 'rb').state, 'lit', 'rb is lit from the start');
  assert.equal(ent(f, 'g2').state, 'closed', 'one of two sources is not enough');
  assert.deepEqual(sourceCount(f, 'g2'), { n: 2, on: 1 });
  await turnMirror(f, ent(f, 'm1'));
  assert.equal(ent(f, 'g2').state, 'open', 'both lit: open');
  await turnMirror(f, ent(f, 'm1'));
  assert.equal(ent(f, 'ra').state, 'dark');
  assert.equal(ent(f, 'g2').state, 'closed', 'not latched: the gate shuts again');
});

test('a receptor script runs the first time it lights, only once, and not on a quiet load', async () => {
  const mod = court([{ id: 'rs', type: 'receptor', x: 24, y: 8, face: 'left', script: 'silverglass_lock', latch: true, flag: '_t_lock' }]);
  const f = makeField(mod);
  assert.deepEqual(f.glass.queue, []);
  await turnMirror(f, ent(f, 'm1'));
  assert.equal(f.glass.takeScript(), 'silverglass_lock');
  await turnMirror(f, ent(f, 'm1'));
  await turnMirror(f, ent(f, 'm1'));
  assert.equal(f.glass.takeScript(), null, 'latched: no second run');
  // a receptor lit by the start state does not run its script on load
  const mod2 = court([{ id: 'rq', type: 'receptor', x: 1, y: 8, face: 'right', script: 'x' }]);
  const g = makeField(mod2);
  assert.equal(ent(g, 'rq').state, 'lit');
  assert.deepEqual(g.glass.queue, []);
});

test('the vow door shows its lit crystals and opens on the third', () => {
  const mod = court([
    { id: 'v1', type: 'receptor', x: 2, y: 12, target: 'door_vow' },
    { id: 'v2', type: 'receptor', x: 3, y: 12, target: 'door_vow' },
    { id: 'v3', type: 'receptor', x: 5, y: 12, target: 'door_vow' },
    { id: 'door_vow', type: 'gate', x: 22, y: 3, w: 2, sprite: 'door_vow', state: 'closed' },
  ]);
  const f = makeField(mod);
  const door = ent(f, 'door_vow');
  assert.equal(door.prop.t, 'door_vow_closed');
  assert.equal(door.prop.state, 0);
  const light = (id) => { const r = ent(f, id); f.glass.setReceptor(r, true); };
  light('v1');
  assert.equal(door.prop.state, 1, 'one crystal');
  light('v2');
  assert.equal(door.prop.state, 2, 'two crystals');
  light('v3');
  assert.equal(door.state, 'open');
  assert.equal(door.prop.t, 'door_vow_open');
});

test('sliding mirrors: the heavy one never enters a bridge, a moved mirror bends the beam from its new tile', async () => {
  const f = makeField(TEST_COURT);
  const mh = ent(f, 'mh');
  assert.equal(mh.prop.t, 'mirror_heavy');
  // mh at (8,10): up twice puts it on the beam row once m1 sends the beam east
  await turnMirror(f, ent(f, 'm1'));
  await moveBlock(f, mh, 'up');
  await moveBlock(f, mh, 'up');
  f.glass.update();
  assert.deepEqual([mh.x, mh.y], [8, 8]);
  const end = f.glass.debugState().beams[0].end;
  assert.equal(end.dir, 'up', 'the beam now turns north at the heavy mirror');
  assert.equal(ent(f, 'r1').state, 'lit', 'r1 was latched before');
  // a bridge cell is never a place for a block or a mirror, lit or dim
  const fake = { ...mh, x: 15, y: 8, data: {}, prop: mh.prop };
  assert.equal(blockCanMove(f, fake, 'right'), false);
});

test('mirror props use their state frame (tiles.json frames)', async () => {
  const f = makeField(TEST_COURT);
  const m1 = ent(f, 'm1');
  const r0 = m1.prop.draw.sx;
  await turnMirror(f, m1);
  assert.equal(m1.prop.draw.sx, TILES.objects.mirror_stand.frames[1][0]);
  assert.notEqual(m1.prop.draw.sx, r0);
});

test('flag-gated overlays come and go with their collision', () => {
  const mod = court([], { overlays: [...TEST_COURT.overlays, { t: 'glass_bridge_h_lit', x: 18, y: 12, if: '_gate_test' }] });
  const f = makeField(mod);
  assert.equal(f.map.codeAt(18, 12), 'pit');
  assert.ok(!idsAt(f, 6, 13).includes('chalk_crown'));
  f.setFlag('_gate_test');
  assert.equal(f.map.codeAt(18, 12), 'none');
  f.setFlag('_test_gated');
  assert.ok(idsAt(f, 6, 13).includes('chalk_crown'));
  f.setFlag('_gate_test', false);
  assert.equal(f.map.codeAt(18, 12), 'pit');
});

test('the beam polyline: start, each turn, and the wall edge', () => {
  const f = makeField(TEST_COURT);
  const p = polyline(f.glass.result.beams[0]);
  // window (4,3) -> m1 (4,8) -> west wall: three points, the end 8 px past the last cell centre toward the wall
  assert.equal(p.pts.length, 3);
  assert.deepEqual(p.pts[1], [4 * 16 + 8, 8 * 16 + 8 - 6]);
  assert.deepEqual(p.pts[2], [1 * 16 + 8 - 8, 8 * 16 + 8 - 6]);
});

test('reflections: never more than MAX_REFLECTIONS a frame', () => {
  const calls = [];
  const fakeR = { ctx, sprite: () => calls.push(1) };
  const actors = [];
  for (let i = 0; i < 14; i++) {
    actors.push({ id: `a${i}`, kind: 'actor', visible: true, spr: { atlas: 'npcs', id: 'npc_farmer', w: 24, h: 32 }, spriteId: 'npc_farmer',
      tx: i, ty: 1, px: i * 16, py: 16, feetX: i * 16 + 8, feetY: 31, lift: 0, alpha: 1,
      frame: () => ({ atlas: { frames: {} }, name: 'x', flip: false }) });
  }
  const field = { actors, leader: actors[0], hasFlag: () => false, camera: { visible: () => true }, engine: { settings: {} },
    map: { props: [], hasReflect: true, buildReflectGrid() {}, reflectAt: () => true, collisionAt: () => 'none' } };
  const R = new Reflections(field);
  R.reset();
  R.draw(fakeR, 0);
  assert.equal(R.drawn, MAX_REFLECTIONS);
  assert.equal(calls.length, MAX_REFLECTIONS);
});

test('fountain close-up (W11, CRITIQUE_4 item 2): whole faces in the water, the hero blank then faint', async () => {
  const { faceLayout, heroFaceStyle, INSERT, INSERT_Y, Closeup } = await import('../../src/world/closeup.js');
  const { DIALOG_MAX_H } = await import('../../src/ui/dialog.js');
  assert.equal(heroFaceStyle(false), 'smudge');
  assert.equal(heroFaceStyle(true), 'faint');
  const L = faceLayout(['mira', 'hero', 'bram']);
  assert.deepEqual(L.map((f) => f.id), ['mira', 'hero', 'bram']);
  assert.ok(L.every((f) => f.size === 48 && f.party), 'party faces are whole 48 px portraits');
  // the three faces fit side by side inside the water (rim 7 + 3 px each side) without overlapping
  for (let i = 1; i < L.length; i++) assert.ok(L[i].x - L[i - 1].x >= 48, 'faces never overlap');
  assert.ok(Math.max(...L.map((f) => Math.abs(f.x))) + 24 <= INSERT.w / 2 - 10, 'the outer faces stay inside the rim');
  const crowd = faceLayout(['mira', 'hero', 'bram'], true);
  assert.ok(crowd.filter((f) => f.stranger).length >= 8, 'fountain_check fills the water with strangers');
  assert.ok(crowd.slice(-3).every((f) => f.party), 'the party is drawn last, in front of the crowd');
  // the insert stays above the tallest bottom dialogue window and its name tab
  assert.ok(INSERT_Y + INSERT.h <= 216 - 4 - DIALOG_MAX_H - 14, 'the insert clears the dialogue window');
  // headless (no document): open and close resolve at once and nothing is drawn
  const c = new Closeup({ engine: { settings: {} }, hasFlag: () => false, lighting: { tintName: 'hollow_dusk' } });
  await c.open('fountain');
  await c.close();
  assert.equal(c.isOpen, false);
});
