// The Deep Stacks: the glue (docs/DEEP_STACKS_PLAN.md sections 2, 4, 7, 8, 9; docs/briefs/C2-world.md). Written by C2-world.
// A pack file (src/data/cave/, never precached): the base game reaches it only through the hooks `bindWorld(engine)` hangs
// on `engine.cave`, and through the maps it registers. Everything that is a rule lives in src/game/cave.js (C1-state), the
// generator in gen.js (C1-gen), the data in foes.js / loot.js / items.js (C1-data); this file only wires them to the field,
// the battle, the menu and the saves.
//
//   register()                      the pack entry calls it (index.js ORDER): loads text.js / story.js / bands345.js / the two
//                                   hand-made maps behind guards, registers the entrance hall (a fallback hall when
//                                   maps/cave_landing0.js is not there yet), the fallback scenes and plaque lines for every id
//                                   story.js / text.js did not define, the on-demand map provider, and binds the engine
//                                   (globalThis.LQ_ENGINE in a browser; Node tests call bindWorld themselves).
//   beginReading(engine, game, o)   cave.enter, prepare B1 and B2, warp to B1's arrival, the suspend save. { ok, seed, floor }
//   endReading(engine, game, how)   how: bank | die | quit | clear. The matching cave.* call FIRST (it restores the party), the
//                                   suspend save removed, game.cave.lastExit set, the scenes above the field popped, the card,
//                                   the warp to the hall and the `stacks_return` scene.
//   prepareFloor(game, n)           registerMap(generateFloor(seed, n, ...)) for n and n + 1 (B100 is the hand-made map), with
//                                   the floor's encounters registered, the pity rule's blue chest and the plaque line.
//   resumeReading(engine, game?)    the title's "Resume the Deep Stacks (B23)": the suspend save deserialized (when `game` is
//                                   not given), the floor regenerated from (seed, floor), the field reset at its arrival.
//   bindWorld(engine)               engine.cave = the hooks (HOOKS below: every base seam is one guarded call into them, so the
//                                   precached files carry no Stacks logic) and the LQ_DEBUG surface.
//   installTrapdoor(libraryModule)  the trapdoor events into the library map (register() does it; library.js is untouched).
//
// Determinism: a floor is a pure function of (run seed, floor, the vault at run start); a chest's contents of
// (run seed, floor, chest id) plus the party's state when it is opened (worn props, the Bookmark held); the pity rule is
// decided per run up front (blueFloors), so a reload can never move or reroll a chest.
//
// Fallbacks (removed by the other agents' files, never edited here): STACKS_TEXT and PLAQUES (text.js, C2-story-ui), the
// scenes stacks_locked / stacks_intro / stacks_enter / stacks_return / stacks_no_save / binder_intro / binder_cleared
// (story.js, C2-story-ui; the dispatcher stacks_archivist is this file's own and only exists while story.js is absent),
// the entrance hall and B100 (maps/cave_landing0.js, maps/cave_b100.js, C2-sprites-boss), bands345.js (C2-sprites-boss).

import { registerMap, peekMap, loadMap } from '../../world/maps.js';
import { drawWindow } from '../../ui/window.js';
import { KEY_ITEMS } from '../items.js';
import { generateFloor, arrivalOf, B100_ARRIVAL, BANDS, CaveGenError, registerBand } from './gen.js';
import { floorEncounters, registerFloorEncounters, isLanding, BOSS_FLOOR, BINDER_ENCOUNTER_ID } from './foes.js';
import { setLootFloor, rollRedChest, rollBlueChest, blueChestDue, LEND_FLOORS } from './loot.js';
import { wornProps, KEEPERS_BOOKMARK_ID, KEEPERS_BOOKMARK, BINDER_QUILL_ID } from './items.js';
import { LANDINGS, parseLanding } from './landing.js';
import { wallDepth, stairs as stairsEv, light as lightEv, sign as signEv, trigger as triggerEv, enemy as enemyEv } from '../maps/_kit.js';
import * as CAVE from '../../game/cave.js';
import { createRng, hashSeed } from '../../core/rng.js';
import { serialize, deserialize, findGear, hasFlag } from '../../game/state.js';
import { weaponTypes, optimize } from '../../game/inventory.js';
import { sceneById, registerStory, LINES } from '../../game/story.js';
import { ENCOUNTERS } from '../encounters.js';
import { mergeAtlasInto } from '../../core/assets.js';
import { ensurePack, onPackReady } from '../../game/packs.js';

export const HALL_ID = 'cave_landing0';
export const B100_ID = 'cave_b100';
export const TRAPDOOR_MARK = 'stacks_trapdoor';
/** The Keepers' trapdoor: the library's mezzanine back wall, the cell the hall's stairs_up names (cave_landing0.js LIBRARY_TRAPDOOR). */
export const TRAPDOOR = [16, 4];
/** Where the hall's stairs_up lands in the library: on the trapdoor. */
export const LIBRARY_RETURN = ['library', TRAPDOOR[0], TRAPDOOR[1], 'down'];
/** The hall's arrival from the trapdoor (cave_landing0.js HALL_ARRIVAL, its `start`). */
export const HALL_ARRIVAL = [5, 5];
/** The B100 map's fight trigger names this scene (cave_b100.js BINDER_SCENE); the fallback below runs the Binder's fight. */
export const BINDER_SCENE = 'cave_binder';
export const MOVE_PLUS = 1.15;                 // cave_move_plus: walk and run 15% faster inside a run
export const CHEST_TIERS_CAVE = ['red', 'blue'];
/** The Catalogue's track (gen.js BANDS keeps 'archive'; register() swaps it): the Orrery's celesta, an existing Episode 1 piece. */
export const CATALOGUE_MUSIC = 'orrery';

// ---------------------------------------------------------------- text (text.js wins; one plain line each here)
const FALLBACK_TEXT = {
  close: 'The Stacks close.',
  bank: 'The book closes where you stand.',
  quit_ask: 'Leave the Stacks? This reading ends here.',
  quit_yes: 'Leave', quit_no: 'Stay',
  bank_ask: 'Close the book here?', bank_yes: 'Close it', bank_no: 'Not yet',
  save_refused: 'The Stacks keep their own pages.',
  floor_tag: 'B{n}',
  bookmark_outside: 'The Bookmark marks nothing here.',
  stair_wait: 'The stair waits. A reading begins with the Archivist.',
  rise: '{name} rises!',
  stair_stuck: 'The stair goes down into nothing. A Bookmark still closes the book; the menu still leaves.',
  bookmark_desc: "Closes the book where you stand, and keeps this reading's blue finds.",
  vault_ask: 'The vault came down with you. Put it on?', vault_yes: 'Put it on', vault_no: 'Later',
  vault_worn: 'Wearing {n} from the vault.',
};
const FALLBACK_PLAQUES = {
  plaque_hall: 'THE DEEP STACKS. What the Book could not file, it kept here.',
  plaque_b10: 'B10. The first landing. Nothing below this line was ever catalogued.',
  plaque_b20: 'B20. The roots came up through the floor and the Keepers let them.',
  plaque_b30: 'B30. Every shelf here was shelved twice. Neither order was kept.',
  plaque_b40: 'B40. A court sat under the library once. It kept no record of itself.',
  plaque_b50: 'B50. Halfway. The Keepers who read this far stopped writing their names.',
  plaque_b60: 'B60. The shelves are warm. Something below is still reading.',
  plaque_b70: 'B70. Ash on every page. The words are still there under it.',
  plaque_b80: 'B80. The forge made names. The forge also unmade them.',
  plaque_b90: 'B90. The last landing. Below is the one who bound the book.',
};

const mods = { text: null, story: null, bands345: null, hall: null, b100: null };
let TEXT = null;
let bound = null;              // the engine bindWorld was given
let registered = null;         // register()'s promise
let artInstalled = false;

