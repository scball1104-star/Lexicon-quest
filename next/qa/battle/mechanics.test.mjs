// Damage bounds, weakness + Break, statuses, Fury, Defend/Protect, swap, items, flee.
import test from 'node:test';
import assert from 'node:assert/strict';
import { battle, untilTurn, midRng, ofType, party } from './_helpers.mjs';
import { POISON_PCT, REGEN_PCT } from '../../src/battle/status.js';
import { CRIT_MULT, FURY_MAX, createEncounterBattle, makeRng } from '../../src/battle/rules.js';
import { ENEMIES, ELITE_BASE } from '../../src/data/enemies.js';

test('attack damage stays inside the previewed range (crits inside 1.5x of it)', () => {
  let crits = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const b = battle(['ink_slime'], { seed });
    untilTurn(b, 'hero');
    if (b.isOver()) continue;
    const est = b.estimate('hero', { type: 'attack', target: 'e0' })[0];
    const evs = b.perform({ type: 'attack', target: 'e0' });
    const dmg = evs.find((e) => e.type === 'damage' && e.source === 'hero');
    if (!dmg) { assert.ok(ofType(evs, 'miss').length, 'no damage means a miss'); continue; }
    if (dmg.crit) {
      crits++;
      assert.ok(dmg.amount >= Math.floor(est.min * CRIT_MULT) - 1 && dmg.amount <= Math.ceil(est.max * CRIT_MULT) + 1, `crit ${dmg.amount} vs ${est.min}-${est.max}`);
    } else {
      assert.ok(dmg.amount >= est.min && dmg.amount <= est.max, `hit ${dmg.amount} outside ${est.min}-${est.max}`);
    }
    assert.ok(dmg.amount >= 1);
  }
  assert.ok(crits > 0 && crits < 40, `crit count ${crits} looks wrong`);
});

test('weakness hits remove a shield, 0 shields = Break: +50% damage, lost turn, shields refill', () => {
  const b = battle(['moss_scarab'], { rng: midRng });
  untilTurn(b, 'mira');
  const scarab = b.unit('e0');
  scarab.hp = scarab.maxHp = 5000;
  let evs = b.perform({ type: 'skill', skill: 'frost', target: 'e0' });
  const hit = evs.find((e) => e.type === 'damage' && e.source === 'mira');
  assert.equal(hit.weak, true);
  assert.equal(hit.shieldLost, 1);
  assert.equal(scarab.shields, 2);
  assert.ok(ofType(evs, 'reveal').some((r) => r.weak.includes('ice')), 'weakness revealed on hit');
  assert.deepEqual(b.knowledge('e0').weak, ['ice']);

  untilTurn(b, 'mira');
  scarab.shields = 1;
  const before = b.estimate('mira', { type: 'skill', skill: 'frost', target: 'e0' })[0];
  assert.equal(before.breaks, true, 'preview says this hit breaks');
  const nextBefore = scarab.next;
  evs = b.perform({ type: 'skill', skill: 'frost', target: 'e0' });
  assert.ok(ofType(evs, 'break').length === 1);
  assert.equal(scarab.broken, true);
  assert.ok(scarab.next > nextBefore, 'Break pushes the foe back on the timeline');
  const after = b.estimate('mira', { type: 'skill', skill: 'frost', target: 'e0' })[0];
  assert.ok(Math.abs(after.avg / before.avg - 1.5) < 0.01, `broken multiplier ${after.avg / before.avg}`);

  // its next turn is lost, then shields come back
  const seen = [];
  for (let i = 0; i < 20; i++) {
    const u = b.current();
    if (u.side === 'party') seen.push(...b.perform({ type: 'defend' }));
    else break;
  }
  const skip = seen.find((e) => e.type === 'skip' && e.actor === 'e0');
  assert.equal(skip.reason, 'break');
  const restore = seen.find((e) => e.type === 'shield_restore' && e.target === 'e0');
  assert.equal(restore.shields, 3);
  assert.equal(scarab.broken, false);
});

