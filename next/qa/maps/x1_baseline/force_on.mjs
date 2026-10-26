// X1-maps-hub test and preview support: show the five hub maps as the game sees them once the expansion is ON.
// `X1_LIVE` is a const that X1-integrate flips last, so until then nothing can import a map in its "on" state. This module
// registers a synchronous resolve hook (node:module registerHooks) that swaps `src/data/x1/live.js` for a stub, for the
// importer only (a map module), so the real live.js and packs.js stay untouched:
//
//   import './force_on.mjs'; const m = (await import(`.../valley.js?x1=west,north`)).default;   // in a test: one URL per variant
//   NODE_OPTIONS="--import file:///.../force_on.mjs" LQ_X1_ON=all node tools/maps/mapcheck.mjs check --pack x1   // the CLI, a preview
//
// The spec (the `x1` query of the importing map URL, else the LQ_X1_ON environment variable):
//   all                  the switch on, every region on, the pack taken as loaded
//   none                 the switch on, every region off (so x1On('west') is false, x1On() is true)
//   west,north           the switch on, only these regions on
//   real:west,north      the switch on, only these regions on, and the pack counts only when the REAL packs.js says packReady('x1')
//                        (the "switch on but the x1 pack not registered" case, and the late registration)
// With no spec (no query, no variable) the real live.js is used.
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PACKS_URL = pathToFileURL(path.join(NEXT, 'src', 'game', 'packs.js')).href;
const ALL = ['west', 'south', 'north', 'wild'];

function stubSource(spec) {
  const real = spec.startsWith('real:');
  const list = (real ? spec.slice(5) : spec);
  const on = list === 'all' || list === '' ? ALL : list === 'none' ? [] : list.split(',').filter(Boolean);
  const regions = Object.fromEntries(ALL.map((r) => [r, on.includes(r)]));
  return `${real ? `import { packReady } from ${JSON.stringify(PACKS_URL)};` : ''}
export const X1_LIVE = true;
export const X1_REGIONS = ${JSON.stringify(regions)};
export function x1On(region) {
  if (region !== undefined && X1_REGIONS[region] === false) return false;
  return ${real ? "packReady('x1')" : 'true'};
}`;
}

export function specFor(parentURL) {
  if (parentURL) {
    const q = new URL(parentURL).searchParams.get('x1');
    if (q != null) return q;
  }
  return process.env.LQ_X1_ON != null && process.env.LQ_X1_ON !== '' ? process.env.LQ_X1_ON : null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/(^|\/)x1\/live\.js$/.test(specifier) && context.parentURL && /\/src\/data\/maps\/[^/]+\.js/.test(context.parentURL)) {
      const spec = specFor(context.parentURL);
      if (spec != null) return { url: `data:text/javascript,${encodeURIComponent(stubSource(spec))}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

/** Import a map module in the state `spec` describes (the query makes each variant its own module instance). */
export async function loadMapAs(id, spec) {
  const file = path.join(NEXT, 'src', 'data', 'maps', `${id}.js`);
  const m = await import(`${pathToFileURL(file).href}?x1=${encodeURIComponent(spec)}`);
  return m.default;
}
