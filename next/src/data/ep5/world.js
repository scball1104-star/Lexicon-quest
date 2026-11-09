// The ep5 pack's field code (E5-world, docs/EPISODE5_PLAN.md 5.1 and 5.2): index.js calls register(engine) after `audio`
// and before `pages`. Importing ./field/events.js registers the shade event types on EXT, the sun and moon gate pairs on
// GATE_SPRITES and the plate as a gate source; register() adds the two test maps, the optional `desert_noon` tint, the
// first-time barks (only where text.js has none yet), and attaches the shade system to every field the engine enters (so
// the battle sky hears every map's hour, `setFieldHour` in ../ep5/sky.js). docs/WORLD_EP5.md has the contracts.

import { registerMap } from '../../world/maps.js';
import { onPackReady } from '../../game/packs.js';
import { TINTS } from '../../world/lighting.js';
import { BARKS } from '../text.js';
import { attach } from './field/events.js';
import { ensureArt } from './field/art.js';
import { NOON_TINT } from './field/system.js';
import { TEST_SHADE, TEST_SHADE_IN } from './field/_testshade.js';

export { attach };
export const TEST_MAP_IDS = [TEST_SHADE.id, TEST_SHADE_IN.id];

/**
 * Noon on the open floors: a pale warm lift so noon reads as heat, not as plain day (plan 2.8, optional). A light warm
 * multiply with a little sun-white added; measured in qa/world/ep5_lab.py (case `tint`): it must keep the running/firm
 * sand contrast within 10% of no tint on the phone crop, or NOON_TINT stays 'none'.
 */
export const DESERT_NOON = { color: '#fff1d6', alpha: 0.22, glow: '#fff4dc', glowAlpha: 0.05 };
export const KEEP_DESERT_NOON = true;
if (!TINTS.desert_noon) TINTS.desert_noon = DESERT_NOON;
if (KEEP_DESERT_NOON) NOON_TINT.id = 'desert_noon';

// The first-time barks of plan 5.1, word for word. E5-story's text.js owns BARKS; these fill in only ids it has not
// registered (text.js registers before this module), so its lines always win.
const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });
export const SHADE_BARKS = {
  first_shade: [{ if: ['mira_joined'], lines: [m('A bridge made of shade. Of course it is.')] }],
  first_shove_shade: [{ if: ['bram_joined'], lines: [b('Move the stone, move the shade. I can do that.')] }],
  first_window: [{ if: ['mira_joined'], lines: [m("Indoors the dark holds. The light's the trouble now.")] }],
  first_lamp: [{ if: ['bram_joined'], lines: [b("So now we're the sun. Fine.")] }],
  sand_would_run: [{ if: ['mira_joined'], lines: [m('Not there. The sand would run under us.')] }],
};

let hooked = null;

export function register(engine) {
  registerMap(TEST_SHADE);
  registerMap(TEST_SHADE_IN);
  for (const [id, v] of Object.entries(SHADE_BARKS)) if (!(id in BARKS)) BARKS[id] = v;
  if (engine && typeof engine.on === 'function' && hooked !== engine) {
    hooked = engine;
    // the stand-in shade objects, once the pack's tile fragment has merged (E5-tiles' ids always win)
    onPackReady('ep5', () => ensureArt(engine.assets && engine.assets.json('tiles', null), engine));
    engine.on('scene', (s) => { if (s && s.name === 'field') attach(s); });
    for (const s of engine.stack || []) if (s && s.name === 'field') attach(s);
  }
  return { tests: TEST_MAP_IDS };
}

export default register;
