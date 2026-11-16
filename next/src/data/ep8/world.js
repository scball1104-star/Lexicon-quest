// The ep8 pack's field code (E8-world, docs/EPISODE8_PLAN.md 4.4, 5.1 and 5.2): index.js calls register(engine) after `audio`
// and before `pages`. Importing ./field/events.js registers the `popbook` event type on EXT; register() adds the test map,
// the pack tints `rubout` and `violet` (on TINTS, NIGHT_TINTS and LAMP_TINTS, so lamps light under both), the stand-in art
// for any id the pack's tile fragment lacks (none, with E8-tiles' sheet), and attaches the pop-up
// book system to every field the engine enters (a map with a popbooks block whose books have not been created yet still
// gets field.books, and every map without one gets an idle system). docs/WORLD_EP8.md has the contracts.

import { registerMap } from '../../world/maps.js';
import { onPackReady } from '../../game/packs.js';
import { TINTS, NIGHT_TINTS, LAMP_TINTS } from '../../world/lighting.js';
import { attach } from './field/events.js';
import { ensureArt } from './field/art.js';
import { RUBOUT_TINT, VIOLET_TINT } from './field/light.js';
import { TEST_BOOKS } from './field/_testbooks.js';

export { attach };
export const TEST_MAP_IDS = [TEST_BOOKS.id];

if (!TINTS.rubout) TINTS.rubout = RUBOUT_TINT;
if (!TINTS.violet) TINTS.violet = VIOLET_TINT;
for (const id of ['rubout', 'violet']) { NIGHT_TINTS.add(id); LAMP_TINTS.add(id); }

// The book barks the field speaks (field.bark: first_open, first_wall, first_side, first_pair, would_fold) and the realm
// lines (ep8_realm_<realm>) are E8-story's, in ../text.js (EP8_BARKS, EP8_REALMS), registered by the pack before this module.
export const BOOK_BARK_IDS = ['first_open', 'first_wall', 'first_side', 'first_pair', 'would_fold'];

let hooked = null;

export function register(engine) {
  registerMap(TEST_BOOKS);
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
