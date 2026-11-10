// The Cloud Library (20 x 16, interior, bright). EPISODE6_PLAN 4.9; cells in docs/MAPS_EP6_B.md. A small round Keeper
// reading room on the top of the cloud: white stone at its back (north) lined with weather-log shelves, open to the sun on
// the other three sides, plank floor round a stormglass reading circle. The shelf with the first page under glass,
// first_shelf (9..10,3), stands in the middle of the back wall. The Kestrel's door from the Eyrie lands the party at
// `arrival` (10,11), which runs cloud_library; afterwards kestrel_down (10,12) flies down to Zephyr Landing's north dock.
import { door, sign, object, enter, rows } from './_kit.js';

const W = 20, H = 16;
const g = Array.from({ length: H }, () => Array(W).fill('c'));
for (let x = 1; x <= 18; x++) { g[0][x] = '#'; g[1][x] = '|'; g[2][x] = '|'; }
for (let y = 3; y <= 12; y++) for (let x = 0; x < W; x++) {
  const dx = (x - 9.5) / 9.2, dy = Math.max(0, y - 5) / 7.6;
  if (dx * dx + dy * dy <= 1 && x >= 1 && x <= 18) {
    const cx = (x - 9.5) / 4.2, cy = (y - 8) / 2.6;
    g[y][x] = cx * cx + cy * cy <= 1 ? 'g' : 'p';
  }
}
g[12][10] = 'p'; g[12][9] = 'p';                          // the Kestrel's gangway
const ground = rows(g.map((r) => r.join('')));

const decor = [
  { t: 'shelf_wide', x: 2, y: 3 }, { t: 'shelf_a', x: 5, y: 3 }, { t: 'shelf_b', x: 12, y: 3 }, { t: 'shelf_wide', x: 15, y: 3 },
  { t: 'book_stack', x: 7, y: 3 }, { t: 'rug_round', x: 9, y: 9 }, { t: 'windstone', x: 1, y: 7 },
  { t: 'kestrel', x: 7, y: 15 },
];

const events = [
  enter('library_enter', 'cloud_library'),
  object('first_shelf', 9, 3, 'first_shelf', { w: 2, text: 'ep6_first_shelf', ifNot: 'first_page_read', state: 0 }),
  object('first_shelf_open', 9, 3, 'first_shelf', { w: 2, text: 'ep6_first_shelf', if: 'first_page_read', state: 1 }),
  object('reading_desk', 14, 7, 'reading_table', { w: 2, text: 'ep6_reading_desk' }),
  sign('shelves_sign', 5, 3, 'ep6_library_shelves'),
  door('kestrel_down', 10, 12, ['ep6_zephyr', 22, 5, 'down'], { if: 'library_reached' }),
];

export default {
  id: 'ep6_library', name: 'The Cloud Library', area: 'interior',
  music: null, ambience: 'sky_wind', tileset: 'ep6',
  lighting: { tint: 'none', dark: 0 },
  under: 'cloudbank',
  legend: { c: 'cloudbank', p: 'skyplank', g: 'stormglass', '#': 'spire_top', '|': 'spire_face' },
  ground,
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [10, 11], arrival: [10, 11], shelf: [9, 3], vex_shelf: [11, 4], party_stop: [11, 6], party_stop_m: [10, 6],
    party_stop_b: [12, 6], aeris_door: [12, 10], seat_four: [4, 8],
  },
  start: { x: 10, y: 11, dir: 'up' },
};
