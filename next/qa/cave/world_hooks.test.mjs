// C2-world: the hooks engine.cave carries into the base game (src/data/cave/world.js HOOKS): the stair into cave_bN (prepare,
// descend, the loot zone, the arrival), Rootbound Step (cave_move_plus), the floor tag and Downward Sense (stairs_sense),
// the Rebound rise (second_life) and First Line (first_blow_true) through the real battle rules, afterBattle's kill count,
// and the chest seam on a fake field.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.LQ_CAVE_ON = true;
const { ensurePack } = await import('../../src/game/packs.js');
await ensurePack('cave', { quiet: true, warm: false });
const W = await import('../../src/data/cave/world.js');
const { newGameEp2, addGear, findGear } = await import('../../src/game/state.js');
const { equipGear } = await import('../../src/game/inventory.js');
const CAVE = await import('../../src/game/cave.js');
const { arrivalOf } = await import('../../src/data/cave/gen.js');
const { peekMap } = await import('../../src/world/maps.js');
const { ZONE_LOOT } = await import('../../src/data/loot-tables.js');
const { itemLevel } = await import('../../src/data/cave/foes.js');
const { createEncounterBattle, PARTY_HIT } = await import('../../src/battle/rules.js');
const { ENCOUNTERS } = await import('../../src/data/encounters.js');
const { EQUIPMENT } = await import('../../src/data/items.js');

function running(seed = 7) {
  const g = newGameEp2('Arden');
  assert.ok(CAVE.enter(g, { seed, playtime: 100 }));
  return g;
}
function wear(g, memberId, key, uniqueId) {
  const m = g.party.find((x) => x.id === memberId);
  const uid = addGear(g, uniqueId);
  const r = equipGear(g, m, key, uid);
  assert.ok(r.ok, `${memberId} wears ${uniqueId}: ${r.reason || ''}`);
  return m;
}
const fakeField = (g, extra = {}) => ({ game: g, cutscene: { running: false }, scenes: [], runScene(id) { this.scenes.push(id); }, showBoxes() {}, engine: { after(n, fn) { fn(); } }, ...extra });

test('beforeDoor: a stair into cave_bN inside a run prepares N and N + 1, descends, points the loot zone at the floor and lands on the arrival', () => {
  const g = running(7);
  const f = fakeField(g);
  W.prepareFloor(g, 1);
  const to = W.HOOKS.beforeDoor(f, ['cave_b2', 99, 99, 'down']);
  assert.deepEqual(to, ['cave_b2', ...arrivalOf(7, 2), 'down']);
  assert.equal(CAVE.floorOf(g), 2);
  assert.ok(peekMap('cave_b2') && peekMap('cave_b3'), 'B2 and B3 are registered');
  assert.equal(ZONE_LOOT.cave_band_1.ilvl, itemLevel(2));
  const to10 = (() => { for (let i = 2; i < 9; i++) W.HOOKS.beforeDoor(f, [`cave_b${i + 1}`, 0, 0, 'down']); return W.HOOKS.beforeDoor(f, ['cave_b10', 0, 0, 'down']); })();
  assert.deepEqual(to10.slice(0, 1), ['cave_b10']);
  assert.equal(peekMap('cave_b10').landing, true, 'B10 is a landing');
  assert.ok(peekMap('cave_b10').events.some((e) => e.type === 'sign' && e.id === 'plaque' && e.text === 'plaque_b10'), 'the landing carries its plaque line');
  assert.ok(!peekMap('cave_b10').events.some((e) => e.type === 'enemy'), 'no foes on a landing');
  assert.equal(W.HOOKS.beforeDoor(f, ['willowmere', 1, 1, 'down'])[0], 'willowmere', 'an ordinary door passes through');
});

test('beforeDoor outside a run: the stair is refused; with deep_stacks_open it offers the reading (stacks_enter), else the waiting line', () => {
  const g = newGameEp2('Arden');
  const f = fakeField(g);
  let boxes = 0;
  f.showBoxes = () => { boxes++; };
  assert.equal(W.HOOKS.beforeDoor(f, ['cave_b1', 0, 0, 'down']), false);
  assert.equal(boxes, 1); assert.deepEqual(f.scenes, []);
  g.flags.deep_stacks_open = true;
  assert.equal(W.HOOKS.beforeDoor(f, ['cave_b1', 0, 0, 'down']), false);
  assert.deepEqual(f.scenes, ['stacks_enter']);
});