export function textOf(key) {
  const t = TEXT && TEXT.STACKS_TEXT && TEXT.STACKS_TEXT[key];
  return (typeof t === 'string' && t) || FALLBACK_TEXT[key] || key;
}
export function floorTagOf(n) { return textOf('floor_tag').replace('{n}', String(n)); }
/** The plaque line id of a landing floor (text.js PLAQUES keys; the fallback lines above when it is absent). */
export function plaqueId(floor) { return floor === 0 ? 'plaque_hall' : `plaque_b${floor}`; }

// ---------------------------------------------------------------- engine lookups
export function engineOf(engine) { return engine || bound || (typeof globalThis !== 'undefined' ? globalThis.LQ_ENGINE : null) || null; }
function gameOf(engine, game) { return game || (engineOf(engine) && engineOf(engine).game) || null; }
/** The live field scene (anywhere in the stack), or null. */
export function fieldOf(engine) {
  const e = engineOf(engine);
  if (!e || !Array.isArray(e.scenes)) return null;
  for (let i = e.scenes.length - 1; i >= 0; i--) { const s = e.scenes[i]; if (s && s.name === 'field' && !s.dead) return s; }
  return null;
}
/** Pop every scene above the field (the menu, a screen, a choice). Returns the number popped. */
export function popToField(engine) {
  const e = engineOf(engine);
  let n = 0;
  for (let guard = 0; guard < 12 && e && e.scene && e.scene.name !== 'field' && e.scenes.length > 1; guard++) {
    const s = e.scene;
    if (typeof s.close === 'function' && !s.closing && s.name === 'menu') s.close(); else e.pop();
    n++;
  }
  return n;
}
async function waitFrames(engine, n) { const e = engineOf(engine); if (e && typeof e.waitFrames === 'function') await e.waitFrames(n); }
/** Until the field is on top and quiet (no warp, no scene, no lock), at most `max` frames. */
async function untilFieldIdle(engine, max = 600) {
  const e = engineOf(engine);
  for (let i = 0; i < max; i++) {
    const f = fieldOf(e);
    if (f && !f.loading && !f.pendingWarp && !(f.cutscene && f.cutscene.running) && e.scene === f && !e.transition && !f.inputLocked) return f;
    await waitFrames(e, 1);
  }
  return fieldOf(e);
}

// ---------------------------------------------------------------- the pity rule, chest rng, floors
const blueMemo = new Map();
/** The floors of a run that carry a blue chest: the pity rule (loot.js blueChestDue) decided up front from the seed and the vault at run start. */
export function blueFloors(seed, vault = []) {
  const key = `${seed >>> 0}:${(vault || []).slice().sort().join(',')}`;
  if (blueMemo.has(key)) return blueMemo.get(key);
  const out = new Set();
  let last = 0;
  for (let f = 1; f < BOSS_FLOOR; f++) {
    const rng = createRng(hashSeed(`cave:${seed >>> 0}:${f}:blue`));
    if (blueChestDue(rng, f, last, vault)) { out.add(f); last = f; }
  }
  blueMemo.set(key, out);
  return out;
}
/** The rng of one chest: (run seed, floor, chest id), so a reload cannot reroll it. */
export function chestRng(seed, floor, chestId) { return createRng(hashSeed(`cave:${seed >>> 0}:${floor}:${chestId}`)); }
export function floorOfMapId(id) { const m = /^cave_b(\d+)$/.exec(String(id || '')); return m ? Number(m[1]) : 0; }

/** B100's arrival cell: the hand-made map's `arrival` mark, else the generator's expectation. */
export function b100Arrival() {
  const m = peekMap(B100_ID);
  const a = m && m.marks && m.marks.arrival;
  return Array.isArray(a) ? [a[0], a[1]] : B100_ARRIVAL.slice();
}

/**
 * Generate (and register the encounters of) one floor 1..99 for a run. Pure apart from the ENCOUNTERS registration. `genSeed`
 * (default the run seed) is the generator's seed: a floor the generator refuses is built once more from a derived one
 * (floorSeedAgain, C4-fixes, CRITIQUE_STACKS 1); the foes and the blue chest stay the run's.
 */
export function buildFloor(seed, floor, vault = [], genSeed = seed) {
  const specs = floorEncounters(seed, floor);
  registerFloorEncounters(specs);
  const pool = specs.map((s) => ({ enc: s.id, sprite: s.leader, move: s.move || null }));
  const blue = blueFloors(seed, vault).has(floor);
  return generateFloor(genSeed >>> 0, floor, {
    foes: () => (pool.length ? pool : null),
    chests: { red: 'auto', blue },
    plaque: (f) => plaqueId(f),
    nextArrival: (f) => (f >= 99 ? b100Arrival() : null),
  });
}

/** The generator's second seed for a (run seed, floor) it refused (deterministic, so a resume rebuilds the same floor). */
export function floorSeedAgain(seed, floor) { return hashSeed(`cave:${seed >>> 0}:${floor}:again`); }
/** buildFloor, and once more from floorSeedAgain when the generator refuses; a second refusal throws the CaveGenError. */
export function buildFloorSafe(seed, floor, vault = []) {
  try { return buildFloor(seed, floor, vault); }
  catch (err) {
    if (!(err instanceof CaveGenError)) throw err;
    console.warn(`[cave] floor ${floor} of reading ${seed >>> 0} refused (${err.message}); built from its second seed`);
    const mod = buildFloor(seed, floor, vault, floorSeedAgain(seed, floor));
    mod.runSeed = seed >>> 0; mod.again = true;
    return mod;
  }
}

/**
 * Make floor n and n + 1 of the current run loadable: generated, registered (registerMap) with their encounters; B100 is the
 * hand-made map (a placeholder when it has not landed). A floor already registered for this seed is kept (its encounters are
 * re-registered, a no-op). Floor n refused twice throws the CaveGenError (the stair catches it); n + 1 refused is skipped (its own
 * stair tries again). Returns the modules.
 */
export function prepareFloor(game, n, o = {}) {
  const c = CAVE.ensureCave(game);
  if (!c.run) throw new Error('prepareFloor: no reading in progress');
  const seed = c.run.seed, vault = CAVE.vaultIds(game);
  const out = [];
  for (const f of [n, n + 1]) {
    if (!Number.isInteger(f) || f < 1 || f > BOSS_FLOOR) continue;
    if (f === BOSS_FLOOR) { out.push(ensureB100()); continue; }
    const id = `cave_b${f}`;
    const have = peekMap(id);
    if (have && (have.runSeed != null ? have.runSeed : have.seed) === seed && !o.force) { registerFloorEncounters(floorEncounters(seed, f)); out.push(have); continue; }
    let mod;
    try { mod = buildFloorSafe(seed, f, vault); }
    catch (err) { if (f === n || !(err instanceof CaveGenError)) throw err; continue; }
    registerMap(mod);
    out.push(mod);
  }
  return out;
}
/** Where a floor of the run is entered: the registered module's arrival mark (a second-seed floor has its own), else the generator's. */
export function floorArrival(seed, floor) {
  if (floor >= BOSS_FLOOR) return b100Arrival();
  const m = peekMap(`cave_b${floor}`);
  const a = m && m.marks && m.marks.arrival;
  return Array.isArray(a) ? [a[0], a[1]] : arrivalOf(seed, floor);
}

