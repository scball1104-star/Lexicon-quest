// The ep8 pack's field code (E8-world, docs/EPISODE8_PLAN.md 4.4, 5.1 and 5.2): index.js calls register(engine) after `audio`
// and before `pages`. Importing ./field/events.js registers the `popbook` event type on EXT; register() adds the test map,
// the pack tints `rubout` and `violet` (on TINTS, NIGHT_TINTS and LAMP_TINTS, so lamps light under both), the first-time
// barks (only where text.js has none yet), the stand-in art once the pack's tile fragment merged, and attaches the pop-up
// book system to every field the engine enters (a map with a popbooks block whose books have not been created yet still
// gets field.books, and every map without one gets an idle system). docs/WORLD_EP8.md has the contracts.

import { registerMap } from '../../world/maps.js';
import { onPackReady } from '../../game/packs.js';
import { TINTS, NIGHT_TINTS, LAMP_TINTS } from '../../world/lighting.js';
import { BARKS } from '../text.js';
import { attach } from './field/events.js';
import { ensureArt } from './field/art.js';
import { RUBOUT_TINT, VIOLET_TINT } from './field/light.js';
import { TEST_BOOKS } from './field/_testbooks.js';

export { attach };
export const TEST_MAP_IDS = [TEST_BOOKS.id];

if (!TINTS.rubout) TINTS.rubout = RUBOUT_TINT;
if (!TINTS.violet) TINTS.violet = VIOLET_TINT;
for (const id of ['rubout', 'violet']) { NIGHT_TINTS.add(id); LAMP_TINTS.add(id); }

// The first-time barks of plan 5.1, word for word. E8-story's text.js owns BARKS (it registers before this module), so its
// lines always win; these fill in only ids it has not registered.
const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });
export const BOOK_BARKS = {
  first_open: [{ if: ['mira_joined'], lines: [m("It's a bridge. A paper Mother Willow.")] }],
  first_wall: [{ if: ['bram_joined'], lines: [b('Pages on the floor are walls. Pages over nothing are bridges.')] }],
  first_side: [{ if: ['mira_joined'], lines: [m("It opens away from whoever reads it. Go round.")] }],
  first_pair: [{ if: ['bram_joined'], lines: [b('Two books, one page. Only one of them gets to stand.')] }],
  would_fold: [{ if: ['mira_joined'], lines: [m("Not while we're standing on it.")] }],
};

let hooked = null;

export function register(engine) {
  registerMap(TEST_BOOKS);
  for (const [id, v] of Object.entries(BOOK_BARKS)) if (!(id in BARKS)) BARKS[id] = v;
  if (engine && typeof engine.on === 'function' && hooked !== engine) {
    hooked = engine;
    // the stand-in void, marble and books, once the pack's tile fragment has merged (E8-tiles' ids always win)
    onPackReady('ep8', () => ensureArt(engine.assets && engine.assets.json('tiles', null), engine));
    engine.on('scene', (s) => { if (s && s.name === 'field') attach(s); });
    for (const s of engine.stack || []) if (s && s.name === 'field') attach(s);
  }
  return { tests: TEST_MAP_IDS };
}

export default register;