test('moveFrames (Rootbound Step): 15% faster only inside a run with the boots worn; the floor tag only inside a run', () => {
  const g = newGameEp2('Arden');
  assert.equal(W.HOOKS.moveFrames(g, 12), 12);
  assert.equal(W.HOOKS.floorTag(g), null);
  CAVE.enter(g, { seed: 1 });
  assert.equal(W.HOOKS.moveFrames(g, 12), 12, 'no boots: no change');
  assert.equal(W.HOOKS.floorTag(g), 'B1');
  wear(g, 'mira', 'boots', 'cave_root_boots');
  assert.equal(W.HOOKS.moveFrames(g, 12), 10);
  assert.equal(W.HOOKS.moveFrames(g, 8), 7);
  for (let i = 0; i < 22; i++) CAVE.descend(g);
  assert.equal(W.HOOKS.floorTag(g), 'B23');
});

test('stairsDir (Downward Sense): the way to the stairs mark, only with Cinder Stride in the party', () => {
  const g = running(1);
  const map = { mark: (n) => (n === 'stairs' ? [20, 5] : null) };
  const f = { game: g, map, leader: { tx: 4, ty: 5 } };
  assert.equal(W.stairsDir(f), 'right');
  assert.equal(W.HOOKS.stairsDir(f), null, 'nobody wears the boots');
  wear(g, 'bram', 'boots', 'cave_cinder_stride');
  assert.equal(W.HOOKS.stairsDir(f), 'right');
  f.leader = { tx: 20, ty: 12 }; assert.equal(W.HOOKS.stairsDir(f), 'up');
  f.leader = { tx: 21, ty: 1 }; assert.equal(W.HOOKS.stairsDir(f), 'down');
  f.leader = { tx: 30, ty: 6 }; assert.equal(W.HOOKS.stairsDir(f), 'left');
  f.leader = { tx: 20, ty: 5 }; assert.equal(W.HOOKS.stairsDir(f), null, 'standing on it');
});

test('second_life through the rules: the wearer rises once at 30% HP instead of falling (revive, no ko), the next fall is a ko', () => {
  const g = running(3);
  wear(g, 'bram', 'body', 'cave_forge_binding');
  wear(g, 'hero', 'body', 'cave_forge_binding');
  for (const m of g.party) m.hp = 1;
  // a B1 group of the run; a constant rng so every enemy swing lands
  W.prepareFloor(g, 1);
  const encId = Object.keys(ENCOUNTERS).find((k) => k.startsWith('cave_b1_e'));
  const { battle } = createEncounterBattle(encId, { party: g.party, rng: () => 0.5, inventory: {}, flags: g.flags });
  assert.equal(W.HOOKS.armBattle(battle, g), true);
  const evs = [...battle.startEvents.length ? battle.startEvents : battle.begin()];
  const hp0 = Object.fromEntries(battle.units().filter((u) => u.side === 'party').map((u) => [u.uid, u.maxHp]));
  for (let i = 0; i < 400 && !battle.isOver(); i++) {
    const u = battle.current();
    if (!u) break;
    const got = u.side === 'party' ? battle.perform({ type: 'defend' }) : battle.runEnemyTurn();
    evs.push(...got);
    // keep the fallen-and-risen at 1 HP so the next hit decides again
    for (const p of battle.units()) if (p.side === 'party' && p.alive && p.hp > 1) p.hp = 1;
    if (evs.some((e) => e.type === 'ko' && (e.target === 'hero' || e.target === 'bram'))) break;
  }
  const rises = evs.filter((e) => e.type === 'revive' && e.rise);
  assert.ok(rises.length >= 1, 'a wearer rose');
  for (const r of rises) {
    assert.ok(r.target === 'hero' || r.target === 'bram');
    assert.equal(r.hp, Math.ceil(hp0[r.target] * CAVE.RISE_HP), `${r.target} rose at 30% of ${hp0[r.target]}`);
    assert.ok(g.cave.run.rises.includes(r.target), 'the rise is spent in the run');
  }
  const msgs = evs.filter((e) => e.type === 'message' && e.kind === 'rise');
  assert.equal(msgs.length, rises.length);
  const firstKo = evs.findIndex((e) => e.type === 'ko' && (e.target === 'hero' || e.target === 'bram'));
  const firstRise = evs.findIndex((e) => e.type === 'revive' && e.rise);
  assert.ok(firstRise >= 0 && (firstKo < 0 || firstRise < firstKo), 'the rise came before any ko of a wearer');
  // a member without the Binding never rises
  assert.ok(!rises.some((r) => r.target === 'mira'));
  assert.equal(CAVE.riseAvailable(g, 'mira'), false);
  // outside a run the hook does nothing
  const g2 = newGameEp2('Arden');
  assert.equal(W.HOOKS.onFall(g2, { id: 'hero', maxHp: 100 }), 0);
});

