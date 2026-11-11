// Episode 3 field systems on a headless field (E3-world): quench channels (sluices, the cooling front, crust that stays
// through a reload, dams, latched basins as AND gate sources, a basin's first-fill scene), flag-list gates, lift doors,
// slag lights, the ash_haze tint, ash and steam budgets, memory actors, and the story plumbing. The real TileMap,
// events.js, silverglass.js and src/world/ep3 run against a fake engine (no canvas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import { buildEntities, refreshEntities, moveBlock, sourceCount } from '../../src/world/events.js';
import { Silverglass } from '../../src/world/silverglass.js';
import { TINTS, tintSpec } from '../../src/world/lighting.js';
import { attach, turnSluice } from '../../src/world/ep3/index.js';
import { MEMORY_IDS } from '../../src/world/ep3/fx.js';
import { TEST_FORGE, TEST_FORGE_DARK } from '../../src/world/ep3/_testforge.js';
import { SCENES, LINES, storyCollisions, creditsPending, markCreditsRolled, CREDITS_HANDOFF, sceneAllowed } from '../../src/game/story.js';
import { END_CARD_EP2_LIVE, END_CARD_EP3, CREDITS_EP3 } from '../../src/data/text.js';
import { scenes as EP3_SCENES } from '../../src/data/story/ep3.js';
import { within } from '../_perf.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });

let seed = 7;
const rng = { int: (a, b) => a + ((seed = (seed * 16807) % 2147483647) % (b - a + 1)), range: (a, b) => a + ((seed = (seed * 16807) % 2147483647) / 2147483647) * (b - a) };

