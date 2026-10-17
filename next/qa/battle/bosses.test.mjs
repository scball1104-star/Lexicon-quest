// Telegraphs, the Echo Warden's stances, the Archivore's phases, Lost Pages, Devour Name, Feast.
import test from 'node:test';
import assert from 'node:assert/strict';
import { battle, untilTurn, midRng, ofType } from './_helpers.mjs';
import { ENEMIES, LOST_PAGE_VARIANTS } from '../../src/data/enemies.js';

const boss = (opts = {}) => battle(['archivore'], { rng: midRng, level: 8, options: { boss: true }, ...opts });

test('telegraphs are announced a turn ahead, then fire', () => {
  const b = battle(['moss_scarab'], { rng: midRng });
  const s = b.unit('e0');
  s.hp = s.maxHp = 9999;
  const evs = [];
  let fired = null;
  for (let i = 0; i < 40 && !fired; i++) {
    const u = b.current();
    const e = u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    evs.push(...e);
    fired = e.find((x) => x.type === 'action_start' && x.actor === 'e0' && x.charged);
  }
  const tele = evs.find((e) => e.type === 'telegraph' && e.actor === 'e0');
  assert.ok(tele, 'telegraph seen');
  assert.equal(tele.skill, 'burrow_charge');
  assert.match(tele.text, /Moss Scarab digs in/);
  assert.ok(tele.target && tele.nextTurn >= 0);
  assert.equal(fired.action.skill, 'burrow_charge');
  assert.ok(evs.indexOf(tele) < evs.indexOf(fired));
});

test('Break or Lunge cancels an ordinary foe\'s telegraph', () => {
  let b = battle(['moss_scarab'], { rng: midRng });
  untilTurn(b, 'mira');
  let s = b.unit('e0');
  s.hp = s.maxHp = 9999;
  s.charging = { skill: 'burrow_charge', target: 'hero' };
  s.shields = 1;
  let evs = b.perform({ type: 'skill', skill: 'frost', target: 'e0' });
  assert.ok(evs.some((e) => e.type === 'telegraph_cancel' && e.reason === 'break'));
  assert.equal(s.charging, null);

  b = battle(['moss_scarab'], { rng: midRng });
  untilTurn(b, 'bram');
  s = b.unit('e0');
  s.hp = s.maxHp = 9999;
  s.charging = { skill: 'burrow_charge', target: 'hero' };
  evs = b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  assert.ok(evs.some((e) => e.type === 'telegraph_cancel' && e.reason === 'interrupt'));
});

test('Echo Warden: Mirror Stance reflects magic, Bulwark Stance repels weapons, Break drops both', () => {
  let b = battle(['echo_warden'], { rng: midRng, level: 6, options: { boss: true } });
  assert.ok(b.startEvents.some((e) => e.type === 'stance' && e.stance === 'mirror'));
  untilTurn(b, 'mira');
  const w = b.unit('e0');
  let hp = w.hp;
  let evs = b.perform({ type: 'skill', skill: 'ember', target: 'e0' });
  assert.ok(evs.some((e) => e.type === 'reflect' && e.kind === 'magic'));
  assert.equal(w.hp, hp, 'the Warden took nothing');
  assert.ok(evs.some((e) => e.type === 'damage' && e.reflected && e.target !== 'e0'));

  w.ai.stance = 'bulwark';
  untilTurn(b, 'hero');
  hp = w.hp;
  const heroHp = b.unit('hero').hp;
  evs = b.perform({ type: 'attack', target: 'e0' });
  assert.ok(evs.some((e) => e.type === 'reflect' && e.kind === 'phys' && e.target === 'hero'));
  assert.equal(w.hp, hp);
  assert.ok(b.unit('hero').hp < heroHp);

  w.broken = true;
  untilTurn(b, 'hero');
  if (w.broken) {
    evs = b.perform({ type: 'attack', target: 'e0' });
    assert.ok(!evs.some((e) => e.type === 'reflect'));
    assert.ok(w.hp < hp);
  }
});

test('Echo Warden swaps stance after every second turn and weaknesses follow the stance', () => {
  const b = battle(['echo_warden'], { rng: midRng, level: 6, options: { boss: true } });
  const w = b.unit('e0');
  w.hp = w.maxHp = 99999;
  const stances = [];
  for (let i = 0; i < 200 && stances.length < 3; i++) {
    const evs = b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    for (const e of ofType(evs, 'stance')) stances.push(e.stance);
  }
  assert.deepEqual(stances, ['bulwark', 'mirror', 'bulwark']);
  assert.deepEqual(w.weak, ENEMIES.echo_warden.stances.bulwark.weak);
});

