// Episode 4 seam fixes in the field (E4-seamfix, 2026-11-04), on the real Valewyn map and a headless field (fake engine,
// no canvas), with the pack's attach() (src/data/ep4/field/events.js + seams.js):
//   - weatherIf: Valewyn rains until vw_restored, the rain eases off the moment the flag is set (mid-scene), and an
//     arrival after the restore is dry from the first frame; a map without weatherIf is left to the core.
//   - the scene twins: the map NPCs Joss and Ada leave when charter_restored is set (the field's hasFlag answers the
//     compound flag) and come back with ep4_complete.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import { buildEntities, refreshEntities } from '../../src/world/events.js';
import { Silverglass } from '../../src/world/silverglass.js';
import { mergeTileFragment } from '../../src/game/packs.js';
import { attach } from '../../src/data/ep4/field/events.js';
import { weatherWanted, syncWeather } from '../../src/data/ep4/field/seams.js';
import { register as regFlags } from '../../src/data/ep4/flags.js';
import { register as regNpcs, SCENE_TWIN } from '../../src/data/ep4/npcs.js';
import VALEWYN from '../../src/data/maps/ep4_valewyn.js';
import { TEST_TIDE } from '../../src/data/ep4/field/_testtide.js';

regFlags(); regNpcs();
// the headless map has no art: keep its missing-sprite notes out of the report
const warn = console.warn;
console.warn = (...a) => { if (!/^\[(tilemap|actors)/.test(String(a[0]))) warn(...a); };
const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
mergeTileFragment(TILES, JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'ep4_tiles.json'), 'utf8')));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });

/** The rain half of src/world/particles.js: a target and an intensity that eases toward it (0.02 a frame). */
function rain() {
  return { rainTarget: 0, rainIntensity: 0, setRain(on) { this.rainTarget = on ? 1 : 0; },
    tick() { this.rainIntensity += (this.rainTarget - this.rainIntensity) * 0.02; }, sparkle() {}, burst() {}, puff() {} };
}

function makeField(mod, flags = []) {
  const engine = {
    assets: { json: () => TILES, has: () => false, atlas: () => null, img: () => ({ width: 1, height: 1 }) },
    renderer: { createLayer: (w, h) => ({ w, h, ctx }), shake() {}, flash() {}, W: 384, H: 216 },
    audio: { sfx() {} }, after: (n, fn) => fn(), waitFrames: async () => {}, settings: {}, input: { pressed: () => false },
  };
  const game = { flags: Object.fromEntries(flags.map((f) => [f, true])), counters: {}, opened: {}, items: {} };
  const f = { engine, game, entities: new Map(), byTile: new Map(), actors: [], sessionGone: new Set(), frame: 0, name: 'field' };
  engine.scene = f;
  f.hasFlag = (k) => !!game.flags[k];
  f.setFlag = (k) => { game.flags[k] = true; refreshEntities(f); };
  f.particles = rain();
  f.bark = () => {}; f.showBoxes = async () => {}; f.runScene = () => {}; f.warnOnce = () => {}; f.enemyGone = () => false;
  f.actorAt = (x, y) => f.actors.find((a) => a.tx === x && a.ty === y) || null;
  f.addActor = (a) => f.actors.push(a);
  f.removeActor = (a) => { f.actors = f.actors.filter((b) => b !== a); };
  f.camera = { x: 0, y: 0, W: 384, H: 216, visible: () => true };
  f.leader = { tx: 21, ty: 32, dir: 'up', moving: false };
  f.cutscene = { running: null };
  f.inputLocked = 0; f.lockInput = () => {}; f.unlockInput = () => {};
  f.lighting = { dark: 0, draw() {} };
  f.collectLights = () => [];
  f.useDoor = () => 'door';
  f.debugState = () => ({});
  f.glass = new Silverglass(f);
  attach(f);
  f.load = (m) => {
    // what field.js load() does that matters here: a new TileMap, the entities, glass.reset, then rain from `weather`
    f.map = new TileMap(engine, m, { hasFlag: f.hasFlag });
    f.mapId = m.id;
    f.entities = new Map(); f.byTile = new Map(); f.actors = [];
    buildEntities(f);
    f.glass.reset();
    f.particles.setRain(m.weather === 'rain' && !m.weatherZone);
  };
  f.load(mod);
  return f;
}
const frames = (f, n) => { for (let i = 0; i < n; i++) { f.frame++; f.glass.update(); f.particles.tick(); } };

