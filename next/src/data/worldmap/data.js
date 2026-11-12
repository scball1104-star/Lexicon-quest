// What the world map knows (issue #97, docs/WORLD_MAP_PLAN.md waves 2, 3.2 and 5.1). Pure: no DOM, no engine, no writes.
//
// The map never stores anything of its own. What a save has visited or only heard of is read from the story flags every
// save already has (the "backfill" of plan 5.1, done on every read instead of once): a save from any published build opens
// the map with the right regions inked, and the save format does not change. Three states per region and place:
//   'visited'  full colour (the party has been there)
//   'heard'    a brown-ink sketch on paper with a "?" label (someone named it: the endings already do, plan 3.2)
//   'unknown'  blank paper
//
// The painting and its region grid are generated (tools/art/worldmap/build_worldmap.py writes ./layout.js); the names, the
// flags and the copy are here.

import { REGIONS as GRID, POINTS } from './layout.js';

export const VISITED = 'visited', HEARD = 'heard', UNKNOWN = 'unknown';
const RANK = { [UNKNOWN]: 0, [HEARD]: 1, [VISITED]: 2 };

/**
 * One entry per region letter of the painting. `seen` / `heard`: any of these flags (true: always). A region is also visited
 * when any of its places is, so a save that skipped a road still shows the town it reached.
 */
export const REGIONS = {
  V: { name: "Willowmere's valley", ep: 1, seen: true, heard: true },
  W: { name: 'The Wider Valley', ep: 'X1', seen: ['downs_arrived', 'thornfold_arrived', 'moor_arrived', 'larchhill_arrived', 'terrace_arrived', 'millrace_arrived'], heard: ['ep1_complete'] },
  H: { name: 'The Hollow and its mere', ep: 2, seen: ['east_road_arrived', 'nh_arrived'], heard: ['ep1_complete'] },
  E: { name: 'The ash hills', ep: 3, seen: ['sand_road_arrived', 'pk_arrived'], heard: ['ep2_complete'] },
  F: { name: 'The Flood Country', ep: 4, seen: ['flood_road_arrived', 'vw_arrived'], heard: ['ep3_complete'] },
  S: { name: 'The south', ep: 5, seen: ['road_landed', 'haven_arrived'], heard: ['ep4_complete'] },
  I: { name: 'The Skybound Isles', ep: 6, seen: ['airstair_arrived', 'zephyr_arrived'], heard: ['ep5_complete'] },
  N: { name: 'The White North', ep: 7, seen: ['road_arrived', 'palehaven_arrived'], heard: ['ep6_complete'] },
};

/**
 * The named places, in list order. `town`: listed on the side of the map screen. `name` may change with a flag (`names`:
 * [[flag, name]] first match wins, else `name`), as the Nameless Hollow becomes Hollowmere. `label`: where its plate sits,
 * relative to the glyph centre (layout.js POINTS). `about`: the first line of the info box (at most 44 characters).
 */
