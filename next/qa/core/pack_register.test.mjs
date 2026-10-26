// Pack registration (src/data/<id>/index.js): every shared table a pack must be able to extend, the fixed module order, the
// guard for missing modules, idempotency, and the three seams (registerStory, prependTalk, FLAG_IDS). A fixture copy of the real
// index.js runs against stub data modules, so this keeps passing whatever the real X1/X2 modules contain.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const U = (rel) => pathToFileURL(path.join(NEXT, rel)).href;
const out = path.join(NEXT, 'qa', 'out');
fs.mkdirSync(out, { recursive: true });
const root = fs.mkdtempSync(path.join(out, 'pack_fx_'));
test.after(() => { try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });

const ORDER = ['flags', 'enemies', 'items', 'loot', 'encounters', 'shops', 'npcs', 'quests', 'text', 'story'];
const indexSrc = fs.readFileSync(path.join(NEXT, 'src/data/x1/index.js'), 'utf8');

/** Build a fixture pack dir `<root>/<name>/x1/` with a copy of index.js and the named stub modules. */
function fixture(name, modules, extra = {}) {
  const dir = path.join(root, name, 'x1');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.js'), indexSrc);
  for (const m of modules) fs.writeFileSync(path.join(dir, `${m}.js`), stubs(m, extra));
  return pathToFileURL(path.join(dir, 'index.js')).href;
}

function stubs(m, extra) {
  const log = `(globalThis.__fx ||= []).push('${m}');`;
  switch (m) {
    case 'flags': return `import { FLAGS, FLAG_IDS } from '${U('src/data/quests.js')}';
      export function register() { ${log} FLAGS.fx_flag = 'fixture flag'; if (!FLAG_IDS.includes('fx_flag')) FLAG_IDS.push('fx_flag'); }`;
    case 'enemies': return `import { ENEMIES } from '${U('src/data/enemies.js')}';
      export function register() { ${log} ENEMIES.fx_foe = { id: 'fx_foe', name: 'Fixture Foe', exp: 1 }; }`;
    case 'items': return `import { ITEMS } from '${U('src/data/items.js')}';
      export function register() { ${log} ITEMS.fx_item = { id: 'fx_item', name: 'Fixture Item' }; }`;
    case 'loot': return `import { ZONE_LOOT } from '${U('src/data/loot-tables.js')}';
      export function register() { ${log} ZONE_LOOT.fx_zone = { tier: 1 }; }`;
    case 'encounters': return `import { ENCOUNTERS, ZONES } from '${U('src/data/encounters.js')}';
      export const X1_MAPS_LISTED = ${extra.listed ? 'true' : 'false'};
      export function register() { ${log} ENCOUNTERS.fx_enc = { id: 'fx_enc', zone: 'fx_zone', enemies: ['fx_foe'] };
        Object.defineProperty(ZONES, 'fx_zone', { value: { id: 'fx_zone', name: 'Fixture' }, enumerable: X1_MAPS_LISTED, configurable: true, writable: true }); }`;
    case 'shops': return `import { SHOPS } from '${U('src/data/shops.js')}';
      export function register() { ${log} SHOPS.fx_shop = { id: 'fx_shop' }; }`;
    case 'npcs': return `import { NPCS, prependTalk } from '${U('src/data/npcs.js')}';
      const ENTRY = { if: 'fx_flag', lines: ['A new line, first.'] };
      export function register() { ${log} NPCS.fx_npc = { name: 'Fix', sprite: 'npc_elder', map: 'fx_map', talk: [{ lines: ['hi'] }] }; prependTalk('mael', [ENTRY]); }`;
    case 'quests': return `import { ALL_SIDE_QUESTS, BANTER } from '${U('src/data/quests.js')}';
      const Q = { id: 'fx_quest', title: 'Fixture', start: 'fx_flag', done: 'fx_done', steps: [{ done: 'fx_done', journal: 'j', chat: [] }] };
      export function register() { ${log} if (!ALL_SIDE_QUESTS.includes(Q)) ALL_SIDE_QUESTS.push(Q); BANTER.fx_map = [{ lines: [] }]; }`;
    case 'text': return `import { BANNERS, BOOKS, BARKS, BESTIARY } from '${U('src/data/text.js')}';
      export function register() { ${log} BANNERS.fx_map = { title: 'Fixture Place' }; BOOKS.fx_book = { title: 'B', pages: ['p'] }; BARKS.fx_bark = []; BESTIARY.fx_foe = { text: 't' }; }`;
    case 'story': return `import { registerStory } from '${U('src/game/story.js')}';
      const scenes = { fx_scene: async () => 1 };
      export function register() { ${log} globalThis.__fx_collisions = registerStory({ scenes, lines: { fx_line: 'Fixture line' }, conditions: { fx_scene: { if: 'fx_flag', ifNot: 'fx_done' } } }); }`;
    case 'boom': return `export function register() { ${log} if (!globalThis.__fx_boom_ok) throw new Error('boom'); }`;
    default: throw new Error(m);
  }
}