// ---------------------------------------------------------------- the entrance hall and B100 (fallbacks)
/** The hall under the library, built from the catalogue landing template when maps/cave_landing0.js is absent. */
export function buildHallFallback() {
  const band = BANDS.catalogue;
  const t = parseLanding(LANDINGS[band.landing]);
  const ground = wallDepth(t.rows);
  const [ax, ay] = t.marks.arrival, [sx, sy] = t.marks.stairs, [px, py] = t.marks.plaque;
  const overlays = t.decals.map(([tt, x, y]) => ({ t: tt, x, y }));
  for (const [tt, x, y] of t.face) overlays.push({ t: tt, x, y });
  const decor = t.decor.map(([tt, x, y]) => ({ t: tt, x, y }));
  decor.push({ t: 'stairs_up', x: ax, y: ay - 1 }, { t: 'stairs_down', x: sx, y: sy - 1 });
  const overhead = t.overhead.map(([tt, x, y]) => ({ t: tt, x, y }));
  // the lectern at (12, 7) of the catalogue template is the Archivist's stand; the dispatcher trigger sits on it
  const lectern = t.decor.find(([tt]) => tt === 'lectern');
  const archivist = lectern ? [lectern[1], lectern[2]] : [px, py + 2];
  const events = [
    stairsEv('stairs_up', ax, ay - 1, LIBRARY_RETURN.slice()),
    stairsEv('stairs_down', sx, sy - 1, ['cave_b1', 0, 0, 'down']),   // the x, y are replaced by the run's arrival (HOOKS.beforeDoor)
    signEv('plaque', px, py - 1, plaqueId(0), { solid: false }),
  ];
  let n = 0;
  for (const [x, y, r, color] of t.lights) events.push(lightEv(`light_${n++}`, x, y, r, color));
  events.push(lightEv(`light_${n++}`, ax, ay, 3, '#ffe6b0'), lightEv(`light_${n++}`, sx, sy, 3, '#ffe6b0'));
  return {
    id: HALL_ID, name: 'The Deep Stacks', area: 'dungeon', floor: 0, band: band.id, landing: true, hall: true, fallback: true,
    music: band.music, ambience: band.ambience, tileset: band.tileset, backdrop: band.backdrop,
    lighting: { tint: 'none', dark: 0.1 }, under: band.under,
    legend: { ...band.legend }, ground, overlays, decor, overhead, events, exits: [],
    marks: { arrival: [ax, ay], return: [ax, ay + 1], stairs: [sx, sy], plaque: [px, py], archivist },
    start: { x: ax, y: ay, dir: 'down' },
    rooms: [], links: [],
  };
}

/** A bare B100 for tests only: one hall, the Binder standing guard, the arrival at the generator's cell. */
export function buildB100Placeholder() {
  const W = 26, H = 24;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) r += (y >= 3 && y <= 4 && x >= 3 && x <= 22) ? '|' : (y >= 5 && y <= 20 && x >= 3 && x <= 22) ? '.' : '#';
    rows.push(r);
  }
  const band = BANDS.forge || BANDS.catalogue;
  const legend = { ...band.legend };
  const [ax, ay] = B100_ARRIVAL;
  const events = [
    enemyEv('binder', 12, 8, 'archivore', BINDER_ENCOUNTER_ID, 'guard'),
    lightEv('light_0', 12, 8, 5, '#ffb070'), lightEv('light_1', ax, ay, 3, '#ffe6b0'),
  ];
  return {
    id: B100_ID, name: 'The Binding, B100', area: 'dungeon', floor: BOSS_FLOOR, band: band.id, landing: false, boss: true, placeholder: true,
    music: band.music, ambience: band.ambience, tileset: band.tileset, backdrop: band.backdrop, lighting: { ...band.lighting },
    under: band.under, legend, ground: wallDepth(rows), overlays: [], decor: [{ t: 'stairs_up', x: ax, y: ay - 1 }], overhead: [], events, exits: [],
    marks: { arrival: [ax, ay], binder: [12, 8], quill_chest: [12, 6] }, start: { x: ax, y: ay, dir: 'up' }, rooms: [], links: [],
  };
}

/**
 * The trapdoor into the library map module (library.js stays byte-identical: the pack adds the events when it registers, so nothing
 * of the Stacks is in the precache). A sealed hatch with its line before ep1_complete, the open stair down to the hall after.
 * Idempotent; returns true when the events were added now.
 */
export function installTrapdoor(mod) {
  if (!mod || !Array.isArray(mod.events) || mod.events.some((e) => e && e.id === TRAPDOOR_MARK)) return false;
  const [x, y] = TRAPDOOR;
  mod.events.push(
    { id: 'stacks_trapdoor_locked', type: 'object', x, y, sprite: 'trapdoor', state: 0, script: 'stacks_locked', ifNot: 'ep1_complete' },
    stairsEv(TRAPDOOR_MARK, x, y, [HALL_ID, HALL_ARRIVAL[0], HALL_ARRIVAL[1], 'down'], { if: 'ep1_complete', sprite: 'trapdoor', state: 1 }),
  );
  mod.marks = { ...(mod.marks || {}), [TRAPDOOR_MARK]: [x, y] };
  return true;
}

function ensureHall() {
  const have = peekMap(HALL_ID);
  if (have) return have;
  const mod = (mods.hall && (mods.hall.default || mods.hall.map)) || buildHallFallback();
  if (!mod.id) mod.id = HALL_ID;
  registerMap(mod);
  return mod;
}
/** Where B100's plaque hangs: the antechamber's north face beside the stair the party came down (read from the cell below). */
export const B100_PLAQUE = [13, 17];
/**
 * The B100 module as the reading wants it (C4-fixes, CRITIQUE_STACKS 17 and DEEP_STACKS_BALANCE 7.10; cave_b100.js is untouched):
 * the Quill's chest goes (game/cave.js clear puts the Quill in the vault, and the warp out left the chest unopenable), and the
 * plaque_b100 sign hangs in the antechamber. Idempotent; true when something changed.
 */
export function installB100(mod) {
  if (!mod || !Array.isArray(mod.events)) return false;
  let changed = false;
  const i = mod.events.findIndex((e) => e && e.id === 'quill_chest');
  if (i >= 0) { mod.events.splice(i, 1); changed = true; }
  if (!mod.placeholder && !mod.events.some((e) => e && e.id === 'plaque')) {
    mod.events.push(signEv('plaque', B100_PLAQUE[0], B100_PLAQUE[1], plaqueId(BOSS_FLOOR), { solid: false, sprite: 'plaque' }));
    mod.marks = { ...(mod.marks || {}), plaque: [B100_PLAQUE[0], B100_PLAQUE[1] + 1] };
    changed = true;
  }
  return changed;
}
function ensureB100() {
  const have = peekMap(B100_ID);
  if (have) return have;
  const mod = (mods.b100 && (mods.b100.default || mods.b100.map)) || buildB100Placeholder();
  if (!mod.id) mod.id = B100_ID;
  installB100(mod);
  registerMap(mod);
  return mod;
}
/**
 * While story.js is absent, the hall gets this file's dispatcher (a confirm starts the talk) on the cell the party faces from
 * `party_stop` toward the Archivist's mark (the desk between them, in the hand-made hall), else on the Archivist's mark itself.
 */
function ensureArchivistFallback(mod) {
  if (mods.story || !mod || !mod.marks || !Array.isArray(mod.marks.archivist)) return false;
  if ((mod.events || []).some((e) => e && e.id === 'archivist_fallback')) return false;
  const [ax, ay] = mod.marks.archivist;
  let x = ax, y = ay;
  const stop = Array.isArray(mod.marks.party_stop) ? mod.marks.party_stop : null;
  if (stop && (stop[0] !== ax || stop[1] !== ay)) { x = stop[0] + Math.sign(ax - stop[0]); y = stop[1] + Math.sign(ay - stop[1]); }
  if ((mod.events || []).some((e) => e && e.type !== 'light' && e.x === x && e.y === y)) return false;
  mod.events.push(triggerEv('archivist_fallback', x, y, 1, 1, 'stacks_archivist', { on: 'interact' }));
  return true;
}

