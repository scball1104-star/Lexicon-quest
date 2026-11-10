// The ep6 pack's field code (E6-world, docs/EPISODE6_PLAN.md 4.4, 5.1 and 5.2): index.js calls register(engine) after `audio`
// and before `pages`. Importing ./field/events.js registers the `vane` and `mooring` event types on EXT; register() adds the
// test map, the pack tint `storm` (on TINTS, NIGHT_TINTS and LAMP_TINTS, so lamps light under it), the first-time barks
// (only where text.js has none yet), the stand-in art once the pack's tile fragment merged, and attaches the gust lane system
// to every field the engine enters (a map with lanes and no vane has no create() of its own to attach it). docs/WORLD_EP6.md
// has the contracts.

import { registerMap } from '../../world/maps.js';
import { onPackReady } from '../../game/packs.js';
import { TINTS, NIGHT_TINTS, LAMP_TINTS } from '../../world/lighting.js';
import { BARKS } from '../text.js';
import { attach } from './field/events.js';
import { ensureArt } from './field/art.js';
import { STORM_TINT } from './field/storm.js';
import { TEST_WIND, TEST_RING } from './field/_testwind.js';

export { attach };
export const TEST_MAP_IDS = [TEST_WIND.id, TEST_RING.id];

if (!TINTS.storm) TINTS.storm = STORM_TINT;
NIGHT_TINTS.add('storm');
LAMP_TINTS.add('storm');

// The first-time barks of plan 5.1, word for word. E6-story's text.js owns BARKS (it registers before this module), so its
// lines always win; these fill in only ids it has not registered.
const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });
export const WIND_BARKS = {
  first_ride: [{ if: ['bram_joined'], lines: [b('I am never doing that again.')] }],
  first_post: [{ if: ['mira_joined'], lines: [m('Grab the post. The wind lets go.')] }],
  first_vane: [{ if: ['mira_joined'], lines: [m('Turn the vane, turn the wind. Then ride it.')] }],
  first_duct: [{ if: ['bram_joined'], lines: [b('Wind in the floor now. Lovely.')] }],
  first_ring: [{ if: ['mira_joined'], lines: [m('It goes round. Pick a way and hold on.')] }],
  vane_would_drop: [{ if: ['mira_joined'], lines: [m("Not while we're standing on it.")] }],
};

let hooked = null;

export function register(engine) {
  registerMap(TEST_WIND);
  registerMap(TEST_RING);
  for (const [id, v] of Object.entries(WIND_BARKS)) if (!(id in BARKS)) BARKS[id] = v;
  if (engine && typeof engine.on === 'function' && hooked !== engine) {
    hooked = engine;
    // the stand-in cloudbank, vanes and posts, once the pack's tile fragment has merged (E6-tiles' ids always win)
    onPackReady('ep6', () => ensureArt(engine.assets && engine.assets.json('tiles', null), engine));
    engine.on('scene', (s) => { if (s && s.name === 'field') attach(s); });
    for (const s of engine.stack || []) if (s && s.name === 'field') attach(s);
  }
  return { tests: TEST_MAP_IDS };
}

export default register;