test('resistance halves damage', () => {
  const b = battle(['moss_scarab'], { rng: midRng });
  untilTurn(b, 'hero');
  const resisted = b.estimate('hero', { type: 'attack', target: 'e0' })[0];
  b.unit('e0').resist = [];
  const plain = b.estimate('hero', { type: 'attack', target: 'e0' })[0];
  assert.ok(Math.abs(resisted.avg / plain.avg - 0.5) < 0.01);
});

test('poison and regen tick at turn start, expire after their turns', () => {
  const b = battle(['ink_slime'], { rng: midRng });
  untilTurn(b, 'hero');
  const hero = b.unit('hero');
  b.unit('e0').hp = b.unit('e0').maxHp = 9999;
  hero.statuses.poison = { turns: 2 };
  hero.statuses.regen = { turns: 1 };
  b.perform({ type: 'defend' }); // hero's turn ends: poison 1 left, regen expires
  assert.ok(!hero.statuses.regen, 'regen expired');
  const hpBefore = hero.hp;
  const evs = untilTurn(b, 'hero');
  const turnEvs = b.perform({ type: 'defend' });
  const tick = [...evs, ...turnEvs].find((e) => e.type === 'status_tick' && e.target === 'hero' && e.status === 'poison');
  assert.ok(tick, 'poison ticked');
  assert.equal(tick.amount, -Math.round(hero.maxHp * POISON_PCT));
  assert.ok(hero.hp < hpBefore + 1);
  assert.ok(turnEvs.some((e) => e.type === 'status_remove' && e.status === 'poison' && e.reason === 'expired'));
  assert.ok(REGEN_PCT > 0);
});

test('stun skips a turn; fire thaws Chill; silence locks Tech and Magic', () => {
  const b = battle(['ink_slime'], { rng: midRng });
  untilTurn(b, 'mira');
  const slime = b.unit('e0');
  slime.hp = slime.maxHp = 9999;
  slime.statuses.chill = { turns: 3 };
  const evs = b.perform({ type: 'skill', skill: 'ember', target: 'e0' });
  assert.ok(evs.some((e) => e.type === 'status_remove' && e.status === 'chill' && e.reason === 'countered'));
  slime.statuses.stun = { turns: 1 };
  const seen = untilTurn(b, 'mira');
  assert.ok(seen.some((e) => e.type === 'skip' && e.actor === 'e0' && e.reason === 'stun'));
  b.unit('mira').statuses.silence = { turns: 2 };
  const cmds = b.commands('mira');
  assert.equal(cmds.find((c) => c.id === 'magic').enabled, false);
  assert.equal(cmds.find((c) => c.id === 'magic').reason, 'Silenced');
  assert.equal(cmds.find((c) => c.id === 'attack').enabled, true);
  assert.equal(b.perform({ type: 'skill', skill: 'ember', target: 'e0' })[0].type, 'invalid');
});

test('blind halves physical hit chance in the preview', () => {
  const b = battle(['ink_slime'], { rng: midRng });
  untilTurn(b, 'hero');
  const clear = b.estimate('hero', { type: 'attack', target: 'e0' })[0].hit;
  b.unit('hero').statuses.blind = { turns: 2 };
  const blind = b.estimate('hero', { type: 'attack', target: 'e0' })[0].hit;
  assert.ok(Math.abs(blind / clear - 0.5) < 1e-9);
});

