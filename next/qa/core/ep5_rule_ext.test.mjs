// E5-pack (EPISODE5_PLAN 13.2 seam 4): the RULE_EXT seam in src/battle/rules.js. Empty, or holding hooks that only read, it
// leaves every Episode 1 to 4 battle bit-identical (same events, same result, same rng draws); `start` runs once when the battle
// begins, `afterAction` once per ended turn with the unit (or a combo's units); a foe with `exposed` takes every type of a hit
// as a weakness for that hit (its shield cracks, the damage takes WEAK_MULT) and the bestiary never learns it. The Turning Sky
// itself is src/data/ep5/sky.js (E5-battle) on this seam. Pure node tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULE_EXT, WEAK_MULT } from '../../src/battle/rules.js';
import { ZONES } from '../../src/data/encounters.js';
import { runBattle, EPISODES, SUITE_LEVELS, BOSS_LEVELS } from '../../tools/sim/simulate.mjs';
import { registerData as registerEp4 } from '../../tools/sim/ep4.mjs';
import { battle, untilTurn, playOut, midRng } from '../battle/_helpers.mjs';

registerEp4();   // the Episode 4 battle data (the simulator's CLI does this through attach; tests call it themselves)

/** A spread of battles from every episode: the first two plan fights of every zone, and every main boss, two seeds each. */
function cases() {
  const out = [];
  for (const ep of ['1', '2', '3', '4']) {
    for (const zone of EPISODES[ep]) {
      const z = ZONES[zone];
      if (!z || !Array.isArray(z.plan)) continue;
      const level = (SUITE_LEVELS[zone] || z.level || [5])[0];
      for (const [enc] of z.plan.slice(0, 2)) out.push({ zone, level, encounter: enc });
    }
  }
  for (const [boss, lv] of Object.entries(BOSS_LEVELS)) {
    const zone = Object.keys(SUITE_LEVELS).find((z) => ZONES[z] && (ZONES[z].plan || []).some(([e]) => e === boss));
    if (zone) out.push({ zone, level: lv[0], encounter: boss });
  }
  return out;
}
const play = (c, seed) => { const r = runBattle({ ...c, seed, trace: true }); return JSON.stringify(r); };

test('RULE_EXT is exported and empty in the core', () => {
  assert.ok(Array.isArray(RULE_EXT));
  assert.equal(RULE_EXT.length, 0);
});

test('empty, or with read-only hooks, every Episode 1 to 4 battle is bit-identical', () => {
  const list = cases();
  assert.ok(list.length >= 40, `a broad spread (${list.length} cases)`);
  const eps = new Set(list.map((c) => c.zone));
  for (const z of ['valley', 'archive_boss', 'court_throne', 'foundry_heart', 'ep4_keep_crown']) assert.ok(eps.has(z), `covers ${z}`);
  let starts = 0, after = 0;
  const reader = { start(ctx) { starts++; ctx.living('enemy').length; }, afterAction(ctx, units) { after++; [].concat(units).map((u) => u.uid); } };
  for (const c of list) {
    for (const seed of [1, 2]) {
      const base = play(c, seed);
      RULE_EXT.push(reader);
      let hooked;
      try { hooked = play(c, seed); } finally { RULE_EXT.length = 0; }
      assert.equal(hooked, base, `${c.encounter} (${c.zone}, Lv ${c.level}, seed ${seed}) changed with a read-only hook`);
    }
  }
  assert.equal(starts, list.length * 2, 'start ran once per battle');
  // the control: a hook that draws from the battle rng does change a battle, so the comparison above can fail
  const c = list.find((x) => x.encounter === 'archivore');
  const base = play(c, 1);
  RULE_EXT.push({ afterAction(ctx) { ctx.R(); } });
  try { assert.notEqual(play(c, 1), base, 'an rng-drawing hook is visible'); } finally { RULE_EXT.length = 0; }
  assert.ok(after > starts * 3, 'afterAction ran on every ended turn');
});

test('start runs once at begin(); afterAction once per ended turn, with the unit or a combo\'s units', () => {
  const calls = { start: 0, units: 0, actions: 0 };
  RULE_EXT.push({
    start(ctx) { calls.start++; assert.ok(ctx.state && ctx.living('enemy').length > 0, 'the ctx is live at start'); },
    afterAction(ctx, units) { calls.actions++; calls.units += [].concat(units).length; },
  });
  try {
    const b = battle(['briar_wolf', 'ink_slime'], { seed: 3, level: 5 });
    b.begin(); b.begin();
    assert.equal(calls.start, 1, 'begin() twice still starts once');
    playOut(b);
    assert.equal(calls.units, b.state.turn, 'every ended turn reached afterAction (state.turn counts units)');
    assert.ok(calls.actions <= calls.units && calls.actions > 0);
  } finally { RULE_EXT.length = 0; }
});

test('exposed: every type of the hit is a weakness for that hit (shield, damage), and the bestiary does not learn it', () => {
  // briar_wolf: find a party weapon type it is NOT weak to, then strike it once plain and once exposed
  const probe = battle(['briar_wolf'], { seed: 5, level: 6, rng: midRng });
  probe.begin();
  const foe = probe.units().find((u) => u.side === 'enemy');
  const types = ['sword', 'spear', 'staff', 'bow', 'axe'];
  const plainType = types.find((t) => !foe.weak.includes(t) && !foe.resist.includes(t) && !foe.immune.includes(t) && !foe.absorb.includes(t));
  assert.ok(plainType, 'a neutral type exists');
  const attacker = { sword: 'hero', axe: 'hero', staff: 'mira', bow: 'mira', spear: 'bram' }[plainType];
  const hit = (exposed) => {
    if (exposed) RULE_EXT.push({ start(ctx) { for (const u of ctx.living('enemy')) u.exposed = true; } });
    try {
      const b = battle(['briar_wolf'], { seed: 5, level: 6, rng: midRng, options: { bestiary: {} } });
      b.begin();
      const me = b.unit(attacker);
      me.weapon = plainType;
      untilTurn(b, attacker);
      const f = b.units().find((u) => u.side === 'enemy');
      const shields = f.shields;
      const evs = b.perform({ type: 'attack', target: f.uid });
      const dmg = evs.find((e) => e.type === 'damage' && e.target === f.uid);
      const told = evs.filter((e) => e.type === 'reveal').flatMap((e) => e.weak || []);
      return { dmg, shieldsBefore: shields, shieldsAfter: f.shields, revealed: (b.state.revealed[f.weakKey] || []).slice(), told, weak: f.weak.slice() };
    } finally { RULE_EXT.length = 0; }
  };
  const plain = hit(false), open = hit(true);
  assert.ok(plain.dmg && open.dmg, 'both hits landed');
  assert.equal(plain.dmg.weak, false, `a plain ${plainType} hit is not a weakness`);
  assert.equal(plain.shieldsAfter, plain.shieldsBefore, 'no shield lost on a plain hit');
  assert.equal(open.dmg.weak, true, 'the exposed hit counts as a weakness');
  assert.equal(open.shieldsAfter, open.shieldsBefore - 1, 'the exposed hit cracks one shield');
  assert.ok(Math.abs(open.dmg.amount / plain.dmg.amount - WEAK_MULT) < 0.05, `damage x${WEAK_MULT} (${plain.dmg.amount} -> ${open.dmg.amount})`);
  assert.deepEqual(open.revealed, plain.revealed, 'the bestiary learns exactly what a plain hit teaches');
  assert.ok(!open.told.includes(plainType), 'no reveal event names the exposed type as a weakness');
  assert.deepEqual(open.weak, plain.weak, "the foe's real weaknesses are unchanged");
});
