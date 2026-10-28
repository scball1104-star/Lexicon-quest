// C4-fixes (docs/briefs/C4-fixes.md, docs/CRITIQUE_STACKS.md): the world half of the critique's fixes, pure and on fakes.
//   1   a stair the generator refuses twice: the party, the run and the tag stay on the floor, one line; a refused floor is
//       built from its second seed; the tag reads the map on screen
//   3   the suspend save: inBattle at battle start, the beaten foe in `gone` after it, never inBattle in the live game; Resume
//       restarts that fight (the party as suspended) and never brings a beaten foe back
//   4   rule 3, the Bookmark's line and its question say a fall takes back this reading's gifts
//   12  Hollis asks before a new reading would write over a suspended one; Keep it keeps it
//   13  B1 to B3: the floor's first red chest lends a bare-handed reader a weapon of his kind
//   17  B100: no Quill chest, the plaque in the antechamber (mapcheck), the Binder's drops never prompt before its line
//   20  B1 of a reading that brought the vault down: one question, then Optimize
//   8, 15  no cures from foes, no gold in chests, a spare Bookmark at most
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.LQ_CAVE_ON = true;
const { ensurePack } = await import('../../src/game/packs.js');
await ensurePack('cave', { quiet: true, warm: false });
const W = await import('../../src/data/cave/world.js');
const S = await import('../../src/data/cave/story.js');
const TXT = await import('../../src/data/cave/text.js');
const CAVE = await import('../../src/game/cave.js');
const L = await import('../../src/data/cave/loot.js');
const { newGameEp2, serialize, addGear, count } = await import('../../src/game/state.js');
const { generateFloor, arrivalOf, registerBand, BANDS, CaveGenError } = await import('../../src/data/cave/gen.js');
const { PREFAB_SETS } = await import('../../src/data/cave/prefabs.js');
const { peekMap } = await import('../../src/world/maps.js');
const { ENCOUNTERS } = await import('../../src/data/encounters.js');
const { EQUIPMENT, KEY_ITEMS } = await import('../../src/data/items.js');
const { createEncounterBattle, makeRng } = await import('../../src/battle/rules.js');
const { rollBattleDrops, rollBase } = await import('../../src/battle/loot.js');
const { ZONE_LOOT } = await import('../../src/data/loot-tables.js');
const { createRng } = await import('../../src/core/rng.js');
const { runOnce } = await import('../content/_harness.mjs');
const { loadDb, validate } = await import('../../tools/maps/mapcheck.mjs');
const { asHandMap } = await import('./gen_helpers.mjs');
const fs = await import('node:fs');

function running(seed = 7) {
  const g = newGameEp2('Arden');
  assert.ok(CAVE.enter(g, { seed, playtime: 100 }));
  return g;
}
const fakeField = (g, extra = {}) => ({ name: 'field', game: g, cutscene: { running: false }, scenes: [], boxes: [], runScene(id) { this.scenes.push(id); }, showBoxes(b) { this.boxes.push(...b); }, engine: { after(n, fn) { fn(); } }, ...extra });
/** A save stub with the real envelope shape (core/save.js save / loadEnvelope / exists / remove). */
function fakeSave() {
  const slots = {};
  return { slots, save(slot, data, meta) { slots[slot] = { data: JSON.parse(JSON.stringify(data)), meta }; return true; }, loadEnvelope: (slot) => slots[slot] || null, exists: (slot) => !!slots[slot], remove(slot) { delete slots[slot]; } };
}

