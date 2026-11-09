// Fixtures for sun and shade (E5-world): two rooms with every shade event, registered by ../world.js (never in the first
// download, never a plan map id). Drawn with the base tiles (plaza pavement, sand, cliff and stone walls) so they work
// before E5-tiles' sheet; the stand-in objects of ./art.js fill in for the ep5 pieces.
//
// ep5_testshade (36 x 26, open sky, start noon, start (5, 22) facing up):
//   Lesson A, the court. A band of sand (x 10 to 14) splits the court from top to bottom. The obelisk ob_a (h 3) stands on
//     pavement one cell east of it (16, 18): at dawn its shadow lies west 6 cells across the band on row 18 (a bridge that
//     ends on the pavement cell (15, 18), so the party can step off it), at noon 3 cells north, at dusk 6 east. Dial dial_a (5, 19) in the west, dial_b (17, 22) in the
//     east (every dial shares the hour). chest_s stands on the sand at (12, 19), touched from the dawn bridge.
//   The groove (north-east). A second band (x 25 to 27, rows 2 to 12) in front of the nook (x 29 to 34), whose only door
//     is (28, 5). The standing stone ss_c (h 2) rides the groove x 23, rows 4 to 8, from (23, 8): Shove it north three
//     times to (23, 5) and set dusk; its shadow crosses (24, 5) and bridges the band on row 5. chest_c in the nook.
//   The refusal (east). A sand channel on row 17 (x 25 to 34). The low block blk_r (h 1) rides the groove x 30, rows 18 and
//     19: at noon its 1-cell shadow is the firm cell (30, 17). Stand there and Shove it south: refused (the sand would run).
//   The plate (south-east). plate_d (when 'lit', latch, flag _t_e5plate) at (27, 20) is shaded at noon (two cells north of
//     ss_d: the cell right above a tall caster is hidden by its sprite, so plates never go there) and at dawn (ob_f's long
//     shadow); at dusk it is lit, latches, and the sun gate gate_d to the closet opens for good.
//   An hour-gated light glint_dusk (if 'hour:dusk') checks the virtual flags.
//
// ep5_testshade_in (30 x 22, roofed, dark 0.45, start dawn, start (6, 20) facing up):
//   The window hall (west). A sand channel on row 8 (x 1 to 14). win_e in the divider (15, 8) faces west at dawn and win_w
//     in the west wall (0, 8) faces east at dusk (reach 14): the lit row runs, the dark holds. The pillar pl_b (h 2) rides
//     the groove x 11, rows 8 to 11, from (11, 10); a wall cell (11, 7) sits above the groove's end. Shove it north twice
//     into the shaft: at dawn every cell west of it lies in its shade (cross at x 10); at dusk every cell east of it.
//   The lamp room (east, through the door gap (15, 18)). A 7 x 7 sand square (x 19 to 25, rows 7 to 13, walled on both sides)
//     with a pavement
//     cell (22, 12) holding the stone ss_l. The lamp lamp_a (r 3) rides the groove on row 14 (x 22 to 26) from (22, 14):
//     it lights rows 11 to 17 of x 19 to 25, a barrier; the stone throws its line shadow north to (22, 11), the diagonal
//     cells stay lit. Shove the lamp east once: column 19 falls dark and holds, a way north to chest_l.

const OPEN_W = 36, OPEN_H = 26;

function buildOpen() {
  const W = OPEN_W, H = OPEN_H;
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
    if (y === 0 || y === H - 1 || x === 0 || x === W - 1) return '#';
    if (y === 1) return '|';
    return '.';
  }));
  const S = Array.from({ length: H }, () => Array(W).fill('.'));
  const G = Array.from({ length: H }, () => Array(W).fill('.'));
  const sand = (x, y) => { g[y][x] = 's'; S[y][x] = 's'; };
  for (let y = 2; y <= 24; y++) for (let x = 10; x <= 14; x++) sand(x, y);
  for (let y = 2; y <= 12; y++) for (let x = 25; x <= 27; x++) sand(x, y);
  // the nook: wall x 28 (door at row 5), wall rows 13 (top) and 14 (face) under it
  for (let y = 2; y <= 12; y++) g[y][28] = y === 5 ? '.' : '#';
  for (let x = 28; x <= 34; x++) { g[13][x] = '#'; g[14][x] = '|'; }
  for (let y = 4; y <= 8; y++) G[y][23] = 'g';
  for (let x = 25; x <= 34; x++) sand(x, 17);
  for (let y = 18; y <= 19; y++) G[y][30] = 'g';
  // the closet: wall row 22 (x 31 to 34, the gate at 33) and column 31 below it
  for (let x = 31; x <= 34; x++) g[22][x] = x === 33 ? '.' : '#';
  for (let y = 23; y <= 24; y++) g[y][31] = '#';
  return { ground: g.map((r) => r.join('')), sand: S.map((r) => r.join('')), groove: G.map((r) => r.join('')) };
}

const IN_W = 30, IN_H = 22;