// ---------------------------------------------------------------- fallback scenes (the ep1.js shape; story.js wins)
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
async function allowed(s, cond) {
  if (!cond) return true;
  for (const f of toList(cond.if)) if (!(await s.hasFlag(f))) return false;
  for (const f of toList(cond.ifNot)) if (await s.hasFlag(f)) return false;
  return true;
}
const cut = (fn, cond) => async (s) => {
  if (!(await allowed(s, cond))) return;
  await s.lockInput();
  try { await fn(s); } finally { await s.unlockInput(); }
};
export const FALLBACK_CONDITIONS = {
  stacks_locked: { ifNot: 'ep1_complete' }, stacks_intro: { ifNot: 'deep_stacks_open' }, stacks_enter: { if: 'deep_stacks_open' },
  stacks_return: {}, stacks_no_save: {}, binder_intro: {}, binder_cleared: {}, stacks_archivist: {}, [BINDER_SCENE]: { ifNot: 'deep_stacks_cleared' },
};
async function introLines(s) {
  await s.say(null, 'Below this hall the Stacks go down a hundred floors. Nobody catalogued them.');
  await s.say(null, 'Whoever goes down starts at the first page: level one, empty hands.');
  await s.say(null, "Red chests lend. Blue chests give. The Keeper's Bookmark is the one way out.");
  await s.setFlag('deep_stacks_open');
}
async function offerLines(s) {
  await s.say(null, 'Begin a reading?');
  const c = await s.choice(['Begin', 'Not yet']);
  if (c === 0) await beginReading(null, null, {});
}
const RAW_SCENES = {
  stacks_locked: async (s) => { await s.say(null, 'A trapdoor, sealed by the Keepers. It does not move.'); },
  stacks_intro: introLines,
  stacks_enter: offerLines,
  stacks_archivist: async (s) => { if (!(await s.hasFlag('deep_stacks_open'))) await introLines(s); await offerLines(s); },
  stacks_return: async (s) => {
    const g = gameOf();
    const x = g && g.cave && g.cave.lastExit;
    const how = x ? x.how : 'bank';
    const n = x && Array.isArray(x.blues) ? x.blues.length : 0;
    const line = how === 'clear' ? 'The Binder is bound. The Stacks stay open for what is left.'
      : how === 'bank' ? (n ? `${n} kept. The Stacks noticed.` : 'The book is closed. Nothing new is kept.')
        : how === 'quit' ? 'You left the Stacks. That reading is lost.' : 'The Stacks close. You woke here.';
    await s.say(null, line);
  },
  stacks_no_save: async (s) => { await s.say(null, textOf('save_refused')); },
  binder_intro: async (s) => { await s.say(null, 'The last shelf. Something is bound to it, and it is reading you.'); },
  binder_cleared: async (s) => { await s.say(null, 'The Binder comes apart. One quill is left on the shelf.'); },
  // B100's step trigger (cave_b100.js binder_trig): the intro, then the fight; the win sets deep_stacks_cleared (the encounter's flag)
  // and the field's afterBattle hook closes the reading (binder_cleared, then endReading('clear'))
  [BINDER_SCENE]: async (s) => {
    const intro = sceneById('binder_intro');           // story.js's when it has one, else this file's (registered before this runs)
    if (intro) await intro(s);
    const r = await s.battle(BINDER_ENCOUNTER_ID, { boss: true, canFlee: false });
    if (r === 'win') await s.despawn('cave_binder');
  },
};
/** Register the fallback scenes and plaque lines for every id nothing else defined. Returns the ids added. */
export function registerFallbackStory() {
  const scenes = {}, conditions = {}, lines = {};
  for (const [id, fn] of Object.entries(RAW_SCENES)) if (!sceneById(id)) { scenes[id] = cut(fn, FALLBACK_CONDITIONS[id]); conditions[id] = FALLBACK_CONDITIONS[id]; }
  const plaques = (TEXT && TEXT.PLAQUES && typeof TEXT.PLAQUES === 'object') ? TEXT.PLAQUES : {};
  for (const [id, text] of Object.entries({ ...FALLBACK_PLAQUES, ...plaques })) if (!(id in LINES)) lines[id] = text;
  registerStory({ scenes, lines, conditions });
  return { scenes: Object.keys(scenes), lines: Object.keys(lines) };
}

// ---------------------------------------------------------------- art: the pack's props into the props atlas
/**
 * The chest, plaque and trapdoor sprites live in the pack atlas `cave_props` (C2-sprites-boss). `props` is not one of the
 * loader's merge bases, so the objects are merged here into the props atlas the tile map draws from (frames shifted down by
 * the base image's height, the way mergeAtlasInto stacks the images). Idempotent; false without a DOM or the atlas.
 */
export function installCaveArt(engine) {
  const e = engineOf(engine);
  const A = e && e.assets;
  if (!A || typeof A.has !== 'function' || !A.has('cave_props') || !A.has('props')) return false;
  const base = A.atlas('props'), extra = A.atlas('cave_props');
  if (!base || !extra || base.placeholder || extra.placeholder) return false;
  if (base.mergedIds && base.mergedIds.has('cave_props')) { artInstalled = true; return true; }
  const bi = base.image;
  const yoff = bi ? (bi.naturalHeight || bi.height || 0) : 0;
  const shift = (f) => (Array.isArray(f) ? [f[0], f[1] + yoff, f[2], f[3]] : f);
  const objects = {};
  for (const [id, o] of Object.entries((extra.meta && extra.meta.objects) || {})) objects[id] = { ...o, frame: shift(o.frame), frames: (o.frames || []).map(shift) };
  const r = mergeAtlasInto(base, { id: 'cave_props', image: extra.image, frames: extra.frames || {}, anims: {}, meta: { objects } });
  artInstalled = !!r && !r.failed;
  return artInstalled;
}

// ---------------------------------------------------------------- saves
/**
 * The suspend save is honest about the floor (C4-fixes, CRITIQUE_STACKS 3): besides the arrival it is written at every battle start
 * with `run.inBattle` (the foe's event id, its encounter, where the leader stood) and after every fight, and it carries
 * `run.gone` (this floor's beaten foes), so a Resume restarts an interrupted fight from its start and never brings a beaten foe back.
 * Both ride on game.cave.run (serialized with it; game/cave.js clears the run on every exit). `inBattle` lives only in the file:
 * the live game drops it as soon as the save is written.
 */
function syncGone(field, game, extra = null) {
  const c = game && game.cave;
  if (!c || !c.run) return;
  const floor = CAVE.floorOf(game);
  const ids = field && field.dungeonGone && field.mapId === `cave_b${floor}` ? [...(field.dungeonGone.get(field.mapId) || [])] : [];
  if (extra && !ids.includes(extra)) ids.push(extra);
  c.run.gone = { floor, ids };
}
function writeSuspend(engine, game, o = {}) {
  const e = engineOf(engine);
  if (!e || !e.save || !CAVE.inRun(game)) return false;
  const f = fieldOf(e);
  if (f && f.game === game) syncGone(f, game, o.won || null);
  if (o.inBattle) game.cave.run.inBattle = o.inBattle;
  try { return !!e.save.save(CAVE.SUSPEND_SLOT, serialize(game), CAVE.suspendMeta(game)); } catch (err) { console.warn('[cave] suspend save failed', err && err.message); return false; }
  finally { delete game.cave.run.inBattle; }
}
/** A reading waits in the suspend slot (Hollis asks before a new one would write over it, CRITIQUE_STACKS 12). */
export function suspendOpen(engine) {
  const e = engineOf(engine);
  try { return !!(e && e.save && e.save.exists(CAVE.SUSPEND_SLOT)); } catch (err) { return false; }
}
/** The foe the field is fighting right now (touchEnemy marks it), or null. */
function fightingFoe(field) {
  if (!field || !field.entities) return null;
  for (const ent of field.entities.values()) if (ent.type === 'enemy' && ent.actor && ent.actor.data && ent.actor.data.fighting) return ent;
  return null;
}
function removeSuspend(engine) {
  const e = engineOf(engine);
  try { if (e && e.save) e.save.remove(CAVE.SUSPEND_SLOT); } catch (err) { /* a storage that refuses is not fatal */ }
}