test('Archivore: phase 2 at 70% tears the Book (two Lost Pages, distinct readable weaknesses)', () => {
  const b = boss();
  assert.ok(b.startEvents.some((e) => e.type === 'phase' && e.phase === 1));
  untilTurn(b, 'hero');
  const a = b.unit('e0');
  a.hp = Math.floor(a.maxHp * 0.7) + 1;
  const evs = b.perform({ type: 'attack', target: 'e0' });
  const ph = evs.find((e) => e.type === 'phase');
  assert.equal(ph.phase, 2);
  assert.equal(ph.name, 'The Torn Book');
  const pages = ofType(evs, 'summon');
  assert.equal(pages.length, 2);
  assert.notEqual(pages[0].variant, pages[1].variant);
  for (const p of pages) {
    const v = LOST_PAGE_VARIANTS.find((x) => x.id === p.variant);
    const u = b.unit(p.enemy);
    assert.deepEqual(u.weak, v.weak);
    assert.deepEqual(b.knowledge(p.enemy).weak, v.weak, 'page weakness readable from its ink');
  }
  assert.equal(a.maxShields, ENEMIES.archivore.phases[1].shields);
  // page armor: pages alive -> 20% less damage taken
  untilTurn(b, 'hero');
  const shielded = b.estimate('hero', { type: 'attack', target: 'e0' })[0].avg;
  for (const p of b.living('enemy').filter((u) => u.id === 'lost_page')) { p.alive = false; p.hp = 0; }
  const bare = b.estimate('hero', { type: 'attack', target: 'e0' })[0].avg;
  assert.ok(Math.abs(shielded / bare - 0.8) < 0.01);
});

test('Archivore HP locks at phase thresholds: no skipping a phase', () => {
  const b = boss();
  untilTurn(b, 'hero');
  const a = b.unit('e0');
  b.unit('hero').stats.atk = 5000;
  b.perform({ type: 'attack', target: 'e0' });
  assert.equal(a.hp, Math.floor(a.maxHp * 0.7));
  assert.equal(a.ai.phase, 1);
  assert.ok(a.alive);
});

test('Archivore phase 3: pages burn away, the Maw is hasted and weak to light', () => {
  const b = boss();
  untilTurn(b, 'hero');
  const a = b.unit('e0');
  a.hp = Math.floor(a.maxHp * 0.7) + 1;
  b.perform({ type: 'attack', target: 'e0' });
  untilTurn(b, 'hero');
  a.hp = Math.floor(a.maxHp * 0.3) + 1;
  const evs = b.perform({ type: 'attack', target: 'e0' });
  assert.equal(evs.find((e) => e.type === 'phase').phase, 3);
  assert.ok(!b.living('enemy').some((u) => u.id === 'lost_page'));
  assert.ok(a.statuses.haste);
  assert.ok(a.weak.includes('light'));
});

test('Devour Name: Defend holds the name; otherwise Silence, Nameless, and the Archivore grows', () => {
  const run = (partyAction) => {
    const b = boss();
    const a = b.unit('e0');
    untilTurn(b, 'hero');
    a.charging = { skill: 'devour_name', target: 'mira' };
    const now = b.state.now;
    b.unit('mira').next = now + 1; a.next = now + 2;
    b.unit('bram').next = now + 900;
    for (let i = 0; i < 30; i++) {
      const u = b.current();
      if (u.uid === 'e0') return { b, evs: b.runEnemyTurn() };
      b.perform(u.uid === 'mira' ? partyAction : { type: 'attack', target: 'e0' });
    }
    throw new Error('boss never acted');
  };
  let { b, evs } = run({ type: 'defend' });
  const held = evs.find((e) => e.type === 'devour');
  assert.equal(held.target, 'mira');
  assert.equal(held.success, false);
  assert.ok(!b.unit('mira').statuses.nameless);
  ({ b, evs } = run({ type: 'attack', target: 'e0' }));
  const d = evs.find((e) => e.type === 'devour');
  assert.equal(d.success, true);
  const mira = b.unit('mira');
  assert.ok(mira.statuses.silence && mira.statuses.nameless);
  assert.ok(b.unit('e0').mods.some((m) => m.stat === 'atk' && m.mult > 1), 'the Archivore feeds on the name');
});

test('Bram\'s Guard takes Devour Name for an ally and holds firm', () => {
  const b = boss();
  const a = b.unit('e0');
  untilTurn(b, 'bram');
  a.charging = { skill: 'devour_name', target: 'mira' };
  b.unit('bram').next = b.state.now; // make sure Bram's guard outlasts the boss's turn
  b.perform({ type: 'skill', skill: 'guard', target: 'mira' });
  a.next = b.state.now + 1;
  for (const id of ['hero', 'mira', 'bram']) b.unit(id).next = Math.max(b.unit(id).next, b.state.now + 500);
  untilTurn(b, 'e0');
  const evs = b.runEnemyTurn();
  assert.ok(evs.some((e) => e.type === 'cover' && e.actor === 'bram' && e.target === 'mira'));
  assert.equal(evs.find((e) => e.type === 'devour').target, 'bram');
  assert.equal(evs.find((e) => e.type === 'devour').success, false);
});

test('Feast devours living pages to heal; dead pages leave it hungry', () => {
  const b = boss();
  untilTurn(b, 'hero');
  const a = b.unit('e0');
  a.hp = Math.floor(a.maxHp * 0.7) + 1;
  b.perform({ type: 'attack', target: 'e0' });
  a.charging = { skill: 'feast', target: null };
  a.next = b.state.now; a.tie = -1;
  const hp = a.hp;
  untilTurn(b, 'e0');
  const evs = b.runEnemyTurn();
  const f = evs.find((e) => e.type === 'feast');
  assert.equal(f.pages.length, 2);
  assert.ok(a.hp > hp);
  assert.ok(!b.living('enemy').some((u) => u.id === 'lost_page'));
});
