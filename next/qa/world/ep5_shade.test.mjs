// Episode 5 sun and shade (E5-world): the pure rule (src/data/ep5/field/shade.js) on the test maps and on small fixtures,
// then the real TileMap, events.js and the shade system (src/data/ep5/field) on a headless field (fake engine, no canvas):
// every hour, a window at its hour and not, a lamp's line shadow and its lit diagonals, a Shove refused over running sand,
// a latched plate surviving a reload, hours and stones resetting on re-entry, the dial by name, the sky link, the virtual
// hour flags, timings; and the map tool's walk of both test maps (tools/maps/ep5_check.mjs through mapcheck's one line).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import { buildEntities, refreshEntities, interactables, GATE_SPRITES, INTERACT_TYPES, SOURCE_TYPES, EXT } from '../../src/world/events.js';
import { Silverglass } from '../../src/world/silverglass.js';
import { TINTS } from '../../src/world/lighting.js';
import { BARKS } from '../../src/data/text.js';
import { peekMap } from '../../src/world/maps.js';
import { compile, light, runMask, running, firm, plates, latches, hourFlag, isHourFlag, tintForHour, SUN } from '../../src/data/ep5/field/shade.js';
import { attach } from '../../src/data/ep5/field/events.js';
import { SWEEP_FRAMES, fieldHourFor } from '../../src/data/ep5/field/system.js';
import { ensureArt, FALLBACK_IDS } from '../../src/data/ep5/field/art.js';
import { within, withinAsync } from '../_perf.mjs';
import { TEST_SHADE, TEST_SHADE_IN } from '../../src/data/ep5/field/_testshade.js';
import { getFieldHour, setFieldHour } from '../../src/data/ep5/sky.js';
import * as world from '../../src/data/ep5/world.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const T = TEST_SHADE, U = TEST_SHADE_IN;
const xyI = (map, x, y) => y * map.ground[0].length + x;
/** The walls of a test map as a solid mask (the field reads them from map.base). */
const wallsOf = (map) => { const m = compile(map), s = new Uint8Array(m.N); map.ground.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#' || c === '|') s[y * m.W + x] = 1; })); return s; };
const runAt = (map, st) => runMask(map, { solid: wallsOf(map), ...st });

function makeField(mod = T, game = null, settings = {}) {
  const sfx = [];
  const engine = {
    assets: { json: () => TILES, has: () => false, atlas: () => null, img: () => ({ width: 1, height: 1 }), setImage() {} },
    renderer: { createLayer: (w, h) => ({ w, h, ctx }), shake() {}, flash() {}, W: 384, H: 216 },
    audio: { sfx: (id) => sfx.push(id) },
    after: (n, fn) => fn(), waitFrames: async () => {}, settings, input: { pressed: () => false },
    pushes: [], hasScene: (n) => n === 'choice', pushAwait: null,
  };
  game = game || { flags: {}, counters: {}, opened: {}, items: {}, pos: { x: 0, y: 0, dir: 'up' } };
  const f = { engine, game, sfx, entities: new Map(), byTile: new Map(), actors: [], barks: [], scenes: [], warps: [], sessionGone: new Set(), frame: 0 };
  engine.scene = f;
  f.name = 'field';
  f.hasFlag = (k) => !!game.flags[k];
  f.setFlag = (k, v = true) => { if (v === false) delete game.flags[k]; else game.flags[k] = v; refreshEntities(f); f.map.refreshGated(f.hasFlag); f.glass.markDirty(); };
  ensureArt(TILES, engine);
  f.map = new TileMap(engine, mod, { hasFlag: f.hasFlag });
  f.mapId = mod.id;
  f.particles = { sparkle() {}, burst() {}, puff() {} };
  f.bark = (k) => { f.barks.push(k); if (!game.counters[`bark:${k}`]) game.counters[`bark:${k}`] = 1; };
  f.showBoxes = async () => {};
  f.choice = async () => 0;
  f.runScene = (id) => { f.scenes.push(id); };
  f.actorAt = (x, y, except, any) => f.actors.find((a) => a.tx === x && a.ty === y) || (any && [f.leader, ...f.followers].find((a) => a && a.tx === x && a.ty === y)) || null;
  f.addActor = (a) => f.actors.push(a);
  f.removeActor = (a) => { f.actors = f.actors.filter((b) => b !== a); };
  f.warnOnce = () => {};
  f.enemyGone = () => false;
  f.slideProp = (p, x, y) => { f.map.moveProp(p, x, y); return Promise.resolve(); };
  f.camera = { x: 0, y: 0, W: 384, H: 216, visible: () => true, panTo: async () => {}, returnTo: async () => {}, snapTo() {} };
  const start = mod.start;
  f.leader = { tx: start.x, ty: start.y, dir: start.dir || 'up', moving: false, showEmote() {}, setPos(x, y) { this.tx = x; this.ty = y; } };
  f.followers = [];
  f.rebuildParty = (x, y) => { f.leader.tx = x; f.leader.ty = y; };
  f.cutscene = { running: null };
  f.inputLocked = 0;
  f.lockInput = () => { f.inputLocked++; };
  f.unlockInput = () => { f.inputLocked = Math.max(0, f.inputLocked - 1); };
  f.lighting = { dark: (mod.lighting || {}).dark || 0, tintName: 'none', tint: null, tintFade: null, setTint(n) { this.tintName = n; } };
  f.collectLights = () => [];
  f.debugState = () => ({ map: f.mapId });
  f.glass = new Silverglass(f);
  attach(f);
  buildEntities(f);
  f.glass.reset();
  return f;
}
const frames = (f, n) => { for (let i = 0; i < n; i++) { f.frame++; f.glass.update(); } };
const code = (f, x, y) => f.map.codeAt(x, y);
async function hour(f, h) {
  const p = f.shade.setHour(h, { origin: [f.leader.tx, f.leader.ty] });
  for (let i = 0; i < SWEEP_FRAMES + 4; i++) { await Promise.resolve(); frames(f, 1); }
  return p;
}
const fakeAb = (f) => ({ lean: null, lastHit: null, float: null, showLabel() {}, async tagIn() {}, async tagOut() {}, async wait() {}, addFx() {}, has: () => true });

// ---------------------------------------------------------------- the rule
test('rule: both test maps parse, the movers ride grooves of at most 6 cells', () => {
  const m = compile(T), n = compile(U);
  assert.deepEqual(m.errors, []);
  assert.deepEqual(n.errors, []);
  assert.equal(m.hour, 'noon');
  assert.equal(n.hour, 'dawn');
  assert.deepEqual(m.movers.map((r) => [r.id, r.track.length]), [['ss_c', 5], ['blk_r', 2]]);
  assert.deepEqual(n.movers.map((r) => [r.id, r.track.length]), [['pl_b', 4], ['lamp_a', 5]]);
  assert.equal(m.openSky, true);
  assert.equal(n.openSky, false);
});

test('rule: every hour of the open court: dawn bridges the band on row 18, noon and dusk run it, night holds all', () => {
  const band = (st) => { const r = runAt(T, st); const out = []; for (let x = 10; x <= 14; x++) out.push(r[xyI(T, x, 18)]); return out.join(''); };
  assert.equal(band({ hour: 'dawn' }), '00000', 'dawn: the obelisk lays 6 cells of shade west across the band');
  assert.equal(band({ hour: 'noon' }), '11111');
  assert.equal(band({ hour: 'dusk' }), '11111');
  assert.equal(band({ hour: 'night' }), '00000', 'night: no sun, no lamp: every sand cell holds');
  assert.equal(runAt(T, { hour: 'dawn' })[xyI(T, 10, 17)], 1, 'the row beside the bridge still runs');
  const L = light(T, { hour: 'noon', solid: wallsOf(T) });
  assert.deepEqual(L.segs.find((s) => s.id === 'ob_a').cells.map((i) => [i % 36, (i / 36) | 0]), [[16, 17], [16, 16], [16, 15]], 'noon: 3 cells north');
  const D = light(T, { hour: 'dusk', solid: wallsOf(T) });
  assert.equal(D.segs.find((s) => s.id === 'ob_a').cells.length, 6, 'dusk: 2h cells east');
  assert.deepEqual(SUN, { dawn: ['west', 2], noon: ['north', 1], dusk: ['east', 2] });
});

test('rule: a shadow stops at a wall and at another caster', () => {
  // ss_c at (23, 5) at dusk: 4 east, (24..27); the nook wall at x 28 is not reached. Move it to (23, 8): the wall at 28 stops nothing.
  const L = light(T, { hour: 'dusk', pos: { ss_c: [23, 5] }, solid: wallsOf(T) });
  assert.deepEqual(L.segs.find((s) => s.id === 'ss_c').cells.map((i) => i % 36), [24, 25, 26, 27]);
  // blk_r (h 1) at dawn: 2 west from (30, 18) to 28; put ss_c in the way at (29, 18) and the shadow is empty
  const M = light(T, { hour: 'dawn', pos: { ss_c: [29, 18] }, solid: wallsOf(T) });
  assert.deepEqual(M.segs.find((s) => s.id === 'blk_r').cells, []);
  // a wall: ob_f (30, 21) at dusk reaches x 31..34 on row 21 (the border wall at 35 ends it)
  const N2 = light(T, { hour: 'dusk', solid: wallsOf(T) });
  assert.deepEqual(N2.segs.find((s) => s.id === 'ob_f').cells.map((i) => i % 36), [31, 32, 33, 34]);
});

test('rule: a window lights its row at its hours only, and a pillar in the beam shades what lies behind it', () => {
  const row8 = (st) => { const r = runAt(U, st); let s = ''; for (let x = 1; x <= 14; x++) s += x === 11 ? '.' : r[xyI(U, x, 8)]; return s; };
  assert.equal(row8({ hour: 'dawn' }), '1111111111.111', 'dawn: the east window runs the row');
  assert.equal(row8({ hour: 'noon' }), '0000000000.000', 'noon: both windows dark, the dark holds');
  assert.equal(row8({ hour: 'dusk' }), '1111111111.111', 'dusk: the west window');
  assert.equal(row8({ hour: 'dawn', pos: { pl_b: [11, 8] } }), '0000000000.111', 'the pillar in the dawn shaft: every cell west of it holds');
  assert.equal(row8({ hour: 'dusk', pos: { pl_b: [11, 8] } }), '1111111111.000', 'and at dusk every cell east of it');
  const L = light(U, { hour: 'dawn', pos: { pl_b: [11, 8] }, solid: wallsOf(U) });
  assert.ok(L.segs.some((s) => s.kind === 'beamshadow' && s.id === 'win_e' && s.cells.length === 10), 'the beam shadow runs to the end of the reach');
  assert.equal(L.beam[xyI(U, 12, 8)], 1);
  assert.equal(L.beam[xyI(U, 10, 8)], 0);
});

test('rule: a lamp lights its square, shadows fall only along its row and column, diagonals stay lit', () => {
  const r = runAt(U, { hour: 'dawn' });
  assert.equal(r[xyI(U, 22, 13)], 1, 'on the line, before the stone: lit');
  assert.equal(r[xyI(U, 22, 11)], 0, 'on the line, behind the stone: shade');
  for (const [x, y] of [[21, 13], [23, 13], [21, 11], [23, 11], [20, 12], [24, 11]]) assert.equal(r[xyI(U, x, y)], 1, `off the line ${x},${y}: lit`);
  assert.equal(r[xyI(U, 22, 10)], 0, 'beyond r (3): dark');
  assert.equal(r[xyI(U, 19, 12)], 1, 'Chebyshev: the corner of the square');
  const moved = runAt(U, { hour: 'dawn', pos: { lamp_a: [23, 14] } });
  for (const y of [11, 12, 13]) assert.equal(moved[xyI(U, 19, y)], 0, `lamp east by one: column 19 row ${y} holds`);
  // a lamp's row shadow (a fixture: lamp at 5,5, a stone at 7,5)
  const fx = { id: 'fx', ground: Array(11).fill('...........'), legend: { '.': 'plaza' }, shade: { hour: 'night', sand: Array(11).fill('sssssssssss') },
    events: [{ id: 'l', type: 'lampcart', x: 5, y: 5, r: 3 }, { id: 's', type: 'standstone', x: 7, y: 5, h: 1 }] };
  const q = runMask(fx, {});
  assert.equal(q[5 * 11 + 6], 1); assert.equal(q[5 * 11 + 8], 0, 'behind the stone on the lamp row');
  assert.equal(q[4 * 11 + 8], 1, 'the diagonal beside it'); assert.equal(q[6 * 11 + 8], 1);
  assert.equal(q[5 * 11 + 2], 1, 'the other way: lit'); assert.equal(q[5 * 11 + 1], 0, 'beyond r');
});

test('rule: plates, monotone latches, the hour flags, the tints', () => {
  const st = (h, latched = []) => ({ hour: h, solid: wallsOf(T), latched });
  for (const h of ['dawn', 'noon']) assert.equal(plates(T, st(h))[0].on, false, `${h}: the plate is in a shadow`);
  assert.equal(plates(T, st('dusk'))[0].lit, true);
  assert.deepEqual(latches(T, st('dusk')), ['plate_d']);
  assert.deepEqual(latches(T, st('dusk', ['plate_d'])), [], 'a latched plate does not latch again');
  assert.equal(plates(T, st('noon', ['plate_d']))[0].on, true, 'latched: on at any hour');
  assert.ok(isHourFlag('hour:dusk') && !isHourFlag('hour:teatime') && !isHourFlag('dusk'));
  assert.equal(hourFlag('hour:dusk', 'dusk'), true); assert.equal(hourFlag('hour:dusk', 'noon'), false); assert.equal(hourFlag('mira_joined', 'noon'), undefined);
  assert.deepEqual(['dawn', 'noon', 'dusk', 'night'].map((h) => tintForHour(h, 'desert_noon')), ['dawn', 'desert_noon', 'dusk', null]);
  // E5-fixes B4: under an open sky the field asks for the rose dawn
  assert.deepEqual(['dawn', 'noon', 'dusk', 'night'].map((h) => tintForHour(h, 'desert_noon', 'sun_dawn')), ['sun_dawn', 'desert_noon', 'dusk', null]);
  assert.equal(running(T, { hour: 'night' }).size, 0);
  assert.equal(firm(T, { hour: 'night' }).size, compile(T).sand.reduce((a, b) => a + b, 0));
});

test('rule: 40 x 40 with 12 casters and 4 lamps recomputes under 1 ms', () => {
  const W = 40;
  const ev = [];
  for (let k = 0; k < 12; k++) ev.push({ id: `c${k}`, type: 'standstone', x: 3 + (k % 6) * 6, y: 4 + Math.floor(k / 6) * 16, h: 1 + (k % 3) });
  for (let k = 0; k < 4; k++) ev.push({ id: `l${k}`, type: 'lampcart', x: 6 + k * 9, y: 30, r: 3 });
  for (let k = 0; k < 4; k++) ev.push({ id: `w${k}`, type: 'window', x: 0, y: 10 + k * 3, faces: 'east', hours: ['dawn', 'dusk'] });
  const map = { id: 'perf', ground: Array(W).fill('.'.repeat(W)), legend: { '.': 'plaza' }, shade: { hour: 'dawn', sand: Array(W).fill('s'.repeat(W)), roof: Array(W).fill(''.padEnd(20, '.') + ''.padEnd(20, '#')) }, events: ev };
  compile(map);
  for (let i = 0; i < 50; i++) runMask(map, { hour: ['dawn', 'noon', 'dusk'][i % 3] });
  const n = 300;
  const r = within(1, () => {   // qa/_perf.mjs: best of a few tries, budget scaled by a calibration loop (issue #76)
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { const st = { hour: ['dawn', 'noon', 'dusk'][i % 3] }; const L = light(map, st); runMask(map, st, L); plates(map, st, L); }
    return (performance.now() - t0) / n;
  });
  assert.ok(r.ok, r.msg('light + run + plates'));
  console.log(`  # shade.js 40x40, 12 casters, 4 lamps, 4 windows: ${r.best.toFixed(3)} ms per state`);
});

// ---------------------------------------------------------------- the field
test('field: registrations (types, gates, plate source, desert_noon, barks, test maps, the stand-in art)', () => {
  for (const t of ['sundial', 'standstone', 'window', 'lampcart', 'sunplate']) assert.ok(EXT[t] && EXT[t].create, t);
  assert.ok(INTERACT_TYPES.has('sundial'));
  assert.ok(SOURCE_TYPES.has('sunplate'));
  assert.deepEqual(GATE_SPRITES.sun_gate, ['sun_gate_closed', 'sun_gate_open']);
  assert.deepEqual(GATE_SPRITES.moon_gate, ['moon_gate_closed', 'moon_gate_open']);
  assert.ok(TINTS.desert_noon && TINTS.desert_noon.alpha > 0);
  const r = world.register(null);
  assert.deepEqual(r.tests, ['ep5_testshade', 'ep5_testshade_in']);
  assert.ok(peekMap('ep5_testshade') && peekMap('ep5_testshade_in'));
  for (const k of ['first_shade', 'first_shove_shade', 'first_window', 'first_lamp', 'sand_would_run']) assert.ok(BARKS[k], k);
  ensureArt(TILES, null);
  for (const id of FALLBACK_IDS) assert.ok(TILES.objects[id], id);
  const frag = { objects: { sundial: { real: true } } };
  const db = { objects: { ...frag.objects } };
  ensureArt(db, null);
  assert.equal(db.objects.sundial.real, true, 'a real id is never replaced');
});

test('field: noon on arrival: the band is water, the dial shows noon, the sky hears noon', () => {
  const f = makeField();
  const d = f.shade.debugState();
  assert.equal(d.hour, 'noon');
  assert.equal(code(f, 12, 18), 'water');
  assert.equal(code(f, 15, 18), 'none');
  assert.equal(code(f, 16, 18), 'solid', 'the obelisk');
  assert.equal(f.entities.get('dial_a').prop.state, 1, 'the dial face: noon');
  assert.equal(getFieldHour(), 'noon');
  assert.ok(interactables(f, 5, 19).some((e) => e.id === 'dial_a'), 'the dial answers confirm');
});

test('field: the hour by name at a dial: the current hour marked, Cancel keeps it, Dawn bridges the band', async () => {
  const f = makeField();
  let asked = null;
  f.engine.pushAwait = async (scene, o) => { asked = o; return o.cancel; };
  f.leader.tx = 5; f.leader.ty = 20;
  assert.equal(await f.shade.chooseHour(f.entities.get('dial_a')), false);
  assert.deepEqual(asked.options, ['Dawn', 'Noon (now)', 'Dusk']);
  assert.equal(asked.index, 1);
  assert.equal(asked.cancel, 1);
  f.engine.pushAwait = async () => 0;
  const p = f.shade.chooseHour(f.entities.get('dial_a'));
  for (let i = 0; i < SWEEP_FRAMES + 4; i++) { await Promise.resolve(); frames(f, 1); }
  assert.equal(await p, true);
  assert.equal(f.shade.hour, 'dawn');
  for (let x = 10; x <= 14; x++) assert.equal(code(f, x, 18), 'none', `bridge ${x}`);
  assert.equal(code(f, 12, 17), 'water');
  assert.equal(f.entities.get('dial_b').prop.state, 0, 'every dial on the map shows the hour');
  assert.ok(f.sfx.includes('sun_dial') && f.sfx.includes('sand_hold'));
  assert.equal(f.lighting.tintName, 'sun_dawn', 'the open court takes the rose dawn (E5-fixes B4)');
  assert.equal(getFieldHour(), 'dawn');
  assert.equal(f.inputLocked, 0, 'input back after the sweep');
});

test('field: the sweep takes 30 frames, sand switching as the shadow passes; reduceMotion is instant', async () => {
  const f = makeField();
  f.leader.tx = 5; f.leader.ty = 20;
  const p = f.shade.setHour('dawn');
  assert.ok(f.inputLocked > 0, 'input held for the sweep');
  frames(f, 8);
  const mid = f.shade.shownRun;
  assert.equal(mid[xyI(T, 14, 18)], 1, 'early in the sweep the far end of the new shadow still runs');
  frames(f, SWEEP_FRAMES);
  await p;
  assert.equal(f.shade.shownRun[xyI(T, 14, 18)], 0);
  assert.equal(f.shade.anim, null);
  const g = makeField(T, null, { reduceMotion: true });
  const q = g.shade.setHour('dusk');
  assert.equal(g.shade.anim, null, 'reduceMotion: no sweep');
  await q;
  assert.equal(g.shade.hour, 'dusk');
});

test('field: sand that changes more than 6 tiles away and off screen gets the camera pan (PLAYTEST_REVIEW_6 fix 6)', async () => {
  const f = makeField();
  f.leader.tx = 3; f.leader.ty = 22;
  const pans = [];
  f.camera.visible = () => false;
  f.camera.panTo = async (x, y) => { pans.push([x >> 4, y >> 4]); };
  f.camera.returnTo = async () => { pans.push('back'); };
  await hour(f, 'dawn');
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(pans.length === 2 && pans[1] === 'back', JSON.stringify(pans));
  assert.ok(pans[0][0] >= 9 && pans[0][0] <= 14 && pans[0][1] === 18, 'to the bridge');
  assert.equal(f.shade.lastChange.far, 6, 'the five bridge cells and the channel cell by the low block');
  const g = makeField();
  g.leader.tx = 5; g.leader.ty = 20;
  const near = [];
  g.camera.panTo = async () => { near.push(1); };
  await hour(g, 'dawn');
  assert.equal(near.length, 0, 'on screen: no pan');
});

test('field: a dial without free needs the gnomon', async () => {
  const mod = { ...T, events: T.events.map((e) => (e.id === 'dial_a' ? { ...e, free: false } : e)) };
  const f = makeField(mod);
  f.engine.pushAwait = async () => 0;
  assert.equal(await f.shade.chooseHour(f.entities.get('dial_a')), false);
  assert.ok(f.sfx.includes('door_locked'));
  assert.equal(f.shade.hour, 'noon');
  f.game.items.gnomon = 1;
  const p = f.shade.chooseHour(f.entities.get('dial_a'));
  for (let i = 0; i < SWEEP_FRAMES + 4; i++) { await Promise.resolve(); frames(f, 1); }
  assert.equal(await p, true);
});

test('field: Shove the stone up its groove, set dusk: the shadow bridges the band to the nook; off the groove it will not go', async () => {
  const f = makeField();
  const ss = f.entities.get('ss_c');
  f.leader.tx = 23; f.leader.ty = 9; f.leader.dir = 'up';
  assert.deepEqual(f.shade.canShove(ss, 'left'), { ok: false, why: 'groove' });
  for (let k = 0; k < 3; k++) {
    const v = f.shade.canShove(ss, 'up');
    assert.equal(v.ok, true, `shove ${k}`);
    await f.shade.moveCaster(ss, v.to, 22, 'block_push');
    f.leader.ty--;
  }
  assert.deepEqual([ss.x, ss.y], [23, 5]);
  assert.equal(f.shade.canShove(ss, 'up').ok, true, 'the groove runs on to row 4');
  assert.equal(f.shade.canShove(ss, 'right').why, 'groove', 'never off it');
  assert.equal(code(f, 23, 5), 'solid');
  assert.equal(code(f, 23, 8), 'none', 'its old cell is floor again');
  await hour(f, 'dusk');
  for (let x = 25; x <= 27; x++) assert.equal(code(f, x, 5), 'none', `dusk bridge ${x}`);
  // Bram's own Shove, through the abilities wrap
  const g = makeField();
  g.leader.tx = 23; g.leader.ty = 9; g.leader.dir = 'up';
  g.abilities = fakeAb(g);
  await g.shade.shoveWith(g.abilities, { target: g.entities.get('ss_c') });
  assert.deepEqual([g.entities.get('ss_c').x, g.entities.get('ss_c').y], [23, 7]);
  assert.ok(g.barks.includes('first_shove_shade'));
});

test('field: a Shove that would leave the party on running sand is refused, and the stone does not budge', async () => {
  const f = makeField();
  f.abilities = fakeAb(f);
  assert.equal(code(f, 30, 17), 'none', 'noon: the low block shades one cell of the channel');
  f.leader.tx = 30; f.leader.ty = 17; f.leader.dir = 'down';
  assert.equal(f.shade.canShove(f.entities.get('blk_r'), 'down').why, 'sand');
  await f.shade.shoveWith(f.abilities, { target: f.entities.get('blk_r') });
  assert.deepEqual([f.entities.get('blk_r').x, f.entities.get('blk_r').y], [30, 18]);
  assert.equal(f.shade.refusals, 1);
  assert.ok(f.barks.includes('sand_would_run'));
  assert.equal(f.abilities.lastHit.kind, 'sand');
  // a follower on the shaded cell counts too
  f.leader.tx = 30; f.leader.ty = 16;
  f.followers = [{ tx: 30, ty: 17 }];
  f.entities.get('blk_r').y = 18;
  assert.equal(f.shade.canShove(f.entities.get('blk_r'), 'up').why, 'groove');
  f.followers = [];
  // from the south the block slides north along its groove only as far as the groove goes
  f.leader.tx = 30; f.leader.ty = 21; f.leader.dir = 'up';
  assert.equal(f.shade.canShove(f.entities.get('blk_r'), 'up').why, 'groove');
});

test('field: the plate latches at dusk, its sun gate opens for good, and both survive a reload', async () => {
  const f = makeField();
  f.leader.tx = 17; f.leader.ty = 23;
  assert.equal(f.entities.get('gate_d').state, 'closed');
  assert.equal(code(f, 33, 22), 'solid');
  await hour(f, 'dusk');
  assert.equal(f.entities.get('plate_d').state, 'on');
  assert.equal(f.entities.get('gate_d').state, 'open');
  assert.equal(f.entities.get('plate_d').prop.state, 1, 'the sun glyph glows');
  assert.equal(f.game.flags._t_e5plate, true);
  assert.equal(f.game.opened['ep5_testshade:plate_d'], true);
  await hour(f, 'noon');
  assert.equal(f.entities.get('gate_d').state, 'open', 'latched: noon does not close it');
  const g = makeField(T, f.game);
  assert.equal(g.shade.hour, 'noon');
  assert.deepEqual(g.shade.debugState().latched, ['plate_d']);
  assert.equal(g.entities.get('gate_d').state, 'open', 'after a reload the gate stands open');
});

test('field: re-entry puts the hour and every stone back', async () => {
  const f = makeField();
  f.leader.tx = 23; f.leader.ty = 9;
  const ss = f.entities.get('ss_c');
  await f.shade.moveCaster(ss, f.shade.canShove(ss, 'up').to, 22, null);
  await hour(f, 'dusk');
  const g = makeField(T, f.game);
  assert.equal(g.shade.hour, 'noon');
  assert.deepEqual([g.entities.get('ss_c').x, g.entities.get('ss_c').y], [23, 8]);
});

test('field: indoors: the dawn shaft runs the row, the pillar shades a crossing, the lamp rolls away from the square', async () => {
  const f = makeField(U);
  assert.equal(f.shade.hour, 'dawn');
  assert.equal(code(f, 10, 8), 'water');
  f.leader.tx = 11; f.leader.ty = 11; f.leader.dir = 'up';
  const pl = f.entities.get('pl_b');
  for (let k = 0; k < 2; k++) { const v = f.shade.canShove(pl, 'up'); assert.ok(v.ok); await f.shade.moveCaster(pl, v.to, 22, null); f.leader.ty--; }
  assert.equal(code(f, 10, 8), 'none', 'in the pillar\'s shade');
  assert.equal(code(f, 12, 8), 'water', 'the lit side still runs');
  // the lamp
  assert.equal(code(f, 19, 12), 'water');
  f.leader.tx = 21; f.leader.ty = 14; f.leader.dir = 'right';
  const lamp = f.entities.get('lamp_a');
  const v = f.shade.canShove(lamp, 'right');
  assert.ok(v.ok);
  await f.shade.moveCaster(lamp, v.to, 22, 'lamp_roll');
  for (const y of [11, 12, 13]) assert.equal(code(f, 19, y), 'none', `column 19 row ${y} holds in the dark`);
  assert.equal(code(f, 22, 11), 'water', 'the stone is no longer between: its cell runs');
  const lights = f.shade.lights();
  assert.ok(lights.some((l) => l.kind === 'warm' && l.x === 23 * 16 + 8), 'the lamp pool follows the lamp');
  assert.ok(lights.length > 1, 'dark map: the dawn shaft cells light too');
});

test('field: the virtual hour flag shows and hides an event with the hour', async () => {
  const f = makeField();
  f.leader.tx = 17; f.leader.ty = 23;
  assert.equal(f.entities.get('glint_dusk').present, false);
  assert.equal(f.hasFlag('hour:noon'), true);
  await hour(f, 'dusk');
  assert.equal(f.entities.get('glint_dusk').present, true);
  assert.equal(f.hasFlag('hour:dusk'), true);
});

test('field: a save made on a shadow wakes the party beside it, not in the running sand', () => {
  const mod = { ...T, start: { x: 12, y: 18, dir: 'up' } };
  const f = makeField(mod);
  assert.notDeepEqual([f.leader.tx, f.leader.ty], [12, 18]);
  assert.equal(code(f, f.leader.tx, f.leader.ty), 'none');
});

test('field: the sky link: a shade map says its hour, another Episode 5 map its tint, any other map null', () => {
  setFieldHour('dusk');
  makeField(T);
  assert.equal(getFieldHour(), 'noon');
  assert.equal(fieldHourFor({ id: 'ep5_ship', lighting: { tint: 'night' } }, null), 'night');
  assert.equal(fieldHourFor({ id: 'ep5_saffron', lighting: { tint: 'none' } }, null), 'noon');
  assert.equal(fieldHourFor({ id: 'valley', lighting: { tint: 'dusk' } }, null), null);
  // E5-fixes B1: the pack's sea night is night to the battle sky, and the real deck map says so before its first fight
  assert.equal(fieldHourFor({ id: 'ep5_ship', lighting: { tint: 'sea_night' } }, null), 'night');
  const ship = peekMap('ep5_ship');
  if (ship) assert.equal(fieldHourFor(ship, null, () => false), 'night');
  assert.ok(TINTS.sea_night && TINTS.sun_dawn, 'the pack registers its sea night and rose dawn tints');
});

test("field: shade on paving is the pale style, on sand the violet; a stone's shadow has a darker root (E5-fixes B3)", () => {
  const f = makeField(T);
  const s = f.shade, m = compile(T);
  const sh = new Uint8Array(m.N);
  let sandI = -1, paveI = -1;
  for (let i = 0; i < m.N; i++) { if (m.sand[i] && sandI < 0) sandI = i; if (!m.sand[i] && !s.wallSolid[i] && paveI < 0) paveI = i; }
  s.ensureLayers();
  assert.equal(s.shadeStyle(sandI)[0].wash, '#2e1a62', 'sand keeps the violet');
  assert.notEqual(s.shadeStyle(paveI)[0].wash, '#2e1a62', 'paving takes the paler indigo-grey');
  assert.ok(s.shadeStyle(paveI)[0].washAlpha < s.shadeStyle(sandI)[0].washAlpha, 'and lighter');
  // the root: the shaded cell beside each stone on the side the hour throws its shadow
  for (const h of ['dawn', 'noon', 'dusk']) {
    s.hour = h;
    const L = light(T, { hour: h, solid: wallsOf(T), pos: s.positions() });
    const shade = s.shadeMask(L), roots = s.rootsOf(shade);
    const [dx, dy] = { dawn: [-1, 0], noon: [0, -1], dusk: [1, 0] }[h];
    let n = 0;
    for (let i = 0; i < m.N; i++) if (roots[i]) {
      n++;
      const x = i % m.W, y = (i / m.W) | 0;
      assert.ok(m.casters.some((r) => { const e = f.entities.get(r.id); return e && e.x === x - dx && e.y === y - dy; }), `${h}: root ${x},${y} sits by a stone`);
      assert.equal(shade[i], 1, `${h}: a root is shaded`);
    }
    assert.ok(n > 0, `${h}: some shadow has a root`);
  }
});

test('timing: an hour change recomputes under 1 ms, a field frame under 3 ms', async () => {
  // Both numbers are the WORST of a run, so one preempted frame on a busy PC used to fail it (issue #76): each try
  // builds a fresh field and the best try's worst case must be inside the budget (qa/_perf.mjs). A real slowdown is
  // slow on every try.
  let f;
  const a = await withinAsync(1, async () => {
    f = makeField();
    f.leader.tx = 5; f.leader.ty = 20;
    for (const h of ['dawn', 'dusk', 'noon', 'dawn', 'dusk', 'noon']) await hour(f, h);
    return f.shade.debugState().maxApplyMs;
  });
  assert.ok(a.ok, a.msg('apply (worst of six hour changes)'));
  const u = within(3, () => {
    let worst = 0;
    f.shade.setHour(f.shade.debugState().hour === 'dusk' ? 'dawn' : 'dusk');
    for (let i = 0; i < 120; i++) { frames(f, 1); worst = Math.max(worst, f.shade.stats.updateMs); }
    return worst;
  });
  assert.ok(u.ok, u.msg('update during a sweep (worst of 120 frames)'));
  console.log(`  # field: apply max ${a.best} ms, update during a sweep max ${u.best} ms`);
});

// ---------------------------------------------------------------- the map tool
test('mapcheck: both test maps validate through the one line, every chest reached, no softlock', async () => {
  const mc = await import('../../tools/maps/mapcheck.mjs');
  const db = await mc.loadDb();
  for (const map of [T, U]) {
    const r = mc.validate(map, db, { [map.id]: map }, {});
    assert.deepEqual(r.errors, [], map.id);
    assert.deepEqual(r.walk.unreached, [], map.id);
    assert.equal(r.walk.shade.stranded, 0);
  }
  const w = mc.walk(T, db);
  assert.match(w.shade.firstAt.chest_c, /^dusk\|23,5;/, 'the nook: dusk with the stone shoved to row 5');
  assert.match(w.shade.firstAt.chest_s, /^dawn/);
  assert.match(w.shade.firstAt.chest_d, /\|1$/, 'the closet only after the latch');
  const u = mc.walk(U, db);
  assert.match(u.shade.firstAt.chest_l, /;23,14\|/, 'the lamp room: the lamp one cell east');
  const s = w.sandAt('dawn');
  assert.ok(s.firm.includes('12,18') && s.running.includes('12,17'));
});

test('mapcheck: the rules catch a dial on sand, an enemy on sand, a groove on sand, a stranding Shove', async () => {
  const mc = await import('../../tools/maps/mapcheck.mjs');
  const db = await mc.loadDb();
  const bad = (fn, base = T) => { const mod = JSON.parse(JSON.stringify(base)); fn(mod); return mc.validate(mod, db, { [mod.id]: mod }, {}).errors.join('\n'); };
  assert.match(bad((m) => { const d = m.events.find((e) => e.id === 'dial_a'); d.x = 12; d.y = 10; }), /sundial dial_a: stands on sand/);
  assert.match(bad((m) => { const d = m.events.find((e) => e.id === 'dial_a'); d.x = 9; d.y = 10; }), /sundial dial_a: faced from sand/);
  assert.match(bad((m) => { m.events.push({ id: 'e_x', type: 'enemy', x: 12, y: 5, sprite: 'briar_wolf', encounter: 'none', move: 'guard' }); }), /enemy e_x stands on sand/);
  assert.match(bad((m) => { m.shade.groove[12] = m.shade.groove[12].slice(0, 12) + 'g' + m.shade.groove[12].slice(13); }), /groove cell 12,12 is sand/);
  // a loop: north lane, a one-way ledge down at the east end, the corridor back west with a stone on a 2-cell groove.
  // From the east, Shove the stone west into (3, 3): the corridor is shut and the ledge is one way, so nothing leads back.
  const pocket = {
    id: 'ep5_pocket', name: 'Pocket', area: 'dungeon', tileset: 'town', lighting: { tint: 'none', dark: 0 }, under: 'plaza', start: { x: 1, y: 3, dir: 'up' },
    legend: { '#': 'cliff_top', '.': 'plaza', 'v': 'ledge_s_m' },
    ground: ['#########', '#.......#', '#.#####v#', '#.......#', '#########'],
    shade: { hour: 'noon', groove: ['.........', '.........', '.........', '...gg....', '.........'] },
    events: [{ id: 'st', type: 'standstone', x: 4, y: 3, h: 1, shove: true }], exits: [], marks: {},
  };
  const r = mc.validate(pocket, db, { [pocket.id]: pocket }, {});
  assert.ok(r.errors.some((e) => /shade softlock/.test(e)), r.errors.join(' / '));
  assert.ok(r.walk.shade.stranded > 0);
  const open = { ...JSON.parse(JSON.stringify(pocket)), events: [] };
  const ok = mc.validate(open, db, { [open.id]: open }, {});
  assert.deepEqual(ok.errors.filter((e) => /softlock/.test(e)), [], 'without the stone the loop always leads home');
});
