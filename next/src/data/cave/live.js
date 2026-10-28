// The Deep Stacks switch. Part of the INITIAL bundle on purpose (the title will import it) and the one file in src/data/cave/
// that is not a pack file (tools/pwa/build_pwa.py excludes only this one, the x1/x2 pattern).
//   CAVE_LIVE     the master switch. false = the Stacks do not exist: ensurePack('cave') never fetches, nothing is registered,
//                 no trapdoor, no title row. The integrator flipped it on 2026-10-28, last.
//   caveForced()  QA: ?cave=1 or ?pack=cave on the page URL, or globalThis.LQ_CAVE_ON in Node, turns the pack on while CAVE_LIVE is false.
//   caveOn()      the switch (or the force) and the cave pack has loaded (packReady).
// The cycle with packs.js is on purpose: both sides read the other inside a function. The force registers in a microtask, after
// packs.js's own module body has run.
import { packReady, forcePack } from '../../game/packs.js';

export const CAVE_LIVE = true;   // flipped 2026-10-28 by the orchestrator after C4-fixes (PLAN.md Wave C); publish still waits for Scott

export function caveForced() {
  try {
    if (globalThis.LQ_CAVE_ON === true) return true;
    const q = typeof location !== 'undefined' ? location.search : '';
    if (/[?&]cave=1(&|$)/.test(q)) return true;
    const m = /[?&]pack=([^&]*)/.exec(q);
    return !!m && decodeURIComponent(m[1]).split(',').includes('cave');
  } catch (e) { return false; }
}

export function caveOn() { return (CAVE_LIVE || caveForced()) && packReady('cave'); }

if (caveForced() && typeof queueMicrotask === 'function') queueMicrotask(() => { try { forcePack('cave'); } catch (e) { /* packs.js not up yet */ } });
