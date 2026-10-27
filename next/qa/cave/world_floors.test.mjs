// C2-world: the Deep Stacks' floors as the game sees them (src/data/cave/world.js). The pack forced on the Node way
// (globalThis.LQ_CAVE_ON, then ensurePack, so packReady and caveOn() are true as in a browser with ?cave=1): prepareFloor
// registers N and N + 1 with their encounters, the same (seed, floor) is the same floor, the pity rule's blue floors obey the plan,
// a chest's rng is a function of (seed, floor, chest id), B99 leads to the hand-made B100's arrival, the hall and the library's
// trapdoor are there and pass mapcheck, and the fallback story only fills the ids story.js / text.js did not.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.LQ_CAVE_ON = true;
const { ensurePack, packReady } = await import('../../src/game/packs.js');
const { caveOn, caveForced } = await import('../../src/data/cave/live.js');
const packResult = await ensurePack('cave', { quiet: true, warm: false });
const W = await import('../../src/data/cave/world.js');
const pack = await import('../../src/data/cave/index.js');
const { peekMap, loadMap } = await import('../../src/world/maps.js');
const { ENCOUNTERS } = await import('../../src/data/encounters.js');
const { newGameEp2 } = await import('../../src/game/state.js');
const CAVE = await import('../../src/game/cave.js');
const { arrivalOf } = await import('../../src/data/cave/gen.js');
const { isLanding, foesPerFloor } = await import('../../src/data/cave/foes.js');
const { rollRedChest, rollBlueChest } = await import('../../src/data/cave/loot.js');
const { sceneById, sceneAllowed, LINES } = await import('../../src/game/story.js');
const { loadDb, validate, loadAll } = await import('../../tools/maps/mapcheck.mjs');

function running(seed = 7) {
  const g = newGameEp2('Arden');
  assert.ok(CAVE.enter(g, { seed, playtime: 100 }));
  return g;
}
const strip = (mod) => JSON.stringify({ ...mod, rooms: undefined, links: undefined });
const EM_DASH = String.fromCharCode(0x2014);

test('the pack is forced on the Node way: packReady, caveOn, and register() loaded world.js last', async () => {
  assert.equal(caveForced(), true);
  assert.equal(packResult.ok, true, JSON.stringify(packResult));
  assert.equal(packReady('cave'), true);
  assert.equal(caveOn(), true);
  const r = await pack.register();
  assert.equal(r.loaded[r.loaded.length - 1], 'world', `world.js registers after story and text (${r.loaded.join(',')})`);
  assert.deepEqual(pack.ORDER.slice(-3), ['story', 'text', 'world']);
  const w = await W.register();
  assert.equal(w.id, 'world');
  assert.ok(w.loaded.includes('bands345') && w.loaded.includes('hall') && w.loaded.includes('b100'), `C2-sprites-boss's files load: ${w.loaded.join(',')}`);
});

test('prepareFloor(g, N) registers cave_bN and cave_b(N+1) with every encounter the foes name; a second call keeps them', () => {
  const g = running(7);
  const [a, b] = W.prepareFloor(g, 1);
  assert.equal(a.id, 'cave_b1'); assert.equal(b.id, 'cave_b2');
  assert.equal(peekMap('cave_b1'), a); assert.equal(peekMap('cave_b2'), b);
  for (const mod of [a, b]) {
    const foes = mod.events.filter((e) => e.type === 'enemy');
    assert.equal(foes.length, foesPerFloor(mod.floor), `${mod.id} has ${foesPerFloor(mod.floor)} foes`);
    for (const f of foes) {
      const enc = ENCOUNTERS[f.encounter];
      assert.ok(enc && enc.cave && enc.floor === mod.floor, `${mod.id}: ${f.encounter} is registered for the floor`);
      assert.equal(f.sprite, enc.leader, 'the field sprite is the encounter leader');
    }
    assert.ok(mod.events.some((e) => e.type === 'door' && e.kind === 'stairs' && e.to[0] === `cave_b${mod.floor + 1}`), 'the stairs lead one floor down');
    assert.ok(mod.events.filter((e) => e.type === 'chest').every((e) => e.tier === 'red' || e.tier === 'blue'));
  }
  assert.deepEqual(b.events.find((e) => e.id === 'stairs_down').to.slice(1, 3), arrivalOf(7, 3), 'B2 lands where B3 arrives');
  const [a2] = W.prepareFloor(g, 1);
  assert.equal(a2, a, 'the registered floor is kept, not rebuilt');
});

test('determinism: the same (seed, floor) is the same floor and the same chests on every run; another seed differs', () => {
  const x = W.buildFloor(7, 3, []), y = W.buildFloor(7, 3, []);
  assert.equal(strip(x), strip(y));
  assert.notEqual(strip(W.buildFloor(8, 3, [])), strip(x));
  // the vault at run start changes only the blue chest placement, never the rooms
  const v = W.buildFloor(7, 3, ['cave_catalogue_pen']);
  assert.deepEqual(v.ground, x.ground);
});