function buildIn() {
  const W = IN_W, H = IN_H;
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
    if (y === 0 || y === H - 1 || x === 0 || x === W - 1) return '#';
    if (y === 1) return '|';
    if (x === 15) return y === 18 ? '.' : '#';
    return '.';
  }));
  const S = Array.from({ length: H }, () => Array(W).fill('.'));
  const G = Array.from({ length: H }, () => Array(W).fill('.'));
  const sand = (x, y) => { g[y][x] = 's'; S[y][x] = 's'; };
  for (let x = 1; x <= 14; x++) if (x !== 11) sand(x, 8);
  g[7][11] = '#';
  for (let y = 8; y <= 11; y++) G[y][11] = 'g';
  for (let y = 7; y <= 13; y++) for (let x = 19; x <= 25; x++) if (!(x === 22 && y === 12)) sand(x, y);
  // the square fills a corridor between two wall blocks (x 16 to 18 and 26 to 28): no way round it
  for (let y = 7; y <= 13; y++) for (const x of [16, 17, 18, 26, 27, 28]) g[y][x] = y === 13 ? '|' : '#';
  for (let x = 22; x <= 26; x++) G[14][x] = 'g';
  return { ground: g.map((r) => r.join('')), sand: S.map((r) => r.join('')), groove: G.map((r) => r.join('')) };
}

const O = buildOpen();
const I = buildIn();

export const TEST_SHADE = {
  id: 'ep5_testshade', name: 'Test Sun Court', area: 'dungeon', music: null, ambience: null, tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'plaza',
  start: { x: 5, y: 22, dir: 'up' },
  legend: { '#': 'foundry_top', '|': 'foundry_face', '.': 'plaza', 's': 'sand' },
  ground: O.ground,
  shade: { hour: 'noon', sand: O.sand, groove: O.groove },
  overlays: [],
  decor: [],
  events: [
    { id: 'dial_a', type: 'sundial', x: 5, y: 19, free: true },
    { id: 'dial_b', type: 'sundial', x: 17, y: 22, free: true },
    { id: 'ob_a', type: 'standstone', x: 16, y: 18, h: 3 },
    { id: 'chest_s', type: 'chest', x: 12, y: 19, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'ss_c', type: 'standstone', x: 23, y: 8, h: 2, shove: true },
    { id: 'chest_c', type: 'chest', x: 32, y: 5, tier: 'iron', item: 'potion', qty: 2 },
    { id: 'blk_r', type: 'standstone', x: 30, y: 18, h: 1, shove: true },
    { id: 'ss_d', type: 'standstone', x: 27, y: 22, h: 2 },
    { id: 'ob_f', type: 'standstone', x: 30, y: 20, h: 2 },
    { id: 'plate_d', type: 'sunplate', x: 27, y: 20, when: 'lit', latch: true, flag: '_t_e5plate', target: 'gate_d' },
    { id: 'gate_d', type: 'gate', x: 33, y: 22, sprite: 'sun_gate', state: 'closed' },
    { id: 'chest_d', type: 'chest', x: 34, y: 24, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'glint_dusk', type: 'light', x: 20, y: 18, if: 'hour:dusk', r: 3, color: '#ffd27a' },
  ],
  exits: [],
  marks: { start: [5, 22], dial_a_face: [5, 20], bridge: [12, 18], east: [16, 20], dial_b_face: [17, 23], stone_south: [23, 9],
    nook: [31, 5], channel_n: [30, 16], channel: [30, 17], plate_view: [26, 19], gate_face: [33, 21], closet: [33, 23] },
};

export const TEST_SHADE_IN = {
  id: 'ep5_testshade_in', name: 'Test Shaft Hall', area: 'dungeon', music: null, ambience: null, tileset: 'town',
  lighting: { tint: 'none', dark: 0.45 },
  under: 'plaza',
  start: { x: 6, y: 20, dir: 'up' },
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'plaza', 's': 'sand' },
  ground: I.ground,
  shade: { hour: 'dawn', sand: I.sand, groove: I.groove, roof: true },
  overlays: [],
  decor: [],
  events: [
    { id: 'dial_in', type: 'sundial', x: 6, y: 18, free: true },
    { id: 'win_e', type: 'window', x: 15, y: 8, faces: 'west', hours: ['dawn'], reach: 14 },
    { id: 'win_w', type: 'window', x: 0, y: 8, faces: 'east', hours: ['dusk'], reach: 14 },
    { id: 'pl_b', type: 'standstone', x: 11, y: 10, h: 2, sprite: 'pillar_gallery', shove: true },
    { id: 'chest_w', type: 'chest', x: 4, y: 4, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'lamp_a', type: 'lampcart', x: 22, y: 14, r: 3, shove: true },
    { id: 'ss_l', type: 'standstone', x: 22, y: 12, h: 2 },
    { id: 'chest_l', type: 'chest', x: 22, y: 4, tier: 'iron', item: 'potion', qty: 2 },
  ],
  exits: [],
  marks: { start: [6, 20], dial_face: [6, 19], pillar_south: [11, 11], hall_n: [10, 6], door_gap: [15, 18], lamp_west: [21, 14],
    lamp_n: [22, 11], room_n: [19, 5] },
};

export default TEST_SHADE;
