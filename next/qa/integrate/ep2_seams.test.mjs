// Seams fixed while wiring Episode 2 end to end (E2-integrate, EPISODE2_PLAN 10d). Each test pins one fix:
//   - Mira's "A crystal that keeps the light. Something, somewhere, just unlocked." waits for the first receptor
//     to light (it fired on sight, at the F1 landing, through a wall, before anything was lit) (silverglass.js);
//   - every Hollow mark a scene walks someone to is outside the solid props (Mira walked into the fountain basin
//     in hollowmere_restored: "no path for mira to fountain") (ep2.js, nameless_hollow.js);
//   - the Fading Stretch's cairn scene fires wherever the party crosses into the band, not only on its one road tile
//     (a party on row 17 skipped it, and the fog could loop them with no word) (east_road.js);
//   - Anvil the dog cannot lie on the one tile in front of the smithy door (the bot, and a player, were boxed in)
//     (smithy.js);
//   - after the Episode 1 credits the wake-up scene keeps its fade: the handoff cleared the field's fade tween,
//     ep2_morning's fade-in never resolved and the game sat at home with input locked forever (field.js);
//   - flag-gated shop stock shows up in the real shop: the shop scene asks shopStock with a hasFlag function, which
//     shopStock read as an empty object, so no ifFlag item was ever offered (Silver Salve, Vessa's tier 4, Garrick's
//     restock, and Episode 1's own upgrades: the Iron Pike, the Hi-Potion, the floor-two smithy stock) (shops.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import { buildEntities, refreshEntities, turnMirror } from '../../src/world/events.js';
import { Silverglass } from '../../src/world/silverglass.js';
import { TEST_COURT } from '../../src/world/_testmap.js';
import { FieldScene } from '../../src/scenes/field.js';
import { NPCS } from '../../src/data/npcs.js';
import { shopStock } from '../../src/data/shops.js';
import { loadDb, loadMap, buildGrid } from '../../tools/maps/mapcheck.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
const PROPS = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'sprites', 'props.json'), 'utf8'));
const EP2_SRC = fs.readFileSync(path.join(NEXT, 'src', 'data', 'story', 'ep2.js'), 'utf8');
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });

// The headless field of qa/world/e2_field.test.mjs (real TileMap, events.js and Silverglass, fake engine).
function makeField(mod, flags = {}) {
  const engine = {
    assets: { json: () => TILES, has: () => false, atlas: () => null, img: () => null },
    renderer: { createLayer: (w, h) => ({ w, h, ctx }), shake() {}, flash() {} },
    audio: { sfx() {} }, after: (n, fn) => fn(), waitFrames: async () => {}, settings: {},
  };
  const game = { flags: { ...flags }, counters: {}, opened: {}, items: {} };
  const f = { engine, game, entities: new Map(), byTile: new Map(), actors: [], barks: [], sessionGone: new Set(), frame: 0 };
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

test('first_receptor waits for the light: no remark while every receptor is dark and on screen', async () => {
  const f = makeField(TEST_COURT);
  for (let i = 0; i < 120; i++) f.glass.update();           // on screen for two seconds, still dark
  assert.ok(!f.barks.includes('first_receptor'), 'no "just unlocked" before anything is lit');
  await turnMirror(f, f.entities.get('m1'));                // the beam reaches r1 (no script of its own)
  assert.equal(f.entities.get('r1').state, 'lit');
  assert.ok(f.barks.includes('first_receptor'), 'the remark comes with the first light');
});

test('a receptor with its own scene (rec_lock, the vows) queues the scene instead of the remark', async () => {
  const mod = { ...TEST_COURT, id: '_testcourt_s', events: [...TEST_COURT.events.filter((e) => !['r1', 'g1', 'mh', 'mp', 'mirror_d'].includes(e.id)),
    { id: 'rs', type: 'receptor', x: 24, y: 8, face: 'left', script: 'silverglass_lock', latch: true, flag: '_t_lock' }] };
  const f = makeField(mod);
  await turnMirror(f, f.entities.get('m1'));
  assert.equal(f.glass.takeScript(), 'silverglass_lock');
  assert.ok(!f.barks.includes('first_receptor'));
});

/** Cells a solid prop event covers: its footprint grows up and right from the event cell (as the field places it). */
function solidPropCells(map) {
  const out = new Map();
  for (const ev of map.events || []) {
    const p = ev.sprite && PROPS[ev.sprite];
    if (!p || !p.solid || ev.solid === false) continue;
    const [fw, fh] = p.footprint || [1, 1];
    for (let dy = 0; dy < fh; dy++) for (let dx = 0; dx < fw; dx++) out.set(`${ev.x + dx},${ev.y - dy}`, ev.id);
  }
  return out;
}

test('every Hollow mark a scene walks someone to is walkable and outside the solid props', async () => {
  const db = await loadDb();
  const map = await loadMap('nameless_hollow');
  const g = buildGrid(map, db);
  const solid = solidPropCells(map);
  const walked = new Set([...EP2_SRC.matchAll(/s\.walk\('[a-z_]+', '([a-z_]+)'/g)].map((m) => m[1]));
  const checked = [];
  for (const mark of walked) {
    const at = map.marks[mark];
    if (!at) continue;                                          // an actor id, or a mark on another map
    const [x, y] = at;
    assert.equal(g.code[y][x], 'none', `${mark} (${x},${y}) is floor`);
    assert.ok(!solid.has(`${x},${y}`), `${mark} (${x},${y}) is inside ${solid.get(`${x},${y}`)}`);
    checked.push(mark);
  }
  assert.ok(checked.includes('fountain_rim') && checked.includes('fountain_view'), `checked ${checked}`);
  assert.ok(!walked.has('fountain'), 'nobody walks to the fountain mark (it is the middle of the basin)');
});

test('the Fading Stretch: every way into the fog band from the west runs the cairn scene first', async () => {
  const db = await loadDb();
  const map = await loadMap('east_road');
  const g = buildGrid({ ...map, events: [] }, db);
  const covers = (ev, x, y) => x >= ev.x && x < ev.x + (ev.w || 1) && y >= ev.y && y < ev.y + (ev.h || 1);
  const fog = (map.events || []).filter((e) => e.type === 'door' && e.kind === 'fog');
  const intro = (map.events || []).filter((e) => e.type === 'trigger' && e.script === 'fading_stretch');
  const [rx, ry] = map.marks.fog_return;
  // the band's first column: its doorless cells are the corridor mouth; whoever stands west of the band steps in there
  const bandX = Math.min(...fog.map((e) => e.x));
  const top = Math.min(...fog.map((e) => e.y)), bottom = Math.max(...fog.map((e) => e.y + (e.h || 1)));   // + the shore row
  let entries = 0;
  for (let y = top; y <= bottom; y++) {
    const x = bandX - 1;
    if (g.code[y][x] !== 'none' || (x === rx && y === ry)) continue;
    if (g.code[y][bandX] !== 'none') continue;                 // rock or river east of it: no way in here
    entries++;
    assert.ok(intro.some((t) => covers(t, x, y)), `(${x},${y}) leads into the band without the cairn scene`);
  }
  assert.ok(entries >= 3, `entries ${entries}`);
});

test('Anvil wanders clear of the tile in front of the smithy door', async () => {
  const map = await loadMap('smithy');
  const dog = map.events.find((e) => e.id === 'anvil');
  const door = map.events.find((e) => e.id === 'smithy_exit');
  const r = NPCS.anvil.radius ?? 1;
  const front = [door.x, door.y - 1];
  const reach = Math.abs(front[0] - dog.x) <= r && Math.abs(front[1] - dog.y) <= r;
  assert.ok(!reach, `Anvil at (${dog.x},${dog.y}) radius ${r} can lie on (${front})`);
});

test('the credits handoff leaves the wake-up scene its fade-in (Episode 1 credits -> ep2_morning)', async () => {
  let resolved = false;
  const fake = {
    engine: { hasScene: () => false, fadeTo: async (fn) => { fn(); } },
    game: { counters: {}, flags: {} }, cutscene: { running: null }, lighting: { setTint() {} },
    inputLocked: 0, lockInput() { this.inputLocked++; }, unlockInput() { this.inputLocked--; },
    fadeAlpha: 0, fadeTween: null,
    // the real tween for the scene's fade; the handoff's one-frame black cut lands at once (no update loop here)
    fadeScreen(target, frames) { if (frames <= 1) { this.fadeAlpha = target; this.fadeTween = null; return Promise.resolve(); } return FieldScene.prototype.fadeScreen.call(this, target, frames); },
    // hero_home's enter trigger starts ep2_morning, whose first step is fade('in', 60)
    loadMap() { this.cutscene.running = 'ep2_morning'; this.fadeScreen(0, 60).then(() => { resolved = true; }); },
  };
  await FieldScene.prototype.rollCredits.call(fake, 1);
  assert.equal(fake.game.counters.credits_rolled, 1);
  assert.ok(fake.fadeTween, 'the fade tween of the scene survives the handoff');
  for (let i = 0; i < 60 && fake.fadeTween; i++) {        // the field's per-frame tween step (field.update)
    const t = fake.fadeTween; t.t++;
    fake.fadeAlpha = t.from + (t.to - t.from) * Math.min(1, t.t / t.dur);
    if (t.t >= t.dur) { fake.fadeTween = null; t.resolve(); }
  }
  await Promise.resolve();
  assert.ok(resolved, 'ep2_morning moves on');
  assert.equal(fake.fadeAlpha, 0);
  // no scene on the wake-up map: the handoff clears the fade itself, as before
  const plain = { ...fake, cutscene: { running: null }, fadeTween: null, fadeAlpha: 1, loadMap() {} };
  await FieldScene.prototype.rollCredits.call(plain, 2);
  assert.equal(plain.fadeAlpha, 0);
  assert.equal(plain.fadeTween, null);
});

test('flag-gated stock appears when the shop scene asks with a hasFlag function', () => {
  const ids = (shop, flags) => shopStock(shop, (f) => flags.includes(f)).map((s) => s.item);
  assert.ok(ids('hollow_items', ['court_entered']).includes('silver_salve'));
  assert.ok(!ids('hollow_items', []).includes('silver_salve'));
  assert.ok(ids('hollow_smithy', ['court_f2_done']).includes('silverglass_blade'));
  assert.ok(!ids('hollow_smithy', []).includes('silverglass_blade'));
  // the shop scene really passes a function (src/scenes/shop.js)
  const src = fs.readFileSync(path.join(NEXT, 'src', 'scenes', 'shop.js'), 'utf8');
  assert.match(src, /shopStock\(this\.shop\.id, \(f\) => /);
});