test('weatherIf: the map carries it and the rule reads it', () => {
  assert.equal(VALEWYN.weather, 'rain');
  assert.deepEqual(VALEWYN.weatherIf, { ifNot: 'vw_restored' });
  assert.equal(weatherWanted(VALEWYN, () => false), true);
  assert.equal(weatherWanted(VALEWYN, (k) => k === 'vw_restored'), false);
  assert.equal(weatherWanted(TEST_TIDE, () => false), null, 'no weatherIf: the core decides');
  assert.equal(weatherWanted({ weather: 'rain', weatherZone: { x: 0, y: 0, w: 1, h: 1 }, weatherIf: {} }, () => false), null, 'a weather zone is the core\'s');
});

test('Valewyn rains until vw_restored, dries when it is set, and stays dry on the next arrival', () => {
  const f = makeField(VALEWYN, ['vw_arrived']);
  frames(f, 240);
  assert.equal(f.particles.rainTarget, 1);
  assert.ok(f.particles.rainIntensity > 0.9, `raining (${f.particles.rainIntensity.toFixed(2)})`);
  // crown_remembers sets vw_restored mid-scene: the rain eases off, not snaps
  f.setFlag('vw_restored');
  frames(f, 1);
  assert.equal(f.particles.rainTarget, 0);
  assert.ok(f.particles.rainIntensity > 0.5, 'eases off');
  frames(f, 300);
  assert.ok(f.particles.rainIntensity < 0.01, `dry (${f.particles.rainIntensity.toFixed(3)})`);
  // the next arrival (the inn wake-up, or straight in from the rainy Flood Road): the core turns rain on at load,
  // the pack turns it off on the first frame, and dry from the first frame
  f.particles.rainIntensity = 1;
  f.load(VALEWYN);
  assert.equal(f.particles.rainTarget, 1, 'the core alone would rain');
  frames(f, 1);
  assert.equal(f.particles.rainTarget, 0);
  assert.ok(f.particles.rainIntensity < 0.01, 'no drizzle on arrival');
  frames(f, 120);
  assert.equal(f.particles.rainTarget, 0);
});

test('a fresh arrival before vw_restored rains, and syncWeather leaves a map without weatherIf alone', () => {
  const f = makeField(VALEWYN, ['vw_arrived']);
  frames(f, 1);
  assert.equal(f.particles.rainTarget, 1);
  const g = makeField(TEST_TIDE);
  g.particles.setRain(true);
  syncWeather(g);
  assert.equal(g.particles.rainTarget, 1, 'untouched');
});

test('the field hides Joss and Ada from charter_restored and brings them back with ep4_complete', () => {
  const base = ['vw_arrived', 'met_regent', 'met_joss', 'keep_f2_done'];
  const on = (f, id) => !!(f.entities.get(id) && f.entities.get(id).present);
  const f = makeField(VALEWYN, base);
  assert.equal(f.hasFlag(SCENE_TWIN), false);
  assert.ok(on(f, 'joss') && on(f, 'ada'), 'both stand in Valewyn before the Keep is won');
  // arriving by boat_crown_out: charter_restored is already set when the map loads (crown_remembers)
  const g = makeField(VALEWYN, [...base, 'paper_regent_defeated', 'charter_restored', 'lyra_named']);
  assert.equal(g.hasFlag(SCENE_TWIN), true, 'the field answers the compound flag');
  assert.ok(!on(g, 'joss') && !on(g, 'ada'), 'both stand down while joss_t / ada_t can be spawned');
  assert.ok(on(g, 'vance'), 'Vance stays (crown_remembers walks him)');
  g.setFlag('tide_bell_rung'); g.setFlag('vw_restored');
  assert.ok(!on(g, 'joss') && !on(g, 'ada'), 'still down through ep4_ending');
  g.setFlag('ep4_complete');
  assert.ok(on(g, 'joss') && on(g, 'ada'), 'back after the episode');
  // a set flag mid-map also hides them (the field refreshes on setFlag)
  f.setFlag('charter_restored');
  assert.ok(!on(f, 'joss') && !on(f, 'ada'));
});