export const PLACES = [
  { id: 'willowmere', name: 'Willowmere', region: 'V', town: true, seen: true, heard: true, label: [-20, 8],
    about: 'Home. The Lantern Inn and the ferry.' },
  { id: 'archive', name: 'Rootbound Archive', region: 'V', seen: ['archive_entered'], heard: ['met_mael'], label: [-34, -21],
    about: 'A library under the roots, north of town.' },
  { id: 'thornfold', name: 'Thornfold', region: 'W', town: true, seen: ['thornfold_arrived', 'downs_arrived'], heard: [], label: [-14, 8],
    about: "A hamlet on Shepherd's Downs." },
  { id: 'hollowmere', name: 'Hollowmere', names: [['!nh_restored', 'Nameless Hollow']], region: 'H', town: true, seen: ['nh_arrived'],
    heard: ['ep1_complete'], label: [-24, -19], about: 'The Signless Inn and the ferry to the Court.' },
  { id: 'court', name: 'Court of Mirrors', region: 'H', seen: ['court_entered'], heard: ['heard_crisis'], label: [-32, 9],
    about: 'Silverglass halls in the middle of the mere.' },
  { id: 'emberpeak', name: 'Emberpeak', region: 'E', town: true, seen: ['pk_arrived'], heard: ['ep2_complete'], label: [-22, 9],
    about: 'The Coal Lantern Inn and the bell house.' },
  { id: 'foundry', name: 'Ashen Foundry', region: 'E', seen: ['foundry_entered'], heard: ['met_veyra'], label: [-26, -24],
    about: 'The great forge under the burning peak.' },
  { id: 'valewyn', name: 'Valewyn', region: 'F', town: true, seen: ['vw_arrived'], heard: ['ep3_complete'], label: [-16, -21],
    about: 'The Floodwatch Inn, the canals, the palace.' },
  { id: 'keep', name: 'Sunken Keep', region: 'F', seen: ['keep_entered'], heard: ['met_regent'], label: [-24, 8],
    about: 'A drowned keep in the tide marsh.' },
  { id: 'saffron', name: 'Saffron Haven', region: 'S', town: true, seen: ['haven_arrived'], heard: ['ep4_complete'], label: [-30, -21],
    about: 'The Dune Lantern Rest and the Armillary.' },
  { id: 'labyrinth', name: 'Oracle Labyrinth', region: 'S', seen: ['lab_entered'], heard: ['star_reading_done'], label: [-8, 8],
    about: 'A temple of shifting sand.' },
  { id: 'zephyr', name: 'Zephyr Landing', region: 'I', town: true, seen: ['zephyr_arrived'], heard: ['ep5_complete'], label: [-32, 9],
    about: 'The Cloudhouse Inn and the docks in the sky.' },
  { id: 'north', name: 'The White North', region: 'N', seen: [], heard: ['ep6_complete'], label: [-82, -3],
    about: 'White mountains. The Sky Compass points here.' },
  { id: 'palehaven', name: 'Palehaven', region: 'N', town: true, seen: ['palehaven_arrived'], heard: [], label: [-24, 8],
    about: 'The Thawlight Lodge and the cold hearth.' },
];
export const PLACE = Object.fromEntries(PLACES.map((p) => [p.id, p]));

/** Which point of the painting each field map stands at (first match). Roads and the deck are points between places. */
export const MAP_AT = [
  [/^(hero_home|willowmere|bell_tower|bakery|chapel|inn|item_shop|library|smithy|cave_.*)$/, 'willowmere'],   // the Deep Stacks: under the library
  [/^(valley|whisperwood_hollow)$/, 'valley'],
  [/^archive_/, 'archive'],
  [/^x1_/, 'thornfold'],
  [/^east_road$/, 'east_road'],
  [/^(nameless_hollow|nh_\w+)$/, 'hollowmere'],
  [/^court_/, 'court'],
  [/^sand_road$/, 'sand_road'],
  [/^(emberpeak|pk_\w+)$/, 'emberpeak'],
  [/^foundry_/, 'foundry'],
  [/^ep4_flood_road$/, 'flood_road'],
  [/^ep4_(valewyn|vw_\w+)$/, 'valewyn'],
  [/^ep4_keep_/, 'keep'],
  [/^ep5_ship$/, 'sea_lane'],
  [/^ep5_caravan_road$/, 'caravan_road'],
  [/^ep5_(saffron|sh_\w+)$/, 'saffron'],
  [/^ep5_lab_/, 'labyrinth'],
  [/^ep6_airstair$/, 'airstair'],
  [/^ep6_/, 'zephyr'],
  [/^ep7_(palehaven|ph_\w+)$/, 'palehaven'],
  [/^ep7_/, 'north'],   // the rest of Episode 7 (the landing, the White Road, the Vault, the Stillheart)
];

/**
 * The map stones (waystones) at town gates and docks (plan 2.3 item 4): map id -> [{ id, x, y, at }]. Each cell is plain floor
 * beside the way in, never on a path a door, an exit or a staged scene needs (qa/worldmap/worldmap.test.mjs walks every map
 * with and without its stones: the same cells stay reachable). `at` [x, y, dir] is where travel lands the party (wave 3): an
 * open cell beside the stone, facing away from it, with two open cells behind for the followers (the field lines them up
 * before the stones join the map, so the trail must not cross the stone).
 */
