// The ep7 pack's field code (E7-world, docs/EPISODE7_PLAN.md 4.5, 5.1 and 5.2): index.js calls register(engine) after `audio`
// and before `pages`. Importing ./field/events.js registers the `namestone` event type on EXT; register() adds the test map,
// the pack tints `whiteout` (TINTS only: the White Road's scene) and `aurora` (on TINTS, NIGHT_TINTS and LAMP_TINTS, so
// lamps light under it), the first-time barks (only where text.js has none yet), the stand-in art once the pack's tile
// fragment merged, and attaches the name stone system to every field the engine enters (a map with a remember block and
// no stone of its own has no create() to attach it). docs/WORLD_EP7.md has the contracts.

import { registerMap } from '../../world/maps.js';
import { onPackReady } from '../../game/packs.js';
import { TINTS, NIGHT_TINTS, LAMP_TINTS } from '../../world/lighting.js';
import { BARKS } from '../text.js';
import { attach } from './field/events.js';
import { ensureArt } from './field/art.js';
import { WHITEOUT_TINT, AURORA_TINT } from './field/aurora.js';
import { TEST_REMEMBER } from './field/_testremember.js';

export { attach };
export const TEST_MAP_IDS = [TEST_REMEMBER.id];

if (!TINTS.whiteout) TINTS.whiteout = WHITEOUT_TINT;
if (!TINTS.aurora) TINTS.aurora = AURORA_TINT;
NIGHT_TINTS.add('aurora');
LAMP_TINTS.add('aurora');

// The first-time barks of plan 5.1, word for word. E7-story's text.js owns BARKS (it registers before this module), so its
// lines always win; these fill in only ids it has not registered.
const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });
export const STONE_BARKS = {
  first_held: [{ if: ['mira_joined'], lines: [m("ASTA. And there's the road she walked.")] }],
  first_letgo: [{ if: ['mira_joined'], lines: [m("Two at a time. The road can't remember more than we can.")] }],
  first_reread: [{ if: ['mira_joined'], lines: [m("Say it again and it's the newest. The old one goes first.")] }],
  first_grip: [{ if: ['bram_joined'], lines: [b("That door's holding on to somebody.")] }],
  would_fade: [{ if: ['mira_joined'], lines: [m("Not while we're standing on it.")] }],
};

let hooked = null;

export function register(engine) {
  registerMap(TEST_REMEMBER);
  for (const [id, v] of Object.entries(STONE_BARKS)) if (!(id in BARKS)) BARKS[id] = v;
  if (engine && typeof engine.on === 'function' && hooked !== engine) {
    hooked = engine;
    // the stand-in fade, snow and cairns, once the pack's tile fragment has merged (E7-tiles' ids always win)
    onPackReady('ep7', () => ensureArt(engine.assets && engine.assets.json('tiles', null), engine));
    engine.on('scene', (s) => { if (s && s.name === 'field') attach(s); });
    for (const s of engine.stack || []) if (s && s.name === 'field') attach(s);
  }
  return { tests: TEST_MAP_IDS };
}

export default register;
