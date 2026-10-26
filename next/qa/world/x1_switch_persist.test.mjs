// X1 fix pass (M1): a floor switch with `stateFlag` keeps its position in a save. The Barrow's sw_slab opens the Ewe Chamber
// slab and shuts the Ossuary slab; a save made inside the chamber used to reload with the slab shut and the party sealed in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interact, fireTarget } from '../../src/world/events.js';
import barrow from '../../src/data/maps/x1_barrow.js';
import { makeField, FIXTURE } from './x1_fixture.mjs';

const mini = {
  ...FIXTURE, id: '_x1fx_sw',
  events: [
    { id: 'sw', type: 'switch', kind: 'floor', x: 5, y: 5, target: ['sl_a', 'sl_b'], state: 'off', sprite: 'switch_off', stateFlag: 'fx_sw_thrown' },
    { id: 'sl_a', type: 'shelf', x: 8, y: 2, sprite: 'shelf_moving', positions: [[8, 2], [10, 2]], state: 0 },
    { id: 'sl_b', type: 'shelf', x: 12, y: 2, sprite: 'shelf_moving', positions: [[12, 2], [10, 2]], state: 0 },
  ],
};
const mk = (flags) => { const f = makeField(mini, flags ? { flags } : {}); f.slideProp = (p, x, y) => { f.map.moveProp(p, x, y); return Promise.resolve(); }; return f; };

test('a switch with stateFlag records its position in the flag when thrown and cleared', async () => {
  const f = mk();
  await interact(f, f.entities.get('sw'));
  assert.equal(f.entities.get('sw').state, 'on');
  assert.ok(f.game.flags.fx_sw_thrown, 'thrown: the flag is set');
  await interact(f, f.entities.get('sw'));
  assert.equal(f.entities.get('sw').state, 'off');
  assert.ok(!f.game.flags.fx_sw_thrown, 'thrown back: the flag is cleared');
});

test('reloading with the flag set starts the switch on and its shelves at their on positions', () => {
  const f = makeField(mini, { flags: { fx_sw_thrown: true } });
  assert.equal(f.entities.get('sw').state, 'on');
  assert.equal(f.entities.get('sl_a').state, 1);
  assert.equal(f.entities.get('sl_b').state, 1);
  const f0 = makeField(mini);
  assert.equal(f0.entities.get('sw').state, 'off');
  assert.equal(f0.entities.get('sl_a').state, 0, 'without the flag nothing moves');
});

test('x1_barrow: sw_slab carries the stateFlag and the Ewe Chamber slab is open on a reload with it', () => {
  const sw = barrow.events.find((e) => e.id === 'sw_slab');
  assert.ok(sw.stateFlag, 'sw_slab has a stateFlag');
  assert.equal(sw.state, 'off', 'the first visit is unchanged: switch off, south slab open, north slab shut');
  const slabN = barrow.events.find((e) => e.id === 'slab_n');
  const slabS = barrow.events.find((e) => e.id === 'slab_s');
  assert.deepEqual(slabN.positions[0], [slabN.x, slabN.y]);
  assert.deepEqual(slabS.positions[0], [slabS.x, slabS.y]);
  // the on state of the pair: the chamber slab leaves its doorway (cells 12..13), the Ossuary slab fills its own (19..20)
  assert.deepEqual(slabN.positions[1], [14, 14]);
  assert.deepEqual(slabS.positions[1], [19, 14]);
});