test('register(): the fixed order, every shared table mutated, idempotent', async () => {
  globalThis.__fx = [];
  const idx = await import(fixture('full', ORDER));
  assert.equal(idx.X1_READY, false);
  const r = await idx.register();
  assert.deepEqual(r.loaded, ORDER);
  assert.deepEqual(r.skipped, []);
  assert.equal(idx.X1_READY, true);
  assert.deepEqual(globalThis.__fx, ORDER, 'register() ran in the fixed order');

  const q = await import(U('src/data/quests.js'));
  assert.equal(q.FLAGS.fx_flag, 'fixture flag');
  assert.ok(q.FLAG_IDS.includes('fx_flag'), 'FLAG_IDS gains the pack\'s flags');
  assert.ok(q.ALL_SIDE_QUESTS.some((s) => s.id === 'fx_quest'));
  assert.ok(q.BANTER.fx_map);
  assert.equal(q.activeSideQuests((f) => f === 'fx_flag').some((s) => s.quest.id === 'fx_quest'), true, 'a registered quest is live in the journal helpers');
  assert.ok((await import(U('src/data/enemies.js'))).ENEMIES.fx_foe);
  assert.ok((await import(U('src/data/items.js'))).ITEMS.fx_item);
  assert.ok((await import(U('src/data/loot-tables.js'))).ZONE_LOOT.fx_zone);
  const enc = await import(U('src/data/encounters.js'));
  assert.ok(enc.ENCOUNTERS.fx_enc);
  assert.ok(enc.ZONES.fx_zone, 'the zone resolves by id');
  assert.ok(!Object.keys(enc.ZONES).includes('fx_zone'), 'but stays out of Object.keys(ZONES) until the map listing flag is flipped');
  assert.equal(idx.X1_MAPS_LISTED, false);
  assert.ok((await import(U('src/data/shops.js'))).SHOPS.fx_shop);
  const npcs = await import(U('src/data/npcs.js'));
  assert.ok(npcs.NPCS.fx_npc);
  assert.equal(npcs.NPCS.mael.talk[0].if, 'fx_flag', 'prependTalk put the entry first');
  const t = await import(U('src/data/text.js'));
  assert.ok(t.BANNERS.fx_map && t.BOOKS.fx_book && t.BARKS.fx_bark && t.BESTIARY.fx_foe);
  const s = await import(U('src/game/story.js'));
  assert.equal(typeof s.SCENES.fx_scene, 'function');
  assert.equal(s.LINES.fx_line, 'Fixture line');
  assert.deepEqual(globalThis.__fx_collisions, { scenes: [], lines: [], conditions: [] });
  assert.equal(s.sceneAllowed('fx_scene', (f) => f === 'fx_flag'), true, 'the scene-condition lookup sees the pack guard');
  assert.equal(s.sceneAllowed('fx_scene', () => false), false);
  assert.equal(s.sceneAllowed('fx_scene', (f) => f === 'fx_flag' || f === 'fx_done'), false);
  assert.deepEqual(s.storyCollisions(), { scenes: [], lines: [] });

  const again = await idx.register();
  assert.deepEqual(globalThis.__fx, ORDER, 'a second register() does nothing');
  assert.equal(again, r, 'and returns the same result');
  assert.equal(npcs.NPCS.mael.talk.filter((e) => e.if === 'fx_flag').length, 1, 'no double prepend');
  assert.equal(q.FLAG_IDS.filter((f) => f === 'fx_flag').length, 1);
});

test('the map listing flag mirrors encounters.js and the zone is enumerable only then', async () => {
  const idx = await import(fixture('listed', ['encounters'], { listed: true }));
  const r = await idx.register();
  assert.deepEqual(r.loaded, ['encounters']);
  assert.equal(idx.X1_MAPS_LISTED, true);
  const enc = await import(U('src/data/encounters.js'));
  assert.ok(Object.keys(enc.ZONES).includes('fx_zone'));
});