// ---------------------------------------------------------------- entry, exit, resume
/** Start a reading: cave.enter, B1 and B2 prepared, the warp to B1's arrival (or a field reset), the suspend save. */
export async function beginReading(engine, game, opts = {}) {
  const e = engineOf(engine);
  const g = gameOf(e, game);
  if (!g) return { ok: false, why: 'no_game' };
  const can = CAVE.canEnter(g);
  if (!can.ok) return { ok: false, why: can.why };
  installCaveArt(e);
  const r = CAVE.enter(g, { seed: opts.seed, playtime: g.playtime });
  if (!r) return { ok: false, why: 'refused' };
  setLootFloor(1);
  prepareFloor(g, 1);
  const [ax, ay] = floorArrival(r.seed, 1);
  const field = fieldOf(e);
  // C3-sim-bot's find: the field remembers defeated foes per map id for its whole life, and every reading reuses cave_bN, so a
  // second reading in one sitting found its cleared floors empty (no foes, no EXP). A new reading forgets them; resumeReading
  // resets the field and needs nothing.
  if (field && field.dungeonGone) for (const k of [...field.dungeonGone.keys()]) if (/^cave_b\d+$/.test(k)) field.dungeonGone.delete(k);
  if (field && opts.warp !== false) await field.warpTo('cave_b1', ax, ay, 'down', 'stairs');
  else if (e && typeof e.reset === 'function' && opts.warp !== false) e.reset('field', { map: 'cave_b1', x: ax, y: ay, dir: 'down' });
  writeSuspend(e, g);
  if (e && opts.warp !== false && typeof e.after === 'function') e.after(1, () => { vaultOffer(e, g); });
  return { ok: true, seed: r.seed, floor: 1, arrival: [ax, ay] };
}

/**
 * B1 of a reading that brought the vault down (CRITIQUE_STACKS 20: from the third reading a player walked B1 bare-handed beside
 * his own uniques): once the field is quiet, one question, then Optimize for every member (the bag holds nothing else on B1).
 * Resolves the number of pieces put on, or 0.
 */
export async function vaultOffer(engine, game) {
  const e = engineOf(engine);
  const g = gameOf(e, game);
  if (!g || !running(g) || CAVE.floorOf(g) !== 1) return 0;
  const vault = new Set(CAVE.vaultIds(g));
  if (!(g.gear || []).some((it) => vault.has(it.base))) return 0;
  const f = await untilFieldIdle(e, 900);
  if (!f || f.dead || !running(g) || CAVE.floorOf(g) !== 1) return 0;
  const i = await ask(e, textOf('vault_ask'), [textOf('vault_yes'), textOf('vault_no')]);
  if (i !== 0) return 0;
  let n = 0;
  for (const m of g.party) n += optimize(g, m) || 0;
  if (e.audio && e.audio.sfx) e.audio.sfx(n ? 'equip' : 'buzzer');
  if (n && e.toasts && e.toasts.show) await e.toasts.show({ text: textOf('vault_worn').replace('{n}', String(n)), icon: 'star', frames: 80 });
  return n;
}

/**
 * Close a reading. how: bank (the Bookmark) | die (a wipe) | quit (the menu) | clear (B100). The cave.* call runs first and
 * restores the party; then the suspend save goes, lastExit is set for the story scene, everything above the field is popped,
 * the card is shown (die, quit, bank), the party is warped to the hall and `stacks_return` plays. o.card: false skips the
 * card; o.warp: false leaves the scenes alone (tests). Returns the cave.* result, or { ok: false, why }.
 */
export async function endReading(engine, game, how, o = {}) {
  const e = engineOf(engine);
  const g = gameOf(e, game);
  if (!g || !CAVE.inRun(g)) return { ok: false, why: 'not_in_run' };
  const fn = { bank: CAVE.bank, die: CAVE.die, quit: CAVE.quit, clear: CAVE.clear }[how];
  if (!fn) throw new Error(`endReading: how must be bank | die | quit | clear, got ${how}`);
  const floor = CAVE.floorOf(g);
  const playtime = g.playtime;
  const r = fn(g, { playtime });
  if (!r || !r.ok) return r || { ok: false, why: 'refused' };
  removeSuspend(e);
  g.cave.lastExit = { how, floor, blues: Array.isArray(r.blues) ? r.blues.slice() : [], lost: Array.isArray(r.lost) ? r.lost.slice() : [], elapsed: r.elapsed || 0, at: playtime };
  if (o.warp === false || !e) return r;
  const field = fieldOf(e);
  if (field) field.lockInput();
  try {
    popToField(e);
    if (o.card !== false && how !== 'clear') await showCard(e, how === 'bank' ? textOf('bank') : textOf('close'));
    const hall = ensureHall();
    ensureArchivistFallback(hall);
    const at = landingSpot(hall);
    if (field && !field.dead) await field.warpTo(HALL_ID, at[0], at[1], 'down', 'stairs');
    else e.reset('field', { map: HALL_ID, x: at[0], y: at[1], dir: 'down' });
  } finally { if (field) field.unlockInput(); }
  const f2 = await untilFieldIdle(e, 300);
  if (f2 && !f2.dead && sceneById('stacks_return')) f2.runScene('stacks_return');
  return r;
}

/** Where the party stands after a reading: the hall's `return` mark, else `party_stop` (in front of the Archivist's desk), else south of `archivist`, else `start`. */
export function landingSpot(hall) {
  const m = (hall && hall.marks) || {};
  if (Array.isArray(m.return)) return [m.return[0], m.return[1]];
  if (Array.isArray(m.party_stop)) return [m.party_stop[0], m.party_stop[1]];
  if (Array.isArray(m.archivist)) return [m.archivist[0], m.archivist[1] + 1];
  const s = hall && hall.start;
  return s ? [s.x, s.y] : [1, 1];
}

async function showCard(engine, text) {
  const e = engineOf(engine);
  if (!e || !text) return;
  if (typeof e.hasScene === 'function' && e.hasScene('titleCard')) { await e.pushAwait('titleCard', { text, frames: 80, backdrop: false, bg: '#000000' }); return; }
  if (e.toasts && e.toasts.flash) await e.toasts.flash(text, { frames: 90 });
}

/** The title's Resume row: the suspend save (or the given game), the floor rebuilt from (seed, floor), the field at its arrival. */
export async function resumeReading(engine, game) {
  const e = engineOf(engine);
  let g = game || null;
  if (!g && e && e.save) {
    const env = e.save.loadEnvelope(CAVE.SUSPEND_SLOT);
    g = env ? deserialize(env.data) : null;
  }
  const info = g ? CAVE.resumeInfo(g) : null;
  if (!info) return { ok: false, why: 'no_run' };
  try { await ensurePack('cave'); } catch (err) { /* already loaded (we are running) or disabled */ }
  if (e) e.game = g;
  installCaveArt(e);
  setLootFloor(info.floor);
  prepareFloor(g, info.floor);
  const run = g.cave.run;
  const fight = run.inBattle && run.inBattle.floor === info.floor ? run.inBattle : null;
  delete run.inBattle;
  const gone = run.gone && run.gone.floor === info.floor && Array.isArray(run.gone.ids) ? run.gone.ids.slice() : [];
  const at = fight && Array.isArray(fight.pos) ? fight.pos.slice(0, 2) : floorArrival(info.seed, info.floor);
  const mapId = `cave_b${info.floor}`;
  if (e && typeof e.reset === 'function') {
    const f = e.reset('field', { map: mapId, x: at[0], y: at[1], dir: (fight && fight.pos && fight.pos[2]) || 'down' });
    // the field's enter is still loading the map: its beaten foes are known before any entity is placed
    if (f && f.dungeonGone && gone.length) f.dungeonGone.set(mapId, new Set(gone));
    if (fight) e.after(1, () => { restartFight(e, fight); });
  }
  return { ok: true, floor: info.floor, seed: info.seed, arrival: at, gone, fight: fight ? fight.foe : null };
}
/** A Resume from inside a fight: that foe's fight again from its start (full-HP foes, the party as the suspend kept it), through the field's own touch. */
async function restartFight(engine, fight) {
  const e = engineOf(engine);
  const f = await untilFieldIdle(e, 900);
  if (!f || f.dead) return false;
  const ent = f.entities && f.entities.get(fight.foe);
  if (!ent || !ent.present || !ent.actor || !f.leader) return false;
  // face each other, so the touch starts an ordinary fight (no preemptive strike for having closed the app)
  if (typeof f.leader.faceToward === 'function') f.leader.faceToward(ent.actor);
  if (typeof ent.actor.faceToward === 'function') ent.actor.faceToward(f.leader);
  await f.touchEnemy(ent.actor, 'player');
  return true;
}

