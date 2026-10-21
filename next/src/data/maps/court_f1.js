// Court of Mirrors, I: The Silverglass Antechamber (40 x 30, dungeon, moonlit). EPISODE2_PLAN 4.4.
//
// The teaching floor for the silverglass beam (plan 5.1). Areas:
//   A  the Landing (south): Tovin's pier on the mere, the silver font, the great door north into B, and the Keeper
//      mirrors that the later shortcuts light (the Hollow square, F2, F3).
//   B  the Antechamber: Puzzle B (teach). The skylight in B's north face shines down onto mir_b. Untouched, mir_b throws
//      the beam west onto B's west wall, right above the passage to the west wing (the way the party will go later);
//      turned once, it runs east into rec_b, and the silver inlay from rec_b climbs to gate_b, the north-east doorway.
//      No enemies. Its west passage leads to the vestibule W and the locked glass door into C.
//   D  the East Wing ("the Fitting Rooms", through gate_b): two groups among fixed mirrors, the glass key at the far end,
//      an iron chest; a cracked pane in its south wall (Dash Strike) opens the secret alcove D2 (Merewarden Helm).
//   C  the Lens Hall (behind door_c, glass key): the moon window shines down onto lens_1, which turns it east through a
//      glass slot in C's east wall into the north corridor N (a doorway beside the slot lets the party follow).
//   N  the North Corridor: the push block sits on the beam row (one push north or south clears it; the corridor is
//      three rows tall so it can never be parked in the line); lens_2 turns the beam north through the glass slot in
//      E's south wall.
//   E  the Stairs Hall: lens_3 turns the beam east into rec_lock (latched, flag silverglass_lock_lit), whose inlay runs
//      to gate_lock in E's north face; behind it the stair alcove and the glass stairs down. Mira's window-mirror on
//      the north face (trigger at the passage up from N). A floor switch opens gate_short, B's north-west door to N's
//      west end: the quick way back to the landing.
// Beam route of the Silverglass Lock: beam_c (C, south) -> lens_1 (east) -> slot -> N (past the block) -> lens_2
// (north) -> slot -> E -> lens_3 (east) -> rec_lock. Each lens has one correct state; every wrong state splashes the
// beam on a wall the party can see; the start state lights nothing.
import { grid, box, put, rows, room, wallDepth, bridgeV, door, sign, object, trigger, enemy, chest, block, gate, lockedDoor, steps, enter,
  floorSwitch, beam, mirror, receptor, mirrorDoor, dullMirror, silverFont, actor } from './_kit.js';

const W = 40, H = 30;
const g = grid(W, H, '#');
room(g, 19, 2, 20, 2, '.', '|');            // S  stair alcove (the glass stairs in its face, rows 0..1)
room(g, 14, 6, 25, 8, '.', '|');            // E  Stairs Hall
room(g, 2, 3, 10, 15, '.', '|');            // C  Lens Hall
room(g, 12, 12, 24, 14, '.', '|');          // N  North Corridor (beam row 13)
room(g, 26, 11, 38, 14, '.', '|');          // D  East Wing, south leg
room(g, 29, 3, 38, 10, '.', '|');           // D  East Wing, the Fitting Rooms
room(g, 2, 19, 10, 21, '.', '|');           // W  vestibule before the Lens Hall
room(g, 12, 18, 27, 21, '.', '|');          // B  Antechamber
room(g, 31, 18, 36, 20, '.', '|');          // D2 secret alcove (behind the cracked pane)
room(g, 13, 25, 26, 27, '.', '|');          // A  Landing
box(g, 0, 28, 39, 29, 'w');                 // the mere
// passages and notches
box(g, 16, 9, 17, 11, '.');                 // N -> E (Mira's window trigger at its top)
put(g, 11, 14, '.');                        // C -> N doorway beside the glass slot
box(g, 11, 20, 11, 21, '.');                // B -> W
put(g, 19, 3, '.');                         // notch behind gate_lock
put(g, 3, 16, '.');                         // notch behind door_c
put(g, 26, 15, '.');                        // notch behind gate_b
put(g, 13, 15, '.');                        // notch behind gate_short
box(g, 19, 22, 20, 22, '.');                // notch behind the great door
// violet runners (gallery marquetry) lead the eye: landing -> great door -> B, and E's floor to the stairs gate
box(g, 19, 25, 20, 27, 'r'); box(g, 19, 18, 20, 22, 'r'); box(g, 19, 6, 20, 8, 'r'); box(g, 19, 2, 20, 3, 'r');
box(g, 5, 4, 7, 12, 'r');                   // C: the moonlit aisle under the window, up to the first lens
const ground = rows(wallDepth(g.map((r) => r)));

