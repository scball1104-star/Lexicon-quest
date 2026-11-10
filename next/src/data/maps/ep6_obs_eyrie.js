// The Scribe's Eyrie (24 x 20, dungeon, tint storm until scribe_defeated, dark 0.3). EPISODE6_PLAN 4.8; cells in
// docs/MAPS_EP6_B.md. A round deck of white stone at the top of the spire, open to the storm, a stormglass ring round the
// Scribe's desk in the middle (10..13, 7..8), quills hanging over it. The party comes up the stair (11..12,19) from the
// Sky Compass Keyhole and crosses scribe_trig (row 14): the Storm Scribe, coiled over the desk (actor `scribe`). After
// scribe_defeated the Wind Script hangs over the desk, the storm lid opens (tint none), the Kestrel waits at the north-east
// rim with Aeris, and kestrel_up (17,2) flies to the Cloud Library.
import { door, sign, object, trigger, actor, enter, rows } from './_kit.js';
import { glow } from './ep6_obs_f1.js';

const W = 24, H = 20;
const g = Array.from({ length: H }, () => Array(W).fill('c'));
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const dx = (x - 11.5) / 10.6, dy = (y - 9.6) / 8.4;
  const d = dx * dx + dy * dy;
  if (d <= 1) g[y][x] = d >= 0.18 && d <= 0.3 ? 'g' : '.';
}
for (const [x, y] of [[11, 18], [12, 18], [11, 19], [12, 19]]) g[y][x] = '.';   // the stair head
for (const [x, y] of [[16, 1], [17, 1], [17, 2], [18, 2]]) g[y][x] = '.';        // the Kestrel's gangway at the rim
const ground = rows(g.map((r) => r.join('')));

const decor = [
  { t: 'windstone', x: 3, y: 9 }, { t: 'windstone', x: 20, y: 11 },
];
const overhead = [
  { t: 'quills', x: 10, y: 6, ifNot: 'scribe_defeated' }, { t: 'quills', x: 13, y: 6, ifNot: 'scribe_defeated' },
  { t: 'wind_script', x: 10, y: 5, if: 'scribe_defeated' },
];

const events = [
  enter('eyrie_enter', 'scribe_after'),
  door('stair_f3', 11, 19, ['ep6_obs_f3', 22, 3, 'down'], { w: 2, kind: 'stairs' }),
  object('desk', 10, 8, 'scribe_desk', { w: 4, text: 'ep6_scribe_desk', ifNot: 'scribe_defeated', state: 0 }),
  object('desk_still', 10, 8, 'scribe_desk', { w: 4, text: 'ep6_scribe_desk', if: 'scribe_defeated', state: 1 }),
  actor('scribe', 11, 7, 'scribe_avatar', 'down', { ifNot: 'scribe_defeated' }),
  trigger('scribe_trig', 1, 14, 22, 1, 'scribe'),
  sign('feather_desk', 14, 8, 'ep6_feather_desk', { if: 'scribe_defeated' }),
  sign('quills_sign', 9, 8, 'ep6_quills'),
  object('kestrel_rim', 15, 2, 'kestrel', { if: 'scribe_defeated', solid: false, text: 'ep6_kestrel' }),
  actor('aeris_t', 16, 3, 'npc_aeris', 'down', { if: 'scribe_defeated', ifNot: 'library_reached' }),
  door('kestrel_up', 17, 1, ['ep6_library', 10, 11, 'up'], { if: 'scribe_defeated' }),
  glow('l_desk', 11, 9, 4), glow('l_stair', 11, 17, 3),
];

export default {
  id: 'ep6_obs_eyrie', name: "The Scribe's Eyrie", area: 'dungeon',
  music: null, ambience: 'storm_rumble', tileset: 'ep6',
  lighting: { tint: [{ if: 'scribe_defeated', id: 'none' }, { id: 'storm' }], dark: 0.3 },
  under: 'storm_cloud',
  legend: { c: 'storm_cloud', '.': 'spire_stone', g: 'stormglass' },
  ground,
  overlays: [],
  decor,
  overhead,
  events,
  exits: [],
  marks: {
    start: [11, 18], desk: [11, 7], party_stop: [11, 11], party_stop_m: [10, 11], party_stop_b: [12, 11],
    aeris_enter: [11, 17], chart_spot: [11, 10], chart_spot_m: [10, 10], chart_spot_b: [12, 10], feather_spot: [14, 8],
    kestrel_rim: [17, 2], kestrel_door: [17, 2],
  },
  start: { x: 11, y: 18, dir: 'up' },
};