// ---------------------------------------------------------------- the flows the seams call
/** A wipe inside the Stacks: never the game over scene. The black card, then endReading('die'). */
export async function wipeFlow(engine, game) {
  const e = engineOf(engine);
  const g = gameOf(e, game);
  if (!g || !CAVE.inRun(g)) return { ok: false, why: 'not_in_run' };
  return endReading(e, g, 'die');
}
/** The menu's Quit inside a run: one confirm, then endReading('quit'). Resolves true when the reading ended. */
export async function quitFlow(engine, game) {
  const e = engineOf(engine);
  const g = gameOf(e, game);
  if (!g || !CAVE.inRun(g)) return false;
  const i = await ask(e, textOf('quit_ask'), [textOf('quit_yes'), textOf('quit_no')]);
  if (i !== 0) return false;
  const r = await endReading(e, g, 'quit');
  return !!(r && r.ok);
}
/** The Bookmark used from the Items screen: refused outside a run; "Close the book here?" then endReading('bank'). */
export async function bookmarkFlow(engine, game) {
  const e = engineOf(engine);
  const g = gameOf(e, game);
  if (!g || !CAVE.inRun(g)) { await say(e, textOf('bookmark_outside')); return false; }
  if (!CAVE.hasBookmark(g)) return false;
  const i = await ask(e, textOf('bank_ask'), [textOf('bank_yes'), textOf('bank_no')]);
  if (i !== 0) return false;
  const r = await endReading(e, g, 'bank');
  return !!(r && r.ok);
}
/** Manual save refused inside a run (the menu's Save, a font's "Record your journey?"): the one line. */
export async function saveRefused(engine) {
  const e = engineOf(engine);
  if (e && e.audio && e.audio.sfx) e.audio.sfx('buzzer');
  await say(e, textOf('save_refused'));
}
async function say(engine, text) {
  const e = engineOf(engine);
  if (!e || !text) return;
  if (typeof e.hasScene === 'function' && e.hasScene('dialog')) { await e.pushAwait('dialog', { boxes: [{ who: null, text }] }); return; }
  if (e.toasts && e.toasts.flash) await e.toasts.flash(text, { frames: 90 });
}
async function ask(engine, text, options) {
  const e = engineOf(engine);
  if (!e) return -1;
  if (typeof e.hasScene === 'function' && e.hasScene('dialog')) {
    const r = await e.pushAwait('dialog', { who: null, text, choices: options, cancel: options.length - 1 });
    return typeof r === 'number' ? r : options.length - 1;
  }
  if (typeof e.hasScene === 'function' && e.hasScene('choice')) {
    const r = await e.pushAwait('choice', { options, x: e.renderer.W / 2, y: e.renderer.H / 2, anchor: 'center', cancel: options.length - 1 });
    return typeof r === 'number' ? r : options.length - 1;
  }
  return -1;
}

/** After the B100 win: binder_cleared (when a scene exists), then endReading('clear'). */
async function clearFlow(engine, game, field) {
  const e = engineOf(engine);
  const f = await untilFieldIdle(e, 900) || field;
  if (f && !f.dead && sceneById('binder_cleared')) { await f.runScene('binder_cleared'); await untilFieldIdle(e, 300); }
  const r = await endReading(e, game, 'clear');
  // the Quill, now the vault's, is offered once the hall's line is said (the field's pending-drop prompt, H6)
  const f2 = fieldOf(e), g = gameOf(e, game);
  const quill = g && (g.gear || []).find((it) => it && it.base === BINDER_QUILL_ID);
  if (r && r.ok && f2 && !f2.dead && quill && Array.isArray(f2.pendingDrops)) f2.pendingDrops.push(quill.uid);
  return r;
}

// ---------------------------------------------------------------- chests
function chestPoint(field, ent) {
  if (!field.camera || !field.camera.toScreen) return undefined;
  return field.camera.toScreen(ent.x * 16 + 8, ent.y * 16 + 14);
}
async function giveRed(field, roll, at) {
  const { engine: e, game: g } = field;
  if (roll.gold > 0) { g.gold += roll.gold; e.audio.sfx('coin'); if (e.toasts) await e.toasts.gold(roll.gold); }
  for (const c of roll.consumables || []) await field.giveItem(c.item, c.qty || 1);
  for (const inst of roll.items || []) {
    await field.giveGear(inst, { at });
    if (inst.rarity === 'rare') await field.bark('first_rare_drop');
    if (inst.rarity === 'legendary' || inst.rarity === 'set') await field.bark('first_legendary_drop');
  }
  if (roll.bookmark) await field.giveItem(KEEPERS_BOOKMARK_ID, 1);
}
/**
 * The party's side of a red chest's roll (world.js and tools/sim/cave.mjs open chests through this): the worn props, the landing,
 * the Bookmarks held, and on B1 to B3 the floor's first red chest lends a weapon of an empty-handed reader's own kind (C4-fixes,
 * CRITIQUE_STACKS 13: Bram walked B1 to B9 bare-handed). Marks the floor as lent-on (run.lentOn) when that first chest is opened.
 */
export function redChestOpts(g, floor, landing) {
  const c = CAVE.ensureCave(g);
  const opts = { props: wornProps(g.party), landing, holdsBookmark: CAVE.hasBookmark(g), bookmarks: CAVE.bookmarks(g) };
  const run = c.run;
  if (run && floor <= LEND_FLOORS && !landing) {
    if (!Array.isArray(run.lentOn)) run.lentOn = [];
    if (!run.lentOn.includes(floor)) {
      run.lentOn.push(floor);
      const bare = (g.party || []).find((m) => m.hp > 0 && !weaponTypes(m).some((w) => m.equip && m.equip[w]));
      if (bare) opts.lend = weaponTypes(bare).includes(bare.weapon) ? bare.weapon : weaponTypes(bare)[0];
    }
  }
  return opts;
}

/**
 * A red or blue chest, after events.js opened it (state, sound, saved as opened). Red: rollRedChest at the floor with the party's
 * props, the landing guarantee and the Bookmark; blue: rollBlueChest, foundBlue, the legendary toast and the equip prompt (a
 * red roll one rarity better when every unique is held).
 */
export async function openCaveChest(field, ent) {
  const g = field.game, ev = ent.ev, map = field.map;
  const floor = Number(ev.floor) || CAVE.floorOf(g) || floorOfMapId(map.id);
  const seed = g.cave && g.cave.run ? g.cave.run.seed : ((map.mod && map.mod.seed) || 0);
  const rng = chestRng(seed, floor, ent.id);
  CAVE.noteChest(g);
  const at = chestPoint(field, ent);
  const props = wornProps(g.party);
  const landing = isLanding(floor) || !!(map.mod && map.mod.landing);
  const holds = CAVE.hasBookmark(g);
  if (ev.tier === 'blue') {
    const id = rollBlueChest(rng, floor, CAVE.vaultIds(g), { exclude: CAVE.bluesOf(g) });
    const uid = id ? CAVE.foundBlue(g, id) : null;
    if (uid != null) {
      const inst = findGear(g, uid);
      if (field.engine.toasts && inst) await field.engine.toasts.received(inst, 1, { at });
      await field.maybeEquipPrompt(uid);
      await field.bark('first_legendary_drop');
      return { tier: 'blue', unique: id, uid };
    }
    const roll = rollRedChest(rng, floor, CAVE.vaultIds(g), { props: props.includes('red_rarity_up') ? props : [...props, 'red_rarity_up'], landing: false, holdsBookmark: holds, bookmarks: CAVE.bookmarks(g) });
    await giveRed(field, roll, at);
    return { tier: 'blue', unique: null, roll };
  }
  const roll = rollRedChest(rng, floor, CAVE.vaultIds(g), redChestOpts(g, floor, landing));
  await giveRed(field, roll, at);
  return { tier: 'red', roll };
}