export const STONES = {
  willowmere: [{ id: 'wm_stone_gate', x: 15, y: 27, at: [14, 27, 'up'] }, { id: 'wm_stone_ferry', x: 43, y: 3, at: [43, 4, 'right'] }],
  x1_downs: [{ id: 'wm_stone_gate', x: 50, y: 22, at: [50, 23, 'left'] }],
  nameless_hollow: [{ id: 'wm_stone_gate', x: 16, y: 30, at: [15, 30, 'up'] }, { id: 'wm_stone_ferry', x: 14, y: 4, at: [13, 4, 'down'] }],
  emberpeak: [{ id: 'wm_stone_gate', x: 17, y: 29, at: [17, 28, 'right'] }],
  ep4_valewyn: [{ id: 'wm_stone_landing', x: 24, y: 30, at: [24, 29, 'right'] }],
  ep5_saffron: [{ id: 'wm_stone_gate', x: 19, y: 30, at: [19, 29, 'left'] }, { id: 'wm_stone_dock', x: 6, y: 26, at: [7, 26, 'down'] }],
  ep6_zephyr: [{ id: 'wm_stone_stair', x: 24, y: 27, at: [23, 27, 'up'] }, { id: 'wm_stone_dock', x: 25, y: 6, at: [25, 7, 'right'] }],
  ep7_palehaven: [{ id: 'wm_stone_gate', x: 21, y: 32, at: [22, 32, 'up'] }],   // inside the south gate, west of the avenue
};

/** Each town's own field map (the one its stones stand on): travel's destinations (wave 3). */
export const TOWN_MAP = {
  willowmere: 'willowmere', thornfold: 'x1_downs', hollowmere: 'nameless_hollow', emberpeak: 'emberpeak',
  valewyn: 'ep4_valewyn', saffron: 'ep5_saffron', zephyr: 'ep6_zephyr', palehaven: 'ep7_palehaven',
};

/** The copy of the map screen (player text: no em dashes). */
export const TEXT = {
  title: 'World Map',
  towns: 'Towns',
  here: 'You are here.',
  visited: 'You have been here.',
  heard: 'Heard of, never seen.',
  walk: 'Walk the roads to get there.',
  back: 'back',
  // wave 3: travel
  travel: 'Travel here.',
  road: 'By road', sea: 'By sea', air: 'By air',
  going: 'On the road...',
  offline: 'That road is not ready yet. Try again with a connection.',
  // errands (wave 5 hook, issue #100): the extra info box lines of a chosen place
  errandsOpen: (n) => `! ${n} errands open.`,
  errandsFetch: (n) => `? ${n} things to fetch here.`,
  penny: "Penny's travelling cart is here.",
  why: {
    rumour: 'Heard of, never seen. Walk the roads to get there.',
    here: 'You are already here.',
    dungeon: 'The map only shows the way from here. Walk out first.',
    aboard: 'The ship is under sail. Land first, then travel.',
    scene: 'Not now.',
    busy: 'Not now.',
    locked: 'Walk the roads to get there.',
  },
};

// ------------------------------------------------------------------------------------------------- reading the flags
const has = (flags, f) => (f[0] === '!' ? !flags[f.slice(1)] : !!flags[f]);
function any(flags, rule) {
  if (rule === true) return true;
  return Array.isArray(rule) && rule.some((f) => has(flags, f));
}
function stateOf(flags, def) { return any(flags, def.seen) ? VISITED : any(flags, def.heard) ? HEARD : UNKNOWN; }
const max = (a, b) => (RANK[a] >= RANK[b] ? a : b);

/** A place's name for these flags. Pure. */
export function placeName(place, flags = {}) {
  for (const [f, n] of place.names || []) if (has(flags, f)) return n;
  return place.name;
}

/** The map point for a field map id (layout.js POINTS key), or null. Pure. */
export function pointOfMap(mapId) {
  const m = String(mapId || '');
  for (const [re, id] of MAP_AT) if (re.test(m)) return id;
  return null;
}

/** Is the map open for a game with these flags? The `worldmap` pack is wanted at the same moment (packs.js). Pure. */
export function mapUnlocked(flags = {}) { return !!flags.ep1_complete; }

/**
 * Everything the map screen shows for a game: { unlocked, regions: { V: state ... }, places: { id: state ... }, towns: [ids
 * listed, visited first], here: point id or null, hereAt: [x, y] or null, ship, kestrel }. Pure: reads `game.flags` and
 * `game.map`, writes nothing.
 */
