// The King's Mirror (24 x 20, dungeon, dark 0.3). EPISODE2_PLAN 4.7.
//
// A long hall with a black mirror floor. A red runner leads from the south door to the dais, where the Nameless King
// stands with his back to the party before the great mirror (the whole town in it). The step trigger across row 15
// starts the fight. After it the great mirror shows the shattered glass, then (once Aurel is named) the square of
// Hollowmere in morning light: the mirror door in front of it leads home to the fountain.
import { grid, box, rows, room, wallDepth, door, sign, object, trigger, actor, light, mirrorDoor, enter } from './_kit.js';

const W = 24, H = 20;
const g = grid(W, H, '#');
room(g, 4, 6, 19, 17, '.', '|', 3);
box(g, 12, 18, 12, 18, '.');                // the south door
box(g, 11, 9, 12, 17, 'r');                 // the runner to the dais
box(g, 9, 6, 14, 8, 'd');                   // the dais (black glass on silver)
const ground = rows(wallDepth(g.map((r) => r)));

const decor = [
  { t: 'throne_glass', x: 16, y: 8 },
  { t: 'pillar', x: 6, y: 9 }, { t: 'pillar', x: 17, y: 11 }, { t: 'pillar', x: 6, y: 12 }, { t: 'pillar', x: 17, y: 14 },
  { t: 'pillar', x: 6, y: 15 }, { t: 'pillar', x: 17, y: 17 },
  { t: 'candelabra', x: 8, y: 6 }, { t: 'candelabra', x: 15, y: 6 },
  { t: 'candelabra', x: 10, y: 17 }, { t: 'candelabra', x: 13, y: 17 },
];

const overlays = [
  { t: 'crowned_reflection', x: 16, y: 9 },
  { t: 'mirror_wall', x: 5, y: 3 }, { t: 'mirror_wall', x: 18, y: 3 }, { t: 'mirror_wall', x: 7, y: 4 }, { t: 'mirror_wall', x: 16, y: 4 },
];

const events = [
  // the King's map actor (back to the party) and the great mirror's three looks
  actor('nameless_king', 12, 6, 'nameless_king_avatar', 'up', { ifNot: 'nameless_king_defeated' }),
  object('great_mirror_whole', 9, 5, 'mirror_great', { state: 0, text: 'great_mirror_throne', ifNot: 'nameless_king_defeated' }),
  object('great_mirror_broken', 9, 5, 'mirror_great', { state: 1, text: 'great_mirror_throne', if: 'nameless_king_defeated', ifNot: 'aurel_named' }),
  object('great_mirror_town', 9, 5, 'mirror_great', { state: 0, text: 'great_mirror_throne', if: 'aurel_named' }),
  trigger('king_trig', 4, 15, 16, 1, 'nameless_king'),
  enter('king_after_enter', 'king_after'),
  sign('throne_sign', 16, 8, 'throne_glass'),
  // after the naming: the way home through the glass, and Aurel and Elian by the dais until the town is restored
  mirrorDoor('mirror_exit', 11, 6, ['nameless_hollow', 24, 21, 'down'], 'aurel_named', { w: 2, sprite: null }),
  actor('aurel_t', 12, 8, 'npc_aurel', 'down', { if: 'aurel_named', ifNot: 'nh_restored' }),
  actor('elian_t', 13, 10, 'npc_elian', 'left', { if: 'aurel_named', ifNot: 'nh_restored' }),
  door('throne_exit', 12, 18, ['court_f3', 21, 4, 'down']),
  light('l_dais', 12, 7, 6), light('l_door', 12, 16, 4),
];

export default {
  id: 'court_throne', name: "The King's Mirror", area: 'dungeon',
  music: null, ambience: 'court_hush', tileset: 'court',
  lighting: { tint: 'none', dark: 0.3 },
  under: 'throne_floor',
  legend: { '#': 'court_throne_top', '|': 'court_throne_face', 'v': 'court_throne_out_top', 'o': 'court_throne_out_face',
    '.': 'throne_floor', 'r': 'carpet_red', 'd': 'throne_floor' },
  // W11 (CRITIQUE_4 item 13): the dais is the hall's own black glass, raised on a silver rim (tilemap.js rims), not
  // a block of F1's grey flagstone
  rims: [{ x: 9, y: 6, w: 6, h: 3, thick: 2, color: '#b8bdd4', hi: '#eef1ff', lo: '#0c0a16', shade: '#5a5e7a' }],
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    king: [12, 6], kneel: [12, 8], fragment_spot: [12, 9], party_stop: [12, 12], elian_enter: [12, 17], elian_meet: [13, 10],
    great_mirror: [12, 3],
  },
  start: { x: 12, y: 17, dir: 'up' },
};