// ---------------------------------------------------------------- the hooks (engine.cave)
/** inRun that tolerates a missing game and never creates `game.cave` on a game that never opened the Stacks. */
const running = (g) => !!(g && g.cave) && CAVE.inRun(g);
function anyWears(game, prop) { return !!(game && Array.isArray(game.party) && game.party.some((m) => CAVE.wearsProp(m, prop))); }
/** The floor tag ("B23") where the Aim line draws, permanent inside a reading, hidden only under the banner, a fade or a close-up; the Downward Sense arrow beside it. */
function drawTag(field, r) {
  // the floor of the map on screen, not the run's: during the stair's fade the run is already one floor down (CRITIQUE_STACKS 1)
  const mf = field.map && field.map.mod ? Number(field.map.mod.floor) : 0;
  const tag = running(field.game) && field.map && !field.loading ? floorTagOf(mf > 0 ? mf : CAVE.floorOf(field.game)) : null;
  if (!tag) return false;
  if ((field.banner && field.banner.active) || (field.closeup && field.closeup.isOpen) || field.fadeAlpha >= 0.5) return true;
  const dir = HOOKS.stairsDir(field);
  const tw = r.measure(tag), w = tw + 12 + (dir ? 9 : 0), h = 15;
  const x = Math.round((r.W - w) / 2), y = 3;
  drawWindow(r, x, y, w, h, { kind: 'thin', alpha: 0.9 });
  r.text(tag, x + 6, y + 2, { color: 'cream' });
  if (dir) {
    // a 5 px gold arrow pointing the way to the stairs room (three strips: 5, 3, 1 px)
    const ax = x + tw + 10, ay = y + 4, c = '#f9d77a';
    for (const [len, i] of [[5, 0], [3, 1], [1, 2]]) {
      if (dir === 'down') r.rect(ax + i, ay + 1 + i, len, 1, c);
      else if (dir === 'up') r.rect(ax + i, ay + 3 - i, len, 1, c);
      else if (dir === 'right') r.rect(ax + 1 + i, ay + i, 1, len, c);
      else r.rect(ax + 3 - i, ay + i, 1, len, c);
    }
  }
  return true;
}
export function stairsDir(field) {
  if (!field || !field.map || !field.leader || typeof field.map.mark !== 'function') return null;
  const m = field.map.mark('stairs');
  if (!m) return null;
  const dx = m[0] - field.leader.tx, dy = m[1] - field.leader.ty;
  if (!dx && !dy) return null;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

export const HOOKS = {
  inRun: running,
  /** The floor tag text ("B23") while a reading runs, else null. */
  floorTag(game) { return running(game) ? floorTagOf(CAVE.floorOf(game)) : null; },
  drawTag,
  /** stairs_sense: the way to the stairs room while a wearer is in the party, else null. */
  stairsDir(field) { return field && running(field.game) && anyWears(field.game, 'stairs_sense') ? stairsDir(field) : null; },
  /** cave_move_plus: fewer frames per step inside a run. */
  moveFrames(game, dur) { return running(game) && anyWears(game, 'cave_move_plus') ? Math.max(3, Math.round(dur / MOVE_PLUS)) : dur; },
  /** The field's autosave inside a reading is the suspend save (slot 'cave', every floor arrival), never slot 0. True when written here. */
  autosave(field) { return running(field.game) ? (writeSuspend(field.engine, field.game), true) : false; },
  /** A door into cave_bN: the next floor prepared, cave.descend, the loot zone, the arrival; false when the stair is refused. Any other door passes through. */
  beforeDoor(field, to) {
    const n = floorOfMapId(to && to[0]);
    if (!n) return to;
    const g = field.game;
    if (!running(g)) {
      if (!(field.cutscene && field.cutscene.running)) {
        if (hasFlag(g, 'deep_stacks_open') && sceneById('stacks_enter')) field.runScene('stacks_enter');
        else field.showBoxes([{ who: null, text: textOf('stair_wait') }]);
      }
      return false;
    }
    // always one floor down, whatever the door's own number says (the hall's placeholder, a stale map); the floor is built BEFORE
    // the run moves, so a refusal keeps the party, the run and the tag where they are, with one line (CRITIQUE_STACKS 1)
    const next = Math.min(BOSS_FLOOR, CAVE.floorOf(g) + 1);
    try { prepareFloor(g, next); }
    catch (err) {
      if (!(err instanceof CaveGenError)) throw err;
      console.warn('[cave] stair refused', err.message);
      if (!(field.cutscene && field.cutscene.running)) field.showBoxes([{ who: null, text: textOf('stair_stuck') }]);
      return false;
    }
    const floor = CAVE.descend(g);
    setLootFloor(floor);
    const at = floorArrival(g.cave.run.seed, floor);
    return [`cave_b${floor}`, at[0], at[1], 'down'];
  },
  /** After any battle on the field: the kill count; the B100 win closes the reading; a wipe is the Stacks' close (resolves true: the field stops there). */
  async afterBattle(field, encounterId, result) {
    const g = field.game;
    if (!running(g)) return false;
    if (result === 'lose') { await wipeFlow(field.engine, g); return true; }
    const foe = fightingFoe(field);
    if (result !== 'win') { if (foe) writeSuspend(field.engine, g); return false; }
    const enc = ENCOUNTERS[encounterId];
    CAVE.noteKills(g, enc && Array.isArray(enc.enemies) ? enc.enemies.length : 1);
    if (encounterId === BINDER_ENCOUNTER_ID) {
      // the Binder's drops were lent and go back with the clear: no equip prompt before its last line (CRITIQUE_STACKS 17)
      const e = field.engine; e.lastBattleDrops = null;
      e.after(2, () => { clearFlow(e, g, field); });
      return false;
    }
    if (foe) writeSuspend(field.engine, g, { won: foe.id });
    return false;
  },
  /** The rest flow's "Record your journey?" inside a reading: the one line instead. True when refused. */
  async refuseSave(engine, g) { if (!running(g)) return false; await saveRefused(engine); return true; },
  /** The menu's Save inside a reading: a promise of the refusal line, else null (the menu opens the save screen). */
  menuSave(engine, g) { return running(g) ? saveRefused(engine) : null; },
  /** The Items screen's confirm on a key item: the Keeper's Bookmark closes the book (true), anything else is not ours (false). */
  useKeyItem(screen, id) {
    const k = KEY_ITEMS[id];
    if (!k || k.use !== 'cave_bank') return false;
    screen.busy = true;
    bookmarkFlow(screen.engine, screen.g).then((left) => { if (!left) screen.refresh(true); }).finally(() => { screen.busy = false; });
    return true;
  },
  /** The game over scene inside a reading: never shown; it pops itself and the Stacks' close runs. True when routed. */
  gameOver(scene) {
    const e = scene.engine;
    if (!running(e.game)) return false;
    scene.busy = true; scene.routed = true;
    e.after(1, () => { if (e.scene === scene) e.pop(); wipeFlow(e, e.game); });
    return true;
  },
  /** A party member would fall: the Rebound (second_life) rise, once per reading; the HP to stand up with, or 0. */
  onFall(game, unit) {
    const r = CAVE.takeRise(game, unit && unit.id);
    return r ? Math.max(1, Math.ceil((unit.maxHp || 1) * r.hpFrac)) : 0;
  },
  /** first_blow_true: does this member's first strike of a fight always land? */
  firstBlow(member) { return CAVE.wearsProp(member, 'first_blow_true'); },
  /** Arm a rules battle for a reading: the fall hook and the first-blow flags on the party's units. */
  armBattle(battle, game) {
    if (!battle || !battle.state || !running(game)) return false;
    battle.state.options.onFall = (u) => HOOKS.onFall(game, u);
    for (const u of battle.units()) {
      if (u.side !== 'party') continue;
      const m = (game.party || []).find((x) => x.id === u.id);
      if (m && HOOKS.firstBlow(m)) u.firstBlow = true;
      if (m && u.alive && CAVE.wearsProp(m, 'ink_well')) { u.mp = Math.min(u.maxMp, u.mp + 4); u.startMp = u.mp; for (const ev of battle.state.startEvents || []) for (const x of (ev.type === 'battle_start' && ev.units) || []) if (x.uid === u.uid) x.mp = u.mp; }   // C4 Inkwell (items.js CAVE_PROPS.ink_well.value; the opening snapshot the HUD reads)
      if (m && u.alive && CAVE.wearsProp(m, 'fury_floor')) { u.fury = Math.max(u.fury, 50); for (const ev of battle.state.startEvents || []) for (const x of (ev.type === 'battle_start' && ev.units) || []) if (x.uid === u.uid) x.fury = u.fury; }   // C4 Standing Grudge (CAVE_PROPS.fury_floor.value)
    }
    if (anyWears(game, 'exp_lean')) for (const x of battle.units()) if (x.side === 'enemy' && x.rewards) x.rewards.exp = Math.round(x.rewards.exp * 1.15);   // C4 Quick Study (CAVE_PROPS.exp_lean.value)
    // the suspend save knows this fight (CRITIQUE_STACKS 3): closing the app now resumes into it, not at the floor's arrival
    const field = fieldOf();
    const foe = field && field.game === game ? fightingFoe(field) : null;
    if (foe && field.leader) writeSuspend(field.engine, game, { inBattle: { floor: CAVE.floorOf(game), foe: foe.id, enc: foe.ev.encounter, pos: [field.leader.tx, field.leader.ty, field.leader.dir] } });
    return true;
  },
  /** events.js opened a chest: a red or blue tier (not a placed one) is rolled here; resolves the roll, or false when the chest is not ours. */
  openChest(field, ent) {
    const ev = ent && ent.ev;
    if (!ev || !CHEST_TIERS_CAVE.includes(ev.tier) || ev.item || ev.gold) return false;
    return openCaveChest(field, ent);
  },
  wipe: wipeFlow,
  /** The menu's Quit: false outside a reading (the menu's own question), 'stay', or 'left' (the reading ended, the menu was popped). */
  async quit(engine, game) {
    if (!running(game)) return false;
    return (await quitFlow(engine, game)) ? 'left' : 'stay';
  },
  useBookmark: bookmarkFlow,
  saveRefused,
  text: textOf,
  state(game) { return debugState(game); },
};

/** LQ_DEBUG.state().cave and the test rigs' view of a reading. */
export function debugState(game) {
  const g = gameOf(null, game);
  if (!g) return null;
  const c = CAVE.ensureCave(g);
  const e = engineOf();
  let suspend = false;
  try { suspend = !!(e && e.save && e.save.exists(CAVE.SUSPEND_SLOT)); } catch (err) { suspend = false; }
  return {
    inRun: CAVE.inRun(g), floor: CAVE.floorOf(g), seed: c.run ? c.run.seed : null, blues: CAVE.bluesOf(g), bookmarks: CAVE.bookmarks(g),
    vault: CAVE.vaultIds(g), record: CAVE.recordOf(g), lastExit: c.lastExit || null, chests: c.run ? c.run.chests : 0, kills: c.run ? c.run.kills : 0,
    rises: c.run ? c.run.rises.slice() : [], suspend, tag: HOOKS.floorTag(g), blueFloors: c.run ? [...blueFloors(c.run.seed, CAVE.vaultIds(g))] : [],
    hall: !!peekMap(HALL_ID), fallbackHall: !!(peekMap(HALL_ID) && peekMap(HALL_ID).fallback), story: !!mods.story, text: !!mods.text, art: artInstalled,
  };
}

/** engine.cave = the hooks; the LQ_DEBUG surface for the bots. Idempotent. */
export function bindWorld(engine) {
  const e = engineOf(engine);
  if (!e) return null;
  bound = e;
  e.cave = HOOKS;
  installCaveArt(e);
  const D = typeof globalThis !== 'undefined' ? globalThis.LQ_DEBUG : null;
  if (D && typeof D.register === 'function' && !(D.commands && D.commands().includes('caveBegin'))) {
    D.provide('cave', () => debugState(e.game));
    D.register('caveBegin', (o = {}) => beginReading(e, e.game, o));
    D.register('caveEnd', (how = 'bank') => endReading(e, e.game, how));
    D.register('caveResume', () => resumeReading(e));
    D.register('caveWipe', () => wipeFlow(e, e.game));
    D.register('caveArt', () => installCaveArt(e));
    D.register('caveStairs', () => {
      const f = fieldOf(e);
      if (!f || !f.map) return null;
      const mod = f.map.mod || {};
      return { map: f.mapId, stairs: f.map.mark('stairs'), arrival: f.map.mark('arrival'), dir: stairsDir(f), landing: !!mod.landing, floor: mod.floor || 0 };
    });
    D.register('caveChests', () => {
      const f = fieldOf(e);
      if (!f || !f.entities) return [];
      return [...f.entities.values()].filter((x) => x.type === 'chest' && x.present).map((x) => ({ id: x.id, tier: x.ev.tier, x: x.x, y: x.y, state: x.state, front: f.map.mark(x.id) }));
    });
    // the bot's shortcut down: the next floor without walking (prepare, descend, warp)
    D.register('caveDescend', async () => {
      const f = fieldOf(e);
      if (!f || !CAVE.inRun(e.game)) return null;
      const to = HOOKS.beforeDoor(f, [`cave_b${CAVE.floorOf(e.game) + 1}`, 0, 0, 'down']);
      if (!to) return null;
      await f.warpTo(to[0], to[1], to[2], to[3], 'stairs');
      return CAVE.floorOf(e.game);
    });
  }
  return e.cave;
}

// ---------------------------------------------------------------- register (the pack entry calls it)
function missing(err, name) {
  const m = String((err && err.message) || err);
  if (err && err.code === 'ERR_MODULE_NOT_FOUND') {
    const gone = /Cannot find module '([^']+)'/.exec(m);
    return !!gone && /[\\/]cave[\\/]/.test(gone[1]) && gone[1].endsWith(`${name}.js`);
  }
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to load module script/i.test(m);
}
async function optional(rel, name) {
  try { return await import(rel); }
  catch (err) { if (missing(err, name)) return null; throw err; }
}