test('a skeleton with no data modules registers cleanly (every module skipped, READY set)', async () => {
  const idx = await import(fixture('skeleton', []));
  const r = await idx.register();
  assert.deepEqual(r.loaded, []);
  assert.deepEqual(r.skipped, ORDER);
  assert.equal(idx.X1_READY, true);
  assert.equal(idx.X1_MAPS_LISTED, false);
});

test('only the modules that exist register, in the fixed order, whatever order they were written in', async () => {
  globalThis.__fx = [];
  const idx = await import(fixture('partial', ['story', 'enemies', 'flags']));
  const r = await idx.register();
  assert.deepEqual(r.loaded, ['flags', 'enemies', 'story']);
  assert.deepEqual(r.skipped, ORDER.filter((m) => !['flags', 'enemies', 'story'].includes(m)));
  assert.deepEqual(globalThis.__fx, ['flags', 'enemies', 'story']);
});

test('a module that throws is NOT swallowed, and a retry re-runs only what did not finish', async () => {
  globalThis.__fx = [];
  globalThis.__fx_boom_ok = false;
  // 'boom' is not in ORDER, so run it as the shops module
  const dir = path.join(root, 'boom', 'x1');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.js'), indexSrc);
  fs.writeFileSync(path.join(dir, 'enemies.js'), stubs('enemies', {}));
  fs.writeFileSync(path.join(dir, 'shops.js'), stubs('boom', {}));
  const idx = await import(pathToFileURL(path.join(dir, 'index.js')).href);
  await assert.rejects(() => idx.register(), /boom/);
  assert.equal(idx.X1_READY, false);
  globalThis.__fx_boom_ok = true;
  const r = await idx.register();
  assert.deepEqual(r.loaded, ['enemies', 'shops']);
  assert.deepEqual(globalThis.__fx, ['enemies', 'boom', 'boom'], 'enemies ran once; the failed module ran again');
  assert.equal(idx.X1_READY, true);
});

test('registerStory reports a collision instead of shadowing, and prependTalk only prepends', async () => {
  const s = await import(U('src/game/story.js'));
  const existing = Object.keys(s.SCENES)[0];
  const before = s.SCENES[existing];
  const res = s.registerStory({ scenes: { [existing]: () => 'other' }, lines: {}, conditions: {} });
  assert.deepEqual(res.scenes, [existing]);
  assert.equal(s.SCENES[existing], before, 'the existing scene is untouched');
  assert.ok(s.storyCollisions().scenes.includes(existing));
  const same = s.registerStory({ scenes: { [existing]: before } });
  assert.deepEqual(same.scenes, [], 'registering the same value again is not a collision');
  const npcs = await import(U('src/data/npcs.js'));
  const len = npcs.NPCS.iris ? npcs.NPCS.iris.talk.length : 0;
  const e = { if: 'zz_flag', lines: ['x'] };
  assert.equal(npcs.prependTalk('iris', [e]), npcs.NPCS.iris ? 1 : 0);
  if (npcs.NPCS.iris) { assert.equal(npcs.NPCS.iris.talk.length, len + 1); assert.equal(npcs.NPCS.iris.talk[0], e); }
  assert.equal(npcs.prependTalk('no_such_npc', [e]), 0);
});

test('the real skeletons import and register cleanly with whatever modules exist today', async () => {
  for (const id of ['x1', 'x2']) {
    const idx = await import(U(`src/data/${id}/index.js`));
    assert.equal(typeof idx.register, 'function');
    const r = await idx.register();
    assert.equal(r.id, id);
    assert.ok(Array.isArray(r.loaded) && Array.isArray(r.skipped));
    assert.equal(r.loaded.length + r.skipped.length, ORDER.length);
  }
});

test('a module that exists but imports something missing is an error, not "skipped"', async () => {
  const dir = path.join(root, 'nested', 'x1');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.js'), indexSrc);
  fs.writeFileSync(path.join(dir, 'items.js'), `import './not_there.js'; export function register() {}`);
  const idx = await import(pathToFileURL(path.join(dir, 'index.js')).href);
  await assert.rejects(() => idx.register(), /not_there/);
  assert.equal(idx.X1_READY, false);
});