export function mapState(game = {}) {
  const flags = game.flags || {};
  const places = {}, regions = {};
  for (const [id, def] of Object.entries(REGIONS)) regions[id] = stateOf(flags, def);
  for (const p of PLACES) {
    places[p.id] = stateOf(flags, p);
    if (places[p.id] === VISITED) regions[p.region] = VISITED;
  }
  for (const p of PLACES) if (places[p.id] === UNKNOWN && regions[p.region] === VISITED && p.town) places[p.id] = HEARD;
  // where the party stands (a map whose region the flags somehow missed is visited: the party is standing in it)
  const here = pointOfMap(game.map);
  if (here && PLACE[here]) { places[here] = VISITED; regions[PLACE[here].region] = VISITED; }
  else if (here && POINTS[here]) { const r = regionAt(...POINTS[here]); if (r) regions[r] = max(regions[r], VISITED); }
  const towns = PLACES.filter((p) => p.town && places[p.id] !== UNKNOWN)
    .sort((a, b) => RANK[places[b.id]] - RANK[places[a.id]]).map((p) => p.id);
  return {
    unlocked: mapUnlocked(flags),
    regions, places, towns, here,
    hereAt: here && POINTS[here] ? POINTS[here].slice() : null,
    ship: !!flags.ship_boarded && !flags.road_landed ? 'sea_lane' : null,
    kestrel: !!(flags.aeris_came || flags.library_reached),
    lanes: lanesOf(flags),
  };
}

/** The dotted routes the story has opened over water: [[fromPoint, toPoint], ...]. Pure. */
export function lanesOf(flags = {}) {
  const out = [];
  if (flags.ship_boarded || flags.road_landed) out.push(['valewyn', 'sea_lane'], ['sea_lane', 'caravan_road']);
  if (flags.ep6_boarded || flags.airstair_arrived) out.push(['saffron', 'airstair']);
  return out;
}

/** The region letter of the painting cell under pixel (x, y), or null off the map. Pure. */
export function regionAt(x, y) {
  const row = GRID[Math.floor(y / 8)];
  const ch = row ? row[Math.floor(x / 8)] : null;
  return ch || null;
}

/** States compared: does `a` know at least as much as `b`? (tests: the map only ever grows with the story) */
export function atLeast(a, b) { return RANK[a] >= RANK[b]; }
export { RANK };

// ------------------------------------------------------------------------------------------------- errand marks (wave 5)
// The ep4 pack installs globalThis.LQ_ERRANDS when it registers (src/data/ep4/errands.js, WORLD_MAP_PLAN section 12). Before
// that (a save short of Episode 3's end, or the pack still loading) the map shows no marks. The map reads it, never imports it.
const errandsHook = (X) => {
  const E = X === undefined ? (typeof globalThis !== 'undefined' ? globalThis.LQ_ERRANDS : null) : X;
  return E && typeof E.errandsFor === 'function' ? E : null;
};

/** Is the errand hook there (the ep4 pack registered)? */
export function errandsReady(X) { return !!errandsHook(X); }

/**
 * The errand marks of every map point for a game: { pointId: [{ id, title, state, mark, label, npc }] }, only points with a
 * mark. {} when the hook is absent or throws. Pure: reads game.flags through the hook, writes nothing.
 */
export function errandMarks(game = {}, X) {
  const E = errandsHook(X), out = {};
  if (!E) return out;
  for (const id of Object.keys(POINTS)) {
    let list = null;
    try { list = E.errandsFor(game, id); } catch (e) { list = null; }
    if (Array.isArray(list) && list.length) out[id] = list;
  }
  return out;
}

/** The one mark a point shows for its errands: '!' when any is to ask or deliver, else '?', '' for none. Pure. */
export function markOf(list) {
  if (!list || !list.length) return '';
  return list.some((e) => e.mark === '!') ? '!' : '?';
}

/** The info box line for a point's errands: the errand's own label for one, a count for more, '' for none. Pure. */
export function errandLine(list) {
  if (!list || !list.length) return '';
  if (list.length === 1) return list[0].label || `${list[0].mark} ${list[0].title}`;
  return markOf(list) === '!' ? TEXT.errandsOpen(list.length) : TEXT.errandsFetch(list.length);
}

/** Penny's stop as a map point id, or null (no hook, or before Episode 3 is done). Pure. */
export function pennyAt(game = {}, X) {
  const E = errandsHook(X);
  if (!E || typeof E.merchantAt !== 'function') return null;
  let at = null;
  try { at = E.merchantAt(game); } catch (e) { at = null; }
  return at && POINTS[at.place] ? at.place : null;
}