test('issue 1: a stair the generator refuses twice keeps the party, the run and the tag on the floor with one line; the next try after a fix goes down', () => {
  const saved = PREFAB_SETS.catalogue;
  const g = running(90901);
  const f = fakeField(g);
  W.prepareFloor(g, 1);
  assert.equal(W.HOOKS.beforeDoor(f, ['cave_b2', 0, 0, 'down'])[0], 'cave_b2');   // B2 and B3 are built now
  try {
    registerBand('catalogue', { prefabs: [] });   // the generator now refuses every catalogue floor not yet built
    assert.throws(() => generateFloor(90901, 4), CaveGenError);
    // B3 was built: the stair goes down; B4 (its n + 1) is refused and skipped, not thrown
    assert.equal(W.HOOKS.beforeDoor(f, ['cave_b3', 0, 0, 'down'])[0], 'cave_b3');
    assert.equal(CAVE.floorOf(g), 3);
    assert.ok(!peekMap('cave_b4') || peekMap('cave_b4').seed !== 90901, 'B4 of this reading was not registered');
    // B3's stair: B4 refused on its first seed and its second: the party stays, one line, the run still says B3
    const before = f.boxes.length;
    assert.equal(W.HOOKS.beforeDoor(f, ['cave_b4', 0, 0, 'down']), false);
    assert.equal(CAVE.floorOf(g), 3, 'the run did not move');
    assert.equal(W.HOOKS.floorTag(g), 'B3');
    assert.deepEqual(f.boxes.slice(before), [{ who: null, text: TXT.STACKS_TEXT.stair_stuck }]);
  } finally { registerBand('catalogue', { prefabs: saved }); }
  assert.equal(W.HOOKS.beforeDoor(f, ['cave_b4', 0, 0, 'down'])[0], 'cave_b4', 'with the band whole again the same stair goes down');
  assert.equal(CAVE.floorOf(g), 4);
});

test('issue 1: a refused floor is built from its second seed (the run keeps its foes and blue chest; the arrival is the module\'s own)', () => {
  const seed = 1234, floor = 6;
  const again = W.floorSeedAgain(seed, floor);
  assert.equal(again, W.floorSeedAgain(seed, floor), 'deterministic (a resume rebuilds the same floor)');
  assert.notEqual(again, seed);
  const mod = W.buildFloor(seed, floor, [], again);
  assert.deepEqual(mod.marks.arrival, arrivalOf(again, floor), 'laid out from the second seed');
  const foes = mod.events.filter((e) => e.type === 'enemy').map((e) => e.encounter);
  assert.ok(foes.length && foes.every((id) => id.startsWith(`cave_b${floor}_e`) && ENCOUNTERS[id]), 'the reading\'s own encounters');
  assert.equal(mod.events.some((e) => e.type === 'chest' && e.tier === 'blue'), W.blueFloors(seed, []).has(floor), 'the run\'s pity rule decides the blue chest');
});

test('issue 1: the floor tag reads the map on screen, not the run (the stair\'s fade runs a floor ahead)', () => {
  const g = running(7);
  W.prepareFloor(g, 1);
  CAVE.descend(g); CAVE.descend(g);   // the run says B3
  const texts = [];
  const r = { W: 384, H: 216, measure: (t) => String(t).length * 5, text: (t) => texts.push(String(t)), rect() {}, nineSlice() {}, sprite() {}, image() {}, withAlpha: (a, fn) => fn(), pixel() {}, ctx: { fillRect() {} }, assets: { has: () => false, atlas: () => null }, settings: {} };
  const field = { game: g, map: { mod: { floor: 2 }, mark: () => null }, loading: false, banner: null, closeup: null, fadeAlpha: 0, leader: null };
  W.HOOKS.drawTag(field, r);
  assert.ok(texts.includes('B2') && !texts.includes('B3'), `the tag drew ${texts}`);
});

