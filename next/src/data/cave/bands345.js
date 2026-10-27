// Bands three to five of the Deep Stacks (C2-sprites-boss): the Court Below (B40 to B59), the Ember Shelves (B60 to B79)
// and the Forge of Names (B80 to B99), registered into the floor generator through gen.js registerBand(). The integrator
// imports this module once (`import './bands345.js'`), before the first generateFloor() of a floor past B39; until then
// those bands borrow the Root Cellars kit (gen.js BANDS, `borrowed: true`).
//
// The prefab parser (prefabs.js) knows props and oversized overlays by two tables, PROPS and OVERLAY_SIZE; the new kits'
// objects are added to them here BY MUTATION (the X1 pattern, no edit to prefabs.js). Every footprint agrees with
// tiles.json (qa/cave/art_bands.test.mjs proves it against mapcheck objectCells).
import { PROPS, OVERLAY_SIZE } from './prefabs.js';
import { registerBand, BANDS } from './gen.js';
import { COURT, COURT_LEGEND, COURT_LANDING } from './prefabs_b3.js';
import { EMBER, EMBER_LEGEND, EMBER_LANDING } from './prefabs_b4.js';
import { FORGE, FORGE_LEGEND, FORGE_LANDING } from './prefabs_b5.js';

/** Prop footprints [w, h] (h rows up from the anchor row) for the Court, Ember and Forge kits, as tiles.json has them. */
export const PROPS_345 = {
  // court.png
  glass_bench: [2, 1], mirror_stand: [1, 1], mirror_heavy: [1, 1], beam_lens: [1, 1], throne_glass: [2, 1], receptor: [1, 1],
  // ember.png
  ember_pit: [1, 1], lamp_ember: [1, 1], carters_fire: [1, 1], charred_stump: [1, 1], bench_iron: [2, 1], coolant_station: [2, 1],
  proclamation_board: [2, 1], memorial: [4, 1], sand_milestone: [1, 1],
  // forge.png
  ore_crate: [1, 1], tool_rack: [2, 1], bellows_decor: [2, 1], anvil_oath: [1, 1], ledger_burned: [1, 1], basin: [1, 1],
  spout_cistern: [1, 1], waterwheel: [2, 1], sluice: [1, 1], pipes_v: [1, 1], pipes_valve: [1, 1], furnace_mouth: [2, 1], fan_great: [3, 3],
};
/** Overlay sizes in cells for the new face art (everything else is 1x1). */
export const OVERLAY_SIZE_345 = {
  mirror_wall: [1, 2], glass_pane_cracked: [1, 2], portrait_blank: [2, 2], portrait_blank_2: [2, 2], portrait_blank_3: [2, 2], portrait_keeper_empty: [2, 2],
};
for (const [k, v] of Object.entries(PROPS_345)) if (!PROPS[k]) PROPS[k] = v;
for (const [k, v] of Object.entries(OVERLAY_SIZE_345)) if (!OVERLAY_SIZE[k]) OVERLAY_SIZE[k] = v;

/** Band definitions as registerBand takes them (music, lighting, tileset and backdrop stay as gen.js set them). */
export const BANDS345 = {
  court: { prefabs: COURT, legend: COURT_LEGEND, under: 'gallery_floor', landing: COURT_LANDING, lighting: { tint: 'none', dark: 0.3 } },
  ember: { prefabs: EMBER, legend: EMBER_LEGEND, under: 'ash_floor', landing: EMBER_LANDING, lighting: { tint: 'none', dark: 0.4 } },
  forge: { prefabs: FORGE, legend: FORGE_LEGEND, under: 'crucible_floor', landing: FORGE_LANDING, lighting: { tint: 'none', dark: 0.45 } },
};

let done = false;
/** Register the three bands. Idempotent (module load does it once; a second call is a no-op). */
export function register() {
  if (done) return BANDS;
  for (const [id, def] of Object.entries(BANDS345)) registerBand(id, def);
  done = true;
  return BANDS;
}
register();
export default register;