test('the pity rule (blueFloors): never a landing, never two in a row, never more than ten floors apart, only while the vault is incomplete', async () => {
  const { CAVE_UNIQUE_IDS } = await import('../../src/data/cave/items.js');
  for (const seed of [1, 7, 42, 1234, 99999]) {
    const floors = [...W.blueFloors(seed, [])].sort((a, b) => a - b);
    assert.ok(floors.length >= 9, `seed ${seed}: at least nine blue floors in 99 (${floors.length})`);
    let last = 0;
    for (const f of floors) {
      assert.ok(!isLanding(f) && f < 100, `seed ${seed}: B${f} is not a landing`);
      if (last) assert.ok(f - last >= 2, `seed ${seed}: B${f} is not right after B${last}`);
      assert.ok(f - last <= 10, `seed ${seed}: B${f} is within ten floors of B${last}`);
      last = f;
    }
  }
  assert.deepEqual([...W.blueFloors(7, CAVE_UNIQUE_IDS)], [], 'a complete vault places no blue chest');
  // a generated floor carries exactly the pity rule's chest
  const g = running(7);
  const blue = W.blueFloors(7, []);
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const [mod] = W.prepareFloor(g, n);
    assert.equal(mod.events.some((e) => e.type === 'chest' && e.tier === 'blue'), blue.has(n), `B${n} blue chest matches the rule`);
  }
});
test('a chest rng is a function of (seed, floor, chest id): the same roll twice, another chest rolls differently', async () => {
  const { CAVE_UNIQUE_IDS } = await import('../../src/data/cave/items.js');
  const opts = { props: [], landing: false, holdsBookmark: false };
  const a = rollRedChest(W.chestRng(7, 3, 'chest_1'), 3, [], opts);
  const b = rollRedChest(W.chestRng(7, 3, 'chest_1'), 3, [], opts);
  assert.deepEqual(a, b);
  const others = ['chest_2', 'chest_3', 'blue_chest'].map((id) => JSON.stringify(rollRedChest(W.chestRng(7, 3, id), 3, [], opts)));
  assert.ok(others.some((s) => s !== JSON.stringify(a)), 'another chest id rolls something else');
  assert.notEqual(JSON.stringify(rollRedChest(W.chestRng(8, 3, 'chest_1'), 3, [], opts)), JSON.stringify(a), 'another seed rolls something else');
  const u1 = rollBlueChest(W.chestRng(7, 12, 'blue_chest'), 12, [], {}), u2 = rollBlueChest(W.chestRng(7, 12, 'blue_chest'), 12, [], {});
  assert.equal(u1, u2);
  assert.ok(CAVE_UNIQUE_IDS.includes(u1));
});

test('B99 prepares the hand-made B100 and its stairs land on the map\'s `arrival` (the generator\'s [12, 18])', () => {
  const g = running(7);
  for (let i = 1; i < 99; i++) CAVE.descend(g);
  assert.equal(CAVE.floorOf(g), 99);
  const [b99, b100] = W.prepareFloor(g, 99);
  assert.equal(b99.id, 'cave_b99'); assert.equal(b100.id, 'cave_b100');
  assert.ok(!b100.placeholder, 'the real B100 (C2-sprites-boss)');
  assert.deepEqual(b99.events.find((e) => e.id === 'stairs_down').to, ['cave_b100', ...W.b100Arrival(), 'down']);
  assert.deepEqual(W.b100Arrival(), [12, 18]);
});

test('the entrance hall is registered with its marks; the landing spot after a reading is party_stop; the hall\'s stair into the Stacks is rewritten per run', async () => {
  const hall = await loadMap('cave_landing0');
  assert.ok(hall && hall.id === 'cave_landing0');
  assert.ok(!hall.fallback, 'the real hall (C2-sprites-boss)');
  for (const k of ['arrival', 'archivist', 'plaque', 'party_stop']) assert.ok(Array.isArray(hall.marks[k]), `mark ${k}`);
  assert.deepEqual(W.landingSpot(hall), hall.marks.party_stop);
  const g = running(7);
  const field = { game: g, cutscene: { running: false }, runScene: () => {}, showBoxes: () => {} };
  const to = W.HOOKS.beforeDoor(field, hall.events.find((e) => e.id === 'stairs_down').to);
  assert.deepEqual(to, ['cave_b2', ...arrivalOf(7, 2), 'down'], 'from B1 the hall stair placeholder would lead to B2 (the hooks never trust its x, y)');
  // the fallback hall still builds and carries the same marks (for a tree without the hand-made map)
  const fb = W.buildHallFallback();
  for (const k of ['arrival', 'archivist', 'plaque', 'stairs', 'return']) assert.ok(Array.isArray(fb.marks[k]), `fallback mark ${k}`);
});