test('issue 3: the suspend knows the fight: inBattle at its start, the beaten foe in `gone` after it, never inBattle in the live game; a flee leaves the foe', async () => {
  const g = running(5);
  const [b1] = W.prepareFloor(g, 1);
  const foes = b1.events.filter((e) => e.type === 'enemy');
  const [foe, other] = foes;
  const save = fakeSave();
  const field = { name: 'field', dead: false, game: g, mapId: 'cave_b1', dungeonGone: new Map([['cave_b1', new Set([other.id])]]),
    entities: new Map(foes.map((e) => [e.id, { id: e.id, type: 'enemy', ev: e, present: true, actor: { data: { fighting: e.id === foe.id } } }])),
    leader: { tx: 6, ty: 7, dir: 'left' }, cutscene: { running: false } };
  const engine = { save, scenes: [field], scene: field, game: g, after() {} };
  field.engine = engine;
  W.bindWorld(engine);
  const { battle } = createEncounterBattle(foe.encounter, { party: g.party, rng: makeRng(1), inventory: g.items });
  W.HOOKS.armBattle(battle, g);
  const at = save.slots.cave.data.cave.run;
  assert.deepEqual(at.inBattle, { floor: 1, foe: foe.id, enc: foe.encounter, pos: [6, 7, 'left'] });
  assert.deepEqual(at.gone, { floor: 1, ids: [other.id] });
  assert.equal(g.cave.run.inBattle, undefined, 'the live game never keeps inBattle');
  assert.equal(save.slots.cave.meta.cave.floor, 1);
  const startHp = save.slots.cave.data.party.map((m) => m.hp);
  // a flee: the suspend drops inBattle and keeps the foe standing
  await W.HOOKS.afterBattle(field, foe.encounter, 'flee');
  assert.equal(save.slots.cave.data.cave.run.inBattle, undefined);
  assert.deepEqual(save.slots.cave.data.cave.run.gone.ids, [other.id]);
  // a win: the foe joins `gone` (the field adds it to dungeonGone only after this hook)
  W.HOOKS.armBattle(battle, g);
  g.party[0].hp = 3;
  await W.HOOKS.afterBattle(field, foe.encounter, 'win');
  const after = save.slots.cave.data.cave.run;
  assert.equal(after.inBattle, undefined);
  assert.deepEqual(after.gone.ids.sort(), [foe.id, other.id].sort());
  assert.equal(save.slots.cave.data.party[0].hp, 3, 'the state after the fight is the one kept');
  assert.ok(startHp.length === 3);
});

test('issue 3: Resume from a suspend written in a fight restarts that fight where it began, with the party as suspended and the beaten foes gone', async () => {
  const g = running(5);
  const [b1] = W.prepareFloor(g, 1);
  const [foe, other] = b1.events.filter((e) => e.type === 'enemy');
  g.party[1].hp = 17;
  g.cave.run.inBattle = { floor: 1, foe: foe.id, enc: foe.encounter, pos: [6, 7, 'left'] };
  g.cave.run.gone = { floor: 1, ids: [other.id] };
  const save = fakeSave();
  save.save('cave', serialize(g), CAVE.suspendMeta(g));
  delete g.cave.run.inBattle;
  const queued = [];
  let resetWith = null;
  const engine = { save, after(n, fn) { queued.push(fn); }, reset(name, data) { resetWith = [name, data]; return { name: 'field', dungeonGone: new Map() }; } };
  const field2 = { dungeonGone: new Map() };
  engine.reset = (name, data) => { resetWith = [name, data]; return field2; };
  const r = await W.resumeReading(engine);
  assert.ok(r.ok && r.floor === 1 && r.fight === foe.id, JSON.stringify(r));
  assert.deepEqual(resetWith, ['field', { map: 'cave_b1', x: 6, y: 7, dir: 'left' }], 'the party stands where the fight began');
  assert.deepEqual([...field2.dungeonGone.get('cave_b1')], [other.id], 'the beaten foe stays beaten');
  assert.equal(queued.length, 1, 'the fight is restarted once the field is up');
  assert.equal(engine.game.party[1].hp, 17, 'the party as suspended');
  assert.equal(engine.game.cave.run.inBattle, undefined, 'and the live game does not carry the mark on');
  // a suspend written on arrival resumes at the arrival, as before
  const g2 = running(5); W.prepareFloor(g2, 1);
  const save2 = fakeSave(); save2.save('cave', serialize(g2), CAVE.suspendMeta(g2));
  const e2 = { save: save2, after() { throw new Error('no fight to restart'); }, reset: (name, data) => { resetWith = [name, data]; return { dungeonGone: new Map() }; } };
  const r2 = await W.resumeReading(e2);
  assert.ok(r2.ok && r2.fight === null);
  assert.deepEqual(resetWith[1], { map: 'cave_b1', x: arrivalOf(5, 1)[0], y: arrivalOf(5, 1)[1], dir: 'down' });
});