test('first_blow_true through the rules: the wearer\'s first blow lands on an rng that would miss, the second misses', () => {
  const g = running(4);
  wear(g, 'hero', 'sword', 'cave_catalogue_pen');
  W.prepareFloor(g, 1);
  const encId = Object.keys(ENCOUNTERS).find((k) => k.startsWith('cave_b1_e'));
  assert.ok(PARTY_HIT < 1, 'a party blow can miss');
  const { battle } = createEncounterBattle(encId, { party: g.party, rng: () => 0.999, inventory: {}, flags: g.flags });
  W.HOOKS.armBattle(battle, g);
  const hero = battle.units().find((u) => u.uid === 'hero');
  assert.equal(hero.firstBlow, true);
  assert.equal(battle.units().find((u) => u.uid === 'mira').firstBlow, undefined);
  if (!battle.startEvents.length) battle.begin();
  const attacks = [];
  for (let i = 0; i < 200 && attacks.length < 2 && !battle.isOver(); i++) {
    const u = battle.current();
    if (!u) break;
    if (u.uid === 'hero') {
      const target = battle.units().find((x) => x.side === 'enemy' && x.alive);
      const evs = battle.perform({ type: 'attack', target: target.uid });
      attacks.push(evs);
    } else if (u.side === 'party') battle.perform({ type: 'defend' });
    else battle.runEnemyTurn();
  }
  assert.equal(attacks.length, 2);
  assert.ok(attacks[0].some((e) => e.type === 'damage' && e.source === 'hero') && !attacks[0].some((e) => e.type === 'miss' && e.source === 'hero'), 'the first blow lands');
  assert.ok(attacks[1].some((e) => e.type === 'miss' && e.source === 'hero'), 'the second blow misses on the same rng');
  assert.equal(hero.firstBlow, false);
});

test('afterBattle: a win inside a run counts the group\'s foes; a flee counts nothing; outside a run it is not ours; the base-file hooks tolerate a missing game', async () => {
  const g = running(5);
  W.prepareFloor(g, 1);
  const encId = Object.keys(ENCOUNTERS).find((k) => k.startsWith('cave_b1_e'));
  const f = fakeField(g);
  assert.equal(await W.HOOKS.afterBattle(f, encId, 'flee'), false);
  assert.equal(g.cave.run.kills, 0);
  assert.equal(await W.HOOKS.afterBattle(f, encId, 'win'), false, 'a win is handled and the field goes on');
  assert.equal(g.cave.run.kills, ENCOUNTERS[encId].enemies.length);
  const g2 = newGameEp2('Arden');
  assert.equal(await W.HOOKS.afterBattle(fakeField(g2), encId, 'win'), false);
  assert.equal(g2.cave, undefined, 'a game that never opened the Stacks gets no cave block from the hooks');
  // the hooks the precached files call are safe with no game at all (qa/ui/h2_ledger's stand-in field)
  assert.equal(W.HOOKS.inRun(undefined), false); assert.equal(W.HOOKS.inRun(null), false); assert.equal(W.HOOKS.inRun({}), false);
  assert.equal(W.HOOKS.floorTag(undefined), null);
  assert.equal(W.HOOKS.moveFrames(undefined, 12), 12);
  assert.equal(W.HOOKS.drawTag({ game: undefined, map: {} }, null), false);
  assert.equal(W.HOOKS.openChest({}, { ev: { tier: 'wood' } }), false);
  assert.equal(W.HOOKS.openChest({}, { ev: { tier: 'blue', item: 'cave_binders_quill' } }), false, 'a placed blue chest (B100) is the base game\'s');
  assert.equal(W.HOOKS.menuSave({}, g2), null);
  assert.equal(await W.HOOKS.refuseSave({}, g2), false);
  assert.equal(await W.HOOKS.quit({}, g2), false);
  assert.equal(W.HOOKS.useKeyItem({ engine: {}, g: g2 }, 'lantern_of_recall'), false);
  assert.equal(W.HOOKS.gameOver({ engine: { game: g2 } }), false);
  assert.equal(W.HOOKS.autosave({ game: g2 }), false);
});

