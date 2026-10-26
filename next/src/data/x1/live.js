// The Episode 1 expansion switch ("The Wider Valley"). Part of the INITIAL bundle on purpose (existing maps import it) and
// the one file in src/data/x1/ that is not a pack file (tools/pwa/build_pwa.py excludes only this one).
//
//   X1_LIVE      the master switch. false = the expansion does not exist: ensurePack('x1') never fetches, nothing is
//                registered, every gate below is false. X1-integrate flips it, last (docs/briefs/XP-packs.md).
//   X1_REGIONS   per-region switches, so one region can ship off (west, south, north, wild); a region not listed is on.
//   x1On(region) the gate every edit of an existing map, NPC talk entry and scene condition uses:
//                X1_LIVE && the region is on && the x1 pack has loaded (packReady). A touched map may call it at module top
//                level: the map is re-imported once the pack becomes ready (src/world/maps.js), so it re-evaluates.
//
// packs.js imports X1_LIVE from here and this file imports packReady from packs.js: a cycle on purpose, both sides only read
// the other inside a function, so evaluation order does not matter.
import { packReady } from '../../game/packs.js';

export const X1_LIVE = true;

export const X1_REGIONS = { west: true, south: true, north: true, wild: true };

/** True when the expansion is on, `region` (optional) is on, and the x1 pack has loaded. */
export function x1On(region) {
  if (!X1_LIVE) return false;
  if (region !== undefined && X1_REGIONS[region] === false) return false;   // only an explicit false turns a region off
  return packReady('x1');
}
