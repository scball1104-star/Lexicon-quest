// The Episode 3 maps as a lazy pack (E3-maps). Nothing here is in the first download: the core download has no room
// left under the tap-prompt ratchet, so the ten maps live in this folder and register themselves when the ep3 pack
// loads. The pack entry (src/game/packs.js PACKS, added by E3-integrate as written here plus `hard: true` and ep2_started in wanted):
//
//   ep3: { entry: '../data/maps/ep3/index.js', prefix: 'ep3/', assets: null, audioPack: 'ep3',
//          touches: [...EP3_MAP_IDS, 'nameless_hollow', 'nh_inn'], wanted: (f) => !!(f.ep2_complete || f.ep3_started),
//          enabled: () => EP3_LIVE }
//
// With the prefix 'ep3/' tools/pwa/build_pwa.py counts every file of src/data/maps/ep3/ as the pack's (kept out of the
// precache, runtime-cached), and the `touches` list makes src/world/maps.js wait for the pack before it resolves one of
// these ids; registerMap() puts each module where loadMap() looks first. nameless_hollow and nh_inn resolve to their core
// modules with the Episode 3 edits applied (hollow_gate.js): the east gate, the inn's marks.
import { registerMap } from '../../../world/maps.js';
import nameless_hollow from '../nameless_hollow.js';
import nh_inn from '../nh_inn.js';
import { withEastGate, withInnMarks, WALL_WAKE } from './hollow_gate.js';
import { EP3_TILES } from './_open_tiles.js';
import './_opening.js';
import { mergeTileFragment } from '../../../game/packs.js';
import { CREDITS_HANDOFF } from '../../../game/story.js';
import { EP3_START } from '../../../game/state.js';
import sand_road from './sand_road.js';
import emberpeak from './emberpeak.js';
import pk_inn from './pk_inn.js';
import pk_shop from './pk_shop.js';
import pk_smithy from './pk_smithy.js';
import pk_bellhouse from './pk_bellhouse.js';
import foundry_f1 from './foundry_f1.js';
import foundry_f2 from './foundry_f2.js';
import foundry_f3 from './foundry_f3.js';
import foundry_heart from './foundry_heart.js';

export const ID = 'ep3';
export const MAPS = [sand_road, emberpeak, pk_inn, pk_shop, pk_smithy, pk_bellhouse, foundry_f1, foundry_f2, foundry_f3, foundry_heart];
export const EP3_MAP_IDS = MAPS.map((m) => m.id);

/**
 * Issue #99: Episode 3 opens on Hollowmere's east wall walk (hollow_gate.js), not in the inn. The Episode 2 credits handoff
 * and the Episode 3 quick start land there (both are core tables; the pack points them, as the ep4 pack points the Episode 3
 * end card), and ep3_morning moves any other arrival (an old save in nh_inn) up to the wall.
 */
export function pointOpening() {
  if (CREDITS_HANDOFF[2]) Object.assign(CREDITS_HANDOFF[2], { map: 'nameless_hollow', mark: 'wall_wake' });
  Object.assign(EP3_START, { map: 'nameless_hollow', mark: 'wall_wake', pos: { x: WALL_WAKE[0], y: WALL_WAKE[1], dir: 'up' } });
}

/**
 * The opening's tiles (tools/art/tiles/ep3_wall.py): the pack's own sheet, merged the way a pack manifest's fragment is. Kept
 * apart from `done`: the ep4 pack's maps.js calls register() with no engine, and that may come first; the art then loads on the
 * pack loader's own register(engine). The tile entries merge at once; the pack is ready when the sheet has loaded.
 */
let art = null;
export function loadOpeningArt(engine) {
  const assets = engine && engine.assets;
  if (art || !assets || typeof assets.loadImage !== 'function') return art;
  const db = assets.json('tiles', null);
  if (db) mergeTileFragment(db, EP3_TILES);
  art = assets.loadImage('ep3', 'assets/tiles/ep3.png').then(() => true, () => false);
  return art;
}

let done = null;
/** Register the ten maps and the two edited core maps. Idempotent. Resolves { id, loaded, skipped }. */
export function register(engine) {
  const sheet = loadOpeningArt(engine);
  if (!done) {
    for (const m of MAPS) registerMap(m);
    registerMap(withEastGate(nameless_hollow));
    registerMap(withInnMarks(nh_inn));
    pointOpening();
    // The field code these maps need (src/world/ep3/, lazy, never precached) rides on the pack: it is imported here, and
    // fetched again once the service worker controls the page (a first visit loads the pack before the worker takes over),
    // so it sits in the worker's runtime cache with the maps and the episode plays offline after one visit even if the
    // party has not reached its first Episode 3 map yet. Template URLs keep build_pwa.py from preloading it.
    if (typeof document !== 'undefined') {
      const files = ['index', 'flow', 'quench', 'fx'].map((n) => new URL(`../../../world/ep3/${n}.js`, import.meta.url).href);
      import(files[0]).catch(() => {});
      const warm = () => { for (const u of files) fetch(u).catch(() => {}); };
      const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : null;
      if (sw && !sw.controller && sw.addEventListener) sw.addEventListener('controllerchange', warm, { once: true }); else warm();
    }
    done = Promise.resolve({ id: ID, loaded: [...EP3_MAP_IDS, 'nameless_hollow', 'nh_inn'], skipped: [] });
  }
  return sheet ? Promise.all([done, sheet]).then(([r]) => r) : done;
}

export default register;
