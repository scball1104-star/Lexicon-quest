// The ep4 pack's field code (E4-world, docs/EPISODE4_PLAN.md 5): index.js calls register(engine) after `audio` and
// before `maps`. Importing ./field/events.js registers the tide event types on EXT, the door pairs on GATE_SPRITES, the
// rim lights on FIELD_LOOK and TINTS.flood_grey; register() adds the test map and attaches the tide system to every field
// the engine enters (so a boat door works on a map without a wheel). docs/WORLD_EP4.md has the contracts.

import { registerMap } from '../../world/maps.js';
import { attach } from './field/events.js';
import { TEST_TIDE } from './field/_testtide.js';

export { attach };
export const TEST_MAP_IDS = [TEST_TIDE.id];
let hooked = null;

export function register(engine) {
  registerMap(TEST_TIDE);
  if (engine && typeof engine.on === 'function' && hooked !== engine) {
    hooked = engine;
    engine.on('scene', (s) => { if (s && s.name === 'field') attach(s); });
    for (const s of engine.stack || []) if (s && s.name === 'field') attach(s);
  }
  return { tests: TEST_MAP_IDS };
}

export default register;
