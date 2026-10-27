// The Deep Stacks switch. Part of the INITIAL bundle on purpose (the library map and the title will import it) and the one file
// in src/data/cave/ that is not a pack file (tools/pwa/build_pwa.py excludes only this one, the x1/x2 pattern).
//
//   CAVE_LIVE    the master switch. false = the Stacks do not exist: ensurePack('cave') never fetches, nothing is registered,
//                the trapdoor is a locked inspect line, no title row. The integrator (C2-world) flips it, last.
//   caveOn()     the gate every edit of an existing map, NPC talk entry and scene condition uses: CAVE_LIVE and the cave pack
//                has loaded (packReady). A touched map may call it at module top level: the map is re-imported once the pack
//                becomes ready (src/world/maps.js), so it re-evaluates.
//
// packs.js will import CAVE_LIVE from here and this file imports packReady from packs.js: a cycle on purpose, both sides only
// read the other inside a function, so evaluation order does not matter.
import { packReady } from '../../game/packs.js';

export const CAVE_LIVE = false;

/** True when the Stacks are on and the cave pack has loaded. */
export function caveOn() {
  if (!CAVE_LIVE) return false;
  return packReady('cave');
}