test('Fury fills from damage taken and dealt, art unlocks at 100 and mastery 2, spends to 0', () => {
  const p = party(4);
  p[0].mastery.sword = 30; // mastery 2: Dawnsplitter known
  const b = battle(['ink_slime', 'ink_slime'], { party: p, rng: midRng });
  untilTurn(b, 'hero');
  const hero = b.unit('hero');
  assert.ok(hero.skills.includes('fury_dawnsplitter'));
  let fury = b.commands('hero').find((c) => c.id === 'fury');
  assert.equal(fury.enabled, false);
  hero.fury = 95;
  const evs = b.perform({ type: 'attack', target: 'e0' });
  const ready = evs.filter((e) => e.type === 'fury_ready' && e.target === 'hero');
  assert.equal(ready.length, 1, 'fury_ready fires once when crossing 100');
  assert.equal(hero.fury, FURY_MAX);
  untilTurn(b, 'hero');
  fury = b.commands('hero').find((c) => c.id === 'fury');
  assert.equal(fury.enabled, true);
  const art = b.perform({ type: 'skill', skill: 'fury_dawnsplitter', target: b.living('enemy')[0].uid });
  assert.ok(art.some((e) => e.type === 'damage' && e.source === 'hero'));
  assert.ok(hero.fury < 30, 'fury spent');
  // taking damage builds Fury
  const before = b.unit('bram').fury;
  const seen = untilTurn(b, 'hero');
  const hurt = seen.filter((e) => e.type === 'fury_gain' && e.reason === 'hurt');
  if (seen.some((e) => e.type === 'damage' && e.target === 'bram')) assert.ok(b.unit('bram').fury > before);
  assert.ok(hurt.every((e) => e.amount > 0));
});

test('Defend halves and Protect cuts a third of incoming damage', () => {
  const firstHit = (action, status) => {
    const b = battle(['ink_slime'], { rng: midRng });
    const s = b.unit('e0'); s.hp = s.maxHp = 9999;
    if (status) for (const id of ['hero', 'mira', 'bram']) b.unit(id).statuses[status] = { turns: 9 };
    for (let i = 0; i < 40; i++) {
      const u = b.current();
      const evs = u.side === 'party' ? b.perform(action) : b.runEnemyTurn();
      const d = evs.find((e) => e.type === 'damage' && e.source === 'e0');
      if (d) return d;
    }
    throw new Error('no hit');
  };
  const plain = firstHit({ type: 'attack', target: 'e0' });
  const defended = firstHit({ type: 'defend' });
  assert.equal(plain.target, defended.target);
  assert.ok(Math.abs(defended.amount - plain.amount * 0.5) <= 1, `${defended.amount} vs ${plain.amount}`);
  const prot = firstHit({ type: 'attack', target: 'e0' }, 'protect');
  assert.ok(Math.abs(prot.amount - plain.amount * 2 / 3) <= 1, `${prot.amount} vs ${plain.amount}`);
});

test('Swap changes the active weapon and its stats; items heal and revive', () => {
  const b = battle(['ink_slime'], { rng: midRng, options: { inventory: { potion: 1, phoenix_feather: 1 } } });
  untilTurn(b, 'bram');
  const bram = b.unit('bram');
  const atk = bram.stats.atk;
  const evs = b.perform({ type: 'swap' });
  assert.ok(evs.some((e) => e.type === 'swap' && e.weapon === 'axe'));
  assert.equal(bram.weapon, 'axe');
  assert.equal(bram.stats.atk, atk + 1, 'hatchet (+8) vs ash spear (+7)');
  untilTurn(b, 'hero');
  const mira = b.unit('mira');
  mira.hp = 0; mira.alive = false;
  b.unit('hero').hp = 10;
  const t = b.targets('hero', { type: 'item', item: 'phoenix_feather' });
  assert.deepEqual(t.ids, ['mira']);
  const rev = b.perform({ type: 'item', item: 'phoenix_feather', target: 'mira' });
  assert.ok(rev.some((e) => e.type === 'revive' && e.target === 'mira'));
  assert.ok(mira.alive && mira.hp > 0);
  assert.equal(b.state.inventory.phoenix_feather, 0);
  untilTurn(b, 'bram');
  const heal = b.perform({ type: 'item', item: 'potion', target: 'hero' });
  assert.equal(heal.find((e) => e.type === 'heal').amount, 60);
});