// W11 (CRITIQUE_4 item 6): moonlight. The floor is lit by its windows, not evenly: a cool pool on the floor under
// every third window of each north face, a brighter one under each skylight that feeds a beam, and a warm pool at
// every candelabra; the rest of the hall sits in a dim, cool dark (lighting.dark), so the beam reads as light.
const MOON = [];
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  if (ground[y][x] !== '|' || !['.', 'r'].includes(ground[y + 1][x])) continue;
  if (ground[y][x - 1] === '|' && ground[y][x + 1] === '|' && x % 3 !== 1) continue;
  MOON.push({ x: x * 16 + 8, y: (y + 1) * 16 + 8, r: 36, kind: 'cool' });
}
const SKYLIGHTS = [[17, 17], [6, 2]];
const CANDLES = [[18, 25], [21, 25], [18, 6], [21, 6], [2, 19], [5, 19], [12, 18], [27, 21]];
const LIGHTS = [
  ...MOON,
  ...SKYLIGHTS.map(([x, y]) => ({ x: x * 16 + 8, y: (y + 2) * 16, r: 44, kind: 'cool' })),
  ...CANDLES.map(([x, y]) => ({ x: x * 16 + 8, y: y * 16 - 4, r: 36, color: '#ffd9a0' })),
];

// Inlays (silver lines from a receptor to what it opens); `inlay` names the receptor that lights them.
const inl = (t, x, y, rec) => ({ t, x, y, inlay: rec });
const overlays = [
  // Tovin's pier on the mere
  ...bridgeV(19, 28, 29, 'wood'),
  // glass slots: walls the light crosses
  { t: 'glass_slot', x: 11, y: 13 },
  { t: 'glass_slot', x: 22, y: 9 }, { t: 'glass_slot_face', x: 22, y: 10 }, { t: 'glass_slot_face', x: 22, y: 11 },
  // rec_b -> gate_b (one step up), rec_lock -> gate_lock (along E's north wall)
  inl('inlay_v', 27, 18, 'rec_b'),
  inl('inlay_corner_sw', 25, 6, 'rec_lock'), inl('inlay_h', 24, 6, 'rec_lock'), inl('inlay_h', 23, 6, 'rec_lock'),
  inl('inlay_h', 22, 6, 'rec_lock'), inl('inlay_h', 21, 6, 'rec_lock'), inl('inlay_corner_ne', 20, 6, 'rec_lock'),
  // wall mirrors (B and the Fitting Rooms), Mira's window-mirror in E
  { t: 'mirror_wall', x: 14, y: 16 }, { t: 'mirror_wall', x: 21, y: 16 }, { t: 'mirror_wall', x: 24, y: 16 },
  { t: 'mirror_wall', x: 30, y: 1 }, { t: 'mirror_wall', x: 33, y: 1 }, { t: 'mirror_wall', x: 36, y: 1 },
  { t: 'mirror_wall', x: 15, y: 4 },
  { t: 'mirror_wall', x: 4, y: 1 }, { t: 'mirror_wall', x: 9, y: 1 },
  { t: 'mirror_wall', x: 5, y: 17 }, { t: 'mirror_wall', x: 9, y: 17 },
  { t: 'mirror_wall', x: 15, y: 23 }, { t: 'mirror_wall', x: 24, y: 23 },
];