function makeField(mod, game = null) {
  const sfx = [];
  const engine = {
    assets: { json: () => TILES, has: () => false, atlas: () => null, img: () => null },
    renderer: { createLayer: (w, h) => ({ w, h, ctx }), shake() {}, flash() {}, W: 384, H: 216 },
    audio: { sfx: (id) => sfx.push(id) },
    after: (n, fn) => fn(), waitFrames: async () => {}, settings: {},
  };
  game = game || { flags: {}, counters: {}, opened: {}, items: {} };
  const f = { engine, game, sfx, entities: new Map(), byTile: new Map(), actors: [], barks: [], scenes: [], warps: [], sessionGone: new Set(), frame: 0, rng };
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
  f.leader = { tx: 11, ty: 7, dir: 'left', moving: false };
  f.cutscene = { running: null };
  f.inputLocked = 0;
  f.lockInput = () => { f.inputLocked++; };
  f.unlockInput = () => { f.inputLocked = Math.max(0, f.inputLocked - 1); };
  f.lighting = { dark: (mod.lighting && mod.lighting.dark) || 0, draw() {} };
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
const ent = (f, id) => f.entities.get(id);
/** Run the field's per-frame update n times (silverglass.update carries quench and fx). */
const frames = (f, n) => { for (let i = 0; i < n; i++) { f.frame++; f.glass.update(); } };
const code = (f, x, y) => f.map.codeAt(x, y);

test('the Slag Hall loads quiet: sluice west, pool 1 queued to cool, the puddle by the ledge, nothing played', () => {
  const f = makeField(TEST_FORGE);
  const d = f.quench.debugState();
  assert.equal(d.active, true);
  assert.ok(f.quench.wet.has('6,5') && f.quench.wet.has('4,5'), 'west branch wet');
  assert.ok(!f.quench.wet.has('9,5'), 'east branch dry');
  assert.equal(d.front, 9, 'all of pool 1 waits for the cooling front');
  assert.equal(code(f, 4, 4), 'water', 'still molten before the front');
  assert.ok(f.quench.result.splashes.some((s) => s.floor && s.x === 2 && s.y === 5), 'a puddle on the ledge floor');
  assert.equal(ent(f, 'bs_main').state, 'off');
  assert.equal(ent(f, 'g_hot').state, 'closed');
  assert.deepEqual(f.sfx, []);
  assert.deepEqual(f.game.quenched._testforge.length, 9, 'saved when the front starts');
});

test('the cooling front crusts pool 1 ring by ring: walkable, saved, steam and one hiss, the first_quench bark', () => {
  const f = makeField(TEST_FORGE);
  frames(f, 25);
  assert.equal(code(f, 5, 5), 'none', 'the entry cell cooled first');
  assert.equal(code(f, 3, 4), 'water', 'the far corner not yet');
  frames(f, 20);
  for (let y = 4; y <= 6; y++) for (let x = 3; x <= 5; x++) assert.equal(code(f, x, y), 'none', `${x},${y} crust`);
  assert.equal(f.quench.debugState().crust, 9);
  assert.equal(f.sfx.filter((s) => s === 'quench_hiss').length, 1);
  assert.ok(f.barks.includes('first_quench'));
  assert.ok(f.map.idsAt(4, 5).some((id) => /^slag_crust/.test(id)));
});

test('turning the sluice: the water runs east, the moat cools, bs_main fills, the hot grate opens with steam; pool 1 stays crust', async () => {
  const f = makeField(TEST_FORGE);
  frames(f, 60);
  await turnSluice(f, ent(f, 'sl_b'));
  assert.equal(ent(f, 'sl_b').state, 1);
  assert.ok(f.sfx.includes('sluice_turn'));
  assert.ok(f.quench.wet.has('15,8') && f.quench.wet.has('15,12'));
  assert.ok(!f.quench.wet.has('6,5'), 'the west branch runs dry');
  assert.equal(ent(f, 'bs_main').state, 'on');
  assert.equal(ent(f, 'g_hot').state, 'open');
  assert.equal(ent(f, 'g_hot').prop.t, 'hot_grate_open');
  assert.equal(code(f, 19, 3), 'none', 'the grate doorway is walkable');
  assert.ok(f.sfx.includes('gate_open') && f.sfx.includes('quench_hiss'));
  assert.ok(f.barks.includes('first_basin'));
  assert.equal(ent(f, 'g_and').state, 'closed', 'AND: bs_dam is still dry');
  assert.deepEqual(sourceCount(f, 'g_and'), { n: 2, on: 1 });
  frames(f, 120);
  for (let x = 1; x <= 28; x++) assert.equal(code(f, x, 9), 'none', `moat ${x},9 crust`);
  assert.equal(code(f, 4, 5), 'none', 'crust stays after the water leaves');
  await turnSluice(f, ent(f, 'sl_b'));
  assert.equal(ent(f, 'bs_main').state, 'off', 'unlatched: empties');
  assert.equal(ent(f, 'g_hot').state, 'closed');
  assert.equal(code(f, 15, 9), 'none', 'the moat stays crust');
});

test('a heavy ore crate dams spout B; moving it fills bs_dam (latched, saved), and the AND gate opens with bs_main', async () => {
  const f = makeField(TEST_FORGE);
  assert.equal(f.quench.result.dams.length, 1);
  assert.deepEqual(f.quench.result.dams[0], { x: 27, y: 6, dir: 'down' });
  await turnSluice(f, ent(f, 'sl_b'));
  await moveBlock(f, ent(f, 'ore'), 'right');
  frames(f, 1);
  assert.equal(ent(f, 'bs_dam').state, 'on');
  assert.equal(ent(f, 'g_and').state, 'open');
  assert.equal(f.game.opened['_testforge:bs_dam'], true, 'the latch is saved');
  await moveBlock(f, ent(f, 'ore'), 'left');
  frames(f, 1);
  assert.deepEqual(f.quench.result.dams.map((d) => `${d.x},${d.y}`), ['27,6'], 'dammed again');
  assert.equal(ent(f, 'bs_dam').state, 'on', 'latched: stays full');
});

test('crust and latches survive a reload; sluices and blocks reset; no front, no sound', async () => {
  const f = makeField(TEST_FORGE);
  await turnSluice(f, ent(f, 'sl_b'));
  await moveBlock(f, ent(f, 'ore'), 'right');
  frames(f, 200);
  const saved = JSON.parse(JSON.stringify(f.game));
  const g = makeField(TEST_FORGE, saved);
  assert.equal(ent(g, 'sl_b').state, 0, 'the sluice is back as authored');
  assert.equal(ent(g, 'ore').x, 27, 'the crate is back');
  assert.equal(g.quench.debugState().front, 0, 'nothing left to cool');
  assert.equal(g.quench.debugState().crust, 9 + 56);
  for (let x = 1; x <= 28; x++) assert.equal(code(g, x, 10), 'none');
  assert.equal(ent(g, 'bs_dam').state, 'on', 'latched basin starts full');
  assert.deepEqual(g.sfx, []);
});

test('flag-list gates: the Bell Gate lights one socket per flag (oath_ring) and opens on the third', () => {
  const f = makeField(TEST_FORGE);
  const gate = ent(f, 'g_bell');
  assert.equal(gate.state, 'closed');
  assert.equal(gate.prop.t, 'bell_gate_closed');
  assert.equal(gate.prop.state, 0);
  f.setFlag('_t_oath_a'); frames(f, 1);
  assert.equal(gate.prop.state, 1);
  assert.ok(f.sfx.includes('oath_ring'));
  f.setFlag('_t_oath_b'); frames(f, 1);
  assert.equal(gate.prop.state, 2);
  assert.equal(gate.state, 'closed');
  f.setFlag('_t_oath_c'); frames(f, 1);
  assert.equal(gate.state, 'open');
  assert.equal(gate.prop.t, 'bell_gate_open');
  const g = makeField(TEST_FORGE, JSON.parse(JSON.stringify(f.game)));
  assert.equal(ent(g, 'g_bell').state, 'open', 'all flags set at load: open, quietly');
  assert.ok(!g.sfx.includes('gate_open'));
});

test('a lift door rumbles, then transfers with kind lift; other doors pass through', async () => {
  const f = makeField(TEST_FORGE);
  await f.useDoor(ent(f, 'lift'));
  assert.ok(f.sfx.includes('lift_rumble'));
  assert.deepEqual(f.warps[0], ['_testforge_dark', 15, 4, 'down', 'lift']);
  assert.equal(f.useDoor({ ev: { kind: 'door', to: ['x', 1, 1] } }), 'door');
});

test('a basin with a script queues it on the first fill (run when the field is quiet), never on a quiet load with its flag', async () => {
  const mod = { ...TEST_FORGE, id: '_testforge_s', events: TEST_FORGE.events.map((e) => (e.id === 'bs_main' ? { ...e, latch: true, flag: '_t_wheel', script: 'liftworks_lift' } : e)) };
  const f = makeField(mod);
  await turnSluice(f, ent(f, 'sl_b'));
  assert.deepEqual(f.quench.queue, ['liftworks_lift']);
  assert.ok(!f.barks.includes('first_basin'), 'the scene speaks instead of the bark');
  frames(f, 1);
  assert.deepEqual(f.scenes, ['liftworks_lift']);
  assert.equal(f.game.flags._t_wheel, true);
  const g = makeField(mod, JSON.parse(JSON.stringify(f.game)));
  assert.equal(ent(g, 'bs_main').state, 'on');
  frames(g, 2);
  assert.deepEqual(g.scenes, []);
});

test('dark rooms: molten slag is the light (warm, at most 24); cooled slag gives none', async () => {
  const f = makeField(TEST_FORGE_DARK);
  const slag = () => f.collectLights().filter((l) => l.slag);   // the Bell Gate's socket lights are not slag (CRITIQUE_5 #6)
  const before = slag();
  assert.ok(before.length > 0 && before.length <= 24, `${before.length} slag lights`);
  assert.ok(before.every((l) => l.kind === 'warm' && l.color));
  await turnSluice(f, ent(f, 'sl_b'));
  frames(f, 300);
  const after = slag();
  assert.equal(after.length, 0, 'every slag body cooled: dark');
  const lit = makeField(TEST_FORGE);
  assert.equal(lit.collectLights().length, 0, 'no slag lights in a lit room');
});

test('the ash_haze tint, ash and steam budgets, memory actors', () => {
  assert.ok(TINTS.ash_haze && tintSpec('ash_haze').desat > 0.2);
  const f = makeField(TEST_FORGE);
  f.camera = { x: 0, y: 160, W: 384, H: 216, visible: () => true };
  // qa/_perf.mjs: best of a few tries (each from a reset), budget scaled by a calibration loop (issue #76)
  const r = within(0.3, () => {
    f.ep3fx.reset();
    const t0 = performance.now();
    for (let i = 0; i < 600; i++) f.ep3fx.update();
    return (performance.now() - t0) / 600;
  });
  assert.ok(f.ep3fx.ash.length > 24 && f.ep3fx.ash.length <= 64, `${f.ep3fx.ash.length} flakes (CRITIQUE_5 #3: 2 to 3 times the old 24)`);
  assert.ok(r.ok, r.msg('ash update a frame'));
  for (let i = 0; i < 30; i++) f.ep3fx.steam(100, 100, 5);
  assert.ok(f.ep3fx.puffs.length <= 40);
  f.engine.settings.reduceMotion = true;
  const n = f.ep3fx.puffs.length;
  f.ep3fx.steam(100, 100, 5);
  assert.equal(f.ep3fx.puffs.length, n, 'no steam under reduceMotion');
  const a = { id: 'bram_m', tint: null, alpha: 1 };
  f.actors.push(a);
  f.ep3fx.update();
  assert.ok(MEMORY_IDS.has('mara_m') && MEMORY_IDS.has('foreman_m'));
  assert.equal(a.tint.color, '#d9a066');
  assert.equal(a.alpha, 0.88);
  assert.ok(f.ep3fx.mem > 0, 'the vignette fades in');
});

test('story plumbing: Episode 3 scenes and lines merged, no collisions, the credits handoff, the live guard', () => {
  for (const id of Object.keys(EP3_SCENES)) assert.ok(SCENES[id], id);
  assert.ok(LINES && Object.keys(LINES).length > 100);
  assert.deepEqual(storyCollisions(), { scenes: [], lines: [] });
  const g = { counters: { credits_rolled: 1, credits2_rolled: 1 } };
  const has = (k) => ['ep1_complete', 'ep2_complete', 'ep3_complete'].includes(k);
  assert.equal(creditsPending(g, has), 3);
  markCreditsRolled(g, 3);
  assert.equal(g.counters.credits3_rolled, 1);
  assert.equal(creditsPending(g, has), 0);
  assert.equal(CREDITS_HANDOFF[3].map, 'pk_inn');
  assert.equal(CREDITS_HANDOFF[3].mark, 'inn_bed');
  assert.equal(CREDITS_HANDOFF[3].cards, CREDITS_EP3);
  assert.equal(CREDITS_HANDOFF[3].endCard, END_CARD_EP3);
  assert.equal(CREDITS_HANDOFF[2].endCard, END_CARD_EP2_LIVE, 'switch on: the Episode 2 card says Episode 3 begins in the morning');
  const g2 = { counters: {} };
  markCreditsRolled(g2, 2); markCreditsRolled(g2, 1);
  assert.deepEqual(g2.counters, { credits2_rolled: 1, credits_rolled: 1 });
  assert.equal(sceneAllowed('ep3_morning', (k) => k === 'ep2_complete'), true, 'EP3_LIVE on: the morning after the Episode 2 credits');
  assert.equal(sceneAllowed('ep3_morning', (k) => ['ep2_complete', 'ep3_morning_done'].includes(k)), false, 'once only');
  assert.equal(sceneAllowed('ep3_morning', () => false), false, 'never before Episode 2 is finished');
  assert.equal(sceneAllowed('sand_road_arrival', (k) => k === 'sand_gate_open'), true);
});
