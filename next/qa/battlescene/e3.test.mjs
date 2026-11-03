// E3-scene-ui: Episode 3's battle events reach the screen. Heat, the quench, the flare announce, the Warden's three
// looks (its phase events carry no sprite: the animator maps them), the coils' entrance, the Oath's bell, the backdrops,
// the boss cards and the Heat pips' room in the weakness row. Real fights run through the rules and every batch is planned.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planEvents, unitInfo, totalFrames } from '../../src/battle/scene/animator.js';
import { createEncounterBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { newGameEp3 } from '../../src/game/state.js';
import { enemyRowWidth } from '../../src/battle/scene/hud.js';
import { backdropKey } from '../../src/scenes/battle.js';
import fs from 'node:fs';

const units = unitInfo([
  { uid: 'bram', id: 'bram', side: 'party', name: 'Bram', weapon: 'spear', maxHp: 300 },
  { uid: 'e0', id: 'cinder_warden', side: 'enemy', name: 'The Cinder Warden', boss: true, maxHp: 2300 },
]);
const ops = (evs) => planEvents(evs, { units });

test('heat, quench and the Oath bell produce their ops', () => {
  const h = ops([{ type: 'heat', target: 'e0', heat: 2, max: 3, delta: 1, reason: 'coil' }]);
  assert.ok(h.some((o) => o.op === 'heat' && o.heat === 2 && o.max === 3), 'heat op');
  assert.ok(h.some((o) => o.op === 'fx' && o.kind === 'embers'), 'a stoke from outside its own turn shows embers');
  const q = ops([{ type: 'quench', target: 'e0', reason: 'ice', heat: 3, cancelled: 'strike_the_name', sfx: 'quench_hiss' }]);
  assert.ok(q.some((o) => o.op === 'fx' && o.kind === 'steam' && o.big), 'steam, big when a flare was cancelled');
  assert.ok(q.some((o) => o.op === 'sfx' && o.id === 'quench_hiss'));
  const b = ops([{ type: 'oath_ring', actor: 'bram', target: 'e0', sfx: 'oath_ring' }]);
  assert.ok(b.some((o) => o.op === 'fx' && o.kind === 'oath_ring' && o.uid === 'bram'), 'the bell rings on Bram');
  const t = ops([{ type: 'telegraph', actor: 'e0', skill: 'strike_the_name', name: 'Strike the Name', text: 'x', target: 'bram', nextTurn: 1, flare: true, heat: 3 }]);
  assert.ok(t.some((o) => o.op === 'telegraph' && o.flare === true), 'the telegraph op carries flare');
  assert.ok(t.some((o) => o.op === 'fx' && o.kind === 'flare'), 'the white flare announce');
});

test('the Warden swaps looks on its phase ids, with a crack; the coils rise', () => {
  const p2 = ops([{ type: 'phase', actor: 'e0', phase: 2, id: 'molten_shell', name: 'Molten Shell', text: 'x', sprite: null }]);
  assert.ok(p2.some((o) => o.op === 'swapSprite' && o.sprite === 'cinder_warden_molten'));
  assert.ok(p2.some((o) => o.op === 'fx' && o.kind === 'crack'));
  const p3 = ops([{ type: 'phase', actor: 'e0', phase: 3, id: 'quenched_core', name: 'Quenched Core', text: 'x', sprite: null }]);
  assert.ok(p3.some((o) => o.op === 'swapSprite' && o.sprite === 'cinder_warden_quenched'));
  const p1 = ops([{ type: 'phase', actor: 'e0', phase: 1, id: 'tempered_iron', name: 'Tempered Iron', text: 'x', sprite: null }]);
  assert.ok(!p1.some((o) => o.op === 'swapSprite'), 'phase 1 keeps the base look');
  const s = ops([{ type: 'summon', enemy: 'e1', id: 'bellows_coil', name: 'Bellows Coil', by: 'e0' }]);
  assert.ok(s.some((o) => o.op === 'fx' && o.kind === 'coil_rise'));
  const w = ops([{ type: 'message', kind: 'ward', text: 'x', target: 'e0' }, { type: 'message', kind: 'ward_break', text: 'y', target: 'e0' }]);
  assert.deepEqual(w.filter((o) => o.op === 'ward').map((o) => o.on), [true, false], 'the Molten Shell halo turns on and off');
});

function play(enc, level, seed) {
  const g = newGameEp3('Arden');
  for (const m of g.party) m.level = level;
  g.flags.bram_memory_3 = true;
  const { battle: b } = createEncounterBattle(enc, { party: g.party, rng: makeRng(seed), inventory: { ...g.items }, flags: g.flags });
  const info = { units: unitInfo(b.units()) };
  const all = [...planEvents(b.startEvents, info)];
  const types = new Set();
  let n = 0;
  while (!b.isOver() && n++ < 600) {
    const u = b.current();
    let e = u.side === 'party' ? b.perform(partyAction(b)) : b.runEnemyTurn();
    if (e.length === 1 && e[0].type === 'invalid') e = b.perform({ type: 'defend' });
    for (const x of e) types.add(x.type);
    for (const x of e) if (x.type === 'summon') info.units[x.enemy] = { uid: x.enemy, id: x.id, name: x.name, side: 'enemy', maxHp: x.hp || 1 };
    const batch = planEvents(e, info);
    assert.equal(batch[batch.length - 1].op, 'end');
    assert.ok(totalFrames(batch) <= 2400, `${enc}: a turn stays bounded (${totalFrames(batch)})`);
    all.push(...batch);
  }
  assert.ok(b.isOver(), `${enc} finished`);
  return { all, types, result: b.result() };
}

test('real Episode 3 fights plan from start to end (sr_first, the Specter, the Warden)', () => {
  const sr = play('sr_first', 13, 3);
  assert.ok(sr.types.has('heat'), 'sr_first raises Heat');
  assert.ok(sr.all.some((o) => o.op === 'heat'));
  const sp = play('bellows_specter', 16, 5);
  assert.ok(sp.all.some((o) => o.op === 'heat'));
  const cw = play('cinder_warden', 17, 7);
  const swaps = cw.all.filter((o) => o.op === 'swapSprite').map((o) => o.sprite);
  assert.ok(swaps.includes('cinder_warden_molten'), `the molten look shows (${swaps})`);
  if (cw.types.has('oath_ring')) assert.ok(cw.all.some((o) => o.op === 'fx' && o.kind === 'oath_ring'));
});

test('stages, boss cards and the Heat pips are wired', () => {
  assert.equal(backdropKey('sand_road', false), 'ash_road');
  assert.equal(backdropKey('foundry_f3', false), 'crucible');
  assert.equal(backdropKey('foundry_heart', true), 'heartforge');
  const src = fs.readFileSync(new URL('../../src/scenes/battle.js', import.meta.url), 'utf8');
  for (const k of ["THE BELLOWS SPECTER", "THE CINDER WARDEN", "ash_road: {", "foundry: {", "crucible: {", "heartforge: {"]) assert.ok(src.includes(k), k);
  const know = { weak: ['ice'], resist: [], unknown: 1 };
  assert.equal(enemyRowWidth({ ...know, heatMax: 3 }) - enemyRowWidth(know), 22, 'three pips widen the row by their plate');
});