test('issue 4: rule 3, the Bookmark\'s line and its question say a fall takes back this reading\'s gifts, in Hollis\'s two-line boxes', async () => {
  assert.match(TXT.LINES.rule_3, /Bookmark.*Fall instead, and the Stacks take back this reading's gifts\./);
  assert.match(TXT.STACKS_TEXT.bank_ask, /gifts come up with you/);
  assert.equal(KEY_ITEMS.keepers_bookmark.desc, TXT.STACKS_TEXT.bookmark_desc, 'world.js wrote the line over items.js\'s');
  for (const s of [TXT.LINES.rule_3, TXT.STACKS_TEXT.bank_ask, TXT.STACKS_TEXT.bookmark_desc, TXT.LINES.abandon, TXT.LINES.abandon_kept, TXT.STACKS_TEXT.stair_stuck, TXT.STACKS_TEXT.vault_ask]) {
    assert.ok(s.length <= 120, `two lines in the box: ${s}`);
    assert.ok(!s.includes(String.fromCharCode(0x2014)), 'no em dash');
  }
});

test('issue 12: with a reading suspended, Begin asks "A reading is open below. Abandon it?"; Keep it keeps it, Abandon it goes on to the confirm', async () => {
  const calls = [];
  const prev = { world: S.SEAM.world, game: S.PROBE.game, engine: S.PROBE.engine };
  S.SEAM.world = { suspendOpen: () => true, beginReading: async () => { calls.push('begin'); return { ok: true }; } };
  S.PROBE.game = () => null; S.PROBE.engine = () => ({});
  try {
    const flags = ['deep_stacks_open', 'stacks_vault_reminded'];
    const says = (log) => log.filter((e) => e.op === 'say').map((e) => e.args[1]);
    const keep = await runOnce(S.rawScenes.stacks_enter, { decisions: [0, 1], flags, branchFlags: false });
    assert.deepEqual(says(keep.log), [TXT.LINES.offer, TXT.LINES.abandon, TXT.LINES.abandon_kept]);
    assert.deepEqual(keep.log.filter((e) => e.op === 'choice')[1].args[0], [TXT.LINES.abandon_yes, TXT.LINES.abandon_no]);
    assert.deepEqual(calls, [], 'Keep it: no new reading');
    const go = await runOnce(S.rawScenes.stacks_enter, { decisions: [0, 0, 0], flags, branchFlags: false });
    assert.deepEqual(says(go.log), [TXT.LINES.offer, TXT.LINES.abandon, TXT.LINES.confirm]);
    assert.deepEqual(calls, ['begin']);
    // no suspend: the offer is as before (Begin, the confirm)
    S.SEAM.world.suspendOpen = () => false;
    const plain = await runOnce(S.rawScenes.stacks_enter, { decisions: [0, 0], flags, branchFlags: false });
    assert.deepEqual(says(plain.log), [TXT.LINES.offer, TXT.LINES.confirm]);
    assert.ok(S.BOX_BUDGET.stacks_enter >= 3);
  } finally { S.SEAM.world = prev.world; S.PROBE.game = prev.game; S.PROBE.engine = prev.engine; }
  // world.js: suspendOpen reads the slot
  const save = fakeSave();
  assert.equal(W.suspendOpen({ save }), false);
  save.save('cave', {}, {});
  assert.equal(W.suspendOpen({ save }), true);
});

test('issue 13: B1 to B3, the floor\'s first red chest lends the first bare-handed reader a weapon of his kind; once a floor; never deeper', () => {
  const g = running(31);
  const o1 = W.redChestOpts(g, 1, false);
  assert.equal(o1.lend, 'sword', 'the hero is bare-handed: a sword');
  assert.equal(W.redChestOpts(g, 1, false).lend, undefined, 'the second chest of the floor lends as usual');
  const r = L.rollRedChest(createRng(5), 1, [], o1);
  assert.equal(r.items.length, 1);
  assert.equal(EQUIPMENT[r.items[0].base].type, 'sword');
  // the hero holds a sword now: the next floor lends to Mira (staff), then Bram (spear)
  g.party[0].equip.sword = r.items[0];
  assert.equal(W.redChestOpts(g, 2, false).lend, 'staff');
  g.party[1].equip.staff = { base: 'oak_staff', rarity: 'common', ilvl: 2, affixes: [], name: 'Oak Staff' };
  assert.equal(W.redChestOpts(g, 3, false).lend, 'spear');
  assert.equal(W.redChestOpts(g, 4, false).lend, undefined, 'B4: no lending');
  assert.equal(L.rollRedChest(createRng(5), 4, [], { lend: 'axe' }).items.length <= 1, true);
  // a fallen reader is skipped
  const g2 = running(32); g2.party[0].hp = 0;
  assert.equal(W.redChestOpts(g2, 1, false).lend, 'staff');
});

test('Known 4: below every base, a battle drop draws the slot\'s lowest bases of every type (B1 to B5 lent only Short Swords); the base game\'s item levels draw as before', () => {
  const types = new Set();
  const rng = createRng(9);
  for (let i = 0; i < 300; i++) { const b = rollBase(rng, { slot: 'weapon', ilvl: 1 }); assert.equal(b.ilvl, Math.min(...Object.values(EQUIPMENT).filter((x) => x.slot === 'weapon').map((x) => x.ilvl))); types.add(b.type); }
  assert.ok(types.size >= 4, `weapon kinds at item level 1: ${[...types]}`);
  for (let i = 0; i < 100; i++) assert.equal(rollBase(createRng(i), { slot: 'weapon', ilvl: 1, type: 'staff' }).type, 'staff', 'the type is kept');
  for (let i = 0; i < 100; i++) { const b = rollBase(createRng(i), { slot: 'body', ilvl: 6 }); assert.ok(b.slot === 'body' && b.ilvl <= 6); }
});

test('issues 8 and 15: foes drop no cures inside the Stacks (deep bands no plain Potions either), red chests hold no gold, a spare Bookmark at most', () => {
  for (const id of ['cave_band_1', 'cave_band_2', 'cave_band_3', 'cave_band_4', 'cave_band_5']) for (const c of L.CURE_IDS) assert.ok(ZONE_LOOT[id].noDrops.includes(c), `${id} ${c}`);
  assert.ok(ZONE_LOOT.cave_band_5.noDrops.includes('potion') && !ZONE_LOOT.cave_band_1.noDrops.includes('potion'));
  const killed = [{ id: 'page_wraith', drops: [{ item: 'echo_herb', chance: 1 }, { item: 'ether', chance: 1 }], lootZone: 'archive_f1' }];
  const inside = rollBattleDrops(createRng(1), killed, { zone: 'cave_band_1' }).consumables.map((c) => c.item);
  const outside = rollBattleDrops(createRng(1), killed, { zone: 'archive_f1' }).consumables.map((c) => c.item);
  assert.deepEqual(inside, ['ether']); assert.deepEqual(outside.sort(), ['echo_herb', 'ether']);
  // an elite's drop rolls at the floor's item level inside the Stacks (its home zone's outside)
  L.setLootFloor(75);
  const elite = rollBattleDrops(createRng(2), [{ id: 'ink_slime', elite: ['swift'], drops: [], lootZone: 'valley' }], { zone: 'cave_band_4' });
  assert.equal(elite.items[0].ilvl, L.itemLevel(75) + 1);
  for (let i = 0; i < 300; i++) {
    const r = L.rollRedChest(createRng(i), 40, [], { bookmarks: 2 });
    assert.equal(r.gold, 0);
    assert.equal(r.bookmark, false, 'two held: no third');
  }
  let some = 0; for (let i = 0; i < 400; i++) if (L.rollRedChest(createRng(i), 40, [], { bookmarks: 1 }).bookmark) some++;
  assert.ok(some > 20, `one held: a spare still turns up (${some} of 400)`);
  // the deep larder leans to Hi-Potions and Hi-Ethers
  for (const k of [3, 4, 5]) {
    const rows = L.CONSUMABLES_BY_BAND[k], total = rows.reduce((s, r) => s + r.weight, 0);
    const hi = rows.filter((r) => r.item === 'hi_potion' || r.item === 'hi_ether').reduce((s, r) => s + r.weight, 0);
    assert.ok(hi / total >= 0.85, `band ${k}: ${hi} of ${total}`);
  }
});

test('issue 17: B100 carries no Quill chest and hangs its plaque in the antechamber (mapcheck clean); the Binder\'s win prompts nothing before its line', async () => {
  const g = running(11);
  for (let i = 0; i < 98; i++) CAVE.descend(g);
  W.prepareFloor(g, 99);
  const b100 = peekMap('cave_b100');
  assert.ok(b100 && !b100.events.some((e) => e.id === 'quill_chest'), 'no Quill chest');
  const sign = b100.events.find((e) => e.id === 'plaque');
  assert.deepEqual([sign.type, sign.x, sign.y, sign.text, sign.sprite], ['sign', ...W.B100_PLAQUE, 'plaque_b100', 'plaque']);
  assert.equal(W.installB100(b100), false, 'idempotent');
  // the pack's seams shimmed as qa/cave/art_maps.test.mjs does (the cave_props objects, the field sprites, the fight's scene)
  const db = await loadDb();
  const json = (rel) => JSON.parse(fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(json('assets/sprites/cave_props.json').objects)) if (!db.props.objects[k]) db.props.objects[k] = v;
  for (const [k, v] of Object.entries(json('assets/sprites/cave_enemies_field.json').sprites)) if (!db.enemiesField.sprites[k]) db.enemiesField.sprites[k] = v;
  db.scenes.cave_binder = true; db.FLAGS.deep_stacks_cleared = true;
  const m = asHandMap(b100, db);
  const res = validate(m, db, { cave_b100: m }, {});
  assert.deepEqual(res.errors, [], res.errors.join('; '));
  assert.deepEqual(res.walk.unreached, [], `unreached: ${res.walk.unreached.join(' ')}`);
  assert.ok(res.walk && !res.walk.error, 'B100 walks');
  // the Binder's win: the lent drops are dropped, the clear is queued
  const queued = [];
  const engine = { lastBattleDrops: [4, 5], after(n, fn) { queued.push(fn); } };
  const field = { game: g, engine, entities: new Map(), cutscene: { running: false } };
  CAVE.descend(g);
  assert.equal(await W.HOOKS.afterBattle(field, 'cave_binder', 'win'), false);
  assert.equal(engine.lastBattleDrops, null, 'no equip prompt before "The Binder comes apart..."');
  assert.equal(queued.length, 1, 'the clear flow is queued');
});

test('issue 20: B1 of a reading that brought the vault down asks once, then Optimize puts it on', async () => {
  const g = newGameEp2('Arden');
  CAVE.ensureCave(g).vault.push('cave_catalogue_pen', 'cave_reading_hood');
  assert.ok(CAVE.enter(g, { seed: 3, playtime: 0 }));
  const asked = [];
  const field = { name: 'field', dead: false, game: g, loading: false, pendingWarp: null, cutscene: { running: false }, inputLocked: 0 };
  const engine = { game: g, scenes: [field], scene: field, transition: null, audio: { sfx() {} }, toasts: { async show(o) { asked.push(['toast', o.text]); } },
    hasScene: (n) => n === 'dialog', async pushAwait(n, d) { asked.push([n, d.text, d.choices]); return 0; }, waitFrames: async () => {} };
  const n = await W.vaultOffer(engine, g);
  assert.ok(n >= 2, `pieces put on: ${n}`);
  assert.deepEqual(asked[0], ['dialog', TXT.STACKS_TEXT.vault_ask, [TXT.STACKS_TEXT.vault_yes, TXT.STACKS_TEXT.vault_no]]);
  assert.ok(g.party.some((m) => Object.values(m.equip).some((it) => it && it.base === 'cave_catalogue_pen')), 'the Pen is worn');
  // nothing in the vault: no question
  const g2 = running(4); const asked2 = [];
  const e2 = { ...engine, game: g2, scenes: [{ ...field, game: g2 }], async pushAwait(n2, d) { asked2.push(d); return 0; } };
  e2.scene = e2.scenes[0];
  assert.equal(await W.vaultOffer(e2, g2), 0); assert.equal(asked2.length, 0);
});

test('issue 16: the Catalogue plays its own track and the Binder fights on the Forge\'s stage', async () => {
  assert.equal(BANDS.catalogue.music, W.CATALOGUE_MUSIC);
  assert.notEqual(W.CATALOGUE_MUSIC, 'archive');
  const { buildFloor } = W;
  assert.equal(buildFloor(7, 4, []).music, W.CATALOGUE_MUSIC);
  assert.equal(ENCOUNTERS.cave_binder.stage, 'cave_forge');
  const { backdropKey } = await import('../../src/scenes/battle.js').catch(() => ({}));
  if (backdropKey) assert.equal(backdropKey('cave_boss', true, 'cave_forge'), 'cave_forge');
});
