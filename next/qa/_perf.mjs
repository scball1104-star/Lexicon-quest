// Load-proof timing for the performance budgets in the suites (issue #76).
//
// A budget test used to take ONE wall-clock sample and compare it with an absolute limit, so it failed whenever
// the PC was busy (the suite runs four files at once, and other jobs share the CPU) and passed alone. Two things
// change that, without letting a real slowdown through:
//
//  1. Best of several tries. Load only ever ADDS time (a preempted thread, a slower clock), so the fastest of a few
//     repeats is the honest cost of the code. A real slowdown is slow on every try and still fails.
//  2. A calibration loop measured in the same run. `loadFactor()` times a fixed piece of plain JS (typed-array math,
//     small objects, a Map) and divides by its time on a quiet reference PC (CAL_QUIET_MS, the Dell XPS 8930 that
//     runs the suite). On a quiet machine the factor is 1 and the budget is exactly the old one. When the machine is
//     busy, or slower, the budget stretches by the same factor the calibration loop slowed down, so the check stays
//     "this code costs under N ms on the reference PC". The factor never goes below 1 (a fast machine keeps the
//     written budget) and is capped at MAX_FACTOR, so a pathological slowdown cannot hide behind a very busy box.
//
//   import { within } from '../_perf.mjs';
//   const r = within(1, () => { ...time the work, return ms... });   // budget 1 ms on the reference PC
//   assert.ok(r.ok, r.msg('light + run + plates'));
//
// `within` tries the measurement up to `tries` times and stops at the first one under the plain budget, so on a
// quiet machine it costs one try. LQ_PERF_STRICT=1 turns both helpers off (one try, factor 1): the old behaviour,
// for a perf check on a quiet machine.

export const CAL_QUIET_MS = 0.85;   // calibrate() on the reference PC (0.83 to 0.96 ms seen, quiet or busy, 2026-11-11)
export const MAX_FACTOR = 4;
export const STRICT = process.env.LQ_PERF_STRICT === '1';

// The calibration work: plain JS of the kind the field code does. Exported so a browser test can run the very same
// code in the page (CAL_JS) under the same CPU throttle as the thing it measures.
export function calWork() {
  const a = new Float64Array(4096);
  const m = new Map();
  for (let r = 0; r < 80; r++) {
    for (let i = 0; i < a.length; i++) a[i] = Math.sqrt(i * 1.5 + r) + (a[(i * 7) & 4095] * 0.5);
    for (let i = 0; i < 64; i++) { const o = { x: i, y: r, k: `c${i & 15}` }; m.set(o.k, (m.get(o.k) || 0) + o.x * o.y); }
  }
  return a[100] + m.size;
}
let sink = 0;

// A page-side expression that returns the fastest of nine runs of calWork, in ms (for page.evaluate).
export const CAL_JS = `(() => { const calWork = ${calWork.toString()}; let s = 0; for (let i = 0; i < 3; i++) s += calWork(); let best = 1e9; for (let i = 0; i < 9; i++) { const t0 = performance.now(); s += calWork(); best = Math.min(best, performance.now() - t0); } globalThis.__lqCalSink = s; return best; })()`;

// A load factor from a calibration time measured elsewhere (a page, a throttled page: pass the expected quiet
// multiple as `scale`, e.g. 4 for a 4x CPU throttle).
export function factorFrom(calMs, scale = 1) {
  if (STRICT) return 1;
  return Math.min(MAX_FACTOR, Math.max(1, calMs / (CAL_QUIET_MS * scale)));
}

// The fastest of `n` runs of the calibration loop, in ms.
export function calibrate(n = 9) {
  for (let i = 0; i < 3; i++) sink += calWork();   // warm the JIT
  let best = Infinity;
  for (let i = 0; i < n; i++) { const t0 = performance.now(); sink += calWork(); best = Math.min(best, performance.now() - t0); }
  return best;
}

// How much slower this machine is right now than the quiet reference PC (1 when it is not slower).
export function loadFactor() {
  if (STRICT) return 1;
  return factorFrom(calibrate());
}

// Run `measure` (returns ms) up to `tries` times; pass when the best try is under budgetMs on the reference PC.
export function within(budgetMs, measure, { tries = 5 } = {}) {
  const n = STRICT ? 1 : tries;
  let best = Infinity;
  const seen = [];
  for (let i = 0; i < n; i++) {
    const ms = measure();
    seen.push(ms);
    best = Math.min(best, ms);
    if (best < budgetMs) return report(true, best, budgetMs, 1, seen);
  }
  const factor = loadFactor();
  return report(best < budgetMs * factor, best, budgetMs, factor, seen);
}

// The same for an async measurement.
export async function withinAsync(budgetMs, measure, { tries = 5 } = {}) {
  const n = STRICT ? 1 : tries;
  let best = Infinity;
  const seen = [];
  for (let i = 0; i < n; i++) {
    const ms = await measure();
    seen.push(ms);
    best = Math.min(best, ms);
    if (best < budgetMs) return report(true, best, budgetMs, 1, seen);
  }
  const factor = loadFactor();
  return report(best < budgetMs * factor, best, budgetMs, factor, seen);
}

function report(ok, best, budgetMs, factor, seen) {
  const f = (x) => (x < 0.1 ? x.toFixed(4) : x.toFixed(3));
  return {
    ok, best, factor, budget: budgetMs * factor,
    msg: (what) => `${what}: best ${f(best)} ms of ${seen.length} tries [${seen.map(f).join(', ')}] against ${budgetMs} ms`
      + (factor > 1 ? ` x load factor ${factor.toFixed(2)} = ${f(budgetMs * factor)} ms` : ''),
  };
}