test('flee is blocked in boss fights and works in ordinary ones', () => {
  const boss = battle(['echo_warden'], { level: 6, options: { boss: true } });
  untilTurn(boss, 'hero');
  assert.equal(boss.commands('hero').find((c) => c.id === 'flee').enabled, false);
  let escaped = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const b = battle(['briar_wolf'], { seed });
    for (let i = 0; i < 30 && !b.isOver(); i++) {
      if (b.current().side === 'party') b.perform({ type: 'flee' }); else b.runEnemyTurn();
    }
    if (b.result() && b.result().outcome === 'escape') escaped++;
  }
  assert.ok(escaped >= 18, `escaped ${escaped}/20`);
});

test('invalid actions are rejected without changing state', () => {
  const b = battle(['ink_slime'], { rng: midRng });
  untilTurn(b, 'hero');
  const snap = JSON.stringify(b.state);
  for (const a of [{ type: 'skill', skill: 'ember', target: 'e0' }, { type: 'attack', target: 'hero' }, { type: 'nope' },
    { type: 'item', item: 'hi_potion', target: 'hero' }, { type: 'combo', skill: 'dawnname' }]) {
    const evs = b.perform(a);
    assert.equal(evs.length, 1);
    assert.equal(evs[0].type, 'invalid');
  }
  assert.equal(JSON.stringify(b.state), snap);
  assert.equal(b.runEnemyTurn()[0].type, 'invalid');
});

test('elites: gold-name modifiers change the fight (Swift, Stoneskin, Vampiric, Cursed, Splitting)', () => {
  const mk = (mods) => battle([{ id: 'briar_wolf', elite: mods }], { rng: midRng });
  const base = ENEMIES.briar_wolf;
  let b = mk(['swift', 'stoneskin']);
  const w = b.unit('e0');
  assert.equal(w.name, 'Swift Stoneskin Briar Wolf');
  assert.equal(w.maxHp, Math.round(base.hp * ELITE_BASE.hp));
  assert.equal(w.stats.spd, Math.round(base.spd * 1.4));
  assert.equal(w.maxShields, base.shields + 2);
  assert.equal(w.rewards.exp, base.exp * 2);
  assert.ok(b.startEvents.some((e) => e.type === 'message' && e.kind === 'elite'));

  b = mk(['splitting']);
  untilTurn(b, 'hero');
  b.unit('e0').hp = 1;
  const evs = b.perform({ type: 'attack', target: 'e0' });
  const split = evs.find((e) => e.type === 'split');
  assert.equal(split.into.length, 2);
  assert.equal(b.living('enemy').length, 2);
  assert.ok(b.living('enemy').every((u) => !u.elite && u.maxHp === Math.round(base.hp * 0.35)));

  b = mk(['vampiric']);
  const v = b.unit('e0');
  v.hp = 10;
  for (let i = 0; i < 30 && v.hp === 10; i++) b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
  assert.ok(v.hp > 10, 'vampiric elite healed by hitting');

  b = mk(['cursed']);
  b.unit('e0').curse = 1;
  let cursed = false;
  for (let i = 0; i < 30 && !cursed; i++) {
    const e = b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    cursed = e.some((x) => x.type === 'status_add' && x.source === 'e0' && ['poison', 'blind', 'chill'].includes(x.status));
  }
  assert.ok(cursed);
});

test('createEncounterBattle wires zone, boss and flee rules from the encounter', () => {
  const { battle: b, encounter } = createEncounterBattle('archivore', { party: party(8), rng: makeRng(3) });
  assert.equal(encounter.music, 'boss_archivore');
  assert.equal(b.state.options.boss, true);
  assert.equal(b.state.options.canFlee, false);
  const r = createEncounterBattle('valley_wolves', { party: party(3), rng: makeRng(3), forceElite: ['swift'] });
  assert.equal(r.encounter.enemies.filter((e) => e.elite).length, 1);
  assert.equal(r.battle.state.options.zone, 'valley');
  assert.equal(r.battle.state.options.canFlee, true);
});