test('mapcheck: the library with the trapdoor (patched into the cached module by register), the hall, B1 and B2 of seed 7, and the fallback hall validate like hand maps', async () => {
  const db = await loadDb();
  const maps = await loadAll();
  const lib = await loadMap('library');
  assert.equal(lib, (await import('../../src/data/maps/library.js')).default, 'the one cached module object');
  const ids = lib.events.filter((e) => /^stacks_trapdoor/.test(e.id)).map((e) => e.id).sort();
  assert.deepEqual(ids, ['stacks_trapdoor', 'stacks_trapdoor_locked'], 'the trapdoor and its sealed form are on the map once the pack registered');
  assert.deepEqual(lib.marks.stacks_trapdoor, [16, 4]);
  assert.deepEqual(lib.events.find((e) => e.id === 'stacks_trapdoor').to, ['cave_landing0', 5, 5, 'down']);
  assert.equal(W.installTrapdoor(lib), false, 'idempotent');
  const src = (await import('node:fs')).readFileSync(new URL('../../src/data/maps/library.js', import.meta.url), 'utf8');
  assert.ok(!/cave|stacks_trapdoor/i.test(src), 'library.js itself carries nothing of the Stacks (the precache is untouched)');
  const hall = peekMap('cave_landing0');
  const g = running(7);
  const [b1, b2] = W.prepareFloor(g, 1);
  const hallChecked = { ...hall, events: hall.events.map((e) => (e.id === 'stairs_down' ? { ...e, to: ['cave_b1', ...arrivalOf(7, 1), 'down'] } : e)) };
  Object.assign(maps, { library: lib, cave_landing0: hallChecked, cave_b1: b1, cave_b2: b2, cave_b3: W.buildFloor(7, 3, []), cave_fallback_hall: { ...W.buildHallFallback(), id: 'cave_fallback_hall' } });
  for (const m of [lib, hallChecked, b1, b2]) {
    const r = validate(m, db, maps, {});
    assert.deepEqual(r.errors, [], `${m.id}: ${r.errors.join('; ')}`);
    assert.ok(r.walk && !r.walk.error && r.walk.unreached.length === 0, `${m.id} walks`);
  }
  const fb = validate({ ...maps.cave_fallback_hall, events: maps.cave_fallback_hall.events.map((e) => (e.id === 'stairs_down' ? { ...e, to: ['cave_b1', ...arrivalOf(7, 1), 'down'] } : e)) }, db, maps, {});
  assert.deepEqual(fb.errors, [], `fallback hall: ${fb.errors.join('; ')}`);
});

test('the fallback story fills only what story.js and text.js did not: the scenes answer sceneAllowed, the plaque lines exist', async () => {
  const w = await W.register();
  const storyHere = !!W.worldModules().story;
  for (const id of ['stacks_locked', 'stacks_intro', 'stacks_enter', 'stacks_return', 'stacks_no_save', 'binder_intro', 'binder_cleared', 'cave_binder']) {
    assert.ok(sceneById(id), `scene ${id} exists (${storyHere ? 'story.js' : 'fallback'})`);
    if (!storyHere) assert.ok(w.fallbackScenes.includes(id), `${id} came from the fallback`);
  }
  if (!storyHere) {
    assert.ok(sceneById('stacks_archivist'), 'the dispatcher exists only while story.js is absent');
    assert.equal(sceneAllowed('stacks_enter', () => false), false, 'stacks_enter waits for deep_stacks_open');
    assert.equal(sceneAllowed('stacks_enter', (f) => f === 'deep_stacks_open'), true);
    assert.equal(sceneAllowed('stacks_locked', (f) => f === 'ep1_complete'), false, 'the sealed line stops at ep1_complete');
  }
  for (const id of ['plaque_hall', 'plaque_b10', 'plaque_b50', 'plaque_b90']) assert.ok(typeof LINES[id] === 'string' && LINES[id].length > 10, `line ${id}`);
  assert.equal(W.plaqueId(10), 'plaque_b10'); assert.equal(W.plaqueId(0), 'plaque_hall');
  assert.equal(W.floorTagOf(23), 'B23');
  for (const k of ['close', 'bank', 'quit_ask', 'save_refused', 'floor_tag']) assert.ok(W.textOf(k) && !W.textOf(k).includes(EM_DASH), `text ${k}`);
});

test('no em dash in the world module, the tests and the rig', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const f of ['../../src/data/cave/world.js', 'world_floors.test.mjs', 'world_exits.test.mjs', 'world_hooks.test.mjs', 'world_headless.py']) {
    const p = path.join(here, f);
    if (!fs.existsSync(p)) continue;
    assert.ok(!fs.readFileSync(p, 'utf8').includes(EM_DASH), `${f} has no em dash`);
  }
});