const decor = [
  // the great door from the landing (open), the glass stairs in the alcove
  { t: 'door_glass_open', x: 19, y: 24 },
  { t: 'stairs_glass_down', x: 19, y: 1 },
  // the Fitting Rooms: rows of fixed full-length mirrors
  { t: 'mirror_tall', x: 31, y: 5 }, { t: 'mirror_tall', x: 31, y: 8 }, { t: 'mirror_tall', x: 36, y: 5 }, { t: 'mirror_tall', x: 36, y: 8 },
  { t: 'glass_bench', x: 33, y: 9 },
  // B: benches either side of the skylight column
  { t: 'glass_bench', x: 13, y: 21 }, { t: 'glass_bench', x: 22, y: 21 },
  // C: pillars along the moonlit aisle, benches between them; E: a bench by Mira's window
  { t: 'pillar', x: 4, y: 5 }, { t: 'pillar', x: 8, y: 5 }, { t: 'pillar', x: 4, y: 9 }, { t: 'pillar', x: 8, y: 9 },
  { t: 'glass_bench', x: 2, y: 7 }, { t: 'glass_bench', x: 9, y: 7 },
  // candelabra flank the great door, the gate to the stairs and the key door
  ...CANDLES.map(([x, y]) => ({ t: 'candelabra', x, y })),
];

const events = [
  enter('court_enter', 'court_crossing'),
  // ---- A: the Landing
  { id: 'ferry_home', type: 'ferry', x: 19, y: 29, text: 'nh_pier', to: ['nameless_hollow', 12, 2, 'down'], solid: false },
  actor('tovin_c', 22, 27, 'npc_tovin', 'left', { text: 'tovin_landing' }),
  silverFont('font_f1', 15, 27),
  door('great_door_in', 19, 24, ['court_f1', 19, 22, 'up'], { w: 2 }),
  door('notch_great', 19, 22, ['court_f1', 19, 25, 'down'], { w: 2 }),
  sign('great_door_sign', 21, 24, 'great_door_court', { solid: false }),
  // the Keeper mirrors along the landing's north face: dull until their flag, then doors (plan 5.3)
  dullMirror('dull_sq', 14, 25, 'mirror_sigil_get', 'court_wall_mirror'),
  mirrorDoor('mirror_f1_sq', 14, 25, ['nameless_hollow', 26, 19, 'down'], 'mirror_sigil_get'),
  dullMirror('dull_f2', 16, 25, 'court_f2_done', 'court_wall_mirror'),
  mirrorDoor('mirror_f1_f2', 16, 25, ['court_f2', 11, 12, 'down'], 'court_f2_done'),
  dullMirror('dull_f3', 23, 25, 'court_f3_arrived', 'court_wall_mirror'),
  mirrorDoor('mirror_f1_f3', 23, 25, ['court_f3', 27, 16, 'down'], 'court_f3_arrived'),
  // ---- B: the Antechamber (Puzzle B)
  trigger('arrival_trig', 19, 21, 2, 1, 'court_f1_arrival'),
  beam('beam_b', 17, 17, 'down', 'beam_window', { text: 'moon_window' }),
  mirror('mir_b', 17, 19, 0),
  receptor('rec_b', 27, 19, 'gate_b', { face: 'left', latch: true }),
  gate('gate_b', 26, 17, 'door_glass', { to: ['court_f1', 26, 15, 'up'] }),
  door('notch_b', 26, 15, ['court_f1', 26, 18, 'down']),
  sign('wall_mirror_b', 21, 17, 'court_wall_mirror', { solid: false }),
  // the quick way home: E's floor switch opens B's north-west door onto N
  gate('gate_short', 13, 17, 'door_glass', { to: ['court_f1', 13, 15, 'up'] }),
  door('notch_short', 13, 15, ['court_f1', 13, 18, 'down']),
  // ---- W and C: the locked glass door, the Lens Hall
  lockedDoor('door_c', 3, 18, 'glass_key', ['court_f1', 3, 16, 'up'], { sprite: 'door_glass_key' }),
  door('notch_c', 3, 16, ['court_f1', 3, 19, 'down']),
  sign('glass_door_sign', 5, 18, 'court_glass_door', { solid: false }),
  beam('beam_c', 6, 2, 'down', 'beam_window', { text: 'moon_window' }),
  mirror('lens_1', 6, 13, 0),
  sign('slot_c', 11, 13, 'glass_slot'),
  chest('chest_c', 9, 3, 'wood', { item: 'hi_potion', qty: 2 }),
  // ---- N: the North Corridor
  block('block_n', 15, 13),
  mirror('lens_2', 22, 13, 1),
  // ---- E: the Stairs Hall
  trigger('mira_window_trig', 16, 9, 2, 1, 'mira_memory_1'),
  mirror('lens_3', 22, 7, 1),
  receptor('rec_lock', 25, 7, 'gate_lock', { face: 'left', latch: true, flag: 'silverglass_lock_lit', script: 'silverglass_lock' }),
  gate('gate_lock', 19, 5, 'door_glass', { to: ['court_f1', 19, 3, 'up'] }),
  door('notch_lock', 19, 3, ['court_f1', 19, 6, 'down']),
  floorSwitch('sw_short', 15, 7, 'gate_short'),
  chest('chest_e', 14, 8, 'iron'),
  // ---- S: the stair alcove
  trigger('stairs_trig', 19, 2, 2, 1, 'court_f1_stairs'),
  door('stairs_f2', 19, 1, ['court_f2', 7, 4, 'down'], { kind: 'stairs' }),
  // ---- D: the East Wing, D2 behind the cracked pane
  chest('chest_key1', 37, 3, 'wood', { item: 'glass_key', flag: 'glass_key_f1' }),
  chest('chest_d', 29, 3, 'iron'),
  object('pane_d', 33, 15, 'glass_pane_cracked_top', { breakable: 'glass', text: 'cracked_pane', opens: [[33, 15], [33, 16], [33, 17]] }),
  chest('chest_helm', 33, 18, 'gold', { item: 'merewarden_helm', behind: 'pane_d' }),
  // ---- enemies: 7 per ZONES.court_f1.plan (none in B, the teaching room). W11 (PLAYTEST_REVIEW_3 section 4): the
  // East Wing's quicksilver patrol is gone, so the wing holds the two groups its header promises
  enemy('e_d_sentinel', 34, 4, 'glass_sentinel', 'c1_sentinel', 'guard'),
  enemy('e_d_wisps', 34, 11, 'glint_wisp', 'c1_wisps', 'wander', { radius: 2 }),
  enemy('e_c_mixed', 4, 6, 'glass_sentinel', 'c1_mixed', 'chase'),
  enemy('e_c_wisps', 8, 11, 'glint_wisp', 'c1_wisps', 'wander', { radius: 2 }),
  enemy('e_n_sentinel', 20, 12, 'glass_sentinel', 'c1_sentinel', 'guard'),
  enemy('e_e_mixed', 24, 6, 'glass_sentinel', 'c1_mixed', 'guard'),
  enemy('e_w_quick', 8, 20, 'quicksilver', 'c1_quick', 'patrol', { path: steps('left', 4, 'right', 4) }),
];

