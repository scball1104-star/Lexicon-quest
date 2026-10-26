// The Episode 2 expansion switch ("The Mere Country"). Part of the INITIAL bundle on purpose (existing maps import it) and
// the one file in src/data/x2/ that is not a pack file (tools/pwa/build_pwa.py excludes only this one).
//
//   X2_LIVE      the master switch. false = the expansion does not exist: ensurePack('x2') never fetches, nothing is
//                registered, every gate below is false. X2-integrate flips it, last (docs/briefs/XP-packs.md).
//   X2_REGIONS   per-region switches, so one region can ship off (none named yet; the plan uses x2On() with no region); a region not listed is on.
//   x2On(region) the gate every edit of an existing map, NPC talk entry and scene condition uses:
//                X2_LIVE && the region is on && the x2 pack has loaded (packReady). A touched map may call it at module top
//                level: the map is re-imported once the pack becomes ready (src/world/maps.js), so it re-evaluates.
//
// packs.js imports X2_LIVE from here and this file imports packReady from packs.js: a cycle on purpose, both sides only read
// the other inside a function, so evaluation order does not matter.
import { packReady } from '../../game/packs.js';

export const X2_LIVE = false;

export const X2_REGIONS = {};

/** True when the expansion is on, `region` (optional) is on, and the x2 pack has loaded. */
export function x2On(region) {
  if (!X2_LIVE) return false;
  if (region !== undefined && X2_REGIONS[region] === false) return false;   // only an explicit false turns a region off
  return packReady('x2');
}