test('openCaveChest on a fake field: a red chest lends (items or consumables, maybe the Bookmark, never gold); B1\'s first lends an empty-handed reader a weapon; a blue chest gives one unique into the bag and the run', async () => {
  const g = running(6);
  const [b1] = W.prepareFloor(g, 1);
  const log = [];
  const field = {
    game: g, map: { id: 'cave_b1', mod: b1 }, camera: null, engine: { audio: { sfx(id) { log.push(['sfx', id]); } }, toasts: { async gold(n) { log.push(['gold', n]); }, async received(it) { log.push(['received', it.base || it]); } } },
    async giveItem(id, qty) { log.push(['item', id, qty]); g.items[id] = (g.items[id] || 0) + qty; },
    async giveGear(inst) { log.push(['gear', inst.rarity]); return addGear(g, inst); },
    async maybeEquipPrompt(uid) { log.push(['equip', !!findGear(g, uid)]); return false; },
    async bark(k) { log.push(['bark', k]); },
  };
  const red = b1.events.find((e) => e.type === 'chest' && e.tier === 'red');
  const r = await W.openCaveChest(field, { id: red.id, ev: red, x: red.x, y: red.y });
  assert.equal(r.tier, 'red');
  assert.ok(r.roll.gold === 0 && g.gold === 0, 'no gold in the Stacks (C4-fixes, CRITIQUE_STACKS 15)');
  // the floor's first red chest on B1 to B3 lends the first bare-handed reader (the hero) a weapon of his kind (CRITIQUE_STACKS 13)
  assert.equal(r.roll.items.length, 1);
  assert.equal(EQUIPMENT[r.roll.items[0].base].type, 'sword');
  assert.deepEqual(g.cave.run.lentOn, [1]);
  assert.equal(g.cave.run.chests, 1);
  // deterministic: the same chest opened on a fresh identical run rolls the same
  const g2 = running(6); W.prepareFloor(g2, 1);
  const field2 = { ...field, game: g2 };
  field2.giveItem = async (id, qty) => { g2.items[id] = (g2.items[id] || 0) + qty; };
  field2.giveGear = async (inst) => addGear(g2, inst);
  const r2 = await W.openCaveChest(field2, { id: red.id, ev: red, x: red.x, y: red.y });
  assert.deepEqual(r2.roll, r.roll);
  // a blue chest
  const blueFloor = [...W.blueFloors(6, [])][0];
  for (let i = 1; i < blueFloor; i++) CAVE.descend(g);
  const [bf] = W.prepareFloor(g, blueFloor);
  const blue = bf.events.find((e) => e.type === 'chest' && e.tier === 'blue');
  assert.ok(blue, `B${blueFloor} carries the blue chest`);
  field.map = { id: bf.id, mod: bf };
  const rb = await W.openCaveChest(field, { id: blue.id, ev: blue, x: blue.x, y: blue.y });
  assert.equal(rb.tier, 'blue');
  assert.ok(rb.unique && rb.unique.startsWith('cave_'), 'a cave unique');
  assert.deepEqual(CAVE.bluesOf(g), [rb.unique]);
  assert.ok(findGear(g, rb.uid) && findGear(g, rb.uid).base === rb.unique, 'in the bag as an instance');
  assert.ok(log.some((l) => l[0] === 'received' && l[1] === rb.unique), 'the legendary toast');
  assert.ok(log.some((l) => l[0] === 'bark' && l[1] === 'first_legendary_drop'));
});