export default {
  id: 'court_f1', name: 'The Silverglass Antechamber', area: 'dungeon',
  music: 'court', ambience: 'court_hush', tileset: 'court',
  lighting: { tint: 'none', dark: 0.42, lights: LIGHTS },
  // W11 (CRITIQUE_4 item 6): the floor darkens at the foot of every wall, the glass floor shows its cracks, shards and
  // stars more often, and the deep between the halls is the mere at night (tilemap.js floorShade / voidWater).
  floorShade: { color: '#14101e', alpha: 0.5, rows: 8, side: 3 },
  variantWeights: { glass_floor: [14, 3, 2, 3, 2, 3, 2] },
  voidWater: { sys: 'court_out' },
  // W11 (CRITIQUE_4 item 12): the violet runner is a carpet here (no reflections on it); the glass shows a deeper,
  // darker image so the reflection lives on the glass
  noReflect: ['gallery_floor'],
  reflectLook: { alpha: 1.45, tint: '#2c2a5e', amount: 0.5 },
  under: 'glass_floor',
  legend: { '#': 'court_top', '|': 'court_face', 'v': 'court_out_top', 'o': 'court_out_face', '.': 'glass_floor', 'r': 'gallery_floor', 'w': 'mere_water' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    landing: [22, 27], pier: [19, 28], start: [19, 27], great_door: [19, 24], b_center: [17, 19], mira_window: [15, 6],
    lens_1: [6, 13], lens_2: [22, 13], rec_lock: [25, 7], lock_gate: [19, 5], stairs_down: [19, 2], shortcut_gate: [13, 17],
  },
  start: { x: 19, y: 27, dir: 'up' },
};