async function run() {
  mods.text = await optional('./text.js', 'text');
  mods.story = await optional('./story.js', 'story');
  mods.bands345 = await optional('./bands345.js', 'bands345');
  mods.hall = await optional('./maps/cave_landing0.js', 'cave_landing0');
  mods.b100 = await optional('./maps/cave_b100.js', 'cave_b100');
  TEXT = mods.text;
  for (const m of [mods.bands345]) {
    if (!m) continue;
    const fn = typeof m.register === 'function' ? m.register : typeof m.default === 'function' ? m.default : null;
    if (fn) await fn();
  }
  const story = registerFallbackStory();
  // C4-fixes: the Catalogue sounds like itself, not the Archive the party just finished (CRITIQUE_STACKS 16); the Bookmark says
  // what it keeps (CRITIQUE_STACKS 4; items.js keeps its own copy, the text lives in text.js)
  registerBand('catalogue', { music: CATALOGUE_MUSIC });
  for (const k of [KEEPERS_BOOKMARK, KEY_ITEMS[KEEPERS_BOOKMARK_ID]]) if (k) k.desc = textOf('bookmark_desc');
  const hall = ensureHall();
  ensureArchivistFallback(hall);
  // the trapdoor into the library (the module is cached by maps.js: patched once, it stays patched for every later visit)
  let trapdoor = false;
  try { trapdoor = installTrapdoor(await loadMap('library')); } catch (err) { console.warn('[cave] library trapdoor', err && err.message); }
  onPackReady('cave', () => { installCaveArt(engineOf()); });
  if (engineOf()) bindWorld(engineOf());
  return { id: 'world', loaded: Object.keys(mods).filter((k) => mods[k]), skipped: Object.keys(mods).filter((k) => !mods[k]), fallbackScenes: story.scenes, fallbackLines: story.lines, hall: hall.fallback ? 'fallback' : 'map', trapdoor };
}
/** Idempotent (the same promise after success; a retry after a failure runs again). */
export function register() {
  if (!registered) registered = run().catch((err) => { registered = null; throw err; });
  return registered;
}
/** Tests: the optional modules that loaded. */
export function worldModules() { return { ...mods }; }
export default register;
